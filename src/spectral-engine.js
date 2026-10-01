import {SpectralBlur,neutralBlurCurve} from './spectral-blur.js?v=20260929-transport1';
import {SpectralShift,neutralShiftCurve} from './spectral-shift.js?v=20260929-transport1';
import {SpectralStretch,neutralStretchCurve} from './spectral-stretch.js?v=20260929-transport1';

// One analysis/synthesis pass. Fixed order: Stretch, temporal Blur, then additive Shift.
export class SpectralEngine extends SpectralShift {
  constructor(channels,size=2048,rate=48000,shiftCurve=neutralShiftCurve(),stretchCurve=neutralStretchCurve(),start=0,blurCurve=neutralBlurCurve()){
    super(channels,size,rate,shiftCurve,start);
    this.stretchProcessor=new SpectralStretch(channels.length,size,rate,this.length,stretchCurve);
    this.stretchProcessor.reset(start);
    this.blurProcessor=new SpectralBlur(channels.length,size,rate,this.length,blurCurve);this.blurProcessor.reset(start);
  }
  setBlurCurve(curve){this.blurProcessor.setCurve(curve);}
  setStretchCurve(curve){this.stretchProcessor.setCurve(curve);}
  seek(position){super.seek(position);this.stretchProcessor?.reset(this.position);this.blurProcessor?.reset(this.position);}
  transformSpectrum(re,im,frameStart,channel){
    this.stretchProcessor.process(re,im,frameStart,channel);
    this.blurProcessor.process(re,im,frameStart,channel);
    super.transformSpectrum(re,im,frameStart,channel);
  }
}
