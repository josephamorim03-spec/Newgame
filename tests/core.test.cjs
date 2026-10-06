const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../src/core');
const same=value=>JSON.stringify(value);
function board(s,tones){s.board=tones.map(r=>r.map(tone=>({tone,id:++s.serial})));}
test('seeded opening, preview is pure, direct preview matches committed rotation',()=>{
  const s=C.create('JOSEPH','free'),snapshot=same(s),p=C.preview(s,0,1);
  assert.ok(p.matches.some(m=>m.sector===0 && m.tone===0));
  assert.equal(same(s),snapshot);
  const result=C.step(s,0,1),first=result.events.find(e=>e.type==='resonance');
  assert.deepEqual(first.board,p.board);
  assert.deepEqual(C.create('JOSEPH','free'),s);
  assert.equal(same(s),snapshot);
});
test('phase locks propagate across both links once and reverse direction',()=>{
  const s=C.create('PHASE','free');s.locks=[2,1];
  assert.deepEqual(C.propagation(s,0,1),{dirs:[1,-1,1],edges:[0,1]});
  assert.deepEqual(C.propagation(s,1,-1),{dirs:[1,-1,1],edges:[0,1]});
  const event=C.step(s,0,1).events[0];assert.deepEqual(event.locks,[1,0]);
  s.protocols=['drive'];assert.deepEqual(C.propagation(s,0,-1).dirs,[-1,-1,-1]);
});
test('used links cannot immediately recharge and trap the machine in perpetual coupling',()=>{
  const s=C.create('COOLING','free');s.locks=[1,1];
  const r=C.step(s,0,1);assert.deepEqual(r.state.locks,[0,0]);
  assert.ok(!r.events.some(e=>e.type==='lock'));
});
test('both adjacent edges detect fresh pairs, same identities do not farm charges',()=>{
  const s=C.create('PAIRS','free');
  board(s,[[0,1,2,3,0,1,2,3],[0,1,2,3,0,1,2,3],[1,2,3,0,1,2,3,0]]);
  const initial=C.pairs(s.board);assert.equal(initial[0].size,8);assert.equal(initial[1].size,0);
  // Inner rotation clockwise makes R2-R3 partial pairs; R1 is deliberately different.
  board(s,[[2,3,0,1,2,3,0,1],[0,1,2,3,0,1,2,3],[1,2,3,0,1,2,3,0]]);
  const result=C.step(s,2,1);assert.equal(result.state.locks[1],1);
  const locked=C.copy(s);locked.locks=[1,1];locked.protocols=['drive'];
  const shifted=C.step(locked,0,1);
  assert.equal(shifted.events.filter(e=>e.type==='lock').length,0);
});
test('simultaneous resonance refill is sector ascending then external-middle-inner',()=>{
  const s=C.create('REFILL','free');
  board(s,[[1,0,2,3,0,1,2,3],[0,2,3,0,1,2,3,0],[0,3,1,1,2,0,0,2]]);
  s.queue=[2,1,3,...Array.from({length:33},(_,i)=>i%4)];
  s.board[0][7].tone=0;
  const result=C.step(s,0,1),fill=result.events.find(e=>e.type==='refill');
  assert.deepEqual(fill.board.map(r=>r[0].tone),[2,1,3]);
});
test('refill resonance doubles second wave and echo does not consume twice',()=>{
  const s=C.create('CHAIN','free');s.protocols=['aftertone','reverb'];
  board(s,[[1,0,2,3,0,1,2,0],[0,2,3,0,1,2,3,0],[0,3,1,1,2,0,0,2]]);
  s.queue=[1,1,1,0,1,2,...Array(30).fill(2)];
  const r=C.step(s,0,1),waves=r.events.filter(e=>e.type==='resonance');
  assert.ok(waves.length>=2);assert.equal(waves[0].energy,15);assert.equal(waves[1].multiplier,4);
  assert.equal(r.state.activations.aftertone,1);
});
test('automatic cascade cannot score more than one rupture from one deliberate move',()=>{
  const s=C.create('CHAIN-RUPTURE');s.intent.sector=0;
  board(s,[[1,0,2,3,0,1,2,0],[0,2,3,0,1,2,3,0],[0,3,1,1,2,0,0,2]]);
  s.queue=[1,1,1,0,1,2,...Array(30).fill(2)];
  const r=C.step(s,0,1),waves=r.events.filter(e=>e.type==='resonance');
  assert.ok(waves.length>=2);assert.equal(r.state.breaks,1);
  assert.equal(r.events.filter(e=>e.type==='break').length,1);
});

