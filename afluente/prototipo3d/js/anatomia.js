// O motor de anatomia da gente do vale. Três partes:
//
// 1. PERFIL (perfil): de cada ficha (sexo, idade, altura, ofício) sai um corpo medido como gente de verdade. O peso vem do
//    IMC (a maioria no peso normal; sobrepeso é a exceção e ninguém passa de 29,4: sem obesos) e vira gordura corporal pela
//    fórmula de Deurenberg (1991). A gordura vai para onde vai no corpo de cada sexo: no homem, barriga e flancos (androide),
//    e só o homem tem barriga saliente, mais comum e maior depois dos 40; na mulher, quadril, nádega, coxa, braço e busto
//    (ginoide), sem barriga. O ofício dá músculo (quem capina e racha lenha tem ombro, braço e antebraço), a idade tira
//    músculo e curva as costas (cifose) com a cabeça indo para a frente. A ossatura (largura de ombro, bacia, cabeça,
//    mandíbula) segue as medidas médias de cada sexo e da criança.
//
// 2. ARTICULAÇÕES (criarRig): as rotinas (people.js) pedem ângulos; o solucionador transforma o pedido no que o corpo
//    consegue fazer, com os limites de amplitude de movimento normais (tabela ROM, fontes abaixo):
//    - coluna: a flexão se divide entre lombar e torácica e, passando de ~25°, a bacia gira no quadril (ritmo lombopélvico);
//    - quadril (coxofemoral): flexão até 120° com o joelho dobrado, mas só ~80° com o joelho esticado (isquiotibiais): se o
//      pedido passa disso, o joelho dobra; extensão até 30°; agachado fundo, as coxas abrem (abdução) para caber o tronco;
//    - ombro (complexo do ombro): o úmero tem um cone de alcance (não atravessa o tronco por dentro, não vai além de 60° para
//      trás) e uma rotação própria limitada (manguito rotador: externa até 90°, interna até 70°, menos com o braço erguido;
//      acima de 90° de abdução o úmero roda para fora). Passando de 30° de elevação, a escápula e a clavícula acompanham na
//      razão de 1 para 2 (ritmo escápulo-umeral de Inman): o ombro sobe e vai para a frente quando o braço vai à frente;
//    - cotovelo: flexão até 145°, sem dobrar para trás (só um tico na mulher), com o ângulo de carregamento (o antebraço abre
//      para fora com o braço esticado, mais na mulher); antebraço com pronação e supinação; punho com desvio radial e ulnar;
//    - pescoço: a flexão e a rotação se dividem entre a coluna cervical e a junta da cabeça (C1–C2 faz metade da rotação);
//    - joelho até 140–150°, tornozelo de 35° para cima a 70° para baixo com o peso do corpo;
//    - mãos: cada dedo com três falanges (polegar com três juntas), em poses de descanso (cascata), segurar cabo, mão aberta,
//      mãos postas; quem segura ferramenta vira o punho e o antebraço para o cabo atravessar o punho fechado.
//    E o contato com o chão: em pé os pés pisam no chão (no morro, um joelho dobra e o quadril desce), ajoelhado o joelho
//    encosta, e na passada o pé de apoio não escorrega.
//
// 3. PASSADA (passada): a marcha humana pelos números da biomecânica: passo ~0,41 da altura a 1,2 m/s, cadência ~105 por
//    minuto, apoio em 62% do ciclo, contato pelo calcanhar, pé que rola até a ponta, joelho que dobra ~15° ao receber o peso
//    e ~60° no balanço, bacia que gira e cai do lado do balanço, braço que balança com a perna do outro lado; na corrida,
//    apoio de ~35%, fase de voo, calcanhar que sobe atrás. Os ângulos saem de cinemática inversa no comprimento da perna de
//    cada um, então o pé de apoio fica parado no chão enquanto o corpo passa por cima.
//
// Fontes: AAOS (American Academy of Orthopaedic Surgeons), Joint Motion: Method of Measuring and Recording, 1965/1994;
// Norkin & White, Measurement of Joint Motion, 2016; Soucie et al., Haemophilia 2011 (amplitudes normais por idade e sexo);
// Inman, Saunders & Abbott 1944 (ritmo escápulo-umeral); Perry & Burnfield, Gait Analysis, 2010 (marcha); Drillis &
// Contini 1966 (proporções do corpo pela altura); Deurenberg, Weststrate & Seidell 1991 (gordura pelo IMC); OMS (faixas
// de IMC); Paraskevas et al. 2004 (ângulo de carregamento do cotovelo).
import * as THREE from 'three';

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const sm01 = v => { v = cl(v, 0, 1); return v * v * (3 - 2 * v); };
const lerp = (a, b, t) => a + (b - a) * t;
const D = Math.PI / 180;
// interpolação linear numa tabela [[x, y], ...] (x crescente)
const tab = (T, x) => { if (x <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (x <= T[i][0]) { const [x0, y0] = T[i - 1], [x1, y1] = T[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return T[T.length - 1][1]; };

// ---------- amplitudes normais (graus)
export const ROM = {
  lombar: { flexao: 55, extensao: 25, lateral: 25, rotacao: 8 },
  toracica: { flexao: 35, extensao: 10, lateral: 15, rotacao: 37 },
  cervical: { flexao: 50, extensao: 60, lateral: 45, rotacao: 80 },
  ombro: { flexao: 180, extensao: 60, abducao: 180, aducaoHorizontal: 135, abducaoHorizontal: 45, rotInterna: 70, rotExterna: 90, escapula: 60 },
  cotovelo: { flexao: 145, hiperextensao: { m: 3, f: 8, c: 8 }, carregamento: { m: 11, f: 14, c: 12 } },
  antebraco: { pronacao: 80, supinacao: 85 },
  punho: { flexao: 75, extensao: 70, radial: 20, ulnar: 35 },
  dedos: { mcf: 90, mcfHiper: 20, ifp: 105, ifd: 80, abducao: 20 },
  polegar: { cmcAbducao: 70, mcf: 55, if: 80 },
  quadril: { flexao: 120, flexaoJoelhoEsticado: 83, extensao: 30, abducao: 45, aducao: 30, rotInterna: 40, rotExterna: 45 },
  joelho: { flexao: 140, flexaoComPeso: 150, hiperextensao: { m: 3, f: 6, c: 6 } },
  tornozelo: { dorsiflexao: 20, plantiflexao: 50, dorsiflexaoComPeso: 35, plantiflexaoComPeso: 70 },
};

// ---------- marcos do corpo em pé (metros, num corpo construído com 1,70 m; a escala dá a altura de cada um)
// sola, tornozelo, joelho, virilha, quadril (junta), crista ilíaca, cintura, peito, ombro (junta), base do pescoço, queixo
export const MARCOS = ['sola', 'tornozelo', 'joelho', 'virilha', 'quadril', 'crista', 'cintura', 'peito', 'ombro', 'pescoco', 'queixo'];
const REF = {
  m: [0, 0.065, 0.485, 0.80, 0.90, 1.01, 1.055, 1.235, 1.405, 1.445, 1.47],
  f: [0, 0.064, 0.478, 0.79, 0.885, 1.0, 1.06, 1.225, 1.395, 1.44, 1.468],
  c: [0, 0.062, 0.473, 0.765, 0.864, 0.963, 1.01, 1.176, 1.343, 1.39, 1.415],   // ~7 anos: cabeça 1/6 da altura, perna ~0,5
};
// liga duas listas de marcos: devolve y → y (linear por trechos, reto além das pontas)
export function ponte(de, para) { return y => { const n = de.length;
  let i = 1; while (i < n - 1 && y > de[i]) i++; const t = (y - de[i - 1]) / (de[i] - de[i - 1]); return para[i - 1] + (para[i] - para[i - 1]) * t; }; }

const TRAB = { enxada: 1, machado: 1, serrote: 0.85, pa: 0.65, vassoura: 0.5, balaio: 0.6, lata: 0.7, vara: 0.4, pano: 0.55 };

// ---------- o perfil de cada um
export function perfil(s, rnd = Math.random) {
  const kid = s.sex === 'c', f = s.sex === 'f', old = !!s.old, m = !kid && !f;
  const menina = kid && (!!s.dress || ['tranca', 'chiquinha', 'longo'].includes(s.hair));
  const idade = s.idade ?? (kid ? 5 + 7 * cl(((s.h || 1.2) - 1.0) / 0.4, 0, 1) : old ? 62 + rnd() * 18 : 19 + rnd() * 36);
  // peso: IMC. Adultos: a maioria entre 19,5 e 25; sobrepeso (25–29,4) é exceção, um pouco mais comum nos velhos;
  // obesidade (30 ou mais) não existe no vale. Criança: a faixa do peso normal para 5–12 anos.
  let imc = s.imc;
  if (imc == null) {
    if (kid) imc = 14.6 + rnd() * 3.2;
    else { const acima = f ? (old ? 0.14 : 0.07) : (old ? 0.3 : 0.13);
      imc = rnd() < acima ? 25 + rnd() * (f ? 2.6 : 4.4) : (f ? 19.4 : 20.4) + rnd() * (f ? 5.4 : 4.5); } }
  imc = cl(imc, kid ? 13.5 : 18.2, kid ? 19 : 29.4);
  // gordura corporal (%), Deurenberg: adulto 1,20·IMC + 0,23·idade − 10,8·(homem) − 5,4; criança 1,51·IMC − 0,70·idade − 3,6·(menino) + 1,4
  const gord = kid ? 1.51 * imc - 0.70 * idade - 3.6 * (menina ? 0 : 1) + 1.4 : 1.20 * imc + 0.23 * idade - 10.8 * (m ? 1 : 0) - 5.4;
  const F = cl((gord - (kid ? 14 : f ? 29 : 18)) / 8, -0.8, 1.8);   // gordura acima (+) ou abaixo (−) do típico do sexo, em "camadas"
  // barriga saliente (gordura visceral): só no homem; cresce com o IMC e com a idade (androide)
  const barriga = m ? cl(sm01((imc - 23.2) / 5.5) * (0.55 + 0.45 * sm01((idade - 32) / 30)) + (old ? (0.06 + 0.14 * rnd()) * sm01((imc - 20.5) / 3) : 0), 0, 1) : 0;
  // músculo: o ofício pesado dá ombro, braço, antebraço e costas; a velhice tira (sarcopenia)
  const trab = s.trabalho ?? TRAB[s.tool] ?? 0.55;
  const M = cl((kid ? 0.25 : f ? 0.32 + 0.25 * trab : 0.42 + 0.45 * trab) - (old ? 0.2 : 0) + (rnd() - 0.5) * 0.15, 0.05, 1);
  // ossatura: varia pouco (±3%); o "porte" da ficha antiga (0,92–1,17) vira ossatura
  const fr = s.build ? cl(0.97 + (s.build - 1.05) * 0.25, 0.95, 1.05) : 0.97 + rnd() * 0.06;
  const cifose = old ? 0.1 + rnd() * (f ? 0.2 : 0.16) : kid ? 0 : rnd() * 0.04;   // curva das costas (rad)
  const lordose = kid ? 0.07 : f ? 0.05 + rnd() * 0.03 : 0.02 + barriga * 0.07;    // bacia para a frente, lombar arqueada
  const sk = kid ? 'c' : f ? 'f' : 'm';
  // marcos: os do sexo (ou da criança) com um tico de variação no comprimento da perna (±1,2%)
  const pl = 1 + (rnd() - 0.5) * 0.024, R = REF[sk], L = R.map((y, i) => i <= 4 ? y * pl : y + (R[4] * pl - R[4]) * (1 - (i - 4) / 7));
  const sexo = kid ? 'c' : f ? 'f' : 'm';
  // medidas lineares (metros, corpo de 1,70)
  const med = {
    ombroX: (kid ? 0.148 : f ? 0.158 : 0.176) * fr,            // meia distância entre as juntas dos ombros
    quadrilX: (kid ? 0.074 : f ? 0.093 : 0.085) * fr,          // meia distância entre as cabeças do fêmur
    joelhoX: kid ? 0.066 : f ? 0.068 : 0.075, tornX: kid ? 0.064 : f ? 0.066 : 0.073,
    braco: kid ? 0.25 : f ? 0.275 : 0.29, antebraco: kid ? 0.222 : f ? 0.24 : 0.255, mao: (kid ? 0.165 : f ? 0.176 : 0.19) * (0.97 + rnd() * 0.06),
    pe: kid ? 0.235 : f ? 0.24 : 0.262,
    pescoco: (kid ? 0.047 : f ? 0.051 : 0.059) + Math.max(0, F) * 0.004 + (m ? M * 0.006 : 0),
  };
  // o rosto de cada um (proporções do crânio por sexo, com variação pessoal)
  const v = () => 1 + (rnd() - 0.5) * 0.08;
  const cranio = {
    rx: (kid ? 0.076 : f ? 0.0745 : 0.0775) * (1 + (rnd() - 0.5) * 0.05), ry: (kid ? 0.092 : f ? 0.087 : 0.09), rz: (kid ? 0.094 : f ? 0.093 : 0.098) * (1 + (rnd() - 0.5) * 0.04),
    face: kid ? 0.84 : 1,                                       // na criança o rosto é pequeno perto do crânio
    arco: kid ? 0 : f ? 0.0025 : 0.008 * v(),                   // arco da sobrancelha (supraorbital)
    testa: kid ? 0.9 : f ? 0.75 : 0.35,                         // testa reta (1) ou inclinada (0)
    zig: (kid ? 0.056 : f ? 0.06 : 0.064) * v(),                // maçã do rosto (meia largura bizigomática)
    gonio: (kid ? 0.04 : f ? 0.046 : 0.0515) * v(),             // ângulo da mandíbula (meia largura bigoníaca)
    gonY: kid ? 0.05 : f ? 0.046 : 0.038,                        // altura do ângulo da mandíbula (mais baixo e marcado no homem)
    queixo: (kid ? 0.013 : f ? 0.0145 : 0.021) * v(),           // meia largura do queixo (quadrado no homem, fino na mulher)
    queixoZ: (kid ? 0.066 : f ? 0.072 : 0.076) * (1 + (rnd() - 0.5) * 0.05),
    nariz: (kid ? 0.8 : f ? 0.9 : 1.04) * v(), boca: (f ? 0.94 : 1) * v(), olho: kid ? 1.12 : 1,
    bochecha: (kid ? 0.007 : 0.003) + Math.max(0, F) * 0.0035 + (old ? 0.001 : 0), papada: Math.max(0, F - 0.3) * 0.006 + (old ? 0.003 : 0) + (m ? barriga * 0.004 : 0),
    pomo: m ? 0.0055 : 0,                                       // pomo de adão
  };
  // as tabelas de forma do tronco são escritas nos marcos do homem (e da mulher); a criança usa a do homem
  const tk = f ? 'f' : 'm';
  return { sexo, kid, f, m, old, menina, idade, imc, gord, F, barriga, M, fr, cifose, lordose, L, ref: REF[sk], med, cranio, tk,
    deTab: ponte(REF[tk], L), paraTab: ponte(L, REF[tk]) };
}
export { REF as MARCOS_REF };

// ---------- o solucionador
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
const DOWN = new THREE.Vector3(0, -1, 0), YAX = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4(), _mi = new THREE.Matrix4();

// cone do úmero no tórax: para cada elevação φ (0 = braço caído), o plano ψ permitido vai de psiLo (por dentro, na frente
// do corpo) a psiHi (para trás, passando pelo lado de fora). ψ: 0 frente, +π/2 lado de fora, ±π atrás.
const PSI_LO = [[0, -3.3], [0.35, -3.3], [0.6, -0.35], [1.05, -0.55], [1.57, -0.8], [2.1, -1.25], [2.6, -1.95], [3.0, -3.3], [3.2, -3.3]];
const PSI_HI = [[0, 3.8], [0.35, 3.8], [0.6, 3.5], [1.05, 3.14], [1.57, 2.36], [2.1, 2.05], [2.6, 1.95], [3.0, 3.3], [3.2, 3.8]];
function limitaUmero(d, sx) {   // d: direção do úmero (unitária) no tórax; ajusta no lugar; true se mudou
  const phi = Math.acos(cl(-d.y, -1, 1)); if (phi < 0.36 || phi > 2.98) return false;
  const lo = tab(PSI_LO, phi), hi = tab(PSI_HI, phi), psi = Math.atan2(sx * d.x, d.z), pu = psi < lo ? psi + Math.PI * 2 : psi;
  if (pu <= hi) return false;
  const dHi = pu - hi, dLo = lo + Math.PI * 2 - pu, np = dHi < dLo ? hi : lo, s = Math.sin(phi);
  d.set(sx * s * Math.sin(np), -Math.cos(phi), s * Math.cos(np)); return true;
}
// rotação de um quatérnio em torno de um eixo (separação balanço–torção)
function torcao(q, axis) { const p = q.x * axis.x + q.y * axis.y + q.z * axis.z; return 2 * Math.atan2(p, q.w); }

// posições dos pontos de contato no osso do pé (tornozelo na origem)
const PE = { calc: [0, -0.06, -0.05], bola: [0, -0.06, 0.1], ponta: [0, -0.052, 0.15] };

// poses da mão: ângulos (graus) por dedo [indicador, médio, anelar, mínimo] e polegar
const MAO = {
  solta: { mcf: [20, 25, 31, 38], ifp: [24, 30, 36, 42], ifd: [10, 13, 16, 18], ab: [4, 0, -3, -7], pol: [20, 8, 12, 14] },
  segura: { mcf: [58, 63, 68, 72], ifp: [86, 90, 93, 96], ifd: [46, 50, 52, 55], ab: [2, 0, -2, -4], pol: [42, 52, 32, 26] },
  punho: { mcf: [86, 88, 90, 90], ifp: [100, 102, 102, 100], ifd: [62, 64, 64, 62], ab: [0, 0, 0, 0], pol: [30, 60, 40, 35] },
  aberta: { mcf: [-6, -3, -4, -8], ifp: [5, 4, 5, 6], ifd: [3, 3, 3, 4], ab: [14, 2, -9, -19], pol: [52, 0, 2, -4] },
  postas: { mcf: [2, 2, 3, 5], ifp: [3, 3, 4, 5], ifd: [2, 2, 2, 3], ab: [2, 0, -2, -3], pol: [10, 0, 6, 2] },
  apoio: { mcf: [8, 8, 10, 12], ifp: [12, 12, 14, 16], ifd: [6, 6, 8, 8], ab: [6, 0, -4, -9], pol: [34, 4, 8, 6] },
};
const HAND_KEYS = Object.keys(MAO);

// body: o que buildBody devolve; P: o perfil
export function criarRig(body, P) {
  const { hips, spine, chest, neck, head, arms, legs } = body;
  const N = 3 + 3 * 3 + 2 * (6 + 9);
  const buf = new Float64Array(N); let saved = false;
  const eachInt = (f) => { let i = 0; const r3 = o => { f(i++, o, 'x'); f(i++, o, 'y'); f(i++, o, 'z'); };
    r3(hips.position); r3(hips.rotation); r3(spine.rotation); r3(head.rotation);
    for (const a of arms) { r3(a.sh.rotation); r3(a.el.rotation); }
    for (const l of legs) { r3(l.hp.rotation); r3(l.kn.rotation); r3(l.ft.rotation); } };
  const restY = hips.position.y;   // altura do osso do quadril em pé
  const L1 = legs.map(l => l.kn.position.length()), L2 = legs.map(l => l.ft.position.length());
  // ângulo de repouso entre coxa e perna (Q): no joelho reto a perna não é colinear com a coxa
  const a0 = legs.map((l, i) => Math.PI - l.kn.position.clone().normalize().angleTo(l.ft.position.clone().normalize()));
  const hand = arms.map(() => { const st = {}; for (const k of HAND_KEYS) st[k] = k === 'solta' ? 1 : 0; return { w: st, want: 'solta' }; });
  const carry = ROM.cotovelo.carregamento[P.sexo] * D, hyperEl = ROM.cotovelo.hiperextensao[P.sexo] * D, hyperKn = ROM.joelho.hiperextensao[P.sexo] * D;
  const T = { modo: 'pe', ombro: [0, 0], phi: [0, 0], dy: 0 };

  function save() { eachInt((i, o, k) => { buf[i] = o[k]; }); saved = true; }
  function restore() { if (!saved) return; eachInt((i, o, k) => { o[k] = buf[i]; }); saved = false; }

  // ---------- parte leve (todo quadro, para quem aparece): coluna, pescoço, quadril, joelho, tornozelo, ombro, cotovelo
  function leve() {
    // coluna: lombar + torácica + bacia (ritmo lombopélvico); a postura de cada um soma por cima
    const fx = cl(spine.rotation.x, -0.75, 1.75), ry = cl(spine.rotation.y, -0.8, 0.8), rz = cl(spine.rotation.z, -0.6, 0.6);
    let spf = fx, tilt = 0; if (fx > 0.45) { spf = 0.45 + (fx - 0.45) * 0.45; tilt = fx - spf; } spf = Math.min(spf, 1.48);
    const lor = P.lordose;
    spine.rotation.set((fx < 0 ? 0.7 : 0.6) * spf - lor, 0.15 * ry, 0.55 * rz);
    chest.rotation.set((fx < 0 ? 0.3 : 0.4) * spf + P.cifose, 0.85 * ry, 0.45 * rz);
    hips.rotation.x += tilt + lor;
    // pescoço e cabeça (a cabeça compensa a cifose para o olhar ficar no horizonte)
    const hx = cl(head.rotation.x, -1.05, 0.87), hy = cl(head.rotation.y, -1.4, 1.4), hz = cl(head.rotation.z, -0.78, 0.78), cf = P.cifose;
    neck.rotation.set(0.55 * hx + cf * 0.6, 0.45 * hy, 0.7 * hz); head.rotation.set(0.45 * hx - cf * 1.6, 0.55 * hy, 0.3 * hz);
    // pernas: a bacia que cai de um lado ou gira não arrasta os pés (o fêmur compensa com adução/abdução e rotação)
    _e.set(hips.rotation.x, hips.rotation.y, hips.rotation.z, 'XYZ'); const qComp = new THREE.Quaternion().setFromEuler(_e).invert().multiply(_q3.setFromAxisAngle(_v3.set(1, 0, 0), hips.rotation.x));
    legs.forEach((l, i) => { const sx = i ? 1 : -1; let th = -(l.hp.rotation.x - tilt - lor), kn = l.kn.rotation.x;
      // isquiotibiais: com o joelho esticado o quadril não flexiona além de ~83°; se o pedido passa, o joelho dobra
      const mx = k => 1.45 + 0.65 * sm01(k / 1.1);
      if (th > mx(kn)) { if (th >= 2.1) kn = Math.max(kn, 1.1); else { let a = 0, b = 1.1; for (let it = 0; it < 8; it++) { const c = (a + b) / 2; if (mx(c) < th) a = c; else b = c; } kn = Math.max(kn, b); } }
      th = cl(th, -0.52, 2.1); kn = cl(kn, -hyperKn, 2.62);
      const abd = cl(sx * l.hp.rotation.z + 0.32 * sm01((th - 1.25) / 0.7), -0.35, 0.75);   // agachado fundo, os joelhos abrem
      l.hp.rotation.set(-th, l.hp.rotation.y, sx * abd); l.hp.quaternion.premultiply(qComp); l.kn.rotation.set(kn, 0, 0); l.ft.rotation.x = cl(l.ft.rotation.x, -0.62, 1.22); });
    // ombros: cone do úmero, rotação do manguito, escápula e clavícula
    arms.forEach((a, i) => { const sx = i ? 1 : -1;
      _e.set(a.sh.rotation.x, a.sh.rotation.y, a.sh.rotation.z, 'XYZ'); _q.setFromEuler(_e);
      _v.copy(DOWN).applyQuaternion(_q); _v2.copy(_v);
      if (limitaUmero(_v2, sx)) { _q2.setFromUnitVectors(_v, _v2); _q.premultiply(_q2); }
      const phi = Math.acos(cl(-_v2.y, -1, 1)); T.phi[i] = phi;
      // torção (rotação do úmero): externa = −sx·τ em torno do eixo −y
      _q2.setFromUnitVectors(DOWN, _v2); _q3.copy(_q2).invert().multiply(_q);   // torção = balanço⁻¹·q
      const tau = torcao(_q3, DOWN); let er = -sx * tau;
      const lateral = sm01((Math.atan2(sx * _v2.x, _v2.z) - 0.6) / 0.6) * sm01((phi - 1.6) / 0.6);
      er = cl(er, Math.max(-1.22 + 0.45 * sm01((phi - 1.2) / 1.6), 0.5 * lateral * (phi - 1.6)), 1.57);
      _q3.setFromAxisAngle(DOWN, -sx * er); _q.copy(_q2).multiply(_q3);
      // escápula/clavícula: depois de ~30° de elevação acompanham 1 para 2 (até 60° no braço todo erguido)
      const sig = 0.38 * Math.max(0, phi - 0.5), el = sig * 0.42, fw = Math.max(0, _v2.z) * Math.sin(phi), bk = Math.max(0, -_v2.z);
      const pro = 0.3 * fw - 0.18 * bk;
      a.clav.rotation.set(0, -sx * pro, sx * el); _q2.setFromEuler(a.clav.rotation); a.sh.quaternion.copy(_q2.invert().multiply(_q));
      T.ombro[i] = phi;
      // cotovelo: flexão até 145°, sem dobrar para trás; carregamento (valgo) com o braço esticado
      const ex = cl(a.el.rotation.x, -2.53, hyperEl); a.el.rotation.set(ex, 0, sx * carry * (1 - sm01(-ex / 1.5)));
    });
  }

  // ---------- chão: em pé os pés pisam (no morro, a perna de cima dobra), ajoelhado o joelho encosta
  const _a = new THREE.Vector3(), _w = new THREE.Vector3(), _hl = new THREE.Vector3(), _tg = new THREE.Vector3();
  function contato(ctx) { const { g, heightAt, livre } = ctx; if (livre) { T.modo = 'livre'; return; }
    const th = legs.map(l => -l.hp.rotation.x), kn = legs.map(l => l.kn.rotation.x), py = hips.position.y;
    let modo = 'pe';
    if (Math.min(th[0], th[1]) > 1.2 && py < 0.8 * restY) modo = Math.min(kn[0], kn[1]) > 1.75 ? 'pe' : 'sentado';
    else if (Math.min(kn[0], kn[1]) > 1.1 && Math.max(th[0], th[1]) < 0.8) modo = 'ajoelhado';
    T.modo = modo; if (modo === 'sentado') return;
    const sc = g.scale.x; g.updateMatrixWorld(true);
    const pts = []; // [perna, ponto do mundo, chão]
    const add = (i, bone, p) => { const w = new THREE.Vector3(...p); bone.localToWorld(w); pts.push([i, w, heightAt(w.x, w.z)]); };
    legs.forEach((l, i) => { if (modo === 'ajoelhado') { add(i, l.kn, [0, -0.045, 0.05]); add(i, l.ft, PE.ponta); } else { add(i, l.ft, PE.calc); add(i, l.ft, PE.bola); add(i, l.ft, PE.ponta); } });
    let lo = Infinity; for (const [, w, gy] of pts) lo = Math.min(lo, w.y - gy);
    if (!isFinite(lo) || Math.abs(lo) > 0.6 * sc) return;
    // pés que estão no chão (no corpo plano): os outros (balanço da passada, chute) não contam
    const e = [Infinity, Infinity]; for (const [i, w, gy] of pts) e[i] = Math.min(e[i], w.y - gy - lo);
    hips.position.y -= lo / sc;
    if (modo !== 'pe' || ctx.andando) return;   // andando, a passada já põe o pé no chão (e o pé rola: não se nivela)
    const plant = e.map(x => x < 0.06 * sc), em = Math.max(plant[0] ? e[0] : 0, plant[1] ? e[1] : 0);
    if (em > 0.004 * sc && em < 0.3 * sc && plant[0] && plant[1]) {   // morro: desce o quadril até o pé de baixo pisar; a perna de cima dobra
      hips.position.y -= em / sc; g.updateMatrixWorld(true);
      legs.forEach((l, i) => { const up = em - e[i]; if (up < 0.002 * sc) return; l.ft.getWorldPosition(_tg); _tg.y += up; ik(i, _tg); });
    }
    // o pé acompanha o chão (ponta e calcanhar na mesma altura do chão), dentro do tornozelo
    g.updateMatrixWorld(true);
    legs.forEach((l, i) => { if (!plant[i]) return; const h = new THREE.Vector3(...PE.calc), t = new THREE.Vector3(...PE.ponta); l.ft.localToWorld(h); l.ft.localToWorld(t);
      const dh = h.y - heightAt(h.x, h.z), dt = t.y - heightAt(t.x, t.z), len = h.distanceTo(t) || 0.2;
      l.ft.rotation.x = cl(l.ft.rotation.x + Math.atan2(dt - dh, len) * 0.9, -0.62, 1.22); });
  }
  // duas juntas (quadril e joelho) até o tornozelo chegar no alvo (mundo); o joelho fica no plano da perna
  function ik(i, tgtW) { const l = legs[i]; hips.updateMatrixWorld(true);
    _mi.copy(hips.matrixWorld).invert(); _tg.copy(tgtW).applyMatrix4(_mi); _hl.copy(l.hp.position);
    const d = cl(_tg.distanceTo(_hl), 0.05, (L1[i] + L2[i]) * 0.999), al = Math.acos(cl((L1[i] ** 2 + L2[i] ** 2 - d * d) / (2 * L1[i] * L2[i]), -1, 1));
    l.kn.rotation.x = cl(a0[i] - al, -hyperKn, 2.62);   // flexão = ângulo interno de repouso − ângulo interno pedido
    l.hp.updateMatrixWorld(true); l.ft.getWorldPosition(_a).applyMatrix4(_mi);
    _v.subVectors(_a, _hl).normalize(); _v2.subVectors(_tg, _hl).normalize(); _q.setFromUnitVectors(_v, _v2); l.hp.quaternion.premultiply(_q); }

  // ---------- mãos: punho e antebraço (pronação) e os dedos
  function maos(ctx) {
    arms.forEach((a, i) => { const sx = i ? 1 : -1, H = hand[i], want = (ctx.maos && ctx.maos[i]) || 'solta';
      H.want = want; const k = Math.min(1, ctx.dt * 9); for (const n of HAND_KEYS) H.w[n] += ((n === want ? 1 : 0) - H.w[n]) * k;
      // antebraço e punho: sem cabo, pronação que acompanha o braço à frente (palma para baixo ao alcançar)
      if (!(ctx.eixo && ctx.eixo[i])) { const flex = -a.el.rotation.x, pr = 0.22 + 0.85 * sm01((flex - 0.6) / 1.0) * sm01((T.phi[i] - 0.2) / 0.6) + (want === 'postas' ? -0.6 : 0);
        a.tw.rotation.set(0, -sx * pr * 0.5, 0); a.ha.rotation.set(0, -sx * pr * 0.5, sx * (want === 'aberta' ? 0.25 : want === 'segura' ? 0.2 : -0.08)); }
      // dedos
      const W = H.w, ang = (key, j) => { let s = 0; for (const n of HAND_KEYS) if (W[n] > 1e-3) s += W[n] * MAO[n][key][j]; return s * D; };
      a.dedos.forEach((f, j) => { f[0].rotation.set(-ang('ab', j), 0, -sx * ang('mcf', j)); f[1].rotation.set(0, 0, -sx * ang('ifp', j)); f[2].rotation.set(0, 0, -sx * ang('ifd', j)); });
      const pol = [0, 1, 2, 3].map(j => ang('pol', j));   // abdução, oposição, MCF, IF
      const P0 = a.polegar; P0[0].quaternion.setFromAxisAngle(P0.abdAx, pol[0] - 0.35).multiply(_q.setFromAxisAngle(P0.opAx, pol[1]));
      P0[1].quaternion.setFromAxisAngle(P0.flexAx, pol[2]); P0[2].quaternion.setFromAxisAngle(P0.flexAx, pol[3]); });
  }
  // a mão que segura cabo vira para o cabo atravessar o punho fechado (eixo no mundo)
  function alinhaMao(i, eixoW) { const a = arms[i], sx = i ? 1 : -1;
    a.el.updateWorldMatrix(true, false); a.el.getWorldQuaternion(_q).invert(); _v.copy(eixoW).applyQuaternion(_q);
    if (_v.z < 0) _v.negate(); let ry = Math.atan2(_v.x, _v.z);
    const pron = cl(-sx * ry, -1.48, 1.4); ry = -sx * pron;
    const dv = cl(Math.atan2(-_v.y, Math.hypot(_v.x, _v.z)), -0.35, 0.6);
    a.tw.rotation.set(0, ry * 0.5, 0); a.ha.rotation.set(dv, ry * 0.5, sx * 0.22); }

  return {
    get modo() { return T.modo; }, restY, L1, L2, hand,
    restore,
    // ctx: { dt, perto (detalhe), g, heightAt, livre, maos: ['segura', null], eixo }
    // contato: em quem está perto, todo quadro; mais longe, de tanto em tanto (e o ajuste de altura achado vale no meio)
    solve(ctx) { save(); leve();
      if (ctx.contato) { const y0 = hips.position.y; contato(ctx); T.dy = T.modo === 'sentado' || T.modo === 'livre' ? 0 : hips.position.y - y0; }
      else if (T.dy && T.modo !== 'sentado' && T.modo !== 'livre') hips.position.y += T.dy;
      if (ctx.perto) maos(ctx); },
    alinhaMao, maos,
  };
}

// ---------- a passada: ângulos da marcha (ou da corrida) para a fase ph (um passo = π), na velocidade v (m/s no mundo)
// rig: criarRig; esc: escala (altura/1,70); P: perfil. Devolve a pose (mesmas chaves das rotinas) e o comprimento do passo.
const _PE_H = 0.062;
export function comprimentoPasso(P, v, run, esc) {   // em metros no mundo
  const H = 1.7 * esc, k = P.old ? 0.86 : 1;
  return run ? H * cl(0.3 + 0.12 * v, 0.45, 0.8) : H * cl(0.235 + 0.155 * v, 0.24, 0.43) * k;   // andando depressa, cresce a cadência e não mais o passo
}
export function passada(rig, P, ph, v, run, esc) {
  const Ls = comprimentoPasso(P, v, run, esc) / esc, H0 = rig.restY - 0.05;   // passo e altura da junta do quadril, no corpo
  const beta = run ? 0.36 : 0.62, L = (rig.L1[0] + rig.L2[0]) * 0.9995, hA = 0.064;
  const out = { hp: [0, 0], kn: [0, 0], ft: [0, 0], hpz: [0, 0], sh: [0, 0], el: [0, 0] };
  const S = [((ph / (2 * Math.PI)) % 1 + 1) % 1]; S[1] = (S[0] + 0.5) % 1;
  // tornozelo de cada pé (z para a frente a partir do quadril, y a partir do chão) e o ângulo do pé (+ ponta para cima)
  const at = (pz, gam, piv) => { const c = Math.cos(gam), sn = Math.sin(gam), [oy, oz] = piv === 'c' ? [_PE_H, 0.05] : [0.058, -0.125];   // calcanhar, ou entre a bola e a ponta (os dedos dobram)
    return [pz + oz * c - oy * sn, oy * c + oz * sn, gam]; };   // gira em volta do ponto de apoio
  const foot = s => {
    if (!run) {
      const Zh0 = -0.05 + 2 * Ls * 0.28, zh = st => Zh0 - 2 * Ls * st;          // calcanhar no chão (anda para trás com o corpo)
      if (s < 0.1) return at(zh(s), 0.32 * (1 - sm01(s / 0.1)), 'c');
      if (s < 0.44) return at(zh(s), 0, 'c');
      if (s < beta) { const u = (s - 0.44) / (beta - 0.44), gam = -0.62 * u * u * (1.4 - 0.4 * u); const zb = zh(0.44) + 0.175 - 2 * Ls * (s - 0.44);
        return at(zb, gam, 'b'); }   // o calcanhar sobe girando na bola do pé (os dedos dobram e ficam no chão)
      // balanço: o pé sai e pousa andando para trás junto com o chão (Hermite com a velocidade do chão nas duas pontas)
      const a0 = foot(beta - 1e-4), a1 = at(Zh0, 0.32, 'c'), u = (s - beta) / (1 - beta), m = -(1 - beta) * 2 * Ls, u2 = u * u, u3 = u2 * u;
      const zz = (2 * u3 - 3 * u2 + 1) * a0[0] + (u3 - 2 * u2 + u) * m + (-2 * u3 + 3 * u2) * a1[0] + (u3 - u2) * m;
      const lift = (0.09 + 0.02 * v) * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.8)), 1.2);
      const gam = u < 0.35 ? lerp(a0[2], -0.12, sm01(u / 0.35)) : lerp(-0.12, 0.32, sm01((u - 0.35) / 0.65));
      return [zz, lerp(a0[1], a1[1], sm01(u)) + lift, gam];
    }
    const Zc0 = Ls * beta * 1.0, zc = st => Zc0 - 2 * Ls * st;
    if (s < beta) { const u = s / beta; return at(zc(s) + 0.1, -0.02 - 0.73 * u * u, 'b'); }   // na corrida pisa com o meio do pé e sai pela ponta
    const a0 = foot(beta - 1e-4), u = (s - beta) / (1 - beta), e = u * u * (3 - 2 * u), a1 = at(Zc0 + 0.1, -0.02, 'b'), m = -(1 - beta) * 2 * Ls, u2 = u * u, u3 = u2 * u;
    const zz = (2 * u3 - 3 * u2 + 1) * a0[0] + (u3 - 2 * u2 + u) * m + (-2 * u3 + 3 * u2) * a1[0] + (u3 - u2) * m;
    const lift = (0.22 + 0.06 * v) * Math.pow(Math.sin(Math.PI * u), 0.8), back = -0.16 * Math.sin(Math.PI * u) * (1 - u);
    return [zz + back, lerp(a0[1], a1[1], e) + lift * Math.pow(1 - u, 0.3), lerp(a0[2], -0.02, sm01(u))];
  };
  const F = S.map(foot), stance = S.map(s => s < beta);
  // altura do quadril: sobe e desce no passo (mais alto no meio do apoio), sem passar do alcance das pernas no chão
  let hy;
  if (!run) hy = H0 - 0.014 + 0.012 * Math.cos(4 * Math.PI * (S[0] - 0.3)) - 0.008;
  else { const i = stance[0] ? 0 : stance[1] ? 1 : -1; hy = i >= 0 ? H0 - 0.045 - 0.05 * Math.sin(Math.PI * S[i] / beta) : H0 - 0.02 + 0.03 * Math.sin(Math.PI * (((S[0] - beta) % 0.5 + 0.5) % 0.5) / (0.5 - beta)); }
  for (let i = 0; i < 2; i++) if (stance[i] || F[i][1] < hA + 0.03) { const [z, y] = F[i]; hy = Math.min(hy, y + Math.sqrt(Math.max(0, L * L - z * z))); }
  hy = Math.max(hy, H0 - 0.16);
  for (let i = 0; i < 2; i++) { const [z, y, gam] = F[i], dz = z, dy = y - hy, d = cl(Math.hypot(dz, dy), 0.1, L);
    const l1 = rig.L1[i], l2 = rig.L2[i], al = Math.acos(cl((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1)), kn = Math.PI - al;
    const del = Math.atan2(dz, -dy), be = Math.acos(cl((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), t1 = del + be;
    out.hp[i] = -t1; out.kn[i] = kn; out.ft[i] = (t1 - kn) - gam; }
  // bacia: gira (perna que vai à frente leva o lado junto), cai do lado do balanço; tronco gira ao contrário
  const c0 = Math.cos(2 * Math.PI * S[0]), amp = run ? 0.05 : 0.075 * cl(v / 1.2, 0.5, 1.3);
  out.pry = amp * c0; out.sy = -0.55 * out.pry;
  const sw = i => stance[i] ? Math.sin(Math.PI * cl(S[i] / beta, 0, 1)) : 0;
  out.prz = (run ? 0.03 : 0.05) * (sw(1) - sw(0));
  const wid = run ? 0.012 : P.old ? 0.07 : 0.05;   // meia largura do passo (no velho, base mais larga)
  for (let i = 0; i < 2; i++) { const hx = i ? 1 : -1; out.hpz[i] = hx * Math.atan2(wid - (P.med.quadrilX), H0) * 0.9; }
  // braços: balançam com a perna do outro lado (o braço vai à frente quando a perna do mesmo lado vai para trás)
  for (let i = 0; i < 2; i++) { const c = Math.cos(2 * Math.PI * (S[i] - 0.5)), A = run ? 0.62 : cl(0.2 * v / 1.2, 0.08, 0.3) * (P.old ? 0.7 : 1);
    const fw = (run ? 0.25 : 0.05) + A * c; out.sh[i] = -fw; out.el[i] = run ? -1.45 - 0.2 * c : -(0.22 + 0.25 * Math.max(0, fw)); }
  out.sp = (run ? 0.2 : 0.04) + (P.old ? 0.08 : 0);
  out.py = hy + 0.05; out.hx = run ? -0.15 : -0.04;
  return { pose: out, Ls };
}
