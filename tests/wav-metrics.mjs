import assert from 'node:assert/strict';
import {encodeWav} from '../src/wav.js';
import {renderFeedback} from '../src/render-feedback.js';
const channels=[Float32Array.from([0,.5,-.5,1,-1,1.1,-1.1]),Float32Array.from([0,0,0,0,0,0,0])],metrics={};
const bytes=new Uint8Array(await encodeWav(channels,48000,metrics).arrayBuffer());
assert.deepEqual(bytes,new Uint8Array(await encodeWav(channels).arrayBuffer()));
assert.equal(metrics.clippedSamples,3);assert.equal(metrics.totalSamples,14);assert.equal(metrics.peak,channels[0][5]);
const view=new DataView(bytes.buffer);for(let frame=0;frame<7;frame++)for(let c=0;c<2;c++){
 const p=44+(frame*2+c)*3;let actual=view.getUint8(p)|(view.getUint8(p+1)<<8)|(view.getUint8(p+2)<<16);if(actual&0x800000)actual-=0x1000000;
 assert.equal(actual,Math.max(-8388608,Math.min(8388607,Math.round(channels[c][frame]*8388608))));
}
assert(renderFeedback(metrics).clipped);assert.match(renderFeedback(metrics).message,/3 channel samples/);
const safe={};encodeWav([Float32Array.from([-.99,.99])],48000,safe);assert.equal(safe.clippedSamples,0);assert(!renderFeedback(safe).clipped);
const zero={};encodeWav([new Float32Array(2)],48000,zero);assert.match(renderFeedback(zero).message,/silence/);
assert.match(renderFeedback(null).message,/unavailable/);
assert.throws(()=>encodeWav([Float32Array.from([NaN])],48000,{}),/Non-finite/);
console.log('PASS metrics: exact PCM saturation boundary, multichannel counts, silence, finite check, unchanged encoded bytes and warning text');
