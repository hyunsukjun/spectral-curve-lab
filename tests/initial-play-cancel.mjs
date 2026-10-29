import {createSourceLoadGate} from "../src/default-source.js";
import {readAudioFile,validateAudioBuffer} from "../src/audio-import.js";
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const pick=name=>{const match=new RegExp(`(?:async )?function ${name}\\(`).exec(source);assert.ok(match);return source.slice(match.index,source.indexOf('\n}',match.index)+2)};
for(const action of ['stopAudio','forceStopAudio','loadAudioFile']){
 let ready;const gate=new Promise(resolve=>ready=resolve),messages=[];
 const c={validateAudioBuffer,sourceFileLabel:"",readAudioFile,audioContext:{sampleRate:48000},outputTime:{setBuffer(){}},buffer:{duration:8},node:null,playbackToken:0,isPlaying:false,workletBufferLoaded:false,playheadSeconds:0,sourcePlayheadSeconds:0,isScrubbing:false,
 playButton:{disabled:false,textContent:'Play'},resetDialog:{hidden:true},spectrogram:{cancel(){},invalidate(){}},fileStatus:{},downloadReadout:{},renderAbortController:null,
 ensureAudio:async()=>{await gate;c.node={port:{postMessage:m=>messages.push(m)}}},ensureAudioContext:async()=>{},getPlaybackDuration:()=>8,
 setTransportBusy:x=>c.playButton.disabled=x,decodeAudioFile:async()=>({duration:2,numberOfChannels:1,length:96000,sampleRate:48000,getChannelData:()=>new Float32Array(96000),copyFromChannel:out=>out.fill(0)}),buildWaveform(){},sendBufferToWorklet(){},clearDownload(){},largeFileSeconds:300,resetCurrentReadouts(){},draw(){},console};
 c.setExportStatus = message => { if(c.downloadReadout)c.downloadReadout.textContent = message; if(c.readouts?.download)c.readouts.download.textContent = message; };
 c.sourceLoadGate = createSourceLoadGate();
 vm.createContext(c);vm.runInContext(['nextPlaybackToken','playAudio','stopAudio','forceStopAudio','loadAudioFile'].map(pick).join('\n'),c);
 const pending=c.playAudio();
 if(action==='loadAudioFile')await c.loadAudioFile({name:'replacement.wav',slice:()=>new Blob([new ArrayBuffer(8)]),arrayBuffer:async()=>new ArrayBuffer(8)});else c[action]();
 ready();await pending;
 assert.equal(messages.filter(m=>m.type==='play').length,0,`${action} must invalidate pending first Play before node creation`);
 assert.equal(c.isPlaying,false);
 await c.playAudio();assert.equal(messages.filter(m=>m.type==='play').length,1,'explicit retry should play');
 console.log('PASS',action,'cancels pending initialization and permits explicit retry');
}
