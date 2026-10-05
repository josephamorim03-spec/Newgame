const test = require('node:test');
const assert = require('node:assert/strict');
const game = require('../game-core.js');

const tile = (id, value, extra = {}) => ({ id, value, shielded: false, sealed: 0, ...extra });
function blank(level = 0, extra = {}) {
  return { ...game.createGame(() => 0, level), tiles: Array(16).fill(null),
    mech: 8, nextId: 100, ...extra };
}

test('2048 merges exactly once per source; no Kaiju occupies the board', () => {
  const tiles = Array(16).fill(null);
  [0, 1, 2, 3].forEach((i, n) => { tiles[i] = tile(n + 1, 2); });
  const result = game.slide(blank(0, { tiles }), 'left');
  assert.equal(result.ok, true);
  assert.deepEqual(result.state.tiles.slice(0, 4).map(t => t?.value || 0), [4, 4, 0, 0]);
  assert.equal(result.merges.length, 2);
  assert.equal(result.motions.length, 4);
});

test('Mech splits the row into independent slide segments', () => {
  const tiles = Array(16).fill(null);
  tiles[0] = tile(1, 2); tiles[2] = tile(2, 2); tiles[3] = tile(3, 2);
  const state = blank(0, { tiles, mech: 1 });
  const result = game.slideTiles(state, 'left');
  assert.deepEqual(result.tiles.slice(0, 4).map(t => t?.value || 0), [2, 0, 4, 0]);
});

test('Cryo anchor stays put and accepts one equal tile into its own cell', () => {
  const tiles = Array(16).fill(null);
  tiles[1] = tile(1, 4); tiles[2] = tile(2, 4); tiles[3] = tile(3, 4);
  const state = blank(0, { tiles, frozenIndex: 1 });
  const result = game.slideTiles(state, 'left');
  assert.deepEqual(result.tiles.slice(0, 4).map(t => t?.value || 0), [0, 8, 4, 0]);
  assert.deepEqual(result.merges.map(m => m.to), [1]);
});

test('Aegis follows a moving tile and a merged result', () => {
  const tiles = Array(16).fill(null);
  tiles[2] = tile(1, 4, { shielded: true }); tiles[3] = tile(2, 4);
  const result = game.slide(blank(0, { tiles }), 'left');
  assert.equal(result.state.tiles[0].value, 8);
  assert.equal(result.state.tiles[0].shielded, true);
});

test('normal attack locks a region and hits at most the largest tile there', () => {
  const tiles = Array(16).fill(null);
  tiles[0] = tile(1, 4); tiles[1] = tile(2, 8); tiles[2] = tile(3, 2);
  const state = blank(0, { tiles, mech: 9, intent: { kind: 'attack', shape: 'row', anchor: 0, special: false } });
  const prediction = game.forecast(state);
  assert.deepEqual(prediction.cells, [0, 1, 2, 3]);
  assert.deepEqual(prediction.targets.map(t => t.index), [1]);
  state.tiles[1] = null;
  assert.deepEqual(game.forecast(state).targets.map(t => t.index), [0]);
});

test('a 3×3 special is clipped at the corner and is not cancellable', () => {
  const state = blank(3, { intent: { kind: 'attack', shape: 'square3', anchor: 15, special: true } });
  assert.deepEqual(game.affectedCells(state.intent), [10, 11, 14, 15]);
  state.build.arm = 'discharge';
  assert.deepEqual(game.legalArmTargets(state), []);
});

test('shielded tile survives an attack, then protection expires', () => {
  const tiles = Array(16).fill(null);
  tiles[0] = tile(1, 32, { shielded: true });
  const state = blank(0, { tiles, didSlide: true,
    intent: { kind: 'attack', shape: 'row', anchor: 0, special: false } });
  const result = game.commit(state, () => 0);
  assert.equal(result.attack.targets[0].blocked, true);
  assert.equal(result.state.phase, 'won');
  assert.equal(result.state.tiles[0].value, 32);
  assert.equal(result.state.tiles[0].shielded, false);
});

test('seal only affects the originally marked tile; a sufficient merge releases it', () => {
  const tiles = Array(16).fill(null);
  tiles[0] = tile(1, 8); tiles[1] = tile(2, 4); tiles[2] = tile(3, 4);
  const state = blank(5, { tiles, didSlide: true,
    intent: { kind: 'attack', shape: 'seal', anchor: 0, special: true, targetId: 1 } });
  const sealed = game.commit(state, () => 0).state;
  assert.equal(sealed.tiles[0].sealed, 8);
  const result = game.slide(sealed, 'left');
  assert.equal(result.ok, true);
  assert.equal(result.state.tiles[0].sealed, 0);
  assert.equal(result.state.tiles[1].value, 8);
  const decoy = blank(5, { tiles: tiles.map(t => t && { ...t }), didSlide: true,
    intent: { kind: 'attack', shape: 'seal', anchor: 0, special: true, targetId: 999 } });
  assert.equal(game.commit(decoy, () => 0).state.tiles[0].sealed, 0);
});

