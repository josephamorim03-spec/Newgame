// Esboço "uma peça, uma coisa" (v4): cada peça é UM uso da terra (lavoura, pasto, mata, casa) ou um trecho de rio.
// Mede se a escolha de onde pôr passa a importar. Uso: node uma_coisa.js [vales] [bot: guloso|plano]
// Regras do esboço:
//  - rio: trecho reto, curva ou forquilha; só entra continuando uma ponta aberta do rio (o rio cresce da nascente);
//  - lavoura irrigada (encostada no rio vivo) 3, pasto irrigado 2, longe da água 0;
//  - mata encostada no rio: 1 e segura aquele trecho na seca; mata encostada em casa: lenha (+1 para a casa, até 2);
//  - casa: +1 por lavoura/pasto irrigado vizinho, +1 por mata vizinha (até 2), +1 por casa vizinha (a vila);
//  - a jogada vale o quanto o vale passa a valer; na seca (a cada 10 jogadas) a colheita paga o vale com a água da
//    seca (trecho sem mata seca, e o rio abaixo dele também);
//  - pilha: começa com 14; a cada meta de pontos vem um pacote de 5 peças (a pessoa escolhe entre 2).
const N=+process.argv[2]||12,BOT=process.argv[3]||'guloso';
function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const D=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]],K=(q,r)=>(q+64)*256+(r+64),KQ=k=>Math.floor(k/256)-64,KR=k=>k%256-64,nb=(k,d)=>K(KQ(k)+D[d][0],KR(k)+D[d][1]),opp=d=>(d+3)%6;
const med=a=>{a=a.slice().sort((x,y)=>x-y);return a.length?a[a.length>>1]:0;},q=(a,p)=>{a=a.slice().sort((x,y)=>x-y);return a[Math.floor(p*(a.length-1))];};
const RIOS=[[0,3],[0,2],[0,4],[0,2,4]]; // reto, curva aberta, curva aberta do outro lado, forquilha (giros: todos)
function draw(R){const x=R();if(x<0.24){const f=RIOS[Math.floor(R()*RIOS.length)];return{t:'R',f};}return{t:x<0.44?'L':x<0.62?'P':x<0.82?'M':'C'};}
function vivo(b,seca){// rio vivo: da nascente, por trechos ligados; na seca só passa trecho com mata encostada
  const out=new Set(),st=[K(0,0)];out.add(K(0,0));
  while(st.length){const k=st.pop(),t=b.get(k);for(const d of t.w){const n=nb(k,d),u=b.get(n);if(!u||u.t!=='R'||out.has(n)||!u.w.includes(opp(d)))continue;
    if(seca&&![0,1,2,3,4,5].some(e=>{const m=b.get(nb(n,e));return m&&m.t==='M';}))continue;out.add(n);st.push(n);}}
  return out;}
function valor(b,seca){const v=vivo(b,seca),irr=k=>[0,1,2,3,4,5].some(d=>v.has(nb(k,d)));let s=0;
  for(const[k,t]of b){const ns=[0,1,2,3,4,5].map(d=>[nb(k,d),b.get(nb(k,d))]).filter(x=>x[1]);
    if(t.t==='L'&&irr(k))s+=3;if(t.t==='P'&&irr(k))s+=2;if(t.t==='M'&&irr(k))s+=1;
    if(t.t==='C'){s+=ns.filter(([n,u])=>(u.t==='L'||u.t==='P')&&irr(n)).length;s+=Math.min(2,ns.filter(([,u])=>u.t==='M').length);s+=ns.filter(([,u])=>u.t==='C').length;}}
  return s;}
function opcoes(b,tile){const cells=new Set();for(const k of b.keys())for(let d=0;d<6;d++){const n=nb(k,d);if(!b.has(n))cells.add(n);}const out=[];
  for(const c of cells){if(tile.t!=='R'){out.push({k:c,t:{t:tile.t}});continue;}
    for(let r=0;r<6;r++){const w=tile.f.map(d=>(d+r)%6);let ok=false,bad=false;
      for(const d of w){const u=b.get(nb(c,d));if(u){if(u.t==='R'&&u.w.includes(opp(d)))ok=true;else bad=true;}}
      for(let d=0;d<6;d++)if(!w.includes(d)){const u=b.get(nb(c,d));if(u&&u.t==='R'&&u.w.includes(opp(d)))bad=true;}
      if(ok&&!bad)out.push({k:c,t:{t:'R',w}});}}
  return out;}
const M={moves:0,gapBM:[],tie:0,flat:0,pts:[],quiet:0,packs:0,len:[],score:[],harv:[]};
for(let v=0;v<N;v++){const R=rng(1000+v),b=new Map([[K(0,0),{t:'R',w:[0,3]}]]);let left=14,score=0,meta=25,moves=0,cur=draw(R),nxt=draw(R);
  while(left>0&&moves<400){let ops=opcoes(b,cur);const before=valor(b,false);
    if(!ops.length){left--;cur=nxt;nxt=draw(R);continue;}
    const vals=ops.map(o=>{b.set(o.k,o.t);let x=valor(b,false)-before;
      if(BOT==='plano'){x+=0.5*(valor(b,true));} b.delete(o.k);return x;});
    const raw=ops.map(o=>{b.set(o.k,o.t);const x=valor(b,false)-before;b.delete(o.k);return x;});
    const a=raw.slice().sort((x,y)=>y-x),per=new Map();ops.forEach((o,i)=>per.set(o.k,Math.max(per.get(o.k)??-1e9,raw[i])));const ps=[...per.values()].sort((x,y)=>y-x);
    M.gapBM.push(a[0]-med(a));if(a[0]-med(a)<=2)M.flat++;if(ps.length>1&&ps[0]-ps[1]<=1)M.tie++;
    let bi=0;vals.forEach((x,i)=>{if(x>vals[bi])bi=i;});const o=ops[bi];b.set(o.k,o.t);const g=raw[bi];score+=g;M.pts.push(g);moves++;left--;M.moves++;
    let ev=false;if(moves%10===0){const h=valor(b,true);score+=h;M.harv.push(h);ev=true;}
    while(score>=meta){left+=5;meta+=Math.round(meta*0.6);M.packs++;ev=true;}
    if(g<=1&&!ev)M.quiet++;cur=nxt;nxt=draw(R);}
  M.len.push(moves);M.score.push(score);}
const pc=x=>(100*x/M.moves).toFixed(0)+'%';
console.log(`bot ${BOT}: ${M.moves} jogadas em ${N} vales · duração mediana ${med(M.len)} (máx ${Math.max(...M.len)}) · pontos mediana ${med(M.score)}`);
console.log(`melhor − mediana: mediana +${med(M.gapBM)} (p90 +${q(M.gapBM,0.9)}) · jogadas com isso ≤2: ${pc(M.flat)} · melhor casa empata com a 2ª (≤1): ${pc(M.tie)}`);
console.log(`ganho da jogada: mediana ${med(M.pts)} (p90 ${q(M.pts,0.9)}) · jogadas quietas (≤1 e nada acontece): ${pc(M.quiet)} · pacotes ganhos: ${(M.packs/N).toFixed(1)} por vale · colheita mediana ${med(M.harv)}`);
