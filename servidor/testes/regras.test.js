'use strict';
const test = require('node:test');
const assert = require('node:assert');
const Regras = require('../../shared/regras');
const { rngDe, jogadaAoAcaso } = require('./ajuda');

const DECKS = [['ajuste', 'virar', 'pressa'], ['espelho', 'fundo', 'coringa'], ['rerrolar', 'ancora', 'sobrecarga'], ['interferencia', 'pedagio'], [],
  ['pausa', 'reverso', 'furto'], ['lacre', 'pressa', 'sobrecarga'], ['lacre', 'fundo', 'pausa']];

test('partidas ao acaso sempre terminam, com placar coerente', () => {
  for (let s = 1; s <= 300; s++) {
    const rng = rngDe(s);
    const decks = [DECKS[s % DECKS.length], DECKS[(s * 7) % DECKS.length]];
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
  assert.strictEqual(Regras.aplicar(j, 0, { tipo: 'carta', carta: 'coringa' }).ok, false);      // e não desvira na mesma vez
  Regras.proximo(j); Regras.proximo(j);                                                         // a Bia teve a vez dela (podia desafiar)
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

// ---------- cartas da v0.11: Pausa, Reverso, Furto e Lacre (docs/balanceamento-cartas.md) ----------
const montar = (decks, f) => { const j = Regras.criarPartida({ decks, vez: 0, meta: 16, rng: rngDe(11) }); f(j); return j; };

test('Pausa: passa a vez sem mexer em corrente, Bolso e Coringa; não vale na Pressa', () => {
  const j = montar([['pausa', 'coringa', 'pressa'], []], j => { j.cor[0] = [1, 2, 3]; j.bolso[0] = 6; j.mesa = [{ id: 90, v: 5 }, { id: 91, v: 6 }]; });
  Regras.aplicar(j, 0, { tipo: 'carta', carta: 'coringa' });
  const r = Regras.aplicar(j, 0, { tipo: 'carta', carta: 'pausa' });
  assert.deepStrictEqual(r, { ok: true, resultado: 'proximo' });
  assert.strictEqual(j.vez, 1);
  assert.deepStrictEqual(j.cor[0], [1, 2, 3]); assert.strictEqual(j.bolso[0], 6); assert.strictEqual(j.coringa[0], true);
  assert.strictEqual(j.mesa.length, 2, 'ninguém pegou dado');
  // com a Pressa valendo, não
  const k = montar([['pausa', 'pressa'], []], j => { j.mesa = [{ id: 1, v: 1 }, { id: 2, v: 2 }, { id: 3, v: 3 }]; });
  Regras.aplicar(k, 0, { tipo: 'carta', carta: 'pressa' });
  assert.strictEqual(Regras.aplicar(k, 0, { tipo: 'carta', carta: 'pausa' }).ok, false);
});

test('Reverso: a corrente cresce pela outra ponta; precisa de 2 dados', () => {
  const j = montar([['reverso'], []], j => { j.cor[0] = [1]; });
  assert.strictEqual(Regras.aplicar(j, 0, { tipo: 'carta', carta: 'reverso' }).ok, false);
  j.cor[0] = [6, 5, 3]; j.mesa = [{ id: 1, v: 6 }, { id: 2, v: 6 }];
  assert.strictEqual(Regras.aplicar(j, 0, { tipo: 'carta', carta: 'reverso' }).ok, true);
  assert.deepStrictEqual(j.cor[0], [3, 5, 6]);
  // o 6 agora entra (eco com a frente 6), sem romper
  Regras.aplicar(j, 0, { tipo: 'pegar', idx: 0, modo: 'corrente' });
  assert.deepStrictEqual(j.cor[0], [3, 5, 6, 6]);
});

test('Furto: troca os Bolsos (vazio também); o Fundo Falso não pega', () => {
  const j = montar([['furto'], ['fundo']], j => { j.bolso = [2, 5]; j.vez = 1; });
  Regras.aplicar(j, 1, { tipo: 'carta', carta: 'fundo' });
  j.vez = 0;
  assert.strictEqual(Regras.aplicar(j, 0, { tipo: 'carta', carta: 'furto' }).ok, true);
  assert.deepStrictEqual(j.bolso, [5, 2]);
  assert.strictEqual(j.armada[1], 'fundo', 'o Fundo Falso continua armado');
  const k = montar([['furto'], []], j => { j.bolso = [null, 4]; });
  Regras.aplicar(k, 0, { tipo: 'carta', carta: 'furto' });
  assert.deepStrictEqual(k.bolso, [4, null]);
  const v = montar([['furto'], []], () => {});
  assert.strictEqual(Regras.aplicar(v, 0, { tipo: 'carta', carta: 'furto' }).ok, false, 'dois Bolsos vazios');
});

test('Lacre: o próximo efeito do rival é gasto sem agir (Pressa, Pausa, Sobrecarga e blefe desvirado)', () => {
  for (const c of ['pressa', 'pausa', 'coringa', 'virar']) {
    const j = montar([['lacre'], [c, 'fundo']], j => { j.mesa = [{ id: 1, v: 2 }, { id: 2, v: 3 }, { id: 3, v: 4 }]; });
    Regras.aplicar(j, 0, { tipo: 'carta', carta: 'lacre' });
    j.vez = 1;
    const antes = j.mesa.map(d => d.v).join();
    const r = Regras.aplicar(j, 1, { tipo: 'carta', carta: c, idx: 0 });
    assert.deepStrictEqual(r, { ok: true, resultado: 'carta' }, c);
    assert.strictEqual(j.vez, 1, `${c}: a vez continua com quem usou`);
    assert.strictEqual(j.cartas[1][c], 'usada'); assert.strictEqual(j.cartas[0].lacre, 'usada'); assert.strictEqual(j.armada[0], null);
    assert.strictEqual(j.extra[1], 0); assert.strictEqual(j.coringa[1], false); assert.strictEqual(j.mesa.map(d => d.v).join(), antes);
    assert.ok(j.eventos.some(e => e.tipo === 'revelou' && e.c === 'lacre'));
    assert.ok(!j.eventos.some(e => e.tipo === 'carta'), `${c}: nenhum aviso de efeito`);
  }
  // blefe: virar um efeito, depois desvirar contra o Lacre
  const b = montar([['lacre'], ['ajuste', 'fundo']], j => { j.mesa = [{ id: 1, v: 2 }, { id: 2, v: 3 }]; });
  Regras.aplicar(b, 0, { tipo: 'carta', carta: 'lacre' }); b.vez = 1;
  assert.strictEqual(Regras.aplicar(b, 1, { tipo: 'virar', carta: 'ajuste' }).ok, true);
  Regras.aplicar(b, 1, { tipo: 'carta', carta: 'ajuste', idx: 0, delta: 1 });
  assert.strictEqual(b.mesa[0].v, 2, 'o Ajuste desvirado não agiu');
  // a Sobrecarga na hora de disparar
  const s = montar([['lacre'], ['sobrecarga']], j => { j.vez = 1; j.cor[1] = [1, 2, 3, 4]; j.fase = 'decidir'; });
  s.armada[0] = 'lacre'; s.cartas[0].lacre = 'armada';
  Regras.aplicar(s, 1, { tipo: 'carta', carta: 'sobrecarga' });
  Regras.aplicar(s, 1, { tipo: 'disparar' });
  assert.strictEqual(s.pts[1], Regras.pontos(4), 'disparo de 4 sem o +2');
  // o Lacre é armadilha escondida: o rival vê "?" e pode blefar com ela no deck
  const v = Regras.visaoDe(montar([['lacre'], []], j => { Regras.aplicar(j, 0, { tipo: 'carta', carta: 'lacre' }); }), 1);
  assert.strictEqual(v.armada[1], 'oculta');
});

test('cartas novas: deck válido, loja e servidor reconhecem', () => {
  assert.ok(Regras.deckValido(['pausa', 'reverso', 'furto']));
  assert.ok(Regras.deckValido(['lacre', 'fundo', 'pausa']));
  assert.ok(!Regras.deckValido(['lacre', 'fundo', 'ancora']), 'no máximo 2 armadilhas');
  for (const [c, preco] of [['reverso', 90], ['furto', 100], ['pausa', 130], ['lacre', 140]]) {
    assert.strictEqual(Regras.precoDe('cartas', c), preco); assert.ok(Regras.ORDEM.includes(c));
  }
});

test('Pedágio: +2 na meta 12 e na 16 (docs/balanceamento-cartas.md §10)', () => {
  for (const [meta, ganho] of [[12, 2], [16, 2]]) {
    const j = Regras.criarPartida({ decks: [['pedagio'], []], vez: 0, meta, rng: rngDe(5) });
    Regras.aplicar(j, 0, { tipo: 'carta', carta: 'pedagio' });
    j.vez = 1; j.fase = 'decidir'; j.cor[1] = [1, 2, 3];
    Regras.aplicar(j, 1, { tipo: 'disparar' });
    assert.strictEqual(j.pts[0], ganho, `meta ${meta}`);
    assert.strictEqual(Regras.pedagioDe(meta), ganho);
  }
});

test('Interferência: só tira ponto de quem está na frente ou empatado; atrás, continua armada', () => {
  const caso = (ptsDisp, ptsDono) => {
    const j = Regras.criarPartida({ decks: [['interferencia'], []], vez: 0, meta: 16, rng: rngDe(8) });
    Regras.aplicar(j, 0, { tipo: 'carta', carta: 'interferencia' });
    j.pts = [ptsDono, ptsDisp]; j.vez = 1; j.fase = 'decidir'; j.cor[1] = [1, 2, 3, 4];
    Regras.aplicar(j, 1, { tipo: 'disparar' });
    return j;
  };
  const frente = caso(5, 3), empate = caso(3, 3), atras = caso(2, 3);
  assert.strictEqual(frente.pts[1], 5 + Regras.pontos(4) - 1); assert.strictEqual(frente.cartas[0].interferencia, 'usada');
  assert.strictEqual(empate.pts[1], 3 + Regras.pontos(4) - 1); assert.strictEqual(empate.cartas[0].interferencia, 'usada');
  assert.strictEqual(atras.pts[1], 2 + Regras.pontos(4), 'atrás: o disparo vale inteiro');
  assert.strictEqual(atras.armada[0], 'interferencia', 'atrás: ela continua armada');
});

// Desafio do blefe (docs/balanceamento-cartas.md §13): 2 por acertar, 2 para o rival por errar, 3 pelo blefe que passa
const rivalComVirada = (virada, deck1 = ['ajuste', 'fundo', 'pausa']) => {
  const j = Regras.criarPartida({ decks: [['coringa', 'pressa', 'interferencia'], deck1], vez: 1, rng: rngDe(5) });
  if (Regras.CARTAS[virada].tipo === 'efeito') Regras.virarCarta(j, 1, virada); else Regras.usarCarta(j, 1, virada);
  Regras.proximo(j);
  return j;
};
test('Desafio: era blefe -> a carta dele se perde e quem desafiou ganha 2', () => {
  const j = rivalComVirada('ajuste');
  assert.deepStrictEqual(Regras.podeDesafiar(j, 0), { ok: true });
  assert.strictEqual(Regras.visaoDe(j, 0).armada[1], 'oculta');
  const r = Regras.aplicar(j, 0, { tipo: 'desafiar' });
  assert.ok(r.ok);
  assert.deepStrictEqual(j.pts, [2, 0]);
  assert.strictEqual(j.cartas[1].ajuste, 'perdida');
  assert.strictEqual(j.armada[1], null);
  assert.strictEqual(j.fase, 'pegar'); assert.strictEqual(j.vez, 0);   // desafiar não gasta a vez: depois pega o dado
  assert.ok(j.eventos.some(e => e.tipo === 'desafio' && e.blefe));
});
test('Desafio: era armadilha -> ela continua armada, agora à vista, e o rival ganha 2; não se desafia duas vezes', () => {
  const j = rivalComVirada('fundo');
  assert.ok(Regras.aplicar(j, 0, { tipo: 'desafiar' }).ok);
  assert.deepStrictEqual(j.pts, [0, 2]);
  assert.strictEqual(j.armada[1], 'fundo');
  assert.strictEqual(Regras.visaoDe(j, 0).armada[1], 'fundo');   // à vista para quem desafiou
  assert.strictEqual(Regras.podeDesafiar(j, 0).ok, false);
  assert.strictEqual(Regras.aplicar(j, 0, { tipo: 'desafiar' }).ok, false);
  // e ela ainda age: guardar no Bolso faz o dado cair
  const idx = 0; Regras.aplicar(j, 0, { tipo: 'pegar', idx, modo: 'guardar' });
  assert.strictEqual(j.bolso[0], null);
});
test('Desafio: o Espelho (à vista), fora da vez, depois de pegar o dado ou no 2.º dado da Pressa não se desafia', () => {
  const j = Regras.criarPartida({ decks: [['coringa'], ['espelho', 'ajuste']], vez: 1, rng: rngDe(6) });
  Regras.usarCarta(j, 1, 'espelho', 0); Regras.proximo(j);
  assert.strictEqual(Regras.podeDesafiar(j, 0).ok, false);
  const k = rivalComVirada('ajuste');
  assert.strictEqual(Regras.aplicar(k, 1, { tipo: 'desafiar' }).ok, false);   // fora da vez (e a carta é dele)
  Regras.aplicar(k, 0, { tipo: 'pegar', idx: 0 });
  if (k.fase === 'destino') assert.strictEqual(Regras.podeDesafiar(k, 0).ok, false);
});
test('Blefe que passa: desvirar um blefe que ninguém desafiou rende 3; só a partir da vez seguinte à que virou', () => {
  const j = Regras.criarPartida({ decks: [['coringa'], ['pausa', 'fundo']], vez: 1, rng: rngDe(7) });
  assert.ok(Regras.aplicar(j, 1, { tipo: 'virar', carta: 'pausa' }).ok);
  assert.strictEqual(Regras.podeUsar(j, 1, 'pausa').ok, false);   // na mesma vez, não
  Regras.proximo(j); Regras.proximo(j);
  assert.strictEqual(j.vez, 1);
  assert.strictEqual(Regras.aplicar(j, 1, { tipo: 'carta', carta: 'pausa' }).ok, true);
  assert.deepStrictEqual(j.pts, [0, 3]);
  assert.strictEqual(j.vez, 0);   // a Pausa agiu: passou a vez
});
test('Desafio e blefe podem fechar a partida', () => {
  const j = rivalComVirada('ajuste'); j.pts = [j.meta - 1, 0];
  assert.strictEqual(Regras.aplicar(j, 0, { tipo: 'desafiar' }).resultado, 'fim');
  assert.strictEqual(j.vencedor, 0);
  const k = rivalComVirada('fundo'); k.pts = [0, k.meta - 2];
  assert.strictEqual(Regras.aplicar(k, 0, { tipo: 'desafiar' }).resultado, 'fim');
  assert.strictEqual(k.vencedor, 1);
  const b = Regras.criarPartida({ decks: [['coringa'], ['pausa', 'fundo']], vez: 1, rng: rngDe(8) });
  Regras.virarCarta(b, 1, 'pausa'); Regras.proximo(b); Regras.proximo(b); b.pts = [0, b.meta - 3];
  assert.strictEqual(Regras.usarCarta(b, 1, 'pausa'), 'fim');
  assert.strictEqual(b.vencedor, 1);
});

// ---------- v0.12: metas 16, 20 e 24; o Coringa troca a frente ----------
test('Metas: 16, 20 e 24 (16 é o padrão); 12 e lixo viram 16; partidas longas rendem mais moedas', () => {
  assert.deepStrictEqual(Regras.METAS, [16, 20, 24]);
  assert.strictEqual(Regras.criarPartida({ decks: [[], []], rng: rngDe(1) }).meta, 16);
  for (const [m, v] of [[16, 16], [20, 20], [24, 24], ['24', 24], [12, 16], [undefined, 16], ['muito', 16]]) assert.strictEqual(Regras.metaValida(m), v);
  const a = Regras.moedasDaVitoria(10, 0, 30, 16).total, b = Regras.moedasDaVitoria(10, 0, 30, 20).total, c = Regras.moedasDaVitoria(10, 0, 30, 24).total;
  assert.deepStrictEqual([a, b, c], [10, 13, 15]);
  assert.strictEqual(Regras.moedasDaVitoria(10, 0, 30, 12).total, 10);   // partida guardada de antes da v0.12: sem desconto
});
test('Coringa: o dado que romperia troca a frente; a corrente não cresce nem completa o 6.º', () => {
  const j = Regras.criarPartida({ decks: [['coringa'], []], vez: 0, rng: rngDe(3) });
  j.cor[0] = [1, 2, 3, 4, 5]; j.bolso[0] = 3; j.mesa = [{ id: 70, v: 1 }, { id: 71, v: 1 }];
  Regras.usarCarta(j, 0, 'coringa');
  Regras.pegarPara(j, 0, 0, 'corrente');
  assert.deepStrictEqual(j.cor[0], [1, 2, 3, 4, 1]);
  assert.strictEqual(j.coringa[0], false);
  assert.strictEqual(j.pts[0], 0);
  // um dado que já sincroniza entra normal (e gasta o Coringa)
  const k = Regras.criarPartida({ decks: [['coringa'], []], vez: 0, rng: rngDe(4) });
  k.cor[0] = [2, 3]; k.mesa = [{ id: 72, v: 4 }, { id: 73, v: 1 }];
  Regras.usarCarta(k, 0, 'coringa'); Regras.pegarPara(k, 0, 0, 'corrente');
  assert.deepStrictEqual(k.cor[0], [2, 3, 4]);
  assert.strictEqual(k.coringa[0], false);
});
