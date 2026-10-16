// Peixes do vale. Lambaris (10 a 12 cm, prateados, rabo vermelho) em cardume e piaus (30 a 40 cm) no poço da nascente,
// na lagoa, no poço da cachoeira e nos remansos do rio. Nadam debaixo d'água ondulando o corpo (a onda corre da cabeça
// para o rabo, mais forte quanto mais rápido), andam juntos (o lambari segue o cardume), viram antes do raso, sobem para
// beliscar inseto na superfície (o anelzinho), fogem de quem entra na água ou de um respingo, e pulam: um arco de
// verdade (velocidade de saída e gravidade), com o corpo seguindo a velocidade, o rabo batendo no ar e o respingo na saída e
// na volta. Pulam mais de manhãzinha e no fim da tarde. Na cheia (piracema), os piaus do poço tentam subir a cachoeira.
// A pesca usa as iscas: um peixe perto se interessa, vem, belisca algumas vezes (a boia mexe) e leva a isca; quem pesca
// fisga (ou não) e, preso, o peixe é puxado pela linha até sair da água.
import * as THREE from 'three';
import { U, toon, shared } from './mat.js';
import { heightAt, waterLevelAt, SPRING, POOL_R, LAKE, FALL, RIVER } from './world.js';

const G = 9.8;
const SP = {
  lambari: { L: 0.115, back: 0x5f7058, side: 0xd2dcd6, belly: 0xf2f2ea, tail: 0xd8442e, v: 0.32, vMax: 1.7, turn: 5, jump: [1.7, 2.5], depth: [0.08, 0.32], school: true },
  piau: { L: 0.36, back: 0x45543f, side: 0xb4c0ac, belly: 0xe6e2d2, tail: 0x8a8f6a, v: 0.24, vMax: 1.5, turn: 2.6, jump: [2.8, 3.9], depth: [0.25, 0.6], school: false },
};

// o corpo de comprimento 1 ao longo de +z (cabeça na frente), com nadadeiras; cor por vértice (dorso escuro, flanco prata,
// barriga clara, a faixa do lambari e o rabo colorido)
function fishGeo(S, lambari) {
  const parts = [], paint = (g, f) => { const p = g.attributes.position, c = new Float32Array(p.count * 3), cc = new THREE.Color();
    for (let i = 0; i < p.count; i++) { f(p.getX(i), p.getY(i), p.getZ(i), cc); c.set([cc.r, cc.g, cc.b], i * 3); } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; };
  const back = new THREE.Color(S.back), side = new THREE.Color(S.side), belly = new THREE.Color(S.belly), tail = new THREE.Color(S.tail), dark = new THREE.Color(0x1a1c18);
  const body = new THREE.SphereGeometry(1, 14, 10), p = body.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), t = Math.max(0.16, 1 + Math.min(0, z) * 0.85) * (z > 0.6 ? 1 - (z - 0.6) * 0.6 : 1);
    p.setXYZ(i, x * 0.1 * t, y * (lambari ? 0.17 : 0.15) * t + (y > 0 ? 0.01 : 0), z * 0.5); }
  body.computeVertexNormals();
  parts.push(paint(body, (x, y, z, c) => { const ny = y / 0.17; c.copy(side).lerp(back, Math.max(0, Math.min(1, (ny - 0.15) * 2))).lerp(belly, Math.max(0, Math.min(1, (-ny - 0.2) * 2)));
    if (lambari && Math.abs(ny) < 0.12 && z < 0.25) c.lerp(dark, 0.25);                    // a faixa prateada-escura do flanco
    if (lambari && z < -0.32 && z > -0.42 && Math.abs(ny) < 0.25) c.copy(dark);           // a mancha preta antes do rabo
  }));
  const fin = (pts, col) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3)); g.computeVertexNormals(); return paint(g, (x, y, z, c) => c.copy(col)); };
  parts.push(fin([[0, 0, -0.44], [0, 0.2, -0.72], [0, 0.03, -0.6], [0, 0, -0.44], [0, 0.03, -0.6], [0, -0.03, -0.6], [0, 0, -0.44], [0, -0.03, -0.6], [0, -0.2, -0.72]], tail));   // rabo bifurcado
  parts.push(fin([[0, 0.12, 0.08], [0, 0.22, -0.06], [0, 0.11, -0.16]], back));          // dorsal
  parts.push(fin([[0, -0.1, -0.12], [0, -0.17, -0.22], [0, -0.08, -0.26]], lambari ? tail : side));   // anal
  for (const sx of [-1, 1]) { const e = new THREE.SphereGeometry(0.035, 6, 4).translate(sx * 0.075, 0.035, 0.36); parts.push(paint(e, (x, y, z, c) => c.copy(dark))); }
  const all = parts.map(g => { g = g.index ? g.toNonIndexed() : g; if (!g.attributes.normal) g.computeVertexNormals(); g.deleteAttribute('uv'); return g; });
  // junta à mão (posição, normal, cor)
  let n = 0; for (const g of all) n += g.attributes.position.count; const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0;
  for (const g of all) { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); C.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3)); out.setAttribute('color', new THREE.BufferAttribute(C, 3)); return out;
}

