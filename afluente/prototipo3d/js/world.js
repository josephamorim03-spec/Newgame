// O mundo da prévia: 4 peças hexagonais em metros (raio do hexágono = 20 m, como a tabela métrica do jogo),
// o relevo, o rio que nasce numa vereda na peça A e atravessa a mata (B) até cair pela borda do vale.
import * as THREE from 'three';

export const R = 20, SQ3 = Math.sqrt(3);
export const hexCenter = (q, r) => [R * SQ3 * (q + r / 2), R * 1.5 * r];
export const TILES = [
  { q: 0, r: 0, kind: 'rio', name: 'Vereda e pasto' },
  { q: 1, r: 0, kind: 'mata', name: 'Mata de galeria' },
  { q: 0, r: 1, kind: 'pasto', name: 'Pasto' },
  { q: -1, r: 1, kind: 'cerrado', name: 'Cerrado' },
  { q: 1, r: 1, kind: 'vila', name: 'Vila' },
  { q: -1, r: 0, kind: 'lavoura', name: 'Lavoura' },
  { q: 2, r: 0, kind: 'cachoeira', name: 'Cachoeira' },
  { q: 1, r: -1, kind: 'lagoa', name: 'Lagoa' },
  { q: 0, r: -1, kind: 'roca', name: 'Trigo e roça' },
  { q: -2, r: 1, kind: 'cerradao', name: 'Cerradão' },
  { q: 0, r: 2, kind: 'praca', name: 'Praça' },
].map(t => ({ ...t, c: hexCenter(t.q, t.r) }));
export const CENTER = TILES.reduce((a, t) => [a[0] + t.c[0] / TILES.length, a[1] + t.c[1] / TILES.length], [0, 0]);

// hexágono pontudo em z (como no jogo): cantos a -30°, 30°, 90°...
export function hexCorners(c, rad = R) { const out = []; for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); out.push([c[0] + rad * Math.cos(a), c[1] + rad * Math.sin(a)]); } return out; }
export function inHex(x, z, c, k = 1) { const dx = Math.abs(x - c[0]), dz = Math.abs(z - c[1]); return dx <= R * 0.866 * k && dx * 0.5 + dz * 0.866 <= R * 0.866 * k; }
export function tileAt(x, z) { return TILES.find(t => inHex(x, z, t.c, 1.0001)) || null; }
// vizinhos: direção d (0 = leste, sentido horário na tela) → (q, r)
const ND = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
export function neighborOf(t, d) { const [dq, dr] = ND[d]; return TILES.find(u => u.q === t.q + dq && u.r === t.r + dr) || null; }

