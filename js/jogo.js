/* Dice Duel · o jogo
 * Regras (v0.8): Mesa compartilhada de 5 dados, corrente que só cresce pela frente,
 * sincronias Eco (=), Passo (±1) e Oposto (soma 7), Bolso de um dado, quem está atrás abre a Mesa,
 * deck de até 3 cartas (no máx. 2 armadilhas e 1 carta de pontos ⚡), blefe com efeito virado. Números medidos em simulação (sim/).
 * A lógica nunca espera animação: ela só enfileira eventos, e o desenho, o som e os efeitos os consomem.
 */
(function () {
  'use strict';
  // ---------- regras: vêm do motor compartilhado (shared/regras.js), o mesmo que o servidor usa ----------
  const R = window.Regras;
  const { PONTOS, LIM, REL, ORDEM, deckValido, rels, sinc, frente, encaixa, facesQueEncaixam, opcoes, pontos,
    GRATIS, PRECO_CARTA, NIVEIS, PRESENTES, RATING_RIVAL, TETO_MOEDAS, BASE_MOEDAS, tituloDe, nivelDe, moedasDaVitoria } = R;
  const svg = d => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const ICO_CARTA = {
    ajuste: svg('<path d="M12 4v7M8.5 7.5h7M8.5 17h7"/><rect x="3" y="3" width="18" height="18" rx="4"/>'),
    virar: svg('<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4"/>'),
    rerrolar: svg('<path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4"/><circle cx="12" cy="12" r="1.5"/>'),
    pressa: svg('<path d="M5 6l6 6-6 6M13 6l6 6-6 6"/>'),
    coringa: svg('<path d="M6.5 18c0-3.5-1-6-4-5.5.5-4.5 4.5-6.5 8-3.5.2-2.5.7-4.5 1.5-6 .8 1.5 1.3 3.5 1.5 6 3.5-3 7.5-1 8 3.5-3-.5-4 2-4 5.5z"/><path d="M5.5 20.5h13"/><circle cx="2.5" cy="14.6" r="1.4"/><circle cx="21.5" cy="14.6" r="1.4"/><circle cx="12" cy="2.4" r="1.2"/>'),
    sobrecarga: svg('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
    espelho: svg('<ellipse cx="12" cy="9" rx="6" ry="7"/><path d="M12 16v5M8.5 21h7M9.5 6.5l4 4M10 11l2 2"/>'),
    fundo: svg('<path d="M4 4h16M4 4v9M20 4v9M4 13l3 7M20 13l-3 7M9 9h6"/>'),
    ancora: svg('<circle cx="12" cy="5" r="2"/><path d="M12 7v14M8 11h8M4.5 14.5c.5 3.8 3.8 6.5 7.5 6.5s7-2.7 7.5-6.5"/>'),
    interferencia: svg('<path d="M2 12h3l2-5 3 10 3-13 3 13 2-5h4"/>'),
    pedagio: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M14.5 9.5h-3.5a1.5 1.5 0 0 0 0 3h2a1.5 1.5 0 0 1 0 3H9.5"/>'),
  };
  // versão pintada (js/cartas_pintadas.js, feita por tools/arte_icones.py) onde o ícone aparece grande o bastante para ler
  // (deck, loja, detalhe, regras, versus); nos botões de 18 px da mesa e na marca do Espelho fica o traço. Sem pintura, traço em tudo.
  const pintada = id => (window.CARTAS_PINTADAS || {})[id];
  const imgPintada = (id, cls) => `<img class="${cls}" src="${pintada(id)}" alt="" aria-hidden="true" draggable="false">`;
  const RAIO = pintada('raio') ? imgPintada('raio', 'raio-pintado') : '⚡';
  const VERSO = pintada('verso') ? imgPintada('verso', 'verso-pintado') : '?';
  // os símbolos dos "Bons momentos" do fim da partida, pintados (js/momentos_pintados.js) quando existem
  const MOMENTO_ID = { '☾': 'virada', '★': 'sinfonia', '✿': 'harmonia', '✧': 'truque', '❀': 'salvou', '↺': 'esquiva', '✦': 'bloqueio', '♪': 'nota', '✪': 'recorde' };
  const srcMomento = c => (c === '☕' ? (window.RETRATOS_PINTADOS || {}).xicara : (window.MOMENTOS_PINTADOS || {})[MOMENTO_ID[c]]);
  const simboloMomento = c => (srcMomento(c) ? `<img src="${srcMomento(c)}" alt="${c}" draggable="false">` : c);
  const CARTAS = Object.fromEntries(Object.entries(R.CARTAS).map(([k, v]) => [k, { ...v, ico: ICO_CARTA[k], arte: pintada(k) ? imgPintada(k, 'ico pintado') : ICO_CARTA[k] }]));
  const PRONTOS = [
    { nome: 'Primeira mesa', cartas: ['ajuste', 'coringa', 'pressa'], nota: 'só efeitos' },
    { nome: 'Muralha', cartas: ['ancora', 'coringa', 'interferencia'], nota: '' },
    { nome: 'Corredor', cartas: ['ajuste', 'interferencia', 'pressa'], nota: '' },
    { nome: 'Vira-vira', cartas: ['ancora', 'coringa', 'virar'], nota: '' },
    // os dois abaixo aparecem quando as cartas deles forem compradas
    { nome: 'Arapuca', cartas: ['fundo', 'interferencia', 'pressa'], nota: '' },
    { nome: 'Cobrador', cartas: ['coringa', 'pedagio', 'pressa'], nota: '' },
  ];
  // os melhores decks da simulação (nenhum passa de 60%): a Dona Coruja sorteia entre eles
  const DECKS_CORUJA = [
    ['ancora', 'coringa', 'interferencia'], ['fundo', 'interferencia', 'pressa'], ['ajuste', 'fundo', 'interferencia'],
    ['ancora', 'coringa', 'rerrolar'], ['ajuste', 'ancora', 'coringa'], ['ajuste', 'ancora', 'virar'],
    ['coringa', 'pedagio', 'pressa'], ['ancora', 'coringa', 'fundo'], ['coringa', 'fundo', 'interferencia'],
  ];
  // a parte visual do catálogo (os preços e níveis vêm do motor compartilhado)
  const DESC_DADOS = { marfim: 'o clássico da mesa', madeira: 'nogueira encerada', rosa: 'quartzo rosa', menta: 'presente do nível 3', pelucia: 'veludo macio', dourado: 'reluz sob o abajur', diamante: 'lapidado, para quem tem paciência' };
  const DADOS = Object.fromEntries(Object.entries(R.CATALOGO.dados).map(([k, v]) => [k, { ...v, desc: DESC_DADOS[k] }]));
  // ícones: o desenho mora em js/retratos.js (vetor, ou a versão pintada quando existe)
  const DESC_ICONES = { bolinha: 'o clássico', xicara: 'presente do nível 2', raposa: 'de cachecol', sapo: 'de chapéu de palha', urso: 'de gorro de lã',
    coelho: 'de gravata-borboleta', guaxinim: 'de moletom', cogumelo: 'do sub-bosque', monstera: 'em vaso de barro', cacto: 'em flor',
    biscoito: 'cabelo dourado, sorriso largo', gordinho: 'barriga redonda, segundas intenções', cafu: 'de amarelo e verde', galgo: 'sagaz: já viu essa jogada antes', bandoleiro: 'sempre tem uma carta escondida' };
  const ICONES = Object.fromEntries(Object.entries(R.CATALOGO.icones).map(([k, v]) => [k, { ...v, desc: DESC_ICONES[k] || '' }]));
  const GRUPOS_ICONES = [['especial', 'Especiais'], ['animal', 'Animais'], ['natureza', 'Natureza'], ['basico', 'Básicos']];
  const MESAS_VISUAL = {
    salvia:     { nome: 'Feltro sálvia', preco: 0, amostra: 'linear-gradient(160deg,#5f8f78,#3b6252)' },
    vinho:      { nome: 'Feltro vinho', preco: 150, amostra: 'linear-gradient(160deg,#8f4c5b,#5a2836)' },
    noite:      { nome: 'Noite estrelada', preco: 0, nivel: 5, amostra: 'radial-gradient(circle,#fff3e2 0 1px,transparent 1.5px) 0 0/12px 12px,linear-gradient(160deg,#3d5a88,#22365a)' },
    piquenique: { nome: 'Piquenique', preco: 250, amostra: 'repeating-linear-gradient(0deg,rgba(232,128,111,.4) 0 6px,transparent 6px 12px),repeating-linear-gradient(90deg,rgba(232,128,111,.4) 0 6px,transparent 6px 12px),#fbf1df' },
  };
  Object.keys(MESAS_VISUAL).forEach(k => Object.assign(MESAS_VISUAL[k], R.CATALOGO.mesas[k]));
  const MESAS = MESAS_VISUAL;
  const sorteia = a => a[Math.floor(Math.random() * a.length)];

  // ---------- rivais ----------
  // os rivais do jogo: Diana (fácil) e Dona Coruja (difícil)
  const RETRATO_RIVAL = { aprendiz: 'diana', esperto: 'coruja' };
  const RIVAIS = {
    aprendiz: { nome: 'Diana', desc: 'gata branca de olhos azuis; joga solto e arrisca', falas: {
      inicio: ['Boa noite. Uma partida?', 'A Mesa está pronta. Comece quando quiser.'],
      meuDisparo: ['Essa entrou.', 'Corrente fechada.'], minhaRuptura: ['Arrisquei demais.', 'Essa não segurou.'],
      seuDisparoGrande: ['Boa leitura da Mesa.', 'Belo disparo.'], armadilha: ['Estava armada desde o começo.', 'Caiu na minha.'], caiu: ['Bem visto.'],
      venci: ['Boa partida. Outra?'], perdi: ['Mereceu. Revanche?'] } },
    esperto: { nome: 'Dona Coruja', desc: 'joga com paciência e lê a Mesa', falas: {
      inicio: ['Boa noite. Sem pressa: a Mesa fala.', 'Sente-se. Vamos com calma.'],
      meuDisparo: ['Paciência rende.', 'Uma corrente bem construída.'], minhaRuptura: ['Hum. Calculei mal.', 'Acontece com quem arrisca.'],
      seuDisparoGrande: ['Jogada precisa.', 'Muito bem construída.'], armadilha: ['Eu avisei que havia algo armado.', 'A Mesa nunca esquece.'], caiu: ['Bem lido.'],
      venci: ['Foi equilibrado. Outra?'], perdi: ['Excelente partida.'] } },
  };

  // o módulo online (mais abaixo) preenche estes dois
  const Online = { enviar() {} };
  const Conta = {};

  // ---------- estado e preferências ----------
  let uid = 1;
  const PREF_PADRAO = { som: true, musica: true, volSom: 0.8, volMusica: 0.45, animacoes: true, particulas: true, tremor: true, vibrar: true, falas: true, dicas: true, liberar: false };
  const st = {
    cfg: { modo: 'bot', nivel: 'aprendiz', meta: 12, ritmo: 'normal' },
    pref: { ...PREF_PADRAO },
    decks: [['ajuste', 'coringa', 'pressa'], ['ancora', 'coringa', 'interferencia']],
    rec: { partidas: 0, vitorias: 0, seq: 0, melhorSeq: 0, maiorDisparo: 0, maiorCorrente: 0 },
    conta: { moedas: 0, rating: 1000, xp: 0, cartas: GRATIS.slice(), dados: ['marfim'], icones: ['bolinha'], mesas: ['salvia'], dado: 'marfim', icone: 'bolinha', mesa: 'salvia' },
    abaLoja: 'cartas',
    primeiro: 0, abaDeck: 0, deckVisto: false,
  };
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) st.pref.animacoes = false;
  let jogo = null;
  try {
    const s = JSON.parse(localStorage.getItem('diceduel.v1') || '{}');
    if (s.cfg) Object.assign(st.cfg, s.cfg);
    if (s.pref) Object.assign(st.pref, s.pref);
    if (s.rec) Object.assign(st.rec, s.rec);
    if (s.conta) { Object.assign(st.conta, s.conta); GRATIS.forEach(c => { if (!st.conta.cartas.includes(c)) st.conta.cartas.push(c); }); }
    if (Array.isArray(s.decks)) st.decks = s.decks.map(d => (d || []).filter(c => CARTAS[c])).map(d => deckValido(d) ? d : []);
    st.deckVisto = !!s.deckVisto;
  } catch (e) {}
  const salvar = () => {
    try { localStorage.setItem('diceduel.v1', JSON.stringify({ cfg: st.cfg, pref: st.pref, rec: st.rec, conta: st.contaConvidado || st.conta, decks: st.decks, deckVisto: st.deckVisto })); } catch (e) {}
    if (st.sessao && Conta.sincronizar) Conta.sincronizar();   // com conta, decks e recordes vão para o servidor
  };
  const armadilhasLiberadas = () => st.pref.liberar || st.rec.partidas >= 1;
  const travada = c => CARTAS[c].tipo === 'armadilha' && !armadilhasLiberadas();
  const possui = c => st.conta.cartas.includes(c);
  const disponivel = c => possui(c) && !travada(c);

  function aplicarPrefs() {
    const p = st.pref;
    Som.configurar({ som: p.som, musica: p.musica, volSom: p.volSom, volMusica: p.volMusica });
    Object.assign(Fx.cfg, { animacoes: p.animacoes, particulas: p.particulas, tremor: p.tremor });
    document.documentElement.classList.toggle('sem-animacoes', !p.animacoes);
    Object.keys(MESAS).forEach(m => document.body.classList.toggle('mesa-' + m, st.conta.mesa === m && m !== 'salvia'));
    const sl = document.getElementById('saldo'); if (sl) sl.textContent = st.conta.moedas;
  }
  const vibrar = ms => { if (!st.pref.vibrar) return; try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
  const ritmo = () => ({ calmo: 1.4, normal: 1, rapido: 0.55 }[st.cfg.ritmo] || 1);

  const nomes = () => jogo.modo === 'online' ? ['Você', jogo.nomes[1]] : jogo.nomes;
  const humano = p => jogo.modo === 'local' || p === 0;
  const online = () => jogo && jogo.modo === 'online';

  function novaPartida() {
    // numa sala online: "jogar de novo" é pedir revanche; no meio da partida, só volta à mesa
    if (Online.naSala() && online()) {
      if (jogo.fase === 'fim') return Online.revanche();
      ['fim', 'janelaCarta', 'janelaDeck'].forEach(id => { document.getElementById(id).hidden = true; });
      return;
    }
    const modo = st.cfg.modo, nivel = st.cfg.nivel;
    const deckRival = modo === 'local' ? st.decks[1].slice()
      : nivel === 'esperto' ? sorteia(DECKS_CORUJA).slice() : sorteiaDeck(!armadilhasLiberadas());
    const decks = [st.decks[0].filter(disponivel), modo === 'local' ? deckRival.filter(disponivel) : deckRival];
    const nomesP = modo === 'bot' ? ['Você', RIVAIS[nivel].nome] : ['Jogador 1', 'Jogador 2'];
    jogo = R.criarPartida({ decks, vez: st.primeiro, meta: +st.cfg.meta, nomes: nomesP, modo, nivel, idInicial: uid });
    Object.assign(jogo, { alvo: null, ajusteIdx: null, sel: null, destaque: null, pensando: false, token: Math.random(), fala: null, humor: null, intro: false });
    st.primeiro = 1 - st.primeiro;
    ['avisoCfg', 'fim', 'janelaCarta', 'janelaDeck'].forEach(id => { document.getElementById(id).hidden = true; });
    marcarNovos();
    if (st.pref.animacoes) mostrarVersus(); else { render(); talvezAutomato(); }
  }
  function sorteiaDeck(semArmadilha) {
    const pool = ORDEM.filter(c => !semArmadilha || CARTAS[c].tipo !== 'armadilha');
    for (;;) {
      const d = pool.slice().sort(() => Math.random() - .5).slice(0, 3);
      if (deckValido(d)) return d;
    }
  }
  // os dados novos rolam na tela só uma vez
  function marcarNovos() {
    const ids = jogo.mesa.filter(d => d.novo).map(d => d.id);
    if (ids.length) setTimeout(() => { if (jogo) jogo.mesa.forEach(d => { if (ids.includes(d.id)) d.novo = false; }); }, 900);
  }

  // ---------- ações: o motor muda o estado; aqui só se desenha e se passa a vez ao rival ----------
  const destinos = (p, v) => R.destinos(jogo, p, v);
  const seguro = (p, v) => R.seguro(jogo, p, v);
  const bolsoGarante = p => R.bolsoGarante(jogo, p);
  const encaixaP = (p, v) => R.encaixaP(jogo, p, v);
  const tirar = (p, idx) => R.tirar(jogo, p, idx);
  // quem espera o rival "pensar" é o clique (cartaBotoes), não a regra: senão o próprio rival nunca usava cartas
  const podeUsar = (p, c) => R.podeUsar(jogo, p, c);
  const blefando = (p, c) => R.blefando(jogo, p, c);
  const usavel = (p, c) => R.usavel(jogo, p, c);
  const armadilhasOcultas = p => R.armadilhasOcultas(jogo, p);
  const marcadoContra = (p, d) => R.marcadoContra(jogo, p, d);
  const valorAoPegar = (p, d) => R.valorAoPegar(jogo, p, d);
  const seguroDado = (p, d) => R.seguroDado(jogo, p, d);
  function depois(r) {
    marcarNovos();
    jogo.sel = null;
    if (r === 'proximo' || r === 'fim') { jogo.alvo = null; jogo.ajusteIdx = null; }
    if (jogo.fase === 'fim') { aoFim(); return 'fim'; }
    render();
    if (r === 'proximo') talvezAutomato();
    return r;
  }
  // blefe: um efeito virado para baixo ocupa o lugar da armadilha e aparece ao rival como "?"
  const podeVirar = (p, c) => R.podeVirar(jogo, p, c);
  function virarCarta(p, c) {
    if (online()) { Online.enviar({ tipo: 'virar', carta: c }); return; }
    R.virarCarta(jogo, p, c);
  }
  // o segundo dado da Pressa é opcional
  function dispensarSegundo(p) {
    jogo.sel = null;
    if (online()) { Online.enviar({ tipo: 'dispensar' }); return 'online'; }
    return depois(R.dispensarSegundo(jogo, p));
  }
  function usarCarta(p, c, idx, delta) {
    if (online()) { Online.enviar({ tipo: 'carta', carta: c, idx, delta }); return; }
    if ((c === 'virar' || c === 'ajuste') && jogo.mesa[idx]) jogo.virando = jogo.mesa[idx].id;
    R.usarCarta(jogo, p, c, idx, delta);
    marcarNovos();
  }
  function colocar(p, v, modo) {
    if (online()) { Online.enviar({ tipo: 'destino', modo }); return 'online'; }
    return depois(R.colocar(jogo, p, v, modo));
  }
  function disparar(p) {
    if (online()) { Online.enviar({ tipo: 'disparar' }); return; }
    return depois(R.disparar(jogo, p));
  }
  function segurar(p) {
    if (online()) { Online.enviar({ tipo: 'segurar' }); return; }
    return depois(R.segurar(jogo, p));
  }

  // fim de partida: recordes, moedas, rating e experiência (contra os rivais do jogo; o online acerta isso no servidor)
  function aoFim() {
    const j = jogo, p = j.vencedor;
    j.recordes = j.recordes || [];
    if (j.modo === 'bot') {
      const r = st.rec, s = j.stats[0], liberouAgora = !armadilhasLiberadas();
      r.partidas++;
      if (p === 0) { r.vitorias++; r.seq++; } else r.seq = 0;
      if (r.seq > r.melhorSeq) { r.melhorSeq = r.seq; if (r.seq >= 2) j.recordes.push(`Melhor sequência: ${r.seq} vitórias seguidas`); }
      if (s.maiorDisp > r.maiorDisparo) { r.maiorDisparo = s.maiorDisp; j.recordes.push(`Maior disparo: +${s.maiorDisp}`); }
      if (s.maior > r.maiorCorrente) { r.maiorCorrente = s.maior; j.recordes.push(`Maior corrente: ${s.maior}`); }
      if (liberouAgora) j.recordes.push('Armadilhas liberadas no deck!');
      // moedas (só vitórias, só abaixo do teto de rating do rival), rating e experiência: regras em shared/regras.js
      const c = st.conta, ps = R.premioSolo({ rating: c.rating, pico: c.pico }, { nivel: j.nivel, venceu: p === 0, margem: j.pts[0] - j.pts[1], rodadas: j.rodada, meta: j.meta });
      if (ps.moedas) c.moedas += ps.moedas.total;
      c.rating = ps.rating; c.pico = ps.picoNovo;
      const xp = R.ganharXp(c, j.desistencia === 0 ? 0 : R.xpDaPartida(p === 0, j.momentos.filter(m => m.p === 0).length));
      j.premio = { moedas: ps.moedas, ratingAntes: ps.ratingAntes, pico: ps.pico, rating: c.rating, ...xp };
      salvar(); aplicarPrefs();
      falar(p === 1 ? 'venci' : 'perdi');
      Conta.relatarSolo && Conta.relatarSolo(j);
    }
    render();
    setTimeout(mostrarFim, st.pref.animacoes ? 1800 : 600);
  }

  // ---------- o rival (a mesma lógica do simulador; não vê qual armadilha você armou) ----------
  const valorBolso = y => y === null ? 0 : (y === 2 || y === 5 ? 0.9 : 0.6);
  function notaDestino(p, X, modo) {
    const j = jogo, eu = j.cor[p];
    let nc = eu, nb = j.bolso[p];
    if (modo === 'corrente') nc = eu.concat(X);
    if (modo === 'guardar') nb = X;
    if (modo === 'trocar') { nc = eu.concat(j.bolso[p]); nb = X; }
    return (nc.length ? opcoes(nc) : 6) + 3 * (nc.length - eu.length) + 2.5 * valorBolso(nb);
  }
  function automatoEscolhe(p) {
    const j = jogo, eu = j.cor[p], ele = j.cor[1 - p], mesa = j.mesa;
    const esperto = j.nivel === 'esperto';
    const evitaBolso = esperto && j.armada[1 - p] && ['pronta', 'armada'].includes(j.cartas[1 - p].fundo);
    const marcado = j.marca && j.marca.dono !== p ? j.marca.id : null;
    const alternativas = mesa.some(d => d.id !== marcado && seguroDado(p, d));
    let melhor = null, mv = -Infinity;
    mesa.forEach((d, i) => {
      const X = d.v;
      if (d.id === marcado && alternativas) return;
      let neg = 0;
      if (esperto && ele.length >= 2 && encaixa(ele, X)) {
        const resto = mesa.filter((_, k) => k !== i).map(x => x.v);
        const rf = resto.filter(x => encaixa(ele, x)).length;
        neg = rf === 0 ? 4 : (rf === 1 && resto.length >= 2 ? 1 : 0);
      }
      let ds = destinos(p, X);
      if (evitaBolso && ds.includes('corrente')) ds = ['corrente'];
      if (!esperto) ds = ds.filter(m => m === 'corrente' || !encaixaP(p, X));
      for (const m of ds) {
        const v = notaDestino(p, X, m) + neg + Math.random() * 0.01;
        if (v > mv) { mv = v; melhor = { idx: i, modo: m }; }
      }
    });
    if (melhor) return melhor;
    if (esperto && ele.length >= 2) { const i = mesa.findIndex(d => encaixa(ele, d.v)); if (i >= 0) return { idx: i, modo: 'corrente' }; }
    return { idx: Math.floor(Math.random() * mesa.length), modo: 'corrente' };
  }
  function automatoDestino(p, v, planejado) {
    const ds = destinos(p, v);
    if (!ds.length) return 'corrente';
    if (ds.includes(planejado) && jogo.nivel !== 'esperto') return planejado;
    return ds.reduce((a, b) => notaDestino(p, v, b) > notaDestino(p, v, a) ? b : a);
  }
  function automatoCartas(p) {
    const j = jogo, eu = j.cor[p], ele = j.cor[1 - p], m = j.mesa, usa = [];
    const pronta = c => j.cartas[p][c] === 'pronta', pode = c => usavel(p, c);   // "pode": efeito pronto ou virado como blefe
    if (j.nivel === 'aprendiz') {
      if (Math.random() > 0.2) return usa;
      const cs = j.decks[p].filter(c => pronta(c) && podeUsar(p, c).ok && c !== 'sobrecarga');
      if (!cs.length) return usa;
      return [{ carta: sorteia(cs), idx: Math.floor(Math.random() * m.length), delta: Math.random() < .5 ? 1 : -1 }];
    }
    let precisa = eu.length >= 2 && !m.some(d => encaixaP(p, d.v));
    if (precisa && pode('virar')) { const i = m.findIndex(d => encaixa(eu, 7 - d.v)); if (i >= 0) { usa.push({ carta: 'virar', idx: i }); precisa = false; } }
    if (precisa && pode('ajuste')) {
      for (let i = 0; i < m.length && precisa; i++) for (const dl of [1, -1]) {
        const x = m[i].v + dl; if (x >= 1 && x <= 6 && encaixa(eu, x)) { usa.push({ carta: 'ajuste', idx: i, delta: dl }); precisa = false; break; }
      }
    }
    if (precisa && pode('coringa')) { usa.push({ carta: 'coringa' }); precisa = false; }
    if (precisa && pode('rerrolar')) { usa.push({ carta: 'rerrolar' }); precisa = false; }
    if (ele.length >= 4 && m.length >= 2 && !usa.length) {
      const so = m.map((d, i) => i).filter(i => encaixa(ele, m[i].v));
      if (so.length === 1) {
        const i = so[0];
        if (pode('virar') && !encaixa(ele, 7 - m[i].v)) usa.push({ carta: 'virar', idx: i });
        else if (pode('rerrolar')) usa.push({ carta: 'rerrolar' });
      }
    }
    if (!j.armada[p]) {
      if (pronta('interferencia') && ele.length >= 3) usa.push({ carta: 'interferencia' });
      else if (pronta('pedagio') && ele.length >= 3) usa.push({ carta: 'pedagio' });
      else if (pronta('fundo') && (j.bolso[1 - p] !== null || ele.length >= 1)) usa.push({ carta: 'fundo' });
      else if (pronta('ancora') && eu.length >= 3) usa.push({ carta: 'ancora' });
      else if (pronta('espelho') && ele.length >= 2 && m.length >= 3) {
        const meu = automatoEscolhe(p).idx;
        const i = m.map((d, k) => k).find(k => k !== meu && encaixa(ele, m[k].v) && !encaixa(ele, 7 - m[k].v));
        if (i !== undefined) usa.push({ carta: 'espelho', idx: i });
      }
    }
    if (pode('pressa') && eu.length >= 2 && m.length >= 2 && !usa.some(u => u.carta === 'rerrolar')) {
      const ok = m.some((a, i) => encaixaP(p, a.v) && m.some((b, k) => k !== i && encaixa(eu.concat(a.v), b.v)));
      if (ok) usa.push({ carta: 'pressa' });
    }
    // blefe: com uma armadilha ainda escondida no deck, às vezes vira para baixo um efeito que não precisa agora
    if (!j.armada[p] && !usa.some(u => CARTAS[u.carta].tipo === 'armadilha') && ele.length >= 3 && Math.random() < 0.4) {
      const c = j.decks[p].find(c => c !== 'pressa' && podeVirar(p, c).ok && !usa.some(u => u.carta === c));
      if (c) usa.push({ carta: c, virar: true });
    }
    return usa;
  }
  function risco(p) {
    const j = jogo, eu = j.cor[p], resto = j.mesa.map(d => d.v);
    if (bolsoGarante(p)) return { r: 0.03, bolso: true, n: resto.length };
    if (resto.length >= 2) {
      const k = resto.filter(v => encaixa(eu, v)).length;
      return { r: k === 0 ? 1 : k === 1 ? 0.6 : 0.1, k, n: resto.length };
    }
    const pf = opcoes(eu) / 6;
    return { r: resto.length === 0 ? Math.pow(1 - pf, 4) : Math.pow(1 - pf, 5), n: resto.length, pf };
  }
  function automatoDispara(p) {
    const j = jogo, L = j.cor[p].length;
    if (j.pts[p] + pontos(L) >= j.meta) return true;
    if (j.nivel === 'aprendiz') return L >= 4;
    let { r } = risco(p);
    if (j.armada[p] === 'ancora') r *= 0.2;
    return r * pontos(L) > (pontos(L + 1) - pontos(L)) * (1 - r);
  }

  const espera = ms => new Promise(res => setTimeout(res, ms * ritmo()));
  async function talvezAutomato() {
    const j = jogo;
    if (!j || j.modo !== 'bot' || j.fase === 'fim' || humano(j.vez) || j.pensando || j.intro) return;
    const tok = j.token, p = j.vez;
    j.pensando = true; render();
    if (j.fase === 'pegar') {
      await espera(800); if (tok !== jogo.token) return;
      for (const u of automatoCartas(p)) {
        if (u.virar ? !podeVirar(p, u.carta).ok : (!podeUsar(p, u.carta).ok || (CARTAS[u.carta].alvo && !j.mesa[u.idx]))) continue;
        if (u.virar) virarCarta(p, u.carta); else usarCarta(p, u.carta, u.idx, u.delta || 1);
        render();
        await espera(1000); if (tok !== jogo.token) return;
      }
      for (;;) {
        const plano = automatoEscolhe(p);
        j.destaque = j.mesa[plano.idx].id; render();
        await espera(520); if (tok !== jogo.token) return;
        j.destaque = null; j.pensando = false;
        const v = tirar(p, plano.idx);
        const res = colocar(p, v, automatoDestino(p, v, plano.modo));
        if (res === 'extra') {
          // o segundo dado da Pressa é opcional: sem nenhum dado seguro, o rival dispensa
          if (!j.mesa.some(d => seguroDado(p, d))) { if (dispensarSegundo(p) !== 'decidir') return; break; }
          j.pensando = true; render(); await espera(520); if (tok !== jogo.token) return; continue;
        }
        if (res !== 'decidir') return;
        break;
      }
      j.pensando = true; render();
    }
    await espera(650); if (tok !== jogo.token) return;
    j.pensando = false;
    if (automatoDispara(p)) {
      if (j.decks[p].includes('sobrecarga') && podeUsar(p, 'sobrecarga').ok && j.cor[p].length >= 4 && j.nivel === 'esperto') { usarCarta(p, 'sobrecarga'); render(); await espera(700); if (tok !== jogo.token) return; }
      disparar(p);
    } else segurar(p);
  }

  // ---------- falas do rival ----------
  function falar(chave) {
    const j = jogo;
    if (!j || j.modo !== 'bot' || !st.pref.falas) return;
    const lista = RIVAIS[j.nivel].falas[chave]; if (!lista) return;
    if (!['inicio', 'venci', 'perdi'].includes(chave) && Math.random() > 0.55) return;
    j.fala = { id: uid++, txt: sorteia(lista) };
    j.humor = ['meuDisparo', 'armadilha', 'venci', 'inicio'].includes(chave) ? 'feliz' : ['minhaRuptura', 'perdi'].includes(chave) ? 'triste' : null;
    Som.tocar('falaRival');
    const id = j.fala.id;
    setTimeout(() => { if (jogo === j) render(); }, 0);
    setTimeout(() => { if (jogo && jogo.fala && jogo.fala.id === id) { jogo.fala = null; jogo.humor = null; render(); } }, 2600);
  }
  // o motor avisa o que aconteceu; o rival comenta (só contra os rivais do jogo)
  function falaDoEvento(e) {
    if (e.chave === 'inicio') return falar('inicio');
    if (e.chave === 'armadilha') return falar(e.dono === 1 ? 'armadilha' : 'caiu');
    if (e.chave === 'minhaRuptura' && e.dono === 1) return falar('minhaRuptura');
    if (e.chave === 'disparo') { if (e.dono === 1) falar('meuDisparo'); else if (e.L >= 5) falar('seuDisparoGrande'); }
  }

  // ---------- ações de quem joga ----------
  // Tocar num dado só o ESCOLHE: nada sai da Mesa ainda. Tocar em outro dado troca a escolha, "Cancelar" (ou Esc)
  // desfaz, e o dado só é pego quando a pessoa escolhe o destino (ou toca de novo no mesmo dado, que vai para o
  // destino principal; uma ruptura nunca acontece por toque duplo). As cartas que pedem um dado (Virar, Espelho,
  // Ajuste) seguem a mesma regra: escolher, poder trocar, e só então confirmar.
  const idxDe = id => jogo.mesa.findIndex(d => d.id === id);
  function opcoesDoDado(p, idx) {
    const j = jogo, d = j.mesa[idx], v = valorAoPegar(p, d);
    const contra = marcadoContra(p, d), proprio = !!(j.marca && j.marca.id === d.id && j.marca.dono === p);
    const ds = R.destinosDoDado(j, p, idx);
    const seguros = contra ? (encaixaP(p, v) ? ['corrente'] : []) : destinos(p, v);
    const principal = proprio ? null : seguros.includes('corrente') ? 'corrente' : (seguros[0] || null);
    return { d, v, ds, seguros, rompe: !seguros.length, contra, proprio, principal };
  }
  function clicarDado(idx) {
    const j = jogo;
    if (!j || !humano(j.vez) || j.pensando || j.intro) return;
    const d = j.mesa[idx]; if (!d) return;
    if (j.fase === 'alvo' || j.fase === 'ajuste') {
      if (j.alvo === 'ajuste') { j.ajusteIdx = idx; j.fase = 'ajuste'; render(); return; }
      if (j.sel === d.id) return confirmarAlvo();
      j.sel = d.id; render(); return;
    }
    if (j.fase !== 'pegar') return;
    if (j.sel === d.id) {
      const op = opcoesDoDado(j.vez, idx);
      if (op.principal) pegarDado(op.principal);
      return;
    }
    j.sel = d.id;
    render();
  }
  // pega o dado escolhido e já o põe no destino (uma ação só: nada fica pela metade)
  function pegarDado(modo) {
    const j = jogo, p = j.vez, idx = idxDe(j.sel);
    if (idx < 0 || !R.destinosDoDado(j, p, idx).includes(modo)) return;
    j.sel = null;
    if (online()) { Online.enviar({ tipo: 'pegar', idx, modo }); return; }
    depois(R.pegarPara(j, p, idx, modo));
  }
  function confirmarAlvo() {
    const j = jogo, idx = idxDe(j.sel), c = j.alvo;
    if (idx < 0 || !c || c === 'ajuste') return;
    j.alvo = null; j.fase = 'pegar'; j.sel = null;
    usarCarta(j.vez, c, idx); render();
  }
  function cancelarEscolha() {
    const j = jogo;
    j.sel = null;
    if (j.fase === 'alvo' || j.fase === 'ajuste') { j.fase = 'pegar'; j.alvo = null; j.ajusteIdx = null; }
    render();
  }

  function abrirCarta(p, c) {
    const j = jogo, k = CARTAS[c], pu = podeUsar(p, c);
    const meu = (j.modo !== 'local' && p === 0) || (j.modo === 'local' && j.vez === p);
    let e = j.cartas[p][c];
    if (!meu && e === 'armada' && c !== 'espelho') e = 'pronta';
    const blefe = meu && blefando(p, c), pv = podeVirar(p, c);
    const estado = { pronta: 'na mão', armada: blefe ? 'virada para baixo (blefe)' : 'armada', usada: 'usada', perdida: 'perdida' }[e] || e;
    document.getElementById('cartaDetalhe').innerHTML = `${k.arte}<div><h2 id="cartaTitulo">${k.nome}</h2>
      <p class="nota">${k.tipo === 'armadilha' ? 'Armadilha' : 'Efeito'}${k.pontos ? ` · carta de pontos <span class="raio">${RAIO}</span>` : ''} · ${estado}</p><p style="margin-top:8px">${k.texto}</p></div>`;
    const visivel = humano(p) && j.vez === p;
    let nota = !meu ? 'O deck do rival fica à mostra. Uma carta virada (?) pode ser qualquer carta dele ainda não revelada: uma armadilha ou um blefe.'
      : !visivel ? 'Só na sua vez.' : pu.ok ? '' : (pu.motivo || '');
    if (visivel && e === 'pronta' && k.tipo === 'efeito' && pv.ok) nota = 'Virada para baixo, ela aparece para o rival como uma armadilha (?). Virada, não faz nada; quando você a usar, o blefe se revela.';
    document.getElementById('cartaNota').textContent = nota;
    const rot = blefe ? 'Usar (revela o blefe)' : k.alvo ? 'Escolher o dado' : k.tipo === 'armadilha' ? 'Armar' : 'Usar';
    document.getElementById('cartaBotoes').innerHTML =
      (visivel && (e === 'pronta' || blefe) ? `<button class="btn btn-mel" data-usar="${c}" ${pu.ok ? '' : 'disabled'}>${rot}</button>` : '') +
      (visivel && e === 'pronta' && pv.ok ? `<button class="btn btn-papel" data-virar="${c}">Virar para baixo (blefe)</button>` : '') +
      `<button class="btn btn-papel" data-fechar-carta="1">Fechar</button>`;
    document.getElementById('janelaCarta').hidden = false;
    Som.tocar('carta');
    (document.querySelector('#cartaBotoes [data-usar]:not(:disabled)') || document.querySelector('#cartaBotoes [data-fechar-carta]')).focus();
  }

  // ---------- desenho ----------
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const dadoHTML = (v, skin = 'marfim') => `<span class="dado skin-${skin}" role="img" aria-label="${v}">${Array.from({ length: 9 }, (_, i) => `<i class="pip${PIPS[v].includes(i) ? ' on' : ''}"></i>`).join('')}</span>`;
  const mini = (v, skin) => `<span class="mini">${dadoHTML(v, skin)}</span>`;
  // cada um vê os próprios dados com a própria skin; os rivais têm a sua; a Mesa usa a sua (ou marfim, a dois)
  const skinDe = p => p === 0 ? st.conta.dado : jogo.modo === 'bot' ? (jogo.nivel === 'esperto' ? 'madeira' : 'rosa') : online() ? (jogo.perfis[1].dado || 'marfim') : 'marfim';
  const skinMesa = () => jogo.modo !== 'local' ? st.conta.dado : 'marfim';
  const iconeSVG = id => Retratos.retrato(ICONES[id] ? id : 'bolinha', ICONES[id] && ICONES[id].grupo === 'especial' ? 'especial' : '');
  const elo = r => `<span class="elo ${r.length > 1 ? 'duplo' : 'r-' + r[0]}" title="${r.map(k => REL[k].nome).join(' + ')}">${r.map(k => REL[k].simb).join('·')}</span>`;

  function bolsoHTML(p) {
    const j = jogo, b = j.bolso[p], util = b !== null && j.cor[p].length && encaixaP(p, b);
    const destaque = j.fase === 'destino' && j.vez === p ? ' ativo' : '';
    return `<span class="bolso${destaque}" title="Bolso: guarda um dado"><span class="rot">Bolso</span>${b === null ? '<span class="bolso-vazio"></span>' : `<span class="mini${util ? ' util' : ''}">${dadoHTML(b, skinDe(p))}</span>`}</span>`;
  }
  function cartasHTML(p) {
    const j = jogo, deck = j.decks[p];
    if (!deck.length) return `<div class="cartas"><span class="vazio-cartas">sem cartas</span></div>`;
    const meu = j.modo !== 'local' && p === 0;
    let html = '<span class="rot">Cartas</span>';
    for (const c of deck) {
      const k = CARTAS[c];
      let e = j.cartas[p][c];
      if (e === 'armada' && !meu && c !== 'espelho') e = 'pronta';
      const raio = k.pontos ? '<span class="raio" aria-label="carta de pontos">⚡</span>' : '';
      const rotulo = e === 'armada' ? (k.tipo === 'efeito' ? 'virada' : 'armada') : '';
      html += `<button class="carta ${k.tipo} ${e}" data-carta="${c}" data-dono="${p}" aria-label="${k.nome}: ${rotulo || e}">${k.ico}<span class="cnome">${k.nome}</span>${raio}${rotulo ? `<small>${rotulo}</small>` : ''}</button>`;
    }
    let estados = '';
    if (j.armada[p] && j.armada[p] !== 'espelho' && !meu) estados += `<span class="efeito-ativo oculta" style="background:var(--tinta);color:var(--papel)" title="Uma carta virada: pode ser uma armadilha ou um blefe">${VERSO} carta virada</span>`;
    if (j.coringa[p]) estados += `<span class="efeito-ativo">Coringa ativo</span>`;
    if (j.sobre[p]) estados += `<span class="efeito-ativo">Sobrecarga +2</span>`;
    if (j.extra[p]) estados += `<span class="efeito-ativo">Pressa: +1 dado</span>`;
    return `<div class="cartas">${html}</div><div class="estados">${estados}</div>`;
  }

  function painel(p) {
    const j = jogo, n = nomes(), daVez = j.vez === p && j.fase !== 'fim';
    const fx = j.fx && j.fx.p === p ? j.fx : null;
    const cor = fx ? fx.dados : j.cor[p];
    const L = j.cor[p].length;
    let slots = '';
    for (let i = 0; i < LIM; i++) {
      if (i < cor.length) {
        const r = i > 0 ? rels(cor[i - 1], cor[i]) : [];
        const frenteCls = !fx && i === cor.length - 1 ? ' frente' : '';
        slots += `<div class="slot${frenteCls}" data-slot="${i}">${r.length ? elo(r) : (i > 0 ? '<span class="elo r-coringa" title="Coringa">★</span>' : '')}${dadoHTML(cor[i], skinDe(p))}</div>`;
      } else if (i === cor.length && !fx) {
        const fs = facesQueEncaixam(cor);
        slots += `<div class="slot prox" title="Faces que sincronizam com a frente">${cor.length && !j.coringa[p] ? `<span class="prox-faces">${fs.join(' ')}</span>` : '<svg class="ico prox-livre" viewBox="0 0 24 24" aria-label="qualquer dado começa"><path d="M12 6v12M6 12h12"/></svg>'}</div>`;
      } else slots += `<div class="slot vazio"></div>`;
    }
    const pct = Math.min(100, j.pts[p] / j.meta * 100);
    const prev = L >= 3 ? Math.min(100 - pct, pontos(L) / j.meta * 100) : 0;
    const vale = pontos(L) + (j.sobre[p] && L >= 4 ? 2 : 0);
    const valeAgora = L >= 3 ? `disparar vale <b>+${vale}</b>` : L ? `faltam <b>${3 - L}</b> para disparar` : 'qualquer dado começa';
    const seCrescer = L >= 3 && L < LIM ? ` · com ${L + 1}: <b>+${pontos(L + 1)}</b>` : '';
    const pensa = daVez && !humano(p) && !(online() && j.perfis[1].conectado === false);
    const tag = j.fase === 'fim' ? (j.vencedor === p ? 'venceu' : '') : daVez ? (humano(p) ? (j.modo !== 'local' ? 'sua vez' : 'vez') : online() ? (j.perfis[1].conectado === false ? 'caiu, esperando' : 'jogando') : 'pensando') : '';
    const avatar = j.modo === 'bot' && p === 1 ? Retratos.retrato(RETRATO_RIVAL[j.nivel], j.humor || '') : p === 0 ? iconeSVG(st.conta.icone) : online() ? iconeSVG(j.perfis[1].icone) : '';
    const fala = j.modo === 'bot' && p === 1 && j.fala ? `<div class="fala" aria-live="polite">${j.fala.txt}</div>` : '';
    return `<div class="jogador p${p}${daVez ? ' da-vez' : ''}">${fala}
      <div class="cab">${avatar}<span class="quem"><span class="nome">${n[p]}</span>${tag ? `<span class="vez-tag${pensa ? ' pensando-pontos' : ''}">${tag}</span>` : ''}</span>
        ${bolsoHTML(p)}<span class="placar"><b data-placar="${p}">${j.pts[p]}</b><small>/${j.meta}</small></span></div>
      <div class="barra" role="progressbar" aria-valuemin="0" aria-valuemax="${j.meta}" aria-valuenow="${j.pts[p]}" aria-label="Pontos de ${n[p]}"><i style="width:${pct}%"></i>${prev ? `<span class="prev" style="left:${pct}%;width:${prev}%"></span>` : ''}</div>
      <div class="corrente${fx ? ' fx-' + fx.tipo : ''}">${slots}</div>
      <div class="info"><span>Corrente <b>${L}</b>/${LIM}</span><span>${valeAgora}${seCrescer}</span></div>
      ${cartasHTML(p)}
    </div>`;
  }

  function mesaHTML() {
    const j = jogo, p = j.modo !== 'local' ? 0 : j.vez, eu = j.cor[p], ele = j.cor[1 - p];
    const ativo = humano(j.vez) && ['pegar', 'alvo', 'ajuste'].includes(j.fase) && !j.pensando && !j.intro;
    const dicas = st.pref.dicas;
    return j.mesa.map((d, i) => {
      // um dado com o Espelho do rival chega virado: as dicas falam do valor que vai chegar
      const vv = valorAoPegar(p, d), contra = marcadoContra(p, d);
      const r = eu.length ? rels(frente(eu), vv) : [];
      const cabe = encaixaP(p, vv), salvo = seguroDado(p, d);
      const marcado = j.marca && j.marca.id === d.id ? j.marca.dono : null;
      let tags = '';
      if (j.fase === 'alvo' && humano(j.vez)) {
        // prévia do efeito antes de confirmar
        tags = j.alvo === 'virar' ? `<span class="tag previa">vira ${7 - d.v}</span>` : j.alvo === 'ajuste' ? `<span class="tag previa">${d.v > 1 ? d.v - 1 : ''}${d.v > 1 && d.v < 6 ? ' ou ' : ''}${d.v < 6 ? d.v + 1 : ''}</span>` : `<span class="tag previa">marcar</span>`;
      } else if (j.fase !== 'fim' && j.fase !== 'ajuste') {
        if (!dicas) tags = '';
        else if (!eu.length) tags = `<span class="tag inicio">Começa</span>`;
        else if (r.length) tags = `<span class="tag ${r.length > 1 ? 'duplo' : 'r-' + r[0]}">${r.map(k => `<span class="tnome">${REL[k].simb}</span><span class="tnome curta"> ${REL[k].nome}</span>`).join(' ')}</span>`;
        else if (cabe) tags = `<span class="tag r-coringa">★<span class="tnome curta"> Coringa</span></span>`;
        else if (salvo) tags = `<span class="tag inicio">Bolso</span>`;
        else tags = `<span class="tag rompe">✕<span class="tnome curta"> Rompe</span></span>`;
        if (contra && dicas) tags = `<span class="tag previa">vira ${vv}</span>` + tags;
      }
      if (j.fase === 'ajuste' && j.ajusteIdx === i) tags = `<span class="tag previa">ajustar</span>`;
      const serveRival = dicas && ele.length && encaixa(ele, valorAoPegar(1 - p, d)) && j.fase !== 'fim';
      const cls = ['pega', d.novo ? 'novo' : '', !salvo && j.fase === 'pegar' && dicas ? 'nao-cabe' : '', j.sel === d.id || (j.fase === 'ajuste' && j.ajusteIdx === i) ? 'escolhido' : '', j.destaque === d.id ? 'destaque' : '', j.virando === d.id ? 'virando' : ''].join(' ');
      const rotulo = `${j.fase === 'alvo' ? 'Escolher' : 'Pegar'} ${d.v}${contra ? `, chega virado como ${vv}` : ''}${cabe ? (r.length ? ', ' + r.map(k => REL[k].nome).join(' e ') : '') : salvo ? ', só pelo Bolso' : ', rompe a corrente'}${serveRival ? ', serve ao rival' : ''}${marcado !== null ? ', marcado com Espelho' : ''}`;
      return `<button class="${cls}" data-i="${i}" data-id="${d.id}" ${ativo ? '' : 'disabled'} aria-label="${rotulo}" aria-pressed="${j.sel === d.id || (j.fase === 'ajuste' && j.ajusteIdx === i)}">
        <span class="kbd">${i + 1}</span><span class="face">${dadoHTML(d.v, skinMesa())}${serveRival ? '<span class="alvo-rival"></span>' : ''}${marcado !== null ? `<span class="marca-esp dono${marcado}" title="Marcado com Espelho">${CARTAS.espelho.ico}</span>` : ''}</span><span class="tags">${tags}</span></button>`;
    }).join('');
  }

  // o que uma carta virada (?) do rival pode ser, com o que cada armadilha faria neste disparo
  function cartaViradaTxt(r, L) {
    const j = jogo, n = nomes();
    const efeito = { interferencia: L >= 4 ? 'Interferência (−1 neste disparo)' : 'Interferência (não pega disparo de 3)', pedagio: 'Pedágio (+3 para ele se você disparar)',
      fundo: 'Fundo Falso (só pega o Bolso)', ancora: 'Âncora (protege a corrente dele)' };
    const traps = armadilhasOcultas(r).map(c => efeito[c] || CARTAS[c].nome);
    const blefes = j.decks[r].filter(c => CARTAS[c].tipo === 'efeito' && ['pronta', 'armada'].includes(j.cartas[r][c])).map(c => CARTAS[c].nome);
    return `${n[r]} tem uma carta virada (?). Pode ser ${traps.join(' ou ')}${blefes.length ? `, ou um blefe com ${blefes.join(' ou ')}` : ''}.`;
  }

  function acoesHTML() {
    const j = jogo, p = j.vez, n = nomes(), quem = `<b class="cor${p}">${n[p]}</b>`;
    if (j.fase === 'fim') {
      return `<div class="status"><b class="cor${j.vencedor}">${n[j.vencedor]}</b> venceu por ${j.pts[j.vencedor]} × ${j.pts[1 - j.vencedor]}.</div>
        <div class="botoes"><button class="btn btn-mel" data-acao="nova" ${online() && Rede.pediuRevanche ? 'disabled' : ''}>${online() ? (Rede.pediuRevanche ? 'Esperando o rival…' : 'Revanche') : 'Jogar de novo'}</button><button class="btn btn-papel" data-acao="deck">Trocar deck</button></div>`;
    }
    if (!humano(p)) return `<div class="status">${quem} ${online() ? (j.perfis[1].conectado === false ? "caiu; esperando voltar (1 min)" : "está jogando") : "está pensando"}<span class="pensando-pontos"></span></div>`;
    const eu = j.cor[p];
    if (j.fase === 'alvo') {
      const k = CARTAS[j.alvo], ds = j.sel !== null && j.sel !== undefined ? j.mesa[idxDe(j.sel)] : null;
      if (ds) {
        const efeito = { virar: [`Virar o ${ds.v}`, `ele vira ${7 - ds.v}`, 'Virar este dado'], espelho: [`Marcar o ${ds.v} com o Espelho`, 'a marca fica à vista do rival', 'Marcar este dado'] }[j.alvo];
        return `<div class="status">${efeito[0]}: ${efeito[1]}. Toque em outro dado para trocar.</div>
          <div class="botoes"><button class="btn btn-mel" data-acao="confirmar-alvo">${efeito[2]}</button><button class="btn btn-papel" data-acao="cancelar-alvo">Cancelar</button></div>`;
      }
      const txt = { espelho: 'Escolha o dado que vai receber a marca do <b>Espelho</b>.', virar: 'Escolha o dado que vai <b>virar</b>. A etiqueta mostra como ele fica.', ajuste: 'Escolha o dado que vai receber o <b>Ajuste</b>.' }[j.alvo];
      return `<div class="status">${txt} Nada acontece até você confirmar.</div><div class="botoes"><button class="btn btn-papel" data-acao="cancelar-alvo">Cancelar (${k.nome} volta para a mão)</button></div>`;
    }
    if (j.fase === 'ajuste') {
      const d = j.mesa[j.ajusteIdx];
      return `<div class="status">Ajuste no ${mini(d.v, skinMesa())} <b>${d.v}</b>. Toque em outro dado para trocar.</div><div class="botoes">
        <button class="btn btn-duplo btn-mel" data-ajuste="-1" ${d.v <= 1 ? 'disabled' : ''}><span>−1</span><small>${d.v > 1 ? 'vira ' + (d.v - 1) : 'não dá'}</small></button>
        <button class="btn btn-duplo btn-mel" data-ajuste="1" ${d.v >= 6 ? 'disabled' : ''}><span>+1</span><small>${d.v < 6 ? 'vira ' + (d.v + 1) : 'não dá'}</small></button>
        <button class="btn btn-papel" data-acao="cancelar-alvo">Cancelar</button></div>`;
    }
    if (j.fase === 'destino' && j.mao) {
      const v = j.mao.v, ds = destinos(p, v), b = j.bolso[p];
      const relTxt = x => { const r = eu.length ? rels(frente(eu), x) : []; return r.length ? r.map(k => REL[k].nome).join(' + ') : (eu.length && j.coringa[p] ? 'Coringa' : 'começa a corrente'); };
      const bt = (modo, rot, sub, cls) => `<button class="btn btn-duplo ${cls}" data-destino="${modo}"><span>${rot}</span><small>${sub}</small></button>`;
      let botoes = '';
      if (ds.length) {
        if (ds.includes('corrente')) botoes += bt('corrente', 'Na corrente', relTxt(v), 'btn-mel');
        if (ds.includes('guardar')) botoes += bt('guardar', 'Guardar', 'no Bolso', ds.includes('corrente') ? 'btn-papel' : 'btn-mel');
        if (ds.includes('trocar')) botoes += bt('trocar', 'Trocar', `entra o ${b} · ${relTxt(b)}`, ds.includes('corrente') ? 'btn-papel' : 'btn-mel');
      } else {
        botoes += bt('corrente', 'Na corrente', b !== null ? `rompe e guarda o ${b}` : 'rompe a corrente', 'btn-papel');
        if (b !== null) botoes += bt('trocar', 'Trocar', `o ${b} rompe, o ${v} fica`, 'btn-papel');
      }
      return `<div class="status">${quem} pegou ${mini(v, skinDe(p))} <b>${v}</b>. Para onde ele vai?${ds.length ? '' : ' Nenhuma opção sincroniza.'}</div>
        <div class="botoes">${botoes}</div>`;
    }
    const sobreBtn = j.decks[p].includes('sobrecarga') && usavel(p, 'sobrecarga') && !j.sobre[p] && eu.length >= 4 ? `<button class="btn btn-duplo btn-papel" data-acao="sobrecarga"><span>Sobrecarga</span><small>+2 neste disparo</small></button>` : '';
    if (j.fase === 'decidir') {
      const L = eu.length, rk = risco(p), vale = pontos(L) + (j.sobre[p] && L >= 4 ? 2 : 0);
      let nivel, txt;
      const ocultas = j.armada[1 - p] && j.armada[1 - p] !== 'espelho' ? armadilhasOcultas(1 - p) : [];
      if (j.pts[p] + vale >= j.meta) { nivel = 'vence'; txt = `Disparar agora vence a partida${ocultas.includes('interferencia') && L >= 4 && j.pts[p] + vale - 1 < j.meta ? ', se a carta virada do rival não for a Interferência' : ''}.`; }
      else if (rk.bolso) { nivel = 'baixo'; txt = j.bolso[p] === null ? 'Seu Bolso está vazio: na próxima vez você sempre pode guardar o dado. Segurar não rompe.' : `O ${j.bolso[p]} do seu Bolso sincroniza com o seu ${frente(eu)}: segurar não rompe.`; }
      else if (rk.n >= 2) {
        if (rk.k === 0) { nivel = 'alto'; txt = `Nenhum dos ${rk.n} dados que ficam na Mesa sincroniza com o seu ${frente(eu)}. Se segurar, rompe na próxima vez.`; }
        else if (rk.k === 1) { nivel = 'medio'; txt = `Só 1 dado da Mesa sincroniza com o seu ${frente(eu)}, e o rival escolhe antes.`; }
        else { nivel = 'baixo'; txt = `${rk.k} dados da Mesa sincronizam com o seu ${frente(eu)}. O rival só pode tirar um.`; }
      } else {
        const chance = Math.round((1 - rk.r) * 100);
        nivel = chance >= 85 ? 'baixo' : chance >= 60 ? 'medio' : 'alto';
        txt = rk.n === 1 ? `A Mesa vai ser rolada de novo e você escolhe primeiro: ~${chance}% de ter um dado que sincroniza.`
                         : `A Mesa vai ser rolada de novo e o rival escolhe primeiro: ~${chance}% de sobrar um dado que sincroniza.`;
      }
      let extra = '';
      if (j.armada[p] === 'ancora' && L >= 4) extra += `<div class="risco baixo"><span>Sua Âncora está armada: uma ruptura seria evitada.</span></div>`;
      if (j.armada[1 - p] && j.armada[1 - p] !== 'espelho') extra += `<div class="risco aviso"><span>${cartaViradaTxt(1 - p, L)}</span></div>`;
      return `<div class="status">${quem}: corrente de <b>${L}</b>. Disparar ou segurar?</div>
        <div class="risco ${nivel}"><span>${txt}</span></div>${extra}
        <div class="botoes">
          <button class="btn btn-duplo btn-mel" data-acao="disparar"><span>Disparar</span><small>+${vale} agora</small></button>
          <button class="btn btn-duplo btn-papel" data-acao="segurar"><span>Segurar</span><small>${L + 1 <= LIM ? `com ${L + 1} vale +${pontos(L + 1)}` : 'continuar'}</small></button>
          ${sobreBtn}
        </div>`;
    }
    const algumSeguro = j.mesa.some(x => seguroDado(p, x));
    // um dado escolhido: para onde ele pode ir (nada saiu da Mesa ainda)
    const iSel = j.sel !== null && j.sel !== undefined ? idxDe(j.sel) : -1;
    if (j.fase === 'pegar' && iSel >= 0) {
      const op = opcoesDoDado(p, iSel), b = j.bolso[p], L = eu.length;
      const relTxt = x => { const r = L ? rels(frente(eu), x) : []; return r.length ? r.map(k => REL[k].nome).join(' + ') : (L && j.coringa[p] ? 'Coringa' : 'começa a corrente'); };
      const bt = (modo, rot, sub, cls) => `<button class="btn btn-duplo ${cls}" data-destino="${modo}"><span>${rot}</span><small>${sub}</small></button>`;
      const ancora = j.armada[p] === 'ancora' && L >= 4;
      let aviso = '', botoes = '';
      if (op.proprio) aviso = 'Esse é o dado do seu <b>Espelho</b>: pegá-lo desperdiça a armadilha.';
      if (op.rompe) aviso = `${op.contra ? 'Virado, ele' : 'Ele'} não sincroniza${b !== null && !op.contra ? ', nem o do Bolso' : ''}: a sua corrente de <b>${L}</b> ${ancora ? 'romperia, mas a sua <b>Âncora</b> segura' : 'vai romper'}.`;
      if (!op.rompe) {
        const cls = m => (m === op.principal ? 'btn-mel' : 'btn-papel');
        if (op.seguros.includes('corrente')) botoes += bt('corrente', 'Na corrente', relTxt(op.v), cls('corrente'));
        if (op.seguros.includes('guardar')) botoes += bt('guardar', 'Guardar', 'no Bolso', cls('guardar'));
        if (op.seguros.includes('trocar')) botoes += bt('trocar', 'Trocar', `entra o ${b} · ${relTxt(b)}`, cls('trocar'));
      } else {
        botoes += bt('corrente', ancora ? 'Pegar (a Âncora segura)' : 'Pegar e romper', ancora ? 'o dado ruim é jogado fora' : `a corrente de ${L} se perde`, 'btn-papel perigo');
        if (op.ds.includes('trocar')) botoes += bt('trocar', 'Trocar', `o ${b} entra e rompe; o ${op.v} fica`, 'btn-papel perigo');
      }
      const dica = op.principal ? 'Toque em outro dado para trocar, ou de novo neste para pegar.' : 'Toque em outro dado para trocar.';
      return `<div class="status">${quem}, você escolheu ${mini(op.d.v, skinMesa())} <b>${op.d.v}</b>${op.contra ? `, que chega virado como <b>${op.v}</b> (Espelho do rival) e não pode ir para o Bolso` : ''}. ${aviso}</div>
        <div class="botoes">${botoes}<button class="btn btn-papel" data-acao="cancelar">Cancelar</button></div><p class="nota" style="margin:0">${dica}</p>`;
    }
    let msg;
    if (j.segundoDado) msg = `escolha o segundo dado (Pressa) ou dispense${eu.length >= 3 ? ' e vá para o disparo' : ''}.`;
    else if (!algumSeguro) msg = `<b>nenhum dado sincroniza</b> com o seu ${frente(eu)}, nem o do Bolso. Use uma carta ou escolha um: a corrente de ${eu.length} rompe${j.armada[p] === 'ancora' && eu.length >= 4 ? ', mas a sua Âncora está armada' : ''}.`;
    else msg = eu.length ? `escolha um dado. Sua frente é <b>${frente(eu)}</b>: sincronizam ${j.coringa[p] ? 'todos (Coringa)' : facesQueEncaixam(eu).join(', ')}.` : 'escolha um dado. Sua corrente está vazia: qualquer um começa.';
    const prontas = j.decks[p].filter(c => usavel(p, c)).length;
    const dispensa = j.segundoDado ? `<div class="botoes"><button class="btn btn-papel" data-acao="dispensar">Dispensar o 2.º dado</button></div>` : '';
    return `<div class="status">${quem}, ${msg}</div>${dispensa}${prontas ? `<p class="nota" style="margin:0">Toque numa carta sua para usar (${prontas} ${prontas === 1 ? 'pronta' : 'prontas'}).</p>` : ''}`;
  }

  function render() {
    if (!jogo) return;
    const j = jogo;
    if (j.voo && !j.voo.de) { const el = document.querySelector(`.pega[data-id="${j.voo.id}"] .face`); if (el) j.voo.de = el.getBoundingClientRect(); }
    document.getElementById('tabuleiro').classList.toggle('modo-local', j.modo === 'local');
    document.getElementById('pj1').innerHTML = painel(1);
    document.getElementById('pj0').innerHTML = painel(0);
    const mesa = document.getElementById('mesa');
    mesa.innerHTML = mesaHTML();
    mesa.classList.toggle('alvo', j.fase === 'alvo');
    const resta = j.mesa.length;
    document.getElementById('mesaInfo').textContent = `rodada ${j.rodada} · ${resta} ${resta === 1 ? 'dado' : 'dados'}`;
    document.getElementById('acoes').innerHTML = acoesHTML();
    const n = nomes();
    const linha = l => `${l.p === null ? '' : `<span class="cor${l.p}">${n[l.p]}</span> `}${l.txt}`;
    document.getElementById('log').innerHTML = j.log.map(l => `<li class="${l.tipo}">${linha(l)}</li>`).join('');
    document.getElementById('ticker').innerHTML = j.log[0] ? linha(j.log[0]) : '';
    Som.musica.intensidade(Math.max(j.pts[0], j.pts[1]) / j.meta);
    if (j.fx && !j.fx.agendado) {
      const id = j.fx.id; j.fx.agendado = true;
      setTimeout(() => { if (jogo.fx && jogo.fx.id === id) { jogo.fx = null; render(); } }, st.pref.animacoes ? 900 : 10);
    }
    consumirEventos();
  }

  // ---------- eventos → som, efeitos e recompensas ----------
  const qs = s => document.querySelector(s);
  function consumirEventos() {
    const j = jogo, n = nomes();
    // o dado voa da Mesa até onde foi parar
    if (j.voo && j.voo.para) {
      const { de, v, p, para } = j.voo; j.voo = null;
      if (!de) return consumirResto(j, n);
      let alvo = null;
      if (para === 'corrente') { const s = document.querySelectorAll(`#pj${p} .corrente .slot[data-slot]`); alvo = s[s.length - 1] || null; }
      if (para === 'bolso') alvo = qs(`#pj${p} .bolso .mini`);
      if (alvo) Fx.voar(de, alvo, `<div style="width:100%;height:100%">${dadoHTML(v, skinDe(p))}</div>`);
    }
    consumirResto(j, n);
  }
  function consumirResto(j, n) {
    const evs = j.eventos.splice(0);
    for (const e of evs) {
      const painelEl = qs(`#pj${e.p} .jogador`);
      switch (e.tipo) {
        case 'rolar': Som.tocar('rolar'); break;
        case 'pegar': Som.tocar('pegar'); break;
        case 'bolso': setTimeout(() => Som.tocar('bolso'), 250); break;
        case 'troca': setTimeout(() => Som.tocar('troca'), 250); break;
        case 'elo': {
          setTimeout(() => {
            Som.tocar('elo', { n: e.n });
            const s = document.querySelectorAll(`#pj${e.p} .corrente .slot[data-slot]`); const alvo = s[s.length - 1];
            if (alvo) Fx.faiscas(alvo, 5 + e.n * 2, undefined, 1.6 + e.n * 0.3);
            if (e.n === 4) Fx.texto(alvo, 'Corrente de 4', 'pequeno');
            if (e.n === 5) Fx.texto(alvo, 'Corrente de 5', 'pequeno');
          }, 300);
          break;
        }
        case 'disparo': {
          const corEl = qs(`#pj${e.p} .corrente`), placar = qs(`[data-placar="${e.p}"]`);
          Som.tocar('disparo', { L: e.L });
          Fx.faiscas(corEl, 10 + e.L * 6, ['#ffe3a3', '#ffd0b5', '#fff6e6', e.p === 0 ? '#bfe8f2' : '#ffd0dc'], 2.5 + e.L * 0.5);
          if (placar) { Fx.contar(placar, e.de, jogo.pts[e.p]); setTimeout(() => Fx.pulsar(placar), 300); Fx.texto(placar, `+${e.ganho}`); }
          if (e.L >= 5) Fx.tremer(qs('#tabuleiro'), e.L === 6 ? 1.4 : 0.8);
          if (e.L === 6) { Fx.chamada('Sinfonia!', 'corrente completa de 6', e.p === 1 && j.modo !== 'local' ? 'rival' : ''); vibrar([30, 40, 60]); }
          else if (e.L === 5) Fx.chamada('Belo disparo!', `corrente de 5 · +${e.ganho}`, e.p === 1 && j.modo !== 'local' ? 'rival' : '');
          if (e.harm) Fx.chamada('Harmonia!', `todos os elos em ${REL[e.harm].nome}`, 'suave');
          if (e.L >= 4 && humano(e.p)) setTimeout(() => Som.tocar('momento'), 500);
          break;
        }
        case 'placar': { const pl = qs(`[data-placar="${e.p}"]`); if (pl) { Fx.contar(pl, e.de, jogo.pts[e.p]); Fx.pulsar(pl); Fx.texto(pl, '+3'); } break; }
        case 'ruptura': {
          Som.tocar('ruptura'); Fx.poeira(qs(`#pj${e.p} .corrente`), 8 + e.L * 2); if (humano(e.p)) vibrar(90);
          if (painelEl) Fx.tremer(painelEl, 0.6);
          if (e.L >= 4 && humano(e.p)) Fx.texto(qs(`#pj${e.p} .corrente`), 'Rompeu', 'pequeno ruim');
          break;
        }
        case 'salvo': Som.tocar('salvo'); Fx.chamada('Salvo!', e.txt, 'suave'); Fx.faiscas(qs(`#pj${e.p} .corrente`), 14, ['#cdeccf', '#fff6e6']); break;
        case 'bloqueio': Som.tocar('bloqueio'); Fx.texto(qs(`#pj${e.p} .corrente`) || null, 'Bloqueio!', 'pequeno'); break;
        case 'carta': Som.tocar('carta'); if (!humano(e.p) || j.modo === 'local') Fx.chamada(e.nome, `${n[e.p]} usou`, e.p === 1 && j.modo !== 'local' ? 'rival' : 'suave'); break;
        case 'armou': Som.tocar('armou'); if (!humano(e.p) || j.modo === 'local') Fx.texto(painelEl, e.c === 'espelho' ? 'Espelho!' : 'Carta virada!', 'pequeno'); break;
        case 'revelou': {
          Som.tocar('revelou'); Fx.chamada(CARTAS[e.c].nome + '!', e.txt, e.p === 1 && j.modo !== 'local' ? 'rival' : '');
          Fx.faiscas(painelEl, 22, ['#e2d6ff', '#fff6e6', '#ffe3a3']); vibrar([40, 60, 40]);
          break;
        }
        case 'virar': setTimeout(() => { if (jogo.virando === e.id) jogo.virando = null; }, 500); Som.tocar('virar'); break;
        case 'chamada': Som.tocar('momento'); Fx.chamada(e.titulo, e.sub, e.estilo === 'esquiva' ? (e.p === 1 && j.modo !== 'local' ? 'rival' : '') : e.estilo); break;
        case 'falar': if (j.modo === 'bot') falaDoEvento(e); break;
        case 'fim': {
          const venceuHumano = humano(e.p);
          if (venceuHumano) { Som.tocar('vitoria'); Fx.confete(120); Fx.chamada(e.virada ? 'Virada!' : j.modo !== 'local' ? 'Vitória!' : `${n[e.p]} venceu!`, e.virada ? 'veio de trás e venceu' : 'partida bem jogada'); }
          else { Som.tocar('derrota'); Fx.chamada('Fim de partida', `${n[e.p]} venceu desta vez`, 'rival'); }
          break;
        }
      }
    }
  }

  // ---------- tela de "versus" ----------
  function mostrarVersus() {
    const j = jogo, n = nomes();
    j.intro = true; render();
    const lado = p => {
      const av = j.modo === 'bot' && p === 1 ? Retratos.retrato(RETRATO_RIVAL[j.nivel]) : p === 0 ? iconeSVG(st.conta.icone) : iconeSVG(online() ? j.perfis[1].icone : 'raposa');
      const deck = j.decks[p].map(c => `<span class="carta ${CARTAS[c].tipo}">${CARTAS[c].arte}${CARTAS[c].nome}</span>`).join('') || '<span class="nota">sem cartas</span>';
      return `<div class="vs-lado">${av}<b class="cor${p}">${n[p]}</b><div class="vs-deck">${deck}</div></div>`;
    };
    const el = document.createElement('div');
    el.className = 'versus'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Começo da partida');
    el.innerHTML = `<div class="caixa"><h2>Dice Duel</h2><div class="vs-linha">${lado(0)}<span class="vs-x">×</span>${lado(1)}</div>
      <p class="nota">${j.modo === 'bot' ? RIVAIS[j.nivel].desc + '. ' : online() ? `Rating ${j.perfis[1].rating}. ` : ''}Meta: ${j.meta} pontos. ${n[j.vez]} começa.</p><button class="btn btn-mel">Vamos lá</button></div>`;
    document.body.appendChild(el);
    Som.tocar('carta');
    let fechou = false;
    const fechar = () => { if (fechou) return; fechou = true; el.remove(); j.intro = false; render(); talvezAutomato(); };
    el.addEventListener('click', () => { Som.desbloquear(); fechar(); });
    setTimeout(fechar, 3200);
  }

  function mostrarFim() {
    const j = jogo, n = nomes(), v = j.vencedor;
    if (j.fase !== 'fim' || jogo !== j) return;
    document.getElementById('fimTitulo').textContent = j.modo !== 'local' ? (v === 0 ? 'Você venceu!' : `${n[1]} venceu`) : `${n[v]} venceu!`;
    document.getElementById('fimPlacar').innerHTML = `<span class="cor0">${n[0]} ${j.pts[0]}</span> × <span class="cor1">${j.pts[1]} ${n[1]}</span>`;
    // repetições viram um item só ("×2"); os mais raros vêm primeiro
    const grupos = new Map();
    j.momentos.filter(m => humano(m.p)).forEach(m => { const k = m.p + m.txt; const g = grupos.get(k) || { ...m, vezes: 0 }; g.vezes++; grupos.set(k, g); });
    const ordemSimb = ['☾', '★', '✿', '✧', '❀', '↺', '✦', '♪'];
    const lances = [...grupos.values()].sort((a, b) => ordemSimb.indexOf(a.simbolo) - ordemSimb.indexOf(b.simbolo)).slice(0, 6);
    const momentos = lances
      .map(m => `<li><span class="em">${simboloMomento(m.simbolo)}</span><span>${j.modo === 'local' ? `<span class="cor${m.p}">${n[m.p]}</span> ` : ''}${m.txt}${m.vezes > 1 ? ` <b>×${m.vezes}</b>` : ''}</span></li>`).join('');
    const recs = (j.recordes || []).map(r => `<li class="recorde"><span class="em">${simboloMomento('✪')}</span>Novo: ${r}</li>`).join('');
    document.getElementById('fimMomentos').innerHTML = recs + (momentos || `<li><span class="em">${simboloMomento('☕')}</span>Sem lances marcantes desta vez.</li>`);
    desenharRecompensas(j);
    const s = j.stats, linha = (rot, f) => `<tr><th>${rot}</th><td>${f(s[0], 0)}</td><td>${f(s[1], 1)}</td></tr>`;
    document.getElementById('fimTabela').innerHTML =
      `<tr><th></th><th class="cor0">${n[0]}</th><th class="cor1">${n[1]}</th></tr>` +
      linha('Deck', (x, p) => j.decks[p].map(c => CARTAS[c].nome).join(', ') || '–') +
      linha('Cartas que agiram', x => x.cartas.join(', ') || '–') +
      linha('Disparos', x => x.disp) + linha('Maior corrente', x => x.maior || '–') + linha('Rupturas', x => x.rupt) +
      linha('Bolso (guardou · trocou)', x => `${x.guardou} · ${x.trocou}`);
    prepararCartao(j, lances);
    document.getElementById('btnDeNovo').textContent = online() ? 'Revanche' : 'Jogar de novo';
    document.getElementById('fim').hidden = false;
    document.getElementById('btnDeNovo').focus();
  }

  // o cartão do fim (imagem para o grupo). Fica pronto antes do toque: o iPhone só compartilha arquivo dentro do próprio toque.
  let cartao = null;
  function prepararCartao(j, lances) {
    const n = nomes(), pr = j.premio, eu = st.sessao && st.sessao.perfil ? st.sessao.perfil.nome : n[0];
    const quem = [j.modo === 'local' ? n[0] : eu, n[1]];
    const icone = id => (ICONES[id] ? id : 'bolinha');
    const dr = pr ? pr.rating - pr.ratingAntes : 0;
    const d = {
      titulo: `${quem[j.vencedor]} venceu!`,
      modo: j.modo === 'bot' ? `contra ${n[1]} · meta ${j.meta}` : online() ? `duelo online · meta ${j.meta}` : `a dois na mesma mesa · meta ${j.meta}`,
      nomes: quem, pts: j.pts.slice(), vencedor: j.vencedor,
      retratos: [icone(st.conta.icone), j.modo === 'bot' ? RETRATO_RIVAL[j.nivel] : online() ? icone(j.perfis[1].icone) : 'raposa'],
      destaque: online() && pr && !pr.amistosa ? `Rating online ${pr.ratingAntes} → ${pr.rating} (${dr >= 0 ? '+' : ''}${dr}) · ${tituloDe(pr.rating)}`
        : (j.recordes || []).length ? `Novo recorde: ${j.recordes[0]}` : '',
      linhas: lances.map(m => ({ simbolo: m.simbolo, src: srcMomento(m.simbolo), txt: `${j.modo === 'local' ? n[m.p] + ': ' : ''}${m.txt}${m.vezes > 1 ? ` ×${m.vezes}` : ''}` })),
      endereco: PAGINA ? location.host : 'diceduel-game.vercel.app',
    };
    const este = { blob: null };
    este.promessa = Cartao.gerar(d).then(b => { este.blob = b; return b; });
    este.promessa.catch(() => {});
    cartao = este;
  }
  function baixar(blob, nome) {
    const a = document.createElement('a'), url = URL.createObjectURL(blob);
    a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  const fmt =x => String(x).replace('.', ',');
  const nomeItem = (tipo, id) => ({ cartas: CARTAS, dados: DADOS, icones: ICONES, mesas: MESAS })[tipo][id].nome;
  function desenharRecompensas(j) {
    const el = document.getElementById('fimRecompensas');
    if (j.modo === 'local') { el.innerHTML = '<span class="conta">Partidas a dois no mesmo aparelho não dão moedas nem rating (assim ninguém farma sozinho).</span>'; return; }
    if (!j.premio) { el.innerHTML = '<span class="conta">Contando o prêmio…</span>'; return; }
    const pr = j.premio, m = pr.moedas, c = st.conta, rival = j.modo === 'bot' ? RIVAIS[j.nivel].nome : nomes()[1];
    let linhaMoedas;
    if (pr.motivo && !(m && m.total)) linhaMoedas = `<span class="conta">${pr.motivo}</span>`;
    else if (!m) linhaMoedas = `<span class="conta">Moedas vêm das vitórias. A próxima é sua.</span>`;
    else if (j.modo === 'bot' && !m.elegivel) linhaMoedas = `<span class="conta">Seu maior rating (${pr.pico}) já passou do que ${rival} paga (até ${TETO_MOEDAS[j.nivel] - 1}). ${j.nivel === 'aprendiz' ? 'A Dona Coruja ainda paga.' : 'As próximas moedas virão do online.'}</span>`;
    else if (m.tetoDia) linhaMoedas = `<span class="conta">Você chegou ao teto do dia contra os rivais do jogo. Amanhã tem mais; o online não tem teto.</span>`;
    else linhaMoedas = `<span class="conta">vitória ${online() ? 'online' : 'contra ' + rival}: ${m.base} × margem ×${fmt(m.mm.toFixed(2))} × rapidez ×${fmt(m.mr)}${online() ? ` × rating do rival ×${fmt(m.mrat.toFixed(2))}` : ` (${j.rodada} Mesas)`}</span>`;
    const dr = pr.rating - pr.ratingAntes;
    const prox = NIVEIS[pr.nivelDepois] ?? null, ant = NIVEIS[pr.nivelDepois - 1];
    const pct = prox === null ? 100 : Math.round((c.xp - ant) / (prox - ant) * 100);
    const presentes = pr.presentes.map(x => `<div class="linha"><span>Presente do nível: ${nomeItem(x.tipo, x.id)}</span><span class="sobe">novo!</span></div>`).join('');
    el.innerHTML = `<div class="grande"><span class="moeda" aria-hidden="true"></span><span id="contaMoedas">+0</span></div>${linhaMoedas}
      <div class="linha"><span>${online() ? 'Rating online' : 'Rating'} ${pr.ratingAntes} → <b>${pr.rating}</b> <span class="${dr >= 0 ? 'sobe' : 'desce'}">(${dr >= 0 ? '+' : ''}${dr})</span></span><span>${tituloDe(pr.rating)}</span></div>
      <div class="linha"><span>Nível ${pr.nivelDepois}${pr.nivelDepois > pr.nivelAntes ? ' <span class="sobe">subiu!</span>' : ''}</span><span>+${pr.xpGanho} XP</span></div>
      <div class="xp"><i style="width:${pct}%"></i></div>${presentes}`;
    const total = m ? m.total : 0, alvo = document.getElementById('contaMoedas');
    if (total) {
      setTimeout(() => { Fx.contar(alvo, 0, total); setTimeout(() => { alvo.textContent = '+' + total; }, 600); Som.tocar('moeda', { n: Math.ceil(total / 5) }); Fx.faiscas(alvo, 18, ['#ffe3a3', '#f2c14e', '#fff6e6']); }, 350);
    }
    if (pr.nivelDepois > pr.nivelAntes) setTimeout(() => { Som.tocar('nivel'); Fx.chamada(`Nível ${pr.nivelDepois}!`, pr.presentes.length ? 'você ganhou um presente na Loja' : 'continue assim', 'suave'); }, 900);
  }

  // ---------- loja ----------
  function abrirLoja(aba) {
    if (aba) st.abaLoja = aba;
    desenharLoja();
    document.getElementById('janelaLoja').hidden = false;
  }
  function desenharLoja() {
    const c = st.conta, aba = st.abaLoja;
    document.getElementById('saldoLoja').textContent = c.moedas;
    document.getElementById('saldo').textContent = c.moedas;
    const nv = nivelDe(c.xp), prox = NIVEIS[nv] ?? null, ant = NIVEIS[nv - 1];
    document.getElementById('lojaPerfil').innerHTML = `${iconeSVG(c.icone)}<span class="titulo-rating">${tituloDe(c.rating)}</span>
      <span class="nota">${c.online ? `${esc(c.online.nome)} · online ${c.online.rating} · solo ${c.rating}` : `Rating ${c.rating}`} · Nível ${nv}</span>
      <div class="xp" title="experiência"><i style="width:${prox === null ? 100 : Math.round((c.xp - ant) / (prox - ant) * 100)}%"></i></div>`;
    document.querySelectorAll('#abasLoja [data-aba-loja]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.abaLoja === aba)));
    const alvo = document.getElementById('lojaConteudo');
    if (aba === 'ganhar') {
      alvo.innerHTML = `<table class="taxas">
        <tr><th>Partida</th><th>Base</th><th>Paga moedas enquanto o seu maior rating estiver</th></tr>
        <tr><td>Diana (iniciante)</td><td>${BASE_MOEDAS.aprendiz}</td><td>rating abaixo de ${TETO_MOEDAS.aprendiz}</td></tr>
        <tr><td>Dona Coruja (avançado)</td><td>${BASE_MOEDAS.esperto}</td><td>rating abaixo de ${TETO_MOEDAS.esperto}</td></tr>
        <tr><td>Online, com amigos</td><td>${BASE_MOEDAS.online}</td><td>sempre; vale mais vencer quem tem rating maior</td></tr>
        <tr><td>A dois no aparelho</td><td>–</td><td>não paga</td></tr></table>
        <p class="nota" style="margin-top:10px">Só vitórias dão moedas. A base é multiplicada pela <b>margem</b> (×1 a ×2: vencer por 8 pontos ou mais, na meta 12, dobra) e pela <b>rapidez</b> (×1,5 em até 5 Mesas, ×1,25 em 6). Uma vitória típica rende cerca de 14 contra a Diana e 24 contra a Dona Coruja. Com conta, as vitórias contra os rivais do jogo rendem até 300 moedas por dia.</p>
        <p class="nota">Experiência sobe em toda partida, ganhando ou perdendo, e os níveis 2, 3 e 5 dão presentes. Cartas nunca serão vendidas por dinheiro: elas ampliam o estilo, não a força (o melhor deck é feito só de cartas grátis).</p>`;
      return;
    }
    const item = (tipo, id, info, previa, sub) => {
      const tem = c[tipo].includes(id), usando = tipo !== 'cartas' && c[tipo.slice(0, -1) === 'icone' ? 'icone' : tipo === 'dados' ? 'dado' : 'mesa'] === id;
      let botao;
      if (tem && tipo === 'cartas') botao = `<button class="btn btn-papel" disabled>${GRATIS.includes(id) ? 'Grátis' : 'Sua'}</button>`;
      else if (tem) botao = usando ? `<button class="btn btn-papel" disabled>Usando</button>` : `<button class="btn btn-mel" data-usar-item="${tipo}:${id}">Usar</button>`;
      else if (info.nivel) botao = `<button class="btn btn-papel" disabled>Nível ${info.nivel}</button>`;
      else if (c.moedas < info.preco) botao = `<button class="btn btn-duplo btn-papel" disabled><span><span class="moeda"></span> ${info.preco}</span><small>faltam ${info.preco - c.moedas}</small></button>`;
      else botao = `<button class="btn btn-mel" data-comprar="${tipo}:${id}"><span class="moeda"></span>${info.preco}</button>`;
      return `<div class="item${usando ? ' usando' : ''}"><div class="previa">${previa}</div><b>${info.nome}</b><small>${sub}</small>${botao}</div>`;
    };
    let html = '';
    if (aba === 'cartas') html = ORDEM.map(id => item('cartas', id, { nome: CARTAS[id].nome, preco: PRECO_CARTA[id] || 0 }, CARTAS[id].arte, `${CARTAS[id].tipo}${CARTAS[id].pontos ? ` · <span class="raio">${RAIO}</span>` : ''} · ${CARTAS[id].verbo}`)).join('');
    if (aba === 'dados') html = Object.entries(DADOS).map(([id, d]) => item('dados', id, d, `<span style="width:52px;height:52px;display:block">${dadoHTML(5, id)}</span>`, d.desc)).join('');
    if (aba === 'icones') html = GRUPOS_ICONES.map(([g, titulo]) => `<h3 class="grupo-loja">${titulo}</h3>` + Object.entries(ICONES).filter(([, d]) => d.grupo === g).map(([id, d]) => item('icones', id, d, iconeSVG(id), d.desc)).join('')).join('');
    if (aba === 'mesas') html = Object.entries(MESAS).map(([id, d]) => item('mesas', id, d, `<span class="amostra-mesa" style="background:${d.amostra}"></span>`, d.nivel ? `presente do nível ${d.nivel}` : 'o feltro da sua mesa')).join('');
    alvo.innerHTML = `<div class="itens">${html}</div>${aba === 'cartas' ? '<p class="nota" style="margin-top:10px">As cartas à venda são situacionais: dão jeitos novos de jogar, não mais força. Na simulação, nenhum deck com carta comprada supera o melhor deck de cartas grátis.</p>' : '<p class="nota" style="margin-top:10px">Só aparência. Na versão final, alguns cosméticos também poderão ser comprados com dinheiro; cartas, nunca.</p>'}`;
  }
  function comprar(tipo, id, botao) {
    const c = st.conta;
    const info = tipo === 'cartas' ? { preco: PRECO_CARTA[id] } : ({ dados: DADOS, icones: ICONES, mesas: MESAS })[tipo][id];
    if (!info || c[tipo].includes(id) || c.moedas < info.preco) return;
    if (botao.dataset.certeza !== '1') { botao.dataset.certeza = '1'; botao.innerHTML = `Confirmar? <span class="moeda"></span>${info.preco}`; return; }
    const festa = () => { if (jogo) render(); Som.tocar('compra'); Fx.confete(60); Fx.chamada('Na coleção', `${nomeItem(tipo, id)} agora é seu`, 'suave'); };
    if (st.sessao) {
      botao.disabled = true;
      pedir('POST', '/api/loja/comprar', { tipo, id })
        .then(r => { usarPerfil(r.conta); festa(); return tipo !== 'cartas' && pedir('POST', '/api/loja/usar', { tipo, id }).then(x => { usarPerfil(x.conta); if (jogo) render(); }); })
        .catch(e => { desenharLoja(); Fx.chamada('Loja', e.message, 'suave'); });
      return;
    }
    c.moedas -= info.preco; c[tipo].push(id);
    if (tipo === 'dados') c.dado = id; if (tipo === 'icones') c.icone = id; if (tipo === 'mesas') c.mesa = id;
    salvar(); aplicarPrefs(); desenharLoja(); festa();
  }

  // ---------- montar o deck ----------
  // partida em andamento: mexer no deck não pode abandoná-la sem querer
  const partidaEmAndamento = () => !!(jogo && jogo.fase !== 'fim' && (jogo.compras > 0 || online()));
  function abrirDeck() {
    const local = st.cfg.modo === 'local';
    const andando = partidaEmAndamento();
    document.getElementById('btnJogarDeck').textContent = andando ? 'Salvar deck' : 'Jogar';
    document.getElementById('deckEmAndamento').hidden = !andando;
    document.getElementById('btnRecomecar').hidden = online();
    document.getElementById('btnRecomecar').textContent = jogo && jogo.modo === 'bot' ? 'Recomeçar agora (conta como derrota)' : 'Recomeçar agora';
    document.getElementById('abasDeck').hidden = !local;
    if (!local) st.abaDeck = 0;
    document.querySelectorAll('#abasDeck [data-aba]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.aba === st.abaDeck)));
    document.getElementById('deckTitulo').textContent = local ? `Deck do Jogador ${st.abaDeck + 1}` : 'Monte seu deck';
    desenharDeck();
    document.getElementById('janelaDeck').hidden = false;
  }
  function desenharDeck() {
    const d = st.decks[st.abaDeck] = st.decks[st.abaDeck].filter(disponivel);
    const nt = d.filter(c => CARTAS[c].tipo === 'armadilha').length, np = d.filter(c => CARTAS[c].pontos).length;
    document.getElementById('deckContador').innerHTML = `<b>${d.length}/3</b> cartas · ${nt}/2 armadilhas · ${np}/1 de pontos <span class="raio">${RAIO}</span>${d.length ? ' · ' + d.map(c => CARTAS[c].nome).join(', ') : ''}`;
    document.getElementById('deckProntos').innerHTML = PRONTOS.filter(k => k.cartas.every(disponivel)).map(k => `<button data-pronto="${PRONTOS.indexOf(k)}">${k.nome} <small>${k.cartas.map(c => CARTAS[c].nome).join(' · ')}${k.nota ? ' (' + k.nota + ')' : ''}</small></button>`).join('');
    document.getElementById('deckGrade').innerHTML = ORDEM.map(c => {
      const k = CARTAS[c], dentro = d.includes(c), trav = travada(c), aVenda = !possui(c);
      const cabe = !trav && !aVenda && (dentro || deckValido(d.concat(c)));
      const aviso = aVenda ? `<span class="cadeado"><span class="moeda"></span> ${PRECO_CARTA[c]} na Loja · toque para ver</span>` : trav ? '<span class="cadeado">Libera depois da sua 1ª partida</span>' : '';
      return `<button class="carta-op" data-op="${c}" ${aVenda ? 'data-na-loja="1"' : ''} aria-pressed="${dentro}" ${cabe || aVenda ? '' : 'disabled'}>${k.arte}<b>${k.nome}${k.pontos ? ` <span class="raio">${RAIO}</span>` : ''}<span class="tipo">${k.tipo}</span></b><span class="txt">${k.texto}</span>${aviso}</button>`;
    }).join('');
  }

  // ---------- ajustes ----------
  function abrirConfig() {
    const p = st.pref;
    document.querySelectorAll('#janelaConfig [data-cfg]').forEach(b => b.setAttribute('aria-pressed', String(st.cfg[b.dataset.cfg] + '' === b.dataset.v)));
    document.getElementById('linhaNivel').hidden = st.cfg.modo !== 'bot';
    document.getElementById('rivalDesc').textContent = RIVAIS[st.cfg.nivel].desc;
    const marcar = (id, v) => { document.getElementById(id).checked = v; };
    marcar('opSom', p.som); marcar('opMusica', p.musica); marcar('opAnim', p.animacoes); marcar('opParticulas', p.particulas);
    marcar('opTremor', p.tremor); marcar('opVibrar', p.vibrar); marcar('opFalas', p.falas); marcar('opDicas', p.dicas); marcar('opLiberar', p.liberar);
    document.getElementById('volSom').value = p.volSom; document.getElementById('volMusica').value = p.volMusica;
    const r = st.rec;
    document.getElementById('resumoRecordes').textContent = `${r.vitorias} vitórias em ${r.partidas} partidas · maior disparo +${r.maiorDisparo} · melhor sequência ${r.melhorSeq}`;
    document.getElementById('janelaConfig').hidden = false;
  }

  // ---------- painel de regras ----------
  document.getElementById('relacoes').innerHTML = [
    ['eco', 4, 4, 'mesmo número'], ['passo', 4, 5, 'um a mais ou a menos'], ['oposto', 2, 5, 'somam 7, como as faces opostas do dado'],
  ].map(([k, a, b, txt]) => `<div class="ex">${mini(a)}<span class="seta">→</span>${mini(b)}</div>
    <div><span class="rel-nome ${k}">${REL[k].nome}</span> <span class="nota">(${REL[k].simb})</span><br><span class="nota">${txt}</span></div>`).join('');
  document.getElementById('valorFaces').innerHTML = [1, 2, 3, 4, 5, 6].map(f => {
    const fs = facesQueEncaixam([f]);
    return `<div class="${fs.length > 3 ? 'forte' : ''}">${mini(f)}<span><b>${fs.length} faces</b><br>${fs.join(' ')}</span></div>`;
  }).join('');
  document.querySelectorAll('span.raio').forEach(el => { el.innerHTML = RAIO; });
  document.getElementById('listaCartas').innerHTML = ORDEM.map(c => `<div>${CARTAS[c].arte}<span><b>${CARTAS[c].nome}${CARTAS[c].pontos ? ` <span class="raio">${RAIO}</span>` : ''}</b> <span class="nota">(${CARTAS[c].tipo})</span>. ${CARTAS[c].texto}</span></div>`).join('');

  // ---------- eventos da interface ----------
  // o áudio só pode começar depois de um toque (no iPhone o toque só vale no fim dele: touchend/click, não pointerdown)
  for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) addEventListener(ev, () => Som.desbloquear(), { capture: true });
  // um "tique" macio em todo botão
  document.addEventListener('click', e => { if (e.target.closest('button') && !e.target.closest('.pega')) Som.tocar('toque'); }, true);

  const lado = document.getElementById('lado'), btnRegras = document.getElementById('btnRegras');
  const abrirLado = abre => {
    lado.classList.toggle('aberto', abre); btnRegras.setAttribute('aria-expanded', String(abre));
    document.body.style.overflow = abre && innerWidth < 1040 ? 'hidden' : '';
    if (abre && innerWidth < 1040) document.getElementById('btnFecharLado').focus();
  };
  btnRegras.addEventListener('click', () => abrirLado(!lado.classList.contains('aberto')));
  document.getElementById('btnFecharLado').addEventListener('click', () => { abrirLado(false); btnRegras.focus(); });
  document.getElementById('btnDeck').addEventListener('click', abrirDeck);
  document.getElementById('btnConfig').addEventListener('click', abrirConfig);
  document.getElementById('btnCarteira').addEventListener('click', () => abrirLoja());
  document.getElementById('btnFecharLoja').addEventListener('click', () => { document.getElementById('janelaLoja').hidden = true; });
  document.getElementById('abasLoja').addEventListener('click', e => { const b = e.target.closest('[data-aba-loja]'); if (b) { st.abaLoja = b.dataset.abaLoja; desenharLoja(); } });
  document.getElementById('lojaConteudo').addEventListener('click', e => {
    const cb = e.target.closest('[data-comprar]'); if (cb) { const [t, id] = cb.dataset.comprar.split(':'); comprar(t, id, cb); return; }
    const ub = e.target.closest('[data-usar-item]');
    if (ub && st.sessao) { const [t, id] = ub.dataset.usarItem.split(':'); pedir('POST', '/api/loja/usar', { tipo: t, id }).then(r => { usarPerfil(r.conta); if (jogo) render(); Som.tocar('momento'); }).catch(e => Fx.chamada('Loja', e.message, 'suave')); return; }
    if (ub) { const [t, id] = ub.dataset.usarItem.split(':'); st.conta[t === 'dados' ? 'dado' : t === 'icones' ? 'icone' : 'mesa'] = id; salvar(); aplicarPrefs(); desenharLoja(); if (jogo) render(); Som.tocar('momento'); }
  });

  document.getElementById('mesa').addEventListener('click', e => { const b = e.target.closest('.pega'); if (b && !b.disabled) clicarDado(+b.dataset.i); });
  document.getElementById('tabuleiro').addEventListener('click', e => {
    const b = e.target.closest('[data-carta]'); if (!b || !jogo) return;
    abrirCarta(+b.dataset.dono, b.dataset.carta);
  });
  document.getElementById('cartaBotoes').addEventListener('click', e => {
    if (e.target.closest('[data-fechar-carta]')) { document.getElementById('janelaCarta').hidden = true; return; }
    const j = jogo, p = j.vez;
    if (!humano(p) || j.pensando) return;
    const bv = e.target.closest('[data-virar]');
    if (bv) { if (podeVirar(p, bv.dataset.virar).ok) { document.getElementById('janelaCarta').hidden = true; virarCarta(p, bv.dataset.virar); render(); } return; }
    const b = e.target.closest('[data-usar]'); if (!b || b.disabled) return;
    const c = b.dataset.usar;
    if (!podeUsar(p, c).ok) return;
    document.getElementById('janelaCarta').hidden = true;
    j.sel = null;
    if (CARTAS[c].alvo) { j.fase = 'alvo'; j.alvo = c; }
    else usarCarta(p, c);
    render();
  });
  document.getElementById('acoes').addEventListener('click', e => {
    const j = jogo;
    const dst = e.target.closest('[data-destino]');
    if (dst && j.fase === 'pegar' && j.sel && humano(j.vez) && !j.pensando) { pegarDado(dst.dataset.destino); return; }
    if (dst && j.fase === 'destino' && j.mao && humano(j.vez)) { colocar(j.vez, j.mao.v, dst.dataset.destino); return; }
    const aj = e.target.closest('[data-ajuste]');
    if (aj && j.fase === 'ajuste') { const idx = j.ajusteIdx; j.fase = 'pegar'; j.alvo = null; j.ajusteIdx = null; usarCarta(j.vez, 'ajuste', idx, +aj.dataset.ajuste); render(); return; }
    const b = e.target.closest('[data-acao]'); if (!b) return;
    const a = b.dataset.acao;
    if (a === 'nova') return novaPartida();
    if (a === 'deck') return abrirDeck();
    if (a === 'cancelar' || a === 'cancelar-alvo') return cancelarEscolha();
    if (a === 'confirmar-alvo') return confirmarAlvo();
    if (a === 'dispensar' && j.segundoDado && j.fase === 'pegar' && humano(j.vez)) { dispensarSegundo(j.vez); return; }
    if (a === 'cancelar-alvo') { j.fase = 'pegar'; j.alvo = null; j.ajusteIdx = null; return render(); }
    if (a === 'sobrecarga' && podeUsar(j.vez, 'sobrecarga').ok) { usarCarta(j.vez, 'sobrecarga'); return render(); }
    if (j.fase !== 'decidir' || !humano(j.vez)) return;
    if (a === 'disparar') disparar(j.vez);
    if (a === 'segurar') segurar(j.vez);
  });
  // ajustes
  document.querySelectorAll('#janelaConfig [data-cfg]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.cfg;
    st.cfg[k] = k === 'meta' ? +b.dataset.v : b.dataset.v;
    salvar(); abrirConfig();
    if (k === 'ritmo') return;
    if (online()) { if (k === 'modo') sairDaSala(); return; }
    if (!jogo || jogo.compras === 0) novaPartida();
    else document.getElementById('avisoCfg').hidden = false;
  }));
  const liga = (id, chave) => document.getElementById(id).addEventListener('change', e => {
    st.pref[chave] = e.target.checked; salvar(); aplicarPrefs();
    if (chave === 'som' && e.target.checked) { Som.desbloquear(); Som.tocar('momento'); }
    if (chave === 'liberar') desenharDeck();
    if (jogo) render();
  });
  liga('opSom', 'som'); liga('opMusica', 'musica'); liga('opAnim', 'animacoes'); liga('opParticulas', 'particulas');
  liga('opTremor', 'tremor'); liga('opVibrar', 'vibrar'); liga('opFalas', 'falas'); liga('opDicas', 'dicas'); liga('opLiberar', 'liberar');
  document.getElementById('volSom').addEventListener('input', e => { st.pref.volSom = +e.target.value; aplicarPrefs(); salvar(); });
  document.getElementById('volSom').addEventListener('change', () => Som.tocar('elo', { n: 3 }));
  document.getElementById('volMusica').addEventListener('input', e => { st.pref.volMusica = +e.target.value; aplicarPrefs(); salvar(); });
  document.getElementById('btnZerar').addEventListener('click', e => {
    const b = e.target;
    if (b.dataset.certeza !== '1') { b.dataset.certeza = '1'; b.textContent = 'Toque de novo'; setTimeout(() => { b.dataset.certeza = ''; b.textContent = 'Apagar'; }, 2500); return; }
    st.rec = { partidas: 0, vitorias: 0, seq: 0, melhorSeq: 0, maiorDisparo: 0, maiorCorrente: 0 }; salvar(); abrirConfig();
    b.dataset.certeza = ''; b.textContent = 'Apagado';
  });
  document.getElementById('btnFecharConfig').addEventListener('click', () => { document.getElementById('janelaConfig').hidden = true; });

  document.getElementById('btnTrocarDeck').addEventListener('click', () => { document.getElementById('fim').hidden = true; abrirDeck(); });
  document.getElementById('btnDeNovo').addEventListener('click', novaPartida);
  document.getElementById('btnFechar').addEventListener('click', () => { document.getElementById('fim').hidden = true; });
  document.getElementById('btnFecharDeck').addEventListener('click', () => { document.getElementById('janelaDeck').hidden = true; });
  document.getElementById('btnJogarDeck').addEventListener('click', () => {
    st.deckVisto = true; salvar();
    if (partidaEmAndamento() && !online()) { document.getElementById('janelaDeck').hidden = true; Fx.chamada('Deck salvo', 'vale a partir da próxima partida', 'suave'); return; }
    novaPartida();
  });
  // recomeçar no meio: contra o rival do jogo conta como derrota (senão abandonar seria um jeito de nunca perder rating)
  document.getElementById('btnRecomecar').addEventListener('click', () => {
    document.getElementById('janelaDeck').hidden = true;
    if (!jogo || online()) return;
    if (jogo.modo === 'bot' && jogo.fase !== 'fim' && jogo.compras > 0) { jogo.token = Math.random(); jogo.pensando = false; R.desistir(jogo, 0); depois('fim'); return; }
    novaPartida();
  });
  document.getElementById('abasDeck').addEventListener('click', e => { const b = e.target.closest('[data-aba]'); if (!b) return; st.abaDeck = +b.dataset.aba; abrirDeck(); });
  document.getElementById('deckGrade').addEventListener('click', e => {
    const b = e.target.closest('[data-op]'); if (!b || b.disabled) return;
    if (b.dataset.naLoja) { document.getElementById('janelaDeck').hidden = true; abrirLoja('cartas'); return; }
    const d = st.decks[st.abaDeck], c = b.dataset.op;
    st.decks[st.abaDeck] = d.includes(c) ? d.filter(x => x !== c) : d.concat(c);
    Som.tocar('carta'); salvar(); desenharDeck();
  });
  document.getElementById('deckProntos').addEventListener('click', e => {
    const b = e.target.closest('[data-pronto]'); if (!b) return;
    st.decks[st.abaDeck] = PRONTOS[+b.dataset.pronto].cartas.slice(); Som.tocar('carta'); salvar(); desenharDeck();
  });
  // compartilha a imagem do cartão (WhatsApp, Instagram…); onde não dá para compartilhar arquivo, ela é baixada
  document.getElementById('btnCompartilhar').addEventListener('click', async () => {
    const b = document.getElementById('btnCompartilhar');
    const blob = cartao && (cartao.blob || await cartao.promessa.catch(() => null));
    if (!blob) { Fx.chamada('Ops', 'Não deu para montar a imagem.', 'suave'); return; }
    const arq = new File([blob], 'dice-duel.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [arq] })) {
      try { await navigator.share({ files: [arq] }); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
    baixar(blob, 'dice-duel.png');
    b.textContent = 'Imagem salva';
    setTimeout(() => { b.textContent = 'Compartilhar'; }, 2200);
  });
  document.addEventListener('keydown', e => {
    const alvo = e.target && e.target.closest ? e.target : document.body;   // tecla vinda do documento não tem .closest
    if (!jogo || alvo.closest('textarea, input') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Escape') {
      ['fim', 'janelaCarta', 'janelaDeck', 'janelaConfig', 'janelaLoja'].forEach(id => { document.getElementById(id).hidden = true; }); abrirLado(false);
      return cancelarEscolha();
    }
    if (['janelaCarta', 'janelaDeck', 'janelaConfig', 'janelaLoja'].some(id => !document.getElementById(id).hidden)) return;
    if (/^[1-5]$/.test(e.key)) { clicarDado(+e.key - 1); return; }
    const k = e.key.toLowerCase();
    // com um dado escolhido: Enter (ou C) põe na corrente/destino principal, B guarda ou troca
    if (k === 'enter' && alvo.closest('button')) return;   // Enter num botão focado já é o clique dele
    if (jogo.sel != null && humano(jogo.vez) && !jogo.pensando) {
      if (jogo.fase === 'alvo' && k === 'enter') return confirmarAlvo();
      if (jogo.fase === 'pegar') {
        const op = opcoesDoDado(jogo.vez, idxDe(jogo.sel));
        if (k === 'enter' && op.principal) return pegarDado(op.principal);
        if (k === 'c' && op.ds.includes('corrente') && !op.rompe) return pegarDado('corrente');
        if (k === 'b') { const m = op.seguros.find(x => x !== 'corrente'); if (m) return pegarDado(m); }
      }
    }
    if (jogo.fase === 'destino' && jogo.mao && humano(jogo.vez)) {
      const ds = destinos(jogo.vez, jogo.mao.v);
      if (k === 'c' && ds.includes('corrente')) colocar(jogo.vez, jogo.mao.v, 'corrente');
      if (k === 'b') { const m = ds.find(x => x !== 'corrente'); if (m) colocar(jogo.vez, jogo.mao.v, m); }
      return;
    }
    if (jogo.fase === 'decidir' && humano(jogo.vez) && !jogo.pensando) {
      if (k === 'd') disparar(jogo.vez);
      if (k === 's') segurar(jogo.vez);
    }
  });

  // ---------- online: conta, loja no servidor e salas por convite (servidor/ e docs/servidor.md) ----------
  // Sem conta, tudo fica no aparelho (como antes). Com conta, moedas e itens moram no servidor e o
  // st.conta vira um espelho do perfil; o progresso de convidado fica guardado à parte.
  // a API mora no endereço da <meta name="dice-servidor"> (página no Vercel) ou no mesmo da página (o servidor serve
  // a página com a meta vazia); por file:// não há online. O convite usa sempre o endereço da página.
  const PAGINA = /^https?:$/.test(location.protocol) ? location.origin : null;
  const API = PAGINA && ((document.querySelector('meta[name="dice-servidor"]') || {}).content || PAGINA).replace(/\/$/, '');
  const Rede = { ws: null, ola: false, sala: null, infoSala: null, tentativas: 0, ranking: null, convite: null, aba: 'entrar', pediuRevanche: false, aviso: null };
  try { st.sessao = JSON.parse(localStorage.getItem('diceduel.sessao') || 'null'); } catch (e) { st.sessao = null; }
  const guardarSessao = () => { try { if (st.sessao) localStorage.setItem('diceduel.sessao', JSON.stringify(st.sessao)); else localStorage.removeItem('diceduel.sessao'); } catch (e) {} };
  const deServidor = pf => ({
    moedas: pf.moedas, xp: pf.xp, cartas: pf.cartas, dados: pf.dados, icones: pf.icones, mesas: pf.mesas,
    dado: pf.ativo.dado, icone: pf.ativo.icone, mesa: pf.ativo.mesa, rating: pf.solo_rating, pico: pf.solo_pico,
    online: { nome: pf.nome, rating: pf.rating, partidas: pf.partidas, vitorias: pf.vitorias, titulo: pf.titulo },
  });
  function usarPerfil(pf) {
    if (!st.sessao) return;
    st.sessao.perfil = pf; st.conta = deServidor(pf); guardarSessao(); aplicarPrefs();
    if (!document.getElementById('janelaLoja').hidden) desenharLoja();
    if (!document.getElementById('janelaOnline').hidden) desenharOnline();
  }
  if (st.sessao && st.sessao.perfil) { st.contaConvidado = st.conta; st.conta = deServidor(st.sessao.perfil); }

  async function pedir(metodo, rota, corpo) {
    if (!API) throw new Error('Este aparelho não sabe onde está o servidor.');
    let r;
    try {
      r = await fetch(API + rota, { method: metodo, headers: { 'content-type': 'application/json', ...(st.sessao ? { authorization: 'Bearer ' + st.sessao.token } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined });
    } catch (e) { throw new Error('Sem conexão com o servidor.'); }
    const d = await r.json().catch(() => ({}));
    if (r.status === 401 && st.sessao && rota !== '/api/entrar') sairDaConta();
    if (!r.ok) throw new Error(d.erro || `O servidor respondeu ${r.status}.`);
    return d;
  }
  function aviso(txt, erro = false) {
    Rede.aviso = txt ? { txt, erro } : null;
    const el = document.getElementById('onlineAviso');
    el.hidden = !txt; el.textContent = txt || ''; el.classList.toggle('erro', erro);
    if (txt && erro && document.getElementById('janelaOnline').hidden) Fx.chamada('Online', txt, 'suave');
  }

  // a conta: entrar, criar (o progresso do aparelho vai junto, com teto) e sair
  async function entrarNaConta(criar, nome, senha) {
    const corpo = { nome, senha };
    if (criar) {
      const c = st.conta;
      corpo.importar = { moedas: c.moedas, xp: c.xp, cartas: c.cartas, dados: c.dados, icones: c.icones, mesas: c.mesas, ativo: { dado: c.dado, icone: c.icone, mesa: c.mesa }, rating: c.rating, pico: c.pico };
    }
    const r = await pedir('POST', criar ? '/api/contas' : '/api/entrar', corpo);
    if (!st.sessao) st.contaConvidado = st.conta;
    st.sessao = { token: r.token, perfil: r.conta };
    usarPerfil(r.conta);
    unirExtras(r.conta);
    aviso(criar ? `Conta criada. Bem-vindo, ${r.conta.nome}!` : `Olá de novo, ${r.conta.nome}!`);
    Som.tocar('momento');
    if (Rede.convite) { const c = Rede.convite; Rede.convite = null; entrarNaSala(c); }
    else desenharOnline();
  }
  function sairDaConta() {
    if (Rede.sala) sairDaSala();
    if (Rede.ws) { const ws = Rede.ws; Rede.ws = null; ws.close(); }
    st.sessao = null; guardarSessao();
    if (st.contaConvidado) { st.conta = st.contaConvidado; delete st.contaConvidado; }
    aplicarPrefs(); desenharOnline(); if (jogo) render();
  }
  // o que segue a conta entre aparelhos (o som e a imagem ficam em cada aparelho)
  const extrasDoAparelho = () => ({ decks: st.decks, rec: st.rec, cfg: st.cfg, deckVisto: st.deckVisto });
  function aplicarExtras(ex) {
    if (!ex || !ex.em) return false;
    if (Array.isArray(ex.decks)) st.decks = [0, 1].map(i => (ex.decks[i] || []).filter(c => CARTAS[c]));
    if (ex.rec) Object.assign(st.rec, ex.rec);
    if (ex.cfg) Object.assign(st.cfg, ex.cfg);
    if (typeof ex.deckVisto === 'boolean') st.deckVisto = st.deckVisto || ex.deckVisto;
    try { localStorage.setItem('diceduel.v1', JSON.stringify({ cfg: st.cfg, pref: st.pref, rec: st.rec, conta: st.contaConvidado || st.conta, decks: st.decks, deckVisto: st.deckVisto })); } catch (e) {}
    if (!document.getElementById('janelaDeck').hidden) desenharDeck();
    return true;
  }
  let esperaSync = null;
  Conta.sincronizar = () => {
    clearTimeout(esperaSync);
    esperaSync = setTimeout(() => { if (st.sessao) pedir('PUT', '/api/eu/dados', extrasDoAparelho()).then(r => { st.sessao.perfil = r.conta; guardarSessao(); }).catch(() => {}); }, 1200);
  };
  // ao entrar (ou abrir o jogo já com conta): o que está na conta vale; conta nova recebe o que está no aparelho
  const unirExtras = pf => { if (!aplicarExtras(pf.extras)) Conta.sincronizar(); };

  // partidas contra os rivais do jogo, com conta: o servidor confere o teto e paga (o aparelho só mostra antes)
  Conta.relatarSolo = async j => {
    if (!st.sessao) return;
    const antes = j.premio && j.premio.moedas ? j.premio.moedas.total : 0;
    try {
      const r = await pedir('POST', '/api/solo', { desistiu: j.desistencia === 0, nivel: j.nivel, venceu: j.vencedor === 0, margem: Math.max(0, j.pts[0] - j.pts[1]), rodadas: j.rodada, meta: +j.meta, momentos: j.momentos.filter(m => m.p === 0).length });
      j.premio = r.premio; usarPerfil(r.conta);
      if ((r.premio.moedas ? r.premio.moedas.total : 0) !== antes && jogo === j && !document.getElementById('fim').hidden) desenharRecompensas(j);
    } catch (e) {
      if (st.sessao) usarPerfil(st.sessao.perfil); // volta ao que o servidor sabe
      j.premio.motivo = 'Sem conexão: esta partida não entrou na sua conta.';
    }
  };

  // o canal da partida
  function conectar() {
    return new Promise((ok, falha) => {
      if (Rede.ws && Rede.ws.readyState === 1 && Rede.ola) return ok();
      if (Rede.ws) { const velho = Rede.ws; Rede.ws = null; velho.close(); }
      let ws;
      try { ws = new WebSocket(API.replace(/^http/, 'ws') + '/ws'); } catch (e) { return falha(new Error('Sem conexão com o servidor.')); }
      Rede.ws = ws; Rede.ola = false;
      ws.onopen = () => ws.send(JSON.stringify({ tipo: 'ola', token: st.sessao.token }));
      ws.onmessage = e => {
        let m; try { m = JSON.parse(e.data); } catch (x) { return; }
        if (m.tipo === 'ola') { Rede.ola = true; Rede.tentativas = 0; usarPerfil(m.conta); ok(); return; }
        if (m.tipo === 'erro' && m.sair) { sairDaConta(); falha(new Error(m.erro)); return; }
        receber(m);
      };
      ws.onclose = () => {
        if (Rede.ws !== ws) return;
        Rede.ws = null;
        const conectado = Rede.ola; Rede.ola = false;
        // antes do "ola", quem chamou conectar() cuida da falha (e de tentar de novo); depois dele, a queda é tratada aqui
        if (!conectado) falha(new Error('Sem conexão com o servidor.'));
        else if (Rede.sala) reconectar();
      };
    });
  }
  function reconectar() {
    if (Rede.religando) return; // uma tentativa por vez
    if (Rede.tentativas >= 6) { aviso('A conexão caiu. Abra o Online para tentar de novo.', true); return; }
    const ms = Math.min(8000, 800 * 2 ** Rede.tentativas++);
    Rede.religando = true;
    aviso('Reconectando…');
    setTimeout(() => {
      Rede.religando = false;
      if (!Rede.sala || !st.sessao) return;
      conectar().then(() => { aviso(null); enviarWs({ tipo: 'entrar', sala: Rede.sala, deck: deckOnline() }); }).catch(() => reconectar());
    }, ms);
  }
  const deckOnline = () => st.decks[0].filter(possui);
  const enviarWs = m => { if (Rede.ws && Rede.ws.readyState === 1 && Rede.ola) { Rede.ws.send(JSON.stringify(m)); return true; } if (Rede.sala) reconectar(); return false; };
  Online.enviar = acao => { if (enviarWs({ tipo: 'acao', acao })) { jogo.pensando = true; render(); } };
  Online.naSala = () => !!(Rede.sala && st.sessao);
  Online.revanche = () => {
    if (!enviarWs({ tipo: 'revanche', deck: deckOnline() })) return;
    Rede.pediuRevanche = true; document.getElementById('fim').hidden = true; render();
  };

  async function criarSala() {
    aviso('Criando a sala…');
    try { const r = await pedir('POST', '/api/salas', { meta: +st.cfg.meta }); await entrarNaSala(r.sala.codigo); }
    catch (e) { aviso(e.message, true); }
  }
  async function entrarNaSala(codigo) {
    codigo = String(codigo || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(codigo)) return aviso('O código tem 6 letras ou números.', true);
    Rede.sala = codigo; Rede.infoSala = null; Rede.pediuRevanche = false;
    try {
      await conectar();
      enviarWs({ tipo: 'entrar', sala: codigo, deck: deckOnline() });
      aviso(null); desenharOnline();
    } catch (e) { Rede.sala = null; aviso(e.message, true); desenharOnline(); }
  }
  function sairDaSala() {
    enviarWs({ tipo: 'sair' });
    Rede.sala = null; Rede.infoSala = null; Rede.pediuRevanche = false;
    if (online()) { jogo = null; novaPartida(); }
    desenharOnline(); carregarRanking();
  }

  function receber(m) {
    if (m.tipo === 'sala') {
      Rede.infoSala = m.sala;
      const euId = st.sessao && st.sessao.perfil.id, outro = m.sala.jogadores.find(x => x.id !== euId);
      if (online() && jogo.sala === m.sala.codigo && outro) { jogo.perfis[1].conectado = outro.conectado; render(); }
      const meuAssento = m.sala.jogadores.findIndex(x => x.id === euId);
      if (m.revanche && m.revanche.includes(1 - meuAssento) && !Rede.pediuRevanche && outro) Fx.chamada('Revanche?', `${outro.nome} quer jogar de novo`, 'suave');
      if (!document.getElementById('janelaOnline').hidden) desenharOnline();
    } else if (m.tipo === 'estado') receberEstado(m.jogo);
    else if (m.tipo === 'fim') {
      const j = jogo;
      if (!online()) return;
      j.premio = m.premio; usarPerfil(m.premio.conta);
      setTimeout(mostrarFim, st.pref.animacoes ? 1800 : 600);
    } else if (m.tipo === 'erro') {
      const saiuDaSala = m.codigo === 'sala' || m.semSala;
      // jogada recusada: destrava e mostra por quê (o servidor manda o estado certo logo em seguida)
      if (!saiuDaSala && online() && jogo.sala === Rede.sala) { jogo.pensando = false; Rede.pediuRevanche = false; render(); Fx.chamada('Ops', m.erro, 'suave'); return; }
      // a sala não existe mais (ou recusou a entrada): sai da partida fantasma e volta ao jogo contra o rival
      const estavaJogando = online();
      Rede.sala = null; Rede.infoSala = null; Rede.pediuRevanche = false;
      if (estavaJogando) {
        jogo = null; novaPartida();
        if (m.semSala) { Fx.chamada('A sala fechou', 'O servidor reiniciou e esta partida se perdeu. Crie outra sala para jogar de novo.', 'suave'); aviso(m.erro, true); return; }
      }
      aviso(m.erro, true); abrirOnline();
    }
  }
  function receberEstado(v) {
    const antes = jogo;
    const nova = !antes || antes.modo !== 'online' || antes.sala !== v.sala || antes.partida !== v.partida;
    const virou = v.eventos.find(e => e.tipo === 'virar');
    Object.assign(v, { alvo: null, ajusteIdx: null, sel: null, destaque: null, pensando: false, token: Math.random(), fala: null, humor: null, intro: false, virando: virou ? virou.id : null });
    v.prazoAte = v.prazoVez == null ? null : Date.now() + v.prazoVez;
    if (v.fase !== 'fim') Rede.pediuRevanche = false;
    jogo = v;
    marcarNovos();
    if (nova) {
      ['avisoCfg', 'fim', 'janelaCarta', 'janelaDeck', 'janelaOnline'].forEach(id => { document.getElementById(id).hidden = true; });
      if (st.pref.animacoes && v.fase !== 'fim') return mostrarVersus();
    }
    render();
  }
  // o relógio da vez (o servidor dá 2 minutos; o aviso aparece nos últimos 30 s)
  setInterval(() => {
    // jogada enviada e nenhuma resposta em 7 s: pede o estado de novo (o servidor reenvia a partida)
    if (jogo && online() && jogo.pensando) {
      jogo.pensandoDesde = jogo.pensandoDesde || Date.now();
      if (Date.now() - jogo.pensandoDesde > 7000 && Rede.sala) { jogo.pensandoDesde = Date.now(); enviarWs({ tipo: 'entrar', sala: Rede.sala, deck: deckOnline() }); }
    } else if (jogo) jogo.pensandoDesde = 0;
    if (!jogo || !online() || !jogo.prazoAte || jogo.fase === 'fim') return;
    const s = Math.max(0, Math.ceil((jogo.prazoAte - Date.now()) / 1000)), el = document.getElementById('mesaInfo');
    if (s <= 30) el.innerHTML = `<span class="prazo">${jogo.vez === 0 ? 'sua vez' : 'vez do rival'}: ${s} s</span>`;
  }, 1000);

  // a janela Online
  const carregarRanking = () => { if (st.sessao && !Rede.sala) pedir('GET', '/api/ranking').then(r => { Rede.ranking = r.ranking; desenharOnline(); }).catch(() => {}); };
  function abrirOnline() {
    // depois de desistir de reconectar, abrir o Online tenta de novo
    if (Rede.sala && st.sessao && !Rede.ola && Rede.tentativas >= 6) { Rede.tentativas = 0; reconectar(); }
    desenharOnline();
    document.getElementById('janelaOnline').hidden = false;
    carregarRanking();
    const f = document.querySelector('#onlineConteudo input, #onlineConteudo .btn-mel');
    if (f) f.focus();
  }
  const esc = t => String(t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const linkDaSala = c => `${PAGINA}/?sala=${c}`;
  function desenharOnline() {
    document.getElementById('pontoOnline').hidden = !st.sessao;
    const el = document.getElementById('onlineConteudo');
    document.getElementById('onlineServidor').textContent = st.sessao ? (Rede.ola ? 'conectado' : '') : '';
    if (!API) {
      el.innerHTML = `<p>O online precisa do servidor do Dice Duel. Abra o jogo pelo endereço do servidor (por exemplo, o da Railway) para criar conta, chamar amigos e entrar no ranking.</p><p class="nota">Aqui, neste arquivo, dá para jogar contra a Diana, a Dona Coruja ou a dois no mesmo aparelho.</p>`;
      return;
    }
    if (!st.sessao) {
      const criar = Rede.aba === 'criar';
      el.innerHTML = `${Rede.convite ? `<p class="aviso-online">Você foi convidado para a sala <b>${esc(Rede.convite)}</b>. Entre ou crie uma conta para jogar.</p>` : '<p class="nota" style="margin:0">Com uma conta você joga com amigos por link, entra no ranking e guarda suas moedas e itens no servidor.</p>'}
        <div class="abas" role="group" aria-label="Conta"><button data-on="aba-entrar" aria-pressed="${!criar}">Entrar</button><button data-on="aba-criar" aria-pressed="${criar}">Criar conta</button></div>
        <form class="form-conta" id="formConta" autocomplete="on">
          <label>Nome<input class="campo" name="nome" autocomplete="username" required minlength="3" maxlength="20" pattern="[A-Za-zÀ-ÿ0-9_.\\-]{3,20}" placeholder="de 3 a 20 letras"></label>
          <label>Senha<input class="campo" name="senha" type="password" autocomplete="${criar ? 'new-password' : 'current-password'}" required minlength="6" maxlength="72" placeholder="6 caracteres ou mais"></label>
          <button class="btn btn-mel" type="submit">${criar ? 'Criar conta' : 'Entrar'}</button>
        </form>
        ${criar ? '<p class="nota" style="margin:0">O que você ganhou neste aparelho vai junto para a conta (até 600 moedas e itens até um valor de 900).</p>' : ''}`;
      return;
    }
    const pf = st.sessao.perfil, sala = Rede.infoSala;
    const eu = `<div class="eu-online">${iconeSVG(pf.ativo.icone)}<span><b>${esc(pf.nome)}</b><small>${esc(pf.titulo)} · ${pf.vitorias} de ${pf.partidas} vencidas</small></span><span class="rating-grande">${pf.rating}<small>rating</small></span></div>`;
    if (Rede.sala) {
      const emJogo = online() && jogo.sala === Rede.sala;
      if (emJogo && jogo.fase !== 'fim') {
        el.innerHTML = `${eu}<p style="margin:0">Partida na sala <b>${Rede.sala}</b> contra <b>${esc(jogo.perfis[1].nome)}</b> (rating ${jogo.perfis[1].rating}).</p>
          <div class="linha-botoes"><button class="btn btn-mel" data-on="voltar">Voltar à mesa</button><button class="btn btn-papel" data-on="desistir">Desistir</button></div>
          <p class="nota" style="margin:0">Desistir conta como derrota. Se a conexão cair, você tem 1 minuto para voltar.</p>`;
        return;
      }
      if (emJogo) {
        el.innerHTML = `${eu}<p style="margin:0">Sala <b>${Rede.sala}</b>: a partida acabou.</p>
          <div class="linha-botoes"><button class="btn btn-mel" data-on="revanche" ${Rede.pediuRevanche ? 'disabled' : ''}>${Rede.pediuRevanche ? 'Esperando o rival…' : 'Revanche'}</button><button class="btn btn-papel" data-on="sair-sala">Sair da sala</button></div>`;
        return;
      }
      const lista = sala ? sala.jogadores.map(x => `<li><span>${esc(x.nome)}</span><span>${x.rating}</span></li>`).join('') : '';
      el.innerHTML = `${eu}<div class="convite"><span class="nota">Mande o link (ou o código) para quem vai jogar com você</span>
          <span class="codigo-grande">${Rede.sala}</span><span class="link">${esc(linkDaSala(Rede.sala))}</span>
          <div class="linha-botoes"><button class="btn btn-mel" data-on="copiar">Copiar convite</button>${navigator.share ? '<button class="btn btn-papel" data-on="compartilhar">Compartilhar</button>' : ''}</div>
          <ul class="lista-sala">${lista}</ul>
          <span class="esperando">Esperando o amigo<span class="pensando-pontos"></span></span></div>
        <p class="nota" style="margin:0">Meta ${sala ? sala.meta : st.cfg.meta} · seu deck: ${deckOnline().map(c => CARTAS[c].nome).join(', ') || 'sem cartas'}. Enquanto espera, dá para jogar contra o rival do jogo.</p>
        <div class="linha-botoes"><button class="btn btn-papel" data-on="deck">Trocar deck</button><button class="btn btn-papel" data-on="sair-sala">Cancelar a sala</button></div>`;
      return;
    }
    const rk = Rede.ranking ? (Rede.ranking.length ? Rede.ranking.map((x, i) => `<li class="${x.nome === pf.nome ? 'eu' : ''}"><span class="pos">${i + 1}</span>${iconeSVG(x.icone)}<span class="quem-rk">${esc(x.nome)}<small>${esc(x.titulo)}</small></span><span class="rk">${x.rating}</span></li>`).join('') : '<li><span></span><span></span><span class="quem-rk">Ninguém jogou ainda.</span><span></span></li>') : '<li><span></span><span></span><span class="quem-rk">Carregando…</span><span></span></li>';
    el.innerHTML = `${eu}
      <div class="linha-botoes"><button class="btn btn-mel" data-on="criar-sala">Chamar um amigo</button></div>
      <form class="linha-botoes" id="formCodigo"><input class="campo codigo" name="codigo" maxlength="6" placeholder="código" aria-label="Código da sala" autocomplete="off" style="flex:1 1 120px"><button class="btn btn-papel" type="submit">Entrar na sala</button></form>
      <h3>Ranking</h3><ol class="ranking">${rk}</ol>
      <p class="nota" style="margin:0">Vitória online: ${BASE_MOEDAS.online} moedas × margem × rapidez, e vale mais vencer quem tem rating maior. O mesmo par vale rating e moedas 3 vezes por dia.</p>
      <div class="linha-botoes"><button class="btn btn-papel" data-on="sair-conta">Sair da conta</button></div>`;
  }
  document.getElementById('btnOnline').addEventListener('click', abrirOnline);
  document.getElementById('btnFecharOnline').addEventListener('click', () => { document.getElementById('janelaOnline').hidden = true; });
  document.getElementById('onlineConteudo').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target, botao = f.querySelector('[type=submit]');
    if (f.id === 'formCodigo') return entrarNaSala(f.codigo.value);
    botao.disabled = true;
    try { await entrarNaConta(Rede.aba === 'criar', f.nome.value.trim(), f.senha.value); }
    catch (x) { aviso(x.message, true); botao.disabled = false; }
  });
  document.getElementById('onlineConteudo').addEventListener('click', async e => {
    const b = e.target.closest('[data-on]'); if (!b) return;
    const a = b.dataset.on;
    if (a === 'aba-entrar' || a === 'aba-criar') { Rede.aba = a.slice(4); aviso(null); desenharOnline(); }
    if (a === 'criar-sala') criarSala();
    if (a === 'sair-sala') sairDaSala();
    if (a === 'sair-conta') sairDaConta();
    if (a === 'voltar') document.getElementById('janelaOnline').hidden = true;
    if (a === 'deck') { document.getElementById('janelaOnline').hidden = true; abrirDeck(); }
    if (a === 'revanche') Online.revanche();
    if (a === 'desistir') {
      if (b.dataset.certeza !== '1') { b.dataset.certeza = '1'; b.textContent = 'Toque de novo'; return; }
      enviarWs({ tipo: 'desistir' }); document.getElementById('janelaOnline').hidden = true;
    }
    if (a === 'copiar') {
      const texto = `Vem jogar Dice Duel comigo! Sala ${Rede.sala}: ${linkDaSala(Rede.sala)}`;
      try { await navigator.clipboard.writeText(texto); b.textContent = 'Copiado!'; } catch (x) { b.textContent = 'Copie o link acima'; }
      setTimeout(() => { b.textContent = 'Copiar convite'; }, 2000);
    }
    if (a === 'compartilhar') { try { await navigator.share({ title: 'Dice Duel', text: `Vem jogar Dice Duel comigo! Sala ${Rede.sala}`, url: linkDaSala(Rede.sala) }); } catch (x) {} }
  });
  // convite por link: /?sala=CODIGO
  (() => {
    let c = null;
    try { c = new URLSearchParams(location.search).get('sala'); } catch (e) {}
    if (!c || !API) return;
    try { const u = new URL(location.href); u.searchParams.delete('sala'); history.replaceState(null, '', u); } catch (e) {}
    Rede.convite = c.toUpperCase().slice(0, 6);
    st.deckVisto = true; // quem chega por convite vai direto para a sala
  })();
  // com conta: atualiza o perfil (e renova o token) em segundo plano
  if (st.sessao && API) pedir('GET', '/api/eu').then(r => { st.sessao.token = r.token; usarPerfil(r.conta); unirExtras(r.conta); if (jogo) render(); }).catch(() => {});

  // ---------- início ----------
  aplicarPrefs();
  window.claude?.hot?.snapshot?.(() => ({ st, jogo, uid }));
  function iniciar(dados) {
    if (dados && dados.jogo && dados.jogo.v === 8 && dados.jogo.modo !== 'online') {
      Object.assign(st, dados.st); uid = dados.uid || uid;
      jogo = dados.jogo; jogo.pensando = false; jogo.token = Math.random(); jogo.fx = null; jogo.eventos = []; jogo.intro = false; jogo.voo = null;
      if (jogo.fase === 'alvo' || jogo.fase === 'ajuste') { jogo.fase = 'pegar'; jogo.alvo = null; }
      aplicarPrefs(); render(); talvezAutomato();
      if (jogo.fase === 'fim') mostrarFim();
    } else if (!st.deckVisto) {
      // primeira visita: o deck "Primeira mesa" e a Diana; as armadilhas chegam depois da 1ª partida
      st.decks[0] = PRONTOS[0].cartas.slice(); st.cfg.nivel = 'aprendiz';
      const animar = st.pref.animacoes; st.pref.animacoes = false; novaPartida(); st.pref.animacoes = animar;
      abrirDeck();
    } else novaPartida();
    if (Rede.convite) { abrirOnline(); if (st.sessao) { const c = Rede.convite; Rede.convite = null; entrarNaSala(c).then(abrirOnline); } }
  }
  // o roteiro de teste automático (tools/) pode ler o estado
  window.DiceDuel = { get jogo() { return jogo; }, st, salvar, ajustar(p) { Object.assign(st.pref, p); aplicarPrefs(); if (jogo) render(); } };
  window.claude?.hot?.ready ? window.claude.hot.ready(iniciar) : iniciar(window.claude?.hot?.data ?? {});
})();
