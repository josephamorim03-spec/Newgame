// Afluente · prévia 3D, no espírito de Zelda: Breath of the Wild. A física é de verdade (o sol na latitude do Cerrado,
// vento médio com rajadas que andam com o ar, chuva, umidade, seca, tudo do motor Atmos do jogo), mas o desenho é
// pintado: luz em faixas suaves, sombras azuladas pela luz do céu, brilho de contorno contra o sol, cores vivas,
// céu com nuvens fofas e a névoa azul que deixa o longe azulado.
import * as THREE from 'three';
import { OrbitControls } from './addons/OrbitControls.js';
import { mergeGeometries } from './addons/BufferGeometryUtils.js';
import { NOISE, WIND, CLOUDS } from './glsl.js';
import { U, HEAD, LIGHT_END, shared, ramp, toon } from './mat.js';
import { hexEdgeDist } from './world.js';
import { R, TILES, CENTER, RIVER, riverHalfWidth, heightAt, riverInfo, waterDist, biomeAt, SPRING, POOL_R, WATER_Y, vnoise, inHex, inAnyTile, dirtAt, fieldAt, blocked, LAYOUT, rockyAt, waterLevelAt, riverLevel, FALL, CLIFF_X, DROP, LAKE, lakeDist } from './world.js';
import { buildProps } from './props.js';
import { buildFauna } from './fauna.js';
import { buildPeople } from './people.js';
import { buildClouds } from './clouds.js';
import { buildSkyFx } from './skyfx.js';
import { tag, audit, person } from './regua.js';
import { createGameCamera } from './camera.js';
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
controls.target.set(CENTER[0], 7, CENTER[1] - 4);
camera.position.set(CENTER[0] + 14, 31, CENTER[1] + 110);
// celular em pé: a câmera sobe e se afasta para as 4 peças caberem na largura estreita
if (innerWidth < innerHeight) { controls.target.set(CENTER[0] - 8, 4, CENTER[1] - 4); camera.position.set(CENTER[0] + 16, 62, CENTER[1] + 92); }
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.minDistance = 2; controls.maxDistance = 220;   // câmera livre chega bem perto para inspecionar controls.minPolarAngle = 0.3; controls.maxPolarAngle = 1.42;
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
    if(h>0.0){vec2 p=d.xz/(h+0.08)*900.0+uCloudOff*0.6;float n=fbm2(p*0.0012)*0.7+fbm2(p*0.004)*0.3;float c=smoothstep(1.0-uCloudCov*0.45,1.12-uCloudCov*0.45,n)*0.8;
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
  const n = pos.length / 3, nor = new Float32Array(n * 3), bio = new Float32Array(n * 4), wlA = new Float32Array(n), ex = new Float32Array(n * 3), wd = new Float32Array(n), ou = new Float32Array(n).fill(out), e = 0.35;
  for (let i = 0; i < n; i++) { const x = pos[i * 3], z = pos[i * 3 + 2]; pos[i * 3 + 1] = heightAt(x, z) - drop;
    const hx = heightAt(x + e, z) - heightAt(x - e, z), hz = heightAt(x, z + e) - heightAt(x, z - e), v = new THREE.Vector3(-hx, 2 * e, -hz).normalize();
    nor.set([v.x, v.y, v.z], i * 3); bio.set(biomeAt(x, z), i * 4); wd[i] = waterDist(x, z); wlA[i] = waterLevelAt(x, z); if (!out) ex.set([fieldAt(x, z), dirtAt(x, z), rockyAt(x, z)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('bio', new THREE.BufferAttribute(bio, 4)); g.setAttribute('wd', new THREE.BufferAttribute(wd, 1)); g.setAttribute('ou', new THREE.BufferAttribute(ou, 1)); g.setAttribute('ex', new THREE.BufferAttribute(ex, 3)); g.setAttribute('wlv', new THREE.BufferAttribute(wlA, 1)); g.setIndex(idx); return g;
}
const groundMat = toon();
groundMat.onBeforeCompile = sh => { shared(sh); sh.uniforms.uCenter = { value: new THREE.Vector2(CENTER[0], CENTER[1]) };
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 bio;attribute vec3 ex;attribute float wlv;varying float vWl;varying float vNy;attribute float wd;attribute float ou;varying vec4 vBio;varying vec3 vEx;varying float vWd;varying vec3 vWp;varying float vOu;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBio=bio;vEx=ex;vWd=wd;vOu=ou;vWl=wlv;vNy=normal.y;vWp=(modelMatrix*vec4(transformed,1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec4 vBio;varying vec3 vEx;varying float vWd;varying vec3 vWp;varying float vOu;varying float vWl;varying float vNy;uniform vec2 uCenter;float vHaze;\n' + HEAD + HEXF)
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
      // lajedo: cascalho e areia clara de quartzito entre tufos ralos
      vec3 grav=mix(vec3(0.66,0.60,0.50),vec3(0.84,0.80,0.70),vnoise(p*5.0))*(0.85+0.3*vnoise(p*17.0));col=mix(col,grav,smoothstep(0.25,0.75,vEx.z+(n3-0.5)*0.4)*0.85);
      float bank=1.0-smoothstep(0.0,2.0,vWd);vec3 sand=mix(vec3(0.78,0.66,0.46),vec3(0.86,0.76,0.56),n3);
      col=mix(col,sand,bank*0.55);
      // paredão de pedra onde o chão é íngreme (escarpa da cachoeira): arenito em camadas, com musgo onde respinga
      float steep=1.0-smoothstep(0.45,0.8,vNy);vec3 rock=mix(vec3(0.58,0.50,0.42),vec3(0.72,0.64,0.54),vnoise(vec2(p.x*0.6+p.y,vWp.y*3.2)))*(0.8+0.25*fract(vWp.y*1.7+vnoise(p*0.8)));
      rock=mix(rock,vec3(0.36,0.46,0.24),smoothstep(0.55,0.8,vnoise(p*2.0+vWp.y))*(1.0-smoothstep(1.0,6.0,vWd))*0.7);col=mix(col,rock,steep);
      float wl=vWl-uWaterDrop-0.06*vOu,dep=(wl-vWp.y)*(1.0-smoothstep(0.3,1.2,vWd)),under=smoothstep(-0.02,0.05,dep);
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
const FIELD = { size: 240, res: 320 };
const fieldTex = (() => { const N = FIELD.res, d = new Float32Array(N * N * 4), x0 = CENTER[0] - FIELD.size / 2, z0 = CENTER[1] - FIELD.size / 2;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = x0 + (i + 0.5) / N * FIELD.size, z = z0 + (j + 0.5) / N * FIELD.size, k = (j * N + i) * 4;
    const inT = inAnyTile(x, z, 0.995); d[k] = heightAt(x, z) - (inT ? 0 : 0.1); if (!inT) continue;
    const b = biomeAt(x, z), wd = waterDist(x, z);
    d[k + 1] = wd < 0.35 ? 0 : Math.min(1, b[0] * 1.0 + b[2] * 0.92 + b[1] * 0.2) * (0.85 + 0.3 * (vnoise(x * 0.3, z * 0.3) - 0.5));
    d[k + 1] *= blocked(x, z, -0.5) ? 0 : (1 - Math.min(1, dirtAt(x, z) * 1.4)) * (1 - 0.9 * fieldAt(x, z)) * (1 - 0.8 * rockyAt(x, z));
    d[k + 2] = (b[2] > 0.5 ? 0.6 + 0.4 * vnoise(x * 0.15, z * 0.15) : b[1] > 0.5 ? 0.24 : 0.26 + 0.24 * vnoise(x * 0.2 + 7, z * 0.2)) * (wd < 2.5 && wd > 0.35 ? 1.5 : 1);
    d[k + 3] = b[2] > 0.5 ? 1 : b[1] > 0.5 ? 0.5 : 0; }
  const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat, THREE.FloatType); t.minFilter = t.magFilter = THREE.LinearFilter; t.needsUpdate = true; return t; })();
const BLADES = mobile ? 70000 : 140000;
const bladeBase = (() => { const g = new THREE.InstancedBufferGeometry(), seg = 4, pos = [], uv = [], nor = [], idx = [];
  for (let i = 0; i <= seg; i++) { const v = i / seg, w = 1 - v * 0.92; pos.push(-0.5 * w, v, 0, 0.5 * w, v, 0); uv.push(0, v, 1, v); nor.push(0, 0, 1, 0, 0, 1); }
  for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx); return g; })();
// cada lâmina tem lugar fixo dentro das peças, sorteado conforme a densidade do capim ali (nada se perde na água ou na mata fechada);
// cada peça vira um pedaço separado, com sua esfera de limite, para a câmera descartar o que não vê
const bladeGeos = (() => { const per = TILES.map(() => ({ sd: [], bp: [] })), F = fieldTex.image.data, N = FIELD.res;
  for (let i = 0, guard = 0; i < BLADES && guard < BLADES * 60; guard++) { const ti = Math.floor(rnd() * TILES.length), t = TILES[ti], x = t.c[0] + (rnd() - 0.5) * 2 * R, z = t.c[1] + (rnd() - 0.5) * 2 * R;
    if (!inHex(x, z, t.c, 0.995)) continue; const fi = Math.min(N - 1, Math.floor((x - CENTER[0] + FIELD.size / 2) / FIELD.size * N)), fj = Math.min(N - 1, Math.floor((z - CENTER[1] + FIELD.size / 2) / FIELD.size * N));
    if (rnd() > F[(fj * N + fi) * 4 + 1]) continue; per[ti].bp.push(x, z); per[ti].sd.push(rnd(), rnd(), rnd(), rnd()); i++; }
  return per.map((q, ti) => { const g = new THREE.InstancedBufferGeometry(); g.index = bladeBase.index; for (const k of ['position', 'uv', 'normal']) g.setAttribute(k, bladeBase.attributes[k]);
    g.setAttribute('seed', new THREE.InstancedBufferAttribute(new Float32Array(q.sd), 4)); g.setAttribute('bpos', new THREE.InstancedBufferAttribute(new Float32Array(q.bp), 2));
    g.instanceCount = q.bp.length / 2; g.userData.full = g.instanceCount; g.userData.c = TILES[ti].c; g.boundingSphere = new THREE.Sphere(new THREE.Vector3(TILES[ti].c[0], 0, TILES[ti].c[1]), R + 2); return g; }); })();
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
const grass = new THREE.Group(); for (const g of bladeGeos) { const m = new THREE.Mesh(g, grassMat); m.receiveShadow = true; grass.add(m); } scene.add(grass);

// ---------- árvores: copas em ramos de folhas (volume macio, luz em faixas e contorno claro), troncos tortos do cerrado,
// mata de galeria alta, buritis em leque e ipês (amarelos na seca)
const barkTex = barkTexture(5);
const TEX = { cerrado: leafTexture(7, { n: 110, size: 26, round: 0.62, spread: 0.4 }), mata: leafTexture(9, { n: 170, size: 22, round: 0.5, spread: 0.42 }),
  ipe: leafTexture(13, { n: 140, size: 18, round: 0.65, spread: 0.4 }), buriti: fanTexture(11) };
const LEAFC = { pequi: 0x4f7a2a, lobeira: 0x9aaa78, pinheiro: 0x3f6a34, ipeRosa: 0x8fb33c, ipeBranco: 0x8fb33c, cerrado: 0x9fbf3e, mata: 0x5f9a33, ipe: 0x8fb33c, buriti: 0x8cc04a, sombra: 0x86b23c };
// o que chega perto demais da lente (copas altas quando a câmera desce no zoom) se desfaz em pontilhado, sem tapar o mapa
const NEAR_FADE = `{vec3 ab=uFocus-cameraPosition;float t=clamp(dot(vWp-cameraPosition,ab)/dot(ab,ab),0.0,1.0),dl=length(vWp-cameraPosition-ab*t),rr=2.5+0.12*length(ab);
  float fade=max((1.0-smoothstep(rr*0.6,rr,dl))*(1.0-smoothstep(0.7,0.9,t))*0.9,1.0-smoothstep(3.0,7.0,distance(vWp,cameraPosition)));
  if(hash21(floor(gl_FragCoord.xy))<fade)discard;}\n`;   // entre a câmera e o ponto que se olha, as copas abrem uma janela pontilhada
function treeMaterials(kind) {
  const wood = toon({ map: barkTex, color: kind === 'buriti' ? 0xb8a98a : kind === 'mata' ? 0xa08a6c : 0x8f7356 });
  const leaf = toon({ map: TEX[kind], alphaTest: 0.5, side: THREE.DoubleSide, color: LEAFC[kind] });
  const dry = { cerrado: 0.5, mata: 0.05, ipe: 1, ipeRosa: 1, ipeBranco: 1, buriti: 0.1, sombra: 0.2, pequi: 0.15, lobeira: 0.3, pinheiro: 0 }[kind];
  const bloom = new THREE.Color({ ipeRosa: 0xf27aaa, ipeBranco: 0xf8f4ec }[kind] || 0xffd12a);   // ipê amarelo, rosa ou branco, florindo na seca
  const sway = (sh, isLeaf, depth) => { shared(sh); sh.uniforms.uDry = { value: dry }; sh.uniforms.uBloom = { value: bloom };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float flex;attribute float lr;attribute float ao;attribute float tint;varying float vLr;varying vec3 vWp;varying float vAo;varying float vTint;\n' + NOISE + WIND)
      .replace('#include <begin_vertex>', /* glsl */`#include <begin_vertex>
        vec3 tp=(modelMatrix*vec4(0.0,0.0,0.0,1.0)).xyz;float hs=hash21(tp.xz);
        float q=windQ(windAt(tp.xz)),f=flex*flex,w=1.6+1.4*hs;
        float sw=(0.06*q+0.022*q*sin(uTime*w+hs*40.0)+0.004*sin(uTime*0.9+hs*9.0))*f;
        vec3 dw=vec3(uWindDir.x,0.0,uWindDir.y)*sw*8.0;
        ${isLeaf ? 'dw+=vec3(sin(uTime*11.0+position.x*3.1+lr*20.0),sin(uTime*13.0+position.z*2.3)*0.5,cos(uTime*10.0+position.y*2.7))*0.05*(0.25+q)*flex;' : ''}
        transformed+=inverse(mat3(modelMatrix))*dw;vLr=lr;vAo=ao;vTint=tint;vWp=(modelMatrix*vec4(transformed,1.0)).xyz;`);
    if (depth) { sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vLr;varying vec3 vWp;varying float vAo;varying float vTint;\n'); return; }
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vLr;varying vec3 vWp;varying float vAo;varying float vTint;uniform float uDry;uniform vec3 uBloom;\n' + HEAD)
      .replace('#include <map_fragment>', NEAR_FADE + (isLeaf ? /* glsl */`#include <map_fragment>
        if(vLr<uSeca*uDry*0.5)discard;
        vec3 ochre=vec3(0.86,0.58,0.24)*dot(diffuseColor.rgb,vec3(0.45)),yel=uBloom*(0.75+0.45*dot(diffuseColor.rgb,vec3(0.33)));
        diffuseColor.rgb=uDry>0.9?mix(diffuseColor.rgb,yel,uSeca):mix(diffuseColor.rgb,ochre,uSeca*uDry*step(0.5,fract(vLr*7.3)));
        diffuseColor.rgb*=(0.92+0.16*fract(vLr*13.7))*mix(0.42,1.12,vAo)*mix(vec3(1.06,1.0,0.82),vec3(0.9,1.02,1.06),vTint);` : '#include <map_fragment>\ndiffuseColor.rgb*=mix(1.0,0.72,uWet);'))
      .replace('#include <lights_fragment_end>', LIGHT_END(isLeaf ? '2.2' : 0)); };
  wood.onBeforeCompile = sh => sway(sh, false, false); leaf.onBeforeCompile = sh => sway(sh, true, false);
  const leafDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: TEX[kind], alphaTest: 0.5 }); leafDepth.onBeforeCompile = sh => sway(sh, true, true);
  const woodDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }); woodDepth.onBeforeCompile = sh => sway(sh, false, true);
  return { wood, leaf, leafDepth, woodDepth };
}
const MATS = { cerrado: treeMaterials('cerrado'), mata: treeMaterials('mata'), ipe: treeMaterials('ipe'), buriti: treeMaterials('buriti') };
TEX.sombra = TEX.cerrado; MATS.sombra = treeMaterials('sombra'); MATS.moita = MATS.cerrado;
TEX.ipeRosa = TEX.ipeBranco = TEX.ipe; MATS.ipeRosa = treeMaterials('ipeRosa'); MATS.ipeBranco = treeMaterials('ipeBranco');
// cerradão e escarpa: pequizeiro (copa larga e redonda, verde-escuro), lobeira (folha grande e acinzentada) e pinheiro-bravo
// (Podocarpus: tronco reto, copa em andares, folhinha estreita verde-escura)
TEX.pequi = TEX.mata; TEX.lobeira = leafTexture(19, { n: 34, size: 46, round: 0.7, spread: 0.36 }); TEX.pinheiro = leafTexture(23, { n: 260, size: 12, round: 0.22, spread: 0.44 });
MATS.pequi = treeMaterials('pequi'); MATS.lobeira = treeMaterials('lobeira'); MATS.pinheiro = treeMaterials('pinheiro');
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
  cerrado: { trunk: [1.5, 2.4], r: 0.22, crook: 0.6, lean: 0.25, branches: 3, levels: 2, spread: 1.05, decay: 0.7, cards: 22, card: 2.1, cluster: 1.7 },
  ipe: { trunk: [2.9, 4.0], r: 0.27, crook: 0.4, lean: 0.12, branches: 3, levels: 2, spread: 0.8, decay: 0.75, cards: 20, card: 2.4, cluster: 2.0 },
  mata: { trunk: [3.6, 5.2], r: 0.36, crook: 0.22, lean: 0.06, branches: 4, levels: 3, spread: 0.85, decay: 0.74, cards: 15, card: 3.2, cluster: 2.6 },
  sombra: { trunk: [2.6, 3.4], r: 0.5, crook: 0.3, lean: 0.08, branches: 5, levels: 3, spread: 1.0, decay: 0.72, cards: 13, card: 3.4, cluster: 2.8 },
  pequi: { trunk: [2.4, 3.2], r: 0.3, crook: 0.4, lean: 0.12, branches: 4, levels: 3, spread: 1.0, decay: 0.7, cards: 14, card: 2.8, cluster: 2.3 },
  lobeira: { trunk: [0.8, 1.2], r: 0.12, crook: 0.6, lean: 0.3, branches: 3, levels: 2, spread: 1.05, decay: 0.68, cards: 9, card: 1.7, cluster: 1.0 },
  pinheiro: { trunk: [6.5, 8.5], r: 0.3, crook: 0.08, lean: 0.04, branches: 7, levels: 2, spread: 1.25, decay: 0.32, cards: 9, card: 2.0, cluster: 1.1 },
  moita: { trunk: [0.3, 0.5], r: 0.05, crook: 0.6, lean: 0.3, branches: 4, levels: 1, spread: 1.1, decay: 1.1, cards: 9, card: 1.3, cluster: 0.9 },
};
function treeMesh(out, H, M) { const g = new THREE.Group();
  const w = new THREE.Mesh(finish(out.wood, H, false), M.wood); w.castShadow = w.receiveShadow = true; w.customDepthMaterial = M.woodDepth;
  const l = new THREE.Mesh(finish(out.leaf, H, true), M.leaf); l.castShadow = l.receiveShadow = true; l.customDepthMaterial = M.leafDepth; g.add(w, l); return g; }
