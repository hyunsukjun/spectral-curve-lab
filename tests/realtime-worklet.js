import {SpectralNeutralProcessor} from '../src/spectral-worklet.js?v=20260929-transport1';
class MeasuredProcessor extends SpectralNeutralProcessor {
 constructor(options) {
  super(); const {channels,curve,stretchCurve,blurCurve}=options.processorOptions;
  this.port.onmessage({data:{type:'buffer',left:channels[0],right:channels[1]||channels[0]}});
  if(curve || stretchCurve || blurCurve)this.port.onmessage({data:{type:'curves',curve,stretchCurve,blurCurve}});
  this.port.onmessage({data:{type:'play',token:1}});
  this.clock=typeof performance!=='undefined'&&performance.now ? ()=>performance.now() : typeof Date!=='undefined'?()=>Date.now():null;
  this.clockName=typeof performance!=='undefined'&&performance.now?'performance.now':this.clock?'Date.now (1ms resolution)':'unavailable';
  this.totalMs=0;this.maxMs=0;this.calls=0;this.overBudget=0;this.captured=0;
  this.capture=[new Float32Array(this.engine.length),new Float32Array(this.engine.length)];
 }
 process(inputs,outputs) {
  try { return this.measure(inputs,outputs); } catch(error) { this.port.postMessage({type:"failure",message:error.stack});this.sent=true;return true; }
 }
 measure(inputs,outputs) {
  if(this.sent)return true;
  const start=this.clock?.();super.process(inputs,outputs);const elapsed=this.clock?this.clock()-start:null;
  if(elapsed!=null){this.totalMs+=elapsed;this.maxMs=Math.max(this.maxMs,elapsed);if(elapsed>outputs[0][0].length/sampleRate*1000)this.overBudget++;}
  this.calls++;
  if(this.priming)return true;
  const length=Math.min(outputs[0][0].length,this.engine.length-this.captured);
  for(let c=0;c<2;c++)this.capture[c].set(outputs[0][c].subarray(0,length),this.captured);
  this.captured+=length;
  if(!this.playing){this.sent=true;this.port.postMessage({type:'measurement',clock:this.clockName,totalProcessMs:this.totalMs,maxProcessMs:this.maxMs,calls:this.calls,overBudget:this.overBudget,channels:this.capture},this.capture.map(c=>c.buffer));}
  return true;
 }
}
registerProcessor('measured-spectral',MeasuredProcessor);
