'use strict';
const W=require('./run-witnesses.json');
const TAU=Math.PI*2;
const R={
 first:{target:1700,moves:8,cross:140,echo:90,area:1},
 cross:{target:3300,moves:9,cross:220,echo:90,area:1},
 echo:{target:3500,moves:9,cross:140,echo:180,area:1},
 space:{target:4000,moves:9,cross:140,echo:90,area:1.28},
 clean:{target:4000,moves:9,cross:125,echo:90,area:1,clean:1.28},
 center:{target:4600,moves:10,cross:140,echo:90,area:1,center:130},
 dense:{target:4900,moves:10,cross:160,echo:105,area:1.08},
 final:{target:8500,moves:11,cross:170,echo:115,area:1.15}
};
const G={cross:'cross2',echo:'echo2',space:'big5',clean:'clean1',center:'center2',dense:'loops2'};
const regular=(n,rot=0,r=360)=>Array.from({length:n},(_,i)=>{const a=i*TAU/n-Math.PI/2+rot;return{x:500+Math.cos(a)*r,y:500+Math.sin(a)*r}});
function ds(rot=0){const p=[];for(let i=0;i<4;i++){let a=i*Math.PI/2-Math.PI/2+rot;p.push({x:500+Math.cos(a)*350,y:500+Math.sin(a)*350})}for(let i=0;i<4;i++){let a=i*Math.PI/2-Math.PI/4+rot;p.push({x:500+Math.cos(a)*205,y:500+Math.sin(a)*205})}return p}
const L={r8:regular(8),r8r:regular(8,Math.PI/8),ds0:ds(),dsr:ds(Math.PI/4),r10:regular(10),r10r:regular(10,Math.PI/10)};
const ek=(a,b)=>a<b?`${a}-${b}`:`${b}-${a}`,dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function cross(a,b,c,d){const q=(a.x-b.x)*(c.y-d.y)-(a.y-b.y)*(c.x-d.x);if(Math.abs(q)<1e-8)return false;const t=((a.x-c.x)*(c.y-d.y)-(a.y-c.y)*(c.x-d.x))/q,u=-((a.x-b.x)*(a.y-c.y)-(a.y-b.y)*(a.x-c.x))/q;return t>.02&&t<.98&&u>.02&&u<.98}
function area(p){let s=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];s+=p[i].x*q.y-q.x*p[i].y}return Math.abs(s/2)}
function inside(pt,p){let z=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if(((a.y>pt.y)!=(b.y>pt.y))&&pt.x<(b.x-a.x)*(pt.y-a.y)/(b.y-a.y+1e-9)+a.x)z=!z}return z}
function dc(a,b){const x=b.x-a.x,y=b.y-a.y,d=x*x+y*y;if(!d)return dist(a,{x:500,y:500});let t=((500-a.x)*x+(500-a.y)*y)/d;t=Math.max(0,Math.min(1,t));return Math.hypot(a.x+t*x-500,a.y+t*y-500)}
function evaluate(kind,layout,route){
 const r=R[kind],pts=L[layout],used=new Set(),edges=[],path=[route[0]-1],s={score:0,crosses:0,echoes:0,loops:0,cleanLoops:0,centerHits:0,centerLoops:0,triangleLoops:0,maxv:0,next:1};
 for(const one of route.slice(1)){
  const to=one-1,from=path[path.length-1],k=ek(from,to);if(from===to||used.has(k)||to<0||to>=pts.length)return null;used.add(k);
  const a=pts[from],b=pts[to],e={from,to,a,b,crossed:false};let gain=0;
  if(edges.length){const p=edges[edges.length-1],x=dist(a,b),y=dist(p.a,p.b);if(Math.abs(x-y)/Math.max(x,y)<.075){s.echoes++;gain+=r.echo;s.next+=.12}}
  for(const old of edges){if([old.from,old.to].includes(from)||[old.from,old.to].includes(to))continue;if(cross(a,b,old.a,old.b)){s.crosses++;e.crossed=old.crossed=true;gain+=r.cross}}
  const ch=dc(a,b)<95;if(ch)s.centerHits++;if(ch&&r.center){gain+=r.center;s.next+=.08}
  edges.push(e);let idx=-1;for(let i=path.length-1;i>=0;i--)if(path[i]===to){idx=i;break}path.push(to);
  if(idx>=0){const ids=path.slice(idx,-1);if(ids.length>=3){const poly=ids.map(i=>pts[i]),cyc=edges.slice(Math.max(0,edges.length-ids.length)),cl=cyc.every(e=>!e.crossed),cen=inside({x:500,y:500},poly);let mult=s.next;if(cl)s.cleanLoops++;if(ids.length===3)s.triangleLoops++;if(cen)s.centerLoops++;if(r.clean&&cl)mult*=r.clean;gain+=(280+area(poly)/420)*r.area*mult;s.loops++;s.maxv=Math.max(s.maxv,ids.length);s.next=1}}
  s.score+=gain;
 }
 return s;
}
function req(id,s){if(!id)return true;if(id==='cross2')return s.crosses>=2;if(id==='echo2')return s.echoes>=2;if(id==='big5')return s.maxv>=5;if(id==='clean1')return s.cleanLoops>=1;if(id==='center2')return s.centerHits>=2;if(id==='loops2')return s.loops>=2;return false}
function rng32(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function sh(a,r){a=[...a];for(let i=a.length-1;i;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function signatures(n=10000){
 const schools=['Interseção','Forma','Ritmo','Traço','Pureza'],by={Interseção:['cross','dense'],Forma:['space','dense'],Ritmo:['echo','dense'],Traço:['center','space'],Pureza:['clean','space']},out=new Set();
 for(let seed=1;seed<=n;seed++){const r=rng32(seed),ss=sh(schools,r).slice(0,3),local=[];for(const s of ss)for(const x of by[s])if(!local.includes(x))local.push(x);if(local.length<4)for(const x of ['cross','echo','space','clean','center','dense'])if(!local.includes(x))local.push(x);const mid=sh(local,r).slice(0,4),defs=['first',...mid,'final'],lays=['r8','r8r',r()>.5?'ds0':'dsr','r10r',r()>.5?'r8':'r8r',r()>.5?'r10':'r10r'];defs.forEach((x,i)=>out.add(`${i}:${x}:${lays[i]}:${i===3?(G[x]||'loops2'):'-'}`))}
 return out;
}
function validate(){
 const generated=signatures(),known=new Set(Object.keys(W));let fail=0;
 for(const k of generated)if(!known.has(k)){console.error('Missing Run witness:',k);fail++}
 for(const k of known)if(!generated.has(k)){console.error('Stale Run witness:',k);fail++}
 for(const [k,w] of Object.entries(W)){const [,kind,layout,goal]=k.split(':'),s=evaluate(kind,layout,w.route);if(!s||s.score+1e-6<R[kind].target||!req(goal==='-'?null:goal,s)){console.error('Invalid Run witness:',k,s&&Math.round(s.score));fail++}}
 if(fail)throw new Error(`${fail} Run calibration failure(s)`);
 console.log(`Run invariant passed: ${known.size}/${generated.size} generated signatures have an empty-build witness.`);
 return{generated:generated.size,witnesses:known.size};
}
if(require.main===module)validate();
module.exports={R,L,W,evaluate,signatures,validate};