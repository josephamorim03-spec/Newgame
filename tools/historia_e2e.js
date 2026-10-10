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
// o "versus" fecha sozinho em ~3 s: se ele sumir no meio do clique, tudo bem
async function passarVersus(pg) { await pg.waitForTimeout(300); const v = await pg.$('.versus'); if (v) await v.click({ timeout: 2000 }).catch(() => {}); await pg.waitForTimeout(2600); }
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

  // 4. capítulos 3 a 8: as regras da casa, a revelação com a escolha, a cura com a corrente de quem joga, o fecho,
  // os créditos, os pós-créditos e o ícone da Diana
  const quase = { ...VETERANO, conta: { moedas: 0, rating: 1000, xp: 0, cartas: ['ajuste', 'virar', 'pressa', 'coringa', 'ancora', 'interferencia'], dados: ['marfim'], icones: ['bolinha'], mesas: ['salvia'], dado: 'marfim', icone: 'bolinha', mesa: 'salvia',
    historia: { feitos: ['P', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'], estrelas: { C1: 3, C2: 1 } } } };
  const pf = await nova(navegador, quase);
  await pf.click('[data-inicio="historia"]'); await pf.waitForTimeout(250);
  const mapa2 = await pf.$$eval('.hc', l => l.length);
  if (mapa2 !== 9) falha(`o mapa mostra os 9 capítulos, mostrou ${mapa2}`);
  if (!/4 de 24 estrelas/.test(await pf.textContent('#historiaConteudo'))) falha('o mapa soma as estrelas');
  await pf.click('#btnFecharHistoria');
  for (const [cap, confere] of [['C4', j => j.dispMin === 5 && j.nomes[1] === 'Urso'], ['C5', j => j.bolso[1] !== null && j.bolso[0] === null && j.esperto], ['C7', j => j.nomes[1] === 'Dona Coruja' && j.decks[1].includes('lacre')]]) {
    await pf.evaluate(c => { document.getElementById('fim').hidden = true; window.__jogar = c; }, cap);
    await pf.evaluate(c => { const b = document.createElement('button'); b.dataset.cap = c; b.id = 'tmpCap'; document.getElementById('janelaHistoria').appendChild(b); b.click(); b.remove(); }, cap);
    await pf.waitForTimeout(200); if (await pf.$('.gibi')) await pf.click('.gibi-pular');
    await passarVersus(pf);
    const ok = await pf.evaluate(f => { const j = DiceDuel.jogo; return { ok: (0, eval)('(' + f + ')')(j), h: j.historia }; }, confere.toString());
    if (!ok.ok || ok.h !== cap) falha(`a regra da casa do ${cap} não entrou`);
  }
  // o Capítulo 8: a revelação
  await pf.evaluate(() => { const b = document.createElement('button'); b.dataset.cap = 'C8'; document.getElementById('janelaHistoria').appendChild(b); b.click(); b.remove(); });
  await pf.waitForTimeout(300);
  let viuEscolha = false;
  for (let i = 0; i < 60 && await pf.$('.gibi'); i++) {
    const bt = await pf.$('.gibi [data-escolha="1"]');
    if (bt) { viuEscolha = true; await bt.click(); await pf.waitForTimeout(80); continue; }
    await pf.click('.gibi'); await pf.waitForTimeout(50);
  }
  if (!viuEscolha) falha('a revelação não ofereceu a escolha');
  await passarVersus(pf);
  const c8 = await pf.evaluate(() => ({ h: DiceDuel.jogo.historia, rival: DiceDuel.jogo.nomes[1], deck: DiceDuel.jogo.decks[1] }));
  if (c8.h !== 'C8' || c8.rival !== 'Diana' || c8.deck.join() !== 'interferencia,espelho,pressa') falha(`o Capítulo 8: ${JSON.stringify(c8)}`);
  // vence com uma corrente só de Opostos (1-6-1-6-1): a fita complementar
  await vencer(pf, [1, 6, 1, 6, 1], [12, 3]);
  await pf.waitForSelector('.gibi', { timeout: 9000 }).catch(() => falha('vencer o Capítulo 8 não mostrou o final'));
  const final = []; let fita = '';
  for (let i = 0; i < 80 && await pf.$('.gibi'); i++) {
    final.push(...await pf.$$eval('.gibi .gq-balao, .gibi .gq-cred-titulo, .gibi .gq-marcador', l => l.map(x => x.textContent)));
    if (!fita) fita = await pf.$eval('.gibi .gq-fita', x => x.textContent).catch(() => '');
    await pf.click('.gibi'); await pf.waitForTimeout(50);
  }
  const visto = [...new Set(final)].join(' | ');
  if (!/Um, seis, um, seis, um\./.test(visto)) falha(`a cura não leu a corrente de quem jogou: ${visto}`);
  if (!/1A6T1A6T1A/.test(fita.replace(/\s/g, ''))) falha(`a fita da cura: "${fita}"`);
  if (!/Fechou\. Fechou\./.test(visto) || !/Eu ensinei bem\. Bem\./.test(visto)) falha(`o fecho do Eco (com o quadro da 3.ª estrela) não apareceu: ${visto}`);
  if (!/DianaDice/.test(visto) || !/Orgânico/.test(visto)) falha('os pós-créditos não apareceram');
  await pf.waitForFunction(() => !document.getElementById('fim').hidden, null, { timeout: 6000 }).catch(() => falha('o fim do Capítulo 8 não abriu'));
  const f8 = await pf.evaluate(() => ({ icone: DiceDuel.st.conta.icones.includes('diana'), estrelas: DiceDuel.st.conta.historia.estrelas.C8, rec: document.getElementById('fimRecompensas').textContent }));
  if (!f8.icone || f8.estrelas !== 3 || !/Ícone liberado/.test(f8.rec)) falha(`o fim da história: ${JSON.stringify(f8)}`);
  await pf.screenshot({ path: path.join(FOTOS, 'historia-final.png') });
  await pf.close();

  // 5. o gibi em 360×640: nada sai da tela
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
