// Dice Duel · salas e partidas online
// O servidor é a autoridade: guarda o estado inteiro da partida, aplica as ações com o mesmo motor do
// cliente (shared/regras.js) e manda a cada jogador só a visão dele (Regras.visaoDe: sem a armadilha do rival).
// Convite por link: quem cria a sala recebe um código; o amigo abre /?sala=CODIGO.
'use strict';
const crypto = require('crypto');
const Regras = require('../shared/regras');
const { perfil } = require('./banco');

const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O e 1/I, para ditar por voz
const novoCodigo = () => Array.from(crypto.randomBytes(6), b => LETRAS[b % LETRAS.length]).join('');
// dados do servidor com sorteio criptográfico (o Math.random do V8 é previsível com rolagens suficientes)
const aleatorio = () => crypto.randomInt(0, 2 ** 32) / 2 ** 32;
// desistir antes desta mesa não mexe no rating (contra contas descartáveis que desistem no primeiro lance)
const MESAS_PARA_VALER = 3;
const PARTIDAS_POR_PAR = 3; // por dia, valendo rating e moedas (contra duas contas combinando resultado)

// ritmo da sala (escolhido ao criar): o tempo de cada vez. Rápida, o padrão: 2 min. Política de AFK, só na vez de cada um:
// sem sinal de vida (tocar na tela, jogar, voltar para o app, reconectar) por metade do tempo da vez, o jogo pergunta
// "Você ainda está aí?"; sem resposta em até 30 s (um quarto da vez, nos ritmos curtos), derrota por inatividade. No
// Rápida: aviso aos 60 s, derrota aos 90 s parado. Quem está ativo e não joga perde quando a vez acaba (2 min). Queda de
// internet é a mesma coisa (sem conexão, não há sinal de vida): 90 s sem voltar na própria vez, derrota. Na vez do rival,
// nada disso conta. Ninguém joga por ninguém e ninguém perde a vez.
const RITMOS = { relampago: 60_000, rapida: 120_000, calma: 180_000 };
const RITMO_PADRAO = 'rapida';
const ritmoValido = r => (typeof r === 'string' && Object.hasOwn(RITMOS, r) ? r : RITMO_PADRAO);

const PADRAO = {
  limiteVez: null,          // null: o tempo da vez vem do ritmo da sala (RITMOS); um número fixa o mesmo para todas (testes)
  respostaAfk: 30_000,      // depois do "Você ainda está aí?": o tempo para responder (no máximo um quarto da vez)
  salaParada: 30 * 60_000,  // sala sem ninguém conectado some
  conviteValido: 24 * 3600_000,
  escolha: 60_000,          // preparação: tempo para os dois escolherem o deck antes de cada partida (acaba antes se os dois confirmarem)
};

class Salas {
  // banco: servidor/banco.js; trava(id, fn): serializa mudanças numa conta (app.js)
  constructor({ banco, trava, tempos = {}, agora = Date.now, aoMudarConta = () => {} }) {
    this.banco = banco; this.trava = trava; this.agora = agora; this.aoMudarConta = aoMudarConta;
    this.t = { ...PADRAO, ...tempos };
    this.salas = new Map();
    // a cada segundo (ou mais vezes, nos testes com vezes curtas): o tempo que acaba é conferido com pouco atraso
    this.relogio = setInterval(() => this.verificar(), Math.min(1000, (this.t.limiteVez || 60_000) / 8)).unref();
  }
  fechar() { clearInterval(this.relogio); }

