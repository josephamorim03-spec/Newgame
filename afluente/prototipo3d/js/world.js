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
// a escarpa: na cachoeira o chão cai DROP metros num paredão de pedra; longe dela o degrau vira encosta (cada vez mais
// larga e suave, com o contorno irregular e ressaltos de pedra no meio), em vez de uma parede reta cortando o mapa todo
const TC = TILES.find(t => t.kind === 'cachoeira');
export const CLIFF_X = TC.c[0] + 2.5, DROP = 6;
const cliffX0 = z => CLIFF_X + (vnoise(z * 0.12, 3.3) - 0.5) * 2.2;
let Z_FALL0 = TC.c[1]; for (let i = 0; i < RIVER.length; i++) if (RIVER[i][0] > cliffX0(RIVER[i][1])) { Z_FALL0 = RIVER[i][1]; break; }
// a borda do paredão: perto da queda, contrafortes e reentrâncias de rocha (blocos que caíram e os que ficaram), e na própria
// queda um recuo em anfiteatro, que a água escavou para trás com o tempo (antes a borda era quase uma linha reta)
const cliffX = z => { const dz = z - Z_FALL0, nr = smooth(16, 4, Math.abs(dz));
  return cliffX0(z) + (vnoise(z * 0.45, 8.7) - 0.5) * 1.1 * nr + (vnoise(z * 1.3, 2.9) - 0.5) * 0.35 * nr - 1.4 * Math.exp(-dz * dz / 12); };
let Z_FALL = TC.c[1]; for (let i = 0; i < RIVER.length; i++) if (RIVER[i][0] > cliffX(RIVER[i][1])) { Z_FALL = RIVER[i][1]; break; }
// largura da descida: 1,6 m no paredão da cachoeira (6 m para cada lado), abrindo até ~20 m de encosta longe dela
// (o paredão vai virando encosta aos poucos; antes a largura começava a crescer de uma vez a 6 m da queda)
const cliffW = z => { const dz = Math.abs(z - Z_FALL); return 1.6 + 18 * smooth(4, 34, dz) * (0.8 + 0.4 * vnoise(z * 0.05, 5.7)); };
function cliffBase(x, z) { const w = cliffW(z), x0 = cliffX(z) - 0.5 + (vnoise(z * 0.06, 9.1) - 0.5) * w * 0.5;
  const u = Math.max(0, Math.min(1, (x - x0) / (w + 0.0001))); if (u <= 0) return 0;
  // perfil: ombro arredondado em cima, pé que espalha embaixo, e um ressalto de pedra no meio da encosta (onde é larga)
  const ledge = w > 5 ? 0.08 * Math.sin(u * Math.PI * 2) * vnoise(z * 0.11, 2.3) : 0, b = u >= 1 ? DROP : DROP * Math.max(0, Math.min(1, u * u * (3 - 2 * u) + ledge));
  // no pé do paredão alto, o talude de detritos: o chão sobe um pouco junto da rocha e vai baixando para longe (sem a quina
  // seca de parede reta encontrando chão plano)
  const x1 = x0 + w, ap = w < 7 ? 0.8 * (0.5 + 0.9 * vnoise(z * 0.35, 4.4)) * smooth(7, 2.5, w) * smooth(x1 - Math.min(1.2, w * 0.6), x1, x) * Math.exp(-Math.max(0, x - x1) / 1.7) : 0;
  return b - ap; }
// perto da queda o paredão é arenito em camadas: a descida vira três degraus de ~2 m com borda viva (cada laje com seu
// recuo); longe dela fica a encosta suave. A água (os níveis do rio) usa o perfil liso; só o chão tem os degraus.
export function cliffDrop(x, z) { const b = cliffBase(x, z), near = smooth(14, 6, Math.abs(z - Z_FALL)); if (near <= 0 || b <= 0 || b >= DROP) return b;
  const f = b / DROP, t = f * 3, k = Math.floor(Math.min(t, 2.999)), lip = (vnoise(z * 0.9 + k * 3.1, 11.3 + k) - 0.5) * 0.18, ft = (k + smooth(0.28 + lip, 0.62 + lip, t - k)) / 3;
  return DROP * (f + (ft - f) * 0.8 * near); }
