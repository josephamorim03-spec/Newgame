'use strict';
/**
 * KNOT Atlas calibrator.
 * Usage: node tools/calibrate-atlas.js 50000
 * Monte Carlo search: verifies that Gold is reachable and reports observed ceilings.
 * No witness routes are shipped in production data; routes are printed only when you run this tool.
 */
const ITER=Math.max(1000,Number(process.argv[2]||30000));
const TAU=Math.PI*2;
const regular=(n,rot=0,r=360)=>Array.from({length:n},(_,i)=>{const a=i*TAU/n-Math.PI/2+rot;return[500+Math.cos(a)*r,500+Math.sin(a)*r]});
const doubleSquare=(rot=0)=>{const p=[];for(let i=0;i<4;i++){let a=i*Math.PI/2-Math.PI/2+rot;p.push([500+Math.cos(a)*350,500+Math.sin(a)*350])}for(let i=0;i<4;i++){let a=i*Math.PI/2-Math.PI/4+rot;p.push([500+Math.cos(a)*205,500+Math.sin(a)*205])}return p};
const MAPS={
 first:{moves:8,pts:regular(8),cross:140,echo:90,area:1,gold:s=>s.score>=3000},
 cross:{moves:9,pts:regular(8,Math.PI/8),cross:180,echo:90,area:1,gold:s=>s.crosses>=12},
 echo:{moves:9,pts:regular(8),cross:140,echo:150,area:1,gold:s=>s.echoes>=4},
 halo:{moves:9,pts:doubleSquare(),cross:140,echo:90,area:1,gold:s=>s.centerLoops>=3},
 star:{moves:11,pts:regular(10,Math.PI/10),cross:140,echo:90,area:1.12,gold:s=>s.maxVertices>=10},
 twin:{moves:10,pts:doubleSquare(Math.PI/4),cross:140,echo:90,area:1,gold:s=>s.loops>=5},
 clean:{moves:9,pts:regular(8,Math.PI/8),cross:100,echo:90,area:1,gold:s=>s.cleanLoops>=3},
 master:{moves:12,pts:regular(10),cross:160,echo:100,area:1.08,gold:s=>s.crosses>=18&&s.loops>=5}
};
const key=(a,b)=>a<b?`${a}-${b}`:`${b}-${a}`;
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function intersect(a,b,c,d){const den=(a[0]-b[0])*(c[1]-d[1])-(a[1]-b[1])*(c[0]-d[0]);if(Math.abs(den)<1e-8)return false;const t=((a[0]-c[0])*(c[1]-d[1])-(a[1]-c[1])*(c[0]-d[0]))/den,u=-((a[0]-b[0])*(a[1]-c[1])-(a[1]-b[1])*(a[0]-c[0]))/den;return t>.02&&t<.98&&u>.02&&u<.98}
function area(poly){let s=0;for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];s+=p[0]*q[1]-q[0]*p[1]}return Math.abs(s/2)}
function inPoly(pt,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1],hit=((yi>pt[1])!==(yj>pt[1]))&&(pt[0]<(xj-xi)*(pt[1]-yi)/(yj-yi+1e-9)+xi);if(hit)inside=!inside}return inside}
function evaluate(m,route){const edges=[],path=[route[0]],used=new Set(),s={score:0,crosses:0,echoes:0,loops:0,cleanLoops:0,centerLoops:0,maxVertices:0};for(const v of route.slice(1)){const u=path[path.length-1],k=key(u,v);if(u===v||used.has(k))return null;used.add(k);const a=m.pts[u],b=m.pts[v],e={u,v,a,b,crossed:false};let gain=0;if(edges.length){const p=edges[edges.length-1],L=dist(a,b),P=dist(p.a,p.b);if(Math.abs(L-P)/Math.max(L,P)<.075){s.echoes++;gain+=m.echo}}for(const old of edges){if([old.u,old.v].includes(u)||[old.u,old.v].includes(v))continue;if(intersect(a,b,old.a,old.b)){s.crosses++;e.crossed=old.crossed=true;gain+=m.cross}}edges.push(e);let idx=-1;for(let i=path.length-1;i>=0;i--)if(path[i]===v){idx=i;break}path.push(v);if(idx>=0){const ids=path.slice(idx,-1);if(ids.length>=3){const poly=ids.map(i=>m.pts[i]),cycle=edges.slice(Math.max(0,edges.length-ids.length));s.loops++;s.maxVertices=Math.max(s.maxVertices,ids.length);if(cycle.every(x=>!x.crossed))s.cleanLoops++;if(inPoly([500,500],poly))s.centerLoops++;gain+=(280+area(poly)/420)*m.area}}s.score+=gain}return s}
function randomRoute(m){const used=new Set();let cur=Math.floor(Math.random()*m.pts.length);const r=[cur];for(let i=0;i<m.moves;i++){const choices=[];for(let v=0;v<m.pts.length;v++)if(v!==cur&&!used.has(key(cur,v)))choices.push(v);if(!choices.length)break;const v=choices[Math.floor(Math.random()*choices.length)];used.add(key(cur,v));r.push(v);cur=v}return r}
const metrics=['score','crosses','echoes','centerLoops','maxVertices','loops','cleanLoops'];
let failures=0;
for(const [id,m] of Object.entries(MAPS)){const best=Object.fromEntries(metrics.map(x=>[x,{value:-Infinity,route:null}]));let witness=null;for(let i=0;i<ITER;i++){const route=randomRoute(m);if(route.length!==m.moves+1)continue;const s=evaluate(m,route);if(!s)continue;for(const metric of metrics)if(s[metric]>best[metric].value)best[metric]={value:s[metric],route};if(!witness&&m.gold(s))witness={route,state:s}}const ceiling=Object.fromEntries(metrics.map(x=>[x,Math.round(best[x].value*100)/100]));console.log('\n'+id.toUpperCase(),ceiling);if(witness)console.log('Gold witness found:',witness.route.map(x=>x+1).join('→'));else{console.error('NO GOLD WITNESS FOUND');failures++}}
if(failures){console.error(`\nCalibration failed for ${failures} map(s). Increase iterations before changing goals.`);process.exitCode=1}else console.log(`\nAll Atlas Gold goals found in ${ITER.toLocaleString()} random trajectories per map.`);