function makeTree(kind, scale = 1) {
  const out = { wood: [], leaf: [], tips: [] }, P = SPECIES[kind] || SPECIES.ipe, th = (P.trunk[0] + rnd() * (P.trunk[1] - P.trunk[0])) * scale;
  limb(out, new THREE.Vector3(0, -0.3, 0), new THREE.Vector3((rnd() - 0.5) * P.lean, 1, (rnd() - 0.5) * P.lean).normalize(), th, P.r * scale * 1.3, P.r * scale * 0.85, 0, P);
  if (P.r > 0.1) { const rr = P.r * scale * 1.3, fl = new THREE.CylinderGeometry(rr, rr * 1.9, 0.7, 7, 1, true), uvA = fl.attributes.uv;
    for (let k = 0; k < uvA.count; k++) uvA.setXY(k, uvA.getX(k) * 2, uvA.getY(k) * 0.5); fl.translate(0, 0.05, 0); out.wood.push(fl); }
  let H = 0; for (const t of out.tips) H = Math.max(H, t.y); const center = out.tips.reduce((a, t) => a.add(t), new THREE.Vector3()).multiplyScalar(1 / out.tips.length);
  leafCards(out, out.tips, center, { ...P, card: P.card * scale, cluster: P.cluster * scale }); const tm = treeMesh(out, H + P.cluster * scale, MATS[kind]); tm.userData.kind = kind; return tag(tm, { pequi: 'pequizeiro', lobeira: 'lobeira', pinheiro: 'pinheiro-bravo', cerrado: 'árvore do cerrado', ipe: 'ipê', ipeRosa: 'ipê', ipeBranco: 'ipê', mata: 'árvore da mata de galeria', sombra: 'árvore de sombra do pasto', moita: 'moita' }[kind]);
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
  return tag(treeMesh(out, H + 3, MATS.buriti), 'buriti');
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
  const m = new THREE.Mesh(g, termiteMat); m.castShadow = m.receiveShadow = true; return tag(m, 'cupinzeiro'); }
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
  const m = new THREE.Mesh(g, stoneMat); m.castShadow = m.receiveShadow = true; return tag(m, 'pedra'); }
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
scatter(tD, 1, () => makeTree('ipe'), () => true, 7); scatter(tD, 1, () => makeTree('ipeRosa'), () => true, 7);
scatter(tC, 1, () => makeTree('ipeRosa', 0.9), () => true, 8);
// pétalas de ipê: na seca, com a árvore florida, caem devagar (~1 m/s), dançam e o vento leva; embaixo forma um tapete da cor da flor
{ const ipes = scene.children.filter(o => /^ipe/.test(o.userData.kind || '')), N = mobile ? 60 : 110, base = [], seed = [], colA = [], rad = [], gyA = [];
  const BL = { ipe: 0xffd12a, ipeRosa: 0xf27aaa, ipeBranco: 0xf8f4ec };
  for (const t of ipes) { const bb = new THREE.Box3().setFromObject(t.children[1] || t), c = bb.getCenter(new THREE.Vector3()), r = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) / 2, cc = new THREE.Color(BL[t.userData.kind]);
    for (let i = 0; i < N; i++) { base.push(c.x, bb.max.y * 0.8 + bb.min.y * 0.2, c.z); seed.push(rnd()); colA.push(cc.r, cc.g, cc.b); rad.push(r * 0.8); gyA.push(heightAt(c.x, c.z)); }
    const carpet = new THREE.Mesh(new THREE.CircleGeometry(r * 1.15, 28).rotateX(-Math.PI / 2), petalCarpet(cc)); carpet.position.set(c.x, heightAt(c.x, c.z) + 0.05, c.z); carpet.renderOrder = 3; scene.add(carpet); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(base, 3)); g.setAttribute('seed', new THREE.Float32BufferAttribute(seed, 1));
  g.setAttribute('pcol', new THREE.Float32BufferAttribute(colA, 3)); g.setAttribute('rad', new THREE.Float32BufferAttribute(rad, 1)); g.setAttribute('gy', new THREE.Float32BufferAttribute(gyA, 1));
  const pm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uTime: U.uTime, uSeca: U.uSeca, uWindDir: U.uWindDir, uWindBase: U.uWindBase, uDay: U.uDay, uPx: { value: 600 } },
    vertexShader: `attribute float seed,rad,gy;attribute vec3 pcol;uniform float uTime,uSeca,uWindBase,uPx;uniform vec2 uWindDir;varying vec3 vC;varying float vA;
      void main(){float T=max(2.0,position.y-gy)*(0.9+0.25*fract(seed*5.3));float k=fract(uTime/T+seed*7.0);float a=seed*628.3;
        vec3 p=position+vec3(cos(a)*rad*fract(seed*13.1),0.0,sin(a)*rad*fract(seed*13.1));
        float drop=k*T*1.0;p.y-=drop;p.xz+=uWindDir*uWindBase*0.8*k*T*0.5+vec2(sin(uTime*2.3+seed*40.0),cos(uTime*1.9+seed*30.0))*0.35;
        vC=pcol;vA=uSeca*smoothstep(0.6,0.9,uSeca)*(1.0-smoothstep(0.85,1.0,k))*step(0.0,p.y-0.0+50.0);
        vec4 mv=viewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=0.2*uPx/max(1.0,-mv.z)+1.5;}`,
    fragmentShader: `uniform float uDay;varying vec3 vC;varying float vA;void main(){if(vA<0.02)discard;vec2 c=gl_PointCoord-0.5;if(abs(c.x)+abs(c.y)>0.5)discard;gl_FragColor=vec4(vC*(0.3+0.7*uDay),vA);
      #include <colorspace_fragment>
    }` });
  const pts = new THREE.Points(g, pm); pts.frustumCulled = false; scene.add(pts); window.__petalPx = pm.uniforms.uPx; }
