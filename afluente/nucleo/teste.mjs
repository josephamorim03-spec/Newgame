// Teste de regras do núcleo v5: joga muitos vales (ao acaso e guloso) e confere invariantes e a coerência entre a prévia
// (o que a tela mostra ao escolher a peça) e o que acontece ao colocar. Uso: node teste.mjs [vales]
import { Game, rngOf, KQ, KR } from './regras.js';
const N = +process.argv[2] || 150; const F = {}; let games = 0, moves = 0, skips = 0;
const fail = (k, msg) => { F[k] = F[k] || { n: 0, ex: msg }; F[k].n++; };
for (let g = 0; g < N; g++) { const greedy = g % 2 === 0, G = Game({ seed: 't' + g }), S = G.S, R = rngOf('jog' + g); games++;
  let guard = 0, lastSeason = S.season, clockSum = 0;
  while (!S.over && guard++ < 400) {
    if (S.escolha.length) { G.choose(Math.floor(R() * 2)); continue; }
    // também passa a vez de propósito às vezes, para testar o caminho de passar
    if (!G.fits() || R() < 0.06) { const c0 = S.clock, s0 = S.season; G.skip(); skips++; if (S.clock === c0 && S.season === s0) fail('pular-sem-tempo', 'pular a vez não conta no relógio'); 
      if (S.clock >= (S.season % 2 === 0 ? S.seca : S.aguas)) fail('pular-estacao', `pular deixou o relógio em ${S.clock} sem virar a estação`); continue; }
    // escolhe: guloso pelo que a prévia mostra, ou ao acaso
    const ops = []; for (const k of G.slots()) for (const o of G.options(k)) ops.push(o);
    const o = greedy ? ops.reduce((a, b) => (b.vil.filter(v => v.done).length * 10 + b.vil.filter(v => v.after > v.before).length + (b.wetSelf ? 1 : 0) > a.vil.filter(v => v.done).length * 10 + a.vil.filter(v => v.after > v.before).length + (a.wetSelf ? 1 : 0) ? b : a)) : ops[Math.floor(R() * ops.length)];
    const left0 = S.left, season0 = S.season, vilDone = new Set(o.vil.filter(v => v.done).map(v => v.id));
    const res = G.place(o.k, o.e); moves++;
    if (!res) { fail('place-null', 'place devolveu null para uma opção legal'); break; }
    const ped = new Set(res.ev.filter(x => x.t === 'pedido').map(x => x.k));
    // prévia × resultado: a vila que a prévia dizia que ia crescer cresceu (e vice-versa)
    for (const id of vilDone) if (!ped.has(id)) fail('previa-cresce-mas-nao', 'a prévia dizia "a vila cresce" e não cresceu');
    // (a estação que vira nesta jogada pode fazer uma vila crescer com a chuva: isso a prévia não mostra, e o aviso diz)
    if (S.season === season0) for (const id of ped) if (!vilDone.has(id)) fail('cresce-sem-previa', 'a vila cresceu sem a prévia avisar');
    if (S.season === season0) { const W = G.water(); if (W.wet.has(o.k) !== o.wetSelf) fail('previa-agua', 'a prévia de água da peça não bate com o resultado'); }
    if (S.left < 0) fail('pilha-negativa', 'a pilha ficou negativa');
    if (S.over !== (S.left <= 0 && !S.escolha.length)) fail('fim', `fim incoerente: over=${S.over} left=${S.left} escolha=${S.escolha.length}`);
    // pedido novo não nasce cumprido
    for (const v of S.vilas.values()) if (G.progress(v) >= v.req.n && !S.escolha.length) { fail('pedido-ja-cumprido', `pedido "${v.req.t}" já nasce cumprido (nível ${v.lvl})`); }
    if (S.clock >= (S.season % 2 === 0 ? S.seca : S.aguas)) fail('relogio', 'o relógio passou do tamanho da estação');
  }
  if (guard >= 400) fail('travou', 'a partida não acabou em 400 passos');
}
console.log(`${games} vales, ${moves} jogadas, ${skips} vezes passou a vez`);
const ks = Object.keys(F); if (!ks.length) console.log('tudo certo'); else for (const k of ks) console.log(`FALHA ${k}: ${F[k].n}× — ${F[k].ex}`);
process.exit(ks.length ? 1 : 0);
