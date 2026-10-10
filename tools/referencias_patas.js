// Desenha cada pose vetorial da pata da Diana (SPRITE de js/pata.js) como PNG de 512 px em
// arte/referencia/pata-<pose>.png. tools/arte_icones.py manda essa imagem junto do pedido de arte/patas.json: a
// versão pintada mantém a pose, o ângulo e as proporções. Rode de novo quando mudar um sprite.
// Uso: NODE_PATH=$(npm root -g) node tools/referencias_patas.js
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
  await pg.addScriptTag({ path: path.join(RAIZ, 'js', 'pata.js') });
  const poses = await pg.evaluate(() => window.Pata.POSES);
  for (const pose of poses) {
    // L = 100: a pata ocupa ~2 L; a moldura de 2,5 L deixa respiro em volta
    await pg.evaluate(pose => {
      document.body.innerHTML = `<svg id="r" viewBox="-125 -125 250 250" width="512" height="512">${window.Pata.SPRITE[pose](100, 0)}</svg>`;
    }, pose);
    await (await pg.$('#r')).screenshot({ path: path.join(SAIDA, `pata-${pose}.png`), omitBackground: true });
    console.log(`arte/referencia/pata-${pose}.png`);
  }
  await navegador.close();
})();
