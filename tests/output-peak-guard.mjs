import assert from 'node:assert/strict';
import {OutputPeakGuard,protectWavPeak} from '../src/output-peak-guard.js';
for(const rate of [44100,48000,96000]){
 const guard=new OutputPeakGuard(rate);
 for(let i=0;i<5000;i++)assert.equal(guard.gainForPeak(.8),1,'below-ceiling history is unchanged');
 const attenuation=guard.gainForPeak(4);assert.equal(attenuation,.245);
 assert.equal(4*attenuation,.98);assert.equal(-2*attenuation,-.49,'one linked gain preserves channel ratio');
 for(let i=0;i<rate;i++)guard.gainForPeak(0);
 assert(guard.gain>.99999);assert(guard.gain<=1);guard.reset();assert.equal(guard.gain,1);
 assert.throws(()=>guard.gainForPeak(NaN),/Non-finite/);
}
for(const count of [1,2,4,8]){
 const a=Array.from({length:count},()=>Float32Array.of(0,.2,-.7)),copy=a.map(c=>c.slice());assert.equal(protectWavPeak(a).normalizationGain,1);assert.deepEqual(a,copy);
 const hot=Array.from({length:count},(_,i)=>Float32Array.of(4/(i+1),-2/(i+1)));const metrics=protectWavPeak(hot);assert.equal(metrics.normalizationGain,.245);assert(Math.abs(hot[0][0]-.98)<1e-7);assert.equal(hot[0].length,2);
}
assert.throws(()=>protectWavPeak([Float32Array.of(Infinity)]),/Non-finite/);
console.log('PASS linked no-delay guard, below-ceiling identity, recovery/reset, finite failure and multichannel down-only WAV policy');
