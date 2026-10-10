/* Dice Duel · a pata da Diana na tela inicial (v0.14)
 * A Diana espia por trás da mesinha da cena; os ombros brancos aparecem dos lados da cabeça, por cima da borda, e a
 * pata dela fica apoiada na borda da mesa. De tempos em tempos, a pata sobe, desce num dado, dá uma ou duas batidinhas
 * (o dado treme, um toque abafado no feltro, uma vibração leve no celular) e arrasta o dado na direção dela, como quem
 * vai pegá-lo para si; depois solta, e o dado volta para o lugar.
 * O braço é desenhado num SVG por cima da mesa, do ombro até a pata, a cada quadro: a pata alcança qualquer dado sem
 * esticar o desenho. Ela nunca sobe acima da borda da mesa (passaria pelo rosto): erguer a pata é ela crescer um pouco e
 * ganhar uma sombra no feltro, como se viesse na direção de quem olha. Com as animações desligadas (Ajustes ou "reduzir movimento"), a pata fica parada na borda.
 *   Pata.ligar(cena, { aoBater(i), aoArrastar(i), aoTerminar(i) })   Pata.desligar()   Pata.susto()
 */
(function () {
  'use strict';
  const PELO = '#f8f6f2', SOMBRA = '#e4e1dc', CACAU = '#3a2a2e';
  let atual = null;   // { cena, svg, ombros, cb, token, timer, P, quadro }

  const esperar = ms => new Promise(r => setTimeout(r, ms));
  const suave = k => k * k * (3 - 2 * k);
  const salto = k => 1 - Math.pow(1 - k, 3);
  const animando = () => window.Fx && Fx.cfg.animacoes;

  // medidas da cena no sistema dela (px a partir do canto de cima à esquerda)
  function medir(c) {
    const cr = c.cena.getBoundingClientRect(), cab = c.cena.querySelector('.cena-rival'), mesa = c.cena.querySelector('.cena-mesa');
    if (!cab || !mesa || !cr.width) return null;
    const hr = cab.getBoundingClientRect(), mr = mesa.getBoundingClientRect();
    const tam = hr.width, borda = mr.top - cr.top + 4;
    const lado = -1;   // a pata direita dela (à esquerda de quem olha): longe do balão da fala
    // o ombro: o braço nasce rente à borda da mesa (a beirada de cima dele na linha da borda), embaixo do montinho do
    // ombro; acima da borda ele passaria pelo queixo
    const larg = Math.max(11, tam * 0.135);
    const S = { x: hr.left - cr.left + tam / 2 + lado * tam * 0.4, y: borda + larg * 0.5 };
    const dados = [...c.cena.querySelectorAll('.cena-dado')].map(d => { const r = d.getBoundingClientRect(); return { el: d, x: r.left - cr.left + r.width / 2, y: r.top - cr.top + r.height / 2, t: r.width }; });
        // em repouso, a pata fica no feltro do lado de fora do primeiro dado (sem cobri-lo)
    const d0 = dados[0];
    const repouso = { x: Math.min(S.x - tam * 0.12, d0 ? d0.x - d0.t / 2 - larg * 1.35 : S.x), y: borda + larg * 0.9, e: 0 };
    return { w: cr.width, h: cr.height, tam, S, dados, larg, repouso, chao: borda + larg * 0.55, ombro: { x: hr.left - cr.left + tam / 2, y: borda } };
  }

  // a pata vista de cima, apontando para baixo (+y), centrada no meio da palma; um pouco de sombra embaixo e os vãos
  // dos dedos na ponta
  function pataSVG(L) {
    const rx = L * 0.86, ry = L * 0.74;
    const dedo = (dx, a) => `<path d="M${dx} ${ry * 0.55} q ${a} ${ry * 0.28} ${a * 0.2} ${ry * 0.5}" fill="none" stroke="${CACAU}" stroke-width="${L * 0.13}" stroke-linecap="round"/>`;
    return `<ellipse cx="0" cy="${ry * 0.12}" rx="${rx}" ry="${ry}" fill="${PELO}" stroke="${CACAU}" stroke-width="${L * 0.2}"/>
      <path d="M${-rx * 0.82} ${ry * 0.35} q ${rx * 0.82} ${ry * 0.9} ${rx * 1.64} 0" fill="none" stroke="${SOMBRA}" stroke-width="${L * 0.16}" stroke-linecap="round"/>
      ${dedo(-rx * 0.34, -L * 0.05)}${dedo(rx * 0.34, L * 0.05)}`;
  }

  // desenha o braço do ombro S até a pata em P (e o ângulo da pata segue o braço)
  function desenhar(c) {
    const m = c.m, P = c.P, svg = c.svg; if (!m || !svg.isConnected) return false;
    const dx = P.x - m.S.x, dy = P.y - m.S.y, ang = Math.atan2(dy, dx) * 180 / Math.PI - 90, e = P.e || 0;
    const linha = `M${m.S.x} ${m.S.y} L${P.x} ${P.y}`;
    svg.querySelector('.braco-borda').setAttribute('d', linha);
    svg.querySelector('.braco').setAttribute('d', linha);
    svg.querySelector('.mao').setAttribute('transform', `translate(${P.x} ${P.y - e * m.larg * 0.35}) rotate(${ang}) scale(${1 + e * 0.2})`);
    const sb = svg.querySelector('.sombra-pata');
    sb.setAttribute('cx', P.x); sb.setAttribute('cy', P.y + m.larg * (0.55 + e * 0.35));
    sb.setAttribute('rx', m.larg * (0.95 - e * 0.15)); sb.setAttribute('ry', m.larg * 0.32); sb.setAttribute('opacity', (0.12 + e * 0.2).toFixed(2));
    return true;
  }
  function montar(c) {
    c.m = medir(c); if (!c.m) return false;
    const m = c.m;
    c.svg.setAttribute('viewBox', `0 0 ${m.w} ${m.h}`);
    c.svg.innerHTML = `<ellipse class="sombra-pata" fill="#1f2a24"/>
      <path class="braco-borda" fill="none" stroke="${CACAU}" stroke-width="${m.larg + 5}" stroke-linecap="round"/>
      <path class="braco" fill="none" stroke="${PELO}" stroke-width="${m.larg}" stroke-linecap="round"/>
      <g class="mao">${pataSVG(m.larg)}</g>`;
    // os ombros: dois montinhos brancos atrás da cabeça, por cima da borda da mesa (a mesa esconde o resto do corpo)
    const o = m.tam * 0.24;
    c.ombros.style.cssText = `left:${m.ombro.x}px;top:${m.ombro.y}px;--ombro:${o}px;--abre:${m.tam * 0.36}px`;
    if (!c.P) c.P = { ...m.repouso };
    return desenhar(c);
  }

  // leva a pata até o ponto (x, y) em ms; seguir(P) é chamado a cada quadro (o dado arrastado vai junto)
  function mover(c, alvo, ms, curva = suave, seguir = null) {
    const tok = c.token, de = { ...c.P };
    if (!animando()) { c.P = { ...alvo }; desenhar(c); if (seguir) seguir(c.P); return Promise.resolve(tok === c.token); }
    return new Promise(res => {
      const t0 = performance.now();
      const passo = agora => {
        if (tok !== c.token || !c.svg.isConnected) return res(false);
        const k = Math.min(1, (agora - t0) / ms), e = curva(k);
        const ea = de.e || 0, eb = alvo.e === undefined ? ea : alvo.e;
        c.P = { x: de.x + (alvo.x - de.x) * e, y: de.y + (alvo.y - de.y) * e, e: ea + (eb - ea) * e };
        desenhar(c); if (seguir) seguir(c.P);
        if (k < 1) requestAnimationFrame(passo); else res(true);
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

  // uma investida: sobe, desce no dado i, bate (uma ou duas vezes), arrasta na direção dela e solta
  async function investida(c) {
    if (!montar(c)) return;
    const m = c.m, i = Math.floor(Math.random() * m.dados.length), d = m.dados[i];
    const cab = c.cena.querySelector('.cena-rival');
    c.alvo = d;
    d.base = getComputedStyle(d.el).transform; if (d.base === 'none') d.base = '';
    // nada acima da borda (m.chao): erguer é o "e", a pata cresce e a sombra se afasta
    const acima = { x: d.x + (m.S.x - d.x) * 0.15, y: Math.max(m.chao, d.y - d.t * 0.45), e: 1 }, toque = { x: d.x, y: d.y - d.t * 0.1, e: 0 };
    if (!(await mover(c, acima, 360, suave))) return;
    await esperar(140 + Math.random() * 220);
    const batidas = Math.random() < 0.5 ? 2 : 1;
    for (let b = 0; b < batidas; b++) {
      if (!(await mover(c, toque, 110, k => k * k))) return;
      d.el.classList.remove('cutucado'); void d.el.offsetWidth; d.el.classList.add('cutucado');
      if (c.cb.aoBater) c.cb.aoBater(i, b);
      if (b < batidas - 1 && !(await mover(c, { x: toque.x, y: Math.max(m.chao, toque.y - d.t * 0.25), e: 0.7 }, 130, salto))) return;
    }
    // arrasta: a pata puxa o dado na direção do ombro; a cabeça acompanha, travessa
    if (cab) cab.classList.add('travessa');
    if (c.cb.aoArrastar) c.cb.aoArrastar(i);
    const puxa = { x: toque.x + (m.S.x - toque.x) * 0.22, y: Math.max(m.chao, toque.y - d.t * 0.42), e: 0.1 };
    const ok = await mover(c, puxa, 420, suave, P => puxar(d, P.x - toque.x, P.y - toque.y, (P.x - toque.x) * 0.5));
    await esperar(ok ? 260 : 0);
    soltar(d); c.alvo = null;
    if (cab) cab.classList.remove('travessa');
    if (!ok) return;
    await mover(c, m.repouso, 380, salto);
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
    const ombros = document.createElement('span'); ombros.className = 'cena-ombros'; ombros.setAttribute('aria-hidden', 'true');
    // os ombros ficam atrás da cabeça; o braço, por cima da mesa
    cena.insertBefore(ombros, cena.firstChild);
    cena.appendChild(svg);
    atual = { cena, svg, ombros, cb, token: 0, timer: null, P: null };
    requestAnimationFrame(() => { if (atual && atual.svg === svg) montar(atual); });
    agendar(atual, 1800 + Math.random() * 1200);
  }
  function desligar() {
    if (!atual) return;
    clearTimeout(atual.timer); atual.token++;
    if (atual.alvo) soltar(atual.alvo);
    atual.svg.remove(); atual.ombros.remove();
    atual = null;
  }
  // tocaram no dado (ou na rival) no meio da investida: a pata recolhe depressa
  function susto() {
    const c = atual; if (!c || !c.m) return;
    c.token++;
    if (c.alvo) { soltar(c.alvo); c.alvo = null; }
    const cab = c.cena.querySelector('.cena-rival'); if (cab) cab.classList.remove('travessa');
    mover(c, c.m.repouso, 160, salto);
    agendar(c, 2600 + Math.random() * 2000);
  }
  addEventListener('resize', () => { if (atual) { atual.token++; atual.P = null; montar(atual); } });

  window.Pata = { ligar, desligar, susto };
})();
