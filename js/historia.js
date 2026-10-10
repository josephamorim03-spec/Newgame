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
  const QUEM = { diana: 'Diana', sapo: 'Sapo', coelho: 'Coelho', raposa: 'Raposa', urso: 'Urso', guaxinim: 'Guaxinim', ovelha: 'Ovelha', coruja: 'Dona Coruja' };

  // q(quem, códigos, humor): um quadro. Cada código é uma fala; " / " dentro dela separa os balões (um toque cada)
  const q = (quem, ids, humor = '') => ({ quem, ids: [].concat(ids), humor });
  // uma página do caderno: o título com os ingredientes (opção a) e a nota da margem (opção b), aprovadas juntas
  const pagina = (n, ids) => ({ quem: 'pagina', n, ids });
  // a revelação: dois botões; o escolhido fala primeiro, o outro em seguida
  const escolha = (quem, opcoes) => ({ quem, ids: [], escolha: opcoes });
  // as estrelas além de vencer (o contexto vem do fim da partida: js/jogo.js, ctxEstrelas)
  const semRuptura = ['Vença sem ruptura', c => c.rupt === 0];

  const CAPS = [
    { id: 'P', titulo: 'Prólogo', nome: 'Boa noite. Uma partida?', rival: 'aprendiz', retrato: 'diana', meta: 8, semCartas: true, guia: true,
      antes: [q('diana', 'P-01'), q('diana', 'P-02', 'feliz'), q('diana', 'P-03')],
      depois: [q('diana', 'P-04', 'feliz'), q('diana', 'P-05'), q('diana', 'P-06')] },
    { id: 'C1', titulo: 'Capítulo 1', nome: 'Lagoa das Vitórias-Régias', rival: 'sapo', retrato: 'sapo', meta: 12,
      deckRival: ['coringa', 'ajuste', 'reverso'], regra: 'O Sapo não usa armadilhas.',
      antes: [q('diana', 'C1-01'), q('diana', 'C1-02'), q('sapo', 'C1-03'), q('sapo', 'C1-04'), q('sapo', 'C1-05'), q('sapo', 'C1-06')],
      depois: [pagina(1, ['C1-13a', 'C1-13b']), q('sapo', 'C1-14'), q('sapo', 'C1-16')],
      falas: { inicio: ['C1-07'], 'carta:reverso': ['C1-08'], seuDisparoGrande: ['C1-09'], minhaRuptura: ['C1-10'], venci: ['C1-11'], perdi: ['C1-12'] } },
    { id: 'C2', titulo: 'Capítulo 2', nome: 'Toca Número 12', rival: 'coelho', retrato: 'coelho', meta: 16,
      deckRival: ['pressa', 'sobrecarga', 'ajuste'], ritmo: 0.55, regra: 'O Coelho joga rápido.',
      antes: [q('diana', 'I1-01'), q('diana', 'I1-02'), q('diana', 'I1-03'), q('diana', 'C2-01'), q('diana', 'C2-02'),
        q('coelho', 'C2-03'), q('coelho', 'C2-04'), q('coelho', 'C2-05'), q('coelho', 'C2-15')],
      depois: [pagina(2, ['C2-12a', 'C2-12b']), q('coelho', 'C2-13'), q('coelho', 'C2-14a')],
      falas: { inicio: ['C2-06'], 'carta:sobrecarga': ['C2-07'], meuDisparo: ['C2-16'], seuDisparoGrande: ['C2-08'], minhaRuptura: ['C2-09'], venci: ['C2-10'], perdi: ['C2-11'] },
      estrelas: [['Dispare 4 correntes', c => c.disp >= 4], semRuptura] },
    { id: 'C3', titulo: 'Capítulo 3', nome: 'Toca de Inverno', rival: 'raposa', retrato: 'raposa', meta: 16,
      deckRival: ['fundo', 'ancora', 'virar'], regra: 'A Raposa usa armadilhas.',
      antes: [q('diana', 'C3-01'), q('diana', 'C3-02'), q('diana', 'C3-17'), q('diana', 'C3-03'), q('raposa', 'C3-04a'), q('raposa', 'C3-05'), q('raposa', 'C3-06'), q('raposa', 'C3-15')],
      depois: [pagina(3, ['C3-14a', 'C3-14b'])],
      falas: { inicio: ['C3-07'], armou: ['C3-08'], 'pegou:fundo': ['C3-09'], seuDisparoGrande: ['C3-10'], minhaRuptura: ['C3-11'], venci: ['C3-12'], perdi: ['C3-13'] },
      estrelas: [['Não perca dado para o Fundo Falso', c => !c.caiu.includes('fundo')], ['Vença por 4 pontos ou mais', c => c.margem >= 4]] },
    { id: 'C4', titulo: 'Capítulo 4', nome: 'Caverna do Gorro', rival: 'urso', retrato: 'urso', meta: 16,
      deckRival: ['pausa', 'ancora', 'interferencia'], dispMin: 5, regra: 'O Urso só dispara com 5 dados ou mais.',
      antes: [q('diana', 'C4-01'), q('diana', 'C4-02'), q('urso', 'C4-03'), q('urso', 'C4-04b'), q('urso', 'C4-05'), q('urso', 'C4-14')],
      depois: [pagina(4, ['C4-12a', 'C4-12b']), q('urso', 'C4-13')],
      falas: { inicio: ['C4-06'], 'carta:pausa': ['C4-07'], seuDisparoGrande: ['C4-08'], minhaRuptura: ['C4-09'], venci: ['C4-10'], perdi: ['C4-11'] },
      estrelas: [['Paciência: segure a corrente e dispare 2 pontos a mais', c => (c.simb['⧗'] || 0) > 0], ['Dispare uma corrente de 5', c => c.maior >= 5]] },
    { id: 'C5', titulo: 'Capítulo 5', nome: 'Ferro-Velho do Moletom', rival: 'guaxinim', retrato: 'guaxinim', meta: 16,
      deckRival: ['furto', 'pedagio', 'fundo'], esperto: true, bolsoRival: true, regra: 'O Guaxinim começa com um dado no Bolso; você, sem.',
      antes: [q('diana', 'C5-01'), q('diana', 'C5-02'), q('guaxinim', 'C5-03'), q('guaxinim', 'C5-04'), q('guaxinim', 'C5-05'), q('guaxinim', 'C5-06')],
      depois: [pagina(5, ['C5-14a', 'C5-14b']), q('guaxinim', 'C5-15')],
      falas: { inicio: ['C5-07'], 'carta:furto': ['C5-08'], 'pegou:pedagio': ['C5-09'], seuDisparoGrande: ['C5-10'], minhaRuptura: ['C5-11'], venci: ['C5-12'], perdi: ['C5-13'] },
      estrelas: [['Termine com o Bolso cheio', c => c.bolsoCheio], ['Faça um Bloqueio', c => (c.simb['✦'] || 0) > 0]] },
    { id: 'C6', titulo: 'Capítulo 6', nome: 'Pasto Hexagonal', rival: 'ovelha', retrato: 'ovelha', meta: 16,
      deckRival: ['espelho', 'rerrolar', 'ancora'], esperto: true, regra: 'A Ovelha marca dados com o Espelho.',
      antes: [q('diana', 'C6-01'), q('diana', 'C6-02'), q('ovelha', 'C6-03'), q('ovelha', 'C6-04'), q('ovelha', 'C6-05')],
      depois: [pagina(6, ['C6-12a', 'C6-12b'])],
      falas: { inicio: ['C6-06'], meuDisparo: ['C6-15'], seuOposto: ['C6-16'], 'armou:espelho': ['C6-07'], seuDisparoGrande: ['C6-08'], minhaRuptura: ['C6-09'], venci: ['C6-10'], perdi: ['C6-11'] },
      estrelas: [['Escape de um Espelho', c => (c.simb['↺'] || 0) > 0], ['Faça uma Harmonia', c => (c.simb['✿'] || 0) > 0]] },
    { id: 'C7', titulo: 'Capítulo 7', nome: 'A Biblioteca', rival: 'coruja', retrato: 'coruja', meta: 16,
      deckRival: ['lacre', 'ajuste', 'interferencia'], esperto: true, regra: 'Dona Coruja lê a Mesa.',
      antes: [q('diana', 'I6-01'), q('diana', 'I6-02'), q('diana', 'I6-03'), q('coruja', 'C7-01'), q('coruja', 'C7-02'), q('coruja', 'C7-03')],
      depois: [q('coruja', 'C7-10b'), q('coruja', 'C7-11'), q('coruja', 'C7-12')],
      falas: { inicio: ['C7-04'], 'pegou:lacre': ['C7-05'], seuDisparoGrande: ['C7-06'], minhaRuptura: ['C7-07'], venci: ['C7-08'], perdi: ['C7-09'] },
      estrelas: [['Faça um Bloqueio', c => (c.simb['✦'] || 0) > 0], semRuptura] },
    { id: 'C8', titulo: 'Capítulo 8', nome: 'Fita Dupla', rival: 'diana8', retrato: 'diana', meta: 16,
      deckRival: ['interferencia', 'espelho', 'pressa'], esperto: true, regra: 'Dessa vez vale.',
      antes: [q('diana', 'R-01'), q('diana', 'R-02'), q('diana', 'R-03'), q('diana', 'R-04'), q('diana', 'R-05'), q('diana', 'R-06'),
        escolha('diana', [{ rotulo: 'Você me usou.', id: 'R-07' }, { rotulo: 'E as páginas?', id: 'R-08' }]),
        q('diana', 'R-10'), q('diana', 'R-11')],
      // o final: a cura com a corrente de quem joga, o fecho do Eco, os créditos e os pós-créditos
      // a F-03b (sem o "Fechou." repetido) só entra quando o dono a aprovar; até lá, a F-03
      depois: [{ quem: 'diana', ids: [], cura: true }, q('diana', fala('F-03b') ? 'F-03b' : 'F-03'), q('diana', 'F-A'), { quem: 'diana', ids: ['F-A2'], se: 'fita' },
        { quem: 'diana', ids: [], final: ['F-Za', 'F-Zb', 'F-Zc', 'F-Zd'] },   // a frase final: a 1.ª aprovada
        { quem: 'creditos', ids: [] }, { quem: 'titulo', ids: ['X-01'] }, q('sapo', 'X-02a')],
      falas: { inicio: ['C8-01'], seuOposto: ['C8-02'], 'armou:espelho': ['C8-03'], seuDisparoGrande: ['C8-04'], minhaRuptura: ['C8-05'], venci: ['C8-06'], perdi: ['C8-07'] },
      estrelas: [['Fita complementar: uma corrente de 4 ou mais só de Opostos', c => c.fita], semRuptura] },
  ];
  CAPS[1].estrelas = [['Dispare uma corrente de 4', c => c.maior >= 4], semRuptura];
  // as estrelas de uma partida vencida: a 1.ª é vencer, as outras duas são do capítulo
  const estrelasDe = (c, ctx) => !ctx.venceu || !c.estrelas ? 0 : 1 + c.estrelas.filter(([, ok]) => ok(ctx)).length;
  const cap = id => CAPS.find(c => c.id === id) || null;
  // as falas do rival na partida, no formato de RIVAIS[].falas (só as aprovadas)
  function falasRival(c) {
    const out = {};
    const umBalao = t => t.replace(/\s*\(balão menor\)\s*/g, ' ').split(' / ').map(x => x.trim()).join(' ');
    for (const [k, ids] of Object.entries(c.falas || {})) { const l = ids.map(fala).filter(Boolean).map(umBalao); if (l.length) out[k] = l; }
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
  const NUM = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis'];
  const BASE = { 1: 'A', 6: 'T', 2: 'C', 5: 'G', 3: '·', 4: '·' };
  function batidas(qd, ctx = {}) {
    if (qd.se && !ctx[qd.se]) return [];
    if (qd.final) { const id = qd.final.find(fala); return id ? batidas({ ...qd, final: null, ids: [id] }, ctx) : []; }
    if (qd.escolha) return [{ escolha: qd.escolha }];
    if (qd.quem === 'creditos') return [{ creditos: true }];
    if (qd.cura) {
      // F-01 com a corrente de quem joga: os números dela por extenso; e o F-02 se ela tiver 3 ou 4
      const cor = (ctx.corrente && ctx.corrente.length ? ctx.corrente : [2, 5, 2, 5]), f1 = fala('F-01');
      if (!f1) return [];
      const [, ...resto] = f1.split(' / '), lida = cor.map(v => NUM[v]).join(', ');
      const out = [{ fita: cor }, { id: 'F-01', ...balao(lida[0].toUpperCase() + lida.slice(1) + '.', 'diana') }, ...resto.map(b => ({ id: 'F-01', ...balao(b, 'diana') }))];
      if (cor.some(v => v === 3 || v === 4) && fala('F-02')) fala('F-02').split(' / ').forEach(b => out.push({ id: 'F-02', ...balao(b, 'diana') }));
      return out;
    }
    const out = [];
    for (const id of qd.ids) { const f = fala(id); if (!f) continue; f.split(' / ').forEach(b => out.push({ id, ...balao(b, qd.quem) })); }
    return out;
  }
  function quadroHTML(qd) {
    const cena = qd.ids.map(id => CENAS()[id]).find(Boolean) || '';
    if (qd.quem === 'creditos') return `<div class="gq gq-creditos"><p class="gq-cred-titulo">Dice Duel</p><p class="gq-cred-sub">O Caderno da Diana</p><p class="gq-cred-fim">fim</p></div>`;
    if (qd.quem === 'titulo') return `<div class="gq gq-titulo"><p class="gq-riscado"><s>Dice Duel</s><span class="gq-marcador">DianaDice</span></p><div class="gq-baloes"></div></div>`;
    if (qd.quem === 'pagina') {
      return `<div class="gq gq-pagina"><div class="gq-folha"><span class="gq-num">página ${qd.n}</span><div class="gq-linhas"></div></div>${cena ? `<p class="gq-cena">${esc(cena)}</p>` : ''}</div>`;
    }
    const ret = window.Retratos && QUEM[qd.quem] ? Retratos.retrato(qd.quem === 'diana8' ? 'diana' : qd.quem, qd.humor) : '';
    return `<div class="gq"><div class="gq-topo">${ret}<b>${esc(QUEM[qd.quem] || '')}</b></div>${cena ? `<p class="gq-cena">${esc(cena)}</p>` : ''}<div class="gq-baloes"></div></div>`;
  }
  // mostra os quadros um a um; cada toque mostra o próximo balão. "Pular" termina na hora. Devolve quando acaba
  function gibi(quadros, { titulo = '', ctx = {} } = {}) {
    const fila = quadros.map(qd => ({ qd, bs: batidas(qd, ctx) })).filter(x => x.bs.length);
    if (!fila.length) return Promise.resolve();
    return new Promise(res => {
      const el = document.createElement('div');
      el.className = 'gibi'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', titulo || 'História');
      el.innerHTML = `<div class="gibi-topo">${titulo ? `<span class="gibi-titulo">${esc(titulo)}</span>` : '<span></span>'}<button class="btn-link gibi-pular">Pular</button></div>
        <div class="gibi-pagina" aria-live="polite"></div><p class="gibi-dica">toque para continuar</p>`;
      document.body.appendChild(el);
      if (window.Som) Som.tocar('abrir');
      const pag = el.querySelector('.gibi-pagina');
      let iq = -1, ib = 0, atual = null, acabou = false, esperando = false;
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
        if (b.creditos) return;
        if (b.escolha) {
          // dois botões: o escolhido fala primeiro e o outro em seguida (os dois são do roteiro)
          esperando = true;
          atual.querySelector('.gq-baloes').insertAdjacentHTML('beforeend', `<div class="gq-escolha">${b.escolha.map((o, k) => `<button class="btn btn-papel" data-escolha="${k}">${esc(o.rotulo)}</button>`).join('')}</div>`);
          atual.querySelectorAll('[data-escolha]').forEach(bt => bt.addEventListener('click', ev => {
            ev.stopPropagation();
            const k = +bt.dataset.escolha, ordem = [b.escolha[k], b.escolha[1 - k]];
            atual.querySelector('.gq-escolha').remove();
            const novas = [];
            ordem.forEach(o => { novas.push({ rotulo: o.rotulo }); const f = fala(o.id); if (f) f.split(' / ').forEach(x => novas.push({ id: o.id, ...balao(x, qd.quem) })); });
            fila[iq].bs.splice(ib, 0, ...novas);
            esperando = false; proximo();
          }));
          return;
        }
        if (b.rotulo) { atual.querySelector('.gq-baloes').insertAdjacentHTML('beforeend', `<p class="gq-voce">${esc(b.rotulo)}</p>`); return proximo(); }
        if (b.fita) {
          atual.querySelector('.gq-baloes').insertAdjacentHTML('beforeend', `<div class="gq-fita">${b.fita.map(v => `<span><b>${v}</b><i>${BASE[v]}</i></span>`).join('')}</div>`);
          return;
        }
        if (!b.t && b.rubrica) { atual.querySelector('.gq-baloes').insertAdjacentHTML('beforeend', `<p class="gq-mudo">${esc(b.rubrica)}</p>`); return; }
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
        else if (['Enter', ' ', 'ArrowRight'].includes(e.key) && !esperando) { e.preventDefault(); e.stopPropagation(); proximo(); }
      }
      document.addEventListener('keydown', tecla, true);
      el.addEventListener('click', e => { if (e.target.closest('.gibi-pular')) fim(); else if (!esperando) proximo(); });
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
      const dado = rec && rec.dado ? `dado ${R().CATALOGO.dados[rec.dado].nome}` : '';
      const premio = !rec ? '' : [rec.carta ? `carta ${ligacao.nomeCarta(rec.carta)}` : rec.icone ? 'o ícone da Diana' : `${rec.moedas} moedas`, dado].filter(Boolean).join(' e ');
      return `<li class="hc${feito ? ' feito' : ''}${aberto ? '' : ' travado'}${c.id === prox ? ' atual' : ''}">
        <span class="hc-retrato">${Retratos.retrato(c.retrato)}</span>
        <span class="hc-txt"><small>${esc(c.titulo)}${feito && c.estrelas ? ` <span class="hc-estrelas" aria-label="${est.estrelas[c.id] || 0} de 3 estrelas">${'★'.repeat(est.estrelas[c.id] || 0)}${'☆'.repeat(3 - (est.estrelas[c.id] || 0))}</span>` : ''}</small><b>${esc(c.nome)}</b><span>${feito ? 'Feito' : aberto ? (premio ? `Vale: ${premio}` : 'Comece por aqui') : 'Fechado'}</span></span>
        ${aberto ? `<button class="btn ${c.id === prox ? 'btn-mel' : 'btn-papel'}" data-cap="${c.id}">${feito ? 'Jogar de novo' : 'Jogar'}</button>` : ''}</li>`;
    }).join('');
    const total = R().totalEstrelas(est);
    j.querySelector('#historiaConteudo').innerHTML = `<p class="nota historia-total">${est.feitos.length > 1 ? `${total} de ${3 * (CAPS.length - 1)} estrelas` : 'Sete páginas, sete bichos.'}</p><ol class="historia-caps">${linhas}</ol>`;
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

  window.Historia = { CAPS, cap, falasRival, GUIA, fala, gibi, abrirMapa, ligar, estrelasDe };
})();
