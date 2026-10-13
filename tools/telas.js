const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node22/lib/node_modules/playwright'); } })();
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://' + require('path').join(__dirname, '../dist/test.html')); await p.waitForTimeout(800);
  const shot = async n => { await p.waitForTimeout(250); await p.screenshot({ path: 'shots/tela_' + n + '.png' }); };
  const tapTile = async (x, y) => { const pt = await p.evaluate(([x, y]) => { const r = document.getElementById('cv').getBoundingClientRect(); return [r.left + __pj.SX(x, y), r.top + __pj.SY(x, y)]; }, [x, y]); await p.touchscreen.tap(pt[0], pt[1]); };
  await p.evaluate(() => { document.querySelector('input[name=mode][value=bot]').click(); document.querySelector('input[name=fac][value=mata]').click(); document.getElementById('bGo').click(); }); await p.waitForTimeout(600);
  // força uma mão variada para ver todos os casos
  await p.evaluate(() => { const g = __pj.g; g.p[0].hand = ['cha', 'onca', 'arapuca', 'saci', 'enraizar']; g.p[0].mana = 9; g.p[0].max = 9; }); await tapTile(4, 6); await p.waitForTimeout(200);
  await p.evaluate(() => document.querySelectorAll('#hand .card')[3].click()); await shot('1_carta_unidade');
  await p.evaluate(() => document.querySelectorAll('#hand .card')[0].click()); await shot('2_feitico_aliado');
  await p.evaluate(() => document.querySelectorAll('#hand .card')[4].click()); await shot('3_feitico_inimigo');
  await p.evaluate(() => document.querySelectorAll('#hand .card')[4].click()); await p.evaluate(() => document.getElementById('bPow').click()); await shot('4_poder');
  await p.evaluate(() => document.getElementById('bPow').click());
  await tapTile(2, 6); await shot('5_general_sel');
  await tapTile(2, 0); await shot('6_inspeciona_inimigo');
  const ter = await p.evaluate(() => { const g = __pj.g; for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (g.ter(x, y) && !g.at(x, y)) return [x, y]; });
  await tapTile(ter[0], ter[1]); await shot('7_terreno');
  await p.evaluate(() => __pj.act({ c: 'end' })); await p.waitForTimeout(300); await shot('8_vez_do_bot');
  await p.waitForTimeout(4000); await shot('9_volta');
  await p.evaluate(() => document.getElementById('bMenu').click()); await shot('10_menu'); await p.evaluate(() => document.getElementById('bResume').click());
  await p.evaluate(() => document.getElementById('bHome').click && 0);
  // 2 no celular
  await p.evaluate(() => { document.getElementById('bMenu').click(); document.getElementById('bHome').click(); document.querySelector('input[name=mode][value=hot]').click(); document.getElementById('bGo').click(); }); await p.waitForTimeout(400); await shot('11_passa');
  await p.evaluate(() => document.getElementById('bPass').click()); await p.waitForTimeout(300); await p.evaluate(() => __pj.act({ c: 'end' })); await p.waitForTimeout(1500); await shot('12_passa2');
  await p.evaluate(() => document.getElementById('bPass').click()); await shot('13_hot_p2');
  await p.evaluate(() => { document.getElementById('bMenu').click(); document.getElementById('bGiveUp').click(); }); await shot('14_fim');
  await b.close();
})();
