// Esboço de núcleo (v4): "a vila cresce com o que tem em volta". Mede se a escolha passa a importar.
// Uso: node nucleo_v4.js ../ano_no_vale_motor.js [vales]
// Regra testada: cada vila (região de lados de vila ligados) tem um nível. Sobe um nível quando, nas peças dela e
// encostadas nela, há 2 de comida a mais (lavoura irrigada 2, pasto irrigado 1) e 1 mata a mais (peça com 2+ lados
// de bosque), até o nível = tamanho da vila. Cada nível novo: +6·nível pontos e +1 peça. O encaixe continua (+1/lado).
// Compara, nos mesmos estados, o ganho de cada opção pela regra de hoje e pela regra testada.
const E=eval('('+require('fs').readFileSync(process.argv[2],'utf8')+')()');
const N=+process.argv[3]||10;const med=a=>{a=a.slice().sort((x,y)=>x-y);return a.length?a[a.length>>1]:0;},q=(a,p)=>{a=a.slice().sort((x,y)=>x-y);return a[Math.floor(p*(a.length-1))];};
function vilas(s){const b=s.board,G=E.groups(b),wet=new Set([...s.alive,...E.irrigSet(b,s.alive)]),seen=new Set();let L=0,sc=0;const vs=[];
  for(const[k,t]of b)for(let i=0;i<6;i++)if(t.e[i]==='V'){const r=G.find(k*6+i);if(seen.has(r))continue;seen.add(r);const T=G.members.get(r)||new Set([k]),ring=new Set();
    for(const x of T){ring.add(x);for(let d=0;d<6;d++){const n=E.nb(x,d);if(b.has(n))ring.add(n);}}
    let food=0,wood=0;for(const x of ring){const tl=b.get(x);if(wet.has(x)){if(tl.e.includes('C'))food+=2;else if(tl.e.includes('G'))food+=1;}if(tl.e.filter(c=>c==='B').length>=2)wood++;}
    let lv=0;while(lv<T.size&&food>=2*(lv+1)&&wood>=lv+1)lv++;L+=lv;sc+=3*lv*(lv+1);vs.push({n:T.size,lv,food,wood});}
  return{L,sc,vs};}
const A={cur:{gapBM:[],tie:[],flat:0},v4:{gapBM:[],tie:[],flat:0}};let moves=0,quietC=0,quietV=0,ups=0,upGap=[],last=0,maxL=0,ptsV=[];
for(let v=0;v<N;v++){const seed='dia-t'+v;let s=E.newGame(seed),V0=vilas(s);last=moves;maxL=V0.L;
  while(!E.over(s)&&moves<100000){const sl=E.slots(s),all={cur:[],v4:[]},per={cur:new Map(),v4:new Map()};let best=null;
    for(const k of sl)for(const o of E.rotations(E.cur(s).e)){if(!E.legal(s.board,k,o.e))continue;const r=E.place(s,k,o.r),ns=r.state,V1=vilas(ns);
      const up=Math.max(0,V1.L-maxL),vc=r.rep.pts+4*r.rep.tiles,v4=r.rep.match+(V1.sc-V0.sc)+4*up;
      all.cur.push(vc);all.v4.push(v4);per.cur.set(k,Math.max(per.cur.get(k)??-1e9,vc));per.v4.set(k,Math.max(per.v4.get(k)??-1e9,v4));
      if(!best||v4>best.v4)best={k,r:o.r,v4,ns,V1,up};}
    if(!best){s=E.pass(s).state;continue;}
    for(const m of['cur','v4']){const a=all[m].slice().sort((x,y)=>y-x),ps=[...per[m].values()].sort((x,y)=>y-x);A[m].gapBM.push(a[0]-med(a));A[m].tie.push(ps.length>1&&ps[0]-ps[1]<=1?1:0);if(a[0]-med(a)<=2)A[m].flat++;}
    moves++;ptsV.push(best.v4);if(best.up>0){ups++;upGap.push(moves-last);last=moves;maxL=best.V1.L;}
    if(best.v4<=3&&!best.up)quietV++;
    s=E.faunaStep(best.ns);V0=vilas(s);}}
const pc=x=>(100*x/moves).toFixed(0)+'%';
for(const m of['cur','v4'])console.log(`${m==='cur'?'regra de hoje ':'regra testada'}: melhor − mediana: mediana +${med(A[m].gapBM)} (p90 +${q(A[m].gapBM,0.9)}) · jogadas com isso ≤2: ${pc(A[m].flat)} · melhor casa empata com a 2ª (≤1): ${pc(A[m].tie.reduce((a,b)=>a+b,0))}`);
console.log(`regra testada: ${moves} jogadas · ganho da jogada: mediana ${med(ptsV)} (p90 ${q(ptsV,0.9)}) · vila subiu de nível em ${pc(ups)} das jogadas (a cada ${med(upGap)} jogadas) · jogadas quietas: ${pc(quietV)}`);
