/* Dice Duel · efeitos visuais
 * Partículas num canvas por cima de tudo (sem bloquear toques), dados que voam,
 * textos que sobem, chamadas de "bom momento", tremor leve e contagem do placar.
 * Com as animações desligadas, tudo vira instantâneo; com as partículas desligadas, nada é desenhado.
 */
(function () {
  'use strict';
  const cfg = { animacoes: true, particulas: true, tremor: true };
  const reduzido = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduzido) { cfg.animacoes = false; cfg.tremor = false; }

  // ---------- partículas ----------
  const canvas = document.createElement('canvas');
  canvas.className = 'fx-canvas'; canvas.setAttribute('aria-hidden', 'true');
  const g = canvas.getContext('2d');
  let parts = [], rodando = false, dpr = 1;
  function ajustar() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
  }
  const montar = () => { document.body.appendChild(canvas); ajustar(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
  addEventListener('resize', ajustar);

  function laco() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(p => p.vida > 0);
    for (const p of parts) {
      if (p.bez) {
        // orbe guiado: curva de Bézier até o alvo, acelerando no fim; ao chegar, some e avisa
        const b = p.bez, k = Math.min(1, Math.max(0, (performance.now() - b.t0) / b.dur)), e = k * k * (3 - 2 * k) * 0.4 + k * k * 0.6, u = 1 - e;
        p.x = u * u * b.x0 + 2 * u * e * b.cx + e * e * b.x1; p.y = u * u * b.y0 + 2 * u * e * b.cy + e * e * b.y1;
        p.vida = k >= 1 ? 0 : 99; p.giro += p.vg;
        if (k >= 1 && b.chegou) { const f = b.chegou; b.chegou = null; f(); }
        if (k <= 0) continue;
      } else { p.vida -= 1; p.x += p.vx; p.y += p.vy; p.vy += p.gravidade; p.vx *= p.atrito; p.vy *= p.atrito; p.giro += p.vg; }
      const a = p.bez ? 1 : Math.min(1, p.vida / p.fade);
      g.save(); g.globalAlpha = a; g.translate(p.x, p.y); g.rotate(p.giro); g.fillStyle = p.cor;
      if (p.forma === 'estrela') {
        g.beginPath();
        for (let i = 0; i < 8; i++) { const r = i % 2 ? p.t * 0.38 : p.t; const an = i * Math.PI / 4; g.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
        g.closePath(); g.fill();
      } else if (p.forma === 'papel') {
        g.fillRect(-p.t / 2, -p.t / 4, p.t, p.t / 2);
      } else {
        g.shadowColor = p.cor; g.shadowBlur = p.t * 2;
        g.beginPath(); g.arc(0, 0, p.t / 2, 0, Math.PI * 2); g.fill();
      }
      g.restore();
    }
    if (parts.length) requestAnimationFrame(laco); else { rodando = false; g.clearRect(0, 0, innerWidth, innerHeight); }
  }
  function soltar(lista) {
    if (!cfg.particulas || !cfg.animacoes) return;
    parts.push(...lista);
    if (parts.length > 600) parts.splice(0, parts.length - 600);
    if (!rodando) { rodando = true; requestAnimationFrame(laco); }
  }
  const sorte = (a, b) => a + Math.random() * (b - a);
  const CORES = ['#ffe3a3', '#ffd0b5', '#cdeccf', '#e2d6ff', '#fff6e6'];

  function centro(el) {
    if (!el) return { x: innerWidth / 2, y: innerHeight / 2 };
    const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  // brilhos que saem de um ponto (elo, disparo)
  function faiscas(alvo, n = 14, cores = CORES, forca = 3) {
    const { x, y } = alvo.nodeType ? centro(alvo) : alvo;
    soltar(Array.from({ length: n }, () => {
      const an = Math.random() * Math.PI * 2, v = sorte(0.6, 1) * forca;
      return { x, y, vx: Math.cos(an) * v, vy: Math.sin(an) * v - 0.6, gravidade: 0.03, atrito: 0.96, vida: sorte(30, 55), fade: 25,
        t: sorte(3, 6), cor: cores[Math.floor(Math.random() * cores.length)], forma: Math.random() < 0.35 ? 'estrela' : 'ponto', giro: 0, vg: sorte(-0.1, 0.1) };
    }));
  }
  // chuva de confete macio (vitória, recorde)
  function confete(n = 90) {
    soltar(Array.from({ length: n }, () => ({
      x: sorte(0, innerWidth), y: sorte(-80, -10), vx: sorte(-0.6, 0.6), vy: sorte(1, 2.6), gravidade: 0.012, atrito: 0.995,
      vida: sorte(140, 220), fade: 40, t: sorte(6, 11), cor: ['#f6c26b', '#f19bb0', '#8fd6a8', '#b8a4f0', '#7cc6d6', '#fff3e2'][Math.floor(Math.random() * 6)],
      forma: Math.random() < 0.2 ? 'estrela' : 'papel', giro: sorte(0, 6), vg: sorte(-0.15, 0.15) })));
  }
  // poeirinha triste e gentil (ruptura): cai devagar, sem explosão
  function poeira(alvo, n = 10) {
    const { x, y } = alvo.nodeType ? centro(alvo) : alvo;
    soltar(Array.from({ length: n }, () => ({ x: x + sorte(-30, 30), y, vx: sorte(-0.4, 0.4), vy: sorte(-0.5, 0.2), gravidade: 0.05, atrito: 0.98,
      vida: sorte(30, 50), fade: 25, t: sorte(2, 4), cor: '#d9c3b0', forma: 'ponto', giro: 0, vg: 0 })));
  }

  // pontos que voam da corrente até o placar: um orbe por ponto; aoChegar(i) a cada um, e a promessa resolve no último
  function orbes(deEl, paraEl, n, cor = '#ffe3a3', aoChegar = () => {}) {
    if (!deEl || !paraEl || n <= 0) return Promise.resolve();
    if (!cfg.particulas || !cfg.animacoes) { for (let i = 0; i < n; i++) aoChegar(i); return Promise.resolve(); }
    const de = deEl.getBoundingClientRect(), para = centro(paraEl), agora = performance.now();
    return new Promise(res => {
      let chegaram = 0;
      soltar(Array.from({ length: n }, (_, i) => {
        const x0 = de.left + de.width * sorte(0.15, 0.85), y0 = de.top + de.height / 2;
        const lado = x0 < para.x ? -1 : 1;
        return { x: x0, y: y0, vx: 0, vy: 0, gravidade: 0, atrito: 1, vida: 99, fade: 1, t: sorte(9, 12), cor, forma: 'estrela', giro: 0, vg: sorte(0.1, 0.25),
          bez: { x0, y0, x1: para.x, y1: para.y, cx: (x0 + para.x) / 2 + lado * sorte(40, 90), cy: Math.min(y0, para.y) - sorte(30, 80), t0: agora + i * 70, dur: sorte(420, 520),
            chegou: () => { aoChegar(chegaram); if (++chegaram === n) res(); } } };
      }));
    });
  }
  // clarão macio no ponto de um disparo grande (a tela "respira" junto)
  function clarao(alvo, forca = 1) {
    if (!cfg.animacoes || !cfg.particulas) return;
    const { x, y } = alvo && alvo.nodeType ? centro(alvo) : centro(null);
    const el = document.createElement('div');
    el.className = 'clarao'; el.style.left = x + 'px'; el.style.top = y + 'px';
    document.body.appendChild(el);
    el.animate([{ opacity: 0.55 * forca, transform: 'translate(-50%,-50%) scale(.4)' }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1.6)' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => el.remove();
  }

  // ---------- elementos que voam ----------
  // anima uma cópia do conteúdo de um retângulo até um elemento; o alvo fica escondido até o fim
  function voar(deRect, paraEl, html, dur = 360) {
    if (!deRect || !paraEl || !cfg.animacoes) return Promise.resolve();
    const para = paraEl.getBoundingClientRect();
    const v = document.createElement('div');
    v.className = 'voador'; v.innerHTML = html;
    Object.assign(v.style, { left: deRect.left + 'px', top: deRect.top + 'px', width: deRect.width + 'px', height: deRect.height + 'px' });
    document.body.appendChild(v);
    paraEl.classList.add('chegando');
    const dx = para.left - deRect.left, dy = para.top - deRect.top, s = para.width / deRect.width;
    const anim = v.animate([
      { transform: 'translate(0,0) scale(1) rotate(0deg)' },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 40}px) scale(${(1 + s) / 2 * 1.08}) rotate(-8deg)`, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(${s}) rotate(0deg)` },
    ], { duration: dur, easing: 'cubic-bezier(.3,.7,.3,1)' });
    return new Promise(res => {
      anim.onfinish = () => { v.remove(); paraEl.classList.remove('chegando'); paraEl.classList.add('pousou'); setTimeout(() => paraEl.classList.remove('pousou'), 300); res(); };
    });
  }

  // texto que sobe ("+4", "Bloqueio!")
  function texto(alvo, txt, classe = '') {
    if (!cfg.animacoes) return;
    const { x, y } = alvo && alvo.nodeType ? centro(alvo) : (alvo || centro(null));
    const t = document.createElement('div');
    t.className = 'texto-sobe ' + classe; t.textContent = txt;
    t.style.left = x + 'px'; t.style.top = y + 'px';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1300);
  }

  // chamada grande de bom momento, uma de cada vez
  const fila = []; let mostrando = false;
  function chamada(titulo, sub = '', tipo = '') {
    fila.push({ titulo, sub, tipo });
    if (!mostrando) proxima();
  }
  function proxima() {
    const c = fila.shift(); if (!c) { mostrando = false; return; }
    mostrando = true;
    const el = document.createElement('div');
    el.className = 'chamada ' + c.tipo + (cfg.animacoes ? '' : ' sem-anim');
    el.setAttribute('role', 'status');
    el.innerHTML = `<b>${c.titulo}</b>${c.sub ? `<span>${c.sub}</span>` : ''}`;
    document.body.appendChild(el);
    setTimeout(() => { el.classList.add('saindo'); setTimeout(() => { el.remove(); proxima(); }, cfg.animacoes ? 260 : 0); }, cfg.animacoes ? 1150 : 1400);
  }

  function tremer(el, forca = 1) {
    if (!cfg.tremor || !cfg.animacoes || !el) return;
    el.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${-3 * forca}px, ${1 * forca}px)` }, { transform: `translate(${3 * forca}px, ${-1 * forca}px)` }, { transform: `translate(${-2 * forca}px, 0)` }, { transform: 'translate(0,0)' }], { duration: 260, easing: 'ease-out' });
  }
  function pulsar(el) {
    if (!cfg.animacoes || !el) return;
    el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'cubic-bezier(.3,1.6,.5,1)' });
  }
  // contagem do placar (o número sobe em vez de pular)
  // aoPasso(k) é chamado a cada número novo (o tique do placar)
  function contar(el, de, ate, aoPasso = null) {
    if (!el) return;
    if (!cfg.animacoes || de === ate) { el.textContent = ate; return; }
    const ini = performance.now(), dur = Math.min(900, 160 + Math.abs(ate - de) * 90);
    let ultimo = de;
    const passo = agora => {
      const k = Math.min(1, (agora - ini) / dur);
      const v = Math.round(de + (ate - de) * (1 - Math.pow(1 - k, 3)));
      el.textContent = v;
      if (v !== ultimo && aoPasso) aoPasso(v - de);
      ultimo = v;
      if (k < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }

  window.Fx = { cfg, faiscas, confete, poeira, voar, texto, chamada, tremer, pulsar, contar, centro, orbes, clarao };
})();
