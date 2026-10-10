// utilidades dos testes: jogadas legais ao acaso e um rng com semente
'use strict';
const Regras = require('../../shared/regras');

function rngDe(semente) { let s = semente >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }

// uma ação legal para p no estado j (completo ou visão de p); às vezes usa carta
function jogadaAoAcaso(j, p, rng = Math.random) {
  if (j.fase === 'destino') { const ds = Regras.destinosValidos(j, p, j.mao.v); return { tipo: 'destino', modo: ds[Math.floor(rng() * ds.length)] }; }
  if (j.fase === 'decidir') return rng() < 0.6 || j.cor[p].length >= 5 ? { tipo: 'disparar' } : { tipo: 'segurar' };
  if (j.segundoDado && rng() < 0.2) return { tipo: 'dispensar' };
  const prontas = j.decks[p].filter(c => Regras.usavel(j, p, c));
  if (prontas.length && rng() < 0.25) {
    const c = prontas[Math.floor(rng() * prontas.length)], idx = Math.floor(rng() * j.mesa.length);
    if (Regras.podeUsar(j, p, c, idx).ok) {
      const d = j.mesa[idx], delta = d && d.v === 6 ? -1 : 1;
      return { tipo: 'carta', carta: c, idx, delta };
    }
  }
  return { tipo: 'pegar', idx: Math.floor(rng() * j.mesa.length) };
}

// a jogada de alguém que joga direitinho e sem pressa: o dado que não rompe (de preferência na corrente), dispensa o 2.º
// dado da Pressa, dispara com 3+ (sem cartas). Serve para os testes de tempo terem um jogador que joga de verdade.
function jogadaSimples(j, p) {
  if (j.fase === 'fim' || j.vez !== p) return null;
  if (j.fase === 'destino' && j.mao) { const seg = Regras.destinos(j, p, j.mao.v); return { tipo: 'destino', modo: seg.includes('corrente') ? 'corrente' : seg[0] || Regras.destinosValidos(j, p, j.mao.v)[0] }; }
  if (j.fase === 'decidir') return j.cor[p].length >= 3 ? { tipo: 'disparar' } : { tipo: 'segurar' };
  if (j.fase !== 'pegar' || !j.mesa.length) return null;
  if (j.segundoDado) return { tipo: 'dispensar' };
  let melhor = null;
  j.mesa.forEach((d, idx) => {
    const ds = Regras.destinosDoDado(j, p, idx), naCorrente = Regras.encaixaP(j, p, Regras.valorAoPegar(j, p, d));
    const nota = !Regras.seguroDado(j, p, d) ? 0 : naCorrente ? 2 : 1;
    const modo = nota === 2 ? 'corrente' : nota === 1 ? ds.find(m => m !== 'corrente') || ds[0] : ds[0];
    if (!melhor || nota > melhor.nota) melhor = { idx, modo, nota };
  });
  return { tipo: 'pegar', idx: melhor.idx, modo: melhor.modo };
}

module.exports = { rngDe, jogadaAoAcaso, jogadaSimples };
