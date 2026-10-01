import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {SpectralShift,neutralShiftCurve} from '../src/spectral-shift.js?v=20260929-transport1';
const rate=48000;
const constant=hz=>[{x:0,y:.5+hz/4000},{x:1,y:.5+hz/4000}];
const render=(channels,size,curve)=>{
 const engine=new SpectralShift(channels,size,rate,curve),out=channels.map(c=>new Float32Array(c.length));
 for(let p=0;p<engine.length;p+=engine.hop){const b=engine.nextHop();out.forEach((c,i)=>c.set(b[i].subarray(0,Math.min(engine.hop,engine.length-p)),p));}
 return out;
};
const tone=(hz,length=rate)=>Float32Array.from({length},(_,i)=>.3*Math.sin(2*Math.PI*hz*i/rate));
const rms=(x,start=9600,end=x.length-9600)=>{let sum=0;for(let i=start;i<end;i++)sum+=x[i]*x[i];return Math.sqrt(sum/(end-start));};
const amplitude=(x,hz)=>{let re=0,im=0;const start=9600,end=x.length-9600;for(let i=start;i<end;i++){re+=x[i]*Math.cos(2*Math.PI*hz*i/rate);im+=x[i]*Math.sin(2*Math.PI*hz*i/rate);}return 2*Math.hypot(re,im)/(end-start);};
const rows=[];
for(const size of [2048,4096])for(const shift of [-2000,-200,-137.25,0,137.25,200,2000]) {
 const freq=shift < -1000?3500:440,source=tone(freq),output=render([source],size,constant(shift))[0];
 const expected=freq+shift,a=amplitude(output,expected);
 assert.ok(Math.abs(a-.3)<.002,JSON.stringify({size,shift,a}));
 let residual=0;for(let i=9600;i<output.length-9600;i++){const expectedSample=.3*Math.sin(2*Math.PI*(freq+shift)*i/rate);residual+=(output[i]-expectedSample)**2;}
 const residualRms=Math.sqrt(residual/(output.length-19200));assert.ok(residualRms<.002,`phase/frame continuity ${residualRms}`);
 rows.push({size,shift,inputHz:freq,expectedHz:expected,amplitude:a,residualRms});
}
// Additive harmonic relationship: 440/880 -> 640/1080, not 640/1280.
const harmonic=Float32Array.from({length:rate},(_,i)=>.2*Math.sin(2*Math.PI*440*i/rate)+.2*Math.sin(2*Math.PI*880*i/rate));
const shifted=render([harmonic],2048,constant(200))[0];
const harmonicResult={at640:amplitude(shifted,640),at1080:amplitude(shifted,1080),at1280:amplitude(shifted,1280)};
assert.ok(harmonicResult.at640>.195&&harmonicResult.at1080>.195&&harmonicResult.at1280<.001);
const edgeResults=[];
for(const [hz,shift] of [[200,-2000],[23000,2000]])for(const size of [2048,4096]) {
 const output=render([tone(hz)],size,constant(shift))[0],level=rms(output);
 assert.ok(level<1e-5,`edge alias ${level}`);edgeResults.push({hz,shift,size,rms:level});
}
let seed=1;const noise=Float32Array.from({length:rate},()=>{seed=(1664525*seed+1013904223)>>>0;return (seed/2147483648-1)*.3;});
let neutralMaxError=0;
for(const size of [2048,4096])for(const source of [noise,tone(440),new Float32Array([.75]),new Float32Array(17).fill(.2)]){
 const output=render([source],size,neutralShiftCurve())[0];source.forEach((v,i)=>neutralMaxError=Math.max(neutralMaxError,Math.abs(v-output[i])));
}
assert.ok(neutralMaxError<1e-6);
const extreme=[{x:0,y:0},{x:.4,y:1},{x:.40000001,y:0},{x:.7,y:1},{x:1,y:.5}];
for(const size of [2048,4096])for(const len of [1,17,511,48000]){
 const out=render([noise.subarray(0,len)],size,extreme)[0];assert.ok(out.every(Number.isFinite));assert.ok(Math.max(...out.map(Math.abs))<2);
}
// Live edits preserve oscillator phase, seek/reset reinitializes intentionally.
const live=new SpectralShift([tone(440)],2048,rate,constant(200));live.nextHop();const oldPhase=live.phase;live.setCurve(constant(-200));assert.equal(live.phase,oldPhase);assert.ok(live.nextHop()[0].every(Number.isFinite));
const preview=render([tone(440)],2048,constant(137.25))[0],offline=render([tone(440)],4096,constant(137.25))[0];
let parity=0;for(let i=9600;i<rate-9600;i++)parity+=(preview[i]-offline[i])**2;parity=Math.sqrt(parity/(rate-19200));assert.ok(parity<.002);
const result={rows,harmonicResult,edgeResults,neutralMaxError,previewRenderInteriorRms:parity,extremeAndLiveEdits:'pass'};
writeFileSync(new URL('../docs/shift-results.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
// Sustained streaming workload without retaining a second whole-file render.
const longChannels=[tone(997,rate*180),tone(1553,rate*180)];
const longEngine=new SpectralShift(longChannels,2048,rate,extreme);let peak=0;
const startTime=performance.now();
for(let p=0;p<longEngine.length;p+=longEngine.hop){const block=longEngine.nextHop();for(const c of block)for(const sample of c){assert.ok(Number.isFinite(sample));peak=Math.max(peak,Math.abs(sample));}}
const stress={durationSeconds:180,channels:2,elapsedMs:performance.now()-startTime,peak};
assert.ok(peak<1.5);writeFileSync(new URL('../docs/shift-stress-results.json',import.meta.url),JSON.stringify(stress,null,2));console.log('Shift stress:',JSON.stringify(stress));
