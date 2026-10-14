// Fator replay (v1.3): marcos por vale e fauna. Uso: node replay_teste.js N pol1,pol2,... [semente0]
// pol: guloso, cuidadoso, mestre (bots dos marcos), casual (guloso que erra: escolhe entre as 3 melhores), rand
const fs=require('fs'),path=require('path');
const E=eval('('+fs.readFileSync(path.join(__dirname,'ano_no_vale_motor.js'),'utf8')+')()');
function play(seed,pol,r0){let s=E.newGame(seed),r=r0;const R=()=>{r=(r*16807)%2147483647;return r/2147483647;};
  const maxP={};
  while(!E.over(s)&&s.turn<300){const ops=[];
    for(const k of E.slots(s))for(const o of E.rotations(E.cur(s).e)){const{state:ns,rep}=E.place(s,k,o.r);
      const bp=pol==='casual'?'guloso':pol==='rand'?'guloso':pol;ops.push({k,r:o.r,v:pol==='rand'?R():E.botValue(s,ns,rep,bp)});}
    ops.sort((a,b)=>b.v-a.v);const pick=pol==='casual'?ops[Math.min(ops.length-1,Math.floor(R()*3))]:ops[0];
    s=E.faunaStep(E.place(s,pick.k,pick.r).state);
    const pr=E.faunaProgress(s);for(const id in pr)maxP[id]=Math.max(maxP[id]||0,pr[id][0]/pr[id][1]);}
  return{score:s.score,placed:s.placed,year:E.yearOf(s.season),fauna:Object.keys(s.fauna||{}),maxP};}
const N=+process.argv[2]||30,pols=(process.argv[3]||'guloso').split(','),s0=+process.argv[4]||0;
const out={};
for(const pol of pols){out[pol]=[];for(let i=s0;i<s0+N;i++)out[pol].push(play('dia-t'+i,pol,i+7));}
console.log(JSON.stringify(out));
