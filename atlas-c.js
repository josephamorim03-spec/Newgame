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
modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Atlas');modal.tabIndex=-1;
function primeAtlasAudio(){
  initAudio();if(!soundtrack)return Promise.resolve(false);
  return soundtrack.unlock().then(ready=>{atlasAudioPrimed=ready;setAtlasAudioReadyUI(ready);return ready}).catch(()=>{atlasAudioPrimed=false;setAtlasAudioReadyUI(false);return false});
}
function setAtlasAudioReadyUI(ready){['#soundBtn','#musicBtn'].forEach(id=>$(id).classList.toggle('needs-unlock',!ready));if(!ready){$('#soundBtn').title='Toque para ativar o som';$('#musicBtn').title='Toque para ativar a música'}}
function syncAtlasAudioButton(id,on,label){const b=$(id),feminine=label==='Música';b.setAttribute('aria-pressed',String(on));b.classList.toggle('is-off',!on);b.title=`${label} ${on?'ligad':'desligad'}${feminine?'a':'o'}`}
setAtlasAudioReadyUI(false);
const primeAtlasFromPlayGesture=event=>{const control=event.target.closest?.('#soundBtn,#musicBtn');if(!atlasAudioPrimed&&!control)primeAtlasAudio()};
document.addEventListener('pointerdown',primeAtlasFromPlayGesture,{capture:true});
document.addEventListener('touchstart',primeAtlasFromPlayGesture,{capture:true,passive:true});
modalWrap.addEventListener('click',event=>{if(currentMap&&event.target.classList.contains('backdrop'))modalWrap.classList.add('hidden')});
document.addEventListener('keydown',event=>{if(currentMap&&event.key==='Escape'&&!modalWrap.classList.contains('hidden'))modalWrap.classList.add('hidden')});
$('#atlasBtn').onclick=()=>{if(finishTimer)return;showAtlas()};$('#restartBtn').onclick=()=>currentMap?startMap(currentMap.id,!!(rivalChallenge&&rivalChallenge.mapId===currentMap.id)):showAtlas();$('#soundBtn').onclick=async()=>{if(!atlasAudioPrimed){soundOn=true;syncAtlasAudioButton('#soundBtn',true,'Som');if(await primeAtlasAudio())tone(392,.12,'triangle',.055);return}soundOn=!soundOn;syncAtlasAudioButton('#soundBtn',soundOn,'Som');if(soundOn)tone(392,.12,'triangle',.055)};$('#musicBtn').onclick=async()=>{if(!atlasAudioPrimed){musicOn=true;syncAtlasAudioButton('#musicBtn',true,'Música');if(await primeAtlasAudio()){ensureMusic();if(soundOn)tone(523,.12,'sine',.035)}return}musicOn=!musicOn;syncAtlasAudioButton('#musicBtn',musicOn,'Música');if(musicOn)ensureMusic();else stopMusic()};showAtlas();drawGrid();const sharedRoute=new URLSearchParams(location.search).get('route');if(sharedRoute){const parsed=parseRouteCode(sharedRoute);if(parsed.ok)startRival(parsed);else{showImportRoute();const input=$('#routeInput');if(input)input.value=sharedRoute}}
