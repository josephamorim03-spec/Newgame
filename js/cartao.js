// Dice Duel · o cartão do fim da partida: uma imagem (PNG, 1080×1350) para mandar no grupo, no lugar do resumo em texto.
// Desenhado num canvas com as cores do jogo e os retratos pintados; nada sai do aparelho até a pessoa compartilhar.
'use strict';
(() => {
  const L = 1080, A = 1350;
  const COR = {
    noite: '#241a24', luz: '#ffcf8a', madeira: '#7a4b2f', feltro2: '#5f8f78', feltroEscuro: '#3b6252',
    papel: '#fbf1df', papel2: '#f1dfc2', texto: '#fff3e2', textoSuave: '#ecdcc8', voce: '#6fbfd3', rival: '#ec8fa8', mel: '#f2b15e',
  };
  const TITULO = '"Fredoka", "Trebuchet MS", sans-serif', CORPO = '"Nunito", "Segoe UI", Arial, sans-serif';

  // o retrato pintado (data URI) ou, sem ele, o vetor
  function imagemDoRetrato(id) {
    const src = (window.RETRATOS_PINTADOS || {})[id];
    const url = src || URL.createObjectURL(new Blob([`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${Retratos.SVG[id] || Retratos.SVG.bolinha}</svg>`], { type: 'image/svg+xml' }));
    const im = new Image(); im.src = url;
    return im.decode().then(() => im, () => null).finally(() => { if (!src) URL.revokeObjectURL(url); });
  }
  // corta o texto com reticências até caber na largura
  function caber(c, t, max) {
    t = String(t);
    if (c.measureText(t).width <= max) return t;
    while (t.length > 1 && c.measureText(t + '…').width > max) t = t.slice(0, -1);
    return t.trimEnd() + '…';
  }
  function caixa(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }

  function carregar(src) {
    if (!src) return Promise.resolve(null);
    const im = new Image(); im.src = src;
    return im.decode().then(() => im, () => null);
  }

  // d: { titulo, modo, nomes: [a, b], pts: [a, b], vencedor, retratos: [id, id], destaque?, linhas: [{ simbolo, src?, txt }], endereco }
  // src: o símbolo pintado do lance (js/momentos_pintados.js); sem ele, vai o símbolo de texto
  async function gerar(d) {
    try { await Promise.all(['700 72px Fredoka', '600 46px Fredoka', '700 34px Nunito', '800 40px Nunito'].map(f => document.fonts.load(f))); } catch (e) {}
    const imgs = await Promise.all(d.retratos.map(imagemDoRetrato));
    const linhas = d.linhas.slice(0, d.destaque ? 2 : 3);
    const simbolos = await Promise.all(linhas.map(m => carregar(m.src)));
    const cv = document.createElement('canvas'); cv.width = L; cv.height = A;
    const c = cv.getContext('2d');

    // a noite, com a luz do abajur
    c.fillStyle = COR.noite; c.fillRect(0, 0, L, A);
    let g = c.createRadialGradient(L / 2, -60, 40, L / 2, -60, 900);
    g.addColorStop(0, 'rgba(255, 207, 138, .45)'); g.addColorStop(1, 'rgba(255, 207, 138, 0)'); c.fillStyle = g; c.fillRect(0, 0, L, A);
    g = c.createRadialGradient(L * 0.9, A, 20, L * 0.9, A, 600);
    g.addColorStop(0, 'rgba(236, 143, 168, .18)'); g.addColorStop(1, 'rgba(236, 143, 168, 0)'); c.fillStyle = g; c.fillRect(0, 0, L, A);

    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillStyle = COR.luz; c.font = `700 72px ${TITULO}`; c.fillText('DICE DUEL', L / 2, 120);
    c.fillStyle = COR.textoSuave; c.font = `700 34px ${CORPO}`; c.fillText(caber(c, d.modo, 900), L / 2, 172);

    // a mesa: feltro com borda de madeira, um retrato de cada lado e o placar
    caixa(c, 60, 215, 960, 650, 56); c.fillStyle = COR.madeira; c.fill();
    caixa(c, 78, 233, 924, 614, 42);
    g = c.createLinearGradient(0, 233, 0, 847); g.addColorStop(0, COR.feltro2); g.addColorStop(1, COR.feltroEscuro); c.fillStyle = g; c.fill();
    const xs = [300, 780], y = 430, r = 124;
    for (const p of [0, 1]) {
      const x = xs[p], venceu = d.vencedor === p;
      c.beginPath(); c.arc(x, y, r + 14, 0, Math.PI * 2); c.fillStyle = venceu ? COR.mel : (p ? COR.rival : COR.voce); c.fill();
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = COR.papel2; c.fill();
      if (imgs[p]) { c.save(); c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.clip(); c.drawImage(imgs[p], x - r * 0.95, y - r * 0.95, r * 1.9, r * 1.9); c.restore(); }
      if (venceu) {
        caixa(c, x - 100, y + r - 4, 200, 54, 27); c.fillStyle = COR.mel; c.fill();
        c.fillStyle = COR.noite; c.font = `700 30px ${TITULO}`; c.fillText('VENCEU', x, y + r + 34);
      }
      c.fillStyle = COR.papel; c.font = `600 46px ${TITULO}`; c.fillText(caber(c, d.nomes[p], 400), x, 680);
      c.fillStyle = p ? COR.rival : COR.voce; c.font = `700 120px ${TITULO}`; c.fillText(String(d.pts[p]), x, 812);
    }
    c.fillStyle = COR.papel2; c.font = `700 64px ${TITULO}`; c.fillText('×', L / 2, 792);

    // o resultado e os melhores lances
    c.fillStyle = COR.texto; c.font = `700 76px ${TITULO}`; c.fillText(caber(c, d.titulo, 960), L / 2, 975);
    let yl = 1050;
    if (d.destaque) { c.fillStyle = COR.mel; c.font = `800 36px ${CORPO}`; c.fillText(caber(c, d.destaque, 940), L / 2, yl); yl += 58; }
    c.fillStyle = COR.textoSuave; c.font = `700 34px ${CORPO}`;
    linhas.forEach((m, i) => {
      const im = simbolos[i];
      if (!im) { c.fillText(caber(c, `${m.simbolo}  ${m.txt}`, 940), L / 2, yl); yl += 54; return; }
      const t = caber(c, m.txt, 880), w = c.measureText(t).width, x0 = L / 2 - (w + 58) / 2;
      c.drawImage(im, x0, yl - 38, 46, 46);
      c.textAlign = 'left'; c.fillText(t, x0 + 58, yl); c.textAlign = 'center';
      yl += 54;
    });

    // o convite
    c.fillStyle = COR.textoSuave; c.font = `700 34px ${CORPO}`; c.fillText('Bora um duelo?', L / 2, 1262);
    c.fillStyle = COR.luz; c.font = `800 40px ${CORPO}`; c.fillText(caber(c, d.endereco, 960), L / 2, 1312);

    return new Promise((ok, erro) => cv.toBlob(b => (b ? ok(b) : erro(new Error('Não deu para montar a imagem.'))), 'image/png'));
  }

  // o convite da sala: uma imagem quadrada (1080×1080) com quem convida, o código e o endereço
  // d: { nome, retrato, sala, meta, endereco }
  async function convite(d) {
    const T = 1080;
    try { await Promise.all(['700 72px Fredoka', '600 46px Fredoka', '700 34px Nunito', '800 40px Nunito'].map(f => document.fonts.load(f))); } catch (e) {}
    const im = await imagemDoRetrato(d.retrato);
    const cv = document.createElement('canvas'); cv.width = T; cv.height = T;
    const c = cv.getContext('2d');
    c.fillStyle = COR.noite; c.fillRect(0, 0, T, T);
    let g = c.createRadialGradient(T / 2, -60, 40, T / 2, -60, 860);
    g.addColorStop(0, 'rgba(255, 207, 138, .45)'); g.addColorStop(1, 'rgba(255, 207, 138, 0)'); c.fillStyle = g; c.fillRect(0, 0, T, T);
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillStyle = COR.luz; c.font = `700 72px ${TITULO}`; c.fillText('DICE DUEL', T / 2, 116);
    c.fillStyle = COR.textoSuave; c.font = `700 34px ${CORPO}`; c.fillText('convite para um duelo de dados', T / 2, 166);

    // a mesa: quem convida de um lado, a cadeira vazia do amigo do outro
    caixa(c, 60, 210, 960, 470, 56); c.fillStyle = COR.madeira; c.fill();
    caixa(c, 78, 228, 924, 434, 42);
    g = c.createLinearGradient(0, 228, 0, 662); g.addColorStop(0, COR.feltro2); g.addColorStop(1, COR.feltroEscuro); c.fillStyle = g; c.fill();
    const y = 400, r = 120;
    c.beginPath(); c.arc(300, y, r + 14, 0, Math.PI * 2); c.fillStyle = COR.voce; c.fill();
    c.beginPath(); c.arc(300, y, r, 0, Math.PI * 2); c.fillStyle = COR.papel2; c.fill();
    if (im) { c.save(); c.beginPath(); c.arc(300, y, r, 0, Math.PI * 2); c.clip(); c.drawImage(im, 300 - r * 0.95, y - r * 0.95, r * 1.9, r * 1.9); c.restore(); }
    c.save(); c.setLineDash([22, 16]); c.lineWidth = 10; c.strokeStyle = 'rgba(255, 243, 226, .55)';
    c.beginPath(); c.arc(780, y, r + 6, 0, Math.PI * 2); c.stroke(); c.restore();
    c.fillStyle = COR.texto; c.font = `700 150px ${TITULO}`; c.fillText('?', 780, y + 52);
    c.fillStyle = COR.papel2; c.font = `700 64px ${TITULO}`; c.fillText('×', T / 2, y + 22);
    c.fillStyle = COR.papel; c.font = `600 44px ${TITULO}`;
    c.fillText(caber(c, d.nome, 400), 300, 610); c.fillText('você', 780, 610);

    c.fillStyle = COR.texto; c.font = `700 64px ${TITULO}`; c.fillText(caber(c, `${d.nome} te chamou!`, 960), T / 2, 770);
    caixa(c, T / 2 - 250, 805, 500, 120, 30); c.fillStyle = COR.papel; c.fill();
    c.fillStyle = COR.noite; c.font = `800 30px ${CORPO}`; c.fillText('SALA', T / 2, 848);
    c.font = `700 64px ${TITULO}`; c.fillText(d.sala, T / 2, 908);
    c.fillStyle = COR.textoSuave; c.font = `700 32px ${CORPO}`; c.fillText(`meta ${d.meta} pontos · toque no link para entrar`, T / 2, 985);
    c.fillStyle = COR.luz; c.font = `800 38px ${CORPO}`; c.fillText(caber(c, d.endereco, 980), T / 2, 1040);
    return new Promise((ok, erro) => cv.toBlob(b => (b ? ok(b) : erro(new Error('Não deu para montar a imagem.'))), 'image/png'));
  }

  window.Cartao = { gerar, convite };
})();
