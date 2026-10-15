// Capturas do jogo em 3D (prototipo/afluente3d.html). Uso: node olhar_3d.js pasta [telas] [situações]
// Abre o arquivo direto do disco, com WebGL por software (SwiftShader), e lista erros do console.
const fs=require('fs'),path=require('path');let pw;try{pw=require('playwright');}catch(e){pw=require('/opt/node22/lib/node_modules/playwright');}
const exe=process.env.PW_CHROMIUM||(fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')?'/opt/pw-browsers/chromium-1194/chrome-linux/chrome':undefined);
const out=process.argv[2]||'.',onlyV=(process.argv[3]||'').split(',').filter(Boolean),onlyS=(process.argv[4]||'').split(',').filter(Boolean);
const url='file://'+path.resolve(__dirname,'../prototipo/afluente3d.html');
const VIEWS={celular:[390,844],computador:[1280,800]};
const SIT={
  inicio:`startGame(SEED,[])`,
  meio:`startGame(SEED,BOT.slice(0,20))`,
  escolhida:`startGame(SEED,BOT.slice(0,20));const k=[...G.valid].sort((a,b)=>{const[ax,ay]=scr(a),[bx,by]=scr(b);return Math.hypot(ax-W.w/2,ay-W.h/2)-Math.hypot(bx-W.w/2,by-W.h/2);})[0];select(k)`,
  seca:`let n=1;for(;n<BOT.length;n++){const s=E.replay(SEED,BOT.slice(0,n));if(s.seca&&n>30)break;}startGame(SEED,BOT.slice(0,n))`,
  fim:`startGame(SEED,BOT.slice(0,BOT.length-1))`,
  perto:`startGame(SEED,BOT.slice(0,24));const vk=[...G.s.board.keys()].find(k=>G.s.board.get(k).e.filter(x=>x==='V').length>=1)||E.SRC;const[a,b]=wpos(vk);cam.user=true;cam.s=cam.ts=150;cam.x=cam.tx=W.w/2-a*150;cam.y=cam.ty=W.h/2-b*150`,
  nascente:`startGame(SEED,BOT.slice(0,6));const[a,b]=wpos(E.SRC);cam.user=true;cam.s=cam.ts=120;cam.x=cam.tx=W.w/2-a*120;cam.y=cam.ty=W.h/2-b*120`,
  meio2d:`db.v3d=false;startGame(SEED,BOT.slice(0,20))`,
  corte:`const A=[{t:'mata',v:false},...E.botPlay(SEED,'cuidadoso',{protect:false}).act];let n=2,st;for(;n<A.length;n++){st=E.replay(SEED,A.slice(0,n));if(st.seca&&st.cut&&st.cut.size)break;}startGame(SEED,A.slice(0,n));const ck=[...G.s.cut][0];if(ck!=null){const[a,b]=wpos(ck);cam.user=true;cam.s=cam.ts=130;cam.x=cam.tx=W.w/2-a*130;cam.y=cam.ty=W.h/2-b*130;}`,
  noite:`startGame(SEED,BOT.slice(0,30));ENV.tf=ENV.tf;window.__noite=1`,
};
(async()=>{fs.mkdirSync(out,{recursive:true});
  const b=await pw.chromium.launch({executablePath:exe,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  for(const[vn,[w,h]]of Object.entries(VIEWS)){if(onlyV.length&&!onlyV.includes(vn))continue;
    for(const[sn,code]of Object.entries(SIT)){if(onlyS.length&&!onlyS.includes(sn))continue;
      const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});const errs=[];
      p.on('pageerror',e=>errs.push('pageerror: '+e.message));p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.type()+': '+m.text().slice(0,200));});
      await p.addInitScript(()=>{localStorage.setItem('afluente:v04',JSON.stringify({tutDone:true,seenIntro:true,amb:false,music:false}));window.__fixq=1;});
      await p.goto(url);await p.waitForTimeout(600);
      await p.evaluate(c=>{for(const id of['home','intro','menu','result','book'])if($(id))$(id).hidden=true;window.SEED='dia-2026-10-15';window.BOT=E.botPlay(SEED,'guloso').act;eval(c);},code);
      await p.waitForTimeout(2500);
      const info=await p.evaluate(()=>({v3d:typeof use3d==='function'&&use3d(),pieces:G.s.board.size,seca:G.s.seca,ms:QUAL.ema.toFixed(0)}));
      await p.screenshot({path:path.join(out,`${vn}_${sn}.png`)});
      console.log(`${vn} · ${sn}: 3D ${info.v3d?'sim':'NÃO'} · ${info.pieces} peças${info.seca?' · seca':''} · ~${info.ms} ms/quadro (software) · ${errs.length?errs.slice(0,4).join(' | '):'sem erros'}`);
      await p.close();}}
  await b.close();})();
