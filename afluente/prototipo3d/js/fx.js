// Partículas do vale: poeira do chão (tombo de criança, corrida, casco de boi), lascas de lenha, respingos e espuma
// d'água, gotas que pingam da roupa torcida. Um só desenho (pontos redondos e macios) com até `max` partículas vivas;
// cada tipo tem a sua física (balística com quique no chão, poeira que sobe e se espalha, espuma que boia e desfaz).
import * as THREE from 'three';
import { U } from './mat.js';
import { heightAt, waterLevelAt, waterDist } from './world.js';

const KIND = {
  poeira: { col: [0.72, 0.6, 0.45], life: [0.9, 1.6], size: [0.12, 0.22], grow: 2.6, g: 0.25, drag: 2.2, v: [0.6, 0.5], a: 0.5 },
  lasca: { col: [0.86, 0.72, 0.5], life: [1.4, 2.2], size: [0.035, 0.06], grow: 0, g: -9.8, drag: 0.4, v: [2.2, 2.6], a: 1, bounce: 0.3 },
  respingo: { col: [0.86, 0.94, 1.0], life: [0.5, 0.9], size: [0.03, 0.06], grow: 0, g: -9.8, drag: 0.3, v: [1.4, 2.4], a: 0.85, water: true },
  espuma: { col: [0.97, 0.98, 1.0], life: [1.5, 3.0], size: [0.05, 0.11], grow: 0.4, g: 0.05, drag: 3, v: [0.25, 0.1], a: 0.8, float: true },
  gota: { col: [0.8, 0.9, 1.0], life: [0.4, 0.7], size: [0.02, 0.035], grow: 0, g: -9.8, drag: 0.1, v: [0.15, 0.1], a: 0.8, water: true },
  nevoa: { col: [0.95, 0.97, 1.0], life: [2.0, 3.5], size: [0.6, 1.2], grow: 1.4, g: 0.35, drag: 1.2, v: [1.2, 0.8], a: 0.22 },
};

export function buildFx(scene, { max = 900 } = {}) {
  const pos = new Float32Array(max * 3), col = new Float32Array(max * 3), sz = new Float32Array(max), al = new Float32Array(max);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('sz', new THREE.BufferAttribute(sz, 1)); g.setAttribute('al', new THREE.BufferAttribute(al, 1)); g.setDrawRange(0, 0);
  const uPx = { value: 800 };
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uPx, uDay: U.uDay },
    vertexShader: `attribute vec3 color;attribute float sz;attribute float al;varying vec3 vC;varying float vA;uniform float uPx;uniform float uDay;
      void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=max(1.0,sz*uPx/-mv.z);vC=color*(0.35+0.65*uDay);vA=al;}`,
    fragmentShader: `varying vec3 vC;varying float vA;void main(){vec2 d=gl_PointCoord-0.5;float r=dot(d,d)*4.0;if(r>1.0)discard;gl_FragColor=vec4(vC,vA*(1.0-r*r));}` });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 6; scene.add(pts);
  const P = []; const rnd = (a, b) => a + Math.random() * (b - a);
  // n partículas do tipo k no ponto (x,y,z); dir = [dx,dy,dz] puxa a velocidade para um lado (chute, golpe, queda d'água)
  function emit(k, x, y, z, n = 8, { dir = null, spread = 1, color = null, speed = 1 } = {}) { const K = KIND[k]; if (!K) return;
    for (let i = 0; i < n && P.length < max; i++) { const a = Math.random() * Math.PI * 2, h = rnd(0.3, 1) * K.v[0] * spread * speed, up = rnd(0.5, 1) * K.v[1] * speed + (K.g < 0 ? K.v[1] * 0.8 : 0);
      const p = { k: K, x, y, z, vx: Math.cos(a) * h, vy: up, vz: Math.sin(a) * h, t: 0, life: rnd(...K.life), s0: rnd(...K.size), c: color || K.col, j: rnd(0.85, 1.1) };
      if (dir) { p.vx += dir[0] * speed; p.vy += dir[1] * speed; p.vz += dir[2] * speed; } P.push(p); } }
  function update(dt, ctx) { if (ctx && ctx.pxPerUnit) uPx.value = ctx.pxPerUnit;
    let n = 0;
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i], K = p.k; p.t += dt; if (p.t > p.life) { P[i] = P[P.length - 1]; P.pop(); continue; }
      const dr = Math.exp(-K.drag * dt); p.vx *= dr; p.vz *= dr; p.vy = p.vy * (K.g < 0 ? 1 : dr) + K.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (K.g < 0) { const gy = K.water && waterDist(p.x, p.z) < 0.2 ? waterLevelAt(p.x, p.z) : heightAt(p.x, p.z);
        if (p.y < gy) { if (K.water) { p.t = Math.max(p.t, p.life - 0.05); } else { p.y = gy; p.vy = -p.vy * (K.bounce || 0); p.vx *= 0.5; p.vz *= 0.5; if (Math.abs(p.vy) < 0.3) { p.vy = 0; p.vx *= 0.2; p.vz *= 0.2; } } } }
      if (K.float) { const wl = waterLevelAt(p.x, p.z); if (p.y < wl + 0.01) p.y = wl + 0.01; }
    }
    for (const p of P) { const K = p.k, f = p.t / p.life, i3 = n * 3; pos[i3] = p.x; pos[i3 + 1] = p.y; pos[i3 + 2] = p.z; col[i3] = p.c[0] * p.j; col[i3 + 1] = p.c[1] * p.j; col[i3 + 2] = p.c[2] * p.j;
      sz[n] = p.s0 * (1 + K.grow * f); al[n] = K.a * Math.min(1, f * 8) * (1 - f) * (K.g < 0 ? 1.4 : 1); n++; }
    g.setDrawRange(0, n); for (const k of ['position', 'color', 'sz', 'al']) g.attributes[k].needsUpdate = true; }
  return { emit, update, count: () => P.length };
}
