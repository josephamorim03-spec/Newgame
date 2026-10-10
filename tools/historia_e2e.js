// O modo história no navegador (docs/historia.md): o menu mostra "História" depois da estreia; o mapa abre o Prólogo e
// fecha os capítulos seguintes; o gibi mostra só falas aprovadas, avança por toque e "Pular" vai direto à partida; o
// Prólogo é contra a Diana até 8, sem cartas, com o guia na voz dela; vencer mostra a cena do depois e abre o próximo; o
// Capítulo 1 é contra o Sapo (meta 12, o deck dele) e libera o Reverso; perder oferece a revanche direto na Mesa.
// Uso: NODE_PATH=$(npm root -g) node tools/historia_e2e.js   (fotos em builds/fotos/)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const RAIZ = path.join(__dirname, '..');
const FOTOS = path.join(RAIZ, 'builds', 'fotos');
fs.mkdirSync(FOTOS, { recursive: true });
const PAGINA = 'file://' + path.join(RAIZ, 'index.html');
const VETERANO = { guia: { estreia: true, jogou: true, vistos: ['eco', 'passo', 'oposto', 'disparo', 'ruptura'] }, rec: { partidas: 3, vitorias: 1, seq: 0, melhorSeq: 1, maiorDisparo: 2, maiorCorrente: 4 }, deckVisto: true };

const erros = [];
const falha = m => { erros.push(m); console.log('FALHA', m); };

async function nova(navegador, guardado = VETERANO, vp = { width: 390, height: 844 }) {
  const pg = await navegador.newPage({ viewport: vp, hasTouch: true });
  pg.on('pageerror', e => falha('erro na página: ' + e.message));
  pg.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) falha('console: ' + m.text()); });
  if (guardado) await pg.addInitScript(g => { if (!localStorage.getItem('diceduel.v1')) localStorage.setItem('diceduel.v1', JSON.stringify(g)); }, guardado);
  await pg.goto(PAGINA); await pg.waitForTimeout(600);
  return pg;
}
// toca no gibi até ele fechar; devolve os balões que apareceram
async function lerGibi(pg, max = 80) {
  const vistos = [];
  for (let i = 0; i < max && await pg.$('.gibi'); i++) {
    vistos.push(...await pg.$$eval('.gibi .gq-balao, .gibi .gq-titulo-pag, .gibi .gq-ingr, .gibi .gq-margem', l => l.map(x => x.textContent)));
    await pg.click('.gibi'); await pg.waitForTimeout(60);
  }
  if (await pg.$('.gibi')) falha('o gibi não fechou');
  return [...new Set(vistos)];
}
async function passarVersus(pg) { await pg.waitForTimeout(300); const v = await pg.$('.versus'); if (v) await v.click(); await pg.waitForTimeout(2600); }
async function vencer(pg, cor, pts) {
  await pg.evaluate(([cor, pts]) => { const j = DiceDuel.jogo; j.pensando = false; j.token = Math.random(); j.vez = 0; j.fase = 'decidir'; j.cor[0] = cor; j.pts = pts; DiceDuel.ajustar({}); }, [cor, pts]);
  await pg.click('[data-acao="disparar"]');
}

