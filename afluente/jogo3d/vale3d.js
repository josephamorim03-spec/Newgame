// Afluente · o tabuleiro em 3D (v3.2). Desenha as peças do jogo com three.js e entrega a imagem para o canvas 2D,
// que continua desenhando o céu, os rótulos, as faixas e tudo o que é interface.
//
// A câmera casa com a projeção do jogo 2D: o chão do vale fica exatamente onde o 2D o põe (scr = wpos·s + cam),
// sem achatar. É uma câmera ortográfica inclinada TILT graus da vertical, com o quadro esticado na vertical por
// 1/cos(TILT). Um ponto (X, altura, Z) aparece no lugar 2D (X, Z − altura·tan(TILT)). Assim o toque, as casas
// vazias, os rótulos e os números do 2D continuam certos sem mudar nada, e o 3D só dá volume.
//
// Unidades: as do jogo, raio do hexágono = 1 (20 m na tabela métrica da prévia 3D). Peça em pé, pontuda em z.
// Lado i da peça: ponto médio no ângulo −60°·i, no plano XZ com Z = y do 2D (para baixo na tela).
import * as THREE from 'three';
import { mergeGeometries } from '../prototipo3d/js/addons/BufferGeometryUtils.js';

const TILT = 40 * Math.PI / 180, TAN = Math.tan(TILT), COS = Math.cos(TILT), SIN = Math.sin(TILT);
const S3 = Math.sqrt(3), AP = S3 / 2, SLAB = 0.3, NSUB = 7;
const ang = i => -Math.PI / 3 * i;

// ---------- sorteio e ruído (determinísticos: a mesma peça sai sempre igual)
function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash(x, y) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263); h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; }
function vnoise(x, y) { const i = Math.floor(x), j = Math.floor(y), f = x - i, g = y - j, u = f * f * (3 - 2 * f), v = g * g * (3 - 2 * g);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
const UP = [0, 1, 0];
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- cores (sRGB do desenho → linear do three.js)
const COL = {};
const col = hex => COL[hex] || (COL[hex] = new THREE.Color(hex));
const mixc = (a, b, t, out = new THREE.Color()) => out.copy(a).lerp(b, t);
const PAL = {
  pastoV: '#86b552', pastoS: '#c4b474', mataV: '#5b8d43', mataS: '#9c9355', vila: '#c9ab84', vilaV: '#a9b46c',
  solo: '#a8784b', linhaV: '#76a83b', linhaS: '#d2b66a', linhaSeca: '#c99b4f', leito: '#73603f', leitoSeco: '#b39a6c', margem: '#5f7a3a',
  terraTopo: '#8d6844', terraBase: '#5c4430',
  copaV: ['#3f7f35', '#4f9440', '#2f6b30', '#5a9c46'], copaS: ['#8a8a3c', '#9c8a40', '#7f7a3a', '#a39552'], ipe: ['#f2c12e', '#e889b5', '#f5f0e6'],
  tronco: '#6b4a32', toco: '#9a7650', lenha: '#7a5638',
  parede: ['#f2ece0', '#f0d9a8', '#f4efe6', '#ecdcc2'], barra: ['#3f78b0', '#9a4a32', '#4f8a4a', '#c08a2a'], telha: ['#b4563a', '#a94d34', '#bd6440'],
  capimV: '#6e9f3e', capimS: '#c9b06a', milhoV: '#5f9a35', milhoS: '#d4b85c', boi: '#efe9df', boiC: '#8a6a52', buriti: '#4f7d36', burTr: '#7d6a50', junco: '#5d8c3a',
};

// ---------- a forma da peça: setores, rio e relevo
// setor do ponto (lado mais perto) e mistura com o setor vizinho perto da divisa (ecótono, sem linha reta)
function sectorOf(x, z) { const a = Math.atan2(z, x), f = -a / (Math.PI / 3); let i = Math.round(f); const fr = f - i; i = ((i % 6) + 6) % 6; return [i, fr]; }
// o rio da peça: um canal de cada lado de água até o centro, com uma curva leve; poço no centro na nascente,
// na vereda, na lagoa e no fim de um canal sozinho
function riverOf(e, flags, seed) {
  const R = rng(seed * 7 + 11), segs = [], pools = [], As = [];
  for (let i = 0; i < 6; i++) if (e[i] === 'A') As.push(i);
  const w = 0.13;
  for (const i of As) { const a = ang(i), mx = Math.cos(a) * (AP + 0.02), mz = Math.sin(a) * (AP + 0.02), px = -Math.sin(a), pz = Math.cos(a), wig = (R() - 0.5) * 0.22, pts = [];
    for (let j = 0; j <= 10; j++) { const t = j / 10, s = Math.sin(Math.PI * t) * wig; pts.push([mx * (1 - t) + px * s, mz * (1 - t) + pz * s]); }
    segs.push(pts); }
  if (flags.sp === 'lake') pools.push([0, 0, 0.5]);
  else if (flags.src) pools.push([0, 0, flags.vereda ? 0.3 : 0.34]);
  else if (As.length === 1) pools.push([0, 0, 0.17]);
  else if (As.length >= 2) pools.push([0, 0, w * 1.05]);
  return { segs, pools, w };
}
function segDist(x, z, P) { let best = 1e9; for (let j = 0; j + 1 < P.length; j++) { const [ax, az] = P[j], [bx, bz] = P[j + 1], vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz;
  const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l2)), dx = x - ax - vx * t, dz = z - az - vz * t; best = Math.min(best, dx * dx + dz * dz); } return Math.sqrt(best); }
