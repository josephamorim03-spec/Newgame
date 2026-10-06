'use strict';
// KNOT audio: Web Audio where it is reliable; HTMLMediaElement + generated WAV blobs on iOS/iPadOS.
// The iOS path deliberately avoids AudioContext so an installed PWA cannot get stuck on resume().
const KnotAudio = (() => {
  const scale=[0,2,4,7,9],mediaCache=new Map();
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
  function pcmWavURL(left,right,sr=16000){
    const n=Math.min(left.length,right.length),buffer=new ArrayBuffer(44+n*4),view=new DataView(buffer);let o=0;
    const str=s=>{for(let i=0;i<s.length;i++)view.setUint8(o++,s.charCodeAt(i))};
    str('RIFF');view.setUint32(o,36+n*4,true);o+=4;str('WAVEfmt ');view.setUint32(o,16,true);o+=4;view.setUint16(o,1,true);o+=2;view.setUint16(o,2,true);o+=2;view.setUint32(o,sr,true);o+=4;view.setUint32(o,sr*4,true);o+=4;view.setUint16(o,4,true);o+=2;view.setUint16(o,16,true);o+=2;str('data');view.setUint32(o,n*4,true);o+=4;
    for(let i=0;i<n;i++){view.setInt16(o,Math.max(-32767,Math.min(32767,left[i]*32767)),true);o+=2;view.setInt16(o,Math.max(-32767,Math.min(32767,right[i]*32767)),true);o+=2}
    const blob=new window.Blob([buffer],{type:'audio/wav'});return window.URL.createObjectURL(blob)
  }
  function makeBuffer(seconds,sr=16000){return[new Float32Array(Math.ceil(seconds*sr)),new Float32Array(Math.ceil(seconds*sr)),sr]}
  function addNote(buf,start,dur,hz,amp=.1,pan=0,tri=false){
    const [l,r,sr]=buf,i0=Math.floor(start*sr),n=Math.min(Math.floor(dur*sr),l.length-i0);if(n<=0)return;
    const attack=Math.max(1,Math.min(n,Math.floor(Math.min(.08,dur*.22)*sr))),release=Math.max(1,Math.min(n,Math.floor(Math.min(.45,dur*.38)*sr))),lg=Math.sqrt((1-pan)/2),rg=Math.sqrt((1+pan)/2);
    for(let i=0;i<n;i++){const t=i/sr,env=Math.min(1,i/attack,(n-i)/release),base=Math.sin(Math.PI*2*hz*t),wave=tri?base+.03*Math.sin(Math.PI*6*hz*t)+.005*Math.sin(Math.PI*10*hz*t):base,v=wave*env*amp;l[i0+i]+=v*lg;r[i0+i]+=v*rg}
  }
  function addNoise(buf,start,dur,amp=.015,seed=7){
    const [l,r,sr]=buf,i0=Math.floor(start*sr),n=Math.min(Math.floor(dur*sr),l.length-i0);if(n<=0)return;let x=seed|0,prev=0;
    for(let i=0;i<n;i++){x=(x*1664525+1013904223)|0;const raw=((x>>>8)&0xffff)/32768-1;prev=prev*.82+raw*.18;const env=Math.min(1,i/(sr*.008),(n-i)/(sr*.08)),v=prev*env*amp;l[i0+i]+=v*.71;r[i0+i]+=v*.71}
  }
  function normalize(buf,peak=.82){let max=0;for(const ch of [buf[0],buf[1]])for(let i=0;i<ch.length;i++)max=Math.max(max,Math.abs(ch[i]));if(max>peak){const k=peak/max;for(const ch of [buf[0],buf[1]])for(let i=0;i<ch.length;i++)ch[i]*=k}return buf}
  function makeAmbient(mode){
    const bpm=mode==='run'?84:72,beat=60/bpm,bars=4,seconds=bars*4*beat,buf=makeBuffer(seconds),chords=mode==='run'?[[48,55,64,69],[45,52,60,67],[50,57,64,67],[43,50,62,69]]:[[48,55,62,67],[45,52,57,64],[43,50,55,62],[47,54,59,66]];
    for(let bar=0;bar<bars;bar++){const c=chords[bar%4],t0=bar*4*beat;c.forEach((n,j)=>addNote(buf,t0,4*beat,frequency(n),mode==='run'?.046:.040,(j-1.5)*.15,false));addNote(buf,t0,2.2*beat,frequency(c[0]-12),mode==='run'?.044:.034,0,true);const pattern=mode==='run'?[0,.75,1.5,2.5,3.25]:[0,1.5,2.75],melody=[c[1]+12,c[2]+12,c[3]+12,c[2]+12,c[1]+12];pattern.forEach((pos,k)=>addNote(buf,t0+pos*beat,.45*beat,frequency(melody[k%melody.length]),mode==='run'?.072:.052,k%2?-.2:.2,true));addNoise(buf,t0+.04,.11,mode==='run'?.010:.007,bar+13)}
    const fade=Math.floor(buf[2]*.08);for(let i=0;i<fade;i++){const k=i/fade,j=buf[0].length-1-i;buf[0][i]*=k;buf[1][i]*=k;buf[0][j]*=k;buf[1][j]*=k}return pcmWavURL(...normalize(buf))
  }
  function makeFx(kind){
    const spec={tap:[.34,[[0,.18,64,.19,-.1,true],[.035,.18,69,.08,.15,false]],.018],thread:[.42,[[0,.20,57,.13,-.15,true],[.055,.22,64,.10,.18,false]],.026],cross:[.45,[[0,.18,69,.14,-.25,true],[.035,.20,74,.11,.25,false]],.032],reward:[.9,[[0,.55,60,.14,-.22,true],[.045,.58,64,.12,.12,false],[.09,.62,67,.12,.25,false],[.15,.65,72,.11,0,true]],.018]}[kind],buf=makeBuffer(spec[0]);for(const [s,d,n,a,p,t] of spec[1])addNote(buf,s,d,frequency(n),a,p,t);addNoise(buf,0,Math.min(.14,spec[0]),spec[2],kind.length*19);return pcmWavURL(...normalize(buf,.88))
  }
  function mediaAssets(mode){
    if(mediaCache.has(mode))return mediaCache.get(mode);
    const out={music:makeAmbient(mode),tap:makeFx('tap'),thread:makeFx('thread'),cross:makeFx('cross'),reward:makeFx('reward')};mediaCache.set(mode,out);return out
  }

  function createMedia(mode,enabled,energy){
    const AudioCtor=window.Audio;if(typeof AudioCtor!=='function'||typeof window.Blob!=='function'||!window.URL?.createObjectURL)return null;
    const src=mediaAssets(mode),music=new AudioCtor(src.music);music.loop=true;music.preload='auto';music.playsInline=true;music.setAttribute?.('playsinline','');
    const defs={tap:[src.tap,.46],thread:[src.thread,.48],cross:[src.cross,.52],reward:[src.reward,.58]},fx={};
    for(const [name,[url,vol]] of Object.entries(defs)){const el=new AudioCtor(url);el.preload='auto';el.playsInline=true;el.setAttribute?.('playsinline','');el.volume=vol;fx[name]=el}
    let unlocked=false,unlocking=null,musicWanted=false,levelTimer=null,lastFx=0;
    const updateMusic=()=>{const intensity=Math.max(.05,Math.min(1,Number(energy?.())||.05));music.volume=(mode==='run'?.24:.20)+intensity*(mode==='run'?.12:.08)};
    const stopLevel=()=>{if(levelTimer){clearInterval(levelTimer);levelTimer=null}};
    function start(){musicWanted=true;if(!enabled().music)return;updateMusic();if(!unlocked)return;if(music.paused)safePlay(music).catch(()=>{unlocked=false});if(!levelTimer)levelTimer=setInterval(updateMusic,450)}
    function stop(){musicWanted=false;stopLevel();try{music.pause()}catch(e){}}
    function unlock(){
      if(unlocked){if(enabled().music||musicWanted)start();return Promise.resolve(true)}if(unlocking)return unlocking;
      const probes=[],oldMusic=music.volume;music.volume=.0001;
      probes.push(safePlay(music).then(()=>{if(!(enabled().music||musicWanted)){music.pause();music.currentTime=0}}));
      for(const [name,el] of Object.entries(fx)){const old=el.volume;el.volume=.0001;probes.push(safePlay(el).then(()=>{try{el.pause();el.currentTime=0}catch(e){}el.volume=defs[name][1]}).catch(e=>{el.volume=old;throw e}))}
      unlocking=Promise.allSettled(probes).then(results=>{music.volume=oldMusic;unlocking=null;unlocked=results.some(r=>r.status==='fulfilled');if(unlocked&&enabled().music)start();return unlocked}).catch(()=>{unlocking=null;music.volume=oldMusic;return false});return unlocking
    }
    function playFx(name,vol=.04,rate=1){if(!enabled().sound)return;const el=fx[name]||fx.tap,now=Date.now();if(name==='tap'&&now-lastFx<28)return;lastFx=now;try{el.pause();el.currentTime=0;el.playbackRate=Math.max(.78,Math.min(1.32,rate));el.volume=Math.max(.12,Math.min(.68,(defs[name]?.[1]||.46)*(0.7+Math.min(1,vol/.04)*.45)));safePlay(el).catch(()=>{unlocked=false})}catch(e){unlocked=false}}
    function tone(hz,d=.12,type='sine',vol=.03){const pitch=Math.max(.78,Math.min(1.28,tune(hz)/frequency(64)));playFx(type==='triangle'||hz>520?'cross':'tap',vol,pitch)}
    function texture(vol=.004){playFx('thread',Math.max(.012,vol*5),.92)}function thread(n=0){playFx('thread',.025,.90+(n%5)*.045)}function chord(big=false,soft=false,variant=0){playFx('reward',big?.06:soft?.025:.04,.92+(variant%3)*.06)}
    document.addEventListener('visibilitychange',()=>{if(document.hidden){try{music.pause()}catch(e){}stopLevel()}else unlocked=false});window.addEventListener('pagehide',()=>{try{music.pause()}catch(e){}stopLevel()});
    return{kind:'media',ctx:null,master:null,tone,texture,thread,chord,start,stop,unlock,get voiceCount(){return 0},get unlocked(){return unlocked}}
  }

  function createWeb(mode,enabled,energy){
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
    const ctx=new AC(),master=ctx.createGain(),music=ctx.createGain(),effects=ctx.createGain(),compressor=ctx.createDynamicsCompressor();master.gain.value=.88;music.gain.value=.52;effects.gain.value=.68;compressor.threshold.value=-20;compressor.knee.value=18;compressor.ratio.value=3;compressor.attack.value=.006;compressor.release.value=.22;music.connect(compressor);effects.connect(compressor);compressor.connect(master);master.connect(ctx.destination);
    const musicVoices=new Set(),voices=new Set(),noise=ctx.createBuffer(1,ctx.sampleRate*.12,ctx.sampleRate),data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
    let timer=null,next=0,step=0,unlockPromise=null,unlockTimer=null;const pending=[],beat=60/(mode==='run'?84:72),chords=[[48,55,64,69],[45,52,60,67],[50,57,64,67],[43,50,62,69]];
    function voice(hz,duration,volume,at,bus,type='sine',attack=.008,pan=0){if(voices.size>=64)return;const o=ctx.createOscillator(),g=ctx.createGain(),filter=ctx.createBiquadFilter(),p=typeof ctx.createStereoPanner==='function'?ctx.createStereoPanner():ctx.createGain();o.type=type;o.frequency.value=hz;filter.type='lowpass';filter.frequency.value=type==='triangle'?1600:2600;if(p.pan)p.pan.value=pan;g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),at+attack);g.gain.exponentialRampToValueAtTime(.0001,at+Math.max(duration,attack+.02));o.connect(filter);filter.connect(g);g.connect(p);p.connect(bus);voices.add(o);if(bus===music)musicVoices.add(o);o.onended=()=>{voices.delete(o);musicVoices.delete(o);try{o.disconnect();filter.disconnect();g.disconnect();p.disconnect()}catch(e){}};o.start(at);o.stop(at+duration+.04)}
    function duck(){const t=ctx.currentTime;music.gain.cancelScheduledValues(t);music.gain.setTargetAtTime(.32,t,.025);music.gain.setTargetAtTime(.52,t+.22,.16)}function flushPending(){if(ctx.state!=='running')return;while(pending.length)pending.shift()()}
    function unlock(){if(ctx.state==='running'){flushPending();if(enabled().music)start();return Promise.resolve(true)}if(unlockPromise)return unlockPromise;try{const silent=ctx.createBufferSource();silent.buffer=ctx.createBuffer(1,1,22050);silent.connect(master);silent.start(0)}catch(e){}let resolved=false;unlockPromise=new Promise(resolve=>{const finish=value=>{if(resolved)return;resolved=true;if(unlockTimer)clearTimeout(unlockTimer);unlockTimer=null;unlockPromise=null;resolve(value)};unlockTimer=setTimeout(()=>finish(false),800);try{Promise.resolve(ctx.resume()).then(()=>{const ready=ctx.state==='running';if(ready){flushPending();if(enabled().music)start()}finish(ready)}).catch(()=>finish(false))}catch(e){finish(false)}});return unlockPromise}
    function tone(hz,d=.12,type='sine',vol=.03,delay=0){if(!enabled().sound)return;if(ctx.state!=='running'){if(pending.length<16)pending.push(()=>tone(hz,d,type,vol,delay));unlock();return}duck();voice(tune(hz),Math.max(.06,d),Math.min(.09,vol*1.6),ctx.currentTime+delay,effects,type)}
    function texture(vol=.004,delay=0,bright=false,d=.05){if(!enabled().sound)return;if(ctx.state!=='running'){if(pending.length<16)pending.push(()=>texture(vol,delay,bright,d));unlock();return}const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),t=ctx.currentTime+delay;s.buffer=noise;f.type='bandpass';f.frequency.value=bright?2100:850;f.Q.value=.8;g.gain.setValueAtTime(Math.min(vol,.014),t);g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(f);f.connect(g);g.connect(effects);s.onended=()=>{try{s.disconnect();f.disconnect();g.disconnect()}catch(e){}};s.start(t);s.stop(t+d+.01)}
    function thread(n){tone(frequency([60,64,67,69,62,67][n%6]),.12,'triangle',.019);texture(.003,0,false,.035)}function chord(big=false,soft=false,variant=0){const notes=chords[Math.floor(Math.max(0,step-1)/16)%4];notes.forEach((n,i)=>tone(frequency(n+12),big?.48:.3,i===0?'triangle':'sine',soft?.013:big?.027:.019,i*.035));if(big)tone(frequency(notes[0]),.55,'sine',.028);texture(.003,.02,variant===1,.05)}
    function tick(){if(ctx.state!=='running'||!enabled().music)return;if(next<ctx.currentTime-.1)next=ctx.currentTime+.03;while(next<ctx.currentTime+.12){const intensity=Math.max(.05,Math.min(1,energy())),bar=Math.floor(step/16),n=step%16,c=chords[bar%4];if(n===0){c.forEach((note,i)=>voice(frequency(note),beat*7.7,.038+intensity*.018,next+i*.025,music,'sine',.5,(i-1.5)*.2));voice(frequency(c[0]-12),beat*3,.033,next,music,'sine',.12)}const pattern=mode==='run'?[0,3,6,10,12]:[0,6,12];if(pattern.includes(n)||(mode==='run'&&intensity>.6&&n===14)){const index=[1,2,3,2,1,3,2,0][Math.floor(n/2)%8];voice(frequency(c[index]+12),.55,.055+intensity*.026,next,music,'triangle',.012,n%4?-.18:.18)}step++;next+=beat/2}}
    function start(){if(timer||!enabled().music||document.hidden)return;if(ctx.state!=='running'){unlock();return}music.gain.setTargetAtTime(.52,ctx.currentTime,.1);step=Math.ceil(step/16)*16;next=ctx.currentTime+.03;tick();timer=setInterval(tick,25)}function stop(){if(timer){clearInterval(timer);timer=null}const t=ctx.currentTime;music.gain.cancelScheduledValues(t);music.gain.setTargetAtTime(.0001,t,.015);for(const o of [...musicVoices])try{o.stop(t+.08)}catch(e){}}
    const onState=()=>{if(ctx.state==='running'){flushPending();if(enabled().music)start()}};if(typeof ctx.addEventListener==='function')ctx.addEventListener('statechange',onState);else ctx.onstatechange=onState;document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});window.addEventListener('pagehide',stop);return{kind:'webaudio',ctx,master,tone,texture,thread,chord,start,stop,unlock,get voiceCount(){return voices.size},get unlocked(){return ctx.state==='running'}}
  }
  function create(mode,enabled,energy){if(isiOS())return createMedia(mode,enabled,energy)||createWeb(mode,enabled,energy);return createWeb(mode,enabled,energy)||createMedia(mode,enabled,energy)}
  return{create,tune,isiOS};
})();