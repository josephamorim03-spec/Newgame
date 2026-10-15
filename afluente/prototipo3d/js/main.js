// Afluente · prévia 3D, no espírito de Zelda: Breath of the Wild. A física é de verdade (o sol na latitude do Cerrado,
// vento médio com rajadas que andam com o ar, chuva, umidade, seca, tudo do motor Atmos do jogo), mas o desenho é
// pintado: luz em faixas suaves, sombras azuladas pela luz do céu, brilho de contorno contra o sol, cores vivas,
// céu com nuvens fofas e a névoa azul que deixa o longe azulado.
import * as THREE from 'three';
import { OrbitControls } from './addons/OrbitControls.js';
import { mergeGeometries } from './addons/BufferGeometryUtils.js';
import { NOISE, WIND, CLOUDS } from './glsl.js';
import { U, HEAD, LIGHT_END, shared, ramp, toon } from './mat.js';
import { R, TILES, CENTER, RIVER, riverHalfWidth, heightAt, riverInfo, waterDist, biomeAt, SPRING, POOL_R, WATER_Y, vnoise, inHex, inAnyTile, dirtAt, fieldAt, blocked } from './world.js';
import { buildProps } from './props.js';
import { leafTexture, fanTexture, barkTexture, earthTexture, stoneTexture } from './textures.js';

const ATM = window.ATM;
const $ = id => document.getElementById(id);
const rnd = (() => { let a = 1234567; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();

// ---------- renderizador, cena, câmera
const mobile = matchMedia('(pointer:coarse)').matches;
const renderer = new THREE.WebGLRenderer({ canvas: $('cena'), antialias: true, powerPreference: 'high-performance' });
let dpr = Math.min(devicePixelRatio || 1, mobile ? 1.6 : 2);
renderer.setPixelRatio(dpr);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping;           // cores como foram pintadas (sem o "filme" realista)
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xa9cfe6, 0.0026);
const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 9000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(CENTER[0], 3, CENTER[1]);
camera.position.set(CENTER[0] + 14, 44, CENTER[1] + 104);
// celular em pé: a câmera sobe e se afasta para as 4 peças caberem na largura estreita
if (innerWidth < innerHeight) { controls.target.set(CENTER[0] - 8, 4, CENTER[1] - 4); camera.position.set(CENTER[0] + 16, 62, CENTER[1] + 92); }
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.minDistance = 16; controls.maxDistance = 220; controls.minPolarAngle = 0.3; controls.maxPolarAngle = 1.42;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
const reflRT = new THREE.WebGLRenderTarget(2, 2, { colorSpace: THREE.SRGBColorSpace });   // reflexo da água (ver mais abaixo)
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); reflRT.setSize(Math.ceil(w * dpr * (mobile ? 0.35 : 0.5)), Math.ceil(h * dpr * (mobile ? 0.35 : 0.5))); camera.aspect = w / h; camera.fov = w < h ? 50 : 38; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

const HEXF = `float hexEdge(vec2 p){float R=${R.toFixed(1)};float q=(0.57735*p.x-0.33333*p.y)/R,r=0.66667*p.y/R;float s=-q-r;
  float rq=floor(q+0.5),rr=floor(r+0.5),rs=floor(s+0.5);float dq=abs(rq-q),dr=abs(rr-r),ds=abs(rs-s);
  if(dq>dr&&dq>ds)rq=-rr-rs;else if(dr>ds)rr=-rq-rs;
  vec2 c=vec2(R*1.73205*(rq+rr*0.5),R*1.5*rr);vec2 d=abs(p-c);return R*0.866-max(d.x,d.x*0.5+d.y*0.866);}\n`;

// ---------- céu pintado: degradê do zênite ao horizonte, brilho em volta do sol, nuvens fofas em duas camadas e estrelas
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: false, uniforms: {},
  vertexShader: `varying vec3 vDir;void main(){vDir=normalize(position);vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_Position=p.xyww;gl_Position.z=gl_Position.w*0.99999;}`,
  fragmentShader: `varying vec3 vDir;\n${HEAD}\nvoid main(){vec3 d=normalize(vDir);float h=d.y;
    vec3 col=mix(uSkyHor,uSkyZen,pow(clamp(h,0.0,1.0),0.55));col=mix(col,uSkyHor*0.92,1.0-smoothstep(-0.25,0.0,h));
    float sd=max(dot(d,uSunW),0.0);col+=uSunC*(pow(sd,8.0)*0.35+pow(sd,90.0)*0.6)*uDay;col+=uSunC*smoothstep(0.9995,0.99975,sd)*2.0*uDay;
    if(h>0.0){vec2 p=d.xz/(h+0.08)*900.0+uCloudOff*0.6;float n=fbm2(p*0.0012)*0.7+fbm2(p*0.004)*0.3;float c=smoothstep(1.0-uCloudCov*0.9,1.12-uCloudCov*0.9,n);
      float lit=smoothstep(0.0,0.35,fbm2(p*0.0024+uSunW.xz*1.5)-0.3+uSunW.y*0.4);vec3 cc=mix(uSkyHor*0.82+vec3(0.04),vec3(1.0)*(0.55+0.45*uDay)+uSunC*0.25,lit);
      cc=mix(cc,cc*0.62,uRain);col=mix(col,cc,c*smoothstep(0.0,0.12,h)*(1.0-0.35*smoothstep(0.6,1.0,h)));
      float st=step(0.9985,hash21(floor(d.xz/(h+0.3)*900.0)));col+=vec3(st)*(1.0-uDay)*(1.0-c)*0.9;}
    gl_FragColor=vec4(col,1.0);
    #include <colorspace_fragment>
  }` });
Object.assign(skyMat.uniforms, U);
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(5000, 48, 24), skyMat); skyDome.renderOrder = -10; skyDome.frustumCulled = false; scene.add(skyDome);

