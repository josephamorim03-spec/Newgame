/* Dice Duel · os quadros pintados da história: a arte, a câmera (perto, detalhe), os balões com o rabinho até quem fala, a
 * onomatopeia, a letra de mão das receitas e o mural. O mesmo código desenha o gibi do jogo (js/historia.js, com os dados de
 * js/historia_quadros_dados.js) e as páginas de conferência (tools/historia/quadros.py paginas, que embute este arquivo).
 * O estilo está em css/quadros.css; o elemento de fora leva a classe .qh.
 *   const Q = QuadrosHistoria.criar(D, { aoDesenhar })   D = { artes, falas, imagens, murais, retratos, baloes }
 *   Q.trecho(fala, parte)   Q.painel(arte, quadro, trecho, chave) → HTML   Q.desenhar(elementoDaArte)   Q.AJ (os ajustes)
 */
(function () {
  'use strict';
  function criar(D, opcoes = {}) {
    // os ajustes de balão: posição (x, y), largura (w) e ponta do rabinho (tx, ty) em % do quadro; fs é a escala da letra
    const AJ = Object.assign({}, D.baloes || {});
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    const NOMES = { DIANA: 'diana', SAPO: 'sapo', COELHO: 'coelho', URSO: 'urso', CAIXA: 'caixa' };
    const ID_QUEM = { Diana: 'diana', Sapo: 'sapo', Coelho: 'coelho', Raposa: 'raposa', Urso: 'urso', Guaxinim: 'guaxinim', Ovelha: 'ovelha', Coruja: 'coruja' };

    // uma fala, batida a batida: cada " / " é um balão; "NOME:" troca quem fala e vale para as batidas seguintes
    function batidas(codigo) {
      const f = D.falas[codigo];
      if (!f) return [];
      let atual = ID_QUEM[f.quem.replace(/ \+.*$/, '')] || f.quem;
      return f.texto.split(' / ').map(parte => {
        let txt = parte, tipo = 'fala', rub = '', quem = atual;
        const n = txt.match(/^([A-ZÇÃ]{3,}):\s*(.*)$/);
        if (n) { txt = n[2]; if (n[1] === 'CAIXA') quem = 'caixa'; else quem = atual = NOMES[n[1]] || n[1].toLowerCase(); }
        if (quem === 'caixa') tipo = 'caixa';
        const r = txt.match(/^\(([^)]*)\)\s*(.*)$/);
        if (r) {
          if (/^(sem |quadro mudo)/.test(r[1])) tipo = 'mudo';
          else if (/margem|etiqueta|aba/.test(r[1])) tipo = 'margem';
          else { rub = r[1]; if (/dormindo|baixo|sussurr/.test(r[1])) tipo = 'sussurro'; }
          if (tipo !== 'mudo') txt = r[2];
        }
        if (/^Página/.test(f.quem) && tipo === 'fala') tipo = 'receita';
        if (/^…$/.test(txt.trim())) tipo = 'pausa';
        return { codigo, quem, txt, tipo, rub, status: f.status };
      });
    }
    // a batida pedida; sem parte, todas (um quadro com vários balões, como o chá do Sapo no pós-créditos)
    function trecho(codigo, parte) {
      const l = batidas(codigo);
      if (!l.length) return null;
      if (parte != null) return l[parte] || null;
      return l.length === 1 ? l[0] : { ...l[0], multi: l };
    }
    const estadoTag = t => t.status === 'aprovada' ? '' : `<span class="estado ${t.status === 'recusada' ? 'recusada' : ''}">${t.status === 'recusada' ? 'recusada' : 'em revisão'}</span>`;

    // o que vai por cima da arte: balão, letreiros da página do caderno, onomatopeia
    function camada(arte, q, t, chave) {
      const a = D.artes[arte] || {};
      let h = '';
      if (a.pagina) {
        h += `<div class="mao titulo${a.espelho ? ' espelho' : ''}">${esc(a.titulo || '')}</div>`;
        if (t && t.tipo === 'receita') { const corpo = t.txt.split(' · ').slice(1).join(' · '); if (corpo) h += `<div class="mao corpo">${esc(corpo)} ${estadoTag(t)}</div>`; }
        if (t && t.tipo === 'margem') h += a.aba ? `<div class="debaixo">${esc(t.txt)}</div><div class="aba"></div><div class="mao margem">${estadoTag(t)}</div>` : `<div class="mao margem">${esc(t.txt)} ${estadoTag(t)}</div>`;
        return h;
      }
      for (const b of t ? (t.multi || [t]) : []) {
        if (['mudo', 'margem', 'receita'].includes(b.tipo)) continue;
        const lugar = b.tipo === 'caixa' ? '' : (a.lugar || 'nw');
        const ch = `${chave}_${(t.multi || [t]).indexOf(b)}`;
        h += `<div class="balao ${lugar} t-${b.tipo}" data-lugar="${lugar}" data-quem="${esc(b.quem)}" data-chave="${ch}">${b.rub ? `<span class="rub">(${esc(b.rub)})</span>` : ''}${esc(b.txt)}${estadoTag(b)}</div>`;
      }
      if (q.som) h += `<div class="som" style="left:${q.som.x}%;top:${q.som.y}%;--rot:${q.som.rot || -10}deg">${esc(q.som.txt)}</div>`;
      return h;
    }

    // o mural: as peças em % do quadro; o barbante vai de alfinete a alfinete (no alto de cada peça)
    function mural(id) {
      const m = D.murais[id] || {}, pos = {};
      const pecas = [];
      for (const f of m.fotos || []) {
        const src = D.retratos[f.id === 'voce' ? 'bolinha' : f.id] || '';
        pos[f.id] = [f.x, f.y - 11];
        pecas.push(`<div class="foto" style="left:${f.x}%;top:${f.y}%;--r:${f.rot || 0}deg"><img src="${src}" alt="${esc(f.id)}">${f.legenda ? `<span class="leg">${esc(f.legenda)}</span>` : ''}${f.carimbo ? `<span class="carimbo">${esc(f.carimbo)}</span>` : ''}</div>`);
      }
      for (const n of m.notas || []) {
        pos[n.id] = [n.x, n.y - (n.tipo === 'postit' && !n.pequeno ? 8 : 4)];
        pecas.push(`<div class="recado ${n.tipo}${n.pequeno ? ' pequeno' : ''}" style="left:${n.x}%;top:${n.y}%;--r:${n.rot || 0}deg">${esc(n.txt)}</div>`);
      }
      let helice = '';
      if (m.helice) {   // a dupla hélice com dados no lugar dos degraus
        const { x, y } = m.helice; pos.helice = [x, y - 14];
        const a = [], b = [], degraus = [];
        for (let i = 0; i <= 24; i++) { const t = i / 24, yy = y - 13 + t * 26, dx = Math.sin(t * Math.PI * 2.5) * 3.2; a.push(`${x + dx},${yy}`); b.push(`${x - dx},${yy}`); if (i % 4 === 2) degraus.push([x, yy, Math.abs(dx)]); }
        helice = `<polyline points="${a.join(' ')}" fill="none" stroke="#3a2a2e" stroke-width=".5"/><polyline points="${b.join(' ')}" fill="none" stroke="#3a2a2e" stroke-width=".5"/>` +
          degraus.map(([dx, dy, w]) => `<line x1="${dx - w}" y1="${dy}" x2="${dx + w}" y2="${dy}" stroke="#3a2a2e" stroke-width=".25"/><rect x="${dx - .9}" y="${dy - 1.35}" width="1.8" height="2.7" rx=".4" fill="#ec8fa8" stroke="#3a2a2e" stroke-width=".25"/>`).join('');
      }
      const ponto = k => Array.isArray(k) ? k : pos[k];
      const fios = (m.fios || []).map(([a, b]) => { const p = ponto(a), q = ponto(b); if (!p || !q) return '';
        const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2 + 3;   // o barbante cede um pouco
        return `<path d="M${p[0]},${p[1]} Q${mx},${my} ${q[0]},${q[1]}" fill="none" stroke="#b2483a" stroke-width=".45" vector-effect="non-scaling-stroke" style="stroke-width:max(1.5px,.32cqw)"/>`; }).join('');
      const alfinetes = Object.values(pos).map(([x, y]) => `<circle class="alfinete" cx="${x}" cy="${y}" r=".9"/>`).join('');
      return `<div class="mural"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${helice}</svg>${pecas.join('')}<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${fios}</svg><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" style="z-index:1">${alfinetes}</svg></div>`;
    }

    const ZOOM = { perto: 1.3, detalhe: 1.65 };
    function painel(arte, q, t, chave) {
      if (!arte) return `<div class="arte vazio">sem este quadro</div>`;
      const src = D.imagens[arte], a = D.artes[arte] || {};
      if (a.mural) {
        return `<div class="arte" data-arte="${esc(arte)}" data-zoom="${ZOOM[q.plano] || 1}" data-foco="${q.foco ? q.foco.join(',') : ''}">${mural(a.mural)}<div class="reticula"></div><svg class="tinta" aria-hidden="true"></svg>${camada(arte, q, t, chave)}</div>`;
      }
      if (!src) return `<div class="arte vazio">ainda sem arte<br><code>${esc(arte)}</code></div>`;
      const chapas = q.impacto ? `<img class="chapa azul" src="${src}" alt=""><img class="chapa rosa" src="${src}" alt="">` : '';
      return `<div class="arte${a.pagina ? ' pagina' : ''}" data-arte="${esc(arte)}" data-zoom="${ZOOM[q.plano] || 1}" data-foco="${q.foco ? q.foco.join(',') : ''}">
        <img class="base" src="${src}" alt="${esc(a.texto != null ? a.texto : arte)}">${chapas}<div class="reticula"></div>
        <svg class="tinta" aria-hidden="true"></svg>${camada(arte, q, t, chave)}</div>`;
    }

    // a câmera do quadro: a imagem como o object-fit a mostra, aproximada (perto, detalhe) e levada até o foco, sem sobrar
    // borda vazia. O foco padrão é a cabeça de quem fala (a boca marcada, um pouco acima), em % da imagem.
    function camera(el, img) {
      const W = el.clientWidth, H = el.clientHeight, z = +el.dataset.zoom || 1;
      let foco = el.dataset.foco ? el.dataset.foco.split(',').map(Number) : null;
      if (!foco) { const bal = el.querySelector('.balao:not(.t-caixa)'), b = bal && ((D.artes[el.dataset.arte] || {}).boca || {})[bal.dataset.quem]; foco = b && b[1] <= 100 ? [b[0], b[1] - 12] : [50, 35]; }
      let ox = 0, oy = 0, dw = W, dh = H;                       // o mural ocupa o quadro inteiro
      if (img) {
        if (!img.naturalWidth) return null;
        const k = Math.max(W / img.naturalWidth, H / img.naturalHeight);
        dw = img.naturalWidth * k; dh = img.naturalHeight * k;
        // o recorte do object-fit já vai para o lado do foco (object-position); a imagem só pinta dentro da caixa dela
        const fx = Math.max(0, Math.min(1, (foco[0] / 100 * dw - W / 2) / Math.max(1, dw - W))), fy = Math.max(0, Math.min(1, (foco[1] / 100 * dh - H / 2) / Math.max(1, dh - H)));
        ox = (W - dw) * fx; oy = (H - dh) * fy;
        el.style.setProperty('--op', `${fx * 100}% ${fy * 100}%`);
      }
      const px = ox + foco[0] / 100 * dw, py = oy + foco[1] / 100 * dh;
      // tela = z · ponto + T; T leva o foco ao centro, preso para a caixa da imagem (0..W) cobrir o quadro todo
      const tx = Math.min(0, Math.max(W - z * W, W / 2 - z * px));
      const ty = Math.min(0, Math.max(H - z * H, H / 2 - z * py));
      const cam = { z, tx, ty, ox, oy, dw, dh };
      el.style.setProperty('--cam', `translate(${cam.tx}px, ${cam.ty}px) scale(${z})`);
      el._cam = cam;
      return cam;
    }
    // a boca de quem fala, em pixels do quadro (pela câmera)
    function bocaNoQuadro(el, img, quem) {
      const b = ((D.artes[el.dataset.arte] || {}).boca || {})[quem], c = el._cam;
      if (!b || !c) return null;
      const x = c.ox + b[0] / 100 * c.dw, y = c.oy + b[1] / 100 * c.dh;
      return { x: c.z * x + c.tx, y: c.z * y + c.ty };
    }

    // o rosto de quem fala: a caixa da cabeça marcada na arte ("cabeca", em % da imagem) ou, sem ela, uma estimativa pela boca
    function rosto(el, img, quem) {
      const m = bocaNoQuadro(el, img, quem), c = el._cam;
      if (!m || !c) return null;
      const a = D.artes[el.dataset.arte] || {}, cab = (a.cabeca || {})[quem];
      if (cab) {
        const p = (x, y) => ({ x: c.z * (c.ox + x / 100 * c.dw) + c.tx, y: c.z * (c.oy + y / 100 * c.dh) + c.ty });
        const A = p(cab[0], cab[1]), B = p(cab[2], cab[3]);
        return { boca: m, x0: A.x, y0: A.y, x1: B.x, y1: B.y };
      }
      const hw = c.dw * .13 * c.z, hh = c.dh * .36 * c.z;
      return { boca: m, x0: m.x - hw, x1: m.x + hw, y0: m.y - hh, y1: m.y + hh * .22 };
    }
    const sobra = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
    const CANTOS = ['nw', 'ne', 'sw', 'se'];
    // cada balão procura, no quadro todo, o lugar que não cobre rosto nem outro balão, perto de quem fala e de preferência no
    // alto (lê-se de cima para baixo); o canto livre da arte desempata
    function posicionar(el, img) {
      const W = el.clientWidth, H = el.clientHeight, m = Math.max(6, W * .025);
      const rostos = [...el.querySelectorAll('.balao')].map(b => rosto(el, img, b.dataset.quem)).filter(Boolean);
      // e o que a piada precisa que se veja ("evitar" na arte: o letreiro, a página, o mural)
      const cam = el._cam, art = D.artes[el.dataset.arte] || {};
      if (cam) for (const e of art.evitar || []) rostos.push({ x0: cam.z * (cam.ox + e[0] / 100 * cam.dw) + cam.tx, y0: cam.z * (cam.oy + e[1] / 100 * cam.dh) + cam.ty, x1: cam.z * (cam.ox + e[2] / 100 * cam.dw) + cam.tx, y1: cam.z * (cam.oy + e[3] / 100 * cam.dh) + cam.ty });
      const postos = [];
      const falas = [...el.querySelectorAll('.balao:not(.t-caixa)')];
      for (const bal of el.querySelectorAll('.balao')) {
        CANTOS.forEach(k => bal.classList.remove(k));
        const aj = AJ[bal.dataset.chave];
        bal.classList.toggle('ajustado', !!aj);
        bal.style.setProperty('--fs', aj && aj.fs ? aj.fs : 1);
        bal.style.width = aj && aj.w ? `${aj.w}%` : '';
        if (aj) {                                           // ajustado à mão: fica onde foi posto
          bal.style.left = `${aj.x}%`; bal.style.top = `${aj.y}%`;
          postos.push({ ...caixaDe(bal), fala: true }); continue;
        }
        if (bal.classList.contains('t-caixa')) { postos.push(caixaDe(bal)); continue; }
        bal.style.left = '0px'; bal.style.top = '0px';
        const w = bal.offsetWidth, h = bal.offsetHeight, f = rosto(el, img, bal.dataset.quem), pref = bal.dataset.lugar || 'nw';
        let melhor = null;
        for (let y = m; y <= H - h - m + .1; y += Math.max(4, (H - h - 2 * m) / 14)) {
          for (let x = m; x <= W - w - m + .1; x += Math.max(4, (W - w - 2 * m) / 16)) {
            const r = { x0: x, y0: y, x1: x + w, y1: y + h };
            let custo = rostos.reduce((s, q) => s + sobra(r, q) * 40, 0) + postos.reduce((s, q) => s + sobra(r, q) * 60, 0);
            if (f) {   // perto da cabeça, mas fora dela: a distância do balão até a borda do rosto
              const dx = Math.max(f.x0 - r.x1, r.x0 - f.x1, 0), dy = Math.max(f.y0 - r.y1, r.y0 - f.y1, 0);
              custo += Math.hypot(dx, dy) * (falas.length > 1 ? 4 : 2.2);
            }
            custo += y * .6;                                                        // no alto
            if (falas.length > 1) {                                                // vários balões: cada um na sua faixa de altura, na ordem da fala
              const i = falas.indexOf(bal);
              custo += Math.abs((y + h / 2) / H - (i + .5) / falas.length) * H * .5;
            }
            const antes = postos.filter(q => q.fala).at(-1);                        // a fala seguinte vem abaixo da anterior (ordem de leitura)
            if (antes && y < antes.y0 + 4) custo += H * .6;
            custo += ((pref[1] === 'w') === (x + w / 2 < W / 2) ? 0 : W * .04) + ((pref[0] === 'n') === (y + h / 2 < H / 2) ? 0 : H * .04);
            if (!melhor || custo < melhor.custo) melhor = { x, y, custo };
          }
        }
        bal.style.left = `${melhor.x}px`; bal.style.top = `${melhor.y}px`;
        postos.push({ ...caixaDe(bal), fala: true });
      }
    }
    const caixaDe = bal => ({ x0: bal.offsetLeft, y0: bal.offsetTop, x1: bal.offsetLeft + bal.offsetWidth, y1: bal.offsetTop + bal.offsetHeight });

    // desenha os balões e os rabinhos: primeiro tudo com o contorno grosso, depois o recheio por cima (assim não sobra emenda)
    function desenhar(el) {
      const svg = el.querySelector('svg.tinta'), img = el.querySelector('img.base');
      if (!svg) return;
      const W = el.clientWidth, H = el.clientHeight;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      camera(el, img);
      posicionar(el, img);
      const contornos = [], recheios = [], linhas = [];
      for (const bal of el.querySelectorAll('.balao')) {
        if (bal.classList.contains('oculto')) { bal._ponta = null; continue; }   // no gibi do jogo: o balão que ainda não chegou (já tem lugar)
        const r = { x: bal.offsetLeft, y: bal.offsetTop, w: bal.offsetWidth, h: bal.offsetHeight };
        const caixa = bal.classList.contains('t-caixa');
        const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
        // o contorno do balão como uma lista de pontos: o oval de gibi (superelipse) inscrito na caixa do texto; a narração é retângulo
        const borda = [];
        if (caixa) borda.push([r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]);
        else for (let i = 0; i < 180; i++) {
          const t = i / 180 * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
          borda.push([cx + r.w / 2 * Math.sign(c) * Math.sqrt(Math.abs(c)), cy + r.h / 2 * Math.sign(sn) * Math.sqrt(Math.abs(sn))]);
        }
        const caminho = pts => 'M' + pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L') + ' Z';
        let rabo = '';
        const aj = AJ[bal.dataset.chave];
        let f = caixa ? null : rosto(el, img, bal.dataset.quem);
        if (!caixa && aj && aj.tx != null) {               // a ponta do rabinho posta à mão: vai até ela
          const p = { x: aj.tx / 100 * W, y: aj.ty / 100 * H };
          f = { boca: p, x0: p.x, x1: p.x, y0: p.y, y1: p.y, mao: true };
        }
        if (aj && aj.semRabo) f = null;
        bal._ponta = null;
        if (f) {
          const boca = f.boca;
          // a base: o ponto da borda virado para a boca, e dois pontos a uma distância dele, andando pela própria borda
          const ang = Math.atan2(boca.y - cy, boca.x - cx);
          let k = 0, melhor = Infinity;
          borda.forEach((p, i) => { const d = Math.abs(((Math.atan2(p[1] - cy, p[0] - cx) - ang) + 3 * Math.PI) % (2 * Math.PI) - Math.PI); if (d < melhor) { melhor = d; k = i; } });
          const meiaBase = Math.max(7, Math.min(16, r.h * .2));
          const andar = dir => { let i = k, L = 0; while (L < meiaBase) { const j = (i + dir + borda.length) % borda.length; L += Math.hypot(borda[j][0] - borda[i][0], borda[j][1] - borda[i][1]); i = j; } return borda[i]; };
          const A = andar(-1), B = andar(1), base = borda[k];
          // a ponta: na direção da boca, parando um pouco antes da cabeça (por fora); sempre um rabinho que se vê
          const dx = boca.x - base[0], dy = boca.y - base[1], dist = Math.hypot(dx, dy) || 1, ux = dx / dist, uy = dy / dist;
          let ate = dist;
          for (const [lim, comp, dir] of [[f.x0, base[0], ux], [f.x1, base[0], ux], [f.y0, base[1], uy], [f.y1, base[1], uy]]) {
            if (Math.abs(dir) < 1e-6) continue;
            const q = (lim - comp) / dir;
            if (q > 0) { const px = base[0] + ux * q, py = base[1] + uy * q; if (px >= f.x0 - 1 && px <= f.x1 + 1 && py >= f.y0 - 1 && py <= f.y1 + 1) ate = Math.min(ate, q); }
          }
          // o rabinho nunca entra na cabeça: para 6 px antes dela; colado na cabeça, fica curtinho (e aponta)
          const comp = f.mao ? Math.max(8, dist) : ate > 16 ? Math.min(ate - 6, H * .24, Math.max(r.h * .9, 30)) : Math.max(5, ate - 3);
          const tip = [base[0] + ux * comp, base[1] + uy * comp];
          bal._ponta = tip;
          // os dois lados curvam para o mesmo lado, como o rabinho desenhado à mão
          const curva = comp * .14, px = -uy * curva, py = ux * curva;
          const c1 = [(A[0] + tip[0]) / 2 + px, (A[1] + tip[1]) / 2 + py], c2 = [(B[0] + tip[0]) / 2 + px, (B[1] + tip[1]) / 2 + py];
          rabo = `M${A[0]},${A[1]} Q${c1[0]},${c1[1]} ${tip[0]},${tip[1]} Q${c2[0]},${c2[1]} ${B[0]},${B[1]} Z`;
          el.style.setProperty('--bx', `${boca.x / W * 100}%`); el.style.setProperty('--by', `${boca.y / H * 100}%`);
        }
        // primeiro todos os contornos, depois todos os recheios: a borda do balão entre os pés do rabinho some, sem emenda
        const fill = caixa ? '#f8dc9a' : '#fffdf8', tracejado = bal.classList.contains('t-sussurro') ? ' stroke-dasharray="6 5"' : '';
        contornos.push(`<path d="${caminho(borda)}" fill="none" stroke="#3a2a2e" stroke-width="5"${tracejado} stroke-linejoin="round"/>`);
        if (rabo) contornos.push(`<path d="${rabo}" fill="#3a2a2e" stroke="#3a2a2e" stroke-width="5" stroke-linejoin="round"/>`);
        recheios.push(`<path d="${caminho(borda)}" fill="${fill}"/>`);
        if (rabo) recheios.push(`<path d="${rabo}" fill="${fill}"/>`);
      }
      const formas = [...contornos, ...recheios];
      const q = el.closest('.q'), l = q && q.dataset.linhas ? JSON.parse(q.dataset.linhas) : null;
      if (l) {   // linhas de movimento atrás do que anda
        const x0 = l.x / 100 * W, y0 = l.y / 100 * H, ang = (l.ang || 0) * Math.PI / 180, c = Math.cos(ang), s = Math.sin(ang);
        for (const [o, comp] of [[-12, .09], [0, .13], [12, .08]]) {
          const px = x0 - s * o, py = y0 + c * o;
          linhas.push(`<line x1="${px + c * W * .02}" y1="${py + s * W * .02}" x2="${px + c * W * (.02 + comp)}" y2="${py + s * W * (.02 + comp)}" stroke="#3a2a2e" stroke-width="3" stroke-linecap="round"/>`);
        }
      }
      svg.innerHTML = linhas.join('') + formas.join('');
      if (opcoes.aoDesenhar) opcoes.aoDesenhar(el);
    }

    return { AJ, esc, batidas, trecho, camada, mural, painel, camera, rosto, posicionar, desenhar, estadoTag, ZOOM };
  }
  window.QuadrosHistoria = { criar };
})();