function petalCarpet(c) { const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, uniforms: { uSeca: U.uSeca, uC: { value: c }, uDay: U.uDay },
  vertexShader: 'varying vec2 vUv;varying vec3 vWp;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.0);vWp=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
  fragmentShader: `uniform float uSeca,uDay;uniform vec3 uC;varying vec2 vUv;varying vec3 vWp;${NOISE}
    void main(){float r=length(vUv-0.5)*2.0;float n=vnoise(vWp.xz*7.0)*0.6+vnoise(vWp.xz*19.0)*0.4;float a=step(0.42+r*0.35,n)*(1.0-smoothstep(0.7,1.0,r))*smoothstep(0.6,0.95,uSeca);
      if(a<0.01)discard;gl_FragColor=vec4(uC*(0.3+0.7*uDay)*0.95,a);
      #include <colorspace_fragment>
    }` }); return m; }
// canela-de-ema: arbusto do cerrado pedregoso, caules grossos e fibrosos que se bifurcam, tufos de folhas finas e flor lilás nas águas
const canelaMats = { stem: toon({ map: barkTex, color: 0x6a625a }), leaf: toon({ color: 0x7f9c5a, side: THREE.DoubleSide }), flor: toon({ color: 0xb48ad8 }) };
canelaMats.flor.onBeforeCompile = sh => { shared(sh); sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed*=1.0-uSeca;').replace('#include <common>', '#include <common>\nuniform float uSeca;'); };
function makeCanela() {
  const stems = [], leaves = [], flowers = [], H = 0.8 + rnd() * 0.7;
  const grow = (p, d, L, r, depth) => { const e = p.clone().addScaledVector(d, L), g = new THREE.CylinderGeometry(r * 0.8, r, L, 6); g.translate(0, L / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d)); g.translate(p.x, p.y, p.z); stems.push(g);
    if (depth < 2 && rnd() < 0.85) for (let k = 0; k < 2; k++) { const a = rnd() * 6.28, nd = d.clone().add(new THREE.Vector3(Math.cos(a) * 0.55, 0.15, Math.sin(a) * 0.55)).normalize(); grow(e, nd, L * 0.75, r * 0.75, depth + 1); }
    else { for (let k = 0; k < 24; k++) { const b = new THREE.PlaneGeometry(0.035, 0.44).translate(0, 0.22, 0).rotateX(0.25 + rnd() * 0.95).rotateY(rnd() * 6.28); b.translate(e.x, e.y, e.z); leaves.push(b); }
      if (rnd() < 0.8) { const f = new THREE.ConeGeometry(0.04, 0.08, 6).rotateX(Math.PI).translate(e.x, e.y + 0.12, e.z); flowers.push(f); } } };
  grow(new THREE.Vector3(0, -0.05, 0), new THREE.Vector3((rnd() - 0.5) * 0.2, 1, (rnd() - 0.5) * 0.2).normalize(), H * 0.5, 0.1, 0);
  const g = new THREE.Group(); for (const [list, m] of [[stems, canelaMats.stem], [leaves, canelaMats.leaf], [flowers, canelaMats.flor]]) if (list.length) { const me = new THREE.Mesh(mergeGeometries(list.map(x => x.index ? x.toNonIndexed() : x)), m); me.castShadow = me.receiveShadow = true; g.add(me); }
  return tag(g, 'canela-de-ema');
}
scatter(tD, 10, makeCanela, (x, z) => rockyAt(x, z) > 0.35, 1.5);
scatter(tD, 5, makeTermite, () => true, 3);
const tV = TILES.find(t => t.kind === 'vila'), tL = TILES.find(t => t.kind === 'lavoura');
scatter(tV, 2, () => makeTree('sombra', 0.95), () => true, 8);        // mangueiras do quintal
scatter(tV, 5, () => makeTree('moita', 0.8 + rnd() * 0.4), () => true, 3);
scatter(tL, 3, () => makeTree('cerrado', 0.9), () => true, 6);
const [tCa, tLg, tRo, tCd, tPr] = ['cachoeira', 'lagoa', 'roca', 'cerradao', 'praca'].map(k => TILES.find(t => t.kind === k));
// pinheiro-bravo: andares de galhos ao longo do tronco reto, copa estreita em cone
function makePinheiro(scale = 1) { const out = { wood: [], leaf: [], tips: [] }, P = SPECIES.pinheiro, H = (P.trunk[0] + rnd() * 2) * scale;
  const tr = new THREE.CylinderGeometry(0.12 * scale, 0.3 * scale, H, 9, 1, true); tr.translate(0, H / 2 - 0.3, 0); out.wood.push(tr);
  for (let lv = 0; lv < 7; lv++) { const y = H * (0.35 + lv * 0.095), L = (2.4 - lv * 0.3) * scale; for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28 + lv * 0.7, d = new THREE.Vector3(Math.cos(a), 0.25, Math.sin(a)).normalize();
    const b = new THREE.CylinderGeometry(0.02 * scale, 0.06 * scale, L, 5, 1, true); b.translate(0, L / 2, 0); b.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d)); b.translate(0, y, 0); out.wood.push(b);
    out.tips.push(new THREE.Vector3(0, y, 0).addScaledVector(d, L * 0.75)); } }
  out.tips.push(new THREE.Vector3(0, H + 0.4, 0)); const center = new THREE.Vector3(0, H * 0.7, 0);
  leafCards(out, out.tips, center, { ...P, card: P.card * scale, cluster: P.cluster * scale }); const tm = treeMesh(out, H + 1, MATS.pinheiro); tm.userData.kind = 'pinheiro'; return tag(tm, 'pinheiro-bravo'); }
