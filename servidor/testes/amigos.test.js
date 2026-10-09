// nomes únicos (sem diferença de maiúsculas, acentos e separadores), amizades, ranking entre amigos e a fila por rating
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const WebSocket = require('ws');
const { criarApp } = require('../app');
const { BancoMemoria, criarBanco } = require('../banco');
const { Fila } = require('../fila');
const { chaveDoNome, hashSenha } = require('../autenticacao');

const SEGREDO = 'segredo-de-teste-com-32-caracteres!!';
const espera = ms => new Promise(r => setTimeout(r, ms));

async function subir(opcoes = {}) {
  const banco = opcoes.banco || new BancoMemoria();
  const { criarServidor, salas, fila } = criarApp({ banco, segredo: SEGREDO, limites: { contas: 1000, entrar: 1000, amigos: 1000, nomes: 1000, ws: 100000 }, ...opcoes, banco });
  const servidor = criarServidor();
  await new Promise(r => servidor.listen(0, r));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const api = async (metodo, rota, corpo, token) => {
    const r = await fetch(base + rota, { method: metodo, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined });
    return { status: r.status, ...(await r.json().catch(() => ({}))) };
  };
  const fechar = async () => { salas.fechar(); fila.fechar(); servidor.wss.clients.forEach(c => c.terminate()); servidor.wss.close(); await new Promise(r => { servidor.closeAllConnections && servidor.closeAllConnections(); servidor.close(r); }); };
  return { base, api, banco, salas, fila, fechar, ws: base.replace('http', 'ws') + '/ws' };
}
async function cliente(url, token) {
  const ws = new WebSocket(url), msgs = [];
  ws.on('message', d => msgs.push(JSON.parse(d)));
  await new Promise((ok, erro) => { ws.once('open', ok); ws.once('error', erro); });
  const c = {
    ws, msgs, enviar: m => ws.send(JSON.stringify(m)), fechar: () => ws.close(),
    async esperar(pred, ms = 4000) {
      const ate = Date.now() + ms;
      for (;;) {
        const i = msgs.findIndex(pred);
        if (i >= 0) return msgs.splice(0, i + 1).pop();
        if (Date.now() > ate) throw new Error('não chegou: ' + pred.toString() + ' · últimas: ' + JSON.stringify(msgs.slice(-3)).slice(0, 300));
        await espera(20);
      }
    },
  };
  c.enviar({ tipo: 'ola', token });
  await c.esperar(m => m.tipo === 'ola');
  return c;
}
const conta = async (s, nome) => { const r = await s.api('POST', '/api/contas', { nome, senha: 'senha123' }); assert.strictEqual(r.status, 200, r.erro); return r; };

test('nome único: maiúsculas, acentos e separadores não fazem um nome novo', async () => {
  assert.strictEqual(chaveDoNome('José_Silva'), chaveDoNome('jose.silva'));
  assert.strictEqual(chaveDoNome('ANA'), chaveDoNome('ana'));
  const s = await subir();
  try {
    await conta(s, 'José.Silva');
    for (const nome of ['josé.silva', 'JOSE.SILVA', 'Jose_Silva', 'josesilva', 'José-Silva', ' jose.silva ']) {
      const r = await s.api('POST', '/api/contas', { nome, senha: 'senha123' });
      assert.strictEqual(r.status, 409, `${nome} deveria ser recusado`);
      assert.match(r.erro, /já existe/);
    }
    const parecido = await s.api('POST', '/api/contas', { nome: 'JOSESILVA', senha: 'senha123' });
    assert.match(parecido.erro, /José\.Silva/, 'a mensagem mostra com qual nome ele bate');
    // o login acha a conta por qualquer forma do nome
    for (const nome of ['jose.silva', 'JOSÉ_SILVA']) assert.strictEqual((await s.api('POST', '/api/entrar', { nome, senha: 'senha123' })).conta.nome, 'José.Silva');
    // a tela pergunta enquanto a pessoa digita
    assert.strictEqual((await s.api('GET', '/api/nomes/Jose-Silva')).livre, false);
    assert.strictEqual((await s.api('GET', '/api/nomes/Maria')).livre, true);
    assert.strictEqual((await s.api('GET', '/api/nomes/a.%20b')).livre, false);
    // separadores não contam para o tamanho mínimo, e × não é letra
    assert.strictEqual((await s.api('POST', '/api/contas', { nome: 'a._', senha: 'senha123' })).status, 400);
    assert.strictEqual((await s.api('POST', '/api/contas', { nome: 'ab×cd', senha: 'senha123' })).status, 400);
    // duas criações ao mesmo tempo com o mesmo nome: só uma passa
    const rs = await Promise.all(['Corrida', 'CORRIDA', 'córrida'].map(nome => s.api('POST', '/api/contas', { nome, senha: 'senha123' })));
    assert.strictEqual(rs.filter(r => r.status === 200).length, 1);
  } finally { await s.fechar(); }
});

