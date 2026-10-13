// Arte do jogo. Personagens: miniaturas 3D (FIGS) em cima de fundo da facção; feitiços: ilustrações chapadas (FLAT).
// img = quadro quadrado (cartas, faixa de info); token = recorte redondo no busto (avatar do topo, botão de poder, tela inicial).
const ART = (() => {
  const INK = "#2A1E16", cache = new Map();
  const fig = id => typeof FIGS !== "undefined" && FIGS.has(id) && FIGS.ok();
  function canvas(size) { const c = document.createElement("canvas"); c.width = c.height = size; return c; }
  function img(id, size) { const key = "i" + id + "@" + size; if (cache.has(key)) return cache.get(key); let c;
    if (fig(id)) { c = canvas(size); const k = c.getContext("2d"), bg = (FLAT.DEF[id] && FLAT.DEF[id].bg) || "#EFE7D6"; k.fillStyle = bg; k.fillRect(0, 0, size, size);
      const g = k.createRadialGradient(size / 2, size * 0.4, size * 0.1, size / 2, size * 0.5, size * 0.75); g.addColorStop(0, "rgba(255,255,255,0.55)"); g.addColorStop(1, "rgba(255,255,255,0)"); k.fillStyle = g; k.fillRect(0, 0, size, size);
      const sp = FIGS.sprite(id, 256, 320, 0), h = size * 1.32, w = h * 0.8; k.drawImage(sp, (size - w) / 2, -size * 0.12, w, h); }
    else c = FLAT.render(id, size) || canvas(size);
    cache.set(key, c); return c; }
  function token(id, size) { const key = "t" + id + "@" + size; if (cache.has(key)) return cache.get(key); const c = canvas(size), k = c.getContext("2d");
    k.beginPath(); k.arc(size / 2, size / 2, size / 2, 0, 7); k.clip();
    if (fig(id)) { const bg = (FLAT.DEF[id] && FLAT.DEF[id].bg) || "#EFE7D6"; k.fillStyle = bg; k.fillRect(0, 0, size, size); const sp = FIGS.sprite(id, 256, 320, 0), h = size * 1.9, w = h * 0.8; k.drawImage(sp, (size - w) / 2, -size * 0.32, w, h); }
    else { const D = FLAT.DEF[id], F = (D && D.focus) || [50, 50, 1.1], src = FLAT.render(id, Math.round(size * F[2])), S = src.width, w = S / F[2]; k.drawImage(src, Math.max(0, F[0] / 100 * S - w / 2), Math.max(0, F[1] / 100 * S - w / 2), w, w, 0, 0, size, size); }
    cache.set(key, c); return c; }
  return { INK, img, token };
})();
