import {NeutralSTFT} from './spectral-core.js?v=20260929-transport1';

export const SHIFT_RANGE_HZ = 2000;
export const shiftFromNorm = y => (Math.max(0, Math.min(1, y)) - .5) * 2 * SHIFT_RANGE_HZ;
export const neutralShiftCurve = () => [{x:0,y:.5},{x:1,y:.5}];

// STFT analytic-signal frequency translation (single sideband), not pitch scaling.
// Positive spectral components all receive the same additive Hz offset.
// Fractional offsets use one phase-continuous oscillator after complex WOLA,
// avoiding independent per-frame phase resets and integer-bin rounding.
export class SpectralShift extends NeutralSTFT {
  constructor(channels, size = 2048, rate = 48000, curve = neutralShiftCurve(), start = 0) {
    super(channels, size, start);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('Invalid sample rate');
    this.rate = rate;
    this.imagSums = channels.map(() => new Float64Array(size));
    this.cosPhase = new Float64Array(this.hop); this.sinPhase = new Float64Array(this.hop);
    this.wetBlock = new Float64Array(this.hop);
    this.smoothing = 1 - Math.exp(-1 / (rate * .01)); // 10ms, sample-based in both engines.
    this.setCurve(curve); this.seek(start);
  }
  setCurve(curve) {
    if (!Array.isArray(curve) || curve.length < 2 || curve.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) throw new Error('Invalid shift curve');
    this.curve = curve.map(p => ({x:Math.max(0,Math.min(1,p.x)),y:Math.max(0,Math.min(1,p.y))})).sort((a,b)=>a.x-b.x);
  }
  shiftAt(sample) {
    const x = Math.max(0, Math.min(1, sample / Math.max(1,this.length-1))), c = this.curve;
    if (x <= c[0].x) return shiftFromNorm(c[0].y);
    if (x >= c.at(-1).x) return shiftFromNorm(c.at(-1).y);
    let lo=1,hi=c.length-1;
    while(lo<hi){const mid=(lo+hi)>>1;if(c[mid].x<x)lo=mid+1;else hi=mid;}
    const a=c[lo-1],b=c[lo],t=(x-a.x)/Math.max(1e-6,b.x-a.x);
    return shiftFromNorm(a.y+(b.y-a.y)*t*t*(3-2*t));
  }
  seek(start) {
    super.seek(start);
    if (!this.imagSums) return;
    this.imagSums.forEach(c=>c.fill(0));
    this.phase = 0; this.smoothedHz = this.shiftAt(this.position);
    this.wet = Math.abs(this.smoothedHz)>1e-9 ? 1 : 0;
  }
  transformSpectrum(re, im, frameStart) {
    const half=this.size/2, binHz=this.rate/this.size, edgeHz=100;
    // Smoothly discard components approaching DC/Nyquist after translation,
    // rather than wrapping them around the FFT or reflecting them audibly.
    const shift=this.shiftAt(frameStart+this.size/2);
    for(let k=0;k<=half;k++) {
      const target=k*binHz+shift;
      let edge=1;
      if(shift<0) edge=Math.max(0,Math.min(1,target/edgeHz));
      if(shift>0) edge=Math.max(0,Math.min(1,(this.rate/2-target)/edgeHz));
      // Near neutral blend the edge mask continuously to avoid a zero-crossing switch.
      edge=1+(edge-1)*Math.min(1,Math.abs(shift)/50);
      const scale=(k===0||k===half?1:2)*edge;
      re[k]*=scale;im[k]*=scale;
    }
    for(let k=half+1;k<this.size;k++){re[k]=0;im[k]=0;}
  }
  accumulateSpectrum(channel,offset) {
    super.accumulateSpectrum(channel,offset);
    for(let i=Math.max(0,-offset);i<this.size;i++)this.imagSums[channel][offset+i]+=this.im[i]*this.window[i];
  }
  synthesize(channel,i,weight) {
    const real=this.sums[channel][i]/weight, imag=this.imagSums[channel][i]/weight;
    const shifted=real*this.cosPhase[i]-imag*this.sinPhase[i];
    return real+(shifted-real)*this.wetBlock[i];
  }
  finishChannel(channel) {
    this.imagSums[channel].copyWithin(0,this.hop);this.imagSums[channel].fill(0,this.size-this.hop);
  }
  nextHop() {
    for(let i=0;i<this.hop;i++) {
      const requested=this.shiftAt(this.position+i);
      this.smoothedHz+=(requested-this.smoothedHz)*this.smoothing;
      this.wet+=((Math.abs(requested)>1e-9?1:0)-this.wet)*this.smoothing;
      this.cosPhase[i]=Math.cos(this.phase*2*Math.PI);this.sinPhase[i]=Math.sin(this.phase*2*Math.PI);this.wetBlock[i]=this.wet;
      this.phase+=this.smoothedHz/this.rate;this.phase-=Math.floor(this.phase);
    }
    return super.nextHop();
  }
}
