// relógio do online (como no chess.com): um relógio por jogador para a partida inteira, mais um acréscimo a cada vez
// jogada; só corre na vez de cada um; acabou, perde por tempo. Quedas: o relógio continua na vez de quem caiu, e o
// abandono só conta nas vezes dele (servidor/salas.js)
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const Regras = require('../../shared/regras');
const { Salas } = require('../salas');
const { criarBanco } = require('../banco');
const { jogadaSimples } = require('./ajuda');

const BASE = 300_000, INC = 5_000, VOLTA = 120_000;
const T = { esperaReconexao: VOLTA, relogio: { base: BASE, inc: INC }, escolha: 0 };
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
  // joga a vez de i de verdade (uma jogada simples, mandada pelo jogador), devagar: cada ação leva "ms"
  const jogar = async (i, ms = 0) => { let k = 0; for (; k < 20 && j.fase !== 'fim' && j.vez === i; k++) { c.passar(ms); await c.salas.acao([wa, wb][i], [a, b][i], jogadaSimples(j, i)); } return k; };
  return { ...c, sala, j, contas: [a, b], sockets: [wa, wb], daVez, jogar };
}

test('reenviar "entrar" pela mesma conexão não dá tempo nem conta como queda; o relógio acaba e perde por tempo', async () => {
  const p = await partida();
  const w = p.sockets[p.daVez], conta = p.contas[p.daVez];
  p.passar(100_000);
  for (let i = 0; i < 5; i++) await p.salas.entrar(w, conta, { sala: p.sala.codigo, deck: p.deck });
  assert.strictEqual(p.sala.jogadores[p.daVez].ws, w);
  assert.strictEqual(p.sala.jogadores[p.daVez].caiuEm, null);
  assert.strictEqual(prazo(w), BASE - 100_000, 'o relógio seguiu correndo');
  // uma vez longa não é problema: pensar 3 min não tira ninguém
  p.passar(BASE - 100_000 - 1_000); p.salas.verificar();
  assert.notStrictEqual(p.j.fase, 'fim', 'uma vez longa, com relógio sobrando, segue');
  p.passar(1_001); p.salas.verificar();
  assert.strictEqual(p.j.fase, 'fim', 'o relógio acabou');
  assert.strictEqual(p.j.desistencia, p.daVez);
  assert.strictEqual(p.j.motivoFim, 'tempo');
  assert.strictEqual(p.j.log[0].txt, 'ficou sem tempo no relógio');
  p.salas.fechar();
});

test('o relógio só corre na vez de cada um, e quem joga ganha o acréscimo quando a vez passa', async () => {
  const p = await partida();
  const eu = p.daVez, rival = 1 - eu;
  const n = await p.jogar(eu, 4_000);   // cada ação da vez levou 4 s
  assert.strictEqual(p.sala.relogios[eu], BASE - 4_000 * n + INC, 'o meu relógio desceu o que eu pensei e ganhou o acréscimo');
  assert.strictEqual(p.sala.relogios[rival], BASE, 'o do rival não andou na minha vez');
  const meu = estado(p.sockets[eu]).relogios;
  assert.strictEqual(meu[0], p.sala.relogios[eu], 'cada um vê o próprio relógio primeiro');
  assert.strictEqual(meu[1], BASE);
  // o rival pensa 30 s: só o relógio dele anda
  const antes = p.sala.relogios[eu];
  p.passar(30_000); p.salas.verificar();
  assert.strictEqual(estado(p.sockets[rival]).relogios[0], BASE, 'o estado só muda quando alguém joga');
  await p.jogar(rival);
  assert.strictEqual(p.sala.relogios[rival], BASE - 30_000 + INC, 'o rival gastou 30 s e ganhou o acréscimo');
  assert.strictEqual(p.sala.relogios[eu], antes, 'o meu ficou parado');
  // nada é jogado por ninguém: o relógio é o único limite
  assert.ok(!p.j.log.some(l => /automático|perdeu a vez/.test(l.txt)));
  p.salas.fechar();
});

