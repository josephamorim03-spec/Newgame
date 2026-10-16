// Corpo humano em uma malha só, com esqueleto, construído sobre o perfil anatômico de cada um (anatomia.js).
//
// POR BAIXO DA ROUPA, o corpo é medido: a altura de cada marco (tornozelo, joelho, virilha, quadril, cintura, peito, ombro,
// pescoço, queixo) vem do sexo e da idade (a criança tem cabeça de 1/6 da altura e perna de metade); o tronco é um tubo de
// anéis em que cada direção tem o seu raio, então cabem a bacia (mais larga na mulher), as nádegas com o sulco entre elas e
// a dobra embaixo, a lombar que entra, a crista do ilíaco, a barriga (saliente só no homem, mais no mais velho e mais
// pesado), os flancos, o peitoral, o busto (na mulher, que desce um pouco com a idade), as escápulas, o sulco da coluna, a
// corcunda de quem tem cifose, as clavículas e o trapézio. O pescoço sobe inclinado para a frente, com o
// esternocleidomastoideo, o pomo de adão no homem e a papada em quem tem.
// A CABEÇA é um crânio de verdade, desenhado por um campo de distância (crânio, testa, arco da sobrancelha, órbitas, maçã do
// rosto e arco zigomático, maxila, arcada, mandíbula com ramo, ângulo e corpo, queixo, mastoide, bochechas e papada): o
// homem tem testa inclinada, arco da sobrancelha, mandíbula larga com ângulo marcado e queixo quadrado; a mulher, testa
// reta, mandíbula mais estreita e queixo fino; a criança, crânio grande e rosto pequeno. Olhos, nariz, boca, orelhas e
// sobrancelhas são postos na superfície desse crânio. A cabeça gira na junta do crânio com a coluna (não no queixo).
// O BRAÇO sai da clavícula (que sobe e vai à frente com o braço erguido), com deltoide, bíceps, tríceps, cotovelo com o
// olécrano, antebraço que afina no punho achatado; a MÃO tem palma com as eminências do polegar e do mínimo, os nós dos
// dedos, quatro dedos de três falanges (com unha) e o polegar de três juntas, cada falange com seu osso.
// A PERNA desce da cabeça do fêmur para o joelho mais perto do meio (ângulo Q, maior na mulher), com quadríceps, a gota do
// vasto medial, a patela, a panturrilha de duas cabeças, o tendão de Aquiles e os maléolos.
// A ROUPA é uma camada por cima da pele, com folga: a casca da roupa fecha as concavidades (não entra entre as nádegas
// nem entre os seios) e cai do ponto mais saliente para baixo (a camisa desce reta da barriga e do busto, a calça cai da
// nádega para a coxa), a camisa entra na calça no cinto (que passa por baixo da barriga de quem tem), manga com bainha,
// punho dobrado ou arregaçada, calça com barra virada. Saia e avental são pano simulado (pano.js).
import * as THREE from 'three';
import { HEAD, LIGHT_END, shared, toon } from './mat.js';
import { perfil as fazPerfil } from './anatomia.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const C = c => (c && c.isColor) ? c.clone() : new THREE.Color(c);
const G = (x, s) => Math.exp(-(x * x) / (s * s));                         // sino
const Ga = (x, sUp, sDn) => Math.exp(-(x * x) / ((x > 0 ? sUp : sDn) ** 2)); // sino com os dois lados diferentes
const dA = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const sm01 = v => { v = cl(v, 0, 1); return v * v * (3 - 2 * v); };
const tab = (T, x) => { if (x <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (x <= T[i][0]) { const [x0, y0] = T[i - 1], [x1, y1] = T[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return T[T.length - 1][1]; };
const FRENTE = Math.PI / 2, COSTAS = -Math.PI / 2;

// material da pele e da roupa: cor por vértice; 'pat' diz o que é cada parte:
// 0 pele, 1 roupa estampada (chita/xadrez, usa a textura), 2 cabelo, 3 roupa lisa, 4 palha, 5 couro/sola
const patMats = new Map();
export function bodyMaterial(patTex) {
  const key = patTex ? patTex.uuid : 'liso'; if (patMats.has(key)) return patMats.get(key);
  const m = toon({ vertexColors: true, map: patTex || null });
  m.onBeforeCompile = sh => { shared(sh);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float pat;varying float vPat;varying vec3 vWp;varying vec2 vU;')
      .replace('#include <skinning_vertex>', '#include <skinning_vertex>\nvPat=pat;vU=uv;vWp=(modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vPat;varying vec3 vWp;varying vec2 vU;\n' + HEAD)
      .replace('#include <map_fragment>', `
        float printed=step(0.5,vPat)*step(vPat,1.5),isHair=step(1.5,vPat)*step(vPat,2.5),plain=step(2.5,vPat)*step(vPat,3.5),straw=step(3.5,vPat)*step(vPat,4.5),leather=step(4.5,vPat);
        float cloth=printed+plain,skin=1.0-cloth-isHair-straw-leather;
        #ifdef USE_MAP
        vec4 tx=texture2D(map,vMapUv);diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*tx.rgb,printed);
        #endif
        // pele: poros e manchinhas bem leves
        diffuseColor.rgb*=1.0+(vnoise(vU*vec2(90.0,140.0))-0.5)*0.06*skin;
        // pano: vincos que descem (no espaço do corpo em pé, não escorregam quando a pessoa anda) e a trama do tecido liso
        float fold=vnoise(vec2(vU.x*7.0,vU.y*0.9))*0.6+vnoise(vec2(vU.x*15.0+3.0,vU.y*2.2))*0.4;
        diffuseColor.rgb*=mix(1.0,0.84+0.22*fold,cloth);
        diffuseColor.rgb*=mix(1.0,0.93+0.12*vnoise(vU*vec2(170.0,260.0)),plain);
        // cabelo: fios finos, mais escuros entre as mechas, e uma faixa de brilho
        float strand=vnoise(vec2((vWp.x+vWp.z)*160.0,vWp.y*14.0))*0.6+vnoise(vec2((vWp.x-vWp.z)*70.0,vWp.y*6.0))*0.4;
        diffuseColor.rgb*=mix(1.0,0.6+0.66*strand,isHair);
        // palha trançada do chapéu
        float wv=abs(sin(vU.x*70.0+sin(vU.y*70.0)*0.6))*abs(sin(vU.y*70.0));diffuseColor.rgb*=mix(1.0,0.78+0.3*wv,straw);
        diffuseColor.rgb*=mix(1.0,0.82,uWet*(0.3+0.7*cloth));`)
      .replace('#include <lights_fragment_end>', LIGHT_END('2.4') + `
        {float hl=pow(max(0.0,1.0-abs(normal.y-0.55)*2.2),3.0)*isHair;totalEmissiveRadiance+=diffuseColor.rgb*hl*0.35*uSunC;}
        // pele: a luz que atravessa (orelha, nariz, bochecha) esquenta a sombra, em vez de cinza
        {float skn=1.0-step(0.5,vPat);totalEmissiveRadiance+=diffuseColor.rgb*vec3(0.16,0.05,0.03)*skn*(0.4+0.6*uDay);}`); };
  m.customProgramCacheKey = () => 'corpo2' + (patTex ? 1 : 0);
  patMats.set(key, m); return m;
}

// ---------- montagem: tubos de anéis (cada direção com o seu raio) + peças rígidas (cabeça, mãos, pés)
function Builder() {
  const pos = [], nor = [], col = [], uv = [], sk = [], sw = [], pat = [], idx = [];
  const bi = [0, 0, 0, 0], bw = [0, 0, 0, 0];
  const vert = (p, n, c, u, v, bones, pt) => { pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); col.push(c.r, c.g, c.b); uv.push(u, v);
    let m = 0; bw[0] = bw[1] = bw[2] = bw[3] = 0; bi[0] = bi[1] = bi[2] = bi[3] = 0;
    for (let q = 0; q < bones.length; q++) { const w = bones[q][1]; if (!(w > 1e-4)) continue; let at = m < 4 ? m++ : -1;   // os quatro ossos de mais peso
      if (at < 0) { let lo = 0; for (let r = 1; r < 4; r++) if (bw[r] < bw[lo]) lo = r; if (bw[lo] >= w) continue; at = lo; } bi[at] = bones[q][0]; bw[at] = w; }
    const s = bw[0] + bw[1] + bw[2] + bw[3] || 1; sk.push(bi[0], bi[1], bi[2], bi[3]); sw.push(bw[0] / s, bw[1] / s, bw[2] / s, bw[3] / s); pat.push(pt); return pos.length / 3 - 1; };
  // anel: { c: centro, u e w: eixos do anel (w = frente), R: raios em seg direções (a = k/seg·2π; x = cos a, frente = sen a),
  //         dy: (opcional) deslocamento em cada direção ao longo do tubo, b(k): ossos, col(k): cor, pat(k), v: coordenada de textura }
  function tube(rings, seg, capTop = false, capBot = false, perim = 1) {
    const base = pos.length / 3, per = seg + 1, n = rings.length, P = [];
    for (const r of rings) { const row = [], ax = new THREE.Vector3().crossVectors(r.u, r.w); r.ax = ax;
      for (let k = 0; k <= seg; k++) { const kk = k % seg, a = kk / seg * Math.PI * 2, R = r.R[kk];
        const p = r.c.clone().addScaledVector(r.u, R * Math.cos(a)).addScaledVector(r.w, R * Math.sin(a)); if (r.dy) p.addScaledVector(ax, r.dy[kk]); row.push(p); }
      P.push(row); }
    const ta = new THREE.Vector3(), ty = new THREE.Vector3(), nn = new THREE.Vector3(), rd = new THREE.Vector3();
    for (let i = 0; i < n; i++) { const r = rings[i];
      for (let k = 0; k <= seg; k++) { const kk = k % seg;
        ta.subVectors(P[i][(kk + 1) % seg], P[i][(kk - 1 + seg) % seg]); ty.subVectors(P[Math.min(n - 1, i + 1)][kk], P[Math.max(0, i - 1)][kk]);
        nn.crossVectors(ty, ta); rd.subVectors(P[i][kk], r.c); if (nn.dot(rd) < 0) nn.negate(); if (nn.lengthSq() < 1e-12) nn.copy(rd); nn.normalize();
        vert(P[i][k], nn, typeof r.col === 'function' ? r.col(kk) : r.col, k / seg * perim, r.v ?? r.c.y / 0.22, typeof r.b === 'function' ? r.b(kk) : r.b, typeof r.pat === 'function' ? r.pat(kk) : (r.pat || 0)); } }
    const tri = (a, b, c) => { const pa = P[Math.floor((a - base) / per)][(a - base) % per], pb = P[Math.floor((b - base) / per)][(b - base) % per], pc = P[Math.floor((c - base) / per)][(c - base) % per];
      ta.subVectors(pb, pa); ty.subVectors(pc, pa); nn.crossVectors(ta, ty); const vi = a * 3; if (nn.x * nor[vi] + nn.y * nor[vi + 1] + nn.z * nor[vi + 2] < 0) idx.push(a, c, b); else idx.push(a, b, c); };
    for (let i = 0; i + 1 < n; i++) for (let k = 0; k < seg; k++) { const a = base + i * per + k, b = a + per; tri(a, a + 1, b); tri(a + 1, b + 1, b); }
    const cap = (ri, top) => { const r = rings[ri], ctr = r.c.clone(), dir = r.ax.clone().multiplyScalar(top === (ri === n - 1) ? 1 : -1);
      if (n > 1) { const o = rings[ri === 0 ? 1 : n - 2].c; dir.subVectors(r.c, o).normalize(); }
      const c = vert(ctr, dir, typeof r.col === 'function' ? r.col(0) : r.col, 0.5, 0.5, typeof r.b === 'function' ? r.b(0) : r.b, typeof r.pat === 'function' ? r.pat(0) : (r.pat || 0));
      for (let k = 0; k < seg; k++) { const a = base + ri * per + k; ta.subVectors(P[ri][k + 1], ctr); ty.subVectors(P[ri][k], ctr); nn.crossVectors(ta, ty); if (nn.dot(dir) < 0) idx.push(c, a + 1, a); else idx.push(c, a, a + 1); } };
    if (capTop) cap(n - 1, true); if (capBot) cap(0, false);
  }
  // peça rígida (geometria pronta) presa a um osso (ou a vários, com pesos); se a geometria tiver cor por vértice, ela vale
  function rigid(geo, c, bone, pt = 0) { if (!geo.attributes.normal || geo.userData.renorm !== false) geo.computeVertexNormals();
    const p = geo.attributes.position, n = geo.attributes.normal, u = geo.attributes.uv, cc = geo.attributes.color;
    const base = pos.length / 3, c0 = C(c), tc = new THREE.Color(), bb = Array.isArray(bone) ? bone : [[bone, 1]];
    for (let i = 0; i < p.count; i++) vert(V(p.getX(i), p.getY(i), p.getZ(i)), V(n.getX(i), n.getY(i), n.getZ(i)), cc ? tc.setRGB(cc.getX(i), cc.getY(i), cc.getZ(i)) : c0, u ? u.getX(i) : 0, u ? u.getY(i) : 0, bb, pt);
    if (geo.index) { const ix = geo.index; for (let i = 0; i < ix.count; i++) idx.push(base + ix.getX(i)); } else for (let i = 0; i < p.count; i++) idx.push(base + i); }
  function build() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('pat', new THREE.Float32BufferAttribute(pat, 1));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sk, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4)); g.setIndex(idx); return g; }
  return { tube, rigid, build };
}
// uma peça de geometria orientada: cápsula do ponto a até o ponto b (raio r)
function capsAB(a, b, r, rs = 6, cs = 3) { const d = new THREE.Vector3().subVectors(b, a), L = d.length(), g = new THREE.CapsuleGeometry(r, Math.max(1e-4, L), cs, rs);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize())); g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); return g; }
// a casca convexa de um anel (fecha as concavidades: entre as nádegas, entre os seios, o sulco da coluna)
function casca(R) { const n = R.length, X = new Float64Array(n), Z = new Float64Array(n);
  for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; X[k] = R[k] * Math.cos(a); Z[k] = R[k] * Math.sin(a); }
  // o anel é estrelado em volta do centro: a casca é a subsequência dos pontos que não fazem curva para dentro (varredura de Graham)
  let st = 0; for (let k = 1; k < n; k++) if (R[k] > R[st]) st = k;
  const H = [st]; for (let q = 1; q <= n; q++) { const k = (st + q) % n;
    while (H.length >= 2) { const o = H[H.length - 2], a = H[H.length - 1]; if ((X[a] - X[o]) * (Z[k] - Z[o]) - (Z[a] - Z[o]) * (X[k] - X[o]) <= 0) H.pop(); else break; }
    if (q < n) H.push(k); }
  const out = new Float32Array(n); for (let h = 0; h < H.length; h++) { const i = H[h], j = H[(h + 1) % H.length]; out[i] = R[i];
    for (let q = 1; ; q++) { const k = (i + q) % n; if (k === j) break; const a = k / n * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a), ex = X[j] - X[i], ez = Z[j] - Z[i], den = dx * ez - dz * ex;
      out[k] = Math.abs(den) < 1e-12 ? R[k] : Math.max(R[k], (X[i] * ez - Z[i] * ex) / den); } }
  return out; }

