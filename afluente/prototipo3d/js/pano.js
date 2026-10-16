// O motor de tecido: pano de verdade, feito de pontos e varetas (integração de Verlet com restrições de distância).
//
// - Cada pano é uma grade de pontos com três tipos de vareta: as da trama (vizinhos na linha e na coluna) seguram o
//   comprimento, as diagonais seguram o cisalhamento e as que pulam um ponto dão o corpo (resistência a dobrar): o brim
//   é duro e cai em pregas largas, o algodão e a chita dobram mais, o lençol é fino e leve.
// - O vento empurra cada triângulo pelo que ele tem de frente para o vento (o ar relativo na direção da normal), então o
//   pano enche, vira de lado e tremula; a gravidade puxa; o pano molhado pesa mais (balança menos), escurece e pinga.
// - Colisão com o corpo (cápsulas das coxas, canelas, quadril, barriga), com o chão, com a pedra de lavar (uma caixa) e
//   com a água (empuxo e arrasto: o pano boia e é levado).
// - O pano preso no corpo (saia, avental) anda junto com o quadril: o movimento do quadril entre um quadro e outro é
//   aplicado ao pano inteiro, e só o balanço que sobra é simulado (aguenta quadro lento sem a saia ficar para trás).
// - O varal: a corda é uma corrente de pontos presa nos dois mourões, que cede com o peso das peças; cada peça é presa por
//   prendedores de madeira (a camisa pelos ombros, a calça pelo cós, o lençol dobrado por cima da corda) e seca com o sol e
//   o vento: começa encharcada, escura e pingando, e fica leve e clara.
import * as THREE from 'three';
import { HEAD, LIGHT_END, shared, toon } from './mat.js';

// tipos de pano: massa (kg/m²), rigidez das varetas (0..1), corpo (dobra), arrasto do ar
export const TECIDO = {
  algodao: { massa: 0.14, trama: 1, cis: 0.6, dobra: 0.22, ar: 1.0 },
  chita: { massa: 0.11, trama: 1, cis: 0.55, dobra: 0.16, ar: 1.05 },
  brim: { massa: 0.32, trama: 1, cis: 0.75, dobra: 0.5, ar: 0.8 },
  lencol: { massa: 0.12, trama: 1, cis: 0.5, dobra: 0.1, ar: 1.15 },
  toalha: { massa: 0.4, trama: 1, cis: 0.7, dobra: 0.35, ar: 0.7 },
};

const _v = new THREE.Vector3(), _m = new THREE.Matrix4(), _mi = new THREE.Matrix4();
let matN = 0;
function panoMat(tex, color) {
  const uMol = { value: 0 }, m = toon({ map: tex || null, color, side: THREE.DoubleSide });
  m.onBeforeCompile = sh => { shared(sh); sh.uniforms.uMol = uMol;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp=transformed;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;uniform float uMol;\n' + HEAD)
      .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb*=mix(1.0,0.8,uWet)*mix(1.0,0.66,uMol);diffuseColor.rgb*=0.93+0.1*vnoise(vWp.xz*90.0+vWp.y*70.0);')
      .replace('#include <lights_fragment_end>', LIGHT_END('2.2')); };
  m.customProgramCacheKey = () => 'pano3' + (tex ? 1 : 0); m.userData.uMol = uMol; matN++; return m;
}

