// A carta virada do rival é segredo: o que o outro jogador recebe do servidor (Regras.visaoDe) não pode mudar entre
// "o rival armou a armadilha X" e "armou a Y", nem no instante em que ela é virada, nem nas jogadas seguintes, até a
// armadilha agir de verdade. E nenhuma ação dele pode ser aceita numa versão e recusada na outra (isso seria um
// "oráculo": tentar a ação e ver se dá erro entregaria o segredo). (v0.13: o blefe saiu; o "?" é sempre uma armadilha)
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const Regras = require('../../shared/regras');
const { rngDe, jogadaAoAcaso } = require('./ajuda');

const ARMADILHAS = Object.keys(Regras.CARTAS).filter(c => Regras.CARTAS[c].tipo === 'armadilha' && c !== 'espelho');   // o Espelho fica à vista
// quem não sabe o segredo joga com cada carta do jogo (as que mexem no rival — Furto, Lacre, Espelho, Rerrolar, Virar —
// são as candidatas a oráculo), sempre com o Coringa junto
const DECKS_A = Object.keys(Regras.CARTAS).map(c => (c === 'coringa' ? ['coringa', 'ajuste'] : [c, 'coringa'])).filter(d => Regras.deckValido(d));
// pares de armadilhas que cabem juntas num deck (no máximo 1 carta de pontos)
const PARES = [];
for (const x of ARMADILHAS) for (const y of ARMADILHAS) if (x < y && Regras.deckValido([x, y])) PARES.push([x, y]);

// o primeiro ponto em que dois objetos diferem (caminho e os dois valores), para a mensagem do teste
function diferenca(a, b, caminho = '') {
  if (JSON.stringify(a) === JSON.stringify(b)) return null;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = diferenca(a[k], b[k], `${caminho}.${k}`); if (d) return d; }
  }
  return `${caminho || '(raiz)'}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`;
}
const partida = (semente, deck1, deck0 = DECKS_A[0]) => Regras.criarPartida({ decks: [deck0, deck1], vez: 1, meta: 12, nomes: ['A', 'B'], modo: 'online', nivel: 'online', rng: rngDe(semente) });
// o dono do segredo (jogador 1) só pega dados, escolhe destino, dispara ou segura: usar cartas mudaria o jogo de propósito
const semCarta = (j, p, rng) => { const a = jogadaAoAcaso(j, p, rng); return a.tipo === 'carta' || a.tipo === 'dispensar' ? (j.fase === 'pegar' ? { tipo: 'pegar', idx: 0 } : a) : a; };

test('o rival não distingue qual das duas armadilhas está virada (nem pelo estado, nem por erro de ação)', () => {
  let casos = 0, passos = 0;
  for (const deck0 of DECKS_A) for (let semente = 1; semente <= 3; semente++) {
    for (const [x, y] of PARES) {
      // as versões: armou a X, e armou a Y (o deck é o mesmo)
      const jA = partida(semente, [x, y], deck0), jB = partida(semente, [x, y], deck0);
      if (!Regras.aplicar(jA, 1, { tipo: 'carta', carta: x }).ok || !Regras.aplicar(jB, 1, { tipo: 'carta', carta: y }).ok) continue;
      casos++;
      let d = diferenca(Regras.visaoDe(jA, 0), Regras.visaoDe(jB, 0));
      assert.strictEqual(d, null, `logo depois de armar (${x} × ${y}, semente ${semente}): ${d}`);
      // as mesmas jogadas nas duas versões, enquanto nenhuma das armadilhas agir
      const rng = rngDe(semente * 7919);
      for (let i = 0; i < 120 && jA.fase !== 'fim' && jB.fase !== 'fim'; i++) {
        if (jA.armada[1] !== x || jB.armada[1] !== y) break;   // agiu: a partir daqui é público
        const p = jA.vez;
        const visao = Regras.visaoDe(jA, p);
        const acao = p === 1 ? semCarta(visao, 0, rng) : jogadaAoAcaso(visao, 0, rng);
        const okA = Regras.aplicar(jA, p, acao), okB = Regras.aplicar(jB, p, acao);
        if (p === 0) assert.strictEqual(okA.ok, okB.ok, `oráculo: a ação ${JSON.stringify(acao)} de quem não sabe o segredo (deck ${deck0}) teve resultado diferente (${okA.erro || 'ok'} × ${okB.erro || 'ok'}) — ${x} × ${y}, semente ${semente}`);
        if (!okA.ok || !okB.ok) break;
        if (jA.armada[1] !== x || jB.armada[1] !== y) break;
        if (jA.fase === 'fim' || jB.fase === 'fim') break;
        passos++;
        d = diferenca(Regras.visaoDe(jA, 0), Regras.visaoDe(jB, 0));
        assert.strictEqual(d, null, `depois de ${i + 1} jogadas (${x} × ${y}, deck dele ${deck0}, semente ${semente}): ${d}`);
      }
    }
  }
  assert.ok(casos >= 20, `poucos casos testados: ${casos}`);
  console.log(`  ${casos} pares de armadilhas, ${passos} jogadas comparadas`);
});

