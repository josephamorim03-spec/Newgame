// Os bichos com esqueleto de verdade: cada um é uma malha só (pele que dobra nas juntas, sem emenda de boneco) presa a
// ossos — corpo, pescoço, cabeça, orelhas, rabo em corrente e as pernas em três partes (braço/coxa, canela, quartela com o
// casco ou a pata; nas aves, tíbia, tarso e dedos). O movimento é calculado, não tocado de uma tabela:
//  - cada pata tem seu ciclo (andar em quatro tempos, trote em diagonal, galope) e, no apoio, fica plantada no chão do
//    mapa enquanto o corpo passa por cima; no voo da pata ela levanta num arco e a quartela dobra;
//  - as duas dobras de cada perna saem da conta do triângulo (IK de dois ossos): a perna da frente dobra o joelho para a
//    frente e a de trás dobra o jarrete para trás, como no bicho de verdade; a ave dobra o "calcanhar" para trás;
//  - o corpo inclina com o morro (frente e trás, um lado e outro) e o casco pisa no barranco certo;
//  - na água rasa cada pisada abre um anel, no seco a corrida levanta poeira; quem bebe faz anel com o beiço;
//    a capivara boia e nada; o rabo balança em corrente (espanta mosca), a orelha mexe, a galinha anda com a cabeça
//    parada no ar e dá o bote da bicada.
// Os bichos longe da câmera usam a mesma pose sem consultar o chão (economia).
import * as THREE from 'three';
import { mergeGeometries } from './addons/BufferGeometryUtils.js';
import { heightAt, waterLevelAt } from './world.js';
import { U } from './mat.js';

const col = c => (c && c.isColor) ? c.clone() : new THREE.Color(c);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const frac = v => v - Math.floor(v);
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const cfun = c => typeof c === 'function' ? c : (() => { const k = col(c); return () => k; })();

// ---------- geometria
// loft: anéis ao longo de z (corpo); cada anel tem meia-largura rx, altura de cima rt e de baixo rb, expoente e (2 elipse,
// mais = mais quadrado) e cor c(a) por ângulo; shape(x, y, a, anel) deixa esculpir (cupim, barbela, coxa)
export function loft(rings, seg = 24, shape = null, caps = true) {
  const pos = [], colA = [], uv = [], idx = [], per = seg + 1;
  rings.forEach(r => { for (let k = 0; k <= seg; k++) { const a = k / seg * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), e = r.e || 2.2;
    const sx = Math.sign(ca) * Math.pow(Math.abs(ca), 2 / e), sy = Math.sign(sa) * Math.pow(Math.abs(sa), 2 / e);
    let x = sx * r.rx, y = sy * (sa > 0 ? r.rt : r.rb); if (shape) [x, y] = shape(x, y, a, r);
    const c = cfun(r.c)(a, x, y); pos.push((r.x || 0) + x, r.y + y, r.z); colA.push(c.r, c.g, c.b); uv.push(k / seg * 2, r.z * 1.5); } });
  for (let i = 0; i + 1 < rings.length; i++) for (let k = 0; k < seg; k++) { const a = i * per + k, b = a + per; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  if (caps) for (const [ri, flip] of [[0, true], [rings.length - 1, false]]) { const r = rings[ri], c0 = pos.length / 3, c = cfun(r.c)(-Math.PI / 2, 0, 0);
    pos.push(r.x || 0, r.y, r.z); colA.push(c.r, c.g, c.b); uv.push(0.5, r.z * 1.5); for (let k = 0; k < seg; k++) { const a = ri * per + k; if (flip) idx.push(c0, a + 1, a); else idx.push(c0, a, a + 1); } }
  return finish(pos, colA, uv, idx);
}
// tubo varrido ao longo de um caminho no plano do meio (pescoço, pernas, rabo): pts [[x, y, z]], prof [{rx, rt, rb, e, c}];
// rt é o lado "da frente" do tubo (para cima no pescoço, para a frente na perna que desce)
export function tube(pts, prof, seg = 12, caps = true, shape = null) {
  const pos = [], colA = [], uv = [], idx = [], per = seg + 1;
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q0 = pts[Math.max(0, i - 1)], q1 = pts[Math.min(pts.length - 1, i + 1)];
    let ty = q1[1] - q0[1], tz = q1[2] - q0[2]; const tl = Math.hypot(ty, tz) || 1; ty /= tl; tz /= tl; const ny = tz, nz = -ty, r = prof[i];
    for (let k = 0; k <= seg; k++) { const a = k / seg * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), e = r.e || 2;
      const sx = Math.sign(ca) * Math.pow(Math.abs(ca), 2 / e), sy = Math.sign(sa) * Math.pow(Math.abs(sa), 2 / e);
      let x = sx * r.rx, v = sy * (sa > 0 ? r.rt : r.rb); if (shape) [x, v] = shape(x, v, a, r, i);
      const c = cfun(r.c)(a); pos.push(p[0] + x, p[1] + ny * v, p[2] + nz * v); colA.push(c.r, c.g, c.b); uv.push(k / seg, i / pts.length); } }
  for (let i = 0; i + 1 < pts.length; i++) for (let k = 0; k < seg; k++) { const a = i * per + k, b = a + per; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  if (caps) for (const [ri, top] of [[0, false], [pts.length - 1, true]]) { const p = pts[ri], c0 = pos.length / 3, c = cfun(prof[ri].c)(0);
    pos.push(...p); colA.push(c.r, c.g, c.b); uv.push(0.5, 0.5); for (let k = 0; k < seg; k++) { const a = ri * per + k; if (top) idx.push(c0, a, a + 1); else idx.push(c0, a + 1, a); } }
  return finish(pos, colA, uv, idx);
}
function finish(pos, colA, uv, idx) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colA, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; }
export const paintG = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3), k = col(c); for (let i = 0; i < n; i++) a.set([k.r, k.g, k.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
export const sph = (rx, ry, rz, x, y, z, c, s = 12) => paintG(new THREE.SphereGeometry(1, s, Math.max(6, Math.round(s * 0.7))).scale(rx, ry, rz).translate(x, y, z), c);

// ---------- montagem com pele: junta peças, cada vértice com até 4 ossos e pesos
function Skin() {
  const pos = [], nor = [], colA = [], uv = [], si = [], sw = [], idx = [], part = [], names = []; let cur = 0;
  const tag = n => { let i = names.indexOf(n); if (i < 0) { i = names.length; names.push(n); } cur = i; };
  function add(geo, wf, nf = null) { const g = geo; if (!g.attributes.normal) g.computeVertexNormals(); const p = g.attributes.position, n = g.attributes.normal, c = g.attributes.color, u = g.attributes.uv, base = pos.length / 3;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); pos.push(x, y, z); if (nf) { const m = nf(x, y, z, n.getX(i), n.getY(i), n.getZ(i)); nor.push(m[0], m[1], m[2]); } else nor.push(n.getX(i), n.getY(i), n.getZ(i));
      part.push(cur); colA.push(c ? c.getX(i) : 1, c ? c.getY(i) : 1, c ? c.getZ(i) : 1); uv.push(u ? u.getX(i) : 0, u ? u.getY(i) : 0);
      const w = (typeof wf === 'number' ? [[wf, 1]] : wf(x, y, z)).filter(e => e[1] > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4), s = w.reduce((a, e) => a + e[1], 0) || 1;
      for (let k = 0; k < 4; k++) { si.push(w[k] ? w[k][0] : 0); sw.push(w[k] ? w[k][1] / s : 0); } }
    if (g.index) for (const k of g.index.array) idx.push(base + k); else for (let i = 0; i < p.count; i++) idx.push(base + i); }
  // sombra embutida na pelagem: o que olha para baixo (barriga, queixo, dentro das pernas) escurece, o lombo clareia de leve;
  // dá volume ao bicho mesmo na luz em faixas
  function bakeAO() { for (let i = 0; i < colA.length / 3; i++) { const ny = nor[i * 3 + 1], f = 0.7 + 0.36 * sstep(-0.8, 0.8, ny); colA[i * 3] *= f; colA[i * 3 + 1] *= f; colA[i * 3 + 2] *= f * 0.98 + 0.02; } }
  function build(K, patFn) { const pat = patFn ? Array.from({ length: colA.length / 3 }, (_, i) => patFn(colA[i * 3], colA[i * 3 + 1], colA[i * 3 + 2])) : null; bakeAO(); const g = new THREE.BufferGeometry(); if (pat) g.setAttribute('pat', new THREE.Float32BufferAttribute(pat, 1)); g.setAttribute('position', new THREE.Float32BufferAttribute(pos.map(v => v * K), 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colA, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4)); g.setIndex(idx); g.userData.part = Uint8Array.from(part); g.userData.partNames = names.slice(); return g; }
  return { add, build, tag };
}
// ossos: posição absoluta de descanso (modelo); o local sai da diferença para o pai
function Bones() { const list = [];
  const bone = (parent, abs) => { const b = new THREE.Bone(), pp = parent ? parent.userData.abs : [0, 0, 0]; b.position.set(abs[0] - pp[0], abs[1] - pp[1], abs[2] - pp[2]); b.userData.abs = abs; if (parent) parent.add(b); b.userData.i = list.length; list.push(b); return b; };
  return { bone, list }; }
