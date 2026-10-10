// Teste ponta a ponta da volta depois de uma queda: dois navegadores numa partida online e três quedas da Ana.
// 1) a conexão morre (o servidor derruba o socket): o aparelho volta sozinho e a Bia vê quanto tempo a Ana tem;
// 2) a aba recarrega no meio da partida: o jogo volta para a sala guardada sem ninguém digitar o código;
// 3) o celular fica sem internet por alguns segundos: quando a rede volta, o jogo reconecta na hora.
// Uso: NODE_PATH=$(npm root -g) node tools/reconexao_e2e.js
'use strict';
const { chromium } = require('playwright');
const { criarApp } = require('../servidor/app');
const { BancoMemoria } = require('../servidor/banco');

const espera = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const banco = new BancoMemoria();
  const { criarServidor, salas } = criarApp({ banco, segredo: 'segredo-do-teste-de-reconexao-123', tempos: { escolha: 0 }, limites: { ws: 100000 } });
  const servidor = criarServidor();
  await new Promise(r => servidor.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const navegador = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const erros = [];
  const abrir = async nome => {
    const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const pg = await ctx.newPage();
    pg.on('pageerror', e => erros.push(`${nome}: ${e.message}`));
    pg.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_NAME|net::|WebSocket/.test(m.text())) erros.push(`${nome} console: ${m.text()}`); });
    return { ctx, pg };
  };
  const sem = pg => pg.evaluate(() => DiceDuel.ajustar({ animacoes: false, som: false, musica: false }));
  const fechar = pg => pg.evaluate(() => ['janelaDeck', 'fim', 'janelaCarta', 'janelaLoja', 'janelaConfig', 'janelaOnline'].forEach(id => { document.getElementById(id).hidden = true; }));
  async function criarConta(pg, nome) {
    await pg.evaluate(() => document.getElementById('btnOnline').click());
    await pg.click('[data-on="aba-criar"]');
    await pg.fill('#formConta [name=nome]', nome);
    await pg.fill('#formConta [name=senha]', 'senha-boa-1');
    await pg.click('#formConta [type=submit]');
    await pg.waitForSelector('.eu-online', { timeout: 5000 });
  }
  // derruba no servidor o socket da conta (como uma rede que some sem avisar)
  const derrubarNoServidor = async nome => {
    const c = await banco.contaPorNome(nome);
    servidor.wss.clients.forEach(ws => { if (ws.contaId === c.id) ws.terminate(); });
  };
  const naPartida = (pg, partida) => pg.waitForFunction(p => DiceDuel.jogo && DiceDuel.jogo.modo === 'online' && DiceDuel.jogo.partida === p && DiceDuel.jogo.fase !== 'fim', partida, { timeout: 15000 });

  try {
    const { pg: ana, ctx: ctxAna } = await abrir('ana');
    const { pg: bia } = await abrir('bia');
    for (const pg of [ana, bia]) { await pg.goto(base + '/'); await pg.waitForTimeout(300); await sem(pg); await fechar(pg); }
    await criarConta(ana, 'Ana'); await criarConta(bia, 'Bia');
    await ana.click('[data-on="criar-sala"]');
    await ana.waitForSelector('.codigo-grande', { timeout: 5000 });
    const codigo = (await ana.textContent('.codigo-grande')).trim();
    // a Bia abre o link do convite (já com conta neste aparelho)
    await bia.evaluate(c => { const u = new URL(location.href); u.searchParams.set('sala', c); location.href = u; }, codigo);
    await bia.waitForTimeout(800); await sem(bia);
    for (const pg of [ana, bia]) await naPartida(pg, 1);
    for (const pg of [ana, bia]) await fechar(pg);

    // 1) a conexão morre: a Bia vê que a Ana caiu (com a contagem dos 90 s, se a vez for da Ana: só conta na vez dela)
    // e a Ana volta sozinha
    const vezDaAna = await ana.evaluate(() => DiceDuel.jogo.vez === 0);
    await derrubarNoServidor('Ana');
    let s1 = null;
    if (vezDaAna) {
      await bia.waitForSelector('.volta-rival', { timeout: 8000 });
      s1 = +(await bia.textContent('.volta-rival'));
      if (!(s1 > 60 && s1 <= 90)) throw new Error('contagem de volta estranha: ' + s1);
    } else {
      await bia.waitForFunction(() => /caiu/i.test((document.querySelector('#pj1 .vez-tag') || {}).textContent || ''), null, { timeout: 8000 }).catch(() => {});
    }
    await bia.waitForFunction(() => !document.querySelector('.volta-rival') && !/caiu/i.test((document.querySelector('#pj1 .vez-tag') || {}).textContent || ''), null, { timeout: 10000 });
    await naPartida(ana, 1);
    console.log(`1) queda: a Bia viu ${s1 === null ? '"caiu" (na vez dela, sem contagem)' : `"${s1} s para voltar"`} e a Ana voltou sozinha`);

    // 2) a aba recarrega no meio da partida: volta para a sala guardada
    await ana.reload(); await ana.waitForTimeout(300); await sem(ana);
    await naPartida(ana, 1);
    if (!(await ana.evaluate(() => DiceDuel.jogo.nomes[1] === 'Bia'))) throw new Error('depois de recarregar, a Ana não está contra a Bia');
    console.log('2) aba recarregada: a Ana voltou para a sala sem digitar o código');

    // 3) sem internet por alguns segundos: quando a rede volta, reconecta na hora
    await ctxAna.setOffline(true);
    await derrubarNoServidor('Ana');
    await ana.waitForFunction(() => /sem conexão/.test(document.getElementById('mesaInfo').textContent), null, { timeout: 8000 });
    await espera(4000);
    if (!/sem conexão/.test(await ana.textContent('#mesaInfo'))) throw new Error('sem internet, mas a Ana reconectou assim mesmo (o teste não cortou a rede)');
    const antes = Date.now();
    await ctxAna.setOffline(false);
    await ana.waitForFunction(() => !/sem conexão/.test(document.getElementById('mesaInfo').textContent), null, { timeout: 8000 });
    await naPartida(ana, 1);
    console.log(`3) sem internet: reconectou ${((Date.now() - antes) / 1000).toFixed(1)} s depois de a rede voltar`);

    // a partida segue até o fim normalmente depois das três quedas
    const jogada = pg => pg.evaluate(() => {
      const j = DiceDuel.jogo;
      if (!j || j.modo !== 'online' || j.fase === 'fim' || j.vez !== 0 || j.pensando) return false;
      const clicar = s => { const b = document.querySelector(s); if (b && !b.disabled) { b.click(); return true; } return false; };
      if (j.fase === 'destino') return clicar('[data-destino]');
      if (j.fase === 'decidir') return clicar(Math.random() < 0.65 ? '[data-acao="disparar"]' : '[data-acao="segurar"]');
      const bs = [...document.querySelectorAll('#mesa .pega:not([disabled])')];
      if (!bs.length) return false;
      bs[Math.floor(Math.random() * bs.length)].click();
      // tocar escolhe; tocar na corrente leva (e, se o jogo perguntar, confirma)
        const al = document.querySelector('[data-alvo-dado="corrente"]'); if (al) al.click();
        const cf = document.querySelector('[data-confirma]'); if (cf) cf.click();
      return true;
    });
    for (let passos = 0; ; passos++) {
      if (passos > 3000) throw new Error('a partida não terminou depois das quedas');
      const fins = await Promise.all([ana, bia].map(pg => pg.evaluate(() => DiceDuel.jogo.fase === 'fim' && !!DiceDuel.jogo.premio)));
      if (fins[0] && fins[1]) break;
      const a = await jogada(ana), b = await jogada(bia);
      if (!a && !b) await espera(25);
    }
    console.log('a partida terminou normalmente, com prêmio para os dois');
  } catch (e) {
    erros.push(e.stack || String(e));
  }
  await navegador.close();
  salas.fechar(); servidor.wss.clients.forEach(c => c.terminate()); servidor.close();
  if (erros.length) { console.error('ERROS:\n' + erros.join('\n')); process.exit(1); }
  console.log('Tudo certo: nenhum erro.');
  process.exit(0);
})();