// distância à beira d'água (negativa dentro) e o quanto o ponto está para o meio do canal (0 beira, 1 meio)
function waterField(x, z, riv) { let d = 1e9, mid = 0;
  for (const P of riv.segs) { const s = segDist(x, z, P), dd = s - riv.w; if (dd < d) { d = dd; mid = 1 - (s / riv.w) ** 2; } }
  for (const [px, pz, r] of riv.pools) { const s = Math.hypot(x - px, z - pz), dd = s - r; if (dd < d) { d = dd; mid = 1 - (s / r) ** 2; } }
  return [d, Math.max(0, mid)]; }
const WY = -0.035, BED = 0.075;   // nível da água cheia e fundo do leito abaixo dele
function heightOf(wx, wz, x, z, riv) {
  let h = (vnoise(wx * 2.3 + 7.1, wz * 2.3 - 3.3) - 0.5) * 0.05 + (vnoise(wx * 7, wz * 7) - 0.5) * 0.012;
  if (riv.segs.length || riv.pools.length) { const [d, mid] = waterField(x, z, riv);
    if (d < 0.08) h = lerp(h, WY + 0.008, smooth(0.08, 0, d));
    if (d < 0) h = WY - BED * mid; }
  return h; }

// ---------- materiais (luz em faixas, como a prévia 3D)
const ramp = (() => { const v = [0.32, 0.34, 0.38, 0.64, 0.9, 1, 1, 1], d = new Uint8Array(v.length * 4); v.forEach((x, i) => d.set([x * 255, x * 255, x * 255, 255], i * 4));
  const t = new THREE.DataTexture(d, v.length, 1, THREE.RGBAFormat); t.needsUpdate = true; t.minFilter = t.magFilter = THREE.NearestFilter; return t; })();
const UNI = { uTime: { value: 0 }, uWind: { value: 0.3 }, uNight: { value: 0 } };
function swayMat() { const m = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ramp });
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, UNI);
    sh.vertexShader = 'attribute float aSway;uniform float uTime,uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      { vec4 wp = modelMatrix * vec4(position, 1.0); float ph = wp.x * 2.7 + wp.z * 1.9;
        transformed.x += aSway * uWind * (0.6 * sin(uTime * 1.6 + ph) + 0.4 * sin(uTime * 3.9 + ph * 2.3)) * 0.035;
        transformed.z += aSway * uWind * 0.4 * sin(uTime * 2.1 + ph * 1.3) * 0.025; }`); };
  return m; }
const MAT = {};
function mats() {
  if (MAT.ground) return MAT;
  MAT.ground = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ramp });
  MAT.props = swayMat();
  // água: azul em faixas como o resto, com ondinhas de brilho que correm (sem reflexo que estoura no sol forte)
  MAT.water = new THREE.MeshToonMaterial({ color: col('#2f8fbf'), gradientMap: ramp });
  MAT.water.onBeforeCompile = sh => { Object.assign(sh.uniforms, UNI);
    sh.vertexShader = 'varying vec3 vWw;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWw = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'uniform float uTime;varying vec3 vWw;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
      { vec2 p = vWw.xz * 14.0; float r = sin(p.x * 1.3 + uTime * 1.6) * sin(p.y * 1.7 - uTime * 1.2) + 0.6 * sin((p.x - p.y) * 2.1 + uTime * 2.3);
        gl_FragColor.rgb += vec3(0.55, 0.7, 0.75) * smoothstep(1.05, 1.5, r) * 0.55; }`); };
  MAT.win = new THREE.MeshBasicMaterial({ vertexColors: true });
  MAT.win.onBeforeCompile = sh => { Object.assign(sh.uniforms, UNI);
    sh.fragmentShader = 'uniform float uNight;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      diffuseColor.rgb = mix(vec3(0.10, 0.08, 0.06), vec3(1.0, 0.72, 0.32) * 1.25, uNight * vColor.r);`); };
  return MAT;
}