// ---------- o tronco: anéis base (meia-largura, frente, costas, deslocamento do centro, expoente da superelipse) nos marcos
// do homem e da mulher (metros, corpo de 1,70)
const TOR = {
  m: [[0.795, 0.088, 0.06, 0.066, -0.004, 2.0], [0.82, 0.15, 0.088, 0.1, -0.01, 2.1], [0.86, 0.162, 0.093, 0.108, -0.014, 2.1], [0.90, 0.166, 0.095, 0.11, -0.014, 2.15],
    [0.95, 0.163, 0.097, 0.103, -0.01, 2.15], [1.00, 0.156, 0.098, 0.094, -0.004, 2.2], [1.05, 0.148, 0.098, 0.088, 0.002, 2.25], [1.10, 0.151, 0.101, 0.088, 0.006, 2.25],
    [1.16, 0.16, 0.107, 0.093, 0.008, 2.3], [1.22, 0.16, 0.112, 0.099, 0.01, 2.35], [1.28, 0.165, 0.113, 0.104, 0.01, 2.35], [1.33, 0.167, 0.107, 0.106, 0.006, 2.3],
    [1.37, 0.162, 0.097, 0.101, 0.0, 2.2], [1.40, 0.143, 0.083, 0.09, -0.006, 2.1], [1.425, 0.118, 0.07, 0.075, -0.008, 2.0], [1.445, 0.072, 0.06, 0.062, -0.006, 2.0]],
  f: [[0.79, 0.092, 0.06, 0.068, -0.004, 2.0], [0.815, 0.167, 0.088, 0.104, -0.012, 2.1], [0.85, 0.182, 0.093, 0.114, -0.018, 2.1], [0.885, 0.188, 0.094, 0.116, -0.02, 2.15],
    [0.93, 0.18, 0.094, 0.107, -0.016, 2.15], [0.98, 0.162, 0.093, 0.096, -0.008, 2.2], [1.03, 0.14, 0.09, 0.086, 0.0, 2.2], [1.065, 0.131, 0.088, 0.083, 0.004, 2.2],
    [1.11, 0.135, 0.091, 0.083, 0.008, 2.25], [1.16, 0.143, 0.096, 0.087, 0.012, 2.3], [1.21, 0.149, 0.1, 0.091, 0.012, 2.3], [1.27, 0.155, 0.1, 0.094, 0.01, 2.3],
    [1.32, 0.152, 0.097, 0.095, 0.006, 2.25], [1.36, 0.148, 0.088, 0.091, 0.0, 2.2], [1.39, 0.132, 0.077, 0.083, -0.005, 2.1], [1.418, 0.106, 0.065, 0.069, -0.007, 2.0], [1.44, 0.064, 0.054, 0.056, -0.005, 2.0]],
};
function anelBase(T, y) { let i = 1; while (i < T.length - 1 && y > T[i][0]) i++; const a = T[i - 1], b = T[i], t = cl((y - a[0]) / (b[0] - a[0]), 0, 1); return a.map((v, j) => v + (b[j] - v) * t); }
const superR = (a, W, Fr, Bk, e) => { const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a)), Dd = Math.sin(a) >= 0 ? Fr : Bk; return 1 / Math.pow(Math.pow(c / W, e) + Math.pow(s / Dd, e), 1 / e); };

// relevo anatômico do tronco (o que soma ao anel base): y nos marcos da tabela, a o ângulo (frente = π/2)
function relevo(P, y, a) {
  const F = P.F, Fp = Math.max(0, F), M = P.M, f = P.f, kid = P.kid; let r = 0;
  const lado = s => Math.abs(dA(a, s));
  if (!kid) {
    // nádegas (glúteo máximo), com o sulco entre elas e a dobra embaixo bem marcada
    const gA = f ? 0.022 + 0.014 * Math.max(0, F + 0.3) : 0.01 + 0.007 * M + 0.005 * Fp, gy = f ? 0.86 : 0.875;
    for (const s of [-1, 1]) r += gA * G(dA(a, COSTAS + s * 0.52), 0.42) * Ga(y - gy, 0.065, 0.03);
    r -= (0.01 + 0.4 * gA) * G(dA(a, COSTAS), 0.085) * Ga(y - gy, 0.07, 0.05);
  } else { for (const s of [-1, 1]) r += 0.008 * G(dA(a, COSTAS + s * 0.5), 0.45) * Ga(y - 0.87, 0.06, 0.03); r -= 0.006 * G(dA(a, COSTAS), 0.09) * G(y - 0.86, 0.05);
    r += (0.007 + 0.006 * Fp) * G(dA(a, FRENTE), 0.9) * G(y - 1.02, 0.07); }   // barriguinha de criança
  if (P.m) {
    r += (0.065 * P.barriga + 0.006 * Fp) * G(dA(a, FRENTE), 0.95) * Ga(y - 1.005, 0.1, 0.065);            // barriga (gordura visceral)
    for (const s of [-1, 1]) r += (0.008 * Fp + 0.01 * P.barriga) * G(dA(a, COSTAS + s * 1.25), 0.45) * G(y - 1.02, 0.04);   // flancos
    for (const s of [-1, 1]) r += (0.006 + 0.012 * M + 0.005 * Math.max(0, F - 0.4)) * G(dA(a, FRENTE + s * 0.55), 0.38) * Ga(y - 1.262, 0.06, 0.03);   // peitoral
    for (const s of [-1, 1]) r += 0.006 * M * G(dA(a, COSTAS + s * 0.95), 0.35) * G(y - 1.22, 0.08);          // dorsal (o V das costas)
    for (const s of [-1, 1]) r += 0.006 * M * G(dA(a, COSTAS + s * 0.8), 0.5) * G(y - 1.415, 0.02);           // trapézio
    for (const s of [-1, 1]) r += 0.003 * (1 - Fp) * G(dA(a, FRENTE + s * 0.35), 0.2) * G(y - 1.0, 0.02);     // crista do ilíaco
  }
  if (f) {
    for (const s of [-1, 1]) r += (0.004 + 0.012 * Fp) * G(lado(s > 0 ? 0 : Math.PI), 0.5) * G(y - 0.84, 0.05);   // quadril (culote)
    const tam = cl(0.03 + 0.012 * F, 0.024, 0.052), sag = cl((P.idade - 35) / 40, 0, 1), by = 1.222 - 0.014 * sag - 0.25 * (tam - 0.03);
    for (const s of [-1, 1]) r += tam * G(dA(a, FRENTE + s * 0.47), 0.3) * Ga(y - by, 0.075, 0.04 + 0.01 * sag);   // seios
    r += 0.004 * Fp * G(dA(a, FRENTE), 0.9) * G(y - 0.97, 0.05);                                                 // ventre (sem barriga)
  }
  // escápulas, sulco da coluna, cifose (corcunda), clavículas, gordura que cobre tudo um pouco
  for (const s of [-1, 1]) r += (0.003 + 0.004 * M) * (kid ? 0.5 : 1) * G(dA(a, COSTAS + s * 0.62), 0.3) * G(y - 1.31, 0.065);
  r -= 0.004 * (1 - 0.5 * Fp) * G(dA(a, COSTAS), 0.07) * G(y - 1.18, 0.16);
  r += P.cifose * 0.07 * G(dA(a, COSTAS), 1.1) * G(y - 1.33, 0.08);
  for (const s of [-1, 1]) r += 0.003 * G(dA(a, FRENTE + s * 0.5), 0.35) * G(y - 1.408, 0.008);
  r += 0.005 * F * (P.m ? 1 + 0.4 * G(y - 1.04, 0.1) : 1 + 0.4 * G(y - 0.88, 0.08)) * (1 - G(y - 1.44, 0.03));
  return r;
}

