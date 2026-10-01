import assert from 'node:assert/strict';
import {fillHarmonicDemo, fillNoiseIntervals} from '../src/demo-sources.js';

const rate = 48000;
const length = 8 * rate;
const left = new Float32Array(length);
const right = new Float32Array(length);
fillHarmonicDemo(left, right, rate);
assert.deepEqual(left, right, 'demo remains dual mono like the previous default');
assert.ok(left.every(Number.isFinite));
assert.ok(Math.max(...left.subarray(0, rate)) < 0.6, 'demo has output headroom');

function toneMagnitude(hz, startSeconds, seconds) {
  let real = 0;
  let imaginary = 0;
  const start = Math.floor(startSeconds * rate);
  const count = Math.floor(seconds * rate);
  for (let i = 0; i < count; i += 1) {
    const phase = 2 * Math.PI * hz * i / rate;
    real += left[start + i] * Math.cos(phase);
    imaginary += left[start + i] * Math.sin(phase);
  }
  return 2 * Math.hypot(real, imaginary) / count;
}

assert.ok(toneMagnitude(196, 0.4, 0.5) > 0.08, 'first note has a clear fundamental');
assert.ok(toneMagnitude(392, 0.4, 0.5) > 0.03, 'first note has audible harmonics to transform');
assert.ok(toneMagnitude(196, 0.4, 0.5) > toneMagnitude(210, 0.4, 0.5) * 20);
assert.ok(Math.abs(left[Math.floor(1.98 * rate)]) < 0.000001, 'notes have a quiet gap');

const second = new Float32Array(length);
fillHarmonicDemo(second, new Float32Array(length), rate);
assert.deepEqual(left, second, 'demo is reproducible for A/B');

const noise = new Float32Array(length);
fillNoiseIntervals(noise, new Float32Array(length), rate);
assert.ok(noise.some(sample => Math.abs(sample) > 0.01), 'noise reference is still available');
assert.equal(noise[Math.floor(0.055 * rate)], 0, 'noise reference keeps its short gaps');
console.log('Demo sources: harmonic pitch, headroom, gaps, deterministic output, and noise reference passed');