const cliffDropW = cliffBase;
// o quanto a escarpa inclina ali (m por m): casa, roça e árvore não nascem no barranco íngreme
export const cliffSlope = (x, z) => Math.abs(cliffDrop(x + 0.6, z) - cliffDrop(x - 0.6, z)) / 1.2;
let S_FALL = 0; for (let i = 0; i < RIVER.length; i++) if (RIVER[i][0] > cliffX(RIVER[i][1])) { S_FALL = i / (RIVER.length - 1) * RLEN; break; }
export const FALL = (() => { const i = Math.round(S_FALL / RLEN * (RIVER.length - 1)); const t = [RIVER[i + 4][0] - RIVER[i][0], RIVER[i + 4][1] - RIVER[i][1]], l = Math.hypot(...t); return { s: S_FALL, p: RIVER[i], t: [t[0] / l, t[1] / l], pool: [RIVER[i][0] + t[0] / l * 2.8, RIVER[i][1] + t[1] / l * 2.8] }; })();
// o entalhe na borda, ao lado da queda: o rio transborda por ele e desce num fio pela rocha (main.js desenha o fio). O fundo
// fica abaixo do nível do rio, então a água entra no entalhe de verdade em vez de "nascer" no alto da laje
export const SPILL = (() => { const t = FALL.t, nd = [-t[1], t[0]], w = riverHalfWidth(FALL.s) * 0.95, lip = [FALL.p[0] - t[0] * 0.6, FALL.p[1] - t[1] * 0.6], off = w + 0.9;
  return { off, a: [lip[0] + nd[0] * w * 0.7 - t[0] * 0.5, lip[1] + nd[1] * w * 0.7 - t[1] * 0.5], b: [lip[0] + nd[0] * off + t[0] * 0.25, lip[1] + nd[1] * off + t[1] * 0.25], r: 0.42 }; })();
// antes da queda o leito inclina (~30 cm nos últimos 10 m): a água acelera e vira corredeira até a borda
export const RAPIDS = 0.3;
export const riverLevel = s => s >= 1e4 ? WATER_Y : WATER_Y - RAPIDS * smooth(S_FALL - 10, S_FALL - 0.3, s) - (DROP - RAPIDS) * smooth(S_FALL - 0.3, S_FALL + 0.9, s);
const levelOf = (ri, x, z) => ri.extra ? WATER_Y - cliffDropW(x, z) : riverLevel(ri.s);
// a lagoa: bacia de borda irregular, com o mesmo nível d'água do vale de cima
const TLG = TILES.find(t => t.kind === 'lagoa');
export const LAKE = { c: [TLG.c[0] - 1, TLG.c[1] + 1], r: 10.5, level: WATER_Y };
// o contorno varia com o ângulo; perto de 180° o ruído do fim da volta se mistura com o do começo (sem isso a margem oeste
// tinha um degrau de ~40 cm onde o atan2 salta de +180° para -180°)
const lakeN = a => { const g = v => vnoise(v * 1.6 + 7, 2.1), k = smooth(Math.PI - 0.6, Math.PI, a); return g(a) * (1 - k) + g(a - 2 * Math.PI) * k; };
export const lakeDist = (x, z) => Math.hypot(x - LAKE.c[0], z - LAKE.c[1]) - LAKE.r * (0.86 + 0.28 * lakeN(Math.atan2(z - LAKE.c[1], x - LAKE.c[0])));
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
  // entalhe do transbordo, ao lado da queda (fundo um pouco abaixo da água do rio ali)
  { const sd = segDist(x, z, SPILL.a, SPILL.b); if (sd < SPILL.r) { const u = sd / SPILL.r, wl2 = riverLevel(FALL.s - 1.2); h = Math.min(h, wl2 - 0.08 - 0.14 * (1 - u * u)); } }
  // poço embaixo da queda
  // (só rio abaixo da borda: o círculo de 4,2 m escavava também por baixo da laje e a água de cima ficava suspensa sobre o buraco)
  const fp = Math.hypot(x - FALL.pool[0], z - FALL.pool[1]); if (fp < 4.2 && (x - FALL.p[0]) * FALL.t[0] + (z - FALL.p[1]) * FALL.t[1] > -0.35) { const u = fp / 4.2; h = Math.min(h, WATER_Y - DROP - 0.2 - 1.3 * (1 - u * u)); }
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
  garden: { p: off(tV, -11.5, 3), rot: 0.25, w: 5, d: 4, gate: { side: 0, t: 0.5, w: 1.0 } },
  // cercados: a porteira fica no lado virado para a vila (side = lado do retângulo, t = onde no lado, w = vão);
  // no curral, o cocho fica no fundo, longe da porteira, e o rancho da ração do lado de fora, perto dela (coordenadas locais)
  corral: { p: off(tP, 4, 6), rot: 0.35, w: 12, d: 8, gate: { side: 1, t: 0.5, w: 2.6 }, cocho: [-3.4, -2.6], rancho: [8.7, -3.4] },
  mill: { p: off(tL, 11, -9) },
  paiol: { p: off(tL, -8, 12.5), rot: 0.15, w: 4, d: 3 },
  bales: { p: off(tL, -4.3, 13.6), rot: 0.15 },
  scarecrow: { p: off(tL, -1.5, 1.0) },
  cart: { p: off(tL, -1.2, 16.0), rot: 1.2 },
  sheepPen: { p: off(tV, 10.5, -10.5), rot: -0.35, w: 6.5, d: 4.5, gate: { side: 3, t: 0.5, w: 1.3 } },   // o lado de trás encosta na casa; a porteira dá para o terreiro
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
// os trechos de caminho (pares de pontos): a rede de baixo enche esta lista; quem empurrar trecho depois (tabuleiro antigo) é desenhado à parte
export const PATHS = []; let PATHS_BASE = 0;
// ---------- os lugares das cenas do dia a dia (ficam livres de árvore e de capim alto)
const rot2w = (p, rot, lx, lz) => [p[0] + lx * Math.cos(rot) + lz * Math.sin(rot), p[1] - lx * Math.sin(rot) + lz * Math.cos(rot)];
// beira do córrego da lavadeira (pedra de lavar) e o varal, uns passos para dentro da terra, ao longo do rio
LAYOUT.lav = (() => { const tA = TILES[0]; for (let i = 20; i < 200; i += 3) { const [rx, rz] = RIVER[i]; for (const o of [3.2, -3.2, 3.8, -3.8]) { const x = rx, z = rz + o, w = waterDist(x, z); if (w > 0.4 && w < 1.2 && inHex(x, z, tA.c, 0.85)) return [x, z]; } } return null; })();
if (LAYOUT.lav) { const [x, z] = LAYOUT.lav, e = 0.6, gx = waterDist(x + e, z) - waterDist(x - e, z), gz = waterDist(x, z + e) - waterDist(x, z - e), n = Math.hypot(gx, gz) || 1, ax = gx / n, az = gz / n;
  LAYOUT.varal = { c: [x + ax * 3.4, z + az * 3.4], dir: [-az, ax], len: 3.4 }; }
