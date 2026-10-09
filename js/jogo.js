/* Dice Duel · o jogo
 * Regras (v0.6): Mesa compartilhada de 5 dados, corrente que só cresce pela frente,
 * sincronias Eco (=), Passo (±1) e Oposto (soma 7), Bolso de um dado, quem está atrás abre a Mesa,
 * deck de até 3 cartas (no máx. 2 armadilhas e 1 carta de pontos ⚡). Números medidos em simulação (sim/).
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
    coringa: svg('<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.8 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>'),
    sobrecarga: svg('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
    espelho: svg('<ellipse cx="12" cy="9" rx="6" ry="7"/><path d="M12 16v5M8.5 21h7M9.5 6.5l4 4M10 11l2 2"/>'),
    fundo: svg('<path d="M4 4h16M4 4v9M20 4v9M4 13l3 7M20 13l-3 7M9 9h6"/>'),
    ancora: svg('<circle cx="12" cy="5" r="2"/><path d="M12 7v14M8 11h8M4.5 14.5c.5 3.8 3.8 6.5 7.5 6.5s7-2.7 7.5-6.5"/>'),
    interferencia: svg('<path d="M2 12h3l2-5 3 10 3-13 3 13 2-5h4"/>'),
    pedagio: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M14.5 9.5h-3.5a1.5 1.5 0 0 0 0 3h2a1.5 1.5 0 0 1 0 3H9.5"/>'),
  };
  const CARTAS = Object.fromEntries(Object.entries(R.CARTAS).map(([k, v]) => [k, { ...v, ico: ICO_CARTA[k] }]));
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
  const DESC_DADOS = { marfim: 'o clássico da mesa', madeira: 'cheirinho de marcenaria', rosa: 'doce como algodão-doce', menta: 'presente do nível 3', pelucia: 'fofinho e redondinho', dourado: 'reluz na mesa', diamante: 'para quem tem paciência' };
  const DADOS = Object.fromEntries(Object.entries(R.CATALOGO.dados).map(([k, v]) => [k, { ...v, desc: DESC_DADOS[k] }]));
  const ICONES_SVG = {
    bolinha:  { nome: 'Bolinha', preco: 0, svg: `<circle cx="32" cy="34" r="22" fill="#6fbfd3" stroke="#3a2a2e" stroke-width="2.5"/><circle class="olho" cx="25" cy="32" r="3" fill="#3a2a2e"/><circle class="olho" cx="39" cy="32" r="3" fill="#3a2a2e"/><path d="M26 41 q6 5 12 0" stroke="#3a2a2e" stroke-width="2.5" fill="none" stroke-linecap="round"/>` },
    xicara:   { nome: 'Xícara', preco: 0, nivel: 2, svg: `<path d="M26 14c-3-3 3-5 0-8M34 14c-3-3 3-5 0-8" stroke="#ecdcc8" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M12 22h34v10a14 14 0 0 1-14 14h-6A14 14 0 0 1 12 32z" fill="#f1dfc2" stroke="#3a2a2e" stroke-width="2.5"/><path d="M46 26h3a6 6 0 0 1 0 12h-4" fill="none" stroke="#3a2a2e" stroke-width="2.5"/><circle class="olho" cx="23" cy="31" r="2.4" fill="#3a2a2e"/><circle class="olho" cx="35" cy="31" r="2.4" fill="#3a2a2e"/><path d="M26 37 q3 3 6 0" stroke="#3a2a2e" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="19" cy="36" r="2.4" fill="#ec8fa8" opacity=".6"/><circle cx="39" cy="36" r="2.4" fill="#ec8fa8" opacity=".6"/>` },
    raposa:   { nome: 'Raposa', preco: 100, svg: `<path d="M10 14 L22 26 L14 34 Z M54 14 L42 26 L50 34 Z" fill="#e8874f" stroke="#3a2a2e" stroke-width="2.5" stroke-linejoin="round"/><path d="M12 30 Q32 6 52 30 Q50 48 32 56 Q14 48 12 30 Z" fill="#e8874f" stroke="#3a2a2e" stroke-width="2.5"/><path d="M18 38 Q32 44 46 38 Q42 52 32 56 Q22 52 18 38 Z" fill="#fff3e2"/><circle class="olho" cx="24" cy="34" r="2.6" fill="#3a2a2e"/><circle class="olho" cx="40" cy="34" r="2.6" fill="#3a2a2e"/><circle cx="32" cy="45" r="2.6" fill="#3a2a2e"/>` },
    sapo:     { nome: 'Sapinho', preco: 100, svg: `<ellipse cx="32" cy="40" rx="24" ry="17" fill="#8fd6a8" stroke="#3a2a2e" stroke-width="2.5"/><circle cx="20" cy="24" r="9" fill="#8fd6a8" stroke="#3a2a2e" stroke-width="2.5"/><circle cx="44" cy="24" r="9" fill="#8fd6a8" stroke="#3a2a2e" stroke-width="2.5"/><circle class="olho" cx="20" cy="24" r="4" fill="#3a2a2e"/><circle class="olho" cx="44" cy="24" r="4" fill="#3a2a2e"/><path d="M22 44 q10 7 20 0" stroke="#3a2a2e" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="16" cy="42" r="3" fill="#ec8fa8" opacity=".5"/><circle cx="48" cy="42" r="3" fill="#ec8fa8" opacity=".5"/>` },
    cogumelo: { nome: 'Cogumelo', preco: 140, svg: `<path d="M8 32 Q8 10 32 10 Q56 10 56 32 Z" fill="#e8806f" stroke="#3a2a2e" stroke-width="2.5" stroke-linejoin="round"/><circle cx="22" cy="20" r="4" fill="#fff3e2"/><circle cx="38" cy="17" r="3.5" fill="#fff3e2"/><circle cx="46" cy="27" r="3" fill="#fff3e2"/><path d="M20 32 h24 v12 a12 12 0 0 1 -24 0 z" fill="#fbf1df" stroke="#3a2a2e" stroke-width="2.5"/><circle class="olho" cx="27" cy="40" r="2.3" fill="#3a2a2e"/><circle class="olho" cx="37" cy="40" r="2.3" fill="#3a2a2e"/><path d="M29 46 q3 2.5 6 0" stroke="#3a2a2e" stroke-width="2" fill="none" stroke-linecap="round"/>` },
  };
  Object.keys(ICONES_SVG).forEach(k => Object.assign(ICONES_SVG[k], R.CATALOGO.icones[k]));
  const ICONES = ICONES_SVG;
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
  const AVATAR = {
    aprendiz: `<svg class="avatar" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M12 26 L14 8 L26 18 Z M52 26 L50 8 L38 18 Z" fill="#f0a868" stroke="#3a2a2e" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M16 12 l3 8 M48 12 l-3 8" stroke="#f6c9a4" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="32" cy="36" rx="22" ry="19" fill="#f0a868" stroke="#3a2a2e" stroke-width="2.5"/>
      <path d="M22 22 q4 4 0 8 M42 22 q-4 4 0 8" stroke="#d98a4c" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="32" cy="44" rx="10" ry="7" fill="#fbe3cc"/>
      <ellipse class="olho" cx="24" cy="35" rx="3" ry="4" fill="#3a2a2e"/><ellipse class="olho" cx="40" cy="35" rx="3" ry="4" fill="#3a2a2e"/>
      <circle cx="25" cy="33.5" r="1" fill="#fff"/><circle cx="41" cy="33.5" r="1" fill="#fff"/>
      <path d="M30 41 h4 l-2 2.4 z" fill="#ec8fa8"/><path d="M32 43.4 q-2 3 -5 2 M32 43.4 q2 3 5 2" stroke="#3a2a2e" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path d="M14 40 h8 M14 44 h8 M42 40 h8 M42 44 h8" stroke="#3a2a2e" stroke-width="1.3" stroke-linecap="round" opacity=".6"/>
      <ellipse cx="20" cy="42" rx="3" ry="2" fill="#ec8fa8" opacity=".5"/><ellipse cx="44" cy="42" rx="3" ry="2" fill="#ec8fa8" opacity=".5"/></svg>`,
    esperto: `<svg class="avatar" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M14 18 L18 6 L26 14 Z M50 18 L46 6 L38 14 Z" fill="#9c7f6a" stroke="#3a2a2e" stroke-width="2.5" stroke-linejoin="round"/>
      <ellipse cx="32" cy="36" rx="24" ry="22" fill="#b0927c" stroke="#3a2a2e" stroke-width="2.5"/>
      <ellipse cx="32" cy="46" rx="13" ry="10" fill="#e9d8c4"/>
      <path d="M26 46 q2 2 4 0 q2 2 4 0 q2 2 4 0" stroke="#b0927c" stroke-width="1.6" fill="none"/>
      <circle cx="22" cy="30" r="9" fill="#fffaf0" stroke="#3a2a2e" stroke-width="2.5"/><circle cx="42" cy="30" r="9" fill="#fffaf0" stroke="#3a2a2e" stroke-width="2.5"/>
      <path d="M31 30 h2" stroke="#3a2a2e" stroke-width="2.5"/>
      <circle class="olho" cx="22" cy="30" r="4" fill="#3a2a2e"/><circle class="olho" cx="42" cy="30" r="4" fill="#3a2a2e"/>
      <circle cx="23.5" cy="28.5" r="1.3" fill="#fff"/><circle cx="43.5" cy="28.5" r="1.3" fill="#fff"/>
      <path d="M29 36 L35 36 L32 41 Z" fill="#f2b15e" stroke="#3a2a2e" stroke-width="1.8" stroke-linejoin="round"/>
      <circle cx="13" cy="38" r="3" fill="#ec8fa8" opacity=".45"/><circle cx="51" cy="38" r="3" fill="#ec8fa8" opacity=".45"/></svg>`,
  };
  const RIVAIS = {
    aprendiz: { nome: 'Biscoito', desc: 'um gatinho que joga por diversão', falas: {
      inicio: ['Miau! Vamos brincar?', 'Trouxe biscoitos. Bora jogar?'],
      meuDisparo: ['Prrr, que bonito!', 'Olha a minha corrente!'], minhaRuptura: ['Ops, derrubei tudo…', 'Miau… escorregou.'],
      seuDisparoGrande: ['Uau, que corrente!', 'Você é bom nisso!'], armadilha: ['Hihi, te peguei!'], caiu: ['Ei! Isso foi esperto.'],
      venci: ['Ganhei! Quer um biscoito?'], perdi: ['Boa partida! Mais uma?'] } },
    esperto: { nome: 'Dona Coruja', desc: 'joga com calma e lê a Mesa', falas: {
      inicio: ['Boa noite, querido. Chá?', 'Sente-se. Vamos com calma.'],
      meuDisparo: ['Huu-huu, paciência rende.', 'Uma corrente bem tecida.'], minhaRuptura: ['Ora, ora… acontece.', 'Hum. Me distraí com o chá.'],
      seuDisparoGrande: ['Bela jogada!', 'Assim se faz.'], armadilha: ['Uma coruja nunca esquece um dado.', 'Eu avisei que estava armada.'], caiu: ['Muito bem lido.'],
      venci: ['Foi por pouco. Outra rodada?'], perdi: ['Muito bem! Estou orgulhosa.'] } },
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
  const salvar = () => { try { localStorage.setItem('diceduel.v1', JSON.stringify({ cfg: st.cfg, pref: st.pref, rec: st.rec, conta: st.contaConvidado || st.conta, decks: st.decks, deckVisto: st.deckVisto })); } catch (e) {} };
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
    Object.assign(jogo, { alvo: null, ajusteIdx: null, confirma: null, destaque: null, pensando: false, token: Math.random(), fala: null, humor: null, intro: false });
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
  function podeUsar(p, c) { return jogo.pensando ? { ok: false, motivo: 'Só na sua vez.' } : R.podeUsar(jogo, p, c); }
  function depois(r) {
    marcarNovos();
    if (r === 'proximo' || r === 'fim') { jogo.confirma = null; jogo.alvo = null; jogo.ajusteIdx = null; }
    if (jogo.fase === 'fim') { aoFim(); return 'fim'; }
    render();
    if (r === 'proximo') talvezAutomato();
    return r;
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
      const xp = R.ganharXp(c, R.xpDaPartida(p === 0, j.momentos.filter(m => m.p === 0).length));
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
    const alternativas = mesa.some(d => d.id !== marcado && seguro(p, d.v));
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
    const j = jogo, eu = j.cor[p], ele = j.cor[1 - p], m = j.mesa, usa = [], pronta = c => j.cartas[p][c] === 'pronta';
    if (j.nivel === 'aprendiz') {
      if (Math.random() > 0.2) return usa;
      const cs = j.decks[p].filter(c => pronta(c) && podeUsar(p, c).ok && c !== 'sobrecarga');
      if (!cs.length) return usa;
      return [{ carta: sorteia(cs), idx: Math.floor(Math.random() * m.length), delta: Math.random() < .5 ? 1 : -1 }];
    }
    let precisa = eu.length >= 2 && !m.some(d => encaixaP(p, d.v));
    if (precisa && pronta('virar')) { const i = m.findIndex(d => encaixa(eu, 7 - d.v)); if (i >= 0) { usa.push({ carta: 'virar', idx: i }); precisa = false; } }
    if (precisa && pronta('ajuste')) {
      for (let i = 0; i < m.length && precisa; i++) for (const dl of [1, -1]) {
        const x = m[i].v + dl; if (x >= 1 && x <= 6 && encaixa(eu, x)) { usa.push({ carta: 'ajuste', idx: i, delta: dl }); precisa = false; break; }
      }
    }
    if (precisa && pronta('coringa')) { usa.push({ carta: 'coringa' }); precisa = false; }
    if (precisa && pronta('rerrolar')) { usa.push({ carta: 'rerrolar' }); precisa = false; }
    if (ele.length >= 4 && m.length >= 2 && !usa.length) {
      const so = m.map((d, i) => i).filter(i => encaixa(ele, m[i].v));
      if (so.length === 1) {
        const i = so[0];
        if (pronta('virar') && !encaixa(ele, 7 - m[i].v)) usa.push({ carta: 'virar', idx: i });
        else if (pronta('rerrolar')) usa.push({ carta: 'rerrolar' });
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
    if (pronta('pressa') && eu.length >= 2 && m.length >= 2 && !usa.some(u => u.carta === 'rerrolar')) {
      const ok = m.some((a, i) => encaixaP(p, a.v) && m.some((b, k) => k !== i && encaixa(eu.concat(a.v), b.v)));
      if (ok) usa.push({ carta: 'pressa' });
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
        if (j.cartas[p][u.carta] !== 'pronta' || (CARTAS[u.carta].alvo && !j.mesa[u.idx])) continue;
        usarCarta(p, u.carta, u.idx, u.delta || 1); render();
        await espera(1000); if (tok !== jogo.token) return;
      }
      for (;;) {
        const plano = automatoEscolhe(p);
        j.destaque = j.mesa[plano.idx].id; render();
        await espera(520); if (tok !== jogo.token) return;
        j.destaque = null; j.pensando = false;
        const v = tirar(p, plano.idx);
        const res = colocar(p, v, automatoDestino(p, v, plano.modo));
        if (res === 'extra') { j.pensando = true; render(); await espera(520); if (tok !== jogo.token) return; continue; }
        if (res !== 'decidir') return;
        break;
      }
      j.pensando = true; render();
    }
    await espera(650); if (tok !== jogo.token) return;
    j.pensando = false;
    if (automatoDispara(p)) {
      if (j.cartas[p].sobrecarga === 'pronta' && j.cor[p].length >= 4 && j.nivel === 'esperto') { usarCarta(p, 'sobrecarga'); render(); await espera(700); if (tok !== jogo.token) return; }
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
  function clicarDado(idx) {
    const j = jogo;
    if (!j || !humano(j.vez) || j.pensando) return;
    const d = j.mesa[idx]; if (!d) return;
    const p = j.vez;
    if (j.fase === 'alvo') {
      const c = j.alvo;
      if (c === 'ajuste') { j.ajusteIdx = idx; j.fase = 'ajuste'; render(); return; }
      j.alvo = null; j.fase = 'pegar';
      usarCarta(p, c, idx); render(); return;
    }
    if (j.fase !== 'pegar') return;
    const algumSeguro = j.mesa.some(x => seguro(p, x.v));
    const proprioEspelho = j.marca && j.marca.id === d.id && j.marca.dono === p;
    if (((!seguro(p, d.v) && algumSeguro) || proprioEspelho) && j.confirma !== d.id) { j.confirma = d.id; render(); return; }
    j.confirma = null;
    if (online()) { Online.enviar({ tipo: 'pegar', idx }); return; }
    const r = R.pegar(j, p, idx);
    if (r === 'destino') { render(); return; }
    depois(r);
  }

  function abrirCarta(p, c) {
    const j = jogo, k = CARTAS[c], pu = podeUsar(p, c);
    const meu = (j.modo !== 'local' && p === 0) || (j.modo === 'local' && j.vez === p);
    let e = j.cartas[p][c];
    if (!meu && e === 'armada' && c !== 'espelho') e = 'pronta';
    document.getElementById('cartaDetalhe').innerHTML = `${k.ico}<div><h2 id="cartaTitulo">${k.nome}</h2>
      <p class="nota">${k.tipo === 'armadilha' ? 'Armadilha' : 'Efeito'}${k.pontos ? ' · carta de pontos ⚡' : ''} · ${e}</p><p style="margin-top:8px">${k.texto}</p></div>`;
    const visivel = humano(p) && j.vez === p;
    document.getElementById('cartaNota').textContent = !visivel ? 'O deck do rival fica à mostra; as armadilhas armadas, não.' : pu.ok ? '' : (pu.motivo || '');
    const rot = k.alvo ? 'Escolher o dado' : k.tipo === 'armadilha' ? 'Armar' : 'Usar';
    document.getElementById('cartaBotoes').innerHTML =
      (visivel && e === 'pronta' ? `<button class="btn btn-mel" data-usar="${c}" ${pu.ok ? '' : 'disabled'}>${rot}</button>` : '') +
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
  const iconeSVG = id => `<svg class="avatar" viewBox="0 0 64 64" aria-hidden="true">${(ICONES[id] || ICONES.bolinha).svg}</svg>`;
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
      html += `<button class="carta ${k.tipo} ${e}" data-carta="${c}" data-dono="${p}" aria-label="${k.nome}: ${e}">${k.ico}<span class="cnome">${k.nome}</span>${raio}${e === 'armada' ? '<small>armada</small>' : ''}</button>`;
    }
    let estados = '';
    if (j.armada[p] && j.armada[p] !== 'espelho' && !meu) estados += `<span class="efeito-ativo" style="background:var(--tinta);color:var(--papel)">? armadilha armada</span>`;
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
    const avatar = j.modo === 'bot' && p === 1 ? AVATAR[j.nivel].replace('class="avatar"', `class="avatar ${j.humor || ''}"`) : p === 0 ? iconeSVG(st.conta.icone) : online() ? iconeSVG(j.perfis[1].icone) : '';
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
    const ativo = humano(j.vez) && ['pegar', 'alvo'].includes(j.fase) && !j.pensando && !j.intro;
    const dicas = st.pref.dicas;
    return j.mesa.map((d, i) => {
      const r = eu.length ? rels(frente(eu), d.v) : [];
      const cabe = encaixaP(p, d.v), salvo = seguro(p, d.v);
      const marcado = j.marca && j.marca.id === d.id ? j.marca.dono : null;
      let tags = '';
      if (j.fase === 'alvo' && humano(j.vez)) {
        // prévia do efeito antes de confirmar
        tags = j.alvo === 'virar' ? `<span class="tag previa">vira ${7 - d.v}</span>` : j.alvo === 'ajuste' ? `<span class="tag previa">${d.v > 1 ? d.v - 1 : ''}${d.v > 1 && d.v < 6 ? ' ou ' : ''}${d.v < 6 ? d.v + 1 : ''}</span>` : `<span class="tag previa">marcar</span>`;
      } else if (j.fase !== 'fim' && j.fase !== 'ajuste') {
        if (j.confirma === d.id) tags = `<span class="tag rompe">Toque de novo</span>`;
        else if (!dicas) tags = '';
        else if (!eu.length) tags = `<span class="tag inicio">Começa</span>`;
        else if (r.length) tags = `<span class="tag ${r.length > 1 ? 'duplo' : 'r-' + r[0]}">${r.map(k => `<span class="tnome">${REL[k].simb}</span><span class="tnome curta"> ${REL[k].nome}</span>`).join(' ')}</span>`;
        else if (cabe) tags = `<span class="tag r-coringa">★<span class="tnome curta"> Coringa</span></span>`;
        else if (salvo) tags = `<span class="tag inicio">Bolso</span>`;
        else tags = `<span class="tag rompe">✕<span class="tnome curta"> Rompe</span></span>`;
      }
      if (j.fase === 'ajuste' && j.ajusteIdx === i) tags = `<span class="tag previa">ajustar</span>`;
      const serveRival = dicas && ele.length && encaixa(ele, d.v) && j.fase !== 'fim';
      const cls = ['pega', d.novo ? 'novo' : '', !salvo && j.fase === 'pegar' && dicas ? 'nao-cabe' : '', j.confirma === d.id || (j.fase === 'ajuste' && j.ajusteIdx === i) ? 'armado' : '', j.destaque === d.id ? 'destaque' : '', j.virando === d.id ? 'virando' : ''].join(' ');
      const rotulo = `${j.fase === 'alvo' ? 'Escolher' : 'Pegar'} ${d.v}${cabe ? (r.length ? ', ' + r.map(k => REL[k].nome).join(' e ') : '') : salvo ? ', só pelo Bolso' : ', rompe a corrente'}${serveRival ? ', serve ao rival' : ''}${marcado !== null ? ', marcado com Espelho' : ''}`;
      return `<button class="${cls}" data-i="${i}" data-id="${d.id}" ${ativo ? '' : 'disabled'} aria-label="${rotulo}">
        <span class="kbd">${i + 1}</span><span class="face">${dadoHTML(d.v, skinMesa())}${serveRival ? '<span class="alvo-rival"></span>' : ''}${marcado !== null ? `<span class="marca-esp dono${marcado}" title="Marcado com Espelho">${CARTAS.espelho.ico}</span>` : ''}</span><span class="tags">${tags}</span></button>`;
    }).join('');
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
      const k = CARTAS[j.alvo];
      const txt = { espelho: 'Toque no dado que vai receber a marca do <b>Espelho</b>.', virar: 'Toque no dado que vai <b>virar</b>. A etiqueta mostra como ele fica.', ajuste: 'Toque no dado que vai receber o <b>Ajuste</b>.' }[j.alvo];
      return `<div class="status">${txt}</div><div class="botoes"><button class="btn btn-papel" data-acao="cancelar-alvo">Cancelar (${k.nome} volta para a mão)</button></div>`;
    }
    if (j.fase === 'ajuste') {
      const d = j.mesa[j.ajusteIdx];
      return `<div class="status">Ajuste no ${mini(d.v, skinMesa())} <b>${d.v}</b>:</div><div class="botoes">
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
    const sobreBtn = j.cartas[p].sobrecarga === 'pronta' && !j.sobre[p] && eu.length >= 4 ? `<button class="btn btn-duplo btn-papel" data-acao="sobrecarga"><span>Sobrecarga</span><small>+2 neste disparo</small></button>` : '';
    if (j.fase === 'decidir') {
      const L = eu.length, rk = risco(p), vale = pontos(L) + (j.sobre[p] && L >= 4 ? 2 : 0);
      let nivel, txt;
      if (j.pts[p] + vale >= j.meta) { nivel = 'vence'; txt = `Disparar agora vence a partida${j.armada[1 - p] && L >= 4 ? ', se a armadilha do rival não atrapalhar' : ''}.`; }
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
      if (j.armada[1 - p] && j.armada[1 - p] !== 'espelho') extra += `<div class="risco aviso"><span>${n[1 - p]} tem uma armadilha armada (${j.decks[1 - p].filter(c => CARTAS[c].tipo === 'armadilha' && c !== 'espelho' && !['usada', 'perdida'].includes(j.cartas[1 - p][c])).map(c => CARTAS[c].nome).join(' ou ')}).</span></div>`;
      return `<div class="status">${quem}: corrente de <b>${L}</b>. Disparar ou segurar?</div>
        <div class="risco ${nivel}"><span>${txt}</span></div>${extra}
        <div class="botoes">
          <button class="btn btn-duplo btn-mel" data-acao="disparar"><span>Disparar</span><small>+${vale} agora</small></button>
          <button class="btn btn-duplo btn-papel" data-acao="segurar"><span>Segurar</span><small>${L + 1 <= LIM ? `com ${L + 1} vale +${pontos(L + 1)}` : 'continuar'}</small></button>
          ${sobreBtn}
        </div>`;
    }
    const algumSeguro = j.mesa.some(x => seguro(p, x.v));
    if (j.confirma) {
      const proprio = j.marca && j.marca.id === j.confirma && j.marca.dono === p;
      return `<div class="status">${proprio ? 'Esse é o dado do seu <b>Espelho</b>: pegá-lo desperdiça a armadilha.' : `Esse dado não sincroniza e o Bolso não salva: sua corrente de <b>${eu.length}</b> vai romper.`} Toque nele de novo para pegar mesmo assim.</div>
        <div class="botoes"><button class="btn btn-papel" data-acao="cancelar">Cancelar</button></div>`;
    }
    let msg;
    if (j.segundoDado) msg = 'pegue o segundo dado (Pressa).';
    else if (!algumSeguro) msg = `<b>nenhum dado sincroniza</b> com o seu ${frente(eu)}, nem o do Bolso. Use uma carta ou pegue um: a corrente de ${eu.length} rompe${j.armada[p] === 'ancora' && eu.length >= 4 ? ', mas a sua Âncora está armada' : ''}.`;
    else msg = eu.length ? `pegue um dado. Sua frente é <b>${frente(eu)}</b>: sincronizam ${j.coringa[p] ? 'todos (Coringa)' : facesQueEncaixam(eu).join(', ')}.` : 'pegue um dado. Sua corrente está vazia: qualquer um começa.';
    const prontas = j.decks[p].filter(c => j.cartas[p][c] === 'pronta').length;
    return `<div class="status">${quem}, ${msg}</div>${prontas ? `<p class="nota" style="margin:0">Toque numa carta sua para usar (${prontas} ${prontas === 1 ? 'pronta' : 'prontas'}).</p>` : ''}`;
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
            if (e.n === 4) Fx.texto(alvo, 'Boa corrente!', 'pequeno');
            if (e.n === 5) Fx.texto(alvo, 'Corrente de 5!', 'pequeno');
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
          if (e.L >= 4 && humano(e.p)) Fx.texto(qs(`#pj${e.p} .corrente`), 'Ah… rompeu', 'pequeno ruim');
          break;
        }
        case 'salvo': Som.tocar('salvo'); Fx.chamada('Salvo!', e.txt, 'suave'); Fx.faiscas(qs(`#pj${e.p} .corrente`), 14, ['#cdeccf', '#fff6e6']); break;
        case 'bloqueio': Som.tocar('bloqueio'); Fx.texto(qs(`#pj${e.p} .corrente`) || null, 'Bloqueio!', 'pequeno'); break;
        case 'carta': Som.tocar('carta'); if (!humano(e.p) || j.modo === 'local') Fx.chamada(e.nome, `${n[e.p]} usou`, e.p === 1 && j.modo !== 'local' ? 'rival' : 'suave'); break;
        case 'armou': Som.tocar('armou'); if (!humano(e.p) || j.modo === 'local') Fx.texto(painelEl, e.c === 'espelho' ? 'Espelho!' : 'Armadilha armada', 'pequeno'); break;
        case 'revelou': {
          Som.tocar('revelou'); Fx.chamada(CARTAS[e.c].nome + '!', e.txt, e.p === 1 && j.modo !== 'local' ? 'rival' : '');
          Fx.faiscas(painelEl, 22, ['#e2d6ff', '#fff6e6', '#ffe3a3']); vibrar([40, 60, 40]);
          break;
        }
        case 'virar': setTimeout(() => { if (jogo.virando === e.id) jogo.virando = null; }, 500); Som.tocar('virar'); break;
        case 'chamada': Som.tocar('momento'); Fx.chamada(e.titulo, e.sub, e.tipo === 'esquiva' ? (e.p === 1 && j.modo !== 'local' ? 'rival' : '') : e.tipo); break;
        case 'falar': if (j.modo === 'bot') falaDoEvento(e); break;
        case 'fim': {
          const venceuHumano = humano(e.p);
          if (venceuHumano) { Som.tocar('vitoria'); Fx.confete(120); Fx.chamada(e.virada ? 'Virada!' : j.modo !== 'local' ? 'Vitória!' : `${n[e.p]} venceu!`, e.virada ? 'que volta por cima' : 'que partida gostosa'); }
          else { Som.tocar('derrota'); Fx.chamada('Quase!', `${n[e.p]} venceu desta vez`, 'rival'); }
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
      const av = j.modo === 'bot' && p === 1 ? AVATAR[j.nivel] : p === 0 ? iconeSVG(st.conta.icone) : iconeSVG(online() ? j.perfis[1].icone : 'sapo');
      const deck = j.decks[p].map(c => `<span class="carta ${CARTAS[c].tipo}">${CARTAS[c].ico}${CARTAS[c].nome}</span>`).join('') || '<span class="nota">sem cartas</span>';
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
    const momentos = [...grupos.values()].sort((a, b) => ordemSimb.indexOf(a.simbolo) - ordemSimb.indexOf(b.simbolo)).slice(0, 6)
      .map(m => `<li><span class="em">${m.simbolo}</span><span>${j.modo === 'local' ? `<span class="cor${m.p}">${n[m.p]}</span> ` : ''}${m.txt}${m.vezes > 1 ? ` <b>×${m.vezes}</b>` : ''}</span></li>`).join('');
    const recs = (j.recordes || []).map(r => `<li class="recorde"><span class="em">✪</span>Novo: ${r}</li>`).join('');
    document.getElementById('fimMomentos').innerHTML = recs + (momentos || '<li><span class="em">☕</span>Partida tranquila. A próxima corrente vem.</li>');
    desenharRecompensas(j);
    const s = j.stats, linha = (rot, f) => `<tr><th>${rot}</th><td>${f(s[0], 0)}</td><td>${f(s[1], 1)}</td></tr>`;
    document.getElementById('fimTabela').innerHTML =
      `<tr><th></th><th class="cor0">${n[0]}</th><th class="cor1">${n[1]}</th></tr>` +
      linha('Deck', (x, p) => j.decks[p].map(c => CARTAS[c].nome).join(', ') || '–') +
      linha('Cartas que agiram', x => x.cartas.join(', ') || '–') +
      linha('Disparos', x => x.disp) + linha('Maior corrente', x => x.maior || '–') + linha('Rupturas', x => x.rupt) +
      linha('Bolso (guardou · trocou)', x => `${x.guardou} · ${x.trocou}`);
    document.getElementById('fimTexto').value =
      `Dice Duel v0.8 · ${j.modo === 'bot' ? 'contra ' + n[1] : online() ? 'online contra ' + n[1] : '2 jogadores'} · meta ${j.meta}${j.premio ? ` · moedas +${j.premio.moedas ? j.premio.moedas.total : 0} · rating ${j.premio.ratingAntes}→${j.premio.rating}` : ''}\n` +
      `${n[0]} ${j.pts[0]} × ${j.pts[1]} ${n[1]} · ${j.compras} dados pegos · ${j.rodada} rodadas\n` +
      [0, 1].map(k => `${n[k]} [${j.decks[k].map(c => CARTAS[c].nome).join(', ') || 'sem cartas'}]: ${s[k].disp} disparos, maior ${s[k].maior}, ${s[k].rupt} rupturas, Bolso ${s[k].guardou}/${s[k].trocou}, cartas que agiram: ${s[k].cartas.join(', ') || 'nenhuma'}`).join('\n') +
      `\nComentário: `;
    document.getElementById('btnDeNovo').textContent = online() ? 'Revanche' : 'Jogar de novo';
    document.getElementById('fim').hidden = false;
    document.getElementById('btnDeNovo').focus();
  }

  const fmt = x => String(x).replace('.', ',');
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
        <tr><td>Biscoito (iniciante)</td><td>${BASE_MOEDAS.aprendiz}</td><td>rating abaixo de ${TETO_MOEDAS.aprendiz}</td></tr>
        <tr><td>Dona Coruja (avançado)</td><td>${BASE_MOEDAS.esperto}</td><td>rating abaixo de ${TETO_MOEDAS.esperto}</td></tr>
        <tr><td>Online, com amigos</td><td>${BASE_MOEDAS.online}</td><td>sempre; vale mais vencer quem tem rating maior</td></tr>
        <tr><td>A dois no aparelho</td><td>–</td><td>não paga</td></tr></table>
        <p class="nota" style="margin-top:10px">Só vitórias dão moedas. A base é multiplicada pela <b>margem</b> (×1 a ×2: vencer por 8 pontos ou mais, na meta 12, dobra) e pela <b>rapidez</b> (×1,5 em até 5 Mesas, ×1,25 em 6). Uma vitória típica rende cerca de 14 contra o Biscoito e 24 contra a Dona Coruja. Com conta, as vitórias contra os rivais do jogo rendem até 300 moedas por dia.</p>
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
    if (aba === 'cartas') html = ORDEM.map(id => item('cartas', id, { nome: CARTAS[id].nome, preco: PRECO_CARTA[id] || 0 }, CARTAS[id].ico, `${CARTAS[id].tipo}${CARTAS[id].pontos ? ' · ⚡' : ''} · ${CARTAS[id].verbo}`)).join('');
    if (aba === 'dados') html = Object.entries(DADOS).map(([id, d]) => item('dados', id, d, `<span style="width:52px;height:52px;display:block">${dadoHTML(5, id)}</span>`, d.desc)).join('');
    if (aba === 'icones') html = Object.entries(ICONES).map(([id, d]) => item('icones', id, d, iconeSVG(id), d.nivel ? `presente do nível ${d.nivel}` : 'seu rosto na mesa')).join('');
    if (aba === 'mesas') html = Object.entries(MESAS).map(([id, d]) => item('mesas', id, d, `<span class="amostra-mesa" style="background:${d.amostra}"></span>`, d.nivel ? `presente do nível ${d.nivel}` : 'o feltro da sua mesa')).join('');
    alvo.innerHTML = `<div class="itens">${html}</div>${aba === 'cartas' ? '<p class="nota" style="margin-top:10px">As cartas à venda são situacionais: dão jeitos novos de jogar, não mais força. Na simulação, nenhum deck com carta comprada supera o melhor deck de cartas grátis.</p>' : '<p class="nota" style="margin-top:10px">Só aparência. Na versão final, alguns cosméticos também poderão ser comprados com dinheiro; cartas, nunca.</p>'}`;
  }
  function comprar(tipo, id, botao) {
    const c = st.conta;
    const info = tipo === 'cartas' ? { preco: PRECO_CARTA[id] } : ({ dados: DADOS, icones: ICONES, mesas: MESAS })[tipo][id];
    if (!info || c[tipo].includes(id) || c.moedas < info.preco) return;
    if (botao.dataset.certeza !== '1') { botao.dataset.certeza = '1'; botao.innerHTML = `Confirmar? <span class="moeda"></span>${info.preco}`; return; }
    const festa = () => { if (jogo) render(); Som.tocar('compra'); Fx.confete(60); Fx.chamada('Novo!', `${nomeItem(tipo, id)} é seu`, 'suave'); };
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
  function abrirDeck() {
    const local = st.cfg.modo === 'local';
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
    document.getElementById('deckContador').innerHTML = `<b>${d.length}/3</b> cartas · ${nt}/2 armadilhas · ${np}/1 de pontos ⚡${d.length ? ' · ' + d.map(c => CARTAS[c].nome).join(', ') : ''}`;
    document.getElementById('deckProntos').innerHTML = PRONTOS.filter(k => k.cartas.every(disponivel)).map(k => `<button data-pronto="${PRONTOS.indexOf(k)}">${k.nome} <small>${k.cartas.map(c => CARTAS[c].nome).join(' · ')}${k.nota ? ' (' + k.nota + ')' : ''}</small></button>`).join('');
    document.getElementById('deckGrade').innerHTML = ORDEM.map(c => {
      const k = CARTAS[c], dentro = d.includes(c), trav = travada(c), aVenda = !possui(c);
      const cabe = !trav && !aVenda && (dentro || deckValido(d.concat(c)));
      const aviso = aVenda ? `<span class="cadeado"><span class="moeda"></span> ${PRECO_CARTA[c]} na Loja · toque para ver</span>` : trav ? '<span class="cadeado">Libera depois da sua 1ª partida</span>' : '';
      return `<button class="carta-op" data-op="${c}" ${aVenda ? 'data-na-loja="1"' : ''} aria-pressed="${dentro}" ${cabe || aVenda ? '' : 'disabled'}>${k.ico}<b>${k.nome}${k.pontos ? ' <span class="raio">⚡</span>' : ''}<span class="tipo">${k.tipo}</span></b><span class="txt">${k.texto}</span>${aviso}</button>`;
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
  document.getElementById('listaCartas').innerHTML = ORDEM.map(c => `<div>${CARTAS[c].ico}<span><b>${CARTAS[c].nome}${CARTAS[c].pontos ? ' ⚡' : ''}</b> <span class="nota">(${CARTAS[c].tipo})</span>. ${CARTAS[c].texto}</span></div>`).join('');

  // ---------- eventos da interface ----------
  // o áudio só pode começar depois de um toque
  addEventListener('pointerdown', () => Som.desbloquear(), { capture: true });
  addEventListener('keydown', () => Som.desbloquear(), { capture: true });
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
    const b = e.target.closest('[data-usar]'); if (!b || b.disabled) return;
    const j = jogo, p = j.vez, c = b.dataset.usar;
    if (!podeUsar(p, c).ok) return;
    document.getElementById('janelaCarta').hidden = true;
    if (CARTAS[c].alvo) { j.fase = 'alvo'; j.alvo = c; j.confirma = null; }
    else usarCarta(p, c);
    render();
  });
  document.getElementById('acoes').addEventListener('click', e => {
    const j = jogo;
    const dst = e.target.closest('[data-destino]');
    if (dst && j.fase === 'destino' && j.mao && humano(j.vez)) { colocar(j.vez, j.mao.v, dst.dataset.destino); return; }
    const aj = e.target.closest('[data-ajuste]');
    if (aj && j.fase === 'ajuste') { const idx = j.ajusteIdx; j.fase = 'pegar'; j.alvo = null; j.ajusteIdx = null; usarCarta(j.vez, 'ajuste', idx, +aj.dataset.ajuste); render(); return; }
    const b = e.target.closest('[data-acao]'); if (!b) return;
    const a = b.dataset.acao;
    if (a === 'nova') return novaPartida();
    if (a === 'deck') return abrirDeck();
    if (a === 'cancelar') { j.confirma = null; return render(); }
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
  document.getElementById('btnJogarDeck').addEventListener('click', () => { st.deckVisto = true; salvar(); novaPartida(); });
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
  document.getElementById('btnCopiar').addEventListener('click', async () => {
    const t = document.getElementById('fimTexto'), b = document.getElementById('btnCopiar');
    try { await navigator.clipboard.writeText(t.value); b.textContent = 'Copiado'; }
    catch (e) { t.focus(); t.select(); b.textContent = 'Selecionado: copie com Ctrl+C'; }
    setTimeout(() => { b.textContent = 'Copiar resumo'; }, 2200);
  });
  document.addEventListener('keydown', e => {
    if (!jogo || e.target.closest('textarea, input') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Escape') {
      ['fim', 'janelaCarta', 'janelaDeck', 'janelaConfig', 'janelaLoja'].forEach(id => { document.getElementById(id).hidden = true; }); abrirLado(false);
      if (jogo.confirma) jogo.confirma = null;
      if (jogo.fase === 'alvo' || jogo.fase === 'ajuste') { jogo.fase = 'pegar'; jogo.alvo = null; jogo.ajusteIdx = null; }
      render(); return;
    }
    if (['janelaCarta', 'janelaDeck', 'janelaConfig', 'janelaLoja'].some(id => !document.getElementById(id).hidden)) return;
    if (/^[1-5]$/.test(e.key)) { clicarDado(+e.key - 1); return; }
    const k = e.key.toLowerCase();
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
  // o jogo e a API moram no mesmo endereço (o servidor serve a página); por file:// não há online
  const API = /^https?:$/.test(location.protocol) ? location.origin : null;
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
  // partidas contra os rivais do jogo, com conta: o servidor confere o teto e paga (o aparelho só mostra antes)
  Conta.relatarSolo = async j => {
    if (!st.sessao) return;
    const antes = j.premio && j.premio.moedas ? j.premio.moedas.total : 0;
    try {
      const r = await pedir('POST', '/api/solo', { nivel: j.nivel, venceu: j.vencedor === 0, margem: Math.max(0, j.pts[0] - j.pts[1]), rodadas: j.rodada, meta: +j.meta, momentos: j.momentos.filter(m => m.p === 0).length });
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
        if (!Rede.ola) falha(new Error('Sem conexão com o servidor.'));
        Rede.ola = false;
        if (Rede.sala) reconectar();
      };
    });
  }
  function reconectar() {
    if (Rede.tentativas >= 6) { aviso('A conexão caiu. Abra o Online para tentar de novo.', true); return; }
    const ms = Math.min(8000, 800 * 2 ** Rede.tentativas++);
    aviso('Reconectando…');
    setTimeout(() => {
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
      if (online() && jogo.sala === Rede.sala) { Rede.pediuRevanche = false; render(); Fx.chamada('Ops', m.erro, 'suave'); return; }
      Rede.sala = null; Rede.infoSala = null;
      aviso(m.erro, true); abrirOnline();
    }
  }
  function receberEstado(v) {
    const antes = jogo;
    const nova = !antes || antes.modo !== 'online' || antes.sala !== v.sala || antes.partida !== v.partida;
    const virou = v.eventos.find(e => e.tipo === 'virar');
    Object.assign(v, { alvo: null, ajusteIdx: null, confirma: null, destaque: null, pensando: false, token: Math.random(), fala: null, humor: null, intro: false, virando: virou ? virou.id : null });
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
    if (!jogo || !online() || !jogo.prazoAte || jogo.fase === 'fim') return;
    const s = Math.max(0, Math.ceil((jogo.prazoAte - Date.now()) / 1000)), el = document.getElementById('mesaInfo');
    if (s <= 30) el.innerHTML = `<span class="prazo">${jogo.vez === 0 ? 'sua vez' : 'vez do rival'}: ${s} s</span>`;
  }, 1000);

  // a janela Online
  const carregarRanking = () => { if (st.sessao && !Rede.sala) pedir('GET', '/api/ranking').then(r => { Rede.ranking = r.ranking; desenharOnline(); }).catch(() => {}); };
  function abrirOnline() {
    desenharOnline();
    document.getElementById('janelaOnline').hidden = false;
    carregarRanking();
    const f = document.querySelector('#onlineConteudo input, #onlineConteudo .btn-mel');
    if (f) f.focus();
  }
  const esc = t => String(t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const linkDaSala = c => `${API}/?sala=${c}`;
  function desenharOnline() {
    document.getElementById('pontoOnline').hidden = !st.sessao;
    const el = document.getElementById('onlineConteudo');
    document.getElementById('onlineServidor').textContent = st.sessao ? (Rede.ola ? 'conectado' : '') : '';
    if (!API) {
      el.innerHTML = `<p>O online precisa do servidor do Dice Duel. Abra o jogo pelo endereço do servidor (por exemplo, o da Railway) para criar conta, chamar amigos e entrar no ranking.</p><p class="nota">Aqui, neste arquivo, dá para jogar contra o Biscoito, a Dona Coruja ou a dois no mesmo aparelho.</p>`;
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
  if (st.sessao && API) pedir('GET', '/api/eu').then(r => { st.sessao.token = r.token; usarPerfil(r.conta); }).catch(() => {});

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
      // primeira visita: o deck "Primeira mesa" e o Biscoito; as armadilhas chegam depois da 1ª partida
      st.decks[0] = PRONTOS[0].cartas.slice(); st.cfg.nivel = 'aprendiz';
      const animar = st.pref.animacoes; st.pref.animacoes = false; novaPartida(); st.pref.animacoes = animar;
      abrirDeck();
    } else novaPartida();
    if (Rede.convite) { abrirOnline(); if (st.sessao) { const c = Rede.convite; Rede.convite = null; entrarNaSala(c).then(abrirOnline); } }
  }
  // o roteiro de teste automático (tools/) pode ler o estado
  window.DiceDuel = { get jogo() { return jogo; }, st, ajustar(p) { Object.assign(st.pref, p); aplicarPrefs(); if (jogo) render(); } };
  window.claude?.hot?.ready ? window.claude.hot.ready(iniciar) : iniciar(window.claude?.hot?.data ?? {});
})();
