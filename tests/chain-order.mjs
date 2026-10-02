import assert from 'node:assert/strict';
import {SpectralEngine} from '../src/spectral-engine.js?v=20261003-chain1';

const rate=48000,flat=y=>[{x:0,y},{x:1,y}];
const source=Float32Array.from({length:rate*2},(_,i)=>{
  const t=i/rate,frequency=t<.7?380:t<1.3?1040:620;
  return .18*Math.sin(2*Math.PI*frequency*t)+.08*Math.sin(2*Math.PI*frequency*2*t);
});
const render=(size,order,stretchCurve=flat(.7),blurCurve=flat(.8),shiftCurve=flat(.5))=>{
  const engine=new SpectralEngine([source],size,rate,shiftCurve,stretchCurve,0,blurCurve,flat(.5),flat(0),order);
  const result=new Float32Array(source.length);
  for(let p=0;p<source.length;p+=engine.hop)result.set(engine.nextHop()[0].subarray(0,Math.min(engine.hop,source.length-p)),p);
  assert(result.every(Number.isFinite));
  return {result,engine};
};
for(const size of [2048,4096]){
  const first=render(size,['stretch','blur']);
  const second=render(size,['blur','stretch']);
  assert.deepEqual(first.engine.spectrumOrder,['stretch','blur','harmonicity','freeze']);
  assert.deepEqual(second.engine.spectrumOrder,['blur','stretch','harmonicity','freeze']);
  let difference=0;
  for(let i=0;i<source.length;i++)difference+=Math.abs(first.result[i]-second.result[i]);
  difference/=source.length;
  assert(difference>1e-4,`ordering must change output at ${size}: ${difference}`);
  const neutral=render(size,[],flat(.5),flat(0)).result;
  let neutralError=0;
  for(let i=0;i<source.length;i++)neutralError=Math.max(neutralError,Math.abs(neutral[i]-source[i]));
  assert(neutralError<1e-6,`all-Off neutral output at ${size}: ${neutralError}`);
  const shiftFirst=render(size,['shift','stretch','blur'],flat(.7),flat(.8),flat(.55));
  const shiftLast=render(size,['stretch','blur','shift'],flat(.7),flat(.8),flat(.55));
  assert.deepEqual(shiftFirst.engine.order,['shift','stretch','blur']);
  assert(shiftFirst.engine.postEngine,'Shift with successors uses a second analysis pass');
  assert(!shiftLast.engine.postEngine,'Shift last keeps the original single-pass path');
  let shiftOrderDifference=0;
  for(let i=0;i<source.length;i++)shiftOrderDifference+=Math.abs(shiftFirst.result[i]-shiftLast.result[i]);
  shiftOrderDifference/=source.length;
  assert(shiftOrderDifference>1e-4,`Shift placement must change output at ${size}: ${shiftOrderDifference}`);
  const neutralMiddle=render(size,['shift','stretch'],flat(.5),flat(0),flat(.5)).result;
  let neutralMiddleError=0;
  for(let i=0;i<source.length;i++)neutralMiddleError=Math.max(neutralMiddleError,Math.abs(neutralMiddle[i]-source[i]));
  assert(neutralMiddleError<1e-6,`neutral two-pass output at ${size}: ${neutralMiddleError}`);
  assert.throws(()=>first.engine.setOrder(['shift','shift']),/Invalid spectral chain order/);
  console.log(JSON.stringify({size,orderMeanDifference:difference,shiftOrderDifference,neutralError,neutralMiddleError}));
}

const seekEngine=new SpectralEngine([source],2048,rate,flat(.55),flat(.7),0,flat(.2),flat(.5),flat(0),['shift','stretch','blur']);
for(let i=0;i<50;i++)seekEngine.nextHop();
seekEngine.seek(rate);
const sought=seekEngine.nextHop()[0].slice();
const fresh=new SpectralEngine([source],2048,rate,flat(.55),flat(.7),rate,flat(.2),flat(.5),flat(0),['shift','stretch','blur']).nextHop()[0];
assert.deepEqual(sought,fresh,'two-pass seek resets both analysis stages');

