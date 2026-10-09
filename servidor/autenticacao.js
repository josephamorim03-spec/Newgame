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

function hashSenha(senha, sal = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(senha, sal, 64).toString('hex');
  return { hash, sal };
}
function conferirSenha(senha, conta) {
  const { hash } = hashSenha(senha, conta.sal);
  const a = Buffer.from(hash, 'hex'), b = Buffer.from(conta.senha_hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const b64 = s => Buffer.from(s).toString('base64url');
function criarToken(id, segredo, dias = 30) {
  const corpo = b64(JSON.stringify({ id, exp: Date.now() + dias * 864e5 }));
  const assinatura = crypto.createHmac('sha256', segredo).update(corpo).digest('base64url');
  return `${corpo}.${assinatura}`;
}
function lerToken(token, segredo) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [corpo, assinatura] = token.split('.');
  const certa = crypto.createHmac('sha256', segredo).update(corpo).digest('base64url');
  const a = Buffer.from(assinatura || ''), b = Buffer.from(certa);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const dados = JSON.parse(Buffer.from(corpo, 'base64url').toString());
    return dados.exp > Date.now() ? dados.id : null;
  } catch (e) { return null; }
}

// limite simples por IP (contra força bruta no login e na criação de contas)
function limitador({ janelaMs = 60_000, maximo = 10 } = {}) {
  const contagens = new Map();
  setInterval(() => { const agora = Date.now(); for (const [k, v] of contagens) if (agora - v.inicio > janelaMs) contagens.delete(k); }, janelaMs).unref();
  return (req, res, next) => {
    const ip = req.ip || 'desconhecido', agora = Date.now();
    const v = contagens.get(ip) || { inicio: agora, n: 0 };
    if (agora - v.inicio > janelaMs) { v.inicio = agora; v.n = 0; }
    v.n++; contagens.set(ip, v);
    if (v.n > maximo) return res.status(429).json({ erro: 'Muitas tentativas. Espere um minuto.' });
    next();
  };
}

module.exports = { chaveDoNome, validarNome, validarSenha, hashSenha, conferirSenha, criarToken, lerToken, limitador };
