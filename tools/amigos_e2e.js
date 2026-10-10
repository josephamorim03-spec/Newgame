// Teste ponta a ponta dos amigos: dois navegadores, nomes que já existem (Ana = ANA = aná) recusados enquanto se digita,
// pedido de amizade, aceite ao vivo, ver o amigo online, chamar para a sala pelo nome e começar a partida; ranking entre amigos.
// Uso: NODE_PATH=$(npm root -g) node tools/amigos_e2e.js
'use strict';
const { chromium } = require('playwright');
const { criarApp } = require('../servidor/app');
const { BancoMemoria } = require('../servidor/banco');
const { verificar } = require('./layout');
const path = require('path');
const fs = require('fs');
const FOTOS = path.join(__dirname, '..', 'builds', 'fotos');
fs.mkdirSync(FOTOS, { recursive: true });

(async () => {
  const { criarServidor, salas, fila } = criarApp({ banco: new BancoMemoria(), segredo: 'segredo-do-teste-dos-amigos-123', tempos: { escolha: 0 }, limites: { ws: 100000 } });
  const servidor = criarServidor();
  await new Promise(r => servidor.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  // um segundo servidor com a fila por rating ligada (no ar ela fica desligada até haver gente bastante)
  const comFila = criarApp({ banco: new BancoMemoria(), segredo: 'segredo-do-teste-dos-amigos-123', tempos: { escolha: 0 }, limites: { ws: 100000 }, fila: true, filaOpcoes: { intervalo: 200 } });
  const servidorFila = comFila.criarServidor();
  await new Promise(r => servidorFila.listen(0, '127.0.0.1', r));
  const baseFila = `http://127.0.0.1:${servidorFila.address().port}`;
  const navegador = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const erros = [];
  const abrir = async (nome, vp, url = base) => {
    const ctx = await navegador.newContext({ viewport: vp, hasTouch: vp.width < 500 });
    const pg = await ctx.newPage();
    pg.on('pageerror', e => erros.push(`${nome}: ${e.message}`));
    pg.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_NAME|net::|status of 40[49]/.test(m.text())) erros.push(`${nome} console: ${m.text()}`); });
    await pg.goto(url + '/'); await pg.waitForTimeout(300);
    await pg.evaluate(() => { DiceDuel.ajustar({ animacoes: false, som: false, musica: false }); ['janelaDeck', 'fim', 'janelaCarta'].forEach(id => { document.getElementById(id).hidden = true; }); });
    return pg;
  };
  const layout = async (pg, tela) => (await pg.screenshot({ path: path.join(FOTOS, `amigos-${tela}-${pg.viewportSize().width}.png`) }), await pg.evaluate(verificar)).forEach(x => erros.push(`layout ${tela} (${pg.viewportSize().width}px): ${x}`));
  const statusDoNome = async (pg, nome) => {
    await pg.fill('#formConta [name=nome]', '');
    await pg.type('#formConta [name=nome]', nome, { delay: 20 });
    await pg.waitForFunction(n => { const s = document.querySelector('.nome-status'); const i = document.querySelector('#formConta [name=nome]'); return s && i && i.value === n; }, nome, { timeout: 5000 });
    return pg.evaluate(() => ({ livre: document.querySelector('.nome-status').classList.contains('livre'), texto: document.querySelector('.nome-status').textContent }));
  };
  async function criarConta(pg, nome) {
    await pg.evaluate(() => document.getElementById('btnOnline').click()); await pg.click('[data-on="aba-criar"]');
    const s = await statusDoNome(pg, nome);
    if (!s.livre) throw new Error(`${nome} deveria estar livre: ${s.texto}`);
    await pg.fill('#formConta [name=senha]', 'senha-boa-1');
    await pg.click('#formConta [type=submit]');
    await pg.waitForSelector('.eu-online', { timeout: 5000 });
  }

  try {
    const ana = await abrir('ana', { width: 390, height: 844 });
    await criarConta(ana, 'Ana');
    const bia = await abrir('bia', { width: 1360, height: 900 });
    await bia.evaluate(() => document.getElementById('btnOnline').click()); await bia.click('[data-on="aba-criar"]');
    // o mesmo nome em outra forma é recusado já enquanto se digita, e o servidor recusa se insistir
    for (const n of ['ANA', 'aná', 'a.na']) {
      const s = await statusDoNome(bia, n);
      if (s.livre || !/Ana/.test(s.texto)) throw new Error(`"${n}" deveria aparecer como igual a Ana: ${s.texto}`);
    }
    await bia.fill('#formConta [name=senha]', 'senha-boa-2');
    await bia.click('#formConta [type=submit]');
    await bia.waitForFunction(() => /já existe/.test(document.getElementById('onlineAviso').textContent), null, { timeout: 5000 });
    await layout(bia, 'nome-ocupado');
    await bia.evaluate(() => { document.getElementById('janelaOnline').hidden = true; });
    await criarConta(bia, 'Bia');
    console.log('1) nomes: ANA, aná e a.na recusados como iguais a "Ana"');

    // quem está online: o visitante sem conta vê quantos; a Bia vê a Ana na lista e o contador no botão
    const visita = await abrir('visita', { width: 390, height: 844 });
    await visita.evaluate(() => document.getElementById('btnOnline').click());
    await visita.waitForFunction(() => /2 pessoas estão com o jogo aberto/.test(document.getElementById('onlineConteudo').textContent), null, { timeout: 8000 });
    await layout(visita, 'visitante-online');
    await visita.close();
    await bia.waitForFunction(() => [...document.querySelectorAll('.amigo')].some(x => /Ana/.test(x.textContent) && x.querySelector('[data-on="adicionar"]')), null, { timeout: 8000 });
    await bia.waitForFunction(() => document.getElementById('contaOnline').textContent === '1' && !document.getElementById('contaOnline').hidden, null, { timeout: 35000 });
    await layout(bia, 'online-agora');
    // a Bia chama a Ana antes de serem amigas: o convite chega dizendo que ainda não é amiga; a Ana recusa
    await bia.click('.amigo [data-on="chamar"]');
    await ana.waitForSelector('#chamadoAmigo:not([hidden])', { timeout: 8000 });
    if (!/ainda não é seu amigo/.test(await ana.textContent('#chamadoAmigo'))) throw new Error('o convite não disse que ainda não são amigas');
    await ana.click('#chamadoAmigo [data-chamado="nao"]');
    await bia.waitForSelector('[data-on="sair-sala"]', { timeout: 5000 });
    await bia.click('[data-on="sair-sala"]');
    await bia.waitForSelector('#formAmigo', { timeout: 5000 });
    console.log('1b) online agora: visitante vê quantos, a lista mostra a Ana, contador no botão, chamar quem ainda não é amigo');

    // Bia pede Ana em amizade pelo nome (em minúsculas); Ana recebe ao vivo e aceita
    await bia.fill('#formAmigo [name=amigo]', 'ana');
    await bia.click('#formAmigo [type=submit]');
    await bia.waitForFunction(() => /pedido enviado/.test(document.querySelector('.amigos').textContent), null, { timeout: 5000 });
    await ana.waitForFunction(() => /Pedido de amizade/.test(document.body.textContent), null, { timeout: 8000 });
    await ana.waitForSelector('[data-on="aceitar-amigo"]', { timeout: 8000 });
    await layout(ana, 'pedido-recebido');
    await ana.click('[data-on="aceitar-amigo"]');
    await ana.waitForFunction(() => { const li = [...document.querySelectorAll('.amigo')].find(x => /Bia/.test(x.textContent)); return li && /online/.test(li.textContent); }, null, { timeout: 8000 });
    await bia.waitForFunction(() => [...document.querySelectorAll('.amigo')].some(x => /Ana/.test(x.textContent) && !/pedido enviado/.test(x.textContent)), null, { timeout: 25000 });
    await layout(ana, 'amigos'); await layout(bia, 'amigos');
    console.log('2) amizade: pedido pelo nome, aviso ao vivo, aceite, amigo aparece online');

    // ranking entre amigos: os dois, com a posição
    await ana.click('[data-on="rk-amigos"]');
    await ana.waitForFunction(() => document.querySelectorAll('.ranking li').length === 2, null, { timeout: 5000 });
    await layout(ana, 'ranking-amigos');
    console.log('3) ranking entre amigos com os dois');

    // Ana chama Bia direto pela lista (cria a sala sozinha); Bia recebe o convite e entra
    await ana.click('.amigo [data-on="chamar"]');
    await bia.waitForSelector('#chamadoAmigo:not([hidden])', { timeout: 8000 });
    await layout(bia, 'chamado');
    await bia.click('#chamadoAmigo [data-chamado="entrar"]');
    for (const pg of [ana, bia]) await pg.waitForFunction(() => DiceDuel.jogo && DiceDuel.jogo.modo === 'online', null, { timeout: 8000 });
    const nomes = await bia.evaluate(() => DiceDuel.jogo.nomes);
    if (nomes[1] !== 'Ana') throw new Error('a Bia não está contra a Ana: ' + nomes);
    console.log('4) chamar pelo nome: a Bia entrou pela chamada e a partida começou');

    // fila ligada: o botão aparece, os dois procuram e a partida começa sozinha
    if (await ana.$('[data-on="procurar"]')) throw new Error('com a fila desligada, "Procurar rival" não devia aparecer');
    const caio = await abrir('caio', { width: 390, height: 844 }, baseFila), duda = await abrir('duda', { width: 1360, height: 900 }, baseFila);
    await criarConta(caio, 'Caio'); await criarConta(duda, 'Duda');
    for (const pg of [caio, duda]) { await pg.click('#btnFecharOnline'); await pg.evaluate(() => document.getElementById('btnOnline').click()); await pg.waitForSelector('[data-on="procurar"]', { timeout: 5000 }); }
    await caio.click('[data-on="procurar"]');
    await caio.waitForSelector('[data-on="cancelar-busca"]', { timeout: 5000 });
    await layout(caio, 'procurando');
    await duda.click('[data-on="procurar"]');
    for (const pg of [caio, duda]) await pg.waitForFunction(() => DiceDuel.jogo && DiceDuel.jogo.modo === 'online', null, { timeout: 10000 });
    if ((await caio.evaluate(() => DiceDuel.jogo.nomes[1])) !== 'Duda') throw new Error('a fila não juntou Caio e Duda');
    console.log('5) fila por rating (ligada): procurar rival juntou os dois e a partida começou');
  } catch (e) {
    erros.push(e.stack || String(e));
  }
  await navegador.close();
  salas.fechar(); fila.fechar(); servidor.wss.clients.forEach(c => c.terminate()); servidor.close();
  comFila.salas.fechar(); comFila.fila.fechar(); servidorFila.wss.clients.forEach(c => c.terminate()); servidorFila.close();
  if (erros.length) { console.error('ERROS:\n' + erros.join('\n')); process.exit(1); }
  console.log('Tudo certo: nenhum erro.');
  process.exit(0);
})();
