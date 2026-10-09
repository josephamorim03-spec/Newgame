// a própria conta: trocar senha, sair de todos os aparelhos, apagar (LGPD), privacidade; presença ao vivo;
// limites e cabeçalhos de segurança; healthcheck que olha o banco
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const WebSocket = require('ws');
const { criarApp } = require('../app');
const { BancoMemoria, criarBanco } = require('../banco');

const SEGREDO = 'segredo-de-teste-com-32-caracteres!!';
const espera = ms => new Promise(r => setTimeout(r, ms));

async function subir(opcoes = {}) {
  const banco = opcoes.banco || new BancoMemoria();
  const app = criarApp({ banco, segredo: SEGREDO, limites: { contas: 1000, entrar: 1000, amigos: 1000, nomes: 1000, ws: 100000, ...(opcoes.limites || {}) }, ...opcoes, banco });
  const servidor = app.criarServidor();
  await new Promise(r => servidor.listen(0, r));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const api = async (metodo, rota, corpo, token) => {
    const r = await fetch(base + rota, { method: metodo, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined });
    return { status: r.status, cabecalhos: r.headers, ...(await r.json().catch(() => ({}))) };
  };
  const fechar = async () => { app.salas.fechar(); app.fila.fechar(); servidor.wss.clients.forEach(c => c.terminate()); servidor.wss.close(); await new Promise(r => { servidor.closeAllConnections && servidor.closeAllConnections(); servidor.close(r); }); };
  return { base, api, banco, fechar, ws: base.replace('http', 'ws') + '/ws' };
}
// um aparelho conectado: guarda as mensagens e avisa quando a conexão fecha
async function aparelho(url, token) {
  const ws = new WebSocket(url), msgs = [];
  let fechou = false;
  ws.on('message', d => msgs.push(JSON.parse(d)));
  ws.on('close', () => { fechou = true; });
  await new Promise((ok, erro) => { ws.once('open', ok); ws.once('error', erro); });
  const c = {
    ws, msgs, get fechou() { return fechou; }, enviar: m => ws.send(JSON.stringify(m)), fechar: () => ws.close(),
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
  if (token) { c.enviar({ tipo: 'ola', token }); c.resposta = await c.esperar(m => m.tipo === 'ola' || m.tipo === 'erro' || m.tipo === 'aviso'); }
  return c;
}
const conta = async (s, nome) => { const r = await s.api('POST', '/api/contas', { nome, senha: 'senha123' }); assert.strictEqual(r.status, 200, r.erro); return r; };

test('trocar a senha: confere a atual, os outros aparelhos saem, este continua', async () => {
  const s = await subir();
  try {
    const cel = await conta(s, 'Rita');
    const pc = await s.api('POST', '/api/entrar', { nome: 'rita', senha: 'senha123' });   // o mesmo login em outro aparelho
    const wsPc = await aparelho(s.ws, pc.token);
    assert.strictEqual((await s.api('POST', '/api/eu/senha', { atual: 'errada1', nova: 'nova-senha' }, cel.token)).status, 403);
    assert.strictEqual((await s.api('POST', '/api/eu/senha', { atual: 'senha123', nova: '123' }, cel.token)).status, 400);
    const r = await s.api('POST', '/api/eu/senha', { atual: 'senha123', nova: 'nova-senha' }, cel.token);
    assert.strictEqual(r.status, 200);
    // o token antigo (deste e do outro aparelho) não vale mais; o novo vale
    assert.strictEqual((await s.api('GET', '/api/eu', null, pc.token)).status, 401);
    assert.strictEqual((await s.api('GET', '/api/eu', null, cel.token)).status, 401);
    assert.strictEqual((await s.api('GET', '/api/eu', null, r.token)).status, 200);
    // a conexão aberta do outro aparelho fecha, e ao voltar com o token antigo ouve "entre de novo"
    await wsPc.esperar(m => m.tipo === 'sessao');
    for (let i = 0; i < 50 && !wsPc.fechou; i++) await espera(20);
    assert.ok(wsPc.fechou);
    const volta = await aparelho(s.ws, pc.token);
    assert.ok(volta.resposta.tipo === 'erro' && volta.resposta.sair);
    // a senha antiga não entra mais; a nova entra
    assert.strictEqual((await s.api('POST', '/api/entrar', { nome: 'Rita', senha: 'senha123' })).status, 401);
    assert.strictEqual((await s.api('POST', '/api/entrar', { nome: 'Rita', senha: 'nova-senha' })).status, 200);
    volta.fechar();
  } finally { await s.fechar(); }
});

test('sair de todos os aparelhos: todos os tokens antigos caem', async () => {
  const s = await subir();
  try {
    const a = await conta(s, 'Saulo');
    const b = await s.api('POST', '/api/entrar', { nome: 'Saulo', senha: 'senha123' });
    const r = await s.api('POST', '/api/eu/sair-de-tudo', {}, a.token);
    assert.strictEqual(r.status, 200);
    for (const t of [a.token, b.token]) assert.strictEqual((await s.api('GET', '/api/eu', null, t)).status, 401);
    assert.strictEqual((await s.api('GET', '/api/eu', null, r.token)).status, 200);
  } finally { await s.fechar(); }
});

test('apagar a conta: pede a senha, some com amizades, libera o nome e desiste da partida em andamento', async () => {
  const s = await subir();
  try {
    const A = await conta(s, 'Tina'), B = await conta(s, 'Ulisses');
    await s.api('POST', '/api/amigos', { nome: 'Ulisses' }, A.token); await s.api('POST', '/api/amigos/aceitar', { nome: 'Tina' }, B.token);
    const { sala } = await s.api('POST', '/api/salas', {}, A.token);
    const a = await aparelho(s.ws, A.token), b = await aparelho(s.ws, B.token);
    a.enviar({ tipo: 'entrar', sala: sala.codigo, deck: [] }); b.enviar({ tipo: 'entrar', sala: sala.codigo, deck: [] });
    await b.esperar(m => m.tipo === 'estado');
    assert.strictEqual((await s.api('POST', '/api/eu/apagar', { senha: 'errada1' }, A.token)).status, 403);
    assert.strictEqual((await s.api('POST', '/api/eu/apagar', { senha: 'senha123' }, A.token)).apagada, true);
    // a partida acaba (desistência) para quem ficou, e a conta sumiu
    const fim = await b.esperar(m => m.tipo === 'fim');
    assert.strictEqual(fim.premio.porDesistencia, true);
    assert.strictEqual((await s.api('GET', '/api/eu', null, A.token)).status, 401);
    assert.strictEqual((await s.api('GET', '/api/amigos', null, B.token)).amigos.length, 0);
    assert.strictEqual((await s.api('POST', '/api/entrar', { nome: 'Tina', senha: 'senha123' })).status, 401);
    assert.strictEqual((await s.api('GET', '/api/nomes/Tina')).livre, true, 'o nome fica livre de novo');
    b.fechar(); a.fechar();
  } finally { await s.fechar(); }
});

test('privacidade: quem não quer aparecer some do "Online agora" (menos para amigos) e "só amigos" recusa chamadas', async () => {
  const s = await subir();
  try {
    const V = await conta(s, 'Vera'), W = await conta(s, 'Wagner'), X = await conta(s, 'Xuxa');
    const vw = await aparelho(s.ws, V.token), ww = await aparelho(s.ws, W.token), xw = await aparelho(s.ws, X.token);
    await s.api('POST', '/api/amigos', { nome: 'Vera' }, X.token); await s.api('POST', '/api/amigos/aceitar', { nome: 'Xuxa' }, V.token);
    const p = await s.api('PUT', '/api/eu/privacidade', { visivel: false, chamadas: 'amigos' }, V.token);
    assert.deepStrictEqual(p.conta.extras.privacidade, { visivel: false, chamadas: 'amigos' });
    assert.ok(!(await s.api('GET', '/api/online', null, W.token)).jogadores.some(j => j.nome === 'Vera'), 'escondida para quem não é amigo');
    assert.ok((await s.api('GET', '/api/online', null, X.token)).jogadores.some(j => j.nome === 'Vera'), 'visível para a amiga');
    assert.strictEqual((await s.api('GET', '/api/online')).total, 3, 'o total anônimo conta todo mundo');
    // Wagner (não amigo) não consegue chamar; Xuxa (amiga) consegue
    for (const [ws, tok] of [[ww, W.token], [xw, X.token]]) { const { sala } = await s.api('POST', '/api/salas', {}, tok); ws.enviar({ tipo: 'entrar', sala: sala.codigo, deck: [] }); await ws.esperar(m => m.tipo === 'sala'); }
    ww.enviar({ tipo: 'chamar', nome: 'Vera' });
    assert.match((await ww.esperar(m => m.tipo === 'aviso')).erro, /só aceita chamadas de amigos/);
    xw.enviar({ tipo: 'chamar', nome: 'Vera' });
    await xw.esperar(m => m.tipo === 'chamou');
    await vw.esperar(m => m.tipo === 'chamado');
    // valores estranhos não estragam nada
    const lixo = await s.api('PUT', '/api/eu/privacidade', { visivel: 'sim', chamadas: '<b>', __proto__: { admin: true } }, V.token);
    assert.deepStrictEqual(lixo.conta.extras.privacidade, { visivel: false, chamadas: 'amigos' });
    for (const c of [vw, ww, xw]) c.fechar();
  } finally { await s.fechar(); }
});

test('presença ao vivo: quem está conectado recebe o novo total quando alguém entra ou sai', async () => {
  const s = await subir();
  try {
    const Y = await conta(s, 'Yuri'), Z = await conta(s, 'Zeca');
    const y = await aparelho(s.ws, Y.token);
    assert.strictEqual((await y.esperar(m => m.tipo === 'online')).total, 1);
    const z = await aparelho(s.ws, Z.token);
    assert.strictEqual((await y.esperar(m => m.tipo === 'online' && m.total === 2, 4000)).total, 2);
    z.fechar();
    assert.strictEqual((await y.esperar(m => m.tipo === 'online' && m.total === 1, 4000)).total, 1);
    y.fechar();
  } finally { await s.fechar(); }
});

test('limites: conexões por IP e teto geral da API; cabeçalhos de segurança; healthcheck olha o banco', async () => {
  const s = await subir({ limites: { conexoes: 3, api: 30 } });
  try {
    const abertas = [];
    for (let i = 0; i < 3; i++) abertas.push(await aparelho(s.ws));
    const quarta = await aparelho(s.ws);
    for (let i = 0; i < 50 && !quarta.fechou; i++) await espera(20);
    assert.ok(quarta.fechou, 'a 4ª conexão do mesmo IP é recusada');
    abertas.forEach(c => c.fechar()); await espera(100);
    const depois = await aparelho(s.ws);
    await espera(100);
    assert.ok(!depois.fechou, 'fechando as antigas, abre de novo');
    depois.fechar();
    // a página leva CSP e não pode ir para dentro de um iframe; a API não leva CSP
    const pagina = await fetch(s.base + '/');
    assert.match(pagina.headers.get('content-security-policy'), /script-src 'self'/);
    assert.match(pagina.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.strictEqual(pagina.headers.get('x-frame-options'), 'DENY');
    const saude = await s.api('GET', '/api/saude');
    assert.strictEqual(saude.cabecalhos.get('content-security-policy'), null);
    assert.strictEqual(saude.ok, true);
    // teto geral: 30 por minuto neste teste
    let r; for (let i = 0; i < 40; i++) r = await s.api('GET', '/api/config');
    assert.strictEqual(r.status, 429);
  } finally { await s.fechar(); }
  // banco fora do ar: o healthcheck responde 503
  class BancoFora extends BancoMemoria { async ping() { throw new Error('fora'); } }
  const f = await subir({ banco: new BancoFora() });
  try { const r = await f.api('GET', '/api/saude'); assert.strictEqual(r.status, 503); assert.strictEqual(r.ok, false); } finally { await f.fechar(); }
});

test('uma partida por conta: quem já está jogando não entra em outra sala (contra o farm do limite por dupla)', async () => {
  const s = await subir();
  try {
    const A = await conta(s, 'Abel'), B = await conta(s, 'Bela'), C = await conta(s, 'Caco');
    const s1 = (await s.api('POST', '/api/salas', {}, A.token)).sala, s2 = (await s.api('POST', '/api/salas', {}, C.token)).sala;
    const a1 = await aparelho(s.ws, A.token), b = await aparelho(s.ws, B.token), c = await aparelho(s.ws, C.token);
    a1.enviar({ tipo: 'entrar', sala: s1.codigo, deck: [] }); b.enviar({ tipo: 'entrar', sala: s1.codigo, deck: [] });
    await b.esperar(m => m.tipo === 'estado');
    c.enviar({ tipo: 'entrar', sala: s2.codigo, deck: [] }); await c.esperar(m => m.tipo === 'sala');
    const a2 = await aparelho(s.ws, A.token);   // outra aba da Abel tenta a segunda sala
    a2.enviar({ tipo: 'entrar', sala: s2.codigo, deck: [] });
    const erro = await a2.esperar(m => m.tipo === 'erro');
    assert.match(erro.erro, /já está numa partida/);
    assert.ok(!c.msgs.some(m => m.tipo === 'estado'), 'a segunda partida não começou');
    for (const x of [a1, a2, b, c]) x.fechar();
  } finally { await s.fechar(); }
});

test('senha errada 5 vezes tranca o login daquela conta (mesmo trocando de IP); as outras contas seguem', async () => {
  const s = await subir();
  try {
    await conta(s, 'Davi'); await conta(s, 'Eva');
    // os dois primeiros erros só dizem que não confere; do 3º ao 4º, quantas tentativas restam; o 5º trava
    const r = [];
    for (let i = 0; i < 5; i++) r.push(await s.api('POST', '/api/entrar', { nome: 'davi', senha: 'errada' + i }));
    assert.deepStrictEqual(r.map(x => x.status), [401, 401, 401, 401, 429]);
    assert.strictEqual(r[0].erro, 'Nome ou senha não conferem.');
    assert.match(r[2].erro, /Mais 2 tentativas antes de travar/);
    assert.match(r[3].erro, /Mais 1 tentativa antes de travar/);
    assert.match(r[4].erro, /travado por 15 minutos/);
    assert.ok(r[4].trancadaAte > Date.now() + 14 * 60_000 && r[4].codigo === 'trancada');
    // travada: nem a senha certa entra, e a resposta diz quanto falta (e manda Retry-After)
    const trancada = await s.api('POST', '/api/entrar', { nome: 'Davi', senha: 'senha123' });
    assert.strictEqual(trancada.status, 429);
    assert.match(trancada.erro, /travado por mais 15 min/);
    assert.ok(+trancada.cabecalhos.get('retry-after') > 800);
    assert.strictEqual((await s.api('POST', '/api/entrar', { nome: 'Eva', senha: 'senha123' })).status, 200);
    // nome que não existe responde igual (sem tranca e sem revelar nada)
    assert.strictEqual((await s.api('POST', '/api/entrar', { nome: 'Ninguem', senha: 'x' })).status, 401);
  } finally { await s.fechar(); }
});

test('trocar a senha e apagar a conta: senha atual errada conta para a trava, com aviso', async () => {
  const s = await subir();
  try {
    const L = await conta(s, 'Lara');
    let r;
    for (let i = 0; i < 3; i++) r = await s.api('POST', '/api/eu/senha', { atual: 'errada' + i, nova: 'nova-senha' }, L.token);
    assert.strictEqual(r.status, 403); assert.match(r.erro, /Mais 2 tentativas/);
    r = await s.api('POST', '/api/eu/apagar', { senha: 'errada' }, L.token);
    assert.match(r.erro, /Mais 1 tentativa/);
    r = await s.api('POST', '/api/eu/apagar', { senha: 'errada' }, L.token);
    assert.strictEqual(r.status, 429); assert.strictEqual(r.codigo, 'trancada');
    assert.strictEqual((await s.api('POST', '/api/eu/apagar', { senha: 'senha123' }, L.token)).status, 429, 'travada, nem a certa apaga');
    assert.strictEqual((await s.api('POST', '/api/entrar', { nome: 'Lara', senha: 'senha123' })).status, 429, 'o login também fica travado');
  } finally { await s.fechar(); }
});

test('limite por IP diz quanto esperar', async () => {
  const s = await subir({ limites: { entrar: 2 } });
  try {
    for (let i = 0; i < 2; i++) await s.api('POST', '/api/entrar', { nome: 'x', senha: 'y' });
    const r = await s.api('POST', '/api/entrar', { nome: 'x', senha: 'y' });
    assert.strictEqual(r.status, 429); assert.strictEqual(r.codigo, 'limite');
    assert.ok(r.espera > 0 && r.espera <= 60); assert.match(r.erro, /Tente de novo em (\d+ s|1 min)/);
    assert.strictEqual(r.cabecalhos.get('retry-after'), String(r.espera));
  } finally { await s.fechar(); }
});

test('partidas contra os rivais do jogo: teto de relatos por conta por dia', async () => {
  const s = await subir({ limites: { solo: 100000 } });
  try {
    const F = await conta(s, 'Fabio');
    const relato = { nivel: 'aprendiz', venceu: true, margem: 3, rodadas: 8, meta: 12, momentos: 2 };
    let r;
    for (let i = 0; i < 80; i++) { r = await s.api('POST', '/api/solo', relato, F.token); assert.strictEqual(r.status, 200, r.erro); }
    r = await s.api('POST', '/api/solo', relato, F.token);
    assert.strictEqual(r.status, 429);
    const eu = await s.api('GET', '/api/eu', null, F.token);
    assert.ok(eu.conta.moedas <= 300 + 600, 'moedas dentro do teto do dia');
  } finally { await s.fechar(); }
});

test('conexões: no máximo 5 abas por conta, prazo para se identificar, só a página do jogo abre pelo navegador', async () => {
  const s = await subir({ limites: { prazoOla: 300 } });
  try {
    const G = await conta(s, 'Gil');
    const abas = [];
    for (let i = 0; i < 5; i++) { const a = await aparelho(s.ws, G.token); assert.strictEqual(a.resposta.tipo, 'ola'); abas.push(a); }
    const sexta = await aparelho(s.ws, G.token);
    assert.strictEqual(sexta.resposta.tipo, 'aviso');
    assert.match(sexta.resposta.erro, /5 abas/);
    abas.forEach(a => a.fechar()); sexta.fechar();
    // sem "ola", a conexão fecha sozinha
    const muda = await aparelho(s.ws);
    for (let i = 0; i < 50 && !muda.fechou; i++) await espera(20);
    assert.ok(muda.fechou);
    // Origin de outro site é recusado; o do próprio endereço passa
    const fora = new WebSocket(s.ws, { headers: { origin: 'https://site-malicioso.example' } });
    const codigo = await new Promise(r => { fora.on('close', c => r(c)); fora.on('error', () => {}); });
    assert.strictEqual(codigo, 1008);
    const casa = new WebSocket(s.ws, { headers: { origin: s.base } });
    await new Promise((ok, erro) => { casa.on('open', ok); casa.on('error', erro); });
    casa.close();
    // a consulta pública de sala não mostra ids internos
    const { sala } = await s.api('POST', '/api/salas', {}, G.token);
    const r = await s.api('GET', '/api/salas/' + sala.codigo);
    assert.ok(!('dono' in r.sala));
  } finally { await s.fechar(); }
});

// o mesmo com Postgres de verdade (TESTE_DATABASE_URL): versão da sessão, apagar conta, quem fica fora do Online agora, ping
test('Postgres: senha nova derruba os tokens antigos, apagar some com a conta, oculto e ping', { skip: !process.env.TESTE_DATABASE_URL && 'defina TESTE_DATABASE_URL' }, async () => {
  const banco = await criarBanco({ url: process.env.TESTE_DATABASE_URL });
  await banco.pool.query('TRUNCATE contas, partidas, amizades RESTART IDENTITY');
  const s = await subir({ banco });
  try {
    assert.strictEqual((await s.api('GET', '/api/saude')).banco, 'postgres');
    const J = await conta(s, 'Joana'), K = await conta(s, 'Kleber');
    const r = await s.api('POST', '/api/eu/senha', { atual: 'senha123', nova: 'outra-senha' }, J.token);
    assert.strictEqual(r.status, 200);
    assert.strictEqual((await s.api('GET', '/api/eu', null, J.token)).status, 401);
    assert.strictEqual((await s.api('GET', '/api/eu', null, r.token)).status, 200);
    await s.api('PUT', '/api/eu/privacidade', { visivel: false }, r.token);
    const ws = [await aparelho(s.ws, r.token), await aparelho(s.ws, K.token)];
    assert.ok(!(await s.api('GET', '/api/online', null, K.token)).jogadores.some(j => j.nome === 'Joana'));
    await s.api('POST', '/api/amigos', { nome: 'Joana' }, K.token);
    assert.strictEqual((await s.api('POST', '/api/eu/apagar', { senha: 'outra-senha' }, r.token)).apagada, true);
    assert.strictEqual((await banco.pool.query('SELECT count(*)::int AS n FROM amizades')).rows[0].n, 0, 'amizades vão junto (CASCADE)');
    assert.strictEqual(await banco.contaPorNome('joana'), null);
    ws.forEach(x => x.fechar());
  } finally { await s.fechar(); await banco.fechar(); }
});
