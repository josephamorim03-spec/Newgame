// Afluente, núcleo v5: "o rio é o orçamento". Só a lógica (sem desenho), para o protótipo e para o simulador.
//
// As regras, em cinco frases:
//  1. Encaixar: cada peça tem 6 lados (A água, B mata, C lavoura, V vila, G campo). Água só encosta em água.
//  2. O rio tem vazão: cada nascente dá água (💧). Ligar o rio a um olho-d'água do mapa soma a vazão dele.
//  3. Lavoura e vila gastam água: cada peça com lavoura ou vila encostada no rio usa 1 💧. A água chega primeiro em quem
//     está mais perto da nascente; quando a vazão acaba, o resto fica seco.
//  4. Cada vila pede uma coisa por vez (plaquinha). Atendeu: a vila cresce (gente = pontos), ganha 1 peça e você
//     escolhe entre dois pacotes de peças.
//  5. A seca: a cada 8 jogadas de Águas vêm 4 de Seca, e as nascentes dão menos (o quanto, você vê antes). Na chegada da
//     seca, a colheita: 1 peça a cada 2 lavouras que continuam com água. A pilha é a vida: acabou, acabou.
//  (+ peça perfeita, com os 6 lados combinando, devolve 1 peça.)

export const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];   // L, NE, NO, O, SO, SE
export const opp = d => (d + 3) % 6;
export const K = (q, r) => (q + 512) * 1024 + (r + 512);
export const KQ = k => Math.floor(k / 1024) - 512, KR = k => (k % 1024) - 512;
export const nbk = (k, d) => K(KQ(k) + DIRS[d][0], KR(k) + DIRS[d][1]);
export const rot = (e, r) => e.map((_, i) => e[(i - r + 6) % 6]);
export const hexDist = (q, r) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
export const LAND = ['B', 'C', 'V', 'G'];
export const NOME = { A: 'rio', B: 'mata', C: 'lavoura', V: 'vila', G: 'campo' };

