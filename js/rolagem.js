/* Dice Duel · rolagem dos dados na tela (a matemática está em shared/rolagem.js; os lançamentos, em js/lancamentos.js).
 * Os dados caem como cubos 3D (CSS 3D, sem canvas) numa camada por cima da Mesa: giram, se batem, quicam e
 * assentam exatamente onde o dado parado está, com a face que a regra já sorteou. A camada sobrevive aos
 * redesenhos da Mesa (ela só lê onde cada casa está). Cada batida gravada soa no quadro em que acontece.
 * Só apresentação: nada espera a rolagem (quem quiser pode tocar num dado ainda girando).
 */
(function () {
  'use strict';
  const M = window.RolagemMat, BIB = window.LANCAMENTOS || [];
  const ativos = new Map();      // id do dado -> { d, palco, cubo, sombra, faces, grupo, L, opacidade }
  const grupos = new Set();      // um por lançamento: as batidas e o relógio
  let camada = null, raf = 0;
  let esperas = [];
  let relogio = null;   // testes e fotos: um relógio fixo no lugar do tempo real

  // a luz vem de cima, à esquerda e um pouco de trás (a mesma do resto da mesa)
  const LUZ = (() => { const v = [-0.42, 0.82, -0.39], n = Math.hypot(...v); return v.map(x => x / n); })();
  // a face de cima, parada, recebe a luz que o dado parado recebe: escurecer zero (senão a troca pisca)
  const LUZ_TOPO = LUZ[1];
  const PERSPECTIVA = 1400;
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

  // o cubo: 6 faces (o desenho de cada face é o mesmo dado parado) e um MIOLO, um cubo menor por dentro.
  // As faces têm os cantos arredondados do dado parado; sem o miolo, cada quina do cubo ficava oca e, de lado,
  // as faces pareciam abas de papel soltas. O miolo enche as quinas como um dado de canto gasto, e é pequeno o
  // bastante para não aparecer pelos cantos da face de cima quando o dado está pousado (visto de cima):
  // lado/2 − 0,293 × raio do canto (24% do lado; a pelúcia, 34%), com folga.
  function montarCubo(L, skin) {
    const cubo = document.createElement('div');
    cubo.className = 'cubo-rolagem';
    cubo.style.width = cubo.style.height = L + 'px';
    const s = (skin === 'pelucia' ? 0.385 : 0.41) * L;
    let html = '';
    for (let i = 0; i < 6; i++) {
      const t = paraCss(M.tangente(i)), b = paraCss(M.bitangente(i)), n = paraCss(M.NORMAIS[i]);
      const m = [[t[0], b[0], n[0]], [t[1], b[1], n[1]], [t[2], b[2], n[2]]];
      // o lado do miolo é 2s, centrado na caixa do cubo (a caixa tem o lado L)
      html += `<div class="miolo-rolagem" style="left:${L / 2 - s}px;top:${L / 2 - s}px;width:${2 * s}px;height:${2 * s}px;transform:${matriz(m, n.map(x => x * s))}"></div>`;
    }
    for (let i = 0; i < 6; i++) {
      const t = paraCss(M.tangente(i)), b = paraCss(M.bitangente(i)), n = paraCss(M.NORMAIS[i]);
      const m = [[t[0], b[0], n[0]], [t[1], b[1], n[1]], [t[2], b[2], n[2]]];
      html += `<div class="face-rolagem" style="transform:${matriz(m, n.map(x => x * L / 2))}">${montarCubo.faceHTML(i + 1)}</div>`;
    }
    cubo.innerHTML = html;
    return { cubo, faces: [...cubo.querySelectorAll('.face-rolagem')], miolos: [...cubo.querySelectorAll('.miolo-rolagem')] };
  }

  // cada dado tem o seu palco: a perspectiva olha para a casa dele (de frente, um pouco de baixo), e não para o
  // centro da tela. Com uma perspectiva só, o dado longe do centro rolava torto e pousava com uma lateral à
  // mostra que o dado parado não tem. Parado, o cubo é visto exatamente de cima: igual ao dado da Mesa.
  function montarPalco(L, skin) {
    const palco = document.createElement('div');
    palco.className = 'palco-rolagem';
    const sombra = document.createElement('div');
    sombra.className = 'sombra-rolagem';
    sombra.style.width = sombra.style.height = L + 'px';
    const { cubo, faces, miolos } = montarCubo(L, skin);
    if (skin) cubo.dataset.skin = sombra.dataset.skin = skin;
    palco.append(sombra, cubo);
    return { palco, sombra, cubo, faces, miolos };
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
      montarCubo.faceHTML = op.faceHTML;
      const { palco, cubo, sombra, faces, miolos } = montarPalco(L, op.skin);
      camada.append(palco);
      const d = M.preparar(sorteio.l, i, it.v - 1, 0, sorteio.espelhado);
      ativos.set(it.id, { d, palco, cubo, sombra, faces, miolos, grupo, L, opacidade: -1 });
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
        const x = (b.casa - (g.ids.length - 1) / 2) * 0.3;   // no estéreo, cada dado soa do lado da sua casa
        if (b.tipo === 1) g.som('choque', { forca: b.impulso, x });
        else if (b.tipo === 0) { g.som('quique', { forca: b.impulso, primeira: !g.primeiros.has(b.casa), x }); g.primeiros.add(b.casa); }
        else g.som('aro', { forca: b.impulso, x });
      }
      if (!g.ids.some(id => ativos.has(id) && ativos.get(id).grupo === g)) grupos.delete(g);
    }
    // primeiro todas as leituras (onde está cada casa), depois todas as escritas: no celular, ler o layout
    // entre uma escrita e outra faria o navegador recalcular tudo a cada dado
    const lote = [], acabaram = [];
    for (const [id, a] of ativos) {
      const t = (agora - a.grupo.t0) / 1000 * a.grupo.vel;
      const el = casaDe(id);
      if (!el) { acabaram.push([id, false]); continue; }      // o dado saiu da Mesa no meio da rolagem
      if (t >= a.d.fim) { acabaram.push([id, true]); continue; }   // pousou: o dado da Mesa (nítido) toma o lugar já
      lote.push({ a, t, c: t < a.d.inicio ? null : onde(el) });
    }
    acabaram.forEach(([id, assentou]) => encerrar(id, assentou));
    for (const { a, t, c } of lote) {
      // a opacidade vai em cada face, nunca no cubo: opacidade num elemento 3D achata o que está dentro dele;
      // e display, não visibility, para esconder: as bolinhas têm visibilidade própria e escapariam
      const entra = t < a.d.inicio ? 0 : Math.min(1, (t - a.d.inicio) / 0.06);
      if (entra !== a.opacidade) { a.opacidade = entra; a.palco.style.display = entra > 0 ? '' : 'none'; }
      if (!c) continue;
      const L = a.L, p = M.pose(a.d, t);
      const cx = c.cx + p.pos[0] * L, cy = c.cy + p.pos[2] * L, h = Math.max(0, p.pos[1]);
      // o olho do palco: em cima da casa, na beira de baixo dela (sem lateral à mostra quando o dado pousa)
      a.palco.style.perspectiveOrigin = `${c.cx}px ${c.cy + L / 2}px`;
      // quem está mais alto passa por cima (cada palco é plano para os outros)
      a.palco.style.zIndex = String(Math.round(h * 100));
      // o centro fica meio lado abaixo da face de cima: parado, a face de cima cai no plano da tela (escala 1)
      a.cubo.style.transform = `translate3d(${cx - L / 2}px, ${cy - L / 2}px, ${p.pos[1] * L - L / 2}px) ${matriz(baseCss(p.base))}`;
      // a sombra é a do dado parado (6 px abaixo, desfocada): no chão ela fica onde a dele fica;
      // no ar ela se afasta para baixo e à direita, encolhe e clareia
      a.sombra.style.transform = `translate(${cx - L / 2 + h * L * 0.28}px, ${cy - L / 2 + 6 + h * L * 0.42}px) scale(${1 - Math.min(0.45, h * 0.16)})`;
      a.sombra.style.opacity = String(entra * (1 - Math.min(0.75, h * 0.3)));
      // luz por face: a que olha para longe da luz escurece; a de cima, parada, fica igual ao dado parado.
      // --topo (quanto a face olha para cima) acende o brilho das skins que brilham
      a.faces.forEach((f, i) => {
        const n = M.mulMV(p.base, M.NORMAIS[i]), luz = n[0] * LUZ[0] + n[1] * LUZ[1] + n[2] * LUZ[2];
        // a face quase de perfil (olhando para o lado) some aos poucos: de perfil ela seria uma lasca com bolinhas
        // saindo do contorno; no lugar dela aparece o miolo, como a quina arredondada de um dado de verdade
        const perfil = Math.max(0, Math.min(1, (n[1] - 0.06) / 0.22));
        f.style.opacity = (entra * perfil).toFixed(3);
        const escuro = Math.max(0, Math.min(0.42, 0.42 * (LUZ_TOPO - luz) / (1 + LUZ_TOPO))).toFixed(3);
        f.style.setProperty('--escuro', escuro);
        f.style.setProperty('--topo', Math.max(0, n[1]).toFixed(3));
        // o miolo leva a mesma luz, um pouco mais escuro (fica recuado, na quina)
        a.miolos[i].style.setProperty('--escuro', (Math.min(0.5, +escuro + 0.08)).toFixed(3));
      });
    }
    if (ativos.size && !relogio) raf = requestAnimationFrame(quadro);
    else { const e = esperas; esperas = []; e.forEach(f => f()); }
  }

  function encerrar(id, assentou) {
    const a = ativos.get(id);
    if (!a) return;
    ativos.delete(id);
    a.palco.remove();
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
    // só para testes e fotos: o instante (ms) em que cada dado assenta
    _fins: () => [...ativos.values()].map(a => Math.round(a.d.fim * 1000 / a.grupo.vel)),
    // quem joga pelo rival espera os dados assentarem (no máximo 2,5 s: nada trava o turno)
    esperar: () => (ativos.size ? new Promise(r => { esperas.push(r); setTimeout(r, 2500); }) : Promise.resolve()),
    parar: () => { for (const id of [...ativos.keys()]) encerrar(id, false); grupos.clear(); },
    // só para testes e fotos: desenha o quadro do instante `ms` depois do lançamento
    _quadroEm: ms => { const g = [...grupos][0]; if (!g) return; relogio = () => g.t0 + ms / g.vel; quadro(0); },
    _soltar: () => { relogio = null; cancelAnimationFrame(raf); raf = ativos.size ? requestAnimationFrame(quadro) : 0; },
  };
})();
