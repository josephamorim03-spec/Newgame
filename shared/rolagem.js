/* Dice Duel · rolagem dos dados: a matemática (pura, sem DOM; os testes cobrem).
 * Portada do Cronomotor (steamdicegame: game/src/vfx/cubo.gd, lance_dado.gd, lancamento.gd):
 *  - a regra já sorteou a face; a física gravada só anima (js/lancamentos.js);
 *  - cada dado segue a trajetória gravada de uma casa, com uma CORREÇÃO DE FACE (uma simetria do cubo que
 *    leva a face sorteada para onde a face gravada caiu, entre as 4 equivalentes a de menor giro final);
 *  - nos últimos ~0,3 s, um AJUSTE FINAL: desliza até a casa exata, gira até o ângulo do dado parado e
 *    termina exatamente de pé, para a troca pelo dado parado não dar salto. O ajuste acaba PARADO segundos
 *    antes do fim, ainda junto do último movimento da física (corrigir com o dado já parado parecia patinar),
 *    e nesses últimos instantes o cubo, já na pose final, se funde no dado parado (js/rolagem.js).
 * Espaço da bandeja (o do Godot): x para a direita, y altura, z para quem joga. Unidade = 1 lado do dado.
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.RolagemMat = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- vetores, quatérnios e matrizes 3×3 (linhas) ----------
  const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const ponto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norma = a => { const n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
  const mulMV = (m, v) => [ponto(m[0], v), ponto(m[1], v), ponto(m[2], v)];
  const mulMM = (a, b) => a.map(l => [0, 1, 2].map(c => l[0] * b[0][c] + l[1] * b[1][c] + l[2] * b[2][c]));
  const IDENT = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  // rotação de `ang` em torno do eixo unitário `k` (regra da mão direita, como o Basis(eixo, ang) do Godot)
  function eixoAngulo(k, ang) {
    const [x, y, z] = norma(k), c = Math.cos(ang), s = Math.sin(ang), t = 1 - c;
    return [[t * x * x + c, t * x * y - s * z, t * x * z + s * y],
            [t * x * y + s * z, t * y * y + c, t * y * z - s * x],
            [t * x * z - s * y, t * y * z + s * x, t * z * z + c]];
  }
  function quatMatriz([x, y, z, w]) {
    const n = Math.hypot(x, y, z, w) || 1; x /= n; y /= n; z /= n; w /= n;
    return [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
            [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
            [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]];
  }
  function matrizQuat(m) {
    const tr = m[0][0] + m[1][1] + m[2][2];
    let x, y, z, w;
    if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; w = s / 4; x = (m[2][1] - m[1][2]) / s; y = (m[0][2] - m[2][0]) / s; z = (m[1][0] - m[0][1]) / s; }
    else if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) { const s = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2; w = (m[2][1] - m[1][2]) / s; x = s / 4; y = (m[0][1] + m[1][0]) / s; z = (m[0][2] + m[2][0]) / s; }
    else if (m[1][1] > m[2][2]) { const s = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2; w = (m[0][2] - m[2][0]) / s; x = (m[0][1] + m[1][0]) / s; y = s / 4; z = (m[1][2] + m[2][1]) / s; }
    else { const s = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2; w = (m[1][0] - m[0][1]) / s; x = (m[0][2] + m[2][0]) / s; y = (m[1][2] + m[2][1]) / s; z = s / 4; }
    return [x, y, z, w];
  }
  function slerp(a, b, t) {
    let [bx, by, bz, bw] = b, d = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
    if (d < 0) { d = -d; bx = -bx; by = -by; bz = -bz; bw = -bw; }
    if (d > 0.9995) { const r = [a[0] + (bx - a[0]) * t, a[1] + (by - a[1]) * t, a[2] + (bz - a[2]) * t, a[3] + (bw - a[3]) * t]; const n = Math.hypot(...r); return r.map(v => v / n); }
    const th = Math.acos(d), s = Math.sin(th), wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
    return [a[0] * wa + bx * wb, a[1] * wa + by * wb, a[2] * wa + bz * wb, a[3] * wa + bw * wb];
  }
  const suave = (a, b, x) => { if (b <= a) return 1; const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const ajustarAngulo = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

  // ---------- o cubo (Cubo.gd) ----------
  // índice de face i (0..5) = valor i + 1; as opostas somam 7
  const NORMAIS = [[0, 1, 0], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, -1, 0]];
  // eixo x do desenho de cada face; com a face para cima e sem giro, x vai para a direita e y para quem joga
  const tangente = i => (Math.abs(NORMAIS[i][0]) < 0.5 ? [1, 0, 0] : [0, 0, 1]);
  const bitangente = i => cruz(tangente(i), NORMAIS[i]);
  function correcao(alvo, pousou) {
    const de = NORMAIS[alvo], para = NORMAIS[pousou], d = ponto(de, para);
    if (d > 0.999) return IDENT;
    if (d < -0.999) return eixoAngulo(Math.abs(de[0]) < 0.5 ? [1, 0, 0] : [0, 1, 0], Math.PI);
    return eixoAngulo(cruz(de, para), Math.acos(d));
  }
  const anguloDaFace = (base, i) => { const t = mulMV(base, tangente(i)); return Math.atan2(t[2], t[0]); };
  function faceDeCima(base) {
    let melhor = 0, maior = -Infinity;
    NORMAIS.forEach((n, i) => { const y = mulMV(base, n)[1]; if (y > maior) { maior = y; melhor = i; } });
    return melhor;
  }
  // a orientação exata do dado parado com a face `alvo` para cima e ângulo 0
  const emPe = alvo => [tangente(alvo), NORMAIS[alvo], bitangente(alvo)];

  // ---------- um lançamento gravado (Lancamento.gd), no formato enxuto de js/lancamentos.js ----------
  const casa = (l, i) => [(i - (l.n - 1) / 2) * l.esp, 0.5, 0];
  const duracaoLanc = l => l.t[l.t.length - 1] / 1000;
  function amostra(l, i, tSeg) {
    const ms = Math.min(Math.max(tSeg * 1000, 0), l.t[l.t.length - 1]);
    let a = 0;
    while (a < l.t.length - 2 && l.t[a + 1] < ms) a++;
    const b = Math.min(a + 1, l.t.length - 1), w = l.t[b] > l.t[a] ? (ms - l.t[a]) / (l.t[b] - l.t[a]) : 0;
    const p = (f, k) => l.p[(f * l.n + i) * 3 + k] / 100;
    const q = f => [0, 1, 2, 3].map(k => l.q[(f * l.n + i) * 4 + k] / 1000);
    return { base: quatMatriz(slerp(q(a), q(b), w)), pos: [0, 1, 2].map(k => p(a, k) + (p(b, k) - p(a, k)) * w) };
  }
  const MEIA_VOLTA = eixoAngulo([0, 1, 0], Math.PI);

  // ---------- um dado dentro do lançamento (LanceDado.gd) ----------
  const AJUSTE_ANTES = 0.30, AJUSTE_DEPOIS = 0.16, PARADO = 0.10;
  function preparar(l, indice, alvo, anguloFinal = 0, espelhado = false) {
    const d = { l, indice, alvo, espelhado, trilha: espelhado ? l.n - 1 - indice : indice };
    const repouso = l.rep[d.trilha] / 1000;
    d.fim = Math.min(repouso + AJUSTE_DEPOIS, duracaoLanc(l));
    d.ajusteIni = Math.max(repouso - AJUSTE_ANTES, l.ini[d.trilha] / 1000);
    d.assenta = Math.max(d.ajusteIni + 0.05, d.fim - PARADO);   // daqui ao fim: parado na pose final, fundindo
    d.inicio = l.ini[d.trilha] / 1000;
    const fim = amostraDe(d, d.assenta);   // a correção mira a pose da física no fim do ajuste
    const pousou = l.fac[d.trilha];
    const base = correcao(alvo, pousou), eixo = NORMAIS[pousou];
    d.giro = Infinity;
    for (let k = 0; k < 4; k++) {
      const q = mulMM(eixoAngulo(eixo, k * Math.PI / 2), base);
      const g = ajustarAngulo(anguloDaFace(mulMM(fim.base, q), alvo) - anguloFinal);
      if (Math.abs(g) < Math.abs(d.giro)) { d.giro = g; d.corr = q; }
    }
    const c = casa(l, indice);
    d.deslize = [c[0] - fim.pos[0], c[1] - fim.pos[1], c[2] - fim.pos[2]];
    d.final = matrizQuat(mulMM(eixoAngulo([0, 1, 0], -anguloFinal), emPe(alvo)));
    return d;
  }
  function amostraDe(d, t) {
    const a = amostra(d.l, d.trilha, t);
    return d.espelhado ? { base: mulMM(MEIA_VOLTA, a.base), pos: mulMV(MEIA_VOLTA, a.pos) } : a;
  }
  // posição do centro (relativa à casa; y = altura acima do repouso) e orientação do desenho no instante t
  function pose(d, t) {
    const a = amostraDe(d, Math.min(t, d.assenta));
    const w = suave(d.ajusteIni, d.assenta, t);
    const c = casa(d.l, d.indice);
    const pos = [0, 1, 2].map(k => a.pos[k] - c[k] + d.deslize[k] * w);
    const corpo = mulMM(eixoAngulo([0, 1, 0], d.giro * w), a.base);
    // o desenho = corpo × correção; no fim, exatamente de pé (a física deixa o dado até ~10° torto)
    const q = slerp(matrizQuat(mulMM(corpo, d.corr)), d.final, w);
    return { pos, base: quatMatriz(q) };
  }

  // sorteio cosmético (nunca o rng da regra): um lançamento com n dados, às vezes espelhado
  function sortear(biblioteca, n, rnd = Math.random) {
    const opcoes = biblioteca.filter(l => l.n === n);
    if (!opcoes.length) return null;
    return { l: opcoes[Math.floor(rnd() * opcoes.length)], espelhado: rnd() < 0.5 };
  }
  // batidas do lançamento já com a casa (espelhada) de cada dado: [{t, tipo, casa, outra, impulso}]
  function batidas(l, espelhado) {
    const r = [], casaDe = j => (j < 0 ? -1 : espelhado ? l.n - 1 - j : j);
    for (let k = 0; k < l.b.length; k += 5) r.push({ t: l.b[k] / 1000, tipo: l.b[k + 1], casa: casaDe(l.b[k + 2]), outra: casaDe(l.b[k + 3]), impulso: l.b[k + 4] / 10 });
    return r;
  }

  return { NORMAIS, tangente, bitangente, correcao, anguloDaFace, faceDeCima, emPe, casa, duracaoLanc, amostra, preparar, pose, sortear, batidas,
    quatMatriz, matrizQuat, mulMM, mulMV, eixoAngulo };
});
