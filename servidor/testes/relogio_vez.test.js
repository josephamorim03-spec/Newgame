// tempo da vez e política de AFK no online (servidor/salas.js): 2 min por vez no Rápida; parado (sem sinal de vida) por
// metade da vez, a pergunta "Você ainda está aí?"; sem resposta em 30 s, derrota por inatividade. Queda é a mesma coisa
// (sem conexão, não há sinal de vida), e só conta na vez de quem caiu.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { Salas } = require('../salas');
const { criarBanco } = require('../banco');
const { jogadaSimples } = require('./ajuda');

const VEZ = 120_000, AVISO = 60_000, RESPOSTA = 30_000;
const T = { limiteVez: VEZ, escolha: 0 };
async function montar(tempos = T) {
  let agora = 1_000_000;
  const banco = await criarBanco({ url: '' });
  const salas = new Salas({ banco, trava: (id, fn) => fn(), tempos, agora: () => agora });
  const deck = [];
  const conta = async nome => banco.criarConta(nome, 'x');
  const ws = () => ({ readyState: 1, msgs: [], send(m) { this.msgs.push(JSON.parse(m)); } });
  return { salas, banco, deck, conta, ws, passar: ms => { agora += ms; }, agora: () => agora };
}
const estado = w => [...w.msgs].reverse().find(m => m.tipo === 'estado').jogo;
const prazo = w => estado(w).prazoVez;

async function partida(tempos) {
  const c = await montar(tempos);
  const a = await c.conta('Ana'), b = await c.conta('Bia'), wa = c.ws(), wb = c.ws();
  const sala = c.salas.criar(a);
  await c.salas.entrar(wa, a, { sala: sala.codigo, deck: c.deck });
  await c.salas.entrar(wb, b, { sala: sala.codigo, deck: c.deck });
  assert.ok(sala.jogo, 'a partida começou');
  const j = sala.jogo, daVez = j.vez;
  // joga a vez de i de verdade (uma jogada simples, mandada pelo jogador)
  const jogar = async i => { for (let k = 0; k < 20 && j.fase !== 'fim' && j.vez === i; k++) await c.salas.acao([wa, wb][i], [a, b][i], jogadaSimples(j, i)); };
  return { ...c, sala, j, contas: [a, b], sockets: [wa, wb], daVez, jogar };
}

test('parado: aos 60 s, "Você ainda está aí?" para os dois; sem resposta em 30 s, derrota por inatividade (90 s no total)', async () => {
  const p = await partida();
  const eu = p.daVez, rival = 1 - eu;
  p.passar(AVISO - 1_000); p.salas.verificar();
  assert.strictEqual(estado(p.sockets[eu]).inatividade, null, 'antes da metade, nada');
  p.passar(1_000); p.salas.verificar();
  const minha = estado(p.sockets[eu]).inatividade, dele = estado(p.sockets[rival]).inatividade;
  assert.deepStrictEqual(minha, { quem: 0, prazo: RESPOSTA, resposta: RESPOSTA }, 'a pergunta chega para quem está parado');
  assert.strictEqual(dele.quem, 1, 'e o rival vê que ele está inativo');
  p.passar(RESPOSTA - 1_000); p.salas.verificar();
  assert.notStrictEqual(p.j.fase, 'fim');
  p.passar(1_000); p.salas.verificar();
  assert.strictEqual(p.j.fase, 'fim', 'aos 90 s parado, acabou');
  assert.strictEqual(p.j.desistencia, eu);
  assert.strictEqual(p.j.motivoFim, 'inativo');
  assert.strictEqual(p.j.log[0].txt, 'não respondeu ao "Você ainda está aí?"');
  p.salas.fechar();
});