// ---------- montagem de geometria: listas de triângulos com cor e balanço
class Geo {
  constructor() { this.p = []; this.n = []; this.c = []; this.s = []; }
  tri(a, b, c, ca, cb = ca, cc = ca, sa = 0, sb = sa, sc = sa) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    this.p.push(...a, ...b, ...c); this.n.push(nx, ny, nz, nx, ny, nz, nx, ny, nz); this.c.push(ca.r, ca.g, ca.b, cb.r, cb.g, cb.b, cc.r, cc.g, cc.b); this.s.push(sa, sb, sc); }
  // triângulo virado para o lado o (o chão para cima, a laje para fora): troca b e c se precisar
  triO(a, b, c, ca, cb, cc, o) { const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (nx * o[0] + ny * o[1] + nz * o[2] < 0) this.tri(a, c, b, ca, cc, cb); else this.tri(a, b, c, ca, cb, cc); }
  // geometria pronta do three.js, já transformada, com uma cor e um balanço por vértice (função da altura)
  add(g, m, color, sway = 0, jitter = 0, R = null) {
    const G = g.index ? g.toNonIndexed() : g, P = G.attributes.position, N = G.attributes.normal, v = new THREE.Vector3(), nn = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(m);
    const c = new THREE.Color(); let face = 0;
    for (let i = 0; i < P.count; i++) {
      if (i % 3 === 0) { c.copy(color); if (jitter && R) { const j = 1 + (R() - 0.5) * jitter; c.r *= j; c.g *= j; c.b *= j; } face++; }
      v.fromBufferAttribute(P, i); const y0 = v.y; v.applyMatrix4(m); nn.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
      this.p.push(v.x, v.y, v.z); this.n.push(nn.x, nn.y, nn.z); this.c.push(c.r, c.g, c.b);
      this.s.push(typeof sway === 'function' ? sway(y0) : sway); }
    if (G !== g) G.dispose(); }
  build() { if (!this.p.length) return null; const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3)); g.setAttribute('aSway', new THREE.Float32BufferAttribute(this.s, 1));
    g.computeBoundingSphere(); return g; }
}
const BASE = {};
function base() {
  if (BASE.ico) return BASE;
  BASE.ico = new THREE.IcosahedronGeometry(1, 0); BASE.cyl = new THREE.CylinderGeometry(0.5, 0.6, 1, 6, 1); BASE.cyl.translate(0, 0.5, 0);
  BASE.cone = new THREE.ConeGeometry(1, 1, 5, 1); BASE.cone.translate(0, 0.5, 0); BASE.box = new THREE.BoxGeometry(1, 1, 1); BASE.box.translate(0, 0.5, 0);
  BASE.disc = new THREE.CylinderGeometry(1, 1, 1, 10, 1); BASE.disc.translate(0, 0.5, 0);
  // telhado de duas águas: prisma com a cumeeira no eixo x
  const r = new THREE.BufferGeometry(), v = [-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 1, 0, -0.5, 1, 0, -0.5, 0, 0.5, 0.5, 0, 0.5];
  r.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); r.setIndex([0, 3, 2, 0, 2, 1, 4, 5, 2, 4, 2, 3, 0, 4, 3, 1, 2, 5]); r.computeVertexNormals(); BASE.roof = r;
  // folha de buriti: leque achatado
  BASE.leaf = new THREE.ConeGeometry(1, 1, 3, 1); BASE.leaf.translate(0, 0.5, 0);
  return BASE;
}
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), EU = new THREE.Euler(), V1 = new THREE.Vector3(), V2 = new THREE.Vector3();
const mtx = (x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) => M4.compose(V1.set(x, y, z), Q.setFromEuler(EU.set(rx, ry, rz)), V2.set(sx, sy, sz));

// ---------- objetos
function tree(G, x, y, z, R, st, opts = {}) {
  const B = base(), h = 0.1 + R() * 0.05, s = (0.85 + R() * 0.35) * (opts.k || 1);
  G.add(B.cyl, mtx(x, y, z, 0.045 * s, h * s, 0.045 * s, R() * 6), col(PAL.tronco), 0);
  let cs = st.green ? PAL.copaV : PAL.copaS; if (!st.green && st.seca && R() < 0.22) cs = PAL.ipe;
  const c = col(cs[Math.floor(R() * cs.length)]), n = 2 + (R() < 0.5 ? 1 : 0);
  for (let i = 0; i < n; i++) { const r = (0.085 + R() * 0.045) * s, ox = (R() - 0.5) * 0.08 * s, oz = (R() - 0.5) * 0.08 * s, oy = (h + 0.05 + i * 0.05) * s;
    G.add(B.ico, mtx(x + ox, y + oy, z + oz, r, r * 0.9, r, R() * 6, R(), R()), c, yy => 0.6 + 0.4 * yy, 0.16, R); }
}
function stump(G, x, y, z, R) { const B = base(); G.add(B.cyl, mtx(x, y, z, 0.05, 0.035, 0.05, R() * 6), col(PAL.toco), 0);
  if (R() < 0.6) { const a = R() * 6; G.add(B.cyl, mtx(x + 0.06, y + 0.022, z + 0.03, 0.035, 0.12, 0.035, a, 0, Math.PI / 2), col(PAL.lenha), 0); } }
