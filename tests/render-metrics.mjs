import {Worker} from 'node:worker_threads';
import assert from 'node:assert/strict';
import {encodeWav} from '../src/wav.js';
const url=new URL('../src/render-worker.js',import.meta.url).href;
const flat=y=>[{x:0,y},{x:1,y}],base={curve:flat(.5),stretchCurve:flat(.5),blurCurve:flat(0),harmonicityCurve:flat(.5),freezeCurve:flat(0),order:[]};
for(const amplitude of [.2,1.2]){
 const channels=[Float32Array.from({length:96000},(_,i)=>amplitude*Math.sin(2*Math.PI*997*i/48000))];
 const worker=new Worker(`const{parentPort}=require('node:worker_threads');global.self={postMessage:m=>parentPort.postMessage(m)};import(${JSON.stringify(url)}).then(()=>parentPort.on('message',data=>self.onmessage({data})));`,{eval:true});
 try{const result=await new Promise((resolve,reject)=>{worker.on('error',reject);worker.on('message',m=>{if(m.error)reject(Error(m.error));else if(m.blob)resolve(m)});worker.postMessage({channels,...base})});
 // Neutral processing must preserve the source, except the established10ms edge
 // and one down-only constant output gain when the source exceeds .98.
 const expected=channels[0].slice(),length=expected.length,span=480;
 for(let i=0;i<length;i++)expected[i]*=Math.max(0,Math.min(1,i/span,(length-1-i)/span));
 const inputPeak=Math.max(...expected),scale=inputPeak>.98?.98/inputPeak:1;
 if(scale<1)for(let i=0;i<length;i++)expected[i]*=scale;
 const metrics={},reference=encodeWav([expected],48000,metrics);
 assert.deepEqual(new Uint8Array(await result.blob.arrayBuffer()),new Uint8Array(await reference.arrayBuffer()));
 assert.equal(result.duration,2);assert.equal(result.metrics.clippedSamples,0);assert(result.metrics.peak<=.980001);assert.equal(result.metrics.normalizationGain,scale);
 if(amplitude<1)assert.equal(scale,1);console.log('PASS actual render worker protected neutral source',amplitude,result.metrics);
 }finally{await worker.terminate()}
}
