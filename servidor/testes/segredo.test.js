// A carta virada do rival é segredo: o que o outro jogador recebe do servidor (Regras.visaoDe) não pode mudar entre
// "o rival armou a armadilha X", "armou a Y" e "blefou com uma carta de efeito" — nem no instante em que ela é virada,
// nem nas jogadas seguintes, até a armadilha agir de verdade. E nenhuma ação dele pode ser aceita numa versão e recusada
// na outra (isso seria um "oráculo": tentar a ação e ver se dá erro entregaria o segredo).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const Regras = require('../../shared/regras');
const { rngDe, jogadaAoAcaso } = require('./ajuda');

const ARMADILHAS = Object.keys(Regras.CARTAS).filter(c => Regras.CARTAS[c].tipo === 'armadilha' && c !== 'espelho');   // o Espelho fica à vista
const EFEITOS = Object.keys(Regras.CARTAS).filter(c => Regras.CARTAS[c].tipo === 'efeito');
// quem não sabe o segredo joga com cada carta do jogo (as que mexem no rival — Furto, Lacre, Espelho, Rerrolar, Virar —
// são as candidatas a oráculo), sempre com o Coringa junto
const DECKS_A = Object.keys(Regras.CARTAS).map(c => (c === 'coringa' ? ['coringa', 'ajuste'] : [c, 'coringa'])).filter(d => Regras.deckValido(d));

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
const semCarta = (j, p, rng) => { const a = jogadaAoAcaso(j, p, rng); return a.tipo === 'carta' || a.tipo === 'virar' || a.tipo === 'dispensar' ? (j.fase === 'pegar' ? { tipo: 'pegar', idx: 0 } : a) : a; };

test('o rival não distingue armadilha de verdade, outra armadilha e blefe (nem pelo estado, nem por erro de ação)', () => {
  let casos = 0, passos = 0;
  for (const deck0 of DECKS_A) for (let semente = 1; semente <= 3; semente++) {
    for (const efeito of EFEITOS) {
      for (const armadilha of ARMADILHAS) {
        const deck = [efeito, armadilha];
        if (!Regras.deckValido(deck)) continue;
        // as versões: armou de verdade, e blefou com o efeito
        const jA = partida(semente, deck, deck0), jB = partida(semente, deck, deck0);
        const rA = Regras.aplicar(jA, 1, { tipo: 'carta', carta: armadilha });
        const rB = Regras.aplicar(jB, 1, { tipo: 'virar', carta: efeito });
        if (!rA.ok || !rB.ok) continue;   // esta combinação não deixa armar/blefar agora
        casos++;
        let d = diferenca(Regras.visaoDe(jA, 0), Regras.visaoDe(jB, 0));
        assert.strictEqual(d, null, `logo depois de virar (${armadilha} × blefe com ${efeito}, semente ${semente}): ${d}`);
        // as mesmas jogadas nas duas versões, enquanto a armadilha não agir
        const rng = rngDe(semente * 7919);
        for (let i = 0; i < 120 && jA.fase !== 'fim' && jB.fase !== 'fim'; i++) {
          if (jA.armada[1] !== armadilha || jB.armada[1] !== efeito) break;   // agiu (ou foi desvirada): a partir daqui é público
          const p = jA.vez;
          const visao = Regras.visaoDe(jA, p);
          const acao = p === 1 ? semCarta(visao, 0, rng) : jogadaAoAcaso(visao, 0, rng);
          const okA = Regras.aplicar(jA, p, acao), okB = Regras.aplicar(jB, p, acao);
          if (p === 0) assert.strictEqual(okA.ok, okB.ok, `oráculo: a ação ${JSON.stringify(acao)} de quem não sabe o segredo (deck ${deck0}) teve resultado diferente (${okA.erro || 'ok'} × ${okB.erro || 'ok'}) — ${armadilha} × blefe com ${efeito}, semente ${semente}`);
          if (!okA.ok || !okB.ok) break;
          if (jA.armada[1] !== armadilha || jB.armada[1] !== efeito) break;
          if (jA.fase === 'fim' || jB.fase === 'fim') break;   // acabou: a tela de fim mostra os blefes de propósito
          passos++;
          d = diferenca(Regras.visaoDe(jA, 0), Regras.visaoDe(jB, 0));
          assert.strictEqual(d, null, `depois de ${i + 1} jogadas (${armadilha} × blefe com ${efeito}, deck dele ${deck0}, semente ${semente}): ${d}`);
        }
      }
    }
  }
  assert.ok(casos >= 20, `poucos casos testados: ${casos}`);
  console.log(`  ${casos} pares armadilha × blefe, ${passos} jogadas comparadas`);
});

