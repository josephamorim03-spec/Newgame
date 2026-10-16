// Os moradores do vale. Ninguém recebe ordem (o jogo é de encaixar peças); cada um tem seu ofício e sua rotina:
// capina e colhe na lavoura, varre o terreiro, tira água do poço girando o sarilho e leva a lata na cabeça, conversa,
// descansa no banco da varanda, lava roupa na pedra do córrego (esfrega, bate, enxágua, torce) e estende no varal, pesca
// na vereda, lida com o gado, traz lenha da mata, racha lenha no toco, ensina as letras às crianças na esteira, reza no
// cruzeiro e entra na capela; na Ave-Maria o sino toca e o povo vai à capela. As crianças brincam de pega-pega e de bola,
// tropeçam, caem, choram um pouco e levantam; quem está perto olha.
// Ao escurecer e na chuva forte vão para casa (fica o da varanda, com o lampião aceso; a roupa sai do varal).
// No meio do ofício param um pouco (espreguiçam com a mão nas costas, bebem água, enxugam a testa, olham em volta), acenam
// para quem passa andando perto. Os velhos andam mais devagar e curvados; o passo tem quadril que gira, ombro que responde e
// pé que rola. No jogo v5, cada vila atendida recebe gente nova (arrive): chega a pé de fora do vale até a casa nova e vive
// ali, entre a casa, a roça, a beira do rio e a vizinhança.
// Corpo articulado (quadril, coluna, cabeça, ombro, cotovelo, coxa, joelho) em tamanho real, com variações de altura,
// porte, cor de pele, cabelo e roupa (camisa lisa ou xadrez, camiseta, vestido de chita, blusa e saia, avental, calça de
// brim, chapéu de palha, chapéu de couro, boné, lenço).
import * as THREE from 'three';
import { U } from './mat.js';
import { mat, paint, merge, col } from './props.js';
import { tag } from './regua.js';
import { LAYOUT, TILES, heightAt, waterDist, waterLevelAt, inHex, SPRING, POOL_R, blocked } from './world.js';
import { chitaTexture, xadrezTexture, tramaTexture } from './textures.js';
import { buildBody, Cloth } from './body.js';

