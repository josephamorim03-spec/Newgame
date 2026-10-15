// Fenômenos do céu, com a física de verdade:
//  · arco-íris: anel de ~42° em volta do ponto antissolar (vermelho por fora, violeta por dentro), o secundário a ~51°
//    com as cores trocadas e a faixa escura de Alexandre entre os dois; aparece quando a chuva afina e o sol volta,
//    com o sol a menos de 42° de altura. Visto de cima, o anel cai sobre o vale, como se vê de um avião.
//  · raio: na chuva forte, uma descarga em zigue-zague com galhos, de ~150 m até o chão, 2 ou 3 pulsos; o clarão
//    acende o céu e o trovão chega atrasado pela distância (som a 343 m/s), mais grave e comprido quando é longe.
//  · redemoinho de poeira: na seca, nas tardes quentes e de vento fraco; coluna que gira, sobe e anda com o vento.
import * as THREE from 'three';
import { U, HEAD } from './mat.js';
import { heightAt, TILES, inHex } from './world.js';

const rnd = Math.random;
export function buildSkyFx(scene, camera, { mobile = false, focus } = {}) {
  const fx = { bow: 0, flash: 0 };
  // ---------- arco-íris (quadro na tela inteira; a direção de cada pixel vem da câmera)
  const bowMat = new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, uniforms: { uBow: { value: 0 }, uInvProj: { value: new THREE.Matrix4() }, uCamW: { value: new THREE.Matrix4() } },
    vertexShader: 'varying vec2 vNdc;void main(){vNdc=position.xy;gl_Position=vec4(position.xy,0.0,1.0);}',
    fragmentShader: /* glsl */`varying vec2 vNdc;uniform float uBow;uniform mat4 uInvProj,uCamW;\n${HEAD}
      vec3 spec(float t){return clamp(vec3(abs(t*6.0-3.0)-1.0,2.0-abs(t*6.0-2.0),2.0-abs(t*6.0-4.0)),0.0,1.0);}   // 0 = vermelho ... 1 = violeta
      void main(){if(uBow<0.005)discard;vec4 p=uInvProj*vec4(vNdc,1.0,1.0);vec3 d=normalize((uCamW*vec4(p.xyz/p.w,0.0)).xyz);
        float a=degrees(acos(clamp(dot(d,-uSunW),-1.0,1.0)));
        float t1=(42.3-a)/1.9, b1=smoothstep(0.0,0.15,t1)*(1.0-smoothstep(0.85,1.0,t1));
        float t2=(a-50.3)/2.4, b2=smoothstep(0.0,0.15,t2)*(1.0-smoothstep(0.85,1.0,t2))*0.38;
        vec3 col=spec(clamp(t1,0.0,1.0)*0.8)*b1+spec(clamp(t2,0.0,1.0)*0.8)*b2;
        float inner=(1.0-smoothstep(36.0,40.6,a))*0.10;   // por dentro do arco o céu fica mais claro
        float mask=smoothstep(-0.05,0.25,-d.y+0.5);        // some perto do zênite
        gl_FragColor=vec4(col*0.9+vec3(inner),(max(b1,b2)*0.42+inner)*uBow*mask);
        #include <colorspace_fragment>
      }` });
  Object.assign(bowMat.uniforms, U, { uBow: bowMat.uniforms.uBow, uInvProj: bowMat.uniforms.uInvProj, uCamW: bowMat.uniforms.uCamW });
  const bow = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bowMat); bow.frustumCulled = false; bow.renderOrder = 998; scene.add(bow);
  let rainMem = 0;

  // ---------- raios
  const boltMat = new THREE.MeshBasicMaterial({ color: 0xe8eeff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(230,236,255,1)'); gr.addColorStop(1, 'rgba(150,170,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 })); scene.add(glow);
  let bolt = null, boltT = 0, nextBolt = 4, thunders = [], strikeAt = null, holdBolt = false;
  function makeBolt(gx, gz) {
    const top = new THREE.Vector3(gx + (rnd() - 0.5) * 30, 140 + rnd() * 40, gz + (rnd() - 0.5) * 30), bottom = new THREE.Vector3(gx, heightAt(gx, gz), gz);
    const segs = [];
    const zig = (a, b, depth, w) => { if (depth === 0) { segs.push([a, b, w]); return; } const m = a.clone().lerp(b, 0.5), L = a.distanceTo(b);
      m.x += (rnd() - 0.5) * L * 0.28; m.z += (rnd() - 0.5) * L * 0.28; m.y += (rnd() - 0.5) * L * 0.08; zig(a, m, depth - 1, w); zig(m, b, depth - 1, w);
      if (depth > 2 && rnd() < 0.35) { const e = m.clone().add(new THREE.Vector3((rnd() - 0.5) * L * 0.6, -L * (0.3 + rnd() * 0.3), (rnd() - 0.5) * L * 0.6)); zig(m, e, depth - 2, w * 0.5); } };
    zig(top, bottom, 7, 1.1);
    // fitas viradas para a câmera
    const pos = [], cam = camera.position;
    for (const [a, b, w] of segs) { const dir = b.clone().sub(a), side = dir.clone().cross(cam.clone().sub(a)).normalize().multiplyScalar(w / 2);
      const q = [a.clone().add(side), a.clone().sub(side), b.clone().add(side), b.clone().sub(side)]; pos.push(...q[0].toArray(), ...q[1].toArray(), ...q[2].toArray(), ...q[1].toArray(), ...q[3].toArray(), ...q[2].toArray()); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const m = new THREE.Mesh(g, boltMat); m.frustumCulled = false; m.renderOrder = 997; return { m, top, bottom };
  }
  // trovão sintetizado: estalo + ronco grave; atraso pela distância e mais abafado quando longe
  let ac = null; addEventListener('pointerdown', () => { if (!ac) try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } }, { once: false });
  function thunder(dist) { if (!ac || ac.state !== 'running' && ac.resume) { if (ac) ac.resume(); if (!ac) return; }
    const dur = 2.5 + Math.min(5, dist / 300), n = ac.sampleRate * dur | 0, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0); let b = 0;
    for (let i = 0; i < n; i++) { const t = i / ac.sampleRate; b = b * 0.985 + (rnd() * 2 - 1) * 0.12; const env = (dist < 400 ? Math.exp(-t * 18) * 1.5 : 0) + Math.exp(-t / (dur * 0.35)) * (0.6 + 0.4 * Math.sin(t * 7 + rnd()));
      d[i] = b * env; }
    const src = ac.createBufferSource(), lp = ac.createBiquadFilter(), gain = ac.createGain(); src.buffer = buf; lp.type = 'lowpass'; lp.frequency.value = Math.max(90, 900 - dist * 0.6);
    gain.gain.value = Math.min(0.9, 260 / Math.max(120, dist)); src.connect(lp).connect(gain).connect(ac.destination); src.start(); }

  // ---------- redemoinhos de poeira
  const NP = mobile ? 220 : 380, devils = [];
  const dustMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uT: { value: 0 }, uLife: { value: 0 }, uH: { value: 20 }, uR: { value: 1.5 }, uTilt: { value: new THREE.Vector2() }, uPx: { value: 600 }, uDay: U.uDay },
    vertexShader: `attribute float seed;uniform float uT,uLife,uH,uR,uPx;uniform vec2 uTilt;varying float vA;
      void main(){float h=fract(seed*7.13+uT*0.18)*uH;float r=uR*(0.35+h/uH*1.6)*(0.7+0.6*fract(seed*3.7));float ang=seed*62.83+uT*(4.2-h/uH*2.0);
        vec3 p=vec3(cos(ang)*r,h,sin(ang)*r);p.xz+=uTilt*(h/uH)*(h/uH)*uH*0.25;
        vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=(1.0+h/uH*3.5)*uPx/max(1.0,-mv.z);
        vA=uLife*(1.0-smoothstep(0.6,1.0,h/uH))*smoothstep(0.0,0.06,h/uH)*0.75;}`,
    fragmentShader: `uniform float uDay;varying float vA;void main(){float d=length(gl_PointCoord-0.5);if(d>0.5)discard;gl_FragColor=vec4(vec3(0.86,0.74,0.56)*(0.35+0.65*uDay),vA*(1.0-d*2.0));
      #include <colorspace_fragment>
    }` });
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NP * 3), 3)); dustGeo.setAttribute('seed', new THREE.Float32BufferAttribute(Float32Array.from({ length: NP }, () => rnd()), 1));
  const dry = TILES.filter(t => t.kind === 'cerrado' || t.kind === 'pasto' || t.kind === 'lavoura');
  let nextDevil = 6;

  return {
    bowMesh: bow, fx,
    update(dt, ctx) {
      const day = U.uDay.value, sunY = U.uSunW.value.y, rain = U.uRain.value;
      // arco-íris: a chuva passou há pouco (memória), ainda tem gota no ar, o sol aparece e está baixo
      if (rain > 0.25) rainMem = 1; else rainMem = Math.max(0, rainMem - dt / 70);
      const elev = Math.asin(Math.max(-1, Math.min(1, sunY))) * 180 / Math.PI;
      const want = rainMem * (rain < 0.35 ? 1 : Math.max(0, 1 - (rain - 0.35) * 4)) * THREE.MathUtils.smoothstep(elev, 1, 6) * (1 - THREE.MathUtils.smoothstep(elev, 36, 42)) * (1 - U.uCloudCov.value * 0.5) * day;
      fx.bow += ((fx.forceBow ?? want) - fx.bow) * Math.min(1, dt * 0.6); bowMat.uniforms.uBow.value = fx.bow; bow.visible = fx.bow > 0.005;
      bowMat.uniforms.uInvProj.value.copy(camera.projectionMatrixInverse); bowMat.uniforms.uCamW.value.copy(camera.matrixWorld);
      // raios: só na chuva forte (≥ ~12 mm/h)
      const R = ctx.Rr || 0; nextBolt -= dt;
      if (R > 12 && nextBolt <= 0 && !bolt) { const f = focus(), a = rnd() * 6.283, d = 60 + rnd() * 260; const b = strikeAt ? makeBolt(strikeAt[0], strikeAt[1]) : makeBolt(f.x + Math.cos(a) * d, f.z + Math.sin(a) * d); strikeAt = null; scene.add(b.m);
        bolt = b; boltT = 0; nextBolt = 5 + rnd() * 10 * (25 / Math.max(12, R)); glow.position.copy(b.top).lerp(b.bottom, 0.25); glow.scale.setScalar(160);
        const dist = camera.position.distanceTo(b.bottom); thunders.push({ t: dist / 343, dist }); }
      if (bolt) { boltT = holdBolt ? 0.01 : boltT + dt; const pulse = (t => Math.max(0, 1 - t / 0.07))(boltT) + 0.8 * Math.max(0, 1 - Math.abs(boltT - 0.16) / 0.05) + 0.6 * Math.max(0, 1 - Math.abs(boltT - 0.3) / 0.06);
        boltMat.opacity = Math.min(1, pulse); glow.material.opacity = Math.min(1, pulse) * 0.7; fx.flash = Math.min(1, pulse);
        if (boltT > 0.45) { scene.remove(bolt.m); bolt.m.geometry.dispose(); bolt = null; fx.flash = 0; glow.material.opacity = 0; } } else fx.flash = 0;
      for (const th of thunders) th.t -= dt; while (thunders.length && thunders[0].t <= 0) { thunder(thunders.shift().dist); }
      // redemoinhos: seca, tarde quente (10h30–16h30), sem chuva, vento fraco a moderado
      const hour = ctx.hour, ok = U.uSeca.value > 0.7 && hour > 10.5 && hour < 16.5 && rain < 0.02 && U.uWindBase.value < 6.5;
      nextDevil -= dt;
      if (ok && nextDevil <= 0 && devils.length < 2) { const t = dry[Math.floor(rnd() * dry.length)]; let x, z, k = 0; do { x = t.c[0] + (rnd() - 0.5) * 34; z = t.c[1] + (rnd() - 0.5) * 34; } while (++k < 20 && !inHex(x, z, t.c, 0.85));
        const m = dustMat.clone(); m.uniforms.uDay = U.uDay; const pts = new THREE.Points(dustGeo, m); pts.frustumCulled = false; pts.position.set(x, heightAt(x, z), z); scene.add(pts);
        devils.push({ pts, m, age: 0, life: 18 + rnd() * 20, H: 15 + rnd() * 20, R: 1.6 + rnd() * 1.6, wx: (rnd() - 0.5) * 2, wz: (rnd() - 0.5) * 2 }); nextDevil = 12 + rnd() * 25; }
      for (let i = devils.length - 1; i >= 0; i--) { const dv = devils[i]; dv.age += dt; const w = U.uWindDir.value, ub = U.uWindBase.value;
        dv.pts.position.x += (w.x * ub * 0.7 + dv.wx) * dt; dv.pts.position.z += (w.y * ub * 0.7 + dv.wz) * dt; dv.pts.position.y = heightAt(dv.pts.position.x, dv.pts.position.z);
        const life = Math.min(1, dv.age / 3) * Math.min(1, (dv.life - dv.age) / 4) * (ok ? 1 : Math.max(0, 1 - dv.age / 3));
        Object.assign(dv.m.uniforms, {}); dv.m.uniforms.uT.value = dv.age; dv.m.uniforms.uLife.value = Math.max(0, life); dv.m.uniforms.uH.value = dv.H; dv.m.uniforms.uR.value = dv.R;
        dv.m.uniforms.uTilt.value.set(w.x, w.y).multiplyScalar(Math.min(1, ub / 5)); dv.m.uniforms.uPx.value = ctx.pxPerUnit;
        if (dv.age > dv.life) { scene.remove(dv.pts); dv.m.dispose(); devils.splice(i, 1); } }
    },
    // ajuda de teste: força um raio agora, perto do ponto olhado
    strike(at = null, hold = false) { nextBolt = 0; strikeAt = at; holdBolt = hold; },
    devil() { nextDevil = 0; },
  };
}