export function buildPeixes(scene, { afx = null, fx = null, mobile = false } = {}) {
  const rnd = Math.random, wl = (x, z) => waterLevelAt(x, z) - U.uWaterDrop.value, depthAt = (x, z) => wl(x, z) - heightAt(x, z);
  // onde há peixe: os poços e a lagoa, mais dois remansos fundos do rio
  const homes = [{ c: [SPRING[0], SPRING[1]], r: POOL_R * 0.9, lam: 12, piau: 1 }, { c: [LAKE.c[0], LAKE.c[1]], r: LAKE.r * 0.85, lam: 16, piau: 3 }, { c: [FALL.pool[0], FALL.pool[1]], r: 3.4, lam: 8, piau: 3, queda: true }];
  for (let k = 0, got = 0; k < 400 && got < 2; k++) { const i = 20 + Math.floor(rnd() * (RIVER.length - 60)), [x, z] = RIVER[i]; if (depthAt(x, z) > 0.32 && Math.hypot(x - FALL.pool[0], z - FALL.pool[1]) > 12 && homes.every(h => Math.hypot(h.c[0] - x, h.c[1] - z) > 10)) { homes.push({ c: [x, z], r: 2.5, lam: 6, piau: 0 }); got++; } }
  for (const h of homes) h.lv = waterLevelAt(h.c[0], h.c[1]);
  const fishes = [], meshes = {};
  // nadável: fundo o bastante, perto de casa e na mesma lâmina d'água (junto ao paredão da queda o nível é o do rio de cima)
  const okAt = (f, x, z) => depthAt(x, z) > (f.S === SP.piau ? 0.3 : 0.16) && Math.hypot(x - f.home.c[0], z - f.home.c[1]) < f.home.r * 1.25 && Math.abs(waterLevelAt(x, z) - f.home.lv) < 0.25;
  const spot = (f) => { for (let k = 0; k < 40; k++) { const a = rnd() * 6.283, r = f.home.r * Math.sqrt(rnd()), x = f.home.c[0] + Math.cos(a) * r, z = f.home.c[1] + Math.sin(a) * r; if (okAt(f, x, z)) return [x, z]; } return [f.home.c[0], f.home.c[1]]; };
  for (const [name, S] of Object.entries(SP)) { const list = [];
    for (const h of homes) { const n = Math.round((name === 'lambari' ? h.lam : h.piau) * (mobile ? 0.6 : 1)); for (let i = 0; i < n; i++) { const f = { S, name, home: h, st: 'nada', x: 0, y: 0, z: 0, h: rnd() * 6.28, pitch: 0, roll: 0, v: 0, tgt: null, t: 0, ph: rnd() * 6, amp: 0.05, vy: 0, vx: 0, vz: 0, i: list.length, out: 0 };
      [f.x, f.z] = spot(f); f.y = wl(f.x, f.z) - 0.2; list.push(f); fishes.push(f); } }
    const geo = fishGeo(S, name === 'lambari'), N = list.length; if (!N) continue;
    const ph = new THREE.InstancedBufferAttribute(new Float32Array(N), 1), amp = new THREE.InstancedBufferAttribute(new Float32Array(N), 1); geo.setAttribute('ph', ph); geo.setAttribute('amp', amp);
    const m = toon({ vertexColors: true, side: THREE.DoubleSide });
    m.onBeforeCompile = sh => { shared(sh); sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float ph;attribute float amp;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n{float tl=clamp(0.3-position.z,0.0,1.1);transformed.x+=sin(position.z*7.0+ph)*amp*tl*tl;}');   // a onda do nado: da cabeça para o rabo
      sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n{vec3 vv=normalize(vViewPosition);float r=pow(1.0-abs(dot(normal,vv)),3.0);totalEmissiveRadiance+=vec3(0.25)*r*diffuseColor.rgb;}'); };   // o brilho prateado do flanco
    m.customProgramCacheKey = () => 'peixe';
    const im = new THREE.InstancedMesh(geo, m, N); im.frustumCulled = false; im.castShadow = false; im.renderOrder = 1; scene.add(im);
    meshes[name] = { im, list, ph, amp }; }

  // ---------- iscas (a pesca liga uma isca no ponto da boia; aqui os peixes decidem)
  const baits = [];
  function bait() { const b = { x: 0, z: 0, on: false, nib: 0, bite: false, fish: null, hooked: false, t: 1 + rnd() * 3, gone: false }; baits.push(b); return b; }
  function letGo(b, flee = true) { const f = b.fish; if (f && f.st !== 'fora') { f.st = flee ? 'foge' : 'nada'; f.t = 1.5; f.from = [b.x, b.z]; f.bait = null; } b.fish = null; b.bite = false; b.hooked = false; }
  // fisgar: dá certo se o peixe está com a isca na boca (e nem sempre)
  function hook(b, chance = 0.7) { const f = b.fish; if (!f || !b.bite) { letGo(b); return null; } if (rnd() > chance) { if (rnd() < 0.4) b.gone = true; letGo(b); return null; } f.st = 'preso'; b.hooked = true; b.bite = false; return f; }
  function caught(f) { f.st = 'fora'; f.out = 90 + rnd() * 120; for (const b of baits) if (b.fish === f) { b.fish = null; b.hooked = false; } }
  function release(f) { f.st = 'foge'; f.t = 1.5; f.from = [f.x - Math.sin(f.h), f.z - Math.cos(f.h)]; for (const b of baits) if (b.fish === f) { b.fish = null; b.hooked = false; } }
  const disturbs = [];
  function disturb(x, z, r = 1.5) { disturbs.push([x, z, r, 0.2]); }

  // ---------- pulo: arco balístico; o piau da piracema mira a cortina da cachoeira
  function jump(f, toward = null) { const S = f.S, w0 = wl(f.x, f.z), [a, b] = S.jump; let vy = a + rnd() * (b - a), hv = 0.5 + rnd() * 0.9, h = f.h;
    if (toward) { h = Math.atan2(toward[0] - f.x, toward[1] - f.z); vy = 4.8 + rnd() * 1.6; hv = Math.min(2.4, Math.hypot(toward[0] - f.x, toward[1] - f.z) / (2 * vy / G) * (0.8 + rnd() * 0.5)); }
    f.st = 'ar'; f.h = h; f.vx = Math.sin(h) * hv; f.vz = Math.cos(h) * hv; f.vy = vy; f.y = w0 - 0.02;
    if (afx) afx.splash(f.x, w0, f.z, S.L * (toward ? 2.6 : 1.8)); }

  let time = 0, beijoT = 0;
  function update(dt, ctx = {}) { time += dt; dt = Math.min(dt, 0.08);
    const cam = window.__cam, hour = window.__hour ?? ctx.hour ?? 12, dusk = (hour > 5.3 && hour < 7.5) || (hour > 16.8 && hour < 19) ? 5 : 1, Q = window.__fallQ ? window.__fallQ.q : 1;
    // quem está na água espanta o peixe: gente e bicho com o pé no molhado, e os respingos da hora
    const threats = []; for (const p of ctx.people || []) if (p.g && p.g.visible && depthAt(p.x, p.z) > 0.05) threats.push([p.x, p.z, 2.2]);
    for (const a of ctx.animals || []) if (a.g && a.g.visible && depthAt(a.x, a.z) > 0.05) threats.push([a.x, a.z, 2.2]);
    for (let i = disturbs.length - 1; i >= 0; i--) { threats.push(disturbs[i]); if ((disturbs[i][3] -= dt) < 0) disturbs.splice(i, 1); }
    // centro de cada cardume (lambaris da mesma casa)
    const sch = new Map(); for (const f of fishes) if (f.S.school && f.st === 'nada') { const k = f.home; const s = sch.get(k) || [0, 0, 0, 0, 0]; s[0] += f.x; s[1] += f.z; s[2] += Math.sin(f.h); s[3] += Math.cos(f.h); s[4]++; sch.set(k, s); }
    // iscas: um peixe perto se interessa
    for (const b of baits) { if (!b.on) { if (b.fish) letGo(b, false); continue; } if (b.gone) continue;
      if (!b.fish && (b.t -= dt) < 0) { b.t = 1.2 + rnd() * 2.5; let best = null, bd = 6; for (const f of fishes) { if (f.st !== 'nada') continue; const d = Math.hypot(f.x - b.x, f.z - b.z); if (d < bd && rnd() < 0.5) { bd = d; best = f; } }
        if (best) { b.fish = best; best.st = 'isca'; best.bait = b; best.nibs = 0; best.nibMax = 2 + Math.floor(rnd() * 4); best.nibT = 0.6; } } }
    for (const f of fishes) {
      const S = f.S;
      if (f.st === 'fora') { if ((f.out -= dt) < 0) { f.st = 'nada'; [f.x, f.z] = spot(f); f.y = wl(f.x, f.z) - 0.25; } continue; }
      if (f.st === 'preso') { f.ph += dt * 30; f.amp = 0.22; continue; }   // quem segura é a linha (pesca)
      const w0 = wl(f.x, f.z);
      if (f.st === 'ar') { f.vy -= G * dt; f.x += f.vx * dt; f.z += f.vz * dt; f.y += f.vy * dt; f.pitch = Math.atan2(f.vy, Math.hypot(f.vx, f.vz)); f.ph += dt * 40; f.amp = 0.28;
        f.roll = Math.sin(time * 9 + f.i) * 0.3;
        const wn = wl(f.x, f.z); if (f.vy < 0 && f.y < wn) { if (afx) afx.splash(f.x, wn, f.z, S.L * 2.2); if (fx && S === SP.piau) fx.emit('respingo', f.x, wn + 0.03, f.z, 4, { spread: 0.6, speed: 0.6 });
          f.st = depthAt(f.x, f.z) > 0.1 ? 'nada' : 'foge'; f.y = wn - 0.08; f.pitch = -0.4; f.v = 0.8; f.roll = 0; if (!okAt(f, f.x, f.z)) { [f.x, f.z] = spot(f); } }
        continue; }
      // rumo e velocidade desejados
      let want = f.h, sp = S.v, k = Math.min(1, dt * S.turn);
      let th = null, td = 1e9; for (const t of threats) { const d = Math.hypot(t[0] - f.x, t[1] - f.z); if (d < t[2] && d < td) { td = d; th = t; } }
      if (th && f.st !== 'isca' && f.st !== 'leva') { f.st = 'foge'; f.t = 1 + rnd(); f.from = [th[0], th[1]]; }
      if (f.st === 'foge') { want = Math.atan2(f.x - f.from[0], f.z - f.from[1]); sp = S.vMax; k = Math.min(1, dt * S.turn * 2); if ((f.t -= dt) < 0) f.st = 'nada'; }
      else if (f.st === 'isca') { const b = f.bait; if (!b || !b.on) { f.st = 'nada'; f.bait = null; }
        else { const d = Math.hypot(b.x - f.x, b.z - f.z); want = Math.atan2(b.x - f.x, b.z - f.z); sp = d > 0.25 ? S.v * 1.3 : 0.05;
          if (d < 0.25 && (f.nibT -= dt) < 0) { f.nibT = 0.45 + rnd() * 0.9; f.nibs++; b.nib = 1; f.x -= Math.sin(f.h) * 0.05; f.z -= Math.cos(f.h) * 0.05;   // belisca e recua
            if (f.nibs >= f.nibMax) { f.st = 'leva'; b.bite = true; b.biteT = 0; f.h += (rnd() - 0.5) * 2.5; } } } }
      else if (f.st === 'leva') { const b = f.bait; sp = S.v * 1.6; if (rnd() < dt) f.h += (rnd() - 0.5) * 1.2; want = f.h;   // nada para longe com a isca na boca
        if (b) { b.biteT += dt; if (b.biteT > 1.6) { if (rnd() < 0.35) b.gone = true; letGo(b); } } else f.st = 'nada'; }
      else { if (!f.tgt || (f.t -= dt) < 0 || Math.hypot(f.tgt[0] - f.x, f.tgt[1] - f.z) < 0.3) { f.tgt = spot(f); f.t = 3 + rnd() * 6; }
        want = Math.atan2(f.tgt[0] - f.x, f.tgt[1] - f.z);
        if (S.school) { const s = sch.get(f.home); if (s && s[4] > 1) { const cx = s[0] / s[4], cz = s[1] / s[4], dc = Math.hypot(cx - f.x, cz - f.z), ah = Math.atan2(s[2], s[3]);
          if (dc > 0.6) want = Math.atan2(cx - f.x, cz - f.z) * 0.6 + want * 0.4; else want = want * 0.5 + ah * 0.5; } }
        sp = S.v * (0.6 + 0.6 * Math.sin(time * 0.7 + f.i)); }
      // vira (pelo caminho mais curto), checa o raso adiante e anda
      let e = want - f.h; e = Math.atan2(Math.sin(e), Math.cos(e)); f.h += e * k; f.v += (sp - f.v) * Math.min(1, dt * 3);
      const nx = f.x + Math.sin(f.h) * f.v * dt, nz = f.z + Math.cos(f.h) * f.v * dt;
      if (okAt(f, nx + Math.sin(f.h) * 0.3, nz + Math.cos(f.h) * 0.3) && okAt(f, nx, nz)) { f.x = nx; f.z = nz; } else { f.h += (f.i % 2 ? 1 : -1) * 2.5 * dt; f.v *= 0.5; if (f.st === 'leva' && f.bait) f.h += 1.5; }
      // separação no cardume
      if (S.school) for (const o of meshes[f.name].list) { if (o === f || o.home !== f.home || o.st === 'ar') continue; const dx = f.x - o.x, dz = f.z - o.z, d = Math.hypot(dx, dz); if (d < 0.14 && d > 1e-4) { f.x += dx / d * (0.14 - d) * 0.5; f.z += dz / d * (0.14 - d) * 0.5; } }
      // profundidade: cada um na sua faixa, sem raspar o fundo; o lambari sobe para beliscar inseto na superfície
      const dep = depthAt(f.x, f.z), [d0, d1] = S.depth; f.dz = f.dz ?? d0 + rnd() * (d1 - d0);
      if (S.school && f.st === 'nada' && rnd() < dt * 0.012 && U.uDay.value > 0.4) f.rise = 0.6;
      if (f.rise > 0) { f.rise -= dt; if (f.rise < 0.15 && !f.kissed) { f.kissed = true; if (afx && beijoT < time) { afx.ripple(f.x, w0, f.z, 0.14); beijoT = time + 0.15; } } if (f.rise <= 0) f.kissed = false; }
      const ty = f.rise > 0 ? w0 - 0.03 : Math.max(heightAt(f.x, f.z) + 0.07, w0 - Math.min(f.dz, dep - 0.06)); const oy = f.y; f.y += (ty - f.y) * Math.min(1, dt * 2);
      f.pitch += (Math.atan2(f.y - oy, Math.max(0.02, f.v * dt)) * 0.6 - f.pitch) * Math.min(1, dt * 4); f.roll *= 0.9;
      f.ph += dt * (5 + f.v * 26); f.amp = 0.05 + Math.min(0.2, f.v * 0.09);
      // pulos
      let rate = (S === SP.lambari ? 0.0025 : 0.0015) * dusk; const piracema = f.home.queda && S === SP.piau && Q > 1.05 && U.uDay.value > 0.2;
      if (piracema) rate = 0.14 * (Q - 0.95);
      if (f.st === 'nada' && dep > 0.2 && rnd() < dt * rate) jump(f, piracema ? [FALL.pool[0] - FALL.t[0] * 2.6, FALL.pool[1] - FALL.t[1] * 2.6] : null);
    }
    // desenho: só o que está perto da câmera (o resto some)
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler(0, 0, 0, 'YXZ'), sv = new THREE.Vector3(), pv = new THREE.Vector3();
    for (const [name, Mx] of Object.entries(meshes)) { for (const f of Mx.list) { const far = cam ? Math.hypot(cam.position.x - f.x, cam.position.z - f.z) > (mobile ? 60 : 95) : false;
        const L = f.S.L * (0.85 + (f.i % 5) * 0.06); e3.set(-f.pitch, f.h, f.roll); q.setFromEuler(e3); sv.setScalar(f.st === 'fora' || far ? 0 : L); pv.set(f.x, f.y, f.z);
        M.compose(pv, q, sv); Mx.im.setMatrixAt(f.i, M); Mx.ph.array[f.i] = f.ph; Mx.amp.array[f.i] = f.amp; }
      Mx.im.instanceMatrix.needsUpdate = true; Mx.ph.needsUpdate = true; Mx.amp.needsUpdate = true; }
  }
  return { update, bait, hook, caught, release, disturb, jump, fishes, homes, depthAt, wl };
}