const blend = (t, t0, w, a, b) => { const k = sstep(t0 - w, t0 + w, t); return [[a, 1 - k], [b, k]]; };

// nível de detalhe da malha (segmentos em volta do corpo, das pernas e do pescoço): mais no computador, menos no celular
let DET = 1; export const setDetail = v => { DET = v; };
// ---------- quadrúpede
// S: { K, M, body: {rings, seg, shape}, neck: {pts, prof}, head: H => { H.add(geo, 'head'|'earL'|'earR'|'snout') }, ears, snout,
//      legs: [{x, z, top, L:[L1,L2,L3], prof:[[t, rx, rf, rb]], c(t, a), foot: geo (no fim da perna, em coordenadas do modelo)}] na ordem
//      [frente-esq, frente-dir, trás-esq, trás-dir] (x > 0 é o lado esquerdo do bicho), tail: {pts, prof, n} }
export function quad(S) {
  const K = S.K || 1, sk = Skin(), B = Bones(), seg = Math.round((S.seg || 26) * DET / 2) * 2;
  const bodyY = S.rootY ?? S.body.rings.reduce((a, r) => a + r.y, 0) / S.body.rings.length, root = B.bone(null, [0, bodyY, 0]);
  // os ossos do quadril e do ombro vêm antes do corpo: a pele do flanco, da coxa e da paleta segue a perna (peso que
  // diminui com a distância), em vez de ficar parada com a perna saindo de dentro dela e marcando um vinco
  const hips = S.legs.map(L => B.bone(root, [L.x, L.top, L.z]));
  // meia-largura do corpo (sem a escultura) na fatia z e na altura y; 0 se y está fora do corpo
  const RG = S.body.rings, bodyF = (z, y) => { let i = 0; while (i < RG.length - 2 && RG[i + 1].z < z) i++; const a = RG[i], b = RG[i + 1], t = clamp((z - a.z) / ((b.z - a.z) || 1), 0, 1), L = (k) => a[k] + (b[k] - a[k]) * t; const dy = y - L('y'), r = dy > 0 ? L('rt') : L('rb'); return Math.abs(dy) / r; };
  const bodyHW = (z, y) => { let i = 0; while (i < RG.length - 2 && RG[i + 1].z < z) i++; const a = RG[i], b = RG[i + 1], t = clamp((z - a.z) / ((b.z - a.z) || 1), 0, 1), L = (k) => a[k] + (b[k] - a[k]) * t;
    const cy = L('y'), dy = y - cy, r = dy > 0 ? L('rt') : L('rb'); if (Math.abs(dy) >= r) return 0; return L('rx') * Math.sqrt(1 - (dy / r) ** 2); };
  const bodyAt = z => { let i = 0; while (i < RG.length - 2 && RG[i + 1].z < z) i++; const a = RG[i], b = RG[i + 1], t = clamp((z - a.z) / ((b.z - a.z) || 1), 0, 1); return { y: a.y + (b.y - a.y) * t, rx: a.rx + (b.rx - a.rx) * t, rb: a.rb + (b.rb - a.rb) * t }; };
  const legNormal = (x, y, z, nx, ny, nz) => { const B0 = bodyAt(z), u = Math.min(0.98, Math.abs(x) / B0.rx), yb = B0.y - B0.rb * Math.sqrt(1 - u * u), k = sstep(yb - 0.14, yb + 0.03, y); if (k <= 0) return [nx, ny, nz];
    const dy = Math.min(0, y - B0.y), bx = x / (B0.rx * B0.rx), by = dy / (B0.rb * B0.rb), bl = Math.hypot(bx, by) || 1; const kk = k * sstep(0.05, 0.6, (nx * bx + ny * by) / bl); if (kk <= 0) return [nx, ny, nz]; const k2 = kk, mx = nx + (bx / bl - nx) * k2, my = ny + (by / bl - ny) * k2, mz = nz * (1 - k2), ml = Math.hypot(mx, my, mz) || 1; return [mx / ml, my / ml, mz / ml]; };
  sk.tag('corpo'); sk.add(loft(S.body.rings, seg, S.body.shape), (x, y, z) => { const out = []; let sum = 0;
    S.legs.forEach((L, i) => { const r0 = L.prof[0][1], d = Math.hypot(x - L.x, (z - L.z) * 0.8);
      const w = (1 - sstep(r0 * 0.4, r0 * 3.4, d)) * sstep(L.top + 0.3, L.top - 0.15, y) * 0.55; if (w > 0.01) { out.push([hips[i].userData.i, w]); sum += w; } });
    out.push([root.userData.i, Math.max(0.05, 1 - sum)]); return out; });
  // pescoço e cabeça: o pescoço nasce dentro do peito; perto da base a pele mistura corpo e pescoço, perto da ponta, pescoço e cabeça
  const np = S.neck.pts, neck = B.bone(root, np[0]), head = B.bone(neck, np[np.length - 1]);
  const nlen = []; let acc = 0; nlen.push(0); for (let i = 1; i < np.length; i++) { acc += Math.hypot(np[i][1] - np[i - 1][1], np[i][2] - np[i - 1][2]); nlen.push(acc); }
  const npE = np.concat([(() => { const a2 = np[np.length - 2], b2 = np[np.length - 1], dy = b2[1] - a2[1], dz = b2[2] - a2[2], l = Math.hypot(dy, dz) || 1; return [b2[0], b2[1] + dy / l * 0.05, b2[2] + dz / l * 0.05]; })()]);
  const lastP = S.neck.prof[S.neck.prof.length - 1], profE = S.neck.prof.concat([{ ...lastP, rx: lastP.rx * 0.88, rt: lastP.rt * 0.88, rb: lastP.rb * 0.88 }]);
  const ng = tube(npE, profE, seg - 6, false, S.neck.shape); const nAx = [np[0], np[np.length - 1]];
  const along = (y, z) => { const dy = nAx[1][1] - nAx[0][1], dz = nAx[1][2] - nAx[0][2], l2 = dy * dy + dz * dz; return clamp(((y - nAx[0][1]) * dy + (z - nAx[0][2]) * dz) / l2, 0, 1); };
  sk.tag('pescoco'); sk.add(ng, (x, y, z) => { const t = along(y, z); return t < 0.45 ? blend(t, 0.2, 0.2, root.userData.i, neck.userData.i) : blend(t, 0.8, 0.28, neck.userData.i, head.userData.i); });
  const hp = np[np.length - 1], ears = (S.ears || []).map(e => B.bone(head, [hp[0] + e[0], hp[1] + e[1], hp[2] + e[2]]));
  const snout = S.snout ? B.bone(head, [hp[0] + S.snout[0], hp[1] + S.snout[1], hp[2] + S.snout[2]]) : null;
  const H = { add: (geo, who = 'head') => { geo.translate(hp[0], hp[1], hp[2]); const b = who === 'earL' ? ears[0] : who === 'earR' ? ears[1] : who === 'snout' ? snout : who === 'root' ? root : head; sk.add(geo, b.userData.i); } };
  sk.tag('cabeca'); S.head(H);
  // pernas: um tubo só do alto ao casco, a pele dobrando em volta do joelho e do boleto
  const legs = S.legs.map((L, li) => { const [L1, L2, L3] = L.L, Lt = L1 + L2 + L3, x = L.x, z = L.z, top = L.top;
    const hip = hips[li]; hip.rotation.order = 'ZYX';   // balança no plano da perna (x) e depois abre o plano para o lado (z)
    const knee = B.bone(hip, [x, top - L1, z]), ank = B.bone(knee, [x, top - L1 - L2, z]);
    // o alto da perna fica por dentro do tronco (não sai pela lateral do flanco como uma coluna): a largura de cada anel é
    // limitada pela meia-largura do corpo naquela altura
    const pts = L.prof.map(p => [x, top - p[0] * Lt, z + (p[4] || 0)]), prof = L.prof.map((p, j) => { const py = top - p[0] * Lt, hw = bodyHW(z, py);
      const rx = hw > 0 ? Math.min(p[1], Math.max(hw - Math.abs(x) - 0.012, bodyF(z, py) > 0.7 ? p[1] * 0.6 : 0.015)) : p[1]; return { rx, rt: p[2] ?? p[1], rb: p[3] ?? p[1], e: 2, c: a => cfun(L.c)(p[0], a) }; });
    const t1 = L1 / Lt, t2 = (L1 + L2) / Lt;
    sk.tag('perna' + li); sk.add(tube(pts, prof, Math.round((S.legSeg || 16) * DET), false), (px, py) => { const t = (top - py) / Lt; return t < (t1 + t2) / 2 ? blend(t, t1, 0.03, hip.userData.i, knee.userData.i) : blend(t, t2, 0.025, knee.userData.i, ank.userData.i); }, legNormal);
    sk.tag('pe' + li); if (L.foot) sk.add(L.foot, ank.userData.i);
    // a pata de trás pisa um pouco atrás do quadril: no ponto em que a canela (metatarso) fica de pé com o corpo na altura de
    // descanso; o jarrete fica com ~150-160° (vaca de perna boa), em vez de a canela inclinar para a frente
    const hh = top - L3 - L2, back = li >= 2 && hh < L1 ? Math.sqrt(L1 * L1 - hh * hh) : 0;
    return { hip, knee, ank, L1: L1 * K, L2: L2 * K, L3: L3 * K, x: x * K, z: z * K, top: top * K, front: li < 2, left: x > 0, rf: L.footAngle || 0, curl: L.curl ?? 0.9, back: back * K, hz0: z * K, shift: li < 2 ? 0.36 : 0.26 }; });
  // rabo em corrente
  let tail = []; if (S.tail) { const tp = S.tail.pts, n = S.tail.n || 4; const tl = [0]; let a2 = 0; for (let i = 1; i < tp.length; i++) { a2 += Math.hypot(tp[i][1] - tp[i - 1][1], tp[i][2] - tp[i - 1][2]); tl.push(a2); }
    const at = d => { for (let i = 1; i < tp.length; i++) if (tl[i] >= d) { const k = (d - tl[i - 1]) / (tl[i] - tl[i - 1] || 1); return [tp[i - 1][0], tp[i - 1][1] + (tp[i][1] - tp[i - 1][1]) * k, tp[i - 1][2] + (tp[i][2] - tp[i - 1][2]) * k]; } return tp[tp.length - 1]; };
    let par = root; for (let i = 0; i < n; i++) { const b = B.bone(par, at(a2 * i / n)); tail.push(b); par = b; }
    const nearest = (y, z) => { let bi = 0, bd = 1e9; tp.forEach((p, i) => { const d = (p[1] - y) ** 2 + (p[2] - z) ** 2; if (d < bd) { bd = d; bi = i; } }); return tl[bi] / a2; };
    sk.tag('rabo'); sk.add(tube(tp, S.tail.prof, 12, true), (x, y, z) => { const t = nearest(y, z) * n, i = Math.min(n - 1, Math.floor(t)), f = t - i; return i + 1 < n && f > 0.7 ? [[tail[i].userData.i, 1 - (f - 0.7) / 0.6], [tail[i + 1].userData.i, (f - 0.7) / 0.6]] : [[tail[i].userData.i, 1]]; });
    if (S.tail.extra) for (const [geo, i] of S.tail.extra) sk.add(geo, tail[Math.min(n - 1, i)].userData.i); }
  sk.tag('extra'); if (S.extra) for (const [geo, who] of S.extra) sk.add(geo, (who === 'neck' ? neck : root).userData.i);
  for (const b of B.list) b.position.multiplyScalar(K);
  const mesh = new THREE.SkinnedMesh(sk.build(K, S.pat), S.M); mesh.add(root); mesh.updateMatrixWorld(true); mesh.bind(new THREE.Skeleton(B.list));
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.computeBoundingSphere(); mesh.boundingSphere.radius *= 1.6;
  const g = new THREE.Group(); g.add(mesh);
  const rest = { neck: neck.rotation.x, rootY: root.position.y };
  const zf = (legs[0].z + legs[1].z) / 2, zb = (legs[2].z + legs[3].z) / 2;
  return { g, mesh, root, neck, head, ears, snout, legs, tail, kind: 'quad', rest, zf, zb, headY: hp[1] * K, K, tailRest: S.tail ? S.tail.rest || [-1.2, 0.1] : null,
    lieDrop: S.legs.reduce((s2, l) => s2 + l.top, 0) / 4 * 0.68, bodyRings: S.body.rings, seg, beak: S.muzzle ? new THREE.Vector3(...S.muzzle).multiplyScalar(K) : null };
}

