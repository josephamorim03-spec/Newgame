/* Dice Duel · as patas da Diana na tela inicial (v0.14)
 * A Diana espia por trás da mesinha da cena com as duas patas apoiadas na borda, como gata em beirada de mesa. Só as
 * patas: nada de braço nem de corpo. De tempos em tempos uma delas sai da borda, desce num dado, dá uma ou duas
 * batidinhas (o dado treme, um toque abafado no feltro, uma vibração leve no celular) e arrasta o dado na direção dela,
 * como quem vai pegá-lo para si; depois solta, o dado volta para o lugar e a pata volta para a borda.
 * Cada dado é da pata do lado dele: o da esquerda, a pata da esquerda; o da direita, a da direita; o do meio, qualquer
 * uma (meio a meio). Erguer a pata é ela crescer um pouco e a sombra no feltro se afastar, como se viesse na direção de
 * quem olha. Com as animações desligadas (Ajustes ou "reduzir movimento"), as patas ficam paradas na borda.
 * A pata é um sprite de quatro poses, trocadas como quadros: "dorso" (vista de cima, apoiada), "virando" (no meio do
 * giro de cima para baixo: larga e achatada, a ponta dos dedos de frente, um feijãozinho rosa em cada), "palma" (a pata erguida, de frente: a almofada maior e os quatro
 * feijõezinhos rosa) e "gancho" (os dedos dobrados por cima da aresta do dado, as pontinhas rosa pegando na face).
 * A investida: dorso → virando → palma ao erguer; palma → virando → gancho ao descer na aresta; puxa; gancho →
 * virando → dorso ao voltar. A pata da direita é o espelho da da esquerda.
 * A arte pintada (js/patas_pintadas.js, gerada pela API de imagem com arte/patas.json e o vetor de cada pose como
 * referência) entra no lugar do vetor de cada pose que a tem; sem ela, fica o vetor. Dela vêm também os efeitos: a
 * poeirinha da batida, quando a pata encosta no dado, e o rastro da pata que corre até o dado.
 *   Pata.ligar(cena, { aoBater(i), aoTerminar(i) })   Pata.desligar()   Pata.susto()
 */