test('contas antigas (chave só em minúsculas) passam para a chave nova sem perder o login', async () => {
  const banco = new BancoMemoria();
  const h = await hashSenha('senha123');
  banco.contas.push({ id: 1, nome: 'Júlia', chave: 'júlia', senha_hash: h.hash, sal: h.sal, rating: 1000, pico: 1000, partidas: 0, vitorias: 0, moedas: 0, xp: 0,
    cartas: [], dados: ['marfim'], icones: ['bolinha'], mesas: ['salvia'], ativo: { dado: 'marfim', icone: 'bolinha', mesa: 'salvia' }, extras: {} });
  // duas antigas que viram a mesma chave nova: a segunda fica com a antiga e entra pelo próprio nome
  for (const [id, nome] of [[2, 'Ana.B'], [3, 'ana_b']]) banco.contas.push({ ...banco.contas[0], id, nome, chave: nome.toLowerCase() });
  banco.proximo = 4;
  await banco.iniciar();
  assert.deepStrictEqual(banco.contas.map(c => c.chave), ['julia', 'anab', 'ana_b']);
  assert.strictEqual((await banco.contaPorNome('ana_b')).nome, 'ana_b');
  assert.strictEqual((await banco.contaPorNome('ANA.B')).nome, 'Ana.B');
  const s = await subir({ banco });
  try {
    assert.strictEqual((await s.api('POST', '/api/entrar', { nome: 'julia', senha: 'senha123' })).conta.nome, 'Júlia');
    assert.strictEqual((await s.api('POST', '/api/contas', { nome: 'Julia', senha: 'senha123' })).status, 409);
  } finally { await s.fechar(); }
});