// ---------- ave: corpo em gota, pescoço em corrente de ossos (S da garça), cabeça com bico, asas dobradas que abrem,
// cauda e pernas finas com o calcanhar para trás e os dedos abertos no chão
export function ave(S) {
  const K = S.K || 1, sk = Skin(), B = Bones(), b = S.body;
  const cy = b.y, root = B.bone(null, [0, cy, 0]);
  const NR = Math.round(10 * DET) * 2, rings = []; for (let i = 0; i <= NR; i++) { const t = -1 + i / (NR / 2), k = Math.sqrt(Math.max(0, 1 - t * t)) * (t < 0 ? 1 - 0.25 * -t : 1) + (i === 0 || i === NR ? 0 : 0.02);
    rings.push({ z: t * b.rz, y: cy + t * (b.tilt || 0), rx: b.rx * k + 0.002, rt: b.ry * k + 0.002, rb: b.ry * k * 1.05 + 0.002, e: 2.1, c: a => Math.sin(a) < -0.2 ? col(b.belly || b.c) : Math.sin(a) > 0.35 ? col(b.back || b.c) : col(b.c) }); }
  sk.tag('corpo'); sk.add(loft(rings, Math.round(32 * DET)), root.userData.i);
  // pescoço: uma corrente; cada vértice vai com o osso mais perto, misturando nas juntas
  const np = S.neck.pts, nb = []; let par = root; for (let i = 0; i < np.length - 1; i++) { const bb = B.bone(par, np[i]); nb.push(bb); par = bb; }
  const head = B.bone(par, np[np.length - 1]);
  const segOf = (y, z) => { let bi = 0, bt = 0, bd = 1e9; for (let i = 0; i + 1 < np.length; i++) { const a = np[i], c = np[i + 1], dy = c[1] - a[1], dz = c[2] - a[2], l2 = dy * dy + dz * dz || 1e-6;
    const t = clamp(((y - a[1]) * dy + (z - a[2]) * dz) / l2, 0, 1), d = (a[1] + dy * t - y) ** 2 + (a[2] + dz * t - z) ** 2; if (d < bd) { bd = d; bi = i; bt = t; } } return [bi, bt]; };
  const chain = [...nb, head];
  sk.tag('pescoco'); sk.add(tube(np, np.map((p, i) => ({ rx: S.neck.r[i], rt: S.neck.r[i], rb: S.neck.r[i] * 1.05, c: S.neck.c || b.c })), 14, false), (x, y, z) => { const [i, t] = segOf(y, z);
    if (i === 0 && t < 0.3) return [[root.userData.i, 1 - t / 0.3 * 0.5], [chain[0].userData.i, t / 0.3 * 0.5 + 0.0001]];
    return t > 0.75 ? [[chain[i].userData.i, 1 - (t - 0.75) * 2], [chain[i + 1].userData.i, (t - 0.75) * 2]] : t < 0.25 && i > 0 ? [[chain[i].userData.i, 0.5 + t * 2], [chain[i - 1].userData.i, 0.5 - t * 2]] : [[chain[i].userData.i, 1]]; });
  const hp = np[np.length - 1]; const H = { add: (geo, who = 'head') => { geo.translate(hp[0], hp[1], hp[2]); sk.add(geo, head.userData.i); } }; sk.tag('cabeca'); S.head(H);
  // asas dobradas: uma folha grossa encostada em cada lado, com as primárias mais escuras cruzando sobre a cauda
  const wings = [1, -1].map(s => { const sh = B.bone(root, [s * b.rx * 0.82, cy + b.ry * 0.45, b.rz * 0.45]); const w = S.wing || {};
    const wr = []; for (let i = 0; i <= 8; i++) { const t = i / 8, z = b.rz * 0.5 - t * (b.rz * 1.55 + (w.long || 0)), k = Math.sin(Math.min(1, t * 1.15) * Math.PI) * 0.9 + 0.1;
      wr.push({ z, x: s * (b.rx * 0.86 - t * b.rx * 0.2), y: cy + b.ry * (0.4 - t * 0.25) + (b.tilt || 0) * (z / b.rz), rx: 0.012 + 0.012 * k, rt: b.ry * 0.55 * k, rb: b.ry * 0.5 * k, e: 2, c: t > 0.62 ? col(w.tip || w.c || b.back || b.c) : col(w.c || b.back || b.c) }); }
    sk.tag('asa'); sk.add(loft(wr.reverse(), 14), sh.userData.i); sh.userData.s = s; return sh; });
  // cauda
  const tb = B.bone(root, [0, cy + (b.tilt || 0) * -1 + b.ry * 0.2, -b.rz * 0.85]);
  sk.tag('rabo'); if (S.tail) { const T = S.tail, tg = new THREE.ConeGeometry(T.w, T.len, 8, 1, false).scale(1, 1, 0.3).rotateX(-Math.PI / 2 + (T.up || 0)).translate(0, cy + b.ry * 0.2 - (b.tilt || 0) + Math.sin(T.up || 0) * T.len * 0.5, -b.rz * 0.85 - T.len * 0.45 * Math.cos(T.up || 0)); sk.add(paintG(tg, T.c), tb.userData.i); }
  // pernas: tíbia (com pena em cima), tarso fino e os dedos (três para a frente, um para trás)
  const Lg = S.legs, [L1, L2, L3] = Lg.L, legs = [1, -1].map(s => { const x = s * Lg.x, top = Lg.top;
    const hip = B.bone(root, [x, top, Lg.z || 0]), knee = B.bone(hip, [x, top - L1, Lg.z || 0]), ank = B.bone(knee, [x, top - L1 - L2, Lg.z || 0]);
    const z0 = Lg.z || 0, pts = [[x, top + 0.02, z0], [x, top - L1 * 0.45, z0], [x, top - L1, z0], [x, top - L1 - 0.01, z0], [x, top - L1 - L2 * 0.5, z0], [x, top - L1 - L2, z0]];
    const r = Lg.r, prof = [Lg.th || r * 2.6, (Lg.th || r * 2.6) * 0.8, r * 1.15, r * 1.2, r, r * 1.1].map((rr, i) => ({ rx: rr, rt: rr, rb: rr, c: i < 2 && Lg.thC ? col(Lg.thC) : col(Lg.c) }));
    sk.tag('perna' + (s > 0 ? 0 : 1)); sk.add(tube(pts, prof, 10, false), (px, py) => { const t = top - py; return t < (L1 + L1 + L2) / 2 ? blend(t, L1, 0.015, hip.userData.i, knee.userData.i) : [[knee.userData.i, 1]]; });
    const fy = top - L1 - L2, toes = [];
    for (const [ax, len] of [[0, 1], [0.5, 0.85], [-0.5, 0.85], [Math.PI, 0.45]]) toes.push(paintG(new THREE.CylinderGeometry(r * 0.8, r * 0.6, L3 * len, 5).translate(0, L3 * len / 2, 0).rotateX(Math.PI / 2).rotateY(ax).translate(x, fy - r, z0), Lg.c));
    sk.tag('pe' + (s > 0 ? 0 : 1)); for (const tg of toes) sk.add(tg, ank.userData.i);
    return { hip, knee, ank, L1: L1 * K, L2: L2 * K, L3: 0, x: x * K, z: z0 * K, top: top * K, front: false, left: s > 0, rf: 0, curl: 1.1, bird: true }; });
  for (const bb of B.list) bb.position.multiplyScalar(K);
  const mesh = new THREE.SkinnedMesh(sk.build(K), S.M); mesh.add(root); mesh.updateMatrixWorld(true); mesh.bind(new THREE.Skeleton(B.list));
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.computeBoundingSphere(); mesh.boundingSphere.radius *= 1.8;
  const g = new THREE.Group(); g.add(mesh);
  return { g, mesh, root, neck: nb[0], neckChain: nb, head, legs, wings, tailB: tb, kind: 'bird', rest: { rootY: root.position.y, neckZ: nb[0].position.z }, zf: 0, zb: 0, headY: hp[1] * K, K, beak: S.beakTip ? new THREE.Vector3(...S.beakTip).multiplyScalar(K) : null };
}

