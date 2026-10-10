// Teste ponta a ponta do online: sobe o servidor (banco em memória), abre dois navegadores,
// cria as contas pela tela, um chama o outro pelo link de convite e os dois jogam uma partida
// inteira clicando na Mesa. Falha com qualquer erro no console ou se o fim não pagar.
// Uso: NODE_PATH=$(npm root -g) node tools/online_e2e.js   (fotos em builds/fotos/online-*.png)
'use strict';
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { criarApp } = require('../servidor/app');
const { BancoMemoria } = require('../servidor/banco');
const { verificar } = require('./layout');

const FOTOS = path.join(__dirname, '..', 'builds', 'fotos');
fs.mkdirSync(FOTOS, { recursive: true });
const espera = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  // BASE=https://... testa um servidor de verdade (ex.: o deploy na Railway), com contas de nome único
  const externo = process.env.BASE ? process.env.BASE.replace(/\/$/, '') : null;
  let servidor = null, salas = null, base = externo;
  if (!externo) {
    const app = criarApp({ banco: new BancoMemoria(), segredo: 'segredo-do-teste-ponta-a-ponta-123', limites: { ws: 100000 } });
    salas = app.salas; servidor = app.criarServidor();
    await new Promise(r => servidor.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${servidor.address().port}`;
  }
  const sufixo = externo ? String(Date.now()).slice(-6) : '';
  const ANA = 'Ana' + sufixo, BIA = 'Bia' + sufixo;
  const navegador = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const erros = [];
  const abrir = async (nome, vp) => {
    const ctx = await navegador.newContext({ viewport: vp, hasTouch: vp.width < 500, permissions: ['clipboard-read', 'clipboard-write'] });
    const pg = await ctx.newPage();
    pg.on('pageerror', e => erros.push(`${nome}: ${e.message}`));
    pg.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_NAME|net::/.test(m.text())) erros.push(`${nome} console: ${m.text()}`); });
    return pg;
  };
  // o mesmo verificador de layout de tools/layout.js, em cada tela do online
  const layout = async (pg, tela) => { const p = await pg.evaluate(verificar); p.forEach(x => erros.push(`layout ${tela} (${pg.viewportSize().width}px): ${x}`)); };
  const sem = pg => pg.evaluate(() => DiceDuel.ajustar({ animacoes: false, som: false, musica: false }));
  const fechar = pg => pg.evaluate(() => ['janelaDeck', 'fim', 'janelaCarta', 'janelaLoja', 'janelaConfig'].forEach(id => { document.getElementById(id).hidden = true; }));
  async function criarConta(pg, nome) {
    await pg.evaluate(() => document.getElementById('btnOnline').click());
    await pg.click('[data-on="aba-criar"]');
    await pg.fill('#formConta [name=nome]', nome);
    await pg.fill('#formConta [name=senha]', 'senha-boa-1');
    await pg.click('#formConta [type=submit]');
    await pg.waitForSelector('.eu-online', { timeout: 5000 });
  }

  try {
    // Ana: celular, com algum progresso de convidado que vai junto para a conta
    const ana = await abrir('ana', { width: 390, height: 844 });
    await ana.goto(base + '/');
    await ana.waitForTimeout(400);
    await ana.evaluate(() => { DiceDuel.st.conta.moedas = 5000; DiceDuel.st.conta.cartas.push('espelho'); });
    await sem(ana); await fechar(ana);
    await criarConta(ana, ANA);
    const contaAna = await ana.evaluate(() => DiceDuel.st.conta);
    if (contaAna.moedas !== 600) throw new Error('importação: esperava 600 moedas, veio ' + contaAna.moedas);
    if (!contaAna.cartas.includes('espelho')) throw new Error('importação: o Espelho não veio');
    await ana.screenshot({ path: path.join(FOTOS, 'online-conta.png') }); await layout(ana, 'conta');
    // compra na loja com conta (o servidor desconta)
    await ana.click('#btnFecharOnline');
    // o menu por baixo da janela mostra a conta, não "Convidado" (o bug: só se redesenhava ao abrir o menu)
    const nomeMenu = await ana.evaluate(() => (document.getElementById('inicio').hidden ? null : document.querySelector('#inicioPerfil b').textContent));
    if (nomeMenu !== ANA) throw new Error(`o menu mostra "${nomeMenu}" depois de entrar na conta (esperava ${ANA})`);
    // e o Perfil (tocar no nome) mostra a conta
    {
      await ana.click('#inicioPerfil'); await ana.waitForSelector('#janelaPerfil:not([hidden])');
      const pf = await ana.evaluate(() => ({ nome: document.querySelector('.perfil-nome').textContent, conta: !!document.querySelector('[data-perfil="conta"]') }));
      if (pf.nome !== ANA || pf.conta) throw new Error('o Perfil não mostra a conta: ' + JSON.stringify(pf));
      await layout(ana, 'perfil');
      await ana.click('#btnFecharPerfil');
    }
    await ana.evaluate(() => document.getElementById('btnCarteira').click());
    await ana.click('[data-aba-loja="dados"]');
    await ana.click('[data-comprar="dados:madeira"]'); await ana.click('[data-comprar="dados:madeira"]');
    await ana.waitForFunction(() => DiceDuel.st.conta.moedas === 520 && DiceDuel.st.conta.dado === 'madeira', null, { timeout: 5000 });
    await ana.click('#btnFecharLoja');
    // deck da Ana para o online
    await ana.evaluate(() => { DiceDuel.st.decks[0] = ['ajuste', 'coringa']; DiceDuel.st.rec.melhorSeq = 3; DiceDuel.salvar(); });
    await espera(1800); // a conta recebe o deck (sincroniza 1,2 s depois de salvar)
    // cria a sala e pega o link
    await ana.evaluate(() => document.getElementById('btnOnline').click());
    await ana.click('[data-on="tempo"][data-v="calma"]');   // o tempo por vez é escolhido ao criar a sala
    await ana.click('[data-on="criar-sala"]');
    await ana.waitForSelector('.codigo-grande', { timeout: 5000 });
    const link = await ana.textContent('.convite .link');
    await ana.screenshot({ path: path.join(FOTOS, 'online-convite.png') }); await layout(ana, 'convite');
    if (!/\/\?sala=[A-Z2-9]{6}$/.test(link)) throw new Error('link de convite estranho: ' + link);
    // esperando a amiga, a Ana troca o deck pela janela do deck: a partida tem de começar com o deck novo
    await ana.evaluate(() => { DiceDuel.st.pref.liberar = true; DiceDuel.st.decks[0] = ['espelho', 'ajuste', 'pressa']; });
    await ana.click('#btnFecharOnline'); await ana.evaluate(() => document.getElementById('btnDeck').click()); await ana.click('#btnJogarDeck');
    await espera(1800);
    await fechar(ana); await ana.evaluate(() => document.querySelectorAll('.versus').forEach(v => v.click()));

    // Bia: computador, abre o link do convite sem conta: cria a conta e cai direto na sala
    const bia = await abrir('bia', { width: 1360, height: 900 });
    await bia.goto(link);
    await bia.waitForSelector('#janelaOnline:not([hidden])', { timeout: 5000 });
    if (!(await bia.textContent('#onlineConteudo')).includes('convidado')) throw new Error('o convite não apareceu para a Bia');
    await sem(bia);
    await bia.screenshot({ path: path.join(FOTOS, 'online-convidada.png') }); await layout(bia, 'convidada');
    await bia.click('[data-on="aba-criar"]');
    await bia.fill('#formConta [name=nome]', BIA);
    await bia.fill('#formConta [name=senha]', 'senha-boa-2');
    await bia.click('#formConta [type=submit]');
    // preparação: as duas montam o deck ao mesmo tempo; a Ana confirma, a Bia vê "confirmou" (sem as cartas) e confirma
    const confirmarDeck = async (pg, quem) => {
      await pg.waitForSelector('#deckEscolha:not([hidden])', { timeout: 8000 });
      await pg.click('#btnJogarDeck');
      await pg.waitForFunction(() => /Mudar o deck|Começando/.test(document.getElementById('btnJogarDeck').textContent + document.getElementById('deckEscolha').textContent) || !document.getElementById('deckEscolha').offsetParent, null, { timeout: 5000 });
      void quem;
    };
    for (const pg of [ana, bia]) await pg.waitForSelector('#deckEscolha:not([hidden])', { timeout: 8000 });
    await ana.screenshot({ path: path.join(FOTOS, 'online-preparacao-celular.png') }); await layout(ana, 'preparacao');
    await confirmarDeck(ana, 'Ana');
    await bia.waitForFunction(() => /confirmou/.test(document.getElementById('deckEscolha').textContent), null, { timeout: 5000 });
    const doRival = await bia.evaluate(() => document.getElementById('deckEscolha').textContent);
    if (/Espelho|Ajuste|Pressa/i.test(doRival)) throw new Error('as cartas da Ana apareceram para a Bia na preparação: ' + doRival);
    await bia.screenshot({ path: path.join(FOTOS, 'online-preparacao-pc.png') }); await layout(bia, 'preparacao-rival');
    await confirmarDeck(bia, 'Bia');
    for (const pg of [ana, bia]) await pg.waitForFunction(() => DiceDuel.jogo && DiceDuel.jogo.modo === 'online', null, { timeout: 8000 });
    await espera(300);
    for (const pg of [ana, bia]) { await fechar(pg); await pg.evaluate(() => document.querySelectorAll('.versus').forEach(v => v.click())); }
    await ana.screenshot({ path: path.join(FOTOS, 'online-partida-celular.png') }); await layout(ana, 'partida'); await layout(bia, 'partida');
    // Ajustes no meio da partida online: mexer neles (o ritmo do rival, a marcada e a outra) não é desistência
    await ana.evaluate(() => document.getElementById('btnConfig').click());
    const ritmoAna = await ana.evaluate(() => DiceDuel.st.cfg.ritmo);
    await ana.click(`#janelaConfig [data-cfg="ritmo"][data-v="${ritmoAna}"]`); await ana.click(`#janelaConfig [data-cfg="ritmo"][data-v="${ritmoAna === 'calmo' ? 'rapido' : 'calmo'}"]`);
    await espera(400);
    const depoisCfg = await ana.evaluate(() => ({ modo: DiceDuel.jogo.modo, fase: DiceDuel.jogo.fase }));
    if (depoisCfg.modo !== 'online' || depoisCfg.fase === 'fim') throw new Error('Ajustes no online mexeram na partida: ' + JSON.stringify(depoisCfg));
    await ana.click(`#janelaConfig [data-cfg="ritmo"][data-v="${ritmoAna}"]`);
    await fechar(ana);
    const vistaBia = await bia.evaluate(() => ({ nomes: DiceDuel.jogo.nomes, deckRival: DiceDuel.jogo.decks[1], ritmo: DiceDuel.jogo.ritmo, limite: DiceDuel.jogo.limiteVez }));
    if (vistaBia.ritmo !== 'calma' || vistaBia.limite !== 180000) throw new Error('o tempo por vez escolhido não chegou à partida: ' + JSON.stringify(vistaBia));
    if (vistaBia.nomes[1] !== ANA || vistaBia.deckRival.join() !== 'espelho,ajuste,pressa') throw new Error('a Bia não vê a Ana direito: ' + JSON.stringify(vistaBia));

    // joga clicando: quem tem a vez escolhe um dado (às vezes confirma), um destino, ou dispara/segura
    let passos = 0;
    const jogada = async pg => pg.evaluate(() => {
      const j = DiceDuel.jogo;
      if (!j || j.modo !== 'online' || j.fase === 'fim' || j.vez !== 0 || j.pensando) return false;
      document.querySelectorAll('.versus').forEach(v => v.click());
      const clicar = s => { const b = document.querySelector(s); if (b && !b.disabled) { b.click(); return true; } return false; };
      if (j.fase === 'destino') return clicar('[data-destino]');
      if (j.fase === 'decidir') return clicar(Math.random() < 0.65 ? '[data-acao="disparar"]' : '[data-acao="segurar"]');
      if (j.fase === 'pegar') {
        const bs = [...document.querySelectorAll('#mesa .pega:not([disabled])')];
        if (!bs.length) return false;
        const b = bs[Math.floor(Math.random() * bs.length)];
        b.click();   // tocar escolhe; o destino confirma
        // tocar escolhe; tocar na corrente leva (e, se o jogo perguntar, confirma)
        const al = document.querySelector('[data-alvo-dado="corrente"]'); if (al) al.click();
        const cf = document.querySelector('[data-confirma]'); if (cf) cf.click();
        return true;
      }
      return false;
    });
    const acabou = pg => pg.evaluate(() => DiceDuel.jogo.fase === 'fim' && !!DiceDuel.jogo.premio);
    // de quem é a vez (v0.12): quem tem a vez vê "Sua vez" com o relógio, a Mesa acesa e a aba avisando; o outro, "Vez de …"
    const selo = pg => pg.evaluate(() => ({ vez: DiceDuel.jogo.vez, fase: DiceDuel.jogo.fase, intro: DiceDuel.jogo.intro, txt: document.getElementById('seloVez').textContent, oculto: document.getElementById('seloVez').hidden,
      minha: document.body.classList.contains('vez-minha'), rival: document.body.classList.contains('vez-rival'), titulo: document.title }));
    let selosVistos = 0;
    const conferirSelo = async () => {
      const [sa, sb] = [await selo(ana), await selo(bia)];
      if (sa.fase === 'fim' || sb.fase === 'fim' || sa.intro || sb.intro || sa.vez === sb.vez) return;   // entre um estado e outro
      for (const [x, nome] of [[sa, ANA], [sb, BIA]]) {
        const ok = x.vez === 0 ? !x.oculto && /^Sua vez(\d+ s|\d+:\d\d)$/.test(x.txt) && x.minha && !x.rival && x.titulo.startsWith('● Sua vez')
          : !x.oculto && x.txt.startsWith('Vez de ') && x.rival && !x.minha && !x.titulo.startsWith('●');
        if (!ok) throw new Error(`o selo de vez de ${nome} não diz de quem é a vez: ` + JSON.stringify(x));
      }
      selosVistos++;
    };
    while (!((await acabou(ana)) && (await acabou(bia)))) {
      if (passos % 9 === 4) await conferirSelo();
      if (++passos > 3000) throw new Error('a partida online não terminou');
      const a = await jogada(ana), b = await jogada(bia);
      if (!a && !b) await espera(25);
      if (passos === 12) await bia.screenshot({ path: path.join(FOTOS, 'online-partida-pc.png') });
    }
    if (selosVistos < 3) throw new Error(`o selo de vez quase não foi conferido (${selosVistos} vezes)`);
    await espera(900);
    for (const pg of [ana, bia]) await pg.waitForSelector('#fim:not([hidden])', { timeout: 5000 });
    await ana.screenshot({ path: path.join(FOTOS, 'online-fim-celular.png') }); await layout(ana, 'fim'); await layout(bia, 'fim');
    const fim = await Promise.all([ana, bia].map(pg => pg.evaluate(() => ({ v: DiceDuel.jogo.vencedor, premio: DiceDuel.jogo.premio, moedas: DiceDuel.st.conta.moedas, titulo: document.getElementById('fimTitulo').textContent, recompensas: document.getElementById('fimRecompensas').textContent }))));
    const vencedor = fim.find(f => f.v === 0), perdedor = fim.find(f => f.v === 1);
    if (!vencedor || !perdedor) throw new Error('os dois viram o mesmo vencedor? ' + JSON.stringify(fim.map(f => f.v)));
    if (!(vencedor.premio.moedas.total > 0)) throw new Error('quem venceu não ganhou moedas');
    if (!/Rating online/.test(vencedor.recompensas)) throw new Error('a tela de fim não mostrou o rating online');
    if (vencedor.premio.rating <= 1000 || perdedor.premio.rating >= 1000) throw new Error('o rating não mudou como devia');
    // revanche pelos dois lados
    await ana.click('#btnDeNovo'); await bia.click('#btnDeNovo');
    // a revanche passa pela preparação de novo (com o deck anterior marcado)
    for (const pg of [ana, bia]) { await pg.waitForSelector('#deckEscolha:not([hidden])', { timeout: 8000 }); await pg.click('#btnJogarDeck'); }
    for (const pg of [ana, bia]) await pg.waitForFunction(() => DiceDuel.jogo.fase !== 'fim' && DiceDuel.jogo.partida === 2, null, { timeout: 5000 });
    // a Ana desiste pela janela Online: a Bia vence por W.O. (sem moedas)
    await ana.evaluate(() => document.querySelectorAll('.versus').forEach(v => v.click()));
    await ana.evaluate(() => document.getElementById('btnOnline').click());
    await ana.click('[data-on="desistir"]'); await ana.click('[data-on="desistir"]');
    await bia.waitForFunction(() => DiceDuel.jogo.fase === 'fim' && DiceDuel.jogo.premio && DiceDuel.jogo.premio.porDesistencia, null, { timeout: 5000 });
    // ranking aparece para quem abre o Online fora de sala
    await bia.waitForSelector('#fim:not([hidden])', { timeout: 5000 });
    await bia.click('#btnFechar');
    await bia.evaluate(() => document.getElementById('btnOnline').click());
    await bia.click('[data-on="sair-sala"]');
    await bia.waitForSelector('.ranking li .rk', { timeout: 5000 });
    const ranking = await bia.$$eval('.ranking .quem-rk', l => l.map(x => x.childNodes[0].textContent));
    await bia.screenshot({ path: path.join(FOTOS, 'online-ranking.png') }); await layout(bia, 'ranking');
    if (!ranking.includes(BIA) || (!externo && ranking.length !== 2)) throw new Error('ranking: ' + ranking.join(', '));
    // depois de sair da sala, volta a jogar contra o rival do jogo
    const modo = await bia.evaluate(() => DiceDuel.jogo.modo);
    if (modo !== 'bot') throw new Error('depois de sair da sala esperava o modo contra o rival, veio ' + modo);
    // a Ana (que desistiu, ainda na sala) vai ao menu principal e toca em Jogar: larga a sala e joga contra o rival
    // (não pode virar um pedido de revanche)
    await ana.waitForFunction(() => DiceDuel.jogo.fase === 'fim', null, { timeout: 5000 });
    await ana.evaluate(() => { document.getElementById('janelaOnline').hidden = true; DiceDuel.abrirInicio(); });
    await ana.click('[data-inicio="jogar"]'); await ana.click('[data-inicio="comecar"]');
    await ana.waitForFunction(() => DiceDuel.jogo && DiceDuel.jogo.modo === 'bot', null, { timeout: 5000 });
    const anaDepois = await ana.evaluate(() => ({ menu: !document.getElementById('inicio').hidden, sala: localStorage.getItem('diceduel.sala') }));
    if (anaDepois.menu || anaDepois.sala) throw new Error('o Jogar do menu depois do online não começou a partida: ' + JSON.stringify(anaDepois));
    // recarregar mantém a conta
    await ana.reload(); await ana.waitForTimeout(500);
    const nome = await ana.evaluate(() => DiceDuel.st.conta.online && DiceDuel.st.conta.online.nome);
    if (nome !== ANA) throw new Error('a sessão não sobreviveu ao recarregar');
    // outro aparelho (computador): entra com a mesma conta e continua de onde parou
    const anaPc = await abrir('ana-pc', { width: 1360, height: 900 });
    await anaPc.goto(base + '/'); await anaPc.waitForTimeout(400); await sem(anaPc); await fechar(anaPc);
    await anaPc.evaluate(() => document.getElementById('btnOnline').click());
    await anaPc.fill('#formConta [name=nome]', ANA.toLowerCase());
    await anaPc.fill('#formConta [name=senha]', 'senha-boa-1');
    await anaPc.click('#formConta [type=submit]');
    await anaPc.waitForSelector('.eu-online', { timeout: 5000 });
    const noPc = await anaPc.evaluate(() => ({ deck: DiceDuel.st.decks[0].join(), moedas: DiceDuel.st.conta.moedas, dado: DiceDuel.st.conta.dado, seq: DiceDuel.st.rec.melhorSeq }));
    const noCel = await ana.evaluate(() => ({ moedas: DiceDuel.st.conta.moedas }));
    if (noPc.deck !== 'espelho,ajuste,pressa' || noPc.dado !== 'madeira' || noPc.seq !== 3 || noPc.moedas !== noCel.moedas) throw new Error('a conta não seguiu para o outro aparelho: ' + JSON.stringify({ noPc, noCel }));
    await layout(anaPc, 'outro-aparelho');
    // a sala some no meio da partida (servidor reiniciou): os dois voltam ao jogo contra o rival, com aviso
    if (!externo) {
      await bia.click('[data-on="criar-sala"]');
      await bia.waitForSelector('.codigo-grande', { timeout: 5000 });
      const cod = (await bia.textContent('.codigo-grande')).trim();
      await fechar(ana);
      await ana.evaluate(() => document.getElementById('btnOnline').click());
      await ana.fill('#formCodigo [name=codigo]', cod.toLowerCase());
      await ana.click('#formCodigo [type=submit]');
      for (const pg of [ana, bia]) { await pg.waitForSelector('#deckEscolha:not([hidden])', { timeout: 8000 }); await pg.click('#btnJogarDeck'); }   // a preparação
      for (const pg of [ana, bia]) await pg.waitForFunction(() => DiceDuel.jogo && DiceDuel.jogo.modo === 'online' && DiceDuel.jogo.fase !== 'fim', null, { timeout: 6000 })
        .catch(async e => { throw new Error('a partida nova não começou: ' + JSON.stringify(await pg.evaluate(() => ({ modo: DiceDuel.jogo && DiceDuel.jogo.modo, aviso: document.getElementById('onlineAviso').textContent, online: document.getElementById('onlineConteudo').innerText.slice(0, 200) })))); });
      salas.salas.clear(); servidor.wss.clients.forEach(c => c.terminate());
      for (const pg of [ana, bia]) await pg.waitForFunction(() => DiceDuel.jogo && DiceDuel.jogo.modo === 'bot', null, { timeout: 10000 });
      const aviso = await ana.textContent('#onlineAviso');
      if (!/não encontrada/.test(aviso)) throw new Error('sem aviso de sala perdida: ' + aviso);
      await layout(ana, 'sala-perdida');
    }
    console.log(`Online ok: ${passos} passos; venceu com +${vencedor.premio.moedas.total} moedas; ranking ${ranking.join(' > ')}`);
  } catch (e) {
    erros.push(e.stack || String(e));
  }
  await navegador.close();
  if (servidor) { salas.fechar(); servidor.wss.clients.forEach(c => c.terminate()); servidor.close(); }
  if (erros.length) { console.error('ERROS:\n' + erros.join('\n')); process.exit(1); }
  console.log('Tudo certo: nenhum erro.');
  process.exit(0);
})();
