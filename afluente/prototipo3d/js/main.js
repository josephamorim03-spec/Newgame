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
import { fbm } from './world.js';
import { R, TILES, CENTER, RIVER, SPILL, riverHalfWidth, heightAt, riverInfo, waterDist, biomeAt, SPRING, POOL_R, WATER_Y, vnoise, inHex, inAnyTile, dirtAt, fieldAt, blocked, LAYOUT, rockyAt, waterLevelAt, riverLevel, FALL, CLIFF_X, DROP, LAKE, lakeDist, cliffDrop, smooth } from './world.js';
import { plantTile } from './flora.js';
import { buildProps } from './props.js';
import { hexCenter, edgeMid, DIRS, sectorType, PATHS, addRiver } from './world.js';
import { buildBoard } from './board3d.js';
import { buildBoard5 } from './board5.js';
import { buildFauna } from './fauna.js';
import { buildPeople } from './people.js';
import { buildFx } from './fx.js';
import { buildColisao } from './colisao.js';
import { createFx } from './aguafx.js';
import { buildPeixes } from './peixes.js';
import { createJuiz } from './juiz.js';
import { createJuizGente } from './juizgente.js';
import { buildClouds } from './clouds.js';
import { buildSkyFx } from './skyfx.js';
import { tag, audit, person } from './regua.js';
import { createGameCamera } from './camera.js';
import { createGrade } from './grade.js';
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
controls.minDistance = 2; controls.maxDistance = 220;   /* câmera livre chega bem perto para inspecionar */ controls.minPolarAngle = 0.3; controls.maxPolarAngle = 1.42;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
const reflRT = new THREE.WebGLRenderTarget(2, 2, { colorSpace: THREE.SRGBColorSpace });   // reflexo da água (ver mais abaixo)
const grade = createGrade(renderer); window.__grade = grade.uniforms;   // a demão final de cor (grade.js)
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); grade.setSize(w * dpr, h * dpr); { const rk = [0.5, 0.36, 0.25][window.__Qv || 0]; reflRT.setSize(Math.max(2, Math.ceil(w * dpr * rk)), Math.max(2, Math.ceil(h * dpr * rk))); } camera.aspect = w / h; camera.fov = w < h ? 50 : 38; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

