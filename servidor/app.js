// Dice Duel · API (contas, ranking, loja, salas) e o canal de partida (WebSocket em /ws)
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const compression = require('compression');
const { WebSocketServer } = require('ws');
const Regras = require('../shared/regras');
const { perfil, hoje } = require('./banco');
const Auth = require('./autenticacao');
const { Salas } = require('./salas');
const { Fila } = require('./fila');

const MAX_AMIGOS = 200;          // amigos + pedidos de uma conta
const INTERVALO_CHAMADA = 10_000; // chamar a mesma pessoa para a sala de novo só depois disso
const MAX_CHAMADAS_DESCONHECIDOS = 5; // por minuto, para quem não é amigo
const MAX_PEDIDOS_RECEBIDOS = 100;   // pedidos de amizade esperando resposta (contra enxurrada de pedidos numa pessoa)
const MAX_ABAS = 5;                  // conexões ao mesmo tempo por conta
const PRAZO_OLA = 15_000;            // conexão que não se identifica nesse tempo fecha
const SOLO_POR_DIA = { relatos: 80, xp: 800 };   // partidas contra os rivais do jogo relatadas por conta por dia (o servidor não as vê)
const TRANCA_SENHA = { erros: 5, janela: 15 * 60_000 };   // erros de senha seguidos numa conta trancam o login dela por 15 min

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

