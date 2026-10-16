// Roda o juiz de gente (prototipo3d/js/juizgente.js) num navegador sem tela e escreve o relatório.
// Uso: node sim/juiz_gente.js <index.html empacotado ou URL> [saida.md]
// (o index.html sai de `sh prototipo3d/empacotar.sh`; ou a URL de um servidor local). Precisa do Playwright com Chromium.
const path = require('path'), fs = require('fs');
const pw = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const [, , alvo, saida = path.join(__dirname, '../prototipo3d/JUIZ_GENTE.md')] = process.argv;
if (!alvo) { console.error('uso: node sim/juiz_gente.js <index.html|url> [saida.md]'); process.exit(1); }
(async () => {
  const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 400, height: 300 } }), errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('afluente:v5:historia', '1'); } catch (e) {} });
  await p.goto(alvo.startsWith('http') ? alvo : 'file://' + path.resolve(alvo), { timeout: 120000 });
  await p.waitForFunction(() => window.__juizGente && window.__previa, null, { timeout: 120000 });
  await p.evaluate(() => { const P = window.__previa; P.ST.hour = 10; P.ST.rain = 'sem'; P.ST.seca = false; window.__hour = 10; window.__dtMax = 0.0001; });   // dia, sem chuva; o vale quase parado
  await p.waitForTimeout(1500);
  const R = await p.evaluate(() => window.__juizGente.julgar());
  await b.close();
  const E = Object.entries(R.tipos), media = Math.round(E.reduce((s, [, r]) => s + r.nota, 0) / E.length);
  const L = [`# O juiz de gente`, '', `Relatório de \`sim/juiz_gente.js\` (o motor fica em \`prototipo3d/js/juizgente.js\`). Nota média: **${media}**.`, '',
    'Cada tipo de morador é montado, medido parado, posto nas poses do jogo e (o andar) seguido por 4 s.', '',
    '| Tipo | Nota | Forma | Integração | Pose | Movimento | Triângulos |', '|---|---|---|---|---|---|---|',
    ...E.map(([n, r]) => `| ${n} | **${r.nota}** | ${r.notas.forma} | ${r.notas['integração']} | ${r.notas.pose} | ${r.notas.movimento} | ${r.medidas.triangulos} |`), ''];
  for (const [n, r] of E) { L.push(`## ${n} (${r.nota})`, '');
    const med = Object.entries(r.medidas).filter(([, v]) => v != null && typeof v !== 'object').map(([k, v]) => `${k} ${v}`).join(' · ');
    L.push(`Medidas (frações da altura; mm nas emendas): ${med}`, ''); if (r.andar) L.push(`Andar: ${Object.entries(r.andar).map(([k, v]) => `${k} ${v}`).join(' · ')}`, '');
    L.push(`Poses: ${Object.entries(r.poses).map(([k, v]) => `${k} (vinco ${v.vinco}, dentro ${v.dentro} mm)`).join(' · ')}`, '');
    if (!r.achados.length) L.push('- nada a corrigir', ''); else { for (const x of r.achados.sort((a, b) => b.pen - a.pen)) L.push(`- **${x.f}** (−${Math.round(x.pen)}): ${x.msg}`); L.push(''); } }
  L.push('## Fontes', '', '- Segmentos do corpo como fração da altura: Drillis & Contini (1966); Winter, *Biomechanics and Motor Control of Human Movement*.',
    '- Criança de 6 a 8 anos: cabeça com ~1/6 da altura, pernas proporcionalmente mais curtas (tabelas de crescimento e antropometria infantil).',
    '- Andar: passo de ~0,41 da altura a ~1,2 m/s, centro do corpo subindo e descendo 3–6 cm, braço em oposição à perna (Perry, *Gait Analysis*).', '');
  if (errs.length) L.push('Erros na página: ' + errs.slice(0, 3).join(' | '), '');
  fs.writeFileSync(saida, L.join('\n')); fs.writeFileSync(saida.replace(/\.md$/, '.json'), JSON.stringify(R, null, 1));
  console.log(`nota média ${media} · ${E.map(([n, r]) => `${n} ${r.nota}`).join(' · ')}`); console.log('relatório: ' + saida); if (errs.length) console.log('erros:', errs.slice(0, 3).join(' | '));
})();
