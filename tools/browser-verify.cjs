const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[];
 await page.addInitScript(()=>{
  window.__soundNotes=0;
  window.__enemyReactions=[];
  document.addEventListener('DOMContentLoaded',()=>{
   const portrait=document.getElementById('anomaly-portrait');
   new MutationObserver(()=>{const reaction=portrait.dataset.reaction;if(reaction)window.__enemyReactions.push(reaction);}).observe(portrait,{attributes:true,attributeFilter:['data-reaction']});
  });
  const native=AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator=function(...args){window.__soundNotes++;return native.apply(this,args);};
 });
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://localhost:4173');
 assert.equal(await page.getByText('01 · OBJETIVO',{exact:true}).count(),1);
 await page.getByRole('button',{name:'Próximo',exact:true}).click();
 assert.equal(await page.getByText('02 · DECISÃO',{exact:true}).count(),1);
 await page.getByRole('button',{name:'Próximo',exact:true}).click();
 assert.equal(await page.getByText('03 · PHASE LOCK',{exact:true}).count(),1);
 await page.getByRole('button',{name:'Próximo',exact:true}).click();
 assert.equal(await page.getByText('04 · PRIMEIRO MOVIMENTO',{exact:true}).count(),1);
 await page.getByRole('button',{name:'Ativar som e começar',exact:true}).click();
 assert.equal(await page.title(),'RING//BREAK — Primeiro contato');
 assert.equal(await page.getByRole('button',{name:'Desativar som',exact:true}).count(),1);
 assert.ok(await page.evaluate(()=>window.__soundNotes>=3),'onboarding gesture primes Web Audio and plays confirmation');
 assert.equal(await page.locator('#board').count(),1);
 assert.equal(await page.locator('#reward-fx').getAttribute('aria-hidden'),'true');
 assert.equal(await page.locator('#reward-fx').evaluate(el=>getComputedStyle(el).pointerEvents),'none');
 assert.ok(await page.getByRole('button',{name:'Girar anel selecionado no sentido horário'}).isVisible());
 const screenshotDir=path.resolve(__dirname,'../../verification');fs.mkdirSync(screenshotDir,{recursive:true});
 async function inspectEnemy(kind){
  assert.equal(await page.locator('#anomaly-portrait').getAttribute('data-kind'),kind);
  await page.locator('#anomaly-portrait').click();
  assert.equal(await page.locator('.enemy-inspector-art svg').count(),1);
  assert.ok(await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(el=>el.id);return new Set(ids).size===ids.length;}),'SVG gradient IDs are unique for portrait and inspector');
  await page.locator('#modal').screenshot({path:path.join(screenshotDir,'enemy-'+kind+'.png')});
  await page.getByRole('button',{name:'Entendi',exact:true}).click();
 }
 await inspectEnemy('needle');
 await page.screenshot({path:path.join(screenshotDir,'mobile.png'),fullPage:true});
 await page.getByRole('button',{name:'Girar anel selecionado no sentido horário'}).tap();
 await page.waitForFunction(()=>document.getElementById('reward-fx').dataset.active==='true');
 await page.screenshot({path:path.join(screenshotDir,'reward-pulse.png'),fullPage:false});
 await page.waitForFunction(()=>!RingGame.getBusy());
 assert.ok(await page.evaluate(()=>window.__soundNotes>=5),'reward audio creates notes after opt-in');
 await page.waitForFunction(()=>document.getElementById('reward-fx').dataset.active==='false');
 await page.getByRole('button',{name:'Desativar som',exact:true}).click();
 const notesBeforeMute=await page.evaluate(()=>window.__soundNotes);
 assert.equal(await page.evaluate(()=>RingGame.getState().turn),1);
 assert.ok(await page.evaluate(()=>RingGame.getState().energy>=10));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 // Canvas touch gesture: tangential clockwise drag on external ring, one step only.
 const session=await context.newCDPSession(page),box=await page.locator('#board').boundingBox();
 const scale=box.width/420,cx=box.x+box.width/2,cy=box.y+box.height/2;
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx,y:cy-166*scale}]});
 await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx+52*scale,y:cy-158*scale}]});
 assert.ok((await page.locator('#feedback').innerText()).includes('Externo'));
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForFunction(()=>!RingGame.getBusy());
 assert.equal(await page.evaluate(()=>RingGame.getState().turn),2);
 assert.equal(await page.evaluate(()=>window.__soundNotes),notesBeforeMute,'muted movements schedule no sound');
 // Refresh resumes deterministic state and atlas.
 const saved=await page.evaluate(()=>RingGame.getState());await page.reload();
 assert.deepEqual(await page.evaluate(()=>RingGame.getState()),saved);
 await page.setViewportSize({width:1440,height:950});
 await page.screenshot({path:path.join(screenshotDir,'desktop.png'),fullPage:true});
 await page.keyboard.press('w');await page.waitForFunction(()=>!RingGame.getBusy());
 assert.equal(await page.evaluate(()=>RingGame.getState().turn),3);
 // Finish a complete mini-run through real controls. Search a winning sequence with
 // the pure engine; playback still uses UI inputs, rewards, restart and persistence.
 await page.getByRole('button',{name:'Opções',exact:true}).click();await page.getByRole('button',{name:'Jogar uma seed'}).click();await page.getByRole('textbox',{name:'Seed',exact:true}).fill('FIRST-LIGHT-2');await page.getByRole('button',{name:'Começar',exact:true}).click();
 const plan=await page.evaluate(()=>{
  const C=RingCore;let s=RingGame.getState(),path=[];
  const preference=['triad','aftertone','counterweight','mesh','reverb','fortress','drive','foretell'];
  for(let i=0;i<150 && !['won','lost'].includes(s.status);i++){
   if(s.status==='draft'){const id=s.offers.slice().sort((a,b)=>preference.indexOf(a)-preference.indexOf(b))[0];s=C.choose(s,id);path.push({type:'choose',id});continue;}
   const moves=[];
   for(let ring=0;ring<3;ring++)for(const direction of[-1,1]){
    const p=C.preview(s,ring,direction);if(!p)continue;
    let score=p.matches.reduce((n,m)=>n+m.base,0)+(s.protocols.includes('counterweight')?p.edges.length*3:0);
    if(s.intent && p.matches.some(m=>m.sector===s.intent.sector))score+=100/Math.max(1,s.intent.count);
    if(s.intent?.kind==='parasite'){
     const remaining=s.locks[s.intent.edge]-(p.edges.includes(s.intent.edge)?1:0);
     if(remaining===0)score+=20/Math.max(1,s.intent.count);
    }
    moves.push({ring,direction,score});
   }
   moves.sort((a,b)=>b.score-a.score);const m=moves[0];s=C.step(s,m.ring,m.direction).state;path.push({type:'move',ring:m.ring,direction:m.direction});
  }return s.status==='won'?path:null;
 });
 assert.ok(plan,'a complete winning mini-run is reachable');
 // Set animation speed to 4x through settings.
 await page.getByRole('button',{name:'Opções',exact:true}).click();await page.locator('[data-action="reduced"]').click();await page.getByRole('button',{name:'Fechar',exact:true}).click();
 const keys=[['a','q'],['s','w'],['d','e']];
 for(const action of plan){
   if(action.type==='move'){await page.keyboard.press(keys[action.ring][action.direction===1?1:0]);await page.waitForFunction(()=>!RingGame.getBusy());}
   else {await page.locator('[data-choice="'+action.id+'"]').click();await inspectEnemy(await page.evaluate(()=>RingCore.ENCOUNTERS[RingGame.getState().encounter].kind));}
 }
 assert.equal(await page.evaluate(()=>RingGame.getState().status),'won');
 const reactions=await page.evaluate(()=>window.__enemyReactions);
 for(const reaction of ['hit','broken'])assert.ok(reactions.includes(reaction),'anomaly responds to '+reaction);
 assert.equal(await page.locator('#anomaly-portrait .enemy-body').evaluate(el=>getComputedStyle(el).animationName),'none','enemy reactions respect reduced motion');
 assert.notEqual(await page.locator('#reward-fx').getAttribute('data-active'),'true','reduced-motion suppresses reward particles');
 assert.ok(await page.getByRole('button',{name:'Tentar a mesma seed'}).isVisible());
 await page.screenshot({path:path.join(screenshotDir,'victory.png'),fullPage:true});
 await page.getByRole('button',{name:'Tentar a mesma seed'}).click();assert.equal(await page.evaluate(()=>RingGame.getState().turn),0);
 await page.getByRole('button',{name:'Modo livre',exact:true}).click();
 assert.equal(await page.locator('#anomaly-portrait').getAttribute('data-kind'),'free');
 await page.getByRole('button',{name:'Opções',exact:true}).click();await page.getByRole('button',{name:'Testar Protocolos'}).click();
 await page.locator('[data-lab="triad"]').click();await page.locator('[data-lab="mesh"]').click();await page.getByRole('button',{name:'Fechar',exact:true}).click();
 assert.deepEqual(await page.evaluate(()=>RingGame.getState().protocols),['triad','mesh']);
 await page.keyboard.press('q');await page.waitForFunction(()=>!RingGame.getBusy());
 const labState=await page.evaluate(()=>RingGame.getState());await page.reload();assert.deepEqual(await page.evaluate(()=>RingGame.getState()),labState);
 await page.setViewportSize({width:320,height:700});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:path.join(screenshotDir,'small-mobile.png'),fullPage:true});
 // Compare the same earned cascade in a run, in the calm laboratory, and with
 // reduced motion. Use the public save format, then real buttons to play.
 const C=require('../src/core.js');
 for(const spec of [
  {seed:'FEEL-3',mode:'run',tier:'2',name:'cascade'},
  {seed:'FEEL-3',mode:'free',tier:'1',name:'cozy'},
  {seed:'FEEL-3',mode:'run',tier:'2',name:'reduced',reduced:true}
 ]){
  const fxContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2}),fxPage=await fxContext.newPage();
  fxPage.on('pageerror',e=>errors.push(e.message));
  await fxPage.addInitScript(({spec,version})=>{
   localStorage.setItem('ring-break-save-0.2',JSON.stringify({version,seed:spec.seed,mode:spec.mode,actions:[]}));
   localStorage.setItem('ring-break-options-0.2',JSON.stringify({sound:false,speed:1,reduced:!!spec.reduced}));
   localStorage.setItem('ring-break-onboarding-0.2',JSON.stringify('done'));
   window.__tiers=[];window.__activeFX=false;
   document.addEventListener('DOMContentLoaded',()=>{
    new MutationObserver(()=>{const tier=document.querySelector('.machine').dataset.reward;if(tier)window.__tiers.push(tier);window.__activeFX ||= document.getElementById('reward-fx').dataset.active==='true';}).observe(document.querySelector('.machine'),{attributes:true,subtree:true,attributeFilter:['data-reward','data-active']});
   });
  },{spec,version:C.VERSION});
  await fxPage.goto('http://localhost:4173');
  await fxPage.getByRole('button',{name:'Girar anel selecionado no sentido horário'}).click();
  if(!spec.reduced){
   await fxPage.waitForFunction(tier=>document.querySelector('.machine').dataset.reward===tier,spec.tier);
   await fxPage.screenshot({path:path.join(screenshotDir,'feel-'+spec.name+'.png')});
  }
  await fxPage.waitForFunction(()=>!RingGame.getBusy());
  assert.ok(await fxPage.evaluate(tier=>window.__tiers.includes(tier),spec.tier),spec.name+' has appropriate reward intensity');
  if(spec.mode==='free')assert.ok(await fxPage.evaluate(()=>window.__tiers.every(tier=>tier==='1')),'laboratory stays gentle during a cascade');
  if(spec.reduced)assert.equal(await fxPage.evaluate(()=>window.__activeFX),false,'reduced motion never starts particles');
  const actual=await fxPage.evaluate(()=>RingGame.getState());
  assert.deepEqual(actual,C.step(C.create(spec.seed,spec.mode),0,1).state,'effects do not change deterministic state');
  await fxPage.waitForFunction(()=>!document.querySelector('.machine').dataset.reward&&document.getElementById('reward-fx').dataset.active!=='true');
  await fxContext.close();
 }
 const offline=await browser.newContext({viewport:{width:390,height:844},offline:true}),filePage=await offline.newPage();
 filePage.on('pageerror',e=>errors.push(e.message));
 await filePage.goto('file://'+path.resolve(__dirname,'../ring-break-standalone.html'));
 if(await filePage.getByRole('button',{name:'Pular',exact:true}).count())await filePage.getByRole('button',{name:'Pular',exact:true}).click();
 assert.equal(await filePage.locator('#anomaly-portrait svg').count(),1,'offline standalone includes the vector assets');
 await filePage.getByRole('button',{name:'Girar anel selecionado no sentido horário'}).click();await filePage.waitForFunction(()=>!RingGame.getBusy());
 assert.equal(await filePage.evaluate(()=>RingGame.getState().turn),1);
 assert.ok(await filePage.evaluate(()=>RingGame.getState().energy>=10));await offline.close();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',mobile:'390×844 and 320×700',desktop:'1440×950',checks:['render','no console errors','no horizontal overflow','button tap','canvas touch drag','keyboard','save and resume','complete mini-run','draft','victory and retry','free mode protocols','offline standalone HTML'],plannedMoves:plan.length,screenshots:screenshotDir},null,2));
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