(async () => {
  const navegador = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});

  // 0. só falas aprovadas: todo código usado pela história tem fala aprovada, e o arquivo das falas não tem pendente
  const aprovadas = JSON.parse(fs.readFileSync(path.join(RAIZ, 'docs', 'historia_piadas.json'), 'utf8')).falas;
  const pg0 = await nova(navegador);
  const usados = await pg0.evaluate(() => {
    const ids = [];
    for (const c of Historia.CAPS) {
      for (const q of [...c.antes, ...c.depois]) ids.push(...q.ids);
      for (const l of Object.values(c.falas || {})) ids.push(...l);
    }
    ids.push(...Object.values(Historia.GUIA));
    return { ids, carregadas: Object.keys(window.HISTORIA_FALAS) };
  });
  for (const id of usados.ids) {
    const f = aprovadas.find(x => x.id === id);
    if (!f || f.status !== 'aprovada' || !f.usar) falha(`a história usa ${id}, que não está aprovada para uso`);
  }
  for (const id of usados.carregadas) { const f = aprovadas.find(x => x.id === id); if (!f || f.status !== 'aprovada') falha(`historia_falas.js carrega ${id} sem aprovação`); }
  await pg0.close();

  // 1. primeira visita: sem "História" no menu (a estreia vem antes de tudo)
  const novato = await nova(navegador, null);
  if (await novato.$('[data-inicio="historia"]:not([hidden])')) falha('a História aparece antes da estreia');
  await novato.close();

  // 2. o mapa e o Prólogo
  const pg = await nova(navegador);
  if (!(await pg.$('[data-inicio="historia"]:not([hidden])'))) falha('o menu não mostra a História depois da estreia');
  await pg.click('[data-inicio="historia"]'); await pg.waitForTimeout(250);
  const mapa = await pg.$$eval('.hc', l => l.map(x => ({ c: x.className, botao: !!x.querySelector('[data-cap]') })));
  if (!mapa[0].botao || mapa[1].botao || mapa[2].botao) falha(`o mapa abre só o Prólogo: ${JSON.stringify(mapa)}`);
  await pg.screenshot({ path: path.join(FOTOS, 'historia-mapa.png') });
  await pg.click('[data-cap="P"]'); await pg.waitForTimeout(300);
  await pg.screenshot({ path: path.join(FOTOS, 'historia-gibi.png') });
  const antes = await lerGibi(pg);
  if (!antes.some(t => /Você joga dados\?/.test(t))) falha(`o Prólogo não abriu com a Diana: ${antes}`);
  await passarVersus(pg);
  const p0 = await pg.evaluate(() => ({ h: DiceDuel.jogo.historia, meta: DiceDuel.jogo.meta, decks: DiceDuel.jogo.decks, rival: DiceDuel.jogo.nomes[1], guia: !!DiceDuel.jogo.historiaGuia }));
  if (p0.h !== 'P' || p0.meta !== 8 || p0.decks.flat().length || p0.rival !== 'Diana' || !p0.guia) falha(`o Prólogo é contra a Diana, até 8, sem cartas: ${JSON.stringify(p0)}`);
  // o guia na voz da Diana: um Eco forçado
  const dicas = [];
  await pg.exposeFunction('__dica', t => dicas.push(t));
  await pg.evaluate(() => { const o = Fx.dica; Fx.dica = (t, s, ...r) => { window.__dica(t + ' ' + s); return o(t, s, ...r); }; });
  await pg.evaluate(() => { const j = DiceDuel.jogo; j.pensando = false; j.vez = 0; j.fase = 'pegar'; j.cor[0] = [3]; j.mesa[0].v = 3; DiceDuel.ajustar({}); });
  await pg.click('.pega >> nth=0'); await pg.waitForTimeout(80); await pg.click('.pega >> nth=0'); await pg.waitForTimeout(800);
  if (!dicas.some(t => /Gêmeos idênticos/.test(t))) falha(`o guia do Prólogo não falou o Eco na voz da Diana: ${dicas}`);
  await vencer(pg, [2, 3, 4], [7, 2]);
  await pg.waitForSelector('.gibi', { timeout: 9000 }).catch(() => falha('vencer o Prólogo não mostrou a cena do depois'));
  const depois = await lerGibi(pg);
  if (!depois.some(t => /caderno de receitas/.test(t))) falha(`a cena do depois do Prólogo: ${depois}`);
  await pg.waitForFunction(() => !document.getElementById('fim').hidden, null, { timeout: 6000 }).catch(() => falha('o fim do Prólogo não abriu'));
  const f0 = await pg.evaluate(() => ({ botao: document.getElementById('btnDeNovo').textContent, feitos: DiceDuel.st.conta.historia.feitos, rating: DiceDuel.st.conta.rating }));
  if (f0.botao !== 'Próximo: Capítulo 1' || f0.feitos.join() !== 'P') falha(`depois do Prólogo: ${JSON.stringify(f0)}`);
  if (f0.rating !== 1000) falha('a história não mexe no rating');

  // 3. Capítulo 1: o Sapo; "Pular" vai direto à partida
  await pg.click('#btnDeNovo'); await pg.waitForTimeout(300);
  if (!(await pg.$('.gibi'))) falha('o Capítulo 1 não abriu com o gibi');
  await pg.click('.gibi-pular'); await pg.waitForTimeout(100);
  if (await pg.$('.gibi')) falha('"Pular" não fechou o gibi');
  await passarVersus(pg);
  const p1 = await pg.evaluate(() => ({ h: DiceDuel.jogo.historia, meta: DiceDuel.jogo.meta, rival: DiceDuel.jogo.nomes[1], deck: DiceDuel.jogo.decks[1] }));
  if (p1.h !== 'C1' || p1.meta !== 12 || p1.rival !== 'Sapo' || p1.deck.join() !== 'coringa,ajuste,reverso') falha(`o Capítulo 1: ${JSON.stringify(p1)}`);
  await pg.screenshot({ path: path.join(FOTOS, 'historia-sapo.png') });
  // a fala do Sapo quando ele usa o Reverso
  const falou = await pg.evaluate(async () => {
    const j = DiceDuel.jogo; j.pensando = false; j.token = Math.random(); j.vez = 1; j.fase = 'pegar'; j.cor[1] = [2, 3];
    window.Regras.usarCarta(j, 1, 'reverso'); DiceDuel.ajustar({});
    await new Promise(r => setTimeout(r, 1600));
    return (j.fala || {}).txt || '';
  });
  if (!/transcriptase/.test(falou)) falha(`o Sapo não comentou o Reverso: "${falou}"`);
  // perder: a revanche começa direto na Mesa (sem o gibi do antes)
  await pg.evaluate(() => { const j = DiceDuel.jogo; j.pensando = false; j.token = Math.random(); j.vez = 1; j.fase = 'decidir'; j.cor[1] = [2, 3, 4, 5]; j.pts = [3, 11]; DiceDuel.ajustar({}); DiceDuel.automato(); });
  await pg.waitForFunction(() => !document.getElementById('fim').hidden, null, { timeout: 9000 }).catch(() => falha('a derrota no Capítulo 1 não abriu o fim'));
  const perdeu = await pg.evaluate(() => ({ botao: document.getElementById('btnDeNovo').textContent, rec: document.getElementById('fimRecompensas').textContent, feitos: DiceDuel.st.conta.historia.feitos }));
  if (perdeu.botao !== 'Revanche contra Sapo' || !/ficou com a página 1/.test(perdeu.rec) || perdeu.feitos.includes('C1')) falha(`a derrota no Capítulo 1: ${JSON.stringify(perdeu)}`);
  await pg.click('#btnDeNovo'); await pg.waitForTimeout(300);
  if (await pg.$('.gibi')) falha('a revanche mostrou o gibi do antes de novo');
  await passarVersus(pg);
  await vencer(pg, [2, 3, 4, 5, 6], [10, 2]);
  await pg.waitForSelector('.gibi', { timeout: 9000 }).catch(() => falha('vencer o Capítulo 1 não mostrou a página'));
  const pag = await lerGibi(pg);
  if (!pag.some(t => /SOPA DE GIRINO/.test(t)) || !pag.some(t => /Reverso/.test(t))) falha(`a página 1: ${pag}`);
  await pg.waitForFunction(() => !document.getElementById('fim').hidden, null, { timeout: 6000 });
  const f1 = await pg.evaluate(() => ({ reverso: DiceDuel.st.conta.cartas.includes('reverso'), rec: document.getElementById('fimRecompensas').textContent, botao: document.getElementById('btnDeNovo').textContent }));
  if (!f1.reverso || !/Reverso/.test(f1.rec) || f1.botao !== 'Próximo: Capítulo 2') falha(`o fim do Capítulo 1: ${JSON.stringify(f1)}`);
  await pg.screenshot({ path: path.join(FOTOS, 'historia-fim.png') });
  await pg.close();

  // 4. o gibi em 360×640: nada sai da tela
  const pq = await nova(navegador, VETERANO, { width: 360, height: 640 });
  await pq.evaluate(() => { Historia.gibi(Historia.cap('C2').antes); });
  for (let i = 0; i < 6 && await pq.$('.gibi'); i++) { await pq.click('.gibi'); await pq.waitForTimeout(60); }
  const fora = await pq.evaluate(() => [...document.querySelectorAll('.gibi .gq:not(.saindo) .gq-balao')].some(b => { const r = b.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; }) || document.documentElement.scrollWidth > innerWidth);
  if (fora) falha('em 360 px, um balão do gibi sai da tela');
  await pq.screenshot({ path: path.join(FOTOS, 'historia-360.png') });
  await pq.close();

  await navegador.close();
  console.log(erros.length ? `ERROS:\n${erros.join('\n')}` : 'Tudo certo: o modo história se comporta como o roteiro diz.');
  process.exit(erros.length ? 1 : 0);
})();