(function () {
  'use strict';
  const PELO = '#f8f6f2', SOMBRA = '#e4e1dc', CACAU = '#3a2a2e', ROSA = '#f19bb3', ROSA_SOMBRA = '#d97894';
  const POSES = ['dorso', 'virando', 'palma', 'gancho'];
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

  // ---------- o sprite da pata: quatro poses, centradas no meio da palma, os dedos para baixo (+y) ----------
  // L é a largura do traço do mundo da cena (~14 a 17 px): tudo se mede nele
  const el = (cx, cy, rx, ry, cor, borda = 0, L = 1, extra = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${cor}"${borda ? ` stroke="${CACAU}" stroke-width="${L * borda}"` : ''}${extra}/>`;
  // dorso: a pata vista de cima, apoiada; um pouco de sombra embaixo e os vãos dos dedos na ponta
  function dorso(L) {
    const rx = L * 0.86, ry = L * 0.74;
    const dedo = (dx, a) => `<path d="M${dx} ${ry * 0.55} q ${a} ${ry * 0.28} ${a * 0.2} ${ry * 0.5}" fill="none" stroke="${CACAU}" stroke-width="${L * 0.13}" stroke-linecap="round"/>`;
    return el(0, ry * 0.12, rx, ry, PELO, 0.2, L)
      + `<path d="M${-rx * 0.82} ${ry * 0.35} q ${rx * 0.82} ${ry * 0.9} ${rx * 1.64} 0" fill="none" stroke="${SOMBRA}" stroke-width="${L * 0.16}" stroke-linecap="round"/>`
      + dedo(-rx * 0.34, -L * 0.05) + dedo(rx * 0.34, L * 0.05);
  }
  // a almofada maior (a "palma"): três lobos embaixo, como a de verdade
  function almofada(L, cx, cy, s) {
    const u = L * s, p = (x, y) => `${cx + x * u} ${cy + y * u}`;
    return `<path d="M${p(-0.46, -0.02)} C${p(-0.44, -0.3)} ${p(0.44, -0.3)} ${p(0.46, -0.02)} C${p(0.5, 0.26)} ${p(0.34, 0.4)} ${p(0.17, 0.33)} C${p(0.08, 0.43)} ${p(-0.08, 0.43)} ${p(-0.17, 0.33)} C${p(-0.34, 0.4)} ${p(-0.5, 0.26)} ${p(-0.46, -0.02)}Z" fill="${ROSA}" stroke="${ROSA_SOMBRA}" stroke-width="${L * 0.06}"/>`;
  }
  // palma: a pata erguida, de frente para quem olha, com os dedos para cima: a almofada maior embaixo e os quatro
  // feijõezinhos em arco por cima dela; pelo branco em volta
  function palma(L) {
    const rx = L * 0.92, ry = L * 0.86;
    const feijao = (x, y, r) => el(x * L, y * L, L * 0.19 * r, L * 0.22 * r, ROSA, 0, L, ` stroke="${ROSA_SOMBRA}" stroke-width="${L * 0.05}"`);
    return el(0, 0, rx, ry, PELO, 0.2, L)
      + almofada(L, 0, L * 0.3, 0.95)
      + feijao(-0.56, -0.2, 0.95) + feijao(-0.2, -0.5, 1) + feijao(0.2, -0.5, 1) + feijao(0.56, -0.2, 0.95);
  }
  // virando: o meio do giro entre o dorso (dedos para baixo, palma no feltro) e a palma (dedos para cima, almofadas de
  // frente). O giro é de cima para baixo, num eixo deitado: no meio dele a pata aparece larga e achatada, com a ponta
  // dos quatro dedos virada para quem olha e um feijãozinho rosa em cada um (a almofada maior ainda não aparece).
  // Simétrica: serve às duas patas sem trocar de lado
  function virando(L) {
    const borda = L * 0.2;
    const formas = [[0, -L * 0.14, L * 0.86, L * 0.44], ...[-0.6, -0.2, 0.2, 0.6].map(x => [x * L, L * 0.18, L * 0.29, L * 0.29])];
    const contorno = formas.map(([x, y, rx, ry]) => el(x, y, rx + borda / 2, ry + borda / 2, CACAU)).join('');
    const pelo = formas.map(([x, y, rx, ry]) => el(x, y, rx - borda / 2, ry - borda / 2, PELO)).join('');
    const feijao = formas.slice(1).map(([x, y]) => el(x, y + L * 0.05, L * 0.1, L * 0.11, ROSA, 0, L, ` stroke="${ROSA_SOMBRA}" stroke-width="${L * 0.04}"`)).join('');
    return contorno + pelo
      + `<path d="M${-L * 0.6} ${-L * 0.36} q ${L * 0.6} ${-L * 0.22} ${L * 1.2} 0" fill="none" stroke="${SOMBRA}" stroke-width="${L * 0.12}" stroke-linecap="round"/>`
      + feijao;
  }
  // gancho: os dedos dobrados por cima da aresta do dado. A palma (uma elipse larga) e quatro dedos redondos em arco
  // na ponta, num contorno só (primeiro tudo em cacau, mais grosso; por cima, tudo em branco); entre os dedos, vãos
  // curtos; embaixo de cada dedo, só uma lasquinha rosa da almofada, a parte que aperta a face do dado
  function gancho(L) {
    const borda = L * 0.2;
    const formas = [[0, -L * 0.08, L * 0.88, L * 0.56], ...[[-0.62, 0.36], [-0.21, 0.47], [0.21, 0.47], [0.62, 0.36]].map(([x, y]) => [x * L, y * L, L * 0.27, L * 0.25])];
    const contorno = formas.map(([x, y, rx, ry]) => el(x, y, rx + borda / 2, ry + borda / 2, CACAU)).join('');
    const pelo = formas.map(([x, y, rx, ry]) => el(x, y, rx - borda / 2, ry - borda / 2, PELO)).join('');
    const lasca = formas.slice(1).map(([x, y]) => el(x, y + L * 0.27, L * 0.15, L * 0.075, ROSA, 0.07, L)).join('');
    const vao = (x, y) => `<path d="M${x * L} ${y * L} l 0 ${-L * 0.16}" stroke="${CACAU}" stroke-width="${L * 0.1}" stroke-linecap="round"/>`;
    return contorno + lasca + pelo
      + `<path d="M${-L * 0.62} ${-L * 0.32} q ${L * 0.62} ${-L * 0.3} ${L * 1.24} 0" fill="none" stroke="${SOMBRA}" stroke-width="${L * 0.13}" stroke-linecap="round"/>`
      + vao(-0.42, 0.36) + vao(0, 0.4) + vao(0.42, 0.36);
  }
  const SPRITE = { dorso, virando, palma, gancho };
  // a arte pintada de cada pose e dos efeitos (o quadrado do webp, em larguras L: o desenho ocupa o lado maior dele)
  const pintada = id => (window.PATAS_PINTADAS || {})[id];
  const LADO_PINTADA = { dorso: 2.15, virando: 2.05, palma: 2.25, gancho: 2.15, batida: 2.1, rastro: 2.2 };
  const imagem = (id, L) => { const t = LADO_PINTADA[id] * L; return `<image href="${pintada(id)}" x="${-t / 2}" y="${-t / 2}" width="${t}" height="${t}"/>`; };
  const poseSVG = (p, L, k) => (pintada(p) ? imagem(p, L) : SPRITE[p](L, k));

  // desenha as duas patas: a erguida (e > 0) cresce, sobe um pouco e a sombra dela se afasta; a inclinação segue o
  // caminho da pata (para o lado de onde ela veio), sem passar de 25°
  function desenhar(c) {
    const m = c.m, svg = c.svg; if (!m || !svg.isConnected) return false;
    c.P.forEach((P, k) => {
      const e = P.e || 0, inc = Math.max(-25, Math.min(25, (P.x - m.repouso[k].x) * -0.35));
      const mao = svg.querySelector(`.mao${k}`), pose = c.pose[k];
      mao.setAttribute('transform', `translate(${P.x} ${P.y - e * m.larg * 0.35}) rotate(${inc}) scale(${(1 + e * 0.2) * (k ? -1 : 1)} ${1 + e * 0.2})`);
      if (mao.dataset.pose !== pose) { mao.dataset.pose = pose; mao.querySelectorAll('[data-pose]').forEach(g => g.setAttribute('display', g.dataset.pose === pose ? 'inline' : 'none')); }
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
    c.svg.innerHTML = [0, 1].map(k => `<ellipse class="sombra${k}" fill="#1f2a24"/><g class="mao${k}">${POSES.map(p => `<g data-pose="${p}" display="none">${poseSVG(p, m.larg, k)}</g>`).join('')}</g>`).join('');
    if (!c.P) c.P = m.repouso.map(r => ({ ...r }));
    if (!c.pose) c.pose = ['dorso', 'dorso'];
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

  // um efeito pintado no ponto (x, y) da cena: aparece pequeno, cresce e some em ms (giro em graus); sem a pintura, nada
  function efeito(c, id, x, y, ms, giro = 0, de = 0.5, ate = 1.15, espelho = false) {
    if (!pintada(id) || !animando() || !c.svg.isConnected) return;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.innerHTML = imagem(id, c.m.larg);
    c.svg.insertBefore(g, c.svg.firstChild);   // atrás das patas
    const t0 = performance.now();
    const passo = agora => {
      const t = Math.min(1, (agora - t0) / ms), e = 1 - Math.pow(1 - t, 2);
      const s = de + (ate - de) * e;
      g.setAttribute('transform', `translate(${x} ${y}) rotate(${giro}) scale(${espelho ? -s : s} ${s})`);
      g.setAttribute('opacity', (t < 0.35 ? 1 : 1 - (t - 0.35) / 0.65).toFixed(2));
      if (t < 1 && g.isConnected) requestAnimationFrame(passo); else g.remove();
    };
    requestAnimationFrame(passo);
  }

  // troca a pose da pata k quadro a quadro (cada quadro fica ms na tela); devolve false se a investida foi cancelada
  async function quadros(c, k, seq, ms = 70) {
    const tok = c.token;
    for (const p of seq) {
      if (tok !== c.token) return false;
      c.pose[k] = p; desenhar(c);
      if (animando()) await esperar(ms);
    }
    return tok === c.token;
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

  // uma investida: a pata ergue da borda virando a palma para quem olha (dorso → virando → palma), vai até o dado,
  // desce na aresta de cima dele com os dedos dobrados (palma → virando → gancho), aperta uma ou duas vezes, puxa o
  // dado pela aresta na direção dela e solta (gancho → virando → dorso), voltando para a borda
  async function investida(c) {
    if (!montar(c)) return;
    const m = c.m, i = Math.floor(Math.random() * m.dados.length), d = m.dados[i], k = pataDoDado(i, m.dados.length);
    const cab = c.cena.querySelector('.cena-rival'), casa = m.repouso[k];
    c.alvo = d;
    d.base = getComputedStyle(d.el).transform; if (d.base === 'none') d.base = '';
    // a pata não passa pelo rosto: erguer é o "e" (ela cresce e a sombra se afasta), não subir na tela
    const ergue = { x: casa.x + (d.x - casa.x) * 0.25, y: Math.max(m.chao, casa.y + m.larg * 0.4), e: 1 };
    const acima = { x: d.x + (casa.x - d.x) * 0.12, y: Math.max(m.chao, d.y - d.t * 0.45), e: 1 };
    // na aresta: a ponta dos dedos (os feijões) cobre um pouco da face de cima do dado
    const aresta = { x: d.x, y: Math.max(m.chao, d.y - d.t * 0.5 - m.larg * 0.25), e: 0 };
    // ergue e vira a palma
    if (!(await quadros(c, k, ['virando'], 60))) return;
    if (!(await mover(c, k, ergue, 200, suave))) return;
    if (!(await quadros(c, k, ['palma'], 0))) return;
    // o rastro da corrida até o dado, no meio do caminho e na direção dele
    // (o desenho aponta para a direita, a ponta fina atrás: indo para a esquerda, ele é espelhado em vez de virado)
    const rumo = Math.atan2(acima.y - ergue.y, acima.x - ergue.x) * 180 / Math.PI, praEsquerda = Math.abs(rumo) > 90;
    efeito(c, 'rastro', (ergue.x + acima.x) / 2, (ergue.y + acima.y) / 2, 360, praEsquerda ? rumo - 180 : rumo, 0.7, 1, praEsquerda);
    if (!(await mover(c, k, acima, 300, suave))) return;
    await esperar(220 + Math.random() * 220);   // a ameaça: a palma no ar, em cima do dado
    // desce virando até enganchar na aresta
    if (!(await quadros(c, k, ['virando'], 60))) return;
    if (!(await quadros(c, k, ['gancho'], 0))) return;
    const batidas = Math.random() < 0.5 ? 2 : 1;
    for (let b = 0; b < batidas; b++) {
      if (!(await mover(c, k, aresta, 110, t => t * t))) return;
      d.el.classList.remove('cutucado'); void d.el.offsetWidth; d.el.classList.add('cutucado');
      // a poeirinha sai embaixo das pontinhas, na face do dado (atrás da pata, que fica por cima)
      efeito(c, 'batida', aresta.x, aresta.y + m.larg * 1.05, 320, Math.random() * 40 - 20, 0.55, 1.25);
      if (c.cb.aoBater) c.cb.aoBater(i, b);
      if (b < batidas - 1 && !(await mover(c, k, { x: aresta.x, y: Math.max(m.chao, aresta.y - d.t * 0.2), e: 0.5 }, 130, salto))) return;
    }
    // puxa o dado pela aresta, na direção da borda do lado dela; o dado inclina como quem é arrastado pela beirada; a
    // cabeça acompanha, travessa
    if (cab) cab.classList.add('travessa');
    const puxa = { x: aresta.x + (casa.x - aresta.x) * 0.25, y: Math.max(m.chao, aresta.y - d.t * 0.3), e: 0.1 };
    const ok = await mover(c, k, puxa, 420, suave, P => puxar(d, P.x - aresta.x, P.y - aresta.y, (P.x - aresta.x) * 0.5 + (P.y - aresta.y) * (k ? 0.6 : -0.6)));
    await esperar(ok ? 260 : 0);
    soltar(d); c.alvo = null;
    if (cab) cab.classList.remove('travessa');
    if (!ok) return;
    // solta, vira de volta e volta para a borda
    if (!(await quadros(c, k, ['virando', 'dorso'], 70))) return;
    if (!(await mover(c, k, { ...casa, e: 0.5 }, 280, suave))) return;
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
    atual = { cena, svg, cb, token: 0, timer: null, P: null, pose: null };
    // os efeitos pintados já decodificados: sem isso, a primeira poeirinha chegava atrasada
    ['batida', 'rastro'].forEach(id => { if (!pintada(id)) return; const im = new Image(); im.src = pintada(id); if (im.decode) im.decode().catch(() => {}); });
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
    if (c.pose) c.pose = ['dorso', 'dorso'];
    [0, 1].forEach(k => mover(c, k, c.m.repouso[k], 160, salto));
    agendar(c, 2600 + Math.random() * 2000);
  }
  addEventListener('resize', () => { if (atual) { atual.token++; atual.P = null; atual.pose = null; if (atual.alvo) { soltar(atual.alvo); atual.alvo = null; } montar(atual); } });

  // SPRITE e POSES saem para tools/referencias_patas.js desenhar as referências da arte pintada
  window.Pata = { ligar, desligar, susto, SPRITE, POSES };
})();
