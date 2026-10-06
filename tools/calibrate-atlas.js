'use strict';
/**
 * KNOT Atlas calibrator.
 * Usage: node tools/calibrate-atlas.js 30000
 *
 * Phase 1: deterministic witness validation for Gold + Feat.
 * Phase 2: seeded Monte Carlo exploration for empirical ceilings.
 */
const argIter=Number(process.argv[2]);
const ITER=Math.max(1000,Number.isFinite(argIter)?argIter:30000);
const TAU=Math.PI*2;
const regular=(n,rot=0,r=360)=>Array.from({length:n},(_,i)=>{const a=i*TAU/n-Math.PI/2+rot;return[500+Math.cos(a)*r,500+Math.sin(a)*r]});
const doubleSquare=(rot=0)=>{const p=[];for(let i=0;i<4;i++){let a=i*Math.PI/2-Math.PI/2+rot;p.push([500+Math.cos(a)*350,500+Math.sin(a)*350])}for(let i=0;i<4;i++){let a=i*Math.PI/2-Math.PI/4+rot;p.push([500+Math.cos(a)*205,500+Math.sin(a)*205])}return p};

const MAPS={
 first:{moves:8,pts:regular(8),cross:140,echo:90,area:1,gold:s=>s.score>=3000,feat:s=>s.score>=2200&&s.crosses>=2},
 cross:{moves:9,pts:regular(8,Math.PI/8),cross:180,echo:90,area:1,gold:s=>s.crosses>=12,feat:s=>s.crosses>=8&&s.loops>=1},
 echo:{moves:9,pts:regular(8),cross:140,echo:150,area:1,gold:s=>s.echoes>=4,feat:s=>s.echoes>=4&&s.loops>=1},
 halo:{moves:9,pts:doubleSquare(),cross:140,echo:90,area:1,gold:s=>s.centerLoops>=3,feat:s=>s.centerLoops>=2&&s.crosses>=2},
 star:{moves:11,pts:regular(10,Math.PI/10),cross:140,echo:90,area:1.12,gold:s=>s.maxVertices>=10,feat:s=>s.maxVertices>=8&&s.echoes>=2},
 twin:{moves:10,pts:doubleSquare(Math.PI/4),cross:140,echo:90,area:1,gold:s=>s.loops>=5,feat:s=>s.loops>=4&&s.crosses>=3},
 clean:{moves:9,pts:regular(8,Math.PI/8),cross:100,echo:90,area:1,gold:s=>s.cleanLoops>=3,feat:s=>s.cleanLoops>=2&&s.score>=2000},
 master:{moves:12,pts:regular(10),cross:160,echo:100,area:1.08,gold:s=>s.crosses>=18&&s.loops>=5,feat:s=>s.crosses>=12&&s.loops>=4&&s.echoes>=2},
 mirror:{moves:10,pts:regular(8),cross:130,echo:90,area:1,gold:s=>s.symPairs>=4,feat:s=>s.symPairs>=4&&s.loops>=1},
 mosaic:{moves:11,pts:regular(8,Math.PI/8),cross:120,echo:90,area:1,gold:s=>s.triangleLoops>=4,feat:s=>s.triangleLoops>=4&&s.crosses>=6},
 ritual:{moves:12,pts:regular(10),cross:150,echo:120,area:1,gold:s=>s.rituals>=2&&s.loops>=4,feat:s=>s.rituals>=2&&s.crosses>=10},
 focus:{moves:10,pts:regular(8),cross:130,echo:90,area:1,gold:s=>s.loops>=4&&s.uniqueVertices<=6,feat:s=>s.loops>=5&&s.uniqueVertices<=5}
};

