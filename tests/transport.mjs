import assert from 'node:assert/strict';
let Processor;
globalThis.sampleRate=48000;
globalThis.AudioWorkletProcessor=class{constructor(){this.messages=[];this.port={postMessage:d=>this.messages.push(d)};}};
globalThis.registerProcessor=(_,p)=>Processor=p;
await import('../src/spectral-worklet.js');
// Every callback phase: ended must be the final message, including exact hop endings.
for(const length of [1,127,128,511,512,1921,2048,5003])for(let tick=0;tick<16;tick++){
 const p=new Processor(),left=Float32Array.from({length},(_,i)=>.2*Math.sin(i*.1));
 const send=data=>p.port.onmessage({data});
 send({type:'buffer',left,right:left});send({type:'play',token:7});p.ticks=tick;
 let loops=0;while(p.playing&&loops++<1000){
  p.process([],[[new Float32Array(128),new Float32Array(128)]]);
  if(p.position===length)assert.equal(p.playing,false,'End must complete in the final output callback');
 }
 assert.ok(loops<1000);assert.equal(p.messages.at(-1)?.type,'ended',`length=${length},tick=${tick}`);
 assert.equal(p.messages.filter(m=>m.type==='ended').length,1);assert.equal(p.position,length);
 send({type:'seek',progress:0,token:8});send({type:'play',token:8});
 while(p.playing&&p.position===0)p.process([],[[new Float32Array(128),new Float32Array(128)]]);
 assert.ok(p.position>0);send({type:'pause',token:9});const paused=p.position;
 p.process([],[[new Float32Array(128),new Float32Array(128)]]);assert.equal(p.position,paused);
 send({type:'stop',token:10});assert.equal(p.position,0);assert.equal(p.messages.at(-1).type,'stopped');
}
console.log('128 transport cases: end ordering, restart, pause and stop passed');