// ---------- IK de dois ossos no plano da perna (z para a frente, y para cima). kneeFwd: o joelho aponta para a frente
function ik2(dz, dy, L1, L2, kneeFwd) { const d = clamp(Math.hypot(dz, dy), Math.abs(L1 - L2) + 1e-4, (L1 + L2) * 0.9995);
  const base = Math.atan2(dz, -dy), A = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)), af = kneeFwd ? base + A : base - A;
  const kz = Math.sin(af) * L1, ky = -Math.cos(af) * L1; return [af, Math.atan2(dz - kz, -(dy - ky))]; }

// ---------- os passos: deslocamento de cada pata no ciclo (0..1) e quanto do ciclo ela fica no chão
const GAITS = { walk: { off: [0.75, 0.25, 0, 0.5], duty: 0.64 },   // andar em sequência lateral: trás-esq, frente-esq, trás-dir, frente-dir
  trot: { off: [0.5, 0, 0, 0.5], duty: 0.44 }, gallop: { off: [0.42, 0.52, 0, 0.1], duty: 0.32 }, biped: { off: [0, 0.5], duty: 0.6 }, bipedRun: { off: [0, 0.5], duty: 0.38 } };
const V = new THREE.Vector3(), W = new THREE.Vector3();
const lerpA = (o, v, k) => o + (v - o) * k;

