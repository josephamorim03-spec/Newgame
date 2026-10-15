// Materiais e uniformes que todas as superfícies compartilham: vento, nuvens, estação, chuva, sol; a luz em faixas (toon)
// e o brilho de contorno. As paletas dos shaders são escritas em sRGB (como num pincel) e convertidas com toLin.
import * as THREE from 'three';
import { NOISE, WIND, CLOUDS } from './glsl.js';

// ---------- uniformes que todas as superfícies compartilham (vento, nuvens, estação, chuva, sol)
export const U = {
  uTime: { value: 0 }, uWindDir: { value: new THREE.Vector2(1, 0) }, uWadv: { value: new THREE.Vector2() }, uWindBase: { value: 3 }, uWindIu: { value: 0.2 },
  uCloudOff: { value: new THREE.Vector2() }, uCloudCov: { value: 0.3 }, uSeca: { value: 0 }, uWet: { value: 0 }, uRain: { value: 0 }, uWaterDrop: { value: 0 },
  uSunW: { value: new THREE.Vector3(0, 1, 0) }, uSunC: { value: new THREE.Color() }, uRim: { value: new THREE.Color() }, uSkyZen: { value: new THREE.Color() }, uSkyHor: { value: new THREE.Color() },
  uDay: { value: 1 }, uFlowClk: { value: 0 }, uCl: { value: Array.from({ length: 12 }, () => new THREE.Vector4()) },
};
// as paletas dos shaders são escritas em sRGB (como num pincel) e convertidas para a luz linear com toLin
export const HEAD = NOISE + WIND + CLOUDS + 'uniform float uSeca,uWet,uRain,uWaterDrop,uDay,uFlowClk;uniform vec3 uSunW,uSunC,uRim,uSkyZen,uSkyHor;vec3 toLin(vec3 c){return pow(max(c,0.0),vec3(2.2));}\n';
// sombra das nuvens só na luz direta do sol; brilho de contorno (rim) contra o céu, como nos jogos pintados
export const LIGHT_END = (rim) => '#include <lights_fragment_end>\n{float cs=cloudShadow(vWp.xz);reflectedLight.directDiffuse*=cs;}' +
  (rim ? `\n{vec3 vv=normalize(vViewPosition);float r=pow(1.0-abs(dot(normal,vv)),${rim});totalEmissiveRadiance+=uRim*r*diffuseColor.rgb*1.6;}` : '');
export function shared(sh) { Object.assign(sh.uniforms, U); }
// luz em faixas suaves: o lado do sol, uma passagem curta e o lado da sombra (que a luz do céu deixa azulado)
export const ramp = (() => { const v = [0.30, 0.31, 0.34, 0.62, 0.92, 1, 1, 1], d = new Uint8Array(v.length * 4); v.forEach((x, i) => d.set([x * 255, x * 255, x * 255, 255], i * 4));
  const t = new THREE.DataTexture(d, v.length, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.LinearFilter; t.needsUpdate = true; return t; })();
export const toon = (o = {}) => new THREE.MeshToonMaterial({ gradientMap: ramp, ...o });