test('respondeu ("estou aqui" ou qualquer toque): a pergunta some; quem está ativo e não joga perde aos 2 min', async () => {
  const p = await partida();
  const eu = p.daVez, rival = 1 - eu;
  p.passar(AVISO + 10_000); p.salas.verificar();
  assert.strictEqual(estado(p.sockets[eu]).inatividade.quem, 0);
  p.salas.ativo(p.sockets[eu], p.contas[eu]);
  assert.strictEqual(estado(p.sockets[eu]).inatividade, null, 'respondeu: a pergunta some');
  assert.strictEqual(estado(p.sockets[rival]).inatividade, null, 'para os dois');
  assert.ok(Math.abs(prazo(p.sockets[eu]) - (VEZ - AVISO - 10_000)) < 5, 'a vez continua correndo: ' + prazo(p.sockets[eu]));
  // tocando na tela de vez em quando, nunca é inativo, mas a vez tem fim
  for (let t = 0; t < 4; t++) { p.passar(10_000); p.salas.ativo(p.sockets[eu], p.contas[eu]); p.salas.verificar(); }
  assert.notStrictEqual(p.j.fase, 'fim');
  p.passar(10_001); p.salas.verificar();
  assert.strictEqual(p.j.fase, 'fim', '2 min sem jogar');
  assert.strictEqual(p.j.motivoFim, 'tempo');
  assert.strictEqual(p.j.log[0].txt, 'não jogou a tempo');
  p.salas.fechar();
});

test('só conta na própria vez: o sinal de vida do rival não ajuda, e ficar parado na vez do outro não dá nada', async () => {
  const p = await partida();
  const eu = p.daVez, rival = 1 - eu;
  // o rival toca na tela na minha vez: não conta para mim
  p.passar(50_000); p.salas.ativo(p.sockets[rival], p.contas[rival]);
  p.passar(10_000); p.salas.verificar();
  assert.strictEqual(estado(p.sockets[eu]).inatividade.quem, 0);
  await p.jogar(eu);   // jogar também responde
  assert.strictEqual(estado(p.sockets[eu]).inatividade, null);
  // eu fico parado durante a vez do rival (ele demora 70 s jogando ativo): quando a vez chega, a conta começa do zero
  for (let t = 0; t < 7; t++) { p.passar(10_000); p.salas.ativo(p.sockets[rival], p.contas[rival]); p.salas.verificar(); }
  await p.jogar(rival);
  assert.strictEqual(p.j.vez, eu);
  p.passar(AVISO - 1_000); p.salas.verificar();
  assert.strictEqual(estado(p.sockets[eu]).inatividade, null, 'a inatividade conta só desde que a vez chegou');
  p.salas.fechar();
});

test('queda: na própria vez, 90 s sem voltar = derrota por queda; na vez do rival não conta; voltar é sinal de vida', async () => {
  const p = await partida();
  const eu = p.daVez, rival = 1 - eu;
  await p.jogar(eu);
  // caiu na vez do rival: enquanto a vez não é dele, nada acontece (mesmo passando dos 90 s)
  p.salas.caiu(p.sockets[eu]);
  for (let t = 0; t < 11; t++) { p.passar(10_000); p.salas.ativo(p.sockets[rival], p.contas[rival]); p.salas.verificar(); }   // 110 s, o rival ativo
  assert.notStrictEqual(p.j.fase, 'fim', 'na vez do rival a queda não conta');
  assert.strictEqual(p.salas.volta(p.sala, p.sala.jogadores[eu]), null);
  await p.jogar(rival);
  // a vez chegou com ele fora: 90 s para voltar (o rival vê a contagem)
  assert.strictEqual(estado(p.sockets[rival]).perfis[1].volta, AVISO + RESPOSTA);
  p.passar(20_000); p.salas.verificar();
  const w = p.ws(); await p.salas.entrar(w, p.contas[eu], { sala: p.sala.codigo, deck: p.deck });
  assert.notStrictEqual(p.j.fase, 'fim', 'voltou a tempo');
  assert.ok(Math.abs(prazo(w) - (VEZ - 20_000)) < 5, 'a vez seguiu correndo durante a queda');
  assert.strictEqual(estado(w).inatividade, null, 'voltar é sinal de vida');
  // caiu de novo e não voltou: 90 s depois do último sinal de vida (antes dos 2 min da vez), derrota por queda
  p.salas.caiu(w);
  p.passar(AVISO + RESPOSTA - 1_000); p.salas.verificar();
  assert.notStrictEqual(p.j.fase, 'fim');
  p.passar(1_000); p.salas.verificar();
  assert.strictEqual(p.j.fase, 'fim');
  assert.strictEqual(p.j.motivoFim, 'queda');
  assert.strictEqual(p.j.vencedor, rival);
  p.salas.fechar();
});

