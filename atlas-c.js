'use strict';
function initAudio(){
  if(audioCtx)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audioCtx=new AC();
  const comp=audioCtx.createDynamicsCompressor();comp.threshold.value=-23;comp.knee.value=18;comp.ratio.value=2.4;
  masterGain=audioCtx.createGain();musicGain=audioCtx.createGain();fxGain=audioCtx.createGain();
  masterGain.gain.value=.96;musicGain.gain.value=.20;fxGain.gain.value=.48;
  noiseBuffer=audioCtx.createBuffer(1,Math.floor(audioCtx.sampleRate*.35),audioCtx.sampleRate);const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
  musicGain.connect(comp);fxGain.connect(comp);comp.connect(masterGain);masterGain.connect(audioCtx.destination)
}
function tone(f,d=.1,type='sine',vol=.028,at=0,detune=0){
  if(!soundOn||!audioCtx)return;const t=audioCtx.currentTime+at,o=audioCtx.createOscillator(),g=audioCtx.createGain(),filt=audioCtx.createBiquadFilter();
  o.type=type;o.frequency.setValueAtTime(f,t);o.detune.value=detune;filt.type='lowpass';filt.frequency.value=type==='triangle'?1550:2200;
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(filt);filt.connect(g);g.connect(fxGain);o.start(t);o.stop(t+d+.03)
}
function textureNoise(vol=.01,at=0,bright=false,d=.05){
  if(!soundOn||!audioCtx||!noiseBuffer)return;const t=audioCtx.currentTime+at,s=audioCtx.createBufferSource(),bp=audioCtx.createBiquadFilter(),g=audioCtx.createGain();
  s.buffer=noiseBuffer;bp.type='bandpass';bp.frequency.value=bright?2400:900;bp.Q.value=bright?1.4:.8;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(bp);bp.connect(g);g.connect(fxGain);s.start(t);s.stop(t+d+.02)
}
function threadSound(step=0){
  const v=step%3,base=[220,233,207][v];textureNoise(.0045,0,v===1,.042);tone(base,.052,'triangle',.010,0,[-4,3,0][v]);if(v===2)tone(base*1.5,.04,'sine',.004,.016,2)
}
function pad(freq,d=.9,vol=.02,at=0,detune=0){
  if(!musicOn||!audioCtx)return;const t=audioCtx.currentTime+at,g=audioCtx.createGain(),lp=audioCtx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+.30);g.gain.linearRampToValueAtTime(.0001,t+d);
  for(const [type,ratio,dv] of [['triangle',1,detune],['sine',2,detune+3]]){const o=audioCtx.createOscillator();o.type=type;o.frequency.setValueAtTime(freq*ratio,t);o.detune.value=dv;o.connect(lp);o.start(t);o.stop(t+d+.05)}lp.connect(g);g.connect(musicGain)
}
function pluck(f,d=.14,vol=.01,at=0,variant=0){
  if(!musicOn||!audioCtx)return;const t=audioCtx.currentTime+at,o=audioCtx.createOscillator(),g=audioCtx.createGain(),bp=audioCtx.createBiquadFilter();o.type=variant===1?'sine':'triangle';o.frequency.setValueAtTime(f,t);o.detune.value=[-2,3,0][variant%3];bp.type='bandpass';bp.frequency.value=[980,1320,1120][variant%3];bp.Q.value=1;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(bp);bp.connect(g);g.connect(musicGain);o.start(t);o.stop(t+d+.03)
}
function chord(big=false,variant=0){
  const roots=big?[196,220,174]:[233,247,220],root=roots[variant%3],shape=variant===1?[1,1.2,1.5,1.8]:variant===2?[1,1.33,1.5,2]:[1,1.25,1.5,2];
  shape.forEach((m,i)=>tone(root*m,.20+(i*.01),i%2?'sine':'triangle',big?.030:.021,i*.038,[0,2,-2,1][i]||0));textureNoise(big?.007:.003,.02,variant===1,.065)
}
function nudgeMood(v){mood=Math.min(1,mood+v);document.documentElement.style.setProperty('--hueShift',Math.round(mood*24)+'deg')}
function ensureMusic(){if(musicTimer||!musicOn||!audioCtx)return;musicLoop();musicTimer=setInterval(musicLoop,1040)}
function musicLoop(){
  if(!musicOn||!audioCtx)return;
  const chords=[[164,207,247],[174,220,262],[196,247,294],[185,233,277]],ch=chords[currentChord%chords.length],intensity=Math.max(.04,Math.min(1,mood)),pattern=musicStep%3;
  pad(ch[0],1.0,.010+intensity*.009,0,-6);pad(ch[1],.96,.008+intensity*.008,.10,4);pad(ch[2],.92,.007+intensity*.007,.18,-2);
  if(pattern===0)pluck(ch[1]*2,.13,.006+intensity*.004,.14,0);
  else if(pattern===1&&intensity>.28)pluck(ch[0]*2,.12,.005+intensity*.004,.42,1);
  else if(pattern===2&&intensity>.5)pluck(ch[2]*1.5,.11,.005+intensity*.004,.62,2);
  musicStep++;if(musicStep%3===0||intensity>.8)currentChord=(currentChord+1)%chords.length;mood=Math.max(.05,mood*.78)
}
function stopMusic(){if(musicTimer){clearInterval(musicTimer);musicTimer=null}}
let atlasAudioPrimed=false;
function primeAtlasAudio(){
  initAudio();if(!audioCtx)return;
  try{
    if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();g.gain.value=.00001;o.frequency.value=82;o.connect(g);g.connect(masterGain);o.start();o.stop(audioCtx.currentTime+.025);
    if(audioCtx.state==='running'){atlasAudioPrimed=true;if(musicOn)ensureMusic()}else setTimeout(()=>{if(audioCtx&&audioCtx.state==='running'){atlasAudioPrimed=true;if(musicOn)ensureMusic()}},40)
  }catch(e){}
}
document.addEventListener('pointerdown',()=>{if(!atlasAudioPrimed)primeAtlasAudio()},{capture:true});
document.addEventListener('touchstart',()=>{if(!atlasAudioPrimed)primeAtlasAudio()},{capture:true,passive:true});
$('#atlasBtn').onclick=()=>{if(finishTimer)return;showAtlas()};$('#restartBtn').onclick=()=>currentMap?startMap(currentMap.id,!!(rivalChallenge&&rivalChallenge.mapId===currentMap.id)):showAtlas();$('#soundBtn').onclick=()=>{soundOn=!soundOn;const b=$('#soundBtn');b.setAttribute('aria-pressed',String(soundOn));b.classList.toggle('is-off',!soundOn);b.title=soundOn?'Som ligado':'Som desligado';primeAtlasAudio();if(soundOn)tone(392,.12,'triangle',.055)};$('#musicBtn').onclick=()=>{musicOn=!musicOn;const b=$('#musicBtn');b.setAttribute('aria-pressed',String(musicOn));b.classList.toggle('is-off',!musicOn);b.title=musicOn?'Música ligada':'Música desligada';primeAtlasAudio();if(musicOn)ensureMusic();else stopMusic()};showAtlas();drawGrid();const sharedRoute=new URLSearchParams(location.search).get('route');if(sharedRoute){const parsed=parseRouteCode(sharedRoute);if(parsed.ok)startRival(parsed);else{showImportRoute();const input=$('#routeInput');if(input)input.value=sharedRoute}}
