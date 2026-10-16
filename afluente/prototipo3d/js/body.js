// Corpo humano em uma malha só, com esqueleto (pele que dobra nas juntas, sem as emendas de boneco), nas proporções de
// verdade de um adulto de 1,70 m (a escala dá a altura de cada um): cabeça ~1/7,5 da altura, ombros, peito, cintura e
// quadril com perfis diferentes para homem e mulher, coxa e panturrilha com volume, mãos com polegar, pés calçados.
// A roupa é pintada na própria pele (camisa, manga, calça, bermuda) e a saia e o avental são pano de verdade
// (cordas de pontos que caem com a gravidade, batem nas pernas, cobrem as coxas quando a pessoa senta e o vento balança).
import * as THREE from 'three';
import { U, HEAD, LIGHT_END, shared, toon } from './mat.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const C = c => (c && c.isColor) ? c : new THREE.Color(c);

// material da pele e da roupa: cor por vértice; onde 'pat' = 1 entra a estampa (chita ou xadrez) da roupa de cima
const patMats = new Map();
export function bodyMaterial(patTex) {
  const key = patTex ? patTex.uuid : 'liso'; if (patMats.has(key)) return patMats.get(key);
  const m = toon({ vertexColors: true, map: patTex || null });
  m.onBeforeCompile = sh => { shared(sh);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float pat;varying float vPat;varying vec3 vWp;')
      .replace('#include <skinning_vertex>', '#include <skinning_vertex>\nvPat=pat;vWp=(modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vPat;varying vec3 vWp;\n' + HEAD)
      .replace('#include <map_fragment>', `#ifdef USE_MAP
        vec4 tx=texture2D(map,vMapUv);diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*tx.rgb,clamp(vPat,0.0,1.0)*(1.0-step(1.5,vPat)));
        #endif
        float isHair=step(1.5,vPat),cloth=clamp(vPat,0.0,1.0)*(1.0-isHair);
        diffuseColor.rgb*=0.94+0.12*vnoise(vWp.xz*30.0+vWp.y*40.0)*(1.0-cloth)*(1.0-isHair);
        // fios: listras finas ao longo do cabelo, mais escuras entre as mechas
        float strand=vnoise(vec2((vWp.x+vWp.z)*160.0,vWp.y*14.0))*0.6+vnoise(vec2((vWp.x-vWp.z)*70.0,vWp.y*6.0))*0.4;
        diffuseColor.rgb*=mix(1.0,0.62+0.62*strand,isHair);
        diffuseColor.rgb*=mix(1.0,0.82,uWet*(0.3+0.7*cloth));`)
      .replace('#include <lights_fragment_end>', LIGHT_END('2.4')); };
  m.customProgramCacheKey = () => 'corpo' + (patTex ? 1 : 0);
  patMats.set(key, m); return m;
}

// ---------- montagem: tubos de anéis elípticos (tronco, braços, pernas) + peças rígidas (cabeça, mãos, pés)
function Builder() {
  const pos = [], nor = [], col = [], uv = [], sk = [], sw = [], pat = [], idx = [];
  const vert = (p, n, c, u, v, bones, pt) => { pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); col.push(c.r, c.g, c.b); uv.push(u, v);
    const b = bones.slice(0, 4); while (b.length < 4) b.push([0, 0]); const s = b.reduce((a, x) => a + x[1], 0) || 1;
    sk.push(...b.map(x => x[0])); sw.push(...b.map(x => x[1] / s)); pat.push(pt); return pos.length / 3 - 1; };
  // anel: centro (cx, y, cz), raios rx, rzF (frente), rzB (costas), expoente (2 = elipse, mais = mais quadrado)
  function tube(rings, seg = 16, capTop = false, capBot = false) {
    const base = pos.length / 3, per = seg + 1;
    rings.forEach((r, i) => { const e = r.e || 2;
      for (let k = 0; k <= seg; k++) { const a = k / seg * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        const sx = Math.sign(ca) * Math.pow(Math.abs(ca), 2 / e), sz = Math.sign(sa) * Math.pow(Math.abs(sa), 2 / e);
        const rz = sa > 0 ? r.rzF : r.rzB, p = V(r.cx + r.rx * sx, r.y, r.cz + rz * sz), n = V(sx / r.rx, 0, sz / rz).normalize();
        vert(p, n, C(r.c), k / seg * (r.perim || 1), r.y / 0.22, r.b, r.pat || 0); } });
    for (let i = 0; i + 1 < rings.length; i++) for (let k = 0; k < seg; k++) { const a = base + i * per + k, b = a + per; idx.push(a, a + 1, b, a + 1, b + 1, b); }
    const cap = (ri, down) => { const r = rings[ri], c = vert(V(r.cx, r.y, r.cz), V(0, down ? -1 : 1, 0), C(r.c), 0.5, 0.5, r.b, r.pat || 0);
      for (let k = 0; k < seg; k++) { const a = base + ri * per + k; if (down) idx.push(c, a, a + 1); else idx.push(c, a + 1, a); } };
    if (capTop) cap(rings.length - 1, false); if (capBot) cap(0, true);
  }
  // peça rígida (geometria pronta) presa a um osso
  function rigid(geo, c, bone, pt = 0) { const g = geo.index ? geo.toNonIndexed() : geo; g.computeVertexNormals(); const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
    const base = pos.length / 3; for (let i = 0; i < p.count; i++) vert(V(p.getX(i), p.getY(i), p.getZ(i)), V(n.getX(i), n.getY(i), n.getZ(i)), C(c), u ? u.getX(i) : 0, u ? u.getY(i) : 0, [[bone, 1]], pt);
    for (let i = 0; i < p.count; i++) idx.push(base + i); }
  function build() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('pat', new THREE.Float32BufferAttribute(pat, 1));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sk, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4)); g.setIndex(idx); return g; }
  return { tube, rigid, build };
}

