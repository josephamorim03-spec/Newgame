// Bancada rápida da cabeça, do pescoço e do ombro: monta moradores sob medida (gente.lab) e fotografa só o busto,
// de frente, de três-quartos e de lado, numa cena à parte (sem o vale). Serve para acertar mandíbula, pescoço, gola e ombro.
// Uso: (na pasta afluente) python3 -m http.server 8765 &   e depois   node sim/bancada_cabeca.js saida.png [url] [busto|cabeca|corpo] [nu]
// (corpo: a pessoa inteira em repouso; nu: sem roupa, para ver a forma por baixo do pano) [pose: JSON da bancada, como em window.__lab]
const path = require('path'), fs = require('fs');
const pw = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const [, , out = 'bancada.png', url0, modo = 'busto', nu = '', poseJ = '{}'] = process.argv, POSE = JSON.parse(poseJ), url = url0 || 'http://localhost:8765/prototipo3d/index.html';
const GENTE = [
  { sex: 'm', h: 1.72, hat: null, hair: 'curto', sleeves: 'curta', shirt: 'camisa', beard: null, imc: 22, trabalho: 1 },
  { sex: 'm', h: 1.70, hat: null, hair: 'careca', old: true, sleeves: 'longa', beard: 'bigode', imc: 27.6, idade: 68 },
  { sex: 'm', h: 1.75, hat: null, hair: 'crespo', sleeves: 'curta', shirt: 'camiseta', imc: 24 },
  { sex: 'f', h: 1.60, hat: null, hair: 'coque', dress: false, skirt: 0, sleeves: 'curta', imc: 21 },
  { sex: 'f', h: 1.58, hat: null, hair: 'longo', sleeves: 'curta', dress: true, imc: 26 },
  { sex: 'c', h: 1.2, hat: null, hair: 'curto', dress: false, skirt: 0, imc: 16 },
];
if (process.env.GENTE) GENTE.splice(0, GENTE.length, ...JSON.parse(process.env.GENTE));   // GENTE='[{...}]': outra fileira
(async () => {
  const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 200, height: 150 } }), errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('afluente:v5:historia', '1'); } catch (e) {} });
  await p.goto(url, { timeout: 120000 }); await p.waitForFunction(() => window.__previa && window.__previa.gente, null, { timeout: 120000 });
  if (nu) for (const g of GENTE) Object.assign(g, { nu: true, dress: false, skirt: 0, apron: false });
  const png = await p.evaluate(async ([G, modo, POSE]) => { const P = window.__previa, THREE = P.THREE, W = modo === 'corpo' ? 220 : 300, H = modo === 'cabeca' ? 300 : modo === 'corpo' ? 420 : 340;
    const vistas = [0, 0.75, Math.PI / 2, Math.PI];
    const cv = document.createElement('canvas'); cv.width = W * vistas.length; cv.height = H * G.length; const ctx = cv.getContext('2d');
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H); r.outputColorSpace = THREE.SRGBColorSpace;
    for (let i = 0; i < G.length; i++) { const q = P.gente.lab(G[i], [0, 0], 0); q.st = 'post'; window.__lab = POSE; P.gente.update(1 / 30); P.gente.update(1 / 30); P.gente.update(1 / 30);
      const sc = new THREE.Scene(); sc.background = new THREE.Color(0xdcdad4); sc.add(new THREE.HemisphereLight(0xffffff, 0x887766, 1.6)); const dl = new THREE.DirectionalLight(0xfff2e0, 2.2); dl.position.set(2, 3, 4); sc.add(dl);
      const g = q.g; g.visible = true; const par = g.parent; sc.add(g); g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); g.updateMatrixWorld(true);
      const hy = q.head.getWorldPosition(new THREE.Vector3()).y, cy = modo === 'cabeca' ? hy + 0.03 : modo === 'corpo' ? hy * 0.52 : hy - 0.12, dist = modo === 'cabeca' ? 0.62 : modo === 'corpo' ? 3.6 : 1.25;
      const cam = new THREE.PerspectiveCamera(30, W / H, 0.05, 20);
      for (let v = 0; v < vistas.length; v++) { const a = vistas[v]; cam.position.set(Math.sin(a) * dist, cy + 0.04, Math.cos(a) * dist); cam.lookAt(0, cy, 0); r.render(sc, cam); ctx.drawImage(r.domElement, v * W, i * H); }
      sc.remove(g); if (par) par.add(g); g.visible = false; }
    return cv.toDataURL('image/png'); }, [GENTE, modo, POSE]);
  fs.writeFileSync(out, Buffer.from(png.split(',')[1], 'base64')); console.log('bancada em ' + out + (errs.length ? '\nerros: ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close(); })();
