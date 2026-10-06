'use strict';
// Cross-platform audio for KNOT.
// Web Audio keeps the reactive procedural soundtrack on desktop/Android.
// iOS/iPadOS uses real media files because standalone WebKit PWAs can leave
// AudioContext.resume() stalled after background/restore cycles.
const KnotAudio = (() => {
  const scale=[0,2,4,7,9];
  const frequency=midi=>440*2**((midi-69)/12);
  function tune(hz){
    const midi=69+12*Math.log2(Math.max(1,hz)/440);let best=60,delta=Infinity;
    for(let n=Math.floor(midi)-6;n<=Math.ceil(midi)+6;n++)if(scale.includes((n%12+12)%12)&&Math.abs(n-midi)<delta){best=n;delta=Math.abs(n-midi)}
    return frequency(best)
  }
  function isiOS(){
    const n=window.navigator||{},ua=n.userAgent||'',platform=n.platform||'';
    return /iPad|iPhone|iPod/i.test(ua)||(platform==='MacIntel'&&Number(n.maxTouchPoints)>1)
  }
  function safePlay(el){try{const p=el.play();return p&&typeof p.then==='function'?p:Promise.resolve()}catch(e){return Promise.reject(e)}}

  function createMedia(mode,enabled,energy){
    const AudioCtor=window.Audio;if(typeof AudioCtor!=='function')return null;
    const root='audio/';
    const music=new AudioCtor(root+`knot-${mode}-ambient.mp3`);
    music.loop=true;music.preload='auto';music.playsInline=true;music.setAttribute?.('playsinline','');music.setAttribute?.('webkit-playsinline','');
    const defs={tap:['knot-tap.mp3',.46],thread:['knot-thread.mp3',.48],cross:['knot-cross.mp3',.52],reward:['knot-reward.mp3',.58]};
    const fx={};
    for(const [name,[file,vol]] of Object.entries(defs)){
      const el=new AudioCtor(root+file);el.preload='auto';el.playsInline=true;el.setAttribute?.('playsinline','');el.setAttribute?.('webkit-playsinline','');el.volume=vol;fx[name]=el
    }
    let unlocked=false,unlocking=null,musicWanted=false,levelTimer=null,lastFx=0;
    const updateMusic=()=>{const intensity=Math.max(.05,Math.min(1,Number(energy?.())||.05));music.volume=(mode==='run'?.24:.20)+intensity*(mode==='run'?.12:.08)};
    const stopLevel=()=>{if(levelTimer){clearInterval(levelTimer);levelTimer=null}};
    function start(){
      musicWanted=true;if(!enabled().music)return;updateMusic();
      if(!unlocked)return;
      if(music.paused)safePlay(music).catch(()=>{unlocked=false});
      if(!levelTimer)levelTimer=setInterval(updateMusic,450)
    }
    function stop(){musicWanted=false;stopLevel();try{music.pause()}catch(e){}}
    function unlock(){
      if(unlocked){if(enabled().music||musicWanted)start();return Promise.resolve(true)}
      if(unlocking)return unlocking;
      const probes=[],oldMusicVolume=music.volume;music.volume=.0001;
      probes.push(safePlay(music).then(()=>{if(!(enabled().music||musicWanted)){music.pause();music.currentTime=0}}));
      for(const [name,el] of Object.entries(fx)){
        const old=el.volume;el.volume=.0001;
        probes.push(safePlay(el).then(()=>{try{el.pause();el.currentTime=0}catch(e){}el.volume=defs[name][1]}).catch(e=>{el.volume=old;throw e}))
      }
      unlocking=Promise.allSettled(probes).then(results=>{
        music.volume=oldMusicVolume;unlocking=null;unlocked=results.some(r=>r.status==='fulfilled');
        if(unlocked&&enabled().music)start();return unlocked
      }).catch(()=>{unlocking=null;music.volume=oldMusicVolume;return false});
      return unlocking
    }
    function playFx(name,vol=.04,rate=1){
      if(!enabled().sound)return;const el=fx[name]||fx.tap,now=Date.now();if(name==='tap'&&now-lastFx<28)return;lastFx=now;
      try{el.pause();el.currentTime=0;el.playbackRate=Math.max(.78,Math.min(1.32,rate));el.volume=Math.max(.12,Math.min(.68,(defs[name]?.[1]||.46)*(0.7+Math.min(1,vol/.04)*.45)));safePlay(el).catch(()=>{unlocked=false})}catch(e){unlocked=false}
    }
    function tone(hz,d=.12,type='sine',vol=.03){const pitch=Math.max(.78,Math.min(1.28,tune(hz)/frequency(64)));playFx(type==='triangle'||hz>520?'cross':'tap',vol,pitch)}
    function texture(vol=.004){playFx('thread',Math.max(.012,vol*5),.92)}
    function thread(n=0){playFx('thread',.025,.90+(n%5)*.045)}
    function chord(big=false,soft=false,variant=0){playFx('reward',big?.06:soft?.025:.04,.92+(variant%3)*.06)}
    function destroy(){stop();for(const el of Object.values(fx)){try{el.pause();el.removeAttribute?.('src');el.load?.()}catch(e){}}try{music.pause();music.removeAttribute?.('src');music.load?.()}catch(e){}}
    document.addEventListener('visibilitychange',()=>{if(document.hidden){try{music.pause()}catch(e){}stopLevel()}else unlocked=false});
    window.addEventListener('pagehide',()=>{try{music.pause()}catch(e){}stopLevel()});
    return {kind:'media',ctx:null,master:null,tone,texture,thread,chord,start,stop,unlock,destroy,get voiceCount(){return 0},get unlocked(){return unlocked}}
  }

  function createWeb(mode,enabled,energy){
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
    const ctx=new AC(),master=ctx.createGain(),music=ctx.createGain(),effects=ctx.createGain(),compressor=ctx.createDynamicsCompressor();
    master.gain.value=.88;music.gain.value=.52;effects.gain.value=.68;
    compressor.threshold.value=-20;compressor.knee.value=18;compressor.ratio.value=3;compressor.attack.value=.006;compressor.release.value=.22;
    music.connect(compressor);effects.connect(compressor);compressor.connect(master);master.connect(ctx.destination);
    const musicVoices=new Set(),voices=new Set();
    const noise=ctx.createBuffer(1,ctx.sampleRate*.12,ctx.sampleRate),data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
    let timer=null,next=0,step=0,unlockPromise=null,unlockTimer=null;
    const pending=[],beat=60/(mode==='run'?84:72),chords=[[48,55,64,69],[45,52,60,67],[50,57,64,67],[43,50,62,69]];
    function voice(hz,duration,volume,at,bus,type='sine',attack=.008,pan=0){
      if(voices.size>=64)return;const o=ctx.createOscillator(),g=ctx.createGain(),filter=ctx.createBiquadFilter(),p=typeof ctx.createStereoPanner==='function'?ctx.createStereoPanner():ctx.createGain();
      o.type=type;o.frequency.value=hz;filter.type='lowpass';filter.frequency.value=type==='triangle'?1600:2600;if(p.pan)p.pan.value=pan;
      g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),at+attack);g.gain.exponentialRampToValueAtTime(.0001,at+Math.max(duration,attack+.02));
      o.connect(filter);filter.connect(g);g.connect(p);p.connect(bus);voices.add(o);if(bus===music)musicVoices.add(o);
      o.onended=()=>{voices.delete(o);musicVoices.delete(o);try{o.disconnect();filter.disconnect();g.disconnect();p.disconnect()}catch(e){}};o.start(at);o.stop(at+duration+.04)
    }
    function duck(){const t=ctx.currentTime;music.gain.cancelScheduledValues(t);music.gain.setTargetAtTime(.32,t,.025);music.gain.setTargetAtTime(.52,t+.22,.16)}
    function flushPending(){if(ctx.state!=='running')return;while(pending.length)pending.shift()()}
    function unlock(){
      if(ctx.state==='running'){flushPending();if(enabled().music)start();return Promise.resolve(true)}
      if(unlockPromise)return unlockPromise;
      try{const silent=ctx.createBufferSource();silent.buffer=ctx.createBuffer(1,1,22050);silent.connect(master);silent.start(0)}catch(e){}
      let resolved=false;
      const resume=()=>{try{return Promise.resolve(ctx.resume())}catch(e){return Promise.reject(e)}};
      unlockPromise=new Promise(resolve=>{
        const finish=value=>{if(resolved)return;resolved=true;if(unlockTimer)clearTimeout(unlockTimer);unlockTimer=null;unlockPromise=null;resolve(value)};
        unlockTimer=setTimeout(()=>finish(false),800);
        resume().then(()=>{const ready=ctx.state==='running';if(ready){flushPending();if(enabled().music)start()}finish(ready)}).catch(()=>finish(false))
      });
      return unlockPromise
    }
    function tone(hz,d=.12,type='sine',vol=.03,delay=0){if(!enabled().sound)return;if(ctx.state!=='running'){if(pending.length<16)pending.push(()=>tone(hz,d,type,vol,delay));unlock();return}duck();voice(tune(hz),Math.max(.06,d),Math.min(.09,vol*1.6),ctx.currentTime+delay,effects,type)}
    function texture(vol=.004,delay=0,bright=false,d=.05){if(!enabled().sound)return;if(ctx.state!=='running'){if(pending.length<16)pending.push(()=>texture(vol,delay,bright,d));unlock();return}const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),t=ctx.currentTime+delay;s.buffer=noise;f.type='bandpass';f.frequency.value=bright?2100:850;f.Q.value=.8;g.gain.setValueAtTime(Math.min(vol,.014),t);g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(f);f.connect(g);g.connect(effects);s.onended=()=>{try{s.disconnect();f.disconnect();g.disconnect()}catch(e){}};s.start(t);s.stop(t+d+.01)}
    function thread(n){tone(frequency([60,64,67,69,62,67][n%6]),.12,'triangle',.019);texture(.003,0,false,.035)}
    function chord(big=false,soft=false,variant=0){const notes=chords[Math.floor(Math.max(0,step-1)/16)%4];notes.forEach((n,i)=>tone(frequency(n+12),big?.48:.3,i===0?'triangle':'sine',soft?.013:big?.027:.019,i*.035));if(big)tone(frequency(notes[0]),.55,'sine',.028);texture(.003,.02,variant===1,.05)}
    function tick(){if(ctx.state!=='running'||!enabled().music)return;if(next<ctx.currentTime-.1)next=ctx.currentTime+.03;while(next<ctx.currentTime+.12){const intensity=Math.max(.05,Math.min(1,energy())),bar=Math.floor(step/16),n=step%16,c=chords[bar%4];if(n===0){c.forEach((note,i)=>voice(frequency(note),beat*7.7,.038+intensity*.018,next+i*.025,music,'sine',.5,(i-1.5)*.2));voice(frequency(c[0]-12),beat*3,.033,next,music,'sine',.12)}const pattern=mode==='run'?[0,3,6,10,12]:[0,6,12];if(pattern.includes(n)||(mode==='run'&&intensity>.6&&n===14)){const index=[1,2,3,2,1,3,2,0][Math.floor(n/2)%8];voice(frequency(c[index]+12),.55,.055+intensity*.026,next,music,'triangle',.012,n%4?-.18:.18)}step++;next+=beat/2}}
    function start(){if(timer||!enabled().music||document.hidden)return;if(ctx.state!=='running'){unlock();return}music.gain.setTargetAtTime(.52,ctx.currentTime,.1);step=Math.ceil(step/16)*16;next=ctx.currentTime+.03;tick();timer=setInterval(tick,25)}
    function stop(){if(timer){clearInterval(timer);timer=null}const t=ctx.currentTime;music.gain.cancelScheduledValues(t);music.gain.setTargetAtTime(.0001,t,.015);for(const o of [...musicVoices])try{o.stop(t+.08)}catch(e){}}
    function destroy(){stop();try{ctx.close()}catch(e){}}
    const onState=()=>{if(ctx.state==='running'){flushPending();if(enabled().music)start()}};if(typeof ctx.addEventListener==='function')ctx.addEventListener('statechange',onState);else ctx.onstatechange=onState;
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});window.addEventListener('pagehide',stop);
    return{kind:'webaudio',ctx,master,tone,texture,thread,chord,start,stop,unlock,destroy,get voiceCount(){return voices.size},get unlocked(){return ctx.state==='running'}}
  }

  function create(mode,enabled,energy){
    if(isiOS())return createMedia(mode,enabled,energy)||createWeb(mode,enabled,energy);
    return createWeb(mode,enabled,energy)||createMedia(mode,enabled,energy)
  }
  return{create,tune,isiOS};
})();