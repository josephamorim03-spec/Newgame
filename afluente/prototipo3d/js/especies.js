// As espécies do vale montadas no esqueleto de bicho.js, em tamanho real (metros, antes da escala de cada um).
// Cada uma diz: o corpo em anéis, o pescoço (do peito à nuca), a cabeça (crânio, olhos, orelhas, chifre, focinho), as
// quatro pernas (altura do ombro/quadril, os três comprimentos e o perfil de grossura, com joelho, boleto e casco ou pata)
// e o rabo. A pose de pastar sai da conta (a boca encosta no chão), não de número chutado.
import * as THREE from 'three';
import { quad, ave, loft, tube, paintG, sph } from './bicho.js';
import { mat } from './props.js';

const col = c => (c && c.isColor) ? c.clone() : new THREE.Color(c);
const mix = (a, b, t) => col(a).lerp(col(b), Math.max(0, Math.min(1, t)));
const cone = (r, h, c, s = 8) => paintG(new THREE.ConeGeometry(r, h, s), c);
const cyl = (r0, r1, h, c, s = 10) => paintG(new THREE.CylinderGeometry(r1, r0, h, s), c);
// crânio: anéis ao longo de z (da nuca ao focinho), girado para apontar para a frente e para baixo
const skull = (rings, down, seg = 22, shape = null, ext = true) => { if (!ext) return loft(rings.map(([t, rx, rt, rb, c, e]) => ({ z: t, y: 0, rx, rt, rb, e: e || 2.3, c })), seg, shape).rotateX(down);
  const r0 = rings[0], back = [[r0[0] - 0.08, r0[1] * 0.9, r0[2] * 0.85, r0[3] * 0.92, r0[4], r0[5]], [r0[0] - 0.04, r0[1] * 0.98, r0[2] * 0.97, r0[3], r0[4], r0[5]]];
  return loft([...back, ...rings].map(([t, rx, rt, rb, c, e]) => ({ z: t, y: 0, rx, rt, rb, e: e || 2.3, c })), seg, shape).rotateX(down); };
// a pose de pastar: o pescoço desce até a boca encostar no chão, e a cabeça gira para o focinho ficar de pé
function grazeOf(neckPts, muzzle) { const p0 = neckPts[0], p1 = neckPts[neckPts.length - 1], Ln = Math.hypot(p1[1] - p0[1], p1[2] - p0[2]), a0 = Math.atan2(p1[1] - p0[1], p1[2] - p0[2]);
  const mL = Math.hypot(muzzle[1], muzzle[2]), angM = Math.atan2(-muzzle[1], muzzle[2]);
  let th = 1.7; for (let t = 0.2; t <= 1.7; t += 0.02) { if (p0[1] + Ln * Math.sin(a0 - t) - mL < 0.06) { th = t; break; } }
  return [th, Math.max(-1.2, Math.min(0.8, Math.PI / 2 - angM - th))]; }
// casco fendido (boi, ovelha): a quartela desce inclinada para a frente a partir do boleto; embaixo as duas unhas, cada
// uma com a parede da frente inclinada, a sola chata e o talão redondo, uma fresta entre elas; atrás, as duas unhas de cima
function casco(x, z, yF, L3, r, hair, hoofC, slant = 0.4) { const out = [], yH = yF - L3 * 0.52, zH = z + L3 * slant * 0.55, dark = col(hoofC).multiplyScalar(0.7);
  out.push(tube([[x, yF + 0.012, z], [x, (yF + yH) / 2, z + L3 * slant * 0.28], [x, yH + 0.008, zH]], [{ rx: r, rt: r * 1.04, rb: r * 1.12, c: hair }, { rx: r * 0.9, rt: r * 0.92, rb: r * 0.95, c: hair }, { rx: r * 0.95, rt: r, rb: r, c: col(hair).multiplyScalar(0.85) }], 10, false));
  for (const sd of [-1, 1]) { const cx = x + sd * r * 0.5;
    out.push(tube([[cx, yH + 0.014, zH - r * 0.12], [cx, yH - (yH - yF + L3) * 0.5, zH + r * 0.32], [cx, yF - L3, zH + r * 0.7]],
      [{ rx: r * 0.46, rt: r * 0.6, rb: r * 0.5, c: hoofC }, { rx: r * 0.52, rt: r * 0.85, rb: r * 0.6, c: hoofC }, { rx: r * 0.56, rt: r * 1.05, rb: r * 0.62, c: dark }], 10, true)); }
  for (const sd of [-1, 1]) out.push(sph(r * 0.17, r * 0.24, r * 0.2, x + sd * r * 0.42, yH + L3 * 0.16, z + L3 * slant * 0.3 - r * 0.95, dark, 6));
  return mergeG(out); }
// pata (onça, lobo, capivara, anta): metacarpo curto que desce para a frente, a palma e os dedos com almofada; garra opcional
function pata(x, z, yF, L3, r, hair, toeC, toes = 4, claw = null) { const out = [], pz = z + L3 * 0.42, py = yF - L3;
  out.push(tube([[x, yF + 0.012, z], [x, py + r * 0.9, pz - r * 0.2]], [{ rx: r, rt: r, rb: r * 1.05, c: hair }, { rx: r * 0.95, rt: r, rb: r, c: hair }], 10, false));
  out.push(sph(r * 1.12, r * 0.62, r * 1.25, x, py + r * 0.6, pz, hair, 12));
  for (let i = 0; i < toes; i++) { const a = (i - (toes - 1) / 2) * (toes > 3 ? 0.42 : 0.55), tx = x + Math.sin(a) * r * 0.9, tz = pz + Math.cos(a) * r * 1.05;
    out.push(sph(r * 0.36, r * 0.34, r * 0.46, tx, py + r * 0.34, tz, toeC, 8)); if (claw) out.push(cone(r * 0.12, r * 0.45, claw, 5).rotateX(Math.PI / 2 + 0.6).translate(tx, py + r * 0.22, tz + r * 0.42)); }
  return mergeG(out); }
const mergeG = gs => { const pos = [], colA = [], idx = []; let base = 0; for (const g of gs) { const p = g.attributes.position, c = g.attributes.color; for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); colA.push(c.getX(i), c.getY(i), c.getZ(i)); }
  if (g.index) for (const k of g.index.array) idx.push(base + k); else for (let i = 0; i < p.count; i++) idx.push(base + i); base += p.count; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colA, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; };

