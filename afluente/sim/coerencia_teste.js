// Teste de coerência entre o mundo que se vê e as regras do jogo (v2.2). Uso: node coerencia_teste.js [vales]
// Joga partidas inteiras no protótipo (navegador sem tela), com o tempo correndo, e confere a cada quadro:
// - na seca não chove no chão, não cai raio e não há cortina de chuva (só virga);
// - na última jogada antes da seca as chuvas já pararam (nada de pancada e, logo depois, o rio secando);
// - arco-íris só com o sol entre 0° e 42° e de dia; neblina só de madrugada e de manhã;
// - de noite e na chuva forte não nascem bandos, araras, borboletas nem libélulas;
// - redemoinho só na seca, de dia;
// - todo raio vem de uma pancada de verdade (com chuva), e não da garoa contínua;
// - gado, ovelhas e fauna só onde a regra da espécie permite (mapa de colisão);
// - números do ambiente sempre finitos (nada de NaN); nenhum erro de JavaScript.
// Sai com código 1 se alguma regra falhar.
const path=require('path'),fs=require('fs');
let pw;try{pw=require('playwright');}catch(e){pw=require('/opt/node22/lib/node_modules/playwright');}
const exe=process.env.PW_CHROMIUM||(fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')?'/opt/pw-browsers/chromium-1194/chrome-linux/chrome':undefined);
const N=+process.argv[2]||3,url='file://'+path.resolve(__dirname,'../prototipo/index.html');
(async()=>{
  const b=await pw.chromium.launch({executablePath:exe}),p=await b.newPage({viewport:{width:412,height:860}});const errs=[];
  p.on('pageerror',e=>errs.push(e.message+' '+((e.stack||'').split('\n')[1]||'')));
  await p.addInitScript(()=>{localStorage.setItem('afluente:v04',JSON.stringify({tutDone:true,seenIntro:true,amb:false,music:false}));window.__fixq=1;});
  await p.goto(url);await p.waitForTimeout(500);
  const r=await p.evaluate(async N=>{
    for(const id of['home','intro','menu','result','book'])if($(id))$(id).hidden=true;
    const F={},st={quadros:0,chuva:0,seca:0,raios:0,arcos:0,neblina:0,redemoinhos:0,bandos:0};
    const fail=(k,m)=>{F[k]=F[k]||{n:0,ex:m};F[k].n++;};
    let t=performance.now(),birds=0,bf=0;
    const frame=()=>{t+=100;draw(t);st.quadros++;const s=G.s,o=ENV.atm;if(!o)return;const B=G.bal;
      for(const v of[ENV.wind.ms,ENV.wind.a,ENV.sh[0],ENV.sh[1],ENV.R,ENV.oc,ENV.fog,o.T,o.RH,o.lcl,o.sun.elev,ENV.wetness||0])if(!Number.isFinite(v))fail('NaN','valor do ambiente não finito');
      if(s.seca){st.seca++;if(ENV.R>0.01)fail('chuva na seca',`R=${ENV.R.toFixed(2)} na seca`);
        for(const c of o.cells)if((c.R0e||0)>0)fail('pancada na seca','célula com chuva na seca');if(o.flashes.length)fail('raio na seca','raio na seca');}
      else if(B&&!B.noSeasons&&B.turnsLeft<=1&&ENV.R>0.05)fail('chuva antes da seca',`R=${ENV.R.toFixed(2)} na última jogada das Águas`);
      if(ENV.R>0.1)st.chuva++;
      for(const f of o.flashes){st.raios++;const c=o.cells.find(c=>c.id===f.cell);if(!c||c.virga||!(c.R0e>12))fail('raio sem pancada','raio de célula sem chuva');}
      if(ENV.bow>0.04){st.arcos++;if(!(o.sun.elev>0&&o.sun.elev<42)||ENV.night>0.3)fail('arco-íris impossível',`sol a ${o.sun.elev.toFixed(1)}°`);}
      if(o.fog>0.3){st.neblina++;if(o.hour>=11&&o.hour<19)fail('neblina à tarde',`neblina às ${o.hour.toFixed(1)} h`);}
      if(ENV.devils.length){st.redemoinhos++;if(!s.seca||ENV.night>0.4)fail('redemoinho fora da seca','redemoinho sem seca ou de noite');}
      // nascimentos de aves e borboletas neste quadro
      const nb=BIRDS.filter(x=>t-x.t0<101&&t-x.t0>=0).length;if(BIRDS.length>birds&&nb){st.bandos++;if(ENV.night>0.4||ENV.rain>0.4)fail('aves de noite/na chuva','bando nasceu de noite ou na chuva forte');}birds=BIRDS.length;
      const nbf=(G.bf||[]).length;if(nbf>bf&&(ENV.night>0.3||ENV.rain>0.1))fail('borboleta de noite/na chuva','borboleta nasceu de noite ou na chuva');bf=nbf;
      if(FLIES.length&&(ENV.night>0.5||ENV.rain>0.3))fail('libélula de noite/na chuva','libélula de noite ou na chuva');
      // o mundo: gado e ovelhas e os bichos da fauna só onde a regra da espécie deixa (nada de bicho na água, em casa ou cerca)
      if(st.quadros%10===0&&G.world){for(const a of DYNST.values())if(a&&!a.dead&&a.w===G.world&&a.dim&&!wbody(a.x,a.y,a))fail('bicho fora do lugar',`gado/ovelha (${a.rule}) num lugar proibido`);
        for(const id in G.fa){const a=G.fa[id];if(a&&a.w===G.world&&!wok(a.x,a.y,FRULE[id]||'terra',fRad(id)))fail('fauna fora do lugar',`${id} num lugar proibido`);}}};
    for(let v=0;v<N;v++){const seed='dia-t'+(v*5+1),bp=E.botPlay(seed,'guloso');startGame(seed,[]);
      for(const a of bp.act){const res=E.place(G.s,a.k,a.r);G.undo=G.s;G.s=res.state;yearEvents(G.s,res.rep,t);refresh();for(let i=0;i<70;i++)frame();}
      // desfazer a jogada que trouxe a seca não pode trazer "as chuvas voltaram"
      G.calmBase={ts:30,tx:0,ty:0,t0:t};G.calm=true;for(let i=0;i<900;i++)frame();G.calm=false;G.calmBase=null;}
    startGame('licao-5',[]);for(let i=0;i<60;i++)frame();
    return{F,st};},N);
  await b.close();
  console.log('quadros',r.st.quadros,'| chovendo',r.st.chuva,'| na seca',r.st.seca,'| raios',r.st.raios,'| arco-íris',r.st.arcos,'| neblina',r.st.neblina,'| redemoinhos',r.st.redemoinhos,'| bandos',r.st.bandos);
  const ks=Object.keys(r.F);for(const k of ks)console.log(`FALHA ${k}: ${r.F[k].n}× (${r.F[k].ex})`);
  for(const e of[...new Set(errs)])console.log('ERRO JS:',e);
  const bad=ks.length+errs.length;console.log(bad?`${bad} problema(s)`:'tudo coerente');process.exit(bad?1:0);
})();