LAYOUT.cruzeiro = { p: rot2w(LAYOUT.chapel.p, LAYOUT.chapel.rot, 6.6, 1.0) };                    // cruz de madeira em frente à capela (o braço da cruz batia no beiral da casa ao lado)
LAYOUT.chapelDoor = rot2w(LAYOUT.chapel.p, LAYOUT.chapel.rot, 4.25 + 0.9, 0);
LAYOUT.licao = { p: off(tV, -9, 9), rot: Math.PI / 2 };                                          // a mãe ensina as crianças à sombra
LAYOUT.toco = { p: off(tV, -6.2, 13), rot: 0.4 };                                                // o pai racha lenha no toco
LAYOUT.lenha = { p: off(tV, -4.4, 13.8), rot: 0.4 };                                             // a pilha de lenha que o lenhador traz da mata
// ponto do mundo a partir das coordenadas locais de um cercado (mesma convenção dos objetos girados)
export const localTo = (o, lx, lz) => [o.p[0] + lx * Math.cos(o.rot) + lz * Math.sin(o.rot), o.p[1] - lx * Math.sin(o.rot) + lz * Math.cos(o.rot)];
LAYOUT.corral.ranchoP = localTo(LAYOUT.corral, ...LAYOUT.corral.rancho);
LAYOUT.corral.cochoP = localTo(LAYOUT.corral, ...LAYOUT.corral.cocho);
LAYOUT.corral.feed = { level: 0.55 };   // ração no cocho, 0 a 1: as vacas comem, o vaqueiro enche
LAYOUT.spots = [[LAYOUT.corral.ranchoP, 1.9], [LAYOUT.cruzeiro.p, 1.6], [LAYOUT.licao.p, 3.2], [LAYOUT.toco.p, 2.2], [LAYOUT.lenha.p, 1.6], ...(LAYOUT.varal ? [[LAYOUT.varal.c, 2.4]] : []), ...(LAYOUT.lav ? [[LAYOUT.lav, 1.4]] : [])];
function segDist(x, z, a, b) { const vx = b[0] - a[0], vz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz))); return Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t); }
// chão de terra batida: em volta das casas, da capela e do poço, e nos caminhos (gasto no meio, com capim nas bordas)
export function dirtAt(x, z) {
  let k = 0; const L = LAYOUT;
  for (const h of L.houses) k = Math.max(k, smooth(Math.max(h.w, h.d) * 0.5 + 2.6, Math.max(h.w, h.d) * 0.5 + 0.6, Math.hypot(x - h.p[0], z - h.p[1])));
  k = Math.max(k, smooth(8, 4, Math.hypot(x - L.chapel.p[0], z - L.chapel.p[1])), smooth(3.4, 1.6, Math.hypot(x - L.well.p[0], z - L.well.p[1])));
  for (const [p, r] of [[L.licao.p, 2.8], [L.toco.p, 2.4], [L.lenha.p, 1.6], [L.cruzeiro.p, 1.8]]) k = Math.max(k, smooth(r + 1.2, r - 0.6, Math.hypot(x - p[0], z - p[1]) + (vnoise(x * 0.9, z * 0.9) - 0.5) * 0.6));
  k = Math.max(k, pathAt(x, z));
  for (let i = PATHS_BASE; i < PATHS.length; i++) { const [a, b] = PATHS[i]; k = Math.max(k, smooth(1.1, 0.35, segDist(x, z, a, b) + (vnoise(x * 0.8, z * 0.8) - 0.5) * 0.4)); }
  k = Math.max(k, smooth(2.6, 1.0, Math.hypot(x - L.mill.p[0], z - L.mill.p[1])), smooth(L.praca.r + 1.5, L.praca.r - 1, Math.hypot(x - L.praca.c[0], z - L.praca.c[1])));
  for (const b of [L.venda, L.sobrado, L.celeiro]) k = Math.max(k, smooth(Math.max(b.w, b.d) * 0.5 + 2.4, Math.max(b.w, b.d) * 0.5 + 0.5, Math.hypot(x - b.p[0], z - b.p[1])));
  // curral e aprisco: terra pisada pelo gado e pelas ovelhas, com a borda irregular passando um pouco da cerca
  for (const b of [L.corral, L.sheepPen, L.garden]) { /* a horta: os corredores entre os canteiros são de terra batida */ const dx = x - b.p[0], dz = z - b.p[1], c = Math.cos(b.rot), s = Math.sin(b.rot), u = Math.abs(dx * c - dz * s) - b.w / 2, v = Math.abs(dx * s + dz * c) - b.d / 2;
    const sd = Math.hypot(Math.max(u, 0), Math.max(v, 0)) + Math.min(Math.max(u, v), 0); k = Math.max(k, smooth(0.9, -1.2, sd + (vnoise(x * 0.7, z * 0.7) - 0.5) * 1.2) * 0.85); }
  return k;
}
// peso da lavoura (1 dentro da peça, caindo a zero na borda) e o lugar das fileiras
export function fieldAt(x, z) { let k = 0; for (const t of [LAYOUT.field.tile, LAYOUT.wheat.tile]) k = Math.max(k, smooth(0.3, 1.6, hexEdgeDist(x, z, t.c))); return Math.max(k, sectorWeight(x, z, 'C') * (waterDist(x, z) > 1.5 ? 1 : 0)); }
export function inBoxAt(x, z, o, w, d, rot) { const dx = x - o[0], dz = z - o[1], c = Math.cos(rot), s = Math.sin(rot), u = dx * c - dz * s, v = dx * s + dz * c; return Math.abs(u) < w / 2 && Math.abs(v) < d / 2; }
// lugares onde nada cresce nem se planta por cima (casas, capela, curral, horta, moinho)
export function blocked(x, z, pad = 0) {
  if (cliffSlope(x, z) > 0.7) return true;
  const L = LAYOUT, inBox = (o, w, d, rot) => { const dx = x - o[0], dz = z - o[1], c = Math.cos(rot), s = Math.sin(rot), u = dx * c - dz * s, v = dx * s + dz * c; return Math.abs(u) < w / 2 + pad && Math.abs(v) < d / 2 + pad; };
  return L.houses.some(h => inBox(h.p, h.w + 3, h.d + 3, h.rot)) || inBox(L.chapel.p, 8, 12, L.chapel.rot) || Math.hypot(x - L.well.p[0], z - L.well.p[1]) < 2.2 + pad
    || inBox(L.garden.p, L.garden.w + 1, L.garden.d + 1, L.garden.rot) || inBox(L.paiol.p, L.paiol.w + 2.5, L.paiol.d + 2.5, L.paiol.rot) || inBox(L.bales.p, 3.4, 2.4, L.bales.rot)
    || Math.hypot(x - L.scarecrow.p[0], z - L.scarecrow.p[1]) < 1.0 + pad || inBox(L.cart.p, 5, 2.6, L.cart.rot) || inBox(L.sheepPen.p, L.sheepPen.w + 1, L.sheepPen.d + 1, L.sheepPen.rot) || inBox(L.celeiro.p, L.celeiro.w + 3, L.celeiro.d + 3, L.celeiro.rot)
    || L.spots.some(([p, r]) => Math.hypot(x - p[0], z - p[1]) < r + pad)
    || inBox(L.venda.p, L.venda.w + 3, L.venda.d + 3, L.venda.rot) || inBox(L.sobrado.p, L.sobrado.w + 3, L.sobrado.d + 3, L.sobrado.rot) || Math.hypot(x - L.coreto.p[0], z - L.coreto.p[1]) < 4.2 + pad || Math.hypot(x - L.oven.p[0], z - L.oven.p[1]) < 2.6 + pad || Math.hypot(x - L.cavalete.p[0], z - L.cavalete.p[1]) < 2.2 + pad || inBox(L.corral.p, L.corral.w + 1, L.corral.d + 1, L.corral.rot) || Math.hypot(x - L.mill.p[0], z - L.mill.p[1]) < 3.5 + pad;
}

