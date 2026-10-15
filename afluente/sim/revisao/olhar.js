// Quanto vale ver mais peças? Bot que planeja com a peça da vez + H próximas (H=0,1,2).
// Busca podada: em cada nível, só os K melhores lances pelo valor imediato seguem para o próximo nível.
const fs=require('fs');
const motor=process.argv[2],H=+process.argv[3],N=+process.argv[4],K=+(process.argv[5]||6),S0=+(process.argv[6]||0);
let src=fs.readFileSync(motor,'utf8');
// expõe resolve para revelar peças além da "depois"
if(!src.includes('function discard'))src=src.replace('return{DIRS,','function discard(s){const n={...s,next:s.next+1,left:s.left-1,turn:s.turn+1,stuck:(s.stuck||0)+1};resolve(n,n.next);resolve(n,n.next+1);return n;}\n  return{discard,DIRS,');
src=src.replace('return{discard,DIRS,','return{resolve,discard,DIRS,');
const E=eval('('+src+')()');
const constrained=motor.includes('encaixe');
const val=(s,ns,rep)=>E.botValue(s,ns,rep,'cuidadoso');
// estado com a peça "idx" como peça da vez (para planejar com peças futuras já reveladas)
function withTile(s,idx){return{...s,next:idx};}
function moves(s){const t=E.cur(s);if(!t)return[];const rots=E.rotations(t.e),out=[];
  for(const k of E.slots(s))for(const o of rots){if(constrained&&!E.legal(s.board,k,o.e))continue;const{state:ns,rep}=E.place(s,k,o.r);out.push({k,r:o.r,ns,v:val(s,ns,rep)});}
  return out.sort((a,b)=>b.v-a.v);}
// melhor valor de uma sequência de h peças futuras a partir de ns (as peças futuras são s.next+1.. já resolvidas)
function future(ns,h){if(h===0||E.over(ns))return 0;const ms=moves(ns);if(!ms.length)return 0;
  let best=-1e9;for(const m of ms.slice(0,h>1?K:ms.length)){const v=m.v+future(m.ns,h-1);if(v>best)best=v;}return best;}
let tot=0,pl=0,res=[];
for(let i=S0;i<S0+N;i++){let s=E.newGame('dia-t'+i);
  while(!E.over(s)&&s.turn<300){
    // revela até H peças à frente da peça da vez (a interface mostraria)
    for(let j=1;j<=H;j++)E.resolve(s,s.next+j);
    const ms=moves(s);if(!ms.length){s=E.discard(s);continue;}
    let best=ms[0],bv=-1e9;
    if(H===0)best=ms[0];else for(const m of ms.slice(0,K)){
      // ns já tem next avançado; a peça futura é a de ns.next (resolvida acima)
      const v=m.v+future(m.ns,H);if(v>bv){bv=v;best=m;}}
    s=E.place(s,best.k,best.r).state;}
  res.push({score:s.score,placed:s.placed});}
const avg=a=>a.reduce((p,c)=>p+c,0)/a.length;
console.log(JSON.stringify({motor,H,N,K,score:+avg(res.map(r=>r.score)).toFixed(1),placed:+avg(res.map(r=>r.placed)).toFixed(1),scores:res.map(r=>r.score),placedAll:res.map(r=>r.placed)}));