test('amizade: pedir pelo nome, aceitar, pedido cruzado vira amizade, desfazer', async () => {
  const s = await subir();
  try {
    const A = await conta(s, 'Alice'), B = await conta(s, 'Bruno'), C = await conta(s, 'Carla');
    assert.strictEqual((await s.api('POST', '/api/amigos', { nome: 'ninguem' }, A.token)).status, 404);
    assert.strictEqual((await s.api('POST', '/api/amigos', { nome: 'ALICE' }, A.token)).status, 400);
    const p = await s.api('POST', '/api/amigos', { nome: 'bruno' }, A.token);   // o nome em qualquer forma
    assert.strictEqual(p.estado, 'pedido');
    assert.deepStrictEqual(p.enviados.map(x => x.nome), ['Bruno']);
    assert.strictEqual((await s.api('POST', '/api/amigos', { nome: 'Bruno' }, A.token)).status, 409);
    const doB = await s.api('GET', '/api/amigos', null, B.token);
    assert.deepStrictEqual(doB.recebidos.map(x => x.nome), ['Alice']);
    assert.strictEqual(doB.amigos.length, 0);
    const aceito = await s.api('POST', '/api/amigos/aceitar', { nome: 'Alice' }, B.token);
    assert.deepStrictEqual(aceito.amigos.map(x => x.nome), ['Alice']);
    assert.strictEqual(aceito.recebidos.length, 0);
    assert.match((await s.api('POST', '/api/amigos', { nome: 'Alice' }, B.token)).erro, /já são amigos/);
    // pedido cruzado: Carla pede Alice, Alice pede Carla -> amigas
    await s.api('POST', '/api/amigos', { nome: 'Alice' }, C.token);
    assert.strictEqual((await s.api('POST', '/api/amigos', { nome: 'Carla' }, A.token)).estado, 'amigos');
    assert.deepStrictEqual((await s.api('GET', '/api/amigos', null, A.token)).amigos.map(x => x.nome).sort(), ['Bruno', 'Carla']);
    // ninguém vê a senha nem o id dos outros
    const amigo = (await s.api('GET', '/api/amigos', null, A.token)).amigos[0];
    assert.deepStrictEqual(Object.keys(amigo).sort(), ['icone', 'nome', 'onde', 'online', 'partidas', 'rating', 'titulo', 'vitorias']);
    // desfazer (vale para recusar e cancelar também)
    const depois = await s.api('POST', '/api/amigos/remover', { nome: 'Bruno' }, A.token);
    assert.deepStrictEqual(depois.amigos.map(x => x.nome), ['Carla']);
    assert.strictEqual((await s.api('GET', '/api/amigos', null, B.token)).amigos.length, 0);
    assert.strictEqual((await s.api('POST', '/api/amigos/aceitar', { nome: 'Bruno' }, A.token)).status, 404);
    // pedidos cruzados ao mesmo tempo não criam duas linhas
    await Promise.all([s.api('POST', '/api/amigos', { nome: 'Bruno' }, A.token), s.api('POST', '/api/amigos', { nome: 'Alice' }, B.token)]);
    assert.strictEqual(s.banco.amizades.filter(x => [x.de, x.para].sort().join() === [A.conta.id, B.conta.id].sort().join()).length, 1);
  } finally { await s.fechar(); }
});

