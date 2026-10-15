// Trechos de GLSL que todas as superfícies compartilham: ruído, campo de rajadas do vento e sombra das nuvens.
// O campo de rajadas é o mesmo do jogo 2D (gustAt), em metros: manchas de ~74 m, ~29 m e ~14 m, alongadas no sentido
// do vento e levadas por ele (hipótese de Taylor). A força no capim e nas copas segue o quadrado da velocidade.

export const NOISE = /* glsl */`
float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash21(i),hash21(i+vec2(1,0)),u.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float a=0.5,s=0.0;for(int i=0;i<4;i++){s+=a*vnoise(p);p=p*2.03+vec2(17.1,9.2);a*=0.5;}return s;}
float fbm2(vec2 p){float a=0.5,s=0.0;for(int i=0;i<2;i++){s+=a*vnoise(p);p=p*2.03+vec2(17.1,9.2);a*=0.5;}return s/0.75;}
`;

export const WIND = /* glsl */`
uniform vec2 uWindDir;   // direção para onde o vento sopra (x, z)
uniform vec2 uWadv;      // quanto o ar já andou (m)
uniform float uWindBase; // vento médio (m/s)
uniform float uWindIu;   // intensidade de turbulência
uniform float uTime;
float gustAt(vec2 p){vec2 X=p-uWadv;float xi=dot(X,uWindDir),et=dot(X,vec2(-uWindDir.y,uWindDir.x));float T=uTime;
  return (0.6*sin(xi*0.085+1.3*sin(et*0.045+0.4)+T*0.07)*(0.65+0.35*sin(et*0.105-xi*0.025))
    +0.45*sin(xi*0.215+et*0.08+2.0*sin(et*0.035-T*0.11))+0.3*sin(xi*0.455-et*0.165+1.7+T*0.23))/0.482;}
float windAt(vec2 p){return max(0.0,uWindBase*(1.0+uWindIu*gustAt(p)));}
float windQ(float u){return min(1.4,(u/10.0)*(u/10.0));}
`;

export const CLOUDS = /* glsl */`
uniform vec2 uCloudOff;  // deslocamento das nuvens (m), levado pelo vento lá de cima
uniform float uCloudCov; // cobertura de cúmulos (0..1)
float cloudShadow(vec2 p){if(uCloudCov<0.02)return 1.0;
  float n=fbm2((p+uCloudOff)*0.006)*0.75+fbm2((p+uCloudOff*1.1)*0.017)*0.25;
  float c=smoothstep(1.0-uCloudCov*0.95,1.0-uCloudCov*0.95+0.18,n);return 1.0-0.72*c;}
`;
