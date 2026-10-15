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

// terra de cupinzeiro: torrões de argila laterítica (laranja-avermelhada) com grãos, canais de chuva escorrendo e crosta mais clara
export function earthTexture(seed = 17) {
  const W = 256, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), R = rng(seed);
  g.fillStyle = 'rgb(190,182,172)'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) { const x = R() * W, y = R() * H, r = 2 + R() * 7, lum = 150 + R() * 100;     // torrões
    g.fillStyle = `rgb(${lum},${lum * 0.96},${lum * 0.92})`; g.beginPath(); g.ellipse(x, y, r, r * (0.6 + R() * 0.5), R() * 3, 0, 7); g.fill();
    g.fillStyle = 'rgba(60,50,45,0.25)'; g.beginPath(); g.ellipse(x + r * 0.3, y + r * 0.35, r * 0.8, r * 0.4, 0, 0, 7); g.fill(); }
  for (let i = 0; i < 3000; i++) { const l = R() < 0.5 ? 70 : 245; g.fillStyle = `rgba(${l},${l},${l},0.5)`; g.fillRect(R() * W, R() * H, 1.4, 1.4); }   // grãos
  g.strokeStyle = 'rgba(70,58,50,0.35)'; g.lineWidth = 2;                                                    // canais de chuva
  for (let i = 0; i < 22; i++) { let x = R() * W, y = R() * H * 0.3; g.beginPath(); g.moveTo(x, y); while (y < H) { y += 6 + R() * 10; x += (R() - 0.5) * 5; g.lineTo(x, y); } g.stroke(); }
  return tex(c, true);
}

// pedra de quartzito do cerrado: bege acinzentada, salpicada, com veios e manchas de líquen
export function stoneTexture(seed = 23) {
  const W = 256, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), R = rng(seed);
  g.fillStyle = 'rgb(200,196,186)'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 160; i++) { const x = R() * W, y = R() * H, r = 8 + R() * 30, lum = 165 + R() * 70;
    g.fillStyle = `rgba(${lum},${lum * 0.98},${lum * 0.93},0.5)`; g.beginPath(); g.ellipse(x, y, r, r * 0.6, R() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 5000; i++) { const l = R() < 0.6 ? 110 + R() * 40 : 240; g.fillStyle = `rgba(${l},${l},${l * 0.95},0.55)`; g.fillRect(R() * W, R() * H, 1.2, 1.2); }
  g.lineWidth = 1.2; for (let i = 0; i < 9; i++) { g.strokeStyle = R() < 0.5 ? 'rgba(90,85,80,0.45)' : 'rgba(250,248,240,0.6)'; let x = R() * W, y = R() * H; g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 8; k++) { x += (R() - 0.3) * 30; y += (R() - 0.5) * 18; g.lineTo(x, y); } g.stroke(); }
  for (let i = 0; i < 26; i++) { const x = R() * W, y = R() * H, r = 3 + R() * 9;                        // líquen
    g.fillStyle = R() < 0.6 ? 'rgba(225,215,150,0.75)' : 'rgba(150,165,120,0.7)'; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(x + (R() - 0.5) * r * 1.6, y + (R() - 0.5) * r * 1.6, r * (0.3 + R() * 0.4), 0, 7); g.fill(); } }
  return tex(c, true);
}

