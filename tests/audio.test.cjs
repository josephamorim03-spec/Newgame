'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');

class Param{
  constructor(){this.value=0}
  setValueAtTime(value){this.value=value}
  exponentialRampToValueAtTime(value){this.value=value}
  setTargetAtTime(value){this.value=value}
  cancelScheduledValues(){}
}
class Node{
  connect(){return this}
  disconnect(){}
}
class FakeAudioContext{
  constructor(){
    this.state='suspended';this.currentTime=0;this.sampleRate=44100;this.destination=new Node();this.listeners={};this.oscillators=0;this.resumeCalls=0;
  }
  createGain(){const node=new Node();node.gain=new Param();return node}
  createDynamicsCompressor(){const node=new Node();for(const key of ['threshold','knee','ratio','attack','release'])node[key]=new Param();return node}
  createBuffer(channels,length){return{getChannelData(){return new Float32Array(Math.min(length,32))}}}
  createBufferSource(){const node=new Node();node.start=()=>{};node.stop=()=>{node.onended?.()};return node}
  createOscillator(){this.oscillators++;const node=new Node();node.frequency=new Param();node.start=()=>{};node.stop=()=>{node.onended?.()};return node}
  createBiquadFilter(){const node=new Node();node.frequency=new Param();node.Q=new Param();return node}
  addEventListener(type,fn){this.listeners[type]=fn}
  resume(){this.resumeCalls++;this.state='running';this.listeners.statechange?.();return Promise.resolve()}
  suspend(){this.state='suspended';return Promise.resolve()}
}

const source=fs.readFileSync(path.join(__dirname,'..','knot-audio.js'),'utf8');
const documentStub={hidden:false,addEventListener(){}};
const windowStub={AudioContext:FakeAudioContext,addEventListener(){}};
const KnotAudio=new Function('window','document','setInterval','clearInterval',`${source}\nreturn KnotAudio;`)(windowStub,documentStub,()=>1,()=>{});

(async()=>{
  const audio=KnotAudio.create('run',()=>({sound:true,music:false}),()=>.1);
  assert(audio,'audio engine should be created when Web Audio exists');
  audio.tone(440,.1,'sine',.03);
  const ready=await audio.unlock();
  assert.equal(ready,true,'a suspended mobile AudioContext should resume');
  assert.equal(audio.ctx.resumeCalls,1,'concurrent unlocks should share one resume');
  assert(audio.ctx.oscillators>0,'the queued tone should play after unlock');
  assert.equal(typeof audio.ctx.createStereoPanner,'undefined','fixture must exercise the WebView fallback without StereoPanner');
  console.log('Mobile audio unlock and legacy WebView fallback passed.');
})().catch(error=>{console.error(error);process.exit(1)});