// ---------- caminhos de terra pisada: uma rede que nasce de quem anda, não traçada à mão. Cada lugar que a gente usa tem a
// sua entrada (a porta da casa, a porteira do curral, o portão da horta, a boca do forno, a pedra da lavadeira) e um peso
// (quanta gente passa ali por dia). A rede começa no poço e na praça, ligados pela estrada; depois, do mais usado para o menos
// usado, cada entrada procura o caminho mais barato até a rede que já existe: contorna casas, cercas e o paredão, foge de
// barranco e de roça, só cruza água num vau quando não tem outro jeito, e andar por trilha que já existe sai bem mais barato
// — por isso as trilhas se juntam em troncos, como trilho de verdade. A largura e o quanto a terra está gasta vêm do
// movimento que passa por cada trecho (a soma dos pesos de quem vem dali para o centro): estrada larga e lisa perto da praça,
// carreiro estreito com capim no meio até o varal.
const PG = { S: 1, N: 560 }; PG.x0 = Math.floor(CENTER[0] - PG.N / 2); PG.z0 = Math.floor(CENTER[1] - PG.N / 2);
const PNN = PG.N * PG.N, PCOST = new Float32Array(PNN).fill(NaN), PNET = new Uint8Array(PNN), PPAR = new Int32Array(PNN).fill(-1), PTRAF = new Float32Array(PNN);
const PDIST = new Float64Array(PNN), PSEEN = new Uint32Array(PNN), PFROM = new Int32Array(PNN); let pGen = 0, pTiles = TILES.length;
const PEXTRA = [];   // obstáculos que chegam depois (as casas novas da vila que cresce)
const pCell = (x, z) => { const i = Math.floor((x - PG.x0) / PG.S), j = Math.floor((z - PG.z0) / PG.S); return i < 0 || j < 0 || i >= PG.N || j >= PG.N ? -1 : j * PG.N + i; };
const pX = i => PG.x0 + (i % PG.N + 0.5) * PG.S, pZ = i => PG.z0 + (Math.floor(i / PG.N) + 0.5) * PG.S;
function pathBlock(x, z) { const L = LAYOUT, bx = (o, w, d, rot, pad) => inBoxAt(x, z, o, w + pad * 2, d + pad * 2, rot), ci = (p, r) => Math.hypot(x - p[0], z - p[1]) < r;
  if (cliffSlope(x, z) > 0.6 || lakeDist(x, z) < 0.3) return true;
  for (const h of L.houses) if (bx(h.p, h.w, h.d, h.rot, 0.35)) return true;
  for (const [o, w, d, pad] of [[L.chapel, 8.5, 5.4, 0.5], [L.garden, L.garden.w, L.garden.d, 0.3], [L.corral, L.corral.w, L.corral.d, 0.3], [L.sheepPen, L.sheepPen.w, L.sheepPen.d, 0.3], [L.paiol, L.paiol.w, L.paiol.d, 0.5],
    [L.celeiro, L.celeiro.w, L.celeiro.d, 0.4], [L.venda, L.venda.w, L.venda.d, 0.4], [L.sobrado, L.sobrado.w, L.sobrado.d, 0.4], [L.bales, 2.6, 1.6, 0.2], [L.cart, 4.4, 2.0, 0.2]]) if (bx(o.p, w, d, o.rot, pad)) return true;
  if (ci(L.well.p, 1.15) || ci(L.coreto.p, 3.3) || ci(L.oven.p, 1.3) || ci(L.cavalete.p, 1.0) || ci(L.mill.p, 2.2) || ci(L.scarecrow.p, 0.6) || ci(L.toco.p, 0.5) || ci(L.lenha.p, 0.9) || ci(L.cruzeiro.p, 0.9)) return true;
  for (const b of PEXTRA) if (bx(b.p, b.w, b.d, b.rot, 0.35)) return true;
  return false; }