// ---------- ruído (CPU), o mesmo valor em qualquer peça (as bordas casam)
function hash(x, y) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263); h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; }
export function vnoise(x, y) { const i = Math.floor(x), j = Math.floor(y), f = x - i, g = y - j, u = f * f * (3 - 2 * f), v = g * g * (3 - 2 * g);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
export function fbm(x, y, o = 4) { let s = 0, a = 0.5; for (let i = 0; i < o; i++) { s += a * vnoise(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 9.2; a *= 0.5; } return s; }

// ---------- o rio: nasce numa vereda (olho-d'água) em A, passa para B e sai pela borda leste de B
const A = TILES[0].c, B = TILES[1].c;
export const SPRING = [A[0] - 8, A[1] + 3];
const CA = hexCenter(2, 0);
const PTS = [[SPRING[0], SPRING[1]], [A[0] - 2.5, A[1] - 0.5], [A[0] + 6, A[1] + 2.5], [A[0] + R * 0.866, A[1] - 0.5],
  [B[0] - 9, B[1] - 4], [B[0] - 1, B[1] + 1.5], [B[0] + 8, B[1] - 2.5], [B[0] + R * 0.866 + 2, B[1] - 1],
  // além do vale o córrego segue, fazendo curvas, até sumir na névoa
  [CA[0] - 6, CA[1] + 1.5], [CA[0] + 5, CA[1] - 1], [CA[0] + R * 0.866, CA[1]], [CA[0] + R * 0.866 + 0.4, CA[1]]];
const curve = new THREE.CatmullRomCurve3(PTS.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal');
export const RIVER = curve.getSpacedPoints(900).map(v => [v.x, v.z]);
const RLEN = curve.getLength();
export const WATER_Y = -0.62;
const W0 = 2.9;      // meia-largura da água (m): córrego de ~6 m
export const riverHalfWidth = s => s >= 1e4 ? XRIV[Math.floor((s - 1e4) / 1000)].w * (0.9 + 0.2 * vnoise(s * 0.3, 1.7)) : W0 * (0.85 + 0.3 * vnoise(s * 0.08, 3.7)) * (s < 6 ? 0.6 + 0.4 * s / 6 : 1);
// distância à linha do rio, posição ao longo dele (m) e direção da correnteza
// trechos do rio por célula de 8 m (a busca olha só os trechos perto do ponto)
const CELL = 8, BUCK = new Map(), key = (i, j) => i * 100003 + j;
for (let i = 0; i + 1 < RIVER.length; i++) { const [ax, az] = RIVER[i], [bx, bz] = RIVER[i + 1];
  for (let ci = Math.floor((Math.min(ax, bx) - 16) / CELL); ci <= Math.floor((Math.max(ax, bx) + 16) / CELL); ci++)
    for (let cj = Math.floor((Math.min(az, bz) - 16) / CELL); cj <= Math.floor((Math.max(az, bz) + 16) / CELL); cj++) { const k = key(ci, cj); if (!BUCK.has(k)) BUCK.set(k, []); BUCK.get(k).push(i); } }
// trechos de rio das peças que o jogador encaixa: cada um é uma polilinha com sua largura e nível (pode descer junto com a escarpa)
export const XRIV = [], XBUCK = new Map();
export function addRiver(pts, w = 2.6) { const id = XRIV.length; XRIV.push({ pts, w });
  for (let i = 0; i + 1 < pts.length; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    for (let ci = Math.floor((Math.min(ax, bx) - 16) / CELL); ci <= Math.floor((Math.max(ax, bx) + 16) / CELL); ci++)
      for (let cj = Math.floor((Math.min(az, bz) - 16) / CELL); cj <= Math.floor((Math.max(az, bz) + 16) / CELL); cj++) { const k = key(ci, cj); if (!XBUCK.has(k)) XBUCK.set(k, []); XBUCK.get(k).push([id, i]); } }
  return id; }
function xriverInfo(x, z) { const list = XBUCK.get(key(Math.floor(x / CELL), Math.floor(z / CELL))); if (!list) return null; let best = 1e9, out = null;
  for (const [id, i] of list) { const P = XRIV[id].pts, [ax, az] = P[i], [bx, bz] = P[i + 1], vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz || 1e-6;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l2)), dx = x - ax - vx * t, dz = z - az - vz * t, d = dx * dx + dz * dz;
    if (d < best) { best = d; const l = Math.sqrt(l2); out = { d: Math.sqrt(d), s: 1e4 + id * 1000 + i + t, tx: vx / l, tz: vz / l, w: XRIV[id].w, extra: true }; } }
  return out; }
export function riverInfo(x, z) { const a = riverInfo0(x, z), b = xriverInfo(x, z); return b && b.d < a.d ? b : a; }
function riverInfo0(x, z) {
  let best = 1e9, bs = 0, tx = 1, tz = 0;
  const list = BUCK.get(key(Math.floor(x / CELL), Math.floor(z / CELL))); if (!list) return { d: 99, s: 0, tx: 1, tz: 0 };
  for (const i of list) { const [ax, az] = RIVER[i], [bx, bz] = RIVER[i + 1], vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l2)), dx = x - ax - vx * t, dz = z - az - vz * t, d = dx * dx + dz * dz;
    if (d < best) { best = d; bs = (i + t) / (RIVER.length - 1) * RLEN; const l = Math.sqrt(l2); tx = vx / l; tz = vz / l; } }
  return { d: Math.sqrt(best), s: bs, tx, tz };
}
// vereda: um poço raso em volta do olho-d'água, com buritis
export const POOL_R = 5.5;
// a escarpa: na peça da cachoeira o chão cai DROP metros numa parede de pedra (que segue para norte e sul, fora das peças);
// o rio despenca ali e continua mais embaixo
const TC = TILES.find(t => t.kind === 'cachoeira');
export const CLIFF_X = TC.c[0] + 2.5, DROP = 6;
const cliffX = z => CLIFF_X + (vnoise(z * 0.12, 3.3) - 0.5) * 2.2;
export function cliffDrop(x, z) { return DROP * smooth(cliffX(z) - 0.5, cliffX(z) + 1.1, x); }
let S_FALL = 0; for (let i = 0; i < RIVER.length; i++) if (RIVER[i][0] > cliffX(RIVER[i][1])) { S_FALL = i / (RIVER.length - 1) * RLEN; break; }
export const FALL = (() => { const i = Math.round(S_FALL / RLEN * (RIVER.length - 1)); const t = [RIVER[i + 4][0] - RIVER[i][0], RIVER[i + 4][1] - RIVER[i][1]], l = Math.hypot(...t); return { s: S_FALL, p: RIVER[i], t: [t[0] / l, t[1] / l], pool: [RIVER[i][0] + t[0] / l * 2.8, RIVER[i][1] + t[1] / l * 2.8] }; })();
export const riverLevel = s => s >= 1e4 ? WATER_Y : WATER_Y - DROP * smooth(S_FALL - 0.3, S_FALL + 0.9, s);
const levelOf = (ri, x, z) => ri.extra ? WATER_Y - cliffDrop(x, z) : riverLevel(ri.s);
// a lagoa: bacia de borda irregular, com o mesmo nível d'água do vale de cima
const TLG = TILES.find(t => t.kind === 'lagoa');
export const LAKE = { c: [TLG.c[0] - 1, TLG.c[1] + 1], r: 10.5, level: WATER_Y };
export const lakeDist = (x, z) => Math.hypot(x - LAKE.c[0], z - LAKE.c[1]) - LAKE.r * (0.86 + 0.28 * vnoise(Math.atan2(z - LAKE.c[1], x - LAKE.c[0]) * 1.6 + 7, 2.1));
export function waterLevelAt(x, z) { if (lakeDist(x, z) < 6) return LAKE.level; return levelOf(riverInfo(x, z), x, z); }

