import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {SpectralEngine} from '../src/spectral-engine.js?v=20260929-transport1';
const rate=48000,flat=y=>[{x:0,y},{x:1,y}],source=(seconds,fn)=>Float32Array.from({length:rate*seconds},(_,i)=>fn(i/rate));
const render=(input,size,blur,shift=flat(.5),stretch=flat(.5))=>{const e=new SpectralEngine([input],size,rate,shift,stretch,0,blur),out=new Float32Array(input.length);for(let p=0;p<out.length;p+=e.hop)out.set(e.nextHop()[0].subarray(0,Math.min(e.hop,out.length-p)),p);return out;};
const amp=(data,hz,start,end)=>{let r=0,i=0;for(let j=Math.round(start*rate);j<Math.round(end*rate);j++){r+=data[j]*Math.cos(2*Math.PI*hz*j/rate);i+=data[j]*Math.sin(2*Math.PI*hz*j/rate);}return 2*Math.hypot(r,i)/((end-start)*rate);};
let neutralMaxError=0;const rows=[];
for(const size of [2048,4096]){
 const input=source(4,t=>.2*Math.sin(2*Math.PI*500*t)+.2*Math.sin(2*Math.PI*6000*t));
 const dry=render(input,size,flat(0));for(let i=0;i<input.length;i++)neutralMaxError=Math.max(neutralMaxError,Math.abs(input[i]-dry[i]));
 const steady=render(input,size,flat(1));const low=amp(steady,500,3,3.8),high=amp(steady,6000,3,3.8);assert(low>.19&&low<.21&&high>.19&&high<.21,'steady frequencies incl high band preserved');
 const pulse=source(3,t=>t>=.5&&t<1?.3*Math.sin(2*Math.PI*750*t):0),tail=render(pulse,size,flat(1)),dryPulse=render(pulse,size,flat(0));
 const early=amp(tail,750,.55,.7),late=amp(tail,750,1.15,1.35),dryLate=amp(dryPulse,750,1.15,1.35);assert(early<.15&&late>.04&&dryLate<1e-7,'attack softened, old frequency persists');
 const alternating=source(3,t=>t<1?.25*Math.sin(2*Math.PI*500*t):.25*Math.sin(2*Math.PI*1500*t)),blurred=render(alternating,size,flat(1));
 const oldTone=amp(blurred,500,1.2,1.4),newTone=amp(blurred,1500,1.2,1.4);assert(oldTone>.05&&newTone>.05,'old and new tones overlap');
 const combined=render(input,size,flat(.5),flat(.55),flat(1));assert(amp(combined,450,3,3.8)>.17,'Stretch then Blur then Shift mapping');
 rows.push({size,low,high,early,late,dryLate,oldTone,newTone});
}
assert(neutralMaxError<1e-6);
for(const length of [1,17,2049]){const input=new Float32Array(length).fill(.1);for(const y of [0,1])assert(render(input,2048,flat(y)).every(Number.isFinite));}
const input=source(3,t=>.25*Math.sin(2*Math.PI*(t<1?500:1500)*t)),e=new SpectralEngine([input,Float32Array.from(input,x=>-.5*x)],4096,rate,flat(.5),flat(.5),0,flat(1));let stereoError=0;
for(let p=0;p<input.length;p+=e.hop){const b=e.nextHop();for(let i=0;i<b[0].length;i++)stereoError=Math.max(stereoError,Math.abs(b[1][i]+.5*b[0][i]));}assert(stereoError<1e-6);
e.seek(0);e.setBlurCurve(flat(0));e.seek(0);assert(e.nextHop()[0].every(Number.isFinite));assert.throws(()=>e.setBlurCurve([{x:0,y:NaN},{x:1,y:0}]));
const result={neutralMaxError,stereoError,rows,pass:true};writeFileSync('docs/blur-results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));

const long=source(180,t=>.1*Math.sin(2*Math.PI*700*t)),longEngine=new SpectralEngine([long,long],2048,rate,flat(.55),flat(.7),0,[{x:0,y:0},{x:.3,y:1},{x:.30001,y:0},{x:.7,y:1},{x:1,y:0}]);
let peak=0;const started=performance.now();for(let p=0;p<long.length;p+=longEngine.hop){const block=longEngine.nextHop();for(const c of block)for(const v of c){assert(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));}}
longEngine.setBlurCurve(flat(1));longEngine.seek(48000);const sought=longEngine.nextHop()[0].slice(),fresh=new SpectralEngine([long,long],2048,rate,flat(.55),flat(.7),48000,flat(1)).nextHop()[0];assert.deepEqual(sought,fresh);
const stress={seconds:180,channels:2,elapsedMs:performance.now()-started,peak,seekReset:'pass'};writeFileSync('docs/blur-stress-results.json',JSON.stringify(stress,null,2)+'\n');console.log(stress);
