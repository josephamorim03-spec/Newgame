// Texturas desenhadas em código (sem imagens): tufo de capim, ramos de folhas e o leque do buriti.
// Em tons de cinza: a cor vem do material (e muda com a estação); o canal alfa recorta a forma.
import * as THREE from 'three';

function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function tex(canvas, repeat = false) { const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }

// tufo de capim: lâminas finas e curvas, escuras na base e claras na ponta (capim-nativo do Cerrado)
export function grassTexture(seed = 3, blades = 26, lean = 0.35) {
  const W = 128, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), R = rng(seed);
  for (let i = 0; i < blades; i++) {
    const x0 = W * (0.12 + 0.76 * R()), h = H * (0.45 + 0.55 * R()), bend = (R() - 0.5) * W * lean, w = 2.2 + R() * 2.6, lum = 150 + R() * 105;
    const gr = g.createLinearGradient(0, H, 0, H - h); gr.addColorStop(0, `rgb(${lum * 0.42},${lum * 0.45},${lum * 0.4})`); gr.addColorStop(1, `rgb(${lum},${lum},${lum * 0.92})`);
    g.fillStyle = gr; g.beginPath(); g.moveTo(x0 - w, H);
    g.quadraticCurveTo(x0 - w * 0.6 + bend * 0.3, H - h * 0.55, x0 + bend, H - h);
    g.quadraticCurveTo(x0 + w * 0.6 + bend * 0.3, H - h * 0.55, x0 + w, H); g.closePath(); g.fill();
  }
  return tex(c);
}

// ramo de folhas visto de perto: várias folhas elípticas e pontudas, com nervura, em volta de um centro
export function leafTexture(seed = 7, opts = {}) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), R = rng(seed);
  const n = opts.n || 46, size = opts.size || 22, round = opts.round || 0.45, spread = opts.spread || 0.42;
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * S * spread, x = S / 2 + Math.cos(a) * rr, y = S / 2 + Math.sin(a) * rr, rot = a + (R() - 0.5) * 1.2;
    const L = size * (0.7 + R() * 0.6), Wd = L * round, lum = 120 + R() * 135;
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = `rgb(${lum * 0.92},${lum},${lum * 0.86})`; g.beginPath(); g.moveTo(-L, 0); g.quadraticCurveTo(0, -Wd, L, 0); g.quadraticCurveTo(0, Wd, -L, 0); g.fill();
    g.strokeStyle = `rgba(0,0,0,0.18)`; g.lineWidth = 1; g.beginPath(); g.moveTo(-L * 0.9, 0); g.lineTo(L * 0.9, 0); g.stroke();
    g.restore();
  }
  // galhinhos finos ligando as folhas ao centro
  g.strokeStyle = 'rgba(70,55,40,0.9)'; g.lineWidth = 2; for (let i = 0; i < 7; i++) { const a = R() * 6.283, L = S * (0.2 + R() * 0.2); g.beginPath(); g.moveTo(S / 2, S / 2); g.lineTo(S / 2 + Math.cos(a) * L, S / 2 + Math.sin(a) * L); g.stroke(); }
  return tex(c);
}

// leque do buriti: folha em palmeira-leque, com segmentos estreitos que se abrem e as pontas caídas
export function fanTexture(seed = 11) {
  const W = 256, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), R = rng(seed);
  const cx = W / 2, cy = H * 0.94, segs = 46;
  for (let i = 0; i < segs; i++) {
    const a = Math.PI * (0.06 + 0.88 * i / (segs - 1)) + (R() - 0.5) * 0.04, L = H * (0.72 + R() * 0.2), droop = (R() * 0.25 + 0.1);
    const ex = cx + Math.cos(a) * L, ey = cy - Math.sin(a) * L, lum = 140 + R() * 110, w = 3 + R() * 2;
    g.strokeStyle = `rgb(${lum * 0.9},${lum},${lum * 0.8})`; g.lineWidth = w; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(cx + Math.cos(a) * L * 0.7, cy - Math.sin(a) * L * 0.7, ex, ey + L * droop * 0.4); g.stroke();
  }
  return tex(c);
}

// casca: estrias verticais e placas (cortiça do cerrado), em tons de cinza para tingir no material
export function barkTexture(seed = 5) {
  const W = 128, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), R = rng(seed);
  g.fillStyle = 'rgb(160,156,150)'; g.fillRect(0, 0, W, H);
  // placas de cortiça irregulares (casca grossa do cerrado), separadas por fendas mais escuras, sem anéis
  for (let i = 0; i < 260; i++) { const x = R() * W, y = R() * H, w = 6 + R() * 16, h = 10 + R() * 34, lum = 135 + R() * 70;
    g.fillStyle = `rgb(${lum},${lum * 0.97},${lum * 0.93})`; g.beginPath(); g.ellipse(x, y, w / 2, h / 2, (R() - 0.5) * 0.3, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(70,62,54,0.55)'; g.lineWidth = 1.5;
  for (let i = 0; i < 46; i++) { let x = R() * W, y = 0; g.beginPath(); g.moveTo(x, y); while (y < H) { y += 8 + R() * 14; x += (R() - 0.5) * 7; g.lineTo(x, y); } g.stroke(); }
  return tex(c, true);
}
