// Teste da aldeia e da despensa (v3.1). Uso: node aldeia_teste.js [vales]
// 1. A friagem das regras (Engine.friagem) é a mesma do céu (Atmos): para cada vale e cada seca, o céu tem frente fria
//    exatamente quando a regra diz que há friagem.
// 2. Invariantes da despensa em partidas inteiras dos bots, com a chave ligada e desligada:
//    estoques nunca negativos; casas atendidas ≤ casas; só se corta mata com a chave desligada, só da beira do rio e
//    só no alcance da aldeia; a mata cortada rebrota nas chuvas; a partida se refaz igual pelo histórico.
const fs=require('fs'),path=require('path');
const E=eval('('+fs.readFileSync(path.join(__dirname,'ano_no_vale_motor.js'),'utf8')+')()');
const A=eval('('+fs.readFileSync(path.join(__dirname,'atmos_motor.js'),'utf8')+')()');
const N=+process.argv[2]||12;let fails=0;const ok=(c,m)=>{if(!c){fails++;if(fails<20)console.log('FALHA:',m);}};
// 1. friagem: regra × céu
let secas=0,frias=0;
for(let v=0;v<N*3;v++){const seed='dia-t'+v,sky=A.Sky(seed);let tf=2,turn=0;
  for(let y=0;y<4;y++)for(let ph=0;ph<2;ph++){const len=ph?4:8,season=y*2+ph+1;let mx=0;
    for(let c=0;c<len;c++){for(let t=0;t<8;t+=0.25){tf+=(turn+2-tf)*Math.min(1,0.25*0.7);const o=sky.step(0.25,{tf,phase:ph,sp:(c+t/8)/len,season,slen:len});mx=Math.max(mx,o.fria||0);}turn++;}
    if(ph){secas++;const rule=E.friagem(seed,season);if(rule)frias++;ok(rule===(mx>0.05),`${seed} seca ${season}: regra ${rule}, céu ${mx.toFixed(2)}`);}}}
console.log(`friagem: ${frias} de ${secas} secas (${(100*frias/secas).toFixed(0)}%), regra e céu de acordo`);
// 2. invariantes
let anos=0,cortes=0,fartos=0,tocos=0;
for(let v=0;v<N;v++)for(const prot of[true,false]){const seed='dia-t'+v,bp=E.botPlay(seed,'cuidadoso').act;let s=E.newGame(seed);if(!prot)s=E.setProtect(s,false);
  for(const a of bp){if(E.over(s))break;const r=E.place(s,a.k,a.r),n=E.faunaStep(r.state);
    ok(n.store.comida>=0&&n.store.lenha>=0,`${seed}: estoque negativo`);
    for(const ev of r.rep.events){
      if(ev.type==='despensa'){ok(ev.atendidas<=ev.casas,'atendidas > casas');ok(prot?ev.cut.length===0:true,'cortou com a chave ligada');
        const al=E.aldeiaOf(n.board);for(const k of ev.cut){const t=n.board.get(k);ok(t.e.includes('B')&&al.reach.has(k),'corte fora da regra');}
        for(const k of ev.cut)ok(n.cut.has(k),'mata cortada não ficou marcada');cortes+=ev.cut.length;
        const lenhaDe=new Set(ev.gather.filter(g=>g[1]==='l').map(g=>g[0]));
        for(const k of ev.toco){ok(!lenhaDe.has(k),'toco deu lenha');ok(!ev.cut.includes(k),'toco cortado de novo');ok(n.cut.has(k),'toco segurou o rio');}
        ok(ev.toco.every(k=>(s.toco||new Set()).has(k)),'toco que não veio do ano anterior');}
      if(ev.type==='ano'){anos++;if(ev.farto)fartos++;ok(n.cut.size===0,'mata não rebrotou nas chuvas');ok([...n.toco.keys()].every(k=>s.cut.has(k)),'toco que não foi cortado nesta seca');tocos+=n.toco.size;}}
    s=n;}
  const acts=prot?bp:[{t:'mata',v:false},...bp];ok(E.replay(seed,acts).score===s.score,`${seed}: replay diferente`);}
console.log(`despensa: ${anos} anos, ${fartos} fartos, ${cortes} matas da beira cortadas (com a chave desligada), ${tocos} ficaram em toco por mais um ano`);
console.log(fails?`${fails} falha(s)`:'tudo certo');process.exit(fails?1:0);
