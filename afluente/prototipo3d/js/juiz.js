// O juiz dos bichos: mede cada espécie e compara com o bicho de verdade, em quatro frentes, e devolve nota e frases
// do que está errado (window.__juiz.julgar() no console, ou sim/juiz_bichos.js, que roda tudo e escreve JUIZ.md).
//
//  FORMA     proporções (altura da cernelha, comprimento, profundidade do peito, tamanho da cabeça) contra a tabela ANAT;
//            qualidade da malha: faceta da silhueta (mm), faces do avesso, triângulos degenerados, polígonos por bicho.
//  POSE      perna da frente reta no apoio (o "joelho" é o carpo), ângulo do jarrete, perna que escapa do tronco
//            (cm para fora da silhueta do corpo), pele que dobra ou estica demais nas juntas (vinco), focinho que alcança
//            o chão ao pastar, barriga que não encosta no chão.
//  MOVIMENTO casco que flutua, afunda ou patina no apoio; ordem das pisadas (andar: trás-esq, frente-esq, trás-dir,
//            frente-dir); fração de apoio; passada proporcional à altura; troca de andadura no número de Froude certo;
//            corpo que balança demais.
//  COMPORTAMENTO quanto do dia cada bicho passa pastando, andando, parado, fugindo (contra a referência da espécie);
//            bicho travado (diz que anda e não sai do lugar).
//
// As medidas reais vêm de guias de conformação e de fichas das espécies (ver JUIZ.md, "Fontes").
import * as THREE from 'three';
import { heightAt, waterDist } from './world.js';

// ---------- a tabela do bicho de verdade (metros, graus, frações)
// cern: altura na cernelha (ave: altura da cabeça em pé); comp: comprimento do corpo (cc: cabeça+corpo, sem rabo);
// peito: profundidade do tórax / cernelha; cab: comprimento da cabeça; jF: ângulo do carpo no apoio; jH: jarrete no apoio;
// passo: passada do andar / cernelha; apoio: fração de apoio no andar; froude: Froude da troca andar→trote (v²/g·h);
// tempo: fração do tempo de dia em cada estado
export const ANAT = {
  boi: { cern: [1.22, 1.45], comp: [1.4, 1.75], peito: [0.48, 0.6], cab: [0.42, 0.58], jF: [168, 182], jH: [138, 166], passo: [0.85, 1.4], apoio: [0.58, 0.75], froude: [0.25, 0.7],
    tempo: { graze: [0.3, 0.65], idle: [0.15, 0.5], walk: [0.05, 0.3], drink: [0, 0.1] } },
  bezerro: { cern: [0.72, 1.0], comp: [0.8, 1.15], peito: [0.42, 0.58], jF: [168, 182], jH: [138, 166], passo: [0.85, 1.5], apoio: [0.55, 0.75], froude: [0.25, 0.7],
    tempo: { graze: [0.2, 0.6], idle: [0.2, 0.6], walk: [0.05, 0.35] } },
  capivara: { cern: [0.5, 0.64], comp: [1.0, 1.34], cc: true, peito: [0.5, 0.72], cab: [0.24, 0.34], jF: [150, 182], jH: [110, 165], passo: [0.6, 1.4], apoio: [0.55, 0.78], froude: [0.25, 0.8],
    tempo: { graze: [0.25, 0.6], idle: [0.2, 0.6], walk: [0.04, 0.3], swim: [0.0, 0.25], drink: [0, 0.12] } },
  ovelha: { cern: [0.6, 0.82], comp: [0.85, 1.25], peito: [0.45, 0.62], cab: [0.22, 0.32], jF: [168, 182], jH: [135, 166], passo: [0.75, 1.4], apoio: [0.58, 0.75], froude: [0.25, 0.7],
    tempo: { graze: [0.35, 0.7], idle: [0.15, 0.5], walk: [0.05, 0.3] } },
  'lobo-guará': { pasta: false, cern: [0.82, 0.95], comp: [0.95, 1.2], cc: true, peito: [0.28, 0.42], cab: [0.24, 0.34], jF: [165, 182], jH: [130, 165], passo: [0.9, 1.6], apoio: [0.5, 0.72], froude: [0.25, 0.8],
    tempo: { walk: [0.25, 0.7], idle: [0.1, 0.5], graze: [0.0, 0.35] } },
  'onça-pintada': { pasta: false, cern: [0.6, 0.78], comp: [1.1, 1.85], cc: true, peito: [0.45, 0.62], cab: [0.22, 0.34], jF: [160, 182], jH: [120, 165], passo: [0.8, 1.6], apoio: [0.5, 0.72], froude: [0.25, 0.8],
    tempo: { walk: [0.15, 0.6], idle: [0.3, 0.8], graze: [0, 0.3] } },
  anta: { cern: [0.75, 1.08], comp: [1.7, 2.5], cc: true, peito: [0.5, 0.66], cab: [0.36, 0.5], jF: [162, 182], jH: [130, 166], passo: [0.75, 1.4], apoio: [0.58, 0.76], froude: [0.25, 0.7],
    tempo: { graze: [0.3, 0.65], idle: [0.1, 0.5], walk: [0.05, 0.35], swim: [0, 0.25] } },
  'tamanduá-bandeira': { cern: [0.55, 0.7], comp: [1.0, 1.45], cc: true, peito: [0.6, 0.85], jF: [150, 182], jH: [120, 166], passo: [0.6, 1.4], apoio: [0.6, 0.8], froude: [0.2, 0.7],
    tempo: { graze: [0.25, 0.65], walk: [0.15, 0.55], idle: [0.05, 0.4] } },
  'garça-branca': { cern: [0.8, 1.05], ave: true, tempo: { idle: [0.45, 0.95], walk: [0.05, 0.45] } },
  'garça-moura': { cern: [0.95, 1.3], ave: true, tempo: { idle: [0.45, 0.95], walk: [0.05, 0.45] } },
  seriema: { cern: [0.7, 0.9], ave: true, tempo: { walk: [0.25, 0.7], graze: [0.1, 0.5], idle: [0.05, 0.4] } },
  ema: { cern: [1.25, 1.55], ave: true, tempo: { walk: [0.2, 0.6], graze: [0.2, 0.6], idle: [0.05, 0.4] } },
  galinha: { cern: [0.32, 0.5], ave: true, tempo: { graze: [0.35, 0.75], walk: [0.1, 0.45], idle: [0.05, 0.4] } },
};
const ESTADOS = ['graze', 'idle', 'walk', 'drink', 'swim', 'flee', 'lie'];

