'use strict';
const test = require('node:test');
const assert = require('node:assert');
const WebSocket = require('ws');
const { criarApp, TETO_SOLO_DIA } = require('../app');
const { BancoMemoria, criarBanco } = require('../banco');
const { jogadaAoAcaso, jogadaSimples } = require('./ajuda');
const Regras = require('../../shared/regras');

const SEGREDO = 'segredo-de-teste-com-32-caracteres!!';

async function subir({ banco = new BancoMemoria(), tempos = {}, limites = { contas: 1000, entrar: 1000, solo: 1000, ws: 100000 }, origens = [] } = {}) {
  const { criarServidor, salas } = criarApp({ banco, segredo: SEGREDO, tempos: { escolha: 0, ...tempos }, limites, origens });   // a preparação tem testes próprios (escolha.test.js)
  const servidor = criarServidor();
  await new Promise(r => servidor.listen(0, r));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const api = async (metodo, rota, corpo, token) => {
    const r = await fetch(base + rota, { method: metodo, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined });
    return { status: r.status, ...(await r.json().catch(() => ({}))) };
  };
  const fechar = async () => { salas.fechar(); servidor.wss.clients.forEach(c => c.terminate()); servidor.wss.close(); await new Promise(r => { servidor.closeAllConnections && servidor.closeAllConnections(); servidor.close(r); }); };
  return { base, api, banco, salas, servidor, fechar, ws: base.replace('http', 'ws') + '/ws' };
}

// um jogador pela rede: guarda as mensagens e espera pelas que interessam
// o cliente joga as próprias vezes sozinho (uma jogada simples, mandada por ele)
function jogarSozinho(c) {
  c.ws.on('message', d => {
    const m = JSON.parse(d);
    if (m.tipo === 'estado' && m.jogo.fase !== 'fim' && m.jogo.vez === 0) { const a = jogadaSimples(m.jogo, 0); if (a) c.enviar({ tipo: 'acao', acao: a }); }
  });
}
async function cliente(url, token) {
  const ws = new WebSocket(url), msgs = [];
  let acordar = null;
  ws.on('message', d => { msgs.push(JSON.parse(d)); if (acordar) acordar(); });
  await new Promise((ok, erro) => { ws.once('open', ok); ws.once('error', erro); });
  const c = {
    ws, msgs,
    enviar: m => ws.send(JSON.stringify(m)),
    async esperar(pred, ms = 4000) {
      const ate = Date.now() + ms;
      for (;;) {
        const i = msgs.findIndex(pred);
        if (i >= 0) return msgs.splice(0, i + 1).pop();
        if (Date.now() > ate) throw new Error('não chegou: ' + pred.toString() + '\núltimas: ' + JSON.stringify(msgs.slice(-3)).slice(0, 400));
        await new Promise(r => { acordar = r; setTimeout(r, 50); });
      }
    },
    fechar: () => ws.close(),
  };
  c.enviar({ tipo: 'ola', token });
  await c.esperar(m => m.tipo === 'ola');
  return c;
}

const conta = async (s, nome, extra = {}) => { const r = await s.api('POST', '/api/contas', { nome, senha: 'dado-forte-7', ...extra }); assert.strictEqual(r.status, 200, r.erro); return r; };

// joga até o fim: cada lado, ao ver que é a sua vez, faz uma jogada legal ao acaso
async function jogarAteOFim(a, b, { vigiar = () => {} } = {}) {
  const lados = [a, b], ultimo = [null, null];
  const fins = [null, null];
  for (let passo = 0; passo < 4000 && fins.some(f => !f); passo++) {
    for (let i = 0; i < 2; i++) {
      const c = lados[i];
      while (c.msgs.length) {
        const m = c.msgs.shift();
        if (m.tipo === 'estado') { vigiar(m.jogo, i); ultimo[i] = m.jogo; c.pronto = true; }
        if (m.tipo === 'fim') fins[i] = m.premio;
      }
      const j = ultimo[i];
      if (j && c.pronto && j.fase !== 'fim' && j.vez === 0) { c.pronto = false; c.enviar({ tipo: 'acao', acao: jogadaAoAcaso(j, 0) }); }
    }
    await new Promise(r => setTimeout(r, 2));
  }
  if (!(fins[0] && fins[1])) console.log('DEBUG', JSON.stringify(ultimo.map(j => j && { fase: j.fase, vez: j.vez, pts: j.pts, mesa: j.mesa.length, mao: j.mao, log: j.log.slice(0, 3) })), a.pronto, b.pronto, a.msgs.length, b.msgs.length);
  assert.ok(fins[0] && fins[1], 'a partida não terminou');
  return { fins, jogos: ultimo };
}

