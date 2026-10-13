// Regressão da Mula; Saci tem comparação sequencial em tools/personagem.js.
// QA da primeira etapa ASTRA: comparação real, direções, orçamento e FX.
// node tools/mula.js [ref-anterior] (padrão: commit original peleja/prototype)
const fs = require('fs'), path = require('path'), assert = require('assert/strict'), { execFileSync } = require('child_process');
const { chromium } = (() => { try { return require('playwright'); } catch (_) { return require('/opt/node22/lib/node_modules/playwright'); } })();
const root = path.join(__dirname, '..'), baseline = process.argv[2] || '3f1c89611525081bdc81b60b847a31cf1c928f81';
const previous = execFileSync('git', ['show', baseline + ':src/figs.js'], { cwd: root, encoding: 'utf8' }).replace('const FIGS =', 'const BEFORE =');
const launchOptions = { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
fs.mkdirSync(path.join(root, 'shots'), { recursive: true });
let b;
(async () => {
  b = await chromium.launch(launchOptions);
  const p = await b.newPage({ viewport: { width: 720, height: 820 }, deviceScaleFactor: 1 });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.setContent(`<html lang="pt-BR"><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;background:#F6EEDC;color:#2A1E16;font:14px system-ui}main{padding:20px;width:720px}h1{margin:0 0 4px;font-size:26px}p{margin:0 0 16px;color:#6B5949}
    section{margin-top:12px;padding:12px 16px;background:#E9DFC6;border-radius:14px}h2{font-size:15px;margin:0 0 8px;letter-spacing:1px}.row{display:flex;justify-content:space-around;align-items:end}.angle{text-align:center}canvas{display:block}.label{margin-bottom:4px;font-size:12px}.small{display:flex;align-items:center;justify-content:center;gap:18px;border-top:1px solid #D2C3A8;margin-top:8px;padding-top:8px}
    </style><main><h1>Mula-sem-cabeça</h1><p>Mesma câmera, paleta e escala. Modelo estático; o fogo animado está no jogo.</p><section id="before"><h2>ANTES</h2><div class="row"></div><div class="small">Leitura com imagem de 60 px de altura</div></section><section id="after"><h2>DEPOIS</h2><div class="row"></div><div class="small">Leitura com imagem de 60 px de altura</div></section></main></html>`);
  await p.addScriptTag({ content: fs.readFileSync(path.join(root, 'vendor/three.min.js'), 'utf8') });
  await p.addScriptTag({ content: previous });
  await p.addScriptTag({ content: fs.readFileSync(path.join(root, 'src/figs.js'), 'utf8') });
  const result = await p.evaluate(() => {
    const build = FIGS.DEF.mula.build; let model;
    FIGS.DEF.mula.build = K => { model = K.root; build(K); };
    for (const [id, figs] of [['before', BEFORE], ['after', FIGS]]) for (const [dir, name] of [[0, 'Frente'], [2, 'Lado'], [4, 'Costas']]) {
      const slot = document.createElement('div'); slot.className = 'angle';
      const label = document.createElement('div'); label.className = 'label'; label.textContent = name; slot.appendChild(label);
      const big = document.createElement('canvas'); big.width = 256; big.height = 320; big.style.width = '144px'; big.style.height = '180px'; big.getContext('2d').drawImage(figs.sprite('mula', 256, 320, dir), 0, 0); slot.appendChild(big);
      document.querySelector('#' + id + ' .row').appendChild(slot);
      const small = document.createElement('canvas'); small.width = 48; small.height = 60; small.getContext('2d').drawImage(big, 0, 0, 48, 60); document.querySelector('#' + id + ' .small').appendChild(small);
    }
    let triangles = 0; model.traverse(m => { if (m.isMesh) triangles += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; });
    const anchors = [], boxes = [];
    for (let dir = 0; dir < 8; dir++) {
      const sprite = FIGS.sprite('mula', 256, 320, dir), a = FIGS.anchors('mula', dir), data = sprite.getContext('2d').getImageData(0, 0, 256, 320).data;
      let minX = 256, minY = 320, maxX = 0, maxY = 0;
      for (let y = 0; y < 320; y++) for (let x = 0; x < 256; x++) if (data[(y * 256 + x) * 4 + 3] > 16) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
      boxes.push([minX, minY, maxX, maxY]); anchors.push(a);
      if (a !== FIGS.anchors('mula', dir) || sprite !== FIGS.sprite('mula', 256, 320, dir)) throw Error('Cache não preservado');
      // Cada emissor deve coincidir com fogo visível em todas as orientações.
      for (const [x, y] of a.fire) {
        const ix = Math.round(x), iy = Math.round(y); let hot = false;
        for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
          const at = ((iy + dy) * 256 + ix + dx) * 4;
          if (data[at + 3] > 100 && data[at] > 160 && data[at + 1] > 45 && data[at + 2] < 170) hot = true;
        }
        if (!hot) throw Error('Emissor fora da chama: direção ' + dir);
      }
    }
    const changed = [];
    for (const id of Object.keys(FIGS.DEF)) if (!['mula', 'saci'].includes(id)) for (let dir = 0; dir < 8; dir++) {
      if (FIGS.sprite(id, 256, 320, dir).toDataURL() !== BEFORE.sprite(id, 256, 320, dir).toDataURL()) changed.push(id + ':' + dir);
    }
    return { triangles, anchors, boxes, changed, revision: THREE.REVISION };
  });
  console.log('Triângulos da Mula (com contorno):', result.triangles);
  assert.equal(result.revision, '128'); assert.ok(result.triangles <= 8000, 'Mais de 8 mil triângulos, incluindo contornos'); assert.deepEqual(result.changed, [], 'Outro personagem mudou');
  for (const box of result.boxes) assert.ok(box[0] > 0 && box[1] > 0 && box[2] < 255 && box[3] < 319, 'Sprite cortado');
  await p.locator('main').screenshot({ path: path.join(root, 'shots/mula-comparacao.png') });
  await p.evaluate(() => { document.querySelector('main').innerHTML = '<h1>Oito direções</h1><p>Mula-sem-cabeça · sprite estático</p><div id="dirs" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px"></div>';
    for (let dir = 0; dir < 8; dir++) { const d = document.createElement('section'); d.style.margin = '0'; d.style.padding = '6px'; d.textContent = 'Direção ' + dir; const c = document.createElement('canvas'); c.width = 256; c.height = 320; c.style.width = '144px'; c.style.height = '180px'; c.getContext('2d').drawImage(FIGS.sprite('mula', 256, 320, dir), 0, 0); d.appendChild(c); document.getElementById('dirs').appendChild(d); }
  });
  await p.locator('main').screenshot({ path: path.join(root, 'shots/mula-direcoes.png') });
  await p.addScriptTag({ content: fs.readFileSync(path.join(root, 'src/fx.js'), 'utf8') });
  const fx = await p.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 600; c.height = 800; const k = c.getContext('2d'), a = FIGS.anchors('mula', 0);
    FX.clear();
    for (let f = 0; f < 180; f++) { FX.frame(1 / 60, true); for (let u = 0; u < 35; u++) FX.paint(k, u, a, 0, 0, 256, 320, 1, 283); }
    const loaded = FX.stats();
    FX.dust(1); const afterDust = FX.stats();
    const beforePause = FX.stats(); FX.frame(0.05, false); for (let u = 0; u < 35; u++) FX.paint(k, u, a, 0, 0, 256, 320, 1, 283); const paused = FX.stats();
    FX.clear(); FX.frame(1 / 60, true); FX.paint(k, 1, a, 0, 0, 256, 320, 1, 283); FX.dust(1); const dust = FX.stats();
    for (let f = 0; f < 45; f++) FX.frame(1 / 60, true); const removed = FX.stats();
    Object.defineProperty(document, 'hidden', { configurable: true, value: true }); const hiddenStart = FX.stats(); FX.frame(0.05, true); const hiddenEnd = FX.stats(); delete document.hidden;
    return { loaded, afterDust, beforePause, paused, dust, removed, hiddenStart, hiddenEnd };
  });
  assert.ok(fx.loaded.alive > 0 && fx.loaded.alive <= 120); assert.equal(fx.loaded.owners, 35); assert.ok(fx.afterDust.alive <= 120);
  assert.equal(fx.paused.time, fx.beforePause.time); assert.equal(fx.paused.alive, fx.beforePause.alive);
  assert.equal(fx.dust.alive, 5); assert.equal(fx.removed.alive, 0); assert.equal(fx.removed.owners, 0); assert.equal(fx.hiddenStart.time, fx.hiddenEnd.time);
  await p.emulateMedia({ reducedMotion: 'reduce' }); await p.waitForTimeout(30);
  const reduced = await p.evaluate(() => { const k = document.createElement('canvas').getContext('2d'); for (let f = 0; f < 60; f++) { FX.frame(1 / 60, true); FX.paint(k, 1, FIGS.anchors('mula', 0), 0, 0, 256, 320, 1, 283); FX.dust(1); } return FX.stats(); });
  assert.equal(reduced.reduced, true); assert.equal(reduced.alive, 0);
  await p.close(); await b.close(); b = await chromium.launch(launchOptions);

  // Partida reproduzível com Mula aliada, inimiga e números visíveis, no celular.
  const game = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true }); game.on('pageerror', e => errors.push(e.message));
  // Simula o HTML totalmente offline (as fontes remotas já tinham fallback).
  await game.route(/^https?:/, route => route.abort());
  await game.goto('file://' + path.join(root, 'dist/test.html'));
  await game.evaluate(() => { document.querySelector('input[name=mode][value=hot]').click(); document.querySelector('input[name=fac][value=assom]').click(); document.getElementById('bGo').click(); document.getElementById('bPass').click();
    const g = __pj.g; g.terr = { '0,2': 'mata', '4,2': 'mata', '0,4': 'mata', '4,4': 'mata', '2,3': 'encru' }; g.p[0].hand = ['mula', 'corpo', 'pacto', 'grito']; g.p[0].mana = g.p[0].max = 9;
    for (const [x, y, o] of [[1, 4, 0], [3, 2, 1]]) { const d = CD.CARDS.mula; g.units.push({ id: g.uid++, card: 'mula', o, x, y, atk: d.atk, hp: d.hp, max: d.hp, sick: false, moved: false, acted: false, rooted: 0, stunned: 0 }); }
  });
  // Passa a seleção e a interface real pelo evento de toque.
  const tile = await game.evaluate(() => { const r = document.getElementById('cv').getBoundingClientRect(); return [r.x + __pj.SX(1, 4), r.y + __pj.SY(1, 4)]; });
  await game.touchscreen.tap(...tile); await game.waitForTimeout(450);
  await game.screenshot({ path: path.join(root, 'shots/jogo-mula.png') });
  const moving = await game.evaluate(() => { const u = __pj.g.at(1, 4); return __pj.act({ c: 'move', id: u.id, x: 2, y: 4 }); }); assert.equal(moving, true);
  await game.waitForTimeout(120); assert.ok((await game.evaluate(() => FX.stats().alive)) > 0); await game.waitForTimeout(400);
  assert.equal(await game.evaluate(() => __pj.g.at(2, 4).card), 'mula');
  // O fallback 2D continua jogável sem WebGL, com o novo módulo FX embutido.
  await game.addInitScript(() => { const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (kind, ...args) { return /webgl/.test(kind) ? null : get.call(this, kind, ...args); }; });
  await game.reload(); await game.evaluate(() => { document.getElementById('bGo').click(); document.getElementById('bPass').click(); }); await game.waitForTimeout(100);
  assert.equal(await game.evaluate(() => FIGS.ok()), false); assert.ok(await game.evaluate(() => !!__pj.g));
  await game.screenshot({ path: path.join(root, 'shots/mula-fallback.png') });
  assert.deepEqual(errors, []);
  const report = { baseline, ...result, fx, reduced, browserErrors: errors };
  fs.writeFileSync(path.join(root, 'shots/mula-qa.json'), JSON.stringify(report, null, 2) + '\n');
  console.log('Mula: ' + result.triangles + ' triângulos incluindo contornos; 8 direções/âncoras; 104 sprites dos personagens ainda não refinados idênticos; pool/pausa/aba oculta/reduced-motion/movimento OK.');
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { if (b) await b.close(); });