// ---------- um pano: grade de (nx+1)·(ny+1) pontos (ou nx colunas fechadas em tubo), com forma (máscara)
// posIni(i, j) dá a posição inicial (mundo) do ponto da coluna i, linha j (j = 0 em cima)
export function Pano({ nx, ny, posIni, fechado = false, mascara = null, tecido = 'algodao', tex = null, color = 0xffffff, tam = null }) {
  const T = TECIDO[tecido] || TECIDO.algodao, cols = fechado ? nx : nx + 1, N = cols * (ny + 1), at = (i, j) => j * cols + ((i % cols) + cols) % cols;
  const P = new Float32Array(N * 3), O = new Float32Array(N * 3), ativo = new Uint8Array(N), invM = new Float32Array(N).fill(1);
  const cel = (i, j) => !mascara || mascara(i, j);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (cel(i, j)) for (const [a, b] of [[i, j], [i + 1, j], [i, j + 1], [i + 1, j + 1]]) ativo[at(a, b)] = 1;
  if (nx === 0) ativo.fill(1);   // uma corda: uma coluna só de pontos
  const idx = [], uv = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i < cols; i++) uv.push(i / nx * (tam ? tam[0] * 2.5 : 3), -j / ny * (tam ? tam[1] * 2.5 : 1.4));
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (cel(i, j)) { const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1); idx.push(a, c, b, b, c, d); }
  // varetas: [a, b, comprimento, rigidez]
  const V = []; const vareta = (a, b, k) => { if (ativo[a] && ativo[b] && a !== b) V.push([a, b, 0, k]); };
  for (let j = 0; j <= ny; j++) for (let i = 0; i < cols; i++) { const a = at(i, j);
    if (fechado || i < nx) vareta(a, at(i + 1, j), T.trama); if (j < ny) vareta(a, at(i, j + 1), T.trama);
    if (j < ny && (fechado || i < nx) && cel(i, j)) { vareta(a, at(i + 1, j + 1), T.cis); vareta(at(i + 1, j), at(i, j + 1), T.cis); }
    if (fechado || i < nx - 1) vareta(a, at(i + 2, j), T.dobra); if (j < ny - 1) vareta(a, at(i, j + 2), T.dobra); }
  for (let j = 0; j <= ny; j++) for (let i = 0; i < cols; i++) { const p = posIni(i, j), k = at(i, j) * 3; P[k] = O[k] = p.x; P[k + 1] = O[k + 1] = p.y; P[k + 2] = O[k + 2] = p.z; }
  for (const v of V) { const a = v[0] * 3, b = v[1] * 3; v[2] = Math.hypot(P[a] - P[b], P[a + 1] - P[b + 1], P[a + 2] - P[b + 2]); }
  const rest = V.map(v => v[2]);
  // massa de cada ponto (área do pano em volta)
  let area = 0; for (let t = 0; t < idx.length; t += 3) { const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3; _v.set(P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]).cross(new THREE.Vector3(P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2])); area += _v.length() / 2; }
  let nAt = 0; for (let k = 0; k < N; k++) nAt += ativo[k]; const mPt = Math.max(1e-4, T.massa * area / Math.max(1, nAt));
  const geo = new THREE.BufferGeometry(), pa = new THREE.BufferAttribute(P, 3); geo.setAttribute('position', pa); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
  geo.computeVertexNormals();
  const material = panoMat(tex, color), mesh = new THREE.Mesh(geo, material); mesh.frustumCulled = false; mesh.castShadow = mesh.receiveShadow = true; mesh.userData.noRegua = true;
  const pinos = new Map();   // ponto → função que devolve o alvo (Vector3 no mundo) ou null
  const S = { mesh, geo, P, O, N, cols, nx, ny, at, ativo, V, rest, mPt, area, pinos, molhado: 0, tecido: T, enrola: 0, invM,
    pin(i, j, f) { pinos.set(at(i, j), f); }, solta(i, j) { if (i == null) pinos.clear(); else pinos.delete(at(i, j)); },
    // move o pano inteiro (posição e velocidade junto) por uma matriz (o movimento do corpo ou da mão)
    leva(M) { const e = M.elements; for (const A of [P, O]) for (let k = 0; k < N * 3; k += 3) { const x = A[k], y = A[k + 1], z = A[k + 2];
      A[k] = e[0] * x + e[4] * y + e[8] * z + e[12]; A[k + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; A[k + 2] = e[2] * x + e[6] * y + e[10] * z + e[14]; } },
    reinicia(f) { for (let j = 0; j <= ny; j++) for (let i = 0; i < cols; i++) { const p = f(i, j), k = at(i, j) * 3; P[k] = O[k] = p.x; P[k + 1] = O[k + 1] = p.y; P[k + 2] = O[k + 2] = p.z; } },
    passo(dt, env) { simula(S, dt, env); },
    centro(out = new THREE.Vector3()) { out.set(0, 0, 0); let n = 0; for (let k = 0; k < N; k++) if (ativo[k]) { out.x += P[k * 3]; out.y += P[k * 3 + 1]; out.z += P[k * 3 + 2]; n++; } return out.divideScalar(n || 1); },
  };
  return S;
}

