// Corpo humano em uma malha só, com esqueleto (pele que dobra nas juntas, sem as emendas de boneco), nas proporções de
// verdade de um adulto de 1,70 m (a escala dá a altura de cada um): cabeça ~1/7,5 da altura, tronco com a curva da coluna
// (peito para a frente, lombar para dentro, glúteo para trás), ombro com deltoide, braço com bíceps e antebraço que afina
// no punho, mão com palma, quatro dedos e polegar (soltos em quem anda, fechados em volta do cabo em quem segura
// ferramenta), coxa e panturrilha com volume, e o calçado de cada um: botina, sapato, chinelo de dedo ou pé descalço.
// O rosto: crânio com testa, maçã do rosto, mandíbula e queixo; olho com branco, íris, pupila e brilho, pálpebra de cima que
// pisca (malha à parte, presa no osso da cabeça), sobrancelha arqueada, nariz com ponte, ponta e asas, lábio de cima e de
// baixo, orelha com lóbulo, bochecha corada e, no homem sem barba, a sombra da barba por fazer.
// A roupa: o corpo da camisa e da calça é a própria pele pintada, com o pano que sobra (franzido em cima do cinto, vinco
// na dobra do cotovelo, calça embolando na barra); por cima vão peças de pano com espessura medidas na superfície do
// tronco: gola com pé em volta do pescoço e abas que assentam no ombro, decote em V com a pele do peito, carcela com botões,
// bolso, cinto que acompanha o quadril, ribana no decote da camiseta e do vestido. A saia e o avental são pano de verdade
// (cordas de pontos que caem com a gravidade, batem nas pernas e o vento balança).
// No desenho: vinco de pano e trama do tecido na roupa, fios e brilho no cabelo, palha trançada no chapéu.
import * as THREE from 'three';
import { U, HEAD, LIGHT_END, shared, toon } from './mat.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const C = c => (c && c.isColor) ? c.clone() : new THREE.Color(c);
const G = (x, s) => Math.exp(-(x * x) / (s * s));   // sino

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

