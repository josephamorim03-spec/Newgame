// A estreia e o guia no navegador (docs/design.md §5): quem nunca jogou toca em Jogar e cai direto numa partida
// contra a Diana, até 8 pontos, sem cartas; cada explicação do guia aparece uma vez; o fim da derrota abre pelos
// bons momentos; a partida seguinte volta ao caminho de sempre (escolha do rival, deck "Primeira mesa", sem
// armadilhas) e só depois dela as armadilhas são liberadas. Quem já jogava não passa pela estreia. E a pata da
// Diana na tela inicial mexem nos dados e os devolvem.
// Uso: NODE_PATH=$(npm root -g) node tools/estreia_e2e.js   (fotos em builds/fotos/)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const RAIZ = path.join(__dirname, '..');
const FOTOS = path.join(RAIZ, 'builds', 'fotos');
fs.mkdirSync(FOTOS, { recursive: true });
const PAGINA = 'file://' + path.join(RAIZ, 'index.html');
const GUIA_TODOS = ['eco', 'passo', 'oposto', 'disparo', 'ruptura'];

// guarda as chamadas (Fx.chamada) e as dicas do guia (Fx.dica) para conferir
const espiarChamadas = pg => pg.evaluate(() => {
  window.__ch = [];
  const orig = Fx.chamada, origDica = Fx.dica;
  Fx.chamada = (t, s, tipo, op = {}) => { window.__ch.push({ t, s, classe: op.classe || '' }); return orig(t, s, tipo, op); };
  // as explicações do guia têm faixa própria (Fx.dica), fora da fila das chamadas
  Fx.dica = (t, s, ...resto) => { window.__ch.push({ t, s, classe: 'guia' }); return origDica(t, s, ...resto); };
});

// joga a partida até o fim pela tela: segura a corrente de 3 (para a Paciência poder aparecer) e dispara de 4 em diante
async function jogar(pg, { fotoGuia = null, maxPassos = 1500 } = {}) {
  let passos = 0, fotografou = false;
  while (passos++ < maxPassos) {
    try {
      await pg.waitForTimeout(60);
      if (await pg.evaluate(() => DiceDuel.jogo.fase === 'fim')) return passos;
      if (fotoGuia && !fotografou && await pg.evaluate(() => window.__ch.some(c => c.classe.includes('guia')))) {
        await pg.waitForTimeout(500); await pg.screenshot({ path: path.join(FOTOS, fotoGuia) }); fotografou = true;
      }
      const cf = await pg.$$('[data-confirma]'); if (cf.length) { await cf[0].click(); continue; }
      const disp = await pg.$('[data-acao="disparar"]');
      if (disp) {
        const L = await pg.evaluate(() => DiceDuel.jogo.cor[0].length);
        await pg.click(L >= 4 ? '[data-acao="disparar"]' : '[data-acao="segurar"]'); continue;
      }
      const conf = await pg.$('.pega.armado:not([disabled])'); if (conf) { await conf.click(); continue; }
      const bom = await pg.$('.pega:not([disabled]):not(.nao-cabe)'), qualquer = await pg.$('.pega:not([disabled])');
      if (bom) await bom.click(); else if (qualquer) await qualquer.click();
    } catch (e) { if (!/not attached|detached|not stable|not visible|intercepts|Target closed/.test(e.message)) throw e; }
  }
  return passos;
}

