// Testes dirigidos das regras das cartas: monta uma situação, joga pela interface e confere o resultado.
// Uso: npm i -D playwright && node tools/regras.js
const { chromium } = require('playwright');
const path = require('path');
const RAIZ = path.join(__dirname, '..');

(async () => {
  const navegador = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const pg = await navegador.newPage({ viewport: { width: 1360, height: 900 } });
  const erros = [];
  pg.on('pageerror', e => erros.push('erro na página: ' + e.message));
  await pg.goto('file://' + path.join(RAIZ, 'index.html'));
  await pg.waitForTimeout(300);
  // partida a dois (ninguém joga sozinho no meio do teste), sem animação
  await pg.evaluate(() => {
    const st = DiceDuel.st; st.pref.liberar = true; st.pref.animacoes = false; st.deckVisto = true; st.cfg.modo = 'local';
    st.conta.cartas = ['ajuste', 'virar', 'rerrolar', 'pressa', 'coringa', 'sobrecarga', 'espelho', 'fundo', 'ancora', 'interferencia', 'pedagio'];
    document.getElementById('janelaDeck').hidden = true;
  });
  const cena = async (decks, montar) => {
    await pg.evaluate(d => { DiceDuel.st.decks = d; }, decks);
    await pg.click('#btnDeck'); await pg.click('#btnJogarDeck'); await pg.waitForTimeout(80);
    await pg.evaluate(montar);
    await pg.keyboard.press('Escape');   // Esc redesenha a tela
    await pg.waitForTimeout(50);
  };
  const usar = async (c) => { await pg.click(`.jogador.da-vez [data-carta="${c}"]`); await pg.click(`#cartaBotoes [data-usar="${c}"]`); };
  const dado = async i => pg.click(`.pega[data-i="${i}"]`);
  // pega o dado e, se o jogo perguntar para onde vai, põe na corrente
  const pegar = async i => { await dado(i); if (await pg.$('[data-destino="corrente"]')) await pg.click('[data-destino="corrente"]'); };
  const J = () => pg.evaluate(() => JSON.parse(JSON.stringify(DiceDuel.jogo, (k, v) => k === 'voo' ? undefined : v)));
  const confere = (ok, txt) => { if (!ok) erros.push(txt); console.log((ok ? 'ok   ' : 'FALHA ') + txt); };

  // 1. Pressa: o primeiro dado completa 6, a corrente dispara sozinha e o segundo dado ainda vem
  await cena([['pressa'], []], () => {
    const j = DiceDuel.jogo; j.vez = 0; j.fase = 'pegar'; j.cor[0] = [1, 2, 3, 4, 5]; j.mesa = [{ id: 9001, v: 5 }, { id: 9002, v: 2 }, { id: 9003, v: 3 }];
  });
  await usar('pressa'); await pegar(0);
  let j = await J();
  confere(j.pts[0] === 6 && j.cor[0].length === 0, 'Pressa: o 6.º dado dispara a corrente (+6)');
  confere(j.vez === 0 && j.fase === 'pegar' && j.segundoDado, 'Pressa: depois do disparo automático, o segundo dado continua valendo');
  await pegar(0); j = await J();
  confere(j.cor[0].length === 1 && j.vez === 1 && !j.segundoDado, 'Pressa: o segundo dado começa uma corrente nova e a vez passa');
  confere(!(await pg.textContent('#acoes')).includes('segundo dado'), 'Pressa: o rival não vê o aviso do segundo dado');

  // 2. Pressa: o segundo dado é opcional
  await cena([['pressa'], []], () => {
    const j = DiceDuel.jogo; j.vez = 0; j.fase = 'pegar'; j.cor[0] = [3, 3]; j.bolso[0] = 6; j.mesa = [{ id: 9101, v: 3 }, { id: 9102, v: 1 }];
  });
  await usar('pressa'); await pegar(0);
  await pg.click('[data-acao="dispensar"]'); j = await J();
  confere(j.fase === 'decidir' && j.vez === 0 && j.cor[0].length === 3 && j.mesa.length === 1, 'Pressa: dispensar o segundo dado leva à decisão sem romper');
  // e com 1 dado na Mesa ela não pode ser usada
  await cena([['pressa'], []], () => { const j = DiceDuel.jogo; j.vez = 0; j.fase = 'pegar'; j.mesa = [{ id: 9201, v: 3 }]; });
  await pg.click('.jogador.da-vez [data-carta="pressa"]');
  confere(await pg.$('#cartaBotoes [data-usar="pressa"][disabled]') !== null && (await pg.textContent('#cartaNota')).includes('Mesa seguinte'), 'Pressa: com 1 dado na Mesa fica bloqueada e diz por quê');
  await pg.click('#cartaBotoes [data-fechar-carta]');

  // 3. Coringa não é gasto no primeiro dado de uma corrente vazia
  await cena([['coringa'], []], () => { const j = DiceDuel.jogo; j.vez = 0; j.fase = 'pegar'; j.cor[0] = []; j.bolso[0] = 1; j.mesa = [{ id: 9301, v: 4 }, { id: 9302, v: 1 }]; });
  await usar('coringa'); await pegar(0); j = await J();
  confere(j.coringa[0] === true && j.cor[0].join() === '4', 'Coringa: continua ativo depois do primeiro dado da corrente');

  // 4. Espelho: as dicas e o aviso usam o valor virado
  await cena([[], ['espelho']], () => {
    const j = DiceDuel.jogo; j.vez = 0; j.fase = 'pegar'; j.cor[0] = [3, 3, 3]; j.bolso[0] = 6;
    j.mesa = [{ id: 9401, v: 2 }, { id: 9402, v: 3 }]; j.marca = { dono: 1, id: 9401 }; j.cartas[1].espelho = 'armada'; j.armada[1] = 'espelho';
  });
  const etiqueta = await pg.textContent('.pega[data-i="0"] .tags');
  confere(etiqueta.includes('vira 5') && etiqueta.includes('Rompe'), `Espelho: o 2 marcado (sincronizaria) mostra "vira 5" e "Rompe" (mostrou "${etiqueta.trim()}")`);
  await dado(0); j = await J();
  confere(j.confirma === 9401 && j.mesa.length === 2, 'Espelho: pegar o dado marcado que rompe pede confirmação');

  // 5. Blefe: o efeito virado aparece como "?" para o rival e funciona normalmente depois
  await cena([['ajuste', 'interferencia'], []], () => { const j = DiceDuel.jogo; j.vez = 0; j.fase = 'pegar'; j.mesa = [{ id: 9501, v: 3 }, { id: 9502, v: 4 }]; });
  await pg.click('.jogador.da-vez [data-carta="ajuste"]'); await pg.click('#cartaBotoes [data-virar="ajuste"]');
  j = await J();
  confere(j.armada[0] === 'ajuste' && j.cartas[0].ajuste === 'armada', 'Blefe: o Ajuste fica virado e ocupa o lugar da armadilha');
  confere(await pg.$('#pj0 .carta.oculta') !== null && (await pg.textContent('#pj0 [data-carta="ajuste"]')).indexOf('virada') < 0, 'Blefe: a dois, a tela mostra só o "?" sem dizer qual carta é');
  await pg.click('.jogador.da-vez [data-carta="interferencia"]');
  confere(await pg.$('#cartaBotoes [data-usar="interferencia"][disabled]') !== null, 'Blefe: com o blefe virado não dá para armar outra armadilha');
  await pg.click('#cartaBotoes [data-fechar-carta]');
  await pg.click('.jogador.da-vez [data-carta="ajuste"]'); await pg.click('#cartaBotoes [data-usar="ajuste"]'); await dado(0); await pg.click('[data-ajuste="1"]');
  j = await J();
  confere(j.cartas[0].ajuste === 'usada' && j.armada[0] === null && j.mesa[0].v === 4, 'Blefe: usar a carta virada faz o efeito e libera o lugar');
  // sem armadilha escondida no deck, não dá para blefar
  await cena([['ajuste', 'espelho'], []], () => { const j = DiceDuel.jogo; j.vez = 0; j.fase = 'pegar'; });
  await pg.click('.jogador.da-vez [data-carta="ajuste"]');
  confere(await pg.$('#cartaBotoes [data-virar]') === null, 'Blefe: só com uma armadilha (sem ser o Espelho) ainda escondida');
  await pg.click('#cartaBotoes [data-fechar-carta]');

  // 6. Âncora e Interferência são independentes
  await cena([['interferencia'], ['ancora']], () => {
    const j = DiceDuel.jogo; j.vez = 1; j.fase = 'pegar'; j.cor[1] = [2, 2, 2, 2]; j.bolso[1] = 6;
    j.cartas[0].interferencia = 'armada'; j.armada[0] = 'interferencia'; j.cartas[1].ancora = 'armada'; j.armada[1] = 'ancora';
    j.mesa = [{ id: 9601, v: 6 }, { id: 9602, v: 6 }];
  });
  await pegar(0); j = await J();
  confere(j.cor[1].length === 4 && j.cartas[1].ancora === 'usada' && j.armada[0] === 'interferencia', 'Âncora segura a corrente e a Interferência do rival continua armada');

  await navegador.close();
  console.log(erros.length ? 'ERROS:\n' + erros.join('\n') : 'Tudo certo: as regras das cartas se comportam como o texto diz.');
  process.exit(erros.length ? 1 : 0);
})();