// ossos: índices fixos de cada parte (dedos e polegar entram depois)
export function buildBody(s) {
  const P = s.perfil || (s.perfil = fazPerfil(s)), kid = P.kid, f = P.f, L = P.L, med = P.med;
  const skin = C(s.skin), top = C(s.top.color || 0xffffff), bot = C(s.bottom.color || 0xffffff), shoe = C(s.shoes || 0x3a2a20), hairC = C(s.hairColor);
  const topPat = s.top.tex ? 1 : 3, botPat = s.bottom.tex ? 1 : 3, dressTop = !!s.dress;
  const [, yAnk, yKnee, yCrotch, yHipJ, , yWaist, , yShJ, yNeck, yChin] = L;
  const deTab = P.deTab, paraTab = P.paraTab;
  const bd = Builder();
  // ---------- esqueleto (pose de descanso: em pé, braços caídos); as posições de cada osso no corpo
  const bones = [], W = {}, mk = (name, parent, w) => { const b = new THREE.Bone(); b.name = name; W[name] = w.clone(); b.position.copy(parent ? w.clone().sub(W[parent.name]) : w); if (parent) parent.add(b); bones.push(b); b.userData.i = bones.length - 1; return b; };
  const hips = mk('hips', null, V(0, yHipJ + 0.05, 0)), spine = mk('spine', hips, V(0, deTab(1.0), -0.04)), chest = mk('chest', spine, V(0, deTab(1.16), -0.045));
  const neck = mk('neck', chest, V(0, yNeck - 0.005, -0.03)), headPiv = V(0, 0.085, -0.005), head = mk('head', neck, V(0, yChin, 0).add(headPiv));
  const I = b => b.userData.i;
  const shX = med.ombroX, Lu = med.braco, Lf = med.antebraco;
  const arms = [-1, 1].map(sx => { const tag = sx < 0 ? 'D' : 'E';
    const clav = mk('clav' + tag, chest, V(sx * 0.022, yShJ + 0.008, 0.055)), sh = mk('sh' + tag, clav, V(sx * shX, yShJ, -0.008));
    const el = mk('el' + tag, sh, W['sh' + tag].clone().add(V(sx * 0.02 * Lu / 0.29, -Lu, 0))), wr = W['el' + tag].clone().add(V(sx * 0.018 * Lf / 0.255, -Lf, 0));
    const tw = mk('tw' + tag, el, W['el' + tag].clone().lerp(wr, 0.5)), ha = mk('ha' + tag, tw, wr); ha.rotation.order = 'YXZ';
    return { sx, clav, sh, el, tw, ha, tag }; });
  const legs = [-1, 1].map(sx => { const tag = sx < 0 ? 'D' : 'E';
    const hp = mk('hp' + tag, hips, V(sx * med.quadrilX, yHipJ, 0)), kn = mk('kn' + tag, hp, V(sx * med.joelhoX, yKnee, 0.003)), ft = mk('ft' + tag, kn, V(sx * med.tornX, yAnk, -0.006));
    return { sx, hp, kn, ft, tag }; });
  // dedos: em cada mão, quatro dedos de três falanges e o polegar de três juntas
  const hs = med.mao / 0.19;
  const DED = { z: [0.026, 0.0085, -0.009, -0.025], y: [-0.094, -0.097, -0.093, -0.084], len: [0.088, 0.098, 0.092, 0.072], r: [0.0088, 0.0092, 0.0086, 0.0076] }, FAL = [0.49, 0.29, 0.22];
  for (const a of arms) { const sx = a.sx, w0 = W['ha' + a.tag];
    a.dedos = [0, 1, 2, 3].map(j => { const k = V(sx * 0.001, DED.y[j] * hs, DED.z[j] * hs).add(w0), l = DED.len[j] * hs;
      const f1 = mk('f1' + a.tag + j, a.ha, k), f2 = mk('f2' + a.tag + j, f1, k.clone().add(V(0, -l * FAL[0], 0))), f3 = mk('f3' + a.tag + j, f2, W[f2.name].clone().add(V(0, -l * FAL[1], 0)));
      f3.userData.tip = W[f3.name].clone().add(V(0, -l * FAL[2], 0)); return [f1, f2, f3]; });
    const dir = V(-sx * 0.3, -0.84, 0.45).normalize(), c0 = V(-sx * 0.006, -0.014, 0.02).multiplyScalar(hs).add(w0);
    const t1 = mk('t1' + a.tag, a.ha, c0), t2 = mk('t2' + a.tag, t1, c0.clone().addScaledVector(dir, 0.042 * hs)), t3 = mk('t3' + a.tag, t2, W[t2.name].clone().addScaledVector(dir, 0.031 * hs));
    t3.userData.tip = W[t3.name].clone().addScaledVector(dir, 0.026 * hs);
    a.polegar = [t1, t2, t3]; a.polegar.dir = dir;
    a.polegar.flexAx = new THREE.Vector3().crossVectors(dir, V(-sx * 0.35, -0.15, -0.92).normalize()).normalize();   // dobra para dentro da palma
    a.polegar.abdAx = new THREE.Vector3().crossVectors(dir, V(-sx, 0, 0)).normalize();                               // afasta da palma
    a.polegar.opAx = dir.clone(); }

  // ---------- roupa: o que veste cada pedaço
  const shawl = s.warm && f ? C(s.warmColor || 0x8a4a3a) : null, jacket = s.warm && !f ? C(s.warmColor || 0x5a4a3a) : null;
  const tucked = !f && !kid && !dressTop;                  // camisa dentro da calça, com cinto
  const belly = P.barriga, pants = !s.skirt;
  // altura do cinto (cós da calça) em cada direção: passa por baixo da barriga na frente
  const beltY0 = deTab(f ? 1.0 : 0.985), beltDrop = 0.03 * belly + (P.m ? 0.004 : 0);
  const beltY = a => beltY0 - beltDrop * Math.max(0, Math.sin(a)) ** 2;
  const topBottom = s.skirt ? deTab(f ? 0.92 : 0.95) : tucked ? -1 : deTab(f ? 0.93 : 0.94);   // até onde desce a blusa por cima
  const decote = a => { const fr = Math.max(0, Math.sin(a)) ** 2; if (jacket || shawl) return yNeck - 0.01 - 0.02 * fr;
    return yNeck - 0.008 - fr * (dressTop ? 0.07 : f ? 0.05 : s.shirt === 'camiseta' || kid ? 0.014 : 0.035); };
  // o que veste o ponto (y, a) do tronco: 'pele', 'cima' (camisa, blusa, vestido) ou 'baixo' (calça)
  const veste = (y, a) => { if (y >= decote(a)) return 'pele'; if (jacket && y >= deTab(0.9)) return 'agasalho'; if (shawl && y >= deTab(1.16)) return 'xale';
    if (dressTop) return 'cima'; if (pants && y < beltY(a)) return (!tucked && topBottom > 0 && y >= topBottom) ? 'cima' : 'baixo';
    if (!pants && y < deTab(1.0)) return 'cima'; return 'cima'; };
  const folga = { cima: s.shirt === 'camiseta' || kid ? 0.005 : f ? 0.006 : 0.008, baixo: 0.006, agasalho: 0.014, xale: 0.012 };

  // ---------- tronco
  const SEG = 32, T = TOR[P.tk];
  const ringsY = (P.tk === 'f' ? [0.79, 0.805, 0.825, 0.845, 0.865, 0.885, 0.905, 0.93, 0.955, 0.98, 1.005, 1.03, 1.055, 1.08, 1.11, 1.14, 1.17, 1.195, 1.22, 1.245, 1.27, 1.295, 1.32, 1.345, 1.365, 1.385, 1.4, 1.415, 1.428, 1.44]
    : [0.795, 0.81, 0.83, 0.85, 0.87, 0.89, 0.91, 0.935, 0.96, 0.985, 1.01, 1.035, 1.06, 1.085, 1.11, 1.14, 1.17, 1.2, 1.225, 1.25, 1.275, 1.3, 1.325, 1.35, 1.37, 1.39, 1.405, 1.42, 1.432, 1.445]);
  const kidW = yT => kid ? (yT > 1.15 ? 0.9 : yT > 0.95 ? 0.98 : 0.92) : 1, fr = P.fr;
  const torso = ringsY.map(yT => { const [, Wd, Fr, Bk, cz, e] = anelBase(T, yT), y = deTab(yT), w = Wd * fr * kidW(yT), fd = Fr * (0.5 + 0.5 * fr), bk = Bk * (0.5 + 0.5 * fr);
    const R = new Float32Array(SEG); for (let k = 0; k < SEG; k++) { const a = k / SEG * Math.PI * 2; R[k] = superR(a, w, fd, bk, e) + relevo(P, yT, a); }
    return { yT, y, cz, R }; });
  // camadas de roupa: casca + folga; a de cima cai do mais saliente para baixo, a de baixo cai da nádega para a coxa
  for (const r of torso) { const H = casca(r.R); r.Rc = {}; for (const g of ['cima', 'baixo', 'agasalho', 'xale']) { const o = new Float32Array(SEG); for (let k = 0; k < SEG; k++) o[k] = Math.max(H[k] + folga[g], r.R[k] + 0.002); r.Rc[g] = o; } }
  const cai = (g, slope, from, to) => { for (let i = from; i !== to; i += Math.sign(to - from)) { const r = torso[i], up = torso[i - Math.sign(to - from)], dy = Math.abs(up.y - r.y);
      for (let k = 0; k < SEG; k++) { const a = k / SEG * Math.PI * 2; if (g === 'cima' && tucked && r.y < beltY(a) + 0.035) continue;
        const lim = g === 'baixo' ? sm01(-Math.sin(a) * 2.5) : 1;   // a calça cai da nádega; na frente ela acompanha a virilha
        r.Rc[g][k] = Math.max(r.Rc[g][k], r.Rc[g][k] + (up.Rc[g][k] - slope * dy - r.Rc[g][k]) * lim); } } };
  cai('cima', dressTop || f ? 0.24 : 0.34, torso.length - 2, -1); cai('agasalho', 0.3, torso.length - 2, -1); cai('xale', 0.25, torso.length - 2, -1);
  { let ib = torso.findIndex(r => r.y >= beltY0); if (ib < 1) ib = 1; cai('baixo', 0.3, ib - 1, -1); }
  if (!tucked) for (const r of torso) if (r.y < beltY0 + 0.04) for (let k = 0; k < SEG; k++) r.Rc.cima[k] = Math.max(r.Rc.cima[k], r.Rc.baixo[k] + 0.004);   // blusa por fora cobre a calça
  // ossos do tronco: bacia → lombar → torácica; nádega e virilha acompanham um pouco a coxa; o alto do ombro, a clavícula
  const ySp = W.spine.y, yCh = W.chest.y;
  const pesoTronco = (y, a, R) => { const out = []; let wh = 1, wsp = 0, wch = 0;
    if (y > ySp - 0.05) { const t = sm01((y - (ySp - 0.05)) / 0.12); wh = 1 - t; wsp = t; }
    if (y > yCh - 0.02) { const t = sm01((y - (yCh - 0.02)) / 0.1); wch = t * wsp; wsp -= wch; }
    // coxa: abaixo da junta do quadril a pele da nádega e da virilha vai com o fêmur
    const wl = 0.45 * sm01((yHipJ + 0.03 - y) / 0.09), x = Math.cos(a), ww = [wl * sm01(0.5 - 2 * x), wl * sm01(0.5 + 2 * x)];
    wh -= ww[0] + ww[1]; out.push([I(legs[0].hp), ww[0] * (1)], [I(legs[1].hp), ww[1]]);
    // ombro: alto e lado de fora vão com a clavícula (e um pouco com o úmero); a axila abre com o braço
    const ax = Math.abs(R * Math.cos(a)), side = Math.cos(a) > 0 ? 1 : 0, A = arms[side];
    const wc = 0.65 * sm01((y - (yShJ - 0.09)) / 0.06) * sm01((ax - 0.1) / 0.06), wsh = 0.22 * sm01((y - (yShJ - 0.16)) / 0.05) * sm01((ax - 0.135) / 0.04);
    const wTop = Math.min(wch, wc + wsh); wch -= wTop; if (wTop > 0) { const k = wTop / ((wc + wsh) || 1); out.push([I(A.clav), wc * k], [I(A.sh), wsh * k]); }
    out.push([I(hips), Math.max(0, wh)], [I(spine), wsp], [I(chest), wch]); return out; };
  const corDe = (g, y) => { const ao = y < yCrotch + 0.04 ? 0.82 + 0.18 * sm01((y - yCrotch) / 0.04) : 1;
    const c = g === 'pele' ? skin : g === 'baixo' ? bot : g === 'agasalho' ? jacket : g === 'xale' ? shawl : top; return c.clone().multiplyScalar(ao); };
  const patDe = g => g === 'pele' ? 0 : g === 'baixo' ? botPat : g === 'cima' ? topPat : 3;
  bd.tube(torso.map(r => { const R = new Float32Array(SEG), gs = []; for (let k = 0; k < SEG; k++) { const a = k / SEG * Math.PI * 2, g = veste(r.y, a); gs.push(g); R[k] = g === 'pele' ? r.R[k] : r.Rc[g][k]; }
    return { c: V(0, r.y, r.cz), u: V(1, 0, 0), w: V(0, 0, 1), R, col: k => corDe(gs[k], r.y), pat: k => patDe(gs[k]), b: k => pesoTronco(r.y, k / SEG * Math.PI * 2, R[k]), v: r.y / 0.22 }; }), SEG, false, true, 3);
  const anelEm = (y, g) => { let i = 0; while (i < torso.length - 2 && torso[i + 1].y < y) i++; const A = torso[i], B = torso[i + 1], t = cl((y - A.y) / (B.y - A.y), 0, 1), R = new Float32Array(SEG);
    for (let k = 0; k < SEG; k++) R[k] = (g ? A.Rc[g][k] : A.R[k]) * (1 - t) + (g ? B.Rc[g][k] : B.R[k]) * t; return { R, cz: A.cz * (1 - t) + B.cz * t }; };

  // ---------- pescoço: sobe inclinado para a frente, com esternocleidomastoideo, pomo de adão, nuca e papada
  { const rn = med.pescoco, cr = P.cranio, NS = 20, hgt = yChin + 0.06 - (yNeck - 0.012), ys = [0, 0.15, 0.32, 0.5, 0.68, 0.85, 1].map(t => yNeck - 0.012 + t * hgt);
    const rings = ys.map((y, i) => { const t = i / (ys.length - 1), R = new Float32Array(NS), cz = -0.012 + 0.024 * t;
      for (let k = 0; k < NS; k++) { const a = k / NS * Math.PI * 2; let r = rn * (1 + 0.12 * (1 - t) * G(dA(a, COSTAS), 1.1)) * (Math.sin(a) > 0 ? 0.98 : 1.04);
        const sa = 0.35 + 1.0 * t; for (const s2 of [-1, 1]) r += (0.0025 + 0.002 * P.M) * G(dA(a, FRENTE + s2 * sa), 0.42) * (1 - 0.6 * Math.abs(t - 0.45));
        r += cr.pomo * G(dA(a, FRENTE), 0.25) * G(y - (yChin + 0.012), 0.012); r += cr.papada * 1.4 * G(dA(a, FRENTE), 0.8) * sm01((t - 0.55) / 0.4);
        if (t > 0.85) r += 0.01 * G(dA(a, COSTAS), 0.9); R[k] = r; }
      const wN = i < 2 ? [[I(chest), 1 - i * 0.5], [I(neck), i * 0.5]] : i < 5 ? [[I(neck), 1]] : [[I(neck), i === 5 ? 0.5 : 0.1], [I(head), i === 5 ? 0.5 : 0.9]];
      const col = k => { const a = k / NS * Math.PI * 2; return (veste(Math.min(y, yNeck - 0.0001), a) !== 'pele' && y < decote(a) + 0.004 ? top : skin).clone().multiplyScalar(0.94 + 0.06 * t); };
      return { c: V(0, y, cz), u: V(1, 0, 0), w: V(0, 0, 1), R, b: wN, col, pat: 0 }; });
    bd.tube(rings, NS, true, false); }

  // ---------- braços
  const sleeveEnd = s.warm ? 0.97 : { longa: 0.97, 'arregaçada': 0.58, curta: 0.2, nenhuma: -1 }[s.sleeves] ?? 0.2;   // até onde vai a manga (0 = ombro, 1 = punho)
  const sleeveC = jacket || (shawl ? null : top), sleevePat = jacket ? 3 : topPat;
  for (const A of arms) { const sx = A.sx, S = W['sh' + A.tag], E = W['el' + A.tag], Wr = W['ha' + A.tag], aL = sx > 0 ? 0 : Math.PI, aM = aL + Math.PI;
    const M = P.M, Fp = Math.max(0, P.F), ff = f ? 0.9 : kid ? 0.82 : 1, fat = 0.003 * P.F + (f ? 0.004 * Fp : 0);
    const rUp = t => tab([[-0.07, 0.02], [-0.035, 0.032], [0, 0.041], [0.08, 0.044], [0.18, 0.044], [0.3, 0.043], [0.45, 0.044], [0.6, 0.043], [0.75, 0.041], [0.88, 0.038], [0.97, 0.036], [1.05, 0.036]], t) * ff;
    const rLo = t => tab([[0, 0.038], [0.1, 0.041], [0.25, 0.04], [0.45, 0.035], [0.65, 0.03], [0.82, 0.026], [0.95, 0.024], [1.0, 0.0235]], t) * ff;
    const NA = 16, rings = [], pos01 = [];   // pos01: posição ao longo do braço (0 ombro, 0,53 cotovelo, 1 punho) para a manga
    const frame = (a0, a1) => { const ax = a1.clone().sub(a0).normalize(), w = V(0, 0, 1).addScaledVector(ax, -ax.z).normalize(), u = new THREE.Vector3().crossVectors(w, ax).normalize(); return { ax, u, w }; };
    const fu = frame(S, E), fl = frame(E, Wr), su = Lu / (Lu + Lf);
    for (const t of [-0.07, -0.035, 0, 0.08, 0.18, 0.3, 0.42, 0.55, 0.68, 0.8, 0.9, 0.97]) { const c = S.clone().lerp(E, t); if (t < 0.05) c.x -= sx * 0.012 * (1 - sm01((t + 0.07) / 0.12));   // a ponta do ombro (acrômio) fica rente ao trapézio
      const R = new Float32Array(NA); for (let k = 0; k < NA; k++) { const a = k / NA * Math.PI * 2; let r = rUp(t) + fat * sm01((t + 0.05) / 0.2);
        r += (0.003 + 0.006 * M) * (kid ? 0.5 : 1) * G(dA(a, aL), 0.8) * G(t - 0.14, 0.12);                          // deltoide
        r += (0.003 + 0.008 * M) * (kid ? 0.4 : 1) * G(dA(a, FRENTE), 0.55) * G(t - 0.6, 0.18);                       // bíceps
        r += (0.004 + 0.006 * M + 0.006 * Fp * (f ? 1.5 : 0.6)) * G(dA(a, COSTAS), 0.6) * G(t - 0.45, 0.22);          // tríceps (e o braço da mulher)
        R[k] = r; }
      const wsh = sm01((t + 0.08) / 0.18), we = t > 0.85 ? 0.5 * sm01((t - 0.85) / 0.15) : 0;
      rings.push({ c, u: fu.u, w: fu.w, R, b: [[I(A.clav), 1 - wsh], [I(A.sh), wsh - we], [I(A.el), we]] }); pos01.push(Math.max(0, t) * su); }
    for (const t of [0.04, 0.12, 0.25, 0.4, 0.55, 0.7, 0.82, 0.92, 0.985]) { const c = E.clone().lerp(Wr, t), R = new Float32Array(NA), fl01 = sm01((t - 0.7) / 0.28);
      for (let k = 0; k < NA; k++) { const a = k / NA * Math.PI * 2; let r = rLo(t) + fat * 0.6 * (1 - t);
        r += 0.006 * G(dA(a, COSTAS), 0.5) * G(t - 0.02, 0.05) + 0.004 * G(dA(a, aM), 0.4) * G(t - 0.02, 0.05);      // olécrano, epicôndilo
        r += (0.004 + 0.006 * M) * (kid ? 0.4 : 1) * G(dA(a, (FRENTE + aL) / 2 + (sx > 0 ? 0 : Math.PI / 2)), 0.6) * G(t - 0.22, 0.14);   // braquiorradial
        r += (0.003 + 0.004 * M) * G(dA(a, (FRENTE + aM) / 2 + (sx > 0 ? Math.PI / 2 : 0)), 0.6) * G(t - 0.25, 0.15);   // flexores
        const ex = 1 - 0.32 * fl01, ez = 1 + 0.12 * fl01; r *= 1 / Math.sqrt((Math.cos(a) / ex) ** 2 + (Math.sin(a) / ez) ** 2);   // punho achatado
        R[k] = r; }
      const wtw = sm01((t - 0.35) / 0.4), wha = t > 0.88 ? 0.5 * sm01((t - 0.88) / 0.12) : 0;
      rings.push({ c, u: fl.u, w: fl.w, R, b: t < 0.08 ? [[I(A.sh), 0.3], [I(A.el), 0.7]] : [[I(A.el), 1 - wtw], [I(A.tw), wtw - wha], [I(A.ha), wha]] }); pos01.push(su + t * (1 - su)); }
    // manga: casca + folga até onde ela vai; bainha (curta), punho (longa) ou dobra (arregaçada)
    const sl = sleeveEnd, loose = s.sleeves === 'curta' ? 0.006 : jacket ? 0.011 : 0.005;
    rings.forEach((r, i) => { const inS = pos01[i] <= sl && sl > 0 && (sleeveC || (shawl && pos01[i] < 0.35)); r.inS = inS;
      if (inS) { const H = casca(r.R); const ease = loose * sm01((pos01[i] + 0.02) / 0.08) * (pos01[i] < 0.5 ? 1 : 0.7); for (let k = 0; k < NA; k++) r.R[k] = Math.max(H[k] + ease, r.R[k] + 0.0015); }
      const cc = inS ? (shawl && pos01[i] < 0.35 ? shawl : sleeveC) : skin; r.col = cc; r.pat = inS ? (cc === top ? topPat : 3) : 0; });
    bd.tube(rings, NA, true, false);
    // a ponta da manga
    if (sl > 0 && sl < 0.99 && sleeveC) { let i = pos01.findIndex(p => p > sl); if (i < 1) i = 1; const r0 = rings[i - 1], th = s.sleeves === 'arregaçada' ? 0.009 : 0.003, wid = s.sleeves === 'arregaçada' ? 0.03 : 0.012;
      const mk2 = (d, ex) => ({ c: r0.c.clone().addScaledVector(r0.u.clone().cross(r0.w), -d), u: r0.u, w: r0.w, R: r0.R.map(x => x + ex), b: r0.b, col: top.clone().multiplyScalar(0.9), pat: topPat });
      bd.tube([mk2(-wid * 0.5, th * 0.6), mk2(0, th), mk2(wid * 0.5, th * 0.6)], NA, false, false); }
    if (sl >= 0.99 && sleeveC) { const r0 = rings[rings.length - 2]; const mk2 = (d, ex) => ({ c: r0.c.clone().addScaledVector(r0.u.clone().cross(r0.w), -d), u: r0.u, w: r0.w, R: r0.R.map(x => x + ex), b: r0.b, col: top.clone().multiplyScalar(0.92), pat: topPat });
      bd.tube([mk2(-0.02, 0.0045), mk2(0.01, 0.0045)], NA, false, false); }
    maoGeo(bd, A, Wr, hs, skin.clone().multiplyScalar(0.98), f, I);
  }

  // ---------- pernas
  const legEnd = s.skirt ? -1 : s.pants === 'bermuda' ? 0.42 : 0.96;   // calça: 0 virilha .. 1 tornozelo
  const gluteA = f ? 0.022 + 0.014 * Math.max(0, P.F + 0.3) : 0.01 + 0.007 * P.M;
  for (const Lg of legs) { const sx = Lg.sx, Hj = W['hp' + Lg.tag], K = W['kn' + Lg.tag], Ak = W['ft' + Lg.tag], aL = sx > 0 ? 0 : Math.PI, aM = aL + Math.PI;
    const M = P.M, Fp = Math.max(0, P.F), ff = kid ? 0.85 : 1;
    const thigh = t => tab(f ? [[-0.22, 0.088], [-0.1, 0.094], [0, 0.095], [0.1, 0.092], [0.25, 0.086], [0.45, 0.078], [0.65, 0.067], [0.82, 0.057], [0.93, 0.052], [1.0, 0.05]]
      : [[-0.22, 0.085], [-0.1, 0.09], [0, 0.09], [0.1, 0.087], [0.25, 0.082], [0.45, 0.075], [0.65, 0.066], [0.82, 0.057], [0.93, 0.053], [1.0, 0.052]], t) * ff;
    const shank = t => tab([[0, 0.052], [0.08, 0.053], [0.22, 0.058], [0.35, 0.055], [0.55, 0.045], [0.75, 0.037], [0.9, 0.034], [1.0, 0.034]], t) * ff * (f ? 0.97 : 1);
    const NL = 18, rings = [], pos01 = [];
    const frame = (a0, a1) => { const ax = a1.clone().sub(a0).normalize(), w = V(0, 0, 1).addScaledVector(ax, -ax.z).normalize(), u = new THREE.Vector3().crossVectors(w, ax).normalize(); return { ax, u, w }; };
    const ft = frame(Hj, K), fs = frame(K, Ak), lt = Hj.distanceTo(K), ls = K.distanceTo(Ak);
    for (const t of [-0.2, -0.1, 0, 0.1, 0.22, 0.36, 0.5, 0.64, 0.78, 0.88, 0.95]) { const c = Hj.clone().lerp(K, t), R = new Float32Array(NL);
      for (let k = 0; k < NL; k++) { const a = k / NL * Math.PI * 2; let r = thigh(t) + 0.004 * P.F * (f ? 2 : 1) * (1 - t);
        r += (0.004 + 0.006 * M) * G(dA(a, FRENTE), 0.7) * G(t - 0.5, 0.22);                                        // quadríceps
        r += (0.003 + 0.004 * M) * G(dA(a, (FRENTE + aM) / 2 + (sx > 0 ? Math.PI / 2 : 0)), 0.35) * G(t - 0.82, 0.08);   // vasto medial
        r += (0.004 + (f ? 0.01 : 0.003) * Fp) * G(dA(a, aL), 0.55) * G(t - 0.12, 0.14);                             // lado de fora (culote)
        r += (0.003 + (f ? 0.006 : 0.002) * Fp) * G(dA(a, aM), 0.5) * G(t - 0.15, 0.15);                             // adutores
        r += 0.008 * G(dA(a, FRENTE), 0.45) * G(t - 1.0, 0.05);                                                     // patela
        R[k] = r; }
      const wk = t > 0.85 ? 0.5 * sm01((t - 0.85) / 0.15) : 0, wh = t < 0 ? 0.35 * sm01(-t / 0.2) : 0;
      rings.push({ c, u: ft.u, w: ft.w, R, b: [[I(hips), wh], [I(Lg.hp), 1 - wh - wk], [I(Lg.kn), wk]] }); pos01.push(Math.max(0, t) * 0.5); }
    for (const t of [0.04, 0.12, 0.22, 0.32, 0.45, 0.6, 0.75, 0.86, 0.94, 1.0]) { const c = K.clone().lerp(Ak, t), R = new Float32Array(NL);
      for (let k = 0; k < NL; k++) { const a = k / NL * Math.PI * 2; let r = shank(t);
        r += (0.008 + 0.006 * M) * G(dA(a, COSTAS + (aM - COSTAS > 0 ? 0.35 : -0.35) * (sx > 0 ? -1 : 1)), 0.45) * G(t - 0.27, 0.12);   // gastrocnêmio medial
        r += (0.005 + 0.004 * M) * G(dA(a, COSTAS - (sx > 0 ? -0.35 : 0.35)), 0.4) * G(t - 0.22, 0.1);                                   // lateral
        r -= 0.006 * G(dA(a, COSTAS), 0.5) * G(t - 0.88, 0.07);                                                                         // Aquiles
        r *= Math.sin(a) > 0 ? 1 - 0.06 * G(dA(a, FRENTE), 0.4) * (1 - G(t, 0.1)) : 1;                                                 // canela (tíbia) chata na frente
        r += 0.006 * G(dA(a, aM), 0.35) * G(t - 0.97, 0.04) + 0.005 * G(dA(a, aL), 0.35) * G(t - 1.0, 0.04);                          // maléolos
        r += 0.008 * G(dA(a, FRENTE), 0.45) * G(t, 0.05);
        R[k] = r; }
      const wk = t < 0.08 ? 0.5 : 0, wf = t > 0.92 ? 0.5 * sm01((t - 0.92) / 0.08) : 0;
      rings.push({ c, u: fs.u, w: fs.w, R, b: [[I(Lg.hp), wk], [I(Lg.kn), 1 - wk - wf], [I(Lg.ft), wf]] }); pos01.push(0.5 + t * 0.5); }
    // calça: casca + folga, perna reta abaixo do joelho, e o pano que cai da nádega para a coxa
    const inP = i => pos01[i] <= legEnd && !s.skirt;
    let kneeCloth = 0; rings.forEach((r, i) => { if (!inP(i)) return; const H = casca(r.R), back = pos01[i] < 0.2 ? gluteA * 0.85 * (1 - sm01(pos01[i] / 0.18)) : 0;
      for (let k = 0; k < NL; k++) { const a = k / NL * Math.PI * 2; r.R[k] = Math.max(H[k] + 0.008 + back * G(dA(a, COSTAS), 0.75), r.R[k] + 0.002); }
      if (Math.abs(pos01[i] - 0.5) < 0.04) kneeCloth = Math.max(kneeCloth, Math.max(...r.R));
      if (pos01[i] > 0.52 && kneeCloth) for (let k = 0; k < NL; k++) r.R[k] = Math.max(r.R[k], kneeCloth * (0.97 - 0.06 * (pos01[i] - 0.5))); });
    rings.forEach((r, i) => { const p = inP(i), y = r.c.y; r.col = p ? bot.clone().multiplyScalar(y < 0.2 ? 0.88 : Math.abs(pos01[i] - 0.5) < 0.05 ? 1.05 : 1) : (s.skirt && s.stockings ? C(s.stockings) : skin);
      if (y < yCrotch + 0.03) r.col = r.col.clone().multiplyScalar(0.9 + 0.1 * sm01((y - yCrotch + 0.06) / 0.09)); r.pat = p ? botPat : 0; });
    bd.tube(rings, NL, false, true);
    // barra da calça virada para fora (como na roça) ou a bainha da bermuda
    if (legEnd > 0) { let i = pos01.findIndex(p => p > legEnd); if (i < 1) i = rings.length - 1; const r0 = rings[i - 1], th = legEnd > 0.9 ? 0.011 : 0.006, wd = legEnd > 0.9 ? 0.035 : 0.014;
      const ax = r0.u.clone().cross(r0.w), mk2 = (d, ex) => ({ c: r0.c.clone().addScaledVector(ax, -d), u: r0.u, w: r0.w, R: r0.R.map(x => x + ex), b: r0.b, col: bot.clone().multiplyScalar(0.85), pat: botPat });
      bd.tube([mk2(-wd * 0.5, th * 0.5), mk2(0, th), mk2(wd * 0.5, th * 0.4)], NL, false, false); }
    peGeo(bd, s, Lg, Ak, kid, f, skin, shoe, med, I);
  }

  // ---------- cinto (segue a forma da calça, por baixo da barriga), botões e gola da camisa, bolso, cós da saia
  if (pants && !kid) { const n = SEG, mkB = d => { const yb = beltY0 + d, rr = anelEm(yb, 'baixo'), dy = new Float32Array(n);
      for (let k = 0; k < n; k++) dy[k] = beltY(k / n * Math.PI * 2) - beltY0; return { c: V(0, yb, rr.cz), u: V(1, 0, 0), w: V(0, 0, 1), R: rr.R.map(x => x + 0.004), dy, b: k => pesoTronco(yb, k / n * Math.PI * 2, rr.R[k]), col: C(0x3a2418), pat: 5 }; };
    bd.tube([mkB(-0.018), mkB(0.018)], n, false, false);
    const fr0 = anelEm(beltY(FRENTE), 'baixo'), zb = fr0.cz + fr0.R[n / 4] + 0.008;
    bd.rigid(new THREE.BoxGeometry(0.05, 0.04, 0.008).translate(0, beltY(FRENTE), zb), C(0xc8b070), I(hips)); bd.rigid(new THREE.BoxGeometry(0.03, 0.022, 0.01).translate(0, beltY(FRENTE), zb + 0.001), C(0x3a2418), I(hips)); }
  const camisa = !dressTop && !kid && s.sleeves !== 'nenhuma' && s.shirt !== 'camiseta' && !jacket && !shawl;
  if (camisa) { const zAt = y => { const r = anelEm(y, 'cima'); return r.cz + r.R[SEG / 4]; };
    // gola: faixa em volta da base do pescoço e as duas pontas viradas
    const band = new THREE.CylinderGeometry(f ? 0.058 : med.pescoco + 0.012, f ? 0.064 : med.pescoco + 0.018, 0.035, 16, 1, true, Math.PI * 0.62, Math.PI * 0.76).translate(0, yNeck + 0.008, -0.01);
    bd.rigid(band, top.clone().multiplyScalar(0.97), I(chest), topPat);
    for (const sx of [-1, 1]) { const flap = new THREE.BufferGeometry(), x0 = sx * 0.012, x1 = sx * (f ? 0.06 : 0.068), zf = zAt(yNeck - 0.03) - 0.002, yb = yNeck - 0.03;
      flap.setAttribute('position', new THREE.Float32BufferAttribute([x0, yb, zf + 0.012, x1, yb + 0.047, zf - 0.016, x1 * 0.5, yb + 0.025, zf + 0.012, x0, yb, zf + 0.012, x1 * 1.02, yb + 0.013, zf - 0.002, x1, yb + 0.047, zf - 0.016], 3));
      flap.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(12).fill(0), 2)); if (sx < 0) { const a = flap.attributes.position; for (const [i, j] of [[1, 2], [4, 5]]) { const t = [a.getX(i), a.getY(i), a.getZ(i)]; a.setXYZ(i, a.getX(j), a.getY(j), a.getZ(j)); a.setXYZ(j, ...t); } }
      bd.rigid(flap, top.clone().multiplyScalar(0.97), I(chest), topPat); }
    const btn = f ? C(0xf4efe6) : C(0xe8e0d0), yEnd = tucked ? beltY(FRENTE) + 0.03 : topBottom + 0.02;
    for (let y = yNeck - 0.045; y > yEnd; y -= 0.068) bd.rigid(new THREE.SphereGeometry(0.0055, 6, 4).scale(1, 1, 0.5).translate(0, y, zAt(y) + 0.002), btn, pesoTronco(y, FRENTE, 0.1));
    if (!f) { const y = deTab(1.29), r = anelEm(y, 'cima'), k = Math.round(SEG * (FRENTE - 0.5) / (Math.PI * 2)), a = k / SEG * Math.PI * 2, R = r.R[k];
      const px = R * Math.cos(a), pz = r.cz + R * Math.sin(a) + 0.002;
      bd.rigid(new THREE.BoxGeometry(0.062, 0.07, 0.004).rotateY(0.5 - FRENTE + Math.PI / 2).translate(px, y - 0.008, pz), top.clone().multiplyScalar(0.9), I(chest), topPat);
      bd.rigid(new THREE.BoxGeometry(0.064, 0.016, 0.006).rotateY(0.5 - FRENTE + Math.PI / 2).translate(px, y + 0.024, pz + 0.001), top.clone().multiplyScalar(0.85), I(chest), topPat); } }
  // cós da saia: anel da casca na cintura (a saia de pano sai dali)
  let saia = null;
  if (s.skirt) { const ys = deTab(f ? 1.0 : 0.97), rr = anelEm(ys, 'cima'), Rk = rr.R.map(x => x + 0.004);
    bd.tube([{ c: V(0, ys - 0.015, rr.cz), u: V(1, 0, 0), w: V(0, 0, 1), R: Rk, b: [[I(hips), 1]], col: (dressTop ? top : bot).clone().multiplyScalar(0.9), pat: dressTop ? topPat : botPat },
      { c: V(0, ys + 0.015, rr.cz), u: V(1, 0, 0), w: V(0, 0, 1), R: Rk, b: [[I(hips), 0.6], [I(spine), 0.4]], col: (dressTop ? top : bot).clone().multiplyScalar(0.9), pat: dressTop ? topPat : botPat }], SEG, false, false);
    saia = { y: ys - 0.012 - W.hips.y, cz: rr.cz, R: Array.from(Rk), seg: SEG }; }

  // ---------- cabeça
  const cab = cabeca(P, s, skin, hairC, f, kid);
  const HO = V(0, yChin, 0), hd = { rigid: (g, c, b, pt) => bd.rigid(g.translate(HO.x, HO.y, HO.z), c, b, pt) }, iH = I(head);
  cab.pecas.forEach(([g, c, pt]) => hd.rigid(g, c, iH, pt));
  const swing = hair(hd, s, iH, cab);
  const geo = bd.build();
  const mesh = new THREE.SkinnedMesh(geo, bodyMaterial(s.top.tex || null)); mesh.add(hips); mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones)); mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
  // pálpebras de cima (piscam): meia casca da cor da pele com a linha dos cílios na borda, presas no osso da cabeça
  const lidMat = toon({ color: skin }), lashMat = toon({ color: 0x1a120c }), lids = [];
  for (const e of cab.olhos) { const g = new THREE.Group(); g.position.copy(e.c).sub(headPiv); head.add(g); const r = e.r + 0.001;
    const lid = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), lidMat), lash = new THREE.Mesh(new THREE.TorusGeometry(r, 0.001, 3, 18, Math.PI).rotateX(Math.PI / 2), lashMat);
    g.add(lid, lash); lid.userData.noRegua = lash.userData.noRegua = true; g.userData.open = s.old ? -0.35 : -0.6; g.rotation.x = g.userData.open; lids.push(g); }
  for (const sw of swing) { sw.pivot.position.sub(headPiv); head.add(sw.pivot); sw.pivot.traverse(o => { o.userData.noRegua = true; }); }
  // a cabeça um tico maior que a anatomia (8% no adulto, 22% na criança): de longe, na câmera do jogo, o rosto e o chapéu leem
  head.scale.setScalar(kid ? 1.22 : 1.08);
  // medidas para o pano (saia, avental) e para quem segura as coisas
  const cint = anelEm(deTab(f ? 1.0 : 0.97), 'cima'), quad = anelEm(yHipJ - 0.01);
  const medidas = { saia, cintura: { y: deTab(f ? 1.0 : 0.97) - W.hips.y, rx: cint.R[0], rzF: cint.R[SEG / 4], rzB: cint.R[3 * SEG / 4], cz: cint.cz },
    quadril: { y: yHipJ - 0.01 - W.hips.y, rx: Math.max(quad.R[0], quad.R[SEG / 2]), rzB: quad.R[3 * SEG / 4] }, coxa: tab([[0, 0.09], [1, 0.096]], f ? 1 : 0) * (kid ? 0.85 : 1), canela: 0.058 * (kid ? 0.85 : 1),
    barriga: P.barriga };
  return { mesh, hips, spine, chest, neck, head, arms, legs, lids, swing, waistY: yWaist, bw: P.fr, P, medidas, headPiv, topoCabeca: 0.233 - headPiv.y, chestY: W.chest.y };
}

