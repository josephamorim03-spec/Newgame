// Acessibilidade no navegador: quem joga pelo teclado não perde o lugar quando a Mesa é redesenhada; a janela que abre
// recebe o foco, o Tab dá a volta dentro dela e, ao fechar, o foco volta para quem a abriu; "reduzir movimento" no
// sistema desliga as animações, a menos que a pessoa as tenha escolhido em Ajustes.
// Uso: NODE_PATH=$(npm root -g) node tools/acessibilidade_e2e.js
'use strict';
const { chromium } = require('playwright');
const path = require('path');

const PAGINA = 'file://' + path.join(__dirname, '..', 'index.html');

(async () => {
  const navegador = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const erros = [];
  const confere = (ok, txt) => { if (!ok) erros.push(txt); console.log((ok ? 'ok   ' : 'FALHA ') + txt); };
  const nova = async (op = {}) => {
    const pg = await navegador.newPage({ viewport: { width: 1360, height: 900 }, ...op });
    pg.on('pageerror', e => erros.push('erro na página: ' + e.message));
    await pg.goto(PAGINA); await pg.waitForTimeout(350);
    return pg;
  };

  // 1. o foco do teclado sobrevive ao redesenho da Mesa
  const pg = await nova();
  await pg.evaluate(() => { DiceDuel.st.guia.estreia = true; DiceDuel.ajustar({ animacoes: false }); DiceDuel.avulsa('aprendiz'); });
  await pg.waitForTimeout(300);
  await pg.evaluate(() => { const v = document.querySelector('.versus .btn'); if (v) v.click(); });
  const focado = () => pg.evaluate(() => {
    const a = document.activeElement;
    if (!a || !document.getElementById('tabuleiro').contains(a)) return null;
    const d = [...a.attributes].filter(x => x.name.startsWith('data-')).map(x => `${x.name}=${x.value}`);
    return d.length ? a.tagName + ' ' + d.join(' ') : null;
  });
  let antes = null;
  for (let i = 0; i < 80 && !antes; i++) { await pg.keyboard.press('Tab'); antes = await focado(); }
  await pg.evaluate(() => DiceDuel.ajustar({}));   // redesenha tudo
  const depois = await focado();
  confere(!!antes && antes === depois, `foco no mesmo botão depois do redesenho (${antes} → ${depois})`);

  // 2. a janela: o foco entra, o Tab não escapa, e ao fechar volta a quem abriu
  await pg.goto(PAGINA); await pg.waitForTimeout(350);
  const naJanela = () => pg.evaluate(() => document.getElementById('janelaConfig').contains(document.activeElement));
  await pg.focus('[data-inicio="ajustes"]'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(250);
  confere(await naJanela(), 'Ajustes aberto: o foco entra na janela');
  let escapou = false;
  for (let i = 0; i < 40 && !escapou; i++) { await pg.keyboard.press('Tab'); escapou = !(await naJanela()); }
  for (let i = 0; i < 40 && !escapou; i++) { await pg.keyboard.press('Shift+Tab'); escapou = !(await naJanela()); }
  confere(!escapou, 'o Tab (e o Shift+Tab) dá a volta dentro da janela');
  await pg.evaluate(() => document.getElementById('btnFecharConfig').click()); await pg.waitForTimeout(250);
  const volta = await pg.evaluate(() => document.activeElement && document.activeElement.dataset.inicio);
  confere(volta === 'ajustes', `fechou: o foco volta ao botão que abriu (${volta})`);
  await pg.close();

  // 3. "reduzir movimento": desliga as animações mesmo com o padrão salvo; a escolha feita em Ajustes vale mais
  const rm = await nova({ reducedMotion: 'reduce' });
  await rm.evaluate(() => { localStorage.setItem('diceduel.v1', JSON.stringify({ pref: { animacoes: true, ajudasV11: true } })); });
  await rm.reload(); await rm.waitForTimeout(300);
  confere(await rm.evaluate(() => DiceDuel.st.pref.animacoes === false), 'reduzir movimento: animações desligadas mesmo com o valor salvo');
  await rm.evaluate(() => { localStorage.setItem('diceduel.v1', JSON.stringify({ pref: { animacoes: true, animacoesEscolhida: true, ajudasV11: true } })); });
  await rm.reload(); await rm.waitForTimeout(300);
  confere(await rm.evaluate(() => DiceDuel.st.pref.animacoes === true), 'quem ligou as animações em Ajustes fica com elas');
  await rm.close();

  await navegador.close();
  console.log(erros.length ? 'ERROS:\n' + erros.join('\n') : 'Tudo certo: teclado, janelas e movimento reduzido.');
  process.exit(erros.length ? 1 : 0);
})();
