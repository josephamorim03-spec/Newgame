// preparação: antes de cada partida online, os dois escolhem o deck ao mesmo tempo.
// Do rival, só a contagem de cartas e se confirmou — nunca quais cartas (nem pelo tráfego).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const WebSocket = require('ws');
const { criarApp } = require('../app');
const { BancoMemoria } = require('../banco');

const SEGREDO = 'segredo-de-teste-com-32-caracteres!!';
const espera = ms => new Promise(r => setTimeout(r, ms));

async function subir(tempos = {}) {
  const banco = new BancoMemoria();
  const app = criarApp({ banco, segredo: SEGREDO, tempos: { escolha: 60_000, ...tempos }, limites: { contas: 1000, entrar: 1000, ws: 100000 } });
  const servidor = app.criarServidor();
  await new Promise(r => servidor.listen(0, r));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const api = async (metodo, rota, corpo, token) => {
    const r = await fetch(base + rota, { method: metodo, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined });
    return { status: r.status, ...(await r.json().catch(() => ({}))) };
  };
  const fechar = async () => { app.salas.fechar(); app.fila.fechar(); servidor.wss.clients.forEach(c => c.terminate()); servidor.wss.close(); await new Promise(r => { servidor.closeAllConnections && servidor.closeAllConnections(); servidor.close(r); }); };
  return { api, banco, salas: app.salas, fechar, ws: base.replace('http', 'ws') + '/ws' };
}
async function cliente(url, token) {
  const ws = new WebSocket(url), msgs = [], todas = [];
  ws.on('message', d => { const m = JSON.parse(d); msgs.push(m); todas.push(String(d)); });
  await new Promise((ok, erro) => { ws.once('open', ok); ws.once('error', erro); });
  const c = {
    ws, msgs, todas, enviar: m => ws.send(JSON.stringify(m)), fechar: () => ws.close(),
    async esperar(pred, ms = 4000) {
      const ate = Date.now() + ms;
      for (;;) {
        const i = msgs.findIndex(pred);
        if (i >= 0) return msgs.splice(0, i + 1).pop();
        if (Date.now() > ate) throw new Error('não chegou: ' + pred.toString() + ' · últimas: ' + JSON.stringify(msgs.slice(-3)).slice(0, 300));
        await espera(15);
      }
    },
  };
  c.enviar({ tipo: 'ola', token }); await c.esperar(m => m.tipo === 'ola');
  return c;
}
const conta = async (s, nome) => { const r = await s.api('POST', '/api/contas', { nome, senha: 'dado-forte-7' }); assert.strictEqual(r.status, 200, r.erro); return r; };
// Ana tem cartas que a Bia não tem (Espelho, Fundo Falso): se o nome delas aparecer no tráfego da Bia antes do começo, vazou
async function duas(s) {
  const A = await conta(s, 'Ana'), B = await conta(s, 'Bia');
  await s.banco.atualizarConta(A.conta.id, { cartas: A.conta.cartas.concat('espelho', 'fundo') });
  const { sala } = await s.api('POST', '/api/salas', {}, A.token);
  const a = await cliente(s.ws, A.token), b = await cliente(s.ws, B.token);
  a.enviar({ tipo: 'entrar', sala: sala.codigo, deck: ['ajuste'] });
  b.enviar({ tipo: 'entrar', sala: sala.codigo, deck: ['coringa', 'pressa'] });
  return { A, B, a, b, sala };
}

