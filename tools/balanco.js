// Balanceamento por simulação: bot x bot (níveis configuráveis), alternando lados.
// Mede vitória por facção e por quem começa, duração e, por carta: vezes jogada e taxa de vitória de quem a jogou.
const C = require('../src/core.js');
const N = +process.argv[2] || 200, L0 = process.argv[3] || 'normal', L1 = process.argv[4] || L0;
const facW = { mata: 0, assom: 0, empate: 0 }, firstW = [0, 0], turns = [], card = {};
for (let s = 1; s <= N; s++) {
  const fac = s % 2 ? ['mata', 'assom'] : ['assom', 'mata'], g = new C.Game({ seed: s * 7919, fac }), bots = [C.makeBot(L0, 0, s), C.makeBot(L1, 1, s + 3)];
  const played = [new Set(), new Set()]; let steps = 0;
  while (!g.over && g.turn < 80 && steps < 6000) { const a = bots[g.cur](g), o = g.cur; if (a.c === 'play') played[o].add(g.p[o].hand[a.i]); g.apply(a); g.ev.length = 0; steps++; }
  turns.push(g.turn);
  if (g.winner === null || !g.over) { facW.empate++; continue; }
  facW[fac[g.winner]]++; firstW[g.winner]++;
  for (const o of [0, 1]) for (const id of played[o]) { const c = card[id] || (card[id] = { n: 0, w: 0 }); c.n++; if (g.winner === o) c.w++; }
}
const pct = (a, b) => (100 * a / Math.max(1, b)).toFixed(0) + '%';
console.log(`${N} partidas (${L0} x ${L1}) — Mata ${pct(facW.mata, N)} · Assombrações ${pct(facW.assom, N)} · empate ${facW.empate} · quem começa vence ${pct(firstW[0], firstW[0] + firstW[1])} · turnos médios ${(turns.reduce((a, b) => a + b, 0) / N / 2).toFixed(1)} por jogador`);
const rows = Object.entries(card).map(([id, c]) => [id, C.CARDS[id].fac, c.n, c.w / c.n]).sort((a, b) => a[1].localeCompare(b[1]) || b[3] - a[3]);
for (const [id, f, n, wr] of rows) console.log(`  ${f.padEnd(5)} ${C.CARDS[id].name.padEnd(16)} jogada em ${String(n).padStart(3)} partidas · vitória de quem jogou ${(wr * 100).toFixed(0)}%`);
