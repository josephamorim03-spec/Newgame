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
    st.conta.cartas = Regras.ORDEM.slice();
    document.getElementById('janelaDeck').hidden = true;
  });
  const cena = async (decks, montar) => {
    await pg.evaluate(d => { DiceDuel.st.decks = d; }, decks);
    await pg.evaluate(() => document.getElementById('btnDeck').click());
    // com uma partida em andamento, o botão só salva o deck; recomeçar é o link de baixo
    if (await pg.$('#deckEmAndamento:not([hidden]) #btnRecomecar:not([hidden])')) await pg.click('#btnRecomecar'); else await pg.click('#btnJogarDeck');
    await pg.waitForTimeout(80);
    await pg.evaluate(montar);
    await pg.keyboard.press('Escape');   // Esc redesenha a tela
    await pg.waitForTimeout(50);
  };
  // tocar na carta: a que pede um dado já espera o dado; as outras mostram Usar/Armar
  const usar = async (c) => { await pg.click(`.jogador.da-vez [data-carta="${c}"]`); if (await pg.$(`#acoes [data-usar="${c}"]`)) await pg.click(`#acoes [data-usar="${c}"]`); };
  const dado = async i => pg.click(`.pega[data-i="${i}"]`);
  // pega o dado e, se o jogo perguntar para onde vai, põe na corrente
  // pega o dado e põe na corrente: tocar no dado e na corrente (se o jogo perguntar, por romper, confirma)
  const pegar = async i => { await dado(i); if (await pg.$('[data-alvo-dado="corrente"]')) { await pg.click('[data-alvo-dado="corrente"]'); if (await pg.$('[data-confirma="corrente"]')) await pg.click('[data-confirma="corrente"]'); } };
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
    const j = DiceDuel.jogo; j.vez = 0; j.fase = 'pegar'; j.cor[0] = [3, 3]; j.bolso[0] = 6; j.mesa = [{ id: 9101, v: 3 }, { id: 9102, v: 1 }, { id: 9103, v: 1 }];
  });
  await usar('pressa'); await pegar(0);
  await pg.click('[data-acao="dispensar"]'); j = await J();
  confere(j.fase === 'decidir' && j.vez === 0 && j.cor[0].length === 3 && j.mesa.length === 2, 'Pressa: dispensar o segundo dado leva à decisão sem romper');
  // e com 1 dado na Mesa ela não pode ser usada
  await cena([['pressa'], []], () => { const j = DiceDuel.jogo; j.vez = 0; j.fase = 'pegar'; j.mesa = [{ id: 9201, v: 3 }]; });
  await pg.click('.jogador.da-vez [data-carta="pressa"]');
  confere(await pg.$('#acoes [data-usar="pressa"][disabled]') !== null && (await pg.textContent('#acoes')).includes('último dado'), 'Pressa: com 1 dado na Mesa fica bloqueada e diz por quê');
  await pg.click('[data-acao="fechar-carta"]');

  // 3. Coringa não é gasto no primeiro dado de uma corrente vazia
  await cena([['coringa'], []], () => { const j = DiceDuel.jogo; j.vez = 0; j.fase = 'pegar'; j.cor[0] = []; j.bolso[0] = 1; j.mesa = [{ id: 9301, v: 4 }, { id: 9302, v: 1 }]; });
  await usar('coringa'); await pegar(0); j = await J();
  confere(j.coringa[0] === true && j.cor[0].join() === '4', 'Coringa: continua ativo depois do primeiro dado da corrente');
  // 3b. Coringa (v0.12): o dado que romperia troca a frente, e a corrente não cresce (não completa o 6.º dado de graça)
  await cena([['coringa'], []], () => { const j = DiceDuel.jogo; j.vez = 0; j.fase = 'pegar'; j.cor[0] = [1, 2, 3, 4, 5]; j.bolso[0] = 3; j.mesa = [{ id: 9311, v: 1 }, { id: 9312, v: 1 }]; });
  await usar('coringa'); await pegar(0); j = await J();
  confere(j.coringa[0] === false && j.cor[0].join() === '1,2,3,4,1' && j.pts[0] === 0, `Coringa: o dado que romperia troca a frente e a corrente fica com 5 (${j.cor[0].join()})`);
  // 3c. ... e um dado que já sincroniza entra normal, como mais um elo (o Coringa é gasto nele)
  await cena([['coringa'], []], () => { const j = DiceDuel.jogo; j.vez = 0; j.fase = 'pegar'; j.cor[0] = [2, 3]; j.bolso[0] = 6; j.mesa = [{ id: 9321, v: 4 }, { id: 9322, v: 1 }]; });
  await usar('coringa'); await pegar(0); j = await J();
  confere(j.coringa[0] === false && j.cor[0].join() === '2,3,4', `Coringa: um dado que já sincroniza entra como mais um elo (${j.cor[0].join()})`);

  // 4. Espelho: as dicas e o aviso usam o valor virado
  await cena([[], ['espelho']], () => {
    const j = DiceDuel.jogo; j.vez = 0; j.fase = 'pegar'; j.cor[0] = [3, 3, 3]; j.bolso[0] = 6;
    j.mesa = [{ id: 9401, v: 2 }, { id: 9402, v: 3 }]; j.marca = { dono: 1, id: 9401 }; j.cartas[1].espelho = 'armada'; j.armada[1] = 'espelho';
  });
  const etiqueta = await pg.textContent('.pega[data-i="0"] .tags');
  confere(etiqueta.includes('vira 5') && etiqueta.includes('Rompe'), `Espelho: o 2 marcado (sincronizaria) mostra "vira 5" e "Rompe" (mostrou "${etiqueta.trim()}")`);
  await dado(0); j = await J();
  confere(j.sel === 9401 && j.mesa.length === 2 && (await pg.textContent('.corrente[data-alvo-dado]')).includes('rompe') && (await pg.textContent('#ticker')).includes('Espelho'), 'Espelho: o dado marcado que rompe só é escolhido; a corrente avisa "rompe" e a linha da Mesa explica o Espelho');
  await dado(0); j = await J();
  confere(j.mesa.length === 2 && j.cor[0].length === 3 && (await pg.textContent('#acoes')).includes('vai romper'), 'Espelho: tocar de novo num dado que rompe não pega: pergunta antes');
  await pg.click('#acoes [data-acao="cancelar"]');

  // 4b. Escolher não é pegar: trocar de dado, cancelar, tocar de novo pega
  await cena([[], []], () => { const j = DiceDuel.jogo; j.vez = 0; j.fase = 'pegar'; j.cor[0] = [3]; j.bolso[0] = null; j.mesa = [{ id: 9451, v: 4 }, { id: 9452, v: 1 }, { id: 9453, v: 2 }]; });
  await dado(0); await dado(1); j = await J();
  confere(j.sel === 9452 && j.mesa.length === 3 && j.cor[0].length === 1, 'Escolha: tocar em outro dado troca a escolha e nada sai da Mesa');
  await pg.click('.mesa-area', { position: { x: 6, y: 20 } }); j = await J();
  confere(j.sel === null && j.mesa.length === 3 && j.vez === 0, 'Escolha: tocar num espaço vazio da Mesa desfaz sem gastar a vez');
  await dado(2); await pg.click('[data-alvo-dado="bolso"]'); j = await J();
  confere(j.bolso[0] === 2 && j.mesa.length === 2 && j.cor[0].join() === '3', 'Escolha: tocar no Bolso pega e guarda');
  await cena([[], []], () => { const j = DiceDuel.jogo; j.vez = 0; j.fase = 'pegar'; j.cor[0] = [3]; j.mesa = [{ id: 9461, v: 4 }, { id: 9462, v: 1 }]; });
  await dado(0); await dado(0); j = await J();
  confere(j.cor[0].join() === '3,4' && j.mesa.length === 1, 'Escolha: tocar duas vezes no mesmo dado põe na corrente');

  // 4c. Cartas com alvo: tocar na carta e depois no dado (ou cancelar, ou tocar de novo na carta, e ela volta)
  await cena([['virar'], []], () => { const j = DiceDuel.jogo; j.vez = 0; j.fase = 'pegar'; j.mesa = [{ id: 9471, v: 2 }, { id: 9472, v: 6 }]; });
  await usar('virar'); j = await J();
  confere(j.fase === 'alvo' && j.alvo === 'virar' && (await pg.textContent('#ticker')).includes('virar'), 'Virar: tocar na carta espera o dado e diz isso na linha da Mesa');
  await pg.click('[data-acao="cancelar-alvo"]'); j = await J();
  confere(j.cartas[0].virar === 'pronta' && j.fase === 'pegar', 'Virar: Cancelar devolve a carta para a mão');
  await usar('virar'); await pg.click('.jogador.da-vez [data-carta="virar"]'); j = await J();
  confere(j.cartas[0].virar === 'pronta' && j.fase === 'pegar', 'Virar: tocar de novo na carta também devolve');
  await usar('virar'); await dado(1); j = await J();
  confere(j.cartas[0].virar === 'usada' && j.mesa[1].v === 1 && j.fase === 'pegar', 'Virar: tocar no dado já vira');
  await cena([['ajuste'], []], () => { const j = DiceDuel.jogo; j.vez = 0; j.fase = 'pegar'; j.mesa = [{ id: 9481, v: 2 }, { id: 9482, v: 5 }]; });
  await usar('ajuste'); await dado(0); await dado(1); await pg.click('[data-ajuste="1"]'); j = await J();
  confere(j.mesa[0].v === 2 && j.mesa[1].v === 6, 'Ajuste: dá para trocar de dado antes do ±1');

  // 5. Blefe: o efeito virado aparece como "?" para o rival e funciona normalmente depois
  await cena([['ajuste', 'interferencia'], []], () => { const j = DiceDuel.jogo; j.vez = 0; j.fase = 'pegar'; j.mesa = [{ id: 9501, v: 3 }, { id: 9502, v: 4 }]; });
  await pg.click('.jogador.da-vez [data-carta="ajuste"]'); await pg.click('#acoes [data-virar="ajuste"]');
  j = await J();
  confere(j.armada[0] === 'ajuste' && j.cartas[0].ajuste === 'armada', 'Blefe: o Ajuste fica virado e ocupa o lugar da armadilha');
  confere(await pg.$('#pj0 .oculta') !== null && (await pg.textContent('#pj0 [data-carta="ajuste"]')).indexOf('virada') < 0, 'Blefe: a dois, a tela mostra só o "?" sem dizer qual carta é');
  await pg.click('.jogador.da-vez [data-carta="interferencia"]');
  confere(await pg.$('#acoes [data-usar="interferencia"][disabled]') !== null, 'Blefe: com o blefe virado não dá para armar outra armadilha');
  await pg.click('[data-acao="fechar-carta"]');
  // desvira a partir da vez seguinte (o rival precisa ter tido a chance de desafiar)
  await pg.evaluate(() => { const j = DiceDuel.jogo; Regras.proximo(j); Regras.proximo(j); j.mesa = [{ id: 9503, v: 3 }, { id: 9504, v: 4 }]; DiceDuel.ajustar({}); });
  await usar('ajuste'); await dado(0); await pg.click('[data-ajuste="1"]');
  j = await J();
  confere(j.cartas[0].ajuste === 'usada' && j.armada[0] === null && j.mesa[0].v === 4, 'Blefe: usar a carta virada faz o efeito e libera o lugar');
  // sem armadilha escondida no deck, não dá para blefar
  await cena([['ajuste', 'espelho'], []], () => { const j = DiceDuel.jogo; j.vez = 0; j.fase = 'pegar'; });
  await pg.click('.jogador.da-vez [data-carta="ajuste"]');
  confere(await pg.$('#acoes [data-virar]') === null, 'Blefe: só com uma armadilha (sem ser o Espelho) ainda escondida');
  await pg.click('[data-acao="cancelar-alvo"]');

  // 6. Âncora e Interferência são independentes
  await cena([['interferencia'], ['ancora']], () => {
    const j = DiceDuel.jogo; j.vez = 1; j.fase = 'pegar'; j.cor[1] = [2, 2, 2, 2]; j.bolso[1] = 6;
    j.cartas[0].interferencia = 'armada'; j.armada[0] = 'interferencia'; j.cartas[1].ancora = 'armada'; j.armada[1] = 'ancora';
    j.mesa = [{ id: 9601, v: 6 }, { id: 9602, v: 6 }];
  });
  await pegar(0); j = await J();
  confere(j.cor[1].length === 4 && j.cartas[1].ancora === 'usada' && j.armada[0] === 'interferencia', 'Âncora segura a corrente e a Interferência do rival continua armada');

  // 7. Mexer no deck no meio da partida não a abandona; recomeçar contra o rival conta como derrota
  await pg.evaluate(() => { DiceDuel.st.cfg.modo = 'bot'; });
  await cena([['ajuste'], []], () => {});
  await pegar(0); await pg.waitForTimeout(50);
  const antes = await J();
  await pg.evaluate(() => document.getElementById('btnDeck').click());
  confere((await pg.textContent('#btnJogarDeck')).includes('Salvar'), 'Deck: no meio da partida o botão vira "Salvar deck"');
  await pg.click('#btnJogarDeck'); let depois = await J();
  confere(depois.compras >= antes.compras && depois.fase !== 'fim' && depois.compras > 0, 'Deck: salvar no meio da partida não a abandona');
  const rec = await pg.evaluate(() => DiceDuel.st.rec.partidas);
  await pg.evaluate(() => document.getElementById('btnDeck').click()); await pg.click('#btnRecomecar'); await pg.waitForTimeout(100); depois = await J();
  confere(depois.fase === 'fim' && depois.vencedor === 1 && (await pg.evaluate(() => DiceDuel.st.rec.partidas)) === rec + 1 && depois.premio && depois.premio.xpGanho === 0, 'Deck: recomeçar contra o rival conta como derrota, sem experiência');
  // 8. Rolagem 3D: os cubos caem, somem sozinhos e a face é a da regra; Rerrolar no meio da rolagem também
  await pg.waitForTimeout(900);   // a tela de fim da cena anterior abre sozinha; fecha antes
  await pg.evaluate(() => { ['fim', 'janelaDeck', 'janelaCarta'].forEach(id => { document.getElementById(id).hidden = true; }); DiceDuel.st.cfg.modo = 'local'; DiceDuel.ajustar({ animacoes: true }); });
  await cena([['rerrolar'], []], () => {});
  await pg.evaluate(() => { document.querySelectorAll('.versus').forEach(v => v.click()); });
  await pg.waitForTimeout(150);
  const rolando = await pg.evaluate(() => ({ cubos: document.querySelectorAll('.cubo-rolagem').length, mesa: DiceDuel.jogo.mesa.length, valores: DiceDuel.jogo.mesa.map(d => d.v).join() }));
  confere(rolando.cubos === rolando.mesa && rolando.mesa === 5, `Rolagem: um cubo por dado da Mesa (${rolando.cubos})`);
  await pg.evaluate(() => { const j = DiceDuel.jogo; j.vez = 0; j.fase = 'pegar'; });
  await pg.keyboard.press('Escape');
  await usar('rerrolar');
  await pg.waitForTimeout(100);
  const novos = await pg.evaluate(() => ({ cubos: document.querySelectorAll('.cubo-rolagem').length, valores: DiceDuel.jogo.mesa.map(d => d.v).join() }));
  confere(novos.cubos === 5, 'Rolagem: Rerrolar no meio da rolagem relança os mesmos 5 cubos, sem sobrar cubo velho');
  await pg.waitForTimeout(2600);
  const fim = await pg.evaluate(() => ({ cubos: document.querySelectorAll('.cubo-rolagem').length, escondidos: document.querySelectorAll('.pega.rolando').length, valores: DiceDuel.jogo.mesa.map(d => d.v).join() }));
  confere(fim.cubos === 0 && fim.escondidos === 0, 'Rolagem: no fim não sobra cubo nem dado escondido');
  confere(fim.valores === novos.valores, 'Rolagem: a animação não muda nenhum valor (a regra decide)');
  // 10. Cartas da v0.11, jogadas pela tela (a dois no mesmo aparelho)
  await cena([['pausa', 'reverso', 'furto'], ['lacre', 'ajuste']], () => {
    const j = DiceDuel.jogo; j.vez = 0; j.fase = 'pegar'; j.cor[0] = [6, 5, 3]; j.bolso = [null, 4]; j.mesa = [{ id: 9101, v: 6 }, { id: 9102, v: 1 }, { id: 9103, v: 2 }];
  });
  await usar('reverso');
  let k = await J();
  confere(k.cor[0].join() === '3,5,6' && k.vez === 0, `Reverso: a corrente virou ${k.cor[0].join()} e a vez continua`);
  await usar('furto');
  k = await J();
  confere(k.bolso[0] === 4 && k.bolso[1] === null, `Furto: o 4 do Bolso do rival veio para o meu (${k.bolso.join()})`);
  await usar('pausa');
  k = await J();
  confere(k.vez === 1 && k.mesa.length === 3 && k.cor[0].join() === '3,5,6', 'Pausa: a vez passou, a Mesa e a corrente ficaram como estavam');
  // o jogador 2 arma o Lacre; o jogador 1 usa um efeito e ele não age
  await cena([['ajuste'], ['lacre']], () => {
    const j = DiceDuel.jogo; j.vez = 1; j.fase = 'pegar'; j.mesa = [{ id: 9201, v: 2 }, { id: 9202, v: 3 }];
  });
  await usar('lacre');
  await pg.evaluate(() => { const j = DiceDuel.jogo; j.vez = 0; j.fase = 'pegar'; });
  await pg.keyboard.press('Escape');
  await usar('ajuste'); await dado(0);
  if (await pg.$('[data-ajuste="1"]')) await pg.click('[data-ajuste="1"]');
  await pg.waitForTimeout(100);
  k = await J();
  confere(k.mesa[0].v === 2 && k.cartas[0].ajuste === 'usada' && k.cartas[1].lacre === 'usada', `Lacre: o Ajuste foi gasto sem mudar o dado (${k.mesa[0].v})`);
  // a Dona Coruja usa a Pausa quando qualquer dado romperia a corrente dela, e a vez volta para quem joga
  await pg.evaluate(() => { DiceDuel.st.cfg.modo = 'bot'; DiceDuel.st.cfg.nivel = 'esperto'; });
  await cena([[], ['pausa']], () => {
    document.querySelectorAll('.versus').forEach(v => v.remove());
    const j = DiceDuel.jogo; j.decks[1] = ['pausa']; j.cartas[1] = { pausa: 'pronta' }; j.intro = false;
    j.vez = 1; j.fase = 'pegar'; j.cor[1] = [1, 3]; j.bolso[1] = 6; j.mesa = [{ id: 9301, v: 5 }, { id: 9302, v: 5 }];
    j.pensando = false; j.token = Math.random();
  });
  await pg.evaluate(() => { DiceDuel.ajustar({}); DiceDuel.automato(); });
  await pg.waitForFunction(() => DiceDuel.jogo.vez === 0, null, { timeout: 15000 }).catch(() => {});
  k = await J();
  confere(k.vez === 0 && k.cartas[1].pausa === 'usada' && k.cor[1].join() === '1,3', `Coruja: usou a Pausa (${k.cartas[1].pausa}) e a vez voltou (vez ${k.vez})`);
  await pg.evaluate(() => { DiceDuel.st.cfg.modo = 'local'; DiceDuel.st.cfg.nivel = 'aprendiz'; });

  // 10b. Desafio do blefe, pela tela (a dois): tocar na carta virada, desafiar; blefe -> +2 e a carta se perde;
  //      armadilha -> à vista e +2 para o dono; o blefe que ninguém desafiou rende +3 e não desvira na mesma vez
  const comVirada = async (virada) => {
    await cena([['coringa', 'pressa'], ['ajuste', 'fundo', 'pausa']], () => {});
    await pg.evaluate(v => {
      const j = DiceDuel.jogo; j.vez = 1; j.fase = 'pegar'; j.pts = [0, 0];
      if (Regras.CARTAS[v].tipo === 'efeito') Regras.virarCarta(j, 1, v); else Regras.usarCarta(j, 1, v);
      Regras.proximo(j); j.mesa = [{ id: 9601, v: 3 }, { id: 9602, v: 4 }]; DiceDuel.ajustar({});
    }, virada);
  };
  await comVirada('ajuste');
  confere(await pg.$('[data-virada="1"].desafiavel') !== null, 'Desafio: a carta virada do rival é tocável e marcada na sua vez');
  await pg.click('[data-virada="1"]');
  confere((await pg.textContent('#cartaDetalhe')).includes('Desafiar') && await pg.$('#cartaBotoes [data-desafiar]') !== null, 'Desafio: a janela explica o que está em jogo e oferece Desafiar');
  await pg.click('#cartaBotoes [data-desafiar]'); await pg.waitForTimeout(80);
  j = await J();
  confere(j.pts[0] === 2 && j.cartas[1].ajuste === 'perdida' && j.armada[1] === null && j.vez === 0 && j.fase === 'pegar', `Desafio: era blefe, +2 e a carta dele se perdeu; a vez continua (${j.pts})`);
  confere(await pg.$('[data-virada]') === null, 'Desafio: a carta virada some do painel');
  await comVirada('fundo');
  await pg.click('[data-virada="1"]'); await pg.click('#cartaBotoes [data-desafiar]'); await pg.waitForTimeout(80);
  j = await J();
  confere(j.pts[1] === 2 && j.armada[1] === 'fundo' && j.revelada[1], `Desafio: era armadilha, +2 para o dono e ela fica armada (${j.pts})`);
  confere((await pg.textContent('#pj1')).includes('Fundo Falso armada'), 'Desafio: a armadilha desafiada aparece à vista no painel');
  // o blefe que passa
  await cena([['coringa', 'fundo'], ['pressa']], () => { const j = DiceDuel.jogo; j.vez = 0; j.fase = 'pegar'; j.pts = [0, 0]; j.mesa = [{ id: 9701, v: 3 }, { id: 9702, v: 4 }]; });
  await pg.click('.jogador.da-vez [data-carta="coringa"]');
  confere(await pg.$('#acoes [data-virar="coringa"]') !== null && (await pg.textContent('#acoes')).includes('+3'), 'Blefe: a carta escolhida oferece Blefar e diz o que rende');
  await pg.click('#acoes [data-virar="coringa"]'); await pg.waitForTimeout(60);
  await pg.click('.jogador.da-vez [data-carta="coringa"]');
  confere(await pg.$('#acoes [data-usar="coringa"][disabled]') !== null, 'Blefe: não desvira na mesma vez em que virou');
  await pg.click('[data-acao="fechar-carta"]');
  await pg.evaluate(() => { const j = DiceDuel.jogo; Regras.proximo(j); Regras.proximo(j); j.mesa = [{ id: 9801, v: 3 }, { id: 9802, v: 4 }]; DiceDuel.ajustar({}); });
  await usar('coringa'); await pg.waitForTimeout(60);
  j = await J();
  confere(j.pts[0] === 3 && j.coringa[0] && j.armada[0] === null, `Blefe que passa: desvirado, funciona e rende +3 (${j.pts[0]})`);

  // 11. Ajudas: a chave do menu de pausa liga e desliga etiquetas, dicas e explicações (e lembra a escolha);
  //     durante a partida o cabeçalho some e o menu é o único caminho para fora da jogada
  await cena([['ajuste'], []], () => {
    const j = DiceDuel.jogo; j.vez = 0; j.fase = 'pegar'; j.cor[0] = [2]; j.mesa = [{ id: 9601, v: 3 }, { id: 9602, v: 6 }];
  });
  const vista = () => pg.evaluate(() => ({ tags: document.querySelectorAll('#mesa .tag').length, info: document.querySelectorAll('.jogador .info').length,
    prox: document.querySelectorAll('.prox-faces').length, barra: !document.getElementById('acoes').hidden, pref: DiceDuel.st.pref.dicas,
    foco: document.body.classList.contains('em-partida') }));
  const com = await vista();
  await dado(0);
  const alvosAoEscolher = await pg.evaluate(() => document.getElementById('acoes').hidden && !!document.querySelector('[data-alvo-dado="corrente"]') && !!document.querySelector('[data-alvo-dado="bolso"]'));
  await pg.keyboard.press('Escape');
  confere(alvosAoEscolher && await pg.evaluate(() => !document.querySelector('[data-alvo-dado]')), 'Dado escolhido: sem barra de botões; a corrente e o Bolso viram alvos, e Esc desfaz');
  const topoVisivel = await pg.evaluate(() => getComputedStyle(document.querySelector('.topo')).display !== 'none');
  await pg.click('#btnPausa');
  const menuAberto = await pg.evaluate(() => !document.getElementById('janelaMenu').hidden);
  await pg.click('#opDicasMenu');
  await pg.click('[data-menu="continuar"]');
  const sem = await vista();
  confere(com.tags > 0 && com.info > 0 && com.prox > 0 && !com.barra, 'Ajudas ligadas: etiquetas, linha da corrente e faces da próxima casa; sem decisão, nada de barra');
  confere(sem.tags === 0 && sem.info === 0 && sem.prox === 0 && !sem.barra && sem.pref === false, 'Ajudas desligadas pelo menu: só os dados, as correntes e as cartas');
  confere(com.foco && !topoVisivel && menuAberto, 'Partida em foco: sem cabeçalho; o botão de pausa abre o menu');
  await pg.click('#btnPausa'); await pg.click('#opDicasMenu'); await pg.click('[data-menu="continuar"]');
  confere((await vista()).pref === true, 'Ajudas: a mesma chave liga de novo');
  // pelo menu: Ajustes abre, e Desistir pede um segundo toque contra o rival do jogo
  await pg.click('#btnPausa'); await pg.click('[data-menu="ajustes"]');
  confere(await pg.evaluate(() => !document.getElementById('janelaConfig').hidden && document.getElementById('janelaMenu').hidden), 'Menu de pausa: Ajustes abre no lugar do menu');
  await pg.click('#btnFecharConfig');
  await pg.evaluate(() => { DiceDuel.jogo.compras = 3; });
  await pg.click('#btnPausa');
  const sairTxt = await pg.textContent('#menuSairTxt');
  await pg.click('[data-menu="sair"]');
  confere(sairTxt === 'Recomeçar' && (await pg.evaluate(() => DiceDuel.jogo.compras)) === 0, `Menu de pausa: a dois, "${sairTxt}" começa outra partida`);

  // 9. Toda skin rola com a própria cara: seis faces da skin, miolo da cor dela, canto igual ao do dado parado, nada sobra
  await pg.evaluate(() => { DiceDuel.st.cfg.modo = 'bot'; DiceDuel.st.conta.dados = ['marfim', 'madeira', 'rosa', 'menta', 'pelucia', 'dourado', 'diamante']; });
  await cena([[], []], () => {});
  for (const skin of ['marfim', 'madeira', 'rosa', 'menta', 'pelucia', 'dourado', 'diamante']) {
    const r = await pg.evaluate(skin => {
      document.querySelectorAll('.versus').forEach(v => v.remove());
      const j = DiceDuel.jogo; DiceDuel.st.conta.dado = skin; j.vez = 0; j.fase = 'pegar'; j.intro = false; j.token = Math.random();
      Rolagem.parar(); j.mesa.forEach(d => { d.novo = true; }); j.eventos.push({ tipo: 'rolar' }); DiceDuel.ajustar({});
      const cubo = document.querySelector('.cubo-rolagem'), face = cubo && cubo.querySelector('.face-rolagem .dado');
      const parado = document.querySelector('.pega .face > .dado');
      return { cubos: document.querySelectorAll('.cubo-rolagem').length, faces: document.querySelectorAll(`.cubo-rolagem .dado.skin-${skin}`).length,
        miolo: cubo && getComputedStyle(cubo.querySelector('.miolo-rolagem')).backgroundColor, canto: face && getComputedStyle(face).borderTopLeftRadius,
        cantoParado: parado && getComputedStyle(parado).borderTopLeftRadius, mesa: j.mesa.length };
    }, skin);
    confere(r.cubos === r.mesa && r.faces === r.mesa * 6, `Skin ${skin}: ${r.cubos} cubos com as 6 faces na skin (${r.faces})`);
    confere(r.canto === r.cantoParado, `Skin ${skin}: o cubo tem o mesmo canto do dado parado (${r.canto} × ${r.cantoParado})`);
    if (skin !== 'marfim') confere(r.miolo !== 'rgb(236, 223, 200)', `Skin ${skin}: miolo na cor da skin (${r.miolo})`);
  }
  await pg.waitForTimeout(2600);
  const sobra = await pg.evaluate(() => ({ cubos: document.querySelectorAll('.cubo-rolagem').length, escondidos: document.querySelectorAll('.pega.rolando').length }));
  confere(sobra.cubos === 0 && sobra.escondidos === 0, 'Skins: depois de todas as rolagens, nada sobra nem fica escondido');
  await pg.evaluate(() => DiceDuel.ajustar({ animacoes: false }));
  // 12. Ajudas ligadas por padrão: aparelho que as tinha desligado antes da v0.11 volta com elas; desligar de novo fica
  const pa = await navegador.newPage();
  await pa.goto('file://' + path.join(RAIZ, 'index.html')); await pa.waitForTimeout(250);
  const padrao = await pa.evaluate(() => DiceDuel.st.pref.dicas);
  await pa.evaluate(() => { const s = JSON.parse(localStorage.getItem('diceduel.v1') || '{}'); s.pref = { ...(s.pref || {}), dicas: false }; delete s.pref.ajudasV11; localStorage.setItem('diceduel.v1', JSON.stringify(s)); });
  await pa.reload(); await pa.waitForTimeout(250);
  const migrou = await pa.evaluate(() => DiceDuel.st.pref.dicas);
  await pa.evaluate(() => { DiceDuel.st.pref.dicas = false; DiceDuel.salvar(); }); await pa.reload(); await pa.waitForTimeout(250);
  const ficou = await pa.evaluate(() => DiceDuel.st.pref.dicas);
  confere(padrao && migrou && !ficou, 'Ajudas: ligadas por padrão, religadas uma vez na v0.11, e a escolha de desligar fica');
  await pa.close();
  await navegador.close();
  console.log(erros.length ? 'ERROS:\n' + erros.join('\n') : 'Tudo certo: as regras das cartas se comportam como o texto diz.');
  process.exit(erros.length ? 1 : 0);
})();