test('as ações do blefe que saiu (virar um efeito, desafiar) são recusadas igual para qualquer "?"', () => {
  for (const [x, y] of PARES) {
    const jA = partida(3, [x, y]), jB = partida(3, [x, y]);
    Regras.aplicar(jA, 1, { tipo: 'carta', carta: x }); Regras.aplicar(jB, 1, { tipo: 'carta', carta: y });
    Regras.proximo(jA); Regras.proximo(jB);
    for (const acao of [{ tipo: 'desafiar' }, { tipo: 'virar', carta: 'coringa' }]) {
      assert.deepStrictEqual(Regras.aplicar(jA, 0, acao), Regras.aplicar(jB, 0, acao), `${JSON.stringify(acao)} (${x} × ${y})`);
    }
  }
});

test('o que vai para o rival nunca leva o sorteio, a mão dele fora da vez, nem qual armadilha foi armada', () => {
  const j = partida(5, ['ajuste', 'interferencia']);
  Regras.aplicar(j, 1, { tipo: 'carta', carta: 'interferencia' });
  const v = Regras.visaoDe(j, 0), texto = JSON.stringify(v);
  assert.ok(!/__rng/.test(texto), 'o gerador de números não vai junto');
  assert.strictEqual(v.armada[1], 'oculta');
  assert.ok(!Object.values(v.cartas[1]).includes('armada'), 'nenhuma carta do rival aparece como armada');
  assert.ok(!v.eventos.some(e => e.tipo === 'armou' && e.c), 'o aviso de "armou" não diz qual carta');
});

test('decks de 3 cartas, com o dono do "?" usando a terceira carta enquanto ele está armado', () => {
  let casos = 0, passos = 0;
  const TODAS = Object.keys(Regras.CARTAS);
  for (const [x, y] of PARES) for (const outra of TODAS) {
    if (outra === x || outra === y) continue;
    const deck = [x, y, outra];
    if (!Regras.deckValido(deck)) continue;
    for (let rodada = 0; rodada < 3; rodada++) {
      const semente = (casos + rodada) % 7 + 1, deck0 = DECKS_A[(casos * 3 + rodada) % DECKS_A.length];
      const jA = partida(semente, deck, deck0), jB = partida(semente, deck, deck0);
      if (!Regras.aplicar(jA, 1, { tipo: 'carta', carta: x }).ok || !Regras.aplicar(jB, 1, { tipo: 'carta', carta: y }).ok) continue;
      casos++;
      const rng = rngDe(semente * 104729 + casos);
      for (let i = 0; i < 100; i++) {
        if (jA.fase === 'fim' || jB.fase === 'fim' || jA.armada[1] !== x || jB.armada[1] !== y) break;
        const p = jA.vez;
        let acao = jogadaAoAcaso(Regras.visaoDe(jA, p), 0, rng);
        // o dono pode usar a terceira carta; só não mexe nas duas armadilhas (gastar a carta secreta a tornaria pública)
        if (p === 1 && acao.tipo === 'carta' && (acao.carta === x || acao.carta === y)) acao = jA.fase === 'pegar' ? { tipo: 'pegar', idx: 0 } : acao;
        const okA = Regras.aplicar(jA, p, acao), okB = Regras.aplicar(jB, p, acao);
        assert.strictEqual(okA.ok, okB.ok, `resultado diferente para ${JSON.stringify(acao)} do jogador ${p} (${okA.erro || 'ok'} × ${okB.erro || 'ok'}) — deck ${deck}`);
        if (!okA.ok) break;
        if (jA.fase === 'fim' || jB.fase === 'fim' || jA.armada[1] !== x || jB.armada[1] !== y) break;
        passos++;
        const d = diferenca(Regras.visaoDe(jA, 0), Regras.visaoDe(jB, 0));
        assert.strictEqual(d, null, `deck ${deck}, jogada ${i + 1}: ${d}`);
      }
    }
  }
  assert.ok(casos >= 50, `poucos casos: ${casos}`);
  console.log(`  ${casos} decks de 3 cartas, ${passos} jogadas comparadas`);
});
