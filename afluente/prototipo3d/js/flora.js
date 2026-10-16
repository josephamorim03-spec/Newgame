// O motor da vegetação: cada espécie tem uma ficha (altura real, onde consegue viver, quanto ocorre por hectare, o mínimo e
// o máximo que cabem numa peça, o espaçamento de copa e o jeito de crescer) e cada peça diz quais espécies tem e em que
// proporção, de acordo com o que ela é ("Vereda e pasto", "Mata de galeria", "Cerradão"...).
// Para cada peça: mede, num grid de 1,5 m, o quanto cada ponto serve à espécie (0 a 1); a área que serve vezes a densidade
// dá o número de plantas, que fica entre o mínimo e o máximo da ficha; os pontos são sorteados com mais chance onde o
// lugar é melhor, respeitando o espaço da copa e o que já está plantado (casa, roça, caminho, outra árvore).
//
// Fontes das alturas e densidades: Ribeiro & Walter (2008), "As principais fitofisionomias do Bioma Cerrado"; Lorenzi,
// "Árvores Brasileiras"; Embrapa Cerrados. As densidades reais (cerrado típico: 600 a 1.200 árvores/ha; mata de galeria:
// 1.000 a 1.500/ha) não cabem no desenho de uma peça de 0,1 ha; o máximo da ficha é o teto viável para o aparelho, e a
// densidade usada é a de uma fisionomia mais aberta, para a peça continuar legível de cima.
import { smooth } from './world.js';

const band = (v, a, b, c, d) => v <= a || v >= d ? 0 : v < b ? (v - a) / (b - a) : v <= c ? 1 : (d - v) / (d - c);   // 0 fora, sobe, 1 no meio, desce

// ---------- as fichas. alt = altura real (m) de adulto; idades = [chance, escala do modelo]; dens = plantas/ha do habitat bom;
// min/max por peça (só onde a espécie ocorre); esp = espaço da copa (m); jeito: 'faixa' (acompanha a água), 'touceira'
// (em grupos), 'isolada' (longe de outras grandes), 'esparsa'
export const FLORA = {
  buriti: { nome: 'buriti', alt: [15, 25], idades: [[0.35, [0.3, 0.5]], [0.2, [0.6, 0.8]], [0.45, [0.85, 1.1]]], dens: 220, min: 3, max: 10, esp: 4.5, jeito: 'faixa',
    // vereda: solo encharcado, de meio metro a ~5 m da água corrente ou da nascente; plano; também na beira da lagoa
    hab: e => Math.max(band(e.wd, 0.4, 1.0, 3.2, 5.5), band(e.lake, 0.4, 1.2, 3.5, 5.5)) * (1 - smooth(0.25, 0.5, e.slope)) * (1 - e.rocky) },
  mata: { nome: 'árvore da mata de galeria', alt: [10, 22], idades: [[0.25, [0.6, 0.8]], [0.75, [0.88, 1.15]]], dens: 320, min: 8, max: 22, esp: 4.4, jeito: 'touceira',
    hab: e => band(e.wd, 1.4, 2.5, 9, 15) * (1 - smooth(0.6, 1.0, e.slope)) },
  pinheiro: { nome: 'pinheiro-bravo', alt: [10, 20], idades: [[0.3, [0.6, 0.8]], [0.7, [0.9, 1.15]]], dens: 120, min: 2, max: 7, esp: 4.5, jeito: 'touceira',
    // Podocarpus: mata de galeria de altitude e beira de escarpa, em solo bem drenado
    hab: e => band(e.wd, 2.5, 4, 30, 60) * (0.35 + 0.65 * e.rim) * (1 - smooth(0.35, 0.6, e.slope)) },
  sombra: { nome: 'árvore de sombra do pasto', alt: [8, 15], idades: [[0.15, [0.65, 0.8]], [0.85, [0.9, 1.15]]], dens: 12, min: 1, max: 3, esp: 10, jeito: 'isolada',
    // árvore grande que ficou quando abriram o pasto (ou a mangueira do quintal): chão seco e plano, longe de outras grandes
    hab: e => band(e.wd, 5, 9, 200, 300) * (1 - smooth(0.2, 0.45, e.slope)) * (1 - 0.7 * e.rocky) },
  pequi: { nome: 'pequizeiro', alt: [6, 10], idades: [[0.3, [0.6, 0.8]], [0.7, [0.9, 1.2]]], dens: 90, min: 3, max: 8, esp: 6, jeito: 'esparsa', frutos: [0xb8c040, 18, 0.05],
    hab: e => band(e.wd, 5, 8, 200, 300) * (1 - 0.8 * e.rocky) * (1 - smooth(0.4, 0.7, e.slope)) },
  ipe: { nome: 'ipê', alt: [6, 12], idades: [[0.2, [0.7, 0.85]], [0.8, [0.9, 1.1]]], dens: 15, min: 1, max: 2, esp: 7, jeito: 'isolada', variantes: ['ipe', 'ipe', 'ipeRosa', 'ipeBranco'],
    hab: e => band(e.wd, 4, 7, 200, 300) * (1 - smooth(0.5, 0.8, e.slope)) },
  cerrado: { nome: 'árvore do cerrado', alt: [3, 8], idades: [[0.35, [0.6, 0.8]], [0.65, [0.85, 1.2]]], dens: 160, min: 4, max: 14, esp: 5, jeito: 'esparsa',
    // pau-terra, pau-santo, lixeira: tronco torto e casca grossa, no chão seco e até no pedregoso
    hab: e => band(e.wd, 4, 7, 200, 300) * (1 - 0.4 * e.rocky) * (1 - smooth(0.6, 0.9, e.slope)) },
  lobeira: { nome: 'lobeira', alt: [2, 5], idades: [[0.3, [0.7, 0.85]], [0.7, [0.9, 1.2]]], dens: 70, min: 1, max: 7, esp: 3.5, jeito: 'esparsa', frutos: [0x7a9a3a, 5, 0.07],
    hab: e => band(e.wd, 3, 5, 200, 300) * (1 - smooth(0.5, 0.8, e.slope)) * (0.6 + 0.4 * e.edge) },
  moita: { nome: 'moita', alt: [0.7, 3], idades: [[1, [0.75, 1.25]]], dens: 140, min: 2, max: 12, esp: 2.2, jeito: 'touceira',
    hab: e => band(e.wd, 1.1, 2, 200, 300) * (1 - smooth(0.7, 1.0, e.slope)) },
  canela: { nome: 'canela-de-ema', alt: [0.8, 2], idades: [[1, [1, 1]]], dens: 600, min: 3, max: 14, esp: 1.4, jeito: 'touceira',
    hab: e => smooth(0.3, 0.5, e.rocky) * band(e.wd, 3, 5, 200, 300) },
  cupinzeiro: { nome: 'cupinzeiro', alt: [0.6, 2.4], idades: [[1, [1, 1]]], dens: 60, min: 2, max: 9, esp: 3, jeito: 'esparsa',
    // pasto e campo: chão seco, plano, aberto (no brejo da vereda não tem)
    hab: e => band(e.wd, 6, 9, 200, 300) * (1 - smooth(0.15, 0.3, e.slope)) * (1 - 0.6 * e.rocky) },
  pedra: { nome: 'pedra', alt: [0.3, 1.5], idades: [[1, [0.35, 0.9]]], dens: 120, min: 0, max: 10, esp: 1.6, jeito: 'touceira',
    // afloramento de quartzito no cerrado pedregoso, blocos caídos no pé da escarpa e uma ou outra solta no campo
    hab: e => Math.max(smooth(0.4, 0.6, e.rocky), smooth(0.5, 1.0, e.slope) * 0.6, 0.25) * smooth(0.4, 1.2, e.wd) },
};

