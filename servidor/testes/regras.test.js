'use strict';
const test = require('node:test');
const assert = require('node:assert');
const Regras = require('../../shared/regras');
const { rngDe, jogadaAoAcaso } = require('./ajuda');

const DECKS = [['ajuste', 'virar', 'pressa'], ['espelho', 'fundo', 'coringa'], ['rerrolar', 'ancora', 'sobrecarga'], ['interferencia', 'pedagio'], []];

test('partidas ao acaso sempre terminam, com placar coerente', () => {
  for (let s = 1; s <= 300; s++) {
    const rng = rngDe(s);
    const decks = [DECKS[s % 5], DECKS[(s * 7) % 5]];
    const j = Regras.criarPartida({ decks, vez: s % 2, meta: s % 3 ? 12 : 16, rng });
    let passos = 0;
    while (j.fase !== 'fim') {
      const r = Regras.aplicar(j, j.vez, jogadaAoAcaso(j, j.vez, rng));
      assert.ok(r.ok, `semente ${s}: ${r.erro}`);
      assert.ok(++passos < 3000, `semente ${s}: não terminou`);
      j.eventos.length = 0;
    }
    assert.ok(j.pts[j.vencedor] >= j.meta, `semente ${s}: vencedor sem a meta`);
    assert.ok(j.cor.every(c => c.length < Regras.LIM));
    JSON.parse(JSON.stringify(j)); // o estado é serializável (vai pela rede)
  }
});

test('aplicar recusa jogadas fora da vez, da fase ou de cartas que não tem', () => {
  const j = Regras.criarPartida({ decks: [['ajuste'], ['coringa']], vez: 0, rng: rngDe(3) });
  assert.strictEqual(Regras.aplicar(j, 1, { tipo: 'pegar', idx: 0 }).ok, false);
  assert.strictEqual(Regras.aplicar(j, 0, { tipo: 'pegar', idx: 9 }).ok, false);
  assert.strictEqual(Regras.aplicar(j, 0, { tipo: 'pegar', idx: '0' }).ok, false);
  assert.strictEqual(Regras.aplicar(j, 0, { tipo: 'disparar' }).ok, false);
  assert.strictEqual(Regras.aplicar(j, 0, { tipo: 'destino', modo: 'guardar' }).ok, false);
  assert.strictEqual(Regras.aplicar(j, 0, { tipo: 'carta', carta: 'coringa' }).ok, false); // é do rival
  assert.strictEqual(Regras.aplicar(j, 0, { tipo: 'carta', carta: 'ajuste' }).ok, false);  // sem alvo
  assert.strictEqual(Regras.aplicar(j, 0, { tipo: 'carta', carta: '__proto__' }).ok, false);
  assert.strictEqual(Regras.aplicar(j, 0, null).ok, false);
  j.mesa[0].v = 6;
  assert.strictEqual(Regras.aplicar(j, 0, { tipo: 'carta', carta: 'ajuste', idx: 0, delta: 1 }).ok, false);
  assert.strictEqual(Regras.aplicar(j, 0, { tipo: 'carta', carta: 'ajuste', idx: 0, delta: -1 }).ok, true);
  assert.strictEqual(j.mesa[0].v, 5);
  assert.strictEqual(Regras.aplicar(j, 0, { tipo: 'carta', carta: 'ajuste', idx: 0, delta: -1 }).ok, false); // já usada
});