function house(G, W, x, y, z, R, rot, tall, lit) {
  const B = base(), w = 0.17 + R() * 0.04, d = 0.13 + R() * 0.02, hw = tall ? 0.19 : 0.1, wall = col(PAL.parede[Math.floor(R() * 4)]), band = col(PAL.barra[Math.floor(R() * 4)]);
  G.add(B.box, mtx(x, y, z, w, hw, d, rot), wall, 0);
  G.add(B.box, mtx(x, y, z, w + 0.004, 0.028, d + 0.004, rot), band, 0);
  G.add(B.roof, mtx(x, y + hw, z, w + 0.04, 0.075, d + 0.05, rot), col(PAL.telha[Math.floor(R() * 3)]), 0, 0.12, R);
  const c = Math.cos(rot), s = Math.sin(rot), cx = x + c * w * 0.28, cz = z - s * w * 0.28;
  G.add(B.box, mtx(cx, y + hw + 0.02, cz, 0.03, 0.08, 0.03, rot), col('#d9cdb8'), 0);
  // janelas e porta na frente e atrás (acendem à noite se a casa foi atendida)
  const L = lit ? 1 : 0, win = new THREE.Color(L, 0, 0);
  for (const side of [1, -1]) for (const u of tall ? [-0.045, 0.045] : [-0.05, 0.05]) for (const fl of tall ? [0.05, 0.13] : [0.055]) {
    const px = x + (c * u) + (s * (d / 2 + 0.002) * side), pz = z - (s * u) + (c * (d / 2 + 0.002) * side);
    W.add(B.box, mtx(px, y + fl - 0.018, pz, 0.026, 0.034, 0.004, rot), win, 0); }
  return [cx, y + hw + 0.1, cz];
}
function chapel(G, W, x, y, z, rot, lit) { const B = base(), c = Math.cos(rot), s = Math.sin(rot), wall = col('#f6f2ea'), roof = col('#a94d34');
  G.add(B.box, mtx(x, y, z, 0.15, 0.15, 0.22, rot), wall, 0); G.add(B.roof, mtx(x, y + 0.15, z, 0.18, 0.08, 0.25, rot + Math.PI / 2), roof, 0);
  const tx = x + s * 0.13, tz = z + c * 0.13; G.add(B.box, mtx(tx, y, tz, 0.07, 0.3, 0.07, rot), wall, 0); G.add(B.cone, mtx(tx, y + 0.3, tz, 0.055, 0.09, 0.055, rot + Math.PI / 4), roof, 0);
  G.add(B.box, mtx(tx + s * 0.036, y + 0.2, tz + c * 0.036, 0.025, 0.04, 0.004, rot), col('#3a2e24'), 0);
  W.add(B.box, mtx(x + s * 0.111, y + 0.03, z + c * 0.111, 0.04, 0.07, 0.004, rot), new THREE.Color(lit ? 1 : 0, 0, 0), 0); }
function garden(G, x, y, z, R) { const B = base(), a = R() * 6; G.add(B.box, mtx(x, y, z, 0.12, 0.012, 0.09, a), col('#6b4f33'), 0);
  for (let i = 0; i < 6; i++) { const u = (i % 3 - 1) * 0.035, v = (Math.floor(i / 3) - 0.5) * 0.04, c = Math.cos(a), s = Math.sin(a);
    G.add(B.ico, mtx(x + c * u + s * v, y + 0.02, z - s * u + c * v, 0.016, 0.014, 0.016, R() * 6), col(R() < 0.5 ? '#4f9a3a' : '#6aaa45'), 0.3); } }
function cow(G, x, y, z, R) { const B = base(), a = R() * 6, c = Math.cos(a), s = Math.sin(a), body = col(R() < 0.7 ? PAL.boi : PAL.boiC);
  G.add(B.box, mtx(x, y + 0.035, z, 0.075, 0.04, 0.035, a), body, 0); G.add(B.box, mtx(x + c * 0.045, y + 0.05, z - s * 0.045, 0.025, 0.03, 0.025, a), body, 0);
  for (const [u, v] of [[-0.025, -0.012], [-0.025, 0.012], [0.025, -0.012], [0.025, 0.012]]) G.add(B.box, mtx(x + c * u + s * v, y, z - s * u + c * v, 0.008, 0.036, 0.008, a), col('#5a4636'), 0); }
function buriti(G, x, y, z, R, st) { const B = base(), h = 0.32 + R() * 0.12; G.add(B.cyl, mtx(x, y, z, 0.03, h, 0.03, 0), col(PAL.burTr), 0);
  const c = col(st.green || st.src ? PAL.buriti : '#8a8a46'); for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28 + R(); G.add(B.leaf, mtx(x + Math.cos(a) * 0.01, y + h - 0.01, z + Math.sin(a) * 0.01, 0.035, 0.16, 0.012, -a, 0, 1.05), c, 1, 0.12, R); } }