const PHGT = new Float32Array(PNN).fill(NaN), pH = i => { let h = PHGT[i]; if (h !== h) h = PHGT[i] = heightAt(pX(i), pZ(i)); return h; };
function pCost(i) { let c = PCOST[i]; if (c === c) return c; const x = pX(i), z = pZ(i);
  if (!inAnyTile(x, z, 1.002) || pathBlock(x, z)) c = Infinity;   /* a peça inteira: com folga menor ficava uma faixa sem passagem na divisa e cada peça virava ilha */
  else { const N = PG.N, sl = Math.hypot(pH(i + 1) - pH(i - 1), pH(i + N) - pH(i - N)) / (2 * PG.S), wd = waterDist(x, z);   // inclinação pelas alturas das vizinhas (cada altura uma vez só)
    c = 1 + 6 * sl * sl + (sl > 0.5 ? 20 : 0) + (wd < 0.4 ? 45 : wd < 1.4 ? 1.5 : 0) + 7 * fieldAt(x, z) + 0.18 * vnoise(x * 0.12, z * 0.12); }   // barranco, vau, roça; e as pequenas preferências do chão (a trilha não sai reta)
  PCOST[i] = c; return c; }
// Dijkstra da entrada até qualquer célula da rede (com o atalho de andar pela trilha já feita); "zona": raio em volta da ponta
// onde se pode sair de dentro de um obstáculo (o poço, o coreto, a pedra da lavadeira na beira d'água)
const PH = { k: [], d: [] }, hPush = (k, d) => { const K = PH.k, D = PH.d; let i = K.length; K.push(k); D.push(d); while (i > 0) { const p = (i - 1) >> 1; if (D[p] <= d) break; K[i] = K[p]; D[i] = D[p]; i = p; } K[i] = k; D[i] = d; };
const hPop = () => { const K = PH.k, D = PH.d, k0 = K[0], d0 = D[0], k = K.pop(), d = D.pop(), n = K.length; if (n) { let i = 0; for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && D[c + 1] < D[c]) c++; if (D[c] >= d) break; K[i] = K[c]; D[i] = D[c]; i = c; } K[i] = k; D[i] = d; } PH.out = d0; return k0; };
function pRoute(x, z, zone) { const si = pCell(x, z); if (si < 0) return null; if (PNET[si]) return [si];
  pGen++; PH.k.length = PH.d.length = 0; PDIST[si] = 0; PSEEN[si] = pGen; PFROM[si] = -1; hPush(si, 0); let goal = -1, n = 0; const N = PG.N, z2 = zone * zone;
  while (PH.k.length) { const i = hPop(), d = PH.out; if (d > PDIST[i]) continue; if (PNET[i]) { goal = i; break; } if (++n > 150000) break;
    const ix = i % N, iz = (i - ix) / N;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dz) continue; const jx = ix + dx, jz = iz + dz; if (jx < 0 || jz < 0 || jx >= N || jz >= N) continue; const j = jz * N + jx;
      let c = pCost(j); if (c === Infinity) { const ox = pX(j) - x, oz = pZ(j) - z; if (ox * ox + oz * oz < z2) c = 1.5; else continue; }
      if (dx && dz && (pCost(iz * N + jx) === Infinity || pCost(jz * N + ix) === Infinity) && !PNET[j]) c *= 1.6;   // não corta quina de parede
      if (PNET[j]) c *= 0.3; const nd = d + c * (dx && dz ? 1.4142 : 1);
      if (PSEEN[j] !== pGen || nd < PDIST[j]) { PSEEN[j] = pGen; PDIST[j] = nd; PFROM[j] = i; hPush(j, nd); } } }
  if (goal < 0) return null; const cells = []; for (let i = goal; i >= 0; i = PFROM[i]) cells.push(i); return cells.reverse(); }   // da entrada até a rede
