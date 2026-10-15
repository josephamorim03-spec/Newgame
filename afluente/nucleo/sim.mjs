// Simulador do núcleo v5. Não mede diversão: só se a partida tem tamanho bom, se a escolha de onde pôr muda alguma
// coisa e quantas jogadas passam sem nada acontecer. Uso: node sim.mjs [vales] [bot: guloso|acaso]
import { Game, PEDIDOS } from './regras.js';
const N = +(process.argv[2] || 20), BOT = process.argv[3] || 'guloso';
const med = a => { a = a.slice().sort((x, y) => x - y); return a.length ? a[a.length >> 1] : 0; }, q = (a, p) => { a = a.slice().sort((x, y) => x - y); return a[Math.floor(p * (a.length - 1))]; };
// valor de uma opção para o bot: atender pedido vale muito, avançar pedido vale, ligar nascente vale, secar alguém custa
export function valor(o) { let v = 0; for (const x of o.vil) { if (x.done) v += 12; else v += 3 * Math.max(0, Math.min(x.after, x.req.n) - Math.min(x.before, x.req.n)); }
  v += 4 * o.spring - 4 * o.buried + (o.perfect ? 4 : 0) + 0.6 * (o.gained.length - o.lost.length) + (o.wetSelf ? 1 : 0) - (o.drySelf ? 1 : 0) + 0.2 * o.marks.filter(Boolean).length; return v; }
const M = { moves: 0, len: [], gente: [], ped: [], ev: { pedido: 0, nascente: 0, perfeita: 0, seca: 0, chuva: 0, soterrou: 0 }, quiet: 0, tie: 0, gap: [], opts: [], slotsN: [], since: [], dryMoves: 0, lvl: [], vilas: [], flow: [], used: [] };
for (let v = 0; v < N; v++) { const G = Game({ seed: 'sim' + v }); let moves = 0, last = 0, peds = 0;
  while (!G.S.over && moves < 300) {
    while (G.S.escolha.length) { const ch = G.S.escolha[0]; // escolhe o pacote que mais serve aos pedidos abertos
      const want = { lavoura: 'roca', mata: 'mata', crescer: 'vila', agua: 'rio', pasto: 'rio' }, score = p => [...G.S.vilas.values()].filter(x => want[x.req.t] === p.tema).length + Math.random() * 0.1;
      G.choose(BOT === 'acaso' ? Math.floor(Math.random() * 2) : (score(ch[0]) >= score(ch[1]) ? 0 : 1)); }
    if (G.S.over) break;
    const all = []; const per = new Map(); let nslots = 0;
    for (const k of G.slots()) { const os = G.options(k); if (os.length) nslots++; for (const o of os) { const val = valor(o); all.push({ o, val }); per.set(k, Math.max(per.get(k) ?? -1e9, val)); } }
    if (!all.length) { G.skip(); continue; }
    M.opts.push(all.length); M.slotsN.push(nslots);
    const ps = [...per.values()].sort((a, b) => b - a); M.gap.push(ps[0] - (ps[1] ?? ps[0])); if (ps.length > 1 && ps[0] - ps[1] <= 1) M.tie++;
    all.sort((a, b) => b.val - a.val); const pick = BOT === 'acaso' ? all[Math.floor(Math.random() * all.length)] : all[0];
    const res = G.place(pick.o.k, pick.o.e); moves++; M.moves++;
    const evs = new Set(res.ev.map(e => e.t)); for (const e of evs) M.ev[e] = (M.ev[e] || 0) + 1; peds += res.ev.filter(e => e.t === 'pedido').length;
    const progressed = pick.o.vil.some(x => Math.min(x.after, x.req.n) > Math.min(x.before, x.req.n));
    if (!evs.size && !progressed && !(pick.o.wetSelf && G.board.get(pick.o.k))) M.quiet++; if (!evs.size && !progressed) M.quiet2 = (M.quiet2 || 0) + 1; if (evs.size) { M.since.push(moves - last); last = moves; }
    if (pick.o.drySelf) M.dryMoves++;
  }
  const W = G.water(false); M.flow.push(W.nets.reduce((s, n) => s + n.flow, 0)); M.used.push(W.nets.reduce((s, n) => s + n.used, 0));
  M.len.push(moves); M.gente.push(G.S.gente); M.ped.push(peds); M.vilas.push(G.S.vilas.size); M.lvl.push(Math.max(...[...G.S.vilas.values()].map(x => x.lvl))); }
const pc = x => (100 * x / M.moves).toFixed(0) + '%';
console.log(`bot ${BOT}, ${N} vales: duração mediana ${med(M.len)} jogadas (p10 ${q(M.len, 0.1)}, p90 ${q(M.len, 0.9)}) · gente mediana ${med(M.gente)} (p90 ${q(M.gente, 0.9)})`);
console.log(`pedidos atendidos por partida: mediana ${med(M.ped)} · vilas no fim: ${med(M.vilas)} · maior nível: ${med(M.lvl)} · vazão no fim ${med(M.flow)} 💧, usada ${med(M.used)}`);
console.log(`opções por jogada (casa×giro): mediana ${med(M.opts)} · casas que servem: ${med(M.slotsN)}`);
console.log(`melhor casa contra a 2ª: diferença mediana ${med(M.gap).toFixed(1)} · empate (≤1): ${pc(M.tie)}`);
console.log(`jogadas quietas (nada acontece, nenhum pedido avança, nada novo recebe água): ${pc(M.quiet)} (sem contar a água: ${pc(M.quiet2||0)}) · intervalo entre acontecimentos: mediana ${med(M.since)}, p90 ${q(M.since, 0.9)}`);
console.log('acontecimentos (% das jogadas): ' + Object.entries(M.ev).map(([k, v]) => `${k} ${pc(v)}`).join(' · ') + ` · peça posta seca ${pc(M.dryMoves)}`);
