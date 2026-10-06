'use strict';
let soundtrack=null;
function initAudio(){if(soundtrack)return;soundtrack=KnotAudio.create('atlas',()=>({sound:soundOn,music:musicOn}),()=>mood);if(soundtrack)audioCtx=soundtrack.ctx}
function tone(f,d=.12,type='sine',vol=.03,at=0,detune=0){if(soundtrack)soundtrack.tone(f,d,type,vol,at)}
function textureNoise(vol=.004,at=0,bright=false,d=.05){if(soundtrack)soundtrack.texture(vol,at,bright,d)}
function threadSound(step=0){if(soundtrack)soundtrack.thread(step)}
function ensureMusic(){if(soundtrack)soundtrack.start()}
function stopMusic(){if(soundtrack)soundtrack.stop()}
function chord(big=false,variant=0){if(soundtrack)soundtrack.chord(big,false,variant)}
function nudgeMood(v){mood=Math.min(1,mood+v);document.documentElement.style.setProperty('--hueShift',Math.round(mood*24)+'deg')}
function unlockAudioOnce(){
  initAudio();
  const ready=audioCtx&&audioCtx.state==='suspended'?audioCtx.resume():Promise.resolve();
  Promise.resolve(ready).then(()=>{if(audioCtx&&musicOn)ensureMusic()}).catch(()=>{});
  document.removeEventListener('pointerdown',unlockAudioOnce,true);
  document.removeEventListener('touchend',unlockAudioOnce,true);
}
document.addEventListener('pointerdown',unlockAudioOnce,{capture:true,once:true});
document.addEventListener('touchend',unlockAudioOnce,{capture:true,once:true});
$('#atlasBtn').onclick=()=>{if(finishTimer)return;showAtlas()};$('#restartBtn').onclick=()=>currentMap?startMap(currentMap.id,!!(rivalChallenge&&rivalChallenge.mapId===currentMap.id)):showAtlas();$('#soundBtn').onclick=()=>{soundOn=!soundOn;const b=$('#soundBtn');b.setAttribute('aria-pressed',String(soundOn));b.classList.toggle('is-off',!soundOn);b.title=soundOn?'Som ligado':'Som desligado';initAudio();if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});if(soundOn)tone(320,.08,'sine',.018)};$('#musicBtn').onclick=()=>{musicOn=!musicOn;const b=$('#musicBtn');b.setAttribute('aria-pressed',String(musicOn));b.classList.toggle('is-off',!musicOn);b.title=musicOn?'Música ligada':'Música desligada';initAudio();if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});if(musicOn)ensureMusic();else stopMusic()};showAtlas();drawGrid();