function permutations(items){
  if(!items.length)return [[]];
  return items.flatMap((item,index)=>permutations(items.filter((_,i)=>i!==index)).map(rest=>[item,...rest]));
}
for(const order of permutations(['shift','stretch','blur','harmonicity','freeze'])){
  const engine=new SpectralEngine([source],2048,rate,flat(.55),flat(.7),0,flat(.2),flat(.65),flat(.1),order);
  const shift=order.indexOf('shift');
  assert.deepEqual(engine.spectrumOrder,order.slice(0,shift),'first pass follows the prefix before Shift');
  assert.deepEqual(engine.postEngine?.order || [],order.slice(shift+1),'second pass follows the suffix after Shift');
  assert(engine.nextHop()[0].every(Number.isFinite),'every five-module order produces finite output');
}
console.log('All 120 five-module engine orders have the expected first/second-pass topology');

let Processor;
globalThis.sampleRate=rate;
globalThis.AudioWorkletProcessor=class {constructor(){this.port={postMessage(){}};}};
globalThis.registerProcessor=(_,processor)=>{Processor=processor;};
await import('../src/spectral-worklet.js?v=20261003-chain1');
const worklet=new Processor();
worklet.port.onmessage({data:{type:'buffer',left:source,right:source}});
worklet.port.onmessage({data:{type:'curves',order:['shift','blur','stretch'],curve:flat(.55),stretchCurve:flat(.7),blurCurve:flat(.8)}});
assert.deepEqual(worklet.engine.order,['shift','blur','stretch'],'Preview worklet receives a mid-chain Shift');
worklet.port.onmessage({data:{type:'play'}});
worklet.port.onmessage({data:{type:'curves',order:['stretch','blur','shift']}});
assert.deepEqual(worklet.engine.order,['shift','blur','stretch'],'live edit waits for a frame boundary');
worklet.applyCurves(worklet.pendingCurves);
assert.deepEqual(worklet.engine.order,['stretch','blur','shift'],'frame boundary commits live order');
worklet.port.onmessage({data:{type:'curves',order:['shift','blur','stretch']}});
worklet.applyCurves(worklet.pendingCurves);
let livePeak=0;
for(let quantum=0;quantum<400;quantum++){
  if(quantum===180)worklet.port.onmessage({data:{type:'curves',order:['stretch','shift','blur']}});
  const output=[[new Float32Array(128),new Float32Array(128)]];
  worklet.process([],output);
  for(const channel of output[0])for(const sample of channel){
    assert(Number.isFinite(sample),'Preview dual-pass output must stay finite');
    livePeak=Math.max(livePeak,Math.abs(sample));
  }
}
assert(livePeak>0.01,'Preview dual-pass route produces audio');
assert.deepEqual(worklet.engine.order,['stretch','shift','blur'],'Preview live route commits Shift in the middle');
console.log('Preview worklet order messages and frame-boundary commit: pass');

const workerMessages=[];
globalThis.self={postMessage:data=>workerMessages.push(data)};
await import('../src/render-worker.js?v=20261003-chain4');
self.onmessage({data:{channels:[source.subarray(0,rate)],curve:flat(.55),stretchCurve:flat(.7),blurCurve:flat(.2),harmonicityCurve:flat(.5),freezeCurve:flat(0),order:['shift','stretch','blur']}});
const rendered=workerMessages.at(-1);
assert(rendered.blob instanceof Blob,'WAV worker completes a mid-chain Shift');
assert.equal(rendered.duration,1);
const wav=new DataView(await rendered.blob.arrayBuffer());
assert.equal(wav.getUint32(24,true),rate);
assert.equal(wav.getUint16(34,true),24);
assert.equal(wav.getUint32(40,true),rate*3);
console.log('WAV worker mid-chain Shift: 48 kHz / 24-bit / full duration');

const longInput=Float32Array.from({length:rate*30},(_,i)=>.12*Math.sin(2*Math.PI*330*i/rate)+.06*Math.sin(2*Math.PI*770*i/rate));
const longEngine=new SpectralEngine([longInput,Float32Array.from(longInput,x=>-.5*x)],2048,rate,flat(.55),flat(.56),0,flat(.2),flat(.58),flat(.15),['shift','freeze','blur','harmonicity','stretch']);
let peak=0;
for(let p=0;p<longInput.length;p+=longEngine.hop){
  if(p>=rate*15&&p<rate*15+longEngine.hop)longEngine.setOrder(['stretch','harmonicity','blur','freeze','shift']);
  for(const channel of longEngine.nextHop())for(const sample of channel){
    assert(Number.isFinite(sample),'live chain order generated a non-finite sample');
    peak=Math.max(peak,Math.abs(sample));
  }
}
console.log(JSON.stringify({stressSeconds:30,channels:2,liveOrderChange:'finite',peak}));