// ---------- a mão: palma (com as eminências do polegar e do mínimo), nós dos dedos, quatro dedos de três falanges com unha, polegar
function maoGeo(bd, A, w0, hs, skinH, f, I) { const sx = A.sx, ff = f ? 0.92 : 1, aP = sx > 0 ? Math.PI : 0, NP = 14;   // aP: o lado da palma
  const ys = [-0.002, -0.018, -0.038, -0.058, -0.076, -0.09].map(y => y * hs), rings = ys.map((y, i) => { const t = i / (ys.length - 1), R = new Float32Array(NP);
    const tx = (0.0125 + 0.0015 * Math.sin(t * Math.PI)) * hs * ff, wz = (0.026 + 0.015 * sm01(t * 1.2)) * hs * ff;
    for (let k = 0; k < NP; k++) { const a = k / NP * Math.PI * 2; let r = superR(a, tx, wz, wz, 2.6);
      r += 0.008 * hs * G(dA(a, Math.atan2(1, -sx)), 0.5) * G(y / hs + 0.03, 0.022);       // eminência tenar (base do polegar)
      r += 0.004 * hs * G(dA(a, Math.atan2(-1, -sx)), 0.5) * G(y / hs + 0.05, 0.03);       // hipotenar
      R[k] = r; }
    return { c: V(0, y, 0).add(w0), u: V(1, 0, 0), w: V(0, 0, 1), R, b: i === 0 ? [[I(A.tw), 0.3], [I(A.ha), 0.7]] : [[I(A.ha), 1]], col: skinH, pat: 0 }; });
  bd.tube(rings, NP, true, true);
  const nail = skinH.clone().lerp(new THREE.Color(0xf4d8d0), 0.45);
  A.dedos.forEach((fg, j) => { const r0 = [0.0088, 0.0092, 0.0086, 0.0076][j] * hs * ff, pts = [...fg.map(b => b.userData.wpos || null)];
    const P0 = V(0, 0, 0), wpos = b => { let p = new THREE.Vector3(); let o = b; const acc = []; while (o && o !== A.ha) { acc.push(o.position); o = o.parent; } for (const v of acc) p.add(v); return p.add(w0); };
    const k = wpos(fg[0]), m1 = wpos(fg[1]), m2 = wpos(fg[2]), tip = fg[2].userData.tip;
    bd.rigid(new THREE.SphereGeometry(r0 * 1.15, 8, 6).translate(k.x + sx * 0.003 * hs, k.y, k.z), skinH, I(fg[0]));                 // nó do dedo
    bd.rigid(capsAB(k, m1, r0, 7, 2), skinH, I(fg[0])); bd.rigid(capsAB(m1, m2, r0 * 0.93, 7, 2), skinH, I(fg[1])); bd.rigid(capsAB(m2, tip.clone().add(V(0, r0 * 0.6, 0)), r0 * 0.86, 7, 2), skinH, I(fg[2]));
    bd.rigid(new THREE.SphereGeometry(1, 8, 5).scale(0.0025, r0 * 1.15, r0 * 0.8).translate(tip.x + sx * r0 * 0.68, tip.y + r0 * 1.5, tip.z), nail, I(fg[2])); });
  { const T = A.polegar, wp = b => { let p = new THREE.Vector3(), o = b; while (o && o !== A.ha) { p.add(o.position); o = o.parent; } return p.add(w0); };
    const c0 = wp(T[0]), c1 = wp(T[1]), c2 = wp(T[2]), tip = T[2].userData.tip, r = 0.0105 * hs * ff;
    bd.rigid(capsAB(c0, c1, r * 1.15, 7, 2), skinH, I(T[0])); bd.rigid(capsAB(c1, c2, r, 7, 2), skinH, I(T[1])); bd.rigid(capsAB(c2, tip, r * 0.92, 7, 2), skinH, I(T[2]));
    const nd = T.dir.clone().cross(V(0, 0, 1)).normalize().multiplyScalar(sx); const ntip = tip.clone().addScaledVector(T.dir, -r * 0.8).addScaledVector(T.abdAx.clone().multiplyScalar(-1), 0);
    bd.rigid(new THREE.SphereGeometry(1, 8, 5).scale(r * 0.8, r * 0.8, r * 0.8).translate(ntip.x + sx * r * 0.5, ntip.y, ntip.z), nail, I(T[2])); }
}

