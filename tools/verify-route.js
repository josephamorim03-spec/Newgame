'use strict';
const {MAPS,evaluate}=require('./calibrate-atlas');

function parse(code){
  const raw=String(code||'').trim();
  const m=raw.match(/^KNOT\|([a-z]+)@v(\d+)\|([0-9-]+)$/i);
  if(!m)throw new Error('Invalid KNOT route code');
  const id=m[1],version=Number(m[2]),map=MAPS[id];
  if(!map)throw new Error('Unknown map');
  if(version!==1)throw new Error('Unsupported map version');
  const route=m[3].split('-').filter(Boolean).map(x=>Number(x)-1);
  if(route.length!==map.moves+1)throw new Error(`Expected ${map.moves+1} points, received ${route.length}`);
  const max=map.pts.length-1;
  if(route.some(x=>!Number.isInteger(x)||x<0||x>max))throw new Error('Route contains invalid point');
  return{id,version,map,route};
}

function verify(code){
  const parsed=parse(code),state=evaluate(parsed.map,parsed.route);
  if(!state)throw new Error('Illegal route: repeated edge or invalid move');
  return{
    valid:true,
    map:parsed.id,
    version:parsed.version,
    route:parsed.route.map(x=>x+1),
    score:Math.round(state.score*100)/100,
    crosses:state.crosses,
    echoes:state.echoes,
    loops:state.loops,
    cleanLoops:state.cleanLoops,
    centerLoops:state.centerLoops,
    maxVertices:state.maxVertices,
    gold:parsed.map.gold(state),
    feat:parsed.map.feat(state)
  };
}

if(require.main===module){
  const code=process.argv.slice(2).join(' ');
  if(!code){console.error('Usage: node tools/verify-route.js "KNOT|cross@v1|3-5-1-..."');process.exit(1)}
  try{console.log(JSON.stringify(verify(code),null,2))}catch(err){console.error(JSON.stringify({valid:false,error:err.message},null,2));process.exit(1)}
}
module.exports={parse,verify};