test('amigos online, aviso de pedido ao vivo e chamar um amigo para a sala', async () => {
  const s = await subir();
  try {
    const A = await conta(s, 'Dora'), B = await conta(s, 'Edu'), C = await conta(s, 'Fabi');
    await s.api('POST', '/api/amigos', { nome: 'Edu' }, A.token);
    const b = await cliente(s.ws, B.token);
    // o pedido chega ao vivo para quem está com o jogo aberto
    await s.api('POST', '/api/amigos', { nome: 'Edu' }, A.token).catch(() => {});
    await s.api('POST', '/api/amigos/remover', { nome: 'Edu' }, A.token);
    await s.api('POST', '/api/amigos', { nome: 'Edu' }, A.token);
    const aviso = await b.esperar(m => m.tipo === 'amigos' && m.evento === 'pedido');
    assert.strictEqual(aviso.nome, 'Dora');
    await s.api('POST', '/api/amigos/aceitar', { nome: 'Dora' }, B.token);
    let lista = await s.api('GET', '/api/amigos', null, A.token);
    assert.strictEqual(lista.amigos[0].online, true);
    // Dora cria a sala e chama Edu, que recebe o convite com o código
    const a = await cliente(s.ws, A.token);
    a.enviar({ tipo: 'chamar', nome: 'Edu' });
    assert.match((await a.esperar(m => m.tipo === 'aviso')).erro, /Crie uma sala/);
    const { sala } = await s.api('POST', '/api/salas', {}, A.token);
    a.enviar({ tipo: 'entrar', sala: sala.codigo, deck: [] });
    await a.esperar(m => m.tipo === 'sala');
    assert.strictEqual((await s.api('GET', '/api/amigos', null, B.token)).amigos[0].onde, 'esperando');
    a.enviar({ tipo: 'chamar', nome: 'edu' });
    await a.esperar(m => m.tipo === 'chamou');
    const chamado = await b.esperar(m => m.tipo === 'chamado');
    assert.strictEqual(chamado.sala, sala.codigo); assert.strictEqual(chamado.de, 'Dora');
    a.enviar({ tipo: 'chamar', nome: 'Edu' });
    assert.match((await a.esperar(m => m.tipo === 'aviso')).erro, /acabou de chamar/);
    // quem não está com o jogo aberto não pode ser chamado; e o aviso não derruba a sala de quem chamou
    a.enviar({ tipo: 'chamar', nome: 'Fabi' });
    assert.match((await a.esperar(m => m.tipo === 'aviso')).erro, /não está com o jogo aberto/);
    assert.ok(!a.msgs.some(m => m.tipo === 'erro'));
    // quem não é amigo, mas está online, pode ser chamado (o convite diz que não é amigo)
    const c = await cliente(s.ws, C.token);
    a.enviar({ tipo: 'chamar', nome: 'Fabi' });
    await a.esperar(m => m.tipo === 'chamou');
    const chamadoC = await c.esperar(m => m.tipo === 'chamado');
    assert.strictEqual(chamadoC.amigo, false); assert.strictEqual(chamado.amigo, true);
    c.fechar();
    // Edu entra pela chamada e a partida começa
    b.enviar({ tipo: 'entrar', sala: chamado.sala, deck: [] });
    await b.esperar(m => m.tipo === 'estado');
    assert.strictEqual((await s.api('GET', '/api/amigos', null, A.token)).amigos[0].onde, 'jogando');
    b.fechar(); await espera(100);
    lista = await s.api('GET', '/api/amigos', null, A.token);
    assert.strictEqual(lista.amigos[0].online, false);
    a.fechar();
  } finally { await s.fechar(); }
});

test('quem está online: sem conta, só quantos; com conta, a lista (amigos e quem pode jogar primeiro) e chamadas com limite', async () => {
  const s = await subir();
  try {
    const nomes = ['Gabi', 'Heitor', 'Iris', 'Joel', 'Kika', 'Leo', 'Malu', 'Nina'], cs = {};
    for (const n of nomes) cs[n] = await conta(s, n);
    assert.deepStrictEqual(await s.api('GET', '/api/online'), { status: 200, total: 0 });
    const ws = {};
    for (const n of nomes) ws[n] = await cliente(s.ws, cs[n].token);
    const extra = await cliente(s.ws, cs.Gabi.token);   // duas abas da mesma conta contam uma vez
    const sem = await s.api('GET', '/api/online');
    assert.deepStrictEqual(Object.keys(sem).sort(), ['status', 'total']);   // sem conta: nenhum nome
    assert.strictEqual(sem.total, 8);
    // Heitor é amigo da Gabi; Iris pediu amizade a ela
    await s.api('POST', '/api/amigos', { nome: 'Heitor' }, cs.Gabi.token); await s.api('POST', '/api/amigos/aceitar', { nome: 'Gabi' }, cs.Heitor.token);
    await s.api('POST', '/api/amigos', { nome: 'Gabi' }, cs.Iris.token);
    const r = await s.api('GET', '/api/online', null, cs.Gabi.token);
    assert.strictEqual(r.total, 8);
    assert.strictEqual(r.jogadores.length, 7, 'a própria conta não aparece');
    assert.strictEqual(r.jogadores[0].nome, 'Heitor', 'amigo primeiro');
    assert.strictEqual(r.jogadores.find(x => x.nome === 'Iris').pedido, 'recebido');
    assert.ok(!('id' in r.jogadores[0]));
    // limite: 5 chamadas por minuto para quem não é amigo (para amigo não conta)
    const { sala } = await s.api('POST', '/api/salas', {}, cs.Gabi.token);
    ws.Gabi.enviar({ tipo: 'entrar', sala: sala.codigo, deck: [] }); await ws.Gabi.esperar(m => m.tipo === 'sala');
    for (const n of ['Iris', 'Joel', 'Kika', 'Leo', 'Malu']) { ws.Gabi.enviar({ tipo: 'chamar', nome: n }); await ws.Gabi.esperar(m => m.tipo === 'chamou'); }
    ws.Gabi.enviar({ tipo: 'chamar', nome: 'Nina' });
    assert.match((await ws.Gabi.esperar(m => m.tipo === 'aviso')).erro, /muitas chamadas/);
    ws.Gabi.enviar({ tipo: 'chamar', nome: 'Heitor' });
    await ws.Gabi.esperar(m => m.tipo === 'chamou');
    for (const c of Object.values(ws).concat(extra)) c.fechar();
    await espera(150);
    assert.strictEqual((await s.api('GET', '/api/online')).total, 0);
  } finally { await s.fechar(); }
});

