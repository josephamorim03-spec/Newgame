// O juiz de gente: monta cada tipo de morador (homem, mulher de saia e de vestido, idoso, menino, menina), mede o corpo e o
// põe nas poses e no andar do jogo, e devolve nota e frases do que está errado (window.__juizGente.julgar() no console, ou
// sim/juiz_gente.js, que roda tudo e escreve JUIZ_GENTE.md). Quatro frentes:
//
//  FORMA       proporções do corpo contra a antropometria (frações da altura: cabeça, ombros, quadril, braço, antebraço,
//              mão, coxa, canela, pé, alturas do ombro, cotovelo, punho, quadril e joelho); malha: faces do avesso,
//              triângulos degenerados, quina na silhueta (mm entre o arco e a corda: pede mais segmentos), polígonos.
//  INTEGRAÇÃO  emendas: braço que aparece acima do ombro (a tampa do tubo), mão solta do punho, pé solto da perna, cabeça
//              solta do pescoço, cabelo aparecendo no rosto (a casca de dentro vazando), cabelo atravessando o chapéu,
//              lenço cobrindo os olhos, olho saltado da órbita, saia atravessada pelo quadril ou pelas pernas.
//  POSE        poses do jogo (braço erguido, braços à frente, agachado, ajoelhado lavando, sentado, enxada no alto): pele que
//              estica ou encolhe demais nas juntas (vinco), braço ou mão atravessando o tronco ou a cabeça, perna
//              atravessando a outra, junta além do limite do corpo (cotovelo e joelho dobrando ao contrário).
//  MOVIMENTO   o andar: pé que patina no apoio, flutua ou afunda, passada contra a altura (~0,41 da altura por passo a
//              ~1,2 m/s), o centro do corpo subindo e descendo (3 a 6 cm), o braço balançando contra a perna do mesmo lado.
//
// Fontes: Drillis & Contini (1966) e Winter, "Biomechanics and Motor Control of Human Movement" (segmentos como fração
// da altura); antropometria infantil (cabeça ~1/6 da altura aos 6–8 anos); Perry, "Gait Analysis" (passo e cadência).
import * as THREE from 'three';
import { heightAt } from './world.js';

// ---------- o corpo de verdade (frações da altura H)
export const ANTROPO = {
  adulto: { cabeca: [0.12, 0.14], ombros: [0.235, 0.275], quadril: [0.17, 0.215], braco: [0.17, 0.2], antebraco: [0.135, 0.16], mao: [0.095, 0.12], coxa: [0.225, 0.26], canela: [0.225, 0.26],
    pe: [0.14, 0.165], hOmbro: [0.8, 0.835], hCotovelo: [0.6, 0.645], hPunho: [0.46, 0.5], hQuadril: [0.5, 0.545], hJoelho: [0.27, 0.3], hOlho: [0.925, 0.945] },
  mulher: { ombros: [0.215, 0.255], quadril: [0.18, 0.225] },
  crianca: { cabeca: [0.15, 0.19], ombros: [0.23, 0.28], quadril: [0.17, 0.22], braco: [0.16, 0.2], antebraco: [0.12, 0.155], mao: [0.09, 0.115], coxa: [0.2, 0.25], canela: [0.2, 0.25],
    pe: [0.14, 0.17], hOmbro: [0.76, 0.81], hCotovelo: [0.56, 0.63], hPunho: [0.42, 0.49], hQuadril: [0.45, 0.52], hJoelho: [0.25, 0.29], hOlho: [0.9, 0.93] },
};
const NOMES = { cabeca: 'cabeça (alto ao queixo)', ombros: 'largura dos ombros', quadril: 'largura do quadril', braco: 'braço (ombro ao cotovelo)', antebraco: 'antebraço', mao: 'mão (punho à ponta do dedo)',
  coxa: 'coxa', canela: 'canela', pe: 'pé', hOmbro: 'altura do ombro', hCotovelo: 'altura do cotovelo', hPunho: 'altura do punho', hQuadril: 'altura do quadril', hJoelho: 'altura do joelho', hOlho: 'altura dos olhos' };
