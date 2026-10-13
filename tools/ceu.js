// Fotos das regras novas: noite com traços 🌙 acesos, totens e causos, e a troca inicial.
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node22/lib/node_modules/playwright'); } })();
(async () => { const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + require('path').join(__dirname, '../dist/test.html')); await p.waitForTimeout(500);
  const go = async (fac, tot, tr) => { await p.evaluate(([f, a, c]) => { document.querySelector('input[name=mode][value=bot]').click(); document.querySelector(`input[name=fac][value=${f}]`).click();
    const t = document.getElementById('opt_totem'), r = document.getElementById('opt_troca'); if (t.checked !== a) t.click(); if (r.checked !== c) r.click(); document.getElementById('bGo').click(); }, [fac, tot, tr]); await p.waitForTimeout(500); };
  // 1) troca inicial
  await go('mata', true, true); await p.evaluate(() => [...document.querySelectorAll('#info button')].find(x => x.textContent === 'Trocar').click()); await p.waitForTimeout(150);
  await p.evaluate(() => { document.querySelectorAll('#hand .card')[0].click(); document.querySelectorAll('#hand .card')[2].click(); }); await p.waitForTimeout(200); await p.screenshot({ path: 'shots/troca.png' });
  // 2) noite: monta peças e anoitece
  await p.evaluate(() => { const g = __pj.g, K = CD, put = (o, card, x, y) => { const D = K.CARDS[card]; g.units.push({ id: g.uid++, o, card, atk: D.atk, hp: D.hp, max: D.hp, x, y, f: [0, o ? 1 : -1], moved: false, acted: false, sick: false, rooted: 0, stunned: 0 }); };
    g.p[0].mull = false; g.terr = { '1,3': 'totem', '3,3': 'totem' }; put(0, 'onca', 1, 3); put(0, 'caipora', 2, 4); put(0, 'coral', 3, 4); put(1, 'lobis', 1, 2); put(1, 'bicho', 2, 2); put(1, 'mula', 3, 2); put(1, 'corpo', 4, 1);
    g.p[0].hand = ['grito', 'onca', 'saci', 'arapuca', 'mapin', 'cha'].filter(c => K.CARDS[c].fac === 'mata').concat(['uira', 'enraizar']); g.p[0].causos = 3; g.p[1].causos = 2; g.p[0].mana = 6; g.p[0].max = 6; });
  await p.evaluate(() => { __pj.g.turn = 5; __pj.act({ c: 'end' }); });
  for (let i = 0; i < 80; i++) { if (await p.evaluate(() => __pj.g.cur === 0 && !__pj.busy)) break; await p.waitForTimeout(150); }
  console.log(await p.evaluate(() => `turno ${__pj.g.turn} céu ${__pj.g.sky()} · ${document.getElementById('info').textContent}`));
  await p.waitForTimeout(700); await p.screenshot({ path: 'shots/noite.png' });
  await p.evaluate(() => { const c = [...document.querySelectorAll('#hand .card')].find(x => x.querySelector('.sk.on')); if (c) c.click(); }); await p.waitForTimeout(300); await p.screenshot({ path: 'shots/noite_carta.png' });
  console.log(errs.length ? 'ERROS ' + errs.join(' | ') : 'sem erros'); await b.close(); })();