test('ranking entre amigos e a posição no global', async () => {
  const s = await subir();
  try {
    const nomes = ['Gil', 'Hana', 'Ivo', 'Juca'], cs = [];
    for (const n of nomes) cs.push(await conta(s, n));
    const ratings = { Gil: 1040, Hana: 1100, Ivo: 980, Juca: 1200 };
    for (const c of cs) await s.banco.atualizarConta(c.conta.id, { rating: ratings[c.conta.nome], partidas: 3, vitorias: 1 });
    // Gil é amigo de Hana e Ivo (não de Juca)
    for (const n of ['Hana', 'Ivo']) { await s.api('POST', '/api/amigos', { nome: n }, cs[0].token); await s.api('POST', '/api/amigos/aceitar', { nome: 'Gil' }, cs[nomes.indexOf(n)].token); }
    const r = await s.api('GET', '/api/ranking/amigos', null, cs[0].token);
    assert.deepStrictEqual(r.ranking.map(x => `${x.posicao}.${x.nome}`), ['1.Hana', '2.Gil', '3.Ivo']);
    assert.ok(r.ranking.find(x => x.nome === 'Gil').eu);
    assert.deepStrictEqual(r.global, { posicao: 3, total: 4 });
    const global = await s.api('GET', '/api/ranking');
    assert.deepStrictEqual(global.ranking.map(x => x.nome), ['Juca', 'Hana', 'Gil', 'Ivo']);
    assert.ok(!('id' in global.ranking[0]), 'o ranking público não mostra ids');
    // quem ainda não jogou online não tem posição no global, mas aparece entre os amigos
    const novo = await conta(s, 'Lia');
    assert.deepStrictEqual((await s.api('GET', '/api/ranking/amigos', null, novo.token)).global, { posicao: null, total: 4 });
  } finally { await s.fechar(); }
});