  // o tempo da vez desta sala (o do ritmo dela, ou o fixo dos testes)
  limiteDe(sala) { return this.t.limiteVez || RITMOS[sala.ritmo] || RITMOS[RITMO_PADRAO]; }
  // AFK: o aviso vem com metade da vez parada; a resposta tem 30 s (ou um quarto da vez, se for menos)
  afkDe(sala) { const L = this.limiteDe(sala); return { aviso: L / 2, resposta: Math.min(this.t.respostaAfk, L / 4) }; }
  // há quanto tempo quem tem a vez está sem sinal de vida (contado desde o começo da vez)
  paradoHa(sala) { const jg = sala.jogadores[sala.jogo.vez]; return this.agora() - Math.max(sala.vezDesde, jg.vivoEm || 0); }
  // a pergunta "Você ainda está aí?" em andamento: quanto falta para a derrota (ms), ou null
  pergunta(sala) {
    const j = sala.jogo; if (!j || j.fase === 'fim' || !sala.vezDesde) return null;
    const { aviso, resposta } = this.afkDe(sala), parado = this.paradoHa(sala);
    return parado >= aviso ? Math.max(0, aviso + resposta - parado) : null;
  }
  // sinal de vida (tocou na tela, respondeu ao aviso, voltou para o app): o jogador continua; se a pergunta estava na
  // tela, ela some para os dois. Só a vez de quem joga importa, mas vale guardar sempre
  ativo(ws, conta) {
    const { sala, assento } = this.onde(ws, conta);
    if (!sala) return;
    this.vivo(sala, sala.jogadores[assento]);
  }
  vivo(sala, jg) {
    jg.vivoEm = this.agora();
    if (sala.perguntando && sala.jogo && sala.jogadores[sala.jogo.vez] === jg) { sala.perguntando = false; sala.jogadores.forEach((_, i) => this.mandarEstado(sala, i)); }
  }
  criar(conta, { meta = Regras.META_PADRAO, ritmo } = {}) {
    // uma sala esperando por conta: criar outra fecha a anterior
    for (const s of this.salas.values()) if (s.dono === conta.id && !s.jogo) { s.fechada = true; this.salas.delete(s.codigo); }
    let codigo; do codigo = novoCodigo(); while (this.salas.has(codigo));
    const sala = { codigo, dono: conta.id, meta: Regras.metaValida(meta), ritmo: ritmoValido(ritmo), criada: this.agora(), mexida: this.agora(), jogadores: [], jogo: null, revanche: new Set(), primeiro: crypto.randomInt(2), fechada: false };
    this.salas.set(codigo, sala);
    return sala;
  }
  resumo(sala) {
    return {
      codigo: sala.codigo, meta: sala.meta, ritmo: sala.ritmo, limiteVez: this.limiteDe(sala), dono: sala.dono,
      jogadores: sala.jogadores.map(j => ({ id: j.id, nome: j.nome, rating: j.rating, icone: j.icone, conectado: !!j.ws, volta: this.volta(sala, j) })),
      estado: sala.escolha ? 'escolhendo' : sala.jogo ? (sala.jogo.fase === 'fim' ? 'fim' : 'jogando') : 'esperando',
    };
  }

