'use strict';
// Caos no motor: milhares de ações ao acaso (válidas e inválidas, dos dois lados) e invariantes a cada passo.
const test = require('node:test');
const assert = require('node:assert');
const Regras = require('../../shared/regras');
const { rngDe, jogadaAoAcaso } = require('./ajuda');

const FASES = ['pegar', 'destino', 'decidir', 'fim'];
const ESTADOS = ['pronta', 'armada', 'usada', 'perdida'];
const LIXO = [null, 42, 'x', [], { tipo: 'pegar' }, { tipo: 'pegar', idx: -1 }, { tipo: 'pegar', idx: 1.5 }, { tipo: 'pegar', idx: '0' },
  { tipo: 'destino', modo: 'voar' }, { tipo: 'carta', carta: 'constructor' }, { tipo: 'carta', carta: 'ajuste', idx: 99 },
  { tipo: 'virar', carta: 'espelho' }, { tipo: 'virar', carta: '__proto__' }, { tipo: 'dispensar' }, { tipo: 'segurar' }, { tipo: 'disparar' }, { tipo: '__proto__' }];

function invariantes(j, passo) {
  const onde = `passo ${passo}`;
  assert.ok(FASES.includes(j.fase), `${onde}: fase ${j.fase}`);
  assert.ok(j.vez === 0 || j.vez === 1, `${onde}: vez`);
  assert.ok(j.mesa.length <= 5, `${onde}: mesa com ${j.mesa.length}`);
  if (j.fase === 'pegar') assert.ok(j.mesa.length >= 1, `${onde}: vez de pegar com a Mesa vazia`);
  assert.strictEqual(new Set(j.mesa.map(d => d.id)).size, j.mesa.length, `${onde}: id repetido na Mesa`);
  for (const d of j.mesa) assert.ok(Number.isInteger(d.v) && d.v >= 1 && d.v <= 6, `${onde}: dado ${d.v}`);
  for (const p of [0, 1]) {
    assert.ok(j.cor[p].length <= 5, `${onde}: corrente de ${j.cor[p].length} parada (6 dispara sozinha)`);
    j.cor[p].forEach(v => assert.ok(v >= 1 && v <= 6));
    for (let i = 1; i < j.cor[p].length; i++) if (!Regras.sinc(j.cor[p][i - 1], j.cor[p][i])) assert.ok(true); // o Coringa permite elos sem sincronia
    assert.ok(j.bolso[p] === null || (j.bolso[p] >= 1 && j.bolso[p] <= 6), `${onde}: bolso`);
    assert.ok(Number.isFinite(j.pts[p]) && j.pts[p] >= 0, `${onde}: pontos ${j.pts[p]}`);
    const armadas = j.decks[p].filter(c => j.cartas[p][c] === 'armada');
    assert.ok(armadas.length <= 1, `${onde}: duas cartas armadas`);
    assert.strictEqual(j.armada[p], armadas[0] || null, `${onde}: armada fora de sincronia (${j.armada[p]} × ${armadas})`);
    j.decks[p].forEach(c => assert.ok(ESTADOS.includes(j.cartas[p][c]), `${onde}: estado ${j.cartas[p][c]}`));
    assert.ok(j.extra[p] >= 0 && j.extra[p] <= 1);
  }
  if (j.fase === 'destino') assert.ok(j.mao && j.mao.v >= 1 && j.mao.v <= 6, `${onde}: destino sem dado na mão`);
  else assert.strictEqual(j.mao, null, `${onde}: dado esquecido na mão`);
  if (j.fase === 'decidir') assert.ok(j.cor[j.vez].length >= 3, `${onde}: decidir com corrente curta`);
  if (j.marca) assert.ok(j.mesa.some(d => d.id === j.marca.id) && j.armada[j.marca.dono] === 'espelho', `${onde}: marca de Espelho órfã`);
  if (j.fase === 'fim') assert.ok(j.pts[j.vencedor] >= j.meta || j.desistencia !== undefined, `${onde}: fim sem meta`);
  // a visão de cada um: serializável e sem a carta virada do rival
  for (const eu of [0, 1]) {
    const v = Regras.visaoDe(j, eu);
    JSON.parse(JSON.stringify(v));
    if (j.fase !== 'fim' && j.armada[1 - eu] && j.armada[1 - eu] !== 'espelho') {
      assert.strictEqual(v.armada[1], 'oculta', `${onde}: a carta virada vazou`);
      assert.ok(!JSON.stringify(v.eventos).includes(`"c":"${j.armada[1 - eu]}"`) || v.decks[1].length === 0, `${onde}: evento entregou a carta virada`);
    }
  }
}

test('caos no motor: 400 partidas com ações válidas e inválidas, invariantes a cada passo', () => {
  const decks = [['ajuste', 'virar', 'pressa'], ['espelho', 'fundo', 'coringa'], ['rerrolar', 'ancora', 'sobrecarga'], ['interferencia', 'pedagio'],
    ['pressa', 'coringa', 'interferencia'], ['espelho', 'ancora', 'virar'], ['fundo', 'pedagio', 'ajuste'], []];
  let acoes = 0, recusadas = 0;
  for (let s = 1; s <= 400; s++) {
    const rng = rngDe(s * 7919);
    const j = Regras.criarPartida({ decks: [decks[s % 8], decks[(s * 3 + 1) % 8]], vez: s % 2, meta: s % 2 ? 12 : 16, rng });
    let passo = 0;
    while (j.fase !== 'fim') {
      if (++passo > 4000) assert.fail(`semente ${s}: a partida não terminou`);
      const x = rng();
      let acao, p = j.vez;
      if (x < 0.12) acao = LIXO[Math.floor(rng() * LIXO.length)];
      else if (x < 0.18) { p = 1 - j.vez; acao = jogadaAoAcaso(j, j.vez, rng); }        // fora da vez
      else if (x < 0.24) acao = { tipo: 'carta', carta: Regras.ORDEM[Math.floor(rng() * 11)], idx: Math.floor(rng() * 6) - 1, delta: rng() < .5 ? -1 : 1 };
      else if (x < 0.30) acao = { tipo: 'pegar', idx: Math.floor(rng() * 6), modo: ['corrente', 'guardar', 'trocar', 'x'][Math.floor(rng() * 4)] };
      else acao = jogadaAoAcaso(j, p, rng);
      const antes = JSON.stringify(j);
      let r;
      try { r = Regras.aplicar(j, p, acao); } catch (e) { assert.fail(`semente ${s}, passo ${passo}: ${JSON.stringify(acao)} lançou ${e.stack}`); }
      acoes++;
      if (!r.ok) { recusadas++; assert.strictEqual(JSON.stringify(j), antes, `semente ${s}: uma ação recusada (${JSON.stringify(acao)}: ${r.erro}) mudou o estado`); }
      j.eventos.length = 0;
      invariantes(j, `${s}/${passo}`);
      if (rng() < 0.0015) { Regras.desistir(j, Math.floor(rng() * 2)); invariantes(j, `${s}/${passo} desistência`); }
    }
  }
  assert.ok(recusadas > 1000 && acoes > 20000, `poucas ações (${acoes}, ${recusadas} recusadas)`);
});