// reboco caiado sobre adobe (cobre 5 m de parede): várias demãos de cal com manchas, grão fino, fissuras finas e,
// aqui e ali, um pedaço onde o reboco caiu e aparecem os tijolos de adobe vermelhos com a argamassa
export function plasterTexture(seed = 31) {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), R = rng(seed);
  g.fillStyle = 'rgb(238,233,224)'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 140; i++) { const x = R() * S, y = R() * S, r = 14 + R() * 70, l = 212 + R() * 40, w = R() < 0.3 ? 0.92 : 1;
    g.fillStyle = `rgba(${l},${l * 0.985},${l * 0.95 * w},0.28)`; g.beginPath(); g.ellipse(x, y, r, r * (0.4 + R() * 0.5), R() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 9000; i++) { const l = 190 + R() * 65; g.fillStyle = `rgba(${l},${l * 0.98},${l * 0.95},0.28)`; g.fillRect(R() * S, R() * S, 1.6, 1.6); }
  // escorridos de chuva: faixas verticais acinzentadas descendo do alto
  for (let i = 0; i < 26; i++) { const x = R() * S, w = 3 + R() * 10, h = 60 + R() * 200, y0 = R() * S * 0.3;
    const gr = g.createLinearGradient(0, y0, 0, y0 + h); gr.addColorStop(0, 'rgba(120,112,100,0.16)'); gr.addColorStop(1, 'rgba(120,112,100,0)'); g.fillStyle = gr; g.fillRect(x, y0, w, h); }
  // pedaços sem reboco: adobe
  for (let i = 0; i < 2; i++) { const cx = 40 + R() * (S - 80), cy = 60 + R() * (S - 160), rx = 14 + R() * 16, ry = 9 + R() * 9, pts = [];
    for (let k = 0; k < 14; k++) { const a = k / 14 * 6.283, rr = 0.7 + R() * 0.5; pts.push([cx + Math.cos(a) * rx * rr, cy + Math.sin(a) * ry * rr]); }
    const path = () => { g.beginPath(); g.moveTo(...pts[0]); for (const p of pts) g.lineTo(...p); g.closePath(); };
    g.save(); path(); g.fillStyle = 'rgb(150,130,112)'; g.fill(); g.clip();
    for (let y = cy - ry * 1.3; y < cy + ry * 1.3; y += 11) for (let x = cx - rx * 1.4 + ((y / 11) % 2) * 12; x < cx + rx * 1.4; x += 24) {
      const l = 0.85 + R() * 0.3; g.fillStyle = `rgb(${178 * l},${98 * l},${70 * l})`; g.fillRect(x + 1.5, y + 1.5, 21, 8); }
    g.restore(); path(); g.strokeStyle = 'rgba(90,80,70,0.55)'; g.lineWidth = 2.5; g.stroke(); g.strokeStyle = 'rgba(255,255,250,0.6)'; g.lineWidth = 1; g.stroke(); }
  g.strokeStyle = 'rgba(120,112,104,0.35)'; g.lineWidth = 1; for (let i = 0; i < 10; i++) { let x = R() * S, y = R() * S; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (R() - 0.5) * 30; y += R() * 22; g.lineTo(x, y); } g.stroke(); }
  return tex(c, true);
}
// cortina de chita (florzinhas sobre fundo colorido), para as janelas
export function chitaTexture(seed = 43, base = '#c8382a') {
  const S = 64, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), R = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 40; i++) { const x = R() * S, y = R() * S; g.fillStyle = R() < 0.5 ? '#f4e8c8' : '#2a6a3a'; for (let k = 0; k < 5; k++) { const a = k * 1.256; g.beginPath(); g.arc(x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2, 1.5, 0, 7); g.fill(); } g.fillStyle = '#f2c21a'; g.beginPath(); g.arc(x, y, 1.2, 0, 7); g.fill(); }
  for (let x = 0; x < S; x += 8) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x, 0, 3, S); }   // pregas
  return tex(c, true);
}
// telha colonial (capa e canal): fileiras de telhas curvas, cada uma com seu tom, sombra embaixo e brilho em cima
export function roofTexture(seed = 37) {
  const W = 256, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), R = rng(seed), cols = 8, rows = 6, tw = W / cols, th = H / rows;
  g.fillStyle = 'rgb(120,110,104)'; g.fillRect(0, 0, W, H);
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) { const x = k * tw, y = r * th, l = 175 + R() * 70;
    const gr = g.createLinearGradient(x, 0, x + tw, 0); gr.addColorStop(0, `rgb(${l * 0.62},${l * 0.6},${l * 0.58})`); gr.addColorStop(0.45, `rgb(${l},${l * 0.97},${l * 0.94})`); gr.addColorStop(1, `rgb(${l * 0.6},${l * 0.58},${l * 0.56})`);
    g.fillStyle = gr; g.beginPath(); g.moveTo(x + 2, y + th + 3); g.lineTo(x + 3, y + 1); g.quadraticCurveTo(x + tw / 2, y - 3, x + tw - 3, y + 1); g.lineTo(x + tw - 2, y + th + 3); g.closePath(); g.fill();
    g.fillStyle = 'rgba(40,30,25,0.35)'; g.fillRect(x + 2, y + th - 4, tw - 4, 4);
    if (R() < 0.25) { g.fillStyle = `rgba(${R() < 0.5 ? '60,70,40' : '30,30,30'},0.25)`; g.beginPath(); g.ellipse(x + tw / 2, y + th * 0.7, tw * 0.3, th * 0.25, 0, 0, 7); g.fill(); } }
  return tex(c, true);
}
// madeira de cerca e de tábua: veios compridos e nós, cinza-amarronzada do tempo
export function plankTexture(seed = 41) {
  const W = 64, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), R = rng(seed);
  g.fillStyle = 'rgb(200,192,182)'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) { const x = R() * W, l = 140 + R() * 90; g.strokeStyle = `rgba(${l},${l * 0.96},${l * 0.9},0.6)`; g.lineWidth = 1 + R() * 2; g.beginPath(); g.moveTo(x, 0);
    for (let y = 0; y <= H; y += 16) g.lineTo(x + Math.sin(y * 0.03 + i) * 2 + (R() - 0.5), y); g.stroke(); }
  for (let i = 0; i < 4; i++) { const x = R() * W, y = R() * H; g.fillStyle = 'rgba(90,75,60,0.6)'; g.beginPath(); g.ellipse(x, y, 3, 6, 0, 0, 7); g.fill(); }
  return tex(c, true);
}

// xadrez de camisa de roça: listras cruzadas de duas cores sobre um fundo
export function xadrezTexture(base = '#b83a2a', a = '#1e1a18', b = '#f0e8d8', seed = 47) {
  const S = 64, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  g.globalAlpha = 0.55; g.fillStyle = a; for (let i = 0; i < S; i += 16) { g.fillRect(i, 0, 6, S); g.fillRect(0, i, S, 6); }
  g.globalAlpha = 0.5; g.fillStyle = b; for (let i = 8; i < S; i += 16) { g.fillRect(i + 1, 0, 2, S); g.fillRect(0, i + 1, S, 2); }
  g.globalAlpha = 1; return tex(c, true);
}
// brim de calça (jeans) e tecido liso com trama, em tons de cinza para tingir
export function tramaTexture(seed = 53) {
  const S = 64, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), R = rng(seed);
  g.fillStyle = 'rgb(220,220,220)'; g.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 2) for (let x = 0; x < S; x += 2) { const l = 190 + R() * 60; g.fillStyle = `rgb(${l},${l},${l})`; g.fillRect(x + ((y / 2) % 2), y, 1.5, 1.5); }
  return tex(c, true);
}