// ossos (índices)
const B = { hips: 0, spine: 1, head: 2, shL: 3, elL: 4, haL: 5, shR: 6, elR: 7, haR: 8, hpL: 9, knL: 10, ftL: 11, hpR: 12, knR: 13, ftR: 14 };

// s: { sex 'm'|'f'|'c', build, skin, hairColor, hair, beard, top:{color, tex}, bottom:{color}, sleeves, pants: 'longa'|'bermuda'|null, shoes, hat... }
export function buildBody(s) {
  const f = s.sex === 'f', kid = s.sex === 'c', bw = s.build || 1, skin = C(s.skin), top = C(s.top.color || 0xffffff), bot = C(s.bottom.color || 0xffffff), shoe = C(s.shoes || 0x3a2a20);
  const topPat = s.top.tex ? 1 : 0, dressTop = !!s.dress;
  const bd = Builder();
  // ---------- tronco (do gancho ao pescoço)
  const W = (y, a, b) => y < a ? [[B.hips, 1]] : y > b ? [[B.spine, 1]] : [[B.hips, (b - y) / (b - a)], [B.spine, (y - a) / (b - a)]];
  const shirtBottom = s.skirt ? 1.0 : 0.93;   // camisa por dentro da calça; vestido/blusa até a cintura (a saia é pano)
  const tor = f ? [
    [0.80, 0.11, 0.07, 0.08], [0.86, 0.175, 0.105, 0.13], [0.92, 0.185, 0.11, 0.135], [0.99, 0.165, 0.1, 0.11], [1.05, 0.13, 0.088, 0.088],
    [1.12, 0.135, 0.095, 0.09], [1.2, 0.15, 0.13, 0.095], [1.26, 0.155, 0.145, 0.1], [1.32, 0.155, 0.11, 0.1], [1.365, 0.163, 0.09, 0.09], [1.395, 0.15, 0.08, 0.08], [1.42, 0.118, 0.07, 0.07], [1.44, 0.08, 0.055, 0.055], [1.455, 0.056, 0.048, 0.05]
  ] : [
    [0.80, 0.1, 0.07, 0.08], [0.86, 0.165, 0.1, 0.12], [0.93, 0.168, 0.1, 0.115], [1.0, 0.158, 0.098, 0.1], [1.06, 0.152, 0.098, 0.095],
    [1.14, 0.165, 0.11, 0.1], [1.22, 0.18, 0.125, 0.105], [1.3, 0.185, 0.122, 0.105], [1.355, 0.19, 0.105, 0.1], [1.39, 0.178, 0.09, 0.09], [1.418, 0.142, 0.08, 0.08], [1.44, 0.095, 0.066, 0.066], [1.458, 0.064, 0.056, 0.058]
  ];
  const shawl = s.warm && f ? C(s.warmColor || 0x8a4a3a) : null, jacket = s.warm && !f ? C(s.warmColor || 0x5a4a3a) : null;
  const torso = tor.map(([y, rx, rzF, rzB]) => { const shirt = y >= shirtBottom && y < 1.44, pants = y < shirtBottom;
    let c = y >= 1.44 ? skin : shirt ? top : (dressTop ? top : bot); if (shawl && y >= 1.16 && y < 1.44) c = shawl; if (jacket && y >= 0.9 && y < 1.44) c = jacket;
    return { y, cx: 0, cz: 0, rx: rx * bw, rzF: rzF * bw, rzB: rzB * bw, e: y > 1.18 && y < 1.34 ? 2.25 : 2.1, c, pat: (shirt || dressTop) && y < 1.44 && !(shawl && y >= 1.16) && !(jacket && y >= 0.9) ? topPat : 0, b: W(y, 0.98, 1.2), perim: 3 }; });
  // pescoço até a cabeça
  torso.push({ y: 1.5, cx: 0, cz: 0.005, rx: 0.052, rzF: 0.05, rzB: 0.05, c: skin, b: [[B.spine, 0.5], [B.head, 0.5]] }, { y: 1.55, cx: 0, cz: 0.01, rx: 0.05, rzF: 0.05, rzB: 0.05, c: skin, b: [[B.head, 1]] });
  bd.tube(torso, 18, true, true);
  // ---------- braços (levemente afastados do corpo)
  const shX = (f ? 0.165 : 0.19) * bw;
  const sleeveEnd = s.warm ? 0.87 : s.sleeves === 'longa' ? 0.87 : s.sleeves === 'arregaçada' ? 1.06 : s.sleeves === 'curta' ? 1.27 : 1.42;
  for (const sx of [-1, 1]) { const sh = sx < 0 ? B.shL : B.shR, el = sx < 0 ? B.elL : B.elR, ha = sx < 0 ? B.haL : B.haR;
    const ax = y => sx * (shX - 0.022 + (1.41 - y) * 0.07), arm = [[1.43, 0.03, sh], [1.41, 0.05, sh], [1.37, 0.052, sh], [1.28, 0.043, sh], [1.18, 0.037, sh], [1.12, 0.034, -1], [1.06, 0.038, el], [0.98, 0.034, el], [0.9, 0.03, el], [0.865, 0.029, -2]];
    bd.tube(arm.map(([y, r, b]) => { const sleeve = y >= sleeveEnd; const rr = (sleeve ? (y < 1.12 ? Math.max(r, 0.04) + 0.006 : r + 0.005) : r) * (f ? 0.9 : 1) * (0.9 + 0.1 * bw);
      const warmC = shawl ? (y > 1.1 ? shawl : top) : jacket; return { y, cx: ax(y) + (y > 1.36 ? sx * 0.008 : 0), cz: 0, rx: rr, rzF: rr, rzB: rr, c: sleeve ? (warmC || top) : skin, pat: sleeve && !(warmC && warmC !== top) ? topPat : 0,
        b: b === -1 ? [[sh, 0.5], [el, 0.5]] : b === -2 ? [[el, 0.4], [ha, 0.6]] : [[b, 1]] }; }), 12, true, true);
    // mão: palma, dedos juntos e polegar
    const hx = ax(0.86), hand = [new THREE.SphereGeometry(1, 10, 8).scale(0.022, 0.048, 0.042).translate(hx, 0.815, 0.004), new THREE.SphereGeometry(1, 10, 8).scale(0.017, 0.042, 0.037).translate(hx, 0.75, 0.008),
      new THREE.CapsuleGeometry(0.011, 0.04, 3, 6).rotateX(-0.5).rotateZ(sx * -0.2).translate(hx - sx * 0.004, 0.795, 0.04)];
    for (const g of hand) bd.rigid(g, skin.clone().multiplyScalar(0.98), ha);
  }
  // ---------- pernas
  const pantsEnd = s.skirt ? 2 : s.pants === 'bermuda' ? 0.5 : 0.1;
  for (const sx of [-1, 1]) { const hp = sx < 0 ? B.hpL : B.hpR, kn = sx < 0 ? B.knL : B.knR, ft = sx < 0 ? B.ftL : B.ftR, lx = sx * 0.09 * bw;
    const leg = [[0.98, 0.092, 0, hp], [0.88, 0.088, 0, hp], [0.76, 0.076, 0, hp], [0.62, 0.064, 0.003, hp], [0.52, 0.054, 0.006, -1], [0.46, 0.054, 0, kn], [0.36, 0.058, -0.012, kn], [0.24, 0.046, -0.006, kn], [0.13, 0.036, 0, kn], [0.085, 0.034, 0, -2]];
    bd.tube(leg.map(([y, r, cz, b]) => { const pants = y >= pantsEnd && !s.skirt; const rr = (pants ? Math.max(r, 0.058) + 0.01 : r) * (f ? 1.02 : 1) * (0.92 + 0.08 * bw);
      return { y, cx: lx * (1 - (0.98 - y) * 0.12), cz, rx: rr, rzF: rr * 1.05, rzB: rr * 1.08, c: pants ? bot : (s.skirt && s.stockings ? C(s.stockings) : skin), b: b === -1 ? [[hp, 0.5], [kn, 0.5]] : b === -2 ? [[kn, 0.5], [ft, 0.5]] : [[b, 1]] }; }), 12, false, true);
    // calçado: sapato/botina com sola
    const fx = lx * (1 - 0.9 * 0.12); bd.rigid(new THREE.SphereGeometry(1, 12, 8).scale(0.046, 0.04, 0.12).translate(fx, 0.05, 0.045), shoe, ft);
    bd.rigid(new THREE.BoxGeometry(0.085, 0.018, 0.24).translate(fx, 0.012, 0.045), shoe.clone().multiplyScalar(0.6), ft);
  }
  // ---------- gola da camisa, cinto com fivela (calça) e barra da calça
  if (!s.dress && !kid && s.sleeves !== 'nenhuma') {   // gola de camisa: faixa atrás do pescoço e as duas pontas em V na frente
    const band = new THREE.CylinderGeometry(f ? 0.064 : 0.072, f ? 0.07 : 0.078, 0.035, 16, 1, true, Math.PI * 0.62, Math.PI * 0.76).translate(0, 1.452, -0.004); bd.rigid(band, top.clone().multiplyScalar(0.97), B.spine, topPat);
    for (const sx of [-1, 1]) { const flap = new THREE.BufferGeometry(), x0 = sx * 0.012, x1 = sx * (f ? 0.06 : 0.068), zf = f ? 0.052 : 0.06;
      flap.setAttribute('position', new THREE.Float32BufferAttribute([x0, 1.415, zf + 0.012, x1, 1.462, zf - 0.012, x1 * 0.5, 1.44, zf + 0.02, x0, 1.415, zf + 0.012, x1 * 1.02, 1.428, zf + 0.004, x1, 1.462, zf - 0.012], 3));
      flap.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(12).fill(0), 2)); if (sx < 0) { const a = flap.attributes.position; for (const [i, j] of [[1, 2], [4, 5]]) { const t = [a.getX(i), a.getY(i), a.getZ(i)]; a.setXYZ(i, a.getX(j), a.getY(j), a.getZ(j)); a.setXYZ(j, ...t); } }
      bd.rigid(flap, top.clone().multiplyScalar(0.97), B.spine, topPat); } }
  if (!s.skirt && s.sex !== 'c') { const band = new THREE.CylinderGeometry(1, 1, 0.038, 20, 1, true).scale(0.165 * bw, 1, 0.105 * bw).translate(0, 0.965, 0); bd.rigid(band, C(0x3a2418), B.hips);
    bd.rigid(new THREE.BoxGeometry(0.05, 0.04, 0.012).translate(0, 0.965, 0.106 * bw), C(0xc8b070), B.hips); }
  // ---------- cabeça: crânio, mandíbula estreitando no queixo, nariz, sobrancelhas, olhos, lábios e orelhas
  // (as peças são feitas em volta do pescoço e levadas para a altura do osso da cabeça na pose de descanso)
  { const HY = 1.47, hd = { rigid: (g, c, b, pt) => bd.rigid(g.translate(0, HY, 0), c, b, pt) }; const hg = new THREE.SphereGeometry(1, 24, 18), p = hg.attributes.position;
    for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const low = Math.max(0, -y), front = Math.max(0, z);
      x *= 1 - low * low * 0.42; z *= 1 - low * 0.12; z += low * low * front * 0.25 - Math.max(0, -z) * Math.max(0, y) * 0.0;   // queixo e mandíbula
      if (y > 0.2 && z < 0) z *= 1.08;   // nuca
      y += front * front * Math.max(0, y - 0.15) * 0.0;
      p.setXYZ(i, x * 0.086, y * 0.118, z * 0.1); }
    hg.translate(0, 0.115, 0.012); hd.rigid(hg, skin, B.head);
    hd.rigid(new THREE.ConeGeometry(0.017, 0.045, 4).rotateX(Math.PI * 0.62).rotateY(Math.PI / 4).translate(0, 0.098, 0.12), skin.clone().multiplyScalar(0.96), B.head);   // nariz
    hd.rigid(new THREE.SphereGeometry(1, 8, 6).scale(0.022, 0.009, 0.01).translate(0, 0.058, 0.103), skin.clone().lerp(C(0xa0402e), 0.45), B.head);   // lábios
    for (const sx of [-1, 1]) {
      hd.rigid(new THREE.SphereGeometry(1, 8, 6).scale(0.016, 0.012, 0.006).translate(sx * 0.033, 0.122, 0.107), C(0xf2eee6), B.head);
      hd.rigid(new THREE.SphereGeometry(1, 8, 6).scale(0.009, 0.0105, 0.004).translate(sx * 0.033, 0.121, 0.112), C(0x2a1a10), B.head);
      hd.rigid(new THREE.BoxGeometry(0.034, 0.008, 0.012).rotateZ(sx * -0.1).translate(sx * 0.035, 0.142, 0.108), C(s.hairColor).multiplyScalar(0.9), B.head);
      hd.rigid(new THREE.SphereGeometry(1, 8, 6).scale(0.012, 0.026, 0.017).translate(sx * 0.087, 0.112, -0.004), skin.clone().multiplyScalar(0.95), B.head);
    }
    if (s.beard === 'bigode') hd.rigid(new THREE.BoxGeometry(0.05, 0.012, 0.012).translate(0, 0.073, 0.108), C(s.hairColor), B.head);
    if (s.beard === 'barba') { const bg = new THREE.SphereGeometry(1, 14, 10, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45); bg.scale(0.075, 0.07, 0.075).translate(0, 0.085, 0.03); hd.rigid(bg, C(s.hairColor), B.head); }
    hair(hd, s, B.head);
  }
  const geo = bd.build();
  // ---------- esqueleto (posição de descanso: em pé, braços caídos)
  const bone = (parent, x, y, z) => { const b = new THREE.Bone(); b.position.set(x, y, z); if (parent) parent.add(b); return b; };
  const hips = bone(null, 0, 0.95, 0), spine = bone(hips, 0, 0.05, 0), head = bone(spine, 0, 0.47, 0);
  const arms = [-1, 1].map(sx => { const sh = bone(spine, sx * (shX + 0.002), 0.41, 0), el = bone(sh, sx * 0.02, -0.29, 0), ha = bone(el, sx * 0.018, -0.26, 0); return { sh, el, ha }; });
  const legs = [-1, 1].map(sx => { const hp = bone(hips, sx * 0.09 * bw, -0.05, 0), kn = bone(hp, sx * -0.005, -0.41, 0), ft = bone(kn, 0, -0.43, 0); return { hp, kn, ft }; });
  const bones = [hips, spine, head, arms[0].sh, arms[0].el, arms[0].ha, arms[1].sh, arms[1].el, arms[1].ha, legs[0].hp, legs[0].kn, legs[0].ft, legs[1].hp, legs[1].kn, legs[1].ft];
  const mesh = new THREE.SkinnedMesh(geo, bodyMaterial(s.top.tex || null)); mesh.add(hips); mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones)); mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
  // a cabeça um tico maior que a anatomia (8% no adulto, 22% na criança): de longe, na câmera do jogo, o rosto e o chapéu leem
  head.scale.setScalar(kid ? 1.22 : 1.08);
  return { mesh, hips, spine, head, arms, legs, waistY: s.dress ? 1.0 : 0.97, bw };
}