// olho de bicho: a bola escura e o pontinho de brilho (é o que dá vida ao rosto)
const olho = (H, x, y, z, r, sx, c = 0x140e0a) => { H.add(sph(r * 0.6, r, r, x, y, z, c, 10)); H.add(sph(r * 0.2, r * 0.26, r * 0.26, x + sx * r * 0.5, y + r * 0.35, z + r * 0.3, 0xfaf6ee, 6)); };
// pelagem com manchas (gir chitado, malhado): as manchas são desenhadas no pixel, por um ruído preso ao corpo (posição de
// descanso da malha, então andam com o bicho), com borda nítida e recortada; só onde a malha diz que é pelo (atributo pat)
// e mantendo a sombra da pelagem (a mancha multiplica a cor do vértice pela razão cor da mancha / cor de base)
function pelagem(spotHex, baseC, freq, thr, seed) {
  return mat({ vertexColors: true }, { rim: '2.4', vdecl: 'attribute float pat;varying float vPat;', vert: 'vPat=pat;',
    fdecl: 'varying float vPat;uniform vec3 uSpot,uBase;uniform vec3 uSp;',
    uni: { uSpot: { value: col(spotHex) }, uBase: { value: col(baseC) }, uSp: { value: new THREE.Vector3(freq, thr, seed) } },
    frag: `{vec3 q=vLp*uSp.x+uSp.z;float n=vnoise(q.zy)*0.5+vnoise(q.xz*1.17+7.1)*0.3+vnoise(q.xy*1.9+3.7)*0.2;n+=(vnoise(q.zy*6.0+q.x*3.0)-0.5)*0.07;
      float m=smoothstep(uSp.y-0.01,uSp.y+0.01,n)*smoothstep(0.5,0.9,vPat);diffuseColor.rgb*=mix(vec3(1.0),uSpot/max(uBase,vec3(0.02)),m);}
      diffuseColor.rgb*=0.955+0.09*vnoise(vec2(vLp.z*9.0+vLp.x*4.0,vLp.y*90.0))+0.03*(vnoise(vLp.zy*26.0)-0.5);diffuseColor.rgb*=mix(1.0,0.82,uWet);` }); }
