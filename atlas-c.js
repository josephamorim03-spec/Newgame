'use strict';
let soundtrack=null;
function initAudio(){if(soundtrack)return;soundtrack=KnotAudio.create('atlas',()=>({sound:soundOn,music:musicOn}),()=>{const level=mood;mood=Math.max(.05,mood*.94);return level});if(soundtrack){audioCtx=soundtrack.ctx;masterGain=soundtrack.master}}
function tone(f,d=.12,type='sine',vol=.03,at=0,detune=0){if(soundtrack)soundtrack.tone(f,d,type,vol,at)}
function textureNoise(vol=.004,at=0,bright=false,d=.05){if(soundtrack)soundtrack.texture(vol,at,bright,d)}
function threadSound(step=0){if(soundtrack)soundtrack.thread(step)}
function ensureMusic(){if(soundtrack)soundtrack.start()}
function stopMusic(){if(soundtrack)soundtrack.stop()}
function chord(big=false,variant=0){if(soundtrack)soundtrack.chord(big,false,variant)}
function nudgeMood(v){mood=Math.min(1,mood+v);document.documentElement.style.setProperty('--hueShift',Math.round(mood*24)+'deg')}
let atlasAudioPrimed=false;
function primeAtlasAudio(){
  initAudio();if(!soundtrack)return;
  soundtrack.unlock().then(ready=>{atlasAudioPrimed=ready}).catch(()=>{atlasAudioPrimed=false});
}
document.addEventListener('pointerdown',()=>{if(!atlasAudioPrimed)primeAtlasAudio()},{capture:true});
document.addEventListener('touchstart',()=>{if(!atlasAudioPrimed)primeAtlasAudio()},{capture:true,passive:true});
$('#atlasBtn').onclick=()=>{if(finishTimer)return;showAtlas()};$('#restartBtn').onclick=()=>currentMap?startMap(currentMap.id,!!(rivalChallenge&&rivalChallenge.mapId===currentMap.id)):showAtlas();$('#soundBtn').onclick=()=>{soundOn=!soundOn;const b=$('#soundBtn');b.setAttribute('aria-pressed',String(soundOn));b.classList.toggle('is-off',!soundOn);b.title=soundOn?'Som ligado':'Som desligado';primeAtlasAudio();if(soundOn)tone(392,.12,'triangle',.055)};$('#musicBtn').onclick=()=>{musicOn=!musicOn;const b=$('#musicBtn');b.setAttribute('aria-pressed',String(musicOn));b.classList.toggle('is-off',!musicOn);b.title=musicOn?'Música ligada':'Música desligada';primeAtlasAudio();if(musicOn)ensureMusic();else stopMusic()};showAtlas();drawGrid();const sharedRoute=new URLSearchParams(location.search).get('route');if(sharedRoute){const parsed=parseRouteCode(sharedRoute);if(parsed.ok)startRival(parsed);else{showImportRoute();const input=$('#routeInput');if(input)input.value=sharedRoute}}
