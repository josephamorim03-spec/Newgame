// A imagem de compartilhamento (img/previa.png, 1200×630: a prévia do link no WhatsApp, no Twitter...) montada a partir do
// próprio jogo: o letreiro, a cena da Diana à mesa e a noite pontilhada. Rode de novo quando o visual mudar, para a prévia
// nunca ficar com cara (ou texto) de uma versão antiga. Uso: NODE_PATH=$(npm root -g) node tools/previa.js
const { chromium } = require('playwright');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await pg.goto('file://' + path.join(RAIZ, 'index.html'));
  await pg.waitForTimeout(1500);
  await pg.evaluate(() => {
    const cena = document.getElementById('inicioCena').cloneNode(true), letreiro = document.getElementById('inicioTitulo').innerHTML;
    cena.removeAttribute('id');
    cena.querySelectorAll('.cena-fala').forEach(f => { f.textContent = 'Boa noite. Uma partida?'; });
    const p = document.createElement('div');
    p.id = 'previa';
    p.innerHTML = `<div class="pv-texto"><h1 class="titulo-letreiro">${letreiro}</h1>
      <p class="pv-linha">Duelo de dados aconchegante</p>
      <p class="pv-sub">Ligue dados que sincronizam, guarde um no Bolso e dispare a corrente.<br>História com a Diana · Online com amigos</p></div>
      <div class="pv-cena"></div>`;
    p.querySelector('.pv-cena').appendChild(cena);
    const css = document.createElement('style');
    css.textContent = `
      #previa { position: fixed; inset: 0; z-index: 9999; display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 30px; padding: 40px 70px;
        background: radial-gradient(ellipse 70% 60% at 72% 45%, rgba(255,207,138,.22), transparent 70%), var(--noite); color: var(--texto); overflow: hidden; }
      #previa::before { content: ''; position: absolute; inset: 0; z-index: -1; background: radial-gradient(circle, rgba(255,243,226,.1) 0 2px, transparent 2.6px) 0 0 / 14px 14px;
        -webkit-mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, transparent 50%, #000 100%); mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, transparent 50%, #000 100%); }
      #previa .letreiro { width: 440px; animation: none; }
      .pv-linha { font-family: var(--f-titulo); font-weight: 700; font-size: 38px; margin: 18px 0 6px; color: var(--mel); }
      .pv-sub { font-size: 21px; line-height: 1.4; margin: 0; color: var(--texto-suave); }
      .pv-cena { display: grid; place-items: center; }
      .pv-cena .inicio-cena { transform: scale(1.6); transform-origin: center; width: 330px; height: 210px; }
      .pv-cena .cena-rival { width: 140px; height: 140px; margin-left: -70px; bottom: 44px; }
      .pv-cena .cena-fala { left: calc(50% + 62px); font-size: 12px; }
      .pv-cena * { animation: none !important; }`;
    document.head.appendChild(css);
    document.body.appendChild(p);
  });
  await pg.waitForTimeout(600);
  await pg.screenshot({ path: path.join(RAIZ, 'img', 'previa.png'), clip: { x: 0, y: 0, width: 1200, height: 630 } });
  await b.close();
  console.log('img/previa.png refeita');
})();
