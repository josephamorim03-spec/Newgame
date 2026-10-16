// O juiz do corpo: mede os moradores do vale na rotina (com o solucionador de anatomia.js) e escreve prototipo3d/JUIZ_CORPO.md.
// (O juiz de gente, prototipo3d/js/juizgente.js + sim/juiz_gente.js, mede cada tipo de morador montado na bancada.)
//  PESO      IMC de cada um (ninguém obeso: < 30; sobrepeso é exceção), barriga saliente só em homem (e mais nos velhos)
//  FORMA     altura, cabeça/altura, perna/altura (adulto ~0,53; criança ~0,5), largura de ombro e de quadril
//  JUNTAS    depois do solucionador, nenhuma junta passa da amplitude normal (anatomia.js, tabela ROM), durante minutos de rotina
//  PASSADA   pé de apoio parado no chão (velocidade do calcanhar no apoio), sem afundar, cadência (passos/min) e passo/altura
// Uso: (na pasta afluente) python3 -m http.server 8765 &   e   node sim/juiz_corpo.js [url] [minutos]
const path = require('path'), fs = require('fs');
const pw = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const [, , url0, mins = '3'] = process.argv, url = url0 || 'http://localhost:8765/prototipo3d/index.html';
(async () => {
  const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 320, height: 240 } }), errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('afluente:v5:historia', '1'); } catch (e) {} });
  await p.goto(url, { timeout: 120000 }); await p.waitForFunction(() => window.__previa && window.__previa.gente, null, { timeout: 120000 });
  const R = await p.evaluate(min => { const P = window.__previa, THREE = P.THREE, G = P.gente, H = P.heightAt, D = 180 / Math.PI;
    // a câmera perto de cada um não importa: o juiz liga o detalhe todo
    window.__pertoTodos = true;
    const pessoas = G.people, out = { pessoas: [], juntas: {}, passos: [], porJob: {} };
    for (const q of pessoas) { const pf = q.perfil; out.pessoas.push({ sexo: pf.sexo, velho: pf.old, idade: Math.round(pf.idade), imc: +pf.imc.toFixed(1), gord: +pf.gord.toFixed(1), barriga: +pf.barriga.toFixed(2), musculo: +pf.M.toFixed(2), h: q.s.h, job: q.job }); }
    // forma: medida em pé na pose de descanso
    const forma = pessoas.map(q => { const undo = q.rest(); q.g.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(q.body), sc = q.g.scale.x, v = new THREE.Vector3();
      const hp = q.legs[0].hp.getWorldPosition(new THREE.Vector3()).y - q.g.position.y, top = bb.max.y - q.g.position.y, chin = q.corpo.P.L[10] * sc, sh = q.arms.map(a => a.sh.getWorldPosition(new THREE.Vector3()));
      const r = { altura: top, perna: hp / (q.s.h), cabeca: (q.s.h - chin) / q.s.h, ombro: sh[0].distanceTo(sh[1]) / q.s.h, sexo: q.perfil.sexo }; undo(); return r; });
    out.forma = forma;
    // pontos de prova no pé (calcanhar) e acompanhamento da rotina
    const calc = new THREE.Vector3(0, -0.06, -0.05), J = out.juntas, rom = (k, v) => { const o = J[k] || (J[k] = { min: 1e9, max: -1e9 }); o.min = Math.min(o.min, v); o.max = Math.max(o.max, v); };
    const ult = new Map(), slip = [], slipR = [], fundo = [], PTS = [new THREE.Vector3(0, -0.06, -0.05), new THREE.Vector3(0, -0.06, 0.1), new THREE.Vector3(0, -0.058, 0.125)]; let passosT = 0, faseT = 0;
    const dt = 0.05, N = Math.round(min * 60 / dt);
    for (let n = 0; n < N; n++) { window.__ff(dt);
      for (const q of pessoas) { if (!q.g.visible || q.st === 'casa') { q._h0 = q.h; continue; } q.g.updateMatrixWorld(true);
        q.legs.forEach((l, i) => { rom('joelho (flexão)', l.kn.rotation.x * D); rom('quadril (flexão)', -new THREE.Euler().setFromQuaternion(l.hp.quaternion, 'XYZ').x * D); rom('tornozelo (planti+)', l.ft.rotation.x * D); });
        q.arms.forEach(a => { rom('cotovelo (flexão)', -a.el.rotation.x * D); });
        rom('lombar (flexão)', q.spine.rotation.x * D); rom('pescoço+cabeça (flexão)', (q.corpo.neck.rotation.x + q.head.rotation.x) * D);
        // passada: pé de apoio = o mais baixo, perto do chão; velocidade do calcanhar no mundo
        if (q.moving && q.rig.modo === 'pe' && q.yAbs == null && Math.abs(q.pitch) < 0.05) { const run = !!q.running;
          q.legs.forEach((l, i) => { const pts = PTS.map(v => l.ft.localToWorld(v.clone())), hs = pts.map(v => v.y - H(v.x, v.z)); let j = 0; for (let k = 1; k < 3; k++) if (hs[k] < hs[j]) j = k;
            const key = q.legs[i], pr = ult.get(key);
            if (hs[j] < 0.015) { if (pr && pr.j === j) { const vv = Math.hypot(pts[j].x - pr.p.x, pts[j].z - pr.p.z) / dt; (run ? slipR : slip).push(vv); const kk = q.job + (run ? '*' : '') + ':' + (Math.abs(q.h - (q._h0 ?? q.h)) > 0.02 ? 'vira' : 'reto'); (out.porJob[kk] = out.porJob[kk] || []).push(vv); } ult.set(key, { j, p: pts[j].clone() }); fundo.push(hs[j]); } else ult.delete(key); });
          passosT += dt; } q._h0 = q.h; } }
    for (const k in out.porJob) { const a = out.porJob[k].sort((x, y) => x - y); out.porJob[k] = [a.length, +a[a.length >> 1].toFixed(3)]; }
    const srt = a => a.slice().sort((x, y) => x - y), pct = (a, k) => a.length ? srt(a)[Math.floor(a.length * k)] : null;
    out.passada = { amostras: slip.length, escorregaMediana: pct(slip, 0.5), escorrega90: pct(slip, 0.9), corrida: slipR.length, corridaMediana: pct(slipR, 0.5), corrida90: pct(slipR, 0.9), afundaMin: pct(fundo, 0.01) };
    // cadência e passo: de quem anda a 1,2 m/s na passada (fórmula do motor)
    return out; }, +mins);
  await b.close();
  const P = R.pessoas, ad = P.filter(x => x.sexo !== 'c'), over = ad.filter(x => x.imc >= 25), ob = P.filter(x => x.imc >= 30), bar = P.filter(x => x.barriga > 0.15);
  const L = ['# O juiz do corpo', '', `Relatório de \`sim/juiz_corpo.js\`: ${P.length} moradores, ${mins} min de rotina simulada (o motor fica em \`prototipo3d/js/anatomia.js\`).`, '',
    '## Peso', '', `- IMC dos adultos: ${Math.min(...ad.map(x => x.imc))}–${Math.max(...ad.map(x => x.imc))} (mediana ${ad.map(x => x.imc).sort((a, b) => a - b)[Math.floor(ad.length / 2)]})`,
    `- sobrepeso (IMC 25–29,9): ${over.length} de ${ad.length} adultos (${over.map(x => x.sexo + (x.velho ? ' velho' : '') + ' ' + x.imc).join(', ') || '—'})`, `- obesos (IMC ≥ 30): ${ob.length}`,
    `- barriga saliente: ${bar.length} (${bar.map(x => `${x.sexo === 'm' ? 'homem' : x.sexo}${x.velho ? ' velho' : ''}, ${x.idade} anos, IMC ${x.imc}, barriga ${x.barriga}`).join('; ') || '—'})`,
    `- mulheres e crianças com barriga saliente: ${P.filter(x => x.sexo !== 'm' && x.barriga > 0).length}`, '',
    '| sexo | idade | IMC | gordura % | barriga | músculo | ofício |', '|---|---|---|---|---|---|---|', ...P.map(x => `| ${x.sexo}${x.velho ? ' (velho)' : ''} | ${x.idade} | ${x.imc} | ${x.gord} | ${x.barriga} | ${x.musculo} | ${x.job} |`), '',
    '## Forma', '', '| sexo | altura (m) | perna/altura | cabeça/altura | ombros/altura |', '|---|---|---|---|---|',
    ...R.forma.map(f => `| ${f.sexo} | ${f.altura.toFixed(2)} | ${f.perna.toFixed(3)} | ${f.cabeca.toFixed(3)} | ${f.ombro.toFixed(3)} |`), '',
    'Referência: perna (junta do quadril) ~0,53 da altura no adulto e ~0,5 na criança; cabeça ~0,13 no adulto e ~0,17 na criança de 7 anos; ombros (entre as juntas) ~0,2.', '',
    '## Juntas (ângulo alcançado, graus)', '', '| junta | mín | máx | amplitude normal |', '|---|---|---|---|',
    ...Object.entries(R.juntas).map(([k, v]) => `| ${k} | ${v.min.toFixed(0)} | ${v.max.toFixed(0)} | ${({ 'joelho (flexão)': '−8 a 150', 'quadril (flexão)': '−25 a 120', 'tornozelo (planti+)': '−35 a 70 (com peso)', 'cotovelo (flexão)': '−8 a 145', 'lombar (flexão)': '−25 a 55 (+ postura)', 'pescoço+cabeça (flexão)': '−60 a 50' })[k] || ''} |`), '',
    '## Passada', '', `- amostras de pé no apoio: ${R.passada.amostras}`, `- velocidade do calcanhar no apoio: mediana ${R.passada.escorregaMediana?.toFixed(3)} m/s, 90% abaixo de ${R.passada.escorrega90?.toFixed(3)} m/s (o pé que não escorrega: < 0,1)`,
    `- correndo: ${R.passada.corrida} amostras, mediana ${R.passada.corridaMediana?.toFixed(3)} m/s, 90% abaixo de ${R.passada.corrida90?.toFixed(3)} m/s`,
    `- pé abaixo do chão no apoio (1% pior): ${R.passada.afundaMin != null ? (-Math.min(0, R.passada.afundaMin) * 100).toFixed(1) : '—'} cm`, ''];
  if (errs.length) L.push('Erros na página: ' + errs.slice(0, 3).join(' | '), '');
  const saida = path.join(__dirname, '../prototipo3d/JUIZ_CORPO.md'); fs.writeFileSync(saida, L.join('\n'));
  console.log(L.slice(4, 10).join('\n')); console.log('passada', JSON.stringify(R.passada)); console.log(JSON.stringify(R.porJob));
  console.log(JSON.stringify(R.juntas)); console.log('relatório: ' + saida); if (errs.length) console.log('erros:', errs.slice(0, 3).join(' | '));
})();
