import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const pick=name=>{const i=source.indexOf(`async function ${name}(`);assert.ok(i>=0);return source.slice(i,source.indexOf('\n}',i)+2)};
let resumes=0,busy=[],rejectDecode=false,decoded=0,options;
const candidate={numberOfChannels:2,duration:2};
class AudioContext {constructor(opts){options=opts;this.state='suspended'} resume(){resumes++;return new Promise(()=>{})}}
const text=()=>({textContent:''});
const c={window:{AudioContext},audioContext:null,buffer:null,renderAbortController:null,node:null,
 spectrogram:{invalidate(){}},outputTime:{setBuffer(){}},fileStatus:text(),downloadReadout:text(),readouts:{download:text()},playButton:text(),isPlaying:false,
 setTransportBusy(x){busy.push(x)},setBusy(x){busy.push(x)},nextPlaybackToken(){return 1},
 decodeAudioFile:async()=>{decoded++;if(rejectDecode)throw new Error('Invalid audio');return candidate},
 buildWaveform(){},sendBufferToWorklet(){},resetSourceWindowToMinimum(){},sendSettings(){},clearDownload(){},largeFileSeconds:300,resetCurrentReadouts(){},draw(){},console:{error(){}}};
vm.createContext(c);vm.runInContext(pick('ensureAudioContext')+'\n'+pick('loadAudioFile'),c);
const file={name:'test.wav',arrayBuffer:async()=>new ArrayBuffer(8)};
let timer;
try {await Promise.race([c.loadAudioFile(file),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Import blocked by pending audio resume')),200)})]);} finally {clearTimeout(timer)}
assert.equal(resumes,0);assert.equal(decoded,1);assert.equal(c.buffer,candidate);assert.deepEqual(busy,[true,false]);assert.match(c.fileStatus.textContent,/2.00 s/);
rejectDecode=true;busy=[];await c.loadAudioFile(file);assert.equal(c.buffer,null);assert.deepEqual(busy,[true,false]);assert.match(c.fileStatus.textContent,/Could not load/);
rejectDecode=false;busy=[];await c.loadAudioFile(file);assert.equal(c.buffer,candidate);assert.deepEqual(busy,[true,false]);
if(source.includes('Only mono/stereo sources supported')){
 assert.equal(options.sampleRate,48000);candidate.numberOfChannels=4;await c.loadAudioFile(file);assert.equal(c.buffer,null);
}
void c.ensureAudioContext();assert.equal(resumes,1);
console.log('PASS: suspended-context import, failure recovery/retry, playback activation, channel/rate contract');