// ---------- cabelo: um volume que acompanha o crânio, com linha do cabelo de verdade (testa, entradas, acima da orelha,
// nuca). Abaixo da linha o volume entra para dentro da cabeça e some, então a borda fica limpa, sem "capacete".
// Cada penteado soma o seu volume (afro com cachos, coque, rabo, tranças, cabelo comprido sobre os ombros) e os fios
// aparecem no desenho (mais escuros entre as mechas, brilho por cima).
const SKULL = { rx: 0.086, ry: 0.118, rz: 0.1, cy: 0.115, cz: 0.012 };
function hairShell({ t = 0.012, front = 0.42, side = 0.22, back = -0.6, top = 2, curl = 0, crown = 0.006, seg = 30, noTop = false } = {}) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75)), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const f = Math.abs(Math.atan2(x, z)) / Math.PI;   // 0 = frente, 1 = nuca
    const lim = f < 0.12 ? front : f < 0.32 ? front + (side - front) * smooth01((f - 0.12) / 0.2) : f < 0.62 ? side : side + (back - side) * smooth01((f - 0.62) / 0.3);
    let k = smooth01((y - lim) / 0.14);                // 0 abaixo da linha do cabelo, 1 acima
    if (noTop) k *= 1 - smooth01((y - 0.55) / 0.12);  // calvície no alto (fica a coroa dos lados e da nuca)
    const n = curl ? (vn3(x * 7, y * 7, z * 7) - 0.5) * curl * 2 + (vn3(x * 15 + 3, y * 15, z * 15) - 0.5) * curl : 0;
    const vol = (t + crown * Math.max(0, y) + n) * k - 0.006 * (1 - k);
    p.setXYZ(i, x * (SKULL.rx + vol), y * (SKULL.ry + vol * 0.9) + SKULL.cy, z * (SKULL.rz + vol) + SKULL.cz); }
  g.computeVertexNormals(); return g;
}
const smooth01 = v => { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); };
function vn3(x, y, z) { const h = (a, b, c) => { let n = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return n - Math.floor(n); };
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), fx = x - i, fy = y - j, fz = z - k, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t;
  return L(L(L(h(i, j, k), h(i + 1, j, k), u), L(h(i, j + 1, k), h(i + 1, j + 1, k), u), v), L(L(h(i, j, k + 1), h(i + 1, j, k + 1), u), L(h(i, j + 1, k + 1), h(i + 1, j + 1, k + 1), u), v), w); }
