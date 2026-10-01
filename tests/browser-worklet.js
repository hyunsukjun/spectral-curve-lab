import {SpectralNeutralProcessor} from '../src/spectral-worklet.js?v=20260929-transport1';
class TestProcessor extends SpectralNeutralProcessor {
 constructor(options) {
  super(); const c=options.processorOptions.channels;
  this.port.onmessage({data:{type:'buffer',left:c[0],right:c[1]||c[0]}});
  if(options.processorOptions.curve)this.port.onmessage({data:{type:"curves",curve:options.processorOptions.curve}});
  if(options.processorOptions.stretchCurve)this.port.onmessage({data:{type:"curves",stretchCurve:options.processorOptions.stretchCurve}});
  if(options.processorOptions.blurCurve)this.port.onmessage({data:{type:"curves",blurCurve:options.processorOptions.blurCurve}});
  while(this.engine.nextFrame <= this.engine.position)this.engine.accumulateNextFrame();
  this.port.onmessage({data:{type:'play',token:1}});
 }
}
registerProcessor('test-neutral', TestProcessor);
