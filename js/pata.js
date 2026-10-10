/* Dice Duel · as patas da Diana na tela inicial (v0.14)
 * A Diana espia por trás da mesinha da cena com as duas patas apoiadas na borda, como gata em beirada de mesa. Só as
 * patas: nada de braço nem de corpo. De tempos em tempos uma delas sai da borda, desce num dado, dá uma ou duas
 * batidinhas (o dado treme, um toque abafado no feltro, uma vibração leve no celular) e arrasta o dado na direção dela,
 * como quem vai pegá-lo para si; depois solta, o dado volta para o lugar e a pata volta para a borda.
 * Cada dado é da pata do lado dele: o da esquerda, a pata da esquerda; o da direita, a da direita; o do meio, qualquer
 * uma (meio a meio). Erguer a pata é ela crescer um pouco e a sombra no feltro se afastar, como se viesse na direção de
 * quem olha. Com as animações desligadas (Ajustes ou "reduzir movimento"), as patas ficam paradas na borda.
 *   Pata.ligar(cena, { aoBater(i), aoTerminar(i) })   Pata.desligar()   Pata.susto()
 */
(function () {
  'use strict';
  const PELO = '#f8f6f2', SOMBRA = '#e4e1dc', CACAU = '#3a2a2e';
  let atual = null;   // { cena, svg, cb, token, timer, P: [esquerda, direita], m, alvo }

  const esperar = ms => new Promise(r => setTimeout(r, ms));
  const suave = k => k * k * (3 - 2 * k);
  const salto = k => 1 - Math.pow(1 - k, 3);
  const animando = () => window.Fx && Fx.cfg.animacoes;

  // medidas da cena no sistema dela (px a partir do canto de cima à esquerda)
  function medir(c) {
    const cr = c.cena.getBoundingClientRect(), cab = c.cena.querySelector('.cena-rival'), mesa = c.cena.querySelector('.cena-mesa');
    if (!cab || !mesa || !cr.width) return null;
    const hr = cab.getBoundingClientRect(), mr = mesa.getBoundingClientRect();
    const tam = hr.width, borda = mr.top - cr.top + 4, meio = hr.left - cr.left + tam / 2;
    const larg = Math.max(11, tam * 0.135);
    const dados = [...c.cena.querySelectorAll('.cena-dado')].map(d => { const r = d.getBoundingClientRect(); return { el: d, x: r.left - cr.left + r.width / 2, y: r.top - cr.top + r.height / 2, t: r.width }; });
    // as patas apoiadas na borda, uma de cada lado do queixo (a da esquerda de quem olha é a 0)
    const repouso = [-1, 1].map(l => ({ x: meio + l * tam * 0.3, y: borda - larg * 0.15, e: 0 }));
    return { w: cr.width, h: cr.height, tam, larg, dados, repouso, chao: borda + larg * 0.55 };
  }

  // a pata vista de cima, apontando para baixo (+y), centrada no meio da palma: o pelo, uma sombra embaixo e os vãos
  // dos dedos na ponta
  function pataSVG(L) {
    const rx = L * 0.86, ry = L * 0.74;
    const dedo = (dx, a) => `<path d="M${dx} ${ry * 0.55} q ${a} ${ry * 0.28} ${a * 0.2} ${ry * 0.5}" fill="none" stroke="${CACAU}" stroke-width="${L * 0.13}" stroke-linecap="round"/>`;
    return `<ellipse cx="0" cy="${ry * 0.12}" rx="${rx}" ry="${ry}" fill="${PELO}" stroke="${CACAU}" stroke-width="${L * 0.2}"/>
      <path d="M${-rx * 0.82} ${ry * 0.35} q ${rx * 0.82} ${ry * 0.9} ${rx * 1.64} 0" fill="none" stroke="${SOMBRA}" stroke-width="${L * 0.16}" stroke-linecap="round"/>
      ${dedo(-rx * 0.34, -L * 0.05)}${dedo(rx * 0.34, L * 0.05)}`;
  }

  // desenha as duas patas: a erguida (e > 0) cresce, sobe um pouco e a sombra dela se afasta; a inclinação segue o
  // caminho da pata (para o lado de onde ela veio), sem passar de 25°
  function desenhar(c) {
    const m = c.m, svg = c.svg; if (!m || !svg.isConnected) return false;
    c.P.forEach((P, k) => {
      const e = P.e || 0, inc = Math.max(-25, Math.min(25, (P.x - m.repouso[k].x) * -0.35));
      svg.querySelector(`.mao${k}`).setAttribute('transform', `translate(${P.x} ${P.y - e * m.larg * 0.35}) rotate(${inc}) scale(${1 + e * 0.2})`);
      const sb = svg.querySelector(`.sombra${k}`);
      sb.setAttribute('cx', P.x); sb.setAttribute('cy', P.y + m.larg * (0.55 + e * 0.35));
      sb.setAttribute('rx', m.larg * (0.95 - e * 0.15)); sb.setAttribute('ry', m.larg * 0.32); sb.setAttribute('opacity', (0.12 + e * 0.2).toFixed(2));
    });
    return true;
  }
  function montar(c) {
    c.m = medir(c); if (!c.m) return false;
    const m = c.m;
    c.svg.setAttribute('viewBox', `0 0 ${m.w} ${m.h}`);
    c.svg.innerHTML = [0, 1].map(k => `<ellipse class="sombra${k}" fill="#1f2a24"/><g class="mao${k}">${pataSVG(m.larg)}</g>`).join('');
    if (!c.P) c.P = m.repouso.map(r => ({ ...r }));
    return desenhar(c);
  }

  // leva a pata k até o ponto (x, y, e) em ms; seguir(P) é chamado a cada quadro (o dado arrastado vai junto)
  function mover(c, k, alvo, ms, curva = suave, seguir = null) {
    const tok = c.token, de = { ...c.P[k] };
    const ponto = t => { const ea = de.e || 0, eb = alvo.e === undefined ? ea : alvo.e; return { x: de.x + (alvo.x - de.x) * t, y: de.y + (alvo.y - de.y) * t, e: ea + (eb - ea) * t }; };
    if (!animando()) { c.P[k] = ponto(1); desenhar(c); if (seguir) seguir(c.P[k]); return Promise.resolve(tok === c.token); }
    return new Promise(res => {
      const t0 = performance.now();
      const passo = agora => {
        if (tok !== c.token || !c.svg.isConnected) return res(false);
        const t = Math.min(1, (agora - t0) / ms);
        c.P[k] = ponto(curva(t));
        desenhar(c); if (seguir) seguir(c.P[k]);
        if (t < 1) requestAnimationFrame(passo); else res(true);
      };
      requestAnimationFrame(passo);
    });
  }

  // o dado arrastado: anda junto com a pata (sem perder a inclinação que a cena dá a ele)
  function puxar(d, dx, dy, giro) { d.el.style.transform = `translate(${dx}px, ${dy}px) rotate(${giro}deg) ${d.base || ''}`; }
  function soltar(d) {
    if (!d || !d.el) return;
    d.el.style.transition = 'transform .38s cubic-bezier(.3,1.6,.5,1)';
    d.el.style.transform = '';
    setTimeout(() => { d.el.style.transition = ''; }, 420);
  }

  // a pata de cada dado: o da esquerda é da pata da esquerda, o da direita é da direita, o do meio é sorteado
  function pataDoDado(i, n) {
    const meio = (n - 1) / 2;
    if (i === meio) return Math.random() < 0.5 ? 0 : 1;
    return i < meio ? 0 : 1;
  }

  // uma investida: a pata sai da borda, desce no dado i, bate (uma ou duas vezes), arrasta na direção dela e solta
  async function investida(c) {
    if (!montar(c)) return;
    const m = c.m, i = Math.floor(Math.random() * m.dados.length), d = m.dados[i], k = pataDoDado(i, m.dados.length);
    const cab = c.cena.querySelector('.cena-rival'), casa = m.repouso[k];
    c.alvo = d;
    d.base = getComputedStyle(d.el).transform; if (d.base === 'none') d.base = '';
    // a pata não passa pelo rosto: erguer é o "e" (ela cresce e a sombra se afasta), não subir na tela
    const acima = { x: d.x + (casa.x - d.x) * 0.2, y: Math.max(m.chao, d.y - d.t * 0.45), e: 1 }, toque = { x: d.x, y: d.y - d.t * 0.1, e: 0 };
    if (!(await mover(c, k, acima, 360, suave))) return;
    await esperar(140 + Math.random() * 220);
    const batidas = Math.random() < 0.5 ? 2 : 1;
    for (let b = 0; b < batidas; b++) {
      if (!(await mover(c, k, toque, 110, t => t * t))) return;
      d.el.classList.remove('cutucado'); void d.el.offsetWidth; d.el.classList.add('cutucado');
      if (c.cb.aoBater) c.cb.aoBater(i, b);
      if (b < batidas - 1 && !(await mover(c, k, { x: toque.x, y: Math.max(m.chao, toque.y - d.t * 0.25), e: 0.7 }, 130, salto))) return;
    }
    // arrasta: a pata puxa o dado na direção da borda, do lado dela; a cabeça acompanha, travessa
    if (cab) cab.classList.add('travessa');
    const puxa = { x: toque.x + (casa.x - toque.x) * 0.25, y: Math.max(m.chao, toque.y - d.t * 0.42), e: 0.1 };
    const ok = await mover(c, k, puxa, 420, suave, P => puxar(d, P.x - toque.x, P.y - toque.y, (P.x - toque.x) * 0.5));
    await esperar(ok ? 260 : 0);
    soltar(d); c.alvo = null;
    if (cab) cab.classList.remove('travessa');
    if (!ok) return;
    // volta para a borda: ergue um pouco no caminho e assenta
    if (!(await mover(c, k, { ...casa, e: 0.6 }, 300, suave))) return;
    await mover(c, k, casa, 120, t => t * t);
    if (c.cb.aoTerminar) c.cb.aoTerminar(i);
  }

  function agendar(c, ms) {
    clearTimeout(c.timer);
    c.timer = setTimeout(async () => {
      if (atual !== c || !c.cena.isConnected) return;
      const inicio = c.cena.closest('.tela-inicio');
      const visivel = inicio && !inicio.hidden && document.visibilityState === 'visible' && animando();
      if (visivel) await investida(c);
      if (atual === c) agendar(c, 3800 + Math.random() * 4200);
    }, ms);
  }

  function ligar(cena, cb = {}) {
    const ant = atual;
    if (ant && ant.cena === cena && ant.svg.isConnected) { ant.cb = cb; montar(ant); return; }
    desligar();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'cena-pata'); svg.setAttribute('aria-hidden', 'true');
    cena.appendChild(svg);   // por cima da mesa e do queixo: as patas ficam na frente
    atual = { cena, svg, cb, token: 0, timer: null, P: null };
    requestAnimationFrame(() => { if (atual && atual.svg === svg) montar(atual); });
    agendar(atual, 1800 + Math.random() * 1200);
  }
  function desligar() {
    if (!atual) return;
    clearTimeout(atual.timer); atual.token++;
    if (atual.alvo) soltar(atual.alvo);
    atual.svg.remove();
    atual = null;
  }
  // tocaram no dado (ou na rival) no meio da investida: as patas voltam depressa para a borda
  function susto() {
    const c = atual; if (!c || !c.m) return;
    c.token++;
    if (c.alvo) { soltar(c.alvo); c.alvo = null; }
    const cab = c.cena.querySelector('.cena-rival'); if (cab) cab.classList.remove('travessa');
    [0, 1].forEach(k => mover(c, k, c.m.repouso[k], 160, salto));
    agendar(c, 2600 + Math.random() * 2000);
  }
  addEventListener('resize', () => { if (atual) { atual.token++; atual.P = null; montar(atual); } });

  window.Pata = { ligar, desligar, susto };
})();