(async () => {
  const navegador = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const erros = [], falha = m => erros.push(m);
  const nova = async (antes) => {
    const pg = await navegador.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    pg.on('pageerror', e => falha(`erro na página: ${e.message}`));
    pg.on('console', m => { if (m.type() === 'error' && !/fonts\.g|net::/.test(m.text())) falha(`console: ${m.text()}`); });
    if (antes) await pg.addInitScript(antes);
    await pg.goto(PAGINA); await pg.waitForTimeout(400);
    await pg.evaluate(() => { DiceDuel.ajustar({ som: false, musica: false }); DiceDuel.st.cfg.ritmo = 'rapido'; });
    return pg;
  };

  // 1. primeira visita: Jogar começa a estreia, sem escolha de rival e sem montar deck
  const pg = await nova();
  await espiarChamadas(pg);
  await pg.click('[data-inicio="jogar"]'); await pg.waitForTimeout(400);
  const ini = await pg.evaluate(() => ({
    estreia: DiceDuel.jogo && DiceDuel.jogo.estreia, meta: DiceDuel.jogo.meta, decks: DiceDuel.jogo.decks, nivel: DiceDuel.jogo.nivel, vez: DiceDuel.jogo.vez,
    rivais: !!document.querySelector('#inicioRivais:not([hidden])'), deck: !document.getElementById('janelaDeck').hidden,
    versus: (document.querySelector('.versus') || {}).textContent || '',
  }));
  if (!ini.estreia) falha('o primeiro Jogar não começou a estreia');
  if (ini.meta !== 8) falha(`a estreia deveria ir a 8 pontos, foi a ${ini.meta}`);
  if (JSON.stringify(ini.decks) !== '[[],[]]') falha(`a estreia não tem cartas, veio ${JSON.stringify(ini.decks)}`);
  if (ini.nivel !== 'aprendiz' || ini.vez !== 0) falha(`a estreia é contra a Diana e você começa (veio ${ini.nivel}, vez ${ini.vez})`);
  if (ini.rivais || ini.deck) falha('a estreia não passa pela escolha do rival nem pelo deck');
  if (!/Primeira partida/.test(ini.versus)) falha('o versus da estreia não explica a partida');
  await pg.screenshot({ path: path.join(FOTOS, 'estreia-versus.png') });
  const vs = await pg.$('.versus'); if (vs) await vs.click();

  const passos = await jogar(pg, { fotoGuia: 'estreia-guia.png' });
  // a tela do fim espera a festa do disparo que fechou a partida (v0.14): espera por ela, não um tempo fixo
  await pg.waitForFunction(() => !document.getElementById('fim').hidden, null, { timeout: 9000 }).catch(() => {});
  await pg.waitForTimeout(1200);
  await pg.screenshot({ path: path.join(FOTOS, 'estreia-fim.png') });
  const fim = await pg.evaluate(() => {
    const j = DiceDuel.jogo, st = DiceDuel.st, ordem = el => Array.from(el.parentElement.children).indexOf(el);
    return {
      fase: j.fase, pts: j.pts, vencedor: j.vencedor, disparos: j.stats[0].disp, guia: st.guia, partidas: st.rec.partidas, recordes: j.recordes || [],
      momentos: j.momentos.filter(m => m.p === 0).map(m => m.txt), guiaCh: window.__ch.filter(c => c.classe.includes('guia')).map(c => c.t),
      grande: !!document.querySelector('#fimRecompensas .grande'), tarefas: j.premio && j.premio.tarefas ? j.premio.tarefas.moedas : 0, fimAberto: !document.getElementById('fim').hidden,
      momentosAntes: ordem(document.getElementById('fimMomentosTitulo')) < ordem(document.getElementById('fimRecompensas')),
      largura: [document.documentElement.scrollWidth, innerWidth],
    };
  });
  console.log('estreia', { passos, ...fim });
  if (fim.fase !== 'fim' || !fim.fimAberto) falha('a estreia não terminou com a tela do fim');
  if (!fim.guia.estreia || !fim.guia.jogou) falha('a estreia não ficou marcada como jogada');
  if (fim.partidas !== 1) falha(`a estreia conta como 1 partida, contou ${fim.partidas}`);
  if (fim.recordes.some(r => /Armadilhas liberadas/.test(r))) falha('a estreia não libera as armadilhas (só a partida seguinte)');
  if (!fim.guia.vistos.length || fim.guia.vistos.some(k => !GUIA_TODOS.includes(k))) falha(`guia: vistos estranhos ${JSON.stringify(fim.guia.vistos)}`);
  if (fim.disparos && !fim.guia.vistos.includes('disparo')) falha('disparou sem ver a explicação do disparo');
  if (new Set(fim.guiaCh).size !== fim.guiaCh.length) falha(`uma explicação do guia apareceu duas vezes: ${fim.guiaCh}`);
  if (fim.guiaCh.length !== fim.guia.vistos.length) falha(`as explicações mostradas (${fim.guiaCh}) não batem com as vistas (${fim.guia.vistos})`);
  const tevePaciencia = fim.momentos.some(t => t.startsWith('Paciência'));
  if (fim.vencedor === 0 && !fim.grande) falha('vitória: as moedas abrem o prêmio');
  // na derrota, o número grande só aparece se uma tarefa do dia pagou (v0.14); nunca um "+0"
  if (fim.vencedor !== 0 && fim.grande !== fim.tarefas > 0) falha(`derrota: número grande só com tarefa paga (grande ${fim.grande}, tarefas ${fim.tarefas})`);
  if (await pg.evaluate(() => /^\+?0$/.test((document.getElementById('contaMoedas') || {}).textContent || ''))) falha('o fim mostra "+0"');
  if (fim.vencedor !== 0 && fim.momentos.length && !fim.momentosAntes) falha('derrota com bons momentos: eles vêm antes do prêmio');
  if (fim.largura[0] > fim.largura[1]) falha('a tela do fim rola para o lado');

  // 2. a partida seguinte: escolha do rival, deck "Primeira mesa" e a Diana ainda sem armadilhas
  await pg.click('#btnMenuFim'); await pg.waitForTimeout(300);
  await pg.click('[data-inicio="jogar"]'); await pg.waitForTimeout(200);
  if (!(await pg.$('#inicioRivais:not([hidden])'))) falha('depois da estreia, o Jogar volta a abrir a escolha do rival');
  await pg.click('[data-inicio="comecar"]'); await pg.waitForTimeout(200);
  if (await pg.evaluate(() => document.getElementById('janelaDeck').hidden)) falha('a segunda partida abre o deck "Primeira mesa"');
  await pg.click('#btnJogarDeck'); await pg.waitForTimeout(300);
  const seg = await pg.evaluate(() => ({ estreia: !!DiceDuel.jogo.estreia, meta: DiceDuel.jogo.meta, deck: DiceDuel.jogo.decks[0], rival: DiceDuel.jogo.decks[1], tipos: DiceDuel.jogo.decks[1].map(c => Regras.CARTAS[c].tipo) }));
  if (seg.estreia || seg.meta !== 16) falha(`a segunda partida é normal (meta 16), veio ${JSON.stringify(seg)}`);
  if (seg.tipos.includes('armadilha')) falha(`a Diana ainda não usa armadilhas na segunda partida: ${seg.rival}`);
  const vs2 = await pg.$('.versus'); if (vs2) await vs2.click();
  await jogar(pg);
  await pg.waitForFunction(() => !document.getElementById('fim').hidden, null, { timeout: 9000 }).catch(() => {});
  const fim2 = await pg.evaluate(() => ({ fase: DiceDuel.jogo.fase, recordes: DiceDuel.jogo.recordes || [], partidas: DiceDuel.st.rec.partidas }));
  console.log('segunda partida', { deck: seg.deck, rival: seg.rival, ...fim2 });
  if (fim2.fase !== 'fim') falha('a segunda partida não terminou');
  if (!fim2.recordes.some(r => /Armadilhas liberadas/.test(r))) falha('as armadilhas são liberadas no fim da segunda partida');
  await pg.close();

  // 3. quem já jogava antes do guia (recordes e deck no aparelho, sem "guia"): nada de estreia nem de explicações
  const vet = await nova(() => { if (!localStorage.getItem('diceduel.v1')) localStorage.setItem('diceduel.v1', JSON.stringify({ rec: { partidas: 3, vitorias: 1, seq: 0, melhorSeq: 1, maiorDisparo: 4, maiorCorrente: 5 }, deckVisto: true })); });
  const v = await vet.evaluate(() => DiceDuel.st.guia);
  if (!v.estreia || v.jogou || v.vistos.length !== GUIA_TODOS.length) falha(`veterano: o guia deveria vir completo, veio ${JSON.stringify(v)}`);
  await vet.click('[data-inicio="jogar"]'); await vet.waitForTimeout(200);
  if (!(await vet.$('#inicioRivais:not([hidden])'))) falha('veterano: o Jogar abre a escolha do rival');
  await vet.close();

  // 4. ajudas desligadas: a estreia acontece, mas nenhuma explicação aparece (nem fica marcada como vista)
  const sem = await nova();
  await sem.evaluate(() => DiceDuel.ajustar({ dicas: false }));
  await espiarChamadas(sem);
  await sem.click('[data-inicio="jogar"]'); await sem.waitForTimeout(300);
  const vs3 = await sem.$('.versus'); if (vs3) await vs3.click();
  await jogar(sem, { maxPassos: 120 });
  const s = await sem.evaluate(() => ({ vistos: DiceDuel.st.guia.vistos, guiaCh: window.__ch.filter(c => c.classe.includes('guia')).length }));
  if (s.vistos.length || s.guiaCh) falha(`ajudas desligadas: o guia não aparece, veio ${JSON.stringify(s)}`);
  await sem.close();

  // 5. Recomeçar antes do primeiro dado continua na estreia; montar o deck e jogar com ele a pula
  const rec = await nova();
  await rec.evaluate(() => DiceDuel.ajustar({ animacoes: false }));
  await rec.click('[data-inicio="jogar"]'); await rec.waitForTimeout(200);
  await rec.click('#btnPausa'); await rec.click('[data-menu="sair"]'); await rec.waitForTimeout(200);
  const r5 = await rec.evaluate(() => ({ estreia: !!DiceDuel.jogo.estreia, meta: DiceDuel.jogo.meta }));
  if (!r5.estreia || r5.meta !== 8) falha(`Recomeçar antes do primeiro dado continua na estreia, veio ${JSON.stringify(r5)}`);
  await rec.close();
  const dk = await nova();
  await dk.evaluate(() => DiceDuel.ajustar({ animacoes: false }));
  await dk.click('[data-inicio="deck"]'); await dk.waitForTimeout(200);
  await dk.click('#btnJogarDeck'); await dk.waitForTimeout(200);
  const r6 = await dk.evaluate(() => ({ estreia: !!DiceDuel.jogo.estreia, meta: DiceDuel.jogo.meta, guia: DiceDuel.st.guia }));
  if (r6.estreia || r6.meta !== 16 || !r6.guia.estreia || r6.guia.jogou) falha(`jogar pelo deck pula a estreia, veio ${JSON.stringify(r6)}`);
  await dk.close();

  // 6. as patas da Diana na tela inicial: uma mexe num dado e o devolve ao lugar; tocar no meio as faz recolher e soltar o
  // dado; com a Dona Coruja escolhida, não há patas
  const pt = await nova();
  if (!(await pt.$('#inicioCena .cena-pata .mao0')) || !(await pt.$('#inicioCena .cena-pata .mao1'))) falha('as duas patas da Diana não estão na tela inicial');
  await pt.waitForSelector('.cena-dado.cutucado', { timeout: 12000 }).catch(() => falha('a pata não mexeu em nenhum dado em 12 s'));
  await pt.waitForTimeout(2600);
  if (!(await pt.evaluate(() => [...document.querySelectorAll('.cena-dado')].every(d => !d.style.transform)))) falha('depois da investida, os dados voltam para o lugar');
  await pt.waitForSelector('.cena-dado.cutucado', { timeout: 12000 }).catch(() => {});
  await pt.click('.cena-dado >> nth=1'); await pt.waitForTimeout(700);
  if (!(await pt.evaluate(() => [...document.querySelectorAll('.cena-dado')].every(d => !d.style.transform)))) falha('tocar no meio da investida solta o dado');
  await pt.evaluate(() => { DiceDuel.st.guia.estreia = true; DiceDuel.st.cfg.nivel = 'esperto'; DiceDuel.abrirInicio(); });
  if (await pt.$('#inicioCena .cena-pata')) falha('com a Dona Coruja não há pata');
  await pt.close();

  await navegador.close();
  console.log(`Paciência na estreia: ${tevePaciencia ? 'apareceu' : 'não apareceu nesta partida (depende dos dados)'}`);
  console.log(erros.length ? 'ERROS:\n' + erros.join('\n') : 'Tudo certo: nenhum erro.');
  process.exit(erros.length ? 1 : 0);
})();
