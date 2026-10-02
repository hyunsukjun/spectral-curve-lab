import {neutralBlurCurve} from './spectral-blur.js?v=20260929-transport1';
import {SpectralEngine} from './spectral-engine.js?v=20261003-chain4';
import {neutralStretchCurve} from './spectral-stretch.js?v=20260929-transport1';
import {neutralShiftCurve} from './spectral-shift.js?v=20260929-transport1';
import {neutralHarmonicityCurve} from './spectral-harmonicity.js?v=20261002-harmonic-freeze1';
import {neutralFreezeCurve} from './spectral-freeze.js?v=20261002-harmonic-freeze1';
export class SpectralNeutralProcessor extends AudioWorkletProcessor {
  constructor() {
    super(); this.blurCurve=neutralBlurCurve(); this.curve = neutralShiftCurve(); this.stretchCurve = neutralStretchCurve(); this.harmonicityCurve=neutralHarmonicityCurve();this.freezeCurve=neutralFreezeCurve();this.order=[]; this.playing = false; this.position = 0; this.token = 0; this.ticks = 0;
    this.port.onmessage = ({data: d}) => {
      if (d.token != null) this.token = d.token;
      if (d.type === 'buffer') {
        this.playing = false;
        this.engine = new SpectralEngine([d.left, d.right], 2048, sampleRate, this.curve, this.stretchCurve, 0, this.blurCurve,this.harmonicityCurve,this.freezeCurve,this.order);
        this.position = 0; this.cursor = this.engine.hop;
      } else if (d.type === 'curves') {
        if(!this.playing){this.applyCurves({...this.pendingCurves,...d});this.pendingCurves=null;this.seek(this.position);}
        else this.pendingCurves={...this.pendingCurves,...d};
      }
      else if (d.type === 'play' && this.engine) this.playing = true;
      else if (d.type === 'pause') { this.playing = false; this.report(); }
      else if (d.type === 'stop') {
        this.playing = false; this.seek(0);
        this.port.postMessage({type: 'stopped', token: this.token});
      } else if (d.type === 'seek') this.seek(Math.floor((d.progress || 0) * (this.engine?.length || 0)));

    };
  }
  applyCurves(data) {
    if(data.blurCurve){this.blurCurve=data.blurCurve;this.engine?.setBlurCurve(data.blurCurve);}
    if(data.curve){this.curve=data.curve;this.engine?.setCurve(data.curve);}
    if(data.stretchCurve){this.stretchCurve=data.stretchCurve;this.engine?.setStretchCurve(data.stretchCurve);}
    if(data.harmonicityCurve){this.harmonicityCurve=data.harmonicityCurve;this.engine?.setHarmonicityCurve(data.harmonicityCurve);}
    if(data.freezeCurve){this.freezeCurve=data.freezeCurve;this.engine?.setFreezeCurve(data.freezeCurve);}
    if(data.order){this.order=[...data.order];this.engine?.setOrder(this.order);}
  }
  seek(position) {
    if(this.pendingCurves){this.applyCurves(this.pendingCurves);this.pendingCurves=null;}
    this.position = position; this.engine?.seek(position);
    if (this.engine) this.cursor = this.engine.hop;
  }
  report() {
    this.port.postMessage({type: 'position', seconds: this.position / sampleRate, shiftHz: this.engine?.smoothedHz || 0, token: this.token});
  }
  process(inputs, outputs) {
    const out = outputs[0];
    if (!this.playing || !this.engine) return true;
    // Prepare the next STFT frame while reading the current hop. Splitting stereo
    // across quanta bounds peak work. Curve changes commit at a frame boundary.
    if(this.pendingCurves && this.engine.atFrameBoundary()){this.applyCurves(this.pendingCurves);this.pendingCurves=null;}
    if(this.engine.needsPreparation())this.engine.accumulateNextChannel();
    this.priming=this.cursor>=this.engine.hop && this.engine.needsPreparation();
    if(this.priming)return true;
    for (let i = 0; i < out[0].length && this.position < this.engine.length; i++) {
      if (this.cursor >= this.engine.hop) { this.block = this.engine.nextHop(); this.cursor = 0; }
      for (let c = 0; c < out.length; c++) out[c][i] = this.block[c][this.cursor];
      this.cursor++; this.position++;
    }
    // End is terminal for this playback token: never post a later position.
    if (this.position >= this.engine.length) {
      this.playing = false;
      this.port.postMessage({type: 'ended', token: this.token});
      return true;
    }
    if (++this.ticks % 16 === 0) this.report();
    return true;
  }
}
registerProcessor('spectral-neutral-processor', SpectralNeutralProcessor);
