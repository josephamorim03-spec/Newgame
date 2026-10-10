/* Dice Duel · motor de regras compartilhado (navegador e servidor), regras v0.11 (blefe; Pausa, Reverso, Furto, Lacre; Pedágio +2; Interferência só em quem lidera)
 * Tudo aqui é puro: recebe o estado da partida (um objeto serializável) e o altera.
 * Nada de DOM, som ou tempo. Quem desenha (o cliente) ou transmite (o servidor) lê
 * j.eventos, j.log e j.momentos depois de cada ação.
 * Números medidos em simulação: sim/ e docs/design.md.
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Regras = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- regras do núcleo ----------
  const PONTOS = { 3: 1, 4: 2, 5: 4, 6: 6 };
  const LIM = 6, NA_MESA = 5;
  const REL = { eco: { nome: 'Eco', simb: '=' }, passo: { nome: 'Passo', simb: '±1' }, oposto: { nome: 'Oposto', simb: '7' } };
  const CARTAS = {
    ajuste:        { nome: 'Ajuste', tipo: 'efeito', alvo: true, verbo: '±1 num dado', texto: 'Some ou tire 1 de um dado da Mesa (o 6 não passa de 6, o 1 não desce de 1). Não desfaz a marca de um Espelho.' },
    virar:         { nome: 'Virar', tipo: 'efeito', alvo: true, verbo: 'vira um dado', texto: 'Vire um dado da Mesa para a face oposta (7 − valor). Se o dado tinha a marca de um Espelho, a marca some.' },
    rerrolar:      { nome: 'Rerrolar', tipo: 'efeito', verbo: 'rola a Mesa', texto: 'Role de novo todos os dados que estão na Mesa. Se havia a marca de um Espelho, ela some.' },
    pressa:        { nome: 'Pressa', tipo: 'efeito', verbo: 'pega 2 dados', texto: 'Nesta vez você pega dois dados, um depois do outro, sem disparar no meio. Só com 2 dados ou mais na Mesa: não passa para a Mesa seguinte. O segundo dado é opcional.' },
    // Coringa (v0.12): o dado que não sincronizava TROCA a frente (a corrente não cresce). Entrando como mais um elo, ele
    // garantia o 6.º dado de graça: com uso de gente (segurar a corrente de 5 contando com ele) vencia 64,9% sozinho na
    // meta 12; trocando a frente, 55,0% na meta 16, como Ajuste e Pressa (docs/balanceamento-cartas.md §14)
    coringa:       { nome: 'Coringa', tipo: 'efeito', verbo: 'troca a frente', texto: 'O próximo dado que não sincronizaria com a sua corrente entra no lugar da frente: a corrente não rompe, mas também não cresce. Fica ativo até um dado entrar numa corrente já começada, e é gasto nele mesmo que ele já sincronizasse (aí ele entra normal, como mais um elo).' },
    sobrecarga:    { nome: 'Sobrecarga', tipo: 'efeito', pontos: true, verbo: '+2 no disparo', texto: 'Seu próximo disparo de 4 dados ou mais vale +2. Disparo de 3 não a gasta. Pode ser usada também na hora de disparar.' },
    // v0.11 (docs/balanceamento-cartas.md): medidas no simulador com meta 12 e 16
    pausa:         { nome: 'Pausa', tipo: 'efeito', verbo: 'passa a vez', texto: 'Nesta vez você não pega dado nem dispara: a vez passa ao rival, e a sua corrente e o seu Bolso ficam como estão. Não vale no segundo dado da Pressa.' },
    reverso:       { nome: 'Reverso', tipo: 'efeito', verbo: 'inverte a corrente', texto: 'Inverta a sua corrente: o primeiro dado vira a frente e ela passa a crescer por essa ponta. Os dados e os pontos não mudam. Precisa de 2 dados na corrente.' },
    furto:         { nome: 'Furto', tipo: 'efeito', verbo: 'troca os Bolsos', texto: 'Troque o dado do seu Bolso com o do Bolso do rival (vazio também vale: o dado só muda de lado). Não conta como guardar: o Fundo Falso não pega.' },
    espelho:       { nome: 'Espelho', tipo: 'armadilha', alvo: true, verbo: 'marca um dado', texto: 'Marque um dado da Mesa (a marca fica à vista). Se o rival pegá-lo, ele vira 7 − valor e não pode ir para o Bolso. Se você mesmo pegá-lo, a armadilha se perde.' },
    fundo:         { nome: 'Fundo Falso', tipo: 'armadilha', verbo: 'o Bolso dele cai', texto: 'Na próxima vez que o rival guardar um dado no Bolso, o dado cai. Na troca, os dois caem e nada entra na corrente dele.' },
    lacre:         { nome: 'Lacre', tipo: 'armadilha', verbo: 'anula o próximo efeito', texto: 'O próximo efeito que o rival usar não funciona: a carta dele é gasta sem agir. Vale também para um blefe desvirado e para a Sobrecarga.' },
    ancora:        { nome: 'Âncora', tipo: 'armadilha', verbo: 'protege sua corrente', texto: 'Protege a sua corrente de 4 dados ou mais: se entrar nela um dado que não sincroniza, esse dado é jogado fora e a corrente continua inteira. Não mexe nos pontos. Com corrente de 3 ou menos, a ruptura acontece e a Âncora continua armada.' },
    interferencia: { nome: 'Interferência', tipo: 'armadilha', pontos: true, verbo: '−1 em quem lidera', texto: 'O próximo disparo do rival com 4 dados ou mais vale 1 ponto a menos, se ele estiver na sua frente ou empatado. Disparo de 3, ou com ele atrás, não a gasta: ela continua armada.' },
    pedagio:       { nome: 'Pedágio', tipo: 'armadilha', pontos: true, verbo: '+2 quando ele dispara', texto: 'No próximo disparo do rival, de qualquer tamanho, você ganha 2 pontos. Se os dois passarem da meta, vence quem disparou.' },
  };
  // Pedágio: +2 em qualquer meta (v0.11). Com +3 ele era a carta mais forte sozinha (61% contra deck vazio) e,
  // na meta 16, estava em 24 dos 25 melhores decks; docs/balanceamento-cartas.md §9 e §10
  const PEDAGIO = 2;
  const DESAFIO = { acerto: 2, erro: 2, bonus: 3 };   // desafio do blefe: acertou, errou, blefe que passou
  const pedagioDe = () => PEDAGIO;
  const tem = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
  const ORDEM = ['ajuste', 'virar', 'rerrolar', 'pressa', 'coringa', 'sobrecarga', 'pausa', 'reverso', 'furto', 'espelho', 'fundo', 'ancora', 'lacre', 'interferencia', 'pedagio'];
  const deckValido = d => Array.isArray(d) && d.length <= 3 && new Set(d).size === d.length && d.every(c => tem(CARTAS, c))
    && d.filter(c => CARTAS[c].tipo === 'armadilha').length <= 2 && d.filter(c => CARTAS[c].pontos).length <= 1;

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
  // corrente "harmônica": todos os elos compartilham um tipo de sincronia (só enfeite, não muda pontos)
  const harmonica = cor => {
    if (cor.length < 4) return null;
    let comum = ['eco', 'passo', 'oposto'];
    for (let i = 1; i < cor.length; i++) { const r = rels(cor[i - 1], cor[i]); comum = comum.filter(t => r.includes(t)); }
    return comum[0] || null;
  };

  // ---------- progressão e economia (docs/progressao.md) ----------
  const GRATIS = ['ajuste', 'virar', 'pressa', 'coringa', 'ancora', 'interferencia'];
  const PRECO_CARTA = { rerrolar: 90, espelho: 110, sobrecarga: 120, fundo: 140, pedagio: 140, reverso: 90, furto: 100, pausa: 130, lacre: 140 };
  const CATALOGO = {
    dados: {
      marfim: { nome: 'Marfim', preco: 0 }, madeira: { nome: 'Madeira', preco: 80 }, rosa: { nome: 'Rosa', preco: 120 },
      menta: { nome: 'Menta', preco: 0, nivel: 3 }, pelucia: { nome: 'Pelúcia', preco: 220 }, dourado: { nome: 'Dourado', preco: 450 },
      diamante: { nome: 'Diamante', preco: 800 },
    },
    // grupo: basico, animal, natureza ou especial (os especiais têm moldura dourada)
    icones: {
      bolinha: { nome: 'Dado', preco: 0, grupo: 'basico' }, xicara: { nome: 'Xícara', preco: 0, nivel: 2, grupo: 'basico' },
      raposa: { nome: 'Raposa', preco: 100, grupo: 'animal' }, sapo: { nome: 'Sapo', preco: 100, grupo: 'animal' },
      urso: { nome: 'Urso', preco: 120, grupo: 'animal' }, coelho: { nome: 'Coelho', preco: 120, grupo: 'animal' },
      guaxinim: { nome: 'Guaxinim', preco: 160, grupo: 'animal' },
      ovelha: { nome: 'Ovelha', preco: 160, grupo: 'animal' },
      cogumelo: { nome: 'Cogumelo', preco: 140, grupo: 'natureza' }, monstera: { nome: 'Monstera', preco: 90, grupo: 'natureza' },
      cacto: { nome: 'Cacto', preco: 90, grupo: 'natureza' },
      biscoito: { nome: 'Biscoito', preco: 300, grupo: 'especial' }, gordinho: { nome: 'Gordinho', preco: 350, grupo: 'especial' },
      cafu: { nome: 'Cafú', preco: 400, grupo: 'especial' }, galgo: { nome: 'Galgo', preco: 380, grupo: 'especial' },
      bandoleiro: { nome: 'Bandoleiro', preco: 450, grupo: 'especial' },
      cavalo: { nome: 'Cavalo', preco: 420, grupo: 'especial' },
    },
    mesas: {
      salvia: { nome: 'Feltro sálvia', preco: 0 }, vinho: { nome: 'Feltro vinho', preco: 150 },
      noite: { nome: 'Noite estrelada', preco: 0, nivel: 5 }, piquenique: { nome: 'Piquenique', preco: 250 },
    },
  };
  const NIVEIS = [0, 60, 150, 280, 450, 700, 1000, 1400, 1900, 2500];
  const PRESENTES = { 2: ['icones', 'xicara'], 3: ['dados', 'menta'], 5: ['mesas', 'noite'] };
  const RATING_RIVAL = { aprendiz: 850, esperto: 1250 };
  const TETO_MOEDAS = { aprendiz: 1050, esperto: 1400 };
  const BASE_MOEDAS = { aprendiz: 8, esperto: 14, online: 22 };
  const TITULOS = [[0, 'Aprendiz de mesa'], [1000, 'Jogador de chá'], [1150, 'Tecelão de correntes'], [1300, 'Mestre do Bolso'], [1450, 'Grão-mestre da Mesa']];
  const tituloDe = r => TITULOS.filter(t => r >= t[0]).pop()[1];
  const nivelDe = xp => NIVEIS.filter(x => xp >= x).length;
  // metas da partida (v0.12): 16, 20 ou 24 pontos. Na meta 12, dois disparos de 6 fechavam a partida em ~7 Mesas e
  // queimar as cartas cedo compensava; a 16 é o padrão (~9,5 Mesas), 20 e 24 são partidas longas (~12 e ~14 Mesas).
  // A 12 só existe para terminar uma partida guardada de antes (docs/balanceamento-cartas.md §14)
  const METAS = [16, 20, 24], META_PADRAO = 16;
  const metaValida = m => (METAS.includes(+m) ? +m : META_PADRAO);
  // moedas de uma vitória: base × margem (×1 a ×2) × rapidez em Mesas (×1 a ×1,5) × duração (meta/16: a 20 rende ×1,25,
  // a 24, ×1,5) [× rating do rival, no online]
  function moedasDaVitoria(base, margem, mesas, meta, ajusteRating = 1) {
    const mm = 1 + Math.min(1, Math.max(0, margem) / (meta * 2 / 3));
    const rapida = Math.round(meta * 5 / 12), normal = Math.round(meta * 6 / 12);
    const mr = mesas <= rapida ? 1.5 : mesas <= normal ? 1.25 : 1;
    const md = Math.max(1, meta / META_PADRAO);
    return { base, mm, mr, md, mrat: ajusteRating, total: Math.round(base * mm * mr * md * ajusteRating) };
  }
  // online: vencer quem tem rating maior vale até ×1,5; atropelar quem tem rating bem menor, ×0,5 (contra smurf)
  const ajusteRatingOnline = (meu, rival) => 1 + Math.max(-0.5, Math.min(0.5, (rival - meu) / 400));
  // Elo: devolve o rating novo de quem tem 'meu' contra 'rival', com resultado 1 (vitória) ou 0
  const elo = (meu, rival, resultado, k = 32) => Math.max(100, Math.round(meu + k * (resultado - 1 / (1 + Math.pow(10, (rival - meu) / 400)))));
  // contra os rivais do jogo: moedas só na vitória e só abaixo do teto de rating de cada rival.
  // O teto olha o maior rating já alcançado (pico): perder de propósito para voltar a farmar o modo fácil não adianta.
  function premioSolo({ rating, pico }, { nivel, venceu, margem, rodadas, meta }) {
    pico = Math.max(rating, pico || 0);
    const elegivel = pico < TETO_MOEDAS[nivel];
    let moedas = null;
    if (venceu) { moedas = moedasDaVitoria(BASE_MOEDAS[nivel], margem, rodadas, meta); moedas.elegivel = elegivel; if (!elegivel) moedas.total = 0; }
    const novo = elo(rating, RATING_RIVAL[nivel], venceu ? 1 : 0);
    return { moedas, ratingAntes: rating, pico, rating: novo, picoNovo: Math.max(pico, novo) };
  }
  // experiência: sobe sempre (vitória ou derrota); os níveis dão presentes cosméticos (conta: {xp, dados, icones, mesas})
  const xpDaPartida = (venceu, nMomentos) => (venceu ? 20 : 10) + Math.min(15, nMomentos * 3);
  function ganharXp(conta, ganho) {
    const nivelAntes = nivelDe(conta.xp); conta.xp += ganho; const nivelDepois = nivelDe(conta.xp);
    const presentes = [];
    for (let nv = nivelAntes + 1; nv <= nivelDepois; nv++) {
      const pr = PRESENTES[nv]; if (!pr) continue;
      const [tipo, id] = pr; if (!conta[tipo].includes(id)) { conta[tipo].push(id); presentes.push({ tipo, id }); }
    }
    return { xpGanho: ganho, nivelAntes, nivelDepois, presentes };
  }
  // preço de um item da loja (null: não se compra, vem de presente de nível ou já é de graça)
  function precoDe(tipo, id) {
    if (tipo === 'cartas') return tem(PRECO_CARTA, id) ? PRECO_CARTA[id] : null;
    const it = tem(CATALOGO, tipo) && tem(CATALOGO[tipo], id) && CATALOGO[tipo][id];
    return it && it.preco > 0 && !it.nivel ? it.preco : null;
  }

  // ---------- motor da partida ----------
  // rng não vai no estado (não é serializável): fica numa propriedade não enumerável
  const sorte = j => (j.__rng || Math.random)();
  const rolar = j => 1 + Math.floor(sorte(j) * 6);
  const novoStats = () => ({ disp: 0, rupt: 0, maior: 0, maiorDisp: 0, compras: 0, guardou: 0, trocou: 0, cartas: [], blefes: 0 });
  const novoId = j => (j.proxId = (j.proxId || 1) + 1);

  function criarPartida({ decks, vez = 0, meta = META_PADRAO, nomes = ['Jogador 1', 'Jogador 2'], modo = 'bot', nivel = 'aprendiz', rng = null, idInicial = 1 }) {
    const j = {
      v: 8, modo, nivel, meta, nomes, decks: decks.map(d => d.slice()),
      cartas: decks.map(d => Object.fromEntries(d.map(c => [c, 'pronta']))),
      armada: [null, null], coringa: [false, false], sobre: [false, false], extra: [0, 0], espelhado: false, segundoDado: false,
      cor: [[], []], pts: [0, 0], mesa: [], vez, fase: 'pegar', bolso: [null, null], mao: null, voo: null,
      log: [], stats: [novoStats(), novoStats()], rodada: 0, compras: 0, fx: null, vencedor: null, marca: null,
      eventos: [], momentos: [], piorDiferenca: [0, 0], proxId: idInicial,
      // desafio do blefe: a carta armada que foi desafiada e era armadilha fica à vista; vezes conta as vezes passadas
      // (um blefe só desvira a partir da vez seguinte à que foi virado: o rival sempre tem a chance de desafiar)
      revelada: [false, false], vezes: 0, viradaEm: [null, null],
    };
    if (rng) Object.defineProperty(j, '__rng', { value: rng, enumerable: false, writable: true });
    rolarMesa(j);
    registrar(j, null, `Nova partida até ${meta} pontos. ${nomes[vez]} começa.`, 'sis');
    [0, 1].forEach(p => registrar(j, p, `trouxe ${decks[p].length ? decks[p].map(c => CARTAS[c].nome).join(', ') : 'nenhuma carta'}`, 'sis'));
    // sem cartas dos dois lados, quem joga em segundo começa com um dado no Bolso (com cartas não precisa: 50,9%)
    if (!decks[0].length && !decks[1].length) j.bolso[1 - vez] = rolar(j);
    emitir(j, 'falar', { chave: 'inicio' });
    return j;
  }
  const usarRng = (j, rng) => { Object.defineProperty(j, '__rng', { value: rng, enumerable: false, writable: true, configurable: true }); return j; };

  function rolarMesa(j) {
    j.rodada++;
    j.marca = null;
    j.mesa = Array.from({ length: NA_MESA }, () => ({ id: novoId(j), v: rolar(j), novo: true }));
    emitir(j, 'rolar');
  }
  function registrar(j, p, txt, tipo = '') { j.log.unshift({ p, txt, tipo }); j.log.length = Math.min(j.log.length, 80); }
  function emitir(j, tipo, dados = {}) { j.eventos.push({ ...dados, tipo }); }
  function momento(j, p, simbolo, txt) { j.momentos.push({ p, simbolo, txt }); }

  const encaixaP = (j, p, v) => { const c = j.cor[p]; return !c.length || j.coringa[p] || sinc(frente(c), v); };
  function destinos(j, p, v) {
    const b = j.bolso[p], ds = [];
    if (encaixaP(j, p, v)) ds.push('corrente');
    if (j.espelhado && j.vez === p) return ds;   // o dado virado pelo Espelho não pode ir para o Bolso
    if (b === null) ds.push('guardar');
    else if (encaixaP(j, p, b)) ds.push('trocar');
    return ds;
  }
  const seguro = (j, p, v) => destinos(j, p, v).length > 0;
  const bolsoGarante = (j, p) => j.bolso[p] === null || encaixaP(j, p, j.bolso[p]);
  // o dado marcado pelo Espelho do rival chega virado e não pode ir para o Bolso: dicas e avisos usam o valor que vai chegar
  const marcadoContra = (j, p, d) => !!(j.marca && j.marca.id === d.id && j.marca.dono !== p);
  const valorAoPegar = (j, p, d) => (marcadoContra(j, p, d) ? 7 - d.v : d.v);
  const seguroDado = (j, p, d) => (marcadoContra(j, p, d) ? encaixaP(j, p, 7 - d.v) : seguro(j, p, d.v));

  // ---------- cartas ----------
  // Blefe: um efeito pode ser virado para baixo e ocupa o lugar da armadilha ("?"). Virado, não faz nada;
  // usá-lo depois funciona normalmente e revela o blefe.
  const blefando = (j, p, c) => j.cartas[p][c] === 'armada' && tem(CARTAS, c) && CARTAS[c].tipo === 'efeito';
  const usavel = (j, p, c) => j.cartas[p][c] === 'pronta' || blefando(j, p, c);
  // armadilhas que um "?" pode esconder (o Espelho deixa marca à vista, então nunca é "?")
  const armadilhasOcultas = (j, p) => j.decks[p].filter(c => CARTAS[c].tipo === 'armadilha' && c !== 'espelho' && ['pronta', 'armada'].includes(j.cartas[p][c]));
  function podeUsar(j, p, c, idx) {
    const k = tem(CARTAS, c) && CARTAS[c], e = j.cartas[p] && tem(j.cartas[p], c) ? j.cartas[p][c] : null;
    if (!k || !e) return { ok: false, motivo: 'Esta carta não está no seu deck.' };
    if (!usavel(j, p, c)) return { ok: false, motivo: e === 'armada' ? 'Armada: ela age sozinha quando a condição acontecer.' : 'Esta carta já foi usada.' };
    if (j.vez !== p || j.fase === 'fim') return { ok: false, motivo: 'Só na sua vez.' };
    if (blefando(j, p, c) && j.viradaEm && j.viradaEm[p] === (j.vezes || 0)) return { ok: false, motivo: 'Virada nesta vez: o blefe só desvira a partir da sua próxima vez (o rival precisa ter a chance de desafiar).' };
    if (c === 'sobrecarga' && (j.fase === 'pegar' || j.fase === 'decidir')) return j.sobre[p] ? { ok: false, motivo: 'A Sobrecarga já está ativa.' } : { ok: true };
    if (j.fase !== 'pegar') return { ok: false, motivo: 'Use antes de pegar o dado.' };
    if (k.tipo === 'armadilha' && j.armada[p]) return { ok: false, motivo: blefando(j, p, j.armada[p]) ? `Seu blefe (${CARTAS[j.armada[p]].nome}) ocupa o lugar da armadilha. Use essa carta antes.` : 'Já há uma armadilha sua armada. Ela precisa disparar antes.' };
    if (c === 'pressa' && j.mesa.length < 2) return { ok: false, motivo: 'Precisa de 2 dados ou mais na Mesa: a Pressa não passa para a Mesa seguinte.' };
    if (c === 'espelho' && j.mesa.length < 2) return { ok: false, motivo: 'Precisa de 2 dados ou mais na Mesa.' };
    if (c === 'pressa' && j.extra[p]) return { ok: false, motivo: 'A Pressa já está valendo nesta vez.' };
    if (c === 'pausa' && j.segundoDado) return { ok: false, motivo: 'No segundo dado da Pressa, use Dispensar.' };
    if (c === 'pausa' && j.extra[p]) return { ok: false, motivo: 'A Pressa já está valendo nesta vez: pegue os dados.' };
    if (c === 'pausa' && !j.mesa.length) return { ok: false, motivo: 'A Mesa está vazia.' };
    if (c === 'reverso' && j.cor[p].length < 2) return { ok: false, motivo: 'Precisa de 2 dados ou mais na sua corrente.' };
    if (c === 'furto' && j.bolso[0] === null && j.bolso[1] === null) return { ok: false, motivo: 'Os dois Bolsos estão vazios.' };
    if (k.alvo && !j.mesa.length) return { ok: false, motivo: 'A Mesa está vazia.' };
    if (k.alvo && idx !== undefined && !j.mesa[idx]) return { ok: false, motivo: 'Esse dado não está na Mesa.' };
    return { ok: true };
  }
  function podeVirar(j, p, c) {
    const k = tem(CARTAS, c) && CARTAS[c];
    if (!k || k.tipo !== 'efeito' || !tem(j.cartas[p], c) || j.cartas[p][c] !== 'pronta' || j.vez !== p || j.fase !== 'pegar') return { ok: false };
    if (j.armada[p]) return { ok: false, motivo: 'Já há uma carta sua armada.' };
    // sem armadilha que um "?" possa esconder, o rival saberia que é blefe
    if (!armadilhasOcultas(j, p).length) return { ok: false, motivo: 'Blefe só faz sentido com uma armadilha (sem ser o Espelho) ainda escondida no seu deck.' };
    return { ok: true };
  }
  function virarCarta(j, p, c) {
    j.cartas[p][c] = 'armada'; j.armada[p] = c; j.stats[p].blefes++; marcarVirada(j, p);
    registrar(j, p, 'armou uma armadilha', 'seg');   // o registro é igual ao de uma armadilha de verdade
    emitir(j, 'armou', { p, c });
  }
  // armou algo novo (armadilha ou blefe): volta a ser um "?" que pode ser desafiado
  function marcarVirada(j, p) {
    if (!j.revelada) j.revelada = [false, false];
    if (!j.viradaEm) j.viradaEm = [null, null];
    j.revelada[p] = false; j.viradaEm[p] = j.vezes || 0;
  }
  // Desafio: na sua vez, antes de pegar o dado, você pode desafiar a carta virada do rival.
  //   blefe     -> a carta dele se perde e você ganha DESAFIO.acerto pontos
  //   armadilha -> ela continua armada, agora à vista, e ele ganha DESAFIO.erro pontos
  // Os números saem de sim/profundidade.py: com 2/2/3 nenhuma estratégia fixa vence (nem sempre desafiar, nem nunca,
  // nem sempre blefar, nem nunca): quem lê o deck do rival é quem ganha (docs/balanceamento-cartas.md §13).
  const desafiavel = (j, r) => !!(j.armada[r] && j.armada[r] !== 'espelho' && !(j.revelada && j.revelada[r]));
  function podeDesafiar(j, p) {
    if (j.fase === 'fim' || j.vez !== p) return { ok: false, motivo: 'Só na sua vez.' };
    if (!desafiavel(j, 1 - p)) return { ok: false, motivo: 'O rival não tem carta virada para desafiar.' };
    if (j.fase !== 'pegar' || j.segundoDado || j.extra[p]) return { ok: false, motivo: 'Desafie antes de pegar o dado.' };
    return { ok: true };
  }
  function desafiar(j, p) {
    const r = 1 - p, c = j.armada[r], k = CARTAS[c], n = j.nomes, antes = [j.pts[0], j.pts[1]];
    if (!j.revelada) j.revelada = [false, false];
    if (k.tipo === 'efeito') {
      j.cartas[r][c] = 'perdida'; j.armada[r] = null; j.pts[p] += DESAFIO.acerto;
      registrar(j, p, `desafiou a carta virada: era blefe com ${k.nome} (a carta se perde, +${DESAFIO.acerto})`, 'bom');
      emitir(j, 'desafio', { p, c, blefe: true, nome: k.nome, pts: DESAFIO.acerto });
      emitir(j, 'placar', { p, de: antes[p] });
      momento(j, p, '✦', `Pegou o blefe: +${DESAFIO.acerto}`);
      if (j.pts[p] >= j.meta) { terminar(j, p); return 'fim'; }
    } else {
      j.revelada[r] = true; j.pts[r] += DESAFIO.erro;
      registrar(j, p, `desafiou a carta virada: era ${k.nome}, armada de verdade (agora à vista, +${DESAFIO.erro} para ${n[r]})`, 'ruim');
      emitir(j, 'desafio', { p, c, blefe: false, nome: k.nome, pts: DESAFIO.erro });
      emitir(j, 'placar', { p: r, de: antes[r] });
      if (j.pts[r] >= j.meta) { terminar(j, r); return 'fim'; }
    }
    return 'carta';
  }

  // devolve 'proximo' quando a carta passa a vez (Pausa), 'lacrada' quando o Lacre do rival a anulou
  function usarCarta(j, p, c, idx, delta = 1) {
    const k = CARTAS[c];
    if (blefando(j, p, c)) {
      // o blefe que ninguém desafiou rende pontos (sem isso, blefar nunca compensaria e desafiar perderia o sentido)
      j.armada[p] = null;
      const antes = j.pts[p]; j.pts[p] += DESAFIO.bonus;
      registrar(j, p, `desvirou ${k.nome}: a carta armada era um blefe que ninguém desafiou (+${DESAFIO.bonus})`, 'seg');
      emitir(j, 'chamada', { p, titulo: 'Blefe!', sub: `a carta virada de ${j.nomes[p]} era ${k.nome}: +${DESAFIO.bonus} pontos`, estilo: 'suave' });
      emitir(j, 'placar', { p, de: antes });
      momento(j, p, '✧', `Blefe que passou: +${DESAFIO.bonus}`);
      if (j.pts[p] >= j.meta) { terminar(j, p); return 'fim'; }
    }
    if (k.tipo === 'armadilha') {
      j.cartas[p][c] = 'armada'; j.armada[p] = c; marcarVirada(j, p);
      if (c === 'espelho') {
        j.marca = { dono: p, id: j.mesa[idx].id };
        registrar(j, p, `marcou um ${j.mesa[idx].v} da Mesa com o Espelho`, 'seg');
      } else registrar(j, p, 'armou uma armadilha', 'seg');
      emitir(j, 'armou', { p, c });
      return;
    }
    j.cartas[p][c] = 'usada'; j.stats[p].cartas.push(k.nome);
    // Lacre do rival: o efeito é gasto sem agir (inclusive um blefe desvirado e a Sobrecarga na hora de disparar)
    if (j.armada[1 - p] === 'lacre' && j.cartas[1 - p].lacre === 'armada') {
      revelar(j, 1 - p, 'lacre', `${k.nome} de ${j.nomes[p]} não funcionou.`);
      return 'lacrada';
    }
    const ev = { p, c, nome: k.nome };   // ajuste e virar levam o dado e os valores: a tela mostra o que mudou
    if (c === 'ajuste') {
      const d = j.mesa[idx], antes = d.v; d.v = Math.min(6, Math.max(1, d.v + (delta < 0 ? -1 : 1)));
      registrar(j, p, `usou Ajuste: o ${antes} da Mesa virou ${d.v}`, 'seg'); emitir(j, 'virar', { id: d.id });
      Object.assign(ev, { id: d.id, antes, depois: d.v });
    } else if (c === 'virar') {
      const d = j.mesa[idx], antes = d.v; d.v = 7 - d.v;
      registrar(j, p, `usou Virar: o ${antes} da Mesa virou ${d.v}`, 'seg'); emitir(j, 'virar', { id: d.id });
      Object.assign(ev, { id: d.id, antes, depois: d.v });
      if (j.marca && j.marca.id === d.id) desfazerEspelho(j, p);
    } else if (c === 'rerrolar') {
      j.mesa.forEach(d => { d.v = rolar(j); d.novo = true; }); emitir(j, 'rolar');
      registrar(j, p, 'usou Rerrolar: a Mesa foi rolada de novo', 'seg');
      if (j.marca) desfazerEspelho(j, p);
    } else if (c === 'pressa') { j.extra[p] = 1; registrar(j, p, 'usou Pressa: pega dois dados nesta vez', 'seg'); }
    else if (c === 'coringa') { j.coringa[p] = true; registrar(j, p, 'usou Coringa: o próximo dado que romperia troca a frente', 'seg'); }
    else if (c === 'sobrecarga') { j.sobre[p] = true; registrar(j, p, 'usou Sobrecarga: o próximo disparo de 4+ vale +2', 'seg'); }
    else if (c === 'reverso') {
      j.cor[p].reverse();
      registrar(j, p, `usou Reverso: a frente da corrente agora é ${frente(j.cor[p])}`, 'seg');
      ev.frente = frente(j.cor[p]);
    } else if (c === 'furto') {
      const meu = j.bolso[p], dele = j.bolso[1 - p];
      j.bolso[p] = dele; j.bolso[1 - p] = meu;   // não passa por colocar(): não é "guardar" (o Fundo Falso não pega)
      registrar(j, p, `usou Furto: ${meu === null ? 'o Bolso vazio' : 'o ' + meu} pelo ${dele === null ? 'Bolso vazio' : dele} do rival`, 'seg');
      Object.assign(ev, { meu, dele });
    } else if (c === 'pausa') {
      registrar(j, p, `usou Pausa: passou a vez com a corrente de ${j.cor[p].length}`, 'seg');
      emitir(j, 'carta', ev);
      proximo(j);
      return 'proximo';
    }
    emitir(j, 'carta', ev);
  }
  function desfazerEspelho(j, quem) {
    const dono = j.marca.dono, n = j.nomes;
    j.marca = null; j.cartas[dono].espelho = 'perdida'; j.armada[dono] = null;
    registrar(j, dono, `perdeu o Espelho: ${dono === quem ? 'o próprio dado marcado mudou' : n[quem] + ' desfez a marca'}`, 'seg');
    if (dono !== quem) { emitir(j, 'chamada', { p: quem, titulo: 'Marca desfeita', sub: `${n[quem]} livrou o dado do Espelho`, estilo: 'suave' }); momento(j, quem, '✦', 'Desfez a marca de um Espelho'); }
  }
  function revelar(j, p, c, txt) {
    j.cartas[p][c] = 'usada'; j.armada[p] = null; j.stats[p].cartas.push(CARTAS[c].nome);
    registrar(j, p, `revelou ${CARTAS[c].nome}: ${txt}`, 'seg');
    emitir(j, 'revelou', { p, c, txt });
    if (c !== 'ancora') momento(j, p, '✧', `${CARTAS[c].nome} pegou o rival`);
    emitir(j, 'falar', { chave: c !== 'ancora' ? 'armadilha' : null, dono: p });
  }

  // ---------- a vez ----------
  function tirar(j, p, idx) {
    const d = j.mesa[idx], n = j.nomes;
    j.voo = { id: d.id, v: d.v, p };
    const ele = j.cor[1 - p];
    if (ele.length >= 3 && encaixa(ele, d.v) && j.mesa.filter(x => encaixa(ele, x.v)).length === 1) {
      emitir(j, 'bloqueio', { p }); momento(j, p, '✦', `Bloqueio: levou o único dado que servia a ${n[1 - p]}`);
    }
    let v = d.v;
    j.mesa.splice(idx, 1); j.compras++; j.stats[p].compras++;
    emitir(j, 'pegar', { p });
    if (j.marca && j.marca.id === d.id) {
      const dono = j.marca.dono; j.marca = null;
      if (dono !== p) { v = 7 - d.v; j.espelhado = true; j.voo.v = v; revelar(j, dono, 'espelho', `o ${d.v} que ${n[p]} pegou virou ${v} e não pode ir para o Bolso.`); }
      else {
        j.cartas[p].espelho = 'perdida'; j.armada[p] = null;
        registrar(j, 1 - p, `se esquivou do Espelho: ${n[p]} teve de pegar o próprio dado marcado (${d.v})`, 'seg');
        emitir(j, 'chamada', { p: 1 - p, titulo: 'Esquiva!', sub: `${n[1 - p]} não caiu no Espelho`, estilo: 'esquiva' });
        momento(j, 1 - p, '↺', 'Se esquivou de um Espelho');
      }
    }
    return v;
  }
  // pega o dado idx: se só há um destino que não rompe (ou nenhum e o Bolso não salva), coloca direto;
  // senão, a partida fica esperando a escolha ('destino'). Devolve o mesmo que colocar(), ou 'destino'.
  function pegar(j, p, idx) {
    const v = tirar(j, p, idx);
    const ds = destinos(j, p, v);
    if (ds.length === 1) return colocar(j, p, v, ds[0]);
    if (!ds.length && (j.bolso[p] === null || j.espelhado)) return colocar(j, p, v, 'corrente');
    j.mao = { v }; j.fase = 'destino';
    return 'destino';
  }
  // destinos possíveis quando não há nenhum seguro: a corrente rompe, ou o dado do Bolso entra e rompe
  const destinosValidos = (j, p, v) => { const ds = destinos(j, p, v); return ds.length ? ds : (j.bolso[p] !== null && !j.espelhado ? ['corrente', 'trocar'] : ['corrente']); };
  // os destinos de um dado AINDA na Mesa, como ficarão depois de pegá-lo: o dado com o Espelho do rival
  // chega virado e só pode ir para a corrente. Serve para escolher o dado e o destino de uma vez só.
  function destinosDoDado(j, p, idx) {
    const d = j.mesa[idx];
    if (!d) return [];
    if (marcadoContra(j, p, d)) return ['corrente'];
    return destinosValidos(j, p, d.v);
  }
  // pega o dado idx e já o põe no destino escolhido (nada fica pela metade: a escolha só vale quando confirmada)
  function pegarPara(j, p, idx, modo) {
    const v = tirar(j, p, idx);
    return colocar(j, p, v, modo);
  }

  // Põe o dado v no destino. Devolve 'extra' (Pressa), 'decidir', 'proximo' ou 'fim'.
  function colocar(j, p, v, modo) {
    const eu = j.cor[p];
    j.mao = null; j.espelhado = false;
    let entra = v, deOnde = '';
    const salvouPeloBolso = modo === 'trocar' && !encaixaP(j, p, v) && eu.length >= 3;
    if ((modo === 'guardar' || modo === 'trocar') && j.armada[1 - p] === 'fundo') {
      const caiu = modo === 'trocar' ? `o ${v} e o ${j.bolso[p]} do Bolso caíram` : `o ${v} caiu do Bolso`;
      j.bolso[p] = null; entra = null;
      revelar(j, 1 - p, 'fundo', `${caiu}.`);
      if (j.voo) j.voo.para = 'nada';
    } else if (modo === 'guardar') {
      j.bolso[p] = v; entra = null; j.stats[p].guardou++;
      registrar(j, p, `guardou ${v} no Bolso`); emitir(j, 'bolso', { p });
      if (j.voo) j.voo.para = 'bolso';
    } else if (modo === 'trocar') {
      entra = j.bolso[p]; j.bolso[p] = v; j.stats[p].trocou++; deOnde = ' do Bolso';
      registrar(j, p, `guardou ${v} no Bolso e tirou o ${entra}`); emitir(j, 'troca', { p });
      if (j.voo) j.voo.para = 'bolso';
    } else if (j.voo) j.voo.para = 'corrente';
    if (entra !== null) {
      if (encaixaP(j, p, entra)) {
        const r = eu.length ? rels(frente(eu), entra) : [];
        const viaCoringa = eu.length && !r.length && j.coringa[p];
        // o Coringa só é gasto num dado que entra numa corrente já começada (o primeiro dado não precisa dele)
        if (eu.length) j.coringa[p] = false;
        // pelo Coringa, o dado troca a frente: a corrente fica do mesmo tamanho (v0.12)
        const trocada = viaCoringa ? eu[eu.length - 1] : null;
        if (viaCoringa) eu[eu.length - 1] = entra; else eu.push(entra);
        registrar(j, p, viaCoringa ? `pôs ${entra}${deOnde} · Coringa: trocou a frente ${trocada} · corrente de ${eu.length}`
          : `pôs ${entra}${deOnde} · ${r.length ? r.map(k => REL[k].nome).join(' + ') : 'começa a corrente'} · corrente de ${eu.length}`);
        emitir(j, 'elo', { p, n: eu.length, coringa: !!viaCoringa });
        if (salvouPeloBolso) { emitir(j, 'salvo', { p, txt: 'O Bolso salvou a corrente' }); momento(j, p, '❀', `O Bolso salvou uma corrente de ${eu.length - 1}`); }
      } else if (j.armada[p] === 'ancora' && eu.length >= 4) {
        revelar(j, p, 'ancora', `o ${entra} não sincronizava com ${frente(eu)}: foi descartado e a corrente de ${eu.length} ficou.`);
        emitir(j, 'salvo', { p, txt: 'A Âncora segurou a corrente' }); momento(j, p, '❀', `A Âncora salvou uma corrente de ${eu.length}`);
      } else {
        const perdida = eu.slice();
        j.stats[p].rupt++;
        j.cor[p] = [];
        j.fx = { id: novoId(j), p, tipo: 'ruptura', dados: perdida.concat(entra) };
        registrar(j, p, `pôs ${entra}${deOnde}, que não sincroniza com ${frente(perdida)}: a corrente de ${perdida.length} rompeu`, 'ruim');
        emitir(j, 'ruptura', { p, L: perdida.length });
        if (perdida.length >= 3) emitir(j, 'falar', { chave: 'minhaRuptura', dono: p });
      }
    }
    const L = j.cor[p].length;
    const segue = j.extra[p] > 0 && j.mesa.length > 0;
    if (L >= LIM) {
      // com 6 a corrente dispara sozinha; se a Pressa ainda tem o segundo dado, ele começa uma corrente nova
      if (!segue) { j.extra[p] = 0; j.segundoDado = false; return disparar(j, p, true); }
      if (disparar(j, p, true, true) === 'fim') return 'fim';
    }
    if (segue) { j.extra[p]--; j.fase = 'pegar'; j.segundoDado = true; return 'extra'; }
    j.extra[p] = 0; j.segundoDado = false;
    if (j.cor[p].length >= 3) { j.fase = 'decidir'; return 'decidir'; }
    proximo(j);
    return 'proximo';
  }
  // o segundo dado da Pressa é opcional: dispensar leva direto à decisão (ou passa a vez)
  function dispensarSegundo(j, p) {
    j.extra[p] = 0; j.segundoDado = false;
    registrar(j, p, 'dispensou o segundo dado da Pressa');
    if (j.cor[p].length >= 3) { j.fase = 'decidir'; return 'decidir'; }
    proximo(j);
    return 'proximo';
  }

  function disparar(j, p, auto = false, segue = false) {
    const cor = j.cor[p], L = cor.length, n = j.nomes, antes = j.pts.slice();
    let ganho = pontos(L), extra = '';
    if (j.sobre[p] && L >= 4) { ganho += 2; j.sobre[p] = false; extra = ' com Sobrecarga'; }
    // Interferência (v0.11): só freia quem está na frente ou empatado (o placar de antes do disparo). Valendo sempre,
    // ela estava em 15 dos 20 decks mais fortes da meta 12 (docs/balanceamento-cartas.md §12)
    if (L >= 4 && j.armada[1 - p] === 'interferencia' && j.pts[p] >= j.pts[1 - p]) {
      const a = ganho; ganho = Math.max(0, ganho - 1);
      revelar(j, 1 - p, 'interferencia', `o disparo de ${L} de ${n[p]} valeu +${ganho} em vez de +${a}.`);
    }
    const harm = harmonica(cor);
    j.pts[p] += ganho;
    j.stats[p].disp++; j.stats[p].maior = Math.max(j.stats[p].maior, L); j.stats[p].maiorDisp = Math.max(j.stats[p].maiorDisp, ganho);
    j.fx = { id: novoId(j), p, tipo: 'disparo', dados: cor.slice(), ganho };
    j.cor[p] = [];
    registrar(j, p, `${auto ? 'completou 6 e disparou' : 'disparou'} uma corrente de ${L}${extra}: +${ganho} (total ${j.pts[p]})`, 'bom');
    emitir(j, 'disparo', { p, L, ganho, harm, de: antes[p] });
    if (L === 6) momento(j, p, '★', 'Sinfonia: corrente completa de 6');
    else if (L === 5) momento(j, p, '♪', 'Disparou uma corrente de 5');
    if (harm) momento(j, p, '✿', `Harmonia: todos os elos em ${REL[harm].nome}`);
    if (L >= 4) emitir(j, 'falar', { chave: 'disparo', dono: p, L });
    if (j.armada[1 - p] === 'pedagio') { const ganho = pedagioDe(j.meta); j.pts[1 - p] += ganho; revelar(j, 1 - p, 'pedagio', `${n[1 - p]} ganhou ${ganho} pontos com o disparo de ${n[p]}.`); emitir(j, 'placar', { p: 1 - p, de: antes[1 - p] }); }
    [0, 1].forEach(k => { j.piorDiferenca[k] = Math.min(j.piorDiferenca[k], j.pts[k] - j.pts[1 - k]); });
    if (j.pts[p] >= j.meta) { terminar(j, p); return 'fim'; }
    if (j.pts[1 - p] >= j.meta) { terminar(j, 1 - p); return 'fim'; }
    if (segue) return 'segue';
    proximo(j);
    return 'proximo';
  }
  function segurar(j, p) { registrar(j, p, `segurou a corrente de ${j.cor[p].length}`); proximo(j); return 'proximo'; }

  function proximo(j) {
    j.fase = 'pegar'; j.segundoDado = false; j.extra = [0, 0]; j.vezes = (j.vezes || 0) + 1;
    j.vez = 1 - j.vez;
    if (!j.mesa.length) {
      rolarMesa(j); registrar(j, null, `Mesa vazia: cinco dados novos (rodada ${j.rodada}).`, 'sis');
      // quem está atrás no placar abre a Mesa nova (ajuda a virar: 24% → 35% na simulação)
      if (j.pts[0] !== j.pts[1]) { const atras = j.pts[0] < j.pts[1] ? 0 : 1; j.vez = atras; registrar(j, atras, 'está atrás e abre a Mesa', 'sis'); }
    }
  }
  function terminar(j, p) {
    j.fase = 'fim'; j.vencedor = p;
    j.mao = null; j.espelhado = false; j.segundoDado = false; j.extra = [0, 0];   // nada fica pela metade
    const virada = j.piorDiferenca[p] <= -4;
    if (virada) momento(j, p, '☾', `Virada: ${j.nomes[p]} esteve ${-j.piorDiferenca[p]} pontos atrás`);
    emitir(j, 'fim', { p, virada });
  }
  function desistir(j, p) {
    if (j.fase === 'fim') return;
    registrar(j, p, 'saiu da partida', 'ruim');
    j.desistencia = p;
    terminar(j, 1 - p);
  }

  // ---------- ação genérica (o servidor recebe isto pela rede) ----------
  // acao: {tipo:'pegar', idx, modo?} (com modo: pega e põe de uma vez) | {tipo:'destino', modo} | {tipo:'carta', carta, idx?, delta?} | {tipo:'virar', carta} (blefe)
  //       | {tipo:'dispensar'} (2.º dado da Pressa) | {tipo:'disparar'} | {tipo:'segurar'} | {tipo:'desafiar'} (a carta virada do rival)
  function aplicar(j, p, acao) {
    if (!acao || typeof acao !== 'object') return { ok: false, erro: 'ação inválida' };
    if (j.fase === 'fim') return { ok: false, erro: 'a partida acabou' };
    if (j.vez !== p) return { ok: false, erro: 'não é a sua vez' };
    const idxValido = i => Number.isInteger(i) && i >= 0 && i < j.mesa.length;
    switch (acao.tipo) {
      case 'pegar':
        if (j.fase !== 'pegar' || !idxValido(acao.idx)) return { ok: false, erro: 'não dá para pegar esse dado agora' };
        if (acao.modo !== undefined) {
          if (!destinosDoDado(j, p, acao.idx).includes(acao.modo)) return { ok: false, erro: 'destino inválido para esse dado' };
          return { ok: true, resultado: pegarPara(j, p, acao.idx, acao.modo) };
        }
        return { ok: true, resultado: pegar(j, p, acao.idx) };
      case 'destino': {
        if (j.fase !== 'destino' || !j.mao) return { ok: false, erro: 'não há dado esperando destino' };
        if (!destinosValidos(j, p, j.mao.v).includes(acao.modo)) return { ok: false, erro: 'destino inválido' };
        return { ok: true, resultado: colocar(j, p, j.mao.v, acao.modo) };
      }
      case 'carta': {
        const c = acao.carta, k = tem(CARTAS, c) && CARTAS[c];
        if (!k) return { ok: false, erro: 'carta desconhecida' };
        if (k.alvo && !idxValido(acao.idx)) return { ok: false, erro: 'escolha um dado da Mesa' };
        const pu = podeUsar(j, p, c, acao.idx);
        if (!pu.ok) return { ok: false, erro: pu.motivo || 'não dá para usar agora' };
        if (c === 'ajuste') { const d = j.mesa[acao.idx]; const nv = d.v + (acao.delta < 0 ? -1 : 1); if (nv < 1 || nv > 6) return { ok: false, erro: 'o dado ficaria fora de 1 a 6' }; }
        const r = usarCarta(j, p, c, acao.idx, acao.delta);
        return { ok: true, resultado: r === 'proximo' ? 'proximo' : 'carta' };
      }
      case 'virar': {
        const pv = podeVirar(j, p, acao.carta);
        if (!pv.ok) return { ok: false, erro: pv.motivo || 'não dá para virar essa carta' };
        virarCarta(j, p, acao.carta);
        return { ok: true, resultado: 'carta' };
      }
      case 'desafiar': {
        const pd = podeDesafiar(j, p);
        if (!pd.ok) return { ok: false, erro: pd.motivo };
        return { ok: true, resultado: desafiar(j, p) };
      }
      case 'dispensar':
        if (j.fase !== 'pegar' || !j.segundoDado) return { ok: false, erro: 'não há segundo dado para dispensar' };
        return { ok: true, resultado: dispensarSegundo(j, p) };
      case 'disparar':
        if (j.fase !== 'decidir' || j.cor[p].length < 3) return { ok: false, erro: 'não dá para disparar agora' };
        return { ok: true, resultado: disparar(j, p) };
      case 'segurar':
        if (j.fase !== 'decidir') return { ok: false, erro: 'não dá para segurar agora' };
        return { ok: true, resultado: segurar(j, p) };
      default:
        return { ok: false, erro: 'ação desconhecida' };
    }
  }

  // ---------- visão de um jogador (o servidor manda isto; o rival não vê qual armadilha você armou) ----------
  // Reordena para que quem vê seja sempre o índice 0, e esconde a armadilha armada do rival (menos o Espelho, cuja marca é pública).
  function visaoDe(j, eu) {
    const t = JSON.parse(JSON.stringify(j));
    const troca = a => (eu === 0 ? a : [a[1], a[0]]);
    const ip = p => (p === null || p === undefined ? p : eu === 0 ? p : 1 - p);
    for (const k of ['decks', 'cartas', 'armada', 'coringa', 'sobre', 'extra', 'cor', 'pts', 'bolso', 'stats', 'piorDiferenca', 'nomes', 'revelada', 'viradaEm']) if (t[k]) t[k] = troca(t[k]);
    t.vez = ip(t.vez); t.vencedor = ip(t.vencedor);
    if (t.desistencia !== undefined) t.desistencia = ip(t.desistencia);
    if (t.marca) t.marca.dono = ip(t.marca.dono);
    if (t.fx) t.fx.p = ip(t.fx.p);
    if (t.voo) t.voo.p = ip(t.voo.p);
    t.log = t.log.map(l => ({ ...l, p: ip(l.p) }));
    t.momentos = t.momentos.map(m => ({ ...m, p: ip(m.p) }));
    t.eventos = t.eventos.map(e => ({ ...e, p: ip(e.p), dono: ip(e.dono) }));
    // o rival: armadilha armada escondida
    // (a armadilha que foi desafiada fica à vista: o rival já pagou para ver)
    if (t.armada[1] && t.armada[1] !== 'espelho' && !(t.revelada && t.revelada[1])) {
      t.cartas[1][t.armada[1]] = 'pronta';
      t.armada[1] = 'oculta';
    }
    t.eventos = t.eventos.map(e => (e.tipo === 'armou' && e.p === 1 && e.c !== 'espelho' ? { ...e, c: null } : e));
    // as estatísticas do rival vão por lista do que pode ir (um contador novo não vaza sozinho); os blefes nunca vão,
    // nem no fim: contar os blefes dele entregaria qual "?" era blefe
    const s = t.stats[1];
    t.stats[1] = { disp: s.disp, rupt: s.rupt, maior: s.maior, maiorDisp: s.maiorDisp, compras: s.compras, guardou: s.guardou, trocou: s.trocou, cartas: s.cartas, blefes: 0 };
    if (t.mao && t.vez !== 0) t.mao = null;
    return t;
  }

  return {
    PONTOS, LIM, NA_MESA, REL, CARTAS, ORDEM, pedagioDe, deckValido, rels, sinc, frente, encaixa, facesQueEncaixam, opcoes, pontos, harmonica,
    GRATIS, PRECO_CARTA, CATALOGO, NIVEIS, PRESENTES, RATING_RIVAL, TETO_MOEDAS, BASE_MOEDAS, TITULOS, tituloDe, nivelDe,
    METAS, META_PADRAO, metaValida, moedasDaVitoria, ajusteRatingOnline, elo, premioSolo, xpDaPartida, ganharXp, precoDe,
    criarPartida, usarRng, encaixaP, destinos, destinosValidos, seguro, bolsoGarante, marcadoContra, valorAoPegar, seguroDado,
    blefando, usavel, armadilhasOcultas, podeUsar, podeVirar, virarCarta, usarCarta, DESAFIO, desafiavel, podeDesafiar, desafiar,
    tirar, pegar, pegarPara, destinosDoDado, colocar, dispensarSegundo, disparar, segurar, proximo, terminar, desistir, aplicar, visaoDe,
  };
});
