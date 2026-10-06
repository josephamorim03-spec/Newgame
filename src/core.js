(function (root) {
  'use strict';
  const VERSION = 'ring-break-0.2';
  const TONES = ['Pulse','Echo','Spike','Anchor'];
  const PROTOCOLS = [
    {id:'counterweight',name:'Contrapeso',family:'PHASE',description:'Cada carga de acoplamento usada gera +3 energia.'},
    {id:'drive',name:'Co-rotação',family:'PHASE',description:'Anéis acoplados giram no MESMO sentido. Sua máquina muda de controle.'},
    {id:'mesh',name:'Malha completa',family:'PHASE',description:'Comece a ação com os dois links carregados: todas as ressonâncias dessa ação valem ×2.'},
    {id:'aftertone',name:'Pós-tom',family:'ECHO',description:'A primeira ressonância de cada ação ecoa +50% da sua energia.'},
    {id:'reverb',name:'Reverberação',family:'ECHO',description:'Ondas criadas pela reposição ganham um ×2 extra.'},
    {id:'triad',name:'Tríade',family:'PRISM',description:'Uma vez por ação, o primeiro setor com 3 tons diferentes ressoa por 5 energia.'},
    {id:'fortress',name:'Fortaleza',family:'ANCHOR',description:'Ressoar no setor marcado concede 1 escudo. Absorve o próximo dano.'},
    {id:'foretell',name:'Antevisão',family:'FLUX',description:'Veja 12 tons futuros, em vez de 6. Planeje a próxima cascata.'}
  ];
  const ENCOUNTERS = [
    {name:'NEEDLE',subtitle:'Quebre os pontos fracos.',breakGoal:3,interval:4,kind:'needle'},
    {name:'PARASITE',subtitle:'Rompa o alvo ou esvazie o link.',breakGoal:4,interval:3,kind:'parasite'},
    {name:'THE CLAMP',subtitle:'Rompa o alvo com a máquina parcialmente presa.',breakGoal:5,interval:3,kind:'clamp'}
  ];
  const copy = value => JSON.parse(JSON.stringify(value));
  function hash(seed) {
    let h = 2166136261;
    for (const char of String(seed)) { h ^= char.charCodeAt(0); h = Math.imul(h,16777619); }
    return h >>> 0 || 1;
  }
  function random(s) {
    let a = s.rng += 0x6D2B79F5;
    a = Math.imul(a ^ a >>> 15,a | 1);
    a ^= a + Math.imul(a ^ a >>> 7,a | 61);
    s.rng >>>= 0;
    return ((a ^ a >>> 14) >>> 0) / 4294967296;
  }
  const has = (s,id) => s.protocols.includes(id);
  function glyph(s,tone) { return {id:++s.serial,tone}; }
  function refillQueue(s) { while(s.queue.length<36) s.queue.push(Math.floor(random(s)*4)); }
  function take(s) { refillQueue(s); return glyph(s,s.queue.shift()); }
  function rotate(ring,direction) { return ring.map((_,i)=>ring[(i-direction+8)%8]); }
  function pairs(board) {
    return [0,1].map(edge=>new Set(board[edge].flatMap((g,i)=>{
      const other=board[edge+1][i];
      return g.tone===other.tone && g.tone!==board[2-2*edge][i].tone ? [g.id+':'+other.id] : [];
    })));
  }
  function resonances(board,allowTriad=false) {
    const found=[];
    for(let sector=0;sector<8;sector++) {
      const tones=board.map(r=>r[sector].tone);
      if(tones[0]===tones[1] && tones[1]===tones[2]) found.push({sector,tone:tones[0],base:10});
    }
    if(allowTriad) {
      for(let sector=0;sector<8;sector++) {
        if(new Set(board.map(r=>r[sector].tone)).size===3) {
          found.push({sector,tone:board[0][sector].tone,base:5,triad:true}); break;
        }
      }
    }
    return found.sort((a,b)=>a.sector-b.sector);
  }
  function propagation(s,ring,direction) {
    const dirs=[0,0,0],edges=[];
    dirs[ring]=direction;
    const pending=[ring];
    while(pending.length) {
      const source=pending.shift();
      for(const other of [source-1,source+1]) {
        if(other<0 || other>2 || dirs[other]) continue;
        const edge=Math.min(source,other);
        if(s.locks[edge]>0) { dirs[other]=dirs[source]*(has(s,'drive')?1:-1); edges.push(edge);pending.push(other); }
      }
    }
    return {dirs,edges};
  }
  function preview(s,ring,direction) {
    if(s.status!=='playing' || s.jam===ring) return null;
    const move=propagation(s,ring,direction);
    const board=s.board.map((r,i)=>move.dirs[i]?rotate(r,move.dirs[i]):r);
    return {...move,board,matches:resonances(board,has(s,'triad'))};
  }
  function record(s,id,amount=1) { s.activations[id]=(s.activations[id]||0)+amount; }
  function generateBoard(s,first=false) {
    s.board=Array.from({length:3},()=>Array.from({length:8},()=>glyph(s,Math.floor(random(s)*4))));
    // Stable start: no automatic triples and one learnable opening, independent of seed.
    for(let i=0;i<8;i++) if(s.board.every(r=>r[i].tone===s.board[0][i].tone)) s.board[2][i].tone=(s.board[2][i].tone+1)%4;
    if(first) {
      s.board[0][7].tone=0; s.board[0][0].tone=1;
      s.board[1][0].tone=0; s.board[2][0].tone=0;
      // Clockwise outer rotation creates a Pulse resonance at sector 1.
    }
  }
  function nextIntent(s) {
    const encounter=ENCOUNTERS[s.encounter],previous=s.intent?.sector;
    let sector=s.encounter===0 && s.encounterTurns===0 ? 0 : Math.floor(random(s)*8);
    if(previous!=null && sector===previous) sector=(sector+1+Math.floor(random(s)*7))%8;
    s.intent={sector,count:encounter.interval,neutralized:false,kind:encounter.kind};
    if(encounter.kind==='parasite') s.intent.edge=s.intent.sector%2;
    if(encounter.kind==='clamp') s.jam=(s.turn+s.encounter)%3;
  }
  function startEncounter(s) {
    s.energy=0;s.breaks=0;s.hp=3;s.shield=0;s.jam=-1;s.locks=[0,0];s.encounterTurns=0;
    generateBoard(s,s.encounter===0);s.queue=[];refillQueue(s);
    nextIntent(s);s.status='playing';
  }
  function create(seed='FIRST-LIGHT-2',mode='run') {
    const s={version:VERSION,seed:String(seed).slice(0,80),mode:mode==='free'?'free':'run',rng:hash(seed),serial:0,
      board:[],queue:[],locks:[0,0],protocols:[],activations:{},encounter:0,turn:0,encounterTurns:0,
      total:0,energy:0,breaks:0,hp:3,shield:0,intent:null,jam:-1,status:'playing',maxWave:0,resonanceCount:0,
      locksUsed:0,locksCreated:0,bestMove:0,damage:0,cause:'',actions:[],history:[],offers:[],rewrites:1};
    startEncounter(s);
    if(s.mode==='free') {s.intent=null;s.jam=-1;}
    return s;
  }
  function offer(s) {
    const available=PROTOCOLS.filter(p=>!has(s,p.id)).map(p=>p.id);
    for(let i=available.length-1;i>0;i--) { const j=Math.floor(random(s)*(i+1));[available[i],available[j]]=[available[j],available[i]]; }
    s.offers=available.slice(0,3);
  }
  function discover(events,id,title,text) { events.push({type:'discovery',id,title,text}); }
  function step(source,ring,direction) {
    const s=copy(source),events=[];
    if(![0,1,2].includes(ring) || ![-1,1].includes(direction)) return {state:s,events:[],invalid:true};
    const p=preview(s,ring,direction);
    if(!p) return {state:s,events:[],invalid:true};
    const oldPairs=pairs(s.board),fullMesh=s.locks.every(x=>x>0),totalBefore=s.total;
    s.actions.push({type:'move',ring,direction});s.turn++;s.encounterTurns++;
    const previous=copy(s.board);s.board=copy(p.board);
    for(const edge of p.edges) {s.locks[edge]--;s.locksUsed++;}
    events.push({type:'move',board:previous,dirs:p.dirs,edges:p.edges,locks:copy(s.locks)});
    if(p.edges.length) {
      discover(events,'phase','Acoplamento','Uma carga movimenta o anel vizinho; a propagação pode atravessar os três.');
      if(has(s,'counterweight')) {const energy=p.edges.length*3;s.total+=energy;s.energy+=energy;record(s,'counterweight',p.edges.length);events.push({type:'bonus',energy,label:'CONTRAPESO'});}
    }
    let wave=0,triadUsed=false,echoUsed=false,hitBreak=false,guard=0;
    const seen=new Set();
    while(guard++<32) {
      const matches=resonances(s.board,has(s,'triad') && !triadUsed);
      if(!matches.length) break;
      const signature=JSON.stringify([s.board.map(r=>r.map(g=>g.tone)),s.queue,s.rng,triadUsed]);
      if(seen.has(signature)) {events.push({type:'limit',label:'LOOP ESTABILIZADO'});break;}
      seen.add(signature);wave++;
      const multiplier=2**Math.min(wave-1,10)*(has(s,'mesh') && fullMesh?2:1)*(has(s,'reverb') && wave>1?2:1);
      let gained=0;
      for(const m of matches) {
        let energy=m.base*multiplier;
        if(m.triad) {triadUsed=true;record(s,'triad');}
        if(has(s,'aftertone') && !echoUsed) {energy+=energy*.5;echoUsed=true;record(s,'aftertone');}
        if(has(s,'mesh') && fullMesh) record(s,'mesh');
        if(has(s,'reverb') && wave>1) record(s,'reverb');
        gained+=energy;s.resonanceCount++;
        if(s.mode==='run' && s.intent && wave===1 && !hitBreak && m.sector===s.intent.sector) {
          hitBreak=true;s.intent.neutralized=true;s.breaks++;
          if(has(s,'fortress') && !s.shield) {s.shield=1;record(s,'fortress');events.push({type:'shield'});}
          events.push({type:'break',sector:m.sector,tone:m.tone,breaks:s.breaks,goal:ENCOUNTERS[s.encounter].breakGoal});
        }
      }
      s.total+=gained;s.energy+=gained;s.maxWave=Math.max(s.maxWave,wave);
      events.push({type:'resonance',matches,board:copy(s.board),energy:gained,multiplier,wave,total:s.total,encounterEnergy:s.energy});
      for(const m of matches) for(let r=0;r<3;r++) s.board[r][m.sector]=take(s);
      refillQueue(s);events.push({type:'refill',board:copy(s.board),queue:copy(s.queue)});
      if(wave>=2) discover(events,'cascade','Cascata','A reposição pode ressoar de novo. Cada onda dobra a energia-base.');
      if(triadUsed) discover(events,'triad','Nova gramática','Três tons diferentes também podem ressoar com Tríade.');
    }
    if(guard>32) events.push({type:'limit',label:'ENGINE BREAK · LIMITE TÉCNICO'});
    const newPairs=pairs(s.board);
    for(let edge=0;edge<2;edge++) {
      // A used link rests for this action. This prevents endlessly refilling both links
      // and collapsing six manual choices into the same two rigid motions.
      if(!p.edges.includes(edge) && s.locks[edge]<2 && [...newPairs[edge]].some(key=>!oldPairs[edge].has(key))) {
        s.locks[edge]++;s.locksCreated++;events.push({type:'lock',edge,locks:copy(s.locks)});
      }
    }
    s.bestMove=Math.max(s.bestMove,s.total-totalBefore);
    const encounter=ENCOUNTERS[s.encounter];
    if(s.mode==='run' && s.breaks>=encounter.breakGoal) {
      s.status=s.encounter===2?'won':'draft';s.history.push({encounter:s.encounter,turns:s.encounterTurns,energy:s.energy,breaks:s.breaks,hp:s.hp});
      if(s.status==='draft') offer(s);
      events.push({type:'win',final:s.status==='won'});
    } else if(s.intent) {
      if(hitBreak) nextIntent(s);
      else {
        s.intent.count--;
        if(s.intent.count<=0) {
          const i=s.intent;
          const avoided=i.neutralized || i.kind==='parasite' && s.locks[i.edge]===0;
          if(avoided) events.push({type:'evade',label:i.kind==='parasite'?'LINK VAZIO':'ATAQUE NEUTRALIZADO'});
          else {
            if(i.kind==='parasite') s.locks[i.edge]=0;
            if(s.shield) {s.shield=0;events.push({type:'blocked'});}
            else {s.hp--;s.damage++;events.push({type:'damage',sector:i.sector});}
          }
          if(s.hp<=0) {
            s.status='lost';s.cause=i.kind==='parasite'?'O Parasite drenou um link ainda carregado.':'O ponto fraco no setor '+(i.sector+1)+' não foi rompido a tempo.';
            events.push({type:'lose'});
          } else nextIntent(s);
        }
      }
    }
    return {state:s,events};
  }
  function choose(source,id) {
    const s=copy(source);
    if(s.status!=='draft' || !s.offers.includes(id) || has(s,id) || s.protocols.length>=3) return s;
    s.actions.push({type:'choose',id});s.protocols.push(id);s.encounter++;startEncounter(s);return s;
  }
  function rewrite(source) {
    const s=copy(source);
    if(s.status!=='draft' || !s.rewrites) return s;
    s.rewrites--;s.actions.push({type:'rewrite'});offer(s);return s;
  }
  function configure(seed,protocols) {
    if(!Array.isArray(protocols) || protocols.length>3 || new Set(protocols).size!==protocols.length || protocols.some(id=>!PROTOCOLS.some(p=>p.id===id))) throw Error('Configuração inválida.');
    const s=create(seed,'free');s.protocols=protocols.slice();s.actions.push({type:'configure',protocols:protocols.slice()});return s;
  }
  function replay(data) {
    if(data.version!==VERSION || typeof data.seed!=='string' || !['run','free'].includes(data.mode) || !Array.isArray(data.actions) || data.actions.length>10000) throw Error('Replay incompatível.');
    let s=create(data.seed,data.mode);
    for(const a of data.actions) {
      if(a.type==='move') { const r=step(s,a.ring,a.direction);if(r.invalid) throw Error('Movimento inválido no replay.');s=r.state; }
      else if(a.type==='choose') { const n=choose(s,a.id);if(n.actions.length===s.actions.length) throw Error('Protocolo inválido no replay.');s=n; }
      else if(a.type==='rewrite') { const n=rewrite(s);if(n.actions.length===s.actions.length) throw Error('Rewrite inválido no replay.');s=n; }
      else if(a.type==='configure' && s.mode==='free' && !s.actions.length) s=configure(s.seed,a.protocols);
      else throw Error('Ação desconhecida.');
    }
    return s;
  }
  root.RingCore={VERSION,TONES,PROTOCOLS,ENCOUNTERS,create,step,preview,propagation,resonances,pairs,choose,rewrite,configure,replay,copy};
  if(typeof module!=='undefined' && module.exports) module.exports=root.RingCore;
})(typeof window!=='undefined'?window:globalThis);
