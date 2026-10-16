// Roda o juiz dos bichos (prototipo3d/js/juiz.js) num navegador sem tela e escreve o relatório.
// Uso: node sim/juiz_bichos.js <index.html empacotado ou URL> [saida.md] [minutos de comportamento]
// (o index.html sai de `sh prototipo3d/empacotar.sh`). Precisa do Playwright com Chromium.
const path = require('path'), fs = require('fs');
const pw = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const [, , alvo, saida = path.join(__dirname, '../prototipo3d/JUIZ.md'), mins = '4'] = process.argv;
if (!alvo) { console.error('uso: node sim/juiz_bichos.js <index.html|url> [saida.md] [minutos]'); process.exit(1); }
(async () => {
  const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 400, height: 300 } }), errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('afluente:v5:historia', '1'); } catch (e) {} });
  await p.goto(alvo.startsWith('http') ? alvo : 'file://' + path.resolve(alvo), { timeout: 120000 }); await p.waitForTimeout(12000);
  const R = await p.evaluate(m => window.__juiz.julgar({ minutos: m }), +mins);
  await b.close();
  const E = Object.entries(R.especies).sort((a, b) => a[1].nota - b[1].nota), media = Math.round(E.reduce((s, [, r]) => s + r.nota, 0) / E.length);
  const L = [`# O juiz dos bichos`, '', `Relatório de \`sim/juiz_bichos.js\` (o motor fica em \`prototipo3d/js/juiz.js\`): ${R.bichos} bichos com esqueleto, ${Math.round(R.triangulos / 1000)} mil triângulos no total. Nota média: **${media}**.`, '',
    '| Espécie | Nota | Forma | Pose | Movimento | Comportamento | Triângulos |', '|---|---|---|---|---|---|---|',
    ...E.map(([n, r]) => `| ${n} | **${r.nota}** | ${r.notas.forma} | ${r.notas.pose} | ${r.notas.movimento} | ${r.notas.comportamento} | ${r.tris} |`), ''];
  for (const [n, r] of E) { L.push(`## ${n} (${r.nota})`, '');
    const m = r.medidas, med = Object.entries(m).filter(([, v]) => v != null).map(([k, v]) => `${k} ${typeof v === 'number' ? Math.round(v * 100) / 100 : v}`).join(' · ');
    L.push(`Medidas: ${med}`, ''); if (r.tempo) L.push(`Tempo: ${Object.entries(r.tempo).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(' · ')}`, '');
    if (!r.achados.length) L.push('- nada a corrigir', ''); else { for (const x of r.achados.sort((a, b) => b.pen - a.pen)) L.push(`- **${x.f}** (−${Math.round(x.pen)}): ${x.msg}`); L.push(''); } }
  L.push('## Fontes das medidas', '', '- Ângulo do jarrete (150–155° ideal; 160° reto, 134° em foice): classificação linear dinamarquesa e guia Ayrshire.', '- Perna da frente reta de lado (coluna), ombro a ~45°: extensões ACES (Alabama) e UT (Tennessee).',
    '- Troca andar→trote perto de Froude 0,5 (Alexander & Jayes, 1983), com h = altura do quadril.', '- Fração de apoio do andar 0,6–0,75 e sequência lateral das pisadas: biomecânica de quadrúpedes (Hildebrand).',
    '- Tamanhos: fichas das espécies (zebu, capivara, ovelha, lobo-guará, onça-pintada, anta, tamanduá-bandeira, garças, seriema, ema, galinha).', '- Tempo de pastejo do gado de dia (30–65%): estudos de comportamento ingestivo de bovinos a pasto.', '');
  if (errs.length) L.push('Erros na página: ' + errs.slice(0, 3).join(' | '), '');
  fs.writeFileSync(saida, L.join('\n')); fs.writeFileSync(saida.replace(/\.md$/, '.json'), JSON.stringify(R, null, 1));
  console.log(`nota média ${media} · ${E.map(([n, r]) => `${n} ${r.nota}`).join(' · ')}`); console.log('relatório: ' + saida); if (errs.length) console.log('erros:', errs.slice(0, 3).join(' | '));
})();