// a trilha vira linha: tira os degraus da grade (Douglas-Peucker) e arredonda as curvas (Chaikin), mantendo as pontas
function pPolyline(pts) { const rdp = (a, b, out) => { let md = 0, mi = -1; for (let i = a + 1; i < b; i++) { const d = segDist(pts[i][0], pts[i][1], pts[a], pts[b]); if (d > md) { md = d; mi = i; } }
    if (md > 0.75) { rdp(a, mi, out); rdp(mi, b, out); } else out.push(pts[b]); };
  if (pts.length < 3) return pts; const out = [pts[0]]; rdp(0, pts.length - 1, out); let P = out;
  for (let it = 0; it < 2; it++) { const Q = [P[0]]; for (let i = 0; i < P.length - 1; i++) { const a = P[i], b = P[i + 1]; if (i > 0) Q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]); if (i < P.length - 2) Q.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } Q.push(P[P.length - 1]); P = Q; }
  return P; }
// o chão gasto, numa grade fina (0,5 m) em pedaços de 16 m criados conforme a rede passa
const DRS = 0.5, DRC = 32, DRM = new Map(), drKey = (ci, cj) => ci * 65536 + cj;
function drAdd(gi, gj, v) { const ci = Math.floor(gi / DRC), cj = Math.floor(gj / DRC), k = drKey(ci, cj); let a = DRM.get(k); if (!a) { a = new Float32Array(DRC * DRC); DRM.set(k, a); } const o = (gj - cj * DRC) * DRC + (gi - ci * DRC); if (v > a[o]) a[o] = v; }
function drGet(gi, gj) { const ci = Math.floor(gi / DRC), cj = Math.floor(gj / DRC), a = DRM.get(drKey(ci, cj)); return a ? a[(gj - cj * DRC) * DRC + (gi - ci * DRC)] : 0; }
export function pathAt(x, z) { const fx = x / DRS - 0.5, fz = z / DRS - 0.5, i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
  return (drGet(i, j) * (1 - u) + drGet(i + 1, j) * u) * (1 - v) + (drGet(i, j + 1) * (1 - u) + drGet(i + 1, j + 1) * u) * v; }
