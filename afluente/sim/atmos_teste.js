// Teste da atmosfera (v2.0). Uso: node atmos_teste.js [atmos_motor.js] [anos]
// Joga o relógio do jogo (Águas 8 jogadas, Seca 4) com 8 s de verdade por jogada e confere:
// invariantes físicas, determinismo pela semente, e se a climatologia que sai bate com o Cerrado.
const fs=require('fs'),path=require('path');
const A=eval('('+fs.readFileSync(process.argv[2]||path.join(__dirname,'atmos_motor.js'),'utf8')+')()');
const YEARS=+process.argv[3]||20,SEC=8,DT=0.1;
let fails=0;const ok=(c,msg)=>{if(!c){fails++;console.log('FALHA:',msg);}};
function run(seed,map){
  const sky=A.Sky(seed),log=[];let tf=2,turn=0,season=1,clock=0;
  for(let y=0;y<YEARS;y++)for(let ph=0;ph<2;ph++){const len=ph?4:8;
    for(let c=0;c<len;c++){
      for(let t=0;t<SEC;t+=DT){tf+=(turn+2-tf)*Math.min(1,DT*0.7);
        const o=sky.step(DT,{tf,phase:ph,sp:(c+Math.min(1,t/SEC))/len,map,season:y*2+ph+1,slen:len});
        log.push({ph,sp:c/len,h:o.hour,T:o.T,Td:o.Td,RH:o.RH,lcl:o.lcl,R:o.R,w:o.wind.ms,cv:o.cv,fog:o.fog,cells:o.cells.length,Rc:o.cells.some(c=>c.forced)?0:o.R-o.nsR,fogW:o.fogW,
          fl:o.flashes.length,virga:o.cells.filter(x=>x.virga).length,sun:o.sun,vis:o.vis,fria:o.fria,z:o.zcas,desc:A.describe(o)});}
      turn++;}}
  return log;}
const map={m:0.5,veg:0.3,vila:0.1};
const L=run('dia-2026-10-15',map),L2=run('dia-2026-10-15',map),L3=run('outro-vale',map);
// 1. invariantes
let bad=0;for(const o of L){if(!(o.RH<=100.0001&&o.RH>0&&o.Td<=o.T+1e-9&&o.lcl>=0&&o.R>=0&&o.w>=0&&o.vis>0&&isFinite(o.T)))bad++;}
ok(bad===0,`invariantes violadas em ${bad} quadros`);
// 2. determinismo
ok(JSON.stringify(L)===JSON.stringify(L2),'mesma semente deu céu diferente');
ok(JSON.stringify(L)!==JSON.stringify(L3),'sementes diferentes deram o mesmo céu');
// 3. climatologia
const by=(f)=>{const a=L.filter(f);return a;},mean=(a,f)=>a.reduce((s,o)=>s+f(o),0)/Math.max(1,a.length);
const pct=(a,f)=>(100*a.filter(f).length/Math.max(1,a.length)).toFixed(1)+'%';
const ag=by(o=>o.ph===0),se=by(o=>o.ph===1);
const aft=a=>a.filter(o=>o.h>=14&&o.h<=16),dawn=a=>a.filter(o=>o.h>=5&&o.h<=7);
const row=(n,a)=>console.log(n.padEnd(6),
  `T tarde ${mean(aft(a),o=>o.T).toFixed(1)}°C madrugada ${mean(dawn(a),o=>o.T).toFixed(1)}°C`,
  `| UR tarde ${mean(aft(a),o=>o.RH).toFixed(0)}% madrugada ${mean(dawn(a),o=>o.RH).toFixed(0)}%`,
  `| base Cu tarde ${mean(aft(a),o=>o.lcl).toFixed(0)} m | vento ${mean(a,o=>o.w).toFixed(1)} m/s (máx ${Math.max(...a.map(o=>o.w)).toFixed(1)})`,
  `| chovendo ${pct(a,o=>o.R>0.1)} | chuva ${(mean(a,o=>o.R)*a.length*DT/3600).toFixed(2)} mm | neblina ${pct(a,o=>o.fog>0.35)} (no rio ${pct(a,o=>o.fogW>0.35)}) | vis ${mean(a,o=>o.vis).toFixed(0)} km`);
