/* Dice Duel · o jogo
 * Regras (v0.6): Mesa compartilhada de 5 dados, corrente que só cresce pela frente,
 * sincronias Eco (=), Passo (±1) e Oposto (soma 7), Bolso de um dado, quem está atrás abre a Mesa,
 * deck de até 3 cartas (no máx. 2 armadilhas e 1 carta de pontos ⚡). Números medidos em simulação (sim/).
 * A lógica nunca espera animação: ela só enfileira eventos, e o desenho, o som e os efeitos os consomem.
 */
(function () {
  'use strict';
  // ---------- regras ----------
  const PONTOS = { 3: 1, 4: 2, 5: 4, 6: 6 };
  const LIM = 6, NA_MESA = 5;
  const REL = {
    eco:    { nome: 'Eco',    simb: '=' },
    passo:  { nome: 'Passo',  simb: '±1' },
    oposto: { nome: 'Oposto', simb: '7' },
  };
  const svg = d => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const CARTAS = {
    ajuste:        { nome: 'Ajuste', tipo: 'efeito', alvo: true, verbo: '±1 num dado', texto: 'Some ou tire 1 de um dado da Mesa.',
                     ico: svg('<path d="M12 4v7M8.5 7.5h7M8.5 17h7"/><rect x="3" y="3" width="18" height="18" rx="4"/>') },
    virar:         { nome: 'Virar', tipo: 'efeito', alvo: true, verbo: 'vira um dado', texto: 'Vire um dado da Mesa para a face oposta (7 − valor). Desfaz a marca de um Espelho.',
                     ico: svg('<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4"/>') },
    rerrolar:      { nome: 'Rerrolar', tipo: 'efeito', verbo: 'rola a Mesa', texto: 'Role de novo todos os dados da Mesa. Desfaz a marca de um Espelho.',
                     ico: svg('<path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4"/><circle cx="12" cy="12" r="1.5"/>') },
    pressa:        { nome: 'Pressa', tipo: 'efeito', verbo: 'pega 2 dados', texto: 'Nesta vez você pega dois dados, um depois do outro.',
                     ico: svg('<path d="M5 6l6 6-6 6M13 6l6 6-6 6"/>') },
    coringa:       { nome: 'Coringa', tipo: 'efeito', verbo: 'próximo dado entra', texto: 'O próximo dado que entra na sua corrente sincroniza com qualquer frente.',
                     ico: svg('<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.8 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>') },
    sobrecarga:    { nome: 'Sobrecarga', tipo: 'efeito', pontos: true, verbo: '+2 no disparo', texto: 'Seu próximo disparo de 4 dados ou mais vale +2. Pode ser usada também na hora de decidir.',
                     ico: svg('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>') },
    espelho:       { nome: 'Espelho', tipo: 'armadilha', alvo: true, verbo: 'marca um dado', texto: 'Marque um dado da Mesa (a marca fica à vista). Se o rival pegá-lo, ele vira 7 − valor e não pode ir para o Bolso.',
                     ico: svg('<ellipse cx="12" cy="9" rx="6" ry="7"/><path d="M12 16v5M8.5 21h7M9.5 6.5l4 4M10 11l2 2"/>') },
    fundo:         { nome: 'Fundo Falso', tipo: 'armadilha', verbo: 'o Bolso dele cai', texto: 'Na próxima vez que o rival usar o Bolso, o dado cai. Na troca, os dois caem.',
                     ico: svg('<path d="M4 4h16M4 4v9M20 4v9M4 13l3 7M20 13l-3 7M9 9h6"/>') },
    ancora:        { nome: 'Âncora', tipo: 'armadilha', verbo: 'salva sua corrente', texto: 'A próxima ruptura de uma corrente sua com 4 dados ou mais não acontece: o dado ruim é descartado.',
                     ico: svg('<circle cx="12" cy="5" r="2"/><path d="M12 7v14M8 11h8M4.5 14.5c.5 3.8 3.8 6.5 7.5 6.5s7-2.7 7.5-6.5"/>') },
    interferencia: { nome: 'Interferência', tipo: 'armadilha', pontos: true, verbo: '−1 no disparo dele', texto: 'O próximo disparo do rival com 4 dados ou mais vale 1 ponto a menos.',
                     ico: svg('<path d="M2 12h3l2-5 3 10 3-13 3 13 2-5h4"/>') },
    pedagio:       { nome: 'Pedágio', tipo: 'armadilha', pontos: true, verbo: '+3 quando ele dispara', texto: 'No próximo disparo do rival, você ganha 3 pontos.',
                     ico: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M14.5 9.5h-3.5a1.5 1.5 0 0 0 0 3h2a1.5 1.5 0 0 1 0 3H9.5"/>') },
  };
  const ORDEM = ['ajuste', 'virar', 'rerrolar', 'pressa', 'coringa', 'sobrecarga', 'espelho', 'fundo', 'ancora', 'interferencia', 'pedagio'];
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
  const deckValido = d => d.length <= 3 && d.filter(c => CARTAS[c].tipo === 'armadilha').length <= 2 && d.filter(c => CARTAS[c].pontos).length <= 1;

  // ---------- progressão (docs/progressao.md) ----------
  // Cartas grátis vs. à venda: o melhor deck só com cartas grátis vence 60,8% contra o campo; nenhum dos 113 decks
  // com carta comprada passa dele (sim/economia.py). Comprar dá variedade e estilo, não força.
  const GRATIS = ['ajuste', 'virar', 'pressa', 'coringa', 'ancora', 'interferencia'];
  const PRECO_CARTA = { rerrolar: 90, espelho: 110, sobrecarga: 120, fundo: 140, pedagio: 140 };
  const DADOS = {
    marfim:   { nome: 'Marfim', preco: 0, desc: 'o clássico da mesa' },
    madeira:  { nome: 'Madeira', preco: 80, desc: 'cheirinho de marcenaria' },
    rosa:     { nome: 'Rosa', preco: 120, desc: 'doce como algodão-doce' },
    menta:    { nome: 'Menta', preco: 0, nivel: 3, desc: 'presente do nível 3' },
    pelucia:  { nome: 'Pelúcia', preco: 220, desc: 'fofinho e redondinho' },
    dourado:  { nome: 'Dourado', preco: 450, desc: 'reluz na mesa' },
    diamante: { nome: 'Diamante', preco: 800, desc: 'para quem tem paciência' },
  };
  const ICONES = {
    bolinha:  { nome: 'Bolinha', preco: 0, svg: `<circle cx="32" cy="34" r="22" fill="#6fbfd3" stroke="#3a2a2e" stroke-width="2.5"/><circle class="olho" cx="25" cy="32" r="3" fill="#3a2a2e"/><circle class="olho" cx="39" cy="32" r="3" fill="#3a2a2e"/><path d="M26 41 q6 5 12 0" stroke="#3a2a2e" stroke-width="2.5" fill="none" stroke-linecap="round"/>` },
    xicara:   { nome: 'Xícara', preco: 0, nivel: 2, svg: `<path d="M26 14c-3-3 3-5 0-8M34 14c-3-3 3-5 0-8" stroke="#ecdcc8" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M12 22h34v10a14 14 0 0 1-14 14h-6A14 14 0 0 1 12 32z" fill="#f1dfc2" stroke="#3a2a2e" stroke-width="2.5"/><path d="M46 26h3a6 6 0 0 1 0 12h-4" fill="none" stroke="#3a2a2e" stroke-width="2.5"/><circle class="olho" cx="23" cy="31" r="2.4" fill="#3a2a2e"/><circle class="olho" cx="35" cy="31" r="2.4" fill="#3a2a2e"/><path d="M26 37 q3 3 6 0" stroke="#3a2a2e" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="19" cy="36" r="2.4" fill="#ec8fa8" opacity=".6"/><circle cx="39" cy="36" r="2.4" fill="#ec8fa8" opacity=".6"/>` },
    raposa:   { nome: 'Raposa', preco: 100, svg: `<path d="M10 14 L22 26 L14 34 Z M54 14 L42 26 L50 34 Z" fill="#e8874f" stroke="#3a2a2e" stroke-width="2.5" stroke-linejoin="round"/><path d="M12 30 Q32 6 52 30 Q50 48 32 56 Q14 48 12 30 Z" fill="#e8874f" stroke="#3a2a2e" stroke-width="2.5"/><path d="M18 38 Q32 44 46 38 Q42 52 32 56 Q22 52 18 38 Z" fill="#fff3e2"/><circle class="olho" cx="24" cy="34" r="2.6" fill="#3a2a2e"/><circle class="olho" cx="40" cy="34" r="2.6" fill="#3a2a2e"/><circle cx="32" cy="45" r="2.6" fill="#3a2a2e"/>` },
    sapo:     { nome: 'Sapinho', preco: 100, svg: `<ellipse cx="32" cy="40" rx="24" ry="17" fill="#8fd6a8" stroke="#3a2a2e" stroke-width="2.5"/><circle cx="20" cy="24" r="9" fill="#8fd6a8" stroke="#3a2a2e" stroke-width="2.5"/><circle cx="44" cy="24" r="9" fill="#8fd6a8" stroke="#3a2a2e" stroke-width="2.5"/><circle class="olho" cx="20" cy="24" r="4" fill="#3a2a2e"/><circle class="olho" cx="44" cy="24" r="4" fill="#3a2a2e"/><path d="M22 44 q10 7 20 0" stroke="#3a2a2e" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="16" cy="42" r="3" fill="#ec8fa8" opacity=".5"/><circle cx="48" cy="42" r="3" fill="#ec8fa8" opacity=".5"/>` },
    cogumelo: { nome: 'Cogumelo', preco: 140, svg: `<path d="M8 32 Q8 10 32 10 Q56 10 56 32 Z" fill="#e8806f" stroke="#3a2a2e" stroke-width="2.5" stroke-linejoin="round"/><circle cx="22" cy="20" r="4" fill="#fff3e2"/><circle cx="38" cy="17" r="3.5" fill="#fff3e2"/><circle cx="46" cy="27" r="3" fill="#fff3e2"/><path d="M20 32 h24 v12 a12 12 0 0 1 -24 0 z" fill="#fbf1df" stroke="#3a2a2e" stroke-width="2.5"/><circle class="olho" cx="27" cy="40" r="2.3" fill="#3a2a2e"/><circle class="olho" cx="37" cy="40" r="2.3" fill="#3a2a2e"/><path d="M29 46 q3 2.5 6 0" stroke="#3a2a2e" stroke-width="2" fill="none" stroke-linecap="round"/>` },
  };
  const MESAS = {
    salvia:     { nome: 'Feltro sálvia', preco: 0, amostra: 'linear-gradient(160deg,#5f8f78,#3b6252)' },
    vinho:      { nome: 'Feltro vinho', preco: 150, amostra: 'linear-gradient(160deg,#8f4c5b,#5a2836)' },
    noite:      { nome: 'Noite estrelada', preco: 0, nivel: 5, amostra: 'radial-gradient(circle,#fff3e2 0 1px,transparent 1.5px) 0 0/12px 12px,linear-gradient(160deg,#3d5a88,#22365a)' },
    piquenique: { nome: 'Piquenique', preco: 250, amostra: 'repeating-linear-gradient(0deg,rgba(232,128,111,.4) 0 6px,transparent 6px 12px),repeating-linear-gradient(90deg,rgba(232,128,111,.4) 0 6px,transparent 6px 12px),#fbf1df' },
  };
  const NIVEIS = [0, 60, 150, 280, 450, 700, 1000, 1400, 1900, 2500];   // XP para chegar a cada nível (1, 2, 3…)
  const PRESENTES = { 2: ['icones', 'xicara'], 3: ['dados', 'menta'], 5: ['mesas', 'noite'] };
  // rating provisório contra os rivais (o online será a referência). Cada rival só paga moedas abaixo de um teto:
  // quem já joga bem não fica farmando moeda no modo fácil.
  const RATING_RIVAL = { aprendiz: 850, esperto: 1250 };
  const TETO_MOEDAS = { aprendiz: 1050, esperto: 1400 };
  const BASE_MOEDAS = { aprendiz: 8, esperto: 14, online: 22 };
  const TITULOS = [[0, 'Aprendiz de mesa'], [1000, 'Jogador de chá'], [1150, 'Tecelão de correntes'], [1300, 'Mestre do Bolso'], [1450, 'Grão-mestre da Mesa']];
  const tituloDe = r => TITULOS.filter(t => r >= t[0]).pop()[1];
  const nivelDe = xp => NIVEIS.filter(x => xp >= x).length;
  // moedas de uma vitória: base do modo × margem (×1 a ×2) × rapidez em Mesas (×1 a ×1,5)
  function moedasDaVitoria(base, margem, mesas, meta) {
    const mm = 1 + Math.min(1, Math.max(0, margem) / (meta * 2 / 3));
    const rapida = Math.round(meta * 5 / 12), normal = Math.round(meta * 6 / 12);
    const mr = mesas <= rapida ? 1.5 : mesas <= normal ? 1.25 : 1;
    return { base, mm, mr, total: Math.round(base * mm * mr) };
  }

  const rels = (a, b) => {
    const r = [];
    if (a === b) r.push('eco');
    if (Math.abs(a - b) === 1) r.push('passo');
    if (a + b === 7) r.push('oposto');
    return r;
  };
  const sinc = (a, b) => rels(a, b).length > 0;
  const frente = cor => cor[cor.length - 1];
  const encaixa = (cor, v) => !cor.length || sinc(frente(cor), v);
  const facesQueEncaixam = cor => [1, 2, 3, 4, 5, 6].filter(f => encaixa(cor, f));
  const opcoes = cor => facesQueEncaixam(cor).length;
  const pontos = L => PONTOS[L] || 0;
  const rolar = () => 1 + Math.floor(Math.random() * 6);
  const sorteia = a => a[Math.floor(Math.random() * a.length)];
  // corrente "harmônica": todos os elos compartilham um mesmo tipo de sincronia (só enfeite, não muda pontos)
  const harmonica = cor => {
    if (cor.length < 4) return null;
    let comum = ['eco', 'passo', 'oposto'];
    for (let i = 1; i < cor.length; i++) { const r = rels(cor[i - 1], cor[i]); comum = comum.filter(t => r.includes(t)); }
    return comum[0] || null;
  };

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
  const salvar = () => { try { localStorage.setItem('diceduel.v1', JSON.stringify({ cfg: st.cfg, pref: st.pref, rec: st.rec, conta: st.conta, decks: st.decks, deckVisto: st.deckVisto })); } catch (e) {} };
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

  const nomes = () => jogo.modo === 'bot' ? ['Você', RIVAIS[jogo.nivel].nome] : ['Jogador 1', 'Jogador 2'];
  const humano = p => jogo.modo === 'local' || p === 0;
  const novoStats = () => ({ disp: 0, rupt: 0, maior: 0, maiorDisp: 0, compras: 0, guardou: 0, trocou: 0, cartas: [] });

  function novaPartida() {
    const modo = st.cfg.modo, nivel = st.cfg.nivel;
    const deckRival = modo === 'local' ? st.decks[1].slice()
      : nivel === 'esperto' ? sorteia(DECKS_CORUJA).slice() : sorteiaDeck(!armadilhasLiberadas());
    const decks = [st.decks[0].filter(disponivel), modo === 'local' ? deckRival.filter(disponivel) : deckRival];
    jogo = {
      v: 7, modo, nivel, meta: +st.cfg.meta, decks,
      cartas: decks.map(d => Object.fromEntries(d.map(c => [c, 'pronta']))),
      armada: [null, null], coringa: [false, false], sobre: [false, false], extra: [0, 0], espelhado: false,
      cor: [[], []], pts: [0, 0], mesa: [], vez: st.primeiro, fase: 'pegar', bolso: [null, null], mao: null,
      alvo: null, ajusteIdx: null, confirma: null, destaque: null, pensando: false, log: [], stats: [novoStats(), novoStats()],
      rodada: 0, compras: 0, fx: null, token: Math.random(), vencedor: null, marca: null,
      eventos: [], momentos: [], piorDiferenca: [0, 0], fala: null, humor: null, intro: false,
    };
    st.primeiro = 1 - st.primeiro;
    ['avisoCfg', 'fim', 'janelaCarta', 'janelaDeck'].forEach(id => { document.getElementById(id).hidden = true; });
    rolarMesa();
    const n = nomes();
    registrar(null, `Nova partida até ${jogo.meta} pontos. ${n[jogo.vez]} começa.`, 'sis');
    [0, 1].forEach(p => registrar(p, `trouxe ${decks[p].length ? decks[p].map(c => CARTAS[c].nome).join(', ') : 'nenhuma carta'}`, 'sis'));
    if (!decks[0].length && !decks[1].length) { const s = 1 - jogo.vez; jogo.bolso[s] = rolar(); }
    if (modo === 'bot') falar('inicio', 1);
    if (st.pref.animacoes) mostrarVersus(); else { render(); talvezAutomato(); }
  }
  function sorteiaDeck(semArmadilha) {
    const pool = ORDEM.filter(c => !semArmadilha || CARTAS[c].tipo !== 'armadilha');
    for (;;) {
      const d = pool.slice().sort(() => Math.random() - .5).slice(0, 3);
      if (deckValido(d)) return d;
    }
  }

  function rolarMesa() {
    jogo.rodada++;
    jogo.marca = null;
    jogo.mesa = Array.from({ length: NA_MESA }, () => ({ id: uid++, v: rolar(), novo: true }));
    marcarNovos();
    emitir('rolar');
  }
  function marcarNovos() {
    const ids = jogo.mesa.filter(d => d.novo).map(d => d.id);
    setTimeout(() => { if (jogo) jogo.mesa.forEach(d => { if (ids.includes(d.id)) d.novo = false; }); }, 900);
  }

  function registrar(p, txt, tipo = '') { jogo.log.unshift({ p, txt, tipo }); jogo.log.length = Math.min(jogo.log.length, 80); }
  const emitir = (tipo, dados = {}) => jogo && jogo.eventos.push({ tipo, ...dados });
  // bons momentos (só de quem joga de verdade: você, ou os dois no modo a dois)
  function momento(p, simbolo, txt) { if (humano(p)) jogo.momentos.push({ p, simbolo, txt }); }

  // ---------- corrente e Bolso ----------
  const encaixaP = (p, v) => { const c = jogo.cor[p]; return !c.length || jogo.coringa[p] || sinc(frente(c), v); };
  function destinos(p, v) {
    const j = jogo, b = j.bolso[p], ds = [];
    if (encaixaP(p, v)) ds.push('corrente');
    if (j.espelhado && j.vez === p) return ds;
    if (b === null) ds.push('guardar');
    else if (encaixaP(p, b)) ds.push('trocar');
    return ds;
  }
  const seguro = (p, v) => destinos(p, v).length > 0;
  const bolsoGarante = p => jogo.bolso[p] === null || encaixaP(p, jogo.bolso[p]);

  // ---------- cartas ----------
  function podeUsar(p, c) {
    const j = jogo, k = CARTAS[c], e = j.cartas[p][c];
    if (!k || e !== 'pronta' || j.vez !== p || j.pensando) return { ok: false, motivo: e === 'pronta' ? 'Só na sua vez.' : 'Esta carta já foi usada.' };
    if (c === 'sobrecarga' && (j.fase === 'pegar' || j.fase === 'decidir')) return { ok: !j.sobre[p] };
    if (j.fase !== 'pegar') return { ok: false, motivo: 'Use antes de pegar o dado.' };
    if (k.tipo === 'armadilha' && j.armada[p]) return { ok: false, motivo: 'Já há uma armadilha sua armada. Ela precisa disparar antes.' };
    if ((c === 'espelho' || c === 'pressa') && j.mesa.length < 2) return { ok: false, motivo: 'Precisa de 2 dados ou mais na Mesa.' };
    if (k.alvo && !j.mesa.length) return { ok: false, motivo: 'A Mesa está vazia.' };
    return { ok: true };
  }
  function usarCarta(p, c, idx, delta) {
    const j = jogo, n = nomes(), k = CARTAS[c];
    if (k.tipo === 'armadilha') {
      j.cartas[p][c] = 'armada'; j.armada[p] = c;
      if (c === 'espelho') {
        j.marca = { dono: p, id: j.mesa[idx].id };
        registrar(p, `marcou um ${j.mesa[idx].v} da Mesa com o Espelho`, 'seg');
      } else registrar(p, 'armou uma armadilha', 'seg');
      emitir('armou', { p, c });
      return;
    }
    j.cartas[p][c] = 'usada'; j.stats[p].cartas.push(k.nome);
    if (c === 'ajuste') {
      const d = j.mesa[idx], antes = d.v; d.v = Math.min(6, Math.max(1, d.v + delta));
      registrar(p, `usou Ajuste: o ${antes} da Mesa virou ${d.v}`, 'seg'); j.virando = d.id; emitir('virar', { id: d.id });
    } else if (c === 'virar') {
      const d = j.mesa[idx], antes = d.v; d.v = 7 - d.v;
      registrar(p, `usou Virar: o ${antes} da Mesa virou ${d.v}`, 'seg'); j.virando = d.id; emitir('virar', { id: d.id });
      if (j.marca && j.marca.id === d.id) desfazerEspelho(p);
    } else if (c === 'rerrolar') {
      j.mesa.forEach(d => { d.v = rolar(); d.novo = true; }); marcarNovos(); emitir('rolar');
      registrar(p, 'usou Rerrolar: a Mesa foi rolada de novo', 'seg');
      if (j.marca) desfazerEspelho(p);
    } else if (c === 'pressa') { j.extra[p] = 1; registrar(p, 'usou Pressa: pega dois dados nesta vez', 'seg'); }
    else if (c === 'coringa') { j.coringa[p] = true; registrar(p, 'usou Coringa: o próximo dado entra com qualquer frente', 'seg'); }
    else if (c === 'sobrecarga') { j.sobre[p] = true; registrar(p, 'usou Sobrecarga: o próximo disparo de 4+ vale +2', 'seg'); }
    emitir('carta', { p, c, nome: k.nome, publico: !humano(p) || j.modo === 'local' });
  }
  function desfazerEspelho(quem) {
    const j = jogo, dono = j.marca.dono, n = nomes();
    j.marca = null; j.cartas[dono].espelho = 'perdida'; j.armada[dono] = null;
    registrar(dono, `perdeu o Espelho: ${dono === quem ? 'o próprio dado marcado mudou' : n[quem] + ' desfez a marca'}`, 'seg');
    if (dono !== quem) { emitir('chamada', { titulo: 'Marca desfeita', sub: `${n[quem]} livrou o dado do Espelho`, tipo: 'suave' }); momento(quem, '✦', 'Desfez a marca de um Espelho'); }
  }
  function revelar(p, c, txt) {
    const j = jogo;
    j.cartas[p][c] = 'usada'; j.armada[p] = null; j.stats[p].cartas.push(CARTAS[c].nome);
    registrar(p, `revelou ${CARTAS[c].nome}: ${txt}`, 'seg');
    emitir('revelou', { p, c, txt });
    if (c !== 'ancora') momento(p, '✧', `${CARTAS[c].nome} pegou o rival`);
    if (j.modo === 'bot') { if (p === 1 && c !== 'ancora') falar('armadilha', 1); if (p === 0) falar('caiu', 1); }
  }

  // ---------- a vez ----------
  function tirar(p, idx) {
    const j = jogo, d = j.mesa[idx], n = nomes();
    const el = document.querySelector(`.pega[data-id="${d.id}"] .face`);
    j.voo = el ? { de: el.getBoundingClientRect(), v: d.v, p } : null;
    // bloqueio: levar o único dado que servia a um rival com corrente grande
    const ele = j.cor[1 - p];
    if (ele.length >= 3 && encaixa(ele, d.v) && j.mesa.filter(x => encaixa(ele, x.v)).length === 1) {
      emitir('bloqueio', { p }); momento(p, '✦', `Bloqueio: levou o único dado que servia a ${n[1 - p]}`);
    }
    let v = d.v;
    j.mesa.splice(idx, 1); j.compras++; j.stats[p].compras++; j.confirma = null;
    emitir('pegar');
    if (j.marca && j.marca.id === d.id) {
      const dono = j.marca.dono; j.marca = null;
      if (dono !== p) { v = 7 - d.v; j.espelhado = true; if (j.voo) j.voo.v = v; revelar(dono, 'espelho', `o ${d.v} que ${n[p]} pegou virou ${v} e não pode ir para o Bolso.`); }
      else {
        j.cartas[p].espelho = 'perdida'; j.armada[p] = null;
        registrar(1 - p, `se esquivou do Espelho: ${n[p]} teve de pegar o próprio dado marcado (${d.v})`, 'seg');
        emitir('chamada', { titulo: 'Esquiva!', sub: `${n[1 - p]} não caiu no Espelho`, tipo: 1 - p === 1 && j.modo === 'bot' ? 'rival' : '' });
        momento(1 - p, '↺', 'Se esquivou de um Espelho');
      }
    }
    return v;
  }

  // Põe o dado v no destino. Devolve 'extra' (Pressa), 'decidir' ou 'fim-da-vez'.
  function colocar(p, v, modo) {
    const j = jogo, eu = j.cor[p];
    j.mao = null; j.espelhado = false;
    let entra = v, deOnde = '';
    const salvouPeloBolso = modo === 'trocar' && !encaixaP(p, v) && eu.length >= 3;
    if ((modo === 'guardar' || modo === 'trocar') && j.armada[1 - p] === 'fundo') {
      const caiu = modo === 'trocar' ? `o ${v} e o ${j.bolso[p]} do Bolso caíram` : `o ${v} caiu do Bolso`;
      j.bolso[p] = null; entra = null;
      revelar(1 - p, 'fundo', `${caiu}.`);
      if (j.voo) j.voo.para = 'nada';
    } else if (modo === 'guardar') {
      j.bolso[p] = v; entra = null; j.stats[p].guardou++;
      registrar(p, `guardou ${v} no Bolso`); emitir('bolso', { p });
      if (j.voo) j.voo.para = 'bolso';
    } else if (modo === 'trocar') {
      entra = j.bolso[p]; j.bolso[p] = v; j.stats[p].trocou++; deOnde = ' do Bolso';
      registrar(p, `guardou ${v} no Bolso e tirou o ${entra}`); emitir('troca', { p });
      if (j.voo) j.voo.para = 'bolso';
    } else if (j.voo) j.voo.para = 'corrente';
    if (entra !== null) {
      if (encaixaP(p, entra)) {
        const r = eu.length ? rels(frente(eu), entra) : [];
        const viaCoringa = eu.length && !r.length && j.coringa[p];
        eu.push(entra); j.coringa[p] = false;
        registrar(p, `pôs ${entra}${deOnde} · ${viaCoringa ? 'Coringa' : r.length ? r.map(k => REL[k].nome).join(' + ') : 'começa a corrente'} · corrente de ${eu.length}`);
        emitir('elo', { p, n: eu.length });
        if (salvouPeloBolso) { emitir('salvo', { p, txt: 'O Bolso salvou a corrente' }); momento(p, '❀', `O Bolso salvou uma corrente de ${eu.length - 1}`); }
      } else if (j.armada[p] === 'ancora' && eu.length >= 4) {
        revelar(p, 'ancora', `o ${entra} não sincronizava com ${frente(eu)}: foi descartado e a corrente de ${eu.length} ficou.`);
        emitir('salvo', { p, txt: 'A Âncora segurou a corrente' }); momento(p, '❀', `A Âncora salvou uma corrente de ${eu.length}`);
      } else {
        const perdida = eu.slice();
        j.stats[p].rupt++;
        j.cor[p] = [];
        j.fx = { id: uid++, p, tipo: 'ruptura', dados: perdida.concat(entra) };
        registrar(p, `pôs ${entra}${deOnde}, que não sincroniza com ${frente(perdida)}: a corrente de ${perdida.length} rompeu`, 'ruim');
        emitir('ruptura', { p, L: perdida.length });
        if (j.modo === 'bot' && p === 1 && perdida.length >= 3) falar('minhaRuptura', 1);
        vibrar(90);
      }
    }
    const L = j.cor[p].length;
    if (L >= LIM) { j.extra[p] = 0; disparar(p, true); return 'fim-da-vez'; }
    if (j.extra[p] > 0 && j.mesa.length) { j.extra[p]--; j.fase = 'pegar'; j.segundoDado = true; render(); return 'extra'; }
    j.extra[p] = 0; j.segundoDado = false;
    if (L >= 3) { j.fase = 'decidir'; render(); return 'decidir'; }
    proximo();
    return 'fim-da-vez';
  }

  function disparar(p, auto = false) {
    const j = jogo, cor = j.cor[p], L = cor.length, n = nomes(), antes = j.pts.slice();
    let ganho = pontos(L), extra = '';
    if (j.sobre[p] && L >= 4) { ganho += 2; j.sobre[p] = false; extra = ' com Sobrecarga'; }
    if (L >= 4 && j.armada[1 - p] === 'interferencia') {
      const a = ganho; ganho = Math.max(0, ganho - 1);
      revelar(1 - p, 'interferencia', `o disparo de ${L} de ${n[p]} valeu +${ganho} em vez de +${a}.`);
    }
    const harm = harmonica(cor);
    j.pts[p] += ganho;
    j.stats[p].disp++; j.stats[p].maior = Math.max(j.stats[p].maior, L); j.stats[p].maiorDisp = Math.max(j.stats[p].maiorDisp, ganho);
    j.fx = { id: uid++, p, tipo: 'disparo', dados: cor.slice(), ganho };
    j.cor[p] = [];
    registrar(p, `${auto ? 'completou 6 e disparou' : 'disparou'} uma corrente de ${L}${extra}: +${ganho} (total ${j.pts[p]})`, 'bom');
    emitir('disparo', { p, L, ganho, harm, de: antes[p] });
    if (L === 6) momento(p, '★', 'Sinfonia: corrente completa de 6');
    else if (L === 5) momento(p, '♪', 'Disparou uma corrente de 5');
    if (harm) momento(p, '✿', `Harmonia: todos os elos em ${REL[harm].nome}`);
    if (j.modo === 'bot') { if (p === 1 && L >= 4) falar('meuDisparo', 1); if (p === 0 && L >= 5) falar('seuDisparoGrande', 1); }
    if (j.armada[1 - p] === 'pedagio') { j.pts[1 - p] += 3; revelar(1 - p, 'pedagio', `${n[1 - p]} ganhou 3 pontos com o disparo de ${n[p]}.`); emitir('placar', { p: 1 - p, de: antes[1 - p] }); }
    [0, 1].forEach(k => { j.piorDiferenca[k] = Math.min(j.piorDiferenca[k], j.pts[k] - j.pts[1 - k]); });
    if (j.pts[p] >= j.meta) { terminar(p); return; }
    if (j.pts[1 - p] >= j.meta) { terminar(1 - p); return; }
    proximo();
  }

  function segurar(p) {
    registrar(p, `segurou a corrente de ${jogo.cor[p].length}`);
    proximo();
  }

  function proximo() {
    const j = jogo;
    j.fase = 'pegar'; j.confirma = null; j.alvo = null; j.ajusteIdx = null;
    j.vez = 1 - j.vez;
    if (!j.mesa.length) {
      rolarMesa(); registrar(null, `Mesa vazia: cinco dados novos (rodada ${j.rodada}).`, 'sis');
      if (j.pts[0] !== j.pts[1]) { const atras = j.pts[0] < j.pts[1] ? 0 : 1; j.vez = atras; registrar(atras, 'está atrás e abre a Mesa', 'sis'); }
    }
    render();
    talvezAutomato();
  }

  function terminar(p) {
    const j = jogo, n = nomes();
    j.fase = 'fim'; j.vencedor = p;
    const virada = j.piorDiferenca[p] <= -4;
    if (virada) momento(p, '☾', `Virada: ${n[p]} esteve ${-j.piorDiferenca[p]} pontos atrás`);
    // recordes (só de quem joga contra um rival)
    j.recordes = [];
    if (j.modo === 'bot') {
      const r = st.rec, s = j.stats[0], liberouAgora = !armadilhasLiberadas();
      r.partidas++;
      if (p === 0) { r.vitorias++; r.seq++; } else r.seq = 0;
      if (r.seq > r.melhorSeq) { r.melhorSeq = r.seq; if (r.seq >= 2) j.recordes.push(`Melhor sequência: ${r.seq} vitórias seguidas`); }
      if (s.maiorDisp > r.maiorDisparo) { r.maiorDisparo = s.maiorDisp; j.recordes.push(`Maior disparo: +${s.maiorDisp}`); }
      if (s.maior > r.maiorCorrente) { r.maiorCorrente = s.maior; j.recordes.push(`Maior corrente: ${s.maior}`); }
      if (liberouAgora) j.recordes.push('Armadilhas liberadas no deck!');
      // moedas: só vitórias, e só abaixo do teto de rating de cada rival (nada de farmar no modo fácil)
      // o teto olha o maior rating já alcançado: perder de propósito para voltar a farmar o modo fácil não adianta
      const c = st.conta, ratingAntes = c.rating, pico = Math.max(c.rating, c.pico || 0), elegivel = pico < TETO_MOEDAS[j.nivel];
      let moedas = null;
      if (p === 0) {
        moedas = moedasDaVitoria(BASE_MOEDAS[j.nivel], j.pts[0] - j.pts[1], j.rodada, j.meta);
        moedas.elegivel = elegivel;
        if (!elegivel) moedas.total = 0;
        c.moedas += moedas.total;
      }
      // rating provisório (Elo contra o rating do rival)
      const esperado = 1 / (1 + Math.pow(10, (RATING_RIVAL[j.nivel] - c.rating) / 400));
      c.rating = Math.max(100, Math.round(c.rating + 32 * ((p === 0 ? 1 : 0) - esperado)));
      c.pico = Math.max(pico, c.rating);
      // experiência: sobe sempre (vitória ou derrota), e os níveis dão presentes cosméticos
      const xpGanho = (p === 0 ? 20 : 10) + Math.min(15, j.momentos.filter(m => m.p === 0).length * 3);
      const nivelAntes = nivelDe(c.xp); c.xp += xpGanho; const nivelDepois = nivelDe(c.xp);
      const presentes = [];
      for (let nv = nivelAntes + 1; nv <= nivelDepois; nv++) {
        const pr = PRESENTES[nv]; if (!pr) continue;
        const [tipo, id] = pr; if (!c[tipo].includes(id)) { c[tipo].push(id); presentes.push({ tipo, id }); }
      }
      j.premio = { moedas, ratingAntes, pico, rating: c.rating, xpGanho, nivelAntes, nivelDepois, presentes };
      salvar(); aplicarPrefs();
      falar(p === 1 ? 'venci' : 'perdi', 1);
    }
    emitir('fim', { p, virada });
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
    if (!j || j.fase === 'fim' || humano(j.vez) || j.pensando || j.intro) return;
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
  function falar(chave, p) {
    const j = jogo;
    if (!j || j.modo !== 'bot' || !st.pref.falas) return;
    const lista = RIVAIS[j.nivel].falas[chave]; if (!lista) return;
    if (!['inicio', 'venci', 'perdi'].includes(chave) && Math.random() > 0.55) return;
    j.fala = { id: uid++, txt: sorteia(lista) };
    j.humor = ['meuDisparo', 'armadilha', 'venci', 'inicio'].includes(chave) ? 'feliz' : ['minhaRuptura', 'perdi'].includes(chave) ? 'triste' : null;
    emitir('fala');
    const id = j.fala.id;
    setTimeout(() => { if (jogo && jogo.fala && jogo.fala.id === id) { jogo.fala = null; jogo.humor = null; render(); } }, 2600);
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
    const v = tirar(p, idx);
    const ds = destinos(p, v);
    if (ds.length === 1) { colocar(p, v, ds[0]); return; }
    if (!ds.length && (j.bolso[p] === null || j.espelhado)) { colocar(p, v, 'corrente'); return; }
    j.mao = { v }; j.fase = 'destino'; j.voo = null; render();
  }

  function abrirCarta(p, c) {
    const j = jogo, k = CARTAS[c], pu = podeUsar(p, c);
    const meu = (j.modo === 'bot' && p === 0) || (j.modo === 'local' && j.vez === p);
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
  const skinDe = p => p === 0 ? st.conta.dado : jogo.modo === 'bot' ? (jogo.nivel === 'esperto' ? 'madeira' : 'rosa') : 'marfim';
  const skinMesa = () => jogo.modo === 'bot' ? st.conta.dado : 'marfim';
  const iconeSVG = id => `<svg class="avatar" viewBox="0 0 64 64" aria-hidden="true">${(ICONES[id] || ICONES.bolinha).svg}</svg>`;
  const elo = r => `<span class="elo ${r.length > 1 ? 'duplo' : 'r-' + r[0]}" title="${r.map(k => REL[k].nome).join(' + ')}">${r.map(k => REL[k].simb).join('·')}</span>`;

  function bolsoHTML(p) {
    const j = jogo, b = j.bolso[p], util = b !== null && j.cor[p].length && encaixaP(p, b);
    const destaque = j.fase === 'destino' && j.vez === p ? ' ativo' : '';
    return `<span class="bolso${destaque}" title="Bolso: guarda um dado"><span class="rot">Bolso</span>${b === null ? '<span class="bolso-vazio"></span>' : `<span class="mini${util ? ' util' : ''}">${dadoHTML(b, skinDe(p))}</span>`}</span>`;
  }
  function cartasHTML(p) {
    const j = jogo, deck = j.decks[p];
    if (!deck.length) return `<div class="cartas"><span class="rot">Cartas</span><span class="nota">nenhuma</span></div>`;
    const meu = j.modo === 'bot' && p === 0;
    let html = '<span class="rot">Cartas</span>';
    for (const c of deck) {
      const k = CARTAS[c];
      let e = j.cartas[p][c];
      if (e === 'armada' && !meu && c !== 'espelho') e = 'pronta';
      const raio = k.pontos ? '<span class="raio" aria-label="carta de pontos">⚡</span>' : '';
      html += `<button class="carta ${k.tipo} ${e}" data-carta="${c}" data-dono="${p}" aria-label="${k.nome}: ${e}">${k.ico}<span class="cnome">${k.nome}</span>${raio}${e === 'armada' ? '<small>armada</small>' : ''}</button>`;
    }
    if (j.armada[p] && j.armada[p] !== 'espelho' && !meu) html += `<span class="carta oculta armada" aria-label="uma armadilha armada">?<small style="color:inherit">armada</small></span>`;
    if (j.coringa[p]) html += `<span class="efeito-ativo">Coringa ativo</span>`;
    if (j.sobre[p]) html += `<span class="efeito-ativo">Sobrecarga +2</span>`;
    if (j.extra[p]) html += `<span class="efeito-ativo">Pressa: +1 dado</span>`;
    return `<div class="cartas">${html}</div>`;
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
        slots += `<div class="slot prox" title="Faces que sincronizam com a frente">${cor.length && !j.coringa[p] ? `<span class="prox-faces">${fs.join(' ')}</span>` : '<span class="prox-faces qualquer">livre</span>'}</div>`;
      } else slots += `<div class="slot vazio"></div>`;
    }
    const pct = Math.min(100, j.pts[p] / j.meta * 100);
    const prev = L >= 3 ? Math.min(100 - pct, pontos(L) / j.meta * 100) : 0;
    const vale = pontos(L) + (j.sobre[p] && L >= 4 ? 2 : 0);
    const valeAgora = L >= 3 ? `disparar vale <b>+${vale}</b>` : L ? `faltam <b>${3 - L}</b> para disparar` : 'qualquer dado começa';
    const seCrescer = L >= 3 && L < LIM ? ` · com ${L + 1}: <b>+${pontos(L + 1)}</b>` : '';
    const pensa = daVez && !humano(p);
    const tag = j.fase === 'fim' ? (j.vencedor === p ? 'venceu' : '') : daVez ? (humano(p) ? (j.modo === 'bot' ? 'sua vez' : 'vez') : 'pensando') : '';
    const avatar = j.modo === 'bot' && p === 1 ? AVATAR[j.nivel].replace('class="avatar"', `class="avatar ${j.humor || ''}"`) : p === 0 ? iconeSVG(st.conta.icone) : '';
    const fala = j.modo === 'bot' && p === 1 && j.fala ? `<div class="fala" aria-live="polite">${j.fala.txt}</div>` : '';
    return `<div class="jogador p${p}${daVez ? ' da-vez' : ''}">${fala}
      <div class="cab">${avatar}<span class="nome">${n[p]}</span>${tag ? `<span class="vez-tag${pensa ? ' pensando-pontos' : ''}">${tag}</span>` : ''}
        ${bolsoHTML(p)}<span class="placar"><b data-placar="${p}">${j.pts[p]}</b>&nbsp;/ ${j.meta}</span></div>
      <div class="barra" role="progressbar" aria-valuemin="0" aria-valuemax="${j.meta}" aria-valuenow="${j.pts[p]}" aria-label="Pontos de ${n[p]}"><i style="width:${pct}%"></i>${prev ? `<span class="prev" style="left:${pct}%;width:${prev}%"></span>` : ''}</div>
      <div class="corrente${fx ? ' fx-' + fx.tipo : ''}">${slots}</div>
      <div class="info"><span>Corrente <b>${L}</b>/${LIM}</span><span>${valeAgora}${seCrescer}</span></div>
      ${cartasHTML(p)}
    </div>`;
  }

  function mesaHTML() {
    const j = jogo, p = j.modo === 'bot' ? 0 : j.vez, eu = j.cor[p], ele = j.cor[1 - p];
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
        <div class="botoes"><button class="btn btn-mel" data-acao="nova">Jogar de novo</button><button class="btn btn-papel" data-acao="deck">Trocar deck</button></div>`;
    }
    if (!humano(p)) return `<div class="status">${quem} está pensando<span class="pensando-pontos"></span></div>`;
    const eu = j.cor[p];
    if (j.fase === 'alvo') {
      const k = CARTAS[j.alvo];
      const txt = { espelho: 'Toque no dado que vai receber a marca do <b>Espelho</b>.', virar: 'Toque no dado que vai <b>virar</b>. A etiqueta mostra como ele fica.', ajuste: 'Toque no dado que vai receber o <b>Ajuste</b>.' }[j.alvo];
      return `<div class="status">${txt}</div><div class="botoes"><button class="btn btn-papel" data-acao="cancelar-alvo">Cancelar (${k.nome} volta para a mão)</button></div>`;
    }
    if (j.fase === 'ajuste') {
      const d = j.mesa[j.ajusteIdx];
      return `<div class="status">Ajuste no ${mini(d.v, skinMesa())} <b>${d.v}</b>:</div><div class="botoes">
        <button class="btn btn-mel" data-ajuste="-1" ${d.v <= 1 ? 'disabled' : ''}>−1 · vira ${d.v - 1}</button>
        <button class="btn btn-mel" data-ajuste="1" ${d.v >= 6 ? 'disabled' : ''}>+1 · vira ${d.v + 1}</button>
        <button class="btn btn-papel" data-acao="cancelar-alvo">Cancelar</button></div>`;
    }
    if (j.fase === 'destino' && j.mao) {
      const v = j.mao.v, ds = destinos(p, v), b = j.bolso[p];
      const relTxt = x => { const r = eu.length ? rels(frente(eu), x) : []; return r.length ? ' · ' + r.map(k => REL[k].nome).join(' + ') : (eu.length && j.coringa[p] ? ' · Coringa' : ''); };
      const bt = (modo, rot, cls) => `<button class="btn ${cls}" data-destino="${modo}">${rot}</button>`;
      let botoes = '';
      if (ds.length) {
        if (ds.includes('corrente')) botoes += bt('corrente', `Na corrente${relTxt(v)}`, 'btn-mel');
        if (ds.includes('guardar')) botoes += bt('guardar', 'Guardar no Bolso', ds.includes('corrente') ? 'btn-papel' : 'btn-mel');
        if (ds.includes('trocar')) botoes += bt('trocar', `Trocar: o ${b} do Bolso entra${relTxt(b)}`, ds.includes('corrente') ? 'btn-papel' : 'btn-mel');
      } else {
        botoes += bt('corrente', `Na corrente (rompe${b !== null ? ` e guarda o ${b}` : ''})`, 'btn-papel');
        if (b !== null) botoes += bt('trocar', `Trocar (o ${b} rompe e o ${v} fica)`, 'btn-papel');
      }
      return `<div class="status">${quem} pegou ${mini(v, skinDe(p))} <b>${v}</b>. Para onde ele vai?${ds.length ? '' : ' Nenhuma opção sincroniza.'}</div>
        <div class="botoes">${botoes}</div>`;
    }
    const sobreBtn = j.cartas[p].sobrecarga === 'pronta' && !j.sobre[p] && eu.length >= 4 ? `<button class="btn btn-papel" data-acao="sobrecarga">${CARTAS.sobrecarga.ico}Sobrecarga: +2</button>` : '';
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
          <button class="btn btn-mel" data-acao="disparar">Disparar · +${vale}</button>
          <button class="btn btn-papel" data-acao="segurar">Segurar${L + 1 <= LIM ? ` · ${L + 1} vale +${pontos(L + 1)}` : ''}</button>
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
      let alvo = null;
      if (para === 'corrente') { const s = document.querySelectorAll(`#pj${p} .corrente .slot[data-slot]`); alvo = s[s.length - 1] || null; }
      if (para === 'bolso') alvo = qs(`#pj${p} .bolso .mini`);
      if (alvo) Fx.voar(de, alvo, `<div style="width:100%;height:100%">${dadoHTML(v, skinDe(p))}</div>`);
    }
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
          if (e.L === 6) { Fx.chamada('Sinfonia!', 'corrente completa de 6', e.p === 1 && j.modo === 'bot' ? 'rival' : ''); vibrar([30, 40, 60]); }
          else if (e.L === 5) Fx.chamada('Belo disparo!', `corrente de 5 · +${e.ganho}`, e.p === 1 && j.modo === 'bot' ? 'rival' : '');
          if (e.harm) Fx.chamada('Harmonia!', `todos os elos em ${REL[e.harm].nome}`, 'suave');
          if (e.L >= 4 && humano(e.p)) setTimeout(() => Som.tocar('momento'), 500);
          break;
        }
        case 'placar': { const pl = qs(`[data-placar="${e.p}"]`); if (pl) { Fx.contar(pl, e.de, jogo.pts[e.p]); Fx.pulsar(pl); Fx.texto(pl, '+3'); } break; }
        case 'ruptura': {
          Som.tocar('ruptura'); Fx.poeira(qs(`#pj${e.p} .corrente`), 8 + e.L * 2);
          if (painelEl) Fx.tremer(painelEl, 0.6);
          if (e.L >= 4 && humano(e.p)) Fx.texto(qs(`#pj${e.p} .corrente`), 'Ah… rompeu', 'pequeno ruim');
          break;
        }
        case 'salvo': Som.tocar('salvo'); Fx.chamada('Salvo!', e.txt, 'suave'); Fx.faiscas(qs(`#pj${e.p} .corrente`), 14, ['#cdeccf', '#fff6e6']); break;
        case 'bloqueio': Som.tocar('bloqueio'); Fx.texto(qs(`#pj${e.p} .corrente`) || null, 'Bloqueio!', 'pequeno'); break;
        case 'carta': Som.tocar('carta'); if (e.publico) Fx.chamada(e.nome, `${n[e.p]} usou`, e.p === 1 && j.modo === 'bot' ? 'rival' : 'suave'); break;
        case 'armou': Som.tocar('armou'); if (!humano(e.p) || j.modo === 'local') Fx.texto(painelEl, e.c === 'espelho' ? 'Espelho!' : 'Armadilha armada', 'pequeno'); break;
        case 'revelou': {
          Som.tocar('revelou'); Fx.chamada(CARTAS[e.c].nome + '!', e.txt, e.p === 1 && j.modo === 'bot' ? 'rival' : '');
          Fx.faiscas(painelEl, 22, ['#e2d6ff', '#fff6e6', '#ffe3a3']); vibrar([40, 60, 40]);
          break;
        }
        case 'virar': setTimeout(() => { if (jogo.virando === e.id) jogo.virando = null; }, 500); Som.tocar('virar'); break;
        case 'chamada': Som.tocar('momento'); Fx.chamada(e.titulo, e.sub, e.tipo); break;
        case 'fala': Som.tocar('falaRival'); break;
        case 'fim': {
          const venceuHumano = humano(e.p);
          if (venceuHumano) { Som.tocar('vitoria'); Fx.confete(120); Fx.chamada(e.virada ? 'Virada!' : j.modo === 'bot' ? 'Vitória!' : `${n[e.p]} venceu!`, e.virada ? 'que volta por cima' : 'que partida gostosa'); }
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
      const av = j.modo === 'bot' && p === 1 ? AVATAR[j.nivel] : p === 0 ? iconeSVG(st.conta.icone) : iconeSVG('sapo');
      const deck = j.decks[p].map(c => `<span class="carta ${CARTAS[c].tipo}">${CARTAS[c].ico}${CARTAS[c].nome}</span>`).join('') || '<span class="nota">sem cartas</span>';
      return `<div class="vs-lado">${av}<b class="cor${p}">${n[p]}</b><div class="vs-deck">${deck}</div></div>`;
    };
    const el = document.createElement('div');
    el.className = 'versus'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Começo da partida');
    el.innerHTML = `<div class="caixa"><h2>Dice Duel</h2><div class="vs-linha">${lado(0)}<span class="vs-x">×</span>${lado(1)}</div>
      <p class="nota">${j.modo === 'bot' ? RIVAIS[j.nivel].desc + '. ' : ''}Meta: ${j.meta} pontos. ${n[j.vez]} começa.</p><button class="btn btn-mel">Vamos lá</button></div>`;
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
    document.getElementById('fimTitulo').textContent = j.modo === 'bot' ? (v === 0 ? 'Você venceu!' : `${n[1]} venceu`) : `${n[v]} venceu!`;
    document.getElementById('fimPlacar').innerHTML = `<span class="cor0">${n[0]} ${j.pts[0]}</span> × <span class="cor1">${j.pts[1]} ${n[1]}</span>`;
    // repetições viram um item só ("×2"); os mais raros vêm primeiro
    const grupos = new Map();
    j.momentos.forEach(m => { const k = m.p + m.txt; const g = grupos.get(k) || { ...m, vezes: 0 }; g.vezes++; grupos.set(k, g); });
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
      `Dice Duel v0.7 · ${j.modo === 'bot' ? 'contra ' + n[1] : '2 jogadores'} · meta ${j.meta}${j.premio ? ` · moedas +${j.premio.moedas ? j.premio.moedas.total : 0} · rating ${j.premio.ratingAntes}→${j.premio.rating}` : ''}\n` +
      `${n[0]} ${j.pts[0]} × ${j.pts[1]} ${n[1]} · ${j.compras} dados pegos · ${j.rodada} rodadas\n` +
      [0, 1].map(k => `${n[k]} [${j.decks[k].map(c => CARTAS[c].nome).join(', ') || 'sem cartas'}]: ${s[k].disp} disparos, maior ${s[k].maior}, ${s[k].rupt} rupturas, Bolso ${s[k].guardou}/${s[k].trocou}, cartas que agiram: ${s[k].cartas.join(', ') || 'nenhuma'}`).join('\n') +
      `\nComentário: `;
    document.getElementById('fim').hidden = false;
    document.getElementById('btnDeNovo').focus();
  }

  const fmt = x => String(x).replace('.', ',');
  const nomeItem = (tipo, id) => ({ cartas: CARTAS, dados: DADOS, icones: ICONES, mesas: MESAS })[tipo][id].nome;
  function desenharRecompensas(j) {
    const el = document.getElementById('fimRecompensas');
    if (j.modo !== 'bot' || !j.premio) { el.innerHTML = '<span class="conta">Partidas a dois no mesmo aparelho não dão moedas nem rating (assim ninguém farma sozinho).</span>'; return; }
    const pr = j.premio, m = pr.moedas, c = st.conta, rival = RIVAIS[j.nivel].nome;
    let linhaMoedas;
    if (!m) linhaMoedas = `<span class="conta">Moedas vêm das vitórias. A próxima é sua.</span>`;
    else if (!m.elegivel) linhaMoedas = `<span class="conta">Seu maior rating (${pr.pico}) já passou do que ${rival} paga (até ${TETO_MOEDAS[j.nivel] - 1}). ${j.nivel === 'aprendiz' ? 'A Dona Coruja ainda paga.' : 'As próximas moedas virão do online.'}</span>`;
    else linhaMoedas = `<span class="conta">vitória contra ${rival}: ${m.base} × margem ×${fmt(m.mm.toFixed(2))} × rapidez ×${fmt(m.mr)} (${j.rodada} Mesas)</span>`;
    const dr = pr.rating - pr.ratingAntes;
    const prox = NIVEIS[pr.nivelDepois] ?? null, ant = NIVEIS[pr.nivelDepois - 1];
    const pct = prox === null ? 100 : Math.round((c.xp - ant) / (prox - ant) * 100);
    const presentes = pr.presentes.map(x => `<div class="linha"><span>Presente do nível: ${nomeItem(x.tipo, x.id)}</span><span class="sobe">novo!</span></div>`).join('');
    el.innerHTML = `<div class="grande"><span class="moeda" aria-hidden="true"></span><span id="contaMoedas">+0</span></div>${linhaMoedas}
      <div class="linha"><span>Rating ${pr.ratingAntes} → <b>${pr.rating}</b> <span class="${dr >= 0 ? 'sobe' : 'desce'}">(${dr >= 0 ? '+' : ''}${dr})</span></span><span>${tituloDe(pr.rating)}</span></div>
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
      <span class="nota">Rating ${c.rating} · Nível ${nv} · ${st.rec.vitorias} vitórias</span>
      <div class="xp" title="experiência"><i style="width:${prox === null ? 100 : Math.round((c.xp - ant) / (prox - ant) * 100)}%"></i></div>`;
    document.querySelectorAll('#abasLoja [data-aba-loja]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.abaLoja === aba)));
    const alvo = document.getElementById('lojaConteudo');
    if (aba === 'ganhar') {
      alvo.innerHTML = `<table class="taxas">
        <tr><th>Partida</th><th>Base</th><th>Paga moedas enquanto o seu maior rating estiver</th></tr>
        <tr><td>Biscoito (iniciante)</td><td>${BASE_MOEDAS.aprendiz}</td><td>rating abaixo de ${TETO_MOEDAS.aprendiz}</td></tr>
        <tr><td>Dona Coruja (avançado)</td><td>${BASE_MOEDAS.esperto}</td><td>rating abaixo de ${TETO_MOEDAS.esperto}</td></tr>
        <tr><td>Online (em breve)</td><td>${BASE_MOEDAS.online}</td><td>sempre; vale mais vencer quem tem rating maior</td></tr>
        <tr><td>A dois no aparelho</td><td>–</td><td>não paga</td></tr></table>
        <p class="nota" style="margin-top:10px">Só vitórias dão moedas. A base é multiplicada pela <b>margem</b> (×1 a ×2: vencer por 8 pontos ou mais, na meta 12, dobra) e pela <b>rapidez</b> (×1,5 em até 5 Mesas, ×1,25 em 6). Uma vitória típica rende cerca de 14 contra o Biscoito e 24 contra a Dona Coruja.</p>
        <p class="nota">Experiência sobe em toda partida, ganhando ou perdendo, e os níveis 2, 3 e 5 dão presentes. Cartas nunca serão vendidas por dinheiro: elas ampliam o estilo, não a força (o melhor deck é feito só de cartas grátis).</p>`;
      return;
    }
    const item = (tipo, id, info, previa, sub) => {
      const tem = c[tipo].includes(id), usando = tipo !== 'cartas' && c[tipo.slice(0, -1) === 'icone' ? 'icone' : tipo === 'dados' ? 'dado' : 'mesa'] === id;
      let botao;
      if (tem && tipo === 'cartas') botao = `<button class="btn btn-papel" disabled>${GRATIS.includes(id) ? 'Grátis' : 'Sua'}</button>`;
      else if (tem) botao = usando ? `<button class="btn btn-papel" disabled>Usando</button>` : `<button class="btn btn-mel" data-usar-item="${tipo}:${id}">Usar</button>`;
      else if (info.nivel) botao = `<button class="btn btn-papel" disabled>Nível ${info.nivel}</button>`;
      else if (c.moedas < info.preco) botao = `<button class="btn btn-papel" disabled><span class="moeda"></span>${info.preco} · faltam ${info.preco - c.moedas}</button>`;
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
    c.moedas -= info.preco; c[tipo].push(id);
    if (tipo === 'dados') c.dado = id; if (tipo === 'icones') c.icone = id; if (tipo === 'mesas') c.mesa = id;
    salvar(); aplicarPrefs(); desenharLoja(); if (jogo) render();
    Som.tocar('compra'); Fx.confete(60); Fx.chamada('Novo!', `${nomeItem(tipo, id)} é seu`, 'suave');
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

  // ---------- início ----------
  aplicarPrefs();
  window.claude?.hot?.snapshot?.(() => ({ st, jogo, uid }));
  function iniciar(dados) {
    if (dados && dados.jogo && dados.jogo.v === 7) {
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
  }
  // o roteiro de teste automático (tools/) pode ler o estado
  window.DiceDuel = { get jogo() { return jogo; }, st };
  window.claude?.hot?.ready ? window.claude.hot.ready(iniciar) : iniciar(window.claude?.hot?.data ?? {});
})();