function hair(bd, s, hb) {
  const hc = C(s.hairColor), H = (g, c = hc) => bd.rigid(g, c, hb, 2), h = s.hair, kid = s.sex === 'c';
  if (h === 'curto') H(hairShell({ t: kid ? 0.016 : 0.013, front: kid ? 0.36 : 0.42, side: 0.24, back: -0.62, crown: 0.01 }));
  if (h === 'careca') H(hairShell({ t: 0.008, front: 0.5, side: 0.2, back: -0.55, noTop: true }));
  if (h === 'crespo') H(hairShell({ t: kid ? 0.03 : 0.04, front: 0.36, side: 0.15, back: -0.62, curl: 0.014, crown: 0.02, seg: 36 }));
  if (h === 'coque' || h === 'tranca' || h === 'longo' || h === 'chiquinha') H(hairShell({ t: 0.011, front: 0.4, side: 0.18, back: -0.66, crown: 0.004 }));
  const back = (y, z) => [0, SKULL.cy + y, SKULL.cz + z];
  if (h === 'coque') { const b = new THREE.SphereGeometry(1, 16, 12); const p = b.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + (vn3(p.getX(i) * 4, p.getY(i) * 4, p.getZ(i) * 4) - 0.5) * 0.25; p.setXYZ(i, p.getX(i) * 0.05 * k, p.getY(i) * 0.045 * k, p.getZ(i) * 0.05 * k); }
    b.translate(...back(0.07, -0.105)); H(b); }
  if (h === 'longo') {   // cai da nuca até os ombros, um pouco aberto, com mechas laterais na frente das orelhas
    const sheet = new THREE.CylinderGeometry(0.095, 0.115, 0.26, 20, 6, true, Math.PI * 0.55, Math.PI * 0.9), p = sheet.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const wav = Math.sin(Math.atan2(x, z) * 9) * 0.006; p.setXYZ(i, x * (1 + wav * 5), y, z + wav); }
    sheet.translate(0, SKULL.cy - 0.12, SKULL.cz - 0.005); sheet.computeVertexNormals(); H(sheet);
    for (const sx of [-1, 1]) H(new THREE.CapsuleGeometry(0.02, 0.14, 4, 8).scale(1, 1, 0.7).translate(sx * 0.085, SKULL.cy - 0.06, SKULL.cz + 0.02)); }
  if (h === 'tranca') { let y = SKULL.cy - 0.04, z = SKULL.cz - 0.1; for (let k = 0; k < 7; k++) { const sx = (k % 2 ? 1 : -1) * 0.008; H(new THREE.SphereGeometry(1, 10, 8).scale(0.024 - k * 0.0015, 0.03, 0.022).rotateZ(sx * 20).translate(sx, y, z)); y -= 0.042; z -= 0.006; }
    H(new THREE.TorusGeometry(0.016, 0.006, 5, 10).rotateX(Math.PI / 2).translate(0, y + 0.03, z), C(0xc83a2a)); H(new THREE.ConeGeometry(0.018, 0.05, 8).rotateX(Math.PI).translate(0, y, z)); }
  if (h === 'chiquinha') for (const sx of [-1, 1]) { const b = new THREE.SphereGeometry(1, 12, 10); b.scale(0.04, 0.05, 0.04).translate(sx * 0.095, SKULL.cy + 0.04, SKULL.cz - 0.06); H(b);
    H(new THREE.TorusGeometry(0.014, 0.005, 5, 10).rotateY(Math.PI / 2).translate(sx * 0.082, SKULL.cy + 0.05, SKULL.cz - 0.05), C(0xf2c21a)); }
  const hat = s.hat;

  if (hat === 'palha') { const br = new THREE.CylinderGeometry(0.2, 0.21, 0.012, 22); const p = br.attributes.position; for (let i = 0; i < p.count; i++) { const r = Math.hypot(p.getX(i), p.getZ(i)); p.setY(i, p.getY(i) - Math.max(0, r - 0.12) * 0.25); }
    bd.rigid(br.translate(0, 0.2, 0), C(0xe2cf8a), hb); bd.rigid(new THREE.CylinderGeometry(0.082, 0.1, 0.1, 16).translate(0, 0.25, 0), C(0xe6d494), hb); bd.rigid(new THREE.CylinderGeometry(0.1, 0.1, 0.022, 16).translate(0, 0.215, 0), C(0x8a3a2a), hb); }
  if (hat === 'couro') { const br = new THREE.CylinderGeometry(0.18, 0.18, 0.016, 22), p = br.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z) / 0.18; p.setY(i, p.getY(i) + Math.max(0, Math.abs(x) / 0.18 - 0.45) * 0.08 * r - Math.max(0, Math.abs(z) / 0.18 - 0.5) * 0.02); }
    bd.rigid(br.translate(0, 0.205, 0), C(0x7a4a2a), hb); bd.rigid(new THREE.SphereGeometry(0.1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.85, 1.08).translate(0, 0.2, 0), C(0x6a3a22), hb);
    bd.rigid(new THREE.TorusGeometry(0.1, 0.008, 4, 16).rotateX(Math.PI / 2).translate(0, 0.21, 0), C(0x3a2014), hb); }
  if (hat === 'bone') { bd.rigid(new THREE.SphereGeometry(0.1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.75, 1.05).translate(0, 0.16, 0.005), C(s.hatColor || 0x2f6aa0), hb);
    bd.rigid(new THREE.CylinderGeometry(0.075, 0.075, 0.01, 12, 1, false, -Math.PI / 2, Math.PI).scale(1, 1, 1.1).translate(0, 0.165, 0.085), C(s.hatColor || 0x2f6aa0), hb); }
  if (hat === 'lenco') { const g = new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.58); g.scale(0.1, 0.112, 0.112).translate(0, 0.12, -0.004); bd.rigid(g, C(s.lencoColor || 0xc83a2a), hb, 0);
    bd.rigid(new THREE.ConeGeometry(0.04, 0.08, 6).rotateX(-2.4).translate(0, 0.08, -0.12), C(s.lencoColor || 0xc83a2a), hb); }
}

