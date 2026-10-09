'use strict';
// Caos no servidor: rotas com corpos malformados, arquivos que não podem vazar, WebSocket com lixo e
// sequências ao acaso de entrar/sair/cair/voltar/jogar/desistir/revanche com 3 contas e 2 abas.
const test = require('node:test');
const assert = require('node:assert');
const WebSocket = require('ws');
const { criarApp } = require('../app');
const { BancoMemoria } = require('../banco');
const { rngDe, jogadaAoAcaso } = require('./ajuda');

const espera = ms => new Promise(r => setTimeout(r, ms));
async function subir(tempos = {}) {
  const errosServidor = [];
  const original = console.error;
  console.error = (...a) => { errosServidor.push(a.map(String).join(' ')); };
  const { criarServidor, salas } = criarApp({ banco: new BancoMemoria(), segredo: 'segredo-de-caos-com-32-caracteres!!', tempos, limites: { contas: 1e4, entrar: 1e4, solo: 1e4, ws: 1e6 } });
  const servidor = criarServidor();
  await new Promise(r => servidor.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  return {
    base, salas, servidor, errosServidor, ws: base.replace('http', 'ws') + '/ws',
    fechar: async () => { console.error = original; salas.fechar(); servidor.wss.clients.forEach(c => c.terminate()); await new Promise(r => servidor.close(r)); },
  };
}
async function http(base, metodo, rota, corpo, cab = {}) {
  const r = await fetch(base + rota, { method: metodo, headers: { 'content-type': 'application/json', ...cab }, body: corpo });
  return { status: r.status, texto: await r.text() };
}

test('rotas: corpos malformados nunca dão 500, e arquivos do servidor não vazam', async () => {
  const s = await subir();
  try {
    const conta = JSON.parse((await http(s.base, 'POST', '/api/contas', JSON.stringify({ nome: 'Caos', senha: 'senha123' }))).texto);
    const aut = { authorization: 'Bearer ' + conta.token };
    const rotas = [['POST', '/api/contas'], ['POST', '/api/entrar'], ['GET', '/api/eu'], ['PUT', '/api/eu/dados'], ['GET', '/api/ranking'],
      ['POST', '/api/loja/comprar'], ['POST', '/api/loja/usar'], ['POST', '/api/solo'], ['POST', '/api/salas'], ['GET', '/api/salas/ABCDEF'], ['GET', '/api/salas/%00'], ['DELETE', '/api/eu']];
    const corpos = [undefined, '', '{', 'null', '[]', '"texto"', '123', '{"nome":{"$gt":""},"senha":["x"]}', JSON.stringify({ nome: 'a'.repeat(5000), senha: 'b' }),
      JSON.stringify({ tipo: 'cartas', id: ['espelho'] }), JSON.stringify({ tipo: 'icones', id: { toString: 1 } }), JSON.stringify({ decks: 'x', rec: [], cfg: 5 }),
      JSON.stringify({ decks: [[1, 2, 3]], rec: { partidas: 'NaN' }, cfg: { meta: '16' } }), JSON.stringify({ nivel: 'esperto', venceu: 'sim', margem: 1e309, rodadas: -1, meta: 12, momentos: 2 }),
      JSON.stringify({ meta: 'muito' }), 'x'.repeat(20000)];
    for (const [m, r] of rotas) for (const c of corpos) for (const cab of [{}, aut, { authorization: 'Bearer lixo' }]) {
      const res = await http(s.base, m, r, m === 'GET' ? undefined : c, cab);
      assert.ok(res.status < 500, `${m} ${r} com ${String(c).slice(0, 40)} deu ${res.status}: ${res.texto.slice(0, 120)}`);
    }
    // arquivos que não podem sair: banco, código do servidor, configuração
    for (const r of ['/dados/banco.json', '/servidor/app.js', '/package.json', '/.git/config', '/js/../servidor/banco.js', '/js/%2e%2e/servidor/banco.js',
      '/shared/..%2fservidor%2fbanco.js', '/css/..%5c..%5cpackage.json', '/node_modules/ws/package.json', '/railway.json', '/arte/retratos.json']) {
      const res = await http(s.base, 'GET', r);
      assert.ok(res.status === 404 || res.status === 400 || res.status === 403, `${r} respondeu ${res.status}`);
      assert.ok(!/senha_hash|require\(|"dependencies"/.test(res.texto), `${r} vazou conteúdo`);
    }
    for (const r of ['/', '/index.html', '/js/jogo.js', '/js/retratos.js', '/shared/regras.js', '/css/estilo.css']) assert.strictEqual((await http(s.base, 'GET', r)).status, 200, r);
    assert.deepStrictEqual(s.errosServidor.filter(e => !/entity|JSON/.test(e)), []);
  } finally { await s.fechar(); }
});

function cliente(url) {
  const ws = new WebSocket(url), c = { ws, msgs: [], aberto: false, ultimo: null };
  ws.on('open', () => { c.aberto = true; });
  ws.on('message', d => { const m = JSON.parse(d); c.msgs.push(m); if (m.tipo === 'estado') c.ultimo = m.jogo; });
  ws.on('error', () => {});
  ws.on('close', () => { c.aberto = false; });
  c.enviar = m => { if (c.aberto && ws.readyState === 1) ws.send(typeof m === 'string' ? m : JSON.stringify(m)); };
  return new Promise(r => ws.once('open', () => r(c)));
}

test('WebSocket: lixo e mensagens fora de ordem não derrubam nem travam', async () => {
  const s = await subir();
  try {
    const t = JSON.parse((await http(s.base, 'POST', '/api/contas', JSON.stringify({ nome: 'Lixo', senha: 'senha123' }))).texto).token;
    const c = await cliente(s.ws);
    for (const m of ['', 'nada', '[]', 'null', '{"tipo":1}', '{"tipo":"acao"}', '{"tipo":"entrar","sala":{}}', Buffer.from([0, 255, 3])]) c.enviar(m);
    c.enviar({ tipo: 'ola', token: { a: 1 } }); c.enviar({ tipo: 'ola', token: 'x.y' });
    c.enviar({ tipo: 'ola', token: t });
    for (const m of [{ tipo: 'entrar', sala: ['A'], deck: 'ajuste' }, { tipo: 'entrar', sala: 'ZZZZZZ', deck: [] }, { tipo: 'entrar', sala: 'abc', deck: null },
      { tipo: 'acao', acao: { tipo: 'pegar', idx: 0 } }, { tipo: 'revanche', deck: 5 }, { tipo: 'desistir' }, { tipo: 'sair' }, { tipo: 'sair' }, { tipo: '__proto__' }, { tipo: 'constructor' }]) c.enviar(m);
    // a resposta ao "ola" é assíncrona (busca a conta no banco): se a mensagem grande chegar antes, a conexão fecha sem ela
    for (let i = 0; i < 100 && !c.msgs.some(m => m.tipo === 'ola'); i++) await espera(20);
    c.ws.send('x'.repeat(10000));   // maior que o limite: o servidor fecha esta conexão, e só ela
    await espera(300);
    assert.deepStrictEqual(s.errosServidor, []);
    assert.ok(c.msgs.some(m => m.tipo === 'ola'));
    const d = await cliente(s.ws); d.enviar({ tipo: 'ola', token: t }); await espera(150);
    assert.ok(d.msgs.some(m => m.tipo === 'ola'), 'o servidor continua atendendo');
  } finally { await s.fechar(); }
});

test('sequências ao acaso: 3 contas, 2 abas, quedas e voltas, e toda partida em andamento termina', async () => {
  const s = await subir({ esperaReconexao: 400, limiteVez: 1500 });
  try {
    const rng = rngDe(+process.env.CAOS_SEMENTE || 2024);
    const contas = [];
    for (const nome of ['Xavi', 'Yara', 'Zeca']) contas.push(JSON.parse((await http(s.base, 'POST', '/api/contas', JSON.stringify({ nome, senha: 'senha123' }))).texto));
    const codigos = [];
    for (const c of contas.slice(0, 2)) codigos.push(JSON.parse((await http(s.base, 'POST', '/api/salas', '{}', { authorization: 'Bearer ' + c.token })).texto).sala.codigo);
    const abas = [];
    const novaAba = async i => { const c = await cliente(s.ws); c.conta = i; c.enviar({ tipo: 'ola', token: contas[i].token }); await espera(20); abas.push(c); return c; };
    for (let i = 0; i < 3; i++) { await novaAba(i); if (i < 2) await novaAba(i); }
    const decks = [['ajuste', 'pressa', 'coringa'], ['interferencia', 'ancora', 'virar'], []];
    for (let passo = 0; passo < 700; passo++) {
      const vivas = abas.filter(a => a.aberto);
      const a = vivas[Math.floor(rng() * vivas.length)];
      const x = rng();
      if (x < 0.08) a.enviar({ tipo: 'entrar', sala: codigos[Math.floor(rng() * codigos.length)], deck: decks[a.conta] });
      else if (x < 0.11) a.enviar({ tipo: 'sair' });
      else if (x < 0.14) { a.ws.terminate(); await novaAba(a.conta); }
      else if (x < 0.16) a.enviar({ tipo: 'desistir' });
      else if (x < 0.22) a.enviar({ tipo: 'revanche', deck: decks[a.conta] });
      else if (a.ultimo && a.ultimo.fase !== 'fim' && a.ultimo.vez === 0) a.enviar({ tipo: 'acao', acao: jogadaAoAcaso(a.ultimo, 0, rng) });
      else a.enviar({ tipo: 'acao', acao: { tipo: 'pegar', idx: Math.floor(rng() * 5) } });
      await espera(rng() < 0.2 ? 30 : 3);
    }
    await espera(300);
    assert.deepStrictEqual(s.errosServidor, [], 'o servidor registrou erros');
    // o que ficou em andamento termina: quem está conectado joga; quem caiu perde por W.O.
    for (let volta = 0; volta < 3000; volta++) {
      const emJogo = [...s.salas.salas.values()].filter(x => x.jogo && x.jogo.fase !== 'fim');
      if (!emJogo.length) break;
      for (const a of abas.filter(x => x.aberto && x.ultimo && x.ultimo.fase !== 'fim' && x.ultimo.vez === 0)) a.enviar({ tipo: 'acao', acao: jogadaAoAcaso(a.ultimo, 0, rng) });
      await espera(5);
    }
    const presas = [...s.salas.salas.values()].filter(x => x.jogo && x.jogo.fase !== 'fim');
    assert.strictEqual(presas.length, 0, 'ficou partida sem terminar: ' + presas.map(x => x.codigo + ' ' + x.jogadores.map(j => j.nome + (j.ws ? '' : '(caiu)')).join('×')).join(', '));
    for (const sala of s.salas.salas.values()) if (sala.jogo) assert.ok(sala.premiada, `sala ${sala.codigo} terminou sem prêmio`);
    const partidas = [...s.salas.salas.values()].reduce((t, x) => t + (x.partidas || 0), 0);
    assert.ok(partidas >= 1, 'nenhuma partida chegou a começar: o teste não testou nada');
    if (process.env.CAOS_VERBOSO) console.log(`partidas: ${partidas}`);
    assert.deepStrictEqual(s.errosServidor, []);
  } finally { await s.fechar(); }
});

test('erros que tiram da sala vêm marcados (o cliente sai da partida fantasma)', async () => {
  const s = await subir();
  try {
    const t = JSON.parse((await http(s.base, 'POST', '/api/contas', JSON.stringify({ nome: 'Duas', senha: 'senha123' }))).texto).token;
    const u = JSON.parse((await http(s.base, 'POST', '/api/contas', JSON.stringify({ nome: 'Abas', senha: 'senha123' }))).texto).token;
    const codigo = JSON.parse((await http(s.base, 'POST', '/api/salas', '{}', { authorization: 'Bearer ' + t })).texto).sala.codigo;
    const a1 = await cliente(s.ws), a2 = await cliente(s.ws), b = await cliente(s.ws);
    for (const [c, tk] of [[a1, t], [a2, t], [b, u]]) c.enviar({ tipo: 'ola', token: tk });
    await espera(80);
    a1.enviar({ tipo: 'entrar', sala: codigo, deck: [] }); b.enviar({ tipo: 'entrar', sala: codigo, deck: [] });
    await espera(120);
    a2.enviar({ tipo: 'entrar', sala: codigo, deck: [] });   // a mesma conta em outra aba toma o lugar
    await espera(120);
    assert.ok(a1.msgs.some(m => m.tipo === 'erro' && m.codigo === 'sala'), 'a aba antiga recebe o aviso marcado');
    assert.ok(a2.ultimo && a2.ultimo.fase !== 'fim', 'a aba nova recebe a partida');
    b.enviar({ tipo: 'entrar', sala: 'QQQQQQ', deck: [] });
    await espera(80);
    assert.ok(b.msgs.some(m => m.tipo === 'erro' && m.codigo === 'sala' && /não encontrada/.test(m.erro)));
    assert.deepStrictEqual(s.errosServidor, []);
  } finally { await s.fechar(); }
});

test('nível de rival herdado (constructor), pico de texto na importação e CORS nos erros de JSON', async () => {
  const { criarServidor, salas } = criarApp({ banco: new BancoMemoria(), segredo: 'segredo-de-caos-com-32-caracteres!!', origens: ['https://exemplo.app'], limites: { contas: 1e4, entrar: 1e4, solo: 1e4, ws: 1e6 } });
  const servidor = criarServidor();
  await new Promise(r => servidor.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  try {
    const nova = JSON.parse((await http(base, 'POST', '/api/contas', JSON.stringify({ nome: 'Herdado', senha: 'senha123', importar: { rating: 1100, pico: 'muito' } }))).texto);
    assert.strictEqual(nova.conta.solo_pico, 1100, 'pico de texto não vira NaN');
    const aut = { authorization: 'Bearer ' + nova.token };
    for (const nivel of ['constructor', 'toString', '__proto__', 'online']) {
      const r = await http(base, 'POST', '/api/solo', JSON.stringify({ nivel, venceu: true, margem: 2, rodadas: 4, meta: 12, momentos: 0 }), aut);
      assert.strictEqual(r.status, 400, `nível ${nivel} recusado`);
    }
    const eu = JSON.parse((await http(base, 'GET', '/api/eu', undefined, aut)).texto);
    assert.ok(Number.isFinite(eu.conta.moedas) && Number.isFinite(eu.conta.solo_rating) && Number.isFinite(eu.conta.xp));
    const ruim = await fetch(base + '/api/entrar', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://exemplo.app' }, body: '{' });
    assert.strictEqual(ruim.status, 400);
    assert.strictEqual(ruim.headers.get('access-control-allow-origin'), 'https://exemplo.app');
  } finally { salas.fechar(); await new Promise(r => servidor.close(r)); }
});
