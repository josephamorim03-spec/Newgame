// Dice Duel · API (contas, ranking, loja, salas) e o canal de partida (WebSocket em /ws)
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const Regras = require('../shared/regras');
const { perfil, hoje } = require('./banco');
const Auth = require('./autenticacao');
const { Salas } = require('./salas');

const TETO_SOLO_DIA = 300;   // moedas por dia vindas de partidas contra os rivais do jogo (o servidor não as vê)
const TETO_IMPORTAR = { moedas: 600, xp: 1000, valor: 900 }; // valor: moedas + preço dos itens trazidos

// serializa as mudanças de cada conta (compras e prêmios ao mesmo tempo não gastam a mesma moeda duas vezes)
function criarTrava() {
  const filas = new Map();
  return (id, fn) => {
    const antes = filas.get(id) || Promise.resolve();
    const agora = antes.then(fn, fn);
    const fim = agora.catch(() => {});
    filas.set(id, fim);
    fim.then(() => { if (filas.get(id) === fim) filas.delete(id); });
    return agora;
  };
}

function criarApp({ banco, segredo, raiz = path.join(__dirname, '..'), tempos = {}, limites = {}, origens = [] }) {
  if (!segredo || segredo.length < 16) throw new Error('SEGREDO precisa ter 16 caracteres ou mais');
  const app = express();
  const trava = criarTrava();
  const salas = new Salas({ banco, trava, tempos });
  app.set('trust proxy', 1); // Railway fica atrás de um proxy: o IP real vem no X-Forwarded-For
  app.disable('x-powered-by');
  app.use(express.json({ limit: '8kb' }));
  app.use((req, res, next) => { res.set('X-Content-Type-Options', 'nosniff'); next(); });
  // CORS só para as páginas do jogo hospedadas fora daqui (ORIGENS, ex.: o Vercel); o token vai no cabeçalho, sem cookies
  app.use('/api', (req, res, next) => {
    res.vary('Origin');
    const origem = req.get('origin');
    if (!origem || !origens.includes(origem)) return next();
    res.set({ 'Access-Control-Allow-Origin': origem, 'Access-Control-Allow-Headers': 'content-type, authorization', 'Access-Control-Allow-Methods': 'GET, POST, PUT', 'Access-Control-Max-Age': '600' });
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  const lim = { contas: 5, entrar: 10, solo: 20, ws: 120, ...limites };
  const limContas = Auth.limitador({ janelaMs: 10 * 60_000, maximo: lim.contas });
  const limEntrar = Auth.limitador({ janelaMs: 60_000, maximo: lim.entrar });
  const limSolo = Auth.limitador({ janelaMs: 10 * 60_000, maximo: lim.solo });
  const assincrono = fn => (req, res, next) => fn(req, res, next).catch(next);
  const exigirConta = assincrono(async (req, res, next) => {
    const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const id = Auth.lerToken(token, segredo);
    const conta = id && await banco.contaPorId(id);
    if (!conta) return res.status(401).json({ erro: 'Entre na sua conta de novo.' });
    req.conta = conta; next();
  });
  const responderConta = (res, conta, extra = {}) => res.json({ token: Auth.criarToken(conta.id, segredo), conta: perfil(conta), ...extra });

  // ---------- saúde (healthcheck da Railway) ----------
  app.get('/api/saude', (req, res) => res.json({ ok: true, banco: banco.constructor.name === 'BancoPostgres' ? 'postgres' : 'memoria', salas: salas.salas.size }));

  // ---------- contas ----------
  app.post('/api/contas', limContas, assincrono(async (req, res) => {
    const { nome, senha, importar } = req.body || {};
    if (!Auth.validarNome(nome)) return res.status(400).json({ erro: 'Nome: de 3 a 20 letras, números, ponto, traço ou _.' });
    if (!Auth.validarSenha(senha)) return res.status(400).json({ erro: 'Senha: de 6 a 72 caracteres.' });
    const conta = await banco.criarConta(nome.trim(), Auth.hashSenha(senha));
    if (!conta) return res.status(409).json({ erro: 'Esse nome já tem dono. Tente outro.' });
    const final = importar ? await banco.atualizarConta(conta.id, importacao(conta, importar)) : conta;
    responderConta(res, final);
  }));
  app.post('/api/entrar', limEntrar, assincrono(async (req, res) => {
    const { nome, senha } = req.body || {};
    const conta = typeof nome === 'string' && typeof senha === 'string' && await banco.contaPorNome(nome.trim());
    if (!conta || !Auth.conferirSenha(senha, conta)) return res.status(401).json({ erro: 'Nome ou senha não conferem.' });
    responderConta(res, conta);
  }));
  app.get('/api/eu', exigirConta, (req, res) => responderConta(res, req.conta));
  app.get('/api/ranking', assincrono(async (req, res) => {
    res.set('Cache-Control', 'public, max-age=15');
    res.json({ ranking: (await banco.ranking(50)).map(r => ({ ...r, titulo: Regras.tituloDe(r.rating) })) });
  }));

  // ---------- o que segue a conta entre aparelhos: decks, recordes e o jeito de jogar ----------
  const REC = ['partidas', 'vitorias', 'seq', 'melhorSeq', 'maiorDisparo', 'maiorCorrente'];
  const inteiro = (v, max) => (Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0);
  function limparExtras(c, b) {
    const ex = { ...(c.extras || {}) };
    if (Array.isArray(b.decks)) {
      ex.decks = [0, 1].map(i => {
        const d = Array.isArray(b.decks[i]) ? b.decks[i].filter(x => typeof x === 'string' && c.cartas.includes(x)) : [];
        return Regras.deckValido(d) ? d : [];
      });
    }
    if (b.rec && typeof b.rec === 'object') ex.rec = Object.fromEntries(REC.map(k => [k, inteiro(b.rec[k], 1e6)]));
    if (b.cfg && typeof b.cfg === 'object') {
      const um = (v, ok, padrao) => (ok.includes(v) ? v : padrao);
      ex.cfg = { modo: um(b.cfg.modo, ['bot', 'local'], 'bot'), nivel: um(b.cfg.nivel, ['aprendiz', 'esperto'], 'aprendiz'),
        meta: b.cfg.meta === 16 ? 16 : 12, ritmo: um(b.cfg.ritmo, ['calmo', 'normal', 'rapido'], 'normal') };
    }
    if (typeof b.deckVisto === 'boolean') ex.deckVisto = b.deckVisto;
    ex.em = Date.now();
    return ex;
  }
  app.put('/api/eu/dados', exigirConta, assincrono(async (req, res) => {
    const conta = await trava(req.conta.id, async () => {
      const c = await banco.contaPorId(req.conta.id);
      return banco.atualizarConta(c.id, { extras: limparExtras(c, req.body || {}) });
    });
    res.json({ conta: perfil(conta) });
  }));

  // ---------- loja: preços e posse conferidos aqui, nunca no cliente ----------
  const TIPOS = ['cartas', 'dados', 'icones', 'mesas'];
  const ATIVO = { dados: 'dado', icones: 'icone', mesas: 'mesa' };
  app.post('/api/loja/comprar', exigirConta, assincrono(async (req, res) => {
    const { tipo, id } = req.body || {};
    if (!TIPOS.includes(tipo)) return res.status(400).json({ erro: 'Item desconhecido.' });
    const preco = Regras.precoDe(tipo, id);
    if (!preco) return res.status(400).json({ erro: 'Este item não está à venda.' });
    const r = await trava(req.conta.id, async () => {
      const c = await banco.contaPorId(req.conta.id);
      if (c[tipo].includes(id)) return { status: 409, erro: 'Você já tem este item.' };
      if (c.moedas < preco) return { status: 402, erro: 'Moedas insuficientes.' };
      return { conta: await banco.atualizarConta(c.id, { moedas: c.moedas - preco, [tipo]: c[tipo].concat(id) }) };
    });
    if (r.erro) return res.status(r.status).json({ erro: r.erro });
    res.json({ conta: perfil(r.conta) });
  }));
  app.post('/api/loja/usar', exigirConta, assincrono(async (req, res) => {
    const { tipo, id } = req.body || {};
    if (!['dados', 'icones', 'mesas'].includes(tipo) || !req.conta[tipo].includes(id)) return res.status(400).json({ erro: 'Você não tem este item.' });
    const conta = await trava(req.conta.id, async () => {
      const c = await banco.contaPorId(req.conta.id);
      return banco.atualizarConta(c.id, { ativo: { ...c.ativo, [ATIVO[tipo]]: id } });
    });
    res.json({ conta: perfil(conta) });
  }));

  // ---------- partidas contra os rivais do jogo (jogadas no aparelho; teto diário de moedas) ----------
  app.post('/api/solo', limSolo, exigirConta, assincrono(async (req, res) => {
    const b = req.body || {};
    const meta = b.meta === 16 ? 16 : 12;
    const ok = Regras.RATING_RIVAL[b.nivel] && typeof b.venceu === 'boolean'
      && Number.isInteger(b.margem) && b.margem >= 0 && b.margem <= meta + 9
      && Number.isInteger(b.rodadas) && b.rodadas >= 1 && b.rodadas <= 80
      && Number.isInteger(b.momentos) && b.momentos >= 0 && b.momentos <= 40;
    if (!ok) return res.status(400).json({ erro: 'Resultado inválido.' });
    const r = await trava(req.conta.id, async () => {
      const c = await banco.contaPorId(req.conta.id);
      const ps = Regras.premioSolo({ rating: c.solo_rating, pico: c.solo_pico }, { nivel: b.nivel, venceu: b.venceu, margem: b.margem, rodadas: b.rodadas, meta });
      const dia = hoje(), jaHoje = c.solo_dia === dia ? c.solo_hoje : 0;
      if (ps.moedas && ps.moedas.total > 0) {
        const cabe = Math.max(0, TETO_SOLO_DIA - jaHoje);
        if (ps.moedas.total > cabe) { ps.moedas.total = cabe; ps.moedas.tetoDia = true; }
      }
      const ganho = ps.moedas ? ps.moedas.total : 0;
      const conta = { xp: c.xp, dados: c.dados.slice(), icones: c.icones.slice(), mesas: c.mesas.slice() };
      const xp = Regras.ganharXp(conta, b.desistiu === true ? 0 : Regras.xpDaPartida(b.venceu, b.momentos));   // abandonar não rende experiência
      const nova = await banco.atualizarConta(c.id, {
        moedas: c.moedas + ganho, solo_rating: ps.rating, solo_pico: ps.picoNovo, solo_dia: dia, solo_hoje: jaHoje + ganho, ...conta,
      });
      return { premio: { moedas: ps.moedas, ratingAntes: ps.ratingAntes, pico: ps.pico, rating: ps.rating, ...xp }, conta: nova };
    });
    res.json({ premio: r.premio, conta: perfil(r.conta) });
  }));

  // ---------- salas (convite por link) ----------
  app.post('/api/salas', exigirConta, (req, res) => {
    const sala = salas.criar(req.conta, { meta: (req.body || {}).meta });
    res.json({ sala: salas.resumo(sala) });
  });
  app.get('/api/salas/:codigo', (req, res) => {
    const sala = salas.salas.get(String(req.params.codigo).toUpperCase());
    if (!sala) return res.status(404).json({ erro: 'Sala não encontrada. O convite pode ter expirado.' });
    res.json({ sala: salas.resumo(sala) });
  });

  // ---------- o jogo em si (arquivos estáticos; só o que o navegador precisa) ----------
  for (const pasta of ['css', 'js', 'shared', 'img']) app.use('/' + pasta, express.static(path.join(raiz, pasta), { maxAge: '1h', index: false }));
  app.get('/manifest.webmanifest', (req, res) => res.type('application/manifest+json').sendFile(path.join(raiz, 'manifest.webmanifest')));
  // servida daqui, a página fala com este mesmo endereço: a <meta name="dice-servidor"> (para o Vercel) sai vazia
  app.get(['/', '/index.html'], assincrono(async (req, res) => {
    const html = await fs.promises.readFile(path.join(raiz, 'index.html'), 'utf8');
    res.type('html').send(html.replace(/(<meta name="dice-servidor" content=")[^"]*"/, '$1"'));
  }));
  app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota desconhecida.' }));
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') return res.status(400).json({ erro: 'Pedido inválido.' });
    console.error(err);
    res.status(500).json({ erro: 'Algo deu errado no servidor.' });
  });

  // ---------- WebSocket: ola → entrar → acao/revanche/desistir/sair ----------
  function anexar(servidor) {
    const wss = new WebSocketServer({ server: servidor, path: '/ws', maxPayload: 4096 });
    wss.on('connection', ws => {
      ws.vivo = true; ws.contaId = null; ws.sala = null; ws.cota = { inicio: Date.now(), n: 0 };
      ws.on('pong', () => { ws.vivo = true; });
      // mensagem grande demais ou quadro inválido: o ws avisa com 'error' e fecha só esta conexão.
      // Sem este ouvinte, o erro derrubaria o processo inteiro.
      ws.on('error', () => {});
      ws.on('message', async dados => {
        const c = ws.cota, agora = Date.now();
        if (agora - c.inicio > 10_000) { c.inicio = agora; c.n = 0; }
        if (++c.n > lim.ws) { if (c.n === lim.ws + 1) salas.enviar(ws, { tipo: 'erro', erro: 'Calma: muitas jogadas de uma vez.' }); return; }
        let m; try { m = JSON.parse(dados); } catch (e) { return; }
        if (!m || typeof m !== 'object') return;
        // o pulso do cliente: o navegador não vê os pings do servidor, então pergunta se a conexão ainda está viva
        if (m.tipo === 'pulso') return salas.enviar(ws, { tipo: 'pulso' });
        try {
          if (m.tipo === 'ola') {
            const id = Auth.lerToken(m.token, segredo), conta = id && await banco.contaPorId(id);
            if (!conta) return salas.enviar(ws, { tipo: 'erro', erro: 'Entre na sua conta de novo.', sair: true });
            ws.contaId = conta.id;
            return salas.enviar(ws, { tipo: 'ola', conta: perfil(conta) });
          }
          if (!ws.contaId) return salas.enviar(ws, { tipo: 'erro', erro: 'Entre na sua conta primeiro.' });
          const conta = await banco.contaPorId(ws.contaId);
          if (m.tipo === 'entrar') await salas.entrar(ws, conta, m);
          else if (m.tipo === 'acao') await salas.acao(ws, conta, m.acao);
          else if (m.tipo === 'desistir') await salas.desistir(ws, conta);
          else if (m.tipo === 'revanche') salas.revanche(ws, conta, m);
          else if (m.tipo === 'sair') salas.sair(ws);
        } catch (e) { console.error('ws', e); salas.enviar(ws, { tipo: 'erro', erro: 'Algo deu errado no servidor.' }); }
      });
      ws.on('close', () => salas.caiu(ws));
    });
    // a Railway corta conexões paradas: um ping a cada 15 s mantém viva e descobre quem caiu (em 15 a 30 s)
    const batida = setInterval(() => wss.clients.forEach(ws => { if (!ws.vivo) return ws.terminate(); ws.vivo = false; ws.ping(); }), 15_000);
    batida.unref();
    wss.on('close', () => clearInterval(batida));
    return wss;
  }

  // convidado → conta (uma vez, na criação): traz o progresso do aparelho, com teto, só itens que existem
  function importacao(conta, imp) {
    const campos = {};
    const n = (v, max) => (Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0);
    campos.moedas = n(imp.moedas, TETO_IMPORTAR.moedas);
    campos.xp = n(imp.xp, TETO_IMPORTAR.xp);
    // itens pagos entram do mais barato ao mais caro enquanto couberem no teto de valor
    let orcamento = TETO_IMPORTAR.valor - campos.moedas;
    const pedidos = [];
    for (const t of ['cartas', 'dados', 'icones', 'mesas']) {
      for (const id of new Set(Array.isArray(imp[t]) ? imp[t] : [])) {
        const preco = typeof id === 'string' && Regras.precoDe(t, id);
        if (preco && !conta[t].includes(id)) pedidos.push({ t, id, preco });
      }
    }
    for (const t of ['cartas', 'dados', 'icones', 'mesas']) campos[t] = conta[t].slice();
    pedidos.sort((a, b) => a.preco - b.preco).forEach(x => { if (x.preco <= orcamento) { orcamento -= x.preco; campos[x.t].push(x.id); } });
    // presentes de nível vêm da experiência importada
    Regras.ganharXp({ xp: 0, dados: campos.dados, icones: campos.icones, mesas: campos.mesas }, campos.xp);
    if (Number.isFinite(imp.rating)) { campos.solo_rating = Math.max(600, Math.min(1400, Math.round(imp.rating))); campos.solo_pico = Math.max(campos.solo_rating, Math.min(1500, Math.round(imp.pico || 0))); }
    const at = imp.ativo || {};
    campos.ativo = { dado: campos.dados.includes(at.dado) ? at.dado : 'marfim', icone: campos.icones.includes(at.icone) ? at.icone : 'bolinha', mesa: campos.mesas.includes(at.mesa) ? at.mesa : 'salvia' };
    return campos;
  }

  return { app, anexar, salas, criarServidor: () => { const s = http.createServer(app); s.wss = anexar(s); return s; } };
}

module.exports = { criarApp, criarTrava, TETO_SOLO_DIA };
