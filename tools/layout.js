// Verifica larguras de 320 a 430 px: nada saindo da tela, sem rolagem horizontal, textos da faixa e cartas sem estourar.
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node22/lib/node_modules/playwright'); } })();
(async () => { const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [w, h] of [[320, 568], [360, 740], [390, 844], [430, 932]]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); p.on('pageerror', e => console.log('ERR', e.message));
    await p.goto('file://' + require('path').join(__dirname, '../dist/test.html')); await p.waitForTimeout(500);
    const home = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    await p.evaluate(() => { document.querySelector('input[name=mode][value=bot]').click(); document.getElementById('bGo').click(); }); await p.waitForTimeout(400);
    await p.evaluate(() => { const g = __pj.g; g.p[0].hand = ['cha', 'onca', 'arapuca', 'saci', 'enraizar', 'anhanga']; g.p[0].mana = 9; }); 
    const r = await p.evaluate(() => document.getElementById('cv').getBoundingClientRect()); await p.touchscreen.tap(r.left + 5, r.top + 5); await p.waitForTimeout(300);
    const res = await p.evaluate(() => { const out = []; const W = innerWidth, H = innerHeight;
      for (const el of document.querySelectorAll('#hand .card, #myBar .btn, #info, #topBar')) { const q = el.getBoundingClientRect(); if (q.left < -1 || q.right > W + 1 || q.bottom > H + 1) out.push((el.id || el.className) + ' fora ' + [q.left, q.right, q.bottom].map(Math.round)); }
      for (const el of document.querySelectorAll('#hand .nm')) if (el.scrollWidth > el.clientWidth + 1) out.push('nome cortado: ' + el.textContent);
      const st = document.getElementById('stage').getBoundingClientRect(); out.push('palco ' + Math.round(st.height) + 'px');
      return out; });
    console.log(w + 'x' + h, home ? 'HOME COM ROLAGEM' : 'home ok', res.join(' | '));
    await p.screenshot({ path: 'shots/lay_' + w + '.png' }); await p.close(); }
  await b.close(); })();
