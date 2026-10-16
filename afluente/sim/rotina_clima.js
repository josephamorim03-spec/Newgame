// Encena o dia da gente do vale sob o tempo (prototipo3d/js/people.js: modoDe/fazModo) e conta o que cada um faz:
// (a chuva, as nuvens e a luz do dia são postas direto: o navegador sem placa de vídeo leva segundos por quadro)
// manhã, garoa (com a roupa no varal), trovão, chuva forte, o sol do meio-dia, o começo da noite, a hora de dormir e a madrugada.
// Uso: (na pasta afluente) python3 -m http.server 8765 &   e depois   node sim/rotina_clima.js [pasta_de_fotos] [url]
const path = require('path'), fs = require('fs');
const pw = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const [, , out = '', url0] = process.argv, url = url0 || 'http://localhost:8765/prototipo3d/index.html';
(async () => {
  const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 900, height: 520 } }), errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('afluente:v5:historia', '1'); } catch (e) {} });
  await p.goto(url, { timeout: 120000 }); await p.waitForFunction(() => window.__previa && window.__previa.gente, null, { timeout: 120000 });
  await p.evaluate(async () => { window.__W = await import('./js/world.js'); window.__M = await import('./js/mat.js'); });
  if (out) fs.mkdirSync(out, { recursive: true });
  // cena: hora, chuva, segundos de jogo; devolve o resumo de quem faz o quê
  const cena = async (nome, { hour, rain = 'sem', s = 30, roupa = false, trovao = false, foto = null }) => {
    await p.evaluate(([hour, rain]) => { const P = window.__previa; P.ST.run = false; P.ST.hour = hour; window.__hour = hour; P.ST.rain = rain; P.ST.wind = 'calmo'; }, [hour, rain]);
    await p.waitForTimeout(2500);   // a chuva e a luz do céu acompanham (o laço do jogo roda)
    const r = await p.evaluate(([s, roupa, trovao, hour]) => { const P = window.__previa, G = P.gente, L = window.__W.LAYOUT, V = L.varal;
      if (roupa && V && V.items) for (const it of V.items.slice(0, 5)) it.visible = true;
      if (trovao) G.startle();
      const U = window.__M.U, cl = v => Math.max(0, Math.min(1, v)), dv = cl((hour - 5.6) / 0.8) * cl((18.6 - hour) / 0.8), rv = { sem: 0, garoa: 0.32, forte: 1 }[P.ST.rain], cv = P.ST.rain === 'sem' ? 0.3 : 0.95, lav = G.people.find(q => q.job === 'lavar'), log = [];
      for (let i = 0; i < s * 30; i++) { window.__hour = hour; U.uRain.value = rv; U.uCloudCov.value = cv; U.uDay.value = dv; G.update(1 / 30); if (lav && i % 30 === 0) { let dd = ''; if (lav.rcItem) { const at = lav.rcItem.meio(); dd = '@' + Math.hypot(at.x - lav.x, at.z - lav.z).toFixed(1); } log.push((lav.modo || lav.st) + ':' + (V && V.items ? V.items.filter(x => x.visible).length : '-') + '/' + ((lav.trouxa || []).length) + dd); } }
      const conta = {}; for (const q of G.people) { if (q.job === 'lab') continue; const k = (q.modo || (q.st === 'post' ? q.job : q.st)) + (q.st === 'casa' ? (hour >= q.dorme || hour < q.acorda ? '(dormindo)' : '(acordado)') : ''); conta[k] = (conta[k] || 0) + 1; }
      const luz = L.houses.filter(h => h.luz).map(h => (h.moradores ? h.moradores.length : 0) + 'm:' + (h.luz.alvo ?? 'auto') + '/' + h.luz.v.toFixed(2));
      return { dia: window.__M.U.uDay.value.toFixed(2), conta, lav: log.filter((x, i) => i % Math.max(1, Math.floor(log.length / 12)) === 0).join(' '), luz: luz.join(' ') }; }, [s, roupa, trovao, hour]);
    console.log(`\n== ${nome} (hora ${hour}, chuva ${rain}, dia ${r.dia})\n  ` + Object.entries(r.conta).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ') + (r.lav ? `\n  lavadeira (modo:peças na corda/na trouxa): ${r.lav}` : '') + `\n  luz das casas (moradores:alvo/luz): ${r.luz}`);
    if (out && foto) { await p.evaluate(f => { const P = window.__previa, q = P.gente.people.find(f.quem), c = P.camera; if (!q) return; P.ST.cam = 'livre'; P.controls.target.set(q.x, q.g.position.y + 1, q.z); c.position.set(q.x + f.d, q.g.position.y + f.d * 0.55, q.z + f.d); P.controls.update(); }, { quem: undefined, ...foto }).catch(() => {});
      await p.waitForTimeout(1500); await p.screenshot({ path: path.join(out, foto.arq) }); } };
  await cena('manhã de sol', { hour: 9, s: 20, roupa: true });
  await cena('a chuva ameaça: primeiros pingos', { hour: 10, rain: 'garoa', s: 40 });
  await cena('garoa continua', { hour: 10.5, rain: 'garoa', s: 20 });
  await cena('trovão', { hour: 11, rain: 'garoa', s: 15, trovao: true });
  await cena('chuva forte', { hour: 11, rain: 'forte', s: 25 });
  await cena('o tempo abre: a roupa volta para a corda', { hour: 11.5, rain: 'sem', s: 60 });
  await cena('sol do meio-dia', { hour: 12.3, s: 40 });
  await cena('fim da tarde: recolhe a roupa seca', { hour: 16.6, s: 50 });
  await cena('começo da noite', { hour: 19.2, s: 40 });
  await cena('hora de dormir', { hour: 22.5, s: 40 });
  await cena('madrugada', { hour: 5.5, s: 30 });
  await cena('dia claro', { hour: 7.5, s: 40 });
  console.log(errs.length ? '\nerros: ' + errs.slice(0, 4).join(' | ') : '\nsem erros na página'); await b.close(); })();
