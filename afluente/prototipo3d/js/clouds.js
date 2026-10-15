// Cúmulos com volume, no estilo pintado: cachos de bolas fofas de base chata, lado do sol branco (dourado no fim da
// tarde), lado da sombra azulado, contorno prateado contra o sol e bordas macias. Nascem e somem conforme a cobertura
// que o motor Atmos calcula, andam com o vento lá de cima e jogam no chão a sombra deles mesmos (projetada pelo sol).
import * as THREE from 'three';
import { U, HEAD } from './mat.js';
import { NOISE } from './glsl.js';

const rnd = (() => { let a = 777; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();

export function buildClouds(scene, center, { mobile = false } = {}) {
  const N = 20, BOX = 2600, clouds = [], puffs = [];
  for (let i = 0; i < N; i++) {
    const S = 45 + rnd() * 50, ang = i * 2.39996, rad = 220 + (i % 5) * 230 + rnd() * 120, c = { x: Math.cos(ang) * rad, z: Math.sin(ang) * rad, alt: 120 + rnd() * 60, S, pres: 0, order: (i * 0.618034) % 1, ph: rnd() * 6, list: [] };
    // um cocuruto alto no meio e bolas menores em volta, todas apoiadas na mesma base
    const k = 9 + Math.floor(rnd() * 5);
    for (let j = 0; j < k; j++) { const a = rnd() * Math.PI * 2, d = j === 0 ? 0 : S * (0.25 + 0.6 * Math.sqrt(rnd())), r = (j === 0 ? S * 0.55 : S * (0.26 + rnd() * 0.18)) * (1 - 0.35 * d / S);
      c.list.push({ dx: Math.cos(a) * d, dz: Math.sin(a) * d * 0.7, r, up: r * (j === 0 ? 0.75 : 0.45) + rnd() * r * 0.2 }); puffs.push([i, c.list.length - 1]); }
    // couve-flor: bolinhas menores por cima das grandes
    for (const p of c.list.slice(0, 6)) for (let m = 0; m < 2; m++) { const a = rnd() * 6.28, rr = p.r * (0.35 + rnd() * 0.2);
      c.list.push({ dx: p.dx + Math.cos(a) * p.r * 0.55, dz: p.dz + Math.sin(a) * p.r * 0.45, r: rr, up: p.up + p.r * (0.45 + rnd() * 0.3) }); puffs.push([i, c.list.length - 1]); }
    clouds.push(c);
  }
  const geo = new THREE.IcosahedronGeometry(1, mobile ? 2 : 3), n = puffs.length;
  const im = new THREE.InstancedMesh(geo, null, n);
  const aBase = new Float32Array(n); im.geometry.setAttribute('aBase', new THREE.InstancedBufferAttribute(aBase, 1));
  im.material = new THREE.ShaderMaterial({ transparent: true, depthWrite: true, uniforms: {},
    vertexShader: /* glsl */`attribute float aBase;
${NOISE}varying vec3 vN;varying vec3 vWp;varying float vBase;
      void main(){mat4 m=modelMatrix*instanceMatrix;vec4 wp=m*vec4(position,1.0);vN=normalize(mat3(m)*normal);float sc=length(m[0].xyz);
        wp.xyz+=vN*sc*((vnoise(wp.xz*0.045+wp.y*0.06)-0.5)*0.42+(vnoise(wp.xy*0.13+wp.z*0.05)-0.5)*0.2);vWp=wp.xyz;vBase=aBase;gl_Position=projectionMatrix*viewMatrix*wp;}`,
    fragmentShader: /* glsl */`varying vec3 vN;varying vec3 vWp;varying float vBase;\n${HEAD}
      void main(){vec3 N=normalize(vN),V=normalize(cameraPosition-vWp);float ndl=dot(N,uSunW);
        float nn=vnoise(vWp.xz*0.08+vWp.y*0.05)-0.5;float lit=smoothstep(-0.08,0.12,ndl+nn*0.35)*0.75+smoothstep(0.35,0.6,ndl+nn*0.2)*0.25;float h=clamp((vWp.y-vBase)/70.0,0.0,1.0);
        vec3 shade=mix(uSkyZen*0.5+vec3(0.30,0.32,0.38),uSkyHor*0.85,0.4)*(0.72+0.28*h);
        vec3 sunlit=mix(vec3(1.0),vec3(1.0,0.82,0.62),1.0-smoothstep(0.05,0.35,uSunW.y))*(0.2+0.8*uDay);
        vec3 col=mix(shade,sunlit,lit*(0.6+0.4*h));
        col+=uSunC*pow(1.0-max(dot(N,V),0.0),3.0)*pow(max(dot(-V,uSunW),0.0),2.0)*0.9;
        col*=mix(1.0,0.5,uRain);col=mix(col*vec3(0.10,0.12,0.2),col,smoothstep(0.0,0.6,uDay));
        float dist=length(vWp-cameraPosition);col=mix(col,uSkyHor,smoothstep(500.0,2200.0,dist)*0.6);
        float a=smoothstep(0.0,0.45,dot(N,V));gl_FragColor=vec4(col,a);
        #include <colorspace_fragment>
      }` });
  Object.assign(im.material.uniforms, U);
  im.frustumCulled = false; im.renderOrder = -5; scene.add(im);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), P = new THREE.Vector3(), Sc = new THREE.Vector3(), cam = new THREE.Vector3(), order = puffs.map((_, i) => i), dist = new Float32Array(n);
  let time = 0, first = true;
  return {
    list: clouds, mesh: im,
    update(dt, camera) {
      time += dt; const cov = U.uCloudCov.value, rain = U.uRain.value, off = U.uCloudOff.value, sun = U.uSunW.value, sy = Math.max(0.22, sun.y);
      // quantas nuvens a cobertura pede; cada uma cresce ou se desfaz devagar (minutos), não acende de uma vez
      const want = Math.round(N * Math.min(1, 0.1 + cov * 1.6));
      clouds.forEach((c, i) => { const target = c.order * N < want ? 1 : 0; c.pres = first ? target : c.pres + (target - c.pres) * Math.min(1, dt * 0.08);
        c.wx = ((c.x - off.x + BOX / 2) % BOX + BOX) % BOX - BOX / 2 + center[0]; c.wz = ((c.z - off.y + BOX / 2) % BOX + BOX) % BOX - BOX / 2 + center[1];
        c.alt2 = c.alt - rain * 35; const s = Math.pow(c.pres, 0.6) * (1 + rain * 0.35) * (1 + 0.04 * Math.sin(time * 0.05 + c.ph));
        // a sombra no chão: o centro da nuvem empurrado ao longo da direção do sol
        c.sx = c.wx - sun.x * c.alt2 / sy; c.sz = c.wz - sun.z * c.alt2 / sy; c.s = s; c.d = Math.hypot(c.sx - center[0], c.sz - center[1]) - c.S * s; });
      // as 12 sombras que caem mais perto do vale vão para os shaders
      const near = clouds.filter(c => c.pres > 0.01).sort((a, b) => a.d - b.d);
      for (let i = 0; i < 12; i++) { const c = near[i]; if (c) U.uCl.value[i].set(c.sx, c.sz, c.S * 0.95 * c.s + 0.01, c.pres * (sun.y > 0 ? 1 : 0)); else U.uCl.value[i].set(0, 0, 1, 0); }
      cam.copy(camera.position);
      puffs.forEach(([ci, pj], k) => { const c = clouds[ci], p = c.list[pj], s = c.s; P.set(c.wx + p.dx * s, c.alt2 + p.up * s, c.wz + p.dz * s);
        Sc.set(p.r * s, p.r * s * 0.82, p.r * s); dist[k] = P.distanceToSquared(cam); aBase[k] = c.alt2; puffs[k].m = [P.x, P.y, P.z, Sc.x, Sc.y, Sc.z]; });
      order.sort((a, b) => dist[b] - dist[a]);   // de trás para a frente: as bordas macias se misturam certo
      order.forEach((k, slot) => { const m = puffs[k].m; P.set(m[0], m[1], m[2]); Sc.set(Math.max(1e-3, m[3]), Math.max(1e-3, m[4]), Math.max(1e-3, m[5])); M.compose(P, q, Sc); im.setMatrixAt(slot, M); aBase[slot] = clouds[puffs[k][0]].alt2; });
      im.instanceMatrix.needsUpdate = true; im.geometry.attributes.aBase.needsUpdate = true; first = false;
    },
  };
}
