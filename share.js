'use strict';
function knotRoundRect(ctx,x,y,w,h,r){
  const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath()
}
function knotShareUrl(path,params={}){
  const u=new URL(path,location.href);Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')u.searchParams.set(k,String(v))});return u.toString()
}
function geometryBounds(pts){const xs=pts.map(p=>p.x??p[0]),ys=pts.map(p=>p.y??p[1]);return{minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)}}
function drawShareGeometry(ctx,pts,edges,box){
  if(!pts?.length)return;const b=geometryBounds(pts),w=Math.max(1,b.maxX-b.minX),h=Math.max(1,b.maxY-b.minY),scale=Math.min(box.w/w,box.h/h)*.88,ox=box.x+box.w/2-(b.minX+b.maxX)/2*scale,oy=box.y+box.h/2-(b.minY+b.maxY)/2*scale;
  const P=p=>({x:(p.x??p[0])*scale+ox,y:(p.y??p[1])*scale+oy});
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  ctx.strokeStyle='#cfc4b6';ctx.lineWidth=2;ctx.globalAlpha=.45;ctx.beginPath();ctx.arc(box.x+box.w/2,box.y+box.h/2,Math.min(box.w,box.h)*.36,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
  for(const e of edges||[]){const a=P(e.a??pts[e.from]),b2=P(e.b??pts[e.to]);ctx.strokeStyle=e.echo?'#5d9d98':'#302925';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b2.x,b2.y);ctx.stroke()}
  for(const p0 of pts){const p=P(p0);ctx.fillStyle='#f4ecdf';ctx.beginPath();ctx.arc(p.x,p.y,21,0,Math.PI*2);ctx.fill();ctx.fillStyle='#5b5149';ctx.beginPath();ctx.arc(p.x,p.y,12,0,Math.PI*2);ctx.fill()}
  ctx.restore()
}
async function knotShareCard(opts={}){
  const W=1080,H=1350,c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d');
  const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#f7f1e8');bg.addColorStop(1,'#e8ddcf');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(93,157,152,.10)';ctx.beginPath();ctx.arc(150,150,230,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(212,107,88,.08)';ctx.beginPath();ctx.arc(930,230,250,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#1f1b18';ctx.font='800 48px system-ui,-apple-system,sans-serif';ctx.fillText('KNOT',72,92);ctx.font='600 26px system-ui,-apple-system,sans-serif';ctx.fillStyle='#756c63';ctx.fillText(opts.mode||'Desafio',72,132);
  knotRoundRect(ctx,64,170,952,188,42);ctx.fillStyle='rgba(255,251,246,.84)';ctx.fill();ctx.fillStyle='#756c63';ctx.font='700 28px system-ui,-apple-system,sans-serif';ctx.fillText((opts.scoreLabel||'PONTOS').toUpperCase(),102,232);ctx.fillStyle='#1f1b18';ctx.font='850 86px system-ui,-apple-system,sans-serif';ctx.fillText(opts.score||'0',98,326);
  if(opts.badge){ctx.font='700 26px system-ui,-apple-system,sans-serif';const tw=ctx.measureText(opts.badge).width;knotRoundRect(ctx,970-tw-42,218,tw+42,54,27);ctx.fillStyle='rgba(217,170,93,.16)';ctx.fill();ctx.fillStyle='#806126';ctx.fillText(opts.badge,991-tw-42,254)}
  knotRoundRect(ctx,64,390,952,690,50);ctx.fillStyle='rgba(255,251,246,.70)';ctx.fill();drawShareGeometry(ctx,opts.pts||[],opts.edges||[],{x:125,y:430,w:830,h:610});
  ctx.fillStyle='#1f1b18';ctx.font='800 38px system-ui,-apple-system,sans-serif';ctx.fillText(opts.title||'Sua geometria',72,1148);
  ctx.fillStyle='#756c63';ctx.font='500 27px system-ui,-apple-system,sans-serif';ctx.fillText(opts.subtitle||'',72,1190);
  ctx.font='650 28px system-ui,-apple-system,sans-serif';ctx.fillStyle='#5d5953';ctx.fillText(opts.meta||'',72,1235);
  ctx.fillStyle='#1f1b18';ctx.font='750 28px system-ui,-apple-system,sans-serif';ctx.fillText(opts.invite||'Consegue fazer melhor?',72,1285);
  const url=opts.url||location.href;ctx.fillStyle='#6c635a';ctx.font='500 20px system-ui,-apple-system,sans-serif';const short=url.replace(/^https?:\/\//,'').slice(0,78);ctx.fillText(short,72,1324);
  const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png',.94));if(!blob)throw new Error('Não foi possível gerar a imagem');
  const file=new File([blob],(opts.filename||'KNOT-desafio')+'.png',{type:'image/png'});
  const text=(opts.shareText||'Consegue fazer melhor no KNOT?')+'\n'+url;
  if(navigator.share){
    try{
      if(!navigator.canShare||navigator.canShare({files:[file]})){await navigator.share({title:opts.title||'KNOT',text:opts.shareText||'Consegue fazer melhor?',url,files:[file]});return{shared:true,blob,url}}
      await navigator.share({title:opts.title||'KNOT',text,url});return{shared:true,blob,url}
    }catch(e){if(e&&e.name==='AbortError')return{shared:false,cancelled:true,blob,url}}
  }
  try{await navigator.clipboard.writeText(text)}catch(e){}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=file.name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1200);
  return{shared:false,downloaded:true,blob,url}
}
