// Verificador de layout do Dice Duel: abre o jogo em várias larguras, passa por todas as telas
// e acusa texto vazando, elemento saindo da caixa do pai e rótulo curto quebrando em duas linhas.
// Uso: npm i -D playwright && node tools/layout.js        (fotos em builds/layout/)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const RAIZ = path.join(__dirname, '..');
const FOTOS = path.join(RAIZ, 'builds', 'layout');
fs.mkdirSync(FOTOS, { recursive: true });
// a última é um iPhone com entalhe e barrinha: o Chromium não tem margens de segurança, então elas entram pelas variáveis do CSS
const LARGURAS = [[320, 640], [360, 740], [390, 844], [430, 932], [768, 1024], [1360, 900], [393, 852, { topo: 59, baixo: 34 }]];

// roda dentro da página
function verificar() {
  const probs = [];
  const SOLTOS = '.elo, .alvo-rival, .marca-esp, .kbd, .fala, .pop, .cartas .raio';   // selos de canto: saem da borda de propósito
  // checkVisibility vê também a opacidade dos pais (os dados de uma ruptura caem e somem com opacity 0 no dado, não no pip)
  const visivel = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0' && (!el.checkVisibility || el.checkVisibility({ opacityProperty: true, visibilityProperty: true })); };
  const nome = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
  const texto = el => (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28);
  const ignorar = el => el.closest('.fx-canvas, .voador, .texto-sobe, .chamada, .lado:not(.aberto), [hidden], .camada-rolagem, .so-leitor');   // .so-leitor: texto só para leitor de tela (1 px, recortado de propósito)
  // linhas de texto de um elemento (agrupa retângulos que se sobrepõem na vertical)
  const linhas = el => {
    const rs = []; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { if (!n.textContent.trim()) continue; const r = document.createRange(); r.selectNodeContents(n); for (const q of r.getClientRects()) if (q.width > 1) rs.push([q.top, q.bottom]); }
    rs.sort((a, b) => a[0] - b[0]); let l = 0, fim = -1e9;
    for (const [t, b] of rs) { if (t > fim - 3) { l++; fim = b; } else fim = Math.max(fim, b); }
    return l;
  };
  // 1) texto que estoura a própria caixa
  for (const el of document.querySelectorAll('body *')) {
    if (ignorar(el) || !visivel(el) || el.closest('svg')) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'inline' || ['auto', 'scroll'].includes(cs.overflowX)) continue;
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || cs.textOverflow === 'ellipsis') continue;
    if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
      // só conta se quem passa da borda é conteúdo de verdade (as bolinhas decorativas saem de propósito)
      const r = el.getBoundingClientRect();
      const culpado = [...el.querySelectorAll('*')].find(f => visivel(f) && !f.closest(SOLTOS) && !(f.closest('svg') && f.tagName.toLowerCase() !== 'svg') && f.getBoundingClientRect().right > r.right + 1.5);
      if (culpado) probs.push(`estoura: ${nome(el)} por causa de ${nome(culpado)} "${texto(culpado)}"`);
    }
  }
  // 2) filho saindo da caixa de um elemento com borda visível
  const CAIXAS = '.slot, .carta, .btn, .tag, .bolso, .segmento button, .abas button, .carteira, .btn-topo, .item, .op, .vaga, .ficha, .vez-tag, .prontos button, .efeito-ativo, .jogador, .caixa, .acoes';
  for (const c of document.querySelectorAll(CAIXAS)) {
    if (ignorar(c) || !visivel(c)) continue;
    const r = c.getBoundingClientRect();
    const cs = getComputedStyle(c);
    if (['auto', 'scroll'].includes(cs.overflowY)) continue;
    for (const f of c.querySelectorAll('*')) {
      if (!visivel(f) || f.closest(SOLTOS) || (f.closest('svg') && f.tagName.toLowerCase() !== 'svg')) continue;
      const q = f.getBoundingClientRect();
      if (q.left < r.left - 1.5 || q.right > r.right + 1.5 || q.top < r.top - 1.5 || q.bottom > r.bottom + 1.5) { probs.push(`fora da caixa: ${nome(f)} dentro de ${nome(c)} "${texto(f)}"`); break; }
    }
  }
  // 3) rótulos que deviam caber numa linha só (na carta grande da partida, o nome; o "o que faz" embaixo pode quebrar)
  const UMA_LINHA = '.marca h1, .tag, .vez-tag, .carta:not(.grande), .carta.grande .cnome, .segmento button, .abas button, .btn-topo, .carteira, .rot, .prontos button b, .efeito-ativo, .nome, .placar, .bolso, .mesa-topo h2, .linha-cfg label, .item b, .titulo-rating, .btn';
  for (const el of document.querySelectorAll(UMA_LINHA)) {
    if (ignorar(el) || !visivel(el) || el.classList.contains('btn-duplo')) continue;
    if (linhas(el) > 1) probs.push(`quebrou em ${linhas(el)} linhas: ${nome(el)} "${texto(el)}"`);
  }
  // 4) texto que devia estar centralizado na caixa (botões e etiquetas)
  for (const el of document.querySelectorAll('.btn, .tag, .segmento button, .abas button, .slot.prox')) {
    if (ignorar(el) || !visivel(el)) continue;
    const r = el.getBoundingClientRect(); const rs = []; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { if (!n.textContent.trim()) continue; const g = document.createRange(); g.selectNodeContents(n); rs.push(...g.getClientRects()); }
    if (!rs.length) continue;
    const esq = Math.min(...rs.map(q => q.left)), dir = Math.max(...rs.map(q => q.right));
    const centro = (esq + dir) / 2, meio = r.left + r.width / 2;
    if (Math.abs(centro - meio) > Math.max(6, r.width * 0.08) && !el.querySelector('svg, .moeda, .mini')) probs.push(`descentralizado: ${nome(el)} "${texto(el)}" (${Math.round(centro - meio)}px)`);
  }
  // 5) caixas coladas na vertical: botões, cartões e campos empilhados precisam de folga visível
  //    (a sombra sólida embaixo dos botões conta como parte deles)
  const temCaixa = el => { const cs = getComputedStyle(el); return (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') || cs.backgroundImage !== 'none' || (cs.boxShadow !== 'none' && !/^inset/.test(cs.boxShadow)) || parseFloat(cs.borderTopWidth) > 0; };
  const sombraSolida = el => {
    const bs = getComputedStyle(el).boxShadow; if (!bs || bs === 'none') return 0;
    let max = 0;
    for (const parte of bs.split(/,(?![^(]*\))/)) {
      if (/inset/.test(parte)) continue;
      const n = (parte.match(/-?[\d.]+px/g) || []).map(parseFloat);
      if (n.length >= 3 && n[2] === 0) max = Math.max(max, n[1] + (n[3] || 0));
    }
    return max;
  };
  for (const el of document.querySelectorAll('.caixa *, #acoes *, .lado *')) {
    if (ignorar(el) || !visivel(el) || !temCaixa(el) || el.closest(SOLTOS)) continue;
    let prox = el.nextElementSibling;
    while (prox && (!visivel(prox) || ignorar(prox))) prox = prox.nextElementSibling;
    if (!prox || !temCaixa(prox)) continue;
    const a = el.getBoundingClientRect(), b = prox.getBoundingClientRect();
    const sobrepoe = Math.min(a.right, b.right) - Math.max(a.left, b.left) > 8;
    if (!sobrepoe || b.top < a.top + a.height / 2) continue;           // lado a lado, não empilhados
    const folga = b.top - (a.bottom + sombraSolida(el));
    if (folga < 6) probs.push(`colado na vertical: ${nome(el)} "${texto(el)}" e ${nome(prox)} (${Math.round(folga)}px)`);
  }
  // 7) texto com respiro: em botões, etiquetas e cartões o texto fica dentro do miolo (não invade o padding nem
  //    encosta na borda) e nunca é cortado com "…" (o que se lê inteiro é parte da identidade: nada pela metade)
  const RESPIRO = '.btn, .segmento button, .abas button, .tag, .carta, .vez-tag, .inicio-ico, .op, .item, .prontos button, .efeito-ativo, .ficha';
  for (const el of document.querySelectorAll(RESPIRO)) {
    if (ignorar(el) || !visivel(el) || el.closest(SOLTOS)) continue;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    const esq = r.left + parseFloat(cs.borderLeftWidth) + Math.min(parseFloat(cs.paddingLeft), 6) - 1;
    const dir = r.right - parseFloat(cs.borderRightWidth) - Math.min(parseFloat(cs.paddingRight), 6) + 1;
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n, fora = null;
    while ((n = w.nextNode()) && !fora) {
      if (!n.textContent.trim() || (n.parentElement && (n.parentElement.closest(SOLTOS) || !visivel(n.parentElement)))) continue;
      const g = document.createRange(); g.selectNodeContents(n);
      for (const q of g.getClientRects()) if (q.width > 1 && (q.left < esq || q.right > dir)) { fora = n.textContent.trim(); break; }
    }
    if (fora) probs.push(`texto sem respiro: ${nome(el)} "${fora.slice(0, 28)}"`);
  }
  for (const el of document.querySelectorAll('body *')) {
    if (ignorar(el) || !visivel(el)) continue;
    if (getComputedStyle(el).textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) probs.push(`cortado com "…": ${nome(el)} "${texto(el)}"`);
  }
  // 8) margens de segurança: caixas, menu e a barra da partida ficam inteiros entre o entalhe e a barrinha do aparelho
  const raiz = getComputedStyle(document.documentElement);
  const px = v => { const d = document.createElement('div'); d.style.cssText = `position:fixed;height:${v}`; document.body.appendChild(d); const h = d.getBoundingClientRect().height; d.remove(); return h; };
  const segTopo = px(raiz.getPropertyValue('--seg-topo') || '0px'), segBaixo = px(raiz.getPropertyValue('--seg-baixo') || '0px');
  for (const el of document.querySelectorAll('.janela:not([hidden]) > .caixa, .tela-inicio:not([hidden]) .inicio-caixa, #barraPartida:not([hidden])')) {
    if (ignorar(el) || !visivel(el)) continue;
    const r = el.getBoundingClientRect();
    // a barra da partida rola com a página: o que conta é onde ela fica com a página no topo
    const topo = r.top + (el.matches('#barraPartida') ? scrollY : 0);
    if (topo < segTopo - 1) probs.push(`passa do topo seguro: ${nome(el)} (${Math.round(topo)}px < ${Math.round(segTopo)}px)`);
    if (el.matches('.caixa') && r.bottom > innerHeight - segBaixo + 1) probs.push(`entra na barrinha de baixo: ${nome(el)} (${Math.round(innerHeight - r.bottom)}px de ${Math.round(segBaixo)}px)`);
  }
  // 6) texto de programa vazando para a tela
  const vazou = (document.body.innerText.match(/\bundefined\b|\bNaN\b|\[object Object\]|\bnull\b/g) || []);
  if (vazou.length) probs.push(`texto quebrado na tela: "${[...new Set(vazou)].join(', ')}"`);
  if (document.documentElement.scrollWidth > innerWidth + 1) probs.push(`a página rola para o lado (${document.documentElement.scrollWidth}>${innerWidth})`);
  return [...new Set(probs)];
}

if (require.main === module) (async () => {
  const navegador = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const achados = new Map();   // problema -> larguras/telas onde apareceu
  const anota = (tela, largura, lista) => lista.forEach(p => { const k = `${tela} · ${p}`; if (!achados.has(k)) achados.set(k, new Set()); achados.get(k).add(largura); });
  for (const [w0, h, seg] of LARGURAS) {
    const w = seg ? `${w0}-iphone` : w0;
    const pg = await navegador.newPage({ viewport: { width: w0, height: h } });
    if (seg) await pg.addInitScript(([t, b]) => addEventListener('DOMContentLoaded', () => { document.documentElement.style.setProperty('--seg-topo', t + 'px'); document.documentElement.style.setProperty('--seg-baixo', b + 'px'); }), [seg.topo, seg.baixo]);
    const erros = []; pg.on('pageerror', e => erros.push(e.message));
    await pg.goto('file://' + path.join(RAIZ, 'index.html'));
    await pg.evaluate(() => { DiceDuel.ajustar({ animacoes: false, liberar: true }); DiceDuel.st.conta.moedas = 400; DiceDuel.st.conta.cartas = Regras.ORDEM.slice(); });
    await pg.waitForTimeout(300);
    // o mouse sai de cima antes de medir: o dado inclinado pelo :hover passa da borda de propósito e não é defeito
    const olha = async (tela, foto) => { await pg.mouse.move(0, 0); await pg.waitForTimeout(220); anota(tela, w, await pg.evaluate(verificar)); if (foto) await pg.screenshot({ path: path.join(FOTOS, `${tela}-${w}.png`), fullPage: false }); };
    await olha('inicio', true);
    await pg.click('[data-inicio="jogar"]');   // primeira visita: o Jogar do menu abre o deck "Primeira mesa"
    await olha('deck', true);
    await pg.click('#janelaDeck [data-info="interferencia"]'); await olha('info-carta', false); await pg.click('#janelaCarta [data-fechar-carta]');
    await pg.click('#btnFecharDeck');
    await pg.click('[data-inicio="dois"]'); await olha('deck-dois', false); await pg.click('#btnFecharDeck');
    await pg.evaluate(() => document.getElementById('btnCarteira').click()); for (const aba of ['cartas', 'dados', 'icones', 'mesas']) { await pg.click(`[data-aba-loja="${aba}"]`); await olha('loja-' + aba, aba === 'cartas'); } await pg.click('#btnComoGanhar'); await olha('loja-ganhar', false); await pg.click('[data-voltar-loja]'); await pg.click('#btnFecharLoja');
    await pg.evaluate(() => document.getElementById('btnOnline').click()); await olha('online-sem-servidor', false); await pg.click('#btnFecharOnline');
    await pg.evaluate(() => document.getElementById('btnConfig').click()); await olha('ajustes', true); await pg.click('#btnFecharConfig'); await pg.click('[data-inicio="rival"][data-v="esperto"]');
    if (w0 < 1040) { await pg.evaluate(() => document.getElementById('btnRegras').click()); await pg.waitForTimeout(350); await olha('regras', false); await pg.click('#btnFecharLado'); }
    await pg.evaluate(() => document.getElementById('btnDeck').click()); await pg.click('[data-pronto="1"]'); await pg.click('#btnJogarDeck');
    await pg.waitForTimeout(200);
    await pg.evaluate(() => document.querySelectorAll('.versus').forEach(v => v.click()));
    await pg.evaluate(() => { DiceDuel.jogo.compras = Math.max(1, DiceDuel.jogo.compras); });   // conta como começada (a guardada aparece no menu)
    await pg.click('#btnPausa'); await olha('pausa', true);
    await pg.click('[data-menu="inicio"]'); await olha('inicio-guardada', true);
    await pg.click('[data-inicio="abandonar"]'); await olha('inicio-abandonar', true);
    await pg.click('[data-inicio="abandonar-nao"]'); await pg.click('[data-inicio="continuar"]');
    // partida inteira, verificando em cada fase que aparecer
    const vistas = new Set(); let passos = 0;
    while (passos++ < 900) {
      try {
        await pg.waitForTimeout(60);
        const fase = await pg.evaluate(() => DiceDuel.jogo.fase + (DiceDuel.jogo.cor[0].length >= 3 ? '-longa' : ''));
        if (fase.startsWith('fim')) break;
        if (!vistas.has(fase) || passos % 25 === 0) { vistas.add(fase); await olha('partida-' + fase.replace('-longa', ''), !vistas.has('foto-' + fase) && (vistas.add('foto-' + fase), true)); }
        const dst = await pg.$$('[data-destino]'); if (dst.length) { await dst[0].click(); continue; }
        const disp = await pg.$('[data-acao="segurar"]'); if (disp) { const L = await pg.evaluate(() => DiceDuel.jogo.cor[0].length); await pg.click(L >= 4 ? '[data-acao="disparar"]' : '[data-acao="segurar"]'); continue; }
        const minha = await pg.$('.jogador.da-vez button.carta.pronta');
        if (minha && !vistas.has('carta')) { vistas.add('carta'); await minha.click(); await olha('carta', true); await pg.click('[data-acao="fechar-carta"], #cartaBotoes [data-fechar-carta]'); continue; }
        const conf = await pg.$('.pega.armado:not([disabled])'); if (conf) { await conf.click(); continue; }
        const bom = await pg.$('.pega:not([disabled]):not(.nao-cabe)'); const q = await pg.$('.pega:not([disabled])');
        if (bom) await bom.click(); else if (q) await q.click();
      } catch (e) { if (!/not attached|detached|not stable|not visible|intercepts/.test(e.message)) throw e; }
    }
    await pg.waitForTimeout(900);
    await olha('fim', true);
    if (erros.length) anota('erros', w, erros);
    await pg.close();
  }
  await navegador.close();
  // agrupa por tela + tipo + elemento (o texto entre aspas varia)
  const grupos = new Map();
  for (const [p, ws] of achados) { const k = p.replace(/ "[^"]*"/, '').replace(/\(\d+>\d+\)|\(-?\d+px\)/g, ''); const g = grupos.get(k) || { ws: new Set(), ex: p.match(/"([^"]*)"$/)?.[1] || '' }; ws.forEach(x => g.ws.add(x)); grupos.set(k, g); }
  const lista = [...grupos.entries()].sort();
  for (const [k, g] of lista) console.log(`[${[...g.ws].sort((a, b) => a - b).join(',')}] ${k}${g.ex ? `  ex.: "${g.ex}"` : ''}`);
  console.log(lista.length ? `\n${lista.length} problemas de layout.` : 'Layout limpo em todas as larguras.');
  process.exit(lista.length ? 1 : 0);
})();

module.exports = { verificar };