// ---------- luz
const sun = new THREE.DirectionalLight(0xffffff, 3); sun.castShadow = true;
sun.shadow.mapSize.set(mobile ? 1536 : 2048, mobile ? 1536 : 2048);
Object.assign(sun.shadow.camera, { left: -58, right: 58, top: 58, bottom: -58, near: 1, far: 420 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.05; sun.shadow.radius = 4;
sun.target.position.set(CENTER[0], 0, CENTER[1]); scene.add(sun, sun.target);
const moon = new THREE.DirectionalLight(0x8fa8ff, 0); moon.position.set(CENTER[0] - 60, 120, CENTER[1] - 40); moon.target = sun.target; scene.add(moon);
const skyLight = new THREE.HemisphereLight(0x8fbfff, 0x6b5a3a, 1.4); scene.add(skyLight);

// ---------- chão: as 4 peças e o cerrado em volta (que some na névoa azul)
function sectorGrid(c, N) {
  const V = [], pos = [], idx = []; for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); V.push([c[0] + R * Math.cos(a), c[1] + R * Math.sin(a)]); }
  for (let s = 0; s < 6; s++) { const A = V[s], B = V[(s + 1) % 6], map = [];
    for (let a = 0; a <= N; a++) { map[a] = []; for (let b = 0; b <= N - a; b++) { map[a][b] = pos.length / 3; pos.push(c[0] + (A[0] - c[0]) * a / N + (B[0] - c[0]) * b / N, 0, c[1] + (A[1] - c[1]) * a / N + (B[1] - c[1]) * b / N); } }
    for (let a = 0; a < N; a++) for (let b = 0; b < N - a; b++) { idx.push(map[a][b], map[a][b + 1], map[a + 1][b]); if (b < N - a - 1) idx.push(map[a + 1][b], map[a][b + 1], map[a + 1][b + 1]); } }
  return { pos, idx };
}
function latticeGeometry(r0, r1, step, keepTri) {
  const pos = [], idx = [], id = new Map(), hs = step * 0.866, n = Math.ceil(r1 / step) + 1, m = Math.ceil(r1 / hs) + 1;
  const vid = (i, j) => { const k = i * 10007 + j; if (id.has(k)) return id.get(k); id.set(k, pos.length / 3); pos.push(CENTER[0] + i * step + (j & 1) * step / 2, 0, CENTER[1] + j * hs); return id.get(k); };
  for (let j = -m; j < m; j++) for (let i = -n; i < n; i++) {
    const tris = (j & 1) ? [[[i, j], [i + 1, j + 1], [i + 1, j]], [[i, j], [i, j + 1], [i + 1, j + 1]]] : [[[i, j], [i, j + 1], [i + 1, j]], [[i + 1, j], [i, j + 1], [i + 1, j + 1]]];
    for (const T of tris) { const P = T.map(([a, b]) => [CENTER[0] + a * step + (b & 1) * step / 2, CENTER[1] + b * hs]), cx = (P[0][0] + P[1][0] + P[2][0]) / 3, cz = (P[0][1] + P[1][1] + P[2][1]) / 3, d = Math.hypot(cx - CENTER[0], cz - CENTER[1]);
      if (d < r0 || d > r1 || !keepTri(P)) continue; idx.push(vid(...T[0]), vid(...T[1]), vid(...T[2])); } }
  return { pos, idx };
}
function finishGround(pos, idx, out, drop) {
  for (let t = 0; t < idx.length; t += 3) { const A = idx[t] * 3, B = idx[t + 1] * 3, C = idx[t + 2] * 3;   // virados para cima
    if ((pos[C] - pos[A]) * (pos[B + 2] - pos[A + 2]) - (pos[B] - pos[A]) * (pos[C + 2] - pos[A + 2]) < 0) { const k = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = k; } }
  const n = pos.length / 3, nor = new Float32Array(n * 3), bio = new Float32Array(n * 4), ex = new Float32Array(n * 2), wd = new Float32Array(n), ou = new Float32Array(n).fill(out), e = 0.35;
  for (let i = 0; i < n; i++) { const x = pos[i * 3], z = pos[i * 3 + 2]; pos[i * 3 + 1] = heightAt(x, z) - drop;
    const hx = heightAt(x + e, z) - heightAt(x - e, z), hz = heightAt(x, z + e) - heightAt(x, z - e), v = new THREE.Vector3(-hx, 2 * e, -hz).normalize();
    nor.set([v.x, v.y, v.z], i * 3); bio.set(biomeAt(x, z), i * 4); wd[i] = waterDist(x, z); if (!out) ex.set([fieldAt(x, z), dirtAt(x, z)], i * 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('bio', new THREE.BufferAttribute(bio, 4)); g.setAttribute('wd', new THREE.BufferAttribute(wd, 1)); g.setAttribute('ou', new THREE.BufferAttribute(ou, 1)); g.setAttribute('ex', new THREE.BufferAttribute(ex, 2)); g.setIndex(idx); return g;
}
const groundMat = toon();
groundMat.onBeforeCompile = sh => { shared(sh); sh.uniforms.uCenter = { value: new THREE.Vector2(CENTER[0], CENTER[1]) };
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 bio;attribute vec2 ex;attribute float wd;attribute float ou;varying vec4 vBio;varying vec2 vEx;varying float vWd;varying vec3 vWp;varying float vOu;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBio=bio;vEx=ex;vWd=wd;vOu=ou;vWp=(modelMatrix*vec4(transformed,1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec4 vBio;varying vec2 vEx;varying float vWd;varying vec3 vWp;varying float vOu;uniform vec2 uCenter;float vHaze;\n' + HEAD + HEXF)
    .replace('#include <color_fragment>', /* glsl */`
      vec2 p=vWp.xz;float n1=fbm(p*0.05),n2=fbm(p*0.4+3.1),n3=vnoise(p*2.4);
      // pasto: verde-amarelado vivo, com manchas mais escuras e mais claras (como pinceladas)
      vec3 grass=mix(vec3(0.34,0.56,0.13),vec3(0.56,0.73,0.22),n1);grass=mix(grass,vec3(0.26,0.46,0.10),smoothstep(0.55,0.75,fbm(p*0.18+5.0))*0.55);
      grass=mix(grass,mix(vec3(0.62,0.52,0.24),vec3(0.75,0.62,0.30),n1),uSeca*0.88);
      vec3 litter=mix(vec3(0.25,0.20,0.10),vec3(0.38,0.30,0.14),n2);
      vec3 cerr=mix(mix(vec3(0.55,0.56,0.18),vec3(0.70,0.62,0.22),n1),mix(vec3(0.74,0.58,0.28),vec3(0.84,0.68,0.34),n1),uSeca);
      vec3 soil=mix(vec3(0.70,0.38,0.18),vec3(0.80,0.48,0.24),n2);
      vec3 col=grass*vBio.x+litter*vBio.y+cerr*vBio.z+soil*vBio.w;
      col=mix(col,soil,smoothstep(0.72,0.86,fbm(p*0.11+7.0))*0.5*(1.0-vBio.y)*(1.0-vEx.x));
      // lavoura: leiras norte-sul a cada 0,9 m (as fileiras do milho ficam nas cristas), terra arada escura nos sulcos
      float ridge=0.5+0.5*cos(vWp.x/0.9*6.2832);vec3 tilled=mix(vec3(0.40,0.26,0.16),vec3(0.62,0.44,0.29),ridge)*(0.88+0.24*n3);
      tilled=mix(tilled,vec3(0.70,0.58,0.40)*(0.85+0.3*ridge),uSeca*0.6);col=mix(col,tilled,vEx.x*0.92);
      // terra batida da vila e dos caminhos: avermelhada, mais clara onde se pisa, com tufos de capim nas bordas
      vec3 earth=mix(vec3(0.66,0.46,0.31),vec3(0.80,0.62,0.45),n2)*(0.9+0.2*n3);earth=mix(earth,vec3(0.84,0.72,0.55),uSeca*0.4);
      col=mix(col,earth,smoothstep(0.2,0.7,vEx.y+(n3-0.5)*0.35));
      float bank=1.0-smoothstep(0.0,2.0,vWd);vec3 sand=mix(vec3(0.78,0.66,0.46),vec3(0.86,0.76,0.56),n3);
      col=mix(col,sand,bank*0.55);
      float wl=${WATER_Y.toFixed(3)}-uWaterDrop-0.06*vOu,dep=(wl-vWp.y)*(1.0-smoothstep(0.3,1.2,vWd)),under=smoothstep(-0.02,0.05,dep);
      vec3 bed=mix(vec3(0.62,0.57,0.44),vec3(0.80,0.74,0.58),n3);float peb=smoothstep(0.5,0.72,vnoise(p*6.0));
      bed=mix(bed,mix(vec3(0.50,0.48,0.45),vec3(0.80,0.77,0.70),vnoise(p*11.0+4.0)),peb*0.85);bed*=0.82+0.18*vnoise(p*23.0);
      col=mix(col,bed,under);col*=1.0-0.2*smoothstep(-0.15,0.0,dep)*(1.0-under);
      col*=0.9+0.2*n3;
      float wet=clamp(uWet*0.8+bank*0.35,0.0,1.0);col*=mix(1.0,0.68,wet);
      float puddle=smoothstep(0.6,0.68,fbm(p*0.09+11.0))*smoothstep(0.45,0.9,uWet)*(1.0-vBio.y)*(1.0-under)*(1.0-vOu);
      col=mix(col,pow(uSkyHor,vec3(0.4545))*0.8,puddle*0.8);
      float dc=length(vWp.xz-uCenter);
      if(vOu>0.5){float l=dot(col,vec3(0.3,0.5,0.2));col=mix(col,vec3(l),0.2)*1.04+0.03;
        float he=hexEdge(vWp.xz);col=mix(col,col*1.25+0.04,(1.0-smoothstep(0.0,0.45,he))*0.5*(1.0-smoothstep(45.0,90.0,dc)));vHaze=smoothstep(40.0,480.0,dc)*0.55;}
      else{float he=hexEdge(vWp.xz);col*=1.0-(1.0-smoothstep(0.0,0.3,he))*0.12;vHaze=0.0;}
      diffuseColor.rgb=toLin(col);
      if(under>0.0){vec2 cq=p*1.6;float t=uTime*0.7;float a=vnoise(cq+vec2(t,-t*0.6)),b=vnoise(cq*1.4+vec2(-t*0.7,t*0.5)+a*1.5);
        float caus=pow(clamp(1.0-abs(a-b)*3.0,0.0,1.0),5.0)*cloudShadow(p)*uDay*smoothstep(0.0,0.25,dep)*(1.0-0.6*uRain);
        diffuseColor.rgb*=mix(vec3(1.0),exp(-vec3(1.5,0.5,0.4)*max(dep,0.0)*0.7)*(1.0+caus*2.0),under);}`)
    .replace('#include <lights_fragment_end>', LIGHT_END(0))
    .replace('#include <fog_fragment>', '#include <fog_fragment>\ngl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,vHaze);');
};
for (const t of TILES) { const { pos, idx } = sectorGrid(t.c, mobile ? 26 : 32); const m = new THREE.Mesh(finishGround(pos, idx, 0, 0), groundMat); m.receiveShadow = true; scene.add(m); }
const outside = P => P.some(([x, z]) => !inAnyTile(x, z, 0.999));
{ const near = latticeGeometry(0, 150, mobile ? 1.6 : 1.25, outside); const m = new THREE.Mesh(finishGround(near.pos, near.idx, 1, 0.1), groundMat); m.receiveShadow = true; scene.add(m);
  const far = latticeGeometry(145, 1500, 14, () => true); scene.add(new THREE.Mesh(finishGround(far.pos, far.idx, 1, 0.25), groundMat)); }
// chapadas ao longe (ficam azuladas pela névoa, como as montanhas de Hyrule)
{ const mat = toon({ color: 0x7f9a5a, fog: false });
  mat.onBeforeCompile = sh => { shared(sh); sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vMy;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvMy=clamp((modelMatrix*vec4(position,1.0)).y/70.0,0.0,1.0);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vMy;uniform vec3 uSkyZen,uSkyHor;')
    .replace('#include <fog_fragment>', 'gl_FragColor.rgb=mix(gl_FragColor.rgb,mix(uSkyHor,uSkyZen,0.3),0.5+0.35*(1.0-smoothstep(0.0,0.75,vMy)));'); };
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + rnd() * 0.5, d = 1300 + rnd() * 1000, w = 300 + rnd() * 420, h = 40 + rnd() * 60;
    const cg = new THREE.CylinderGeometry(w * 0.82, w, h, 32, 1); const p = cg.attributes.position;
    for (let j = 0; j < p.count; j++) { const x = p.getX(j), z = p.getZ(j); p.setX(j, x * (0.85 + 0.3 * vnoise(x * 0.01 + i, z * 0.01))); p.setZ(j, z * (0.6 + 0.3 * vnoise(z * 0.01, x * 0.01 + i))); }
    cg.computeVertexNormals(); const cm = new THREE.Mesh(cg, mat); cm.position.set(CENTER[0] + Math.cos(a) * d, h / 2 - 3, CENTER[1] + Math.sin(a) * d); scene.add(cm); } }

// ---------- capim: lâminas na placa de vídeo, presas ao chão num retalho em volta do ponto que a câmera olha. Cada lâmina
// lê do mapa do vale a altura do chão, a densidade, o tamanho e o tipo; curva com o vento do lugar e com a chuva; e a
// rajada que passa clareia as pontas (as "ondas" de vento no capim, como em Hyrule)
const FIELD = { size: 140, res: 256 };
const fieldTex = (() => { const N = FIELD.res, d = new Float32Array(N * N * 4), x0 = CENTER[0] - FIELD.size / 2, z0 = CENTER[1] - FIELD.size / 2;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = x0 + (i + 0.5) / N * FIELD.size, z = z0 + (j + 0.5) / N * FIELD.size, k = (j * N + i) * 4;
    const inT = inAnyTile(x, z, 0.995); d[k] = heightAt(x, z) - (inT ? 0 : 0.1); if (!inT) continue;
    const b = biomeAt(x, z), wd = waterDist(x, z);
    d[k + 1] = wd < 0.35 ? 0 : Math.min(1, b[0] * 1.0 + b[2] * 0.92 + b[1] * 0.2) * (0.85 + 0.3 * (vnoise(x * 0.3, z * 0.3) - 0.5));
    d[k + 1] *= blocked(x, z, -0.5) ? 0 : (1 - Math.min(1, dirtAt(x, z) * 1.4)) * (1 - 0.9 * fieldAt(x, z));
    d[k + 2] = (b[2] > 0.5 ? 0.6 + 0.4 * vnoise(x * 0.15, z * 0.15) : b[1] > 0.5 ? 0.24 : 0.26 + 0.24 * vnoise(x * 0.2 + 7, z * 0.2)) * (wd < 2.5 && wd > 0.35 ? 1.5 : 1);
    d[k + 3] = b[2] > 0.5 ? 1 : b[1] > 0.5 ? 0.5 : 0; }
  const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat, THREE.FloatType); t.minFilter = t.magFilter = THREE.LinearFilter; t.needsUpdate = true; return t; })();
const BLADES = mobile ? 70000 : 140000;
const bladeGeo = (() => { const g = new THREE.InstancedBufferGeometry(), seg = 4, pos = [], uv = [], nor = [], idx = [];
  for (let i = 0; i <= seg; i++) { const v = i / seg, w = 1 - v * 0.92; pos.push(-0.5 * w, v, 0, 0.5 * w, v, 0); uv.push(0, v, 1, v); nor.push(0, 0, 1, 0, 0, 1); }
  for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
  // cada lâmina tem lugar fixo dentro das peças, sorteado conforme a densidade do capim ali (nada se perde na água ou na mata fechada)
  const sd = new Float32Array(BLADES * 4), bp = new Float32Array(BLADES * 2), F = fieldTex.image.data, N = FIELD.res;
  for (let i = 0, guard = 0; i < BLADES && guard < BLADES * 60; guard++) { const t = TILES[Math.floor(rnd() * TILES.length)], x = t.c[0] + (rnd() - 0.5) * 2 * R, z = t.c[1] + (rnd() - 0.5) * 2 * R;
    if (!inHex(x, z, t.c, 0.995)) continue; const fi = Math.min(N - 1, Math.floor((x - CENTER[0] + FIELD.size / 2) / FIELD.size * N)), fj = Math.min(N - 1, Math.floor((z - CENTER[1] + FIELD.size / 2) / FIELD.size * N));
    if (rnd() > F[(fj * N + fi) * 4 + 1]) continue; bp[i * 2] = x; bp[i * 2 + 1] = z; sd.set([rnd(), rnd(), rnd(), rnd()], i * 4); i++; }
  g.setAttribute('seed', new THREE.InstancedBufferAttribute(sd, 4)); g.setAttribute('bpos', new THREE.InstancedBufferAttribute(bp, 2)); g.instanceCount = BLADES; return g; })();
const grassU = { uField: { value: fieldTex }, uFieldO: { value: new THREE.Vector2(CENTER[0] - FIELD.size / 2, CENTER[1] - FIELD.size / 2) }, uFieldS: { value: FIELD.size },
 };
const grassMat = toon({ side: THREE.DoubleSide });
grassMat.onBeforeCompile = sh => { shared(sh); Object.assign(sh.uniforms, grassU);
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 seed;attribute vec2 bpos;uniform sampler2D uField;uniform vec2 uFieldO;uniform float uFieldS,uRain;varying float vGy;varying vec3 vWp;varying float vType;varying float vTone;varying float vGust;\n' + NOISE + WIND)
    .replace('#include <beginnormal_vertex>', 'vec3 objectNormal=vec3(0.0,1.0,0.0);')
    .replace('#include <begin_vertex>', /* glsl */`
      vec2 bp=bpos;vec2 fuv=(bp-uFieldO)/uFieldS;vec4 F=texture2D(uField,fuv);
      float cd=distance(cameraPosition,vec3(bp.x,F.r,bp.y));
      float alive=step(0.001,F.g);
      float H=F.b*(0.6+0.8*seed.w)*alive;vType=F.a;vTone=seed.z;
      float yaw=seed.w*6.2832,cy=cos(yaw),sy=sin(yaw);float wdt=mix(0.05,0.085,seed.x)*(1.0+F.a*0.3)*(1.0+cd/30.0);
      float g=gustAt(bp),q=windQ(max(0.0,uWindBase*(1.0+uWindIu*g))),v=uv.y;vGust=clamp(g*0.5*min(1.0,uWindBase/4.0),0.0,1.0);
      float lean=(0.18+0.35*seed.y)+(0.05+0.95*q)+0.12*q*sin(uTime*7.0+seed.x*40.0)+0.25*uRain;
      vec2 wd2=normalize(mix(vec2(cy,sy),uWindDir,clamp(q*1.4+0.25,0.0,1.0)));
      float bend=lean*v*v;vec3 p=vec3(position.x*wdt*cy,0.0,position.x*wdt*sy);
      p+=vec3(wd2.x*bend*H*0.9,v*H*(1.0-0.45*lean*lean*v),wd2.y*bend*H*0.9);
      vec3 transformed=vec3(bp.x,F.r-0.02,bp.y)+p;vGy=v;vWp=transformed;`)
    .replace('#include <defaultnormal_vertex>', 'vec3 transformedNormal=normalMatrix*normalize(vec3(0.0,1.0,0.0)+vec3(cos(seed.w*6.28),0.0,sin(seed.w*6.28))*0.2);');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vGy;varying vec3 vWp;varying float vType;varying float vTone;varying float vGust;\n' + HEAD)
    .replace('#include <color_fragment>', /* glsl */`
      vec3 green=mix(vec3(0.22,0.44,0.09),vec3(0.70,0.86,0.30),vGy)*(0.88+0.24*vTone);
      vec3 gold=mix(vec3(0.34,0.38,0.10),vec3(0.86,0.80,0.36),vGy)*(0.9+0.2*vTone);
      vec3 forest=mix(vec3(0.12,0.22,0.05),vec3(0.36,0.52,0.14),vGy);
      vec3 straw=mix(vec3(0.42,0.32,0.14),vec3(0.92,0.78,0.42),vGy);
      vec3 col=vType>0.75?gold:vType>0.25?forest:green;
      col=mix(col,straw,uSeca*(vType>0.25&&vType<0.75?0.3:0.9));
      col+=vec3(0.16,0.15,0.06)*vGust*vGy*vGy;col*=mix(1.0,0.78,uWet);diffuseColor.rgb=toLin(col);`)
    .replace('#include <lights_fragment_end>', LIGHT_END(0) + `\n{float back=pow(max(dot(normalize(vWp-cameraPosition),uSunW),0.0),2.5);totalEmissiveRadiance+=diffuseColor.rgb*uSunC*back*0.55*vGy*cloudShadow(vWp.xz);}`);
};
const grass = new THREE.Mesh(bladeGeo, grassMat); grass.frustumCulled = false; grass.receiveShadow = true; scene.add(grass);

// ---------- árvores: copas em ramos de folhas (volume macio, luz em faixas e contorno claro), troncos tortos do cerrado,
// mata de galeria alta, buritis em leque e ipês (amarelos na seca)
const barkTex = barkTexture(5);
const TEX = { cerrado: leafTexture(7, { n: 110, size: 26, round: 0.62, spread: 0.4 }), mata: leafTexture(9, { n: 170, size: 22, round: 0.5, spread: 0.42 }),
  ipe: leafTexture(13, { n: 140, size: 18, round: 0.65, spread: 0.4 }), buriti: fanTexture(11) };
const LEAFC = { cerrado: 0x9fbf3e, mata: 0x5f9a33, ipe: 0x8fb33c, buriti: 0x8cc04a, sombra: 0x86b23c };
function treeMaterials(kind) {
  const wood = toon({ map: barkTex, color: kind === 'buriti' ? 0xb8a98a : kind === 'mata' ? 0xa08a6c : 0x8f7356 });
  const leaf = toon({ map: TEX[kind], alphaTest: 0.5, side: THREE.DoubleSide, color: LEAFC[kind] });
  const dry = { cerrado: 0.5, mata: 0.05, ipe: 1, buriti: 0.1, sombra: 0.2 }[kind];
  const sway = (sh, isLeaf, depth) => { shared(sh); sh.uniforms.uDry = { value: dry };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float flex;attribute float lr;attribute float ao;attribute float tint;varying float vLr;varying vec3 vWp;varying float vAo;varying float vTint;\n' + NOISE + WIND)
      .replace('#include <begin_vertex>', /* glsl */`#include <begin_vertex>
        vec3 tp=(modelMatrix*vec4(0.0,0.0,0.0,1.0)).xyz;float hs=hash21(tp.xz);
        float q=windQ(windAt(tp.xz)),f=flex*flex,w=1.6+1.4*hs;
        float sw=(0.06*q+0.022*q*sin(uTime*w+hs*40.0)+0.004*sin(uTime*0.9+hs*9.0))*f;
        vec3 dw=vec3(uWindDir.x,0.0,uWindDir.y)*sw*8.0;
        ${isLeaf ? 'dw+=vec3(sin(uTime*11.0+position.x*3.1+lr*20.0),sin(uTime*13.0+position.z*2.3)*0.5,cos(uTime*10.0+position.y*2.7))*0.05*(0.25+q)*flex;' : ''}
        transformed+=inverse(mat3(modelMatrix))*dw;vLr=lr;vAo=ao;vTint=tint;vWp=(modelMatrix*vec4(transformed,1.0)).xyz;`);
    if (depth) { sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vLr;varying vec3 vWp;varying float vAo;varying float vTint;\n'); return; }
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vLr;varying vec3 vWp;varying float vAo;varying float vTint;uniform float uDry;\n' + HEAD)
      .replace('#include <map_fragment>', isLeaf ? /* glsl */`#include <map_fragment>
        if(vLr<uSeca*uDry*0.5)discard;
        vec3 ochre=vec3(0.86,0.58,0.24)*dot(diffuseColor.rgb,vec3(0.45)),yel=vec3(1.0,0.82,0.16)*(0.7+0.5*dot(diffuseColor.rgb,vec3(0.33)));
        diffuseColor.rgb=uDry>0.9?mix(diffuseColor.rgb,yel,uSeca):mix(diffuseColor.rgb,ochre,uSeca*uDry*step(0.5,fract(vLr*7.3)));
        diffuseColor.rgb*=(0.92+0.16*fract(vLr*13.7))*mix(0.42,1.12,vAo)*mix(vec3(1.06,1.0,0.82),vec3(0.9,1.02,1.06),vTint);` : '#include <map_fragment>\ndiffuseColor.rgb*=mix(1.0,0.72,uWet);')
      .replace('#include <lights_fragment_end>', LIGHT_END(isLeaf ? '2.2' : 0)); };
  wood.onBeforeCompile = sh => sway(sh, false, false); leaf.onBeforeCompile = sh => sway(sh, true, false);
  const leafDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: TEX[kind], alphaTest: 0.5 }); leafDepth.onBeforeCompile = sh => sway(sh, true, true);
  const woodDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }); woodDepth.onBeforeCompile = sh => sway(sh, false, true);
  return { wood, leaf, leafDepth, woodDepth };
}
const MATS = { cerrado: treeMaterials('cerrado'), mata: treeMaterials('mata'), ipe: treeMaterials('ipe'), buriti: treeMaterials('buriti') };
TEX.sombra = TEX.cerrado; MATS.sombra = treeMaterials('sombra'); MATS.moita = MATS.cerrado;
function limb(out, p0, dir, len, r0, r1, depth, P, v0 = 0) {
  let p = p0.clone(), d = dir.clone(), v = v0; const segs = 3;
  for (let s = 0; s < segs; s++) { const L = len / segs, ra = r0 + (r1 - r0) * s / segs, rb = r0 + (r1 - r0) * (s + 1) / segs;
    d.add(new THREE.Vector3((rnd() - 0.5) * P.crook, (rnd() - 0.5) * P.crook * 0.5, (rnd() - 0.5) * P.crook)).normalize(); if (d.y < 0.05) { d.y = 0.05; d.normalize(); }
    const g = new THREE.CylinderGeometry(rb, ra, L, 7, 1, true), uvA = g.attributes.uv;
    for (let k = 0; k < uvA.count; k++) uvA.setXY(k, uvA.getX(k) * 2, (v + uvA.getY(k) * L) / 1.4); v += L;   // a casca segue sem emenda
    g.translate(0, L / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d)); g.translate(p.x, p.y, p.z);
    out.wood.push(g); p = p.clone().addScaledVector(d, L); }
  if (depth < P.levels) { const n = depth === 0 ? P.branches : 2 + (rnd() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, tilt = P.spread * (0.7 + rnd() * 0.5), nd = new THREE.Vector3(Math.cos(a) * Math.sin(tilt), Math.cos(tilt), Math.sin(a) * Math.sin(tilt)).lerp(d, 0.3).normalize();
      limb(out, p, nd, len * P.decay * (0.8 + rnd() * 0.4), r1, r1 * 0.55, depth + 1, P, v); } }
  else out.tips.push(p);
}
function leafCards(out, tips, center, P) {
  let rad = 0.5; for (const tp of tips) rad = Math.max(rad, Math.hypot(tp.x - center.x, tp.z - center.z)); rad += P.cluster * 0.5;
  const low = Math.min(...tips.map(t => t.y)) - P.cluster * 0.5, high = Math.max(...tips.map(t => t.y)) + P.cluster * 0.6;
  for (const tp of tips) for (let i = 0; i < P.cards; i++) {
    const s = P.card * (0.75 + rnd() * 0.5), g = new THREE.PlaneGeometry(s, s); g.applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 6.28, rnd() * 6.28, rnd() * 6.28)));
    const c = tp.clone().add(new THREE.Vector3((rnd() - 0.5) * P.cluster, (rnd() - 0.35) * P.cluster * 0.7, (rnd() - 0.5) * P.cluster)); g.translate(c.x, c.y, c.z);
    const n = c.clone().sub(center).add(new THREE.Vector3(0, P.cluster * 0.8, 0)).normalize(), nor = g.attributes.normal;
    for (let k = 0; k < nor.count; k++) nor.setXYZ(k, n.x, n.y, n.z);     // normais "da copa": a copa inteira recebe luz como um volume macio
    const r = rnd(), out_ = Math.min(1, Math.hypot(c.x - center.x, c.z - center.z) / rad), up = Math.max(0, Math.min(1, (c.y - low) / (high - low)));
    const ao = Math.max(0, Math.min(1, 0.15 + 0.5 * up + 0.45 * out_ * out_));
    g.setAttribute('lr', new THREE.Float32BufferAttribute(new Array(4).fill(r), 1)); g.setAttribute('ao', new THREE.Float32BufferAttribute(new Array(4).fill(ao), 1)); out.leaf.push(g); }
}
function finish(geos, H, withLr) { const g = mergeGeometries(geos);
  const p = g.attributes.position, flex = new Float32Array(p.count); for (let i = 0; i < p.count; i++) flex[i] = Math.max(0, Math.min(1, p.getY(i) / H));
  g.setAttribute('flex', new THREE.BufferAttribute(flex, 1)); if (!withLr) g.setAttribute('lr', new THREE.BufferAttribute(new Float32Array(p.count), 1));
  if (!g.attributes.ao) g.setAttribute('ao', new THREE.BufferAttribute(new Float32Array(p.count).fill(1), 1));
  g.setAttribute('tint', new THREE.BufferAttribute(new Float32Array(p.count).fill(rnd()), 1)); return g; }
