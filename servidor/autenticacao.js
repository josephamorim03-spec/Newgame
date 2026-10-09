// Dice Duel · contas: senha com scrypt e token assinado (HMAC), sem sessão no servidor
'use strict';
const crypto = require('crypto');

// letras (com acento, sem × e ÷), números, ponto, traço e _
const NOME_VALIDO = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9_.-]{3,20}$/;
// a chave que faz dois nomes serem "o mesmo nome": não importam maiúsculas, acentos nem separadores.
// Ana = ana = ANA, José = Jose, ana.b = ana_b = anab. É ela que é única no banco e que o login procura.
const chaveDoNome = nome => String(nome).trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[._-]/g, '');
// a chave precisa de pelo menos 3 letras ou números (".a_" não é nome)
const validarNome = nome => typeof nome === 'string' && NOME_VALIDO.test(nome.trim()) && chaveDoNome(nome).length >= 3;
const validarSenha = senha => typeof senha === 'string' && senha.length >= 6 && senha.length <= 72;

// scrypt fora da thread principal: com a versão síncrona, cada login travava o servidor inteiro (todas as partidas) por ~50-100 ms
const scrypt = (senha, sal) => new Promise((ok, erro) => crypto.scrypt(senha, sal, 64, (e, k) => (e ? erro(e) : ok(k))));
async function hashSenha(senha, sal = crypto.randomBytes(16).toString('hex')) {
  return { hash: (await scrypt(senha, sal)).toString('hex'), sal };
}
async function conferirSenha(senha, conta) {
  const a = await scrypt(senha, conta.sal), b = Buffer.from(conta.senha_hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// o token leva a versão da sessão da conta (v): trocar a senha ou "sair de todos os aparelhos" sobe a versão
// e todos os tokens antigos deixam de valer, sem guardar sessão no servidor
const b64 = s => Buffer.from(s).toString('base64url');
function criarToken(id, segredo, dias = 30, v = 0) {
  const corpo = b64(JSON.stringify({ id, v, exp: Date.now() + dias * 864e5 }));
  const assinatura = crypto.createHmac('sha256', segredo).update(corpo).digest('base64url');
  return `${corpo}.${assinatura}`;
}
// { id, v } de um token válido e dentro do prazo; null se não
function lerSessao(token, segredo) {
  if (typeof token !== 'string' || token.length > 512 || !token.includes('.')) return null;
  const [corpo, assinatura] = token.split('.');
  const certa = crypto.createHmac('sha256', segredo).update(corpo).digest('base64url');
  const a = Buffer.from(assinatura || ''), b = Buffer.from(certa);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const dados = JSON.parse(Buffer.from(corpo, 'base64url').toString());
    return dados.exp > Date.now() && Number.isInteger(dados.id) ? { id: dados.id, v: Number.isInteger(dados.v) ? dados.v : 0 } : null;
  } catch (e) { return null; }
}
const lerToken = (token, segredo) => { const s = lerSessao(token, segredo); return s ? s.id : null; };
// o token vale para esta conta? (assinado, no prazo e da versão atual da sessão)
const sessaoValida = (s, conta) => !!(s && conta && s.id === conta.id && s.v === (conta.versao_token || 0));

// "40 s", "3 min"
const tempoLegivel = s => (s < 60 ? `${s} s` : `${Math.ceil(s / 60)} min`);
// limite simples por IP (contra força bruta no login e na criação de contas)
function limitador({ janelaMs = 60_000, maximo = 10 } = {}) {
  const contagens = new Map();
  setInterval(() => { const agora = Date.now(); for (const [k, v] of contagens) if (agora - v.inicio > janelaMs) contagens.delete(k); }, janelaMs).unref();
  return (req, res, next) => {
    const ip = req.ip || 'desconhecido', agora = Date.now();
    const v = contagens.get(ip) || { inicio: agora, n: 0 };
    if (agora - v.inicio > janelaMs) { v.inicio = agora; v.n = 0; }
    v.n++; contagens.set(ip, v);
    if (v.n > maximo) {
      // quanto falta para a janela abrir de novo (a página mostra a contagem e libera o botão sozinha)
      const espera = Math.max(1, Math.ceil((v.inicio + janelaMs - agora) / 1000));
      res.set('Retry-After', String(espera));
      return res.status(429).json({ erro: `Muitas tentativas seguidas deste aparelho. Tente de novo em ${tempoLegivel(espera)}.`, espera, codigo: 'limite' });
    }
    next();
  };
}

module.exports = { tempoLegivel, chaveDoNome, validarNome, validarSenha, hashSenha, conferirSenha, criarToken, lerToken, lerSessao, sessaoValida, limitador };
