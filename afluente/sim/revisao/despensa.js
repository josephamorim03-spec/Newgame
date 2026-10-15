// Etapa 1 (aldeia e despensa): quanto o vale oferece e quanto a aldeia pediria, ano a ano, em partidas dos bots (regras v3).
const fs=require('fs');const E=eval('('+fs.readFileSync(process.argv[2],'utf8')+')()');const N=+process.argv[3]||20,pols=(process.argv[4]||'guloso,cuidadoso').split(',');
const R=2; // alcance da aldeia (casas)
const hd=(a,b)=>{const dq=E.KQ(a)-E.KQ(b),dr=E.KR(a)-E.KR(b);return Math.max(Math.abs(dq),Math.abs(dr),Math.abs(dq+dr));};
function snap(s,aliveSeca){const b=s.board,irr=E.irrigSet(b,aliveSeca),vil=[...b.keys()].filter(k=>!b.get(k).src&&b.get(k).e.includes('V'));
  const near=k=>vil.some(v=>hd(k,v)<=R);
  let comida=0,comidaLonge=0,mata=0,mataCil=0,mataLonge=0,pastoViz=0;
  for(const[k,t]of b){if(t.src)continue;const has=x=>t.e.includes(x);
    const f=(has('C')&&irr.has(k)?2:0)+(has('G')&&irr.has(k)?1:0);if(near(k))comida+=f;else comidaLonge+=f;
    if(has('B')){let cil=has('A');for(let d=0;d<6&&!cil;d++){const n=b.get(E.nb(k,d));if(n&&n.e[E.opp(d)]==='A')cil=true;}
      if(near(k)){mata++;if(cil)mataCil++;}else mataLonge++;}
    if(has('G')&&vil.some(v=>hd(k,v)<=1))pastoViz++;}
  return{casas:vil.length,comida,comidaLonge,mata,mataCil,mataLonge,pastoViz};}
for(const pol of pols){const rows={};
  for(let i=0;i<N;i++){const bp=E.botPlay('dia-t'+i,pol).act;let s=E.newGame('dia-t'+i);
    for(const a of bp){const r=E.place(s,a.k,a.r);s=r.state;const ev=r.rep.events.find(e=>e.type==='seca');
      if(ev){const y=ev.year,x=snap(s,s.alive);(rows[y]=rows[y]||[]).push(x);}}}
  console.log(pol);
  for(const y of Object.keys(rows).sort((a,b)=>a-b)){const L=rows[y],m=k=>(L.reduce((p,c)=>p+c[k],0)/L.length).toFixed(1);
    console.log(`  ano ${y} (${L.length} vales): casas ${m('casas')} | comida perto ${m('comida')} (longe ${m('comidaLonge')}) | mata perto ${m('mata')} (na beira do rio ${m('mataCil')}; longe ${m('mataLonge')}) | pasto encostado na vila ${m('pastoViz')}`);}}
