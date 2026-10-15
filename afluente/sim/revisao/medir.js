// Medições independentes do Afluente (motor extraído do protótipo). Uso: node medir.js N pols [cfgJSON]
const fs=require('fs'),path=require('path');
if(process.argv[4])global.AFLUENTE_CFG=JSON.parse(process.argv[4]);
const src=fs.readFileSync(path.join(__dirname,process.env.MOTOR||'motor.js'),'utf8');
const E=eval('(function(){var AFLUENTE_CFG=global.AFLUENTE_CFG;return ('+src+')();})()');
function rng(seed){let r=seed;return()=>{r=(r*16807)%2147483647;return r/2147483647;};}
function play(seed,pol,R){
  let s=E.newGame(seed);let rain=0,secaGain=0,maxAliveRiver=0,cheiaPts=0,afluPts=0,afluTiles=0;
  while(!E.over(s)&&s.turn<300){
    const slots0=E.slots(s),rots=E.rotations(E.cur(s).e);let pick;
    const LEG=(k,r)=>E.legal(s.board,k,E.rot(E.cur(s).e,r));const slots=slots0.filter(k=>rots.some(o=>LEG(k,o.r)));
    if(!slots.length){s=E.discard(s);continue;}
    const val=(k,r)=>{const{state:ns,rep}=E.place(s,k,r);return E.botValue(s,ns,rep,pol==='cuidadoso'?'cuidadoso':pol==='mestre'?'mestre':'guloso');};
    if(pol==='rand'){const k=slots[Math.floor(R()*slots.length)];const lr=rots.filter(o=>LEG(k,o.r));pick={k,r:lr[Math.floor(R()*lr.length)].r};}
    else if(pol==='tapany'){ // casa ao acaso, rotação escolhida pela interface (a de maior ganho)
      const k=slots[Math.floor(R()*slots.length)];pick={k,r:E.options(s,k).filter(o=>LEG(k,o.r))[0].r};}
    else if(pol==='slotbest_rotrand'){ // escolhe a melhor casa, mas gira ao acaso
      let bv=-1e9;for(const k of slots){const lr=rots.filter(o=>LEG(k,o.r));const r=lr[Math.floor(R()*lr.length)].r;const v=val(k,r);if(v>bv){bv=v;pick={k,r};}}}
    else{let bv=-1e9;for(const k of slots)for(const o of rots){if(!LEG(k,o.r))continue;const v=val(k,o.r);if(v>bv){bv=v;pick={k,r:o.r};}}}
    const{state,rep}=E.place(s,pick.k,pick.r);
    if(rep.cheia)cheiaPts+=rep.cheia;if(rep.aflu&&rep.aflu.length){afluPts+=rep.aflu.length*E.CFG.afluPts;afluTiles+=rep.aflu.length*E.CFG.afluTiles;}
    for(const ev of rep.events){if(ev.type==='chuva')rain+=ev.rain;if(ev.type==='seca')secaGain+=ev.gain;}
    s=E.faunaStep(state);
    
  }
  const x=s.stats;let river=0;for(const[k,t]of s.board)if(!t.src&&t.e.includes('A'))river++;
  const AL=E.computeAlive(s.board,false);const alive=[...AL].filter(k=>!s.board.get(k).src).length;let wet=0,n=0;for(const[k,t]of s.board){if(t.src)continue;n++;if(AL.has(k)||[0,1,2,3,4,5].some(d=>AL.has(E.nb(k,d))))wet++;}const verde=wet/Math.max(1,n);const aflu=(s.joined||[]).length;
  return{score:s.score,placed:s.placed,years:E.yearOf(s.season),src:{match:x.match,perfect:x.perfect,quest:x.quest,flow:x.flow,special:x.special,seca:s.score-x.match-x.perfect-x.quest-x.flow-x.special-cheiaPts-afluPts,cheia:cheiaPts,aflu:afluPts},
    tiles:{start:22,quest:x.tQuest,perfect:x.tPerfect,seca:secaGain,rain,special:x.tSpecial,aflu:afluTiles},river,alive,verde,aflu,questsDone:s.questsDone,stuck:s.stuck||0,fauna:Object.keys(s.fauna||{}).length,dried:x.dried};
}
const P90=a=>{const b=a.slice().sort((x,y)=>x-y);return b[Math.floor(.9*b.length)];};
const N=+process.argv[2]||20,pols=(process.argv[3]||'guloso').split(',');
const out={};
for(const pol of pols){out[pol]=[];for(let i=0;i<N;i++)out[pol].push(play('dia-t'+i,pol,rng(i*7919+13)));}
fs.writeFileSync(process.env.OUT||'out.json',JSON.stringify(out));
const avg=a=>a.reduce((p,c)=>p+c,0)/a.length,med=a=>{const b=a.slice().sort((x,y)=>x-y);return b[Math.floor(b.length/2)];};
for(const pol of pols){const g=out[pol];const sc=g.map(x=>x.score),pl=g.map(x=>x.placed);
  const tot=avg(sc);const share=k=>(100*avg(g.map(x=>x.src[k]))/tot).toFixed(0)+'%';
  const ts=k=>avg(g.map(x=>x.tiles[k])).toFixed(1);
  console.log(`${pol.padEnd(17)} pts ${avg(sc).toFixed(0)} (med ${med(sc)}, ${Math.min(...sc)}–${Math.max(...sc)}) | peças ${avg(pl).toFixed(0)} (med ${med(pl)}, ${Math.min(...pl)}–${Math.max(...pl)}) p90 ${P90(pl)} anos ${avg(g.map(x=>x.years)).toFixed(1)}`);
  console.log(`   pontos: encaixe ${share('match')} perf ${share('perfect')} missão ${share('quest')} água ${share('flow')} esp ${share('special')} seca ${share('seca')} cheia ${share('cheia')} afluente ${share('aflu')}`);
  console.log(`   peças ganhas: missão ${ts('quest')} perf ${ts('perfect')} seca ${ts('seca')} chuva ${ts('rain')} esp ${ts('special')} afluente ${ts('aflu')}`);
  console.log(`   rio: peças c/ rio ${avg(g.map(x=>x.river)).toFixed(1)}, vivas no fim ${avg(g.map(x=>x.alive)).toFixed(1)} (${(100*avg(g.map(x=>x.alive))/avg(g.map(x=>x.river))).toFixed(0)}%), vale verde ${(100*avg(g.map(x=>x.verde))).toFixed(0)}% afluentes ${avg(g.map(x=>x.aflu)).toFixed(2)} | missões ${avg(g.map(x=>x.questsDone)).toFixed(1)} bichos ${avg(g.map(x=>x.fauna)).toFixed(1)} secos ${avg(g.map(x=>x.dried)).toFixed(1)} descartes ${avg(g.map(x=>x.stuck)).toFixed(2)}`);
}
