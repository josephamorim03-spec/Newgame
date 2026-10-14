// Simulador do ano no vale (v0.6). Uso: node ano_no_vale_teste.js ano_no_vale_motor.js PESOS N CFG [bots]
// ex.: node ano_no_vale_teste.js ano_no_vale_motor.js '{"safe":1.5,"food":1,"wat":1.5,"dry":1.5}' 60 '{}' rand,greedy,sust
const fs=require('fs');
const cfg=process.argv[5]||'{}';
const E=eval('(()=>{const AFLUENTE_CFG='+cfg+';return ('+fs.readFileSync(process.argv[2],'utf8')+')();})()');
const st=a=>{const m=a.reduce((x,y)=>x+y,0)/a.length;return`${m.toFixed(1)} (${Math.min(...a)}–${Math.max(...a)})`;};
const W=JSON.parse(process.argv[3]||'{}');
const SL=JSON.parse(cfg).slen||6;
function play(seed,pol,r0){let s=E.newGame(seed);let r=r0;const R=()=>{r=(r*16807)%2147483647;return r/2147483647;};
  while(!E.over(s)&&s.turn<300){let best=null,bv=-1e9;
    for(const k of E.slots(s))for(const o of E.rotations(E.cur(s).e)){const{state:ns,rep}=E.place(s,k,o.r);let v=rep.pts+4*rep.tiles+R()*1e-3;
      if(pol==='sust'||pol==='plan'){const b=E.balance(ns);let f=1;
        if(pol==='plan'){const ph=E.phase(ns.season);f=ph===3||ph===2?1.6:1;} // perto da seca/ano novo pesa mais
        v+=f*(W.safe*b.riverSafe+W.food*(b.phase>=2?0:b.foodNow)+W.wat*b.watered-W.dry*(b.houses-b.watered));}
      if(pol==='rand')v=R();
      if(v>bv){bv=v;best={k,r:o.r};}}
    s=E.place(s,best.k,best.r).state;}
  return{score:s.score,placed:s.placed,years:(s.season-1)/4,st:s.stats};}
const N=+process.argv[4]||24;
for(const pol of(process.argv[6]||'rand,greedy,sust,plan').split(',')){const rs=[];for(let i=0;i<N;i++)rs.push(play('dia-t'+i,pol,i+3));
  console.log(pol.padEnd(6),'anos',st(rs.map(x=>+x.years.toFixed(2))),'| pts',st(rs.map(x=>x.score)),'| peças',st(rs.map(x=>x.placed)),
   `| comida ${st(rs.map(x=>x.st.harvest))} | vila ${st(rs.map(x=>x.st.village))} | fome ${st(rs.map(x=>x.st.hungry))} | seco ${st(rs.map(x=>x.st.dried))}`);}