// os tipos julgados (fichas para gente.lab)
export const TIPOS = {
  'homem': { sex: 'm', build: 1, hat: null, sleeves: 'longa', beard: null, tool: 'enxada' },
  'homem de chapéu': { sex: 'm', build: 1, hat: 'palha', sleeves: 'curta', hair: 'crespo' },
  'mulher de saia': { sex: 'f', build: 1, hat: null, sleeves: 'curta', hair: 'coque', dress: false, skirt: 0.62, apron: true },
  'mulher de vestido e lenço': { sex: 'f', build: 1, hat: 'lenco', sleeves: 'longa', hair: 'longo', dress: true, skirt: 0.85, apron: false },
  'mulher forte de saia comprida': { sex: 'f', build: 1.12, hat: null, sleeves: 'curta', hair: 'curto', dress: false, skirt: 0.85, apron: true },   /* o porte muda a saia */
  'mulher magra de vestido': { sex: 'f', build: 0.88, hat: null, sleeves: 'curta', hair: 'coque', dress: true, skirt: 0.85, apron: false },
  'idoso': { sex: 'm', build: 1, old: true, hat: null, hair: 'careca', sleeves: 'longa' },
  'menino': { sex: 'c', build: 1, hair: 'curto', dress: false, skirt: 0 },
  'menina': { sex: 'c', build: 1, hair: 'tranca', dress: true, skirt: 0.32 },
};
// poses do jogo (as mesmas chaves de set() em people.js)
export const POSES = {
  'braço erguido (lata na cabeça)': { sh: [0, -2.75], el: [-0.3, -1.2], shz: [0.1, -0.25] },
  'braços à frente': { sh: [-1.3, -1.3], el: [-0.3, -0.3] },
  'braços abertos': { shz: [-1.2, 1.2], el: [-0.15, -0.15] },
  'agachado juntando': { sp: 0.9, hp: [-0.45, -0.3], kn: [0.6, 0.5], sh: [-1.3, -1.3], el: [-0.3, -0.3], hx: 0.3 },
  'ajoelhado lavando': { py: 0.52, sp: 0.85, hp: [0.05, 0.05], kn: [1.55, 1.55], sh: [-1.0, -1.0], el: [-0.4, -0.4], hx: 0.2 },
  'sentado no chão': { py: 0.18, hp: [-1.5, -1.4], kn: [0.35, 0.3], sh: [0.35, 0.35], el: [-0.2, -0.2], sp: -0.15 },
  'enxada no alto': { sh: [-2.9, -2.0], shz: [0.2, -0.5], el: [-0.4, -0.6], sp: -0.12 },
  'enxuga a testa': { sh: [-2.5, 0], el: [-2.0, -0.3], shz: [0.45, -0.1], hx: -0.15 },
  'mão na cintura': { sh: [0.2, 0.2], shz: [-0.5, 0.5], el: [-1.6, -1.6] },
};
const PARTE = ['quadril', 'tronco', 'cabeça', 'braço', 'antebraço', 'mão', 'braço', 'antebraço', 'mão', 'coxa', 'canela', 'pé', 'coxa', 'canela', 'pé'];
const r1 = v => Math.round(v * 10) / 10, r3 = v => Math.round(v * 1000) / 1000;
// distância de um ponto a um triângulo (o ponto mais perto do triângulo: região de Voronoi, Ericson, "Real-Time Collision Detection")
function ptTri(px, py, pz, a, b, c) { const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2], acx = c[0] - a[0], acy = c[1] - a[1], acz = c[2] - a[2], apx = px - a[0], apy = py - a[1], apz = pz - a[2];
  const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz; let qx, qy, qz;
  if (d1 <= 0 && d2 <= 0) { qx = a[0]; qy = a[1]; qz = a[2]; } else { const bpx = px - b[0], bpy = py - b[1], bpz = pz - b[2], d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
    if (d3 >= 0 && d4 <= d3) { qx = b[0]; qy = b[1]; qz = b[2]; } else { const vc = d1 * d4 - d3 * d2;
      if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); qx = a[0] + v * abx; qy = a[1] + v * aby; qz = a[2] + v * abz; } else { const cpx = px - c[0], cpy = py - c[1], cpz = pz - c[2], d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
        if (d6 >= 0 && d5 <= d6) { qx = c[0]; qy = c[1]; qz = c[2]; } else { const vb = d5 * d2 - d1 * d6;
          if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); qx = a[0] + w * acx; qy = a[1] + w * acy; qz = a[2] + w * acz; } else { const va = d3 * d6 - d5 * d4;
            if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); qx = b[0] + w * (c[0] - b[0]); qy = b[1] + w * (c[1] - b[1]); qz = b[2] + w * (c[2] - b[2]); }
            else { const den = 1 / (va + vb + vc), v = vb * den, w = vc * den; qx = a[0] + abx * v + acx * w; qy = a[1] + aby * v + acy * w; qz = a[2] + abz * v + acz * w; } } } } } }
  return Math.hypot(px - qx, py - qy, pz - qz); }
const V = new THREE.Vector3(), W = new THREE.Vector3(), M4 = new THREE.Matrix4();