const rnd = (() => { let a = 31337; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();
const pick = a => a[Math.floor(rnd() * a.length)];
const SKIN = [0xf0c8a4, 0xdba57c, 0xc18456, 0x9a623e, 0x6e4430, 0x4e3022];
const HAIR = [0x16120e, 0x2a1c12, 0x4a2e1a, 0x6a4a2a];
const K = ['position', 'normal', 'uv', 'color'];
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const angTo = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

export function buildPeople(scene, { mobile = false, fx = null } = {}) {
  const T = tex => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(3, 2); return mat({ map: t, vertexColors: true }, { rim: '2.2', frag: 'diffuseColor.rgb*=mix(1.0,0.8,uWet);' }); };
  const MAT = { liso: mat({ vertexColors: true }, { rim: '2.2' }), trama: T(tramaTexture(53)),
    chita: ['#c8382a', '#2f6aa0', '#e0a020', '#3a8a4a', '#7a3a8a'].map((b, i) => T(chitaTexture(60 + i, b))),
    xadrez: [['#b83a2a', '#1e1a18', '#f0e8d8'], ['#2f5a9a', '#14202e', '#e8eef4'], ['#3a7a4a', '#1a2a1a', '#f0d070'], ['#8a5a2a', '#2a1a10', '#f0e0c0']].map(([a, b, c], i) => T(xadrezTexture(a, b, c, 70 + i))) };
  const people = [], updaters = [];
  const emit = (...a) => { if (fx) fx.emit(...a); };

  // ---------- sons curtos do lugar (machado no toco, sino da capela, bola), só depois do primeiro toque na tela
  function som(kind, x, z, vol = 1) { const ac = window.__audioCtx, cam = window.__cam; if (!ac || !cam) return; const d = Math.hypot(cam.position.x - x, cam.position.y, cam.position.z - z), g0 = vol * Math.min(1, 40 / (d + 10)) * 0.5; if (g0 < 0.01) return;
    const t0 = ac.currentTime, out = ac.createGain(); out.connect(ac.destination);
    if (kind === 'sino') { for (const [f, a, dec] of [[392, 0.5, 3.5], [784, 0.25, 2.2], [940, 0.18, 1.6], [1176, 0.1, 1.0], [196, 0.2, 4]]) { const o = ac.createOscillator(), gg = ac.createGain(); o.frequency.value = f; gg.gain.setValueAtTime(g0 * a, t0); gg.gain.exponentialRampToValueAtTime(0.0001, t0 + dec); o.connect(gg); gg.connect(out); o.start(t0); o.stop(t0 + dec); } return; }
    const n = ac.createBuffer(1, ac.sampleRate * 0.25, ac.sampleRate), d0 = n.getChannelData(0); for (let i = 0; i < d0.length; i++) d0[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * (kind === 'toc' ? 0.03 : 0.015)));
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(); src.buffer = n; f.type = 'lowpass'; f.frequency.value = kind === 'toc' ? 900 : 600; out.gain.value = g0 * (kind === 'toc' ? 1.4 : 0.8); src.connect(f); f.connect(out); src.start(t0); }

  // ---------- montar uma pessoa: corpo de malha única com esqueleto (body.js), saia e avental de pano, cabelo, chapéu e ferramenta
  const clothes = [];
  function person(s) {
    const g = new THREE.Group(), texOf = m => (m && m !== MAT.trama && m.map) ? m.map : null;
    g.rotation.order = 'YXZ';   // primeiro vira para onde vai, depois tomba para a frente (o tombo da criança)
    const spec = { ...s, top: { color: s.top.color, tex: texOf(s.top.mat) }, bottom: { color: s.bottom.color, tex: texOf(s.bottom.mat) },
      pants: s.sex === 'c' && !s.dress ? 'bermuda' : 'longa', beard: s.sex === 'm' ? (s.beard ?? pick(['bigode', null, null, 'barba', 'bigode'])) : null,
      lencoColor: pick([0xc83a2a, 0x2f6aa0, 0xe0a020, 0xf4efe6, 0x7a3a8a]) };
    const body = buildBody(spec); g.add(body.mesh);
    const warmGeo = s.sex === 'c' ? null : buildBody({ ...spec, warm: true, warmColor: s.sex === 'f' ? pick([0x8a4a3a, 0x6a5a8a, 0x4a6a5a, 0xa8743a]) : pick([0x5a4a3a, 0x3a4a5a, 0x6a6458]) }).mesh.geometry;
    const coolGeo = body.mesh.geometry;
    const { hips: pelvis, spine, head } = body, arms = body.arms.map(a => ({ sh: a.sh, el: a.el, ha: a.ha })), legs = body.legs.map(l => ({ hp: l.hp, kn: l.kn, ft: l.ft }));
    const lisoT = (geo, c) => { const m = new THREE.Mesh(geo, MAT.liso); paint(geo, col(c)); m.castShadow = true; m.userData.noRegua = true; return m; };
    // ferramenta na mão da ferramenta (arms[1]) e o que vai na outra mão ou no ombro
    const tool = new THREE.Group(); arms[1].ha.add(tool); tool.position.set(0, -0.05, 0.01);
    const T2 = (geo, c) => tool.add(lisoT(geo, c));
    if (s.tool === 'enxada') { T2(new THREE.CylinderGeometry(0.016, 0.016, 1.3, 6).rotateX(Math.PI / 2).translate(0, 0, 0.35), 0x9a7a52); T2(new THREE.BoxGeometry(0.2, 0.17, 0.012).translate(0, -0.08, 1.0), 0x6a6e72); }
    if (s.tool === 'machado') { T2(new THREE.CylinderGeometry(0.018, 0.02, 0.85, 6).rotateX(Math.PI / 2).translate(0, 0, 0.3), 0xa07a4a); T2(new THREE.BoxGeometry(0.035, 0.17, 0.12).translate(0, -0.06, 0.7), 0x5a5e62); T2(new THREE.BoxGeometry(0.012, 0.19, 0.03).translate(0, -0.06, 0.76), 0xb8bcc0); }
    if (s.tool === 'vassoura') { T2(new THREE.CylinderGeometry(0.013, 0.013, 1.25, 6).translate(0, -0.45, 0), 0xb08a5a); T2(new THREE.ConeGeometry(0.12, 0.28, 8).translate(0, -1.15, 0), 0x6a4a2a); }
    if (s.tool === 'vara') T2(new THREE.CylinderGeometry(0.007, 0.015, 2.6, 5).translate(0, 1.3, 0).rotateX(0.75), 0x8a7a4a);
    if (s.tool === 'balaio') T2(new THREE.CylinderGeometry(0.2, 0.15, 0.25, 14, 1, true).translate(0.18, -0.08, 0), 0xb08a52);
    if (s.tool === 'pano') { const c = pick([0xf4f0e8, 0xc8382a, 0x2f6aa0, 0xe0a020]); T2(new THREE.BoxGeometry(0.06, 0.32, 0.18).translate(0, -0.14, 0.03), c); }
    const extra = new THREE.Group(); extra.visible = !!s.extra;
    if (s.extra === 'lousa') { arms[0].ha.add(extra); extra.position.set(0, -0.08, 0.06); extra.add(lisoT(new THREE.BoxGeometry(0.34, 0.025, 0.25), 0x8a6a4a), lisoT(new THREE.BoxGeometry(0.3, 0.03, 0.21), 0x2a3430)); extra.rotation.x = -0.2; }
    if (s.extra === 'feixe') { spine.add(extra); extra.position.set(0.14, 0.43, -0.05); for (let i = 0; i < 9; i++) extra.add(lisoT(new THREE.CylinderGeometry(0.02 + (i % 3) * 0.006, 0.022, 1.3 + (i % 4) * 0.12, 5).rotateX(Math.PI / 2).translate(((i % 3) - 1) * 0.045, Math.floor(i / 3) * 0.04, (i % 2) * 0.1), 0x8a6a4a)); extra.rotation.y = 0.25; extra.visible = false; }
    tool.traverse(o => { o.userData.noRegua = true; }); extra.traverse(o => { o.userData.noRegua = true; });
    let lata = null; if (s.tool === 'lata') { lata = new THREE.Group(); head.add(lata); lata.position.set(0, 0.24, 0); lata.add(lisoT(new THREE.CylinderGeometry(0.13, 0.13, 0.32, 16).translate(0, 0.16, 0), 0xb8bcc0), lisoT(new THREE.TorusGeometry(0.09, 0.025, 6, 14).rotateX(Math.PI / 2), 0xe8e0d0)); }
    const cl = [];
    if (s.skirt) { const len = s.sex === 'c' ? 0.36 : s.skirt <= 0.56 ? 0.5 : s.skirt <= 0.7 ? 0.62 : 0.82, bw = body.bw;
      const t = texOf(s.dress ? s.top.mat : s.bottom.mat), tex = t ? Object.assign(t.clone(), { needsUpdate: true }) : null; if (tex) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, 1); }
      cl.push(Cloth({ strips: mobile ? 16 : 22, rows: 8, len, r0x: 0.14 * bw, r0z: 0.105 * bw, flare: 0.13 + len * 0.08, tex, color: tex ? 0xffffff : (s.dress ? s.top.color : s.bottom.color) })); }
    if (s.apron) cl.push(Cloth({ strips: 8, rows: 6, len: (s.skirt ? 0.5 : 0.55), r0x: 0.155 * body.bw, r0z: 0.125 * body.bw, flare: 0.08, arc: [Math.PI / 2 - 0.8, Math.PI / 2 + 0.8], color: 0xf2ede2, margin: 0.055, drop: -0.02, minK: 0.92 }));
    for (const c of cl) { scene.add(c.mesh); clothes.push(c); }
    g.scale.setScalar(s.h / 1.70);
    const P = { g, body: body.mesh, warmGeo, coolGeo, warm: false, pelvis, spine, head, arms, legs, tool, extra, lata, s, cloth: cl, waistY: body.waistY, bw: body.bw, x: 0, z: 0, h: 0, ph: rnd() * 6, t: 0, st: 'post', sit: 0, pitch: 0 };
    P.rest = () => { const saved = [pelvis.position.y, spine.rotation.x, g.rotation.x, ...arms.flatMap(a => [a.sh.rotation.x, a.el.rotation.x]), ...legs.flatMap(l => [l.hp.rotation.x, l.kn.rotation.x])];
      pelvis.position.y = 0.95; spine.rotation.x = 0; g.rotation.x = 0; for (const a of arms) a.sh.rotation.x = a.el.rotation.x = 0; for (const l of legs) l.hp.rotation.x = l.kn.rotation.x = 0;
      return () => { let i = 0; pelvis.position.y = saved[i++]; spine.rotation.x = saved[i++]; g.rotation.x = saved[i++]; for (const a of arms) { a.sh.rotation.x = saved[i++]; a.el.rotation.x = saved[i++]; } for (const l of legs) { l.hp.rotation.x = saved[i++]; l.kn.rotation.x = saved[i++]; } }; };
    g.userData.reguaRest = P.rest; tag(g, s.sex === 'c' ? 'criança' : s.sex === 'f' ? 'mulher' : 'homem');
    scene.add(g); return P;
  }
  // o pano anda junto: presa na cintura, bate nas pernas e no quadril, cai no chão, o vento sopra
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _e = new THREE.Vector3(), _f = new THREE.Vector3(), _h1 = new THREE.Vector3(), _h2 = new THREE.Vector3();
  function stepCloth(p, dt) {
    if (!p.cloth.length) return;
    const cam = window.__cam, far = cam ? Math.hypot(cam.position.x - p.x, cam.position.y, cam.position.z - p.z) : 0, lim = [70, 45, 28][window.__Q ? window.__Q() : 0];
    if (far > lim) { p.clothSkip = (p.clothSkip || 0) + dt; if (p.clothSkip < 0.5) return; dt = Math.min(p.clothSkip, 1 / 30); p.clothSkip = 0; } const vis = p.g.visible; for (const c of p.cloth) c.mesh.visible = vis; if (!vis) { for (const c of p.cloth) c.reset(); return; }
    p.g.updateMatrixWorld(true); const sc = p.g.scale.x, bw = p.bw;
    p.legs[0].hp.getWorldPosition(_a); p.legs[0].kn.getWorldPosition(_b); p.legs[0].ft.getWorldPosition(_c); p.legs[1].hp.getWorldPosition(_d); p.legs[1].kn.getWorldPosition(_e); p.legs[1].ft.getWorldPosition(_f);
    _h1.copy(_a).lerp(_d, -0.1); _h2.copy(_d).lerp(_a, -0.1); _h1.y += 0.03 * sc; _h2.y += 0.03 * sc;
    const caps = [[_a, _b, 0.09 * bw * sc], [_b, _c, 0.062 * sc], [_d, _e, 0.09 * bw * sc], [_e, _f, 0.062 * sc], [_h1, _h2, 0.125 * bw * sc]];
    const wv = U.uWindBase.value * (1 + U.uWindIu.value * 0.6), wd = U.uWindDir.value, wind = { x: wd.x * wv * wv * 0.028, z: wd.y * wv * wv * 0.028 };   // arrasto do vento no pano de algodão
    for (const c of p.cloth) c.step(Math.min(dt, 1 / 30), p.pelvis.matrixWorld, p.waistY, caps, heightAt, sc, wind);
  }

  // ---------- quem é quem
  const sk = () => pick(SKIN), hc = old => old ? pick([0x9a9690, 0xc8c4be]) : pick(HAIR);
  const camisa = () => rnd() < 0.5 ? { mat: pick(MAT.xadrez), color: 0xffffff } : { mat: MAT.trama, color: pick([0xf0ebe0, 0x8ab6d8, 0x4a78b0, 0xe0b040, 0x6a9a5a, 0xd88a6a]) };
  const calca = () => ({ mat: MAT.trama, color: pick([0x3a5a8a, 0x2e4a72, 0xa08a62, 0x6a4a34, 0x4a4844]) });
  const vestido = () => ({ mat: pick(MAT.chita), color: 0xffffff });
  const homem = (o = {}) => ({ sex: 'm', h: 1.64 + rnd() * 0.2, build: 0.95 + rnd() * 0.2, skin: sk(), hair: o.old ? pick(['careca', 'curto', 'careca']) : pick(['curto', 'curto', 'crespo']), hairColor: hc(o.old), top: camisa(), bottom: calca(),
    sleeves: pick(['longa', 'arregaçada', 'curta']), hat: pick(['palha', 'palha', 'bone', null]), hatColor: pick([0x2f6aa0, 0xc83a2a, 0x3a3a3a]), belt: true, shoes: pick([0x3a2a20, 0x5a3a24]), ...o });
  const mulher = (o = {}) => { const dress = rnd() < 0.6; return { sex: 'f', h: 1.52 + rnd() * 0.16, build: 0.92 + rnd() * 0.22, skin: sk(), hair: pick(['coque', 'longo', 'tranca', 'crespo']), hairColor: hc(o.old),
    top: dress ? vestido() : { mat: MAT.trama, color: pick([0xf4efe6, 0xf2c8c0, 0xc8e0e8, 0xf0e0a0]) }, bottom: dress ? vestido() : { mat: pick(MAT.chita), color: 0xffffff }, dress, skirt: pick([0.55, 0.62, 0.85]),
    sleeves: pick(['curta', 'curta', 'longa']), hat: pick(['lenco', null, null, 'palha']), lenco: Math.floor(rnd() * 5), apron: rnd() < 0.5, shoes: pick([0x3a2a20, 0x7a4a2a]), ...o }; };
  const crianca = (o = {}) => { const girl = rnd() < 0.5; return { sex: 'c', h: 1.05 + rnd() * 0.3, build: 0.9, skin: sk(), hair: girl ? pick(['tranca', 'chiquinha', 'longo']) : pick(['curto', 'curto', 'crespo']), hairColor: pick(HAIR),
    top: girl ? vestido() : { mat: MAT.trama, color: pick([0xe0b040, 0xc83a2a, 0x4a78b0, 0xf0ebe0]) }, bottom: girl ? vestido() : { mat: MAT.trama, color: pick([0x3a5a8a, 0xa08a62]) }, dress: girl, skirt: girl ? 0.32 : 0,
    sleeves: 'curta', hat: null, shoes: pick([0x2a2a2a, 0xc83a2a]), ...o }; };

  // ---------- lugares
  const L = LAYOUT, rot2 = (p, rot, lx, lz) => [p[0] + lx * Math.cos(rot) + lz * Math.sin(rot), p[1] - lx * Math.sin(rot) + lz * Math.cos(rot)];
  const doorOfHouse = h => rot2(h.p, h.rot, -h.w * 0.22, h.d / 2 + 0.9);
  const doors = L.houses.map(h => ({ at: doorOfHouse(h), face: h.rot })), doorOf = p => p.door || doors[p.home].at;
  const tL = TILES.find(t => t.kind === 'lavoura'), tB = TILES.find(t => t.kind === 'mata'), tV = TILES.find(t => t.kind === 'vila');
  const towardWater = (x, z) => { const e = 0.6, gx = waterDist(x + e, z) - waterDist(x - e, z), gz = waterDist(x, z + e) - waterDist(x, z - e); return Math.atan2(-gx, -gz); };
  const lav = L.lav, lavFace = lav ? towardWater(...lav) : 0;
  if (lav && L.lavStone) { L.lavStone.position.x = lav[0] + Math.sin(lavFace) * 0.62; L.lavStone.position.z = lav[1] + Math.cos(lavFace) * 0.62; L.lavStone.position.y = waterLevelAt(lav[0], lav[1]) + 0.04; L.lavStone.rotation.y = lavFace; }
  const pes = [SPRING[0] + Math.cos(0.9) * (POOL_R + 1.1), SPRING[1] + Math.sin(0.9) * (POOL_R + 1.1)];
  const bench = (() => { const h = L.houses[0]; return { at: rot2(h.p, h.rot, -h.w * 0.1 + 0.6, h.d / 2 + 1.75), face: h.rot + Math.PI, y: 0.15 }; })();
  { const h = L.houses[0], b = new THREE.Mesh(merge([paint(new THREE.BoxGeometry(1.4, 0.06, 0.36).translate(0, 0.45, 0), col(0x8a6a4a)), paint(new THREE.BoxGeometry(0.06, 0.45, 0.3).translate(-0.6, 0.22, 0), col(0x7a5a3e)), paint(new THREE.BoxGeometry(0.06, 0.45, 0.3).translate(0.6, 0.22, 0), col(0x7a5a3e))], K), MAT.liso);
    b.position.set(bench.at[0], groundAtHouse(h) + 0.15, bench.at[1]); b.rotation.y = h.rot; b.castShadow = true; scene.add(b); }
  L.fiar = (() => { const h = L.houses[1]; return { at: rot2(h.p, h.rot, h.w * 0.12, h.d / 2 + 0.85), face: h.rot, y: 0 }; })();
  { const h = L.houses[1], b = new THREE.Mesh(merge([paint(new THREE.BoxGeometry(0.45, 0.06, 0.4).translate(0, 0.45, 0), col(0x8a6a4a)), ...[[-0.18, -0.15], [0.18, -0.15], [-0.18, 0.15], [0.18, 0.15]].map(([x, z]) => paint(new THREE.BoxGeometry(0.05, 0.45, 0.05).translate(x, 0.22, z), col(0x7a5a3e)))], K), MAT.liso);
    b.position.set(L.fiar.at[0], groundAtHouse(h), L.fiar.at[1]); b.rotation.y = h.rot; b.castShadow = true; scene.add(b);
    const r = new THREE.Group(), wheel = [paint(new THREE.TorusGeometry(0.28, 0.018, 6, 24), col(0x7a5a3e))]; for (let k = 0; k < 8; k++) wheel.push(paint(new THREE.BoxGeometry(0.012, 0.56, 0.012).rotateZ(k * Math.PI / 8), col(0x8a6a4a)));
    const wm = new THREE.Mesh(merge(wheel, K), MAT.liso); wm.position.y = 0.55; wm.rotation.y = Math.PI / 2; r.add(wm);
    r.add(new THREE.Mesh(merge([paint(new THREE.BoxGeometry(0.06, 0.3, 0.7).translate(0, 0.15, 0), col(0x6a4a34)), paint(new THREE.BoxGeometry(0.03, 0.4, 0.03).translate(0, 0.45, -0.3), col(0x6a4a34)), paint(new THREE.CylinderGeometry(0.03, 0.01, 0.14, 8).rotateX(Math.PI / 2).translate(0, 0.65, -0.32), col(0xf0ebe0))], K), MAT.liso));
    const [rx, rz] = rot2(h.p, h.rot, h.w * 0.12 + 0.55, h.d / 2 + 0.95); r.position.set(rx, groundAtHouse(h), rz); r.rotation.y = h.rot; scene.add(r); updaters.push(dt => { wm.rotation.x += dt * 2.6; }); }
  function groundAtHouse(h) { let m = 1e9; for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) { const [x, z] = rot2(h.p, h.rot, u * h.w / 2, v * h.d / 2); m = Math.min(m, heightAt(x, z)); } return m - 0.04; }
  // cesto de roupa ao lado da lavadeira
  if (lav) { const b = new THREE.Mesh(merge([paint(new THREE.CylinderGeometry(0.28, 0.22, 0.25, 12).translate(0.75, 0.12, -0.2), col(0xb08a52)), paint(new THREE.SphereGeometry(0.2, 10, 8).scale(1, 0.6, 1).translate(0.75, 0.27, -0.2), col(0xe8e2d4))], K), MAT.liso);
    b.position.set(lav[0], heightAt(lav[0], lav[1]), lav[1]); b.rotation.y = lavFace + Math.PI / 2; scene.add(b); }
  // poço: a moça fica do lado da manivela; lição: banquinho da mãe e a esteira das crianças; toco do pai; mata do lenhador
  const W = L.well, wellAt = (lx, lz) => { const v = W.rig ? W.rig.g.localToWorld(new THREE.Vector3(lx, 0, lz)) : new THREE.Vector3(W.p[0] + lx, 0, W.p[1] + lz); return [v.x, v.z]; };
  const Li = L.licao, fw = [Math.sin(Li.rot), Math.cos(Li.rot)], sd = [Math.cos(Li.rot), -Math.sin(Li.rot)];
  const seats = [-0.75, 0, 0.75].map((o, i) => [Li.p[0] + fw[0] * (1.45 + (i === 1 ? 0.25 : 0)) + sd[0] * o, Li.p[1] + fw[1] * (1.45 + (i === 1 ? 0.25 : 0)) + sd[1] * o]);
  const Tc = L.toco, tocoStand = rot2(Tc.p, Tc.rot, 0, -0.78), tocoFace = Math.atan2(Tc.p[0] - tocoStand[0], Tc.p[1] - tocoStand[1]);
  const Lp = L.lenha, pileStand = rot2(Lp.p, Lp.rot, 0, 0.95);
  const gather = (() => { for (let k = 0.15; k < 0.7; k += 0.03) { const x = tB.c[0] + (tV.c[0] - tB.c[0]) * k, z = tB.c[1] + (tV.c[1] - tB.c[1]) * k; if (waterDist(x, z) > 3.5 && !blocked(x, z, 0.5) && inHex(x, z, tB.c, 0.9)) return [x, z]; } return [tB.c[0], tB.c[1] + 6]; })();
  const Cz = L.cruzeiro, crzStand = (() => { const a = L.chapel.rot + Math.PI / 2, d = [Math.cos(a), -Math.sin(a)]; return [Cz.p[0] - d[0] * 1.35, Cz.p[1] - d[1] * 1.35]; })(), crzFace = Math.atan2(Cz.p[0] - crzStand[0], Cz.p[1] - crzStand[1]);
  const chapelDoor = L.chapelDoor;

  const roles = [
    { make: () => homem({ tool: 'enxada', sleeves: 'longa', hat: 'palha' }), job: 'enxada', post: [tL.c[0] + L.field.cornMaxX + 0.2, tL.c[1] - 6], span: 10, home: 0, mob: 1 },
    { make: () => homem({ tool: 'enxada', hat: 'palha', old: true }), job: 'enxada', post: [tL.c[0] + L.field.sunMinX - 0.3, tL.c[1] + 3], span: 8, home: 0 },
    { make: () => mulher({ tool: 'balaio', hat: 'palha', dress: false, top: { mat: MAT.trama, color: 0xf4efe6 }, bottom: { mat: MAT.trama, color: 0x3a5a8a }, skirt: 0 }), job: 'colher', post: [tL.c[0] + 9.6, tL.c[1] - 5], span: 9, home: 1, mob: 1 },
    { make: () => mulher({ tool: 'vassoura', apron: true }), job: 'varrer', post: rot2(L.houses[1].p, L.houses[1].rot, -1.5, L.houses[1].d / 2 + 2.5), home: 1 },
    { make: () => mulher({ tool: 'lata', hat: null, hair: 'coque' }), job: 'agua', post: wellAt(1.35, 0.62), home: 2, mob: 1 },
    { make: () => homem({ hat: 'palha', old: true, sleeves: 'longa' }), job: 'sentar', post: bench.at, face: bench.face, seatY: bench.y, home: 0, night: true, mob: 1 },
    { make: () => mulher({ hat: 'lenco' }), job: 'conversa', post: rot2(W.p, 0, 2.6, 1.2), face: -Math.PI / 2, home: 2, devoto: true },
    { make: () => homem({ hat: 'bone' }), job: 'conversa', post: rot2(W.p, 0, 4.0, 1.2), face: Math.PI / 2, home: 1, devoto: true },
    { make: () => crianca(), job: 'pega', post: rot2(W.p, 0, -3.5, -3.5), home: 2, k: 0, rad: 2.6, pair: 'poco', mob: 1 },
    { make: () => crianca(), job: 'pega', post: rot2(W.p, 0, -3.5, -3.5), home: 2, k: Math.PI, rad: 2.6, pair: 'poco', mob: 1 },
    { make: () => homem({ hat: 'couro', top: { mat: MAT.trama, color: 0x8a6a4a }, bottom: { mat: MAT.trama, color: 0x5a4030 }, sleeves: 'longa', shoes: 0x4a2a18 }), job: 'vaqueiro', post: rot2(L.corral.p, L.corral.rot, -L.corral.w / 2 + 1, L.corral.d / 2 + 0.75), face: L.corral.rot + Math.PI, span: L.corral.w - 2, dirRot: L.corral.rot, home: 0, mob: 1 },
    lav && { make: () => mulher({ hat: 'lenco', apron: false, sleeves: 'curta', tool: 'pano' }), job: 'lavar', post: lav, face: lavFace, home: 2, mob: 1 },
    { make: () => homem({ hat: 'palha', tool: 'vara', sleeves: 'arregaçada' }), job: 'pescar', post: pes, face: Math.atan2(SPRING[0] - pes[0], SPRING[1] - pes[1]), home: 0 },
    { make: () => homem({ hat: null, apron: false, top: { mat: MAT.trama, color: 0xf0ebe0 }, sleeves: 'arregaçada', beard: 'bigode' }), job: 'conversa', post: rot2(L.venda.p, L.venda.rot, -L.venda.w * 0.26, L.venda.d / 2 + 1.0), face: L.venda.rot, home: 1, mob: 1 },
    { make: () => crianca(), job: 'bola', post: L.coreto.p, rad: 5.2, home: 2, k: 0.5, pair: 'coreto', mob: 1 },
    { make: () => crianca(), job: 'bola', post: L.coreto.p, rad: 5.2, home: 2, k: 2.6, pair: 'coreto' },
    { make: () => mulher({ tool: 'balaio', hat: 'palha', dress: false, top: { mat: MAT.trama, color: 0xf4efe6 }, bottom: { mat: MAT.trama, color: 0x8a6a4a }, skirt: 0 }), job: 'colher', post: [L.wheat.tile.c[0] - 5, L.wheat.tile.c[1] + 2], span: 10, home: 1 },
    { make: () => mulher({ hat: 'lenco', apron: true, sleeves: 'curta' }), job: 'forno', post: rot2(L.oven.p, L.oven.rot, 0, 1.55), face: L.oven.rot + Math.PI, home: 1, mob: 1 },
    { make: () => homem({ hat: 'palha', sleeves: 'arregaçada', top: { mat: MAT.trama, color: 0xe8e2d0 }, bottom: { mat: MAT.trama, color: 0x6a4a34 } }), job: 'serrar', post: rot2(L.cavalete.p, L.cavalete.rot, -0.75, 0), face: L.cavalete.rot + Math.PI / 2, home: 1 },
    { make: () => mulher({ old: true, hat: null, hair: 'coque', sleeves: 'longa' }), job: 'fiar', post: L.fiar.at, face: L.fiar.face, seatY: L.fiar.y, home: 2 },
    // a beata do cruzeiro, a mãe com a lousa e as três crianças na esteira, o pai no toco, o lenhador
    { make: () => mulher({ old: true, hat: 'lenco', lenco: 3, hair: 'coque', sleeves: 'longa', apron: false, dress: true, skirt: 0.85 }), job: 'rezar', post: doors[2].at, home: 2, mob: 1 },
    { make: () => mulher({ extra: 'lousa', apron: true, sleeves: 'curta', hat: null }), job: 'licao', post: Li.p, face: Li.rot, home: 2, mob: 1 },
    ...seats.map((s, i) => ({ make: () => crianca(), job: 'aluno', post: s, face: Li.rot + Math.PI + (i - 1) * 0.25, home: 2, seat: i, mob: i < 2 })),
    { make: () => homem({ tool: 'machado', hat: pick(['palha', null]), sleeves: 'arregaçada', top: camisa() }), job: 'machado', post: tocoStand, face: tocoFace, home: 2, mob: 1 },
    { make: () => homem({ hat: 'palha', extra: 'feixe', sleeves: 'longa', top: { mat: MAT.trama, color: 0xc8b898 } }), job: 'lenha', post: pileStand, face: Lp.rot + Math.PI, home: 0 },
  ].filter(Boolean);
  const list = mobile ? roles.filter(r => r.mob) : roles;
  const KIDS = new Set(['pega', 'bola']);
  const kidPost = p => KIDS.has(p.job) ? [p.x0 + Math.cos(p.k) * (p.rad || 2.6), p.z0 + Math.sin(p.k) * (p.rad || 2.6)] : [p.x0, p.z0];
  for (const r of list) { const p = person(r.make()); Object.assign(p, r); const [x, z] = r.post; p.x0 = x; p.z0 = z; [p.x, p.z] = kidPost(p); p.h = r.face ?? rnd() * 6.28; p.dir = 1; people.push(p); }
  const pairs = {}; for (const p of people) if (p.pair) (pairs[p.pair] = pairs[p.pair] || []).push(p);
  for (const k in pairs) { const [a, b] = pairs[k]; if (a && b) { a.mate = b; b.mate = a; } }
  if (pairs.poco && pairs.poco.length === 2) { pairs.poco[0].it = true; }   // quem está com o pega

  // ---------- poses (ângulos em radianos; + na coluna inclina para a frente, − no ombro levanta o braço para a frente)
  const set = (p, o) => { const k = o.k ?? 1, lerp = (obj, key, v) => { obj[key] += (v - obj[key]) * k; };
    lerp(p.pelvis.position, 'y', o.py ?? 0.95); lerp(p.spine.rotation, 'x', o.sp ?? 0); lerp(p.spine.rotation, 'y', o.sy ?? 0); lerp(p.head.rotation, 'x', o.hx ?? 0); lerp(p.head.rotation, 'y', o.hy ?? 0); lerp(p, 'pitch', o.pitch ?? 0);
    p.arms.forEach((a, i) => { lerp(a.sh.rotation, 'x', (o.sh || [0, 0])[i]); lerp(a.el.rotation, 'x', (o.el || [-0.32, -0.32])[i]); lerp(a.sh.rotation, 'z', (o.shz || [0.1, -0.1])[i]); lerp(a.sh.rotation, 'y', (o.shy || [-0.15, 0.15])[i]); });
    p.legs.forEach((l, i) => { lerp(l.hp.rotation, 'x', (o.hp || [0, 0])[i]); lerp(l.kn.rotation, 'x', (o.kn || [0, 0])[i]); lerp(l.ft.rotation, 'x', (o.ft || [0, 0])[i]); });
    lerp(p.pelvis.rotation, 'y', o.pry ?? 0); };
  const walkPose = (p, sp, run) => { const a = Math.sin(p.ph), b = Math.sin(p.ph + Math.PI), amp = (run ? 0.75 : 0.45) * (p.s.old ? 0.75 : 1);
    return { py: 0.95 - Math.abs(Math.cos(p.ph)) * (run ? 0.05 : 0.025), sp: (run ? 0.15 : 0.03) + (p.s.old ? 0.14 : 0), pry: a * (run ? 0.05 : 0.08), sy: -a * 0.1, ft: [Math.max(-0.3, b * amp * 0.55), Math.max(-0.3, a * amp * 0.55)], sh: [a * amp * 0.8 + (run ? -0.3 : 0), b * amp * 0.8 + (run ? -0.3 : 0)], el: [run ? -1.2 : -0.25, run ? -1.2 : -0.25],
      hp: [b * amp, a * amp], kn: [Math.max(0, Math.sin(p.ph + 1.6)) * amp * 1.3, Math.max(0, Math.sin(p.ph + Math.PI + 1.6)) * amp * 1.3] }; };
  // andar até um ponto (com passada, poeira quando corre); devolve true ao chegar
  const goTo = (p, x, z, dt, speed = 1.2, keepArms = false) => { const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz); if (d < 0.15) return true; p.moving = true; if (p.s.old && speed < 2) speed *= 0.75;
    const want = Math.atan2(dx, dz), e = angTo(p.h, want); p.h += Math.max(-4 * dt, Math.min(4 * dt, e));
    const st = Math.min(d, speed * dt); p.x += Math.sin(p.h) * st; p.z += Math.cos(p.h) * st; const ph0 = p.ph; p.ph += st / (speed > 2 ? 0.55 : 0.38) * Math.PI;
    const w = walkPose(p, speed, speed > 2); if (keepArms) { delete w.sh; delete w.el; w.sh = [p.arms[0].sh.rotation.x, p.arms[1].sh.rotation.x]; w.el = [p.arms[0].el.rotation.x, p.arms[1].el.rotation.x]; }
    set(p, { ...w, k: Math.min(1, dt * 12) });
    if (speed > 2 && Math.floor(ph0 / Math.PI) !== Math.floor(p.ph / Math.PI) && rnd() < 0.5 && U.uRain.value < 0.2) emit('poeira', p.x, heightAt(p.x, p.z) + 0.05, p.z, 1, { spread: 0.4, speed: 0.6 });
    return false; };
  const faceTo = (p, h, dt, rate = 4) => { p.h += Math.max(-rate * dt, Math.min(rate * dt, angTo(p.h, h))); };

  // ---------- ajudas das rotinas
  const nearest = (p, r) => { let b = null, bd = r; for (const o of people) { if (o === p || !o.g.visible) continue; const d = Math.hypot(o.x - p.x, o.z - p.z); if (d < bd) { bd = d; b = o; } } return b; };
  const turnTo = (p, x, z, dt) => { let e = Math.atan2(x - p.x, z - p.z) - p.h; e = Math.atan2(Math.sin(e), Math.cos(e)); p.h += Math.max(-2 * dt, Math.min(2 * dt, e)); };
  // aceno: com a mão livre (quem leva ferramenta na direita acena com a esquerda)
  const waveArm = (p, t) => { const i = p.s.tool ? 0 : 1, sg = i ? 1 : -1, w = Math.sin(t * 11); p.arms[i].sh.rotation.x = -2.55; p.arms[i].sh.rotation.z = sg * (0.25 + w * 0.25); p.arms[i].el.rotation.x = -0.35; };
  // de vez em quando quem trabalha para um pouco: se espreguiça com a mão nas costas, bebe água da cabaça, enxuga a testa ou olha em volta
  const PAUSA = new Set(['enxada', 'colher', 'varrer', 'serrar', 'forno', 'vaqueiro']);
  function pausa(p, dt, k) { if (!PAUSA.has(p.job)) return false; p.pz = (p.pz ?? 12 + rnd() * 30) - dt; if (p.pz > 0) return false;
    if (p.pt == null) p.pt = Math.floor(rnd() * 4); const q = -p.pz;
    if (p.pt === 0) set(p, { sp: -0.22, sh: [0.55, 0.55], el: [-1.5, -1.5], shz: [-0.25, 0.25], hx: -0.35, k });
    else if (p.pt === 1) set(p, { sh: [0, -2.0], el: [-0.3, -2.1], shz: [0.1, 0.15], hx: -0.3 - Math.min(1, q) * 0.15, k });
    else if (p.pt === 2) set(p, { sh: [-2.5, 0], el: [-2.0, -0.3], shz: [0.45, -0.1], hx: -0.15, k });
    else set(p, { hy: Math.sin(q * 1.6) * 0.9, hx: -0.1, k });
    if (q > 3.5) { p.pz = 18 + rnd() * 35; p.pt = null; } return true; }

  // ---------- os que chegam: a cada pedido atendido, gente nova anda de fora do vale até a casa nova da vila e passa a viver
  // ali, num dia de afazeres entre a casa, a roça, a beira do rio e a vizinhança (cedo e à tarde trabalha, na hora do almoço
  // senta na porta, no fim da tarde proseia com os vizinhos, de noite e na chuva entra em casa)
  const MAX_NEW = mobile ? 6 : 14; let nNew = 0;
  function arrive({ from, house = null, door = null, spots = [] }) { if (nNew >= MAX_NEW) return null; nNew++;
    const r = rnd(), kid = r < 0.25, s = kid ? crianca() : r < 0.62 ? homem(rnd() < 0.5 ? { tool: 'enxada' } : {}) : mulher(rnd() < 0.35 ? { tool: 'balaio' } : {});
    const p = person(s), dr = house ? doorOfHouse(house) : door;
    Object.assign(p, { job: 'morador', kid, door: dr, spots, home: 0, x: from[0], z: from[1], x0: dr[0], z0: dr[1], st: 'post', cyc: 'anda', alvo: { x: dr[0], z: dr[1], act: 'acena', dur: 3 }, vel: kid ? 2.4 : 1.2 + rnd() * 0.3 });
    p.h = Math.atan2(dr[0] - from[0], dr[1] - from[1]); people.push(p); return p; }
  const ACT = { C: p => p.s.tool === 'enxada' ? 'capina' : 'colhe', A: () => 'lava', V: () => rnd() < 0.5 ? 'conversa' : 'olha', G: () => rnd() < 0.5 ? 'olha' : 'senta', B: () => 'lenha' };
  function pickSpot(p) { const hr = window.__hour ?? 15, d = p.door, near = (r0, r1, act) => { const a = rnd() * 6.283, r = r0 + rnd() * (r1 - r0); return { x: d[0] + Math.cos(a) * r, z: d[1] + Math.sin(a) * r, act }; };
    if (p.kid) return rnd() < 0.6 || !p.spots.length ? near(2, 6, 'brinca') : { ...pick(p.spots), act: 'brinca' };
    if (hr > 11.5 && hr < 13.5) return near(1.2, 2.2, 'senta');
    if (hr > 17) return near(1.5, 3.5, 'conversa');
    const sp = p.spots.filter(x => x !== p.ult); if (!sp.length || rnd() < 0.15) return near(1.5, 3, 'olha');
    const o = pick(sp); p.ult = o; const j = o.t === 'A' ? 0 : 2; return { x: o.x + (rnd() - 0.5) * j, z: o.z + (rnd() - 0.5) * j, act: ACT[o.t](p), face: o.face }; }
  function faz(p, act, t, dt, k) {
    if (act === 'capina') { const c = (t * 0.75) % 1, up = c < 0.45; set(p, { sp: up ? 0.2 : 0.55, sh: [up ? -2.3 : -0.55, up ? -2.2 : -0.45], el: [-0.35, -0.3], hp: [-0.15, 0.25], kn: [0.25, 0.35], hx: 0.3, k: Math.min(1, dt * (up ? 5 : 16)) }); }
    else if (act === 'colhe' || act === 'lenha') { const c = (t * 0.3) % 1; set(p, c < 0.6 ? { sp: 0.9, hp: [-0.35, -0.2], kn: [0.35, 0.3], sh: [-1.1, -0.5], el: [-0.3, -0.3], hx: 0.2, k } : { sh: [-0.6, -0.3], el: [-1.0, -0.3], k }); }
    else if (act === 'lava') { const w = Math.sin(t * 5); set(p, { py: 0.52, sp: 0.85, hp: [0.05, 0.05], kn: [1.55, 1.55], sh: [-1.0 + w * 0.25, -1.0 - w * 0.25], el: [-0.4, -0.4], hx: 0.2, k: Math.min(1, dt * 10) }); }
    else if (act === 'senta') set(p, { py: 0.18, hp: [-1.5, -1.4], kn: [0.35, 0.3], sh: [0.35, 0.35], el: [-0.2, -0.2], sp: -0.15, hy: Math.sin(t * 0.3) * 0.5, k });
    else if (act === 'conversa') { const g2 = Math.max(0, Math.sin(t * 1.3)); set(p, { sh: [-0.4 - g2 * 0.5, -0.2], el: [-1.1 - g2 * 0.3, -0.3], hx: Math.sin(t * 2.1) * 0.08, k }); const o = nearest(p, 5); if (o) turnTo(p, o.x, o.z, dt); }
    else if (act === 'acena') { set(p, { k }); waveArm(p, t); }
    else if (act === 'brinca') { const a = t * 2.2 + p.ph; goTo(p, p.x0 + Math.cos(a) * 1.6, p.z0 + Math.sin(a) * 1.6, dt, 2.8); }
    else set(p, { sh: [0.2, 0.2], shz: [-0.5, 0.5], el: [-1.6, -1.6], hy: Math.sin(t * 0.5) * 0.8, k });   // olha: mão na cintura, olhando o vale
  }

  // ---------- o tombo: tropeça, cai de peito com as mãos na frente (poeira), fica um instante, senta e chora um pouco,
  // levanta e bate a poeira da roupa
  let alert = null;   // onde aconteceu algo que vale olhar (criança caiu)
  function fall(p) { p.fallT = 0; p.fallV = Math.max(1.5, p.lastSpeed || 2.5); alert = { x: p.x, z: p.z, t: 6, who: p }; }
  function stepFall(p, dt) { const t = (p.fallT += dt), k = Math.min(1, dt * 10);
    if (t < 0.28) { const v = p.fallV * (1 - t / 0.28); p.x += Math.sin(p.h) * v * dt; p.z += Math.cos(p.h) * v * dt;
      set(p, { pitch: 0.5 * t / 0.28, sp: 0.6, sh: [-1.7, -1.7], el: [-0.3, -0.3], hp: [0.4, -0.3], kn: [0.6, 0.2], hx: -0.4, k: Math.min(1, dt * 18) }); }
    else if (t < 0.5) { set(p, { pitch: 1.38, sp: 0.15, sh: [-2.9, -2.9], el: [-0.25, -0.25], shz: [0.4, -0.4], hp: [0.2, 0.15], kn: [0.3, 0.5], hx: -0.7, k: Math.min(1, dt * 22) });
      if (!p.dusted) { p.dusted = true; emit('poeira', p.x + Math.sin(p.h) * 0.8 * p.g.scale.x, heightAt(p.x, p.z) + 0.05, p.z + Math.cos(p.h) * 0.8 * p.g.scale.x, 10, { spread: 1, speed: 0.8 }); } }
    else if (t < 1.7) set(p, { pitch: 1.38, sp: 0.15, sh: [-2.9, -2.9], el: [-0.25, -0.25], shz: [0.4, -0.4], hp: [0.2, 0.15], kn: [0.3 + 0.3 * Math.sin(t * 6), 0.5], hx: -0.7, k });
    else if (t < 4.2) { const sob = Math.sin(t * 15) * 0.04;   // sentado no chão, mão no joelho, cabeça baixa, chorando
      set(p, { pitch: 0, py: 0.15, sp: 0.35 + sob, hp: [-1.45, -1.5], kn: [0.9, 0.3], sh: [-0.8, -1.9], el: [-0.9, -2.3], shy: [-0.2, 0.5], hx: 0.45, k: Math.min(1, dt * 5) }); }
    else if (t < 5.0) set(p, { py: 0.52, sp: 0.4, hp: [0.0, -1.4], kn: [1.6, 1.4], sh: [-0.6, -0.6], el: [-0.4, -0.4], hx: 0.1, k: Math.min(1, dt * 6) });   // de joelhos, levantando
    else if (t < 6.0) { const s = Math.sin(t * 16); set(p, { sp: 0.3, sh: [-0.15 + s * 0.12, -0.15 - s * 0.12], el: [-0.5, -0.5], shz: [0.25, -0.25], hx: 0.35, k: Math.min(1, dt * 10) }); }   // bate a poeira
    else { p.fallT = null; p.dusted = false; return true; }
    return false; }

  // ---------- a bola dos meninos da praça: cai, quica, rola com atrito, gira, bate no coreto e volta
  let ball = null;
  if (pairs.coreto && pairs.coreto.length) { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64; const x = cv.getContext('2d'); x.fillStyle = '#f4efe6'; x.fillRect(0, 0, 128, 64); x.fillStyle = '#c8382a';
    for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(10 + i * 22, i % 2 ? 18 : 46, 8, 0, 7); x.fill(); } const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), mat({ map: t })); m.castShadow = true; m.userData.noRegua = true; scene.add(m);
    const c = L.coreto.p; ball = { m, x: c[0] + 4.5, z: c[1], y: heightAt(c[0] + 4.5, c[1]) + 0.11, vx: 0, vy: 0, vz: 0, r: 0.11, last: null }; }
  function stepBall(dt) { if (!ball) return; const b = ball, g = heightAt(b.x, b.z) + b.r; b.vy -= 9.8 * dt; b.x += b.vx * dt; b.z += b.vz * dt; b.y += b.vy * dt;
    if (b.y < g) { b.y = g; if (b.vy < -1.2) { b.vy = -b.vy * 0.45; emit('poeira', b.x, g - b.r, b.z, 2, { spread: 0.3, speed: 0.4 }); } else b.vy = 0; const f = Math.exp(-1.6 * dt); b.vx *= f; b.vz *= f; }
    const c = L.coreto.p, dx = b.x - c[0], dz = b.z - c[1], d = Math.hypot(dx, dz), R0 = 3.15;   // base do coreto
    if (d < R0 && b.y < g + 0.6) { const nx = dx / d, nz = dz / d, vn = b.vx * nx + b.vz * nz; if (vn < 0) { b.vx -= 1.7 * vn * nx; b.vz -= 1.7 * vn * nz; } b.x = c[0] + nx * R0; b.z = c[1] + nz * R0; }
    if (d > 10) { const nx = dx / d, nz = dz / d, vn = b.vx * nx + b.vz * nz; if (vn > 0) { b.vx -= 1.6 * vn * nx; b.vz -= 1.6 * vn * nz; } }   // o meio-fio da praça segura a bola
    const sp = Math.hypot(b.vx, b.vz); if (sp > 0.01) { const ax = new THREE.Vector3(b.vz, 0, -b.vx).normalize(); b.m.rotateOnWorldAxis(ax, sp * dt / b.r); }
    b.m.position.set(b.x, b.y, b.z); }

  // ---------- o sino: Ave-Maria às 6, 12 e 18 horas (balança e bate)
  const bell = L.chapel.bell; let bellA = 0, bellV = 0, bellPrev = 0;
  const churchHour = h => h > 17.6 && h < 18.6;
  function stepBell(dt, hour) { if (!bell) return; const ring = [6, 12, 18].some(t => hour > t - 0.02 && hour < t + 0.12);
    bellV += (-bellA * 9 - bellV * 0.6) * dt; if (ring && Math.abs(bellA) < 0.9) bellV += Math.sign(bellV || 1) * 3.2 * dt; bellA += bellV * dt; bell.rotation.x = bellA;
    if (ring && Math.sign(bellV) !== Math.sign(bellPrev) && Math.abs(bellA) > 0.35) som('sino', bell.position.x, bell.position.z, 1.4); bellPrev = bellV; }

  let time = 0, scare = 0, kidsHome = 0;
  updaters.push(dt => { time += dt; scare = Math.max(0, scare - dt); kidsHome = Math.max(0, kidsHome - dt); if (alert && (alert.t -= dt) < 0) alert = null;
    const day = U.uDay.value, rain = U.uRain.value, away = day < 0.3 || rain > 0.3, hour = window.__hour ?? 15;
    stepBell(dt, hour); stepBall(dt);
    // roupa no varal: some de manhã cedo (dia novo) e quando a chuva manda a lavadeira para casa
    if (L.varal && (hour < 6.5 || rain > 0.3) && L.varal.n) { L.varal.n = 0; for (const it of L.varal.items) it.visible = false; }
    for (const p of people) { const k = Math.min(1, dt * 6); let yOff = 0; p.moving = false;
      const stay = p.night && day < 0.3 && rain < 0.3;
      const kidScared = KIDS.has(p.job) && kidsHome > 0; p.running = false; p.lastSpeed = 0;
      if (p.fallT != null && p.st === 'post') { stepFall(p, dt); p.running = false; }
      // Ave-Maria: quem é devoto vai à capela quando o sino toca e sai depois da reza
      else if (p.devoto && churchHour(hour) && !away) { if (p.st !== 'igreja') { if (goTo(p, chapelDoor[0] + (p.ph - 3) * 0.15, chapelDoor[1], dt, 1.2)) { p.st = 'igreja'; p.g.visible = false; } } }
      else if (p.st === 'igreja') { p.g.visible = true; p.x = chapelDoor[0]; p.z = chapelDoor[1]; p.st = 'voltando'; }
      else if ((away || kidScared) && !stay) { if (p.st !== 'casa') { const d = doorOf(p), run = rain > 0.3 || kidScared; p.running = run; p.pitch = 0;
          if (p.lata) p.lata.visible = false; if (p.extra && p.s.extra === 'feixe') p.extra.visible = false;
          if (goTo(p, d[0], d[1], dt, run ? 2.8 : 1.3)) { p.st = 'casa'; p.g.visible = false; p.cyc = 0; }
          else if (rain > 0.3) { p.arms[1].sh.rotation.x = -2.75; p.arms[1].el.rotation.x = -1.7; p.arms[1].sh.rotation.z = -0.35; p.head.rotation.x = 0.25; } } }
      else if (p.st === 'casa' || p.st === 'voltando') { p.g.visible = true; if (p.st === 'casa') { const d = doorOf(p); p.x = d[0]; p.z = d[1]; p.st = 'voltando'; }
        const [bx, bz] = kidPost(p); if (goTo(p, bx, bz, dt, KIDS.has(p.job) ? 2.6 : 1.2)) { p.st = 'post'; p.h = p.face ?? p.h; } }
      else { // no posto, fazendo o ofício
        const t = time + p.ph;
        if (!pausa(p, dt, k)) switch (p.job) {
          case 'enxada': { const c = (t * 0.75) % 1, up = c < 0.45; set(p, { sp: up ? 0.2 : 0.55, sh: [up ? -2.3 : -0.55, up ? -2.2 : -0.45], el: [-0.35, -0.3], hp: [-0.15, 0.25], kn: [0.25, 0.35], hx: 0.3, k: Math.min(1, dt * (up ? 5 : 16)) });
            if (c > 0.95) { p.z += p.dir * 0.012; if (Math.abs(p.z - p.z0) > p.span / 2) p.dir *= -1; } if (!up && c > 0.47 && c < 0.5 && !p.hit) { p.hit = true; emit('poeira', p.x + Math.sin(p.h) * 0.9, heightAt(p.x, p.z) + 0.03, p.z + Math.cos(p.h) * 0.9, 2, { spread: 0.4, speed: 0.5 }); } if (up) p.hit = false;
            p.h = p.dir > 0 ? 0 : Math.PI; break; }
          case 'colher': { const c = (t * 0.25) % 1; if (c < 0.5) { if (goTo(p, p.x0, p.z0 + Math.sin(t * 0.06) * p.span / 2, dt * 0.5, 0.6)) set(p, { k }); }
            else set(p, { sh: [-2.6, -0.3], el: [-0.4, -0.2], hy: 0.3, hx: -0.3, k }); break; }
          case 'varrer': { const s = Math.sin(t * 2.4); set(p, { sp: 0.3, sy: s * 0.3, sh: [-0.7 + s * 0.15, -0.55 - s * 0.15], el: [-0.5, -0.4], hp: [0.05, -0.05], hx: 0.2, k });
            p.x += Math.sin(t * 0.2) * dt * 0.15; p.z += Math.cos(t * 0.17) * dt * 0.15; if (U.uRain.value < 0.1 && rnd() < dt * 1.5) emit('poeira', p.x + Math.sin(p.h) * 0.7, heightAt(p.x, p.z) + 0.04, p.z + Math.cos(p.h) * 0.7, 1, { spread: 0.5, speed: 0.4 }); break; }
          case 'agua': poco(p, dt, t, k); break;
          case 'sentar': set(p, { py: (p.seatY ?? 0) + 0.47, hp: [-1.5, -1.45], kn: [1.45, 1.5], sh: [-0.45, -0.5], el: [-0.7, -0.6], hy: Math.sin(t * 0.3) * 0.5, hx: 0.05, k }); p.h = p.face; break;
          case 'conversa': { const g2 = Math.max(0, Math.sin(t * 1.3)); set(p, { sh: [-0.4 - g2 * 0.5, -0.2], el: [-1.1 - g2 * 0.3, -0.3], hx: Math.sin(t * 2.1) * 0.08, hy: Math.sin(t * 0.4) * 0.2, k }); p.h = p.face; break; }
          case 'pega': pega(p, dt, t); break;
          case 'morador': {
            if (p.cyc === 'anda') { if (!p.alvo) { p.alvo = pickSpot(p); p.x0 = p.alvo.x; p.z0 = p.alvo.z; }
              if (goTo(p, p.alvo.x, p.alvo.z, dt, p.alvo.act === 'brinca' ? 2.6 : p.vel)) { p.cyc = 'faz'; p.w8 = p.alvo.dur ?? (p.kid ? 4 + rnd() * 5 : 9 + rnd() * 14); if (p.alvo.face != null) p.h = p.alvo.face; } }
            else { p.w8 -= dt; faz(p, p.alvo.act, t, dt, k); if (p.w8 < 0) { p.cyc = 'anda'; p.alvo = null; } }
            break; }
          case 'bola': bola(p, dt, t, k); break;
          case 'vaqueiro': { p.cyc = p.cyc ?? 0; const dx = Math.cos(p.dirRot), dz = -Math.sin(p.dirRot);
            if (p.cyc === 0) { if (goTo(p, p.x0 + dx * p.span * (p.side ? 1 : 0), p.z0 + dz * p.span * (p.side ? 1 : 0), dt, 0.9)) { p.cyc = 1; p.w8 = 6 + rnd() * 6; } }
            else { p.w8 -= dt; p.h += (p.face - p.h) * k; set(p, { sp: 0.18, sh: [-1.3, -1.25], el: [-0.9, -0.8], hy: Math.sin(t * 0.5) * 0.4, k }); if (p.w8 < 0) { p.cyc = 0; p.side = !p.side; } } break; }
          case 'lavar': lavar(p, dt, t, k); break;
          case 'forno': { const c = (t * 0.18) % 1; if (c < 0.35) set(p, { sp: 0.35, sh: [-1.35, -1.25], el: [-0.25, -0.2], hp: [-0.1, 0.25], kn: [0.15, 0.3], k });
            else if (c < 0.5) set(p, { sp: 0.1, sh: [-0.9, -0.85], el: [-0.6, -0.5], k }); else set(p, { sp: 0.45, sh: [-0.7, -0.7], el: [-0.9, -0.9], hx: 0.3, k: Math.min(1, dt * 4) });
            p.h = p.face + (c > 0.38 && c < 0.55 ? Math.PI * 0.6 : 0); break; }
          case 'serrar': { const s2 = Math.sin(t * 5.5); set(p, { sp: 0.42, sh: [-0.9 + s2 * 0.35, -0.5], el: [-0.9 - s2 * 0.4, -0.7], hp: [-0.2, 0.3], kn: [0.25, 0.2], hx: 0.3, sy: 0.15, k: Math.min(1, dt * 14) }); p.h = p.face;
            if (rnd() < dt * 4) emit('lasca', L.cavalete.p[0], heightAt(...L.cavalete.p) + 0.75, L.cavalete.p[1], 1, { spread: 0.3, speed: 0.4, color: [0.92, 0.82, 0.62] }); break; }
          case 'fiar': { const s2 = Math.sin(t * 3); set(p, { py: (p.seatY ?? 0) + 0.47, hp: [-1.5, -1.45], kn: [1.45, 1.5], sh: [-0.8, -0.5 + s2 * 0.25], el: [-1.0, -1.1 - s2 * 0.3], hx: 0.25, k }); p.h = p.face; break; }
          case 'pescar': set(p, { py: 0.18, hp: [-1.5, -1.4], kn: [0.35, 0.3], sh: [-0.3, -0.9 + Math.sin(t * 0.7) * 0.05], el: [-0.5, -0.6], sp: -0.1, k }); p.h = p.face; break;
          case 'rezar': rezar(p, dt, t, k); break;
          case 'licao': licao(p, dt, t, k); break;
          case 'aluno': aluno(p, dt, t, k); break;
          case 'machado': machado(p, dt, t, k); break;
          case 'lenha': lenha(p, dt, t, k); break;
        } }
      if (p.job === 'aluno' && p.st === 'post') yOff = 0.02;
      const seatGy = p.st !== 'post' ? null : p.job === 'sentar' ? groundAtHouse(L.houses[0]) : p.job === 'fiar' ? groundAtHouse(L.houses[1]) : null, gy = seatGy ?? heightAt(p.x, p.z);
      // reações por cima do ofício: respira, vento (inclina e segura o chapéu), calor (enxuga a testa), trovão (se encolhe),
      // olha para quem passa correndo e para a criança que caiu; friagem põe o casaco ou o xale
      { const cold = (U.uSeca.value > 0.5 && (hour < 8.5 || hour > 17.5)) || (hour > 19.5 || hour < 6); if (p.warmGeo && cold !== p.warm) { p.warm = cold; p.body.geometry = cold ? p.warmGeo : p.coolGeo; } }
      if (p.g.visible && p.st !== 'casa' && p.fallT == null) { const br = Math.sin(time * 1.6 + p.ph); p.spine.rotation.x += br * 0.012;
        const wb = U.uWindBase.value * (1 + U.uWindIu.value * 0.5), q = Math.max(0, Math.min(1, (wb - 5) / 6)), wd = U.uWindDir.value;
        if (q > 0) { const fx = Math.sin(p.h), fz = Math.cos(p.h), along = fx * wd.x + fz * wd.y, side = fz * wd.x - fx * wd.y;
          p.spine.rotation.x += -along * 0.16 * q; p.spine.rotation.z = side * 0.1 * q;
          if (p.s.hat && !['sentar', 'lavar', 'rezar', 'machado', 'agua', 'aluno', 'licao'].includes(p.job) && (p.st === 'post')) { p.arms[0].sh.rotation.x = -2.7; p.arms[0].el.rotation.x = -1.8; p.arms[0].sh.rotation.z = 0.3; } }
        else p.spine.rotation.z *= 0.9;
        const hot = U.uSeca.value > 0.6 && hour > 11 && hour < 15.5 && day > 0.6 && rain < 0.05;
        if (hot && p.st === 'post' && ['enxada', 'colher', 'varrer', 'vaqueiro'].includes(p.job)) { const c = (time * 0.12 + p.ph) % 1; if (c < 0.08) { p.arms[0].sh.rotation.x = -2.5; p.arms[0].el.rotation.x = -2.0; p.arms[0].sh.rotation.z = 0.45; p.head.rotation.x = -0.15; } }
        if (scare > 1.4) { p.spine.rotation.x += 0.15; p.head.rotation.x = 0.35; for (const a of p.arms) { a.sh.rotation.z = (a === p.arms[0] ? 0.35 : -0.35); } }
        p.waveCd = Math.max(0, (p.waveCd || 0) - dt);
        if (p.wave > 0) { p.wave -= dt; waveArm(p, time); if (p.waveAt) turnTo(p, p.waveAt.x, p.waveAt.z, dt * (p.moving ? 0 : 1)); }
        else if (!p.waveCd && p.st === 'post' && !p.running && !KIDS.has(p.job) && !['rezar', 'aluno', 'licao', 'lavar', 'agua', 'machado'].includes(p.job) && !(p.job === 'morador' && p.kid)) { for (const o of people) { if (o === p || !o.g.visible || !o.moving || KIDS.has(o.job) || o.running || o.kid) continue;
            if (Math.hypot(o.x - p.x, o.z - p.z) < 4) { p.wave = 1.4; p.waveCd = 30 + rnd() * 25; p.waveAt = o; if (!o.waveCd) { o.wave = 1.2; o.waveCd = 30 + rnd() * 25; o.waveAt = p; } break; } } }
        if (p.st === 'post' && !KIDS.has(p.job) && p.job !== 'rezar') { let tx = null, tz = null;
          if (alert && alert.who !== p && Math.hypot(alert.x - p.x, alert.z - p.z) < 16) { tx = alert.x; tz = alert.z; }
          else if (['conversa', 'varrer', 'agua', 'sentar', 'vaqueiro', 'pescar', 'licao'].includes(p.job)) { let bd = 6; for (const o of people) { if (o === p || !o.g.visible) continue; const d = Math.hypot(o.x - p.x, o.z - p.z); if (d < bd && (o.running || KIDS.has(o.job))) { bd = d; tx = o.x; tz = o.z; } } }
          if (tx !== null) { const e = angTo(p.h, Math.atan2(tx - p.x, tz - p.z)); p.head.rotation.y += (Math.max(-1.1, Math.min(1.1, e)) - p.head.rotation.y) * Math.min(1, dt * 3); } } }
      p.g.position.set(p.x, gy + yOff, p.z); p.g.rotation.y = p.h; p.g.rotation.x = p.pitch; stepCloth(p, dt); } });

  // ---------- o poço: anda até a manivela, desce o balde, sobe girando o sarilho, despeja na lata, põe a lata na cabeça e leva
  function poco(p, dt, t, k) { const R = W.rig; p.cyc = p.cyc ?? 0; const crank = R ? R.crankAt() : null, home = doorOf(p);
    if (p.lata && p.cyc < 5) p.lata.visible = false;
    if (p.cyc === 0) { if (goTo(p, p.x0, p.z0, dt)) { p.cyc = 1; p.w8 = 0; } }
    else if (p.cyc === 1 || p.cyc === 2) { // 1: desce depressa (manivela solta para trás); 2: sobe devagar (força na manivela)
      if (crank) faceTo(p, Math.atan2(crank.x - p.x, crank.z - p.z) + 0.5, dt); p.w8 += dt;
      const down = p.cyc === 1, sp = down ? -5 : 3.2; if (R) { R.axle.rotation.x += sp * dt; R.set(Math.max(0, Math.min(1, R.level + (down ? -dt / 1.8 : dt / 5)))); }
      const th = R ? R.axle.rotation.x : t * 3; set(p, { sp: 0.18 + (down ? 0 : 0.08 * Math.sin(th)), sh: [-0.95, -1.3 + 0.38 * Math.sin(th)], el: [-0.45, -0.55 - 0.4 * Math.cos(th)], shy: [-0.15, 0.35], hp: [-0.1, 0.15], kn: [0.15, 0.2], hx: 0.15, k: Math.min(1, dt * 14) });
      if (down && R && R.level <= 0.001) { p.cyc = 2; emit('respingo', W.p[0], heightAt(...W.p) - 0.3, W.p[1], 4, { spread: 0.3, speed: 0.5 }); }
      if (!down && R && R.level >= 0.999) { p.cyc = 3; p.w8 = 0; } }
    else if (p.cyc === 3) { p.w8 += dt; faceTo(p, Math.atan2(W.p[0] - p.x, W.p[1] - p.z), dt); const tilt = sm(0.5, 1.4, p.w8);   // pega o balde e despeja
      set(p, { sp: 0.35 + tilt * 0.15, sh: [-1.45 - tilt * 0.3, -1.45 - tilt * 0.3], el: [-0.35, -0.35], shy: [0.2, -0.2], hx: 0.35, k: Math.min(1, dt * 6) });
      if (p.w8 > 0.8 && rnd() < dt * 20) emit('gota', p.x + Math.sin(p.h) * 0.45, heightAt(p.x, p.z) + 0.6, p.z + Math.cos(p.h) * 0.45, 1, { spread: 0.2 });
      if (p.w8 > 2.2) { p.cyc = 4; p.w8 = 0; } }
    else if (p.cyc === 4) { p.w8 += dt; const up = sm(0.9, 1.7, p.w8);   // agacha, pega a lata no chão e sobe com ela à cabeça
      set(p, { py: 0.95 - 0.38 * (1 - up) * sm(0, 0.6, p.w8), sp: 0.5 * (1 - up), hp: [-1.0 * (1 - up), -1.0 * (1 - up)], kn: [1.3 * (1 - up), 1.3 * (1 - up)], sh: [-0.6 - 2.3 * up, -0.6 - 2.3 * up], el: [-0.4 - 0.3 * up, -0.4 - 0.3 * up], k: Math.min(1, dt * 8) });
      if (up > 0.95 && p.lata) p.lata.visible = true; if (p.w8 > 2.0) p.cyc = 5; }
    else if (p.cyc === 5) { if (p.lata) p.lata.visible = true; if (goTo(p, ...home, dt, 0.95)) { p.cyc = 6; p.w8 = 4; } else { p.arms[0].sh.rotation.x = -2.9; p.arms[0].el.rotation.x = -0.5; p.arms[0].sh.rotation.z = 0.2; p.spine.rotation.x = -0.02; } }
    else { p.w8 -= dt; set(p, { k }); if (p.w8 < 0) { p.cyc = 0; if (p.lata) p.lata.visible = false; } } }

  // ---------- a lavadeira: esfrega na pedra (espuma), bate a roupa (respingo), enxágua, torce (pinga) e estende no varal
  function lavar(p, dt, t, k) { const V = L.varal; p.cyc = p.cyc ?? 0; p.w8 = (p.w8 ?? 0) + dt; const stone = [lav[0] + Math.sin(lavFace) * 0.62, lav[1] + Math.cos(lavFace) * 0.62], wl = waterLevelAt(...lav) + 0.14;
    const kneel = { py: 0.52, hp: [0.05, 0.05], kn: [1.55, 1.55] }, next = (n, d) => { if (p.w8 > d) { p.cyc = n; p.w8 = 0; } };
    if (p.cyc === 0) { if (goTo(p, lav[0], lav[1], dt)) { p.cyc = 1; p.w8 = 0; } }
    else if (p.cyc === 1) { const s = Math.sin(t * 5); faceTo(p, lavFace, dt); set(p, { ...kneel, sp: 0.85, sh: [-1.0 + s * 0.25, -1.0 - s * 0.25], el: [-0.4, -0.4], hx: 0.2, k: Math.min(1, dt * 10) });
      if (rnd() < dt * 5) emit('espuma', stone[0] + (rnd() - 0.5) * 0.4, wl, stone[1] + (rnd() - 0.5) * 0.4, 1, { spread: 0.3 }); next(2, 9); }
    else if (p.cyc === 2) { const c = (p.w8 * 0.9) % 1, up = c < 0.6; set(p, { ...kneel, sp: up ? 0.15 : 0.95, sh: up ? [-2.75, -2.75] : [-0.9, -0.9], el: [-0.2, -0.2], hx: up ? -0.1 : 0.3, k: Math.min(1, dt * (up ? 6 : 22)) });
      if (!up && !p.hit) { p.hit = true; emit('respingo', stone[0], wl, stone[1], 9, { spread: 0.9, speed: 1.1 }); } if (up) p.hit = false; next(3, 4.4); }
    else if (p.cyc === 3) { const s = Math.sin(t * 2.2); set(p, { ...kneel, sp: 1.05, sh: [-0.55 + s * 0.2, -0.55 + s * 0.2], el: [-0.15, -0.15], hx: 0.5, k }); if (rnd() < dt * 4) emit('espuma', stone[0] + Math.sin(lavFace) * 0.5, wl - 0.1, stone[1] + Math.cos(lavFace) * 0.5, 1); next(4, 3); }
    else if (p.cyc === 4) { const s = Math.sin(t * 7); set(p, { ...kneel, sp: 0.2, sh: [-1.05, -1.05], el: [-1.35 + s * 0.2, -1.35 - s * 0.2], shy: [0.35 + s * 0.15, -0.35 + s * 0.15], hx: 0.3, k: Math.min(1, dt * 10) });
      if (rnd() < dt * 18) emit('gota', p.x + Math.sin(p.h) * 0.3, heightAt(p.x, p.z) + 0.75, p.z + Math.cos(p.h) * 0.3, 1, { spread: 0.15 }); if (p.w8 > 2.6) { p.cyc = V && V.n < V.items.length ? 5 : 1; p.w8 = 0; } }
    else if (p.cyc === 5) { const at = V.at(V.n), dx = at.x - V.c[0], dz = at.z - V.c[1], nrm = [V.dir[1], -V.dir[0]], side = ((lav[0] - V.c[0]) * nrm[0] + (lav[1] - V.c[1]) * nrm[1]) > 0 ? 1 : -1;
      const sx = at.x + nrm[0] * 0.42 * side, sz = at.z + nrm[1] * 0.42 * side; if (goTo(p, sx, sz, dt, 1.0)) { p.cyc = 6; p.w8 = 0; p.hang = Math.atan2(at.x - sx, at.z - sz); } }
    else if (p.cyc === 6) { faceTo(p, p.hang, dt); set(p, { sh: [-2.75, -2.75], el: [-0.35, -0.35], shy: [0.1, -0.1], hx: -0.35, k: Math.min(1, dt * 6) }); if (p.w8 > 1.2 && V.n < V.items.length && !p.hung) { V.items[V.n].visible = true; V.n++; p.hung = true; p.tool.visible = false; }
      if (p.w8 > 1.8) { p.cyc = 7; p.w8 = 0; p.hung = false; } }
    else { if (goTo(p, lav[0], lav[1], dt, 1.0)) { p.cyc = 1; p.w8 = 0; p.tool.visible = true; } } }

  // ---------- a beata: anda até o cruzeiro, faz o sinal da cruz, ajoelha e reza, levanta, entra na capela, sai e volta para casa
  function rezar(p, dt, t, k) { p.cyc = p.cyc ?? 0; p.w8 = (p.w8 ?? 0) + dt;
    if (p.cyc === 0) { if (goTo(p, crzStand[0], crzStand[1], dt, 0.85)) { p.cyc = 1; p.w8 = 0; } }
    else if (p.cyc === 1) { faceTo(p, crzFace, dt, 2); const s = p.w8;   // sinal da cruz: testa, peito, ombro esquerdo, ombro direito
      const at = s < 0.6 ? [-2.55, -2.45, 0.45] : s < 1.2 ? [-1.2, -2.15, 0.45] : s < 1.8 ? [-1.55, -2.35, 0.95] : s < 2.4 ? [-1.55, -2.35, -0.05] : [-0.9, -1.7, 0.4];
      set(p, { sh: [0, at[0]], el: [-0.3, at[1]], shy: [-0.15, at[2]], shz: [0.1, 0.05], hx: 0.12, k: Math.min(1, dt * 7) }); if (p.w8 > 2.8) { p.cyc = 2; p.w8 = 0; } }
    else if (p.cyc === 2) { const sway = Math.sin(t * 0.9) * 0.03, down = sm(0, 1.0, p.w8);   // ajoelhada, mãos postas, cabeça baixa
      set(p, { py: 0.95 - 0.43 * down, hp: [0.05, 0.05].map(v => v - 0.0 * down), kn: [1.55 * down, 1.55 * down], sp: 0.08 + sway, sh: [-1.05, -1.05], el: [-1.45, -1.45], shy: [0.62, -0.62], shz: [0.05, -0.05], hx: 0.45 + sway, k: Math.min(1, dt * 4) });
      if (p.w8 > 16) { p.cyc = 3; p.w8 = 0; } }
    else if (p.cyc === 3) { set(p, { k: Math.min(1, dt * 3) }); if (p.w8 > 1.2) { p.cyc = 4; p.w8 = 0; } }
    else if (p.cyc === 4) { if (goTo(p, chapelDoor[0], chapelDoor[1], dt, 0.85)) { p.cyc = 5; p.w8 = 0; p.g.visible = false; } }
    else if (p.cyc === 5) { p.g.visible = false; if (p.w8 > 25) { p.g.visible = true; p.cyc = 6; p.w8 = 0; } }
    else if (p.cyc === 6) { if (goTo(p, p.x0, p.z0, dt, 0.85)) { p.cyc = 7; p.w8 = 0; p.g.visible = false; } }
    else { p.g.visible = false; if (p.w8 > 20) { p.g.visible = true; p.cyc = 0; p.w8 = 0; } } }

  // ---------- a lição: a mãe no banquinho mostra a lousa, aponta, escreve, olha cada criança; as crianças na esteira
  // olham para ela, levantam a mão, cochicham uma com a outra
  let raised = -1, raiseT = 0;
  function licao(p, dt, t, k) { p.h = p.face; const c = (t * 0.07) % 1, look = raised >= 0 ? (raised - 1) * 0.35 : Math.sin(t * 0.5) * 0.45;
    const sit = { py: 0.47, hp: [-1.5, -1.45], kn: [1.45, 1.5] };
    if (c < 0.35) set(p, { ...sit, sh: [-1.25, -0.95], el: [-0.45, -0.75], shy: [0.25, -0.2], sp: 0.08, hy: look, hx: 0.05, k });   // mostra a lousa às crianças
    else if (c < 0.65) { const s = Math.sin(t * 6) * 0.06; set(p, { ...sit, sh: [-1.0, -1.15 + s], el: [-1.0, -1.15 + s], shy: [0.45, -0.5], sp: 0.2, hy: 0, hx: 0.35, k }); }   // escreve
    else set(p, { ...sit, sh: [-1.2, -1.45], el: [-0.5, -0.1], shy: [0.25, -0.1], sp: 0.05, hy: look, k });   // aponta
    if (p.extra) p.extra.rotation.x = c < 0.35 || c >= 0.65 ? -1.35 : -0.25; }
  function aluno(p, dt, t, k) { const base = Li.rot + Math.PI + (p.seat - 1) * 0.25; p.h = base;
    raiseT -= dt / 3; if (raiseT < 0 && rnd() < dt * 0.06) { raised = Math.floor(rnd() * 3); raiseT = 1; } if (raiseT < 0) raised = -1;
    const me = raised === p.seat, fidget = Math.sin(t * 0.7 + p.seat * 2) * 0.12, gossip = p.seat === 2 && (t % 23) < 3;
    set(p, { py: 0.15, hp: [-1.5, -1.45], kn: [0.55, 0.65], sp: 0.18 + fidget * 0.3, sy: gossip ? -0.3 : 0, sh: me ? [-0.5, -2.95] : [-0.75, -0.75], el: me ? [-0.6, -0.15] : [-0.9, -0.9], shy: me ? [0, 0] : [0.3, -0.3],
      hy: gossip ? -0.9 : fidget * 0.5, hx: me ? -0.15 : 0.1, k }); }

  // ---------- o pai no toco: pega uma acha da pilha, põe no toco, ergue o machado, golpeia (lascas voando, toc), as metades caem;
  // de tempos em tempos para, apoia no cabo e olha a lição (ou a criança que caiu), enxuga a testa e volta
  function machado(p, dt, t, k) { const Tk = L.toco; p.cyc = p.cyc ?? 0; p.w8 = (p.w8 ?? 0) + dt; p.logs = p.logs ?? 0; faceTo(p, p.face, dt);
    const lookAt = alert && Math.hypot(alert.x - p.x, alert.z - p.z) < 18 ? [alert.x, alert.z] : Li.p;
    if (alert && alert.t > 5.5 && p.cyc !== 5) { p.cyc = 5; p.w8 = 0; }
    if (p.cyc === 0) { set(p, { sp: 0.9, sh: [-1.3, -1.3], el: [-0.3, -0.3], hp: [-0.4, -0.2], kn: [0.6, 0.5], hx: 0.3, k: Math.min(1, dt * 5) });   // ajeita a acha no toco
      if (p.w8 > 1.2) { for (const h of Tk.halves) { h.position.set(0, 0.5, 0); h.rotation.set(0, h === Tk.halves[1] ? Math.PI : 0, 0); h.visible = true; } p.cyc = 1; p.w8 = 0; p.strikes = 0; if (L.lenha.n > 0) L.lenha.show(L.lenha.n - 1); } }
    else if (p.cyc === 1) { set(p, { sp: -0.15, sh: [-2.95, -2.95], el: [-0.35, -0.35], shy: [0.18, -0.18], hp: [-0.05, 0.1], kn: [0.1, 0.15], hx: -0.2, k: Math.min(1, dt * 5) }); if (p.w8 > 0.75) { p.cyc = 2; p.w8 = 0; } }   // ergue
    else if (p.cyc === 2) { set(p, { sp: 0.65, sh: [-0.75, -0.75], el: [-0.1, -0.1], shy: [0.18, -0.18], hp: [-0.25, 0.05], kn: [0.35, 0.3], hx: 0.4, k: Math.min(1, dt * 26) });   // golpe
      if (p.w8 > 0.14 && !p.hit) { p.hit = true; p.strikes++; const top = [Tk.p[0], heightAt(...Tk.p) + 0.95, Tk.p[1]]; emit('lasca', ...top, 6, { spread: 1, speed: 1.1 }); som('toc', Tk.p[0], Tk.p[1]);
        if (p.strikes >= 2) Tk.split = 0; }
      if (p.w8 > 0.45) { p.hit = false; p.w8 = 0; p.cyc = p.strikes >= 2 ? 3 : 1; } }
    else if (p.cyc === 3) { set(p, { sp: 0.25, sh: [-0.6, -0.6], el: [-0.3, -0.3], k });   // as metades tombam para os lados
      if (Tk.split != null) { Tk.split = Math.min(1, Tk.split + dt * 3); Tk.halves.forEach((h, i) => { const s = i ? -1 : 1; h.rotation.z = s * 1.45 * Tk.split; h.position.x = s * 0.22 * Tk.split; h.position.y = 0.5 - 0.35 * Tk.split; }); }
      if (p.w8 > 1.2) { p.cyc = 4; p.w8 = 0; p.logs++; } }
    else if (p.cyc === 4) { set(p, { sp: 1.0, sh: [-1.4, -1.4], el: [-0.2, -0.2], hp: [-0.5, -0.3], kn: [0.6, 0.5], k: Math.min(1, dt * 5) }); // junta as metades
      if (p.w8 > 1.0) { Tk.halves.forEach(h => h.visible = false); p.w8 = 0; p.cyc = (p.logs % 3 === 0 || L.lenha.n === 0) ? 5 : 0; } }
    else if (p.cyc === 5) { const e = Math.max(-1.2, Math.min(1.2, angTo(p.h, Math.atan2(lookAt[0] - p.x, lookAt[1] - p.z))));   // apoia no cabo e olha
      const wipe = p.w8 > 5 && p.w8 < 6.2;
      set(p, { sp: 0.05, sh: [-0.55, wipe ? -2.5 : -0.55], el: [-0.75, wipe ? -2.0 : -0.75], shy: [0.35, wipe ? 0.1 : -0.35], shz: [0.1, wipe ? 0.45 : -0.1], hy: e, hx: wipe ? -0.15 : 0.05, k: Math.min(1, dt * 4) });
      p.tool.rotation.x = -1.2; if (p.w8 > (L.lenha.n === 0 ? 14 : 8)) { p.cyc = 0; p.w8 = 0; p.tool.rotation.x = 0; } }
    if (p.cyc !== 5) p.tool.rotation.x = 0; }

  // ---------- o lenhador: vai à mata, junta gravetos e galhos caídos (o feixe cresce no ombro), volta e empilha
  function lenha(p, dt, t, k) { p.cyc = p.cyc ?? 0; p.w8 = (p.w8 ?? 0) + dt; const fx = p.extra;
    if (p.cyc === 0) { fx.visible = false; if (goTo(p, gather[0] + Math.sin(p.ph * 9) * 1.5, gather[1] + Math.cos(p.ph * 9) * 1.5, dt, 1.15)) { p.cyc = 1; p.w8 = 0; p.picks = 0; } }
    else if (p.cyc === 1) { const c = p.w8 % 2.2, down = c < 1.2; set(p, { sp: down ? 1.15 : 0.1, sh: down ? [-1.55, -1.45] : [-0.5, -0.4], el: [-0.2, -0.25], hp: down ? [-0.45, -0.25] : [0, 0], kn: down ? [0.55, 0.4] : [0, 0], hx: down ? 0.3 : 0, k: Math.min(1, dt * 5) });
      if (!down && !p.got) { p.got = true; p.picks++; fx.visible = true; fx.scale.set(1, 0.4 + p.picks * 0.15, 0.4 + p.picks * 0.15); emit('poeira', p.x + Math.sin(p.h) * 0.6, heightAt(p.x, p.z) + 0.05, p.z + Math.cos(p.h) * 0.6, 2, { spread: 0.4, speed: 0.4 }); p.h += (rnd() - 0.5) * 1.5; }
      if (down) p.got = false; if (p.picks >= 4) { p.cyc = 2; p.w8 = 0; } }
    else if (p.cyc === 2) { fx.visible = true; if (goTo(p, pileStand[0], pileStand[1], dt, 0.95)) { p.cyc = 3; p.w8 = 0; } else { p.arms[1].sh.rotation.x = -2.6; p.arms[1].el.rotation.x = -1.55; p.arms[1].sh.rotation.z = -0.2; p.spine.rotation.x = 0.12; } }
    else if (p.cyc === 3) { faceTo(p, Lp.rot + Math.PI, dt); set(p, { sp: 0.8, sh: [-1.3, -1.3], el: [-0.3, -0.3], hp: [-0.3, -0.2], kn: [0.4, 0.3], k: Math.min(1, dt * 5) });
      if (p.w8 > 0.9 && fx.visible) { fx.visible = false; L.lenha.show(L.lenha.n + 4); emit('poeira', Lp.p[0], heightAt(...Lp.p) + 0.1, Lp.p[1], 4, { spread: 0.6, speed: 0.5 }); }
      if (p.w8 > 1.6) { p.cyc = 4; p.w8 = 0; } }
    else { set(p, { k }); if (p.w8 > 3 + rnd() * 2) { p.cyc = L.lenha.n >= 20 ? 4 : 0; p.w8 = 0; } } }

  // ---------- pega-pega em volta do poço: um foge num rumo que muda, o outro corre atrás; quem é pego conta até três;
  // às vezes um tropeça e cai (o outro vem ver)
  function pega(p, dt, t) { const o = p.mate; if (!o) { const rr = p.rad || 2.6, a = time * 1.3 * 2.6 / rr + p.k; goTo(p, p.x0 + Math.cos(a) * rr, p.z0 + Math.sin(a) * rr, dt, 3.2); return; }
    if (o.fallT != null) { const d = Math.hypot(o.x - p.x, o.z - p.z); if (d > 1.1) goTo(p, o.x, o.z, dt, 1.6); else { faceTo(p, Math.atan2(o.x - p.x, o.z - p.z), dt); set(p, { sp: 0.35, hx: 0.4, sh: [-0.3, -0.3], k: Math.min(1, dt * 5) }); } return; }
    if (p.wait > 0) { p.wait -= dt; set(p, { sp: 0.2, sh: [-0.2, -2.6], el: [-0.3, -2.1], hx: 0.3, k: Math.min(1, dt * 6) }); return; }   // conta com a mão no rosto
    let tx, tz, sp; if (p.it) { tx = o.x; tz = o.z; sp = 3.1; } else { const a = time * 0.45 + p.k + Math.sin(time * 0.31) * 2, r = 3.2 + Math.sin(time * 0.7 + p.k) * 1.4; tx = p.x0 + Math.cos(a) * r; tz = p.z0 + Math.sin(a) * r; sp = o.wait > 0 ? 1.4 : 2.8; }
    if (Math.hypot(tx - W.p[0], tz - W.p[1]) < 2.2) { const a = Math.atan2(tz - W.p[1], tx - W.p[0]); tx = W.p[0] + Math.cos(a) * 2.3; tz = W.p[1] + Math.sin(a) * 2.3; }
    goTo(p, tx, tz, dt, sp); p.lastSpeed = sp; p.running = sp > 2;
    if (p.it && Math.hypot(o.x - p.x, o.z - p.z) < 0.55) { p.it = false; o.it = true; o.wait = 1.6; }
    if (sp > 2 && rnd() < dt * 0.035) fall(p); }

  // ---------- bola na praça: quem está mais perto da bola corre até ela e chuta para o outro (com erro); o outro espera
  // de frente para a bola; a bola corre, quica, bate no coreto
  function bola(p, dt, t, k) { const o = p.mate, b = ball; if (!b || !o) return;
    const mine = !o || (Math.hypot(b.x - p.x, b.z - p.z) < Math.hypot(b.x - o.x, b.z - o.z) && b.last !== p) || (b.last === o && Math.hypot(b.vx, b.vz) < 0.5 && Math.hypot(b.x - p.x, b.z - p.z) < Math.hypot(b.x - o.x, b.z - o.z) + 2);
    if (p.kick > 0) { p.kick -= dt; const s = p.kick > 0.18; set(p, { sp: s ? -0.1 : 0.2, hp: [0.05, s ? 0.6 : -1.1], kn: [0.15, s ? 1.0 : 0.15], sh: [-0.6, 0.4], el: [-0.5, -0.4], k: Math.min(1, dt * 20) });
      if (!s && !p.kicked) { p.kicked = true; const dx = o.x - b.x, dz = o.z - b.z, d = Math.hypot(dx, dz) || 1, err = (rnd() - 0.5) * 0.5, a = Math.atan2(dx, dz) + err, v = Math.min(7.5, 2.2 + d * 0.75);
        b.vx = Math.sin(a) * v; b.vz = Math.cos(a) * v; b.vy = 0.8 + rnd() * 2.2; b.last = p; som('bola', b.x, b.z, 0.7); emit('poeira', b.x, b.y - b.r, b.z, 3, { spread: 0.4, speed: 0.5 }); }
      return; }
    p.kicked = false;
    if (mine && b.last !== p) { const ax = b.x - Math.sin(Math.atan2(o.x - b.x, o.z - b.z)) * 0.35, az = b.z - Math.cos(Math.atan2(o.x - b.x, o.z - b.z)) * 0.35;   // chega por trás da bola
      if (Math.hypot(b.x - p.x, b.z - p.z) < 0.5 && b.y < heightAt(b.x, b.z) + b.r + 0.3) { p.h = Math.atan2(o.x - p.x, o.z - p.z); p.kick = 0.35; }
      else { goTo(p, ax, az, dt, 3.0); p.lastSpeed = 3; p.running = true; if (rnd() < dt * 0.025) fall(p); } }
    else { const want = Math.atan2(b.x - p.x, b.z - p.z); faceTo(p, want, dt, 6); const h = Math.sin(t * 7) * 0.02;   // espera, pulando de um pé no outro
      set(p, { py: 0.93 + h, sp: 0.12, sh: [-0.3, -0.3], el: [-0.9, -0.9], hp: [-0.1, -0.05], kn: [0.2, 0.15], hx: 0.15, k });
      const dk = Math.hypot(p.x - p.x0, p.z - p.z0); if (dk > 7.5) goTo(p, p.x0 + (p.x - p.x0) * 0.8, p.z0 + (p.z - p.z0) * 0.8, dt, 1.4); } }

  return { update(dt) { for (const f of updaters) f(dt); }, people, ball, arrive, startle() { scare = 2.2; kidsHome = 15; } };
}
