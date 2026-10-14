// Simulador (v0.9: seca e missões com prazo). Uso: node ano_no_vale_teste.js ano_no_vale_motor.js N CFG [bots]
// bots: rand, greedy (só ganho imediato), sust (protege o rio), quest (persegue missões), todo (as duas coisas)
// node test11.js motor.js N CFG [bots]
const fs=require('fs');const cfg=process.argv[4]||'{}';
const E=eval('(()=>{const AFLUENTE_CFG='+cfg+';return ('+fs.readFileSync(process.argv[2],'utf8')+')();})()');
const st=a=>{const m=a.reduce((x,y)=>x+y,0)/a.length;return`${m.toFixed(1)} (${Math.min(...a)}–${Math.max(...a)})`;};
function play(seed,pol,r0){let s=E.newGame(seed);let r=r0;const R=()=>{r=(r*16807)%2147483647;return r/2147483647;};
  while(!E.over(s)&&s.turn<300){let best=null,bv=-1e9;
    for(const k of E.slots(s))for(const o of E.rotations(E.cur(s).e)){const{state:ns,rep}=E.place(s,k,o.r);let v=rep.pts+4*rep.tiles+R()*1e-3;
      if(pol==='sust'){const b=E.balance(ns);v+=(b.phase===0&&b.turnsLeft<=5?2.5:1.2)*b.riverSafe;}
      if(pol==='quest'||pol==='todo'){const before=new Map(E.questProgress(s).map(q=>[q.key+':'+q.edge,q.cur]));
        for(const q of E.questProgress(ns)){if(q.flow)continue;const b0=before.get(q.key+':'+q.edge);if(b0!=null&&q.cur>b0)v+=2.5*Math.min(q.cur-b0,Math.max(0,q.n-b0));}
        if(pol==='todo'){const b=E.balance(ns);v+=(b.phase===0&&b.turnsLeft<=5?2.5:1.2)*b.riverSafe;}}
      if(pol==='rand')v=R();
      if(v>bv){bv=v;best={k,r:o.r};}}
    s=E.place(s,best.k,best.r).state;}
  const x=s.stats;const byT={};for(const q of s.quests){const t=q.flow?'A':q.b;byT[t]=byT[t]||[0,0];if(q.status==='done')byT[t][0]++;if(q.status==='late'||q.status==='fail')byT[t][1]++;}
  return{byT,score:s.score,done:s.questsDone,placed:s.placed,years:E.yearOf(s.season),x,src:{match:x.match,flow:x.flow,quest:x.quest,perfect:x.perfect,special:x.special,seca:x.kept}};}
const N=+process.argv[3]||40;
for(const pol of(process.argv[5]||'rand,greedy,sust').split(',')){const rs=[];for(let i=0;i<N;i++)rs.push(play('dia-t'+i,pol,i+3));
  const m=f=>(rs.reduce((a,x)=>a+f(x),0)/rs.length).toFixed(1);
  const bt={};for(const r of rs)for(const[t,[d,f]]of Object.entries(r.byT)){bt[t]=bt[t]||[0,0];bt[t][0]+=d;bt[t][1]+=f;}
  const btS=Object.entries(bt).map(([t,[d,f]])=>`${t} ${Math.round(100*d/Math.max(1,d+f))}%`).join(' ');
  console.log(pol.padEnd(6),'tipos['+btS+']','ano',st(rs.map(x=>x.years)),'| pts',st(rs.map(x=>x.score)),'| peças',st(rs.map(x=>x.placed)),
   `| seca: mantidos ${m(x=>x.x.kept)} secos ${m(x=>x.x.dried)} +peças ${m(x=>x.x.tSeason)} | fontes pts: encaixe ${m(x=>x.x.match)} água ${m(x=>x.x.flow)} missão ${m(x=>x.x.quest)} perf ${m(x=>x.x.perfect)} esp ${m(x=>x.x.special)} seca ${m(x=>x.x.kept)} | peças: missão ${m(x=>x.x.tQuest)} perf ${m(x=>x.x.tPerfect)} esp ${m(x=>x.x.tSpecial)} | missões feitas ${m(x=>x.done)} falhas ${m(x=>x.x.failed.length)}`);}
