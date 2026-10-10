// Demonstração do "impresso" (docs/visual-impresso.md): grava a mesma sequência sem (?impresso=0) e com (?impresso=1):
// disparo de 4 (cascata "em dois"), disparo de 5, Sinfonia, ruptura e armadilha revelada. Falha com qualquer erro no console.
// Uso: npm i -D playwright && node tools/impresso_demo.js   (vídeos e quadros em builds/impresso/)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const RAIZ = path.join(__dirname, '..');
const SAIDA = path.join(RAIZ, 'builds', 'impresso');
fs.mkdirSync(SAIDA, { recursive: true });
const VP = { width: 390, height: 844 };

(async () => {
  const navegador = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const erros = [];
  for (const modo of ['sem', 'com']) {
    const ctx = await navegador.newContext({ viewport: VP, recordVideo: { dir: SAIDA, size: VP } });
    const pg = await ctx.newPage();
    pg.on('pageerror', e => erros.push(`${modo}: ${e.message}`));
    pg.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) erros.push(`${modo} console: ${m.text()}`); });
    await pg.goto('file://' + path.join(RAIZ, 'index.html') + (modo === 'com' ? '?impresso=1' : '?impresso=0'));
    await pg.waitForTimeout(400);
    const ligado = await pg.evaluate(() => Fx.cfg.impresso);
    if (ligado !== (modo === 'com')) erros.push(`${modo}: a bandeira ficou ${ligado}`);
    // partida a dois no mesmo aparelho (ninguém joga sozinho no meio da gravação), com as animações ligadas
    await pg.evaluate(() => {
      const st = DiceDuel.st; st.pref.liberar = true; st.pref.falas = false; st.pref.dicas = false; st.deckVisto = true; st.cfg.modo = 'local';
      st.guia.estreia = true; st.conta.cartas = Regras.ORDEM.slice();
      DiceDuel.fecharInicio(); document.getElementById('janelaDeck').hidden = true;
    });
    const cena = async montar => {
      await pg.evaluate(() => { DiceDuel.st.decks = [[], []]; document.getElementById('btnDeck').click(); });
      if (await pg.$('#deckEmAndamento:not([hidden]) #btnRecomecar:not([hidden])')) await pg.click('#btnRecomecar'); else await pg.click('#btnJogarDeck');
      await pg.waitForTimeout(80);
      await pg.evaluate(montar);
      await pg.keyboard.press('Escape');
      await pg.waitForTimeout(150);
      if (await pg.$('.versus .btn-mel')) await pg.click('.versus .btn-mel');   // o "Vamos lá" do começo da partida
      await pg.waitForTimeout(1200);
    };
    const quadros = async (nome, ms) => { let t = 0; for (const alvo of ms) { await pg.waitForTimeout(alvo - t); t = alvo; await pg.screenshot({ path: path.join(SAIDA, `${modo}-${nome}-${alvo}.png`) }); } };

    // 0. disparo de 4: a cascata curta anda em poses seguradas
    await cena(() => { const j = DiceDuel.jogo; j.vez = 0; j.fase = 'decidir'; j.cor[0] = [2, 3, 4, 5]; j.mesa = [{ id: 8001, v: 1 }, { id: 8002, v: 1 }]; });
    await pg.click('[data-acao="disparar"]');
    await quadros('disparo4', [200, 350, 700]);
    await pg.waitForTimeout(1800);

    // 1. disparo de 5: o clarão (com o anel de retícula na cor de quem disparou)
    await cena(() => { const j = DiceDuel.jogo; j.vez = 0; j.fase = 'decidir'; j.cor[0] = [1, 2, 3, 4, 5]; j.mesa = [{ id: 9001, v: 2 }, { id: 9002, v: 4 }]; });
    await pg.click('[data-acao="disparar"]');
    await quadros('disparo5', [560, 640, 760]);
    await pg.waitForTimeout(1800);

    // 2. Sinfonia: o sexto dado dispara a corrente sozinho (e, com o impresso, a imagem para num quadro de gibi)
    await cena(() => { const j = DiceDuel.jogo; j.vez = 0; j.fase = 'pegar'; j.cor[0] = [1, 2, 3, 4, 5]; j.mesa = [{ id: 9101, v: 6 }, { id: 9102, v: 2 }, { id: 9103, v: 3 }]; });
    await pg.click('.pega[data-i="0"]');
    if (await pg.$('[data-alvo-dado="corrente"]')) await pg.click('[data-alvo-dado="corrente"]');
    await quadros('sinfonia', [1050, 1200, 1500]);
    await pg.waitForTimeout(2000);

    // 2b. ruptura: a corrente de 3 rompe com um dado que não sincroniza ("plonc", pequeno, caindo)
    await cena(() => { const j = DiceDuel.jogo; j.vez = 0; j.fase = 'pegar'; j.cor[0] = [1, 2, 3]; j.mesa = [{ id: 9201, v: 6 }, { id: 9202, v: 6 }]; });
    await pg.click('.pega[data-i="0"]');
    if (await pg.$('[data-alvo-dado="corrente"]')) await pg.click('[data-alvo-dado="corrente"]');
    if (await pg.$('[data-confirma="corrente"]')) await pg.click('[data-confirma="corrente"]');
    await quadros('ruptura', [200, 450]);
    await pg.waitForTimeout(1500);

    // 3. a armadilha do rival revelada: as chapas azul e rosa saem do registro e voltam
    await pg.evaluate(() => { const j = DiceDuel.jogo; j.eventos.push({ tipo: 'revelou', p: 1, c: 'interferencia', txt: 'a sua corrente de 4 vale 2 a menos' }); });
    await pg.keyboard.press('Escape');
    await quadros('revelou', [60, 200, 600]);
    await pg.waitForTimeout(1600);

    const video = pg.video();
    await ctx.close();
    fs.renameSync(await video.path(), path.join(SAIDA, `${modo}.webm`));
  }
  await navegador.close();
  if (erros.length) { console.error(erros.join('\n')); process.exit(1); }
  console.log('ok: vídeos e quadros em builds/impresso/');
})();
