import {Worker} from 'node:worker_threads';
import assert from 'node:assert/strict';
import {SpectralEngine} from '../src/spectral-engine.js';
import {encodeWav} from '../src/wav.js';
const url=new URL('../src/render-worker.js',import.meta.url).href;
const flat=y=>[{x:0,y},{x:1,y}],base={curve:flat(.5),stretchCurve:flat(.5),blurCurve:flat(0),harmonicityCurve:flat(.5),freezeCurve:flat(0),order:[]};
for(const amplitude of [.2,1.2]){
 const channels=[Float32Array.from({length:96000},(_,i)=>amplitude*Math.sin(2*Math.PI*997*i/48000))];
 const worker=new Worker(`const{parentPort}=require('node:worker_threads');global.self={postMessage:m=>parentPort.postMessage(m)};import(${JSON.stringify(url)}).then(()=>parentPort.on('message',data=>self.onmessage({data})));`,{eval:true});
 try{const result=await new Promise((resolve,reject)=>{worker.on('error',reject);worker.on('message',m=>{if(m.error)reject(Error(m.error));else if(m.blob)resolve(m)});worker.postMessage({channels,...base})});
 const e=new SpectralEngine(channels,4096,48000,base.curve,base.stretchCurve,0,base.blurCurve,base.harmonicityCurve,base.freezeCurve,[]);const output=new Float32Array(96000);for(let p=0;p<96000;p+=e.hop)output.set(e.nextHop()[0].subarray(0,Math.min(e.hop,96000-p)),p);
 const metrics={};const reference=encodeWav([output],48000,metrics);
 assert.deepEqual(new Uint8Array(await result.blob.arrayBuffer()),new Uint8Array(await reference.arrayBuffer()));assert.deepEqual(result.metrics,metrics);assert.equal(result.duration,2);assert.equal(metrics.clippedSamples>0,amplitude>1);console.log('PASS actual render worker',amplitude,metrics);
 }finally{await worker.terminate()}
}
