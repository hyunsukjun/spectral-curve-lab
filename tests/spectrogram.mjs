import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {SpectrogramAnalysis} from '../src/spectrogram-core.js?v=20260929-transport1';
import {SpectralEngine} from '../src/spectral-engine.js?v=20260929-transport1';
const rate=48000,flat=y=>[{x:0,y},{x:1,y}];
function analyse(channels){const a=new SpectrogramAnalysis(channels.length,channels[0].length,rate,128,192);for(let p=0;p<channels[0].length;p+=512)a.push(channels.map(c=>c.subarray(p,p+512)));return a.finish();}
const tone=Float32Array.from({length:rate*3},(_,i)=>.5*Math.sin(2*Math.PI*750*i/rate));
const source=analyse([tone]),stereo=analyse([tone,Float32Array.from(tone,x=>-x)]);assert.deepEqual(source.data,stereo.data,'antiphase must not cancel');
function peakColumn(a,column){let value=-100,row=0;for(let r=0;r<a.height;r++)if(a.data[r*a.width+column]>value){value=a.data[r*a.width+column];row=r;}return {value,hz:a.minHz*(a.maxHz/a.minHz)**(1-(row+.5)/a.height)};}
const peak=peakColumn(source,64);assert(Math.abs(peak.value-20*Math.log10(.5))<.01);assert(Math.abs(peak.hz-750)<45);
let neutralError=0;const rows=[];
for(const [name,shift,stretch,blur,hz] of [['neutral',.5,.5,0,750],['shift',.55,.5,0,950],['stretch',.5,1,0,562.5],['blur',.5,.5,1,750]]){
 const engine=new SpectralEngine([tone],2048,rate,flat(shift),flat(stretch),0,flat(blur)),a=new SpectrogramAnalysis(1,tone.length,rate,128,192);
 for(let p=0;p<tone.length;p+=engine.hop)a.push(engine.nextHop(),Math.min(engine.hop,tone.length-p));const output=a.finish(),peak=peakColumn(output,100);
 assert(Math.abs(peak.hz-hz)<50,`${name} mapped spectral ridge`);if(name==='neutral')for(let i=0;i<source.data.length;i++)neutralError=Math.max(neutralError,Math.abs(source.data[i]-output.data[i]));rows.push({name,expectedHz:hz,...peak});
}
assert(neutralError<1e-4);
const silent=analyse([new Float32Array(1)]);assert(silent.data.every(v=>v===-90));assert(silent.data.length===128*192);
const quiet=analyse([Float32Array.from(tone,x=>x*.1)]);assert(Math.abs(peakColumn(quiet,64).value-peak.value+20)<.01,'no independent brightness normalization');
const result={neutralError,rows,antiphase:'pass',fixedDbScale:'pass',shortSilence:'pass'};writeFileSync('docs/spectrogram-results.json',JSON.stringify(result,null,2)+'\n');console.log(result);