// frutos: pequi (verde-amarelado, do tamanho de uma laranja) e fruta-do-lobo (verde, grande) pendurados na copa
const fruitMat = toon({ vertexColors: true });
function addFruits(tree, color, n, r) { const bb = new THREE.Box3().setFromObject(tree), parts = []; tree.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(tree.matrixWorld).invert();
  for (let k = 0; k < n; k++) { const a = rnd() * 6.28, c = bb.getCenter(new THREE.Vector3()), rx = (bb.max.x - bb.min.x) / 2 * 0.85, rz = (bb.max.z - bb.min.z) / 2 * 0.85;
    const p = new THREE.Vector3(c.x + Math.cos(a) * rx * Math.sqrt(rnd()), bb.min.y + (bb.max.y - bb.min.y) * (0.35 + rnd() * 0.3), c.z + Math.sin(a) * rz * Math.sqrt(rnd())).applyMatrix4(inv);
    const g = new THREE.SphereGeometry(r, 8, 6).translate(p.x, p.y, p.z); const cc = new THREE.Color(color).multiplyScalar(0.85 + rnd() * 0.3), ca = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < ca.length; i += 3) ca.set([cc.r, cc.g, cc.b], i);
    g.setAttribute('color', new THREE.BufferAttribute(ca, 3)); g.deleteAttribute('uv'); parts.push(g); }
  const m = new THREE.Mesh(mergeGeometries(parts), fruitMat); m.castShadow = true; m.userData.noRegua = true; tree.add(m); }
