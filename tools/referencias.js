// Desenha cada retrato em vetor (js/retratos.js) como PNG de 512 px em arte/referencia/<id>.png,
// e cada ícone de carta (ICO_CARTA de js/jogo.js, mais os símbolos de arte/cartas.json) em arte/referencia/carta-<id>.png.
// tools/arte_icones.py manda essa imagem junto do pedido: a versão pintada mantém o desenho, as marcas
// e as cores e fica no estilo do jogo. Rode de novo quando mudar um vetor.
// Uso: npm i -D playwright && node tools/referencias.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const SAIDA = path.join(RAIZ, 'arte', 'referencia');
fs.mkdirSync(SAIDA, { recursive: true });

// os ícones de traço das cartas, lidos do próprio jogo (cada linha "id: svg('...')," de ICO_CARTA)
function iconesDeCarta() {
  const fonte = fs.readFileSync(path.join(RAIZ, 'js', 'jogo.js'), 'utf8');
  const bloco = fonte.match(/const ICO_CARTA = \{([\s\S]*?)\n  \};/)[1];
  const ico = Object.fromEntries([...bloco.matchAll(/^\s*(\w+): svg\('(.*)'\),?$/gm)].map(m => [m[1], m[2]]));
  const extras = JSON.parse(fs.readFileSync(path.join(RAIZ, 'arte', 'cartas.json'), 'utf8')).simbolos_vetor || {};
  return { ...ico, ...extras };
}

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
  const cartas = iconesDeCarta();
  for (const [id, d] of Object.entries(cartas)) {
    await pg.evaluate(d => {
      document.body.innerHTML = `<svg id="r" viewBox="-2 -2 28 28" width="512" height="512" fill="none" stroke="#3a2a2e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
    }, d);
    await (await pg.$('#r')).screenshot({ path: path.join(SAIDA, `carta-${id}.png`), omitBackground: true });
  }
  await navegador.close();
  console.log(`${ids.length} retratos e ${Object.keys(cartas).length} ícones de carta em arte/referencia/`);
})();