// ---------- um passo da simulação
// env: { g (gravidade), vento: Vector3 (m/s), cap: [[a, b, r], ...] cápsulas, caixa: [{min, max}] (pedra), chao(x, z),
//        agua(x, z) → nível ou null, it (iterações), amortece }
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _n = new THREE.Vector3(), _f = new Float32Array(0);
let F = new Float32Array(0);
function simula(S, dt, env) {
  const { P, O, N, V, rest, ativo, pinos, tecido: T } = S; if (dt <= 0) return;
  dt = Math.min(dt, 1 / 30);
  if (F.length < N * 3) F = new Float32Array(N * 3); F.fill(0, 0, N * 3);
  const mol = S.molhado, m = S.mPt * (1 + 1.6 * mol), g = env.g ?? -9.8, w = env.vento || _a.set(0, 0, 0), idx = S.geo.index.array;
  // vento: força em cada triângulo pelo ar relativo na direção da normal (o pano enche e tremula)
  const kAr = 0.65 * T.ar * (1 - 0.35 * mol);
  if (w.lengthSq() > 1e-4 || env.ventoSempre) for (let t = 0; t < idx.length; t += 3) { const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const ar2 = Math.hypot(nx, ny, nz); if (ar2 < 1e-9) continue; nx /= ar2; ny /= ar2; nz /= ar2;
    const vmx = (P[a] - O[a] + P[b] - O[b] + P[c] - O[c]) / (3 * dt), vmy = (P[a + 1] - O[a + 1] + P[b + 1] - O[b + 1] + P[c + 1] - O[c + 1]) / (3 * dt), vmz = (P[a + 2] - O[a + 2] + P[b + 2] - O[b + 2] + P[c + 2] - O[c + 2]) / (3 * dt);
    const rx = w.x - vmx, ry = w.y - vmy, rz = w.z - vmz, vn = rx * nx + ry * ny + rz * nz, f = kAr * 0.5 * ar2 * vn * Math.abs(vn) / 3;
    for (const q of [a, b, c]) { F[q] += f * nx; F[q + 1] += f * ny; F[q + 2] += f * nz; } }
  // chão e água: um plano local ajustado a três amostras por passo (o pano tem poucos metros; o terreno é liso nessa escala)
  let cx = 0, cz = 0, xa = 1e9, xb = -1e9, za = 1e9, zb = -1e9, na = 0;
  for (let k = 0; k < N; k++) { if (!ativo[k]) continue; const x = P[k * 3], z = P[k * 3 + 2]; cx += x; cz += z; na++; if (x < xa) xa = x; if (x > xb) xb = x; if (z < za) za = z; if (z > zb) zb = z; }
  if (na) { cx /= na; cz /= na; }
  const local = na && xb - xa < 6 && zb - za < 6;
  let chao = env.chao;
  if (chao && local) { const g0 = chao(cx, cz), gx = chao(cx + 0.5, cz) - g0, gz = chao(cx, cz + 0.5) - g0; chao = (x, z) => g0 + 2 * (gx * (x - cx) + gz * (z - cz)); }
  let agua = env.agua;
  if (agua && local) { const w0 = agua(cx, cz); agua = () => w0; }
  const damp = env.amortece ?? 0.985, dt2 = dt * dt;
  for (let k = 0; k < N; k++) { if (!ativo[k]) continue; const i = k * 3;
    let vx = (P[i] - O[i]) * damp, vy = (P[i + 1] - O[i + 1]) * damp, vz = (P[i + 2] - O[i + 2]) * damp; let ay = g;
    const sp = Math.hypot(vx, vy, vz), vmax = 9 * dt; if (sp > vmax) { const q = vmax / sp; vx *= q; vy *= q; vz *= q; }   // um puxão grande (mão que salta) não vira explosão
    let fx = F[i] / m, fy = F[i + 1] / m, fz = F[i + 2] / m; const fa = Math.hypot(fx, fy, fz); if (fa > 60) { const q = 60 / fa; fx *= q; fy *= q; fz *= q; }
    if (agua) { const wl = agua(P[i], P[i + 2]); if (wl != null && P[i + 1] < wl) { ay += 9.8 * 1.15; vx *= 0.86; vy *= 0.8; vz *= 0.86; if (env.correnteza) { F[i] += env.correnteza.x * m * 0.6; F[i + 2] += env.correnteza.z * m * 0.6; } } }
    O[i] = P[i]; O[i + 1] = P[i + 1]; O[i + 2] = P[i + 2];
    P[i] += vx + fx * dt2; P[i + 1] += vy + (ay + fy) * dt2; P[i + 2] += vz + fz * dt2; }
  // torcer (a lavadeira torce o pano): as varetas de través encurtam, o pano vira uma corda
  const en = S.enrola, its = env.it ?? 5;
  for (let it = 0; it < its; it++) {
    for (const [k, f] of pinos) { const t = f(); if (!t) continue; const i = k * 3; P[i] = t.x; P[i + 1] = t.y; P[i + 2] = t.z; }
    for (let v = 0; v < V.length; v++) { const [a0, b0, , st] = V[v], a = a0 * 3, b = b0 * 3; let L0 = rest[v];
      if (en > 0) { const dj = Math.floor(a0 / S.cols) !== Math.floor(b0 / S.cols), di = a0 % S.cols !== b0 % S.cols; if (dj) L0 *= 1 - (di ? 0.5 : 0.8) * en; }   // o pano enrola entre as mãos
      const dx = P[b] - P[a], dy = P[b + 1] - P[a + 1], dz = P[b + 2] - P[a + 2], d = Math.hypot(dx, dy, dz) || 1e-6;
      let e = (d - L0) / d; if (st < 1 && e < 0) e *= 0.35;   // corpo: resiste mais a esticar do que a dobrar
      e *= 0.5 * st; const pa = pinos.has(a0), pb = pinos.has(b0); if (pa && pb) continue;
      const wa = pa ? 0 : pb ? 2 : 1, wb = pb ? 0 : pa ? 2 : 1;
      P[a] += dx * e * wa; P[a + 1] += dy * e * wa; P[a + 2] += dz * e * wa; P[b] -= dx * e * wb; P[b + 1] -= dy * e * wb; P[b + 2] -= dz * e * wb; }
    // colisões: cápsulas do corpo, caixas, chão
    if (env.cap || env.caixa || chao || env.perfil) for (let k = 0; k < N; k++) { if (!ativo[k] || pinos.has(k)) continue; const i = k * 3;
      if (env.perfil) colidePerfil(P, O, i, env.perfil);
      if (env.cap) for (const [A, B, r] of env.cap) { const abx = B.x - A.x, aby = B.y - A.y, abz = B.z - A.z, l2 = abx * abx + aby * aby + abz * abz || 1e-6;
        let t = ((P[i] - A.x) * abx + (P[i + 1] - A.y) * aby + (P[i + 2] - A.z) * abz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        let dx = P[i] - (A.x + abx * t), dy = P[i + 1] - (A.y + aby * t), dz = P[i + 2] - (A.z + abz * t), d = Math.hypot(dx, dy, dz);
        if (d < r) { if (d < 1e-5) { dx = 0; dy = 0; dz = 1; d = 1; } const s = (r - d) / d; P[i] += dx * s; P[i + 1] += dy * s; P[i + 2] += dz * s;
          O[i] += (P[i] - O[i]) * 0.3; O[i + 2] += (P[i + 2] - O[i + 2]) * 0.3; } }   // atrito na pele
      if (env.caixa) for (const B of env.caixa) { const x = P[i], y = P[i + 1], z = P[i + 2];
        if (x > B.min.x && x < B.max.x && z > B.min.z && z < B.max.z && y < B.max.y + 0.006 && y > B.min.y) { P[i + 1] = B.max.y + 0.006; O[i] += (P[i] - O[i]) * 0.6; O[i + 2] += (P[i + 2] - O[i + 2]) * 0.6; } }
      if (chao) { const gy = chao(P[i], P[i + 2]) + 0.008; if (P[i + 1] < gy) { P[i + 1] = gy; O[i] += (P[i] - O[i]) * 0.5; O[i + 2] += (P[i + 2] - O[i + 2]) * 0.5; } } }
  }
  for (const [k, f] of pinos) { const t = f(); if (!t) continue; const i = k * 3; P[i] = t.x; P[i + 1] = t.y; P[i + 2] = t.z; }
  // se algum ponto se perdeu (número inválido), o pano volta inteiro para perto do primeiro ponto preso, parado
  let ok = true; for (let i = 0; i < N * 3; i++) if (!Number.isFinite(P[i])) { ok = false; break; }
  if (!ok) { let a = null; for (const [, f] of pinos) { a = f(); if (a) break; } a = a || new THREE.Vector3(); for (let k = 0; k < N; k++) { const i = k * 3; P[i] = O[i] = a.x + (k % S.cols) * 0.01; P[i + 1] = O[i + 1] = a.y - Math.floor(k / S.cols) * 0.01; P[i + 2] = O[i + 2] = a.z; } }
  S.geo.attributes.position.needsUpdate = true; S.geo.computeVertexNormals(); S.geo.computeBoundingSphere();
  S.mesh.material.userData.uMol.value = mol;
}

// o corpo como pilha de anéis (y, centro z, raios por direção) no espaço do quadril: o ponto que entrou volta para fora
function colidePerfil(P, O, i, pf) { const e = pf.Mi.elements, x = P[i], y = P[i + 1], z = P[i + 2];
  let lx = e[0] * x + e[4] * y + e[8] * z + e[12], ly = e[1] * x + e[5] * y + e[9] * z + e[13], lz = e[2] * x + e[6] * y + e[10] * z + e[14]; const rows = pf.rows, m = pf.M.elements;
  // a saia não sobe por dentro do corpo acima do cós
  if (pf.teto != null && ly > pf.teto) { ly = pf.teto; P[i] = m[0] * lx + m[4] * ly + m[8] * lz + m[12]; P[i + 1] = m[1] * lx + m[5] * ly + m[9] * lz + m[13]; P[i + 2] = m[2] * lx + m[6] * ly + m[10] * lz + m[14]; }
  if (ly > rows[rows.length - 1].y || ly < rows[0].y) return;
  let j = 0; while (j < rows.length - 2 && rows[j + 1].y < ly) j++; const A = rows[j], B = rows[j + 1], t = (ly - A.y) / ((B.y - A.y) || 1), cz = A.cz + (B.cz - A.cz) * t;
  const dz = lz - cz, a = Math.atan2(dz, lx), n = A.R.length, f = ((a / (Math.PI * 2)) % 1 + 1) % 1 * n, k0 = Math.floor(f) % n, k1 = (k0 + 1) % n, u = f - Math.floor(f);
  const r = (A.R[k0] * (1 - u) + A.R[k1] * u) * (1 - t) + (B.R[k0] * (1 - u) + B.R[k1] * u) * t + pf.margem, d = Math.hypot(lx, dz);
  if (d >= r || d < 1e-6) return; const q = r / d, nx = lx * q, nz = cz + dz * q;
  P[i] = m[0] * nx + m[4] * ly + m[8] * nz + m[12]; P[i + 1] = m[1] * nx + m[5] * ly + m[9] * nz + m[13]; P[i + 2] = m[2] * nx + m[6] * ly + m[10] * nz + m[14];
  O[i] += (P[i] - O[i]) * 0.3; O[i + 2] += (P[i + 2] - O[i + 2]) * 0.3; }

// ---------- saia e avental: o pano preso na cintura, que anda com o quadril
// cint: { y (no osso do quadril), cz, R: raios da cintura em seg direções }, len: comprimento, flare: quanto abre embaixo
export function Saia({ cint, len = 0.6, flare = 0.12, arco = null, tex = null, color = 0xffffff, tecido = 'chita', strips = 22, rows = 9, folga = 0.012, cair = 0, perfil = null }) {
  const seg = cint.R.length, raio = a => { const f = ((a / (Math.PI * 2)) % 1 + 1) % 1 * seg, k = Math.floor(f), t = f - k; return cint.R[k % seg] * (1 - t) + cint.R[(k + 1) % seg] * t; };
  const fechado = !arco, ang = i => arco ? arco[0] + (arco[1] - arco[0]) * i / strips : i / strips * Math.PI * 2;
  // o raio do corpo (perfil) naquela altura e direção: a saia já nasce vestindo o quadril e a nádega
  const corpo = (y, a) => { if (!perfil || y < perfil[0].y || y > perfil[perfil.length - 1].y) return 0; let j = 0; while (j < perfil.length - 2 && perfil[j + 1].y < y) j++;
    const A = perfil[j], B = perfil[j + 1], t = (y - A.y) / ((B.y - A.y) || 1), n = A.R.length, f = ((a / (Math.PI * 2)) % 1 + 1) % 1 * n, k = Math.floor(f) % n, k2 = (k + 1) % n, u = f - Math.floor(f);
    return (A.R[k] * (1 - u) + A.R[k2] * u) * (1 - t) + (B.R[k] * (1 - u) + B.R[k2] * u) * t; };
  // a roda abre devagar no quadril e mais embaixo (curva, não reta desde o cós): a saia veste o quadril e só depois evasê
  const abre = j => flare * Math.pow(j / rows, 1.7);
  let teto = 0; const loc = (i, j) => { const a = ang(i), y = cint.y - cair - len * j / rows * 0.98; let r = raio(a) + folga + abre(j);
    if (perfil) { for (let q = 0; q <= j; q++) r = Math.max(r, corpo(cint.y - cair - len * q / rows * 0.98, a) + folga + 0.006 + 0.6 * abre(j - q)); }   // cai do mais largo do quadril para baixo
    return new THREE.Vector3(r * Math.cos(a), y, cint.cz + r * Math.sin(a)); };
  const pano = Pano({ nx: strips, ny: rows, fechado, tecido, tex, color, posIni: loc });
  let ok = false, temUlt = false; const ult = new THREE.Matrix4(), tops = [];
  for (let i = 0; i < pano.cols; i++) tops.push(loc(i, 0));
  return { mesh: pano.mesh, pano,
    reset() { ok = false; temUlt = false; },
    // hipsW: matriz do osso do quadril no mundo; env como no Pano (cápsulas das pernas, chão, vento)
    passo(dt, hipsW, env) {
      if (!ok) { pano.reinicia((i, j) => loc(i, j).applyMatrix4(hipsW)); ok = true; }
      if (temUlt) { _m.copy(hipsW).multiply(_mi.copy(ult).invert()); pano.leva(_m); } ult.copy(hipsW); temUlt = true;
      for (let i = 0; i < pano.cols; i++) { const t = tops[i].clone().applyMatrix4(hipsW); pano.pin(i, 0, () => t); }
      if (perfil) env = { ...env, perfil: { rows: perfil, M: hipsW, Mi: _mi.copy(hipsW).invert(), margem: 0.008, teto: cint.y - cair - 0.015 } };
      pano.passo(dt, env); } };
}

// ---------- o varal: a corda entre dois mourões (corrente de pontos que cede) e as peças presas com prendedores
// formas das peças (em metros): camisa pelos ombros, calça pelo cós, vestido pelos ombros, lençol dobrado por cima da corda,
// toalha e pano de prato pelas pontas
export const PECAS = {
  camisa: { w: 0.62, h: 0.72, nx: 9, ny: 10, tecido: 'algodao', mascara: (i, j, nx, ny) => j < ny * 0.38 || (i >= nx * 0.2 && i < nx * 0.8), pinos: [0.3, 0.7] },
  calca: { w: 0.46, h: 0.96, nx: 8, ny: 12, tecido: 'brim', mascara: (i, j, nx, ny) => j < ny * 0.34 || i < nx * 0.45 || i >= nx * 0.55, pinos: [0, 1] },
  vestido: { w: 0.6, h: 0.9, nx: 9, ny: 11, tecido: 'chita', mascara: (i, j, nx, ny) => { const half = 0.28 + 0.22 * j / ny; return Math.abs((i + 0.5) / nx - 0.5) < half; }, pinos: [0.32, 0.68] },
  lencol: { w: 1.1, h: 1.5, nx: 11, ny: 14, tecido: 'lencol', dobra: true },
  toalha: { w: 0.5, h: 0.85, nx: 7, ny: 10, tecido: 'toalha', pinos: [0, 1] },
  pano: { w: 0.42, h: 0.42, nx: 6, ny: 6, tecido: 'algodao', pinos: [0, 1] },
};
export function Varal({ scene, a, b, alturaChao, cor = 0xe8e0d0, pecas, madeira, fx = null }) {
  // a, b: pontas da corda (Vector3 no mundo, já na altura do amarrio)
  const NR = 22, span = a.distanceTo(b), corda = Pano({ nx: 0, ny: NR - 1, tecido: 'lencol', posIni: (i, j) => a.clone().lerp(b, j / (NR - 1)) });
  // a corda: uma coluna de pontos; o comprimento solto dá a barriga (cede ~3% sem peso)
  for (let v = 0; v < corda.rest.length; v++) corda.rest[v] *= 1.012; corda.pin(0, 0, () => a); corda.pin(0, NR - 1, () => b);
  const linhaGeo = new THREE.BufferGeometry(), lp = new Float32Array(NR * 3); linhaGeo.setAttribute('position', new THREE.BufferAttribute(lp, 3));
  const tubo = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a.clone(), b.clone()]), NR, 0.006, 4), new THREE.MeshLambertMaterial({ color: cor })); tubo.userData.noRegua = true; tubo.castShadow = true; scene.add(tubo);
  const pontoCorda = (u, out = new THREE.Vector3()) => { const f = Math.max(0, Math.min(NR - 1 - 1e-6, u * (NR - 1))), k = Math.floor(f), t = f - k, P = corda.P;
    return out.set(P[k * 3] * (1 - t) + P[k * 3 + 3] * t, P[k * 3 + 1] * (1 - t) + P[k * 3 + 4] * t, P[k * 3 + 2] * (1 - t) + P[k * 3 + 5] * t); };
  const dir = b.clone().sub(a).normalize(), lado = new THREE.Vector3(-dir.z, 0, dir.x);
  const prendGeo = new THREE.BoxGeometry(0.012, 0.07, 0.016).translate(0, -0.012, 0), prendMat = madeira || new THREE.MeshLambertMaterial({ color: 0xc8a070 });
  // as peças: cada uma tem um lugar na corda (u0..u1), forma, pano; fica escondida até a lavadeira estender
  const items = [];
  const n = pecas.length; let u = 0.06; const uLivre = 0.88 / pecas.reduce((s, p) => s + (PECAS[p.forma].dobra ? PECAS[p.forma].w * 0.6 : PECAS[p.forma].w) + 0.08, 0);
  for (const pc of pecas) { const F = PECAS[pc.forma], w = F.dobra ? F.w * 0.6 : F.w, du = w * uLivre, u0 = u, u1 = u + du; u += du + 0.08 * uLivre;
    const nx = F.nx, ny = F.ny, mask = F.mascara ? (i, j) => F.mascara(i, j, nx, ny) : null;
    // forma inicial: pendurado reto embaixo da corda (o lençol dobra no meio: as duas metades descem, uma de cada lado)
    const ini = (i, j) => { const uu = u0 + (u1 - u0) * i / nx, p = pontoCorda(uu); if (F.dobra) { const half = ny / 2, d = Math.abs(j - half) / half * F.h / 2, s = j < half ? -1 : 1; return p.addScaledVector(lado, s * (0.02 + d * 0.15)).add(new THREE.Vector3(0, -d, 0)); } return p.add(new THREE.Vector3(0, -F.h * j / ny, 0)); };
    const pano = Pano({ nx, ny, tecido: pc.tecido || F.tecido, tex: pc.tex || null, color: pc.cor ?? 0xffffff, posIni: ini, mascara: mask, tam: [F.w, F.h] });
    pano.mesh.visible = false; scene.add(pano.mesh);
    const pins = []; if (F.dobra) { for (let i = 0; i <= nx; i++) pins.push([i, Math.round(ny / 2), u0 + (u1 - u0) * i / nx]); }
    else for (const f of F.pinos) { const i = Math.round(f * nx); pins.push([i, 0, u0 + (u1 - u0) * i / nx]); }
    const prend = pins.filter((p, k) => !F.dobra || k % 4 === 0 || k === pins.length - 1).map(() => { const m = new THREE.Mesh(prendGeo, prendMat); m.visible = false; m.castShadow = true; m.userData.noRegua = true; scene.add(m); return m; });
    let vis = false; const it = { pano, forma: pc.forma, u0, u1, prend, pins, seca: 0,
      get visible() { return vis; }, set visible(v) { vis = !!v; pano.mesh.visible = vis; for (const m of prend) m.visible = vis; if (vis) { pano.reinicia(ini); pano.molhado = 1; this.pendura(); } },
      // a lavadeira estende a peça que está na mão: os cantos vão para a corda, o resto do pano vem atrás
      estende() { vis = true; pano.mesh.visible = true; for (const m of prend) m.visible = true; pano.enrola = 0; this.pendura(); },
      pendura() { pano.solta(); for (const [i, j, uu] of pins) { const t = new THREE.Vector3(); pano.pin(i, j, () => pontoCorda(uu, t).add(_v.set(0, -0.004, 0))); } },
      meio() { return pontoCorda((u0 + u1) / 2); } };
    items.push(it); }
  const tmp = new THREE.Vector3(); let acc = 0;
  return { items, n: 0, a, b, dir,
    at: i => items[Math.min(items.length - 1, i)].meio(),
    // env: { dt, vento, perto (a câmera está perto), sol (0..1), chuva (0..1), chao }
    update(env) { const dt = Math.min(env.dt, 1 / 30);
      // a corda: o peso das peças estendidas puxa os pontos onde elas estão presas
      const carga = new Float32Array(NR); for (const it of items) if (it.visible) { const kg = it.pano.mPt * it.pano.N * (1 + 1.6 * it.pano.molhado); for (const [, , uu] of it.pins) { const k = Math.round(uu * (NR - 1)); carga[k] += kg / it.pins.length; } }
      const cm = corda.mPt; corda.mPt = 0.02; const gOrig = -9.8;
      // gravidade extra nos pontos carregados: aplica como passos de queda antes das varetas
      for (let k = 1; k < NR - 1; k++) corda.P[k * 3 + 1] -= carga[k] * 9.8 * dt * dt * 2.2;
      corda.passo(dt, { g: gOrig, vento: env.vento, it: 10, amortece: 0.96 }); corda.mPt = cm;
      // tubo da corda segue os pontos
      if (env.perto || acc > 0.45) { const pts = []; for (let k = 0; k < NR; k++) pts.push(new THREE.Vector3(corda.P[k * 3], corda.P[k * 3 + 1], corda.P[k * 3 + 2])); const g2 = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), NR * 2, 0.006, 4); tubo.geometry.dispose(); tubo.geometry = g2; }
      // as peças: simula perto da câmera (longe, só a cada meio segundo), seca com sol e vento, pinga quando encharcada
      acc += env.dt; const roda = env.perto || acc > 0.5; if (roda) acc = 0;
      for (const it of items) { if (!it.visible) continue; const p = it.pano;
        if (env.chuva < 0.1) p.molhado = Math.max(0, p.molhado - env.dt * (0.0025 + 0.004 * env.sol + 0.0006 * env.ventoV));
        else p.molhado = Math.min(1, p.molhado + env.dt * 0.02 * env.chuva);
        if (roda) p.passo(env.perto ? dt : Math.min(1 / 30, 0.5), { vento: env.vento, chao: env.chao, it: 4, amortece: 0.988 });
        it.pins.forEach(([i, j], k) => { const m = it.prend[it.prend.length === it.pins.length ? k : Math.floor(k / 4)]; if (!m || (it.prend.length !== it.pins.length && k % 4 !== 0 && k !== it.pins.length - 1)) return;
          const q = p.at(i, j) * 3; m.position.set(p.P[q], p.P[q + 1] + 0.02, p.P[q + 2]); m.rotation.y = Math.atan2(dir.x, dir.z); });
        if (fx && p.molhado > 0.55 && Math.random() < env.dt * 6 * p.molhado) { const k = Math.floor(Math.random() * p.N); if (p.ativo[k] && Math.floor(k / p.cols) >= p.ny - 1) fx.emit('gota', p.P[k * 3], p.P[k * 3 + 1] - 0.02, p.P[k * 3 + 2], 1, { spread: 0.05 }); } } } };
}