// cerradão: mata fechada de pequizeiros, lobeiras e árvores do cerrado, com sub-bosque
scatter(tCd, 6, () => { const t = makeTree('pequi', 0.95 + rnd() * 0.25); addFruits(t, 0xb8c040, 18, 0.05); return t; }, () => true, 6.5);
scatter(tCd, 7, () => { const t = makeTree('lobeira', 0.9 + rnd() * 0.3); addFruits(t, 0x7a9a3a, 5, 0.07); return t; }, () => true, 3.5);
scatter(tCd, 8, () => makeTree('cerrado', 0.9 + rnd() * 0.3), () => true, 4.5);
scatter(tCd, 10, () => makeTree('moita', 0.8 + rnd() * 0.4), () => true, 2.2);
scatter(tCd, 1, () => makeTree('ipeBranco'), () => true, 6);
scatter(tCd, 4, makeTermite, () => true, 3);
// cachoeira: pinheiros-bravos na beira da escarpa, mata ciliar no cânion, buritis lá embaixo
scatter(tCa, 6, () => makePinheiro(0.9 + rnd() * 0.3), (x, z) => x < CLIFF_X - 2 && waterDist(x, z) > 2.5, 5);
scatter(tCa, 6, () => makeTree('mata', 0.85 + rnd() * 0.3), (x, z) => { const w = waterDist(x, z); return w > 1.8 && w < 9 && Math.abs(x - CLIFF_X) > 3; }, 4.5);
scatter(tCa, 2, makeBuriti, (x, z) => x > CLIFF_X + 3 && waterDist(x, z) > 1 && waterDist(x, z) < 4, 4);
scatter(tCa, 6, () => makeTree('moita', 0.8 + rnd() * 0.4), (x, z) => Math.abs(x - CLIFF_X) > 2.5 && waterDist(x, z) > 1.2, 2.5);
scatter(tB, 3, () => makePinheiro(0.85 + rnd() * 0.2), (x, z) => waterDist(x, z) > 6, 6);
// lagoa: buritis e mata ciliar na beira
scatter(tLg, 5, makeBuriti, (x, z) => { const d = lakeDist(x, z); return d > 1 && d < 4; }, 4);
scatter(tLg, 5, () => makeTree('mata', 0.8 + rnd() * 0.3), (x, z) => { const d = lakeDist(x, z); return d > 4 && d < 10; }, 5);
scatter(tLg, 5, () => makeTree('moita', 0.8 + rnd() * 0.4), (x, z) => lakeDist(x, z) > 2.5, 2.5);
// trigo e roça: só umas árvores de sombra na divisa; praça: sombras e ipê-amarelo
scatter(tRo, 2, () => makeTree('sombra', 0.9), (x, z) => hexEdgeDist(x, z, tRo.c) < 4, 9);
scatter(tPr, 3, () => makeTree('sombra', 0.9 + rnd() * 0.15), (x, z) => Math.hypot(x - tPr.c[0], z - tPr.c[1]) > 11, 8);
scatter(tPr, 1, () => makeTree('ipe'), (x, z) => Math.hypot(x - tPr.c[0], z - tPr.c[1]) > 10, 8);
scatter(tPr, 6, () => makeTree('moita', 0.8 + rnd() * 0.4), (x, z) => Math.hypot(x - tPr.c[0], z - tPr.c[1]) > 11, 3);
const props = buildProps(scene, { mobile });
const shadeTree = scene.children.find(o => o.userData.kind === 'sombra' && inHex(o.position.x, o.position.z, tC.c, 1));
const clouds = buildClouds(scene, CENTER, { mobile });
const gente = buildPeople(scene, { mobile });
const skyfx = buildSkyFx(scene, camera, { mobile, focus: () => camMode === 'jogo' ? gameCam.focus : controls.target });
const fauna = buildFauna(scene, { mobile, shade: shadeTree ? [shadeTree.position.x, shadeTree.position.z] : null, termites: scene.children.filter(o => o.userData.regua === 'cupinzeiro').map(o => [o.position.x, o.position.z]),
  treeTops: scene.children.filter(o => ['cerrado', 'mata', 'sombra'].includes(o.userData.kind)).map(o => { const bb = new THREE.Box3().setFromObject(o); return [o.position.x, bb.max.y - 0.6, o.position.z]; }) });