export function rngOf(str) { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
  let a = h >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pickW = (rng, list) => { const tot = list.reduce((s, x) => s + x[1], 0); let r = rng() * tot; for (const [v, w] of list) if ((r -= w) < 0) return v; return list[list.length - 1][0]; };

// ---------- peças: temas (a pilha comum e os pacotes)
export const TEMAS = {
  comum: { nome: 'Vale', land: [['B', 30], ['C', 27], ['V', 15], ['G', 28]], rio: 0.3 },
  roca: { nome: 'Roça', icone: '🌾', land: [['C', 70], ['G', 20], ['V', 10]], rio: 0.25, desc: 'lavouras' },
  mata: { nome: 'Mata', icone: '🌳', land: [['B', 75], ['G', 25]], rio: 0.2, desc: 'bosques' },
  rio: { nome: 'Rio', icone: '💧', land: [['G', 45], ['B', 30], ['C', 25]], rio: 1, desc: 'trechos de rio' },
  vila: { nome: 'Vila', icone: '🏠', land: [['V', 70], ['C', 15], ['G', 15]], rio: 0.15, desc: 'casas' },
};
const SHAPES = [[[0, 3], 3], [[0, 2], 4], [[0, 1], 1], [[0, 2, 4], 1.2], [[0], 0.6]];   // reto, curva, curva fechada, forquilha, fim
export function genTile(rng, tema = 'comum') { const T = TEMAS[tema], a = pickW(rng, T.land); let e;
  if (rng() < T.rio) { const sh = pickW(rng, SHAPES), b = rng() < 0.6 ? a : pickW(rng, T.land); e = [0, 1, 2, 3, 4, 5].map(i => sh.includes(i) ? 'A' : i < 3 ? a : b); }
  else if (rng() < 0.3) e = Array(6).fill(a);
  else { const b = pickW(rng, T.land), n = 1 + Math.floor(rng() * 3); e = [0, 1, 2, 3, 4, 5].map(i => i < n ? b : a); }
  return { e: rot(e, Math.floor(rng() * 6)), tema }; }

// ---------- pedidos das vilas
export const PEDIDOS = {
  agua: { icone: '💧', txt: () => 'água na vila' },
  lavoura: { icone: '🌾', txt: n => `${n} lavoura${n > 1 ? 's' : ''} com água perto` },
  mata: { icone: '🌳', txt: n => `mata de ${n} peças encostada` },
  crescer: { icone: '🏠', txt: n => `vila com ${n} peças` },
  pasto: { icone: '🐄', txt: n => `${n} campo${n > 1 ? 's' : ''} com água perto` },
};

export function Game({ seed = 'vale', pilha = 22, nascente = 4, aguas = 8, seca = 4 } = {}) {
  const rng = rngOf('v5:' + seed), board = new Map();
  const S = { left: pilha, gente: 0, season: 1, clock: 0, order: 0, queue: [], vilas: new Map(), springs: new Map(), escolha: [], log: [], over: false, aguas, seca, ano: 1 };
  const put = (q, r, e, extra = {}) => board.set(K(q, r), { q, r, e: e.slice(), order: S.order++, ...extra });
  put(0, 0, ['A', 'G', 'G', 'A', 'G', 'G'], { src: nascente, fixed: true, nasc: true });   // a nascente: o rio sai para leste e para oeste
  put(0, 1, ['V', 'V', 'V', 'V', 'V', 'V'], { fixed: true });                          // a primeira vila, encostada no rio
  const isSeca = () => S.season % 2 === 0;
  const flowOf = (src, dry) => dry ? Math.max(1, Math.round(src * 0.6)) : src;

  // ---------- olhos-d'água: aparecem a 2–3 casas da beira do vale; sempre há 3 à vista
  function frontier() { const out = new Set(); for (const k of board.keys()) for (let d = 0; d < 6; d++) { const n = nbk(k, d); if (!board.has(n)) out.add(n); } return out; }
  function spawnSprings() { let guard = 0; while (S.springs.size < 3 && guard++ < 400) {
      const fr = [...frontier()], f = fr[Math.floor(rng() * fr.length)], d = Math.floor(rng() * 6), k = nbk(nbk(f, d), Math.floor(rng() * 6));
      if (board.has(k) || S.springs.has(k)) continue; let near = false; for (let i = 0; i < 6; i++) if (board.has(nbk(k, i))) near = true; if (near) continue;
      let close = false; for (const s of S.springs.keys()) if (hexDist(KQ(s) - KQ(k), KR(s) - KR(k)) < 3) close = true; if (close) continue;
      S.springs.set(k, rng() < 0.3 ? 3 : 2); } }
  spawnSprings();

  // ---------- a pilha: a peça na mão e a próxima são sempre conhecidas; os pacotes entram na frente
  const ensure = () => { while (S.queue.length < 2) S.queue.push(genTile(rng)); };
  const hand = () => { ensure(); return S.queue[0]; }, next = () => { ensure(); return S.queue[1]; };

  // ---------- encaixe
  function legal(B, k, e) { for (let d = 0; d < 6; d++) { const n = B.get(nbk(k, d)); if (!n) continue; const a = e[d] === 'A', b = n.e[opp(d)] === 'A'; if (a !== b) return false; } return true; }
  function slots() { const out = []; for (const k of frontier()) out.push(k); return out; }

  // ---------- a água: redes de rio (lados A encostados), vazão das nascentes, quem gasta e quem fica seco
  function water(B = board, dry = isSeca()) {
    const river = [...B.entries()].filter(([, t]) => t.e.includes('A')), net = new Map(); let nid = 0;
    for (const [k] of river) { if (net.has(k)) continue; const st = [k]; net.set(k, nid);
      while (st.length) { const c = st.pop(), t = B.get(c); for (let d = 0; d < 6; d++) { if (t.e[d] !== 'A') continue; const n = nbk(c, d), u = B.get(n); if (!u || net.has(n) || u.e[opp(d)] !== 'A') continue; net.set(n, nid); st.push(n); } } nid++; }
    const nets = Array.from({ length: nid }, () => ({ flow: 0, used: 0, tiles: [], dryUsed: 0 }));
    for (const [k, t] of river) { const n = nets[net.get(k)]; n.tiles.push(k); if (t.src) n.flow += flowOf(t.src, dry); }
    // distância (em peças de rio) até a nascente mais próxima da rede
    const dist = new Map(), q = []; for (const [k, t] of river) if (t.src) { dist.set(k, 0); q.push(k); }
    while (q.length) { const c = q.shift(), t = B.get(c); for (let d = 0; d < 6; d++) { if (t.e[d] !== 'A') continue; const n = nbk(c, d), u = B.get(n); if (!u || dist.has(n) || u.e[opp(d)] !== 'A') continue; dist.set(n, dist.get(c) + 1); q.push(n); } }
    // quem gasta: peça com lavoura ou vila que é rio ou encosta numa peça de rio (pega da rede onde a água chega antes)
    const cons = [];
    for (const [k, t] of B) { if (!t.e.includes('C') && !t.e.includes('V')) continue; let best = null;
      const consider = (rk, add) => { if (!net.has(rk) || !dist.has(rk)) return; const d = dist.get(rk) + add; if (!best || d < best.d) best = { d, n: net.get(rk) }; };
      if (net.has(k)) consider(k, 0); for (let d = 0; d < 6; d++) consider(nbk(k, d), 1);
      if (best) cons.push({ k, ...best, order: t.order }); }
    cons.sort((a, b) => a.d - b.d || a.order - b.order);
    const wet = new Set(), dryC = new Set();
    for (const c of cons) { const n = nets[c.n]; if (n.used < n.flow) { n.used++; wet.add(c.k); } else dryC.add(c.k); }
    // o que sobra de água em cada trecho (para desenhar o rio mais grosso ou mais fino)
    const remain = new Map(); for (const [k] of river) { if (!dist.has(k)) { remain.set(k, 0); continue; } const n = nets[net.get(k)], d = dist.get(k);
      let u = 0; for (const c of cons) if (c.n === net.get(k) && wet.has(c.k) && c.d <= d) u++; remain.set(k, Math.max(0, n.flow - u)); }
    // campo verde: peça com campo encostada em rio com água
    const green = new Set(); for (const [k, t] of B) { if (!t.e.includes('G')) continue; const ok = rk => net.has(rk) && remain.get(rk) > 0; if (ok(k)) { green.add(k); continue; } for (let d = 0; d < 6; d++) if (ok(nbk(k, d))) { green.add(k); break; } }
    return { net, nets, dist, wet, dry: dryC, remain, green, cons }; }

  // ---------- regiões (lados iguais encostados): vilas e matas
  function regions(B, type) { const id = new Map(), out = []; for (const [k, t] of B) { if (!t.e.includes(type) || id.has(k)) continue; const g = new Set([k]), st = [k]; id.set(k, out.length);
      while (st.length) { const c = st.pop(), u = B.get(c); for (let d = 0; d < 6; d++) { if (u.e[d] !== type) continue; const n = nbk(c, d), v = B.get(n); if (!v || id.has(n) || v.e[opp(d)] !== type) continue; id.set(n, out.length); g.add(n); st.push(n); } } out.push(g); }
    return { id, out }; }
  const ringOf = (B, tiles) => { const r = new Set(); for (const k of tiles) for (let d = 0; d < 6; d++) { const n = nbk(k, d); if (B.has(n) && !tiles.has(n)) r.add(n); } return r; };
  function progress(B, W, vtiles, req, M = regions(B, 'B')) { const ring = ringOf(B, vtiles), around = new Set([...vtiles, ...ring]);
    if (req.t === 'agua') return [...vtiles].some(k => W.wet.has(k)) ? 1 : 0;
    if (req.t === 'lavoura') return [...around].filter(k => B.get(k).e.includes('C') && W.wet.has(k)).length;
    if (req.t === 'pasto') return [...around].filter(k => B.get(k).e.includes('G') && W.green.has(k)).length;
    if (req.t === 'crescer') return vtiles.size;
    if (req.t === 'mata') { let m = 0; for (const g of M.out) { let touch = false; for (const k of g) if (around.has(k)) { touch = true; break; } if (touch) m = Math.max(m, g.size); } return m; }
    return 0; }
  function newReq(v, vt, W, prevT) { const L = v.lvl, opts = [];
    if (![...vt].some(k => W.wet.has(k))) opts.push({ t: 'agua', n: 1, w: 4 });
    opts.push({ t: 'lavoura', n: Math.min(4, L + 1), w: 3 }, { t: 'mata', n: Math.min(6, L + 2), w: 2 }, { t: 'crescer', n: vt.size + 1 + (L > 2 ? 1 : 0), w: 2 }, { t: 'pasto', n: Math.min(3, 1 + (L >> 1)), w: 1.5 });
    const M = regions(board, 'B'), ok = opts.filter(o => o.t !== prevT && progress(board, W, vt, o, M) < o.n); const o = pickW(rng, (ok.length ? ok : opts).map(o => [o, o.w])); return { t: o.t, n: o.n }; }
  // vilas com nome fixo: a de peça mais antiga dá o nome quando duas se juntam (fica o nível maior)
  function syncVilas(W) { const R = regions(board, 'V'), seen = new Set();
    for (const g of R.out) { const keys = [...g].sort((a, b) => board.get(a).order - board.get(b).order), id = keys[0]; seen.add(id);
      if (!S.vilas.has(id)) { let lvl = 1, req = null; for (const k of keys.slice(1)) if (S.vilas.has(k)) { const o = S.vilas.get(k); if (o.lvl >= lvl) { lvl = o.lvl; req = o.req; } S.vilas.delete(k); }
        const v = { id, lvl, req, tiles: g }; if (!v.req) v.req = newReq(v, g, W); S.vilas.set(id, v); }
      else { const v = S.vilas.get(id); v.tiles = g; for (const k of keys.slice(1)) if (S.vilas.has(k) && k !== id) { const o = S.vilas.get(k); v.lvl = Math.max(v.lvl, o.lvl); S.vilas.delete(k); } } }
    for (const id of [...S.vilas.keys()]) if (!seen.has(id)) S.vilas.delete(id); }
  syncVilas(water());

  // ---------- prévia de uma jogada (sem mudar nada)
  function simulate(k, e) { const B2 = new Map(board), t = { q: KQ(k), r: KR(k), e: e.slice(), order: S.order };
    if (S.springs.has(k) && e.includes('A')) t.src = S.springs.get(k); B2.set(k, t);
    const W0 = water(), W1 = water(B2); let match = 0, nbs = 0; const marks = [];
    for (let d = 0; d < 6; d++) { const n = board.get(nbk(k, d)); if (!n) { marks.push(null); continue; } nbs++; const ok = n.e[opp(d)] === e[d]; marks.push(ok); if (ok) match++; }
    const perfect = nbs === 6 && match === 6;
    // o que muda para cada vila (pelas regiões novas)
    const R = regions(B2, 'V'), M = regions(B2, 'B'), vil = [];
    for (const v of S.vilas.values()) { const g = R.out[R.id.get(v.id)]; if (!g) continue; const before = progress(board, W0, v.tiles, v.req), after = progress(B2, W1, g, v.req, M); vil.push({ id: v.id, req: v.req, before, after, done: after >= v.req.n }); }
    const lost = [...W0.wet].filter(x => !W1.wet.has(x)), gained = [...W1.wet].filter(x => !W0.wet.has(x) && x !== k);
    return { k, e, legal: legal(board, k, e), marks, perfect, spring: t.src || 0, buried: S.springs.has(k) && !t.src ? S.springs.get(k) : 0, wetSelf: W1.wet.has(k), drySelf: W1.dry.has(k), lost, gained, vil, W: W1 }; }
  function options(k) { const base = hand().e, seen = new Set(), out = []; for (let r = 0; r < 6; r++) { const e = rot(base, r), sig = e.join(''); if (seen.has(sig) || !legal(board, k, e)) continue; seen.add(sig); out.push({ r, ...simulate(k, e) }); } return out; }

  // ---------- jogar
  function place(k, e) { if (S.over || S.escolha.length) return null; const pv = simulate(k, e); if (!pv.legal) return null; const ev = [];
    const t = { q: KQ(k), r: KR(k), e: e.slice(), order: S.order++ }; if (pv.spring) { t.src = pv.spring; ev.push({ t: 'nascente', txt: `Olho-d'água ligado: +${pv.spring} 💧`, k }); }
    if (pv.buried) ev.push({ t: 'soterrou', txt: 'O olho-d\'água ficou debaixo da terra', k });
    S.springs.delete(k); board.set(k, t); S.queue.shift(); S.left--;
    if (pv.perfect) { S.left++; ev.push({ t: 'perfeita', txt: 'Peça perfeita: +1 peça', k }); }
    let W = water(); syncVilas(W);
    // pedidos atendidos: a vila cresce, ganha gente e 1 peça, e abre a escolha de pacote
    for (const v of S.vilas.values()) { if (progress(board, W, v.tiles, v.req) < v.req.n) continue; v.lvl++; const g = 2 * v.lvl; S.gente += g; S.left += 2;
      ev.push({ t: 'pedido', txt: `Vila atendida (${PEDIDOS[v.req.t].txt(v.req.n)}): +${g} gente, +2 peças`, k: v.id, lvl: v.lvl });
      v.req = newReq(v, v.tiles, W, v.req.t); S.escolha.push(packs()); }
    // estações
    S.clock++; const len = isSeca() ? S.seca : S.aguas;
    if (S.clock >= len) { S.clock = 0; S.season++;
      if (isSeca()) { W = water(board, true); const lav = [...W.wet].filter(x => board.get(x).e.includes('C')).length, h = Math.floor(lav / 2); S.left += h;
        ev.push({ t: 'seca', txt: `Começa a seca: as nascentes dão menos. Colheita: ${lav} lavoura${lav === 1 ? '' : 's'} com água, +${h} peça${h === 1 ? '' : 's'}` }); }
      else { S.ano++; ev.push({ t: 'chuva', txt: 'As chuvas voltaram: as nascentes enchem de novo' }); } }
    spawnSprings();
    if (S.left <= 0 && !S.escolha.length) S.over = true;
    S.log.push({ k, e, ev }); return { ev, pv }; }
  // pacotes: dois temas diferentes, 3 peças cada; o escolhido entra na frente da pilha (depois da peça na mão)
  function packs() { const temas = ['roca', 'mata', 'rio', 'vila'], a = temas.splice(Math.floor(rng() * 4), 1)[0], b = temas[Math.floor(rng() * 3)];
    return [a, b].map(tm => ({ tema: tm, tiles: [0, 1, 2].map(() => genTile(rng, tm)) })); }
  function choose(i) { const ch = S.escolha.shift(); if (!ch) return; const p = ch[i]; ensure();   /* o pacote não aumenta a pilha: decide o que vem */ S.queue.splice(1, 0, ...p.tiles); if (S.left <= 0 && !S.escolha.length) S.over = true; }
  function skip() { if (S.over) return; S.queue.shift(); S.left--; S.clock++; if (S.left <= 0) S.over = true; }
  const fits = () => slots().some(k => options(k).length > 0);
  // o que a seca vai fazer com a água de hoje (para avisar antes)
  function secaPreview() { const W = water(board, true); return { nets: W.nets, dry: W.dry, wet: W.wet }; }

  return { S, board, hand, next, slots, options, simulate, place, choose, skip, fits, water: (dry) => water(board, dry), secaPreview, isSeca, regions: t => regions(board, t), progress: (v) => progress(board, water(), v.tiles, v.req), seasonLen: () => isSeca() ? S.seca : S.aguas };
}