row('Águas',ag);row('Seca',se);
// a umidade da tarde na seca fica no ar seco do Cerrado (15–40%); nas águas, úmida
ok(mean(aft(se),o=>o.RH)<40&&mean(aft(se),o=>o.RH)>12,'UR da tarde na seca fora de 12–40%');
ok(mean(aft(ag),o=>o.RH)>45,'UR da tarde nas águas abaixo de 45%');
ok(mean(se,o=>o.R)===0,'choveu no chão durante a seca (só pode haver virga)');
ok(ag.some(o=>o.R>5),'nenhuma pancada nas águas');
// coerência com a regra da seca: as chuvas rareiam e param antes da seca chegar (nada de pancada e, logo depois, rio secando)
const fim=ag.filter(o=>o.sp>=7/8),fimR=mean(fim,o=>o.R);console.log(`chuva média na última jogada das águas: ${fimR.toFixed(3)} mm/h (no resto: ${mean(ag.filter(o=>o.sp<0.5),o=>o.R).toFixed(2)})`);
ok(fimR<0.05,'chove na última jogada antes da seca');
ok(mean(aft(ag),o=>o.lcl)<1800&&mean(aft(se),o=>o.lcl)>2000,'base dos cúmulos: águas baixa, seca alta');
// as pancadas das águas preferem a tarde
const rainH=new Array(24).fill(0);for(const o of ag)if(o.Rc>0.5)rainH[Math.floor(o.h)]++; // só as pancadas do dia (a ZCAS e a frente que traz as chuvas chegam a qualquer hora)
const tarde=rainH.slice(13,20).reduce((a,b)=>a+b,0),tot=rainH.reduce((a,b)=>a+b,0);
console.log('chuva por hora (águas):',rainH.map((n,i)=>n?`${i}h:${n}`:'').filter(Boolean).join(' '));
ok(tot>0&&tarde/tot>0.5,'a maior parte das pancadas das águas não caiu à tarde');
// desfazer a jogada que trouxe a seca (a estação volta para trás) não pode trazer a frente de "as chuvas voltaram"
{const sky=A.Sky('desfazer'),m={m:0.5,veg:0.3,vila:0.1};let tf=10;
 for(let i=0;i<40;i++)sky.step(0.1,{tf:tf+=0.01,phase:0,sp:0.9,map:m,season:1,slen:8});
 for(let i=0;i<40;i++)sky.step(0.1,{tf:tf+=0.01,phase:1,sp:0,map:m,season:2,slen:4});
 const o=sky.step(0.1,{tf:tf+=0.01,phase:0,sp:0.95,map:m,season:1,slen:8});
 ok(!o.cells.some(c=>c.forced),'desfazer a seca trouxe a frente das chuvas');
 const o2=sky.step(0.1,{tf:tf+=0.01,phase:1,sp:0.1,map:m,season:2,slen:4}),o3=sky.step(0.1,{tf:tf+=0.01,phase:0,sp:0,map:m,season:3,slen:8});
 ok(o3.cells.some(c=>c.forced),'a estação nova das águas não trouxe a frente');}
// sol: nasce a leste, se põe a oeste; na seca o sol do meio-dia fica ao norte
const s1=A.sun(200,8),s2=A.sun(200,16),s3=A.sun(200,12),s4=A.sun(355,12);
ok(s1.az>0&&s1.az<180&&s2.az>180,'sol fora de leste/oeste');ok(s3.az<10||s3.az>350,'sol do meio-dia de inverno não está ao norte');
ok(s4.elev>80,'sol de dezembro ao meio-dia não está quase a pino');
// gotas: chuva forte tem gotas maiores e mais rápidas
const d1=A.drops(1),d50=A.drops(50);ok(d1.vt>3&&d1.vt<4.5&&d50.vt>6&&d50.vt<7.5&&d50.D0>d1.D0,'gotas fora das referências');
// moinho
const m1=A.mill(2,0.08,25),m5=A.mill(5,0.08,25),m14=A.mill(14,0.08,25);
ok(!m1.run&&m5.run&&m5.rpm>10&&m5.rpm<30&&m14.furled,'moinho: partida, rpm ou freio errados');
console.log(`moinho a 5 m/s: ${m5.rpm.toFixed(1)} rpm, ${(m5.P/1000).toFixed(2)} kW | ar a 1.100 m: ${A.rhoOf(25).toFixed(3)} kg/m³ | gotas 1 mm/h: D0 ${d1.D0.toFixed(2)} mm ${d1.vt.toFixed(1)} m/s; 50 mm/h: D0 ${d50.D0.toFixed(2)} mm ${d50.vt.toFixed(1)} m/s`);
// o mapa muda o céu: vale com água e mata é mais úmido e tem mais nuvens que vale seco de vila
const wet=run('dia-2026-10-15',{m:0.95,veg:0.6,vila:0}),dry=run('dia-2026-10-15',{m:0.05,veg:0,vila:0.5});
const agw=wet.filter(o=>o.ph===0),agd=dry.filter(o=>o.ph===0);
console.log(`mapa úmido: UR tarde ${mean(aft(agw),o=>o.RH).toFixed(0)}% Cu ${mean(aft(agw),o=>o.cv.Cu).toFixed(2)} chovendo ${pct(agw,o=>o.R>0.1)} | mapa seco: UR ${mean(aft(agd),o=>o.RH).toFixed(0)}% Cu ${mean(aft(agd),o=>o.cv.Cu).toFixed(2)} chovendo ${pct(agd,o=>o.R>0.1)}`);
ok(mean(aft(agw),o=>o.RH)>mean(aft(agd),o=>o.RH)+5,'mata e água não umedecem o ar');
// o que se vê no céu ao longo dos anos
const seen={};for(const o of L)seen[o.desc.split(',')[0]]=(seen[o.desc.split(',')[0]]||0)+1;
console.log('céus vistos:',Object.entries(seen).sort((a,b)=>b[1]-a[1]).map(([k,n])=>`${k} ${(100*n/L.length).toFixed(1)}%`).join(' · '));
console.log(`raios: ${L.reduce((a,o)=>a+o.fl,0)} · friagem: ${pct(se,o=>o.fria>0.5)} da seca · ZCAS: ${pct(ag,o=>o.z>0.5)} das águas`);
console.log(fails?`${fails} falha(s)`:'tudo certo');process.exit(fails?1:0);