// ---------- o pé e o calçado: botina, sapato, chinelo de dedo ou descalço
function peGeo(bd, s, Lg, Ak, kid, f, skin, shoe, med, I) { const sx = Lg.sx, fx = Ak.x, ay = Ak.y, kf = med.pe / 0.262, ft = I(Lg.ft), kn = I(Lg.kn);
  const fw = s.footwear || (kid ? 'chinelo' : f ? 'sapato' : 'botina'), y0 = ay - 0.06;   // y0: a sola
  const bareFoot = () => { const g = new THREE.SphereGeometry(1, 12, 8), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i), y = p.getY(i); p.setXYZ(i, p.getX(i) * (1 - Math.max(0, -z) * 0.25), y < 0 ? y * 0.35 : y, z); }
    g.scale(0.04 * kf, 0.032, 0.108 * kf).translate(fx, y0 + 0.03, Ak.z + 0.051 * kf); bd.rigid(g, skin, ft);
    [[-1.4, 0.011, 0.012], [-0.65, 0.008, 0.006], [0, 0.0075, 0.002], [0.65, 0.007, -0.004], [1.3, 0.0065, -0.012]].forEach(([k, r, dz]) => bd.rigid(new THREE.SphereGeometry(r * kf, 8, 6).scale(1, 0.85, 1.2).translate(fx - sx * k * 0.013 * kf, y0 + 0.014, Ak.z + (0.154 + dz) * kf), skin, ft)); };
  if (fw === 'botina' || fw === 'sapato') {
    const up = new THREE.SphereGeometry(1, 14, 10), p = up.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i), y = p.getY(i); p.setXYZ(i, p.getX(i) * (1 - Math.max(0, z) * 0.28), y < -0.2 ? -0.2 - (y + 0.2) * 0.25 : y, z); }
    up.scale(0.046 * kf, fw === 'botina' ? 0.05 : 0.042, 0.12 * kf).translate(fx, y0 + 0.052, Ak.z + 0.056 * kf); bd.rigid(up, shoe, ft, 5);
    if (fw === 'botina') { bd.rigid(new THREE.CylinderGeometry(0.044, 0.047, 0.07, 12).translate(fx, y0 + 0.1, Ak.z + 0.002), shoe.clone().multiplyScalar(0.92), [[ft, 0.6], [kn, 0.4]], 5);
      for (let k = 0; k < 3; k++) bd.rigid(new THREE.BoxGeometry(0.03, 0.004, 0.004).translate(fx, y0 + 0.085 + k * 0.016, Ak.z + 0.058 - k * 0.006), C(0x1a1410), ft); }
    bd.rigid(new THREE.BoxGeometry(0.094 * kf, 0.018, 0.26 * kf, 2, 1, 4).translate(fx, y0 + 0.009, Ak.z + 0.056 * kf), shoe.clone().multiplyScalar(0.45), ft, 5);
    bd.rigid(new THREE.BoxGeometry(0.08 * kf, 0.02, 0.07 * kf).translate(fx, y0 + 0.02, Ak.z - 0.039 * kf), shoe.clone().multiplyScalar(0.5), ft, 5); }
  else if (fw === 'chinelo') { bareFoot(); bd.rigid(new THREE.BoxGeometry(0.088 * kf, 0.013, 0.25 * kf, 2, 1, 4).translate(fx, y0 + 0.0065, Ak.z + 0.056 * kf), shoe, ft, 5); const T = V(fx - sx * 0.012 * kf, y0 + 0.022, Ak.z + 0.136 * kf);
    for (const s2 of [-1, 1]) bd.rigid(capsAB(T, V(fx + s2 * 0.038 * kf, y0 + 0.018, Ak.z + 0.051 * kf), 0.0045, 4), C(0xf2f2ee), ft); }
  else bareFoot();
}