const SPECIES = {
  cerrado: { trunk: [2.2, 3.4], r: 0.24, crook: 0.55, lean: 0.25, branches: 3, levels: 2, spread: 0.95, decay: 0.72, cards: 22, card: 2.4, cluster: 2.0 },
  ipe: { trunk: [4, 5.5], r: 0.27, crook: 0.4, lean: 0.12, branches: 3, levels: 2, spread: 0.8, decay: 0.75, cards: 20, card: 2.4, cluster: 2.0 },
  mata: { trunk: [3.6, 5.2], r: 0.36, crook: 0.22, lean: 0.06, branches: 4, levels: 3, spread: 0.85, decay: 0.74, cards: 15, card: 3.2, cluster: 2.6 },
  sombra: { trunk: [2.6, 3.4], r: 0.5, crook: 0.3, lean: 0.08, branches: 5, levels: 3, spread: 1.0, decay: 0.72, cards: 13, card: 3.4, cluster: 2.8 },
  moita: { trunk: [0.3, 0.5], r: 0.05, crook: 0.6, lean: 0.3, branches: 4, levels: 1, spread: 1.1, decay: 1.1, cards: 9, card: 1.3, cluster: 0.9 },
};
function treeMesh(out, H, M) { const g = new THREE.Group();
  const w = new THREE.Mesh(finish(out.wood, H, false), M.wood); w.castShadow = w.receiveShadow = true; w.customDepthMaterial = M.woodDepth;
  const l = new THREE.Mesh(finish(out.leaf, H, true), M.leaf); l.castShadow = l.receiveShadow = true; l.customDepthMaterial = M.leafDepth; g.add(w, l); return g; }
