// Teste de fumaça do Dice Duel: joga partidas inteiras no navegador (celular e computador),
// usa cartas, dispensa o 2.º dado da Pressa, mexe nos Ajustes e falha se aparecer qualquer erro no console.
// Uso: npm i -D playwright && node tools/fumaca.js   (fotos em builds/fotos/)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const RAIZ = path.join(__dirname, '..');
const FOTOS = path.join(RAIZ, 'builds', 'fotos');
fs.mkdirSync(FOTOS, { recursive: true });

(async () => {
  const navegador = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const erros = [];
  const rodadas = [
    { nome: 'celular', vp: { width: 390, height: 844 }, pronto: 0, modo: 'bot', mexeAjustes: true },
    { nome: 'celular-coruja', vp: { width: 390, height: 844 }, pronto: 1, modo: 'bot', coruja: true },
    { nome: 'computador', vp: { width: 1360, height: 900 }, pronto: 2, modo: 'bot', coruja: true },
  ];
  for (const r of rodadas) {
    const pg = await navegador.newPage({ viewport: r.vp, hasTouch: r.nome.startsWith('celular') });
    pg.on('pageerror', e => erros.push(`${r.nome}: ${e.message}`));
    pg.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) erros.push(`${r.nome} console: ${m.text()}`); });
    await pg.goto('file://' + path.join(RAIZ, 'index.html'));
    await pg.waitForTimeout(500);
    await pg.evaluate(() => { DiceDuel.st.guia.estreia = true; });   // a estreia tem o próprio teste (tools/estreia_e2e.js)
    // o jogo abre no menu principal; na primeira visita o Jogar leva à tela de montar o deck, com as armadilhas travadas
    if (r.nome === 'celular') await pg.screenshot({ path: path.join(FOTOS, 'inicio-celular.png') });
    await pg.click('[data-inicio="jogar"]'); await pg.waitForTimeout(150);   // Jogar abre a escolha do rival
    if (await pg.$('#inicioRivais[hidden]')) erros.push(`${r.nome}: o Jogar não abriu a escolha do rival`);
    if (r.nome === 'celular') await pg.screenshot({ path: path.join(FOTOS, 'rivais-celular.png') });
    await pg.click('[data-inicio="comecar"]'); await pg.waitForTimeout(150);
    const deckAberto = await pg.evaluate(() => !document.getElementById('janelaDeck').hidden);
    const travadas = await pg.$$eval('.op .preco', l => l.length);
    if (r.nome === 'celular') await pg.screenshot({ path: path.join(FOTOS, 'deck-celular.png') });
    await pg.evaluate(() => { DiceDuel.st.pref.liberar = true; });       // libera tudo para testar as armadilhas
    await pg.click('#btnFecharDeck');
    if (r.mexeAjustes) {
      await pg.evaluate(() => document.getElementById('btnConfig').click()); await pg.waitForTimeout(200);
      await pg.screenshot({ path: path.join(FOTOS, 'ajustes-celular.png') });
      for (const id of ['#opMusica', '#opMusica', '#opSom', '#opSom', '#opAnim', '#opAnim', '#opParticulas', '#opParticulas']) await pg.click(id);
      await pg.click('#btnFecharConfig');
      // loja: com moedas de teste, compra uma skin, um ícone e uma carta, e usa
      await pg.evaluate(() => { DiceDuel.st.conta.moedas = 1000; });
      await pg.evaluate(() => document.getElementById('btnCarteira').click()); await pg.waitForTimeout(150);
      for (const [aba, item] of [['dados', 'dados:dourado'], ['icones', 'icones:raposa'], ['cartas', 'cartas:espelho']]) {
        await pg.click(`[data-aba-loja="${aba}"]`);
        await pg.click(`[data-comprar="${item}"]`); await pg.click(`[data-comprar="${item}"]`);
        await pg.waitForTimeout(150);
      }
      await pg.click('[data-aba-loja="dados"]');
      await pg.screenshot({ path: path.join(FOTOS, 'loja-celular.png') });
      const conta = await pg.evaluate(() => DiceDuel.st.conta);
      if (conta.dado !== 'dourado' || !conta.cartas.includes('espelho') || conta.icone !== 'raposa' || conta.moedas !== 1000 - 450 - 100 - 110) erros.push(`${r.nome}: a compra na loja não funcionou ${JSON.stringify(conta)}`);
      await pg.click('#btnFecharLoja');
    }
    // a sessão se monta no menu principal: o rival na escolha de cima
    // (fechar o deck da primeira visita deixa a escolha do rival aberta: é dali que se joga)
    if (r.coruja) { if (!(await pg.$('#inicioRivais:not([hidden])'))) await pg.click('[data-inicio="jogar"]'); await pg.click('[data-inicio="rival"][data-v="esperto"]'); await pg.click('[data-inicio="voltar"]'); }
    await pg.evaluate(() => document.getElementById('btnDeck').click());
    await pg.click(`[data-pronto="${r.pronto}"]`);
    if (await pg.$('[data-inicio="dois"]')) erros.push(`${r.nome}: o menu ainda oferece o modo a dois`);
    await pg.click('#btnJogarDeck');
    await pg.waitForTimeout(300);
    if (r.nome === 'celular') await pg.screenshot({ path: path.join(FOTOS, 'versus-celular.png') });
    const versus = await pg.$('.versus'); if (versus) await versus.click();
    let passos = 0, usosCarta = 0, dispensas = 0;
    while (passos++ < 1200) {
      try {
        await pg.waitForTimeout(70);
        if (await pg.evaluate(() => DiceDuel.jogo.fase === 'fim')) break;
        const aj = await pg.$$('[data-ajuste]:not([disabled])'); if (aj.length) { await aj[0].click(); continue; }
        if (await pg.$('.mesa.alvo')) { const d = await pg.$('.pega:not([disabled])'); if (d) await d.click(); continue; }
        const dst = await pg.$$('[data-destino]'); if (dst.length) { await dst[Math.floor(Math.random() * dst.length)].click(); continue; }
        // dado escolhido: tocar na corrente ou no Bolso; se o jogo perguntar, responder ao acaso (às vezes cancelar)
        const cf = await pg.$$('[data-confirma]'); if (cf.length) { if (Math.random() < 0.85) await cf[Math.floor(Math.random() * cf.length)].click(); else await pg.click('#acoes [data-acao="cancelar"]'); continue; }
        const alvos = await pg.$$('[data-alvo-dado]'); if (alvos.length) { await alvos[Math.floor(Math.random() * alvos.length)].click(); continue; }
        const disp = await pg.$('[data-acao="disparar"]');
        if (disp) { const t = await disp.innerText(); const L = +(t.match(/\+(\d+)/) || [0, 0])[1]; await pg.click(L >= 2 ? '[data-acao="disparar"]' : '[data-acao="segurar"]'); continue; }
        const minhas = await pg.$$('.jogador.da-vez button.carta.pronta');
        if (minhas.length && Math.random() < 0.25) {
          await minhas[Math.floor(Math.random() * minhas.length)].click(); await pg.waitForTimeout(50);
          // na sua vez a carta abre no painel; fora dela (decidir, 2.º dado da Pressa), na janela de leitura
          const usar = await pg.$('#acoes [data-usar]:not([disabled]), #cartaBotoes [data-usar]:not([disabled])');
          if (await pg.$('.mesa.alvo')) usosCarta++;   // carta com alvo: já espera o dado (o laço toca num dado)
          else if (usar) { await usar.click(); usosCarta++; } else await pg.click('[data-acao="fechar-carta"], [data-acao="cancelar-alvo"], #cartaBotoes [data-fechar-carta]');
          continue;
        }
        const disp2 = await pg.$('[data-acao="dispensar"]'); if (disp2 && Math.random() < 0.3) { await disp2.click(); dispensas++; continue; }
        const conf = await pg.$('.pega.armado:not([disabled])'); if (conf) { await conf.click(); continue; }
        const bom = await pg.$('.pega:not([disabled]):not(.nao-cabe)'); const qualquer = await pg.$('.pega:not([disabled])');
        if (bom) await bom.click(); else if (qualquer) await qualquer.click();
        if (passos === 45) await pg.screenshot({ path: path.join(FOTOS, `meio-${r.nome}.png`) });
      } catch (e) { if (!/not attached|detached|not stable|not visible|intercepts|Target closed/.test(e.message)) throw e; }
    }
    await pg.waitForFunction(() => !document.getElementById('fim').hidden, null, { timeout: 9000 }).catch(() => {});
    await pg.waitForTimeout(1200);
    if (r.nome === 'celular') await pg.screenshot({ path: path.join(FOTOS, 'fim-celular.png') });
    const res = await pg.evaluate(() => ({
      fase: DiceDuel.jogo.fase, placar: DiceDuel.jogo.pts, fimAberto: !document.getElementById('fim').hidden,
      momentos: DiceDuel.jogo.momentos.map(m => m.txt), largura: [document.documentElement.scrollWidth, innerWidth],
      premio: DiceDuel.jogo.premio && { moedas: DiceDuel.jogo.premio.moedas && DiceDuel.jogo.premio.moedas.total, rating: [DiceDuel.jogo.premio.ratingAntes, DiceDuel.jogo.premio.rating], nivel: DiceDuel.jogo.premio.nivelDepois },
      recompensas: document.getElementById('fimRecompensas').textContent.trim().slice(0, 140),
    }));
    console.log(r.nome, { deckAberto, travadas, passos, usosCarta, dispensas, ...res });
    if (res.fase !== 'fim') erros.push(`${r.nome}: a partida não terminou`);
    if (r.modo === 'bot' && !res.premio) erros.push(`${r.nome}: o fim da partida não deu recompensa`);
    if (res.largura[0] > res.largura[1]) erros.push(`${r.nome}: a página rola para o lado`);
    await pg.close();
  }
  await navegador.close();
  console.log(erros.length ? 'ERROS:\n' + erros.join('\n') : 'Tudo certo: nenhum erro.');
  process.exit(erros.length ? 1 : 0);
})();