const WITNESSES={
 first:{gold:[6,2,8,5,2,3,8,6,5],feat:[2,6,8,3,6,1,4,5,6]},
 cross:{gold:[7,8,5,1,4,7,2,6,1,8],feat:[4,8,2,1,7,4,1,5,7,2]},
 echo:{gold:[5,3,1,7,3,4,6,3,8,5],feat:[5,3,1,7,3,4,6,3,8,5]},
 halo:{gold:[4,6,8,2,6,5,7,4,8,1],feat:[3,5,8,4,5,6,2,4,3,6]},
 star:{gold:[1,4,8,2,5,3,2,9,3,8,5,1],feat:[2,9,1,3,6,10,4,5,6,9,3,4]},
 twin:{gold:[4,3,1,4,5,2,3,6,2,1,6],feat:[7,2,3,5,6,8,3,6,1,8,5]},
 clean:{gold:[5,7,8,1,7,6,5,1,4,7],feat:[3,8,2,3,5,8,4,3,6,2]},
 master:{gold:[3,5,1,4,8,2,5,8,1,3,7,4,5],feat:[1,7,2,5,8,4,1,5,10,1,3,5,7]},
 mirror:{gold:[7,6,2,5,8,3,4,8,2,7,5],feat:[7,6,2,5,8,3,4,8,2,7,5]},
 mosaic:{gold:[7,3,2,7,1,2,5,7,4,5,1,4],feat:[7,3,2,7,1,2,5,7,4,5,1,4]},
 ritual:{gold:[10,7,8,1,4,10,8,2,7,5,10,3,8],feat:[10,7,8,1,4,10,8,2,7,5,10,3,8]},
 focus:{gold:[6,5,7,8,4,6,3,7,6,8,5],feat:[4,5,2,7,4,3,7,5,3,2,4]}
};

const key=(a,b)=>a<b?`${a}-${b}`:`${b}-${a}`;
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function intersect(a,b,c,d){const den=(a[0]-b[0])*(c[1]-d[1])-(a[1]-b[1])*(c[0]-d[0]);if(Math.abs(den)<1e-8)return false;const t=((a[0]-c[0])*(c[1]-d[1])-(a[1]-c[1])*(c[0]-d[0]))/den,u=-((a[0]-b[0])*(a[1]-c[1])-(a[1]-b[1])*(a[0]-c[0]))/den;return t>.02&&t<.98&&u>.02&&u<.98}
function area(poly){let s=0;for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];s+=p[0]*q[1]-q[0]*p[1]}return Math.abs(s/2)}
function inPoly(pt,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1],hit=((yi>pt[1])!==(yj>pt[1]))&&(pt[0]<(xj-xi)*(pt[1]-yi)/(yj-yi+1e-9)+xi);if(hit)inside=!inside}return inside}
function symPairs(edges,pts){const mirror={};for(let i=0;i<pts.length;i++){const [x,y]=pts[i],tx=1000-x,ty=y;let best=-1,bd=Infinity;for(let j=0;j<pts.length;j++){const dx=pts[j][0]-tx,dy=pts[j][1]-ty,d=dx*dx+dy*dy;if(d<bd){bd=d;best=j}}mirror[i]=bd<1?best:null}const set=new Set(edges.map(e=>key(e.u,e.v))),seen=new Set();let pairs=0;for(const e of edges){const a=key(e.u,e.v),ma=mirror[e.u],mb=mirror[e.v];if(ma==null||mb==null)continue;const b=key(ma,mb);if(a!==b&&set.has(b)){const p=[a,b].sort().join('|');if(!seen.has(p)){seen.add(p);pairs++}}}return pairs}
function ritualStep(s,cross,echo,loop){if(s.ritualStage===0&&cross)s.ritualStage=1;else if(s.ritualStage===1&&echo)s.ritualStage=2;else if(s.ritualStage===2&&loop){s.rituals++;s.ritualStage=0}}

