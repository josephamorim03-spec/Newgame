// Auditor de interface (v2.2). Uso: node interface_teste.js [pasta_de_capturas] [telas] [situações]
// Abre o protótipo num navegador sem tela em vários tamanhos e situações do jogo e mede, sem olhar:
// - FONTE: texto visível menor que 11 px (erro) ou 12 px (aviso; só legendas em maiúsculas podem ficar em 11);
// - CORTE: texto que não cabe e é cortado sem reticências (erro) ou com reticências (aviso);
// - SOBREPOSIÇÃO: componentes da interface que se cobrem (erro);
// - FORA: componente que sai da tela (erro);
// - TOQUE: botão menor que 36 px (erro) ou 44 px (aviso);
// - VAZA: texto maior que a caixa, passando por cima do vizinho (erro); QUEBRA: botão com texto em 2+ linhas;
// - RÓTULOS DO VALE: rótulo sob a interface ou rótulo importante (alerta para cima) que sumiu por falta de espaço.
// Regras e prioridades: afluente/INTERFACE.md. Sai com código 1 se houver erro.
const path=require('path'),fs=require('fs');
let pw;try{pw=require('playwright');}catch(e){pw=require('/opt/node22/lib/node_modules/playwright');}
const exe=process.env.PW_CHROMIUM||(fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')?'/opt/pw-browsers/chromium-1194/chrome-linux/chrome':undefined);
const out=process.argv[2]||null,onlyV=(process.argv[3]||'').split(',').filter(Boolean),onlyS=(process.argv[4]||'').split(',').filter(Boolean);
const url='file://'+path.resolve(__dirname,'../prototipo/index.html');
const VIEWS={'celular-pequeno':[360,640],'iphone-se':[375,667],'celular':[390,844],'celular-grande':[412,915],'deitado':[844,390],'tablet':[768,1024],'computador':[1280,800]};
// componentes de primeiro nível: cada um é uma caixa que não pode cobrir outra
const COMP=['.top .brand','#leftBox','#scoreBox','#helpBtn','.seasonbar','#qchips > *','#lesson','#banner','#coach','#recenter','#calmBtn','#muteBtn','#skyCard','#calmTip','#hint > span','.dock .cur','.dock .info','.dock .next','#rotL','#placeBtn','#rotR','#undoBtn'];
const SEED='dia-2026-10-15';
// situações: cada uma prepara o jogo (no navegador) e devolve o nome de quem deve estar à vista
const SIT={
  inicio:`startGame(SEED,[])`,
  meio:`startGame(SEED,BOT.slice(0,20))`,
  escolhida:`startGame(SEED,BOT.slice(0,20));const k=[...G.valid].sort((a,b)=>{const[ax,ay]=scr(a),[bx,by]=scr(b);return Math.hypot(ax-W.w/2,ay-W.h/2)-Math.hypot(bx-W.w/2,by-W.h/2);})[0];select(k)`,
  seca_aviso:`let n=1;for(;n<BOT.length;n++){const s=E.replay(SEED,BOT.slice(0,n)),b=E.balance(s);if(!b.seca&&b.turnsLeft<=3&&b.risk.length)break;}startGame(SEED,BOT.slice(0,n))`,
  faixa:`startGame(SEED,BOT.slice(0,20));queueBanner('As chuvas voltaram! Ano 2 · +2 peças','water')`,
  missoes:`startGame(SEED,BOT.slice(0,14))`,
  licao:`startGame('licao-3',[])`,
  resultado:`startGame(SEED,BOT);if($('result').hidden)showResult()`,
  caderno:`startGame(SEED,BOT.slice(0,20));showBook()`,
  menu:`startGame(SEED,BOT.slice(0,20));$('helpBtn').click()`,
  contemplar:`startGame(SEED,BOT.slice(0,30));enterCalm()`,
};
(async()=>{
  const b=await pw.chromium.launch({executablePath:exe});const rep=[];let errs=0,warns=0;
  for(const[vn,[w,h]]of Object.entries(VIEWS)){if(onlyV.length&&!onlyV.includes(vn))continue;
    for(const[sn,code]of Object.entries(SIT)){if(onlyS.length&&!onlyS.includes(sn))continue;
      const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});const perr=[];p.on('pageerror',e=>perr.push(e.message));
      await p.addInitScript(()=>{localStorage.setItem('afluente:v04',JSON.stringify({tutDone:true,seenIntro:true,amb:false,music:false}));window.__fixq=1;});
      await p.goto(url);await p.waitForTimeout(500);
      await p.evaluate(c=>{for(const id of['home','intro','menu','result','book'])if($(id))$(id).hidden=true;window.SEED='dia-2026-10-15';window.BOT=E.botPlay(SEED,'guloso').act;eval(c);},code);
      await p.waitForTimeout(sn==='faixa'?450:1300);
      const r=await p.evaluate(COMP=>{
        const vis=el=>{if(!el)return false;for(let e=el;e&&e!==document.body;e=e.parentElement){if(e.hidden)return false;const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity<0.15)return false;}
          const r=el.getBoundingClientRect();return r.width>1&&r.height>1;};
        const W0=innerWidth,H0=innerHeight,iss=[];
        // modal aberto: só ele conta
        const modal=[...document.querySelectorAll('.overlay,.home')].find(vis);
        const scope=modal||document.body;
        // texto: tamanho e corte
        for(const el of scope.querySelectorAll('*')){if(!vis(el))continue;const txt=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim()).join(' ');if(!txt)continue;
          // a área de toque estendida (::after) não é texto: não conta para largura e altura
          const af=getComputedStyle(el,'::after'),hx=af.content&&af.content!=='none'&&af.position==='absolute'?Math.max(0,-parseFloat(af.left)||0)+Math.max(0,-parseFloat(af.right)||0):0,hy=hx?Math.max(0,-parseFloat(af.top)||0)+Math.max(0,-parseFloat(af.bottom)||0):0;
          const cs=getComputedStyle(el),fz=parseFloat(cs.fontSize),up=cs.textTransform==='uppercase',id=(el.id?'#'+el.id:el.tagName.toLowerCase()+(el.className&&typeof el.className==='string'?'.'+el.className.split(' ')[0]:''));
          if(fz<11)iss.push(['erro','FONTE',`${id} "${txt.slice(0,30)}" com ${fz}px`]);else if(fz<12&&!up)iss.push(['aviso','FONTE',`${id} "${txt.slice(0,30)}" com ${fz}px`]);
          if(el.scrollWidth>el.clientWidth+1+hx&&cs.overflow!=='visible'&&el.clientWidth>0){const ell=cs.textOverflow==='ellipsis';iss.push([ell?'aviso':'erro','CORTE',`${id} "${txt.slice(0,30)}" ${ell?'com reticências':'cortado'} (${el.scrollWidth}>${el.clientWidth})`]);}
          // VAZA: texto maior que a própria caixa, sem corte (passa por cima do vizinho)
          if(cs.overflow==='visible'&&el.clientWidth>0&&el.scrollWidth>el.clientWidth+2+hx&&cs.display!=='inline')iss.push(['erro','VAZA',`${id} "${txt.slice(0,30)}" (${el.scrollWidth}>${el.clientWidth})`]);
          // QUEBRA: texto de botão em mais de uma linha
          if(el.closest('button,.btn')&&cs.whiteSpace!=='normal'||el.matches('button,.btn')){const lh=parseFloat(cs.lineHeight)||fz*1.2,tops=[];for(const n of el.childNodes){if(n.nodeType!==3||!n.textContent.trim())continue;const rg=document.createRange();rg.selectNodeContents(n);for(const q of rg.getClientRects())if(q.width>1&&!tops.some(t=>Math.abs(t-q.top)<lh*0.6))tops.push(q.top);}
            if(tops.length>1)iss.push([el.id==='placeBtn'?'erro':'aviso','QUEBRA',`${id} "${txt.slice(0,30)}" em ${tops.length} linhas`]);}
          if(el.scrollHeight>el.clientHeight+2+hy&&cs.overflow==='hidden'&&el.clientHeight>0&&!modal)iss.push(['erro','CORTE',`${id} "${txt.slice(0,30)}" sem altura (${el.scrollHeight}>${el.clientHeight})`]);}
        // componentes: sobreposição e fora da tela (sem modal)
        const comps=[];if(!modal)for(const sel of COMP)for(const el of document.querySelectorAll(sel))if(vis(el)){const q=el.getBoundingClientRect();comps.push([sel+(el.id&&!sel.includes(el.id)?'#'+el.id:''),q]);}
        for(let i=0;i<comps.length;i++){const[a,A]=comps[i];
          if(A.left<-1||A.top<-1||A.right>W0+1||A.bottom>H0+1)iss.push(['erro','FORA',`${a} [${A.left|0},${A.top|0},${A.right|0},${A.bottom|0}] na tela ${W0}×${H0}`]);
          for(let j=i+1;j<comps.length;j++){const[bn,B]=comps[j],ix=Math.min(A.right,B.right)-Math.max(A.left,B.left),iy=Math.min(A.bottom,B.bottom)-Math.max(A.top,B.top);
            if(ix>2&&iy>2)iss.push(['erro','SOBREPOSIÇÃO',`${a} × ${bn} (${ix|0}×${iy|0} px)`]);}}
        // toque
        for(const el of scope.querySelectorAll('button,.btn,a')){if(!vis(el)||el.disabled&&el.id==='undoBtn')continue;const q=el.getBoundingClientRect(),id=el.id||el.textContent.trim().slice(0,20);
          // área de toque estendida por ::after (o desenho não cresce, o toque sim)
          const af=getComputedStyle(el,'::after'),ext=af.content&&af.content!=='none'&&af.position==='absolute'?k=>Math.max(0,-parseFloat(af[k])||0):()=>0;
          const m=Math.min(q.width+ext('left')+ext('right'),q.height+ext('top')+ext('bottom'));
          if(el.classList.contains('link')||el.classList.contains('undo')){if(q.height<32)iss.push(['aviso','TOQUE',`${id} com ${q.width|0}×${q.height|0} px`]);continue;}
          if(m<36)iss.push(['erro','TOQUE',`${id} com ${q.width|0}×${q.height|0} px`]);else if(m<44)iss.push(['aviso','TOQUE',`${id} com ${q.width|0}×${q.height|0} px`]);}
        // rótulos do vale
        if(!modal&&G.lbl){const L=G.lbl,cr=$('board').getBoundingClientRect();
          for(const l of L.list){if(l.drop){if(l.pri>=PRI.alerta)iss.push(['erro','RÓTULO',`"${l.txt}" (prioridade ${l.pri}) sumiu por falta de espaço`]);else iss.push(['aviso','RÓTULO',`"${l.txt}" (prioridade ${l.pri}) escondido`]);continue;}
            const[x0,y0,x1,y1]=l.r;if(L.obs.some(q=>x0+3<q[2]&&x1-3>q[0]&&y0+3<q[3]&&y1-3>q[1]))iss.push([l.pri>=PRI_OBRIG?'aviso':'erro','RÓTULO',`"${l.txt}" debaixo da interface`]);
            if(x0<0||y0<0||x1>cr.width||y1>cr.height)iss.push(['aviso','RÓTULO',`"${l.txt}" encostado na borda`]);}}
        return{iss,modal:modal&&modal.id};},COMP);
      if(out){fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,`${vn}_${sn}.png`)});}
      for(const e of perr)r.iss.push(['erro','JS',e]);
      // a mesma falha em vários elementos iguais conta uma vez
      const seen=new Set();r.iss=r.iss.filter(i=>{const k=i.join('|');if(seen.has(k))return false;seen.add(k);return true;});
      for(const i of r.iss){if(i[0]==='erro')errs++;else warns++;}
      rep.push({tela:vn,situacao:sn,iss:r.iss});await p.close();}}
  await b.close();
  for(const r of rep){if(!r.iss.length)continue;console.log(`\n${r.tela} · ${r.situacao}`);for(const i of r.iss)console.log(`  ${i[0]==='erro'?'✗':'·'} ${i[1]}: ${i[2]}`);}
  console.log(`\n${rep.length} telas: ${errs} erro(s), ${warns} aviso(s)`);
  if(out)fs.writeFileSync(path.join(out,'interface.json'),JSON.stringify(rep,null,1));
  process.exit(errs?1:0);
})();
