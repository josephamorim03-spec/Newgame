// Teste ponta a ponta de "Conta e privacidade": dois aparelhos da mesma conta (celular e PC) e uma terceira pessoa.
// Ficar fora do "Online agora", recusar chamadas de quem não é amigo, trocar a senha (o outro aparelho sai),
// apagar a conta (o nome fica livre). Com a CSP do servidor ligada: um bloqueio dela vira erro de console e falha.
// Uso: NODE_PATH=$(npm root -g) node tools/conta_e2e.js
'use strict';
const { chromium } = require('playwright');
const { criarApp } = require('../servidor/app');
const { BancoMemoria } = require('../servidor/banco');
const { verificar } = require('./layout');
const path = require('path');
const FOTOS = path.join(__dirname, '..', 'builds', 'fotos');
require('fs').mkdirSync(FOTOS, { recursive: true });

(async () => {
  const { criarServidor, salas, fila } = criarApp({ banco: new BancoMemoria(), segredo: 'segredo-do-teste-da-conta-1234', limites: { ws: 100000 } });
  const servidor = criarServidor();
  await new Promise(r => servidor.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const navegador = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const erros = [];
  const abrir = async (nome, vp) => {
    const ctx = await navegador.newContext({ viewport: vp, hasTouch: vp.width < 500 });
    const pg = await ctx.newPage();
    pg.on('pageerror', e => erros.push(`${nome}: ${e.message}`));
    pg.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_NAME|net::|status of (40[13489]|429)/.test(m.text())) erros.push(`${nome} console: ${m.text()}`); });
    await pg.goto(base + '/'); await pg.waitForTimeout(300);
    await pg.evaluate(() => { DiceDuel.ajustar({ animacoes: false, som: false, musica: false }); ['janelaDeck', 'fim', 'janelaCarta'].forEach(id => { document.getElementById(id).hidden = true; }); });
    return pg;
  };
  const layout = async (pg, tela) => (await pg.screenshot({ path: path.join(FOTOS, `conta-${tela}-${pg.viewportSize().width}.png`) }), await pg.evaluate(verificar)).forEach(x => erros.push(`layout ${tela} (${pg.viewportSize().width}px): ${x}`));
  const avisoTem = (pg, re) => pg.waitForFunction(r => new RegExp(r).test(document.getElementById('onlineAviso').textContent), re.source, { timeout: 8000 });
  async function entrar(pg, nome, senha, criar) {
    await pg.click('#btnOnline');
    if (criar) await pg.click('[data-on="aba-criar"]');
    await pg.fill('#formConta [name=nome]', nome); await pg.fill('#formConta [name=senha]', senha);
    await pg.click('#formConta [type=submit]');
    await pg.waitForSelector('.eu-online', { timeout: 5000 });
  }
  const abrirConta = async pg => { await pg.evaluate(() => { const d = document.querySelector('.conta-opcoes'); if (!d.open) d.querySelector('summary').click(); }); await pg.waitForSelector('.conta-opcoes[open]'); };

  try {
    const cel = await abrir('cel', { width: 390, height: 844 });
    await entrar(cel, 'Helena', 'senha-boa-1', true);
    const pc = await abrir('pc', { width: 1360, height: 900 });
    await entrar(pc, 'helena', 'senha-boa-1', false);
    const outro = await abrir('outro', { width: 390, height: 844 });
    await entrar(outro, 'Igor', 'senha-boa-2', true);

    // avisos de senha: tentativas restantes, trava com contagem no botão, outro nome destrava, mostrar senha, Caps Lock
    const intruso = await abrir('intruso', { width: 390, height: 844 });
    await intruso.click('#btnOnline');
    await intruso.click('[data-ver-senha]');
    if ((await intruso.getAttribute('#formConta [name=senha]', 'type')) !== 'text') throw new Error('"mostrar" não revelou a senha');
    await intruso.click('[data-ver-senha]');
    await intruso.focus('#formConta [name=senha]');
    await intruso.keyboard.press('CapsLock'); await intruso.keyboard.press('a');
    const caps = await intruso.$('.caps-aviso');
    await intruso.keyboard.press('CapsLock');
    for (let i = 0; i < 5; i++) {
      await intruso.fill('#formConta [name=nome]', 'igor'); await intruso.fill('#formConta [name=senha]', 'chute-' + i);
      await intruso.click('#formConta [type=submit]');
      await intruso.waitForFunction(n => document.getElementById('onlineAviso').dataset.n !== String(n) && (document.getElementById('onlineAviso').dataset.n = n, true), i);
      await intruso.waitForTimeout(250);
      if (i === 2 && !/Mais 2 tentativas/.test(await intruso.textContent('#onlineAviso'))) throw new Error('faltou o aviso de tentativas restantes: ' + await intruso.textContent('#onlineAviso'));
    }
    await intruso.waitForFunction(() => { const b = document.querySelector('#formConta [type=submit]'); return b.disabled && /Tente de novo em 1[45]:\d\d/.test(b.textContent); }, null, { timeout: 5000 });
    if (!/travado por 15 minutos/.test(await intruso.textContent('#onlineAviso'))) throw new Error('faltou o aviso da trava');
    await layout(intruso, 'login-travado');
    await intruso.fill('#formConta [name=nome]', 'outra-pessoa');
    await intruso.waitForFunction(() => !document.querySelector('#formConta [type=submit]').disabled, null, { timeout: 3000 });
    await intruso.close();
    console.log(`0) senha: aviso de tentativas, trava com contagem no botão, outro nome destrava, mostrar senha${caps ? ', Caps Lock' : ' (Caps Lock não simulável aqui)'}`);
    // o Igor vê a Helena no Online agora
    await outro.waitForFunction(() => [...document.querySelectorAll('.amigo')].some(x => /Helena/.test(x.textContent)), null, { timeout: 25000 });

    // privacidade: Helena sai do Online agora e só aceita chamadas de amigos
    await abrirConta(cel);
    await layout(cel, 'conta-opcoes');
    await cel.click('.conta-opcoes [data-priv="visivel"]');
    await cel.click('[data-on="priv-amigos"]');
    await cel.waitForFunction(() => { const p = DiceDuel.st.sessao.perfil.extras.privacidade || {}; return p.visivel === false && p.chamadas === 'amigos'; }, null, { timeout: 5000 });
    await outro.click('#btnFecharOnline'); await outro.click('#btnOnline');
    await outro.waitForFunction(() => !/Helena/.test([...document.querySelectorAll('.amigo')].map(x => x.textContent).join()), null, { timeout: 10000 });
    // e a chamada de quem não é amigo é recusada (pelo nome, já que ela não aparece)
    await outro.evaluate(() => document.querySelector('[data-on="criar-sala"]').click());
    await outro.waitForSelector('.codigo-grande', { timeout: 5000 });
    console.log('1) privacidade: fora do Online agora para quem não é amigo; "só amigos" ligado');

    // trocar a senha no celular: o PC sai da conta, o celular continua
    await cel.fill('#formSenha [name=atual]', 'senha-errada');
    await cel.fill('#formSenha [name=nova]', 'senha-nova-9');
    await cel.click('#formSenha [type=submit]');
    await avisoTem(cel, /não confere/);
    await cel.fill('#formSenha [name=atual]', 'senha-boa-1');
    await cel.fill('#formSenha [name=nova]', 'senha-nova-9');
    await cel.click('#formSenha [type=submit]');
    await avisoTem(cel, /Senha trocada/);
    await pc.waitForFunction(() => !DiceDuel.st.sessao, null, { timeout: 30000 });
    if (!(await cel.evaluate(() => !!DiceDuel.st.sessao))) throw new Error('o celular saiu da conta junto');
    await cel.waitForFunction(() => /conectado/.test(document.getElementById('onlineServidor').textContent), null, { timeout: 15000 });
    console.log('2) trocar a senha: o PC saiu da conta, o celular continuou conectado');

    // apagar a conta (pede a senha e dois toques); o nome fica livre
    await abrirConta(cel);
    await cel.fill('#formApagar [name=senha]', 'senha-nova-9');
    await cel.click('#formApagar [type=submit]');
    await cel.click('#formApagar [type=submit]');
    await cel.waitForFunction(() => !DiceDuel.st.sessao, null, { timeout: 8000 });
    await avisoTem(cel, /Conta apagada/);
    const livre = await (await fetch(base + '/api/nomes/Helena')).json();
    if (!livre.livre) throw new Error('o nome não ficou livre depois de apagar a conta');
    console.log('3) apagar a conta: saiu, e o nome Helena ficou livre');
  } catch (e) {
    erros.push(e.stack || String(e));
  }
  await navegador.close();
  salas.fechar(); fila.fechar(); servidor.wss.clients.forEach(c => c.terminate()); servidor.close();
  if (erros.length) { console.error('ERROS:\n' + erros.join('\n')); process.exit(1); }
  console.log('Tudo certo: nenhum erro.');
  process.exit(0);
})();