  // ---------- mensagens de um jogador (ws já autenticado com a conta) ----------
  async entrar(ws, conta, { sala: codigo, deck }) {
    const sala = this.salas.get(String(codigo || '').toUpperCase());
    // codigo 'sala' (e semSala, que clientes anteriores já entendem): quem estava no meio da partida e voltou
    // depois de um reinício larga a sala em vez de ficar travado
    if (!sala || sala.fechada) { this.enviar(ws, { tipo: 'erro', erro: 'Sala não encontrada. O convite pode ter expirado.', codigo: 'sala', semSala: true }); return null; }
    if (!Array.isArray(deck) || !Regras.deckValido(deck)) return this.erro(ws, 'Deck inválido.', 'sala');
    const faltam = deck.filter(c => !conta.cartas.includes(c));
    if (faltam.length) return this.erro(ws, 'Seu deck tem cartas que esta conta não possui.', 'sala');
    const outra = this.partidaDe(conta.id);
    if (outra && outra !== sala) return this.erro(ws, `Você já está numa partida (sala ${outra.codigo}). Termine ou desista dela primeiro.`, 'sala');
    // um socket fica numa sala só; reenviar "entrar" pela mesma conexão só reenvia o estado (sem contar como queda)
    const jaAqui = ws.sala === sala.codigo && sala.jogadores.some(j => j.ws === ws && j.id === conta.id);
    if (!jaAqui) this.sair(ws, { silencioso: true });
    let eu = sala.jogadores.find(j => j.id === conta.id);
    if (!eu) {
      if (sala.jogadores.length >= 2) return this.erro(ws, 'Esta sala já está cheia.', 'sala');
      eu = { id: conta.id, nome: conta.nome, rating: conta.rating, icone: conta.ativo.icone, dado: conta.ativo.dado, deck: deck.slice(), ws: null, caiuEm: null };
      sala.jogadores.push(eu);
    } else if (!sala.jogo || sala.jogo.fase === 'fim') eu.deck = deck.slice();
    if (eu.ws && eu.ws !== ws) { this.enviar(eu.ws, { tipo: 'erro', erro: 'Você entrou nesta sala por outra janela.', codigo: 'sala' }); eu.ws.sala = null; }
    // voltou de uma queda: o tempo da vez não parou; voltar é sinal de vida (a pergunta de AFK, se havia, some)
    eu.ws = ws; eu.caiuEm = null; ws.sala = sala.codigo;
    eu.vivoEm = this.agora(); sala.perguntando = false;
    sala.mexida = this.agora();
    if (sala.jogadores.length === 2 && !sala.jogo && !sala.escolha) this.iniciarEscolha(sala);
    else {
      this.avisarSala(sala);
      if (sala.escolha) this.enviar(ws, this.msgEscolha(sala, sala.jogadores.indexOf(eu)));
      if (sala.jogo) {
        const assento = sala.jogadores.indexOf(eu);
        // no meio da partida, os dois recebem o estado (o relógio da vez pode ter parado durante a queda)
        if (sala.jogo.fase !== 'fim') sala.jogadores.forEach((_, i) => this.mandarEstado(sala, i));
        else this.mandarEstado(sala, assento);
        // quem volta depois do fim (por exemplo, depois de perder por W.O.) também recebe o resultado
        if (sala.jogo.fase === 'fim' && sala.resultado) this.enviar(ws, this.msgFim(sala, assento));
      }
    }
    return sala;
  }
  async acao(ws, conta, acao) {
    const { sala, assento } = this.onde(ws, conta);
    if (!sala || !sala.jogo) return this.erro(ws, 'Nenhuma partida em andamento.');
    const vezAntes = sala.jogo.vez, rodadaAntes = sala.jogo.rodada;
    const r = Regras.aplicar(sala.jogo, assento, acao);
    if (!r.ok) { this.erro(ws, r.erro); this.mandarEstado(sala, assento); return; }
    sala.mexida = this.agora();
    sala.jogadores[assento].vivoEm = this.agora(); sala.perguntando = false;   // jogar é sinal de vida
    // o tempo da vez recomeça quando a vez passa e também na Mesa nova (que pode começar com quem fechou a anterior)
    if (sala.jogo.vez !== vezAntes || sala.jogo.rodada !== rodadaAntes) this.novaVez(sala);
    await this.depoisDaAcao(sala);
  }
  async desistir(ws, conta) {
    const { sala, assento } = this.onde(ws, conta);
    if (!sala || !sala.jogo || sala.jogo.fase === 'fim') return;
    Regras.desistir(sala.jogo, assento);
    await this.depoisDaAcao(sala);
  }
  revanche(ws, conta, { deck } = {}) {
    const { sala, assento } = this.onde(ws, conta);
    if (!sala || !sala.jogo || sala.jogo.fase !== 'fim' || sala.jogadores.length < 2) return;
    if (!sala.jogadores[1 - assento].ws) return this.erro(ws, `${sala.jogadores[1 - assento].nome} saiu da sala.`);
    if (Array.isArray(deck) && Regras.deckValido(deck) && deck.every(c => conta.cartas.includes(c))) sala.jogadores[assento].deck = deck.slice();
    sala.revanche.add(assento);
    if (sala.revanche.size === 2) this.iniciarEscolha(sala);
    else this.avisarSala(sala, { revanche: [...sala.revanche] });
  }
  sair(ws, { silencioso = false } = {}) {
    const sala = ws.sala && this.salas.get(ws.sala);
    ws.sala = null;
    if (!sala) return;
    const eu = sala.jogadores.find(j => j.ws === ws);
    if (!eu) return;
    eu.ws = null;
    const emJogo = sala.jogo && sala.jogo.fase !== 'fim';
    if (emJogo) {
      // saiu de propósito no meio: perde já
      // devolve a promessa do prêmio: quem apaga a conta espera o resultado ser registrado antes de sumir
      if (!silencioso) { Regras.desistir(sala.jogo, sala.jogadores.indexOf(eu)); return this.depoisDaAcao(sala).catch(e => console.error('sair', e)); }
      else eu.caiuEm = this.agora();
    } else if (!sala.jogo) {
      sala.jogadores = sala.jogadores.filter(j => j !== eu); // ainda esperando: libera a vaga
    }
    this.cancelarEscolha(sala, `${eu.nome} saiu da sala.`);
    sala.revanche.clear();
    this.avisarSala(sala);
  }
  // a conexão caiu (não foi um "sair"): espera um pouco antes do W.O.
  caiu(ws) {
    const sala = ws.sala && this.salas.get(ws.sala);
    if (!sala) return;
    const eu = sala.jogadores.find(j => j.ws === ws);
    if (!eu) return;
    eu.ws = null; eu.caiuEm = this.agora();
    if (!sala.jogo) sala.jogadores = sala.jogadores.filter(j => j !== eu);
    this.cancelarEscolha(sala, `A conexão de ${eu.nome} caiu.`);
    this.avisarSala(sala);
  }