test('triad is weak and activates at most once per action',()=>{
  const s=C.create('TRIAD','free');s.protocols=['triad'];
  const r=C.step(s,1,1);assert.ok((r.state.activations.triad||0)<=1);
  const triads=r.events.flatMap(e=>e.matches||[]).filter(m=>m.triad);
  assert.ok(triads.length<=1);if(triads.length)assert.equal(triads[0].base,5);
});
test('winning takes precedence over a ready hostile intent',()=>{
  const s=C.create();s.breaks=C.ENCOUNTERS[0].breakGoal-1;s.intent.count=1;s.hp=1;s.intent.sector=0;
  const r=C.step(s,0,1);assert.equal(r.state.status,'draft');assert.equal(r.state.hp,1);
  assert.ok(r.events.some(e=>e.type==='break'));assert.ok(!r.events.some(e=>e.type==='damage'));
});
test('a jammed ring cannot be selected but still moves by propagation',()=>{
  const s=C.create('JAM','free');s.jam=1;s.locks=[1,1];
  assert.equal(C.preview(s,1,1),null);assert.ok(C.step(s,1,1).invalid);
  assert.deepEqual(C.preview(s,0,1).dirs,[1,-1,1]);
});
test('direct weak-point resonance advances rupture and fortress grants shield',()=>{
  const s=C.create();s.protocols=['fortress'];s.intent.sector=0;s.intent.count=1;
  const r=C.step(s,0,1);assert.equal(r.state.hp,3);assert.equal(r.state.shield,1);assert.equal(r.state.breaks,1);
  assert.ok(r.events.some(e=>e.type==='break'));
});
test('draft and rewrite are deterministic and unique, next encounter resets integrity and rupture',()=>{
  const s=C.create();s.breaks=C.ENCOUNTERS[0].breakGoal-1;s.hp=1;s.intent.sector=0;
  const won=C.step(s,0,1).state;assert.equal(new Set(won.offers).size,3);
  const rewritten=C.rewrite(won);assert.equal(rewritten.rewrites,0);assert.deepEqual(C.rewrite(rewritten),rewritten);
  const n=C.choose(rewritten,rewritten.offers[0]);assert.equal(n.encounter,1);assert.equal(n.hp,3);assert.equal(n.energy,0);assert.equal(n.breaks,0);assert.equal(n.protocols.length,1);
  assert.deepEqual(C.choose(n,'invalid'),n);
});
test('saved actions and imported replay reconstruct all seeded state including laboratory',()=>{
  let s=C.configure('REPLAY',['triad','mesh','counterweight']);
  for(let i=0;i<30;i++)s=C.step(s,i%3,i%2?1:-1).state;
  assert.deepEqual(C.replay({version:C.VERSION,seed:s.seed,mode:s.mode,actions:s.actions}),s);
  assert.throws(()=>C.replay({version:'old',seed:'x',mode:'free',actions:[]}));
  assert.throws(()=>C.replay({version:C.VERSION,seed:'x',mode:'free',actions:[{type:'move',ring:99,direction:1}]}));
  assert.throws(()=>C.configure('x',['triad','triad']));
});
test('2,000 mixed actions stay finite, deterministic, bounded and replayable',()=>{
  let s=C.configure('STRESS',['triad','reverb','mesh']);
  for(let i=0;i<2000;i++){
    const r=C.step(s,i%3,i%2?1:-1);s=r.state;
    assert.ok(Number.isFinite(s.total));assert.ok(s.locks.every(n=>n>=0 && n<=2));
    assert.equal(s.board.flat().length,24);assert.ok(s.board.flat().every(g=>g.tone>=0 && g.tone<4));
    assert.ok(r.events.length<200);assert.ok(s.queue.length>=33);
  }
  assert.deepEqual(C.replay({version:C.VERSION,seed:s.seed,mode:s.mode,actions:s.actions}),s);
});
