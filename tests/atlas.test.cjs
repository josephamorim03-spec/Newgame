'use strict';
const assert=require('assert');
const {MAPS,WITNESSES,validateWitnesses}=require('../tools/calibrate-atlas');
const {verify}=require('../tools/verify-route');

validateWitnesses();

let checked=0;
for(const [id,map] of Object.entries(MAPS)){
  for(const kind of ['gold','feat']){
    const route=WITNESSES[id][kind];
    const code=`KNOT|${id}@v1|${route.join('-')}`;
    const result=verify(code);
    assert.equal(result.valid,true,`${id} ${kind} route should verify`);
    assert.equal(result[kind],true,`${id} ${kind} witness should still satisfy target`);
    checked++;
  }
}

const mirror=verify(`KNOT|mirror@v1|${WITNESSES.mirror.gold.join('-')}`);
assert(mirror.symPairs>=4,'mirror Gold should have four real mirrored pairs');

const ritual=verify(`KNOT|ritual@v1|${WITNESSES.ritual.gold.join('-')}`);
assert(ritual.rituals>=2 && ritual.loops>=5,'ritual Gold should preserve distinct-move sequencing');

const focus=verify(`KNOT|focus@v1|${WITNESSES.focus.gold.join('-')}`);
assert(focus.loops>=4 && focus.uniqueVertices<=5,'focus Gold should respect point economy');

assert.throws(
  ()=>verify('KNOT|cross@v1|1-2-1-2-3-4-5-6-7-8'),
  /Illegal route/,
  'repeated undirected edge must be rejected'
);

console.log(`KNOT Atlas regression suite passed: ${checked} deterministic target routes + protocol guards.`);