export function createJuizGente({ gente, spot = [0, 0] }) {
  // ---------- montar e posar
  const step = (n = 4) => { for (let k = 0; k < n; k++) gente.update(1 / 30); };
  function pose(p, o) { window.__lab = o || {}; p.job = 'lab'; p.st = 'post'; p.g.visible = true; step(5); p.g.updateMatrixWorld(true); }
  // posições da pele (com os ossos) no espaço do corpo de 1,70 m (sem a escala, a posição e o giro da pessoa)
  function skin(p) { const m = p.body, g = m.geometry, n = g.attributes.position.count, S = new Float32Array(n * 3); m.updateMatrixWorld(true); M4.copy(p.g.matrixWorld).invert();
    for (let i = 0; i < n; i++) { m.getVertexPosition(i, V); V.applyMatrix4(m.matrixWorld).applyMatrix4(M4); S[i * 3] = V.x; S[i * 3 + 1] = V.y; S[i * 3 + 2] = V.z; } return S; }
  function dominante(g) { const si = g.attributes.skinIndex, sw = g.attributes.skinWeight, n = si.count, d = new Uint8Array(n);
    for (let i = 0; i < n; i++) { let b = si.getX(i), w = sw.getX(i); if (sw.getY(i) > w) { b = si.getY(i); w = sw.getY(i); } if (sw.getZ(i) > w) { b = si.getZ(i); w = sw.getZ(i); } if (sw.getW(i) > w) b = si.getW(i); d[i] = b; } return d; }
  const boneAt = (p, b) => { b.getWorldPosition(V); return p.g.worldToLocal(V.clone()); };
  // a peça de cada vértice (o Builder de body.js guarda o nome): 'tronco', 'braço', 'mão', 'perna', 'pé', 'cabeça', 'cabelo'...
  const pecas = g => { const pt = g.userData.part, nm = g.userData.partNames || []; return { of: i => nm[pt ? pt[i] : 0] || '?', ids: n => { const k = nm.indexOf(n); return k; }, pt }; };

  // ---------- FORMA
  function forma(p, tipo, S, dom) { const g = p.body.geometry, pat = g.attributes.pat, n = dom.length, out = [], kid = p.s.sex === 'c', f = p.s.sex === 'f', ref = { ...(kid ? ANTROPO.crianca : ANTROPO.adulto), ...(f ? ANTROPO.mulher : {}) }, M = {}, PC = pecas(g);
    let top = -9, chin = 9; const H0 = 0;   // chão = 0 no espaço do corpo; a altura vai até o alto do crânio (sem cabelo e sem chapéu)
    for (let i = 0; i < n; i++) { if (PC.of(i) !== 'cabeça') continue; const y = S[i * 3 + 1]; top = Math.max(top, y); if (S[i * 3 + 2] > 0.04 && Math.abs(S[i * 3]) < 0.03) chin = Math.min(chin, y); }
    const H = top - H0; M.altura = r3(H);
    const sh = [0, 1].map(i => boneAt(p, p.arms[i].sh)), el = [0, 1].map(i => boneAt(p, p.arms[i].el)), ha = [0, 1].map(i => boneAt(p, p.arms[i].ha)), hp = [0, 1].map(i => boneAt(p, p.legs[i].hp)), kn = [0, 1].map(i => boneAt(p, p.legs[i].kn)), ft = [0, 1].map(i => boneAt(p, p.legs[i].ft));
    let wSh = 0, wHip = 0, tip = 0, fz0 = 9, fz1 = -9; const yS = sh[0].y, yH = hp[0].y;
    for (let i = 0; i < n; i++) { const x = S[i * 3], y = S[i * 3 + 1], z = S[i * 3 + 2], pc = PC.of(i);
      if ((pc === 'tronco' || pc === 'braço') && y > yS - 0.12 && y < yS + 0.02) wSh = Math.max(wSh, Math.abs(x));
      if ((pc === 'tronco' || pc === 'perna') && Math.abs(y - yH) < 0.06) wHip = Math.max(wHip, Math.abs(x));
      if (pc === 'mão' && x > 0) tip = Math.max(tip, Math.hypot(x - ha[1].x, y - ha[1].y, z - ha[1].z));   // o osso da mão fica no punho; a ponta do dedo é o mais longe dele
      if (pc === 'pé' && x > 0) { fz0 = Math.min(fz0, z); fz1 = Math.max(fz1, z); } }
    Object.assign(M, { cabeca: (top - chin) / H, ombros: 2 * wSh / H, quadril: 2 * wHip / H, braco: sh[1].distanceTo(el[1]) / H, antebraco: el[1].distanceTo(ha[1]) / H, mao: tip / H, coxa: hp[1].distanceTo(kn[1]) / H, canela: kn[1].distanceTo(ft[1]) / H,
      pe: (fz1 - fz0) / H, hOmbro: yS / H, hCotovelo: el[1].y / H, hPunho: ha[1].y / H, hQuadril: yH / H, hJoelho: kn[1].y / H });
    if (['enxada', 'machado', 'vassoura', 'pa', 'serrote', 'vara'].includes(p.s.tool)) delete M.mao;   // mão fechada no cabo: não dá para medir o comprimento
    for (const k of Object.keys(NOMES)) { if (M[k] == null || !ref[k]) continue; const bw = p.bw || 1, larg = k === 'ombros' || k === 'quadril', lo = ref[k][0] * (larg ? Math.min(1, bw) : 1), hi = ref[k][1] * (larg ? Math.max(1, bw) : 1), v = M[k]; M[k] = r3(v);   /* o porte (build) alarga ou estreita ombro e quadril de verdade */
      if (v < lo || v > hi) { const d = Math.max(lo - v, v - hi) / ((lo + hi) / 2); out.push({ f: 'forma', pen: Math.min(14, 3 + 60 * d), msg: `${NOMES[k]} ${r3(v)} da altura (o corpo de verdade: ${r3(lo)}–${r3(hi)})${v < lo ? ' — curto/estreito' : ' — longo/largo'}` }); } }
    // malha: avesso, degenerados, quina na silhueta
    const ix = g.index.array, nrm = g.attributes.normal, P = g.attributes.position; let inv = 0, deg = 0; const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), N = new THREE.Vector3(); const invP = {}, degP = {};
    for (let t = 0; t < ix.length; t += 3) { A.fromBufferAttribute(P, ix[t]); B.fromBufferAttribute(P, ix[t + 1]); C.fromBufferAttribute(P, ix[t + 2]); const nn = B.sub(A).cross(C.sub(A)), L = nn.length();
      if (L < 1e-10) { deg++; const pp = PC.of(ix[t]); degP[pp] = (degP[pp] || 0) + 1; continue; } N.set(0, 0, 0); for (let j = 0; j < 3; j++) { N.x += nrm.getX(ix[t + j]); N.y += nrm.getY(ix[t + j]); N.z += nrm.getZ(ix[t + j]); } if (nn.dot(N) < 0) { inv++; const pp = PC.of(ix[t]); invP[pp] = (invP[pp] || 0) + 1; } }
    const tris = ix.length / 3; M.triangulos = tris;
    if (inv / tris > 0.005) out.push({ f: 'forma', pen: Math.min(20, 4 + 200 * inv / tris), msg: `${inv} faces do avesso (${r1(100 * inv / tris)}%: ${Object.entries(invP).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => k + ' ' + v).join(', ')})` });
    if (deg / tris > 0.01) out.push({ f: 'forma', pen: 3, msg: `${deg} triângulos degenerados (${Object.entries(degP).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => k + ' ' + v).join(', ')})` });
    // quina: o maior raio de cada parte em tubo e o número de lados do tubo (o arco menos a corda)
    const segs = p.body.userData.segs || { tronco: 22, braço: 14, coxa: 14 }; const rmax = {};
    for (let i = 0; i < n; i++) { const pp = PC.of(i), x = S[i * 3]; if (pp === 'tronco') rmax.tronco = Math.max(rmax.tronco || 0, Math.abs(x)); }
    rmax.coxa = 0.1; rmax.braço = 0.052; let worst = null;
    for (const k of ['tronco', 'coxa', 'braço']) { const sg = segs[k] || 14, r = rmax[k] * (p.g.scale.x || 1), e = r * (1 - Math.cos(Math.PI / sg)) * 1000; M['quina_' + k] = r1(e); if (e > 1.6 && (!worst || e > worst[1])) worst = [k, e, sg]; }
    if (worst) out.push({ f: 'forma', pen: Math.min(10, (worst[1] - 1.6) * 4), msg: `silhueta facetada: até ${r1(worst[1])} mm de quina no ${worst[0]} com ${worst[2]} lados (mais segmentos)` });
    return { M, out }; }

  // ---------- INTEGRAÇÃO (em pé, parado)
  function integracao(p, S, dom) { const g = p.body.geometry, pat = g.attributes.pat, n = dom.length, out = [], M = {}, PC = pecas(g);
    // silhueta do tronco por altura (meia largura e meia profundidade a cada 1 cm)
    const bins = new Map(); for (let i = 0; i < n; i++) { if (PC.of(i) !== 'tronco') continue; const k = Math.round(S[i * 3 + 1] * 100); const b = bins.get(k) || [0, 0]; b[0] = Math.max(b[0], Math.abs(S[i * 3])); b[1] = Math.max(b[1], Math.abs(S[i * 3 + 2])); bins.set(k, b); }
    const torso = y => bins.get(Math.round(y * 100)) || null;
    // a tampa do braço acima do ombro: vértice do braço acima do ombro e fora do tronco
    const yS = boneAt(p, p.arms[1].sh).y; let tampa = 0;
    for (let i = 0; i < n; i++) { if (PC.of(i) !== 'braço') continue; const y = S[i * 3 + 1]; if (y < yS - 0.005) continue; const t = torso(y); if (!t) { tampa = Math.max(tampa, 0.02); continue; } tampa = Math.max(tampa, Math.abs(S[i * 3]) - t[0]); }
    M.tampaOmbro = r1(tampa * 1000); if (tampa > 0.004) out.push({ f: 'integração', pen: Math.min(18, tampa * 1500), msg: `o braço aparece acima da linha do ombro: ${r1(tampa * 1000)} mm para fora do tronco (ombreira)` });
    // mão, pé e cabeça presos: a menor distância entre os vértices da peça e os da parte vizinha
    // vão entre duas peças: a menor distância de um vértice da peça A até um triângulo da peça B (do lado direito do corpo)
    const ix = g.index.array, P3 = i => [S[i * 3], S[i * 3 + 1], S[i * 3 + 2]];
    const gap = (pa, pb, yMin = -9) => { const A = [], T = []; for (let i = 0; i < n; i++) if (S[i * 3] > 0.02 && PC.of(i) === pa) A.push(i);
      for (let t = 0; t < ix.length; t += 3) { const a = ix[t]; if (PC.of(a) === pb && S[a * 3] > 0.0 && S[a * 3 + 1] > yMin) T.push([P3(a), P3(ix[t + 1]), P3(ix[t + 2])]); }
      if (!A.length || !T.length) return 0; let best = 9; for (const i of A) { const x = S[i * 3], y = S[i * 3 + 1], z = S[i * 3 + 2]; for (const [a, b, c] of T) { if (Math.abs(a[1] - y) > 0.15) continue; const d = ptTri(x, y, z, a, b, c); if (d < best) best = d; } if (best < 1e-4) break; } return best; };
    const gapC = () => gap('cabeça', 'tronco', 1.42);
    for (const [ba, bb, nome] of [['mão', 'braço', 'mão solta do punho'], ['pé', 'perna', 'pé solto da perna'], ['cabeça', 'tronco', 'cabeça solta do pescoço']]) { const d = ba === 'cabeça' ? gapC() : gap(ba, bb); M[nome] = r1(d * 1000); if (d > 0.006) out.push({ f: 'integração', pen: Math.min(14, d * 1200), msg: `${nome}: ${r1(d * 1000)} mm de vão` }); }
    // rosto (no espaço da cabeça): cabelo que aparece no rosto, cabelo que atravessa o chapéu, lenço sobre os olhos
    p.g.updateMatrixWorld(true); const Mh = new THREE.Matrix4().copy(p.head.matrixWorld).invert(), Mg = p.g.matrixWorld, Hd = [];
    const KIND = { 'cabeça': 0, 'cabelo': 2, 'chapéu': 4, 'lenço': 3, 'olho': 5 };
    const piv = p.corpo && p.corpo.headPiv;   /* a cabeça gira na junta do crânio (body.js): as medidas do rosto são a partir do queixo */
    for (let i = 0; i < n; i++) { const pc = PC.of(i); if (!(pc in KIND)) continue; V.set(S[i * 3], S[i * 3 + 1], S[i * 3 + 2]).applyMatrix4(Mg).applyMatrix4(Mh); if (piv) V.add(piv); Hd.push([V.x, V.y, V.z, KIND[pc], i]); }
    const c0 = [0, 0.115, 0.012], dirKey = (x, y, z) => { const dx = x - c0[0], dy = y - c0[1], dz = z - c0[2], r = Math.hypot(dx, dy, dz) || 1; return [Math.round(Math.acos(dy / r) / 0.12) * 100 + Math.round((Math.atan2(dx, dz) + Math.PI) / 0.12), r]; };
    const pele = new Map(), chapeu = new Map(); for (const [x, y, z, pt] of Hd) { const [k, r] = dirKey(x, y, z); if (pt === 0) pele.set(k, Math.max(pele.get(k) || 0, r)); if (pt >= 3) chapeu.set(k, Math.max(chapeu.get(k) || 0, r)); }   // (0 pele, 2 cabelo, 3 lenço, 4 chapéu)
    let rosto = 0, fura = 0, lenco = 0; const barba = false;
    for (const [x, y, z, pt] of Hd) { const [k, r] = dirKey(x, y, z);
      if (pt === 2 && !barba && z > 0.03 && y < 0.115 && y > 0.0 && Math.abs(x) < 0.085) { const sk = pele.get(k); if (sk && r > sk + 0.001) rosto++; }                // casca do cabelo vazando no rosto
      if (pt === 2 && p.s.hat && p.s.hat !== 'lenco' && y > 0.2) { const hc = chapeu.get(k); if (hc && r > hc + 0.002) fura++; }                                    // cabelo furando a copa do chapéu
      if (pt === 3 && p.s.hat === 'lenco' && z > 0.05 && y < 0.15 && y > 0.09 && Math.abs(x) < 0.06) lenco++; }                                                    // lenço descendo na testa até os olhos
    M.cabeloNoRosto = rosto; M.cabeloFuraChapeu = fura; M.lencoNosOlhos = lenco;
    if (rosto > 3) out.push({ f: 'integração', pen: Math.min(16, 4 + rosto * 0.3), msg: `cabelo aparecendo no rosto (${rosto} pontos da casca do cabelo por fora da pele, como mancha de barba)` });
    if (fura > 3) out.push({ f: 'integração', pen: Math.min(16, 4 + fura * 0.2), msg: `cabelo atravessando o chapéu (${fura} pontos por fora da copa)` });
    if (lenco > 3) out.push({ f: 'integração', pen: 14, msg: `lenço descendo sobre a testa até os olhos (${lenco} pontos)` });
    // olho saltado: o branco do olho muito à frente da pele em volta
    let olho = 0; for (const [x, y, z, pt] of Hd) if (pt === 5) olho = Math.max(olho, z);   /* a frente do olho (íris e brilho) contra a sobrancelha */
    let face = 0; for (const [x, y, z, pt] of Hd) if (pt === 0 && Math.abs(Math.abs(x) - 0.032) < 0.01 && Math.abs(y - 0.142) < 0.008) face = Math.max(face, z);
    M.olhoAFrente = r1((olho - face) * 1000); if (olho - face > 0.006) out.push({ f: 'integração', pen: Math.min(10, (olho - face) * 1000), msg: `olho saltado: ${r1((olho - face) * 1000)} mm à frente da sobrancelha` });
    return { M, out, torso }; }

  // ---------- pano: a saia entrando no quadril ou nas pernas (depois de assentar)
  function panoDentro(p) { if (!p.cloth || !p.cloth.length || !p.bw) return 0; const prof = p.body.userData.hipProf; if (!prof) return 0; let worst = 0;
    p.g.updateMatrixWorld(true); const Mi = new THREE.Matrix4().copy(p.pelvis.matrixWorld).invert();
    for (const c of p.cloth) { const pos = c.mesh.geometry.attributes.position; for (let i = 0; i < pos.count; i++) { V.fromBufferAttribute(pos, i).applyMatrix4(Mi); const y = V.y + 0.95;
      if (y < prof[0][0] || y > prof[prof.length - 1][0]) continue; let j = 0; while (j < prof.length - 2 && prof[j + 1][0] < y) j++; const a = prof[j], b = prof[j + 1], u = (y - a[0]) / (b[0] - a[0] || 1), L = k => a[k] + (b[k] - a[k]) * u;
      const zz = V.z - L(4), rz = zz > 0 ? L(2) : L(3), e = Math.sqrt((V.x / L(1)) ** 2 + (zz / rz) ** 2); if (e < 1) worst = Math.max(worst, (1 - e) * L(1)); } }
    return worst; }

  // saia estufada: a folga entre o pano e o corpo (tronco e alto da coxa) da cintura até o meio do quadril. Uma saia
  // de verdade é justa no cós e veste o quadril com 1–3 cm de folga; mais de 4,5 cm (nos 10% mais afastados) é saia de barril (o pano preso longe do corpo)
  function panoFolga(p) { if (!p.s || !p.s.skirt || !p.cloth || !p.cloth.length) return 0; const prof = p.body.userData.hipProf; if (!prof) return 0;
    p.g.updateMatrixWorld(true); const Mi = new THREE.Matrix4().copy(p.pelvis.matrixWorld).invert(), pos = p.cloth[0].mesh.geometry.attributes.position; const gaps = [];
    for (let i = 0; i < pos.count; i++) { V.fromBufferAttribute(pos, i).applyMatrix4(Mi); const y = V.y + 0.95; if (y < 0.86 || y > p.waistY + 0.005 || y > prof[prof.length - 1][0]) continue;
      let j = 0; while (j < prof.length - 2 && prof[j + 1][0] < y) j++; const a = prof[j], b = prof[j + 1], u = (y - a[0]) / (b[0] - a[0] || 1), L = k => a[k] + (b[k] - a[k]) * u;
      const zz = V.z - L(4), ang = Math.atan2(zz, V.x), rB = 1 / Math.hypot(Math.cos(ang) / L(1), Math.sin(ang) / (zz > 0 ? L(2) : L(3))); gaps.push(Math.hypot(V.x, zz) - rB); }
    gaps.sort((x, y) => x - y); return gaps.length ? gaps[Math.floor(gaps.length * 0.9)] : 0; }   /* os 10% mais afastados: onde estufa */

  // ---------- POSE
  // vinco: a área de pele (cm², medida parado) dos triângulos que esticam mais de 2,2× ou encolhem a menos de 0,45× com a pose
  // (área, e não contagem: não depende de quantos polígonos a malha tem)
  function vinco(p, S0, S1) { const g = p.body.geometry, ix = g.index.array, PC = pecas(g); let bad = 0; const onde = {};
    for (let t = 0; t < ix.length; t += 3) { let lo = 9, hi = 0; for (let e = 0; e < 3; e++) { const i = ix[t + e], j = ix[t + (e + 1) % 3];
        const r0 = Math.hypot(S0[i * 3] - S0[j * 3], S0[i * 3 + 1] - S0[j * 3 + 1], S0[i * 3 + 2] - S0[j * 3 + 2]); if (r0 < 1e-5) continue;
        const rr = Math.hypot(S1[i * 3] - S1[j * 3], S1[i * 3 + 1] - S1[j * 3 + 1], S1[i * 3 + 2] - S1[j * 3 + 2]) / r0; lo = Math.min(lo, rr); hi = Math.max(hi, rr); }
      if (lo < 0.45 || hi > 2.2) { const a = ix[t] * 3, b = ix[t + 1] * 3, c = ix[t + 2] * 3, ux = S0[b] - S0[a], uy = S0[b + 1] - S0[a + 1], uz = S0[b + 2] - S0[a + 2], vx = S0[c] - S0[a], vy = S0[c + 1] - S0[a + 1], vz = S0[c + 2] - S0[a + 2];
        const ar = 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) * 1e4; bad += ar; const nm = PC.of(ix[t]); onde[nm] = (onde[nm] || 0) + ar; } }
    for (const k in onde) onde[k] = Math.round(onde[k]);
    return { n: Math.round(bad), onde: Object.entries(onde).sort((x, y) => y[1] - x[1]).slice(0, 2).map(([k, v]) => `${k} ${v}`).join(', ') }; }
  // braço/mão dentro do tronco: leva o vértice para o espaço do tronco (osso da coluna) e compara com a silhueta parada
  function atravessa(p, S1, dom, torso) { p.g.updateMatrixWorld(true); const Ms = new THREE.Matrix4().copy(p.spine.matrixWorld).invert(), Mg = p.g.matrixWorld, sp0 = p.__spine0; let fundo = 0, cab = 0;
    const OB = p.body.userData.ossosBraco ? new Set(p.body.userData.ossosBraco) : new Set([4, 5, 7, 8]), OM = p.body.userData.ossosMao ? new Set(p.body.userData.ossosMao) : new Set([5, 8]);   /* os ossos do antebraço e da mão (body.js diz quais são) */
    for (let i = 0; i < dom.length; i++) { const b = dom[i]; if (!OB.has(b)) continue; V.set(S1[i * 3], S1[i * 3 + 1], S1[i * 3 + 2]).applyMatrix4(Mg).applyMatrix4(Ms).add(sp0);
      const t = torso(V.y); if (t && V.y > 1.0 && V.y < 1.42) { const e = Math.hypot(V.x / (t[0] - 0.015), V.z / (t[1] - 0.015)); if (e < 1) fundo = Math.max(fundo, (1 - e) * Math.min(t[0], t[1])); } }
    // mão dentro da cabeça
    const Mh = new THREE.Matrix4().copy(p.head.matrixWorld).invert();
    const piv = p.corpo && p.corpo.headPiv; for (let i = 0; i < dom.length; i++) { if (!OM.has(dom[i])) continue; V.set(S1[i * 3], S1[i * 3 + 1], S1[i * 3 + 2]).applyMatrix4(Mg).applyMatrix4(Mh); if (piv) V.add(piv); const e = Math.hypot(V.x / 0.08, (V.y - 0.115) / 0.105, (V.z - 0.012) / 0.09); if (e < 1) cab = Math.max(cab, (1 - e) * 0.08); }
    return { fundo, cab }; }
  function limites(p) { const v = []; p.arms.forEach((a, i) => { if (a.el.rotation.x > 0.08) v.push(`cotovelo ${i ? 'direito' : 'esquerdo'} dobrando ao contrário (${r1(a.el.rotation.x * 57.3)}°)`); if (a.sh.rotation.x < -3.25) v.push(`ombro passou do limite (${r1(-a.sh.rotation.x * 57.3)}°)`); });
    p.legs.forEach((l, i) => { if (l.kn.rotation.x < -0.08) v.push(`joelho ${i ? 'direito' : 'esquerdo'} dobrando ao contrário (${r1(-l.kn.rotation.x * 57.3)}°)`); if (l.kn.rotation.x > 2.65) v.push(`joelho além do limite (${r1(l.kn.rotation.x * 57.3)}°)`); });
    if (p.spine.rotation.x > 1.4 || p.spine.rotation.x < -0.6) v.push(`coluna além do limite (${r1(p.spine.rotation.x * 57.3)}°)`); return v; }
  function poses(p, S0, dom, torso) { const out = [], M = {};
    for (const [nome, o] of Object.entries(POSES)) { pose(p, o); const S1 = skin(p), vc = vinco(p, S0, S1), at = atravessa(p, S1, dom, torso), lim = limites(p);
      M[nome] = { vinco: vc.n, dentro: r1(at.fundo * 1000), cabeca: r1(at.cab * 1000) };
      if (vc.n > 25) out.push({ f: 'pose', pen: Math.min(10, 2 + vc.n * 0.06), msg: `${nome}: ${vc.n} cm² de pele esticando/encolhendo demais (${vc.onde} cm²)` });
      if (at.fundo > 0.012) out.push({ f: 'pose', pen: Math.min(12, at.fundo * 500), msg: `${nome}: braço/mão entra ${r1(at.fundo * 100)} cm no tronco` });
      if (at.cab > 0.008) out.push({ f: 'pose', pen: Math.min(10, at.cab * 600), msg: `${nome}: a mão entra ${r1(at.cab * 100)} cm na cabeça` });
      for (const l of lim) out.push({ f: 'pose', pen: 8, msg: `${nome}: ${l}` });
      if (p.cloth && p.cloth.length) { step(20); const d = panoDentro(p); if (d > 0.012) out.push({ f: 'integração', pen: Math.min(12, d * 500), msg: `${nome}: o quadril atravessa a saia (${r1(d * 100)} cm)` }); } }
    return { out, M }; }

  // ---------- MOVIMENTO: o andar (alguém que chega andando até um ponto distante)
  function andar(spec) { const out = [], M = {}; if (!gente.arrive) return { out, M };
    const from = [spot[0] - 12, spot[1]], to = [spot[0] + 12, spot[1]]; let p = null;
    for (let k = 0; k < 8; k++) { const q = gente.arrive({ from, house: null, door: to, spots: [] }); if (!q) break; if (!q.kid) { p = q; break; } q.g.visible = false; q.job = 'lab'; q.x += 300; }
    if (!p) return { out, M }; p.vel = 1.25;   /* um adulto andando no passo comum */
    const dt = 1 / 60, fts = p.legs.map(l => l.ft), soleY = l => { l.ft.getWorldPosition(V); return V; };
    let slip = 0, slipN = 0, flut = 0, afunda = 0, dist = 0, lx = p.x, lz = p.z, ys = [], prev = [null, null], cont = [0, 0], frames = 0, sw = 0, swN = 0, H = (p.s.h || 1.7), ph0 = null;
    for (let k = 0; k < 300; k++) { gente.update(dt); p.g.updateMatrixWorld(true); if (k < 60) { lx = p.x; lz = p.z; ph0 = p.ph; continue; } frames++; dist += Math.hypot(p.x - lx, p.z - lz); lx = p.x; lz = p.z;
      p.pelvis.getWorldPosition(V); ys.push(V.y - heightAt(V.x, V.z));
      const sole = p.legs.map(l => { l.ft.getWorldPosition(W); return W.clone(); }), gy = sole.map(s => heightAt(s.x, s.z)), low = sole[0].y - gy[0] < sole[1].y - gy[1] ? 0 : 1;
      // o pé de baixo é o de apoio: não deve escorregar no chão
      const s = sole[low]; if (prev[low] && cont[low] > 4) { slip += Math.hypot(s.x - prev[low].x, s.z - prev[low].z) / dt; slipN++; }   /* só com o pé já assentado (sem o instante da pisada) */
      prev[low] = s; prev[1 - low] = null; cont[low]++; cont[1 - low] = 0;
      // braço contra perna: o braço esquerdo vai à frente com a perna direita
      sw += Math.sign(p.arms[0].sh.rotation.x) * Math.sign(p.legs[0].hp.rotation.x); swN++; }
    const v = dist / (frames * dt), passos = (p.ph - ph0) / Math.PI;   // meio ciclo da fase = um passo
    M.velocidade = Math.round(v * 100) / 100; M.deslize = Math.round(slip / Math.max(1, slipN) * 100) / 100; M.sobeDesce = r1((Math.max(...ys) - Math.min(...ys)) * 100);
    // passada: distância andada por meio ciclo da fase do passo (people.js: p.ph)
    M.passoAltura = passos > 0.5 ? r3(dist / passos / H) : null; M.bracoContraPerna = r3(sw / Math.max(1, swN));
    if (M.passoAltura != null && (M.passoAltura < 0.33 || M.passoAltura > 0.48)) out.push({ f: 'movimento', pen: 8, msg: `passo de ${M.passoAltura} da altura (andar de verdade a ~1,2 m/s: 0,37–0,45)` });
    if (M.deslize > 0.15) out.push({ f: 'movimento', pen: Math.min(20, M.deslize * 30), msg: `o pé de apoio patina no chão: ${M.deslize} m/s (pisada firme: < 0,1 m/s) — a passada não acompanha a velocidade` });
    if (M.sobeDesce < 1.5 || M.sobeDesce > 7) out.push({ f: 'movimento', pen: 5, msg: `o corpo sobe e desce ${M.sobeDesce} cm por passo (andar de verdade: 3–6 cm)` });
    if (M.bracoContraPerna > -0.2) out.push({ f: 'movimento', pen: 6, msg: `o braço não balança contra a perna do mesmo lado (${M.bracoContraPerna})` });
    p.g.visible = false; p.job = 'lab'; p.x += 200; return { out, M }; }

  // ---------- o julgamento
  function julgarTipo(nome) { const spec = TIPOS[nome], p = gente.lab({ ...spec }, spot, 0); p.__spine0 = new THREE.Vector3();
    pose(p, {}); const g = p.body.geometry, dom = dominante(g), S0 = skin(p);
    { const sp = p.spine; sp.updateMatrixWorld(true); const q = new THREE.Vector3(); sp.getWorldPosition(q); p.g.worldToLocal(q); p.__spine0.copy(q); }
    const F = forma(p, nome, S0, dom), I = integracao(p, S0, dom), Po = poses(p, S0, dom, I.torso);
    step(30); pose(p, {}); const pano = panoDentro(p); if (pano > 0.012) I.out.push({ f: 'integração', pen: Math.min(12, pano * 500), msg: `em pé, o quadril atravessa a saia (${r1(pano * 100)} cm)` });
    const folga = panoFolga(p); if (folga) I.M.saiaFolga = r1(folga * 1000); if (folga > 0.045) I.out.push({ f: 'forma', pen: Math.min(15, (folga - 0.045) * 400), msg: `a saia estufa longe do corpo: ${r1(folga * 100)} cm de folga entre a cintura e o quadril (justa: 1–3 cm)` });
    p.g.visible = false; p.x += 300; if (p.cloth) for (const c of p.cloth) c.mesh.visible = false;
    return { medidas: { ...F.M, ...I.M }, poses: Po.M, achados: [...F.out, ...I.out, ...Po.out] }; }
  function julgar({ tipos = Object.keys(TIPOS), andarJunto = true } = {}) { const rel = {}; window.__pertoTodos = true;   /* o detalhe de perto (anatomia.js: mãos, chão, braço fora do tronco) ligado para todos */
    for (const t of tipos) rel[t] = julgarTipo(t);
    const A = andarJunto ? andar() : { out: [], M: {} };
    for (const t in rel) { const r = rel[t]; if (andarJunto) { r.andar = A.M; r.achados.push(...A.out.map(x => ({ ...x }))); }
      const cat = { forma: 100, 'integração': 100, pose: 100, movimento: 100 }; for (const x of r.achados) cat[x.f] = Math.max(0, cat[x.f] - x.pen);
      r.notas = Object.fromEntries(Object.entries(cat).map(([k, v]) => [k, Math.round(v)])); r.nota = Math.round(Object.values(cat).reduce((a, b) => a + b, 0) / 4); }
    return { tipos: rel }; }
  return { julgar, julgarTipo, andar, ANTROPO, TIPOS, POSES };
}
