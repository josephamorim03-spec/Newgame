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
  const factory=new Function('document','localStorage',aa+'\n'+ab+'\nreturn {MAPS,evaluateRoute};');
  const browser=factory(documentStub,storage);
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
}

// Run: browser scoring vs empty-build calibration core
{
  const syn=read('run-synergies.js'),ra=read('run-a.js'),rb=read('run-b.js'),rc=read('run-c.js');
  const dummy={classList:{add(){},remove(){},toggle(){}},style:{setProperty(){}},setAttribute(){},appendChild(){},removeChild(){},querySelectorAll(){return[]},addEventListener(){},innerHTML:'',textContent:'',animate(){}};
  const documentStub={querySelector(){return dummy},createElement(){return {...dummy,style:{setProperty(){}}}},createElementNS(){return {...dummy,style:{setProperty(){}}}},documentElement:{style:{setProperty(){}}}};
  const factory=new Function('document','matchMedia','navigator',syn+'\n'+ra+'\n'+rb+'\n'+rc+String.raw`
function simulateRound(rd,route){
  const simRound={...rd,moves:Number.MAX_SAFE_INTEGER};runPlan=[simRound];runSchools=[];state=freshState(0,[]);
  tone=()=>{};nudgeMood=()=>{};sparkAt=()=>{};haptic=()=>{};bigMoment=()=>{};toast=()=>{};render=()=>{};
  const ids=route.map(x=>x-1);state.current=ids[0];state.path=[ids[0]];
  for(const to of ids.slice(1))connect(state.current,to);
  return {score:state.score,crosses:state.crosses,echoes:state.echoes,loopCount:state.loopCount,cleanLoops:state.cleanLoops,centerHits:state.centerHits,centerLoops:state.centerLoops,triangleLoops:state.triangleLoops,maxLoopVertices:state.maxLoopVertices};
}
return {simulateRound};`);
  const browser=factory(documentStub,()=>({matches:true}),{vibrate(){}});
  const W=JSON.parse(read('tools/run-witnesses.json'));
  const core=loadCJS(read('tools/calibrate-runs.js'),{'./run-witnesses.json':W});
  let checked=0;
  for(const [key,w] of Object.entries(W)){
    const [,kind,layout]=key.split(':'),base=core.R[kind],pts=core.L[layout];
    const rd={key:kind,target:base.target,moves:base.moves,crossValue:base.cross,echoValue:base.echo,areaScale:base.area,roundClean:base.clean||0,centerValue:base.center||0,layout:pts.map(p=>[p.x,p.y])};
    const b=browser.simulateRound(rd,w.route),s=core.evaluate(kind,layout,w.route);
    const pairs=[['score','score'],['crosses','crosses'],['echoes','echoes'],['loopCount','loops'],['cleanLoops','cleanLoops'],['centerHits','centerHits'],['centerLoops','centerLoops'],['triangleLoops','triangleLoops'],['maxLoopVertices','maxv']];
    for(const [bk,sk] of pairs)assert(Math.abs(Number(b[bk]||0)-Number(s[sk]||0))<1e-6,`${key} drift in ${bk}`);
    checked++;
  }
  assert.equal(checked,39);
}

console.log('Browser/core parity passed: Atlas 24 routes + Run 39 signatures.');
