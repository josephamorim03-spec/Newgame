// ENTALHE — motor 4 de xilogravura.
// 1) desenho vetorial com curvas (Catmull-Rom) e cantos vivos marcados;
// 2) entalhes com padrão dentro das formas (hachura de goiva, contornos concêntricos, pontos), com margem preta na borda;
// 3) linha branca de separação entre partes sobrepostas (como o gravador faz para a figura não "colar");
// 4) impressão por pixel: borda de tinta irregular (desfoque + ruído + limiar), veio da madeira, falhas de tinta, papel com fibra;
// 5) duas matrizes: vermelho por baixo (multiplica, registro levemente deslocado), preto por cima.
const ENTALHE = (() => {
  const INK = [26, 21, 17], RED = [183, 46, 28];
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hash(x, y, s) { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 982451653)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vn(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // caminho suave; ponto [x, y, 1] = canto vivo
  function path(pts, closed, J, R) {
    const q = pts.map(p => [p[0] + (R() - 0.5) * J, p[1] + (R() - 0.5) * J, p[2]]), n = q.length, P = new Path2D();
    P.moveTo(q[0][0], q[0][1]);
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = q[(i - 1 + n) % n], p1 = q[i], p2 = q[(i + 1) % n], p3 = q[(i + 2) % n];
      const s1 = !p1[2] && (closed || i > 0), s2 = !p2[2] && (closed || i + 1 < n - 1);
      const c1 = s1 ? [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6] : p1, c2 = s2 ? [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6] : p2;
      P.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]);
    }
    if (closed) P.closePath(); return P;
  }
  // geometria auxiliar (devolve listas de pontos)
  const G = {
    // membro: corrente de pontos com larguras -> contorno fechado com pontas arredondadas
    limb(ch, ws) { const L = [], Rt = [], n = ch.length;
      const dir = i => { const a = ch[Math.max(0, i - 1)], b = ch[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
      ch.forEach((p, i) => { const d = dir(i), w = ws[i] / 2; L.push([p[0] - d[1] * w, p[1] + d[0] * w]); Rt.push([p[0] + d[1] * w, p[1] - d[0] * w]); });
      const de = dir(n - 1), e = ch[n - 1], d0 = dir(0), s = ch[0];
      return [...L, [e[0] + de[0] * ws[n - 1] * 0.42, e[1] + de[1] * ws[n - 1] * 0.42], ...Rt.reverse(), [s[0] - d0[0] * ws[0] * 0.42, s[1] - d0[1] * ws[0] * 0.42]]; },
    // garra/chifre curvo: da base (largura w) até a ponta, curvando
    claw(a, b, w, bend) { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      const m = [mx + nx * bend, my + ny * bend];
      return [[a[0] + nx * w / 2, a[1] + ny * w / 2], [m[0] + nx * w * 0.3, m[1] + ny * w * 0.3], [b[0], b[1], 1], [m[0] - nx * w * 0.3, m[1] - ny * w * 0.3], [a[0] - nx * w / 2, a[1] - ny * w / 2]]; },
    // faixas paralelas que acompanham uma curva, abrindo no fim (mechas de cabelo, labaredas)
    locks(base, n, sp, w0, w1, spread = 0.6, wave = 0.8) { const out = [], m = base.length;
      for (let j = 0; j < n; j++) { const ch = [], ws = [];
        base.forEach((p, i) => { const u = i / (m - 1), a = base[Math.max(0, i - 1)], b = base[Math.min(m - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
          const off = (j - (n - 1) / 2) * sp * (1 + spread * u) + Math.sin(u * 8 + j * 1.7) * wave * u; ch.push([p[0] - dy / l * off, p[1] + dx / l * off]); ws.push(w0 + (w1 - w0) * u); });
        out.push(G.limb(ch, ws)); } return out; },
    star(cx, cy, r1, r2, n, rot = -Math.PI / 2) { const p = []; for (let i = 0; i < n * 2; i++) { const a = rot + i / (n * 2) * Math.PI * 2, r = i % 2 ? r2 : r1; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1]); } return p; },
    ring(cx, cy, rx, ry, n = 14, rot = 0) { const p = []; for (let i = 0; i < n; i++) { const a = rot + i / n * Math.PI * 2; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; },
  };

  // marcas (desenham "branco" num canvas temporário; viram entalhe depois)
  function marks(k, R) {
    const fillPts = pts => { k.beginPath(); k.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) k.lineTo(pts[i][0], pts[i][1]); k.closePath(); k.fill(); };
    const M = {
      knife(a, b, w) { const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * w / 2, ny = dx / l * w / 2; fillPts([a, [m[0] + nx, m[1] + ny], b, [m[0] - nx, m[1] - ny]]); },
      // goiva reta: largura cheia no meio, afina só nas pontas
      blade(a, b, w) { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, nx = -uy * w / 2, ny = ux * w / 2, e = Math.min(l * 0.3, w * 1.6);
        fillPts([a, [a[0] + ux * e + nx, a[1] + uy * e + ny], [b[0] - ux * e + nx, b[1] - uy * e + ny], b, [b[0] - ux * e - nx, b[1] - uy * e - ny], [a[0] + ux * e - nx, a[1] + uy * e - ny]]); },
      wedge(a, b, w) { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * w / 2, ny = dx / l * w / 2; fillPts([[a[0] + nx, a[1] + ny], b, [a[0] - nx, a[1] - ny]]); },
      dot(x, y, r) { k.beginPath(); k.ellipse(x, y, r * (0.85 + R() * 0.3), r * (0.85 + R() * 0.3), R() * 3, 0, Math.PI * 2); k.fill(); },
      shape(pts) { k.fill(path(pts, true, 0.2, R)); },
      line(pts, w) { k.lineWidth = w; k.lineCap = "round"; k.lineJoin = "round"; k.stroke(path(pts, false, 0.15, R)); },
      // hachura de goiva: linhas paralelas quebradas, cada traço afinando nas pontas
      hatch({ ang = 0, gap = 2.4, w = 1, seg = [6, 16], hole = [1, 4], wob = 0.3, box = [-10, -10, 110, 110], flat = false }) {
        const ca = Math.cos(ang), sa = Math.sin(ang), [x0, y0, x1, y1] = box, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rad = Math.hypot(x1 - x0, y1 - y0) / 2;
        for (let o = -rad; o <= rad; o += gap * (0.85 + R() * 0.3)) { let s = -rad - R() * seg[1];
          while (s < rad) { const L = seg[0] + R() * (seg[1] - seg[0]), off = o + (R() - 0.5) * wob;
            const a = [cx + ca * s - sa * off, cy + sa * s + ca * off], b = [cx + ca * (s + L) - sa * (off + (R() - 0.5) * wob), cy + sa * (s + L) + ca * (off + (R() - 0.5) * wob)];
            (flat ? M.blade : M.knife)(a, b, w * (0.75 + R() * 0.5)); s += L + hole[0] + R() * (hole[1] - hole[0]); } } },
      // pontos de goiva em U em fileiras desencontradas
      dots({ gap = 3, r = 0.7, box = [0, 0, 100, 100] }) { for (let y = box[1], j = 0; y <= box[3]; y += gap * 0.87, j++) for (let x = box[0] + (j % 2) * gap / 2; x <= box[2]; x += gap) M.dot(x + (R() - 0.5) * 0.5, y + (R() - 0.5) * 0.5, r); },
      // raios saindo de um centro
      rays(cx, cy, n, r0, r1, w) { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + R() * 0.2; M.wedge([cx + Math.cos(a) * r1, cy + Math.sin(a) * r1], [cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], w); } },
    };
    return M;
  }

  // ferramentas da matriz: preencher, cortar, sobrepor com linha branca, entalhar padrão dentro de uma forma
  function tools(k, N, R, sil) {
    const T = {
      G, P: (pts, closed = true) => path(pts, closed, 0.3, R),
      fill(pts) { k.globalCompositeOperation = "source-over"; k.fill(Array.isArray(pts) ? T.P(pts) : pts); },
      cut(pts) { if (sil) return; k.globalCompositeOperation = "destination-out"; k.fill(Array.isArray(pts) ? T.P(pts) : pts); k.globalCompositeOperation = "source-over"; },
      // sobrepõe a forma deixando uma faixa branca em volta (separação de planos)
      over(pts, gap = 1.1) { const p = Array.isArray(pts) ? T.P(pts) : pts; if (!sil && gap > 0) { k.globalCompositeOperation = "destination-out"; k.lineWidth = gap * 2; k.lineJoin = "round"; k.stroke(p); } k.globalCompositeOperation = "source-over"; k.fill(p); },
      group(list, gap = 1.1) { const ps = list.map(q => Array.isArray(q) ? T.P(q) : q); if (!sil && gap > 0) { k.globalCompositeOperation = "destination-out"; k.lineWidth = gap * 2; k.lineJoin = "round"; ps.forEach(p => k.stroke(p)); } k.globalCompositeOperation = "source-over"; ps.forEach(p => k.fill(p)); },
      // risco cortado ao longo de um caminho aberto
      groove(pts, w, closed = false) { if (sil) return; k.globalCompositeOperation = "destination-out"; k.lineWidth = w; k.lineCap = "round"; k.lineJoin = "round"; k.stroke(path(pts, closed, 0.2, R)); k.globalCompositeOperation = "source-over"; },
      zoom(z, cx, cy) { k.translate(cx, cy); k.scale(z, z); k.translate(-cx, -cy); },
      frame() { const p = new Path2D(); p.rect(-1, -1, 102, 102); p.rect(2.6, 2.4, 94.9, 95.2); k.globalCompositeOperation = "source-over"; k.fill(p, "evenodd"); },
      ink(pts, w, closed = false) { k.globalCompositeOperation = "source-over"; k.lineWidth = w; k.lineCap = "round"; k.lineJoin = "round"; k.stroke(path(pts, closed, 0.2, R)); },
      // entalhes dentro da forma, sem encostar na borda (margem preta)
      within(pts, margin, draw) { if (sil) return; const p = Array.isArray(pts) ? T.P(pts) : pts;
        const c = document.createElement("canvas"); c.width = c.height = N; const tk = c.getContext("2d"); tk.setTransform(k.getTransform()); tk.fillStyle = tk.strokeStyle = "#fff";
        draw(marks(tk, R), p, tk);
        tk.globalCompositeOperation = "destination-in"; tk.fill(p);
        if (margin > 0) { tk.globalCompositeOperation = "destination-out"; tk.lineWidth = margin * 2; tk.lineJoin = "round"; tk.stroke(p); }
        k.save(); k.setTransform(1, 0, 0, 1, 0, 0); k.globalCompositeOperation = "destination-out"; k.drawImage(c, 0, 0); k.restore(); k.globalCompositeOperation = "source-over"; },
      // contornos concêntricos seguindo a forma (pelo, pano, volume)
      rings(pts, { margin = 1.2, gap = 2.6, w = 0.9, n = 6, dash = null }) { T.within(pts, 0, (m, p, tk) => {
        for (let i = n - 1; i >= 0; i--) { const a = margin + i * gap; tk.globalCompositeOperation = "source-over"; tk.setLineDash(dash ? dash.map(v => v * (0.8 + R() * 0.4)) : []); tk.lineDashOffset = R() * 10; tk.lineWidth = 2 * (a + w); tk.stroke(p);
          tk.setLineDash([]); tk.globalCompositeOperation = "destination-out"; tk.lineWidth = 2 * a; tk.stroke(p); } }); },
    };
    return T;
  }

  function layer(N, seed, fns, sil) {
    const c = document.createElement("canvas"); c.width = c.height = N; const k = c.getContext("2d"), R = rng(seed);
    k.setTransform(N / 100, 0, 0, N / 100, 0, 0); k.fillStyle = k.strokeStyle = "#000";
    const t = tools(k, N, R, sil); for (const f of fns) if (f) { k.save(); f(t); k.restore(); } return c;
  }
  // borda de tinta: desfoca a máscara, soma ruído e corta no meio -> cantos macios, borda viva e irregular
  function inkMask(c, N, seed, blurR, rough) {
    const d = c.getContext("2d").getImageData(0, 0, N, N).data, A = new Float32Array(N * N), B = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) A[i] = d[i * 4 + 3] / 255;
    const r = blurR, w = 2 * r + 1, cl = v => v < 0 ? 0 : v >= N ? N - 1 : v;
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < N; y++) { let s = 0; const o = y * N; for (let x = -r; x <= r; x++) s += A[o + cl(x)]; for (let x = 0; x < N; x++) { B[o + x] = s / w; s += A[o + cl(x + r + 1)] - A[o + cl(x - r)]; } }
      for (let x = 0; x < N; x++) { let s = 0; for (let y = -r; y <= r; y++) s += B[cl(y) * N + x]; for (let y = 0; y < N; y++) { A[y * N + x] = s / w; s += B[cl(y + r + 1) * N + x] - B[cl(y - r) * N + x]; } }
    }
    const per = N / 70, aa = 0.55 / (2 * r + 1);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x, v = A[i]; if (v <= 0.02) { A[i] = 0; continue; } if (v >= 0.98) { A[i] = 1; continue; }
      const n = vn(x / per, y / per, seed) * 0.7 + vn(x / per * 2.7, y / per * 2.7, seed + 7) * 0.3; A[i] = sstep(0.5 - aa, 0.5 + aa, v + (n - 0.5) * rough); }
    return A;
  }
  function render(id, size, opt = {}) {
    const D = DEF[id]; if (!D) return null; const SS = opt.ss ?? 2, N = size * SS, seed = [...id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
    const sil = !!opt.silhouette, frame = t => t.frame();
    const blk = layer(N, seed, sil ? [D.red, D.fig] : [D.bg, D.fig, D.noFrame ? null : frame], sil), red = sil ? null : layer(N, seed + 1, [D.redBg, D.red]);
    const br = Math.max(1, Math.round(N / 260)), mB = inkMask(blk, N, seed, br, 0.26), mR = red ? inkMask(red, N, seed + 3, br, 0.26) : null;
    const out = document.createElement("canvas"); out.width = out.height = N; const k = out.getContext("2d"), img = k.createImageData(N, N), px = img.data;
    const pap = (D.paper.match(/\w\w/g) || []).map(h => parseInt(h, 16)), ox = Math.round(N * 0.006), oy = Math.round(N * 0.004), s2 = seed + 11;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x;
      // papel: fibra comprida + manchas leves
      const fib = (vn(x / (N * 0.004), y / (N * 0.05), s2) - 0.5) * 10 + (vn(x / (N * 0.2), y / (N * 0.2), s2 + 1) - 0.5) * 10;
      let r = pap[0] + fib, g = pap[1] + fib, b = pap[2] + fib * 0.9;
      // matriz vermelha (multiplica), deslocada no registro
      if (mR) { const xr = x - ox, yr = y - oy; if (xr >= 0 && yr >= 0) { const m = mR[yr * N + xr]; if (m > 0) { const dens = 0.9 + (vn(x / (N * 0.12), y / (N * 0.008), s2 + 2) - 0.5) * 0.16; const a = m * dens; r *= 1 - a * (1 - RED[0] / 255); g *= 1 - a * (1 - RED[1] / 255); b *= 1 - a * (1 - RED[2] / 255); } } }
      // matriz preta: veio da madeira e falhas de tinta nas áreas grandes
      const m = sil ? (mB[i] > 0.5 ? 1 : 0) : mB[i];
      if (m > 0) { const grain = vn(x / (N * 0.18), y / (N * 0.006), s2 + 3), low = vn(x / (N * 0.09), y / (N * 0.09), s2 + 4);
        let dens = 0.97 - (grain > 0.7 ? (grain - 0.7) * 0.28 : 0);
        const sp = vn(x / (N * 0.0045), y / (N * 0.0045), s2 + 5); if (sp > 0.86) dens -= sstep(0.86, 0.96, sp) * sstep(0.5, 0.8, low) * 0.7;
        const a = m * Math.max(0.15, dens); r += (INK[0] - r) * a; g += (INK[1] - g) * a; b += (INK[2] - b) * a; }
      px[i * 4] = r; px[i * 4 + 1] = g; px[i * 4 + 2] = b; px[i * 4 + 3] = 255; }
    k.putImageData(img, 0, 0);
    if (SS === 1) return out;
    const f = document.createElement("canvas"); f.width = f.height = size; const fk = f.getContext("2d"); fk.imageSmoothingQuality = "high"; fk.drawImage(out, 0, 0, size, size); return f;
  }

  // planta de cordel: caule curvo e folhas alternadas com nervura entalhada
  function plant(t, x, base, top, s, n = 5) {
    const stem = [[x, base], [x + s * 1.5, (base + top) / 2], [x + s * 0.5, top]], parts = [t.G.limb(stem, [2.6, 2, 1.2])], veins = [];
    for (let i = 0; i < n; i++) { const f = (i + 0.6) / n, y = base + (top - base) * f, side = i % 2 ? 1 : -1, L = 10 - f * 4, cx = x + s * 1.5 * Math.sin(f * Math.PI) * 0.8;
      const tip = [cx + side * L, y - L * 0.55]; parts.push([[cx, y + 0.6], [cx + side * L * 0.5, y - L * 0.05], [tip[0], tip[1], 1], [cx + side * L * 0.35, y - L * 0.5], [cx, y - 1]]);
      veins.push([[cx + side * 1.6, y - 0.4], [cx + side * L * 0.55, y - L * 0.28], [tip[0] - side * 1.8, tip[1] + 1]]); }
    parts.push([[x + s * 0.5 - 2.2, top + 1], [x + s * 0.5, top - 5, 1], [x + s * 0.5 + 2.2, top + 1]]);
    t.group(parts, 1); veins.forEach(v => t.groove(v, 0.7));
  }
  // ---------- personagens ----------
  const DEF = {
    // CURUPIRA — de perfil, andando para a direita; pés enormes virados para trás; rastro ao contrário no chão.
    curupira: {
      paper: "D8E2B6",
      redBg(t) { t.zoom(0.75, 97, 3); t.fill(t.G.ring(83, 17, 7, 7, 16)); t.fill(t.G.star(83, 17, 12.5, 7.5, 12)); t.cut(t.G.ring(83, 17, 7.6, 7.6, 16)); t.fill(t.G.ring(83, 17, 6.4, 6.4, 16));
        t.cut(t.G.ring(80.6, 15.8, 0.9, 0.9, 8)); t.cut(t.G.ring(85.4, 15.8, 0.9, 0.9, 8)); t.groove([[80, 19.2], [83, 20.8], [86, 19.2]], 0.9); },
      red(t) { // cabelo em labaredas varrendo para trás + tanga
        t.zoom(1.13, 50, 89); const sq = q => q.map(([x, y, c]) => [x, y < 22 ? 22 - (22 - y) * 0.78 : y, c]);
        t.fill(sq([[64, 21, 1], [66.5, 12, 1], [60, 13.5], [62, 4, 1], [55, 10], [52, 0.5, 1], [48, 8.5], [40, 2.5, 1], [41.5, 11], [31, 7, 1], [35.5, 16], [25, 17, 1], [34, 22], [27, 28, 1], [38, 28], [33, 35, 1], [43, 32], [46, 22]]));
        for (const [a, b] of [[[47, 17], [41, 6]], [[52, 15], [52, 4]], [[57, 16], [61, 7]], [[43, 20], [33, 11]], [[41, 25], [30, 21]], [[41, 29], [35, 32]]]) t.groove(sq([a, [(a[0] + b[0]) / 2 + 0.6, (a[1] + b[1]) / 2], b]), 1.1);
        t.fill([[44, 60, 1], [60, 60, 1], [62.5, 69, 1], [56, 70.5], [52, 67], [47, 70.5], [42, 69, 1]]);
        for (let i = 0; i < 6; i++) { const x = 45 + i * 2.8; t.cut([[x, 62.2, 1], [x + 2.2, 62.2, 1], [x + 1.1, 64.4, 1]]); } }, // tanga com triângulos
      bg(t) {
        plant(t, 9, 91, 32, 1, 6);
        // moita espinhosa à direita
        const bush = [[78, 88, 1], [79, 79, 1], [82, 83], [83, 72, 1], [86, 80], [89, 70, 1], [90.5, 80], [94, 73, 1], [93.5, 82], [97.5, 78, 1], [97.5, 88, 1]];
        t.fill(bush); t.within(bush, 1, m => { for (const x of [81.2, 85, 89.2, 93]) m.knife([x, 87], [x + 0.6, 79], 0.9); });
        // chão com rastros ao contrário (dedos para a esquerda)
        const ground = [[0, 90.6, 1], [25, 90.1], [50, 90.9], [75, 90.2], [100, 90.5, 1], [100, 100, 1], [0, 100, 1]];
        t.fill(ground);
        t.within(ground, 0, m => { for (let i = 0; i < 15; i++) { const x = 3 + i * 6.6; m.wedge([x, 95.5], [x + 1.4, 91.2], 1.4); } });
      },
      fig(t) {
        const G = t.G; t.zoom(1.13, 50, 89);
        // braço de trás (fica atrás do tronco)
        t.over(G.limb([[47, 46], [41, 53], [38, 60]], [6.5, 5.5, 5]), 1.1); t.over(G.ring(37.6, 61.5, 3, 2.6, 10), 0.8);
        // perna de trás e pé virado
        t.over(G.limb([[48, 66], [42.5, 75], [36, 82]], [7.5, 6.5, 6]), 1.1);
        // tronco
        const torso = [[46, 41], [57, 41], [61, 46], [60, 55], [59, 61, 1], [44.5, 61, 1], [43.5, 54], [43.5, 46]];
        t.over(torso, 1.2); t.within(torso, 2, m => { for (let i = 0; i < 4; i++) m.knife([47 + i * 3.4, 48 + i * 0.3], [48.5 + i * 3.4, 56], 1.3); });
        // perna da frente
        t.over(G.limb([[55, 66], [59.5, 75], [61, 82]], [7.5, 6.5, 6]), 1.1);
        // PÉS VIRADOS: calcanhar redondo na frente, sola longa para trás, dedos com unhas apontando para trás
        for (const ax of [61, 36]) {
          const heel = ax + 5, back = ax - 9, bx = back + 1.2, by = 85.6, parts = [];
          parts.push([[ax - 3.5, 80.5, 1], [ax + 2.5, 80.8], [heel, 83], [heel + 0.6, 86.4], [heel - 1.6, 88.6, 1], [back, 88.6, 1], [back - 0.4, 84.6], [back + 2, 82.6]]);
          // quatro dedos em leque apontando para trás (para a esquerda)
          const toes = [[0.7, 6.4, 2.3], [0.32, 7.4, 2.2], [-0.04, 7.2, 2.1], [-0.38, 6, 1.9]];
          toes.forEach(([a, len, w], i) => { const b = [bx, by - 2 + i * 1.35], d = [-Math.cos(a), -Math.sin(a)], nx = -d[1] * w / 2, ny = d[0] * w / 2, e = [b[0] + d[0] * len, b[1] + d[1] * len];
            parts.push([[b[0] + nx, b[1] + ny], [e[0] + nx * 0.9 - d[0] * 0.8, e[1] + ny * 0.9 - d[1] * 0.8], [e[0] + d[0] * 0.3, e[1] + d[1] * 0.3], [e[0] - nx * 0.9 - d[0] * 0.8, e[1] - ny * 0.9 - d[1] * 0.8], [b[0] - nx, b[1] - ny]]); });
          t.group(parts, 1.1);
          toes.forEach(([a, len, w], i) => { const b = [bx, by - 2 + i * 1.35], d = [-Math.cos(a), -Math.sin(a)], e = [b[0] + d[0] * (len - 1), b[1] + d[1] * (len - 1)]; t.cut(G.ring(e[0], e[1], 0.75, 0.6, 7, a)); }); // unhas
          t.groove([[ax + 3, 84.4], [ax + 4.4, 86.8]], 0.8); // dobra do calcanhar
        }
        // braço da frente estendido, mão aberta
        t.over(G.limb([[57.5, 46], [64, 52], [70.5, 49.5]], [6.5, 5.5, 5]), 1.1);
        t.over([[69, 46.5], [72.5, 45], [74, 43.5, 1], [74.8, 45.6], [77.5, 45.4, 1], [76.8, 47.6], [78.6, 49, 1], [76, 50.4], [76.8, 52.4, 1], [72.5, 52.4], [69.5, 52]], 0.9);
        // pescoço e cabeça grande de perfil
        t.over([[50, 37], [57, 37], [57, 43], [50, 43]], 0);
        const head = [[41.5, 26], [44.5, 18], [51, 14], [59, 15], [63.5, 19.5], [65, 24], [66.5, 26.5], [71.5, 30.5, 1], [66.5, 32.2], [66.8, 35], [64.8, 37.4], [62.5, 40.5], [57, 41.5], [51, 40.5], [45.5, 37.5]];
        t.over(head, 1.1);
        t.cut([[56.5, 25.6, 1], [59.8, 23.3], [63.6, 24.6, 1], [60, 27.6]]); t.fill(G.ring(61.6, 25.1, 1.25, 1.35, 8)); // olho
        t.groove([[55.5, 21.6], [60, 20.2], [64.5, 21.8]], 1.3); // sobrancelha
        t.groove([[60.5, 34.6], [63.5, 35.6], [66, 34.2]], 1.0); // sorriso maroto
        t.groove([[50.5, 25.5], [48, 27.8], [48.8, 31.2], [51, 32]], 0.9); // orelha
        t.groove([[46, 31.5], [50, 36.5]], 0.8); t.groove([[54, 36], [58.5, 37.5]], 0.8);
        for (let i = 0; i < 6; i++) { const u = i / 5; t.cut(G.ring(47.5 + u * 10, 44.3 + Math.sin(u * Math.PI) * 1.8, 0.85, 0.85, 8)); } // colar de sementes
        t.groove([[58.4, 50.6], [61.6, 47.2]], 1.0); t.groove([[42.6, 51.4], [45.6, 54]], 1.0); // braçadeiras
        t.groove([[57.6, 74.6], [61.6, 73.2]], 0.9); t.groove([[43.2, 74.2], [47, 75.6]], 0.9); // joelhos
      },
    },
    // CUCA — noite (faixa preta), corcunda de perfil, cabeça de jacaré com a boca aberta, cabelo branco, garras sobre o caldeirão.
    cuca: {
      paper: "D9CFE0",
      red(t) {
        t.fill([[52, 33], [72, 29.6], [95, 27.4], [94, 47], [74, 44], [54, 42]]); // boca
        for (let i = 0; i < 7; i++) { const x = 63 + i * 4.1, y = 32.8 - i * 0.55; t.cut([[x, y - 1, 1], [x + 3, y - 1.3, 1], [x + 1.4, y + 2.6, 1]]); }
        const edge = x => x < 76 ? 37.6 + (x - 62) * 3.6 / 14 : 41.2 + (x - 76) * 3.4 / 15;
        for (let i = 0; i < 6; i++) { const x = 64 + i * 4.3; t.cut([[x, edge(x) + 1.2, 1], [x + 3, edge(x + 3) + 1.2, 1], [x + 1.5, edge(x + 1.5) - 2.8, 1]]); }
        t.fill(t.G.ring(67.2, 18.6, 2.4, 2, 10)); // íris
        t.fill([[70, 92, 1], [72, 85, 1], [74.5, 89], [77, 82, 1], [79.5, 88], [82, 81, 1], [84.5, 88], [87, 84, 1], [89, 92, 1]]); // fogo
      },
      bg(t) {
        t.fill([[0, 0, 1], [100, 0, 1], [100, 100, 1], [0, 100, 1]]); // céu de noite
        t.within([[0, 0, 1], [100, 0, 1], [100, 88, 1], [0, 88, 1]], 0, m => {
          m.hatch({ ang: 0, gap: 3.4, w: 0.7, seg: [4, 13], hole: [5, 16], box: [0, 4, 100, 60] });
          for (const [x, y, s] of [[36, 9, 2.6], [47, 6, 1.6], [92, 9, 2], [30, 26, 1.5], [88, 50, 1.4], [6, 40, 1.6]]) { m.wedge([x - s, y], [x + s, y], 0.9); m.wedge([x + s, y], [x - s, y], 0.9); m.wedge([x, y - s], [x, y + s], 0.9); m.wedge([x, y + s], [x, y - s], 0.9); } });
        t.cut(t.G.ring(15, 17, 10, 10, 18)); t.fill(t.G.ring(20, 13.5, 9.2, 9.2, 18)); // lua crescente
        t.groove([[0, 88.6], [30, 88], [60, 88.8], [100, 88.2]], 1.0); // horizonte
        t.within([[0, 89.5, 1], [100, 89.5, 1], [100, 100, 1], [0, 100, 1]], 0, m => { for (let i = 0; i < 16; i++) { const x = 2 + i * 6.3; m.wedge([x, 93], [x + 1.4, 89.6], 1.4); m.wedge([x + 2.5, 93], [x + 2, 90.5], 1.2); } m.hatch({ ang: 0, gap: 2.6, w: 0.5, seg: [3, 7], hole: [4, 10], box: [0, 95, 100, 99] }); });
      },
      fig(t) {
        const G = t.G;
        // cauda de jacaré saindo do manto, com escamas
        const tail = [[27, 87.5, 1], [16, 86.5], [7, 82], [2.5, 76, 1], [9, 79], [18, 82], [28, 82.5]];
        t.over(tail, 1.2); for (let i = 0; i < 4; i++) t.over([[6 + i * 5, 78.5 + i * 1.1, 1], [8.3 + i * 5, 73.6 + i * 1.3, 1], [10.6 + i * 5, 80.3 + i * 0.8, 1]], 0.6);
        t.within(tail, 1, m => m.dots({ gap: 2.6, r: 0.55, box: [4, 80, 28, 88] }));
        // manto corcunda com a barra rasgada
        const hem = []; for (let i = 0; i <= 11; i++) hem.push([67 - i * 3.9, i % 2 ? 84.5 : 88.5, 1]);
        const cloak = [[56, 39], [60, 47], [63, 60], [66, 74], [67, 88.5, 1], ...hem.slice(1), [24, 76], [25, 60], [30, 46], [37, 37], [45, 33.5]];
        t.over(cloak, 1.5);
        t.within(cloak, 1.6, m => { for (let i = 0; i < 10; i++) { const x = 30 + i * 3.6; m.knife([x - 0.5 - i * 0.15, 48 + Math.abs(i - 5) * 1.5], [x + 1.2, 86], 1.25); } });
        // cabelo branco: massa cortada, com fios pretos
        G.locks([[54, 22], [46, 23.5], [38, 29], [32, 38], [28, 50], [25, 61], [22.5, 70], [21, 77]], 5, 3.1, 2.7, 0.7, 0.7, 1.4).forEach(l => t.cut(l)); // mechas brancas
        // braço com manga larga e mão de garras sobre o caldeirão
        const sleeve = [[56, 45], [64, 50], [72, 57.5], [74, 62.5, 1], [66, 63, 1], [60, 56], [54, 52]];
        t.over(sleeve, 1.1); t.within(sleeve, 1.2, m => { m.knife([59, 51], [70, 59.5], 1.1); });
        t.cut([[52, 34.5], [62, 33.6], [74, 31], [86, 29.6], [96, 28.6, 1], [93, 45, 1], [76, 41.5], [62, 38], [53, 38.5]]); // boca aberta (o vermelho aparece)
        t.cut([[70, 92, 1], [72, 85, 1], [74.5, 89], [77, 82, 1], [79.5, 88], [82, 81, 1], [84.5, 88], [87, 84, 1], [89, 92, 1]]); // fogo
        // cabeça de jacaré: crânio + mandíbula de cima, mandíbula de baixo separada (boca aberta)
        const upper = [[46, 33], [47.5, 25], [53, 20], [60, 18], [63.5, 14.5], [68, 13.5], [71.5, 16.5], [79, 20.5], [88, 22.6], [93.5, 22.4], [97, 24.6], [96.6, 28.4, 1], [86, 29.3], [74, 30.6], [62, 33], [53, 36]];
        t.over(upper, 1.2);
        t.over([[53, 38], [62, 37.6], [76, 41.2], [91, 44.6], [95, 46.4, 1], [92, 49], [76, 48.4], [62, 46], [54, 44]], 1.0);
        t.within(upper, 1.6, m => { m.dots({ gap: 2.7, r: 0.5, box: [50, 20, 72, 32] }); for (let i = 0; i < 5; i++) m.wedge([74 + i * 4, 23.2 + i * 0.4], [75.5 + i * 4, 27.2 + i * 0.2], 1.3); });
        t.cut([[63.6, 18.8, 1], [66.8, 16.2], [70.6, 18.2, 1], [67.2, 21.2]]); t.fill([[66.7, 16.6], [67.7, 16.6], [67.9, 20.8], [66.9, 20.8]]); // olho de fenda
        t.groove([[61.5, 15.2], [66, 13.3], [71, 15]], 1.0); // arcada
        t.cut(G.ring(94, 24.3, 0.9, 0.7, 8)); // narina
        // caldeirão sobre três pés
        const pot = [[68.5, 70.5, 1], [91.5, 70.5, 1], [91, 75], [88, 80.5], [80, 83], [72, 80.5], [69, 75]];
        t.over(pot, 1.1); t.over([[67, 68.6, 1], [93, 68.6, 1], [93, 71.3, 1], [67, 71.3, 1]], 0.8);
        t.within(pot, 1.2, m => { m.knife([71, 74], [89, 74], 0.9); m.knife([73, 77.5], [87, 77.5], 0.9); for (let i = 0; i < 4; i++) m.dot(72.5 + i * 5, 75.8, 0.6); });
        t.over([[72, 80, 1], [74, 80, 1], [72.5, 89, 1], [71, 89, 1]], 0.5); t.over([[86, 80, 1], [88, 80, 1], [89.2, 89, 1], [87.7, 89, 1]], 0.5);
        // mão agarrando a borda: garras curvas por cima do caldeirão
        const hand = [[[69, 60], [75, 59], [78.5, 61.5], [78, 65.5], [70, 66]]];
        for (let i = 0; i < 4; i++) hand.push(G.claw([70.4 + i * 2.4, 64.5], [71.5 + i * 3.1, 74], 2.1, -1.8));
        t.group(hand, 1.0);
        // fumaça da poção em espiral
        t.groove([[84, 67], [86.5, 62], [84, 57.5], [87, 53], [85.5, 48.5]], 1.1); t.groove([[89, 67], [91.5, 61], [89.5, 56], [92, 51]], 0.9);
      },
    },
    // MAPINGUARI — de frente, gigante quadrado; olho único na testa; bocarra na barriga; braços compridos com garras em gancho.
    mapin: {
      paper: "C6D8CC",
      red(t) { t.fill(t.G.ring(50, 28, 4.6, 4.6, 14));
        const mouth = [[33, 57], [50, 53], [67, 57], [63, 68], [50, 72], [37, 68]]; t.fill(mouth);
        for (let i = 0; i < 6; i++) { const x = 35.5 + i * 5.2, y = 55.6 - (i < 3 ? i : 5 - i) * 0.7; t.cut([[x, y - 1, 1], [x + 4.4, y - 1, 1], [x + 2.2, y + 4, 1]]); }
        for (let i = 0; i < 5; i++) { const x = 38.5 + i * 5, y = 68.8 + (i < 2 ? i : 4 - i) * 0.6; t.cut([[x, y + 1.2, 1], [x + 4.2, y + 1.2, 1], [x + 2.1, y - 3.6, 1]]); } },
      bg(t) {
        plant(t, 8, 89, 22, 1, 6); plant(t, 92, 89, 26, -1, 6);
        t.fill(t.G.ring(87, 12, 4.6, 4.6, 12)); t.within(t.G.ring(87, 12, 9, 9, 12), 0, m => {}); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; t.fill([[87 + Math.cos(a - 0.12) * 6, 12 + Math.sin(a - 0.12) * 6, 1], [87 + Math.cos(a) * 9, 12 + Math.sin(a) * 9, 1], [87 + Math.cos(a + 0.12) * 6, 12 + Math.sin(a + 0.12) * 6, 1]]); }
        const ground = [[0, 88, 1], [30, 87.3], [70, 88.2], [100, 87.6, 1], [100, 100, 1], [0, 100, 1]];
        t.fill(ground); t.within(ground, 0, m => { for (let i = 0; i < 15; i++) { const x = 3 + i * 6.6; m.wedge([x, 94], [x + 1.6, 89], 1.6); } m.hatch({ ang: 0, gap: 2.6, w: 0.5, seg: [3, 8], hole: [4, 9], box: [0, 95.5, 100, 99] }); });
      },
      fig(t) {
        const G = t.G;
        // pernas-pilares com pés virados para trás (calcanhar à frente, dedos para trás: de frente vê-se o calcanhar redondo)
        for (const x of [31, 56]) { t.over([[x, 80, 1], [x + 13, 80, 1], [x + 13.5, 87], [x + 11, 89.6], [x + 2, 89.6], [x - 0.5, 87]], 1.2); }
        // corpo-bloco
        const body = [[30, 21], [38, 13.5], [50, 11.5], [62, 13.5], [70, 21], [74.5, 33], [77, 50], [77, 70], [75, 82, 1], [25, 82, 1], [23, 70], [23, 50], [25.5, 33]];
        t.over(body, 1.4);
        t.rings(body, { margin: 1.6, gap: 3.1, w: 1.0, n: 9, dash: [2.6, 1.8] });
        // braços compridos, por cima do corpo, com pelo e garras em gancho
        for (const s of [-1, 1]) { const X = v => 50 + s * v;
          const arm = G.limb([[X(24), 26], [X(32), 46], [X(35.5), 70]], [12, 10, 8.5]);
          const claws = []; for (let i = 0; i < 3; i++) claws.push(G.claw([X(31.5 + i * 3.2), 72], [X(29 + i * 3), 85], 2.5, s * 1.8));
          t.group([arm, ...claws], 1.3); t.within(arm, 1.4, m => { for (let j = 0; j < 9; j++) { const y = 30 + j * 4.4, x = X(26 + (y - 30) * 0.24); m.wedge([x - s * 2.4, y], [x + s * 0.6, y + 3.4], 1.3); m.wedge([x + s * 1.2, y + 1], [x + s * 3.8, y + 4], 1.2); } });
}
        // olho único: órbita escura limpa, branco cortado, íris vermelha por baixo, pupila preta
        t.fill(G.ring(50, 28, 10, 9.4, 18)); t.cut(G.ring(50, 28, 7.6, 7.2, 18)); t.fill(G.ring(50, 28, 2.3, 2.3, 10));
        t.groove([[38, 18.5], [44, 15.6], [50, 17.6], [56, 15.6], [62, 18.5]], 1.4); // sobrancelha franzida
        // bocarra na barriga: lábio preto grosso, interior vermelho, dentes brancos
        t.over([[29, 56], [50, 50], [71, 56], [66.5, 71], [50, 75.5], [33.5, 71]], 1.3);
        t.cut([[33, 57], [50, 53], [67, 57], [63, 68], [50, 72], [37, 68]]);
        t.groove([[42, 77.6], [50, 79], [58, 77.6]], 0.9);
      },
    },
  };
  const cache = {};
  return { DEF, H: { G, plant, path }, render, img(id, size, opt = {}) { const key = id + ":" + size + ":" + JSON.stringify(opt); return cache[key] || (cache[key] = render(id, size, opt)); } };
})();
