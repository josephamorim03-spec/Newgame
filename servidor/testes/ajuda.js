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
  const blefavel = prontas.find(c => Regras.podeVirar(j, p, c).ok);
  if (blefavel && rng() < 0.15) return { tipo: 'virar', carta: blefavel };
  if (prontas.length && rng() < 0.25) {
    const c = prontas[Math.floor(rng() * prontas.length)], idx = Math.floor(rng() * j.mesa.length);
    if (Regras.podeUsar(j, p, c, idx).ok) {
      const d = j.mesa[idx], delta = d && d.v === 6 ? -1 : 1;
      return { tipo: 'carta', carta: c, idx, delta };
    }
  }
  return { tipo: 'pegar', idx: Math.floor(rng() * j.mesa.length) };
}

module.exports = { rngDe, jogadaAoAcaso };
