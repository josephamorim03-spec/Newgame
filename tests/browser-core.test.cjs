'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

function loadCJS(src,reqMap={}){
  const module={exports:{}};
  const req=p=>{if(Object.prototype.hasOwnProperty.call(reqMap,p))return reqMap[p];throw new Error('unexpected require '+p)};
  req.main={};
  new Function('require','module','console','process',src)(req,module,{log(){},error(){}},{argv:['node','x']});
  return module.exports;
}

// Atlas: browser evaluator vs calibration core
{
  const aa=read('atlas-a.js'),ab=read('atlas-b.js');
  const dummy={classList:{add(){},remove(){},toggle(){}},style:{setProperty(){}},setAttribute(){},appendChild(){},removeChild(){},querySelectorAll(){return[]},addEventListener(){},innerHTML:'',textContent:'',animate(){}};
  const documentStub={querySelector(){return dummy},createElement(){return {...dummy,style:{setProperty(){}}}},createElementNS(){return {...dummy,style:{setProperty(){}}}},documentElement:{style:{setProperty(){}}}};
  const storage={getItem(){return null},setItem(){}};
  const factory=new Function('document','localStorage','setTimeout','clearTimeout',aa+'\n'+ab+String.raw`
function simulateLiveLock(map,route){
  currentMap=map;state={score:0,crosses:0,echoes:0,loops:0,cleanLoops:0,centerLoops:0,maxVertices:0,triangleLoops:0,symPairs:0,rituals:0,ritualStage:0,uniqueVertices:1,moves:0,current:null,path:[],edges:[],loopsData:[],junctions:[],pts:map.pts.map((p,i)=>({id:i,x:p[0],y:p[1]})),ended:false,goalSeen:[false,false,false]};
  tone=()=>{};nudgeMood=()=>{};spark=()=>{};haptic=()=>{};bigMoment=()=>{};checkGoalCelebration=()=>{};render=()=>{};
  const ids=route.map(x=>x-1);state.current=ids[0];state.path=[ids[0]];
  for(const to of ids.slice(1))connect(state.current,to);
  return state.ended;
}
return {MAPS,evaluateRoute,simulateLiveLock,mapProgress,isBetterObjective};`);
  const browser=factory(documentStub,storage,()=>1,()=>{});
  const core=loadCJS(read('tools/calibrate-atlas.js'));
  let checked=0;
  for(const [id,w] of Object.entries(core.WITNESSES)){
    const bm=browser.MAPS.find(m=>m.id===id),cm=core.MAPS[id];
    assert(bm,'browser map missing '+id);
    assert.equal(bm.version||1,cm.version||1,'version drift '+id);
    for(const kind of ['gold','feat']){
      const route=w[kind].map(x=>x-1),b=browser.evaluateRoute(bm,route),s=core.evaluate(cm,route);
      assert(b.ok,id+'/'+kind+' browser evaluator rejected witness');
      for(const k of ['score','crosses','echoes','loops','cleanLoops','centerLoops','maxVertices','triangleLoops','symPairs','rituals','uniqueVertices']){
        assert(Math.abs(Number(b.state[k]||0)-Number(s[k]||0))<1e-6,`${id}/${kind} drift in ${k}`);
      }
      checked++;
    }
  }
  assert.equal(checked,24);
  const firstRoute=core.WITNESSES.first.gold;
  assert.equal(browser.simulateLiveLock(browser.MAPS.find(m=>m.id==='first'),firstRoute),true,'Atlas must lock immediately after the last stitch');
  assert.equal(browser.isBetterObjective({primary:4},1201,{bestObjective:4,bestObjectiveScore:1200}),true,'objective ties must use score as tie-break');
  assert.equal(browser.isBetterObjective({primary:4},1199,{bestObjective:4,bestObjectiveScore:1200}),false,'worse tie-break score must not replace objective route');

  const legacyData=JSON.stringify({maps:{cross:{medal:2,best:1234,attempts:[]},mirror:{medal:3,best:9999,attempts:[]}}});
  const legacyBrowser=factory(documentStub,{getItem(){return legacyData},setItem(){}},()=>1,()=>{});
  assert.equal(legacyBrowser.mapProgress('cross').medal,2,'unversioned legacy v1 progress should survive on v1 maps');
  assert.equal(legacyBrowser.mapProgress('cross').version,1);
  assert.equal(legacyBrowser.mapProgress('mirror').medal,0,'unversioned legacy v1 progress must not migrate into mirror v2');
  assert.equal(legacyBrowser.mapProgress('mirror').version,2);
}

