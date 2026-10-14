// Simulador da v0.7 (seca e mata ciliar). Uso: node ano_no_vale_teste.js ano_no_vale_motor.js N CFG [bots]
// ex.: node ano_no_vale_teste.js ano_no_vale_motor.js 30 '{}' rand,greedy,sust
// node test11.js motor.js N CFG [bots]
const fs=require('fs');const cfg=process.argv[4]||'{}';
const E=eval('(()=>{const AFLUENTE_CFG='+cfg+';return ('+fs.readFileSync(process.argv[2],'utf8')+')();})()');
const st=a=>{const m=a.reduce((x,y)=>x+y,0)/a.length;return`${m.toFixed(1)} (${Math.min(...a)}–${Math.max(...a)})`;};
function play(seed,pol,r0){let s=E.newGame(seed);let r=r0;const R=()=>{r=(r*16807)%2147483647;return r/2147483647;};
  while(!E.over(s)&&s.turn<300){let best=null,bv=-1e9;
    for(const k of E.slots(s))for(const o of E.rotations(E.cur(s).e)){const{state:ns,rep}=E.place(s,k,o.r);let v=rep.pts+4*rep.tiles+R()*1e-3;
      if(pol==='sust'){const b=E.balance(ns);v+=(b.phase===0&&b.turnsLeft<=5?2.5:1.2)*b.riverSafe;}
      if(pol==='rand')v=R();
      if(v>bv){bv=v;best={k,r:o.r};}}
    s=E.place(s,best.k,best.r).state;}
  const x=s.stats;return{score:s.score,placed:s.placed,years:E.yearOf(s.season),x,src:{match:x.match,flow:x.flow,quest:x.quest,perfect:x.perfect,special:x.special,seca:x.kept}};}
const N=+process.argv[3]||40;
for(const pol of(process.argv[5]||'rand,greedy,sust').split(',')){const rs=[];for(let i=0;i<N;i++)rs.push(play('dia-t'+i,pol,i+3));
  const m=f=>(rs.reduce((a,x)=>a+f(x),0)/rs.length).toFixed(1);
  console.log(pol.padEnd(6),'ano',st(rs.map(x=>x.years)),'| pts',st(rs.map(x=>x.score)),'| peças',st(rs.map(x=>x.placed)),
   `| seca: mantidos ${m(x=>x.x.kept)} secos ${m(x=>x.x.dried)} +peças ${m(x=>x.x.tSeason)} | fontes pts: encaixe ${m(x=>x.x.match)} água ${m(x=>x.x.flow)} missão ${m(x=>x.x.quest)} perf ${m(x=>x.x.perfect)} esp ${m(x=>x.x.special)} seca ${m(x=>x.x.kept)} | peças: missão ${m(x=>x.x.tQuest)} perf ${m(x=>x.x.tPerfect)} esp ${m(x=>x.x.tSpecial)} | missões falhas ${m(x=>x.x.failed.length)}`);}