// ---------- a cabeça: crânio por campo de distância e o rosto posto na superfície dele
const sEll = (x, y, z, cx, cy, cz, rx, ry, rz) => { const a = (x - cx) / rx, b = (y - cy) / ry, c = (z - cz) / rz, k0 = Math.hypot(a, b, c), k1 = Math.hypot(a / rx, b / ry, c / rz); return k1 < 1e-9 ? -Math.min(rx, ry, rz) : k0 * (k0 - 1) / k1; };
const sCap = (x, y, z, ax, ay, az, bx, by, bz, r) => { const px = x - ax, py = y - ay, pz = z - az, dx = bx - ax, dy = by - ay, dz = bz - az, h = cl((px * dx + py * dy + pz * dz) / (dx * dx + dy * dy + dz * dz), 0, 1); return Math.hypot(px - dx * h, py - dy * h, pz - dz * h) - r; };
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const smax = (a, b, k) => -smin(-a, -b, k);
const C0 = [0, 0.11, 0.01];   // centro de onde saem os raios da cabeça (coordenadas da cabeça: origem no queixo)
function campoCabeca(cr) {
  const fs = cr.face, fc = [0, 0.105, 0.03], m = cr.queixo > 0.018;
  const eyes = [-1, 1].map(s => [s * 0.032, 0.122, 0.094].map((v, i) => fc[i] + (v - fc[i]) * fs));
  const sdf = (x, y, z, semOrbita) => {
    let d = sEll(x, y, z, 0, 0.132 + (fs < 1 ? 0.006 : 0), -0.008, cr.rx, cr.ry, cr.rz);
    d = smin(d, sEll(x, y, z, 0, 0.152, 0.03, cr.rx * 0.86, 0.06, 0.068 + 0.006 * cr.testa), 0.03);
    for (const s of [-1, 1]) d = smin(d, sEll(x, y, z, s * 0.058, 0.08, -0.028, 0.011, 0.014, 0.011), 0.012);
    if (m) d = smin(d, sEll(x, y, z, 0, 0.11, -0.098, 0.012, 0.01, 0.01), 0.012);
    // o rosto (na criança, menor): coordenadas puxadas para o centro do rosto
    const qx = fc[0] + (x - fc[0]) / fs, qy = fc[1] + (y - fc[1]) / fs, qz = fc[2] + (z - fc[2]) / fs;
    if (qz < -0.055 || qy > 0.19 || qy < -0.045 || Math.abs(qx) > 0.115) return semOrbita ? d : orbita(d, x, y, z);   // longe do rosto: só o crânio
    let e = sEll(qx, qy, qz, 0, 0.085, 0.052, 0.04, 0.042, 0.046);
    e = smin(e, sEll(qx, qy, qz, 0, 0.064, 0.074, 0.03, 0.02, 0.026), 0.012);
    for (const s of [-1, 1]) {
      e = smin(e, sEll(qx, qy, qz, s * (cr.zig - 0.019), 0.108, 0.062, 0.021, 0.015, 0.028), 0.014);
      e = smin(e, sCap(qx, qy, qz, s * (cr.zig - 0.004), 0.104, 0.045, s * 0.068, 0.1, -0.005, 0.008), 0.012);
      e = smin(e, sCap(qx, qy, qz, s * 0.06, 0.1, -0.012, s * cr.gonio, cr.gonY, -0.004, m ? 0.011 : 0.0095), 0.012);
      e = smin(e, sCap(qx, qy, qz, s * cr.gonio, cr.gonY, -0.004, s * cr.queixo, 0.012, cr.queixoZ - 0.012, m ? 0.0105 : 0.009), 0.014);
      e = smin(e, sEll(qx, qy, qz, s * 0.043, 0.068, 0.056, 0.021 + cr.bochecha, 0.024, 0.026), 0.016);
      e = smin(e, sCap(qx, qy, qz, s * 0.012, 0.143, 0.086, s * 0.046, 0.141, 0.08, 0.006 + cr.arco), 0.012); }
    e = smin(e, sEll(qx, qy, qz, 0, 0.008, cr.queixoZ - 0.01, cr.queixo + 0.008, 0.016, 0.013), 0.012);
    e = smin(e, sEll(qx, qy, qz, 0, 0.022, 0.03, 0.035, 0.012 + cr.papada, 0.035), 0.02);
    d = smin(d, e * fs, 0.02);
    return semOrbita ? d : orbita(d, x, y, z); };
  const orbita = (d, x, y, z) => { for (const p of eyes) d = smax(d, -(Math.hypot(x - p[0], y - p[1], z - p[2]) - 0.0185 * fs), 0.007); return d; };
  // raio da superfície em cada direção (grade de 48 × 36 direções, tirada uma vez por cabeça)
  const NP = 40, NT = 30, grid = new Float32Array((NP + 1) * (NT + 1));
  const raio = (dx, dy, dz) => { let a = 0.035, b = 0.175; for (let it = 0; it < 11; it++) { const t = (a + b) / 2; if (sdf(C0[0] + dx * t, C0[1] + dy * t, C0[2] + dz * t) < 0) a = t; else b = t; } return (a + b) / 2; };
  for (let j = 0; j <= NT; j++) { const th = j / NT * Math.PI; for (let i = 0; i <= NP; i++) { const ph = i / NP * Math.PI * 2; grid[j * (NP + 1) + i] = raio(-Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th)); } }
  const R = (dx, dy, dz) => { const th = Math.acos(cl(dy, -1, 1)), ph = (Math.atan2(dz, -dx) + Math.PI * 2) % (Math.PI * 2), fj = th / Math.PI * NT, fi = ph / (Math.PI * 2) * NP;
    const j = Math.min(NT - 1, Math.floor(fj)), i = Math.min(NP - 1, Math.floor(fi)), u = fi - i, v = fj - j, g = (jj, ii) => grid[jj * (NP + 1) + ii];
    return (g(j, i) * (1 - u) + g(j, i + 1) * u) * (1 - v) + (g(j + 1, i) * (1 - u) + g(j + 1, i + 1) * u) * v; };
  // superfície ao longo de um eixo: z na frente (x, y), x do lado (y, z)
  const surfZ = (x, y, so = false) => { let a = 0.0, b = 0.2; for (let it = 0; it < 16; it++) { const t = (a + b) / 2; if (sdf(x, y, t, so) < 0) a = t; else b = t; } return a; };
  const surfX = (y, z) => { let a = 0.0, b = 0.2; for (let it = 0; it < 16; it++) { const t = (a + b) / 2; if (sdf(t, y, z) < 0) a = t; else b = t; } return a; };
  return { sdf, R, surfZ, surfX, eyes, F: (x, y, z) => [fc[0] + (x - fc[0]) * fs, fc[1] + (y - fc[1]) * fs, fc[2] + (z - fc[2]) * fs] };
}
function cabeca(P, s, skin, hairC, f, kid) {
  const cr = P.cranio, cache = P._cab || (P._cab = campoCabeca(cr)), K = cache, pecas = [], add = (g, c, pt = 0) => pecas.push([g, c, pt]);
  { const hg = new THREE.SphereGeometry(1, 36, 26), p = hg.attributes.position, cols = new Float32Array(p.count * 3), red = C(0xc8524a), stub = hairC.clone().lerp(skin, 0.35);
    const blush = f || kid ? 0.2 : 0.12, stubble = P.m && !s.beard ? 0.22 : 0, u = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { u.set(p.getX(i), p.getY(i), p.getZ(i)).normalize(); const r = K.R(u.x, u.y, u.z);
      p.setXYZ(i, C0[0] + u.x * r, C0[1] + u.y * r, C0[2] + u.z * r);
      const front = Math.max(0, u.z), c = skin.clone();
      c.lerp(red, blush * G(Math.abs(u.x) - 0.52, 0.2) * G(u.y + 0.12, 0.18) * front);
      if (stubble) c.lerp(stub, stubble * (1 - sm01((u.y + 0.15) / 0.12)) * Math.min(1, Math.max(0, u.z + 0.2) * 2) * (1 - G(u.x, 0.12) * G(u.y + 0.45, 0.08)));
      if (u.y < -0.6) c.multiplyScalar(1 - (-0.6 - u.y) * 0.25);
      cols.set([c.r, c.g, c.b], i * 3); }
    hg.setAttribute('color', new THREE.BufferAttribute(cols, 3)); add(hg, skin); }
  // olhos: branco, íris, pupila e brilho, assentados na órbita
  const iris = C(s.eyes || 0x4a2a14), er = 0.0112 * (kid ? 0.92 : 1), olhos = [];
  for (const [ex0, ey0] of K.eyes) { const sx = Math.sign(ex0), ez = K.surfZ(ex0, ey0, true) - er * 0.95, ex = ex0, ey = ey0;
    add(new THREE.SphereGeometry(er, 12, 10).scale(1, 0.92, 1).translate(ex, ey, ez), C(0xefe9e0));
    add(new THREE.SphereGeometry(er * 0.59, 12, 8).scale(1, 1, 0.4).translate(ex, ey - 0.0004, ez + er - 0.0006), iris);
    add(new THREE.SphereGeometry(er * 0.3, 8, 6).scale(1, 1, 0.35).translate(ex, ey - 0.0004, ez + er + 0.0002), C(0x0e0a08));
    add(new THREE.SphereGeometry(0.0012, 6, 4).translate(ex + 0.0022, ey + 0.0024, ez + er + 0.0006), C(0xffffff));
    olhos.push({ c: V(ex, ey, ez), r: er });
    // sobrancelha arqueada na superfície da testa
    const bp = [[0.012, 0.139], [0.032, 0.1455], [0.052, 0.1405]].map(([x, y]) => { const [qx, qy] = K.F(sx * x, y, 0); return V(qx, qy, K.surfZ(qx, qy) + 0.0015); });
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bp), 6, f ? 0.0024 : 0.0034, 4, false), hairC.clone().multiplyScalar(0.85), 2);
    // orelha com lóbulo e a dobra de dentro, na lateral do crânio
    const [, oy] = K.F(0, 0.112, 0), xs = K.surfX(oy, -0.004) + 0.002;
    add(new THREE.SphereGeometry(1, 10, 8).scale(0.011, 0.026, 0.018).rotateY(sx * 0.35).translate(sx * xs, oy, -0.004), skin.clone().multiplyScalar(0.96));
    add(new THREE.SphereGeometry(0.0075, 8, 6).translate(sx * (xs + 0.001), oy - 0.024, 0.0), skin.clone().multiplyScalar(0.97));
    add(new THREE.SphereGeometry(1, 8, 6).scale(0.004, 0.014, 0.009).translate(sx * (xs + 0.0085), oy + 0.002, -0.002), skin.clone().multiplyScalar(0.78)); }
  // nariz: ponte, ponta e as duas asas, na linha do meio do rosto
  const nose = skin.clone().lerp(C(0xc86a5a), 0.08), nz = cr.nariz, [, yB] = K.F(0, 0.108, 0), [, yT] = K.F(0, 0.091, 0);
  const zB = K.surfZ(0, yB, true), zT = K.surfZ(0, yT, true);
  add(new THREE.SphereGeometry(1, 10, 8).scale(0.0085 * nz, 0.024 * nz, 0.011 * nz).rotateX(-0.28).translate(0, yB, zB + 0.002), nose);
  add(new THREE.SphereGeometry(1, 10, 8).scale(0.0125 * nz, 0.0105 * nz, 0.011 * nz).translate(0, yT, zT + 0.012 * nz), nose);
  for (const sx of [-1, 1]) add(new THREE.SphereGeometry(1, 8, 6).scale(0.0075 * nz, 0.0068 * nz, 0.0075 * nz).translate(sx * 0.0115 * nz, yT - 0.002, zT + 0.006 * nz), nose.clone().multiplyScalar(0.97));
  // boca: lábio de cima, de baixo e a linha entre eles, rentes à arcada
  const lip = skin.clone().lerp(C(0x9a3a32), f ? 0.5 : 0.32), b = cr.boca, [, yU] = K.F(0, 0.0682, 0), [, yL] = K.F(0, 0.0608, 0), zU = K.surfZ(0, yU, true), zL = K.surfZ(0, yL, true);
  add(new THREE.SphereGeometry(1, 12, 6).scale(0.019 * b, 0.0045, 0.005).translate(0, yU, zU - 0.0015), lip);
  add(new THREE.SphereGeometry(1, 12, 6).scale(0.016 * b, 0.0055, 0.0055).translate(0, yL, zL - 0.0015), lip.clone().multiplyScalar(1.05));
  add(new THREE.BoxGeometry(0.028 * b, 0.0014, 0.003).translate(0, (yU + yL) / 2, Math.max(zU, zL) + 0.0015), lip.clone().multiplyScalar(0.5));
  const bigode = () => { for (const sx of [-1, 1]) add(new THREE.SphereGeometry(1, 10, 6).scale(0.019, 0.0065, 0.008).rotateZ(sx * -0.28).translate(sx * 0.013, yU + 0.0065, zU + 0.004), hairC, 2); };
  if (s.beard === 'bigode') bigode();
  if (s.beard === 'barba') { const bg = new THREE.SphereGeometry(1, 18, 12, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), p = bg.attributes.position;
    for (let i = 0; i < p.count; i++) { const z = p.getZ(i); if (z < -0.2) p.setZ(i, z * 0.6); } bg.scale(0.08 * cr.gonio / 0.0515, 0.075, 0.08).translate(0, 0.088, 0.03); add(bg, hairC, 2); bigode(); }
  return { pecas, olhos, R: K.R };
}

