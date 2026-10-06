const C=require('../src/core');
let wins=0,turns=0,dead=0,finished=0;
for(let seed=0;seed<100;seed++){
  let s=C.create('PLAYTEST-'+seed);
  for(let turn=0;turn<150 && !['won','lost'].includes(s.status);turn++){
    if(s.status==='draft'){const prefer=['triad','aftertone','counterweight','mesh','reverb','fortress','drive','foretell'];s=C.choose(s,s.offers.slice().sort((a,b)=>prefer.indexOf(a)-prefer.indexOf(b))[0]);continue;}
    const moves=[];
    for(let ring=0;ring<3;ring++)for(const direction of [-1,1]){
      const p=C.preview(s,ring,direction);if(!p)continue;
      let score=p.matches.reduce((sum,m)=>sum+m.base,0);
      if(s.protocols.includes('counterweight'))score+=p.edges.length*3;
      if(s.protocols.includes('mesh') && s.locks.every(Boolean))score*=2;
      // Deliberate weak-point hits dominate the policy: energy is useful, but it does not win encounters.
      if(s.intent && p.matches.some(m=>m.sector===s.intent.sector))score+=100/Math.max(1,s.intent.count);
      if(s.intent?.kind==='parasite'){
        const remaining=s.locks[s.intent.edge]-(p.edges.includes(s.intent.edge)?1:0);
        if(remaining===0)score+=20/Math.max(1,s.intent.count);
      }
      // Uses visible direct preview only; does not inspect future random refills.
      moves.push({ring,direction,score});
    }
    moves.sort((a,b)=>b.score-a.score);const m=moves[0];if(m.score===0)dead++;
    s=C.step(s,m.ring,m.direction).state;turns++;
  }
  if(s.status==='won')wins++;
  if(['won','lost'].includes(s.status))finished++;
}
console.log(JSON.stringify({seedCount:100,wins,finished,actions:turns,directZeroScoreActions:dead,meanActions:turns/100},null,2));