// ---------- montagem: tubos de anéis elípticos (tronco, braços, pernas) + peças rígidas (cabeça, mãos, pés)
function Builder() {
  const pos = [], nor = [], col = [], uv = [], sk = [], sw = [], pat = [], idx = [], part = [], partNames = ['?']; let cur = 0;
  const setPart = name => { let i = partNames.indexOf(name); if (i < 0) { partNames.push(name); i = partNames.length - 1; } cur = i; };   // cada vértice sabe de que peça é (o juiz usa)
  const vert = (p, n, c, u, v, bones, pt) => { part.push(cur); pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); col.push(c.r, c.g, c.b); uv.push(u, v);
    const b = bones.slice(0, 4); while (b.length < 4) b.push([0, 0]); const s = b.reduce((a, x) => a + x[1], 0) || 1;
    sk.push(...b.map(x => x[0])); sw.push(...b.map(x => x[1] / s)); pat.push(pt); return pos.length / 3 - 1; };
  // anel: centro (cx, y, cz), raios rx, rzF (frente), rzB (costas), expoente (2 = elipse, mais = mais quadrado);
  // c pode ser uma cor ou uma função do ângulo (frente = π/2) para pintar só um lado; b (ossos) também pode ser função do
  // ângulo: assim a lateral do ombro do tronco segue em parte o osso do ombro e o ombro dobra junto com o braço.
  // A normal sai da própria superfície (anéis de cima e de baixo): no ombro, que estreita rápido, a luz cai certa
  function tube(rings, seg = 16, capTop = false, capBot = false) {
    const base = pos.length / 3, per = seg + 1, P = rings.map(r => { const e = r.e || 2, out = [];
      for (let k = 0; k <= seg; k++) { const a = k / seg * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), sx = Math.sign(ca) * Math.pow(Math.abs(ca), 2 / e), sz = Math.sign(sa) * Math.pow(Math.abs(sa), 2 / e);
        const m = r.m ? r.m(a) : 1;   /* m: raio que muda com o ângulo (pano franzido, vinco) */
        out.push({ p: V(r.cx + r.rx * sx * m, r.y, r.cz + (sa > 0 ? r.rzF : r.rzB) * sz * m), h: V(sx / r.rx, 0, sz / (sa > 0 ? r.rzF : r.rzB)).normalize(), a, ca, sa }); } return out; });
    const t1 = V(0, 0, 0), t2 = V(0, 0, 0);
    rings.forEach((r, i) => { for (let k = 0; k <= seg; k++) { const q = P[i][k], up = P[Math.max(0, i - 1)][k].p, dn = P[Math.min(rings.length - 1, i + 1)][k].p;
        t1.subVectors(P[i][(k + 1) % (seg + 1) || 1].p, P[i][(k + seg - 1) % seg].p); t2.subVectors(up, dn);
        let n = V(0, 0, 0).crossVectors(t2, t1); if (n.lengthSq() < 1e-12 || !isFinite(n.x)) n = q.h.clone(); n.normalize(); if (n.dot(q.h) < 0) n.negate(); if (n.dot(q.h) < 0.2) n.lerp(q.h, 0.6).normalize();
        vert(q.p, n, typeof r.c === 'function' ? r.c(q.a) : C(r.c), k / seg * (r.perim || 1), r.y / 0.22, typeof r.b === 'function' ? r.b(q.ca, q.sa) : r.b, typeof r.pat === 'function' ? r.pat(q.a) : r.pat || 0); } });
    for (let i = 0; i + 1 < rings.length; i++) for (let k = 0; k < seg; k++) { const a = base + i * per + k, b = a + per; idx.push(a, a + 1, b, a + 1, b + 1, b); }
    const cap = (ri, down) => { const r = rings[ri], c = vert(V(r.cx, r.y, r.cz), V(0, down ? -1 : 1, 0), typeof r.c === 'function' ? r.c(0) : C(r.c), 0.5, 0.5, typeof r.b === 'function' ? r.b(0, 0) : r.b, typeof r.pat === 'function' ? r.pat(0) : r.pat || 0);
      for (let k = 0; k < seg; k++) { const a = base + ri * per + k; if (down) idx.push(c, a, a + 1); else idx.push(c, a + 1, a); } };
    const i0 = idx.length - (rings.length - 1) * seg * 6;
    const ascending = rings[rings.length - 1].y > rings[0].y; if (capTop) cap(rings.length - 1, !ascending); if (capBot) cap(0, ascending);
    // cada triângulo de frente para fora: se a ordem dos vértices contraria a normal guardada, inverte
    for (let t = i0; t < idx.length; t += 3) { const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
      const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, sx = nor[a] + nor[b] + nor[c], sy = nor[a + 1] + nor[b + 1] + nor[c + 1], sz = nor[a + 2] + nor[b + 2] + nor[c + 2];
      if (nx * sx + ny * sy + nz * sz < 0) { const k = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = k; } }
  }
  // peça rígida (geometria pronta) presa a um osso; se a geometria tiver cor por vértice, ela vale
  function rigid(geo, c, bone, pt = 0) { if (geo.index) geo.computeVertexNormals(); const g = geo.index ? geo.toNonIndexed() : geo; if (!geo.index && !g.attributes.normal) g.computeVertexNormals();   /* normal suave: a luz não fica chapada por triângulo */ const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv, cc = g.attributes.color;
    const base = pos.length / 3, c0 = C(c), tc = new THREE.Color(); for (let i = 0; i < p.count; i++) vert(V(p.getX(i), p.getY(i), p.getZ(i)), V(n.getX(i), n.getY(i), n.getZ(i)), cc ? tc.setRGB(cc.getX(i), cc.getY(i), cc.getZ(i)) : c0, u ? u.getX(i) : 0, u ? u.getY(i) : 0, typeof bone === 'function' ? bone(V(p.getX(i), p.getY(i), p.getZ(i))) : Array.isArray(bone) ? bone : [[bone, 1]], pt);
    for (let i = 0; i + 2 < p.count; i += 3) { const ax = p.getX(i), ay = p.getY(i), az = p.getZ(i), ux = p.getX(i + 1) - ax, uy = p.getY(i + 1) - ay, uz = p.getZ(i + 1) - az, vx = p.getX(i + 2) - ax, vy = p.getY(i + 2) - ay, vz = p.getZ(i + 2) - az;
      if ((uy * vz - uz * vy) ** 2 + (uz * vx - ux * vz) ** 2 + (ux * vy - uy * vx) ** 2 > 1e-20) idx.push(base + i, base + i + 1, base + i + 2); } }   /* sem os triângulos de área zero (ponta das cápsulas) */
  function build() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('pat', new THREE.Float32BufferAttribute(pat, 1));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sk, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4)); g.setIndex(idx);
    g.userData.part = Uint8Array.from(part); g.userData.partNames = partNames.slice(); return g; }
  return { tube, rigid, build, setPart };
}
// uma peça de geometria orientada: cápsula do ponto a até o ponto b (raio r)
function capsAB(a, b, r, rs = 6) { const d = new THREE.Vector3().subVectors(b, a), L = d.length(), g = new THREE.CapsuleGeometry(r, Math.max(1e-4, L), 3, rs);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize())); g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); return g; }
const paintG = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3), cc = C(c); for (let i = 0; i < n; i++) a.set([cc.r, cc.g, cc.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };

// lados dos tubos (o juiz mede a quina da silhueta com eles)
const SEG = { tronco: 28, braco: 16, perna: 20 };   // mais lados: a silhueta sem quina (o juiz mede < 1,6 mm)
// ossos (índices)
const B = { hips: 0, spine: 1, head: 2, shL: 3, elL: 4, haL: 5, shR: 6, elR: 7, haR: 8, hpL: 9, knL: 10, ftL: 11, hpR: 12, knR: 13, ftR: 14, clL: 15, clR: 16, ecL: 17, ecR: 18, jcL: 19, jcR: 20 };   // ec/jc: auxiliares do cotovelo e do joelho   // cl: clavícula (osso auxiliar do ombro)

// s: { sex 'm'|'f'|'c', build, skin, hairColor, hair, beard, top:{color, tex}, bottom:{color, tex}, sleeves, pants: 'longa'|'bermuda',
//      shoes (cor), footwear: 'botina'|'sapato'|'chinelo'|'descalco', grip (mãos fechadas no cabo), shirt: 'camisa'|'camiseta', eyes (cor da íris), old ... }
export function buildBody(s) {
  const f = s.sex === 'f', kid = s.sex === 'c', bw = s.build || 1, skin = C(s.skin), top = C(s.top.color || 0xffffff), bot = C(s.bottom.color || 0xffffff), shoe = C(s.shoes || 0x3a2a20);
  const topPat = s.top.tex ? 1 : 3, botPat = s.bottom.tex ? 1 : 3, dressTop = !!s.dress, hairC = C(s.hairColor);
  const bd = Builder();
  // ---------- tronco (do gancho ao pescoço): [altura, meia-largura, frente, costas, deslocamento para a frente]
  const W = (y, a, b) => y < a ? [[B.hips, 1]] : y > b ? [[B.spine, 1]] : [[B.hips, (b - y) / (b - a)], [B.spine, (y - a) / (b - a)]];
  // a blusa de quem usa saia desce até o quadril (fica por baixo do pano): não abre vão na cintura quando ela se curva
  const shirtBottom = s.skirt ? 0.86 : kid ? 0.93 : 0.98;   /* com cinto, a camisa some dentro da calça embaixo do cinto */
  const tor = f ? [
    [0.80, 0.11, 0.07, 0.08, 0], [0.85, 0.172, 0.1, 0.13, -0.012], [0.90, 0.185, 0.108, 0.14, -0.016], [0.95, 0.178, 0.105, 0.122, -0.012], [1.00, 0.152, 0.098, 0.1, -0.004],
    [1.05, 0.13, 0.088, 0.088, 0.002], [1.10, 0.132, 0.092, 0.088, 0.006], [1.16, 0.145, 0.11, 0.092, 0.01], [1.21, 0.152, 0.14, 0.095, 0.012], [1.26, 0.156, 0.146, 0.098, 0.012],
    [1.31, 0.156, 0.118, 0.098, 0.008, 2.2], [1.345, 0.168, 0.1, 0.094, 0.003, 2.3], [1.37, 0.176, 0.09, 0.09, 0, 2.45], [1.392, 0.172, 0.082, 0.085, -0.004, 2.45],
    [1.41, 0.155, 0.074, 0.078, -0.006, 2.3], [1.425, 0.122, 0.066, 0.07, -0.005, 2.15], [1.44, 0.084, 0.057, 0.06, -0.003, 2.0], [1.455, 0.056, 0.048, 0.05, 0, 2.0]
  ] : [
    [0.80, 0.1, 0.07, 0.08, 0], [0.85, 0.158, 0.095, 0.12, -0.01], [0.90, 0.168, 0.1, 0.13, -0.014], [0.95, 0.165, 0.1, 0.118, -0.01], [1.00, 0.158, 0.098, 0.1, -0.004],
    [1.06, 0.152, 0.097, 0.09, 0.002], [1.12, 0.16, 0.103, 0.092, 0.006], [1.18, 0.172, 0.112, 0.098, 0.008], [1.24, 0.182, 0.12, 0.104, 0.01], [1.30, 0.188, 0.124, 0.106, 0.01],
    [1.34, 0.204, 0.116, 0.106, 0.006, 2.6], [1.37, 0.212, 0.104, 0.102, 0.002, 2.9], [1.395, 0.208, 0.092, 0.095, -0.004, 2.9], [1.415, 0.188, 0.082, 0.088, -0.007, 2.6],
    [1.43, 0.15, 0.072, 0.078, -0.007, 2.3], [1.443, 0.105, 0.064, 0.068, -0.005, 2.1], [1.455, 0.07, 0.058, 0.06, -0.002, 2.0], [1.465, 0.058, 0.052, 0.054, 0, 2.0]
  ];
  const shawl = s.warm && f ? C(s.warmColor || 0x8a4a3a) : null, jacket = s.warm && !f ? C(s.warmColor || 0x5a4a3a) : null;
  // o ombro: a lateral do alto do tronco (deltoide e acrômio) vai em parte com o osso do ombro daquele lado
  const neckY = f ? 1.447 : 1.452, shK = y => 0.9 * smooth01((y - 1.26) / 0.12) * (1 - 0.75 * smooth01((y - 1.415) / 0.035)) * (y < neckY ? 1 : 0);
  const torsoB = y => { const base = W(y, 0.98, 1.2), k = shK(y); if (k <= 0) return base;
    return (ca) => { const w = k * smooth01((Math.abs(ca) - 0.45) / 0.5); return w <= 0 ? base : [[B.spine, 1 - w], [ca < 0 ? B.clL : B.clR, w]]; }; };   /* a lateral do ombro vai com a clavícula */
  bd.setPart('tronco');
  // com cinto, um anel a mais logo acima do meio do cinto: a troca de cor da calça para a camisa fica escondida embaixo dele
  if (!s.skirt && !kid) { const i = tor.findIndex(r => r[0] > 0.985), a = tor[i - 1], b = tor[i], t = (0.985 - a[0]) / (b[0] - a[0]); tor.splice(i, 0, a.map((v, j) => j === 5 ? v : v + ((b[j] ?? v) - v) * t)); }
  const torso = tor.map(([y, rx, rzF, rzB, cz, ee]) => { const shirt = y >= shirtBottom && y < neckY, neck = y >= neckY;
    let c = neck ? skin : shirt ? top : (dressTop ? top : bot); if (shawl && y >= 1.16 && !neck) c = shawl; if (jacket && y >= 0.9 && !neck) c = jacket;
    const ao = y < 0.84 ? 0.82 : neck ? 0.93 : 1;   // sombra no gancho e embaixo do queixo
    const p = neck ? 0 : (shawl && y >= 1.16) || (jacket && y >= 0.9) ? 3 : (shirt || dressTop) ? topPat : botPat;
    // a camisa enfiada na calça sobra em cima do cinto: franzidos que sobem do cós (o raio e a cor mudam com o ângulo)
    const blouse = shirt && !s.skirt && !s.dress && !jacket && y > 0.99 && y < 1.08 ? (y < 1.03 ? 1 : 0.45) : 0, fw = a => 0.5 + 0.5 * Math.sin(9 * a + 1.3 * Math.sin(3 * a) + y * 30);
    return { y, cx: 0, cz: cz * bw, rx: rx * bw, rzF: rzF * bw, rzB: rzB * bw, e: ee || (y > 1.18 && y < 1.34 ? 2.25 : 2.1), c: blouse ? (a => c.clone().multiplyScalar(ao * (1 - 0.14 * blouse * (1 - fw(a))))) : c.clone().multiplyScalar(ao),
      m: blouse ? (a => 1 + blouse * (0.022 + 0.022 * fw(a))) : null, pat: p, b: torsoB(y), perim: 3 }; });
  torso.push({ y: 1.5, cx: 0, cz: 0.005, rx: 0.052, rzF: 0.05, rzB: 0.05, c: skin, b: [[B.spine, 0.5], [B.head, 0.5]] }, { y: 1.55, cx: 0, cz: 0.01, rx: 0.05, rzF: 0.05, rzB: 0.05, c: skin, b: [[B.head, 1]] });
  bd.tube(torso, SEG.tronco, true, true);
  const torsoAt = y => { let a = tor[0]; for (const r of tor) { if (r[0] <= y) a = r; } return { rzF: a[2] * bw, cz: a[4] * bw, rx: a[1] * bw }; };
  // ---------- braços: deltoide, bíceps, cotovelo, antebraço que afina no punho
  const shX = (f ? 0.165 : 0.19) * bw;
  const AD = 0.022, ay = y => y < 1.12 ? y - AD : y < 1.2 ? y - AD * (1.2 - y) / 0.08 : y;   /* o braço do ombro ao cotovelo, com o antebraço e a mão descendo junto */
  const sleeveEnd = s.warm ? 0.87 : s.sleeves === 'longa' ? 0.87 : s.sleeves === 'arregaçada' ? 1.06 : s.sleeves === 'curta' ? 1.27 : 1.42;
  for (const sx of [-1, 1]) { const sh = sx < 0 ? B.shL : B.shR, el = sx < 0 ? B.elL : B.elR, ha = sx < 0 ? B.haL : B.haR;
    const ax = y => sx * (shX - 0.016 + (1.41 - y) * 0.06);
    const arm = [[1.395, 0.022, sh], [1.38, 0.04, sh], [1.355, 0.05, sh], [1.32, 0.05, sh], [1.27, 0.046, sh], [1.2, 0.04, sh], [1.165, 0.037, 'S1'], [1.14, 0.036, -1], [1.115, 0.037, 'E1'], [1.1, 0.038, el], [1.04, 0.041, el], [0.98, 0.036, el], [0.92, 0.03, el], [0.88, 0.026, -2], [0.862, 0.027, ha]];
    // anéis colados na barra da manga: a troca de cor do pano para a pele fica embaixo da dobra, não se espalha pelo braço
    for (const [dy, up] of [[0.002, 1], [-0.007, 0]]) { const y = sleeveEnd + dy, i = arm.findIndex(r => r[0] < y); if (i <= 0 || sleeveEnd >= 1.395) continue;
      const a = arm[i - 1], b = arm[i]; if (Math.min(a[0] - y, y - b[0]) < 0.004) continue; const t = (a[0] - y) / (a[0] - b[0]); arm.splice(i, 0, [y, a[1] + (b[1] - a[1]) * t, typeof (up ? a : b)[2] === 'number' && (up ? a : b)[2] >= 0 ? (up ? a : b)[2] : (t < 0.5 ? a : b)[2]]); }
    const warmC = shawl ? null : jacket; bd.setPart('braço');
    bd.tube(arm.map(([y0, r, b]) => { const y = y0; const sleeve = y >= sleeveEnd; const rr = (sleeve ? (y < 1.12 ? Math.max(r, 0.039) + 0.004 : r + (y > 1.36 ? 0.002 : 0.005)) : r) * (f ? 0.88 : 1) * (0.9 + 0.1 * bw);
      const cc = sleeve ? (shawl && y > 1.1 ? shawl : warmC || top) : skin;
      // manga: vincos na dobra do cotovelo (do lado de dentro) e o pano que junta perto do punho
      const fk = !sleeve ? 0 : y > 1.09 && y < 1.2 ? 1 : y < sleeveEnd + 0.07 ? 0.6 : 0.25, fv = a => Math.max(0, Math.sin(a) * 0.8 + 0.2) * (0.5 + 0.5 * Math.sin(5 * a + y * 55));
      return { y: ay(y), cx: ax(y) + (y > 1.36 ? sx * 0.008 : 0), cz: y < 1.12 && y > 0.9 ? 0.006 : 0, rx: rr, rzF: rr * (y < 1.3 && y > 1.2 ? 1.08 : 1), rzB: rr, c: fk ? (a => cc.clone().multiplyScalar(1 - 0.16 * fk * (1 - fv(a)))) : cc, m: fk ? (a => 1 + 0.07 * fk * fv(a)) : null, pat: sleeve ? (cc === top ? topPat : 3) : 0,
        b: b === -1 ? [[sx < 0 ? B.ecL : B.ecR, 1]] : b === 'S1' ? [[sh, 0.6], [sx < 0 ? B.ecL : B.ecR, 0.4]] : b === 'E1' ? [[sx < 0 ? B.ecL : B.ecR, 0.4], [el, 0.6]] : b === -2 ? [[el, 0.4], [ha, 0.6]] : [[b, 1]] }; }), SEG.braco, true, true);
    // punho da manga: dobra (arregaçada), bainha (curta) ou punho abotoado (longa)
    bd.setPart('manga');
    if (sleeveEnd < 1.42 && !s.warm) { const y = sleeveEnd, r = (y < 1.12 ? 0.046 : y > 1.2 ? 0.052 : 0.045) * (f ? 0.88 : 1), th = s.sleeves === 'arregaçada' ? 0.011 : 0.006;
      bd.rigid(new THREE.TorusGeometry(r, th, 5, 16).rotateX(Math.PI / 2).translate(ax(y), ay(y) + 0.004, 0), top.clone().multiplyScalar(0.92), y > 1.12 ? sh : y < 0.9 ? ha : el, topPat); }
    // mão: palma, quatro dedos em duas falanges, polegar; solta (curva de descanso) ou fechada no cabo
    bd.setPart('mão');
    const hx = ax(0.86), skinH = skin.clone().multiplyScalar(0.98), grip = !!s.grip, KNY = 0.772 - AD, hz = 0.006;
    bd.rigid(new THREE.SphereGeometry(1, 12, 9).scale(0.0165, 0.046, 0.04).translate(hx, 0.816 - AD, hz), skinH, ha);
    [[0.025, 0.074, 0.0085], [0.009, 0.08, 0.009], [-0.008, 0.075, 0.0085], [-0.024, 0.06, 0.0075]].forEach(([z, L, r], i) => {
      const c1 = grip ? 1.35 : 0.3 + i * 0.05, c2 = grip ? 1.45 : 0.42, k = V(hx + sx * 0.002, KNY, hz + z);
      const d1 = V(-sx * Math.sin(c1), -Math.cos(c1), 0), p1 = k.clone().addScaledVector(d1, L * 0.55), d2 = V(-sx * Math.sin(c1 + c2), -Math.cos(c1 + c2), 0), p2 = p1.clone().addScaledVector(d2, L * 0.42);
      bd.rigid(capsAB(k, p1, r), skinH, ha); bd.rigid(capsAB(p1, p2, r * 0.92), skinH, ha); });
    { const a = V(hx - sx * 0.006, 0.83 - AD, hz + 0.03), dir = grip ? V(-sx * 0.55, -0.55, 0.45) : V(-sx * 0.25, -0.75, 0.55); dir.normalize(); const b = a.clone().addScaledVector(dir, 0.04), dir2 = dir.clone().add(V(-sx * 0.3, 0, 0)).normalize(), c = b.clone().addScaledVector(dir2, 0.03);
      bd.rigid(capsAB(a, b, 0.0105), skinH, ha); bd.rigid(capsAB(b, c, 0.0092), skinH, ha); }
  }
  // ---------- pernas
  const pantsEnd = s.skirt ? 2 : s.pants === 'bermuda' ? 0.5 : 0.1;
  const fw = s.footwear || (kid ? 'chinelo' : f ? 'sapato' : 'botina'), LX = f ? 0.09 : 0.086, FL = kid ? 1.1 : 1;   /* afastamento das pernas; pé de criança proporcionalmente maior */
  for (const sx of [-1, 1]) { const hp = sx < 0 ? B.hpL : B.hpR, kn = sx < 0 ? B.knL : B.knR, ft = sx < 0 ? B.ftL : B.ftR, lx = sx * LX * bw;
    bd.setPart('perna');
    const bare = fw === 'chinelo' || fw === 'descalco';
    const leg = [[0.98, f ? 0.092 : 0.088, 0, hp], [0.9, f ? 0.09 : 0.087, -0.004, hp], [0.8, 0.08, 0, hp], [0.68, 0.068, 0.004, hp], [0.58, 0.058, 0.006, hp], [0.55, 0.056, 0.007, 'H1'], [0.52, 0.054, 0.008, -1], [0.49, 0.0535, 0.004, 'K1'], [0.46, 0.053, 0, kn], [0.38, 0.058, -0.014, kn], [0.3, 0.054, -0.012, kn], [0.2, 0.042, -0.004, kn], [0.13, 0.035, 0, kn], [0.09, 0.034, 0, -2], ...(bare ? [[0.055, 0.03, 0.01, ft]] : [])];
    bd.tube(leg.map(([y, r, cz, b]) => { const pants = y >= pantsEnd && !s.skirt; const rr = (pants ? Math.max(r, 0.06) + 0.01 : r) * (f ? 1.02 : 1) * (0.92 + 0.08 * bw);
      const cc = pants ? bot.clone().multiplyScalar(y < 0.2 ? 0.88 : y > 0.44 && y < 0.56 ? 1.05 : 1) : (s.skirt && s.stockings ? C(s.stockings) : skin);   // barra mais suja, joelho gasto
      // calça: vinco passado na frente, costura do lado, pano que enruga atrás do joelho e embola em cima da botina
      const pk = !pants ? 0 : y < 0.2 ? 1 : y > 0.44 && y < 0.6 ? 0.7 : 0, pw = a => 0.5 + 0.5 * Math.sin(6 * a + y * 70), back = a => y < 0.2 ? 1 : Math.max(0, -Math.sin(a));
      const pc = a => cc.clone().multiplyScalar((1 + 0.07 * Math.max(0, Math.sin(a)) ** 12 - 0.1 * Math.abs(Math.cos(a)) ** 14) * (1 - 0.14 * pk * back(a) * (1 - pw(a))));
      return { y, cx: lx * (1 - (0.98 - y) * 0.12), cz: pants ? cz * 0.5 : cz, rx: rr, rzF: rr * 1.05, rzB: rr * 1.08, c: pants ? pc : cc, m: pk && y < 0.2 ? (a => 1 + 0.05 * back(a) * pw(a)) : null,   /* atrás do joelho o vinco é só de cor: volume ali estica quando ajoelha */ pat: pants ? botPat : 0, b: b === -1 ? [[sx < 0 ? B.jcL : B.jcR, 1]] : b === 'H1' ? [[hp, 0.6], [sx < 0 ? B.jcL : B.jcR, 0.4]] : b === 'K1' ? [[sx < 0 ? B.jcL : B.jcR, 0.4], [kn, 0.6]] : b === -2 ? [[kn, 0.5], [ft, 0.5]] : [[b, 1]] }; }), SEG.perna, false, true);
    const fx = lx * (1 - 0.88 * 0.12);
    // barra da calça virada para fora (bainha dobrada, como na roça)
    bd.setPart('roupa');
    if (!s.skirt && s.pants !== 'bermuda') bd.rigid(new THREE.TorusGeometry(0.068 * (0.92 + 0.08 * bw), 0.012, 5, 14).rotateX(Math.PI / 2).translate(fx, 0.118, 0), bot.clone().multiplyScalar(0.85), kn, botPat);
    if (s.pants === 'bermuda' && !s.skirt) bd.rigid(new THREE.TorusGeometry(0.068, 0.008, 5, 14).rotateX(Math.PI / 2).translate(lx * 0.96, 0.505, 0.004), bot.clone().multiplyScalar(0.85), [[hp, 0.5], [kn, 0.5]], botPat);
    // pé de verdade (o pé de quem usa chinelo ou anda descalço): peito do pé, calcanhar e cinco dedos
    bd.setPart('pé');
    const bareFoot = () => { const g = new THREE.SphereGeometry(1, 12, 8), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i), y = p.getY(i); p.setXYZ(i, p.getX(i) * (1 - Math.max(0, -z) * 0.25), y < 0 ? y * 0.35 : y, z); }
      g.scale(0.04, 0.032, 0.108 * FL).translate(fx, 0.03, 0.045 * FL); bd.rigid(g, skin, ft);
      [[-1.4, 0.011, 0.012], [-0.65, 0.008, 0.006], [0, 0.0075, 0.002], [0.65, 0.007, -0.004], [1.3, 0.0065, -0.012]].forEach(([k, r, dz]) => bd.rigid(new THREE.SphereGeometry(r, 8, 6).scale(1, 0.85, 1.2).translate(fx - sx * k * 0.013, 0.014, (0.148 + dz) * FL), skin, ft)); };
    if (fw === 'botina' || fw === 'sapato') {   // cabedal com bico mais estreito, sola e salto; a botina sobe até o tornozelo
      const up = new THREE.SphereGeometry(1, 14, 10), p = up.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i), y = p.getY(i); p.setXYZ(i, p.getX(i) * (1 - Math.max(0, z) * 0.28), y < -0.2 ? -0.2 - (y + 0.2) * 0.25 : y, z); }
      up.scale(0.046, fw === 'botina' ? 0.05 : 0.042, 0.12).translate(fx, 0.052, 0.05); bd.rigid(up, shoe, ft, 5);
      if (fw === 'botina') { bd.rigid(new THREE.CylinderGeometry(0.044, 0.047, 0.07, 12).translate(fx, 0.1, -0.004), shoe.clone().multiplyScalar(0.92), [[ft, 0.6], [kn, 0.4]], 5);
        for (let k = 0; k < 3; k++) bd.rigid(new THREE.BoxGeometry(0.03, 0.004, 0.004).translate(fx, 0.085 + k * 0.016, 0.052 - k * 0.006), C(0x1a1410), ft); }
      bd.rigid(new THREE.BoxGeometry(0.094, 0.018, 0.26, 2, 1, 4).translate(fx, 0.009, 0.05), shoe.clone().multiplyScalar(0.45), ft, 5);
      bd.rigid(new THREE.BoxGeometry(0.08, 0.02, 0.07).translate(fx, 0.02, -0.045), shoe.clone().multiplyScalar(0.5), ft, 5); }
    else if (fw === 'chinelo') { bareFoot();   // chinelo de dedo: sola colorida e a tira em V entre o dedão e o segundo dedo
      bd.rigid(new THREE.BoxGeometry(0.088, 0.013, 0.25 * FL, 2, 1, 4).translate(fx, 0.0065, 0.05 * FL), shoe, ft, 5); const T = V(fx - sx * 0.012, 0.022, 0.13);
      for (const s2 of [-1, 1]) bd.rigid(capsAB(T, V(fx + s2 * 0.038, 0.018, 0.045), 0.0045, 4), C(0xf2f2ee), ft); }
    else bareFoot();
  }
  // ---------- roupa: gola de camisa, carreira de botões, bolso no peito, cós com cinto e fivela, cós da saia
  // A roupa é vestida em cima do corpo: cada peça de pano é medida na superfície do tronco (surf) e afastada dela pela
  // espessura do pano, então assenta no ombro e no peito sem atravessar e sem flutuar.
  bd.setPart('roupa');
  const TR = torso.map(r => [r.y, r.rx, r.rzF, r.rzB, r.cz, r.e || 2]);
  const ringAt = y => { let i = 0; while (i < TR.length - 2 && TR[i + 1][0] < y) i++; const A = TR[i], Z = TR[i + 1], t = Math.max(0, Math.min(1, (y - A[0]) / (Z[0] - A[0]))); return A.map((v, j) => v + (Z[j] - v) * t); };
  const surfP = (y, a) => { const [, rx, rzF, rzB, cz, e] = ringAt(y), ca = Math.cos(a), sa = Math.sin(a);
    return V(rx * Math.sign(ca) * Math.abs(ca) ** (2 / e), y, cz + (sa > 0 ? rzF : rzB) * Math.sign(sa) * Math.abs(sa) ** (2 / e)); };
  const surfN = (y, a) => { const du = surfP(y, a + 0.01).sub(surfP(y, a - 0.01)), dv = surfP(y + 0.004, a).sub(surfP(y - 0.004, a)), n = V(0, 0, 0).crossVectors(dv, du).normalize();
    return n.x * Math.cos(a) + n.z * Math.sin(a) < 0 ? n.negate() : n; };
  const surf = (y, a, off = 0) => surfP(y, a).addScaledVector(surfN(y, a), off);
  const aX = (y, x) => { const [, rx, , , , e] = ringAt(y); return Math.PI / 2 - Math.sign(x) * Math.asin(Math.min(1, (Math.abs(x) / rx) ** (e / 2))); };   /* o ângulo do anel em que a frente passa por x */
  // os ossos do tronco naquele ponto (o pano anda junto com a pele), com o ombro sumindo aos poucos até o pescoço: no pano não
  // há o degrau de peso que a pele tem no anel do pescoço, senão a aba da gola esticaria quando o braço abre
  const wAt = p => { const base = W(p.y, 0.98, 1.2), ca = Math.cos(Math.atan2(p.z - ringAt(p.y)[4], p.x)), k = shK(Math.min(p.y, neckY - 1e-4)) * (1 - smooth01((p.y - 1.425) / 0.045));
    const w = k * smooth01((Math.abs(ca) - 0.45) / 0.5); return w <= 0 ? base : [[B.spine, 1 - w], [ca < 0 ? B.clL : B.clR, w]]; };
  // pano com espessura: F(u, v) dá o meio do pano; sai a face de fora (cor cO), a de dentro (cI) e a borda (cR).
  // fora(p) diz para onde é "fora" naquele ponto (a face de fora vira para lá)
  const shell = (F, nu, nv, th, cO, cI, cR, fora) => { const P = [], N = [], out = [], nr = [], uvs = [], cs = [], at = (i, j) => i * (nv + 1) + j;
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) P.push(F(i / nu, j / nv));
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const du = P[at(Math.min(nu, i + 1), j)].clone().sub(P[at(Math.max(0, i - 1), j)]), dv = P[at(i, Math.min(nv, j + 1))].clone().sub(P[at(i, Math.max(0, j - 1))]);
      const n = V(0, 0, 0).crossVectors(du, dv).normalize(); if (n.dot(fora(P[at(i, j)])) < 0) n.negate(); N.push(n); }
    const tri = (A, Bv, Cv, col) => { const e1 = Bv[0].clone().sub(A[0]), e2 = Cv[0].clone().sub(A[0]), s3 = A[1].clone().add(Bv[1]).add(Cv[1]);
      if (V(0, 0, 0).crossVectors(e1, e2).dot(s3) < 0) [Bv, Cv] = [Cv, Bv];
      for (const [q, n] of [A, Bv, Cv]) { out.push(q.x, q.y, q.z); nr.push(n.x, n.y, n.z); uvs.push((q.x + q.z) * 4.5, q.y * 4.5); const c = typeof col === 'function' ? col(q) : col; cs.push(c.r, c.g, c.b); } };
    const side = (k, sg) => [P[k].clone().addScaledVector(N[k], sg * th / 2), sg > 0 ? N[k] : N[k].clone().negate()];
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const q = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)];
      for (const [sg, col] of [[1, cO], [-1, cI]]) { const [a, b, c, d] = q.map(k => side(k, sg)); tri(a, b, c, col); tri(a, c, d, col); } }
    // a borda (o corte do pano): normal no plano do pano, para fora da peça
    const rim = []; for (let i = 0; i < nu; i++) rim.push([at(i, 0), at(i + 1, 0), at(i, 1)]); for (let j = 0; j < nv; j++) rim.push([at(nu, j), at(nu, j + 1), at(nu - 1, j)]);
    for (let i = nu; i > 0; i--) rim.push([at(i, nv), at(i - 1, nv), at(i, nv - 1)]); for (let j = nv; j > 0; j--) rim.push([at(0, j), at(0, j - 1), at(1, j)]);
    for (const [a, b, inn] of rim) { const e = P[b].clone().sub(P[a]), n = V(0, 0, 0).crossVectors(e, N[a]).normalize(); if (n.dot(P[a].clone().sub(P[inn])) < 0) n.negate();
      const A1 = side(a, 1)[0], A2 = side(a, -1)[0], B1 = side(b, 1)[0], B2 = side(b, -1)[0]; tri([A1, n], [B1, n], [B2, n], cR); tri([A1, n], [B2, n], [A2, n], cR); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nr, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(cs, 3)); return g; };
  const radial = p => V(p.x, 0, p.z - ringAt(p.y)[4]).normalize();
  const tint = (k, c = top) => c.clone().multiplyScalar(k);
  const camisa = !s.dress && !kid && s.sleeves !== 'nenhuma' && s.shirt !== 'camiseta' && !jacket && !shawl;
  if (camisa) {
    const sF = f ? 0.92 : 1, front = a => Math.max(0, Math.sin(a));
    // o pé da gola: uma tira em pé em volta do pescoço, aberta na frente (o primeiro botão solto), que nasce de dentro da camisa
    const dS = 0.36, aS = u => Math.PI / 2 + dS + u * (Math.PI * 2 - 2 * dS), ySb = a => neckY - 0.012 - 0.006 * front(a), ySt = a => neckY + (f ? 0.026 : 0.03) - 0.008 * front(a);
    const stand = (u, v) => { const a = aS(u), yt = ySt(a), p = surf(yt, a, 0.0035 + 0.0012 * (1 - v)); p.y = ySb(a) + (yt - ySb(a)) * v; return p; };
    bd.rigid(shell(stand, 26, 2, 0.0025, tint(0.9), tint(0.72), tint(0.7), radial), C(0xffffff), B.spine, topPat);   /* o pé vai com o pescoço (a base fica dentro do tronco) */
    // a pele do peito no V da camisa aberta (por cima do tronco, com sombra no fundo do V)
    const yV = 1.398 - (f ? 0.008 : 0), hw = y => (f ? 0.03 : 0.034) * sF * Math.max(0, (y - yV) / (neckY - yV)) ** 0.85;
    const vee = (u, v) => { const y = yV + (neckY + 0.006 - yV) * v, x = (u * 2 - 1) * Math.max(0.0015, hw(y) + 0.006); return surf(y, aX(y, x), 0.0016); };
    bd.rigid(shell(vee, 6, 6, 0.0006, q => skin.clone().multiplyScalar(0.8 + 0.2 * Math.min(1, (q.y - yV) / 0.04)), skin, skin, p => surfN(p.y, Math.PI / 2)), C(0xffffff), wAt, 0);
    // a frente da camisa dobrada para trás nas bordas do V (o avesso do pano aparece) e a carcela com os botões
    for (const sx of [-1, 1]) { const edge = (u, v) => { const y = yV + (neckY - yV) * u, x = sx * (hw(y) + v * 0.016 - 0.001);
        return surf(y, aX(y, x), 0.0034 - 0.0012 * v); };
      bd.rigid(shell(edge, 6, 2, 0.0022, q => tint(0.86 + 0.08 * Math.min(1, Math.abs(q.x) / 0.04)), tint(0.7), tint(0.66), p => surfN(p.y, Math.PI / 2)), C(0xffffff), wAt, topPat); }
    const plk = (y0, y1) => (u, v) => { const y = y0 + (y1 - y0) * v, x = (u * 2 - 1) * 0.013; return surf(y, aX(y, x), 0.0022); };
    for (let y = shirtBottom + 0.02; y < yV + 0.004; y += 0.06) { const y1 = Math.min(yV + 0.006, y + 0.06);
      bd.rigid(shell(plk(y, y1), 2, 3, 0.0018, q => tint(Math.abs(q.x) > 0.011 ? 0.84 : 0.96), tint(0.8), tint(0.7), p => surfN(p.y, Math.PI / 2)), C(0xffffff), wAt, topPat); }
    // as abas da gola: dobram por cima do pé, caem sobre o ombro e terminam em ponta no peito
    const dF = 0.3, dE = f ? 0.24 : 0.2, aF = u => Math.PI / 2 + dF + u * (Math.PI * 2 - 2 * dF), aE = u => Math.PI / 2 + dE + u * (Math.PI * 2 - 2 * dE);
    const yE = u => { const a = aE(u), fr = front(a); return (f ? 1.437 : 1.442) - 0.006 * Math.max(0, -Math.sin(a)) - (f ? 0.032 : 0.04) * fr ** 6; };
    const leaf = (u, v) => { const a0 = aF(u), T = surf(ySt(a0) + 0.003, a0, 0.0075), a1 = aE(u), E = surf(yE(u), a1, 0.0042);
      const p = T.clone().lerp(E, v).addScaledVector(radial(T), 0.006 * Math.sin(Math.PI * v) * (1 - 0.6 * front(a0) ** 4)), am = a0 + (a1 - a0) * v, S = surf(p.y, am, 0.0042), cz = ringAt(p.y)[4];
      return Math.hypot(p.x, p.z - cz) < Math.hypot(S.x, S.z - cz) ? S : p; };
    bd.rigid(shell(leaf, 40, 5, 0.003, tint(0.97), tint(0.72), tint(0.68), p => radial(p).add(V(0, 0.6, 0)).normalize()), C(0xffffff), wAt, topPat);
    const btn = f ? C(0xf4efe6) : C(0xe8e0d0);
    for (let y = yV - 0.006; y > shirtBottom + 0.03; y -= 0.068) bd.rigid(new THREE.SphereGeometry(0.0055, 8, 5).scale(1, 1, 0.45).translate(...surf(y, Math.PI / 2, 0.0045).toArray()), btn, wAt);
    if (!f) { const px = 0.075 * bw, pk = (y0, y1, off, w = 0.031) => (u, v) => { const y = y0 + (y1 - y0) * v, x = px + (u * 2 - 1) * w; return surf(y, aX(y, x), off); };
      bd.rigid(shell(pk(1.255, 1.325, 0.0026), 4, 4, 0.002, tint(0.93), tint(0.8), tint(0.74), p => surfN(p.y, aX(p.y, p.x))), C(0xffffff), wAt, topPat);   /* bolso */
      bd.rigid(shell(pk(1.31, 1.328, 0.0048, 0.033), 4, 1, 0.002, tint(0.86), tint(0.76), tint(0.66), p => surfN(p.y, aX(p.y, p.x))), C(0xffffff), wAt, topPat); } }   /* aba do bolso */
  else {   // camiseta, vestido, blusa de criança, paletó e xale: a gola é uma ribana em volta do decote, que cobre a emenda da pele com o pano
    const cc = jacket || shawl || top, dip = (s.dress || f) && !jacket ? 0.022 : 0.008, yb = a => neckY - 0.004 - dip * Math.max(0, Math.sin(a)) ** 3;
    const rib = (u, v) => { const a = Math.PI / 2 + u * Math.PI * 2, y = yb(a) - 0.012 + 0.015 * v; return surf(y, a, 0.0028 + 0.001 * Math.sin(Math.PI * v)); };
    bd.rigid(shell(rib, 36, 2, 0.002, tint(0.86, cc), tint(0.7, cc), tint(0.66, cc), radial), C(0xffffff), wAt, jacket || shawl ? 3 : topPat);
    if (dip > 0.01) { const vee = (u, v) => { const a = Math.PI / 2 + (u * 2 - 1) * 0.5, y = yb(a) + (neckY + 0.004 - yb(a)) * v; return surf(y, a, 0.0012); };   /* a pele que o decote mostra */
      bd.rigid(shell(vee, 8, 3, 0.0006, q => skin.clone().multiplyScalar(0.9 + 0.1 * Math.min(1, (q.y - neckY + 0.02) / 0.02)), skin, skin, p => surfN(p.y, Math.PI / 2)), C(0xffffff), wAt, 0); } }
  if (!s.skirt && !kid) {   // cinto de couro que acompanha o quadril (atrás ele passa por cima do glúteo, não some dentro), com passadores e fivela
    // o alto da coxa (o trocânter) sai do tronco dos lados: o cinto passa por fora dele também
    const legR = y => { const t = Math.max(0, Math.min(1, (0.98 - y) / 0.08)), r = ((f ? 0.092 : 0.088) * (1 - t) + (f ? 0.09 : 0.087) * t + 0.01) * (f ? 1.02 : 1) * (0.92 + 0.08 * bw); return { r, cz: -0.002 * t }; };
    const LXb = (f ? 0.09 : 0.086) * bw, outLeg = (p, off) => { const { r, cz } = legR(p.y), d = radial(p);
      for (let k = 0; k < 50; k++) { let inside = false; for (const sx of [-1, 1]) { const cx = sx * LXb * (1 - (0.98 - p.y) * 0.12), dx = (p.x - cx) / (r + off), dz = (p.z - cz) / ((p.z > cz ? 1.05 : 1.08) * r + off); if (dx * dx + dz * dz < 1) inside = true; }
        if (!inside) break; p.addScaledVector(d, 0.001); } return p; };
    const brown = C(0x3a2418), belt = (u, v) => outLeg(surf(0.947 + 0.037 * v, Math.PI / 2 + u * Math.PI * 2, 0.0045), 0.0045);
    bd.rigid(shell(belt, 36, 2, 0.003, q => brown.clone().multiplyScalar(0.9 + 0.2 * Math.min(1, Math.abs(q.y - 0.965) < 0.016 ? 1 : 0.4)), brown.clone().multiplyScalar(0.6), brown.clone().multiplyScalar(0.55), radial), C(0xffffff), B.hips, 5);
    for (const a of [0.35, 1.0, 1.95, 2.6, 2.1 + Math.PI, 1.0 + Math.PI * 1.5]) { const pl = (u, v) => outLeg(surf(0.94 + 0.05 * v, a + (u - 0.5) * 0.05, 0.0072), 0.0072); bd.rigid(shell(pl, 1, 2, 0.002, bot.clone().multiplyScalar(0.8), bot.clone().multiplyScalar(0.6), bot.clone().multiplyScalar(0.6), radial), C(0xffffff), B.hips, botPat); }
    const bk = surf(0.965, Math.PI / 2, 0.0095); bd.rigid(new THREE.BoxGeometry(0.05, 0.04, 0.006).translate(bk.x, bk.y, bk.z), C(0xc8b070), B.hips); bd.rigid(new THREE.BoxGeometry(0.03, 0.022, 0.008).translate(bk.x, bk.y, bk.z + 0.001), C(0x3a2418), B.hips); }
  if (s.skirt) { const band = new THREE.CylinderGeometry(1, 1.02, 0.03, 22, 1, true).scale(0.158 * bw + 0.004, 1, 0.108 * bw + 0.004).translate(0, 1.0, 0.002); bd.rigid(band, (dressTop ? top : bot).clone().multiplyScalar(0.9), B.hips, dressTop ? topPat : botPat); }
  // ---------- cabeça (as peças são feitas em volta do osso da cabeça e levadas para a altura dele na pose de descanso)
  const HY = 1.47, hd = { rigid: (g, c, b, pt) => bd.rigid(g.translate(0, HY, 0), c, b, pt), setPart: bd.setPart }; bd.setPart('cabeça');
  const eyesAt = [-1, 1].map(sx => V(sx * 0.384, 0.06, 0.921).normalize());
  { const hg = new THREE.SphereGeometry(1, 30, 22), p = hg.attributes.position, cols = new Float32Array(p.count * 3), red = C(0xc8524a), stub = hairC.clone().lerp(skin, 0.35);
    const blush = f || kid ? 0.2 : 0.12, stubble = !f && !kid && !s.beard ? 0.22 : 0;
    for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const u = V(x, y, z);
      const low = Math.max(0, -y), front = Math.max(0, z);
      x *= 1 - low * low * 0.45; z *= 1 - low * 0.1; z += low * front * 0.1;                              // mandíbula estreitando, queixo para a frente
      if (z < 0 && y < 0) z *= 1 - low * 0.22;                                                             // nuca entra no pescoço
      if (z < 0 && y > 0) z *= 1.06;                                                                       // occipital
      if (z > 0.3 && y > 0.3) z *= 1 - (y - 0.3) * 0.1;                                                    // testa mais reta
      x *= 1 + 0.06 * G(y + 0.05, 0.22) * G(Math.abs(u.x) - 0.62, 0.22) * front;                         // maçã do rosto
      let r = 1; for (const e of eyesAt) { const d = u.distanceTo(e); r -= 0.075 * G(d, 0.2); }           // órbita dos olhos
      for (const e of eyesAt) r += 0.03 * G(u.distanceTo(V(e.x, 0.25, 0.9).normalize()), 0.14);           // arco da sobrancelha
      p.setXYZ(i, x * r * 0.086, y * r * 0.118, z * r * 0.1);
      const c = skin.clone();
      c.lerp(red, blush * G(Math.abs(u.x) - 0.52, 0.2) * G(u.y + 0.12, 0.18) * front);                   // bochecha corada
      if (stubble) c.lerp(stub, stubble * (1 - Math.min(1, Math.max(0, (u.y + 0.15) / 0.12))) * Math.min(1, Math.max(0, z + 0.2) * 2) * (1 - G(u.x, 0.12) * G(u.y + 0.45, 0.08)));   // barba por fazer
      if (u.y < -0.6) c.multiplyScalar(1 - (-0.6 - u.y) * 0.25);                                          // sombra embaixo do queixo
      cols.set([c.r, c.g, c.b], i * 3); }
    hg.setAttribute('color', new THREE.BufferAttribute(cols, 3)); hg.translate(0, 0.115, 0.012); hd.rigid(hg, skin, B.head); }
  // olhos: branco, íris, pupila e brilho (as pálpebras de cima são peças soltas, para piscar)
  bd.setPart('olho');
  const iris = C(s.eyes || 0x4a2a14);
  for (const sx of [-1, 1]) { bd.setPart('olho'); const ex = sx * 0.032, ey = 0.122, ez = 0.0862, er = 0.0112;
    hd.rigid(new THREE.SphereGeometry(er, 12, 10).scale(1, 0.92, 1).translate(ex, ey, ez), C(0xefe9e0), B.head);
    hd.rigid(new THREE.SphereGeometry(0.0066, 12, 8).scale(1, 1, 0.4).translate(ex, ey - 0.0004, ez + er - 0.0006), iris, B.head);
    hd.rigid(new THREE.SphereGeometry(0.0033, 8, 6).scale(1, 1, 0.35).translate(ex, ey - 0.0004, ez + er + 0.0002), C(0x0e0a08), B.head);
    hd.rigid(new THREE.SphereGeometry(0.0012, 6, 4).translate(ex + 0.0022, ey + 0.0024, ez + er + 0.0006), C(0xffffff), B.head);
    // sobrancelha arqueada
    bd.setPart('sobrancelha');
    const bc = new THREE.CatmullRomCurve3([V(sx * 0.012, 0.139, 0.109), V(sx * 0.032, 0.1458, 0.108), V(sx * 0.052, 0.1405, 0.099)]);
    hd.rigid(new THREE.TubeGeometry(bc, 6, f ? 0.0024 : 0.0034, 4, false), hairC.clone().multiplyScalar(0.85), B.head, 2);
    // orelha com lóbulo e a dobra de dentro
    bd.setPart('orelha');
    const ear = new THREE.SphereGeometry(1, 10, 8); ear.scale(0.011, 0.026, 0.018).rotateY(sx * 0.35).translate(sx * 0.087, 0.112, -0.004); hd.rigid(ear, skin.clone().multiplyScalar(0.96), B.head);
    hd.rigid(new THREE.SphereGeometry(0.0075, 8, 6).translate(sx * 0.088, 0.088, 0.0), skin.clone().multiplyScalar(0.97), B.head);
    hd.rigid(new THREE.SphereGeometry(1, 8, 6).scale(0.004, 0.014, 0.009).translate(sx * 0.0955, 0.114, -0.002), skin.clone().multiplyScalar(0.78), B.head); }
  // nariz: ponte, ponta e as duas asas
  bd.setPart('nariz');
  const nose = skin.clone().lerp(C(0xc86a5a), 0.08);
  hd.rigid(new THREE.SphereGeometry(1, 10, 8).scale(0.0085, 0.024, 0.011).rotateX(-0.28).translate(0, 0.108, 0.106), nose, B.head);
  hd.rigid(new THREE.SphereGeometry(1, 10, 8).scale(0.0125, 0.0105, 0.011).translate(0, 0.091, 0.115), nose, B.head);
  for (const sx of [-1, 1]) hd.rigid(new THREE.SphereGeometry(1, 8, 6).scale(0.0075, 0.0068, 0.0075).translate(sx * 0.0115, 0.089, 0.109), nose.clone().multiplyScalar(0.97), B.head);
  // boca: lábio de cima, de baixo e a linha entre eles
  bd.setPart('boca');
  const lip = skin.clone().lerp(C(0x9a3a32), f ? 0.5 : 0.32);
  hd.rigid(new THREE.SphereGeometry(1, 12, 6).scale(0.019, 0.0045, 0.005).translate(0, 0.0682, 0.1035), lip, B.head);
  hd.rigid(new THREE.SphereGeometry(1, 12, 6).scale(0.016, 0.0055, 0.0055).translate(0, 0.0608, 0.1015), lip.clone().multiplyScalar(1.05), B.head);
  hd.rigid(new THREE.BoxGeometry(0.028, 0.0014, 0.003).translate(0, 0.0646, 0.1058), lip.clone().multiplyScalar(0.5), B.head);
  bd.setPart('barba');
  if (s.beard === 'bigode') for (const sx of [-1, 1]) hd.rigid(new THREE.SphereGeometry(1, 10, 6).scale(0.019, 0.0065, 0.008).rotateZ(sx * -0.28).translate(sx * 0.013, 0.0745, 0.1075), hairC, B.head, 2);
  if (s.beard === 'barba') { const bg = new THREE.SphereGeometry(1, 18, 12, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), p = bg.attributes.position;
    for (let i = 0; i < p.count; i++) { const z = p.getZ(i); if (z < -0.2) p.setZ(i, z * 0.6); } bg.scale(0.08, 0.075, 0.08).translate(0, 0.088, 0.03); hd.rigid(bg, hairC, B.head, 2);
    for (const sx of [-1, 1]) hd.rigid(new THREE.SphereGeometry(1, 10, 6).scale(0.019, 0.0065, 0.008).rotateZ(sx * -0.28).translate(sx * 0.013, 0.0745, 0.1075), hairC, B.head, 2); }
  bd.setPart('cabelo'); const swing = hair(hd, s, B.head);
  const geo = bd.build();
  // ---------- esqueleto (posição de descanso: em pé, braços caídos)
  const bone = (parent, x, y, z) => { const b = new THREE.Bone(); b.position.set(x, y, z); if (parent) parent.add(b); return b; };
  const hips = bone(null, 0, 0.95, 0), spine = bone(hips, 0, 0.05, 0), head = bone(spine, 0, 0.47, 0);
  // a clavícula: no mesmo ponto do ombro, gira uma fração do que o braço gira (people.js copia a cada quadro); a pele do ombro vai com ela
  const arms = [-1, 1].map(sx => { const sh = bone(spine, sx * (shX + 0.002), 0.41, 0), el = bone(sh, sx * 0.02, -0.29 - AD, 0), ha = bone(el, sx * 0.018, -0.26, 0), cl = bone(spine, sx * (shX + 0.002), 0.41, 0), ec = bone(sh, sx * 0.02, -0.29 - AD, 0); return { sh, el, ha, cl, ec }; });
  const legs = [-1, 1].map(sx => { const hp = bone(hips, sx * LX * bw, -0.05, 0), kn = bone(hp, sx * -0.005, -0.41, 0), ft = bone(kn, 0, -0.43, 0), jc = bone(hp, sx * -0.005, -0.41, 0); return { hp, kn, ft, jc }; });
  const bones = [hips, spine, head, arms[0].sh, arms[0].el, arms[0].ha, arms[1].sh, arms[1].el, arms[1].ha, legs[0].hp, legs[0].kn, legs[0].ft, legs[1].hp, legs[1].kn, legs[1].ft, arms[0].cl, arms[1].cl, arms[0].ec, arms[1].ec, legs[0].jc, legs[1].jc];
  const mesh = new THREE.SkinnedMesh(geo, bodyMaterial(s.top.tex || null)); mesh.add(hips); mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones)); mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
  // pálpebras de cima (piscam): meia casca da cor da pele com a linha dos cílios na borda, presas no osso da cabeça
  const lidMat = toon({ color: skin }), lashMat = toon({ color: 0x1a120c }), lids = [];
  for (const sx of [-1, 1]) { const g = new THREE.Group(); g.position.set(sx * 0.032, 0.122, 0.0862); head.add(g);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.0122, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), lidMat), lash = new THREE.Mesh(new THREE.TorusGeometry(0.0122, 0.001, 3, 18, Math.PI).rotateX(Math.PI / 2), lashMat);
    g.add(lid, lash); lid.userData.noRegua = lash.userData.noRegua = true; g.userData.open = s.old ? -0.35 : -0.6; g.rotation.x = g.userData.open; lids.push(g); }
  for (const sw of swing) { head.add(sw.pivot); sw.pivot.traverse(o => { o.userData.noRegua = true; }); }
  // a cabeça um tico maior que a anatomia (8% no adulto, 22% na criança): de longe, na câmera do jogo, o rosto e o chapéu leem
  head.scale.setScalar(kid ? 1.2 : 1.03);
  // o perfil do quadril (para o pano da saia não entrar no corpo): [y, meia-largura, frente, costas, deslocamento]
  const hipProf = tor.filter(r => r[0] >= 0.78 && r[0] <= 1.08).map(([y, rx, rzF, rzB, cz]) => [y, rx * bw, rzF * bw, rzB * bw, cz * bw]);
  mesh.userData.hipProf = hipProf; mesh.userData.segs = { tronco: SEG.tronco, 'braço': SEG.braco, coxa: SEG.perna };   // para o juiz (juizgente.js)
  return { mesh, hips, spine, head, arms, legs, lids, swing, waistY: s.dress ? 1.0 : 0.97, bw, hipProf };
}

