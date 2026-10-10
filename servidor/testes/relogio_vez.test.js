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
  assert.strictEqual(p.sala.jogo.fase, 'fim', 'perdeu por tempo');
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
    if (p.sala.jogo.fase === 'fim') break;
  }
  assert.strictEqual(p.sala.jogo.fase, 'fim', 'acabou perdendo por tempo');
  assert.notStrictEqual(p.sala.jogo.vencedor, i);
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

test('ritmo da sala: o tempo da vez vem do ritmo escolhido ao criar (Relâmpago 20 s, Rápida 45 s, Calma 2 min)', async () => {
  const { Salas: S, RITMOS } = require('../salas');
  let agora = 5_000_000;
  const banco = await criarBanco({ url: '' });
  const salas = new S({ banco, trava: (id, fn) => fn(), tempos: { esperaReconexao: 90_000, minimoNaVolta: 30_000, escolha: 0 }, agora: () => agora });
  const ws = () => ({ readyState: 1, msgs: [], send(m) { this.msgs.push(JSON.parse(m)); } });
  for (const [ritmo, ms] of [['relampago', 20_000], ['rapida', 45_000], ['calma', 120_000], ['qualquer', 45_000], [undefined, 45_000]]) {
    const a = await banco.criarConta('A' + ritmo + ms, 'x'), b = await banco.criarConta('B' + ritmo + ms, 'x'), wa = ws(), wb = ws();
    const sala = salas.criar(a, { ritmo });
    assert.strictEqual(salas.resumo(sala).limiteVez, ms, `${ritmo}`);
    await salas.entrar(wa, a, { sala: sala.codigo, deck: [] }); await salas.entrar(wb, b, { sala: sala.codigo, deck: [] });
    const w = [wa, wb][sala.jogo.vez];
    assert.strictEqual(prazo(w), ms);
    assert.strictEqual(RITMOS[sala.ritmo], ms);
    agora += ms + 1; salas.verificar();
    assert.strictEqual(sala.jogo.fase, 'fim', `${ritmo}: estourou o tempo da vez e perdeu`);
  }
  salas.fechar();
});