  // ---------- preparação: os dois escolhem o deck ao mesmo tempo ----------
  // Cada um vê o próprio deck; do rival, só quantas cartas já escolheu e se confirmou (nunca quais): ninguém monta o
  // deck "contra" o do outro. Começa quando os dois confirmam ou quando o tempo acaba (com o que cada um tiver escolhido).
  iniciarEscolha(sala) {
    if (!(this.t.escolha > 0)) return this.comecar(sala);   // escolha: 0 desliga a preparação (testes que cuidam de outra coisa)
    const ocupado = sala.jogadores.find(p => { const s = this.partidaDe(p.id); return s && s !== sala; });
    if (ocupado) return this.comecar(sala);   // o comecar já trata quem está em outra partida
    sala.revanche.clear();
    sala.escolha = { ate: this.agora() + this.t.escolha, decks: sala.jogadores.map(p => p.deck.slice()), prontos: [false, false] };
    sala.mexida = this.agora();
    this.avisarSala(sala);
    sala.jogadores.forEach((jg, i) => this.enviar(jg.ws, this.msgEscolha(sala, i)));
  }
  msgEscolha(sala, i) {
    const e = sala.escolha, rival = sala.jogadores[1 - i];
    return { tipo: 'escolha', prazo: Math.max(0, e.ate - this.agora()), total: this.t.escolha, meta: sala.meta, ritmo: sala.ritmo,
      eu: { deck: e.decks[i].slice(), pronto: e.prontos[i] },
      rival: { nome: rival ? rival.nome : '', cartas: e.decks[1 - i].length, pronto: e.prontos[1 - i] } };   // do rival, só a contagem
  }
  // deck: a escolha atual; pronto: true confirma (mandar de novo sem pronto desfaz a confirmação)
  escolher(ws, conta, { deck, pronto } = {}) {
    const { sala, assento } = this.onde(ws, conta);
    const aviso = erro => this.enviar(ws, { tipo: 'aviso', erro });   // aviso, não erro: um erro tiraria o jogador da sala
    if (!sala || !sala.escolha || assento === undefined) return aviso('A escolha do deck já acabou.');
    if (!Array.isArray(deck) || !Regras.deckValido(deck) || deck.some(c => !conta.cartas.includes(c))) return aviso('Deck inválido para esta conta.');
    sala.escolha.decks[assento] = deck.slice();
    sala.escolha.prontos[assento] = pronto === true;
    sala.mexida = this.agora();
    if (sala.escolha.prontos.every(Boolean)) return this.fecharEscolha(sala);
    sala.jogadores.forEach((jg, i) => this.enviar(jg.ws, this.msgEscolha(sala, i)));
  }
  fecharEscolha(sala) {
    const e = sala.escolha;
    if (!e) return;
    sala.escolha = null;
    sala.jogadores.forEach((p, i) => { p.deck = e.decks[i].slice(); });
    this.comecar(sala);
  }
  cancelarEscolha(sala, motivo) {
    if (!sala.escolha) return;
    sala.escolha = null;
    sala.jogadores.forEach(jg => this.enviar(jg.ws, { tipo: 'escolha', cancelada: true, motivo }));
  }

