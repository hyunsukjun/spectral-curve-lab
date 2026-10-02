import assert from 'node:assert/strict';
import {SpectralEngine} from '../src/spectral-engine.js?v=20261002-harmonic-freeze1';

const rate=48000,flat=y=>[{x:0,y},{x:1,y}];
const render=(input,size,harmonicity=flat(.5),freeze=flat(0))=>{
  const engine=new SpectralEngine([input],size,rate,flat(.5),flat(.5),0,flat(0),harmonicity,freeze);
  const output=new Float32Array(input.length);
  for(let p=0;p<input.length;p+=engine.hop)output.set(engine.nextHop()[0].subarray(0,Math.min(engine.hop,input.length-p)),p);
  return output;
};
const tone=(hz,t)=>Math.sin(2*Math.PI*hz*t);
const amplitude=(data,hz,start,end)=>{
  let re=0,im=0;const begin=Math.round(start*rate),finish=Math.round(end*rate);
  for(let i=begin;i<finish;i++){const a=2*Math.PI*hz*i/rate;re+=data[i]*Math.cos(a);im+=data[i]*Math.sin(a);}
  return 2*Math.hypot(re,im)/(finish-begin);
};
for(const size of [2048,4096]){
  const source=Float32Array.from({length:rate*3},(_,i)=>.2*tone(400,i/rate)+.12*tone(900,i/rate));
  const dry=render(source,size);
  let neutralError=0;for(let i=0;i<source.length;i++)neutralError=Math.max(neutralError,Math.abs(source[i]-dry[i]));
  assert(neutralError<1e-6,`neutral five-effect path size ${size}: ${neutralError}`);
  const harmonic=render(source,size,flat(0));
  const original900=amplitude(harmonic,900,1.5,2.5),target800=amplitude(harmonic,800,1.5,2.5);
  const harmonicBand=Array.from({length:101},(_,i)=>({hz:750+i,a:amplitude(harmonic,750+i,1.5,2.5)})).sort((a,b)=>b.a-a.a)[0];
  assert(harmonicBand.a>.08&&original900<.01,`harmonic mapping ${size}: ${JSON.stringify(harmonicBand)} vs ${original900}`);
  const inharmonic=render(source,size,flat(1));
  assert(amplitude(inharmonic,900,1.5,2.5)<amplitude(dry,900,1.5,2.5)*.8,`inharmonic mapping ${size}`);
  const change=Float32Array.from({length:rate*3},(_,i)=>.2*tone(i<rate?400:900,i/rate));
  const holdCurve=[{x:0,y:0},{x:.13,y:0},{x:.16,y:1},{x:.66,y:1},{x:.70,y:0},{x:1,y:0}];
  const held=render(change,size,flat(.5),holdCurve);
  assert(amplitude(held,400,1.25,1.55)>amplitude(held,900,1.25,1.55)*2,`freeze holds earlier state ${size}`);
  assert(amplitude(held,900,2.55,2.85)>.12,`freeze releases ${size}`);
  assert(held.every(Number.isFinite),`finite freeze ${size}`);
  console.log(JSON.stringify({size,neutralError,target800,original900,harmonicBand,held400:amplitude(held,400,1.25,1.55),held900:amplitude(held,900,1.25,1.55)}));
}
const input=Float32Array.from({length:rate*3},(_,i)=>.12*tone(330,i/rate)+.08*tone(770,i/rate));
const blend=[{x:0,y:0},{x:.2,y:.9},{x:.7,y:.9},{x:1,y:0}];
const combined=new SpectralEngine([input,Float32Array.from(input,x=>-.5*x)],2048,rate,flat(.54),flat(.58),0,flat(.2),flat(.85),blend);
let peak=0;for(let p=0;p<input.length;p+=combined.hop){const block=combined.nextHop();for(const channel of block)for(const sample of channel){assert(Number.isFinite(sample));peak=Math.max(peak,Math.abs(sample));}}
assert(peak<1,'combined output headroom on diagnostic source');
combined.seek(rate);
const afterSeek=combined.nextHop()[0];
const fresh=new SpectralEngine([input,Float32Array.from(input,x=>-.5*x)],2048,rate,flat(.54),flat(.58),rate,flat(.2),flat(.85),blend).nextHop()[0];
assert.deepEqual(afterSeek,fresh,'seek resets harmonicity/freeze phase state');
assert.throws(()=>combined.setHarmonicityCurve([{x:0,y:NaN},{x:1,y:.5}]));
assert.throws(()=>combined.setFreezeCurve([{x:0,y:0},{x:1,y:Infinity}]));
console.log(JSON.stringify({combinedPeak:peak,seekReset:'pass',invalidCurves:'pass'}));