// ---------- relevo (m). O vale é suave; o rio escava o canal e as margens descem até a água
export function heightAt(x, z) {
  let h = (fbm(x * 0.022, z * 0.022, 3) - 0.5) * 1.6 + (fbm(x * 0.12, z * 0.12, 2) - 0.5) * 0.22;
  const t = tileAt(x, z);
  if (t && t.kind === 'cerrado') h += 0.35 * smooth(0, 1, 1 - Math.hypot(x - t.c[0], z - t.c[1]) / R);   // o cerrado num pequeno alto
  if (t && t.kind === 'cerradao') h += 0.25 * smooth(0, 1, 1 - Math.hypot(x - t.c[0], z - t.c[1]) / R);
  h -= cliffDrop(x, z);
  const ri = riverInfo(x, z), w = riverHalfWidth(ri.s), dp = Math.hypot(x - SPRING[0], z - SPRING[1]), wl = levelOf(ri, x, z);
  const bankW = 4.5, near = Math.min(ri.d - w, dp - POOL_R);
  // perto do salto o rio corre num cânion de pedra (sem a margem baixa)
  const nearFall = ri.extra ? 0 : smooth(6, 2, Math.abs(ri.s - S_FALL));
  if (near < bankW) { const k = smooth(bankW, 0, near) * (1 - nearFall * 0.6); h = h * (1 - k) + (wl + 0.18) * k; }
  if (ri.d < w) { const u = ri.d / w; h = Math.min(h, wl - 0.15 - 0.95 * (1 - u * u)); }
  if (dp < POOL_R) { const u = dp / POOL_R; h = Math.min(h, WATER_Y - 0.1 - 0.7 * (1 - u * u)); }
  // poço embaixo da queda
  const fp = Math.hypot(x - FALL.pool[0], z - FALL.pool[1]); if (fp < 4.2) { const u = fp / 4.2; h = Math.min(h, WATER_Y - DROP - 0.2 - 1.3 * (1 - u * u)); }
  // lagoa
  const ld = lakeDist(x, z); if (ld < 4.5) { const k = smooth(4.5, 0, ld); h = h * (1 - k) + (LAKE.level + 0.16) * k; }
  if (ld < 0) { const u = Math.min(1, -ld / 7); h = Math.min(h, LAKE.level - 0.12 - 1.6 * Math.sqrt(u)); }
  return h;
}
export function smooth(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
// distância normalizada à água (0 na beira, 1 a 6 m dela): margem úmida, capim, árvores
export function waterDist(x, z) { const ri = riverInfo(x, z), w = riverHalfWidth(ri.s), dp = Math.hypot(x - SPRING[0], z - SPRING[1]), fp = Math.hypot(x - FALL.pool[0], z - FALL.pool[1]) - 3.6;
  return Math.min(ri.d - w, dp - POOL_R, lakeDist(x, z), fp); }

// pesos de bioma (pasto, mata, cerrado, solo): Voronoi das peças com borda irregular (ruído), para a passagem
// de uma peça à outra ser um ecótono e não uma linha reta
const BIO = { rio: [1, 0, 0, 0], mata: [0.15, 0.85, 0, 0], pasto: [1, 0, 0, 0], cerrado: [0, 0, 1, 0], vila: [1, 0, 0, 0], lavoura: [1, 0, 0, 0],
  cachoeira: [0.35, 0.45, 0.2, 0], lagoa: [1, 0, 0, 0], roca: [1, 0, 0, 0], cerradao: [0, 0.55, 0.45, 0], praca: [1, 0, 0, 0] };
export function biomeAt(x, z) {
  const out = [0, 0, 0, 0]; let tot = 0;
  for (const t of TILES) { const d = Math.hypot(x - t.c[0], z - t.c[1]) + (fbm(x * 0.07 + t.q * 9, z * 0.07 + t.r * 5, 2) - 0.5) * 9;
    const w = Math.exp(-d * d / 60); if (w < 1e-6) continue; tot += w; const bv = t.e ? sectorBio(t, x, z) : BIO[t.kind]; for (let i = 0; i < 4; i++) out[i] += w * bv[i]; }
  // longe das peças: campo de cerrado e pasto (sem isso o peso some e o chão distante fica preto)
  const bg = 2e-4, mix = fbm(x * 0.012 + 3, z * 0.012 - 7, 2); tot += bg; out[0] += bg * (1 - mix); out[2] += bg * mix;
  for (let i = 0; i < 4; i++) out[i] /= tot;
  // perto da água a mata ciliar avança sobre o pasto
  const wd = waterDist(x, z); if (wd < 7) { const k = smooth(7, 1, wd) * 0.45; out[1] = out[1] + (1 - out[1]) * k * (out[0] > 0.5 ? 0.6 : 1); out[0] *= 1 - k * 0.6; }
  return out;
}

// lajedos do cerrado: manchas de chão pedregoso onde o capim é ralo e crescem a canela-de-ema e as pedras
export function rockyAt(x, z) { const t = TILES.find(u => u.kind === 'cerrado'); if (!t || !inHex(x, z, t.c, 0.95)) return 0; return smooth(0.5, 0.62, fbm(x * 0.09 + 31, z * 0.09 - 17, 3)); }
// ---------- peças encaixadas pelo jogador: bordas no padrão do jogo 2D (A água, B mata, C lavoura, V vila, G campo),
// na ordem de direções [L, NE, NO, O, SO, SE] (0 = leste, girando para o norte, que no 3D é z negativo)
export const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
export const edgeAng = d => -d * Math.PI / 3;                                                 // ângulo do meio da borda d (atan2 em z, x)
export const edgeMid = (c, d, k = 0.866) => [c[0] + Math.cos(edgeAng(d)) * R * k, c[1] + Math.sin(edgeAng(d)) * R * k];
export function sectorOf(t, x, z) { let a = Math.atan2(z - t.c[1], x - t.c[0]); let d = Math.round(-a / (Math.PI / 3)); return ((d % 6) + 6) % 6; }
const LANDBIO = { B: [0.15, 0.85, 0, 0], C: [1, 0, 0, 0], V: [1, 0, 0, 0], G: null };
function landOf(t) { const c = {}; for (const e of t.e) if (e !== 'A') c[e] = (c[e] || 0) + 1; let best = 'G', n = -1; for (const k in c) if (c[k] > n) { n = c[k]; best = k; } return best; }
export function sectorType(t, x, z) { const d = sectorOf(t, x, z), e = t.e[d]; return e === 'A' ? landOf(t) : e; }
function sectorBio(t, x, z) { const e = sectorType(t, x, z); if (e === 'G') return t.cerrado ? [0, 0, 1, 0] : [1, 0, 0, 0]; return LANDBIO[e]; }
// fração de lavoura e de vila num ponto de peça encaixada (com uma margem macia entre setores e na borda)
export function sectorWeight(x, z, type) { for (const t of TILES) { if (!t.e || !inHex(x, z, t.c, 1.0001)) continue; if (sectorType(t, x, z) !== type) return 0;
    const a = Math.atan2(z - t.c[1], x - t.c[0]), d = sectorOf(t, x, z), da = Math.abs(Math.atan2(Math.sin(a - edgeAng(d)), Math.cos(a - edgeAng(d)))), rr = Math.hypot(x - t.c[0], z - t.c[1]);
    return smooth(0.3, 1.6, hexEdgeDist(x, z, t.c)) * smooth(Math.PI / 6, Math.PI / 6 - 0.12, da) * smooth(1.5, 3.5, rr); } return 0; }
// distância (m) de um ponto à borda do hexágono de centro c (positiva dentro)
export function hexEdgeDist(x, z, c) { const dx = Math.abs(x - c[0]), dz = Math.abs(z - c[1]); return R * 0.866 - Math.max(dx, dx * 0.5 + dz * 0.866); }
export const inAnyTile = (x, z, k = 1) => TILES.some(t => inHex(x, z, t.c, k));

// ---------- o que as pessoas construíram: a vila (casas, capela, poço, horta), o curral no pasto e a lavoura com o moinho.
// Medidas reais: casa de taipa ~7 x 5,5 m, parede 2,8 m; capela 5 x 8,5 m com torre de 9 m; moinho de 8 m com pás de 4,4 m.
const tileOf = k => TILES.find(t => t.kind === k), off = (t, dx, dz) => [t.c[0] + dx, t.c[1] + dz];
const tV = tileOf('vila'), tL = tileOf('lavoura'), tP = tileOf('pasto'), tRo = tileOf('roca'), tPr = tileOf('praca');
export const LAYOUT = {
  houses: [
    { p: off(tV, -6.5, -6), rot: 0.25, w: 7, d: 5.5, wall: 0xf2ece0, band: 0x3f78b0, trim: 0x2f6aa0, roof: 0xb4563a, porch: true },
    { p: off(tV, 6.5, -6.5), rot: -0.5, w: 6, d: 5, wall: 0xf0d9a8, band: 0x9a4a32, trim: 0x2f7a52, roof: 0xa94d34 },
    { p: off(tV, -3, 7.5), rot: 0.08 + Math.PI, w: 6.5, d: 5, wall: 0xf4efe6, band: 0x4f8a4a, trim: 0x7a4a2a, roof: 0xbd6440 },
  ],
  chapel: { p: off(tV, 8, 6.5), rot: -0.15 + Math.PI },
  well: { p: off(tV, 0.5, 0.5) },
  garden: { p: off(tV, -11.5, 3), rot: 0.25, w: 5, d: 4 },
  corral: { p: off(tP, 4, 6), rot: 0.35, w: 12, d: 8 },
  mill: { p: off(tL, 11, -9) },
  paiol: { p: off(tL, -8, 12.5), rot: 0.15, w: 4, d: 3 },
  bales: { p: off(tL, -4.3, 13.6), rot: 0.15 },
  scarecrow: { p: off(tL, -1.5, 1.0) },
  cart: { p: off(tL, -1.2, 16.0), rot: 1.2 },
  sheepPen: { p: off(tV, 10.5, -10.5), rot: -0.35, w: 6.5, d: 4.5 },
  celeiro: { p: off(tRo, 9.5, 8), rot: -0.5, w: 8, d: 6 },
  wheat: { tile: tRo, maxX: 0.5 }, roca: { tile: tRo, minX: 2.5 },
  coreto: { p: off(tPr, 0, 0) },
  oven: { p: off(tV, 1.5, -12.5), rot: 0.2 },
  cavalete: { p: off(tPr, 5.5, 9), rot: -0.3 },
  venda: { p: off(tPr, -9, -7), rot: 0.5, w: 7.5, d: 6 },
  sobrado: { p: off(tPr, 9, -6.5), rot: -0.5, w: 7, d: 6 },
  praca: { c: off(tPr, 0, 0), r: 8.5 },
  field: { tile: tL, rowGap: 0.9, cornMaxX: 5.2, sunMinX: 7.6, sunMaxX: 12.5 },
};
export const PATHS = [[off(tV, -6.5, -6), off(tV, 0.5, 0.5)], [off(tV, 6.5, -6.5), off(tV, 0.5, 0.5)], [off(tV, -3, 7.5), off(tV, 0.5, 0.5)], [off(tV, 8, 6.5), off(tV, 0.5, 0.5)],
  [off(tV, 0.5, 0.5), off(tV, -17, 2)], [off(tL, 6.4, -19), off(tL, 6.4, 19)],
  [off(tPr, 0, 0), off(tPr, 0, -19)], [off(tPr, 0, 0), off(tPr, -9, -7)], [off(tPr, 0, 0), off(tPr, 9, -6.5)], [off(tRo, 9.5, 8), off(tRo, 1.5, 19)]];
function segDist(x, z, a, b) { const vx = b[0] - a[0], vz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz))); return Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t); }
// chão de terra batida: em volta das casas, da capela e do poço, e nos caminhos (gasto no meio, com capim nas bordas)
export function dirtAt(x, z) {
  let k = 0; const L = LAYOUT;
  for (const h of L.houses) k = Math.max(k, smooth(Math.max(h.w, h.d) * 0.5 + 2.6, Math.max(h.w, h.d) * 0.5 + 0.6, Math.hypot(x - h.p[0], z - h.p[1])));
  k = Math.max(k, smooth(8, 4, Math.hypot(x - L.chapel.p[0], z - L.chapel.p[1])), smooth(3.4, 1.6, Math.hypot(x - L.well.p[0], z - L.well.p[1])));
  for (const [a, b] of PATHS) k = Math.max(k, smooth(1.1, 0.35, segDist(x, z, a, b) + (vnoise(x * 0.8, z * 0.8) - 0.5) * 0.4));
  k = Math.max(k, smooth(2.6, 1.0, Math.hypot(x - L.mill.p[0], z - L.mill.p[1])), smooth(L.praca.r + 1.5, L.praca.r - 1, Math.hypot(x - L.praca.c[0], z - L.praca.c[1])));
  for (const b of [L.venda, L.sobrado, L.celeiro]) k = Math.max(k, smooth(Math.max(b.w, b.d) * 0.5 + 2.4, Math.max(b.w, b.d) * 0.5 + 0.5, Math.hypot(x - b.p[0], z - b.p[1])));
  return k;
}
// peso da lavoura (1 dentro da peça, caindo a zero na borda) e o lugar das fileiras
export function fieldAt(x, z) { let k = 0; for (const t of [LAYOUT.field.tile, LAYOUT.wheat.tile]) k = Math.max(k, smooth(0.3, 1.6, hexEdgeDist(x, z, t.c))); return Math.max(k, sectorWeight(x, z, 'C') * (waterDist(x, z) > 1.5 ? 1 : 0)); }
export function inBoxAt(x, z, o, w, d, rot) { const dx = x - o[0], dz = z - o[1], c = Math.cos(rot), s = Math.sin(rot), u = dx * c - dz * s, v = dx * s + dz * c; return Math.abs(u) < w / 2 && Math.abs(v) < d / 2; }
// lugares onde nada cresce nem se planta por cima (casas, capela, curral, horta, moinho)
export function blocked(x, z, pad = 0) {
  const L = LAYOUT, inBox = (o, w, d, rot) => { const dx = x - o[0], dz = z - o[1], c = Math.cos(rot), s = Math.sin(rot), u = dx * c - dz * s, v = dx * s + dz * c; return Math.abs(u) < w / 2 + pad && Math.abs(v) < d / 2 + pad; };
  return L.houses.some(h => inBox(h.p, h.w + 3, h.d + 3, h.rot)) || inBox(L.chapel.p, 8, 12, L.chapel.rot) || Math.hypot(x - L.well.p[0], z - L.well.p[1]) < 2.2 + pad
    || inBox(L.garden.p, L.garden.w + 1, L.garden.d + 1, L.garden.rot) || inBox(L.paiol.p, L.paiol.w + 2.5, L.paiol.d + 2.5, L.paiol.rot) || inBox(L.bales.p, 3.4, 2.4, L.bales.rot)
    || Math.hypot(x - L.scarecrow.p[0], z - L.scarecrow.p[1]) < 1.0 + pad || inBox(L.cart.p, 5, 2.6, L.cart.rot) || inBox(L.sheepPen.p, L.sheepPen.w + 1, L.sheepPen.d + 1, L.sheepPen.rot) || inBox(L.celeiro.p, L.celeiro.w + 3, L.celeiro.d + 3, L.celeiro.rot)
    || inBox(L.venda.p, L.venda.w + 3, L.venda.d + 3, L.venda.rot) || inBox(L.sobrado.p, L.sobrado.w + 3, L.sobrado.d + 3, L.sobrado.rot) || Math.hypot(x - L.coreto.p[0], z - L.coreto.p[1]) < 4.2 + pad || Math.hypot(x - L.oven.p[0], z - L.oven.p[1]) < 2.6 + pad || Math.hypot(x - L.cavalete.p[0], z - L.cavalete.p[1]) < 2.2 + pad || inBox(L.corral.p, L.corral.w + 1, L.corral.d + 1, L.corral.rot) || Math.hypot(x - L.mill.p[0], z - L.mill.p[1]) < 3.5 + pad;
}
