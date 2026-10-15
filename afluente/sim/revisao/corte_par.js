// Uso: node corte_par.js ../ano_no_vale_motor.js [vales] [prefixo] [cfg]. Vale a vale: o cuidadoso protegendo a mata do rio contra o mesmo bot cortando.
const E=eval('('+require('fs').readFileSync(process.argv[2],'utf8')+')()');
const N=+process.argv[3]||16,pre=process.argv[4]||'dia-t',cfg=JSON.parse(process.argv[5]||'{}');Object.assign(E.CFG,cfg);
const rows=[];for(let v=0;v<N;v++){const seed=pre+v,a=E.botPlay(seed,'cuidadoso'),b=E.botPlay(seed,'cuidadoso',{protect:false});
  const A=E.replay(seed,a.act),B=E.replay(seed,[{t:'mata',v:false},...b.act]);rows.push([seed,A.score,A.placed,B.score,B.placed]);}
const med=x=>{x=x.slice().sort((a,b)=>a-b);return x[x.length>>1];};
for(const r of rows)console.log(r.join('\t'));
const d=rows.map(r=>r[3]-r[1]),rel=rows.map(r=>r[3]/r[1]-1);
console.log(`protege med ${med(rows.map(r=>r[1]))} (${med(rows.map(r=>r[2]))} jog) · corta med ${med(rows.map(r=>r[3]))} (${med(rows.map(r=>r[4]))} jog) · corta ganha em ${d.filter(x=>x>0).length}/${N} · diferença mediana ${(100*med(rel)).toFixed(0)}%`);