// ---------- uma peça inteira (chão, laje, água, objetos, janelas)
function buildTile(T) {
  const { e, flags, wx, wz } = T, seed = (T.seed >>> 0) || 1, riv = riverOf(e, flags, seed), R = rng(seed * 31 + 5), mat = mats(), B = base();
  const st = { green: flags.wet, seca: flags.seca, src: flags.src };
  const ground = new Geo(), props = new Geo(), wins = new Geo(), chim = [], lights = [];
  const rowA = R() * Math.PI, ca = Math.cos(rowA), sa = Math.sin(rowA), tmp = new THREE.Color();
  // cor do chão no ponto (x, z) local
  const groundCol = (x, z) => {
    const [i, fr] = sectorOf(x, z), ci = colAt(e[i], x, z), j = (i + (fr > 0 ? 1 : 5)) % 6, k = smooth(0.32, 0.5, Math.abs(fr));
    const c = k > 0 && e[j] !== e[i] ? mixc(ci, colAt(e[j], x, z), k * 0.5, tmp) : tmp.copy(ci);
    if (riv.segs.length || riv.pools.length) { const [d] = waterField(x, z, riv);
      if (d < 0) c.copy(flags.alive ? col(PAL.leito) : col(PAL.leitoSeco));
      else if (d < 0.07) c.lerp(col(flags.alive || flags.wet ? PAL.margem : PAL.leitoSeco), smooth(0.07, 0, d) * 0.7); }
    const n = 0.9 + 0.2 * vnoise((wx + x) * 9, (wz + z) * 9); c.r *= n; c.g *= n; c.b *= n; return c; };
  const colAt = (L, x, z) => {
    const wet = flags.wet;
    if (L === 'B') return col(wet ? PAL.mataV : PAL.mataS);
    if (L === 'C') { const row = Math.sin((x * ca + z * sa) * 46) > 0.1; return row ? col(wet ? (flags.seca ? PAL.linhaSeca : PAL.linhaV) : PAL.linhaS) : col(PAL.solo); }
    if (L === 'V') return mixc(col(PAL.vila), col(PAL.vilaV), wet ? 0.35 : 0, new THREE.Color());
    return col(wet ? PAL.pastoV : PAL.pastoS); };
  // chão: cada setor (triângulo centro–canto–canto) dividido em NSUB², com a normal tirada do relevo
  const H = (x, z) => heightOf(wx + x, wz + z, x, z, riv);
  const vert = (x, z) => [x, H(x, z), z];
  for (let i = 0; i < 6; i++) {
    const a0 = ang(i) - Math.PI / 6, a1 = ang(i) + Math.PI / 6, A = [Math.cos(a0), Math.sin(a0)], Bv = [Math.cos(a1), Math.sin(a1)];
    const P = (u, v) => [(A[0] * u + Bv[0] * v) / NSUB, (A[1] * u + Bv[1] * v) / NSUB];
    for (let u = 0; u < NSUB; u++) for (let v = 0; u + v < NSUB; v++) {
      const q = [P(u, v), P(u + 1, v), P(u, v + 1)], t1 = q.map(p => vert(p[0], p[1]));
      ground.triO(t1[0], t1[2], t1[1], groundCol(...q[0]).clone(), groundCol(...q[2]).clone(), groundCol(...q[1]).clone(), UP);
      if (u + v + 2 <= NSUB) { const q2 = [P(u + 1, v), P(u, v + 1), P(u + 1, v + 1)], t2 = q2.map(p => vert(p[0], p[1]));
        ground.triO(t2[0], t2[1], t2[2], groundCol(...q2[0]).clone(), groundCol(...q2[1]).clone(), groundCol(...q2[2]).clone(), UP); }
    }
  }
  // normais suaves pelo relevo (iguais dos dois lados da emenda entre peças)
  const gg = ground.build(), pos = gg.attributes.position, nor = gg.attributes.normal, e2 = 0.02;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), hx = H(x + e2, z) - H(x - e2, z), hz = H(x, z + e2) - H(x, z - e2);
    V1.set(-hx, 2 * e2, -hz).normalize(); nor.setXYZ(i, V1.x, V1.y, V1.z); }
  // a laje de terra: as seis faces de lado, do chão até embaixo
  const slab = new Geo(), top = col(PAL.terraTopo), bot = col(PAL.terraBase);
  for (let i = 0; i < 6; i++) { const a0 = ang(i) - Math.PI / 6, a1 = ang(i) + Math.PI / 6, p0 = [Math.cos(a0), Math.sin(a0)], p1 = [Math.cos(a1), Math.sin(a1)];
    for (let j = 0; j < NSUB; j++) { const t0 = j / NSUB, t1 = (j + 1) / NSUB, x0 = lerp(p0[0], p1[0], t0), z0 = lerp(p0[1], p1[1], t0), x1 = lerp(p0[0], p1[0], t1), z1 = lerp(p0[1], p1[1], t1);
      const y0 = H(x0, z0), y1 = H(x1, z1);
      const o = [Math.cos(ang(i)), 0, Math.sin(ang(i))];
      slab.triO([x0, y0, z0], [x1, y1, z1], [x1, -SLAB, z1], top, top, bot, o); slab.triO([x0, y0, z0], [x1, -SLAB, z1], [x0, -SLAB, z0], top, bot, bot, o); } }
  // objetos: pontos sorteados em cada setor, longe da água e uns dos outros
  const placed = [], far = (x, z, r) => placed.every(([px, pz, pr]) => Math.hypot(x - px, z - pz) > r + pr);
  const dryOK = (x, z, m) => !(riv.segs.length || riv.pools.length) || waterField(x, z, riv)[0] > m;
  const pick = (i, tries, r, m = 0.06, inner = 0.12, outer = 0.86) => { for (let n = 0; n < tries; n++) {
    const a = ang(i) + (R() - 0.5) * Math.PI / 3 * 0.92, d = lerp(inner, outer, Math.sqrt(R())) * (AP / Math.cos(Math.abs(a - ang(i)) % (Math.PI / 3)));
    const x = Math.cos(a) * d * 0.98, z = Math.sin(a) * d * 0.98; if (Math.abs(x) > AP - 0.05 || Math.abs(x) * 0.5 + Math.abs(z) * AP > AP - 0.05) continue;
    if (dryOK(x, z, m) && far(x, z, r)) { placed.push([x, z, r]); return [x, H(x, z), z]; } } return null; };
  const tall = (flags.tier || 0) >= 3;
  let houses = 0, church = false;
  for (let i = 0; i < 6; i++) {
    const L = e[i];
    if (L === 'B') { if (flags.cut) { for (let n = 0; n < 3; n++) { const p = pick(i, 8, 0.05); if (p) stump(props, ...p, R); } const p = pick(i, 6, 0.06); if (p) tree(props, ...p, R, st, { k: 0.55 }); }
      else for (let n = 0; n < 5; n++) { const p = pick(i, 10, 0.075); if (p) tree(props, ...p, R, st); } }
    else if (L === 'C') { // fileiras de milho na direção das linhas do chão
      const cc = col(flags.wet ? (flags.seca ? PAL.linhaSeca : PAL.milhoV) : PAL.milhoS);
      for (let n = 0; n < 16; n++) { const p = pick(i, 4, 0.02, 0.05, 0.15, 0.9); if (!p) continue; const u0 = p[0] * ca + p[2] * sa, nr = Math.round((u0 * 46 - Math.PI / 2) / (2 * Math.PI));
        const dd = (Math.PI / 2 + 2 * Math.PI * nr) / 46 - u0, x = p[0] + ca * dd, z = p[2] + sa * dd; props.add(B.cone, mtx(x, H(x, z), z, 0.022, 0.07 + R() * 0.03, 0.022, R() * 6), cc, yy => yy, 0.2, R); } }
    else if (L === 'G' || L === 'A') { const cc = col(flags.wet ? PAL.capimV : PAL.capimS);
      for (let n = 0; n < (L === 'A' ? 3 : 7); n++) { const p = pick(i, 4, 0.02, 0.03, 0.15, 0.95); if (p) props.add(B.cone, mtx(p[0], p[1], p[2], 0.025, 0.035 + R() * 0.03, 0.025, R() * 6), cc, yy => yy, 0.25, R); }
      if (L === 'A') for (let n = 0; n < 4; n++) { const p = pick(i, 6, 0.015, 0.0, 0.2, 0.95); if (p && waterField(p[0], p[2], riv)[0] < 0.07) props.add(B.cone, mtx(p[0], p[1], p[2], 0.012, 0.09 + R() * 0.05, 0.012, R() * 6), col(PAL.junco), yy => yy, 0.2, R); } }
    else if (L === 'V') { // casas viradas para o meio da peça; a vila maior tem mais casas, sobrado e capela
      const n = 2 + ((flags.tier || 0) >= 2 ? 1 : 0), lit = flags.lit !== false;
      for (let m = 0; m < n; m++) { const p = pick(i, 14, 0.11, 0.08, 0.28, 0.86); if (!p) continue; const rot = Math.atan2(-p[2], p[0]) + Math.PI / 2 + (R() - 0.5) * 0.5;
        if (!church && (flags.tier || 0) >= 4 && m === 0) { church = true; chapel(props, wins, ...p, rot, lit); continue; }
        chim.push(house(props, wins, ...p, R, rot, tall && R() < 0.5, lit)); houses++; if (lit) lights.push([p[0], p[1] + 0.06, p[2]]); }
      if (R() < 0.6) { const p = pick(i, 8, 0.07, 0.06, 0.3, 0.9); if (p) garden(props, ...p, R); } }
  }
  if (!houses && e.includes('V')) { const i = e.indexOf('V'), p = pick(i, 20, 0.1, 0.05, 0.2, 0.9); if (p) { const lit = flags.lit !== false; chim.push(house(props, wins, ...p, R, R() * 6, false, lit)); if (lit) lights.push([p[0], p[1] + 0.06, p[2]]); } }
  if (e.filter(x => x === 'G').length >= 3 && R() < 0.55 && !flags.src) for (let n = 0; n < 2; n++) { const i = e.indexOf('G'), p = pick(i, 8, 0.06); if (p) cow(props, ...p, R); }
  if (flags.src) for (let n = 0; n < (flags.vereda ? 6 : 5); n++) { const a = n / 6 * 6.28 + R() * 0.6, r = (flags.vereda ? 0.38 : 0.42) + R() * 0.08, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (dryOK(x, z, 0.02)) buriti(props, x, H(x, z), z, R, st); }
  // água: faixas ao longo dos canais e discos nos poços (opaca; a seca baixa o nível e o leito aparece)
  const water = new Geo(), wc = new THREE.Color(1, 1, 1);
  for (const Pts of riv.segs) for (let j = 0; j + 1 < Pts.length; j++) { const [ax, az] = Pts[j], [bx, bz] = Pts[j + 1], dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz), nx = -dz / l * riv.w, nz = dx / l * riv.w;
    const ex = dx / l * riv.w * 0.5, ez = dz / l * riv.w * 0.5;
    water.triO([ax + nx - ex, 0, az + nz - ez], [bx + nx + ex, 0, bz + nz + ez], [bx - nx + ex, 0, bz - nz + ez], wc, wc, wc, UP); water.triO([ax + nx - ex, 0, az + nz - ez], [bx - nx + ex, 0, bz - nz + ez], [ax - nx - ex, 0, az - nz - ez], wc, wc, wc, UP); }
  for (const [px, pz, r] of riv.pools) for (let j = 0; j < 20; j++) { const a0 = j / 20 * 6.2832, a1 = (j + 1) / 20 * 6.2832;
    water.triO([px, 0, pz], [px + Math.cos(a1) * r, 0, pz + Math.sin(a1) * r], [px + Math.cos(a0) * r, 0, pz + Math.sin(a0) * r], wc, wc, wc, UP); }
  for (let i = 0; i < water.n.length; i += 3) { water.n[i] = 0; water.n[i + 1] = 1; water.n[i + 2] = 0; }
  // o grupo
  const g = new THREE.Group();
  const mk = (geo, m, cast, recv) => { if (!geo) return null; const me = new THREE.Mesh(geo, m); me.castShadow = cast; me.receiveShadow = recv; g.add(me); return me; };
  mk(gg, mat.ground, false, true); mk(slab.build(), mat.ground, false, false); mk(props.build(), mat.props, true, true); mk(wins.build(), mat.win, false, false);
  const wm = mk(water.build(), mat.water, false, true);
  g.userData = { water: wm, chim, lights };
  return g;
}
function dispose(g) { g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }

// ---------- o mundo: renderizador, câmera, luzes, peças
let renderer = null, scene, camera, sun, hemi, amb, ok = null;
const tiles = new Map();
let ghost = null, ghostSig = '', shadowKey = '';
function init() {
  if (ok !== null) return ok;
  try {
    const cv = document.createElement('canvas');
    renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene(); camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
    scene.add(sun, sun.target); hemi = new THREE.HemisphereLight(0xcfe6ff, 0x8a7a52, 0.9); scene.add(hemi); amb = new THREE.AmbientLight(0xffffff, 0.15); scene.add(amb);
    mats(); base(); ok = true;
  } catch (e) { console.warn('3D indisponível', e); ok = false; }
  return ok;
}
const rgb = (a, out = new THREE.Color()) => out.setRGB(a[0] / 255, a[1] / 255, a[2] / 255, THREE.SRGBColorSpace);

// quadro: recebe o estado do desenho do jogo e devolve o canvas pronto, as chaminés e as janelas acesas (em
// coordenadas 2D do vale, para a fumaça e o brilho da noite que o 2D já desenha)
function frame(F) {
  if (!init()) return null;
  const { W, H, dpr, cam, t } = F;
  const pw = Math.round(W * dpr), ph = Math.round(H * dpr);
  if (renderer.domElement.width !== pw || renderer.domElement.height !== ph) { renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); }
  // câmera: o centro da tela cai no ponto do chão (cx, cz) do 2D
  const s = cam.s, cx = (W / 2 - cam.x) / s, cz = (H / 2 - cam.y) / s;
  camera.left = -W / 2 / s; camera.right = W / 2 / s; camera.top = H / 2 / s * COS; camera.bottom = -H / 2 / s * COS;
  camera.position.set(cx, 60 * COS, cz + 60 * SIN); camera.up.set(0, 1, 0); camera.lookAt(cx, 0, cz); camera.updateProjectionMatrix();
  // peças: refaz só a que mudou de assinatura
  const seen = new Set();
  for (const T of F.tiles) { seen.add(T.k); let rec = tiles.get(T.k);
    if (!rec || rec.sig !== T.sig) { if (rec) { scene.remove(rec.g); dispose(rec.g); } const g = buildTile(T); scene.add(g); rec = { g, sig: T.sig }; tiles.set(T.k, rec); }
    rec.smoke = !!T.smoke;
    const g = rec.g; g.position.set(T.wx, -(T.dy || 0) / (s * TAN), T.wz); g.scale.set(T.sx || 1, T.sy || 1, T.sx || 1); g.visible = true;
    setWater(g, T.water); }
  for (const [k, rec] of tiles) if (!seen.has(k)) { scene.remove(rec.g); dispose(rec.g); tiles.delete(k); }
  // a peça escolhida, flutuando sobre a casa
  if (F.sel) { const S = F.sel; if (!ghost || ghostSig !== S.sig) { if (ghost) { scene.remove(ghost); dispose(ghost); } ghost = buildTile(S); ghostSig = S.sig; scene.add(ghost); }
    ghost.position.set(S.wx, S.lift || 0, S.wz); ghost.rotation.y = -(S.rot || 0); const k = S.scale || 1; ghost.scale.set(k, k, k); ghost.visible = true; setWater(ghost, S.water); }
  else if (ghost) ghost.visible = false;
  // luz do momento (a mesma do 2D)
  const L = F.light, night = L.night || 0, el = Math.max(0.05, L.elev || 0.5);
  rgb(L.sun, sun.color); sun.intensity = (0.4 + 2.1 * Math.min(1, el * 1.6)) * (1 - night * 0.85) * (1 - 0.45 * (L.overcast || 0));
  rgb(L.top, hemi.color); rgb(L.plain, hemi.groundColor); hemi.intensity = 0.75 + 0.35 * (L.overcast || 0) - 0.3 * night; amb.intensity = 0.12 + 0.2 * night;
  if (night > 0.4) amb.color.setRGB(0.45, 0.55, 0.9); else amb.color.setRGB(1, 1, 1);
  // sombras: o retângulo do sol cobre o vale todo
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const T of F.tiles) { x0 = Math.min(x0, T.wx); x1 = Math.max(x1, T.wx); z0 = Math.min(z0, T.wz); z1 = Math.max(z1, T.wz); }
  const bx = (x0 + x1) / 2, bz = (z0 + z1) / 2, rad = Math.max(3, Math.hypot(x1 - x0, z1 - z0) / 2 + 2), dir = L.sunDir;
  sun.target.position.set(bx, 0, bz); sun.position.set(bx + dir[0] * 40, Math.max(4, dir[1] * 40), bz + dir[2] * 40);
  const sk = rad.toFixed(1) + ':' + (F.quality || 0);
  if (sk !== shadowKey) { shadowKey = sk; const sc = sun.shadow.camera; sc.left = -rad; sc.right = rad; sc.top = rad; sc.bottom = -rad; sc.near = 1; sc.far = 120; sc.updateProjectionMatrix();
    const ms = (F.quality || 0) >= 1 ? 1024 : 2048; if (sun.shadow.mapSize.x !== ms) { sun.shadow.mapSize.set(ms, ms); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } } }
  sun.castShadow = night < 0.92;
  UNI.uTime.value = t / 1000; UNI.uWind.value = F.wind || 0.3; UNI.uNight.value = night;
  renderer.render(scene, camera);
  // chaminés e janelas no plano 2D do vale
  const chim = [], lights = [], to2d = (g, p) => { const sx = g.scale.x, x = g.position.x + p[0] * sx, y = g.position.y + p[1] * g.scale.y, z = g.position.z + p[2] * sx; return [x, z - y * TAN]; };
  for (const [, rec] of tiles) { const u = rec.g.userData; if (rec.smoke) for (const c of u.chim) chim.push(to2d(rec.g, c)); for (const l of u.lights) lights.push(to2d(rec.g, l)); }
  return { canvas: renderer.domElement, chim, lights };
}
// nível da água da peça: 1 cheia, 0 seca (o leito aparece); abaixo de 1 ela baixa e estreita no canal
function setWater(g, w) { const m = g.userData.water; if (!m) return; const v = Math.max(0, Math.min(1, w || 0));
  m.visible = v > 0.02; m.position.y = WY - BED * 0.95 * (1 - v); }

window.V3D = { frame, ok: () => init(), TAN, _buildTile: buildTile };
