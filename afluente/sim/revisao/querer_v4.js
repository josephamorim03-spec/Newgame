// O vale que pede (v4): a peça na mão tem casa que avança um pedido? Uso: node querer_v4.js ../ano_no_vale_motor.js [vales]
// Joga como o bot cuidadoso nos vales "v4-" e, a cada jogada, olha todas as opções.
const E=eval('('+require('fs').readFileSync(process.argv[2],'utf8')+')()');const N=+process.argv[3]||6;
const med=a=>{a=a.slice().sort((x,y)=>x-y);return a.length?a[a.length>>1]:0;};
let moves=0,hot=0,hotSlots=[],took=0,grow=0,growCan=0,gapHot=[];
for(let v=0;v<N;v++){const act=E.botPlay('v4-q'+v,'cuidadoso').act;let s=E.newGame('v4-q'+v);
  for(const a of act){if(a.t==='pacote'){s=E.choosePack(s,a.i);continue;}if(E.over(s))break;
    if(a.k!=null){const adv=new Set(),done=new Set();let bestAdv=-1e9,bestOther=-1e9;
      for(const k of E.slots(s))for(const o of E.options(s,k)){const r=o.rep,val=r.pts;const ch=(r.v4||[]).filter(c=>c.done||c.after>c.before);
        if(ch.length){adv.add(k);bestAdv=Math.max(bestAdv,val+20*ch.filter(c=>c.done).length);}else bestOther=Math.max(bestOther,val);if(ch.some(c=>c.done))done.add(k);}
      moves++;if(adv.size){hot++;hotSlots.push(adv.size);gapHot.push(bestAdv-bestOther);}if(done.size)growCan++;}
    const r=E.place(s,a.k,a.r);if((r.rep.v4||[]).some(c=>c.done||c.after>c.before))took++;if((r.rep.v4||[]).some(c=>c.done))grow++;s=E.faunaStep(r.state);}}
const pc=x=>(100*x/moves).toFixed(0)+'%';
console.log(`${moves} jogadas em ${N} vales`);
console.log(`a peça na mão tem casa que avança um pedido: ${pc(hot)} das jogadas · nessas, quantas casas fazem isso: mediana ${med(hotSlots)} (de ~26 casas vazias)`);
console.log(`a peça na mão pode fazer uma vila crescer agora: ${pc(growCan)} · o bot avançou um pedido em ${pc(took)} e fez a vila crescer em ${pc(grow)}`);
