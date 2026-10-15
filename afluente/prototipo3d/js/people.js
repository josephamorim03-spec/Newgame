// Os moradores do vale. Ninguém recebe ordem (o jogo é de encaixar peças); cada um tem seu ofício e sua rotina:
// capina e colhe na lavoura, varre o terreiro, busca água no poço com a lata na cabeça, conversa, descansa no banco da
// varanda, lava roupa na beira do córrego, pesca na vereda, lida com o gado no curral; as crianças correm em volta.
// Ao escurecer e na chuva forte vão para casa (fica o da varanda, com o lampião aceso).
// Corpo articulado (quadril, coluna, cabeça, ombro, cotovelo, coxa, joelho) em tamanho real, com variações de altura,
// porte, cor de pele, cabelo e roupa (camisa lisa ou xadrez, camiseta, vestido de chita, blusa e saia, avental, calça de
// brim, chapéu de palha, chapéu de couro, boné, lenço).
import * as THREE from 'three';
import { U } from './mat.js';
import { mat, paint, merge, col } from './props.js';
import { tag } from './regua.js';
import { LAYOUT, TILES, heightAt, waterDist, inHex, RIVER, SPRING, POOL_R } from './world.js';
import { chitaTexture, xadrezTexture, tramaTexture } from './textures.js';
import { buildBody, Cloth } from './body.js';