// ---------- cabelo: um volume que acompanha o crânio (a mesma superfície da cabeça), com linha do cabelo de verdade (testa,
// entradas, acima da orelha, nuca). Abaixo da linha o volume entra para dentro da cabeça e some, então a borda fica limpa.
// Cada penteado soma o seu volume (topete, risca do lado, franja, afro com cachos, coque, cabelo comprido sobre as costas,
// mechas na frente das orelhas) e o rabo de cavalo e a trança são peças soltas que balançam com o andar.
const SKULL = { cy: 0.115, cz: 0.012 };
function hairShell(R, { t = 0.012, front = 0.42, side = 0.22, back = -0.6, curl = 0, crown = 0.006, seg = 32, noTop = false, quiff = 0, part = 0, fringe = 0 } = {}) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75)), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const f = Math.abs(Math.atan2(x, z)) / Math.PI;   // 0 = frente, 1 = nuca
    let lim = f < 0.12 ? front : f < 0.32 ? front + (side - front) * smooth01((f - 0.12) / 0.2) : f < 0.62 ? side : side + (back - side) * smooth01((f - 0.62) / 0.3);
    if (fringe && z > 0) lim -= fringe * G(x - 0.25, 0.35);
    let k = smooth01((y - lim) / 0.12);
    if (noTop) k *= 1 - smooth01((y - 0.55) / 0.12);
    const n = curl ? (vn3(x * 7, y * 7, z * 7) - 0.5) * curl * 2 + (vn3(x * 15 + 3, y * 15, z * 15) - 0.5) * curl : (vn3(x * 9, y * 3, z * 9) - 0.5) * 0.004;
    let vol = t + crown * Math.max(0, y) + n + quiff * G(y - 0.7, 0.28) * Math.max(0, z + 0.2);
    if (part) vol -= 0.005 * G(x - part, 0.05) * smooth01((y - 0.3) / 0.2) * (z > -0.3 ? 1 : 0);
    vol = vol * k - 0.05 * (1 - k);   // fora da área do cabelo a casca afunda para dentro do crânio
    const r = R(x, y, z) + vol; p.setXYZ(i, C0[0] + x * r, C0[1] + y * r * (vol > 0 ? 1 - 0.1 * vol : 1), C0[2] + z * r); }
  g.computeVertexNormals(); return g;
}
const smooth01 = v => { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); };
function vn3(x, y, z) { const h = (a, b, c) => { let n = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return n - Math.floor(n); };
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), fx = x - i, fy = y - j, fz = z - k, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t;
  return L(L(L(h(i, j, k), h(i + 1, j, k), u), L(h(i, j + 1, k), h(i + 1, j + 1, k), u), v), L(L(h(i, j, k + 1), h(i + 1, j, k + 1), u), L(h(i, j + 1, k + 1), h(i + 1, j + 1, k + 1), u), v), w); }
