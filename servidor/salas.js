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
const PARTIDAS_POR_PAR = 3; // por dia, valendo rating e moedas (contra duas contas combinando resultado)

const PADRAO = {
  esperaReconexao: 90_000,  // quem cai tem esse tempo para voltar antes de perder por W.O. (troca de rede, aba recarregada…)
  limiteVez: 120_000,       // quem não joga na própria vez por esse tempo perde (o relógio para enquanto ele está caído)
  minimoNaVolta: 30_000,    // quem volta de uma queda na própria vez tem pelo menos isso para jogar
  salaParada: 30 * 60_000,  // sala sem ninguém conectado some
  conviteValido: 24 * 3600_000,
};

class Salas {
  // banco: servidor/banco.js; trava(id, fn): serializa mudanças numa conta (app.js)
  constructor({ banco, trava, tempos = {}, agora = Date.now, aoMudarConta = () => {} }) {
    this.banco = banco; this.trava = trava; this.agora = agora; this.aoMudarConta = aoMudarConta;
    this.t = { ...PADRAO, ...tempos };
    this.salas = new Map();
    this.relogio = setInterval(() => this.verificar(), Math.min(5000, this.t.esperaReconexao / 4)).unref();
  }
  fechar() { clearInterval(this.relogio); }

  criar(conta, { meta = 12 } = {}) {
    // uma sala esperando por conta: criar outra fecha a anterior
    for (const s of this.salas.values()) if (s.dono === conta.id && !s.jogo) { s.fechada = true; this.salas.delete(s.codigo); }
    let codigo; do codigo = novoCodigo(); while (this.salas.has(codigo));
    const sala = { codigo, dono: conta.id, meta: meta === 16 ? 16 : 12, criada: this.agora(), mexida: this.agora(), jogadores: [], jogo: null, revanche: new Set(), primeiro: crypto.randomInt(2), fechada: false };
    this.salas.set(codigo, sala);
    return sala;
  }
  resumo(sala) {
    return {
      codigo: sala.codigo, meta: sala.meta, dono: sala.dono,
      jogadores: sala.jogadores.map(j => ({ id: j.id, nome: j.nome, rating: j.rating, icone: j.icone, conectado: !!j.ws, volta: this.volta(sala, j) })),
      estado: sala.jogo ? (sala.jogo.fase === 'fim' ? 'fim' : 'jogando') : 'esperando',
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
    this.sair(ws, { silencioso: true }); // um socket fica numa sala só
    let eu = sala.jogadores.find(j => j.id === conta.id);
    if (!eu) {
      if (sala.jogadores.length >= 2) return this.erro(ws, 'Esta sala já está cheia.', 'sala');
      eu = { id: conta.id, nome: conta.nome, rating: conta.rating, icone: conta.ativo.icone, dado: conta.ativo.dado, deck: deck.slice(), ws: null, caiuEm: null };
      sala.jogadores.push(eu);
    } else if (!sala.jogo || sala.jogo.fase === 'fim') eu.deck = deck.slice();
    if (eu.ws && eu.ws !== ws) { this.enviar(eu.ws, { tipo: 'erro', erro: 'Você entrou nesta sala por outra janela.', codigo: 'sala' }); eu.ws.sala = null; }
    // voltou de uma queda na própria vez: o relógio da vez, parado durante a queda, continua de onde estava
    if (eu.caiuEm && sala.jogo && sala.jogo.fase !== 'fim' && sala.jogo.vez === sala.jogadores.indexOf(eu)) {
      const agora = this.agora(), parado = agora - Math.max(eu.caiuEm, sala.vezDesde);
      sala.vezDesde = Math.max(sala.vezDesde + parado, agora - this.t.limiteVez + this.t.minimoNaVolta);
    }
    eu.ws = ws; eu.caiuEm = null; ws.sala = sala.codigo;
    sala.mexida = this.agora();
    if (sala.jogadores.length === 2 && !sala.jogo) this.comecar(sala);
    else {
      this.avisarSala(sala);
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
    const r = Regras.aplicar(sala.jogo, assento, acao);
    if (!r.ok) { this.erro(ws, r.erro); this.mandarEstado(sala, assento); return; }
    sala.mexida = this.agora();
    if (sala.jogo.vez !== sala.ultimaVez) { sala.ultimaVez = sala.jogo.vez; sala.vezDesde = this.agora(); }
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
    if (sala.revanche.size === 2) this.comecar(sala);
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
      if (!silencioso) { Regras.desistir(sala.jogo, sala.jogadores.indexOf(eu)); this.depoisDaAcao(sala); }
      else eu.caiuEm = this.agora();
    } else if (!sala.jogo) {
      sala.jogadores = sala.jogadores.filter(j => j !== eu); // ainda esperando: libera a vaga
    }
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
    this.avisarSala(sala);
  }

  // ---------- partida ----------
  comecar(sala) {
    const [a, b] = sala.jogadores;
    sala.revanche.clear();
    sala.jogo = Regras.criarPartida({ decks: [a.deck, b.deck], vez: sala.primeiro, meta: sala.meta, nomes: [a.nome, b.nome], modo: 'online', nivel: 'online' });
    sala.primeiro = 1 - sala.primeiro;
    sala.partidas = (sala.partidas || 0) + 1;
    sala.premiada = false; sala.resultado = null; sala.ultimaVez = sala.jogo.vez; sala.vezDesde = this.agora();
    this.avisarSala(sala);
    this.transmitir(sala);
  }
  async depoisDaAcao(sala) {
    const fim = sala.jogo.fase === 'fim' && !sala.premiada;
    if (fim) sala.premiada = true;
    if (fim) {
      // o resultado fica guardado na sala: quem voltar depois do fim também o recebe
      try { sala.resultado = { premios: await this.premiar(sala) }; }
      catch (e) { console.error('premiar', e); sala.resultado = { erro: 'A partida acabou, mas o servidor não conseguiu registrar o resultado. Rating e moedas ficaram como estavam.' }; }
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
    visao.prazoVez = sala.jogo.fase === 'fim' ? null : Math.max(0, this.t.limiteVez - (this.agora() - sala.vezDesde));
    this.enviar(jg.ws, { tipo: 'estado', jogo: visao });
  }

  // rating para os dois, moedas para quem venceu. W.O. e a 4ª partida do dia entre o mesmo par não rendem moedas.
  async premiar(sala) {
    const j = sala.jogo, w = j.vencedor, ids = sala.jogadores.map(x => x.id);
    const doPar = await this.banco.partidasDoParHoje(ids[0], ids[1]);
    const amistosa = doPar >= PARTIDAS_POR_PAR;
    const porDesistencia = j.desistencia !== undefined;
    const contas = await Promise.all(ids.map(id => this.banco.contaPorId(id)));
    const ratings = contas.map(c => c.rating);
    const premios = [null, null];
    let moedasDadas = 0;
    await Promise.all([0, 1].map(i => this.trava(ids[i], async () => {
      const c = await this.banco.contaPorId(ids[i]);
      const venceu = i === w;
      const p = { amistosa, porDesistencia, ratingAntes: c.rating, rating: c.rating, moedas: null, motivo: null };
      const campos = { partidas: c.partidas + 1, vitorias: c.vitorias + (venceu ? 1 : 0) };
      if (!amistosa) {
        campos.rating = Regras.elo(c.rating, ratings[1 - i], venceu ? 1 : 0);
        campos.pico = Math.max(c.pico, campos.rating);
        p.rating = campos.rating;
      } else p.motivo = `Vocês já jogaram ${PARTIDAS_POR_PAR} partidas valendo hoje: esta foi amistosa.`;
      if (venceu) {
        const m = Regras.moedasDaVitoria(Regras.BASE_MOEDAS.online, j.pts[i] - j.pts[1 - i], j.rodada, j.meta, Regras.ajusteRatingOnline(ratings[i], ratings[1 - i]));
        if (porDesistencia) { m.total = 0; p.motivo = 'Vitória por desistência não rende moedas.'; }
        if (amistosa) m.total = 0;
        p.moedas = m; campos.moedas = c.moedas + m.total; moedasDadas = m.total;
      }
      const conta = { xp: c.xp, dados: c.dados.slice(), icones: c.icones.slice(), mesas: c.mesas.slice() };
      const xp = Regras.ganharXp(conta, porDesistencia && !venceu ? 0 : Regras.xpDaPartida(venceu, j.momentos.filter(m => m.p === i).length));
      Object.assign(campos, { xp: conta.xp, dados: conta.dados, icones: conta.icones, mesas: conta.mesas });
      Object.assign(p, xp);
      const nova = await this.banco.atualizarConta(c.id, campos);
      sala.jogadores[i].rating = nova.rating;
      p.conta = perfil(nova);
      premios[i] = p;
      this.aoMudarConta(nova);
    })));
    await this.banco.registrarPartida({ a: ids[0], b: ids[1], vencedor: ids[w], placar: `${j.pts[0]}-${j.pts[1]}`, rodadas: j.rodada, moedas: moedasDadas });
    return premios;
  }

  // ---------- relógio: quedas, vez parada, salas esquecidas ----------
  verificar() {
    const agora = this.agora();
    for (const sala of this.salas.values()) {
      const j = sala.jogo, emJogo = j && j.fase !== 'fim';
      if (emJogo) {
        const caido = sala.jogadores.findIndex(x => !x.ws && x.caiuEm && agora - x.caiuEm > this.t.esperaReconexao);
        if (caido >= 0) { Regras.desistir(j, caido); this.depoisDaAcao(sala); continue; }
        // a vez não vence enquanto quem joga está caído: aí vale só o prazo de volta
        const daVezCaido = !sala.jogadores[j.vez].ws;
        if (!daVezCaido && agora - sala.vezDesde > this.t.limiteVez) { Regras.desistir(j, j.vez); this.depoisDaAcao(sala); continue; }
      }
      const alguem = sala.jogadores.some(x => x.ws);
      if ((!alguem && agora - sala.mexida > this.t.salaParada) || (!j && agora - sala.criada > this.t.conviteValido)) {
        sala.fechada = true; this.salas.delete(sala.codigo);
      }
    }
  }

  // ---------- utilidades ----------
  // quanto tempo (ms) quem caiu no meio da partida ainda tem para voltar antes do W.O.; null se não caiu
  volta(sala, jg) {
    const emJogo = sala.jogo && sala.jogo.fase !== 'fim';
    return emJogo && !jg.ws && jg.caiuEm ? Math.max(0, this.t.esperaReconexao - (this.agora() - jg.caiuEm)) : null;
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

module.exports = { Salas, novoCodigo, PARTIDAS_POR_PAR };
