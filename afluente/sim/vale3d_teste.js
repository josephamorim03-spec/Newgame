// Teste do tabuleiro 3D sem navegador: monta peças de todos os tipos e estados e confere a geometria.
// Uso: node vale3d_teste.js (precisa do esbuild via npx, como o gerar_3d.sh)
const {execSync}=require('child_process'),path=require('path'),fs=require('fs');
const root=path.resolve(__dirname,'..'),tmp=path.join(require('os').tmpdir(),'vale3d_teste.cjs');
execSync(`npx --yes esbuild jogo3d/vale3d.js --bundle --format=cjs --alias:three=./prototipo3d/js/three.module.min.js --outfile=${tmp} --log-level=error`,{cwd:root});
global.window={};require(tmp);const B=window.V3D._buildTile;
const T=['A','B','C','G','V'],R=n=>Math.floor(Math.random()*n);let n=0,fails=0;
const ok=(c,m)=>{if(!c){fails++;console.log('FALHA:',m);}};
const flagsList=[{},{wet:true,alive:true},{seca:true},{seca:true,wet:true,alive:true},{cut:true,seca:true},{src:true,alive:true,wet:true},{src:true,vereda:true,alive:true},{sp:'lake',alive:true},{sp:'falls',alive:true},{tier:4,lit:true,wet:true},{tier:3,lit:false,seca:true}];
for(let i=0;i<400;i++){const e=Array.from({length:6},()=>T[R(5)]),f=flagsList[i%flagsList.length];
  try{const g=B({e,flags:f,wx:R(9)-4,wz:R(9)-4,seed:i*7919+13,water:1});n++;
    let tris=0,bad=0;g.traverse(o=>{if(o.geometry){const p=o.geometry.attributes.position;tris+=p.count/3;for(let j=0;j<p.array.length;j++)if(!Number.isFinite(p.array[j]))bad++;}});
    ok(bad===0,`${e.join('')} ${JSON.stringify(f)}: coordenada inválida`);ok(tris>500&&tris<20000,`${e.join('')}: ${tris} triângulos`);
    if(e.includes('V')&&!f.src)ok(g.userData.chim.length>0||f.tier>=4,`${e.join('')}: vila sem casa`);
    if(e.includes('A')||f.src||f.sp==='lake')ok(!!g.userData.water,`${e.join('')}: rio sem água`);
  }catch(err){fails++;console.log('ERRO',e.join(''),JSON.stringify(f),err.message);}}
console.log(`${n} peças montadas, ${fails} falha(s)`);process.exit(fails?1:0);
