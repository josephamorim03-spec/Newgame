// FX — efeitos dos personagens sobre o canvas 2D. O sprite 3D continua estático; as partículas nascem nas âncoras
// de FIGS.anchors(id, dir) (coordenadas da imagem 256×320). Pool único de 120 partículas, sem alocar nada por quadro.
// Tipos de âncora: fire (chamas + brasas), smoke (fumaça), notes (notas musicais), glow (brilho quente),
// eyes (olhos em brasa pulsando), spirit (cintilação), dust (poeira ao andar).
const FX = (() => {
  const CAP = 120, OWNERS = 40, FLAME = 1, EMBER = 2, DUST = 3, SMOKE = 4, NOTE = 5;
  const pool = Array.from({ length: CAP }, () => ({ live: false, owner: null, kind: 0, point: 0, x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 1, size: 1, phase: 0 }));
  const emitters = Array.from({ length: OWNERS }, () => ({ key: null, anchors: null, x: 0, y: 0, w: 0, h: 0, alpha: 1, stamp: 0, fire: 0, smoke: 0, note: 0 }));
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = motion.matches, time = 0, step = 0, stamp = 0, cursor = 0;
  function clear() { for (let i = 0; i < CAP; i++) pool[i].live = false; for (let i = 0; i < OWNERS; i++) { const e = emitters[i]; e.key = null; e.fire = e.smoke = e.note = 0; } }
  motion.addEventListener("change", e => { reduced = e.matches; clear(); });
  function drop(e) { for (let i = 0; i < CAP; i++) if (pool[i].owner === e) pool[i].live = false; e.key = null; e.fire = e.smoke = e.note = 0; }
  function frame(dt, active) {
    stamp++; step = active && !document.hidden ? Math.min(0.05, Math.max(0, dt)) : 0; time += step;
    for (let i = 0; i < OWNERS; i++) if (emitters[i].key !== null && emitters[i].stamp < stamp - 1) drop(emitters[i]);
    if (reduced || !step) return;
    for (let i = 0; i < CAP; i++) { const p = pool[i]; if (!p.live) continue;
      p.age += step; if (p.age >= p.life) { p.live = false; continue; }
      p.x += p.vx * step; p.y += p.vy * step;
      if (p.kind === DUST) p.vx *= 1 - step * 3; else if (p.kind === SMOKE) { p.vy *= 1 - step * 0.6; p.vx += Math.sin(time * 2 + p.phase) * step * 6; }
    }
  }
  function owner(key) { let free = null;
    for (let i = 0; i < OWNERS; i++) { const e = emitters[i]; if (e.key === key) return e; if (e.key === null && !free) free = e; }
    if (free) { free.key = key; free.fire = free.smoke = free.note = 0; } return free;
  }
  function count(e, kinds) { let n = 0; for (let i = 0; i < CAP; i++) { const p = pool[i]; if (p.live && p.owner === e && (kinds === p.kind || (kinds === FLAME && p.kind === EMBER))) n++; } return n; }
  function particle(e, kind, point) {
    // Não sobrescreve partículas vivas e não cria objetos durante os quadros.
    for (let i = 0; i < CAP; i++) { const p = pool[cursor]; cursor = (cursor + 1) % CAP; if (p.live) continue;
      p.live = true; p.owner = e; p.kind = kind; p.point = point; p.age = 0; p.phase = Math.random() * Math.PI * 2;
      if (kind === DUST) {
        const a = e.anchors.dust[0]; p.x = e.x + a[0] * e.w / 256; p.y = e.y + a[1] * e.h / 320;
        p.vx = (Math.random() - 0.5) * e.h * 0.30; p.vy = -e.h * (0.025 + Math.random() * 0.035);
        p.life = 0.35 + Math.random() * 0.20; p.size = e.h * (0.009 + Math.random() * 0.006);
      } else if (kind === SMOKE) {
        p.x = (Math.random() - 0.5) * 3; p.y = 0; p.vx = 6 + Math.random() * 8; p.vy = -48 - Math.random() * 16; p.life = 1.2 + Math.random() * 0.5; p.size = 7 + Math.random() * 3;
      } else if (kind === NOTE) {
        p.x = (Math.random() - 0.5) * 10; p.y = 0; p.vx = (Math.random() - 0.5) * 24; p.vy = -60; p.life = 1.6; p.size = 34 + Math.random() * 8;
      } else {
        p.x = (Math.random() - 0.5) * 7; p.y = 0; p.vx = (Math.random() - 0.5) * 10; p.vy = kind === EMBER ? -48 : -32;
        p.life = kind === EMBER ? 0.45 + Math.random() * 0.22 : 0.20 + Math.random() * 0.18;
        p.size = kind === EMBER ? 1.6 : 4 + Math.random() * 3;
      }
      return;
    }
  }
  function dust(key) { if (reduced || document.hidden) return;
    for (let i = 0; i < OWNERS; i++) { const e = emitters[i]; if (e.key !== key || !e.anchors || !e.anchors.dust) continue;
      for (let j = 0; j < 5; j++) particle(e, DUST, 0); return;
    }
  }
  // emite enquanto o acumulador permitir, respeitando o teto por boneco (vários bonecos dividem o pool)
  function emit(e, field, every, cap, kind, list) { if (!list) return; e[field] += step; let n = -1;
    while (e[field] >= every) { e[field] -= every; if (n < 0) n = count(e, kind === EMBER ? FLAME : kind); if (n >= cap) continue;
      particle(e, kind === FLAME && Math.random() < 0.22 ? EMBER : kind, Math.floor(Math.random() * list.length)); n++; } }
  function paint(k, key, anchors, x, y, w, h, alpha, baseY) {
    const e = owner(key); if (!e) return;
    e.anchors = anchors; e.x = x; e.y = y; e.w = w; e.h = h; e.alpha = alpha; e.stamp = stamp;
    if (!reduced && step) { emit(e, "fire", 0.045, 12, FLAME, anchors.fire); emit(e, "smoke", 0.16, 7, SMOKE, anchors.smoke); emit(e, "note", 0.85, 2, NOTE, anchors.notes); }
    const scale = h / 320, A = (list, i) => [x + list[i][0] * scale, y + list[i][1] * scale];
    k.save();
    // Números são desenhados DEPOIS. Os efeitos ficam acima da base do boneco.
    k.beginPath(); k.rect(x - w * 0.4, y - h * 0.4, w * 1.8, Math.max(0, baseY - y + h * 0.3 - h * 0.10)); k.clip();
    const pulse = reduced ? 1 : 0.85 + Math.sin(time * 5 + key) * 0.15;
    if (anchors.glow) for (let i = 0; i < anchors.glow.length; i++) { const [gx, gy] = A(anchors.glow, i);
      k.globalAlpha = alpha * 0.19 * pulse; k.fillStyle = "#F59A23"; k.beginPath(); k.arc(gx, gy, 13 * scale, 0, Math.PI * 2); k.fill();
      k.globalAlpha = alpha * 0.26 * pulse; k.fillStyle = "#FFE45C"; k.beginPath(); k.arc(gx, gy, 7 * scale, 0, Math.PI * 2); k.fill(); }
    if (anchors.eyes) { const ep = reduced ? 1 : 0.6 + 0.4 * Math.sin(time * 3.2 + key * 1.7);
      for (let i = 0; i < anchors.eyes.length; i++) { const [gx, gy] = A(anchors.eyes, i);
        k.globalAlpha = alpha * 0.22 * ep; k.fillStyle = "#FF3B2A"; k.beginPath(); k.arc(gx, gy, 11 * scale, 0, Math.PI * 2); k.fill();
        k.globalAlpha = alpha * 0.5 * ep; k.fillStyle = "#FF8A5C"; k.beginPath(); k.arc(gx, gy, 4.5 * scale, 0, Math.PI * 2); k.fill(); } }
    if (anchors.spirit) for (let i = 0; i < anchors.spirit.length; i++) { const [gx, gy] = A(anchors.spirit, i), tw = reduced ? 0.7 : Math.max(0, Math.sin(time * 2.6 + i * 1.9 + key)), r = (3 + tw * 5) * scale;
      k.globalAlpha = alpha * (0.25 + tw * 0.65); k.fillStyle = "#FFF3B0"; k.beginPath(); k.moveTo(gx, gy - r * 1.6); k.lineTo(gx + r * 0.35, gy - r * 0.35); k.lineTo(gx + r * 1.6, gy); k.lineTo(gx + r * 0.35, gy + r * 0.35);
      k.lineTo(gx, gy + r * 1.6); k.lineTo(gx - r * 0.35, gy + r * 0.35); k.lineTo(gx - r * 1.6, gy); k.lineTo(gx - r * 0.35, gy - r * 0.35); k.closePath(); k.fill(); }
    if (!reduced) for (let i = 0; i < CAP; i++) { const p = pool[i]; if (!p.live || p.owner !== e || p.kind === DUST) continue;
      const q = p.age / p.life;
      if (p.kind === SMOKE) { const a = anchors.smoke && anchors.smoke[p.point]; if (!a) continue; const px = x + (a[0] + p.x) * scale, py = y + (a[1] + p.y) * scale, r = p.size * scale * (1 + q * 1.9);
        k.globalAlpha = alpha * (q < 0.12 ? q / 0.12 : 1) * (1 - q) * 0.75; k.fillStyle = q < 0.35 ? "#E9E3DA" : "#B9B1A6"; k.beginPath(); k.arc(px, py, r, 0, Math.PI * 2); k.fill();
        k.globalAlpha *= 0.5; k.strokeStyle = "#8C8377"; k.lineWidth = Math.max(0.6, scale); k.stroke(); continue; }
      if (p.kind === NOTE) { const a = anchors.notes && anchors.notes[p.point]; if (!a) continue; const px = x + (a[0] + p.x + Math.sin(p.phase + q * 6) * 9) * scale, py = y + (a[1] + p.y) * scale;
        k.globalAlpha = alpha * (q < 0.15 ? q / 0.15 : 1) * (1 - q); k.fillStyle = "#3E2A1E"; k.font = `${Math.round(p.size * scale)}px serif`; k.textAlign = "center"; k.textBaseline = "middle"; k.fillText(p.phase > Math.PI ? "♪" : "♫", px, py); continue; }
      const a = anchors.fire && anchors.fire[p.point]; if (!a) continue;
      const px = x + (a[0] + p.x + Math.sin(p.phase + q * 5) * 2) * scale, py = y + (a[1] + p.y) * scale, r = p.size * scale * (1 - q * 0.75);
      k.globalAlpha = alpha * (1 - q) * (p.kind === EMBER ? 0.85 : 0.72);
      k.fillStyle = p.kind === EMBER || q < 0.3 ? "#FFE45C" : q < 0.7 ? "#F59A23" : "#E23B2E";
      k.beginPath();
      if (p.kind === EMBER) k.arc(px, py, r, 0, Math.PI * 2);
      else { k.moveTo(px, py + r); k.bezierCurveTo(px - r * 1.2, py, px - r * 0.5, py - r, px + Math.sin(p.phase) * r * 0.7, py - r * 2.3); k.bezierCurveTo(px + r, py - r, px + r, py, px, py + r); }
      k.fill();
    }
    k.restore();
    // Poeira permanece no ponto da passada; não acompanha o corpo nem cobre texto.
    if (!reduced) { k.save(); for (let i = 0; i < CAP; i++) { const p = pool[i]; if (!p.live || p.owner !== e || p.kind !== DUST) continue;
        const q = p.age / p.life; k.globalAlpha = alpha * (1 - q) * 0.32; k.fillStyle = "#9F8965"; k.beginPath(); k.ellipse(p.x, p.y, p.size * (1 + q), p.size * (0.5 + q * 0.5), 0, 0, Math.PI * 2); k.fill(); }
      k.restore(); }
  }
  // Diagnóstico sob demanda, nunca chamado pelo loop de desenho.
  function stats() { let alive = 0, owners = 0; for (let i = 0; i < CAP; i++) if (pool[i].live) alive++; for (let i = 0; i < OWNERS; i++) if (emitters[i].key !== null) owners++;
    return { capacity: CAP, alive, owners, reduced, time }; }
  return { frame, paint, dust, clear, stats };
})();
