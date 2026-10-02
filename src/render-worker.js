import {SpectralEngine} from './spectral-engine.js?v=20261003-chain4';
import {neutralStretchCurve} from './spectral-stretch.js?v=20260929-transport1';
import {neutralShiftCurve} from './spectral-shift.js?v=20260929-transport1';
import { encodeWav } from './wav.js?v=20260929-transport1';
self.onmessage = ({data}) => {
  try {
    const engine = new SpectralEngine(data.channels, 4096, 48000, data.curve || neutralShiftCurve(), data.stretchCurve || neutralStretchCurve(), 0, data.blurCurve,data.harmonicityCurve,data.freezeCurve,data.order);
    const output = data.channels.map(c => new Float32Array(c.length));
    let last = 0;
    for (let p = 0; p < engine.length; p += engine.hop) {
      const block = engine.nextHop(), count = Math.min(engine.hop, engine.length - p);
      output.forEach((c, i) => c.set(block[i].subarray(0, count), p));
      if (p / engine.length - last > .02) { last = p / engine.length; self.postMessage({progress: last}); }
    }
    self.postMessage({blob: encodeWav(output, 48000), duration: engine.length / 48000, truncated: false});
  } catch (error) { self.postMessage({error: error.message}); }
};
