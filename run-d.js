'use strict';
function masteryEarned(rd){return state.score>=rd.mastery&&requirementMet(rd)}
let sheetMode='normal',draftPending=false,audioPrimed=false;
function configQuery(cfg=runConfig){return{diff:cfg.difficulty,rounds:cfg.rounds,geom:cfg.geometry,nodes:cfg.nodes,obj:cfg.objectives}}
function currentRunUrl(extra={}){return knotShareUrl('run.html',{seed:runSeed,...configQuery(),...extra})}
function runConfigSummary(cfg=runConfig){
  const d={easy:'Fácil',moderate:'Moderada',hard:'Difícil'}[cfg.difficulty]||cfg.difficulty,
        g={radial:'Radial',symmetric:'Simétrica',axis:'Eixos',mixed:'Mista'}[cfg.geometry]||cfg.geometry,
        o={balanced:'Balanceada',loop:'Loops',cross:'Crosses',echo:'Echoes'}[cfg.objectives]||cfg.objectives;
  return `${d} · ${cfg.rounds} rodadas · ${g} · ${cfg.nodes==='mixed'?'pontos mistos':cfg.nodes+' pontos'} · ${o}`
}
function endRound(){
  const rd=runPlan[state.round];state.ended=true;
  const passed=state.score>=rd.target&&requirementMet(rd),mastered=masteryEarned(rd),challenge=!!rd.directive&&goalMet(rd.directive);
  if(passed){
    runTotalScore+=state.score;
    Object.keys(runSources).forEach(k=>runSources[k]+=state.sources[k]||0);
    Object.entries(state.engineHits||{}).forEach(([id,n])=>runEngineHits[id]=(runEngineHits[id]||0)+n)
  }
  if(passed&&challenge){runChallenges++;runFocus++;toast('FOCUS +1',true);haptic(14);nudgeMood(.18)}
  if(mastered){runMasteries++;runReweaves=Math.min(2,runReweaves+1);toast('MAESTRIA',true);haptic(22);nudgeMood(.28)}
  if(passed){if(state.round===runPlan.length-1)showWin();else showDraft(mastered,challenge)}else showFail()
}
function openSheet(mode='normal'){
  sheetMode=mode;sheetOverlay.classList.remove('hidden');sheet.scrollTop=0;
  const resume=$('#draftResume');if(resume)resume.hidden=true
}
function closeSheet(force=false){
  sheetOverlay.classList.add('hidden');
  const resume=$('#draftResume');if(resume)resume.hidden=!(sheetMode==='draft'&&draftPending&&!force)
}
function sheetToolbar(label='Voltar ao tabuleiro'){return `<div class="sheet-toolbar"><button class="sheet-back" id="sheetBack" type="button">← ${label}</button></div>`}
function wireSheetBack(force=false){const b=$('#sheetBack');if(b)b.onclick=()=>closeSheet(force)}
function showDraft(mastered=false,challenge=false){
  const nextRound=runPlan[state.round+1];draftPending=true;
  let choiceCount=3,choices=buildDraftChoices(nextRound,draftNonce++,choiceCount);
  const renderDraft=()=>{
    const engineRead=Object.entries(state.engineHits||{}).filter(([,n])=>n>0).map(([id,n])=>`${SYNERGY_DEFS[id].name} ×${n}`).join(' · '),
          passRule=nextRound.requirement?`${fmt(nextRound.target)} + ${goalLabel(nextRound.requirement)}`:fmt(nextRound.target),
          optional=nextRound.directive?goalLabel(nextRound.directive):'—';
    sheet.innerHTML=`${sheetToolbar('Ver tabuleiro')}
      <div class="sheet-copy"><div class="drawer-title">Rodada superada${mastered?' · MAESTRIA':''}${challenge?' · DESAFIO':''}</div>
      <h2>Escolha uma regra para explorar.</h2>
      <p>A próxima rodada está revelada, mas o jogo não marca uma opção como “melhor”. Forme uma hipótese e descubra como ela muda sua geometria.</p>
      <div class="draft-meta"><span class="draft-tag">Próxima: <b>${nextRound.title}</b></span><span class="draft-tag">Passar: ${passRule}</span><span class="draft-tag">Desafio: ${optional}</span><span class="draft-tag">Reweave: ${runReweaves}</span><span class="draft-tag">Focus: ${runFocus}</span>${engineRead?`<span class="draft-tag engine-read">Ativou: ${engineRead}</span>`:''}</div>
      <div class="sheet-actions">${runReweaves>0?'<button class="btn" type="button" id="reweave">Reweave</button>':''}${runFocus>0&&choiceCount===3?'<button class="btn" type="button" id="focusBtn">Focus: +1 opção</button>':''}<span class="draft-required">Escolha 1 Knot para continuar</span></div></div>
      <div class="sheet-grid">${choices.map(id=>{const k=knotDefs[id],completed=synergiesCompletedBy(id,state.build),recipe=completed[0];return`<button class="sheet-choice ${recipe?'synergy-ready':''}" type="button" data-knot="${id}"><span class="sym">${k.symbol}</span><b>${k.name}</b><small>${k.school} · ${k.desc}</small>${recipe?`<span class="choice-synergy">Pode fechar ${recipe.name}. O gatilho ainda precisa ser executado na geometria.</span>`:'<span class="choice-synergy">Nova possibilidade para a build.</span>'}</button>`}).join('')}</div>`;
    openSheet('draft');wireSheetBack(false);
    const rw=$('#reweave');if(rw)rw.onclick=()=>{runReweaves--;choices=buildDraftChoices(nextRound,draftNonce++,choiceCount);renderDraft()};
    const fb=$('#focusBtn');if(fb)fb.onclick=()=>{runFocus--;choiceCount=4;const keep=[...choices],expanded=buildDraftChoices(nextRound,draftNonce++,4),extra=expanded.find(id=>!keep.includes(id));choices=extra?[...keep,extra]:expanded.slice(0,4);renderDraft()};
    sheet.querySelectorAll('[data-knot]').forEach(b=>b.addEventListener('click',()=>{
      const completed=synergiesCompletedBy(b.dataset.knot,state.build),build=state.build.concat([b.dataset.knot]);draftPending=false;
      state=freshState(state.round+1,build);closeSheet(true);hint.classList.remove('hide');
      hint.textContent=completed.length?`${completed[0].name} online. Descubra como acioná-la.`:(nextRound.requirement?`${nextRound.title}: cumpra também ${goalLabel(nextRound.requirement)}.`:`${nextRound.title}: leia a geometria e teste sua hipótese.`);
      render();if(completed.length){setTimeout(()=>{toast(`ENGINE · ${completed[0].name}`,true);chord(true);haptic(22)},100);nudgeMood(.38)}else nudgeMood(.2)
    }))
  };renderDraft()
}
function showFail(){
  const rd=runPlan[state.round],scoreOk=state.score>=rd.target,reqOk=requirementMet(rd),reason=scoreOk&&!reqOk?`Você bateu a pontuação, mas faltou ${goalLabel(rd.requirement)}.`:`Você ficou abaixo de ${fmt(rd.target)}. Tente uma leitura diferente do espaço — sem uma rota destacada pelo jogo.`;
  sheet.innerHTML=`${sheetToolbar()}<div class="sheet-copy"><div class="drawer-title">A trama não fechou</div><h2>${fmt(state.score)} / ${fmt(rd.target)}</h2><p>${reason}</p><div class="sheet-actions"><button class="btn strong" id="retry">Repetir rodada</button><button class="btn" id="newrun">Nova seed</button><button class="btn" id="failLab">Laboratório</button></div></div>`;
  openSheet('normal');wireSheetBack(false);$('#retry').onclick=()=>{state=freshState(state.round,state.build);closeSheet(true);hint.classList.remove('hide');render()};$('#newrun').onclick=()=>{runChallengeScore=0;startRun()};$('#failLab').onclick=showLab
}
async function shareRunChallenge(){
  const score=runTotalScore+(state?.ended?0:(state?.score||0)),url=currentRunUrl({beat:score});
  try{
    const out=await knotShareCard({mode:'RUN · DESAFIO',score:fmt(score),scoreLabel:'PONTOS DA RUN',badge:`Seed ${runSeed}`,pts:state?.pts||[],edges:state?.edges||[],title:`Run ${runSeed}`,subtitle:runConfigSummary(),meta:`${runMasteries} Maestrias · ${runChallenges} Desafios`,invite:`Consegue fazer mais que ${fmt(score)} nesta seed?`,url,shareText:`Eu fiz ${fmt(score)} pontos na seed ${runSeed} do KNOT. Consegue fazer mais?`,filename:`KNOT-run-${runSeed}`});
    toast(out.shared?'DESAFIO ENVIADO':out.downloaded?'IMAGEM GERADA':'LINK PRONTO',false)
  }catch(e){try{await navigator.clipboard.writeText(url);toast('LINK COPIADO',false)}catch(_) {toast('SEED '+runSeed,false)}}
}
function showWin(){
  const sourceNames={loop:'Loops',cross:'Crosses',echo:'Echoes',line:'Traços'},topSource=Object.entries(runSources).sort((a,b)=>b[1]-a[1])[0],engines=activeSynergies(state.build),engineUse=Object.entries(runEngineHits).filter(([,n])=>n>0).map(([id,n])=>`${SYNERGY_DEFS[id].name} ×${n}`).join(' · '),beat=runChallengeScore>0?runTotalScore>runChallengeScore:null;
  toast(beat===true?'DESAFIO VENCIDO':'MASTER KNOT',true);nudgeMood(.6);
  sheet.innerHTML=`${sheetToolbar()}<div class="sheet-copy"><div class="drawer-title">Run ${runSeed} completa</div><h2>${fmt(runTotalScore)} pontos.</h2>
  <p>${runConfigSummary()}. ${runChallengeScore?`Desafio recebido: ${fmt(runChallengeScore)} · <b>${beat?'superado':'ainda à frente'}</b>. `:''}Você terminou com ${state.build.length} Knots, ${runMasteries} Maestrias e ${runChallenges} Desafios. Principal motor: <b>${sourceNames[topSource?.[0]]||'—'}</b>.${engines.length?` Engines: <b>${engines.map(e=>e.name).join(' · ')}</b>.`:''}${engineUse?` Ativações: <b>${engineUse}</b>.`:''}</p>
  <div class="sheet-actions"><button class="btn strong" id="shareRun">Compartilhar desafio</button><button class="btn" id="sameSeed">Rejogar seed</button><button class="btn" id="again">Nova seed</button><button class="btn" id="winLab">Laboratório</button></div></div>`;
  openSheet('normal');wireSheetBack(false);$('#shareRun').onclick=shareRunChallenge;$('#sameSeed').onclick=()=>startRun(runSeed,runConfig);$('#again').onclick=()=>{runChallengeScore=0;startRun()};$('#winLab').onclick=showLab
}
function labSelect(id,label,options,value){return `<label class="lab-field"><span>${label}</span><select id="${id}">${options.map(([v,t])=>`<option value="${v}" ${String(value)===String(v)?'selected':''}>${t}</option>`).join('')}</select></label>`}
function showLab(){
  const seedValue=runSeed||Math.floor(1000+Math.random()*900000);
  sheet.innerHTML=`${sheetToolbar()}<div class="sheet-copy lab-copy"><div class="drawer-title">Laboratório de seeds</div><h2>Monte a próxima run.</h2><p>Defina o que importa e deixe o restante aleatório. Seed + configuração reproduzem exatamente a mesma run.</p>
  <div class="lab-grid"><label class="lab-field"><span>Seed</span><div class="seed-row"><input id="labSeed" inputmode="numeric" value="${seedValue}"><button class="btn" id="rollSeed" type="button">Sortear</button></div></label>
  ${labSelect('labDifficulty','Dificuldade',[['random','Aleatória'],['easy','Fácil'],['moderate','Moderada'],['hard','Difícil']],runConfig.difficulty)}
  ${labSelect('labRounds','Rodadas',[['random','Aleatória'],...[4,5,6,7,8,9,10].map(n=>[String(n),String(n)])],runConfig.rounds)}
  ${labSelect('labGeometry','Geometria',[['random','Aleatória'],['mixed','Mista'],['radial','Radial'],['symmetric','Simétrica'],['axis','Mudança de eixos']],runConfig.geometry)}
  ${labSelect('labNodes','Pontos',[['random','Aleatório'],['mixed','Mistos'],['8','8 pontos'],['10','10 pontos']],runConfig.nodes)}
  ${labSelect('labObjectives','Ênfase dos desafios',[['random','Aleatória'],['balanced','Balanceada'],['loop','Loops'],['cross','Crosses'],['echo','Echoes']],runConfig.objectives)}
  </div><div class="sheet-actions"><button class="btn strong" id="labStart">Gerar run</button><button class="btn" id="labChaos">Tudo aleatório</button></div></div>`;
  openSheet('lab');wireSheetBack(false);sheet.scrollTop=0;
  $('#rollSeed').onclick=()=>{$('#labSeed').value=Math.floor(1000+Math.random()*900000)};
  const read=()=>({difficulty:$('#labDifficulty').value,rounds:$('#labRounds').value,geometry:$('#labGeometry').value,nodes:$('#labNodes').value,objectives:$('#labObjectives').value});
  $('#labStart').onclick=()=>{runChallengeScore=0;const seed=Math.max(1,Math.floor(Number($('#labSeed').value)||Math.random()*900000));startRun(seed,read())};
  $('#labChaos').onclick=()=>{runChallengeScore=0;startRun(Math.floor(1000+Math.random()*900000),{difficulty:'random',rounds:'random',geometry:'random',nodes:'random',objectives:'random'})}
}
function startRun(seed,config){
  if(roundEndTimer){clearTimeout(roundEndTimer);roundEndTimer=null}
  runSeed=Number.isInteger(seed)?seed:Math.floor(1000+Math.random()*900000);runConfig=resolveRunConfig(runSeed,config||runConfig||RUN_LAB_DEFAULT);runPlan=buildRun(runSeed,runConfig);
  const url=currentRunUrl(runChallengeScore?{beat:runChallengeScore}:{});try{history.replaceState(null,'',url)}catch(e){}
  runReweaves=1;runFocus=0;runMasteries=0;runChallenges=0;runTotalScore=0;draftNonce=0;runSources={loop:0,cross:0,echo:0,line:0};runEngineHits={};draftPending=false;
  state=freshState(0,[]);closeSheet(true);hint.classList.remove('hide');hint.textContent=runChallengeScore?`Desafio: supere ${fmt(runChallengeScore)} nesta seed.`:'Toque em qualquer ponto para começar.';drawGrid();render();nudgeMood(0);document.documentElement.style.setProperty('--hueShift','0deg')
}
function primeAudio(){
  initAudio();if(!soundtrack)return;
  soundtrack.unlock().then(ready=>{audioPrimed=ready}).catch(()=>{audioPrimed=false});
}
$('#restartBtn').addEventListener('click',()=>{runChallengeScore=0;startRun()});
$('#labBtn').addEventListener('click',showLab);
$('#draftResume').addEventListener('click',()=>{if(draftPending){openSheet('draft');sheet.scrollTop=0}});
$('#soundBtn').addEventListener('click',()=>{soundOn=!soundOn;const b=$('#soundBtn');b.setAttribute('aria-pressed',String(soundOn));b.classList.toggle('is-off',!soundOn);primeAudio();if(soundOn)tone(392,.12,'triangle',.055)});
$('#musicBtn').addEventListener('click',()=>{musicOn=!musicOn;const b=$('#musicBtn');b.setAttribute('aria-pressed',String(musicOn));b.classList.toggle('is-off',!musicOn);primeAudio();if(musicOn)ensureMusic();else stopMusic()});
$('#infoBtn').addEventListener('click',()=>{const open=drawer.classList.toggle('open');$('#infoBtn').setAttribute('aria-expanded',String(open));$('#drawerState').textContent=open?'fechar':'abrir'});
$('#drawerToggle').addEventListener('click',()=>{const open=drawer.classList.toggle('open');$('#infoBtn').setAttribute('aria-expanded',String(open));$('#drawerState').textContent=open?'fechar':'abrir'});
$('#ruleTitle').addEventListener('click',shareRunChallenge);$('#ruleTitle').title='Compartilhar esta seed';
sheetOverlay.addEventListener('click',e=>{if(e.target.classList.contains('sheet-backdrop'))closeSheet(false)});
document.addEventListener('pointerdown',()=>{if(!audioPrimed)primeAudio()},{capture:true});
document.addEventListener('touchstart',()=>{if(!audioPrimed)primeAudio()},{capture:true,passive:true});
const q=new URLSearchParams(location.search),seedQ=Number(q.get('seed')),cfgQ={difficulty:q.get('diff')||RUN_LAB_DEFAULT.difficulty,rounds:q.get('rounds')||RUN_LAB_DEFAULT.rounds,geometry:q.get('geom')||RUN_LAB_DEFAULT.geometry,nodes:q.get('nodes')||RUN_LAB_DEFAULT.nodes,objectives:q.get('obj')||RUN_LAB_DEFAULT.objectives};
runChallengeScore=Math.max(0,Number(q.get('beat'))||0);startRun(Number.isInteger(seedQ)&&seedQ>0?seedQ:undefined,cfgQ);