// ---------- o que cada peça tem (multiplicador da densidade; 0 ou ausente = a espécie não ocorre ali), de acordo com o nome
export const PECA = {
  rio: { buriti: 1, cerrado: 0.35, cupinzeiro: 1, moita: 0.5, ipe: 0.4, lobeira: 0.4 },                    // Vereda e pasto: buritizal na faixa molhada, pasto no seco
  mata: { mata: 1, buriti: 0.35, pinheiro: 0.4, moita: 1 },                                                 // Mata de galeria: fechada ao longo do rio
  pasto: { sombra: 1, cupinzeiro: 1, lobeira: 0.8, cerrado: 0.2, ipe: 0.5, moita: 0.3, pedra: 0.5 },                  // Pasto: aberto, sombra isolada, cupinzeiro
  cerrado: { cerrado: 1, ipe: 0.9, canela: 1, cupinzeiro: 0.7, moita: 0.9, pedra: 1, lobeira: 0.3, pequi: 0.3 },
  vila: { sombra: 1.8, moita: 0.5, ipe: 0.3 },                                                              // mangueira e jabuticabeira dos quintais
  lavoura: { cerrado: 0.15, sombra: 0.3, moita: 0.2 },                                                       // só na divisa (a roça ocupa o resto)
  cachoeira: { pinheiro: 1, mata: 0.6, buriti: 0.3, moita: 0.8, pedra: 0.8 },
  lagoa: { buriti: 0.8, mata: 0.45, moita: 0.8 },
  roca: { sombra: 0.4, moita: 0.2, lobeira: 0.3 },
  cerradao: { pequi: 1, lobeira: 0.7, cerrado: 0.9, mata: 0.15, moita: 1, ipe: 0.6, cupinzeiro: 0.4 },     // Cerradão: mata seca de copa fechada
  praca: { sombra: 2.5, ipe: 0.7, moita: 0.5 },                                                              // árvores plantadas em volta da praça
};
// peça encaixada pelo jogador: cada setor diz o que nasce ali (mata, campo/cerrado, vila, lavoura); a água traz o buritizal
export function pecaJogador(t, setor) {
  if (setor === 'B') return t.cerrado ? { pequi: 1, lobeira: 0.6, cerrado: 0.8, moita: 1 } : { mata: 1, moita: 1, pinheiro: 0.2 };
  if (setor === 'G') return t.cerrado ? { cerrado: 1, canela: 0.6, cupinzeiro: 0.7, ipe: 0.7, moita: 0.7, pedra: 0.5 } : { cupinzeiro: 1, sombra: 0.6, lobeira: 0.6, cerrado: 0.3, ipe: 0.4, moita: 0.4 };
  if (setor === 'V') return { sombra: 0.7, moita: 0.4 };
  if (setor === 'C') return { moita: 0.15 };
  return {};
}

