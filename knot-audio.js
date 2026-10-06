'use strict';
// One tonal palette and one audio-clock scheduler for both modes.
const KnotAudio = (() => {
  const scale = [0, 2, 4, 7, 9]; // C major pentatonic: soft, open voicings.
  const frequency = midi => 440 * 2 ** ((midi - 69) / 12);
  function tune(hz) {
    const midi = 69 + 12 * Math.log2(Math.max(1, hz) / 440);
    let best = 60, delta = Infinity;
    for (let n = Math.floor(midi)-6; n <= Math.ceil(midi)+6; n++) {
      if (scale.includes((n % 12 + 12) % 12) && Math.abs(n-midi) < delta) {best=n;delta=Math.abs(n-midi)}
    }
    return frequency(best);
  }
  function create(mode, enabled, energy) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC(), master = ctx.createGain(), music = ctx.createGain(), effects = ctx.createGain(), compressor = ctx.createDynamicsCompressor();
    master.gain.value=.85;music.gain.value=.55;effects.gain.value=.65;
    compressor.threshold.value=-20;compressor.knee.value=18;compressor.ratio.value=3;compressor.attack.value=.006;compressor.release.value=.22;
    music.connect(compressor);effects.connect(compressor);compressor.connect(master);master.connect(ctx.destination);
    const musicVoices = new Set(), voices = new Set();
    const noise = ctx.createBuffer(1,ctx.sampleRate*.12,ctx.sampleRate);
    const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
    let timer=null, next=0, step=0, duckUntil=0, unlockPromise=null;
    const pending=[];
    const beat=60/(mode==='run'?84:72), chords=[[48,55,64,69],[45,52,60,67],[50,57,64,67],[43,50,62,69]];
    function voice(hz,duration,volume,at,bus,type='sine',attack=.008,pan=0) {
      if(voices.size>=64)return;
      const o=ctx.createOscillator(),g=ctx.createGain(),filter=ctx.createBiquadFilter(),p=typeof ctx.createStereoPanner==='function'?ctx.createStereoPanner():ctx.createGain();
      o.type=type;o.frequency.value=hz;filter.type='lowpass';filter.frequency.value=type==='triangle'?1600:2600;if(p.pan)p.pan.value=pan;
      g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),at+attack);g.gain.exponentialRampToValueAtTime(.0001,at+Math.max(duration,attack+.02));
      o.connect(filter);filter.connect(g);g.connect(p);p.connect(bus);voices.add(o);if(bus===music)musicVoices.add(o);
      o.onended=()=>{voices.delete(o);musicVoices.delete(o);o.disconnect();filter.disconnect();g.disconnect();p.disconnect()};o.start(at);o.stop(at+duration+.04);
    }
    function duck() {
      const t=ctx.currentTime;duckUntil=t+.22;
      music.gain.cancelScheduledValues(t);music.gain.setTargetAtTime(.34,t,.025);music.gain.setTargetAtTime(.55,duckUntil,.16);
    }
    function flushPending() {
      if(ctx.state!=='running')return;
      while(pending.length){const play=pending.shift();play()}
    }
    function unlock() {
      if(ctx.state==='running'){
        flushPending();
        if(enabled().music)start();
        return Promise.resolve(true);
      }
      if(unlockPromise)return unlockPromise;
      try{
        const silent=ctx.createBufferSource();
        silent.buffer=ctx.createBuffer(1,1,22050);
        silent.connect(master);silent.start(0);
      }catch(e){}
      unlockPromise=Promise.resolve(ctx.resume()).then(()=>{
        unlockPromise=null;
        const ready=ctx.state==='running';
        if(ready){flushPending();if(enabled().music)start()}
        return ready;
      }).catch(()=>{unlockPromise=null;return false});
      return unlockPromise;
    }
    function tone(hz,d=.12,type='sine',vol=.03,delay=0) {
      if(!enabled().sound)return;
      if(ctx.state!=='running'){
        if(pending.length<16)pending.push(()=>tone(hz,d,type,vol,delay));
        unlock();return;
      }
      duck();voice(tune(hz),Math.max(.06,d),Math.min(.075,vol*1.5),ctx.currentTime+delay,effects,type);
    }
    function texture(vol=.004,delay=0,bright=false,d=.05) {
      if(!enabled().sound)return;
      if(ctx.state!=='running'){
        if(pending.length<16)pending.push(()=>texture(vol,delay,bright,d));
        unlock();return;
      }
      const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),t=ctx.currentTime+delay;
      s.buffer=noise;f.type='bandpass';f.frequency.value=bright?2100:850;f.Q.value=.8;g.gain.setValueAtTime(Math.min(vol,.012),t);g.gain.exponentialRampToValueAtTime(.0001,t+d);
      s.connect(f);f.connect(g);g.connect(effects);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect()};s.start(t);s.stop(t+d+.01);
    }
    function thread(n) {tone(frequency([60,64,67,69,62,67][n%6]),.12,'triangle',.017);texture(.003,0,false,.035)}
    function chord(big=false,soft=false,variant=0) {
      const notes=chords[Math.floor(Math.max(0,step-1)/16)%4];
      notes.forEach((n,i)=>tone(frequency(n+12),big?.48:.3,i===0?'triangle':'sine',soft?.013:big?.024:.018,i*.035));
      if(big)tone(frequency(notes[0]),.55,'sine',.025);
      texture(.003,.02,variant===1,.05);
    }
    function tick() {
      if(ctx.state!=='running'||!enabled().music)return;
      if(next<ctx.currentTime-.1)next=ctx.currentTime+.03;
      while(next<ctx.currentTime+.12){
        const intensity=Math.max(.05,Math.min(1,energy())),bar=Math.floor(step/16),n=step%16,c=chords[bar%4];
        if(n===0){c.forEach((note,i)=>voice(frequency(note),beat*7.7,.040+intensity*.020,next+i*.025,music,'sine',.5,(i-1.5)*.2));voice(frequency(c[0]-12),beat*3,.035,next,music,'sine',.12)}
        const pattern=mode==='run'?[0,3,6,10,12]:[0,6,12];
        if(pattern.includes(n)||(mode==='run'&&intensity>.6&&n===14)){
          const index=[1,2,3,2,1,3,2,0][Math.floor(n/2)%8];
          voice(frequency(c[index]+12),.55,.060+intensity*.030,next,music,'triangle',.012,n%4?-.18:.18);
        }
        step++;next+=beat/2;
      }
    }
    function start(){if(timer||!enabled().music||document.hidden)return;if(ctx.state!=='running'){unlock();return}music.gain.setTargetAtTime(.55,ctx.currentTime,.1);step=Math.ceil(step/16)*16;next=ctx.currentTime+.03;tick();timer=setInterval(tick,25)}
    function stop(){clearInterval(timer);timer=null;const t=ctx.currentTime;music.gain.cancelScheduledValues(t);music.gain.setTargetAtTime(.0001,t,.015);for(const o of musicVoices){try{o.stop(t+.08)}catch{}}}
    const onStateChange=()=>{if(ctx.state==='running'){flushPending();if(enabled().music)start()}};
    if(typeof ctx.addEventListener==='function')ctx.addEventListener('statechange',onStateChange);else ctx.onstatechange=onStateChange;
    document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();ctx.suspend().catch(()=>{})}else unlock()});
    window.addEventListener('pagehide',stop);
    return {ctx,master,tone,texture,thread,chord,start,stop,unlock,get voiceCount(){return voices.size}};
  }
  return {create,tune};
})();
