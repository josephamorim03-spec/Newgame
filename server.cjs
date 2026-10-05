const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};
http.createServer((req,res)=>{
  let file;
  try { file = path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname)); } catch { res.writeHead(400).end(); return; }
  if (!file.startsWith(root+path.sep) && file!==root) { res.writeHead(403).end(); return; }
  if (file===root || file===root+path.sep) file=path.join(root,'index.html');
  fs.readFile(file,(error,data)=>{ if(error){res.writeHead(404).end('Not found');return;} res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data); });
}).listen(Number(process.env.PORT)||4173,'0.0.0.0',()=>console.log('RING//BREAK http://localhost:'+(process.env.PORT||4173)));
