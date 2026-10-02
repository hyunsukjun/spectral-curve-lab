import {valueAt} from './curve-editor.js?v=20260929-transport1';
import {SpectralStretch} from './spectral-stretch.js?v=20261002-harmonic-freeze1';

export const neutralHarmonicityCurve = () => [{x:0,y:.5},{x:1,y:.5}];
export const harmonicityFromNorm = y => 2*Math.max(0,Math.min(1,y))-1;

// Monophonic peak-family mapping. Neutral is an exact bypass; polyphonic
// material is deliberately left for listening-led refinement.
export class SpectralHarmonicity extends SpectralStretch {
  setCurve(curve){
    if(!Array.isArray(curve)||curve.length<2||curve.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))throw new Error('Invalid harmonicity curve');
    this.curve=curve.map(p=>({x:Math.max(0,Math.min(1,p.x)),y:Math.max(0,Math.min(1,p.y))})).sort((a,b)=>a.x-b.x);
  }
  amountAt(sample){return harmonicityFromNorm(valueAt(this.curve,Math.max(0,Math.min(1,sample/Math.max(1,this.length-1)))));}
  wetForAmount(amount){return Math.min(1,Math.abs(amount)/.02);}
  reset(position){super.reset(position);this.fundamentals?.fill(0);}
  prepareMapping(peaks,count,magnitude,channel){
    if(!this.fundamentals)this.fundamentals=new Float64Array(this.states.length);
    let maximum=0;for(let i=0;i<count;i++)maximum=Math.max(maximum,magnitude[peaks[i]]);
    let candidate=0;
    for(let i=0;i<count;i++){
      const hz=peaks[i]*this.binHz;
      if(hz>=70&&hz<=1200&&magnitude[peaks[i]]>=maximum*.16){candidate=hz;break;}
    }
    if(candidate){const prior=this.fundamentals[channel];this.fundamentals[channel]=prior?prior+(candidate-prior)*.2:candidate;}
  }
  mapFrequency(frequency,amount,channel){
    const fundamental=this.fundamentals?.[channel]||0;
    if(!fundamental||frequency<fundamental*.75)return frequency;
    const ratio=frequency/fundamental;
    if(amount<0){
      const nearest=Math.max(1,Math.round(ratio));
      return frequency+(-amount)*(nearest*fundamental-frequency);
    }
    return fundamental*ratio**(1+.12*amount);
  }
}
