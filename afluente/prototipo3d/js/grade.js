// A última demão: a imagem pronta da cena passa por um ajuste de cor no espírito dos jogos pintados (Breath of the Wild),
// sem sair do crível:
//  - vibração: o que está apagado ganha cor, o que já é vivo não estoura;
//  - sombras puxadas para o azul do céu e luz puxada para o amarelo do sol (o "split" da pintura de paisagem);
//  - uma curva de contraste suave, para o volume ler de longe;
//  - um brilho leve em volta do que é muito claro (céu, água ao sol, cal das casas).
// Os números ficam em `uniforms` (window.__grade no console) para afinar a olho.
import * as THREE from 'three';

export function createGrade(renderer) {
  const gl2 = renderer.capabilities.isWebGL2;
  const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: gl2 ? (matchMedia('(pointer:coarse)').matches ? 2 : 4) : 0 });
  const bA = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType }), bB = bA.clone();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)), sc = new THREE.Scene();
  quad.frustumCulled = false; sc.add(quad);
  const V = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}';
  // o que é claro o bastante para brilhar
  const bright = new THREE.ShaderMaterial({ uniforms: { t: { value: null } }, vertexShader: V, depthTest: false, depthWrite: false,
    fragmentShader: 'uniform sampler2D t;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb;float l=dot(c,vec3(0.2126,0.7152,0.0722));gl_FragColor=vec4(c*smoothstep(0.7,1.25,l),1.0);}' });
  // desfoque gaussiano em duas passadas (horizontal e vertical), num quarto da resolução
  const blur = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, d: { value: new THREE.Vector2() } }, vertexShader: V, depthTest: false, depthWrite: false,
    fragmentShader: 'uniform sampler2D t;uniform vec2 d;varying vec2 vUv;void main(){vec3 s=texture2D(t,vUv).rgb*0.227;s+=(texture2D(t,vUv+d*1.385).rgb+texture2D(t,vUv-d*1.385).rgb)*0.316;s+=(texture2D(t,vUv+d*3.231).rgb+texture2D(t,vUv-d*3.231).rgb)*0.070;gl_FragColor=vec4(s,1.0);}' });
  const fin = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false,
    uniforms: { t: { value: null }, tb: { value: null }, uBloom: { value: 0.32 }, uVib: { value: 0.48 }, uSat: { value: 1.07 }, uSplit: { value: 0.1 }, uCon: { value: 0.2 }, uLift: { value: 0.012 } },
    vertexShader: V,
    fragmentShader: `uniform sampler2D t,tb;uniform float uBloom,uVib,uSat,uSplit,uCon,uLift;varying vec2 vUv;
      void main(){vec3 c=texture2D(t,vUv).rgb+texture2D(tb,vUv).rgb*uBloom;
        vec3 s=pow(max(c,0.0),vec3(1.0/2.2));                       // o ajuste é feito no espaço do olho
        float l=dot(s,vec3(0.299,0.587,0.114)),sat=max(s.r,max(s.g,s.b))-min(s.r,min(s.g,s.b));
        s=mix(vec3(l),s,uSat*(1.0+uVib*(1.0-smoothstep(0.0,0.55,sat))));   // vibração: o apagado ganha mais
        s+=(vec3(0.34,0.47,0.82)-0.5)*uSplit*(1.0-l)*(1.0-l)*2.0;          // sombra azulada (a luz do céu)
        s+=(vec3(1.0,0.89,0.66)-0.5)*uSplit*l*l*1.3;                         // luz quente (o sol)
        s=clamp(s,0.0,1.0);s=mix(s,s*s*(3.0-2.0*s),uCon);s=s*(1.0-uLift)+uLift;
        gl_FragColor=vec4(pow(s,vec3(2.2)),1.0);
        #include <colorspace_fragment>
      }` });
  const pass = (m, target) => { quad.material = m; renderer.setRenderTarget(target); renderer.render(sc, cam); };
  function setSize(W, H) { const w = Math.max(2, Math.round(W)), h = Math.max(2, Math.round(H)); rt.setSize(w, h);
    bA.setSize(Math.max(2, w >> 2), Math.max(2, h >> 2)); bB.setSize(bA.width, bA.height); }
  // q: o degrau de qualidade do aparelho (0 cheia, 1 média, 2 leve). No leve, sem brilho (fica só o ajuste de cor)
  function render(scene, camera, q = 0) {
    renderer.setRenderTarget(rt); renderer.render(scene, camera);
    const bloom = q < 2;
    if (bloom) { bright.uniforms.t.value = rt.texture; pass(bright, bA);
      for (let i = 0; i < 2; i++) { blur.uniforms.t.value = bA.texture; blur.uniforms.d.value.set(1 / bA.width, 0); pass(blur, bB);
        blur.uniforms.t.value = bB.texture; blur.uniforms.d.value.set(0, 1 / bA.height); pass(blur, bA); } }
    fin.uniforms.t.value = rt.texture; fin.uniforms.tb.value = bA.texture; const b0 = fin.uniforms.uBloom.value; if (!bloom) fin.uniforms.uBloom.value = 0;
    pass(fin, null); fin.uniforms.uBloom.value = b0;
  }
  return { render, setSize, uniforms: fin.uniforms };
}