function makeTree(kind, scale = 1) {
  const out = { wood: [], leaf: [], tips: [] }, P = SPECIES[kind], th = (P.trunk[0] + rnd() * (P.trunk[1] - P.trunk[0])) * scale;
  limb(out, new THREE.Vector3(0, -0.3, 0), new THREE.Vector3((rnd() - 0.5) * P.lean, 1, (rnd() - 0.5) * P.lean).normalize(), th, P.r * scale * 1.3, P.r * scale * 0.85, 0, P);
  if (P.r > 0.1) { const rr = P.r * scale * 1.3, fl = new THREE.CylinderGeometry(rr, rr * 1.9, 0.7, 7, 1, true), uvA = fl.attributes.uv;
    for (let k = 0; k < uvA.count; k++) uvA.setXY(k, uvA.getX(k) * 2, uvA.getY(k) * 0.5); fl.translate(0, 0.05, 0); out.wood.push(fl); }
  let H = 0; for (const t of out.tips) H = Math.max(H, t.y); const center = out.tips.reduce((a, t) => a.add(t), new THREE.Vector3()).multiplyScalar(1 / out.tips.length);
  leafCards(out, out.tips, center, { ...P, card: P.card * scale, cluster: P.cluster * scale }); return treeMesh(out, H + P.cluster * scale, MATS[kind]);
}
function makeBuriti() {
  const H = 13 + rnd() * 5, out = { wood: [], leaf: [] }, lean = new THREE.Vector3((rnd() - 0.5) * 0.08, 1, (rnd() - 0.5) * 0.08).normalize();
  const tr = new THREE.CylinderGeometry(0.27, 0.32, H, 10, 8, true); tr.translate(0, H / 2, 0); tr.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), lean)); out.wood.push(tr);
  const top = lean.clone().multiplyScalar(H), n = 16;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + rnd() * 0.3, up = 0.25 + rnd() * 0.9, L = 2.4 + rnd() * 1.2;
    const dir = new THREE.Vector3(Math.cos(a) * Math.cos(up), Math.sin(up), Math.sin(a) * Math.cos(up)).normalize();
    const pet = new THREE.CylinderGeometry(0.035, 0.06, L, 5, 1, true); pet.translate(0, L / 2, 0); pet.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)); pet.translate(top.x, top.y, top.z); out.wood.push(pet);
    const end = top.clone().addScaledVector(dir, L), S = 3.6 + rnd() * 0.8, fan = new THREE.PlaneGeometry(S, S); fan.translate(0, S * 0.42, 0);
    // o leque fica "deitado" de frente para o céu e cai na ponta (vê-se de cima, como nos buritizais)
    const droop = new THREE.Vector3(Math.cos(a), 0.15 + up * 0.5 - 0.35, Math.sin(a)).normalize();
    fan.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), droop));
    fan.applyMatrix4(new THREE.Matrix4().makeRotationAxis(droop, Math.PI / 2)); fan.translate(end.x, end.y, end.z);
    const nn = droop.clone().add(new THREE.Vector3(0, 1.2, 0)).normalize(), nor = fan.attributes.normal; for (let k = 0; k < nor.count; k++) nor.setXYZ(k, nn.x, nn.y, nn.z);
    fan.setAttribute('lr', new THREE.Float32BufferAttribute(new Array(4).fill(rnd()), 1)); out.leaf.push(fan); }
  return treeMesh(out, H + 3, MATS.buriti);
}
// cupinzeiros (Cornitermes): domos de argila laranja-avermelhada, encaroçados, às vezes com uma torrinha do lado;
// e pedras de quartzito, facetadas, com líquen em cima e escuras de umidade na beira d'água
const earthTex = earthTexture(17), stoneTex = stoneTexture(23);
const termiteMat = toon({ color: 0xd27a48, map: earthTex });
termiteMat.onBeforeCompile = sh => { shared(sh);
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vLy;varying vec3 vWp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLy=position.y;vWp=(modelMatrix*vec4(transformed,1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vLy;varying vec3 vWp;\n' + HEAD)
    .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb*=mix(vec3(0.62,0.6,0.5),vec3(1.0),smoothstep(0.0,0.35,vLy))*mix(1.0,0.7,uWet);')
    .replace('#include <lights_fragment_end>', LIGHT_END(0)); };
function lump(r0, h, o, seg = 18) {
  const prof = []; for (let i = 0; i <= 12; i++) { const t = i / 12; prof.push(new THREE.Vector2(Math.max(0.001, r0 * Math.pow(1 - Math.pow(t, 1.5), 0.75) * (1 + 0.15 * (1 - t) * (1 - t))), h * t)); }
  const g = new THREE.LatheGeometry(prof, seg); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x);
    const k = 1 + (vnoise(a * 1.6 + o, y * 1.8) - 0.5) * 0.45 + (vnoise(a * 5 + o, y * 6) - 0.5) * 0.22; p.setX(i, x * k); p.setZ(i, z * k); }
  g.computeVertexNormals(); return g;
}
function makeTermite() {
  const h = 1.0 + rnd() * 1.1, r0 = 0.4 + rnd() * 0.22 + h * 0.12, parts = [lump(r0, h, rnd() * 50)];
  if (rnd() < 0.55) { const h2 = h * (0.45 + rnd() * 0.3), g2 = lump(r0 * 0.55, h2, rnd() * 50, 14), a = rnd() * 6.28; g2.translate(Math.cos(a) * r0 * 0.7, 0, Math.sin(a) * r0 * 0.7); parts.push(g2); }
  const g = mergeGeometries(parts); g.translate(0, -0.12, 0);
  const m = new THREE.Mesh(g, termiteMat); m.castShadow = m.receiveShadow = true; return m; }
