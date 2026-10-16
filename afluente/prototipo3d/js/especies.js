// As espécies do vale montadas no esqueleto de bicho.js, em tamanho real (metros, antes da escala de cada um).
// Cada uma diz: o corpo em anéis, o pescoço (do peito à nuca), a cabeça (crânio, olhos, orelhas, chifre, focinho), as
// quatro pernas (altura do ombro/quadril, os três comprimentos e o perfil de grossura, com joelho, boleto e casco ou pata)
// e o rabo. A pose de pastar sai da conta (a boca encosta no chão), não de número chutado.
import * as THREE from 'three';
import { quad, ave, loft, tube, paintG, sph } from './bicho.js';
import { mat } from './props.js';

const col = c => (c && c.isColor) ? c.clone() : new THREE.Color(c);
const mix = (a, b, t) => col(a).lerp(col(b), Math.max(0, Math.min(1, t)));
const cone = (r, h, c, s = 8) => paintG(new THREE.ConeGeometry(r, h, s), c);
const cyl = (r0, r1, h, c, s = 10) => paintG(new THREE.CylinderGeometry(r1, r0, h, s), c);
// crânio: anéis ao longo de z (da nuca ao focinho), girado para apontar para a frente e para baixo
const skull = (rings, down, seg = 22, shape = null, ext = true) => { if (!ext) return loft(rings.map(([t, rx, rt, rb, c, e]) => ({ z: t, y: 0, rx, rt, rb, e: e || 2.3, c })), seg, shape).rotateX(down);
  const r0 = rings[0], back = [[r0[0] - 0.08, r0[1] * 0.9, r0[2] * 0.85, r0[3] * 0.92, r0[4], r0[5]], [r0[0] - 0.04, r0[1] * 0.98, r0[2] * 0.97, r0[3], r0[4], r0[5]]];
  return loft([...back, ...rings].map(([t, rx, rt, rb, c, e]) => ({ z: t, y: 0, rx, rt, rb, e: e || 2.3, c })), seg, shape).rotateX(down); };
// a pose de pastar: o pescoço desce até a boca encostar no chão, e a cabeça gira para o focinho ficar de pé
function grazeOf(neckPts, muzzle) { const p0 = neckPts[0], p1 = neckPts[neckPts.length - 1], Ln = Math.hypot(p1[1] - p0[1], p1[2] - p0[2]), a0 = Math.atan2(p1[1] - p0[1], p1[2] - p0[2]);
  const mL = Math.hypot(muzzle[1], muzzle[2]), angM = Math.atan2(-muzzle[1], muzzle[2]);
  let th = 2.3; for (let t = 0.2; t <= 2.3; t += 0.02) { if (p0[1] + Ln * Math.sin(a0 - t) - mL < 0.06) { th = t; break; } }
  return [th, Math.max(-1.2, Math.min(0.8, Math.PI / 2 - angM - th))]; }
// casco fendido (boi, ovelha): a quartela desce inclinada para a frente a partir do boleto; embaixo as duas unhas, cada
// uma com a parede da frente inclinada, a sola chata e o talão redondo, uma fresta entre elas; atrás, as duas unhas de cima
function casco(x, z, yF, L3, r, hair, hoofC, slant = 0.4) { const out = [], yH = yF - L3 * 0.52, zH = z + L3 * slant * 0.55, dark = col(hoofC).multiplyScalar(0.7);
  out.push(tube([[x, yF + 0.012, z], [x, (yF + yH) / 2, z + L3 * slant * 0.28], [x, yH + 0.008, zH]], [{ rx: r, rt: r * 1.04, rb: r * 1.12, c: hair }, { rx: r * 0.9, rt: r * 0.92, rb: r * 0.95, c: hair }, { rx: r * 0.95, rt: r, rb: r, c: col(hair).multiplyScalar(0.85) }], 10, false));
  for (const sd of [-1, 1]) { const cx = x + sd * r * 0.5;
    out.push(tube([[cx, yH + 0.014, zH - r * 0.12], [cx, yH - (yH - yF + L3) * 0.5, zH + r * 0.32], [cx, yF - L3, zH + r * 0.7]],
      [{ rx: r * 0.46, rt: r * 0.6, rb: r * 0.5, c: hoofC }, { rx: r * 0.52, rt: r * 0.85, rb: r * 0.6, c: hoofC }, { rx: r * 0.56, rt: r * 1.05, rb: r * 0.62, c: dark }], 10, true)); }
  for (const sd of [-1, 1]) out.push(sph(r * 0.17, r * 0.24, r * 0.2, x + sd * r * 0.42, yH + L3 * 0.16, z + L3 * slant * 0.3 - r * 0.95, dark, 6));
  return mergeG(out); }
// pata (onça, lobo, capivara, anta): metacarpo curto que desce para a frente, a palma e os dedos com almofada; garra opcional
function pata(x, z, yF, L3, r, hair, toeC, toes = 4, claw = null) { const out = [], pz = z + L3 * 0.42, py = yF - L3;
  out.push(tube([[x, yF + 0.012, z], [x, py + r * 0.9, pz - r * 0.2]], [{ rx: r, rt: r, rb: r * 1.05, c: hair }, { rx: r * 0.95, rt: r, rb: r, c: hair }], 10, false));
  out.push(sph(r * 1.12, r * 0.62, r * 1.25, x, py + r * 0.6, pz, hair, 12));
  for (let i = 0; i < toes; i++) { const a = (i - (toes - 1) / 2) * (toes > 3 ? 0.42 : 0.55), tx = x + Math.sin(a) * r * 0.9, tz = pz + Math.cos(a) * r * 1.05;
    out.push(sph(r * 0.36, r * 0.34, r * 0.46, tx, py + r * 0.34, tz, toeC, 8)); if (claw) out.push(cone(r * 0.12, r * 0.45, claw, 5).rotateX(Math.PI / 2 + 0.6).translate(tx, py + r * 0.22, tz + r * 0.42)); }
  return mergeG(out); }
const mergeG = gs => { const pos = [], colA = [], idx = []; let base = 0; for (const g of gs) { const p = g.attributes.position, c = g.attributes.color; for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); colA.push(c.getX(i), c.getY(i), c.getZ(i)); }
  if (g.index) for (const k of g.index.array) idx.push(base + k); else for (let i = 0; i < p.count; i++) idx.push(base + i); base += p.count; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colA, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; };

// olho de bicho: a bola escura e o pontinho de brilho (é o que dá vida ao rosto)
// manga: a barriga desce em volta do alto de cada perna (o braço e o antebraço da frente, a coxa e a dobra do joelho atrás),
// para a perna nascer de dentro de uma massa do corpo, sem vinco de boneco; M = [[x, z, quanto desce, largura, comprimento]]
const manga = M => (x, y, a, r) => { const s = Math.sin(a); if (s >= -0.05) return [x, y]; const ax = Math.abs(x), z = r.z;
  for (const [lx, lz, dr, wx, wz] of M) { const d = Math.exp(-(((ax - lx) / wx) ** 2) - (((z - lz) / wz) ** 2)) * Math.pow(-s, 0.6); if (d < 0.01) continue; y -= dr * d; x += (Math.sign(x) * lx - x) * 0.25 * d; }
  return [x, y]; };
// orelha em gota: elipsoide que afina para cima até uma ponta arredondada (taper: quanto afina)
const orelha = (rx, ry, rz, c, taper = 0.6) => { const g = sph(rx, ry, rz, 0, 0, 0, c, 16), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = p.getY(i) / ry; p.setX(i, p.getX(i) * (1 - taper * Math.max(0, v) ** 1.3)); p.setZ(i, p.getZ(i) * (1 - 0.4 * taper * Math.max(0, v))); } g.computeVertexNormals(); return g; };
const olho = (H, x, y, z, r, sx, c = 0x140e0a) => { H.add(sph(r * 0.6, r, r, x, y, z, c, 10)); H.add(sph(r * 0.2, r * 0.26, r * 0.26, x + sx * r * 0.5, y + r * 0.35, z + r * 0.3, 0xfaf6ee, 6)); };
// pelagem com manchas (gir chitado, malhado): as manchas são desenhadas no pixel, por um ruído preso ao corpo (posição de
// descanso da malha, então andam com o bicho), com borda nítida e recortada; só onde a malha diz que é pelo (atributo pat)
// e mantendo a sombra da pelagem (a mancha multiplica a cor do vértice pela razão cor da mancha / cor de base)
function pelagem(spotHex, baseC, freq, thr, seed) {
  return mat({ vertexColors: true }, { rim: '2.4', vdecl: 'attribute float pat;varying float vPat;', vert: 'vPat=pat;',
    fdecl: 'varying float vPat;uniform vec3 uSpot,uBase;uniform vec3 uSp;',
    uni: { uSpot: { value: col(spotHex) }, uBase: { value: col(baseC) }, uSp: { value: new THREE.Vector3(freq, thr, seed) } },
    frag: `{vec3 q=vLp*uSp.x+uSp.z;float n=vnoise(q.zy)*0.5+vnoise(q.xz*1.17+7.1)*0.3+vnoise(q.xy*1.9+3.7)*0.2;n+=(vnoise(q.zy*6.0+q.x*3.0)-0.5)*0.07;
      float m=smoothstep(uSp.y-0.01,uSp.y+0.01,n)*smoothstep(0.5,0.9,vPat);diffuseColor.rgb*=mix(vec3(1.0),uSpot/max(uBase,vec3(0.02)),m);}
      diffuseColor.rgb*=0.955+0.09*vnoise(vec2(vLp.z*9.0+vLp.x*4.0,vLp.y*90.0))+0.03*(vnoise(vLp.zy*26.0)-0.5);diffuseColor.rgb*=mix(1.0,0.82,uWet);` }); }
