// Auditoria das missões: por tipo, quantas se cumprem, quantas vencem, quantas nascem sem chance (pilha curta).
const fs=require('fs');const motor=process.argv[2],pol=process.argv[3],N=+process.argv[4];
if(process.argv[5])global.AFLUENTE_CFG=JSON.parse(process.argv[5]);
const E=eval('(function(){var AFLUENTE_CFG=global.AFLUENTE_CFG;return ('+fs.readFileSync(motor,'utf8')+')();})()');
const T={};const add=(k,f)=>{T[k]=T[k]||{n:0,done:0,late:0,open:0,doneTurns:0,noChance:0,lastTenth:0,lastTenthDone:0,need:0};f(T[k]);};
for(let i=0;i<N;i++){let s=E.newGame('dia-t'+i);const born=new Map();
  while(!E.over(s)&&s.turn<300){const rots=E.rotations(E.cur(s).e);const leg=k=>rots.filter(o=>E.legal(s.board,k,o.e));
    const slots=E.slots(s).filter(k=>leg(k).length);if(!slots.length){s=E.discard?E.discard(s):s;if(!E.discard)break;continue;}
    let best,bv=-1e9;const before=pol==='mestre'?null:null;
    for(const k of slots)for(const o of leg(k)){const{state:ns,rep}=E.place(s,k,o.r);const v=E.botValue(s,ns,rep,pol);if(v>bv){bv=v;best={k,r:o.r};}}
    s=E.place(s,best.k,best.r).state;
    for(const q of s.quests){const id=q.key+':'+q.edge;if(!born.has(id))born.set(id,{turn:s.turn,left:s.left,need:q.flow?0:q.n-(q.cur||0)});}}
  const end=s.turn;
  for(const q of s.quests){const id=q.key+':'+q.edge,b=born.get(id)||{turn:0,left:99};const k=q.flow?'água':q.b;
    add(k,t=>{t.n++;if(q.status==='done')t.done++;else if(q.status==='late')t.late++;else t.open++;
      if(b.turn>0.9*end){t.lastTenth++;if(q.status==='done')t.lastTenthDone++;}
      if(q.status!=='done'&&q.status!=='late')t.noChance++;});}}
console.log(motor,pol,N,'vales');
for(const[k,t]of Object.entries(T))console.log(`  ${k.padEnd(5)} missões ${(t.n/N).toFixed(1)}/partida · cumpridas ${(100*t.done/t.n).toFixed(0)}% · venceram ${(100*t.late/t.n).toFixed(0)}% · abertas no fim ${(100*t.open/t.n).toFixed(0)}% · nascidas no último décimo ${t.lastTenth} (cumpridas ${t.lastTenthDone})`);
