// Dice Duel · servidor (Railway): node servidor/index.js
// Variáveis: PORT (a Railway define), SEGREDO (assina os tokens; opcional: sem ele, um é criado e guardado no banco),
// DATABASE_URL (Postgres; sem ela, guarda tudo num arquivo JSON em DADOS, padrão ./dados/banco.json),
// ORIGENS (endereços de fora que podem chamar a API, separados por vírgula; ex.: https://diceduel-game.vercel.app),
// FILA=1 (liga a busca de rival por rating; desligada enquanto há pouca gente jogando)
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
  // a página oficial (Vercel) vale mesmo sem ORIGENS: esquecer a variável na Railway não pode derrubar o online
  // dela. ORIGENS troca a lista (ORIGENS vazia de propósito: só este endereço)
  const PAGINA_OFICIAL = 'https://diceduel-game.vercel.app';
  const origens = (process.env.ORIGENS === undefined ? PAGINA_OFICIAL : process.env.ORIGENS).split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);
  const { criarServidor, salas } = criarApp({ banco, segredo, origens, fila: process.env.FILA === '1' });
  const servidor = criarServidor();
  const porta = +process.env.PORT || 8080;
  servidor.listen(porta, () => console.log(`Dice Duel em http://localhost:${porta} (banco: ${process.env.DATABASE_URL ? 'postgres' : 'arquivo'})`));
  let encerrando = false;
  const encerrar = async () => {
    if (encerrando) return;
    encerrando = true;
    salas.fechar(); servidor.close();
    await banco.fechar().catch(e => console.error('fechar banco', e));
    process.exit(0);
  };
  process.on('SIGTERM', encerrar); process.on('SIGINT', encerrar);
  // uma promessa rejeitada sem dono vira log, não derruba as partidas em andamento
  process.on('unhandledRejection', e => console.error('promessa sem tratamento', e));
})().catch(e => { console.error(e); process.exit(1); });
