'use strict';
let runSeed=0,runPlan=[],runSchools=[],runReweaves=1,runFocus=0,runMasteries=0,runChallenges=0,runTotalScore=0,runChallengeScore=0,draftNonce=0,runSources={loop:0,cross:0,echo:0,line:0},runEngineHits={},runConfig={...RUN_LAB_DEFAULT};
let state,roundEndTimer=null;let soundOn=true,musicOn=true;let audioCtx,masterGain,musicGain,fxGain,compressor,noiseBuffer,musicTimer=null,musicStep=0,moodEnergy=0,currentChord=0;
function freshState(round=0,build=[]){const rd=runPlan[round];return{round,build:[...build],score:0,loopCount:0,crosses:0,echoes:0,centerHits:0,cleanLoops:0,maxLoopVertices:0,centerLoops:0,triangleLoops:0,symPairs:0,moves:0,current:null,path:[],edges:[],loops:[],junctions:[],log:[],ended:false,nextLoopMult:1,directiveAnnounced:false,requirementAnnounced:false,sources:{loop:0,cross:0,echo:0,line:0},engineHits:{},celebrationHold:0,pts:rd.layout.map((p,i)=>({id:i,x:p[0],y:p[1]}))}}
let soundtrack=null;
function initAudio(){if(soundtrack)return;soundtrack=KnotAudio.create('run',()=>({sound:soundOn,music:musicOn}),()=>{const level=moodEnergy;moodEnergy=Math.max(.05,moodEnergy*.94);return level});if(soundtrack){audioCtx=soundtrack.ctx;masterGain=soundtrack.master}}
function tone(f,d=.12,type='sine',vol=.03,at=0,detune=0){if(soundtrack)soundtrack.tone(f,d,type,vol,at)}
function textureNoise(vol=.004,at=0,bright=false,d=.05){if(soundtrack)soundtrack.texture(vol,at,bright,d)}
function threadSound(step=0){if(soundtrack)soundtrack.thread(step)}
function ensureMusic(){if(soundtrack)soundtrack.start()}
function stopMusic(){if(soundtrack)soundtrack.stop()}
function nudgeMood(v){moodEnergy=Math.min(1,moodEnergy+v);document.documentElement.style.setProperty('--hueShift',`${Math.round(moodEnergy*24)}deg`)}
function svg(tag,attrs){const el=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));return el}
function fmt(n){return Math.round(n).toLocaleString('pt-BR')} function edgeKey(a,b){return a<b?`${a}-${b}`:`${b}-${a}`} function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function polyArea(ps){let s=0;for(let i=0;i<ps.length;i++){const p=ps[i],q=ps[(i+1)%ps.length];s+=p.x*q.y-q.x*p.y}return s/2}
function distToCenterSegment(a,b){const cx=500,cy=500,abx=b.x-a.x,aby=b.y-a.y,ab2=abx*abx+aby*aby;if(ab2===0)return Math.hypot(a.x-cx,a.y-cy);let t=((cx-a.x)*abx+(cy-a.y)*aby)/ab2;t=Math.max(0,Math.min(1,t));const px=a.x+t*abx,py=a.y+t*aby;return Math.hypot(px-cx,py-cy)}
function computeRunSymPairs(edges,pts){const mirror={};for(let i=0;i<pts.length;i++){const p=pts[i],tx=1000-p.x,ty=p.y;let best=-1,bd=Infinity;for(let j=0;j<pts.length;j++){const dx=pts[j].x-tx,dy=pts[j].y-ty,d=dx*dx+dy*dy;if(d<bd){bd=d;best=j}}mirror[i]=bd<1?best:null}const set=new Set(edges.map(e=>edgeKey(e.from,e.to))),seen=new Set();let pairs=0;for(const e of edges){const a=edgeKey(e.from,e.to),ma=mirror[e.from],mb=mirror[e.to];if(ma==null||mb==null)continue;const b=edgeKey(ma,mb);if(a!==b&&set.has(b)){const k=[a,b].sort().join('|');if(!seen.has(k)){seen.add(k);pairs++}}}return pairs}
function intersection(a,b,c,d){const den=(a.x-b.x)*(c.y-d.y)-(a.y-b.y)*(c.x-d.x);if(Math.abs(den)<1e-8)return null;const t=((a.x-c.x)*(c.y-d.y)-(a.y-c.y)*(c.x-d.x))/den,u=-((a.x-b.x)*(a.y-c.y)-(a.y-b.y)*(a.x-c.x))/den;if(t>.02&&t<.98&&u>.02&&u<.98)return{x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y)};return null}
function centroid(ps){return{x:ps.reduce((s,p)=>s+p.x,0)/ps.length,y:ps.reduce((s,p)=>s+p.y,0)/ps.length}} function boardRectPoint(x,y){const r=$('#playfield').getBoundingClientRect(),br=$('#board').getBoundingClientRect();return{x:x/1000*r.width+r.left-br.left,y:y/1000*r.height+r.top-br.top}}
function drawGrid(){const g=$('#grid');g.innerHTML='';[160,270,360].forEach(r=>g.appendChild(svg('circle',{cx:500,cy:500,r,class:'grid-ring'})));[0,45,90,135].forEach(a=>{const rad=a*Math.PI/180,dx=Math.cos(rad)*360,dy=Math.sin(rad)*360;g.appendChild(svg('line',{x1:500-dx,y1:500-dy,x2:500+dx,y2:500+dy,class:'grid-rays'}))})}function recordEngine(id){state.engineHits[id]=(state.engineHits[id]||0)+1}
function previewMove(fromId,toId){if(fromId===null||fromId===toId)return null;const key=edgeKey(fromId,toId);if(state.edges.some(e=>e.key===key))return{blocked:true};const a=state.pts[fromId],b=state.pts[toId],rd=runPlan[state.round],len=dist(a,b),prev=state.edges[state.edges.length-1];let crosses=0,echo=false,center=false,closes=false,verts=0;if(prev){const pl=dist(prev.a,prev.b);echo=Math.abs(len-pl)/Math.max(len,pl)<.075}for(const e of state.edges){if(e.from===fromId||e.to===fromId||e.from===toId||e.to===toId)continue;if(intersection(a,b,e.a,e.b))crosses++}center=distToCenterSegment(a,b)<95;const loopIdx=state.path.lastIndexOf(toId);if(loopIdx>=0){verts=state.path.slice(loopIdx).length;closes=verts>=3}const mirrorPair=state.build.includes('reflection')&&computeRunSymPairs([...state.edges,{from:fromId,to:toId}],state.pts)>(state.symPairs||0);const parts=[];if(mirrorPair)parts.push('Espelho');if(closes)parts.push('Loop');if(crosses)parts.push('Cross');if(echo)parts.push('Echo');if(center)parts.push('Centro');if(!parts.length)parts.push('Linha');return{crosses,echo,center,closes,verts,mirrorPair,label:parts.join(' · ')}}
function runOnboardingStage(){
  if(state.round!==0||state.loopCount>0)return'done';
  if(state.current===null&&state.moves===0)return'start';
  if(state.moves<2)return'connect';
  return'close';
}
function renderRunOnboarding(stage){
  if(stage==='done')return false;
  hint.classList.remove('hide');
  if(stage==='start')hint.innerHTML='<span class="hint-step">1</span><span><b>Toque em um ponto</b><small>esse será o início do fio</small></span>';
  else if(stage==='connect')hint.innerHTML='<span class="hint-step">2</span><span><b>Ligue outro ponto</b><small>a linha fica no tabuleiro</small></span>';
  else hint.innerHTML='<span class="hint-step">3</span><span><b>Volte a um ponto visitado</b><small>feche uma forma para pontuar</small></span>';
  return true;
}
function render(){
  const rd=runPlan[state.round];
  $('#roundPill').textContent=`Rodada ${state.round+1}/${runPlan.length}`;
  $('#stitchPill').textContent=`${Math.max(0,rd.moves-state.moves)} fios`;
  $('#targetInline').textContent=`Passa ${fmt(rd.target)}`;
  scoreEl.textContent=fmt(state.score);
  $('#constraintTitle').textContent=rd.title;
  $('#constraintMini').textContent=`Mestre ${fmt(rd.mastery)} · `+rd.text.split('.')[0]+'.';
  $('#ruleTitle').textContent=`${rd.title} · Run ${runSeed}`;
  let rule=`${rd.text} Passa com ${fmt(rd.target)}. Mestre em ${fmt(rd.mastery)}.`;
  if(rd.requirement)rule+=` Para PASSAR também é obrigatório: ${goalLabel(rd.requirement)}.`;
  if(rd.directive)rule+=` Desafio opcional: ${goalLabel(rd.directive)}. Concluir e passar rende 1 Focus para abrir uma 4ª escolha no próximo draft.`;
  $('#constraintText').textContent=rule;
  const scale=rd.mastery;meterEl.style.width=`${Math.min(100,state.score/scale*100)}%`;meterEl.parentElement.style.setProperty('--passPct',`${Math.min(100,rd.target/scale*100)}%`);
  const req=$('#requiredGoal'),dir=$('#directiveGoal');
  req.hidden=!rd.requirement;if(rd.requirement){req.textContent=`OBRIGATÓRIO · ${goalProgress(rd.requirement)}`;req.classList.toggle('done',goalMet(rd.requirement))}
  dir.hidden=!rd.directive;if(rd.directive){dir.textContent=`DESAFIO · ${goalProgress(rd.directive)} → +Focus`;dir.classList.toggle('done',goalMet(rd.directive))}
  $('#loopsStat').textContent=state.loopCount;$('#crossStat').textContent=state.crosses;$('#echoStat').textContent=state.echoes;

  const onboard=runOnboardingStage();
  renderRunOnboarding(onboard);
  KnotFeel.begin(state, nodesEl, [loopsEl, edgesEl, junctionsEl]);
  state.pts.forEach(p=>{
    const b=KnotFeel.node(nodesEl,p.id),pv=previewMove(state.current,p.id);
    const tutorialClass=onboard==='start'?' onboard-start':((onboard==='connect'&&p.id!==state.current&&!(pv&&pv.blocked))?' onboard-next':((onboard==='close'&&pv&&pv.closes)?' onboard-close':''));
    b.className='node'+(p.id===state.current?' active':'')+(state.path.includes(p.id)?' visited':'')+(state.current!==null&&p.id!==state.current?' crosshair':'')+(pv&&pv.blocked?' blocked':'')+tutorialClass+(b.classList.contains('pin-press')?' pin-press':'');
    b.type='button';b.style.left=(p.x/10)+'%';b.style.top=(p.y/10)+'%';
    b.setAttribute('aria-label',`Ponto ${p.id+1}${pv&&!pv.blocked?' · '+pv.label:''}`);
    b.replaceChildren();
    if(pv&&!pv.blocked&&state.current!==null){
      const badge=document.createElement('span');badge.className='move-preview';
      badge.textContent=pv.mirrorPair?'↔':pv.closes?'◌':pv.crosses?'×':pv.echo?'∥':pv.center?'◎':'·';badge.title=pv.label;if(badge.textContent!=='·')b.appendChild(badge);
    }
    b.onpointerenter=()=>{if(onboard==='done'&&pv&&!pv.blocked&&state.current!==null){hint.classList.remove('hide');hint.textContent=pv.label}};
    b.onfocus=()=>{if(onboard==='done'&&pv&&!pv.blocked&&state.current!==null){hint.classList.remove('hide');hint.textContent=pv.label}};
    b.onpointerdown=ev=>{ev.preventDefault();KnotFeel.press(b);pickNode(p.id)};
    b.onclick=ev=>{ev.preventDefault();if(ev.detail===0){KnotFeel.press(b);pickNode(p.id)}};

  });
  KnotFeel.geometry(state, loopsEl, edgesEl, junctionsEl);
  renderBuild();renderLog();
}
function renderBuild(){const el=$('#knotList'),active=activeSynergies(state.build);const schoolLine=`<div class="knot-item run-schools"><b>Gramática desta run</b><span>${runSchools.join(' · ')}</span></div>`;const synergyLine=active.length?active.map(s=>`<div class="knot-item synergy-active"><b>${s.symbol} ${s.name}</b><span>${s.desc}</span></div>`).join(''):'';if(!state.build.length){el.innerHTML=schoolLine+'<div class="knot-item"><b>Sem knots</b><span>Vença a rodada para escolher um e mudar sua forma de pensar a geometria.</span></div>';return}el.innerHTML=schoolLine+synergyLine;state.build.forEach(id=>{const k=knotDefs[id],d=document.createElement('div');d.className='knot-item';d.innerHTML=`<b>${k.symbol} ${k.name}</b><span>${k.desc}</span>`;el.appendChild(d)})}
function renderLog(){const el=$('#log');if(!state.log.length){el.innerHTML='<div class="logline"><span>Sem jogadas marcantes ainda.</span><strong>·</strong></div>';return}el.innerHTML=state.log.slice(-5).reverse().map(x=>`<div class="logline"><span>${x.label}</span><strong>+${fmt(x.points)}</strong></div>`).join('')} function log(label,points){state.log.push({label,points})}
