'use strict';
const assert=require('assert');
const {SYNERGY_DEFS,synergyActive,activeSynergies,synergiesCompletedBy,synergyPartners}=require('../run-synergies');

assert.equal(Object.keys(SYNERGY_DEFS).length,7,'expected seven named Run engines');
const seen=new Set();
for(const [id,s] of Object.entries(SYNERGY_DEFS)){
  assert.equal(s.requires.length,2,`${id} should be a two-piece recipe`);
  assert.notEqual(s.requires[0],s.requires[1],`${id} should use two different Knots`);
  assert.equal(synergyActive(id,[...s.requires]),true,`${id} should activate with both pieces`);
  assert.equal(synergyActive(id,[s.requires[0]]),false,`${id} should not activate with one piece`);
  const completed=synergiesCompletedBy(s.requires[1],[s.requires[0]]).map(x=>x.id);
  assert(completed.includes(id),`${id} should be recognized as a draft completion`);
  assert(synergyPartners(s.requires[0]).includes(s.requires[1]),`${id} partner lookup should be symmetric enough for draft guidance`);
  for(const k of s.requires){
    assert(!seen.has(k),`${k} unexpectedly belongs to more than one named recipe`);
    seen.add(k);
  }
}
const all=Object.values(SYNERGY_DEFS).flatMap(s=>s.requires);
assert.equal(new Set(all).size,14,'the seven engines should cover fourteen distinct Knots');
assert.equal(activeSynergies(['blood','fracture','mirror','crescendo']).length,2,'multiple engines should coexist');
console.log('KNOT Run synergy suite passed: 7 semantic engines / 14 paired Knots.');
