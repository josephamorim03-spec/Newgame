(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.KaijuCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DIRECTIONS = ['up', 'right', 'down', 'left'];
  const PARTS = {
    chassis: [
      { id: 'atlas', name: 'Atlas', unlock: 0, hp: 10, text: 'Blindagem estável. 10 PV.' },
      { id: 'flux', name: 'Flux', unlock: 3, hp: 8, text: 'A primeira fusão 16+ de cada turno repara 1 PV.' }
    ],
    head: [
      { id: 'optic', name: 'Óptica', unlock: 0, text: 'Lê a intenção e a área exata do ataque.' },
      { id: 'predictor', name: 'Preditor', unlock: 2, text: 'Mostra também o próximo padrão do Kaiju.' },
      { id: 'scanner', name: 'Scanner', unlock: 4, text: 'Mostra a melhor fusão disponível em cada deslize.' }
    ],
    arm: [
      { id: 'discharge', name: 'Descarga', unlock: 0, text: 'Gasta bloco adjacente e cancela ataque comum.' },
      { id: 'cryo', name: 'Cryo', unlock: 1, text: 'Ancora bloco adjacente antes do deslize; ele ainda pode fundir.' },
      { id: 'aegis', name: 'Aegis', unlock: 3, text: 'Protege um bloco adjacente por uma resolução. Recarga: 1 turno.' },
      { id: 'permuter', name: 'Permutador', unlock: 5, text: 'Troca um bloco adjacente ao robô com outro bloco vizinho.' }
    ],
    leg: [
      { id: 'standard', name: 'Passo', unlock: 0, text: 'Move 1 casa ortogonal vazia.' },
      { id: 'vector', name: 'Vetorial', unlock: 2, text: 'Move até 2 casas em linha, sem atravessar blocos.' },
      { id: 'strider', name: 'Strider', unlock: 4, text: 'Move 1 casa também na diagonal.' },
      { id: 'transposer', name: 'Transpositor', unlock: 6, text: 'Troca o robô com um bloco adjacente.' }
    ]
  };
  const KAIJUS = {
    gunner: { name: 'Artilheiro', aim: 'largest', pattern: ['row'], normal: 'Linha horizontal', special: 'Nenhum', art: 'artilheiro' },
    piercer: { name: 'Perfurador', aim: 'largest', pattern: ['column'], normal: 'Coluna', special: 'Nenhum', art: 'perfurador' },
    reaper: { name: 'Ceifador', aim: 'largest', pattern: ['diag-down', 'diag-up', 'charge:x', 'special:x'], normal: 'Diagonal alternada', special: 'X completo após preparo', art: 'ceifador' },
    devastator: { name: 'Devastador', aim: 'largest', pattern: ['cross', 'cross', 'charge:square3', 'special:square3'], normal: 'Cruz ao redor do alvo', special: 'Área 3×3 após preparo', art: 'esmagador' },
    hunter: { name: 'Perseguidor', aim: 'mech', pattern: ['box2'], normal: 'Área 2×2 no robô', special: 'Nenhum', art: 'parasita' },
    jailer: { name: 'Carcereiro', aim: 'largest', pattern: ['single', 'charge:seal', 'special:seal', 'column'], normal: 'Alvo único / coluna', special: 'Sela um bloco após preparo', art: 'carcereiro' },
    architect: { name: 'Arquiteto', aim: 'largest', pattern: ['row', 'column@mech', 'cross', 'charge:square3', 'special:square3', 'column', 'charge:seal', 'special:seal'], normal: 'Linha, coluna e cruz', special: '3×3 e selo em ciclo visível', art: 'arquiteto' }
  };
  const LEVELS = [
    { name: 'Subestação', kaiju: 'gunner', goal: { kind: 'reach', value: 32 }, limit: 16, mech: 9, tiles: [[0, 2], [4, 2], [6, 4], [8, 4], [13, 8]], challenge: { kind: 'turns', limit: 8, label: 'Conclua em até 8 turnos' } },
    { name: 'Coluna Zero', kaiju: 'piercer', goal: { kind: 'count', value: 4, count: 4 }, limit: 15, mech: 6, tiles: [[0, 2], [1, 2], [4, 4], [8, 4], [9, 2]], challenge: { kind: 'hp', limit: 7, label: 'Termine com 7+ PV' } },
    { name: 'Fio da Navalha', kaiju: 'reaper', goal: { kind: 'sequence', values: [2, 4, 8] }, limit: 16, mech: 5, tiles: [[1, 2], [3, 8], [4, 2], [13, 2], [15, 4]], challenge: { kind: 'turns', limit: 9, label: 'Conclua em até 9 turnos' } },
    { name: 'Zona de Impacto', kaiju: 'devastator', goal: { kind: 'reach', value: 64 }, limit: 22, mech: 10, tiles: [[0, 8], [1, 8], [4, 4], [5, 4], [7, 2], [11, 16], [15, 8]], challenge: { kind: 'shots', limit: 0, label: 'Não use Descarga' } },
    { name: 'Caçada', kaiju: 'hunter', goal: { kind: 'count', value: 16, count: 2 }, limit: 19, mech: 5, tiles: [[0, 8], [1, 8], [8, 4], [12, 4], [14, 2], [15, 2]], challenge: { kind: 'hp', limit: 6, label: 'Termine com 6+ PV' } },
    { name: 'Cativeiro', kaiju: 'jailer', goal: { kind: 'sequence', values: [4, 8, 16] }, limit: 21, mech: 9, tiles: [[0, 8], [1, 4], [4, 4], [5, 2], [6, 2], [12, 16]], challenge: { kind: 'turns', limit: 12, label: 'Conclua em até 12 turnos' } },
    { name: 'Núcleo Final', kaiju: 'architect', goal: { kind: 'reach', value: 64 }, limit: 24, mech: 10, tiles: [[0, 16], [1, 8], [4, 8], [5, 4], [7, 4], [9, 2], [12, 2], [15, 8]], challenge: { kind: 'hp', limit: 6, label: 'Termine com 6+ PV' } }
  ];

  function row(i) { return Math.floor(i / 4); }
  function col(i) { return i % 4; }
  function index(r, c) { return r * 4 + c; }
  function inside(r, c) { return r >= 0 && r < 4 && c >= 0 && c < 4; }
  function adjacent(a, b) { return Math.abs(row(a) - row(b)) + Math.abs(col(a) - col(b)) === 1; }
  function copy(s) {
    return { ...s, tiles: s.tiles.map(t => t ? { ...t } : null), build: { ...s.build },
      intent: s.intent ? { ...s.intent } : null, pending: s.pending ? { ...s.pending } : null };
  }
  function valueAt(s, i) { return s.tiles[i]?.value || 0; }
  function maxTile(s) { return Math.max(0, ...s.tiles.map(t => t?.value || 0)); }
  function nextValue(random) { return random() < .82 ? 2 : 4; }
  function pick(length, random) { return Math.min(length - 1, Math.floor(Math.max(0, random()) * length)); }
  function normalizeBuild(build = {}) {
    const result = {};
    for (const type of Object.keys(PARTS))
      result[type] = PARTS[type].some(p => p.id === build[type]) ? build[type] : PARTS[type][0].id;
    return result;
  }
  function unlockedParts(completedCount) {
    return Object.fromEntries(Object.entries(PARTS).map(([type, items]) =>
      [type, items.filter(item => item.unlock <= completedCount)]));
  }

  function goalSatisfied(state) {
    const goal = LEVELS[state.level].goal;
    if (goal.kind === 'reach') return maxTile(state) >= goal.value;
    if (goal.kind === 'count') return state.tiles.filter(t => t?.value === goal.value).length >= goal.count;
    const values = goal.values;
    for (let axis = 0; axis < 4; axis++) {
      for (let start = 0; start <= 4 - values.length; start++) {
        const horizontal = values.map((_, step) => valueAt(state, index(axis, start + step)));
        const vertical = values.map((_, step) => valueAt(state, index(start + step, axis)));
        if ([horizontal, vertical].some(line => line.every((v, k) => v === values[k]) ||
          line.every((v, k) => v === values[values.length - 1 - k]))) return true;
      }
    }
    return false;
  }
  function goalLabel(goal) {
    if (goal.kind === 'reach') return `Preserve um bloco ${goal.value}`;
    if (goal.kind === 'count') return `Preserve ${goal.count} blocos ${goal.value}`;
    return `Alinhe ${goal.values.join('–')} em linha ou coluna`;
  }

  function chooseAnchor(state, aim) {
    if (aim === 'mech') return state.mech;
    let best = -1;
    for (let i = 0; i < 16; i++)
      if (state.tiles[i] && (best < 0 || state.tiles[i].value > state.tiles[best].value)) best = i;
    return best < 0 ? state.mech : best;
  }
  function planIntent(state) {
    if (state.pending) return { ...state.pending, kind: 'attack', special: true };
    const kaiju = KAIJUS[LEVELS[state.level].kaiju];
    const raw = kaiju.pattern[(state.turn - 1) % kaiju.pattern.length];
    const [token, aimOverride] = raw.split('@');
    const charge = token.startsWith('charge:');
    const shape = token.split(':').pop();
    const anchor = chooseAnchor(state, aimOverride || kaiju.aim);
    const tile = state.tiles[anchor];
    return { kind: charge ? 'charge' : 'attack', shape, anchor,
      aim: aimOverride || kaiju.aim, special: false,
      targetId: tile?.id ?? null, targetValue: tile?.value ?? 0 };
  }
  function affectedCells(intent) {
    const { shape, anchor } = intent;
    const r = row(anchor), c = col(anchor);
    const cells = [];
    for (let i = 0; i < 16; i++) {
      const dr = row(i) - r, dc = col(i) - c;
      let hit = false;
      if (shape === 'row') hit = dr === 0;
      else if (shape === 'column') hit = dc === 0;
      else if (shape === 'diag-down') hit = dr === dc;
      else if (shape === 'diag-up') hit = dr === -dc;
      else if (shape === 'x') hit = Math.abs(dr) === Math.abs(dc);
      else if (shape === 'cross') hit = Math.abs(dr) + Math.abs(dc) <= 1;
      else if (shape === 'square3') hit = Math.abs(dr) <= 1 && Math.abs(dc) <= 1;
      else if (shape === 'box2') {
        const top = Math.min(2, r), left = Math.min(2, c);
        hit = row(i) >= top && row(i) <= top + 1 && col(i) >= left && col(i) <= left + 1;
      } else if (shape === 'single' || shape === 'seal') hit = i === anchor;
      if (hit) cells.push(i);
    }
    return cells;
  }
  function forecast(state) {
    const intent = state.intent;
    const cells = affectedCells(intent);
    if (intent.kind === 'charge') return { kind: 'charge', cells, target: intent.anchor, shape: intent.shape };
    if (state.cancelled) return { kind: 'cancelled', cells, targets: [], mechDamage: 0 };
    if (intent.shape === 'seal') {
      const tile = state.tiles[intent.anchor];
      return { kind: 'seal', cells, target: intent.anchor,
        valid: !!tile && tile.id === intent.targetId && !tile.sealed,
        value: tile?.value || 0, mechDamage: 0, targets: [] };
    }
    const limit = intent.special ? Infinity : intent.shape === 'cross' ? 2 : 1;
    const targets = cells.filter(i => state.tiles[i]).sort((a, b) =>
      state.tiles[b].value - state.tiles[a].value || a - b).slice(0, limit).map(i => ({
        index: i, value: state.tiles[i].value,
        blocked: !!(state.tiles[i].shielded || state.tiles[i].sealed)
      }));
    return { kind: 'attack', cells, targets, mechDamage: cells.includes(state.mech) ? (intent.special ? 2 : 1) : 0 };
  }

  // Frozen tiles are fixed walls, except that the first equal tile pushed into
  // them merges at the frozen position. Sealed tiles are immovable and cannot merge.
  function slideTiles(state, direction) {
    if (!DIRECTIONS.includes(direction)) throw new Error('Direção inválida');
    const out = Array(16).fill(null), motions = [], merges = [];
    let nextId = state.nextId;
    function pack(segment, frozenAnchor) {
      const entries = segment.filter(i => state.tiles[i]).map(i => ({ from: i, tile: state.tiles[i] }));
      if (frozenAnchor !== null && entries.length && out[frozenAnchor]?.value === entries[0].tile.value) {
        const first = entries.shift();
        const fixed = out[frozenAnchor];
        const value = fixed.value * 2;
        out[frozenAnchor] = { id: nextId++, value, shielded: fixed.shielded || first.tile.shielded, sealed: 0 };
        motions.push({ from: first.from, to: frozenAnchor, value: first.tile.value, merged: true });
        merges.push({ to: frozenAnchor, value, sources: [frozenAnchor, first.from], frozen: true });
      }
      let destination = 0;
      for (let i = 0; i < entries.length; i++) {
        const first = entries[i], second = entries[i + 1];
        const merge = !!second && first.tile.value === second.tile.value;
        const to = segment[destination++];
        if (merge) {
          const value = first.tile.value * 2;
          out[to] = { id: nextId++, value,
            shielded: first.tile.shielded || second.tile.shielded, sealed: 0 };
          motions.push({ from: first.from, to, value: first.tile.value, merged: true },
            { from: second.from, to, value: second.tile.value, merged: true });
          merges.push({ to, value, sources: [first.from, second.from] });
          i++;
        } else {
          out[to] = { ...first.tile };
          motions.push({ from: first.from, to, value: first.tile.value, merged: false });
        }
      }
    }
    for (let axis = 0; axis < 4; axis++) {
      const line = [];
      for (let step = 0; step < 4; step++) {
        if (direction === 'left') line.push(index(axis, step));
        if (direction === 'right') line.push(index(axis, 3 - step));
        if (direction === 'up') line.push(index(step, axis));
        if (direction === 'down') line.push(index(3 - step, axis));
      }
      let segment = [], frozenAnchor = null;
      for (const cell of line) {
        const tile = state.tiles[cell];
        const barrier = cell === state.mech || !!tile?.sealed || cell === state.frozenIndex;
        if (barrier) {
          pack(segment, frozenAnchor);
          segment = [];
          if (tile) out[cell] = { ...tile };
          frozenAnchor = cell === state.frozenIndex ? cell : null;
        } else segment.push(cell);
      }
      pack(segment, frozenAnchor);
    }
    const strongestMerge = Math.max(0, ...merges.map(m => m.value));
    const released = [];
    if (strongestMerge) for (let i = 0; i < 16; i++)
      if (out[i]?.sealed && strongestMerge >= out[i].sealed) {
        out[i].sealed = 0; released.push(i);
      }
    return { tiles: out, nextId, motions, merges, released,
      changed: motions.some(m => m.from !== m.to || m.merged) };
  }
  function legalSlides(state) {
    if (state.phase !== 'playing' || state.didSlide) return [];
    return DIRECTIONS.filter(dir => slideTiles(state, dir).changed);
  }

  function legalLegTargets(state) {
    if (state.phase !== 'playing' || state.didReact) return [];
    const leg = state.build.leg, from = state.mech, result = [];
    for (let i = 0; i < 16; i++) {
      const dr = Math.abs(row(i) - row(from)), dc = Math.abs(col(i) - col(from));
      if (leg === 'transposer') {
        if (dr + dc === 1 && state.tiles[i] && !state.tiles[i].sealed && i !== state.frozenIndex) result.push(i);
      } else if (!state.tiles[i] && i !== from) {
        if (leg === 'strider' && Math.max(dr, dc) === 1) result.push(i);
        else if (dr + dc === 1) result.push(i);
        else if (leg === 'vector' && dr + dc === 2 && (dr === 0 || dc === 0)) {
          const between = index((row(i) + row(from)) / 2, (col(i) + col(from)) / 2);
          if (!state.tiles[between]) result.push(i);
        }
      }
    }
    return result;
  }
  function legalArmTargets(state, first = null) {
    if (state.phase !== 'playing' || state.didReact) return [];
    const arm = state.build.arm;
    if (arm === 'discharge' && (state.intent.kind !== 'attack' || state.intent.special)) return [];
    if (arm === 'cryo' && state.didSlide) return [];
    if (arm === 'aegis' && (state.turn < state.aegisReadyTurn || state.intent.kind === 'charge')) return [];
    if (arm === 'permuter' && first !== null) return Array.from({ length: 16 }, (_, i) => i).filter(i =>
      adjacent(first, i) && !!state.tiles[i] && !state.tiles[i].sealed && i !== state.frozenIndex && i !== first);
    return Array.from({ length: 16 }, (_, i) => i).filter(i =>
      adjacent(state.mech, i) && !!state.tiles[i] && !state.tiles[i].sealed && i !== state.frozenIndex);
  }
  function useLeg(state, target) {
    if (!legalLegTargets(state).includes(target)) return { ok: false };
    const next = copy(state), from = next.mech;
    if (next.build.leg === 'transposer') {
      next.tiles[from] = next.tiles[target];
      next.tiles[target] = null;
    }
    next.mech = target;
    next.didReact = true;
    next.reaction = 'leg';
    return { ok: true, state: next, from, to: target };
  }
  function useArm(state, target, second = null) {
    const arm = state.build.arm;
    if (!legalArmTargets(state).includes(target)) return { ok: false };
    if (arm === 'permuter' && !legalArmTargets(state, target).includes(second)) return { ok: false };
    const next = copy(state), tile = next.tiles[target];
    if (arm === 'discharge') { next.tiles[target] = null; next.cancelled = true; next.shots++; }
    else if (arm === 'cryo') next.frozenIndex = target;
    else if (arm === 'aegis') { tile.shielded = true; next.aegisReadyTurn = state.turn + 2; }
    else if (arm === 'permuter') [next.tiles[target], next.tiles[second]] = [next.tiles[second], next.tiles[target]];
    next.didReact = true;
    next.reaction = 'arm';
    return { ok: true, state: next, target, second, value: tile.value };
  }
  function slide(state, direction) {
    if (state.phase !== 'playing' || state.didSlide || !DIRECTIONS.includes(direction)) return { ok: false };
    const result = slideTiles(state, direction);
    if (!result.changed) return { ok: false, reason: 'no-change' };
    const next = copy(state);
    next.tiles = result.tiles;
    next.nextId = result.nextId;
    next.didSlide = true;
    next.totalMerges += result.merges.length;
    next.score += result.merges.reduce((sum, m) => sum + m.value, 0);
    if (next.build.chassis === 'flux' && result.merges.some(m => m.value >= 16) && next.lastRepairTurn !== next.turn) {
      next.hp = Math.min(next.maxHp, next.hp + 1);
      next.lastRepairTurn = next.turn;
    }
    return { ok: true, state: next, ...result };
  }

  function canRecoverDeadlock(state) {
    if (legalSlides(state).length) return true;
    if (state.didReact) return false;
    for (const target of legalLegTargets(state)) {
      const result = useLeg(state, target);
      if (result.ok && legalSlides(result.state).length) return true;
    }
    for (const target of legalArmTargets(state)) {
      if (state.build.arm === 'permuter') {
        for (const second of legalArmTargets(state, target)) {
          const result = useArm(state, target, second);
          if (result.ok && legalSlides(result.state).length) return true;
        }
      } else {
        const result = useArm(state, target);
        if (result.ok && legalSlides(result.state).length) return true;
      }
    }
    return false;
  }

  function createGame(random = Math.random, levelIndex = 0, selectedBuild = {}) {
    if (!Number.isInteger(levelIndex) || levelIndex < 0 || levelIndex >= LEVELS.length)
      throw new Error('Fase inválida');
    const level = LEVELS[levelIndex], build = normalizeBuild(selectedBuild);
    const chassis = PARTS.chassis.find(p => p.id === build.chassis);
    const tiles = Array(16).fill(null);
    let nextId = 1;
    for (const [i, value] of level.tiles) tiles[i] = { id: nextId++, value, shielded: false, sealed: 0 };
    const state = {
      level: levelIndex, build, tiles, nextId, mech: level.mech,
      hp: chassis.hp, maxHp: chassis.hp, turn: 1, nextValue: nextValue(random),
      didSlide: false, didReact: false, reaction: null, cancelled: false,
      frozenIndex: null, aegisReadyTurn: 1, lastRepairTurn: 0,
      intent: null, pending: null, phase: 'playing', score: 0, totalMerges: 0, shots: 0
    };
    state.intent = planIntent(state);
    return state;
  }

  function commit(state, random = Math.random) {
    if (state.phase !== 'playing' || !state.didSlide) return { ok: false, reason: 'slide-required' };
    const next = copy(state), attack = forecast(next), lostTiles = [];
    if (attack.kind === 'charge') {
      next.pending = { ...next.intent, kind: 'attack', special: true };
    } else {
      if (next.intent.special) next.pending = null;
      if (attack.kind === 'seal' && attack.valid) next.tiles[attack.target].sealed = attack.value;
      if (attack.kind === 'attack') {
        for (const hit of attack.targets) if (!hit.blocked) {
          lostTiles.push({ index: hit.index, value: hit.value });
          next.tiles[hit.index] = null;
        }
        next.hp = Math.max(0, next.hp - attack.mechDamage);
      }
    }
    for (const tile of next.tiles) if (tile) tile.shielded = false;
    next.frozenIndex = null;
    if (next.hp <= 0) next.phase = 'lost';
    else if (goalSatisfied(next)) next.phase = 'won';
    else if (next.turn >= LEVELS[next.level].limit) next.phase = 'lost';
    if (next.phase !== 'playing') return { ok: true, state: next, attack, lostTiles, spawn: null };

    const empty = [];
    for (let i = 0; i < 16; i++) if (i !== next.mech && !next.tiles[i]) empty.push(i);
    let spawn = null;
    if (empty.length) {
      const at = empty[pick(empty.length, random)];
      next.tiles[at] = { id: next.nextId++, value: next.nextValue, shielded: false, sealed: 0 };
      spawn = { index: at, value: next.nextValue };
      next.nextValue = nextValue(random);
    }
    next.turn++;
    next.didSlide = false;
    next.didReact = false;
    next.reaction = null;
    next.cancelled = false;
    next.intent = planIntent(next);
    if (!canRecoverDeadlock(next)) next.phase = 'lost';
    return { ok: true, state: next, attack, lostTiles, spawn };
  }
  function challengeComplete(state) {
    if (state.phase !== 'won') return false;
    const challenge = LEVELS[state.level].challenge;
    if (challenge.kind === 'turns') return state.turn <= challenge.limit;
    if (challenge.kind === 'hp') return state.hp >= challenge.limit;
    if (challenge.kind === 'shots') return state.shots <= challenge.limit;
    return false;
  }
  function nextPattern(state) {
    if (state.intent.kind === 'charge') return `ESPECIAL ${state.intent.shape.toUpperCase()}`;
    const kaiju = KAIJUS[LEVELS[state.level].kaiju];
    const token = kaiju.pattern[state.turn % kaiju.pattern.length];
    return token.startsWith('charge:') ? `PREPARO ${token.split(':')[1].toUpperCase()}` : token.replace('@mech', '').toUpperCase();
  }

  return { DIRECTIONS, PARTS, KAIJUS, LEVELS, row, col, adjacent, copy,
    valueAt, maxTile, normalizeBuild, unlockedParts, goalSatisfied, goalLabel,
    planIntent, affectedCells, forecast, slideTiles, legalSlides, legalLegTargets,
    legalArmTargets, useLeg, useArm, slide, canRecoverDeadlock,
    createGame, commit, challengeComplete, nextPattern };
});
