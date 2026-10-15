// Os bichos do vale, em formas simples e cor chapada (como nos jogos pintados), com tamanho real e cada um com seu jeito:
// gado nelore no pasto e no curral (procura a sombra da árvore quando a chuva aperta), capivaras na beira do rio, a garça
// no raso da vereda, a seriema no cerrado, galinhas ciscando na vila, um casal de araras e um bando de passarinhos no céu,
// borboletas nas flores, libélulas sobre a água, peixe pulando e vaga-lumes à noite.
import * as THREE from 'three';
import { U } from './mat.js';
import { mat, paint, merge, col, V3 } from './props.js';
import { tag, READ3 } from './regua.js';
import { LAYOUT, TILES, heightAt, waterDist, inHex, inBoxAt, blocked, inAnyTile, WATER_Y, SPRING, POOL_R, RIVER } from './world.js';

const rnd = (() => { let a = 424242; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();
const ell = (rx, ry, rz, x, y, z, c, s = 12) => paint(new THREE.SphereGeometry(1, s, Math.max(6, Math.round(s * 0.7))).scale(rx, ry, rz).translate(x, y, z), c);
const cyl = (r0, r1, L, c, s = 7) => paint(new THREE.CylinderGeometry(r1, r0, L, s).translate(0, -L / 2, 0), c);   // pendurado: de 0 a -L
const cone = (r, L, c, s = 7) => paint(new THREE.ConeGeometry(r, L, s), c);
const K = ['position', 'normal', 'color'];
const tile = k => TILES.find(t => t.kind === k);

export function buildFauna(scene, opts = {}) {
  const { mobile = false, shade = null } = opts;
  const M = mat({ vertexColors: true }, { rim: '2.6' });
  const mesh = (gs, parent, castShadow = true) => { const m = new THREE.Mesh(merge(gs, K), M); m.castShadow = castShadow; m.receiveShadow = true; parent.add(m); return m; };
  const pivot = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const all = [], updaters = [];

  // ---------- quadrúpedes
  function cow(tone) {   // nelore: branco-acinzentado, cupim sobre a cernelha, barbela, orelhas caídas, chifres curtos
    const g = new THREE.Group(), w = col(tone), grey = w.clone().multiplyScalar(0.82), dark = col(0x3e3a38);
    const trunk = paint(new THREE.CapsuleGeometry(0.36, 1.25, 6, 12).rotateX(Math.PI / 2).scale(0.82, 1.0, 1).translate(0, 1.06, -0.05), w);   // tronco comprido de lombo reto
    mesh([trunk, ell(0.3, 0.2, 0.36, 0, 1.3, -0.62, w), ell(0.17, 0.2, 0.24, 0, 1.5, 0.5, grey), ell(0.18, 0.26, 0.34, 0, 1.24, 0.86, w).rotateX(0), ell(0.06, 0.24, 0.3, 0, 0.84, 0.82, grey),
      ell(0.12, 0.08, 0.2, 0, 0.72, -0.3, grey)], g);
    const tail = pivot(g, 0, 1.4, -1.06); mesh([cyl(0.035, 0.02, 0.85, w), ell(0.06, 0.14, 0.06, 0, -0.9, 0, dark)], tail); tail.rotation.x = 0.12;
    const head = pivot(g, 0, 1.36, 1.12);
    // cabeça de nelore: comprida e estreita, apontada para baixo, focinho escuro, orelhas compridas caídas, chifres curtos para cima
    const face = paint(new THREE.CylinderGeometry(0.115, 0.075, 0.42, 10).translate(0, 0.21, 0).rotateX(2.26).translate(0, 0.06, 0.08), w);
    mesh([ell(0.12, 0.13, 0.14, 0, 0.05, 0.06, w), face, ell(0.085, 0.07, 0.07, 0, -0.21, 0.4, dark), ell(0.02, 0.015, 0.015, 0.04, -0.2, 0.46, col(0x1a1818), 5), ell(0.02, 0.015, 0.015, -0.04, -0.2, 0.46, col(0x1a1818), 5),
      ell(0.024, 0.024, 0.024, 0.105, 0.02, 0.14, col(0x1a1818), 6), ell(0.024, 0.024, 0.024, -0.105, 0.02, 0.14, col(0x1a1818), 6),
      ell(0.045, 0.17, 0.02, 0, -0.12, 0, grey).rotateX(0.2).rotateZ(0.6).translate(0.15, 0.02, 0.03), ell(0.045, 0.17, 0.02, 0, -0.12, 0, grey).rotateX(0.2).rotateZ(-0.6).translate(-0.15, 0.02, 0.03),
      cone(0.03, 0.12, col(0x6a6258)).translate(0, 0.06, 0).rotateX(-0.3).rotateZ(-0.35).translate(0.08, 0.15, 0.02), cone(0.03, 0.12, col(0x6a6258)).translate(0, 0.06, 0).rotateX(-0.3).rotateZ(0.35).translate(-0.08, 0.15, 0.02)], head);
    const legs = [[0.17, 0.98, 0.58, 0], [-0.17, 0.98, 0.58, Math.PI], [0.17, 1.0, -0.66, Math.PI], [-0.17, 1.0, -0.66, 0]].map(([x, y, z, ph]) => { const p = pivot(g, x, y, z);
      mesh([cyl(0.085, 0.045, 0.96, w), ell(0.055, 0.06, 0.065, 0, -0.95, 0.02, dark, 6), ell(0.06, 0.06, 0.06, 0, -0.55, 0, w, 6)], p); p.userData.ph = ph; return p; });
    return { g, head, legs, tail, headY: 1.42 };
  }
  function capybara() {   // capivara: barril marrom-avermelhado, cabeça quadrada, quase sem pescoço, pernas curtas
    const g = new THREE.Group(), b = col(0x8d5a37), d = col(0x5a3824);
    mesh([ell(0.27, 0.26, 0.52, 0, 0.5, 0, b), ell(0.25, 0.22, 0.3, 0, 0.5, -0.32, b)], g);
    const head = pivot(g, 0, 0.6, 0.45); mesh([ell(0.14, 0.16, 0.24, 0, 0, 0.14, b), ell(0.12, 0.12, 0.08, 0, -0.03, 0.33, d), ell(0.04, 0.035, 0.02, 0.09, 0.15, 0.04, d, 6), ell(0.04, 0.035, 0.02, -0.09, 0.15, 0.04, d, 6),
      ell(0.02, 0.02, 0.02, 0.1, 0.06, 0.22, col(0x111111), 6), ell(0.02, 0.02, 0.02, -0.1, 0.06, 0.22, col(0x111111), 6)], head);
    const legs = [[0.15, 0.36, 0.3, 0], [-0.15, 0.36, 0.3, Math.PI], [0.15, 0.36, -0.32, Math.PI], [-0.15, 0.36, -0.32, 0]].map(([x, y, z, ph]) => { const p = pivot(g, x, y, z); mesh([cyl(0.055, 0.045, 0.36, d)], p); p.userData.ph = ph; return p; });
    return { g, head, legs, headY: 0.6 };
  }
  // ---------- aves que andam
  function bird({ body, bodyC, neck, headC, beak, beakC, legL, legC, crest = null, tail = null, s = 1 }) {
    const g = new THREE.Group(), [bx, by, bz] = body, hy = legL + by * 0.9;
    const parts = [ell(bx, by, bz, 0, hy, 0, bodyC)];
    if (tail) parts.push(paint(new THREE.ConeGeometry(tail[0], tail[1], 6).rotateX(-Math.PI / 2 - tail[2]).translate(0, hy + 0.02, -bz - tail[1] * 0.35), tail[3]));
    mesh(parts, g);
    const head = pivot(g, 0, hy + by * 0.5, bz * 0.6), hp = [];
    let px = 0, py = 0, pz = 0; for (let i = 0; i < neck.length; i++) { const [dy, dz, r] = neck[i]; hp.push(ell(r, r * 1.3, r, px + 0, py + dy / 2, pz + dz / 2, headC, 8)); py += dy; pz += dz; }
    hp.push(ell(beak[0] * 0.55, beak[0] * 0.6, beak[0] * 0.8, 0, py, pz, headC, 10), cone(beak[0] * 0.28, beak[1], beakC, 6).rotateX(Math.PI / 2).translate(0, py - 0.005, pz + beak[0] * 0.6 + beak[1] / 2),
      ell(0.012, 0.012, 0.012, beak[0] * 0.45, py + beak[0] * 0.15, pz + beak[0] * 0.3, col(0x111111), 5), ell(0.012, 0.012, 0.012, -beak[0] * 0.45, py + beak[0] * 0.15, pz + beak[0] * 0.3, col(0x111111), 5));
    if (crest) hp.push(paint(new THREE.PlaneGeometry(crest[0], crest[1]).rotateY(Math.PI / 2).rotateX(-0.5).translate(0, py + beak[0] * 0.5 + crest[1] * 0.4, pz - beak[0] * 0.2), crest[2]));
    mesh(hp, head);
    const legs = [[0.05 * s, 0], [-0.05 * s, Math.PI]].map(([x, ph]) => { const p = pivot(g, x, legL + 0.02, 0); mesh([cyl(0.012 * s + 0.004, 0.01 * s + 0.003, legL, legC, 5), ell(0.03 * s, 0.01, 0.05 * s, 0, -legL, 0.02, legC, 6)], p, false); p.userData.ph = ph; return p; });
    return { g, head, legs, headY: hy, biped: true };
  }
  const garca = () => bird({ body: [0.11, 0.13, 0.26], bodyC: col(0xf6f6f2), neck: [[0.1, 0.06, 0.045], [0.14, -0.03, 0.035], [0.12, 0.05, 0.032]], headC: col(0xf6f6f2), beak: [0.05, 0.13], beakC: col(0xf2c21a), legL: 0.62, legC: col(0x1e1e1e), tail: [0.09, 0.18, 0.2, col(0xf0f0ea)] });
  const seriema = () => bird({ body: [0.13, 0.15, 0.27], bodyC: col(0xa58e6e), neck: [[0.12, 0.05, 0.05], [0.12, 0.03, 0.04]], headC: col(0xb8a684), beak: [0.05, 0.06], beakC: col(0xc8402a), legL: 0.5, legC: col(0xd0603a), crest: [0.09, 0.12, col(0x6a5a46)], tail: [0.1, 0.3, 0.05, col(0x7a6a52)] });
  const galinha = c => bird({ body: [0.12, 0.12, 0.16], bodyC: col(c), neck: [[0.08, 0.04, 0.045]], headC: col(c), beak: [0.045, 0.03], beakC: col(0xe8b02a), legL: 0.13, legC: col(0xe8b02a), crest: [0.07, 0.06, col(0xd8282a)], tail: [0.08, 0.16, -0.7, col(c).multiplyScalar(0.7)], s: 0.8 });
  // ---------- bichos do cerrado que faltavam (tamanhos reais; ver regua.js)
  const legSet = (g, pts, r0, r1, L, c, foot) => pts.map(([x, y, z, ph]) => { const p = pivot(g, x, y, z); mesh([cyl(r0, r1, L, c), ...(foot ? [ell(r1 * 1.2, 0.04, r1 * 1.5, 0, -L, 0.02, foot, 6)] : [])], p); p.userData.ph = ph; return p; });
  const caps = (r, L, c, x, y, z, rx = Math.PI / 2) => paint(new THREE.CapsuleGeometry(r, L, 5, 12).rotateX(rx).translate(x, y, z), c);
  function lobo() {   // lobo-guará: pernas longas de meia preta, pelo laranja-avermelhado, crina preta, orelhas grandes, cauda com ponta branca
    const g = new THREE.Group(), o = col(0xc8622a), k = col(0x1e1a18), w = col(0xf2ece0);
    mesh([caps(0.16, 0.5, o, 0, 0.82, 0), ell(0.06, 0.12, 0.3, 0, 1.0, 0.18, k)], g);
    const tail = pivot(g, 0, 0.86, -0.42); mesh([ell(0.09, 0.09, 0.24, 0, -0.08, -0.18, o).rotateX(0.5), ell(0.06, 0.06, 0.08, 0, -0.2, -0.36, w)], tail);
    const head = pivot(g, 0, 0.95, 0.4); mesh([ell(0.1, 0.1, 0.13, 0, 0.04, 0.06, o), cone(0.05, 0.2, o).rotateX(Math.PI / 2).translate(0, 0.0, 0.24), ell(0.022, 0.02, 0.02, 0, 0.0, 0.34, k, 6),
      cone(0.055, 0.17, o).translate(0.065, 0.2, 0.0), cone(0.055, 0.17, o).translate(-0.065, 0.2, 0.0), ell(0.06, 0.05, 0.05, 0, -0.04, 0.1, w)], head);
    const legs = legSet(g, [[0.09, 0.72, 0.28, 0], [-0.09, 0.72, 0.28, Math.PI], [0.09, 0.74, -0.28, Math.PI], [-0.09, 0.74, -0.28, 0]], 0.045, 0.028, 0.72, k);
    return { g, head, legs, tail, headY: 0.95 };
  }
  function tamandua() {   // tamanduá-bandeira: corpo cinza com a faixa preta e branca no ombro, focinho comprido, cauda de bandeira
    const g = new THREE.Group(), c = col(0x6e655c), k = col(0x1e1a18), w = col(0xe8e2d4);
    mesh([ell(0.2, 0.27, 0.55, 0, 0.5, 0, c), paint(new THREE.TorusGeometry(0.24, 0.05, 6, 16, Math.PI).rotateY(Math.PI / 2).rotateZ(0).translate(0, 0.52, 0.12).scale(1, 1.1, 1), k),
      ell(0.21, 0.06, 0.05, 0, 0.66, 0.2, w)], g);
    const tail = pivot(g, 0, 0.6, -0.5); mesh([ell(0.07, 0.2, 0.45, 0, -0.04, -0.36, col(0x5a524a)).rotateX(0.2)], tail);
    const head = pivot(g, 0, 0.62, 0.48); mesh([ell(0.08, 0.09, 0.12, 0, 0, 0.04, c), paint(new THREE.CylinderGeometry(0.025, 0.06, 0.42, 8).rotateX(Math.PI / 2).translate(0, -0.03, 0.3), c),
      ell(0.03, 0.04, 0.02, 0.06, 0.06, 0.0, c, 6), ell(0.03, 0.04, 0.02, -0.06, 0.06, 0.0, c, 6)], head); head.rotation.x = 0.4;
    const legs = legSet(g, [[0.12, 0.4, 0.35, 0], [-0.12, 0.4, 0.35, Math.PI], [0.12, 0.42, -0.35, Math.PI], [-0.12, 0.42, -0.35, 0]], 0.07, 0.05, 0.4, w, k);
    return { g, head, legs, tail, headY: 0.62 };
  }
  function anta() {   // anta: corpo pesado marrom-escuro, tromba curta, crina baixa, orelhas de borda clara, pernas curtas e grossas
    const g = new THREE.Group(), c = col(0x4a3e38), d = col(0x3a302c);
    mesh([caps(0.33, 0.95, c, 0, 0.72, 0), ell(0.05, 0.1, 0.35, 0, 1.02, 0.35, d)], g);
    const head = pivot(g, 0, 0.82, 0.72); mesh([ell(0.14, 0.17, 0.26, 0, -0.05, 0.12, c), cone(0.07, 0.2, d).rotateX(Math.PI / 2 + 0.6).translate(0, -0.16, 0.36),
      ell(0.05, 0.07, 0.02, 0.1, 0.13, 0.0, col(0xc8bcae), 6), ell(0.05, 0.07, 0.02, -0.1, 0.13, 0.0, col(0xc8bcae), 6), ell(0.02, 0.02, 0.02, 0.1, 0.0, 0.18, col(0x111111), 5), ell(0.02, 0.02, 0.02, -0.1, 0.0, 0.18, col(0x111111), 5)], head);
    const legs = legSet(g, [[0.17, 0.5, 0.42, 0], [-0.17, 0.5, 0.42, Math.PI], [0.17, 0.5, -0.45, Math.PI], [-0.17, 0.5, -0.45, 0]], 0.085, 0.07, 0.5, d, col(0x2a2420));
    return { g, head, legs, headY: 0.82 };
  }
  const rosette = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#dca546'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 26; i++) { const px = rnd() * 128, py = rnd() * 128, r = 5 + rnd() * 4; x.fillStyle = '#b8782a'; x.beginPath(); x.arc(px, py, r * 0.7, 0, 7); x.fill();
      x.strokeStyle = '#1e1610'; x.lineWidth = 2.6; for (let k = 0; k < 4; k++) { const a = k * 1.57 + rnd(); x.beginPath(); x.arc(px, py, r, a, a + 1.1); x.stroke(); } }
    for (let i = 0; i < 40; i++) { x.fillStyle = '#1e1610'; x.beginPath(); x.arc(rnd() * 128, rnd() * 128, 1.5 + rnd() * 1.5, 0, 7); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return t; })();
  const MJ = mat({ map: rosette }, { rim: '2.6' });
  function onca() {   // onça-pintada: dourada de rosetas, cabeça larga, cauda comprida; anda na beira da mata ao entardecer e à noite
    const g = new THREE.Group(), body = new THREE.Mesh(merge([only2(new THREE.CapsuleGeometry(0.2, 0.85, 5, 14).rotateX(Math.PI / 2).translate(0, 0.52, 0))], ['position', 'normal', 'uv']), MJ);
    body.castShadow = true; g.add(body);
    const tail = pivot(g, 0, 0.6, -0.55); { const t = new THREE.Mesh(merge([only2(new THREE.CylinderGeometry(0.035, 0.05, 0.7, 8).translate(0, -0.35, 0).rotateX(1.15))], ['position', 'normal', 'uv']), MJ); tail.add(t); }
    const head = pivot(g, 0, 0.62, 0.55); { const h = new THREE.Mesh(merge([only2(new THREE.SphereGeometry(0.15, 14, 10).scale(1, 0.9, 1.05).translate(0, 0, 0.06))], ['position', 'normal', 'uv']), MJ); head.add(h);
      mesh([ell(0.08, 0.06, 0.06, 0, -0.04, 0.18, col(0xe8d8b8)), ell(0.025, 0.02, 0.02, 0, -0.01, 0.23, col(0x3a2a24), 6), cone(0.04, 0.06, col(0xb8782a)).translate(0.09, 0.13, 0.0), cone(0.04, 0.06, col(0xb8782a)).translate(-0.09, 0.13, 0.0)], head); }
    const legs = legSet(g, [[0.11, 0.42, 0.32, 0], [-0.11, 0.42, 0.32, Math.PI], [0.11, 0.44, -0.34, Math.PI], [-0.11, 0.44, -0.34, 0]], 0.065, 0.055, 0.42, col(0xd09a40), col(0xe8d8b8));
    return { g, head, legs, tail, headY: 0.62 };
  }
  const only2 = g => { g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3)); return g; };
  const ema = () => bird({ body: [0.24, 0.27, 0.4], bodyC: col(0x8c8174), neck: [[0.2, 0.06, 0.065], [0.22, 0.04, 0.05], [0.2, 0.03, 0.045]], headC: col(0xa59a8c), beak: [0.06, 0.07], beakC: col(0x6a625a), legL: 0.6, legC: col(0x8a8478), tail: null, s: 1.4 });

  // ---------- comportamento: pastar, andar até um ponto, ficar parado olhando; separação; não sair da área; abrigo na chuva
  function spawn(make, n, o) { for (let i = 0; i < n; i++) { const a = { ...make(), ...o, st: 'idle', t: rnd() * 3, ph: rnd() * 6, sp: 0, h: rnd() * 6.28, tgt: null, look: rnd() * 6 };
    let x, z, k = 0; do { [x, z] = o.pick(null); k++; } while (k < 50 && all.some(b => Math.hypot(b.x - x, b.z - z) < (o.sep || 1.5)));
    a.x = x; a.z = z; a.g.scale.setScalar(o.scale || 1); scene.add(a.g); if (o.name) tag(a.g, o.name); a.g.traverse(m => { if (m.isMesh) m.castShadow = !mobile || o.big; }); all.push(a); } }
  const pickIn = (test, around, R) => () => { for (let k = 0; k < 200; k++) { const x = around[0] + (rnd() - 0.5) * 2 * R, z = around[1] + (rnd() - 0.5) * 2 * R; if (test(x, z)) return [x, z]; } return [...around]; };
  const near = (a, R, test) => { for (let k = 0; k < 60; k++) { const x = a.x + (rnd() - 0.5) * 2 * R, z = a.z + (rnd() - 0.5) * 2 * R; if (test(x, z)) return [x, z]; } return null; };
  function brain(a, dt) {
    a.t -= dt; const rain = U.uRain.value, shelter = a.shade && rain > 0.35;
    if (a.t <= 0) {
      if (shelter) { a.st = 'walk'; a.tgt = near({ x: a.shade[0], z: a.shade[1] }, 3.2, a.area) || a.shade; a.t = 10; }
      else { const r = rnd(); if (r < a.pg) { a.st = 'graze'; a.t = 4 + rnd() * 9; } else if (r < a.pg + a.pw) { a.st = 'walk'; a.tgt = a.targets && a.targets.length ? (([x, z]) => [x + 0.9, z + 0.6])(a.targets[Math.floor(rnd() * a.targets.length)]) : near(a, a.roam, a.area); a.t = 25; if (!a.tgt) { a.st = 'idle'; a.t = 2; } } else { a.st = 'idle'; a.t = 2 + rnd() * 5; } } }
    let want = 0, dh = null;
    if (a.st === 'walk' && a.tgt) { const dx = a.tgt[0] - a.x, dz = a.tgt[1] - a.z, d = Math.hypot(dx, dz);
      if (d < 0.35) { a.st = shelter ? 'idle' : (rnd() < 0.7 ? 'graze' : 'idle'); a.t = 3 + rnd() * 6; } else { want = a.vw * Math.min(1, d / 1.5 + 0.3); dh = Math.atan2(dx, dz); } }
    else if (a.st === 'graze') { want = a.vg; if (rnd() < dt * 0.3) a.h += (rnd() - 0.5) * 0.8; }
    if (dh !== null) { let e = dh - a.h; e = Math.atan2(Math.sin(e), Math.cos(e)); a.h += Math.max(-a.turn * dt, Math.min(a.turn * dt, e)); }
    for (const b of all) if (b !== a && Math.abs(b.x - a.x) < 3 && Math.abs(b.z - a.z) < 3) { const dx = a.x - b.x, dz = a.z - b.z, d = Math.hypot(dx, dz), s = (a.sep + (b.sep || 1)) * 0.5;
      if (d < s && d > 1e-3) { const k = (s - d) * dt * 1.5; if (a.area(a.x + dx / d * k, a.z + dz / d * k)) { a.x += dx / d * k; a.z += dz / d * k; } } }
    a.sp += (want - a.sp) * Math.min(1, dt * 2.5);
    const nx = a.x + Math.sin(a.h) * a.sp * dt, nz = a.z + Math.cos(a.h) * a.sp * dt;
    if (a.area(nx, nz)) { a.x = nx; a.z = nz; } else { a.h += Math.PI * (0.5 + rnd() * 0.5); a.st = 'idle'; a.t = 1 + rnd() * 2; }
    a.ph += a.sp * dt / a.stride * Math.PI * 2;
  }
  function pose(a, dt, time) {
    const gy = a.water ? Math.max(heightAt(a.x, a.z), heightAt(a.x, a.z)) : heightAt(a.x, a.z), mv = Math.min(1, a.sp / Math.max(0.05, a.vw));
    if (a.when) a.g.visible = a.when();
    a.g.position.set(a.x, gy + (a.biped ? Math.abs(Math.sin(a.ph)) * 0.02 * mv : Math.abs(Math.sin(a.ph)) * 0.025 * mv) - 0.02, a.z); a.g.rotation.y = a.h;
    for (const l of a.legs) l.rotation.x = Math.sin(a.ph + l.userData.ph) * (a.biped ? 0.55 : 0.42) * mv;
    let pitch = 0, yaw = 0;
    if (a.st === 'graze') { pitch = a.gp + (a.peck ? Math.max(0, Math.sin(time * 9 + a.look)) * 0.5 : Math.sin(time * 1.3 + a.look) * 0.08); }
    else if (a.st === 'idle') { yaw = Math.sin(time * 0.4 + a.look) * 0.5; pitch = a.strike && Math.sin(time * 0.5 + a.look) > 0.97 ? 0.9 : 0; }
    a.head.rotation.x += (pitch - a.head.rotation.x) * Math.min(1, dt * (a.peck ? 12 : 2.5)); a.head.rotation.y += (yaw - a.head.rotation.y) * Math.min(1, dt * 2);
    if (a.head.userData.y0 === undefined) a.head.userData.y0 = a.head.position.y;
    a.head.position.y = a.head.userData.y0 - (a.dropNeck || 0) * Math.max(0, a.head.rotation.x);
    if (a.tail) a.tail.rotation.z = Math.sin(time * 1.7 + a.look) * 0.25;
  }

  // gado: três no curral, cinco soltos no pasto (que vão para a sombra da árvore quando chove forte)
  const tP = tile('pasto'), Cr = LAYOUT.corral, tV = tile('vila'), tD = tile('cerrado');
  const inCorral = (x, z) => inBoxAt(x, z, Cr.p, Cr.w - 1.6, Cr.d - 1.6, Cr.rot);
  const inPasto = (x, z) => inHex(x, z, tP.c, 0.86) && !inBoxAt(x, z, Cr.p, Cr.w + 2, Cr.d + 2, Cr.rot);
  const cowO = (area, pick) => ({ area, pick, pg: 0.55, pw: 0.3, vw: 0.75, vg: 0.06, turn: 0.8, stride: 1.6, sep: 2.2, roam: 7, gp: 1.05, dropNeck: 0.32, big: true });
  spawn(() => cow([0xeeeae2, 0xe2ddd2, 0xd6d0c6][Math.floor(rnd() * 3)]), 3, { ...cowO(inCorral, pickIn(inCorral, Cr.p, Cr.w / 2)), name: 'boi nelore' });
  spawn(() => cow([0xeeeae2, 0xe2ddd2, 0xcfc8bd][Math.floor(rnd() * 3)]), 5, { ...cowO(inPasto, pickIn(inPasto, tP.c, 17)), shade, name: 'boi nelore' });
  // capivaras na beira do rio (peça do rio e da mata)
  const bank = (x, z) => { const w = waterDist(x, z); return w > 0.4 && w < 4.5 && inAnyTile(x, z, 0.9) && !blocked(x, z) && (inHex(x, z, TILES[0].c, 0.92) || inHex(x, z, TILES[1].c, 0.92)); };
  spawn(capybara, 4, { name: 'capivara', scale: 0.85, area: bank, pick: pickIn(bank, [TILES[0].c[0] + 10, TILES[0].c[1]], 9), pg: 0.6, pw: 0.25, vw: 0.5, vg: 0.04, turn: 1.2, stride: 0.7, sep: 1.0, roam: 4, gp: 0.6, dropNeck: 0.05 });
  // a garça no raso da vereda e do córrego
  const shallow = (x, z) => { const d = WATER_Y - heightAt(x, z); return d > 0.05 && d < 0.32 && inAnyTile(x, z, 0.95); };
  spawn(garca, 1, { name: 'garça-branca', scale: 0.85, area: shallow, pick: pickIn(shallow, SPRING, 9), pg: 0.0, pw: 0.35, vw: 0.25, vg: 0, turn: 1.2, stride: 0.5, sep: 1, roam: 3, gp: 0, strike: true, water: true });
  // seriema no cerrado
  const cerr = (x, z) => inHex(x, z, tD.c, 0.9) && !blocked(x, z);
  spawn(seriema, 2, { name: 'seriema', scale: 0.8, area: cerr, pick: pickIn(cerr, tD.c, 16), pg: 0.25, pw: 0.6, vw: 1.4, vg: 0.1, turn: 2.5, stride: 0.55, sep: 2, roam: 9, gp: 0.8, peck: true, dropNeck: 0.1 });
  // galinhas ciscando entre as casas
  const quintal = (x, z) => inHex(x, z, tV.c, 0.8) && !blocked(x, z, 0.2);
  spawn(() => galinha([0xf4f0e6, 0xa8502a, 0x3a3230, 0xc8803a][Math.floor(rnd() * 4)]), 6, { name: 'galinha', area: quintal, pick: pickIn(quintal, tV.c, 10), pg: 0.6, pw: 0.35, vw: 0.6, vg: 0.05, turn: 4, stride: 0.22, sep: 0.6, roam: 3, gp: 0.9, peck: true, dropNeck: 0.05 });
  // emas no pasto e no cerrado; lobo-guará andando sozinho; tamanduá indo de cupinzeiro em cupinzeiro; anta na beira da mata;
  // onça na borda da mata, só ao entardecer e à noite (de dia ela descansa escondida)
  const campo = (x, z) => (inHex(x, z, tD.c, 0.9) || inPasto(x, z)) && !blocked(x, z);
  spawn(ema, 3, { name: 'ema', area: campo, pick: pickIn(campo, tD.c, 16), pg: 0.45, pw: 0.45, vw: 1.2, vg: 0.08, turn: 1.6, stride: 0.9, sep: 1.6, roam: 10, gp: 1.0, peck: true, dropNeck: 0.25 });
  spawn(lobo, 1, { name: 'lobo-guará', area: campo, pick: pickIn(campo, tD.c, 14), pg: 0.15, pw: 0.7, vw: 1.5, vg: 0.1, turn: 1.8, stride: 1.1, sep: 2, roam: 14, gp: 0.7, dropNeck: 0.15 });
  const termites = (opts.termites || []).filter(([x, z]) => campo(x, z) || inHex(x, z, tP.c, 0.95));
  spawn(tamandua, 1, { name: 'tamanduá-bandeira', area: (x, z) => campo(x, z) || inHex(x, z, tP.c, 0.9), pick: pickIn(campo, tD.c, 12), pg: 0.5, pw: 0.45, vw: 0.45, vg: 0.03, turn: 1.0, stride: 0.6, sep: 1.6, roam: 12, gp: 0.5, dropNeck: 0.1,
    targets: termites });
  const mataBeira = (x, z) => { const w = waterDist(x, z); return w > 0.6 && w < 6 && inHex(x, z, tile('mata').c, 0.9) && !blocked(x, z); };
  spawn(anta, 1, { name: 'anta', area: mataBeira, pick: pickIn(mataBeira, tile('mata').c, 14), pg: 0.5, pw: 0.35, vw: 0.6, vg: 0.05, turn: 0.9, stride: 0.9, sep: 2, roam: 6, gp: 0.7, dropNeck: 0.1 });
  const bordaMata = (x, z) => inHex(x, z, tile('mata').c, 0.98) && !inHex(x, z, tile('mata').c, 0.55) && !blocked(x, z);
  spawn(onca, 1, { name: 'onça-pintada', area: bordaMata, pick: pickIn(bordaMata, tile('mata').c, 18), pg: 0.1, pw: 0.75, vw: 0.9, vg: 0.05, turn: 1.4, stride: 0.95, sep: 2, roam: 12, gp: 0.3, dropNeck: 0.05,
    when: () => U.uDay.value < 0.55 });
  updaters.push((dt, time) => { for (const a of all) { brain(a, dt); pose(a, dt, time); } });

  // ---------- araras: um casal dando voltas largas sobre o vale, batendo asa e planando
  const arara = () => { const g = new THREE.Group(), red = col(0xd8302a), blue = col(0x2a5ec8), yel = col(0xf2c21a);
    mesh([ell(0.09, 0.09, 0.28, 0, 0, 0, red), ell(0.07, 0.075, 0.08, 0, 0.03, 0.27, red), ell(0.045, 0.04, 0.03, 0, 0.0, 0.33, col(0xf0eee8)), cone(0.03, 0.07, col(0x2a2a2a)).rotateX(Math.PI / 2 + 0.5).translate(0, -0.02, 0.36),
      paint(new THREE.PlaneGeometry(0.1, 0.5).rotateX(-Math.PI / 2).translate(0, -0.01, -0.5), red), paint(new THREE.PlaneGeometry(0.06, 0.4).rotateX(-Math.PI / 2).translate(0, 0.0, -0.48), blue)], g, false);
    const wings = [1, -1].map(s => { const p = pivot(g, 0.06 * s, 0.03, 0.02); const wg = new THREE.PlaneGeometry(0.55, 0.26, 2, 1).translate(0.3 * s, 0, 0).rotateX(-Math.PI / 2);
      const cc = new Float32Array(wg.attributes.position.count * 3); for (let i = 0; i < wg.attributes.position.count; i++) { const t = Math.abs(wg.attributes.position.getX(i)) / 0.58; const c = red.clone().lerp(t > 0.55 ? blue : yel, Math.min(1, t * 1.2)); cc.set([c.r, c.g, c.b], i * 3); }
      wg.setAttribute('color', new THREE.BufferAttribute(cc, 3)); const m = new THREE.Mesh(wg, M2); p.add(m); p.userData.s = s; return p; });
    return { g, wings }; };
  const M2 = mat({ vertexColors: true, side: THREE.DoubleSide });
  const fly = []; { const c0 = [TILES.reduce((s, t) => s + t.c[0], 0) / TILES.length, TILES.reduce((s, t) => s + t.c[1], 0) / TILES.length];
    for (let i = 0; i < 2; i++) { const b = arara(); scene.add(b.g); tag(b.g, 'arara (envergadura)'); fly.push({ ...b, c: c0, R: 38, alt: 26, w: 0.2, off: i * 0.06, side: i ? 1.4 : -1.4, flap: 7.5 }); }
    // bando de passarinhos, longe e alto, em silhueta
    const sil = mat({ color: 0x2e3238, side: THREE.DoubleSide });
    for (let i = 0; i < (mobile ? 9 : 14); i++) { const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4).scale(1, 0.8, 2), sil); g.add(body);
      const wings = [1, -1].map(s => { const p = pivot(g, 0.03 * s, 0, 0); p.add(new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.07).translate(0.07 * s, 0, 0).rotateX(-Math.PI / 2), sil)); p.userData.s = s; return p; });
      scene.add(g); tag(g, 'passarinho do bando (envergadura)'); fly.push({ g, wings, c: [c0[0] - 60, c0[1] - 40], R: 22 + rnd() * 6, alt: 34 + rnd() * 5, w: 0.33, off: i * 0.045 + rnd() * 0.02, side: (rnd() - 0.5) * 6, flap: 14, jit: rnd() * 6 }); } }
  updaters.push((dt, time) => { for (const f of fly) { const a = time * f.w + f.off * 6.28, wob = Math.sin(time * 0.13 + f.off * 9) * 8;
    const x = f.c[0] + Math.cos(a) * (f.R + wob) + Math.cos(a) * f.side, z = f.c[1] + Math.sin(a) * (f.R * 0.7 + wob), y = f.alt + Math.sin(time * 0.5 + f.off * 20) * 2;
    const dx = -Math.sin(a), dz = Math.cos(a) * 0.7; f.g.position.set(x, y, z); f.g.rotation.set(0, Math.atan2(dx, dz), 0); f.g.rotateZ(-0.35);
    const glide = Math.sin(time * 0.6 + f.off * 30) > 0.3 ? 0.15 : 1; for (const p of f.wings) p.rotation.z = p.userData.s * (Math.sin(time * f.flap + (f.jit || 0)) * 0.75 * glide + 0.08); } });

  // ---------- borboletas (amarelas e laranja no pasto e nos girassóis, azul-morfo na mata): asas batendo na placa de vídeo
  { const N = mobile ? 14 : 24, wc = document.createElement('canvas'); wc.width = wc.height = 64; const x = wc.getContext('2d');
    x.fillStyle = '#fff'; x.beginPath(); x.ellipse(22, 22, 20, 17, -0.5, 0, 7); x.fill(); x.beginPath(); x.ellipse(20, 46, 13, 14, 0.4, 0, 7); x.fill();
    x.fillStyle = 'rgba(30,25,20,0.9)'; x.beginPath(); x.ellipse(10, 14, 9, 7, -0.5, 0, 7); x.fill(); x.fillStyle = '#fff'; for (const [a, b] of [[8, 12], [14, 9], [6, 20]]) { x.beginPath(); x.arc(a, b, 2, 0, 7); x.fill(); }
    const t = new THREE.CanvasTexture(wc); t.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.BufferGeometry(), P = [], UV = [], S = []; for (const s of [1, -1]) { const q = [[0, 0.06], [0.1 * s, 0.06], [0.1 * s, -0.06], [0, -0.06]];
      for (const [a, b] of [q[0], q[1], q[2], q[0], q[2], q[3]].map(v => v)) { P.push(a, 0, b); UV.push(1 - Math.abs(a) / 0.1, (b + 0.06) / 0.12); S.push(s); } }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); geo.setAttribute('side', new THREE.Float32BufferAttribute(S, 1)); geo.computeVertexNormals();
    const bm = mat({ map: t, alphaTest: 0.5, side: THREE.DoubleSide }, { vdecl: 'attribute float side;uniform float uTime;', vert: `{float f=sin(uTime*16.0+float(gl_InstanceID)*1.7)*1.1+0.3;float ax=abs(transformed.x);transformed.x=sign(transformed.x)*ax*cos(f);transformed.y=ax*sin(f);}` });
    const im = new THREE.InstancedMesh(geo, bm, N), flowers = [], tL = tile('lavoura'), tB = tile('mata');
    const homes = [[tL.c[0] + 10, tL.c[1], 0xffc21a], [tP.c[0], tP.c[1], 0xf6a91a], [tP.c[0] - 6, tP.c[1] - 8, 0xfff2a0], [tB.c[0] - 2, tB.c[1] + 6, 0x3a8cff], [tD.c[0], tD.c[1], 0xf08a2a]];
    for (let i = 0; i < N; i++) { const h = homes[i % homes.length]; flowers.push({ home: h, p: V3(h[0] + (rnd() - 0.5) * 8, 0, h[1] + (rnd() - 0.5) * 8), v: V3(), tgt: V3(), t: 0, rest: 0 }); im.setColorAt(i, col(h[2]).multiplyScalar(0.9 + rnd() * 0.2)); }
    im.frustumCulled = false; scene.add(im); tag(im, 'borboleta (envergadura, na régua)', READ3(0.08) / 0.2); const Mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = V3(1, 1, 1).multiplyScalar(READ3(0.08) / 0.2);
    updaters.push((dt, time) => { const night = U.uDay.value < 0.25, rain = U.uRain.value > 0.3;
      flowers.forEach((b, i) => { b.t -= dt; if (b.t <= 0) { b.tgt.set(b.home[0] + (rnd() - 0.5) * 12, 0, b.home[1] + (rnd() - 0.5) * 12); b.t = 2 + rnd() * 4; }
        const gy = heightAt(b.p.x, b.p.z), want = night || rain ? gy + 0.3 : gy + 0.6 + Math.sin(time * 1.3 + i) * 0.4 + 0.5;
        const ax = (b.tgt.x - b.p.x) * 0.6 + Math.sin(time * 5 + i * 3) * 2.2, az = (b.tgt.z - b.p.z) * 0.6 + Math.cos(time * 4.3 + i * 5) * 2.2;
        b.v.x += (ax - b.v.x) * dt * 1.8; b.v.z += (az - b.v.z) * dt * 1.8; const sp = Math.hypot(b.v.x, b.v.z); if (sp > 1.6) { b.v.x *= 1.6 / sp; b.v.z *= 1.6 / sp; }
        b.p.x += b.v.x * dt; b.p.z += b.v.z * dt; b.p.y += (want + Math.sin(time * 7 + i) * 0.12 - b.p.y) * dt * 2;
        e.set(0, Math.atan2(b.v.x, b.v.z), 0); q.setFromEuler(e); Mx.compose(b.p, q, (night || rain) ? V3(0.001, 0.001, 0.001) : one); im.setMatrixAt(i, Mx); });
      im.instanceMatrix.needsUpdate = true; }); }

  // ---------- libélulas sobre a água: param no ar, disparam, param de novo
  { const N = mobile ? 4 : 7, dm = mat({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }), drag = [];
    for (let i = 0; i < N; i++) { const g = new THREE.Group(), c = col(i % 2 ? 0x2a7ad8 : 0xd8402a);
      g.add(new THREE.Mesh(merge([paint(new THREE.CylinderGeometry(0.008, 0.012, 0.11, 5).rotateX(Math.PI / 2).translate(0, 0, -0.04), c), ell(0.018, 0.018, 0.02, 0, 0, 0.03, c, 6)], K), M));
      const w = new THREE.Mesh(merge([paint(new THREE.PlaneGeometry(0.16, 0.025).rotateX(-Math.PI / 2).translate(0, 0.004, 0.012), col(0xe8f0ff)), paint(new THREE.PlaneGeometry(0.15, 0.022).rotateX(-Math.PI / 2).translate(0, 0.004, -0.008), col(0xe8f0ff))], K), dm); g.add(w);
      g.scale.setScalar(READ3(0.07) / 0.16); scene.add(g); tag(g, 'libélula (envergadura, na régua)'); const i0 = Math.floor(rnd() * 200); drag.push({ g, w, p: V3(RIVER[i0][0], 0, RIVER[i0][1]), tgt: null, t: 0 }); }
    updaters.push((dt, time) => { for (const d of drag) { d.t -= dt; if (d.t <= 0 || !d.tgt) { const i0 = Math.floor(rnd() * 200), r = RIVER[i0]; d.tgt = V3(r[0] + (rnd() - 0.5) * 3, 0, r[1] + (rnd() - 0.5) * 3); d.t = 1.5 + rnd() * 3; }
      const dx = d.tgt.x - d.p.x, dz = d.tgt.z - d.p.z, dist = Math.hypot(dx, dz), sp = dist > 0.2 ? Math.min(5, dist * 3) : 0;
      if (dist > 0.01) { d.p.x += dx / dist * sp * dt; d.p.z += dz / dist * sp * dt; d.g.rotation.y = Math.atan2(dx, dz); }
      d.p.y = WATER_Y - U.uWaterDrop.value + 0.45 + Math.sin(time * 2 + d.t) * 0.08; d.g.position.copy(d.p); d.w.rotation.z = Math.sin(time * 60) * 0.3; d.g.visible = U.uDay.value > 0.3 && U.uRain.value < 0.4; } }); }

  // ---------- peixe pulando: um arco prateado de vez em quando, com o anel na água na saída e na volta
  { const fish = new THREE.Mesh(merge([ell(0.035, 0.05, 0.16, 0, 0, 0, col(0xb8c8c8), 8), paint(new THREE.PlaneGeometry(0.09, 0.08).rotateY(Math.PI / 2).translate(0, 0, -0.18), col(0x8a9a9a))], K), M); fish.visible = false; scene.add(fish); tag(fish, 'peixe'); fish.userData.reguaGeo = true;
    const ringM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }), rings = [0, 1].map(() => { const r = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 24).rotateX(-Math.PI / 2), ringM.clone()); r.renderOrder = 3; scene.add(r); return r; });
    let t = 3, jump = null; updaters.push(dt => { const wy = WATER_Y - U.uWaterDrop.value + 0.02;
      if (!jump) { t -= dt; if (t <= 0) { const i0 = 10 + Math.floor(rnd() * 160), [x, z] = RIVER[i0], [x2, z2] = RIVER[i0 + 2]; jump = { a: V3(x, wy, z), b: V3(x2 + (x2 - x) * 0.2, wy, z2 + (z2 - z) * 0.2), k: 0 }; } }
      else { jump.k += dt / 0.7; const k = Math.min(1, jump.k), p = jump.a.clone().lerp(jump.b, k); p.y = wy + Math.sin(k * Math.PI) * 0.55; fish.position.copy(p); fish.visible = k < 1;
        fish.lookAt(jump.b.x, wy + Math.cos(k * Math.PI) * 0.55, jump.b.z); if (jump.k > 2.2) { jump = null; t = 5 + rnd() * 10; } }
      rings.forEach((r, i) => { const k = jump ? jump.k - i : 9; if (k > 0 && k < 1.6) { const s = 0.1 + k * 0.5; r.scale.setScalar(s); r.material.opacity = 0.7 * (1 - k / 1.6); const p = i ? jump.b : jump.a; r.position.set(p.x, wy, p.z); r.visible = true; } else r.visible = false; }); }); }

  // ---------- vaga-lumes: piscam baixinho na beira da mata e no pasto quando escurece
  { const N = mobile ? 70 : 140, P = [], S = []; const spots = [tile('mata'), tP, TILES[0]];
    for (let i = 0; i < N; i++) { const t = spots[i % 3]; let x, z, k = 0; do { x = t.c[0] + (rnd() - 0.5) * 34; z = t.c[1] + (rnd() - 0.5) * 34; k++; } while (k < 30 && !inHex(x, z, t.c, 0.95)); P.push(x, heightAt(x, z) + 0.4 + rnd() * 1.6, z); S.push(rnd()); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('seed', new THREE.Float32BufferAttribute(S, 1));
    const fm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: U.uTime, uDay: U.uDay, uPx: { value: 600 } },
      vertexShader: `attribute float seed;uniform float uTime,uDay,uPx;varying float vA;void main(){vec3 p=position+vec3(sin(uTime*0.3+seed*40.0),sin(uTime*0.5+seed*20.0)*0.3,cos(uTime*0.27+seed*30.0))*0.8;
        vec4 mv=viewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;float b=pow(max(0.0,sin(uTime*(1.2+seed)+seed*60.0)),12.0);vA=b*smoothstep(0.35,0.05,uDay);gl_PointSize=0.16*uPx/max(1.0,-mv.z)+2.0;}`.replace('smoothstep(0.35,0.05,uDay)', '(1.0-smoothstep(0.05,0.35,uDay))'),
      fragmentShader: `varying float vA;void main(){float d=length(gl_PointCoord-0.5);if(d>0.5||vA<0.01)discard;gl_FragColor=vec4(vec3(0.85,1.0,0.35)*vA*(1.0-d*2.0)*1.6,1.0);}` });
    const pts = new THREE.Points(g, fm); pts.frustumCulled = false; scene.add(pts); updaters.push((dt, time, ctx) => { fm.uniforms.uPx.value = ctx.pxPerUnit; }); }

  let time = 0;
  return { update(dt, ctx) { time += dt; for (const f of updaters) f(dt, time, ctx); }, animals: all };
}
