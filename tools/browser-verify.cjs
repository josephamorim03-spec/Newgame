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
  const native=AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator=function(...args){window.__soundNotes++;return native.apply(this,args);};
 });
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://localhost:4173');
 await page.getByRole('button',{name:'Experimentar',exact:true}).click();
 assert.equal(await page.title(),'RING//BREAK — Primeiro contato');
 assert.equal(await page.locator('#board').count(),1);
 assert.equal(await page.locator('#reward-fx').getAttribute('aria-hidden'),'true');
 assert.equal(await page.locator('#reward-fx').evaluate(el=>getComputedStyle(el).pointerEvents),'none');
 assert.ok(await page.getByRole('button',{name:'Girar anel selecionado no sentido horário'}).isVisible());
 const screenshotDir=path.resolve(__dirname,'../../verification');fs.mkdirSync(screenshotDir,{recursive:true});
 await page.screenshot({path:path.join(screenshotDir,'mobile.png'),fullPage:true});
 await page.getByRole('button',{name:'Ativar som',exact:true}).click();
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
   for(let ring=0;ring<3;ring++)for(const direction of[-1,1]){const p=C.preview(s,ring,direction);if(p)moves.push({ring,direction,score:p.matches.reduce((n,m)=>n+m.base,0)+(s.protocols.includes('counterweight')?p.edges.length*3:0)});}
   moves.sort((a,b)=>b.score-a.score);const m=moves[0];s=C.step(s,m.ring,m.direction).state;path.push({type:'move',ring:m.ring,direction:m.direction});
  }return s.status==='won'?path:null;
 });
 assert.ok(plan,'a complete winning mini-run is reachable');
 // Set animation speed to 4x through settings.
 await page.getByRole('button',{name:'Opções',exact:true}).click();await page.locator('[data-action="reduced"]').click();await page.getByRole('button',{name:'Fechar',exact:true}).click();
 const keys=[['a','q'],['s','w'],['d','e']];
 for(const action of plan){
   if(action.type==='move'){await page.keyboard.press(keys[action.ring][action.direction===1?1:0]);await page.waitForFunction(()=>!RingGame.getBusy());}
   else await page.locator('[data-choice="'+action.id+'"]').click();
 }
 assert.equal(await page.evaluate(()=>RingGame.getState().status),'won');
 assert.notEqual(await page.locator('#reward-fx').getAttribute('data-active'),'true','reduced-motion suppresses reward particles');
 assert.ok(await page.getByRole('button',{name:'Tentar a mesma seed'}).isVisible());
 await page.screenshot({path:path.join(screenshotDir,'victory.png'),fullPage:true});
 await page.getByRole('button',{name:'Tentar a mesma seed'}).click();assert.equal(await page.evaluate(()=>RingGame.getState().turn),0);
 await page.getByRole('button',{name:'Modo livre',exact:true}).click();
 await page.getByRole('button',{name:'Opções',exact:true}).click();await page.getByRole('button',{name:'Testar Protocolos'}).click();
 await page.locator('[data-lab="triad"]').click();await page.locator('[data-lab="mesh"]').click();await page.getByRole('button',{name:'Fechar',exact:true}).click();
 assert.deepEqual(await page.evaluate(()=>RingGame.getState().protocols),['triad','mesh']);
 await page.keyboard.press('q');await page.waitForFunction(()=>!RingGame.getBusy());
 const labState=await page.evaluate(()=>RingGame.getState());await page.reload();assert.deepEqual(await page.evaluate(()=>RingGame.getState()),labState);
 await page.setViewportSize({width:320,height:700});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:path.join(screenshotDir,'small-mobile.png'),fullPage:true});
 const offline=await browser.newContext({viewport:{width:390,height:844},offline:true}),filePage=await offline.newPage();
 filePage.on('pageerror',e=>errors.push(e.message));
 await filePage.goto('file://'+path.resolve(__dirname,'../ring-break-standalone.html'));
 await filePage.getByRole('button',{name:'Experimentar',exact:true}).click();
 await filePage.getByRole('button',{name:'Girar anel selecionado no sentido horário'}).click();await filePage.waitForFunction(()=>!RingGame.getBusy());
 assert.equal(await filePage.evaluate(()=>RingGame.getState().turn),1);
 assert.ok(await filePage.evaluate(()=>RingGame.getState().energy>=10));await offline.close();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',mobile:'390×844 and 320×700',desktop:'1440×950',checks:['render','no console errors','no horizontal overflow','button tap','canvas touch drag','keyboard','save and resume','complete mini-run','draft','victory and retry','free mode protocols','offline standalone HTML'],plannedMoves:plan.length,screenshots:screenshotDir},null,2));
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