// fila: liga a fila por rating (FILA=1); filaOpcoes ajusta as janelas (testes)
function criarApp({ banco, segredo, raiz = path.join(__dirname, '..'), tempos = {}, limites = {}, origens = [], fila: filaAtiva = false, filaOpcoes = {} }) {
  if (!segredo || segredo.length < 16) throw new Error('SEGREDO precisa ter 16 caracteres ou mais');
  const app = express();
  const trava = criarTrava();
  // uma partida online muda ratings: o ranking guardado em memória (15 s) é refeito na próxima consulta
  let rankingGuardado = { em: 0, lista: null };
  const salas = new Salas({ banco, trava, tempos, aoMudarConta: () => { rankingGuardado.em = 0; } });

  // ---------- presença: quem está com o jogo aberto (uma conta pode ter várias abas) ----------
  const presenca = new Map();   // id da conta -> Set de sockets
  const online = id => !!(presenca.get(id) && presenca.get(id).size);
  const avisar = (id, msg) => { for (const ws of presenca.get(id) || []) salas.enviar(ws, msg); };
  // quando alguém entra ou sai, todo mundo conectado recebe o novo total (juntando mudanças de 1,5 s numa mensagem só):
  // o contador do botão Online anda na hora, sem esperar a próxima consulta
  let avisoPresenca = null;
  const presencaMudou = () => {
    if (avisoPresenca) return;
    avisoPresenca = setTimeout(() => {
      avisoPresenca = null;
      const msg = JSON.stringify({ tipo: 'online', total: presenca.size });
      for (const s of presenca.values()) for (const ws of s) if (ws.readyState === 1) ws.send(msg);
    }, 1500);
    avisoPresenca.unref();
  };
  // a sessão mudou (senha nova, "sair de todos os aparelhos", conta apagada): as conexões abertas fecham;
  // o aparelho que fez a mudança volta com o token novo, os outros caem para "entre de novo"
  // devolve as promessas dos prêmios das partidas abandonadas (quem apaga a conta espera por elas)
  function encerrarSessoes(id, { sairDasSalas = false } = {}) {
    const premios = [];
    for (const ws of [...(presenca.get(id) || [])]) {
      if (sairDasSalas) premios.push(salas.sair(ws));
      salas.enviar(ws, { tipo: 'sessao' });
      ws.close(4001, 'sessao');
    }
    return Promise.all(premios);
  }

  // ---------- fila por rating: forma o par, cria a sala e põe os dois nela ----------
  const fila = new Fila({ ativa: filaAtiva, opcoes: filaOpcoes, aoParear: async par => {
    const vivos = par.filter(e => e.dados.ws.readyState === 1);
    if (vivos.length < 2) { vivos.forEach(e => fila.entrar(e)); return; }   // um saiu nesse meio-tempo: o outro volta para a fila
    const contas = await Promise.all(par.map(e => banco.contaPorId(e.id)));
    const sala = salas.criar(contas[0], { meta: par[0].meta });   // a fila usa o ritmo padrão (Rápida)
    par.forEach((e, i) => salas.enviar(e.dados.ws, { tipo: 'achou', sala: sala.codigo, rival: contas[1 - i].nome, rating: contas[1 - i].rating }));
    for (let i = 0; i < 2; i++) await salas.entrar(par[i].dados.ws, contas[i], { sala: sala.codigo, deck: par[i].dados.deck });
  } });
  app.set('trust proxy', 1); // Railway fica atrás de um proxy: o IP real vem no X-Forwarded-For
  app.disable('x-powered-by');
  app.use(compression());   // a página, o js e o css vão com gzip (~340 KB em vez de ~740 KB)
  // cabeçalhos de segurança: sem MIME adivinhado, sem a página dentro de um iframe alheio (clickjacking), HTTPS lembrado,
  // e uma CSP que só deixa rodar os scripts do próprio jogo (um nome malicioso que escapasse do esc() não executaria nada)
  const CSP = ["default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:", "media-src 'self' data: blob:", "connect-src 'self' https: wss:", "worker-src 'self' blob:", "manifest-src 'self'",
    "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'"].join('; ');
  app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()', 'Cross-Origin-Opener-Policy': 'same-origin' });
    if (req.secure) res.set('Strict-Transport-Security', 'max-age=15552000');
    if (!req.path.startsWith('/api')) res.set('Content-Security-Policy', CSP);
    next();
  });
  // CORS só para as páginas do jogo hospedadas fora daqui (ORIGENS, ex.: o Vercel); o token vai no cabeçalho, sem cookies
  app.use('/api', (req, res, next) => {
    res.vary('Origin');
    const origem = req.get('origin');
    if (!origem || !origens.includes(origem)) return next();
    res.set({ 'Access-Control-Allow-Origin': origem, 'Access-Control-Allow-Headers': 'content-type, authorization', 'Access-Control-Allow-Methods': 'GET, POST, PUT', 'Access-Control-Max-Age': '600' });
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  // depois do CORS: um corpo inválido (400) também chega à página do Vercel com a mensagem de erro
  app.use(express.json({ limit: '8kb' }));

  const lim = { contas: 5, entrar: 10, solo: 20, ws: 120, amigos: 30, nomes: 60, api: 1200, conexoes: 50, prazoOla: PRAZO_OLA, ...limites };
  const limContas = Auth.limitador({ janelaMs: 10 * 60_000, maximo: lim.contas });
  const limEntrar = Auth.limitador({ janelaMs: 60_000, maximo: lim.entrar });
  const limSolo = Auth.limitador({ janelaMs: 10 * 60_000, maximo: lim.solo });
  const limAmigos = Auth.limitador({ janelaMs: 10 * 60_000, maximo: lim.amigos });   // pedidos de amizade (contra spam)
  const limNomes = Auth.limitador({ janelaMs: 60_000, maximo: lim.nomes });          // "esse nome está livre?" enquanto digita
  const limConta = Auth.limitador({ janelaMs: 10 * 60_000, maximo: lim.entrar });    // trocar senha e apagar conta (contra adivinhar a senha atual)
  // um teto geral por IP para toda a API (as rotas sensíveis têm os seus, mais apertados)
  app.use('/api', Auth.limitador({ janelaMs: 60_000, maximo: lim.api }));
  const assincrono = fn => (req, res, next) => fn(req, res, next).catch(next);
  // a conta do token, se ele for válido e da versão atual da sessão (senha trocada ou "sair de tudo" invalidam os antigos)
  async function contaDoToken(token) {
    const s = Auth.lerSessao(token, segredo);
    const conta = s && await banco.contaPorId(s.id);
    return Auth.sessaoValida(s, conta) ? conta : null;
  }
  const tokenDe = req => (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const exigirConta = assincrono(async (req, res, next) => {
    const conta = await contaDoToken(tokenDe(req));
    if (!conta) return res.status(401).json({ erro: 'Entre na sua conta de novo.' });
    req.conta = conta; next();
  });
  // como exigirConta, mas sem conta também passa (req.conta fica null)
  const contaSeHouver = assincrono(async (req, res, next) => { req.conta = await contaDoToken(tokenDe(req)); next(); });
  const responderConta = (res, conta, extra = {}) => res.json({ token: Auth.criarToken(conta.id, segredo, 30, conta.versao_token || 0), conta: perfil(conta), ...extra });

  // ---------- saúde (healthcheck da Railway) ----------
  // olha o banco de verdade: com o Postgres fora do ar, responde 503 (a Railway não troca um deploy bom por um quebrado)
  app.get('/api/saude', assincrono(async (req, res) => {
    const tipo = banco.constructor.name === 'BancoPostgres' ? 'postgres' : 'memoria';
    try { await banco.ping(); } catch (e) { return res.status(503).json({ ok: false, banco: tipo, erro: 'banco fora do ar' }); }
    res.json({ ok: true, banco: tipo, salas: salas.salas.size, online: presenca.size });
  }));

  // ---------- contas ----------
  app.post('/api/contas', limContas, assincrono(async (req, res) => {
    const { nome, senha, importar } = req.body || {};
    if (!Auth.validarNome(nome)) return res.status(400).json({ erro: 'Nome: de 3 a 20 letras, números, ponto, traço ou _.' });
    const fraca = Auth.problemaSenhaNova(senha, nome);
    if (fraca) return res.status(400).json({ erro: fraca, codigo: 'senha' });
    const conta = await banco.criarConta(nome.trim(), await Auth.hashSenha(senha));
    if (!conta) return res.status(409).json({ erro: await nomeOcupado(nome) });
    const final = importar ? await banco.atualizarConta(conta.id, importacao(conta, importar)) : conta;
    responderConta(res, final);
  }));
  // erros de senha por conta (além do limite por IP): quem troca de IP para adivinhar a senha de alguém esbarra aqui.
  // Vale no login, em trocar a senha e em apagar a conta. A partir do 5º erro seguido, o login da conta trava por 15 min.
  const errosDeSenha = new Map();   // chave do nome -> { n, primeiro, trancadaAte }
  const vivo = (e, agora = Date.now()) => e && (e.trancadaAte ? agora < e.trancadaAte : agora - e.primeiro < TRANCA_SENHA.janela);
  setInterval(() => { for (const [k, v] of errosDeSenha) if (!vivo(v)) errosDeSenha.delete(k); }, 60_000).unref();
  const trancada = chave => { const e = errosDeSenha.get(chave); return vivo(e) && e.trancadaAte ? e : null; };
  function errouSenha(chave) {
    const agora = Date.now(), atual = errosDeSenha.get(chave);
    const e = vivo(atual, agora) ? atual : { n: 0, primeiro: agora, trancadaAte: null };
    e.n++;
    if (e.n >= TRANCA_SENHA.erros) e.trancadaAte = agora + TRANCA_SENHA.janela;
    errosDeSenha.set(chave, e);
    return { restam: Math.max(0, TRANCA_SENHA.erros - e.n), trancadaAte: e.trancadaAte };
  }
  function respostaTrancada(res, e) {
    const s = Math.max(1, Math.ceil((e.trancadaAte - Date.now()) / 1000));
    res.set('Retry-After', String(s));
    return res.status(429).json({ erro: `Muitas senhas erradas: o login desta conta está travado por mais ${Auth.tempoLegivel(s)}. Isso protege a conta de quem tenta adivinhar a senha.`, trancadaAte: e.trancadaAte, espera: s, codigo: 'trancada' });
  }
  // senha errada: diz quantas tentativas restam (nas 3 últimas) ou que a conta acabou de travar
  function respostaSenhaErrada(res, status, base, r) {
    const extra = r.trancadaAte ? ' Foram 5 erros seguidos: o login desta conta ficou travado por 15 minutos.'
      : r.restam <= 3 ? ` Mais ${r.restam} ${r.restam === 1 ? 'tentativa' : 'tentativas'} antes de travar o login desta conta por 15 minutos.` : '';
    return res.status(r.trancadaAte ? 429 : status).json({ erro: base + extra, restam: r.restam, ...(r.trancadaAte ? { trancadaAte: r.trancadaAte, espera: Math.ceil(TRANCA_SENHA.janela / 1000), codigo: 'trancada' } : {}) });
  }
  const CONTA_FALSA = { sal: '00'.repeat(16), senha_hash: '00'.repeat(64) };   // a conta não existe: o scrypt roda igual (mesmo tempo de resposta)
  app.post('/api/entrar', limEntrar, assincrono(async (req, res) => {
    const { nome, senha } = req.body || {};
    if (typeof nome !== 'string' || typeof senha !== 'string' || nome.length > 40 || senha.length > 200) return res.status(401).json({ erro: 'Nome ou senha não conferem.' });
    const chave = Auth.chaveDoNome(nome), tr = trancada(chave);
    if (tr) return respostaTrancada(res, tr);
    const conta = await banco.contaPorNome(nome.trim());
    const certa = await Auth.conferirSenha(senha, conta || CONTA_FALSA);
    if (!conta) return res.status(401).json({ erro: 'Nome ou senha não conferem.' });
    if (!certa) return respostaSenhaErrada(res, 401, 'Nome ou senha não conferem.', errouSenha(chave));
    errosDeSenha.delete(chave);
    responderConta(res, conta);
  }));
  app.get('/api/eu', exigirConta, (req, res) => responderConta(res, req.conta));
  // trocar a senha: confere a atual; os outros aparelhos saem (este recebe o token novo)
  app.post('/api/eu/senha', limConta, exigirConta, assincrono(async (req, res) => {
    const { atual, nova } = req.body || {};
    const fraca = Auth.problemaSenhaNova(nova, req.conta.nome);
    if (fraca) return res.status(400).json({ erro: fraca.replace(/^Senha:/, 'Senha nova:'), codigo: 'senha' });
    const chave = Auth.chaveDoNome(req.conta.nome), tr = trancada(chave);
    if (tr) return respostaTrancada(res, tr);
    if (typeof atual !== 'string' || !(await Auth.conferirSenha(atual, req.conta))) return respostaSenhaErrada(res, 403, 'A senha atual não confere.', errouSenha(chave));
    errosDeSenha.delete(chave);
    const h = await Auth.hashSenha(nova);
    const conta = await trava(req.conta.id, async () => {
      const c = await banco.contaPorId(req.conta.id);
      return banco.atualizarConta(c.id, { senha_hash: h.hash, sal: h.sal, versao_token: (c.versao_token || 0) + 1 });
    });
    encerrarSessoes(conta.id);
    responderConta(res, conta);
  }));
  // sair de todos os aparelhos (celular perdido, computador emprestado): todos os tokens antigos deixam de valer
  app.post('/api/eu/sair-de-tudo', exigirConta, assincrono(async (req, res) => {
    const conta = await trava(req.conta.id, async () => {
      const c = await banco.contaPorId(req.conta.id);
      return banco.atualizarConta(c.id, { versao_token: (c.versao_token || 0) + 1 });
    });
    encerrarSessoes(conta.id);
    responderConta(res, conta);
  }));
  // apagar a conta (LGPD): pede a senha; sai das salas (uma partida em andamento conta como desistência) e da fila
  app.post('/api/eu/apagar', limConta, exigirConta, assincrono(async (req, res) => {
    const { senha } = req.body || {};
    const chave = Auth.chaveDoNome(req.conta.nome), tr = trancada(chave);
    if (tr) return respostaTrancada(res, tr);
    if (typeof senha !== 'string' || !(await Auth.conferirSenha(senha, req.conta))) return respostaSenhaErrada(res, 403, 'A senha não confere.', errouSenha(chave));
    const id = req.conta.id;
    fila.sair(id);
    await encerrarSessoes(id, { sairDasSalas: true });
    await trava(id, () => banco.apagarConta(id));
    res.json({ apagada: true });
  }));
  // privacidade: aparecer (ou não) na lista de quem está online, e quem pode chamar para a sala
  app.put('/api/eu/privacidade', exigirConta, assincrono(async (req, res) => {
    const b = req.body || {};
    const conta = await trava(req.conta.id, async () => {
      const c = await banco.contaPorId(req.conta.id), atual = (c.extras && c.extras.privacidade) || {};
      const privacidade = {
        visivel: typeof b.visivel === 'boolean' ? b.visivel : atual.visivel !== false,
        chamadas: ['todos', 'amigos'].includes(b.chamadas) ? b.chamadas : (atual.chamadas === 'amigos' ? 'amigos' : 'todos'),
      };
      return banco.atualizarConta(c.id, { extras: { ...(c.extras || {}), privacidade } });
    });
    res.json({ conta: perfil(conta) });
  }));
  // o nome está livre? (a tela de criar conta pergunta enquanto a pessoa digita). Igual para maiúsculas, acentos e separadores.
  async function nomeOcupado(nome) {
    const dono = await banco.contaPorNome(nome);
    return dono && dono.nome !== nome.trim() ? `Esse nome é igual a "${dono.nome}", que já existe (maiúsculas, acentos, ponto, traço e _ não contam). Tente outro.`
      : 'Esse nome já existe. Tente outro.';
  }
  app.get('/api/nomes/:nome', limNomes, assincrono(async (req, res) => {
    const nome = String(req.params.nome);
    if (!Auth.validarNome(nome)) return res.json({ livre: false, erro: 'De 3 a 20 letras, números, ponto, traço ou _.' });
    const dono = await banco.contaPorNome(nome);
    res.json(dono ? { livre: false, erro: await nomeOcupado(nome) } : { livre: true });
  }));

  // ---------- ranking: o global (top 50, público) e o entre amigos, com a sua posição nos dois ----------
  const linhaRanking = r => ({ nome: r.nome, rating: r.rating, partidas: r.partidas, vitorias: r.vitorias, icone: r.icone, titulo: Regras.tituloDe(r.rating) });
  const acima = (o, e) => o.rating > e.rating || (o.rating === e.rating && o.vitorias > e.vitorias);
  // o top 50 muda devagar: 15 s em memória poupam o banco de quem fica atualizando a página
  app.get('/api/ranking', assincrono(async (req, res) => {
    res.set('Cache-Control', 'public, max-age=15');
    if (Date.now() - rankingGuardado.em > 15_000) rankingGuardado = { em: Date.now(), lista: (await banco.ranking(50)).map(linhaRanking) };
    res.json({ ranking: rankingGuardado.lista });
  }));
  app.get('/api/ranking/amigos', exigirConta, assincrono(async (req, res) => {
    const eu = req.conta, amigos = (await banco.amizadesDe(eu.id)).filter(a => a.aceita);
    const todos = [{ ...linhaRanking({ ...eu, icone: eu.ativo.icone }), eu: true }, ...amigos.map(linhaRanking)].sort((a, b) => (acima(a, b) ? -1 : acima(b, a) ? 1 : 0));
    todos.forEach((x, i) => { x.posicao = i + 1; });
    res.json({ ranking: todos, global: await banco.posicaoNoRanking(eu.id) });
  }));

  // ---------- amizades: pedir pelo nome, aceitar, desfazer; a lista mostra quem está online ----------
  async function listaDeAmigos(id) {
    const todas = await banco.amizadesDe(id);
    const sem = x => ({ nome: x.nome, rating: x.rating, icone: x.icone, titulo: Regras.tituloDe(x.rating) });
    const amigos = todas.filter(x => x.aceita).map(x => ({ ...sem(x), partidas: x.partidas, vitorias: x.vitorias, online: online(x.id), onde: salas.estadoDe(x.id) }))
      .sort((a, b) => (b.online - a.online) || a.nome.localeCompare(b.nome, 'pt'));
    return { amigos, recebidos: todas.filter(x => !x.aceita && !x.enviado).map(sem), enviados: todas.filter(x => !x.aceita && x.enviado).map(sem) };
  }
  // pedidos cruzados ao mesmo tempo (A pede B e B pede A) passam um de cada vez pela trava do par
  const travaPar = (a, b, fn) => trava(`par:${Math.min(a, b)}:${Math.max(a, b)}`, fn);
  const outraConta = async (req, res) => {
    const nome = (req.body || {}).nome;
    const alvo = typeof nome === 'string' && Auth.validarNome(nome) && await banco.contaPorNome(nome);
    if (!alvo) { res.status(404).json({ erro: 'Ninguém com esse nome.' }); return null; }
    if (alvo.id === req.conta.id) { res.status(400).json({ erro: 'Esse nome é o seu.' }); return null; }
    return alvo;
  };
  app.get('/api/amigos', exigirConta, assincrono(async (req, res) => res.json(await listaDeAmigos(req.conta.id))));
  app.post('/api/amigos', limAmigos, exigirConta, assincrono(async (req, res) => {
    const eu = req.conta, alvo = await outraConta(req, res); if (!alvo) return;
    const r = await travaPar(eu.id, alvo.id, async () => {
      const rel = await banco.amizade(eu.id, alvo.id);
      if (rel && rel.aceita) return { status: 409, erro: `Você e ${alvo.nome} já são amigos.` };
      if (rel && rel.de === eu.id) return { status: 409, erro: `Pedido já enviado. Agora é com ${alvo.nome}.` };
      // a outra pessoa já tinha pedido: pedir de volta é aceitar
      if (rel) { await banco.aceitarAmizade(alvo.id, eu.id); return { estado: 'amigos' }; }
      if ((await banco.amizadesDe(eu.id)).length >= MAX_AMIGOS) return { status: 409, erro: `Você chegou a ${MAX_AMIGOS} amigos e pedidos.` };
      const recebidos = (await banco.amizadesDe(alvo.id)).filter(x => !x.aceita && !x.enviado).length;
      if (recebidos >= MAX_PEDIDOS_RECEBIDOS) return { status: 409, erro: `${alvo.nome} tem pedidos demais esperando resposta. Tente mais tarde.` };
      await banco.pedirAmizade(eu.id, alvo.id);
      return { estado: 'pedido' };
    });
    if (r.erro) return res.status(r.status).json({ erro: r.erro });
    avisar(alvo.id, { tipo: 'amigos', evento: r.estado === 'amigos' ? 'aceito' : 'pedido', nome: eu.nome });
    res.json({ estado: r.estado, nome: alvo.nome, ...(await listaDeAmigos(eu.id)) });   // nome: como a conta se chama de verdade
  }));
  app.post('/api/amigos/aceitar', exigirConta, assincrono(async (req, res) => {
    const eu = req.conta, alvo = await outraConta(req, res); if (!alvo) return;
    const ok = await travaPar(eu.id, alvo.id, () => banco.aceitarAmizade(alvo.id, eu.id));
    if (!ok) return res.status(404).json({ erro: `Não há pedido de ${alvo.nome}.` });
    avisar(alvo.id, { tipo: 'amigos', evento: 'aceito', nome: eu.nome });
    res.json(await listaDeAmigos(eu.id));
  }));
  // recusar um pedido, cancelar o que você mandou ou desfazer uma amizade
  app.post('/api/amigos/remover', exigirConta, assincrono(async (req, res) => {
    const eu = req.conta, alvo = await outraConta(req, res); if (!alvo) return;
    if (await travaPar(eu.id, alvo.id, () => banco.desfazerAmizade(eu.id, alvo.id))) avisar(alvo.id, { tipo: 'amigos', evento: 'removido' });
    res.json(await listaDeAmigos(eu.id));
  }));

  // ---------- quem está online agora: sem conta, só quantos (o convite para entrar); com conta, a lista para chamar ----------
  app.get('/api/online', contaSeHouver, assincrono(async (req, res) => {
    const total = presenca.size, eu = req.conta;
    if (!eu) return res.json({ total });
    const ids = [...presenca.keys()].filter(id => id !== eu.id).slice(0, 500);
    const amigos = new Map((await banco.amizadesDe(eu.id)).map(a => [a.id, a]));
    const jogadores = (await banco.contasPorIds(ids)).filter(c => !c.oculto || (amigos.get(c.id) && amigos.get(c.id).aceita)).map(c => {
      const rel = amigos.get(c.id);
      return { nome: c.nome, rating: c.rating, icone: c.icone, titulo: Regras.tituloDe(c.rating), onde: salas.estadoDe(c.id),
        amigo: !!(rel && rel.aceita), pedido: rel && !rel.aceita ? (rel.enviado ? 'enviado' : 'recebido') : null };
    })
      // primeiro quem pode jogar agora, depois os amigos, depois o rating mais perto do seu
      .sort((a, b) => ((a.onde === 'jogando') - (b.onde === 'jogando')) || (b.amigo - a.amigo) || (Math.abs(a.rating - eu.rating) - Math.abs(b.rating - eu.rating)))
      .slice(0, 50);
    res.json({ total, jogadores });
  }));

  // ---------- o que este servidor oferece (a página esconde o que estiver desligado) ----------
  app.get('/api/config', (req, res) => res.json({ fila: fila.ativa }));

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
      ex.cfg = { modo: 'bot', nivel: um(b.cfg.nivel, ['aprendiz', 'esperto'], 'aprendiz'),
        meta: Regras.metaValida(b.cfg.meta), ritmo: um(b.cfg.ritmo, ['calmo', 'normal', 'rapido'], 'normal') };
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
    // a meta 12 ainda chega de uma partida guardada antes da v0.12
    const meta = b.meta === 12 ? 12 : Regras.metaValida(b.meta);
    const ok = typeof b.nivel === 'string' && Object.hasOwn(Regras.RATING_RIVAL, b.nivel) && typeof b.venceu === 'boolean'
      && Number.isInteger(b.margem) && b.margem >= 0 && b.margem <= meta + 9
      && Number.isInteger(b.rodadas) && b.rodadas >= 1 && b.rodadas <= 80
      && Number.isInteger(b.momentos) && b.momentos >= 0 && b.momentos <= 40;
    if (!ok) return res.status(400).json({ erro: 'Resultado inválido.' });
    const r = await trava(req.conta.id, async () => {
      const c = await banco.contaPorId(req.conta.id);
      const ps = Regras.premioSolo({ rating: c.solo_rating, pico: c.solo_pico }, { nivel: b.nivel, venceu: b.venceu, margem: b.margem, rodadas: b.rodadas, meta });
      const dia = hoje(), jaHoje = c.solo_dia === dia ? c.solo_hoje : 0;
      // o resultado vem do aparelho: além do teto de moedas, um teto de relatos e de XP por dia limita quem inventa vitórias
      const sd = c.extras && c.extras.soloDia && c.extras.soloDia.dia === dia ? c.extras.soloDia : { dia, n: 0, xp: 0 };
      if (sd.n >= SOLO_POR_DIA.relatos) return { status: 429, erro: 'Você já jogou muitas partidas contra os rivais hoje. Amanhã tem mais; o online não tem teto.' };
      if (ps.moedas && ps.moedas.total > 0) {
        const cabe = Math.max(0, TETO_SOLO_DIA - jaHoje);
        if (ps.moedas.total > cabe) { ps.moedas.total = cabe; ps.moedas.tetoDia = true; }
      }
      const ganho = ps.moedas ? ps.moedas.total : 0;
      const conta = { xp: c.xp, dados: c.dados.slice(), icones: c.icones.slice(), mesas: c.mesas.slice() };
      const xpPedido = b.desistiu === true ? 0 : Regras.xpDaPartida(b.venceu, b.momentos);   // abandonar não rende experiência
      const xpDado = Math.max(0, Math.min(xpPedido, SOLO_POR_DIA.xp - sd.xp));
      const xp = Regras.ganharXp(conta, xpDado);
      const nova = await banco.atualizarConta(c.id, {
        moedas: c.moedas + ganho, solo_rating: ps.rating, solo_pico: ps.picoNovo, solo_dia: dia, solo_hoje: jaHoje + ganho, ...conta,
        extras: { ...(c.extras || {}), soloDia: { dia, n: sd.n + 1, xp: sd.xp + xpDado } },
      });
      return { premio: { moedas: ps.moedas, ratingAntes: ps.ratingAntes, pico: ps.pico, rating: ps.rating, ...xp }, conta: nova };
    });
    if (r.erro) return res.status(r.status).json({ erro: r.erro });
    res.json({ premio: r.premio, conta: perfil(r.conta) });
  }));

  // ---------- salas (convite por link) ----------
  app.post('/api/salas', exigirConta, (req, res) => {
    const b = req.body || {};
    const sala = salas.criar(req.conta, { meta: b.meta, ritmo: b.ritmo });
    res.json({ sala: salas.resumo(sala) });
  });
  app.get('/api/salas/:codigo', (req, res) => {
    const sala = salas.salas.get(String(req.params.codigo).toUpperCase());
    if (!sala) return res.status(404).json({ erro: 'Sala não encontrada. O convite pode ter expirado.' });
    const r = salas.resumo(sala);   // quem não está na sala não precisa dos ids internos
    res.json({ sala: { codigo: r.codigo, meta: r.meta, jogadores: r.jogadores.map(j => ({ nome: j.nome, rating: j.rating, icone: j.icone })) } });   // sem "conectado" nem "estado": a presença de quem está invisível não sai por aqui
  });

  // ---------- o jogo em si (arquivos estáticos; só o que o navegador precisa) ----------
  // css e js sem hash no nome: o navegador revalida pelo ETag (304 barato) para nunca juntar HTML novo com JS velho
  // depois de um deploy; as imagens podem ficar 1 h
  for (const pasta of ['css', 'js', 'shared']) app.use('/' + pasta, express.static(path.join(raiz, pasta), { maxAge: 0, index: false }));
  app.use('/img', express.static(path.join(raiz, 'img'), { maxAge: '1h', index: false }));
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

  // ---------- WebSocket: ola → entrar → acao/revanche/desistir/sair; chamar (um amigo); procurar/cancelarBusca (fila) ----------
  // Avisos que não são da partida vão como { tipo: 'aviso' }: um 'erro' faria a página largar a sala.
  function sairDaPresenca(ws) {
    const s = ws.contaId && presenca.get(ws.contaId);
    if (s) { s.delete(ws); if (!s.size) { presenca.delete(ws.contaId); presencaMudou(); } }
  }
  // conexões abertas por IP: um script abrindo milhares de sockets não esgota o servidor
  const conexoesPorIp = new Map();
  const ipDe = req => { const xff = req.headers['x-forwarded-for']; return xff ? String(xff).split(',').pop().trim() : req.socket.remoteAddress; };
  const chamadas = new Map();   // "de:para" -> quando chamou (sem repetir a chamada a cada toque)
  const chamadasDesconhecidos = new Map();   // id -> quando chamou quem não é amigo (no último minuto)
  async function chamarAmigo(ws, conta, nome) {
    const aviso = erro => salas.enviar(ws, { tipo: 'aviso', erro });
    const sala = salas.salaEsperandoDe(conta.id);
    if (!sala) return aviso('Crie uma sala primeiro: é para ela que o amigo vai.');
    const alvo = typeof nome === 'string' && Auth.validarNome(nome) && await banco.contaPorNome(nome);
    if (!alvo || alvo.id === conta.id) return aviso('Ninguém com esse nome.');
    // dá para chamar qualquer um que esteja online (com pouca gente jogando, é o jeito de começar uma partida);
    // quem não é amigo conta num limite por minuto, contra quem sai chamando todo mundo
    const rel = await banco.amizade(conta.id, alvo.id), amigo = !!(rel && rel.aceita);
    const k = `${conta.id}:${alvo.id}`, agora = Date.now();
    if (!amigo) {
      // quem não é amigo: toda tentativa conta no limite (antes de qualquer resposta), e a resposta é uma só para
      // "offline", "jogando", "invisível" e "só aceita amigos" — senão, chamar pelo console viraria um detector de presença
      // que fura o "não aparecer no Online agora"
      const recentes = (chamadasDesconhecidos.get(conta.id) || []).filter(t => agora - t < 60_000);
      if (recentes.length >= MAX_CHAMADAS_DESCONHECIDOS) return aviso('Calma: muitas chamadas seguidas. Espere um minuto.');
      chamadasDesconhecidos.set(conta.id, recentes.concat(agora));
      const pv = (alvo.extras && alvo.extras.privacidade) || {};
      if (pv.visivel === false || pv.chamadas === 'amigos' || !online(alvo.id) || salas.estadoDe(alvo.id) === 'jogando') {
        return aviso(`Não dá para chamar ${alvo.nome} agora. Mande o link do convite (ou peça amizade).`);
      }
    } else {
      if (!online(alvo.id)) return aviso(`${alvo.nome} não está com o jogo aberto agora. Mande o link do convite.`);
      if (salas.estadoDe(alvo.id) === 'jogando') return aviso(`${alvo.nome} está no meio de uma partida.`);
    }
    if (agora - (chamadas.get(k) || 0) < INTERVALO_CHAMADA) return aviso(`Você acabou de chamar ${alvo.nome}.`);
    chamadas.set(k, agora);
    if (chamadas.size > 5000) for (const [x, t] of chamadas) if (agora - t > INTERVALO_CHAMADA) chamadas.delete(x);
    if (chamadasDesconhecidos.size > 5000) for (const [x, ts] of chamadasDesconhecidos) if (ts.every(t => agora - t > 60_000)) chamadasDesconhecidos.delete(x);
    avisar(alvo.id, { tipo: 'chamado', de: conta.nome, icone: conta.ativo.icone, rating: conta.rating, sala: sala.codigo, meta: sala.meta, amigo });
    salas.enviar(ws, { tipo: 'chamou', nome: alvo.nome });
  }
  async function procurarRival(ws, conta, m) {
    const aviso = erro => salas.enviar(ws, { tipo: 'aviso', erro, codigo: 'fila' });
    if (!fila.ativa) return aviso('A busca por rival ainda não está aberta. Chame um amigo pelo convite.');
    if (salas.estadoDe(conta.id) === 'jogando') return aviso('Termine a partida em andamento primeiro.');
    const deck = Array.isArray(m.deck) ? m.deck : [];
    if (!Regras.deckValido(deck) || deck.some(c => !conta.cartas.includes(c))) return aviso('Deck inválido para esta conta.');
    const e = fila.entrar({ id: conta.id, rating: conta.rating, meta: m.meta, dados: { ws, deck: deck.slice() } });
    salas.enviar(ws, { tipo: 'procurando', janela: fila.janela(e), naFila: fila.tamanho });
  }

  function anexar(servidor) {
    const wss = new WebSocketServer({ server: servidor, path: '/ws', maxPayload: 4096 });
    wss.on('connection', (ws, req) => {
      ws.ip = ipDe(req);
      const abertas = (conexoesPorIp.get(ws.ip) || 0) + 1;
      conexoesPorIp.set(ws.ip, abertas);
      ws.on('close', () => { const n = (conexoesPorIp.get(ws.ip) || 1) - 1; if (n > 0) conexoesPorIp.set(ws.ip, n); else conexoesPorIp.delete(ws.ip); });
      if (abertas > lim.conexoes) { ws.on('error', () => {}); ws.close(1013, 'muitas conexoes'); return; }
      // só a página do jogo (este endereço ou as ORIGENS, como o Vercel) abre conexão pelo navegador; scripts sem Origin passam
      const origem = req.headers.origin;
      if (origem && !origens.includes(origem.replace(/\/$/, '')) && (() => { try { return new URL(origem).host !== req.headers.host; } catch (e) { return true; } })()) {
        ws.on('error', () => {}); ws.close(1008, 'origem'); return;
      }
      // quem não se identifica logo fecha (sockets anônimos não ficam vivos para sempre)
      const prazoOla = setTimeout(() => { if (!ws.contaId) ws.close(1008, 'sem ola'); }, lim.prazoOla);
      ws.on('close', () => clearTimeout(prazoOla));
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
            const conta = await contaDoToken(m.token);
            if (!conta) return salas.enviar(ws, { tipo: 'erro', erro: 'Entre na sua conta de novo.', sair: true });
            if (ws.contaId && ws.contaId !== conta.id) sairDaPresenca(ws);
            const abas = presenca.get(conta.id);
            if (abas && !abas.has(ws) && abas.size >= MAX_ABAS) return salas.enviar(ws, { tipo: 'aviso', erro: `O jogo já está aberto em ${MAX_ABAS} abas ou aparelhos. Feche uma para conectar esta.` });
            ws.contaId = conta.id; ws.conta = conta; ws.contaEm = Date.now();
            if (!presenca.has(conta.id)) { presenca.set(conta.id, new Set()); presencaMudou(); }
            presenca.get(conta.id).add(ws);
            return salas.enviar(ws, { tipo: 'ola', conta: perfil(conta) });
          }
          if (!ws.contaId) return salas.enviar(ws, { tipo: 'erro', erro: 'Entre na sua conta primeiro.' });
          // a conta fica guardada na conexão por alguns segundos: não é preciso ir ao banco a cada jogada
          // (entrar, procurar e revanche conferem as cartas: esses sempre buscam a conta fresca, uma compra de agora já vale)
          const fresca = m.tipo === 'entrar' || m.tipo === 'procurar' || m.tipo === 'revanche' || m.tipo === 'deck';
          if (fresca || !ws.conta || Date.now() - ws.contaEm > 5000) { ws.conta = await banco.contaPorId(ws.contaId); ws.contaEm = Date.now(); }
          const conta = ws.conta;
          if (!conta) { salas.enviar(ws, { tipo: 'erro', erro: 'Esta conta não existe mais.', sair: true }); return ws.close(4001, 'sessao'); }   // apagada
          if (m.tipo === 'chamar') await chamarAmigo(ws, conta, m.nome);
          else if (m.tipo === 'procurar') await procurarRival(ws, conta, m);
          else if (m.tipo === 'cancelarBusca') { if (fila.sair(conta.id)) salas.enviar(ws, { tipo: 'buscaCancelada' }); }
          else if (m.tipo === 'entrar') await salas.entrar(ws, conta, m);
          else if (m.tipo === 'acao') await salas.acao(ws, conta, m.acao);
          else if (m.tipo === 'desistir') await salas.desistir(ws, conta);
          else if (m.tipo === 'revanche') salas.revanche(ws, conta, m);
          else if (m.tipo === 'deck') salas.escolher(ws, conta, m);
          else if (m.tipo === 'sair') salas.sair(ws);
          else if (m.tipo === 'voltei') salas.voltei(ws, conta);   // tocou na tela ou voltou para o app: sai do "ausente"
        } catch (e) { console.error('ws', e); salas.enviar(ws, { tipo: 'erro', erro: 'Algo deu errado no servidor.' }); }
      });
      ws.on('close', () => {
        salas.caiu(ws); sairDaPresenca(ws);
        const naFila = ws.contaId && fila.entradas.get(ws.contaId);
        if (naFila && naFila.dados.ws === ws) fila.sair(ws.contaId);   // fechou a aba que estava procurando rival
      });
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
    if (Number.isFinite(imp.rating)) { campos.solo_rating = Math.max(600, Math.min(1400, Math.round(imp.rating))); campos.solo_pico = Math.max(campos.solo_rating, Math.min(1500, Math.round(Number.isFinite(imp.pico) ? imp.pico : 0))); }
    const at = imp.ativo || {};
    campos.ativo = { dado: campos.dados.includes(at.dado) ? at.dado : 'marfim', icone: campos.icones.includes(at.icone) ? at.icone : 'bolinha', mesa: campos.mesas.includes(at.mesa) ? at.mesa : 'salvia' };
    return campos;
  }

  return { app, anexar, salas, fila, criarServidor: () => { const s = http.createServer(app); s.wss = anexar(s); return s; } };
}

module.exports = { criarApp, criarTrava, TETO_SOLO_DIA };