// o mesmo com Postgres de verdade (TESTE_DATABASE_URL): migração das chaves antigas, nome único, amizades e ranking
test('Postgres: chaves antigas migram, nome único, amizades e posição no ranking', { skip: !process.env.TESTE_DATABASE_URL && 'defina TESTE_DATABASE_URL' }, async () => {
  const banco = await criarBanco({ url: process.env.TESTE_DATABASE_URL });
  await banco.pool.query('TRUNCATE contas, partidas, amizades RESTART IDENTITY');
  await banco.pool.query("DELETE FROM config WHERE chave = 'chaves_v2'");
  // três contas do jeito antigo (chave = nome em minúsculas); duas delas viram a mesma chave nova
  const h = await hashSenha('senha123'), velha = (nome, chave) => banco.pool.query(
    `INSERT INTO contas (nome, chave, senha_hash, sal, cartas, dados, icones, mesas, ativo) VALUES ($1, $2, $3, $4, '[]', '["marfim"]', '["bolinha"]', '["salvia"]', '{"dado":"marfim","icone":"bolinha","mesa":"salvia"}')`,
    [nome, chave, h.hash, h.sal]);
  await velha('Júlia', 'júlia'); await velha('Ana.B', 'ana.b'); await velha('ana_b', 'ana_b');
  await banco.migrarChaves();
  const chaves = (await banco.pool.query('SELECT nome, chave FROM contas ORDER BY id')).rows.map(r => `${r.nome}=${r.chave}`);
  assert.deepStrictEqual(chaves, ['Júlia=julia', 'Ana.B=anab', 'ana_b=ana_b']);   // a segunda que colide fica com a chave antiga
  assert.strictEqual((await banco.contaPorNome('JULIA')).nome, 'Júlia');
  assert.strictEqual((await banco.contaPorNome('ana_b')).nome, 'ana_b');        // a antiga continua entrando pelo próprio nome
  assert.strictEqual((await banco.contaPorNome('ana.b')).nome, 'Ana.B');
  const s = await subir({ banco });
  try {
    assert.strictEqual((await s.api('POST', '/api/contas', { nome: 'JÚLIA', senha: 'senha123' })).status, 409);
    const rs = await Promise.all(['Rafa', 'RAFA', 'rafá'].map(nome => s.api('POST', '/api/contas', { nome, senha: 'senha123' })));
    assert.strictEqual(rs.filter(r => r.status === 200).length, 1);
    const R = rs.find(r => r.status === 200), J = await s.api('POST', '/api/entrar', { nome: 'julia', senha: 'senha123' });
    const S = await conta(s, 'Sara');
    await s.api('POST', '/api/amigos', { nome: 'Júlia' }, R.token);
    assert.deepStrictEqual((await s.api('GET', '/api/amigos', null, J.token)).recebidos.map(x => x.nome), [R.conta.nome]);
    assert.strictEqual((await s.api('POST', '/api/amigos', { nome: R.conta.nome }, J.token)).estado, 'amigos');   // pedir de volta aceita
    await s.api('POST', '/api/amigos', { nome: 'Sara' }, R.token);
    await s.api('POST', '/api/amigos/aceitar', { nome: R.conta.nome }, S.token);
    await banco.atualizarConta(R.conta.id, { rating: 1050, partidas: 2, vitorias: 1 });
    await banco.atualizarConta(S.conta.id, { rating: 1100, partidas: 2, vitorias: 2 });
    const rk = await s.api('GET', '/api/ranking/amigos', null, R.token);
    assert.deepStrictEqual(rk.ranking.map(x => x.nome), ['Sara', R.conta.nome, 'Júlia']);
    assert.deepStrictEqual(rk.global, { posicao: 2, total: 2 });
    await s.api('POST', '/api/amigos/remover', { nome: 'Sara' }, R.token);
    assert.deepStrictEqual((await s.api('GET', '/api/amigos', null, R.token)).amigos.map(x => x.nome), ['Júlia']);
    await Promise.all([s.api('POST', '/api/amigos', { nome: 'Sara' }, R.token), s.api('POST', '/api/amigos', { nome: R.conta.nome }, S.token)]);
    assert.strictEqual((await banco.pool.query('SELECT count(*)::int AS n FROM amizades WHERE (de = $1 AND para = $2) OR (de = $2 AND para = $1)', [R.conta.id, S.conta.id])).rows[0].n, 1);
  } finally { await s.fechar(); await banco.fechar(); }
});