// moitas: o sub-bosque da mata e os arbustos do cerrado, que fecham o vão entre o capim e as copas
scatter(tB, 16, () => makeTree('moita', 0.9 + rnd() * 0.35), (x, z) => { const w = waterDist(x, z); return w > 1.2 && w < 14; }, 2.2);
scatter(tD, 6, () => makeTree('moita', 0.8 + rnd() * 0.5), () => true, 2.5);
scatter(tA, 4, () => makeTree('moita', 0.8 + rnd() * 0.4), (x, z) => { const w = waterDist(x, z); return w > 1.5 && w < 6; }, 2.5);
{ let tries = 0; while (ROCKS_IN_WATER.length < 6 && tries++ < 400) { const i = 4 + Math.floor(rnd() * 220), [x0, z0] = RIVER[i], ri = riverInfo(x0, z0), w = riverHalfWidth(ri.s); if (x0 > CLIFF_X - 6) continue;
    if (!inAnyTile(x0, z0, 0.85) || Math.hypot(x0 - SPRING[0], z0 - SPRING[1]) < POOL_R + 2 || ROCKS_IN_WATER.some(r => Math.hypot(r[0] - x0, r[1] - z0) < 5)) continue;
    const side = rnd() < 0.5 ? -1 : 1, off = side * w * (0.45 + rnd() * 0.45), x = x0 - ri.tz * off, z = z0 + ri.tx * off, size = 0.4 + rnd() * 0.35, flat = 0.75;
    putStone(x, z, size, flat, WATER_Y + 0.12 + rnd() * 0.15 - size * flat * 0.9); ROCKS_IN_WATER.push([x, z, size * 0.95]); }
  for (const t of [tA, tB]) for (let k = 0, n = 0; k < 300 && n < 4; k++) { const x = t.c[0] + (rnd() - 0.5) * 2 * R, z = t.c[1] + (rnd() - 0.5) * 2 * R, w = waterDist(x, z);
    if (!inHex(x, z, t.c, 0.9) || w < 0.1 || w > 2.2 || placed.some(p => Math.hypot(p[0] - x, p[1] - z) < 2.5)) continue; putStone(x, z, 0.25 + rnd() * 0.4, 0.6); n++; }
  for (const [t, n] of [[tD, 9], [tC, 2]]) for (let k = 0, c = 0; k < 400 && c < n; k++) { const x = t.c[0] + (rnd() - 0.5) * 2 * R, z = t.c[1] + (rnd() - 0.5) * 2 * R;
    if (!inHex(x, z, t.c, 0.88) || (t === tD && rockyAt(x, z) < 0.4) || placed.some(p => Math.hypot(p[0] - x, p[1] - z) < 3)) continue; putStone(x, z, 0.3 + rnd() * 0.7, 0.55 + rnd() * 0.25); c++; } }

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
      refl=mix(refl,mix(uSkyHor,uSkyZen,0.35),smoothstep(0.6,1.5,abs(vWp.y-(${WATER_Y.toFixed(3)}-uWaterDrop))));
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
ROCKV[7].set(FALL.pool[0] - FALL.t[0] * 1.2, FALL.pool[1] - FALL.t[1] * 1.2, 2.6);   // a água que cai espuma no poço
// ---------- a queda: cortina d'água em arco (sai da borda e cai ~6 m), riscos brancos descendo, transparente onde é fina
{ const n = [-FALL.t[1], FALL.t[0]], w = riverHalfWidth(FALL.s) * 0.95, top = riverLevel(FALL.s - 2), bot = top - DROP, NU = 14, NV = 18, pos = [], uv = [], idx = [];
  const lip = [FALL.p[0] - FALL.t[0] * 0.6, FALL.p[1] - FALL.t[1] * 0.6];
  for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) { const u = i / NU * 2 - 1, v = j / NV, out = 0.3 + 1.9 * Math.pow(v, 0.6), drop = DROP * v * v * 0.55 + DROP * v * 0.45;
    pos.push(lip[0] + n[0] * u * w * (1 - 0.1 * v) + FALL.t[0] * out, top - drop + 0.03, lip[1] + n[1] * u * w * (1 - 0.1 * v) + FALL.t[1] * out); uv.push(u, v); }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + NU + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const fm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]),
    vertexShader: `varying vec2 vUv;varying vec3 vWp;
#include <fog_pars_vertex>
void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.0);vWp=w.xyz;vec4 mvPosition=viewMatrix*w;gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`,
    fragmentShader: `varying vec2 vUv;varying vec3 vWp;
${HEAD}
#include <fog_pars_fragment>
void main(){float edge=1.0-smoothstep(0.75,1.0,abs(vUv.x));
      float st=vnoise(vec2(vUv.x*22.0,vUv.y*3.0-uTime*2.6))*0.6+vnoise(vec2(vUv.x*55.0,vUv.y*7.0-uTime*4.0))*0.4;
      vec3 deep=toLin(vec3(0.3,0.7,0.68))*(0.3+0.7*uDay),white=vec3(0.95,0.98,1.0)*(0.12+0.88*uDay)*(0.75+0.25*cloudShadow(vWp.xz));
      float wh=smoothstep(0.35,0.75,st+vUv.y*0.35);vec3 col=mix(deep,white,wh);float a=(0.55+0.4*wh)*edge*(1.0-smoothstep(0.92,1.0,vUv.y)*0.5)*(1.0-uWaterDrop*1.5);
      gl_FragColor=vec4(col,a);
#include <colorspace_fragment>
#include <fog_fragment>
}` });
  Object.assign(fm.uniforms, U); const m = new THREE.Mesh(g, fm); m.renderOrder = 3; scene.add(m);
  // borrifo: neblina que sobe do poço e o vento leva; com sol baixo faz um arquinho de cor
  const NP = mobile ? 160 : 320, P = [], S = []; for (let i = 0; i < NP; i++) { P.push(FALL.pool[0] - FALL.t[0] * 1.0, bot, FALL.pool[1] - FALL.t[1] * 1.0); S.push(Math.random()); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); pg.setAttribute('seed', new THREE.Float32BufferAttribute(S, 1));
  const pm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uPx: { value: 600 } },
    vertexShader: `attribute float seed;uniform float uTime,uPx,uWindBase,uDay;uniform vec2 uWindDir;varying float vA;void main(){float k=fract(uTime*0.22+seed*7.0);float a=seed*62.8;
      vec3 p=position+vec3(cos(a)*(0.6+k*2.8),k*4.5,sin(a)*(0.6+k*2.8));p.xz+=uWindDir*uWindBase*k*1.4;vec4 mv=viewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;
      gl_PointSize=(0.4+k*1.6)*uPx/max(1.0,-mv.z);vA=(1.0-k)*smoothstep(0.0,0.1,k)*0.35;}`,
    fragmentShader: `uniform float uDay;varying float vA;void main(){float d=length(gl_PointCoord-0.5);if(d>0.5)discard;gl_FragColor=vec4(vec3(0.94,0.97,1.0)*(0.25+0.75*uDay),vA*(1.0-d*2.0));
#include <colorspace_fragment>
}` });
  Object.assign(pm.uniforms, U, { uPx: pm.uniforms.uPx }); const pts = new THREE.Points(pg, pm); pts.frustumCulled = false; pts.renderOrder = 6; scene.add(pts); window.__mistPx = pm.uniforms.uPx; }
// ---------- lagoa: touceiras de taboa na beira e folhas redondas de ninféia boiando, com flor branca
{ const tb = [], lp = [], fl = [];
  for (let k = 0; k < 900 && tb.length < (mobile ? 40 : 70); k++) { const a = rnd() * 6.283, r = LAKE.r * (0.7 + rnd() * 0.5), x = LAKE.c[0] + Math.cos(a) * r, z = LAKE.c[1] + Math.sin(a) * r, d = lakeDist(x, z); if (d > -1.6 && d < 0.4) tb.push([x, z]); }
  for (let k = 0; k < 900 && lp.length < 60; k++) { const a = rnd() * 6.283, r = LAKE.r * Math.sqrt(rnd()) * 0.9, x = LAKE.c[0] + Math.cos(a) * r, z = LAKE.c[1] + Math.sin(a) * r, d = lakeDist(x, z); if (d < -1.2 && d > -6) lp.push([x, z]); }
  const parts = []; for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28, h = 1.5 + rnd() * 0.6, lean = (rnd() - 0.5) * 0.3; const L = new THREE.PlaneGeometry(0.035, h).translate(0, h / 2, 0).rotateZ(lean).rotateY(a).translate(Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1); parts.push([L, 0x6a9a3a]); }
  for (let i = 0; i < 3; i++) { const a = i * 2.1, h = 1.6 + rnd() * 0.4; parts.push([new THREE.CylinderGeometry(0.008, 0.01, h, 4).translate(0, h / 2, 0).translate(Math.cos(a) * 0.06, 0, Math.sin(a) * 0.06), 0x7a8a3a]);
    parts.push([new THREE.CylinderGeometry(0.03, 0.03, 0.22, 7).translate(Math.cos(a) * 0.06, h - 0.2, Math.sin(a) * 0.06), 0x6a3a1e]); }   // a espiga marrom da taboa
  const tg = mergeGeometries(parts.map(([g, c]) => { const ca = new Float32Array(g.attributes.position.count * 3), cc = new THREE.Color(c); for (let i = 0; i < ca.length; i += 3) ca.set([cc.r, cc.g, cc.b], i); g.setAttribute('color', new THREE.BufferAttribute(ca, 3)); g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; }));
  const tm = toon({ vertexColors: true, side: THREE.DoubleSide }); const ti = new THREE.InstancedMesh(tg, tm, tb.length), M = new THREE.Matrix4();
  tb.forEach(([x, z], i) => { M.compose(new THREE.Vector3(x, Math.max(LAKE.level - 0.1, heightAt(x, z)), z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rnd() * 6.28, 0)), new THREE.Vector3(1, 0.85 + rnd() * 0.3, 1)); ti.setMatrixAt(i, M); });
  ti.castShadow = true; scene.add(ti); tag(ti, 'taboa', 1.15);
  const pad = new THREE.CircleGeometry(0.45, 14, 0.2, 6.0).rotateX(-Math.PI / 2), pm2 = toon({ color: 0x4f8a3a, side: THREE.DoubleSide }), pi = new THREE.InstancedMesh(pad, pm2, lp.length);
  lp.forEach(([x, z], i) => { const s2 = 0.5 + rnd() * 0.9; M.compose(new THREE.Vector3(x, LAKE.level + 0.015, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rnd() * 6.28, 0)), new THREE.Vector3(s2, 1, s2)); pi.setMatrixAt(i, M);
    pi.setColorAt(i, new THREE.Color(0x4f8a3a).multiplyScalar(0.8 + rnd() * 0.4)); if (rnd() < 0.25) fl.push([x + 0.15 * s2, z]); });
  pi.renderOrder = 3; pi.receiveShadow = true; scene.add(pi);
  const fg = new THREE.ConeGeometry(0.09, 0.08, 8).rotateX(Math.PI), fi = new THREE.InstancedMesh(fg, toon({ color: 0xf8f4ec }), fl.length); fl.forEach(([x, z], i) => { M.makeTranslation(x, LAKE.level + 0.07, z); fi.setMatrixAt(i, M); }); scene.add(fi); }
