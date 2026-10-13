// QA sequencial ASTRA: node tools/personagem.js saci <commit-anterior>
const fs = require('fs'), path = require('path'), assert = require('assert/strict'), { execFileSync } = require('child_process');
const { chromium } = (() => { try { return require('playwright'); } catch (_) { return require('/opt/node22/lib/node_modules/playwright'); } })();
const root = path.join(__dirname, '..'), id = process.argv[2], baseline = process.argv[3];
assert.ok(['saci', 'curupira'].includes(id) && baseline, 'Informe saci/curupira e o commit anterior');
const previous = execFileSync('git', ['show', baseline + ':src/figs.js'], { cwd: root, encoding: 'utf8' }).replace('const FIGS =', 'const BEFORE =');
const options = { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
fs.mkdirSync(path.join(root, 'shots'), { recursive: true });
let browser;
(async () => {
  browser = await chromium.launch(options);
  let p = await browser.newPage({ viewport: { width: 1040, height: 760 }, deviceScaleFactor: 1 });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.setContent(`<html lang="pt-BR"><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#F6EEDC;color:#2A1E16;font:13px system-ui}main{width:1040px;padding:20px}h1{margin:0;font-size:28px}p{margin:5px 0 16px;color:#6B5949}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}section{padding:10px;background:#E9DFC6;border-radius:12px}h2{margin:0 0 8px;font-size:14px}.pair{display:flex;justify-content:space-between;text-align:center}.small{border-top:1px solid #D2C3A8;margin-top:6px;padding-top:6px;justify-content:space-evenly}canvas{display:block}</style><main><h1>${id === 'saci' ? 'Saci-Pererê' : 'Curupira'} · oito direções</h1><p>Antes / depois + FX · mesma câmera e escala · abaixo, imagem com 60 px de altura</p><div class="grid"></div></main></html>`);
  for (const content of [fs.readFileSync(path.join(root, 'vendor/three.min.js'), 'utf8'), previous, fs.readFileSync(path.join(root, 'src/figs.js'), 'utf8'), fs.readFileSync(path.join(root, 'src/fx.js'), 'utf8')]) await p.addScriptTag({ content });
  const result = await p.evaluate(id => {
    const build = FIGS.DEF[id].build; let model;
    FIGS.DEF[id].build = K => { model = K.root; build(K); };
    const before = [], after = [], anchors = [], boxes = [], changed = [];
    const names = ['0 · Frente', '1 · 45°', '2 · Lado', '3 · 135°', '4 · Costas', '5 · 225°', '6 · Lado', '7 · 315°'];
    for (let dir = 0; dir < 8; dir++) {
      before.push(BEFORE.sprite(id, 256, 320, dir)); after.push(FIGS.sprite(id, 256, 320, dir));
      const a = FIGS.anchors(id, dir), data = after[dir].getContext('2d').getImageData(0, 0, 256, 320).data;
      let minX = 256, minY = 320, maxX = 0, maxY = 0;
      for (let y = 0; y < 320; y++) for (let x = 0; x < 256; x++) if (data[(y * 256 + x) * 4 + 3] > 16) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
      boxes.push([minX, minY, maxX, maxY]); anchors.push(a);
      if (a !== FIGS.anchors(id, dir) || after[dir] !== FIGS.sprite(id, 256, 320, dir)) throw Error('Cache não preservado');
      for (const points of Object.values(a)) for (const [x, y] of points) if (!Number.isFinite(x + y) || x <= 0 || y <= 0 || x >= 256 || y >= 320) throw Error('Âncora fora do sprite');
      // Fogo deve nascer sobre a cabeleira visível, em qualquer direção.
      for (const [x, y] of a.fire || []) { let hot = false;
        for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) { const at = ((Math.round(y) + dy) * 256 + Math.round(x) + dx) * 4; if (data[at + 3] > 100 && data[at] > 160 && data[at + 1] > 45 && data[at + 2] < 170) hot = true; }
        if (!hot) throw Error('Emissor fora do cabelo de fogo, direção ' + dir);
      }
    }
    let triangles = 0; model.traverse(m => { if (m.isMesh) triangles += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; });
    for (const other of Object.keys(FIGS.DEF)) if (other !== id) for (let dir = 0; dir < 8; dir++) if (FIGS.sprite(other, 256, 320, dir).toDataURL() !== BEFORE.sprite(other, 256, 320, dir).toDataURL()) changed.push(other + ':' + dir);
    // Um quadro reproduzível do efeito real, sem colocar partículas no modelo 3D.
    const canvases = after.map(() => { const c = document.createElement('canvas'); c.width = 256; c.height = 320; return c; });
    const random = Math.random; let seed = 17; Math.random = () => ((seed = seed * 1664525 + 1013904223 >>> 0) / 4294967296);
    FX.clear();
    for (let f = 0; f < 90; f++) { FX.frame(1 / 60, true); for (let dir = 0; dir < 8; dir++) { const k = canvases[dir].getContext('2d'); k.clearRect(0, 0, 256, 320); k.drawImage(after[dir], 0, 0); FX.paint(k, dir, anchors[dir], 0, 0, 256, 320, 1, 283); } }
    Math.random = random;
    for (let dir = 0; dir < 8; dir++) {
      const section = document.createElement('section'); section.innerHTML = '<h2>' + names[dir] + '</h2><div class="pair"></div><div class="pair small"></div>';
      for (const [name, sprite] of [['Antes', before[dir]], ['Depois + FX', canvases[dir]]]) { const col = document.createElement('div'); col.textContent = name; const c = document.createElement('canvas'); c.width = 256; c.height = 320; c.style.cssText = 'width:104px;height:130px'; c.getContext('2d').drawImage(sprite, 0, 0); col.appendChild(c); section.querySelector('.pair').appendChild(col);
        const small = document.createElement('canvas'); small.width = 48; small.height = 60; small.getContext('2d').drawImage(sprite, 0, 0, 48, 60); section.querySelector('.small').appendChild(small); }
      document.querySelector('.grid').appendChild(section);
    }
    return { triangles, boxes, anchors, changed, revision: THREE.REVISION };
  }, id);
  console.log(id, 'triângulos com contornos:', result.triangles);
  // Salva mesmo em caso de falha no orçamento para permitir revisão visual.
  await p.locator('main').screenshot({ path: path.join(root, `shots/${id}-comparacao.png`) });
  assert.equal(result.revision, '128'); assert.ok(result.triangles <= 8000, 'Mais de 8 mil triângulos'); assert.deepEqual(result.changed, [], 'Outro personagem mudou');
  for (const box of result.boxes) assert.ok(box[0] > 0 && box[1] > 0 && box[2] < 255 && box[3] < 319, 'Sprite cortado');
  const fx = await p.evaluate(id => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 320; const k = c.getContext('2d'), a = FIGS.anchors(id, 0);
    FX.clear(); for (let f = 0; f < 180; f++) { FX.frame(1 / 60, true); for (let u = 0; u < 35; u++) FX.paint(k, u, FIGS.anchors(u % 2 ? id : 'mula', u % 8), 0, 0, 256, 320, 1, 283); }
    const loaded = FX.stats(), beforePause = FX.stats(); FX.frame(0.05, false); for (let u = 0; u < 35; u++) FX.paint(k, u, FIGS.anchors(u % 2 ? id : 'mula', u % 8), 0, 0, 256, 320, 1, 283); const paused = FX.stats();
    FX.clear(); FX.frame(1 / 60, true); FX.paint(k, 1, a, 0, 0, 256, 320, 1, 283); FX.dust(1); const dust = FX.stats();
    for (let f = 0; f < 45; f++) FX.frame(1 / 60, true); const removed = FX.stats();
    Object.defineProperty(document, 'hidden', { configurable: true, value: true }); const hiddenStart = FX.stats(); FX.frame(0.05, true); const hiddenEnd = FX.stats(); delete document.hidden;
    // Observa o desenho da mesma partícula: sobe, cresce, desvanece e oscila.
    const smoke = [];
    if (id === 'saci') {
      FX.clear(); const random = Math.random; Math.random = () => 0.5;
      const ellipse = k.ellipse.bind(k); let sample = null;
      k.ellipse = (...v) => { if (k.fillStyle === '#a99f8d' && (!sample || v[2] > sample.radius)) sample = { x: v[0], y: v[1], radius: v[2], alpha: k.globalAlpha }; ellipse(...v); };
      for (let f = 0; f < 75; f++) { sample = null; FX.frame(1 / 60, true); FX.paint(k, 99, a, 0, 0, 256, 320, 1, 283); if ([12, 24, 45, 70].includes(f)) smoke.push(sample); }
      Math.random = random;
    }
    return { loaded, beforePause, paused, dust, removed, hiddenStart, hiddenEnd, smoke };
  }, id);
  assert.ok(fx.loaded.alive > 0 && fx.loaded.alive <= 120); assert.equal(fx.loaded.owners, 35);
  assert.equal(fx.paused.time, fx.beforePause.time); assert.equal(fx.paused.alive, fx.beforePause.alive); assert.equal(fx.dust.alive, 5); assert.equal(fx.removed.alive, 0); assert.equal(fx.removed.owners, 0); assert.equal(fx.hiddenStart.time, fx.hiddenEnd.time);
  if (id === 'saci') { const [a, b, c, d] = fx.smoke; assert.ok(a && b && c && d); assert.ok(a.y > b.y && b.y > c.y && c.y > d.y, 'Fumaça não sobe'); assert.ok(a.radius < b.radius && b.radius < c.radius && c.radius < d.radius, 'Fumaça não cresce'); assert.ok(d.alpha < b.alpha, 'Fumaça não some'); assert.ok(b.x < a.x && d.x > c.x, 'Fumaça não balança'); }
  await p.emulateMedia({ reducedMotion: 'reduce' }); await p.waitForTimeout(30);
  const reduced = await p.evaluate(id => { const k = document.createElement('canvas').getContext('2d'); for (let f = 0; f < 60; f++) { FX.frame(1 / 60, true); FX.paint(k, 1, FIGS.anchors(id, 0), 0, 0, 256, 320, 1, 283); FX.dust(1); } return FX.stats(); }, id);
  assert.equal(reduced.reduced, true); assert.equal(reduced.alive, 0);
  await browser.close(); browser = await chromium.launch(options);
  p = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true }); p.on('pageerror', e => errors.push(e.message)); await p.route(/^https?:/, route => route.abort());
  await p.goto('file://' + path.join(root, 'dist/test.html'));
  await p.evaluate(id => { document.querySelector('input[name=mode][value=hot]').click(); document.querySelector('input[name=fac][value=mata]').click(); document.getElementById('bGo').click(); document.getElementById('bPass').click(); const g = __pj.g;
    g.terr = { '0,2': 'mata', '4,2': 'mata', '0,4': 'mata', '4,4': 'mata', '2,3': 'encru' }; g.p[0].hand = ['saci', 'coral', 'uira', 'onca']; g.p[0].mana = g.p[0].max = 9;
    for (const [card, x, y, o] of [['saci', 1, 4, 0], ['mula', 3, 2, 1]]) { const d = CD.CARDS[card]; g.units.push({ id: g.uid++, card, o, x, y, atk: d.atk, hp: d.hp, max: d.hp, sick: false, moved: false, acted: false, rooted: 0, stunned: 0 }); }
  }, id);
  const tile = await p.evaluate(() => { const r = document.getElementById('cv').getBoundingClientRect(); return [r.x + __pj.SX(1, 4), r.y + __pj.SY(1, 4)]; }); await p.touchscreen.tap(...tile); await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(root, `shots/jogo-${id}.png`) });
  assert.ok((await p.evaluate(() => FX.stats().alive)) > 0);
  const move = await p.evaluate(() => { const u = __pj.g.at(1, 4); return __pj.act({ c: 'move', id: u.id, x: 2, y: 4 }); }); assert.equal(move, true); await p.waitForTimeout(400); assert.equal(await p.evaluate(() => __pj.g.at(2, 4).card), 'saci');
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(root, `shots/${id}-qa.json`), JSON.stringify({ baseline, ...result, fx, reduced, browserErrors: errors }, null, 2) + '\n');
  console.log(`${id}: 8 direções; 112 sprites dos demais idênticos; pool, pausa, redução de movimento, toque e jogo offline OK.`);
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); });
