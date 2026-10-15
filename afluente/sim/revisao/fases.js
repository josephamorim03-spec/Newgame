// Por jogada: a rotação escolhida pelo bot difere da que a interface entregaria? E como o jogo evolui ao longo da partida.
const fs=require('fs');
if(process.argv[5])global.AFLUENTE_CFG=JSON.parse(process.argv[5]);
const motor=process.argv[2],pol=process.argv[3],N=+process.argv[4];
const E=eval('(function(){var AFLUENTE_CFG=global.AFLUENTE_CFG;return ('+fs.readFileSync(motor,'utf8')+')();})()');
const constrained=motor.includes('encaixe');
let moves=0,diffRot=0,diffRotCost=0;const dec=Array.from({length:10},()=>({n:0,pts:0,low:0,tiles:0,quests:0}));const lens=[];
for(let i=0;i<N;i++){let s=E.newGame('dia-t'+i);const rec=[];
  while(!E.over(s)&&s.turn<400){const rots=E.rotations(E.cur(s).e);
    const leg=k=>rots.filter(o=>!constrained||E.legal(s.board,k,E.rot(E.cur(s).e,o.r)));
    const slots=E.slots(s).filter(k=>leg(k).length);if(!slots.length){s=E.discard(s);continue;}
    const before=pol==='mestre'?null:null;let best,bv=-1e9;
    for(const k of slots)for(const o of leg(k)){const{state:ns,rep}=E.place(s,k,o.r);const v=E.botValue(s,ns,rep,pol);if(v>bv){bv=v;best={k,r:o.r,rep};}}
    // rotação que a interface entregaria nessa casa: a de maior pts+4*peças entre as legais
    const ui=E.options(s,best.k).filter(o=>!constrained||E.legal(s.board,best.k,o.e))[0];
    moves++;if(ui.r!==best.r&&ui.e.join('')!==E.rot(E.cur(s).e,best.r).join('')){diffRot++;diffRotCost+=(ui.rep.pts+4*ui.rep.tiles)-(best.rep.pts+4*best.rep.tiles);}
    rec.push({pts:best.rep.pts,tiles:best.rep.tiles,q:best.rep.questsDone.length});
    s=E.place(s,best.k,best.r).state;}
  lens.push(s.placed);
  rec.forEach((m,j)=>{const d=dec[Math.min(9,Math.floor(10*j/rec.length))];d.n++;d.pts+=m.pts;d.low+=m.pts<=1?1:0;d.tiles+=m.tiles;d.quests+=m.q;});}
lens.sort((a,b)=>a-b);const pct=p=>lens[Math.min(lens.length-1,Math.floor(p*lens.length))];
console.log(`${motor} ${pol}: jogadas med ${pct(.5)} p75 ${pct(.75)} p90 ${pct(.9)} máx ${lens[lens.length-1]} | rotação ≠ interface: ${(100*diffRot/moves).toFixed(1)}% das jogadas (custo imediato médio ${(diffRotCost/Math.max(1,diffRot)).toFixed(1)})`);
console.log('  decil: pts/jogada | % jogadas ≤1 pt | peças ganhas/jogada | missões/jogada');
dec.forEach((d,i)=>console.log(`  ${i+1}: ${(d.pts/d.n).toFixed(1)} | ${(100*d.low/d.n).toFixed(0)}% | ${(d.tiles/d.n).toFixed(2)} | ${(d.quests/d.n).toFixed(2)}`));
