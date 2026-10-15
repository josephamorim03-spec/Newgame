// v2.4 (a água no centro): números da partida com os bots dos marcos. Uso: node v24_teste.js N [pols] ['{"cfg":...}'] [semente0]
// Mede pontos, jogadas, vale verde, rio vivo, afluentes, cheia, missões por tipo (cumpridas/vencidas/abertas), descartes e o tempo do bot.
const fs=require('fs'),path=require('path');
const N=+process.argv[2]||20,pols=(process.argv[3]||'guloso,cuidadoso,mestre').split(','),cfg=process.argv[4]?JSON.parse(process.argv[4]):{},S0=+process.argv[5]||0;
const src=fs.readFileSync(path.join(__dirname,'ano_no_vale_motor.js'),'utf8');
const E=new Function('AFLUENTE_CFG','return ('+src+')()')(cfg);
const avg=a=>a.reduce((p,c)=>p+c,0)/Math.max(1,a.length),pct=(a,p)=>{const b=a.slice().sort((x,y)=>x-y);return b[Math.min(b.length-1,Math.floor(p*b.length))];};
function rand(seed,r0){let s=E.newGame(seed),r=r0;const R=()=>{r=(r*16807)%2147483647;return r/2147483647;};
  while(!E.over(s)&&s.turn<400){const ops=[];for(const k of E.slots(s))for(const o of E.rotations(E.cur(s).e))if(E.legal(s.board,k,o.e))ops.push({k,r:o.r});
    s=ops.length?E.place(s,...(o=>[o.k,o.r])(ops[Math.floor(R()*ops.length)])).state:E.pass(s);}return s;}
for(const pol of pols){const g=[];let ms=0;
  for(let i=S0;i<S0+N;i++){const seed='dia-t'+i,t0=Date.now();let s;
    if(pol==='rand')s=rand(seed,i+7);else{const[pp,flag]=pol.split(':'),b=E.botPlay(seed,pp,{protect:flag!=='corta'});s=E.replay(seed,(flag==='corta'?[{t:'mata',v:false}]:[]).concat(b.act));}
    ms=Math.max(ms,Date.now()-t0);
    const AL=E.computeAlive(s.board,false),green=(E.irrigSet||E.greenSet)(s.board,AL).size,n=[...s.board.values()].filter(t=>!t.src).length;
    let river=0,alive=0;for(const[k,t]of s.board)if(!t.src&&t.e.includes('A')){river++;if(AL.has(k))alive++;}
    const q={};for(const x of s.quests){const ty=x.flow?'água':x.b;q[ty]=q[ty]||{n:0,done:0,late:0};q[ty].n++;if(x.status==='done')q[ty].done++;else if(x.status==='late')q[ty].late++;}
    g.push({score:s.score,placed:s.placed,turns:s.turn,verde:green/Math.max(1,n),rio:river?alive/river:0,aflu:(s.joined||[]).length,cheia:s.stats.cheia||0,q,passes:s.stats.passes||0,
      src:s.stats,secos:s.stats.dried,al:s.stats});}
  const sc=g.map(x=>x.score),pl=g.map(x=>x.turns),tot=avg(sc);const sh=v=>(100*avg(g.map(v))/tot).toFixed(0)+'%';
  const Q={};for(const x of g)for(const[ty,v]of Object.entries(x.q)){Q[ty]=Q[ty]||{n:0,done:0,late:0};Q[ty].n+=v.n;Q[ty].done+=v.done;Q[ty].late+=v.late;}
  console.log(`${pol.padEnd(10)} pts ${tot.toFixed(0)} (${Math.min(...sc)}–${Math.max(...sc)}) | jogadas med ${pct(pl,.5)} p90 ${pct(pl,.9)} máx ${Math.max(...pl)} | verde ${(100*avg(g.map(x=>x.verde))).toFixed(0)}% rio vivo ${(100*avg(g.map(x=>x.rio))).toFixed(0)}% afluentes ${avg(g.map(x=>x.aflu)).toFixed(2)} | descartes ${avg(g.map(x=>x.passes)).toFixed(2)} secos ${avg(g.map(x=>x.secos)).toFixed(1)} | bot até ${(ms/1000).toFixed(1)} s`);
  console.log(`   pontos: encaixe ${sh(x=>x.src.match)} perfeita ${sh(x=>x.src.perfect)} missão ${sh(x=>x.src.quest)} água ${sh(x=>x.src.flow)} especiais ${sh(x=>x.src.special)} afluente ${sh(x=>x.src.aflu||0)} cheia ${sh(x=>x.cheia)} produção ${sh(x=>x.src.prod||0)} colheita ${sh(x=>x.src.harvest||0)}`);
  {const sum=k=>g.reduce((p,x)=>p+(x.al[k]||0),0);console.log(`   aldeia: anos ${(sum('anos')/N).toFixed(1)}/partida · fartos ${(100*sum('fartos')/Math.max(1,sum('anos'))).toFixed(0)}% · casas atendidas ${(100*sum('atend')/Math.max(1,sum('casasAno'))).toFixed(0)}% · matas da beira cortadas ${(sum('cortes')/N).toFixed(1)}/partida · secas com friagem ${(sum('fri')/N).toFixed(1)}/partida · pontos da aldeia ${(100*sum('pCasa')/g.reduce((p,x)=>p+x.score,0)).toFixed(0)}%`);}
  console.log('   missões: '+Object.entries(Q).map(([ty,v])=>`${ty} ${(v.n/N).toFixed(1)}/partida ${(100*v.done/v.n).toFixed(0)}% cumpridas ${(100*v.late/v.n).toFixed(0)}% vencidas`).join(' · '));}