// ---------- cabelo: um volume que acompanha o crânio, com linha do cabelo de verdade (testa, entradas, acima da orelha,
// nuca). Abaixo da linha o volume entra para dentro da cabeça e some, então a borda fica limpa, sem "capacete".
// Cada penteado soma o seu volume (topete, risca do lado, franja, afro com cachos, coque, cabelo comprido sobre as costas,
// mechas na frente das orelhas) e o rabo de cavalo e a trança são peças soltas que balançam com o andar.
const SKULL = { rx: 0.086, ry: 0.118, rz: 0.1, cy: 0.115, cz: 0.012 };
function hairShell({ t = 0.012, front = 0.42, side = 0.22, back = -0.6, curl = 0, crown = 0.006, seg = 32, noTop = false, quiff = 0, part = 0, fringe = 0 } = {}) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75)), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const f = Math.abs(Math.atan2(x, z)) / Math.PI;   // 0 = frente, 1 = nuca
    let lim = f < 0.12 ? front : f < 0.32 ? front + (side - front) * smooth01((f - 0.12) / 0.2) : f < 0.62 ? side : side + (back - side) * smooth01((f - 0.62) / 0.3);
    if (fringe && z > 0) lim -= fringe * G(x - 0.25, 0.35);   // franja caindo de um lado da testa
    let k = smooth01((y - lim) / 0.12);
    if (noTop) k *= 1 - smooth01((y - 0.55) / 0.12);
    const n = curl ? (vn3(x * 7, y * 7, z * 7) - 0.5) * curl * 2 + (vn3(x * 15 + 3, y * 15, z * 15) - 0.5) * curl : (vn3(x * 9, y * 3, z * 9) - 0.5) * 0.004;
    let vol = t + crown * Math.max(0, y) + n + quiff * G(y - 0.7, 0.28) * Math.max(0, z + 0.2);
    if (part) vol -= 0.005 * G(x - part, 0.05) * smooth01((y - 0.3) / 0.2) * (z > -0.3 ? 1 : 0);
    vol = vol * k - 0.05 * (1 - k);   // fora da área do cabelo a casca afunda bem para dentro do crânio (o rosto é esculpido para dentro na mandíbula e na bochecha)
    p.setXYZ(i, x * (SKULL.rx + vol), y * (SKULL.ry + vol * 0.9) + SKULL.cy, z * (SKULL.rz + vol) + SKULL.cz); }
  g.computeVertexNormals(); return g;
}
const smooth01 = v => { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); };
function vn3(x, y, z) { const h = (a, b, c) => { let n = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return n - Math.floor(n); };
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), fx = x - i, fy = y - j, fz = z - k, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t;
  return L(L(L(h(i, j, k), h(i + 1, j, k), u), L(h(i, j + 1, k), h(i + 1, j + 1, k), u), v), L(L(h(i, j, k + 1), h(i + 1, j, k + 1), u), L(h(i, j + 1, k + 1), h(i + 1, j + 1, k + 1), u), v), w); }
