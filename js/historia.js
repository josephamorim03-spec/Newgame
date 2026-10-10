/* Dice Duel · modo história, "O Caderno da Diana" (docs/historia.md)
 * Os capítulos como dados, o leitor de gibi e o mapa. As falas vêm de js/historia_falas.js, que só tem as aprovadas
 * pelo dono (docs/historia.md §11): aqui só aparecem códigos (P-01, C1-03…); um código sem fala aprovada some do quadro.
 * O jogo (js/jogo.js) liga o resto por Historia.ligar({ jogar, estado, ... }).
 *   Historia.CAPS   Historia.cap(id)   Historia.falasRival(cap)   Historia.gibi(quadros) → Promise
 *   Historia.abrirMapa()   Historia.fala(id)
 */
(function () {
  'use strict';
  const FALAS = () => window.HISTORIA_FALAS || {};
  const CENAS = () => window.HISTORIA_CENAS || {};
  const fala = id => FALAS()[id];
  const QUEM = { diana: 'Diana', sapo: 'Sapo', coelho: 'Coelho', coruja: 'Dona Coruja' };

  // q(quem, códigos, humor): um quadro. Cada código é uma fala; " / " dentro dela separa os balões (um toque cada)
  const q = (quem, ids, humor = '') => ({ quem, ids: [].concat(ids), humor });
  // uma página do caderno: o título com os ingredientes (opção a) e a nota da margem (opção b), aprovadas juntas
  const pagina = (n, ids) => ({ quem: 'pagina', n, ids });

  const CAPS = [
    { id: 'P', titulo: 'Prólogo', nome: 'Boa noite. Uma partida?', rival: 'aprendiz', retrato: 'diana', meta: 8, semCartas: true, guia: true,
      antes: [q('diana', 'P-01'), q('diana', 'P-02', 'feliz'), q('diana', 'P-03')],
      depois: [q('diana', 'P-04', 'feliz'), q('diana', 'P-05'), q('diana', 'P-06')] },
    { id: 'C1', titulo: 'Capítulo 1', nome: 'Lagoa das Vitórias-Régias', rival: 'sapo', retrato: 'sapo', meta: 12,
      deckRival: ['coringa', 'ajuste', 'reverso'], regra: 'O Sapo não usa armadilhas.',
      antes: [q('diana', 'C1-01'), q('diana', 'C1-02'), q('sapo', 'C1-03'), q('sapo', 'C1-04'), q('sapo', 'C1-05'), q('sapo', 'C1-06')],
      depois: [pagina(1, ['C1-13a', 'C1-13b']), q('sapo', 'C1-14')],
      falas: { inicio: ['C1-07'], 'carta:reverso': ['C1-08'], seuDisparoGrande: ['C1-09'], minhaRuptura: ['C1-10'], venci: ['C1-11'], perdi: ['C1-12'] } },
    { id: 'C2', titulo: 'Capítulo 2', nome: 'Toca Número 12', rival: 'coelho', retrato: 'coelho', meta: 16,
      deckRival: ['pressa', 'sobrecarga', 'ajuste'], ritmo: 0.55, regra: 'O Coelho joga rápido.',
      antes: [q('diana', 'I1-01'), q('diana', 'I1-02'), q('diana', 'I1-03'), q('diana', 'C2-01'), q('diana', 'C2-02'),
        q('coelho', 'C2-03'), q('coelho', 'C2-04'), q('coelho', 'C2-05')],
      depois: [pagina(2, ['C2-12a', 'C2-12b']), q('coelho', 'C2-13'), q('coelho', 'C2-14a')],
      falas: { inicio: ['C2-06'], 'carta:sobrecarga': ['C2-07'], seuDisparoGrande: ['C2-08'], minhaRuptura: ['C2-09'], venci: ['C2-10'], perdi: ['C2-11'] } },
  ];
  const cap = id => CAPS.find(c => c.id === id) || null;
  // as falas do rival na partida, no formato de RIVAIS[].falas (só as aprovadas)
  function falasRival(c) {
    const out = {};
    for (const [k, ids] of Object.entries(c.falas || {})) { const l = ids.map(fala).filter(Boolean); if (l.length) out[k] = l; }
    return out;
  }
  // o guia do Prólogo na voz da Diana (no lugar das explicações de sempre)
  const GUIA = { eco: 'G-01', passo: 'G-02', oposto: 'G-03b', disparo: 'G-04', ruptura: 'G-05', bolso: 'G-06' };

  // ---------- o leitor de gibi ----------
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // um balão: "(direção)" no começo vira rubrica; "NOME:" no começo troca quem fala; "…" sozinho é uma pausa
  function balao(txt, quem) {
    let t = txt.trim(), rubrica = '', fala = quem, caixa = false;
    const r = t.match(/^\(([^)]*)\)\s*/); if (r) { rubrica = r[1]; t = t.slice(r[0].length); }
    const n = t.match(/^([A-ZÁÉÍÓÚÂÊÔÃÕÇ]{3,}(?: [A-ZÁÉÍÓÚÂÊÔÃÕÇ]+)?)(?: \(([^)]*)\))?:\s*/);
    if (n) { fala = n[1].toLowerCase(); if (n[2]) rubrica = n[2]; t = t.slice(n[0].length); caixa = fala === 'caixa'; }
    return { t, rubrica, quem: fala, caixa, pausa: /^…$/.test(t) };
  }
  function batidas(qd) {
    const out = [];
    for (const id of qd.ids) { const f = fala(id); if (!f) continue; f.split(' / ').forEach(b => out.push({ id, ...balao(b, qd.quem) })); }
    return out;
  }
  function quadroHTML(qd) {
    const cena = qd.ids.map(id => CENAS()[id]).find(Boolean) || '';
    if (qd.quem === 'pagina') {
      return `<div class="gq gq-pagina"><div class="gq-folha"><span class="gq-num">página ${qd.n}</span><div class="gq-linhas"></div></div>${cena ? `<p class="gq-cena">${esc(cena)}</p>` : ''}</div>`;
    }
    const ret = window.Retratos && QUEM[qd.quem] ? Retratos.retrato(qd.quem, qd.humor) : '';
    return `<div class="gq"><div class="gq-topo">${ret}<b>${esc(QUEM[qd.quem] || '')}</b></div>${cena ? `<p class="gq-cena">${esc(cena)}</p>` : ''}<div class="gq-baloes"></div></div>`;
  }
  // mostra os quadros um a um; cada toque mostra o próximo balão. "Pular" termina na hora. Devolve quando acaba
  function gibi(quadros, { titulo = '' } = {}) {
    const fila = quadros.map(qd => ({ qd, bs: batidas(qd) })).filter(x => x.bs.length);
    if (!fila.length) return Promise.resolve();
    return new Promise(res => {
      const el = document.createElement('div');
      el.className = 'gibi'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', titulo || 'História');
      el.innerHTML = `<div class="gibi-topo">${titulo ? `<span class="gibi-titulo">${esc(titulo)}</span>` : '<span></span>'}<button class="btn-link gibi-pular">Pular</button></div>
        <div class="gibi-pagina" aria-live="polite"></div><p class="gibi-dica">toque para continuar</p>`;
      document.body.appendChild(el);
      if (window.Som) Som.tocar('abrir');
      const pag = el.querySelector('.gibi-pagina');
      let iq = -1, ib = 0, atual = null, acabou = false;
      const fim = () => { if (acabou) return; acabou = true; document.removeEventListener('keydown', tecla, true); el.remove(); if (window.Som) Som.tocar('fechar'); res(); };
      function proximo() {
        if (iq >= 0 && ib < fila[iq].bs.length) return mostrarBatida();
        iq++; ib = 0;
        if (iq >= fila.length) return fim();
        // um quadro novo: no máximo dois na tela (o anterior fica, apagado, acima)
        pag.querySelectorAll('.gq.saindo').forEach(x => x.remove());
        pag.querySelectorAll('.gq').forEach(x => x.classList.add('saindo'));
        pag.insertAdjacentHTML('beforeend', quadroHTML(fila[iq].qd));
        atual = pag.lastElementChild;
        mostrarBatida();
      }
      function mostrarBatida() {
        const b = fila[iq].bs[ib++], qd = fila[iq].qd;
        if (qd.quem === 'pagina') {
          const linhas = atual.querySelector('.gq-linhas');
          const [titulo, ...resto] = b.t.split(' · ');
          linhas.insertAdjacentHTML('beforeend', b.rubrica
            ? `<p class="gq-margem"><small>${esc(b.rubrica)}</small>${esc(b.t)}</p>`
            : `<p class="gq-titulo-pag">${esc(titulo)}</p>${resto.map(r => `<p class="gq-ingr">${esc(r)}</p>`).join('')}`);
        } else {
          const outro = b.quem !== qd.quem && !b.caixa ? `<b class="gq-quem">${esc(QUEM[b.quem] || b.quem[0].toUpperCase() + b.quem.slice(1))}</b>` : '';
          atual.querySelector('.gq-baloes').insertAdjacentHTML('beforeend',
            `<p class="gq-balao${b.caixa ? ' caixa' : ''}${b.pausa ? ' pausa' : ''}">${b.rubrica ? `<i>${esc(b.rubrica)}</i> ` : ''}${outro}${esc(b.t)}</p>`);
        }
        if (window.Som) Som.tocar(b.pausa ? 'toque' : 'falaRival', { voz: b.quem === 'diana' ? 'diana' : 'coruja' });
      }
      function tecla(e) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fim(); }
        else if (['Enter', ' ', 'ArrowRight'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); proximo(); }
      }
      document.addEventListener('keydown', tecla, true);
      el.addEventListener('click', e => { if (e.target.closest('.gibi-pular')) fim(); else proximo(); });
      proximo();
    });
  }

  // ---------- o mapa ----------
  let ligacao = null;   // { estado(): {feitos}, jogar(capId), retrato(id) }
  function abrirMapa() {
    const j = document.getElementById('janelaHistoria'); if (!j || !ligacao) return;
    const est = ligacao.estado(), prox = R().proximoCapitulo(est);
    const linhas = CAPS.map(c => {
      const feito = est.feitos.includes(c.id), aberto = feito || c.id === prox;
      const rec = R().HISTORIA.recompensa[c.id];
      const premio = !rec ? '' : rec.carta ? `carta ${ligacao.nomeCarta(rec.carta)}` : `${rec.moedas} moedas`;
      return `<li class="hc${feito ? ' feito' : ''}${aberto ? '' : ' travado'}${c.id === prox ? ' atual' : ''}">
        <span class="hc-retrato">${Retratos.retrato(c.retrato)}</span>
        <span class="hc-txt"><small>${esc(c.titulo)}</small><b>${esc(c.nome)}</b><span>${feito ? 'Feito' : aberto ? (premio ? `Vale: ${premio}` : 'Comece por aqui') : 'Fechado'}</span></span>
        ${aberto ? `<button class="btn ${c.id === prox ? 'btn-mel' : 'btn-papel'}" data-cap="${c.id}">${feito ? 'Jogar de novo' : 'Jogar'}</button>` : ''}</li>`;
    }).join('');
    j.querySelector('#historiaConteudo').innerHTML = `<ol class="historia-caps">${linhas}<li class="hc travado em-breve"><span class="hc-txt"><small>Capítulos 3 a 8</small><b>Raposa, Urso, Guaxinim, Ovelha, Dona Coruja e…</b><span>Em breve</span></span></li></ol>`;
    j.hidden = false;
    if (window.Som) Som.tocar('abrir');
  }
  const R = () => window.Regras;
  function ligar(l) {
    ligacao = l;
    const j = document.getElementById('janelaHistoria'); if (!j) return;
    j.addEventListener('click', e => {
      const b = e.target.closest('[data-cap]');
      if (b) { j.hidden = true; ligacao.jogar(b.dataset.cap); return; }
      if (e.target.closest('#btnFecharHistoria')) { j.hidden = true; if (window.Som) Som.tocar('fechar'); }
    });
  }

  window.Historia = { CAPS, cap, falasRival, GUIA, fala, gibi, abrirMapa, ligar };
})();