// ---------- plantar uma peça. ctx: { R, rnd, inHex, env(x, z) → {wd, lake, rocky, slope, rim, edge, spray}, place(obj, x, z, esp) → bool,
// can(x, z, esp) → cabe ali? (antes de montar a planta, que custa), make(espécie, escala) → objeto, setor(t, x, z) (peça do
// jogador), placed: [[x, z, r]], made(obj, espécie, ficha) depois de plantada }
// no respingo da queda (rocha molhada, vento de água) não pega árvore: só moita, musgo e pedra
const hab = (F, e) => F.hab(e) * (F.alt[1] > 4 ? 1 - (e.spray || 0) : 1);
export function plantTile(t, ctx) {
  const { R, rnd, inHex } = ctx, step = 1.5, cells = [];
  for (let z = t.c[1] - R; z <= t.c[1] + R; z += step) for (let x = t.c[0] - R; x <= t.c[0] + R; x += step) {
    const xx = x + (rnd() - 0.5) * step, zz = z + (rnd() - 0.5) * step; if (!inHex(xx, zz, t.c, 0.92) || (ctx.can && !ctx.can(xx, zz, 0))) continue; cells.push({ x: xx, z: zz, e: ctx.env(xx, zz), s: t.e && ctx.setor ? ctx.setor(t, xx, zz) : null }); }
  const mult = (sp, c) => t.e ? (pecaJogador(t, c.s)[sp] || 0) + (sp === 'buriti' && t.e.includes('A') ? 0.8 : 0) + (sp === 'mata' && t.e.includes('A') && c.s !== 'C' ? 0.25 : 0) : (PECA[t.kind] || {})[sp] || 0;
  const rel = {};
  for (const [sp, F] of Object.entries(FLORA)) {
    const ok = []; let area = 0, mSum = 0;
    for (const c of cells) { const m = mult(sp, c); if (!m) continue; const q = hab(F, c.e) * Math.min(1, m); if (q < 0.12) continue; ok.push([c, q]); area += step * step * q; mSum += m; }
    if (!ok.length) continue;
    const mMed = mSum / ok.length, alvo = Math.round(area / 10000 * F.dens * mMed * (0.85 + 0.3 * rnd()));
    const n = Math.max(Math.round(F.min * Math.min(1, mMed)), Math.min(Math.round(F.max * Math.min(1, mMed + 0.15)), alvo));
    let k = 0, tries = 0; const mine = [];
    while (k < n && tries++ < n * 60) { const [c, q] = ok[Math.floor(rnd() * ok.length)]; if (rnd() > q) continue;
      let x = c.x, z = c.z;
      // touceira: metade das vezes nasce perto de uma da mesma espécie (moita junto, mata em capão)
      if (F.jeito === 'touceira' && mine.length && rnd() < 0.5) { const [px, pz] = mine[Math.floor(rnd() * mine.length)], a = rnd() * 6.283, d = F.esp * (1.05 + rnd() * 0.8); x = px + Math.cos(a) * d; z = pz + Math.sin(a) * d;
        if (!inHex(x, z, t.c, 0.92) || hab(F, ctx.env(x, z)) < 0.12) continue; }
      // isolada: longe de qualquer árvore grande
      if (F.jeito === 'isolada' && ctx.placed.some(p => p[2] >= 4 && Math.hypot(p[0] - x, p[1] - z) < F.esp * 1.2)) continue;
      const id = [0, 0]; let r = rnd(), a = 0; for (const [ch, sc] of F.idades) { if ((r -= ch) <= 0) { id[0] = sc[0]; id[1] = sc[1]; break; } a++; } if (!id[1]) { id[0] = F.idades[0][1][0]; id[1] = F.idades[0][1][1]; }
      const esc = id[0] + rnd() * (id[1] - id[0]), kind = F.variantes ? F.variantes[Math.floor(rnd() * F.variantes.length)] : sp, esp = F.esp * (0.6 + 0.4 * esc);
      if (ctx.can && !ctx.can(x, z, esp)) continue;
      const obj = ctx.make(kind, esc); if (!obj) continue;
      if (ctx.place(obj, x, z, esp)) { k++; mine.push([x, z]); if (ctx.made) ctx.made(obj, sp, F, esc); }
    }
    rel[sp] = { plantou: k, alvo: alvo, area: Math.round(area), min: F.min, max: F.max };
  }
  t.flora = rel; return rel;
}
