import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {NeutralSTFT} from '../src/spectral-core.js?v=20260929-transport1';
import {encodeWav} from '../src/wav.js?v=20260929-transport1';
import {valueAt} from '../src/curve-editor.js?v=20260929-transport1';
const rate = 48000;
let seed = 1;
const noise = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2147483648 - 1; };
const sources = {
 sine: i => .4 * Math.sin(2 * Math.PI * 997 * i / rate),
 harmonic: i => [1,2,3,4,5].reduce((s,k) => s + .1/k*Math.sin(2*Math.PI*220*k*i/rate),0),
 whiteNoise: () => noise() * .4,
 transient: i => i % 8192 === 0 ? .8 : 0,
 silence: () => 0,
 dc: () => .2,
};
const results = [];
for (const size of [2048,4096]) for (const length of [1,17,511,2048,48001,480000]) for (const [name, fn] of Object.entries(sources)) {
 const channels = [Float32Array.from({length}, (_,i) => fn(i)),Float32Array.from({length},(_,i) => .25*Math.cos(i*.019))];
 const engine = new NeutralSTFT(channels,size), output = channels.map(() => new Float32Array(length));
 const t = performance.now(); let peakError = 0, squared = 0;
 for (let p = 0; p < length; p += engine.hop) {
  const block = engine.nextHop();
  output.forEach((c,i) => c.set(block[i].subarray(0, Math.min(engine.hop,length-p)),p));
 }
 const elapsedMs = performance.now()-t;
 for (let c=0;c<2;c++) for(let i=0;i<length;i++) {
  assert.ok(Number.isFinite(output[c][i]));
  const error = output[c][i]-channels[c][i]; peakError = Math.max(peakError,Math.abs(error)); squared+=error*error;
 }
 assert.ok(peakError < 1e-6, `${name} ${length} ${size}: ${peakError}`);
 engine.seek(Math.floor(length/3)); const sought=engine.nextHop();
 assert.ok(Math.abs(sought[0][0]-channels[0][Math.floor(length/3)])<1e-6);
 results.push({name,size,length,peakError,rmsError:Math.sqrt(squared/(length*2)),elapsedMs});
}
// Three-minute stereo file: sustained memory/finite-output and streaming timing.
const longInput = [Float32Array.from({length:rate*180},(_,i)=>.2*Math.sin(i*.1)),new Float32Array(rate*180)];
const longEngine=new NeutralSTFT(longInput);const longStart=performance.now();
let maxBlockMs=0;
for(let p=0;p<longEngine.length;p+=longEngine.hop){const start=performance.now();const block=longEngine.nextHop();maxBlockMs=Math.max(maxBlockMs,performance.now()-start);assert.ok(block[0].every(Number.isFinite));}
const longResult={seconds:180,elapsedMs:performance.now()-longStart,maxHopMs:maxBlockMs,hopBudgetMs:512/rate*1000};
const wav=await encodeWav([new Float32Array([-.5,0,.5])]).arrayBuffer(); const view=new DataView(wav);
assert.equal(view.getUint16(34,true),24); assert.equal(view.getUint32(24,true),48000); assert.equal(view.getUint16(22,true),1); assert.equal(view.getUint32(40,true),9);assert.equal(wav.byteLength,54);
for(const x of [0,.25,.5,.50000001,.75,1]) assert.ok(Number.isFinite(valueAt([{x:0,y:0},{x:.5,y:1},{x:.50000001,y:0},{x:1,y:1}],x)));
// Exercise the actual worklet class with 128-frame render quanta and lifecycle messages.
let Processor; globalThis.sampleRate=48000;globalThis.AudioWorkletProcessor=class{constructor(){this.messages=[];this.port={postMessage:d=>this.messages.push(d)};}};
globalThis.registerProcessor=(_,p)=>Processor=p;
await import('../src/spectral-worklet.js?v=20260929-transport1');
const p=new Processor(), left=Float32Array.from({length:5003},(_,i)=>.3*Math.sin(i*.1)), right=Float32Array.from(left,v=>-v);
const send=d=>p.port.onmessage({data:d});send({type:'buffer',left,right});send({type:'play',token:1});
const captured=[];while(p.playing){const out=[new Float32Array(128),new Float32Array(128)];p.process([], [out]);if(!p.priming)captured.push(...out[0]);}
assert.ok(p.messages.some(m=>m.type==='ended'));left.forEach((v,i)=>assert.ok(Math.abs(v-captured[i])<1e-6));
send({type:'seek',progress:.4});send({type:'play',token:2});p.process([],[[new Float32Array(128),new Float32Array(128)]]);send({type:'pause',token:3});assert.equal(p.playing,false);send({type:'stop',token:4});assert.equal(p.position,0);
writeFileSync(new URL('../docs/numerical-results.json',import.meta.url),JSON.stringify({results,longResult,worklet:'128-frame output, stereo, seek, pause, stop and natural end passed',wav:'24-bit / 48kHz mono odd-byte padding passed'},null,2));
console.log(JSON.stringify({cases:results.length,maxError:Math.max(...results.map(r=>r.peakError)),longResult,worklet:'pass',wav:'pass'}));
const {addNode,moveNode,eraseNode}=await import('../src/curve-editor.js?v=20260929-transport1');
const curve=[{x:0,y:.5},{x:1,y:.5}];
assert.equal(eraseNode(curve,0),false);assert.equal(eraseNode(curve,1),false);
const index=addNode(curve,{x:.5,y:1});addNode(curve,{x:.50000001,y:0});assert.equal(curve.length,3);
moveNode(curve,index,{x:2,y:-1});assert.ok(curve[1].x<1);assert.equal(curve[1].y,0);
moveNode(curve,0,{x:.3,y:.7});assert.equal(curve[0].x,0);moveNode(curve,2,{x:.3,y:.7});assert.equal(curve[2].x,1);
assert.equal(addNode(curve,{x:NaN,y:0}),-1);assert.equal(eraseNode(curve,1),true);assert.equal(curve.length,2);
console.log('Curve endpoint protection, close nodes, finite validation, min/max and erase: pass');