function hair(bd, s, hb) {
  const capped = ['palha', 'couro', 'bone'].includes(s.hat), scarf = s.hat === 'lenco';   // de chapéu o cabelo fica amassado por baixo
  // e nunca atravessa o chapéu: acima da aba, cada ponto do cabelo é puxado para dentro da copa (raio da copa naquela altura)
  const crown = { palha: [0.2, 0.3, y => 0.1 - (y - 0.2) * 0.19], couro: [0.2, 0.28, y => 0.1 * Math.sqrt(Math.max(0, 1 - ((y - 0.2) / 0.085) ** 2))], bone: [0.16, 0.235, y => 0.1 * Math.sqrt(Math.max(0, 1 - ((y - 0.16) / 0.075) ** 2))] }[s.hat];
  const fit = g => { if (!crown) return g; const [y0, y1, r] = crown, p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { let y = p.getY(i); if (y < y0 - 0.01) continue; y = Math.min(y, y1 - 0.008); const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z), m = Math.max(0.005, r(y) - 0.006);
      p.setY(i, y); if (d > m) { p.setX(i, x * m / d); p.setZ(i, z * m / d); } } return g; };
  const hc = C(s.hairColor), H = (g, c = hc) => bd.rigid(fit(g), c, hb, 2), h = s.hair, kid = s.sex === 'c', swing = [];
  // peça que balança: pivô no ponto de amarrar, a peça pendurada para baixo (desenhada com o mesmo material do corpo)
  const pend = (at, geos) => { const b2 = Builder(); for (const [g, c, pt] of geos) b2.rigid(g, c, 0, pt); const m = new THREE.Mesh(b2.build(), bodyMaterial(null)); m.castShadow = true;
    const pivot = new THREE.Group(); pivot.position.copy(at); pivot.add(m); swing.push({ pivot, a: 0, v: 0, b: 0, vb: 0 }); };
  if (h === 'curto') H(hairShell({ t: capped ? 0.011 : kid ? 0.016 : 0.014, front: kid ? 0.32 : 0.4, side: 0.24, back: -0.62, crown: 0.012, quiff: kid ? 0.006 : 0.012, part: 0.32, fringe: kid ? 0.12 : 0 }));
  if (h === 'careca') H(hairShell({ t: 0.008, front: 0.5, side: 0.2, back: -0.55, noTop: true }));
  if (h === 'crespo') H(hairShell({ t: capped || scarf ? 0.012 : kid ? 0.03 : 0.042, front: 0.34, side: 0.14, back: -0.64, curl: capped ? 0.006 : 0.015, crown: capped ? 0.004 : 0.022, seg: 38 }));
  if (h === 'coque' || h === 'tranca' || h === 'longo' || h === 'chiquinha' || h === 'rabo') H(hairShell({ t: scarf ? 0.007 : 0.013, front: 0.38, side: 0.16, back: -0.68, crown: 0.006, part: h === 'longo' ? 0.0 : 0 }));
  const back = (y, z) => [0, SKULL.cy + y, SKULL.cz + z];
  if (h === 'coque' && !scarf) { const b = new THREE.SphereGeometry(1, 16, 12); const p = b.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + (vn3(p.getX(i) * 4, p.getY(i) * 4, p.getZ(i) * 4) - 0.5) * 0.25; p.setXYZ(i, p.getX(i) * 0.05 * k, p.getY(i) * 0.044 * k, p.getZ(i) * 0.05 * k); }
    b.translate(...back(0.07, -0.105)); H(b); H(new THREE.TorusGeometry(0.038, 0.012, 6, 16).rotateX(0.9).translate(...back(0.062, -0.1))); }
  if (h === 'longo') {   // cai da nuca sobre as costas, abrindo um pouco, com a ponta desigual; mechas na frente das orelhas
    const sh = new THREE.CylinderGeometry(1, 1, 0.3, 26, 10, true, Math.PI * 0.5, Math.PI), p = sh.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), t = (0.15 - y) / 0.3, a = Math.atan2(x, z), fl = 1 + 0.28 * t, wav = Math.sin(a * 11) * 0.03 * t;
      p.setXYZ(i, x * 0.099 * fl * (1 + wav), y - (t > 0.97 ? (vn3(a * 4, 1, 2) - 0.5) * 0.06 : 0), z * 0.108 * fl * (1 + wav)); }
    sh.translate(0, SKULL.cy - 0.13, SKULL.cz - 0.004); sh.computeVertexNormals(); H(sh);
    if (bd.setPart) bd.setPart('mecha'); for (const sx of [-1, 1]) H(capsAB(V(sx * 0.088, SKULL.cy - 0.0, SKULL.cz + 0.025), V(sx * 0.1, SKULL.cy - 0.19, SKULL.cz + 0.01), 0.019).scale(1, 1, 1)); if (bd.setPart) bd.setPart('cabelo'); }
  if (h === 'rabo') { const lat = new THREE.LatheGeometry([[0.0, 0.0], [0.018, -0.005], [0.026, -0.05], [0.028, -0.1], [0.022, -0.17], [0.012, -0.23], [0.002, -0.26]].map(([r, y]) => new THREE.Vector2(r, y)), 12), p = lat.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, p.getZ(i) - 0.35 * y * y); }
    pend(V(0, SKULL.cy + 0.03, SKULL.cz - 0.105), [[lat, hc, 2], [new THREE.TorusGeometry(0.017, 0.006, 5, 10).rotateX(Math.PI / 2).translate(0, -0.004, 0), C(0xc83a2a), 0]]); }
  if (h === 'tranca') { const geos = []; let y = 0; for (let k = 0; k < 8; k++) { const sx = (k % 2 ? 1 : -1) * 0.006, r = 0.022 - k * 0.0013; geos.push([new THREE.SphereGeometry(1, 10, 8).scale(r, 0.028, r * 0.9).rotateZ(sx * 25).translate(sx, y - 0.02, 0), hc, 2]); y -= 0.036; }
    geos.push([new THREE.TorusGeometry(0.012, 0.005, 5, 10).rotateX(Math.PI / 2).translate(0, y, 0), C(0xc83a2a), 0], [new THREE.ConeGeometry(0.016, 0.05, 8).rotateX(Math.PI).translate(0, y - 0.025, 0), hc, 2]);
    pend(V(0, SKULL.cy - 0.03, SKULL.cz - 0.1), geos); }
  if (h === 'chiquinha') for (const sx of [-1, 1]) { const b = new THREE.SphereGeometry(1, 12, 10); b.scale(0.04, 0.05, 0.04).translate(sx * 0.095, SKULL.cy + 0.04, SKULL.cz - 0.06); H(b);
    H(new THREE.TorusGeometry(0.014, 0.005, 5, 10).rotateY(Math.PI / 2).translate(sx * 0.082, SKULL.cy + 0.05, SKULL.cz - 0.05), C(0xf2c21a)); }
  const hat = s.hat; if (bd.setPart) bd.setPart(hat === 'lenco' ? 'lenço' : 'chapéu');
  if (hat === 'palha') { const br = new THREE.CylinderGeometry(0.205, 0.215, 0.012, 28); const p = br.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z); p.setY(i, p.getY(i) - Math.max(0, r - 0.12) * 0.22 + Math.max(0, Math.abs(x) / 0.21 - 0.6) * 0.03); }
    bd.rigid(br.translate(0, 0.2, 0), C(0xe2cf8a), hb, 4); const cr = new THREE.CylinderGeometry(0.08, 0.1, 0.105, 18), q = cr.attributes.position; for (let i = 0; i < q.count; i++) if (q.getY(i) > 0.04) q.setY(i, q.getY(i) - Math.max(0, 0.04 - Math.abs(q.getX(i))) * 0.4);
    bd.rigid(cr.translate(0, 0.252, 0), C(0xe6d494), hb, 4); bd.rigid(new THREE.CylinderGeometry(0.101, 0.101, 0.022, 18, 1, true).translate(0, 0.215, 0), C(0x8a3a2a), hb); }
  if (hat === 'couro') { const br = new THREE.CylinderGeometry(0.18, 0.18, 0.016, 24), p = br.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z) / 0.18; p.setY(i, p.getY(i) + Math.max(0, Math.abs(x) / 0.18 - 0.45) * 0.08 * r - Math.max(0, Math.abs(z) / 0.18 - 0.5) * 0.02); }
    bd.rigid(br.translate(0, 0.205, 0), C(0x7a4a2a), hb, 5); bd.rigid(new THREE.SphereGeometry(0.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.85, 1.08).translate(0, 0.2, 0), C(0x6a3a22), hb, 5);
    bd.rigid(new THREE.TorusGeometry(0.1, 0.008, 4, 16).rotateX(Math.PI / 2).translate(0, 0.21, 0), C(0x3a2014), hb); }
  if (hat === 'bone') { bd.rigid(new THREE.SphereGeometry(0.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.75, 1.05).translate(0, 0.16, 0.005), C(s.hatColor || 0x2f6aa0), hb, 3);
    bd.rigid(new THREE.CylinderGeometry(0.075, 0.075, 0.01, 12, 1, false, -Math.PI / 2, Math.PI).scale(1, 1, 1.1).translate(0, 0.165, 0.085), C(s.hatColor || 0x2f6aa0), hb, 3); }
  if (hat === 'lenco') { const lc = C(s.lencoColor || 0xc83a2a), g = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, y + (vn3(p.getX(i) * 6, y * 6, p.getZ(i) * 6) - 0.5) * 0.04); }   // pano com dobras
    g.scale(0.108, 0.138, 0.124).rotateX(-0.75).translate(0, SKULL.cy + 0.004, SKULL.cz - 0.006); bd.rigid(g, lc, hb, 3);   // a borda da frente na linha do cabelo, atrás desce até a nuca
    bd.rigid(new THREE.SphereGeometry(1, 10, 8).scale(0.024, 0.02, 0.018).translate(0, SKULL.cy - 0.055, SKULL.cz - 0.112), lc.clone().multiplyScalar(0.9), hb, 3);   // nó
    for (const sx of [-1, 1]) bd.rigid(new THREE.SphereGeometry(1, 8, 6).scale(0.016, 0.045, 0.006).rotateZ(sx * 0.35).translate(sx * 0.016, SKULL.cy - 0.1, SKULL.cz - 0.118), lc.clone().multiplyScalar(0.95), hb, 3); }
  return swing;
}

