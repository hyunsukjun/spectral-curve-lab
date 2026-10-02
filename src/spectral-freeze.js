import {valueAt} from './curve-editor.js?v=20260929-transport1';

export const neutralFreezeCurve = () => [{x:0,y:0},{x:1,y:0}];
const TAU=2*Math.PI;
const wrap=phase=>phase-TAU*Math.round(phase/TAU);

// Capture a complex spectral state once per hold gesture, then advance phase
// continuously while its magnitude stays fixed. The curve is a wet mix.
export class SpectralFreeze {
  constructor(channels,size,rate,length,curve=neutralFreezeCurve()){
    this.size=size;this.half=size/2;this.hop=size/4;this.rate=rate;this.length=length;
    this.smoothing=1-Math.exp(-this.hop/(rate*.02));
    this.states=Array.from({length:channels},()=>({
      magnitude:new Float64Array(this.half+1),phase:new Float64Array(this.half+1),step:new Float64Array(this.half+1),previous:new Float64Array(this.half+1),
      previousValid:false,captured:false,amount:0
    }));
    this.setCurve(curve);this.reset(0);
  }
  setCurve(curve){
    if(!Array.isArray(curve)||curve.length<2||curve.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))throw new Error('Invalid freeze curve');
    this.curve=curve.map(p=>({x:Math.max(0,Math.min(1,p.x)),y:Math.max(0,Math.min(1,p.y))})).sort((a,b)=>a.x-b.x);
  }
  amountAt(sample){return valueAt(this.curve,Math.max(0,Math.min(1,sample/Math.max(1,this.length-1))));}
  reset(position){for(const s of this.states){s.magnitude.fill(0);s.phase.fill(0);s.step.fill(0);s.previous.fill(0);s.previousValid=false;s.captured=false;s.amount=this.amountAt(position);}}
  process(re,im,frameStart,channel){
    const s=this.states[channel],half=this.half,n=this.size;
    const target=this.amountAt(frameStart+half);
    s.amount+=(target-s.amount)*this.smoothing;
    if(target<=.02&&s.amount<1e-5){s.captured=false;}
    if(target<=.02&&!s.captured&&s.amount<1e-5){
      for(let k=0;k<=half;k++)s.previous[k]=Math.atan2(im[k],re[k]);
      s.previousValid=true;return;
    }
    let maximum=0;
    for(let k=0;k<=half;k++)maximum=Math.max(maximum,Math.hypot(re[k],im[k]));
    const capture=target>.02&&!s.captured&&maximum>1e-8;
    for(let k=0;k<=half;k++){
      const inputPhase=Math.atan2(im[k],re[k]);
      if(capture){
        s.magnitude[k]=Math.hypot(re[k],im[k]);s.phase[k]=inputPhase;
        const expected=TAU*k*this.hop/n;
        s.step[k]=s.previousValid?expected+wrap(inputPhase-s.previous[k]-expected):expected;
      }else if(s.captured){s.phase[k]=wrap(s.phase[k]+s.step[k]);}
      s.previous[k]=inputPhase;
      if(s.captured||capture){
        const mix=s.amount,heldR=s.magnitude[k]*Math.cos(s.phase[k]),heldI=s.magnitude[k]*Math.sin(s.phase[k]);
        re[k]+=(heldR-re[k])*mix;im[k]+=(heldI-im[k])*mix;
      }
    }
    s.previousValid=true;if(capture)s.captured=true;
    if(!s.captured)return;
    im[0]=0;im[half]=0;
    for(let k=1;k<half;k++){re[n-k]=re[k];im[n-k]=-im[k];}
  }
}
