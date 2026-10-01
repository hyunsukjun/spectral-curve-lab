import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {SpectralEngine} from '../src/spectral-engine.js?v=20260929-transport1';
import {SpectralShift,neutralShiftCurve} from '../src/spectral-shift.js?v=20260929-transport1';
import {stretchFrequency,stretchFromNorm,stretchToNorm,neutralStretchCurve} from '../src/spectral-stretch.js?v=20260929-transport1';
const rate=48000,length=rate*2;
const constant=amount=>[{x:0,y:stretchToNorm(amount)},{x:1,y:stretchToNorm(amount)}];
const shift=hz=>[{x:0,y:.5+hz/4000},{x:1,y:.5+hz/4000}];
const render=(channels,size=2048,amount=1,shiftHz=0,curve)=>{
 const engine=new SpectralEngine(channels,size,rate,shift(shiftHz),curve||constant(amount));
 const out=channels.map(c=>new Float32Array(c.length));
 for(let p=0;p<engine.length;p+=engine.hop){const b=engine.nextHop();out.forEach((c,i)=>c.set(b[i].subarray(0,Math.min(engine.hop,c.length-p)),p));}
 return out;
};
const tone=(hz,n=length)=>Float32Array.from({length:n},(_,i)=>.3*Math.sin(2*Math.PI*hz*i/rate));
const amplitude=(x,hz)=>{let re=0,im=0;const start=rate/2,end=x.length-rate/2;for(let i=start;i<end;i++){re+=x[i]*Math.cos(2*Math.PI*hz*i/rate);im+=x[i]*Math.sin(2*Math.PI*hz*i/rate);}return 2*Math.hypot(re,im)/(end-start);};
let seed=1;const noise=Float32Array.from({length:48001},()=>{seed=(1664525*seed+1013904223)>>>0;return (seed/2147483648-1)*.3;});
let neutralMaxError=0,shiftRegressionMaxError=0;
for(const size of [2048,4096])for(const source of [noise,tone(997,48001),new Float32Array([.8]),new Float32Array(17).fill(.2)]){
 const out=render([source],size)[0];source.forEach((v,i)=>neutralMaxError=Math.max(neutralMaxError,Math.abs(v-out[i])));
 const combined=render([source],size,1,200)[0],reference=new SpectralShift([source],size,rate,shift(200));
 for(let p=0;p<source.length;p+=reference.hop){const b=reference.nextHop()[0];for(let i=0;i<Math.min(b.length,source.length-p);i++)shiftRegressionMaxError=Math.max(shiftRegressionMaxError,Math.abs(combined[p+i]-b[i]));}
}
assert.ok(neutralMaxError<1e-6);assert.equal(shiftRegressionMaxError,0);
const tonal=[];
for(const size of [2048,4096])for(const amount of [.5,.75,1,1.5,2])for(const hz of [250,500,1000,2000]){
 const out=render([tone(hz)],size,amount)[0],expectedHz=stretchFrequency(hz,amount),a=amplitude(out,expectedHz);
 assert.ok(a>.28&&a<.32,`tone ${size}/${amount}/${hz}: ${a}`);
 const nearby=Math.max(amplitude(out,expectedHz-2),amplitude(out,expectedHz+2));assert.ok(nearby<a*.06,`frequency error ${nearby}`);
 tonal.push({size,amount,inputHz:hz,expectedHz,amplitude:a,nearby2HzAmplitude:nearby});
}
const harmonic=Float32Array.from({length},(_,i)=>.15*Math.sin(2*Math.PI*500*i/rate)+.15*Math.sin(2*Math.PI*1000*i/rate)+.15*Math.sin(2*Math.PI*2000*i/rate));
const combined=render([harmonic],2048,2,200)[0];
const combinedPeaks=[450,1200,4200].map(hz=>({hz,amplitude:amplitude(combined,hz)}));
assert.ok(combinedPeaks.every(p=>p.amplitude>.13&&p.amplitude<.17));
const proportionalArtifact=amplitude(combined,2200);assert.ok(proportionalArtifact<.005);
// Linked (anti-correlated) stereo must preserve its ratio even when both effects run.
const stereo=render([harmonic,Float32Array.from(harmonic,v=>-.5*v)],2048,.75,-100);
let stereoError=0;for(let i=0;i<length;i++)stereoError=Math.max(stereoError,Math.abs(stereo[1][i]+stereo[0][i]*.5));assert.ok(stereoError<1e-6);
const extremes=[{x:0,y:0},{x:.4,y:1},{x:.40000001,y:0},{x:.8,y:1},{x:1,y:.5}];let extremePeak=0;
for(const size of [2048,4096])for(const n of [1,17,511,48001]){
 const out=render([noise.subarray(0,n)],size,1,1500,extremes)[0];for(const v of out){assert.ok(Number.isFinite(v));extremePeak=Math.max(extremePeak,Math.abs(v));}
}
assert.ok(extremePeak<2);
// Above Nyquist maps out of the available spectrum, without folded mirror peaks.
const outside=render([tone(12000)],2048,2)[0];let outRms=0;for(let i=rate/2;i<length-rate/2;i++)outRms+=outside[i]**2;outRms=Math.sqrt(outRms/rate);assert.ok(outRms<.001);
const live=new SpectralEngine([harmonic],2048,rate,shift(100),constant(1));live.nextHop();live.setStretchCurve(extremes);assert.ok(live.nextHop()[0].every(Number.isFinite));live.seek(12345);assert.ok(live.nextHop()[0].every(Number.isFinite));
assert.throws(()=>live.setStretchCurve([{x:0,y:NaN},{x:1,y:1}]));assert.equal(stretchFromNorm(.5),1);
const result={neutralMaxError,shiftRegressionMaxError,tonal,combinedPeaks,proportionalArtifact,stereoError,extremePeak,aboveNyquistRms:outRms};
writeFileSync(new URL('../docs/stretch-results.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify({neutralMaxError,shiftRegressionMaxError,tonalCases:tonal.length,minAmplitude:Math.min(...tonal.map(r=>r.amplitude)),maxAmplitude:Math.max(...tonal.map(r=>r.amplitude)),combinedPeaks,stereoError,extremePeak,aboveNyquistRms:outRms},null,2));
// Three-minute streaming stereo, changing Stretch and Shift active throughout.
const channels=[tone(997,rate*180),tone(1553,rate*180)];const engine=new SpectralEngine(channels,2048,rate,shift(200),extremes);
const started=performance.now();let peak=0;
for(let p=0;p<engine.length;p+=engine.hop)for(const c of engine.nextHop())for(const v of c){assert.ok(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));}
assert.ok(peak<2);const stress={durationSeconds:180,channels:2,elapsedMs:performance.now()-started,peak};
writeFileSync(new URL('../docs/stretch-stress-results.json',import.meta.url),JSON.stringify(stress,null,2));console.log('Stress:',JSON.stringify(stress));