// ---------- pano (saia, avental): cordas de pontos penduradas na cintura, com gravidade, vento, atrito e choque com as pernas
export function Cloth({ strips = 22, rows = 8, len = 0.6, r0x = 0.17, r0z = 0.12, flare = 0.12, arc = [0, Math.PI * 2], drop = 0, tex = null, color = 0xffffff, margin = 0.012, minK = 0.55, hip = null }) {
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
  const tmp = new THREE.Vector3(), M = new THREE.Matrix4(), HI = new THREE.Matrix4(), lp = new THREE.Vector3();
  // o quadril é uma pilha de elipses (o perfil do tronco do corpo): o ponto do pano que entra é empurrado para fora, no
  // espaço do quadril (vale com ela andando, sentando ou se abaixando)
  const hipAt = y => { if (!hip || y < hip[0][0] || y > hip[hip.length - 1][0]) return null; let i = 0; while (i < hip.length - 2 && hip[i + 1][0] < y) i++; const a = hip[i], b = hip[i + 1], u = (y - a[0]) / (b[0] - a[0] || 1);
    return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, a[3] + (b[3] - a[3]) * u, a[4] + (b[4] - a[4]) * u]; };
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
    if (hip) HI.copy(hipsWorld).invert();
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
        if (hip) { lp.set(P[i], P[i + 1], P[i + 2]).applyMatrix4(HI); const hr = hipAt(lp.y + 0.95);
          if (hr) { const mg = margin * 0.8, rx = hr[0] + mg, rz = (lp.z - hr[3] > 0 ? hr[1] : hr[2]) + mg, zz = lp.z - hr[3], e2 = (lp.x / rx) ** 2 + (zz / rz) ** 2;
            if (e2 < 1 && e2 > 1e-6) { const f2 = 1 / Math.sqrt(e2); lp.x *= f2; lp.z = hr[3] + zz * f2; lp.applyMatrix4(hipsWorld); P[i] = lp.x; P[i + 1] = lp.y; P[i + 2] = lp.z; } } }
        const gy = groundY(P[i], P[i + 2]) + 0.01; if (P[i + 1] < gy) P[i + 1] = gy;
      } }
    pos.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
  }
  return { mesh, step, reset: () => { ready = false; hasLast = false; } };
}
export { B as BONES };
