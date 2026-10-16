// Colisão no chão do vale, vista de cima (2D): casas, capela, venda, poço, coreto, cercas, troncos de árvore, cupinzeiros e
// pedras grandes são círculos, caixas giradas e segmentos com espessura. Quem anda (gente e bicho) desvia antes de bater
// (olha um passo à frente e vira para o lado livre) e, se encostar, escorrega pela parede em vez de atravessar.
// Uma grade de 4 m guarda o que há em cada canto para a consulta ser rápida.
export function buildColisao() {
  const CELL = 4, grid = new Map(), key = (i, j) => i * 100003 + j;
  function insert(s, x0, z0, x1, z1) { for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++) for (let j = Math.floor(z0 / CELL); j <= Math.floor(z1 / CELL); j++) { const k = key(i, j); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(s); } }
  const circle = (x, z, r, tag) => insert({ t: 0, x, z, r, tag }, x - r, z - r, x + r, z + r);
  // caixa de largura w (no x local) e fundo d (no z local), girada como os objetos do three (rotation.y = rot)
  const box = (x, z, w, d, rot, tag) => { const R = Math.hypot(w, d) / 2; insert({ t: 1, x, z, hw: w / 2, hd: d / 2, c: Math.cos(rot), s: Math.sin(rot), tag }, x - R, z - R, x + R, z + R); };
  const seg = (ax, az, bx, bz, r, tag) => insert({ t: 2, ax, az, bx, bz, r, tag }, Math.min(ax, bx) - r, Math.min(az, bz) - r, Math.max(ax, bx) + r, Math.max(az, bz) + r);
  // anel de cerca (curral, horta, aprisco) com uma porteira de `gate` metros no meio do lado da frente
  function fence(x, z, w, d, rot, gate = 0, r = 0.08) { const c = Math.cos(rot), s = Math.sin(rot), P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    const A = P(-w / 2, -d / 2), B = P(w / 2, -d / 2), C = P(w / 2, d / 2), D = P(-w / 2, d / 2); seg(...A, ...B, r); seg(...B, ...C, r); seg(...D, ...A, r);
    if (gate > 0) { const g1 = P(-gate / 2, d / 2), g2 = P(gate / 2, d / 2); seg(...C, ...g2, r); seg(...g1, ...D, r); } else seg(...C, ...D, r); }
  // distância (com sinal, negativa dentro) do ponto à forma e a direção para sair
  function sd(sh, x, z) {
    if (sh.t === 0) { const dx = x - sh.x, dz = z - sh.z, l = Math.hypot(dx, dz) || 1e-6; return [l - sh.r, dx / l, dz / l]; }
    if (sh.t === 1) { const dx = x - sh.x, dz = z - sh.z, u = dx * sh.c - dz * sh.s, v = dx * sh.s + dz * sh.c, qx = Math.abs(u) - sh.hw, qz = Math.abs(v) - sh.hd;
      let nu, nv, dist; if (qx > 0 || qz > 0) { const ox = Math.max(qx, 0), oz = Math.max(qz, 0); dist = Math.hypot(ox, oz); nu = ox * Math.sign(u); nv = oz * Math.sign(v); const l = Math.hypot(nu, nv) || 1; nu /= l; nv /= l; }
      else if (qx > qz) { dist = qx; nu = Math.sign(u); nv = 0; } else { dist = qz; nu = 0; nv = Math.sign(v); }
      return [dist, nu * sh.c + nv * sh.s, -nu * sh.s + nv * sh.c]; }
    const vx = sh.bx - sh.ax, vz = sh.bz - sh.az, t = Math.max(0, Math.min(1, ((x - sh.ax) * vx + (z - sh.az) * vz) / (vx * vx + vz * vz || 1))), px = sh.ax + vx * t, pz = sh.az + vz * t, dx = x - px, dz = z - pz, l = Math.hypot(dx, dz) || 1e-6;
    return [l - sh.r, dx / l, dz / l]; }
  const near = (x, z) => grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL))) || [];
  // livre para um corpo de raio r?  (ignore: forma que não conta, p. ex. o próprio posto de trabalho)
  function free(x, z, r, ignore) { for (const sh of near(x, z)) { if (ignore && ignore(sh)) continue; if (sd(sh, x, z)[0] < r) return false; } return true; }
  // empurra para fora de tudo que encosta; devolve [x, z, bateu]
  function push(x, z, r, ignore) { let hit = false; for (let it = 0; it < 3; it++) { let moved = false;
      for (const sh of near(x, z)) { if (ignore && ignore(sh)) continue; const [d, nx, nz] = sd(sh, x, z); if (d < r) { x += nx * (r - d + 1e-3); z += nz * (r - d + 1e-3); moved = hit = true; } }
      if (!moved) break; } return [x, z, hit]; }
  // desvio: se um passo à frente está tomado, procura o rumo livre mais perto do desejado (alternando os lados)
  function steer(x, z, h, r, look = 1.0, ignore) { const ok = a => free(x + Math.sin(a) * look, z + Math.cos(a) * look, r, ignore) && free(x + Math.sin(a) * look * 0.5, z + Math.cos(a) * look * 0.5, r, ignore);
    if (ok(h)) return h; for (let k = 1; k <= 6; k++) for (const s of [1, -1]) { const a = h + s * k * 0.35; if (ok(a)) return a; } return h; }
  return { circle, box, seg, fence, free, push, steer, sd, count: () => grid.size };
}