let water;
{ const pos = [], flow = [], depA = [], idx = [];
  for (const t of TILES.filter(t => ['rio', 'mata', 'cachoeira', 'lagoa'].includes(t.kind))) { const { pos: P, idx: I } = sectorGrid(t.c, mobile ? 44 : 60), base = pos.length / 3, keep = [];
    for (let i = 0; i < P.length / 3; i++) { const x = P[i * 3], z = P[i * 3 + 2], ri = riverInfo(x, z), lv = waterLevelAt(x, z), dep = lv - heightAt(x, z); keep.push(dep > -0.2 && waterDist(x, z) < 1.3);   // só onde é rio, poço ou lagoa de verdade
      const still = Math.hypot(x - SPRING[0], z - SPRING[1]) < POOL_R + 1 || lakeDist(x, z) < 3, sp = still ? 0.12 : Math.min(1, 0.4 + 0.6 * (1 - ri.d / (riverHalfWidth(ri.s) + 0.5)));
      pos.push(x, lv, z); flow.push(ri.tx * sp, ri.tz * sp); depA.push(dep); }
    for (let i = 0; i < I.length; i += 3) if (keep[I[i]] || keep[I[i + 1]] || keep[I[i + 2]]) idx.push(base + I[i], base + I[i + 1], base + I[i + 2]); }
  const L = latticeGeometry(0, 150, 0.9, P => outside(P) && P.some(([x, z]) => waterDist(x, z) < 1.4)), base = pos.length / 3;
  for (let i = 0; i < L.pos.length / 3; i++) { const x = L.pos[i * 3], z = L.pos[i * 3 + 2], ri = riverInfo(x, z), lv = waterLevelAt(x, z); pos.push(x, lv - 0.06, z); flow.push(ri.tx, ri.tz); depA.push(lv + 0.04 - heightAt(x, z)); }
  for (const v of L.idx) idx.push(base + v);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('flow', new THREE.Float32BufferAttribute(flow, 2));
  g.setAttribute('dep', new THREE.Float32BufferAttribute(depA, 1)); g.setIndex(idx); water = new THREE.Mesh(g, waterMat); water.renderOrder = 2; scene.add(water); }
// o reflexo: a câmera espelhada no plano da água desenha o que fica acima dela (sem capim e sem chuva, para sair barato)
const mirrorCam = new THREE.PerspectiveCamera(), reflClip = [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)];
const BIAS = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
function renderReflection() {
  const wy = WATER_Y - U.uWaterDrop.value, cp = camera.position, fw = camera.getWorldDirection(new THREE.Vector3()), tg = cp.clone().add(fw);
  mirrorCam.copy(camera); mirrorCam.position.set(cp.x, 2 * wy - cp.y, cp.z); mirrorCam.up.set(0, 1, 0); mirrorCam.lookAt(tg.x, 2 * wy - tg.y, tg.z); mirrorCam.updateMatrixWorld();
  mirrorCam.projectionMatrix.copy(camera.projectionMatrix); mirrorCam.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
  waterMat.uniforms.uReflMat.value.multiplyMatrices(BIAS, mirrorCam.projectionMatrix).multiply(mirrorCam.matrixWorldInverse);
  reflClip[0].constant = -wy; water.visible = grass.visible = rain.visible = skyfx.bowMesh.visible = false; skyDome.position.copy(mirrorCam.position);
  renderer.shadowMap.autoUpdate = false; renderer.clippingPlanes = reflClip; renderer.setRenderTarget(reflRT); renderer.render(scene, mirrorCam);
  renderer.setRenderTarget(null); renderer.clippingPlanes = []; renderer.shadowMap.autoUpdate = true;
  water.visible = grass.visible = rain.visible = true; skyfx.bowMesh.visible = skyfx.fx.bow > 0.005; skyDome.position.copy(cp);
}

// ---------- chuva: riscos caindo na velocidade terminal e inclinados pelo vento (tudo na GPU)
const DROPS = mobile ? 4500 : 9000;
const rainGeo = new THREE.BufferGeometry(); { const p = new Float32Array(DROPS * 6), sd = new Float32Array(DROPS * 6), tip = new Float32Array(DROPS * 2);
  for (let i = 0; i < DROPS; i++) { const a = rnd(), b = rnd(), c = rnd(); for (let k = 0; k < 2; k++) { sd.set([a, b, c], (i * 2 + k) * 3); tip[i * 2 + k] = k; } }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(p, 3)); rainGeo.setAttribute('seed', new THREE.BufferAttribute(sd, 3)); rainGeo.setAttribute('tip', new THREE.BufferAttribute(tip, 1)); }
const rainMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uTime: U.uTime, uRain: U.uRain, uBox: { value: new THREE.Vector3() }, uVel: { value: new THREE.Vector3(0, -7, 0) }, uCol: { value: new THREE.Color(0.8, 0.85, 0.9) } },
  vertexShader: `attribute vec3 seed;attribute float tip;uniform float uTime,uRain;uniform vec3 uBox,uVel;varying float vA;
    void main(){float H=46.0;float fall=-uVel.y;float t=mod(uTime*fall+seed.y*H,H);vec3 p=uBox+vec3((seed.x-0.5)*84.0,H-t-6.0,(seed.z-0.5)*84.0);
      p.xz-=uVel.xz*(t/fall);p-=uVel*0.11*tip;vA=step(seed.x*0.37+seed.z*0.63,uRain*1.05)*(1.0-tip*0.6);gl_Position=projectionMatrix*viewMatrix*vec4(p,1.0);}`,
  fragmentShader: `uniform vec3 uCol;varying float vA;void main(){if(vA<0.01)discard;gl_FragColor=vec4(uCol,vA*0.36);}` });
const rain = new THREE.LineSegments(rainGeo, rainMat); rain.frustumCulled = false; rain.renderOrder = 5; scene.add(rain);

// ---------- clima: o motor do jogo + o que a pessoa escolhe nos controles
const atm = ATM.Sky('previa-3d');
const ST = { cam: 'jogo', hour: 15, seca: false, rain: 'auto', wind: 'auto', run: false, tf: 9, wet: 0.1, secaV: 0 };
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
  { const f = camera.getWorldDirection(new THREE.Vector3()); f.y = 0; f.normalize(); rainMat.uniforms.uBox.value.set(camera.position.x + f.x * 32, 0, camera.position.z + f.z * 32); }   // a chuva cai em volta de quem olha
  const ms = Math.max(base, o.wind.ms) * (ST.wind === 'auto' ? 1 : base / Math.max(0.5, o.wind.base));
  rainMat.uniforms.uVel.value.set(U.uWindDir.value.x * ms * 0.9, -6.5, U.uWindDir.value.y * ms * 0.9); rainMat.uniforms.uCol.value.setRGB(0.85, 0.9, 0.95).multiplyScalar(0.35 + 0.65 * day);
  return { Rr, base };
}

// ---------- controles
function chips(id, key, vals) { const box = $(id); box.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; ST[key] = vals ? vals(b.dataset.v) : b.dataset.v;
  for (const x of box.querySelectorAll('button')) x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); }
chips('cCam', 'cam');
chips('cEst', 'seca', v => v === 'seca'); chips('cChuva', 'rain'); chips('cVento', 'wind'); chips('cTempo', 'run', v => v === 'run');
$('hora').addEventListener('input', e => { ST.hour = +e.target.value; ST.run = false; for (const x of $('cTempo').querySelectorAll('button')) x.setAttribute('aria-pressed', x.dataset.v === 'stop' ? 'true' : 'false'); });
$('painelBtn').addEventListener('click', () => { const p = $('painel'); p.hidden = !p.hidden; $('painelBtn').setAttribute('aria-expanded', String(!p.hidden)); });