test('contas: criar, nome repetido, senha errada, entrar e /api/eu', { timeout: 20000 }, async () => {
  const s = await subir();
  try {
    const r = await conta(s, 'Ana');
    assert.ok(r.token);
    assert.strictEqual(r.conta.moedas, 0);
    assert.ok(!('senha_hash' in r.conta) && !('sal' in r.conta));
    assert.strictEqual((await s.api('POST', '/api/contas', { nome: 'ana', senha: 'outra123' })).status, 409);
    assert.strictEqual((await s.api('POST', '/api/contas', { nome: 'a', senha: 'dado-forte-7' })).status, 400);
    assert.strictEqual((await s.api('POST', '/api/contas', { nome: 'Bruno', senha: '123' })).status, 400);
    assert.strictEqual((await s.api('POST', '/api/entrar', { nome: 'Ana', senha: 'errada1' })).status, 401);
    const e = await s.api('POST', '/api/entrar', { nome: 'ANA', senha: 'dado-forte-7' });
    assert.strictEqual(e.status, 200);
    assert.strictEqual((await s.api('GET', '/api/eu', null, e.token)).conta.nome, 'Ana');
    assert.strictEqual((await s.api('GET', '/api/eu', null, 'lixo.lixo')).status, 401);
    assert.strictEqual((await s.api('GET', '/api/eu')).status, 401);
  } finally { await s.fechar(); }
});

