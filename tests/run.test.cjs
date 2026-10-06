'use strict';
const assert=require('assert');
const run=require('../tools/calibrate-runs');
const out=run.validate();
assert.equal(out.generated,39,'expected 39 generated Run signatures');
assert.equal(out.witnesses,39,'every generated signature must have an empty-build witness');
for(const [key,w] of Object.entries(run.W)){
  const [,kind,layout,goal]=key.split(':');
  const s=run.evaluate(kind,layout,w.route);
  assert(s,`${key} route should be legal`);
  assert(s.score+1e-6>=run.R[kind].target,`${key} must pass score floor`);
  if(goal==='cross2')assert(s.crosses>=2);
  if(goal==='echo2')assert(s.echoes>=2);
  if(goal==='big5')assert(s.maxv>=5);
  if(goal==='clean1')assert(s.cleanLoops>=1);
  if(goal==='center2')assert(s.centerHits>=2);
  if(goal==='loops2')assert(s.loops>=2);
}
console.log('KNOT Run regression suite passed: 39 empty-build reachability witnesses.');
