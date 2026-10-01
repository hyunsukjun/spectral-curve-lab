import {valueAt} from './curve-editor.js?v=20260929-transport1';

export const STRETCH_ANCHOR_HZ = 1000;
export const stretchFromNorm = y => 2 ** (2 * Math.max(0,Math.min(1,y)) - 1);
export const stretchToNorm = amount => (Math.log2(amount) + 1) / 2;
export const neutralStretchCurve = () => [{x:0,y:.5},{x:1,y:.5}];
export const stretchFrequency = (hz, amount) => hz > 0 ? STRETCH_ANCHOR_HZ * (hz / STRETCH_ANCHOR_HZ) ** amount : 0;
const TAU = Math.PI * 2;
const wrap = phase => phase - TAU * Math.round(phase / TAU);

// Peak-region translation with shared phase rotation inside each region.
// Spectra are centered before fractional interpolation to retain lobe coherence.
// Phase correction is accumulated over frames; file duration never changes.
export class SpectralStretch {
  constructor(channelCount,size,rate,length,curve=neutralStretchCurve()) {
    this.size=size;this.hop=size/4;this.rate=rate;this.length=length;this.half=size/2;
    this.binHz=rate/size;this.alpha=1-Math.exp(-this.hop/(rate*.02));
    this.states=Array.from({length:channelCount},()=>({
      previousPhase:new Float64Array(this.half+1),phaseOffset:new Float64Array(this.half+1),
      nextOffset:new Float64Array(this.half+1),previousDelta:new Float64Array(this.half+1),nextDelta:new Float64Array(this.half+1),
      hasPrevious:false,amount:1,frame:null
    }));
    this.magnitude=new Float64Array(this.half+1);this.phase=new Float64Array(this.half+1);
    this.peaks=new Int32Array(this.half+1);this.outR=new Float64Array(size);this.outI=new Float64Array(size);
    this.setCurve(curve);this.reset(0);
  }
  setCurve(curve) {
    if(!Array.isArray(curve)||curve.length<2||curve.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))throw new Error('Invalid stretch curve');
    this.curve=curve.map(p=>({x:Math.max(0,Math.min(1,p.x)),y:Math.max(0,Math.min(1,p.y))})).sort((a,b)=>a.x-b.x);
  }
  amountAt(sample) {return stretchFromNorm(valueAt(this.curve,Math.max(0,Math.min(1,sample/Math.max(1,this.length-1)))));}
  reset(position) {
    for(const state of this.states){state.previousPhase.fill(0);state.phaseOffset.fill(0);state.previousDelta.fill(0);state.hasPrevious=false;state.frame=null;state.amount=this.amountAt(position);}
  }
  process(re,im,frameStart,channel) {
    const s=this.states[channel],n=this.size,half=this.half;
    s.amount+=(this.amountAt(frameStart+n/2)-s.amount)*this.alpha;
    const wet=Math.min(1,Math.abs(s.amount-1)/.02);
    if(wet<1e-7){s.hasPrevious=false;s.phaseOffset.fill(0);s.previousDelta.fill(0);return;}
    let maxMagnitude=0;
    for(let k=0;k<=half;k++){
      this.magnitude[k]=Math.hypot(re[k],im[k]);maxMagnitude=Math.max(maxMagnitude,this.magnitude[k]);
      this.phase[k]=Math.atan2(im[k],re[k]);
    }
    if(maxMagnitude<1e-14){s.hasPrevious=false;return;}
    let count=0;
    for(let k=1;k<half;k++)if(this.magnitude[k]>maxMagnitude*1e-4&&this.magnitude[k]>=this.magnitude[k-1]&&this.magnitude[k]>this.magnitude[k+1])this.peaks[count++]=k;
    if(!count){let strongest=0;for(let k=1;k<=half;k++)if(this.magnitude[k]>this.magnitude[strongest])strongest=k;this.peaks[count++]=strongest;}
    this.outR.fill(0);this.outI.fill(0);
    for(let p=0;p<count;p++){
      const peak=this.peaks[p],begin=p===0?0:Math.floor((this.peaks[p-1]+peak)/2)+1,end=p===count-1?half:Math.floor((peak+this.peaks[p+1])/2);
      let frequency=peak*this.binHz;
      if(s.hasPrevious){
        const delta=wrap(this.phase[peak]-s.previousPhase[peak]-TAU*peak*this.hop/n);
        frequency=Math.max(0,Math.min(this.rate/2,frequency+delta*this.rate/(TAU*this.hop)));
      }else if(peak>0&&peak<half){
        const a=Math.log(Math.max(1e-30,this.magnitude[peak-1])),b=Math.log(Math.max(1e-30,this.magnitude[peak])),c=Math.log(Math.max(1e-30,this.magnitude[peak+1]));
        const denominator=a-2*b+c;
        const fraction=Math.abs(denominator)>1e-12?Math.max(-.5,Math.min(.5,.5*(a-c)/denominator)):0;
        frequency=(peak+fraction)*this.binHz;
      }
      const mapped=stretchFrequency(frequency,s.amount),deltaHz=mapped-frequency,shiftBins=deltaHz/this.binHz;
      const rotation=s.hasPrevious?wrap(s.phaseOffset[peak]+TAU*(s.previousDelta[peak]+deltaHz)*.5*this.hop/this.rate):0;
      const cr=Math.cos(rotation),ci=Math.sin(rotation);
      for(let k=begin;k<=end;k++){
        s.nextOffset[k]=rotation;s.nextDelta[k]=deltaHz;
        const target=k+shiftBins;
        if(target<0||target>half)continue;
        const j=Math.floor(target),f=target-j,sign=k%2?-1:1;
        const xr=(re[k]*cr-im[k]*ci)*sign,xi=(re[k]*ci+im[k]*cr)*sign;
        // Four-tap cubic Lagrange interpolation in centered frequency coordinates.
        const w0=-f*(f-1)*(f-2)/6,w1=(f+1)*(f-1)*(f-2)/2,w2=-(f+1)*f*(f-2)/2,w3=(f+1)*f*(f-1)/6;
        for(let t=0;t<4;t++){
          const dest=j+t-1;if(dest<0||dest>half)continue;
          const w=t===0?w0:t===1?w1:t===2?w2:w3;
          this.outR[dest]+=xr*w;this.outI[dest]+=xi*w;
        }
      }
    }
    for(let k=0;k<=half;k++){
      s.previousPhase[k]=this.phase[k];s.phaseOffset[k]=s.nextOffset[k];s.previousDelta[k]=s.nextDelta[k];
      const sign=k%2?-1:1;
      re[k]+=(this.outR[k]*sign-re[k])*wet;im[k]+=(this.outI[k]*sign-im[k])*wet;
    }
    im[0]=0;im[half]=0;
    for(let k=1;k<half;k++){re[n-k]=re[k];im[n-k]=-im[k];}
    s.hasPrevious=true;s.frame=frameStart;
  }
}