function evaluate(m,route){
  const edges=[],path=[route[0]],used=new Set(),s={score:0,crosses:0,echoes:0,loops:0,cleanLoops:0,centerLoops:0,maxVertices:0,triangleLoops:0,symPairs:0,rituals:0,ritualStage:0,uniqueVertices:1};
  for(const v of route.slice(1)){
    const u=path[path.length-1],k=key(u,v);if(u===v||used.has(k))return null;used.add(k);
    const a=m.pts[u],b=m.pts[v],e={u,v,a,b,crossed:false};let gain=0,moveCross=false,moveEcho=false,moveLoop=false;
    if(edges.length){const p=edges[edges.length-1],L=dist(a,b),P=dist(p.a,p.b);if(Math.abs(L-P)/Math.max(L,P)<.075){s.echoes++;gain+=m.echo;moveEcho=true}}
    for(const old of edges){if([old.u,old.v].includes(u)||[old.u,old.v].includes(v))continue;if(intersect(a,b,old.a,old.b)){s.crosses++;e.crossed=old.crossed=true;gain+=m.cross;moveCross=true}}
    edges.push(e);let idx=-1;for(let i=path.length-1;i>=0;i--)if(path[i]===v){idx=i;break}path.push(v);s.uniqueVertices=new Set(path).size;s.symPairs=symPairs(edges,m.pts);
    if(idx>=0){const ids=path.slice(idx,-1);if(ids.length>=3){const poly=ids.map(i=>m.pts[i]),cycle=edges.slice(Math.max(0,edges.length-ids.length));s.loops++;s.maxVertices=Math.max(s.maxVertices,ids.length);if(cycle.every(x=>!x.crossed))s.cleanLoops++;if(ids.length===3)s.triangleLoops++;if(inPoly([500,500],poly))s.centerLoops++;gain+=(280+area(poly)/420)*m.area;moveLoop=true}}
    ritualStep(s,moveCross,moveEcho,moveLoop);s.score+=gain;
  }
  return s;
}

function seeded(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function randomRoute(m,rng){const used=new Set();let cur=Math.floor(rng()*m.pts.length),r=[cur];for(let i=0;i<m.moves;i++){const choices=[];for(let v=0;v<m.pts.length;v++)if(v!==cur&&!used.has(key(cur,v)))choices.push(v);if(!choices.length)break;const v=choices[Math.floor(rng()*choices.length)];used.add(key(cur,v));r.push(v);cur=v}return r}
const metrics=['score','crosses','echoes','centerLoops','maxVertices','loops','cleanLoops','triangleLoops','symPairs','rituals','uniqueVertices'];

function validateWitnesses(){
  let failures=0;
  for(const [id,m] of Object.entries(MAPS)){
    const w=WITNESSES[id];for(const kind of ['gold','feat']){
      const route=w[kind].map(x=>x-1),s=evaluate(m,route),ok=!!s&&m[kind](s);
      if(!ok){console.error(`${id} ${kind}: INVALID WITNESS`);failures++}
    }
  }
  if(failures)throw new Error(`${failures} deterministic witness(es) failed`);
  console.log(`Validated ${Object.keys(MAPS).length*2} deterministic Gold/Feat witnesses.`);
}

function calibrate(iter=ITER){
  validateWitnesses();const rng=seeded(20261006);let failures=0;
  for(const [id,m] of Object.entries(MAPS)){
    const best=Object.fromEntries(metrics.map(x=>[x,{value:x==='uniqueVertices'?Infinity:-Infinity,route:null}]));
    let goldFound=false,featFound=false;
    for(let i=0;i<iter;i++){
      const route=randomRoute(m,rng);if(route.length!==m.moves+1)continue;const s=evaluate(m,route);if(!s)continue;
      for(const metric of metrics){const better=metric==='uniqueVertices'?s[metric]<best[metric].value:s[metric]>best[metric].value;if(better)best[metric]={value:s[metric],route}}
      if(m.gold(s))goldFound=true;if(m.feat(s))featFound=true;
    }
    const ceiling=Object.fromEntries(metrics.map(x=>[x,Math.round(best[x].value*100)/100]));
    console.log('\n'+id.toUpperCase(),ceiling,`random gold=${goldFound} feat=${featFound}`);
  }
  if(failures)process.exitCode=1;else console.log(`\nDeterministic reachability passed; explored ${iter.toLocaleString()} seeded random trajectories per map.`);
}
if(require.main===module)calibrate();
module.exports={MAPS,WITNESSES,evaluate,validateWitnesses,calibrate};
