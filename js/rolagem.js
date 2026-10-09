/* Dice Duel · rolagem dos dados na tela (a matemática está em shared/rolagem.js; os lançamentos, em js/lancamentos.js).
 * Os dados caem como cubos 3D (CSS 3D, sem canvas) numa camada por cima da Mesa: giram, se batem, quicam e
 * assentam exatamente onde o dado parado está, com a face que a regra já sorteou. A camada sobrevive aos
 * redesenhos da Mesa (ela só lê onde cada casa está). Cada batida gravada soa no quadro em que acontece.
 * Só apresentação: nada espera a rolagem (quem quiser pode tocar num dado ainda girando).
 */
(function () {
  'use strict';
  const M = window.RolagemMat, BIB = window.LANCAMENTOS || [];
  const ativos = new Map();      // id do dado -> { d, cubo, sombra, faces, grupo, t0, assentou }
  const grupos = new Set();      // um por lançamento: as batidas e o relógio
  let camada = null, raf = 0;
  let esperas = [];
  let relogio = null;   // testes e fotos: um relógio fixo no lugar do tempo real

  // a luz vem de cima, à esquerda e um pouco de trás (a mesma do resto da mesa)
  const LUZ = (() => { const v = [-0.42, 0.82, -0.39], n = Math.hypot(...v); return v.map(x => x / n); })();
  // Godot (x, y altura, z para quem joga) -> CSS (x, y para baixo, z para quem olha): troca y e z
  const paraCss = v => [v[0], v[2], v[1]];
  const baseCss = m => [[m[0][0], m[0][2], m[0][1]], [m[2][0], m[2][2], m[2][1]], [m[1][0], m[1][2], m[1][1]]];
  const matriz = (m, t = [0, 0, 0]) => `matrix3d(${m[0][0]},${m[1][0]},${m[2][0]},0,${m[0][1]},${m[1][1]},${m[2][1]},0,${m[0][2]},${m[1][2]},${m[2][2]},0,${t[0]},${t[1]},${t[2]},1)`;

  function garantirCamada() {
    if (camada && camada.isConnected) return camada;
    camada = document.createElement('div');
    camada.className = 'camada-rolagem';
    camada.setAttribute('aria-hidden', 'true');
    document.body.appendChild(camada);
    return camada;
  }
  const casaDe = id => document.querySelector(`.pega[data-id="${id}"] .face`);
  // centro e lado da casa pelo LAYOUT (offset*), não pelo retângulo na tela: a casa pode estar se mexendo
  // (passar o mouse, dado escolhido) e esse movimento não pode entortar a rolagem
  function onde(face) {
    const pega = face.closest('.pega'), r = pega.getBoundingClientRect();
    return { L: face.offsetWidth, cx: r.left + face.offsetLeft + face.offsetWidth / 2, cy: r.top + face.offsetTop + face.offsetHeight / 2 };
  }

  // o cubo: 6 faces (o desenho de cada face é o mesmo dado parado) e um miolo que tapa as quinas arredondadas
  function montarCubo(faceHTML, L) {
    const cubo = document.createElement('div');
    cubo.className = 'cubo-rolagem';
    cubo.style.width = cubo.style.height = L + 'px';
    let html = '';
    for (const eixo of [[0, 0, 0], [0, 90, 0], [90, 0, 0]]) html += `<div class="miolo-rolagem" style="transform: rotateX(${eixo[0]}deg) rotateY(${eixo[1]}deg)"></div>`;
    for (let i = 0; i < 6; i++) {
      const t = paraCss(M.tangente(i)), b = paraCss(M.bitangente(i)), n = paraCss(M.NORMAIS[i]);
      const m = [[t[0], b[0], n[0]], [t[1], b[1], n[1]], [t[2], b[2], n[2]]];
      html += `<div class="face-rolagem" style="transform:${matriz(m, n.map(x => x * L / 2))}">${faceHTML(i + 1)}</div>`;
    }
    cubo.innerHTML = html;
    return { cubo, faces: [...cubo.querySelectorAll('.face-rolagem')] };
  }

  // itens: [{ id, v }] na ordem da Mesa (é a ordem das casas). op: { faceHTML(v), som(nome, dados), velocidade }
  function lancar(itens, op) {
    if (!M || !BIB.length || !itens.length || itens.length > 5) return false;
    const sorteio = M.sortear(BIB, itens.length);
    if (!sorteio) return false;
    garantirCamada();
    const grupo = { t0: performance.now(), vel: op.velocidade || 1, batidas: M.batidas(sorteio.l, sorteio.espelhado), proxima: 0, ids: itens.map(x => x.id), som: op.som || (() => {}), primeiros: new Set() };
    grupos.add(grupo);
    itens.forEach((it, i) => {
      encerrar(it.id, false);   // Rerrolar com o dado ainda girando: o novo lançamento toma o lugar
      const el = casaDe(it.id);
      if (el) el.closest('.pega').classList.add('rolando');   // antes de medir: desliga a animação antiga da casa
      const L = el ? onde(el).L : 60;
      const { cubo, faces } = montarCubo(v => op.faceHTML(v), L);
      const sombra = document.createElement('div');
      sombra.className = 'sombra-rolagem';
      sombra.style.width = sombra.style.height = L + 'px';
      camada.append(sombra, cubo);
      const d = M.preparar(sorteio.l, i, it.v - 1, 0, sorteio.espelhado);
      ativos.set(it.id, { d, cubo, sombra, faces, grupo, L, opacidade: -1 });
    });
    if (!raf) raf = requestAnimationFrame(quadro);
    return true;
  }

  function quadro(agora) {
    raf = 0;
    if (relogio) agora = relogio();
    for (const g of grupos) {
      const t = (agora - g.t0) / 1000 * g.vel;
      // as batidas gravadas, cada uma no seu quadro (só as dos dados que ainda estão na Mesa)
      while (g.proxima < g.batidas.length && g.batidas[g.proxima].t <= t) {
        const b = g.batidas[g.proxima++], id = g.ids[b.casa];
        if (!ativos.has(id) || t - b.t > 0.12) continue;
        if (b.tipo === 1) g.som('choque', { forca: b.impulso });
        else if (b.tipo === 0) { g.som('quique', { forca: b.impulso, primeira: !g.primeiros.has(b.casa) }); g.primeiros.add(b.casa); }
        else g.som('aro', { forca: b.impulso });
      }
      if (!g.ids.some(id => ativos.has(id) && ativos.get(id).grupo === g)) grupos.delete(g);
    }
    // primeiro todas as leituras (onde está cada casa), depois todas as escritas: no celular, ler o layout
    // entre uma escrita e outra faria o navegador recalcular tudo a cada dado
    const lote = [];
    for (const [id, a] of ativos) {
      const t = (agora - a.grupo.t0) / 1000 * a.grupo.vel;
      const el = casaDe(id);
      if (!el) { encerrar(id, false); continue; }                 // o dado saiu da Mesa no meio da rolagem
      if (t >= a.d.fim + 0.02 || t > a.d.fim + 1.5) { encerrar(id, true); continue; }
      lote.push({ a, t, c: t < a.d.inicio ? null : onde(el) });
    }
    for (const { a, t, c } of lote) {
      // a opacidade vai em cada face, nunca no cubo: opacidade num elemento 3D achata o que está dentro dele;
      // e display, não visibility, para esconder: as bolinhas têm visibilidade própria e escapariam
      const entra = t < a.d.inicio ? 0 : Math.min(1, (t - a.d.inicio) / 0.06);
      if (entra !== a.opacidade) { a.opacidade = entra; a.cubo.style.display = entra > 0 ? '' : 'none'; a.faces.forEach(f => { f.style.opacity = String(entra); }); }
      if (!c) { a.sombra.style.opacity = '0'; continue; }
      const L = a.L, p = M.pose(a.d, t);
      const cx = c.cx + p.pos[0] * L, cy = c.cy + p.pos[2] * L, h = Math.max(0, p.pos[1]);
      // o centro fica meio lado abaixo da face de cima: parado, a face de cima cai no plano da tela (escala 1)
      a.cubo.style.transform = `translate3d(${cx - L / 2}px, ${cy - L / 2}px, ${p.pos[1] * L - L / 2}px) ${matriz(baseCss(p.base))}`;
      a.sombra.style.transform = `translate3d(${cx - L / 2 + h * L * 0.28}px, ${cy - L / 2 + h * L * 0.42}px, ${-L - 1}px) scale(${1 - Math.min(0.45, h * 0.16)})`;
      a.sombra.style.opacity = String(entra * 0.42 * (1 - Math.min(0.7, h * 0.28)));
      // luz por face: a que olha para longe da luz escurece
      a.faces.forEach((f, i) => {
        const n = M.mulMV(p.base, M.NORMAIS[i]);
        f.style.setProperty('--escuro', (0.42 * (1 - Math.max(0, n[0] * LUZ[0] + n[1] * LUZ[1] + n[2] * LUZ[2]))).toFixed(3));
      });
    }
    if (ativos.size && !relogio) raf = requestAnimationFrame(quadro);
    else { const e = esperas; esperas = []; e.forEach(f => f()); }
  }

  function encerrar(id, assentou) {
    const a = ativos.get(id);
    if (!a) return;
    ativos.delete(id);
    a.cubo.remove(); a.sombra.remove();
    const pega = document.querySelector(`.pega[data-id="${id}"]`);
    if (pega) {
      pega.classList.remove('rolando', 'novo');   // sem 'novo': a animação antiga da casa não recomeça
      if (assentou) { pega.classList.remove('assentou'); void pega.offsetWidth; pega.classList.add('assentou'); }
    }
    if (!ativos.size) { const e = esperas; esperas = []; e.forEach(f => f()); }
  }

  window.Rolagem = {
    disponivel: () => !!(M && BIB.length),
    lancar,
    ativo: id => ativos.has(id),
    // quem joga pelo rival espera os dados assentarem (no máximo 2,5 s: nada trava o turno)
    esperar: () => (ativos.size ? new Promise(r => { esperas.push(r); setTimeout(r, 2500); }) : Promise.resolve()),
    parar: () => { for (const id of [...ativos.keys()]) encerrar(id, false); grupos.clear(); },
    // só para testes e fotos: desenha o quadro do instante `ms` depois do lançamento
    _quadroEm: ms => { const g = [...grupos][0]; if (!g) return; relogio = () => g.t0 + ms / g.vel; quadro(0); },
    _soltar: () => { relogio = null; cancelAnimationFrame(raf); raf = ativos.size ? requestAnimationFrame(quadro) : 0; },
  };
})();
