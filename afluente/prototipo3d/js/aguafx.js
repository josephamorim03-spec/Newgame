// Água e chão reagindo a quem passa (bichos e pessoas): anéis que abrem na superfície, respingos de gotas que sobem e caem
// de volta na água, e poeira levantada no chão seco. Um conjunto só, reaproveitado (sem criar objeto por efeito).
//   ripple(x, y, z, tam)  anel na água (pata no raso, beiço bebendo, boia mexendo)
//   splash(x, y, z, tam)  respingo: gotas + dois anéis (criança pulando na lagoa, garça dando o bote)
//   dust(x, y, z, tam)    poeira (bicho correndo no seco)
import * as THREE from 'three';

export function createFx(scene, { mobile = false } = {}) {
  const RN = mobile ? 28 : 56, rgeo = new THREE.RingGeometry(0.8, 1, 36).rotateX(-Math.PI / 2), rings = [];
  for (let i = 0; i < RN; i++) { const m = new THREE.Mesh(rgeo, new THREE.MeshBasicMaterial({ color: 0xf4fbff, transparent: true, opacity: 0, depthWrite: false }));
    m.renderOrder = 3; m.visible = false; m.frustumCulled = false; scene.add(m); rings.push({ m, t: 9, life: 1, s0: 0.1, s1: 1, a: 0.6, delay: 0 }); }
  let ri = 0;
  function ripple(x, y, z, size = 1, delay = 0) { const r = rings[ri]; ri = (ri + 1) % RN; r.m.position.set(x, y + 0.015, z); r.s0 = 0.08 * size; r.s1 = 1.1 * size; r.life = 0.8 + 0.5 * Math.sqrt(size);
    r.t = -delay; r.a = Math.min(0.5, 0.22 + 0.18 * size); r.m.visible = false; }

  // partículas: gotas (azuladas, caem com a gravidade e somem ao voltar à água) e poeira (cor de terra, sobe devagar e se abre)
  const PN = mobile ? 220 : 440, P = new Float32Array(PN * 3), V = new Float32Array(PN * 3), C = new Float32Array(PN * 3), A = new Float32Array(PN), Sz = new Float32Array(PN);
  const life = new Float32Array(PN), age = new Float32Array(PN).fill(9), floor = new Float32Array(PN), kind = new Uint8Array(PN);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
  geo.setAttribute('alpha', new THREE.BufferAttribute(A, 1)); geo.setAttribute('size', new THREE.BufferAttribute(Sz, 1));
  const pm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uPx: { value: 600 } },
    vertexShader: 'attribute float alpha;attribute float size;attribute vec3 color;uniform float uPx;varying float vA;varying vec3 vC;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;vA=alpha;vC=color;gl_PointSize=max(1.5,size*uPx/max(1.0,-mv.z));}',
    fragmentShader: 'varying float vA;varying vec3 vC;void main(){float d=length(gl_PointCoord-0.5);if(d>0.5||vA<0.01)discard;gl_FragColor=vec4(vC,vA*smoothstep(0.5,0.25,d));\n#include <colorspace_fragment>\n}' });
  const pts = new THREE.Points(geo, pm); pts.frustumCulled = false; pts.renderOrder = 4; scene.add(pts);
  let pi = 0; const DROP = new THREE.Color(0xe8f6ff), DUST = new THREE.Color(0xc8a87a);
  function emit(k, x, y, z, vx, vy, vz, l, s, c) { const i = pi; pi = (pi + 1) % PN; P.set([x, y, z], i * 3); V.set([vx, vy, vz], i * 3); C.set([c.r, c.g, c.b], i * 3);
    life[i] = l; age[i] = 0; floor[i] = y; kind[i] = k; Sz[i] = s; A[i] = 1; }
  function splash(x, y, z, size = 1) { const n = Math.round((mobile ? 10 : 18) * size);
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, h = (0.6 + Math.random() * 1.4) * size, up = (2.4 + Math.random() * 2.6) * Math.sqrt(size);
      emit(0, x + Math.cos(a) * 0.15 * size, y + 0.05, z + Math.sin(a) * 0.15 * size, Math.cos(a) * h, up, Math.sin(a) * h, 1.4, 0.07 + Math.random() * 0.05, DROP); }
    ripple(x, y, z, size); ripple(x, y, z, size * 1.7, 0.18); }
  function dust(x, y, z, size = 1) { for (let i = 0; i < 3; i++) { const a = Math.random() * 6.283;
    emit(1, x, y + 0.05, z, Math.cos(a) * 0.5 * size, 0.4 + Math.random() * 0.4, Math.sin(a) * 0.5 * size, 0.9 + Math.random() * 0.5, 0.25 * size, DUST); } }

  function update(dt, ctx) { if (ctx && ctx.pxPerUnit) pm.uniforms.uPx.value = ctx.pxPerUnit;
    for (const r of rings) { if (r.t >= r.life) { if (r.m.visible) r.m.visible = false; continue; } r.t += dt; if (r.t < 0) continue; const k = Math.min(1, r.t / r.life);
      r.m.visible = true; r.m.scale.setScalar(r.s0 + (r.s1 - r.s0) * (1 - (1 - k) * (1 - k))); r.m.material.opacity = r.a * (1 - k); }
    let any = false;
    for (let i = 0; i < PN; i++) { if (age[i] >= life[i]) { if (A[i] > 0) { A[i] = 0; any = true; } continue; } any = true; age[i] += dt; const j = i * 3;
      if (kind[i] === 0) { V[j + 1] -= 9.8 * dt; P[j] += V[j] * dt; P[j + 1] += V[j + 1] * dt; P[j + 2] += V[j + 2] * dt;
        if (V[j + 1] < 0 && P[j + 1] < floor[i]) { age[i] = life[i]; A[i] = 0; if (Math.random() < 0.15) ripple(P[j], floor[i], P[j + 2], 0.25); continue; } A[i] = 0.9; }
      else { V[j] *= 1 - dt * 2; V[j + 2] *= 1 - dt * 2; V[j + 1] *= 1 - dt * 1.5; P[j] += V[j] * dt; P[j + 1] += V[j + 1] * dt; P[j + 2] += V[j + 2] * dt; Sz[i] += dt * 0.5; A[i] = 0.45 * (1 - age[i] / life[i]); } }
    if (any) { geo.attributes.position.needsUpdate = true; geo.attributes.alpha.needsUpdate = true; geo.attributes.size.needsUpdate = true; geo.attributes.color.needsUpdate = true; } }
  return { ripple, splash, dust, update };
}
