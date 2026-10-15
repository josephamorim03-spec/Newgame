function Engine(){
  /* Afluente v0.4 — encaixe de peças hexagonais (inspirado no laço do Dorfromantik) com água viva.
     Cada peça tem 6 lados: G pasto, C campo, B bosque, V vila, A água.
     - Qualquer peça cabe em qualquer casa vazia; lados que não combinam só não pontuam. Rio contra terra vira brejo.
     - +1 ponto por lado que combina. Peça cercada com os 6 lados combinando = Perfeita: +5 e +1 peça.
     - Missões com prazo (v0.9): "Bosque 8 em 9 jogadas" — fazer a região chegar a N peças antes do prazo dá +3 peças;
       passar do número não tem problema; se o prazo acaba, a missão só vai embora (sem castigo).
     - A água só corre no rio ligado à nascente; cada peça que passa a ter água viva rende +2.
     - O jogo acaba quando a pilha acaba.
     v0.5 — Estações do rio: metas de pontos crescentes; cada estação alcançada dá +4 peças e libera
     peças especiais (Cachoeira, Ponte, Lagoa) que começam a aparecer na pilha. Estatísticas para o relatório final.
     v0.7 — O ano no vale, simplificado: duas estações, como no Cerrado. Águas (8 jogadas) e Seca (4 jogadas).
       Uma regra só: na Seca, o rio só corre por peças com mata ciliar (lado de bosque na própria peça, ou o lado
       da vizinha virado para ela é bosque). Trecho sem mata seca, e tudo rio abaixo seca junto.
       Quando a seca chega, cada trecho de rio que continua correndo vale +1 e rende peças: no ano 1, +1 peça a
       cada 2 trechos; no ano 2, a cada 3; no ano 3, a cada 4 (a seca fica mais dura a cada ano).
       Nas chuvas o rio volta a correr e a pilha ganha +2 peças (a água que volta não pontua de novo).
       As peças especiais entram na pilha conforme o tempo passa.
     Lições: vales prontos (licao-1 … licao-5) com peças fixas, para ensinar uma mecânica de cada vez.
     v2.4 — A água no centro (ver REVISAO_*.md e AGUA_E_PREVIA_v2.5.md):
       - rio não se corta (v2.3, riverFit 'brejo'): lado de rio do vizinho pede rio; a água a mais da peça nova termina num brejo.
         Se a peça não cabe em casa nenhuma, ela é deixada passar (pass);
       - o vale abre com a nascente, um trecho de rio e duas veredas (olhos-d'água que nunca secam). O rio de uma
         vereda que chega ao rio da nascente é um afluente: +10 e +2 peças;
       - a cheia: quando as chuvas voltam, cada peça verde (com água viva nela ou encostada) vale +1;
       - mais peças de rio na pilha (32%); a seca dá no máximo 2 peças; missão dá 2 peças, com prazo proporcional
         à raridade do terreno (vila, mais rara, tem mais tempo), e não nasce mais missão que a pilha não consegue cumprir;
       - missão de água: a peça precisa ter água correndo quando a seca chegar (liga e protege);
       - a Ponte saiu; os bots dos marcos veem a peça seguinte, como a pessoa. */
  const DIRS=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
  const K=(q,r)=>(q+64)*128+(r+64),KQ=k=>Math.floor(k/128)-64,KR=k=>(k%128)-64;
  const nb=(k,d)=>K(KQ(k)+DIRS[d][0],KR(k)+DIRS[d][1]);
  const opp=d=>(d+3)%6;
  const START=22,PERFECT_PTS=5,QUEST_TILES=2,FLOW_PTS=2,SEASON_TILES=0;
  const CFG={qMode:'prazo',qSlack:3,qMul:4,qMulT:{B:4,C:4,V:6},qSpan:3,flowDue:10,aguas:8,seca:4,keptPts:1,keptDiv:2,divGrow:1,cap:0,rain:2,shield:'touch',
    aldeia:true,alcance:2,dComida:2,dLenha:1,friMul:2,friP:0.35,lenhaMata:1,spoil:0.5,pCasa:5,pecaFarto:3,pecaMeio:2,prov0:{comida:8,lenha:3},toco:1,colheita:1,
    econ:true,irrig:'borda',yC:2,yG:1,yV:1,vMax:3,yB:1,flowPts:1,riverFit:'brejo',veredas:2,veredaDist:3,afluPts:10,afluTiles:QUEST_TILES,cheia:0,rioPct:0.32,opening:true,flowSeca:true,look:1,lookK:3,lookPols:['cuidadoso'],...(typeof AFLUENTE_CFG!=='undefined'?AFLUENTE_CFG:{})};
  const SEASON_AT=[0,0,35,95,180,290,420,570,740,930];
  const seasonAt=n=>n<SEASON_AT.length?SEASON_AT[n]:SEASON_AT[SEASON_AT.length-1]+220*(n-SEASON_AT.length+1);
  const CYCLE=['Águas','Seca'];
  const phase=n=>(n-1)%2; // 0 Águas, 1 Seca
  const yearOf=n=>Math.ceil(n/2);
  const seasonLen=n=>phase(n)?CFG.seca:CFG.aguas;
  const seasonName=n=>CYCLE[phase(n)]+' · ano '+yearOf(n);
  // peças especiais: liberadas por estação
  const SPECIALS=[
    {id:'falls',season:2,name:'Cachoeira',e:['A','B','B','A','G','G'],desc:'+6 quando a água chega'},
    {id:'lake',season:3,name:'Lagoa',e:['A','A','G','A','A','G'],desc:'+8 e +1 peça quando a água chega'},
  ];
  const SRC=K(0,0);

  function hashStr(s){let h=1779033703^s.length;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),3432918353);h=h<<13|h>>>19;}h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return(h^h>>>16)>>>0;}
  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  const rot=(e,r)=>e.map((_,i)=>e[(i-r+6)%6]);

  function genTile(rng,i){
    const pick=w=>{let t=rng()*w.reduce((a,b)=>a+b[1],0);for(const[k,v]of w){if((t-=v)<0)return k;}return w[0][0];};
    const LAND=[['B',30],['C',26],['V',13],['G',31]];
    let e;const roll=rng();
    if(roll<CFG.rioPct){
      const ports={reto:[0,3],curva:[0,2],fechada:[0,1],bif:[0,2,4],fim:[0]}[pick([['reto',3],['curva',4],['fechada',2],['bif',1],['fim',1]])];
      const a=pick(LAND),b=rng()<0.55?a:pick(LAND);
      e=[0,1,2,3,4,5].map(d=>ports.includes(d)?'A':(d<3?a:b));
    }else if(roll<0.46){e=Array(6).fill(pick(LAND));}
    else{
      const a=pick(LAND),b=pick(LAND),n=1+Math.floor(rng()*3);
      e=[0,1,2,3,4,5].map(d=>d<n?b:a);
      if(rng()<0.3)e[4]=pick(LAND);
    }
    e=rot(e,Math.floor(rng()*6));
    let quest=null;
    if(i%4===2){
      const bs=[...new Set(e)].filter(x=>x!=='G');
      if(bs.length){const b=bs[Math.floor(rng()*bs.length)];const r=rng();quest=b==='A'?{b,flow:true}:{b,n:4+Math.floor(r*6),add:2+Math.floor(r*(b==='V'?2:CFG.qSpan))};}
    }
    return{e,quest,sroll:rng(),spick:rng(),srot:Math.floor(rng()*6)};
  }

  // ---------- lições: vales prontos, peças fixas, uma mecânica de cada vez
  const F=b=>[b,b,b,b,b,b];
  const RIO=['A','G','G','A','G','G'];
  const LESSONS={
    'licao-1':{board:[[1,-1,F('B')],[-1,0,F('C')],[0,1,F('G')],[2,-1,F('B')]],
      tiles:[['B','B','B','B','G','G'],['C','C','C','G','G','G'],F('G'),['B','B','G','G','G','G'],F('C')],left:5,noSeasons:true},
    'licao-2':{board:[[2,0,RIO,{flow:true}],[1,-1,F('G')],[0,1,F('G')]],
      tiles:[['G','A','G','G','A','G'],F('B'),F('G')],left:3,noSeasons:true},
    'licao-3':{board:[[-1,0,F('B'),{b:'B',n:5,due:4}],[-2,0,F('B')],[-2,1,F('B')],[0,1,F('G')]],
      tiles:[F('B'),['G','G','G','B','B','B'],F('B'),F('G')],left:4,noSeasons:true},
    'licao-4':{board:[[3,1,F('B')],[3,0,F('B')],[2,0,F('B')],[1,1,F('C')],[1,2,F('C')],[2,2,F('C')]],
      tiles:[['C','C','C','B','B','B'],F('G'),F('G')],left:3,noSeasons:true},
    'licao-5':{board:[[1,0,RIO],[2,0,RIO],[3,0,RIO],[0,1,F('G')],[1,1,F('C')]],
      tiles:[F('B'),F('B'),F('G'),F('G')],left:3,clock:6},
  };
  function newGame(seedKey){
    const L=LESSONS[seedKey];if(L)return lessonGame(seedKey,L);
    const rng=mulberry32(hashStr('v05:'+seedKey));
    const tiles=[];for(let i=0;i<400;i++)tiles.push(genTile(rng,i));
    const board=new Map([[SRC,{e:['A','G','A','G','A','G'],src:true}]]);
    if(!seedKey.startsWith('treino-licao'))openValley(board,seedKey);
    const alive0=computeAlive(board,false);
    const s={seedKey,tiles,board,next:0,left:START,score:0,quests:[],alive:alive0,perfectSet:new Set(),
      placed:0,perfects:0,questsDone:0,turn:0,clock:0,actions:[],season:1,drawn:{},everAlive:new Set(alive0),seca:false,joined:[],undos:0,
      store:{...CFG.prov0},protect:true,cut:new Set(),toco:new Map(),pend:null,
      stats:{match:0,perfect:0,quest:0,flow:0,special:0,tPerfect:0,tQuest:0,tSeason:0,tSpecial:0,failed:[],best:{pts:0,turn:0,k:null},kept:0,dried:0,secas:0,
        aflu:0,tAflu:0,cheia:0,cheias:0,passes:0,atend:0,casasAno:0,fartos:0,anos:0,cortes:0,fri:0,pCasa:0,tCasa:0}};
    resolve(s,0);resolve(s,1);
    return s;
  }
  // v2.4: o vale abre com as veredas (olhos-d'água a CFG.veredaDist casas da nascente, em lados opostos) e um trecho de rio
  // saindo da nascente na direção da primeira vereda, com terra dos dois lados. Tudo sai da semente e não pontua.
  function openValley(board,seedKey){
    const vr=mulberry32(hashStr('vereda:'+seedKey)),d0=Math.floor(vr()*6),LND=['B','C','G','V','B','G'];
    const at=(d,n,side)=>{const a=DIRS[d],b=DIRS[(d+side+6)%6];return K(a[0]*n+(side?b[0]:0),a[1]*n+(side?b[1]:0));};
    const vk=[];
    for(let j=0;j<CFG.veredas;j++){const d=(d0+[0,3,1,4][j])%6,k=at(d,CFG.veredaDist,j%2?1:0);
      // a vereda solta água por dois lados: o virado para a nascente e um vizinho dele
      const e=['G','G','G','G','G','G'];e[(d+3)%6]='A';e[(d+1)%6]='A';
      board.set(k,{e,src:true,vereda:true});vk.push(k);}
    if(!CFG.opening)return vk;
    // trecho inicial: duas peças de rio a partir da saída da nascente mais longe das veredas (o afluente fica por fazer)
    const ad=(a,b)=>{const x=((a-b)%6+6)%6;return Math.min(x,6-x);};
    const ex=[0,2,4].sort((a,b)=>Math.min(ad(b,d0),ad(b,d0+3))-Math.min(ad(a,d0),ad(a,d0+3)))[0];
    let k=nb(SRC,ex),din=(ex+3)%6;
    for(let i=0;i<2;i++){if(board.has(k))break;const a=LND[Math.floor(vr()*LND.length)],b=vr()<0.5?a:LND[Math.floor(vr()*LND.length)];
      const turnTo=i===0?(din+3)%6:(din+(vr()<0.5?2:4))%6;
      const e=[0,1,2,3,4,5].map(d=>d===din||d===turnTo?'A':(((d-din+6)%6)<((turnTo-din+6)%6)?a:b));
      // a abertura nunca encosta numa vereda (água só encosta em água)
      if([0,1,2,3,4,5].some(d=>{const n=board.get(nb(k,d));return n&&n.vereda;}))break;
      board.set(k,{e,i:-1});k=nb(k,turnTo);din=(turnTo+3)%6;}
    return vk;
  }
  function lessonGame(seedKey,L){
    const s=newGame('treino-'+seedKey);
    const board=new Map([[SRC,{e:['A','G','A','G','A','G'],src:true}]]),quests=[];
    for(const[q,r,e,qu]of L.board){const k=K(q,r);board.set(k,{e:e.slice(),i:-1});
      if(qu)quests.push({key:k,edge:qu.flow?e.indexOf('A'):e.indexOf(qu.b),b:qu.flow?'A':qu.b,n:qu.n,flow:!!qu.flow,status:'open',due:qu.due||999});}
    const tiles=L.tiles.map(e=>({e,quest:null,sroll:1,spick:0,srot:0})).concat(s.tiles.map(t=>({...t,sroll:1})));
    const alive=computeAlive(board,false);
    const n={...s,seedKey,lesson:seedKey,noSeasons:!!L.noSeasons,tiles,board,quests,left:L.left,clock:L.clock||0,alive,everAlive:new Set(alive),drawn:{}};
    resolve(n,0);resolve(n,1);return n;
  }
  // a peça de cada posição da pilha é decidida quando aparece (como "peça da vez" ou "depois") e não muda mais
  function resolve(s,idx){
    if(s.drawn[idx]||!s.tiles[idx])return;
    const base=s.tiles[idx],open=SPECIALS.filter(x=>s.season>=x.season);
    const p=Math.min(0.22,0.075*open.length+0.02*Math.max(0,s.season-4));
    let t=base;
    if(open.length&&base.sroll<p){const sp=open[Math.floor(base.spick*open.length)];t={e:rot(sp.e,base.srot),quest:null,sp:sp.id};}
    s.drawn={...s.drawn,[idx]:t};
  }
  // mata ciliar: bosque na própria peça ou numa vizinha
  function shielded(board,k,cut){const t=board.get(k);if(t.src)return true;
    if(cut&&cut.size){if(!cut.has(k)&&t.e.includes('B'))return true;for(let d=0;d<6;d++){const m=nb(k,d),n=board.get(m);if(n&&!cut.has(m)&&n.e[opp(d)]==='B')return true;}return false;} // v3.1: mata cortada não segura o rio
    if(CFG.shield==='any'){if(t.e.includes('B'))return true;for(let d=0;d<6;d++){const n=board.get(nb(k,d));if(n&&n.e.includes('B'))return true;}return false;}
    // a mata precisa encostar no rio: lado de bosque na própria peça, ou o lado da vizinha virado para ela é bosque
    if(t.e.includes('B'))return true;for(let d=0;d<6;d++){const n=board.get(nb(k,d));if(n&&n.e[opp(d)]==='B')return true;}return false;}
  // água viva: da nascente, passando por lados de água que se encontram; na seca, só por peças protegidas
  // ---------- a economia do vale (v3): cada terreno rende conforme a água e os vizinhos, e tudo se vê no vale
  // lavoura verde (água viva na peça ou ao lado) rende CFG.yC; pasto verde, CFG.yG (o gado bebe); vila com água rende
  // CFG.yV por lavoura verde encostada (comida), até CFG.vMax; mata encostada no rio rende CFG.yB (mata ciliar).
  // A jogada vale o quanto ela faz o vale produzir a mais; na chegada da seca vem a colheita: o vale rende o que produz
  // com a água da seca (só corre o rio com mata).
  function yieldOf(board,green,k){const t=board.get(k);if(!t||t.src)return null;const has=b=>t.e.includes(b),gr=green.has(k);
    const y={c:0,p:0,v:0,m:0};
    if(has('C')&&gr)y.c=CFG.yC;
    if(has('G')&&gr)y.p=CFG.yG;
    if(has('V')&&gr){let food=has('C')?1:0;for(let d=0;d<6;d++){const n=board.get(nb(k,d));if(n&&!n.src&&n.e.includes('C')&&green.has(nb(k,d)))food++;}y.v=Math.min(CFG.vMax,food)*CFG.yV;}
    if(has('B')){let r=has('A');for(let d=0;d<6&&!r;d++){const n=board.get(nb(k,d));if(n&&n.e[opp(d)]==='A')r=true;}if(r)y.m=CFG.yB;}
    y.sum=y.c+y.p+y.v+y.m;return y;}
  // irrigada (v3): com CFG.irrig='borda', só a peça que o rio vivo toca — o rio passa por ela ou corre na beira dela
  // (o lado da vizinha virado para ela é água viva). É o caminho do rio que decide o que produz.
  function irrigSet(board,alive){if(CFG.irrig!=='borda')return greenSet(board,alive);const g=new Set();
    for(const[k,t]of board){if(t.src)continue;if(alive.has(k)&&t.e.includes('A')){g.add(k);continue;}
      for(let d=0;d<6;d++){const n=board.get(nb(k,d));if(n&&alive.has(nb(k,d))&&n.e[opp(d)]==='A'){g.add(k);break;}}}return g;}
  function production(board,alive){if(!CFG.econ)return 0;const green=irrigSet(board,alive);let P=0;for(const k of board.keys()){const y=yieldOf(board,green,k);if(y)P+=y.sum;}return P;}
  const nSrc=(board,set)=>{let n=0;for(const k of set)if(!board.get(k).src)n++;return n;};
  // peça verde: água viva nela ou encostada (é o que o vale desenha úmido e o que a cheia rega)
  function greenSet(board,alive){const g=new Set();for(const[k,t]of board){if(t.src)continue;
      if(alive.has(k)){g.add(k);continue;}for(let d=0;d<6;d++)if(alive.has(nb(k,d))){g.add(k);break;}}return g;}
  // rede do rio da nascente (sem as veredas): serve para saber se uma vereda já virou afluente
  function mainNet(board){const net=new Set([SRC]),q=[SRC];while(q.length){const k=q.pop(),t=board.get(k);
      for(let d=0;d<6;d++){if(t.e[d]!=='A')continue;const n=nb(k,d),tn=board.get(n);if(!tn||net.has(n)||tn.e[opp(d)]!=='A')continue;net.add(n);q.push(n);}}return net;}
  function computeAlive(board,seca,cut){
    const alive=new Set(),q=[];for(const[k,t]of board)if(t.src){alive.add(k);q.push(k);}
    while(q.length){const k=q.pop(),t=board.get(k);
      for(let d=0;d<6;d++){if(t.e[d]!=='A')continue;const n=nb(k,d),tn=board.get(n);
        if(!tn||alive.has(n)||tn.e[opp(d)]!=='A')continue;if(seca&&!shielded(board,n,cut))continue;alive.add(n);q.push(n);}}
    return alive;
  }
  // ---------- a aldeia e a despensa (v3.1; ver ALDEIA_E_RECURSOS.md)
  // Casas = peças com vila. A aldeia colhe só o que está a até CFG.alcance casas de alguma casa. Na chegada da seca:
  // 1) junta lenha: +1 por mata no alcance que não é da beira do rio (manejo); se a chave "proteger a mata do rio"
  //    estiver desligada e faltar lenha, corta também mata da beira do rio, a mais perto da aldeia primeiro, só o
  //    quanto falta; a mata cortada não segura o rio até as chuvas; e fica em toco por mais CFG.toco anos: nas secas
  //    seguintes ainda não dá lenha nem segura o rio. Cortar resolve este ano e cobra o próximo;
  // 2) a seca decide que rio corre (a mata cortada não protege);
  // 3) colhe: lavoura irrigada +2 e pasto irrigado +1 de comida, no alcance; a comida que sobrou do ano anterior
  //    perde metade (estraga), a lenha guardada fica;
  // 4) a aldeia separa o que vai gastar na seca: 2 de comida e 1 de lenha por casa (2 de lenha com friagem). As
  //    casas atendidas são as que cabem nos dois estoques. Na volta das chuvas: +5 por casa atendida; ano farto (todas
  //    atendidas) +3 peças, metade ou mais +2. A aldeia começa com uma provisão (CFG.prov0), para o ano 1 não
  //    depender só das primeiras peças. Ninguém morre: casa não atendida só não rende o bônus.
  // A friagem é a mesma do céu (Atmos): o mesmo sorteio pela semente e pela estação, então o que se vê e a regra combinam.
  const isCasa=t=>t&&!t.src&&t.e.includes('V');
  function hexDist(a,b){const dq=KQ(a)-KQ(b),dr=KR(a)-KR(b);return Math.max(Math.abs(dq),Math.abs(dr),Math.abs(dq+dr));}
  function aldeiaOf(board){const casas=[],reach=new Map(),R=CFG.alcance;for(const[k,t]of board)if(isCasa(t))casas.push(k);
    for(const v of casas){const q=KQ(v),r=KR(v);for(let dq=-R;dq<=R;dq++)for(let dr=Math.max(-R,-dq-R);dr<=Math.min(R,-dq+R);dr++){const kk=K(q+dq,r+dr);
      if(!board.has(kk)||board.get(kk).src)continue;const d=Math.max(Math.abs(dq),Math.abs(dr),Math.abs(dq+dr));if(!reach.has(kk)||reach.get(kk)>d)reach.set(kk,d);}}
    return{casas,reach};}
  const mataBeira=(board,k)=>{const t=board.get(k);if(!t.e.includes('B'))return false;if(t.e.includes('A'))return true;
    for(let d=0;d<6;d++){const n=board.get(nb(k,d));if(n&&n.e[opp(d)]==='A')return true;}return false;};
  function friagem(seedKey,season){if(!CFG.aldeia||phase(season)!==1)return false;
    const r=mulberry32(hashStr('c'+hashStr('ceu:'+seedKey)+':e'+season+':1'));return r()<CFG.friP;}
  const nextSeca=s=>phase(s.season)===1?s.season:s.season+1;
  // o plano da despensa para uma seca: o que entra, o que a aldeia pede, o que seria cortado e quantas casas ficam atendidas
  function despensaPlan(board,s,season,protect){
    const store=s.store||{comida:0,lenha:0},A=aldeiaOf(board),casas=A.casas.length,fri=!s.lesson&&friagem(s.seedKey,season);
    const lenhaCasa=CFG.dLenha*(fri?CFG.friMul:1),needC=casas*CFG.dComida,needL=casas*lenhaCasa;
    const toco=s.toco||new Map();let lenha=0;const beira=[];
    for(const[k]of A.reach){const t=board.get(k);if(!t.e.includes('B')||toco.has(k))continue;if(mataBeira(board,k))beira.push(k);else lenha+=CFG.lenhaMata;}
    const cut=[];if(!(protect??s.protect??true)&&casas){beira.sort((a,b)=>A.reach.get(a)-A.reach.get(b)||a-b);
      for(const k of beira){if(store.lenha+lenha+cut.length*CFG.lenhaMata>=needL)break;cut.push(k);}}
    const cutSet=new Set([...toco.keys(),...cut]),aliveS=computeAlive(board,true,cutSet),irr=irrigSet(board,aliveS);
    let comida=0;const gather=[];
    for(const[k]of A.reach){const t=board.get(k);let c=0;if(irr.has(k)){if(t.e.includes('C'))c+=CFG.yC;if(t.e.includes('G'))c+=CFG.yG;}
      if(c){comida+=c;gather.push([k,'c',c]);}
      if(t.e.includes('B')&&!toco.has(k)&&(cutSet.has(k)||!mataBeira(board,k)))gather.push([k,'l',CFG.lenhaMata]);}
    const lenhaGain=lenha+cut.length*CFG.lenhaMata,comidaHave=Math.floor(store.comida*CFG.spoil)+comida,lenhaHave=store.lenha+lenhaGain;
    const atendidas=casas?Math.min(casas,Math.floor(comidaHave/CFG.dComida),Math.floor(lenhaHave/lenhaCasa)):0;
    // quais casas são atendidas (para o visual acender): as mais perto da nascente primeiro, empate pela chave
    const casasOk=A.casas.slice().sort((a,b)=>hexDist(a,SRC)-hexDist(b,SRC)||a-b).slice(0,atendidas);
    return{casasOk,casas,needC,needL,fri,lenhaCasa,comidaGain:comida,lenhaGain,comidaHave,lenhaHave,atendidas,cut,toco:[...toco.keys()],cutSet,aliveS,gather,beira:beira.length,reach:A.reach};}
  // previsão da seca: quais trechos de rio secariam, quantos continuam correndo
  // a seca fica mais dura a cada ano: ano 1, 1 peça a cada 2 trechos; ano 2, a cada 3; ano 3, a cada 4…
  const keptDiv=year=>CFG.keptDiv+CFG.divGrow*(year-1);
  const secaGain=(kept,year)=>Math.min(CFG.cap,Math.floor(kept/keptDiv(year)));
  function balance(s){
    const full=s.seca?computeAlive(s.board,false):s.alive,aliveSeca=s.seca?s.alive:computeAlive(s.board,true,s.toco&&s.toco.size?s.toco:null);
    const risk=[];for(const k of full)if(!s.board.get(k).src&&!aliveSeca.has(k))risk.push(k);
    const len=seasonLen(s.season),safe=nSrc(s.board,aliveSeca),green=greenSet(s.board,full).size;
    const ver=[...s.board.values()].filter(t=>t.vereda).length;
    const prod=production(s.board,s.alive),harvest=production(s.board,aliveSeca);
    let desp=null;if(CFG.aldeia&&!s.lesson&&!s.noSeasons){if(s.seca)desp={seca:true,...(s.pend||{atendidas:0,casas:0,fri:false}),store:s.store,cut:[...(s.cut||[])],toco:[...(s.toco||new Map()).keys()]};
      else{const P=despensaPlan(s.board,s,nextSeca(s));desp={...P,cutSet:undefined,aliveS:undefined,reach:undefined,reachKeys:[...P.reach.keys()],store:s.store,protect:s.protect,
        alt:s.protect?(()=>{const Q=despensaPlan(s.board,s,nextSeca(s),false);return{atendidas:Q.atendidas,lenhaHave:Q.lenhaHave,comidaHave:Q.comidaHave,cut:Q.cut.length};})():null};}}
    return{prod,harvest,desp,phase:phase(s.season),year:yearOf(s.season),seca:s.seca,river:nSrc(s.board,full),riverSafe:safe,risk,green,cheia:green*CFG.cheia,
      veredas:ver,joined:(s.joined||[]).length,
      gain:secaGain(safe,yearOf(s.season)),per:keptDiv(yearOf(s.season)),turnsLeft:len-s.clock,len,noSeasons:!!s.noSeasons};
  }
  const cur=s=>s.drawn[s.next];
  const peek=(s,n)=>s.drawn[s.next+n];
  // lados combinam se são iguais; a Ponte combina com qualquer terra
  function matches(a,ta,b,tb){
    if(a===b)return true;
    return false;
  }

  // Qualquer peça cabe em qualquer casa vazia encostada no vale. Rio que bate em terra termina num brejo:
  // aquele lado não combina (não pontua) e a água não passa. (A proibição antiga criava buracos impossíveis.)
  // v2.4: água só encosta em água (riverFit true). v2.3 'brejo' (padrão): o rio do vale não se corta; a água a mais da peça nova vira brejo.
  // v2.3 (pedido do teste): riverFit 'brejo' = o rio que já está no vale nunca é cortado por terra (lado de água vizinho
  // pede água), mas a peça nova pode ter um lado de água a mais contra terra: ali a água termina num brejo. Assim a peça
  // de rio que liga dois rios sempre entra, mesmo que o formato não seja o exato, e não sobram casas impossíveis.
  function legal(board,k,e){if(!CFG.riverFit)return true;const soft=CFG.riverFit==='brejo';
    for(let d=0;d<6;d++){const n=board.get(nb(k,d));if(!n)continue;const nw=n.e[opp(d)]==='A',mw=e[d]==='A';
      if(soft?(nw&&!mw):(nw!==mw))return false;}return true;}
  const canPlay=s=>{const t=cur(s);if(!t)return false;const rs=rotations(t.e);
    for(const k of slots(s))for(const o of rs)if(legal(s.board,k,o.e))return true;return false;};
  function slots(s){
    const out=new Set();
    for(const k of s.board.keys())for(let d=0;d<6;d++){const n=nb(k,d);if(!s.board.has(n))out.add(n);}
    return[...out];
  }
  function rotations(e){const seen=new Set(),out=[];for(let r=0;r<6;r++){const x=rot(e,r),key=x.join('');if(!seen.has(key)){seen.add(key);out.push({r,e:x});}}return out;}

  // grupos: triângulos (peça, lado) de mesmo bioma conectados; tamanho = nº de peças distintas
  function groups(board,withG){
    const par=new Map();
    const f=x=>{let r=x;while(par.get(r)!==r)r=par.get(r);while(par.get(x)!==r){const n=par.get(x);par.set(x,r);x=n;}return r;};
    const u=(a,b)=>{const ra=f(a),rb=f(b);if(ra!==rb)par.set(ra,rb);};
    for(const[k,t]of board)for(let i=0;i<6;i++)if(withG||t.e[i]!=='G')par.set(k*6+i,k*6+i);
    for(const[k,t]of board){
      const w=[];
      for(let i=0;i<6;i++){
        const b=t.e[i];if(b==='G'&&!withG)continue;
        if(b==='A')w.push(i);
        else if(t.e[(i+1)%6]===b)u(k*6+i,k*6+(i+1)%6);
        const n=board.get(nb(k,i));if(n&&n.e[opp(i)]===b)u(k*6+i,nb(k,i)*6+opp(i));
      }
      for(let j=1;j<w.length;j++)u(k*6+w[0],k*6+w[j]); // o rio passa pelo centro da peça
    }
    const size=new Map();
    for(const x of par.keys()){const r=f(x);if(!size.has(r))size.set(r,new Set());size.get(r).add(Math.floor(x/6));}
    return{find:f,size:x=>{const r=f(x);return size.has(r)?size.get(r).size:0;},has:x=>par.has(x),members:size};
  }

  function isPerfect(board,k){
    const t=board.get(k);if(!t)return false;
    for(let d=0;d<6;d++){const n=board.get(nb(k,d));if(!n||!matches(t.e[d],t,n.e[opp(d)],n))return false;}
    return true;
  }

  /* aplica uma colocação e devolve o novo estado + o relatório do que aconteceu */
  function place(s,k,r){
    const tile=cur(s),pass=k==null,e=pass?null:rot(tile.e,r),me=pass?null:{e,i:s.next,sp:tile.sp};
    const board=new Map(s.board);if(!pass)board.set(k,me);
    const rep={pts:0,match:0,perfect:[],questsDone:[],questsFailed:[],newlyAlive:[],tiles:0,edges:[],seasonUp:[],aflu:[],pass,
      p:{match:0,perfect:0,quest:0,flow:0,special:0,aflu:0,cheia:0,prod:0,harvest:0},t:{perfect:0,quest:0,season:0,special:0,aflu:0}};
    if(!pass)for(let d=0;d<6;d++){const n=board.get(nb(k,d));if(n){const m=matches(e[d],me,n.e[opp(d)],n);rep.edges.push({d,m});if(m)rep.match++;}}
    rep.pts+=rep.match;rep.p.match=rep.match;
    const perfectSet=new Set(s.perfectSet);
    if(!pass)for(const c of[k,...[0,1,2,3,4,5].map(d=>nb(k,d))])if(!perfectSet.has(c)&&isPerfect(board,c)){perfectSet.add(c);rep.perfect.push(c);rep.pts+=PERFECT_PTS;rep.tiles+=1;rep.p.perfect+=PERFECT_PTS;rep.t.perfect+=1;}
    const G=groups(board);
    // água viva (na seca, só por mata ciliar)
    const alive=computeAlive(board,s.seca,s.seca?s.cut:null);
    const everAlive=new Set(s.everAlive);
    if(CFG.econ){const dP=production(board,alive)-production(s.board,s.alive);rep.prod=dP;if(dP>0){rep.pts+=dP;rep.p.prod=dP;}}
    for(const kk of alive)if(!s.alive.has(kk)){
      rep.newlyAlive.push(kk);if(everAlive.has(kk))continue;everAlive.add(kk);rep.pts+=CFG.flowPts;rep.p.flow+=CFG.flowPts;
      const sp=board.get(kk).sp;
      if(sp==='falls'){rep.pts+=6;rep.p.special+=6;}
      if(sp==='lake'){rep.pts+=8;rep.p.special+=8;rep.tiles+=1;rep.t.special+=1;}
    }
    // afluentes (v2.4): a vereda cujo rio chega à rede da nascente
    const joined=(s.joined||[]).slice();
    if(!pass&&CFG.veredas){const net=mainNet(board);for(const[kk,tt]of board)if(tt.vereda&&net.has(kk)&&!joined.includes(kk)){
      joined.push(kk);rep.aflu.push(kk);rep.pts+=CFG.afluPts;rep.tiles+=CFG.afluTiles;rep.p.aflu+=CFG.afluPts;rep.t.aflu+=CFG.afluTiles;}}
    // missões
    const quests=s.quests.map(q=>({...q}));
    // seca com água na missão de água: ela se resolve quando a seca chega (fora das lições, que não têm ano)
    const flowSeca=CFG.flowSeca&&!s.noSeasons;
    // não nasce missão que a pilha não consegue cumprir
    const leftAfter=s.left-1+rep.tiles;
    if(!pass&&tile.quest&&(tile.quest.flow?leftAfter>=3:leftAfter>=tile.quest.add+1)){const edge=e.findIndex(b=>b===tile.quest.b),tq=tile.quest,T=s.turn+1;
      if(tq.flow&&flowSeca){// prazo: a próxima seca (se faltar pouco para ela, a do ano seguinte)
        const ph=phase(s.season),len=seasonLen(s.season);let rem=ph===0?len-s.clock:(len-s.clock)+CFG.aguas;if(ph===0&&rem<3)rem+=CFG.seca+CFG.aguas;
        quests.push({key:k,edge,b:'A',n:0,flow:true,seca:true,status:'open',due:s.turn+rem});}
      // missão com prazo: crescer a região em +2 a +4 peças em poucas jogadas (mais tempo para terreno mais raro)
      else if(CFG.qMode==='prazo'){const n=tq.flow?0:G.size(k*6+edge)+tq.add;
        quests.push({key:k,edge,b:tq.b,n,flow:!!tq.flow,status:'open',due:T+questDue(tq)});}
      else quests.push({key:k,edge,b:tq.b,n:tq.n,flow:!!tq.flow,status:'open',due:999});}
    for(const q of quests){
      if(q.status!=='open')continue;
      const late=CFG.qMode==='prazo'&&s.turn+1>=q.due;
      if(q.flow){if(q.seca)continue;// resolvida na chegada da seca, mais abaixo
        if(alive.has(q.key)){q.status='done';rep.questsDone.push(q);rep.pts+=10;rep.tiles+=QUEST_TILES;rep.p.quest+=10;rep.t.quest+=QUEST_TILES;}
        else if(late){q.status='late';rep.questsFailed.push(q);}continue;}
      const size=G.size(q.key*6+q.edge);q.cur=size;
      if(CFG.qMode==='prazo'?size>=q.n:size===q.n){q.status='done';rep.questsDone.push(q);rep.pts+=2*q.n;rep.tiles+=QUEST_TILES;rep.p.quest+=2*q.n;rep.t.quest+=QUEST_TILES;}
      else if(CFG.qMode==='prazo'?late:size>q.n){q.status=CFG.qMode==='prazo'?'late':'fail';rep.questsFailed.push(q);}
    }
    // o tempo passa: Águas (8 jogadas) e Seca (4 jogadas)
    let score=s.score+rep.pts,season=s.season,seca=s.seca,clock=s.clock+1,curAlive=alive;rep.events=[];
    let store=s.store||{comida:0,lenha:0},cut=s.cut||new Set(),toco=s.toco||new Map(),pend=s.pend||null,ald={atend:0,casas:0,farto:0,ano:0,cortes:0,fri:0,pts:0,tiles:0};
    let kept=0,dried=0,tSeca=0,secas=0;
    if(!s.noSeasons&&clock>=seasonLen(season)){
      season++;clock=0;rep.seasonUp.push(season);
      if(phase(season)===1){ // chegou a seca: só corre o rio com mata ciliar
        const before=curAlive;seca=true;
        const useAld=CFG.aldeia&&!s.lesson,plan=useAld?despensaPlan(board,{...s,store},season):null;
        if(plan){cut=plan.cutSet;curAlive=plan.aliveS;store={comida:plan.comidaHave-plan.atendidas*CFG.dComida,lenha:plan.lenhaHave-plan.atendidas*plan.lenhaCasa};
          pend={atendidas:plan.atendidas,casas:plan.casas,fri:plan.fri,casasOk:plan.casasOk,novos:plan.cut};ald.cortes=plan.cut.length;ald.fri=plan.fri?1:0;
          rep.events.push({type:'despensa',year:yearOf(season),...plan,cutSet:undefined,aliveS:undefined,reach:undefined,store});}
        else curAlive=computeAlive(board,true);
        const lost=[...before].filter(x=>!curAlive.has(x)),keptN=nSrc(board,curAlive),pts=keptN*CFG.keptPts,gain=secaGain(keptN,yearOf(season));
        score+=pts;rep.tiles+=gain;rep.t.season+=gain;kept=keptN;dried=lost.length;tSeca=gain;secas=1;
        // a colheita do vale em pontos (v3). Com a aldeia ela vale CFG.colheita por ponto produzido: o rio vivo na seca rende
        let harvest=0,hy=[];const hMul=CFG.aldeia&&!s.lesson?CFG.colheita:1;if(CFG.econ&&hMul){const gs=irrigSet(board,curAlive);for(const kk of board.keys()){const y=yieldOf(board,gs,kk);if(y&&y.sum){harvest+=y.sum;hy.push([kk,y.sum]);}}
          harvest=Math.floor(harvest*hMul);score+=harvest;rep.p.harvest+=harvest;}
        rep.events.push({type:'seca',lost,kept:keptN,keptKeys:[...curAlive].filter(x=>!board.get(x).src),pts,gain,per:keptDiv(yearOf(season)),year:yearOf(season),harvest,hy});
        // missões de água: a peça precisa estar com água correndo agora, na seca
        for(const q of quests){if(q.status!=='open'||!q.seca)continue;
          if(curAlive.has(q.key)){q.status='done';rep.questsDone.push(q);score+=10;rep.tiles+=QUEST_TILES;rep.p.quest+=10;rep.t.quest+=QUEST_TILES;}
          else{q.status='late';rep.questsFailed.push(q);}}
      }else{ // as chuvas voltam
        // a mata rebrota: a de dois anos volta a ser mata; a cortada nesta seca fica em toco por mais um ano
        const tocoNovo=new Map();for(const[k,y]of toco)if(y>1)tocoNovo.set(k,y-1);
        if(CFG.toco&&pend&&pend.novos)for(const k of pend.novos)tocoNovo.set(k,CFG.toco);
        const rebrota=[...cut].filter(x=>!tocoNovo.has(x));
        seca=false;cut=new Set();toco=tocoNovo;const before=curAlive;curAlive=computeAlive(board,false);
        rep.tiles+=CFG.rain;rep.t.season+=CFG.rain;
        // o ano da aldeia: casas atendidas na seca rendem pontos e trazem gente nova (peças)
        if(pend){// peças fixas por ano (não crescem com a aldeia, senão a pilha dispara): todas atendidas +3; metade ou mais +2
          const pts=pend.atendidas*CFG.pCasa,tl=!pend.casas?0:pend.atendidas>=pend.casas?CFG.pecaFarto:2*pend.atendidas>=pend.casas?CFG.pecaMeio:0;score+=pts;rep.tiles+=tl;
          ald={...ald,atend:pend.atendidas,casas:pend.casas,farto:pend.casas&&pend.atendidas>=pend.casas?1:0,ano:pend.casas?1:0,pts,tiles:tl};
          rep.events.push({type:'ano',year:yearOf(season)-1,atendidas:pend.atendidas,casas:pend.casas,fri:pend.fri,pts,tiles:tl,farto:!!ald.farto,rebrota,toco:[...toco.keys()]});pend=null;}
        // a cheia (v2.4): cada peça verde vale CFG.cheia
        const green=CFG.cheia?[...greenSet(board,curAlive)]:[],cp=green.length*CFG.cheia;score+=cp;rep.p.cheia+=cp;
        rep.events.push({type:'chuva',back:[...curAlive].filter(x=>!before.has(x)),year:yearOf(season),rain:CFG.rain,cheia:cp,green});
      }
    }
    rep.pts=score-s.score;
    const st=s.stats,stats={match:st.match+rep.p.match,perfect:st.perfect+rep.p.perfect,quest:st.quest+rep.p.quest,flow:st.flow+rep.p.flow,
      special:st.special+rep.p.special,tPerfect:st.tPerfect+rep.t.perfect,tQuest:st.tQuest+rep.t.quest,tSeason:st.tSeason+rep.t.season,
      tSpecial:st.tSpecial+rep.t.special,failed:rep.questsFailed.length?st.failed.concat(rep.questsFailed.map(q=>({b:q.b,n:q.n,cur:q.cur}))):st.failed,
      best:rep.pts>st.best.pts?{pts:rep.pts,turn:s.turn+1,k}:st.best,
      kept:st.kept+kept,dried:st.dried+dried,secas:st.secas+secas,
      aflu:(st.aflu||0)+rep.p.aflu,tAflu:(st.tAflu||0)+rep.t.aflu,cheia:(st.cheia||0)+rep.p.cheia,cheias:(st.cheias||0)+(rep.p.cheia?1:0),prod:(st.prod||0)+rep.p.prod,harvest:(st.harvest||0)+rep.p.harvest,harvests:(st.harvests||0)+(rep.p.harvest?1:0),
      atend:(st.atend||0)+ald.atend,casasAno:(st.casasAno||0)+ald.casas,fartos:(st.fartos||0)+ald.farto,anos:(st.anos||0)+ald.ano,cortes:(st.cortes||0)+ald.cortes,fri:(st.fri||0)+ald.fri,pCasa:(st.pCasa||0)+ald.pts,tCasa:(st.tCasa||0)+ald.tiles,passes:(st.passes||0)+(pass?1:0)};
    for(const kk of curAlive)everAlive.add(kk);
    const n={...s,board,next:s.next+1,left:s.left-1+rep.tiles,score,season,clock,quests,alive:curAlive,everAlive,seca,perfectSet,stats,store,cut,toco,pend,
      placed:s.placed+(pass?0:1),perfects:s.perfects+rep.perfect.length,questsDone:s.questsDone+rep.questsDone.length,turn:s.turn+1,
      actions:s.actions.concat([{k:pass?null:k,r:pass?0:r}]),joined};
    resolve(n,n.next);resolve(n,n.next+1);
    return{state:n,rep};
  }
  function questProgress(s){
    const G=groups(s.board);
    return s.quests.filter(q=>q.status==='open').map(q=>({...q,cur:q.flow?0:G.size(q.key*6+q.edge),left:q.due-s.turn}));
  }
  function options(s,k){
    if(s.board.has(k))return[];
    const tile=cur(s);if(!tile)return[];
    return rotations(tile.e).filter(o=>legal(s.board,k,o.e)).map(o=>{const{rep}=place(s,k,o.r);return{r:o.r,e:o.e,rep};})
      .sort((a,b)=>(b.rep.pts+4*b.rep.tiles)-(a.rep.pts+4*a.rep.tiles));
  }
  const over=s=>s.left<=0;

  // ---------- fauna do Cerrado (v1.3): bichos que voltam quando o vale tem o lugar certo para eles.
  // Não dá pontos nem peças: é coleção (o Caderno) e vida no vale. Cada condição cabe numa frase e se vê no tabuleiro.
  const FAUNA=[
    {id:'seriema',name:'Seriema',rar:1,cond:'Um pasto com 6 peças.',hint:'Canta alto no capim aberto.'},
    {id:'tucano',name:'Tucano',rar:1,cond:'Um bosque com 6 peças.',hint:'Precisa de mata para comer frutos.'},
    {id:'joao',name:'João-de-barro',rar:1,cond:'Uma vila com 4 peças.',hint:'Faz casa de barro perto das casas da gente.'},
    {id:'garca',name:'Garça',rar:1,cond:'2 brejos com água viva (rio vivo que termina em terra).',hint:'Pesca na água parada.'},
    {id:'capivara',name:'Capivara',rar:2,cond:'6 peças com água viva ao mesmo tempo.',hint:'Não vive longe da água.'},
    {id:'ema',name:'Ema',rar:2,cond:'Um campo com 8 peças.',hint:'Corre pelas lavouras grandes.'},
    {id:'martim',name:'Martim-pescador',rar:2,cond:'Uma cachoeira com água viva.',hint:'Mergulha onde a água cai.'},
    {id:'anta',name:'Anta',rar:2,cond:'Um bosque com 6 peças e rio vivo passando por dentro.',hint:'Mora na mata de galeria, à beira do rio.'},
    {id:'lobo',name:'Lobo-guará',rar:3,cond:'Um pasto com 8 peças encostado num bosque com 8 peças.',hint:'Anda na beira entre o campo aberto e a mata.'},
    {id:'tamandua',name:'Tamanduá-bandeira',rar:3,cond:'Um pasto com 12 peças.',hint:'Come cupim nos pastos sem fim.'},
    {id:'onca',name:'Onça-pintada',rar:4,cond:'Na seca, 10 trechos de rio continuam correndo.',hint:'Só volta a um vale que cuida do rio na seca.'},
  ];
  // o que o vale oferece agora: maior região de cada bioma, água viva, brejos, cachoeira viva, mata com rio, pasto encostado em mata
  function habitat(s){
    const board=s.board,G=groups(board,true),big={G:0,C:0,B:0,V:0},bio=x=>board.get(Math.floor(x/6)).e[x%6];
    const sizeOf=new Map();
    for(const[r,set]of G.members){const b=bio(r);sizeOf.set(r,set.size);if(b in big&&set.size>big[b])big[b]=set.size;}
    let gallery=0;for(const[r,set]of G.members){if(bio(r)!=='B'||set.size<6)continue;for(const k of set)if(s.alive.has(k)){gallery=Math.max(gallery,set.size);break;}}
    let brejos=0,falls=false;
    for(const k of s.alive){const t=board.get(k);if(t.sp==='falls')falls=true;
      for(let d=0;d<6;d++){if(t.e[d]!=='A')continue;const n=board.get(nb(k,d));if(n&&n.e[opp(d)]!=='A'){brejos++;break;}}}
    let edge=0;const pair=(a,b)=>{const ra=G.find(a),rb=G.find(b);edge=Math.max(edge,Math.min(sizeOf.get(ra)||0,sizeOf.get(rb)||0));};
    for(const[k,t]of board)for(let i=0;i<6;i++){if(t.e[i]!=='G')continue;
      const j=(i+1)%6,h=(i+5)%6;if(t.e[j]==='B')pair(k*6+i,k*6+j);if(t.e[h]==='B')pair(k*6+i,k*6+h);
      const n=board.get(nb(k,i));if(n&&n.e[opp(i)]==='B')pair(k*6+i,nb(k,i)*6+opp(i));}
    const al=nSrc(board,s.alive);return{big,alive:al,gallery,brejos,falls,edge,secaRun:s.seca?al:0};
  }
  const FAUNA_TEST={seriema:h=>[h.big.G,6],tucano:h=>[h.big.B,6],joao:h=>[h.big.V,4],garca:h=>[h.brejos,2],
    capivara:h=>[h.alive,6],ema:h=>[h.big.C,8],martim:h=>[h.falls?1:0,1],anta:h=>[h.gallery?6:0,6],
    lobo:h=>[h.edge,8],tamandua:h=>[h.big.G,12],onca:h=>[h.secaRun,10]};
  // progresso de cada bicho: [quanto o vale tem, quanto precisa]
  function faunaProgress(s){const h=habitat(s),out={};for(const f of FAUNA)out[f.id]=FAUNA_TEST[f.id](h);return out;}
  // registra os bichos que apareceram nesta partida (e em que jogada)
  function faunaStep(s){if(s.lesson)return s;const pr=faunaProgress(s),fauna={...(s.fauna||{})};let add=false;
    for(const f of FAUNA){const[a,b]=pr[f.id];if(a>=b&&fauna[f.id]==null){fauna[f.id]=s.turn;add=true;}}
    return add?{...s,fauna}:s;}
  const setProtect=(s,v)=>({...s,protect:!!v,actions:s.actions.concat([{t:'mata',v:!!v}])});
  function replay(seedKey,actions){let s=newGame(seedKey);for(const a of actions||[]){if(a.t==='mata'){s=setProtect(s,a.v);continue;}if(over(s))break;s=faunaStep(place(s,a.k,a.r).state);}return s;}
  const pass=s=>place(s,null,0);

  // ---------- bots de referência (v1.3): definem os marcos de cada vale.
  // guloso: maior ganho imediato (peça ganha = 4 pontos). cuidadoso: + protege o rio para a seca.
  // mestre: + persegue as missões. Os três jogam a mesma pilha que a pessoa, sem ver o futuro.
  const questBefore=s=>new Map(questProgress(s).map(q=>[q.key+':'+q.edge,q.cur]));
  function botValue(s,ns,rep,pol,before){
    let v=rep.pts+4*rep.tiles;if(pol==='guloso')return v;
    {const near=phase(ns.season)===0&&seasonLen(ns.season)-ns.clock<=5;
     if(CFG.aldeia&&!ns.lesson&&!ns.seca){const P=despensaPlan(ns.board,ns,nextSeca(ns)),safe=nSrc(ns.board,P.aliveS);
       v+=(near?2.5:1.2)*safe+(near?1:0.45)*CFG.pCasa*P.atendidas+0.15*(P.comidaHave+P.lenhaHave);}
     else{const aS=computeAlive(ns.board,true,ns.seca?ns.cut:ns.toco),safe=nSrc(ns.board,aS);
       v+=(near?2.5:1.2)*safe+(CFG.cheia?0.35*greenSet(ns.board,computeAlive(ns.board,false)).size*CFG.cheia:0)+(CFG.econ?(near?0.8:0.35)*production(ns.board,aS):0);}}
    if(pol==='cuidadoso')return v;
    before=before||questBefore(s);
    if(before.size)for(const q of questProgress(ns)){if(q.flow)continue;const b0=before.get(q.key+':'+q.edge);if(b0!=null&&q.cur>b0)v+=2.5*Math.min(q.cur-b0,Math.max(0,q.n-b0));}
    return v;
  }
  const questDue=tq=>tq.flow?CFG.flowDue:Math.round(tq.add*((CFG.qMulT&&CFG.qMulT[tq.b])||CFG.qMul))+CFG.qSlack;
  // os K melhores lances de agora seguem para a peça seguinte (que a pessoa também vê): valor = agora + melhor ganho imediato da próxima
  function bestNext(ns){const t=cur(ns);if(!t||over(ns))return 0;let b=0;
    for(const k of slots(ns))for(const o of rotations(t.e)){if(!legal(ns.board,k,o.e))continue;const{rep}=place(ns,k,o.r),v=rep.pts+4*rep.tiles;if(v>b)b=v;}return b;}
  function botPlay(seedKey,pol,opt){
    let s=newGame(seedKey);if(opt&&opt.protect===false)s=setProtect(s,false);
    while(!over(s)&&s.turn<400){
      const before=pol==='mestre'?questBefore(s):null,cand=[];
      for(const k of slots(s))for(const o of rotations(cur(s).e)){if(!legal(s.board,k,o.e))continue;
        const{state:ns,rep}=place(s,k,o.r);cand.push({k,r:o.r,ns,v:botValue(s,ns,rep,pol,before)});}
      if(!cand.length){s=pass(s);continue;}
      cand.sort((a,b)=>b.v-a.v);let best=cand[0];
      if(CFG.look&&CFG.lookPols.includes(pol)){let bv=-1e9;for(const c of cand.slice(0,CFG.lookK)){const v=c.v+0.9*bestNext(c.ns);if(v>bv){bv=v;best=c;}}}
      s=best.ns;
    }
    const x=s.stats;
    return{score:s.score,placed:s.placed,season:s.season,quests:s.questsDone,perfects:s.perfects,
      src:{match:x.match,flow:x.flow,quest:x.quest,perfect:x.perfect,special:x.special,seca:x.kept,cheia:x.cheia||0,prod:x.prod||0,harvest:x.harvest||0,atend:x.atend||0},atend:x.atend||0,aflu:(s.joined||[]).length,tiles:{quest:x.tQuest,perfect:x.tPerfect,season:x.tSeason},act:s.actions};
  }
  const parScore=seedKey=>botPlay(seedKey,'guloso');
  return{despensaPlan,aldeiaOf,friagem,setProtect,nextSeca,irrigSet,production,yieldOf,questDue,pass,canPlay,greenSet,mainNet,QUEST_TILES,DIRS,K,KQ,KR,nb,opp,SRC,START,SPECIALS,FAUNA,habitat,faunaProgress,faunaStep,botPlay,botValue,seasonAt,seasonName,phase,yearOf,balance,CYCLE,CFG,LESSONS,computeAlive,shielded,cur,peek,newGame,place,options,slots,legal,rotations,questProgress,over,replay,parScore,hashStr,rot,groups};
}
