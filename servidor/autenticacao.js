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
// para entrar: as senhas antigas (6+) continuam valendo
const validarSenha = senha => typeof senha === 'string' && senha.length >= 6 && senha.length <= 72;
// senhas que aparecem no topo das listas vazadas (Brasil e mundo): as primeiras que um robô tenta
const SENHAS_COMUNS = new Set(['12345678', '123456789', '1234567890', '87654321', '11111111', '00000000', '12341234', '11223344', '01020304',
  'senha123', 'senha1234', 'senha12345', 'minhasenha', 'mudar123', 'password', 'password1', 'password123', 'qwerty123', 'qwertyuiop', 'asdfghjkl',
  'abcd1234', 'abc12345', 'abcdefgh', 'iloveyou', 'teamo123', 'euteamo1', 'brasil123', 'flamengo', 'corinthians', 'palmeiras', 'saopaulo', 'gremio123',
  'vasco123', 'botafogo', 'santos123', 'cruzeiro', 'internacional', 'dragonball', 'pokemon1', 'minecraft', 'princesa', 'jesus123', 'deusefiel',
  'admin123', 'administrador', 'welcome1', 'letmein1', 'football', 'baseball', 'sunshine', 'princess', 'superman', 'batman123', 'dicedue1', 'diceduel', 'dados123']);
// "" se a senha nova serve; senão, o motivo (para a tela mostrar)
function problemaSenhaNova(senha, nome = '') {
  if (typeof senha !== 'string' || senha.length < 8 || senha.length > 72) return 'Senha: de 8 a 72 caracteres.';
  const s = senha.toLowerCase(), k = chaveDoNome(senha), kn = chaveDoNome(nome || '');
  if (SENHAS_COMUNS.has(s) || SENHAS_COMUNS.has(k)) return 'Essa senha está entre as mais usadas do mundo (é a primeira que um robô tenta). Escolha outra.';
  if (/^(.)\1+$/.test(senha)) return 'Uma letra ou número repetido é fácil de adivinhar. Escolha outra.';
  if (/^\d+$/.test(senha) && senha.length < 12) return 'Só números (como datas) é fácil de adivinhar: misture letras.';
  if (kn.length >= 3 && k.includes(kn)) return 'A senha não pode ter o seu nome dentro.';
  const seq = 'abcdefghijklmnopqrstuvwxyz0123456789', inv = [...seq].reverse().join('');
  if (k.length >= 8 && (seq.includes(k) || inv.includes(k))) return 'Uma sequência (abcdefgh, 12345678) é fácil de adivinhar. Escolha outra.';
  return '';
}

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

module.exports = { tempoLegivel, chaveDoNome, validarNome, validarSenha, problemaSenhaNova, hashSenha, conferirSenha, criarToken, lerToken, lerSessao, sessaoValida, limitador };
