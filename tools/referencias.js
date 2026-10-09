// Desenha cada retrato em vetor (js/retratos.js) como PNG de 512 px em arte/referencia/<id>.png.
// tools/arte_icones.py manda essa imagem junto do pedido: a versão pintada mantém o desenho, as marcas
// e as cores do personagem e fica no estilo do jogo. Rode de novo quando mudar um vetor.
// Uso: npm i -D playwright && node tools/referencias.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const SAIDA = path.join(RAIZ, 'arte', 'referencia');
fs.mkdirSync(SAIDA, { recursive: true });

(async () => {
  const navegador = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const pg = await navegador.newPage({ viewport: { width: 512, height: 512 } });
  await pg.setContent('<!doctype html><body style="margin:0;background:transparent"></body>');
  await pg.addScriptTag({ path: path.join(RAIZ, 'js', 'retratos.js') });
  const ids = await pg.evaluate(() => Object.keys(window.Retratos.SVG));
  for (const id of ids) {
    await pg.evaluate(id => {
      document.body.innerHTML = `<svg id="r" viewBox="0 0 64 64" width="512" height="512">${window.Retratos.SVG[id]}</svg>`;
    }, id);
    await (await pg.$('#r')).screenshot({ path: path.join(SAIDA, `${id}.png`), omitBackground: true });
  }
  await navegador.close();
  console.log(`${ids.length} referências em arte/referencia/`);
})();