const stoneMat = toon({ color: 0xc9c2b2, map: stoneTex });
stoneMat.onBeforeCompile = sh => { shared(sh);
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;varying vec3 vWn;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp=(modelMatrix*vec4(transformed,1.0)).xyz;vWn=normalize(mat3(modelMatrix)*objectNormal);');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;varying vec3 vWn;\n' + HEAD)
    .replace('#include <map_fragment>', `#include <map_fragment>
      float wl=${WATER_Y.toFixed(3)}-uWaterDrop;float moss=smoothstep(0.55,0.85,vWn.y)*smoothstep(0.35,0.6,fbm(vWp.xz*3.0+vWp.y))*(1.0-uSeca*0.6);
      diffuseColor.rgb=mix(diffuseColor.rgb,toLin(vec3(0.42,0.55,0.20))*(0.8+0.4*vnoise(vWp.xz*20.0)),moss*0.75);
      float wet=1.0-smoothstep(wl+0.02,wl+0.16,vWp.y);diffuseColor.rgb*=mix(1.0,0.68,max(wet,uWet*0.6));
      diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(0.55,0.75,0.72),1.0-smoothstep(wl-0.05,wl+0.02,vWp.y));`)
    .replace('#include <lights_fragment_end>', LIGHT_END(0)); };