test('duas armadilhas diferentes também são indistinguíveis para o rival', () => {
  let casos = 0;
  for (let semente = 1; semente <= 12; semente++) {
    for (const x of ARMADILHAS) for (const y of ARMADILHAS) {
      if (x >= y) continue;
      const deck = [x, y];
      if (!Regras.deckValido(deck)) continue;
      const jX = partida(semente, deck), jY = partida(semente, deck);
      if (!Regras.aplicar(jX, 1, { tipo: 'carta', carta: x }).ok || !Regras.aplicar(jY, 1, { tipo: 'carta', carta: y }).ok) continue;
      casos++;
      const d = diferenca(Regras.visaoDe(jX, 0), Regras.visaoDe(jY, 0));
      assert.strictEqual(d, null, `${x} × ${y} (semente ${semente}): ${d}`);
    }
  }
  assert.ok(casos > 0);
});

test('o que vai para o rival nunca leva o sorteio, a mão dele fora da vez, nem a contagem de blefes', () => {
  const j = partida(5, ['ajuste', 'interferencia']);
  Regras.aplicar(j, 1, { tipo: 'virar', carta: 'ajuste' });
  const v = Regras.visaoDe(j, 0), texto = JSON.stringify(v);
  assert.ok(!/__rng/.test(texto), 'o gerador de números não vai junto');
  assert.strictEqual(v.armada[1], 'oculta');
  assert.strictEqual(v.stats[1].blefes, 0);
  assert.ok(!Object.values(v.cartas[1]).includes('armada'), 'nenhuma carta do rival aparece como armada');
});

test('decks de 3 cartas (inclusive com duas armadilhas), com o dono do "?" usando a terceira carta enquanto ele está armado', () => {
  let casos = 0, passos = 0;
  const TODAS = Object.keys(Regras.CARTAS);
  for (const efeito of EFEITOS) for (const armadilha of ARMADILHAS) for (const outra of TODAS) {
    if (outra === efeito || outra === armadilha) continue;
    const deck = [efeito, armadilha, outra];
    if (!Regras.deckValido(deck)) continue;
    const semente = casos % 7 + 1;
    const jA = partida(semente, deck, DECKS_A[casos % DECKS_A.length]), jB = partida(semente, deck, DECKS_A[casos % DECKS_A.length]);
    if (!Regras.aplicar(jA, 1, { tipo: 'carta', carta: armadilha }).ok || !Regras.aplicar(jB, 1, { tipo: 'virar', carta: efeito }).ok) continue;
    casos++;
    const rng = rngDe(semente * 104729 + casos);
    for (let i = 0; i < 100; i++) {
      if (jA.fase === 'fim' || jB.fase === 'fim' || jA.armada[1] !== armadilha || jB.armada[1] !== efeito) break;
      const p = jA.vez;
      let acao = jogadaAoAcaso(Regras.visaoDe(jA, p), 0, rng);
      // o dono pode usar a terceira carta; só não mexe no "?" (desvirar ou gastar a carta secreta tornaria o segredo público)
      if (p === 1 && ((acao.tipo === 'carta' || acao.tipo === 'virar') && (acao.carta === efeito || acao.carta === armadilha) || acao.tipo === 'virar')) acao = jA.fase === 'pegar' ? { tipo: 'pegar', idx: 0 } : acao;
      const okA = Regras.aplicar(jA, p, acao), okB = Regras.aplicar(jB, p, acao);
      assert.strictEqual(okA.ok, okB.ok, `resultado diferente para ${JSON.stringify(acao)} do jogador ${p} (${okA.erro || 'ok'} × ${okB.erro || 'ok'}) — deck ${deck}`);
      if (!okA.ok) break;
      if (jA.fase === 'fim' || jB.fase === 'fim' || jA.armada[1] !== armadilha || jB.armada[1] !== efeito) break;
      passos++;
      const d = diferenca(Regras.visaoDe(jA, 0), Regras.visaoDe(jB, 0));
      assert.strictEqual(d, null, `deck ${deck}, jogada ${i + 1}: ${d}`);
    }
  }
  assert.ok(casos >= 50, `poucos casos: ${casos}`);
  console.log(`  ${casos} decks de 3 cartas, ${passos} jogadas comparadas`);
});
