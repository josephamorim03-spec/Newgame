function Engine(){
  /* Afluente v0.4 — encaixe de peças hexagonais (inspirado no laço do Dorfromantik) com água viva.
     Cada peça tem 6 lados: G pasto, C campo, B bosque, V vila, A água.
     - Qualquer peça cabe em qualquer casa vazia; lados que não combinam só não pontuam. Rio contra terra vira brejo.
     - +1 ponto por lado que combina. Peça cercada com os 6 lados combinando = Perfeita: +5 e +1 peça.
     - Missões com número exato ("Bosque 7"): cumprir = +3 peças e pontos; passar do número = falha.
     - A água só corre no rio ligado à nascente; cada peça que passa a ter água viva rende +2.
     - O jogo acaba quando a pilha acaba.
     v0.5 — Estações do rio: metas de pontos crescentes; cada estação alcançada dá +4 peças e libera
     peças especiais (Cachoeira, Ponte, Lagoa) que começam a aparecer na pilha. Estatísticas para o relatório final.
     v0.6 — O ano no vale (sustentabilidade). O tempo passa: a cada 4 peças colocadas a estação muda,
       num ano de 16 jogadas: Águas → Cheia → Colheita → Seca (o inverno do Cerrado).
       Colheita: cada peça com campo e água viva por perto guarda 1 de comida (+1 ponto) e cada 2 rendem +1 peça.
       Seca: o rio só corre por peças com mata ciliar (lado de bosque na própria peça, ou o lado da vizinha virado
         para ela é bosque). Trecho sem mata seca, e tudo rio abaixo seca junto, até as chuvas voltarem.
       Ano novo (volta das Águas): cada casa (peça com vila) que teve água por perto na seca e comida no celeiro
         rende +3 e +1 peça; casa com fome custa −1 peça. A fome cresce: no ano 2 cada casa come 1,5; no ano 3, 2…
         As chuvas voltam com +2 peças. A água que volta não pontua de novo (só a primeira vez que uma peça recebe água).
       As peças especiais entram na pilha conforme o ano anda (Cachoeira na Cheia, Ponte na Colheita, Lagoa na Seca). */
  const DIRS=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
  const K=(q,r)=>(q+64)*128+(r+64),KQ=k=>Math.floor(k/128)-64,KR=k=>(k%128)-64;
  const nb=(k,d)=>K(KQ(k)+DIRS[d][0],KR(k)+DIRS[d][1]);
  const opp=d=>(d+3)%6;
  const START=22,PERFECT_PTS=5,QUEST_TILES=3,FLOW_PTS=2,SEASON_TILES=0;
  const CFG={slen:4,harvestDiv:2,fedDiv:1,hungryDiv:1,rainTiles:2,housePts:3,grow:true,growRate:0.5,gainCap:99,shield:'touch',...(typeof AFLUENTE_CFG!=='undefined'?AFLUENTE_CFG:{})};
  const SEASON_AT=[0,0,35,95,180,290,420,570,740,930];
  const seasonAt=n=>n<SEASON_AT.length?SEASON_AT[n]:SEASON_AT[SEASON_AT.length-1]+220*(n-SEASON_AT.length+1);
  const CYCLE=['Águas','Cheia','Colheita','Seca'];
  const phase=n=>(n-1)%4; // 0 Águas, 1 Cheia, 2 Colheita, 3 Seca
  const seasonName=n=>CYCLE[phase(n)]+(n>4?' · ano '+Math.ceil(n/4):'');
  // peças especiais: liberadas por estação
  const SPECIALS=[
    {id:'falls',season:2,name:'Cachoeira',e:['A','B','B','A','G','G'],desc:'+6 quando a água chega'},
    {id:'bridge',season:3,name:'Ponte',e:['A','V','V','A','V','V'],desc:'os lados de terra combinam com qualquer terra'},
    {id:'lake',season:4,name:'Lagoa',e:['A','A','G','A','A','G'],desc:'+8 e +1 peça quando a água chega'},
  ];
  const SRC=K(0,0);

  function hashStr(s){let h=1779033703^s.length;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),3432918353);h=h<<13|h>>>19;}h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return(h^h>>>16)>>>0;}
  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  const rot=(e,r)=>e.map((_,i)=>e[(i-r+6)%6]);

  function genTile(rng,i){
    const pick=w=>{let t=rng()*w.reduce((a,b)=>a+b[1],0);for(const[k,v]of w){if((t-=v)<0)return k;}return w[0][0];};
    const LAND=[['B',30],['C',26],['V',13],['G',31]];
    let e;const roll=rng();
    if(roll<0.24){
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
      if(bs.length){const b=bs[Math.floor(rng()*bs.length)];quest=b==='A'?{b,flow:true}:{b,n:4+Math.floor(rng()*6)};}
    }
    return{e,quest,sroll:rng(),spick:rng(),srot:Math.floor(rng()*6)};
  }

  function newGame(seedKey){
    const rng=mulberry32(hashStr('v05:'+seedKey));
    const tiles=[];for(let i=0;i<400;i++)tiles.push(genTile(rng,i));
    const board=new Map([[SRC,{e:['A','G','A','G','A','G'],src:true}]]);
    const s={seedKey,tiles,board,next:0,left:START,score:0,quests:[],alive:new Set([SRC]),perfectSet:new Set(),
      placed:0,perfects:0,questsDone:0,turn:0,actions:[],season:1,drawn:{},everAlive:new Set([SRC]),seca:false,food:0,
      stats:{match:0,perfect:0,quest:0,flow:0,special:0,tPerfect:0,tQuest:0,tSeason:0,tSpecial:0,failed:[],best:{pts:0,turn:0,k:null},harvest:0,village:0,tVillage:0,hungry:0,dried:0}};
    resolve(s,0);resolve(s,1);
    return s;
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
  function shielded(board,k){const t=board.get(k);if(t.src)return true;
    if(CFG.shield==='any'){if(t.e.includes('B'))return true;for(let d=0;d<6;d++){const n=board.get(nb(k,d));if(n&&n.e.includes('B'))return true;}return false;}
    // a mata precisa encostar no rio: lado de bosque na própria peça, ou o lado da vizinha virado para ela é bosque
    if(t.e.includes('B'))return true;for(let d=0;d<6;d++){const n=board.get(nb(k,d));if(n&&n.e[opp(d)]==='B')return true;}return false;}
  // água viva: da nascente, passando por lados de água que se encontram; na seca, só por peças protegidas
  function computeAlive(board,seca){
    const alive=new Set([SRC]),q=[SRC];
    while(q.length){const k=q.pop(),t=board.get(k);
      for(let d=0;d<6;d++){if(t.e[d]!=='A')continue;const n=nb(k,d),tn=board.get(n);
        if(!tn||alive.has(n)||tn.e[opp(d)]!=='A')continue;if(seca&&!shielded(board,n))continue;alive.add(n);q.push(n);}}
    return alive;
  }
  const wetTile=(board,alive,k)=>{if(alive.has(k))return true;for(let d=0;d<6;d++)if(alive.has(nb(k,d)))return true;return false;};
  function foodCount(board,alive){let n=0;for(const[k,t]of board)if(t.e.includes('C')&&wetTile(board,alive,k))n++;return n;}
  function houses(board,alive){let h=0,w=0;for(const[k,t]of board){if(!t.e.includes('V'))continue;h++;if(wetTile(board,alive,k))w++;}return{houses:h,watered:w};}
  // previsões para o painel de equilíbrio: o que a seca vai secar, quanta comida a colheita guarda, quantas casas comem
  function balance(s){
    const full=s.seca?computeAlive(s.board,false):s.alive,aliveSeca=s.seca?s.alive:computeAlive(s.board,true);
    const risk=[],dryHouses=[],fields=[],homes=[];
    for(const k of full)if(k!==SRC&&!aliveSeca.has(k))risk.push(k);
    for(const[k,t]of s.board){if(t.e.includes('C')&&wetTile(s.board,full,k))fields.push(k);
      if(t.e.includes('V')){homes.push(k);if(!wetTile(s.board,aliveSeca,k))dryHouses.push(k);}}
    const ph=phase(s.season),year=Math.floor((s.season-1)/4)+1,need=CFG.grow?1+CFG.growRate*(year-1):1;
    const food=ph<2?fields.length:s.food,watered=homes.length-dryHouses.length,fed=Math.min(watered,Math.floor(food/need));
    return{phase:ph,year,need,seca:s.seca,food:s.food,foodNow:fields.length,foodFc:food,houses:homes.length,watered,fed,
      river:full.size-1,riverSafe:aliveSeca.size-1,risk,dryHouses,fields,homes,turnsLeft:CFG.slen-(s.turn%CFG.slen),slen:CFG.slen};
  }
  const cur=s=>s.drawn[s.next];
  const peek=(s,n)=>s.drawn[s.next+n];
  // lados combinam se são iguais; a Ponte combina com qualquer terra
  function matches(a,ta,b,tb){
    if(a===b)return true;
    if(a==='A'||b==='A')return false;
    return ta.sp==='bridge'||tb.sp==='bridge';
  }

  // Qualquer peça cabe em qualquer casa vazia encostada no vale. Rio que bate em terra termina num brejo:
  // aquele lado não combina (não pontua) e a água não passa. (A proibição antiga criava buracos impossíveis.)
  function legal(board,k,e){return true;}
  function slots(s){
    const out=new Set();
    for(const k of s.board.keys())for(let d=0;d<6;d++){const n=nb(k,d);if(!s.board.has(n))out.add(n);}
    return[...out];
  }
  function rotations(e){const seen=new Set(),out=[];for(let r=0;r<6;r++){const x=rot(e,r),key=x.join('');if(!seen.has(key)){seen.add(key);out.push({r,e:x});}}return out;}

  // grupos: triângulos (peça, lado) de mesmo bioma conectados; tamanho = nº de peças distintas
  function groups(board){
    const par=new Map();
    const f=x=>{let r=x;while(par.get(r)!==r)r=par.get(r);while(par.get(x)!==r){const n=par.get(x);par.set(x,r);x=n;}return r;};
    const u=(a,b)=>{const ra=f(a),rb=f(b);if(ra!==rb)par.set(ra,rb);};
    for(const[k,t]of board)for(let i=0;i<6;i++)if(t.e[i]!=='G')par.set(k*6+i,k*6+i);
    for(const[k,t]of board){
      const w=[];
      for(let i=0;i<6;i++){
        const b=t.e[i];if(b==='G')continue;
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
    const tile=cur(s),e=rot(tile.e,r),me={e,i:s.next,sp:tile.sp};
    const board=new Map(s.board);board.set(k,me);
    const rep={pts:0,match:0,perfect:[],questsDone:[],questsFailed:[],newlyAlive:[],tiles:0,edges:[],seasonUp:[],
      p:{match:0,perfect:0,quest:0,flow:0,special:0},t:{perfect:0,quest:0,season:0,special:0}};
    for(let d=0;d<6;d++){const n=board.get(nb(k,d));if(n){const m=matches(e[d],me,n.e[opp(d)],n);rep.edges.push({d,m});if(m)rep.match++;}}
    rep.pts+=rep.match;rep.p.match=rep.match;
    const perfectSet=new Set(s.perfectSet);
    for(const c of[k,...[0,1,2,3,4,5].map(d=>nb(k,d))])if(!perfectSet.has(c)&&isPerfect(board,c)){perfectSet.add(c);rep.perfect.push(c);rep.pts+=PERFECT_PTS;rep.tiles+=1;rep.p.perfect+=PERFECT_PTS;rep.t.perfect+=1;}
    const G=groups(board);
    // água viva (na seca, só por mata ciliar)
    const alive=computeAlive(board,s.seca);
    const everAlive=new Set(s.everAlive);
    for(const kk of alive)if(!s.alive.has(kk)){
      rep.newlyAlive.push(kk);if(everAlive.has(kk))continue;everAlive.add(kk);rep.pts+=FLOW_PTS;rep.p.flow+=FLOW_PTS;
      const sp=board.get(kk).sp;
      if(sp==='falls'){rep.pts+=6;rep.p.special+=6;}
      if(sp==='lake'){rep.pts+=8;rep.p.special+=8;rep.tiles+=1;rep.t.special+=1;}
    }
    // missões
    const quests=s.quests.map(q=>({...q}));
    if(tile.quest){const edge=e.findIndex(b=>b===tile.quest.b);quests.push({key:k,edge,b:tile.quest.b,n:tile.quest.n,flow:!!tile.quest.flow,status:'open'});}
    for(const q of quests){
      if(q.status!=='open')continue;
      if(q.flow){if(alive.has(q.key)){q.status='done';rep.questsDone.push(q);rep.pts+=10;rep.tiles+=QUEST_TILES;rep.p.quest+=10;rep.t.quest+=QUEST_TILES;}continue;}
      const size=G.size(q.key*6+q.edge);q.cur=size;
      if(size===q.n){q.status='done';rep.questsDone.push(q);rep.pts+=2*q.n;rep.tiles+=QUEST_TILES;rep.p.quest+=2*q.n;rep.t.quest+=QUEST_TILES;}
      else if(size>q.n){q.status='fail';rep.questsFailed.push(q);}
    }
    // estações: cada meta alcançada dá peças e libera especiais
    let score=s.score+rep.pts,season=s.season,seca=s.seca,food=s.food,curAlive=alive;rep.events=[];
    let harvest=0,village=0,tVillage=0,hungry=0,dried=0;
    // o tempo passa: a cada CFG.slen jogadas, uma estação nova
    if((s.turn+1)%CFG.slen===0){
      season++;rep.seasonUp.push(season);
      const ph=phase(season);
      if(ph===2){food=foodCount(board,curAlive);score+=food;harvest+=food;const g=Math.floor(food/CFG.harvestDiv);rep.tiles+=g;rep.t.season+=g;rep.events.push({type:'colheita',food,pts:food,gain:g});}
      else if(ph===3){const before=curAlive;seca=true;curAlive=computeAlive(board,true);const lost=[...before].filter(k=>!curAlive.has(k));dried+=lost.length;rep.events.push({type:'seca',dried:lost.length,lost,kept:curAlive.size-1});}
      else if(ph===0){
        const yr=Math.floor((season-1)/4),need=CFG.grow?1+CFG.growRate*(yr-1):1,hv=houses(board,curAlive),fed=Math.min(hv.watered,Math.floor(food/need)),hun=hv.houses-fed;
        const pts=CFG.housePts*fed,gain=Math.min(CFG.gainCap,Math.floor(fed/CFG.fedDiv))+CFG.rainTiles,lose=Math.floor(hun/CFG.hungryDiv);
        score+=pts;village+=pts;tVillage+=gain-lose;hungry+=hun;rep.tiles+=gain-lose;rep.lose=(rep.lose||0)+lose;
        seca=false;food=0;const before=curAlive;curAlive=computeAlive(board,false);var back=[...curAlive].filter(k=>!before.has(k));
        rep.events.push({type:'ano',year:yr+1,need,houses:hv.houses,watered:hv.watered,fed,hungry:hun,pts,gain,lose,rain:CFG.rainTiles,back});
      }
    }
    rep.pts=score-s.score;
    const st=s.stats,stats={match:st.match+rep.p.match,perfect:st.perfect+rep.p.perfect,quest:st.quest+rep.p.quest,flow:st.flow+rep.p.flow,
      special:st.special+rep.p.special,tPerfect:st.tPerfect+rep.t.perfect,tQuest:st.tQuest+rep.t.quest,tSeason:st.tSeason+rep.t.season,
      tSpecial:st.tSpecial+rep.t.special,failed:rep.questsFailed.length?st.failed.concat(rep.questsFailed.map(q=>({b:q.b,n:q.n,cur:q.cur}))):st.failed,
      best:rep.pts>st.best.pts?{pts:rep.pts,turn:s.turn+1,k}:st.best,
      harvest:st.harvest+harvest,village:st.village+village,tVillage:st.tVillage+tVillage,hungry:st.hungry+hungry,dried:st.dried+dried};
    for(const kk of curAlive)everAlive.add(kk);
    const n={...s,board,next:s.next+1,left:(()=>{const L=s.left-1+rep.tiles;return L<1&&L+(rep.lose||0)>=1?1:L;})(),score,season,quests,alive:curAlive,everAlive,seca,food,perfectSet,stats,
      placed:s.placed+1,perfects:s.perfects+rep.perfect.length,questsDone:s.questsDone+rep.questsDone.length,turn:s.turn+1,
      actions:s.actions.concat([{k,r}])};
    resolve(n,n.next);resolve(n,n.next+1);
    return{state:n,rep};
  }
  function questProgress(s){
    const G=groups(s.board);
    return s.quests.filter(q=>q.status==='open').map(q=>({...q,cur:q.flow?0:G.size(q.key*6+q.edge)}));
  }
  function options(s,k){
    if(s.board.has(k))return[];
    const tile=cur(s);if(!tile)return[];
    return rotations(tile.e).filter(o=>legal(s.board,k,o.e)).map(o=>{const{rep}=place(s,k,o.r);return{r:o.r,e:o.e,rep};})
      .sort((a,b)=>(b.rep.pts+4*b.rep.tiles)-(a.rep.pts+4*a.rep.tiles));
  }
  const over=s=>s.left<=0;
  function replay(seedKey,actions){let s=newGame(seedKey);for(const a of actions||[]){if(over(s))break;s=place(s,a.k,a.r).state;}return s;}

  // bot guloso (define o par): maior ganho imediato contando peças ganhas como 4 pontos
  function parScore(seedKey){
    let s=newGame(seedKey);
    while(!over(s)&&s.turn<300){
      let best=null,bv=-1e9;
      for(const k of slots(s))for(const o of rotations(cur(s).e)){
        if(!legal(s.board,k,o.e))continue;
        const{rep}=place(s,k,o.r),v=rep.pts+4*rep.tiles;
        if(v>bv){bv=v;best={k,r:o.r};}
      }
      if(!best)break;
      s=place(s,best.k,best.r).state;
    }
    return{score:s.score,placed:s.placed,season:s.season};
  }
  return{DIRS,K,KQ,KR,nb,opp,SRC,START,SPECIALS,seasonAt,seasonName,phase,balance,CYCLE,CFG,computeAlive,shielded,cur,peek,newGame,place,options,slots,legal,rotations,questProgress,over,replay,parScore,hashStr,rot,groups};
}

