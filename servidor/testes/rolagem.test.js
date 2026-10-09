'use strict';
// A rolagem só anima: em 100% dos casos a face sorteada pela regra termina para cima, de pé, no ângulo
// do dado parado e na própria casa (o mesmo que o Cronomotor testa em _testar_rolagem).
const test = require('node:test');
const assert = require('node:assert');
const M = require('../../shared/rolagem');
const LANCAMENTOS = require('../../js/lancamentos');

test('as 24 orientações × 6 faces: a correção leva a face sorteada para onde a gravada caiu', () => {
  const eixos = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const orientacoes = [];
  for (const e1 of eixos) for (let a = 0; a < 4; a++) for (const e2 of eixos) for (let b = 0; b < 4; b++)
    orientacoes.push(M.mulMM(M.eixoAngulo(e1, a * Math.PI / 2), M.eixoAngulo(e2, b * Math.PI / 2)));
  const unicas = new Map(orientacoes.map(o => [o.flat().map(v => Math.round(v)).join(), o]));
  assert.strictEqual(unicas.size, 24);
  for (const base of unicas.values()) {
    const pousou = M.faceDeCima(base);
    for (let alvo = 0; alvo < 6; alvo++) {
      const up = M.mulMV(M.mulMM(base, M.correcao(alvo, pousou)), M.NORMAIS[alvo]);
      assert.ok(up[1] > 0.999, `alvo ${alvo}, pousou ${pousou}`);
    }
  }
});

test('a biblioteca: 8 lançamentos de 1 a 5 dados, coerentes', () => {
  for (let n = 1; n <= 5; n++) assert.strictEqual(LANCAMENTOS.filter(l => l.n === n).length, 8);
  for (const l of LANCAMENTOS) {
    const quadros = l.t.length;
    assert.strictEqual(l.p.length, quadros * l.n * 3);
    assert.strictEqual(l.q.length, quadros * l.n * 4);
    assert.ok(l.ini.length === l.n && l.rep.length === l.n && l.fac.length === l.n);
    assert.ok(M.duracaoLanc(l) < 1.7);
    for (let i = 0; i < l.n; i++) assert.strictEqual(M.faceDeCima(M.amostra(l, i, 99).base), l.fac[i], 'face final gravada');
  }
});

test('todo lançamento, todo dado, toda face, espelhado ou não: termina de pé, na casa, com a face da regra', () => {
  let casos = 0;
  for (const l of LANCAMENTOS) for (let i = 0; i < l.n; i++) for (let alvo = 0; alvo < 6; alvo++) for (const esp of [false, true]) {
    const d = M.preparar(l, i, alvo, 0, esp);
    const fim = M.pose(d, d.fim + 0.05);
    assert.ok(M.mulMV(fim.base, M.NORMAIS[alvo])[1] > 0.9999, 'face da regra para cima');
    assert.ok(Math.abs(M.anguloDaFace(fim.base, alvo)) < 1e-3, 'no ângulo do dado parado');
    assert.ok(Math.hypot(...fim.pos) < 1e-3, `na casa (${fim.pos})`);
    // no meio do caminho é um cubo de verdade (rotação própria) e não atravessa o feltro
    for (const t of [d.inicio, d.inicio + 0.1, (d.inicio + d.fim) / 2]) {
      const p = M.pose(d, t);
      assert.ok(Math.abs(M.mulMV(p.base, [0, 1, 0])[0] ** 2 + M.mulMV(p.base, [0, 1, 0])[1] ** 2 + M.mulMV(p.base, [0, 1, 0])[2] ** 2 - 1) < 1e-6);
      assert.ok(p.pos[1] > -0.25, 'abaixo do feltro');
    }
    casos++;
  }
  assert.strictEqual(casos, 8 * (1 + 2 + 3 + 4 + 5) * 6 * 2);
});

test('batidas: tipos e casas válidos, espelho troca as casas', () => {
  const l = LANCAMENTOS.find(x => x.n === 5);
  const a = M.batidas(l, false), b = M.batidas(l, true);
  assert.strictEqual(a.length, b.length);
  for (let k = 0; k < a.length; k++) {
    assert.ok([0, 1, 2].includes(a[k].tipo) && a[k].casa >= 0 && a[k].casa < 5 && a[k].impulso > 0);
    assert.strictEqual(b[k].casa, 4 - a[k].casa);
  }
});
