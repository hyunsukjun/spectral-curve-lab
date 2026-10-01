import {valueAt} from './curve-editor.js?v=20260929-transport1';
export const neutralBlurCurve = () => [{x:0,y:0},{x:1,y:0}];
const TAU=2*Math.PI;
const wrap=p=>p-TAU*Math.round(p/TAU);
// Time smoothing per frequency bin; no bin relocation or frequency-axis filtering.
export class SpectralBlur {
  constructor(channels,size,rate,length,curve=neutralBlurCurve()) {
    this.size=size;this.half=size/2;this.hop=size/4;this.rate=rate;this.length=length;
    this.smoothing=1-Math.exp(-this.hop/(rate*.02));
    this.states=Array.from({length:channels},()=>({magnitude:new Float64Array(this.half+1),phase:new Float64Array(this.half+1),previous:new Float64Array(this.half+1),inputMagnitude:new Float64Array(this.half+1),advance:new Float64Array(this.half+1),amount:0}));
    this.setCurve(curve);this.reset(0);
  }
  setCurve(curve) {
    if(!Array.isArray(curve)||curve.length<2||curve.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))throw new Error('Invalid blur curve');
    this.curve=curve.map(p=>({x:Math.max(0,Math.min(1,p.x)),y:Math.max(0,Math.min(1,p.y))})).sort((a,b)=>a.x-b.x);
  }
  amountAt(sample){return valueAt(this.curve,Math.max(0,Math.min(1,sample/Math.max(1,this.length-1))));}
  reset(position){for(const s of this.states){s.magnitude.fill(0);s.phase.fill(0);s.previous.fill(0);s.inputMagnitude.fill(0);for(let k=0;k<=this.half;k++)s.advance[k]=TAU*k*this.hop/this.size;s.amount=this.amountAt(position);s.active=false;}}
  process(re,im,frameStart,channel){
    const s=this.states[channel],half=this.half;
    s.amount+=(this.amountAt(frameStart+half)-s.amount)*this.smoothing;
    const neutral=s.amount<1e-7;
    if(neutral){
      if(s.active){s.magnitude.fill(0);s.inputMagnitude.fill(0);s.phase.fill(0);s.previous.fill(0);for(let k=0;k<=half;k++)s.advance[k]=TAU*k*this.hop/this.size;}
      s.active=false;return;
    }
    s.active=true;
    // 100% corresponds to a 500ms exponential time constant, not a fixed delay.
    const retain=neutral?0:Math.exp(-this.hop/(this.rate*.5*s.amount*s.amount));
    let maximum=0;for(let k=0;k<=half;k++)maximum=Math.max(maximum,Math.hypot(re[k],im[k]));
    const threshold=Math.max(1e-12,maximum*1e-4);
    for(let k=0;k<=half;k++){
      const magnitude=Math.hypot(re[k],im[k]),phase=Math.atan2(im[k],re[k]);
      const expected=TAU*k*this.hop/this.size;
      if(magnitude>1e-30 && magnitude>=s.magnitude[k]*.25){
        if(s.inputMagnitude[k]>threshold && magnitude>s.inputMagnitude[k]*.99 && s.inputMagnitude[k]>magnitude*.99)s.advance[k]=expected+wrap(phase-s.previous[k]-expected);
        s.phase[k]=phase;
      }else s.phase[k]=wrap(s.phase[k]+s.advance[k]);
      s.previous[k]=phase;s.inputMagnitude[k]=magnitude;
      s.magnitude[k]=retain*s.magnitude[k]+(1-retain)*magnitude;
      if(!neutral){re[k]=s.magnitude[k]*Math.cos(s.phase[k]);im[k]=s.magnitude[k]*Math.sin(s.phase[k]);}
    }
    im[0]=0;im[half]=0;
    for(let k=1;k<half;k++){re[this.size-k]=re[k];im[this.size-k]=-im[k];}
  }
}