// ---------- pano (saia, avental): cordas de pontos penduradas na cintura, com gravidade, vento, atrito e choque com as pernas
export function Cloth({ strips = 22, rows = 8, len = 0.6, r0x = 0.17, r0z = 0.12, flare = 0.12, arc = [0, Math.PI * 2], drop = 0, tex = null, color = 0xffffff, margin = 0.012, minK = 0.55 }) {
  const full = arc[1] - arc[0] >= Math.PI * 2 - 1e-3, ns = full ? strips : strips + 1, N = ns * (rows + 1);
  const P = new Float32Array(N * 3), O = new Float32Array(N * 3), rest = [], seg = len / rows;
  const geo = new THREE.BufferGeometry(), pos = new THREE.BufferAttribute(P, 3), uv = [], idx = [];
  for (let r = 0; r <= rows; r++) for (let k = 0; k < ns; k++) { const a = arc[0] + (arc[1] - arc[0]) * k / (full ? strips : strips); uv.push(k / strips * 3, -r / rows * 1.4); rest.push(a); }
  const at = (r, k) => r * ns + k;
  for (let r = 0; r < rows; r++) for (let k = 0; k < (full ? ns : ns - 1); k++) { const k2 = (k + 1) % ns; idx.push(at(r, k), at(r + 1, k), at(r, k2), at(r, k2), at(r + 1, k), at(r + 1, k2)); }
  // costura do fim com o começo (para a textura não esticar, a saia fechada repete o primeiro ponto)
  geo.setAttribute('position', pos); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
  const m = toon({ map: tex || null, color, side: THREE.DoubleSide });
  m.onBeforeCompile = sh => { shared(sh); sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp=transformed;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;\n' + HEAD).replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb*=mix(1.0,0.8,uWet);').replace('#include <lights_fragment_end>', LIGHT_END('2.2')); };
  m.customProgramCacheKey = () => 'pano' + (tex ? 1 : 0);
  const mesh = new THREE.Mesh(geo, m); mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true;
  const ringR = (r, a) => [(r0x + flare * r / rows) * Math.cos(a), (r0z + flare * 0.8 * r / rows) * Math.sin(a)];
  const tmp = new THREE.Vector3(), M = new THREE.Matrix4();
  let ready = false, hasLast = false; const Md = new THREE.Matrix4(), Mi = new THREE.Matrix4(), lastM = new THREE.Matrix4();
  function anchor(hipsWorld, waistY, k, out) { const a = rest[k], [x, z] = ringR(0, a); out.set(x, waistY - 0.95 + drop, z).applyMatrix4(hipsWorld); return out; }
  function reset(hipsWorld, waistY) { for (let r = 0; r <= rows; r++) for (let k = 0; k < ns; k++) { const a = rest[k], [x, z] = ringR(r, a), i = at(r, k) * 3; tmp.set(x, waistY - 0.95 + drop - r * seg * 0.98, z).applyMatrix4(hipsWorld); P.set([tmp.x, tmp.y, tmp.z], i); O.set([tmp.x, tmp.y, tmp.z], i); } ready = true; }
  // pernas: cápsulas (a, b, raio) em coordenadas do mundo
  function step(dt, hipsWorld, waistY, caps, groundY, scale, wind) {
    if (!ready) reset(hipsWorld, waistY);
    anchor(hipsWorld, waistY, 0, tmp); if (tmp.distanceToSquared(new THREE.Vector3(P[0], P[1], P[2])) > 0.25) { reset(hipsWorld, waistY); hasLast = false; }
    // o pano vai junto com o corpo (só o balanço que sobra é simulado): aguenta quadros lentos sem a saia ficar para trás
    // leva o pano com o movimento todo do quadril (andar e virar), sem deixar a saia para trás nem esticar quando o quadro é lento
    if (hasLast) { Md.copy(hipsWorld).multiply(Mi.copy(lastM).invert()); const e = Md.elements;
      for (let i = 0; i < N * 3; i += 3) for (const A of [P, O]) { const x = A[i], y = A[i + 1], z = A[i + 2]; A[i] = e[0] * x + e[4] * y + e[8] * z + e[12]; A[i + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; A[i + 2] = e[2] * x + e[6] * y + e[10] * z + e[14]; } }
    lastM.copy(hipsWorld); hasLast = true;
    const g = -9.8 * dt * dt, damp = 0.94, segS = seg * scale;
    const t = performance.now() * 0.001;
    for (let r = 1; r <= rows; r++) for (let k = 0; k < ns; k++) { const i = at(r, k) * 3, rr = r / rows;
      const vx = (P[i] - O[i]) * damp, vy = (P[i + 1] - O[i + 1]) * damp, vz = (P[i + 2] - O[i + 2]) * damp; O[i] = P[i]; O[i + 1] = P[i + 1]; O[i + 2] = P[i + 2];
      const flut = 1 + 0.6 * Math.sin(t * 7 + k * 1.7 + r);   // o vento bate em rajadinhas
      P[i] += vx + wind.x * dt * dt * rr * flut; P[i + 1] += vy + g; P[i + 2] += vz + wind.z * dt * dt * rr * flut; }
    for (let it = 0; it < 4; it++) {
      for (let k = 0; k < ns; k++) { anchor(hipsWorld, waistY, k, tmp); const i = at(0, k) * 3; P[i] = tmp.x; P[i + 1] = tmp.y; P[i + 2] = tmp.z; }
      for (let r = 1; r <= rows; r++) for (let k = 0; k < ns; k++) {
        // ao longo da corda: comprimento fixo
        const i = at(r, k) * 3, j = at(r - 1, k) * 3; let dx = P[i] - P[j], dy = P[i + 1] - P[j + 1], dz = P[i + 2] - P[j + 2], d = Math.hypot(dx, dy, dz) || 1e-6, e = (d - segS) / d;
        const w = r === 1 ? 1 : 0.5; P[i] -= dx * e * w; P[i + 1] -= dy * e * w; P[i + 2] -= dz * e * w; if (r > 1) { P[j] += dx * e * 0.5; P[j + 1] += dy * e * 0.5; P[j + 2] += dz * e * 0.5; }
        // de lado: a roda da saia não estica além da costura nem se fecha
        if (full || k < ns - 1) { const k2 = (k + 1) % ns, q = at(r, k2) * 3, [ax, az] = ringR(r, rest[k]), [bx, bz] = ringR(r, rest[k2]), rl = Math.hypot(ax - bx, az - bz) * scale;
          dx = P[q] - P[i]; dy = P[q + 1] - P[i + 1]; dz = P[q + 2] - P[i + 2]; d = Math.hypot(dx, dy, dz) || 1e-6;
          if (d > rl * 1.02 || d < rl * minK) { const tgt = d > rl ? rl * 1.02 : rl * minK; e = (d - tgt) / d * 0.5; P[i] += dx * e; P[i + 1] += dy * e; P[i + 2] += dz * e; P[q] -= dx * e; P[q + 1] -= dy * e; P[q + 2] -= dz * e; } }
        // pernas
        for (const [a, b, rad] of caps) { const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z, l2 = abx * abx + aby * aby + abz * abz;
          let tt = ((P[i] - a.x) * abx + (P[i + 1] - a.y) * aby + (P[i + 2] - a.z) * abz) / l2; tt = Math.max(0, Math.min(1, tt));
          const cx = a.x + abx * tt, cy = a.y + aby * tt, cz = a.z + abz * tt; dx = P[i] - cx; dy = P[i + 1] - cy; dz = P[i + 2] - cz; d = Math.hypot(dx, dy, dz); const R = rad + margin * scale;
          if (d < R) { if (d < 1e-5) { dx = 0; dy = 0; dz = 1; d = 1; } const s2 = (R - d) / d; P[i] += dx * s2; P[i + 1] += dy * s2; P[i + 2] += dz * s2; } }
        const gy = groundY(P[i], P[i + 2]) + 0.01; if (P[i + 1] < gy) P[i + 1] = gy;
      } }
    pos.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
  }
  return { mesh, step, reset: () => { ready = false; hasLast = false; } };
}
export { B as BONES };