function stampSeg(a, b, w, s, box) { const r = w / 2 + 0.9, x0 = Math.min(a[0], b[0]) - r, x1 = Math.max(a[0], b[0]) + r, z0 = Math.min(a[1], b[1]) - r, z1 = Math.max(a[1], b[1]) + r;
  if (box) { box[0] = Math.min(box[0], x0); box[1] = Math.min(box[1], z0); box[2] = Math.max(box[2], x1); box[3] = Math.max(box[3], z1); }
  for (let gj = Math.floor(z0 / DRS); gj <= Math.ceil(z1 / DRS); gj++) for (let gi = Math.floor(x0 / DRS); gi <= Math.ceil(x1 / DRS); gi++) { const x = (gi + 0.5) * DRS, z = (gj + 0.5) * DRS;
    const d = segDist(x, z, a, b) + (vnoise(x * 0.8, z * 0.8) - 0.5) * 0.45, v = s * smooth(w / 2 + 0.55, w / 2 - 0.2, d); if (v > 0.01) drAdd(gi, gj, v); } }
// marca a trilha na rede: cada célula aponta para a vizinha que vai para o centro, e o peso de quem passa sobe pela árvore até a raiz
function pMark(cells, w) { for (let k = cells.length - 1; k >= 0; k--) { const i = cells[k]; if (!PNET[i]) { PNET[i] = 1; PPAR[i] = k < cells.length - 1 ? cells[k + 1] : -1; } }
  if (w > 0) for (let i = cells[0], g = 0; i >= 0 && g < 4000; i = PPAR[i], g++) PTRAF[i] += w; }
const pWidth = t => Math.min(2.3, 0.85 + 0.42 * Math.sqrt(t)), pWear = t => Math.min(1, 0.72 + 0.05 * t);
export const PATH_NET = { lines: [], fords: [] };
const PATHS_LANE = [];
function pDrawLine(cells, ends, box) { const raw = cells.map(i => [pX(i), pZ(i)]); if (ends && ends[0]) raw[0] = ends[0]; const P = pPolyline(raw), L = { pts: P, cells };
  PATH_NET.lines.push(L); return L; }
function pStampLine(L, box, wFix) { const P = L.pts; for (let k = 0; k < P.length - 1; k++) { const a = P[k], b = P[k + 1];
    const t = wFix != null ? wFix : (() => { let m = 0; for (const p of [a, b]) { const c = pCell(p[0], p[1]); if (c < 0) continue; const N = PG.N; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const j = c + dz * N + dx; if (j >= 0 && j < PNN && PNET[j]) m = Math.max(m, PTRAF[j]); } } return m; })();
    stampSeg(a, b, pWidth(t), pWear(t), box); PATHS.push([a, b]); }
  for (let k = 3; k < L.cells.length - 3; k++) { const i = L.cells[k], x = pX(i), z = pZ(i); if (waterDist(x, z) < 0.4) PATH_NET.fords.push([x, z]); } }   // travessia de água no meio do caminho (as pontas na beira não contam)
// as entradas: [ponto, peso, raio da zona da ponta]
function pEntries() { const L = LAYOUT, E = [], door = (o, lx, out = 0.9) => rot2w(o.p, o.rot, lx, o.d / 2 + out);
  const gate = (o, g, out = 1.3) => { const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => rot2w(o.p, o.rot, u * o.w / 2, v * o.d / 2)), a = pts[g.side], b = pts[(g.side + 1) % 4];
    const m = [a[0] + (b[0] - a[0]) * g.t, a[1] + (b[1] - a[1]) * g.t], nx = m[0] - o.p[0], nz = m[1] - o.p[1], l = Math.hypot(nx, nz) || 1; return [m[0] + nx / l * out, m[1] + nz / l * out]; };
  for (const h of L.houses) E.push([door(h, -h.w * 0.22), 3, 1.0]);
  E.push([L.chapelDoor, 4, 1.2], [door(L.venda, -L.venda.w * 0.08, 1.0), 4, 1.6], [door(L.sobrado, -L.sobrado.w * 0.22), 3, 1.0], [rot2w(L.oven.p, L.oven.rot, 0, 1.6), 2, 1.0],
    [gate(L.garden, L.garden.gate), 2, 1.0], [gate(L.corral, L.corral.gate, 1.6), 3, 1.2], [L.corral.ranchoP, 2, 1.8], [gate(L.sheepPen, L.sheepPen.gate), 2, 1.0],
    [door(L.paiol, 0, 0.9), 2, 1.4], [door(L.celeiro, 0, 1.2), 2, 1.2], [L.mill.p, 2, 3.0], [L.cruzeiro.p, 1, 1.4], [L.licao.p, 1, 2.2], [L.toco.p, 1, 1.2], [L.lenha.p, 1, 1.4]);
  if (L.lav) E.push([L.lav, 2, 1.6]); if (L.varal) E.push([L.varal.c, 1, 1.0]);
  return E; }
