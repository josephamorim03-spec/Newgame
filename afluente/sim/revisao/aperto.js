// Uso: node aperto.js ../ano_no_vale_motor.js [vales] [bots] [cfg]. Por ano: anos fartos e o que faltou (comida, lenha).
const E=eval('('+require('fs').readFileSync(process.argv[2],'utf8')+')()');
const N=+process.argv[3]||12,pols=(process.argv[4]||'guloso,cuidadoso').split(','),cfg=JSON.parse(process.argv[5]||'{}');Object.assign(E.CFG,cfg);
for(const pol of pols){const by={};
for(let v=0;v<N;v++){const seed='cal-'+v,bp=E.botPlay(seed,pol).act;let s=E.newGame(seed);
  for(const a of bp){if(E.over(s))break;const r=E.place(s,a.k,a.r);s=E.faunaStep(r.state);
    for(const ev of r.rep.events)if(ev.type==='despensa'&&ev.casas){const y=Math.min(ev.year,4),b=by[y]=by[y]||{n:0,c:0,l:0,both:0,ok:0,fri:0,casas:0};
      const cOk=ev.comidaHave>=ev.needC,lOk=ev.lenhaHave>=ev.needL;b.n++;b.casas+=ev.casas;if(!cOk)b.c++;if(!lOk)b.l++;if(!cOk&&!lOk)b.both++;if(cOk&&lOk)b.ok++;if(ev.fri)b.fri++;}}}
console.log(pol);for(const y in by){const b=by[y];console.log(` ano ${y}${y==4?'+':''}: n ${b.n} casas ${(b.casas/b.n).toFixed(1)} farto ${(100*b.ok/b.n|0)}% falta comida ${(100*b.c/b.n|0)}% falta lenha ${(100*b.l/b.n|0)}% (friagem ${(100*b.fri/b.n|0)}%)`);}}
