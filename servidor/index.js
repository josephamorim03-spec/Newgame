// Dice Duel · servidor (Railway): node servidor/index.js
// Variáveis: PORT (a Railway define), SEGREDO (assina os tokens; obrigatório em produção),
// DATABASE_URL (Postgres; sem ela, guarda tudo num arquivo JSON em DADOS, padrão ./dados/banco.json),
// ORIGENS (endereços de fora que podem chamar a API, separados por vírgula; ex.: https://diceduel-game.vercel.app)
'use strict';
const path = require('path');
const crypto = require('crypto');
const { criarBanco } = require('./banco');
const { criarApp } = require('./app');

(async () => {
  const producao = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;
  let segredo = process.env.SEGREDO;
  if (!segredo) {
    if (producao) { console.error('Defina a variável SEGREDO (32+ caracteres aleatórios) nas variáveis do serviço.'); process.exit(1); }
    segredo = crypto.randomBytes(32).toString('hex');
    console.warn('SEGREDO não definido: usando um aleatório (os logins caem a cada reinício).');
  }
  if (producao && !process.env.DATABASE_URL) console.warn('Sem DATABASE_URL: as contas ficam num arquivo que some a cada deploy. Ligue o Postgres (docs/servidor.md).');
  const banco = await criarBanco({ arquivo: process.env.DATABASE_URL ? null : (process.env.DADOS || path.join(__dirname, '..', 'dados', 'banco.json')) });
  const origens = (process.env.ORIGENS || '').split(',').map(s => s.trim().replace(//$/, '')).filter(Boolean);
  const { criarServidor, salas } = criarApp({ banco, segredo, origens });
  const servidor = criarServidor();
  const porta = +process.env.PORT || 8080;
  servidor.listen(porta, () => console.log(`Dice Duel em http://localhost:${porta} (banco: ${process.env.DATABASE_URL ? 'postgres' : 'arquivo'})`));
  const encerrar = async () => { salas.fechar(); servidor.close(); await banco.fechar(); process.exit(0); };
  process.on('SIGTERM', encerrar); process.on('SIGINT', encerrar);
})().catch(e => { console.error(e); process.exit(1); });