function hair(bd, s, hb, cab) {
  const R = cab.R, capped = ['palha', 'couro', 'bone'].includes(s.hat), scarf = s.hat === 'lenco';
  const crown = { palha: [0.2, 0.3, y => 0.1 - (y - 0.2) * 0.19], couro: [0.2, 0.28, y => 0.1 * Math.sqrt(Math.max(0, 1 - ((y - 0.2) / 0.085) ** 2))], bone: [0.16, 0.235, y => 0.1 * Math.sqrt(Math.max(0, 1 - ((y - 0.16) / 0.075) ** 2))] }[s.hat];
  const fit = g => { if (!crown) return g; const [y0, y1, r] = crown, p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { let y = p.getY(i); if (y < y0 - 0.01) continue; y = Math.min(y, y1 - 0.008); const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z), m = Math.max(0.005, r(y) - 0.006);
      p.setY(i, y); if (d > m) { p.setX(i, x * m / d); p.setZ(i, z * m / d); } } return g; };
  const hc = C(s.hairColor), H = (g, c = hc) => bd.rigid(fit(g), c, hb, 2), h = s.hair, kid = s.sex === 'c', swing = [];
  const pend = (at, geos) => { const b2 = Builder(); for (const [g, c, pt] of geos) b2.rigid(g, c, 0, pt); const m = new THREE.Mesh(b2.build(), bodyMaterial(null)); m.castShadow = true;
    const pivot = new THREE.Group(); pivot.position.copy(at); pivot.add(m); swing.push({ pivot, a: 0, v: 0, b: 0, vb: 0 }); };
  if (h === 'curto') H(hairShell(R, { t: capped ? 0.011 : kid ? 0.016 : 0.014, front: kid ? 0.32 : 0.4, side: 0.24, back: -0.62, crown: 0.012, quiff: kid ? 0.006 : 0.012, part: 0.32, fringe: kid ? 0.12 : 0 }));
  if (h === 'careca') H(hairShell(R, { t: 0.008, front: 0.5, side: 0.2, back: -0.55, noTop: true }));
  if (h === 'crespo') H(hairShell(R, { t: capped || scarf ? 0.012 : kid ? 0.03 : 0.042, front: 0.34, side: 0.14, back: -0.64, curl: capped ? 0.006 : 0.015, crown: capped ? 0.004 : 0.022, seg: 38 }));
  if (h === 'coque' || h === 'tranca' || h === 'longo' || h === 'chiquinha' || h === 'rabo') H(hairShell(R, { t: scarf ? 0.007 : 0.013, front: 0.38, side: 0.16, back: -0.68, crown: 0.006 }));
  const back = (y, z) => [0, SKULL.cy + y, SKULL.cz + z];
  if (h === 'coque' && !scarf) { const b = new THREE.SphereGeometry(1, 16, 12); const p = b.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + (vn3(p.getX(i) * 4, p.getY(i) * 4, p.getZ(i) * 4) - 0.5) * 0.25; p.setXYZ(i, p.getX(i) * 0.05 * k, p.getY(i) * 0.044 * k, p.getZ(i) * 0.05 * k); }
    b.translate(...back(0.07, -0.105)); H(b); H(new THREE.TorusGeometry(0.038, 0.012, 6, 16).rotateX(0.9).translate(...back(0.062, -0.1))); }
  if (h === 'longo') {
    const sh = new THREE.CylinderGeometry(1, 1, 0.3, 26, 10, true, Math.PI * 0.5, Math.PI), p = sh.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), t = (0.15 - y) / 0.3, a = Math.atan2(x, z), fl = 1 + 0.28 * t, wav = Math.sin(a * 11) * 0.03 * t;
      p.setXYZ(i, x * 0.095 * fl * (1 + wav), y - (t > 0.97 ? (vn3(a * 4, 1, 2) - 0.5) * 0.06 : 0), z * 0.105 * fl * (1 + wav)); }
    sh.translate(0, SKULL.cy - 0.13, SKULL.cz - 0.004); sh.computeVertexNormals(); H(sh);
    for (const sx of [-1, 1]) H(capsAB(V(sx * 0.084, SKULL.cy - 0.0, SKULL.cz + 0.025), V(sx * 0.096, SKULL.cy - 0.19, SKULL.cz + 0.01), 0.019)); }
  if (h === 'rabo') { const lat = new THREE.LatheGeometry([[0.0, 0.0], [0.018, -0.005], [0.026, -0.05], [0.028, -0.1], [0.022, -0.17], [0.012, -0.23], [0.002, -0.26]].map(([r, y]) => new THREE.Vector2(r, y)), 12), p = lat.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, p.getZ(i) - 0.35 * y * y); }
    pend(V(0, SKULL.cy + 0.03, SKULL.cz - 0.105), [[lat, hc, 2], [new THREE.TorusGeometry(0.017, 0.006, 5, 10).rotateX(Math.PI / 2).translate(0, -0.004, 0), C(0xc83a2a), 0]]); }
  if (h === 'tranca') { const geos = []; let y = 0; for (let k = 0; k < 8; k++) { const sx = (k % 2 ? 1 : -1) * 0.006, r = 0.022 - k * 0.0013; geos.push([new THREE.SphereGeometry(1, 10, 8).scale(r, 0.028, r * 0.9).rotateZ(sx * 25).translate(sx, y - 0.02, 0), hc, 2]); y -= 0.036; }
    geos.push([new THREE.TorusGeometry(0.012, 0.005, 5, 10).rotateX(Math.PI / 2).translate(0, y, 0), C(0xc83a2a), 0], [new THREE.ConeGeometry(0.016, 0.05, 8).rotateX(Math.PI).translate(0, y - 0.025, 0), hc, 2]);
    pend(V(0, SKULL.cy - 0.03, SKULL.cz - 0.1), geos); }
  if (h === 'chiquinha') for (const sx of [-1, 1]) { const b = new THREE.SphereGeometry(1, 12, 10); b.scale(0.04, 0.05, 0.04).translate(sx * 0.09, SKULL.cy + 0.04, SKULL.cz - 0.06); H(b);
    H(new THREE.TorusGeometry(0.014, 0.005, 5, 10).rotateY(Math.PI / 2).translate(sx * 0.078, SKULL.cy + 0.05, SKULL.cz - 0.05), C(0xf2c21a)); }
  const hat = s.hat;
  if (hat === 'palha') { const br = new THREE.CylinderGeometry(0.205, 0.215, 0.012, 28); const p = br.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z); p.setY(i, p.getY(i) - Math.max(0, r - 0.12) * 0.22 + Math.max(0, Math.abs(x) / 0.21 - 0.6) * 0.03); }
    bd.rigid(br.translate(0, 0.2, 0), C(0xe2cf8a), hb, 4); const cr = new THREE.CylinderGeometry(0.08, 0.1, 0.105, 18), q = cr.attributes.position; for (let i = 0; i < q.count; i++) if (q.getY(i) > 0.04) q.setY(i, q.getY(i) - Math.max(0, 0.04 - Math.abs(q.getX(i))) * 0.4);
    bd.rigid(cr.translate(0, 0.252, 0), C(0xe6d494), hb, 4); bd.rigid(new THREE.CylinderGeometry(0.101, 0.101, 0.022, 18, 1, true).translate(0, 0.215, 0), C(0x8a3a2a), hb); }
  if (hat === 'couro') { const br = new THREE.CylinderGeometry(0.18, 0.18, 0.016, 24), p = br.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z) / 0.18; p.setY(i, p.getY(i) + Math.max(0, Math.abs(x) / 0.18 - 0.45) * 0.08 * r - Math.max(0, Math.abs(z) / 0.18 - 0.5) * 0.02); }
    bd.rigid(br.translate(0, 0.205, 0), C(0x7a4a2a), hb, 5); bd.rigid(new THREE.SphereGeometry(0.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.85, 1.08).translate(0, 0.2, 0), C(0x6a3a22), hb, 5);
    bd.rigid(new THREE.TorusGeometry(0.1, 0.008, 4, 16).rotateX(Math.PI / 2).translate(0, 0.21, 0), C(0x3a2014), hb); }
  if (hat === 'bone') { bd.rigid(new THREE.SphereGeometry(0.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.75, 1.05).translate(0, 0.16, 0.005), C(s.hatColor || 0x2f6aa0), hb, 3);
    bd.rigid(new THREE.CylinderGeometry(0.075, 0.075, 0.01, 12, 1, false, -Math.PI / 2, Math.PI).scale(1, 1, 1.1).translate(0, 0.165, 0.085), C(s.hatColor || 0x2f6aa0), hb, 3); }
  if (hat === 'lenco') { const lc = C(s.lencoColor || 0xc83a2a), g = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, y + (vn3(p.getX(i) * 6, y * 6, p.getZ(i) * 6) - 0.5) * 0.04); }
    g.scale(0.104, 0.136, 0.122).rotateX(-0.38).translate(0, SKULL.cy + 0.008, SKULL.cz - 0.008); bd.rigid(g, lc, hb, 3);
    bd.rigid(new THREE.SphereGeometry(1, 10, 8).scale(0.024, 0.02, 0.018).translate(0, SKULL.cy - 0.055, SKULL.cz - 0.112), lc.clone().multiplyScalar(0.9), hb, 3);
    for (const sx of [-1, 1]) bd.rigid(new THREE.SphereGeometry(1, 8, 6).scale(0.016, 0.045, 0.006).rotateZ(sx * 0.35).translate(sx * 0.016, SKULL.cy - 0.1, SKULL.cz - 0.118), lc.clone().multiplyScalar(0.95), hb, 3); }
  return swing;
}
