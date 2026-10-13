// o rating no online contra os dois jeitos de farmar (servidor/salas.js, premiar): sair antes da 3ª Mesa conta como
// derrota para quem sai (e não dá nada a quem fica); vencer contas novas rende rating e moedas só 2 vezes por dia.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { Salas } = require('../salas');
const { criarBanco } = require('../banco');

async function montar() {
  const banco = await criarBanco({ url: '' });
  const salas = new Salas({ banco, trava: (id, fn) => fn(), tempos: { escolha: 0 } });
  const ws = () => ({ readyState: 1, msgs: [], send(m) { this.msgs.push(JSON.parse(m)); } });
  // uma partida em que `sai` desiste na Mesa `rodada`; devolve os prêmios [de a, de b]
  const partida = async (a, b, sai, rodada) => {
    const sala = salas.criar(a), wa = ws(), wb = ws();
    await salas.entrar(wa, a, { sala: sala.codigo, deck: [] });
    await salas.entrar(wb, b, { sala: sala.codigo, deck: [] });
    sala.jogo.rodada = rodada;
    await salas.desistir([wa, wb][sai], [a, b][sai]);
    return [wa, wb].map(w => w.msgs.find(m => m.tipo === 'fim').premio);
  };
  return { banco, salas, partida };
}

test('sair antes da 3ª Mesa: quem sai perde rating como numa derrota; quem fica não ganha', async () => {
  const { banco, salas, partida } = await montar();
  const a = await banco.criarConta('Ana', 'x'), b = await banco.criarConta('Bia', 'x');
  const [pa, pb] = await partida(a, b, 1, 1);
  assert.strictEqual(pa.rating, 1000, 'quem ficou não ganha (contra a conta descartável que desiste no primeiro lance)');
  assert.ok(pb.rating < 1000, `quem saiu perdeu (${pb.rating})`);
  assert.match(pb.motivo, /conta como derrota/);
  assert.strictEqual(pa.moedas.total, 0);
  salas.fechar();
});

test('vencer contas novas rende rating e moedas só 2 vezes por dia; contra conta com partidas, segue valendo', async () => {
  const { banco, salas, partida } = await montar();
  const f = await banco.criarConta('Fabio', 'x');
  const ratings = [];
  for (const nome of ['Nova1', 'Nova2', 'Nova3', 'Nova4']) {
    const n = await banco.criarConta(nome, 'x');
    const [pf] = await partida(await banco.contaPorId(f.id), n, 1, 3);   // a nova sai na 3ª Mesa: já vale
    ratings.push(pf.rating);
    if (ratings.length > 2) {
      assert.match(pf.motivo, /2 contas novas/);
      assert.strictEqual(pf.xpGanho, 0, 'nem XP');
      assert.strictEqual(pf.tarefas.moedas, 0, 'nem tarefas do dia');
    } else assert.ok(pf.xpGanho > 0, 'as que valem dão XP');
  }
  assert.ok(ratings[1] > ratings[0] && ratings[0] > 1000, `as duas primeiras valem (${ratings})`);
  assert.strictEqual(ratings[2], ratings[1], 'a terceira não mexe no rating');
  assert.strictEqual(ratings[3], ratings[1], 'nem a quarta');
  assert.strictEqual((await banco.contaPorId(f.id)).vitorias, 2, 'nem soma vitória no ranking');
  // uma conta que já jogou 5 partidas não é nova: vale como sempre
  const veterana = await banco.criarConta('Vera', 'x');
  await banco.atualizarConta(veterana.id, { partidas: 5 });
  const [pf] = await partida(await banco.contaPorId(f.id), await banco.contaPorId(veterana.id), 1, 3);
  assert.ok(pf.rating > ratings[1], 'contra conta com partidas, o rating sobe');
  salas.fechar();
});

test('W.O. na hora não amadurece a conta nova: 5 desistências antes da 3ª Mesa e ela segue nova', async () => {
  const { banco, salas, partida } = await montar();
  const f = await banco.criarConta('Flora', 'x'), d = await banco.criarConta('Descartavel', 'x'), ajuda = await banco.criarConta('Ajuda', 'x');
  for (let k = 0; k < 5; k++) await partida(await banco.contaPorId(ajuda.id), await banco.contaPorId(d.id), 1, 1);   // a descartável sai na hora
  assert.strictEqual((await banco.contaPorId(d.id)).partidas, 5);
  // a Flora já venceu 2 contas novas hoje: a descartável, com 5 partidas que não valeram, ainda é nova (fica no teto)
  await banco.atualizarConta(f.id, { extras: { vitoriasNovas: { dia: new Date().toISOString().slice(0, 10), n: 2 } } });
  const [pf] = await partida(await banco.contaPorId(f.id), await banco.contaPorId(d.id), 1, 3);
  assert.strictEqual(pf.rating, 1000, 'sem rating');
  assert.match(pf.motivo, /2 contas novas/);
  salas.fechar();
});