  // ---------- partida ----------
  comecar(sala) {
    const [a, b] = sala.jogadores;
    // duas abas da mesma conta esperando em salas diferentes podiam começar duas partidas juntas
    const ocupado = sala.jogadores.find(p => { const s = this.partidaDe(p.id); return s && s !== sala; });
    if (ocupado) {
      this.erro(ocupado.ws, 'Você já está numa partida em outra sala.', 'sala');
      if (ocupado.ws) ocupado.ws.sala = null;
      sala.jogadores = sala.jogadores.filter(p => p !== ocupado);
      return this.avisarSala(sala);
    }
    sala.revanche.clear();
    sala.jogo = Regras.criarPartida({ decks: [a.deck, b.deck], vez: sala.primeiro, meta: sala.meta, nomes: [a.nome, b.nome], modo: 'online', nivel: 'online', rng: aleatorio });
    sala.primeiro = 1 - sala.primeiro;
    sala.partidas = (sala.partidas || 0) + 1;
    sala.premiada = false; sala.resultado = null;
    this.novaVez(sala);
    this.avisarSala(sala);
    this.transmitir(sala);
  }
  novaVez(sala) { sala.vezDesde = this.agora(); sala.perguntando = false; }
  async depoisDaAcao(sala) {
    const fim = sala.jogo.fase === 'fim' && !sala.premiada;
    if (fim) sala.premiada = true;
    if (fim) {
      // o resultado fica guardado na sala: quem voltar depois do fim também o recebe
      try { sala.resultado = { premios: await this.premiar(sala) }; }
      catch (e) { console.error('premiar', e); sala.resultado = { erro: 'A partida acabou, mas o servidor não conseguiu registrar o resultado. Confira rating e moedas no seu perfil.' }; }
    }
    this.transmitir(sala);
    if (fim) sala.jogadores.forEach((jg, i) => this.enviar(jg.ws, this.msgFim(sala, i)));
  }
  msgFim(sala, assento) {
    const r = sala.resultado;
    return r.premios ? { tipo: 'fim', premio: r.premios[assento] } : { tipo: 'fim', premio: null, erro: r.erro };
  }
  // cada jogador recebe a própria visão; os eventos vão uma vez só
  transmitir(sala) {
    sala.jogadores.forEach((_, i) => this.mandarEstado(sala, i));
    sala.jogo.eventos = [];
    // o que é de um momento só (dados novos, o voo do dado, a animação de disparo/ruptura) vai uma vez
    sala.jogo.mesa.forEach(d => { d.novo = false; });
    sala.jogo.voo = null; sala.jogo.fx = null;
  }
  mandarEstado(sala, assento) {
    const jg = sala.jogadores[assento];
    if (!jg || !jg.ws) return;
    const visao = Regras.visaoDe(sala.jogo, assento);
    const outro = sala.jogadores[1 - assento];
    visao.perfis = [
      { nome: jg.nome, rating: jg.rating, icone: jg.icone, dado: jg.dado },
      { nome: outro.nome, rating: outro.rating, icone: outro.icone, dado: outro.dado, conectado: !!outro.ws, volta: this.volta(sala, outro) },
    ];
    visao.sala = sala.codigo;
    visao.partida = sala.partidas;
    visao.prazoVez = sala.jogo.fase === 'fim' ? null : Math.max(0, this.limiteDe(sala) - (this.agora() - sala.vezDesde));
    visao.limiteVez = this.limiteDe(sala); visao.ritmo = sala.ritmo;
    // a pergunta de AFK em andamento: de quem (0 = quem vê) e quanto falta para a derrota
    const falta = this.pergunta(sala);
    visao.inatividade = falta === null ? null : { quem: sala.jogo.vez === assento ? 0 : 1, prazo: falta, resposta: this.afkDe(sala).resposta };
    this.enviar(jg.ws, { tipo: 'estado', jogo: visao });
  }

