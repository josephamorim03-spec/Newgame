// Os bichos do vale, em formas simples e cor chapada (como nos jogos pintados), com tamanho real e cada um com seu jeito:
// gado nelore no pasto e no curral (procura a sombra da árvore quando a chuva aperta), capivaras na beira do rio, a garça
// no raso da vereda, a seriema no cerrado, galinhas ciscando na vila, um casal de araras e um bando de passarinhos no céu,
// borboletas nas flores, libélulas sobre a água e vaga-lumes à noite.
import * as THREE from 'three';
import { U } from './mat.js';
import { mat, paint, merge, col, V3 } from './props.js';
import { tag, READ3 } from './regua.js';
import { mergeGeometries } from './addons/BufferGeometryUtils.js';
import { especies } from './especies.js';
import { animate, muzzleWorld, setDetail } from './bicho.js';
import { LAYOUT, TILES, heightAt, waterDist, inHex, inBoxAt, blocked, inAnyTile, WATER_Y, SPRING, POOL_R, RIVER, LAKE, lakeDist, waterLevelAt } from './world.js';

const rnd = (() => { let a = 424242; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();
const ell = (rx, ry, rz, x, y, z, c, s = 12) => paint(new THREE.SphereGeometry(1, s, Math.max(6, Math.round(s * 0.7))).scale(rx, ry, rz).translate(x, y, z), c);
const cyl = (r0, r1, L, c, s = 7) => paint(new THREE.CylinderGeometry(r1, r0, L, s).translate(0, -L / 2, 0), c);   // pendurado: de 0 a -L
const cone = (r, L, c, s = 7) => paint(new THREE.ConeGeometry(r, L, s), c);
const K = ['position', 'normal', 'color'];
const tile = k => TILES.find(t => t.kind === k);

export function buildFauna(scene, opts = {}) {
  const { mobile = false, shade = null, fx = null } = opts;
  const M = mat({ vertexColors: true }, { rim: '2.6' });
  const mesh = (gs, parent, castShadow = true) => { const m = new THREE.Mesh(merge(gs, K), M); m.castShadow = castShadow; m.receiveShadow = true; parent.add(m); return m; };
  const pivot = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const all = [], updaters = [];

  const CM = mat({ vertexColors: true }, { rim: '2.4', frag: 'diffuseColor.rgb*=0.955+0.09*vnoise(vec2(vLp.z*9.0+vLp.x*4.0,vLp.y*90.0))+0.03*(vnoise(vLp.zy*26.0)-0.5);diffuseColor.rgb*=mix(1.0,0.82,uWet);' });
  // pelagens do gado do Cerrado: o nelore branco é minoria; a maioria é de boi de cor, como no pasto de verdade
  const COATS = [
    { w: 0xe6e1d6, g: 0x8a8680, k: 0.45, p: 3 },                              // nelore: branco a cinza-claro
    { w: 0x9a5632, g: 0x5a2e1a, k: 0.5, p: 5 },                               // curraleiro pé-duro: vermelho
    { w: 0xc48a4c, g: 0x8a5a2c, k: 0.45, p: 4 },                              // caracu: amarelo-ouro
    { w: 0x6a4228, g: 0x3a2214, k: 0.4, p: 4 },                               // castanho escuro
    { w: 0x2f2824, g: 0x1a1512, k: 0.3, p: 2 },                               // preto
    { w: 0x8c4426, g: 0x5a2a16, k: 0.4, spot: 0xefe6d6, sp: 0.35, p: 2 },     // gir vermelho chitado de branco
    { w: 0xf0ebe2, g: 0xb8afa4, k: 0.3, spot: 0x6a3c22, sp: 0.42, p: 2 },     // malhado: branco com manchas castanhas
  ];
  const pickCoat = () => { let r = rnd() * COATS.reduce((s, c) => s + c.p, 0); for (const c of COATS) if ((r -= c.p) < 0) return c; return COATS[0]; };
  const rosette = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#dca546'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 26; i++) { const px = rnd() * 128, py = rnd() * 128, r = 5 + rnd() * 4; x.fillStyle = '#b8782a'; x.beginPath(); x.arc(px, py, r * 0.7, 0, 7); x.fill();
      x.strokeStyle = '#1e1610'; x.lineWidth = 2.6; for (let k = 0; k < 4; k++) { const a = k * 1.57 + rnd(); x.beginPath(); x.arc(px, py, r, a, a + 1.1); x.stroke(); } }
    for (let i = 0; i < 40; i++) { x.fillStyle = '#1e1610'; x.beginPath(); x.arc(rnd() * 128, rnd() * 128, 1.5 + rnd() * 1.5, 0, 7); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return t; })();
  const MJ = mat({ map: rosette }, { rim: '2.6' });
  // ---------- os corpos: esqueleto com pele (bicho.js) e as espécies (especies.js)
  setDetail(mobile ? 0.75 : 1.25);
  const E = especies({ M: CM, MJ, rnd }), RIG = r => ({ g: r.g, head: r.head, legs: [], rig: r, headY: r.headY });
  const cow = (coat, size) => RIG(E.vaca(coat, size)), capybara = () => RIG(E.capivara()), garca = () => RIG(E.garca()), moura = () => RIG(E.moura()), seriema = () => RIG(E.seriema());
  const galinha = c => RIG(E.galinha(c)), ema = () => RIG(E.ema()), lobo = () => RIG(E.lobo()), tamandua = () => RIG(E.tamandua()), anta = () => RIG(E.anta()), onca = () => RIG(E.onca());
  const ovelha = () => RIG(E.ovelha()), jb = () => RIG(E.joao());

  // ---------- comportamento: pastar, andar até um ponto, ficar parado olhando; separação; não sair da área; abrigo na chuva
  function spawn(make, n, o) { for (let i = 0; i < n; i++) { const a = { ...make(), ...o, st: 'idle', t: rnd() * 3, ph: rnd() * 6, sp: 0, h: rnd() * 6.28, tgt: null, look: rnd() * 6 };
    let x, z, k = 0; do { [x, z] = o.pick(null); k++; } while (k < 50 && all.some(b => Math.hypot(b.x - x, b.z - z) < (o.sep || 1.5)));
    const RAD = { 'boi': 0.85, 'bezerro': 0.5, 'boi nelore': 0.85, 'ovelha': 0.42, 'capivara': 0.42, 'anta': 0.7, 'tamanduá-bandeira': 0.5, 'onça-pintada': 0.5, 'lobo-guará': 0.42, 'ema': 0.32, 'seriema': 0.2 };
    a.rad = RAD[o.name] || 0; if (opts.col && a.rad) { const base = a.area; a.area = (x, z) => base(x, z) && opts.col.free(x, z, a.rad); }
    { const p0 = a.pick; a.pick = q => { let r = p0(q); for (let k = 0; k < 40 && !a.area(r[0], r[1]); k++) r = p0(q); return r; }; }
    a.x = x; a.z = z; if (opts.col && a.rad && !opts.col.free(x, z, a.rad)) { const q = opts.col.push(x, z, a.rad); a.x = q[0]; a.z = q[1]; } a.g.scale.setScalar(o.scale || 1); scene.add(a.g); if (o.name) tag(a.g, o.name);
    if (a.rig) a.g.userData.reguaRest = () => { const R = a.rig, sv = [R.neck.rotation.x, R.head.rotation.x]; R.neck.rotation.x = 0; R.head.rotation.x = 0; return () => { R.neck.rotation.x = sv[0]; R.head.rotation.x = sv[1]; }; };
    else if (a.head) a.g.userData.reguaRest = () => { const h = a.head, rx = h.rotation.x, py = h.position.y; h.rotation.x = 0; if (h.userData.y0 !== undefined) h.position.y = h.userData.y0; return () => { h.rotation.x = rx; h.position.y = py; }; };   /* quem pasta é medido de cabeça erguida */ a.g.traverse(m => { if (m.isMesh) m.castShadow = o.big || (!mobile && ['ema', 'anta', 'lobo-guará', 'onça-pintada', 'tamanduá-bandeira', 'garça-moura', 'garça-branca'].includes(o.name)); });   /* bicho pequeno não projeta sombra: metade dos desenhos da sombra */ all.push(a); } }
  const tw = (x, z) => { const e = 0.5, gx = waterDist(x + e, z) - waterDist(x - e, z), gz = waterDist(x, z + e) - waterDist(x, z - e); return Math.atan2(-gx, -gz); };
  function drinkSpots(pick, n = 6) { const out = []; for (let k = 0; k < 500 && out.length < n; k++) { const [x, z] = pick(); const w = waterDist(x, z); if (w > 0.25 && w < 1.3) out.push([x, z, tw(x, z)]); } return out; }
  function swimSpots(around, R, n = 6) { const out = []; for (let k = 0; k < 800 && out.length < n; k++) { const x = around[0] + (rnd() - 0.5) * 2 * R, z = around[1] + (rnd() - 0.5) * 2 * R;
    if (waterDist(x, z) < -0.9 && waterLevelAt(x, z) - heightAt(x, z) > 0.55) out.push([x, z]); } return out; }
  const pickIn = (test, around, R) => () => { for (let k = 0; k < 200; k++) { const x = around[0] + (rnd() - 0.5) * 2 * R, z = around[1] + (rnd() - 0.5) * 2 * R; if (test(x, z)) return [x, z]; } return [...around]; };
  const near = (a, R, test) => { for (let k = 0; k < 60; k++) { const x = a.x + (rnd() - 0.5) * 2 * R, z = a.z + (rnd() - 0.5) * 2 * R; if (test(x, z)) return [x, z]; } return null; };
  // ---------- medo: cada bicho tem uma distância de fuga e uma velocidade de corrida; foge de gente (mais de criança correndo)
  // e da onça; o raio assusta todo mundo; na chuva as galinhas vão para a varanda e as ovelhas se juntam; no calor da seca o
  // gado procura sombra; à noite o gado e as ovelhas deitam
  const FEAR = { 'galinha': [2.2, 2.6], 'capivara': [5, 2.4], 'seriema': [7, 3.6], 'ema': [8, 4.5], 'garça-branca': [5, 1.4], 'garça-moura': [6, 1.4], 'ovelha': [2.6, 1.8],
    'boi': [1.8, 1.3], 'bezerro': [1.8, 1.3], 'lobo-guará': [12, 3.2], 'anta': [7, 2.2], 'tamanduá-bandeira': [4, 1.0], 'joão-de-barro (na régua)': [1.6, 1.8], 'onça-pintada': [11, 2.6] };
  let threats = [];
  const porches = LAYOUT.houses.map(h => [h.p[0] + (-h.w * 0.1) * Math.cos(h.rot) + (h.d / 2 + 1.1) * Math.sin(h.rot), h.p[1] - (-h.w * 0.1) * Math.sin(h.rot) + (h.d / 2 + 1.1) * Math.cos(h.rot)]);
  function brain(a, dt) {
    const name = a.g.userData.regua, fear = FEAR[name], day = U.uDay.value;
    // quem ameaça: gente por perto (criança correndo assusta mais) e a onça (para quem não é onça)
    if (fear && a.st !== 'lie') { let best = null, bd = 1e9;
      for (const t of threats) { if (t.who === a) continue; if (name === 'onça-pintada' && !t.person) continue; const r = fear[0] * (t.onca ? 2.2 : t.fast ? 1.5 : 1);
        const d = Math.hypot(t.x - a.x, t.z - a.z); if (d < r && d < bd) { bd = d; best = t; } }
      if (best) { a.st = 'flee'; a.t = 1.8 + rnd(); a.from = [best.x, best.z]; } }
    a.t -= dt; const rain = U.uRain.value, hour = window.__hour ?? 15, hot = U.uSeca.value > 0.6 && hour > 11 && hour < 15.5 && day > 0.6 && rain < 0.05;
    const shelter = a.shade && (rain > 0.35 || hot);
    if (a.st === 'startle') { a.st = 'flee'; a.from = [a.x + (rnd() - 0.5), a.z + (rnd() - 0.5)]; }
    if (a.st === 'flee') { if (a.t <= 0) { a.st = 'idle'; a.t = 1 + rnd() * 2; }
      else { let dx = a.x - a.from[0], dz = a.z - a.from[1]; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
        let e = Math.atan2(dx, dz) + Math.sin(a.ph * 0.3) * 0.3 - a.h; e = Math.atan2(Math.sin(e), Math.cos(e)); a.h += Math.max(-a.turn * 2.5 * dt, Math.min(a.turn * 2.5 * dt, e));
        a.sp += (fear[1] - a.sp) * Math.min(1, dt * 4); const nx = a.x + Math.sin(a.h) * a.sp * dt, nz = a.z + Math.cos(a.h) * a.sp * dt;
        if (a.area(nx, nz) || !a.area(a.x, a.z) || (a.allowWater && waterDist(nx, nz) < 0.9)) { a.x = nx; a.z = nz; a.ph += a.sp * dt / a.stride * Math.PI * 2; } else { a.h += (rnd() < 0.5 ? 1 : -1) * Math.PI * 0.5 * dt * 4; a.sp *= 0.5; }
        return; } }
    // noite: gado e ovelha deitam; de dia levantam
    if ((name === 'boi' || name === 'bezerro' || name === 'ovelha') && !(a.st === 'flee')) { if (day < 0.22 && a.st !== 'lie' && rnd() < dt * 0.2) { a.st = 'lie'; a.sp = 0; } if (a.st === 'lie') { if (day > 0.3) { a.st = 'idle'; a.t = 2; } else return; } }
    if (a.t <= 0 && rain > 0.35 && name === 'galinha') { let bp = porches[0], bd = 1e9; for (const p of porches) { const d = Math.hypot(p[0] - a.x, p[1] - a.z); if (d < bd) { bd = d; bp = p; } }
      a.st = 'walk'; a.tgt = [bp[0] + (rnd() - 0.5) * 1.6, bp[1] + (rnd() - 0.5) * 1.0]; a.t = 12; }
    if (a.t <= 0 && rain > 0.35 && name === 'ovelha') { const P = LAYOUT.sheepPen.p; a.st = 'walk'; a.tgt = [P[0] + (rnd() - 0.5) * 1.5, P[1] + (rnd() - 0.5) * 1.5]; a.t = 10; }
    const vazio = a.cocho && LAYOUT.corral.feed.level < 0.06;   // cocho vazio: o gado fica rondando e cheirando o cocho
    if (a.t <= 0 && !shelter && a.st !== 'drink' && a.drinks && a.drinks.length && rnd() < (vazio ? 0.45 : a.thirst || 0.1)) { const d = a.drinks[Math.floor(rnd() * a.drinks.length)]; a.st = 'walk'; a.tgt = [d[0], d[1]]; a.face = d[2]; a.goal = 'drink'; a.t = 30; }
    else if (a.t <= 0 && !shelter && a.swims && a.swims.length && rnd() < 0.06) { const d = a.swims[Math.floor(rnd() * a.swims.length)]; a.st = 'walk'; a.tgt = d; a.goal = 'swim'; a.swimLeft = 1 + Math.floor(rnd() * 2); a.allowWater = true; a.t = 40; }
    if (a.t <= 0) {
      if (shelter) { a.st = 'walk'; a.tgt = near({ x: a.shade[0], z: a.shade[1] }, 3.2, a.area) || a.shade; a.t = 10; }
      else { const r = rnd(); if (r < a.pg) { a.st = 'graze'; a.t = 4 + rnd() * 9; } else if (r < a.pg + a.pw) { a.st = 'walk'; a.tgt = a.follow ? near(a.follow, 2.5, a.area) : a.targets && a.targets.length ? (([x, z]) => [x + 0.9, z + 0.6])(a.targets[Math.floor(rnd() * a.targets.length)]) : near(a, a.roam, a.area); a.t = 25; if (!a.tgt) { a.st = 'idle'; a.t = 2; } } else { a.st = 'idle'; a.t = (a.idleT || [2, 7])[0] + rnd() * ((a.idleT || [2, 7])[1] - (a.idleT || [2, 7])[0]); } } }
    let want = 0, dh = null;
    if (a.st === 'walk' && a.tgt) { const dx = a.tgt[0] - a.x, dz = a.tgt[1] - a.z, d = Math.hypot(dx, dz);
      if (d < 0.35) { if (a.goal === 'drink') { a.st = 'drink'; a.t = vazio ? 1.5 + rnd() * 2 : 6 + rnd() * 8; a.goal = null; }
        else if (a.goal === 'swim') { if (--a.swimLeft > 0) { a.tgt = a.swims[Math.floor(rnd() * a.swims.length)]; a.t = 40; } else { a.goal = 'land'; a.tgt = a.pick(null); a.t = 40; } }
        else { if (a.goal === 'land') a.goal = null; a.st = shelter ? 'idle' : (rnd() < 0.7 ? 'graze' : 'idle'); a.t = 3 + rnd() * 6; } } else { want = a.vw * Math.min(1, d / 1.5 + 0.3); dh = Math.atan2(dx, dz); } }
    else if (a.st === 'graze') { want = a.vg; if (rnd() < dt * 0.3) a.h += (rnd() - 0.5) * 0.8; }
    else if (a.st === 'drink' && a.face != null) { dh = a.face; if (a.cocho && !vazio) LAYOUT.corral.feed.level -= dt * 0.006; }   // cada vaca comendo leva ~3 min para esvaziar o cocho cheio
    if (a.swim) want *= 0.6;
    if (dh !== null) { let e = dh - a.h; e = Math.atan2(Math.sin(e), Math.cos(e)); a.h += Math.max(-a.turn * dt, Math.min(a.turn * dt, e)); }
    for (const b of all) if (b !== a && Math.abs(b.x - a.x) < 3 && Math.abs(b.z - a.z) < 3) { const dx = a.x - b.x, dz = a.z - b.z, d = Math.hypot(dx, dz), s = (a.sep + (b.sep || 1)) * 0.5;
      if (d < s && d > 1e-3) { const k = (s - d) * dt * 1.5; if (a.area(a.x + dx / d * k, a.z + dz / d * k)) { a.x += dx / d * k; a.z += dz / d * k; } } }
    // gente: o corpo comprido (boi, vaca) é uma cápsula do peito à anca, não um círculo no meio; ninguém atravessa o bicho
    if (a.rad) for (const t of threats) { if (!t.person) continue; const hl = a.big ? 0.75 * a.g.scale.x : 0, fx = Math.sin(a.h), fz = Math.cos(a.h), u = Math.max(-hl, Math.min(hl, (t.x - a.x) * fx + (t.z - a.z) * fz));
      const dx = a.x + fx * u - t.x, dz = a.z + fz * u - t.z, d = Math.hypot(dx, dz), s = a.rad + 0.3;
      if (d < s && d > 1e-3) { const k = (s - d) * Math.min(1, dt * 8); if (a.area(a.x + dx / d * k, a.z + dz / d * k)) { a.x += dx / d * k; a.z += dz / d * k; } } }
    a.sp += (want - a.sp) * Math.min(1, dt * 2.5);
    const ox = a.x, oz = a.z, nx = a.x + Math.sin(a.h) * a.sp * dt, nz = a.z + Math.cos(a.h) * a.sp * dt;
    if (a.area(nx, nz) || !a.area(a.x, a.z) || (a.allowWater && waterDist(nx, nz) < 0.9)) { a.x = nx; a.z = nz; } else { a.h += Math.PI * (0.5 + rnd() * 0.5); if (a.st === 'walk' && !a.goal && rnd() < 0.75) { a.tgt = a.pick(null); a.t = 20; } else { a.st = 'idle'; a.t = 1 + rnd() * 2; a.goal = null; } }
    if (a.allowWater && !a.goal && !a.swim && a.area(a.x, a.z)) a.allowWater = false;
    const fwd = Math.max(0, (a.x - ox) * Math.sin(a.h) + (a.z - oz) * Math.cos(a.h)); a.ph += fwd / a.stride * Math.PI * 2; if (fwd < a.sp * dt * 0.5) a.sp *= 0.5;
  }
  // bicho de esqueleto: o comportamento diz para onde o pescoço e a cabeça vão; bicho.js faz o resto (patas, chão, rabo)
  const _m = new THREE.Vector3();
  function poseRig(a, dt, time) { const R = a.rig, bird = R.kind === 'bird', cam = window.__cam;
    const dist = cam ? Math.hypot(cam.position.x - a.x, cam.position.z - a.z) : 0, nearD = mobile ? 55 : 95, near = window.__juizNear != null ? window.__juizNear : dist < nearD;
    let neck = 0, head = 0, yaw = 0, strike = 0, fast = false, tilt = 0;
    if (a.st === 'graze' || a.st === 'drink') { if (bird) { neck = a.peck ? (Math.sin(time * 7 + a.look) > 0.1 ? 1.7 : 0.7) : 1.3; head = 0.5; fast = !!a.peck; }
      else if (a.st === 'drink' && a.cocho) { neck = 0.62 + Math.sin(time * 2 + a.look) * 0.04; head = 0.25; }
      else if (a.st === 'drink') {   // beber: o pescoço desce até o focinho tocar a água (cada barranco é um), goles, e de vez em quando vigia
        a.dn = a.dn ?? R.graze[0]; a.vig = (a.vig ?? 3 + rnd() * 4) - dt; const up = a.vig < 0;
        if (a.vig < -(1.4 + (a.look % 1))) { a.vig = 3.5 + rnd() * 4; a.gulp = 0; }
        if (up) { neck = -0.08; head = 0.1; yaw = Math.sin(a.look * 7) * 0.8; if (!a.wasUp) { a.wasUp = true; a.drips = 4 + Math.floor(rnd() * 3); } }
        else { a.wasUp = false; const gl = Math.sin(time * 3.2 + a.look); neck = a.dn + Math.max(0, gl) * 0.05; head = R.graze[1];
          if (gl > 0.95 && !a.gul) { a.gul = true; a.gulp = (a.gulp || 0) + 1; } else if (gl < 0) a.gul = false; } }
      else { neck = R.graze[0] + Math.sin(time * 1.3 + a.look) * 0.04; head = R.graze[1]; } }
    else if (a.st === 'idle' || a.st === 'lie') { yaw = Math.sin(time * 0.4 + a.look) * 0.5; neck = a.st === 'lie' ? -0.15 : bird ? 0 : -0.05; tilt = Math.sin(time * 0.23 + a.look * 2) > 0.9 ? 0.25 : 0;
      let bt = null, bd = 7; for (const t of threats) { if (t.who === a) continue; const d = Math.hypot(t.x - a.x, t.z - a.z); if (d < bd) { bd = d; bt = t; } }
      if (bt) { let e = Math.atan2(bt.x - a.x, bt.z - a.z) - a.h; e = Math.atan2(Math.sin(e), Math.cos(e)); yaw = Math.max(-1.1, Math.min(1.1, e)); } }
    else if (a.st === 'flee') neck = -0.25;
    else if (a.st === 'walk' && !bird) neck = 0.15;
    // o que o bicho faz parado, de vez em quando: sacode a cabeça (mosca), lambe o flanco, descansa uma perna de trás,
    // senta (capivara, lobo, onça); a ave arruma as penas ou se sacode
    const nm = a.g.userData.regua, idle = a.st === 'idle' && a.sp < 0.06;
    if (!idle) { a.act = null; a.restLeg = -1; a.sit = false; }
    else { a.ia = (a.ia ?? 2 + rnd() * 6) - dt;
      if (a.ia < 0 && !a.act) { const can = bird ? ['shake', 'preen', 'preen'] : ['shake', 'lick', ...(['boi', 'bezerro', 'ovelha', 'anta'].includes(nm) ? ['rest', 'rest'] : []), ...(['capivara', 'lobo-guará', 'onça-pintada'].includes(nm) ? ['sit', 'sit'] : [])];
        a.act = can[Math.floor(rnd() * can.length)]; a.actT = { shake: 1.0, lick: 2.4, preen: 2.6, rest: 7 + rnd() * 8, sit: 8 + rnd() * 10 }[a.act]; a.side = rnd() < 0.5 ? 1 : -1;
        if (a.act === 'rest') a.restLeg = a.side > 0 ? 2 : 3; if (a.act === 'sit') a.sit = true; }
      if (a.act) { a.actT -= dt; const u = a.actT;
        if (a.act === 'shake') { tilt = Math.sin(u * 28) * 0.4 * Math.min(1, u * 3); neck = -0.1; a.earFlap = 1; fast = true; }
        else if (a.act === 'lick') { yaw = a.side * 1.35; neck = 0.4; R.kind !== 'bird' && (tilt = a.side * 0.2); }
        else if (a.act === 'preen') { yaw = a.side * 2.4; neck = 0.9; fast = Math.sin(u * 12) > 0; }
        if (a.actT <= 0) { a.act = null; a.restLeg = -1; a.sit = false; a.ia = 4 + rnd() * 9; } } }
    // garça: fica imóvel olhando a água e dá o bote; no fim do bote, o respingo
    if (a.strike && a.st === 'idle') { a.sk = (a.sk ?? 3 + rnd() * 5) - dt; if (a.sk < 0) { const u = -a.sk / 0.45; strike = Math.sin(Math.min(1, u) * Math.PI); neck = 0.9 * strike; fast = true;
        if (u > 0.5 && !a.splashed) { a.splashed = true; muzzleWorld(a, _m); if (fx) fx.splash(_m.x, waterLevelAt(_m.x, _m.z) - U.uWaterDrop.value, _m.z, 0.35); }
        if (u >= 1) { a.sk = 5 + rnd() * 7; a.splashed = false; } } else neck = 0.35; }
    animate(a, dt, { neck, head, yaw, strike, fast, tilt }, { fx, near, time });
    // beber: anel na água a cada gole; nadar: a esteira
    if (a.st === 'drink' && !a.cocho && !bird) { muzzleWorld(a, _m); const wlm = waterLevelAt(_m.x, _m.z) - U.uWaterDrop.value;
      if (a.vig >= 0) { const err = _m.y - (wlm + 0.01); a.dn = Math.max(R.graze[0] - 0.4, Math.min(R.graze[0] + 0.9, a.dn + Math.max(-1, Math.min(1, err * 4)) * dt * 1.5));
        // o pescoço não alcança: um passinho para a frente (se o chão deixa e não é fundo)
        if (err > 0.05 && a.dn >= R.graze[0] + 0.88) { const nx = a.x + Math.sin(a.h) * 0.25 * dt, nz = a.z + Math.cos(a.h) * 0.25 * dt; if (waterLevelAt(nx, nz) - heightAt(nx, nz) < 0.2) { a.x = nx; a.z = nz; } }
        if (fx && near && a.gulp !== a.gRip && Math.abs(err) < 0.06) { a.gRip = a.gulp; fx.ripple(_m.x, wlm, _m.z, 0.25 * a.g.scale.x); } }
      else if (fx && near && a.drips > 0 && rnd() < dt * 6 && fx.drip) { a.drips--; fx.drip(_m.x, _m.y - 0.02, _m.z, wlm); } }
    if (fx && near && a.swim && time - (a.rip || 0) > 0.55) { a.rip = time; const wl = waterLevelAt(a.x, a.z) - U.uWaterDrop.value; fx.ripple(a.x + Math.sin(a.h) * 0.4, wl, a.z + Math.cos(a.h) * 0.4, 0.5 + a.sp * 0.6); }
  }
  function pose(a, dt, time) { if (a.rig) return poseRig(a, dt, time);
    const gy = a.water ? Math.max(heightAt(a.x, a.z), heightAt(a.x, a.z)) : heightAt(a.x, a.z), mv = Math.min(1, a.sp / Math.max(0.05, a.vw));
    if (a.when) a.g.visible = a.when();
    a.lie = (a.lie || 0) + (((a.st === 'lie') ? 1 : 0) - (a.lie || 0)) * Math.min(1, dt * 1.2);
    const lieDrop = a.lie * (a.cowLegs ? 0.62 : 0.38) * (a.g.scale.x || 1);
    a.g.position.set(a.x, gy + (a.biped ? Math.abs(Math.sin(a.ph)) * 0.02 * mv : Math.abs(Math.sin(a.ph)) * 0.025 * mv) - 0.02 - lieDrop, a.z); a.g.rotation.y = a.h;
    // respiração (mais rápida depois de correr)
    a.pant = Math.max(0, (a.pant || 0) + (a.sp > a.vw * 1.3 ? dt : -dt * 0.15)); const br = Math.sin(time * (1.4 + Math.min(3, a.pant) * 1.2) + a.look);
    const body = a.g.children[0]; if (body && body.isMesh) { body.scale.set(1 + br * 0.007, 1 + br * 0.012, 1); }
    for (const l of a.legs) { const sw = Math.sin(a.ph + l.userData.ph); l.rotation.x = sw * (a.biped ? 0.55 : a.cowLegs ? 0.32 : 0.42) * mv * (1 - a.lie) + a.lie * (l.userData.front ? -1.25 : 1.2);
      if (l.userData.low) l.userData.low.rotation.x = (l.userData.front ? 1 : -1) * Math.max(0, Math.cos(a.ph + l.userData.ph)) * 0.55 * mv * (1 - a.lie) + a.lie * (l.userData.front ? 2.2 : -2.3); }   // dobra o joelho/jarrete ao levantar a pata; deitado, pernas dobradas debaixo do corpo
    let pitch = 0, yaw = 0;
    if (a.st === 'graze') { pitch = a.gp + (a.peck ? Math.max(0, Math.sin(time * 9 + a.look)) * 0.5 : Math.sin(time * 1.3 + a.look) * 0.08); }
    else if (a.st === 'idle' || a.st === 'lie') { yaw = Math.sin(time * 0.4 + a.look) * 0.5; pitch = a.strike && Math.sin(time * 0.5 + a.look) > 0.97 ? 0.9 : a.st === 'lie' ? -0.2 : 0;
      // olha para quem está chegando
      let bt = null, bd = 7; for (const t of threats) { if (t.who === a) continue; const d = Math.hypot(t.x - a.x, t.z - a.z); if (d < bd) { bd = d; bt = t; } }
      if (bt) { let e = Math.atan2(bt.x - a.x, bt.z - a.z) - a.h; e = Math.atan2(Math.sin(e), Math.cos(e)); yaw = Math.max(-1.1, Math.min(1.1, e)); } }
    else if (a.st === 'flee') { pitch = -0.25; }
    a.head.rotation.x += (pitch - a.head.rotation.x) * Math.min(1, dt * (a.peck ? 12 : 2.5)); a.head.rotation.y += (yaw - a.head.rotation.y) * Math.min(1, dt * 2);
    if (a.head.userData.y0 === undefined) a.head.userData.y0 = a.head.position.y;
    a.head.position.y = a.head.userData.y0 - (a.dropNeck || 0) * Math.max(0, a.head.rotation.x);
    if (a.tail) { const fly = Math.sin(time * 0.37 + a.look * 3) > 0.75 ? 1 : 0; a.fly = (a.fly || 0) + (fly - (a.fly || 0)) * Math.min(1, dt * 3);   // espanta mosca de vez em quando
      a.tail.rotation.z = Math.sin(time * (1.7 + a.fly * 6) + a.look) * (0.18 + a.fly * 0.55); a.tail.rotation.x = a.st === 'flee' ? -0.5 : 0; }
  }

  // gado: três no curral, cinco soltos no pasto (que vão para a sombra da árvore quando chove forte)
  const tP = tile('pasto'), Cr = LAYOUT.corral, tV = tile('vila'), tD = tile('cerrado');
  const inCorral = (x, z) => inBoxAt(x, z, Cr.p, Cr.w - 1.6, Cr.d - 1.6, Cr.rot);
  const inPasto = (x, z) => inHex(x, z, tP.c, 0.86) && !inBoxAt(x, z, Cr.p, Cr.w + 2, Cr.d + 2, Cr.rot);
  const cowO = (area, pick) => ({ area, pick, pg: 0.55, pw: 0.3, vw: 0.95, vg: 0.06, turn: 0.8, stride: 1.4, sep: 2.2, roam: 7, gp: 1.05, dropNeck: 0.32, big: true });
  // pelagens variadas (mais bois de cor que brancos), tamanhos de vaca e de touro, e bezerros junto do rebanho
  // o cocho do curral (o mesmo lugar de props.js): as vacas do curral bebem e comem nele, lado a lado
  const cocho = (() => { const c = Math.cos(Cr.rot), s = Math.sin(Cr.rot), at = (lx, lz) => [Cr.p[0] + lx * c + lz * s, Cr.p[1] - lx * s + lz * c], lz = Cr.cocho[1] + 1.2;
    return [-0.8, 0, 0.8].map(dx => [...at(Cr.cocho[0] + dx, lz), Cr.rot + Math.PI]); })();
  spawn(() => cow(pickCoat(), 0.9 + rnd() * 0.14), 3, { ...cowO(inCorral, pickIn(inCorral, Cr.p, Cr.w / 2)), name: 'boi', drinks: cocho, cocho: true, thirst: 0.14 });
  const bebePasto = drinkSpots(pickIn(inPasto, tP.c, 17));
  spawn(() => cow(pickCoat(), 0.9 + rnd() * 0.16), 5, { ...cowO(inPasto, pickIn(inPasto, tP.c, 17)), shade, name: 'boi', drinks: bebePasto });
  spawn(() => cow(pickCoat(), 0.58 + rnd() * 0.08), 2, { ...cowO(inPasto, pickIn(inPasto, tP.c, 17)), shade, sep: 1.4, stride: 1.05, name: 'bezerro', drinks: bebePasto });
  // capivaras na beira do rio (peça do rio e da mata)
  const bank = (x, z) => { const w = waterDist(x, z); return w > 0.4 && w < 4.5 && inAnyTile(x, z, 0.9) && !blocked(x, z) && (inHex(x, z, TILES[0].c, 0.92) || inHex(x, z, TILES[1].c, 0.92)); };
  spawn(capybara, 4, { name: 'capivara', scale: 0.82, area: bank, pick: pickIn(bank, [TILES[0].c[0] + 10, TILES[0].c[1]], 9), drinks: drinkSpots(pickIn(bank, [TILES[0].c[0] + 10, TILES[0].c[1]], 9)), swims: swimSpots([TILES[0].c[0] + 10, TILES[0].c[1]], 12), swimmer: true, floatD: 0.36, idleT: [8, 22], pg: 0.6, pw: 0.25, vw: 0.5, vg: 0.04, turn: 1.2, stride: 0.7, sep: 1.0, roam: 4, gp: 0.6, dropNeck: 0.05 });
  // a garça no raso da vereda e do córrego
  const shallow = (x, z) => { const d = WATER_Y - heightAt(x, z); return d > 0.05 && d < 0.32 && inAnyTile(x, z, 0.95); };
  spawn(garca, 1, { name: 'garça-branca', scale: 0.85, area: shallow, pick: pickIn(shallow, SPRING, 9), pg: 0.0, pw: 0.35, vw: 0.25, vg: 0, turn: 1.2, stride: 0.5, sep: 1, roam: 3, gp: 0, strike: true, water: true });
  // seriema no cerrado
  const cerr = (x, z) => inHex(x, z, tD.c, 0.9) && !blocked(x, z);
  spawn(seriema, 2, { name: 'seriema', scale: 0.8, area: cerr, pick: pickIn(cerr, tD.c, 16), pg: 0.25, pw: 0.6, vw: 1.4, vg: 0.1, turn: 2.5, stride: 0.55, sep: 2, roam: 9, gp: 0.8, peck: true, dropNeck: 0.1 });
  // garça-moura na beira da lagoa (cinza, pescoço comprido, bem maior que a garça-branca); capivaras também na lagoa
  const lagoaRaso = (x, z) => { const d = lakeDist(x, z); return d > -1.4 && d < 0.2; };
  spawn(moura, 1, { name: 'garça-moura', scale: 0.88, area: lagoaRaso, pick: pickIn(lagoaRaso, LAKE.c, LAKE.r + 2), pg: 0, pw: 0.3, vw: 0.3, vg: 0, turn: 1, stride: 0.6, sep: 1, roam: 4, gp: 0, strike: true, water: true });
  const lagoaBeira = (x, z) => { const d = lakeDist(x, z); return d > 0.4 && d < 5 && !blocked(x, z); };
  spawn(capybara, 3, { name: 'capivara', scale: 0.82, area: lagoaBeira, pick: pickIn(lagoaBeira, LAKE.c, LAKE.r + 4), drinks: drinkSpots(pickIn(lagoaBeira, LAKE.c, LAKE.r + 4)), swims: swimSpots(LAKE.c, LAKE.r * 0.7), swimmer: true, floatD: 0.36, idleT: [8, 22], pg: 0.6, pw: 0.25, vw: 0.5, vg: 0.04, turn: 1.2, stride: 0.7, sep: 1.0, roam: 4, gp: 0.6, dropNeck: 0.05 });
  // bando de seriemas no cerradão: a primeira escolhe o rumo e as outras vão atrás
  const tCd = tile('cerradao'), cerrd = (x, z) => inHex(x, z, tCd.c, 0.9) && !blocked(x, z);
  const lead = all.length; spawn(seriema, 4, { name: 'seriema', scale: 0.8, area: cerrd, pick: pickIn(cerrd, tCd.c, 14), pg: 0.25, pw: 0.6, vw: 1.4, vg: 0.1, turn: 2.5, stride: 0.55, sep: 1.4, roam: 9, gp: 0.8, peck: true, dropNeck: 0.1 });
  for (let k = 1; k < 4; k++) all[lead + k].follow = all[lead];
  // galinhas ciscando entre as casas
  const quintal = (x, z) => inHex(x, z, tV.c, 0.8) && !blocked(x, z, 0.2);
  spawn(() => galinha([0xf4f0e6, 0xa8502a, 0x3a3230, 0xc8803a][Math.floor(rnd() * 4)]), 6, { name: 'galinha', scale: 0.85, area: quintal, pick: pickIn(quintal, tV.c, 10), pg: 0.6, pw: 0.35, vw: 0.6, vg: 0.05, turn: 4, stride: 0.22, sep: 0.6, roam: 3, gp: 0.9, peck: true, dropNeck: 0.05 });
  // emas no pasto e no cerrado; lobo-guará andando sozinho; tamanduá indo de cupinzeiro em cupinzeiro; anta na beira da mata;
  // onça na borda da mata, só ao entardecer e à noite (de dia ela descansa escondida)
  const campo = (x, z) => (inHex(x, z, tD.c, 0.9) || inPasto(x, z)) && !blocked(x, z);
  spawn(ema, 3, { name: 'ema', scale: 0.88, area: campo, pick: pickIn(campo, tD.c, 16), pg: 0.45, pw: 0.45, vw: 1.2, vg: 0.08, turn: 1.6, stride: 0.9, sep: 1.6, roam: 10, gp: 1.0, peck: true, dropNeck: 0.25 });
  spawn(lobo, 1, { name: 'lobo-guará', scale: 0.92, area: campo, pick: pickIn(campo, tD.c, 14), drinks: drinkSpots(pickIn(campo, tD.c, 14), 4), thirst: 0.06, pg: 0.08, pw: 0.7, vw: 1.5, vg: 0.1, turn: 1.8, stride: 1.1, sep: 2, roam: 14, gp: 0.7, dropNeck: 0.15 });
  const termites = (opts.termites || []).filter(([x, z]) => campo(x, z) || inHex(x, z, tP.c, 0.95));
  spawn(tamandua, 1, { name: 'tamanduá-bandeira', scale: 0.86, idleT: [1.5, 4], area: (x, z) => campo(x, z) || inHex(x, z, tP.c, 0.9), pick: pickIn(campo, tD.c, 12), pg: 0.6, pw: 0.45, vw: 0.45, vg: 0.03, turn: 1.0, stride: 0.6, sep: 1.6, roam: 12, gp: 0.5, dropNeck: 0.1,
    targets: termites });
  const mataBeira = (x, z) => { const w = waterDist(x, z); return w > 0.6 && w < 6 && inHex(x, z, tile('mata').c, 0.9) && !blocked(x, z); };
  spawn(anta, 1, { name: 'anta', idleT: [1.5, 4], area: mataBeira, pick: pickIn(mataBeira, tile('mata').c, 14), drinks: drinkSpots(pickIn((x, z) => mataBeira(x, z) || (waterDist(x, z) > 0.25 && waterDist(x, z) < 0.6 && inHex(x, z, tile('mata').c, 0.9)), tile('mata').c, 14)), swims: swimSpots(tile('mata').c, 16), swimmer: true, floatD: 0.55, pg: 0.62, pw: 0.35, vw: 0.6, vg: 0.05, turn: 0.9, stride: 0.9, sep: 2, roam: 6, gp: 0.7, dropNeck: 0.1 });
  const bordaMata = (x, z) => inHex(x, z, tile('mata').c, 0.98) && !inHex(x, z, tile('mata').c, 0.55) && !blocked(x, z);
  spawn(onca, 1, { name: 'onça-pintada', area: bordaMata, pick: pickIn(bordaMata, tile('mata').c, 18), pg: 0.1, pw: 0.75, vw: 0.9, vg: 0.05, turn: 1.4, stride: 0.95, sep: 2, roam: 12, gp: 0.3, dropNeck: 0.05,
    when: () => U.uDay.value < 0.55 });
  // ovelhas no aprisco: lã fofa em cachos, cara e pernas escuras
  const Sp = LAYOUT.sheepPen, inPen = (x, z) => inBoxAt(x, z, Sp.p, Sp.w - 1.0, Sp.d - 1.0, Sp.rot);
  spawn(ovelha, 5, { name: 'ovelha', scale: 0.84, area: inPen, pick: pickIn(inPen, Sp.p, Sp.w / 2), pg: 0.6, pw: 0.3, vw: 0.5, vg: 0.04, turn: 1.6, stride: 0.6, sep: 0.9, roam: 3, gp: 0.9, dropNeck: 0.12 });
  // joão-de-barro: passarinho cor de barro andando aos pulinhos no chão perto do ninho (no mourão do curral)
  const nest = LAYOUT.nest || [Cr.p[0], Cr.p[1], 0], perto = (x, z) => Math.hypot(x - nest[0], z - nest[1]) < 9 && !inCorral(x, z) && !blocked(x, z);
  spawn(jb, 2, { name: 'joão-de-barro (na régua)', scale: READ3(0.2) / 0.2, area: perto, pick: pickIn(perto, [nest[0], nest[1]], 6), pg: 0.5, pw: 0.45, vw: 0.9, vg: 0.0, turn: 5, stride: 0.12, sep: 0.4, roam: 3, gp: 0.8, peck: true });

  const M3 = mat({ vertexColors: true, side: THREE.DoubleSide });
  // ---------- tucano: voa de copa em copa (voo ondulado, bate e plana), pousa um pouco e segue
  { const trees = (opts.treeTops || []).filter(t => t[1] > 5); if (trees.length > 2) {
    const g = new THREE.Group(), k = col(0x141414), ora = col(0xf28a1a), wh = col(0xf4efe0);
    mesh([ell(0.07, 0.08, 0.17, 0, 0, 0, k), ell(0.06, 0.06, 0.07, 0, 0.04, 0.15, k), ell(0.05, 0.045, 0.03, 0, 0.0, 0.2, wh), paint(new THREE.ConeGeometry(0.045, 0.19, 8).rotateX(Math.PI / 2).scale(0.8, 1.3, 1).translate(0, 0.03, 0.31), ora),
      ell(0.015, 0.015, 0.015, 0.035, 0.06, 0.2, col(0x3a7aff), 6), ell(0.015, 0.015, 0.015, -0.035, 0.06, 0.2, col(0x3a7aff), 6), paint(new THREE.PlaneGeometry(0.08, 0.17).rotateX(-Math.PI / 2).translate(0, 0, -0.22), k)], g, false);
    const wings = [1, -1].map(s => { const p = pivot(g, 0.05 * s, 0.02, 0.02); p.add(new THREE.Mesh(paint(new THREE.PlaneGeometry(0.22, 0.12).translate(0.11 * s, 0, 0).rotateX(-Math.PI / 2), k), M3)); p.userData.s = s; return p; });
    g.scale.setScalar(0.85); scene.add(g); tag(g, 'tucano');
    let from = trees[0], to = trees[1], t = 0, rest = 3; const P = new THREE.Vector3();
    updaters.push((dt, time) => { if (rest > 0) { rest -= dt; g.position.set(from[0], from[1] + 0.15, from[2]); for (const w of wings) w.rotation.z = w.userData.s * 0.05; if (rest <= 0) { to = trees[Math.floor(rnd() * trees.length)]; t = 0; } return; }
      const d = Math.hypot(to[0] - from[0], to[2] - from[2]) + 1, dur = d / 7; t += dt / dur; const k2 = Math.min(1, t);
      P.set(from[0] + (to[0] - from[0]) * k2, from[1] + (to[1] - from[1]) * k2 + Math.sin(k2 * Math.PI) * Math.min(6, d * 0.15) + Math.sin(time * 6) * 0.25, from[2] + (to[2] - from[2]) * k2);
      g.lookAt(P.x + (to[0] - from[0]), P.y, P.z + (to[2] - from[2])); g.position.copy(P);
      const flap = Math.sin(time * 4) > 0 ? Math.sin(time * 20) * 0.8 : 0.1; for (const w of wings) w.rotation.z = w.userData.s * flap;
      if (t >= 1) { from = to; rest = 3 + rnd() * 6; } }); } }

  // ---------- martim-pescador: voa baixo sobre o córrego, para no ar batendo asa, mergulha e volta com o anel na água
  { const g = new THREE.Group(), blu = col(0x4a7aa8), ruf = col(0xb8582a), wh = col(0xf2ede4);
    mesh([ell(0.055, 0.06, 0.13, 0, 0, 0, blu), ell(0.05, 0.05, 0.1, 0, -0.03, 0.03, ruf), ell(0.05, 0.055, 0.06, 0, 0.04, 0.12, blu), ell(0.04, 0.02, 0.04, 0, 0.0, 0.14, wh),
      paint(new THREE.ConeGeometry(0.018, 0.1, 6).rotateX(Math.PI / 2).translate(0, 0.03, 0.22), col(0x2a2a2a)), paint(new THREE.PlaneGeometry(0.06, 0.1).rotateX(-Math.PI / 2).translate(0, 0, -0.17), blu)], g, false);
    const wings = [1, -1].map(s => { const p = pivot(g, 0.04 * s, 0.02, 0.0); p.add(new THREE.Mesh(paint(new THREE.PlaneGeometry(0.2, 0.09).translate(0.1 * s, 0, 0).rotateX(-Math.PI / 2), blu), M3)); p.userData.s = s; return p; });
    g.scale.setScalar(0.8); scene.add(g); tag(g, 'martim-pescador');
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); ring.renderOrder = 3; scene.add(ring);
    let st = 'voa', t = 0, i0 = 30, i1 = 90, hov = 0, splash = -1; const P = new THREE.Vector3();
    updaters.push((dt, time) => { const wy = WATER_Y - U.uWaterDrop.value;
      if (st === 'voa') { t += dt / 6; const i = Math.floor(i0 + (i1 - i0) * Math.min(1, t)), r = RIVER[i]; P.set(r[0], wy + 3.2 + Math.sin(time * 1.5) * 0.4, r[1]);
        const n = RIVER[Math.min(RIVER.length - 1, i + 2)]; g.lookAt(n[0], P.y, n[1]); if (t >= 1) { st = 'para'; hov = 1.5 + rnd() * 1.5; } }
      else if (st === 'para') { hov -= dt; if (hov <= 0) { st = 'mergulha'; t = 0; } }
      else if (st === 'mergulha') { t += dt / 0.5; P.y = wy + 3.2 * (1 - t * t) + 0.05; if (t >= 1) { st = 'sobe'; t = 0; splash = 0; ring.position.set(P.x, wy + 0.02, P.z); } }
      else if (st === 'sobe') { t += dt / 1.2; P.y = wy + 3.2 * t; if (t >= 1) { st = 'voa'; t = 0; i0 = i1; i1 = 20 + Math.floor(rnd() * 180); } }
      g.position.copy(P); g.rotation.x = st === 'mergulha' ? 1.2 : st === 'sobe' ? -0.5 : 0;
      const flap = st === 'para' ? Math.sin(time * 40) * 0.9 : st === 'mergulha' ? 0.9 : Math.sin(time * 18) * 0.7; for (const w of wings) w.rotation.z = w.userData.s * flap;
      if (splash >= 0) { splash += dt; ring.scale.setScalar(0.1 + splash * 0.6); ring.material.opacity = Math.max(0, 0.7 * (1 - splash / 1.4)); if (splash > 1.4) splash = -1; } }); }
  updaters.push((dt, time, ctx) => {
    threats = []; for (const p of (ctx && ctx.people) || []) if (p.g.visible) threats.push({ x: p.x, z: p.z, person: true, fast: p.job === 'brincar' || p.job === 'pega' || p.job === 'bola' || p.running });
    for (const a of all) if (a.g.userData.regua === 'onça-pintada' && a.g.visible) threats.push({ x: a.x, z: a.z, onca: true, who: a });
    for (const a of all) { if (a.__juiz) continue; brain(a, dt); pose(a, dt, time); } });

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

  // (os peixes, e os pulos deles, ficam em peixes.js)

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
  return { update(dt, ctx) { time += dt; for (const f of updaters) f(dt, time, ctx); }, animals: all,
    // para o juiz (juiz.js): passo de um bicho só, com o comportamento e a pose de verdade
    step(a, dt, t) { brain(a, dt); pose(a, dt, t ?? time); }, poseOnly(a, dt, t) { pose(a, dt, t ?? time); }, FEAR,
    startle() { for (const a of all) if (a.g.visible && FEAR[a.g.userData.regua] && a.st !== 'lie') { a.st = 'startle'; a.t = 1.2 + rnd() * 1.5; } else if (a.st === 'lie' && rnd() < 0.5) { a.st = 'idle'; a.t = 1; } } };
}
