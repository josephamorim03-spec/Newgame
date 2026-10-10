/* Dice Duel · o jogo
 * Regras (v0.13; o motor está em shared/regras.js): Mesa compartilhada de 5 dados, corrente que só cresce pela frente,
 * sincronias Eco (=), Passo (±1) e Oposto (soma 7), Bolso de um dado, quem está atrás abre a Mesa,
 * deck de até 3 cartas (no máx. 2 armadilhas e 1 carta de pontos ⚡), armadilha virada (?). Números medidos em simulação (sim/).
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
    ajuste: svg('<path d="M12 5.5v6M9 8.5h6M9 16h6"/><rect x="3" y="3" width="18" height="18" rx="4"/>'),
    virar: svg('<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4"/>'),
    rerrolar: svg('<path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4"/><circle cx="12" cy="12" r="1.5"/>'),
    pressa: svg('<path d="M5 6l6 6-6 6M13 6l6 6-6 6"/>'),
    coringa: svg('<rect x="5" y="5" width="14" height="14" rx="3" transform="rotate(-8 12 12)"/><path d="M9.5 9.5l5 5M14.5 9.5l-5 5"/>'),   // o Remendo (ex-Coringa): um retalho costurado
    sobrecarga: svg('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
    pausa: svg('<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7M14 8.5v7"/>'),
    reverso: svg('<path d="M4 8h15M15.5 4.5 19 8l-3.5 3.5M20 16H5M8.5 12.5 5 16l3.5 3.5"/>'),
    furto: svg('<rect x="2.5" y="9.5" width="7" height="7" rx="2"/><rect x="14.5" y="9.5" width="7" height="7" rx="2"/><path d="M6 6.5c2.5-3 9.5-3 12 0M16 4.5l2 2-2.4.9M18 19.5c-2.5 3-9.5 3-12 0M8 21.5l-2-2 2.4-.9"/>'),
    espelho: svg('<ellipse cx="12" cy="9" rx="6" ry="7"/><path d="M12 16v5M8.5 21h7M9.5 6.5l4 4M10 11l2 2"/>'),
    fundo: svg('<path d="M4 4h16M4 4v9M20 4v9M4 13l3 7M20 13l-3 7M9 9h6"/>'),
    lacre: svg('<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2.5"/>'),
    ancora: svg('<circle cx="12" cy="5" r="2"/><path d="M12 7v14M8 11h8M4.5 14.5c.5 3.8 3.8 6.5 7.5 6.5s7-2.7 7.5-6.5"/>'),
    interferencia: svg('<path d="M2 12h3l2-5 3 10 3-13 3 13 2-5h4"/>'),
    pedagio: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M14.5 9.5h-3.5a1.5 1.5 0 0 0 0 3h2a1.5 1.5 0 0 1 0 3H9.5"/>'),
  };
  // versão pintada (js/cartas_pintadas.js, feita por tools/arte_icones.py) onde o ícone aparece grande o bastante para ler
  // (deck, loja, detalhe, regras, versus); nos botões de 18 px da mesa e na marca do Espelho fica o traço. Sem pintura, traço em tudo.
  // (o Remendo, ex-Coringa, já tem a própria pintura: um retalho mel costurado, de arte/cartas.json)
  const pintada = id => (window.CARTAS_PINTADAS || {})[id];
  const imgPintada = (id, cls) => `<img class="${cls}" src="${pintada(id)}" alt="" aria-hidden="true" draggable="false">`;
  const RAIO = pintada('raio') ? imgPintada('raio', 'raio-pintado') : '⚡';
  const VERSO = pintada('verso') ? imgPintada('verso', 'verso-pintado') : '?';
  // a marca do Remendo (ex-Coringa) sobre o dado e na corrente: o retalho em traço, do tamanho da letra
  const CHAPEU = ICO_CARTA.coringa.replace('class="ico"', 'class="ico mini-ico"');
  // a moeda pintada vale para todo <span class="moeda"> (o CSS usa a variável; sem ela, fica o círculo dourado)
  if (pintada('moeda')) { document.documentElement.style.setProperty('--moeda-img', `url("${pintada('moeda')}")`); document.documentElement.classList.add('moeda-pintada'); }
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
    biscoito: 'meio perdido, sempre simpático', gordinho: 'barriga redonda, segundas intenções', cafu: 'de terno, óculos e cavanhaque', galgo: 'sagaz: já viu essa jogada antes', bandoleiro: 'sempre tem uma carta escondida', ovelha: 'num pasto de hexágono', cavalo: 'a peça mais rica do tabuleiro' };
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
  const PREF_PADRAO = { som: true, musica: true, volSom: 0.8, volMusica: 0.45, animacoes: true, particulas: true, tremor: true, vibrar: true, falas: true, dicas: true, liberar: false, ajudasV11: true };
  const st = {
    cfg: { modo: 'bot', nivel: 'aprendiz', meta: R.META_PADRAO, ritmo: 'normal', tempoOnline: 'rapida' },
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
    st.cfg.meta = R.metaValida(st.cfg.meta);   // v0.12: a meta 12 saiu (quem a tinha marcada passa para a 16)
    if (st.cfg.modo !== 'bot') st.cfg.modo = 'bot';   // v0.12: o modo a dois no mesmo aparelho saiu do jogo
    if (s.pref) Object.assign(st.pref, s.pref);
    // v0.11: as ajudas voltam ligadas uma vez para todo mundo (são o padrão); quem desligar de novo, fica desligado
    if (s.pref && !s.pref.ajudasV11) { st.pref.dicas = true; st.pref.ajudasV11 = true; }
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
  // o rival online caiu no meio da partida; segundosVolta: quanto ele ainda tem para voltar (null se não se sabe)
  const rivalCaiu = () => online() && jogo.fase !== 'fim' && jogo.perfis[1].conectado === false;
  // o relógio do online: "4:32" com um minuto ou mais, "37 s" no fim (os dois relógios ficam nos painéis, como no xadrez)
  const relogioTxt = s => (s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s} s`);
  // o relógio de quem não tem a vez (parado): na etiqueta do painel dele
  const relogioParado = p => (online() && jogo.fase !== 'fim' && jogo.relogios && jogo.vez !== p ? `<span class="vez-tag relogio-parado" title="relógio de ${p === 0 ? 'você' : 'quem joga contra você'}">${relogioTxt(Math.ceil(jogo.relogios[p] / 1000))}</span>` : '');
  const segundosVolta = () => { const ate = jogo.perfis[1].voltaAte; return ate ? Math.max(0, Math.ceil((ate - Date.now()) / 1000)) : null; };

  function novaPartida() {
    esconderInicio();   // começar uma partida sai do menu principal
    if (window.Rolagem) Rolagem.parar();
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
    // ids dos dados nunca se repetem entre partidas: um temporizador da partida anterior não marca dado da nova
    const idInicial = Math.max(uid, jogo && jogo.proxId ? jogo.proxId + 1 : 1);
    uid = idInicial + 1;
    jogo = R.criarPartida({ decks, vez: st.primeiro, meta: +st.cfg.meta, nomes: nomesP, modo, nivel, idInicial });
    Object.assign(jogo, { alvo: null, ajusteIdx: null, sel: null, destaque: null, pensando: false, token: Math.random(), fala: null, humor: null, intro: false });
    st.primeiro = 1 - st.primeiro;
    ['avisoCfg', 'fim', 'janelaCarta', 'janelaDeck'].forEach(id => { document.getElementById(id).hidden = true; });
    marcarNovos();
    // sem "versus" e sem janela por cima, a Mesa já rolou à vista agora
    // com uma janela aberta (Ajustes), sem o "versus" por cima dela: a Mesa rola quando a janela fechar
    if (st.pref.animacoes && !document.querySelector('.janela:not([hidden])')) mostrarVersus(); else { jogo.rolouAVista = !document.querySelector('.janela:not([hidden])'); render(); talvezAutomato(); }
  }
  function sorteiaDeck(semArmadilha) {
    const pool = ORDEM.filter(c => !semArmadilha || CARTAS[c].tipo !== 'armadilha');
    for (;;) {
      const d = pool.slice().sort(() => Math.random() - .5).slice(0, 3);
      if (deckValido(d)) return d;
    }
  }
  // a primeira Mesa de cada partida rola quando dá para ver: atrás do "versus" ou de uma janela ela rolaria escondida
  function rolarAVista() {
    const j = jogo;
    if (!j || j.rolouAVista || j.intro || j.compras || j.fase === 'fim' || document.querySelector('.janela:not([hidden])') || inicioAberto()) return false;
    j.rolouAVista = true;
    j.mesa.forEach(d => { d.novo = true; }); marcarNovos();
    rolarNaTela(j.mesa.map(d => ({ id: d.id, v: d.v })));
    return true;
  }
  // os dados novos rolam na tela só uma vez
  function marcarNovos() {
    const ids = jogo.mesa.filter(d => d.novo).map(d => d.id);
    if (ids.length) setTimeout(() => { if (jogo) jogo.mesa.forEach(d => { if (ids.includes(d.id)) d.novo = false; }); }, 1000);
  }

  // ---------- ações: o motor muda o estado; aqui só se desenha e se passa a vez ao rival ----------
  const destinos = (p, v) => R.destinos(jogo, p, v);
  const seguro = (p, v) => R.seguro(jogo, p, v);
  const bolsoGarante = p => R.bolsoGarante(jogo, p);
  const encaixaP = (p, v) => R.encaixaP(jogo, p, v);
  const tirar = (p, idx) => R.tirar(jogo, p, idx);
  // quem espera o rival "pensar" é o clique (cartaBotoes), não a regra: senão o próprio rival nunca usava cartas
  const podeUsar = (p, c) => R.podeUsar(jogo, p, c);
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
  // a carta aberta no painel (toque numa carta sua, na sua vez): mora fora do jogo, porque no online cada estado do
  // servidor é um objeto novo; vale só na vez em que foi aberta
  let foco = null;
  const chaveVez = j => `${j.vezes || 0}:${j.vez}`;
  const podeAbrir = (j, p) => humano(p) && j.vez === p && j.fase === 'pegar' && !j.pensando && !j.intro && !j.segundoDado;
  const cartaEmFoco = j => (foco && foco.chave === chaveVez(j) && podeAbrir(j, j.vez) && j.decks[j.vez].includes(foco.c) ? foco.c : null);
  // quando uma carta muda de estado (usada, armada, perdida), ela faz um gesto curto; o atraso negativo deixa a
  // animação seguir de onde estava se a tela for redesenhada no meio dela
  const gestoCarta = { idp: null, ant: {}, t: {} };
  function gesto(p, c, e) {
    const j = jogo, idp = online() ? `${j.sala}:${j.partida}` : j, k = `${p}:${c}`;
    if (gestoCarta.idp !== idp) { gestoCarta.idp = idp; gestoCarta.ant = {}; gestoCarta.t = {}; }
    const antes = gestoCarta.ant[k]; gestoCarta.ant[k] = e;
    if (antes && antes !== e && ['usada', 'perdida', 'armada'].includes(e)) gestoCarta.t[k] = { e, t: performance.now() };
    const g = gestoCarta.t[k], dt = g && g.e === e ? performance.now() - g.t : Infinity;
    return dt < 700 ? ` gesto-${e}" style="animation-delay:-${Math.round(dt)}ms` : '';
  }
  // o segundo dado da Pressa é opcional
  function dispensarSegundo(p) {
    jogo.sel = null;
    if (online()) { Online.enviar({ tipo: 'dispensar' }); return 'online'; }
    return depois(R.dispensarSegundo(jogo, p));
  }
  // devolve 'proximo' quando a carta passou a vez (Pausa): quem chamou não joga mais nesta vez
  function usarCarta(p, c, idx, delta) {
    if (online()) { Online.enviar({ tipo: 'carta', carta: c, idx, delta }); return; }
    if ((c === 'virar' || c === 'ajuste') && jogo.mesa[idx]) jogo.virando = jogo.mesa[idx].id;
    const r = R.usarCarta(jogo, p, c, idx, delta);
    marcarNovos();
    if (r === 'proximo') { jogo.sel = null; jogo.alvo = null; jogo.ajusteIdx = null; }
    if (jogo.fase === 'fim') { depois('fim'); return 'fim'; }
    return r;
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
    const pronta = c => j.cartas[p][c] === 'pronta', pode = c => usavel(p, c);
    if (j.nivel === 'aprendiz') {
      if (Math.random() > 0.2) return usa;
      const cs = j.decks[p].filter(c => pronta(c) && podeUsar(p, c).ok && c !== 'sobrecarga');
      if (!cs.length) return usa;
      return usa.concat({ carta: sorteia(cs), idx: Math.floor(Math.random() * m.length), delta: Math.random() < .5 ? 1 : -1 });
    }
    let precisa = eu.length >= 2 && !m.some(d => encaixaP(p, d.v));
    if (precisa && pode('virar')) { const i = m.findIndex(d => encaixa(eu, 7 - d.v)); if (i >= 0) { usa.push({ carta: 'virar', idx: i }); precisa = false; } }
    if (precisa && pode('ajuste') && m.length >= 3) {
      for (let i = 0; i < m.length && precisa; i++) for (const dl of [1, -1]) {
        const x = m[i].v + dl; if (x >= 1 && x <= 6 && encaixa(eu, x)) { usa.push({ carta: 'ajuste', idx: i, delta: dl }); precisa = false; break; }
      }
    }
    if (precisa && pode('coringa') && m.length >= 2) { usa.push({ carta: 'coringa' }); precisa = false; }
    // Reverso: nada entra pela frente, mas algo da Mesa (ou o dado do Bolso) entra pela outra ponta
    if (precisa && pode('reverso')) {
      const outra = [eu[0]];
      if (m.some(d => encaixa(outra, d.v)) || (j.bolso[p] !== null && encaixa(outra, j.bolso[p]))) { usa.push({ carta: 'reverso' }); precisa = false; }
    }
    // Furto: o dado do Bolso do rival salva a corrente de 3+ (vem para o meu Bolso e entra na troca)
    if (precisa && pode('furto') && eu.length >= 3 && j.bolso[1 - p] !== null && encaixa(eu, j.bolso[1 - p])) { usa.push({ carta: 'furto' }); precisa = false; }
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
      else if (pronta('lacre') && j.decks[1 - p].some(c => CARTAS[c].tipo === 'efeito' && j.cartas[1 - p][c] === 'pronta')) usa.push({ carta: 'lacre' });
      else if (pronta('ancora') && eu.length >= 3) usa.push({ carta: 'ancora' });
      else if (pronta('espelho') && ele.length >= 2 && m.length >= 3) {
        const meu = automatoEscolhe(p).idx;
        const i = m.map((d, k) => k).find(k => k !== meu && encaixa(ele, m[k].v) && !encaixa(ele, 7 - m[k].v));
        if (i !== undefined) usa.push({ carta: 'espelho', idx: i });
      }
    }
    if (pode('pressa') && eu.length >= 2 && m.length >= 3 && m.length <= 4 && !usa.some(u => u.carta === 'rerrolar')) {
      const ok = m.some((a, i) => encaixaP(p, a.v) && m.some((b, k) => k !== i && encaixa(eu.concat(a.v), b.v)));
      if (ok) usa.push({ carta: 'pressa' });
    }
    // Pausa, por último (passa a vez): a corrente de 2+ romperia com qualquer dado e nada acima a salvou
    if (precisa && pode('pausa') && eu.length >= 2 && !m.some(d => seguroDado(p, d)) && !j.segundoDado && !j.extra[p]) { usa.push({ carta: 'pausa' }); return usa; }
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
  // ---------- quando alguém usa carta: o aviso explica e o dado que mudou fica marcado na Mesa ----------
  const AVISO_CARTA = 2600;   // ms do aviso da carta do rival (o bot espera por ele antes de jogar)
  function explicarCarta(e, quem) {
    const mudou = e.antes != null ? `${quem} mudou um ${e.antes} da Mesa para ${e.depois}` : null;
    return {
      ajuste: mudou || `${quem} somou ou tirou 1 de um dado da Mesa`,
      virar: e.antes != null ? `${quem} virou um ${e.antes} da Mesa: agora é ${e.depois}` : `${quem} virou um dado da Mesa`,
      rerrolar: `${quem} rolou a Mesa de novo`,
      pressa: `${quem} vai pegar dois dados nesta vez`,
      coringa: `a corrente de ${quem} está protegida: o próximo dado que romperia entra no lugar da frente`,
      sobrecarga: `o próximo disparo de 4+ de ${quem} vale +2`,
      pausa: `${quem} passou a vez sem pegar dado: ${nomes()[1 - e.p] === 'Você' ? 'você joga de novo' : `${nomes()[1 - e.p]} joga de novo`}`,
      reverso: `a corrente de ${quem} agora cresce pela outra ponta${e.frente ? ` (frente: ${e.frente})` : ''}`,
      furto: e.meu === undefined ? `${quem} trocou os dados dos Bolsos` : `${quem} trocou ${e.meu === null ? 'o Bolso vazio' : 'o ' + e.meu} pelo ${e.dele === null ? 'Bolso vazio' : e.dele} do rival`,
    }[e.c] || `${quem} usou`;
  }
  let marcaMudanca = null;   // { ids, antes, ate }
  function marcarMudanca(ids, antes) {
    const ate = Date.now() + AVISO_CARTA + 600;
    marcaMudanca = { ids, antes, ate };
    setTimeout(() => { if (marcaMudanca && marcaMudanca.ate === ate) { marcaMudanca = null; if (jogo) render(); } }, AVISO_CARTA + 650);
    if (jogo) render();
  }
  const mudou = id => !!(marcaMudanca && marcaMudanca.ids.includes(id) && Date.now() < marcaMudanca.ate);
  async function talvezAutomato() {
    const j = jogo;
    if (!j || j.modo !== 'bot' || j.fase === 'fim' || humano(j.vez) || j.pensando || j.intro || inicioAberto()) return;
    const tok = j.token, p = j.vez;
    j.pensando = true; render();
    if (j.fase === 'pegar') {
      await espera(800); if (tok !== jogo.token) return;
      if (window.Rolagem) { await Rolagem.esperar(); if (tok !== jogo.token) return; }   // escolhe com os dados já assentados
      for (const u of automatoCartas(p)) {
        if (!podeUsar(p, u.carta).ok || (CARTAS[u.carta].alvo && !j.mesa[u.idx])) continue;
        const rc = usarCarta(p, u.carta, u.idx, u.delta || 1);
        if (rc === 'fim' || jogo.fase === 'fim') { j.pensando = false; return; }
        if (rc === 'proximo') {
          // a Pausa passou a vez: o aviso fica um tempo e a vez segue para o outro lado
          j.pensando = false; depois('proximo'); return;
        }
        render();
        // dá tempo de ler o aviso e ver o dado que mudou antes da próxima ação (não acelera no ritmo rápido)
        await new Promise(r => setTimeout(r, Math.max(AVISO_CARTA + 300, (AVISO_CARTA + 300) * ritmo()))); if (tok !== jogo.token) return;
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
    Som.tocar('falaRival', { voz: RETRATO_RIVAL[j.nivel] });
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
  // ---------- o dado escolhido: corrente ou Bolso, tocando, arrastando ou tocando de novo no dado ----------
  // Sem botões de destino: a corrente e o Bolso acendem com o que vai acontecer em cada um. Só pergunta quando a jogada
  // tem risco ou não é a que a pessoa apontou (dado que não serve solto na corrente: trocar, guardar ou romper).
  let pergunta = null;   // { chave, id, txt, botoes: [[modo, rótulo]] }: a pergunta do destino, desta vez e deste dado
  const dadoEscolhido = j => (j.fase === 'pegar' && humano(j.vez) && !j.pensando && j.sel != null && idxDe(j.sel) >= 0 ? idxDe(j.sel) : -1);
  const perguntaValida = j => (pergunta && pergunta.chave === chaveVez(j) && pergunta.id === j.sel && dadoEscolhido(j) >= 0 ? pergunta : null);
  const relDe = (p, x) => { const eu = jogo.cor[p], r = eu.length ? rels(frente(eu), x) : []; return r.length ? r.map(k => REL[k].nome).join(' + ') : (eu.length && jogo.coringa[p] ? 'Remendo' : 'começa'); };
  // o que acontece em cada alvo com o dado escolhido: { corrente: {cls, txt}, bolso: {cls, txt} }
  function previaAlvos(p, idx) {
    const j = jogo, op = opcoesDoDado(p, idx), b = j.bolso[p], L = j.cor[p].length, ancora = j.armada[p] === 'ancora' && L >= 4;
    const corrente = op.seguros.includes('corrente') ? { cls: 'ok', txt: relDe(p, op.v) }
      : op.seguros.includes('trocar') ? { cls: 'aviso', txt: `troca: entra o ${b}` }
      : op.seguros.includes('guardar') ? { cls: 'aviso', txt: 'não sincroniza' }
      : { cls: 'perigo', txt: ancora ? 'a Âncora segura' : 'rompe' };
    const bolso = op.contra ? { cls: 'nao', txt: 'não pode' }
      : op.seguros.includes('guardar') ? { cls: 'ok', txt: 'guardar' }
      : op.seguros.includes('trocar') ? { cls: 'ok', txt: `troca: entra o ${b}` }
      : op.rompe && op.ds.includes('trocar') ? { cls: 'perigo', txt: `o ${b} rompe` }
      : { cls: 'nao', txt: b !== null ? `o ${b} não serve` : 'não pode' };
    return { corrente, bolso, op };
  }
  // levar o dado escolhido a um alvo ('corrente' ou 'bolso'): faz, ou pergunta quando há risco
  function levarDado(alvo) {
    const j = jogo, p = j.vez, idx = dadoEscolhido(j);
    if (idx < 0) return;
    const { op } = previaAlvos(p, idx), b = j.bolso[p], eu = j.cor[p], L = eu.length, v = op.v;
    const ancora = j.armada[p] === 'ancora' && L >= 4, fr = L ? frente(eu) : null;
    const perguntar = (txt, botoes) => { pergunta = { chave: chaveVez(j), id: j.sel, txt, botoes }; Som.tocar('perigo', { x: 0 }); vibrar([6, 40, 6]); render(); };
    if (alvo === 'corrente') {
      if (op.seguros.includes('corrente')) return pegarDado('corrente');
      if (op.seguros.includes('trocar')) return perguntar(`O ${v} não sincroniza com o seu ${fr}. Trocar: o <b>${b}</b> do Bolso entra na corrente e o ${v} fica guardado?`, [['trocar', 'Trocar']]);
      if (op.seguros.includes('guardar')) return perguntar(`O ${v} não sincroniza com o seu ${fr}. Guardar no Bolso?`, [['guardar', 'Guardar']]);
      const txt = ancora ? `O ${v} não sincroniza${b !== null && !op.contra ? ', nem o do Bolso' : ''}: a corrente de ${L} romperia, mas a sua <b>Âncora</b> segura.`
        : `O ${v} não sincroniza${b !== null && !op.contra ? ', nem o do Bolso' : ''}: a sua corrente de <b>${L}</b> vai romper.`;
      return perguntar(txt, [['corrente', ancora ? 'Pegar' : 'Romper']].concat(op.ds.includes('trocar') ? [['trocar', `Trocar (o ${b} rompe)`]] : []));
    }
    if (op.contra) return perguntar(`Virado pelo Espelho, o ${v} não pode ir para o Bolso.`, op.ds.includes('corrente') && op.seguros.includes('corrente') ? [['corrente', 'Pôr na corrente']] : []);
    if (op.seguros.includes('guardar')) return pegarDado('guardar');
    if (op.seguros.includes('trocar')) return pegarDado('trocar');   // o do Bolso serve na corrente: troca sem perguntar
    if (op.rompe && op.ds.includes('trocar')) return perguntar(`O ${b} do Bolso não sincroniza com o seu ${fr}: a corrente de <b>${L}</b> rompe e o ${v} fica guardado.`, [['trocar', 'Trocar e romper']]);
    return perguntar(`O ${b} do Bolso não sincroniza com o seu ${fr}: trocar romperia a corrente.`, op.seguros.includes('corrente') ? [['corrente', `Pôr na corrente (${relDe(p, v)})`]] : []);
  }
  // a frase do dado escolhido, na linha da Mesa
  function instrucaoDado(j) {
    const idx = dadoEscolhido(j); if (idx < 0 || perguntaValida(j)) return '';
    const op = opcoesDoDado(j.vez, idx), d = op.d;
    if (op.proprio) return `Esse é o dado do seu <b>Espelho</b>: pegá-lo desperdiça a armadilha.`;
    const virado = op.contra ? `Virado pelo Espelho, o ${d.v} chega como <b>${op.v}</b> e não pode ir para o Bolso. ` : '';
    const de = { corrente: 'põe na corrente', guardar: 'guarda no Bolso', trocar: 'troca com o Bolso' }[op.principal];
    return `${virado}Leve o <b>${op.v}</b> à corrente ou ao Bolso${st.pref.dicas ? ' (toque ou arraste)' : ''}${de ? `; tocar de novo nele ${de}` : ''}.`;
  }

  function clicarDado(idx) {
    const j = jogo;
    if (!j || !humano(j.vez) || j.pensando || j.intro) return;
    const d = j.mesa[idx]; if (!d) return;
    if (j.fase === 'alvo' || j.fase === 'ajuste') {
      if (j.alvo === 'ajuste') { j.ajusteIdx = idx; j.fase = 'ajuste'; Som.tocar('escolher', { n: 0, x: (idx - 2) * 0.3 }); vibrar(6); render(); return; }
      // Virar e Espelho: tocar no dado já usa (a etiqueta de cada dado mostrou como ele fica)
      j.sel = d.id; return confirmarAlvo();
    }
    if (j.fase !== 'pegar') return;
    foco = null;
    if (j.sel === d.id) {
      const op = opcoesDoDado(j.vez, idx);
      if (op.principal) pegarDado(op.principal); else if (!op.proprio) levarDado('corrente');
      return;
    }
    j.sel = d.id; pergunta = null;
    // prévia sonora: quem sincroniza toca baixinho a nota que vai somar; quem rompe dá um "hm-hm" grave
    const op = opcoesDoDado(j.vez, idx), x = (idx - 2) * 0.3;
    if (op.rompe) Som.tocar('perigo', { x }); else Som.tocar('escolher', { n: op.principal === 'corrente' ? j.cor[j.vez].length + 1 : 0, x });
    vibrar(6);
    render();
  }
  // pega o dado escolhido e já o põe no destino (uma ação só: nada fica pela metade)
  function pegarDado(modo) {
    pergunta = null;
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
  function soltarEscolha() {
    const j = jogo;
    foco = null; pergunta = null;
    j.sel = null;
    if (j.fase === 'alvo' || j.fase === 'ajuste') { j.fase = 'pegar'; j.alvo = null; j.ajusteIdx = null; }
  }
  function cancelarEscolha() { soltarEscolha(); render(); }
  // a carta escolhida agora (a aberta, ou a que espera o dado), para ela ficar levantada na mão
  const escolhendoDado = (j, p) => humano(p) && j.vez === p && (j.fase === 'alvo' || j.fase === 'ajuste') && !j.pensando;
  const cartaEscolhida = (j, p) => (escolhendoDado(j, p) ? j.alvo : p === j.vez ? cartaEmFoco(j) : null);
  // tocar numa carta sua, na sua vez: a que pede um dado já espera o dado (toque nele ou arraste a carta até ele);
  // as outras sobem e mostram Usar ou Armar. Tocar de novo devolve. Fora da vez, e as do rival: a janela de leitura
  function tocarCarta(p, c) {
    const j = jogo;
    if (escolhendoDado(j, p)) { const mesma = j.alvo === c; soltarEscolha(); if (mesma) return render(); }
    if (!podeAbrir(j, p)) return abrirCarta(p, c);
    if (cartaEmFoco(j) === c) { foco = null; return render(); }
    j.sel = null;
    Som.tocar('carta'); vibrar(6);
    if (CARTAS[c].alvo && podeUsar(p, c).ok) { foco = null; j.fase = 'alvo'; j.alvo = c; return render(); }
    foco = { c, chave: chaveVez(j) };
    const serve = podeUsar(p, c).ok;
    render();
    if (!serve) tremerCarta(p, c);
  }
  function tremerCarta(p, c) {
    const el = document.querySelector(`.cartas [data-carta="${c}"][data-dono="${p}"]`); if (!el) return;
    el.classList.remove('treme'); void el.offsetWidth; el.classList.add('treme'); vibrar([6, 40, 6]);
  }

  function abrirCarta(p, c) {
    const j = jogo, k = CARTAS[c], pu = podeUsar(p, c);
    const meu = (j.modo !== 'local' && p === 0) || (j.modo === 'local' && j.vez === p);
    let e = j.cartas[p][c];
    if (!meu && e === 'armada' && c !== 'espelho') e = 'pronta';
    const estado = { pronta: 'na mão', armada: 'armada', usada: 'usada', perdida: 'perdida' }[e] || e;
    document.getElementById('cartaDetalhe').innerHTML = `${k.arte}<div><h2 id="cartaTitulo">${k.nome}</h2>
      <p class="nota">${k.tipo === 'armadilha' ? 'Armadilha' : 'Efeito'}${k.pontos ? ` · carta de pontos <span class="raio">${RAIO}</span>` : ''} · ${estado}</p><p style="margin-top:8px">${k.texto}</p></div>`;
    const visivel = humano(p) && j.vez === p;
    const nota = !meu ? 'O deck do rival fica à mostra. Uma carta virada (?) é uma armadilha dele ainda não revelada.'
      : !visivel ? 'Só na sua vez.' : pu.ok ? '' : (pu.motivo || '');
    document.getElementById('cartaNota').textContent = nota;
    const rot = k.alvo ? 'Escolher o dado' : k.tipo === 'armadilha' ? 'Armar' : 'Usar';
    document.getElementById('cartaBotoes').innerHTML =
      (visivel && e === 'pronta' ? `<button class="btn btn-mel" data-usar="${c}" ${pu.ok ? '' : 'disabled'}>${rot}</button>` : '') +
      `<button class="btn btn-papel" data-fechar-carta="1">Fechar</button>`;
    document.getElementById('janelaCarta').hidden = false;
    Som.tocar('carta');
    (document.querySelector('#cartaBotoes [data-usar]:not(:disabled)') || document.querySelector('#cartaBotoes [data-fechar-carta]')).focus();
  }

  // a carta virada do rival: qual armadilha ela pode ser (pelo que ainda resta no deck dele)
  function abrirVirada(r) {
    const j = jogo, eu = j.vez, n = nomes();
    document.getElementById('cartaDetalhe').innerHTML = `<span class="arte-verso" aria-hidden="true">${VERSO}</span><div><h2 id="cartaTitulo">Carta virada</h2>
      <p class="nota">armadilha de ${esc(n[r])}</p><p style="margin-top:8px">${cartaViradaTxt(r, j.cor[eu === r ? 1 - r : eu].length)}</p>
      <p style="margin-top:8px">Ela age sozinha quando a condição dela acontecer, e aí aparece para os dois.</p></div>`;
    document.getElementById('cartaNota').textContent = '';
    document.getElementById('cartaBotoes').innerHTML = `<button class="btn btn-papel" data-fechar-carta="1">Fechar</button>`;
    document.getElementById('janelaCarta').hidden = false;
    Som.tocar('carta');
    document.querySelector('#cartaBotoes [data-fechar-carta]').focus();
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
    const alvo = p === j.vez && dadoEscolhido(j) >= 0 ? previaAlvos(p, dadoEscolhido(j)).bolso : null;
    if (alvo) return `<button class="bolso alvo-dado alvo-${alvo.cls}" data-alvo-dado="bolso" aria-label="Bolso: ${alvo.txt}"><span class="rot">Bolso</span>${b === null ? '<span class="bolso-vazio"></span>' : `<span class="mini${util ? ' util' : ''}">${dadoHTML(b, skinDe(p))}</span>`}<span class="alvo-chip">${alvo.txt}</span></button>`;
    return `<span class="bolso${destaque}" title="Bolso: guarda um dado"><span class="rot">Bolso</span>${b === null ? '<span class="bolso-vazio"></span>' : `<span class="mini${util ? ' util' : ''}">${dadoHTML(b, skinDe(p))}</span>`}</span>`;
  }
  function cartasHTML(p) {
    const j = jogo, deck = j.decks[p];
    if (!deck.length) return `<div class="cartas"><span class="vazio-cartas">sem cartas</span></div>`;
    const meu = j.modo !== 'local' && p === 0;
    // as suas cartas são grandes (arte, nome e o que fazem); as do rival, fichas (dá para ler, tocar abre a carta)
    const grande = p === 0 || j.modo === 'local';
    const minhaVez = podeAbrir(j, p), aberta = cartaEscolhida(j, p);
    let html = '<span class="rot">Cartas</span>';
    for (const c of deck) {
      const k = CARTAS[c];
      let e = j.cartas[p][c];
      if (e === 'armada' && !meu && c !== 'espelho') e = 'pronta';
      const raio = k.pontos ? `<span class="raio" aria-label="carta de pontos">${RAIO}</span>` : '';
      const rotulo = e === 'armada' ? 'armada' : '';
      const sub = e === 'armada' ? 'armada' : e === 'usada' ? 'usada' : e === 'perdida' ? 'perdida' : k.verbo;
      // "agora": dá para usar nesta vez; "nao-agora": é a sua vez, mas ela não serve agora
      const agora = minhaVez && podeUsar(p, c).ok;
      const hora = minhaVez && e === 'pronta' ? (agora ? ' agora' : ' nao-agora') : '';
      html += `<button class="carta ${k.tipo} ${e}${grande ? ' grande' : ' compacta'}${hora}${aberta === c ? ' aberta' : ''}${k.nome.length >= 10 ? ' nome-longo' : ''}${gesto(p, c, e)}" data-carta="${c}" data-dono="${p}" aria-label="${k.nome}: ${rotulo || (e === 'pronta' ? k.verbo : e)}"><span class="c-arte">${k.arte}</span><span class="c-txt"><span class="cnome">${k.nome}</span>${grande ? `<small class="cverbo">${sub}</small>` : ''}</span>${raio}</button>`;
    }
    let estados = '';
    // a carta virada do rival é um botão: tocar explica qual armadilha ela pode ser
    if (j.armada[p] && j.armada[p] !== 'espelho' && !meu) estados += `<button class="efeito-ativo oculta" data-virada="${p}" aria-label="Carta virada: uma armadilha armada">${VERSO} armadilha virada</button>`;
    if (j.coringa[p]) estados += `<span class="efeito-ativo" title="O próximo dado que romperia entra no lugar da frente">Remendo ativo</span>`;
    if (j.sobre[p]) estados += `<span class="efeito-ativo">Sobrecarga +2</span>`;
    if (j.extra[p]) estados += `<span class="efeito-ativo">Pressa: +1 dado</span>`;
    return `<div class="cartas">${html}</div><div class="estados">${estados}</div>`;
  }

  // comDecisao: a decisão da vez (destinos, disparar ou segurar...) entra no painel no lugar da fileira de cartas,
  // logo abaixo da corrente que ela afeta; o tabuleiro não ganha barra solta e não se mexe
  function painel(p, comDecisao = false) {
    const j = jogo, n = nomes(), daVez = j.vez === p && j.fase !== 'fim';
    const fx = j.fx && j.fx.p === p ? j.fx : null;
    const cor = fx ? fx.dados : j.cor[p];
    const L = j.cor[p].length;
    let slots = '';
    for (let i = 0; i < LIM; i++) {
      if (i < cor.length) {
        const r = i > 0 ? rels(cor[i - 1], cor[i]) : [];
        const frenteCls = !fx && i === cor.length - 1 ? ' frente' : '';
        slots += `<div class="slot${frenteCls}" data-slot="${i}">${r.length ? elo(r) : (i > 0 ? `<span class="elo r-coringa" title="Remendo: entrou no lugar da frente">${CHAPEU}</span>` : '')}${dadoHTML(cor[i], skinDe(p))}</div>`;
      } else if (i === cor.length && !fx) {
        const fs = facesQueEncaixam(cor);
        slots += `<div class="slot prox" title="Faces que sincronizam com a frente">${!st.pref.dicas ? '' : cor.length && !j.coringa[p] ? `<span class="prox-faces n${fs.length}">${fs.map(f => `<i>${f}</i>`).join('')}</span>` : '<svg class="ico prox-livre" viewBox="0 0 24 24" aria-label="qualquer dado começa"><path d="M12 6v12M6 12h12"/></svg>'}</div>`;
      } else slots += `<div class="slot vazio"></div>`;
    }
    const pct = Math.min(100, j.pts[p] / j.meta * 100);
    const prev = L >= 3 ? Math.min(100 - pct, pontos(L) / j.meta * 100) : 0;
    const vale = pontos(L) + (j.sobre[p] && L >= 4 ? 2 : 0);
    const valeAgora = L >= 3 ? `disparar vale <b>+${vale}</b>` : L ? `faltam <b>${3 - L}</b> para disparar` : 'qualquer dado começa';
    const seCrescer = L >= 3 && L < LIM ? ` · com ${L + 1}: <b>+${pontos(L + 1)}</b>` : '';
    // os pontinhos de "pensando…" moram no selo de vez, no alto da Mesa (no painel, em 360 px, estouravam com placar de 2 dígitos)
    const caiu = p === 1 && rivalCaiu(), sv = caiu ? segundosVolta() : null;
    const tag = j.fase === 'fim' ? (j.vencedor === p ? 'venceu' : '') : caiu ? (sv === null ? 'caiu' : sv === 0 ? 'sem conexão' : `caiu · <span class="volta-rival">${sv}</span> s`)
      : daVez ? (humano(p) ? (j.modo !== 'local' ? 'sua vez' : 'vez') : online() ? 'jogando' : 'pensando') + (online() ? '<span class="relogio-vez" data-relogio></span>' : '') : '';
    const avatar = j.modo === 'bot' && p === 1 ? Retratos.retrato(RETRATO_RIVAL[j.nivel], j.humor || '') : p === 0 ? iconeSVG(st.conta.icone) : online() ? iconeSVG(j.perfis[1].icone) : '';
    const fala = j.modo === 'bot' && p === 1 && j.fala ? `<div class="fala" aria-live="polite">${j.fala.txt}</div>` : '';
    return `<div class="jogador p${p}${daVez ? ' da-vez' : ''}">${fala}
      <div class="cab">${avatar}<span class="quem"><span class="nome">${n[p]}</span>${tag || relogioParado(p) ? `<span class="tags-vez">${tag ? `<span class="vez-tag">${tag}</span>` : ''}${relogioParado(p)}</span>` : ''}</span>
        ${bolsoHTML(p)}<span class="placar"><b data-placar="${p}">${j.pts[p]}</b><small>/${j.meta}</small></span></div>
      <div class="barra" role="progressbar" aria-valuemin="0" aria-valuemax="${j.meta}" aria-valuenow="${j.pts[p]}" aria-label="Pontos de ${n[p]}"><i style="width:${pct}%"></i>${prev ? `<span class="prev" style="left:${pct}%;width:${prev}%"></span>` : ''}</div>
      ${(() => { const alvo = p === j.vez && !fx && dadoEscolhido(j) >= 0 ? previaAlvos(p, dadoEscolhido(j)).corrente : null;
        return `<div class="corrente${fx ? ' fx-' + fx.tipo : L >= 5 ? ' fervendo' : L >= 4 ? ' quente' : ''}${alvo ? ` alvo-dado alvo-${alvo.cls}" data-alvo-dado="corrente" role="button" tabindex="0" aria-label="Corrente: ${alvo.txt}` : ''}" style="--fase:-${Math.round(performance.now() % 1800)}ms">${slots}${alvo ? `<span class="alvo-chip">${alvo.txt}</span>` : ''}</div>`; })()}
      ${st.pref.dicas && !cartaEscolhida(j, p) ? `<div class="info"><span>Corrente <b>${L}</b>/${LIM}</span><span>${valeAgora}${seCrescer}</span></div>` : ''}
      ${comDecisao && !cartaEscolhida(j, p) ? '<div class="decisao-slot"></div>' : cartasHTML(p) + (comDecisao ? '<div class="decisao-slot"></div>' : '')}
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
        else if (cabe) tags = `<span class="tag r-coringa" title="Remendo: entra no lugar da frente">${CHAPEU}<span class="tnome curta"> Remendo</span></span>`;
        else if (salvo) tags = `<span class="tag inicio">Bolso</span>`;
        else tags = `<span class="tag rompe">✕<span class="tnome curta"> Rompe</span></span>`;
        if (contra && dicas) tags = `<span class="tag previa">vira ${vv}</span>` + tags;
      }
      if (j.fase === 'ajuste' && j.ajusteIdx === i) tags = `<span class="tag previa">ajustar</span>`;
      const serveRival = dicas && ele.length && encaixa(ele, valorAoPegar(1 - p, d)) && j.fase !== 'fim';
      const cls = ['pega', d.novo ? 'novo' : '', window.Rolagem && Rolagem.ativo(d.id) ? 'rolando' : '', window.Rolagem && Rolagem.pousando(d.id) ? 'pousando' : '', !salvo && j.fase === 'pegar' && dicas ? 'nao-cabe' : '', j.sel === d.id || (j.fase === 'ajuste' && j.ajusteIdx === i) ? 'escolhido' : '', j.destaque === d.id ? 'destaque' : '', j.virando === d.id ? 'virando' : '', mudou(d.id) ? 'mudou' : ''].join(' ');
      const rotulo = `${j.fase === 'alvo' ? 'Escolher' : 'Pegar'} ${d.v}${contra ? `, chega virado como ${vv}` : ''}${cabe ? (r.length ? ', ' + r.map(k => REL[k].nome).join(' e ') : '') : salvo ? ', só pelo Bolso' : ', rompe a corrente'}${serveRival ? ', serve ao rival' : ''}${marcado !== null ? ', marcado com Espelho' : ''}`;
      return `<button class="${cls}" style="--i:${i}" data-i="${i}" data-id="${d.id}" ${ativo ? '' : 'disabled'} aria-label="${rotulo}" aria-pressed="${j.sel === d.id || (j.fase === 'ajuste' && j.ajusteIdx === i)}">
        <span class="kbd">${i + 1}</span><span class="face">${dadoHTML(d.v, skinMesa())}${mudou(d.id) && marcaMudanca.antes != null ? `<span class="era">era ${marcaMudanca.antes}</span>` : ''}${serveRival ? '<span class="alvo-rival"></span>' : ''}${marcado !== null ? `<span class="marca-esp dono${marcado}" title="Marcado com Espelho">${CARTAS.espelho.ico}</span>` : ''}</span><span class="tags">${tags}</span></button>`;
    }).join('');
  }

  // o que a carta virada (?) do rival pode ser, com o que cada armadilha faria neste disparo
  function cartaViradaTxt(r, L) {
    const j = jogo, n = nomes();
    const efeito = { interferencia: L < 4 ? 'Interferência (não pega disparo de 3)' : j.pts[1 - r] >= j.pts[r] ? 'Interferência (−1 neste disparo)' : 'Interferência (não pega: você está atrás)', pedagio: `Pedágio (+${R.pedagioDe(jogo.meta)} para ele se você disparar)`,
      fundo: 'Fundo Falso (pega o próximo dado que você puser no Bolso)', ancora: 'Âncora (segura a corrente de 4+ dele)', lacre: 'Lacre (anula o próximo efeito que você usar)' };
    const traps = armadilhasOcultas(r).map(c => efeito[c] || CARTAS[c].nome);
    return traps.length === 1 ? `${n[r]} tem uma armadilha virada (?): ${traps[0]}.` : `${n[r]} tem uma armadilha virada (?). Pode ser ${traps.join(' ou ')}.`;
  }

  // a carta escolhida, embaixo da fileira: o que faz e as ações (Usar ou Armar, Ler); o texto inteiro mora no
  // Ler e no segurar a carta
  const btnLer = c => `<button class="btn btn-papel btn-ler" data-acao="ler-carta" data-ler="${c}">Ler</button>`;
  const btnVoltar = acao => `<button class="btn btn-papel btn-x" data-acao="${acao}" aria-label="Voltar" title="Voltar">✕</button>`;
  function cartaAbertaHTML(p, c) {
    const j = jogo, k = CARTAS[c], e = j.cartas[p][c], pu = podeUsar(p, c);
    const rot = k.tipo === 'armadilha' ? ['Armar', 'vira para baixo'] : ['Usar', k.verbo];
    const usar = e === 'pronta' ? `<button class="btn btn-duplo btn-mel" data-usar="${c}" ${pu.ok ? '' : 'disabled'}><span>${rot[0]}</span><small>${rot[1]}</small></button>` : '';
    return `<p class="so-leitor">${instrucaoCarta(j)}</p><div class="botoes">${usar}${btnLer(c)}${btnVoltar('fechar-carta')}</div>`;
  }
  // a frase da carta escolhida, na linha da Mesa (no lugar do último lance): o que fazer agora, ou por que não dá
  function instrucaoCarta(j) {
    const p = j.vez, ajudas = st.pref.dicas;
    if (escolhendoDado(j, p) && j.fase === 'alvo') {
      const txt = { espelho: 'Toque no dado que vai receber a marca do <b>Espelho</b>', virar: 'Toque no dado que vai <b>virar</b>', ajuste: 'Toque no dado que vai receber o <b>Ajuste</b>' }[j.alvo];
      return `${txt}${ajudas ? ', ou arraste a carta até ele' : ''}.`;
    }
    const c = p === j.vez ? cartaEmFoco(j) : null; if (!c) return '';
    const k = CARTAS[c], e = j.cartas[p][c], pu = podeUsar(p, c);
    if (e === 'armada') return `<b>${k.nome}</b>: armada, age sozinha quando a condição acontecer.`;
    if (e !== 'pronta') return `<b>${k.nome}</b>: ${e === 'usada' ? 'já usada' : 'perdida'}.`;
    if (!pu.ok) return `<b>${k.nome}</b>: ${pu.motivo || 'agora não dá.'}`;
    return `<b>${k.nome}</b>: ${k.verbo}.${ajudas ? ` Toque em ${k.tipo === 'armadilha' ? 'Armar' : 'Usar'} ou arraste a carta até a Mesa.` : ''}`;
  }
  // usar a carta (as que pedem um dado vão para a escolha na Mesa): do painel e da janela
  function acionarCarta(c) {
    const j = jogo, p = j.vez;
    if (!humano(p) || j.pensando || !podeUsar(p, c).ok) return;
    foco = null; j.sel = null;
    if (CARTAS[c].alvo) { j.fase = 'alvo'; j.alvo = c; }
    else if (usarCarta(p, c) === 'proximo') { depois('proximo'); return; }
    render();
  }

  // a barra de jogada só aparece quando há uma decisão (dado escolhido, para onde vai, disparar ou segurar, Pressa,
  // carta com alvo, fim); escolher um dado não precisa de texto: o "sua vez" do painel e as etiquetas dos dados bastam.
  // O que não é jogada (ajudas, regras, ajustes, deck, loja, online, desistir) mora no menu de pausa, na linha da Mesa
  const acoesHTML = () => acoesConteudo();
  function acoesConteudo() {
    const j = jogo, p = j.vez, n = nomes(), quem = `<b class="cor${p}">${n[p]}</b>`, ajudas = st.pref.dicas;
    if (j.fase === 'fim') {
      return `<div class="status"><b class="cor${j.vencedor}">${n[j.vencedor]}</b> venceu por ${j.pts[j.vencedor]} × ${j.pts[1 - j.vencedor]}.</div>
        <div class="botoes"><button class="btn btn-mel" data-acao="nova" ${online() && Rede.pediuRevanche ? 'disabled' : ''}>${online() ? (Rede.pediuRevanche ? 'Esperando o rival…' : 'Revanche') : 'Jogar de novo'}</button><button class="btn btn-papel" data-acao="deck">Trocar deck</button></div>`;
    }
    if (!humano(p)) return '';   // a vez do rival aparece no painel dele (pensando, jogando, caiu · N s)
    const cf = cartaEmFoco(j);
    if (cf) return cartaAbertaHTML(p, cf);
    const eu = j.cor[p];
    if (j.fase === 'alvo') {
      return `<p class="so-leitor">${instrucaoCarta(j)}</p><div class="botoes">${btnLer(j.alvo)}<button class="btn btn-papel" data-acao="cancelar-alvo">Cancelar</button></div>`;
    }
    if (j.fase === 'ajuste') {
      const d = j.mesa[j.ajusteIdx];
      return `<div class="status">Ajuste no ${mini(d.v, skinMesa())} <b>${d.v}</b>.${ajudas ? ' Toque em outro dado para trocar.' : ''}</div><div class="botoes">
        <button class="btn btn-duplo btn-mel" data-ajuste="-1" ${d.v <= 1 ? 'disabled' : ''}><span>−1</span><small>${d.v > 1 ? 'vira ' + (d.v - 1) : 'não dá'}</small></button>
        <button class="btn btn-duplo btn-mel" data-ajuste="1" ${d.v >= 6 ? 'disabled' : ''}><span>+1</span><small>${d.v < 6 ? 'vira ' + (d.v + 1) : 'não dá'}</small></button>
        ${btnVoltar('cancelar-alvo')}</div>`;
    }
    if (j.fase === 'destino' && j.mao) {
      const v = j.mao.v, ds = destinos(p, v), b = j.bolso[p];
      const relTxt = x => { const r = eu.length ? rels(frente(eu), x) : []; return r.length ? r.map(k => REL[k].nome).join(' + ') : (eu.length && j.coringa[p] ? `Remendo: entra no lugar do ${frente(eu)}` : 'começa a corrente'); };
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
      if (j.pts[p] + vale >= j.meta) { nivel = 'vence'; txt = `Disparar agora vence a partida${ocultas.includes('interferencia') && L >= 4 && j.pts[p] >= j.pts[1 - p] && j.pts[p] + vale - 1 < j.meta ? ', se a carta virada do rival não for a Interferência' : ''}.`; }
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
        ${ajudas ? `<div class="risco ${nivel}"><span>${txt}</span></div>${extra}` : ''}
        <div class="botoes">
          <button class="btn btn-duplo btn-mel" data-acao="disparar"><span>Disparar</span><small>+${vale} agora</small></button>
          <button class="btn btn-duplo btn-papel" data-acao="segurar"><span>Segurar</span><small>${L + 1 <= LIM ? `com ${L + 1} vale +${pontos(L + 1)}` : 'continuar'}</small></button>
          ${sobreBtn}
        </div>`;
    }
    const algumSeguro = j.mesa.some(x => seguroDado(p, x));
    // um dado escolhido: sem botões (a corrente e o Bolso são os alvos); só a pergunta, quando a jogada tem risco
    const pg = perguntaValida(j);
    // o que rompe a corrente nunca é o botão de destaque
    if (pg) return `<div class="status pergunta-dado">${pg.txt}</div><div class="botoes">${pg.botoes.map(([m, r], i) => `<button class="btn ${/romp/i.test(r) ? 'btn-papel perigo' : i ? 'btn-papel' : 'btn-mel'}" data-confirma="${m}">${r}</button>`).join('')}${btnVoltar('cancelar')}</div>`;
    if (dadoEscolhido(j) >= 0) return '';
    // sem dado escolhido não há decisão: nada de barra (a não ser o segundo dado da Pressa, que pode ser dispensado)
    if (!j.segundoDado) return '';
    let msg;
    if (j.segundoDado) msg = `escolha o segundo dado (Pressa) ou dispense${eu.length >= 3 ? ' e vá para o disparo' : ''}.`;
    else if (!algumSeguro) msg = `<b>nenhum dado sincroniza</b> com o seu ${frente(eu)}, nem o do Bolso. Use uma carta ou escolha um: a corrente de ${eu.length} rompe${j.armada[p] === 'ancora' && eu.length >= 4 ? ', mas a sua Âncora está armada' : ''}.`;
    else if (!ajudas) msg = 'escolha um dado.';
    else msg = eu.length ? `escolha um dado. Sua frente é <b>${frente(eu)}</b>: sincronizam ${facesQueEncaixam(eu).join(', ')}${j.coringa[p] ? `; os outros entram no lugar do ${frente(eu)} (Remendo)` : ''}.` : 'escolha um dado. Sua corrente está vazia: qualquer um começa.';
    const prontas = j.decks[p].filter(c => usavel(p, c)).length;
    const dispensa = j.segundoDado ? `<div class="botoes"><button class="btn btn-papel" data-acao="dispensar">Dispensar o 2.º dado</button></div>` : '';
    return `<div class="status">${quem}, ${msg}</div>${dispensa}${prontas && ajudas ? `<p class="nota" style="margin:0">Toque numa carta sua para usar (${prontas} ${prontas === 1 ? 'pronta' : 'prontas'}).</p>` : ''}`;
  }

  // na hora de disparar ou segurar, a sua corrente precisa estar à vista: em telas baixas o painel de ação (preso no
  // rodapé) pode cobri-la; então a página rola o mínimo para ela aparecer — uma vez por decisão, sem brigar com quem rola
  function mostrarCorrenteNaDecisao(j) {
    const p = j.modo === 'local' ? j.vez : 0;
    const chave = j.fase === 'decidir' && humano(j.vez) ? `${j.rodada}:${j.compras}:${j.vez}` : null;
    if (!chave || j.decisaoVista === chave) return;
    j.decisaoVista = chave;
    requestAnimationFrame(() => {
      const cor = document.querySelector(`#pj${p} .corrente`), acoes = document.getElementById('acoes');
      if (!cor || !acoes) return;
      const falta = cor.getBoundingClientRect().bottom + 8 - acoes.getBoundingClientRect().top;
      if (falta > 0 && cor.getBoundingClientRect().top - falta > 0) window.scrollBy({ top: falta, behavior: Fx.cfg.animacoes ? 'smooth' : 'auto' });
    });
  }
  // ---------- de quem é a vez: óbvio de longe (v0.12) ----------
  // Na sua vez a Mesa acende (a moldura de feltro ganha a sua cor, respirando) e o selo no alto da Mesa diz "Sua vez";
  // na vez do rival a Mesa esmaece e o selo diz de quem é. No online o selo traz o relógio da vez, a aba do navegador
  // avisa ("● Sua vez"), a vez é lembrada na metade do tempo e nos 10 s finais (o tempo acabar faz perder a vez), e quem
  // volta para a tela (outra aba, celular bloqueado) na sua vez ouve e vê o aviso de novo.
  const TITULO = document.title;
  // aviso: em quantos segundos da vez foi o último aviso (os lembretes só tocam abaixo dele, uma vez cada)
  const Vez = { idp: undefined, chave: undefined, aviso: null };
  // 'minha' | 'rival' | null (no modo a dois, os dois são da casa: o selo não aparece)
  const vezDoAparelho = j => (!j || j.fase === 'fim' || j.intro || j.modo === 'local' ? null : j.vez === 0 ? 'minha' : 'rival');
  const segundosDaVez = j => (online() && j.prazoAte && !rivalCaiu() ? Math.max(0, Math.ceil((j.prazoAte - Date.now()) / 1000)) : null);
  function seloVez(j) {
    const el = document.getElementById('seloVez'), quem = vezDoAparelho(j);
    document.body.classList.toggle('vez-minha', quem === 'minha');
    document.body.classList.toggle('vez-rival', quem === 'rival');
    el.hidden = !quem;
    if (!quem) { document.title = TITULO; return; }
    const s = segundosDaVez(j), tempo = s === null ? '' : `<span class="selo-tempo">${relogioTxt(s)}</span>`;
    const pensa = quem === 'rival' && !rivalCaiu() && s === null ? '<span class="pensando-pontos" aria-hidden="true"></span>' : '';
    el.className = `selo-vez ${quem}${s !== null && s <= 10 ? ' urgente' : ''}`;
    // o selo não aparece mais no meio da Mesa (a etiqueta "sua vez" do painel basta); no online o relógio mora nela
    document.querySelectorAll('[data-relogio]').forEach(r => {
      r.textContent = s === null ? '' : ` · ${relogioTxt(s)}`;
      r.closest('.vez-tag').classList.toggle('urgente', s !== null && s <= 10);
    });
    el.innerHTML = quem === 'minha' ? `<b>Sua vez</b>${tempo}` : `<b>Vez de ${nomes()[1]}</b>${rivalCaiu() ? '<span class="selo-tempo">caiu</span>' : tempo}${pensa}`;
    document.title = online() && quem === 'minha' ? `● Sua vez${s === null ? '' : ` · ${relogioTxt(s)}`} · ${TITULO}` : TITULO;
  }
  function pulinho(el, forte = false) {
    if (el && Fx.cfg.animacoes) el.animate([{ transform: 'none' }, { transform: forte ? 'translateY(-6px) scale(1.03)' : 'translateY(-4px) scale(1.012)' }, { transform: 'none' }], { duration: forte ? 480 : 380, easing: 'cubic-bezier(.3,1.5,.5,1)' });
  }
  function avisarVez(sub = '', forte = false, titulo = null) {
    const s = segundosDaVez(jogo);
    Vez.aviso = { chave: Vez.chave, s: s === null ? Infinity : s };
    Som.tocar('suaVez'); vibrar(forte ? [60, 60, 60, 60, 90] : [40, 50, 40]);
    pulinho(document.querySelector('#pj0 .vez-tag'), true);
    if (!document.hidden && !inicioAberto()) Fx.chamada(titulo || (forte ? 'Ainda é sua vez' : 'Sua vez'), sub, 'vez-chamada de-jogo', { ms: forte ? 1800 : titulo ? 1600 : 1100 });
  }
  // deNovo: a vez anterior também era sua (você está atrás e abre a Mesa nova, ou o rival usou a Pausa): a chamada diz
  // por quê, contra o rival e no online; sem isso, jogar duas ou três vezes seguidas parecia erro do jogo
  function porqueDeNovo(j) {
    const n = nomes(), recente = j.log.slice(0, 4);
    if (recente.some(l => l.p === j.vez && l.txt.includes('abre a Mesa'))) return 'você está atrás no placar e abre a Mesa nova';
    if (recente.some(l => l.p === 1 - j.vez && l.txt.startsWith('usou Pausa'))) return `${n[1 - j.vez]} usou a Pausa e passou a vez`;
    return '';
  }
  function chegouAVez(j, deNovo = false) {
    pulinho(document.getElementById('pj' + (j.modo === 'local' ? j.vez : 0)));
    const motivo = deNovo && j.modo !== 'local' ? porqueDeNovo(j) : '';
    if (!online()) {
      Som.tocar('vez');
      if (motivo && !inicioAberto()) Fx.chamada('Sua vez de novo', motivo, 'vez-chamada de-jogo', { ms: 1600 });
      return;
    }
    const s = segundosDaVez(j);
    avisarVez(motivo || (s === null ? '' : `${relogioTxt(s)} no seu relógio`), false, motivo ? 'Sua vez de novo' : null);
  }
  // os lembretes do relógio no online: quando ele passa de 1 min, de 30 s e de 10 s, na sua vez. Por faixa, não pelo
  // segundo exato: com a aba em segundo plano o relógio pula segundos
  function lembrarVez(j) {
    const s = segundosDaVez(j);
    if (s === null || vezDoAparelho(j) !== 'minha' || j.pensando) return;
    const ultimo = Vez.aviso && Vez.aviso.chave === Vez.chave ? Vez.aviso.s : Infinity;
    if (s <= 10 && ultimo > 10) avisarVez(`${s} s no seu relógio: se ele acabar, você perde a partida`, true);
    else for (const marca of [30, 60]) if (s > 10 && s <= marca && ultimo > marca) { avisarVez(`${relogioTxt(s)} no seu relógio`); break; }
  }
  document.addEventListener('visibilitychange', () => {
    if (!jogo) return;
    seloVez(jogo);
    // de volta à tela na sua vez: o aviso de novo (antes passava despercebido)
    if (!document.hidden && online() && vezDoAparelho(jogo) === 'minha' && !jogo.pensando) {
      const s = segundosDaVez(jogo);
      setTimeout(() => avisarVez(s === null ? '' : `${relogioTxt(s)} no seu relógio`, s !== null && s <= 10), 250);
    }
  });

  function render() {
    if (!jogo) return;
    const j = jogo;
    if (j.voo && !j.voo.de) { const el = document.querySelector(`.pega[data-id="${j.voo.id}"] .face`); if (el) j.voo.de = el.getBoundingClientRect(); }
    document.getElementById('tabuleiro').classList.toggle('modo-local', j.modo === 'local');
    // durante a partida a tela fica só com o que importa nela (cabeçalho enxuto; no PC, as regras saem da lateral)
    document.body.classList.toggle('em-partida', j.fase !== 'fim');
    const acoes = document.getElementById('acoes'), barra = acoesHTML();
    document.getElementById('tabuleiro').appendChild(acoes);   // sai do painel antes de ele ser redesenhado
    const donoBarra = !barra ? -1 : j.modo === 'local' && j.fase !== 'fim' ? j.vez : 0;
    document.getElementById('pj1').innerHTML = painel(1, donoBarra === 1);
    document.getElementById('pj0').innerHTML = painel(0, donoBarra === 0);
    acoes.innerHTML = barra; acoes.hidden = !barra;
    if (barra) document.querySelector(`#pj${donoBarra} .decisao-slot`).appendChild(acoes);
    const mesa = document.getElementById('mesa');
    mesa.innerHTML = mesaHTML();
    mesa.classList.toggle('alvo', j.fase === 'alvo');
    const resta = j.mesa.length;
    document.getElementById('mesaInfo').textContent = `rodada ${j.rodada} · ${resta} ${resta === 1 ? 'dado' : 'dados'}`;
    const novidade = !document.getElementById('pontoOnline').hidden, somLigado = st.pref.som || st.pref.musica;
    document.getElementById('barraPartida').hidden = j.fase === 'fim';
    document.getElementById('btnPausa').classList.toggle('com-aviso', novidade);
    document.getElementById('pontoMenuTopo').hidden = !novidade;
    const som = document.getElementById('btnSom'); som.setAttribute('aria-pressed', String(somLigado)); som.classList.toggle('sem-som', !somLigado);
    const n = nomes();
    const linha = l => `${l.p === null ? '' : `<span class="cor${l.p}">${n[l.p]}</span> `}${l.txt}`;
    const instrucao = humano(j.vez) ? instrucaoCarta(j) || instrucaoDado(j) : '', ticker = document.getElementById('ticker');
    ticker.innerHTML = instrucao || (j.log[0] ? linha(j.log[0]) : '');
    ticker.classList.toggle('instrucao', !!instrucao);
    mostrarCorrenteNaDecisao(j);
    guardarPartida();
    if (j.modo === 'online' && j.fase !== 'fim' && inicioAberto()) esconderInicio();
    if (j.fase !== 'fim' && Som.musica.cenaAtual === 'fim') Som.musica.cena('jogo');
    Som.musica.intensidade(Math.max(j.pts[0], j.pts[1]) / j.meta);
    seloVez(j);
    // a vez chegou a um humano: sininho e o painel dá um pulinho (no modo 2 jogadores, a cada troca); no online, também
    // a chamada "Sua vez". A memória da vez fica fora do jogo: no online cada estado do servidor é um objeto novo (com
    // ela dentro do jogo, o aviso nunca tocava no online). A chave conta as vezes: abrir duas seguidas (quem está atrás
    // abre a Mesa) também avisa.
    const idp = online() ? `${j.sala}:${j.partida}` : j;
    if (idp !== Vez.idp) { Vez.idp = idp; Vez.chave = undefined; }
    const chave = j.fase === 'fim' || j.intro ? null : `${j.vezes || 0}:${j.vez}`;
    if (chave !== Vez.chave) {
      const antes = Vez.chave; Vez.chave = chave;
      if (chave !== null && humano(j.vez) && (online() || (antes !== undefined && (j.modo === 'local' || antes !== null)))) chegouAVez(j, !!antes && antes.endsWith(`:${j.vez}`));
    }
    if (j.fx && !j.fx.agendado) {
      const id = j.fx.id; j.fx.agendado = true;
      setTimeout(() => { if (jogo.fx && jogo.fx.id === id) { jogo.fx = null; render(); } }, st.pref.animacoes ? 900 : 10);
    }
    consumirEventos();
  }

  // os dados caem como cubos 3D (física gravada, face da regra: js/rolagem.js); sem animação, o som de antes
  function rolarNaTela(lista) {
    const rolou = st.pref.animacoes && window.Rolagem && Rolagem.disponivel() && lista.length && lista.every(d => jogo.mesa.some(x => x.id === d.id)) && Rolagem.lancar(lista, {
      faceHTML: v => dadoHTML(v, skinMesa()), skin: skinMesa(), som: (nome, dados) => Som.tocar(nome, dados),
      velocidade: { calmo: 0.9, normal: 1, rapido: 1.2 }[st.cfg.ritmo] || 1,
    });
    if (!rolou) Som.tocar('rolar', { n: lista.length });
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
        case 'rolar': {
          // a 1ª Mesa da partida rola quando as janelas do começo (deck, versus) fecham: rolarAVista
          if (jogo.intro || (!jogo.compras && document.querySelector('.janela:not([hidden])'))) break;
          if (!jogo.compras) jogo.rolouAVista = true;   // já rolou à vista: as janelas fechando depois não repetem
          rolarNaTela(jogo.mesa.filter(d => d.novo).map(d => ({ id: d.id, v: d.v })));
          break;
        }
        case 'pegar': Som.tocar('pegar'); if (humano(e.p)) vibrar(8); break;
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
          if (e.L >= 4) Fx.clarao(corEl, e.L >= 6 ? 1 : e.L === 5 ? 0.75 : 0.5);
          if (humano(e.p)) vibrar(e.L >= 5 ? [20, 30, 40] : 15);
          if (placar) {
            // os pontos voam da corrente até o placar; o número sobe com um tique por ponto quando chegam
            const ate = jogo.pts[e.p], de0 = e.de, ganho = ate - de0;
            Fx.texto(placar, `+${e.ganho}`);
            if (Fx.cfg.animacoes && Fx.cfg.particulas) placar.textContent = de0;
            const orbes = Math.max(1, Math.min(6, ganho));
            Fx.orbes(corEl, placar, orbes, e.p === 0 ? '#ffe3a3' : '#ffd0dc', i => {
              Som.tocar('tique', { k: i });
              const v = Math.min(ate, de0 + Math.round(ganho * (i + 1) / orbes));
              placar.textContent = v; Fx.pulsar(placar);
            }).then(() => { const pl = qs(`[data-placar="${e.p}"]`); if (pl) pl.textContent = jogo.pts[e.p]; });
          }
          if (e.L >= 5) Fx.tremer(qs('#tabuleiro'), e.L === 6 ? 1.4 : 0.8);
          if (e.L === 6) { Fx.chamada('Sinfonia!', 'corrente completa de 6', e.p === 1 && j.modo !== 'local' ? 'rival' : '', { classe: 'de-jogo' }); vibrar([30, 40, 60]); }
          else if (e.L === 5) Fx.chamada('Belo disparo!', `corrente de 5 · +${e.ganho}`, e.p === 1 && j.modo !== 'local' ? 'rival' : '', { classe: 'de-jogo' });
          if (e.harm) Fx.chamada('Harmonia!', `todos os elos em ${REL[e.harm].nome}`, 'suave', { classe: 'de-jogo' });
          if (e.L >= 4 && humano(e.p)) setTimeout(() => Som.tocar('momento'), 500);
          break;
        }
        case 'placar': { const pl = qs(`[data-placar="${e.p}"]`); if (pl) { Fx.contar(pl, e.de, jogo.pts[e.p]); Fx.pulsar(pl); Fx.texto(pl, '+3'); } break; }
        case 'ruptura': {
          Som.tocar('ruptura', { L: e.L }); Fx.poeira(qs(`#pj${e.p} .corrente`), 8 + e.L * 2); if (humano(e.p)) vibrar(90);
          if (painelEl) Fx.tremer(painelEl, 0.6);
          if (e.L >= 4 && humano(e.p)) Fx.texto(qs(`#pj${e.p} .corrente`), 'Rompeu', 'pequeno ruim');
          break;
        }
        case 'salvo': Som.tocar('salvo'); Fx.chamada('Salvo!', e.txt, 'suave', { classe: 'de-jogo' }); Fx.faiscas(qs(`#pj${e.p} .corrente`), 14, ['#cdeccf', '#fff6e6']); break;
        case 'bloqueio': Som.tocar('bloqueio'); Fx.texto(qs(`#pj${e.p} .corrente`) || null, 'Bloqueio!', 'pequeno'); break;
        case 'carta': {
          Som.tocar('carta');
          if (e.id != null && e.antes != null) marcarMudanca([e.id], e.antes);
          else if (e.c === 'rerrolar') marcarMudanca(j.mesa.map(d => d.id), null);
          if (!humano(e.p) || j.modo === 'local') Fx.chamada(e.nome, explicarCarta(e, n[e.p]), e.p === 1 && j.modo !== 'local' ? 'rival' : 'suave', { ico: CARTAS[e.c].arte, ms: AVISO_CARTA, classe: 'aviso-carta' });
          break;
        }
        case 'armou': {
          Som.tocar('armou');
          if (humano(e.p) && j.modo !== 'local') break;
          if (e.c === 'espelho' && j.marca) { marcarMudanca([j.marca.id], null); Fx.chamada('Espelho', `${n[e.p]} marcou um ${(j.mesa.find(d => d.id === j.marca.id) || {}).v || ''} da Mesa: se você pegá-lo, ele vira`, e.p === 1 && j.modo !== 'local' ? 'rival' : 'suave', { ico: CARTAS.espelho.arte, ms: AVISO_CARTA, classe: 'aviso-carta' }); }
          else Fx.chamada('Armadilha virada', `${n[e.p]} armou uma armadilha (?). Toque nela para ver o que pode ser`, e.p === 1 && j.modo !== 'local' ? 'rival' : 'suave', { ico: VERSO, ms: AVISO_CARTA, classe: 'aviso-carta' });
          break;
        }
        case 'revelou': {
          Som.tocar('revelou'); Fx.chamada(CARTAS[e.c].nome + '!', e.txt, e.p === 1 && j.modo !== 'local' ? 'rival' : '', { classe: 'de-jogo' });
          Fx.faiscas(painelEl, 22, ['#e2d6ff', '#fff6e6', '#ffe3a3']); vibrar([40, 60, 40]);
          break;
        }
        case 'virar': setTimeout(() => { if (jogo.virando === e.id) jogo.virando = null; }, 500); Som.tocar('virar'); break;
        case 'chamada': Som.tocar('momento'); Fx.chamada(e.titulo, e.sub, e.estilo === 'esquiva' ? (e.p === 1 && j.modo !== 'local' ? 'rival' : '') : e.estilo, { classe: 'de-jogo' }); break;
        case 'falar': if (j.modo === 'bot') falaDoEvento(e); break;
        case 'fim': {
          const venceuHumano = humano(e.p);
          Som.musica.cena('fim');
          if (venceuHumano) { Som.tocar('vitoria'); Fx.confete(120); Fx.chamada(e.virada ? 'Virada!' : j.modo !== 'local' ? 'Vitória!' : `${n[e.p]} venceu!`, e.virada ? 'veio de trás e venceu' : 'partida bem jogada', '', { classe: 'de-jogo' }); }
          else { Som.tocar('derrota'); Fx.chamada('Fim de partida', `${n[e.p]} venceu desta vez`, 'rival', { classe: 'de-jogo' }); }
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
      <p class="nota">${j.modo === 'bot' ? RIVAIS[j.nivel].desc + '. ' : online() ? `Rating ${j.perfis[1].rating}. ${tempoTxt(j.ritmo)}. ` : ''}Meta: ${j.meta} pontos. ${n[j.vez]} começa.</p><button class="btn btn-mel">Vamos lá</button></div>`;
    document.body.appendChild(el);
    Som.tocar('carta');
    let fechou = false;
    const fechar = () => {
      if (fechou) return; fechou = true; el.remove(); j.intro = false;
      if (jogo === j) rolarAVista();
      render(); talvezAutomato();
    };
    el.addEventListener('click', () => { Som.desbloquear(); fechar(); });
    setTimeout(fechar, 3200);
  }

  function mostrarFim() {
    const j = jogo, n = nomes(), v = j.vencedor;
    if (j.fase !== 'fim' || jogo !== j) return;
    document.getElementById('fimTitulo').textContent = j.modo !== 'local' ? (v === 0 ? 'Você venceu!' : `${n[1]} venceu`) : `${n[v]} venceu!`;
    // acabou antes da meta: por quê (sem isso, um 0 × 0 parece que a conexão caiu)
    const wo = j.desistencia, quem = wo === 0 && j.modo !== 'local' ? 'Você' : n[wo];
    const motivo = wo === undefined ? '' : { tempo: `${quem} ficou sem tempo no relógio.`, queda: `${quem} caiu e não voltou a tempo.`, saiu: `${quem} saiu da partida.` }[j.motivoFim] || `${quem} saiu da partida.`;
    document.getElementById('fimPlacar').innerHTML = `<span class="cor0">${n[0]} ${j.pts[0]}</span> × <span class="cor1">${j.pts[1]} ${n[1]}</span>${motivo ? `<small class="fim-motivo">${esc(motivo)}</small>` : ''}`;
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
      // uma carta por linha: no celular estreito, "Interferência" não divide a coluna com outra carta
      linha('Deck', (x, p) => j.decks[p].map(c => `<span class="td-carta">${CARTAS[c].nome}</span>`).join('') || '–') +
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
    const n = nomes(), pr = j.premio, conta = st.sessao && st.sessao.perfil ? st.sessao.perfil.nome : null, eu = conta || 'Eu';
    const quem = [j.modo === 'local' ? n[0] : eu, n[1]];
    // sem conta, "Você venceu!" no grupo parece falar de quem lê: aí o cartão diz "Venci!"
    const icone = id => (ICONES[id] ? id : 'bolinha');
    const dr = pr ? pr.rating - pr.ratingAntes : 0;
    const d = {
      titulo: !conta && j.modo !== 'local' && j.vencedor === 0 ? 'Venci!' : `${quem[j.vencedor]} venceu!`,
      modo: j.modo === 'bot' ? `contra ${n[1]} · meta ${j.meta}` : online() ? `duelo online · meta ${j.meta}` : `a dois na mesma mesa · meta ${j.meta}`,
      nomes: quem, pts: j.pts.slice(), vencedor: j.vencedor,
      retratos: [icone(st.conta.icone), j.modo === 'bot' ? RETRATO_RIVAL[j.nivel] : online() ? icone(j.perfis[1].icone) : 'raposa'],
      destaque: online() && pr && !pr.amistosa ? `Rating online ${pr.ratingAntes} → ${pr.rating} (${dr >= 0 ? '+' : ''}${dr}) · ${tituloDe(pr.rating)}`
        : (j.recordes || []).length ? `Novo recorde: ${j.recordes[0]}` : '',
      linhas: lances.map(m => ({ simbolo: m.simbolo, src: srcMomento(m.simbolo), txt: `${j.modo === 'local' ? n[m.p] + ': ' : ''}${m.txt}${m.vezes > 1 ? ` ×${m.vezes}` : ''}` })),
      endereco: PAGINA ? location.host : 'diceduel-game.vercel.app',
    };
    // a mensagem que vai junto da imagem, com o link do jogo
    const venci = j.vencedor === 0, placar = `${j.pts[j.vencedor]} × ${j.pts[1 - j.vencedor]}`;
    const texto = j.modo === 'local' ? `${quem[j.vencedor]} venceu ${quem[1 - j.vencedor]} por ${placar} no Dice Duel 🎲 Bora um duelo?`
      : venci ? `Venci ${online() ? quem[1] : `a ${quem[1]}`} por ${placar} no Dice Duel 🎲 Duvido você me ganhar!`
      : `Perdi para ${online() ? quem[1] : `a ${quem[1]}`} por ${placar} no Dice Duel 🎲 Me vinga?`;
    const este = { blob: null, texto };
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
    if (!j.premio) { el.innerHTML = `<span class="conta">${esc(j.semPremio || 'Contando o prêmio…')}</span>`; return; }
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
    if (st.abaLoja === 'ganhar') st.abaLoja = 'cartas';
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
    // "Como ganhar" não é uma seção do catálogo: abre pelo "?" do canto e esconde as abas
    document.getElementById('abasLoja').hidden = aba === 'ganhar';
    document.getElementById('btnComoGanhar').setAttribute('aria-pressed', String(aba === 'ganhar'));
    const alvo = document.getElementById('lojaConteudo');
    if (aba === 'ganhar') {
      alvo.innerHTML = `<h3 style="margin:0">Como ganhar moedas</h3><table class="taxas">
        <tr><th>Partida</th><th>Base</th><th>Paga moedas enquanto o seu maior rating estiver</th></tr>
        <tr><td>Diana (iniciante)</td><td>${BASE_MOEDAS.aprendiz}</td><td>rating abaixo de ${TETO_MOEDAS.aprendiz}</td></tr>
        <tr><td>Dona Coruja (avançado)</td><td>${BASE_MOEDAS.esperto}</td><td>rating abaixo de ${TETO_MOEDAS.esperto}</td></tr>
        <tr><td>Online, com amigos</td><td>${BASE_MOEDAS.online}</td><td>sempre; vale mais vencer quem tem rating maior</td></tr></table>
        <p class="nota" style="margin-top:10px">Só vitórias dão moedas. A base é multiplicada pela <b>margem</b> (×1 a ×2: vencer por 11 pontos ou mais dobra) e pela <b>rapidez</b> (×1,5 em até 7 Mesas, ×1,25 em 8). Uma vitória típica rende cerca de 12 contra a Diana e 21 contra a Dona Coruja. Com conta, as vitórias contra os rivais do jogo rendem até 300 moedas por dia.</p>
        <p class="nota">Experiência sobe em toda partida, ganhando ou perdendo, e os níveis 2, 3 e 5 dão presentes. Cartas nunca serão vendidas por dinheiro: elas ampliam o estilo, não a força (o melhor deck é feito só de cartas grátis).</p>
        <button class="btn btn-papel btn-voltar" data-voltar-loja="1">← Voltar à loja</button>`;
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
      // nas cartas, o "i" (e a própria arte) abre a carta inteira, com o preço e o Comprar
      const ler = tipo === 'cartas' ? `<button class="op-info" data-info-loja="${id}" aria-label="Ler a carta ${info.nome}">i</button>` : '';
      return `<div class="item${usando ? ' usando' : ''}${ler ? ' item-carta' : ''}">${ler}<div class="previa"${ler ? ` data-info-loja="${id}"` : ''}>${previa}</div><b>${info.nome}</b><small>${sub}</small>${botao}</div>`;
    };
    let html = '';
    // as cartas, como no montar o deck: Efeitos e Armadilhas, o mesmo cartão (arte, nome, o que faz, "i"), e embaixo
    // o preço, o Comprar ou "na coleção"
    const cartaLoja = id => {
      const k = CARTAS[id], tem = c.cartas.includes(id), preco = PRECO_CARTA[id] || 0;
      const fim = tem ? `<span class="op-estado">${GRATIS.includes(id) ? 'Grátis' : '✓ Na coleção'}</span>`
        : c.moedas < preco ? `<button class="btn btn-duplo btn-papel" disabled><span><span class="moeda"></span> ${preco}</span><small>faltam ${preco - c.moedas}</small></button>`
        : `<button class="btn btn-mel" data-comprar="cartas:${id}"><span class="moeda"></span>${preco}</button>`;
      return `<div class="op-wrap"><div class="op op-loja${tem ? ' tem' : ''}"><span class="op-arte" data-info-loja="${id}">${k.arte}</span><b>${k.nome}${k.pontos ? ` <span class="raio">${RAIO}</span>` : ''}</b><small>${k.verbo}</small>${fim}</div>` +
        `<button class="op-info" data-info-loja="${id}" aria-label="Ler a carta ${k.nome}">i</button></div>`;
    };
    if (aba === 'cartas') html = [['efeito', 'Efeitos'], ['armadilha', 'Armadilhas']]
      .map(([t, titulo]) => `<h3>${titulo}</h3><div class="grade-op">${ORDEM.filter(id => CARTAS[id].tipo === t).map(cartaLoja).join('')}</div>`).join('');
    if (aba === 'dados') html = Object.entries(DADOS).map(([id, d]) => item('dados', id, d, `<span style="width:52px;height:52px;display:block">${dadoHTML(5, id)}</span>`, d.desc)).join('');
    if (aba === 'icones') html = GRUPOS_ICONES.map(([g, titulo]) => `<h3 class="grupo-loja">${titulo}</h3>` + Object.entries(ICONES).filter(([, d]) => d.grupo === g).map(([id, d]) => item('icones', id, d, iconeSVG(id), d.desc)).join('')).join('');
    if (aba === 'mesas') html = Object.entries(MESAS).map(([id, d]) => item('mesas', id, d, `<span class="amostra-mesa" style="background:${d.amostra}"></span>`, d.nivel ? `presente do nível ${d.nivel}` : 'o feltro da sua mesa')).join('');
    alvo.innerHTML = `<div class="${aba === 'cartas' ? 'loja-cartas' : 'itens'}">${html}</div>${aba === 'cartas' ? '<p class="nota" style="margin-top:10px">As cartas à venda são situacionais: dão jeitos novos de jogar, não mais força. Na simulação, nenhum deck com carta comprada supera o melhor deck de cartas grátis.</p>' : '<p class="nota" style="margin-top:10px">Só aparência. Na versão final, alguns cosméticos também poderão ser comprados com dinheiro; cartas, nunca.</p>'}`;
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
        .catch(e => { desenharLoja(); Fx.chamada('Loja', esc(e.message), 'suave'); });
      return;
    }
    c.moedas -= info.preco; c[tipo].push(id);
    if (tipo === 'dados') c.dado = id; if (tipo === 'icones') c.icone = id; if (tipo === 'mesas') c.mesa = id;
    salvar(); aplicarPrefs(); redesenharConta(); festa();
  }

  // ---------- montar o deck ----------
  // partida em andamento: mexer no deck não pode abandoná-la sem querer
  const partidaEmAndamento = () => !!(jogo && jogo.fase !== 'fim' && (jogo.compras > 0 || online()));
  function abrirDeck() {
    const andando = partidaEmAndamento();
    document.getElementById('btnJogarDeck').textContent = andando ? 'Salvar deck' : 'Jogar';
    document.getElementById('deckEmAndamento').hidden = !andando;
    document.getElementById('btnRecomecar').hidden = online();
    document.getElementById('btnRecomecar').textContent = jogo && jogo.modo === 'bot' ? 'Recomeçar agora (conta como derrota)' : 'Recomeçar agora';
    st.abaDeck = 0;
    document.getElementById('deckTitulo').textContent = 'Monte seu deck';
    if (Rede.escolha) {
      document.getElementById('deckTitulo').textContent = 'Monte o deck desta partida';
      document.getElementById('deckEmAndamento').hidden = true;
    }
    desenharEscolha();
    desenharDeck();
    document.getElementById('janelaDeck').hidden = false;
  }
  // por que uma carta não entra no deck agora (ou null se entra)
  function porQueNao(d, c) {
    if (!possui(c)) return `Está na Loja por ${PRECO_CARTA[c]} moedas.`;
    if (travada(c)) return 'As armadilhas chegam depois da sua 1ª partida (ou em Ajustes).';
    if (d.includes(c) || deckValido(d.concat(c))) return null;
    if (d.length >= 3) return 'Deck cheio: toque numa carta do seu deck, lá em cima, para tirá-la.';
    if (CARTAS[c].tipo === 'armadilha' && d.filter(x => CARTAS[x].tipo === 'armadilha').length >= 2) return 'Já tem 2 armadilhas: tire uma para pôr esta.';
    if (CARTAS[c].pontos) return `Já tem uma carta de pontos ${RAIO}: só cabe uma.`;
    return 'Esta carta não cabe neste deck.';
  }
  function desenharDeck(aviso = '') {
    const d = st.decks[st.abaDeck] = st.decks[st.abaDeck].filter(disponivel);
    const nt = d.filter(c => CARTAS[c].tipo === 'armadilha').length, np = d.filter(c => CARTAS[c].pontos).length;
    // as 3 vagas do deck: tocar numa carta escolhida a tira
    document.getElementById('deckEscolhido').innerHTML = [0, 1, 2].map(i => {
      const c = d[i];
      if (!c) return `<span class="vaga">vaga ${i + 1}<br>escolha abaixo</span>`;
      const k = CARTAS[c];
      return `<button class="vaga" data-tirar="${c}" aria-label="Tirar ${k.nome} do deck">${k.arte}<b>${k.nome}${k.pontos ? ` <span class="raio">${RAIO}</span>` : ''}</b><span class="tirar" aria-hidden="true">✕</span></button>`;
    }).join('');
    document.getElementById('deckContador').innerHTML =
      `<span class="ficha${d.length === 3 ? ' cheia' : ''}">${d.length}/3 cartas</span><span class="ficha${nt === 2 ? ' cheia' : ''}">${nt}/2 armadilhas</span><span class="ficha${np === 1 ? ' cheia' : ''}">${np}/1 <span class="raio">${RAIO}</span> de pontos</span>` +
      (aviso ? `<span class="deck-aviso">${aviso}</span>` : '');
    document.getElementById('deckProntos').innerHTML = PRONTOS.filter(k => k.cartas.every(disponivel)).map(k => `<button data-pronto="${PRONTOS.indexOf(k)}">${k.nome} <small>${k.cartas.map(c => CARTAS[c].nome).join(' · ')}${k.nota ? ' (' + k.nota + ')' : ''}</small></button>`).join('');
    const op = c => {
      const k = CARTAS[c], dentro = d.includes(c), nao = porQueNao(d, c);
      const extra = !possui(c) ? `<span class="preco"><span class="moeda"></span> ${PRECO_CARTA[c]} na Loja</span>` : travada(c) ? '<span class="preco">depois da 1ª partida</span>' : `<small>${k.verbo}</small>`;
      return `<div class="op-wrap"><button class="op${nao && !dentro ? ' fora' : ''}" data-op="${c}" aria-pressed="${dentro}">${k.arte}<b>${k.nome}${k.pontos ? ` <span class="raio">${RAIO}</span>` : ''}</b>${extra}</button>` +
        `<button class="op-info" data-info="${c}" aria-label="Ler a carta ${k.nome}">i</button></div>`;
    };
    document.getElementById('deckGrade').innerHTML = [['efeito', 'Efeitos'], ['armadilha', 'Armadilhas']]
      .map(([t, titulo]) => `<h3>${titulo}</h3><div class="grade-op">${ORDEM.filter(c => CARTAS[c].tipo === t).map(op).join('')}</div>`).join('');
    if (Rede.escolha) mandarEscolhaLogo();
  }

  // ---------- preparação da partida online: os dois montam o deck ao mesmo tempo ----------
  // Do rival aparece só quantas cartas ele já escolheu e se confirmou; as cartas dele só aparecem quando a partida começa.
  let esperaEscolha = null;
  const mesmoDeck = (a, b) => a.length === b.length && a.every((c, i) => c === b[i]);
  function mandarEscolhaLogo() {
    clearTimeout(esperaEscolha);
    esperaEscolha = setTimeout(() => {
      const e = Rede.escolha; if (!e) return;
      const d = deckOnline();
      if (mesmoDeck(d, e.eu.deck)) return;
      e.eu = { deck: d.slice(), pronto: false };   // trocar uma carta desfaz a confirmação
      enviarWs({ tipo: 'deck', deck: d });
      desenharEscolha();
    }, 200);
  }
  function abrirEscolha(m) {
    const primeira = !Rede.escolha;
    Rede.escolha = { ate: Date.now() + m.prazo, total: m.total, eu: m.eu, rival: m.rival, meta: m.meta };
    if (primeira) {
      st.decks[0] = m.eu.deck.filter(possui);
      ['fim', 'janelaOnline', 'janelaCarta', 'janelaLoja', 'janelaConfig'].forEach(id => { document.getElementById(id).hidden = true; });
      abrirDeck();
      Som.tocar('vez');
    } else desenharEscolha();
  }
  function fecharEscolha(motivo) {
    if (!Rede.escolha) return;
    Rede.escolha = null;
    desenharEscolha();
    if (motivo) { document.getElementById('janelaDeck').hidden = true; Fx.chamada('Preparação cancelada', esc(motivo), 'suave'); }
  }
  function desenharEscolha() {
    const el = document.getElementById('deckEscolha'), e = Rede.escolha;
    const jogar = document.getElementById('btnJogarDeck'), fechar = document.getElementById('btnFecharDeck');
    el.hidden = !e;
    if (!e) { jogar.classList.remove('pronto-ok'); fechar.textContent = 'Fechar'; return; }
    const s = Math.max(0, Math.ceil((e.ate - Date.now()) / 1000));
    const r = e.rival, quem = esc(r.nome || 'O rival');
    const dele = r.pronto ? `<span class="rival-escolha pronto">${quem} confirmou ✓</span>`
      : `<span class="rival-escolha">${quem}: ${r.cartas} de 3 ${r.cartas === 1 ? 'carta' : 'cartas'}<span class="pontinhos">${[0, 1, 2].map(i => `<i class="${i < r.cartas ? 'cheio' : ''}"></i>`).join('')}</span></span>`;
    el.innerHTML = `<span class="tempo${s <= 10 ? ' acabando' : ''}" data-tempo-escolha>${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}</span>${dele}
      <span class="nota-escolha">${e.eu.pronto ? (r.pronto ? 'Começando…' : 'Você confirmou. Esperando o rival.') : 'As cartas do rival aparecem quando a partida começar.'}</span>`;
    jogar.textContent = e.eu.pronto ? 'Mudar o deck' : 'Confirmar deck';
    jogar.classList.toggle('pronto-ok', !!e.eu.pronto);
    fechar.textContent = 'Fechar (o tempo continua)';
  }
  // a contagem anda sozinha
  setInterval(() => {
    if (!Rede.escolha) return;
    const s = Math.max(0, Math.ceil((Rede.escolha.ate - Date.now()) / 1000)), t = document.querySelector('[data-tempo-escolha]');
    if (t) { t.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; t.classList.toggle('acabando', s <= 10); }
  }, 1000);
  // a carta inteira, fora da partida (montar o deck)
  function abrirInfoCarta(c, naLoja = false) {
    const k = CARTAS[c];
    document.getElementById('cartaDetalhe').innerHTML = `${k.arte}<div><h2 id="cartaTitulo">${k.nome}</h2>
      <p class="nota">${k.tipo === 'armadilha' ? 'Armadilha' : 'Efeito'}${k.pontos ? ` · carta de pontos <span class="raio">${RAIO}</span>` : ''}</p><p style="margin-top:8px">${k.texto}</p></div>`;
    let nota = porQueNao(st.decks[st.abaDeck], c) || '', btnComprar = '';
    if (naLoja) {
      const preco = PRECO_CARTA[c] || 0, conta = st.conta;
      if (conta.cartas.includes(c)) nota = GRATIS.includes(c) ? 'Grátis: já está na sua coleção.' : 'Já está na sua coleção.';
      else {
        nota = conta.moedas >= preco ? `Custa ${preco} moedas.` : `Custa ${preco} moedas: faltam ${preco - conta.moedas}.`;
        if (conta.moedas >= preco) btnComprar = `<button class="btn btn-mel" data-comprar-carta="${c}"><span class="moeda"></span> Comprar · ${preco}</button>`;
      }
    }
    document.getElementById('cartaNota').textContent = nota;
    document.getElementById('cartaBotoes').innerHTML = `${btnComprar}<button class="btn btn-papel" data-fechar-carta="1">Fechar</button>`;
    document.getElementById('janelaCarta').hidden = false;
    Som.tocar('carta');
  }

  // ---------- ajustes ----------
  function abrirConfig() {
    const p = st.pref;
    document.querySelectorAll('#janelaConfig [data-cfg]').forEach(b => b.setAttribute('aria-pressed', String(st.cfg[b.dataset.cfg] + '' === b.dataset.v)));
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

  // ---------- janelas: toda janela que abre começa pelo título ----------
  function rolarAoTopo(janela) {
    const caixa = janela.querySelector('.caixa');
    janela.scrollTop = 0;
    if (caixa) caixa.scrollTop = 0;
    const titulo = janela.querySelector('h2');
    if (titulo && titulo.getBoundingClientRect().top < 0) titulo.scrollIntoView({ block: 'start' });
  }
  // e o foco vai para dentro dela (teclado e leitor de tela começam pelo título), salvo se já está lá
  const focarJanela = janela => {
    if (janela.contains(document.activeElement)) return;
    const h = janela.querySelector('h2');
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  };
  const vigiaJanelas = new MutationObserver(ms => ms.forEach(m => {
    if (!m.target.hidden) { rolarAoTopo(m.target); setTimeout(() => { if (!m.target.hidden) focarJanela(m.target); }, 0); }
    // fechou uma janela por cima do menu (Online, Loja, Perfil...): o menu mostra a conta de agora (antes ficava "Convidado")
    else if (inicioAberto()) desenharInicio();
  }));
  document.querySelectorAll('.janela').forEach(el => vigiaJanelas.observe(el, { attributes: true, attributeFilter: ['hidden'] }));

  // ---------- sem zoom de pinça (o Safari do iPhone ignora user-scalable=no) ----------
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
  document.addEventListener('touchmove', e => { if (e.touches.length > 1 || (e.scale !== undefined && e.scale !== 1)) e.preventDefault(); }, { passive: false });
  // o toque duplo é desligado no CSS (touch-action: manipulation), sem engolir o segundo toque rápido

  // ---------- eventos da interface ----------
  // o áudio só pode começar depois de um toque (no iPhone o toque só vale no fim dele: touchend/click, não pointerdown)
  for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) addEventListener(ev, () => Som.desbloquear(), { capture: true });
  // um "tique" macio em todo botão
  document.addEventListener('click', e => { if (e.target.closest('button') && !e.target.closest('.pega')) Som.tocar('toque'); }, true);
  // janelas: papel ao abrir e fechar, e a música vai para o fundo enquanto alguma estiver aberta
  const janelas = [...document.querySelectorAll('.janela')];
  const algumaAberta = () => janelas.some(el => !el.hidden);
  new MutationObserver(ms => {
    for (const m of ms) if (m.target.classList.contains('janela') && (m.oldValue === null ? m.target.hidden : !m.target.hidden)) { Som.tocar(m.target.hidden ? 'fechar' : 'abrir'); break; }
    Som.abafar(algumaAberta());
    if (!algumaAberta() && rolarAVista()) render();
  }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['hidden'], attributeOldValue: true });
  // mouse por cima de um dado que dá para pegar: um tique bem baixinho, na nota do acorde
  let passou = null;
  document.getElementById('mesa').addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const b = e.target.closest('.pega'); const id = b && !b.disabled ? b.dataset.id : null;
    if (id && id !== passou) Som.tocar('passar', { i: +b.dataset.i });
    passou = id;
  });

  // ---------- menu principal (a primeira tela) e a partida offline guardada no aparelho ----------
  // Contra a Diana ou a Coruja não há relógio: a partida fica guardada e continua depois, mesmo fechando o
  // app. Abandonar avisa antes quando custa rating (contra o rival, depois do primeiro dado, conta como derrota).
  const PARTIDA_GUARDADA = 'diceduel.partida';
  const inicio = document.getElementById('inicio');
  const inicioAberto = () => !inicio.hidden;
  let confirmarAbandono = false;
  function guardarPartida() {
    try {
      if (!jogo || jogo.modo === 'online') return;
      // acabou, ou começou outra (sem jogada ainda): a guardada antiga não vale mais
      if (jogo.fase === 'fim' || !jogo.compras) { localStorage.removeItem(PARTIDA_GUARDADA); return; }
      localStorage.setItem(PARTIDA_GUARDADA, JSON.stringify(jogo, (k, v) => (k === 'voo' || k === 'fx' ? null : v)));
    } catch (e) {}
  }
  function lerPartidaGuardada() {
    try {
      const g = JSON.parse(localStorage.getItem(PARTIDA_GUARDADA) || 'null');
      // (a partida a dois guardada antes da v0.12 não volta: o modo saiu do jogo)
      return g && g.v === 8 && g.modo === 'bot' && g.fase !== 'fim' && Array.isArray(g.mesa) && Array.isArray(g.cor) ? g : null;
    } catch (e) { return null; }
  }
  function restaurarPartida(g) {
    Object.assign(g, { pensando: false, token: Math.random(), fx: null, eventos: [], intro: false, voo: null, sel: null, destaque: null, fala: null, rolouAVista: true });
    if (g.fase === 'alvo' || g.fase === 'ajuste') { g.fase = 'pegar'; g.alvo = null; g.ajusteIdx = null; }
    // guardada antes da v0.13: um efeito virado (o blefe, que saiu) volta para a mão
    [0, 1].forEach(p => { const c = g.armada[p]; if (c && CARTAS[c] && CARTAS[c].tipo === 'efeito') { g.cartas[p][c] = 'pronta'; g.armada[p] = null; } });
    return g;
  }
  // a partida offline em andamento: a da mesa (se for offline e já tiver começado) ou a guardada no aparelho
  const partidaParaContinuar = () => (jogo && jogo.modo !== 'online' && jogo.fase !== 'fim' && jogo.compras ? jogo : lerPartidaGuardada());
  function custoAbandono(g) {
    if (g.modo !== 'bot' || !g.compras) return null;
    const c = st.conta, ps = R.premioSolo({ rating: c.rating, pico: c.pico }, { nivel: g.nivel, venceu: false, margem: g.pts[0] - g.pts[1], rodadas: g.rodada, meta: g.meta });
    return { antes: c.rating, depois: ps.rating };
  }
  function desenharInicio() {
    const c = st.conta, nome = st.sessao && st.sessao.perfil ? st.sessao.perfil.nome : 'Convidado';
    document.getElementById('inicioPerfil').innerHTML = `${iconeSVG(c.icone)}<span class="perfil-texto"><b>${esc(nome)}</b><small>rating ${c.rating} · nível ${nivelDe(c.xp)} · ${c.moedas} moedas</small></span><svg class="ico perfil-seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`;
    document.getElementById('pontoInicio').hidden = document.getElementById('pontoOnline').hidden;
    const g = partidaParaContinuar(), box = document.getElementById('inicioPartida');
    // a escolha do rival ocupa o lugar dos botões do menu (Jogar → Escolha o rival → Jogar contra ...)
    const rivais = escolhendoRival && !g;
    document.getElementById('inicioRivais').hidden = !rivais;
    document.getElementById('inicioJogar').hidden = rivais;
    inicio.querySelector('.inicio-mais').hidden = rivais;
    document.getElementById('inicioPerfil').hidden = rivais;
    inicio.classList.toggle('escolhendo', rivais);   // na escolha do rival, o logo e o título saem (cabe sem rolar em 360×640)
    if (rivais) desenharRivais();
    // com uma partida offline em andamento, o caminho é continuar ou abandonar (começar outra é abandonar)
    inicio.querySelector('[data-inicio="jogar"]').hidden = !!g;
    box.hidden = !g;
    if (!g) { box.innerHTML = ''; return; }   // sem partida guardada, nada de botões velhos escondidos
    const quem = g.modo === 'bot' ? ['Você', RIVAIS[g.nivel].nome] : ['Jogador 1', 'Jogador 2'];
    const custo = custoAbandono(g);
    const aviso = !confirmarAbandono ? '' : custo
      ? `<p class="aviso-abandono" style="margin:0">Abandonar conta como derrota: seu rating vai de ${custo.antes} para ${custo.depois}.</p>`
      : '<p class="nota" style="margin:0">Nenhum dado foi pego ainda: abandonar só apaga a partida.</p>';
    box.innerHTML = `<span class="nota" style="margin:0">Partida em andamento · meta ${g.meta}</span>
      <span class="placar-guardado">${quem[0]} <b>${g.pts[0]}</b> × <b>${g.pts[1]}</b> ${quem[1]}</span>${aviso}
      ${confirmarAbandono
        ? `<div class="inicio-linha"><button class="btn btn-papel perigo" data-inicio="abandonar-sim">Abandonar</button><button class="btn btn-papel" data-inicio="abandonar-nao">Voltar</button></div>`
        : `<button class="btn btn-mel inicio-principal" data-inicio="continuar">Continuar a partida</button><button class="btn-link" data-inicio="abandonar">Abandonar a partida</button>`}`;
  }
  // ---------- a escolha do rival: o retrato, o jeito de jogar, a dificuldade e o que a vitória rende ----------
  let escolhendoRival = false;
  const NIVEL_RIVAL = { aprendiz: 'Para começar', esperto: 'Desafiadora' };
  const JEITO_RIVAL = { aprendiz: 'Gata branca de olhos azuis. Joga solto e arrisca: boa para aprender as correntes e as cartas.',
    esperto: 'Joga com paciência, lê a Mesa e leva um dos melhores decks. Arma as armadilhas na hora certa.' };
  function rendeRival(nivel) {
    const c = st.conta, pico = Math.max(c.rating, c.pico || 0);
    if (pico >= TETO_MOEDAS[nivel]) return `vitórias não rendem mais moedas (seu rating já passou de ${TETO_MOEDAS[nivel] - 1})`;
    // uma vitória típica: margem de 5 pontos, no ritmo normal de Mesas da meta
    const t = moedasDaVitoria(BASE_MOEDAS[nivel], 5, Math.round(+st.cfg.meta * 9.5 / 16), +st.cfg.meta).total;
    return `vitória rende cerca de ${t} moedas · rating ${RATING_RIVAL[nivel]}`;
  }
  function desenharRivais() {
    document.getElementById('rivalCartas').innerHTML = ['aprendiz', 'esperto'].map(k => {
      const marcado = st.cfg.nivel === k;
      return `<button class="rival-carta${marcado ? ' marcado' : ''}" data-inicio="rival" data-v="${k}" role="radio" aria-checked="${marcado}">
        <span class="rival-retrato">${Retratos.retrato(RETRATO_RIVAL[k], marcado ? 'feliz' : '')}</span>
        <span class="rival-texto"><span class="rival-topo"><b>${RIVAIS[k].nome}</b><span class="rival-nivel n-${k}">${NIVEL_RIVAL[k]}</span></span>
          <span class="rival-jeito">${JEITO_RIVAL[k]}</span><small class="rival-rende">${rendeRival(k)}</small></span></button>`;
    }).join('');
    inicio.querySelectorAll('[data-inicio="meta"]').forEach(b => b.setAttribute('aria-pressed', String(+st.cfg.meta === +b.dataset.v)));
    const deck = (st.deckVisto ? st.decks[0] : PRONTOS[0].cartas).filter(c => CARTAS[c]);
    document.getElementById('rivalDeck').innerHTML = `Seu deck: <b>${deck.length ? deck.map(c => CARTAS[c].nome).join(', ') : 'sem cartas'}</b>`;
    document.getElementById('rivalComecar').textContent = `Jogar contra ${RIVAIS[st.cfg.nivel].nome}`;
  }
  function mostrarInicio() {
    confirmarAbandono = false; escolhendoRival = false;
    // a partida para atrás do menu: a jogada do rival que estava no meio recomeça do zero no Continuar
    if (jogo && jogo.modo === 'bot' && jogo.pensando) { jogo.token = Math.random(); jogo.pensando = false; jogo.destaque = null; }
    ['fim', 'janelaMenu', 'janelaCarta'].forEach(id => { document.getElementById(id).hidden = true; });
    document.body.classList.add('inicio-aberto');
    desenharInicio();
    inicio.hidden = false;
    const foco = inicio.querySelector('[data-inicio="continuar"], [data-inicio="jogar"]:not([hidden])'); if (foco) foco.focus({ preventScroll: true });
  }
  function esconderInicio() {
    if (inicio.hidden) return;
    inicio.hidden = true; document.body.classList.remove('inicio-aberto');
  }
  inicio.addEventListener('click', e => {
    const b = e.target.closest('[data-inicio]'); if (!b) return;
    const a = b.dataset.inicio;
    if (a === 'rival') { st.cfg.nivel = b.dataset.v; salvar(); Som.tocar('toque'); desenharInicio(); return; }
    if (a === 'meta') { st.cfg.meta = R.metaValida(b.dataset.v); salvar(); desenharInicio(); return; }
    if (a === 'jogar') { escolhendoRival = true; desenharInicio(); const f = inicio.querySelector('.rival-carta.marcado'); if (f) f.focus({ preventScroll: true }); return; }
    if (a === 'voltar') { escolhendoRival = false; desenharInicio(); return; }
    if (a === 'comecar') {
      Online.sair();
      st.cfg.modo = 'bot'; salvar();
      // primeira vez: o deck "Primeira mesa" abre por cima da escolha do rival (fechar sem jogar volta para ela)
      if (!st.deckVisto) { st.decks[0] = PRONTOS[0].cartas.slice(); abrirDeck(); return; }
      escolhendoRival = false; novaPartida(); return;
    }
    if (a === 'continuar') {
      const g = partidaParaContinuar(); if (!g) return desenharInicio();
      if (jogo !== g) jogo = restaurarPartida(g);
      esconderInicio(); render(); if (rolarAVista()) render(); talvezAutomato(); return;
    }
    if (a === 'abandonar') { confirmarAbandono = true; desenharInicio(); return; }
    if (a === 'abandonar-nao') { confirmarAbandono = false; desenharInicio(); return; }
    if (a === 'abandonar-sim') {
      const g = partidaParaContinuar(); confirmarAbandono = false;
      if (!g) return desenharInicio();
      if (custoAbandono(g)) {   // conta como derrota: rating, sequência e o resumo do fim, como um Desistir
        jogo = jogo === g ? g : restaurarPartida(g); jogo.token = Math.random(); jogo.pensando = false;
        esconderInicio(); R.desistir(jogo, 0); depois('fim'); return;
      }
      try { localStorage.removeItem(PARTIDA_GUARDADA); } catch (x) {}
      if (jogo === g) jogo = null;
      desenharInicio(); return;
    }
    if (a === 'perfil') { abrirPerfil(); return; }
    if (a === 'online') { document.getElementById('btnOnline').click(); return; }
    if (a === 'regras') { abrirLado(true); return; }
    const botao = { deck: 'btnDeck', 'trocar-deck': 'btnDeck', loja: 'btnCarteira', ajustes: 'btnConfig' }[a];
    if (botao) document.getElementById(botao).click();
  });

  // ---------- menu de pausa (durante a partida, o cabeçalho some e tudo o que não é jogada fica aqui) ----------
  const janelaMenu = document.getElementById('janelaMenu');
  function textoSair() {
    if (!jogo || jogo.fase === 'fim') return ['Nova partida', ''];
    if (online()) return ['Desistir', 'Desistir conta como derrota no ranking.'];
    if (jogo.modo === 'bot' && jogo.compras > 0) return ['Desistir', 'Desistir conta como derrota (rating e sequência).'];
    return ['Recomeçar', ''];
  }
  function abrirMenu() {
    document.getElementById('opDicasMenu').checked = st.pref.dicas;
    janelaMenu.querySelector('[data-menu="inicio"]').hidden = online() && jogo.fase !== 'fim';
    const [txt, nota] = textoSair(), b = janelaMenu.querySelector('[data-menu="sair"]');
    document.getElementById('menuSairTxt').textContent = txt; b.dataset.certeza = '';
    document.getElementById('menuSairNota').textContent = (online() && jogo.fase !== 'fim' ? 'No online o relógio da vez continua correndo. ' : '') + nota;
    janelaMenu.hidden = false;
    janelaMenu.querySelector('[data-menu="continuar"]').focus();
  }
  document.getElementById('btnPausa').addEventListener('click', () => abrirMenu());
  // som: um toque cala efeitos e música juntos; outro toque devolve os dois
  document.getElementById('btnSom').addEventListener('click', () => {
    const liga = !(st.pref.som || st.pref.musica);
    st.pref.som = liga; st.pref.musica = liga; salvar(); aplicarPrefs();
    if (liga) { Som.desbloquear(); Som.tocar('toque'); }
    if (jogo) render();
  });
  document.getElementById('opDicasMenu').addEventListener('change', e => { st.pref.dicas = e.target.checked; salvar(); aplicarPrefs(); render(); });
  janelaMenu.addEventListener('click', e => {
    if (e.target === janelaMenu) { janelaMenu.hidden = true; return; }   // tocar fora fecha
    const b = e.target.closest('[data-menu]'); if (!b) return;
    const m = b.dataset.menu;
    if (m === 'sair') {
      // desistir pede um segundo toque (um toque sem querer não pode custar a partida)
      if (textoSair()[1] && b.dataset.certeza !== '1') { b.dataset.certeza = '1'; document.getElementById('menuSairTxt').textContent = 'Toque de novo para desistir'; return; }
      janelaMenu.hidden = true;
      if (online()) { Online.desistir(); return; }
      if (jogo && jogo.modo === 'bot' && jogo.fase !== 'fim' && jogo.compras > 0) { jogo.token = Math.random(); jogo.pensando = false; R.desistir(jogo, 0); depois('fim'); return; }
      novaPartida(); return;
    }
    janelaMenu.hidden = true;
    if (m === 'inicio') { mostrarInicio(); return; }
    if (m === 'regras') { abrirLado(true); lado.scrollTop = 0; }   // as regras abrem do começo
    const botao = { ajustes: 'btnConfig' }[m];
    if (botao) document.getElementById(botao).click();
  });

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
  const lojaVolta = () => { st.abaLoja = st.abaLojaAntes && st.abaLojaAntes !== 'ganhar' ? st.abaLojaAntes : 'cartas'; desenharLoja(); };
  document.getElementById('btnComoGanhar').addEventListener('click', () => {
    if (st.abaLoja === 'ganhar') return lojaVolta();
    st.abaLojaAntes = st.abaLoja; st.abaLoja = 'ganhar'; desenharLoja(); rolarAoTopo(document.getElementById('janelaLoja'));
  });
  document.getElementById('lojaConteudo').addEventListener('click', e => {
    if (e.target.closest('[data-voltar-loja]')) { lojaVolta(); return; }
    const il = e.target.closest('[data-info-loja]'); if (il) { abrirInfoCarta(il.dataset.infoLoja, true); return; }
    const cb = e.target.closest('[data-comprar]'); if (cb) { const [t, id] = cb.dataset.comprar.split(':'); comprar(t, id, cb); return; }
    const ub = e.target.closest('[data-usar-item]');
    if (ub) { const [t, id] = ub.dataset.usarItem.split(':'); usarItem(t, id); }
  });
  // vestir um item que você já tem (da Loja ou do Perfil): com conta, o servidor confere; sem conta, fica no aparelho
  function usarItem(t, id) {
    const pronto = () => { redesenharConta(); if (jogo) render(); Som.tocar('momento'); };
    if (st.sessao) { pedir('POST', '/api/loja/usar', { tipo: t, id }).then(r => { usarPerfil(r.conta); pronto(); }).catch(e => Fx.chamada('Visual', esc(e.message), 'suave')); return; }
    if (!st.conta[t].includes(id)) return;
    st.conta[t === 'dados' ? 'dado' : t === 'icones' ? 'icone' : 'mesa'] = id; salvar(); aplicarPrefs(); pronto();
  }
  // tudo o que mostra a conta (menu, Perfil, Loja) se redesenha quando ela muda
  function redesenharConta() {
    if (!document.getElementById('janelaLoja').hidden) desenharLoja();
    if (!document.getElementById('janelaPerfil').hidden) desenharPerfil();
    if (inicioAberto()) desenharInicio();
  }

  // ---------- Perfil: tocar no seu nome na tela inicial. O que você é (nível, ratings, recordes) e o seu visual, só com o
  // que você já tem; comprar mais é na Loja ----------
  function abrirPerfil() { desenharPerfil(); document.getElementById('janelaPerfil').hidden = false; Som.tocar('abrir'); }
  function desenharPerfil() {
    const c = st.conta, r = st.rec, nome = st.sessao && st.sessao.perfil ? st.sessao.perfil.nome : 'Convidado';
    const nv = nivelDe(c.xp), prox = NIVEIS[nv] ?? null, ant = NIVEIS[nv - 1] || 0;
    const xpTxt = prox === null ? 'nível máximo' : `${c.xp - ant} de ${prox - ant} XP para o nível ${nv + 1}`;
    const num = (rot, v) => `<span class="perfil-num"><b>${v}</b><small>${rot}</small></span>`;
    const op = (tipo, id, previa, nomeOp) => {
      const usando = c[tipo === 'dados' ? 'dado' : tipo === 'icones' ? 'icone' : 'mesa'] === id;
      return `<button class="perfil-op${usando ? ' usando' : ''}" data-usar-item="${tipo}:${id}" aria-pressed="${usando}"><span class="perfil-previa">${previa}</span><small>${nomeOp}</small></button>`;
    };
    const grupo = (titulo, tipo, html) => `<div class="perfil-grupo"><h3>${titulo} <small>${c[tipo].length} de ${Object.keys(tipo === 'dados' ? DADOS : tipo === 'icones' ? ICONES : MESAS).length}</small></h3><div class="perfil-opcoes">${html}</div></div>`;
    document.getElementById('perfilConteudo').innerHTML = `
      <div class="perfil-topo">${iconeSVG(c.icone)}<div class="perfil-quem"><b class="perfil-nome">${esc(nome)}</b><span class="titulo-rating">${tituloDe(c.rating)}</span>
        <span class="nota">Nível ${nv} · <span class="moeda" aria-hidden="true"></span> ${c.moedas} moedas</span><div class="xp" title="experiência"><i style="width:${prox === null ? 100 : Math.round((c.xp - ant) / (prox - ant) * 100)}%"></i></div><small class="nota">${xpTxt}</small></div></div>
      ${st.sessao ? '' : `<div class="perfil-conta"><span>Sem conta, o seu progresso fica só neste aparelho.</span><button class="btn btn-mel" data-perfil="conta">Entrar ou criar conta</button></div>`}
      <div class="perfil-numeros">${num('rating contra os rivais', c.rating)}${c.online ? num('rating online', c.online.rating) : ''}${num('partidas', r.partidas)}${num('vitórias', r.vitorias)}${num('melhor sequência', r.melhorSeq)}${num('maior disparo', r.maiorDisparo)}${num('maior corrente', r.maiorCorrente)}</div>
      <h3 class="perfil-secao">Seu visual</h3>
      ${grupo('Ícone', 'icones', c.icones.filter(id => ICONES[id]).map(id => op('icones', id, iconeSVG(id), ICONES[id].nome)).join(''))}
      ${grupo('Dado', 'dados', c.dados.filter(id => DADOS[id]).map(id => op('dados', id, `<span class="perfil-dado">${dadoHTML(5, id)}</span>`, DADOS[id].nome)).join(''))}
      ${grupo('Mesa', 'mesas', c.mesas.filter(id => MESAS[id]).map(id => op('mesas', id, `<span class="amostra-mesa" style="background:${MESAS[id].amostra}"></span>`, MESAS[id].nome)).join(''))}
      <p class="nota perfil-loja">Mais ícones, dados e mesas na <button class="btn-link" data-perfil="loja">Loja</button>.</p>`;
  }
  document.getElementById('perfilConteudo').addEventListener('click', e => {
    const ub = e.target.closest('[data-usar-item]'); if (ub) { const [t, id] = ub.dataset.usarItem.split(':'); usarItem(t, id); return; }
    const b = e.target.closest('[data-perfil]'); if (!b) return;
    document.getElementById('janelaPerfil').hidden = true;
    if (b.dataset.perfil === 'loja') abrirLoja('icones');
    if (b.dataset.perfil === 'conta') document.getElementById('btnOnline').click();
  });
  document.getElementById('btnFecharPerfil').addEventListener('click', () => { document.getElementById('janelaPerfil').hidden = true; Som.tocar('fechar'); });

  // tocar num espaço vazio da Mesa desfaz a escolha do dado (não há mais barra com Cancelar)
  document.getElementById('mesa').addEventListener('click', e => { const b = e.target.closest('.pega'); if (b && !b.disabled) clicarDado(+b.dataset.i); });
  document.querySelector('.mesa-area').addEventListener('click', e => {
    if (!e.target.closest('.pega') && jogo && jogo.fase === 'pegar' && jogo.sel != null && humano(jogo.vez)) cancelarEscolha();
  });
  document.getElementById('tabuleiro').addEventListener('click', e => {
    const v = e.target.closest('[data-virada]'); if (v && jogo) { abrirVirada(+v.dataset.virada); return; }
    const al = e.target.closest('[data-alvo-dado]'); if (al && jogo) { levarDado(al.dataset.alvoDado); return; }
    const b = e.target.closest('[data-carta]'); if (!b || !jogo) return;
    tocarCarta(+b.dataset.dono, b.dataset.carta);
  });
  // ---------- espiar e arrastar as cartas ----------
  // Espiar: segurar uma carta (ou parar o mouse em cima) mostra a carta grande, sem usar; soltar some.
  // Arrastar: a sua carta, na sua vez, segue o dedo; a que pede um dado é solta num dado da Mesa (o dado sob o dedo
  // acende, e as etiquetas mostram como ele fica); as outras, em qualquer lugar acima do seu painel
  const espiar = document.createElement('div');
  espiar.className = 'espiar-carta'; espiar.hidden = true; espiar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(espiar);
  const camadaArrasto = document.createElement('div');
  camadaArrasto.className = 'cartas camada-arrasto';
  document.body.appendChild(camadaArrasto);
  function mostrarEspiar(b) {
    const j = jogo, p = +b.dataset.dono, c = b.dataset.carta, k = CARTAS[c];
    if (!j || !k) return;
    const meu = j.modo !== 'local' ? p === 0 : j.vez === p;
    let e = j.cartas[p][c];
    if (e === 'armada' && !meu && c !== 'espelho') e = 'pronta';
    const estado = { armada: 'armada', usada: 'usada', perdida: 'perdida' }[e];
    espiar.className = `espiar-carta ${k.tipo}`;
    espiar.innerHTML = `<span class="c-arte">${k.arte}</span><b>${k.nome}</b><span class="ea-tipo">${k.tipo === 'armadilha' ? 'Armadilha' : 'Efeito'}${k.pontos ? ` · <span class="raio">${RAIO}</span> pontos` : ''}${estado ? ` · ${estado}` : ''}</span><span class="ea-verbo">${k.verbo}</span><p>${k.texto}</p>`;
    espiar.hidden = false;
    // acima da carta (o dedo cobre a própria carta), dentro da tela; sem espaço em cima, embaixo
    const r = b.getBoundingClientRect(), w = espiar.offsetWidth, h = espiar.offsetHeight, m = 10;
    const x = Math.max(m, Math.min(innerWidth - w - m, r.left + r.width / 2 - w / 2));
    const y = r.top - h - 12 >= m ? r.top - h - 12 : Math.min(innerHeight - h - m, r.bottom + 12);
    espiar.style.left = `${x}px`; espiar.style.top = `${Math.max(m, y)}px`;
  }
  const esconderEspiar = () => { espiar.hidden = true; };
  const tab = document.getElementById('tabuleiro');
  let toque = null, engolirClique = false, passarMouse = null;
  const podeArrastar = (p, c) => { const j = jogo; return j && (podeAbrir(j, p) || escolhendoDado(j, p)) && j.vez === p && usavel(p, c); };
  const cartaSob = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest('.pega:not([disabled])'); };
  function iniciarArrasto(t) {
    const j = jogo, r = t.b.getBoundingClientRect();
    soltarEscolha();
    if (!podeUsar(t.p, t.c).ok) { render(); tremerCarta(t.p, t.c); return false; }
    const k = CARTAS[t.c];
    // a cópia que segue o dedo mora numa camada com a classe das cartas (o visual da carta vem dela)
    const fant = t.b.cloneNode(true);
    fant.removeAttribute('style'); fant.className = fant.className.replace(/\bgesto-\S+|\btreme\b/g, '');
    fant.classList.add('fantasma');
    Object.assign(fant.style, { width: `${r.width}px`, height: `${r.height}px`, rotate: '0deg', translate: 'none', scale: '1' });
    camadaArrasto.appendChild(fant);
    t.arrasta = { fant, w: r.width, h: r.height, ox: t.x - r.left, oy: t.y - r.top, vx: 0, ultX: t.x, alvo: !!k.alvo };
    // a carta com alvo liga as etiquetas de prévia na Mesa enquanto é arrastada
    if (k.alvo) { j.fase = 'alvo'; j.alvo = t.c; }
    else foco = { c: t.c, chave: chaveVez(j) };
    render();
    document.body.classList.add('arrastando-carta');
    Som.tocar('carta'); vibrar(8);
    return true;
  }
  function moverArrasto(e) {
    const a = toque.arrasta, inclina = st.pref.animacoes ? Math.max(-16, Math.min(16, (e.clientX - a.ultX) * 1.6)) : 0;
    a.ultX = e.clientX;
    // a carta com alvo encolhe e fica bem acima do dedo, para o dado sob ele (e a etiqueta dele) aparecerem
    const esc = a.alvo ? 0.72 : 1.06;
    const x = e.clientX - a.w / 2, y = a.alvo ? e.clientY - 40 - a.h * (0.5 + esc / 2) : e.clientY - a.oy;
    a.fant.style.transform = `translate(${x}px, ${y}px) rotate(${inclina}deg) scale(${esc})`;
    document.querySelectorAll('.pega.mira').forEach(el => el.classList.remove('mira'));
    let pronto = false;
    if (a.alvo) { const d = cartaSob(e.clientX, e.clientY); if (d) { d.classList.add('mira'); pronto = true; if (a.ultDado !== d.dataset.i) { a.ultDado = d.dataset.i; vibrar(4); } } else a.ultDado = null; }
    else pronto = naZonaDeUso(e.clientY);
    a.fant.classList.toggle('pronta-soltar', pronto);
    tab.classList.toggle('soltar-aqui', !a.alvo && pronto);
  }
  function naZonaDeUso(y) {
    const meu = document.querySelector('.jogador.da-vez');
    return !!meu && y < meu.getBoundingClientRect().top + 8;
  }
  function terminarToque(e, valeu) {
    if (!toque || e.pointerId !== toque.id) return;
    clearTimeout(toque.timer);
    const t = toque; toque = null;
    if (t.largar) t.largar();
    if (t.espiou) { esconderEspiar(); engolirClique = true; setTimeout(() => { engolirClique = false; }, 400); return; }
    if (!t.arrasta) return;   // um toque normal: o clique cuida
    engolirClique = true; setTimeout(() => { engolirClique = false; }, 400);
    const a = t.arrasta, j = jogo;
    a.fant.remove(); camadaArrasto.replaceChildren(); tab.classList.remove('soltar-aqui'); document.body.classList.remove('arrastando-carta');
    document.querySelectorAll('.pega.mira').forEach(el => el.classList.remove('mira'));
    if (!j || j.vez !== t.p) return render();
    if (a.alvo) {
      const d = valeu && cartaSob(e.clientX, e.clientY);
      if (!d) { soltarEscolha(); return render(); }
      // usa a carta arrastada direto (no online, um estado novo do servidor no meio do arrasto apaga a escolha)
      const idx = +d.dataset.i;
      soltarEscolha();
      if (!j.mesa[idx] || !podeUsar(t.p, t.c).ok) return render();
      if (t.c === 'ajuste') { j.fase = 'ajuste'; j.alvo = 'ajuste'; j.ajusteIdx = idx; Som.tocar('escolher', { n: 0, x: (idx - 2) * 0.3 }); return render(); }
      usarCarta(t.p, t.c, idx); return render();
    }
    if (valeu && naZonaDeUso(e.clientY)) return acionarCarta(t.c);
    foco = null; render();
  }
  // um toque novo encerra a janela de engolir o clique do arrasto anterior (que às vezes nem vem)
  addEventListener('pointerdown', () => { engolirClique = false; }, true);
  tab.addEventListener('pointerdown', e => {
    const b = e.target.closest('.cartas [data-carta]');
    if (!b || !jogo || e.button > 0 || toque) return;
    clearTimeout(passarMouse); esconderEspiar();
    toque = { b, p: +b.dataset.dono, c: b.dataset.carta, x: e.clientX, y: e.clientY, id: e.pointerId, arrasta: null, espiou: false };
    const t = toque;
    t.largar = ouvirNoElemento(b, moverToque, soltouToque, cancelouToque);   // a carta também sai da tela ao ser arrastada
    t.timer = setTimeout(() => { if (toque === t && !t.arrasta) { t.espiou = true; mostrarEspiar(b); vibrar(8); } }, 380);
  });
  addEventListener('pointermove', e => moverToque(e), { passive: false });
  function moverToque(e) {
    // a carta espiada pelo mouse some ao sair dela (mesmo que a tela tenha sido redesenhada embaixo do mouse parado)
    if (!toque && e.pointerType === 'mouse' && !espiar.hidden && !(e.target.closest && e.target.closest('.cartas [data-carta]'))) { clearTimeout(passarMouse); esconderEspiar(); }
    if (!toque || e.pointerId !== toque.id || !umaVez(e)) return;
    if (!toque.arrasta) {
      if (toque.espiou || Math.hypot(e.clientX - toque.x, e.clientY - toque.y) < 10) return;
      clearTimeout(toque.timer);
      if (!podeArrastar(toque.p, toque.c) || !iniciarArrasto(toque)) { if (toque.largar) toque.largar(); toque = null; return; }
    }
    e.preventDefault();
    moverArrasto(e);
  }
  function soltouToque(e) { terminarToque(e, true); }
  function cancelouToque(e) { terminarToque(e, false); }
  addEventListener('pointerup', soltouToque);
  addEventListener('pointercancel', cancelouToque);
  // o clique que vem depois de um arrasto ou de espiar não conta como toque na carta
  document.addEventListener('click', e => { if (engolirClique && e.target.closest && e.target.closest('#tabuleiro')) { engolirClique = false; e.stopPropagation(); e.preventDefault(); } }, true);
  // segurar no celular não abre o menu do sistema
  tab.addEventListener('contextmenu', e => { if (e.target.closest('.cartas [data-carta]')) e.preventDefault(); });
  // no computador: parar o mouse sobre a carta mostra a carta grande
  tab.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse' || toque) return;
    const b = e.target.closest('.cartas [data-carta]'); if (!b) return;
    clearTimeout(passarMouse); passarMouse = setTimeout(() => { if (!toque && b.isConnected && b.matches(':hover')) mostrarEspiar(b); }, 450);
  });
  tab.addEventListener('pointerout', e => {
    if (e.pointerType !== 'mouse') return;
    const b = e.target.closest('.cartas [data-carta]'); if (!b || b.contains(e.relatedTarget)) return;
    clearTimeout(passarMouse); esconderEspiar();
  });
  // arrastar um dado da Mesa: ele é escolhido ao sair do lugar (a corrente e o Bolso acendem com o que vai acontecer)
  // e soltar num deles é o mesmo que tocar nele; soltar em outro lugar deixa o dado escolhido
  let arrastoDado = null;
  const camadaDado = document.createElement('div');
  camadaDado.className = 'camada-arrasto camada-dado';
  document.body.appendChild(camadaDado);
  const alvoDadoSob = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest('[data-alvo-dado]'); };
  // No iPhone, os eventos do dedo continuam indo para o elemento onde o toque começou, mesmo depois de ele sair da tela
  // (a Mesa é redesenhada quando o arrasto começa); fora do documento, eles não sobem até a janela. Por isso quem
  // começou o arrasto também ouve o mover e o soltar; sem isso, o dado-fantasma ficava preso na tela para sempre.
  // Cada evento é tratado uma vez só (no navegador comum, ele chega ao elemento e depois à janela).
  const umaVez = e => { if (e.__arrasto) return false; try { e.__arrasto = true; } catch (_) {} return true; };
  function ouvirNoElemento(el, mover, soltar, cancelar) {
    el.addEventListener('pointermove', mover, { passive: false });
    el.addEventListener('pointerup', soltar);
    el.addEventListener('pointercancel', cancelar);
    return () => { el.removeEventListener('pointermove', mover); el.removeEventListener('pointerup', soltar); el.removeEventListener('pointercancel', cancelar); };
  }
  document.getElementById('mesa').addEventListener('pointerdown', e => {
    const b = e.target.closest('.pega:not([disabled])'), j = jogo;
    if (!b || !j || e.button > 0 || j.fase !== 'pegar' || !humano(j.vez) || j.pensando || j.intro || toque) return;
    arrastoDado = { b, id: +b.dataset.id, idx: +b.dataset.i, x: e.clientX, y: e.clientY, pid: e.pointerId, fant: null };
    arrastoDado.largar = ouvirNoElemento(b, moverDado, soltouDado, cancelouDado);
  });
  addEventListener('pointermove', e => moverDado(e), { passive: false });
  function moverDado(e) {
    const a = arrastoDado; if (!a || e.pointerId !== a.pid || !umaVez(e)) return;
    if (!a.fant) {
      if (Math.hypot(e.clientX - a.x, e.clientY - a.y) < 10) return;
      const j = jogo, idx = idxDe(a.id);
      if (!j || idx < 0 || j.fase !== 'pegar') { arrastoDado = null; return; }
      const face = a.b.querySelector('.face .dado') || a.b.querySelector('.dado'), r = face.getBoundingClientRect();
      if (j.sel !== a.id) { j.sel = a.id; pergunta = null; foco = null; const op = opcoesDoDado(j.vez, idx); Som.tocar(op.rompe ? 'perigo' : 'escolher', { n: 0, x: (idx - 2) * 0.3 }); }
      a.fant = face.cloneNode(true); a.fant.classList.add('dado-fantasma');
      // o miolo do dado é 15% da largura: fixo na tela, a porcentagem seria da tela inteira
      Object.assign(a.fant.style, { width: `${r.width}px`, height: `${r.height}px`, padding: `${r.width * 0.15}px`, boxSizing: 'border-box' });
      a.w = r.width; a.h = r.height;
      camadaDado.appendChild(a.fant);
      document.body.classList.add('arrastando-carta');
      vibrar(6); render();
    }
    e.preventDefault();
    a.fant.style.transform = `translate(${e.clientX - a.w / 2}px, ${e.clientY - a.h / 2 - 26}px) scale(1.12) rotate(${st.pref.animacoes ? Math.max(-12, Math.min(12, (e.movementX || 0) * 1.5)) : 0}deg)`;
    document.querySelectorAll('[data-alvo-dado].mira').forEach(el => el.classList.remove('mira'));
    const alvo = alvoDadoSob(e.clientX, e.clientY - 26);
    if (alvo) { alvo.classList.add('mira'); if (a.ultAlvo !== alvo.dataset.alvoDado) { a.ultAlvo = alvo.dataset.alvoDado; vibrar(4); } } else a.ultAlvo = null;
  }
  const fimArrastoDado = (e, valeu) => {
    const a = arrastoDado; if (!a || e.pointerId !== a.pid) return;
    arrastoDado = null;
    if (a.largar) a.largar();
    if (!a.fant) return;   // um toque normal: o clique cuida
    engolirClique = true; setTimeout(() => { engolirClique = false; }, 400);
    a.fant.remove(); camadaDado.replaceChildren(); document.body.classList.remove('arrastando-carta');
    document.querySelectorAll('[data-alvo-dado].mira').forEach(el => el.classList.remove('mira'));
    const alvo = valeu && alvoDadoSob(e.clientX, e.clientY - 26);
    if (alvo && jogo && jogo.sel === a.id) return levarDado(alvo.dataset.alvoDado);
    render();
  };
  function soltouDado(e) { fimArrastoDado(e, true); }
  function cancelouDado(e) { fimArrastoDado(e, false); }
  addEventListener('pointerup', soltouDado);
  addEventListener('pointercancel', cancelouDado);
  // rede de segurança: um toque novo do dedo principal quer dizer que o anterior acabou (mesmo que o "soltar" tenha
  // se perdido), e sair da tela (outro app, celular bloqueado) encerra qualquer arrasto. Nada de fantasma preso.
  const desfazerArrastos = () => {
    if (arrastoDado) fimArrastoDado({ pointerId: arrastoDado.pid, clientX: -1, clientY: -1 }, false);
    if (toque) terminarToque({ pointerId: toque.id, clientX: -1, clientY: -1 }, false);
    camadaDado.replaceChildren(); camadaArrasto.replaceChildren(); document.body.classList.remove('arrastando-carta');
    document.querySelectorAll('.mira').forEach(el => el.classList.remove('mira')); tab.classList.remove('soltar-aqui');
  };
  addEventListener('pointerdown', e => { if (e.isPrimary && (arrastoDado || toque || camadaDado.firstChild || camadaArrasto.firstChild)) desfazerArrastos(); }, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden) desfazerArrastos(); });
  addEventListener('blur', desfazerArrastos);
  document.getElementById('cartaBotoes').addEventListener('click', e => {
    if (e.target.closest('[data-fechar-carta]')) { document.getElementById('janelaCarta').hidden = true; return; }
    // comprar pela carta aberta na Loja: o primeiro toque pede confirmação, o segundo compra pelo mesmo caminho da Loja
    const cc = e.target.closest('[data-comprar-carta]');
    if (cc) {
      const id = cc.dataset.comprarCarta, preco = PRECO_CARTA[id] || 0;
      if (cc.dataset.certeza !== '1') { cc.dataset.certeza = '1'; cc.innerHTML = `Confirmar? <span class="moeda"></span> ${preco}`; return; }
      document.getElementById('janelaCarta').hidden = true;
      const bl = document.querySelector(`#lojaConteudo [data-comprar="cartas:${id}"]`);
      if (bl) { bl.dataset.certeza = '1'; comprar('cartas', id, bl); }
      return;
    }
    const j = jogo; if (!j) return;
    const p = j.vez;
    if (!humano(p) || j.pensando) return;
    const b = e.target.closest('[data-usar]'); if (!b || b.disabled) return;
    if (!podeUsar(p, b.dataset.usar).ok) return;
    document.getElementById('janelaCarta').hidden = true;
    acionarCarta(b.dataset.usar);
  });
  document.getElementById('acoes').addEventListener('click', e => {
    const j = jogo;
    const cf = e.target.closest('[data-confirma]'); if (cf && j.fase === 'pegar' && dadoEscolhido(j) >= 0) { pegarDado(cf.dataset.confirma); return; }
    const dst = e.target.closest('[data-destino]');
    if (dst && j.fase === 'pegar' && j.sel && humano(j.vez) && !j.pensando) { pegarDado(dst.dataset.destino); return; }
    if (dst && j.fase === 'destino' && j.mao && humano(j.vez)) { colocar(j.vez, j.mao.v, dst.dataset.destino); return; }
    const bu = e.target.closest('[data-usar]'); if (bu) { if (!bu.disabled) acionarCarta(bu.dataset.usar); return; }
    const aj = e.target.closest('[data-ajuste]');
    if (aj && j.fase === 'ajuste') { const idx = j.ajusteIdx; j.fase = 'pegar'; j.alvo = null; j.ajusteIdx = null; usarCarta(j.vez, 'ajuste', idx, +aj.dataset.ajuste); render(); return; }
    const b = e.target.closest('[data-acao]'); if (!b) return;
    const a = b.dataset.acao;
    if (a === 'nova') return novaPartida();
    if (a === 'deck') return abrirDeck();
    if (a === 'fechar-carta') { foco = null; return render(); }
    if (a === 'ler-carta') { if (j.fase === 'alvo') { soltarEscolha(); render(); } return abrirCarta(j.vez, b.dataset.ler); }
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
    const k = b.dataset.cfg, novo = k === 'meta' ? +b.dataset.v : b.dataset.v;
    if (st.cfg[k] === novo) return;   // tocar no que já está marcado não recomeça nada
    st.cfg[k] = novo;
    salvar(); abrirConfig();
    if (k === 'ritmo') return;
    const aviso = document.getElementById('avisoCfg');
    if (online()) {
      // no meio de uma partida online, sair é desistir: isso fica só no botão Desistir (que pede confirmação)
      if (jogo.fase !== 'fim') { aviso.textContent = 'Vale depois desta partida online. Para sair agora, use Desistir.'; aviso.hidden = false; }
      return;
    }
    aviso.textContent = 'A meta vale na próxima partida.';
    if (inicioAberto()) return;   // no menu principal, os ajustes valem para a próxima partida que começar
    if (!jogo || jogo.compras === 0) novaPartida();
    else aviso.hidden = false;
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

  document.getElementById('btnDeNovo').addEventListener('click', novaPartida);
  document.getElementById('btnFechar').addEventListener('click', () => { document.getElementById('fim').hidden = true; });
  document.getElementById('btnMenuTopo').addEventListener('click', () => mostrarInicio());
  document.getElementById('btnMenuFim').addEventListener('click', () => { document.getElementById('fim').hidden = true; mostrarInicio(); });
  document.getElementById('btnFecharDeck').addEventListener('click', () => {
    document.getElementById('janelaDeck').hidden = true;
    document.getElementById('btnFecharDeck').textContent = 'Fechar';
  });
  document.getElementById('btnJogarDeck').addEventListener('click', () => {
    if (Rede.escolha) {
      clearTimeout(esperaEscolha);
      const pronto = !Rede.escolha.eu.pronto, d = deckOnline();
      Rede.escolha.eu = { deck: d.slice(), pronto };
      enviarWs({ tipo: 'deck', deck: d, pronto });
      Som.tocar(pronto ? 'momento' : 'toque');
      desenharEscolha();
      return;
    }
    st.deckVisto = true; salvar();
    Online.deckMudou();
    if ((partidaEmAndamento() || (!online() && lerPartidaGuardada())) && !online()) { document.getElementById('janelaDeck').hidden = true; Fx.chamada('Deck salvo', 'vale a partir da próxima partida', 'suave'); return; }
    novaPartida();
  });
  // recomeçar no meio: contra o rival do jogo conta como derrota (senão abandonar seria um jeito de nunca perder rating)
  document.getElementById('btnRecomecar').addEventListener('click', () => {
    document.getElementById('janelaDeck').hidden = true;
    if (!jogo || online()) return;
    if (jogo.modo === 'bot' && jogo.fase !== 'fim' && jogo.compras > 0) { jogo.token = Math.random(); jogo.pensando = false; R.desistir(jogo, 0); depois('fim'); return; }
    novaPartida();
  });
  document.getElementById('deckGrade').addEventListener('click', e => {
    const info = e.target.closest('[data-info]'); if (info) { abrirInfoCarta(info.dataset.info); return; }
    const b = e.target.closest('[data-op]'); if (!b) return;
    const d = st.decks[st.abaDeck], c = b.dataset.op;
    if (!possui(c)) { document.getElementById('janelaDeck').hidden = true; abrirLoja('cartas'); return; }
    if (d.includes(c)) { st.decks[st.abaDeck] = d.filter(x => x !== c); Som.tocar('carta'); salvar(); desenharDeck(); return; }
    const nao = porQueNao(d, c);
    if (nao) { desenharDeck(nao); return; }   // em vez de botão apagado, diz o que fazer
    st.decks[st.abaDeck] = d.concat(c); Som.tocar('carta'); salvar(); desenharDeck();
  });
  document.getElementById('deckEscolhido').addEventListener('click', e => {
    const b = e.target.closest('[data-tirar]'); if (!b) return;
    st.decks[st.abaDeck] = st.decks[st.abaDeck].filter(x => x !== b.dataset.tirar); Som.tocar('carta'); salvar(); desenharDeck();
  });
  document.getElementById('deckProntos').addEventListener('click', e => {
    const b = e.target.closest('[data-pronto]'); if (!b) return;
    st.decks[st.abaDeck] = PRONTOS[+b.dataset.pronto].cartas.slice(); Som.tocar('carta'); salvar(); desenharDeck();
  });
  // compartilhar: imagem + texto com o link (WhatsApp, Instagram…). Sem como mandar arquivo, vai o texto com o link;
  // no computador, o texto com o link é copiado e a imagem baixada. Devolve 'ok', 'cancelou' ou 'copiou'.
  async function compartilhar({ blob, arquivo, titulo, texto, url }) {
    const msg = `${texto}\n${url}`;
    const arq = blob && new File([blob], arquivo, { type: 'image/png' });
    if (arq && navigator.canShare && navigator.canShare({ files: [arq], text: msg })) {
      try { await navigator.share({ files: [arq], title: titulo, text: msg }); return 'ok'; }
      catch (e) { if (e.name === 'AbortError') return 'cancelou'; }
    }
    if (navigator.share) {
      try { await navigator.share({ title: titulo, text: texto, url }); return 'ok'; }
      catch (e) { if (e.name === 'AbortError') return 'cancelou'; }
    }
    let copiou = false;
    try { await navigator.clipboard.writeText(msg); copiou = true; } catch (e) {}
    if (blob) baixar(blob, arquivo);
    return copiou ? 'copiou' : 'baixou';
  }
  // o endereço do jogo para mandar (aberto por arquivo, vale o do Vercel)
  const linkJogo = () => (PAGINA ? PAGINA + '/' : 'https://diceduel-game.vercel.app/');
  document.getElementById('btnCompartilhar').addEventListener('click', async () => {
    const blob = cartao && (cartao.blob || await cartao.promessa.catch(() => null));
    const r = await compartilhar({ blob, arquivo: 'dice-duel.png', titulo: 'Dice Duel', texto: (cartao && cartao.texto) || 'Bora um duelo no Dice Duel? 🎲', url: linkJogo() });
    if (r === 'ok' || r === 'cancelou') return;
    // o botão é só o ícone: o que aconteceu aparece numa chamada curta
    Fx.chamada(r === 'copiou' ? 'Link copiado' : 'Imagem salva', r === 'copiou' && blob ? 'e a imagem do resultado também' : '', 'suave');
  });
  document.addEventListener('keydown', e => {
    const alvo = e.target && e.target.closest ? e.target : document.body;   // tecla vinda do documento não tem .closest
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    // Esc fecha a janela aberta mesmo com o foco num campo (o login do Online abre com o foco no nome),
    // e também no menu principal, quando ainda não há partida
    if (alvo.closest('textarea, input') && e.key !== 'Escape') return;
    if (e.key === 'Escape' && escolhendoRival && inicioAberto() && document.querySelectorAll('.janela:not([hidden])').length === 0) { escolhendoRival = false; desenharInicio(); return; }
    if (e.key === 'Escape') {
      ['fim', 'janelaCarta', 'janelaDeck', 'janelaConfig', 'janelaLoja', 'janelaPerfil', 'janelaOnline', 'janelaMenu'].forEach(id => { const el = document.getElementById(id); if (el) el.hidden = true; }); abrirLado(false);
      return jogo ? cancelarEscolha() : undefined;
    }
    if (!jogo) return;
    // com qualquer janela (ou o "versus") por cima, as teclas não mexem na Mesa escondida atrás
    if (document.querySelector('.janela:not([hidden]), .versus') || inicioAberto()) return;
    if (/^[1-5]$/.test(e.key)) { clicarDado(+e.key - 1); return; }
    const k = e.key.toLowerCase();
    // com um dado escolhido: Enter (ou C) põe na corrente/destino principal, B guarda ou troca
    if (k === 'enter' && alvo.closest('button')) return;   // Enter num botão focado já é o clique dele
    if (jogo.sel != null && humano(jogo.vez) && !jogo.pensando) {
      if (jogo.fase === 'alvo' && k === 'enter') return confirmarAlvo();
      if (jogo.fase === 'pegar') {
        const op = opcoesDoDado(jogo.vez, idxDe(jogo.sel));
        if (k === 'enter' && alvo.closest('[data-alvo-dado]')) return levarDado(alvo.closest('[data-alvo-dado]').dataset.alvoDado);
        if (k === 'enter' && op.principal) return pegarDado(op.principal);
        if (k === 'c') return levarDado('corrente');
        if (k === 'b') return levarDado('bolso');
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
  const Rede = { ws: null, ola: false, sala: null, infoSala: null, tentativas: 0, ranking: null, convite: null, aba: 'entrar', pediuRevanche: false, aviso: null,
    quedaDesde: null, desistiu: false, ultimaMsg: 0, voltouEm: 0, voltando: false };
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
    redesenharConta();
    if (!document.getElementById('janelaOnline').hidden) desenharOnline();
  }
  if (st.sessao && st.sessao.perfil) { st.contaConvidado = st.conta; st.conta = deServidor(st.sessao.perfil); }

  const SESSAO_ACABOU = 'Sua sessão terminou: a senha foi trocada, alguém usou "sair de todos os aparelhos" ou faz 30 dias que o jogo não abria. Entre de novo.';
  async function pedir(metodo, rota, corpo) {
    if (!API) throw new Error('Este aparelho não sabe onde está o servidor.');
    let r;
    try {
      r = await fetch(API + rota, { method: metodo, headers: { 'content-type': 'application/json', ...(st.sessao ? { authorization: 'Bearer ' + st.sessao.token } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined });
    } catch (e) { throw new Error('Sem conexão com o servidor.'); }
    const d = await r.json().catch(() => ({}));
    if (r.status === 401 && st.sessao && rota !== '/api/entrar') { sairDaConta(); aviso(SESSAO_ACABOU, true); }
    if (!r.ok) throw Object.assign(new Error(d.erro || `O servidor respondeu ${r.status}.`), { status: r.status, espera: d.espera, trancadaAte: d.trancadaAte, restam: d.restam, codigo: d.codigo });
    return d;
  }
  function aviso(txt, erro = false) {
    Rede.aviso = txt ? { txt, erro } : null;
    const el = document.getElementById('onlineAviso');
    el.hidden = !txt; el.textContent = txt || ''; el.classList.toggle('erro', erro);
    if (txt && erro && document.getElementById('janelaOnline').hidden) Fx.chamada('Online', esc(txt), 'suave');
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
    else { desenharOnline(); manterConectado(); carregarRanking(); }
  }
  function sairDaConta() {
    if (Rede.sala) sairDaSala();
    if (Rede.ws) { const ws = Rede.ws; Rede.ws = null; ws.close(); }
    st.sessao = null; guardarSessao();
    Object.assign(Rede, { amigos: null, rankingAmigos: null, posGlobal: null, busca: null, online: null });
    carregarOnline();
    if (st.contaConvidado) { st.conta = st.contaConvidado; delete st.contaConvidado; }
    aplicarPrefs(); desenharOnline(); redesenharConta(); if (jogo) render();
  }
  // o que segue a conta entre aparelhos (o som e a imagem ficam em cada aparelho)
  const extrasDoAparelho = () => ({ decks: st.decks, rec: st.rec, cfg: st.cfg, deckVisto: st.deckVisto });
  function aplicarExtras(ex) {
    if (!ex || !ex.em) return false;
    if (Array.isArray(ex.decks)) st.decks = [0, 1].map(i => (ex.decks[i] || []).filter(c => CARTAS[c]));
    if (ex.rec) Object.assign(st.rec, ex.rec);
    if (ex.cfg) { Object.assign(st.cfg, ex.cfg); st.cfg.meta = R.metaValida(st.cfg.meta); st.cfg.modo = 'bot'; }
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
      j.premio.motivo = e.status === 429 || e.status === 400 ? e.message : 'Sem conexão: esta partida não entrou na sua conta.';
      if (jogo === j && !document.getElementById('fim').hidden) desenharRecompensas(j);
    }
  };

  // ---------- o canal da partida e a volta depois de uma queda ----------
  // Quem cai tem 2 min (no servidor), contados só nas vezes dele, e o relógio dele corre na vez dele (como no chess.com).
  // O aparelho tenta voltar por 5 min, tenta na hora
  // em que a internet volta ou o app volta para a frente, e um pulso descobre conexões mortas que o navegador não percebe.
  // A sala fica guardada no aparelho: se a aba recarregar (o iPhone faz isso em segundo plano), o jogo volta para ela sozinho.
  const JANELA_VOLTA = 300_000, SALA_GUARDADA = 'diceduel.sala', VALIDADE_SALA = 3 * 3600_000;
  let timerVolta = null, emVoo = false;
  function lembrarSala(acabou = false) {
    try {
      if (Rede.sala) localStorage.setItem(SALA_GUARDADA, JSON.stringify({ codigo: Rede.sala, em: Date.now(), acabou }));
      else localStorage.removeItem(SALA_GUARDADA);
    } catch (e) {}
  }
  function salaGuardada() {
    try {
      const s = JSON.parse(localStorage.getItem(SALA_GUARDADA) || 'null');
      return s && !s.acabou && Date.now() - s.em < VALIDADE_SALA ? s.codigo : null;
    } catch (e) { return null; }
  }
  // quem chama conectar() ao mesmo tempo (a presença, a sala, a volta de uma queda) espera a mesma tentativa
  let conectando = null;
  function conectar() {
    if (Rede.ws && Rede.ws.readyState === 1 && Rede.ola) return Promise.resolve();
    if (!conectando) conectando = abrirConexao().finally(() => { conectando = null; });
    return conectando;
  }
  // com conta, o jogo fica conectado mesmo fora de uma sala: é assim que os amigos veem você online
  // e que chegam pedidos de amizade e chamadas para a sala
  function manterConectado() {
    if (!st.sessao || !API || document.hidden || (Rede.ws && Rede.ws.readyState <= 1)) return;
    conectar().catch(() => {});
  }
  setInterval(manterConectado, 20_000);
  addEventListener('online', manterConectado);
  document.addEventListener('visibilitychange', () => { if (!Rede.sala) manterConectado(); });
  function abrirConexao() {
    return new Promise((ok, falha) => {
      if (Rede.ws) { const velho = Rede.ws; Rede.ws = null; velho.close(); }
      let ws;
      try { ws = new WebSocket(API.replace(/^http/, 'ws') + '/ws'); } catch (e) { return falha(new Error('Sem conexão com o servidor.')); }
      Rede.ws = ws; Rede.ola = false;
      // rede ruim pode deixar a conexão "abrindo" para sempre: 8 s sem resposta contam como falha
      const limite = setTimeout(() => {
        if (Rede.ws !== ws || Rede.ola) return;
        Rede.ws = null; ws.onclose = null; try { ws.close(); } catch (e) {}
        falha(new Error('Sem conexão com o servidor.'));
      }, 8000);
      ws.onopen = () => ws.send(JSON.stringify({ tipo: 'ola', token: st.sessao.token }));
      ws.onmessage = e => {
        Rede.ultimaMsg = Date.now();
        let m; try { m = JSON.parse(e.data); } catch (x) { return; }
        if (m.tipo === 'pulso') return;
        if (m.tipo === 'ola') { clearTimeout(limite); Rede.ola = true; Rede.tentativas = 0; Rede.quedaDesde = null; Rede.desistiu = false; usarPerfil(m.conta); ok(); return; }
        if (m.tipo === 'erro' && m.sair) { clearTimeout(limite); sairDaConta(); aviso(SESSAO_ACABOU, true); falha(new Error(m.erro)); return; }
        receber(m);
      };
      ws.onclose = () => {
        if (Rede.ws !== ws) return;
        clearTimeout(limite);
        Rede.ws = null;
        const conectado = Rede.ola; Rede.ola = false;
        // antes do "ola", quem chamou conectar() cuida da falha (e de tentar de novo); depois dele, a queda é tratada aqui
        if (!conectado) falha(new Error('Sem conexão com o servidor.'));
        else if (Rede.sala) reconectar();
        else setTimeout(manterConectado, 3000);
      };
    });
  }
  // a conexão parece aberta mas não responde: larga e começa a voltar
  function derrubar() {
    const ws = Rede.ws;
    if (!ws || !Rede.ola) return;
    Rede.ws = null; Rede.ola = false;
    ws.onclose = null; ws.onmessage = null; try { ws.close(); } catch (e) {}
    if (Rede.sala) reconectar(true); else manterConectado();
  }
  // jaJa: tenta agora (a internet voltou, o app voltou para a frente) em vez de esperar a próxima tentativa
  function reconectar(jaJa = false) {
    if (!Rede.sala || !st.sessao || emVoo) return;
    if (!Rede.quedaDesde) Rede.quedaDesde = Date.now();
    if (Date.now() - Rede.quedaDesde > JANELA_VOLTA) {
      clearTimeout(timerVolta); timerVolta = null; Rede.desistiu = true;
      aviso('A conexão caiu. Abra o Online para tentar de novo.', true);
      return;
    }
    if (timerVolta && !jaJa) return; // uma tentativa por vez
    clearTimeout(timerVolta);
    const ms = jaJa ? 0 : Math.min(5000, 800 * 2 ** Rede.tentativas++);
    aviso('Reconectando…');
    timerVolta = setTimeout(() => {
      timerVolta = null;
      if (!Rede.sala || !st.sessao) return;
      emVoo = true;
      conectar().then(
        () => { emVoo = false; aviso(null); enviarWs({ tipo: 'entrar', sala: Rede.sala, deck: deckOnline() }); },
        () => { emVoo = false; reconectar(); });
    }, ms);
  }
  // recomeça a volta do zero (depois de desistir, ou quando a rede avisa que voltou)
  function tentarDeNovo() {
    if (!Rede.sala || !st.sessao || Rede.ola) return;
    Rede.desistiu = false; Rede.quedaDesde = null; Rede.tentativas = 0;
    reconectar(true);
  }
  addEventListener('online', tentarDeNovo);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !Rede.sala || !st.sessao) return;
    if (!Rede.ola) return tentarDeNovo();
    // de volta à frente: um pulso confirma que a conexão sobreviveu; sem resposta em 4 s, ela tinha morrido
    const pedido = Rede.voltouEm = Date.now();
    enviarWs({ tipo: 'pulso' });
    setTimeout(() => { if (Rede.ola && Rede.ultimaMsg < pedido) derrubar(); }, 4000);
  });
  // pulso de fundo: o servidor responde a cada um; 35 s sem ouvir nada dele é conexão morta
  setInterval(() => {
    if (!Rede.ola || document.hidden) return;
    if (Date.now() - Math.max(Rede.ultimaMsg, Rede.voltouEm) > 35_000) return derrubar();
    enviarWs({ tipo: 'pulso' });
  }, 15_000);
  const deckOnline = () => st.decks[0].filter(possui);
  const enviarWs = m => { if (Rede.ws && Rede.ws.readyState === 1 && Rede.ola) { Rede.ws.send(JSON.stringify(m)); return true; } if (Rede.sala) reconectar(); return false; };
  Online.enviar = acao => { if (enviarWs({ tipo: 'acao', acao })) { jogo.pensando = true; render(); } };
  Online.naSala = () => !!(Rede.sala && st.sessao);
  Online.desistir = () => { enviarWs({ tipo: 'desistir' }); };
  // começar uma partida pelo menu principal larga a sala online (a partida dela já acabou; ali "jogar de novo" seria revanche)
  Online.sair = () => { if (!Rede.sala) return; if (online()) jogo = null; sairDaSala(); };
  // trocou o deck esperando o amigo: o servidor guarda o deck da entrada, então entra de novo com o novo
  // (pela mesma conexão isso só atualiza o deck; com a partida já começada, o servidor ignora)
  Online.deckMudou = () => { if (Rede.sala && st.sessao && !online()) enviarWs({ tipo: 'entrar', sala: Rede.sala, deck: deckOnline() }); };
  Online.revanche = () => {
    if (!enviarWs({ tipo: 'revanche', deck: deckOnline() })) return;
    Rede.pediuRevanche = true; document.getElementById('fim').hidden = true; render();
  };

  // o tempo de cada vez no online, escolhido ao criar a sala (como o controle de tempo do chess.com; servidor/salas.js)
  // os ritmos (servidor/salas.js RITMOS): minutos no relógio de cada um + segundos ganhos a cada vez jogada
  const TEMPOS_ONLINE = { relampago: ['Relâmpago', '2 + 3'], rapida: ['Rápida', '5 + 5'], calma: ['Calma', '10 + 10'] };
  const tempoTxt = r => { const t = TEMPOS_ONLINE[r] || TEMPOS_ONLINE.rapida, [m, i] = t[1].split(' + '); return `${t[0]} · ${m} min + ${i} s por vez`; };
  async function criarSala() {
    aviso('Criando a sala…');
    try { const r = await pedir('POST', '/api/salas', { meta: +st.cfg.meta, ritmo: st.cfg.tempoOnline }); await entrarNaSala(r.sala.codigo); }
    catch (e) { aviso(e.message, true); }
  }
  async function entrarNaSala(codigo) {
    codigo = String(codigo || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(codigo)) return aviso('O código tem 6 letras ou números.', true);
    Rede.sala = codigo; Rede.infoSala = null; Rede.pediuRevanche = false;
    lembrarSala();
    try {
      await conectar();
      enviarWs({ tipo: 'entrar', sala: codigo, deck: deckOnline() });
      aviso(null); desenharOnline();
    } catch (e) {
      if (Rede.voltando) return reconectar(); // voltando sozinho para a sala depois de recarregar: insiste como numa queda
      Rede.sala = null; lembrarSala(); aviso(e.message, true); desenharOnline();
    }
  }
  function sairDaSala() {
    enviarWs({ tipo: 'sair' });
    Rede.sala = null; Rede.infoSala = null; Rede.pediuRevanche = false; Rede.voltando = false;
    lembrarSala();
    if (online()) { jogo = null; novaPartida(); }
    desenharOnline(); carregarRanking();
  }

  function receber(m) {
    // fora da partida: avisos (não largam a sala, ao contrário de 'erro'), amigos, chamadas e a busca de rival
    if (m.tipo === 'aviso') { if (m.codigo === 'fila') Rede.busca = null; aviso(m.erro, true); desenharOnline(); return; }
    if (m.tipo === 'amigos') return aoMudarAmigos(m);
    if (m.tipo === 'chamado') return mostrarChamado(m);
    // o servidor avisa o total sempre que alguém entra ou sai: o contador anda na hora
    if (m.tipo === 'online') { mostrarContador(Math.max(0, m.total - (st.sessao && Rede.ola ? 1 : 0))); if (!document.getElementById('janelaOnline').hidden) carregarOnlineLogo(); return; }
    if (m.tipo === 'sessao') return;   // a sessão mudou (senha, sair de tudo): a conexão fecha e volta com o token deste aparelho
    if (m.tipo === 'escolha') { if (m.cancelada) fecharEscolha(m.motivo); else abrirEscolha(m); return; }
    if (m.tipo === 'chamou') { aviso(`Chamamos ${m.nome}. Agora é esperar entrar.`); return; }
    if (m.tipo === 'procurando') { Rede.busca = { desde: (Rede.busca && Rede.busca.desde) || Date.now(), janela: m.janela, naFila: m.naFila }; desenharOnline(); return; }
    if (m.tipo === 'buscaCancelada') { Rede.busca = null; desenharOnline(); return; }
    if (m.tipo === 'achou') { Rede.busca = null; Rede.sala = m.sala; Rede.infoSala = null; lembrarSala(); aviso(`Rival encontrado: ${m.rival} (rating ${m.rating}).`); return; }
    if (m.tipo === 'sala') {
      Rede.infoSala = m.sala; Rede.voltando = false;
      const euId = st.sessao && st.sessao.perfil.id, outro = m.sala.jogadores.find(x => x.id !== euId);
      if (online() && jogo.sala === m.sala.codigo && outro) {
        // o rival caiu: o relógio dele para e aparece quanto tempo ele ainda tem para voltar
        jogo.perfis[1].conectado = outro.conectado;
        jogo.perfis[1].voltaAte = outro.volta != null ? Date.now() + outro.volta : null;
        render();
      }
      const meuAssento = m.sala.jogadores.findIndex(x => x.id === euId);
      if (m.revanche && m.revanche.includes(1 - meuAssento) && !Rede.pediuRevanche && outro) Fx.chamada('Revanche?', `${esc(outro.nome)} quer jogar de novo`, 'suave');
      if (!document.getElementById('janelaOnline').hidden) desenharOnline();
    } else if (m.tipo === 'estado') receberEstado(m.jogo);
    else if (m.tipo === 'fim') {
      const j = jogo;
      if (!online()) return;
      // o servidor reenvia o resultado a quem volta para a sala; quem já viu o fim desta partida não o vê de novo
      const jaViu = j.premio !== undefined;
      j.premio = m.premio; j.semPremio = m.erro || null;
      if (m.premio) usarPerfil(m.premio.conta);
      lembrarSala(true);
      if (!jaViu) setTimeout(mostrarFim, st.pref.animacoes ? 1800 : 600);
    } else if (m.tipo === 'erro') {
      const saiuDaSala = m.codigo === 'sala' || m.semSala;
      if (Rede.voltando && m.semSala) {
        // voltando sozinho para a sala guardada, mas ela já não existe: esquece em silêncio
        Rede.voltando = false; Rede.sala = null; Rede.infoSala = null; lembrarSala(); aviso(null);
        return;
      }
      // jogada recusada: destrava e mostra por quê (o servidor manda o estado certo logo em seguida)
      if (!saiuDaSala && online() && jogo.sala === Rede.sala) { jogo.pensando = false; Rede.pediuRevanche = false; render(); Fx.chamada('Ops', esc(m.erro), 'suave'); return; }
      // a sala não existe mais (ou recusou a entrada): sai da partida fantasma e volta ao jogo contra o rival
      const estavaJogando = online();
      Rede.sala = null; Rede.infoSala = null; Rede.pediuRevanche = false; Rede.voltando = false;
      // "entrou por outra janela": a sala guardada é da janela nova (a memória do aparelho é a mesma), fica onde está
      if (m.semSala || m.codigo !== 'sala') lembrarSala();
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
    if (!nova && antes.premio !== undefined) { v.premio = antes.premio; v.semPremio = antes.semPremio; } // o prêmio só vem uma vez
    v.perfis[1].voltaAte = v.perfis[1].volta != null ? Date.now() + v.perfis[1].volta : null;
    Rede.voltando = false;
    if (Rede.escolha) { Rede.escolha = null; desenharEscolha(); document.getElementById('btnFecharDeck').textContent = 'Fechar'; }
    jogo = v;
    lembrarSala(v.fase === 'fim');
    marcarNovos();
    if (nova) {
      ['avisoCfg', 'fim', 'janelaCarta', 'janelaDeck', 'janelaOnline'].forEach(id => { document.getElementById(id).hidden = true; });
      if (st.pref.animacoes && v.fase !== 'fim') return mostrarVersus();
    }
    render();
  }
  // o relógio da vez (o tempo do ritmo da sala, no selo de vez), a contagem de volta do rival que caiu
  // e o aviso de quando é a nossa conexão que caiu
  setInterval(() => {
    // jogada enviada e nenhuma resposta em 7 s: pede o estado de novo (o servidor reenvia a partida)
    if (jogo && online() && jogo.pensando) {
      jogo.pensandoDesde = jogo.pensandoDesde || Date.now();
      if (Date.now() - jogo.pensandoDesde > 7000 && Rede.sala) { jogo.pensandoDesde = Date.now(); enviarWs({ tipo: 'entrar', sala: Rede.sala, deck: deckOnline() }); }
    } else if (jogo) jogo.pensandoDesde = 0;
    if (!jogo || !online() || jogo.fase === 'fim') return;
    const el = document.getElementById('mesaInfo');
    if (Rede.sala && !Rede.ola) { el.innerHTML = '<span class="prazo">sem conexão: voltando para a partida…</span>'; return; }
    if (rivalCaiu()) {
      // com o rival fora, o relógio da vez dele para: só conta o tempo que ele tem para voltar
      const sv = segundosVolta();
      if (sv !== null) document.querySelectorAll('.volta-rival').forEach(x => { x.textContent = sv; });
      return;
    }
    // o relógio da vez mora no selo de vez, no alto da Mesa (sempre à vista, vermelho nos 10 s finais)
    if (el.querySelector('.prazo')) el.textContent = `rodada ${jogo.rodada} · ${jogo.mesa.length} ${jogo.mesa.length === 1 ? 'dado' : 'dados'}`;
    seloVez(jogo);
    lembrarVez(jogo);
  }, 1000);

  // a janela Online
  const carregarRanking = () => {
    if (!st.sessao) return;
    carregarAmigos();
    if (!Rede.sala) pedir('GET', '/api/ranking').then(r => { Rede.ranking = r.ranking; desenharOnline(); }).catch(() => {});
  };

  // ---------- amigos: pedir pelo nome, aceitar, chamar para a sala; ranking entre amigos ----------
  function carregarAmigos() {
    if (!st.sessao || !API) return;
    pedir('GET', '/api/amigos').then(r => { Rede.amigos = r; desenharOnline(); }).catch(() => {});
    pedir('GET', '/api/ranking/amigos').then(r => { Rede.rankingAmigos = r.ranking; Rede.posGlobal = r.global; desenharOnline(); }).catch(() => {});
    carregarOnline();
  }
  // a lista se atualiza sozinha enquanto a janela Online está aberta (quem entrou, quem está jogando)
  setInterval(() => { if (st.sessao && !document.hidden && !document.getElementById('janelaOnline').hidden) carregarAmigos(); }, 20_000);

  // ---------- quem está online agora: o contador no botão Online (até sem conta) e a lista para chamar ----------
  // Com pouca gente jogando, ver que tem alguém com o jogo aberto é o empurrão para começar uma partida.
  function mostrarContador(outros) {
    const el = document.getElementById('contaOnline');
    el.hidden = !outros; el.textContent = outros;
    el.title = `${outros} ${outros === 1 ? 'pessoa' : 'pessoas'} com o jogo aberto agora`;
    document.getElementById('btnOnline').setAttribute('aria-label', outros ? `Jogar online (${el.title})` : 'Jogar online');
  }
  // com a janela aberta, a lista acompanha as entradas e saídas (no máximo uma consulta a cada 3 s)
  let esperaOnline = null;
  const carregarOnlineLogo = () => { if (!esperaOnline) esperaOnline = setTimeout(() => { esperaOnline = null; carregarOnline(); }, 3000); };
  function carregarOnline() {
    if (!API) return;
    pedir('GET', '/api/online').then(r => {
      Rede.online = r;
      // a própria conta conta no total; os outros são o que interessa
      mostrarContador(r.jogadores ? r.jogadores.length : Math.max(0, r.total - (st.sessao && Rede.ola ? 1 : 0)));
      if (!document.getElementById('janelaOnline').hidden) desenharOnline();
    }).catch(() => {});
  }
  carregarOnline();
  setInterval(() => { if (!document.hidden) carregarOnline(); }, 30_000);
  // a lista de quem está online; na sala de espera (sala: true), só quem dá para chamar agora
  function htmlOnlineAgora({ sala = false } = {}) {
    const O = Rede.online;
    if (!O || !O.jogadores) return '';
    const podeChamar = x => x.onde !== 'jogando';
    const lista = O.jogadores.filter(x => !sala || podeChamar(x));
    const itens = lista.map(x => {
      const n = esc(x.nome), status = x.onde === 'jogando' ? 'jogando' : x.onde === 'esperando' ? 'numa sala' : 'online';
      const quem = x.amigo ? 'amigo' : x.pedido === 'enviado' ? 'pedido enviado' : x.pedido === 'recebido' ? 'quer ser seu amigo' : '';
      const botoes = (podeChamar(x) ? `<button class="btn btn-mel btn-peq" data-on="chamar" data-nome="${n}">Chamar</button>` : '')
        + (sala ? '' : x.pedido === 'recebido' ? `<button class="btn btn-papel btn-peq" data-on="aceitar-amigo" data-nome="${n}">Aceitar</button>`
          : !x.amigo && !x.pedido ? `<button class="btn btn-papel btn-peq" data-on="adicionar" data-nome="${n}" aria-label="Adicionar ${n} como amigo">+ Amigo</button>` : '');
      return `<li class="amigo on">${iconeSVG(x.icone)}<span class="quem-rk">${n}<small><i class="ponto-status ${status.replace(' ', '-')}"></i>${status} · ${x.rating}${quem ? ' · ' + quem : ''}</small></span>${botoes}</li>`;
    }).join('');
    if (sala) return itens ? `<h3>Chamar quem está online</h3><ul class="amigos">${itens}</ul>` : '<p class="nota" style="margin:0">Ninguém mais está com o jogo aberto agora. Mande o link: quem abrir aparece aqui.</p>';
    return `<h3>Online agora <span class="selo selo-online">${lista.length}</span></h3>
      <ul class="amigos">${itens || '<li class="vazio">Só você está com o jogo aberto agora. Chame alguém pelo link (ou deixe o jogo aberto: quem entrar aparece aqui).</li>'}</ul>`;
  }
  function aoMudarAmigos(m) {
    carregarAmigos();
    if (m.evento === 'pedido') { Fx.chamada('Pedido de amizade', `${esc(m.nome)} quer ser seu amigo`, 'suave'); Som.tocar('momento'); }
    if (m.evento === 'aceito') Fx.chamada('Amizade aceita', `${esc(m.nome)} agora é seu amigo`, 'suave');
  }
  // um amigo chamou você para a sala dele: aviso com Entrar / Agora não (não aparece no meio de uma partida online)
  function mostrarChamado(m) {
    if (online() && jogo.fase !== 'fim') return;
    let el = document.getElementById('chamadoAmigo');
    if (!el) {
      el = document.createElement('div'); el.id = 'chamadoAmigo'; el.className = 'chamado-amigo'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-live', 'assertive');
      document.body.appendChild(el);
      el.addEventListener('click', e => {
        const b = e.target.closest('[data-chamado]'); if (!b) return;
        el.hidden = true; clearTimeout(el.timer);
        if (b.dataset.chamado !== 'entrar') return;
        if (Rede.sala && Rede.sala !== el.dataset.sala) sairDaSala();
        entrarNaSala(el.dataset.sala);
      });
    }
    el.innerHTML = `${iconeSVG(m.icone)}<span class="quem-chamou"><b>${esc(m.de)}</b> te chamou para um duelo<small>meta ${m.meta} · rating ${m.rating}${m.amigo === false ? ' · ainda não é seu amigo' : ''}</small></span>
      <span class="linha-botoes"><button class="btn btn-mel btn-peq" data-chamado="entrar">Entrar</button><button class="btn btn-papel btn-peq" data-chamado="nao">Agora não</button></span>`;
    el.dataset.sala = m.sala; el.hidden = false;
    Som.tocar('momento'); vibrar([60, 40, 60]);
    clearTimeout(el.timer); el.timer = setTimeout(() => { el.hidden = true; }, 45_000);
  }
  async function acaoAmigo(rota, nome, b) {
    if (b) b.disabled = true;
    try {
      const r = await pedir('POST', rota, { nome });
      Rede.amigos = r;
      if (r.estado === 'pedido') aviso(`Pedido enviado para ${r.nome || nome}.`);
      if (r.estado === 'amigos') aviso(`Você e ${r.nome || nome} agora são amigos.`);
      carregarAmigos();
      return true;
    } catch (e) { aviso(e.message, true); if (b) b.disabled = false; return false; }
  }
  // chamar um amigo: sem sala, cria uma primeiro (é para ela que ele vai)
  async function chamarAmigo(nome) {
    if (!Rede.sala) await criarSala();
    if (Rede.sala) enviarWs({ tipo: 'chamar', nome });
  }
  const statusAmigo = a => (a.onde === 'jogando' ? 'jogando' : !a.online ? 'offline' : a.onde === 'esperando' ? 'numa sala' : 'online');
  function htmlAmigos({ chamar = false } = {}) {
    const A = Rede.amigos;
    if (!A) return '<h3>Amigos</h3><p class="nota" style="margin:0">Carregando…</p>';
    const nm = a => esc(a.nome);
    const podeChamar = a => a.online && a.onde !== 'jogando';
    const amigos = A.amigos.filter(a => !chamar || podeChamar(a)).map(a => `<li class="amigo ${a.online ? 'on' : ''}">${iconeSVG(a.icone)}
        <span class="quem-rk">${nm(a)}<small><i class="ponto-status ${statusAmigo(a).replace(' ', '-')}"></i>${statusAmigo(a)} · ${a.rating}</small></span>
        ${podeChamar(a) ? `<button class="btn btn-mel btn-peq" data-on="chamar" data-nome="${nm(a)}">Chamar</button>` : ''}
        ${chamar ? '' : `<button class="btn btn-papel btn-peq" data-on="remover-amigo" data-nome="${nm(a)}" aria-label="Desfazer amizade com ${nm(a)}">×</button>`}</li>`).join('');
    if (chamar) return amigos ? `<h3>Chamar um amigo online</h3><ul class="amigos">${amigos}</ul>` : '';
    const recebidos = A.recebidos.map(a => `<li class="amigo pedido">${iconeSVG(a.icone)}<span class="quem-rk">${nm(a)}<small>quer ser seu amigo · ${a.rating}</small></span>
        <button class="btn btn-mel btn-peq" data-on="aceitar-amigo" data-nome="${nm(a)}">Aceitar</button><button class="btn btn-papel btn-peq" data-on="recusar-amigo" data-nome="${nm(a)}">Recusar</button></li>`).join('');
    const enviados = A.enviados.map(a => `<li class="amigo">${iconeSVG(a.icone)}<span class="quem-rk">${nm(a)}<small>pedido enviado</small></span>
        <button class="btn btn-papel btn-peq" data-on="recusar-amigo" data-nome="${nm(a)}">Cancelar</button></li>`).join('');
    const vazio = !amigos && !recebidos && !enviados ? '<li class="vazio">Adicione amigos pelo nome para ver quem está online e chamar direto para a sala.</li>' : '';
    return `<h3>Amigos${A.recebidos.length ? ` <span class="selo">${A.recebidos.length}</span>` : ''}</h3>
      <form class="linha-botoes" id="formAmigo"><input class="campo" name="amigo" maxlength="20" placeholder="nome do amigo" aria-label="Nome do amigo" autocomplete="off" style="flex:1 1 140px"><button class="btn btn-papel" type="submit">Adicionar</button></form>
      <ul class="amigos">${recebidos}${amigos}${enviados}${vazio}</ul>`;
  }
  // "Conta e privacidade": aparecer no Online agora, quem pode chamar, trocar a senha, sair de todos os aparelhos, apagar a conta
  function htmlContaOpcoes(pf) {
    const pv = (pf.extras && pf.extras.privacidade) || {}, visivel = pv.visivel !== false, soAmigos = pv.chamadas === 'amigos';
    return `<details class="conta-opcoes" ${Rede.contaAberta ? 'open' : ''}><summary>Conta e privacidade</summary>
      <div class="linha-cfg"><span>Aparecer no Online agora<small>Desligado, só seus amigos veem você online.</small></span>
        <input type="checkbox" class="chave-liga" data-priv="visivel" ${visivel ? 'checked' : ''} aria-label="Aparecer no Online agora"></div>
      <div class="linha-cfg"><span>Quem pode me chamar para uma sala</span>
        <span class="segmento" role="group" aria-label="Quem pode me chamar"><button data-on="priv-todos" aria-pressed="${!soAmigos}">Todos</button><button data-on="priv-amigos" aria-pressed="${soAmigos}">Só amigos</button></span></div>
      <form class="form-conta" id="formSenha" autocomplete="off"><h3>Trocar a senha</h3>
        <label>Senha atual<span class="campo-senha"><input class="campo" name="atual" type="password" autocomplete="current-password" required maxlength="72"><button type="button" class="ver-senha" data-ver-senha aria-label="Mostrar a senha" aria-pressed="false">mostrar</button></span></label>
        <label>Senha nova<span class="campo-senha"><input class="campo" name="nova" type="password" autocomplete="new-password" required minlength="8" maxlength="72" placeholder="8 caracteres ou mais"><button type="button" class="ver-senha" data-ver-senha aria-label="Mostrar a senha" aria-pressed="false">mostrar</button></span></label>
        ${botaoComTrava('btn btn-papel', 'Trocar a senha')}
        <p class="nota" style="margin:0">Os outros aparelhos saem da conta; este continua.</p></form>
      <div class="linha-botoes"><button class="btn btn-papel" data-on="sair-de-tudo">Sair de todos os aparelhos</button></div>
      <form class="form-conta" id="formApagar" autocomplete="off"><h3>Apagar a conta</h3>
        <p class="nota" style="margin:0">Some com a conta, as moedas, os itens, o rating e as amizades. Não tem volta.</p>
        <label>Sua senha<span class="campo-senha"><input class="campo" name="senha" type="password" autocomplete="current-password" required maxlength="72"><button type="button" class="ver-senha" data-ver-senha aria-label="Mostrar a senha" aria-pressed="false">mostrar</button></span></label>
        ${botaoComTrava('btn btn-papel perigo', 'Apagar minha conta')}</form>
    </details>`;
  }
  // o ranking: global (top 50) ou entre amigos, com a sua posição
  function htmlRanking(pf) {
    const amigos = Rede.abaRanking === 'amigos';
    const lista = amigos ? Rede.rankingAmigos : Rede.ranking;
    const linha = (x, pos) => `<li class="${x.eu || x.nome === pf.nome ? 'eu' : ''}"><span class="pos">${pos}</span>${iconeSVG(x.icone)}<span class="quem-rk">${esc(x.nome)}<small>${esc(x.titulo)}</small></span><span class="rk">${x.rating}</span></li>`;
    const vazio = t => `<li><span></span><span></span><span class="quem-rk">${t}</span><span></span></li>`;
    const itens = !lista ? vazio('Carregando…') : !lista.length ? vazio('Ninguém jogou ainda.') : lista.map((x, i) => linha(x, x.posicao || i + 1)).join('');
    const pg = Rede.posGlobal;
    const minha = !pg ? '' : pg.posicao ? `Você está em <b>${pg.posicao}º</b> de ${pg.total} no ranking global.` : 'Jogue uma partida online para entrar no ranking global.';
    return `<h3>Ranking</h3>
      <div class="abas" role="group" aria-label="Ranking"><button data-on="rk-global" aria-pressed="${!amigos}">Global</button><button data-on="rk-amigos" aria-pressed="${amigos}">Amigos</button></div>
      <ol class="ranking">${itens}</ol>${minha ? `<p class="nota" style="margin:0">${minha}</p>` : ''}`;
  }
  // a busca de rival por rating (só aparece quando o servidor a liga)
  function htmlBusca() {
    if (!Rede.config || !Rede.config.fila) return '';
    if (!Rede.busca) return '<div class="linha-botoes"><button class="btn btn-papel" data-on="procurar">Procurar rival</button></div>';
    const s = Math.round((Date.now() - Rede.busca.desde) / 1000);
    return `<div class="convite"><span class="esperando">Procurando um rival de rating parecido<span class="pensando-pontos"></span></span>
      <span class="nota">${s} s · ${Rede.busca.naFila} na fila</span><button class="btn btn-papel" data-on="cancelar-busca">Cancelar</button></div>`;
  }
  function abrirOnline() {
    // depois de desistir de reconectar, abrir o Online tenta de novo
    if (Rede.desistiu) tentarDeNovo();
    desenharOnline();
    document.getElementById('janelaOnline').hidden = false;
    carregarRanking();
    const f = document.querySelector('#onlineConteudo input, #onlineConteudo .btn-mel');
    if (f) f.focus();
  }
  const esc = t => String(t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const linkDaSala = c => `${PAGINA}/?sala=${c}`;
  const meuNome = () => (st.sessao && st.sessao.perfil && st.sessao.perfil.nome) || (st.conta.online && st.conta.online.nome) || 'Um amigo';
  const textoConvite = () => `${meuNome()} te chamou para um duelo no Dice Duel 🎲 Toque no link para entrar na sala ${Rede.sala}:`;
  // a imagem do convite fica pronta quando a sala aparece (o iPhone só compartilha arquivo dentro do próprio toque)
  let convitePronto = { sala: null };
  function imagemConvite() {
    if (convitePronto.sala === Rede.sala) return convitePronto;
    const sala = Rede.infoSala, este = { sala: Rede.sala, blob: null };
    este.promessa = Cartao.convite({ nome: meuNome(), retrato: ICONES[st.conta.icone] ? st.conta.icone : 'bolinha', sala: Rede.sala,
      meta: sala && sala.meta ? sala.meta : st.cfg.meta, endereco: linkDaSala(Rede.sala).replace(/^https?:\/\//, '') }).then(b => { este.blob = b; return b; });
    este.promessa.catch(() => {});
    return (convitePronto = este);
  }
  // a janela se redesenha quando chega o ranking, a sala muda etc.: o que a pessoa está digitando (código, nome,
  // senha) e o cursor não podem sumir no meio da digitação
  function desenharOnline() {
    const caixa = document.getElementById('onlineConteudo');
    const digitado = [...caixa.querySelectorAll('input[name]')].map(i => [i.closest('form') ? i.closest('form').id : '', i.name, i.value]);
    const foco = document.activeElement && caixa.contains(document.activeElement) && document.activeElement.name
      ? { form: document.activeElement.closest('form') ? document.activeElement.closest('form').id : '', name: document.activeElement.name, ini: document.activeElement.selectionStart, fim: document.activeElement.selectionEnd } : null;
    desenharOnlineConteudo();
    for (const [form, name, valor] of digitado) {
      const i = caixa.querySelector(`${form ? '#' + form + ' ' : ''}input[name="${name}"]`);
      if (i && valor && !i.value) i.value = valor;
    }
    if (foco) {
      const i = caixa.querySelector(`${foco.form ? '#' + foco.form + ' ' : ''}input[name="${foco.name}"]`);
      if (i) { i.focus(); try { i.setSelectionRange(foco.ini, foco.fim); } catch (e) {} }
    }
  }
  function desenharOnlineConteudo() {
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
        ${Rede.online && Rede.online.total ? `<p class="aviso-online"><i class="ponto-status online"></i> ${Rede.online.total} ${Rede.online.total === 1 ? 'pessoa está' : 'pessoas estão'} com o jogo aberto agora. Entre para jogar com elas.</p>` : ''}
        <div class="abas" role="group" aria-label="Conta"><button data-on="aba-entrar" aria-pressed="${!criar}">Entrar</button><button data-on="aba-criar" aria-pressed="${criar}">Criar conta</button></div>
        <form class="form-conta" id="formConta" autocomplete="on">
          <label>Nome<input class="campo" name="nome" autocomplete="username" required minlength="3" maxlength="20" pattern="[A-Za-zÀ-ÖØ-öø-ÿ0-9_.\\-]{3,20}" placeholder="de 3 a 20 letras">${criar && Rede.nomeStatus ? `<small class="nome-status ${Rede.nomeStatus.livre ? 'livre' : 'ocupado'}" aria-live="polite">${esc(Rede.nomeStatus.livre ? '✓ Nome livre' : Rede.nomeStatus.erro)}</small>` : ''}</label>
          <label>Senha<span class="campo-senha"><input class="campo" name="senha" type="password" autocomplete="${criar ? 'new-password' : 'current-password'}" required minlength="${criar ? 8 : 6}" maxlength="72" placeholder="${criar ? '8 caracteres ou mais' : 'sua senha'}"><button type="button" class="ver-senha" data-ver-senha aria-label="Mostrar a senha" aria-pressed="false">mostrar</button></span></label>
          ${botaoComTrava('btn btn-mel', criar ? 'Criar conta' : 'Entrar')}
        </form>
        ${criar ? '<p class="nota" style="margin:0">O que você ganhou neste aparelho vai junto para a conta (até 600 moedas e itens até um valor de 900).</p>' : ''}`;
      return;
    }
    const pf = st.sessao.perfil, sala = Rede.infoSala;
    const eu = `<div class="eu-online">${iconeSVG(pf.ativo.icone)}<span><b>${esc(pf.nome)}</b><small>${esc(pf.titulo)} · ${pf.vitorias} de ${pf.partidas} vencidas</small></span><span class="rating-grande">${pf.rating}<small>rating</small></span></div>`;
    if (Rede.sala) {
      const emJogo = online() && jogo.sala === Rede.sala;
      if (Rede.escolha && !(emJogo && jogo.fase !== 'fim')) {
        el.innerHTML = `${eu}<p style="margin:0">Montando os decks para a partida contra <b>${esc(Rede.escolha.rival.nome)}</b>.</p>
          <div class="linha-botoes"><button class="btn btn-mel" data-on="deck">Abrir o deck</button><button class="btn btn-papel" data-on="sair-sala">Sair da sala</button></div>`;
        return;
      }
      if (emJogo && jogo.fase !== 'fim') {
        el.innerHTML = `${eu}<p style="margin:0">Partida na sala <b>${Rede.sala}</b> contra <b>${esc(jogo.perfis[1].nome)}</b> (rating ${jogo.perfis[1].rating}).</p>
          <div class="linha-botoes"><button class="btn btn-mel" data-on="voltar">Voltar à mesa</button><button class="btn btn-papel" data-on="desistir">Desistir</button></div>
          <p class="nota" style="margin:0">Desistir conta como derrota. Se a conexão cair, você tem 2 minutos para voltar (o jogo tenta sozinho).</p>`;
        return;
      }
      if (emJogo) {
        el.innerHTML = `${eu}<p style="margin:0">Sala <b>${Rede.sala}</b>: a partida acabou.</p>
          <div class="linha-botoes"><button class="btn btn-mel" data-on="revanche" ${Rede.pediuRevanche ? 'disabled' : ''}>${Rede.pediuRevanche ? 'Esperando o rival…' : 'Revanche'}</button><button class="btn btn-papel" data-on="sair-sala">Sair da sala</button></div>`;
        return;
      }
      imagemConvite();
      const lista = sala ? sala.jogadores.map(x => `<li><span>${esc(x.nome)}</span><span>${x.rating}</span></li>`).join('') : '';
      el.innerHTML = `${eu}<div class="convite"><span class="nota">Mande o link (ou o código) para quem vai jogar com você</span>
          <span class="codigo-grande">${Rede.sala}</span><span class="link">${esc(linkDaSala(Rede.sala))}</span>
          <div class="linha-botoes"><button class="btn btn-mel" data-on="compartilhar">Compartilhar</button><button class="btn btn-papel" data-on="copiar">Copiar convite</button></div>
          <ul class="lista-sala">${lista}</ul>
          <span class="esperando">Esperando o amigo<span class="pensando-pontos"></span></span></div>
        ${htmlOnlineAgora({ sala: true })}
        <p class="nota" style="margin:0">Meta ${sala ? sala.meta : st.cfg.meta} · ${tempoTxt(sala ? sala.ritmo : st.cfg.tempoOnline)} · seu deck: ${deckOnline().map(c => CARTAS[c].nome).join(', ') || 'sem cartas'}. Enquanto espera, dá para jogar contra o rival do jogo.</p>
        <div class="linha-botoes"><button class="btn btn-papel" data-on="deck">Trocar deck</button><button class="btn btn-papel" data-on="sair-sala">Cancelar a sala</button></div>`;
      return;
    }
    el.innerHTML = `${eu}
      <div class="linha-cfg tempo-online"><span><label>Relógio</label><small>minutos de cada um + segundos ganhos a cada vez; o relógio só corre na sua vez, e se ele acabar, você perde</small></span>
        <span class="segmento" role="group" aria-label="Relógio">${Object.entries(TEMPOS_ONLINE).map(([k, t]) => `<button data-on="tempo" data-v="${k}" aria-pressed="${st.cfg.tempoOnline === k}">${t[0]} <small>${t[1]}</small></button>`).join('')}</span></div>
      <div class="linha-botoes"><button class="btn btn-mel" data-on="criar-sala">Chamar um amigo</button></div>
      <form class="linha-botoes" id="formCodigo"><input class="campo codigo" name="codigo" maxlength="6" placeholder="código" aria-label="Código da sala" autocomplete="off" style="flex:1 1 120px"><button class="btn btn-papel" type="submit">Entrar na sala</button></form>
      ${htmlBusca()}
      ${htmlOnlineAgora()}
      ${htmlAmigos()}
      ${htmlRanking(pf)}
      <p class="nota" style="margin:0">Vitória online: ${BASE_MOEDAS.online} moedas × margem × rapidez, e vale mais vencer quem tem rating maior. O mesmo par vale rating e moedas 3 vezes por dia.</p>
      ${htmlContaOpcoes(pf)}
      <div class="linha-botoes"><button class="btn btn-papel" data-on="sair-conta">Sair da conta</button></div>`;
  }
  document.getElementById('btnOnline').addEventListener('click', abrirOnline);
  document.getElementById('btnFecharOnline').addEventListener('click', () => { document.getElementById('janelaOnline').hidden = true; });
  document.getElementById('onlineConteudo').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target, botao = f.querySelector('[type=submit]');
    if (f.id === 'formCodigo') return entrarNaSala(f.codigo.value);
    if (f.id === 'formSenha') {
      botao.disabled = true;
      try {
        const r = await pedir('POST', '/api/eu/senha', { atual: f.atual.value, nova: f.nova.value });
        st.sessao.token = r.token; usarPerfil(r.conta); f.atual.value = ''; f.nova.value = '';
        aviso('Senha trocada. Os outros aparelhos saíram da conta.');
      } catch (x) { erroDeSenha(x); }
      botao.disabled = travado(); return;
    }
    if (f.id === 'formApagar') {
      if (botao.dataset.certeza !== '1') { botao.dataset.certeza = '1'; botao.textContent = 'Toque de novo para apagar'; setTimeout(() => { botao.dataset.certeza = ''; botao.textContent = 'Apagar minha conta'; }, 4000); return; }
      botao.disabled = true;
      try {
        await pedir('POST', '/api/eu/apagar', { senha: f.senha.value });
        Rede.sala = null; lembrarSala(); Rede.contaAberta = false; sairDaConta();
        aviso('Conta apagada. O progresso deste aparelho continua aqui, sem conta.');
      } catch (x) { erroDeSenha(x); botao.disabled = travado(); }
      return;
    }
    if (f.id === 'formAmigo') {
      const nome = f.amigo.value.trim(); if (!nome) return;
      if (await acaoAmigo('/api/amigos', nome, botao)) f.amigo.value = '';
      botao.disabled = false;
      return;
    }
    if (travado()) return;
    botao.disabled = true;
    try { await entrarNaConta(Rede.aba === 'criar', f.nome.value.trim(), f.senha.value); Rede.trava = null; }
    catch (x) { erroDeSenha(x, Auth.chave(f.nome.value)); botao.disabled = travado(); }
  });
  document.getElementById('onlineConteudo').addEventListener('click', async e => {
    const b = e.target.closest('[data-on]'); if (!b) return;
    const a = b.dataset.on;
    if (a === 'aba-entrar' || a === 'aba-criar') { Rede.aba = a.slice(4); Rede.nomeStatus = null; aviso(null); desenharOnline(); }
    if (a === 'rk-global' || a === 'rk-amigos') { Rede.abaRanking = a.slice(3); desenharOnline(); }
    if (a === 'chamar') chamarAmigo(b.dataset.nome);
    if (a === 'adicionar') acaoAmigo('/api/amigos', b.dataset.nome, b);
    if (a === 'aceitar-amigo') acaoAmigo('/api/amigos/aceitar', b.dataset.nome, b);
    if (a === 'recusar-amigo') acaoAmigo('/api/amigos/remover', b.dataset.nome, b);
    if (a === 'remover-amigo') {
      if (b.dataset.certeza !== '1') { b.dataset.certeza = '1'; b.textContent = 'Desfazer?'; setTimeout(() => { b.dataset.certeza = ''; b.textContent = '×'; }, 3000); return; }
      acaoAmigo('/api/amigos/remover', b.dataset.nome, b);
    }
    if (a === 'procurar') {
      Rede.busca = { desde: Date.now(), janela: 0, naFila: 1 }; desenharOnline();
      try { await conectar(); enviarWs({ tipo: 'procurar', meta: +st.cfg.meta, deck: deckOnline() }); }
      catch (x) { Rede.busca = null; aviso(x.message, true); desenharOnline(); }
    }
    if (a === 'cancelar-busca') { enviarWs({ tipo: 'cancelarBusca' }); Rede.busca = null; desenharOnline(); }
    if (a === 'tempo' && TEMPOS_ONLINE[b.dataset.v]) { st.cfg.tempoOnline = b.dataset.v; salvar(); desenharOnline(); }
    if (a === 'criar-sala') criarSala();
    if (a === 'sair-sala') sairDaSala();
    if (a === 'sair-conta') sairDaConta();
    if (a === 'priv-todos' || a === 'priv-amigos') salvarPrivacidade({ chamadas: a === 'priv-amigos' ? 'amigos' : 'todos' });
    if (a === 'sair-de-tudo') {
      if (b.dataset.certeza !== '1') { b.dataset.certeza = '1'; b.textContent = 'Toque de novo para confirmar'; setTimeout(() => { b.dataset.certeza = ''; b.textContent = 'Sair de todos os aparelhos'; }, 4000); return; }
      try { const r = await pedir('POST', '/api/eu/sair-de-tudo', {}); st.sessao.token = r.token; usarPerfil(r.conta); aviso('Pronto: todos os outros aparelhos saíram da conta.'); }
      catch (x) { aviso(x.message, true); }
    }
    if (a === 'voltar') document.getElementById('janelaOnline').hidden = true;
    if (a === 'deck') { document.getElementById('janelaOnline').hidden = true; abrirDeck(); }
    if (a === 'revanche') Online.revanche();
    if (a === 'desistir') {
      if (b.dataset.certeza !== '1') { b.dataset.certeza = '1'; b.textContent = 'Toque de novo'; return; }
      enviarWs({ tipo: 'desistir' }); document.getElementById('janelaOnline').hidden = true;
    }
    if (a === 'copiar') {
      const texto = `${textoConvite()}\n${linkDaSala(Rede.sala)}`;
      try { await navigator.clipboard.writeText(texto); b.textContent = 'Copiado!'; } catch (x) { b.textContent = 'Copie o link acima'; }
      setTimeout(() => { b.textContent = 'Copiar convite'; }, 2000);
    }
    if (a === 'compartilhar') {
      const cv = imagemConvite(), blob = cv.blob || await cv.promessa.catch(() => null);
      const r = await compartilhar({ blob, arquivo: `dice-duel-sala-${Rede.sala}.png`, titulo: 'Dice Duel', texto: textoConvite(), url: linkDaSala(Rede.sala) });
      if (r === 'copiou' || r === 'baixou') { b.textContent = r === 'copiou' ? 'Link copiado' : 'Imagem salva'; setTimeout(() => { b.textContent = 'Compartilhar'; }, 2200); }
    }
  });
  async function salvarPrivacidade(p) {
    try { const r = await pedir('PUT', '/api/eu/privacidade', p); usarPerfil(r.conta); } catch (x) { aviso(x.message, true); }
  }
  document.getElementById('onlineConteudo').addEventListener('change', e => { if (e.target.dataset.priv === 'visivel') salvarPrivacidade({ visivel: e.target.checked }); });
  document.getElementById('onlineConteudo').addEventListener('toggle', e => { if (e.target.classList.contains('conta-opcoes')) Rede.contaAberta = e.target.open; }, true);
  // ---------- avisos de senha: tentativas restantes, trava com contagem regressiva, Caps Lock, senha fácil ----------
  // Rede.trava = { ate, nome? }: até quando os botões de senha ficam travados (a conta, ou o aparelho por muitas tentativas)
  const Auth = { chave: n => String(n || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[._-]/g, '') };
  const travado = () => !!(Rede.trava && Rede.trava.ate > Date.now());
  const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  function botaoComTrava(classe, texto) {
    const t = travado();
    return `<button class="${classe}" type="submit" data-trava="${esc(texto)}" ${t ? 'disabled' : ''}>${t ? `Tente de novo em ${mmss(Rede.trava.ate - Date.now())}` : esc(texto)}</button>`;
  }
  function erroDeSenha(x, nome = null) {
    if (x.espera || x.trancadaAte) {
      Rede.trava = { ate: x.trancadaAte || Date.now() + x.espera * 1000, nome: x.codigo === 'trancada' ? nome : null };
      desenharOnline();
    }
    aviso(x.message, true);
    if (x.restam !== undefined && x.restam <= 3 && !x.trancadaAte) Som.tocar('perigo');
  }
  // a contagem anda sozinha no botão e, quando acaba, ele volta
  setInterval(() => {
    if (!Rede.trava) return;
    const bs = document.querySelectorAll('#onlineConteudo [data-trava]');
    if (travado()) { bs.forEach(b => { b.disabled = true; b.textContent = `Tente de novo em ${mmss(Rede.trava.ate - Date.now())}`; }); return; }
    Rede.trava = null;
    bs.forEach(b => { b.disabled = false; b.textContent = b.dataset.trava; });
    aviso('Pode tentar de novo.');
  }, 1000);
  // a trava de senha é de uma conta: digitar outro nome no login destrava o botão
  document.getElementById('onlineConteudo').addEventListener('input', e => {
    if (e.target.name === 'nome' && Rede.trava && Rede.trava.nome && Auth.chave(e.target.value) !== Rede.trava.nome) { Rede.trava = null; desenharOnline(); }
  });
  // Caps Lock ligado num campo de senha
  const capsLock = e => {
    if (!e.target.matches || !e.target.matches('#onlineConteudo input[type=password], #onlineConteudo .campo-senha input') || !e.getModifierState) return;
    const caixa = e.target.closest('.campo-senha') || e.target;
    let av = caixa.parentElement.querySelector('.caps-aviso');
    const ligado = e.getModifierState('CapsLock');
    if (ligado && !av) { av = document.createElement('small'); av.className = 'caps-aviso'; av.textContent = 'Caps Lock ligado'; caixa.after(av); }
    if (!ligado && av) av.remove();
  };
  document.getElementById('onlineConteudo').addEventListener('keydown', capsLock);
  document.getElementById('onlineConteudo').addEventListener('keyup', capsLock);
  // mostrar/ocultar a senha (no celular é fácil errar uma letra sem ver)
  document.getElementById('onlineConteudo').addEventListener('click', e => {
    const b = e.target.closest('[data-ver-senha]'); if (!b) return;
    const i = b.parentElement.querySelector('input'), ver = i.type === 'password';
    i.type = ver ? 'text' : 'password'; b.textContent = ver ? 'ocultar' : 'mostrar';
    b.setAttribute('aria-pressed', String(ver)); b.setAttribute('aria-label', ver ? 'Ocultar a senha' : 'Mostrar a senha');
    i.focus();
  });
  // senha nova fácil de adivinhar: só uma dica (não impede)
  const FACEIS = ['123456', '1234567', '12345678', '123456789', 'senha123', 'abc123', 'qwerty', 'abcdef', '111111', '000000', 'senha', 'password'];
  document.getElementById('onlineConteudo').addEventListener('input', e => {
    const nova = e.target.name === 'nova' || (e.target.name === 'senha' && e.target.closest('#formConta') && Rede.aba === 'criar');
    if (!nova) return;
    const v = e.target.value, f = e.target.closest('form'), nome = f.nome ? f.nome.value : (st.sessao && st.sessao.perfil.nome) || '';
    const facil = v.length >= 6 && (/^\d+$/.test(v) || FACEIS.includes(v.toLowerCase()) || Auth.chave(v) === Auth.chave(nome) || /^(.)\1+$/.test(v));
    const caixa = e.target.closest('.campo-senha') || e.target;
    let d = caixa.parentElement.querySelector('.dica-senha');
    if (facil && !d) { d = document.createElement('small'); d.className = 'dica-senha'; d.textContent = 'Fácil de adivinhar: misture letras e números.'; caixa.after(d); }
    if (!facil && d) d.remove();
  });
  // criando a conta: o nome está livre? (pergunta ao servidor enquanto a pessoa digita; Ana = ana = ANA = Aná)
  let esperaNome = null;
  document.getElementById('onlineConteudo').addEventListener('input', e => {
    if (e.target.name !== 'nome' || Rede.aba !== 'criar' || st.sessao) return;
    clearTimeout(esperaNome);
    const nome = e.target.value.trim();
    if (nome.length < 3) { if (Rede.nomeStatus) { Rede.nomeStatus = null; desenharOnline(); } return; }
    esperaNome = setTimeout(() => {
      pedir('GET', '/api/nomes/' + encodeURIComponent(nome)).then(r => {
        const agora = document.querySelector('#formConta [name=nome]');
        if (!agora || agora.value.trim() !== nome) return;   // a pessoa já digitou outra coisa
        Rede.nomeStatus = r; desenharOnline();
      }).catch(() => {});
    }, 350);
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
  if (st.sessao && API) pedir('GET', '/api/eu').then(r => { st.sessao.token = r.token; usarPerfil(r.conta); unirExtras(r.conta); if (jogo) render(); manterConectado(); }).catch(() => {});
  // o que este servidor oferece (a busca de rival por rating só aparece quando estiver ligada)
  if (API) pedir('GET', '/api/config').then(c => { Rede.config = c; }).catch(() => {});

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
    } else {
      // o jogo abre no menu principal; a partida offline guardada (se houver) fica atrás dele, para continuar
      const g = lerPartidaGuardada();
      if (g) { jogo = restaurarPartida(g); render(); }
      mostrarInicio();
    }
    if (Rede.convite) { esconderInicio(); abrirOnline(); if (st.sessao) { const c = Rede.convite; Rede.convite = null; entrarNaSala(c).then(abrirOnline); } }
    else if (st.sessao && API) {
      // a aba recarregou no meio de uma sala (queda, celular que fechou a aba): volta para ela sozinho
      const guardada = salaGuardada();
      if (guardada) { Rede.voltando = true; entrarNaSala(guardada); }
    }
  }
  // o roteiro de teste automático (tools/) pode ler o estado
  window.DiceDuel = { get jogo() { return jogo; }, st, salvar, fecharInicio: () => esconderInicio(), abrirInicio: () => mostrarInicio(), ajustar(p) { Object.assign(st.pref, p); aplicarPrefs(); if (jogo) render(); }, automato: () => talvezAutomato() };
  window.claude?.hot?.ready ? window.claude.hot.ready(iniciar) : iniciar(window.claude?.hot?.data ?? {});
})();
