'use strict';
const $=s=>document.querySelector(s);
const sheetOverlay=$('#sheetOverlay'), sheet=$('#sheet'), drawer=$('#drawer');
const loopsEl=$('#loops'), edgesEl=$('#edges'), junctionsEl=$('#junctions'), pulsesEl=$('#pulses');
const nodesEl=$('#nodes'), fxEl=$('#fx'), hint=$('#hint'), scoreEl=$('#scoreEl'), meterEl=$('#meter');
const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const ROUND_LIBRARY={
first:{title:'Primeira trama',text:'Feche formas. Aprenda o ritmo antes de tentar quebrá-lo.',target:1700,mastery:2800,moves:8,crossValue:140,echoValue:90,areaScale:1,focus:['loop']},
cross:{title:'Fio cruzado',text:'Cruzamentos valem mais nesta rodada. Prepare o encontro das linhas.',target:3300,mastery:4800,moves:9,crossValue:220,echoValue:90,areaScale:1,focus:['cross']},
echo:{title:'Ritmo repetido',text:'Echoes valem mais. Repetir comprimentos pode preparar uma trama elegante.',target:3500,mastery:5000,moves:9,crossValue:140,echoValue:180,areaScale:1,focus:['echo']},
space:{title:'Espaço aberto',text:'Loops grandes rendem mais. Guarde área antes de fechar.',target:4000,mastery:5600,moves:9,crossValue:140,echoValue:90,areaScale:1.28,focus:['area','loop']},
clean:{title:'Linha limpa',text:'Loops sem linhas cruzadas recebem um bônus extra nesta rodada.',target:4000,mastery:5600,moves:9,crossValue:125,echoValue:90,areaScale:1,roundClean:1.28,focus:['clean','loop']},
center:{title:'Centro de tensão',text:'Linhas que passam perto do centro ganham valor e deixam o próximo Loop mais forte.',target:4600,mastery:6600,moves:10,crossValue:140,echoValue:90,areaScale:1,centerValue:130,focus:['center','line']},
dense:{title:'Trama densa',text:'Você tem mais pontos, mas não mais tempo. Encontre uma estrutura boa cedo.',target:4900,mastery:7300,moves:10,crossValue:160,echoValue:105,areaScale:1.08,focus:['cross','loop']},
final:{title:'Trama mestra',text:'A build inteira está ativa. Prepare uma jogada grande antes de gastar seus últimos pontos de fio.',target:8500,mastery:14500,moves:11,crossValue:170,echoValue:115,areaScale:1.15,focus:['loop','cross','area','growth']}};
const GOALS={
cross2:{label:'Crie 2 Crosses',progress:s=>`${Math.min(s.crosses,2)}/2 Crosses`,check:s=>s.crosses>=2},
echo2:{label:'Crie 2 Echoes',progress:s=>`${Math.min(s.echoes,2)}/2 Echoes`,check:s=>s.echoes>=2},
big5:{label:'Feche um Loop de 5+ vértices',progress:s=>s.maxLoopVertices>=5?'Loop 5+ ✓':`Maior Loop: ${s.maxLoopVertices}/5`,check:s=>s.maxLoopVertices>=5},
clean1:{label:'Feche 1 Loop limpo',progress:s=>s.cleanLoops>=1?'Loop limpo ✓':'0/1 Loop limpo',check:s=>s.cleanLoops>=1},
center2:{label:'Passe 2 linhas pelo centro',progress:s=>`${Math.min(s.centerHits,2)}/2 pelo centro`,check:s=>s.centerHits>=2},
loops2:{label:'Feche 2 Loops',progress:s=>`${Math.min(s.loopCount,2)}/2 Loops`,check:s=>s.loopCount>=2},
halo1:{label:'Feche um Loop envolvendo o centro',progress:s=>s.centerLoops>=1?'Halo central ✓':'0/1 Halo central',check:s=>s.centerLoops>=1},
triangle1:{label:'Feche 1 triângulo',progress:s=>s.triangleLoops>=1?'Triângulo ✓':'0/1 Triângulo',check:s=>s.triangleLoops>=1}};
const GOAL_BY_ROUND={cross:'cross2',echo:'echo2',space:'big5',clean:'clean1',center:'center2',dense:'loops2'};
const DIRECTIVE_POOL=Object.keys(GOALS);
function goalMet(id){return !id||GOALS[id].check(state)} function goalProgress(id){return id?GOALS[id].progress(state):''} function goalLabel(id){return id?GOALS[id].label:''} function requirementMet(rd){return !rd.requirement||goalMet(rd.requirement)}
function pointInPoly(pt,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const xi=poly[i].x,yi=poly[i].y,xj=poly[j].x,yj=poly[j].y;const hit=((yi>pt.y)!==(yj>pt.y))&&(pt.x<(xj-xi)*(pt.y-yi)/(yj-yi+1e-9)+xi);if(hit)inside=!inside}return inside}
const knotDefs={
clean:{name:'Clean Thread',symbol:'○',desc:'Loops sem linhas cruzadas recebem ×2.',tags:['clean','loop'],school:'Pureza'},blood:{name:'Blood Knot',symbol:'✕',desc:'Cada Cross fortalece o multiplicador do próximo Loop.',tags:['cross','loop'],school:'Interseção'},mirror:{name:'Echo Knot',symbol:'∥',desc:'Echoes ganham valor extra e acumulam mais tensão.',tags:['echo'],school:'Ritmo'},reflection:{name:'Mirror Loom',symbol:'↔',desc:'Cada novo par de arestas espelhadas rende pontos e fortalece o próximo Loop.',tags:['symmetry','line'],school:'Forma'},prism:{name:'Prism Knot',symbol:'◇',desc:'Loops com 4 ou mais pontos recebem ×1,6.',tags:['area','loop'],school:'Forma'},fracture:{name:'Fracture',symbol:'✦',desc:'Um Loop fechado por uma linha que também cria Crosses recebe multiplicador extra.',tags:['cross','loop'],school:'Interseção'},long:{name:'Long Thread',symbol:'—',desc:'Linhas longas rendem bônus e fortalecem um pouco o próximo Loop.',tags:['line','general'],school:'Traço'},heart:{name:'Heartline',symbol:'◎',desc:'Linhas que passam perto do centro rendem bônus e bastante tensão.',tags:['center','line'],school:'Traço'},loom:{name:'First Loom',symbol:'⌂',desc:'O primeiro Loop de cada rodada recebe +500 pontos.',tags:['loop','general'],school:'Pureza'},crescendo:{name:'Crescendo',symbol:'↗',desc:'Cada Loop já fechado aumenta o multiplicador dos próximos.',tags:['loop','growth'],school:'Ritmo'},star:{name:'Star Knot',symbol:'☆',desc:'Loops com 5 ou mais vértices recebem ×1,8.',tags:['area','loop'],school:'Forma'},junction:{name:'Golden Junction',symbol:'✣',desc:'Cada Cross rende +80 pontos adicionais.',tags:['cross'],school:'Interseção'},trinity:{name:'Trinity',symbol:'△',desc:'Triângulos recebem ×1,75. Menos lados, mais precisão.',tags:['clean','loop'],school:'Forma'},halo:{name:'Halo Knot',symbol:'⊙',desc:'Loops que envolvem o centro recebem ×1,65.',tags:['center','area','loop'],school:'Traço'},braid:{name:'Braid',symbol:'≋',desc:'Depois de criar ao menos um Cross e um Echo, seus Loops recebem ×1,45.',tags:['cross','echo','loop'],school:'Ritmo'}};
function makeRegular(n,rotation=0,radius=360){const cx=500,cy=500;return Array.from({length:n},(_,i)=>{const a=(Math.PI*2/n)*i-Math.PI/2+rotation;return[cx+Math.cos(a)*radius,cy+Math.sin(a)*radius]})}
function makeDoubleSquare(rotation=0){const cx=500,cy=500,out=350,inn=205,pts=[];for(let i=0;i<4;i++){let a=i*Math.PI/2-Math.PI/2+rotation;pts.push([cx+Math.cos(a)*out,cy+Math.sin(a)*out])}for(let i=0;i<4;i++){let a=i*Math.PI/2-Math.PI/4+rotation;pts.push([cx+Math.cos(a)*inn,cy+Math.sin(a)*inn])}return pts}
function mulberry32(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}} function shuffle(arr,rng){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const RUN_LAB_DEFAULT={difficulty:'moderate',rounds:6,geometry:'mixed',nodes:'mixed',objectives:'balanced'};
function makeAxisLayout(n,rotation=0,stretch=1.28){return makeRegular(n,rotation,330).map(([x,y])=>[500+(x-500)*stretch,500+(y-500)/stretch])}
function resolveRunConfig(seed,input={}){
  const pickRng=mulberry32((Number(seed)||1)^0x4b4e4f54),pick=a=>a[Math.floor(pickRng()*a.length)];
  const raw={...RUN_LAB_DEFAULT,...(input||{})};
  let difficulty=raw.difficulty==='random'?pick(['easy','moderate','hard']):raw.difficulty;
  let rounds=raw.rounds==='random'?pick([4,5,6,7,8,9]):Number(raw.rounds);
  let geometry=raw.geometry==='random'?pick(['radial','symmetric','axis','mixed']):raw.geometry;
  let nodes=raw.nodes==='random'?pick(['8','10','mixed']):String(raw.nodes);
  let objectives=raw.objectives==='random'?pick(['balanced','loop','cross','echo']):raw.objectives;
  if(!['easy','moderate','hard'].includes(difficulty))difficulty='moderate';
  if(!Number.isFinite(rounds))rounds=6;rounds=Math.max(4,Math.min(10,Math.round(rounds)));
  if(!['radial','symmetric','axis','mixed'].includes(geometry))geometry='mixed';
  if(!['8','10','mixed'].includes(nodes))nodes='mixed';
  if(!['balanced','loop','cross','echo'].includes(objectives))objectives='balanced';
  return{difficulty,rounds,geometry,nodes,objectives}
}
function makeRunLayout(cfg,rng,index){
  const n=cfg.nodes==='mixed'?(rng()>.45?8:10):Number(cfg.nodes),rotation=(rng()-.5)*(Math.PI/n),mode=cfg.geometry==='mixed'?shuffle(['radial','symmetric','axis'],rng)[0]:cfg.geometry;
  if(mode==='axis')return makeAxisLayout(n,rotation,rng()>.5?1.22:1.34);
  if(mode==='symmetric'&&n===8&&rng()>.45)return makeDoubleSquare(rng()>.5?0:Math.PI/4);
  return makeRegular(n,rotation,n===10?350:360)
}
function goalPoolForBias(bias){
  if(bias==='loop')return['big5','clean1','loops2','halo1','triangle1'];
  if(bias==='cross')return['cross2','center2','loops2'];
  if(bias==='echo')return['echo2','loops2','big5'];
  return DIRECTIVE_POOL
}
function buildRun(seed,inputConfig){
  const cfg=resolveRunConfig(seed,inputConfig||((typeof runConfig!=='undefined'&&runConfig)||RUN_LAB_DEFAULT)),rng=mulberry32(seed);
  if(typeof runConfig!=='undefined')runConfig={...cfg};
  const schools=['Interseção','Forma','Ritmo','Traço','Pureza'];runSchools=shuffle(schools,rng).slice(0,3);
  const roundBySchool={Interseção:['cross','dense'],Forma:['space','dense'],Ritmo:['echo','dense'],Traço:['center','space'],Pureza:['clean','space']};
  let localRounds=[...new Set(runSchools.flatMap(s=>roundBySchool[s]))];
  const biasRounds={loop:['space','clean','dense','center'],cross:['cross','dense','center'],echo:['echo','dense','space'],balanced:[]}[cfg.objectives]||[];
  localRounds=[...new Set([...biasRounds,...localRounds,'cross','echo','space','clean','center','dense'])];
  const midCount=cfg.rounds-2,mids=[];while(mids.length<midCount)mids.push(...shuffle(localRounds,rng));mids.length=midCount;
  const defs=['first',...mids,'final'].map(k=>({...ROUND_LIBRARY[k],key:k})),goalPool=goalPoolForBias(cfg.objectives);
  return defs.map((d,i)=>{
    const progress=i/Math.max(1,defs.length-1),diff=cfg.difficulty;
    const targetScale=(diff==='easy'?.82:diff==='hard'?1.12:1)*(1+progress*(diff==='hard'?.09:diff==='moderate'?.04:.015));
    const masteryScale=(diff==='easy'?.86:diff==='hard'?1.10:1)*(1+progress*(diff==='hard'?.08:diff==='moderate'?.035:.015));
    const moveDelta=diff==='easy'?1:(diff==='hard'&&i>0?-1:0);
    let requirement=null,directive=null;
    if(i>0&&i<defs.length-1){
      const preferred=GOAL_BY_ROUND[d.key],pool=shuffle(goalPool.filter(g=>g!==preferred),rng);
      if(diff==='hard'&&(i%2===0||progress>.55))requirement=preferred||pool[0]||'loops2';
      else if(diff==='moderate'&&i===Math.floor((defs.length-1)/2))requirement=preferred||pool[0]||'loops2';
      else if(diff==='easy'&&defs.length>=7&&i===Math.floor((defs.length-1)/2))requirement=preferred||pool[0]||'loops2';
      const allowDirective=diff==='easy'?i%2===1:true;
      if(allowDirective)directive=shuffle(goalPool.filter(g=>g!==requirement),rng)[0]||null;
    }
    return{...d,target:Math.round(d.target*targetScale/50)*50,mastery:Math.round(d.mastery*masteryScale/50)*50,moves:Math.max(6,d.moves+moveDelta),layout:makeRunLayout(cfg,rng,i),requirement,directive}
  })
}
