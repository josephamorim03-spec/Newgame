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
const PTS = [[SPRING[0], SPRING[1]], [A[0] - 2.5, A[1] - 0.5], [A[0] + 6, A[1] + 2.5], [A[0] + R * 0.866, A[1] - 0.5],
  [B[0] - 9, B[1] - 4], [B[0] - 1, B[1] + 1.5], [B[0] + 8, B[1] - 2.5], [B[0] + R * 0.866 + 2, B[1] - 1],
  // além do vale o córrego segue, fazendo curvas, até sumir na névoa
  [B[0] + 32, B[1] + 6], [B[0] + 50, B[1] + 2], [B[0] + 72, B[1] + 12], [B[0] + 100, B[1] + 6], [B[0] + 135, B[1] + 18], [B[0] + 180, B[1] + 10], [B[0] + 240, B[1] + 24], [B[0] + 330, B[1] + 14]];
const curve = new THREE.CatmullRomCurve3(PTS.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal');
export const RIVER = curve.getSpacedPoints(900).map(v => [v.x, v.z]);
const RLEN = curve.getLength();
export const WATER_Y = -0.62;
const W0 = 2.9;      // meia-largura da água (m): córrego de ~6 m
export const riverHalfWidth = s => W0 * (0.85 + 0.3 * vnoise(s * 0.08, 3.7)) * (s < 6 ? 0.6 + 0.4 * s / 6 : 1);
// distância à linha do rio, posição ao longo dele (m) e direção da correnteza
// trechos do rio por célula de 8 m (a busca olha só os trechos perto do ponto)
const CELL = 8, BUCK = new Map(), key = (i, j) => i * 100003 + j;
for (let i = 0; i + 1 < RIVER.length; i++) { const [ax, az] = RIVER[i], [bx, bz] = RIVER[i + 1];
  for (let ci = Math.floor((Math.min(ax, bx) - 16) / CELL); ci <= Math.floor((Math.max(ax, bx) + 16) / CELL); ci++)
    for (let cj = Math.floor((Math.min(az, bz) - 16) / CELL); cj <= Math.floor((Math.max(az, bz) + 16) / CELL); cj++) { const k = key(ci, cj); if (!BUCK.has(k)) BUCK.set(k, []); BUCK.get(k).push(i); } }
export function riverInfo(x, z) {
  let best = 1e9, bs = 0, tx = 1, tz = 0;
  const list = BUCK.get(key(Math.floor(x / CELL), Math.floor(z / CELL))); if (!list) return { d: 99, s: 0, tx: 1, tz: 0 };
  for (const i of list) { const [ax, az] = RIVER[i], [bx, bz] = RIVER[i + 1], vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l2)), dx = x - ax - vx * t, dz = z - az - vz * t, d = dx * dx + dz * dz;
    if (d < best) { best = d; bs = (i + t) / (RIVER.length - 1) * RLEN; const l = Math.sqrt(l2); tx = vx / l; tz = vz / l; } }
  return { d: Math.sqrt(best), s: bs, tx, tz };
}
// vereda: um poço raso em volta do olho-d'água, com buritis
export const POOL_R = 5.5;

// ---------- relevo (m). O vale é suave; o rio escava o canal e as margens descem até a água
export function heightAt(x, z) {
  let h = (fbm(x * 0.022, z * 0.022, 3) - 0.5) * 1.6 + (fbm(x * 0.12, z * 0.12, 2) - 0.5) * 0.22;
  const t = tileAt(x, z);
  if (t && t.kind === 'cerrado') h += 0.35 * smooth(0, 1, 1 - Math.hypot(x - t.c[0], z - t.c[1]) / R);   // o cerrado num pequeno alto
  const ri = riverInfo(x, z), w = riverHalfWidth(ri.s), dp = Math.hypot(x - SPRING[0], z - SPRING[1]);
  const bankW = 4.5, near = Math.min(ri.d - w, dp - POOL_R);
  if (near < bankW) { const k = smooth(bankW, 0, near); h = h * (1 - k) + (WATER_Y + 0.18) * k; }
  if (ri.d < w) { const u = ri.d / w; h = Math.min(h, WATER_Y - 0.15 - 0.95 * (1 - u * u)); }
  if (dp < POOL_R) { const u = dp / POOL_R; h = Math.min(h, WATER_Y - 0.1 - 0.7 * (1 - u * u)); }
  return h;
}
export function smooth(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
// distância normalizada à água (0 na beira, 1 a 6 m dela): margem úmida, capim, árvores
export function waterDist(x, z) { const ri = riverInfo(x, z), w = riverHalfWidth(ri.s), dp = Math.hypot(x - SPRING[0], z - SPRING[1]); return Math.min(ri.d - w, dp - POOL_R); }

// pesos de bioma (pasto, mata, cerrado, solo): Voronoi das peças com borda irregular (ruído), para a passagem
// de uma peça à outra ser um ecótono e não uma linha reta
const BIO = { rio: [1, 0, 0, 0], mata: [0.15, 0.85, 0, 0], pasto: [1, 0, 0, 0], cerrado: [0, 0, 1, 0] };
export function biomeAt(x, z) {
  const out = [0, 0, 0, 0]; let tot = 0;
  for (const t of TILES) { const d = Math.hypot(x - t.c[0], z - t.c[1]) + (fbm(x * 0.07 + t.q * 9, z * 0.07 + t.r * 5, 2) - 0.5) * 9;
    const w = Math.exp(-d * d / 60); tot += w; for (let i = 0; i < 4; i++) out[i] += w * BIO[t.kind][i]; }
  // longe das peças: campo de cerrado e pasto (sem isso o peso some e o chão distante fica preto)
  const bg = 2e-4, mix = fbm(x * 0.012 + 3, z * 0.012 - 7, 2); tot += bg; out[0] += bg * (1 - mix); out[2] += bg * mix;
  for (let i = 0; i < 4; i++) out[i] /= tot;
  // perto da água a mata ciliar avança sobre o pasto
  const wd = waterDist(x, z); if (wd < 7) { const k = smooth(7, 1, wd) * 0.45; out[1] = out[1] + (1 - out[1]) * k * (out[0] > 0.5 ? 0.6 : 1); out[0] *= 1 - k * 0.6; }
  return out;
}

// distância (m) de um ponto à borda do hexágono de centro c (positiva dentro)
export function hexEdgeDist(x, z, c) { const dx = Math.abs(x - c[0]), dz = Math.abs(z - c[1]); return R * 0.866 - Math.max(dx, dx * 0.5 + dz * 0.866); }
export const inAnyTile = (x, z, k = 1) => TILES.some(t => inHex(x, z, t.c, k));