test('visaoDe: quem vê é o 0, e a armadilha armada do rival fica escondida (o Espelho não)', () => {
  const j = Regras.criarPartida({ decks: [['fundo'], ['espelho', 'interferencia']], vez: 0, nomes: ['Ana', 'Bia'], rng: rngDe(5) });
  assert.ok(Regras.aplicar(j, 0, { tipo: 'carta', carta: 'fundo' }).ok);
  const daBia = Regras.visaoDe(j, 1);
  assert.deepStrictEqual(daBia.nomes, ['Bia', 'Ana']);
  assert.strictEqual(daBia.armada[1], 'oculta');
  assert.strictEqual(daBia.cartas[1].fundo, 'pronta');
  assert.ok(!JSON.stringify(daBia.eventos).includes('fundo'));
  assert.strictEqual(daBia.log[0].txt, 'armou uma armadilha'); // o deck é público; qual carta armou, não
  const daAna = Regras.visaoDe(j, 0);
  assert.strictEqual(daAna.armada[0], 'fundo');
  // a vez passa para a Bia, que marca um dado com o Espelho: a marca é pública
  j.vez = 1; j.fase = 'pegar';
  assert.ok(Regras.aplicar(j, 1, { tipo: 'carta', carta: 'espelho', idx: 0 }).ok);
  const ana = Regras.visaoDe(j, 0);
  assert.strictEqual(ana.armada[1], 'espelho');
  assert.strictEqual(ana.marca.dono, 1);
  assert.strictEqual(Regras.visaoDe(j, 1).marca.dono, 0);
});

test('economia: premioSolo respeita o teto pelo pico e ganharXp dá presentes', () => {
  const v = Regras.premioSolo({ rating: 1000, pico: 1000 }, { nivel: 'aprendiz', venceu: true, margem: 8, rodadas: 4, meta: 12 });
  assert.ok(v.moedas.total > 0 && v.rating > 1000);
  const teto = Regras.premioSolo({ rating: 900, pico: 1100 }, { nivel: 'aprendiz', venceu: true, margem: 8, rodadas: 4, meta: 12 });
  assert.strictEqual(teto.moedas.total, 0);
  assert.strictEqual(teto.moedas.elegivel, false);
  const c = { xp: 50, dados: ['marfim'], icones: ['bolinha'], mesas: ['salvia'] };
  const x = Regras.ganharXp(c, 120);
  assert.strictEqual(x.nivelDepois, 3);
  assert.deepStrictEqual(x.presentes.map(p => p.id), ['xicara', 'menta']);
  assert.strictEqual(Regras.precoDe('dados', 'menta'), null);
  assert.strictEqual(Regras.precoDe('cartas', 'ajuste'), null);
  assert.strictEqual(Regras.precoDe('cartas', 'espelho'), 110);
});

test('nomes herdados de Object (constructor, __proto__) não passam por carta nem por item', () => {
  assert.strictEqual(Regras.deckValido(['constructor']), false);
  assert.strictEqual(Regras.deckValido(['toString', 'ajuste']), false);
  assert.strictEqual(Regras.precoDe('cartas', 'constructor'), null);
  assert.strictEqual(Regras.precoDe('dados', '__proto__'), null);
  assert.strictEqual(Regras.precoDe('constructor', 'name'), null);
  const j = Regras.criarPartida({ decks: [['ajuste'], []], vez: 0, rng: rngDe(2) });
  assert.strictEqual(Regras.aplicar(j, 0, { tipo: 'carta', carta: 'constructor' }).ok, false);
});

test('blefe: o efeito virado é um "?" igual ao de uma armadilha, e usá-lo revela', () => {
  const j = Regras.criarPartida({ decks: [['coringa', 'interferencia'], []], vez: 0, nomes: ['Ana', 'Bia'], rng: rngDe(9) });
  assert.strictEqual(Regras.aplicar(j, 0, { tipo: 'virar', carta: 'interferencia' }).ok, false); // só efeito vira
  assert.ok(Regras.aplicar(j, 0, { tipo: 'virar', carta: 'coringa' }).ok);
  const bia = Regras.visaoDe(j, 1);
  assert.strictEqual(bia.armada[1], 'oculta');
  assert.strictEqual(bia.cartas[1].coringa, 'pronta');
  assert.strictEqual(bia.stats[1].blefes, 0);
  assert.strictEqual(bia.log[0].txt, 'armou uma armadilha');
  assert.strictEqual(Regras.aplicar(j, 0, { tipo: 'carta', carta: 'interferencia' }).ok, false); // o blefe ocupa o lugar
  assert.ok(Regras.aplicar(j, 0, { tipo: 'carta', carta: 'coringa' }).ok);
  assert.strictEqual(j.armada[0], null);
  assert.strictEqual(j.cartas[0].coringa, 'usada');
  assert.ok(j.eventos.some(e => e.tipo === 'chamada' && e.titulo === 'Blefe!'));
  // sem armadilha escondida, não blefa
  const k = Regras.criarPartida({ decks: [['ajuste', 'espelho'], []], vez: 0, rng: rngDe(9) });
  assert.strictEqual(Regras.podeVirar(k, 0, 'ajuste').ok, false);
});

