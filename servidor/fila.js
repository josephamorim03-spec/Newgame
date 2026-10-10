// Dice Duel · fila por rating (matchmaking), pronta para quando houver gente bastante jogando.
// Desligada por padrão (a variável FILA=1 liga): com pouca gente, juntar por rating só faria todo mundo esperar,
// e o jeito de jogar hoje é chamar um amigo. Ligada, quem entra na fila procura um rival de rating parecido;
// a diferença aceita cresce com a espera, e depois de um tempo vale qualquer rival, para ninguém ficar parado.
'use strict';

const Regras = require('../shared/regras');

const PADRAO = {
  janelaInicial: 100,      // diferença de rating aceita logo de cara
  crescePorSegundo: 5,     // quanto a janela abre por segundo de espera
  janelaMaxima: 400,       // até onde ela abre sozinha
  qualquerApos: 90_000,    // depois disso, qualquer rival serve
  intervalo: 2000,         // de quanto em quanto tempo a fila tenta formar pares
};

class Fila {
  // aoParear([a, b]): recebe as duas entradas pareadas (cada uma com os dados que vieram em entrar)
  constructor({ ativa = false, opcoes = {}, agora = Date.now, aoParear = () => {} } = {}) {
    this.ativa = ativa; this.o = { ...PADRAO, ...opcoes }; this.agora = agora; this.aoParear = aoParear;
    this.entradas = new Map();   // id da conta -> { id, rating, meta, desde, dados }
    this.relogio = ativa ? setInterval(() => this.rodar(), this.o.intervalo).unref() : null;
  }
  fechar() { clearInterval(this.relogio); }
  get tamanho() { return this.entradas.size; }
  tem(id) { return this.entradas.has(id); }

  // diferença de rating que esta entrada aceita agora
  janela(e, agora = this.agora()) {
    const espera = agora - e.desde;
    if (espera >= this.o.qualquerApos) return Infinity;
    return Math.min(this.o.janelaMaxima, this.o.janelaInicial + this.o.crescePorSegundo * espera / 1000);
  }
  // entrar de novo (outra aba, outro deck) troca a entrada, mas mantém o tempo de espera
  entrar({ id, rating, meta = Regras.META_PADRAO, dados = null }) {
    const antes = this.entradas.get(id);
    const e = { id, rating, meta: Regras.metaValida(meta), desde: antes ? antes.desde : this.agora(), dados };
    this.entradas.set(id, e);
    return e;
  }
  sair(id) { return this.entradas.delete(id); }

  // forma pares: quem espera há mais tempo escolhe primeiro o rival mais próximo em rating,
  // desde que a diferença caiba na janela dos dois (e a meta seja a mesma)
  parear() {
    const agora = this.agora(), livres = [...this.entradas.values()].sort((a, b) => a.desde - b.desde), pares = [];
    const usados = new Set();
    for (const a of livres) {
      if (usados.has(a.id)) continue;
      let melhor = null;
      for (const b of livres) {
        if (b.id === a.id || usados.has(b.id) || b.meta !== a.meta) continue;
        const dif = Math.abs(a.rating - b.rating);
        if (dif > Math.min(this.janela(a, agora), this.janela(b, agora))) continue;
        if (!melhor || dif < melhor.dif) melhor = { b, dif };
      }
      if (melhor) { usados.add(a.id); usados.add(melhor.b.id); pares.push([a, melhor.b]); }
    }
    for (const [a, b] of pares) { this.entradas.delete(a.id); this.entradas.delete(b.id); }
    return pares;
  }
  rodar() { for (const par of this.parear()) Promise.resolve(this.aoParear(par)).catch(e => console.error('fila', e)); }
}

module.exports = { Fila, PADRAO_FILA: PADRAO };
