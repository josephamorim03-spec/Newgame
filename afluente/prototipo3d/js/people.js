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

  // ---------- montar uma pessoa (altura de referência 1,70 m; a escala dá a altura de cada um)
  function person(s) {
    const g = new THREE.Group(), parts = new Map(), add = (pivot, geo, m, c) => { if (!parts.has(pivot)) parts.set(pivot, new Map()); const pm = parts.get(pivot); if (!pm.has(m)) pm.set(m, []); pm.get(m).push(paint(geo, c)); };
    const pivot = (parent, x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; };
    const f = s.sex === 'f', bw = s.build, skin = col(s.skin), hair = col(s.hairColor), shoe = col(s.shoes || 0x3a2a20);
    const top = s.top, topM = top.mat, topC = col(top.color || 0xffffff), botM = s.bottom.mat, botC = col(s.bottom.color || 0xffffff);
    const pelvis = pivot(g, 0, 0.95, 0), spine = pivot(pelvis, 0, 0.05, 0), head = pivot(spine, 0, 0.47, 0.0);
    // tronco e quadril
    add(spine, new THREE.CapsuleGeometry(0.15, 0.2, 4, 12).scale((f ? 1.05 : 1.22) * bw, 1, 0.66 * bw).translate(0, 0.25, 0), topM, topC);
    if (f) add(spine, ell(0.13 * bw, 0.06, 0.06, 0, 0.3, 0.07), topM, topC);
    add(pelvis, ell((f ? 0.17 : 0.155) * bw, 0.12, 0.11 * bw, 0, 0.0, 0), s.dress ? topM : botM, s.dress ? topC : botC);
    add(spine, new THREE.CylinderGeometry(0.048, 0.055, 0.1, 10).translate(0, 0.5, 0), MAT.liso, skin);
    if (s.skirt) { const L = s.skirt, prof = [new THREE.Vector2(0.16 * bw, 0.06), new THREE.Vector2(0.2 * bw, -0.15), new THREE.Vector2((0.24 + L * 0.12) * bw, -L)].reverse();   // de baixo para cima: a face de fora fica para fora
      add(pelvis, new THREE.LatheGeometry(prof, 14), s.dress ? topM : botM, s.dress ? topC : botC); }
    if (s.apron) { const r = (0.21 + (s.skirt || 0) * 0.06) * bw; add(pelvis, new THREE.CylinderGeometry(r, r * 0.9 + 0.03, 0.46, 10, 1, true, -0.75, 1.5).scale(1, 1, 0.8).translate(0, -0.2, 0.01), MAT.liso, col(0xf2ede2));
      add(pelvis, new THREE.CylinderGeometry(0.162 * bw, 0.162 * bw, 0.035, 14).scale(1, 1, 0.74).translate(0, 0.07, 0), MAT.liso, col(0xf2ede2)); }
    if (s.belt) add(pelvis, new THREE.CylinderGeometry(0.158 * bw, 0.158 * bw, 0.04, 14).scale(1, 1, 0.72).translate(0, 0.07, 0), MAT.liso, col(0x3a2418));
    // cabeça: rosto, orelhas, nariz, olhos, sobrancelhas, boca; cabelo e chapéu
    add(head, ell(0.092, 0.112, 0.102, 0, 0.11, 0.01), MAT.liso, skin);
    for (const sx of [-1, 1]) { add(head, ell(0.018, 0.03, 0.012, sx * 0.093, 0.1, 0.0, 6), MAT.liso, skin); add(head, ell(0.012, 0.014, 0.008, sx * 0.034, 0.125, 0.095, 6), MAT.liso, col(0x1a1410));
      add(head, new THREE.BoxGeometry(0.03, 0.007, 0.01).translate(sx * 0.034, 0.148, 0.098), MAT.liso, hair); }
    add(head, ell(0.016, 0.024, 0.02, 0, 0.098, 0.108, 6), MAT.liso, skin.clone().multiplyScalar(0.95)); add(head, new THREE.BoxGeometry(0.03, 0.006, 0.006).translate(0, 0.062, 0.1), MAT.liso, col(0x7a3a30));
    const hs = s.hair;
    if (hs === 'curto') add(head, ell(0.097, 0.07, 0.105, 0, 0.165, 0.0), MAT.liso, hair);
    if (hs === 'careca') add(head, ell(0.097, 0.05, 0.1, 0, 0.12, -0.02).scale(1, 1, 1), MAT.liso, hair.clone().lerp(skin, 0.3));
    if (hs === 'crespo') add(head, ell(0.12, 0.1, 0.12, 0, 0.17, -0.01), MAT.liso, hair);
    if (hs === 'coque') { add(head, ell(0.098, 0.075, 0.108, 0, 0.16, -0.005), MAT.liso, hair); add(head, ell(0.05, 0.05, 0.05, 0, 0.19, -0.1), MAT.liso, hair); }
    if (hs === 'longo') { add(head, ell(0.1, 0.08, 0.11, 0, 0.16, -0.005), MAT.liso, hair); add(head, ell(0.09, 0.16, 0.05, 0, 0.0, -0.07), MAT.liso, hair); }
    if (hs === 'tranca') { add(head, ell(0.099, 0.075, 0.108, 0, 0.16, -0.005), MAT.liso, hair); for (let k = 0; k < 4; k++) add(head, ell(0.025, 0.035, 0.025, 0, 0.06 - k * 0.06, -0.1 - k * 0.006, 6), MAT.liso, hair); }
    const hat = s.hat;
    if (hat === 'palha') { add(head, new THREE.CylinderGeometry(0.21, 0.22, 0.015, 18).translate(0, 0.205, 0), MAT.liso, col(0xe2cf8a)); add(head, new THREE.CylinderGeometry(0.085, 0.1, 0.09, 14).translate(0, 0.255, 0), MAT.liso, col(0xe2cf8a));
      add(head, new THREE.CylinderGeometry(0.101, 0.101, 0.02, 14).translate(0, 0.22, 0), MAT.liso, col(0x8a3a2a)); }
    if (hat === 'couro') { const br = new THREE.CylinderGeometry(0.19, 0.19, 0.02, 18); const p = br.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, p.getY(i) + Math.max(0, Math.abs(z) / 0.19 - 0.2) * 0.07 - (Math.abs(x) / 0.19) * 0.01); }
      br.computeVertexNormals(); add(head, br.translate(0, 0.21, 0), MAT.liso, col(0x7a4a2a)); add(head, new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.95, 1.05).translate(0, 0.2, 0), MAT.liso, col(0x6a3a22)); }
    if (hat === 'bone') { add(head, new THREE.SphereGeometry(0.102, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.15, 0), MAT.liso, col(s.hatColor || 0x2f6aa0)); add(head, new THREE.BoxGeometry(0.14, 0.012, 0.1).translate(0, 0.152, 0.13), MAT.liso, col(s.hatColor || 0x2f6aa0)); }
    if (hat === 'lenco') { add(head, new THREE.SphereGeometry(0.104, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(0, 0.12, -0.005), topM === MAT.liso ? MAT.liso : MAT.chita[s.lenco || 0], col(s.hatColor || 0xffffff));
      add(head, ell(0.04, 0.03, 0.03, 0, 0.11, -0.11, 6), MAT.chita[s.lenco || 0], col(0xffffff)); }
    // braços: manga (curta, longa ou arregaçada), antebraço e mão
    const arms = [-1, 1].map(sx => { const sh = pivot(spine, sx * (f ? 0.17 : 0.2) * bw, 0.41, 0); const longS = s.sleeves === 'longa';
      add(sh, cap(f ? 0.04 : 0.047, 0.2, 0, 0.02, 0), topM, topC); if (s.sleeves !== 'nenhuma') add(sh, cap(f ? 0.048 : 0.055, s.sleeves === 'curta' ? 0.04 : 0.12, 0, 0.03, 0), topM, topC);
      const el = pivot(sh, 0, -0.29, 0); add(el, cap(0.036, 0.2, 0, 0.0, 0), longS ? topM : MAT.liso, longS ? topC : skin); add(el, ell(0.038, 0.05, 0.028, 0, -0.29, 0.005, 8), MAT.liso, skin);
      return { sh, el }; });
    // pernas: calça (ou pele/meia sob a saia), joelho, canela e calçado
    const legs = [-1, 1].map(sx => { const hp = pivot(pelvis, sx * 0.085 * bw, -0.05, 0), under = s.skirt && s.skirt > 0.4;
      add(hp, cap(0.07 * bw, 0.28, 0, 0.0, 0), under ? MAT.liso : botM, under ? skin : botC);
      const kn = pivot(hp, 0, -0.41, 0), shin = s.skirt ? (s.skirt > 0.8 ? botC : skin) : botC;
      add(kn, cap(0.05, 0.3, 0, 0.02, 0), s.skirt && s.skirt <= 0.8 ? MAT.liso : (s.skirt ? (s.dress ? topM : botM) : botM), s.skirt && s.skirt <= 0.8 ? skin : shin);
      add(kn, new THREE.BoxGeometry(0.085, 0.07, 0.21).translate(0, -0.44, 0.04), MAT.liso, shoe); return { hp, kn }; });
    // ferramenta na mão direita
    const tool = new THREE.Group(); arms[1].el.add(tool); tool.position.set(0, -0.29, 0.02);
    const T2 = (geo, c) => add(tool, geo, MAT.liso, col(c));
    if (s.tool === 'enxada') { T2(new THREE.CylinderGeometry(0.018, 0.018, 1.3, 6).rotateX(Math.PI / 2).translate(0, 0, 0.35), 0x9a7a52); T2(new THREE.BoxGeometry(0.2, 0.17, 0.012).translate(0, -0.08, 1.0), 0x6a6e72); }
    if (s.tool === 'vassoura') { T2(new THREE.CylinderGeometry(0.014, 0.014, 1.25, 6).translate(0, -0.45, 0), 0xb08a5a); T2(new THREE.ConeGeometry(0.12, 0.28, 8).translate(0, -1.15, 0), 0x6a4a2a); }
    if (s.tool === 'vara') { const v = new THREE.CylinderGeometry(0.008, 0.016, 2.6, 5).translate(0, 1.3, 0).rotateX(0.75); T2(v, 0x8a7a4a); }
    if (s.tool === 'balaio') { T2(new THREE.CylinderGeometry(0.2, 0.15, 0.25, 12, 1, true).translate(0.18, -0.08, 0), 0xb08a52); }
    let lata = null; if (s.tool === 'lata') { lata = new THREE.Group(); head.add(lata); lata.position.set(0, 0.24, 0); add(lata, new THREE.CylinderGeometry(0.13, 0.13, 0.32, 14).translate(0, 0.16, 0), MAT.liso, col(0xb8bcc0)); add(lata, new THREE.TorusGeometry(0.09, 0.025, 6, 12).rotateX(Math.PI / 2), MAT.liso, col(0xe8e0d0)); }
    // juntar por articulação e por tecido
    for (const [pv, pm] of parts) for (const [m, gs] of pm) { const geo = merge(gs.map(x => { if (!x.attributes.uv) x.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(x.attributes.position.count * 2), 2)); return x; }), K);
      geo.computeVertexNormals(); const me = new THREE.Mesh(geo, m); me.castShadow = pv === spine || pv === pelvis || pv === head; me.receiveShadow = true; if (pv === tool || pv === lata) me.userData.noRegua = true; pv.add(me); }   /* ferramenta e lata não contam na altura */
    g.scale.setScalar(s.h / 1.70); if (s.sex === 'c') head.scale.setScalar(1.22);
    const P = { g, pelvis, spine, head, arms, legs, tool, lata, s, x: 0, z: 0, h: 0, ph: rnd() * 6, t: 0, st: 'post', sit: 0 };
    P.rest = () => { const saved = [pelvis.position.y, spine.rotation.x, ...arms.flatMap(a => [a.sh.rotation.x, a.el.rotation.x]), ...legs.flatMap(l => [l.hp.rotation.x, l.kn.rotation.x])];
      pelvis.position.y = 0.95; spine.rotation.x = 0; for (const a of arms) a.sh.rotation.x = a.el.rotation.x = 0; for (const l of legs) l.hp.rotation.x = l.kn.rotation.x = 0;
      return () => { let i = 0; pelvis.position.y = saved[i++]; spine.rotation.x = saved[i++]; for (const a of arms) { a.sh.rotation.x = saved[i++]; a.el.rotation.x = saved[i++]; } for (const l of legs) { l.hp.rotation.x = saved[i++]; l.kn.rotation.x = saved[i++]; } }; };
    g.userData.reguaRest = P.rest; tag(g, s.sex === 'c' ? 'criança' : s.sex === 'f' ? 'mulher' : 'homem');
    scene.add(g); return P;
  }

  // ---------- quem é quem
  const sk = () => pick(SKIN), hc = old => old ? pick([0x9a9690, 0xc8c4be]) : pick(HAIR);
  const camisa = () => rnd() < 0.5 ? { mat: pick(MAT.xadrez), color: 0xffffff } : { mat: MAT.trama, color: pick([0xf0ebe0, 0x8ab6d8, 0x4a78b0, 0xe0b040, 0x6a9a5a, 0xd88a6a]) };
  const calca = () => ({ mat: MAT.trama, color: pick([0x3a5a8a, 0x2e4a72, 0xa08a62, 0x6a4a34, 0x4a4844]) });
  const vestido = () => ({ mat: pick(MAT.chita), color: 0xffffff });
  const homem = (o = {}) => ({ sex: 'm', h: 1.64 + rnd() * 0.2, build: 0.95 + rnd() * 0.2, skin: sk(), hair: pick(['curto', 'curto', 'careca', 'crespo']), hairColor: hc(o.old), top: camisa(), bottom: calca(),
    sleeves: pick(['longa', 'arregaçada', 'curta']), hat: pick(['palha', 'palha', 'bone', null]), hatColor: pick([0x2f6aa0, 0xc83a2a, 0x3a3a3a]), belt: true, shoes: pick([0x3a2a20, 0x5a3a24]), ...o });
  const mulher = (o = {}) => { const dress = rnd() < 0.6; return { sex: 'f', h: 1.52 + rnd() * 0.16, build: 0.92 + rnd() * 0.22, skin: sk(), hair: pick(['coque', 'longo', 'tranca', 'crespo']), hairColor: hc(o.old),
    top: dress ? vestido() : { mat: MAT.trama, color: pick([0xf4efe6, 0xf2c8c0, 0xc8e0e8, 0xf0e0a0]) }, bottom: dress ? vestido() : { mat: pick(MAT.chita), color: 0xffffff }, dress, skirt: pick([0.55, 0.62, 0.85]),
    sleeves: pick(['curta', 'curta', 'longa']), hat: pick(['lenco', null, null, 'palha']), lenco: Math.floor(rnd() * 5), apron: rnd() < 0.5, shoes: pick([0x3a2a20, 0x7a4a2a]), ...o }; };
  const crianca = (o = {}) => { const girl = rnd() < 0.5; return { sex: 'c', h: 1.05 + rnd() * 0.3, build: 0.9, skin: sk(), hair: girl ? pick(['tranca', 'longo']) : pick(['curto', 'crespo']), hairColor: pick(HAIR),
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
  ].filter(Boolean);
  const list = mobile ? roles.filter((r, i) => [0, 2, 4, 5, 8, 10, 11].includes(i)) : roles;
  for (const r of list) { const p = person(r.make()); Object.assign(p, r); const [x, z] = r.post; p.x = x; p.z = z; p.h = r.face ?? rnd() * 6.28; p.z0 = z; p.x0 = x; p.dir = 1; people.push(p); }

  // ---------- poses (ângulos em radianos; + na coluna inclina para a frente, − no ombro levanta o braço para a frente)
  const set = (p, o) => { const k = o.k ?? 1, lerp = (obj, key, v) => { obj[key] += (v - obj[key]) * k; };
    lerp(p.pelvis.position, 'y', o.py ?? 0.95); lerp(p.spine.rotation, 'x', o.sp ?? 0); lerp(p.spine.rotation, 'y', o.sy ?? 0); lerp(p.head.rotation, 'x', o.hx ?? 0); lerp(p.head.rotation, 'y', o.hy ?? 0);
    p.arms.forEach((a, i) => { lerp(a.sh.rotation, 'x', (o.sh || [0, 0])[i]); lerp(a.el.rotation, 'x', (o.el || [-0.15, -0.15])[i]); lerp(a.sh.rotation, 'z', (o.shz || [0.06, -0.06])[i]); });
    p.legs.forEach((l, i) => { lerp(l.hp.rotation, 'x', (o.hp || [0, 0])[i]); lerp(l.kn.rotation, 'x', (o.kn || [0, 0])[i]); }); };
  const walkPose = (p, sp, run) => { const a = Math.sin(p.ph), b = Math.sin(p.ph + Math.PI), amp = run ? 0.75 : 0.45;
    return { py: 0.95 - Math.abs(Math.cos(p.ph)) * 0.02, sp: run ? 0.15 : 0.03, sh: [a * amp * 0.8 + (run ? -0.3 : 0), b * amp * 0.8 + (run ? -0.3 : 0)], el: [run ? -1.2 : -0.25, run ? -1.2 : -0.25],
      hp: [b * amp, a * amp], kn: [Math.max(0, Math.sin(p.ph + 1.6)) * amp * 1.3, Math.max(0, Math.sin(p.ph + Math.PI + 1.6)) * amp * 1.3] }; };
  const goTo = (p, x, z, dt, speed = 1.2) => { const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz); if (d < 0.15) return true;
    const want = Math.atan2(dx, dz); let e = want - p.h; e = Math.atan2(Math.sin(e), Math.cos(e)); p.h += Math.max(-4 * dt, Math.min(4 * dt, e));
    const st = Math.min(d, speed * dt); p.x += Math.sin(p.h) * st; p.z += Math.cos(p.h) * st; p.ph += st / (speed > 2 ? 0.55 : 0.38) * Math.PI; set(p, { ...walkPose(p, speed, speed > 2), k: Math.min(1, dt * 12) }); return false; };

  let time = 0;
  updaters.push(dt => { time += dt; const day = U.uDay.value, rain = U.uRain.value, away = day < 0.3 || rain > 0.45;
    for (const p of people) { const k = Math.min(1, dt * 6); let yOff = 0;
      const stay = p.night && day < 0.3 && rain < 0.45;   // o da varanda fica, com o lampião
      if (away && !stay) { if (p.st !== 'casa') { const d = doors[p.home].at; if (goTo(p, d[0], d[1], dt, p.job === 'brincar' ? 2.6 : 1.3)) { p.st = 'casa'; p.g.visible = false; } } }
      else if (p.st === 'casa' || p.st === 'voltando') { p.g.visible = true; if (p.st === 'casa') { const d = doors[p.home].at; p.x = d[0]; p.z = d[1]; p.st = 'voltando'; }
        if (goTo(p, p.x0, p.z0, dt, p.job === 'brincar' ? 2.6 : 1.2)) { p.st = 'post'; p.h = p.face ?? p.h; } }
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
          case 'brincar': { const a = time * 1.3 + p.k, cx = p.x0 + Math.cos(a) * 2.6, cz = p.z0 + Math.sin(a) * 2.6; goTo(p, cx, cz, dt, 3.2); break; }
          case 'vaqueiro': { p.cyc = p.cyc ?? 0; const dx = Math.cos(p.dirRot), dz = -Math.sin(p.dirRot);
            if (p.cyc === 0) { if (goTo(p, p.x0 + dx * p.span * (p.side ? 1 : 0), p.z0 + dz * p.span * (p.side ? 1 : 0), dt, 0.9)) { p.cyc = 1; p.w8 = 6 + rnd() * 6; } }
            else { p.w8 -= dt; p.h += (p.face - p.h) * k; set(p, { sp: 0.18, sh: [-1.3, -1.25], el: [-0.9, -0.8], hy: Math.sin(t * 0.5) * 0.4, k }); if (p.w8 < 0) { p.cyc = 0; p.side = !p.side; } } break; }
          case 'lavar': { const s = Math.sin(t * 5); set(p, { py: 0.52, sp: 0.85, hp: [0.05, 0.05], kn: [1.55, 1.55], sh: [-1.0 + s * 0.25, -1.0 - s * 0.25], el: [-0.4, -0.4], hx: 0.2, k: Math.min(1, dt * 10) }); p.h = p.face; break; }
          case 'pescar': set(p, { py: 0.18, hp: [-1.5, -1.4], kn: [0.35, 0.3], sh: [-0.3, -0.9 + Math.sin(t * 0.7) * 0.05], el: [-0.5, -0.6], sp: -0.1, k }); p.h = p.face; break;
        } }
      const gy = p.job === 'sentar' && p.st === 'post' ? groundAtHouse(L.houses[0]) : heightAt(p.x, p.z);
      p.g.position.set(p.x, gy + yOff, p.z); p.g.rotation.y = p.h; } });

  return { update(dt) { for (const f of updaters) f(dt); }, people };
}
