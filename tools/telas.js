// As telas do jogo, todas de uma vez, no tamanho de celular (390×844): o menu, os modos, o caderno, a Loja, o deck, os
// Ajustes, o Perfil, o Online, as Regras, o começo da partida, a partida, a pausa e o fim. Para revisar a identidade
// visual a cada versão, lado a lado (docs/visual-impresso.md, "O rumo"). Uso: NODE_PATH=$(npm root -g) node tools/telas.js
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const OUT = process.argv[2] || path.join(__dirname, '..', 'builds', 'telas'); fs.mkdirSync(OUT, { recursive: true });
const VET = { guia: { estreia: true, jogou: true, vistos: ['eco', 'passo', 'oposto', 'disparo', 'ruptura'], caps: ['C2'] }, rec: { partidas: 12, vitorias: 7, seq: 2, melhorSeq: 3, maiorDisparo: 9, maiorCorrente: 5 }, deckVisto: true,
  pref: { liberar: true },
  conta: { moedas: 340, rating: 1027, xp: 180, cartas: ['ajuste', 'coringa', 'pressa', 'rerrolar', 'virar', 'ancora', 'interferencia', 'sobrecarga', 'reverso'], dados: ['marfim', 'menta'], icones: ['bolinha', 'xicara'], mesas: ['salvia'], dado: 'marfim', icone: 'xicara', mesa: 'salvia', historia: { feitos: ['P', 'C1'], estrelas: { C1: 2 } } } };
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
  const foto = async n => { await pg.waitForTimeout(450); await pg.screenshot({ path: `${OUT}/${n}.png` }); };
  const fecharTudo = () => pg.evaluate(() => document.querySelectorAll('.janela').forEach(j => j.hidden = true));
  await pg.goto('file://' + path.join(__dirname, '..', 'index.html')); await pg.evaluate(v => localStorage.setItem('diceduel.v1', JSON.stringify(v)), VET);
  await pg.reload(); await pg.waitForTimeout(1200);
  await foto('01-menu');
  await pg.click('[data-inicio="jogar"]'); await foto('02-modos');
  await pg.click('[data-inicio="historia"]'); await foto('03-caderno'); await fecharTudo();
  await pg.evaluate(() => document.getElementById('btnCarteira').click()); await foto('04-loja'); await fecharTudo();
  await pg.evaluate(() => document.getElementById('btnDeck').click()); await foto('05-deck'); await fecharTudo();
  await pg.evaluate(() => document.getElementById('btnConfig').click()); await foto('06-ajustes'); await fecharTudo();
  await pg.click('[data-inicio="perfil"]'); await foto('07-perfil'); await fecharTudo();
  await pg.evaluate(() => document.getElementById('btnOnline').click()); await foto('08-online'); await fecharTudo();
  await pg.evaluate(() => DiceDuel.abrirInicio());
  await pg.click('[data-inicio="regras"]'); await foto('09-regras'); await pg.keyboard.press('Escape');
  // partida (capítulo 2, pelo motor; sem o gibi do antes)
  await pg.evaluate(() => { DiceDuel.st.decks[0] = ['ajuste', 'coringa', 'pressa']; DiceDuel.avulsa('aprendiz'); });
  await pg.waitForTimeout(300); await foto('10-versus');
  if (await pg.$('.versus .btn-mel')) await pg.click('.versus .btn-mel');
  await pg.waitForTimeout(2500); await foto('11-partida');
  await pg.click('.pega:not([disabled])').catch(() => {}); await foto('12-escolhendo');
  await pg.click('#btnPausa').catch(() => {}); await foto('13-pausa'); await pg.keyboard.press('Escape');
  await pg.evaluate(() => { const j = DiceDuel.jogo; Regras.desistir(j, 0); });
  await pg.evaluate(() => DiceDuel.ajustar({}));
  await pg.waitForTimeout(2500); await foto('14-fim');
  await b.close();
})();