test('reenviar "entrar" pela mesma conexão não dá tempo de vez nem conta como queda', async () => {
  const p = await partida();
  const w = p.sockets[p.daVez], conta = p.contas[p.daVez];
  p.passar(100_000);
  for (let i = 0; i < 5; i++) await p.salas.entrar(w, conta, { sala: p.sala.codigo, deck: p.deck });
  assert.strictEqual(p.sala.jogadores[p.daVez].ws, w);
  assert.strictEqual(p.sala.jogadores[p.daVez].caiuEm, null);
  assert.strictEqual(prazo(w), VEZ - 100_000, 'o tempo da vez seguiu correndo');
  p.passar(VEZ - 100_000); p.salas.verificar();
  assert.strictEqual(p.j.fase, 'fim');
  assert.strictEqual(p.j.motivoFim, 'tempo');
  p.salas.fechar();
});

test('o tempo da vez recomeça na Mesa nova, mesmo quando quem fechou a Mesa abre a próxima', async () => {
  const p = await partida();
  const j = p.j;
  for (let k = 0; k < 400 && j.fase !== 'fim'; k++) {
    const vez = j.vez, rodada = j.rodada;
    p.passar(5_000);
    await p.salas.acao(p.sockets[vez], p.contas[vez], jogadaSimples(j, vez));
    if (j.fase !== 'fim' && (j.vez !== vez || j.rodada !== rodada)) assert.strictEqual(p.sala.vezDesde, p.agora(), `recomeçou (vez ${vez}→${j.vez}, rodada ${rodada}→${j.rodada})`);
  }
  p.salas.fechar();
});

test('ritmo da sala: Relâmpago 1 min, Rápida 2 min (padrão), Calma 3 min; o aviso na metade, a resposta em até 30 s', async () => {
  const { Salas: S, RITMOS } = require('../salas');
  let agora = 5_000_000;
  const banco = await criarBanco({ url: '' });
  const salas = new S({ banco, trava: (id, fn) => fn(), tempos: { escolha: 0 }, agora: () => agora });
  const ws = () => ({ readyState: 1, msgs: [], send(m) { this.msgs.push(JSON.parse(m)); } });
  for (const [ritmo, ms, resposta] of [['relampago', 60_000, 15_000], ['rapida', 120_000, 30_000], ['calma', 180_000, 30_000], ['qualquer', 120_000, 30_000], [undefined, 120_000, 30_000]]) {
    const a = await banco.criarConta('A' + ritmo + ms, 'x'), b = await banco.criarConta('B' + ritmo + ms, 'x'), wa = ws(), wb = ws();
    const sala = salas.criar(a, { ritmo });
    assert.strictEqual(salas.resumo(sala).limiteVez, ms, `${ritmo}`);
    assert.deepStrictEqual(salas.afkDe(sala), { aviso: ms / 2, resposta }, `${ritmo}: AFK`);
    await salas.entrar(wa, a, { sala: sala.codigo, deck: [] }); await salas.entrar(wb, b, { sala: sala.codigo, deck: [] });
    const w = [wa, wb][sala.jogo.vez];
    assert.strictEqual(prazo(w), ms);
    assert.strictEqual(RITMOS[sala.ritmo], ms);
    agora += ms / 2 + resposta - 1; salas.verificar();
    assert.notStrictEqual(sala.jogo.fase, 'fim');
    agora += 1; salas.verificar();
    assert.strictEqual(sala.jogo.motivoFim, 'inativo', `${ritmo}: parado até o fim da resposta`);
  }
  salas.fechar();
});
