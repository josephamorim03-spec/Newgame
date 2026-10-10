// relógio da vez online: reenviar "entrar", cair e voltar sem fim, e a Mesa nova (servidor/salas.js)
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const Regras = require('../../shared/regras');
const { Salas } = require('../salas');
const { criarBanco } = require('../banco');

const T = { esperaReconexao: 90_000, limiteVez: 120_000, minimoNaVolta: 30_000, escolha: 0 };
async function montar() {
  let agora = 1_000_000;
  const banco = await criarBanco({ url: '' });
  const salas = new Salas({ banco, trava: (id, fn) => fn(), tempos: T, agora: () => agora });
  const deck = [];
  const conta = async nome => banco.criarConta(nome, 'x');
  const ws = () => ({ readyState: 1, msgs: [], send(m) { this.msgs.push(JSON.parse(m)); } });
  return { salas, deck, conta, ws, passar: ms => { agora += ms; }, agora: () => agora };
}
const prazo = (w) => [...w.msgs].reverse().find(m => m.tipo === 'estado').jogo.prazoVez;

async function partida() {
  const c = await montar();
  const a = await c.conta('Ana'), b = await c.conta('Bia'), wa = c.ws(), wb = c.ws();
  const sala = c.salas.criar(a);
  await c.salas.entrar(wa, a, { sala: sala.codigo, deck: c.deck });
  await c.salas.entrar(wb, b, { sala: sala.codigo, deck: c.deck });
  assert.ok(sala.jogo, 'a partida começou');
  const daVez = sala.jogo.vez;
  return { ...c, sala, contas: [a, b], sockets: [wa, wb], daVez };
}

test('reenviar "entrar" pela mesma conexão não dá tempo nem conta como queda', async () => {
  const p = await partida();
  const w = p.sockets[p.daVez], conta = p.contas[p.daVez];
  p.passar(100_000);
  for (let i = 0; i < 5; i++) await p.salas.entrar(w, conta, { sala: p.sala.codigo, deck: p.deck });
  assert.strictEqual(p.sala.jogadores[p.daVez].ws, w);
  assert.strictEqual(p.sala.jogadores[p.daVez].caiuEm, null);
  assert.strictEqual(prazo(w), 20_000, 'o prazo seguiu correndo');
  p.passar(21_000); p.salas.verificar();
  // estourou: o jogo jogou por ele (não perde mais na hora) e a vez passou
  assert.notStrictEqual(p.sala.jogo.fase, 'fim', 'estourar o tempo uma vez não acaba a partida');
  assert.strictEqual(p.sala.jogo.auto[p.daVez], 1, 'a vez foi no automático');
  assert.notStrictEqual(p.sala.jogo.vez, p.daVez, 'e passou para o rival');
  p.salas.fechar();
});

test('cair e voltar sem fim não segura a partida: a pausa tem teto e o mínimo da volta vale uma vez', async () => {
  const p = await partida();
  const i = p.daVez, conta = p.contas[i];
  let w = p.sockets[i];
  p.passar(110_000);
  // 1ª queda: volta com o mínimo
  p.salas.caiu(w); p.passar(60_000); w = p.ws();
  await p.salas.entrar(w, conta, { sala: p.sala.codigo, deck: p.deck });
  assert.strictEqual(prazo(w), 30_000);
  // quedas seguidas: a pausa acumulada não passa de esperaReconexao, e sem novo mínimo
  for (let k = 0; k < 10; k++) {
    p.passar(1_000);
    p.salas.caiu(w); p.passar(80_000); w = p.ws();
    await p.salas.entrar(w, conta, { sala: p.sala.codigo, deck: p.deck });
    p.salas.verificar();
    if (p.sala.jogo.fase === 'fim' || (p.sala.jogo.auto && p.sala.jogo.auto[i])) break;
  }
  // a pausa acabou e o tempo da vez também: a vez foi no automático (não ficou presa nas quedas)
  assert.ok(p.sala.jogo.fase === 'fim' || p.sala.jogo.auto[i] === 1, 'a vez de quem caiu e voltou sem fim não ficou presa');
  if (p.sala.jogo.fase === 'fim') assert.notStrictEqual(p.sala.jogo.vencedor, i);
  p.salas.fechar();
});