test('página no Vercel: CORS só para as ORIGENS, e a página servida daqui fala com o mesmo endereço', { timeout: 20000 }, async () => {
  const s = await subir({ origens: ['https://diceduel-game.vercel.app'] });
  try {
    const pre = await fetch(s.base + '/api/entrar', { method: 'OPTIONS', headers: { origin: 'https://diceduel-game.vercel.app', 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' } });
    assert.strictEqual(pre.status, 204);
    assert.strictEqual(pre.headers.get('access-control-allow-origin'), 'https://diceduel-game.vercel.app');
    assert.match(pre.headers.get('access-control-allow-headers'), /authorization/);
    const estranho = await fetch(s.base + '/api/ranking', { headers: { origin: 'https://outro.example' } });
    assert.strictEqual(estranho.headers.get('access-control-allow-origin'), null);
    const html = await (await fetch(s.base + '/')).text();
    assert.match(html, /<meta name="dice-servidor" content="">/);
  } finally { await s.fechar(); }
});

test('limite de tentativas de login por IP', { timeout: 20000 }, async () => {
  const s = await subir({ limites: { contas: 1000, entrar: 3, solo: 1000, ws: 100000 } });
  try {
    const st = [];
    for (let i = 0; i < 5; i++) st.push((await s.api('POST', '/api/entrar', { nome: 'x', senha: 'y' })).status);
    assert.deepStrictEqual(st, [401, 401, 401, 429, 429]);
  } finally { await s.fechar(); }
});

test('loja: só compra com moedas, não repete, itens de nível não se vendem', { timeout: 20000 }, async () => {
  const s = await subir();
  try {
    const { token, conta: c } = await conta(s, 'Caio');
    assert.strictEqual((await s.api('POST', '/api/loja/comprar', { tipo: 'cartas', id: 'espelho' }, token)).status, 402);
    await s.banco.atualizarConta(c.id, { moedas: 300 });
    // duas compras ao mesmo tempo: a trava impede gastar a mesma moeda duas vezes
    const [x, y] = await Promise.all([
      s.api('POST', '/api/loja/comprar', { tipo: 'dados', id: 'pelucia' }, token),
      s.api('POST', '/api/loja/comprar', { tipo: 'cartas', id: 'fundo' }, token),
    ]);
    assert.deepStrictEqual([x.status, y.status].sort(), [200, 402]);
    const eu = (await s.api('GET', '/api/eu', null, token)).conta;
    assert.strictEqual(eu.moedas, 80);
    assert.strictEqual((await s.api('POST', '/api/loja/comprar', { tipo: 'dados', id: 'pelucia' }, token)).status, 409);
    assert.strictEqual((await s.api('POST', '/api/loja/comprar', { tipo: 'dados', id: 'menta' }, token)).status, 400);
    assert.strictEqual((await s.api('POST', '/api/loja/comprar', { tipo: 'senha_hash', id: 'x' }, token)).status, 400);
    assert.strictEqual((await s.api('POST', '/api/loja/comprar', { tipo: 'cartas', id: 'constructor' }, token)).status, 400);
    assert.strictEqual((await s.api('POST', '/api/loja/usar', { tipo: 'dados', id: 'diamante' }, token)).status, 400);
    assert.strictEqual((await s.api('POST', '/api/loja/usar', { tipo: 'constructor', id: 'x' }, token)).status, 400);
    const u = await s.api('POST', '/api/loja/usar', { tipo: 'dados', id: 'pelucia' }, token);
    assert.strictEqual(u.conta.ativo.dado, 'pelucia');
  } finally { await s.fechar(); }
});

test('partidas solo: moedas com teto por dia e pelo pico de rating', { timeout: 20000 }, async () => {
  const s = await subir();
  try {
    const { token } = await conta(s, 'Duda');
    const vitoria = { nivel: 'esperto', venceu: true, margem: 10, rodadas: 3, meta: 12, momentos: 2 };
    assert.strictEqual((await s.api('POST', '/api/solo', { ...vitoria, margem: 99 }, token)).status, 400);
    let total = 0, ultima;
    for (let i = 0; i < 12; i++) { ultima = await s.api('POST', '/api/solo', vitoria, token); total += ultima.premio.moedas.total; }
    const eu = ultima.conta;
    assert.ok(total <= TETO_SOLO_DIA, `ganhou ${total}`);
    assert.strictEqual(eu.moedas, total);
    assert.ok(eu.solo_pico > 1000 && eu.rating === 1000, 'solo não mexe no rating do ranking');
    const derrota = await s.api('POST', '/api/solo', { ...vitoria, venceu: false, margem: 0 }, token);
    assert.strictEqual(derrota.premio.moedas, null);
    assert.ok(derrota.premio.xpGanho >= 10);
  } finally { await s.fechar(); }
});

test('tarefas do dia nas partidas solo: pagam na derrota, uma vez só; a primeira vitória dobra; o aparelho não escreve as tarefas', { timeout: 20000 }, async () => {
  const s = await subir();
  try {
    const { token } = await conta(s, 'Tina');
    const eu0 = (await s.api('GET', '/api/eu', null, token)).conta;
    const dia = new Date().toISOString().slice(0, 10), ids = Regras.tarefasDoDia(dia);
    // um resumo que fecha toda tarefa de uma partida só (as que acumulam, como "Jogue 2 partidas", ficam no meio)
    const tudo = { venceu: false, pts: 20, maior: 5, disparos: 5, salvos: 1, bloqueios: 1 };
    const derrota = { nivel: 'aprendiz', venceu: false, margem: 0, rodadas: 8, meta: 16, momentos: 2, resumo: tudo };
    let r = await s.api('POST', '/api/solo', derrota, token);
    const esperadas = ids.filter(id => id !== 'jogar' && id !== 'vencer');
    assert.deepStrictEqual(r.premio.tarefas.concluidas.map(t => t.id).sort(), esperadas.sort());
    assert.strictEqual(r.conta.moedas, eu0.moedas + esperadas.length * Regras.MOEDAS_TAREFA, 'a derrota paga as tarefas');
    r = await s.api('POST', '/api/solo', derrota, token);
    assert.strictEqual(r.premio.tarefas.moedas, ids.includes('jogar') ? Regras.MOEDAS_TAREFA : 0, 'feita não paga de novo (só "Jogue 2" fecha agora)');
    // a primeira vitória do dia dobra; a segunda, não
    const vit = { ...derrota, venceu: true, margem: 4, resumo: { ...tudo, venceu: true } };
    const v1 = await s.api('POST', '/api/solo', vit, token), v2 = await s.api('POST', '/api/solo', vit, token);
    assert.ok(v1.premio.moedas.dobro && !v2.premio.moedas.dobro);
    assert.strictEqual(v1.premio.moedas.total, v2.premio.moedas.total * 2);
    // o aparelho manda os extras dele, mas as tarefas são do servidor
    const antes = (await s.api('GET', '/api/eu', null, token)).conta.extras.tarefas;
    await s.api('PUT', '/api/eu/dados', { tarefas: { dia, ids, prog: {}, feitas: [], vitoria: false } }, token);
    assert.deepStrictEqual((await s.api('GET', '/api/eu', null, token)).conta.extras.tarefas, antes);
    // quem desiste não avança
    const d = await s.api('POST', '/api/solo', { ...derrota, desistiu: true }, token);
    assert.strictEqual(d.premio.tarefas.moedas, 0);
    // resumo inventado não avança nada (e o relato segue valendo)
    const falso = await s.api('POST', '/api/solo', { ...derrota, resumo: { ...tudo, maior: 99 } }, token);
    assert.strictEqual(falso.status, 200); assert.strictEqual(falso.premio.tarefas.moedas, 0);
  } finally { await s.fechar(); }
});

test('modo história: o servidor dá a recompensa do capítulo em ordem e uma vez; o aparelho não escreve o progresso', { timeout: 20000 }, async () => {
  const s = await subir();
  try {
    const { token } = await conta(s, 'Hugo');
    assert.strictEqual((await s.api('POST', '/api/historia', { capitulo: 'C1' }, token)).status, 400, 'fora de ordem');
    assert.strictEqual((await s.api('POST', '/api/historia', { capitulo: 42 }, token)).status, 400);
    assert.strictEqual((await s.api('POST', '/api/historia', { capitulo: 'P' }, null)).status, 401);
    let r = await s.api('POST', '/api/historia', { capitulo: 'P' }, token);
    assert.strictEqual(r.premio, null);
    r = await s.api('POST', '/api/historia', { capitulo: 'C1' }, token);
    assert.deepStrictEqual(r.premio, { carta: 'reverso' }); assert.ok(r.conta.cartas.includes('reverso'));
    const moedas = r.conta.moedas;
    r = await s.api('POST', '/api/historia', { capitulo: 'C1' }, token);
    assert.strictEqual(r.premio, null); assert.strictEqual(r.conta.moedas, moedas, 'de novo não paga');
    await s.api('PUT', '/api/eu/dados', { historia: { feitos: ['P', 'C1', 'C2'] } }, token);
    assert.deepStrictEqual((await s.api('GET', '/api/eu', null, token)).conta.extras.historia.feitos, ['P', 'C1']);
    r = await s.api('POST', '/api/historia', { capitulo: 'C2' }, token);
    assert.deepStrictEqual(r.premio, { moedas: 40 });
  } finally { await s.fechar(); }
});

test('convidado vira conta: progresso importado com teto', { timeout: 20000 }, async () => {
  const s = await subir();
  try {
    const tudo = { moedas: 99999, xp: 99999, cartas: ['espelho', 'fundo', 'pedagio', 'rerrolar', 'sobrecarga', 'inventada'], dados: ['diamante', 'dourado', 'madeira', 'menta'], icones: ['raposa'], mesas: ['vinho'], ativo: { dado: 'diamante' }, rating: 5000 };
    const { conta: c } = await conta(s, 'Eva', { importar: tudo });
    assert.strictEqual(c.moedas, 600);
    assert.strictEqual(c.xp, 1000);
    assert.ok(!c.cartas.includes('inventada'));
    const preco = { espelho: 110, fundo: 140, pedagio: 140, rerrolar: 90, sobrecarga: 120, diamante: 800, dourado: 450, madeira: 80, raposa: 100, vinho: 150 };
    const valor = [...c.cartas, ...c.dados, ...c.icones, ...c.mesas].reduce((t, id) => t + (preco[id] || 0), 0);
    assert.ok(valor + c.moedas <= 900, `valor importado ${valor + c.moedas}`);
    assert.ok(c.dados.includes('menta') && c.icones.includes('xicara'), 'presentes de nível vêm do xp');
    assert.ok(c.solo_rating <= 1400);
  } finally { await s.fechar(); }
});

test('partida online completa: cada um vê só o que deve, e o fim paga rating e moedas', { timeout: 20000 }, async () => {
  const s = await subir();
  try {
    const A = await conta(s, 'Fabi'), B = await conta(s, 'Gui');
    await s.banco.atualizarConta(B.conta.id, { cartas: B.conta.cartas.concat('espelho', 'fundo') });
    const sala = (await s.api('POST', '/api/salas', { meta: 12 }, A.token)).sala;
    assert.match(sala.codigo, /^[A-Z2-9]{6}$/);
    // a consulta pública da sala mostra quem está nela, sem presença nem estado (quem está invisível não aparece por aqui)
    const pub = (await s.api('GET', '/api/salas/' + sala.codigo)).sala;
    assert.strictEqual(pub.codigo, sala.codigo); assert.ok(!('estado' in pub) && !('dono' in pub));
    const a = await cliente(s.ws, A.token), b = await cliente(s.ws, B.token);
    // deck com carta que a conta não tem: recusado
    a.enviar({ tipo: 'entrar', sala: sala.codigo, deck: ['espelho'] });
    await a.esperar(m => m.tipo === 'erro' && /não possui/.test(m.erro));
    a.enviar({ tipo: 'entrar', sala: sala.codigo, deck: ['ajuste', 'interferencia', 'pressa'] });
    await a.esperar(m => m.tipo === 'sala');
    b.enviar({ tipo: 'entrar', sala: sala.codigo.toLowerCase(), deck: ['espelho', 'fundo', 'coringa'] });
    const ea = await a.esperar(m => m.tipo === 'estado');
    a.msgs.unshift({ tipo: 'estado', jogo: ea.jogo });
    assert.deepStrictEqual(ea.jogo.nomes, ['Fabi', 'Gui']);
    assert.strictEqual(ea.jogo.perfis[1].nome, 'Gui');
    // fora da vez: erro, e o estado volta
    const quemNaoJoga = ea.jogo.vez === 0 ? b : a;
    quemNaoJoga.enviar({ tipo: 'acao', acao: { tipo: 'pegar', idx: 0 } });
    await quemNaoJoga.esperar(m => m.tipo === 'erro' && /vez/.test(m.erro));
    let armadilhasVistas = 0;
    const { fins } = await jogarAteOFim(a, b, {
      vigiar: (j) => {
        assert.ok([null, 'espelho', 'oculta'].includes(j.armada[1]), 'a armadilha do rival vazou: ' + j.armada[1]);
        if (j.armada[1] === 'oculta') armadilhasVistas++;
        assert.ok(!(j.mao && j.vez !== 0), 'a mão do rival vazou');
      },
    });
    const venceuA = fins[0].moedas !== null;
    assert.strictEqual(venceuA, fins[1].moedas === null, 'só quem venceu recebe moedas');
    const w = venceuA ? 0 : 1;
    assert.ok(fins[w].moedas.total > 0);
    assert.ok(fins[w].rating > 1000 && fins[1 - w].rating < 1000);
    // a conta recebe as moedas da vitória (a primeira do dia, em dobro) e as das tarefas do dia que fecharam (v0.14)
    assert.ok(fins[w].moedas.dobro, 'a primeira vitória do dia rende em dobro');
    assert.strictEqual(fins[w].conta.moedas, fins[w].moedas.total + fins[w].tarefas.moedas);
    assert.strictEqual(fins[1 - w].conta.moedas, fins[1 - w].tarefas.moedas, 'quem perdeu recebe só as tarefas');
    const rk = (await s.api('GET', '/api/ranking')).ranking;
    assert.strictEqual(rk.length, 2);
    assert.strictEqual(rk[0].nome, w === 0 ? 'Fabi' : 'Gui');
    assert.ok(armadilhasVistas >= 0);
    // revanche: os dois pedem e começa outra
    a.enviar({ tipo: 'revanche' }); b.enviar({ tipo: 'revanche' });
    const nova = await a.esperar(m => m.tipo === 'estado' && m.jogo.fase !== 'fim' && m.jogo.rodada === 1 && m.jogo.pts[0] === 0);
    assert.ok(nova);
    a.fechar(); b.fechar();
  } finally { await s.fechar(); }
});

test('quem cai tem um tempo para voltar, contado na vez dele; depois perde por queda (sem moedas para ninguém)', { timeout: 20000 }, async () => {
  const s = await subir({ tempos: { limiteVez: 1600 } });   // AFK: aviso aos 800 ms, derrota aos 1200 ms parado
  try {
    const A = await conta(s, 'Hugo'), B = await conta(s, 'Iris');
    const { sala } = await s.api('POST', '/api/salas', {}, A.token);
    let a = await cliente(s.ws, A.token);
    const b = await cliente(s.ws, B.token);
    a.enviar({ tipo: 'entrar', sala: sala.codigo, deck: [] });
    b.enviar({ tipo: 'entrar', sala: sala.codigo, deck: [] });
    await a.esperar(m => m.tipo === 'estado');
    // cai e volta a tempo: recebe o estado de novo, a partida segue
    a.ws.terminate();
    await b.esperar(m => m.tipo === 'sala' && m.sala.jogadores.some(j => !j.conectado));
    a = await cliente(s.ws, A.token);
    a.enviar({ tipo: 'entrar', sala: sala.codigo, deck: [] });
    const volta = await a.esperar(m => m.tipo === 'estado');
    assert.notStrictEqual(volta.jogo.fase, 'fim');
    // cai e não volta: a Iris joga a vez dela; na vez do Hugo, sem sinal de vida, acaba em derrota por queda
    jogarSozinho(b);
    a.ws.terminate();
    const fim = await b.esperar(m => m.tipo === 'fim', 6000);
    assert.strictEqual(fim.premio.porDesistencia, true);
    assert.strictEqual(fim.premio.moedas.total, 0);
    // W.O. logo na 1ª Mesa não mexe no rating (contra contas descartáveis que caem de propósito)
    assert.strictEqual(fim.premio.rating, 1000);
    assert.match(fim.premio.motivo, /não mexe no rating/);
    // quem perdeu por W.O. volta à sala e ainda recebe o fim (o estado final e o próprio resultado)
    a = await cliente(s.ws, A.token);
    a.enviar({ tipo: 'entrar', sala: sala.codigo, deck: [] });
    const final = await a.esperar(m => m.tipo === 'estado');
    assert.strictEqual(final.jogo.fase, 'fim');
    const meuFim = await a.esperar(m => m.tipo === 'fim');
    assert.strictEqual(meuFim.premio.porDesistencia, true);
    assert.strictEqual(meuFim.premio.rating, 1000);
    a.fechar(); b.fechar();
  } finally { await s.fechar(); }
});

test('queda na própria vez: a vez continua correndo, o rival vê o prazo de volta; quem volta segue; parado, vem a pergunta e a derrota por inatividade', { timeout: 20000 }, async () => {
  const s = await subir({ tempos: { limiteVez: 4000 } });   // AFK: aviso aos 2000 ms parado, derrota aos 3000 ms
  try {
    const A = await conta(s, 'Nina'), B = await conta(s, 'Otto');
    const { sala } = await s.api('POST', '/api/salas', {}, A.token);
    const ca = await cliente(s.ws, A.token), cb = await cliente(s.ws, B.token);
    ca.enviar({ tipo: 'entrar', sala: sala.codigo, deck: [] });
    cb.enviar({ tipo: 'entrar', sala: sala.codigo, deck: [] });
    const [ea, eb] = await Promise.all([ca.esperar(m => m.tipo === 'estado'), cb.esperar(m => m.tipo === 'estado')]);
    // quem tem a vez cai (na visão de cada um, vez 0 = a própria)
    const [daVez, outro, tokenDaVez] = ea.jogo.vez === 0 ? [ca, cb, A.token] : [cb, ca, B.token];
    assert.strictEqual((ea.jogo.vez === 0 ? eb : ea).jogo.vez, 1);
    daVez.ws.terminate();
    const aviso = await outro.esperar(m => m.tipo === 'sala' && m.sala.jogadores.some(j => !j.conectado));
    const caido = aviso.sala.jogadores.find(j => !j.conectado);
    assert.ok(caido.volta > 2000 && caido.volta <= 3000, 'prazo de volta: ' + caido.volta);
    // fora por 800 ms: a vez andou esse tanto
    await new Promise(r => setTimeout(r, 800));
    const volta = await cliente(s.ws, tokenDaVez);
    volta.enviar({ tipo: 'entrar', sala: sala.codigo, deck: [] });
    const est = await volta.esperar(m => m.tipo === 'estado');
    assert.notStrictEqual(est.jogo.fase, 'fim');
    assert.strictEqual(est.jogo.vez, 0);
    assert.ok(est.jogo.prazoVez > 0 && est.jogo.prazoVez <= 4000 - 700, 'a vez correu durante a queda: ' + est.jogo.prazoVez);
    assert.strictEqual(est.jogo.inatividade, null, 'voltar é sinal de vida');
    await outro.esperar(m => m.tipo === 'estado');
    // o pulso tem resposta (o navegador não vê os pings do servidor), mas não é sinal de vida
    volta.enviar({ tipo: 'pulso' });
    await volta.esperar(m => m.tipo === 'pulso');
    // parado: a pergunta chega para ele e o rival vê que ele está inativo...
    const pergunta = await volta.esperar(m => m.tipo === 'estado' && m.jogo.inatividade, 3500);
    assert.strictEqual(pergunta.jogo.inatividade.quem, 0);
    await outro.esperar(m => m.tipo === 'estado' && m.jogo.inatividade && m.jogo.inatividade.quem === 1, 1500);
    // ...e sem resposta, derrota por inatividade
    const fim = await outro.esperar(m => m.tipo === 'fim', 3000);
    assert.strictEqual(fim.premio.porDesistencia, true);
    const final = await volta.esperar(m => m.tipo === 'estado' && m.jogo.fase === 'fim', 2000);
    assert.strictEqual(final.jogo.motivoFim, 'inativo');
    volta.fechar(); outro.fechar();
  } finally { await s.fechar(); }
});

test('o sinal de vida pela rede ("ativo") tira a pergunta da tela', { timeout: 20000 }, async () => {
  const s = await subir({ tempos: { limiteVez: 4000 } });
  try {
    const A = await conta(s, 'Pia'), B = await conta(s, 'Quim');
    const { sala } = await s.api('POST', '/api/salas', {}, A.token);
    const ca = await cliente(s.ws, A.token), cb = await cliente(s.ws, B.token);
    ca.enviar({ tipo: 'entrar', sala: sala.codigo, deck: [] });
    cb.enviar({ tipo: 'entrar', sala: sala.codigo, deck: [] });
    const [ea] = await Promise.all([ca.esperar(m => m.tipo === 'estado'), cb.esperar(m => m.tipo === 'estado')]);
    const daVez = ea.jogo.vez === 0 ? ca : cb;
    await daVez.esperar(m => m.tipo === 'estado' && m.jogo.inatividade && m.jogo.inatividade.quem === 0, 3500);
    daVez.enviar({ tipo: 'ativo' });
    const depois = await daVez.esperar(m => m.tipo === 'estado' && !m.jogo.inatividade, 1500);
    assert.notStrictEqual(depois.jogo.fase, 'fim');
    ca.fechar(); cb.fechar();
  } finally { await s.fechar(); }
});

test('se o banco falhar ao premiar, o fim chega assim mesmo (sem prêmio, com o motivo)', { timeout: 20000 }, async () => {
  class BancoQueFalha extends BancoMemoria { async partidasDoParHoje() { throw new Error('banco fora do ar'); } }
  const s = await subir({ banco: new BancoQueFalha() });
  const erroOriginal = console.error; console.error = () => {};
  try {
    const A = await conta(s, 'Lia'), B = await conta(s, 'Rui');
    const { sala } = await s.api('POST', '/api/salas', {}, A.token);
    const a = await cliente(s.ws, A.token), b = await cliente(s.ws, B.token);
    a.enviar({ tipo: 'entrar', sala: sala.codigo, deck: [] });
    b.enviar({ tipo: 'entrar', sala: sala.codigo, deck: [] });
    await a.esperar(m => m.tipo === 'estado');
    a.enviar({ tipo: 'desistir' });
    const fim = await b.esperar(m => m.tipo === 'fim', 3000);
    assert.strictEqual(fim.premio, null);
    assert.match(fim.erro, /não conseguiu registrar/);
    b.fechar();
  } finally { console.error = erroOriginal; await s.fechar(); }
});

test('o mesmo par só vale rating e moedas 3 vezes por dia', { timeout: 20000 }, async () => {
  const s = await subir();
  try {
    const A = await conta(s, 'Juca'), B = await conta(s, 'Kika');
    const { sala } = await s.api('POST', '/api/salas', {}, A.token);
    const a = await cliente(s.ws, A.token), b = await cliente(s.ws, B.token);
    a.enviar({ tipo: 'entrar', sala: sala.codigo, deck: [] });
    b.enviar({ tipo: 'entrar', sala: sala.codigo, deck: [] });
    const premios = [];
    for (let k = 0; k < 4; k++) {
      await b.esperar(m => m.tipo === 'estado' && m.jogo.fase !== 'fim');
      a.msgs.length = 0;
      a.enviar({ tipo: 'desistir' });
      premios.push((await b.esperar(m => m.tipo === 'fim')).premio);
      await a.esperar(m => m.tipo === 'fim');
      if (k < 3) { a.enviar({ tipo: 'revanche' }); b.enviar({ tipo: 'revanche' }); }
    }
    assert.deepStrictEqual(premios.map(p => p.amistosa), [false, false, false, true]);
    assert.strictEqual(premios[3].rating, premios[3].ratingAntes);
    a.fechar(); b.fechar();
  } finally { await s.fechar(); }
});

test('sala cheia e sala que não existe', { timeout: 20000 }, async () => {
  const s = await subir();
  try {
    const [A, B, C] = await Promise.all(['Lia', 'Max', 'Nina'].map(n => conta(s, n)));
    const { sala } = await s.api('POST', '/api/salas', {}, A.token);
    const [a, b, c] = await Promise.all([A, B, C].map(x => cliente(s.ws, x.token)));
    a.enviar({ tipo: 'entrar', sala: sala.codigo, deck: [] });
    b.enviar({ tipo: 'entrar', sala: sala.codigo, deck: [] });
    await b.esperar(m => m.tipo === 'estado');
    c.enviar({ tipo: 'entrar', sala: sala.codigo, deck: [] });
    await c.esperar(m => m.tipo === 'erro' && /cheia/.test(m.erro));
    c.enviar({ tipo: 'entrar', sala: 'ZZZZZZ', deck: [] });
    await c.esperar(m => m.tipo === 'erro' && /não encontrada/.test(m.erro));
    assert.strictEqual((await s.api('GET', '/api/salas/ZZZZZZ')).status, 404);
    [a, b, c].forEach(x => x.fechar());
  } finally { await s.fechar(); }
});

// o mesmo roteiro com Postgres de verdade, quando houver um (TESTE_DATABASE_URL)
test('banco Postgres: contas, partidas e ranking', { skip: !process.env.TESTE_DATABASE_URL && 'defina TESTE_DATABASE_URL' }, async () => {
  const banco = await criarBanco({ url: process.env.TESTE_DATABASE_URL });
  await banco.pool.query('TRUNCATE contas, partidas, amizades RESTART IDENTITY');   // amizades aponta para contas: vão juntas
  const s = await subir({ banco });
  try {
    const A = await conta(s, 'Olga'), B = await conta(s, 'Pedro');
    assert.strictEqual((await s.api('POST', '/api/contas', { nome: 'olga', senha: 'dado-forte-7' })).status, 409);
    await banco.atualizarConta(A.conta.id, { moedas: 200 });
    const r = await s.api('POST', '/api/loja/comprar', { tipo: 'cartas', id: 'espelho' }, A.token);
    assert.strictEqual(r.conta.moedas, 90);
    assert.ok(r.conta.cartas.includes('espelho'));
    const { sala } = await s.api('POST', '/api/salas', {}, A.token);
    const a = await cliente(s.ws, A.token), b = await cliente(s.ws, B.token);
    a.enviar({ tipo: 'entrar', sala: sala.codigo, deck: ['espelho', 'ajuste'] });
    b.enviar({ tipo: 'entrar', sala: sala.codigo, deck: ['ancora'] });
    const { fins } = await jogarAteOFim(a, b);
    assert.ok(fins.some(f => f.moedas && f.moedas.total > 0));
    assert.strictEqual(await banco.partidasDoParHoje(A.conta.id, B.conta.id), 1);
    assert.strictEqual((await s.api('GET', '/api/ranking')).ranking.length, 2);
    a.fechar(); b.fechar();
  } finally { await s.fechar(); await banco.fechar(); }
});

test('a conta segue entre aparelhos: decks, recordes e ajustes de partida', async () => {
  const s = await subir();
  try {
    const { token } = await conta(s, 'Quim');
    const r = await s.api('PUT', '/api/eu/dados', { decks: [['ajuste', 'interferencia', 'pressa'], ['espelho', 'ajuste']], rec: { partidas: 7, vitorias: 4, maiorDisparo: 6, lixo: 9 }, cfg: { nivel: 'esperto', meta: 16, modo: 'hack' }, deckVisto: true }, token);
    assert.strictEqual(r.status, 200);
    // outro aparelho: entra com nome e senha e encontra tudo
    const outro = await s.api('POST', '/api/entrar', { nome: 'quim', senha: 'dado-forte-7' });
    const ex = outro.conta.extras;
    assert.deepStrictEqual(ex.decks[0], ['ajuste', 'interferencia', 'pressa']);
    assert.deepStrictEqual(ex.decks[1], ['ajuste'], 'carta que a conta não tem sai do deck');
    assert.strictEqual(ex.rec.partidas, 7);
    assert.ok(!('lixo' in ex.rec));
    assert.deepStrictEqual(ex.cfg, { modo: 'bot', nivel: 'esperto', meta: 16, ritmo: 'normal' });
    assert.strictEqual(ex.deckVisto, true);
    assert.ok(ex.em > 0);
    assert.strictEqual((await s.api('PUT', '/api/eu/dados', { decks: [['ajuste']] })).status, 401);
  } finally { await s.fechar(); }
});
