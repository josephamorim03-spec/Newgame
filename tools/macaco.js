// O macaco: toca ao acaso em tudo o que é clicável (dados, cartas, botões, janelas, teclado) e vigia o jogo.
// Falha com erro no console, estado impossível, escolha de dado órfã, vez de quem joga sem nada clicável,
// ou rival que não joga (travou). Uso: NODE_PATH=$(npm root -g) node tools/macaco.js [passos]   (padrão 700 por rodada)
'use strict';
const { chromium } = require('playwright');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const PASSOS = +process.argv[2] || 700;
const RODADAS = [
  { nome: 'celular-diana', vp: { width: 390, height: 844 }, modo: 'bot', nivel: 'aprendiz', anim: false },
  { nome: 'celular-coruja-animado', vp: { width: 390, height: 844 }, modo: 'bot', nivel: 'esperto', anim: true },
  { nome: 'pc-coruja', vp: { width: 1360, height: 900 }, modo: 'bot', nivel: 'esperto', anim: false },
];

// roda na página: o que está errado agora?
function vigiar() {
  const j = DiceDuel.jogo, st = DiceDuel.st, prob = [];
  const menu = !document.getElementById('inicio').hidden;   // o menu principal: a partida (se houver) espera atrás dele
  if (!j) return { prob: menu ? [] : ['sem partida'], sig: 'menu' };
  const humano = p => j.modo === 'local' || p === 0;
  if (!['pegar', 'destino', 'decidir', 'fim', 'alvo', 'ajuste'].includes(j.fase)) prob.push('fase ' + j.fase);
  if (j.mesa.length > 5) prob.push('mesa com ' + j.mesa.length);
  [0, 1].forEach(p => { if (j.cor[p].length > 5) prob.push(`corrente ${p} com ${j.cor[p].length}`); if (!Number.isFinite(j.pts[p])) prob.push('pontos'); });
  if ((j.fase === 'alvo' || j.fase === 'ajuste') && !humano(j.vez)) prob.push('carta com alvo na vez do rival');
  if (j.sel != null && !j.mesa.some(d => d.id === j.sel)) prob.push('dado escolhido que não está na Mesa');
  if (j.sel != null && !humano(j.vez)) prob.push('dado escolhido na vez do rival');
  if (j.fase === 'ajuste' && !j.mesa[j.ajusteIdx]) prob.push('Ajuste sem dado');
  // na vez de quem joga, sempre tem algo para tocar
  const modalAberto = [...document.querySelectorAll('.janela')].some(x => !x.hidden) || document.querySelector('.versus') || menu;
  if (!modalAberto && humano(j.vez) && j.fase === 'pegar' && !j.pensando && !j.intro && !document.querySelector('.pega:not([disabled])')) prob.push('vez de pegar sem nenhum dado clicável');
  if (!modalAberto && humano(j.vez) && j.fase === 'decidir' && !document.querySelector('[data-acao="disparar"]')) prob.push('decidir sem botão de disparar');
  if (document.body.innerText.match(/\bundefined\b|\bNaN\b|\[object Object\]/)) prob.push('texto quebrado na tela');
  const sig = JSON.stringify([j.compras, j.rodada, j.pts, j.fase, j.vez, j.mesa.length, j.cor, j.cartas]);
  return { prob, sig, vezRival: j.modo === 'bot' && j.vez === 1 && j.fase !== 'fim' && !j.intro && !menu, fim: j.fase === 'fim', st: st.cfg.modo };
}

// roda na página: toca em algo ao acaso
function tocar([semente, modo]) {
  let s = semente;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
  const visivel = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const grupos = [
    [10, '.pega:not([disabled])'], [8, '[data-alvo-dado]'], [9, '#acoes button:not([disabled])'], [2, '.jogador button.carta'],
    [3, '#cartaBotoes button:not([disabled])'], [2, '.janela:not([hidden]) button:not([disabled])'], [2, '.versus'],
    [1, '#btnRegras, #btnDeck, #btnConfig, #btnCarteira, #btnOnline, #btnFecharLado, .menu-partida, .janela:not([hidden]) [data-menu]'], [1, '.janela:not([hidden]) [data-aba-loja], .janela:not([hidden]) [data-op], .janela:not([hidden]) [data-pronto]'],
    [6, '.tela-inicio:not([hidden]) button'],
  ];
  const teclas = ['1', '2', '3', '4', '5', 'Enter', 'Escape', 'c', 'b', 'd', 's'];
  if (rnd() < 0.15) { const k = teclas[Math.floor(rnd() * teclas.length)]; (document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); return 'tecla ' + k; }
  const total = grupos.reduce((t, g) => t + g[0], 0);
  for (let tentativa = 0; tentativa < 6; tentativa++) {
    let x = rnd() * total, sel = grupos[0][1];
    for (const [w, q] of grupos) { if ((x -= w) < 0) { sel = q; break; } }
    const els = [...document.querySelectorAll(sel)].filter(visivel)
      .filter(el => !el.closest('#btnZerar') && el.id !== 'btnZerar' && !el.matches('[data-cfg="modo"], [data-inicio="online"]')
        // o que está coberto não recebe toque: com uma janela aberta, nada do menu; com o menu aberto, nada da Mesa atrás dele
        && !(el.closest('.tela-inicio') && document.querySelector('.janela:not([hidden])'))
        && !(!document.getElementById('inicio').hidden && !el.closest('.tela-inicio, .janela, .lado, .versus')));
    if (!els.length) continue;
    const el = els[Math.floor(rnd() * els.length)];
    el.click();
    return sel.split(',')[0] + ' ' + (el.dataset.acao || el.dataset.destino || el.dataset.usar || el.dataset.carta || el.id || el.textContent.trim().slice(0, 14));
  }
  return 'nada';
}