const V = new THREE.Vector3(), W = new THREE.Vector3(), P = new THREE.Vector3(), Mi = new THREE.Matrix4();
const ang = (a, b, c) => { const u = a.clone().sub(b), v = c.clone().sub(b); return Math.acos(Math.max(-1, Math.min(1, u.dot(v) / (u.length() * v.length() || 1)))) * 180 / Math.PI; };
const r2 = v => Math.round(v * 100) / 100, r1 = v => Math.round(v * 10) / 10;

export function createJuiz({ fauna, people = () => [] }) {
  const especies = () => { const m = new Map(); for (const a of fauna.animals) { const n = a.g.userData.regua; if (ANAT[n] && a.rig && !m.has(n)) m.set(n, a); } return m; };

  // ---------- FORMA: medidas no repouso (a malha sem pose) e qualidade da malha
  function forma(a) { const R = a.rig, g = R.mesh.geometry, p = g.attributes.position, part = g.userData.part, names = g.userData.partNames, s = a.g.scale.x, ref = ANAT[a.g.userData.regua], out = [];
    const id = n => names.indexOf(n), iC = id('corpo'), iN = id('pescoco'), iH = id('cabeca');
    let minZ = 1e9, maxZ = -1e9, minZa = 1e9, maxZa = -1e9, cern = 0, topY = 0, hMin = 1e9, hMax = -1e9, pMin = 1e9, pMax = -1e9;
    const zf = R.zf / s, zm = (R.zf + R.zb) / 2 / s, zg = zf - 0.18 * R.K;   // em unidades da malha: ombro, meio do dorso, cilha
    for (let i = 0; i < p.count; i++) { const k = part[i], x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (k === iC) { minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); if (Math.abs(z - zm) < 0.12 * R.K && Math.abs(x) < 0.08 * R.K) cern = Math.max(cern, y); if (Math.abs(z - zg) < 0.12 * R.K && Math.abs(x) < 0.16 * R.K) { pMin = Math.min(pMin, y); pMax = Math.max(pMax, y); } }
      if (k === iC || k === iN || k === iH) { minZa = Math.min(minZa, z); maxZa = Math.max(maxZa, z); topY = Math.max(topY, y); }
      if (k === iH) { hMin = Math.min(hMin, z); hMax = Math.max(hMax, z); } }
    const M = { cern: (R.kind === 'bird' ? topY : cern) * s, comp: ((ref && ref.cc) ? maxZa - minZa : maxZ - minZ) * s, peito: pMax > pMin ? (pMax - pMin) / (cern || 1) : null, cab: (hMax - hMin) * s };
    const chk = (k, nome, un = 'm') => { if (!ref || !ref[k]) return; const [lo, hi] = ref[k], v = M[k]; if (v == null) return; if (v < lo || v > hi) out.push({ f: 'forma', pen: Math.min(20, 6 + 40 * Math.max(lo - v, v - hi) / ((lo + hi) / 2)), msg: `${nome} ${r2(v)}${un} (o bicho de verdade: ${lo}–${hi}${un})` }); };
    chk('cern', R.kind === 'bird' ? 'altura' : 'altura do dorso'); chk('comp', ref && ref.cc ? 'comprimento cabeça+corpo' : 'comprimento do corpo'); if (R.kind !== 'bird' && M.peito != null) { chk('peito', 'peito/altura', ''); }
    // malha: faces do avesso (a ordem dos vértices contra a normal guardada) e degeneradas; faceta da silhueta do corpo
    const ix = g.index.array, nrm = g.attributes.normal; let inv = 0, deg = 0; const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), N = new THREE.Vector3();
    for (let t = 0; t < ix.length; t += 3) { A.fromBufferAttribute(p, ix[t]); B.fromBufferAttribute(p, ix[t + 1]); C.fromBufferAttribute(p, ix[t + 2]); const n = B.sub(A).cross(C.sub(A)), L = n.length();
      if (L < 1e-9) { deg++; continue; } N.set(0, 0, 0); for (let j = 0; j < 3; j++) N.x += nrm.getX(ix[t + j]), N.y += nrm.getY(ix[t + j]), N.z += nrm.getZ(ix[t + j]); if (n.dot(N) < 0) inv++; }
    const tris = ix.length / 3; if (inv / tris > 0.01) out.push({ f: 'forma', pen: Math.min(25, 5 + 100 * inv / tris), msg: `${inv} faces do avesso (${r1(100 * inv / tris)}%)` });
    if (deg / tris > 0.02) out.push({ f: 'forma', pen: 3, msg: `${deg} triângulos degenerados` });
    let fac = 0; if (R.bodyRings) for (const r of R.bodyRings) fac = Math.max(fac, Math.max(r.rx, r.rt, r.rb) * R.K * s * (1 - Math.cos(Math.PI / (R.seg || 26))));
    if (fac > 0.0025) out.push({ f: 'forma', pen: Math.min(10, (fac - 0.0025) * 2500), msg: `silhueta facetada: até ${r1(fac * 1000)} mm de quina no corpo (mais segmentos)` });
    return { M, tris, out }; }

  // ---------- passo controlado de um bicho (o resto do vale segue normal)
  function freeze(a) { a.__juiz = true; return () => { a.__juiz = false; }; }
  const sole = (L, out) => out.set(0, -L.L3, 0).applyMatrix4(L.ank.matrixWorld);
  function rodar(a, estado, segs, dt, cb) { const t0 = performance.now() / 1000; let t = 0;
    for (let k = 0; k * dt < segs; k++) { t += dt; if (estado === 'walk' || estado === 'trot') { a.st = 'walk'; a.t = 99; if (!a.tgt || Math.hypot(a.tgt[0] - a.x, a.tgt[1] - a.z) < 2) a.tgt = a.pick(null); if (estado === 'trot') a.sp = a.vw * 1.6; }
      else { a.st = estado; a.t = 99; a.tgt = null; if (estado !== 'graze') a.sp = 0; }
      a.act = null; a.ia = 999; a.sit = false; a.restLeg = -1; a.goal = null; a.__calmo = estado === 'walk' || estado === 'trot'; if (a.stalker) a.stk = 5; if (k === 0) { a.sitK = 0; a.lie = 0; a.restK = 0; a.stalk = 0; a.crouch = 0; }   /* o andar medido é o normal (a espreita é outra pose) */ fauna.step(a, dt, t0 + t); a.g.updateMatrixWorld(true); cb && cb(t); } a.__calmo = false; }

  // ---------- POSE e MOVIMENTO
  function movimento(a) { const R = a.rig, ref = ANAT[a.g.userData.regua], out = [], s = a.g.scale.x; if (R.kind === 'bird' || !ref) return { out, M: {} };
    const un = freeze(a), sv = { x: a.x, z: a.z, h: a.h, st: a.st, sp: a.sp, tgt: a.tgt, act: a.act, sit: a.sit, restLeg: a.restLeg, allowWater: a.allowWater, goal: a.goal }; window.__juizNear = true; const M = {};
    for (let k = 0; k < 40; k++) { const q = a.pick(null); if (waterDist(q[0], q[1]) > 2.5) { a.x = q[0]; a.z = q[1]; break; } } a.goal = null; a.allowWater = false;
    try {
      // parado: perna da frente reta? jarrete? barriga longe do chão?
      rodar(a, 'idle', 2, 1 / 30);
      const jf = [], jh = []; R.legs.forEach(L => { L.hip.getWorldPosition(V); L.knee.getWorldPosition(W); L.ank.getWorldPosition(P); (L.front ? jf : jh).push(ang(V, W, P)); });
      M.jF = r1(Math.min(...jf)); M.jH = r1(Math.min(...jh));
      if (ref.jF && (M.jF < ref.jF[0])) out.push({ f: 'pose', pen: Math.min(18, (ref.jF[0] - M.jF) * 0.8), msg: `perna da frente dobrada parado: carpo a ${M.jF}° (reta: ${ref.jF[0]}–180°)` });
      if (ref.jH && (M.jH < ref.jH[0] || M.jH > ref.jH[1])) out.push({ f: 'pose', pen: Math.min(15, Math.max(ref.jH[0] - M.jH, M.jH - ref.jH[1]) * 0.6), msg: `jarrete a ${M.jH}° (perna boa: ${ref.jH[0]}–${ref.jH[1]}°)` });
      const pr = protrusao(a); M.fora = r1(pr * 100); if (pr > 0.012) out.push({ f: 'pose', pen: Math.min(15, pr * 500), msg: `perna sai do tronco: ${r1(pr * 100)} cm para fora da silhueta (parado)` });
      // pastando: o focinho alcança o chão?
      if (R.beak && ref.cab && ref.pasta !== false) { rodar(a, 'graze', 2.5, 1 / 30); V.copy(R.beak); R.head.localToWorld(V); const h = V.y - heightAt(V.x, V.z); M.focinho = r2(h);
        if (h > 0.09) out.push({ f: 'pose', pen: Math.min(12, h * 60), msg: `pastando, o focinho fica a ${Math.round(h * 100)} cm do capim` }); else if (h < -0.04) out.push({ f: 'pose', pen: 6, msg: `pastando, o focinho entra ${Math.round(-h * 100)} cm no chão` });
        const dobra = vinco(a); M.vincoPastar = dobra.n; if (dobra.n > 6) out.push({ f: 'pose', pen: Math.min(12, dobra.n * 0.4), msg: `pastando, a pele dobra/estica demais em ${dobra.n} triângulos (${dobra.onde})` }); }
      // andando: pisadas, deslize, flutuação, ordem, passada, apoio, balanço do corpo
      rodar(a, 'walk', 1.5, 1 / 60);
      const N = R.legs.length, prev = Array(N).fill(null), contact = Array(N).fill(false), down = [], cont = Array(N).fill(0); let frames = 0, slip = 0, slipN = 0, floatMax = 0, sink = 0, dist = 0, lx = a.x, lz = a.z, pitch = [], ys = [], wk = 0, knees = [];
      rodar(a, 'walk', 5, 1 / 60, t => { frames++; dist += Math.hypot(a.x - lx, a.z - lz); lx = a.x; lz = a.z; R.root.getWorldPosition(V); ys.push(V.y - heightAt(V.x, V.z)); pitch.push(R.root.rotation.x);
        const cyc = a.ph / (Math.PI * 2);
        R.legs.forEach((L, i) => { sole(L, W); const g0 = heightAt(W.x, W.z), h = W.y - g0, u = ((cyc + a.goff[i]) % 1 + 1) % 1, c = u < a.duty, mid = u > a.duty * 0.15 && u < a.duty * 0.85; sink = Math.max(sink, -h); if (mid) floatMax = Math.max(floatMax, h);
          if (c) { cont[i]++; if (prev[i] && contact[i] && mid) { slip += Math.hypot(W.x - prev[i].x, W.z - prev[i].z) / (1 / 60); slipN++; } } if (c && !contact[i]) down.push([t, i]);
          contact[i] = c; prev[i] = W.clone(); if (L.front && c) { L.hip.getWorldPosition(V); L.knee.getWorldPosition(P); const k2 = ang(V, P, L.ank.getWorldPosition(new THREE.Vector3())); knees.push(k2); } }); });
      const v = dist / 5, Hh = (R.legs[2].L1 + R.legs[2].L2 + R.legs[2].L3) * s, cern = ANAT[a.g.userData.regua].cern ? (ANAT[a.g.userData.regua].cern[0] + ANAT[a.g.userData.regua].cern[1]) / 2 : 1;
      M.vel = r2(v); M.deslize = r2(slipN ? slip / slipN : 0); M.afunda = r1(sink * 100); M.apoio = r2(cont.reduce((x, y) => x + y, 0) / (N * frames)); M.passo = r2(a.stride / cern);
      M.balanco = r1((Math.max(...ys) - Math.min(...ys)) * 100); M.joelhoAndando = knees.length ? r1(knees.reduce((x, y) => x + y, 0) / knees.length) : null;
      if (M.deslize > 0.12) out.push({ f: 'movimento', pen: Math.min(18, M.deslize * 60), msg: `casco patina no apoio: ${M.deslize} m/s (pisada firme: < 0,1 m/s)` });
      M.flutua = r1(floatMax * 100); if (floatMax > 0.04) out.push({ f: 'movimento', pen: Math.min(12, floatMax * 150), msg: `no apoio o casco fica ${M.flutua} cm acima do chão` });
      if (sink > 0.03) out.push({ f: 'movimento', pen: Math.min(12, sink * 200), msg: `casco afunda ${M.afunda} cm no chão andando` });
      if (ref.apoio && (M.apoio < ref.apoio[0] - 0.05 || M.apoio > ref.apoio[1] + 0.05)) out.push({ f: 'movimento', pen: 6, msg: `fração de apoio ${M.apoio} (andar de verdade: ${ref.apoio[0]}–${ref.apoio[1]})` });
      if (ref.passo && (M.passo < ref.passo[0] || M.passo > ref.passo[1])) out.push({ f: 'movimento', pen: 6, msg: `passada ${r2(a.stride)} m = ${M.passo}× a altura (andar de verdade: ${ref.passo[0]}–${ref.passo[1]}×)` });
      if (M.joelhoAndando != null && ref.jF && M.joelhoAndando < ref.jF[0] - 8) out.push({ f: 'movimento', pen: 8, msg: `andando, a perna da frente apoia dobrada (carpo ${M.joelhoAndando}°)` });
      if (M.balanco > 9 * s) out.push({ f: 'movimento', pen: 5, msg: `corpo sobe e desce ${M.balanco} cm a cada passo (demais)` });
      // ordem das pisadas no andar: trás-esquerda, frente-esquerda, trás-direita, frente-direita (sequência lateral)
      const seq = down.filter(([t]) => t > 1).map(([, i]) => i).slice(0, 8); const want = [2, 0, 3, 1]; let okSeq = 0;
      for (let k = 0; k + 1 < seq.length; k++) { const a1 = want.indexOf(seq[k]), a2 = want.indexOf(seq[k + 1]); if ((a1 + 1) % 4 === a2) okSeq++; }
      M.ordem = seq.length > 3 ? r2(okSeq / (seq.length - 1)) : null; if (M.ordem != null && M.ordem < 0.6) out.push({ f: 'movimento', pen: 8, msg: `ordem das pisadas fora do andar de quadrúpede (${M.ordem} certas)` });
      // troca de andadura: em que Froude (v²/g·h, h = altura do quadril) o bicho começa a trotar
      let vt = null; for (let v2 = 0.3; v2 < 6; v2 += 0.05) { a.sp = v2; a.st = 'walk'; fauna.poseOnly(a, 0.0001); if (a.gait === 'trot' || a.gait === 'gallop') { vt = v2; break; } } vt = vt ?? 6; const Fr = vt * vt / (9.8 * Hh); M.froude = r2(Fr);
      if (ref.froude && (Fr < ref.froude[0] || Fr > ref.froude[1])) out.push({ f: 'movimento', pen: 6, msg: `troca do andar para o trote em Froude ${M.froude} (${r2(vt)} m/s); nos quadrúpedes acontece perto de ${ref.froude[0]}–${ref.froude[1]}` });
    } finally { window.__juizNear = null; Object.assign(a, sv); a.t = 0; a.ia = 3; un(); }
    return { out, M }; }

  // pele: leva cada vértice da perna para o espaço do tronco e mede quanto passa da silhueta (elipse dos anéis do corpo)
  function protrusao(a) { const R = a.rig, m = R.mesh, g = m.geometry, part = g.userData.part, names = g.userData.partNames, RG = R.bodyRings; if (!RG) return 0;
    const legs = names.map((n, i) => n.startsWith('perna') ? i : -1).filter(i => i >= 0); m.updateMatrixWorld(true); R.root.updateMatrixWorld(true); Mi.copy(R.root.matrixWorld).invert();
    const K = R.K, y0 = R.rest.rootY; let mx = 0;
    for (let i = 0; i < part.length; i += 2) { if (!legs.includes(part[i])) continue; m.getVertexPosition(i, V); V.applyMatrix4(m.matrixWorld).applyMatrix4(Mi); const x = V.x / K, y = (V.y + y0) / K, z = V.z / K;
      let j = 0; while (j < RG.length - 2 && RG[j + 1].z < z) j++; const A = RG[j], B = RG[j + 1], t = Math.max(0, Math.min(1, (z - A.z) / ((B.z - A.z) || 1))), L = k => A[k] + (B[k] - A[k]) * t;
      const dy = y - L('y'), r = dy > 0 ? L('rt') : L('rb'); if (Math.abs(dy) > r * 0.65) continue; const hw = L('rx') * Math.sqrt(1 - (dy / r) ** 2); mx = Math.max(mx, (Math.abs(x) - hw) * K * a.g.scale.x); }
    return mx; }
  // vinco: triângulos que encolhem ou esticam demais com a pose (pele dobrando nas juntas)
  function vinco(a) { const m = a.rig.mesh, g = m.geometry, p = g.attributes.position, ix = g.index.array, part = g.userData.part, names = g.userData.partNames, n = p.count;
    const S = new Float32Array(n * 3); for (let i = 0; i < n; i++) { m.getVertexPosition(i, V); S[i * 3] = V.x; S[i * 3 + 1] = V.y; S[i * 3 + 2] = V.z; }
    let bad = 0; const onde = {};
    for (let t = 0; t < ix.length; t += 3) { let lo = 9, hi = 0; for (let e = 0; e < 3; e++) { const i = ix[t + e], j = ix[t + (e + 1) % 3];
        const r0 = Math.hypot(p.getX(i) - p.getX(j), p.getY(i) - p.getY(j), p.getZ(i) - p.getZ(j)); if (r0 < 1e-5) continue;
        const r1v = Math.hypot(S[i * 3] - S[j * 3], S[i * 3 + 1] - S[j * 3 + 1], S[i * 3 + 2] - S[j * 3 + 2]) / r0; lo = Math.min(lo, r1v); hi = Math.max(hi, r1v); }
      if (lo < 0.45 || hi > 2.2) { bad++; const nm = names[part[ix[t]]]; onde[nm] = (onde[nm] || 0) + 1; } }
    return { n: bad, onde: Object.entries(onde).sort((x, y) => y[1] - x[1]).slice(0, 2).map(([k, v]) => `${k} ${v}`).join(', ') }; }

  // ---------- COMPORTAMENTO: o vale andando sozinho, rápido (sem consultar o chão perto), contando os estados
  function comportamento(minutos = 5, dt = 0.2) { const cnt = new Map(), moved = new Map(), pos = new Map(); window.__juizNear = false; const ctx = { people: people(), pxPerUnit: 600 };
    const steps = Math.round(minutos * 60 / dt); let stuck = new Map();
    try { for (let k = 0; k < steps; k++) { fauna.update(dt, ctx);
        for (const a of fauna.animals) { const n = a.g.userData.regua; if (!ANAT[n]) continue; const st = a.swim ? 'swim' : a.st === 'startle' ? 'flee' : a.st;
          const c = cnt.get(n) || {}; c[st] = (c[st] || 0) + 1; c.__n = (c.__n || 0) + 1; cnt.set(n, c);
          if (k % 100 === 0) { const p0 = pos.get(a); if (p0 && a.st === 'walk' && Math.hypot(a.x - p0[0], a.z - p0[1]) < 0.3) stuck.set(n, (stuck.get(n) || 0) + 1); pos.set(a, [a.x, a.z]); } } } }
    finally { window.__juizNear = null; }
    const res = {}; for (const [n, c] of cnt) { const f = {}; for (const k of ESTADOS) f[k] = r2((c[k] || 0) / c.__n); res[n] = { f, out: [] }; const ref = ANAT[n].tempo || {};
      for (const [k, [lo, hi]] of Object.entries(ref)) { const v = f[k] || 0; if (v < lo - 0.03 || v > hi + 0.03) res[n].out.push({ f: 'comportamento', pen: Math.min(10, 3 + 25 * Math.max(lo - v, v - hi)), msg: `${NOME[k]} ${Math.round(v * 100)}% do tempo (o bicho de verdade: ${Math.round(lo * 100)}–${Math.round(hi * 100)}%)` }); }
      if (stuck.get(n) > 2) res[n].out.push({ f: 'comportamento', pen: 6, msg: `fica travado: diz que anda e não sai do lugar (${stuck.get(n)} vezes)` }); }
    return res; }
  const NOME = { graze: 'pastando/ciscando', idle: 'parado', walk: 'andando', drink: 'bebendo', swim: 'nadando', flee: 'fugindo', lie: 'deitado' };

  // ---------- o julgamento todo
  function julgar({ minutos = 4 } = {}) { const esp = especies(), rel = {}; let tris = 0;
    for (const a of fauna.animals) if (a.rig) tris += a.rig.mesh.geometry.index.count / 3;
    for (const [n, a] of esp) { const F = forma(a), Mv = movimento(a); rel[n] = { medidas: { ...F.M, ...Mv.M }, tris: F.tris, achados: [...F.out, ...Mv.out] }; }
    const C = comportamento(minutos); for (const n in C) { if (!rel[n]) continue; rel[n].tempo = C[n].f; rel[n].achados.push(...C[n].out); }
    for (const n in rel) { const r = rel[n], cat = { forma: 100, pose: 100, movimento: 100, comportamento: 100 }; for (const x of r.achados) cat[x.f] = Math.max(0, cat[x.f] - x.pen);
      r.notas = Object.fromEntries(Object.entries(cat).map(([k, v]) => [k, Math.round(v)])); r.nota = Math.round((cat.forma + cat.pose + cat.movimento + cat.comportamento) / 4); }
    return { especies: rel, triangulos: tris, bichos: fauna.animals.filter(a => a.rig).length }; }

  return { julgar, forma, movimento, comportamento, protrusao, vinco, ANAT };
}