test('os dois escolhem ao mesmo tempo: cada um vê o próprio deck; do rival, só a contagem e o "pronto"', async () => {
  const s = await subir();
  try {
    const { a, b, sala } = await duas(s);
    const ea = await a.esperar(m => m.tipo === 'escolha'), eb = await b.esperar(m => m.tipo === 'escolha');
    assert.ok(ea.prazo > 55_000 && ea.prazo <= 60_000);
    assert.deepStrictEqual(ea.eu, { deck: ['ajuste'], pronto: false });
    assert.deepStrictEqual(eb.rival, { nome: 'Ana', cartas: 1, pronto: false });
    assert.strictEqual(s.salas.salas.get(sala.codigo).jogo, null, 'a partida ainda não começou');
    // Ana monta um deck com cartas que a Bia não tem e confirma; a Bia vê só "3 cartas, pronta"
    a.enviar({ tipo: 'deck', deck: ['espelho', 'fundo', 'ajuste'] });
    assert.strictEqual((await b.esperar(m => m.tipo === 'escolha' && m.rival.cartas === 3)).rival.pronto, false);
    a.enviar({ tipo: 'deck', deck: ['espelho', 'fundo', 'ajuste'], pronto: true });
    assert.strictEqual((await b.esperar(m => m.tipo === 'escolha' && m.rival.pronto)).rival.cartas, 3);
    // desfazer a confirmação e confirmar de novo
    a.enviar({ tipo: 'deck', deck: ['espelho', 'fundo', 'ajuste'] });
    await b.esperar(m => m.tipo === 'escolha' && !m.rival.pronto);
    a.enviar({ tipo: 'deck', deck: ['espelho', 'fundo', 'ajuste'], pronto: true });
    await b.esperar(m => m.tipo === 'escolha' && m.rival.pronto);
    assert.ok(!b.todas.some(t => /espelho|fundo/i.test(t)), 'nenhum nome de carta da Ana passou pela conexão da Bia antes do começo');
    // a Bia confirma: a partida começa com os decks escolhidos
    b.enviar({ tipo: 'deck', deck: ['coringa'], pronto: true });
    const est = await b.esperar(m => m.tipo === 'estado');
    assert.deepStrictEqual(est.jogo.decks, [['coringa'], ['espelho', 'fundo', 'ajuste']]);
    a.fechar(); b.fechar();
  } finally { await s.fechar(); }
});

test('deck inválido não muda nada; depois do tempo, a partida começa com o que cada um tinha', async () => {
  const s = await subir({ escolha: 600 });
  try {
    const { a, b } = await duas(s);
    await a.esperar(m => m.tipo === 'escolha'); await b.esperar(m => m.tipo === 'escolha');
    b.enviar({ tipo: 'deck', deck: ['espelho'] });   // a Bia não tem o Espelho
    assert.match((await b.esperar(m => m.tipo === 'aviso')).erro, /Deck inválido/);
    b.enviar({ tipo: 'deck', deck: ['ajuste', 'coringa', 'pressa', 'virar'] });   // 4 cartas
    await b.esperar(m => m.tipo === 'aviso');
    assert.ok(!b.msgs.some(m => m.tipo === 'erro'), 'aviso, não erro: ninguém sai da sala');
    a.enviar({ tipo: 'deck', deck: ['fundo'] });   // escolheu mas não confirmou
    const est = await a.esperar(m => m.tipo === 'estado', 4000);
    assert.deepStrictEqual(est.jogo.decks, [['fundo'], ['coringa', 'pressa']]);
    a.fechar(); b.fechar();
  } finally { await s.fechar(); }
});

test('alguém sai no meio da preparação: ela é cancelada e quem ficou é avisado; voltando, recomeça', async () => {
  const s = await subir();
  try {
    const { A, a, b, sala } = await duas(s);
    await a.esperar(m => m.tipo === 'escolha'); await b.esperar(m => m.tipo === 'escolha');
    a.ws.terminate();
    const c = await b.esperar(m => m.tipo === 'escolha' && m.cancelada);
    assert.match(c.motivo, /Ana/);
    const a2 = await cliente(s.ws, A.token);
    a2.enviar({ tipo: 'entrar', sala: sala.codigo, deck: ['ajuste'] });
    await a2.esperar(m => m.tipo === 'escolha' && !m.cancelada);
    await b.esperar(m => m.tipo === 'escolha' && !m.cancelada);
    a2.fechar(); b.fechar();
  } finally { await s.fechar(); }
});

test('a revanche também passa pela preparação, com o deck da partida anterior já marcado', async () => {
  const s = await subir();
  try {
    const { a, b } = await duas(s);
    await a.esperar(m => m.tipo === 'escolha'); await b.esperar(m => m.tipo === 'escolha');
    a.enviar({ tipo: 'deck', deck: ['fundo', 'ajuste'], pronto: true }); b.enviar({ tipo: 'deck', deck: ['pressa'], pronto: true });
    await a.esperar(m => m.tipo === 'estado'); await b.esperar(m => m.tipo === 'estado');
    a.enviar({ tipo: 'desistir' });
    await a.esperar(m => m.tipo === 'fim'); await b.esperar(m => m.tipo === 'fim');
    a.enviar({ tipo: 'revanche' }); b.enviar({ tipo: 'revanche' });
    const ea = await a.esperar(m => m.tipo === 'escolha');
    assert.deepStrictEqual(ea.eu.deck, ['fundo', 'ajuste']);
    assert.deepStrictEqual((await b.esperar(m => m.tipo === 'escolha')).rival, { nome: 'Ana', cartas: 2, pronto: false });
    a.fechar(); b.fechar();
  } finally { await s.fechar(); }
});