(function buildPaths() { const T0 = Date.now(), L = LAYOUT, disc = (p, r) => { const out = []; for (let z = -r; z <= r; z += PG.S) for (let x = -r; x <= r; x += PG.S) if (x * x + z * z <= r * r) { const c = pCell(p[0] + x, p[1] + z); if (c >= 0) out.push(c); } return out; };
  // as raízes: o poço (o centro da vila) e a praça, ligados pela estrada
  const wellC = disc(L.well.p, 2.2); for (const c of wellC) { PNET[c] = 1; PPAR[c] = -1; }
  const toPraca = pRoute(L.praca.c[0], L.praca.c[1], 4.5); if (toPraca) { pMark(toPraca, 0); const pr = disc(L.praca.c, 4.0); for (const c of pr) if (!PNET[c]) { PNET[c] = 1; PPAR[c] = toPraca[0]; } }
  // a carreira entre o milho e o girassol: já existe (é por onde se colhe); entra pela ponta mais perto da vila
  const tL = TILES.find(t => t.kind === 'lavoura'), la = [tL.c[0] + 6.4, tL.c[1] - 17], lb = [tL.c[0] + 6.4, tL.c[1] + 17], near = Math.hypot(la[0] - L.well.p[0], la[1] - L.well.p[1]) < Math.hypot(lb[0] - L.well.p[0], lb[1] - L.well.p[1]) ? la : lb;
  const toLane = pRoute(near[0], near[1], 1.5); const laneCells = []; for (let s = 0; s <= 1; s += 0.02) { const c = pCell(la[0] + (lb[0] - la[0]) * s, la[1] + (lb[1] - la[1]) * s); if (c >= 0 && !laneCells.includes(c)) laneCells.push(c); }
  const lines = [];
  if (toLane) { pMark(toLane, 3); lines.push([toLane, near]); } const nIdx = near === la ? 0 : laneCells.length - 1; const ordered = nIdx === 0 ? [...laneCells].reverse() : laneCells;
  pMark(ordered.concat(toLane ? [toLane[0]] : []), 0); PATHS_LANE.push([la, lb]);
  // do mais usado para o menos usado; no empate, o mais perto da rede primeiro (quem está longe aproveita o que já foi aberto)
  const E = pEntries().sort((a, b) => b[1] - a[1] || Math.hypot(a[0][0] - L.well.p[0], a[0][1] - L.well.p[1]) - Math.hypot(b[0][0] - L.well.p[0], b[0][1] - L.well.p[1]));
  for (const [p, w, zone] of E) { const cells = pRoute(p[0], p[1], zone); if (!cells) continue; pMark(cells, w); if (cells.length > 1) lines.push([cells, p]); }
  if (toPraca) { for (let i = toPraca[0]; i >= 0; i = PPAR[i]) PTRAF[i] += 8; lines.unshift([toPraca, L.praca.c]); }   // a estrada da praça carrega o movimento de fora
  for (const [cells, p] of lines) pStampLine(pDrawLine(cells, [p]));
  stampSeg(la, lb, 1.5, 0.85); PATHS.push([la, lb]);
  PATHS_BASE = PATHS.length; PATH_NET.ms = Date.now() - T0; })();
// uma entrada nova (a casa que a vila ganhou): liga na rede e devolve a caixa do chão que mudou, para refazer o chão e o capim ali
export function connectPath(p, w = 3, zone = 1.0, obstacle = null) { if (obstacle) PEXTRA.push(obstacle);
  if (TILES.length !== pTiles || obstacle) { pTiles = TILES.length; PCOST.fill(NaN); }
  const cells = pRoute(p[0], p[1], zone); if (!cells || cells.length < 2) return null; pMark(cells, w); const box = [1e9, 1e9, -1e9, -1e9]; pStampLine(pDrawLine(cells, [p]), box, null); return box; }