// a: o bicho (x, z, h, sp, vw, ph, stride, st, lie, rig...); look: { neck, head, yaw }; o: { fx, near, time }
export function animate(a, dt, look, o) {
  const R = a.rig, s = a.g.scale.x, near = o.near, bird = R.kind === 'bird', mv = clamp(a.sp / Math.max(0.05, a.vw), 0, 2.5);
  const Hh = R.legs.length ? (R.legs[R.legs.length - 1].L1 + R.legs[R.legs.length - 1].L2 + R.legs[R.legs.length - 1].L3) * s : 1, Fr = a.sp * a.sp / (9.8 * Hh);
  const run = bird ? Fr > 0.9 : Fr > 2.0, gk = bird ? (run ? 'bipedRun' : 'biped') : run ? 'gallop' : Fr > 0.4 ? 'trot' : 'walk', G = GAITS[gk]; a.gait = gk; a.fr = Fr;
  if (!a.goff || a.goff.length !== G.off.length) a.goff = G.off.slice(); for (let i = 0; i < G.off.length; i++) { let d = G.off[i] - a.goff[i]; d -= Math.round(d); a.goff[i] = frac(a.goff[i] + d * Math.min(1, dt * 3)); }
  a.duty = lerpA(a.duty ?? G.duty, G.duty, Math.min(1, dt * 3)); const duty = a.duty, cyc = a.ph / (Math.PI * 2);
  a.walkK = lerpA(a.walkK ?? 0, mv > 0.04 ? 1 : 0, Math.min(1, dt * 5)); const wk = a.walkK;
  // chão: a altura do corpo e a inclinação saem do chão debaixo das patas (perto da câmera)
  const ch = Math.cos(a.h), sh = Math.sin(a.h), gAt = (lx, lz) => heightAt(a.x + (sh * lz + ch * lx) * s, a.z + (ch * lz - sh * lx) * s);
  let gy, pitch = 0, roll = 0;
  const wl = waterLevelAt(a.x, a.z) - U.uWaterDrop.value, g0 = heightAt(a.x, a.z), depth = wl - g0;
  a.swim = !!a.swimmer && depth > (a.floatD || 0.4) * s;
  if (near && !a.swim) { const hf = gAt(0, R.zf), hb = gAt(0, R.zb), lx = bird ? 0.08 : Math.abs(R.legs[0].x), hl = gAt(lx * 1.5, (R.zf + R.zb) / 2), hr = gAt(-lx * 1.5, (R.zf + R.zb) / 2);
    gy = Math.min((hf + hb) / 2, Math.max(hf, hb) - 0.04 * s); if (!bird) { pitch = Math.atan2(hf - hb, (R.zf - R.zb) * s) * 0.85; roll = Math.atan2(hl - hr, lx * 3 * s) * 0.5; } }
  else gy = g0;
  // a altura do corpo sai das pernas: o mais alto em que todas alcançam o chão debaixo delas, com a da frente quase reta e o
  // jarrete de trás na dobra natural (sem isso a perna sobra, dobra no ar e parece pendurada)
  // a altura do corpo sai, a cada quadro, das pernas que estão no chão (pêndulo invertido do andar): cada uma, com a pata
  // onde ela está no passo, alcança no máximo esticada (o casco gira na ponta no fim do apoio e dá um pouco mais); o corpo
  // fica no mais alto em que todas alcançam. Assim a perna da frente fica reta no apoio e o corpo sobe e desce sozinho.
  const halfW = a.stride * a.duty / 2 / s * Math.min(1, mv * 1.6) * a.walkK;
  if (near && !a.swim) { let yb = Infinity, ybH = Infinity, ybAll = Infinity; R.legs.forEach((L, i) => { if (!L.front && (a.sitK || 0) > 0.3) return; const bk = L.back || 0, c = frac(cyc + a.goff[i % a.goff.length]), st = c < a.duty;
      const dz = st ? halfW - c / a.duty * 2 * halfW : 0, sh = (L.shift || 0) * dz, hz = (L.hz0 ?? L.hip.position.z) + sh; V.set(L.hip.position.x, 0, (L.hz0 ?? L.hip.position.z) - bk + dz); R.root.localToWorld(V);
      let hor2 = (dz - sh - bk) * (dz - sh - bk); if (st && L.pl && !L.swung && Math.hypot(L.pl.x - V.x, L.pl.z - V.z) < a.stride * 0.45) { W.copy(L.pl); W.y = V.y; R.root.worldToLocal(W); const h2 = (W.z - hz) ** 2 + (W.x - L.hip.position.x) ** 2; hor2 = Math.min(h2, ((L.L1 + L.L2) * 0.8) ** 2); V.x = L.pl.x; V.z = L.pl.z; }
      const Lf = (L.L1 + L.L2) * (L.bird ? 0.93 : 0.999) + L.L3 * 0.35 * Math.min(1, Math.abs(dz) / Math.max(halfW, 1e-3)), reach = Math.sqrt(Math.max(0, Lf * Lf - hor2));
      const ps = 0.75 * (a.sitK || 0), hy = L.hip.position.y * Math.cos(ps) + L.hip.position.z * Math.sin(ps), v = heightAt(V.x, V.z) + (L.L3 + reach) * s - (R.rest.rootY + hy) * s;
      ybAll = Math.min(ybAll, v); if (st) { if (L.front || L.bird) yb = Math.min(yb, v); else if (c / a.duty < 0.6) ybH = Math.min(ybH, v); } });   // no fim do apoio a de trás levanta o calcanhar (não puxa o corpo)
    const yy = Math.min(yb, ybH + 0.01 * s); if (isFinite(yy)) gy = yy + 0.01; else if (isFinite(ybAll)) gy = ybAll + 0.01; }
  if (a.water && !a.swim) gy = Math.max(gy, g0);
  a.gy = lerpA(a.gy ?? gy, gy, Math.min(1, dt * (near ? 30 : 10))); a.pitch = lerpA(a.pitch ?? pitch, pitch, Math.min(1, dt * 6)); a.roll = lerpA(a.roll ?? roll, roll, Math.min(1, dt * 6));
  a.lie = (a.lie || 0) + (((a.st === 'lie') ? 1 : 0) - (a.lie || 0)) * Math.min(1, dt * 1.2); const lie = a.lie;
  if (a.when) a.g.visible = a.when();
  // corpo: sobe e desce no passo (duas vezes por ciclo no andar), balança de lado, o galope embala
  const bob = bird ? Math.abs(Math.sin(cyc * Math.PI * 2)) * 0.015 * wk : (run ? Math.sin(cyc * Math.PI * 2) * 0.05 : -Math.abs(Math.sin(cyc * Math.PI * 2)) * 0.022) * wk * Math.min(1, mv);
  if (a.swim) { a.g.position.set(a.x, wl - (a.floatD || 0.4) * s, a.z); R.root.rotation.set(-0.05, 0, Math.sin(o.time * 2 + a.look) * 0.03); }
  else { a.g.position.set(a.x, a.gy - 0.01, a.z); R.root.rotation.set(-a.pitch + (run && !bird ? Math.sin(cyc * Math.PI * 2 + 1.2) * 0.07 : 0), 0, a.roll + (bird ? 0 : Math.sin(cyc * Math.PI * 2) * 0.018 * wk)); }
  a.g.rotation.y = a.h;
  // sentar (capivara, lobo, onça): o quadril desce e o corpo empina; descansar uma perna de trás: o corpo pende para ela
  a.sitK = lerpA(a.sitK || 0, a.sit ? 1 : 0, Math.min(1, dt * 1.6)); a.restK = lerpA(a.restK || 0, a.restLeg >= 0 ? 1 : 0, Math.min(1, dt * 2));
  if (!a.swim && !bird) { R.root.rotation.x -= 0.75 * a.sitK; if (a.restLeg >= 0) R.root.rotation.z += (R.legs[a.restLeg].left ? -0.035 : 0.035) * a.restK; }
  // respiração: o peito enche e esvazia (mais rápido e fundo depois de correr)
  a.pant = Math.max(0, (a.pant || 0) + (a.sp > a.vw * 1.3 ? dt : -dt * 0.12)); const br = Math.sin(o.time * (1.3 + Math.min(3, a.pant) * 1.3) + a.look) * (1 + Math.min(2, a.pant) * 0.6);
  R.root.scale.set(1 + br * 0.006, 1 + br * 0.01, 1);
  const lieDrop = lie * (R.lieDrop ?? 0.62) * R.K * (bird ? 0.4 : 1);
  R.root.position.y = R.rest.rootY + (near && !bird ? 0 : bob * R.K) - lieDrop;
  a.g.updateMatrixWorld(true);
  // pernas
  const k = Math.min(1, dt * 18), hip0 = R.root, liftH = (run ? 0.22 : 0.11) * (bird ? 0.8 : 1);
  R.legs.forEach((L, i) => { const c = frac(cyc + a.goff[i % a.goff.length]), stance = c < duty; let dz = 0, lift = 0, curl = 0;
    const half = a.stride * duty / 2 / s * Math.min(1, mv * 1.6) * wk;
    if (stance) { const u = c / duty; dz = half - u * 2 * half; } else { const u = (c - duty) / (1 - duty), e = (1 - Math.cos(u * Math.PI)) / 2; dz = -half + e * 2 * half; lift = Math.sin(u * Math.PI) * liftH * Math.min(1, mv + 0.3) * wk; curl = Math.sin(u * Math.PI) * wk; }
    if (L.hz0 != null && !L.bird) L.hip.position.z = L.hz0 + (L.shift || 0) * dz * (a.swim ? 0 : 1);
    if (a.restLeg === i && a.restK > 0.01) { dz += 0.07 * R.K * a.restK; lift += 0.05 * a.restK; curl = Math.max(curl, 0.75 * a.restK); }
    let af, bf, footF = L.rf - curl * L.curl * (L.front || L.bird ? 1 : 0.7);
    if (a.swim) { const p = o.time * 5 + i * 1.6; af = Math.sin(p) * 0.6; bf = af + (L.front ? -1 : 1) * (0.6 + Math.cos(p) * 0.5); footF = bf - 0.5; }
    else if (near) { V.set(L.hip.position.x, 0, (L.hz0 ?? L.hip.position.z) + dz - (L.back || 0)); hip0.localToWorld(V);
      // pata cravada: no apoio ela fica onde pisou (o corpo vira e anda por cima dela); só repisa se ficar longe demais
      if (stance && wk > 0.05 && !L.bird) { if (!L.pl || L.swung || Math.hypot(L.pl.x - V.x, L.pl.z - V.z) > a.stride * 0.45) { L.pl = (L.pl || new THREE.Vector3()).set(V.x, 0, V.z); L.swung = false; } V.x = L.pl.x; V.z = L.pl.z; }
      else { L.swung = true; }
      const gyF = heightAt(V.x, V.z); W.set(V.x, gyF + L.L3 * s + lift * L.top * s, V.z); hip0.worldToLocal(W);
      const ddx = W.x - L.hip.position.x, ddy = W.y - L.hip.position.y, th = Math.atan2(ddx, -ddy); L.abd = clamp(th, -0.35, 0.35);
      // se a pata cravada ficou longe demais de lado (o bicho virou), ela dá um passo para o lado (repisa no lugar certo)
      if (Math.abs(th) > 0.33 && stance && L.pl) L.swung = true;
      [af, bf] = ik2(W.z - L.hip.position.z, ddy / Math.cos(L.abd), L.L1, L.L2, L.front && !L.bird);
      // pisada: anel na água rasa ou poeira no chão seco quando corre
      if (o.fx && a.prevC && a.prevC[i] !== undefined && a.prevC[i] >= duty && stance && c < 0.25) { const wlF = waterLevelAt(V.x, V.z) - U.uWaterDrop.value;
        if (wlF > gyF + 0.03) o.fx.ripple(V.x, wlF, V.z, (0.25 + 0.25 * mv) * s); else if (run && U.uSeca.value > 0.3 && !bird) o.fx.dust(V.x, gyF, V.z, s); } }
    else { const sw = Math.sin((c - (stance ? 0 : duty)) / (stance ? duty : 1 - duty) * Math.PI) * (stance ? 1 : -1); af = -dz / Math.max(0.3, L.L1 + L.L2) * 0.9 + (L.back ? -0.4 : 0); bf = af + (L.back ? 0.75 : 0) + (L.front ? -1 : 1) * curl * 0.6; void sw; }
    if (!a.prevC) a.prevC = []; a.prevC[i] = c;
    let rh = -af, rk = -(bf - af), ra = -(footF - bf - (-R.root.rotation.x));
    if (lie > 0.01) { const fl = L.bird ? [-0.6, 1.4, -0.8] : L.front ? [-1.25, 2.2, 0.6] : [1.2, -2.3, -0.4]; rh = lerpA(rh, fl[0], lie); rk = lerpA(rk, fl[1], lie); ra = lerpA(ra, fl[2], lie); }
    if (!L.front && !L.bird && a.sitK > 0.01) { const sk = a.sitK; rh = lerpA(rh, -1.15, sk); rk = lerpA(rk, -2.35, sk); ra = lerpA(ra, 2.3, sk); }
    L.hip.rotation.z = near && !a.swim && !L.bird && lie < 0.5 ? (L.abd || 0) : L.hip.rotation.z * 0.8;
    const kj = near && !a.swim ? 1 : k; L.hip.rotation.x = lerpA(L.hip.rotation.x, rh, kj); L.knee.rotation.x = lerpA(L.knee.rotation.x, rk, kj); L.ank.rotation.x = lerpA(L.ank.rotation.x, ra, kj); });
  // pescoço e cabeça: o que o comportamento pede (pastar, beber, olhar), mais o aceno da cabeça no passo
  const nod = bird ? 0 : Math.sin(cyc * Math.PI * 4) * 0.05 * wk * (run ? 0.4 : 1), kk = Math.min(1, dt * (look.fast ? 12 : 3));
  if (bird) { const ch2 = R.neckChain, n = ch2.length; ch2.forEach((b, i) => { b.rotation.x = lerpA(b.rotation.x, (look.neck || 0) / n * (i === 0 ? 1.4 : i === n - 1 ? 0.6 : 1) + (look.strike || 0) * (i === 0 ? 0.9 : i === 1 ? -0.7 : -0.2), kk); b.rotation.y = lerpA(b.rotation.y, (look.yaw || 0) / n, Math.min(1, dt * 3)); });
    // galinha e seriema: a cabeça fica parada no ar no apoio e dá o tranco para a frente no passo
    if (a.bob) { const f = frac(cyc * 2), bz = (0.5 - (f < 0.75 ? f / 0.75 : 1 - (f - 0.75) / 0.25)) * a.bob * wk; R.neck.position.z = lerpA(R.neck.position.z, R.rest.neckZ + bz * R.K * Math.min(1, mv * 2), Math.min(1, dt * 20)); }
    R.head.rotation.x = lerpA(R.head.rotation.x, look.head || 0, kk);
    for (const w of R.wings) { const open = a.st === 'flee' ? 1 : 0; w.userData.o = lerpA(w.userData.o || 0, open, Math.min(1, dt * 4)); w.rotation.z = w.userData.s * w.userData.o * (0.5 + Math.sin(o.time * 14) * 0.35 * (a.flap || 0)); w.rotation.y = -w.userData.s * w.userData.o * 0.3; }
    R.tailB.rotation.x = Math.sin(o.time * 1.7 + a.look) * 0.05 + (a.st === 'flee' ? -0.2 : 0); }
  else { R.neck.rotation.x = lerpA(R.neck.rotation.x, (look.neck || 0) + nod, kk); R.neck.rotation.y = lerpA(R.neck.rotation.y, (look.yaw || 0) * 0.55, Math.min(1, dt * 2));
    R.head.rotation.x = lerpA(R.head.rotation.x, (look.head || 0), kk); R.head.rotation.y = lerpA(R.head.rotation.y, (look.yaw || 0) * 0.45, Math.min(1, dt * 2)); R.head.rotation.z = lerpA(R.head.rotation.z, look.tilt || 0, Math.min(1, dt * 2));
    // orelhas: mexem de vez em quando (mosca), e deitam para trás na fuga
    R.ears.forEach((e, i) => { a.earFlap = Math.max(0, (a.earFlap || 0) - dt * 1.5); const tw = (Math.sin(o.time * 0.9 + a.look * 5 + i * 2.1) > 0.94 ? Math.sin(o.time * 30) * 0.35 : 0) + Math.sin(o.time * 34 + i) * 0.5 * a.earFlap; e.rotation.x = lerpA(e.rotation.x, (a.st === 'flee' ? -0.6 : 0) + tw, Math.min(1, dt * 10)); });
    if (R.snout) R.snout.rotation.x = Math.sin(o.time * 1.3 + a.look) * 0.25;
    // rabo: a corrente acompanha a base com atraso (balanço) e espanta mosca de vez em quando; correndo, o rabo levanta
    if (R.tail.length) { const fly = Math.sin(o.time * 0.37 + a.look * 3) > 0.72 ? 1 : 0; a.fly = lerpA(a.fly || 0, fly, Math.min(1, dt * 3)); const [r0, r1] = R.tailRest;
      R.tail.forEach((b, i) => { const sw = Math.sin(o.time * (1.6 + a.fly * 5) - i * 0.75 + a.look) * (0.1 + a.fly * 0.32) * (1 + i * 0.25);
        b.rotation.x = lerpA(b.rotation.x, (i === 0 ? r0 + (run ? (a.tailUp ?? 0.7) : 0) + a.lie * 0.4 : r1) + (a.swim ? (i === 0 ? 1.0 : 0) : 0), Math.min(1, dt * 4)); b.rotation.z = lerpA(b.rotation.z, sw, Math.min(1, dt * 6)); }); } }
}
// a ponta do bico/focinho no mundo (para o anel do bebedouro e o bote da garça)
export function muzzleWorld(a, out) { const R = a.rig; out.set(0, 0, 0); if (R.beak) out.copy(R.beak); else out.set(0, -0.1 * R.K, 0.45 * R.K); return R.head.localToWorld(out); }