export function especies({ M, MJ, rnd }) {
  // ---------- gado zebu do Cerrado
  function vaca(coat, size = 1) {
    const w = col(coat.w).multiplyScalar(0.94 + rnd() * 0.12), grey = w.clone().lerp(col(coat.g), coat.k), dark = col(0x2a2624), bull = size > 0.8 && rnd() < 0.35, calf = size < 0.75;
    const sd = rnd() * 50, spotC = coat.spot ? col(coat.spot) : null, thr = 1 - (coat.sp || 0) * 1.6;
    const spotAt = (z, a) => spotC && Math.sin(z * 7.3 + sd) * Math.sin(a * 2.1 + sd * 1.7) + 0.6 * Math.sin(z * 3.1 - a * 1.4 + sd * 0.7) > thr;
    const shade = z => a => { const top = Math.max(0, Math.sin(a)), k = Math.max(0, Math.min(1, (z - 0.2) / 0.6)) * (bull ? 0.8 : 0.45), sp = false, b = w;
      return b.clone().lerp(sp ? b : grey, k * (0.4 + 0.6 * top)).multiplyScalar(0.94 + 0.06 * top); };
    const R = (z, y, rx, rt, rb, e = 2.2) => ({ z, y, rx, rt, rb, e, c: shade(z) });
    const rings = [R(-0.93, 1.14, 0.05, 0.05, 0.06), R(-0.88, 1.15, 0.14, 0.1, 0.18), R(-0.79, 1.12, 0.21, 0.15, 0.27), R(-0.66, 1.07, 0.25, 0.22, 0.34), R(-0.5, 1.03, 0.268, 0.28, 0.385),
      R(-0.32, 1.0, 0.276, 0.32, 0.4), R(-0.12, 0.985, 0.278, 0.345, 0.41), R(0.08, 0.98, 0.274, 0.355, 0.41), R(0.26, 0.99, 0.262, 0.36, 0.395), R(0.42, 1.01, 0.235, 0.345, 0.405),
      R(0.55, 1.04, 0.195, 0.3, 0.385), R(0.66, 1.06, 0.145, 0.22, 0.32), R(0.73, 1.07, 0.08, 0.12, 0.2)];
    const hump = calf ? 0.04 : bull ? 0.21 : 0.13;
    const shape = (x, y, a, r) => { const z = r.z, s = Math.sin(a), hz = Math.exp(-(((z - 0.42) / 0.16) ** 2));
      if (s > 0) { const top = Math.pow(s, 3); y += hump * hz * top; x *= 1 - 0.18 * hz * top; }   // cupim (redondo, não em bico)
      const dz = Math.max(0, Math.min(1, (z - 0.42) / 0.2)); if (s < 0) { const bot = Math.pow(-s, 5); y -= 0.1 * dz * bot; x *= 1 - 0.6 * dz * bot; }   // barbela no peito
      if (s < 0.35) { const side = Math.pow(Math.abs(Math.cos(a)), 1.5); x *= 1 + side * (0.07 * Math.exp(-(((z - 0.4) / 0.13) ** 2)) + 0.09 * Math.exp(-(((z + 0.6) / 0.17) ** 2))); }   // paleta e coxa
      if (z > -0.4 && z < 0.3 && s < -0.3) y -= 0.025 * Math.sin((z + 0.4) / 0.7 * Math.PI);   // barriga
      return [x, y]; };
    const neckPts = [[0, 1.01, 0.42], [0, 1.1, 0.64], [0, 1.22, 0.81], [0, 1.31, 0.95]], nc = a => shade(0.75)(a);
    const neck = { pts: neckPts, prof: [{ rx: 0.232, rt: 0.34, rb: 0.4, e: 2.2, c: nc }, { rx: 0.175, rt: 0.18, rb: 0.29, c: nc }, { rx: 0.14, rt: 0.145, rb: 0.22, c: nc }, { rx: 0.11, rt: 0.11, rb: 0.13, c: nc }],
      shape: (x, v, a, r, i) => { if (v < 0) { const bot = Math.pow(Math.max(0, -Math.sin(a)), 4); x *= 1 - 0.62 * bot * (i < 3 ? 1 : 0.3); } return [x, v]; } };
    // cabeça de zebu: testa larga e chata entre os chifres, bochecha (masseter) cheia embaixo, chanfro que afina e o focinho
    // que alarga de novo, com a almofada escura do nariz, as narinas dos lados e o queixo; olhos grandes de lado
    const th = 1.0, S = (t, x, y) => [x, y * Math.cos(th) - t * Math.sin(th), y * Math.sin(th) + t * Math.cos(th)];
    const muzzle = S(0.55, 0, -0.01), pinkNose = coat.w === 0xf0ebe2 || (coat.k < 0.35 && rnd() < 0.3), nose = col(pinkNose ? 0x9a6a5e : 0x2a2422);
    const gir = !!coat.spot && coat.w !== 0xf0ebe2, earL = gir ? 0.19 : 0.135;
    const head = H => {
      const hc = (t, a) => { const up = Math.sin(a); if (t > 0.505) return nose; if (t > 0.44) return mix(w, nose, 0.35 + 0.3 * (t - 0.44) / 0.065); return t < 0.1 ? grey : mix(w, grey, 0.15 + 0.25 * Math.max(0, up) + (t > 0.3 ? 0.1 : 0)); };
      const rings = [[0, 0.085, 0.07, 0.09], [0.04, 0.11, 0.09, 0.12], [0.1, 0.122, 0.09, 0.135], [0.16, 0.12, 0.085, 0.135], [0.22, 0.104, 0.075, 0.12], [0.29, 0.086, 0.066, 0.096], [0.36, 0.078, 0.06, 0.085],
        [0.42, 0.082, 0.06, 0.083], [0.47, 0.09, 0.06, 0.08], [0.51, 0.088, 0.055, 0.072], [0.535, 0.07, 0.043, 0.055], [0.55, 0.04, 0.025, 0.03]];
      const cheek = (x, y, a, r) => { const t = r.z, b = Math.exp(-(((t - 0.19) / 0.07) ** 2)), sa = Math.sin(a); if (sa < 0.1) x *= 1 + 0.13 * b * Math.sqrt(Math.max(0, 0.1 - sa)); if (sa > 0.6) y *= 1 - 0.12 * (sa - 0.6); return [x, y]; };
      H.add(skull(rings.map(([t, rx, rt, rb]) => [t, rx, rt, rb, a => hc(t, a), 2.6]), th, 26, cheek, false));
      // queixo e beiço de baixo
      H.add(loft([[0.3, 0.05, 0.02, 0.028], [0.42, 0.058, 0.024, 0.034], [0.5, 0.055, 0.022, 0.03], [0.535, 0.035, 0.014, 0.02]].map(([t, rx, rt, rb]) => ({ z: t, y: -0.072, rx, rt, rb, e: 2.3, c: t > 0.49 ? nose : mix(w, grey, 0.2) })), 14).rotateX(th));
      for (const sx of [-1, 1]) {
        const e = S(0.15, sx * 0.112, 0.035), side = sx > 0 ? 'earL' : 'earR';
        if (coat.k >= 0.4 && !coat.spot) H.add(sph(0.012, 0.034, 0.03, e[0] - sx * 0.004, e[1], e[2], grey.clone().multiplyScalar(0.7), 10));   // contorno escuro do olho (nelore)
        H.add(sph(0.012, 0.024, 0.024, e[0] + sx * 0.003, e[1], e[2], 0x1c140e, 12));   // olho
        H.add(sph(0.004, 0.006, 0.006, e[0] + sx * 0.014, e[1] + 0.008, e[2] + 0.006, 0xfaf6ee, 6));   // brilho
        H.add(paintG(new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.42).scale(0.016, 0.03, 0.03).rotateZ(-sx * 0.2).translate(e[0] + sx * 0.002, e[1] + 0.004, e[2]), grey));   // pálpebra
        const n = S(0.548, sx * 0.03, 0.004); H.add(sph(0.007, 0.012, 0.009, n[0], n[1], n[2], 0x0a0807, 6));   // narina
        // chifre: grosso na base, curvando para fora e para cima, a ponta escura
        if (!calf) { const b0 = S(0.03, sx * 0.075, 0.07), L = bull ? 0.16 : 0.12, curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(...b0), new THREE.Vector3(b0[0] + sx * (0.05 + L * 0.3), b0[1] + 0.03 + L * 0.2, b0[2] - 0.02), new THREE.Vector3(b0[0] + sx * (0.05 + L * 0.45), b0[1] + 0.05 + L * 0.75, b0[2] + L * 0.15));
          const hg = new THREE.TubeGeometry(curve, 10, 1, 10, false), p = hg.attributes.position, cc = new Float32Array(p.count * 3);
          for (let i = 0; i < p.count; i++) { const u = Math.floor(i / 11) / 10, r = (bull ? 0.034 : 0.028) * (1 - u * 0.8); const c0 = curve.getPoint(u); p.setXYZ(i, c0.x + (p.getX(i) - c0.x) * r, c0.y + (p.getY(i) - c0.y) * r, c0.z + (p.getZ(i) - c0.z) * r); const k = mix(0xcab89c, 0x2a221c, Math.pow(u, 1.5)); cc.set([k.r, k.g, k.b], i * 3); }
          hg.setAttribute('color', new THREE.BufferAttribute(cc, 3)); hg.deleteAttribute('uv'); hg.computeVertexNormals(); H.add(hg); }
        // orelha em folha, caída para o lado (maior no gir), com o lado de dentro claro
        const ep = S(0.07, sx * 0.11, 0.025), droop = gir ? 0.95 : 0.45;
        const leaf = (sc, c, dz) => paintG(new THREE.SphereGeometry(1, 14, 8).scale(earL * 0.5 * sc, 0.014, 0.05 * sc).translate(sx * earL * 0.5, 0, dz).rotateZ(-sx * droop).rotateY(-sx * 0.3).translate(...ep), c);
        H.add(leaf(1, grey, 0), side); H.add(leaf(0.8, 0xd8a08e, 0.008).translate(0, -0.004, 0), side); }
      const tp = S(0.02, 0, 0.09); H.add(sph(0.05, 0.022, 0.04, tp[0], tp[1], tp[2], grey, 10));   // topete entre os chifres
    };
    const legC = z => { const top = shade(z)(-Math.PI / 2); return (t) => top.clone().lerp(grey, Math.max(0, Math.min(1, (t - 0.3) / 0.5)) * Math.min(0.6, coat.k * 1.1)).multiplyScalar(1 - 0.08 * Math.max(0, (t - 0.6) / 0.4)); };
    const fl = [0.42, 0.275, 0.14], hl = [0.48, 0.33, 0.14];
    const fprof = [[0, 0.12, 0.13, 0.12], [0.12, 0.115, 0.125, 0.105], [0.24, 0.095, 0.1, 0.08], [0.36, 0.07, 0.072, 0.06], [0.46, 0.056, 0.058, 0.05], [0.5, 0.058, 0.066, 0.052], [0.54, 0.05, 0.052, 0.046],
      [0.6, 0.04, 0.04, 0.041], [0.76, 0.036, 0.036, 0.038], [0.82, 0.044, 0.045, 0.05], [0.86, 0.042, 0.042, 0.046]];
    const hprof = [[0, 0.11, 0.1, 0.1], [0.12, 0.11, 0.1, 0.11], [0.26, 0.095, 0.08, 0.11], [0.4, 0.068, 0.055, 0.085], [0.48, 0.06, 0.05, 0.085], [0.52, 0.056, 0.048, 0.075], [0.57, 0.042, 0.04, 0.048],
      [0.82, 0.036, 0.036, 0.038], [0.86, 0.044, 0.045, 0.05], [0.89, 0.042, 0.042, 0.046]];
    const hoofC = col(pinkNose ? 0x5a4a3e : 0x2e2622);
    const leg = (x, z, top, L, prof) => ({ x, z, top: top + 0.06, L: [L[0] + 0.06, L[1], L[2]], prof: [[0, prof[0][1], prof[0][2], prof[0][3]], ...prof.map(p => [p[0] * 0.92 + 0.08, p[1], p[2], p[3]])], c: legC(z), foot: casco(x, z, top - L[0] - L[1], L[2], 0.04, legC(z)(0.95), hoofC) });
    const tailPts = [[0, 1.15, -0.9], [0, 1.06, -0.97], [0, 0.88, -1.0], [0, 0.68, -1.0], [0, 0.5, -0.99], [0, 0.4, -0.985], [0, 0.32, -0.98]], tc = i => i >= 5 ? dark : w;
    const extra = []; if (!bull && !calf) { extra.push([sph(0.11, 0.075, 0.13, 0, 0.6, -0.42, 0xdca08c, 12), 'root']); for (const [x, z] of [[0.04, -0.37], [-0.04, -0.37], [0.04, -0.47], [-0.04, -0.47]]) extra.push([cyl(0.012, 0.009, 0.05, 0xd08a78, 6).translate(x, 0.52, z), 'root']); }
    const K = 1.08 * size * (bull ? 1.05 : 1);
    // manchas no pixel (ver pelagem); onde a cor do vértice é a do pelo (entre a cor de base e o cinza do lombo)
    const Mv = spotC ? pelagem(coat.spot, w, coat.w === 0xf0ebe2 ? 2.4 : 3.3, 0.6 - (coat.sp || 0) * 0.2, sd) : M;
    const gw = [grey.r, grey.g, grey.b], ww = [w.r, w.g, w.b], d2 = ww.map((v, i) => v - gw[i]), dd = d2.reduce((a, v) => a + v * v, 0) || 1e-6;
    const pat = spotC ? (r0, g0, b0) => { const c = [r0, g0, b0], t = Math.max(0, Math.min(1, c.reduce((a, v, i) => a + (v - gw[i]) * d2[i], 0) / dd)), pp = gw.map((v, i) => v + d2[i] * t);
      const e = Math.hypot(c[0] - pp[0], c[1] - pp[1], c[2] - pp[2]) / (pp[0] * 0.3 + pp[1] * 0.5 + pp[2] * 0.2 + 0.04); return e < 0.3 ? 1 : 0; } : null;
    const eL = S(0.07, 0.11, 0.025), r = quad({ K, M: Mv, pat, seg: 36, body: { rings, shape }, neck, head, ears: [eL, [-eL[0], eL[1], eL[2]]], muzzle,
      legs: [leg(0.13, 0.44, 0.84, fl, fprof), leg(-0.13, 0.44, 0.84, fl, fprof), leg(0.14, -0.62, 0.92, hl, hprof), leg(-0.14, -0.62, 0.92, hl, hprof)],
      tail: { pts: tailPts, prof: tailPts.map((p, i) => ({ rx: i === 5 ? 0.048 : i === 6 ? 0.02 : 0.034 - i * 0.003, rt: i === 5 ? 0.048 : i === 6 ? 0.02 : 0.034 - i * 0.003, rb: i === 5 ? 0.048 : i === 6 ? 0.02 : 0.034 - i * 0.003, c: tc(i) })), n: 5, rest: [0.1, 0.02] },
      extra });
    r.graze = grazeOf(neckPts, muzzle); return r;
  }

  // ---------- capivara: barril marrom de pelo grosso, cabeça quadrada, narinas e olhos no alto (para nadar), quase sem pescoço
  function capivara() { const b = col(0x8d5a37), d = col(0x4a2c1a), bl = a => { const sa = Math.sin(a); return sa < -0.4 ? mix(b, 0xa8805a, (-sa - 0.4) * 0.8) : mix(b, 0x5e3a22, Math.max(0, sa) * 0.6); };
    const rings = [[-0.52, 0.52, 0.1, 0.1, 0.1], [-0.47, 0.53, 0.2, 0.21, 0.22], [-0.33, 0.53, 0.26, 0.27, 0.27], [-0.08, 0.51, 0.27, 0.27, 0.28], [0.16, 0.5, 0.255, 0.25, 0.27], [0.31, 0.52, 0.225, 0.22, 0.23], [0.42, 0.55, 0.2, 0.2, 0.2], [0.5, 0.58, 0.14, 0.14, 0.14]]
      .map(([z, y, rx, rt, rb]) => ({ z, y, rx, rt, rb, e: 2.4, c: bl }));
    const neckPts = [[0, 0.56, 0.32], [0, 0.6, 0.43], [0, 0.63, 0.5]], th = 0.45, S = (t, x, y) => [x, y * Math.cos(th) - t * Math.sin(th), y * Math.sin(th) + t * Math.cos(th)], muzzle = S(0.43, 0, -0.02);
    const head = H => { const hc = (t, a) => t > 0.37 ? d : t > 0.3 ? mix(bl(a), d, (t - 0.3) / 0.07) : bl(a);
      H.add(skull([[0, 0.12, 0.12, 0.14], [0.08, 0.13, 0.13, 0.15], [0.16, 0.125, 0.12, 0.15], [0.24, 0.115, 0.11, 0.14], [0.31, 0.105, 0.1, 0.125], [0.36, 0.1, 0.09, 0.11], [0.4, 0.085, 0.07, 0.09], [0.425, 0.05, 0.04, 0.05]]
        .map(([t, rx, rt, rb]) => [t, rx, rt, rb, a => hc(t, a), 3.0]), th, 22));
      for (const sx of [-1, 1]) { const e = S(0.15, sx * 0.108, 0.085), ep = S(0.04, sx * 0.08, 0.13), n = S(0.418, sx * 0.032, 0.045);
        olho(H, e[0], e[1], e[2], 0.017, sx); H.add(sph(0.04, 0.036, 0.018, ep[0], ep[1], ep[2], d, 10), sx > 0 ? 'earL' : 'earR'); H.add(sph(0.007, 0.012, 0.009, n[0], n[1], n[2], 0x0a0807, 6)); } };
    const lc = (t) => mix(b, d, t * 0.7), paw = (x, z, top, L) => pata(x, z, top - L[0] - L[1], L[2], 0.036, mix(b, d, 0.7), 0x2a1a10, 4, 0x1a120c);
    const lp = [[0, 0.08, 0.08, 0.08], [0.3, 0.066, 0.068, 0.064], [0.47, 0.05, 0.053, 0.05], [0.6, 0.044, 0.044, 0.045], [0.77, 0.04, 0.04, 0.043], [0.81, 0.04, 0.04, 0.042]];
    const r = quad({ K: 1, M, body: { rings }, neck: { pts: neckPts, prof: [{ rx: 0.21, rt: 0.21, rb: 0.22, c: bl }, { rx: 0.18, rt: 0.18, rb: 0.2, c: bl }, { rx: 0.145, rt: 0.145, rb: 0.165, c: bl }] }, head,
      ears: [S(0.04, 0.08, 0.13), S(0.04, -0.08, 0.13)], muzzle,
      legs: [[0.15, 0.3, 0.36, [0.17, 0.11, 0.08]], [-0.15, 0.3, 0.36, [0.17, 0.11, 0.08]], [0.16, -0.33, 0.39, [0.19, 0.12, 0.08]], [-0.16, -0.33, 0.39, [0.19, 0.12, 0.08]]].map(([x, z, top, L]) => ({ x, z, top, L, prof: lp, c: lc, foot: paw(x, z, top, L) })) });
    r.graze = grazeOf(neckPts, muzzle); return r; }

  // ---------- ovelha: lã em cachos, cara e pernas escuras
  function ovelha() { const wl = col(0xeee6d4), dk = col(0x3a3230), wc = a => mix(wl, 0xd8cfbc, Math.max(0, -Math.sin(a)) * 0.6);
    const rings = [[-0.5, 0.67, 0.1, 0.1, 0.1], [-0.45, 0.67, 0.2, 0.2, 0.22], [-0.3, 0.68, 0.27, 0.27, 0.29], [0, 0.68, 0.29, 0.29, 0.31], [0.25, 0.68, 0.27, 0.27, 0.29], [0.4, 0.7, 0.21, 0.22, 0.23], [0.48, 0.73, 0.12, 0.12, 0.12]].map(([z, y, rx, rt, rb]) => ({ z, y, rx, rt, rb, e: 2.1, c: wc }));
    const fleece = (x, y, a, r) => { const b = 1 + 0.07 * Math.sin(a * 7 + r.z * 9) * Math.sin(r.z * 23 + a * 3); return [x * b, y * b]; };
    const neckPts = [[0, 0.72, 0.36], [0, 0.8, 0.49], [0, 0.85, 0.56]], muzzle = [0, -0.18, 0.2];
    const head = H => { H.add(skull([[0, 0.075, 0.08, 0.085], [0.08, 0.08, 0.08, 0.085], [0.16, 0.066, 0.065, 0.07], [0.24, 0.05, 0.05, 0.055], [0.285, 0.035, 0.035, 0.035]].map(([t, rx, rt, rb]) => [t, rx, rt, rb, dk, 2.4]), 0.85, 18));
      H.add(sph(0.1, 0.075, 0.09, 0, 0.06, -0.01, wl, 12));
      for (const sx of [-1, 1]) { H.add(sph(0.065, 0.024, 0.03, sx * 0.1, 0.02, 0.0, dk, 8), sx > 0 ? 'earL' : 'earR'); olho(H, sx * 0.068, 0.0, 0.09, 0.014, sx); } };
    const lc = t => t < 0.31 ? wl : dk;
    const lpF = [[0, 0.1, 0.1, 0.1], [0.28, 0.085, 0.085, 0.085], [0.33, 0.034, 0.036, 0.034], [0.41, 0.03, 0.032, 0.03], [0.44, 0.034, 0.038, 0.032], [0.5, 0.026, 0.027, 0.026], [0.76, 0.024, 0.024, 0.025], [0.81, 0.03, 0.03, 0.033], [0.85, 0.028, 0.028, 0.03]];
    const lpH = [[0, 0.12, 0.12, 0.13], [0.3, 0.09, 0.09, 0.1], [0.36, 0.04, 0.036, 0.05], [0.44, 0.032, 0.03, 0.045], [0.47, 0.03, 0.028, 0.04], [0.52, 0.026, 0.026, 0.03], [0.78, 0.024, 0.024, 0.025], [0.83, 0.03, 0.03, 0.033], [0.87, 0.028, 0.028, 0.03]];
    const leg = (x, z, top, L, lp) => ({ x, z, top, L, prof: lp, c: lc, foot: casco(x, z, top - L[0] - L[1], L[2], 0.026, dk, 0x1e1a18) });
    const tp = [[0, 0.74, -0.48], [0, 0.66, -0.54], [0, 0.56, -0.56]];
    const r = quad({ K: 1, M, body: { rings, shape: fleece }, neck: { pts: neckPts, prof: [{ rx: 0.15, rt: 0.15, rb: 0.16, c: wc }, { rx: 0.13, rt: 0.13, rb: 0.14, c: wc }, { rx: 0.1, rt: 0.11, rb: 0.1, c: wc }] }, head, ears: [[0.1, 0.02, 0], [-0.1, 0.02, 0]], muzzle,
      legs: [leg(0.12, 0.28, 0.48, [0.205, 0.185, 0.09], lpF), leg(-0.12, 0.28, 0.48, [0.205, 0.185, 0.09], lpF), leg(0.12, -0.3, 0.5, [0.235, 0.19, 0.09], lpH), leg(-0.12, -0.3, 0.5, [0.235, 0.19, 0.09], lpH)],
      tail: { pts: tp, prof: [{ rx: 0.06, rt: 0.06, rb: 0.06, c: wl }, { rx: 0.055, rt: 0.055, rb: 0.055, c: wl }, { rx: 0.035, rt: 0.035, rb: 0.035, c: wl }], n: 2, rest: [0.2, 0.1] } });
    r.graze = grazeOf(neckPts, muzzle); return r; }

  // ---------- lobo-guará: pernas compridas de meia preta, pelo laranja, crina preta, orelhonas, rabo com ponta branca
  function lobo() { const o = col(0xc8622a), k = col(0x1e1a18), w = col(0xf2ece0);
    const oc = z => a => { const top = Math.sin(a); return top > 0.75 && z > 0.05 ? k : mix(o, 0xe0884a, Math.max(0, -top) * 0.6); };
    const rings = [[-0.42, 0.83, 0.06, 0.06, 0.06], [-0.38, 0.83, 0.12, 0.12, 0.13], [-0.25, 0.82, 0.14, 0.15, 0.16], [0, 0.82, 0.14, 0.16, 0.17], [0.2, 0.84, 0.145, 0.165, 0.175], [0.32, 0.87, 0.13, 0.15, 0.15], [0.4, 0.9, 0.09, 0.1, 0.1]].map(([z, y, rx, rt, rb]) => ({ z, y, rx, rt, rb, e: 2.1, c: oc(z) }));
    const neckPts = [[0, 0.9, 0.3], [0, 0.99, 0.41], [0, 1.04, 0.48]], muzzle = [0, -0.09, 0.3];
    const head = H => { const hc = (t, a) => t > 0.22 ? k : Math.sin(a) < -0.4 ? w : o;
      H.add(skull([[0, 0.075, 0.08, 0.075], [0.06, 0.082, 0.085, 0.08], [0.14, 0.06, 0.06, 0.06], [0.22, 0.036, 0.036, 0.04], [0.3, 0.022, 0.022, 0.025]].map(([t, rx, rt, rb]) => [t, rx, rt, rb, a => hc(t, a), 2.2]), 0.28, 18));
      for (const sx of [-1, 1]) { H.add(cone(0.05, 0.17, o, 8).translate(sx * 0.055, 0.17, -0.01), sx > 0 ? 'earL' : 'earR'); H.add(cone(0.032, 0.12, 0xf0e0d0, 6).translate(sx * 0.055, 0.15, 0.008), sx > 0 ? 'earL' : 'earR');
        olho(H, sx * 0.056, 0.03, 0.09, 0.014, sx, 0x2a1a08); } H.add(sph(0.022, 0.018, 0.018, 0, -0.08, 0.3, k, 6)); };
    const lc = t => t > 0.3 ? k : o, lp = [[0, 0.07, 0.07, 0.07], [0.15, 0.06, 0.062, 0.058], [0.3, 0.045, 0.046, 0.044], [0.42, 0.034, 0.034, 0.034], [0.45, 0.036, 0.038, 0.036], [0.5, 0.027, 0.027, 0.027], [0.78, 0.024, 0.024, 0.024], [0.81, 0.028, 0.029, 0.028], [0.84, 0.026, 0.026, 0.026]];
    const leg = (x, z, top, L) => ({ x, z, top, L, prof: lp, c: lc, foot: pata(x, z, top - L[0] - L[1], L[2], 0.026, k, 0x141210, 4, 0x2a2622) });
    const tp = [[0, 0.86, -0.42], [0, 0.8, -0.52], [0, 0.66, -0.6], [0, 0.52, -0.64], [0, 0.4, -0.66]];
    const r = quad({ K: 1, M, body: { rings }, neck: { pts: neckPts, prof: [{ rx: 0.1, rt: 0.12, rb: 0.11, c: oc(0.5) }, { rx: 0.085, rt: 0.1, rb: 0.09, c: oc(0.5) }, { rx: 0.075, rt: 0.08, rb: 0.075, c: oc(0.5) }] }, head, ears: [[0.055, 0.08, -0.01], [-0.055, 0.08, -0.01]], muzzle,
      legs: [leg(0.09, 0.3, 0.75, [0.32, 0.27, 0.15]), leg(-0.09, 0.3, 0.75, [0.32, 0.27, 0.15]), leg(0.09, -0.3, 0.78, [0.35, 0.29, 0.15]), leg(-0.09, -0.3, 0.78, [0.35, 0.29, 0.15])],
      tail: { pts: tp, prof: tp.map((p, i) => ({ rx: [0.04, 0.07, 0.085, 0.075, 0.04][i], rt: [0.04, 0.07, 0.085, 0.075, 0.04][i], rb: [0.04, 0.07, 0.085, 0.075, 0.04][i], c: i >= 3 ? w : o })), n: 4, rest: [-0.6, 0.12] } });
    r.graze = grazeOf(neckPts, muzzle); return r; }

  // ---------- onça-pintada: rosetas (a textura), cabeça larga, patas grossas, rabo comprido
  function onca() { const G = col(0xffffff), cr = col(0xf4ead8);
    const rings = [[-0.5, 0.53, 0.08, 0.08, 0.08], [-0.45, 0.53, 0.16, 0.16, 0.17], [-0.3, 0.52, 0.2, 0.2, 0.21], [0, 0.5, 0.21, 0.2, 0.22], [0.25, 0.52, 0.2, 0.2, 0.21], [0.4, 0.55, 0.17, 0.17, 0.17], [0.48, 0.58, 0.11, 0.11, 0.11]].map(([z, y, rx, rt, rb]) => ({ z, y, rx, rt, rb, e: 2.1, c: a => Math.sin(a) < -0.6 ? cr : G }));
    const neckPts = [[0, 0.58, 0.4], [0, 0.62, 0.51], [0, 0.63, 0.56]], muzzle = [0, -0.07, 0.24];
    const head = H => { H.add(skull([[0, 0.12, 0.12, 0.12], [0.07, 0.14, 0.13, 0.13], [0.15, 0.12, 0.11, 0.11], [0.22, 0.08, 0.07, 0.08], [0.27, 0.05, 0.05, 0.055]].map(([t, rx, rt, rb]) => [t, rx, rt, rb, t > 0.2 ? cr : G, 2.2]), 0.2, 20));
      for (const sx of [-1, 1]) { H.add(sph(0.04, 0.045, 0.018, sx * 0.09, 0.12, 0.0, 0xb8782a, 8), sx > 0 ? 'earL' : 'earR'); H.add(sph(0.01, 0.016, 0.016, sx * 0.058, 0.04, 0.13, 0xd8b030, 8)); olho(H, sx * 0.064, 0.04, 0.132, 0.008, sx, 0x0a0806); }
      H.add(sph(0.024, 0.018, 0.016, 0, -0.03, 0.26, 0x3a2a24, 6)); };
    const lp = [[0, 0.1, 0.1, 0.1], [0.2, 0.088, 0.09, 0.085], [0.35, 0.07, 0.07, 0.068], [0.46, 0.06, 0.062, 0.06], [0.55, 0.055, 0.055, 0.055], [0.78, 0.05, 0.05, 0.05], [0.83, 0.05, 0.05, 0.05]];
    const leg = (x, z, top, L) => ({ x, z, top, L, prof: lp, c: G, foot: pata(x, z, top - L[0] - L[1], L[2], 0.046, cr, cr, 4) });
    const tp = [[0, 0.6, -0.5], [0, 0.52, -0.72], [0, 0.42, -0.92], [0, 0.34, -1.06], [0, 0.31, -1.14]];
    const r = quad({ K: 1, M: MJ, body: { rings }, neck: { pts: neckPts, prof: [{ rx: 0.14, rt: 0.14, rb: 0.15, c: G }, { rx: 0.13, rt: 0.13, rb: 0.14, c: G }, { rx: 0.11, rt: 0.11, rb: 0.12, c: G }] }, head, ears: [[0.09, 0.12, 0], [-0.09, 0.12, 0]], muzzle,
      legs: [leg(0.12, 0.32, 0.42, [0.19, 0.15, 0.08]), leg(-0.12, 0.32, 0.42, [0.19, 0.15, 0.08]), leg(0.12, -0.34, 0.46, [0.22, 0.17, 0.08]), leg(-0.12, -0.34, 0.46, [0.22, 0.17, 0.08])],
      tail: { pts: tp, prof: tp.map((p, i) => ({ rx: 0.045 - i * 0.004, rt: 0.045 - i * 0.004, rb: 0.045 - i * 0.004, c: G })), n: 5, rest: [-0.25, 0.1] } });
    r.graze = grazeOf(neckPts, muzzle); return r; }

  // ---------- anta: corpo pesado, tromba curta que mexe, crina baixa, orelhas de borda clara
  function anta() { const c = col(0x4a3e38), d = col(0x3a302c), pc = col(0x5a4c44);
    const rings = [[-0.62, 0.75, 0.12, 0.12, 0.12], [-0.56, 0.76, 0.27, 0.28, 0.3], [-0.36, 0.74, 0.33, 0.34, 0.36], [0, 0.72, 0.34, 0.36, 0.37], [0.3, 0.72, 0.32, 0.33, 0.35], [0.48, 0.76, 0.25, 0.26, 0.27], [0.58, 0.8, 0.16, 0.17, 0.17]].map(([z, y, rx, rt, rb]) => ({ z, y, rx, rt, rb, e: 2.2, c: a => mix(c, d, Math.max(0, Math.sin(a)) * 0.5) }));
    const neckPts = [[0, 0.8, 0.48], [0, 0.86, 0.64], [0, 0.86, 0.73]], muzzle = [0, -0.25, 0.32];
    const head = H => { H.add(skull([[0, 0.13, 0.15, 0.16], [0.1, 0.14, 0.16, 0.17], [0.22, 0.11, 0.12, 0.13], [0.32, 0.08, 0.08, 0.08], [0.38, 0.055, 0.055, 0.055]].map(([t, rx, rt, rb]) => [t, rx, rt, rb, pc, 2.3]), 0.55, 20));
      H.add(tube([[0, -0.2, 0.3], [0, -0.26, 0.37], [0, -0.34, 0.39]], [{ rx: 0.05, rt: 0.05, rb: 0.05, c: d }, { rx: 0.04, rt: 0.04, rb: 0.04, c: d }, { rx: 0.03, rt: 0.03, rb: 0.03, c: col(0x2a2420) }], 10, true), 'snout');
      for (const sx of [-1, 1]) { H.add(sph(0.055, 0.075, 0.022, sx * 0.1, 0.14, 0.0, c, 8), sx > 0 ? 'earL' : 'earR'); H.add(paintG(new THREE.TorusGeometry(0.06, 0.008, 4, 14).scale(0.9, 1.25, 1).rotateY(sx * 0.3).translate(sx * 0.1, 0.14, 0.012), 0xc8bcae), sx > 0 ? 'earL' : 'earR');
        olho(H, sx * 0.1, 0.0, 0.17, 0.015, sx); } };
    const lp = [[0, 0.12, 0.12, 0.12], [0.2, 0.1, 0.102, 0.098], [0.4, 0.085, 0.085, 0.085], [0.46, 0.075, 0.078, 0.075], [0.6, 0.065, 0.065, 0.065], [0.77, 0.06, 0.06, 0.06], [0.81, 0.062, 0.062, 0.062]];
    const foot = (x, z, y) => mergeG([sph(0.07, 0.04, 0.08, x, y + 0.035, z + 0.02, 0x2a2420, 8), ...[-1, 0, 1].map(k => sph(0.025, 0.03, 0.03, x + k * 0.04, y + 0.03, z + 0.08, 0x1e1a18, 6))]);
    const leg = (x, z, top, L, n) => ({ x, z, top, L, prof: lp, c: d, foot: pata(x, z, top - L[0] - L[1], L[2], 0.056, d, 0x1e1a18, n) });
    const r = quad({ K: 1, M, body: { rings }, neck: { pts: neckPts, prof: [{ rx: 0.2, rt: 0.24, rb: 0.2, c: d }, { rx: 0.16, rt: 0.2, rb: 0.17, c: d }, { rx: 0.14, rt: 0.16, rb: 0.15, c: d }] }, head, ears: [[0.1, 0.12, 0], [-0.1, 0.12, 0]], snout: [0, -0.2, 0.3], muzzle,
      legs: [leg(0.17, 0.42, 0.48, [0.21, 0.16, 0.1], 4), leg(-0.17, 0.42, 0.48, [0.21, 0.16, 0.1], 4), leg(0.18, -0.45, 0.51, [0.24, 0.17, 0.1], 3), leg(-0.18, -0.45, 0.51, [0.24, 0.17, 0.1], 3)] });
    r.graze = grazeOf(neckPts, muzzle); return r; }

  // ---------- tamanduá-bandeira: faixa preta e branca no ombro, focinho comprido de tubo, garras da frente dobradas, rabo de bandeira
  function tamandua() { const c = col(0x6e655c), k = col(0x1e1a18), w = col(0xe8e2d4);
    const stripe = z => a => { const s = Math.sin(a), line = 0.3 - 0.36 * (1 - s); const d = Math.abs(z - line); return d < 0.05 ? k : d < 0.08 && s > -0.6 ? w : c; };
    const rings = [[-0.55, 0.56, 0.08, 0.08, 0.08], [-0.5, 0.56, 0.15, 0.2, 0.17], [-0.3, 0.55, 0.19, 0.26, 0.21], [0, 0.53, 0.2, 0.27, 0.22], [0.25, 0.53, 0.19, 0.25, 0.21], [0.4, 0.55, 0.15, 0.2, 0.16], [0.5, 0.58, 0.1, 0.12, 0.1]].map(([z, y, rx, rt, rb]) => ({ z, y, rx, rt, rb, e: 2.2, c: stripe(z) }));
    const neckPts = [[0, 0.58, 0.44], [0, 0.6, 0.57], [0, 0.6, 0.64]], muzzle = [0, -0.18, 0.4];
    const head = H => { H.add(tube([[0, 0, -0.02], [0, -0.02, 0.06], [0, -0.07, 0.18], [0, -0.13, 0.3], [0, -0.18, 0.41]], [0.075, 0.07, 0.05, 0.035, 0.024].map(r => ({ rx: r, rt: r, rb: r, c })), 12, true));
      for (const sx of [-1, 1]) { H.add(sph(0.03, 0.035, 0.015, sx * 0.055, 0.06, -0.01, c, 6), sx > 0 ? 'earL' : 'earR'); olho(H, sx * 0.05, 0.02, 0.07, 0.01, sx); } };
    const lpF = [[0, 0.1, 0.1, 0.1], [0.2, 0.085, 0.088, 0.082], [0.4, 0.07, 0.07, 0.07], [0.5, 0.065, 0.065, 0.065], [0.7, 0.06, 0.06, 0.06], [0.84, 0.058, 0.058, 0.058]];
    const fcol = t => t > 0.62 && t < 0.72 ? k : w, hcol = () => c;
    const fFoot = (x, z) => mergeG([tube([[x, 0.1, z], [x, 0.05, z + 0.01]], [{ rx: 0.058, rt: 0.058, rb: 0.058, c: w }, { rx: 0.06, rt: 0.062, rb: 0.06, c: w }], 10, false), sph(0.065, 0.045, 0.07, x, 0.045, z + 0.01, w, 10), ...[-1, 1].map(sd => cone(0.016, 0.09, 0x2a2420, 6).rotateX(-2.3).translate(x + sd * 0.022, 0.03, z + 0.06))]);
    const hFoot = (x, z) => pata(x, z, 0.09, 0.09, 0.05, k, 0x141210, 5, 0x2a2420);
    const tp = [[0, 0.6, -0.55], [0, 0.62, -0.75], [0, 0.6, -0.95], [0, 0.55, -1.1], [0, 0.48, -1.2]];
    const r = quad({ K: 1, M, body: { rings }, neck: { pts: neckPts, prof: [{ rx: 0.13, rt: 0.17, rb: 0.14, c }, { rx: 0.1, rt: 0.12, rb: 0.1, c }, { rx: 0.08, rt: 0.085, rb: 0.08, c }] }, head, ears: [[0.055, 0.06, -0.01], [-0.055, 0.06, -0.01]], muzzle,
      legs: [{ x: 0.13, z: 0.35, top: 0.45, L: [0.19, 0.165, 0.09], prof: lpF, c: fcol, foot: fFoot(0.13, 0.35) }, { x: -0.13, z: 0.35, top: 0.45, L: [0.19, 0.165, 0.09], prof: lpF, c: fcol, foot: fFoot(-0.13, 0.35) },
        { x: 0.13, z: -0.38, top: 0.46, L: [0.2, 0.17, 0.09], prof: lpF, c: hcol, foot: hFoot(0.13, -0.38) }, { x: -0.13, z: -0.38, top: 0.46, L: [0.2, 0.17, 0.09], prof: lpF, c: hcol, foot: hFoot(-0.13, -0.38) }],
      tail: { pts: tp, prof: tp.map((p, i) => ({ rx: 0.06, rt: [0.12, 0.2, 0.24, 0.2, 0.1][i], rb: [0.12, 0.25, 0.28, 0.22, 0.1][i], c: col(0x5a524a) })), n: 4, rest: [0.15, -0.05] } });
    r.graze = grazeOf(neckPts, muzzle); return r; }

  // ---------- aves
  const eye = (H, x, y, z, r = 0.012) => { H.add(sph(r, r, r * 0.8, x, y, z, 0x111111, 6)); H.add(sph(r, r, r * 0.8, -x, y, z, 0x111111, 6)); };
  const beak = (len, r, c, down = 0.15) => cone(r, len, c, 8).rotateX(Math.PI / 2 + down).translate(0, -Math.sin(down) * len * 0.5, len * 0.5);
  function garca() { const wh = 0xf6f6f2;
    return ave({ K: 1, M, body: { rx: 0.1, ry: 0.12, rz: 0.25, y: 0.74, c: wh, tilt: 0.04 }, neck: { pts: [[0, 0.8, 0.2], [0, 0.9, 0.27], [0, 1.0, 0.22], [0, 1.08, 0.27]], r: [0.045, 0.034, 0.03, 0.03], c: wh },
      head: H => { H.add(sph(0.035, 0.035, 0.05, 0, 0, 0.02, wh, 10)); H.add(beak(0.14, 0.014, 0xf2c21a, 0.05).translate(0, -0.005, 0.05)); eye(H, 0.025, 0.01, 0.04, 0.008); },
      beakTip: [0, -0.01, 0.2], wing: { c: wh, tip: 0xeeeee8 }, tail: { w: 0.08, len: 0.14, c: wh, up: 0.15 }, legs: { x: 0.05, top: 0.64, L: [0.3, 0.32, 0.08], r: 0.009, c: 0x1e1e1e, th: 0.03, thC: wh } }); }
  function moura() { const gr = 0x8e96a0;
    return ave({ K: 1, M, body: { rx: 0.14, ry: 0.15, rz: 0.32, y: 0.84, c: gr, back: 0x7e8690, belly: 0xd8dce0, tilt: 0.04 }, neck: { pts: [[0, 0.92, 0.25], [0, 1.04, 0.33], [0, 1.18, 0.28], [0, 1.28, 0.34]], r: [0.055, 0.04, 0.036, 0.034], c: 0xe8e8e4 },
      head: H => { H.add(sph(0.04, 0.04, 0.055, 0, 0, 0.02, 0xe8e8e4, 10)); H.add(beak(0.16, 0.016, 0xe0b030, 0.05).translate(0, -0.005, 0.055)); H.add(paintG(new THREE.ConeGeometry(0.015, 0.14, 5).rotateX(-2.0).translate(0, 0.03, -0.07), 0x1a1a1e)); eye(H, 0.03, 0.012, 0.04, 0.009); },
      beakTip: [0, -0.01, 0.23], wing: { c: 0x7e8690, tip: 0x3a3e46 }, tail: { w: 0.1, len: 0.18, c: 0x6e7680, up: 0.2 }, legs: { x: 0.06, top: 0.72, L: [0.34, 0.36, 0.1], r: 0.011, c: 0x2a2a2a, th: 0.035, thC: gr } }); }
  function seriema() { const b = 0xa58e6e;
    return ave({ K: 1, M, body: { rx: 0.13, ry: 0.15, rz: 0.26, y: 0.66, c: b, back: 0x96805e, belly: 0xc8b89a }, neck: { pts: [[0, 0.74, 0.2], [0, 0.84, 0.25], [0, 0.93, 0.3]], r: [0.055, 0.045, 0.04], c: 0xb8a684 },
      head: H => { H.add(sph(0.045, 0.045, 0.055, 0, 0, 0.01, 0xb8a684, 10)); H.add(beak(0.06, 0.018, 0xc8402a, 0.25).translate(0, -0.005, 0.045)); for (let i = 0; i < 5; i++) H.add(paintG(new THREE.ConeGeometry(0.006, 0.09, 4).rotateX(-0.5 - i * 0.1).translate(0, 0.07, 0.03 - i * 0.008), 0x6a5a46));
        H.add(sph(0.016, 0.016, 0.01, 0.033, 0.012, 0.035, 0x2a2a10, 6)); H.add(sph(0.016, 0.016, 0.01, -0.033, 0.012, 0.035, 0x2a2a10, 6)); H.add(sph(0.022, 0.022, 0.006, 0.034, 0.012, 0.03, 0x5a8ab8, 6)); },
      beakTip: [0, -0.02, 0.1], wing: { c: 0x96805e, tip: 0x5a4a38 }, tail: { w: 0.1, len: 0.32, c: 0x7a6a52, up: 0.05 }, legs: { x: 0.055, top: 0.56, L: [0.26, 0.29, 0.07], r: 0.012, c: 0xd0603a, th: 0.035, thC: b } }); }
  function ema() { const g = 0x8c8174;
    return ave({ K: 1, M, body: { rx: 0.24, ry: 0.27, rz: 0.4, y: 1.02, c: g, back: 0x7c7166, belly: 0xb0a698 }, neck: { pts: [[0, 1.12, 0.3], [0, 1.3, 0.38], [0, 1.48, 0.43], [0, 1.62, 0.5]], r: [0.07, 0.055, 0.048, 0.045], c: 0xa59a8c },
      head: H => { H.add(sph(0.055, 0.05, 0.07, 0, 0, 0.02, 0xa59a8c, 10)); H.add(beak(0.08, 0.025, 0x6a625a, 0.1).translate(0, -0.01, 0.07)); eye(H, 0.04, 0.012, 0.05, 0.012); },
      beakTip: [0, -0.02, 0.16], wing: { c: 0x7c7166, tip: 0x9a8f82, long: -0.1 }, legs: { x: 0.1, top: 0.84, L: [0.4, 0.42, 0.12], r: 0.022, c: 0x8a8478, th: 0.06, thC: g } }); }
  function galinha(c) { const cc = col(c);
    return ave({ K: 1, M, body: { rx: 0.11, ry: 0.11, rz: 0.15, y: 0.3, c: cc, back: cc.clone().multiplyScalar(0.9) }, neck: { pts: [[0, 0.36, 0.1], [0, 0.42, 0.13], [0, 0.47, 0.15]], r: [0.05, 0.042, 0.04], c: cc },
      head: H => { H.add(sph(0.04, 0.04, 0.045, 0, 0, 0.01, cc, 10)); H.add(beak(0.03, 0.014, 0xe8b02a, 0.3).translate(0, -0.005, 0.035));
        for (let i = 0; i < 4; i++) H.add(sph(0.012, 0.018, 0.012, 0, 0.045 + Math.sin(i * 0.9) * 0.008, 0.03 - i * 0.017, 0xd8282a, 6)); H.add(sph(0.01, 0.018, 0.008, 0, -0.04, 0.035, 0xd8282a, 6)); eye(H, 0.03, 0.01, 0.02, 0.007); },
      beakTip: [0, -0.02, 0.07], wing: { c: cc.clone().multiplyScalar(0.85), tip: cc.clone().multiplyScalar(0.7) }, tail: { w: 0.07, len: 0.15, c: cc.clone().multiplyScalar(0.7), up: 0.75 }, legs: { x: 0.04, top: 0.22, L: [0.09, 0.1, 0.05], r: 0.008, c: 0xe8b02a, th: 0.03, thC: cc } }); }
  function joao() { const b = 0xb07a4a;
    return ave({ K: 1, M, body: { rx: 0.045, ry: 0.045, rz: 0.075, y: 0.115, c: b, belly: 0xd8b88a }, neck: { pts: [[0, 0.135, 0.05], [0, 0.155, 0.065]], r: [0.03, 0.026], c: 0xa06a40 },
      head: H => { H.add(sph(0.026, 0.026, 0.03, 0, 0, 0.005, 0xa06a40, 8)); H.add(beak(0.022, 0.006, 0x5a4a3a, 0.1).translate(0, 0, 0.025)); eye(H, 0.016, 0.005, 0.015, 0.005); },
      beakTip: [0, -0.003, 0.05], wing: { c: 0x9a6a40, tip: 0x6a4a2a }, tail: { w: 0.025, len: 0.07, c: 0x9a6a40, up: 0.25 }, legs: { x: 0.016, top: 0.085, L: [0.035, 0.04, 0.02], r: 0.003, c: 0x8a6a5a, th: 0.012, thC: b } }); }

  return { vaca, capivara, ovelha, lobo, onca, anta, tamandua, garca, moura, seriema, ema, galinha, joao };
}
