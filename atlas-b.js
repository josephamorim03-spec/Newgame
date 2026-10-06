'use strict';
function atlasPreview(fromId,toId){
  if(fromId===null||fromId===toId)return null;const key=edgeKey(fromId,toId);if(state.edges.some(e=>e.key===key))return{blocked:true};
  const a=state.pts[fromId],b=state.pts[toId];let crosses=0,echo=false,closes=false,halo=false,verts=0;
  if(state.edges.length){const pe=state.edges[state.edges.length-1],L=dist(a,b),P=dist(pe.a,pe.b);echo=Math.abs(L-P)/Math.max(L,P)<.075}
  for(const e of state.edges){if([e.from,e.to].includes(fromId)||[e.from,e.to].includes(toId))continue;if(intersect(a,b,e.a,e.b))crosses++}
  const idx=state.path.lastIndexOf(toId);if(idx>=0){const ids=state.path.slice(idx);verts=ids.length;if(verts>=3){closes=true;halo=pointInPoly({x:500,y:500},ids.map(i=>state.pts[i]))}}
  const mirrorPair=currentMap?.id==='mirror'&&computeSymPairs([...state.edges,{from:fromId,to:toId}],currentMap.pts)>(state.symPairs||0);
  const triangle=closes&&verts===3,reuses=state.path.includes(toId);
  let ritualAdvance=false,ritualComplete=false;
  if(currentMap?.id==='ritual'){const tmp={ritualStage:state.ritualStage||0,rituals:state.rituals||0};advanceRitual(tmp,crosses>0,echo,closes);ritualAdvance=tmp.ritualStage!==(state.ritualStage||0)||tmp.rituals>(state.rituals||0);ritualComplete=tmp.rituals>(state.rituals||0)}
  return{crosses,echo,closes,halo,verts,mirrorPair,triangle,reuses,ritualAdvance,ritualComplete}
}
function clearGhost(){ghostTimers.forEach(clearTimeout);ghostTimers=[];if(ghostEl)ghostEl.innerHTML=''}
function routeCode(map,route){return `KNOT|${map.id}@v${map.version||1}|${route.map(i=>i+1).join('-')}`}
function rankData(map,s){
  const safe=(k)=>Number(s?.[k]||0);
  if(map.id==='cross')return{label:'Crosses',primary:safe('crosses'),display:String(safe('crosses'))};
  if(map.id==='echo')return{label:'Echoes',primary:safe('echoes'),display:String(safe('echoes'))};
  if(map.id==='halo')return{label:'Halos',primary:safe('centerLoops'),display:String(safe('centerLoops'))};
  if(map.id==='star')return{label:'Maior Loop',primary:safe('maxVertices'),display:String(safe('maxVertices'))};
  if(map.id==='twin')return{label:'Loops',primary:safe('loops'),display:String(safe('loops'))};
  if(map.id==='clean')return{label:'Loops limpos',primary:safe('cleanLoops'),display:String(safe('cleanLoops'))};
  if(map.id==='master'){const primary=Math.min(safe('crosses')/18,safe('loops')/5);return{label:'Índice mestre',primary,display:Math.round(primary*100)+'%'}}
  if(map.id==='mirror')return{label:'Pares espelhados',primary:safe('symPairs'),display:String(safe('symPairs'))};
  if(map.id==='mosaic')return{label:'Triângulos',primary:safe('triangleLoops'),display:String(safe('triangleLoops'))};
  if(map.id==='ritual')return{label:'Rituais',primary:safe('rituals'),display:String(safe('rituals'))};
  if(map.id==='focus'){const u=safe('uniqueVertices'),valid=u>0&&u<=7,primary=valid?safe('loops')*100-u:0;return{label:'Concentração',primary,display:`${safe('loops')} L / ${u} pontos`}}
  return{label:'Pontos',primary:safe('score'),display:fmt(safe('score'))};
}
function computeSymPairs(edges,pts){
  const mirror={};for(let i=0;i<pts.length;i++){const p=pts[i],tx=1000-p[0],ty=p[1];let best=-1,bd=Infinity;for(let j=0;j<pts.length;j++){const dx=pts[j][0]-tx,dy=pts[j][1]-ty,d=dx*dx+dy*dy;if(d<bd){bd=d;best=j}}mirror[i]=bd<1?best:null}
  const edgeSet=new Set(edges.map(e=>edgeKey(e.from,e.to))),seen=new Set();let pairs=0;
  for(const e of edges){const ma=mirror[e.from],mb=mirror[e.to];if(ma==null||mb==null)continue;const a=edgeKey(e.from,e.to),b=edgeKey(ma,mb);if(a!==b&&edgeSet.has(b)){const pair=[a,b].sort().join('|');if(!seen.has(pair)){seen.add(pair);pairs++}}}
  return pairs;
}
function advanceRitual(s,moveCross,moveEcho,moveLoop){
  if(s.ritualStage===0&&moveCross)s.ritualStage=1;
  else if(s.ritualStage===1&&moveEcho)s.ritualStage=2;
  else if(s.ritualStage===2&&moveLoop){s.rituals++;s.ritualStage=0}
}
function evaluateRoute(map,route){
  if(!map||!Array.isArray(route)||route.length!==map.moves+1)return{ok:false,error:'A rota precisa usar exatamente todos os fios deste mapa.'};
  if(route.some(i=>!Number.isInteger(i)||i<0||i>=map.pts.length))return{ok:false,error:'A rota contém um ponto inválido.'};
  const used=new Set(),edges=[],path=[route[0]],s={score:0,crosses:0,echoes:0,loops:0,cleanLoops:0,centerLoops:0,maxVertices:0,triangleLoops:0,symPairs:0,rituals:0,ritualStage:0,uniqueVertices:1};
  for(const v of route.slice(1)){
    const u=path[path.length-1],k=edgeKey(u,v);if(u===v||used.has(k))return{ok:false,error:'A rota repete uma aresta ou contém um movimento inválido.'};used.add(k);
    const a=map.pts[u],b=map.pts[v],edge={a:{x:a[0],y:a[1]},b:{x:b[0],y:b[1]},from:u,to:v,crossed:false};let gain=0,moveEcho=false,moveCross=false,moveLoop=false;
    if(edges.length){const pe=edges[edges.length-1],L=dist(edge.a,edge.b),P=dist(pe.a,pe.b);if(Math.abs(L-P)/Math.max(L,P)<.075){s.echoes++;gain+=map.echo;moveEcho=true}}
    for(const old of edges){if([old.from,old.to].includes(u)||[old.from,old.to].includes(v))continue;if(intersect(edge.a,edge.b,old.a,old.b)){s.crosses++;edge.crossed=true;old.crossed=true;gain+=map.cross;moveCross=true}}
    edges.push(edge);let idx=-1;for(let i=path.length-1;i>=0;i--)if(path[i]===v){idx=i;break}path.push(v);s.uniqueVertices=new Set(path).size;s.symPairs=computeSymPairs(edges,map.pts);
    if(idx>=0){const ids=path.slice(idx,-1);if(ids.length>=3){const poly=ids.map(i=>({x:map.pts[i][0],y:map.pts[i][1]})),cyc=edges.slice(Math.max(0,edges.length-ids.length));s.loops++;s.maxVertices=Math.max(s.maxVertices,ids.length);if(cyc.every(e=>!e.crossed))s.cleanLoops++;if(ids.length===3)s.triangleLoops++;if(pointInPoly({x:500,y:500},poly))s.centerLoops++;gain+=(280+area(poly)/420)*map.area;moveLoop=true}}
    advanceRitual(s,moveCross,moveEcho,moveLoop);s.score+=gain;
  }
  return{ok:true,state:s};
}
function parseRouteCode(raw){
  const text=String(raw||'').trim();let m=text.match(/^KNOT\|([a-z]+)@v(\d+)\|([0-9-]+)$/i);
  if(!m)m=text.match(/^([a-z]+)@v(\d+):\s*([0-9→>\-\s]+?)(?:\s*·.*)?$/i);
  if(!m)return{ok:false,error:'Código de rota não reconhecido.'};
  const map=MAPS.find(x=>x.id===m[1]);if(!map)return{ok:false,error:'Mapa desconhecido.'};
  if(Number(m[2])!==(map.version||1))return{ok:false,error:`Essa rota é da versão v${m[2]}, mas o mapa atual é v${map.version||1}.`};
  const nums=m[3].split(/[^0-9]+/).filter(Boolean).map(n=>Number(n)-1),result=evaluateRoute(map,nums);
  if(!result.ok)return result;return{ok:true,map,route:nums,state:result.state};
}
function showImportRoute(){
  modal.innerHTML=`<h2>Importar rota</h2><p>Cole um código KNOT. O jogo recalcula a rota localmente; score enviado pelo jogador nunca é confiável.</p><div class="route-import"><textarea id="routeInput" spellcheck="false" placeholder="KNOT|cross@v1|3-5-1-..."></textarea><div class="modal-actions"><button class="btn strong" id="validateRoute">Validar</button><button class="btn" id="backAtlas">Voltar</button></div><div id="routeResult"></div></div>`;
  $('#backAtlas').onclick=showAtlas;$('#validateRoute').onclick=()=>{const parsed=parseRouteCode($('#routeInput').value),out=$('#routeResult');if(!parsed.ok){out.innerHTML=`<div class="route-error">${parsed.error}</div>`;return}const s=parsed.state,cleared=mapProgress(parsed.map.id).medal>=1;out.innerHTML=`<div class="route-valid"><b>Rota válida · ${parsed.map.name}</b><span>${fmt(s.score)} pts · ${s.crosses} Crosses · ${s.echoes} Echoes · ${s.loops} Loops</span>${cleared?'<div class="modal-actions"><button class="btn strong" id="challengeImported">Desafiar marca</button><button class="btn" id="watchImported">Assistir ghost</button></div>':'<span class="route-lock">Vença este mapa uma vez para liberar ghosts e desafios de outras pessoas.</span><button class="btn" id="playImportedMap">Jogar mapa</button>'}</div>`;const ci=$('#challengeImported');if(ci)ci.onclick=()=>startRival(parsed);const wi=$('#watchImported');if(wi)wi.onclick=()=>{currentMap=parsed.map;playGhost(parsed.route)};const pm=$('#playImportedMap');if(pm)pm.onclick=()=>startMap(parsed.map.id)};
}
function startRival(parsed){const rank=rankData(parsed.map,parsed.state);rivalChallenge={mapId:parsed.map.id,score:parsed.state.score,rank:rank.primary,rankDisplay:rank.display,label:rank.label,route:parsed.route};startMap(parsed.map.id,true);hint.classList.remove('hide');hint.textContent=`Rival verificado: ${rank.label} ${rank.display}. Supere a métrica; score desempata.`;render()}
function playGhost(route){
  if(!currentMap||!route||route.length<2)return;
  initAudio();if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});ensureMusic();
  startMap(currentMap.id);state.ended=true;nodesEl.innerHTML='';clearGhost();
  hint.classList.remove('hide');hint.textContent='Replay do seu melhor percurso. Observe a ordem, não apenas o desenho final.';
  for(let i=1;i<route.length;i++){
    const timer=setTimeout(()=>{
      const a=currentMap.pts[route[i-1]],b=currentMap.pts[route[i]];
      ghostEl.querySelectorAll('.ghost-head').forEach(x=>x.remove());
      ghostEl.appendChild(svg('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],class:'ghost-edge'}));
      ghostEl.appendChild(svg('circle',{cx:b[0],cy:b[1],r:13,class:'ghost-head'}));
      tone([220,247,277,330,370,440,494,554,660,740][route[i]%10],.09,'sine',.014);
      if(i===route.length-1){toast('PB REPLAY',false);hint.textContent='Fim do replay. Reinicie para tentar superar essa rota.'}
    },i*380);
    ghostTimers.push(timer);
  }
}
function specialStatus(map,s){
  if(map.id==='mirror')return `${s.symPairs||0} pares`;
  if(map.id==='mosaic')return `${s.triangleLoops||0} triângulos`;
  if(map.id==='ritual'){const next=['Cross','Echo','Loop'][s.ritualStage||0];return `${s.rituals||0} rituais · próximo: ${next}`}
  if(map.id==='focus')return `${s.loops||0} Loops · ${s.uniqueVertices||0} pontos usados`;
  return '';
}
function atlasOnboardingStage(){
  if(!currentMap||currentMap.id!=='first'||state.loops>0)return'done';
  if(state.current===null&&state.moves===0)return'start';
  if(state.moves<2)return'connect';
  return'close';
}
function renderAtlasOnboarding(stage){
  if(stage==='done')return false;
  hint.classList.remove('hide');
  if(stage==='start')hint.innerHTML='<span class="hint-step">1</span><span><b>Toque em um ponto</b><small>qualquer ponto serve</small></span>';
  else if(stage==='connect')hint.innerHTML='<span class="hint-step">2</span><span><b>Ligue outro ponto</b><small>cada linha permanece no mapa</small></span>';
  else hint.innerHTML='<span class="hint-step">3</span><span><b>Volte a um ponto visitado</b><small>feche uma forma para criar um Loop</small></span>';
  return true;
}
function mainTierStatus(gs,featNow){
  if(!gs[0].check(state))return{label:'Passar',text:gs[0].progress(state),level:0};
  if(!gs[1].check(state))return{label:'Prata',text:gs[1].progress(state),level:1};
  if(!gs[2].check(state))return{label:'Ouro',text:gs[2].progress(state),level:2};
  if(!featNow)return{label:'Mestre',text:'falta o Feito lateral',level:3};
  return{label:'Mestre',text:'mapa dominado',level:4,done:true};
}
function render(){
  if(!currentMap)return;
  const pb=mapProgress(currentMap.id).best||0;
  $('#mapChip').textContent=currentMap.name+(pb?' · PB '+fmt(pb):'')+(rivalChallenge&&rivalChallenge.mapId===currentMap.id?' · Rival '+rivalChallenge.rankDisplay:'');
  $('#moveChip').textContent=`${Math.max(0,currentMap.moves-state.moves)} fios${specialStatus(currentMap,state)?' · '+specialStatus(currentMap,state):''}`;
  scoreEl.textContent=fmt(state.score);
  const gs=currentMap.goals,featNow=currentMap.feat.check(state),tier=mainTierStatus(gs,featNow),main=$('#mainGoal'),fg=$('#featGoal');
  main.className='goal main-goal tier-'+tier.level+(tier.done?' done':'');
  main.innerHTML=`${tier.label==='Mestre'?'<svg class="ui-icon" aria-hidden="true"><use href="ui-icons.svg#master"></use></svg> ':''}<b>${tier.label}</b> · ${tier.text}`;
  fg.innerHTML=`<svg class="ui-icon" aria-hidden="true"><use href="ui-icons.svg#feat"></use></svg> <b>Feito</b> · ${currentMap.feat.label}`;
  fg.classList.toggle('done',featNow);
  const ratio=tier.level/4;
  $('#progress').style.width=`${Math.max(ratio*100,Math.min(15,state.moves/currentMap.moves*15))}%`;

  const onboard=atlasOnboardingStage();
  renderAtlasOnboarding(onboard);
  nodesEl.innerHTML='';
  state.pts.forEach(p=>{
    const b=document.createElement('button'),pv=atlasPreview(state.current,p.id);
    const tutorialClass=onboard==='start'?' onboard-start':((onboard==='connect'&&p.id!==state.current&&!(pv&&pv.blocked))?' onboard-next':((onboard==='close'&&pv&&pv.closes)?' onboard-close':''));
    b.className='node'+(p.id===state.current?' active':'')+(state.path.includes(p.id)?' visited':'')+(pv&&pv.blocked?' blocked':'')+tutorialClass;
    b.style.left=(p.x/10)+'%';b.style.top=(p.y/10)+'%';b.type='button';
    b.setAttribute('aria-label',`Ponto ${p.id+1}${pv&&!pv.blocked?(pv.closes?' · fecha Loop':pv.crosses?' · '+pv.crosses+' Cross':''):''}`);
    if(pv&&!pv.blocked&&state.current!==null){
      const badge=document.createElement('span');badge.className='move-preview';
      badge.textContent=currentMap.id==='mirror'&&pv.mirrorPair?'↔':currentMap.id==='mosaic'&&pv.triangle?'△':currentMap.id==='ritual'&&pv.ritualComplete?'✦':currentMap.id==='ritual'&&pv.ritualAdvance?'›':currentMap.id==='focus'&&pv.reuses?'↺':pv.halo?'⊙':pv.closes?'◌'+pv.verts:pv.crosses?'×'+pv.crosses:pv.echo?'∥':'·';
      b.appendChild(badge);
    }
    b.addEventListener('pointerdown',ev=>{ev.preventDefault();pick(p.id)});
    b.addEventListener('click',ev=>{ev.preventDefault();if(ev.detail===0)pick(p.id)});
    nodesEl.appendChild(b);
  });
  loopsEl.innerHTML='';
  state.loopsData.forEach((L,i)=>{const p=svg('polygon',{points:L.map(q=>`${q.x},${q.y}`).join(' '),class:'loop-fill'});p.style.fill=`hsla(${14+i*29},42%,72%,${.12+Math.min(.12,i*.02)})`;loopsEl.appendChild(p)});
  edgesEl.innerHTML='';
  state.edges.forEach(e=>edgesEl.appendChild(svg('line',{x1:e.a.x,y1:e.a.y,x2:e.b.x,y2:e.b.y,class:'edge'+(e.echo?' echo':'')})));
  junctionsEl.innerHTML='';
  state.junctions.forEach(j=>junctionsEl.appendChild(svg('circle',{cx:j.x,cy:j.y,r:10,class:'junction'})));
}
function pick(id){if(!currentMap||state.ended)return;initAudio();if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});ensureMusic();if(state.current===null){state.current=id;state.path=[id];state.uniqueVertices=1;if(currentMap.id!=='first')hint.textContent=currentMap.id==='mirror'?'↔ cria um par espelhado.':currentMap.id==='mosaic'?'△ fecha um triângulo.':currentMap.id==='ritual'?'› avança o Ritual · ✦ completa a sequência.':currentMap.id==='focus'?'↺ reutiliza um ponto já gasto.':'Os símbolos nos pontos mostram o efeito da próxima linha.';softTap();render();return}if(id===state.current)return;const key=edgeKey(state.current,id);if(state.edges.some(e=>e.key===key)){toast('fio já usado');return}connect(state.current,id)}
function connect(u,v){const a=state.pts[u],b=state.pts[v],edge={a,b,from:u,to:v,key:edgeKey(u,v),echo:false,crossed:false};let gain=0,crossNow=0,moveEcho=false,moveLoop=false;if(state.edges.length){const pe=state.edges[state.edges.length-1],L=dist(a,b),P=dist(pe.a,pe.b);if(Math.abs(L-P)/Math.max(L,P)<.075){edge.echo=true;state.echoes++;moveEcho=true;gain+=currentMap.echo;tone(405,.082,'sine',.016,0,-3);tone(608,.12,'sine',.009,.024,4);textureNoise(.0035,.012,true,.04);nudgeMood(.07)}}for(const e of state.edges){if([e.from,e.to].includes(u)||[e.from,e.to].includes(v))continue;const p=intersect(a,b,e.a,e.b);if(p){state.crosses++;crossNow++;edge.crossed=true;e.crossed=true;state.junctions.push(p);gain+=currentMap.cross;spark(p.x,p.y,6,false,(state.moves+crossNow)%2);textureNoise(.007,crossNow*.012,true,.048);tone(492+crossNow*38,.072,'triangle',.020,crossNow*.016,(crossNow%2?3:-3));haptic(8);nudgeMood(.09)}}state.edges.push(edge);state.moves++;const idx=state.path.lastIndexOf(v);state.path.push(v);state.current=v;state.uniqueVertices=new Set(state.path).size;state.symPairs=computeSymPairs(state.edges,currentMap.pts);if(idx>=0){const ids=state.path.slice(idx,-1);if(ids.length>=3){const poly=ids.map(i=>state.pts[i]),cyc=state.edges.slice(Math.max(0,state.edges.length-(ids.length))),clean=cyc.every(e=>!e.crossed),center=pointInPoly({x:500,y:500},poly);state.loops++;state.maxVertices=Math.max(state.maxVertices,ids.length);if(clean)state.cleanLoops++;if(ids.length===3)state.triangleLoops++;if(center)state.centerLoops++;moveLoop=true;let pts=(280+area(poly)/420)*currentMap.area;gain+=pts;state.loopsData.push(poly);bigMoment(poly,pts)}}advanceRitual(state,crossNow>0,moveEcho,moveLoop);const note=[220,247,277,330,370,440,494,554,660,740][v%10];threadSound(state.moves);if(state.moves%4===0)tone(note,.04,'sine',.004,.01,(state.moves%2?2:-2));nudgeMood(.02);state.score+=gain;if(scoreEl.animate)scoreEl.animate([{transform:'scale(1)'},{transform:'scale(1.1)',color:'var(--accent)'},{transform:'scale(1)'}],{duration:260,easing:'ease-out'});checkGoalCelebration();const exhausted=state.moves>=currentMap.moves;if(exhausted)state.ended=true;render();if(!(currentMap.id==='first'&&atlasOnboardingStage()!=='done'))hint.classList.add('hide');if(exhausted){if(finishTimer)clearTimeout(finishTimer);const finishedState=state;finishTimer=setTimeout(()=>{finishTimer=null;if(state===finishedState)finish()},reducedMotion()?40:520)}}
function isBetterObjective(rank,score,p){const prev=p.bestObjective??-Infinity,prevScore=p.bestObjectiveScore??-Infinity;return rank.primary>prev||(rank.primary===prev&&score>prevScore)}
function finish(){
  state.ended=true;
  const rivalActive=rivalChallenge&&rivalChallenge.mapId===currentMap.id,
        currentRank=rankData(currentMap,state),
        rivalWon=!!(rivalActive&&(currentRank.primary>rivalChallenge.rank||(currentRank.primary===rivalChallenge.rank&&state.score>rivalChallenge.score)));
  if(rivalActive){toast(rivalWon?'RIVAL VENCIDO':'RIVAL SOBREVIVEU',rivalWon);haptic(rivalWon?24:10);nudgeMood(rivalWon?.25:.06)}
  const medal=currentMap.goals[2].check(state)?3:currentMap.goals[1].check(state)?2:currentMap.goals[0].check(state)?1:0,
        p=mapProgress(currentMap.id),
        wasMaster=isMasterProgress(p),
        oldBest=p.best||0,
        newBest=state.score>oldBest,
        featNow=currentMap.feat.check(state),
        newFeat=featNow&&!p.feat,
        rank=rankData(currentMap,state),
        newObjective=isBetterObjective(rank,state.score,p);
  p.medal=Math.max(p.medal,medal);
  p.feat=!!(p.feat||featNow);
  const nowMaster=isMasterProgress(p),newMaster=nowMaster&&!wasMaster;
  if(newObjective){p.bestObjective=rank.primary;p.bestObjectiveScore=state.score;p.bestObjectiveDisplay=rank.display;p.bestObjectiveRoute=state.path.slice()}
  if(newMaster&&!state.masterAnnounced){toast('MESTRE',true);haptic(30);nudgeMood(.34)}
  else if(newFeat&&!state.featAnnounced){toast('FEITO',false);haptic(18);nudgeMood(.18)}
  if(newBest){p.best=state.score;p.bestRoute=state.path.slice();toast('NOVO RECORDE',true);haptic(22);nudgeMood(.3)}
  else p.best=Math.max(p.best,state.score);
  const attempt={score:state.score,crosses:state.crosses,echoes:state.echoes,loops:state.loops,cleanLoops:state.cleanLoops,centerLoops:state.centerLoops,maxVertices:state.maxVertices,triangleLoops:state.triangleLoops,symPairs:state.symPairs,rituals:state.rituals,uniqueVertices:state.uniqueVertices,rank:rank.primary,rankDisplay:rank.display};
  p.attempts=[attempt,...(p.attempts||[]).map(x=>typeof x==='number'?{score:x,rank:currentMap.id==='first'?x:0,rankDisplay:currentMap.id==='first'?fmt(x):'legado'}:x)].sort((a,b)=>(b.rank||0)-(a.rank||0)||(b.score||0)-(a.score||0)).slice(0,5);
  profile.maps[currentMap.id]=p;save();
  const cleared=medal>0;
  modalWrap.classList.remove('hidden');
  modal.innerHTML=`<h2>${cleared?'Mapa concluído':'Quase lá'}</h2>
    <p>${currentMap.name} · ${fmt(state.score)} pontos. ${rivalActive?`Rival: ${rivalChallenge.label} ${rivalChallenge.rankDisplay} · ${rivalWon?'vencido':'ainda à frente'}. `:''}${cleared?'Continue voltando ao mapa para subir até Mestre e completar o Feito lateral.':'O mapa libera a progressão quando a primeira meta for cumprida.'}</p>
    <div class="summary-grid">
      <div class="summary-card"><b>${currentMap.goals[0].check(state)?'✓':'—'}</b><span>${currentMap.goals[0].label}</span></div>
      <div class="summary-card"><b>${currentMap.goals[1].check(state)?'✓':'—'}</b><span>${currentMap.goals[1].label}</span></div>
      <div class="summary-card"><b>${currentMap.goals[2].check(state)?'✓':'—'}</b><span>${currentMap.goals[2].label}</span></div>
      <div class="summary-card master-summary ${nowMaster?'done':''}"><b><svg class="ui-icon" aria-hidden="true"><use href="ui-icons.svg#master"></use></svg>${nowMaster?' ✓':''}</b><span>Mestre · Ouro + Feito</span></div>
      <div class="summary-card feat-summary ${p.feat?'done':''}"><b><svg class="ui-icon" aria-hidden="true"><use href="ui-icons.svg#feat"></use></svg>${p.feat?' ✓':''}</b><span>Feito · ${currentMap.feat.label}</span></div>
    </div>
    <div class="modal-actions"><button class="btn strong" id="retry">Jogar novamente</button><button class="btn" id="atlas">Atlas</button><button class="btn" id="rank">Ranking</button>${p.bestRoute?'<button class="btn" id="ghostBtn">Rever PB</button><button class="btn" id="shareBtn">Compartilhar PB</button>':''}</div>`;
  $('#retry').onclick=()=>startMap(currentMap.id,!!rivalActive);$('#atlas').onclick=showAtlas;$('#rank').onclick=showRank;
  const gh=$('#ghostBtn');if(gh)gh.onclick=()=>playGhost(p.bestRoute);
  const sh=$('#shareBtn');if(sh)sh.onclick=async()=>{const code=routeCode(currentMap,p.bestRoute);try{await navigator.clipboard.writeText(code);toast('CÓDIGO COPIADO',false)}catch(e){toast(code,false)}};
}
function showRank(){const p=mapProgress(currentMap.id),rankRoute=p.bestObjectiveRoute||p.bestRoute||[],route=rankRoute.map(i=>i+1).join('→'),label=rankData(currentMap,{}).label;modal.innerHTML=`<h2>Ranking · ${currentMap.name}</h2><p>Este mapa ranqueia primeiro por <b>${label}</b>; score é o desempate. No servidor futuro, ambos serão recalculados a partir da rota.</p><div class="rank-list">${(p.attempts||[]).map((a,i)=>{const x=typeof a==='number'?{score:a,rankDisplay:currentMap.id==='first'?fmt(a):'legado'}:a;return`<div class="rank-row"><span>${i+1}. Você · ${label} ${x.rankDisplay??'—'}</span><b>${fmt(x.score||0)} pts</b></div>`}).join('')||'<div class="rank-row"><span>Sem tentativas</span><b>—</b></div>'}${route?`<div class="rank-row"><span>Rota do melhor ${label}</span><b>${route}</b></div>`:''}</div><div class="modal-actions"><button class="btn strong" id="again">Jogar mapa</button>${route?'<button class="btn" id="ghostRank">Ver ghost</button><button class="btn" id="copyRoute">Copiar rota</button>':''}<button class="btn" id="atlas2">Atlas</button></div>`;$('#again').onclick=()=>startMap(currentMap.id);$('#atlas2').onclick=showAtlas;const gr=$('#ghostRank');if(gr)gr.onclick=()=>playGhost(rankRoute);const cp=$('#copyRoute');if(cp)cp.onclick=async()=>{try{await navigator.clipboard.writeText(routeCode(currentMap,rankRoute));toast('ROTA COPIADA',false)}catch(e){toast('ROTA '+route,false)}}}
function bigMoment(poly,pts){
  const c={x:poly.reduce((s,p)=>s+p.x,0)/poly.length,y:poly.reduce((s,p)=>s+p.y,0)/poly.length},variant=(state.loops+Math.round(pts))%3,p=svg('circle',{cx:c.x,cy:c.y,r:18,class:'pulse pulse-v'+variant});
  pulsesEl.appendChild(p);setTimeout(()=>p.remove(),820);const huge=pts>1200;
  toast(huge?'GRANDE LOOP':'LOOP',huge,variant);spark(c.x,c.y,huge?18:9,huge,variant);ribbonToScore(c.x,c.y,variant);chord(huge,variant);
  if(huge&&!reducedMotion())flash(variant);haptic(huge?18:10);nudgeMood(huge?.28:.15)
}
function reducedMotion(){return typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches}
function boardPoint(x,y){const r=$('#playfield').getBoundingClientRect(),b=$('#board').getBoundingClientRect();return{x:x/1000*r.width+r.left-b.left,y:y/1000*r.height+r.top-b.top}}
function spark(x,y,n=6,big=false,variant=0){
  const p=boardPoint(x,y);for(let i=0;i<n;i++){const e=document.createElement('i'),kind=big?(['petal','thread','spark'][(i+variant)%3]):(['spark','thread','spark'][(i+variant)%3]);e.className='particle '+kind+' fx-v'+variant;e.style.left=p.x+'px';e.style.top=p.y+'px';const a=Math.random()*Math.PI*2+variant*.34,d=(big?66:28)+Math.random()*(big?105:44);e.style.setProperty('--dx',Math.cos(a)*d+'px');e.style.setProperty('--dy',Math.sin(a)*d+'px');e.style.setProperty('--rot',(Math.random()*120-60+variant*15)+'deg');e.style.setProperty('--dur',(.44+Math.random()*(big?.50:.28)+variant*.025)+'s');e.style.setProperty('--scale',(.80+Math.random()*.42).toFixed(2));fxEl.appendChild(e);setTimeout(()=>e.remove(),1200)}
}
function ribbonToScore(x,y,variant=0){const from=boardPoint(x,y),s=scoreEl.getBoundingClientRect(),b=$('#board').getBoundingClientRect(),to={x:s.left-b.left+s.width/2,y:s.top-b.top+s.height/2},dx=to.x-from.x,dy=to.y-from.y,len=Math.hypot(dx,dy),rot=Math.atan2(dy,dx)*180/Math.PI,r=document.createElement('i');r.className='ribbon ribbon-v'+variant;r.style.width=len+'px';r.style.setProperty('--x1',from.x+'px');r.style.setProperty('--y1',from.y+'px');r.style.setProperty('--rot',rot+'deg');fxEl.appendChild(r);setTimeout(()=>r.remove(),760)}
function flash(variant=0){const f=document.createElement('div');f.className='bigflash flash-v'+variant;fxEl.appendChild(f);setTimeout(()=>f.remove(),980)}
function toast(t,big=false,variant=0){const e=document.createElement('div');e.className='toast'+(big?' big':'')+' toast-v'+variant;e.textContent=t;fxEl.appendChild(e);setTimeout(()=>e.remove(),950)}
function checkGoalCelebration(){
  if(!currentMap)return;
  if(currentMap.id==='focus'&&state.moves<currentMap.moves)return;
  const gs=currentMap.goals,p=mapProgress(currentMap.id),featNow=currentMap.feat.check(state),goldNow=gs[2].check(state),masterNow=goldNow&&featNow;
  if(masterNow&&!isMasterProgress(p)&&!state.masterAnnounced){
    state.masterAnnounced=true;state.featAnnounced=true;state.goalSeen[2]=true;
    toast('MESTRE',true);haptic(30);nudgeMood(.34);return;
  }
  gs.forEach((g,i)=>{if(!state.goalSeen[i]&&g.check(state)){state.goalSeen[i]=true;toast(i===0?'PASSOU':i===1?'PRATA':'OURO',i===2);haptic(i===2?28:16);nudgeMood(i===2?.24:.12)}});
  if(featNow&&!p.feat&&!state.featAnnounced){state.featAnnounced=true;toast('FEITO',false);haptic(18);nudgeMood(.16)}
}
function haptic(ms){try{navigator.vibrate&&navigator.vibrate(ms)}catch(e){}} function softTap(){threadSound(state?.moves||0);haptic(6);nudgeMood(.03)}