test('o relógio recomeça na Mesa nova, mesmo quando quem fechou a Mesa abre a próxima', async () => {
  const p = await partida();
  const j = p.sala.jogo;
  // joga até a rodada mudar sem a vez mudar (ou até a vez mudar: aí o relógio recomeça de qualquer jeito)
  for (let k = 0; k < 400 && j.fase !== 'fim'; k++) {
    const vez = j.vez, rodada = j.rodada, w = p.sockets[vez];
    p.passar(5_000);
    const acao = j.fase === 'destino' ? { tipo: 'destino', modo: Regras.destinosValidos(j, vez, j.mao.v)[0] }
      : j.fase === 'decidir' ? { tipo: 'disparar' } : { tipo: 'pegar', idx: 0 };
    await p.salas.acao(w, p.contas[vez], acao);
    if (j.fase !== 'fim' && (j.vez !== vez || j.rodada !== rodada)) {
      assert.strictEqual(p.sala.vezDesde, p.agora(), `relógio recomeçou (vez ${vez}→${j.vez}, rodada ${rodada}→${j.rodada})`);
    }
  }
  p.salas.fechar();
});

test('ritmo da sala: o tempo da vez vem do ritmo escolhido ao criar (Relâmpago 20 s, Rápida 60 s, Calma 2 min)', async () => {
  const { Salas: S, RITMOS } = require('../salas');
  let agora = 5_000_000;
  const banco = await criarBanco({ url: '' });
  const salas = new S({ banco, trava: (id, fn) => fn(), tempos: { esperaReconexao: 90_000, minimoNaVolta: 30_000, escolha: 0 }, agora: () => agora });
  const ws = () => ({ readyState: 1, msgs: [], send(m) { this.msgs.push(JSON.parse(m)); } });
  for (const [ritmo, ms] of [['relampago', 20_000], ['rapida', 60_000], ['calma', 120_000], ['qualquer', 60_000], [undefined, 60_000]]) {
    const a = await banco.criarConta('A' + ritmo + ms, 'x'), b = await banco.criarConta('B' + ritmo + ms, 'x'), wa = ws(), wb = ws();
    const sala = salas.criar(a, { ritmo });
    assert.strictEqual(salas.resumo(sala).limiteVez, ms, `${ritmo}`);
    await salas.entrar(wa, a, { sala: sala.codigo, deck: [] }); await salas.entrar(wb, b, { sala: sala.codigo, deck: [] });
    const w = [wa, wb][sala.jogo.vez];
    assert.strictEqual(prazo(w), ms);
    assert.strictEqual(RITMOS[sala.ritmo], ms);
    const vez = sala.jogo.vez;
    agora += ms - 1; salas.verificar();
    assert.ok(!sala.jogo.auto, `${ritmo}: antes do tempo, nada no automático`);
    agora += 2; salas.verificar();
    assert.strictEqual(sala.jogo.auto[vez], 1, `${ritmo}: estourou o tempo da vez e o jogo jogou por ele`);
    assert.notStrictEqual(sala.jogo.fase, 'fim');
  }
  salas.fechar();
});

