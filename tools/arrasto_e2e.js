// O dado-fantasma preso na tela (visto no iPhone): ao começar o arrasto, a Mesa é redesenhada e o dado tocado sai do
// documento. No Safari do iPhone, o mover e o soltar continuam indo para esse elemento fora da tela e não sobem até a
// janela. Aqui o teste manda os eventos do mesmo jeito (no elemento antigo, já fora do documento) e confere que nenhum
// fantasma fica para trás; também o caso do "soltar" que nunca chega (o próximo toque limpa) e o das cartas.
// Uso: npm i -D playwright && node tools/arrasto_e2e.js
const { chromium } = require('playwright');
const path = require('path');
const RAIZ = path.join(__dirname, '..');

(async () => {
  const navegador = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const pg = await navegador.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const erros = [];
  pg.on('pageerror', e => erros.push('erro na página: ' + e.message));
  await pg.goto('file://' + path.join(RAIZ, 'index.html'));
  await pg.waitForTimeout(300);
  const confere = (ok, txt) => { console.log((ok ? 'ok   ' : 'FALHA ') + txt); if (!ok) erros.push(txt); };
  // uma partida a dois (ninguém joga sozinho), na vez do jogador 0, escolhendo dado
  const montar = async (decks = [[], []]) => {
    await pg.evaluate(d => {
      const st = DiceDuel.st; st.pref.liberar = true; st.pref.animacoes = false; st.deckVisto = true; st.cfg.modo = 'local';
      st.conta.cartas = Regras.ORDEM.slice(); st.decks = d;
      document.getElementById('janelaDeck').hidden = true;
    }, decks);
    await pg.evaluate(() => document.getElementById('btnDeck').click());
    if (await pg.$('#deckEmAndamento:not([hidden]) #btnRecomecar:not([hidden])')) await pg.click('#btnRecomecar'); else await pg.click('#btnJogarDeck');
    await pg.waitForTimeout(80);
    await pg.evaluate(() => { const j = DiceDuel.jogo; j.vez = 0; j.fase = 'pegar'; j.intro = false; j.pensando = false; DiceDuel.ajustar({}); });
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(50);
  };
  // os eventos do dedo, todos no elemento onde o toque começou (como no iPhone), mesmo depois de ele sair da tela
  const arrastarComoIphone = (seletor, soltar = true) => pg.evaluate(([sel, soltar]) => {
    const el = document.querySelector(sel), r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const ev = (tipo, dx, dy) => el.dispatchEvent(new PointerEvent(tipo, { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x + dx, clientY: y + dy, button: 0, buttons: tipo === 'pointerup' ? 0 : 1 }));
    ev('pointerdown', 0, 0);
    ev('pointermove', 0, -20);   // passou de 10 px: o arrasto começa e a tela é redesenhada
    const saiu = !el.isConnected;
    ev('pointermove', 0, -60);
    if (soltar) ev('pointerup', 0, -60);
    return { saiu, fantasmas: document.querySelectorAll('.dado-fantasma, .carta.fantasma').length };
  }, [seletor, soltar]);
  const fantasmas = () => pg.evaluate(() => document.querySelectorAll('.dado-fantasma, .carta.fantasma').length);

  // 1. dado: o soltar chega só no elemento fora da tela
  await montar();
  let r = await arrastarComoIphone('#mesa .pega:not([disabled])');
  confere(r.saiu, 'o dado tocado sai do documento quando o arrasto começa (é o que expõe o problema)');
  confere(r.fantasmas === 0, `dado: soltar no elemento fora da tela não deixa fantasma (${r.fantasmas})`);
  confere(!(await pg.evaluate(() => document.body.classList.contains('arrastando-carta'))), 'dado: a página sai do modo de arrasto');
  // 2. dado: o soltar nunca chega; o próximo toque limpa
  await montar();
  r = await arrastarComoIphone('#mesa .pega:not([disabled])', false);
  confere(r.fantasmas === 1, 'dado: no meio do arrasto, o fantasma segue o dedo');
  await pg.evaluate(() => document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 8, pointerType: 'touch', isPrimary: true, clientX: 5, clientY: 5 })));
  confere(await fantasmas() === 0, 'dado: o soltar se perdeu, e o toque seguinte some com o fantasma');
  // 3. dado: o app vai para o fundo no meio do arrasto
  await montar();
  await arrastarComoIphone('#mesa .pega:not([disabled])', false);
  await pg.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); delete document.hidden; });
  confere(await fantasmas() === 0, 'dado: sair da tela no meio do arrasto some com o fantasma');
  // 4. carta: o mesmo com o arrasto de uma carta
  await montar([['rerrolar'], []]);
  r = await arrastarComoIphone('.jogador.da-vez [data-carta="rerrolar"]');
  confere(r.fantasmas === 0, `carta: soltar no elemento fora da tela não deixa fantasma (${r.fantasmas})`);
  // 5. arrastar de verdade ainda funciona: o dado solto na corrente vai para a corrente
  await montar();
  const antes = await pg.evaluate(() => DiceDuel.jogo.cor[0].length);
  const box = await (await pg.$('#mesa .pega:not([disabled])')).boundingBox();
  await pg.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y).closest('.pega');
    const ev = (alvo, tipo, cx, cy) => alvo.dispatchEvent(new PointerEvent(tipo, { bubbles: true, cancelable: true, pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: cx, clientY: cy, button: 0, buttons: 1 }));
    ev(el, 'pointerdown', x, y); ev(el, 'pointermove', x, y - 20);
    const cor = document.querySelector('[data-alvo-dado="corrente"]');
    if (!cor) return;
    const c = cor.getBoundingClientRect(), cx = c.left + c.width / 2, cy = c.top + c.height / 2 + 26;
    ev(el, 'pointermove', cx, cy); ev(el, 'pointerup', cx, cy);
  }, [box.x + box.width / 2, box.y + box.height / 2]);
  await pg.waitForTimeout(100);
  const depois = await pg.evaluate(() => DiceDuel.jogo.cor[0].length + (DiceDuel.jogo.fase === 'decidir' ? 0 : 0));
  confere(depois === antes + 1 || (await pg.evaluate(() => DiceDuel.jogo.vez)) === 1, `arrastar até a corrente ainda põe o dado nela (${antes} → ${depois})`);
  confere(await fantasmas() === 0, 'e não sobra fantasma');

  await navegador.close();
  if (erros.length) { console.error('\n' + erros.join('\n')); process.exit(1); }
  console.log('Tudo certo: nenhum fantasma preso.');
})().catch(e => { console.error(e); process.exit(1); });
