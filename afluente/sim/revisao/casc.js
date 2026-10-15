const fs=require('fs');
function load(f){const src=fs.readFileSync(f,'utf8');return eval('('+src+')()');}
const B=load('motor.js'),C=load('m_encaixe_rio.js');
function run(E,constrained,N){const hist={};let riverTurns=0,legalFrac=0,few=0,totalTurns=0,dryPlaced=0;
 for(let i=0;i<N;i++){let s=E.newGame('dia-t'+i);
  while(!E.over(s)&&s.turn<300){const slots=E.slots(s),rots=E.rotations(E.cur(s).e),isR=E.cur(s).e.includes('A');
   const leg=k=>rots.filter(o=>!constrained||E.legal(s.board,k,E.rot(E.cur(s).e,o.r)));
   const ls=slots.filter(k=>leg(k).length);
   if(isR){riverTurns++;legalFrac+=ls.length/slots.length;if(ls.length<=3)few++;}
   if(!ls.length){s=E.discard(s);continue;}
   let best,bv=-1e9;for(const k of ls)for(const o of leg(k)){const{state:ns,rep}=E.place(s,k,o.r);const v=E.botValue(s,ns,rep,'guloso');if(v>bv){bv=v;best={k,r:o.r,rep};}}
   const n=best.rep.newlyAlive.length;hist[n]=(hist[n]||0)+1;totalTurns++;
   if(isR&&n===0)dryPlaced++;
   s=E.place(s,best.k,best.r).state;}}
 return{hist,riverTurns,legalFrac:(legalFrac/riverTurns).toFixed(2),fewPct:(100*few/riverTurns).toFixed(1),totalTurns,dryRiverPct:(100*dryPlaced/riverTurns).toFixed(0)};}
console.log('base',JSON.stringify(run(B,false,40)));
console.log('rio encaixa',JSON.stringify(run(C,true,40)));
