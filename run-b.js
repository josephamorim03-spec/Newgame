'use strict';
let runSeed=0,runPlan=[],runSchools=[],runReweaves=1,runFocus=0,runMasteries=0,runChallenges=0,runTotalScore=0,runChallengeScore=0,draftNonce=0,runSources={loop:0,cross:0,echo:0,line:0},runEngineHits={},runConfig={...RUN_LAB_DEFAULT};
let state,roundEndTimer=null;let soundOn=true,musicOn=true;let audioCtx,masterGain,musicGain,fxGain,compressor,noiseBuffer,musicTimer=null,musicStep=0,moodEnergy=0,currentChord=0;
function freshState(round=0,build=[]){const rd=runPlan[round];return{round,build:[...build],score:0,loopCount:0,crosses:0,echoes:0,centerHits:0,cleanLoops:0,maxLoopVertices:0,centerLoops:0,triangleLoops:0,symPairs:0,moves:0,current:null,path:[],edges:[],loops:[],junctions:[],log:[],ended:false,nextLoopMult:1,directiveAnnounced:false,requirementAnnounced:false,sources:{loop:0,cross:0,echo:0,line:0},engineHits:{},celebrationHold:0,pts:rd.layout.map((p,i)=>({id:i,x:p[0],y:p[1]}))}}
function initAudio(){
  if(audioCtx)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audioCtx=new AC();
  compressor=audioCtx.createDynamicsCompressor();compressor.threshold.value=-22;compressor.knee.value=18;compressor.ratio.value=2.6;
  masterGain=audioCtx.createGain();masterGain.gain.value=.94;musicGain=audioCtx.createGain();musicGain.gain.value=.20;fxGain=audioCtx.createGain();fxGain.gain.value=.50;
  noiseBuffer=audioCtx.createBuffer(1,Math.floor(audioCtx.sampleRate*.35),audioCtx.sampleRate);const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
  musicGain.connect(compressor);fxGain.connect(compressor);compressor.connect(masterGain);masterGain.connect(audioCtx.destination)
}
function ensureMusic(){if(musicTimer||!musicOn||!audioCtx)return;musicLoop();musicTimer=setInterval(musicLoop,980)}
function stopMusic(){if(musicTimer){clearInterval(musicTimer);musicTimer=null}}
function tone(freq,dur=.12,type='sine',vol=.04,at=0,detune=0){if(!soundOn||!audioCtx)return;const t=audioCtx.currentTime+at,o=audioCtx.createOscillator(),g=audioCtx.createGain(),f=audioCtx.createBiquadFilter();f.type='lowpass';f.frequency.value=type==='triangle'?1650:2350;o.type=type;o.frequency.setValueAtTime(freq,t);o.detune.value=detune;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(f);f.connect(g);g.connect(fxGain);o.start(t);o.stop(t+dur+.03)}
function textureNoise(vol=.012,at=0,bright=false,dur=.055){if(!soundOn||!audioCtx||!noiseBuffer)return;const t=audioCtx.currentTime+at,s=audioCtx.createBufferSource(),bp=audioCtx.createBiquadFilter(),g=audioCtx.createGain();s.buffer=noiseBuffer;bp.type='bandpass';bp.frequency.value=bright?2600:1050;bp.Q.value=bright?1.4:.8;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(bp);bp.connect(g);g.connect(fxGain);s.start(t);s.stop(t+dur+.02)}
function threadSound(step=0){const v=step%3,base=[232,247,220][v];textureNoise(.006,0,v===1,.045);tone(base,.055,'triangle',.012,0,[-5,4,0][v]);if(v===2)tone(base*1.5,.045,'sine',.005,.018,3)}
function pad(freq,dur=.88,vol=.025,at=0,detune=0){if(!musicOn||!audioCtx)return;const t=audioCtx.currentTime+at,g=audioCtx.createGain(),lp=audioCtx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=980;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+.28);g.gain.linearRampToValueAtTime(.0001,t+dur);for(const [type,ratio,dv] of [['triangle',1,detune],['sine',2,detune+4]]){const o=audioCtx.createOscillator();o.type=type;o.frequency.setValueAtTime(freq*ratio,t);o.detune.value=dv;o.connect(lp);o.start(t);o.stop(t+dur+.05)}lp.connect(g);g.connect(musicGain)}
function pluck(freq,dur=.17,vol=.014,at=0,variant=0){if(!musicOn||!audioCtx)return;const t=audioCtx.currentTime+at,o=audioCtx.createOscillator(),g=audioCtx.createGain(),bp=audioCtx.createBiquadFilter();o.type=variant===1?'sine':'triangle';o.frequency.setValueAtTime(freq,t);o.detune.value=[-3,4,0][variant%3];bp.type='bandpass';bp.frequency.value=[1050,1450,1250][variant%3];bp.Q.value=1.1;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(bp);bp.connect(g);g.connect(musicGain);o.start(t);o.stop(t+dur+.03)}
function musicLoop(){
  if(!musicOn||!audioCtx)return;
  const chords=[[174,220,262],[196,247,294],[220,277,330],[196,262,330]],chord=chords[currentChord%chords.length],intensity=Math.max(.04,Math.min(1,moodEnergy)),pattern=musicStep%3;
  pad(chord[0],.94,.012+intensity*.012,0,-7);pad(chord[1],.92,.010+intensity*.010,.08,5);pad(chord[2],.90,.008+intensity*.010,.16,-2);
  if(pattern===0){pluck(chord[1]*2,.15,.008+intensity*.007,.08,0);if(intensity>.46)pluck(chord[2]*1.5,.12,.006+intensity*.006,.56,1)}
  else if(pattern===1){pluck(chord[0]*2,.13,.007+intensity*.006,.22,2);if(intensity>.62)pluck(chord[1]*2.02,.10,.006,.70,0)}
  else if(intensity>.25){pluck(chord[2]*1.48,.14,.007+intensity*.006,.38,1)}
  musicStep++;if(musicStep%2===0||intensity>.78)currentChord=(currentChord+1)%chords.length;moodEnergy=Math.max(.05,moodEnergy*.76)
}
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
  nodesEl.innerHTML='';
  state.pts.forEach(p=>{
    const b=document.createElement('button'),pv=previewMove(state.current,p.id);
    const tutorialClass=onboard==='start'?' onboard-start':((onboard==='connect'&&p.id!==state.current&&!(pv&&pv.blocked))?' onboard-next':((onboard==='close'&&pv&&pv.closes)?' onboard-close':''));
    b.className='node'+(p.id===state.current?' active':'')+(state.path.includes(p.id)?' visited':'')+(state.current!==null&&p.id!==state.current?' crosshair':'')+(pv&&pv.blocked?' blocked':'')+tutorialClass;
    b.type='button';b.style.left=(p.x/10)+'%';b.style.top=(p.y/10)+'%';
    b.setAttribute('aria-label',`Ponto ${p.id+1}${pv&&!pv.blocked?' · '+pv.label:''}`);
    if(pv&&!pv.blocked&&state.current!==null){
      const badge=document.createElement('span');badge.className='move-preview';
      badge.textContent=pv.mirrorPair?'↔':pv.closes?'◌':pv.crosses?'×':pv.echo?'∥':pv.center?'◎':'·';badge.title=pv.label;b.appendChild(badge);
    }
    b.addEventListener('pointerenter',()=>{if(onboard==='done'&&pv&&!pv.blocked&&state.current!==null){hint.classList.remove('hide');hint.textContent=pv.label}});
    b.addEventListener('focus',()=>{if(onboard==='done'&&pv&&!pv.blocked&&state.current!==null){hint.classList.remove('hide');hint.textContent=pv.label}});
    b.addEventListener('pointerdown',ev=>{ev.preventDefault();pickNode(p.id)});
    b.addEventListener('click',ev=>{ev.preventDefault();if(ev.detail===0)pickNode(p.id)});
    nodesEl.appendChild(b);
  });
  loopsEl.innerHTML='';
  state.loops.forEach((L,i)=>{const poly=svg('polygon',{points:L.points.map(p=>`${p.x},${p.y}`).join(' '),class:'loop-fill'});poly.style.fill=`hsla(${(14+i*28)%360},${36+(i%3)*8}%,${76-(i%5)*4}%,${.12+Math.min(.12,i*.015)})`;loopsEl.appendChild(poly)});
  edgesEl.innerHTML='';state.edges.forEach(e=>edgesEl.appendChild(svg('line',{x1:e.a.x,y1:e.a.y,x2:e.b.x,y2:e.b.y,class:'edge'+(e.echo?' echo':'')})));
  junctionsEl.innerHTML='';state.junctions.forEach(j=>junctionsEl.appendChild(svg('circle',{cx:j.x,cy:j.y,r:10,class:'junction'})));
  renderBuild();renderLog();
}
function renderBuild(){const el=$('#knotList'),active=activeSynergies(state.build);const schoolLine=`<div class="knot-item run-schools"><b>Gramática desta run</b><span>${runSchools.join(' · ')}</span></div>`;const synergyLine=active.length?active.map(s=>`<div class="knot-item synergy-active"><b>${s.symbol} ${s.name}</b><span>${s.desc}</span></div>`).join(''):'';if(!state.build.length){el.innerHTML=schoolLine+'<div class="knot-item"><b>Sem knots</b><span>Vença a rodada para escolher um e mudar sua forma de pensar a geometria.</span></div>';return}el.innerHTML=schoolLine+synergyLine;state.build.forEach(id=>{const k=knotDefs[id],d=document.createElement('div');d.className='knot-item';d.innerHTML=`<b>${k.symbol} ${k.name}</b><span>${k.desc}</span>`;el.appendChild(d)})}
function renderLog(){const el=$('#log');if(!state.log.length){el.innerHTML='<div class="logline"><span>Sem jogadas marcantes ainda.</span><strong>·</strong></div>';return}el.innerHTML=state.log.slice(-5).reverse().map(x=>`<div class="logline"><span>${x.label}</span><strong>+${fmt(x.points)}</strong></div>`).join('')} function log(label,points){state.log.push({label,points})}
