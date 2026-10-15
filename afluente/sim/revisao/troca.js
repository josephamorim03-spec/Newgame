// Uso: node troca.js ../ano_no_vale_motor.js [vales]
// a cada seca de partidas do cuidadoso (chave ligada): o que o corte mudaria, no mesmo estado
const E=eval('('+require('fs').readFileSync(process.argv[2],'utf8')+')()');
const N=+process.argv[3]||12;let n=0,cutN=0,dAt=0,dFarto=0,dRio=0,dHarv=0,dPts=0,dTl=0;
for(let v=0;v<N;v++){const seed='cal-'+v,bp=E.botPlay(seed,'cuidadoso').act;let s=E.newGame(seed);
  for(const a of bp){if(E.over(s))break;
    if(!s.seca&&s.clock===E.seasonAt?0:0){}
    const r=E.place(s,a.k,a.r);
    if(r.rep.events.some(e=>e.type==='despensa')){// estado antes da virada: plano com e sem corte
      const season=E.nextSeca(s),on=E.despensaPlan(s.board,s,season,true),off=E.despensaPlan(r.state.board,{...s},season,false),onB=E.despensaPlan(r.state.board,{...s},season,true);
      if(off.cut.length){n++;cutN+=off.cut.length;dAt+=off.atendidas-onB.atendidas;const f=p=>p.casas&&p.atendidas>=p.casas?E.CFG.pecaFarto:2*p.atendidas>=p.casas?E.CFG.pecaMeio:0;dTl+=f(off)-f(onB);
        const rio=p=>[...p.aliveS].length;dRio+=rio(onB)-rio(off);
        const h=p=>{const g=E.irrigSet(r.state.board,p.aliveS);let t=0;for(const k of r.state.board.keys()){const y=E.yieldOf(r.state.board,g,k);if(y)t+=y.sum;}return t;};dHarv+=h(onB)-h(off);}}
    s=E.faunaStep(r.state);}}
console.log(`secas em que cortar mudaria algo: ${n}; por seca: corta ${(cutN/n).toFixed(1)} matas · +${(dAt/n).toFixed(2)} casas atendidas (+${(5*dAt/n).toFixed(1)} pts) · +${(dTl/n).toFixed(2)} peças · rio seco +${(dRio/n).toFixed(1)} trechos · produção na seca −${(dHarv/n).toFixed(1)}`);