(async () => {
  const navegador = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const erros = [];
  for (const r of RODADAS) {
    const pg = await navegador.newPage({ viewport: r.vp, hasTouch: r.vp.width < 500 });
    pg.on('pageerror', e => erros.push(`${r.nome}: ${e.message}`));
    pg.on('console', m => { if (m.type() === 'error' && !/fonts\.g|net::/.test(m.text())) erros.push(`${r.nome} console: ${m.text()}`); });
    pg.on('dialog', d => d.dismiss());
    await pg.goto('file://' + path.join(RAIZ, 'index.html'));
    await pg.waitForTimeout(300);
    await pg.evaluate(c => {
      const st = DiceDuel.st;
      Object.assign(st.cfg, { modo: c.modo, nivel: c.nivel || 'aprendiz', ritmo: 'rapido' });
      st.conta.cartas = ['ajuste', 'virar', 'rerrolar', 'pressa', 'coringa', 'sobrecarga', 'espelho', 'fundo', 'ancora', 'interferencia', 'pedagio'];
      st.conta.moedas = 2000; st.deckVisto = true;
      DiceDuel.ajustar({ animacoes: c.anim, liberar: true, som: false, musica: false });
    }, r);
    // começa pelo menu principal, como quem abre o jogo (depois o menu volta pela Pausa e pelo fim)
    await pg.click('[data-inicio="jogar"]');
    let ultimaSig = '', desde = Date.now(), partidas = 0, ultimo = '';
    const rastro = [];
    for (let i = 0; i < PASSOS; i++) {
      let v;
      try { v = await pg.evaluate(vigiar); } catch (e) { erros.push(`${r.nome}: vigia: ${e.message}`); break; }
      v.prob.forEach(p => erros.push(`${r.nome} passo ${i}: ${p} (depois de: ${rastro.slice(-4).join(' → ')})`));
      if (v.prob.length) break;
      // o relógio do travamento só corre na vez do rival (no menu principal ele espera de propósito)
      if (v.sig !== ultimaSig || !v.vezRival) { ultimaSig = v.sig; desde = Date.now(); }
      else if (v.vezRival && Date.now() - desde > 9000) { erros.push(`${r.nome} passo ${i}: o rival travou (depois de: ${rastro.slice(-5).join(' → ')})`); break; }
      if (v.fim && ultimo !== 'fim') partidas++;
      ultimo = v.fim ? 'fim' : '';
      // parado no menu principal (sem janela por cima): de vez em quando continua ou começa, como faria alguém
      if (i % 12 === 0 && await pg.$('#inicio:not([hidden])') && !(await pg.$('.janela:not([hidden]), .lado.aberto'))) {
        const cont = await pg.$('#inicioPartida:not([hidden]) [data-inicio="continuar"]'), voltar = await pg.$('#inicioPartida:not([hidden]) [data-inicio="abandonar-nao"]');
        try {
          const T = { timeout: 3000 };
          if (voltar) { await voltar.click(T); rastro.push('menu voltar'); }
          else if (cont) { await cont.click(T); rastro.push('menu continuar'); }
          else { await pg.click('[data-inicio="jogar"]', T); rastro.push('menu jogar'); }
        } catch (e) {
          const estado = await pg.evaluate(() => ({ jogo: DiceDuel.jogo && { modo: DiceDuel.jogo.modo, fase: DiceDuel.jogo.fase, compras: DiceDuel.jogo.compras }, visiveis: [...document.querySelectorAll('#inicio [data-inicio]')].filter(b => b.offsetParent).map(b => b.dataset.inicio), deck: !document.getElementById('janelaDeck').hidden, versus: !!document.querySelector('.versus') })).catch(() => ({}));
          erros.push(`${r.nome}: menu: ${e.message.split('\n')[0]} ${JSON.stringify(estado)} (depois de: ${rastro.slice(-4).join(' → ')})`);
        }
        continue;
      }
      try { rastro.push(await pg.evaluate(tocar, [(i + 1) * 2654435761 % 4294967296, r.modo])); } catch (e) { erros.push(`${r.nome}: toque: ${e.message}`); }
      await pg.waitForTimeout(r.anim ? 60 : 25);
    }
    console.log(`${r.nome}: ${PASSOS} toques, ${partidas} partidas até o fim`);
    await pg.close();
  }
  await navegador.close();
  if (erros.length) { console.error('ERROS:\n' + [...new Set(erros)].slice(0, 30).join('\n')); process.exit(1); }
  console.log('O macaco não achou nada.');
})();
