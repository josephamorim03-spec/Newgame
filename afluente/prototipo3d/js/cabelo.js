// Cabelo comprido com física: o cabelo que passa da nuca não é mais uma casca dura presa na cabeça, e sim mechas — cordas de
// pontos (Verlet) presas no couro cabeludo, que caem com a gravidade, ficam para trás com a inércia quando a cabeça vira ou a
// pessoa anda, balançam com o vento e batem na cabeça, no pescoço, nos ombros e nas costas (não atravessam o corpo).
// Cada mecha é uma fita grossa (achatada: larga no sentido da cabeça, fina no sentido de fora), e as vizinhas se sobrepõem um
// pouco e ficam presas umas às outras por um elástico frouxo: de longe é uma cortina de cabelo, de perto se vê as mechas.
//
// Referenciais: a raiz e a forma de descanso ficam no espaço do osso da cabeça (origem no pivô da cabeça, a cabeça em pé);
// o corpo (tronco e pescoço) é um perfil de anéis no espaço do corpo em pé e é consultado pelo osso do peito.
import * as THREE from 'three';

const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _q = new THREE.Vector3(), _Mi = new THREE.Matrix4(), _Ci = new THREE.Matrix4(), _Md = new THREE.Matrix4();

// raizes: [{ p, d }] no espaço da cabeça (p na superfície do cabelo, d = direção em que a mecha sai, para baixo pela cabeça)
// R(ux, uy, uz): raio do crânio na direção unitária u a partir de C0 (espaço da cabeça); vol: espessura do cabelo sobre o crânio
// corpo: anéis [y, meia largura, frente, costas, cz] no espaço do corpo em pé; cabecaRest / peitoRest: onde ficam os ossos em pé
export function Mechas({ raizes, len, larg, esp = 0.012, cor, R, C0, vol = 0.014, corpo, cabecaRest, peitoRest, mat, n = 8, cachos = 0 }) {
  const S = raizes.length, N = n, K = 6, segs = raizes.map(r => len * (r.k || 1) / (N - 1));   // cada mecha no seu comprimento (as pontas não ficam cortadas à régua)   // K lados na seção da mecha
  const P = new Float32Array(S * N * 3), O = new Float32Array(S * N * 3), L = [];   // L: forma de descanso (espaço da cabeça)
  const at = (s, i) => (s * N + i) * 3;
  const c0 = new THREE.Vector3(...C0);
  // fora da cabeça: empurra o ponto (espaço da cabeça) para fora do crânio + o volume do cabelo
  const foraCabeca = (q, m) => { _v.subVectors(q, c0); const r = _v.length(); if (r < 1e-5) return false; _v.multiplyScalar(1 / r); const lim = R(_v.x, _v.y, _v.z) + m;
    if (r < lim) { q.copy(c0).addScaledVector(_v, lim); return true; } return false; };
  // fora do corpo: q no espaço do corpo em pé; anéis por altura, elipse com frente e costas
  const ys = corpo.map(r => r[0]);
  const foraCorpo = (q, m) => { if (q.y < ys[0] || q.y > ys[ys.length - 1]) return false; let j = 0; while (j < ys.length - 2 && ys[j + 1] < q.y) j++;
    const A = corpo[j], B = corpo[j + 1], t = (q.y - A[0]) / ((B[0] - A[0]) || 1), Lr = k => A[k] + (B[k] - A[k]) * t, cz = Lr(4), zz = q.z - cz, rz = (zz > 0 ? Lr(2) : Lr(3)) + m, rx = Lr(1) + m;
    const e = (q.x / rx) ** 2 + (zz / rz) ** 2; if (e >= 1 || e < 1e-8) return false; const f = 1 / Math.sqrt(e); q.x *= f; q.z = cz + zz * f; return true; };
  // forma de descanso: a mecha sai da raiz, cai e assenta na cabeça e nas costas (relaxa no espaço do corpo em pé)
  const off = new THREE.Vector3().subVectors(cabecaRest, new THREE.Vector3());   // cabeça → corpo: soma cabecaRest
  for (let s = 0; s < S; s++) { const r = raizes[s], pts = [], seg = segs[s];
    for (let i = 0; i < N; i++) pts.push(r.p.clone().addScaledVector(r.d, seg * i));
    for (let it = 0; it < 80; it++) {
      for (let i = 2; i < N; i++) pts[i].y -= 0.004;
      for (let i = 1; i < N; i++) { const a = pts[i - 1], b = pts[i]; _w.subVectors(b, a); const d = _w.length() || 1e-6; b.copy(a).addScaledVector(_w, seg / d); }
      pts[1].copy(r.p).addScaledVector(r.d, seg);
      for (let i = 2; i < N; i++) { foraCabeca(pts[i], vol + esp * 0.5); _q.copy(pts[i]).add(off); if (foraCorpo(_q, esp * 0.6 + 0.004)) pts[i].copy(_q).sub(off); } }
    L.push(pts); }
  // fita de cada mecha: K pontos por anel
  const nv = S * N * K, pos = new Float32Array(nv * 3), col = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), pat = new Float32Array(nv).fill(2), idx = [];
  const c = new THREE.Color(cor);
  for (let s = 0; s < S; s++) { const tint = 0.9 + 0.2 * ((s * 7919) % 13) / 13;   // cada mecha num tom
    for (let i = 0; i < N; i++) for (let k = 0; k < K; k++) { const v = (s * N + i) * K + k, dk = 0.88 + 0.12 * Math.abs(Math.cos(k / K * Math.PI * 2));
      col.set([c.r * tint * dk, c.g * tint * dk, c.b * tint * dk], v * 3); uv.set([s / S + k / K / S, i / N], v * 2); }
    for (let i = 0; i + 1 < N; i++) for (let k = 0; k < K; k++) { const a = (s * N + i) * K + k, b = (s * N + i) * K + (k + 1) % K, a2 = a + K, b2 = b + K; idx.push(a, a2, b, b, a2, b2); } }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setAttribute('pat', new THREE.BufferAttribute(pat, 1)); geo.setIndex(idx); geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.castShadow = true; mesh.userData.noRegua = true;
  const latRest = []; for (let i = 0; i < N; i++) { const row = []; for (let s = 0; s + 1 < S; s++) row.push(L[s][i].distanceTo(L[s + 1][i])); latRest.push(row); }

  let ok = false, temUlt = false; const ult = new THREE.Matrix4();
  const set = (A, j, q) => { A[j] = q.x; A[j + 1] = q.y; A[j + 2] = q.z; }, get = (A, j, q) => q.set(A[j], A[j + 1], A[j + 2]);
  function reinicia(H) { for (let s = 0; s < S; s++) for (let i = 0; i < N; i++) { _v.copy(L[s][i]).applyMatrix4(H); set(P, at(s, i), _v); set(O, at(s, i), _v); } ok = true; }
  // a fita: a largura vai no sentido das vizinhas, a espessura para fora da cabeça; a ponta afina
  const T = new THREE.Vector3(), Lt = new THREE.Vector3(), Nn = new THREE.Vector3(), cW = new THREE.Vector3();
  function desenha(H) { cW.copy(c0).applyMatrix4(H); const sc = Math.cbrt(Math.abs(H.determinant())) || 1;
    for (let s = 0; s < S; s++) for (let i = 0; i < N; i++) { const j = at(s, i);
      get(P, at(s, Math.min(N - 1, i + 1)), T).sub(get(P, at(s, Math.max(0, i - 1)), _v)).normalize();
      get(P, at(Math.min(S - 1, s + 1), i), Lt).sub(get(P, at(Math.max(0, s - 1), i), _v)); Lt.addScaledVector(T, -Lt.dot(T)); if (Lt.lengthSq() < 1e-10) Lt.set(1, 0, 0); Lt.normalize();
      Nn.crossVectors(T, Lt); get(P, j, _q); _w.subVectors(_q, cW); if (Nn.dot(_w) < 0) Nn.negate();
      const u = i / (N - 1), taper = (1 - 0.65 * u * u) * sc, w = larg * 0.5 * taper * (1 + 0.12 * Math.sin(s * 2.1 + u * 5) * cachos), th = esp * 0.5 * taper;
      for (let k = 0; k < K; k++) { const a = k / K * Math.PI * 2, v = ((s * N + i) * K + k) * 3;
        pos[v] = _q.x + Lt.x * Math.cos(a) * w + Nn.x * Math.sin(a) * th; pos[v + 1] = _q.y + Lt.y * Math.cos(a) * w + Nn.y * Math.sin(a) * th; pos[v + 2] = _q.z + Lt.z * Math.cos(a) * w + Nn.z * Math.sin(a) * th; } }
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals(); }

  return { mesh,
    reset() { ok = false; temUlt = false; },
    // longe da câmera: só acompanha a cabeça (sem simular)
    leva(H) { if (!ok) reinicia(H); else if (temUlt) { _Md.copy(H).multiply(_Mi.copy(ult).invert()); for (let j = 0; j < P.length; j += 3) { get(P, j, _v).applyMatrix4(_Md); set(P, j, _v); get(O, j, _v).applyMatrix4(_Md); set(O, j, _v); } }
      ult.copy(H); temUlt = true; desenha(H); },
    // H: osso da cabeça no mundo; C: osso do peito no mundo; env: { vento: Vector3 (m/s), it }
    passo(dt, H, C, env = {}) {
      if (!ok) reinicia(H);
      // a raiz e o primeiro trecho vão presos à cabeça (o cabelo sai do couro cabeludo num ângulo, não gira solto na raiz)
      for (let s = 0; s < S; s++) for (let i = 0; i < 2; i++) { _v.copy(L[s][i]).applyMatrix4(H); set(P, at(s, i), _v); set(O, at(s, i), _v); }
      const sc = Math.cbrt(Math.abs(H.determinant())) || 1, g = -9.8 * dt * dt, damp = 0.965, vt = env.vento;
      for (let s = 0; s < S; s++) for (let i = 2; i < N; i++) { const j = at(s, i), u = i / (N - 1);
        const vx = (P[j] - O[j]) * damp, vy = (P[j + 1] - O[j + 1]) * damp, vz = (P[j + 2] - O[j + 2]) * damp; O[j] = P[j]; O[j + 1] = P[j + 1]; O[j + 2] = P[j + 2];
        P[j] += vx + (vt ? vt.x * 0.9 * u * dt * dt : 0); P[j + 1] += vy + g + (vt ? vt.y * 0.5 * u * dt * dt : 0); P[j + 2] += vz + (vt ? vt.z * 0.9 * u * dt * dt : 0); }
      _Mi.copy(H).invert(); _Ci.copy(C).invert();
      const it = env.it || 4;
      for (let k = 0; k < it; k++) {
        for (let s = 0; s < S; s++) for (let i = 2; i < N; i++) { const j = at(s, i), jp = at(s, i - 1), sg = segs[s] * sc;
          // comprimento (o fio não estica)
          let dx = P[j] - P[jp], dy = P[j + 1] - P[jp + 1], dz = P[j + 2] - P[jp + 2], d = Math.hypot(dx, dy, dz) || 1e-6, e = (d - sg) / d;
          if (i === 2) { P[j] -= dx * e; P[j + 1] -= dy * e; P[j + 2] -= dz * e; } else { P[j] -= dx * e * 0.5; P[j + 1] -= dy * e * 0.5; P[j + 2] -= dz * e * 0.5; P[jp] += dx * e * 0.5; P[jp + 1] += dy * e * 0.5; P[jp + 2] += dz * e * 0.5; }
          // dobra: o cabelo tem um pouco de corpo (não dobra em ângulo fechado)
          const j2 = at(s, i - 2); dx = P[j] - P[j2]; dy = P[j + 1] - P[j2 + 1]; dz = P[j + 2] - P[j2 + 2]; d = Math.hypot(dx, dy, dz) || 1e-6;
          if (d < sg * 1.6) { e = (d - sg * 1.6) / d * 0.25; P[j] -= dx * e; P[j + 1] -= dy * e; P[j + 2] -= dz * e; }
          // vizinha: a cortina não se abre em fios soltos nem se amontoa
          if (s + 1 < S) { const q = at(s + 1, i), r0 = latRest[i][s] * sc; dx = P[q] - P[j]; dy = P[q + 1] - P[j + 1]; dz = P[q + 2] - P[j + 2]; d = Math.hypot(dx, dy, dz) || 1e-6;
            const tgt = d > r0 * 1.2 ? r0 * 1.2 : d < r0 * 0.5 ? r0 * 0.5 : d; if (tgt !== d) { e = (d - tgt) / d * 0.5 * 0.5; P[j] += dx * e; P[j + 1] += dy * e; P[j + 2] += dz * e; P[q] -= dx * e; P[q + 1] -= dy * e; P[q + 2] -= dz * e; } } }
        // colisão: cabeça (espaço da cabeça) e corpo (espaço do peito, levado ao corpo em pé)
        for (let s = 0; s < S; s++) for (let i = 2; i < N; i++) { const j = at(s, i);
          get(P, j, _q).applyMatrix4(_Mi); if (foraCabeca(_q, vol + esp * 0.5)) { _q.applyMatrix4(H); set(P, j, _q); }
          get(P, j, _q).applyMatrix4(_Ci).add(peitoRest); if (foraCorpo(_q, esp * 0.6 + 0.004)) { _q.sub(peitoRest).applyMatrix4(C); set(P, j, _q); }
          // ombro e braço (cápsulas no mundo: do ombro ao cotovelo), que se mexem com o braço
          if (env.caps) for (const [a, b, rad] of env.caps) { get(P, j, _q); _w.subVectors(b, a); const l2 = _w.lengthSq(); let t = l2 ? _v.subVectors(_q, a).dot(_w) / l2 : 0; t = Math.max(0, Math.min(1, t));
            _v.copy(a).addScaledVector(_w, t); _w.subVectors(_q, _v); const d = _w.length(), m = rad + esp * 0.6 * sc; if (d < m && d > 1e-6) { _q.copy(_v).addScaledVector(_w, m / d); set(P, j, _q); } } } }
      ult.copy(H); temUlt = true; desenha(H); } };
}