function makeStone(size, flat = 0.7) {
  const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position, o = rnd() * 40, sx = 0.8 + rnd() * 0.5, sz = 0.8 + rnd() * 0.4;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + (vnoise(x * 1.3 + o, z * 1.3 + y) - 0.5) * 0.5 + (vnoise(x * 3.1 + o, y * 3.1 - z) - 0.5) * 0.18;
    p.setXYZ(i, x * k * sx * size, Math.max(y, -0.55) * k * flat * size, z * k * sz * size); }
  g.computeVertexNormals();                // facetas planas: pedra talhada à moda dos jogos pintados
  const m = new THREE.Mesh(g, stoneMat); m.castShadow = m.receiveShadow = true; return m; }
const ROCKS_IN_WATER = [];
function putStone(x, z, size, flat, y) { const m = makeStone(size, flat); m.position.set(x, y ?? heightAt(x, z) - size * flat * 0.25, z); m.rotation.y = rnd() * 6.28; scene.add(m); placed.push([x, z, size * 1.4]); return m; }

const placed = [];
function place(obj, x, z, minD) { if (blocked(x, z, 1.2) || dirtAt(x, z) > 0.3 || fieldAt(x, z) > 0.05 || placed.some(p => Math.hypot(p[0] - x, p[1] - z) < Math.min(minD, p[2]))) return false;
  obj.position.set(x, heightAt(x, z) - 0.1, z); obj.rotation.y = rnd() * Math.PI * 2; scene.add(obj); placed.push([x, z, minD]); return true; }
function scatter(t, n, fn, test, minD) { let k = 0; for (let i = 0; i < n * 40 && k < n; i++) { const x = t.c[0] + (rnd() - 0.5) * 2 * R * 0.9, z = t.c[1] + (rnd() - 0.5) * 2 * R * 0.9;
  if (!inHex(x, z, t.c, 0.9) || !test(x, z)) continue; if (place(fn(), x, z, minD)) k++; } }
const [tA, tB, tC, tD] = TILES;
for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.4, d = POOL_R + 1.6 + rnd() * 1.5; place(makeBuriti(), SPRING[0] + Math.cos(a) * d, SPRING[1] + Math.sin(a) * d, 3.2); }
scatter(tA, 4, makeBuriti, (x, z) => { const w = waterDist(x, z); return w > 0.8 && w < 3.5; }, 4);
scatter(tA, 2, () => makeTree('cerrado'), (x, z) => waterDist(x, z) > 8, 7);
scatter(tB, 16, () => makeTree('mata', 0.85 + rnd() * 0.3), (x, z) => { const w = waterDist(x, z); return w > 1.8 && w < 13; }, 4.6);
scatter(tB, 3, makeBuriti, (x, z) => { const w = waterDist(x, z); return w > 0.8 && w < 3; }, 4);
scatter(tC, 1, () => makeTree('sombra', 1.15), (x, z) => Math.hypot(x - tC.c[0], z - tC.c[1]) < 9, 10);   // a árvore de sombra do pasto, onde o gado descansa
scatter(tC, 2, () => makeTree('cerrado', 1.05), () => true, 9);
scatter(tC, 4, makeTermite, () => true, 4);
scatter(tD, 9, () => makeTree('cerrado', 0.8 + rnd() * 0.4), () => true, 5.5);
scatter(tD, 2, () => makeTree('ipe'), () => true, 7);
scatter(tD, 5, makeTermite, () => true, 3);
const tV = TILES.find(t => t.kind === 'vila'), tL = TILES.find(t => t.kind === 'lavoura');
scatter(tV, 2, () => makeTree('sombra', 0.95), () => true, 8);        // mangueiras do quintal
scatter(tV, 5, () => makeTree('moita', 0.8 + rnd() * 0.4), () => true, 3);
scatter(tL, 3, () => makeTree('cerrado', 0.9), () => true, 6);
const props = buildProps(scene, { mobile });
// moitas: o sub-bosque da mata e os arbustos do cerrado, que fecham o vão entre o capim e as copas
scatter(tB, 16, () => makeTree('moita', 0.9 + rnd() * 0.6), (x, z) => { const w = waterDist(x, z); return w > 1.2 && w < 14; }, 2.2);
scatter(tD, 6, () => makeTree('moita', 0.8 + rnd() * 0.5), () => true, 2.5);
scatter(tA, 4, () => makeTree('moita', 0.8 + rnd() * 0.4), (x, z) => { const w = waterDist(x, z); return w > 1.5 && w < 6; }, 2.5);
{ let tries = 0; while (ROCKS_IN_WATER.length < 6 && tries++ < 400) { const i = 4 + Math.floor(rnd() * 220), [x0, z0] = RIVER[i], ri = riverInfo(x0, z0), w = riverHalfWidth(ri.s);
    if (!inAnyTile(x0, z0, 0.85) || Math.hypot(x0 - SPRING[0], z0 - SPRING[1]) < POOL_R + 2 || ROCKS_IN_WATER.some(r => Math.hypot(r[0] - x0, r[1] - z0) < 5)) continue;
    const side = rnd() < 0.5 ? -1 : 1, off = side * w * (0.45 + rnd() * 0.45), x = x0 - ri.tz * off, z = z0 + ri.tx * off, size = 0.4 + rnd() * 0.35, flat = 0.75;
    putStone(x, z, size, flat, WATER_Y + 0.12 + rnd() * 0.15 - size * flat * 0.9); ROCKS_IN_WATER.push([x, z, size * 0.95]); }
  for (const t of [tA, tB]) for (let k = 0, n = 0; k < 300 && n < 4; k++) { const x = t.c[0] + (rnd() - 0.5) * 2 * R, z = t.c[1] + (rnd() - 0.5) * 2 * R, w = waterDist(x, z);
    if (!inHex(x, z, t.c, 0.9) || w < 0.1 || w > 2.2 || placed.some(p => Math.hypot(p[0] - x, p[1] - z) < 2.5)) continue; putStone(x, z, 0.25 + rnd() * 0.4, 0.6); n++; }
  for (const [t, n] of [[tD, 5], [tC, 2]]) for (let k = 0, c = 0; k < 300 && c < n; k++) { const x = t.c[0] + (rnd() - 0.5) * 2 * R, z = t.c[1] + (rnd() - 0.5) * 2 * R;
    if (!inHex(x, z, t.c, 0.88) || placed.some(p => Math.hypot(p[0] - x, p[1] - z) < 3)) continue; putStone(x, z, 0.3 + rnd() * 0.7, 0.55 + rnd() * 0.25); c++; } }