const rnd = (() => { let a = 31337; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();
const pick = a => a[Math.floor(rnd() * a.length)];
const SKIN = [0xf0c8a4, 0xdba57c, 0xc18456, 0x9a623e, 0x6e4430, 0x4e3022];
const HAIR = [0x16120e, 0x2a1c12, 0x4a2e1a, 0x6a4a2a];
const ell = (rx, ry, rz, x, y, z, s = 12) => new THREE.SphereGeometry(1, s, Math.max(6, s * 0.7 | 0)).scale(rx, ry, rz).translate(x, y, z);
const cap = (r, L, x, y, z) => new THREE.CapsuleGeometry(r, L, 4, 10).translate(x, y - L / 2 - r, z);   // pendurada: do ponto (x,y,z) para baixo
const K = ['position', 'normal', 'uv', 'color'];

export function buildPeople(scene, { mobile = false } = {}) {
  const T = tex => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(3, 2); return mat({ map: t, vertexColors: true }, { rim: '2.2', frag: 'diffuseColor.rgb*=mix(1.0,0.8,uWet);' }); };
  const MAT = { liso: mat({ vertexColors: true }, { rim: '2.2' }), trama: T(tramaTexture(53)),
    chita: ['#c8382a', '#2f6aa0', '#e0a020', '#3a8a4a', '#7a3a8a'].map((b, i) => T(chitaTexture(60 + i, b))),
    xadrez: [['#b83a2a', '#1e1a18', '#f0e8d8'], ['#2f5a9a', '#14202e', '#e8eef4'], ['#3a7a4a', '#1a2a1a', '#f0d070'], ['#8a5a2a', '#2a1a10', '#f0e0c0']].map(([a, b, c], i) => T(xadrezTexture(a, b, c, 70 + i))) };
  const people = [], updaters = [];

  // ---------- montar uma pessoa: corpo de malha única com esqueleto (body.js), saia e avental de pano, cabelo, chapéu e ferramenta
  const clothes = [];
  function person(s) {
    const g = new THREE.Group(), texOf = m => (m && m !== MAT.trama && m.map) ? m.map : null;
    const spec = { ...s, top: { color: s.top.color, tex: texOf(s.top.mat) }, bottom: { color: s.bottom.color, tex: texOf(s.bottom.mat) },
      pants: s.sex === 'c' && !s.dress ? 'bermuda' : 'longa', beard: s.sex === 'm' ? (s.beard ?? pick(['bigode', null, null, 'barba', 'bigode'])) : null,
      lencoColor: pick([0xc83a2a, 0x2f6aa0, 0xe0a020, 0xf4efe6, 0x7a3a8a]) };
    const body = buildBody(spec); g.add(body.mesh);
    // a roupa de frio (xale de lã na mulher, casaco no homem, blusa de manga comprida na criança): mesma malha, outras cores
    const warmGeo = s.sex === 'c' ? null : buildBody({ ...spec, warm: true, warmColor: s.sex === 'f' ? pick([0x8a4a3a, 0x6a5a8a, 0x4a6a5a, 0xa8743a]) : pick([0x5a4a3a, 0x3a4a5a, 0x6a6458]) }).mesh.geometry;
    const coolGeo = body.mesh.geometry;
    const { hips: pelvis, spine, head } = body, arms = body.arms.map(a => ({ sh: a.sh, el: a.el, ha: a.ha })), legs = body.legs.map(l => ({ hp: l.hp, kn: l.kn, ft: l.ft }));
    const lisoT = (geo, c) => { const m = new THREE.Mesh(geo, MAT.liso); paint(geo, col(c)); m.castShadow = true; return m; };
    // ferramenta na mão direita
    const tool = new THREE.Group(); arms[1].ha.add(tool); tool.position.set(0, -0.05, 0.01);
    const T2 = (geo, c) => tool.add(lisoT(geo, c));
    if (s.tool === 'enxada') { T2(new THREE.CylinderGeometry(0.016, 0.016, 1.3, 6).rotateX(Math.PI / 2).translate(0, 0, 0.35), 0x9a7a52); T2(new THREE.BoxGeometry(0.2, 0.17, 0.012).translate(0, -0.08, 1.0), 0x6a6e72); }
    if (s.tool === 'vassoura') { T2(new THREE.CylinderGeometry(0.013, 0.013, 1.25, 6).translate(0, -0.45, 0), 0xb08a5a); T2(new THREE.ConeGeometry(0.12, 0.28, 8).translate(0, -1.15, 0), 0x6a4a2a); }
    if (s.tool === 'vara') T2(new THREE.CylinderGeometry(0.007, 0.015, 2.6, 5).translate(0, 1.3, 0).rotateX(0.75), 0x8a7a4a);
    if (s.tool === 'balaio') T2(new THREE.CylinderGeometry(0.2, 0.15, 0.25, 14, 1, true).translate(0.18, -0.08, 0), 0xb08a52);
    tool.traverse(o => { o.userData.noRegua = true; });
    let lata = null; if (s.tool === 'lata') { lata = new THREE.Group(); head.add(lata); lata.position.set(0, 0.24, 0); lata.add(lisoT(new THREE.CylinderGeometry(0.13, 0.13, 0.32, 16).translate(0, 0.16, 0), 0xb8bcc0), lisoT(new THREE.TorusGeometry(0.09, 0.025, 6, 14).rotateX(Math.PI / 2), 0xe8e0d0));
      lata.traverse(o => { o.userData.noRegua = true; }); }
    // saia (pano) e avental (pano por cima, só na frente)
    const cl = [];
    if (s.skirt) { const len = s.sex === 'c' ? 0.36 : s.skirt <= 0.56 ? 0.5 : s.skirt <= 0.7 ? 0.62 : 0.82, bw = body.bw;
      const t = texOf(s.dress ? s.top.mat : s.bottom.mat), tex = t ? Object.assign(t.clone(), { needsUpdate: true }) : null; if (tex) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, 1); }
      cl.push(Cloth({ strips: mobile ? 16 : 22, rows: 8, len, r0x: 0.14 * bw, r0z: 0.105 * bw, flare: 0.13 + len * 0.08, tex, color: tex ? 0xffffff : (s.dress ? s.top.color : s.bottom.color) })); }
    if (s.apron) cl.push(Cloth({ strips: 8, rows: 6, len: (s.skirt ? 0.5 : 0.55), r0x: 0.155 * body.bw, r0z: 0.125 * body.bw, flare: 0.08, arc: [Math.PI / 2 - 0.8, Math.PI / 2 + 0.8], color: 0xf2ede2, margin: 0.055, drop: -0.02, minK: 0.92 }));
    for (const c of cl) { scene.add(c.mesh); clothes.push(c); }
    g.scale.setScalar(s.h / 1.70);
    const P = { g, body: body.mesh, warmGeo, coolGeo, warm: false, pelvis, spine, head, arms, legs, tool, lata, s, cloth: cl, waistY: body.waistY, bw: body.bw, x: 0, z: 0, h: 0, ph: rnd() * 6, t: 0, st: 'post', sit: 0 };
    P.rest = () => { const saved = [pelvis.position.y, spine.rotation.x, ...arms.flatMap(a => [a.sh.rotation.x, a.el.rotation.x]), ...legs.flatMap(l => [l.hp.rotation.x, l.kn.rotation.x])];
      pelvis.position.y = 0.95; spine.rotation.x = 0; for (const a of arms) a.sh.rotation.x = a.el.rotation.x = 0; for (const l of legs) l.hp.rotation.x = l.kn.rotation.x = 0;
      return () => { let i = 0; pelvis.position.y = saved[i++]; spine.rotation.x = saved[i++]; for (const a of arms) { a.sh.rotation.x = saved[i++]; a.el.rotation.x = saved[i++]; } for (const l of legs) { l.hp.rotation.x = saved[i++]; l.kn.rotation.x = saved[i++]; } }; };
    g.userData.reguaRest = P.rest; tag(g, s.sex === 'c' ? 'criança' : s.sex === 'f' ? 'mulher' : 'homem');
    scene.add(g); return P;
  }
  // o pano anda junto: presa na cintura, bate nas pernas e no quadril, cai no chão, o vento sopra
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _e = new THREE.Vector3(), _f = new THREE.Vector3(), _h1 = new THREE.Vector3(), _h2 = new THREE.Vector3();
  function stepCloth(p, dt) {
    if (!p.cloth.length) return; const vis = p.g.visible; for (const c of p.cloth) c.mesh.visible = vis; if (!vis) { for (const c of p.cloth) c.reset(); return; }
    p.g.updateMatrixWorld(true); const sc = p.g.scale.x, bw = p.bw;
    p.legs[0].hp.getWorldPosition(_a); p.legs[0].kn.getWorldPosition(_b); p.legs[0].ft.getWorldPosition(_c); p.legs[1].hp.getWorldPosition(_d); p.legs[1].kn.getWorldPosition(_e); p.legs[1].ft.getWorldPosition(_f);
    _h1.copy(_a).lerp(_d, -0.1); _h2.copy(_d).lerp(_a, -0.1); _h1.y += 0.03 * sc; _h2.y += 0.03 * sc;
    const caps = [[_a, _b, 0.09 * bw * sc], [_b, _c, 0.062 * sc], [_d, _e, 0.09 * bw * sc], [_e, _f, 0.062 * sc], [_h1, _h2, 0.125 * bw * sc]];
    const wv = U.uWindBase.value * (1 + U.uWindIu.value * 0.6), wd = U.uWindDir.value, wind = { x: wd.x * wv * wv * 0.028, z: wd.y * wv * wv * 0.028 };   // arrasto do vento no pano de algodão: a 10 m/s a saia abre e balança, mas não vira bandeira
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
  const doors = L.houses.map(h => ({ at: rot2(h.p, h.rot, -h.w * 0.22, h.d / 2 + 0.9), face: h.rot }));
  const tL = TILES.find(t => t.kind === 'lavoura'), tA = TILES[0];
  const rowX = x => Math.round(x / L.field.rowGap) * L.field.rowGap + L.field.rowGap / 2;   // entre duas fileiras de milho
  const towardWater = (x, z) => { const e = 0.6, gx = waterDist(x + e, z) - waterDist(x - e, z), gz = waterDist(x, z + e) - waterDist(x, z - e); return Math.atan2(-gx, -gz); };
  // beira do córrego para a lavadeira e beira da vereda para o pescador
  let lav = null; for (let i = 20; i < 200 && !lav; i += 3) { const [rx, rz] = RIVER[i]; for (const off of [3.2, -3.2, 3.8, -3.8]) { const x = rx, z = rz + off; const w = waterDist(x, z); if (w > 0.4 && w < 1.2 && inHex(x, z, tA.c, 0.85)) { lav = [x, z]; break; } } }
  const pes = [SPRING[0] + Math.cos(0.9) * (POOL_R + 1.1), SPRING[1] + Math.sin(0.9) * (POOL_R + 1.1)];
  const bench = (() => { const h = L.houses[0]; return { at: rot2(h.p, h.rot, -h.w * 0.1 + 0.6, h.d / 2 + 1.75), face: h.rot + Math.PI, y: 0.15 }; })();
  // banco da varanda
  { const h = L.houses[0], b = new THREE.Mesh(merge([paint(new THREE.BoxGeometry(1.4, 0.06, 0.36).translate(0, 0.45, 0), col(0x8a6a4a)), paint(new THREE.BoxGeometry(0.06, 0.45, 0.3).translate(-0.6, 0.22, 0), col(0x7a5a3e)), paint(new THREE.BoxGeometry(0.06, 0.45, 0.3).translate(0.6, 0.22, 0), col(0x7a5a3e))], K), MAT.liso);
    b.position.set(bench.at[0], groundAtHouse(h) + 0.15, bench.at[1]); b.rotation.y = h.rot; b.castShadow = true; scene.add(b); }
  L.fiar = (() => { const h = L.houses[1]; return { at: rot2(h.p, h.rot, h.w * 0.12, h.d / 2 + 0.85), face: h.rot, y: 0 }; })();
  { const h = L.houses[1], b = new THREE.Mesh(merge([paint(new THREE.BoxGeometry(0.45, 0.06, 0.4).translate(0, 0.45, 0), col(0x8a6a4a)), ...[[-0.18, -0.15], [0.18, -0.15], [-0.18, 0.15], [0.18, 0.15]].map(([x, z]) => paint(new THREE.BoxGeometry(0.05, 0.45, 0.05).translate(x, 0.22, z), col(0x7a5a3e)))], K), MAT.liso);
    b.position.set(L.fiar.at[0], groundAtHouse(h), L.fiar.at[1]); b.rotation.y = h.rot; b.castShadow = true; scene.add(b);
    // a roca de fiar ao lado: roda de raios, pé e o fuso
    const r = new THREE.Group(), wheel = [paint(new THREE.TorusGeometry(0.28, 0.018, 6, 24), col(0x7a5a3e))]; for (let k = 0; k < 8; k++) wheel.push(paint(new THREE.BoxGeometry(0.012, 0.56, 0.012).rotateZ(k * Math.PI / 8), col(0x8a6a4a)));
    const wm = new THREE.Mesh(merge(wheel, K), MAT.liso); wm.position.y = 0.55; wm.rotation.y = Math.PI / 2; r.add(wm); r.userData.wheel = wm;
    r.add(new THREE.Mesh(merge([paint(new THREE.BoxGeometry(0.06, 0.3, 0.7).translate(0, 0.15, 0), col(0x6a4a34)), paint(new THREE.BoxGeometry(0.03, 0.4, 0.03).translate(0, 0.45, -0.3), col(0x6a4a34)), paint(new THREE.CylinderGeometry(0.03, 0.01, 0.14, 8).rotateX(Math.PI / 2).translate(0, 0.65, -0.32), col(0xf0ebe0))], K), MAT.liso));
    const [rx, rz] = rot2(h.p, h.rot, h.w * 0.12 + 0.55, h.d / 2 + 0.95); r.position.set(rx, groundAtHouse(h), rz); r.rotation.y = h.rot; scene.add(r); updaters.push(dt => { wm.rotation.x += dt * 2.6; }); }
  function groundAtHouse(h) { let m = 1e9; for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) { const [x, z] = rot2(h.p, h.rot, u * h.w / 2, v * h.d / 2); m = Math.min(m, heightAt(x, z)); } return m - 0.04; }
  // cesto de roupa e trouxa na beira do córrego
  if (lav) { const b = new THREE.Mesh(merge([paint(new THREE.CylinderGeometry(0.28, 0.22, 0.25, 12).translate(0.6, 0.12, 0), col(0xb08a52)), paint(new THREE.SphereGeometry(0.2, 10, 8).scale(1, 0.6, 1).translate(0.6, 0.27, 0), col(0xe8e2d4))], K), MAT.liso);
    b.position.set(lav[0], heightAt(lav[0], lav[1]), lav[1]); b.rotation.y = towardWater(...lav) + Math.PI / 2; scene.add(b); }

  const roles = [
    { make: () => homem({ tool: 'enxada', sleeves: 'longa', hat: 'palha' }), job: 'enxada', post: [tL.c[0] + L.field.cornMaxX + 0.2, tL.c[1] - 6], span: 10, home: 0 },
    { make: () => homem({ tool: 'enxada', hat: 'palha', old: true }), job: 'enxada', post: [tL.c[0] + L.field.sunMinX - 0.3, tL.c[1] + 3], span: 8, home: 0 },
    { make: () => mulher({ tool: 'balaio', hat: 'palha', dress: false, top: { mat: MAT.trama, color: 0xf4efe6 }, bottom: { mat: MAT.trama, color: 0x3a5a8a }, skirt: 0 }), job: 'colher', post: [tL.c[0] + 9.6, tL.c[1] - 5], span: 9, home: 1 },
    { make: () => mulher({ tool: 'vassoura', apron: true }), job: 'varrer', post: rot2(L.houses[1].p, L.houses[1].rot, -1.5, L.houses[1].d / 2 + 2.5), home: 1 },
    { make: () => mulher({ tool: 'lata', hat: null, hair: 'coque' }), job: 'agua', post: L.well.p, home: 2 },
    { make: () => homem({ hat: 'palha', old: true, sleeves: 'longa' }), job: 'sentar', post: bench.at, face: bench.face, seatY: bench.y, home: 0, night: true },
    { make: () => mulher({ hat: 'lenco' }), job: 'conversa', post: rot2(L.well.p, 0, 2.6, 1.2), face: -Math.PI / 2, home: 2 },
    { make: () => homem({ hat: 'bone' }), job: 'conversa', post: rot2(L.well.p, 0, 4.0, 1.2), face: Math.PI / 2, home: 1 },
    { make: () => crianca(), job: 'brincar', post: rot2(L.well.p, 0, -3.5, -3.5), home: 2, k: 0 },
    { make: () => crianca(), job: 'brincar', post: rot2(L.well.p, 0, -3.5, -3.5), home: 2, k: Math.PI },
    { make: () => homem({ hat: 'couro', top: { mat: MAT.trama, color: 0x8a6a4a }, bottom: { mat: MAT.trama, color: 0x5a4030 }, sleeves: 'longa', shoes: 0x4a2a18 }), job: 'vaqueiro', post: rot2(L.corral.p, L.corral.rot, -L.corral.w / 2 + 1, L.corral.d / 2 + 0.75), face: L.corral.rot + Math.PI, span: L.corral.w - 2, dirRot: L.corral.rot, home: 0 },
    lav && { make: () => mulher({ hat: 'lenco', apron: false, sleeves: 'curta' }), job: 'lavar', post: lav, face: towardWater(...lav), home: 2 },
    { make: () => homem({ hat: 'palha', tool: 'vara', sleeves: 'arregaçada' }), job: 'pescar', post: pes, face: Math.atan2(SPRING[0] - pes[0], SPRING[1] - pes[1]), home: 0 },
    // praça e roça: o vendeiro na porta da venda, crianças em volta do coreto, a ceifadora no trigo
    { make: () => homem({ hat: null, apron: false, top: { mat: MAT.trama, color: 0xf0ebe0 }, sleeves: 'arregaçada', beard: 'bigode' }), job: 'conversa', post: rot2(L.venda.p, L.venda.rot, -L.venda.w * 0.26, L.venda.d / 2 + 1.0), face: L.venda.rot, home: 1 },
    { make: () => crianca(), job: 'brincar', post: L.coreto.p, rad: 4.4, home: 2, k: 0.5 },
    { make: () => crianca(), job: 'brincar', post: L.coreto.p, rad: 4.4, home: 2, k: 2.6 },
    { make: () => mulher({ tool: 'balaio', hat: 'palha', dress: false, top: { mat: MAT.trama, color: 0xf4efe6 }, bottom: { mat: MAT.trama, color: 0x8a6a4a }, skirt: 0 }), job: 'colher', post: [L.wheat.tile.c[0] - 5, L.wheat.tile.c[1] + 2], span: 10, home: 1 },
    // padeira no forno de barro, carpinteiro no cavalete da praça, fiandeira na varanda da segunda casa
    { make: () => mulher({ hat: 'lenco', apron: true, sleeves: 'curta' }), job: 'forno', post: rot2(L.oven.p, L.oven.rot, 0, 1.55), face: L.oven.rot + Math.PI, home: 1 },
    { make: () => homem({ hat: 'palha', sleeves: 'arregaçada', top: { mat: MAT.trama, color: 0xe8e2d0 }, bottom: { mat: MAT.trama, color: 0x6a4a34 } }), job: 'serrar', post: rot2(L.cavalete.p, L.cavalete.rot, -0.75, 0), face: L.cavalete.rot + Math.PI / 2, home: 1 },
    { make: () => mulher({ old: true, hat: null, hair: 'coque', sleeves: 'longa' }), job: 'fiar', post: L.fiar.at, face: L.fiar.face, seatY: L.fiar.y, home: 2 },
  ].filter(Boolean);
  const list = mobile ? roles.filter((r, i) => [0, 2, 4, 5, 8, 10, 11, 13, 14, 17].includes(i)) : roles;
  for (const r of list) { const p = person(r.make()); Object.assign(p, r); const [x, z] = r.post; p.x = x + (r.job === 'brincar' ? Math.cos(r.k) * (r.rad || 2.6) : 0); p.z = z + (r.job === 'brincar' ? Math.sin(r.k) * (r.rad || 2.6) : 0); p.h = r.face ?? rnd() * 6.28; p.z0 = z; p.x0 = x; p.dir = 1; people.push(p); }

  // ---------- poses (ângulos em radianos; + na coluna inclina para a frente, − no ombro levanta o braço para a frente)
  const set = (p, o) => { const k = o.k ?? 1, lerp = (obj, key, v) => { obj[key] += (v - obj[key]) * k; };
    lerp(p.pelvis.position, 'y', o.py ?? 0.95); lerp(p.spine.rotation, 'x', o.sp ?? 0); lerp(p.spine.rotation, 'y', o.sy ?? 0); lerp(p.head.rotation, 'x', o.hx ?? 0); lerp(p.head.rotation, 'y', o.hy ?? 0);
    p.arms.forEach((a, i) => { lerp(a.sh.rotation, 'x', (o.sh || [0, 0])[i]); lerp(a.el.rotation, 'x', (o.el || [-0.32, -0.32])[i]); lerp(a.sh.rotation, 'z', (o.shz || [0.1, -0.1])[i]); lerp(a.sh.rotation, 'y', (o.shy || [-0.15, 0.15])[i]); /* de pé, braço relaxado: cotovelo um pouco dobrado, mão perto da coxa */ });
    p.legs.forEach((l, i) => { lerp(l.hp.rotation, 'x', (o.hp || [0, 0])[i]); lerp(l.kn.rotation, 'x', (o.kn || [0, 0])[i]); }); };
  const walkPose = (p, sp, run) => { const a = Math.sin(p.ph), b = Math.sin(p.ph + Math.PI), amp = run ? 0.75 : 0.45;
    return { py: 0.95 - Math.abs(Math.cos(p.ph)) * 0.02, sp: run ? 0.15 : 0.03, sh: [a * amp * 0.8 + (run ? -0.3 : 0), b * amp * 0.8 + (run ? -0.3 : 0)], el: [run ? -1.2 : -0.25, run ? -1.2 : -0.25],
      hp: [b * amp, a * amp], kn: [Math.max(0, Math.sin(p.ph + 1.6)) * amp * 1.3, Math.max(0, Math.sin(p.ph + Math.PI + 1.6)) * amp * 1.3] }; };
  const goTo = (p, x, z, dt, speed = 1.2) => { const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz); if (d < 0.15) return true;
    const want = Math.atan2(dx, dz); let e = want - p.h; e = Math.atan2(Math.sin(e), Math.cos(e)); p.h += Math.max(-4 * dt, Math.min(4 * dt, e));
    const st = Math.min(d, speed * dt); p.x += Math.sin(p.h) * st; p.z += Math.cos(p.h) * st; p.ph += st / (speed > 2 ? 0.55 : 0.38) * Math.PI; set(p, { ...walkPose(p, speed, speed > 2), k: Math.min(1, dt * 12) }); return false; };

  let time = 0;
  let scare = 0, kidsHome = 0;
  updaters.push(dt => { time += dt; scare = Math.max(0, scare - dt); kidsHome = Math.max(0, kidsHome - dt); const day = U.uDay.value, rain = U.uRain.value, away = day < 0.3 || rain > 0.3;
    for (const p of people) { const k = Math.min(1, dt * 6); let yOff = 0;
      const stay = p.night && day < 0.3 && rain < 0.3;   // o da varanda fica, com o lampião
      const kidScared = p.job === 'brincar' && kidsHome > 0; p.running = false;
      if ((away || kidScared) && !stay) { if (p.st !== 'casa') { const d = doors[p.home].at, run = rain > 0.3 || kidScared; p.running = run;
          if (goTo(p, d[0], d[1], dt, run ? 2.8 : 1.3)) { p.st = 'casa'; p.g.visible = false; }
          else if (rain > 0.3) { p.arms[1].sh.rotation.x = -2.75; p.arms[1].el.rotation.x = -1.7; p.arms[1].sh.rotation.z = -0.35; p.head.rotation.x = 0.25; } } }   // corre com a mão na cabeça
      else if (p.st === 'casa' || p.st === 'voltando') { p.g.visible = true; if (p.st === 'casa') { const d = doors[p.home].at; p.x = d[0]; p.z = d[1]; p.st = 'voltando'; }
        const bx = p.job === 'brincar' ? p.x0 + Math.cos(p.k) * (p.rad || 2.6) : p.x0, bz = p.job === 'brincar' ? p.z0 + Math.sin(p.k) * (p.rad || 2.6) : p.z0;
        if (goTo(p, bx, bz, dt, p.job === 'brincar' ? 2.6 : 1.2)) { p.st = 'post'; p.h = p.face ?? p.h; } }
      else { // no posto, fazendo o ofício
        const t = time + p.ph;
        switch (p.job) {
          case 'enxada': { const c = (t * 0.75) % 1, up = c < 0.45; set(p, { sp: up ? 0.2 : 0.55, sh: [up ? -2.3 : -0.55, up ? -2.2 : -0.45], el: [-0.35, -0.3], hp: [-0.15, 0.25], kn: [0.25, 0.35], hx: 0.3, k: Math.min(1, dt * (up ? 5 : 16)) });
            if (c > 0.95) { p.z += p.dir * 0.012; if (Math.abs(p.z - p.z0) > p.span / 2) p.dir *= -1; } p.h = p.dir > 0 ? 0 : Math.PI; break; }
          case 'colher': { const c = (t * 0.25) % 1; if (c < 0.5) { if (goTo(p, p.x0, p.z0 + Math.sin(t * 0.06) * p.span / 2, dt * 0.5, 0.6)) set(p, { k }); }
            else set(p, { sh: [-2.6, -0.3], el: [-0.4, -0.2], hy: 0.3, hx: -0.3, k }); break; }
          case 'varrer': { const s = Math.sin(t * 2.4); set(p, { sp: 0.3, sy: s * 0.3, sh: [-0.7 + s * 0.15, -0.55 - s * 0.15], el: [-0.5, -0.4], hp: [0.05, -0.05], hx: 0.2, k });
            p.x += Math.sin(t * 0.2) * dt * 0.15; p.z += Math.cos(t * 0.17) * dt * 0.15; break; }
          case 'agua': { p.cyc = p.cyc ?? 0; const home = doors[p.home].at, well = [p.x0 + 1.2, p.z0 + 0.6];
            if (p.cyc === 0) { if (goTo(p, ...well, dt)) { p.cyc = 1; p.w8 = 3; } }
            else if (p.cyc === 1) { p.w8 -= dt; set(p, { sp: 0.5, sh: [-1.2, -1.2], el: [-0.6, -0.6], k }); if (p.w8 < 0) { p.cyc = 2; if (p.lata) p.lata.visible = true; } }
            else if (p.cyc === 2) { if (goTo(p, ...home, dt, 1.0)) { p.cyc = 3; p.w8 = 4; } else { p.arms[0].sh.rotation.x = -2.9; p.arms[0].el.rotation.x = -0.5; } }
            else { p.w8 -= dt; set(p, { k }); if (p.w8 < 0) { p.cyc = 0; if (p.lata) p.lata.visible = false; } }
            if (p.lata && p.cyc < 2) p.lata.visible = false; break; }
          case 'sentar': set(p, { py: (p.seatY ?? 0) + 0.47, hp: [-1.5, -1.45], kn: [1.45, 1.5], sh: [-0.45, -0.5], el: [-0.7, -0.6], hy: Math.sin(t * 0.3) * 0.5, hx: 0.05, k }); p.h = p.face; yOff = 0; break;
          case 'conversa': { const g2 = Math.max(0, Math.sin(t * 1.3)); set(p, { sh: [-0.4 - g2 * 0.5, -0.2], el: [-1.1 - g2 * 0.3, -0.3], hx: Math.sin(t * 2.1) * 0.08, hy: Math.sin(t * 0.4) * 0.2, k }); p.h = p.face; break; }
          case 'brincar': { const rr = p.rad || 2.6, a = time * 1.3 * 2.6 / rr + p.k, cx = p.x0 + Math.cos(a) * rr, cz = p.z0 + Math.sin(a) * rr; goTo(p, cx, cz, dt, 3.2); break; }
          case 'vaqueiro': { p.cyc = p.cyc ?? 0; const dx = Math.cos(p.dirRot), dz = -Math.sin(p.dirRot);
            if (p.cyc === 0) { if (goTo(p, p.x0 + dx * p.span * (p.side ? 1 : 0), p.z0 + dz * p.span * (p.side ? 1 : 0), dt, 0.9)) { p.cyc = 1; p.w8 = 6 + rnd() * 6; } }
            else { p.w8 -= dt; p.h += (p.face - p.h) * k; set(p, { sp: 0.18, sh: [-1.3, -1.25], el: [-0.9, -0.8], hy: Math.sin(t * 0.5) * 0.4, k }); if (p.w8 < 0) { p.cyc = 0; p.side = !p.side; } } break; }
          case 'lavar': { const s = Math.sin(t * 5); set(p, { py: 0.52, sp: 0.85, hp: [0.05, 0.05], kn: [1.55, 1.55], sh: [-1.0 + s * 0.25, -1.0 - s * 0.25], el: [-0.4, -0.4], hx: 0.2, k: Math.min(1, dt * 10) }); p.h = p.face; break; }
          case 'forno': { // padeira: tira o pão do forno com a pá comprida, põe no tabuleiro, volta
            const c = (t * 0.18) % 1; if (c < 0.35) set(p, { sp: 0.35, sh: [-1.35, -1.25], el: [-0.25, -0.2], hp: [-0.1, 0.25], kn: [0.15, 0.3], k });
            else if (c < 0.5) set(p, { sp: 0.1, sh: [-0.9, -0.85], el: [-0.6, -0.5], k }); else set(p, { sp: 0.45, sh: [-0.7, -0.7], el: [-0.9, -0.9], hx: 0.3, k: Math.min(1, dt * 4) });
            p.h = p.face + (c > 0.38 && c < 0.55 ? Math.PI * 0.6 : 0); break; }
          case 'serrar': { const s2 = Math.sin(t * 5.5); set(p, { sp: 0.42, sh: [-0.9 + s2 * 0.35, -0.5], el: [-0.9 - s2 * 0.4, -0.7], hp: [-0.2, 0.3], kn: [0.25, 0.2], hx: 0.3, sy: 0.15, k: Math.min(1, dt * 14) }); p.h = p.face; break; }
          case 'fiar': { const s2 = Math.sin(t * 3); set(p, { py: (p.seatY ?? 0) + 0.47, hp: [-1.5, -1.45], kn: [1.45, 1.5], sh: [-0.8, -0.5 + s2 * 0.25], el: [-1.0, -1.1 - s2 * 0.3], hx: 0.25, k }); p.h = p.face; break; }
          case 'pescar': set(p, { py: 0.18, hp: [-1.5, -1.4], kn: [0.35, 0.3], sh: [-0.3, -0.9 + Math.sin(t * 0.7) * 0.05], el: [-0.5, -0.6], sp: -0.1, k }); p.h = p.face; break;
        } }
      const gy = p.job === 'sentar' && p.st === 'post' ? groundAtHouse(L.houses[0]) : p.job === 'fiar' && p.st === 'post' ? groundAtHouse(L.houses[1]) : heightAt(p.x, p.z);
      // reações ao tempo, por cima do ofício: respira, segura o chapéu e se inclina contra o vento forte, enxuga a testa no calor
      // da seca, se encolhe com o trovão, olha para quem passa
      // friagem: na seca, cedo (antes das 8h30) e depois das 17h30, e em qualquer noite fria; põe o casaco/xale
      { const hr = window.__hour ?? 15, cold = (U.uSeca.value > 0.5 && (hr < 8.5 || hr > 17.5)) || (hr > 19.5 || hr < 6) ; if (p.warmGeo && cold !== p.warm) { p.warm = cold; p.body.geometry = cold ? p.warmGeo : p.coolGeo; } }
      if (p.g.visible && p.st !== 'casa') { const br = Math.sin(time * 1.6 + p.ph); p.spine.rotation.x += br * 0.012;
        const wb = U.uWindBase.value * (1 + U.uWindIu.value * 0.5), q = Math.max(0, Math.min(1, (wb - 5) / 6)), wd = U.uWindDir.value;
        if (q > 0) { const fx = Math.sin(p.h), fz = Math.cos(p.h), along = fx * wd.x + fz * wd.y, side = fz * wd.x - fx * wd.y;
          p.spine.rotation.x += -along * 0.16 * q; p.spine.rotation.z = side * 0.1 * q;
          if (p.s.hat && p.job !== 'sentar' && p.job !== 'lavar' && (p.st === 'post')) { p.arms[0].sh.rotation.x = -2.7; p.arms[0].el.rotation.x = -1.8; p.arms[0].sh.rotation.z = 0.3; } }
        else p.spine.rotation.z *= 0.9;
        const hour = window.__hour ?? 15, hot = U.uSeca.value > 0.6 && hour > 11 && hour < 15.5 && day > 0.6 && rain < 0.05;
        if (hot && p.st === 'post' && ['enxada', 'colher', 'varrer', 'vaqueiro'].includes(p.job)) { const c = (time * 0.12 + p.ph) % 1; if (c < 0.08) { p.arms[0].sh.rotation.x = -2.5; p.arms[0].el.rotation.x = -2.0; p.arms[0].sh.rotation.z = 0.45; p.head.rotation.x = -0.15; } }
        if (scare > 1.4) { p.spine.rotation.x += 0.15; p.head.rotation.x = 0.35; for (const a of p.arms) { a.sh.rotation.z = (a === p.arms[0] ? 0.35 : -0.35); } }
        if (['conversa', 'varrer', 'agua', 'sentar', 'vaqueiro', 'pescar'].includes(p.job) && p.st === 'post') { let bt = null, bd = 6; for (const o of people) { if (o === p || !o.g.visible) continue; const d = Math.hypot(o.x - p.x, o.z - p.z); if (d < bd && (o.running || o.job === 'brincar')) { bd = d; bt = o; } }
          if (bt) { let e = Math.atan2(bt.x - p.x, bt.z - p.z) - p.h; e = Math.atan2(Math.sin(e), Math.cos(e)); p.head.rotation.y += (Math.max(-1.0, Math.min(1.0, e)) - p.head.rotation.y) * Math.min(1, dt * 3); } } }
      p.g.position.set(p.x, gy + yOff, p.z); p.g.rotation.y = p.h; stepCloth(p, dt); } });

  return { update(dt) { for (const f of updaters) f(dt); }, people, startle() { scare = 2.2; kidsHome = 15; } };
}
