'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
class Param{constructor(){this.value=0}setValueAtTime(v){this.value=v}exponentialRampToValueAtTime(v){this.value=v}setTargetAtTime(v){this.value=v}cancelScheduledValues(){}}
class Node{connect(){return this}disconnect(){}}
class FakeAudioContext{
  constructor(){this.state='suspended';this.currentTime=0;this.sampleRate=44100;this.destination=new Node();this.listeners={};this.oscillators=0;this.resumeCalls=0}
  createGain(){const n=new Node();n.gain=new Param();return n}createDynamicsCompressor(){const n=new Node();for(const k of ['threshold','knee','ratio','attack','release'])n[k]=new Param();return n}
  createBuffer(channels,length){return{getChannelData(){return new Float32Array(Math.min(length,32))}}}createBufferSource(){const n=new Node();n.start=()=>{};n.stop=()=>{n.onended?.()};return n}
  createOscillator(){this.oscillators++;const n=new Node();n.frequency=new Param();n.start=()=>{};n.stop=()=>{n.onended?.()};return n}createBiquadFilter(){const n=new Node();n.frequency=new Param();n.Q=new Param();return n}
  addEventListener(t,fn){this.listeners[t]=fn}resume(){this.resumeCalls++;this.state='running';this.listeners.statechange?.();return Promise.resolve()}
}
class FakeAudio{
  static instances=[];
  constructor(src=''){this.src=src;this.preload='';this.playsInline=false;this.loop=false;this.volume=1;this.playbackRate=1;this.paused=true;this.currentTime=0;this.playCalls=0;FakeAudio.instances.push(this)}
  setAttribute(){}pause(){this.paused=true}play(){this.paused=false;this.playCalls++;return Promise.resolve()}
}
class FakeBlob{constructor(parts,opts){this.parts=parts;this.type=opts?.type||''}}
const source=fs.readFileSync(path.join(__dirname,'..','knot-audio.js'),'utf8');
function makeEngine(windowStub){const documentStub={hidden:false,addEventListener(){}};return new Function('window','document','setInterval','clearInterval','setTimeout','clearTimeout',`${source}\nreturn KnotAudio;`)(windowStub,documentStub,()=>1,()=>{},fn=>{fn();return 1},()=>{})}
(async()=>{
  const web=makeEngine({AudioContext:FakeAudioContext,Audio:FakeAudio,Blob:FakeBlob,URL:{createObjectURL:()=> 'blob:web'},navigator:{userAgent:'Android Chrome',platform:'Linux',maxTouchPoints:5},addEventListener(){}});
  const audio=web.create('run',()=>({sound:true,music:false}),()=>.1);assert(audio);assert.equal(audio.kind,'webaudio');audio.tone(440,.1,'sine',.03);const ready=await audio.unlock();assert.equal(ready,true);assert.equal(audio.ctx.resumeCalls,1);assert(audio.ctx.oscillators>0);assert.equal(typeof audio.ctx.createStereoPanner,'undefined');

  FakeAudio.instances=[];let blobId=0;
  const ios=makeEngine({Audio:FakeAudio,Blob:FakeBlob,URL:{createObjectURL:b=>`blob:ios-${++blobId}`},navigator:{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X)',platform:'iPhone',maxTouchPoints:5},addEventListener(){}});
  assert.equal(ios.isiOS(),true);const media=ios.create('atlas',()=>({sound:true,music:true}),()=>.2);assert(media);assert.equal(media.kind,'media','iOS must bypass AudioContext entirely');assert.equal(FakeAudio.instances.length,5,'media backend should create one ambient voice and four reusable effects');assert(FakeAudio.instances.every(a=>a.src.startsWith('blob:ios-')),'iOS audio must be self-contained blob media, not network files');const mediaReady=await media.unlock();assert.equal(mediaReady,true);assert(FakeAudio.instances.some(a=>a.loop&&a.playCalls>0),'ambient media must start from the activation gesture');media.thread(2);media.chord(true,false,1);assert(FakeAudio.instances.reduce((s,a)=>s+a.playCalls,0)>5,'effects should remain playable after unlock');
  console.log('Web Audio plus self-contained iOS media fallback passed.');
})().catch(e=>{console.error(e);process.exit(1)});