// ---------- laço: tempo, clima, desenho; se o celular sofrer, baixa a resolução
// ---------- câmera do jogo (de cima, girando de 60 em 60°) e a câmera livre (para inspecionar os detalhes)
const gameCam = createGameCamera(camera, renderer.domElement, { center: CENTER, radius: 100, groundY: (x, z) => Math.max(WATER_Y, heightAt(x, z)) });
let camMode = 'jogo'; controls.enabled = false;
if (innerWidth < innerHeight) gameCam.state.dist = gameCam.state.distT = 150;   // celular em pé: um pouco mais longe para caber o vale
$('rotL').addEventListener('click', () => gameCam.rotate(-1)); $('rotR').addEventListener('click', () => gameCam.rotate(1));
// a sombra do sol cobre só o pedaço de chão que aparece na tela: mais nítida de perto e sem desperdício de longe
const _v = new THREE.Vector3(), _c = new THREE.Vector3(), _pts = [], shCam = sun.shadow.camera;
function fitShadow() {
  camera.updateMatrixWorld(); const cp = camera.position, focus = camMode === 'jogo' ? gameCam.focus : controls.target; _pts.length = 0; _c.set(0, 0, 0);
  for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) { _v.set(x, y, 0.5).unproject(camera).sub(cp).normalize(); if (_v.y > -0.08) _v.y = -0.08;
    const t = (cp.y - focus.y) / -_v.y, p = cp.clone().addScaledVector(_v, t), d = Math.hypot(p.x - focus.x, p.z - focus.z); if (d > 110) { p.x = focus.x + (p.x - focus.x) * 110 / d; p.z = focus.z + (p.z - focus.z) * 110 / d; }
    p.y = focus.y; _pts.push(p); _c.add(p); }
  _c.multiplyScalar(1 / _pts.length); sun.target.position.copy(_c); sun.position.copy(_c).addScaledVector(U.uSunW.value, 250); sun.target.updateMatrixWorld(); sun.updateMatrixWorld();
  shCam.position.copy(sun.position); shCam.lookAt(_c); shCam.updateMatrixWorld();
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const p of _pts) for (const h of [-2, 20]) { _v.set(p.x, p.y + h, p.z).applyMatrix4(shCam.matrixWorldInverse); x0 = Math.min(x0, _v.x); x1 = Math.max(x1, _v.x); y0 = Math.min(y0, _v.y); y1 = Math.max(y1, _v.y); }
  const size = Math.ceil((Math.max(x1 - x0, y1 - y0) + 20) / 8) * 8, texel = size / sun.shadow.mapSize.x, cx = Math.round((x0 + x1) / 2 / texel) * texel, cy = Math.round((y0 + y1) / 2 / texel) * texel;
  Object.assign(shCam, { left: cx - size / 2, right: cx + size / 2, bottom: cy - size / 2, top: cy + size / 2, near: 1, far: 520 }); shCam.updateProjectionMatrix();
}
// capim: de longe, cada peça desenha menos lâminas (as que ficam já são mais largas na distância)
function grassLod() { for (const m of grass.children) { const g = m.geometry, d = Math.hypot(camera.position.x - g.userData.c[0], camera.position.y, camera.position.z - g.userData.c[1]);
  g.instanceCount = Math.round(g.userData.full * Math.max(0.3, Math.min(1, 1.3 - d / 190))); } }

// ---------- régua: bonecos de 1,70 m pelo vale e a tabela do que foi medido, para conferir as proporções
let people = null;
function showRegua(on) {
  if (on && !people) { people = new THREE.Group(); const L = LAYOUT, h0 = L.houses[0], c = Math.cos(h0.rot), s = Math.sin(h0.rot), lx = -h0.w * 0.22 + 1.1, lz = h0.d / 2 + 1.1;
    const cer = scene.children.find(o => o.userData.kind === 'cerrado'), spots = [[h0.p[0] + lx * c + lz * s, h0.p[1] - lx * s + lz * c], [L.corral.p[0] + 1, L.corral.p[1] + L.corral.d / 2 + 1.2],
      [L.field.tile.c[0] + L.field.cornMaxX + 0.6, L.field.tile.c[1] - 4], [L.mill.p[0] - 1.5, L.mill.p[1] + 3], [SPRING[0] + POOL_R + 1.4, SPRING[1] + 1], cer ? [cer.position.x + 1.6, cer.position.z + 0.8] : [CENTER[0], CENTER[1]]];
    for (const [x, z] of spots) { const p = person(toon({ color: 0xffffff })); p.position.set(x, heightAt(x, z) - 0.02, z); people.add(p); } scene.add(people); }
  if (people) people.visible = on; const box = $('regua'); box.hidden = !on;
  if (on) { const rows = audit(scene); const med = rows.filter(r => r.ok !== null), bad = med.filter(r => !r.ok); box.innerHTML = `<b>Régua · ${med.length} coisas medidas</b>${bad.length ? `<div class="erro">⚠ ${bad.length} fora do tamanho real</div>` : '<div>✓ todas no tamanho real · bonecos de 1,70 m</div>'}<details><summary>ver a tabela</summary>` + rows.map(r => r.ok === null ? '' : `<div class="${r.ok ? 'ok' : 'erro'}">${r.ok ? '✓' : '⚠'} ${r.name}${r.n > 1 ? ` (${r.n})` : ''}: ${r.txt}</div>`).join('') + '</details>'; }
}
chips('cRegua', 'regua', v => v === 'sim'); let reguaOn = false;
window.__regua = () => audit(scene);

const clock = new THREE.Clock(); let fpsT = 0, fpsT0 = 0, fpsN = 0, slow = 0;
const fmtH = h => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60) % 60).padStart(2, '0')}`;
function frame() {
  const dt = Math.min(0.1, clock.getDelta()); U.uTime.value += dt; U.uFlowClk.value += dt * (0.55 + U.uRain.value * 0.5);
  const c = climate(dt);
  if (ST.cam !== camMode) { camMode = ST.cam; const game = camMode === 'jogo'; gameCam.state.enabled = game; controls.enabled = !game; $('giro').hidden = !game;
    if (game) { gameCam.state.fx = controls.target.x; gameCam.state.fz = controls.target.z; } else { controls.target.copy(gameCam.focus); } }
  if (camMode === 'jogo') gameCam.update(dt); else controls.update();
  if (!!ST.regua !== reguaOn) { reguaOn = !!ST.regua; showRegua(reguaOn); }
  if (people && reguaOn) for (const p of people.children) p.rotation.y = Math.atan2(camera.position.x - p.position.x, camera.position.z - p.position.z);
  if (camMode === 'jogo') U.uFocus.value.copy(gameCam.focus); else U.uFocus.value.copy(camera.position).add(camera.getWorldDirection(_v).multiplyScalar(0.01));   // câmera livre: só some o que encosta na lente fitShadow(); grassLod();
  const ctx = { pxPerUnit: renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360)), hour: ST.hour }; if (window.__petalPx) window.__petalPx.value = ctx.pxPerUnit; if (window.__mistPx) window.__mistPx.value = ctx.pxPerUnit; props.update(dt, ctx); fauna.update(dt, ctx); gente.update(dt); clouds.update(dt, camera); ctx.Rr = c.Rr; ctx.hour = ST.hour; skyfx.update(dt, ctx);
  { const f = skyfx.fx.flash; if (f > 0) { skyLight.intensity += f * 3; U.uSkyZen.value.lerp(new THREE.Color(0.85, 0.88, 1), f * 0.5); U.uSkyHor.value.lerp(new THREE.Color(0.9, 0.92, 1), f * 0.45); } }   // clarão do raio
  renderReflection();
  renderer.render(scene, camera);
  // quadros por segundo medidos no relógio de verdade (o dt do jogo é limitado a 0,1 s e enganava quando o aparelho sofria)
  const now = performance.now(); fpsN++; fpsT = (now - (fpsT0 || now)) / 1000; if (!fpsT0) fpsT0 = now; if (fpsT > 1) { const fps = fpsN / fpsT; fpsT0 = now; $('info').textContent = `${fmtH(ST.hour)} · ${ST.seca ? 'Seca' : 'Águas'} · vento ${c.base.toFixed(1)} m/s · ${c.Rr > 0.2 ? `chuva ${c.Rr.toFixed(0)} mm/h` : 'sem chuva'} · ${fps.toFixed(0)} qps`;
    $('hora').value = ST.hour; if (fps < 26 && dpr > 1) { if (++slow >= 2) { dpr = Math.max(1, dpr - 0.3); renderer.setPixelRatio(dpr); resize(); slow = 0; } } else slow = 0; fpsN = 0; fpsT = 0; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__tiles = TILES; window.__fall = FALL; window.__previa = { gente, skyfx, gameCam,  ST, U, renderer, scene, camera, controls, fauna, clouds };