// ---------- água: transparente no raso (vê-se o leito de seixos e as cáusticas), turquesa e depois verde-garrafa no fundo,
// reflexo de verdade do céu e das árvores (a cena desenhada de novo por uma câmera espelhada), ondinhas que descem com a
// correnteza, espuma na beira e em volta das pedras, brilhos do sol e anéis de chuva
const ROCKV = Array.from({ length: 8 }, (_, i) => ROCKS_IN_WATER[i] ? new THREE.Vector3(...ROCKS_IN_WATER[i]) : new THREE.Vector3(0, 0, -1));
const waterMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: true,
  uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uReflMat: { value: new THREE.Matrix4() } }]),
  vertexShader: /* glsl */`attribute vec2 flow;attribute float dep;varying vec2 vFlow;varying float vDep;varying vec3 vWp;uniform float uWaterDrop;
    #include <fog_pars_vertex>
    void main(){vec3 p=position;p.y-=uWaterDrop;vec4 w=modelMatrix*vec4(p,1.0);vWp=w.xyz;vFlow=flow;vDep=dep-uWaterDrop;vec4 mvPosition=viewMatrix*w;gl_Position=projectionMatrix*mvPosition;
    #include <fog_vertex>
    }`,
  fragmentShader: /* glsl */`varying vec2 vFlow;varying float vDep;varying vec3 vWp;uniform sampler2D uRefl;uniform mat4 uReflMat;uniform vec3 uRocks[8];
    ${HEAD}
    #include <fog_pars_fragment>
    float hgt(vec2 q){return vnoise(q*vec2(0.55,1.1)-vec2(uFlowClk*0.55,0.0))*0.6+vnoise(q*vec2(1.6,2.4)-vec2(uFlowClk*1.3,0.0))*0.3+vnoise(q*vec2(4.0,5.5)-vec2(uFlowClk*2.2,0.0))*0.1;}
    void main(){float d=vDep;if(d<=0.0)discard;
      vec2 p=vWp.xz;vec2 f=length(vFlow)>0.01?normalize(vFlow):vec2(1.0,0.0);vec2 s=vec2(-f.y,f.x);vec2 q=vec2(dot(p,f),dot(p,s));float fl=clamp(length(vFlow),0.0,1.0);
      float e=0.1,h0=hgt(q),hx=hgt(q+vec2(e,0.0))-h0,hy=hgt(q+vec2(0.0,e))-h0;vec2 gq=vec2(hx,hy)/e*(0.05+0.07*fl+0.25*uRain);vec2 gw=f*gq.x+s*gq.y;
      float ring=0.0;if(uRain>0.01){vec2 c=floor(p*1.7),fp=fract(p*1.7)-0.5;float r=hash21(c);float t=fract(uTime*1.1+r*7.0);vec2 o=(vec2(hash21(c+3.1),hash21(c+7.7))-0.5)*0.5;
        vec2 dv=fp-o;float dd=length(dv);ring=(1.0-smoothstep(0.0,0.05,abs(dd-t*0.42)))*(1.0-t)*step(r,uRain*0.9+0.1);gw+=dv/max(dd,0.001)*ring*0.5;}
      float foam=0.0;
      for(int i=0;i<8;i++){vec3 rk=uRocks[i];if(rk.z<=0.0)continue;vec2 dr=p-rk.xy;float al=dot(dr,f),ac=dot(dr,s),dist=length(dr);
        float ringF=1.0-smoothstep(rk.z*0.8,rk.z+0.25+0.3*vnoise(vec2(atan(dr.y,dr.x)*3.0,uFlowClk*2.0)),dist);
        float wake=exp(-ac*ac/(rk.z*rk.z*0.7))*smoothstep(0.0,0.5,al)*exp(-al/(2.0+rk.z*3.0));
        foam+=ringF*0.9+wake*smoothstep(0.42,0.68,vnoise(vec2(al*2.2-uFlowClk*3.5,ac*4.0)));gw+=normalize(dr+1e-3)*(wake+ringF*0.4)*0.12;}
      vec3 N=normalize(vec3(-gw.x,1.0,-gw.y));vec3 V=normalize(cameraPosition-vWp);float cv=max(dot(N,V),0.0);
      float F=(0.03+0.75*pow(1.0-cv,4.0))*smoothstep(0.0,0.05,d);float cs=cloudShadow(p);
      vec4 rc=uReflMat*vec4(vWp,1.0);vec2 ruv=rc.xy/rc.w+N.xz*0.035;vec3 refl=texture2D(uRefl,clamp(ruv,0.002,0.998)).rgb;
      float Tl=dot(exp(-vec3(1.6,0.6,0.5)*d*0.9),vec3(0.3,0.4,0.3));
      vec3 scat=toLin(mix(vec3(0.26,0.78,0.74),vec3(0.06,0.42,0.46),smoothstep(0.3,1.3,d)))*(0.3+0.7*cs)*(0.04+0.96*uDay);
      vec3 col=scat*(1.0-Tl)*(1.0-F)+refl*F;float A=1.0-Tl*(1.0-F);
      vec3 Rf=reflect(-V,N);float glint=pow(max(dot(Rf,uSunW),0.0),500.0);col+=uSunC*step(0.5,glint+0.35*hash21(floor(p*7.0)))*glint*5.0*cs;A=min(1.0,A+glint*0.5);
      foam+=(1.0-smoothstep(0.02,0.14,d))*smoothstep(0.35,0.62,vnoise(q*vec2(2.0,7.0)-vec2(uFlowClk*1.4,0.0)))*smoothstep(0.0,0.015,d);
      foam+=0.5*fl*smoothstep(0.66,0.82,vnoise(q*vec2(0.9,3.6)-vec2(uFlowClk*1.7,0.0)))*smoothstep(0.3,0.8,d);
      foam=clamp(foam,0.0,1.0);vec3 fc=vec3(0.95,0.98,1.0)*(0.08+0.92*uDay)*(0.65+0.35*cs);
      col=col/max(A,1e-3);col=mix(col,fc,foam*0.9);col+=ring*0.2*uDay;A=max(A,foam*0.9);
      gl_FragColor=vec4(col,A);
      #include <colorspace_fragment>
      #include <fog_fragment>
    }`,
});
Object.assign(waterMat.uniforms, U); waterMat.uniforms.uRefl = { value: reflRT.texture }; waterMat.uniforms.uRocks = { value: ROCKV };
let water;
{ const pos = [], flow = [], depA = [], idx = [];
  for (const t of [tA, tB]) { const { pos: P, idx: I } = sectorGrid(t.c, mobile ? 44 : 60), base = pos.length / 3, keep = [];
    for (let i = 0; i < P.length / 3; i++) { const x = P[i * 3], z = P[i * 3 + 2], ri = riverInfo(x, z), dep = WATER_Y - heightAt(x, z); keep.push(dep > -0.2);
      const pool = Math.hypot(x - SPRING[0], z - SPRING[1]) < POOL_R + 1, sp = pool ? 0.25 : Math.min(1, 0.4 + 0.6 * (1 - ri.d / (riverHalfWidth(ri.s) + 0.5)));
      pos.push(x, WATER_Y, z); flow.push(ri.tx * sp, ri.tz * sp); depA.push(dep); }
    for (let i = 0; i < I.length; i += 3) if (keep[I[i]] || keep[I[i + 1]] || keep[I[i + 2]]) idx.push(base + I[i], base + I[i + 1], base + I[i + 2]); }
  const L = latticeGeometry(0, 150, 0.9, P => outside(P) && P.some(([x, z]) => waterDist(x, z) < 1.4)), base = pos.length / 3;
  for (let i = 0; i < L.pos.length / 3; i++) { const x = L.pos[i * 3], z = L.pos[i * 3 + 2], ri = riverInfo(x, z); pos.push(x, WATER_Y - 0.06, z); flow.push(ri.tx, ri.tz); depA.push(WATER_Y + 0.04 - heightAt(x, z)); }
  for (const v of L.idx) idx.push(base + v);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('flow', new THREE.Float32BufferAttribute(flow, 2));
  g.setAttribute('dep', new THREE.Float32BufferAttribute(depA, 1)); g.setIndex(idx); water = new THREE.Mesh(g, waterMat); water.renderOrder = 2; scene.add(water); }
// o reflexo: a câmera espelhada no plano da água desenha o que fica acima dela (sem capim e sem chuva, para sair barato)
const mirrorCam = new THREE.PerspectiveCamera(), reflClip = [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)];
const BIAS = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
function renderReflection() {
  const wy = WATER_Y - U.uWaterDrop.value, cp = camera.position, tg = controls.target;
  mirrorCam.copy(camera); mirrorCam.position.set(cp.x, 2 * wy - cp.y, cp.z); mirrorCam.up.set(0, 1, 0); mirrorCam.lookAt(tg.x, 2 * wy - tg.y, tg.z); mirrorCam.updateMatrixWorld();
  mirrorCam.projectionMatrix.copy(camera.projectionMatrix); mirrorCam.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
  waterMat.uniforms.uReflMat.value.multiplyMatrices(BIAS, mirrorCam.projectionMatrix).multiply(mirrorCam.matrixWorldInverse);
  reflClip[0].constant = -wy; water.visible = grass.visible = rain.visible = false; skyDome.position.copy(mirrorCam.position);
  renderer.shadowMap.autoUpdate = false; renderer.clippingPlanes = reflClip; renderer.setRenderTarget(reflRT); renderer.render(scene, mirrorCam);
  renderer.setRenderTarget(null); renderer.clippingPlanes = []; renderer.shadowMap.autoUpdate = true;
  water.visible = grass.visible = rain.visible = true; skyDome.position.copy(cp);
}

// ---------- chuva: riscos caindo na velocidade terminal e inclinados pelo vento (tudo na GPU)
const DROPS = mobile ? 4500 : 9000;
const rainGeo = new THREE.BufferGeometry(); { const p = new Float32Array(DROPS * 6), sd = new Float32Array(DROPS * 6), tip = new Float32Array(DROPS * 2);
  for (let i = 0; i < DROPS; i++) { const a = rnd(), b = rnd(), c = rnd(); for (let k = 0; k < 2; k++) { sd.set([a, b, c], (i * 2 + k) * 3); tip[i * 2 + k] = k; } }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(p, 3)); rainGeo.setAttribute('seed', new THREE.BufferAttribute(sd, 3)); rainGeo.setAttribute('tip', new THREE.BufferAttribute(tip, 1)); }
const rainMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uTime: U.uTime, uRain: U.uRain, uBox: { value: new THREE.Vector3() }, uVel: { value: new THREE.Vector3(0, -7, 0) }, uCol: { value: new THREE.Color(0.8, 0.85, 0.9) } },
  vertexShader: `attribute vec3 seed;attribute float tip;uniform float uTime,uRain;uniform vec3 uBox,uVel;varying float vA;
    void main(){float H=46.0;float fall=-uVel.y;float t=mod(uTime*fall+seed.y*H,H);vec3 p=uBox+vec3((seed.x-0.5)*84.0,H-t-6.0,(seed.z-0.5)*84.0);
      p.xz-=uVel.xz*(t/fall);p-=uVel*0.075*tip;vA=step(seed.x*0.37+seed.z*0.63,uRain*1.05)*(1.0-tip*0.6);gl_Position=projectionMatrix*viewMatrix*vec4(p,1.0);}`,
  fragmentShader: `uniform vec3 uCol;varying float vA;void main(){if(vA<0.01)discard;gl_FragColor=vec4(uCol,vA*0.55);}` });