// Run: browser scoring vs empty-build calibration core
{
  const syn=read('run-synergies.js'),ra=read('run-a.js'),rb=read('run-b.js'),rc=read('run-c.js');
  const dummy={classList:{add(){},remove(){},toggle(){}},style:{setProperty(){}},setAttribute(){},appendChild(){},removeChild(){},querySelectorAll(){return[]},addEventListener(){},innerHTML:'',textContent:'',animate(){}};
  const documentStub={querySelector(){return dummy},createElement(){return {...dummy,style:{setProperty(){}}}},createElementNS(){return {...dummy,style:{setProperty(){}}}},documentElement:{style:{setProperty(){}}}};
  const factory=new Function('document','matchMedia','navigator','setTimeout','clearTimeout',syn+'\n'+ra+'\n'+rb+'\n'+rc+String.raw`
function simulateRound(rd,route){
  runPlan=[rd];runSchools=[];state=freshState(0,[]);
  tone=()=>{};nudgeMood=()=>{};sparkAt=()=>{};haptic=()=>{};bigMoment=()=>{};toast=()=>{};render=()=>{};
  const ids=route.map(x=>x-1);state.current=ids[0];state.path=[ids[0]];
  for(const to of ids.slice(1))connect(state.current,to);
  return {score:state.score,crosses:state.crosses,echoes:state.echoes,loopCount:state.loopCount,cleanLoops:state.cleanLoops,centerHits:state.centerHits,centerLoops:state.centerLoops,triangleLoops:state.triangleLoops,maxLoopVertices:state.maxLoopVertices,ended:state.ended};
}
function previewTriangle(rd){
  runPlan=[rd];runSchools=[];state=freshState(0,[]);
  state.current=2;state.path=[0,1,2];
  state.edges=[{from:0,to:1,key:edgeKey(0,1),a:state.pts[0],b:state.pts[1],crossed:false,echo:false},{from:1,to:2,key:edgeKey(1,2),a:state.pts[1],b:state.pts[2],crossed:false,echo:false}];
  return previewMove(2,0);
}
return {simulateRound,previewTriangle};`);
  const browser=factory(documentStub,()=>({matches:true}),{vibrate(){}},()=>1,()=>{});
  const W=JSON.parse(read('tools/run-witnesses.json'));
  const core=loadCJS(read('tools/calibrate-runs.js'),{'./run-witnesses.json':W});
  let checked=0;
  for(const [key,w] of Object.entries(W)){
    const [,kind,layout]=key.split(':'),base=core.R[kind],pts=core.L[layout];
    const rd={key:kind,target:base.target,moves:base.moves,crossValue:base.cross,echoValue:base.echo,areaScale:base.area,roundClean:base.clean||0,centerValue:base.center||0,layout:pts.map(p=>[p.x,p.y])};
    const b=browser.simulateRound(rd,w.route),s=core.evaluate(kind,layout,w.route);
    const pairs=[['score','score'],['crosses','crosses'],['echoes','echoes'],['loopCount','loops'],['cleanLoops','cleanLoops'],['centerHits','centerHits'],['centerLoops','centerLoops'],['triangleLoops','triangleLoops'],['maxLoopVertices','maxv']];
    for(const [bk,sk] of pairs)assert(Math.abs(Number(b[bk]||0)-Number(s[sk]||0))<1e-6,`${key} drift in ${bk}`);
    assert.equal(b.ended,true,`${key} must lock immediately after the last stitch`);
    checked++;
  }
  assert.equal(checked,39);
  const base=core.R.first,pts=core.L.r8,preview=browser.previewTriangle({key:'first',target:base.target,moves:base.moves,crossValue:base.cross,echoValue:base.echo,areaScale:base.area,layout:pts.map(p=>[p.x,p.y])});
  assert.equal(preview.closes,true,'closing the third edge of a triangle must preview as a Loop');
  assert.equal(preview.verts,3,'triangle preview must report three vertices');
}

console.log('Browser/core parity passed: Atlas 24 routes + Run 39 signatures.');
