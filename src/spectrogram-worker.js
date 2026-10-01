import {SpectralEngine} from './spectral-engine.js?v=20260929-transport1';
import {SpectrogramAnalysis} from './spectrogram-core.js?v=20260929-transport1';
self.onmessage=({data})=>{
 try{
  const {channels,rate,curves}=data,length=channels[0].length;
  const source=new SpectrogramAnalysis(channels.length,length,rate),output=new SpectrogramAnalysis(channels.length,length,rate);
  const engine=new SpectralEngine(channels,2048,rate,curves.shift,curves.stretch,0,curves.blur);
  let reported=-1;
  for(let p=0;p<length;p+=engine.hop){
    const count=Math.min(engine.hop,length-p);
    source.push(channels.map(c=>c.subarray(p,p+count)),count);
    output.push(engine.nextHop(),count);
    const percent=Math.floor((p+count)/length*100);if(percent>=reported+5){self.postMessage({progress:percent});reported=percent;}
  }
  const a=source.finish(),b=output.finish();self.postMessage({source:a,output:b},[a.data.buffer,b.data.buffer]);
 }catch(error){self.postMessage({error:error.message});}
};