  // rating para os dois, moedas para quem venceu. W.O. e a 4ª partida do dia entre o mesmo par não rendem moedas.
  async premiar(sala) {
    const j = sala.jogo, w = j.vencedor, ids = sala.jogadores.map(x => x.id);
    const doPar = await this.banco.partidasDoParHoje(ids[0], ids[1]);
    const amistosa = doPar >= PARTIDAS_POR_PAR;
    const porDesistencia = j.desistencia !== undefined;
    const cedo = porDesistencia && j.rodada < MESAS_PARA_VALER;
    const contas = await Promise.all(ids.map(id => this.banco.contaPorId(id)));
    // uma conta pode ter sido apagada no meio (LGPD): quem ficou recebe o prêmio normalmente; a apagada fica sem
    const ratings = contas.map(c => (c ? c.rating : 1000));
    const premios = [null, null];
    let moedasDadas = 0;
    await Promise.all([0, 1].map(i => this.trava(ids[i], async () => {
      const c = await this.banco.contaPorId(ids[i]);
      if (!c) return;
      const venceu = i === w;
      const p = { amistosa, porDesistencia, ratingAntes: c.rating, rating: c.rating, moedas: null, motivo: null };
      // amistosa não soma vitória (o desempate do ranking) nem XP: revanche e desistência em loop não sobem ninguém
      const campos = { partidas: c.partidas + 1, vitorias: c.vitorias + (venceu && !amistosa && !cedo ? 1 : 0) };
      if (cedo && !amistosa) p.motivo = `Desistência antes da ${MESAS_PARA_VALER}ª Mesa não mexe no rating.`;
      else if (!amistosa) {
        campos.rating = Regras.elo(c.rating, ratings[1 - i], venceu ? 1 : 0);
        campos.pico = Math.max(c.pico, campos.rating);
        p.rating = campos.rating;
      } else p.motivo = `Vocês já jogaram ${PARTIDAS_POR_PAR} partidas valendo hoje: esta foi amistosa.`;
      // tarefas do dia (v0.14): amistosa, desistência cedo e quem perdeu por desistência não avançam
      const dia = new Date(this.agora()).toISOString().slice(0, 10);
      const valeTarefa = !amistosa && !cedo && !(porDesistencia && !venceu);
      const tarefas = Regras.avancarTarefas(c.extras && c.extras.tarefas, dia, valeTarefa ? Regras.resumoTarefas(j, i) : null);
      if (venceu) {
        const m = Regras.moedasDaVitoria(Regras.BASE_MOEDAS.online, j.pts[i] - j.pts[1 - i], j.rodada, j.meta, Regras.ajusteRatingOnline(ratings[i], ratings[1 - i]));
        if (porDesistencia) { m.total = 0; p.motivo = cedo ? `Desistência antes da ${MESAS_PARA_VALER}ª Mesa: não mexe no rating nem rende moedas.` : 'Vitória por desistência não rende moedas.'; }
        if (amistosa) m.total = 0;
        Regras.dobrarPrimeiraVitoria(tarefas.estado, m);
        p.moedas = m; moedasDadas = m.total;
      }
      campos.moedas = c.moedas + (p.moedas ? p.moedas.total : 0) + tarefas.moedas;
      campos.extras = { ...(c.extras || {}), tarefas: tarefas.estado };
      p.tarefas = { concluidas: tarefas.concluidas, moedas: tarefas.moedas };
      const conta = { xp: c.xp, dados: c.dados.slice(), icones: c.icones.slice(), mesas: c.mesas.slice() };
      const xp = Regras.ganharXp(conta, (porDesistencia && !venceu) || amistosa || cedo ? 0 : Regras.xpDaPartida(venceu, j.momentos.filter(m => m.p === i).length));
      Object.assign(campos, { xp: conta.xp, dados: conta.dados, icones: conta.icones, mesas: conta.mesas });
      Object.assign(p, xp);
      const nova = await this.banco.atualizarConta(c.id, campos);
      sala.jogadores[i].rating = nova.rating;
      p.conta = perfil(nova);
      premios[i] = p;
      this.aoMudarConta(nova);
    })));
    // as contas já foram atualizadas: uma falha só no histórico não pode virar "nada foi registrado"
    try { await this.banco.registrarPartida({ a: ids[0], b: ids[1], vencedor: ids[w], placar: `${j.pts[0]}-${j.pts[1]}`, rodadas: j.rodada, moedas: moedasDadas }); }
    catch (e) { console.error('registrarPartida', e); }
    return premios;
  }

