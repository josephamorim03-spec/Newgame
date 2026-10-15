// As regras do Afluente (as mesmas do jogo 2D, prototipo/afluente.html, Engine): peças hexagonais com 6 bordas
// (A água, B mata, C lavoura, V vila, G campo), encaixe livre exceto que água que chega não pode bater em terra,
// +1 por borda igual, peça perfeita (+5 e +1 peça), o que o vale passa a produzir, água viva nascendo da fonte,
// estações de 8 jogadas nas Águas e 4 na Seca, colheita na chegada da seca e +2 peças na volta das chuvas.
// Aqui só a lógica (sem desenho), para o tabuleiro 3D usar.

export const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];   // L, NE, NO, O, SO, SE
export const opp = d => (d + 3) % 6;
export const K = (q, r) => (q + 64) * 128 + (r + 64);
export const KQ = k => Math.floor(k / 128) - 64, KR = k => (k % 128) - 64;
export const rot = (e, r) => e.map((_, i) => e[(i - r + 6) % 6]);

function rngOf(str) { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
  let a = h >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const LAND = [['B', 30], ['C', 26], ['V', 13], ['G', 31]];
const pickW = (rng, list) => { const tot = list.reduce((s, x) => s + x[1], 0); let r = rng() * tot; for (const [v, w] of list) { if ((r -= w) < 0) return v; } return list[list.length - 1][0]; };
const SHAPES = [[[0, 3], 3], [[0, 2], 4], [[0, 1], 2], [[0, 2, 4], 1], [[0], 1]];   // reto, curva, fechada, bifurcação, fim
export function genTile(rng) {
  const roll = rng(), a = pickW(rng, LAND); let e;
  if (roll < 0.32) { const shape = pickW(rng, SHAPES.map(([s, w]) => [s, w])), b = rng() < 0.55 ? a : pickW(rng, LAND); e = [0, 1, 2, 3, 4, 5].map(i => shape.includes(i) ? 'A' : i < 3 ? a : b); }
  else if (roll < 0.46) e = Array(6).fill(a);
  else { const b = pickW(rng, LAND), n = 1 + Math.floor(rng() * 3); e = [0, 1, 2, 3, 4, 5].map(i => i < n ? b : a); if (rng() < 0.3) e[4] = pickW(rng, LAND); }
  return rot(e, Math.floor(rng() * 6));
}

export function Game({ seed = 'vale-3d', start = [], maxDist = Infinity, center = [0, 0], cellPos }) {
  const rng = rngOf('v05:' + seed), board = new Map(), drawn = [];
  for (const t of start) board.set(K(t.q, t.r), { q: t.q, r: t.r, e: t.e.slice(), src: !!t.src, fixed: true });
  const S = { left: 22, score: 0, season: 1, clock: 0, next: 0, log: [], alive: new Set(), lastGain: null };
  const seasonLen = () => (S.season % 2 === 1 ? 8 : 4);
  const draw = i => { while (drawn.length <= i) drawn.push(genTile(rng)); return drawn[i]; };
  const nb = (q, r, d) => [q + DIRS[d][0], r + DIRS[d][1]];
  const get = (q, r) => board.get(K(q, r));
  function legal(q, r, e) { for (let d = 0; d < 6; d++) { const n = get(...nb(q, r, d)); if (n && n.e[opp(d)] === 'A' && e[d] !== 'A') return false; } return true; }
  function slots() { const out = new Map(); for (const t of board.values()) for (let d = 0; d < 6; d++) { const [q, r] = nb(t.q, t.r, d), k = K(q, r); if (board.has(k) || out.has(k)) continue;
    const p = cellPos(q, r); if (Math.hypot(p[0] - center[0], p[1] - center[1]) > maxDist) continue; out.set(k, { q, r }); } return [...out.values()]; }
  // água viva: nasce nas fontes e corre por pares de bordas A encostadas (dentro da peça, todas as bordas A se ligam)
  function alive(B = board, pass = () => true) { const seen = new Set(), q = []; for (const [k, t] of B) if (t.src) { seen.add(k); q.push(t); }
    while (q.length) { const t = q.shift(); for (let d = 0; d < 6; d++) { if (t.e[d] !== 'A') continue; const [nq, nr] = nb(t.q, t.r, d), k = K(nq, nr), n = B.get(k);
      if (!n || seen.has(k) || n.e[opp(d)] !== 'A' || !pass(n)) continue; seen.add(k); q.push(n); } } return seen; }
  // irrigada: tem água viva ou encosta numa borda A viva do vizinho
  function irrig(B, live) { const s = new Set(); for (const [k, t] of B) { if (live.has(k) && t.e.includes('A')) { s.add(k); continue; }
    for (let d = 0; d < 6; d++) { const [nq, nr] = nb(t.q, t.r, d), nk = K(nq, nr), n = B.get(nk); if (n && live.has(nk) && n.e[opp(d)] === 'A') { s.add(k); break; } } } return s; }
  function production(B = board, live = alive(B)) { const ir = irrig(B, live); let p = 0;
    for (const [k, t] of B) { const has = x => t.e.includes(x), wet = ir.has(k);
      if (has('C') && wet) p += 2; if (has('G') && wet) p += 1;
      if (has('V') && wet) { let n = has('C') ? 1 : 0; for (let d = 0; d < 6; d++) { const [nq, nr] = nb(t.q, t.r, d), nk = K(nq, nr), o = B.get(nk); if (o && ir.has(nk) && o.e.includes('C')) n++; } p += Math.min(3, n); }
      if (has('B')) { let touch = has('A'); for (let d = 0; d < 6 && !touch; d++) { const o = get(...nb(t.q, t.r, d)); if (o && o.e[opp(d)] === 'A') touch = true; } if (touch) p += 1; } }
    return p; }
  // na seca a água só passa por onde a mata protege (borda B na peça ou no vizinho)
  const shielded = t => { if (t.src || t.e.includes('B')) return true; for (let d = 0; d < 6; d++) { const o = get(...nb(t.q, t.r, d)); if (o && o.e[opp(d)] === 'B') return true; } return false; };
  function preview(q, r, e) { let pts = 0, tiles = 0, match = [], perfect = false;
    for (let d = 0; d < 6; d++) { const n = get(...nb(q, r, d)); if (!n) { match.push(null); continue; } const ok = n.e[opp(d)] === e[d]; match.push(ok); if (ok) pts++; }
    const B2 = new Map(board); B2.set(K(q, r), { q, r, e }); const full = (tq, tr, B) => { const t = B.get(K(tq, tr)); for (let d = 0; d < 6; d++) { const n = B.get(K(...nb(tq, tr, d))); if (!n || n.e[opp(d)] !== t.e[d]) return false; } return true; };
    if (full(q, r, B2)) { pts += 5; tiles++; perfect = true; }
    for (let d = 0; d < 6; d++) { const [nq, nr] = nb(q, r, d); if (board.has(K(nq, nr)) && full(nq, nr, B2) && !full(nq, nr, board)) { pts += 5; tiles++; } }
    const live2 = alive(B2), dp = production(B2, live2) - production(); if (dp > 0) pts += dp;
    let flow = 0; for (const k of live2) if (!S.alive.has(k)) flow++; pts += flow;
    return { pts, tiles, match, perfect, flow, dprod: Math.max(0, dp), legal: legal(q, r, e) }; }
  function options(q, r) { const base = draw(S.next), seen = new Set(), out = [];
    for (let k = 0; k < 6; k++) { const e = rot(base, k), sig = e.join(''); if (seen.has(sig) || !legal(q, r, e)) continue; seen.add(sig); out.push({ r: k, e, ...preview(q, r, e) }); }
    return out.sort((a, b) => (b.pts + 4 * b.tiles) - (a.pts + 4 * a.tiles)); }
  S.alive = alive();
  function place(q, r, e) { const pv = preview(q, r, e); board.set(K(q, r), { q, r, e: e.slice() }); S.score += pv.pts; S.left += pv.tiles - 1; S.next++;
    const before = S.alive; S.alive = alive(); const events = [];
    if (pv.perfect) events.push('Peça perfeita: +5 e +1 peça'); if (pv.flow) events.push(`A água chegou em ${pv.flow} peça${pv.flow > 1 ? 's' : ''}`);
    S.clock++; if (S.clock >= seasonLen()) { S.clock = 0; S.season++;
      if (S.season % 2 === 0) { // começa a seca: a água só segue onde a mata protege; colheita
        const dry = alive(board, shielded), flowing = [...dry].length, harvest = production(board, dry); S.score += flowing + harvest; S.alive = dry;
        events.push(`Começa a seca: colheita +${harvest}, água que resistiu +${flowing}`); }
      else { S.left += 2; S.alive = alive(); events.push('As chuvas voltaram: +2 peças'); } }
    S.lastGain = { ...pv, events }; return S.lastGain; }
  return { S, board, get, draw, legal, slots, options, preview, place, production, alive: () => S.alive, seasonLen, over: () => S.left <= 0,
    phase: () => (S.season % 2 === 1 ? 'Águas' : 'Seca'), skip() { S.next++; S.left--; S.clock++; } };
}