test('Pressa: o 6.º dado dispara e o segundo dado continua; dispensar leva à decisão', () => {
  const j = Regras.criarPartida({ decks: [['pressa'], []], vez: 0, rng: rngDe(4) });
  j.cor[0] = [1, 2, 3, 4, 5]; j.mesa = [{ id: 901, v: 5 }, { id: 902, v: 2 }, { id: 903, v: 3 }];
  assert.ok(Regras.aplicar(j, 0, { tipo: 'carta', carta: 'pressa' }).ok);
  let r = Regras.aplicar(j, 0, { tipo: 'pegar', idx: 0 });
  if (r.resultado === 'destino') r = Regras.aplicar(j, 0, { tipo: 'destino', modo: 'corrente' });
  assert.strictEqual(r.resultado, 'extra');
  assert.strictEqual(j.pts[0], 6);
  assert.ok(j.vez === 0 && j.segundoDado);
  const k = Regras.criarPartida({ decks: [['pressa'], []], vez: 0, rng: rngDe(4) });
  k.cor[0] = [3, 3]; k.bolso[0] = 6; k.mesa = [{ id: 911, v: 3 }, { id: 912, v: 1 }];
  Regras.aplicar(k, 0, { tipo: 'carta', carta: 'pressa' });
  Regras.aplicar(k, 0, { tipo: 'pegar', idx: 0 });
  if (k.fase === 'destino') Regras.aplicar(k, 0, { tipo: 'destino', modo: 'corrente' });
  assert.strictEqual(Regras.aplicar(k, 0, { tipo: 'dispensar' }).resultado, 'decidir');
  assert.ok(k.vez === 0 && k.cor[0].length === 3 && !k.segundoDado);
  // Coringa não se gasta no primeiro dado de uma corrente vazia
  const c = Regras.criarPartida({ decks: [['coringa'], []], vez: 0, rng: rngDe(4) });
  c.bolso[0] = 1; c.mesa = [{ id: 921, v: 4 }, { id: 922, v: 1 }];
  Regras.aplicar(c, 0, { tipo: 'carta', carta: 'coringa' });
  Regras.aplicar(c, 0, { tipo: 'pegar', idx: 0 });
  if (c.fase === 'destino') Regras.aplicar(c, 0, { tipo: 'destino', modo: 'corrente' });
  assert.strictEqual(c.coringa[0], true);
});

test('pegar com destino: escolher e confirmar numa ação só, com o Espelho já considerado', () => {
  const j = Regras.criarPartida({ decks: [[], ['espelho']], vez: 0, rng: rngDe(11) });
  j.cor[0] = [3, 3, 3]; j.bolso[0] = null;
  j.mesa = [{ id: 1, v: 2 }, { id: 2, v: 3 }, { id: 3, v: 6 }];
  assert.deepStrictEqual(Regras.destinosDoDado(j, 0, 1), ['corrente', 'guardar']);
  assert.strictEqual(Regras.aplicar(j, 0, { tipo: 'pegar', idx: 1, modo: 'trocar' }).ok, false);
  j.marca = { dono: 1, id: 1 }; j.cartas[1].espelho = 'armada'; j.armada[1] = 'espelho';
  assert.deepStrictEqual(Regras.destinosDoDado(j, 0, 0), ['corrente']);           // marcado: chega virado e não vai ao Bolso
  assert.strictEqual(Regras.aplicar(j, 0, { tipo: 'pegar', idx: 0, modo: 'guardar' }).ok, false);
  const r = Regras.aplicar(j, 0, { tipo: 'pegar', idx: 1, modo: 'guardar' });
  assert.ok(r.ok);
  assert.strictEqual(j.bolso[0], 3);
  assert.strictEqual(j.mesa.length, 2);
});