// células de Voronoi (F1, F2-F1, id da célula): cascalho, pegadas e rachaduras da terra
const VOR = `vec3 vor(vec2 p){vec2 i=floor(p),f=fract(p);float d1=8.0,d2=8.0,id=0.0;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y));
  vec2 o=vec2(hash21(i+g),hash21(i+g+17.3));vec2 r=g+o-f;float d=dot(r,r);if(d<d1){d2=d1;d1=d;id=hash21(i+g+5.1);}else if(d<d2)d2=d;}return vec3(sqrt(d1),sqrt(d2)-sqrt(d1),id);}\n`;
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
sun.shadow.bias = -0.00012; sun.shadow.normalBias = 0.05; sun.shadow.radius = 4;
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
// onde os fios d'água batem no chão (x, z) e para onde escorrem (dx, dz): poça, encharcado e filete até o poço (preenchido abaixo)
const TRK = [0, 1, 2].map(() => new THREE.Vector4(0, 0, 0, 0));
const groundMat = toon();
groundMat.onBeforeCompile = sh => { shared(sh); sh.uniforms.uWell = { value: new THREE.Vector3(LAYOUT.well.p[0], LAYOUT.well.p[1], 0.72) }; sh.uniforms.uCenter = { value: new THREE.Vector2(CENTER[0], CENTER[1]) }; sh.uniforms.uTrk = { value: TRK }; sh.uniforms.uFallL = { value: new THREE.Vector4(FALL.p[0] - FALL.t[0] * 0.6, FALL.p[1] - FALL.t[1] * 0.6, FALL.t[0], FALL.t[1]) };
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 bio;attribute vec3 ex;attribute float wlv;varying float vWl;varying float vNy;attribute float wd;attribute float ou;varying vec4 vBio;varying vec3 vEx;varying float vWd;varying vec3 vWp;varying float vOu;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBio=bio;vEx=ex;vWd=wd;vOu=ou;vWl=wlv;vNy=normal.y;vWp=(modelMatrix*vec4(transformed,1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec4 vBio;varying vec3 vEx;varying float vWd;varying vec3 vWp;varying float vOu;varying float vWl;varying float vNy;uniform vec2 uCenter;uniform vec4 uFallL;uniform vec4 uTrk[3];uniform vec3 uWell;float vHaze;\n' + HEAD + HEXF + VOR)
    .replace('#include <color_fragment>', /* glsl */`
      if(distance(vWp.xz,uWell.xy)<uWell.z)discard;   // a boca do poço: o chão não tampa o buraco
      vec2 p=vWp.xz;float n1=fbm(p*0.05),n2=fbm(p*0.4+3.1),n3=vnoise(p*2.4);
      // pasto: verde-amarelado vivo, com manchas mais escuras e mais claras (como pinceladas)
      vec3 grass=mix(vec3(0.34,0.56,0.13),vec3(0.56,0.73,0.22),n1);grass=mix(grass,vec3(0.26,0.46,0.10),smoothstep(0.55,0.75,fbm(p*0.18+5.0))*0.55);
      {float sw=smoothstep(0.32,0.68,fbm(p*0.011+7.0));grass=mix(grass*vec3(1.08,1.03,0.76)+vec3(0.035,0.03,0.0),grass*vec3(0.80,1.0,1.06),sw);}
      grass=mix(grass,mix(vec3(0.62,0.52,0.24),vec3(0.75,0.62,0.30),n1),uSeca*0.88);
      vec3 litter=mix(vec3(0.25,0.20,0.10),vec3(0.38,0.30,0.14),n2);
      vec3 cerr=mix(mix(vec3(0.55,0.56,0.18),vec3(0.70,0.62,0.22),n1),mix(vec3(0.74,0.58,0.28),vec3(0.84,0.68,0.34),n1),uSeca);
      vec3 soil=mix(vec3(0.70,0.38,0.18),vec3(0.80,0.48,0.24),n2);
      vec3 col=grass*vBio.x+litter*vBio.y+cerr*vBio.z+soil*vBio.w;
      col=mix(col,soil,smoothstep(0.72,0.86,fbm(p*0.11+7.0))*0.5*(1.0-vBio.y)*(1.0-vEx.x));
      // lavoura: leiras norte-sul a cada 0,9 m (as fileiras do milho ficam nas cristas), terra arada escura nos sulcos
      float ridge=0.5+0.5*cos(vWp.x/0.9*6.2832);vec3 tilled=mix(vec3(0.40,0.26,0.16),vec3(0.62,0.44,0.29),ridge)*(0.88+0.24*n3);
      tilled=mix(tilled,vec3(0.70,0.58,0.40)*(0.85+0.3*ridge),uSeca*0.6);col=mix(col,tilled,vEx.x*0.92);
      // terra batida da vila, dos caminhos e do curral: laterita avermelhada com manchas ocre; o miolo pisado é mais claro e liso,
      // a beira é terra solta, mais escura e granulada; cascalho miúdo de quartzo e laterita, marcas rasas de pé e de casco onde
      // se anda mais, tufos de capim que sobram na beira e, na seca, a crosta racha em placas
      float eW=smoothstep(0.2,0.7,vEx.y+(n3-0.5)*0.35+(vnoise(p*1.7+4.0)-0.5)*0.3);
      if(eW>0.001){float tr=smoothstep(0.55,1.0,vEx.y);
        vec3 earth=mix(vec3(0.60,0.38,0.24),vec3(0.76,0.54,0.36),n2);
        earth=mix(earth,vec3(0.78,0.56,0.30),smoothstep(0.55,0.8,fbm(p*0.35+2.0))*0.45);
        earth=mix(earth*(0.84+0.14*vnoise(p*7.0)),earth*1.07+vec3(0.03,0.025,0.02),tr)*(0.93+0.14*vnoise(p*2.3));
        earth*=0.9+0.2*vnoise(p*23.0)*vnoise(p*41.0+3.0);   // grão fino
        // cascalho: células deformadas (pedra irregular), só 1 em cada ~4 tem pedra, cada uma de um tamanho; borda suave e sombra leve embaixo
        vec2 pw=p*6.0+vec2(vnoise(p*2.7),vnoise(p*2.7+5.0))*0.9;vec3 v1=vor(pw);float has=step(0.74,v1.z),rad=0.1+0.22*fract(v1.z*37.0);
        float peb=(1.0-smoothstep(rad*0.7,rad,v1.x))*has*(1.0-tr*0.5);
        vec3 pc=mix(mix(vec3(0.52,0.34,0.22),vec3(0.66,0.46,0.30),fract(v1.z*11.0)),vec3(0.82,0.78,0.70),step(0.93,v1.z))*(0.85+0.25*smoothstep(rad,0.0,v1.x));
        earth=mix(earth*(1.0-0.12*(1.0-smoothstep(rad,rad*1.5,v1.x))*has),pc,peb*0.6);
        // marcas de pé e de casco: ovais rasas, mais onde se pisa (miolo do caminho, terreiro, curral)
        vec3 v2=vor(vec2(p.x*2.6,p.y*1.7)+vec2(3.1,7.7));earth*=1.0-0.11*(1.0-smoothstep(0.12,0.26,v2.x))*step(0.68,v2.z)*smoothstep(0.35,0.9,vEx.y);
        if(uSeca>0.3){vec2 pc2=p*2.4+vec2(vnoise(p*1.9),vnoise(p*1.9+7.0))*1.1;vec3 cv=vor(pc2);   // barro seco: placas tortas, fissura fina que some e volta
          float ck=(1.0-smoothstep(0.0,0.025+0.02*vnoise(p*6.0),cv.y))*smoothstep(0.35,0.7,vnoise(p*3.3+1.0)+0.25)*smoothstep(0.4,0.9,uSeca)*smoothstep(0.35,0.85,vEx.y);
          earth*=(1.0-0.33*ck)*(1.0-0.07*smoothstep(0.05,0.18,cv.x)*smoothstep(0.4,0.9,uSeca)*smoothstep(0.35,0.85,vEx.y));}
        earth=mix(earth,vec3(0.84,0.70,0.52)*(0.9+0.2*n3),uSeca*0.35);
        // erva rala que sobra: manchas pequenas e quebradas (não um tapete verde chapado)
        float tuft=smoothstep(0.66,0.82,vnoise(p*2.2+9.0)+(1.0-tr)*0.22-0.08)*(1.0-tr)*(1.0-uSeca*0.6)*smoothstep(0.35,0.75,vnoise(p*11.0+2.0));
        col=mix(col,mix(earth,mix(grass*0.75,earth*0.9+grass*0.25,0.3),tuft*0.6),eW);}
      // lajedo: cascalho e areia clara de quartzito entre tufos ralos
      vec3 grav=mix(vec3(0.66,0.60,0.50),vec3(0.84,0.80,0.70),vnoise(p*5.0))*(0.85+0.3*vnoise(p*17.0));col=mix(col,grav,smoothstep(0.25,0.75,vEx.z+(n3-0.5)*0.4)*0.85);
      float bank=1.0-smoothstep(0.0,2.0,vWd);vec3 sand=mix(vec3(0.78,0.66,0.46),vec3(0.86,0.76,0.56),n3);
      col=mix(col,sand,bank*0.55);
      // paredão de pedra onde o chão é íngreme (escarpa da cachoeira): arenito em camadas, com musgo onde respinga
      float steep=1.0-smoothstep(0.45,0.8,vNy);vec3 rock=mix(vec3(0.58,0.50,0.42),vec3(0.72,0.64,0.54),vnoise(vec2(p.x*0.6+p.y,vWp.y*3.2)))*(0.8+0.25*fract(vWp.y*1.7+vnoise(p*0.8)));
      rock=mix(rock,vec3(0.36,0.46,0.24),smoothstep(0.55,0.8,vnoise(p*2.0+vWp.y))*(1.0-smoothstep(1.0,6.0,vWd))*0.7);col=mix(col,rock,steep);
      // a rocha ao lado da queda fica escura de molhada, com riscos de limo descendo (o borrifo não deixa secar)
      {vec2 dq=p-uFallL.xy;float al=dot(dq,uFallL.zw),sd=dot(dq,vec2(-uFallL.w,uFallL.z));float nf=exp(-sd*sd/22.0)*smoothstep(-2.5,0.2,al)*(1.0-smoothstep(4.5,8.0,al))*(1.0-uWaterDrop);
       col=mix(col,col*0.58,nf*max(steep,0.35));col=mix(col,vec3(0.2,0.31,0.19),nf*steep*smoothstep(0.45,0.75,vnoise(vec2(sd*3.2,vWp.y*0.6)))*0.65);}
      // cânion antes da queda: a margem é laje de arenito molhada (não barranco de terra)
      {vec2 dq=p-uFallL.xy;float al=dot(dq,uFallL.zw);float cy=(1.0-smoothstep(5.0,11.0,-al))*(1.0-smoothstep(0.4,0.9,al))*(1.0-smoothstep(0.8,2.6,vWd))*(1.0-vOu);
       vec3 lj=mix(vec3(0.46,0.40,0.33),vec3(0.62,0.55,0.45),vnoise(vec2(p.x*1.3+p.y,vWp.y*4.0)))*(0.85+0.2*vnoise(p*6.0));lj=mix(lj,vec3(0.33,0.42,0.22),smoothstep(0.6,0.8,vnoise(p*2.3))*0.6);
       col=mix(col,lj*mix(1.0,0.7,1.0-smoothstep(0.0,1.2,vWd)),cy*0.85);}
      // os fios d'água no chão: poça rasa onde batem, chão encharcado com limo em volta e um filete molhado até o poço
      for(int i=0;i<3;i++){vec4 T=uTrk[i];if(T.z==0.0&&T.w==0.0)continue;vec2 dq=p-T.xy;float r=length(dq)+(vnoise(p*3.0+float(i)*7.0)-0.5)*0.35;
        vec2 ab=T.zw;float tt=clamp(dot(dq,ab)/dot(ab,ab),0.0,1.0);float rl=length(dq-ab*tt)+(vnoise(p*2.2+3.0)-0.5)*0.25+sin(tt*9.0+float(i))*0.08;
        float wetT=max(1.0-smoothstep(0.5,1.4,r),(1.0-smoothstep(0.1,0.32,rl))*(1.0-tt*0.4))*(1.0-uWaterDrop*1.4);
        col=mix(col*0.6,vec3(0.22,0.30,0.14),smoothstep(0.55,0.75,vnoise(p*4.0))*0.35*wetT)*wetT+col*(1.0-wetT);
        float pd=(1.0-smoothstep(0.15,0.42,r+(vnoise(p*5.0)-0.5)*0.15))*(1.0-uWaterDrop*1.4);col=mix(col,mix(col*0.45,pow(uSkyHor,vec3(0.4545))*0.5,0.45),pd*0.7);}   // poça rasa: escura e com um pouco de céu, borda irregular
      float wl=vWl-uWaterDrop-0.06*vOu,dep=(wl-vWp.y)*(1.0-smoothstep(0.3,1.2,vWd)),under=smoothstep(-0.02,0.05,dep);
      vec3 bed=mix(vec3(0.62,0.57,0.44),vec3(0.80,0.74,0.58),n3);float peb=smoothstep(0.5,0.72,vnoise(p*6.0));
      bed=mix(bed,mix(vec3(0.50,0.48,0.45),vec3(0.80,0.77,0.70),vnoise(p*11.0+4.0)),peb*0.85);bed*=0.82+0.18*vnoise(p*23.0);
      col=mix(col,bed,under);col*=1.0-0.2*smoothstep(-0.15,0.0,dep)*(1.0-under);
      col*=mix(vec3(1.0),exp(-vec3(1.25,0.55,0.5)*max(dep,0.0)*1.5),under);
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
// o chão de cada peça (refeito quando um rio novo encosta na borda dela)
function groundFor(t) { if (t.gm) { scene.remove(t.gm); t.gm.geometry.dispose(); }
  const { pos, idx } = sectorGrid(t.c, mobile ? 26 : 32); const m = new THREE.Mesh(finishGround(pos, idx, 0, 0), groundMat); m.receiveShadow = true; m.layers.enable(1); scene.add(m); t.gm = m; return m; }
for (const t of TILES) groundFor(t);
const outside = P => P.some(([x, z]) => !inAnyTile(x, z, 0.999));
let nearGround = null;
function buildNear() { if (nearGround) { scene.remove(nearGround); nearGround.geometry.dispose(); }
  const near = latticeGeometry(0, 150, mobile ? 1.6 : 1.25, outside); nearGround = new THREE.Mesh(finishGround(near.pos, near.idx, 1, 0.1), groundMat); nearGround.receiveShadow = true; nearGround.layers.enable(1); scene.add(nearGround); }
// depois do capim, até onde a câmera do jogo alcança, um chão mais ralo (malha de 3 m) emenda com as chapadas
{ const mid = latticeGeometry(146, 238, 3, () => true); const m = new THREE.Mesh(finishGround(mid.pos, mid.idx, 1, 0.16), groundMat); m.receiveShadow = true; m.layers.enable(1); scene.add(m); }
buildNear();
const ringFog = { value: 0.002 }, ringFogC = { value: new THREE.Color() };
// chapadas ao longe: um anel de relevo (700 a 2600 m) com mesas de topo plano, paredão de arenito em camadas, talude de
// mata e o cerrado em volta; a névoa azul vai apagando com a distância (perspectiva aérea, como as montanhas de Hyrule)
{ const NR = mobile ? 80 : 120, NA = mobile ? 220 : 340, r0 = 232, r1 = 2700, pos = [], idx = [];
  const mesaH = (x, z) => { const m = fbm(x * 0.0011 + 5, z * 0.0011 - 3, 3), m2 = fbm(x * 0.004, z * 0.004, 2);
    const plateau = THREE.MathUtils.smoothstep(m + (m2 - 0.5) * 0.06, 0.53, 0.56);          // borda nítida: o paredão
    const talus = THREE.MathUtils.smoothstep(m, 0.42, 0.535) * 0.35;                            // encosta que desce até a planície
    const top = 70 + 60 * fbm(x * 0.0006 + 9, z * 0.0006, 2);
    return Math.max(plateau, talus) * top + (fbm(x * 0.003, z * 0.003, 2) - 0.5) * 8; };
  for (let j = 0; j <= NR; j++) { const r = r0 + (r1 - r0) * Math.pow(j / NR, 1.6); for (let i = 0; i < NA; i++) { const a = i / NA * Math.PI * 2, x = CENTER[0] + Math.cos(a) * r, z = CENTER[1] + Math.sin(a) * r;
      const fade = THREE.MathUtils.smoothstep(r, 520, 820), base = heightAt(x, z) - 0.1; pos.push(x, base + (mesaH(x, z) - base) * fade - (1 - fade) * 0 , z); } }   // perto, emenda com o chão do vale
  for (let j = 0; j < NR; j++) for (let i = 0; i < NA; i++) { const a = j * NA + i, b = j * NA + (i + 1) % NA, c = a + NA, d = b + NA; idx.push(a, b, c, b, d, c); }   // virado para cima
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const mat = toon({ color: 0xffffff, fog: false });
  mat.onBeforeCompile = sh => { shared(sh); sh.uniforms.uC = { value: new THREE.Vector2(CENTER[0], CENTER[1]) }; sh.uniforms.uFogD = ringFog; sh.uniforms.uFogC = ringFogC;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;varying float vNy;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp=(modelMatrix*vec4(transformed,1.0)).xyz;vNy=normal.y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;varying float vNy;uniform vec2 uC;uniform float uFogD;uniform vec3 uFogC;\n' + HEAD)
      .replace('#include <color_fragment>', `vec2 p=vWp.xz;float steep=1.0-smoothstep(0.55,0.85,vNy);
        vec3 cer=mix(vec3(0.50,0.58,0.26),vec3(0.66,0.62,0.30),vnoise(p*0.01));cer=mix(cer,vec3(0.74,0.62,0.36),uSeca*0.7);
        vec3 mata=mix(vec3(0.24,0.40,0.16),vec3(0.32,0.48,0.2),vnoise(p*0.02));
        float strata=fract(vWp.y*0.11+vnoise(p*0.01)*0.6);vec3 rock=mix(vec3(0.72,0.44,0.30),vec3(0.86,0.62,0.44),smoothstep(0.3,0.7,strata))*(0.85+0.2*vnoise(vec2(p.x+p.y,vWp.y)*0.08));
        float lowSlope=smoothstep(0.85,0.6,vNy)*(1.0-smoothstep(25.0,55.0,vWp.y));
        float dc=length(p-uC);cer=mix(mix(vec3(0.45,0.53,0.27),vec3(0.53,0.59,0.31),vnoise(p*0.03)),cer,smoothstep(260.0,700.0,dc));
        vec3 col=mix(cer,mata,lowSlope*0.8+smoothstep(0.62,0.7,vnoise(p*0.006))*0.4*(1.0-steep));col=mix(col,rock,steep*smoothstep(15.0,30.0,vWp.y));
        diffuseColor.rgb=toLin(col);`)
      .replace('#include <lights_fragment_end>', LIGHT_END(0))
      .replace('#include <fog_fragment>', `{float d=length(vWp.xz-uC);float k=smoothstep(600.0,3200.0,d)*0.6+0.06;vec3 haze=mix(uSkyHor,uSkyZen,0.18+0.15*smoothstep(0.0,120.0,vWp.y));
        gl_FragColor.rgb=mix(gl_FragColor.rgb,haze,k);
        float fd=uFogD*length(vWp-cameraPosition),f=(1.0-exp(-fd*fd))*(1.0-smoothstep(240.0,480.0,d));gl_FragColor.rgb=mix(gl_FragColor.rgb,uFogC,f);}`); };   // perto, a mesma névoa do vale
  const m = new THREE.Mesh(g, mat); m.receiveShadow = false; scene.add(m); }

// ---------- capim: lâminas na placa de vídeo, presas ao chão num retalho em volta do ponto que a câmera olha. Cada lâmina
// lê do mapa do vale a altura do chão, a densidade, o tamanho e o tipo; curva com o vento do lugar e com a chuva; e a
// rajada que passa clareia as pontas (as "ondas" de vento no capim, como em Hyrule)
// mapa do capim (altura do chão, densidade, tamanho, tipo) cobrindo o vale e o tabuleiro em volta; quando o jogador encaixa
// uma peça, só o pedaço dela é recalculado
const FIELD = { size: 520, res: mobile ? 560 : 720 };
const fieldTex = (() => { const N = FIELD.res, d = new Float32Array(N * N * 4); const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat, THREE.FloatType); t.minFilter = t.magFilter = THREE.LinearFilter; return t; })();
function fillField(xa = -1e9, za = -1e9, xb = 1e9, zb = 1e9) { const N = FIELD.res, d = fieldTex.image.data, x0 = CENTER[0] - FIELD.size / 2, z0 = CENTER[1] - FIELD.size / 2;
  const i0 = Math.max(0, Math.floor((xa - x0) / FIELD.size * N)), i1 = Math.min(N - 1, Math.ceil((xb - x0) / FIELD.size * N)), j0 = Math.max(0, Math.floor((za - z0) / FIELD.size * N)), j1 = Math.min(N - 1, Math.ceil((zb - z0) / FIELD.size * N));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const x = x0 + (i + 0.5) / N * FIELD.size, z = z0 + (j + 0.5) / N * FIELD.size, k = (j * N + i) * 4;
    // a altura do chão vai um pouco além da peça: a lâmina da beirada lê a média de dois texels e, com 0 do lado de fora, flutuava ou afundava
    const inT = inAnyTile(x, z, 0.995); if (!inT) { d[k] = inAnyTile(x, z, 1.08) ? heightAt(x, z) : 0; d[k + 1] = 0; continue; } d[k] = heightAt(x, z);
    const b = biomeAt(x, z), wd = waterDist(x, z);
    d[k + 1] = wd < 0.35 ? 0 : Math.min(1, b[0] * 1.0 + b[2] * 0.92 + b[1] * 0.2) * (0.85 + 0.3 * (vnoise(x * 0.3, z * 0.3) - 0.5));
    d[k + 1] *= blocked(x, z, -0.5) ? 0 : (1 - Math.min(1, dirtAt(x, z) * 1.4)) * (1 - 0.9 * fieldAt(x, z)) * (1 - 0.8 * rockyAt(x, z));
    // tipo e tamanho como pesos contínuos (cerrado, mata, pasto): na divisa as lâminas se misturam em vez de trocar numa linha
    const cw = smooth(0.3, 0.7, b[2]), fw = smooth(0.35, 0.65, b[1]) * (1 - cw);
    const hP = 0.26 + 0.24 * vnoise(x * 0.2 + 7, z * 0.2), hC = 0.6 + 0.4 * vnoise(x * 0.15, z * 0.15);
    const bank = 1 + 0.5 * smooth(0.35, 0.9, wd) * (1 - smooth(1.8, 3.4, wd));   // capim mais alto na beira d'água, crescendo e diminuindo aos poucos
    d[k + 2] = (hP * (1 - cw - fw) + hC * cw + 0.24 * fw) * bank;
    // na borda da peça que dá para o tabuleiro vazio o capim vai ficando ralo e baixo (não acaba num muro reto)
    { const t = TILES.find(u => inHex(x, z, u.c, 0.995)), e = t ? hexEdgeDist(x, z, t.c) : 9;
      if (e < 1.8) { const dx = x - t.c[0], dz = z - t.c[1], l = Math.hypot(dx, dz) || 1; if (!inAnyTile(x + dx / l * 2.5, z + dz / l * 2.5, 1)) { const f = smooth(0, 1.8, e); d[k + 1] *= 0.35 + 0.65 * f; d[k + 2] *= 0.5 + 0.5 * f; } } }
    d[k + 3] = cw - fw; }
  fieldTex.needsUpdate = true; }
fillField();
const BLADES = mobile ? 50000 : 140000;
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
const grassU = { uPush: { value: Array.from({ length: 16 }, () => new THREE.Vector4()) }, uField: { value: fieldTex }, uFieldO: { value: new THREE.Vector2(CENTER[0] - FIELD.size / 2, CENTER[1] - FIELD.size / 2) }, uFieldS: { value: FIELD.size },
 };
const grassMat = toon({ side: THREE.DoubleSide });
grassMat.onBeforeCompile = sh => { shared(sh); Object.assign(sh.uniforms, grassU);
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 seed;attribute vec2 bpos;uniform vec4 uPush[16];uniform sampler2D uField;uniform vec2 uFieldO;uniform float uFieldS,uRain;varying float vGy;varying vec3 vWp;varying float vType;varying float vTone;varying float vGust;\n' + NOISE + WIND)
    .replace('#include <beginnormal_vertex>', 'vec3 objectNormal=vec3(0.0,1.0,0.0);')
    .replace('#include <begin_vertex>', /* glsl */`
      vec2 bp=bpos;vec2 fuv=(bp-uFieldO)/uFieldS;vec4 F=texture2D(uField,fuv);
      float cd=distance(cameraPosition,vec3(bp.x,F.r,bp.y));
      float alive=step(0.001,F.g);
      float H=F.b*(0.6+0.8*seed.w)*alive;float rT=fract(seed.x*13.7+seed.y*7.1),cwT=max(F.a,0.0),fwT=max(-F.a,0.0);vType=rT<fwT?0.5:(rT<cwT?1.0:0.0);vTone=seed.z;
      float yaw=seed.w*6.2832,cy=cos(yaw),sy=sin(yaw);float wdt=mix(0.05,0.085,seed.x)*(1.0+cwT*0.3)*(1.0+cd/30.0);
      float g=gustAt(bp),q=windQ(max(0.0,uWindBase*(1.0+uWindIu*g))),v=uv.y;vGust=clamp(g*0.5*min(1.0,uWindBase/4.0),0.0,1.0);
      float lean=(0.18+0.35*seed.y)+(0.05+0.95*q)+0.12*q*sin(uTime*7.0+seed.x*40.0)+0.25*uRain;
      vec2 wd2=normalize(mix(vec2(cy,sy),uWindDir,clamp(q*1.4+0.25,0.0,1.0)));
      // quem passa por cima deita o capim para fora do caminho (gente, boi, criança correndo)
      vec2 pd=vec2(0.0);float pf=0.0;for(int i=0;i<16;i++){vec4 P=uPush[i];if(P.z<=0.0)continue;vec2 dd=bp-P.xy;float L=length(dd);float kk=(1.0-smoothstep(P.z*0.35,P.z,L))*P.w;if(kk>0.0){pd+=dd/max(L,0.03)*kk;pf=max(pf,kk);}}
      if(pf>0.0){wd2=normalize(mix(wd2,normalize(pd+1e-4),clamp(pf,0.0,1.0)));lean+=pf*1.3;}
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
      {float sw=smoothstep(0.32,0.68,fbm(vWp.xz*0.011+7.0));green=mix(green*vec3(1.08,1.03,0.76)+vec3(0.035,0.03,0.0)*vGy,green*vec3(0.80,1.0,1.06),sw);}
      vec3 col=vType>0.75?gold:vType>0.25?forest:green;
      col=mix(col,straw,uSeca*(vType>0.25&&vType<0.75?0.3:0.9));
      col+=vec3(0.16,0.15,0.06)*vGust*vGy*vGy;col*=mix(1.0,0.78,uWet);diffuseColor.rgb=toLin(col);`)
    .replace('#include <lights_fragment_end>', LIGHT_END(0) + `\n{float back=pow(max(dot(normalize(vWp-cameraPosition),uSunW),0.0),2.5);totalEmissiveRadiance+=diffuseColor.rgb*uSunC*back*0.55*vGy*cloudShadow(vWp.xz);}`);
};
const grass = new THREE.Group(); for (const g of bladeGeos) { const m = new THREE.Mesh(g, grassMat); m.receiveShadow = true; grass.add(m); } scene.add(grass);
function grassFor(t, n = mobile ? 4500 : 12000) { const F = fieldTex.image.data, N = FIELD.res, sd = [], bp = [];
  for (let i = 0, guard = 0; i < n && guard < n * 40; guard++) { const x = t.c[0] + (rnd() - 0.5) * 2 * R, z = t.c[1] + (rnd() - 0.5) * 2 * R; if (!inHex(x, z, t.c, 0.995)) continue;
    const fi = Math.min(N - 1, Math.floor((x - CENTER[0] + FIELD.size / 2) / FIELD.size * N)), fj = Math.min(N - 1, Math.floor((z - CENTER[1] + FIELD.size / 2) / FIELD.size * N));
    if (rnd() > F[(fj * N + fi) * 4 + 1]) continue; bp.push(x, z); sd.push(rnd(), rnd(), rnd(), rnd()); i++; }
  const g = new THREE.InstancedBufferGeometry(); g.index = bladeBase.index; for (const k of ['position', 'uv', 'normal']) g.setAttribute(k, bladeBase.attributes[k]);
  g.setAttribute('seed', new THREE.InstancedBufferAttribute(new Float32Array(sd), 4)); g.setAttribute('bpos', new THREE.InstancedBufferAttribute(new Float32Array(bp), 2));
  g.instanceCount = bp.length / 2; g.userData.full = g.instanceCount; g.userData.c = t.c; g.boundingSphere = new THREE.Sphere(new THREE.Vector3(t.c[0], 0, t.c[1]), R + 2);
  const m = new THREE.Mesh(g, grassMat); m.receiveShadow = true; grass.add(m); return m; }

// ---------- árvores: copas em ramos de folhas (volume macio, luz em faixas e contorno claro), troncos tortos do cerrado,
// mata de galeria alta, buritis em leque e ipês (amarelos na seca)
const barkTex = barkTexture(5);
const TEX = { cerrado: leafTexture(7, { n: 110, size: 26, round: 0.62, spread: 0.4 }), mata: leafTexture(9, { n: 170, size: 22, round: 0.5, spread: 0.42 }),
  ipe: leafTexture(13, { n: 140, size: 18, round: 0.65, spread: 0.4 }), buriti: fanTexture(11) };
const LEAFC = { pequi: 0x4f7a2a, lobeira: 0x9aaa78, pinheiro: 0x3f6a34, ipeRosa: 0x8fb33c, ipeBranco: 0x8fb33c, cerrado: 0x8fac46, mata: 0x5f9a33, ipe: 0x8fb33c, buriti: 0x8cc04a, sombra: 0x86b23c };
// o que chega perto demais da lente (copas altas quando a câmera desce no zoom) se desfaz em pontilhado, sem tapar o mapa
const NEAR_FADE = `{vec3 ab=uFocus-cameraPosition;float t=clamp(dot(vWp-cameraPosition,ab)/dot(ab,ab),0.0,1.0),dl=length(vWp-cameraPosition-ab*t),rr=2.5+0.12*length(ab);
  float fade=max((1.0-smoothstep(rr*0.75,rr,dl))*(1.0-smoothstep(0.75,0.9,t)),1.0-smoothstep(3.5,5.5,distance(vWp,cameraPosition)));
  vec2 bq=mod(floor(gl_FragCoord.xy),4.0),bh=floor(bq*0.5);float bay=fract(dot(bh,vec2(0.5,bh.y*0.75)))*0.25+fract(dot(bq,vec2(0.5,bq.y*0.75)))+0.03125;
  if(fract(bay)<fade)discard;}\n`;   // entre a câmera e o ponto que se olha, as copas abrem uma janela: limpa no meio (antes sobravam 10% dos
// pixels como chuvisco) e com a borda em trama ordenada 4x4, que lê como transparência e não como ruído
function treeMaterials(kind) {
  const wood = toon({ map: barkTex, color: kind === 'buriti' ? 0xb8a98a : kind === 'mata' ? 0xa08a6c : 0x8f7356 });
  const leaf = toon({ map: TEX[kind], alphaTest: 0.5, side: THREE.DoubleSide, color: LEAFC[kind] });
  const dry = { cerrado: 0.5, mata: 0.05, ipe: 1, ipeRosa: 1, ipeBranco: 1, buriti: 0.1, sombra: 0.2, pequi: 0.15, lobeira: 0.3, pinheiro: 0 }[kind];
  const bloom = new THREE.Color({ ipeRosa: 0xf27aaa, ipeBranco: 0xf8f4ec }[kind] || 0xffd12a);   // ipê amarelo, rosa ou branco, florindo na seca
  const sway = (sh, isLeaf, depth) => { shared(sh); sh.uniforms.uDry = { value: dry }; sh.uniforms.uBloom = { value: bloom };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float flex;attribute float lr;attribute float ao;attribute float tint;attribute vec3 torg;varying float vLr;varying vec3 vWp;varying float vAo;varying float vTint;\n' + NOISE + WIND)
      .replace('#include <begin_vertex>', /* glsl */`#include <begin_vertex>
        vec3 tp=torg;float hs=hash21(tp.xz);
        float q=windQ(windAt(tp.xz)),f=flex*flex,w=1.6+1.4*hs;
        float sw=(0.06*q+0.022*q*sin(uTime*w+hs*40.0)+0.004*sin(uTime*0.9+hs*9.0))*f;
        vec3 dw=vec3(uWindDir.x,0.0,uWindDir.y)*sw*8.0;
        ${isLeaf ? 'dw+=vec3(sin(uTime*11.0+position.x*3.1+lr*20.0),sin(uTime*13.0+position.z*2.3)*0.5,cos(uTime*10.0+position.y*2.7))*0.05*(0.25+q)*flex;' : ''}
        transformed+=inverse(mat3(modelMatrix))*dw;vLr=lr;vAo=ao;vTint=tint;vWp=(modelMatrix*vec4(transformed,1.0)).xyz;`)
      // copa como volume (o truque dos jogos pintados): a normal de cada folha se inclina para fora do eixo da árvore, a partir
      // de um ponto abaixo dela, e a luz lê a copa como uma massa macia, com lado de sol, lado de sombra e o contorno claro
    if (isLeaf) sh.vertexShader = sh.vertexShader.replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n{vec3 wp0=(modelMatrix*vec4(position,1.0)).xyz;vec3 rel=wp0-torg;vec3 nw=normalize(vec3(rel.x,rel.y*0.45+0.6,rel.z));objectNormal=normalize(mix(objectNormal,inverse(mat3(modelMatrix))*nw,0.72));}');
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
TEX.pequi = TEX.mata; TEX.lobeira = leafTexture(19, { n: 34, size: 46, round: 0.7, spread: 0.36 }); TEX.pinheiro = leafTexture(23, { n: 170, size: 16, round: 0.26, spread: 0.44 });   // folhinha miúda demais virava pontinhos de longe
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
    const c = tp.clone().add(new THREE.Vector3((rnd() - 0.5) * P.cluster, (rnd() - 0.35) * P.cluster * 0.7 * (P.flat || 1), (rnd() - 0.5) * P.cluster)); g.translate(c.x, c.y, c.z);   // flat < 1: copa achatada
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
  cerrado: { trunk: [1.5, 2.4], r: 0.22, crook: 0.6, lean: 0.25, branches: 3, levels: 2, spread: 1.05, decay: 0.7, cards: 22, card: 2.1, cluster: 1.7, flat: 0.5 },   // copa rala e achatada sobre o tronco torto
  ipe: { trunk: [2.9, 4.0], r: 0.27, crook: 0.4, lean: 0.12, branches: 3, levels: 2, spread: 0.8, decay: 0.75, cards: 20, card: 2.4, cluster: 2.0 },
  mata: { trunk: [3.6, 5.2], r: 0.36, crook: 0.22, lean: 0.06, branches: 4, levels: 3, spread: 0.85, decay: 0.74, cards: 15, card: 3.2, cluster: 2.6 },
  sombra: { trunk: [2.6, 3.4], r: 0.5, crook: 0.3, lean: 0.08, branches: 5, levels: 3, spread: 1.0, decay: 0.72, cards: 13, card: 3.4, cluster: 2.8 },
  pequi: { trunk: [2.4, 3.2], r: 0.3, crook: 0.4, lean: 0.12, branches: 4, levels: 3, spread: 1.0, decay: 0.7, cards: 14, card: 2.8, cluster: 2.3, flat: 0.7 },
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
function makeBuriti(scale = 1) {
  // o buriti jovem passa anos sem tronco: só a touceira de leques saindo do chão; o tronco vem depois e os leques crescem menos
  const H = (13 + rnd() * 5) * scale, fs = 0.45 + 0.55 * Math.min(1, scale), out = { wood: [], leaf: [] }, lean = new THREE.Vector3((rnd() - 0.5) * 0.08, 1, (rnd() - 0.5) * 0.08).normalize();
  const tr = new THREE.CylinderGeometry(0.27 * (0.75 + 0.25 * scale), 0.32 * (0.75 + 0.25 * scale), H, 10, 8, true); tr.translate(0, H / 2, 0); tr.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), lean)); out.wood.push(tr);
  const top = lean.clone().multiplyScalar(H), n = 16;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + rnd() * 0.3, up = 0.25 + rnd() * 0.9, L = (2.4 + rnd() * 1.2) * fs;
    const dir = new THREE.Vector3(Math.cos(a) * Math.cos(up), Math.sin(up), Math.sin(a) * Math.cos(up)).normalize();
    const pet = new THREE.CylinderGeometry(0.035, 0.06, L, 5, 1, true); pet.translate(0, L / 2, 0); pet.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)); pet.translate(top.x, top.y, top.z); out.wood.push(pet);
    const end = top.clone().addScaledVector(dir, L), S = (3.6 + rnd() * 0.8) * fs, fan = new THREE.PlaneGeometry(S, S); fan.translate(0, S * 0.42, 0);
    // o leque fica "deitado" de frente para o céu e cai na ponta (vê-se de cima, como nos buritizais)
    const droop = new THREE.Vector3(Math.cos(a), 0.15 + up * 0.5 - 0.35, Math.sin(a)).normalize();
    fan.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), droop));
    fan.applyMatrix4(new THREE.Matrix4().makeRotationAxis(droop, Math.PI / 2)); fan.translate(end.x, end.y, end.z);
    const nn = droop.clone().add(new THREE.Vector3(0, 1.2, 0)).normalize(), nor = fan.attributes.normal; for (let k = 0; k < nor.count; k++) nor.setXYZ(k, nn.x, nn.y, nn.z);
    fan.setAttribute('lr', new THREE.Float32BufferAttribute(new Array(4).fill(rnd()), 1)); out.leaf.push(fan); }
  return tag(treeMesh(out, H + 3 * fs, MATS.buriti), 'buriti');
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
// o chão mais baixo num círculo de raio r: a pedra (ou o que for) assenta por ele e não fica com um lado no ar na encosta
const lowAt = (x, z, r) => { let m = heightAt(x, z); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; m = Math.min(m, heightAt(x + Math.cos(a) * r, z + Math.sin(a) * r)); } return m; };
function putStone(x, z, size, flat, y) { const m = makeStone(size, flat); m.position.set(x, y ?? lowAt(x, z, size * 1.1) - size * flat * 0.25, z); m.rotation.y = rnd() * 6.28; scene.add(m); placed.push([x, z, size * 1.4, size * 1.2]); carveGrass(x, z, size * 1.1); return m; }

const placed = [];
// a folga das construções cresce com a copa (minD): árvore grande não enfia a copa no telhado
const canPlace = (x, z, minD) => !(blocked(x, z, Math.max(1.2, minD * 0.4)) || dirtAt(x, z) > 0.3 || fieldAt(x, z) > 0.05 || placed.some(p => Math.hypot(p[0] - x, p[1] - z) < Math.min(minD, p[2])));
// o "corpo" de cada coisa plantada (o que é sólido no chão): pedra e cupinzeiro pelo tamanho de verdade, árvore pelo tronco.
// O espaço de copa (minD) pode se cruzar, o corpo não: sem isso nascia cupinzeiro dentro de pedra
function bodyOf(o) { const r = o.userData.regua;
  if (r === 'pedra' || r === 'cupinzeiro') { o.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(o); return Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) / 2; }
  return r === 'moita' || r === 'canela-de-ema' ? 0.35 : 0.45; }
// apaga o capim (densidade 0 no mapa) em volta de pedra, cupinzeiro e tronco: a lâmina não atravessa mais o que é sólido
function carveGrass(x, z, r) { const N = FIELD.res, d = fieldTex.image.data, x0 = CENTER[0] - FIELD.size / 2, z0 = CENTER[1] - FIELD.size / 2, cs = FIELD.size / N, rr = r + cs * 0.75;
  for (let j = Math.max(0, Math.floor((z - rr - z0) / cs)); j <= Math.min(N - 1, Math.ceil((z + rr - z0) / cs)); j++) for (let i = Math.max(0, Math.floor((x - rr - x0) / cs)); i <= Math.min(N - 1, Math.ceil((x + rr - x0) / cs)); i++) {
    const px = x0 + (i + 0.5) * cs, pz = z0 + (j + 0.5) * cs; if (Math.hypot(px - x, pz - z) < rr) d[(j * N + i) * 4 + 1] = 0; }
  fieldTex.needsUpdate = true; }
function place(obj, x, z, minD) { if (!canPlace(x, z, minD)) return false;
  obj.position.set(x, heightAt(x, z) - 0.1, z); obj.rotation.y = rnd() * Math.PI * 2;
  const body = bodyOf(obj); if (placed.some(p => p[3] && Math.hypot(p[0] - x, p[1] - z) < body + p[3])) return false;
  scene.add(obj); placed.push([x, z, minD, body]); if (obj.userData.regua !== 'moita' && obj.userData.regua !== 'canela-de-ema') carveGrass(x, z, obj.userData.regua === 'pedra' || obj.userData.regua === 'cupinzeiro' ? body * 0.95 : 0.35); return true; }
const [tA, tB, tC, tD] = TILES;
// pétalas de ipê: na seca, com a árvore florida, caem devagar (~1 m/s), dançam e o vento leva; embaixo forma um tapete da cor da flor
function ipePetals() { const ipes = scene.children.filter(o => /^ipe/.test(o.userData.kind || '')), N = mobile ? 60 : 110, base = [], seed = [], colA = [], rad = [], gyA = [];
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
// ---------- a vegetação de cada peça, pelo motor de flora (flora.js): a ficha de cada espécie diz onde ela vive, quantas
// por hectare, o mínimo e o máximo que cabem e o espaço da copa; a peça diz quais espécies tem, de acordo com o nome
const slopeAt = (x, z) => Math.hypot(heightAt(x + 0.6, z) - heightAt(x - 0.6, z), heightAt(x, z + 0.6) - heightAt(x, z - 0.6)) / 1.2;
const FLORA_MAKE = { buriti: s => makeBuriti(s), pinheiro: s => makePinheiro(s), cupinzeiro: () => makeTermite(), canela: () => makeCanela(),
  pedra: s => { const f = 0.55 + rnd() * 0.25, m = makeStone(s, f); m.userData.sz = s; m.userData.flat = f; return m; } };
const floraCtx = { R, rnd, inHex, placed, can: canPlace, setor: sectorType,
  env: (x, z) => { const cd = cliffDrop(x, z);
    return { wd: waterDist(x, z), lake: lakeDist(x, z), rocky: rockyAt(x, z), slope: slopeAt(x, z),
      rim: smooth(0.5, 3, cliffDrop(x + 8, z) - cd) * (1 - smooth(0.5, 2, cd)),                                   // alto da escarpa
      edge: Math.min(1, (dirtAt(x + 2.5, z) + dirtAt(x - 2.5, z) + dirtAt(x, z + 2.5) + dirtAt(x, z - 2.5)) * 0.6),   // beira de trilho
      spray: 1 - smooth(6, 10, Math.hypot(x - FALL.pool[0], z - FALL.pool[1])) }; },                                  // zona de respingo da queda
  make: (k, s) => (FLORA_MAKE[k] || (sc => makeTree(k, sc)))(s), place,
  made: (o, sp, F, esc) => { o.userData.esc = esc; if (F.frutos) addFruits(o, ...F.frutos);
    if (sp === 'pedra') { o.position.y = lowAt(o.position.x, o.position.z, o.userData.sz * 0.8) - o.userData.sz * o.userData.flat * 0.25; const p = placed[placed.length - 1]; p[2] = Math.max(p[2], o.userData.sz * 1.4); } } };
{ const t0 = performance.now(); for (const t of TILES) plantTile(t, floraCtx); window.__floraMs = performance.now() - t0; }
window.__flora = TILES.map(t => ({ peca: t.name, ...t.flora }));
ipePetals();
const props = buildProps(scene, { mobile });
const shadeTree = scene.children.find(o => o.userData.kind === 'sombra' && inHex(o.position.x, o.position.z, tC.c, 1));
const clouds = buildClouds(scene, CENTER, { mobile });
const fx = buildFx(scene, { max: mobile ? 500 : 900 });   // partículas (fx.js)
const afx = createFx(scene, { mobile });   // anéis na água, respingos e poeira dos bichos e da lagoa (aguafx.js)
// ---------- colisão: o que ocupa o chão (paredes, cercas, troncos, poço, coreto...) para gente e bicho desviarem
const colisao = buildColisao(), colN = { houses: 0, extra: 0 };
{ const L = LAYOUT, rot2 = (p, rot, lx, lz) => [p[0] + lx * Math.cos(rot) + lz * Math.sin(rot), p[1] - lx * Math.sin(rot) + lz * Math.cos(rot)];
  colisao.box(L.chapel.p[0], L.chapel.p[1], 8.5, 5.4, L.chapel.rot, 'capela'); { const t = rot2(L.chapel.p, L.chapel.rot, 8.5 / 2 - 1.2, -(5.4 / 2 + 1.15)); colisao.box(t[0], t[1], 2.3, 2.3, L.chapel.rot, 'torre'); }
  for (const k of ['venda', 'sobrado', 'celeiro', 'paiol']) { const b = L[k]; if (b) colisao.box(b.p[0], b.p[1], b.w, b.d, b.rot || 0, k); }
  colisao.circle(L.well.p[0], L.well.p[1], 0.95, 'poço'); colisao.circle(L.coreto.p[0], L.coreto.p[1], 3.0, 'coreto'); colisao.circle(L.oven.p[0], L.oven.p[1], 1.1, 'forno'); colisao.circle(L.mill.p[0], L.mill.p[1], 1.6, 'moinho');
  colisao.box(L.cruzeiro.p[0], L.cruzeiro.p[1], 1.6, 1.6, L.chapel.rot + Math.PI / 2, 'cruzeiro'); colisao.circle(L.toco.p[0], L.toco.p[1], 0.36, 'toco'); colisao.box(L.lenha.p[0], L.lenha.p[1], 1.0, 1.0, L.lenha.rot, 'lenha');
  colisao.box(L.bales.p[0], L.bales.p[1], 2.6, 1.5, L.bales.rot, 'fardos'); colisao.box(L.cart.p[0], L.cart.p[1], 3.6, 1.7, L.cart.rot, 'carroça'); colisao.circle(L.scarecrow.p[0], L.scarecrow.p[1], 0.25, 'espantalho');
  if (L.varal) for (const k of [-1, 1]) colisao.circle(L.varal.c[0] + L.varal.dir[0] * L.varal.len / 2 * k, L.varal.c[1] + L.varal.dir[1] * L.varal.len / 2 * k, 0.08, 'varal');
  for (const f of L.fences || []) { for (const [ax, az, bx, bz] of f.segs) colisao.seg(ax, az, bx, bz, 0.09, 'cerca');
    if (f.gate) { const G = f.gate; for (const q of [G.ga, G.gb]) colisao.circle(q[0], q[1], 0.12, 'mourão'); colisao.dyn(G.ga[0], G.ga[1], G.w + 0.2, G.seg, 'porteira'); } }   /* a folha da porteira barra fechada e sai do vão aberta */
  colisao.box(L.corral.cochoP[0], L.corral.cochoP[1], 2.7, 0.8, L.corral.rot, 'cocho'); colisao.box(L.corral.ranchoP[0], L.corral.ranchoP[1], 2.3, 1.7, L.corral.rot, 'rancho');
  // as casas, o que está em LAYOUT.extraCol (esteio de varanda, banco, poste, mesa do forno) e as plantas (troncos, cupinzeiros,
  // pedras grandes; a copa não atrapalha) entram pelo syncCollision, que o tabuleiro chama de novo quando uma peça nova brota
  syncCollision(); }
function syncCollision() { const L = LAYOUT;
  for (const h of L.houses.slice(colN.houses)) colisao.box(h.p[0], h.p[1], h.w, h.d, h.rot, 'casa'); colN.houses = L.houses.length;
  for (const c of (L.extraCol || []).slice(colN.extra)) { if (c.t === 'c') colisao.circle(c.x, c.z, c.r, c.tag); else colisao.box(c.x, c.z, c.w, c.d, c.rot, c.tag); } colN.extra = (L.extraCol || []).length;
  for (const o of scene.children) { const u = o.userData; if (u.colOk) continue; u.colOk = true; const s = (o.scale.x || 1) * Math.min(1, u.esc ?? 1);
    if (u.kind && u.kind !== 'moita') colisao.circle(o.position.x, o.position.z, (u.kind === 'sombra' ? 0.38 : u.kind === 'mata' ? 0.3 : 0.22) * s, 'tronco');
    else if (u.regua === 'buriti' || u.regua === 'pinheiro-bravo') colisao.circle(o.position.x, o.position.z, 0.28 * s, 'tronco');
    else if (u.regua === 'cupinzeiro') colisao.circle(o.position.x, o.position.z, bodyOf(o) * 0.9, 'cupinzeiro');   // pelo tamanho medido do monte (o fixo de 0,5 m deixava o gado entrar nele)
    else if (u.regua === 'pedra' && u.sz > 0.45) colisao.circle(o.position.x, o.position.z, bodyOf(o) * 0.85, 'pedra'); } }
// lugar para uma casa nova (raio r): longe do corpo das plantas e de copa grande, fora da lavoura (antes a vila podia crescer
// por cima de árvore, cupinzeiro, pedra ou milharal)
const buildSpot = (x, z, r) => fieldAt(x, z) < 0.05 && !placed.some(q => Math.hypot(q[0] - x, q[1] - z) < r + Math.max(q[3] || 0.5, Math.min(q[2] * 0.6, 2.5)));
const peixes = buildPeixes(scene, { afx, fx, mobile });   // lambaris e piaus nos poços, na lagoa e nos remansos (peixes.js)
const gente = buildPeople(scene, { mobile, fx, afx, col: colisao, peixes });
const skyfx = buildSkyFx(scene, camera, { mobile, focus: () => camMode === 'jogo' ? gameCam.focus : controls.target });
const fauna = buildFauna(scene, { mobile, fx: afx, col: colisao, shade: shadeTree ? [shadeTree.position.x, shadeTree.position.z] : null, termites: scene.children.filter(o => o.userData.regua === 'cupinzeiro').map(o => [o.position.x, o.position.z]),
  treeTops: scene.children.filter(o => ['cerrado', 'mata', 'sombra'].includes(o.userData.kind)).map(o => { const bb = new THREE.Box3().setFromObject(o); return [o.position.x, bb.max.y - 0.6, o.position.z]; }) });
window.__juiz = createJuiz({ fauna, people: () => gente.people });   // o juiz dos bichos (juiz.js; sim/juiz_bichos.js)
window.__juizGente = createJuizGente({ gente, spot: (() => { const t = TILES.find(t => t.kind === 'pasto'); return [t.c[0] - 6, t.c[1] - 8]; })() });   // o juiz de gente (juizgente.js; sim/juiz_gente.js)
{ let tries = 0; while (ROCKS_IN_WATER.length < 6 && tries++ < 400) { const i = 4 + Math.floor(rnd() * 220), [x0, z0] = RIVER[i], ri = riverInfo(x0, z0), w = riverHalfWidth(ri.s); if (x0 > CLIFF_X - 6) continue;
    if (!inAnyTile(x0, z0, 0.85) || Math.hypot(x0 - SPRING[0], z0 - SPRING[1]) < POOL_R + 2 || ROCKS_IN_WATER.some(r => Math.hypot(r[0] - x0, r[1] - z0) < 5)) continue;
    const side = rnd() < 0.5 ? -1 : 1, off = side * w * (0.45 + rnd() * 0.45), x = x0 - ri.tz * off, z = z0 + ri.tx * off, size = 0.4 + rnd() * 0.35, flat = 0.75;
    putStone(x, z, size, flat, WATER_Y + 0.12 + rnd() * 0.15 - size * flat * 0.9); ROCKS_IN_WATER.push([x, z, size * 0.95]); }
  for (const t of [tA, tB]) for (let k = 0, n = 0; k < 300 && n < 4; k++) { const x = t.c[0] + (rnd() - 0.5) * 2 * R, z = t.c[1] + (rnd() - 0.5) * 2 * R, w = waterDist(x, z);
    if (!inHex(x, z, t.c, 0.9) || w < 0.1 || w > 2.2 || placed.some(p => Math.hypot(p[0] - x, p[1] - z) < 2.5)) continue; putStone(x, z, 0.25 + rnd() * 0.4, 0.6); n++; }
}

// ---------- água: transparente no raso (vê-se o leito de seixos e as cáusticas), turquesa e depois verde-garrafa no fundo,
// reflexo de verdade do céu e das árvores (a cena desenhada de novo por uma câmera espelhada), ondinhas que descem com a
// correnteza, espuma na beira e em volta das pedras, brilhos do sol e anéis de chuva
// pedras no leito logo antes da queda (a água bate, espuma e acelera entre elas): ficam nas casas 8 a 11 do uRocks
{ const iF = RIVER.indexOf(FALL.p); let acc = 0, i = iF, k = 0; const want = [1.5, 2.8, 4.2, 6.0], side = [0.45, -0.6, 0.15, -0.3];
  while (i > 1 && k < want.length) { acc += Math.hypot(RIVER[i][0] - RIVER[i - 1][0], RIVER[i][1] - RIVER[i - 1][1]); i--;
    if (acc < want[k]) continue; const [x0, z0] = RIVER[i], ri = riverInfo(x0, z0), hw = riverHalfWidth(ri.s), nx = -FALL.t[1], nz = FALL.t[0];
    const x = x0 + nx * hw * side[k] + (rnd() - 0.5) * 0.3, z = z0 + nz * hw * side[k] + (rnd() - 0.5) * 0.3, size = 0.32 + rnd() * 0.25, flat = 0.55 + rnd() * 0.15;
    putStone(x, z, size, flat, waterLevelAt(x, z) + 0.08 + rnd() * 0.1 - size * flat * 0.9); ROCKS_IN_WATER[8 + k] = [x, z, size * 0.95]; k++; } }
const ROCKV = Array.from({ length: 12 }, (_, i) => ROCKS_IN_WATER[i] ? new THREE.Vector3(...ROCKS_IN_WATER[i]) : new THREE.Vector3(0, 0, -1));
const waterMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: true,
  uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uReflMat: { value: new THREE.Matrix4() } }]),
  vertexShader: /* glsl */`attribute vec2 flow;attribute float dep;varying vec2 vFlow;varying float vDep;varying vec3 vWp;uniform float uWaterDrop;
    #include <fog_pars_vertex>
    void main(){vec3 p=position;p.y-=uWaterDrop;vec4 w=modelMatrix*vec4(p,1.0);vWp=w.xyz;vFlow=flow;vDep=dep-uWaterDrop;vec4 mvPosition=viewMatrix*w;gl_Position=projectionMatrix*mvPosition;
    #include <fog_vertex>
    }`,
  fragmentShader: /* glsl */`varying vec2 vFlow;varying float vDep;varying vec3 vWp;uniform sampler2D uRefl;uniform mat4 uReflMat;uniform vec3 uRocks[12];uniform vec4 uWade[8];
    ${HEAD}
    #include <fog_pars_fragment>
    const vec2 FALLP=vec2(${FALL.p[0].toFixed(3)},${FALL.p[1].toFixed(3)});const vec2 FALLY=vec2(${(riverLevel(FALL.s - 0.6) - 0.2).toFixed(3)},${(riverLevel(FALL.s + 2) + 0.35).toFixed(3)});
    // relevo da superfície (sem tempo: quem move é a advecção abaixo) e textura de espuma (manchas com bolhinhas, não riscos)
    float hgt(vec2 q){return vnoise(q*vec2(0.6,0.95))*0.55+vnoise(q*vec2(1.7,2.3)+3.7)*0.3+vnoise(q*vec2(4.3,5.1)+9.1)*0.15;}
    float foamT(vec2 q){float n=vnoise(q*vec2(1.6,2.2))*0.55+vnoise(q*vec2(4.2,4.8)+5.0)*0.3+vnoise(q*13.0+2.0)*0.15;return smoothstep(0.42,0.72,n)*(0.65+0.35*vnoise(q*23.0));}
    void main(){float d=vDep;if(d<=0.0)discard;
      // na queda quem desenha a descida é o véu: a superfície do rio some num corte exato por altura (sem serrilha de triângulo)
      if(distance(vWp.xz,FALLP)<9.0&&vWp.y+uWaterDrop<FALLY.x&&vWp.y+uWaterDrop>FALLY.y)discard;
      vec2 p=vWp.xz;vec2 f=length(vFlow)>0.01?normalize(vFlow):vec2(1.0,0.0);vec2 s=vec2(-f.y,f.x);vec2 q=vec2(dot(p,f),dot(p,s));float fl=clamp(length(vFlow),0.0,1.9);
      float rap=smoothstep(1.05,1.7,fl);
      // ---- a correnteza contorna as pedras: escoamento potencial em volta de um cilindro (φ e ψ). As coordenadas do desenho se
      // abrem na frente da pedra e se fecham atrás, então ondas e espuma desviam dela em vez de atravessá-la; na frente a água
      // sobe num travesseiro, nos lados acelera, atrás fica a esteira com vórtices alternados (Kármán)
      float foamR=0.0,pillow=0.0,wake=0.0,boil=0.0;vec2 bump=vec2(0.0);
      for(int i=0;i<12;i++){vec3 rk=uRocks[i];if(rk.z<=0.0)continue;vec2 dr=p-rk.xy;float dist=length(dr);
        if(i==7){   // onde a queda bate no poço: a água ferve e sai em anéis
          float k=1.0-smoothstep(rk.z*0.35,rk.z*1.5,dist);boil=max(boil,k);bump+=dr/max(dist,0.05)*sin(dist*6.5-uTime*5.5)*k*0.22;continue;}
        float a=rk.z,al=dot(dr,f),ac=dot(dr,s),r2=max(dist*dist,a*a*0.8),infl=1.0-smoothstep(a*2.0,a*5.5,dist);
        q+=vec2(a*a*al/r2,-a*a*ac/r2)*infl;
        foamR=max(foamR,(1.0-smoothstep(a*0.97,a+0.05+0.1*vnoise(vec2(atan(dr.y,dr.x)*4.0,uFlowClk*2.0)),dist))*(0.45+0.55*smoothstep(0.3,-0.6,al/a)));   // linha de contato fina, mais forte na frente
        pillow=max(pillow,(1.0-smoothstep(a,a*1.7,dist))*smoothstep(0.3,-0.7,al/a));
        float wd=a*(0.75+0.22*max(al,0.0)/a),wk=exp(-ac*ac/(wd*wd))*smoothstep(0.2*a,a,al)*exp(-max(al,0.0)/(1.4+a*4.0));
        wake=max(wake,wk*(0.5+0.5*sin(al*2.6/a-uFlowClk*5.0+sign(ac)*1.57)));
        bump+=dr/max(dist,0.05)*(1.0-smoothstep(a,a*1.9,dist))*(0.3+0.4*fl);}
      // ---- advecção com a velocidade local (lenta no remanso, rápida na corredeira) em duas fases que se revezam: o desenho
      // anda com a água sem se esticar com o tempo
      float sp=0.3+1.05*fl,t0=fract(uFlowClk*0.45),t1=fract(t0+0.5),wB=abs(1.0-2.0*t0);
      vec2 qa=q-vec2(t0*2.2*sp,0.0),qb=q-vec2(t1*2.2*sp,0.0)+vec2(5.3,2.9);
      float e=0.08,amp=0.06+0.07*fl+0.25*uRain+0.26*rap+0.2*boil;
      float ha=hgt(qa),hb=hgt(qb);vec2 gq=mix(vec2(hgt(qa+vec2(e,0.0))-ha,hgt(qa+vec2(0.0,e))-ha),vec2(hgt(qb+vec2(e,0.0))-hb,hgt(qb+vec2(0.0,e))-hb),wB)/e*amp;
      vec2 gw=f*gq.x+s*gq.y+bump*0.18;
      float ring=0.0;if(uRain>0.01){vec2 c=floor(p*1.7),fp=fract(p*1.7)-0.5;float r=hash21(c);float t=fract(uTime*1.1+r*7.0);vec2 o=(vec2(hash21(c+3.1),hash21(c+7.7))-0.5)*0.5;
        vec2 dv=fp-o;float dd=length(dv);ring=(1.0-smoothstep(0.0,0.05,abs(dd-t*0.42)))*(1.0-t)*step(r,uRain*0.9+0.1);gw+=dv/max(dd,0.001)*ring*0.5;}
      float fT=mix(foamT(qa*1.3),foamT(qb*1.3),wB);
      float foam=foamR*0.6+pillow*0.6*fT+wake*fT*0.9;
      // marolas de quem está n'água: anéis que saem do corpo e deitam o reflexo (boi bebendo, capivara, a roupa na pedra, a bola)
      for(int i=0;i<8;i++){vec4 Wd=uWade[i];if(Wd.z<=0.0)continue;vec2 dv=p-Wd.xy;float r=length(dv);float env=exp(-r*1.6/max(Wd.w,0.3));
        gw+=dv/max(r,0.02)*sin(r*15.0-uTime*6.5)*env*Wd.z*0.4;foam+=(1.0-smoothstep(Wd.w*0.6,Wd.w*1.3,r))*0.45*Wd.z*smoothstep(0.35,0.7,vnoise(p*9.0+uTime*2.0));}
      vec3 N=normalize(vec3(-gw.x,1.0,-gw.y));vec3 V=normalize(cameraPosition-vWp);float cv=max(dot(N,V),0.0);
      float F=(0.03+0.75*pow(1.0-cv,4.0))*smoothstep(0.0,0.05,d);float cs=cloudShadow(p);
      vec4 rc=uReflMat*vec4(vWp,1.0);vec2 ruv=rc.xy/rc.w+N.xz*(0.035+0.16*boil+0.05*rap);/* água revolta quebra o reflexo */vec2 rb=vec2(0.0035,0.0045)*(1.0+2.0*fl);
      vec3 refl=texture2D(uRefl,clamp(ruv,0.002,0.998)).rgb*0.36+(texture2D(uRefl,clamp(ruv+vec2(rb.x,0.0),0.002,0.998)).rgb+texture2D(uRefl,clamp(ruv-vec2(rb.x,0.0),0.002,0.998)).rgb+texture2D(uRefl,clamp(ruv+vec2(0.0,rb.y),0.002,0.998)).rgb+texture2D(uRefl,clamp(ruv-vec2(0.0,rb.y),0.002,0.998)).rgb)*0.16;
      refl=mix(refl,mix(uSkyHor,uSkyZen,0.35),smoothstep(0.6,1.5,abs(vWp.y-(${WATER_Y.toFixed(3)}-uWaterDrop))));
      float Tl=dot(exp(-vec3(1.6,0.6,0.5)*d*0.9),vec3(0.3,0.4,0.3));
      vec3 scat=toLin(mix(vec3(0.30,0.50,0.40),vec3(0.07,0.22,0.20),smoothstep(0.25,1.4,d)))*(0.3+0.7*cs)*(0.04+0.96*uDay);
      vec3 col=scat*(1.0-Tl)*(1.0-F)+refl*F;float A=1.0-Tl*(1.0-F);
      vec3 Rf=reflect(-V,N);float glint=pow(max(dot(Rf,uSunW),0.0),900.0);col+=uSunC*glint*(1.2+1.6*vnoise(p*31.0))*cs;A=min(1.0,A+glint*0.4);
      // beira (um fio de espuma onde a água fica rasa), corredeira (manchas brancas que andam rápido) e o poço fervendo
      foam+=0.5*(1.0-smoothstep(0.015,0.08,d))*fT*smoothstep(0.0,0.01,d);
      foam+=rap*smoothstep(0.3,0.75,vnoise(qa*vec2(0.35,0.6))*0.5+vnoise(qb*vec2(0.35,0.6)+1.0)*0.5)*(0.35+0.65*fT)*smoothstep(0.05,0.35,d);
      { vec2 bq=p*4.5+vec2(uTime*0.35,-uTime*0.3);float bub=smoothstep(0.5,0.8,vnoise(bq)*0.5+vnoise(bq*2.3+4.0)*0.3+vnoise(bq*5.1-uTime*0.9)*0.2);   // bolhas miúdas que fervem e se desmancham para fora
        foam+=boil*boil*0.55+boil*bub*0.7; }
      foam=clamp(foam,0.0,1.0);vec3 fc=vec3(0.95,0.98,1.0)*(0.08+0.92*uDay)*(0.65+0.35*cs);
      col=col/max(A,1e-3);col=mix(col,fc,foam*0.8);col+=ring*0.2*uDay;A=max(A,foam*0.8);
      gl_FragColor=vec4(col,A);
      #include <colorspace_fragment>
      #include <fog_fragment>
    }`,
});
Object.assign(waterMat.uniforms, U); waterMat.uniforms.uWade = { value: Array.from({ length: 8 }, () => new THREE.Vector4()) }; waterMat.uniforms.uRefl = { value: reflRT.texture }; waterMat.uniforms.uRocks = { value: ROCKV };
ROCKV[7].set(FALL.pool[0] - FALL.t[0] * 1.2, FALL.pool[1] - FALL.t[1] * 1.2, 2.6);   // a água que cai espuma no poço (o ponto exato segue o impacto, abaixo)
// ---------- a queda: o véu d'água em duas camadas. Embaixo, o corpo verde-claro translúcido que incha na borda antes de
// cair; por cima, os fios brancos que aceleram na descida (a textura corre mais rápido embaixo, como água em queda livre) e
// se abrem em franjas e furos perto do poço, onde a água já vem cheia de ar. Dos lados, fios d'água escorrem pela rocha.
{ const n = [-FALL.t[1], FALL.t[0]], w = riverHalfWidth(FALL.s) * 0.95, top = riverLevel(FALL.s - 2), bot = top - DROP;
  const lip = [FALL.p[0] - FALL.t[0] * 0.6, FALL.p[1] - FALL.t[1] * 0.6];
  // Física: a água sai da borda com a velocidade da correnteza (v0, para fora) e cai livre: d = g·s²/2, afastamento = v0·s,
  // com s o tempo de voo (6 m de queda levam ~1,1 s). A vazão (Q) vem do tempo: cheia na chuva, mirrada na seca. Com pouca
  // vazão v0 é pequeno e a água escorre colada na rocha (o véu não atravessa o paredão: o perfil da rocha vai num uniform),
  // fica estreita e se parte em fios; na cheia o véu sai longe, largo e branco. A textura corre no tempo de voo, então os
  // riscos se esticam sozinhos embaixo, onde a água já vem a ~11 m/s. O ponto de impacto, os respingos, as ferveduras no
  // poço e a espuma seguem o mesmo cálculo, aqui no JS.
  const G = 9.8, TF = Math.sqrt(2 * DROP / G), cd0 = cliffDrop(lip[0], lip[1]), WALL = [];
  // (até onde a rocha cai de verdade: com o talude no pé ela não chega aos DROP metros, e sem esse teto a busca ia até 8 m e a
  // última fileira do véu se deitava sobre o poço como um leque)
  let dMax = 0; for (let sx = 0; sx < 8; sx += 0.05) dMax = Math.max(dMax, cliffDrop(lip[0] + FALL.t[0] * sx, lip[1] + FALL.t[1] * sx) - cd0);
  for (let k = 0; k < 16; k++) { const d = Math.min(DROP * k / 15, dMax - 0.05); let sx = 0; while (sx < 8 && cliffDrop(lip[0] + FALL.t[0] * sx, lip[1] + FALL.t[1] * sx) - cd0 < d - 0.01) sx += 0.02; WALL.push(sx); }
  const FQ = { q: 1, v0: 2 }, wallAt = d => { const f = Math.max(0, Math.min(14.999, d / DROP * 15)), i0 = Math.floor(f); return WALL[i0] + (WALL[i0 + 1] - WALL[i0]) * (f - i0); };
  const impactOut = () => Math.max(0.1 + FQ.v0 * TF, wallAt(DROP) + 0.06);
  const fallU = { uLip: { value: new THREE.Vector3(lip[0], top, lip[1]) }, uTd: { value: new THREE.Vector2(...FALL.t) }, uNd: { value: new THREE.Vector2(...n) }, uW: { value: w },
    uV0: { value: 2 }, uQ: { value: 1 }, uWall: { value: WALL }, uDrop: { value: DROP }, uTf: { value: TF } };
  const sheet = (NU, NV) => { const pos = [], uv = [], idx = [];
    for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) { const u = i / NU * 2 - 1, v = Math.pow(j / NV, 0.8); pos.push(lip[0], top - v * DROP, lip[1]); uv.push(u, v); }
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + NU + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g; };
  const FALL_V = `uniform vec3 uLip;uniform vec2 uTd,uNd;uniform float uW,uV0,uQ,uWall[16],uDrop,uTf,uOff,uTime;varying vec2 vUv;varying vec3 vWp;varying float vS,vWallK;
#include <fog_pars_vertex>
float wallAt(float d){float f=clamp(d/uDrop*15.0,0.0,14.999);int i=int(f);return mix(uWall[i],uWall[i+1],fract(f));}
void main(){float s=uv.y*uTf,d=min(uDrop,4.9*s*s);float bal=0.12+uOff+uV0*s,wl=wallAt(d)+0.07+uOff;float o=max(bal,wl);vWallK=smoothstep(0.0,0.25,wl-bal);
  o+=0.05*(0.5+0.5*sin(uv.x*13.0+uTime*2.6-uv.y*7.0))*smoothstep(0.12,0.5,uv.y)*smoothstep(0.12,0.35,bal-wl)*clamp(uQ,0.0,1.0);   // só para fora e longe da rocha   // o véu ondula na espessura (não é uma placa lisa)
  float ww=uW*(0.45+0.55*clamp(uQ,0.0,1.25))*(1.0+0.16*uv.y+0.1*vWallK)*(1.0-0.06*sin(uv.y*9.0+uv.x*3.0)*uv.y);
  float bulge=0.05*(1.0-uv.x*uv.x)*max(0.0,1.0-uv.y/0.08)*clamp(uQ,0.3,1.3);
  vec3 p=vec3(uLip.x+uNd.x*uv.x*ww+uTd.x*o,uLip.y-d+0.03+bulge,uLip.z+uNd.y*uv.x*ww+uTd.y*o);
  vUv=uv;vS=s;vec4 w=modelMatrix*vec4(p,1.0);vWp=w.xyz;vec4 mvPosition=viewMatrix*w;gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`;
  const mkMat = layer => { const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uLayer: { value: layer }, uOff: { value: layer === 1 ? 0.07 : 0 }, uSeep: { value: 0 } }]),
    vertexShader: layer === 2 ? `varying vec2 vUv;varying vec3 vWp;varying float vS,vWallK;
#include <fog_pars_vertex>
void main(){vUv=uv;vS=uv.y;vWallK=1.0;vec4 w=modelMatrix*vec4(position,1.0);vWp=w.xyz;vec4 mvPosition=viewMatrix*w;gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}` : FALL_V,
    fragmentShader: `varying vec2 vUv;varying vec3 vWp;varying float vS,vWallK;uniform float uLayer,uQ,uSeep,uDrop;
${HEAD}
#include <fog_pars_fragment>
void main(){float y=vUv.y,ph=vS-uTime;float thin=clamp(uQ,0.0,1.0);
      // os fios balançam um pouco ao cair, e a água desce em pacotes (faixas mais densas e mais ralas que descem pelo véu)
      float xw=vUv.x+0.035*sin(ph*2.1+vUv.x*5.0)*y,pk=smoothstep(0.3,0.75,vnoise(vec2(xw*4.0,ph*1.7)));
      // a borda do véu: sempre um pouco recortada; com pouca água ele se parte em fios separados
      float ax=abs(xw)+(vnoise(vec2(ph*1.4,sign(vUv.x)*3.0))-0.5)*0.16*y;
      float edge=1.0-smoothstep(0.72-0.3*y-0.25*(1.0-thin),1.0,ax);float strands=smoothstep(0.35,0.6,vnoise(vec2(xw*(9.0+10.0*(1.0-thin)),ph*0.8)));edge*=mix(strands,1.0,smoothstep(0.35,0.85,thin)-0.25*smoothstep(0.55,1.0,y));
      float f1=vnoise(vec2(xw*24.0,ph*7.0)),f2=vnoise(vec2(xw*61.0+3.0,ph*15.0)),f3=vnoise(vec2(xw*8.0,ph*3.0));
      // a língua: logo na borda a água passa lisa, translúcida e esverdeada, antes de pegar ar e embranquecer
      float tongue=1.0-smoothstep(0.03,0.16,y);
      float st=f1*0.5+f2*0.33+f3*0.17,aer=clamp(smoothstep(0.1,0.95,y)+vWallK*0.5,0.0,1.0),light=(0.12+0.88*uDay)*(0.72+0.28*cloudShadow(vWp.xz));
      vec3 body=toLin(vec3(0.40,0.76,0.72)),white=vec3(0.96,0.985,1.0);vec4 c;
      if(uLayer<0.5){float wh=smoothstep(0.42-0.22*aer,0.8-0.2*aer,st)*(0.6+0.4*pk);c=vec4(mix(body*(0.95+0.3*f3),white,clamp(wh*0.7+aer*0.5+0.1,0.0,0.95)*(1.0-tongue*0.85)),(0.7+0.22*wh+0.08*aer)*edge);
        c.rgb=mix(c.rgb,body*0.8+uSkyHor*0.22+vec3(0.6,0.7,0.7)*pow(f1,5.0)*1.2,tongue*0.75);c.a=mix(c.a,0.66*edge,tongue);}
      else if(uLayer<1.5){float wh=smoothstep(0.5-0.18*aer,0.72-0.12*aer,st);float frs=smoothstep(0.25,0.55,vnoise(vec2(vUv.x*13.0,ph*2.4))+0.55-0.6*aer);
        c=vec4(white,wh*edge*(0.35+0.55*aer)*mix(1.0,frs,aer)*(0.75+0.25*pk)*1.25*(1.0-tongue*0.95));}
      else{float fk=max(smoothstep(0.44,0.56,y),uSeep);   // fk: 0 no braço raso sobre a laje, 1 na descida pela rocha
        float wh=smoothstep(0.35,0.75,vnoise(vec2(vUv.x*6.0,y*mix(9.0,14.0,fk)-uTime*mix(1.6,4.0,fk))));
        vec3 shal=mix(body*0.55,white,0.12+0.25*wh*smoothstep(0.35,0.7,1.0-abs(vUv.x)));   // em cima, lâmina rasa: quase transparente, um brilho correndo
        c=vec4(mix(shal,mix(body,white,0.4+0.4*wh),fk),mix(0.16+0.16*wh,0.18+0.3*wh,fk)*smoothstep(0.1,0.6,uQ)*(1.0-smoothstep(0.6,1.0,abs(vUv.x)))*smoothstep(0.0,0.08,y)*(1.0-smoothstep(0.9,1.0,y)));}
      c.a*=(1.0-smoothstep(0.93,1.0,y)*0.6)*smoothstep(0.05,0.3,uQ);
      if(uLayer<1.5)c.a*=1.0-smoothstep(uDrop*0.9,uDrop*1.02,4.9*vS*vS);   // ao tocar o poço o véu afunda (vira a espuma do poço), não se deita sobre a água
      gl_FragColor=vec4(c.rgb*light,c.a);
#include <colorspace_fragment>
#include <fog_fragment>
}` }); Object.assign(m.uniforms, U, fallU); return m; };
  const NU = mobile ? 14 : 22, NV = mobile ? 20 : 30;
  const body = new THREE.Mesh(sheet(NU, NV), mkMat(0)); body.renderOrder = 3; body.frustumCulled = false; scene.add(body);
  const fios = new THREE.Mesh(sheet(NU, NV), mkMat(1)); fios.renderOrder = 4; fios.frustumCulled = false; scene.add(fios);
  // fios d'água escorrendo pela rocha dos dois lados (onde a escarpa é alta), colados no paredão
  const trickle = mkMat(2);
  // altura da malha do chão que é desenhada (raio de cima para baixo): na parede quase vertical ela difere do heightAt e a tira
  // ficava parte no ar, parte dentro da rocha, e aparecia como riscos brancos soltos
  const ray = new THREE.Raycaster(), gms = TILES.map(t => t.gm).filter(Boolean), down = new THREE.Vector3(0, -1, 0);
  const meshY = (x, z) => { ray.set(new THREE.Vector3(x, 300, z), down); const h = ray.intersectObjects(gms, false)[0]; return h ? h.point.y : heightAt(x, z); };
  // cada fio tem de onde vir: um braço raso que sai da beira do rio (s = -3,6 m, dentro d'água), serpenteia pela laje até a
  // borda e só então desce colado na rocha; atrás dele a rocha fica escura de molhada, com limo (antes nasciam do nada no alto)
  const wetMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, uniforms: { uWaterDrop: U.uWaterDrop, uDay: U.uDay },
    vertexShader: 'varying vec2 vUv;varying vec3 vWp;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.0);vWp=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: `uniform float uWaterDrop,uDay;varying vec2 vUv;varying vec3 vWp;${NOISE}
      void main(){float e=1.0-smoothstep(0.35,1.0,abs(vUv.x)+(vnoise(vec2(vUv.y*9.0,vWp.y*2.0))-0.5)*0.35);float moss=smoothstep(0.5,0.75,vnoise(vWp.xz*3.0+vWp.y*1.7));
        float a=e*(0.62+0.25*moss)*smoothstep(0.0,0.06,vUv.y)*(1.0-smoothstep(0.92,1.0,vUv.y))*(1.0-clamp(uWaterDrop*1.2,0.0,0.8));if(a<0.01)discard;
        gl_FragColor=vec4(mix(vec3(0.05,0.07,0.05),vec3(0.13,0.2,0.08),moss)*(0.3+0.7*uDay),a);
        #include <colorspace_fragment>
      }` });
  const ribbon = (pts, halfW, mat, ro) => { const pos = [], uv = [], idx = [], L = pts.length;
    for (let j = 0; j < L; j++) { const [x, y, z, hw, lx = n[0], lz = n[1]] = pts[j], v = j / (L - 1); for (const u of [-1, 1]) { pos.push(x + lx * u * hw * halfW, y, z + lz * u * hw * halfW); uv.push(u, v); } }
    for (let j = 0; j < L - 1; j++) { const a = j * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    const m = new THREE.Mesh(g, mat); m.renderOrder = ro; scene.add(m); return m; };
  // três fios, cada um com origem que se explica: (1) o transbordo, que sai do rio por um entalhe na borda (SPILL, world.js)
  // e desce ao lado da queda; (2) e (3) minas: brotam de uma fresta entre as camadas do arenito, 1,6 e 2,4 m abaixo do topo,
  // com a rocha molhada e o limo começando um palmo acima da fresta (antes os três nasciam do nada no alto da laje)
  const trickleSeep = mkMat(2); trickleSeep.uniforms.uSeep.value = 1;
  // o pé de cada fio no chão: a poça e o filete que escorre até o poço (uTrk no chão) e sem capim dentro da poça
  const footAt = (i, path) => { const b = path[path.length - 1]; if (!b) return; const tx = FALL.pool[0] - b[0], tz = FALL.pool[1] - b[2], L = Math.hypot(tx, tz) || 1, k = Math.min(1, Math.max(0, L - 2.2) / L);
    TRK[i].set(b[0], b[2], tx * k, tz * k); carveGrass(b[0], b[2], 0.45); };
  // o caminho pela rocha, altura por altura: um raio horizontal vindo de fora bate no paredão (o vertical amostra mal a parede
  // quase a prumo) e a tira fica a poucos cm da rocha, até o pé do talude
  const back = new THREE.Vector3(-FALL.t[0], 0, -FALL.t[1]), yBot = meshY(lip[0] + FALL.t[0] * 6, lip[1] + FALL.t[1] * 6);
  const cliffPath = (off, y0, gap, N) => { const out = []; for (let j = 0; j <= N; j++) { const y = y0 + (yBot + 0.15 - y0) * j / N;
      ray.set(new THREE.Vector3(lip[0] + n[0] * off + FALL.t[0] * 10, y, lip[1] + n[1] * off + FALL.t[1] * 10), back); const h = ray.intersectObjects(gms, false)[0]; if (!h) continue;
      { const al = (h.point.x - lip[0]) * FALL.t[0] + (h.point.z - lip[1]) * FALL.t[1]; if (al < -2.2 || al > 7) continue; }   // só a face da escarpa (não o barranco lá atrás)
      // a tira se abre ao longo da face da rocha ali (horizontal e tangente à parede), e se afasta dela pela normal
      const FN = h.face.normal, lx0 = FN.z, lz0 = -FN.x, ll = Math.hypot(lx0, lz0) || 1, sg = lx0 * n[0] + lz0 * n[1] < 0 ? -1 : 1;
      out.push([h.point.x + FN.x * gap, h.point.y + FN.y * gap, h.point.z + FN.z * gap, 1, sg * lx0 / ll, sg * lz0 / ll]); } return out; };
  { const off = SPILL.off, top = [], N = 14;   // (1) do rio, pelo entalhe, até a borda (para onde a rocha acaba: com o recuo da queda a borda fica antes do fim do entalhe)
    const at = k => [SPILL.a[0] + (SPILL.b[0] - SPILL.a[0]) * k, SPILL.a[1] + (SPILL.b[1] - SPILL.a[1]) * k], wl0 = waterLevelAt(...SPILL.a);
    let kE = 0; while (kE < 1 && meshY(...at(kE + 0.02)) > wl0 - 0.6) kE += 0.02;
    for (let j = 0; j <= N; j++) { const k = j / N * kE, [x, z] = at(k);
      top.push([x, Math.max(meshY(x, z) + 0.03, waterLevelAt(x, z) - 0.02 - 0.06 * j / N), z, 2.2 - 1.2 * j / N]); }
    const E = top[top.length - 1], yl = E[1], offE = (E[0] - lip[0]) * n[0] + (E[2] - lip[1]) * n[1];   // desce bem de onde o braço chegou à borda
    const down = cliffPath(offE, yl - 0.05, 0.07, 14), pts = top.concat(down);   // metade da tira em cima, metade na descida (o shader troca de raso para queda no meio)
    ribbon(pts, 0.14, trickle, 3); ribbon(cliffPath(offE, yl - 0.05, 0.04, 30), 0.14 * 4, wetMat, 2); footAt(0, down); }
  for (const [off, wd, depth] of [[-(w + 2.4), 0.11, 1.6], [w + 3.6, 0.07, 2.4]]) {   // (2) e (3) minas na fresta
    const yTop = meshY(lip[0] + n[0] * off - FALL.t[0], lip[1] + n[1] * off - FALL.t[1]), ys = yTop - depth;
    const dn = cliffPath(off, ys, 0.07, 26); ribbon(dn, wd, trickleSeep, 3); ribbon(cliffPath(off, ys + 0.45, 0.04, 30), wd * 4.5, wetMat, 2); footAt(off < 0 ? 1 : 2, dn); }
  const stoneFree = (x, z, sz) => !placed.some(p => p[3] && Math.hypot(p[0] - x, p[1] - z) < (sz * 1.2 + p[3]) * 0.7);   // encostam, não se fundem
  // blocos caídos do paredão em volta do poço (rio abaixo e dos lados) e cascalho no pé da escarpa, ao longo do vale
  for (let k = 0; k < 11; k++) { const a = Math.atan2(FALL.t[1], FALL.t[0]) + (rnd() - 0.5) * 3.4, r = 4.4 + rnd() * 1.8, x = FALL.pool[0] + Math.cos(a) * r, z = FALL.pool[1] + Math.sin(a) * r;
    if (waterDist(x, z) > 0.15 && !blocked(x, z, 0.3)) { const sz = 0.45 + rnd() * 0.75; if (stoneFree(x, z, sz)) { putStone(x, z, sz, 0.6 + rnd() * 0.3); colisao.circle(x, z, sz * 0.6, 'pedra'); } } }
  for (let zz = -26; zz <= 26; zz += 2.2) { const z = FALL.p[1] + zz + (rnd() - 0.5) * 1.5, hTop = heightAt(CLIFF_X - 3, z); if (Math.abs(zz) < w + 4) continue;
    for (let x = CLIFF_X - 1; x < CLIFF_X + 7; x += 0.25) { if (heightAt(x, z) < hTop - DROP * 0.9 && Math.abs(heightAt(x + 0.4, z) - heightAt(x, z)) < 0.1) { const xx = x + rnd() * 1.2; if (waterDist(xx, z) > 0.5 && rnd() < 0.7) { const sz = 0.22 + rnd() * 0.45; if (stoneFree(xx, z, sz)) { putStone(xx, z, sz, 0.55 + rnd() * 0.3); colisao.circle(xx, z, sz * 0.55, 'pedra'); } } break; } } }
  // a cada quadro: a vazão do tempo (suavizada), o impacto, respingos que saltam com a velocidade da queda, gotas que se
  // soltam do véu e caem livres, ferveduras (anéis) no poço onde a água bate, e a espuma do poço acompanhando o impacto
  let acc = 0, accB = 0;
  window.__fallFx = dt => { const q = Math.max(0, Math.min(1.5, 1 - U.uWaterDrop.value * 1.6 + U.uRain.value * 0.7)) || 0; FQ.q += (q - FQ.q) * Math.min(1, dt * 0.5); FQ.v0 = 0.35 + 1.6 * FQ.q;
    fallU.uQ.value = FQ.q; fallU.uV0.value = FQ.v0; window.__fallQ = FQ;
    const io = impactOut(), ix = lip[0] + FALL.t[0] * io, iz = lip[1] + FALL.t[1] * io, wl = waterLevelAt(ix, iz) - U.uWaterDrop.value, ww = w * (0.45 + 0.55 * Math.min(1.25, FQ.q)) * 1.16;
    ROCKV[7].set(ix + FALL.t[0] * 0.6, iz + FALL.t[1] * 0.6, 1.2 + 1.6 * Math.min(1.3, FQ.q));
    acc += dt; accB += dt; if (FQ.q < 0.08) return;
    const vImp = Math.hypot(FQ.v0, G * TF);   // ~11 m/s na água do poço
    if (fx && acc > 0.05) { const k = Math.min(5, Math.round(acc / 0.05 * (0.4 + FQ.q))); acc = 0;
      for (let i = 0; i < k; i++) { const u = (Math.random() * 2 - 1) * ww, x = ix + n[0] * u, z = iz + n[1] * u;
        fx.emit('respingo', x, wl + 0.05, z, 2, { dir: [FALL.t[0] * 0.12 * vImp, 0.16 * vImp, FALL.t[1] * 0.12 * vImp], spread: 1.2, speed: 0.6 + 0.4 * FQ.q });
        if (Math.random() < 0.3 + 0.2 * FQ.q) fx.emit('nevoa', x, wl + 0.3, z, 1, { spread: 0.8 });
        if (Math.random() < 0.5) fx.emit('espuma', x + FALL.t[0] * (0.5 + Math.random() * 2), wl, z + FALL.t[1] * (0.5 + Math.random() * 2), 1, { spread: 0.6 }); }
      // gotas que se soltam da borda do véu e caem livres (mesma balística do véu, um pouco mais devagar para fora)
      for (let i = 0; i < 2; i++) { const s0 = Math.random() * TF * 0.8, side = Math.random() < 0.5 ? -1 : 1, u = side * ww * (0.85 + Math.random() * 0.2), o = Math.max(0.12 + FQ.v0 * s0, wallAt(4.9 * s0 * s0) + 0.07);
        fx.emit('gota', lip[0] + n[0] * u + FALL.t[0] * o, top - 4.9 * s0 * s0, lip[1] + n[1] * u + FALL.t[1] * o, 1, { dir: [FALL.t[0] * FQ.v0 * 0.85 + n[0] * side * 0.3, -G * s0, FALL.t[1] * FQ.v0 * 0.85 + n[1] * side * 0.3], spread: 0.15, speed: 1 }); } }
    // fervedura: o ar que a queda enfia na água sobe e estoura em anéis, mais rio abaixo quanto mais forte a queda
    if (afx && accB > 0.16 / (0.4 + FQ.q)) { accB = 0; const u = (Math.random() * 2 - 1) * ww, f = 0.3 + Math.random() * (1.2 + 1.6 * FQ.q);
      afx.ripple(ix + n[0] * u + FALL.t[0] * f, wl, iz + n[1] * u + FALL.t[1] * f, 0.5 + Math.random() * 0.8 * FQ.q); } };
  // borrifo: neblina que sobe do poço e o vento leva; com sol baixo faz um arquinho de cor
  const NP = mobile ? 160 : 320, P = [], S = []; for (let i = 0; i < NP; i++) { P.push(FALL.pool[0] - FALL.t[0] * 1.0, bot, FALL.pool[1] - FALL.t[1] * 1.0); S.push(Math.random()); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); pg.setAttribute('seed', new THREE.Float32BufferAttribute(S, 1));
  const pm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uPx: { value: 600 } },
    vertexShader: `attribute float seed;uniform float uTime,uPx,uWindBase,uDay;uniform vec2 uWindDir;varying float vA;void main(){float k=fract(uTime*0.22+seed*7.0);float a=seed*62.8;
      vec3 p=position+vec3(cos(a)*(0.6+k*2.8),k*4.5,sin(a)*(0.6+k*2.8));p.xz+=uWindDir*uWindBase*k*1.4;vec4 mv=viewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;
      gl_PointSize=min(160.0,(0.4+k*1.6)*uPx/max(1.0,-mv.z));vA=(1.0-k)*smoothstep(0.0,0.1,k)*0.35*smoothstep(2.5,7.0,-mv.z);}   /* perto da lente o borrifo some (não vira um borrão) */`,
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
const water = new THREE.Group(); scene.add(water);
function waterMeshFor(tiles, withOutside) { const pos = [], flow = [], depA = [], idx = [];
  for (const t of tiles) { const { pos: P, idx: I } = sectorGrid(t.c, mobile ? 44 : 60), base = pos.length / 3, keep = [];
    for (let i = 0; i < P.length / 3; i++) { const x = P[i * 3], z = P[i * 3 + 2], ri = riverInfo(x, z), lv = waterLevelAt(x, z), dep = lv - heightAt(x, z); keep.push(dep > -0.2 && waterDist(x, z) < 1.3 && (dep < 2.2 || lv < riverLevel(FALL.s + 2) + 0.4) && (ri.extra || ri.d < riverHalfWidth(ri.s) + 0.15 || (Math.hypot(x - FALL.pool[0], z - FALL.pool[1]) < 5.5 && lv < riverLevel(FALL.s + 2) + 0.4) || (ri.s < FALL.s - 0.35 && dep < 1.6)));   /* fora da calha (o entalhe do transbordo), a água para na borda: não desce o paredão junto com o nível do rio */   // só onde é rio, poço ou lagoa de verdade
      const still = Math.hypot(x - SPRING[0], z - SPRING[1]) < POOL_R + 1 || lakeDist(x, z) < 3, sp = (still ? 0.12 : Math.min(1, 0.4 + 0.6 * (1 - ri.d / (riverHalfWidth(ri.s) + 0.5)))) * (ri.s < FALL.s ? 1 + 0.9 * smooth(FALL.s - 12, FALL.s, ri.s) : 1);   // a água acelera chegando na borda da queda
      pos.push(x, lv, z); flow.push(ri.tx * sp, ri.tz * sp); depA.push(dep); }
    for (let i = 0; i < I.length; i += 3) if (keep[I[i]] || keep[I[i + 1]] || keep[I[i + 2]]) idx.push(base + I[i], base + I[i + 1], base + I[i + 2]); }
  if (withOutside) { const L = latticeGeometry(0, 150, 0.9, P => outside(P) && P.some(([x, z]) => waterDist(x, z) < 1.4)), base = pos.length / 3;
    for (let i = 0; i < L.pos.length / 3; i++) { const x = L.pos[i * 3], z = L.pos[i * 3 + 2], ri = riverInfo(x, z), lv = waterLevelAt(x, z); pos.push(x, lv - 0.06, z); flow.push(ri.tx, ri.tz); depA.push(lv + 0.04 - heightAt(x, z)); }
    for (const v of L.idx) idx.push(base + v); }
  if (!idx.length) return null;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('flow', new THREE.Float32BufferAttribute(flow, 2));
  g.setAttribute('dep', new THREE.Float32BufferAttribute(depA, 1)); g.setIndex(idx); const m = new THREE.Mesh(g, waterMat); m.renderOrder = 2; water.add(m); return m; }
waterMeshFor(TILES.filter(t => ['rio', 'mata', 'cachoeira', 'lagoa'].includes(t.kind)), true);
// ---------- folhas e flores boiando: a correnteza leva (mais rápida no meio do rio, mais ainda na chuva e na queda),
// os remansos da beira seguram e giram; o que sai da água ou chega ao fim do rio volta a cair lá em cima
{ const N = mobile ? 16 : 36, g = new THREE.PlaneGeometry(0.13, 0.08).rotateX(-Math.PI / 2), m = new THREE.InstancedMesh(g, toon({ color: 0xffffff, side: THREE.DoubleSide }), N), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), S = new THREE.Vector3(1, 1, 1);
  const COLS = [0x8a9a3a, 0xb8a040, 0x9a6a2a, 0xf2c230, 0x6a8a3a, 0xc88a3a], endS = riverInfo(...RIVER[RIVER.length - 1]).s, L = [];
  const spawn = (o, anywhere) => { const i = Math.floor(rnd() * (anywhere ? RIVER.length - 20 : 60)), [x, z] = RIVER[i], ri = riverInfo(x, z), w = riverHalfWidth(ri.s), u = (rnd() - 0.5) * w;
    Object.assign(o, { x: x - ri.tz * u, z: z + ri.tx * u, a: rnd() * 6.28, spin: (rnd() - 0.5) * 0.6, t: 0 }); return o; };
  for (let i = 0; i < N; i++) { L.push(spawn({}, true)); m.setColorAt(i, new THREE.Color(COLS[i % COLS.length]).multiplyScalar(0.8 + rnd() * 0.3)); }
  m.renderOrder = 3; m.frustumCulled = false; m.userData.noRegua = true; scene.add(m);
  window.__leaves = dt => { const rain = U.uRain.value; L.forEach((o, i) => { const ri = riverInfo(o.x, o.z), w = riverHalfWidth(ri.s), c = 1 - Math.min(1, ri.d / Math.max(0.5, w)), nearFall = !ri.extra && Math.abs(ri.s - FALL.s) < 2.5;
      const v = (0.12 + 0.55 * c * c) * (1 + rain * 0.9) * (nearFall ? 3.5 : 1) * (1 - U.uWaterDrop.value * 0.6);
      o.x += ri.tx * v * dt; o.z += ri.tz * v * dt; const e = vnoise(o.x * 0.7 + U.uTime.value * 0.1, o.z * 0.7) - 0.5; o.x += -ri.tz * e * 0.08 * dt; o.z += ri.tx * e * 0.08 * dt;   // remoinho da beira
      o.a += (o.spin + (1 - c) * 0.5 * Math.sign(e)) * dt; o.t += dt;
      if (waterDist(o.x, o.z) > 0.2 || ri.s > endS - 2 || o.t > 240) spawn(o, false);
      const y = waterLevelAt(o.x, o.z) - U.uWaterDrop.value + 0.012; Q.setFromAxisAngle(Y, o.a); M.compose(new THREE.Vector3(o.x, y, o.z), Q, S); m.setMatrixAt(i, M); });
    m.instanceMatrix.needsUpdate = true; }; }
// o reflexo: a câmera espelhada no plano da água desenha o que fica acima dela (sem capim e sem chuva, para sair barato)
const mirrorCam = new THREE.PerspectiveCamera(), reflClip = [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)];
const BIAS = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
function renderReflection() {
  const wy = WATER_Y - U.uWaterDrop.value, cp = camera.position, fw = camera.getWorldDirection(new THREE.Vector3()), tg = cp.clone().add(fw);
  mirrorCam.copy(camera); mirrorCam.layers.set(1); mirrorCam.position.set(cp.x, 2 * wy - cp.y, cp.z); mirrorCam.up.set(0, 1, 0); mirrorCam.lookAt(tg.x, 2 * wy - tg.y, tg.z); mirrorCam.updateMatrixWorld();
  mirrorCam.projectionMatrix.copy(camera.projectionMatrix); mirrorCam.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
  waterMat.uniforms.uReflMat.value.multiplyMatrices(BIAS, mirrorCam.projectionMatrix).multiply(mirrorCam.matrixWorldInverse);
  reflClip[0].constant = -wy; water.visible = grass.visible = rain.visible = skyfx.bowMesh.visible = false; skyDome.position.copy(mirrorCam.position);
  renderer.shadowMap.autoUpdate = false; renderer.clippingPlanes = reflClip; renderer.setRenderTarget(reflRT); renderer.render(scene, mirrorCam);
  renderer.setRenderTarget(null); renderer.clippingPlanes = [];
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
const gameCam = createGameCamera(camera, renderer.domElement, { center: CENTER, radius: 130, groundY: (x, z) => Math.max(WATER_Y, heightAt(x, z)) });
let camMode = 'jogo'; controls.enabled = false;
// tela limpa: o painel de clima, os botões de girar e a linha de hora/vento/quadros só aparecem com ?debug
// (girar continua nos dois dedos, no botão direito e nas teclas Q/E)
const DEBUG = new URLSearchParams(location.search).has('debug');
if (!DEBUG) { $('painelBtn').style.display = 'none'; $('info').style.display = 'none'; $('giro').hidden = true; }
if (innerWidth < innerHeight) gameCam.state.dist = gameCam.state.distT = 150;   // celular em pé: um pouco mais longe para caber o vale
$('rotL').addEventListener('click', () => gameCam.rotate(-1)); $('rotR').addEventListener('click', () => gameCam.rotate(1));
// a sombra do sol cobre só o pedaço de chão que aparece na tela: mais nítida de perto e sem desperdício de longe
const _v = new THREE.Vector3(), _c = new THREE.Vector3(), _pts = [], shCam = sun.shadow.camera;
function fitShadow() {
  camera.updateMatrixWorld(); const cp = camera.position, focus = camMode === 'jogo' ? gameCam.focus : controls.target; _pts.length = 0; _c.set(0, 0, 0);
  // o raio coberto acompanha o zoom: de perto (uma parede, uma janela) o mapa inteiro vai para poucos metros e a sombra fica nítida;
  // antes, a borda de cima da tela (quase no horizonte) sempre esticava o mapa até 110 m, e de perto cada texel dava 10-13 cm
  const RM = Math.max(14, Math.min(110, cp.distanceTo(focus) * 1.3)), HM = Math.min(20, 4 + RM * 0.25);
  for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) { _v.set(x, y, 0.5).unproject(camera).sub(cp).normalize(); if (_v.y > -0.08) _v.y = -0.08;
    const t = (cp.y - focus.y) / -_v.y, p = cp.clone().addScaledVector(_v, t), d = Math.hypot(p.x - focus.x, p.z - focus.z); if (d > RM) { p.x = focus.x + (p.x - focus.x) * RM / d; p.z = focus.z + (p.z - focus.z) * RM / d; }
    p.y = focus.y; _pts.push(p); _c.add(p); }
  _c.multiplyScalar(1 / _pts.length); sun.target.position.copy(_c); sun.position.copy(_c).addScaledVector(U.uSunW.value, 250); sun.target.updateMatrixWorld(); sun.updateMatrixWorld();
  shCam.position.copy(sun.position); shCam.lookAt(_c); shCam.updateMatrixWorld();
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const p of _pts) for (const h of [-2, HM]) { _v.set(p.x, p.y + h, p.z).applyMatrix4(shCam.matrixWorldInverse); x0 = Math.min(x0, _v.x); x1 = Math.max(x1, _v.x); y0 = Math.min(y0, _v.y); y1 = Math.max(y1, _v.y); }
  const size = Math.ceil((Math.max(x1 - x0, y1 - y0) + 4 + RM * 0.12) / 2) * 2, texel = size / sun.shadow.mapSize.x, cx = Math.round((x0 + x1) / 2 / texel) * texel, cy = Math.round((y0 + y1) / 2 / texel) * texel;
  Object.assign(shCam, { left: cx - size / 2, right: cx + size / 2, bottom: cy - size / 2, top: cy + size / 2, near: 1, far: 520 }); shCam.updateProjectionMatrix();
  // o desvio acompanha o tamanho do texel: pouco desvio (sem sombra descolada do pé das coisas) e sem as listras de acne na parede de lado para o sol
  sun.shadow.normalBias = texel * 3 + 0.01; sun.shadow.bias = -0.00012; window.__shTexel = texel;
}
// capim: de longe, cada peça desenha menos lâminas (as que ficam já são mais largas na distância)
function grassLod() { const qk = [1, 0.65, 0.4][Q]; for (const m of grass.children) { const g = m.geometry, d = Math.hypot(camera.position.x - g.userData.c[0], camera.position.y, camera.position.z - g.userData.c[1]);
  g.instanceCount = Math.round(g.userData.full * qk * Math.max(0.25, Math.min(1, 1.3 - d / 170))); } }
// ---------- qualidade automática: o aparelho que sofre (menos de ~24 quadros por segundo por uns segundos) desce um degrau;
// o que sobra folga (mais de ~50) sobe. 0 = cheia, 1 = média (capim 65%, sombra 1024, reflexo menor, pano só perto),
// 2 = leve (capim 40%, sombra 768, reflexo do céu só, bichos pequenos a cada 2 quadros, pano só bem perto)
let Q = mobile ? 1 : 0, qSlow = 0, qFast = 0;
window.__Q = () => Q;
function applyQuality() { window.__Qv = Q;
  scene.traverse(o => { if (o.isInstancedMesh && ['milho', 'girassol', 'mandioca'].includes(o.userData.regua)) o.castShadow = Q === 0 && !mobile; });   /* lavoura sem sombra nos degraus mais leves */ const sz = [mobile ? 1536 : 2048, 1024, 768][Q]; if (sun.shadow.mapSize.x !== sz) { sun.shadow.mapSize.set(sz, sz); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  resize(); }
applyQuality();
// texturas nítidas de longe (folhas, chita, xadrez, pelagem da onça): filtragem anisotrópica, uma vez, no que já existe
{ const an = Math.min(8, renderer.capabilities.getMaxAnisotropy()); scene.traverse(o => { const m = o.material; if (!m) return; for (const mm of Array.isArray(m) ? m : [m]) for (const k of ['map', 'alphaMap']) { const t = mm[k]; if (t && t.anisotropy !== an) { t.anisotropy = an; t.needsUpdate = true; } } }); }

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

// ---------- todas as árvores de cada espécie viram uma malha só (de ~300 desenhos para ~25): cada vértice guarda a origem da
// sua árvore (torg), e o balanço do vento continua árvore por árvore. Os grupos originais ficam (invisíveis) para a régua e
// para quem procura árvore pelo tipo.
function mergeTrees(groups) { const buckets = new Map(), out = [];
  scene.updateMatrixWorld(true);
  for (const t of groups) { if (!t.isGroup || !(t.userData.kind || t.userData.regua === 'buriti' || t.userData.regua === 'pinheiro-bravo')) continue;
    const o = t.getWorldPosition(new THREE.Vector3());
    for (const m of t.children) { if (!m.isMesh || m.userData.noRegua || !m.customDepthMaterial) continue;
      const g = m.geometry.clone().applyMatrix4(m.matrixWorld), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([o.x, o.y, o.z], i * 3);
      g.setAttribute('torg', new THREE.BufferAttribute(a, 3)); const key = m.material.uuid; if (!buckets.has(key)) buckets.set(key, { mat: m.material, depth: m.customDepthMaterial, gs: [] });
      buckets.get(key).gs.push(g); m.visible = false; m.userData.merged = true; } }
  for (const b of buckets.values()) { const geo = mergeGeometries(b.gs); const mm = new THREE.Mesh(geo, b.mat); mm.customDepthMaterial = b.depth; mm.castShadow = mm.receiveShadow = true; mm.frustumCulled = false; mm.userData.noRegua = true; mm.layers.enable(1); scene.add(mm); out.push(mm); } return out; }
mergeTrees(scene.children.slice());
// o que aparece no reflexo da água (camada 1): céu, chão, chapadas, árvores, construções grandes, nuvens
{ const big = ['casa', 'capela (com a torre)', 'venda', 'sobrado', 'coreto', 'moinho (com as pás)', 'celeiro', 'paiol'];
  scene.traverse(o => { if (o === skyDome || (o.isMesh && (o.material === groundMat || o.material.type === 'MeshToonMaterial' && o.geometry.attributes.position.count > 30000) && !o.isSkinnedMesh)) o.layers.enable(1); });
  for (const o of scene.children) { if (big.includes(o.userData.regua) || (o.isMesh && o.userData.noRegua && o.customDepthMaterial) || o.isInstancedMesh && o.renderOrder === -5) o.traverse(c => c.layers.enable(1)); } }
// ---------- o jogo: as peças do vale entram no tabuleiro com as bordas do jogo 2D (A água, B mata, C lavoura, V vila, G campo),
// na ordem [L, NE, NO, O, SO, SE]; o rio entra pela nascente e sai pela borda leste da cachoeira
const EDGES0 = { rio: 'AGGGGG', mata: 'ABBABB', cachoeira: 'ABBAGG', pasto: 'GGGGGG', cerrado: 'GGGGGG', lagoa: 'GGGGGG', vila: 'VVVVVV', praca: 'VVVVVV', lavoura: 'CCCCCC', roca: 'CCCCCC', cerradao: 'BBBBBB' };
// o jogo: núcleo v5 (o rio é o orçamento, ../../nucleo/regras.js); ?jogo=v3 volta às regras antigas (game3d.js)
const board = (new URLSearchParams(location.search).get('jogo') === 'v3' ? buildBoard : buildBoard5)({ scene, camera, dom: renderer.domElement, R, TILES, hexCenter, heightAt, waterDist, inHex, edgeMid, DIRS, sectorType, PATHS, addRiver, ST, CENTER, gente,
  edgesOf: t => EDGES0[t.kind].split(''), props, groundFor, waterFor: t => waterMeshFor([t], false), fillField, grassFor, place, makeTree, makeTermite, makeBuriti, plant: t => plantTile(t, floraCtx), fieldAt, blocked, mobile, mergeTrees, buildNear, syncCollision, buildSpot });
let lastStrikes = 0;
let frameN = 0; const clock = new THREE.Clock(); let fpsT = 0, fpsT0 = 0, fpsN = 0, slow = 0;
const fmtH = h => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60) % 60).padStart(2, '0')}`;
function frame() {
  const dt = Math.min(window.__dtMax || 0.1, clock.getDelta());   /* __dtMax: só para os testes num computador sem placa de vídeo */ U.uTime.value += dt; U.uFlowClk.value += dt * (0.55 + U.uRain.value * 0.5);
  const c = climate(dt);
  if (ST.cam !== camMode) { camMode = ST.cam; const game = camMode === 'jogo'; gameCam.state.enabled = game; controls.enabled = !game; $('giro').hidden = !game || !DEBUG;
    if (game) { gameCam.state.fx = controls.target.x; gameCam.state.fz = controls.target.z; } else { controls.target.copy(gameCam.focus); } }
  if (camMode === 'jogo') gameCam.update(dt); else controls.update();
  if (!!ST.regua !== reguaOn) { reguaOn = !!ST.regua; showRegua(reguaOn); }
  if (people && reguaOn) for (const p of people.children) p.rotation.y = Math.atan2(camera.position.x - p.position.x, camera.position.z - p.position.z);
  if (camMode === 'jogo') U.uFocus.value.copy(gameCam.focus); else U.uFocus.value.copy(camera.position).add(camera.getWorldDirection(_v).multiplyScalar(0.01));   /* câmera livre: só some o que encosta na lente */ fitShadow(); grassLod();
  const ctx = { pxPerUnit: renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360)), hour: ST.hour }; if (window.__petalPx) window.__petalPx.value = ctx.pxPerUnit; if (window.__mistPx) window.__mistPx.value = ctx.pxPerUnit; window.__hour = ST.hour; ctx.people = gente.people; props.update(dt, ctx); fauna.update(dt, ctx); gente.update(dt); peixes.update(dt, { people: gente.people, animals: fauna.animals, hour: ST.hour }); fx.update(dt, ctx); afx.update(dt, ctx); board.update(dt);
  if ((skyfx.fx.strikes || 0) !== lastStrikes) { lastStrikes = skyfx.fx.strikes || 0; setTimeout(() => { fauna.startle(); gente.startle(); }, 250); }   /* o trovão logo depois do clarão assusta gente e bicho */ clouds.update(dt, camera); ctx.Rr = c.Rr; ctx.hour = ST.hour; skyfx.update(dt, ctx);
  { const f = skyfx.fx.flash; if (f > 0) { skyLight.intensity += f * 3; U.uSkyZen.value.lerp(new THREE.Color(0.85, 0.88, 1), f * 0.5); U.uSkyHor.value.lerp(new THREE.Color(0.9, 0.92, 1), f * 0.45); } }   // clarão do raio
  { const pu = grassU.uPush.value, f = U.uFocus.value, L = []; for (const q of gente.people) if (q.g.visible && q.st !== 'casa') L.push([q.x, q.z, q.s.sex === 'c' ? 0.45 : 0.55, 1]);
    for (const a of fauna.animals) if (a.rad && a.g.visible) L.push([a.x, a.z, a.rad * 1.5, 1]); if (gente.ball) L.push([gente.ball.x, gente.ball.z, 0.3, gente.ball.y - heightAt(gente.ball.x, gente.ball.z) < 0.3 ? 0.8 : 0]);
    L.sort((a, b) => Math.hypot(a[0] - f.x, a[1] - f.z) - Math.hypot(b[0] - f.x, b[1] - f.z)); for (let i = 0; i < 16; i++) { const e = L[i]; if (e) pu[i].set(e[0], e[1], e[2], e[3]); else pu[i].set(0, 0, 0, 0); } }
  { const wu = waterMat.uniforms.uWade.value, L = [];
    for (const a of fauna.animals) if (a.rad && a.g.visible && waterDist(a.x, a.z) < 0.15) L.push([a.x, a.z, Math.min(1, 0.4 + a.sp * 0.6), a.rad]);
    for (const q of gente.people) if (q.g.visible && q.job === 'lavar' && q.st === 'post' && q.cyc >= 1 && q.cyc <= 3 && LAYOUT.lavStone) L.push([LAYOUT.lavStone.position.x + Math.sin(q.h) * 0.45, LAYOUT.lavStone.position.z + Math.cos(q.h) * 0.45, q.cyc === 2 ? 1 : 0.6, 0.5]);
    const b = gente.ball; if (b && waterDist(b.x, b.z) < 0) L.push([b.x, b.z, 0.8, 0.25]);
    for (let i = 0; i < 8; i++) { const e = L[i]; if (e) wu[i].set(e[0], e[1], e[2], e[3]); else wu[i].set(0, 0, 0, 0); } }
  if (window.__fallFx) window.__fallFx(dt);
  if (window.__leaves) window.__leaves(dt);
  ringFog.value = scene.fog.density; ringFogC.value.copy(scene.fog.color);
  // economia sem perder a cena: no degrau cheio tudo a cada quadro; nos mais leves o reflexo da água e o mapa de sombras
  // são refeitos a cada 2 ou 3 quadros (a câmera e o sol andam devagar, a diferença não se vê)
  frameN++; if (Q === 0 || frameN % (Q + 1) === 0) renderReflection();
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = Q === 0 || frameN % 2 === 0 || frameN < 4;
  grade.render(scene, camera, Q);
  // quadros por segundo medidos no relógio de verdade (o dt do jogo é limitado a 0,1 s e enganava quando o aparelho sofria)
  const now = performance.now(); fpsN++; fpsT = (now - (fpsT0 || now)) / 1000; if (!fpsT0) fpsT0 = now; if (fpsT > 1) { const fps = fpsN / fpsT; fpsT0 = now; $('info').textContent = `${fmtH(ST.hour)} · ${ST.seca ? 'Seca' : 'Águas'} · vento ${c.base.toFixed(1)} m/s · ${c.Rr > 0.2 ? `chuva ${c.Rr.toFixed(0)} mm/h` : 'sem chuva'} · ${fps.toFixed(0)} qps`;
    $('hora').value = ST.hour;
    if (fps < 24) { qFast = 0; if (++qSlow >= 3) { qSlow = 0; if (Q < 2) { Q++; applyQuality(); } else if (dpr > 1) { dpr = Math.max(1, dpr - 0.25); renderer.setPixelRatio(dpr); resize(); } } }
    else if (fps > 50) { qSlow = 0; if (++qFast >= 6) { qFast = 0; if (dpr < Math.min(devicePixelRatio || 1, mobile ? 1.6 : 2)) { dpr = Math.min(devicePixelRatio || 1, dpr + 0.25); renderer.setPixelRatio(dpr); resize(); } else if (Q > 0) { Q--; applyQuality(); } } }
    else { qSlow = 0; qFast = 0; }
    fpsN = 0; fpsT = 0; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
/* testes: avança a vida do vale (gente, bichos, porteiras) s segundos sem desenhar, para conferir rotinas longas num computador lento */
window.__ff = s => { const ctx = { pxPerUnit: 600, hour: ST.hour, people: gente.people }; window.__hour = ST.hour; for (let t = 0; t < s; t += 0.05) { U.uTime.value += 0.05; props.update(0.05, ctx); fauna.update(0.05, ctx); gente.update(0.05); peixes.update(0.05, { people: gente.people, animals: fauna.animals }); if (window.__fallFx) window.__fallFx(0.05); } };
window.__cam = camera; window.__heightAt = heightAt; window.__tiles = TILES; window.__fall = FALL; window.__previa = { THREE, gente, skyfx, gameCam,  ST, U, renderer, scene, camera, controls, fauna, clouds, board, fx, col: colisao, L: LAYOUT, heightAt, peixes };