// pelagem da onça, desenhada no pixel (presa à posição de descanso da malha, anda com o bicho). Três camadas de células
// (Voronoi 3D com o espaço torcido por ruído, para nada sair redondo nem em grade):
//  - no tronco, rosetas: o raio de cada uma sai da distância às duas células mais perto (F1/(F1+F2)), então elas são
//    poligonais e se encaixam umas nas outras com uma fresta dourada no meio; o anel preto é partido em 3 a 5 borrões de
//    grossura irregular, o miolo é um pouco mais escuro (castanho) e às vezes tem uma ou duas pintas dentro;
//  - no pescoço, nas coxas, na barriga e no rabo, pintas cheias de tamanho variado (na barriga clara, borrões grandes);
//  - na cabeça e nas patas, pintinhas pequenas e densas.
// Qual camada vale sai do atributo pat (1 tronco, 0,6 pintas, 0,3 pintinhas, 0 sem pinta: nariz, olho, boca)
const ROS_DECL = `varying float vPat;
vec3 rh3(vec3 p){p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6)));return fract(sin(p)*43758.5453);}
float rn3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);vec2 e=vec2(1.0,0.0);
  return mix(mix(mix(rh3(i).x,rh3(i+e.xyy).x,f.x),mix(rh3(i+e.yxy).x,rh3(i+e.xxy).x,f.x),f.y),mix(mix(rh3(i+e.yyx).x,rh3(i+e.xyx).x,f.x),mix(rh3(i+e.yxx).x,rh3(i+e.xxx).x,f.x),f.y),f.z);}
vec3 rwarp(vec3 q,float a){return q+a*(vec3(rn3(q*0.7),rn3(q*0.7+17.3),rn3(q*0.7+41.9))-0.5);}
vec4 rvor(vec3 q,out vec3 pc,out vec3 rc){vec3 ic=floor(q),fc=fract(q);float d1=9.0,d2=9.0;pc=vec3(0.0);rc=vec3(0.0);
  for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++)for(int k=-1;k<=1;k++){vec3 g=vec3(float(i),float(j),float(k)),o=rh3(ic+g),r=g+0.12+o*0.76-fc;float d=dot(r,r);
    if(d<d1){d2=d1;d1=d;pc=o;rc=r;}else if(d<d2){d2=d;}}
  d1=sqrt(d1);d2=sqrt(d2);return vec4(d1,d2,d1/(d1+d2)*2.0,0.0);}
float rspot(vec3 q,float fill,float sz){vec3 pc,rc;vec4 v=rvor(rwarp(q,0.9),pc,rc);float e=max(0.03,fwidth(v.x)*1.2),r=sz*(0.55+0.6*pc.z)+0.12*(rn3(q*3.1)-0.5);
  return (1.0-smoothstep(r-e,r+e,v.x))*step(1.0-fill,pc.x);}
`;
const ROS_FRAG = `{float k=vPat,dk=0.0,inner=0.0;vec3 q=vLp*10.5;
  if(k>0.72){vec3 pc,rc;vec4 v=rvor(rwarp(q,1.1),pc,rc);float e=max(0.035,fwidth(v.z)*1.3),nb=rn3(q*3.6+pc*13.0),nt=rn3(q*4.3+pc*7.0);
    float r0=0.56+0.1*pc.y+0.1*(nt-0.5),r1=0.82+0.05*(nb-0.5);
    float ring=smoothstep(r0-e,r0+e,v.z)*(1.0-smoothstep(r1-e,r1+e,v.z))*smoothstep(0.3,0.38,nb+0.1*pc.z);
    float solid=step(0.9,pc.x)*(1.0-smoothstep(0.55-e,0.55+e,v.z));
    float de=max(0.03,fwidth(length(rc))*1.2),dots=(1.0-smoothstep(0.07+0.05*pc.y-de,0.07+0.05*pc.y+de,length(rc+(pc.zxy-0.5)*0.22)))*step(0.4,pc.z);
    float wr=smoothstep(0.72,0.9,k);dk=max(dk,wr*max(mix(ring,solid,step(0.9,pc.x)),dots*step(pc.x,0.9)*(1.0-smoothstep(r0-0.08,r0,v.z))));
    inner=wr*(1.0-smoothstep(r0-e,r0+e,v.z))*step(pc.x,0.9);}
  if(k>0.42&&k<0.92){float w=smoothstep(0.42,0.55,k)*(1.0-smoothstep(0.72,0.9,k));dk=max(dk,w*rspot(vLp*13.0,0.9,0.25));}
  if(k>0.12&&k<0.55){float w=smoothstep(0.12,0.22,k)*(1.0-smoothstep(0.42,0.55,k));dk=max(dk,w*rspot(vLp*24.0,0.75,0.2));}
  diffuseColor.rgb*=mix(vec3(1.0),vec3(0.8,0.7,0.6),inner*0.85);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.055,0.04,0.03),dk);}
  diffuseColor.rgb*=0.955+0.09*vnoise(vec2(vLp.z*9.0+vLp.x*4.0,vLp.y*90.0))+0.03*(vnoise(vLp.zy*26.0)-0.5);diffuseColor.rgb*=mix(1.0,0.82,uWet);`;
function rosetas() {
  return mat({ vertexColors: true }, { rim: '2.6', vdecl: 'attribute float pat;varying float vPat;', vert: 'vPat=pat;', fdecl: ROS_DECL, frag: ROS_FRAG }); }
// a faixa do tamanduá-bandeira, desenhada no pixel (em vértice ela saía em blocos): uma faixa preta debruada de branco
// que sobe do peito, por trás do ombro, até o meio das costas; só no tronco e no pescoço (atributo pat)
function faixa(cy) {
  return mat({ vertexColors: true }, { rim: '2.4', vdecl: 'attribute float pat;varying float vPat;', vert: 'vPat=pat;', fdecl: 'varying float vPat;',
    frag: `{float s=clamp((vLp.y-${cy.toFixed(3)})/0.26,-1.0,1.0),side=clamp(abs(vLp.x)/0.2,0.0,1.0);float line=0.22-0.26*s+0.03*(vnoise(vLp.zy*14.0)-0.5),d=abs(vLp.z-line);
      float blk=1.0-smoothstep(0.062,0.072,d),wht=(1.0-smoothstep(0.112,0.124,d))*(1.0-blk);float f=step(0.5,vPat);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.97,0.95,0.9),wht*f*(0.8+0.2*smoothstep(-0.9,0.2,s)));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.07,0.06,0.055),blk*f);}
      diffuseColor.rgb*=0.93+0.14*vnoise(vec2(vLp.z*7.0+vLp.y*2.0,vLp.x*70.0+vLp.y*70.0))+0.04*(vnoise(vLp.zy*30.0)-0.5);   // pelo grosso e comprido, em mechasdiffuseColor.rgb*=mix(1.0,0.82,uWet);` }); }
