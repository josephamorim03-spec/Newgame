// Fuzz pela interface: partidas inteiras com ações aleatórias válidas (inclui poder e feitiços), bot e 2 no celular.
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node22/lib/node_modules/playwright'); } })();
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); const p = await b.newPage({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + require('path').join(__dirname, '../dist/test.html')); await p.waitForTimeout(600);
  const probs = new Set();
  for (const [mode, fac, games, extra] of [['bot', 'mata', 3, false], ['bot', 'assom', 3, true], ['hot', 'mata', 2, true], ['hot', 'assom', 2, false]]) {
    for (let gi = 0; gi < games; gi++) {
      await p.evaluate(([m, f, x]) => { document.querySelector(`input[name=mode][value=${m}]`).click(); document.querySelector(`input[name=fac][value=${f}]`).click(); for (const id of ['opt_totem', 'opt_troca']) { const el = document.getElementById(id); if (el.checked !== x) el.click(); } }, [mode, fac, extra]);
      await p.evaluate(() => document.getElementById('bGo').click()); await p.waitForTimeout(300);
      for (let step = 0; step < 900; step++) {
        const st = await p.evaluate(() => { const g = __pj.g; if (!g || g.over) return 'over';
          if (!document.getElementById('ovPass').hidden) { document.getElementById('bPass').click(); return 'pass'; }
          if (__pj.busy) return 'wait'; const human = document.querySelector('input[name=mode]:checked').value === 'hot' || g.cur === 0; if (!human) return 'wait';
          const acts = g.actions(); if (g.p[g.cur].mull && Math.random() < 0.7) acts.push({ c: 'mull', idx: g.p[g.cur].hand.length > 1 && Math.random() < 0.5 ? [0, 1] : [] }); const r = Math.random(); let a = null;
          if (acts.length && r < 0.85) a = acts[Math.floor(Math.random() * acts.length)];
          __pj.act(a || { c: 'end' });
          // invariantes
          const bad = []; const seen = new Set();
          for (const u of g.units) { const k = u.x + ',' + u.y; if (seen.has(k)) bad.push('duas peças em ' + k); seen.add(k); if (g.ter(u.x, u.y) === 'rio') bad.push('peça no rio ' + (u.card)); if (u.x < 0 || u.y < 0 || u.x >= 5 || u.y >= 7) bad.push('fora do tabuleiro'); if (u.hp > u.max) bad.push('vida acima do máximo ' + u.card + ' ' + u.hp + '/' + u.max); }
          for (const P of g.p) { if (P.hand.length > 6) bad.push('mão > 6'); if (P.mana < 0) bad.push('mana negativa'); }
          return bad.length ? 'BAD:' + bad.join('; ') : 'act'; });
        if (st === 'over') break; if (st.startsWith('BAD')) probs.add(st);
        await p.waitForTimeout(st === 'wait' ? 120 : 40);
      }
      await p.waitForTimeout(1200);
      const end = await p.evaluate(() => [!!__pj.g && __pj.g.over, !document.getElementById('ovEnd').hidden, document.getElementById('eTitle').textContent]);
      console.log(mode, fac, extra ? 'extras' : '', gi, JSON.stringify(end), await p.evaluate(() => document.getElementById('eWhy').textContent));
      await p.evaluate(() => document.getElementById('bHome2').click()); await p.waitForTimeout(200);
    }
  }
  console.log('problemas:', [...probs]); console.log('erros:', errs.slice(0, 10), errs.length); await b.close();
})();