test('count and ordered sequence objectives are checked after the attack', () => {
  const fours = Array(16).fill(null);
  [0, 2, 4, 6].forEach((i, n) => { fours[i] = tile(n + 1, 4); });
  assert.equal(game.goalSatisfied(blank(1, { tiles: fours })), true);
  fours[6] = tile(9, 8);
  assert.equal(game.goalSatisfied(blank(1, { tiles: fours })), false);
  const sequence = Array(16).fill(null);
  sequence[4] = tile(1, 8); sequence[5] = tile(2, 4); sequence[6] = tile(3, 2);
  assert.equal(game.goalSatisfied(blank(2, { tiles: sequence })), true);
  sequence[5] = null;
  assert.equal(game.goalSatisfied(blank(2, { tiles: sequence })), false);
});

test('defeat at zero HP takes priority over a completed numeric objective', () => {
  const tiles = Array(16).fill(null);
  tiles[5] = tile(1, 32);
  const state = blank(0, { tiles, mech: 8, hp: 1, didSlide: true,
    intent: { kind: 'attack', shape: 'row', anchor: 8, special: false } });
  const result = game.commit(state, () => 0);
  assert.equal(result.state.phase, 'lost');
  assert.equal(result.spawn, null);
});

test('spawn happens only after resolution and never occupies the Mech', () => {
  const state = game.createGame(() => 0);
  const slid = game.slide(state, 'left');
  assert.equal(slid.ok, true);
  const result = game.commit(slid.state, () => 0);
  assert.notEqual(result.spawn.index, result.state.mech);
  assert.equal(result.state.tiles[result.state.mech], null);
});

test('reaction parts are mutually exclusive and unlock by progress', () => {
  const state = game.createGame(() => 0, 0, { arm: 'cryo', leg: 'vector' });
  const target = game.legalArmTargets(state)[0];
  const used = game.useArm(state, target);
  assert.equal(used.ok, true);
  assert.equal(game.legalLegTargets(used.state).length, 0);
  assert.equal(game.unlockedParts(0).arm.some(p => p.id === 'cryo'), false);
  assert.equal(game.unlockedParts(1).arm.some(p => p.id === 'cryo'), true);
  assert.equal(game.unlockedParts(6).leg.some(p => p.id === 'transposer'), true);
});

test('Aegis has one full-turn cooldown', () => {
  const state = game.createGame(() => 0, 0, { arm: 'aegis' });
  const target = game.legalArmTargets(state)[0];
  const used = game.useArm(state, target).state;
  assert.equal(used.aegisReadyTurn, 3);
  const turn2 = { ...used, didReact: false, turn: 2 };
  assert.deepEqual(game.legalArmTargets(turn2), []);
  assert.ok(game.legalArmTargets({ ...turn2, turn: 3 }).length > 0);
});

test('each authored mission starts with a legal slide, a live target, and unique tile cells', () => {
  assert.equal(game.LEVELS.length, 7);
  game.LEVELS.forEach((level, index) => {
    const state = game.createGame(() => 0, index);
    assert.equal(state.tiles[state.mech], null, level.name);
    assert.equal(new Set(level.tiles.map(([cell]) => cell)).size, level.tiles.length, level.name);
    assert.ok(game.legalSlides(state).length > 0, level.name);
    assert.equal(game.goalSatisfied(state), false, level.name);
    assert.ok(game.affectedCells(state.intent).length > 0, level.name);
  });
});

test('early count and sequence missions cannot be won in a single unlocked-build turn', () => {
  for (const levelIndex of [1, 2]) {
    const state = game.createGame(() => 0, levelIndex,
      { arm: 'cryo', leg: levelIndex === 2 ? 'vector' : 'standard' });
    const candidates = game.legalSlides(state).map(direction => game.slide(state, direction).state);
    for (const target of game.legalLegTargets(state)) {
      const moved = game.useLeg(state, target).state;
      candidates.push(...game.legalSlides(moved).map(direction => game.slide(moved, direction).state));
    }
    for (const target of game.legalArmTargets(state)) {
      const reacted = game.useArm(state, target).state;
      candidates.push(...game.legalSlides(reacted).map(direction => game.slide(reacted, direction).state));
    }
    assert.ok(candidates.length > 0);
    assert.ok(candidates.every(candidate => game.commit(candidate, () => 0).state.phase !== 'won'));
  }
});

test('charged special waits a full turn and keeps its announced anchor', () => {
  const state = blank(3, { turn: 3, tiles: Array(16).fill(null), mech: 10, didSlide: true });
  state.tiles[15] = tile(1, 32);
  state.intent = game.planIntent(state);
  assert.equal(state.intent.kind, 'charge');
  assert.equal(state.intent.shape, 'square3');
  assert.equal(state.intent.anchor, 15);
  const result = game.commit(state, () => 0);
  assert.equal(result.attack.kind, 'charge');
  assert.equal(result.state.tiles[15]?.value, 32);
  assert.equal(result.state.intent.special, true);
  assert.equal(result.state.intent.anchor, 15);
  assert.deepEqual(game.affectedCells(result.state.intent), [10, 11, 14, 15]);
});
