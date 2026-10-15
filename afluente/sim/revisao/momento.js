// O que a pessoa sente jogada a jogada (v3.2). Uso: node momento.js ../ano_no_vale_motor.js [vales]
// Joga como o cuidadoso e, a cada jogada, olha TODAS as opções (casa × giro): quantas há, o quanto a melhor se
// destaca, se a escolha importa, e se a jogada feita teve algum acontecimento que se vê.
const E=eval('('+require('fs').readFileSync(process.argv[2],'utf8')+')()');
const N=+process.argv[3]||10,P=[];const med=a=>{a=a.slice().sort((x,y)=>x-y);return a.length?a[a.length>>1]:0;};
const M={moves:0,opts:[],slots:[],gapBM:[],gap12:[],flat:0,pts:[],quiet:0,ev:{perfeita:0,missao:0,afluente:0,agua:0,peca:0,seca:0,chuva:0},sinceEv:[],mustPlace:0,rotMatter:0,rotN:0,nearSame:0};
for(let v=0;v<N;v++){const seed='dia-t'+v,act=E.botPlay(seed,'cuidadoso').act;let s=E.newGame(seed),last=0;
  for(const a of act){if(E.over(s))break;
    const sl=E.slots(s);let all=[];const perSlot=new Map();
    for(const k of sl){const os=E.options(s,k);for(const o of os){const val=o.rep.pts+4*o.rep.tiles;all.push(val);perSlot.set(k,Math.max(perSlot.get(k)??-1e9,val));}
      if(os.length>1){M.rotN++;const vs=os.map(o=>o.rep.pts+4*o.rep.tiles);if(Math.max(...vs)-Math.min(...vs)>=2)M.rotMatter++;}}
    if(all.length){all.sort((x,y)=>y-x);M.opts.push(all.length);M.slots.push(perSlot.size);M.gapBM.push(all[0]-med(all));const ps=[...perSlot.values()].sort((x,y)=>y-x);M.gap12.push(ps.length>1?ps[0]-ps[1]:0);
      if(all[0]-med(all)<=2)M.flat++;if(ps.length>1&&ps[0]-ps[1]<=1)M.nearSame++;}
    const r=E.place(s,a.k,a.r),rep=r.rep,ns=E.faunaStep(r.state);M.moves++;M.pts.push(rep.pts);
    const ev=[];if(rep.perfect.length)ev.push('perfeita');if(rep.questsDone.length)ev.push('missao');if(rep.aflu&&rep.aflu.length)ev.push('afluente');
    if(rep.newlyAlive&&rep.newlyAlive.length>=2)ev.push('agua');if(rep.tiles>0)ev.push('peca');for(const e of rep.events||[]){if(e.type==='seca')ev.push('seca');if(e.type==='chuva')ev.push('chuva');}
    for(const e of new Set(ev))M.ev[e]++;
    if(!ev.length&&rep.pts<=3)M.quiet++;
    if(ev.length){M.sinceEv.push(M.moves-last);last=M.moves;}
    s=ns;}}
const pct=x=>(100*x/M.moves).toFixed(0)+'%',q=(a,p)=>{a=a.slice().sort((x,y)=>x-y);return a[Math.floor(p*(a.length-1))];};
console.log(`jogadas: ${M.moves} em ${N} vales`);
console.log(`opções por jogada (casa×giro): mediana ${med(M.opts)} (p10 ${q(M.opts,0.1)}, p90 ${q(M.opts,0.9)}) · casas possíveis: mediana ${med(M.slots)}`);
console.log(`a melhor opção vale quanto a mais que a opção mediana: mediana +${med(M.gapBM)} (p90 +${q(M.gapBM,0.9)}) · jogadas em que isso é ≤2: ${pct(M.flat)}`);
console.log(`a melhor casa contra a segunda melhor: diferença mediana ${med(M.gap12)} · empate técnico (≤1): ${pct(M.nearSame)}`);
console.log(`girar a peça muda o ganho (≥2) em ${(100*M.rotMatter/M.rotN).toFixed(0)}% das casas com mais de um giro`);
console.log(`pontos da jogada feita: mediana ${med(M.pts)} (p10 ${q(M.pts,0.1)}, p90 ${q(M.pts,0.9)})`);
console.log(`jogadas sem acontecimento e com ≤3 pontos: ${pct(M.quiet)} · intervalo entre acontecimentos: mediana ${med(M.sinceEv)}, p90 ${q(M.sinceEv,0.9)}`);
console.log('acontecimentos (% das jogadas): '+Object.entries(M.ev).map(([k,v])=>`${k} ${pct(v)}`).join(' · '));
