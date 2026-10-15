// O que as pessoas fizeram no vale: casas de taipa caiadas com barrado colorido e telha colonial, a capela, o poço,
// a horta cercada, o curral, a lavoura de milho com a faixa de girassóis e o moinho que vira de frente para o vento.
// Tudo em metros reais; janelas acendem à noite e as chaminés soltam fumaça que o vento leva.
import * as THREE from 'three';
import { mergeGeometries } from './addons/BufferGeometryUtils.js';
import { NOISE, WIND } from './glsl.js';
import { U, HEAD, LIGHT_END, shared, toon } from './mat.js';
import { LAYOUT, heightAt, hexEdgeDist, blocked, inHex } from './world.js';
import { tag } from './regua.js';
import { plasterTexture, roofTexture, plankTexture, stoneTexture, chitaTexture } from './textures.js';

const rnd = (() => { let a = 98765; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const col = hex => new THREE.Color(hex);
function paint(g, c) { const n = g.attributes.position.count, a = new Float32Array(n * 3), cc = c.isColor ? c : col(c); for (let i = 0; i < n; i++) a.set([cc.r, cc.g, cc.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
function boxUV(g, sx, sy, sz, k) { const uv = g.attributes.uv, D = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const j = f * 4 + i; uv.setXY(j, uv.getX(j) * D[f][0] / k, uv.getY(j) * D[f][1] / k); } return g; }
const box = (sx, sy, sz, x, y, z, k = 2) => boxUV(new THREE.BoxGeometry(sx, sy, sz), sx, sy, sz, k).translate(x, y, z);
const only = (g, keep) => { for (const n of Object.keys(g.attributes)) if (!keep.includes(n)) g.deleteAttribute(n); return g; };
const merge = (gs, keep = ['position', 'normal', 'uv', 'color']) => mergeGeometries(gs.map(g => only(g.index ? g.toNonIndexed() : g, keep)));

// material com sombra das nuvens, vWp/vLp e um trecho de cor por cima do mapa
function mat(o, { frag = '', vdecl = '', vert = '', fdecl = '', rim = 0, uni = {} } = {}) {
  const m = toon(o);
  m.onBeforeCompile = sh => { shared(sh); Object.assign(sh.uniforms, uni);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;varying vec3 vLp;' + vdecl)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + vert + '\nvLp=position;\n#ifdef USE_INSTANCING\nvWp=(modelMatrix*instanceMatrix*vec4(transformed,1.0)).xyz;\n#else\nvWp=(modelMatrix*vec4(transformed,1.0)).xyz;\n#endif\n');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;varying vec3 vLp;' + fdecl + '\n' + HEAD)
      .replace('#include <map_fragment>', '#include <map_fragment>\n' + frag).replace('#include <lights_fragment_end>', LIGHT_END(rim)); };
  const key = frag + vert + vdecl + fdecl + rim; m.customProgramCacheKey = () => key;   // cada variação compila o seu programa
  return m;
}

export function buildProps(scene, { mobile = false } = {}) {
  const plaster = plasterTexture(31), roofT = roofTexture(37), plank = plankTexture(41), stoneT = stoneTexture(29);
  const roofMat = mat({ map: roofT, vertexColors: true }, { frag: `{float lo=1.0-smoothstep(2.4,4.6,vLp.y);float moss=smoothstep(0.58,0.8,fbm(vWp.xz*0.8+vWp.y*0.6))*(0.35+0.65*lo)*(1.0-uSeca*0.5);
    diffuseColor.rgb=mix(diffuseColor.rgb,toLin(vec3(0.40,0.47,0.25))*(0.75+0.5*vnoise(vWp.xz*14.0)),moss*0.6);
    diffuseColor.rgb*=1.0-0.22*smoothstep(0.62,0.9,vnoise(vec2((vWp.x+vWp.z)*2.2,vWp.y*0.45)));diffuseColor.rgb*=mix(1.0,0.7,uWet);}` });   // musgo e manchas de chuva, mais na parte baixa do telhado
  const woodMat = mat({ map: plank, vertexColors: true }, { frag: 'diffuseColor.rgb*=mix(1.0,0.75,uWet);' });
  const glowMat = mat({ color: 0x2b2622, emissive: 0xffb45a, emissiveIntensity: 0 });
  const stoneMat = mat({ map: stoneT, color: 0xbab4a8 });
  const smokeSrc = [], updaters = [];
  const groundY = (p, w, d, rot) => { let m = 1e9; for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) { const c = Math.cos(rot), s = Math.sin(rot), x = u * w / 2, z = v * d / 2;
    m = Math.min(m, heightAt(p[0] + x * c + z * s, p[1] - x * s + z * c)); } return m - 0.04; };
  const chita = ['#c8382a', '#2f6aa0', '#e0a020', '#3a8a4a'].map((b, i) => chitaTexture(43 + i, b));
  const curtainMats = chita.map(t => mat({ map: t, emissiveMap: t, emissive: 0xffc890, emissiveIntensity: 0, side: THREE.DoubleSide }));
  // vidro: de dia escuro, refletindo um pouco do céu; à noite a luz amarela de lamparina (nem toda janela acende)
  const glassDark = mat({ color: 0x1c232b }, { frag: 'diffuseColor.rgb=mix(diffuseColor.rgb,uSkyHor*0.5,0.4);' });
  const groundAt = (g, lx, lz) => { const v = new THREE.Vector3(lx, 0, lz).applyMatrix4(g.matrixWorld); return heightAt(v.x, v.z) - g.position.y; };
  const spillMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uDay: U.uDay },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'uniform float uDay;varying vec2 vUv;void main(){vec2 d=(vUv-vec2(0.5,1.0))*vec2(2.0,1.0);float r=length(d);float a=(1.0-smoothstep(0.0,1.0,r))*pow(1.0-uDay,1.5);gl_FragColor=vec4(vec3(1.0,0.62,0.28)*a*0.5,1.0);}' });
  const haloTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,220,150,1)'); gr.addColorStop(0.25, 'rgba(255,170,80,0.5)'); gr.addColorStop(1, 'rgba(255,140,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const halos = [];

  // parede caiada: barrado colorido com respingo de terra, cunhais e faixa sob o beiral na cor do barrado, sombra junto do
  // chão e sob o beiral (oclusão), escorridos e pedaços sem reboco vindos da textura
  const wallMat = (wall, band, H = 99, w = 999, d = 999) => mat({ map: plaster, color: col(wall).multiplyScalar(0.92) }, {
    uni: { uBand: { value: col(band) }, uH: { value: H }, uWD: { value: new THREE.Vector2(w / 2, d / 2) } }, fdecl: 'uniform vec3 uBand;uniform float uH;uniform vec2 uWD;',
    frag: `{vec3 tx=texture2D(map,vMapUv).rgb;float y=vLp.y;float cx=uWD.x-abs(vLp.x),cz=uWD.y-abs(vLp.z);float onLong=step(cz,0.03)*step(-0.03,cz),onGab=step(cx,0.03)*step(-0.03,cx);
      if(y<0.62){diffuseColor.rgb=uBand*(0.72+0.32*tx.r);diffuseColor.rgb=mix(diffuseColor.rgb,toLin(vec3(0.55,0.38,0.26)),(1.0-smoothstep(-0.2,0.3,y))*0.55*vnoise(vLp.xz*9.0+y*20.0));}
      else if(y<0.67)diffuseColor.rgb*=0.78;
      float corner=max(onLong*step(cx,0.2),onGab*step(cz,0.2))*step(0.62,y)*step(y,uH);
      diffuseColor.rgb=mix(diffuseColor.rgb,uBand*(0.8+0.25*tx.r),corner);
      diffuseColor.rgb=mix(diffuseColor.rgb,uBand*(0.85+0.2*tx.r),step(uH-0.16,y)*step(y,uH)*0.9);
      diffuseColor.rgb*=(1.0-0.3*smoothstep(uH-1.0,uH,y)*step(y,uH-0.16))*(1.0-0.2*(1.0-smoothstep(0.62,1.4,y)));
      diffuseColor.rgb*=mix(1.0,0.8,uWet);}` });

  // ---------- casa: paredes (descem 0,8 m para dentro do chão no lado alto), oitões, duas águas de telha, cumeeira,
  // porta de tábuas com batente e soleira, janelas com moldura, peitoril, folhas abertas, vidro em cruz e cortina de chita,
  // lampião na porta, chaminé e, em algumas, varanda. À noite a luz das janelas cai no chão em frente.
  function house(h, { H = 2.8, pitch = 0.42, ov = 0.55, chapel = false } = {}) {
    const g = new THREE.Group(), w = h.w, d = h.d, rh = d / 2 * Math.tan(pitch), trim = col(h.trim), cream = col(0xf1ebde), wood = [], glassL = [], glassD = [], roof = [], walls = [], curt = [], spills = [];
    const ci = Math.floor(rnd() * 4);
    walls.push(box(w, H + 0.8, d, 0, (H + 0.8) / 2 - 0.8, 0, 5));
    const gab = new THREE.BufferGeometry(), gp = [], gu = [];
    for (const sx of [1, -1]) { const x = sx * w / 2, tri = [[x, H, -d / 2], [x, H, d / 2], [x, H + rh, 0]]; if (sx < 0) tri.reverse(); for (const v of tri) { gp.push(...v); gu.push(v[2] / 5, v[1] / 5); } }
    gab.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3)); gab.setAttribute('uv', new THREE.Float32BufferAttribute(gu, 2)); gab.computeVertexNormals(); walls.push(gab);
    const L = (d / 2 + ov) / Math.cos(pitch), rc = col(h.roof);
    const rows = Math.max(4, Math.round(L / 0.36)), rl = L / rows;
    for (const side of [0, 1]) for (let r = 0; r < rows; r++) { const sl = box(w + 2 * ov + (rnd() - 0.5) * 0.06, 0.07, rl * 1.18, 0, 0, 0, 1), uv = sl.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w + 2 * ov) / 1.6 + r * 0.37, uv.getY(i) * rl * 1.18 / 2.1 + r * rl / 2.1);
      const s0 = (r + 0.5) * rl; sl.rotateX(pitch + 0.05 + (rnd() - 0.5) * 0.02).rotateY((rnd() - 0.5) * 0.008).translate((rnd() - 0.5) * 0.04, H + rh - s0 * Math.sin(pitch) + 0.1, s0 * Math.cos(pitch));
      if (side) sl.rotateY(Math.PI); roof.push(paint(sl, rc.clone().multiplyScalar(0.9 + rnd() * 0.18))); }
    roof.push(paint(new THREE.CylinderGeometry(0.14, 0.14, w + 2 * ov, 8).rotateZ(Math.PI / 2).translate(0, H + rh + 0.12, 0), rc.clone().multiplyScalar(0.8)));
    for (let x = -w / 2 - ov + 0.25; x < w / 2 + ov; x += 0.42) roof.push(paint(box(0.05, 0.29, 0.29, x, H + rh + 0.12, 0, 1), col(0xcfae94)));   // argamassa da cumeeira
    for (const sz of [1, -1]) for (let x = -w / 2 - ov + 0.3; x < w / 2 + ov - 0.1; x += 0.6) { const c = box(0.07, 0.09, ov + 0.25, 0, 0, 0, 1); c.rotateX(pitch * sz).translate(x, H - 0.02 - (ov / 2) * Math.tan(pitch), sz * (d / 2 + ov / 2 - 0.05)); wood.push(paint(c, col(0x6a4a34))); }   // caibros
    // peças de fachada montadas num plano local (parede em z=0, para fora +z) e levadas para a parede certa
    const place = (geo, x, y, ry, wx, wz) => geo.translate(x, y, 0).rotateY(ry).translate(wx, 0, wz);
    function windowAt(x, y, ry, wx, wz, ww = 0.8, wh = 0.9) {
      const P = (gg, c, arr = wood) => arr.push(c ? paint(place(gg, x, y, ry, wx, wz), c) : place(gg, x, y, ry, wx, wz));
      const lit = rnd() < 0.75;
      P(box(ww, wh, 0.02, 0, 0, 0.03), null, lit ? glassL : glassD);
      P(box(ww + 0.04, 0.03, 0.03, 0, 0, 0.055, 1), cream); P(box(0.03, wh, 0.03, 0, 0, 0.055, 1), cream);             // vidro em cruz
      for (const s of [-1, 1]) { P(box(0.08, wh + 0.16, 0.13, s * (ww / 2 + 0.04), 0, 0.065, 1), cream); P(box(0.06, wh, 0.1, s * (ww / 2 - 0.03), 0, 0.05, 1), col(0x3a3430)); }   // batente e fundo
      P(box(ww + 0.16, 0.09, 0.13, 0, wh / 2 + 0.04, 0.065, 1), cream); P(box(ww + 0.3, 0.07, 0.2, 0, -wh / 2 - 0.04, 0.1, 1), cream);                   // verga e peitoril
      for (const s of [-1, 1]) { const c = box(ww * 0.36, wh * 0.92, 0.01, s * (ww / 2 - ww * 0.18), 0, 0.042, 1); curt.push(place(c, x, y, ry, wx, wz)); }
      for (const s of [-1, 1]) { const sh = box(ww / 2, wh, 0.05, 0, 0, 0, 1); sh.translate(s * ww / 4, 0, 0).rotateY(s * -1.85).translate(s * (ww / 2 + 0.08), 0, 0.12); P(sh, trim);
        for (let k = -1; k <= 1; k += 2) { const ri = box(ww / 2 - 0.08, 0.04, 0.02, 0, 0, 0, 1); ri.translate(s * ww / 4, k * wh * 0.3, 0.03).rotateY(s * -1.85).translate(s * (ww / 2 + 0.08), 0, 0.12); P(ri, trim.clone().multiplyScalar(0.8)); } }
      if (lit) spills.push([x, ry, wx, wz, 1.6]);
    }
    function doorAt(x, ry, wx, wz, dw = 0.95, dh = 2.1) {
      const P = (gg, c) => wood.push(paint(place(gg, x, 0, ry, wx, wz), c));
      for (let k = 0; k < 4; k++) P(box(dw / 4 - 0.01, dh, 0.06, -dw / 2 + dw / 8 + k * dw / 4, dh / 2, 0.04, 0.6), trim.clone().multiplyScalar(0.9 + 0.12 * ((k * 7) % 3) / 2));
      P(box(dw * 0.8, 0.06, 0.03, 0, dh * 0.3, 0.08, 1), trim.clone().multiplyScalar(0.75)); P(box(dw * 0.8, 0.06, 0.03, 0, dh * 0.75, 0.08, 1), trim.clone().multiplyScalar(0.75));
      P(box(0.05, 0.05, 0.05, dw * 0.35, dh * 0.48, 0.1, 1), col(0x2a2622));
      for (const s of [-1, 1]) P(box(0.1, dh + 0.12, 0.14, s * (dw / 2 + 0.05), dh / 2, 0.07, 1), cream);
      P(box(dw + 0.3, 0.12, 0.15, 0, dh + 0.06, 0.07, 1), cream); P(box(dw + 0.4, 0.14, 0.45, 0, 0.0, 0.2, 1), col(0x9a9488));
      spills.push([x, ry, wx, wz, 2.0]);
      if (!chapel) { const lp = new THREE.Vector3(x + dw / 2 + 0.35, dh + 0.15, 0.22).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry).add(new THREE.Vector3(wx, 0, wz));   // lampião
        P(box(0.04, 0.04, 0.25, dw / 2 + 0.35, dh + 0.35, 0.12, 1), col(0x2a2622)); glassL.push(place(box(0.13, 0.2, 0.13, dw / 2 + 0.35, dh + 0.15, 0.22), x, 0, ry, wx, wz));
        halos.push({ g, p: lp }); }
    }
    if (!chapel) { doorAt(-w * 0.22, 0, 0, d / 2); windowAt(w * 0.12, 1.55, 0, 0, d / 2); windowAt(w * 0.34, 1.55, 0, 0, d / 2);
      windowAt(0, 1.55, Math.PI / 2, w / 2, 0); windowAt(0, 1.55, -Math.PI / 2, -w / 2, 0); windowAt(-w * 0.2, 1.55, Math.PI, 0, -d / 2); windowAt(w * 0.2, 1.55, Math.PI, 0, -d / 2); }
    else { doorAt(0, Math.PI / 2, w / 2, 0, 1.4, 2.9); for (const zs of [1, -1]) for (const xx of [-w * 0.25, w * 0.15]) windowAt(xx * zs, 2.1, zs > 0 ? 0 : Math.PI, 0, zs * d / 2, 0.7, 1.5); windowAt(0, 2.1, -Math.PI / 2, -w / 2, 0, 0.7, 1.5); }
    if (!chapel) { walls.push(box(0.55, rh + 1.4, 0.55, w / 2 - 0.9, H + (rh + 1.4) / 2 - 0.2, -d / 4, 2.5)); wood.push(paint(box(0.7, 0.12, 0.7, w / 2 - 0.9, H + rh + 1.25, -d / 4, 1), col(0x5a4a40)));
      smokeSrc.push({ g, local: V3(w / 2 - 0.9, H + rh + 1.35, -d / 4), on: h.smoke !== false }); }
    if (h.porch) { const pw = w * 0.62, pz = d / 2 + 2.0;
      const pr = box(pw + 0.4, 0.09, 2.3, 0, 0, 0, 1); const uv = pr.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 1.6, uv.getY(i) / 2.1);
      roof.push(paint(pr.rotateX(0.24).translate(-w * 0.1, H - 0.32, d / 2 + 1.1), rc));
      for (const px of [-pw / 2, 0, pw / 2]) wood.push(paint(new THREE.CylinderGeometry(0.07, 0.08, H - 0.55, 8).translate(px - w * 0.1, (H - 0.55) / 2, pz), col(0x7a5a3e)));
      wood.push(paint(box(pw + 0.3, 0.18, 2.3, -w * 0.1, 0.06, d / 2 + 1.1, 1), col(0xa8503a))); }
    if (chapel) {   // capela: óculo no oitão da frente (+x), torre do sino ao lado com telhado em pirâmide e cruz
      glassL.push(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 16).rotateZ(Math.PI / 2).translate(w / 2 + 0.03, H + rh * 0.45, 0));
      const tx = w / 2 - 1.2, tz = -(d / 2 + 1.15), th = 9.2; walls.push(box(2.3, th + 0.8, 2.3, tx, (th + 0.8) / 2 - 0.8, tz, 5));
      for (const [ox, oz, ry] of [[1.16, 0, Math.PI / 2], [-1.16, 0, -Math.PI / 2], [0, 1.16, 0], [0, -1.16, Math.PI]]) wood.push(paint(box(0.8, 1.3, 0.05, 0, 0, 0, 1).rotateY(ry).translate(tx + ox, th - 1.3, tz + oz), col(0x2a2622)));
      roof.push(paint(new THREE.ConeGeometry(1.85, 2.3, 4, 1).rotateY(Math.PI / 4).translate(tx, th + 1.15, tz), rc));
      wood.push(paint(box(0.1, 1.1, 0.1, tx, th + 2.8, tz, 1), col(0xe8d070)), paint(box(0.1, 0.1, 0.6, tx, th + 3.0, tz, 1), col(0xe8d070))); }
    const wm = wallMat(h.wall, h.band, H, w, d), add = (gs, m, k) => { if (!gs.length) return; const geo = merge(gs, k); geo.computeVertexNormals(); const me = new THREE.Mesh(geo, m); me.castShadow = me.receiveShadow = true; g.add(me); };
    add(walls, wm, ['position', 'uv']); add(roof, roofMat, ['position', 'uv', 'color']); add(wood, woodMat, ['position', 'uv', 'color']); add(glassL, glowMat, ['position']); add(glassD, glassDark, ['position']);
    add(curt, curtainMats[ci], ['position', 'uv']);
    g.position.set(h.p[0], groundY(h.p, w, d, h.rot), h.p[1]); g.rotation.y = h.rot; scene.add(g); g.updateMatrixWorld(true);
    for (const [x, ry, wx, wz, s] of spills) { const c = new THREE.Vector3(x, 0, 0.15 + s * 0.45).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry).add(new THREE.Vector3(wx, 0, wz));
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(s, s * 0.9).rotateX(-Math.PI / 2).rotateY(ry), spillMat); pl.position.set(c.x, groundAt(g, c.x, c.z) + 0.04, c.z); pl.renderOrder = 4; pl.userData.noRegua = true; g.add(pl); }
    tag(g, chapel ? 'capela (com a torre)' : 'casa');
    return g;
  }
  for (const h of LAYOUT.houses) house(h);
  const C = LAYOUT.chapel; house({ p: C.p, rot: C.rot, w: 8.5, d: 5.4, wall: 0xf6f2ea, band: 0x2f5fa8, trim: 0x2f5fa8, roof: 0xb0553a }, { H: 4.2, pitch: 0.5, chapel: true });
  // halo dos lampiões (aceso ao entardecer)
  const haloMat = new THREE.SpriteMaterial({ map: haloTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 });
  for (const hl of halos) { const sp = new THREE.Sprite(haloMat); sp.scale.setScalar(1.3); sp.position.copy(hl.p); hl.g.add(sp); }
  updaters.push(() => { const n = Math.pow(1 - U.uDay.value, 1.5); haloMat.opacity = n * 0.9; for (const m of curtainMats) m.emissiveIntensity = n * 0.55; });

  // ---------- poço: anel de pedra, água escura lá no fundo, dois esteios, sarilho e telhadinho
  { const W = LAYOUT.well, g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.9, 1.6, 18, 1, true).translate(0, 0.0, 0), stoneMat), inner = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.5, 18, 1, true), stoneMat);
    ring.material = stoneMat; inner.geometry.scale(-1, 1, 1); const top = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.9, 18).rotateX(-Math.PI / 2).translate(0, 0.8, 0), stoneMat);
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.7, 18).rotateX(-Math.PI / 2).translate(0, -0.4, 0), new THREE.MeshBasicMaterial({ color: 0x0d2a2c }));
    const wood = merge([paint(box(0.14, 2.0, 0.14, -0.95, 1.0, 0, 1), col(0x7a5a3e)), paint(box(0.14, 2.0, 0.14, 0.95, 1.0, 0, 1), col(0x7a5a3e)),
      paint(new THREE.CylinderGeometry(0.07, 0.07, 1.9, 8).rotateZ(Math.PI / 2).translate(0, 1.55, 0), col(0x8a6a4a)), paint(box(0.3, 0.32, 0.3, 0.1, 1.15, 0, 1), col(0x6a6a70))]);
    const rf = merge([paint(box(2.5, 0.07, 0.9, 0, 0, 0, 1).rotateX(0.55).translate(0, 2.05, 0.36), col(0xb4563a)), paint(box(2.5, 0.07, 0.9, 0, 0, 0, 1).rotateX(-0.55).translate(0, 2.05, -0.36), col(0xb4563a))]);
    g.add(ring, inner, top, water, new THREE.Mesh(wood, woodMat), new THREE.Mesh(rf, roofMat)); g.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
    g.position.set(W.p[0], heightAt(W.p[0], W.p[1]) + 0.0, W.p[1]); g.rotation.y = 0.4; scene.add(g); tag(g, 'poço'); }

  // ---------- cercas: esteios a cada ~2,2 m seguindo o chão, duas ou três réguas um pouco tortas; uma porteira aberta
  function fence(pts, { name = '', closed = true, gate = -1, posts = 1.35, rails = [0.5, 0.95], step = 2.2, color = 0x9a8470 } = {}) {
    const geos = [], P = [];
    const segs = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < segs; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
      for (let k = 0; k < n; k++) P.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); }
    if (!closed) P.push(pts[pts.length - 1]);
    const Y = P.map(([x, z]) => heightAt(x, z));
    P.forEach(([x, z], i) => { const h = posts * (0.92 + rnd() * 0.16); geos.push(paint(box(0.13, h + 0.4, 0.13, x, Y[i] + (h - 0.4) / 2, z, 1).rotateY(0), col(color).multiplyScalar(0.85 + rnd() * 0.2))); });
    const last = closed ? P.length : P.length - 1;
    for (let i = 0; i < last; i++) { if (i === gate) continue; const [ax, az] = P[i], [bx, bz] = P[(i + 1) % P.length], ya = Y[i], yb = Y[(i + 1) % P.length], L = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bz - az, bx - ax);
      for (const r of rails) { const g = box(L + 0.2, 0.09, 0.05, 0, 0, 0, 1); g.rotateZ(Math.atan2(yb - ya, L) + (rnd() - 0.5) * 0.04).rotateY(-ang).translate((ax + bx) / 2, (ya + yb) / 2 + r + (rnd() - 0.5) * 0.05, (az + bz) / 2);
        geos.push(paint(g, col(color).multiplyScalar(0.9 + rnd() * 0.2))); } }
    const m = new THREE.Mesh(merge(geos), woodMat); m.castShadow = m.receiveShadow = true; scene.add(m);
    if (name) { const base = Y.reduce((a, b) => a + b, 0) / Y.length, gr = new THREE.Group(); gr.position.y = base; scene.add(gr); scene.remove(m); m.position.y = -base; gr.add(m); tag(gr, name); }
    return P;
  }
  const rectPts = (o, w, d, rot) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => { const x = u * w / 2, z = v * d / 2, c = Math.cos(rot), s = Math.sin(rot); return [o[0] + x * c + z * s, o[1] - x * s + z * c]; });
  // curral no pasto, com cocho de madeira
  { const Cr = LAYOUT.corral; fence(rectPts(Cr.p, Cr.w, Cr.d, Cr.rot), { name: 'cerca do curral', gate: 1, rails: [0.45, 0.85, 1.2], posts: 1.5 });
    const c = Math.cos(Cr.rot), s = Math.sin(Cr.rot), lx = -Cr.w * 0.28, lz = -Cr.d * 0.3, x = Cr.p[0] + lx * c + lz * s, z = Cr.p[1] - lx * s + lz * c;
    const cocho = new THREE.Group(); cocho.add(new THREE.Mesh(merge([paint(box(2.6, 0.12, 0.7, 0, 0.5, 0, 1), col(0x8a6a4a)), paint(box(2.6, 0.45, 0.08, 0, 0.72, 0.33, 1), col(0x8a6a4a)), paint(box(2.6, 0.45, 0.08, 0, 0.72, -0.33, 1), col(0x8a6a4a)),
      paint(box(0.08, 0.45, 0.7, 1.28, 0.72, 0, 1), col(0x8a6a4a)), paint(box(0.08, 0.45, 0.7, -1.28, 0.72, 0, 1), col(0x8a6a4a)), paint(box(0.12, 0.5, 0.12, 1.1, 0.25, 0.25, 1), col(0x6a4a3a)), paint(box(0.12, 0.5, 0.12, -1.1, 0.25, -0.25, 1), col(0x6a4a3a))]), woodMat),
      new THREE.Mesh(new THREE.PlaneGeometry(2.45, 0.55).rotateX(-Math.PI / 2).translate(0, 0.86, 0), mat({ color: 0xc9b25a })));
    cocho.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); cocho.position.set(x, heightAt(x, z), z); cocho.rotation.y = Cr.rot; scene.add(cocho); }
  // horta cercada de varas, com canteiros de terra e couves, alfaces e cebolinhas
  { const Gd = LAYOUT.garden; fence(rectPts(Gd.p, Gd.w, Gd.d, Gd.rot), { name: 'cerca da horta', gate: 2, rails: [0.3, 0.6, 0.85], posts: 1.0, step: 1.0, color: 0xa89474 });
    const beds = [], plants = [], c = Math.cos(Gd.rot), s = Math.sin(Gd.rot), y0 = heightAt(Gd.p[0], Gd.p[1]);
    for (let b = 0; b < 3; b++) { const lx = -Gd.w / 2 + 0.95 + b * 1.55; beds.push(paint(box(1.0, 0.25, Gd.d - 1.0, lx, 0.05, 0, 1), col(0x6e4630)));
      for (let k = 0; k < 6; k++) plants.push([lx + (rnd() - 0.5) * 0.4, -Gd.d / 2 + 0.85 + k * (Gd.d - 1.7) / 5, b]); }
    const bm = new THREE.Mesh(merge(beds), woodMat); bm.receiveShadow = true;
    const leaf = new THREE.IcosahedronGeometry(1, 1), lm = mat({ color: 0xffffff }), inst = new THREE.InstancedMesh(leaf, lm, plants.length), M = new THREE.Matrix4();
    plants.forEach(([x, z, b], i) => { const r = b === 1 ? 0.2 : 0.26; M.compose(V3(x, 0.25 + r * 0.4, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rnd() * 6, 0)), V3(r, r * (b === 1 ? 0.6 : 0.85), r)); inst.setMatrixAt(i, M);
      inst.setColorAt(i, col([0x5f9a3a, 0x9ccb52, 0x4f8a5a][b]).multiplyScalar(0.85 + rnd() * 0.3)); });
    inst.castShadow = inst.receiveShadow = true; const g = new THREE.Group(); g.add(bm, inst); g.position.set(Gd.p[0], y0, Gd.p[1]); g.rotation.y = Gd.rot; scene.add(g); }

  // ---------- plantas da lavoura (instanciadas): balançam com a rajada do lugar, secam na seca
  const plantMat = (H, dry) => mat({ vertexColors: true, side: THREE.DoubleSide }, { vdecl: NOISE + WIND + `uniform float uSeca;`, uni: { uPlantH: { value: H } },
    vert: `{vec3 ip=(modelMatrix*instanceMatrix*vec4(0.0,0.0,0.0,1.0)).xyz;float gg=gustAt(ip.xz);float q=windQ(max(0.0,uWindBase*(1.0+uWindIu*gg)));
      float hh=clamp(position.y/${H.toFixed(2)},0.0,1.0);float bend=(0.13*q+0.04*q*sin(uTime*2.1+ip.x*1.7+ip.z*1.3)+0.01*sin(uTime*1.3+ip.z))*hh*hh*${H.toFixed(2)};
      vec3 dw=vec3(uWindDir.x,0.0,uWindDir.y)*bend+vec3(sin(uTime*7.0+position.x*9.0+ip.x),0.0,cos(uTime*6.0+position.z*9.0+ip.z))*0.015*hh*(0.3+q);
      transformed+=inverse(mat3(instanceMatrix))*dw;}`,
    frag: `{float l=dot(diffuseColor.rgb,vec3(0.3,0.5,0.2));diffuseColor.rgb=mix(diffuseColor.rgb,toLin(vec3(0.78,0.66,0.42))*(l*2.2+0.25),uSeca*${dry.toFixed(2)});}` });
  // milho: colmo, folhas compridas em arco alternadas, pendão no alto e uma espiga
  function cornGeo() { const H = 2.1, parts = [paint(new THREE.CylinderGeometry(0.016, 0.028, H, 5, 3).translate(0, H / 2, 0), col(0x7fae46))];
    for (let i = 0; i < 7; i++) { const y = 0.35 + i * 0.22, L = 0.85 - Math.abs(i - 2.5) * 0.07, a = i * Math.PI * 0.95 + (rnd() - 0.5) * 0.5, seg = 5, pos = [], cl = [], idx = [];
      for (let k = 0; k <= seg; k++) { const t = k / seg, x = t * L, yy = 0.38 * L * t - 0.55 * L * t * t, w = 0.045 * (1 - t * 0.9) + 0.008;
        pos.push(x, yy, -w, x, yy + 0.01, w); const c = col(0x4f8a2e).lerp(col(0x9cc85a), t * 0.8); cl.push(c.r, c.g, c.b, c.r, c.g, c.b); }
      for (let k = 0; k < seg; k++) idx.push(k * 2, k * 2 + 2, k * 2 + 1, k * 2 + 1, k * 2 + 2, k * 2 + 3);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3)); g.setIndex(idx);
      g.rotateY(a).translate(0, y, 0); g.computeVertexNormals(); const nn = g.attributes.normal; for (let k = 0; k < nn.count; k++) nn.setXYZ(k, 0.25 * Math.cos(a), 1, 0.25 * -Math.sin(a)); parts.push(g); }
    for (let i = 0; i < 5; i++) parts.push(paint(new THREE.PlaneGeometry(0.02, 0.32).translate(0, 0.16, 0).rotateZ(0.5 + rnd() * 0.3).rotateY(i * 1.26).translate(0, H - 0.02, 0), col(0xd8b46a)));
    parts.push(paint(new THREE.CylinderGeometry(0.03, 0.045, 0.24, 6).rotateZ(-0.35).translate(0.05, 1.12, 0), col(0xa9c26a)), paint(new THREE.ConeGeometry(0.03, 0.08, 5).rotateZ(-0.35).translate(0.1, 1.26, 0), col(0x9a5a3a)));
    return merge(parts.map(p => { if (!p.attributes.uv) p.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(p.attributes.position.count * 2), 2)); if (!p.attributes.normal) p.computeVertexNormals(); return p; })); }
  // girassol: haste, folhas em coração caídas e a flor virada para o nascente (leste, +x), meio inclinada
  function sunGeo() { const H = 1.75, parts = [paint(new THREE.CylinderGeometry(0.018, 0.03, H, 5, 3).translate(0, H / 2, 0), col(0x6f9a3c))];
    const heart = new THREE.Shape(); heart.moveTo(0, 0); heart.bezierCurveTo(0.14, 0.02, 0.16, 0.16, 0.0, 0.3); heart.bezierCurveTo(-0.16, 0.16, -0.14, 0.02, 0, 0);
    for (let i = 0; i < 6; i++) { const g = new THREE.ShapeGeometry(heart, 4); g.rotateX(-Math.PI / 2 + 0.5).rotateY(i * 2.4).translate(0, 0.4 + i * 0.2, 0); parts.push(paint(g, col(0x4f7f2e).lerp(col(0x7aa840), i / 6))); }
    const head = [paint(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 16), col(0x5a3a1e)), paint(new THREE.CylinderGeometry(0.06, 0.13, 0.06, 16).translate(0, -0.05, 0), col(0x6f9a3c))];
    for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2, p = new THREE.PlaneGeometry(0.07, 0.15).translate(0, 0.07, 0).rotateX(-Math.PI / 2 + 0.25).rotateY(-a + Math.PI / 2).translate(Math.cos(a) * 0.13, 0.02, -Math.sin(a) * 0.13);
      head.push(paint(p, col(i % 2 ? 0xffc21a : 0xf6a91a))); }
    const hg = merge(head.map(p => { p.computeVertexNormals(); return p; })); hg.rotateZ(-1.1).translate(0.1, H + 0.02, 0); parts.push(hg);
    return merge(parts.map(p => { if (!p.attributes.uv) p.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(p.attributes.position.count * 2), 2)); if (!p.attributes.normal) p.computeVertexNormals(); return p; })); }
  { const F = LAYOUT.field, t = F.tile, corn = [], sun = [];
    for (let x = Math.ceil((t.c[0] - 18) / F.rowGap) * F.rowGap; x < t.c[0] + 18; x += F.rowGap) for (let z = t.c[1] - 20; z < t.c[1] + 20; z += 0.5) {
      const lx = x - t.c[0], zz = z + (rnd() - 0.5) * 0.15; if (hexEdgeDist(x, zz, t.c) < 1.2 || blocked(x, zz, 0.6)) continue;
      if (lx < F.cornMaxX) corn.push([x + (rnd() - 0.5) * 0.08, zz]); else if (lx > F.sunMinX && lx < F.sunMaxX && Math.round(z / 0.5) % 2 === 0) sun.push([x, zz]); }
    if (mobile) for (let i = corn.length - 1; i > 0; i -= 3) corn.splice(i, 1);
    const M = new THREE.Matrix4(), q = new THREE.Quaternion();
    const inst = (geo, m, list, yaw, sc) => { const im = new THREE.InstancedMesh(geo, m, list.length);
      list.forEach(([x, z], i) => { q.setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.08, yaw(), (rnd() - 0.5) * 0.08)); const s = sc(); M.compose(V3(x, heightAt(x, z) - 0.05, z), q, V3(s, s, s)); im.setMatrixAt(i, M); });
      im.castShadow = !mobile; im.receiveShadow = true; scene.add(im); return im; };
    tag(inst(cornGeo(), plantMat(2.1, 0.95), corn, () => rnd() * 6.28, () => 0.85 + rnd() * 0.3), 'milho', 1);
    tag(inst(sunGeo(), plantMat(1.75, 0.8), sun, () => (rnd() - 0.5) * 0.5, () => 0.85 + rnd() * 0.3), 'girassol', 1); }

  // ---------- moinho: torre caiada, chapéu que gira para encarar o vento e quatro pás de lona; a velocidade segue o vento
  { const Mp = LAYOUT.mill.p, g = new THREE.Group(), y0 = heightAt(Mp[0], Mp[1]) - 0.1, Ht = 7.2;
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 2.05, Ht + 0.8, 16, 1, true).translate(0, (Ht + 0.8) / 2 - 0.8, 0), wallMat(0xf2ede4, 0x8a6a52, 99, 999, 999));
    { const uv = tower.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 4, uv.getY(i) * 3); }
    const tw = merge([paint(box(0.9, 1.9, 0.1, 0, 0.95, 1.98, 1).rotateX(-0.08), col(0x7a4a2a)), paint(box(0.5, 0.6, 0.1, 0, 4.6, 1.66, 1).rotateX(-0.08), col(0x2f6aa0))]);
    g.add(tower, new THREE.Mesh(tw, woodMat));
    const cap = new THREE.Group(); cap.position.y = Ht; g.add(cap);
    cap.add(new THREE.Mesh(merge([paint(new THREE.ConeGeometry(1.75, 1.9, 16, 1).translate(0, 0.95, 0), col(0x8a5a3a)), paint(new THREE.CylinderGeometry(1.6, 1.6, 0.35, 16).translate(0, 0.1, 0), col(0x6a4a34))]), roofMat));
    const rotor = new THREE.Group(); rotor.position.set(0, 0.6, 1.75); cap.add(rotor);
    const sails = [paint(new THREE.CylinderGeometry(0.18, 0.22, 0.6, 10).rotateX(Math.PI / 2), col(0x5a4030))], cloth = [];
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, spar = box(0.13, 4.6, 0.13, 0, 2.3, 0.08, 1); spar.rotateZ(a); sails.push(paint(spar, col(0x7a5a3e)));
      for (let k = 0; k < 6; k++) { const bar = box(1.0, 0.06, 0.06, 0.55, 1.15 + k * 0.6, 0.12, 1); bar.rotateZ(a); sails.push(paint(bar, col(0x8a6a4a))); }
      const cl = new THREE.PlaneGeometry(0.95, 3.3, 1, 4).translate(0.56, 2.65, 0.16); const p = cl.attributes.position; for (let k = 0; k < p.count; k++) p.setZ(k, p.getZ(k) + 0.06 * Math.sin((p.getX(k) - 0.08) / 0.95 * Math.PI)); cl.rotateZ(a); cloth.push(cl); }
    rotor.add(new THREE.Mesh(merge(sails), woodMat), new THREE.Mesh(merge(cloth.map(c => { c.computeVertexNormals(); return c; }), ['position', 'normal', 'uv']), mat({ color: 0xf2e9d6, side: THREE.DoubleSide }, { frag: 'diffuseColor.rgb*=mix(1.0,0.8,uWet);', rim: '2.0' })));
    g.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); g.position.set(Mp[0], y0, Mp[1]); scene.add(g); tag(g, 'moinho (com as pás)');
    let w = 0, yaw = 0; updaters.push(dt => { const wd = U.uWindDir.value, target = Math.atan2(-wd.x, -wd.y); let dy = target - yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); yaw += dy * Math.min(1, dt * 0.25); cap.rotation.y = yaw;
      const u = U.uWindBase.value, tgt = u < 2.2 || u >= 11 ? 0 : 2 * u / 4.4; /* como o motor Atmos: arranca com 2,2 m/s, razão de velocidade 2, recolhe as pás a 11 m/s */ w += (tgt - w) * Math.min(1, dt * 0.35); rotor.rotation.z -= w * dt; }); }

  // ---------- fumaça das chaminés: bolinhas que sobem, crescem, clareiam e o vento leva
  { const N = 26, src = smokeSrc.filter(s => s.on), base = [], seed = [];
    scene.updateMatrixWorld(true);
    for (const s of src) { const p = s.local.clone().applyMatrix4(s.g.matrixWorld); for (let i = 0; i < N; i++) { base.push(p.x, p.y, p.z); seed.push(i / N + rnd() * 0.02); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(base, 3)); g.setAttribute('seed', new THREE.Float32BufferAttribute(seed, 1));
    const sm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uPx: { value: 600 }, uSmoke: { value: 1 } },
      vertexShader: `attribute float seed;uniform float uTime,uWindBase,uPx,uRain,uSmoke;uniform vec2 uWindDir;varying float vA;varying float vAge;
        void main(){float life=9.0;float a=fract(uTime/life+seed);vec3 p=position+vec3(0.0,a*5.5*(1.0-0.4*uRain),0.0);
          p.xz+=uWindDir*uWindBase*0.5*a*life*0.55+vec2(sin(seed*40.0+uTime*0.7),cos(seed*31.0+uTime*0.6))*a*0.7;
          vec4 mv=viewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=(0.35+a*(1.4+1.6*uSmoke))*uPx/max(1.0,-mv.z);
          vA=(1.0-a)*smoothstep(0.0,0.06,a)*0.75*uSmoke;vAge=a;}`,
      fragmentShader: `uniform float uDay;uniform vec3 uSunC;varying float vA;varying float vAge;
        void main(){vec2 c=gl_PointCoord-0.5;float d=length(c);if(d>0.5)discard;float lit=step(0.0,-c.y+c.x*0.3);
          vec3 cc=mix(vec3(0.62,0.62,0.66),vec3(0.95,0.94,0.92),0.5+0.5*lit)*(0.22+0.78*uDay);gl_FragColor=vec4(cc,vA*(1.0-smoothstep(0.25,0.5,d)));
          #include <colorspace_fragment>
        }` });
    Object.assign(sm.uniforms, U, { uPx: sm.uniforms.uPx, uSmoke: sm.uniforms.uSmoke }); const pts = new THREE.Points(g, sm); pts.frustumCulled = false; pts.renderOrder = 6; scene.add(pts);
    updaters.push((dt, ctx) => { sm.uniforms.uPx.value = ctx.pxPerUnit; const h = ctx.hour ?? 15, b = (c, w) => Math.exp(-(((h - c) / w) ** 2));
      sm.uniforms.uSmoke.value = (0.22 + 0.78 * Math.max(b(6.8, 1.1), b(11.4, 0.7), b(18.2, 1.2), h > 19.5 || h < 5.5 ? 0.35 : 0)) * (1 - 0.4 * U.uRain.value); }); }   // café da manhã, almoço e janta no fogão a lenha

  return { update(dt, ctx) { glowMat.emissiveIntensity = Math.pow(1 - U.uDay.value, 1.5) * 1.8 + U.uRain.value * 0.2 * (1 - U.uDay.value); for (const f of updaters) f(dt, ctx); },
    smokeOK: smokeSrc.length };
}

export { mat, paint, merge, box, col, V3 };
