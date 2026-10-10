// Teste ponta a ponta da política de AFK no online: dois navegadores numa partida, vez curta (8 s: aviso aos 4 s
// parado, derrota aos 6 s). Quem tem a vez não toca em nada:
// 1) a pergunta "Você ainda está aí?" aparece para ele (com a contagem) e o rival vê "ausente";
// 2) "Estou aqui" tira a pergunta da tela dos dois e a partida segue;
// 3) os dois jogam uma vez; na vez seguinte, parado de novo e sem resposta, a partida acaba: a tela do fim diz
//    que ele não respondeu ao "Você ainda está aí?". (Na mesma vez não dá: depois da resposta, sobra menos que metade da vez.)
// Uso: NODE_PATH=$(npm root -g) node tools/afk_e2e.js
'use strict';
const { chromium } = require('playwright');
const { criarApp } = require('../servidor/app');
const { BancoMemoria } = require('../servidor/banco');

(async () => {
  const banco = new BancoMemoria();
  const { criarServidor, salas } = criarApp({ banco, segredo: 'segredo-do-teste-de-afk-1234567890', tempos: { escolha: 0, limiteVez: 8000 }, limites: { ws: 100000 } });
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
    return pg;
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
  const naPartida = pg => pg.waitForFunction(() => DiceDuel.jogo && DiceDuel.jogo.modo === 'online' && DiceDuel.jogo.fase !== 'fim', null, { timeout: 15000 });
  const passo = txt => console.log(txt);
  // uma jogada pela tela: toca num dado e leva para a corrente (ou dispara)
  const jogada = pg => pg.evaluate(() => {
    const j = DiceDuel.jogo;
    if (!j || j.fase === 'fim' || j.vez !== 0 || j.pensando) return false;
    if (j.fase === 'decidir') { const b = document.querySelector('[data-acao="disparar"]') || document.querySelector('[data-acao="segurar"]'); if (b) b.click(); return !!b; }
    const d = document.querySelector('#mesa .pega:not([disabled])'); if (!d) return false;
    d.click();
    const al = document.querySelector('[data-alvo-dado="corrente"]') || document.querySelector('[data-alvo-dado="bolso"]'); if (al) al.click();
    const cf = document.querySelector('[data-confirma]'); if (cf) cf.click();
    return true;
  });
  const vezDe = pg => pg.evaluate(() => DiceDuel.jogo.vez === 0 && DiceDuel.jogo.fase !== 'fim');

  try {
    const ana = await abrir('ana'), bia = await abrir('bia');
    for (const pg of [ana, bia]) { await pg.goto(base + '/'); await pg.waitForTimeout(300); await sem(pg); await fechar(pg); }
    await criarConta(ana, 'Ana'); await criarConta(bia, 'Bia');
    await ana.click('[data-on="criar-sala"]');
    await ana.waitForSelector('.codigo-grande', { timeout: 5000 });
    const codigo = (await ana.textContent('.codigo-grande')).trim();
    await bia.evaluate(c => { const u = new URL(location.href); u.searchParams.set('sala', c); location.href = u; }, codigo);
    await bia.waitForTimeout(800); await sem(bia);
    for (const pg of [ana, bia]) await naPartida(pg);
    for (const pg of [ana, bia]) await fechar(pg);
    // quem tem a vez fica parado (nenhum toque na página dele daqui em diante, até a resposta)
    const anaJoga = await ana.evaluate(() => DiceDuel.jogo.vez === 0);
    const [parado, outro] = anaJoga ? [ana, bia] : [bia, ana];

    // 1) a pergunta aparece para quem está parado; o rival vê "ausente"
    await parado.waitForSelector('#janelaAfk:not([hidden])', { timeout: 7000 });
    const pergunta = await parado.evaluate(() => ({ titulo: document.getElementById('afkTitulo').textContent, s: +document.querySelector('#janelaAfk [data-afk]').textContent, aba: document.title }));
    if (pergunta.titulo !== 'Você ainda está aí?' || !(pergunta.s >= 1 && pergunta.s <= 2) || !pergunta.aba.startsWith('● Você ainda está aí?')) throw new Error('a pergunta não está certa: ' + JSON.stringify(pergunta));
    await outro.waitForFunction(() => /ausente/i.test((document.querySelector('#pj1 .vez-tag') || {}).textContent || ''), null, { timeout: 3000 });
    if (await outro.$('#janelaAfk:not([hidden])')) throw new Error('a pergunta apareceu para quem não estava parado');
    passo(`1) parado: "${pergunta.titulo}" com ${pergunta.s} s para responder; o rival vê "ausente"`);

    // 2) "Estou aqui": a pergunta some para os dois e a partida segue
    await parado.click('#btnAfk');
    await parado.waitForFunction(() => document.getElementById('janelaAfk').hidden && !DiceDuel.jogo.inatividade, null, { timeout: 3000 });
    await outro.waitForFunction(() => !/ausente/i.test((document.querySelector('#pj1 .vez-tag') || {}).textContent || ''), null, { timeout: 3000 });
    if (await parado.evaluate(() => DiceDuel.jogo.fase === 'fim')) throw new Error('a partida acabou mesmo com a resposta');
    passo('2) "Estou aqui": a pergunta sumiu para os dois e a partida seguiu');

    // 3) o parado joga a vez dele, o outro também; na vez seguinte, parado e sem resposta: acaba por inatividade
    for (let k = 0; k < 40 && await vezDe(parado); k++) { await jogada(parado); await parado.waitForTimeout(150); }
    for (let k = 0; k < 60 && !(await vezDe(parado)); k++) { await jogada(outro); await outro.waitForTimeout(150); }
    if (!(await vezDe(parado))) throw new Error('a vez não voltou para quem vai ficar parado');
    await parado.waitForSelector('#janelaAfk:not([hidden])', { timeout: 7000 });
    await parado.waitForFunction(() => DiceDuel.jogo.fase === 'fim', null, { timeout: 5000 });
    await outro.waitForFunction(() => DiceDuel.jogo.fase === 'fim' && !document.getElementById('fim').hidden, null, { timeout: 8000 });
    const fim = await outro.evaluate(() => ({ titulo: document.getElementById('fimTitulo').textContent, motivo: (document.querySelector('.fim-motivo') || {}).textContent }));
    if (fim.titulo !== 'Você venceu!' || !(fim.motivo || '').includes('não respondeu ao “Você ainda está aí?”')) throw new Error('o fim não diz o porquê: ' + JSON.stringify(fim));
    if (!(await parado.evaluate(() => document.getElementById('janelaAfk').hidden))) throw new Error('a pergunta ficou na tela depois do fim');
    passo(`3) sem resposta: "${fim.titulo}" para o rival, com "${fim.motivo}"`);
  } catch (e) {
    erros.push(e.stack || String(e));
  }
  await navegador.close();
  salas.fechar(); servidor.wss.clients.forEach(c => c.terminate()); servidor.close();
  if (erros.length) { console.error('ERROS:\n' + erros.join('\n')); process.exit(1); }
  console.log('Tudo certo: nenhum erro.');
  process.exit(0);
})();
