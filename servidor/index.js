// Dice Duel · servidor (Railway): node servidor/index.js
// Variáveis: PORT (a Railway define), SEGREDO (assina os tokens; opcional: sem ele, um é criado e guardado no banco),
// DATABASE_URL (Postgres; sem ela, guarda tudo num arquivo JSON em DADOS, padrão ./dados/banco.json)
'use strict';
const path = require('path');
const crypto = require('crypto');
const { criarBanco } = require('./banco');
const { criarApp } = require('./app');

(async () => {
  const producao = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;
  if (producao && !process.env.DATABASE_URL) console.warn('Sem DATABASE_URL: as contas ficam num arquivo que some a cada deploy. Ligue o Postgres (docs/servidor.md).');
  // na Railway o Postgres pode ainda estar subindo: tenta por ~1 minuto antes de desistir
  let banco;
  for (let tentativa = 1; ; tentativa++) {
    try { banco = await criarBanco({ arquivo: process.env.DATABASE_URL ? null : (process.env.DADOS || path.join(__dirname, '..', 'dados', 'banco.json')) }); break; }
    catch (e) {
      if (tentativa >= 12) throw e;
      console.warn(`Banco indisponível (${e.code || e.message}); tentando de novo em 5 s (${tentativa}/12).`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  // SEGREDO assina os tokens de login. Sem ele, o servidor cria um e o guarda no banco: os logins sobrevivem
  // aos reinícios e o deploy não falha por falta de uma variável.
  let segredo = process.env.SEGREDO;
  if (!segredo || segredo.length < 16) {
    if (segredo) console.warn('SEGREDO curto demais (menos de 16 caracteres): usando o guardado no banco.');
    segredo = await banco.valorFixo('segredo', () => crypto.randomBytes(32).toString('hex'));
  }
  const { criarServidor, salas } = criarApp({ banco, segredo });
  const servidor = criarServidor();
  const porta = +process.env.PORT || 8080;
  servidor.listen(porta, () => console.log(`Dice Duel em http://localhost:${porta} (banco: ${process.env.DATABASE_URL ? 'postgres' : 'arquivo'})`));
  const encerrar = async () => { salas.fechar(); servidor.close(); await banco.fechar(); process.exit(0); };
  process.on('SIGTERM', encerrar); process.on('SIGINT', encerrar);
})().catch(e => { console.error(e); process.exit(1); });