test('fila por rating: a janela abre com a espera e a meta separa as filas', () => {
  let t = 0;
  const f = new Fila({ agora: () => t, opcoes: { janelaInicial: 100, crescePorSegundo: 10, janelaMaxima: 400, qualquerApos: 60_000 } });
  f.entrar({ id: 1, rating: 1000 }); f.entrar({ id: 2, rating: 1250 }); f.entrar({ id: 3, rating: 1080, meta: 16 });
  assert.deepStrictEqual(f.parear(), []);                   // 250 de diferença, janela 100; a meta 16 não junta com a 12
  t = 10_000;                                               // janela 200
  assert.deepStrictEqual(f.parear(), []);
  t = 15_000;                                               // janela 250
  assert.deepStrictEqual(f.parear().map(p => p.map(e => e.id)), [[1, 2]]);
  assert.strictEqual(f.tamanho, 1);
  // o mais próximo em rating ganha, e entrar de novo não zera a espera
  t = 0; const g = new Fila({ agora: () => t });
  g.entrar({ id: 1, rating: 1000 }); g.entrar({ id: 2, rating: 1090 }); g.entrar({ id: 3, rating: 1010 });
  t = 5000; g.entrar({ id: 1, rating: 1000 });
  assert.strictEqual(g.entradas.get(1).desde, 0);
  assert.deepStrictEqual(g.parear().map(p => p.map(e => e.id)), [[1, 3]]);
  // depois de qualquerApos, qualquer rival serve
  t = 0; const h = new Fila({ agora: () => t, opcoes: { qualquerApos: 30_000 } });
  h.entrar({ id: 1, rating: 800 }); h.entrar({ id: 2, rating: 1600 });
  t = 29_000; assert.deepStrictEqual(h.parear(), []);
  t = 31_000; assert.strictEqual(h.parear().length, 1);
});

test('fila desligada responde que não está aberta; ligada, junta dois e começa a partida', async () => {
  const off = await subir();
  try {
    assert.deepStrictEqual(await off.api('GET', '/api/config'), { status: 200, fila: false });
    const A = await conta(off, 'Mia');
    const a = await cliente(off.ws, A.token);
    a.enviar({ tipo: 'procurar', meta: 12, deck: [] });
    const av = await a.esperar(m => m.tipo === 'aviso');
    assert.strictEqual(av.codigo, 'fila');
    a.fechar();
  } finally { await off.fechar(); }
  const on = await subir({ fila: true, filaOpcoes: { intervalo: 50 } });
  try {
    assert.strictEqual((await on.api('GET', '/api/config')).fila, true);
    const A = await conta(on, 'Nico'), B = await conta(on, 'Olga');
    const a = await cliente(on.ws, A.token), b = await cliente(on.ws, B.token);
    a.enviar({ tipo: 'procurar', meta: 12, deck: [] });
    await a.esperar(m => m.tipo === 'procurando');
    b.enviar({ tipo: 'procurar', meta: 12, deck: ['nao-existe'] });
    assert.match((await b.esperar(m => m.tipo === 'aviso')).erro, /Deck/);
    b.enviar({ tipo: 'procurar', meta: 12, deck: [] });
    const [achouA, achouB] = await Promise.all([a.esperar(m => m.tipo === 'achou'), b.esperar(m => m.tipo === 'achou')]);
    assert.strictEqual(achouA.sala, achouB.sala); assert.strictEqual(achouA.rival, 'Olga');
    await Promise.all([a.esperar(m => m.tipo === 'estado'), b.esperar(m => m.tipo === 'estado')]);
    assert.strictEqual(on.fila.tamanho, 0);
    // cancelar e fechar a aba tiram da fila
    const C = await conta(on, 'Paulo');
    const c = await cliente(on.ws, C.token);
    c.enviar({ tipo: 'procurar', meta: 12, deck: [] }); await c.esperar(m => m.tipo === 'procurando');
    c.enviar({ tipo: 'cancelarBusca' }); await c.esperar(m => m.tipo === 'buscaCancelada');
    assert.strictEqual(on.fila.tamanho, 0);
    c.enviar({ tipo: 'procurar', meta: 12, deck: [] }); await c.esperar(m => m.tipo === 'procurando');
    c.fechar(); await espera(100);
    assert.strictEqual(on.fila.tamanho, 0);
    a.fechar(); b.fechar();
  } finally { await on.fechar(); }
});
