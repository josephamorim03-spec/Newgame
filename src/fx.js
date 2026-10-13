// FX — efeitos do personagem sobre o canvas 2D. O sprite 3D continua estático.
// Esta etapa habilita só a Mula: fogo, brilho e poeira. Pool único de 120 partículas.
const FX = (() => {
  const CAP = 120, OWNERS = 40;
  const pool = Array.from({ length: CAP }, () => ({ live: false, owner: null, kind: 0, point: 0, x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 1, size: 1, phase: 0 }));
  const emitters = Array.from({ length: OWNERS }, () => ({ key: null, anchors: null, x: 0, y: 0, w: 0, h: 0, alpha: 1, stamp: 0, carry: 0 }));
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = motion.matches, time = 0, step = 0, stamp = 0, cursor = 0;
  function clear() { for (let i = 0; i < CAP; i++) pool[i].live = false; for (let i = 0; i < OWNERS; i++) { emitters[i].key = null; emitters[i].carry = 0; } }
  motion.addEventListener("change", e => { reduced = e.matches; clear(); });
  function drop(e) { for (let i = 0; i < CAP; i++) if (pool[i].owner === e) pool[i].live = false; e.key = null; e.carry = 0; }
  function frame(dt, active) {
    stamp++; step = active && !document.hidden ? Math.min(0.05, Math.max(0, dt)) : 0; time += step;
    for (let i = 0; i < OWNERS; i++) if (emitters[i].key !== null && emitters[i].stamp < stamp - 1) drop(emitters[i]);
    if (reduced || !step) return;
    for (let i = 0; i < CAP; i++) { const p = pool[i]; if (!p.live) continue;
      p.age += step; if (p.age >= p.life) { p.live = false; continue; }
      p.x += p.vx * step; p.y += p.vy * step;
      if (p.kind === 3) p.vx *= 1 - step * 3;
    }
  }
  function owner(key) { let free = null;
    for (let i = 0; i < OWNERS; i++) { const e = emitters[i]; if (e.key === key) return e; if (e.key === null && !free) free = e; }
    if (free) { free.key = key; free.carry = 0; } return free;
  }
  function particle(e, kind, point) {
    // Não sobrescreve partículas vivas e não cria objetos durante os quadros.
    for (let i = 0; i < CAP; i++) { const p = pool[cursor]; cursor = (cursor + 1) % CAP; if (p.live) continue;
      p.live = true; p.owner = e; p.kind = kind; p.point = point; p.age = 0; p.phase = Math.random() * Math.PI * 2;
      if (kind === 3) {
        const a = e.anchors.dust[0]; p.x = e.x + a[0] * e.w / 256; p.y = e.y + a[1] * e.h / 320;
        p.vx = (Math.random() - 0.5) * e.h * 0.30; p.vy = -e.h * (0.025 + Math.random() * 0.035);
        p.life = 0.35 + Math.random() * 0.20; p.size = e.h * (0.009 + Math.random() * 0.006);
      } else {
        p.x = (Math.random() - 0.5) * 7; p.y = 0; p.vx = (Math.random() - 0.5) * 10; p.vy = kind === 2 ? -48 : -32;
        p.life = kind === 2 ? 0.45 + Math.random() * 0.22 : 0.20 + Math.random() * 0.18;
        p.size = kind === 2 ? 1.6 : 4 + Math.random() * 3;
      }
      return;
    }
  }
  function dust(key) { if (reduced || document.hidden) return;
    for (let i = 0; i < OWNERS; i++) { const e = emitters[i]; if (e.key !== key || !e.anchors.dust) continue;
      for (let j = 0; j < 5; j++) particle(e, 3, 0); return;
    }
  }
  function paint(k, key, anchors, x, y, w, h, alpha, baseY) {
    if (!anchors.fire) return; const e = owner(key); if (!e) return;
    e.anchors = anchors; e.x = x; e.y = y; e.w = w; e.h = h; e.alpha = alpha; e.stamp = stamp;
    if (!reduced && step) {
      e.carry += step; let count = 0;
      for (let i = 0; i < CAP; i++) if (pool[i].live && pool[i].owner === e && pool[i].kind !== 3) count++;
      // Máximo 12 chamas/brasas por boneco: várias Mulas compartilham o pool.
      while (e.carry >= 0.045) { e.carry -= 0.045; if (count >= 12) continue;
        particle(e, Math.random() < 0.22 ? 2 : 1, Math.floor(Math.random() * anchors.fire.length)); count++;
      }
    }
    k.save();
    // Números são desenhados DEPOIS. Fogo/brilho também ficam acima da base.
    k.beginPath(); k.rect(x - w * 0.25, y - h * 0.12, w * 1.5, Math.max(0, baseY - y - h * 0.10)); k.clip();
    const scale = h / 320, pulse = reduced ? 1 : 0.85 + Math.sin(time * 5 + key) * 0.15;
    for (let i = 0; i < anchors.glow.length; i++) { const a = anchors.glow[i];
      k.globalAlpha = alpha * 0.19 * pulse; k.fillStyle = "#F59A23"; k.beginPath(); k.arc(x + a[0] * scale, y + a[1] * scale, 13 * scale, 0, Math.PI * 2); k.fill();
      k.globalAlpha = alpha * 0.26 * pulse; k.fillStyle = "#FFE45C"; k.beginPath(); k.arc(x + a[0] * scale, y + a[1] * scale, 7 * scale, 0, Math.PI * 2); k.fill();
    }
    if (!reduced) for (let i = 0; i < CAP; i++) { const p = pool[i]; if (!p.live || p.owner !== e || p.kind === 3) continue;
      const q = p.age / p.life, a = anchors.fire[p.point], px = x + (a[0] + p.x + Math.sin(p.phase + q * 5) * 2) * scale, py = y + (a[1] + p.y) * scale, r = p.size * scale * (1 - q * 0.75);
      k.globalAlpha = alpha * (1 - q) * (p.kind === 2 ? 0.85 : 0.72);
      k.fillStyle = p.kind === 2 || q < 0.3 ? "#FFE45C" : q < 0.7 ? "#F59A23" : "#E23B2E";
      k.beginPath();
      if (p.kind === 2) k.arc(px, py, r, 0, Math.PI * 2);
      else { k.moveTo(px, py + r); k.bezierCurveTo(px - r * 1.2, py, px - r * 0.5, py - r, px + Math.sin(p.phase) * r * 0.7, py - r * 2.3); k.bezierCurveTo(px + r, py - r, px + r, py, px, py + r); }
      k.fill();
    }
    k.restore();
    // Poeira permanece no ponto da passada; não acompanha o pescoço nem cobre texto.
    if (!reduced) { k.save(); for (let i = 0; i < CAP; i++) { const p = pool[i]; if (!p.live || p.owner !== e || p.kind !== 3) continue;
        const q = p.age / p.life; k.globalAlpha = alpha * (1 - q) * 0.32; k.fillStyle = "#9F8965"; k.beginPath(); k.ellipse(p.x, p.y, p.size * (1 + q), p.size * (0.5 + q * 0.5), 0, 0, Math.PI * 2); k.fill(); }
      k.restore(); }
  }
  // Diagnóstico sob demanda, nunca chamado pelo loop de desenho.
  function stats() { let alive = 0, owners = 0; for (let i = 0; i < CAP; i++) if (pool[i].live) alive++; for (let i = 0; i < OWNERS; i++) if (emitters[i].key !== null) owners++;
    return { capacity: CAP, alive, owners, reduced, time }; }
  return { frame, paint, dust, clear, stats };
})();
