// Retratos da gente na bancada de poses (people.lab + window.__lab): uma fileira de pessoas feitas sob medida, de frente,
// de três-quartos, de lado e de costas, em cada pose pedida. Serve para conferir o corpo por baixo da roupa, as juntas e as mãos.
// Uso: (na pasta afluente) python3 -m http.server 8765 &   e depois
//      node sim/retrato_gente.js [pasta_de_saida] [url] [poses separadas por vírgula]
// [poses de perto]: as mesmas poses, cada pessoa sozinha de três-quartos, de lado e de costas.
// Poses: ver POSES abaixo (em pé, andando, agachado, braços para cima, sentado, ajoelhado, enxada...).
const path = require('path'), fs = require('fs');
const pw = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const [, , out = 'retratos', url0, only = '', perto = ''] = process.argv, url = url0 || 'http://localhost:8765/prototipo3d/index.html';
const POSES = {
  pe: {},
  braco: { sh: [-2.9, -1.6], shz: [0.2, -1.2], el: [-0.2, -0.3] },
  agacha: { py: 0.5, sp: 0.6, hp: [-1.9, -1.9], kn: [2.3, 2.3], ft: [-0.3, -0.3], sh: [-1.0, -1.0], el: [-0.6, -0.6] },
  curva: { sp: 1.35, sh: [-1.2, -1.2], el: [-0.2, -0.2] },
  senta: { py: 0.47, hp: [-1.5, -1.45], kn: [1.45, 1.5], sh: [-0.45, -0.5], el: [-0.7, -0.6] },
  ajoelha: { py: 0.52, hp: [0.05, 0.05], kn: [1.55, 1.55], sp: 0.3, sh: [-1.05, -1.05], el: [-1.45, -1.45], shy: [0.62, -0.62] },
  passo: { hp: [-0.5, 0.25], kn: [0.1, 0.5], ft: [-0.15, 0.3], sh: [0.35, -0.35], el: [-0.3, -0.5] },
};
const GENTE = [
  { sex: 'm', h: 1.72, hat: null, hair: 'curto', sleeves: 'curta', beard: null, imc: 22, trabalho: 1 },
  { sex: 'm', h: 1.70, hat: null, hair: 'careca', old: true, sleeves: 'longa', beard: 'bigode', imc: 27.6, idade: 68 },
  { sex: 'f', h: 1.60, hat: null, hair: 'coque', dress: false, skirt: 0, sleeves: 'curta', imc: 21 },
  { sex: 'f', h: 1.58, hat: null, hair: 'longo', apron: false, sleeves: 'curta', imc: 26 },
  { sex: 'c', h: 1.2, hat: null, hair: 'curto', dress: false, skirt: 0, imc: 16 },
];
let aquecido = false;
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1000, height: 540 } }), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
  await p.addInitScript(() => { try { localStorage.setItem('afluente:v5:historia', '1'); } catch (e) {} window.__dtMax = 0.05; });
  await p.goto(url, { timeout: 120000 }); await p.waitForFunction(() => window.__previa && window.__previa.gente, null, { timeout: 120000 }); await p.waitForTimeout(3000);
  // um lugar plano e aberto: o meio da peça de pasto (ou de cerrado)
  const spot = await p.evaluate(G => { const P = window.__previa, T = window.__tiles.find(t => t.kind === 'pasto') || window.__tiles.find(t => t.kind === 'cerrado') || window.__tiles[0];
    const [cx, cz] = T.c; P.ST.cam = 'livre'; P.ST.hour = 10.5; P.ST.rain = 'sem'; P.ST.wind = 'calmo';
    // tira o povo do vale do quadro e põe a fileira da bancada
    for (const q of P.gente.people) { q.g.visible = false; q.st = 'casa'; q.night = false; }
    window.__fila = G.map((o, i) => P.gente.lab(o, [cx + (i - (G.length - 1) / 2) * 1.05, cz], 0));
    // estúdio: some o vale (fica a luz, o céu e a fileira), um chão liso e a interface escondida
    const keep = new Set(window.__fila.map(q => q.g)); for (const q of window.__fila) for (const c of q.cloth) keep.add(c.mesh);
    for (const o of P.scene.children) if (!o.isLight && !keep.has(o)) o.visible = false;
    P.scene.traverse(o => { if ((o.isMesh || o.isPoints || o.isLine) && o.parent === P.scene && !keep.has(o)) o.visible = false; });
    P.camera.traverse(o => { if (o !== P.camera) o.visible = false; });
    const T3 = P.renderer.constructor, y0 = P.heightAt(cx, cz); window.__studioY = y0;
    for (const o of P.scene.children) if (o.isMesh && o.geometry && o.geometry.type === 'SphereGeometry' && o.geometry.parameters.radius > 500) o.visible = true;   // a cúpula do céu
    for (const el of document.body.children) if (el.tagName !== 'CANVAS' && el.tagName !== 'SCRIPT') el.style.display = 'none';
    P.scene.fog.density = 0.0005;
    return [cx, cz, y0]; }, GENTE);
  await p.evaluate(() => { const P = window.__previa, THREE = P.THREE, y0 = window.__studioY, [x, z] = [window.__fila[2].x0, window.__fila[2].z0];
    const chao = new THREE.Mesh(new THREE.CircleGeometry(9, 48).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xb8ae98 })); chao.position.set(x, y0 + 0.002, z); chao.receiveShadow = true; P.scene.add(chao);
    const fundo = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 8, 48, 1, true, Math.PI * 0.5, Math.PI), new THREE.MeshBasicMaterial({ color: 0xdcdad4, side: THREE.BackSide })); fundo.position.set(x, y0 + 4, z); P.scene.add(fundo); window.__fundo = fundo; });
  await p.evaluate(() => { const P = window.__previa, L = 5, on = o => o.traverse(c => c.layers.enable(L));
    for (const q of window.__fila) { on(q.g); for (const c of q.cloth) on(c.mesh); } on(window.__fundo); P.scene.traverse(o => { if (o.isLight || (o.isMesh && o.geometry && o.geometry.type === 'SphereGeometry' && o.geometry.parameters.radius > 500) || (o.isMesh && o.geometry && o.geometry.type === 'CircleGeometry' && o.geometry.parameters.radius === 9)) on(o); });
    P.camera.layers.set(L); window.__studioOn = on; });
  await p.waitForTimeout(4000);
  await p.evaluate(spot => { const P = window.__previa, [x, z, y] = spot; P.controls.target.set(x, y + 0.85, z); P.camera.position.set(x, y + 1.15, z + 6.2); P.controls.update(); }, spot); await p.waitForTimeout(1500);
  const vistas = { frente: 0, tresq: 0.7, lado: Math.PI / 2, costas: Math.PI };
  for (const [pn, pose] of Object.entries(POSES)) { if (only && !only.split(',').includes(pn)) continue;
    for (const [vn, face] of Object.entries(vistas)) {
      await p.evaluate(([pose, face, spot]) => { const P = window.__previa; window.__lab = pose;
        for (const q of window.__fila) { q.g.visible = true; q.st = 'post'; q.face = face; q.h = face; } window.__fundo.rotation.y = 0;
        const [x, z, y] = spot, c = P.camera; P.controls.target.set(x, y + 0.85, z); c.position.set(x, y + 1.15, z + 6.2); c.fov = 38; c.updateProjectionMatrix(); P.controls.update(); }, [pose, face, spot]);
      await p.waitForTimeout(1600);
      if (!aquecido) { aquecido = true; await p.screenshot({ path: path.join(out, `_aquece.png`), timeout: 180000 }); await p.waitForTimeout(800); }
      await p.screenshot({ path: path.join(out, `${pn}_${vn}.png`), timeout: 180000 });
      const bad = await p.evaluate(() => { const P = window.__previa, out = []; P.scene.traverse(o => { if (o.isMesh && o.geometry && o.geometry.attributes.position) { const a = o.geometry.attributes.position.array; for (let i = 0; i < a.length; i++) if (!isFinite(a[i])) { out.push((o.material && o.material.customProgramCacheKey ? o.material.customProgramCacheKey() : '?') + '/' + a.length); break; } } }); return out; });
      if (bad.length) console.log(pn, vn, 'NaN em', bad.join(' ')); } }
  // de perto, cada um inteiro, de três-quartos e de lado, na pose pedida
  for (const [pn, pose] of Object.entries(POSES)) { if (!(perto || '').split(',').includes(pn)) continue;
    for (let i = 0; i < GENTE.length; i++) for (const [vn, face] of [['tresq', 0.6], ['lado', Math.PI / 2], ['costas', Math.PI - 0.5]]) {
      await p.evaluate(([pose, face, i, spot]) => { const P = window.__previa; window.__lab = pose; for (const q of window.__fila) { q.face = face; q.h = face; }
        const q = window.__fila[i], c = P.camera, hh = q.s.h; P.controls.target.set(q.x, spot[2] + hh * 0.52, q.z); c.position.set(q.x, spot[2] + hh * 0.6, q.z + hh * 1.55); c.fov = 38; c.updateProjectionMatrix(); P.controls.update(); }, [pose, face, i, spot]);
      await p.waitForTimeout(1300); await p.screenshot({ path: path.join(out, `perto_${pn}_${i}_${vn}.png`), timeout: 180000 }); } }
  // de perto: rosto e mãos
  for (const [i, nome] of [[0, 'homem'], [1, 'velho'], [2, 'mulher'], [4, 'crianca']]) {
    await p.evaluate(([i, spot]) => { const P = window.__previa; window.__lab = {}; for (const q of window.__fila) { q.face = 0.35; q.h = 0.35; }
      const q = window.__fila[i], c = P.camera, top = q.s.h * 0.93; P.controls.target.set(q.x, spot[2] + top, q.z); c.position.set(q.x + 0.25, spot[2] + top + 0.03, q.z + 0.75); c.fov = 30; c.updateProjectionMatrix(); P.controls.update(); }, [i, spot]);
    await p.waitForTimeout(1400); await p.screenshot({ path: path.join(out, `rosto_${nome}.png`), timeout: 180000 }); }
  await p.evaluate(spot => { const P = window.__previa, q = window.__fila[0], c = P.camera; window.__lab = { sh: [-0.9, 0], el: [-1.3, -0.3] }; q.face = q.h = 0;
    P.controls.target.set(q.x - 0.15, spot[2] + 1.05, q.z + 0.35); c.position.set(q.x - 0.2, spot[2] + 1.2, q.z + 1.1); c.fov = 30; c.updateProjectionMatrix(); P.controls.update(); }, spot);
  await p.waitForTimeout(1400); await p.screenshot({ path: path.join(out, `maos.png`), timeout: 180000 });
  console.log('retratos em ' + out + (errs.length ? '\nerros: ' + errs.slice(0, 5).join(' | ') : ' · sem erros'));
  await b.close();
})();
