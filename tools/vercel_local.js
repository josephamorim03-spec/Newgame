// Simula o Vercel: serve só o que o .vercelignore publica, com os cabeçalhos do vercel.json (inclusive a CSP),
// abre o jogo, joga uma partida contra o rival e falha se o navegador bloquear algo (CSP) ou der erro.
// Uso: NODE_PATH=$(npm root -g) node tools/vercel_local.js
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'vercel.json'), 'utf8'));
const cabecalhos = Object.fromEntries(cfg.headers[0].headers.map(h => [h.key, h.value]));
const publicado = fs.readFileSync(path.join(RAIZ, '.vercelignore'), 'utf8').split('\n').filter(l => l.startsWith('!/')).map(l => l.slice(2));
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
const servidor = http.createServer((req, res) => {
  let rota = decodeURIComponent(req.url.split('?')[0]); if (rota === '/') rota = '/index.html';
  const rel = rota.slice(1), ok = publicado.some(p => rel === p || rel.startsWith(p + '/'));
  const arq = path.join(RAIZ, rel);
  if (!ok || !arq.startsWith(RAIZ) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { res.writeHead(404, cabecalhos); return res.end('404'); }
  res.writeHead(200, { ...cabecalhos, 'Content-Type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
  fs.createReadStream(arq).pipe(res);
});
(async () => {
  await new Promise(r => servidor.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const nav = await chromium.launch();
  const erros = [], faltando = [];
  for (const vp of [{ width: 390, height: 844 }, { width: 1360, height: 900 }]) {
    const pg = await nav.newPage({ viewport: vp });
    pg.on('pageerror', e => erros.push('erro: ' + e.message));
    pg.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/fonts\.g|ERR_NAME|net::ERR|railway\.app/.test(t)) erros.push('console: ' + t); if (/Content Security Policy/i.test(t)) erros.push('CSP: ' + t); });
    pg.on('response', r => { if (r.status() === 404 && r.url().startsWith(base)) faltando.push(r.url().slice(base.length)); });
    await pg.goto(base + '/'); await pg.waitForTimeout(600);
    await pg.evaluate(() => { const st = DiceDuel.st; st.deckVisto = true; st.cfg.modo = 'bot'; DiceDuel.ajustar({ som: false, musica: false }); document.getElementById('janelaDeck').hidden = true; });
    await pg.evaluate(() => document.getElementById('btnDeck').click()); await pg.click('#btnJogarDeck'); await pg.waitForTimeout(400);
    await pg.evaluate(() => document.querySelectorAll('.versus').forEach(v => v.click()));
    // joga clicando na Mesa até o fim (ou 150 toques)
    for (let k = 0; k < 150; k++) {
      const fim = await pg.evaluate(() => DiceDuel.jogo.fase === 'fim'); if (fim) break;
      const b = await pg.$('.pega:not(:disabled)');
      if (b && await pg.evaluate(() => DiceDuel.jogo.vez === 0 && !DiceDuel.jogo.pensando)) {
        await b.click().catch(() => {}); await pg.waitForTimeout(80);
        const d = await pg.$('[data-destino="corrente"]') || await pg.$('[data-destino]'); if (d) await d.click().catch(() => {});
        const disp = await pg.$('[data-acao="disparar"]'); if (disp) await disp.click().catch(() => {});
      }
      await pg.waitForTimeout(250);
    }
    // o que não é jogada, pelo menu de pausa (durante a partida) ou pelo cabeçalho (depois dela)
    for (const m of ['loja', 'ajustes', 'regras', 'online', 'deck']) {
      if (await pg.$('.menu-partida')) { await pg.click('.menu-partida'); await pg.click(`[data-menu="${m}"]`); }
      else await pg.click({ loja: '#btnCarteira', ajustes: '#btnConfig', regras: '#btnRegras', online: '#btnOnline', deck: '#btnDeck' }[m]);
      await pg.waitForTimeout(250); await pg.keyboard.press('Escape');
    }
    await pg.close();
  }
  await nav.close(); servidor.close();
  const sem = [...new Set(faltando)];
  if (sem.length) erros.push('arquivos que o Vercel não publica, mas a página pede: ' + sem.join(', '));
  console.log(erros.length ? 'ERROS:\n' + [...new Set(erros)].join('\n') : 'Vercel (local): página publicada sem bloqueio da CSP, sem arquivo faltando e sem erro.');
  process.exit(erros.length ? 1 : 0);
})();