  // ---------- relógio: quedas, vez parada, salas esquecidas ----------
  verificar() {
    const agora = this.agora();
    for (const sala of this.salas.values()) {
      if (sala.escolha && agora >= sala.escolha.ate) { this.fecharEscolha(sala); continue; }
      const j = sala.jogo, emJogo = j && j.fase !== 'fim';
      if (emJogo) {
        // a vez acabou: perde por tempo. Parado (sem sinal de vida) por metade da vez: a pergunta "Você ainda está aí?"
        // vai para os dois; sem resposta no prazo, derrota por inatividade (ou por queda, se estava sem conexão)
        const daVez = sala.jogadores[j.vez], { aviso, resposta } = this.afkDe(sala), parado = this.paradoHa(sala);
        const acabou = agora - sala.vezDesde >= this.limiteDe(sala), inativo = parado >= aviso + resposta;
        if (acabou || inativo) {
          Regras.desistir(j, j.vez, inativo ? (daVez.ws ? 'inativo' : 'queda') : 'tempo');
          this.depoisDaAcao(sala).catch(e => console.error('verificar', e));
          continue;
        }
        if (parado >= aviso && !sala.perguntando) { sala.perguntando = true; sala.jogadores.forEach((_, i) => this.mandarEstado(sala, i)); }
      }
      const alguem = sala.jogadores.some(x => x.ws);
      if ((!alguem && agora - sala.mexida > this.t.salaParada) || (!j && agora - sala.criada > this.t.conviteValido)) {
        sala.fechada = true; this.salas.delete(sala.codigo);
      }
    }
  }

  // ---------- utilidades ----------
  // onde uma conta está agora (para a lista de amigos): 'jogando', 'esperando' (na própria sala, sem rival ainda) ou null
  estadoDe(id) {
    let estado = null;
    for (const sala of this.salas.values()) {
      const jg = sala.jogadores.find(j => j.id === id && j.ws);
      if (!jg) continue;
      if (sala.escolha || (sala.jogo && sala.jogo.fase !== 'fim')) return 'jogando';
      if (!sala.jogo) estado = 'esperando';
    }
    return estado;
  }
  // a sala onde esta conta tem uma partida em andamento (conectada ou caída); null se nenhuma
  partidaDe(id) {
    for (const sala of this.salas.values()) if ((sala.escolha || (sala.jogo && sala.jogo.fase !== 'fim')) && sala.jogadores.some(j => j.id === id)) return sala;
    return null;
  }
  // a sala esperando o rival que esta conta criou (para chamar um amigo para ela)
  salaEsperandoDe(id) {
    for (const sala of this.salas.values()) if (sala.dono === id && !sala.jogo && !sala.fechada && sala.jogadores.length < 2) return sala;
    return null;
  }
  // quanto tempo (ms) quem caiu no meio da partida ainda tem para voltar antes do W.O.; null se não caiu
  // (só conta na vez dele, como o AFK: sem conexão não há sinal de vida; null se não caiu ou se a vez não é dele)
  volta(sala, jg) {
    const j = sala.jogo, emJogo = j && j.fase !== 'fim';
    if (!emJogo || jg.ws || !jg.caiuEm || sala.jogadores[j.vez] !== jg) return null;
    const { aviso, resposta } = this.afkDe(sala);
    return Math.max(0, aviso + resposta - this.paradoHa(sala));
  }
  onde(ws, conta) {
    const sala = ws.sala && this.salas.get(ws.sala);
    if (!sala) return {};
    const assento = sala.jogadores.findIndex(j => j.id === conta.id);
    return assento < 0 ? {} : { sala, assento };
  }
  avisarSala(sala, extra = {}) { const r = this.resumo(sala); sala.jogadores.forEach(j => this.enviar(j.ws, { tipo: 'sala', sala: r, ...extra })); }
  // codigo 'sala': o erro tira o jogador da sala (não existe mais, cheia, deck recusado)
  erro(ws, erro, codigo) { this.enviar(ws, codigo ? { tipo: 'erro', erro, codigo } : { tipo: 'erro', erro }); return null; }
  enviar(ws, msg) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); }
}

module.exports = { Salas, novoCodigo, PARTIDAS_POR_PAR, RITMOS, RITMO_PADRAO };