test('queda: o relógio continua na vez de quem caiu; o abandono só conta nas vezes dele (2 min)', async () => {
  const p = await partida();
  const eu = p.daVez, rival = 1 - eu;
  await p.jogar(eu);
  // caiu na vez do rival: por mais que demore, não perde nada enquanto a vez não é dele
  p.salas.caiu(p.sockets[eu]);
  p.passar(VOLTA + 60_000); p.salas.verificar();
  assert.notStrictEqual(p.j.fase, 'fim', 'na vez do rival a queda não conta');
  assert.strictEqual(p.salas.volta(p.sala, p.sala.jogadores[eu]), null, 'nem aparece contagem');
  await p.jogar(rival);
  assert.strictEqual(p.j.vez, eu);
  // a vez chegou: agora conta, e o relógio dele corre
  assert.strictEqual(p.salas.volta(p.sala, p.sala.jogadores[eu]), VOLTA);
  assert.strictEqual(estado(p.sockets[rival]).perfis[1].volta, VOLTA, 'o rival vê a contagem');
  const relogio = p.salas.relogiosAgora(p.sala)[eu];
  p.passar(60_000); p.salas.verificar();
  assert.strictEqual(p.salas.relogiosAgora(p.sala)[eu], relogio - 60_000, 'o relógio de quem caiu corre na vez dele');
  // voltou: segue jogando com o que sobrou no relógio
  const w = p.ws(); await p.salas.entrar(w, p.contas[eu], { sala: p.sala.codigo, deck: p.deck });
  assert.strictEqual(prazo(w), relogio - 60_000);
  // caiu de novo e não voltou: abandono depois de 2 min na vez dele
  p.salas.caiu(w);
  p.passar(VOLTA - 1_000); p.salas.verificar();
  assert.notStrictEqual(p.j.fase, 'fim');
  p.passar(1_001); p.salas.verificar();
  assert.strictEqual(p.j.fase, 'fim');
  assert.strictEqual(p.j.motivoFim, 'queda');
  assert.strictEqual(p.j.vencedor, rival);
  p.salas.fechar();
});

test('cair e voltar sem fim não segura a partida: o relógio nunca para', async () => {
  const p = await partida();
  const i = p.daVez, conta = p.contas[i];
  let w = p.sockets[i];
  for (let k = 0; k < 20 && p.j.fase !== 'fim'; k++) {
    p.salas.caiu(w); p.passar(30_000); w = p.ws();
    await p.salas.entrar(w, conta, { sala: p.sala.codigo, deck: p.deck });
    p.salas.verificar();
  }
  assert.strictEqual(p.j.fase, 'fim', 'acabou perdendo por tempo');
  assert.strictEqual(p.j.motivoFim, 'tempo');
  assert.notStrictEqual(p.j.vencedor, i);
  p.salas.fechar();
});

test('o relógio segue na Mesa nova, mesmo quando quem fechou a Mesa abre a próxima (sem acréscimo: a vez não passou)', async () => {
  const p = await partida();
  const j = p.j;
  for (let k = 0; k < 400 && j.fase !== 'fim'; k++) {
    const vez = j.vez, rodada = j.rodada, antes = p.salas.relogiosAgora(p.sala)[vez];
    p.passar(1_000);
    await p.salas.acao(p.sockets[vez], p.contas[vez], jogadaSimples(j, vez));
    if (j.fase === 'fim') break;
    const depois = p.sala.relogios[vez];
    if (j.vez === vez) assert.strictEqual(depois, antes - 1_000, `a vez continua: só desconta (rodada ${rodada}→${j.rodada})`);
    else assert.strictEqual(depois, antes - 1_000 + INC, 'a vez passou: desconta e ganha o acréscimo');
  }
  p.salas.fechar();
});

test('ritmo da sala: o relógio vem do ritmo escolhido ao criar (Relâmpago 2+3, Rápida 5+5, Calma 10+10)', async () => {
  const { Salas: S, RITMOS } = require('../salas');
  let agora = 5_000_000;
  const banco = await criarBanco({ url: '' });
  const salas = new S({ banco, trava: (id, fn) => fn(), tempos: { esperaReconexao: VOLTA, escolha: 0 }, agora: () => agora });
  const ws = () => ({ readyState: 1, msgs: [], send(m) { this.msgs.push(JSON.parse(m)); } });
  for (const [ritmo, base, inc] of [['relampago', 120_000, 3_000], ['rapida', 300_000, 5_000], ['calma', 600_000, 10_000], ['qualquer', 300_000, 5_000], [undefined, 300_000, 5_000]]) {
    const a = await banco.criarConta('A' + ritmo + base, 'x'), b = await banco.criarConta('B' + ritmo + base, 'x'), wa = ws(), wb = ws();
    const sala = salas.criar(a, { ritmo });
    assert.deepStrictEqual(salas.resumo(sala).relogio, { base, inc }, `${ritmo}`);
    await salas.entrar(wa, a, { sala: sala.codigo, deck: [] }); await salas.entrar(wb, b, { sala: sala.codigo, deck: [] });
    const w = [wa, wb][sala.jogo.vez], vez = sala.jogo.vez;
    assert.strictEqual(prazo(w), base);
    assert.deepStrictEqual(estado(w).relogios, [base, base]);
    assert.deepStrictEqual(RITMOS[sala.ritmo], { base, inc });
    agora += base - 1; salas.verificar();
    assert.notStrictEqual(sala.jogo.fase, 'fim', `${ritmo}: com 1 ms no relógio, segue`);
    agora += 2; salas.verificar();
    assert.strictEqual(sala.jogo.fase, 'fim', `${ritmo}: o relógio acabou`);
    assert.strictEqual(sala.jogo.desistencia, vez);
  }
  salas.fechar();
});
