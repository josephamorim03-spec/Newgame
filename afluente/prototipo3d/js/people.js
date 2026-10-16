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
// Na lagoa, as crianças nadam cachorrinho, pulam da beira (de bomba ou de braços para cima), pescam com linha, boia e
// peixe, e brincam na margem, conforme a hora; o pescador do olho-d'água também tem linha e peixe.
// Corpo articulado (quadril, coluna, cabeça, ombro, cotovelo, coxa, joelho) em tamanho real, com variações de altura,
// porte, cor de pele, cabelo e roupa (camisa lisa ou xadrez, camiseta, vestido de chita, blusa e saia, avental, calça de
// brim, chapéu de palha, chapéu de couro, boné, lenço).
import * as THREE from 'three';
import { U } from './mat.js';
import { mat, paint, merge, col } from './props.js';
import { tag } from './regua.js';
import { LAYOUT, TILES, heightAt, waterDist, waterLevelAt, inHex, SPRING, POOL_R, blocked, LAKE, lakeDist } from './world.js';
import { chitaTexture, xadrezTexture, tramaTexture } from './textures.js';
import { buildBody } from './body.js';
import { Saia, Pano, Varal } from './pano.js';
import { perfil, criarRig, passada, comprimentoPasso } from './anatomia.js';

const rnd = (() => { let a = 31337; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();
const pick = a => a[Math.floor(rnd() * a.length)];
const SKIN = [0xf0c8a4, 0xdba57c, 0xc18456, 0x9a623e, 0x6e4430, 0x4e3022];
const HAIR = [0x16120e, 0x2a1c12, 0x4a2e1a, 0x6a4a2a];
const K = ['position', 'normal', 'uv', 'color'];
const ROD_L = 2.6, ROD_A = 0.75;   // vara de pesca: comprimento e o ângulo em que sai da mão
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const angTo = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

export function buildPeople(scene, { mobile = false, fx = null, afx = null, col: colisao = null, peixes = null } = {}) {
  const T = tex => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(3, 2); return mat({ map: t, vertexColors: true }, { rim: '2.2', frag: 'diffuseColor.rgb*=mix(1.0,0.8,uWet);' }); };
  const MAT = { liso: mat({ vertexColors: true }, { rim: '2.2' }), trama: T(tramaTexture(53)),
    chita: ['#c8382a', '#2f6aa0', '#e0a020', '#3a8a4a', '#7a3a8a'].map((b, i) => T(chitaTexture(60 + i, b))),
    xadrez: [['#b83a2a', '#1e1a18', '#f0e8d8'], ['#2f5a9a', '#14202e', '#e8eef4'], ['#3a7a4a', '#1a2a1a', '#f0d070'], ['#8a5a2a', '#2a1a10', '#f0e0c0']].map(([a, b, c], i) => T(xadrezTexture(a, b, c, 70 + i))) };
  const people = [], updaters = [];
  const emit = (...a) => { if (fx) fx.emit(...a); };

  // ---------- sons curtos do lugar (machado no toco, sino da capela, bola), só depois do primeiro toque na tela
  function som(kind, x, z, vol = 1) { const S = window.__som, ac = S ? S.ctx : window.__audioCtx, dest = S && S.out ? S.out : ac && ac.destination, cam = window.__cam; if (!ac || !cam) return; const d = Math.hypot(cam.position.x - x, cam.position.y, cam.position.z - z), g0 = vol * Math.min(1, 40 / (d + 10)) * 0.5; if (g0 < 0.01) return;
    const t0 = ac.currentTime, out = ac.createGain(); out.connect(dest);
    if (kind === 'rangido') { const o = ac.createOscillator(), bp = ac.createBiquadFilter(), gg = ac.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(210, t0); o.frequency.linearRampToValueAtTime(130, t0 + 0.55);
      bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 5; gg.gain.setValueAtTime(0, t0); for (let i = 0; i < 9; i++) { gg.gain.linearRampToValueAtTime(g0 * 0.35 * (0.5 + Math.random() * 0.5), t0 + i * 0.06 + 0.02); gg.gain.linearRampToValueAtTime(g0 * 0.05, t0 + i * 0.06 + 0.05); }
      gg.gain.linearRampToValueAtTime(0, t0 + 0.6); o.connect(bp); bp.connect(gg); gg.connect(out); o.start(t0); o.stop(t0 + 0.62); return; }
    if (kind === 'sino') { for (const [f, a, dec] of [[392, 0.5, 3.5], [784, 0.25, 2.2], [940, 0.18, 1.6], [1176, 0.1, 1.0], [196, 0.2, 4]]) { const o = ac.createOscillator(), gg = ac.createGain(); o.frequency.value = f; gg.gain.setValueAtTime(g0 * a, t0); gg.gain.exponentialRampToValueAtTime(0.0001, t0 + dec); o.connect(gg); gg.connect(out); o.start(t0); o.stop(t0 + dec); } return; }
    const n = ac.createBuffer(1, ac.sampleRate * 0.25, ac.sampleRate), d0 = n.getChannelData(0); for (let i = 0; i < d0.length; i++) d0[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * (kind === 'toc' ? 0.03 : 0.015)));
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(); src.buffer = n; f.type = 'lowpass'; f.frequency.value = kind === 'toc' ? 900 : kind === 'trinco' ? 2600 : 600; out.gain.value = g0 * (kind === 'toc' ? 1.4 : kind === 'trinco' ? 1.1 : 0.8); src.connect(f); f.connect(out); src.start(t0); }

  // ---------- montar uma pessoa: corpo de malha única com esqueleto (body.js), saia e avental de pano, cabelo, chapéu e ferramenta
  const clothes = [];
  function person(s) {
    const g = new THREE.Group(), texOf = m => (m && m !== MAT.trama && m.map) ? m.map : null;
    g.rotation.order = 'YXZ';   // primeiro vira para onde vai, depois tomba para a frente (o tombo da criança)
    const spec = { footwear: s.footwear ?? (s.sex === 'c' ? pick(['chinelo', 'chinelo', 'descalco']) : s.sex === 'f' ? pick(['sapato', 'chinelo', 'sapato']) : pick(['botina', 'botina', 'sapato'])), grip: ['enxada', 'machado', 'vassoura', 'pa', 'serrote', 'vara'].includes(s.tool),
      shirt: s.shirt ?? (s.sex === 'm' && rnd() < 0.3 ? 'camiseta' : 'camisa'), eyes: pick([0x3a2214, 0x4a2a14, 0x2a1a10, 0x5a3a1a, 0x3a4a2a]), ...s, top: { color: s.top.color, tex: texOf(s.top.mat) }, bottom: { color: s.bottom.color, tex: texOf(s.bottom.mat) },
      pants: s.sex === 'c' && !s.dress ? 'bermuda' : 'longa', beard: s.sex === 'm' ? (s.beard ?? pick(['bigode', null, null, 'barba', 'bigode'])) : null,
      lencoColor: pick([0xc83a2a, 0x2f6aa0, 0xe0a020, 0xf4efe6, 0x7a3a8a]) };
    spec.perfil = perfil(spec, rnd);   // o corpo de cada um (anatomia.js): peso, gordura, músculo, ossatura, postura
    const body = buildBody(spec); g.add(body.mesh);
    // o corpo de agasalho (casaco ou xale) é montado depois, um por quadro, sem travar a abertura do vale
    const warmSpec = s.sex === 'c' ? null : { ...spec, warm: true, warmColor: s.sex === 'f' ? pick([0x8a4a3a, 0x6a5a8a, 0x4a6a5a, 0xa8743a]) : pick([0x5a4a3a, 0x3a4a5a, 0x6a6458]) }, warmGeo = null;
    const coolGeo = body.mesh.geometry;
    const { hips: pelvis, spine, head } = body, arms = body.arms, legs = body.legs, rig = criarRig(body, spec.perfil);
    const lisoT = (geo, c) => { const m = new THREE.Mesh(geo, MAT.liso); paint(geo, col(c)); m.castShadow = true; m.userData.noRegua = true; return m; };
    // ferramenta na mão da ferramenta (arms[1]) e o que vai na outra mão ou no ombro
    // ferramenta: as de cabo comprido (enxada, machado, vassoura, pá do forno) vão nas duas mãos — o cabo sai da mão de
    // baixo e passa pela outra (alinhado a cada quadro); as de uma mão (serrote, vara, balaio, pano) ficam presas na mão
    const tool = new THREE.Group(); arms[1].ha.add(tool); tool.position.set(0, -0.05, 0.01);
    const T2 = (geo, c, to = tool) => to.add(lisoT(geo, c));
    const wood = 0x9a7650, iron = 0x5e6266, edge = 0xc4c8cc;
    let two = null;   // { g, hand: índice da mão de baixo, len, blade: 'tras'|'frente'|'lado'|null, off }
    const longTool = (len, blade, off = -0.06) => { const tg = new THREE.Group(); g.add(tg); two = { g: tg, len, blade, off }; return tg; };
    if (s.tool === 'enxada') { const tg = longTool(1.42, 'tras', -0.05);
      T2(new THREE.CylinderGeometry(0.017, 0.02, 1.42, 7).translate(0, 0.71, 0), wood, tg);                                     // cabo
      T2(new THREE.CylinderGeometry(0.03, 0.03, 0.075, 8).translate(0, 1.4, 0), iron, tg);                                     // olho
      const bl = new THREE.BoxGeometry(0.19, 0.006, 0.2, 4, 1, 2), q = bl.attributes.position; for (let k = 0; k < q.count; k++) { const x = q.getX(k) + 0.095; q.setZ(k, q.getZ(k) * (0.55 + 0.45 * x / 0.19)); q.setX(k, x); }
      bl.rotateZ(-0.42).translate(0.012, 1.39, 0); T2(bl, iron, tg);                                                            // lâmina larga, inclinada para o cabo
      T2(new THREE.BoxGeometry(0.02, 0.008, 0.2).rotateZ(-0.42).translate(0.186, 1.31, 0), edge, tg); }                        // fio gasto, brilhando
    if (s.tool === 'machado') { const tg = longTool(0.88, 'frente', -0.04);
      const hc = new THREE.CylinderGeometry(0.017, 0.021, 0.88, 7, 4), q = hc.attributes.position; for (let k = 0; k < q.count; k++) q.setX(k, q.getX(k) + Math.sin(q.getY(k) / 0.88 * Math.PI) * 0.012); T2(hc.translate(0, 0.44, 0), wood, tg);
      const hd = new THREE.BoxGeometry(0.17, 0.1, 0.036, 4, 2, 1), r = hd.attributes.position; for (let k = 0; k < r.count; k++) { const x = r.getX(k) + 0.04; r.setZ(k, r.getZ(k) * Math.max(0.15, 1 - Math.max(0, x) / 0.13)); r.setY(k, r.getY(k) * (1 + Math.max(0, x) * 2.5)); r.setX(k, x); }
      T2(hd.translate(0, 0.83, 0), iron, tg); T2(new THREE.BoxGeometry(0.012, 0.15, 0.008).translate(0.162, 0.83, 0), edge, tg); }
    if (s.tool === 'vassoura') { const tg = longTool(1.3, 'lado', -0.02);   // vassoura de piaçava: cabo e o leque de fibras
      T2(new THREE.CylinderGeometry(0.014, 0.014, 1.12, 6).translate(0, 0.56, 0), 0xb08a5a, tg); T2(new THREE.BoxGeometry(0.06, 0.05, 0.05).translate(0, 1.12, 0), 0x6a4a2a, tg);
      const fb = new THREE.BoxGeometry(0.3, 0.26, 0.045, 6, 4, 1), q = fb.attributes.position; for (let k = 0; k < q.count; k++) { const y = q.getY(k) + 0.13; q.setX(k, q.getX(k) * (0.4 + 0.6 * y / 0.26)); q.setZ(k, q.getZ(k) * (1 - 0.5 * y / 0.26)); q.setY(k, y + Math.sin(q.getX(k) * 40) * 0.008); }
      T2(fb.translate(0, 1.13, 0), 0x7a5232, tg); }
    if (s.tool === 'pa') { const tg = longTool(1.7, 'lado', -0.05);   // pá de madeira da padeira, comprida
      T2(new THREE.CylinderGeometry(0.016, 0.016, 1.45, 6).translate(0, 0.72, 0), 0xb89068, tg); const bl = new THREE.CylinderGeometry(0.17, 0.17, 0.012, 16).scale(1, 1, 1.15).rotateX(Math.PI / 2).rotateY(Math.PI / 2); T2(bl.translate(0, 1.6, 0), 0xc8a070, tg); }
    if (s.tool === 'serrote') { T2(new THREE.BoxGeometry(0.03, 0.11, 0.09).translate(0, -0.03, 0.04), 0x8a5a3a); const bl = new THREE.BoxGeometry(0.004, 0.1, 0.5), q = bl.attributes.position; for (let k = 0; k < q.count; k++) if (q.getY(k) > 0) q.setY(k, q.getY(k) - (q.getZ(k) + 0.25) * 0.08);
      T2(bl.translate(0, -0.06, 0.33), 0xb8bcc0); }
    if (s.tool === 'vara') { const rg = new THREE.CylinderGeometry(0.007, 0.015, ROD_L, 5, 14).translate(0, ROD_L / 2, 0), rod = lisoT(rg, 0x8a7a4a);   // vara de bambu: enverga (pesca)
      rod.rotation.x = ROD_A; rod.userData.rest = Float32Array.from(rod.geometry.attributes.position.array); tool.add(rod); tool.userData.rod = rod; }
    if (s.tool === 'balaio') { const b = new THREE.CylinderGeometry(0.2, 0.15, 0.25, 16, 3, true), q = b.attributes.position; for (let k = 0; k < q.count; k++) { const a = Math.atan2(q.getX(k), q.getZ(k)); const w = 1 + 0.03 * Math.sin(a * 16) * Math.sin(q.getY(k) * 60); q.setX(k, q.getX(k) * w); q.setZ(k, q.getZ(k) * w); }
      T2(b.translate(0.18, -0.08, 0), 0xb08a52); T2(new THREE.CircleGeometry(0.15, 14).rotateX(Math.PI / 2).translate(0.18, -0.2, 0), 0x9a7442); T2(new THREE.TorusGeometry(0.2, 0.012, 5, 18).rotateX(Math.PI / 2).translate(0.18, 0.045, 0), 0x8a6a3a); }
    if (s.tool === 'pano') { const c = pick([0xf4f0e8, 0xc8382a, 0x2f6aa0, 0xe0a020]); const pg = new THREE.PlaneGeometry(0.2, 0.34, 3, 6), q = pg.attributes.position; for (let k = 0; k < q.count; k++) q.setZ(k, Math.sin(q.getY(k) * 18) * 0.012 + Math.sin(q.getX(k) * 20) * 0.006);
      const m = lisoT(pg.translate(0, -0.17, 0.02), c); m.material = MAT.pano || (MAT.pano = mat({ vertexColors: true, side: THREE.DoubleSide }, { rim: '2.2' })); tool.add(m); }
    const extra = new THREE.Group(); extra.visible = !!s.extra;
    if (s.extra === 'lousa') { arms[0].ha.add(extra); extra.position.set(0, -0.08, 0.06); extra.add(lisoT(new THREE.BoxGeometry(0.34, 0.025, 0.25), 0x8a6a4a), lisoT(new THREE.BoxGeometry(0.3, 0.03, 0.21), 0x2a3430)); extra.rotation.x = -0.2; }
    if (s.extra === 'feixe') { body.chest.add(extra); extra.position.set(0.14, 1.43 - body.chestY, -0.005); for (let i = 0; i < 9; i++) extra.add(lisoT(new THREE.CylinderGeometry(0.02 + (i % 3) * 0.006, 0.022, 1.3 + (i % 4) * 0.12, 5).rotateX(Math.PI / 2).translate(((i % 3) - 1) * 0.045, Math.floor(i / 3) * 0.04, (i % 2) * 0.1), 0x8a6a4a)); extra.rotation.y = 0.25; extra.visible = false; }
    tool.traverse(o => { o.userData.noRegua = true; }); extra.traverse(o => { o.userData.noRegua = true; });
    let lata = null; if (s.tool === 'lata') { lata = new THREE.Group(); head.add(lata); lata.position.set(0, body.topoCabeca + 0.002, 0.005);   // lata de querosene reaproveitada, com alça de arame, sobre a rodilha de pano
      lata.add(lisoT(new THREE.BoxGeometry(0.24, 0.34, 0.24).translate(0, 0.19, 0), 0xb8bcc0), lisoT(new THREE.TorusGeometry(0.075, 0.03, 6, 14).rotateX(Math.PI / 2).translate(0, 0.012, 0), 0xe8d8c0), lisoT(new THREE.TorusGeometry(0.1, 0.004, 4, 12, Math.PI).translate(0, 0.36, 0), 0x6a6e72), lisoT(new THREE.CircleGeometry(0.11, 12).rotateX(-Math.PI / 2).translate(0, 0.33, 0), 0x6aa8c0)); }
    // saia e avental: pano simulado (pano.js) preso na cintura medida do corpo (a casca da roupa naquele anel)
    const cl = [], md = body.medidas;
    if (s.skirt && md.saia) { const len = s.sex === 'c' ? 0.36 : s.skirt <= 0.56 ? 0.5 : s.skirt <= 0.7 ? 0.62 : 0.82;
      const t = texOf(s.dress ? s.top.mat : s.bottom.mat), tex = t ? Object.assign(t.clone(), { needsUpdate: true }) : null; if (tex) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, 1); }
      cl.push(Saia({ cint: md.saia, len, flare: 0.1 + len * 0.1, strips: mobile ? 16 : 24, rows: mobile ? 8 : 10, tecido: 'chita', tex, color: tex ? 0xffffff : (s.dress ? s.top.color : s.bottom.color), folga: 0.006, perfil: md.perfil })); }
    if (s.apron) { const c = md.saia || { y: md.cintura.y, cz: md.cintura.cz, R: Array.from({ length: 32 }, (_, k) => { const a = k / 32 * Math.PI * 2; return Math.hypot(md.cintura.rx * Math.cos(a), (Math.sin(a) > 0 ? md.cintura.rzF : md.cintura.rzB) * Math.sin(a)); }) };
      cl.push(Saia({ cint: c, len: s.skirt ? 0.5 : 0.55, flare: 0.05, arco: [Math.PI / 2 - 0.85, Math.PI / 2 + 0.85], strips: 8, rows: 7, tecido: 'algodao', color: 0xf2ede2, folga: md.saia ? 0.022 : 0.012, cair: 0.005, perfil: md.saia ? md.perfil.map(r => ({ ...r, R: r.R.map(x => x + 0.02) })) : md.perfil })); }
    for (const c of cl) { scene.add(c.mesh); clothes.push(c); }
    g.scale.setScalar(s.h / 1.70);
    const P = { g, body: body.mesh, warmGeo, warmSpec, coolGeo, warm: false, pelvis, spine, head, arms, legs, tool, two, lids: body.lids, swing: body.swing, blinkT: 2 + rnd() * 4, extra, lata, s, cloth: cl, waistY: body.waistY, bw: body.bw, x: 0, z: 0, h: 0, ph: rnd() * 6, t: 0, st: 'post', sit: 0, pitch: 0,
      rig, perfil: spec.perfil, corpo: body, med: body.medidas };
    P.rest = () => { rig.restore(); const saved = [pelvis.position.y, spine.rotation.x, g.rotation.x, ...arms.flatMap(a => [a.sh.rotation.x, a.el.rotation.x]), ...legs.flatMap(l => [l.hp.rotation.x, l.kn.rotation.x])];
      pelvis.position.y = rig.restY; spine.rotation.x = 0; g.rotation.x = 0; for (const a of arms) a.sh.rotation.x = a.el.rotation.x = 0; for (const l of legs) l.hp.rotation.x = l.kn.rotation.x = 0;
      return () => { let i = 0; pelvis.position.y = saved[i++]; spine.rotation.x = saved[i++]; g.rotation.x = saved[i++]; for (const a of arms) { a.sh.rotation.x = saved[i++]; a.el.rotation.x = saved[i++]; } for (const l of legs) { l.hp.rotation.x = saved[i++]; l.kn.rotation.x = saved[i++]; } }; };
    g.userData.reguaRest = P.rest; tag(g, s.sex === 'c' ? 'criança' : s.sex === 'f' ? 'mulher' : 'homem');
    scene.add(g); return P;
  }
  // o pano anda junto: preso na cintura, bate nas coxas, nas canelas e no quadril (cápsulas do tamanho do corpo de cada um),
  // cai no chão, o vento sopra; e o pano que a lavadeira tem na mão
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _e = new THREE.Vector3(), _f = new THREE.Vector3(), _vt = new THREE.Vector3();
  const ventoAgora = (x, z, k = 1) => { const wv = U.uWindBase.value * (1 + U.uWindIu.value * 0.6), wd = U.uWindDir.value, t = time * 1.7 + x * 0.3 + z * 0.2, raj = 1 + 0.45 * Math.sin(t) * Math.sin(t * 2.3 + 1.1);
    return _vt.set(wd.x * wv * raj * k, 0.15 * Math.sin(t * 3.1) * wv * k, wd.y * wv * raj * k); };
  function stepCloth(p, dt) {
    if (!p.cloth.length && !p.panoMao) return;
    const cam = window.__cam, far = cam ? Math.hypot(cam.position.x - p.x, cam.position.y, cam.position.z - p.z) : 0, lim = [70, 45, 28][window.__Q ? window.__Q() : 0];
    if (far > lim) { p.clothSkip = (p.clothSkip || 0) + dt; if (p.clothSkip < 0.5) return; dt = Math.min(p.clothSkip, 1 / 30); p.clothSkip = 0; } const vis = p.g.visible; for (const c of p.cloth) c.mesh.visible = vis; if (p.panoMao) p.panoMao.mesh.visible = vis;
    if (!vis) { for (const c of p.cloth) c.reset(); return; }
    p.g.updateMatrixWorld(true); const sc = p.g.scale.x, md = p.med;
    p.legs[0].hp.getWorldPosition(_a); p.legs[0].kn.getWorldPosition(_b); p.legs[0].ft.getWorldPosition(_c); p.legs[1].hp.getWorldPosition(_d); p.legs[1].kn.getWorldPosition(_e); p.legs[1].ft.getWorldPosition(_f);
    // só as pernas: o quadril e a nádega são o perfil do próprio corpo (medidas.perfil, dentro do pano). Uma cápsula entre as
    // juntas do quadril (0,72 da meia-largura, com as pontas para fora das juntas) chegava a ~25 cm do centro, mais larga que
    // o corpo, e estufava a saia dos lados como um barril
    const cap = [[_a, _b, md.coxa * sc], [_b, _c, md.canela * sc], [_d, _e, md.coxa * sc], [_e, _f, md.canela * sc]];
    const env = { cap, chao: heightAt, vento: ventoAgora(p.x, p.z, 0.35), it: 4 };   // roupa vestida: o corpo abriga e perto do chão venta menos
    for (const c of p.cloth) c.passo(Math.min(dt, 1 / 30), p.pelvis.matrixWorld, env);
    if (p.panoMao) maoPano(p, Math.min(dt, 1 / 30));
  }
  // ---------- ferramenta de cabo nas duas mãos: o cabo sai da palma de baixo e passa pela palma de cima; a lâmina vira para
  // o lado certo (a enxada para quem capina, o machado para a frente, a vassoura e a pá de lado). Andando, vai no ombro.
  const _e0 = new THREE.Vector3(), _e1 = new THREE.Vector3(), _g0 = new THREE.Vector3(), _g1 = new THREE.Vector3(), _ax = new THREE.Vector3(), _bx = new THREE.Vector3(), _cz = new THREE.Vector3(), _rf = new THREE.Vector3(), _M = new THREE.Matrix4();
  const palm = (a, out, tmp) => { a.ha.getWorldPosition(out); a.el.getWorldPosition(tmp); return out.addScaledVector(tmp.sub(out).normalize(), -0.065); };
  // Só no trabalho (p.grip2) o cabo vai de uma mão à outra. Fora dele: andando, no ombro; agachado ou com as duas mãos
  // ocupadas (p.toolDown), deitada no chão ao lado; parado (conversando, olhando, descansando), em pé com a lâmina no
  // chão e a mão da ferramenta no alto do cabo, o resto do corpo livre para gesticular.
  // antes do solucionador: o braço da ferramenta no ombro (andando) ou no alto do cabo (parado)
  function modoFerr(p) { const T = p.two; if (!T) return null;
    const carry = p.moving && !p.running && p.job !== 'lab', mode = carry ? 'ombro' : p.grip2 ? 'maos' : p.toolDown ? 'chao' : 'pe';
    const a1 = p.arms[1];
    if (mode === 'ombro') { a1.sh.rotation.x = -2.25; a1.el.rotation.x = -2.1; a1.sh.rotation.z = -0.15; a1.sh.rotation.y = 0.35; }
    else if (mode === 'pe') { a1.sh.rotation.x = -0.28; a1.sh.rotation.z = 0.24; a1.sh.rotation.y = 0.25; a1.el.rotation.x = -1.0; }
    return mode; }
  // depois do solucionador: o cabo vai de uma palma à outra (ou ao ombro, ou ao chão) e as mãos fecham em volta dele
  const _ew = new THREE.Vector3();
  function alignTool(p, mode) { const T = p.two; if (!T || !p.g.visible || !mode) return;
    const a1 = p.arms[1];
    p.g.updateMatrixWorld(true); palm(a1, _g0, _e0); palm(p.arms[0], _g1, _e1); p.g.worldToLocal(_g0); p.g.worldToLocal(_g1);
    if (mode === 'chao') {   // deitada na grama, do lado da mão da ferramenta, a lâmina de chapa
      _ax.set(0.12, 0, 1).normalize(); _rf.set(1, 0, 0); _bx.copy(_rf).addScaledVector(_ax, -_rf.dot(_ax)).normalize(); _cz.crossVectors(_bx, _ax);
      _M.makeBasis(_bx, _ax, _cz); T.g.quaternion.setFromRotationMatrix(_M); T.g.position.set(0.48, 0.03, -T.len * 0.45); return; }
    if (mode === 'pe') {     // em pé: o cabo desce da mão até a lâmina no chão, o alto um pouco inclinado para o corpo
      _ax.set(0.06, -1, 0.1).normalize(); const tp = Math.max(0, T.len - _g0.y / -_ax.y);
      if (T.blade === 'tras') _rf.set(0, 0, 1); else if (T.blade === 'frente') _rf.set(0, 0, 1); else _rf.set(1, 0, 0);
      _bx.copy(_rf).addScaledVector(_ax, -_rf.dot(_ax)).normalize(); _cz.crossVectors(_bx, _ax);
      _M.makeBasis(_bx, _ax, _cz); T.g.quaternion.setFromRotationMatrix(_M); T.g.position.copy(_g0).addScaledVector(_ax, -tp); _ew.copy(_ax).transformDirection(p.g.matrixWorld); p.rig.alinhaMao(1, _ew); return; }
    if (mode === 'ombro') _ax.set(-0.25, 0.45, -0.86).normalize();
    else { _ax.subVectors(_g1, _g0); const d = _ax.length(); p.arms[0].sh.getWorldPosition(_e0); a1.sh.getWorldPosition(_e1); p.g.worldToLocal(_e0); p.g.worldToLocal(_e1);
      const sm = _e0.add(_e1).multiplyScalar(0.5); _rf.copy(_g0).add(_g1).multiplyScalar(0.5).sub(sm).normalize();   // do meio dos ombros para as mãos
      if (d < 0.2) _ax.copy(_rf); else { _ax.divideScalar(d); if (d < 0.3) _ax.lerp(_rf, (0.3 - d) / 0.1).normalize(); } }   // mãos juntas (machado): o cabo segue os braços
    if (T.blade === 'tras') _rf.set(0, -0.3, -1); else if (T.blade === 'frente') _rf.set(0, 0.2, 1); else _rf.set(1, 0, 0);
    _bx.copy(_rf).addScaledVector(_ax, -_rf.dot(_ax)); if (_bx.lengthSq() < 1e-4) _bx.set(0, 1, 0).addScaledVector(_ax, -_ax.y); _bx.normalize(); _cz.crossVectors(_bx, _ax);
    _M.makeBasis(_bx, _ax, _cz); T.g.quaternion.setFromRotationMatrix(_M); T.g.position.copy(_g0).addScaledVector(_ax, T.off);
    _ew.copy(_ax).transformDirection(p.g.matrixWorld); p.rig.alinhaMao(1, _ew); if (mode === 'maos') p.rig.alinhaMao(0, _ew); }
  // piscar (cada um no seu tempo) e o rabo de cavalo/trança que pende para baixo e balança com o passo
  const _q = new THREE.Quaternion(), _dn = new THREE.Vector3(), DOWN = new THREE.Vector3(0, -1, 0);
  function face(p, dt) { if (p.lids) { p.blinkT -= dt; if (p.blinkT < 0) { p.blinkT = 2.2 + rnd() * 4.5; p.blinkS = 0.15; }
      const c = p.blinkS > 0 ? Math.sin(Math.PI * (1 - (p.blinkS -= dt) / 0.15)) : 0; for (const l of p.lids) l.rotation.x = l.userData.open + (1.25 - l.userData.open) * Math.max(0, c); }
    for (const sw of p.swing || []) { p.head.getWorldQuaternion(_q).invert(); _dn.copy(DOWN).applyQuaternion(_q); const mv = p.moving ? 1 : 0;
      _dn.x += Math.sin(p.ph) * 0.18 * mv; _dn.z -= 0.12 * mv + (p.running ? 0.25 : 0); _dn.normalize(); if (!sw.h) sw.h = _dn.clone();
      sw.v = (sw.v || new THREE.Vector3()).multiplyScalar(Math.exp(-4 * dt)).addScaledVector(_dn.clone().sub(sw.h), dt * 40); sw.h.addScaledVector(sw.v, dt).normalize();
      sw.pivot.quaternion.setFromUnitVectors(DOWN, sw.h); } }

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
  if (lav) { const g = new THREE.Group(), prof = [[0, 0.0], [0.2, 0.0], [0.24, 0.02], [0.3, 0.13], [0.31, 0.145], [0.3, 0.14], [0.235, 0.025], [0.0, 0.015]].map(([x, y]) => new THREE.Vector2(x, y));
    const alu = mat({ color: 0xc4c8cc }, { rim: '1.4', frag: 'diffuseColor.rgb*=0.9+0.2*vnoise(vWp.xz*40.0+vWp.y*30.0);' });
    const bowl = new THREE.Mesh(new THREE.LatheGeometry(prof, 24), alu); bowl.material.side = THREE.DoubleSide; bowl.castShadow = bowl.receiveShadow = true; g.add(bowl);
    const agua = new THREE.Mesh(new THREE.CircleGeometry(0.27, 20).rotateX(-Math.PI / 2).translate(0, 0.11, 0), mat({ color: 0xb8d4d8, transparent: true, opacity: 0.85 }, { frag: 'diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.0),smoothstep(0.55,0.7,vnoise(vWp.xz*28.0+uTime*0.3))*0.8);' })); g.add(agua);
    for (const [x, z, c, r] of [[-0.08, 0.05, 0xc8382a, 0.09], [0.07, -0.06, 0x2f6aa0, 0.08], [0.02, 0.1, 0xf4f0e8, 0.07]]) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 6).scale(1.3, 0.35, 1), mat({ color: c })); m.position.set(x, 0.115, z); g.add(m); }
    const sab = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.05), mat({ color: 0xe8d890 })); sab.position.set(0.28, 0.16, 0); sab.rotation.y = 0.4; g.add(sab);
    const rx = Math.cos(lavFace), rz = -Math.sin(lavFace), bx = lav[0] + rx * 0.75 - Math.sin(lavFace) * 0.15, bz = lav[1] + rz * 0.75 - Math.cos(lavFace) * 0.15;
    g.position.set(bx, heightAt(bx, bz) - 0.01, bz); scene.add(g); tag(g, 'bacia de alumínio'); L.bacia = [bx, bz]; }
  // ---------- o varal: corda que cede e as peças que a lavadeira estende (pano.js), cada uma com seu pano e sua forma
  if (L.varal && L.varal.ends) { const V0 = L.varal, [e0, e1] = V0.ends, A = new THREE.Vector3(e0[0], V0.y0, e0[1]), B = new THREE.Vector3(e1[0], V0.y0, e1[1]);
    const tx = m => { const t = m.map.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1); return t; };
    const pecas = [{ forma: 'camisa', tex: tx(MAT.xadrez[1]) }, { forma: 'calca', tex: tx(MAT.trama), cor: 0x3a5a8a }, { forma: 'lencol', tex: tx(MAT.trama), cor: 0xf4f0e8 },
      { forma: 'vestido', tex: tx(MAT.chita[0]) }, { forma: 'toalha', tex: tx(MAT.trama), cor: 0xe0a020 }, { forma: 'camisa', tex: tx(MAT.trama), cor: 0xf0ebe0 }, { forma: 'pano', tex: tx(MAT.chita[1]) }];
    const varal = Varal({ scene, a: A, b: B, pecas, fx: fx || null }), mid = A.clone().lerp(B, 0.5);
    V0.items = varal.items; V0.at = varal.at; V0.n = 0;
    updaters.push(dt => { const cam = window.__cam, d = cam ? cam.position.distanceTo(mid) : 0;
      varal.update({ dt, vento: ventoAgora(mid.x, mid.z, 1).clone(), perto: d < 60, sol: U.uDay.value * (1 - 0.6 * U.uCloudCov.value), chuva: U.uRain.value, ventoV: U.uWindBase.value, chao: heightAt }); }); }
  // poço: a moça fica do lado da manivela; lição: banquinho da mãe e a esteira das crianças; toco do pai; mata do lenhador
  const W = L.well, wellAt = (lx, lz) => { const v = W.rig ? W.rig.g.localToWorld(new THREE.Vector3(lx, 0, lz)) : new THREE.Vector3(W.p[0] + lx, 0, W.p[1] + lz); return [v.x, v.z]; };
  const Li = L.licao, fw = [Math.sin(Li.rot), Math.cos(Li.rot)], sd = [Math.cos(Li.rot), -Math.sin(Li.rot)];
  const seats = [-0.75, 0, 0.75].map((o, i) => [Li.p[0] + fw[0] * (1.45 + (i === 1 ? 0.25 : 0)) + sd[0] * o, Li.p[1] + fw[1] * (1.45 + (i === 1 ? 0.25 : 0)) + sd[1] * o]);
  const Tc = L.toco, tocoStand = rot2(Tc.p, Tc.rot, 0, -0.78), tocoFace = Math.atan2(Tc.p[0] - tocoStand[0], Tc.p[1] - tocoStand[1]);
  const Lp = L.lenha, pileStand = rot2(Lp.p, Lp.rot, 0, 0.95);
  const gather = (() => { for (let k = 0.15; k < 0.7; k += 0.03) { const x = tB.c[0] + (tV.c[0] - tB.c[0]) * k, z = tB.c[1] + (tV.c[1] - tB.c[1]) * k; if (waterDist(x, z) > 3.5 && !blocked(x, z, 0.5) && inHex(x, z, tB.c, 0.9)) return [x, z]; } return [tB.c[0], tB.c[1] + 6]; })();
  const Cz = L.cruzeiro, crzStand = (() => { const a = L.chapel.rot + Math.PI / 2, d = [Math.cos(a), -Math.sin(a)]; return [Cz.p[0] - d[0] * 1.35, Cz.p[1] - d[1] * 1.35]; })(), crzFace = Math.atan2(Cz.p[0] - crzStand[0], Cz.p[1] - crzStand[1]);
  const chapelDoor = L.chapelDoor;

  // a lagoa: pontos da margem (de onde se pesca e de onde se pula), a entrada rasa, a beira do pulo, onde cai (fundo) e onde
  // fica a boia; e os lugares fundos para nadar
  const LK = (() => { const bank = [], swim = [];
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), at = r => [LAKE.c[0] + ca * r, LAKE.c[1] + sa * r];
      let rB = null, rE = null, rJ = null, rL = null;
      for (let r = 0.5; r < LAKE.r * 2.2; r += 0.1) { const [x, z] = at(r), d = lakeDist(x, z);
        if (rL == null && d > -3.2) rL = r; if (rE == null && d > -0.45) rE = r; if (rJ == null && d > 0.15) rJ = r; if (rB == null && d > 1.1) { rB = r; break; } }
      if (rB == null || rL == null || rE == null || rJ == null) continue; const [bx, bz] = at(rB); if (blocked(bx, bz, 0.5)) continue;
      const [lx, lz] = at(rL); if (waterLevelAt(lx, lz) - heightAt(lx, lz) < 0.9) continue;
      bank.push({ x: bx, z: bz, face: Math.atan2(-ca, -sa), entry: at(rE), edge: at(rJ), land: [lx, lz], float: at(Math.max(rE - 2.6, rL)) }); }
    for (let k = 0; k < 600 && swim.length < 10; k++) { const a = rnd() * 6.283, r = rnd() * LAKE.r, x = LAKE.c[0] + Math.cos(a) * r, z = LAKE.c[1] + Math.sin(a) * r;
      if (lakeDist(x, z) < -2.5 && waterLevelAt(x, z) - heightAt(x, z) > 0.85) swim.push([x, z]); }
    return { bank, swim }; })();
  const lakeKid = (top, bottom) => () => crianca({ dress: false, skirt: 0, top: { mat: MAT.trama, color: top }, bottom: { mat: MAT.trama, color: bottom }, tool: 'vara' });
  const lakeRoles = LK.bank.length > 3 && LK.swim.length > 2 ? [[0xe0b040, 0x3a5a8a], [0xc83a2a, 0xa08a62], [0x4a9ad8, 0x2e4a72]].map(([a, b], i) => ({ make: lakeKid(a, b), job: 'lagoa', post: [LK.bank[(i * 5) % LK.bank.length].x, LK.bank[(i * 5) % LK.bank.length].z], home: 2 })) : [];
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
    { make: () => mulher({ hat: 'lenco', apron: true, sleeves: 'curta', tool: 'pa' }), job: 'forno', post: rot2(L.oven.p, L.oven.rot, 0, 1.55), face: L.oven.rot + Math.PI, home: 1, mob: 1 },
    { make: () => homem({ hat: 'palha', sleeves: 'arregaçada', tool: 'serrote', top: { mat: MAT.trama, color: 0xe8e2d0 }, bottom: { mat: MAT.trama, color: 0x6a4a34 } }), job: 'serrar', post: rot2(L.cavalete.p, L.cavalete.rot, -0.75, 0), face: L.cavalete.rot + Math.PI / 2, home: 1 },
    { make: () => mulher({ old: true, hat: null, hair: 'coque', sleeves: 'longa' }), job: 'fiar', post: L.fiar.at, face: L.fiar.face, seatY: L.fiar.y, home: 2 },
    // a beata do cruzeiro, a mãe com a lousa e as três crianças na esteira, o pai no toco, o lenhador
    { make: () => mulher({ old: true, hat: 'lenco', lenco: 3, hair: 'coque', sleeves: 'longa', apron: false, dress: true, skirt: 0.85 }), job: 'rezar', post: doors[2].at, home: 2, mob: 1 },
    { make: () => mulher({ extra: 'lousa', apron: true, sleeves: 'curta', hat: null }), job: 'licao', post: Li.p, face: Li.rot, home: 2, mob: 1 },
    ...seats.map((s, i) => ({ make: () => crianca(), job: 'aluno', post: s, face: Li.rot + Math.PI + (i - 1) * 0.25, home: 2, seat: i, mob: i < 2 })),
    { make: () => homem({ tool: 'machado', hat: pick(['palha', null]), sleeves: 'arregaçada', top: camisa() }), job: 'machado', post: tocoStand, face: tocoFace, home: 2, mob: 1 },
    { make: () => homem({ hat: 'palha', extra: 'feixe', sleeves: 'longa', top: { mat: MAT.trama, color: 0xc8b898 } }), job: 'lenha', post: pileStand, face: Lp.rot + Math.PI, home: 0 },
  ].filter(Boolean);
  const list = (mobile ? roles.filter(r => r.mob) : roles).concat(mobile ? lakeRoles.slice(0, 2) : lakeRoles);
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
    p.legs.forEach((l, i) => { lerp(l.hp.rotation, 'x', (o.hp || [0, 0])[i]); lerp(l.kn.rotation, 'x', (o.kn || [0, 0])[i]); lerp(l.ft.rotation, 'x', (o.ft || [0, 0])[i]); lerp(l.hp.rotation, 'z', (o.hpz || [0, 0])[i]); });
    lerp(p.pelvis.rotation, 'y', o.pry ?? 0); if (o.prz != null) lerp(p.pelvis.rotation, 'z', o.prz); if (o.maos) p.maos = o.maos; };
  // a passada (anatomia.js): marcha ou corrida com o pé de apoio parado no chão; o passo e a cadência vêm da altura e da velocidade
  const walkPose = (p, sp, run) => passada(p.rig, p.perfil, p.ph, sp, run, p.g.scale.x).pose;
  // andar até um ponto (com passada, poeira quando corre); devolve true ao chegar
  const goTo = (p, x, z, dt, speed = 1.2, keepArms = false) => { const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz); if (d < 0.15) return true; p.moving = true; if (p.s.old && speed < 2) speed *= 0.75;
    const rad = p.s.sex === 'c' ? 0.2 : 0.26; let want = Math.atan2(dx, dz);
    if (colisao && d > 0.4) want = colisao.steer(p.x, p.z, want, rad, Math.min(1.0, d * 0.6));   // desvia de parede, cerca e tronco antes de bater
    const e = angTo(p.h, want), h0 = p.h; p.h += Math.max(-4 * dt, Math.min(4 * dt, e));
    if (p.peO && p.h !== h0) { const [ox, oz] = p.peO, c0 = Math.cos(h0), s0 = Math.sin(h0), c1 = Math.cos(p.h), s1 = Math.sin(p.h);   // vira em cima do pé de apoio, não do centro do corpo
      p.x += (ox * c0 + oz * s0) - (ox * c1 + oz * s1); p.z += (-ox * s0 + oz * c0) - (-ox * s1 + oz * c1); }
    const st = Math.min(d, speed * dt); p.x += Math.sin(p.h) * st; p.z += Math.cos(p.h) * st; const ph0 = p.ph;
    if (colisao) { const q = colisao.push(p.x, p.z, rad); p.x = q[0]; p.z = q[1]; }
    for (const o of people) { if (o === p || !o.g.visible || o.st === 'casa') continue; const ox = p.x - o.x, oz = p.z - o.z, od = Math.hypot(ox, oz), r2 = rad + (o.s.sex === 'c' ? 0.2 : 0.26);   // gente não atravessa gente
      if (od < r2 && od > 1e-4) { p.x += ox / od * (r2 - od) * 0.6; p.z += oz / od * (r2 - od) * 0.6; } }
    const nd = Math.hypot(x - p.x, z - p.z); p.stk = d - nd < st * 0.25 ? (p.stk || 0) + dt : Math.max(0, (p.stk || 0) - dt);
    if (p.stk > 2.5 && nd < 2.5) { p.stk = 0; return true; }   /* não dá para chegar mais perto (tronco, parede): fica onde está */
    p.ph += st / comprimentoPasso(p.perfil, speed, speed > 2, p.g.scale.x) * Math.PI;   // um passo (π) a cada comprimento de passo andado: o pé de apoio não escorrega
    const w = walkPose(p, speed, speed > 2); if (keepArms) { delete w.sh; delete w.el; w.sh = [p.arms[0].sh.rotation.x, p.arms[1].sh.rotation.x]; w.el = [p.arms[0].el.rotation.x, p.arms[1].el.rotation.x]; }
    p.walkT = (p.walkT || 0) + dt; set(p, { ...w, k: p.walkT > 0.3 ? 1 : Math.min(1, dt * 12 + p.walkT * 2) });
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
  function pausa(p, dt, k) { if (!PAUSA.has(p.job) || p.tr != null) return false; p.pz = (p.pz ?? 12 + rnd() * 30) - dt; if (p.pz > 0) return false;
    if (p.pt == null) p.pt = Math.floor(rnd() * 4); const q = -p.pz;
    if (p.pt === 0) set(p, { sp: -0.22, sh: [0.55, 0.55], el: [-1.5, -1.5], shz: [-0.25, 0.25], hx: -0.35, k });
    else if (p.pt === 1 && p.two) set(p, { sh: [-2.0, 0], el: [-2.1, -0.3], shz: [-0.15, -0.1], hx: -0.3 - Math.min(1, q) * 0.15, k });
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
    if (act === 'capina') { const c = (t * 0.75) % 1, up = c < 0.45; p.grip2 = true; set(p, { sp: up ? 0.2 : 0.55, sh: [up ? -2.3 : -0.55, up ? -2.2 : -0.45], el: [-0.35, -0.3], hp: [-0.15, 0.25], kn: [0.25, 0.35], hx: 0.3, k: Math.min(1, dt * (up ? 5 : 16)) }); }
    else if (act === 'colhe' || act === 'lenha') { p.toolDown = true; const c = (t * 0.3) % 1; set(p, c < 0.6 ? { sp: 0.9, hp: [-0.35, -0.2], kn: [0.35, 0.3], sh: [-1.1, -0.5], el: [-0.3, -0.3], hx: 0.2, k } : { sh: [-0.6, -0.3], el: [-1.0, -0.3], k }); }
    else if (act === 'lava') { p.toolDown = true; const w = Math.sin(t * 5); set(p, { py: 0.52, sp: 0.85, hp: [0.05, 0.05], kn: [1.55, 1.55], sh: [-1.0 + w * 0.25, -1.0 - w * 0.25], el: [-0.4, -0.4], hx: 0.2, k: Math.min(1, dt * 10) }); }
    else if (act === 'senta') { p.toolDown = true; set(p, { py: 0.18, hp: [-1.5, -1.4], kn: [0.35, 0.3], sh: [0.35, 0.35], el: [-0.2, -0.2], sp: -0.15, hy: Math.sin(t * 0.3) * 0.5, k }); }
    else if (act === 'conversa') { const g2 = Math.max(0, Math.sin(t * 1.3)); set(p, { sh: [-0.4 - g2 * 0.5, -0.2], el: [-1.1 - g2 * 0.3, -0.3], hx: Math.sin(t * 2.1) * 0.08, k }); const o = nearest(p, 5); if (o) turnTo(p, o.x, o.z, dt); }
    else if (act === 'acena') { set(p, { k }); waveArm(p, t); }
    else if (act === 'brinca') { const a = t * 2.2 + p.ph; goTo(p, p.x0 + Math.cos(a) * 1.6, p.z0 + Math.sin(a) * 1.6, dt, 2.8); }
    else set(p, { sh: [0.2, 0.2], shz: [-0.5, 0.5], el: [-1.6, -1.6], hy: Math.sin(t * 0.5) * 0.8, k });   // olha: mão na cintura, olhando o vale
  }

  // ---------- quadros-chave: lista de [instante 0..1, pose]; entre dois, mistura suave (ease in-out)
  const DEF = { py: 0.95, sp: 0, sy: 0, hx: 0, hy: 0, pitch: 0, sh: [0, 0], el: [-0.32, -0.32], shz: [0.1, -0.1], shy: [-0.15, 0.15], hp: [0, 0], kn: [0, 0], ft: [0, 0], pry: 0, hpz: [0, 0] };
  const lerpPose = (a, b, u) => { const o = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const va = a[k] ?? DEF[k], vb = b[k] ?? DEF[k];
      o[k] = Array.isArray(va) ? va.map((x, i) => x + (vb[i] - x) * u) : va + (vb - va) * u; } return o; };
  function keys(K, c) { for (let i = 0; i < K.length; i++) { const [t0, a] = K[i], [t1, b] = K[(i + 1) % K.length], e = t1 > t0 ? t1 : t1 + 1, cc = c < t0 ? c + 1 : c;
      if (cc >= t0 && cc <= e) { const u = (cc - t0) / (e - t0); return lerpPose(a, b, u * u * (3 - 2 * u)); } } return K[0][1]; }
  // enxada (a mão de baixo, arms[1], fica na ponta do cabo): segura → ergue (devagar) → golpe (rápido) → puxa a terra → solta
  const ENX = { segura: { sh: [-0.7, -1.2], shz: [0.45, -0.3], el: [-0.2, -0.7], sp: 0.2, hp: [-0.12, 0.2], kn: [0.15, 0.25], hx: 0.3 },
    ergue: { sh: [-2.9, -2.0], shz: [0.2, -0.5], el: [-0.4, -0.6], sp: -0.12, hp: [-0.1, 0.2], kn: [0.1, 0.2], hx: -0.1 },
    golpe: { sh: [-1.25, -0.7], shz: [0.45, -0.3], el: [-0.1, -0.2], sp: 0.55, hp: [-0.2, 0.28], kn: [0.3, 0.4], hx: 0.35 },
    puxa: { sh: [-0.55, -0.95], shz: [0.45, -0.25], el: [-0.15, -1.25], sp: 0.4, hp: [-0.2, 0.28], kn: [0.3, 0.4], hx: 0.3 } };
  const ENXADA = [[0, ENX.segura], [0.38, ENX.ergue], [0.5, ENX.golpe], [0.78, ENX.puxa], [0.9, ENX.segura]];
  // torrões que a enxada vira e puxa: ficam no chão uns vinte segundos (a terra fresca, mais escura) e vão se desfazendo
  const TOR = (() => { const N = 120, geo = paint(new THREE.IcosahedronGeometry(0.035, 0), col(0x5e3e2a)), m = new THREE.InstancedMesh(geo, MAT.liso, N), d = new THREE.Object3D(), life = new Float32Array(N), pos = new Float32Array(N * 3), sc = new Float32Array(N);
    let k = 0; d.scale.setScalar(0); d.updateMatrix(); for (let i = 0; i < N; i++) m.setMatrixAt(i, d.matrix); m.receiveShadow = true; m.frustumCulled = false; m.userData.noRegua = true; scene.add(m);
    const put = (i, s, dy) => { d.position.set(pos[i * 3], pos[i * 3 + 1] - dy, pos[i * 3 + 2]); d.rotation.set(i * 1.7, i * 2.3, i * 0.9); d.scale.set(s, s * 0.65, s * 1.2); d.updateMatrix(); m.setMatrixAt(i, d.matrix); };
    return { add(x, z) { const i = k++ % N; life[i] = 16 + rnd() * 10; sc[i] = 0.5 + rnd() * 1.0; pos.set([x, heightAt(x, z) + 0.012, z], i * 3); put(i, sc[i], 0); m.instanceMatrix.needsUpdate = true; },
      step(dt) { let ch = false; for (let i = 0; i < N; i++) if (life[i] > 0) { life[i] -= dt; if (life[i] < 4) { put(i, Math.max(0, life[i] / 4) * sc[i], (1 - Math.max(0, life[i]) / 4) * 0.025); ch = true; } } if (ch) m.instanceMatrix.needsUpdate = true; } }; })();
  updaters.push(dt => TOR.step(Math.min(dt, 0.1)));
  const bladeAt = p => { const b = p.two ? p.two.g.localToWorld(_bl.set(0, 1.38, 0)) : _bl.set(p.x + Math.sin(p.h) * 1.15, 0, p.z + Math.cos(p.h) * 1.15); return b; }, _bl = new THREE.Vector3();

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
  // ---------- água: na rasa a criança anda (anel nos pés); na funda nada cachorrinho, de cabeça para fora
  const wlAt = (x, z) => waterLevelAt(x, z) - U.uWaterDrop.value;
  function nadaAte(p, x, z, dt, speed = 0.9) { const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz); if (d < 0.3) return true; turnTo(p, x, z, dt * 1.6);
    const st = Math.min(d, speed * dt); p.x += Math.sin(p.h) * st; p.z += Math.cos(p.h) * st; p.moving = true; return false; }
  function vaiNaAgua(p, x, z, dt) { const sc = p.g.scale.x; return wlAt(p.x, p.z) - heightAt(p.x, p.z) > 0.72 * sc ? nadaAte(p, x, z, dt) : goTo(p, x, z, dt, 0.8); }
  function emAgua(p, dt, t) { const sc = p.g.scale.x, wl = wlAt(p.x, p.z), dep = wl - heightAt(p.x, p.z);
    if (dep > 0.72 * sc) { const s2 = Math.sin(t * 6); p.yAbs = wl - 0.86 * sc + Math.sin(t * 3) * 0.02;
      set(p, { pitch: 0.85, hx: -0.8, sh: [-1.7 + s2 * 0.5, -1.7 - s2 * 0.5], shz: [0.3, -0.3], el: [-0.5, -0.5], hp: [s2 * 0.45, -s2 * 0.45], kn: [0.3 + s2 * 0.2, 0.3 - s2 * 0.2], k: 1 });
      if (afx && t - (p.rip || 0) > 0.7) { p.rip = t; afx.ripple(p.x, wl, p.z, 0.55); } }
    else if (dep > 0.04 && afx && p.moving && t - (p.rip || 0) > 0.45) { p.rip = t; afx.ripple(p.x, wl, p.z, 0.35); } }
  // ---------- pesca. A isca no anzol, o arremesso (vara para trás, chicotada, a boia voa em arco e cai com um anel), a
  // espera (a boia boia: empuxo puxando para a linha d'água, amortecido, balançando na marola), as beliscadas (um peixe de
  // verdade de peixes.js vem, belisca e a boia afunda um pouco), a boia que some (o peixe levou a isca), a fisgada (às
  // vezes erra), a briga (o peixe puxa para os lados e espirra na superfície, a vara enverga com a tensão, quem pesca vai
  // recolhendo a linha) e o peixe tirado da água, se debatendo na ponta da linha, até o samburá. A linha é uma corda
  // (pontos com gravidade e comprimento fixo entre eles): faz barriga na espera, estica na briga, deita na água.
  const _tip = new THREE.Vector3(), _pa = new THREE.Vector3(), _pb = new THREE.Vector3(), NL = 14;
  function bendRod(p, b) { const R = p.tool.userData.rod; if (!R) return; b = Math.max(0, Math.min(0.9, b)); if (Math.abs(b - (R.userData.b ?? -1)) < 0.003) return; R.userData.b = b;
    const pos = R.geometry.attributes.position, r0 = R.userData.rest; for (let i = 0; i < pos.count; i++) { const y = r0[i * 3 + 1], u = y / ROD_L; pos.setXYZ(i, r0[i * 3], y - b * ROD_L * 0.2 * u * u * u, r0[i * 3 + 2] + b * ROD_L * 0.55 * u * u); }
    pos.needsUpdate = true; }
  function tipOf(p, out) { const R = p.tool.userData.rod, b = R ? R.userData.b || 0 : 0; out.set(0, ROD_L - b * ROD_L * 0.2, b * ROD_L * 0.55); if (R) { p.g.updateMatrixWorld(true); R.localToWorld(out); } return out; }
  const lisoK = (g, c) => { const m = new THREE.Mesh(g, MAT.liso); paint(g, col(c)); m.castShadow = true; m.userData.noRegua = true; return m; };
  function kitOf(p) { if (p.kit) return p.kit;
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NL * 3), 3));
    const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xf4f4f0, transparent: true, opacity: 0.7 })); line.frustumCulled = false;
    const boia = new THREE.Mesh(merge([paint(new THREE.SphereGeometry(0.04, 10, 8).translate(0, 0.015, 0), col(0xe8402a)), paint(new THREE.SphereGeometry(0.034, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5).translate(0, 0.035, 0), col(0xf4f0e8)),
      paint(new THREE.CylinderGeometry(0.004, 0.004, 0.07, 4).translate(0, 0.08, 0), col(0xe8402a))], K), MAT.liso);
    // samburá: cesto de taquara trançada, boca estreita, onde vão os peixes (as caudas aparecem na boca)
    const sb = new THREE.LatheGeometry([[0.0, 0], [0.13, 0.01], [0.17, 0.08], [0.16, 0.2], [0.1, 0.28], [0.09, 0.31]].map(([r, y]) => new THREE.Vector2(r, y)), 16), q = sb.attributes.position;
    for (let k = 0; k < q.count; k++) { const a = Math.atan2(q.getX(k), q.getZ(k)), y = q.getY(k), w = 1 + 0.04 * Math.sin(a * 18) * Math.sin(y * 70); q.setX(k, q.getX(k) * w); q.setZ(k, q.getZ(k) * w); }
    const samb = new THREE.Group(); samb.add(lisoK(sb, 0xb08a52)); samb.add(lisoK(new THREE.TorusGeometry(0.095, 0.01, 5, 14).rotateX(Math.PI / 2).translate(0, 0.31, 0), 0x8a6a3a));
    const tails = []; for (let k = 0; k < 3; k++) { const t2 = new THREE.Mesh(merge([paint(new THREE.SphereGeometry(1, 8, 6).scale(0.02, 0.06, 0.012), col(0xc8d0c8)), paint(new THREE.ConeGeometry(0.03, 0.05, 4).translate(0, 0.07, 0), col(0xd8442e))], K), MAT.liso);
      t2.position.set((k - 1) * 0.04, 0.32, (k % 2) * 0.02); t2.rotation.z = (k - 1) * 0.35; t2.visible = false; samb.add(t2); tails.push(t2); }
    samb.traverse(o => { if (o.isMesh) o.castShadow = true; });
    line.visible = boia.visible = samb.visible = false; scene.add(line, boia, samb);
    const P = new Float32Array(NL * 3), O = new Float32Array(NL * 3);
    return (p.kit = { line, boia, samb, tails, P, O, ri: false, bait: peixes ? peixes.bait() : null, st: 'isca', u: 0, bx: 0, by: 0, bz: 0, vx: 0, vy: 0, vz: 0, fish: null, n: 0, Ll: 3, wait: 0, react: 0, stam: 1, seat: null }); }
  const kitOff = p => { const F = p.kit; if (!F) return; F.line.visible = F.boia.visible = F.samb.visible = false; if (F.bait) F.bait.on = false; if (F.fish && peixes) peixes.release(F.fish); F.fish = null; F.st = 'isca'; F.u = 0; F.seat = null; bendRod(p, 0); };
  // a corda da linha: Verlet com gravidade, presa nas duas pontas; deita na água onde encosta nela
  function rope(F, a, b, slack, dt) { const P = F.P, O = F.O, n = NL, L = Math.max(0.05, a.distanceTo(b)) * slack / (n - 1);
    if (!F.ri) { for (let i = 0; i < n; i++) { const u = i / (n - 1); P[i * 3] = O[i * 3] = a.x + (b.x - a.x) * u; P[i * 3 + 1] = O[i * 3 + 1] = a.y + (b.y - a.y) * u; P[i * 3 + 2] = O[i * 3 + 2] = a.z + (b.z - a.z) * u; } F.ri = true; }
    const g = 9.8 * dt * dt;
    for (let i = 1; i < n - 1; i++) { const j = i * 3; for (let c = 0; c < 3; c++) { const v = (P[j + c] - O[j + c]) * 0.94; O[j + c] = P[j + c]; P[j + c] += v; } P[j + 1] -= g;
      const w = wlAt(P[j], P[j + 2]); if (P[j + 1] < w && w - heightAt(P[j], P[j + 2]) > 0.02) { P[j + 1] = w + 0.003; O[j] = P[j] - (P[j] - O[j]) * 0.5; O[j + 2] = P[j + 2] - (P[j + 2] - O[j + 2]) * 0.5; O[j + 1] = P[j + 1]; } }
    P.set([a.x, a.y, a.z], 0); P.set([b.x, b.y, b.z], (n - 1) * 3);
    for (let it = 0; it < 8; it++) for (let i = 0; i < n - 1; i++) { const j = i * 3, k = j + 3, dx = P[k] - P[j], dy = P[k + 1] - P[j + 1], dz = P[k + 2] - P[j + 2], d = Math.hypot(dx, dy, dz) || 1e-6, e = (d - L) / d * 0.5;
      const wi = i === 0 ? 0 : 1, wk = i + 1 === n - 1 ? 0 : 1, sw = wi + wk || 1; P[j] += dx * e * 2 * wi / sw; P[j + 1] += dy * e * 2 * wi / sw; P[j + 2] += dz * e * 2 * wi / sw; P[k] -= dx * e * 2 * wk / sw; P[k + 1] -= dy * e * 2 * wk / sw; P[k + 2] -= dz * e * 2 * wk / sw; }
    F.line.geometry.attributes.position.array.set(P); F.line.geometry.attributes.position.needsUpdate = true; }
  // devolve o quanto a vara sobe (0 = parada na frente; 1,4 = lá atrás/em cima) para a pose de quem pesca
  function pesca(p, dt, t, fpt, kid = false) { const F = kitOf(p), B = F.bait; F.line.visible = F.samb.visible = true; p.tool.visible = true; F.u += dt;
    if (!F.seat || Math.hypot(F.seat[0] - p.x, F.seat[1] - p.z) > 0.6) { F.seat = [p.x, p.z]; const sx = Math.cos(p.h), sz = -Math.sin(p.h), x = p.x + sx * 0.55 + Math.sin(p.h) * 0.1, z = p.z + sz * 0.55 + Math.cos(p.h) * 0.1; F.samb.position.set(x, heightAt(x, z) - 0.01, z); F.ri = false; }
    tipOf(p, _tip); let j = 0, bend = 0.04, end = null, slack = 1.04;
    const wl0 = wlAt(fpt[0], fpt[1]), boiaAt = () => { _pb.set(F.bx, F.by + 0.07, F.bz); return _pb; };
    switch (F.st) {
      case 'isca': { j = 0.25; F.boia.visible = true; _pa.set(_tip.x, _tip.y - 0.9, _tip.z); F.bx = _pa.x; F.by = _pa.y; F.bz = _pa.z; end = boiaAt(); slack = 1.0;   // põe a minhoca no anzol
        if (B) B.on = false; if (F.u > (kid ? 2.2 : 1.6)) { F.st = 'prepara'; F.u = 0; if (B) B.gone = false; } break; }
      case 'prepara': { j = Math.min(1.45, F.u / 0.55 * 1.45); F.bx = _tip.x; F.by = _tip.y - 0.4; F.bz = _tip.z; end = boiaAt(); if (F.u > 0.6) { F.st = 'chicote'; F.u = 0; } break; }
      case 'chicote': { j = 1.45 - Math.min(1.55, F.u / 0.22 * 1.55); bend = 0.25; end = boiaAt(); F.bx = _tip.x; F.by = _tip.y - 0.2; F.bz = _tip.z;
        if (F.u > 0.22) { const tx = fpt[0] + (rnd() - 0.5) * 0.8, tz = fpt[1] + (rnd() - 0.5) * 0.8, T = 0.85; F.vx = (tx - _tip.x) / T; F.vz = (tz - _tip.z) / T; F.vy = (wlAt(tx, tz) - _tip.y + 0.5 * 9.8 * T * T) / T;
          F.bx = _tip.x; F.by = _tip.y; F.bz = _tip.z; F.st = 'voo'; F.u = 0; } break; }
      case 'voo': { j = -0.05; F.vy -= 9.8 * dt; F.bx += F.vx * dt; F.by += F.vy * dt; F.bz += F.vz * dt; end = boiaAt(); slack = 1.12;
        const w = wlAt(F.bx, F.bz); if (F.vy < 0 && F.by < w) { F.by = w; F.vy = -0.4; F.vx = F.vz = 0; F.st = 'espera'; F.u = 0; F.wait = 0; if (afx) { afx.ripple(F.bx, w, F.bz, 0.4); afx.ripple(F.bx, w, F.bz, 0.7, 0.2); } if (fx) emit('respingo', F.bx, w + 0.02, F.bz, 4, { spread: 0.3, speed: 0.4 });
          if (peixes) peixes.disturb(F.bx, F.bz, 0.9); if (B) { B.on = true; B.x = F.bx; B.z = F.bz; B.t = 2 + rnd() * 3; } } break; }
      case 'espera': case 'falhou': { F.wait += dt; const w = wlAt(F.bx, F.bz);
        // a boia: empuxo (mola para a linha d'água), amortecimento da água, a marolinha, a beliscada e o peixe que leva a isca
        let tgt = w + 0.004 + Math.sin(t * 2.1 + p.ph) * 0.006;
        if (B && B.nib > 0) { F.vy -= 0.45; B.nib = 0; if (afx) afx.ripple(F.bx, w, F.bz, 0.22); }
        if (B && B.bite && B.fish) { tgt = w - 0.13; F.bx += (B.fish.x - F.bx) * Math.min(1, dt * 2); F.bz += (B.fish.z - F.bz) * Math.min(1, dt * 2); F.react += dt;
          if (F.st === 'espera' && F.react > (kid ? 0.75 : 0.45)) { const f = peixes.hook(B, kid ? 0.55 : 0.72); F.react = 0; F.u = 0; j = 1.2;
            if (f) { F.fish = f; F.st = 'briga'; F.stam = 1; F.Ll = Math.hypot(f.x - p.x, f.z - p.z) + 0.5; if (afx) afx.splash(f.x, w, f.z, 0.35); }
            else { F.st = 'falhou'; F.vy = 0.8; } } }
        else F.react = 0;
        F.vy += ((tgt - F.by) * 70 - F.vy * 9) * dt; F.by += F.vy * dt;
        if (F.st === 'falhou') { j = Math.max(0, 1.2 - F.u * 2); if (F.u > 1.0) { F.st = B && B.gone ? 'recolhe' : 'espera'; F.u = 0; } }
        if (F.st === 'espera' && F.wait > 45 + p.ph * 3) { F.st = 'recolhe'; F.u = 0; }
        if (B) { B.x = F.bx; B.z = F.bz; } end = boiaAt(); slack = 1.06; break; }
      case 'recolhe': { j = Math.min(0.9, F.u * 1.5); if (B) B.on = false; F.bx += (_tip.x - F.bx) * Math.min(1, dt * 2.5); F.bz += (_tip.z - F.bz) * Math.min(1, dt * 2.5); F.by += (_tip.y - 0.6 - F.by) * Math.min(1, dt * 2.5); end = boiaAt(); slack = 1.0;
        if (F.u > 1.1) { F.st = B && B.gone ? 'isca' : 'prepara'; F.u = 0; } break; }
      case 'briga': { const f = F.fish, w = wlAt(f.x, f.z);
        // o peixe puxa para um lado e para o outro; cansa; quem pesca recolhe a linha devagar; ele espirra quando sobe
        if (!f.tug || (f.tug -= dt) < 0) { f.tug = 0.5 + rnd() * 0.7; f.pull = Math.atan2(f.x - p.x, f.z - p.z) + (rnd() - 0.5) * 2.4; }
        const sp = (0.5 + 1.0 * F.stam) * f.S.L / 0.2; let nx = f.x + Math.sin(f.pull) * sp * dt, nz = f.z + Math.cos(f.pull) * sp * dt;
        const dx = nx - p.x, dz = nz - p.z, d = Math.hypot(dx, dz), ten = Math.min(1, d / F.Ll); if (d > F.Ll) { nx = p.x + dx / d * F.Ll; nz = p.z + dz / d * F.Ll; }
        if (peixes.depthAt(nx, nz) > 0.08) { f.x = nx; f.z = nz; } f.h = f.pull;
        F.Ll = Math.max(0.6, F.Ll - dt * (0.25 + 0.35 * (1 - F.stam))); F.stam = Math.max(0, F.stam - dt * (kid ? 0.14 : 0.11));
        const surf = Math.sin(F.u * 4.3) > 0.75; f.y = surf ? w - 0.02 : w - 0.15; f.pitch = surf ? 0.3 : -0.1; f.roll = Math.sin(t * 18) * 0.6;
        if (surf && afx && (!F.spl || F.u - F.spl > 0.5)) { F.spl = F.u; afx.splash(f.x, w, f.z, 0.22 + f.S.L); }
        bend = 0.25 + 0.45 * ten + Math.sin(t * 13) * 0.05; j = 0.95 + Math.sin(t * 5) * 0.15 + ten * 0.2; _pb.set(f.x, f.y + 0.02, f.z); end = _pb; slack = 1.0;
        F.boia.visible = false;
        if (rnd() < dt * (kid ? 0.07 : 0.035)) { peixes.release(f); F.fish = null; F.st = 'recolhe'; F.u = 0; if (afx) afx.splash(f.x, w, f.z, 0.3); if (B) B.gone = rnd() < 0.6; F.boia.visible = true; F.bx = f.x; F.by = w; F.bz = f.z; break; }   // escapou
        if (Math.hypot(f.x - p.x, f.z - p.z) < 1.25 || (F.stam < 0.02 && F.Ll < 1.6)) { F.st = 'tira'; F.u = 0; F.from = [f.x, f.y, f.z]; if (afx) afx.splash(f.x, w, f.z, 0.3); } break; }
      case 'tira': case 'segura': case 'guarda': { const f = F.fish, sw = Math.sin(t * 3.1) * 0.12;
        // fora d'água: o peixe pendurado na linha, de cabeça para cima, se debatendo; depois vai para o samburá
        const hang = [_tip.x + sw, _tip.y - 0.75, _tip.z], sbo = [F.samb.position.x, F.samb.position.y + 0.42, F.samb.position.z];
        if (F.st === 'tira') { const u = Math.min(1, F.u / 0.9), e = u * u * (3 - 2 * u); f.x = F.from[0] + (hang[0] - F.from[0]) * e; f.z = F.from[2] + (hang[2] - F.from[2]) * e; f.y = F.from[1] + (hang[1] - F.from[1]) * e + Math.sin(e * Math.PI) * 0.6;
          if (u >= 1) { F.st = 'segura'; F.u = 0; } j = 1.35; bend = 0.35; }
        else if (F.st === 'segura') { f.x = hang[0]; f.y = hang[1]; f.z = hang[2]; j = 1.2 - Math.min(0.6, F.u); bend = 0.3; if (F.u > 1.1) { F.st = 'guarda'; F.u = 0; F.from = [f.x, f.y, f.z]; } }
        else { const u = Math.min(1, F.u / 0.8); f.x = F.from[0] + (sbo[0] - F.from[0]) * u; f.z = F.from[2] + (sbo[2] - F.from[2]) * u; f.y = F.from[1] + (sbo[1] - F.from[1]) * u + Math.sin(u * Math.PI) * 0.25; j = 0.4; bend = 0.05;
          if (u >= 1) { peixes.caught(f); F.fish = null; F.n++; F.tails.forEach((m, k) => { m.visible = k < F.n; }); F.st = 'isca'; F.u = 0; } }
        if (F.fish) { f.pitch = 1.35 + Math.sin(t * 21) * 0.25; f.roll = Math.sin(t * 17) * 0.8; f.h += dt * 2; _pb.set(f.x, f.y + f.S.L * 0.45, f.z); end = _pb; } F.boia.visible = false; slack = 1.0; break; }
    }
    if (F.boia.visible) F.boia.position.set(F.bx, F.by, F.bz);
    bendRod(p, bend); tipOf(p, _tip); if (end) rope(F, _tip, end, slack, Math.min(dt, 0.05));
    return j; }
  // ---------- as crianças da lagoa: nadar, pular da beira, pescar, brincar na margem; o que fazem depende da hora
  function lagoa(p, dt, t, k) { const S = p.lk || (p.lk = { st: 'escolhe' }), sc = p.g.scale.x; p.tool.visible = false;
    switch (S.st) {
      case 'escolhe': { const hr = window.__hour ?? 15, seca = U.uSeca.value > 0.5, hot = hr > 10 && hr < 16.5 && !seca, cold = seca && (hr < 9 || hr > 17);
        const W = cold ? [['pescar', 0.6], ['brincar', 0.4]] : hot ? [['nadar', 0.33], ['pular', 0.37], ['pescar', 0.12], ['brincar', 0.18]] : [['pescar', 0.45], ['brincar', 0.25], ['nadar', 0.15], ['pular', 0.15]];
        let r = rnd(); S.act = W[W.length - 1][0]; for (const [a, w] of W) { if ((r -= w) < 0) { S.act = a; break; } }
        S.bank = pick(LK.bank); S.st = 'vai'; S.n = 2 + Math.floor(rnd() * 3); S.f = 0; S.t = 0; S.alvo = null; kitOff(p); break; }
      case 'vai': if (goTo(p, S.bank.x, S.bank.z, dt, 2.4)) { S.st = S.act; S.t = 0; S.f = 0; } break;
      case 'brincar': { S.t += dt; if (!S.alvo || goTo(p, S.alvo[0], S.alvo[1], dt, 3.2)) { const a = rnd() * 6.283, d = 1 + rnd() * 3; S.alvo = [S.bank.x + Math.cos(a) * d, S.bank.z + Math.sin(a) * d]; if (lakeDist(...S.alvo) < 0.6) S.alvo = [S.bank.x, S.bank.z]; }
        if (S.t > 14) S.st = 'escolhe'; break; }
      case 'pescar': { S.t += dt; p.h = S.bank.face; const j = pesca(p, dt, t, S.bank.float, true);
        set(p, { py: 0.18, hp: [-1.5, -1.4], kn: [0.45, 0.4], sh: [-0.4, -0.95 - j * 1.1 + Math.sin(t * 0.7) * 0.05], el: [-0.6, -0.5 + j * 0.3], sp: -0.05 - j * 0.15, hx: 0.15, k: Math.min(1, dt * (j ? 14 : 5)) });
        if (S.t > 35 + p.ph * 4) { S.st = 'escolhe'; kitOff(p); } break; }
      case 'nadar': {
        if (S.f === 0) { if (vaiNaAgua(p, ...S.bank.entry, dt)) S.f = 1; }
        else if (S.f === 1) { if (!S.alvo) S.alvo = pick(LK.swim); if (vaiNaAgua(p, ...S.alvo, dt)) { S.alvo = null; if (--S.n <= 0) S.f = 2; else if (afx && rnd() < 0.5) afx.splash(p.x, wlAt(p.x, p.z), p.z, 0.5); } }
        else if (S.f === 2) { if (vaiNaAgua(p, ...S.bank.entry, dt)) S.f = 3; }
        else if (goTo(p, S.bank.x, S.bank.z, dt, 1.4)) S.st = 'escolhe';
        emAgua(p, dt, t); break; }
      case 'pular': {   // corre até a beira, pula (de bomba, abraçando os joelhos, ou de braços para cima), afunda, sobe nadando e volta
        if (S.f === 0) { if (goTo(p, ...S.bank.edge, dt, 3.4)) { S.f = 1; S.u = 0; S.bomba = rnd() < 0.55; S.from = [p.x, p.z, heightAt(p.x, p.z)]; } }
        else if (S.f === 1) { S.u += dt / 0.8; const u = Math.min(1, S.u), [lx, lz] = S.bank.land, wl = wlAt(lx, lz); p.h = S.bank.face;
          p.x = S.from[0] + (lx - S.from[0]) * u; p.z = S.from[1] + (lz - S.from[1]) * u; p.yAbs = S.from[2] + (wl - 0.7 * sc - S.from[2]) * u + Math.sin(u * Math.PI) * 1.2;
          if (S.bomba) set(p, { py: 0.85, sp: 0.45, hp: [-1.9, -1.9], kn: [2.2, 2.2], sh: [-0.9, -0.9], shz: [0.3, -0.3], el: [-1.7, -1.7], hx: 0.3, k: Math.min(1, dt * 12) });
          else set(p, { sh: [-2.9, -2.9], shz: [-0.2, 0.2], el: [-0.1, -0.1], hp: [0.15, -0.1], kn: [0.2, 0.1], hx: -0.2, k: Math.min(1, dt * 10) });
          if (u >= 1) { S.f = 2; S.u = 0; if (afx) afx.splash(lx, wl, lz, S.bomba ? 1.6 : 1.0); } }
        else if (S.f === 2) { S.u += dt; const wl = wlAt(p.x, p.z), q = Math.min(1, S.u / 0.7); p.yAbs = wl - 0.7 * sc - Math.sin(q * Math.PI) * 0.8 * sc; set(p, { sh: [-2.2, -2.2], el: [-0.4, -0.4], hp: [0.2, -0.2], k: Math.min(1, dt * 6) });
          if (S.u > 0.7) { S.f = 3; if (afx) afx.ripple(p.x, wl, p.z, 0.8); } }
        else if (S.f === 3) { if (vaiNaAgua(p, ...S.bank.entry, dt)) S.f = 4; emAgua(p, dt, t); }
        else { if (goTo(p, S.bank.x, S.bank.z, dt, 1.8)) { if (--S.n > 0) S.f = 0; else S.st = 'escolhe'; } emAgua(p, dt, t); }
        break; }
    } }

  // as mãos de cada um: segura o cabo, a alça, a lousa, o saco; abre para acenar e para aparar a queda; mãos postas na reza
  const UMA = new Set(['serrote', 'vara', 'pano', 'balaio']);
  function maosDe(p, mode) { const m = [p.maos && p.maos[0] || null, p.maos && p.maos[1] || null];
    if (p.fallT != null && p.fallT < 1.8) return ['aberta', 'aberta'];
    if (p.job === 'rezar' && p.cyc === 2) return ['postas', 'postas'];
    if (p.wave > 0) m[p.s.tool ? 0 : 1] = m[p.s.tool ? 0 : 1] || 'aberta';
    if (mode === 'maos') { m[0] = m[0] || 'segura'; m[1] = m[1] || 'segura'; } else if (mode === 'ombro' || mode === 'pe') m[1] = m[1] || 'segura';
    if (UMA.has(p.s.tool) && p.tool.visible) m[1] = m[1] || 'segura';
    if (p.panoMao && p.panoMao.mesh.visible) { m[0] = m[0] || 'segura'; m[1] = m[1] || 'segura'; }
    if (p.s.extra === 'lousa') m[0] = m[0] || 'segura';
    if ((p.saco && p.saco.visible) || (p.extra && p.s.extra === 'feixe' && p.extra.visible)) m[1] = m[1] || 'segura';
    if (p.lata && p.lata.visible && (p.cyc === 5 || p.cyc === 0)) m[0] = m[0] || 'apoio';
    return m; }
  let time = 0, scare = 0, kidsHome = 0, frameN = 0; const _pa0 = new THREE.Vector3(), _pb0 = new THREE.Vector3();
  updaters.push(dt => { time += dt; scare = Math.max(0, scare - dt); kidsHome = Math.max(0, kidsHome - dt); if (alert && (alert.t -= dt) < 0) alert = null;
    const day = U.uDay.value, rain = U.uRain.value, away = day < 0.3 || rain > 0.3, hour = window.__hour ?? 15;
    stepBell(dt, hour); stepBall(dt);
    // roupa no varal: some de manhã cedo (dia novo) e quando a chuva manda a lavadeira para casa
    if (L.varal && (hour < 6.5 || rain > 0.3) && L.varal.n) { L.varal.n = 0; for (const it of L.varal.items) it.visible = false; }
    frameN++; const cam = window.__cam; let agasalhoFeito = frameN < 30;
    for (const p of people) { p.rig.restore();   // a rotina trabalha sobre o que ela mesma pediu no quadro anterior (o solucionador é por cima)
      const k = Math.min(1, dt * 6); let yOff = 0; if (!p.moving) p.walkT = 0; p.moving = false; p.grip2 = false; p.toolDown = false; p.maos = null; if (p.job === 'lagoa') p.yAbs = null;
      const stay = p.night && day < 0.3 && rain < 0.3;
      const kidScared = KIDS.has(p.job) && kidsHome > 0; p.running = false; p.lastSpeed = 0;
      if (p.fallT != null && p.st === 'post') { stepFall(p, dt); p.running = false; }
      // Ave-Maria: quem é devoto vai à capela quando o sino toca e sai depois da reza
      else if (p.devoto && churchHour(hour) && !away) { if (p.st !== 'igreja') { if (goTo(p, chapelDoor[0] + (p.ph - 3) * 0.15, chapelDoor[1], dt, 1.2)) { p.st = 'igreja'; p.g.visible = false; } } }
      else if (p.st === 'igreja') { p.g.visible = true; p.x = chapelDoor[0]; p.z = chapelDoor[1]; p.st = 'voltando'; }
      else if ((away || kidScared) && !stay) { if (p.job === 'lagoa') { p.lk = null; kitOff(p); p.tool.visible = false; } if (p.job === 'pescar') kitOff(p); if (p.st !== 'casa') { const d = doorOf(p), run = rain > 0.3 || kidScared; p.running = run; p.pitch = 0;
          if (p.lata) p.lata.visible = false; if (p.lataChao) p.lataChao.visible = false; if (W.rig) W.rig.hand = null; if (p.extra && p.s.extra === 'feixe') p.extra.visible = false;
          if (goTo(p, d[0], d[1], dt, run ? 2.8 : 1.3)) { p.st = 'casa'; p.g.visible = false; p.cyc = 0; }
          else if (rain > 0.3) { p.arms[1].sh.rotation.x = -2.75; p.arms[1].el.rotation.x = -1.7; p.arms[1].sh.rotation.z = -0.35; p.head.rotation.x = 0.25; } } }
      else if (p.st === 'casa' || p.st === 'voltando') { p.g.visible = true; if (p.st === 'casa') { const d = doorOf(p); p.x = d[0]; p.z = d[1]; p.st = 'voltando'; }
        const [bx, bz] = kidPost(p); if (goTo(p, bx, bz, dt, KIDS.has(p.job) ? 2.6 : 1.2)) { p.st = 'post'; p.h = p.face ?? p.h; } }
      else { // no posto, fazendo o ofício
        const t = time + p.ph;
        if (!pausa(p, dt, k)) switch (p.job) {
          case 'enxada': { const c = (t * 0.62) % 1; p.grip2 = true;
            set(p, { ...keys(ENXADA, c), k: 1 });
            if (c > 0.97) { p.z += p.dir * 0.012; if (Math.abs(p.z - p.z0) > p.span / 2) p.dir *= -1; }
            if (c > 0.47 && c < 0.55 && !p.hit) { p.hit = true; const b = bladeAt(p), y = heightAt(b.x, b.z), dry = U.uRain.value < 0.2 && U.uWet.value < 0.4;   // onde a lâmina bate de verdade
              if (dry) emit('poeira', b.x, y + 0.03, b.z, 4, { spread: 0.35, speed: 0.5 }); emit('lasca', b.x, y + 0.05, b.z, 3, { spread: 0.25, speed: 0.4, color: [0.42, 0.28, 0.18] }); }
            if (c > 0.6 && c < 0.76 && rnd() < dt * 9) { const b = bladeAt(p); TOR.add(b.x + (rnd() - 0.5) * 0.18, b.z + (rnd() - 0.5) * 0.18); }   // a terra puxada fica em torrões atrás da lâmina
            if (c < 0.4) p.hit = false; p.h = p.dir > 0 ? 0 : Math.PI; break; }
          case 'colher': { const c = (t * 0.25) % 1; if (c < 0.5) { if (goTo(p, p.x0, p.z0 + Math.sin(t * 0.06) * p.span / 2, dt * 0.5, 0.6)) set(p, { k }); }
            else set(p, { sh: [-2.6, -0.3], el: [-0.4, -0.2], hy: 0.3, hx: -0.3, k }); break; }
          case 'varrer': { const s = Math.sin(t * 2.4); p.grip2 = true; set(p, { sp: 0.3, sy: s * 0.28, sh: [-0.75 + s * 0.2, -1.05 + s * 0.1], shz: [0.45, -0.35], el: [-0.25, -1.15], hp: [0.05, -0.05], kn: [0.12, 0.12], hx: 0.25, k });
            p.x += Math.sin(t * 0.2) * dt * 0.15; p.z += Math.cos(t * 0.17) * dt * 0.15; if (U.uRain.value < 0.1 && rnd() < dt * 1.5) emit('poeira', p.x + Math.sin(p.h) * 0.7, heightAt(p.x, p.z) + 0.04, p.z + Math.cos(p.h) * 0.7, 1, { spread: 0.5, speed: 0.4 }); break; }
          case 'agua': poco(p, dt, t, k); break;
          case 'sentar': set(p, { py: (p.seatY ?? 0) + 0.47, hp: [-1.5, -1.45], kn: [1.45, 1.5], sh: [-0.45, -0.5], el: [-0.7, -0.6], hy: Math.sin(t * 0.3) * 0.5, hx: 0.05, k }); p.h = p.face; break;
          case 'conversa': { const g2 = Math.max(0, Math.sin(t * 1.3)); set(p, { sh: [-0.4 - g2 * 0.5, -0.2], el: [-1.1 - g2 * 0.3, -0.3], hx: Math.sin(t * 2.1) * 0.08, hy: Math.sin(t * 0.4) * 0.2, k }); p.h = p.face; break; }
          case 'pega': pega(p, dt, t); break;
          case 'lab': set(p, { ...(window.__lab || {}), k: 1 }); p.grip2 = !(window.__lab || {}).solta; p.toolDown = !!(window.__lab || {}).chao; p.h = p.face ?? p.h; break;   /* bancada de poses (testes) */
          case 'morador': {
            if (p.cyc === 'anda') { if (!p.alvo) { p.alvo = pickSpot(p); p.x0 = p.alvo.x; p.z0 = p.alvo.z; }
              if (goTo(p, p.alvo.x, p.alvo.z, dt, p.alvo.act === 'brinca' ? 2.6 : p.vel)) { p.cyc = 'faz'; p.w8 = p.alvo.dur ?? (p.kid ? 4 + rnd() * 5 : 9 + rnd() * 14); if (p.alvo.face != null) p.h = p.alvo.face; } }
            else { p.w8 -= dt; faz(p, p.alvo.act, t, dt, k); if (p.w8 < 0) { p.cyc = 'anda'; p.alvo = null; } }
            break; }
          case 'bola': bola(p, dt, t, k); break;
          case 'vaqueiro': { if (tratar(p, dt, t, k)) break; p.cyc = p.cyc ?? 0; const dx = Math.cos(p.dirRot), dz = -Math.sin(p.dirRot);
            if (p.cyc === 0) { if (goTo(p, p.x0 + dx * p.span * (p.side ? 1 : 0), p.z0 + dz * p.span * (p.side ? 1 : 0), dt, 0.9)) { p.cyc = 1; p.w8 = 6 + rnd() * 6; } }
            else { p.w8 -= dt; p.h += (p.face - p.h) * k; set(p, { sp: 0.18, sh: [-1.3, -1.25], el: [-0.9, -0.8], hy: Math.sin(t * 0.5) * 0.4, k }); if (p.w8 < 0) { p.cyc = 0; p.side = !p.side; } } break; }
          case 'lavar': lavar(p, dt, t, k); break;
          case 'forno': { const c = (t * 0.18) % 1; p.grip2 = true; if (c < 0.35) set(p, { sp: 0.3, sh: [-1.3, -0.6], shz: [0.4, -0.3], el: [-0.15, -0.6], hp: [-0.1, 0.25], kn: [0.15, 0.3], k });
            else if (c < 0.5) set(p, { sp: 0.1, sh: [-0.9, -0.3], shz: [0.4, -0.3], el: [-0.4, -0.9], k }); else set(p, { sp: 0.45, sh: [-0.7, -0.7], el: [-0.9, -0.9], hx: 0.3, k: Math.min(1, dt * 4) });
            p.h = p.face + (c > 0.38 && c < 0.55 ? Math.PI * 0.6 : 0); break; }
          case 'serrar': { const s2 = Math.sin(t * 5.5); set(p, { sp: 0.42, sh: [-0.9 + s2 * 0.35, -0.5], el: [-0.9 - s2 * 0.4, -0.7], hp: [-0.2, 0.3], kn: [0.25, 0.2], hx: 0.3, sy: 0.15, k: Math.min(1, dt * 14) }); p.h = p.face;
            if (rnd() < dt * 4) emit('lasca', L.cavalete.p[0], heightAt(...L.cavalete.p) + 0.75, L.cavalete.p[1], 1, { spread: 0.3, speed: 0.4, color: [0.92, 0.82, 0.62] }); break; }
          case 'fiar': { const s2 = Math.sin(t * 3); set(p, { py: (p.seatY ?? 0) + 0.47, hp: [-1.5, -1.45], kn: [1.45, 1.5], sh: [-0.8, -0.5 + s2 * 0.25], el: [-1.0, -1.1 - s2 * 0.3], hx: 0.25, k }); p.h = p.face; break; }
          case 'pescar': { p.h = p.face; const j = pesca(p, dt, t, p.fpt || (p.fpt = [p.x0 + Math.sin(p.face) * 3.2, p.z0 + Math.cos(p.face) * 3.2]));
            set(p, { py: 0.18, hp: [-1.5, -1.4], kn: [0.35, 0.3], sh: [-0.3, -0.9 - j * 1.0 + Math.sin(t * 0.7) * 0.05], el: [-0.5, -0.6 + j * 0.3], sp: -0.1 - j * 0.12, k: j ? Math.min(1, dt * 14) : k }); break; }
          case 'lagoa': lagoa(p, dt, t, k); break;
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
      if (p.warmSpec && !agasalhoFeito) { p.warmGeo = buildBody(p.warmSpec).mesh.geometry; p.warmSpec = null; agasalhoFeito = true; }
      if (p.g.visible && p.st !== 'casa' && p.fallT == null) { const br = Math.sin(time * 1.6 + p.ph); p.spine.rotation.x += br * 0.012;
        const wb = U.uWindBase.value * (1 + U.uWindIu.value * 0.5), q = Math.max(0, Math.min(1, (wb - 5) / 6)), wd = U.uWindDir.value;
        if (q > 0) { const fx = Math.sin(p.h), fz = Math.cos(p.h), along = fx * wd.x + fz * wd.y, side = fz * wd.x - fx * wd.y;
          p.spine.rotation.x += -along * 0.16 * q; p.spine.rotation.z = side * 0.1 * q;
          if (p.s.hat && !['sentar', 'lavar', 'rezar', 'machado', 'agua', 'aluno', 'licao'].includes(p.job) && (p.st === 'post')) { p.arms[0].sh.rotation.x = -2.7; p.arms[0].el.rotation.x = -1.8; p.arms[0].sh.rotation.z = 0.3; } }
        else p.spine.rotation.z *= 0.9;
        const hot = U.uSeca.value > 0.6 && hour > 11 && hour < 15.5 && day > 0.6 && rain < 0.05;
        if (hot && p.st === 'post' && ['enxada', 'colher', 'varrer', 'vaqueiro'].includes(p.job)) { const c = (time * 0.12 + p.ph) % 1; if (c < 0.08) { p.grip2 = false; p.arms[0].sh.rotation.x = -2.5; p.arms[0].el.rotation.x = -2.0; p.arms[0].sh.rotation.z = 0.45; p.head.rotation.x = -0.15; } }
        if (scare > 1.4) { p.spine.rotation.x += 0.15; p.head.rotation.x = 0.35; for (const a of p.arms) { a.sh.rotation.z = (a === p.arms[0] ? 0.35 : -0.35); } }
        // em pé parado: o peso troca de perna de tempos em tempos (um joelho cede, o quadril desce daquele lado, o ombro compensa)
        if (p.st === 'post' && !p.moving && ['conversa', 'vaqueiro', 'olha'].includes(p.job === 'morador' ? (p.alvo && p.alvo.act) : p.job) && !(p.job === 'vaqueiro' && (p.cyc === 0 || p.tr != null))) {
          const w = Math.sin(time * 0.21 + p.ph * 3), side = w > 0 ? 0 : 1, a = Math.min(1, Math.abs(w) * 3);
          p.legs[side].kn.rotation.x += 0.14 * a; p.legs[side].hp.rotation.x -= 0.05 * a; p.pelvis.rotation.z = (side ? -1 : 1) * 0.045 * a; p.spine.rotation.z += (side ? 1 : -1) * 0.03 * a; p.pelvis.position.y -= 0.012 * a; }
        else p.pelvis.rotation.z *= 0.9;
        p.waveCd = Math.max(0, (p.waveCd || 0) - dt);
        if (p.wave > 0) { p.wave -= dt; waveArm(p, time); if (p.waveAt) turnTo(p, p.waveAt.x, p.waveAt.z, dt * (p.moving ? 0 : 1)); }
        else if (!p.waveCd && p.st === 'post' && !p.running && !KIDS.has(p.job) && p.job !== 'lagoa' && !['rezar', 'aluno', 'licao', 'lavar', 'agua', 'machado'].includes(p.job) && !(p.job === 'morador' && p.kid) && p.tr == null) { for (const o of people) { if (o === p || !o.g.visible || !o.moving || KIDS.has(o.job) || o.running || o.kid) continue;
            if (Math.hypot(o.x - p.x, o.z - p.z) < 4) { p.wave = 1.4; p.waveCd = 30 + rnd() * 25; p.waveAt = o; if (!o.waveCd) { o.wave = 1.2; o.waveCd = 30 + rnd() * 25; o.waveAt = p; } break; } } }
        if (p.st === 'post' && !KIDS.has(p.job) && p.job !== 'rezar') { let tx = null, tz = null;
          if (alert && alert.who !== p && Math.hypot(alert.x - p.x, alert.z - p.z) < 16) { tx = alert.x; tz = alert.z; }
          else if (['conversa', 'varrer', 'agua', 'sentar', 'vaqueiro', 'pescar', 'licao'].includes(p.job)) { let bd = 6; for (const o of people) { if (o === p || !o.g.visible) continue; const d = Math.hypot(o.x - p.x, o.z - p.z); if (d < bd && (o.running || KIDS.has(o.job))) { bd = d; tx = o.x; tz = o.z; } } }
          if (tx !== null) { const e = angTo(p.h, Math.atan2(tx - p.x, tz - p.z)); p.head.rotation.y += (Math.max(-1.1, Math.min(1.1, e)) - p.head.rotation.y) * Math.min(1, dt * 3); } } }
      p.g.position.set(p.x, p.yAbs != null ? p.yAbs : gy + yOff, p.z); p.g.rotation.y = p.h; p.g.rotation.x = p.pitch;
      if (p.g.visible) { const mode = modoFerr(p), d = cam ? Math.hypot(cam.position.x - p.x, cam.position.y - gy, cam.position.z - p.z) : 0, perto = d < 32 || !!window.__pertoTodos;   /* __pertoTodos: o juiz da gente liga o detalhe de todos */
        // o solucionador (anatomia.js): limites das juntas, coluna, ombro com escápula, pescoço, chão e mãos
        p.rig.solve({ dt, perto, contato: perto || d < 140 && (frameN + p.home) % 3 === 0, g: p.g, heightAt, andando: p.moving, livre: p.yAbs != null || Math.abs(p.pitch) > 0.05, maos: maosDe(p, mode) });
        alignTool(p, mode); face(p, dt);
        // o pé de apoio (o mais baixo), no rumo do corpo: na próxima curva o corpo gira em volta dele
        if (p.moving && p.yAbs == null) { const a = p.legs[0].ft.getWorldPosition(_pa0), b = p.legs[1].ft.getWorldPosition(_pb0), f = a.y < b.y ? a : b, dx = f.x - p.x, dz = f.z - p.z, c = Math.cos(p.h), sn = Math.sin(p.h);
          p.peO = [dx * c - dz * sn, dx * sn + dz * c]; } else p.peO = null; }
      stepCloth(p, dt); } });

  // ---------- o poço: chega com a lata vazia na cabeça e a põe no chão; solta o balde (o sarilho dispara, ela só segura o freio), espera encher,
  // sobe girando a manivela (cada volta, um tranco), puxa o balde para fora pela alça, despeja na lata (a água sobe dentro dela), agacha,
  // pega a lata e a leva à cabeça; em casa despeja no pote e volta
  const LATA_L = [0.92, 0.88], _lv = new THREE.Vector3(), _lq = new THREE.Quaternion(), _lh = new THREE.Vector3(), _ls = new THREE.Vector3(), _w0 = new THREE.Vector3(), _w1 = new THREE.Vector3();
  function lataChao(p) { if (p.lataChao) return p.lataChao; const c = p.lata.clone(); c.children[1].visible = false; scene.add(c); c.visible = false; return (p.lataChao = c); }   // sem a rodilha
  function lataAgua(l, f) { const w = l.children[3]; w.visible = f > 0.03; w.position.y = -0.3 * (1 - f); }
  function poco(p, dt, t, k) { const R = W.rig; p.cyc = p.cyc ?? 0; const crank = R ? R.crankAt() : null, home = doorOf(p);
    const LC = p.lata && R ? lataChao(p) : null, spot = R ? R.g.localToWorld(_lv.set(LATA_L[0], 0, LATA_L[1])) : null; if (spot) spot.y = heightAt(spot.x, spot.z);
    const onHead = p.cyc === 0 || p.cyc === 5, apoio = () => { p.arms[0].sh.rotation.x = -2.9; p.arms[0].el.rotation.x = -0.5; p.arms[0].sh.rotation.z = 0.2; p.spine.rotation.x = -0.02; };
    if (p.lata) p.lata.visible = onHead; if (LC) { LC.visible = !onHead && p.cyc !== 6; if (p.cyc >= 1 && p.cyc <= 3) { LC.position.copy(spot); LC.quaternion.setFromAxisAngle(_lh.set(0, 1, 0), 0.4); p.lata.getWorldScale(_ls); LC.scale.copy(_ls); } }
    // a lata vai da cabeça ao chão (u = 0) ou do chão à cabeça (u = 1) acompanhando as mãos
    const lataEntre = u => { if (!LC) return; p.lata.getWorldPosition(_lh); p.lata.getWorldQuaternion(_lq); p.lata.getWorldScale(_ls); const e = u * u * (3 - 2 * u);
      LC.position.copy(spot).lerp(_lh, e); LC.position.y += Math.sin(e * Math.PI) * 0.12; LC.quaternion.setFromAxisAngle(_lv.set(0, 1, 0), 0.4).slerp(_lq, e); LC.scale.copy(_ls); };
    const crouch = (u, w) => set(p, { py: 0.95 - 0.4 * (1 - u), sp: 0.55 * (1 - u), hp: [-1.05 * (1 - u), -1.05 * (1 - u)], kn: [1.35 * (1 - u), 1.35 * (1 - u)], sh: [-0.7 - 2.2 * u, -0.7 - 2.2 * u], el: [-0.35 - 0.25 * u, -0.35 - 0.25 * u], hx: 0.3 * (1 - u), k: Math.min(1, dt * w) });
    if (p.cyc === 0) { if (R) { R.hand = null; } if (LC) lataAgua(p.lata, 0); if (goTo(p, p.x0, p.z0, dt)) { p.cyc = 7; p.w8 = 0; } else if (p.lata) apoio(); }
    else if (p.cyc === 7) { p.w8 += dt; if (spot) faceTo(p, Math.atan2(spot.x - p.x, spot.z - p.z), dt); const u = 1 - sm(0.2, 1.3, p.w8);   // põe a lata vazia no chão
      crouch(p.w8 < 1.3 ? u : sm(1.3, 1.9, p.w8), 7); if (LC) { LC.visible = true; lataEntre(u); } if (p.lata) p.lata.visible = false; if (p.w8 > 1.9) { p.cyc = 1; p.w8 = 0; } }
    else if (p.cyc === 1 || p.cyc === 2) { // 1: solta o balde — o sarilho dispara e ela freia com a mão no tambor; 2: espera encher e sobe devagar, volta a volta
      if (crank) faceTo(p, Math.atan2(crank.x - p.x, crank.z - p.z) + 0.5, dt); p.w8 += dt;
      const down = p.cyc === 1; let lv = R ? R.level : 0;
      if (R) { if (down) { const v = 0.2 + 0.8 * sm(0, 0.8, p.w8) * (0.35 + 0.65 * sm(0, 0.25, lv)); lv = Math.max(0, lv - v * dt / 2.2); }   // freia perto da água
        else if (p.w8 > 1.4) lv = Math.min(1, lv + dt / 10 * (0.75 + 0.25 * Math.sin(R.axle.rotation.x)));   // cada volta tem o ponto de força
        R.set(lv); }
      const th = R ? R.axle.rotation.x : t * 3, pull = down ? 0 : sm(1.0, 1.6, p.w8);
      if (down) set(p, { sp: 0.3, sh: [-1.05, -1.35], el: [-0.5, -0.75], shy: [-0.1, 0.3], hp: [-0.15, 0.2], kn: [0.2, 0.25], hx: 0.35, k: Math.min(1, dt * 10) });   // olha o balde descer
      else set(p, { sp: 0.18 + pull * 0.08 * Math.sin(th), sh: [-0.95, -1.3 + pull * 0.38 * Math.sin(th)], el: [-0.45, -0.55 - pull * 0.4 * Math.cos(th)], shy: [-0.15, 0.35], hp: [-0.1, 0.15 + pull * 0.05 * Math.sin(th)], kn: [0.15, 0.2], hx: 0.15, k: Math.min(1, dt * 14) });
      if (down && R && R.level <= 0.001) { p.cyc = 2; p.w8 = 0; emit('respingo', W.p[0], R.g.position.y + R.waterY + 0.05, W.p[1], 6, { spread: 0.25, speed: 0.6 }); }
      if (!down && R && R.level > 0.85 && rnd() < dt * 12) { const b = R.bucketAt(_w0); emit('gota', b.x + (rnd() - 0.5) * 0.2, b.y - 0.33, b.z + (rnd() - 0.5) * 0.2, 1, { spread: 0.05 }); }   // escorre do balde que sai
      if (!down && R && R.level >= 0.999) { p.cyc = 3; p.w8 = 0; } }
    else if (p.cyc === 3) { p.w8 += dt; const tw = p.w8; if (spot) faceTo(p, Math.atan2(spot.x - p.x, spot.z - p.z) - 0.35, dt);   // puxa o balde pela alça, despeja e devolve ao gancho
      const reach = sm(0, 0.8, tw) * (1 - sm(3.4, 4.2, tw)), tilt = sm(0.9, 1.7, tw) * (1 - sm(2.9, 3.5, tw));
      set(p, { sp: 0.3 + tilt * 0.25, sh: [-1.25 - tilt * 0.2, -1.05 - tilt * 0.45], el: [-0.3, -0.6 + tilt * 0.2], shy: [0.25, -0.15], hx: 0.45, hp: [-0.15, -0.15], kn: [0.15, 0.15], k: Math.min(1, dt * 6) });
      if (R && LC) { const hang = _w0.set(0.1, 1.2, 0), over = R.g.worldToLocal(_w1.copy(spot)); const dx = over.x - 0.1, dz = over.z, dl = Math.hypot(dx, dz) || 1;
        over.set(over.x - dx / dl * 0.12, 0.98 + 0.08 * (1 - tilt), over.z - dz / dl * 0.12);   // a boca do balde em cima da lata
        if (reach > 0.001) { R.hand = (R.hand || new THREE.Vector3()).copy(hang).lerp(over, reach); R.tiltAxis = (R.tiltAxis || new THREE.Vector3()).set(dz / dl, 0, -dx / dl); R.tilt = tilt * 1.75; } else R.hand = null;
        if (tilt > 0.55 && R.full) { const lip = R.lipAt(_w1); emit('gota', lip.x, lip.y - 0.02, lip.z, 1, { spread: 0.02 }); p.fill = Math.min(1, (p.fill ?? 0) + dt * 0.7); }
        if (tw > 3.0) R.full = false; R.set(1); lataAgua(LC, p.fill ?? 0); }
      if (tw > 4.4) { p.cyc = 4; p.w8 = 0; if (R) R.hand = null; } }
    else if (p.cyc === 4) { p.w8 += dt; const up = sm(0.9, 1.8, p.w8);   // agacha, pega a lata no chão e sobe com ela à cabeça
      crouch(Math.min(up + (1 - sm(0, 0.6, p.w8)), 1), 8); lataEntre(up); if (LC) lataAgua(LC, 1); if (p.w8 > 2.1) { p.cyc = 5; if (p.lata) lataAgua(p.lata, 1); } }
    else if (p.cyc === 5) { if (goTo(p, ...home, dt, 0.95)) { p.cyc = 6; p.w8 = 4; } else apoio(); }
    else { p.w8 -= dt; set(p, { k }); if (p.w8 < 0) { p.cyc = 0; p.fill = 0; } } }

  // ---------- a lavadeira: esfrega na pedra (espuma), bate a roupa (respingo), enxágua, torce (pinga) e estende no varal
  function lavar(p, dt, t, k) { const V = L.varal; p.cyc = p.cyc ?? 0; p.w8 = (p.w8 ?? 0) + dt; if (p.cyc >= 1 && !p.panoMao) pegaPano(p); const stone = [lav[0] + Math.sin(lavFace) * 0.62, lav[1] + Math.cos(lavFace) * 0.62], wl = waterLevelAt(...lav) + 0.14;
    const kneel = { py: 0.52, hp: [0.05, 0.05], kn: [1.55, 1.55] }, next = (n, d) => { if (p.w8 > d) { p.cyc = n; p.w8 = 0; } };
    if (p.cyc === 0) { if (goTo(p, lav[0], lav[1], dt)) { p.cyc = 1; p.w8 = 0; } }
    else if (p.cyc === 1) { const s = Math.sin(t * 5); faceTo(p, lavFace, dt); set(p, { ...kneel, sp: 0.85, sh: [-1.0 + s * 0.25, -1.0 - s * 0.25], el: [-0.4, -0.4], hx: 0.2, k: Math.min(1, dt * 10) });
      if (rnd() < dt * 5) emit('espuma', stone[0] + (rnd() - 0.5) * 0.4, wl, stone[1] + (rnd() - 0.5) * 0.4, 1, { spread: 0.3 }); next(2, 9); }
    else if (p.cyc === 2) { const c = (p.w8 * 0.9) % 1, up = c < 0.6; set(p, { ...kneel, sp: up ? 0.15 : 0.95, sh: up ? [-2.75, -2.75] : [-0.9, -0.9], el: [-0.2, -0.2], hx: up ? -0.1 : 0.3, k: Math.min(1, dt * (up ? 6 : 22)) });
      if (!up && !p.hit) { p.hit = true; emit('respingo', stone[0], wl, stone[1], 9, { spread: 0.9, speed: 1.1 }); } if (up) p.hit = false; next(3, 4.4); }
    else if (p.cyc === 3) { const s = Math.sin(t * 2.2); set(p, { ...kneel, sp: 1.05, sh: [-0.55 + s * 0.2, -0.55 + s * 0.2], el: [-0.15, -0.15], hx: 0.5, k }); if (rnd() < dt * 4) emit('espuma', stone[0] + Math.sin(lavFace) * 0.5, wl - 0.1, stone[1] + Math.cos(lavFace) * 0.5, 1); next(4, 3); }
    else if (p.cyc === 4) { const s = Math.sin(t * 7); set(p, { ...kneel, sp: 0.2, sh: [-1.05, -1.05], el: [-1.35 + s * 0.2, -1.35 - s * 0.2], shy: [0.35 + s * 0.15, -0.35 + s * 0.15], hx: 0.3, k: Math.min(1, dt * 10) });
      if (rnd() < dt * 18) emit('gota', p.x + Math.sin(p.h) * 0.3, heightAt(p.x, p.z) + 0.75, p.z + Math.cos(p.h) * 0.3, 1, { spread: 0.15 }); if (p.w8 > 2.6) { p.cyc = p.panoItem ? 5 : 1; p.w8 = 0; } }
    else if (p.cyc === 5) { const at = V.at(V.items.indexOf(p.panoItem)), dx = at.x - V.c[0], dz = at.z - V.c[1], nrm = [V.dir[1], -V.dir[0]], side = ((lav[0] - V.c[0]) * nrm[0] + (lav[1] - V.c[1]) * nrm[1]) > 0 ? 1 : -1;
      const sx = at.x + nrm[0] * 0.42 * side, sz = at.z + nrm[1] * 0.42 * side; if (goTo(p, sx, sz, dt, 1.0)) { p.cyc = 6; p.w8 = 0; p.hang = Math.atan2(at.x - sx, at.z - sz); } }
    else if (p.cyc === 6) { faceTo(p, p.hang, dt); set(p, { sh: [-2.75, -2.75], el: [-0.35, -0.35], shy: [0.1, -0.1], hx: -0.35, k: Math.min(1, dt * 6) }); if (p.w8 > 1.2 && p.panoItem && !p.hung) { p.panoItem.estende(); V.n = V.items.filter(i => i.visible).length; p.panoMao = p.panoItem = null; p.hung = true; }
      if (p.w8 > 1.8) { p.cyc = 7; p.w8 = 0; p.hung = false; } }
    else { if (goTo(p, lav[0], lav[1], dt, 1.0)) { p.cyc = 1; p.w8 = 0; } } }
  // a peça que a lavadeira lava: a próxima roupa do cesto que ainda não está no varal (ou um pano de prato, se o varal encheu)
  function pegaPano(p) { const V = L.varal, it = V && V.items ? V.items.find(i => !i.visible && !people.some(o => o.panoItem === i)) : null;
    p.tool.visible = false; p.panoItem = it || null;
    p.panoMao = it ? it.pano : (p.panoProprio || (p.panoProprio = (() => { const q = Pano({ nx: 6, ny: 7, tecido: 'algodao', color: 0xf4f0e8, posIni: (i, j) => new THREE.Vector3(p.x + i * 0.07, 0.5 - j * 0.07, p.z) }); scene.add(q.mesh); return q; })()));
    const C = p.panoMao; C.solta(); C.enrola = 0; C.molhado = Math.max(C.molhado, 0.4); C.mesh.visible = true; p.g.updateMatrixWorld(true); palm(p.arms[1], _pm1, _e1b);
    const dx = (it ? 0.6 : 0.42) / C.nx; C.reinicia((i, j) => new THREE.Vector3(_pm1.x + (i - C.nx / 2) * dx * 0.3, _pm1.y - j * dx * 0.5, _pm1.z + (i - C.nx / 2) * dx * 0.3)); }
  // o pano nas mãos: cantos presos nas palmas conforme o que ela faz; deita na pedra, afunda e boia no córrego, enrola ao torcer
  const _pm0 = new THREE.Vector3(), _pm1 = new THREE.Vector3(), _e0b = new THREE.Vector3(), _e1b = new THREE.Vector3(); let pedraCaixa = null;
  const cantos = C => { const row = j => { let a = -1, b = -1; for (let i = 0; i <= C.nx; i++) if (C.ativo[C.at(i, j)]) { if (a < 0) a = i; b = i; } return [a, b]; }; return { top: row(0), mid: row(Math.round(C.ny / 2)), j: Math.round(C.ny / 2) }; };
  function maoPano(p, dt) { const C = p.panoMao, cyc = p.cyc ?? 0; if (!C) return;
    palm(p.arms[0], _pm0, _e0b); palm(p.arms[1], _pm1, _e1b); const q0 = _pm0.clone(), q1 = _pm1.clone(), K = C.cantos || (C.cantos = cantos(C));
    C.solta(); const [l, r] = K.top;
    if (cyc >= 1 && cyc <= 2) { C.pin(l, 0, () => q0); C.pin(r, 0, () => q1); }
    else if (cyc === 3) C.pin(r, 0, () => q1);
    else if (cyc === 4) { C.pin(K.mid[0], K.j, () => q0); C.pin(K.mid[1], K.j, () => q1); }
    else { const q1b = q1.clone().add(new THREE.Vector3(0.03, 0, 0)); C.pin(l, 0, () => q1); C.pin(r, 0, () => q1b); }
    C.enrola = cyc === 4 ? Math.min(1, C.enrola + dt * 0.9) : Math.max(0, C.enrola - dt * 0.6);
    if (cyc >= 1 && cyc <= 3) C.molhado = Math.min(1, C.molhado + dt * 0.5);
    if (!pedraCaixa && L.lavStone) pedraCaixa = new THREE.Box3().setFromObject(L.lavStone);
    const nearLav = lav && Math.hypot(p.x - lav[0], p.z - lav[1]) < 3;
    C.passo(dt, { vento: ventoAgora(p.x, p.z, 0.5), chao: heightAt, caixa: nearLav && pedraCaixa ? [pedraCaixa] : null, agua: nearLav ? (x, z) => waterLevelAt(x, z) - U.uWaterDrop.value : null, correnteza: nearLav ? new THREE.Vector3(Math.cos(lavFace) * 0.4, 0, -Math.sin(lavFace) * 0.4) : null, it: 5 });
    if (cyc === 4 && C.molhado > 0.5 && rnd() < dt * 14) { const c = C.centro(); emit('gota', c.x, c.y - 0.03, c.z, 1, { spread: 0.1 }); } }

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
    p.grip2 = p.cyc >= 1 && p.cyc <= 3 || p.cyc === 5; p.toolDown = p.cyc === 0 || p.cyc === 4;
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
      const wipe = p.w8 > 5 && p.w8 < 6.2; if (wipe) p.grip2 = false;
      set(p, { sp: 0.05, sh: [wipe ? -2.5 : -0.55, -0.55], el: [wipe ? -2.0 : -0.75, -0.75], shy: [wipe ? -0.1 : 0.35, -0.35], shz: [wipe ? -0.45 : 0.1, -0.1], hy: e, hx: wipe ? -0.15 : 0.05, k: Math.min(1, dt * 4) });
      p.tool.rotation.x = -1.2; if (p.w8 > (L.lenha.n === 0 ? 14 : 8)) { p.cyc = 0; p.w8 = 0; p.tool.rotation.x = 0; } }
    if (p.cyc !== 5) p.tool.rotation.x = 0; }

  // ---------- o vaqueiro trata o gado: quando a ração do cocho está acabando, contorna o curral por fora, pega um saco no
  // rancho, abre a porteira (ela fecha atrás dele), despeja a ração no cocho com o gado em volta, sai, devolve o saco vazio
  // e volta para a cerca. De manhã cedo o rancho amanhece com os sacos repostos.
  const Cr = L.corral, crLoc = (lx, lz) => rot2(Cr.p, Cr.rot, lx, lz), cs = Math.cos(Cr.rot), sn = Math.sin(Cr.rot);
  const TR = { canto: crLoc(Cr.w / 2 + 1.5, Cr.d / 2 + 1.5), rancho: crLoc(Cr.rancho[0], Cr.rancho[1] + 1.3), cocho: crLoc(Cr.cocho[0] + 1.8, Cr.cocho[1]), hCocho: Math.atan2(-cs, sn), hRancho: Math.atan2(-sn, -cs), hFace: Math.atan2(-sn, -cs) };
  const cochoSt = i => crLoc(Cr.cocho[0] + 0.85 - i * 0.57, Cr.cocho[1] + 0.82);   // as paradas do lado de dentro do cocho
  for (const G of L.gates || []) G.sound = kind => som(kind === 'abre' ? 'rangido' : 'trinco', G.c[0], G.c[1], 0.8);
  function tratar(p, dt, t, k) { const F = Cr.feed, G = Cr.gateObj, R3 = Cr.rancho3d; if (!G || !R3) return false;
    const hr = window.__hour ?? 12; if (hr < 6.5) R3.sacos.forEach(m => { m.visible = true; });   // reposto de madrugada
    if (p.tr == null) { if (F.level > 0.3 || hr < 6.5 || hr > 18 || !R3.sacos.some(m => m.visible)) return false; p.tr = 0; p.w8 = 0; }
    if (!p.saco) { p.saco = new THREE.Mesh(R3.sacoGeo(), R3.sacoMat); p.saco.castShadow = true; p.saco.visible = false; p.g.add(p.saco); }
    const S = p.saco, a1 = p.arms[1], a0 = p.arms[0], wait = (to, nxt, side) => {   // vai ao trinco, levanta a tramela, empurra a folha e passa; do outro lado a folha volta sozinha e bate
      if (p.gw == null) { if (goTo(p, ...G.spot(side), dt, 0.9)) p.gw = 0; return; }
      const lp = G.latchAt(); p.gw += dt; if (p.gw > 0.25) G.raise(); if (p.gw > 0.6) G.ask();
      if (G.open > 0.8 && p.gw > 1.2) { if (goTo(p, ...to, dt, 0.95)) { p.tr = nxt; p.w8 = 0; p.gw = null; } return; }
      const push = sm(0.6, 1.4, p.gw); faceTo(p, Math.atan2(lp.x - p.x, lp.z - p.z) + push * 0.5 * side, dt);
      set(p, { sp: 0.15 + push * 0.2, sh: [-1.2 - 0.25 * (1 - push), -0.2], el: [-0.25 - 0.3 * push, -0.3], shz: [0.25, -0.1], hx: 0.15, hp: [-0.1 - push * 0.25, 0.1], kn: [0.15 + push * 0.2, 0.15], k: Math.min(1, dt * 6) }); };
    if (p.gw != null && p.gw > 0.6 && (p.tr === 2.5 || p.tr === 5.5)) G.ask();
    if ((p.tr === 4 || p.tr === 7) && Math.hypot(p.x - G.c[0], p.z - G.c[1]) < 1.6) G.ask();   // segura aberta até passar
    p.w8 += dt;
    if (p.tr === 0) { if (goTo(p, ...TR.canto, dt, 1.05)) p.tr = 1; }                                  // por fora da cerca
    else if (p.tr === 1) { if (goTo(p, ...TR.rancho, dt, 1.0)) { p.tr = 1.5; p.w8 = 0; } }
    else if (p.tr === 1.5) { faceTo(p, TR.hRancho, dt); const down = p.w8 < 1.1;                      // agacha e põe o saco no ombro
      set(p, down ? { sp: 0.95, sh: [-1.35, -1.35], el: [-0.3, -0.3], hp: [-0.45, -0.3], kn: [0.6, 0.5], hx: 0.3, k: Math.min(1, dt * 5) } : { k });
      if (p.w8 > 0.9 && !S.visible) { const top = [...R3.sacos].reverse().find(m => m.visible); if (top) top.visible = false; S.visible = true; S.scale.set(1, 1, 1); }
      if (p.w8 > 1.8) { p.tr = 2; p.w8 = 0; } }
    else if (p.tr === 2) { if (goTo(p, ...G.outside, dt, 1.0)) { p.tr = 2.5; p.w8 = 0; p.gw = null; } }
    else if (p.tr === 2.5) wait(G.inside, 4, -1);                                                         // abre a porteira e entra
    else if (p.tr === 4) { if (goTo(p, ...cochoSt(0), dt, 1.0)) { p.tr = 4.5; p.w8 = 0; p.st4 = 0; } }
    else if (p.tr === 4.5) { // ao longo do cocho, em quatro paradas: inclina o saco, a ração escorre da boca dele e faz um morrinho; anda um passo de lado e repete
      const st = cochoSt(p.st4); if (Math.hypot(p.x - st[0], p.z - st[1]) > 0.2) { goTo(p, ...st, dt, 0.55); p.w8 = 0; }
      else { faceTo(p, TR.hFace, dt); const tip = sm(0.15, 0.6, p.w8) * (1 - sm(1.75, 2.1, p.w8));
        set(p, { sp: 0.3 + tip * 0.2, sh: [-1.0 - tip * 0.3, -0.8 - tip * 0.45], el: [-0.6 + tip * 0.15, -0.9 + tip * 0.3], shz: [0.25, -0.25], hx: 0.45, hp: [-0.15, -0.1], kn: [0.15, 0.1], k: Math.min(1, dt * 5) });
        if (tip > 0.6 && S.visible) { S.updateMatrixWorld(); const m = S.localToWorld(_w0.set(-0.3, 0, 0)), lc = F.cocho.worldToLocal(_w1.copy(m));
          if (rnd() < dt * 26) emit('lasca', m.x + (rnd() - 0.5) * 0.06, m.y - 0.03, m.z + (rnd() - 0.5) * 0.06, 2, { spread: 0.04, speed: 0.05, color: [0.86, 0.74, 0.36] });
          F.pour(Math.max(-1.1, Math.min(1.1, lc.x)), dt * 0.33); S.scale.y = Math.max(0.35, S.scale.y - dt * 0.05); }
        if (p.w8 > 2.3) { p.w8 = 0; if (++p.st4 > 3) { p.tr = 5; p.w8 = 0; } } }
      p.saco.userData.tip = p.st4 <= 3 && Math.hypot(p.x - st[0], p.z - st[1]) <= 0.2 ? sm(0.15, 0.6, p.w8) * (1 - sm(1.75, 2.1, p.w8)) : 0; }
    else if (p.tr === 5) { if (goTo(p, ...G.inside, dt, 1.0)) { p.tr = 5.5; p.w8 = 0; p.gw = null; } }
    else if (p.tr === 5.5) wait(G.outside, 7, 1);                                                        // sai; a porteira fecha atrás
    else if (p.tr === 7) { if (goTo(p, ...TR.rancho, dt, 1.0)) { S.visible = false; p.tr = 8; } }      // larga o saco vazio no rancho
    else if (p.tr === 8) { if (goTo(p, ...TR.canto, dt, 1.05)) p.tr = 9; }
    else if (p.tr === 9) { if (goTo(p, p.x0, p.z0, dt, 1.05)) { p.tr = null; p.cyc = 1; p.w8 = 4; } }
    // o saco: no ombro andando, na frente das mãos despejando
    if (S.visible) { if (p.tr === 4.5) { const tp = S.userData.tip || 0; S.position.set(0.05, 1.08 + tp * 0.05, 0.4 + tp * 0.08); S.quaternion.setFromUnitVectors(_w0.set(-1, 0, 0), _w1.set(0, -0.15 - tp * 0.75, 1).normalize()); }
      else if (p.tr !== 1.5) { S.position.set(0.17, 1.56, -0.03); S.rotation.set(0, Math.PI / 2, 0.15); a1.sh.rotation.x = -2.7; a1.el.rotation.x = -1.6; a1.sh.rotation.z = 0.1; }
      else { S.position.set(0, 1.3, 0.25); S.rotation.set(0, Math.PI / 2, 0); } }
    return true; }

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

  // bancada de testes: põe no vale uma pessoa feita sob medida (sexo m/f/c e o que mais quiser na ficha), parada na pose de window.__lab
  function lab(o = {}, at = [0, 0], face = 0) { const s = o.sex === 'f' ? mulher(o) : o.sex === 'c' ? crianca(o) : homem(o), p = person(s);
    Object.assign(p, { job: o.job || 'lab', st: 'post', x: at[0], z: at[1], x0: at[0], z0: at[1], h: face, face, home: 0, door: at, spots: [] }); people.push(p); return p; }
  return { update(dt) { for (const f of updaters) f(dt); }, people, ball, arrive, lab, anatomia: { passada, comprimentoPasso }, startle() { scare = 2.2; kidsHome = 15; } };
}
