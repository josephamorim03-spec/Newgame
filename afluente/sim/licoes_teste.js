// Confere se as lições se resolvem. Uso: node licoes_teste.js ano_no_vale_motor.js
const E=eval('('+require('fs').readFileSync(process.argv[2],'utf8')+')()');
const goal={'licao-1':s=>s.stats.match>=6,'licao-2':s=>s.questsDone>=1,'licao-3':s=>s.questsDone>=1,'licao-4':s=>s.perfects>=1,'licao-5':s=>s.stats.kept>=3};
for(const id of Object.keys(E.LESSONS))for(const mode of['guia','guloso']){let s=E.newGame(id);const log=[];
  while(!E.over(s)&&!goal[id](s)){let best=null,bv=-1e9;for(const k of E.slots(s))for(const o of E.options(s,k)){
      let v=o.rep.pts+4*o.rep.tiles;if(mode==='guia'&&id==='licao-5')v+=5*E.balance(E.place(s,k,o.r).state).riverSafe;if(v>bv){bv=v;best={k,r:o.r};}}
    const r=E.place(s,best.k,best.r);s=r.state;log.push(E.KQ(best.k)+','+E.KR(best.k)+(r.rep.questsFailed.length?'✗':'')+(r.rep.events.length?JSON.stringify(r.rep.events.map(e=>e.type+':'+e.kept)):''));}
  console.log(id.padEnd(8),mode.padEnd(6),goal[id](s)?'OK ':'FALHA',`jogadas ${s.placed} pts ${s.score}`,log.join(' | '));}