const rain = new THREE.LineSegments(rainGeo, rainMat); rain.frustumCulled = false; rain.renderOrder = 5; scene.add(rain);

// ---------- clima: o motor do jogo + o que a pessoa escolhe nos controles
const atm = ATM.Sky('previa-3d');
const ST = { hour: 15, seca: false, rain: 'auto', wind: 'auto', run: false, tf: 9, wet: 0.1, secaV: 0 };
const hourToTf = h => h >= 6 && h <= 18 ? h - 6 : h > 18 && h <= 21 ? 12 + (h - 18) / 3 : h > 21 ? 13 + (h - 21) / 3 : h < 3 ? 14 + h / 3 : 15 + (h - 3) / 3;
const WIND_SET = { calmo: 1.2, brisa: 3.8, forte: 9.5 }, RAIN_SET = { sem: 0, garoa: 2.5, forte: 28 };
const C = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace), lerpC = (a, b, t) => a.clone().lerp(b, Math.max(0, Math.min(1, t)));
function climate(dt) {
  if (ST.run) { ST.tf += dt / 40; ST.hour = ATM.hourOf(ST.tf % 16); } else ST.tf = Math.floor(ST.tf / 16) * 16 + hourToTf(ST.hour);
  const o = atm.step(dt, { tf: ST.tf, phase: ST.seca ? 1 : 0, sp: 0.45, map: { m: 0.6, veg: 0.5, vila: 0 }, season: ST.seca ? 2 : 1, slen: ST.seca ? 4 : 8, left: 99, focus: [0, 0] });
  const base = ST.wind === 'auto' ? o.wind.base : WIND_SET[ST.wind], wl = Math.hypot(o.wind.bx, o.wind.by) || 1;
  U.uWindDir.value.set(o.wind.bx / wl, o.wind.by / wl); U.uWindBase.value = base; U.uWindIu.value = o.wind.iu; U.uWadv.value.addScaledVector(U.uWindDir.value, base * dt);
  U.uCloudOff.value.x -= o.steer[0] * dt * 6; U.uCloudOff.value.y -= o.steer[1] * dt * 6;
  const Rr = ST.rain === 'auto' ? o.R : RAIN_SET[ST.rain], rainAmt = Math.min(1, Math.sqrt(Rr / 25));
  U.uRain.value += (rainAmt - U.uRain.value) * Math.min(1, dt * 1.5);
  ST.wet = Math.max(0, Math.min(1, ST.wet + dt * (Rr > 0.2 ? 0.02 + Rr * 0.004 : -(ST.seca ? 0.012 : 0.005)))); U.uWet.value = ST.wet;
  ST.secaV += ((ST.seca ? 1 : 0) - ST.secaV) * Math.min(1, dt * 0.8); U.uSeca.value = ST.secaV; U.uWaterDrop.value = ST.secaV * 0.32;
  const cov = Math.min(1, 0.12 + o.cv.Cu * 1.3 + o.cv.Sc * 0.8 + o.cv.Cb * 1.2 + rainAmt * 0.9); U.uCloudCov.value += (cov - U.uCloudCov.value) * Math.min(1, dt * 0.5);
  // o sol de verdade (latitude do Cerrado, dia do ano da estação)
  const sp = ATM.sun(ST.seca ? 225 : 15, ST.hour), el = sp.elev * Math.PI / 180, az = sp.az * Math.PI / 180;
  const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)); U.uSunW.value.copy(dir);
  const oc = Math.min(1, o.oc + rainAmt * 0.7), day = THREE.MathUtils.smoothstep(sp.elev, -5, 7), low = THREE.MathUtils.smoothstep(sp.elev, 1, 32), night = 1 - day;
  U.uDay.value = day;
  // paleta do céu: azul profundo no alto, horizonte claro; laranja e rosa no fim de tarde; cinza com chuva; anil de noite
  const zen = lerpC(lerpC(lerpC(C(0.22, 0.48, 0.86), C(0.36, 0.42, 0.62), (1 - low) * day), C(0.5, 0.56, 0.62), oc * 0.85), C(0.02, 0.04, 0.12), night);
  const hor = lerpC(lerpC(lerpC(C(0.68, 0.84, 0.95), C(1.0, 0.70, 0.46), (1 - low) * day * 0.85), C(0.70, 0.74, 0.76), oc * 0.8), C(0.06, 0.09, 0.2), night);
  if (ST.seca) hor.lerp(C(0.92, 0.84, 0.70), 0.3 * day * (1 - oc));
  U.uSkyZen.value.copy(zen); U.uSkyHor.value.copy(hor);
  U.uSunC.value.setRGB(1.0, 0.72 + 0.26 * low, 0.48 + 0.46 * low).multiplyScalar(day * (1 - 0.75 * oc));
  sun.position.copy(sun.target.position).addScaledVector(dir, 200); sun.color.setRGB(1.0, 0.8 + 0.18 * low, 0.62 + 0.34 * low);
  sun.intensity = 2.5 * day * (1 - 0.7 * oc) * (1 - 0.3 * rainAmt); moon.intensity = night * 0.9 * (1 - oc * 0.6);
  skyLight.color.copy(zen).lerp(C(1, 1, 1), 0.25); skyLight.groundColor.setRGB(0.42, 0.34, 0.22).multiplyScalar(0.4 + 0.6 * day);
  skyLight.intensity = (0.45 + 0.6 * day) * (1 + 0.6 * oc);
  U.uRim.value.copy(hor).multiplyScalar(0.35 * day + 0.08);
  // névoa azul: o longe fica azulado (perspectiva aérea); mais densa com chuva e neblina
  scene.fog.color.copy(hor).lerp(zen, 0.08); scene.fog.density = 0.0018 + rainAmt * 0.0016 + o.fog * 0.006;
  rainMat.uniforms.uBox.value.copy(controls.target);
  const ms = Math.max(base, o.wind.ms) * (ST.wind === 'auto' ? 1 : base / Math.max(0.5, o.wind.base));
  rainMat.uniforms.uVel.value.set(U.uWindDir.value.x * ms * 0.9, -6.5, U.uWindDir.value.y * ms * 0.9); rainMat.uniforms.uCol.value.setRGB(0.85, 0.9, 0.95).multiplyScalar(0.35 + 0.65 * day);
  return { Rr, base };
}

// ---------- controles
function chips(id, key, vals) { const box = $(id); box.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; ST[key] = vals ? vals(b.dataset.v) : b.dataset.v;
  for (const x of box.querySelectorAll('button')) x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); }
chips('cEst', 'seca', v => v === 'seca'); chips('cChuva', 'rain'); chips('cVento', 'wind'); chips('cTempo', 'run', v => v === 'run');
$('hora').addEventListener('input', e => { ST.hour = +e.target.value; ST.run = false; for (const x of $('cTempo').querySelectorAll('button')) x.setAttribute('aria-pressed', x.dataset.v === 'stop' ? 'true' : 'false'); });
$('painelBtn').addEventListener('click', () => { const p = $('painel'); p.hidden = !p.hidden; $('painelBtn').setAttribute('aria-expanded', String(!p.hidden)); });

// ---------- laço: tempo, clima, desenho; se o celular sofrer, baixa a resolução
const clock = new THREE.Clock(); let fpsT = 0, fpsN = 0, slow = 0;
const fmtH = h => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60) % 60).padStart(2, '0')}`;
function frame() {
  const dt = Math.min(0.1, clock.getDelta()); U.uTime.value += dt; U.uFlowClk.value += dt * (0.55 + U.uRain.value * 0.5);
  const c = climate(dt); controls.update();
  props.update(dt, { pxPerUnit: renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360)) });
  renderReflection();
  renderer.render(scene, camera);
  fpsN++; fpsT += dt; if (fpsT > 1) { const fps = fpsN / fpsT; $('info').textContent = `${fmtH(ST.hour)} · ${ST.seca ? 'Seca' : 'Águas'} · vento ${c.base.toFixed(1)} m/s · ${c.Rr > 0.2 ? `chuva ${c.Rr.toFixed(0)} mm/h` : 'sem chuva'} · ${fps.toFixed(0)} qps`;
    $('hora').value = ST.hour; if (fps < 26 && dpr > 1) { if (++slow >= 2) { dpr = Math.max(1, dpr - 0.3); renderer.setPixelRatio(dpr); resize(); slow = 0; } } else slow = 0; fpsN = 0; fpsT = 0; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__previa = { ST, U, renderer, scene, camera, controls };