export function especies({ M, MJ, rnd }) {
  // ---------- gado zebu do Cerrado
  function vaca(coat, size = 1) {
    const w = col(coat.w).multiplyScalar(0.94 + rnd() * 0.12), grey = w.clone().lerp(col(coat.g), coat.k), dark = col(0x2a2624), bull = size > 0.8 && rnd() < 0.35, calf = size < 0.75;
    const sd = rnd() * 50, spotC = coat.spot ? col(coat.spot) : null, thr = 1 - (coat.sp || 0) * 1.6;
    const spotAt = (z, a) => spotC && Math.sin(z * 7.3 + sd) * Math.sin(a * 2.1 + sd * 1.7) + 0.6 * Math.sin(z * 3.1 - a * 1.4 + sd * 0.7) > thr;
    const shade = z => a => { const top = Math.max(0, Math.sin(a)), k = Math.max(0, Math.min(1, (z - 0.2) / 0.6)) * (bull ? 0.8 : 0.45), sp = false, b = w;
      return b.clone().lerp(sp ? b : grey, k * (0.4 + 0.6 * top)).multiplyScalar(0.94 + 0.06 * top); };
    const R = (z, y, rx, rt, rb, e = 2.2) => ({ z, y, rx, rt, rb, e, c: shade(z) });
    const rings = [R(-0.93, 1.14, 0.05, 0.05, 0.06), R(-0.88, 1.15, 0.14, 0.1, 0.18), R(-0.79, 1.12, 0.21, 0.15, 0.27), R(-0.66, 1.07, 0.25, 0.22, 0.34), R(-0.5, 1.03, 0.268, 0.28, 0.385),
      R(-0.32, 1.0, 0.276, 0.32, 0.4), R(-0.12, 0.985, 0.278, 0.345, 0.41), R(0.08, 0.98, 0.274, 0.355, 0.41), R(0.26, 0.99, 0.262, 0.36, 0.395), R(0.42, 1.01, 0.235, 0.345, 0.405),
      R(0.55, 1.04, 0.195, 0.3, 0.385), R(0.66, 1.06, 0.145, 0.22, 0.32), R(0.73, 1.07, 0.08, 0.12, 0.2)];
    const hump = calf ? 0.04 : bull ? 0.21 : 0.13;
    const shape = (x, y, a, r) => { const z = r.z, s = Math.sin(a), hz = Math.exp(-(((z - 0.42) / 0.16) ** 2));
      if (s > 0) { const top = Math.pow(s, 3); y += hump * hz * top; x *= 1 - 0.18 * hz * top; }   // cupim (redondo, não em bico)
      const dz = Math.max(0, Math.min(1, (z - 0.42) / 0.2)); if (s < 0) { const bot = Math.pow(-s, 5); y -= 0.1 * dz * bot; x *= 1 - 0.6 * dz * bot; }   // barbela no peito
      if (s < 0.35) { const side = Math.pow(Math.abs(Math.cos(a)), 1.5); x *= 1 + side * (0.07 * Math.exp(-(((z - 0.4) / 0.13) ** 2)) + 0.09 * Math.exp(-(((z + 0.6) / 0.17) ** 2))); }   // paleta e coxa
      if (z > -0.4 && z < 0.3 && s < -0.3) y -= 0.025 * Math.sin((z + 0.4) / 0.7 * Math.PI);   // barriga
      return [x, y]; };
    const neckPts = [[0, 1.01, 0.42], [0, 1.1, 0.64], [0, 1.22, 0.81], [0, 1.31, 0.95]], nc = a => shade(0.75)(a);
    const neck = { pts: neckPts, prof: [{ rx: 0.232, rt: 0.34, rb: 0.4, e: 2.2, c: nc }, { rx: 0.175, rt: 0.18, rb: 0.29, c: nc }, { rx: 0.14, rt: 0.145, rb: 0.22, c: nc }, { rx: 0.11, rt: 0.11, rb: 0.13, c: nc }],
      shape: (x, v, a, r, i) => { if (v < 0) { const bot = Math.pow(Math.max(0, -Math.sin(a)), 3), k = [1, 1, 1, 0.85, 0.5][i] ?? 0.5, d = [0.3, 0.42, 0.5, 0.55, 0.35][i] ?? 0.35; x *= 1 - 0.55 * bot * k; v *= 1 + d * bot; } return [x, v]; } };   // barbela (papo): pele funda e fina da garganta ao peito, parte da pele do pescoço
    // cabeça (como na referência): testa larga, chata e quadrada, mais larga na altura dos olhos; mandíbula funda embaixo
    // deles; a face afina no meio e o focinho alarga de novo, largo e arredondado, com narinas grandes; olhos grandes de lado
    // sob o arco da sobrancelha; orelhas grandes e ovais, quase na horizontal, viradas um pouco para a frente; papada sob o queixo
    const th = 1.0, S = (t, x, y) => [x, y * Math.cos(th) - t * Math.sin(th), y * Math.sin(th) + t * Math.cos(th)];
    const muzzle = S(0.55, 0, -0.01), pinkNose = coat.w === 0xf0ebe2 || (coat.k < 0.35 && rnd() < 0.3), nose = col(pinkNose ? 0x9a6a5e : 0x2a2422);
    const gir = !!coat.spot && coat.w !== 0xf0ebe2, earL = gir ? 0.2 : 0.18;
    const head = H => {
      const hc = (t, a) => { const up = Math.sin(a); if (t > 0.5) return nose; if (t > 0.45) return mix(w, nose, 0.3 + 0.4 * (t - 0.45) / 0.05); return t < 0.08 ? grey : mix(w, grey, 0.12 + 0.22 * Math.max(0, up) + (t > 0.3 ? 0.08 : 0)); };
      // de lado a cabeça de vaca é funda: a mandíbula desce bem abaixo do olho e o focinho também é alto (não é fino como o do cavalo)
      const rings = [[0, 0.1, 0.07, 0.11, 2.8], [0.04, 0.124, 0.085, 0.14, 3.0], [0.1, 0.13, 0.092, 0.172, 3.0], [0.17, 0.126, 0.088, 0.178, 3.0], [0.24, 0.108, 0.08, 0.158, 2.8], [0.31, 0.093, 0.074, 0.134, 2.6],
        [0.37, 0.086, 0.072, 0.12, 2.5], [0.42, 0.09, 0.072, 0.112, 2.5], [0.47, 0.104, 0.075, 0.106, 2.6], [0.51, 0.106, 0.071, 0.097, 2.6], [0.535, 0.094, 0.06, 0.08, 2.4], [0.552, 0.056, 0.036, 0.046, 2.2]];
      // bochecha (masseter) cheia embaixo, testa reta em cima
      const cheek = (x, y, a, r) => { const t = r.z, b = Math.exp(-(((t - 0.17) / 0.08) ** 2)), sa = Math.sin(a); if (sa < 0.1) x *= 1 + 0.1 * b * Math.sqrt(Math.max(0, 0.1 - sa)); if (sa > 0.55 && t < 0.4) y *= 1 - 0.14 * (sa - 0.55); return [x, y]; };
      H.add(skull(rings.map(([t, rx, rt, rb, e]) => [t, rx, rt, rb, a => hc(t, a), e]), th, 32, cheek, false));
      // queixo e beiço de baixo
      H.add(loft([[0.3, 0.055, 0.022, 0.03], [0.42, 0.064, 0.026, 0.036], [0.5, 0.062, 0.024, 0.032], [0.535, 0.04, 0.015, 0.02]].map(([t, rx, rt, rb]) => ({ z: t, y: -0.092, rx, rt, rb, e: 2.3, c: t > 0.49 ? nose : mix(w, grey, 0.2) })), 16).rotateX(th));
      for (const sx of [-1, 1]) {
        const e = S(0.15, sx * 0.123, 0.036), side = sx > 0 ? 'earL' : 'earR';
        H.add(sph(0.012, 0.016, 0.034, e[0] - sx * 0.008, e[1] + 0.02, e[2] + 0.002, mix(w, grey, 0.25), 10));   // arco da sobrancelha
        if (coat.k >= 0.4 && !coat.spot) H.add(sph(0.013, 0.036, 0.032, e[0] - sx * 0.004, e[1], e[2], grey.clone().multiplyScalar(0.7), 10));   // contorno escuro do olho
        H.add(sph(0.013, 0.027, 0.027, e[0] + sx * 0.004, e[1], e[2], 0x1c140e, 14));   // olho grande
        H.add(sph(0.004, 0.007, 0.007, e[0] + sx * 0.016, e[1] + 0.01, e[2] + 0.007, 0xfaf6ee, 6));   // brilho
        H.add(paintG(new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI * 0.42).scale(0.017, 0.033, 0.033).rotateZ(-sx * 0.2).translate(e[0] + sx * 0.003, e[1] + 0.005, e[2]), grey));   // pálpebra
        const n = S(0.546, sx * 0.04, 0.008); H.add(sph(0.01, 0.017, 0.013, n[0], n[1], n[2], 0x0a0807, 8));   // narina grande
        H.add(paintG(new THREE.TorusGeometry(0.016, 0.005, 5, 12).scale(0.8, 1, 0.6).rotateX(th).translate(n[0], n[1], n[2]), nose.clone().multiplyScalar(1.25)));   // aba da narina
        // chifre: grosso na base, curvando para fora e para cima, a ponta escura
        if (!calf) { const b0 = S(0.03, sx * 0.085, 0.066), L = bull ? 0.16 : 0.11, curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(...b0), new THREE.Vector3(b0[0] + sx * (0.05 + L * 0.3), b0[1] + 0.03 + L * 0.2, b0[2] - 0.02), new THREE.Vector3(b0[0] + sx * (0.05 + L * 0.45), b0[1] + 0.05 + L * 0.75, b0[2] + L * 0.15));
          const hg = new THREE.TubeGeometry(curve, 10, 1, 10, false), p = hg.attributes.position, cc = new Float32Array(p.count * 3);
          for (let i = 0; i < p.count; i++) { const u = Math.floor(i / 11) / 10, r = (bull ? 0.034 : 0.026) * (1 - u * 0.8); const c0 = curve.getPoint(u); p.setXYZ(i, c0.x + (p.getX(i) - c0.x) * r, c0.y + (p.getY(i) - c0.y) * r, c0.z + (p.getZ(i) - c0.z) * r); const k = mix(0xcab89c, 0x2a221c, Math.pow(u, 1.5)); cc.set([k.r, k.g, k.b], i * 3); }
          hg.setAttribute('color', new THREE.BufferAttribute(cc, 3)); hg.deleteAttribute('uv'); hg.computeVertexNormals(); H.add(hg); }
        // orelha grande e oval, quase na horizontal, a concha virada para a frente; por dentro clara, com a borda grossa
        const ep = S(0.05, sx * 0.12, 0.018), droop = gir ? 0.95 : 0.12;
        const leaf = (sc, c, dz, dy) => paintG(new THREE.SphereGeometry(1, 16, 10).scale(earL * 0.5 * sc, 0.016 * sc, 0.046 * sc).translate(sx * earL * 0.5, dy, dz).rotateZ(-sx * droop).rotateY(-sx * 0.55).translate(...ep), c);
        H.add(leaf(1, grey, 0, 0), side); H.add(leaf(0.82, 0xd8a08e, 0.004, 0.006), side); }
      const tp = S(0.015, 0, 0.068); H.add(sph(0.065, 0.026, 0.05, tp[0], tp[1], tp[2], grey.clone().multiplyScalar(0.92), 12));   // topete na nuca
    };
    const legC = z => { const top = shade(z)(-Math.PI / 2); return (t) => top.clone().lerp(grey, Math.max(0, Math.min(1, (t - 0.3) / 0.5)) * Math.min(0.6, coat.k * 1.1)).multiplyScalar(1 - 0.08 * Math.max(0, (t - 0.6) / 0.4)); };
    const fl = [0.42, 0.275, 0.14], hl = [0.53, 0.33, 0.14];
    const fprof = [[0, 0.12, 0.13, 0.12], [0.12, 0.115, 0.125, 0.105], [0.24, 0.095, 0.1, 0.08], [0.36, 0.07, 0.072, 0.06], [0.46, 0.056, 0.058, 0.05], [0.5, 0.058, 0.066, 0.052], [0.54, 0.05, 0.052, 0.046],
      [0.6, 0.04, 0.04, 0.041], [0.76, 0.036, 0.036, 0.038], [0.82, 0.044, 0.045, 0.05], [0.86, 0.042, 0.042, 0.046]];
    const hprof = [[0, 0.11, 0.1, 0.1], [0.12, 0.11, 0.1, 0.11], [0.26, 0.095, 0.08, 0.11], [0.4, 0.068, 0.055, 0.085], [0.48, 0.06, 0.05, 0.085], [0.52, 0.056, 0.048, 0.075], [0.57, 0.042, 0.04, 0.048],
      [0.82, 0.036, 0.036, 0.038], [0.86, 0.044, 0.045, 0.05], [0.89, 0.042, 0.042, 0.046]];
    const hoofC = col(pinkNose ? 0x5a4a3e : 0x2e2622);
    const leg = (x, z, top, L, prof) => ({ x, z, top: top + 0.06, L: [L[0] + 0.06, L[1], L[2]], prof: [[0, prof[0][1], prof[0][2], prof[0][3]], ...prof.map(p => [p[0] * 0.92 + 0.08, p[1], p[2], p[3]])], c: legC(z), foot: casco(x, z, top - L[0] - L[1], L[2], 0.04, legC(z)(0.95), hoofC) });
    const tailPts = [[0, 1.15, -0.9], [0, 1.06, -0.97], [0, 0.88, -1.0], [0, 0.68, -1.0], [0, 0.5, -0.99], [0, 0.4, -0.985], [0, 0.32, -0.98]], tc = i => i >= 5 ? dark : w;
    const extra = []; if (!bull && !calf) { // úbere: a bolsa pende abaixo da barriga entre as coxas (o alto entra um pouco no corpo, embaixo ela fica à vista),
      // com as quatro tetas para baixo, um pouco abertas, mais grossas na base
      extra.push([sph(0.115, 0.085, 0.14, 0, 0.565, -0.42, 0xdca08c, 18), 'root']);
      for (const [x, z] of [[0.05, -0.36], [-0.05, -0.36], [0.05, -0.48], [-0.05, -0.48]]) extra.push([cyl(0.009, 0.015, 0.07, 0xd08a78, 10).rotateZ(-Math.sign(x) * 0.12).rotateX(Math.sign(z + 0.42) * 0.1).translate(x, 0.485, z), 'root']); }
    const K = 1.08 * size * (bull ? 1.05 : 1);
    // manchas no pixel (ver pelagem); onde a cor do vértice é a do pelo (entre a cor de base e o cinza do lombo)
    const Mv = spotC ? pelagem(coat.spot, w, coat.w === 0xf0ebe2 ? 2.4 : 3.3, 0.6 - (coat.sp || 0) * 0.2, sd) : M;
    const gw = [grey.r, grey.g, grey.b], ww = [w.r, w.g, w.b], d2 = ww.map((v, i) => v - gw[i]), dd = d2.reduce((a, v) => a + v * v, 0) || 1e-6;
    const pat = spotC ? (r0, g0, b0) => { const c = [r0, g0, b0], t = Math.max(0, Math.min(1, c.reduce((a, v, i) => a + (v - gw[i]) * d2[i], 0) / dd)), pp = gw.map((v, i) => v + d2[i] * t);
      const e = Math.hypot(c[0] - pp[0], c[1] - pp[1], c[2] - pp[2]) / (pp[0] * 0.3 + pp[1] * 0.5 + pp[2] * 0.2 + 0.04); return e < 0.3 ? 1 : 0; } : null;
    const eL = S(0.05, 0.12, 0.018), r = quad({ K, M: Mv, pat, seg: 44, body: { rings, shape }, neck, head, ears: [eL, [-eL[0], eL[1], eL[2]]], muzzle,
      legs: [leg(0.13, 0.44, 0.84, fl, fprof), leg(-0.13, 0.44, 0.84, fl, fprof), leg(0.14, -0.62, 0.92, hl, hprof), leg(-0.14, -0.62, 0.92, hl, hprof)],
      tail: { pts: tailPts, prof: tailPts.map((p, i) => ({ rx: i === 5 ? 0.048 : i === 6 ? 0.02 : 0.034 - i * 0.003, rt: i === 5 ? 0.048 : i === 6 ? 0.02 : 0.034 - i * 0.003, rb: i === 5 ? 0.048 : i === 6 ? 0.02 : 0.034 - i * 0.003, c: tc(i) })), n: 5, rest: [0.1, 0.02] },
      extra });
    r.graze = grazeOf(neckPts, muzzle); return r;
  }

  // ---------- capivara: barril marrom de pelo grosso, cabeça quadrada, narinas e olhos no alto (para nadar), quase sem pescoço
  function capivara() { const b = col(0x8d5a37), d = col(0x4a2c1a), bl = a => { const sa = Math.sin(a); return sa < -0.4 ? mix(b, 0xa8805a, (-sa - 0.4) * 0.8) : mix(b, 0x5e3a22, Math.max(0, sa) * 0.6); };
    const rings = [[-0.52, 0.52, 0.1, 0.1, 0.1], [-0.47, 0.53, 0.2, 0.21, 0.22], [-0.33, 0.53, 0.26, 0.27, 0.27], [-0.08, 0.51, 0.27, 0.27, 0.28], [0.16, 0.5, 0.255, 0.25, 0.27], [0.31, 0.52, 0.225, 0.22, 0.23], [0.42, 0.55, 0.2, 0.2, 0.2], [0.5, 0.58, 0.14, 0.14, 0.14]]
      .map(([z, y, rx, rt, rb]) => ({ z, y, rx, rt, rb, e: 2.4, c: bl }));
    const neckPts = [[0, 0.56, 0.32], [0, 0.6, 0.43], [0, 0.63, 0.5]], th = 0.45, S = (t, x, y) => [x, y * Math.cos(th) - t * Math.sin(th), y * Math.sin(th) + t * Math.cos(th)], muzzle = S(0.43, 0, -0.02);
    const head = H => { const hc = (t, a) => t > 0.37 ? d : t > 0.3 ? mix(bl(a), d, (t - 0.3) / 0.07) : bl(a);
      H.add(skull([[0, 0.12, 0.12, 0.14], [0.08, 0.13, 0.13, 0.15], [0.16, 0.125, 0.12, 0.15], [0.24, 0.115, 0.11, 0.14], [0.31, 0.105, 0.1, 0.125], [0.36, 0.1, 0.09, 0.11], [0.4, 0.085, 0.07, 0.09], [0.425, 0.05, 0.04, 0.05]]
        .map(([t, rx, rt, rb]) => [t, rx, rt, rb, a => hc(t, a), 3.0]), th, 22));
      for (const sx of [-1, 1]) { const e = S(0.15, sx * 0.108, 0.085), ep = S(0.04, sx * 0.08, 0.13), n = S(0.418, sx * 0.032, 0.045);
        olho(H, e[0], e[1], e[2], 0.017, sx); H.add(sph(0.04, 0.036, 0.018, ep[0], ep[1], ep[2], d, 10), sx > 0 ? 'earL' : 'earR'); H.add(sph(0.007, 0.012, 0.009, n[0], n[1], n[2], 0x0a0807, 6)); } };
    const lc = (t) => mix(b, d, t * 0.7), paw = (x, z, top, L) => pata(x, z, top - L[0] - L[1], L[2], 0.036, mix(b, d, 0.7), 0x2a1a10, 4, 0x1a120c);
    const lp = [[0, 0.08, 0.08, 0.08], [0.3, 0.066, 0.068, 0.064], [0.47, 0.05, 0.053, 0.05], [0.6, 0.044, 0.044, 0.045], [0.77, 0.04, 0.04, 0.043], [0.81, 0.04, 0.04, 0.042]];
    const r = quad({ K: 1, M, body: { rings }, neck: { pts: neckPts, prof: [{ rx: 0.21, rt: 0.21, rb: 0.22, c: bl }, { rx: 0.18, rt: 0.18, rb: 0.2, c: bl }, { rx: 0.145, rt: 0.145, rb: 0.165, c: bl }] }, head,
      ears: [S(0.04, 0.08, 0.13), S(0.04, -0.08, 0.13)], muzzle, seg: 36,
      legs: [[0.15, 0.3, 0.36, [0.17, 0.11, 0.08]], [-0.15, 0.3, 0.36, [0.17, 0.11, 0.08]], [0.16, -0.33, 0.39, [0.24, 0.12, 0.08]], [-0.16, -0.33, 0.39, [0.24, 0.12, 0.08]]].map(([x, z, top, L]) => ({ x, z, top, L, prof: lp, c: lc, foot: paw(x, z, top, L) })) });
    r.graze = grazeOf(neckPts, muzzle); return r; }

  // ---------- ovelha: lã em cachos, cara e pernas escuras
  function ovelha() { const wl = col(0xeee6d4), dk = col(0x3a3230), wc = a => mix(wl, 0xd8cfbc, Math.max(0, -Math.sin(a)) * 0.6);
    const rings = [[-0.5, 0.67, 0.1, 0.1, 0.1], [-0.45, 0.67, 0.2, 0.2, 0.22], [-0.3, 0.68, 0.27, 0.27, 0.29], [0, 0.68, 0.29, 0.29, 0.31], [0.25, 0.68, 0.27, 0.27, 0.29], [0.4, 0.7, 0.21, 0.22, 0.23], [0.48, 0.73, 0.12, 0.12, 0.12]].map(([z, y, rx, rt, rb]) => ({ z, y, rx, rt, rb, e: 2.1, c: wc }));
    const fleece = (x, y, a, r) => { const b = 1 + 0.07 * Math.sin(a * 7 + r.z * 9) * Math.sin(r.z * 23 + a * 3); return [x * b, y * b]; };
    const neckPts = [[0, 0.71, 0.34], [0, 0.81, 0.5], [0, 0.88, 0.62]], muzzle = [0, -0.18, 0.2];
    const head = H => { H.add(skull([[0, 0.075, 0.08, 0.085], [0.08, 0.08, 0.08, 0.085], [0.16, 0.066, 0.065, 0.07], [0.24, 0.05, 0.05, 0.055], [0.285, 0.035, 0.035, 0.035]].map(([t, rx, rt, rb]) => [t, rx, rt, rb, dk, 2.4]), 0.85, 30));
      H.add(sph(0.1, 0.075, 0.09, 0, 0.06, -0.01, wl, 12));
      for (const sx of [-1, 1]) { H.add(sph(0.065, 0.024, 0.03, sx * 0.1, 0.02, 0.0, dk, 8), sx > 0 ? 'earL' : 'earR'); olho(H, sx * 0.068, 0.0, 0.09, 0.014, sx); } };
    const lc = t => t < 0.31 ? wl : dk;
    const lpF = [[0, 0.1, 0.1, 0.1], [0.28, 0.085, 0.085, 0.085], [0.33, 0.034, 0.036, 0.034], [0.41, 0.03, 0.032, 0.03], [0.44, 0.034, 0.038, 0.032], [0.5, 0.026, 0.027, 0.026], [0.76, 0.024, 0.024, 0.025], [0.81, 0.03, 0.03, 0.033], [0.85, 0.028, 0.028, 0.03]];
    const lpH = [[0, 0.12, 0.12, 0.13], [0.3, 0.09, 0.09, 0.1], [0.36, 0.04, 0.036, 0.05], [0.44, 0.032, 0.03, 0.045], [0.47, 0.03, 0.028, 0.04], [0.52, 0.026, 0.026, 0.03], [0.78, 0.024, 0.024, 0.025], [0.83, 0.03, 0.03, 0.033], [0.87, 0.028, 0.028, 0.03]];
    const leg = (x, z, top, L, lp) => ({ x, z, top, L, prof: lp, c: lc, foot: casco(x, z, top - L[0] - L[1], L[2], 0.026, dk, 0x1e1a18) });
    const tp = [[0, 0.74, -0.48], [0, 0.66, -0.54], [0, 0.56, -0.56]];
    const r = quad({ K: 1, M, seg: 36, body: { rings, shape: fleece }, neck: { pts: neckPts, prof: [{ rx: 0.15, rt: 0.15, rb: 0.16, c: wc }, { rx: 0.13, rt: 0.13, rb: 0.14, c: wc }, { rx: 0.1, rt: 0.11, rb: 0.1, c: wc }] }, head, ears: [[0.1, 0.02, 0], [-0.1, 0.02, 0]], muzzle,
      legs: [leg(0.12, 0.28, 0.48, [0.205, 0.185, 0.09], lpF), leg(-0.12, 0.28, 0.48, [0.205, 0.185, 0.09], lpF), leg(0.12, -0.3, 0.5, [0.235, 0.19, 0.09], lpH), leg(-0.12, -0.3, 0.5, [0.235, 0.19, 0.09], lpH)],
      tail: { pts: tp, prof: [{ rx: 0.06, rt: 0.06, rb: 0.06, c: wl }, { rx: 0.055, rt: 0.055, rb: 0.055, c: wl }, { rx: 0.035, rt: 0.035, rb: 0.035, c: wl }], n: 2, rest: [0.2, 0.1] } });
    r.graze = grazeOf(neckPts, muzzle); return r; }

  // ---------- lobo-guará: pernas compridas de meia preta, pelo laranja, crina preta, orelhonas, rabo com ponta branca
  function lobo() { const o = col(0xc8622a), k = col(0x1e1a18), w = col(0xf2ece0);
    const oc = z => a => { const top = Math.sin(a); return top > 0.75 && z > 0.05 ? k : mix(o, 0xe0884a, Math.max(0, -top) * 0.6); };
    const rings = [[-0.42, 0.83, 0.06, 0.06, 0.06], [-0.38, 0.83, 0.12, 0.12, 0.13], [-0.25, 0.82, 0.14, 0.15, 0.16], [0, 0.82, 0.14, 0.16, 0.17], [0.2, 0.84, 0.145, 0.165, 0.175], [0.32, 0.87, 0.13, 0.15, 0.15], [0.4, 0.9, 0.09, 0.1, 0.1]].map(([z, y, rx, rt, rb]) => ({ z, y, rx, rt, rb, e: 2.1, c: oc(z) }));
    const neckPts = [[0, 0.9, 0.3], [0, 0.99, 0.41], [0, 1.04, 0.48]], th = 0.24, S = (t, x, y) => [x, y * Math.cos(th) - t * Math.sin(th), y * Math.sin(th) + t * Math.cos(th)], muzzle = S(0.31, 0, -0.045);
    // cabeça de raposa grande: crânio estreito, testa com o degrau (stop) antes do focinho comprido e fino; o focinho, o
    // nariz e o queixo pretos; a garganta e o lábio de baixo brancos; orelhas enormes, de pé, brancas por dentro
    const head = H => { const g1 = (v, m, s2) => Math.exp(-(((v - m) / s2) ** 2));
      const HR = [[-0.07, 0.0, 0.074, 0.074, 0.082, 2.2], [-0.03, 0.008, 0.08, 0.078, 0.08, 2.2], [0.02, 0.014, 0.086, 0.08, 0.078, 2.3], [0.065, 0.012, 0.09, 0.072, 0.08, 2.4], [0.105, 0.004, 0.074, 0.058, 0.072, 2.4],
        [0.135, -0.006, 0.054, 0.042, 0.062, 2.4], [0.17, -0.016, 0.042, 0.034, 0.052, 2.4], [0.215, -0.026, 0.034, 0.028, 0.042, 2.4], [0.255, -0.033, 0.028, 0.023, 0.034, 2.3], [0.288, -0.037, 0.022, 0.019, 0.026, 2.2], [0.306, -0.038, 0.012, 0.011, 0.014, 2.1]];
      const hc = (t, a) => { const sa = Math.sin(a); const blk = Math.max(0, Math.min(1, (t - 0.12) / 0.05)); const base = sa < -0.45 && t < 0.13 ? mix(o, w, Math.min(1, (-sa - 0.45) * 3)) : mix(o, 0xd8743a, Math.max(0, sa) * 0.5);
        return mix(base, k, blk); };
      const fox = (x, y, a, r) => { const t = r.z, sa = Math.sin(a); if (sa > 0.55) y *= 1 - 0.07 * g1(t, 0.12, 0.03);   // o degrau entre os olhos
        if (sa < 0.3 && sa > -0.4) x *= 1 + 0.06 * g1(t, 0.065, 0.04);   // o arco do zigomático
        return [x, y]; };
      H.add(loft(HR.map(([t, y, rx, rt, rb, e]) => ({ z: t, y, rx, rt, rb, e, c: a => hc(t, a) })), 32, fox).rotateX(th));
      // a mandíbula: fina, preta na frente, o queixo e a garganta brancos atrás
      H.add(loft([[0.06, 0.05, 0.018, 0.03], [0.12, 0.04, 0.016, 0.026], [0.19, 0.03, 0.013, 0.02], [0.25, 0.022, 0.01, 0.016], [0.28, 0.012, 0.006, 0.01]].map(([t, rx, rt, rb]) => ({ z: t, y: -0.058 - t * 0.04, rx, rt, rb: rb * 0.75, e: 2.2, c: t > 0.12 ? k : mix(w, k, Math.max(0, (t - 0.06) / 0.06)) })), 14).rotateX(th));
      const np = S(0.305, 0, -0.03); H.add(sph(0.017, 0.014, 0.014, np[0], np[1], np[2], 0x0c0a0a, 12));   // o nariz
      for (const sx of [-1, 1]) { const side = sx > 0 ? 'earL' : 'earR';
        // olho castanho-âmbar, meio de lado, puxado para a frente, com a borda preta
        const e = S(0.11, sx * 0.064, 0.032), rotE = g => g.rotateY(sx * 0.75).rotateX(th);
        H.add(rotE(sph(0.017, 0.013, 0.006, 0, 0, 0, k, 12)).translate(...e)); H.add(rotE(sph(0.0125, 0.0105, 0.006, 0, 0, 0.002, 0x8a4a12, 12)).translate(...e));
        H.add(rotE(sph(0.006, 0.006, 0.004, 0, 0, 0.0055, 0x0a0806, 8)).translate(...e)); H.add(sph(0.003, 0.003, 0.002, e[0] + sx * 0.004, e[1] + 0.004, e[2] + 0.006, 0xfaf6ee, 6));
        // orelhona de pé: por trás laranja, por dentro branca, em ponta arredondada; um pouco aberta para o lado e para a frente
        const ep = S(0.0, sx * 0.05, 0.072), ear = (rx, ry, rz, c, dz, dy = 0) => orelha(rx, ry, rz, c, 0.7).translate(0, ry * 0.85 + dy, dz).rotateZ(-sx * 0.3).rotateY(sx * 0.32).translate(...ep);
        H.add(ear(0.05, 0.08, 0.016, o, 0), side); H.add(ear(0.038, 0.064, 0.007, w, 0.011, 0.002), side); H.add(ear(0.022, 0.036, 0.006, 0xd8c8b8, 0.015, -0.008), side); } };
    const nkc = a => { const sa = Math.sin(a); return sa > 0.6 ? k : sa < -0.7 ? mix(o, w, Math.min(1, (-sa - 0.7) * 4)) : o; };   // crina preta em cima, garganta branca
    const lc = t => t > 0.3 ? k : o, lp = [[0, 0.07, 0.07, 0.07], [0.15, 0.06, 0.062, 0.058], [0.3, 0.045, 0.046, 0.044], [0.42, 0.034, 0.034, 0.034], [0.45, 0.036, 0.038, 0.036], [0.5, 0.027, 0.027, 0.027], [0.78, 0.024, 0.024, 0.024], [0.81, 0.028, 0.029, 0.028], [0.84, 0.026, 0.026, 0.026]];
    const leg = (x, z, top, L) => ({ x, z, top, L, prof: lp, c: lc, foot: pata(x, z, top - L[0] - L[1], L[2], 0.026, k, 0x141210, 4, 0x2a2622) });
    const tp = [[0, 0.86, -0.42], [0, 0.8, -0.52], [0, 0.66, -0.6], [0, 0.52, -0.64], [0, 0.4, -0.66]];
    const r = quad({ K: 1, M, seg: 36, body: { rings }, neck: { pts: neckPts, prof: [{ rx: 0.1, rt: 0.12, rb: 0.11, c: nkc }, { rx: 0.088, rt: 0.105, rb: 0.095, c: nkc }, { rx: 0.078, rt: 0.085, rb: 0.085, c: nkc }] }, head, ears: [S(0.0, 0.05, 0.072), S(0.0, -0.05, 0.072)], muzzle,
      legs: [leg(0.09, 0.3, 0.75, [0.32, 0.27, 0.15]), leg(-0.09, 0.3, 0.75, [0.32, 0.27, 0.15]), leg(0.09, -0.3, 0.78, [0.35, 0.29, 0.15]), leg(-0.09, -0.3, 0.78, [0.35, 0.29, 0.15])],
      tail: { pts: tp, prof: tp.map((p, i) => ({ rx: [0.04, 0.07, 0.085, 0.075, 0.04][i], rt: [0.04, 0.07, 0.085, 0.075, 0.04][i], rb: [0.04, 0.07, 0.085, 0.075, 0.04][i], c: i >= 3 ? w : o })), n: 4, rest: [-0.6, 0.12] } });
    r.graze = grazeOf(neckPts, muzzle); return r; }

  // ---------- onça-pintada: o maior gato das Américas. Corpo atarracado e musculoso: peito fundo e largo atrás das patas da
  // frente, as escápulas marcando o lombo, cintura um pouco recolhida e garupa forte, a pele solta da barriga balançando
  // atrás; patas curtas e grossas (a da frente é a mais pesada), patas largas; cabeça grande, larga e redonda, focinho curto
  // e quadrado com as almofadas dos bigodes, queixo forte, orelhas pequenas e redondas (pretas atrás, com a pinta clara);
  // rabo mais curto que o de outros gatos. A pelagem (rosetas, pintas) vem do shader rosetas()
  function onca() { const G = col(0xd99c42), Gt = col(0xc8862e), Gs = col(0xe2ad58), cr = col(0xf3ead6), k = col(0x16100c), nose = col(0x9a6050);
    const gc = a => { const sa = Math.sin(a); return sa < -0.6 ? mix(Gs, cr, Math.min(1, (-sa - 0.6) * 3.5)) : sa > 0.3 ? mix(G, Gt, (sa - 0.3) * 0.8) : mix(Gs, G, (sa + 0.35) / 0.65); };
    const rings = [[-0.57, 0.575, 0.05, 0.05, 0.05], [-0.535, 0.58, 0.13, 0.12, 0.14], [-0.46, 0.575, 0.18, 0.155, 0.2], [-0.34, 0.56, 0.19, 0.16, 0.225], [-0.2, 0.55, 0.178, 0.158, 0.215],
      [-0.06, 0.548, 0.172, 0.162, 0.2], [0.08, 0.55, 0.185, 0.172, 0.222], [0.2, 0.556, 0.196, 0.18, 0.238], [0.31, 0.57, 0.192, 0.186, 0.24], [0.4, 0.592, 0.165, 0.172, 0.208], [0.47, 0.618, 0.122, 0.135, 0.158], [0.52, 0.635, 0.06, 0.07, 0.08]]
      .map(([z, y, rx, rt, rb]) => ({ z, y, rx, rt, rb, e: 2.15, c: gc }));
    const g1 = (v, m, s) => Math.exp(-(((v - m) / s) ** 2));
    const shape = (x, y, a, r) => { const z = r.z, s = Math.sin(a), c = Math.cos(a), ax = Math.abs(x);
      if (s > 0.2) y += 0.028 * g1(z, 0.33, 0.07) * g1(ax, 0.07, 0.05) * s;   // as escápulas sobem no lombo
      if (s > 0.5) y += 0.012 * g1(z, -0.4, 0.1) * s;   // a garupa
      if (s < -0.2) { const pouch = g1(z, -0.24, 0.12) * Math.pow(-s, 3); y -= 0.035 * pouch; x *= 1 - 0.25 * pouch; }   // a pele solta da barriga
      if (s < -0.3) x *= 1 - 0.22 * g1(z, 0.24, 0.1) * Math.pow(-s, 2);   // o peito em quilha, estreito embaixo
      if (s < 0.5) { const sd = Math.pow(Math.abs(c), 1.4); x *= 1 + sd * (0.1 * g1(z, 0.33, 0.09) + 0.13 * g1(z, -0.38, 0.11)) - sd * 0.06 * g1(z, -0.08, 0.1); }   // paleta, coxa e cintura
      for (const [lz, lx, dr] of [[0.32, 0.12, 0.05], [-0.36, 0.12, 0.06]]) if (s < -0.1) { const d = g1(ax, lx, 0.06) * g1(z, lz, 0.075) * Math.pow(-s, 0.7); y -= dr * d; }   // braço e coxa descem para dentro da perna
      return [x, y]; };
    const neckPts = [[0, 0.6, 0.38], [0, 0.635, 0.49], [0, 0.655, 0.57]], th = 0.1, S = (t, x, y) => [x, y * Math.cos(th) - t * Math.sin(th), y * Math.sin(th) + t * Math.cos(th)], muzzle = S(0.24, 0, -0.08);
    const head = H => {
      // [t, centro y, meia-largura, alto, baixo, quadratura]: nuca, crânio redondo e largo (as bochechas com o arco
      // zigomático são o mais largo), testa caindo reta até o focinho curto, alto e quadrado, que termina chato no nariz
      const HR = [[-0.08, -0.005, 0.12, 0.1, 0.13, 2.2], [-0.045, 0.002, 0.126, 0.106, 0.124, 2.2], [0.0, 0.012, 0.132, 0.112, 0.116, 2.3], [0.04, 0.02, 0.14, 0.12, 0.118, 2.4], [0.08, 0.018, 0.15, 0.118, 0.126, 2.5], [0.12, 0.01, 0.144, 0.104, 0.132, 2.6],
        [0.15, 0.0, 0.126, 0.088, 0.13, 2.7], [0.175, -0.012, 0.104, 0.068, 0.12, 2.8], [0.198, -0.02, 0.092, 0.054, 0.108, 3.0], [0.218, -0.024, 0.086, 0.048, 0.1, 3.0], [0.234, -0.026, 0.074, 0.044, 0.09, 2.9], [0.246, -0.027, 0.05, 0.032, 0.064, 2.6], [0.252, -0.027, 0.014, 0.012, 0.018, 2.2]];
      // dourado em cima; o lábio de cima (as almofadas dos bigodes) e a garganta claros
      const hc = (t, a) => { const sa = Math.sin(a); if (t > 0.2 && sa < -0.3) return mix(Gs, cr, Math.min(1, (-sa - 0.3) * 4)); if (sa < -0.7) return mix(Gs, cr, (-sa - 0.7) * 3.3); return t < 0.02 ? G : mix(Gs, G, Math.max(0, sa)); };
      const pads = (x, y, a, r) => { const t = r.z, sa = Math.sin(a), ca = Math.cos(a);
        if (t > 0.18) { const w = g1(t, 0.215, 0.03) * g1(sa, -0.1, 0.45); x *= 1 + 0.12 * w; if (Math.abs(ca) < 0.3 && sa < 0) y *= 1 - 0.1 * g1(t, 0.235, 0.015); }   // almofadas dos bigodes e a fenda do meio
        if (t < 0.15 && sa < 0.2) x *= 1 + 0.05 * g1(t, 0.07, 0.05) * Math.sqrt(Math.max(0, 0.2 - sa));   // bochechas cheias
        if (t > 0.1 && t < 0.2 && sa > 0.6) y *= 1 - 0.06 * g1(t, 0.16, 0.03);   // o vale entre as sobrancelhas
        return [x, y]; };
      H.add(loft(HR.map(([t, y, rx, rt, rb, e]) => ({ z: t, y, rx: rx * 1.06, rt, rb, e, c: a => hc(t, a) })), 36, pads).rotateX(th));
      // queixo forte e o beiço de baixo, claros
      H.add(loft([[0.12, 0.06, 0.02, 0.03], [0.16, 0.07, 0.026, 0.038], [0.2, 0.064, 0.024, 0.034], [0.222, 0.046, 0.018, 0.026], [0.232, 0.02, 0.008, 0.012]].map(([t, rx, rt, rb]) => ({ z: t, y: -0.118, rx, rt, rb, e: 2.3, c: a => Math.sin(a) > 0.55 ? mix(cr, k, 0.6) : cr })), 16).rotateX(th));
      const np = S(0.244, 0, 0.004); H.add(sph(0.025, 0.012, 0.008, 0, 0, 0, nose, 12).rotateX(th - 0.45).translate(np[0], np[1], np[2]));   // o nariz largo
      for (const sx of [-1, 1]) { const side = sx > 0 ? 'earL' : 'earR';
        // olho de gato, de frente: íris âmbar, pupila redonda, a borda preta e o claro em volta
        const e = S(0.192, sx * 0.062, 0.03), rotE = g => g.rotateY(sx * 0.5).rotateX(-0.12 + th);
        H.add(rotE(sph(0.028, 0.025, 0.008, 0, 0, 0, mix(cr, Gs, 0.4), 12)).translate(e[0] - sx * 0.001, e[1] - 0.003, e[2] - 0.004));
        H.add(rotE(sph(0.024, 0.021, 0.007, 0, 0, 0, k, 12)).translate(e[0], e[1], e[2]));
        H.add(rotE(sph(0.02, 0.018, 0.007, 0, 0, 0.002, 0xc89a2a, 12)).translate(e[0], e[1], e[2]));
        H.add(rotE(sph(0.009, 0.011, 0.004, 0, 0, 0.0065, 0x0a0806, 8)).translate(e[0], e[1], e[2]));
        H.add(sph(0.0035, 0.0035, 0.0025, e[0] + sx * 0.002, e[1] + 0.005, e[2] + 0.009, 0xfaf6ee, 6));
        // orelha pequena e redonda: a concha de pelo claro na frente, atrás preta com a pinta clara no meio
        const ep = S(0.045, sx * 0.11, 0.118), ear = (rx, ry, rz, c, dz) => sph(rx, ry, rz, 0, 0, dz, c, 14).rotateZ(-sx * 0.55).rotateY(sx * 0.4).translate(...ep);
        H.add(ear(0.028, 0.026, 0.012, k, 0), side); H.add(ear(0.024, 0.022, 0.006, Gs, 0.006), side); H.add(ear(0.016, 0.015, 0.005, mix(cr, 0xd8b090, 0.3), 0.009), side); H.add(ear(0.01, 0.009, 0.004, cr, -0.01), side);
        const n = S(0.247, sx * 0.012, 0.01); H.add(sph(0.004, 0.003, 0.003, n[0], n[1], n[2], 0x2a1a16, 6)); } };   // narinas
    const lpF = [[0, 0.1, 0.1, 0.11], [0.2, 0.09, 0.095, 0.1], [0.38, 0.068, 0.07, 0.078], [0.44, 0.064, 0.062, 0.08], [0.5, 0.06, 0.07, 0.06], [0.62, 0.056, 0.064, 0.054], [0.76, 0.046, 0.05, 0.046], [0.82, 0.05, 0.05, 0.05]];
    const lpH = [[0, 0.12, 0.12, 0.13], [0.2, 0.108, 0.115, 0.12], [0.36, 0.08, 0.08, 0.09], [0.48, 0.058, 0.058, 0.06], [0.58, 0.05, 0.048, 0.062], [0.72, 0.042, 0.04, 0.05], [0.82, 0.04, 0.038, 0.05], [0.85, 0.042, 0.042, 0.046]];
    // a perna: dourada por fora, creme por dentro e atrás embaixo (o lado de dentro de cada perna depende do lado do bicho)
    const legC = sx => (t, a) => { const ca = Math.cos(a) * sx, sa = Math.sin(a); const inn = Math.max(0, -ca) * Math.min(1, t * 1.6) + (sa < -0.5 ? 0.4 * t : 0); return mix(gc(0), cr, inn * 0.55); };
    const leg = (x, z, top, L, prof, pr) => ({ x, z, top, L, prof, c: legC(Math.sign(x)), foot: pata(x, z, top - L[0] - L[1], L[2], pr, Gs, cr, 4) });
    const tp = [[0, 0.6, -0.52], [0, 0.57, -0.6], [0, 0.52, -0.69], [0, 0.46, -0.78], [0, 0.4, -0.87], [0, 0.35, -0.95], [0, 0.32, -1.02], [0, 0.31, -1.08], [0, 0.315, -1.12]];
    const r = quad({ K: 1, M: rosetas(), pat: () => 1, seg: 44, body: { rings, shape },
      neck: { pts: neckPts, prof: [{ rx: 0.165, rt: 0.17, rb: 0.2, c: gc }, { rx: 0.15, rt: 0.135, rb: 0.175, c: gc }, { rx: 0.135, rt: 0.115, rb: 0.15, c: gc }] }, head,
      ears: [S(0.045, 0.11, 0.118), S(0.045, -0.11, 0.118)], muzzle,
      legs: [leg(0.12, 0.32, 0.42, [0.19, 0.15, 0.08], lpF, 0.056), leg(-0.12, 0.32, 0.42, [0.19, 0.15, 0.08], lpF, 0.056), leg(0.12, -0.36, 0.46, [0.26, 0.17, 0.08], lpH, 0.05), leg(-0.12, -0.36, 0.46, [0.26, 0.17, 0.08], lpH, 0.05)],
      tail: { pts: tp, prof: tp.map((p, i) => { const rr = [0.052, 0.046, 0.042, 0.039, 0.036, 0.034, 0.032, 0.03, 0.018][i]; return { rx: rr, rt: rr, rb: rr, c: i >= 7 ? k : Gs }; }), n: 5, rest: [-0.25, 0.1] } });
    // qual pinta vai onde (atributo pat, ver rosetas): rosetas no tronco e no alto das coxas; pintas no pescoço, na barriga,
    // nas pernas e no rabo; pintinhas na cabeça e nas patas; nada no que é escuro (nariz, olho, a borda da orelha)
    { const g = r.mesh.geometry, pa = g.attributes.pat, part = g.userData.part, names = g.userData.partNames, p = g.attributes.position, cc = g.attributes.color, nm = i => names[part[i]] || '';
      for (let i = 0; i < pa.count; i++) { const n = nm(i), y = p.getY(i), l = cc.getX(i) * 0.3 + cc.getY(i) * 0.5 + cc.getZ(i) * 0.2; let v;
        if (n === 'corpo') { const bb = r.bodyRings, z = p.getZ(i); let j = 0; while (j < bb.length - 2 && bb[j + 1].z < z) j++; const cy = bb[j].y; v = y < cy - 0.12 ? 0.6 : y < cy - 0.06 ? 0.6 + 0.4 * (y - cy + 0.12) / 0.06 : 1; }
        else if (n === 'pescoco') v = 0.6; else if (n === 'cabeca') v = 0.3; else if (n.startsWith('perna')) v = y > 0.36 ? 1 : y > 0.26 ? 0.6 + 0.4 * (y - 0.26) / 0.1 : y > 0.12 ? 0.6 : 0.3;
        else if (n.startsWith('pe')) v = 0.3; else if (n === 'rabo') v = 0.6; else v = 0;
        if (l < 0.12 || (n === 'cabeca' && cc.getX(i) < cc.getY(i) * 1.05)) v = 0; pa.setX(i, v); } pa.needsUpdate = true; }
    r.graze = grazeOf(neckPts, muzzle); return r; }

  // ---------- anta: corpo pesado, tromba curta que mexe, crina baixa, orelhas de borda clara
  function anta() { const c = col(0x6e5646), d = col(0x523e30), pc = col(0x7a6250);
    const rings = [[-0.64, 0.8, 0.1, 0.1, 0.1], [-0.58, 0.82, 0.26, 0.28, 0.28], [-0.42, 0.8, 0.33, 0.36, 0.35], [-0.15, 0.75, 0.34, 0.36, 0.38], [0.15, 0.72, 0.33, 0.33, 0.37], [0.38, 0.72, 0.28, 0.28, 0.31], [0.52, 0.75, 0.21, 0.22, 0.23], [0.6, 0.78, 0.14, 0.15, 0.15]]
      .map(([z, y, rx, rt, rb]) => ({ z, y, rx, rt, rb, e: 2.0, c: a => { const sa = Math.sin(a); return sa < -0.5 ? mix(c, 0x7a685c, (-sa - 0.5)) : mix(c, d, Math.max(0, sa) * 0.45); } }));
    const neckPts = [[0, 0.78, 0.46], [0, 0.85, 0.66], [0, 0.85, 0.8]], muzzle = [0, -0.25, 0.32];
    const head = H => { H.add(skull([[0, 0.13, 0.15, 0.16], [0.1, 0.14, 0.16, 0.17], [0.22, 0.11, 0.12, 0.13], [0.32, 0.08, 0.08, 0.08], [0.38, 0.055, 0.055, 0.055]].map(([t, rx, rt, rb]) => [t, rx, rt, rb, pc, 2.3]), 0.55, 30));
      H.add(tube([[0, -0.2, 0.3], [0, -0.26, 0.37], [0, -0.34, 0.39]], [{ rx: 0.05, rt: 0.05, rb: 0.05, c: d }, { rx: 0.04, rt: 0.04, rb: 0.04, c: d }, { rx: 0.03, rt: 0.03, rb: 0.03, c: col(0x2a2420) }], 10, true), 'snout');
      for (const sx of [-1, 1]) { { const eg = new THREE.SphereGeometry(1, 16, 12).scale(0.06, 0.08, 0.02), ep = eg.attributes.position, ec = new Float32Array(ep.count * 3), rim = col(0xd8ccbc);
          for (let q = 0; q < ep.count; q++) { const rr = Math.hypot(ep.getX(q) / 0.06, ep.getY(q) / 0.08), k3 = rr > 0.82 ? rim : c; ec.set([k3.r, k3.g, k3.b], q * 3); } eg.setAttribute('color', new THREE.BufferAttribute(ec, 3));
          eg.rotateY(sx * 0.35).translate(sx * 0.1, 0.14, 0.0); H.add(eg, sx > 0 ? 'earL' : 'earR'); }
        olho(H, sx * 0.1, 0.0, 0.17, 0.015, sx); } };
    // pernas da anta: curtas e grossas; o braço e a coxa saem de dentro do corpo (manga), o antebraço largo na frente afina até
    // o punho e a quartela curta, com os dedos de unha (4 na frente, 3 atrás); atrás a coxa pesada e o jarrete marcado
    const lpF = [[-0.3, 0.06, 0.07, 0.07], [-0.15, 0.1, 0.11, 0.11], [0, 0.12, 0.13, 0.13], [0.15, 0.115, 0.125, 0.125], [0.3, 0.1, 0.108, 0.11], [0.4, 0.088, 0.09, 0.1], [0.47, 0.08, 0.088, 0.078], [0.6, 0.07, 0.078, 0.064], [0.72, 0.058, 0.06, 0.054], [0.79, 0.054, 0.054, 0.052], [0.84, 0.058, 0.058, 0.058]];
    const lpH = [[-0.3, 0.07, 0.07, 0.08], [-0.15, 0.11, 0.11, 0.12], [0, 0.13, 0.13, 0.14], [0.18, 0.12, 0.12, 0.13], [0.34, 0.1, 0.1, 0.11], [0.46, 0.078, 0.078, 0.085], [0.56, 0.066, 0.064, 0.074], [0.68, 0.058, 0.056, 0.064], [0.78, 0.054, 0.054, 0.058], [0.83, 0.058, 0.058, 0.058]];
    const lc = (t, a) => mix(c, d, Math.min(1, t * 1.4)).multiplyScalar(1 - 0.18 * Math.max(0, (t - 0.6) / 0.4));
    const leg = (x, z, top, L, n, lp) => ({ x, z, top, L, prof: lp, c: lc, foot: pata(x, z, top - L[0] - L[1], L[2], 0.056, mix(d, 0x2a2420, 0.4), 0x1e1a18, n) });
    const r = quad({ K: 1, M, seg: 40, legSleeve: true, body: { rings, shape: manga([[0.17, 0.42, 0.085, 0.085, 0.1], [0.18, -0.45, 0.075, 0.095, 0.13]]) },
      neck: { pts: neckPts, prof: [0, 1, 2].map(i => ({ rx: [0.2, 0.16, 0.14][i], rt: [0.24, 0.2, 0.16][i], rb: [0.2, 0.17, 0.15][i], c: a => mix(mix(c, pc, i / 2), d, Math.max(0, Math.sin(a) - 0.5) * 2) })) }, head, ears: [[0.1, 0.12, 0], [-0.1, 0.12, 0]], snout: [0, -0.2, 0.3], muzzle,
      legs: [leg(0.17, 0.42, 0.48, [0.21, 0.16, 0.1], 4, lpF), leg(-0.17, 0.42, 0.48, [0.21, 0.16, 0.1], 4, lpF), leg(0.18, -0.45, 0.51, [0.24, 0.17, 0.1], 3, lpH), leg(-0.18, -0.45, 0.51, [0.24, 0.17, 0.1], 3, lpH)] });
    r.graze = grazeOf(neckPts, muzzle); return r; }

  // ---------- tamanduá-bandeira: faixa preta e branca no ombro, focinho comprido de tubo, garras da frente dobradas, rabo de bandeira
  function tamandua() { const c = col(0x8a8076), k = col(0x1e1a18), w = col(0xf0eade);
    const stripe = z => a => mix(c, 0x6a6058, Math.max(0, Math.sin(a)) * 0.35 + Math.max(0, Math.min(1, (0.1 - z) / 0.6)) * 0.35);   // a faixa preta e branca vem do shader (faixa)   // a faixa sobe do peito para trás até o meio das costas
    const rings = [[-0.55, 0.56, 0.08, 0.08, 0.08], [-0.5, 0.56, 0.15, 0.2, 0.17], [-0.3, 0.55, 0.19, 0.26, 0.21], [0, 0.53, 0.2, 0.27, 0.22], [0.25, 0.53, 0.19, 0.25, 0.21], [0.4, 0.55, 0.15, 0.2, 0.16], [0.5, 0.58, 0.1, 0.12, 0.1]].map(([z, y, rx, rt, rb]) => ({ z, y, rx, rt, rb, e: 2.2, c: stripe(z) }));
    const neckPts = [[0, 0.58, 0.44], [0, 0.6, 0.57], [0, 0.6, 0.64]], muzzle = [0, -0.18, 0.4];
    const hcl = mix(c, w, 0.22);   // a cabeça e o focinho são mais claros que o corpo
    const head = H => { H.add(tube([[0, 0, -0.02], [0, -0.02, 0.06], [0, -0.07, 0.18], [0, -0.13, 0.3], [0, -0.18, 0.41]], [0.075, 0.07, 0.05, 0.035, 0.024].map((r, i) => ({ rx: r, rt: r, rb: r, c: i === 4 ? mix(hcl, k, 0.5) : hcl })), 12, true));
      for (const sx of [-1, 1]) { H.add(sph(0.03, 0.035, 0.015, sx * 0.055, 0.06, -0.01, hcl, 8), sx > 0 ? 'earL' : 'earR'); olho(H, sx * 0.05, 0.02, 0.07, 0.01, sx); } };
    // pernas do tamanduá: a da frente muito grossa (o antebraço que cava cupinzeiro), branca, com a pulseira preta logo acima
    // do punho; a mão anda dobrada sobre os nós (as garras enormes viradas para dentro e para trás, sem gastar a ponta);
    // a de trás escura, mais fina, com o pé chato de cinco unhas. As duas nascem de dentro do corpo (manga), sem coluna
    const lpF = [[-0.3, 0.06, 0.06, 0.06], [-0.15, 0.095, 0.1, 0.1], [0, 0.1, 0.105, 0.105], [0.18, 0.092, 0.1, 0.098], [0.32, 0.084, 0.095, 0.088], [0.42, 0.078, 0.085, 0.085], [0.5, 0.076, 0.09, 0.068], [0.62, 0.064, 0.072, 0.058],
      [0.72, 0.054, 0.056, 0.052], [0.8, 0.05, 0.05, 0.05], [0.84, 0.053, 0.053, 0.053]];
    const lpH = [[-0.3, 0.065, 0.065, 0.065], [-0.15, 0.1, 0.1, 0.11], [0, 0.115, 0.115, 0.125], [0.2, 0.1, 0.1, 0.11], [0.35, 0.08, 0.08, 0.088], [0.45, 0.064, 0.064, 0.07], [0.58, 0.054, 0.054, 0.062], [0.72, 0.046, 0.046, 0.05], [0.8, 0.046, 0.046, 0.048], [0.84, 0.05, 0.05, 0.05]];
    const sm = (a0, a1, t) => { const u = Math.max(0, Math.min(1, (t - a0) / (a1 - a0))); return u * u * (3 - 2 * u); }, paw = mix(w, c, 0.35);
    const lw = mix(w, c, 0.18), fcol = (t, a) => { const band = sm(0.54, 0.59, t) * (1 - sm(0.73, 0.77, t)); let q = mix(c, lw, sm(0.08, 0.34, t)); if (t > 0.76) q = mix(lw, paw, sm(0.76, 0.84, t)); return mix(q, k, band).multiplyScalar(0.97 + 0.03 * Math.cos(a)); };
    const hcol = (t) => mix(mix(c, 0x4a423c, 0.55), k, sm(0.3, 0.8, t) * 0.7);
    const fFoot = (x, z) => { const sx = Math.sign(x), ky = col(0x2a2420); return mergeG([tube([[x, 0.1, z], [x, 0.06, z + 0.01]], [{ rx: 0.052, rt: 0.052, rb: 0.052, c: paw }, { rx: 0.056, rt: 0.058, rb: 0.056, c: paw }], 12, false),
      sph(0.062, 0.044, 0.072, x - sx * 0.006, 0.044, z + 0.018, paw, 14), sph(0.03, 0.022, 0.03, x + sx * 0.03, 0.022, z + 0.03, mix(paw, k, 0.3), 10),   // o punho fechado e o calo de fora, onde pisa
      ...[[-0.022, 0.07], [0.012, 0.085], [0.04, 0.06]].map(([dx, L]) => cone(0.013, L, ky, 6).rotateX(-2.5).rotateZ(sx * 0.35).translate(x - sx * 0.01 + dx * sx, 0.034, z + 0.05))]); };   // as garras dobradas para trás
    const hFoot = (x, z) => pata(x, z, 0.09, 0.09, 0.05, mix(c, k, 0.75), 0x141210, 5, 0x2a2420);
    const tp = [[0, 0.6, -0.55], [0, 0.615, -0.66], [0, 0.62, -0.77], [0, 0.615, -0.88], [0, 0.6, -0.98], [0, 0.575, -1.07], [0, 0.54, -1.15], [0, 0.5, -1.21], [0, 0.47, -1.24]];
    const r = quad({ K: 1, M: faixa(0.54), pat: () => 1, seg: 36, legSleeve: true, body: { rings, shape: manga([[0.13, 0.35, 0.07, 0.07, 0.09], [0.13, -0.38, 0.065, 0.08, 0.11]]) },
      neck: { pts: neckPts, prof: [{ rx: 0.13, rt: 0.17, rb: 0.14, c }, { rx: 0.1, rt: 0.12, rb: 0.1, c }, { rx: 0.08, rt: 0.085, rb: 0.08, c: hcl }] }, head, ears: [[0.055, 0.06, -0.01], [-0.055, 0.06, -0.01]], muzzle,
      legs: [{ x: 0.13, z: 0.35, top: 0.45, L: [0.19, 0.165, 0.09], prof: lpF, c: fcol, foot: fFoot(0.13, 0.35) }, { x: -0.13, z: 0.35, top: 0.45, L: [0.19, 0.165, 0.09], prof: lpF, c: fcol, foot: fFoot(-0.13, 0.35) },
        { x: 0.13, z: -0.38, top: 0.46, L: [0.2, 0.17, 0.09], prof: lpH, c: hcol, foot: hFoot(0.13, -0.38) }, { x: -0.13, z: -0.38, top: 0.46, L: [0.2, 0.17, 0.09], prof: lpH, c: hcol, foot: hFoot(-0.13, -0.38) }],
      tail: { pts: tp, prof: tp.map((p, i) => ({ rx: [0.07, 0.065, 0.06, 0.058, 0.055, 0.05, 0.045, 0.035, 0.015][i], rt: [0.12, 0.16, 0.19, 0.21, 0.21, 0.19, 0.15, 0.1, 0.03][i], rb: [0.12, 0.19, 0.24, 0.27, 0.27, 0.24, 0.19, 0.12, 0.03][i], e: 1.6, c: a => mix(0x5a524a, 0x3a342e, Math.max(0, Math.sin(a)) * 0.4) })), n: 4, rest: [0.15, -0.05] } });   // a bandeira: pelo comprido dos dois lados, borda afinando
    { const g = r.mesh.geometry, pa = g.attributes.pat, part = g.userData.part, names = g.userData.partNames, ok = [names.indexOf('corpo'), names.indexOf('pescoco')];
      for (let q = 0; q < pa.count; q++) pa.setX(q, ok.includes(part[q]) ? 1 : 0); pa.needsUpdate = true; }
    r.graze = grazeOf(neckPts, muzzle); return r; }

  // ---------- aves
  const eye = (H, x, y, z, r = 0.012) => { H.add(sph(r, r, r * 0.8, x, y, z, 0x111111, 6)); H.add(sph(r, r, r * 0.8, -x, y, z, 0x111111, 6)); };
  const beak = (len, r, c, down = 0.15) => cone(r, len, c, 8).rotateX(Math.PI / 2 + down).translate(0, -Math.sin(down) * len * 0.5, len * 0.5);
  function garca() { const wh = 0xf6f6f2;
    return ave({ K: 1, M, body: { rx: 0.1, ry: 0.12, rz: 0.25, y: 0.74, c: wh, tilt: 0.04 }, neck: { pts: [[0, 0.8, 0.2], [0, 0.9, 0.27], [0, 1.0, 0.22], [0, 1.08, 0.27]], r: [0.045, 0.034, 0.03, 0.03], c: wh },
      head: H => { H.add(sph(0.035, 0.035, 0.05, 0, 0, 0.02, wh, 10)); H.add(beak(0.14, 0.014, 0xf2c21a, 0.05).translate(0, -0.005, 0.05)); eye(H, 0.025, 0.01, 0.04, 0.008); },
      beakTip: [0, -0.01, 0.2], wing: { c: wh, tip: 0xeeeee8 }, tail: { w: 0.08, len: 0.14, c: wh, up: 0.15 }, legs: { x: 0.05, top: 0.64, L: [0.3, 0.32, 0.08], r: 0.009, c: 0x1e1e1e, th: 0.03, thC: wh } }); }
  function moura() { const gr = 0x8e96a0;
    return ave({ K: 1, M, body: { rx: 0.14, ry: 0.15, rz: 0.32, y: 0.84, c: gr, back: 0x7e8690, belly: 0xd8dce0, tilt: 0.04 }, neck: { pts: [[0, 0.92, 0.25], [0, 1.04, 0.33], [0, 1.18, 0.28], [0, 1.28, 0.34]], r: [0.055, 0.04, 0.036, 0.034], c: 0xe8e8e4 },
      head: H => { H.add(sph(0.04, 0.04, 0.055, 0, 0, 0.02, 0xe8e8e4, 10)); H.add(beak(0.16, 0.016, 0xe0b030, 0.05).translate(0, -0.005, 0.055)); H.add(paintG(new THREE.ConeGeometry(0.015, 0.14, 5).rotateX(-2.0).translate(0, 0.03, -0.07), 0x1a1a1e)); eye(H, 0.03, 0.012, 0.04, 0.009); },
      beakTip: [0, -0.01, 0.23], wing: { c: 0x7e8690, tip: 0x3a3e46 }, tail: { w: 0.1, len: 0.18, c: 0x6e7680, up: 0.2 }, legs: { x: 0.06, top: 0.72, L: [0.34, 0.36, 0.1], r: 0.011, c: 0x2a2a2a, th: 0.035, thC: gr } }); }
  function seriema() { const b = 0xa58e6e;
    return ave({ K: 1, M, body: { rx: 0.13, ry: 0.15, rz: 0.26, y: 0.66, c: b, back: 0x96805e, belly: 0xc8b89a }, neck: { pts: [[0, 0.74, 0.2], [0, 0.84, 0.25], [0, 0.93, 0.3]], r: [0.055, 0.045, 0.04], c: 0xb8a684 },
      head: H => { H.add(sph(0.045, 0.045, 0.055, 0, 0, 0.01, 0xb8a684, 10)); H.add(beak(0.06, 0.018, 0xc8402a, 0.25).translate(0, -0.005, 0.045)); for (let i = 0; i < 5; i++) H.add(paintG(new THREE.ConeGeometry(0.006, 0.09, 4).rotateX(-0.5 - i * 0.1).translate(0, 0.07, 0.03 - i * 0.008), 0x6a5a46));
        H.add(sph(0.016, 0.016, 0.01, 0.033, 0.012, 0.035, 0x2a2a10, 6)); H.add(sph(0.016, 0.016, 0.01, -0.033, 0.012, 0.035, 0x2a2a10, 6)); H.add(sph(0.022, 0.022, 0.006, 0.034, 0.012, 0.03, 0x5a8ab8, 6)); },
      beakTip: [0, -0.02, 0.1], wing: { c: 0x96805e, tip: 0x5a4a38 }, tail: { w: 0.1, len: 0.32, c: 0x7a6a52, up: 0.05 }, legs: { x: 0.055, top: 0.56, L: [0.26, 0.29, 0.07], r: 0.012, c: 0xd0603a, th: 0.035, thC: b } }); }
  function ema() { const g = 0x8c8174;
    return ave({ K: 1, M, body: { rx: 0.24, ry: 0.27, rz: 0.4, y: 1.02, c: g, back: 0x7c7166, belly: 0xb0a698 }, neck: { pts: [[0, 1.12, 0.3], [0, 1.3, 0.38], [0, 1.48, 0.43], [0, 1.62, 0.5]], r: [0.07, 0.055, 0.048, 0.045], c: 0xa59a8c },
      head: H => { H.add(sph(0.055, 0.05, 0.07, 0, 0, 0.02, 0xa59a8c, 10)); H.add(beak(0.08, 0.025, 0x6a625a, 0.1).translate(0, -0.01, 0.07)); eye(H, 0.04, 0.012, 0.05, 0.012); },
      beakTip: [0, -0.02, 0.16], wing: { c: 0x7c7166, tip: 0x9a8f82, long: -0.1 }, legs: { x: 0.1, top: 0.84, L: [0.4, 0.42, 0.12], r: 0.022, c: 0x8a8478, th: 0.06, thC: g } }); }
  function galinha(c) { const cc = col(c);
    return ave({ K: 1, M, body: { rx: 0.11, ry: 0.11, rz: 0.15, y: 0.3, c: cc, back: cc.clone().multiplyScalar(0.9) }, neck: { pts: [[0, 0.36, 0.1], [0, 0.42, 0.13], [0, 0.47, 0.15]], r: [0.05, 0.042, 0.04], c: cc },
      head: H => { H.add(sph(0.04, 0.04, 0.045, 0, 0, 0.01, cc, 10)); H.add(beak(0.03, 0.014, 0xe8b02a, 0.3).translate(0, -0.005, 0.035));
        for (let i = 0; i < 4; i++) H.add(sph(0.012, 0.018, 0.012, 0, 0.045 + Math.sin(i * 0.9) * 0.008, 0.03 - i * 0.017, 0xd8282a, 6)); H.add(sph(0.01, 0.018, 0.008, 0, -0.04, 0.035, 0xd8282a, 6)); eye(H, 0.03, 0.01, 0.02, 0.007); },
      beakTip: [0, -0.02, 0.07], wing: { c: cc.clone().multiplyScalar(0.85), tip: cc.clone().multiplyScalar(0.7) }, tail: { w: 0.07, len: 0.15, c: cc.clone().multiplyScalar(0.7), up: 0.75 }, legs: { x: 0.04, top: 0.22, L: [0.09, 0.1, 0.05], r: 0.008, c: 0xe8b02a, th: 0.03, thC: cc } }); }
  function joao() { const b = 0xb07a4a;
    return ave({ K: 1, M, body: { rx: 0.045, ry: 0.045, rz: 0.075, y: 0.115, c: b, belly: 0xd8b88a }, neck: { pts: [[0, 0.135, 0.05], [0, 0.155, 0.065]], r: [0.03, 0.026], c: 0xa06a40 },
      head: H => { H.add(sph(0.026, 0.026, 0.03, 0, 0, 0.005, 0xa06a40, 8)); H.add(beak(0.022, 0.006, 0x5a4a3a, 0.1).translate(0, 0, 0.025)); eye(H, 0.016, 0.005, 0.015, 0.005); },
      beakTip: [0, -0.003, 0.05], wing: { c: 0x9a6a40, tip: 0x6a4a2a }, tail: { w: 0.025, len: 0.07, c: 0x9a6a40, up: 0.25 }, legs: { x: 0.016, top: 0.085, L: [0.035, 0.04, 0.02], r: 0.003, c: 0x8a6a5a, th: 0.012, thC: b } }); }

  return { vaca, capivara, ovelha, lobo, onca, anta, tamandua, garca, moura, seriema, ema, galinha, joao };
}