test('tempo esgotado: o jogo joga por você; 3 vezes SEGUIDAS e a partida acaba (W.O. com o motivo); jogar zera a conta', async () => {
  const p = await partida();
  const j = p.sala.jogo, eu = p.daVez, rival = 1 - eu;
  // joga a vez de i à mão (a mesma jogada simples do automático, mas mandada pelo jogador)
  const jogarAMao = async i => { for (let k = 0; k < 20 && j.fase !== 'fim' && j.vez === i; k++) await p.salas.acao(p.sockets[i], p.contas[i], Regras.jogadaAutomatica(j, i)); };
  const ateMinhaVez = async () => { for (let k = 0; k < 5 && j.fase !== 'fim' && j.vez !== eu; k++) await jogarAMao(rival); };
  const estourar = () => { p.passar(120_001); p.salas.verificar(); };
  estourar();
  assert.strictEqual(j.auto[eu], 1);
  // os dois recebem o aviso do automático (cada um na própria visão: para o rival, quem não jogou é o 1)
  const ultimoEstado = w => [...w.msgs].reverse().find(m => m.tipo === 'estado');
  assert.ok(ultimoEstado(p.sockets[eu]).jogo.eventos.some(e => e.tipo === 'automatica' && e.p === 0 && e.n === 1 && e.max === 3));
  assert.ok(ultimoEstado(p.sockets[rival]).jogo.eventos.some(e => e.tipo === 'automatica' && e.p === 1));
  await ateMinhaVez(); estourar();
  assert.strictEqual(j.auto[eu], 2);
  // jogou de novo: a conta zera
  await ateMinhaVez(); await jogarAMao(eu);
  assert.strictEqual(j.auto[eu], 0, 'jogar zera a conta');
  assert.strictEqual(j.auto[rival], 0, 'quem jogou tudo à mão nunca entrou no automático');
  for (let n = 1; n <= 3 && j.fase !== 'fim'; n++) { await ateMinhaVez(); estourar(); }
  assert.strictEqual(j.fase, 'fim', 'na 3ª seguida, acabou');
  assert.strictEqual(j.vencedor, rival);
  assert.strictEqual(j.desistencia, eu);
  assert.strictEqual(j.motivoFim, 'tempo');
  await new Promise(r => setTimeout(r, 20));
  assert.ok(p.sockets[eu].msgs.some(m => m.tipo === 'fim'), 'o fim chega');
  p.salas.fechar();
});

test('ausente: depois do automático a vez fica curta (15 s) até um sinal de vida; quem cai e não volta vai no automático na hora', async () => {
  const p = await partida();
  const j = p.sala.jogo, eu = p.daVez, rival = 1 - eu;
  const jogarAMao = async i => { for (let k = 0; k < 20 && j.fase !== 'fim' && j.vez === i; k++) await p.salas.acao(p.sockets[i], p.contas[i], Regras.jogadaAutomatica(j, i)); };
  const ateMinhaVez = async () => { for (let k = 0; k < 5 && j.fase !== 'fim' && j.vez !== eu; k++) await jogarAMao(rival); };
  const estado = w => [...w.msgs].reverse().find(m => m.tipo === 'estado').jogo;
  // não jogou: automático e ausente
  p.passar(120_001); p.salas.verificar();
  assert.strictEqual(p.sala.jogadores[eu].ausente, true);
  assert.strictEqual(estado(p.sockets[rival]).perfis[1].ausente, true, 'o rival sabe que ele está ausente');
  // a próxima vez dele tem só 15 s (o rival não espera os 2 min inteiros)
  await ateMinhaVez();
  assert.strictEqual(estado(p.sockets[eu]).limiteVez, 15_000);
  assert.ok(estado(p.sockets[eu]).prazoVez <= 15_000);
  p.passar(15_001); p.salas.verificar();
  assert.strictEqual(j.auto[eu], 2, 'a vez curta também acabou no automático');
  // sinal de vida (tocou na tela): o tempo inteiro de volta; a conta só zera quando ele joga
  await ateMinhaVez();
  p.passar(5_000);
  p.salas.voltei(p.sockets[eu], p.contas[eu]);
  assert.strictEqual(p.sala.jogadores[eu].ausente, false);
  assert.strictEqual(estado(p.sockets[eu]).limiteVez, 120_000);
  assert.ok(estado(p.sockets[eu]).prazoVez >= 30_000, 'com pelo menos o mínimo da volta');
  assert.strictEqual(j.auto[eu], 2);
  p.salas.voltei(p.sockets[eu], p.contas[eu]);   // repetir não dá tempo de novo
  await jogarAMao(eu);
  assert.strictEqual(j.auto[eu], 0, 'jogou: a conta zera');
  // caiu e passou o prazo de volta: na vez dele, automático na hora (sem esperar o relógio), por queda
  await ateMinhaVez();
  p.salas.caiu(p.sockets[eu]);
  p.passar(90_001); p.salas.verificar();
  assert.strictEqual(j.auto[eu], 1);
  assert.ok(estado(p.sockets[rival]).eventos.some(e => e.tipo === 'automatica' && e.motivo === 'queda'));
  for (let n = 0; n < 3 && j.fase !== 'fim'; n++) { await ateMinhaVez(); p.salas.verificar(); }
  assert.strictEqual(j.fase, 'fim');
  assert.strictEqual(j.motivoFim, 'queda');
  assert.strictEqual(j.vencedor, rival);
  p.salas.fechar();
});
