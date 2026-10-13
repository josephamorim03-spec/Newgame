// Cartas no motor ENTALHE. Mata = dia (papel claro, figura preta); Assombrações = noite (céu preto, figura com filete branco).
// O vermelho vai só no ponto de foco de cada carta.
(() => {
  const E = ENTALHE, DEF = E.DEF, G = E.H.G, plant = E.H.plant;
  // curva densa (Catmull-Rom) para corpos longos: cobra, raízes, rabos
  function spline(pts, per = 8) { const out = [], n = pts.length;
    for (let i = 0; i < n - 1; i++) { const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      for (let s = 0; s < per; s++) { const u = s / per, u2 = u * u, u3 = u2 * u;
        out.push([0, 1].map(d => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * u + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * u2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * u3))); } }
    out.push(pts[n - 1].slice(0, 2)); return out; }
  const taper = (ch, w0, w1, pow = 1) => ch.map((_, i) => w0 + (w1 - w0) * Math.pow(i / (ch.length - 1), pow));
  const arcLen = ch => { const L = [0]; for (let i = 1; i < ch.length; i++) L.push(L[i - 1] + Math.hypot(ch[i][0] - ch[i - 1][0], ch[i][1] - ch[i - 1][1])); return L; };
  // faixa transversal de um corpo longo entre os comprimentos s0 e s1
  function band(ch, ws, L, s0, s1, extra = 1.5) { const left = [], right = [];
    for (let i = 0; i < ch.length; i++) { if (L[i] < s0 || L[i] > s1) continue; const a = ch[Math.max(0, i - 1)], b = ch[Math.min(ch.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, w = ws[i] / 2 + extra;
      left.push([ch[i][0] - dy / l * w, ch[i][1] + dx / l * w, 1]); right.push([ch[i][0] + dy / l * w, ch[i][1] - dx / l * w, 1]); }
    return left.length > 1 ? [...left, ...right.reverse()] : null; }
  const ell = (cx, cy, rx, ry, n = 16, rot = 0) => G.ring(cx, cy, rx, ry, n, rot);
  // chão de dia: faixa preta com capim entalhado
  function day(t, gy = 90) { const g = [[0, gy, 1], [30, gy - 0.6], [65, gy + 0.4], [100, gy - 0.2, 1], [100, 100, 1], [0, 100, 1]]; t.fill(g);
    t.within(g, 0, m => { for (let i = 0; i < 15; i++) { const x = 3 + i * 6.6; m.wedge([x, gy + 5.5], [x + 1.4, gy + 1.2], 1.4); } }); }
  // noite: tudo preto, riscos de goiva no céu, estrelas, lua, horizonte e capim
  function night(t, { gy = 88, moon = [16, 16, 9], full = false, stars = [[38, 9, 2.4], [52, 6, 1.5], [90, 10, 2], [30, 26, 1.4], [86, 42, 1.4], [8, 40, 1.5]] } = {}) {
    t.fill([[0, 0, 1], [100, 0, 1], [100, 100, 1], [0, 100, 1]]);
    t.within([[0, 0, 1], [100, 0, 1], [100, gy, 1], [0, gy, 1]], 0, m => { m.hatch({ ang: 0, gap: 3.6, w: 0.65, seg: [4, 12], hole: [6, 18], box: [0, 4, 100, gy - 20] });
      for (const [x, y, s] of stars) { m.wedge([x - s, y], [x + s, y], 0.9); m.wedge([x + s, y], [x - s, y], 0.9); m.wedge([x, y - s], [x, y + s], 0.9); m.wedge([x, y + s], [x, y - s], 0.9); } });
    if (moon) { const [x, y, r] = moon; t.cut(ell(x, y, r, r, 20)); if (!full) t.fill(ell(x + r * 0.5, y - r * 0.35, r * 0.92, r * 0.92, 20)); }
    if (gy < 100) { t.groove([[0, gy + 0.6], [30, gy], [60, gy + 0.8], [100, gy + 0.2]], 1.0);
      t.within([[0, gy + 1.5, 1], [100, gy + 1.5, 1], [100, 100, 1], [0, 100, 1]], 0, m => { for (let i = 0; i < 16; i++) { const x = 2 + i * 6.3; m.wedge([x, gy + 5], [x + 1.4, gy + 1.6], 1.4); m.wedge([x + 2.5, gy + 5], [x + 2, gy + 2.5], 1.2); } }); } }
  // roseta de onça: arcos curtos em volta de um centro
  function rosette(m, cx, cy, r) { for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.3, b = a + 1.15; m.knife([cx + Math.cos(a) * r, cy + Math.sin(a) * r], [cx + Math.cos(b) * r, cy + Math.sin(b) * r], r * 0.55); } }
  // meio-tom: hachura densa dentro de uma parte (figura preta sobre a noite precisa de textura para não sumir)
  function tone(t, pts, ang, gap = 2.3, w = 1.25, margin = 1.2) { t.within(pts, margin, m => m.hatch({ ang, gap: Math.max(gap, 2.2), w: Math.max(w, 1.0), seg: [6, 16], hole: [1, 2.5], flat: true })); }
  // nota musical de cordel
  function note(t, x, y, s = 1) { t.fill(ell(x, y, 2.1 * s, 1.5 * s, 10, -0.4)); t.fill([[x + 1.4 * s, y - 0.3 * s, 1], [x + 2.2 * s, y - 0.3 * s, 1], [x + 2.2 * s, y - 9 * s, 1], [x + 1.4 * s, y - 9 * s, 1]]); t.fill([[x + 2.2 * s, y - 9 * s, 1], [x + 5.5 * s, y - 6 * s, 1], [x + 5 * s, y - 4.6 * s, 1], [x + 2.2 * s, y - 6.8 * s, 1]]); }

  Object.assign(DEF, {
    // SACI — uma perna só, carapuça vermelha, cachimbo, redemoinho atrás
    saci: {
      paper: "EED89A",
      red(t) { t.fill([[39.5, 29, 1], [40, 21], [45, 13], [53, 8.5], [62, 8], [69, 11], [73.5, 16.5, 1], [68, 15.5], [63.5, 17], [64, 24.5, 1], [55, 23], [46, 25]]);
        t.cut(ell(72.8, 17.6, 2.4, 2.4, 10)); // pompom fica preto por cima
        t.fill([[45.5, 60, 1], [59.5, 60, 1], [61, 68, 1], [53.5, 69], [45, 68, 1]]); },
      bg(t) {
        // redemoinho: arcos empilhados que abrem para cima, folhas girando
        for (let i = 0; i < 7; i++) { const y = 88 - i * 6, rx = 3 + i * 2.4, cx = 24 + Math.sin(i * 0.9) * 1.5; const arc = []; for (let j = 0; j <= 10; j++) { const a = Math.PI * (0.05 + j * 0.09); arc.push([cx + Math.cos(a) * rx, y + Math.sin(a) * rx * 0.28]); } t.ink(arc, 1.4); }
        for (const [x, y, a] of [[12, 52, 0.6], [34, 46, -0.5], [9, 70, -0.3], [38, 63, 0.9]]) t.fill([[x - Math.cos(a) * 2.6, y - Math.sin(a) * 2.6, 1], [x - Math.sin(a) * 1.2, y + Math.cos(a) * 1.2], [x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 1], [x + Math.sin(a) * 1.2, y - Math.cos(a) * 1.2]]);
        plant(t, 90, 91, 50, -1, 4); day(t, 91);
      },
      fig(t) {
        // braço de trás na cintura
        t.over(G.limb([[47, 48], [41, 54], [45.5, 59]], [5.5, 5, 4.5]), 1.1);
        const torso = [[46, 45], [58, 45], [61, 51], [59.5, 61, 1], [46.5, 61, 1], [44.5, 51]]; t.over(torso, 1.2);
        t.within(torso, 1.8, m => { for (let i = 0; i < 3; i++) m.knife([48.5 + i * 3.4, 48.5], [49.5 + i * 3.4, 56], 1.2); });
        // perna única dobrada, no ar (pulando)
        t.over(G.limb([[53, 66], [58, 74], [55.5, 82]], [7.5, 6.5, 5.5]), 1.1);
        t.over([[52.5, 80.5, 1], [57.5, 80.5], [61, 82.5], [64.5, 83], [65, 85.8, 1], [52.5, 85.8, 1]], 1.0);
        t.groove([[56, 72.8], [60, 71.6]], 0.9);
        // braço da frente para cima, acenando
        t.over(G.limb([[57.5, 48], [65, 51.5], [69.5, 44]], [5.5, 5, 4.5]), 1.1); t.over(ell(70, 41.5, 3, 2.8, 10), 0.9);
        // cabeça redonda de perfil
        const head = [[40, 32], [41.5, 25], [47, 21], [55, 20.5], [61.5, 24], [64, 29], [67, 33, 1], [64, 35.2], [63.6, 39], [60, 43.5], [53, 45.5], [46, 43.5], [41.5, 38.5]];
        t.over(head, 1.1);
        t.fill([[40.2, 27.2, 1], [64, 22.6, 1], [64.6, 25.6, 1], [40.6, 30.4, 1]]); // aba da carapuça
        t.fill(ell(72.8, 17.6, 2.3, 2.3, 10));
        t.cut([[54.5, 31.6, 1], [57.6, 29.6], [61.2, 30.8, 1], [57.8, 33.4]]); t.fill(ell(59.2, 31.3, 1.15, 1.25, 8)); // olho
        t.groove([[53.5, 39.2], [58, 41.2], [62.5, 39]], 1.1); // risada
        t.groove([[47.5, 32], [45.5, 34.5], [46.5, 37.5], [48.5, 38]], 0.9); // orelha
        // cachimbo e fumaça
        t.over([[61.5, 39.5, 1], [71, 38.6, 1], [71.2, 40.2, 1], [61.8, 41.2, 1]], 0.7); t.over([[69.5, 34.5, 1], [74.5, 34.5, 1], [74, 40.5], [70, 40.5]], 0.7);
        t.ink([[72, 33], [74, 28.5], [71.5, 25], [75, 21.5], [79, 23.5], [77.5, 27.5], [82, 27], [86, 22]], 1.1);
      },
    },
    // COBRA-CORAL — corpo em S que enche o quadro, anéis preto/branco/vermelho, cabeça em ponta, língua bífida vermelha
    coral: {
      paper: "D9E2B4",
      _body() { const ch = spline([[70, 25], [56, 22], [40, 26], [30, 37], [34, 49], [50, 54], [66, 60], [72, 71], [64, 81], [46, 84], [28, 81], [16, 73], [12, 64]], 40); const ws = taper(ch, 10, 1.6, 1.4); return { ch, ws, L: arcLen(ch) }; },
      red(t) { const { ch, ws, L } = DEF.coral._body(), body = G.limb(ch, ws); t.fill(body);
        t.within(body, 0, m => { for (let s = 11; s < L[L.length - 1]; s += 14) { const a = band(ch, ws, L, s, s + 1.4), b = band(ch, ws, L, s + 8.6, s + 10); if (a) m.shape(a); if (b) m.shape(b); } });
        t.fill([[80, 23.4, 1], [88, 22.2, 1], [91.5, 19.5, 1], [89.3, 22.6, 1], [92, 24.6, 1], [88.2, 23.6, 1], [80, 24.8, 1]]); }, // língua
      bg(t) { plant(t, 90, 91, 40, -1, 4); plant(t, 82, 91, 62, 1, 3);
        day(t, 91); },
      fig(t) { const { ch, ws, L } = DEF.coral._body(), body = G.limb(ch, ws); t.over(body, 1.3);
        t.within(body, 0, m => { for (let s = 11; s < L[L.length - 1]; s += 14) { const b = band(ch, ws, L, s, s + 10); if (b) m.shape(b); } });
        // cabeça em ponta (perigo), olho e escamas
        const head = [[66, 20], [74, 18.6], [80.5, 21.4], [83.5, 24, 1], [80, 27.2], [73, 29.4], [66, 29.4]]; t.over(head, 1.2);
        t.cut([[72.5, 21.8, 1], [75.2, 20.8], [77.3, 22.3, 1], [74.6, 23.6]]); t.fill(ell(75.2, 22.2, 0.8, 0.9, 6));
        t.groove([[69, 26.4], [74, 25.8], [79.5, 24.8]], 0.8); t.groove([[68, 22.5], [70, 21.4]], 0.7);
      },
    },
    // UIRAPURU — passarinho redondo cantando, papo vermelho, notas no ar, num galho
    uira: {
      paper: "B9D3DA",
      red(t) { t.fill(ell(62, 47, 8, 9.5, 16, 0.3)); },
      bg(t) { for (const [x, y, s] of [[80, 26, 1], [88, 15, 0.85], [90, 36, 0.75]]) note(t, x, y, s);
        for (let i = 0; i < 3; i++) { const r = 6 + i * 4; const arc = []; for (let j = 0; j <= 8; j++) { const a = -0.7 + j * 0.16; arc.push([70 + Math.cos(a) * r, 35 + Math.sin(a) * r]); } t.ink(arc, 1.1); }
        // galho com folhas
        const br = [[0, 74, 1], [30, 72], [60, 73.5], [84, 72], [100, 70.5, 1], [100, 75.5, 1], [84, 76.5], [60, 77.5], [30, 76.5], [0, 78.5, 1]];
        t.fill(br); t.within(br, 0.9, m => m.hatch({ ang: 0.02, gap: 1.7, w: 0.6, seg: [4, 9], hole: [2, 6] }));
        for (const [x, s] of [[12, 1], [86, -1]]) { const leaf = [[x, 75], [x + s * 5, 79], [x + s * 10, 86, 1], [x + s * 4, 84], [x - s * 0.5, 77]]; t.over(leaf, 0.8); t.groove([[x + s * 1.2, 77], [x + s * 8, 84.5]], 0.6); }
        day(t, 93);
      },
      fig(t) {
        // rabo em leque
        const tail = [[[30, 60], [14, 66], [10, 70, 1], [16, 71], [30, 65]], [[31, 63], [16, 74], [14, 79, 1], [20, 77.5], [32, 66]], [[33, 65], [22, 80], [22, 85, 1], [27, 81], [35, 67]]];
        t.group(tail, 1.0); tail.forEach(f => t.groove([f[0], f[2]], 0.6));
        // corpo redondo e cabeça redonda
        const body = ell(48, 54, 17, 15.5, 22); t.over(body, 1.3);
        t.rings(body, { margin: 1.6, gap: 3, w: 0.95, n: 5, dash: [2, 1.7] });
        t.cut(ell(61, 48, 7.2, 9, 16, 0.3)); // papo (o vermelho aparece)
        const head = ell(65, 34, 9.5, 9, 18); t.over(head, 1.2);
        t.cut(ell(67.5, 32.5, 3, 3, 12)); t.fill(ell(68.3, 32.4, 1.5, 1.6, 8)); // olho
        // bico aberto cantando
        t.over([[72, 31, 1], [82, 32.4, 1], [73.5, 35, 1]], 0.8); t.over([[73, 37, 1], [81, 40.5, 1], [72, 39.5, 1]], 0.8);
        // asa erguida com penas
        const wing = [[38, 47], [33, 36], [28, 26], [26, 18, 1], [32, 22], [34, 17, 1], [38, 24], [41, 19, 1], [44, 28], [48, 23, 1], [49, 34], [52, 45]];
        t.over(wing, 1.3); t.within(wing, 1.3, m => { for (let i = 0; i < 4; i++) m.knife([42 + i * 1.6, 45], [28.5 + i * 5.6, 23.5 + (i % 2) * 2], 1.0); });
        // patinhas no galho
        for (const x of [44, 53]) { t.over([[x - 1, 68], [x + 1, 68], [x + 1.2, 72.4], [x - 1.2, 72.4]], 0.6); t.over(G.claw([x, 72], [x + 3.4, 74.6], 1.2, 0.5), 0.4); t.over(G.claw([x, 72], [x - 2.8, 74.8], 1.2, -0.5), 0.4); }
      },
    },
    // ONÇA-PINTADA — de perfil, rosnando com a boca vermelha, rosetas no corpo, rabo erguido
    onca: {
      paper: "F0CF8E",
      red(t) { t.fill([[70, 50.5], [91, 49.5], [90.5, 59], [70, 59]]);
        for (const [x, d] of [[78, 1], [85.5, 1]]) t.cut([[x, 51.2, 1], [x + 2.6, 51.2, 1], [x + 1.3, 55.6, 1]]);
        for (const x of [77, 84]) t.cut([[x, 58.6, 1], [x + 2.4, 58.6, 1], [x + 1.2, 54.8, 1]]);
        t.fill(ell(78.5, 44.2, 1.9, 1.6, 10)); },
      bg(t) { plant(t, 9, 91, 46, 1, 4); t.fill(G.ring(84, 13, 4.8, 4.8, 12)); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; t.fill([[84 + Math.cos(a - 0.13) * 6.4, 13 + Math.sin(a - 0.13) * 6.4, 1], [84 + Math.cos(a) * 9.4, 13 + Math.sin(a) * 9.4, 1], [84 + Math.cos(a + 0.13) * 6.4, 13 + Math.sin(a + 0.13) * 6.4, 1]]); }
        day(t, 90); },
      fig(t) {
        // rabo erguido com anéis
        const tch = spline([[22, 58], [14, 52], [10, 42], [13, 33], [19, 30]], 8), tw = taper(tch, 5, 2.6), tail = G.limb(tch, tw); t.over(tail, 1.1);
        const tL = arcLen(tch); t.within(tail, 0, m => { for (let s = 6; s < tL[tL.length - 1] - 2; s += 5) { const b = band(tch, tw, tL, s, s + 1.4, -0.4); if (b) m.shape(b); } });
        // pernas de trás e da frente (as de trás primeiro)
        const legs = [G.limb([[30, 62], [24, 74], [27, 86]], [10, 6, 5]), G.limb([[62, 62], [64, 74], [64, 86]], [8, 6, 5.5])];
        t.over(legs[0], 1.1); t.over(legs[1], 1.1);
        // corpo comprido, costas arqueadas
        const body = [[18, 61], [24, 51], [36, 46], [50, 45.5], [62, 46], [68, 50], [70, 58], [66, 66], [56, 68], [42, 68.5], [30, 69], [21, 67]];
        t.over(body, 1.3);
        const front = [G.limb([[38, 64], [37, 76], [39, 86]], [9, 6, 5]), G.limb([[66, 60], [71, 73], [73, 86]], [9, 6.5, 5.5])];
        t.over(front[0], 1.1); t.over(front[1], 1.1);
        for (const [x, d] of [[27, -1], [39, 1], [64, 1], [73, 1]]) { const paw = [[x - 3.4, 84], [x + 3.6, 84], [x + 4.6, 88.4, 1], [x - 4, 88.4, 1]]; t.over(paw, 0.9); t.groove([[x - 1, 85.5], [x - 1, 88]], 0.6); t.groove([[x + 1.4, 85.5], [x + 1.4, 88]], 0.6); }
        // cabeça com orelhas, boca aberta
        const ears = [[[66, 43, 1], [66.6, 34.6, 1], [72.4, 40, 1]], [[75, 39.4, 1], [79, 32.6, 1], [81.4, 40.4, 1]]]; ears.forEach(e => t.over(e, 0.9));
        const head = [[64, 50], [66, 43], [72, 39], [80, 39.4], [87, 42.5], [90.4, 46.6], [91.6, 50, 1], [86, 50.6], [76, 51.4], [70, 53.5], [65, 56]];
        t.over(head, 1.2); t.over([[70, 59.5], [80, 58.6], [90.4, 58.6, 1], [87, 62.6], [76, 64], [68, 62]], 1.0);
        t.cut([[70, 51.6], [91, 50.4], [90.4, 58], [70, 58.6]]); // boca aberta
        t.cut([[75.4, 44.2, 1], [78.4, 42.4], [81.6, 44, 1], [78.4, 46]]); t.fill([[78, 42.8], [79, 42.8], [79.1, 45.6], [78.1, 45.6]]); // olho
        t.cut([[89.2, 44.6, 1], [91.4, 46.4, 1], [89.4, 47.2, 1]]); // focinho
        t.groove([[72, 41.2], [77, 40.4]], 0.8);
        // rosetas no corpo e nas pernas
        t.within(body, 1.4, m => { for (let y = 51, j = 0; y < 68; y += 7, j++) for (let x = 26 + (j % 2) * 4.5; x < 68; x += 9) rosette(m, x, y, 2.7); });
        t.within(head, 1.4, m => { for (const [x, y] of [[70, 45], [73, 48], [84, 45], [69, 49.5]]) m.dot(x, y, 0.7); });
        legs.concat(front).forEach(l => t.within(l, 1.2, m => { for (let y = 68; y < 82; y += 4.5) for (let x = 20; x < 80; x += 4.4) m.dot(x + (y % 9 > 4 ? 2 : 0), y, 0.65); }));
      },
    },
    // CAIPORA — montada num porco-do-mato (base quadrada), cocar vermelho, porrete erguido
    caipora: {
      paper: "C9DBA8",
      red(t) { for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.42, x = 44 + Math.cos(a) * 6.5, y = 22 + Math.sin(a) * 6.5; t.fill(G.claw([44 + Math.cos(a) * 3, 22 + Math.sin(a) * 3], [44 + Math.cos(a) * 12, 22 + Math.sin(a) * 12], 3.2, 0)); } },
      bg(t) { plant(t, 92, 91, 44, -1, 4); day(t, 90); },
      fig(t) {
        // pernas do porco
        const legs = [[[24, 68], [23, 86]], [[33, 70], [34, 86]], [[60, 70], [60, 86]], [[69, 66], [71, 86]]];
        legs.forEach(([a, b]) => { t.over(G.limb([a, b], [7, 5]), 1.0); t.over([[b[0] - 3, 85], [b[0] + 3, 85], [b[0] + 3.4, 88.6, 1], [b[0] - 3.4, 88.6, 1]], 0.8); t.groove([[b[0], 85.6], [b[0], 88.4]], 0.7); });
        // corpo quadrado e cerdas no lombo
        const body = [[13, 62], [17, 52], [28, 47], [46, 45], [62, 46], [71, 51], [73, 60], [70, 70], [58, 73], [30, 73], [17, 70]];
        t.over(body, 1.3); t.within(body, 1.5, m => m.hatch({ ang: 1.2, gap: 2.4, w: 0.85, seg: [3, 7], hole: [1.5, 4] }));
        const bristles = []; for (let i = 0; i < 9; i++) { const x = 18 + i * 5.4, y = 50 - Math.sin(i / 8 * Math.PI) * 4.4; bristles.push([[x - 2, y + 2.5, 1], [x + 1.2, y - 4.2, 1], [x + 3, y + 2.5, 1]]); }
        t.group(bristles, 0.8);
        // cabeça com focinho e presa branca
        t.over([[69, 48.5, 1], [71.5, 41.5, 1], [75.5, 47.5, 1]], 0.8);
        const head = [[64, 51], [72, 47], [82, 50.5], [89, 55], [92, 58.5, 1], [92, 64.5, 1], [86, 67], [76, 68], [67, 65]]; t.over(head, 1.2);
        t.cut(G.claw([84, 65.6], [86.6, 57.4], 2.2, -1)); // presa
        t.cut(ell(90.6, 60, 0.8, 1, 8)); t.cut(ell(90.6, 63, 0.8, 1, 8)); // narinas
        t.cut([[74, 53.2, 1], [77, 51.6], [79.6, 53.2, 1], [77, 55]]); t.fill(ell(77.4, 53.3, 1, 1.1, 8));
        // a Caipora montada: perna, tronco, braço com porrete, cabeça
        t.over(G.limb([[45, 41], [41, 50], [42.5, 58]], [6.5, 5.5, 4.5]), 1.1); t.over([[40, 57], [46, 57.5], [47.5, 60.5, 1], [39.5, 60.5, 1]], 0.8);
        const torso = [[39, 30], [50, 30], [52, 36], [50, 44, 1], [39, 44, 1], [37.5, 36]]; t.over(torso, 1.1);
        t.within(torso, 1.6, m => { for (let i = 0; i < 4; i++) m.dot(40.5 + i * 2.6, 33.4 + Math.sin(i) * 0.5, 0.7); });
        t.over(G.limb([[49, 33], [57, 36], [61, 30]], [5, 4.5, 4]), 1.0); t.over(ell(61.5, 28.5, 2.6, 2.5, 10), 0.8);
        t.over(G.limb([[58, 38], [62.5, 27], [67, 10]], [2, 2.4, 4.2]), 0.8); t.over(ell(67.4, 8.6, 3.4, 3.4, 10), 0.8); // porrete
        const hd = [[39, 22], [42, 16.5], [47, 15.5], [51, 18.5], [52, 22], [54.5, 24.6, 1], [51.8, 26], [49.5, 29.4], [44, 30], [40, 27]]; t.over(hd, 1.1);
        t.cut([[46.5, 21.4, 1], [48.7, 20.2], [50.6, 21.4, 1], [48.6, 22.6]]); t.groove([[47.5, 26.6], [50.5, 26.4]], 0.8);
        t.fill([[38.5, 21, 1], [52, 18, 1], [52.4, 20.2, 1], [38.8, 23.2, 1]]); // faixa do cocar
      },
    },
    // ANHANGÁ — gravura em negativo: veado branco com galhada, olhos de fogo, aura de raios
    anhanga: {
      paper: "E9D6B0",
      red(t) { t.fill(ell(75.3, 28.6, 2.2, 1.9, 10)); t.fill(ell(50, 50, 3, 3, 10)); },
      bg(t) { night(t, { gy: 89, moon: null, stars: [[12, 12, 2], [24, 30, 1.4], [90, 60, 1.6], [10, 52, 1.4], [92, 82, 1.3]] }); },
      fig(t) {
        // aura: raios em volta da cabeça
        t.within(ell(72, 28, 26, 24, 24), 0, m => m.rays(72, 28, 22, 13, 25, 1.4));
        // pernas finas
        const legs = [[[31, 58], [26, 72], [28, 87]], [[37, 60], [38, 74], [37, 87]], [[56, 60], [59, 74], [57, 87]], [[61, 58], [65, 72], [65, 87]]];
        const body = [[22, 53], [26, 46.5], [40, 44], [55, 44.5], [63, 47], [66, 54], [62, 61], [48, 63], [32, 62.5], [24, 59.5]];
        const neck = G.limb([[58, 49], [64, 39], [67.5, 31]], [10, 8, 7]);
        const head = [[63, 30.5], [66.5, 25.5], [73, 25], [81, 29], [85, 32.4, 1], [81, 35.6], [73, 36], [66, 35]];
        const ear = [[66.4, 26.5], [58.5, 22.6, 1], [64.6, 25.6]], tailp = [[23, 50], [17.5, 47.5, 1], [22, 53.5]];
        const antl = []; for (const s of [0, 1]) { const bx = s ? 70 : 67, base = spline([[bx, 26], [bx - 3 - s * 2, 18], [bx - 9 - s * 3, 10], [bx - 16 - s * 3, 5]], 6); antl.push(G.limb(base, taper(base, 2.6, 1.2)));
          for (const [i, len, ang] of [[6, 7, -0.2], [12, 6.5, 0.1], [17, 5, 0.3]]) { const p = base[Math.min(i, base.length - 1)]; antl.push(G.limb([p, [p[0] + Math.sin(ang) * len + (s ? 3 : 1), p[1] - Math.cos(ang) * len]], [1.8, 0.9])); } }
        // corta o bicho inteiro em branco, com um filete preto separando as partes
        const parts = [body, neck, head, ear, tailp, ...antl, ...legs.map(ch => G.limb(ch, [6, 4, 3]))];
        parts.forEach(p => t.cut(p));
        t.ink([[58, 49], [61.5, 44]], 0.8); t.ink([[30, 57], [33, 62]], 0.7); t.ink([[55, 56], [57, 61]], 0.7); // dobras
        for (const ch of legs) { const b = ch[2]; t.fill([[b[0] - 1.8, b[1] - 1], [b[0] + 1.8, b[1] - 1], [b[0] + 2, b[1] + 1.4, 1], [b[0] - 2, b[1] + 1.4, 1]]); } // cascos
        t.ink([[73, 26], [77.5, 27.4], [78.4, 30.8], [73.6, 31.4], [72.6, 28.6], [73, 26]], 0.7); // contorno do olho
        t.fill(ell(84.2, 31.8, 0.8, 0.8, 6)); t.ink([[80, 34.2], [84, 33.8]], 0.6);
        t.within(body, 2.2, m => {}); t.ink([[30, 50], [44, 48], [56, 49]], 0.6); t.ink(G.ring(50, 50, 4, 4, 12).concat([G.ring(50, 50, 4, 4, 12)[0]]), 0.7); // marca do espírito
      },
    },
    // ENRAIZAR — raízes saindo da terra e se enroscando, diante de um sol vermelho
    enraizar: {
      paper: "D8E2B6",
      redBg(t) { const d = ell(50, 40, 29, 29, 28); t.fill(d); t.rings(d, { margin: 3.5, gap: 4.5, w: 1, n: 3 }); },
      bg(t) { day(t, 89); },
      fig(t) {
        const roots = [[[16, 92], [19, 78], [14, 64], [18, 52], [27, 47], [32, 52], [27, 56]], [[33, 92], [32, 74], [36, 58], [33, 42], [38, 31], [46, 31], [44, 38]],
          [[50, 92], [51, 72], [48, 52], [51, 32], [57, 20], [65, 22], [61, 28]], [[67, 92], [66, 74], [63, 58], [67, 42], [75, 37], [79, 44], [73, 47]], [[84, 92], [81, 78], [86, 64], [83, 53], [76, 51]]];
        t.over([[4, 92, 1], [14, 85], [30, 82.5], [50, 81.5], [70, 82.5], [86, 85], [96, 92, 1]], 1.2); // monte de terra
        roots.forEach((r, i) => { const ch = spline(r, 10), ws = taper(ch, 7.5, 1.1, 0.9), p = G.limb(ch, ws); t.over(p, 1.2);
          t.within(p, 1.1, m => { for (let j = 4; j < ch.length - 10; j += 5) { const a = ch[j], b = ch[j + 3]; m.knife(a, b, 0.8); } }); });
        t.within([[4, 92, 1], [14, 85], [30, 82.5], [50, 81.5], [70, 82.5], [86, 85], [96, 92, 1]], 1, m => m.dots({ gap: 3.4, r: 0.6, box: [8, 84, 92, 92] }));
      },
    },
    // CHÁ DE ERVAS — panela de barro com ervas, vapor, fogo vermelho embaixo
    cha: {
      paper: "E9D6B0",
      red(t) { t.fill([[30, 89, 1], [33, 80, 1], [37, 85], [41, 74, 1], [45, 84], [50, 72, 1], [55, 84], [59, 75, 1], [63, 85], [67, 79, 1], [70, 89, 1]]);
        t.within([[30, 89, 1], [33, 80, 1], [37, 85], [41, 74, 1], [45, 84], [50, 72, 1], [55, 84], [59, 75, 1], [63, 85], [67, 79, 1], [70, 89, 1]], 1, m => { for (const x of [41, 50, 59]) m.knife([x, 88], [x, 78], 1); }); },
      bg(t) { day(t, 90);
        for (const [x, s] of [[30, 1], [70, -1]]) t.ink([[x, 40], [x - s * 3, 33], [x + s * 1, 26], [x - s * 3, 19], [x + s * 0.5, 12]], 1.3);
        t.ink([[50, 18], [47, 13], [51, 8.5], [48, 5]], 1.1); },
      fig(t) {
        // ervas saindo da panela
        plant(t, 44, 46, 22, -1, 3); plant(t, 56, 46, 18, 1, 3);
        // pedras do fogão
        for (const x of [24, 74]) t.over([[x - 5, 90, 1], [x - 4, 83], [x, 81.5], [x + 4, 83], [x + 5, 90, 1]], 1);
        // panela de barro com faixa de zigue-zague e pontos
        const pot = [[31, 48], [69, 48], [72, 56], [73, 66], [69, 75], [60, 79.5], [40, 79.5], [31, 75], [27, 66], [28, 56]];
        t.over(pot, 1.4); t.over([[28, 43.5, 1], [72, 43.5, 1], [71, 48.5, 1], [29, 48.5, 1]], 1);
        t.within(pot, 1.6, m => { for (let i = 0; i < 9; i++) { const x = 31 + i * 4.4; m.wedge([x, 59], [x + 2.2, 54], 1.6); m.wedge([x + 2.2, 54], [x + 4.4, 59], 1.6); }
          for (let i = 0; i < 9; i++) m.dot(32.5 + i * 4.4, 64.5, 0.75); for (let i = 0; i < 7; i++) m.knife([35 + i * 5, 68], [36 + i * 5, 76], 1.0); });
        for (const s of [-1, 1]) t.over(G.limb([[50 + s * 21, 52], [50 + s * 27, 55], [50 + s * 25, 61]], [2.6, 2.6, 2.6]), 0.8); // alças
      },
    },
    // ARAPUCA — pirâmide de varetas escorada, isca vermelha embaixo
    arapuca: {
      paper: "D8E2B6",
      red(t) { for (const [x, y] of [[62, 86.6], [66.4, 87.2], [70.6, 86.4], [64.4, 83.4], [68.6, 83.2], [66.6, 79.8]]) t.fill(ell(x, y, 2.1, 2.1, 10)); },
      bg(t) { day(t, 89); plant(t, 10, 89, 52, 1, 4); },
      fig(t) {
        const a = -0.13, cx = 20, cy = 88, rot = p => [cx + (p[0] - cx) * Math.cos(a) - (p[1] - cy) * Math.sin(a), cy + (p[0] - cx) * Math.sin(a) + (p[1] - cy) * Math.cos(a), p[2]];
        // escora (gatilho) segurando o lado direito
        t.over(G.limb([[76, 90], [74.5, 80], [73.5, 73]], [2.2, 2, 1.8]), 0.8); t.over(G.limb([[73.5, 74], [71, 70]], [1.6, 1.2]), 0.6);
        for (let i = 0; i < 8; i++) { const y = 84 - i * 6.6, w = 56 - i * 6.4, x0 = 50 - w / 2, x1 = 50 + w / 2;
          const stick = G.limb([[x0 - 2.5, y], [x1 + 2.5, y]], [3.6, 3.6]).map(rot); t.over(stick, 1.0);
          t.groove([rot([x0 + 1, y - 0.3]), rot([x1 - 1, y + 0.2])], 0.6);
          for (const x of [x0 + 1, x1 - 1]) { const st = G.limb([[x, y + 1.6], [x, y - 6.8]], [2.4, 2.4]).map(rot); t.over(st, 0.7); } }
        t.over(G.limb([[50, 30], [50, 25], [52, 19], [56, 16]].map(rot), [1.6, 1.4, 1.2, 1]), 0.6); // amarração
      },
    },
    // CORPO-SECO — figura seca, magra e vertical em negativo, costelas, olhos vermelhos; árvore morta branca
    corpo: {
      paper: "DCD4C8",
      red(t) { t.fill(ell(47.5, 25, 1.8, 1.8, 8)); t.fill(ell(56.5, 25, 1.8, 1.8, 8)); },
      bg(t) { night(t, { gy: 89, moon: [82, 16, 8] });
        const tree = [[[14, 90], [15, 70], [13, 52], [16, 36], [14, 22]], [[15, 58], [8, 50], [5, 42]], [[15, 44], [22, 36], [26, 26]], [[14, 30], [9, 20], [10, 12]], [[22, 37], [29, 37], [33, 33]]];
        tree.forEach((b, i) => { const ch = spline(b, 6); t.cut(G.limb(ch, taper(ch, i ? 2.2 : 4.4, 0.7))); }); },
      fig(t) {
        const parts = [];
        parts.push(G.ring(52, 24, 7.2, 8.8, 18)); // crânio
        parts.push(G.limb([[52, 32], [52, 36]], [3, 3])); // pescoço
        parts.push([[44, 36], [60, 36], [58, 46], [57, 56], [54, 60, 1], [50, 60, 1], [47, 56], [46, 46]]); // tronco seco
        parts.push([[46, 58, 1], [58, 58, 1], [59, 64, 1], [45, 64, 1]]); // trapo
        for (const s of [-1, 1]) { parts.push(G.limb([[52 + s * 7, 37], [52 + s * 10, 50], [52 + s * 11, 64]], [3.2, 2.6, 2.2]));
          for (let f = 0; f < 3; f++) parts.push(G.limb([[52 + s * 11, 64], [52 + s * (10 + f * 1.4), 71 + f * 0.4]], [1.3, 0.7]));
          parts.push(G.limb([[52 + s * 3.5, 62], [52 + s * 4.5, 75], [52 + s * 4, 87]], [3.6, 2.8, 2.4])); parts.push([[52 + s * 4 - 2, 86], [52 + s * 4 + 2 + s * 2, 86], [52 + s * 4 + 2.6 + s * 2.4, 88.6, 1], [52 + s * 4 - 2.4, 88.6, 1]]); }
        parts.forEach(p => t.cut(p));
        // trapo rasgado (preto) e costelas
        for (let i = 0; i < 5; i++) t.fill([[45.5 + i * 2.8, 64, 1], [47.5 + i * 2.8, 64, 1], [46.5 + i * 2.8, 67 + (i % 2) * 1.5, 1]]);
        t.fill([[45.4, 58.4, 1], [58.6, 58.4, 1], [58.8, 59.8, 1], [45.2, 59.8, 1]]);
        for (let i = 0; i < 4; i++) { const y = 40 + i * 3.6; t.ink([[47 + i * 0.4, y + 1.4], [50, y], [52, y + 0.6]], 0.75); t.ink([[57 - i * 0.4, y + 1.4], [54, y], [52, y + 0.6]], 0.75); }
        t.ink([[52, 38], [52, 54]], 0.7);
        // rosto caveira: órbitas fundas com brasa vermelha, nariz, boca costurada
        for (const x of [47.5, 56.5]) { t.fill(ell(x, 25, 3.2, 3.4, 12)); t.cut(ell(x, 25, 1.8, 1.8, 8)); }
        t.fill([[51, 28.5, 1], [53, 28.5, 1], [52, 31, 1]]); t.ink([[47.5, 33.5], [56.5, 33.5]], 0.8); for (let i = 0; i < 5; i++) t.ink([[48.6 + i * 1.8, 32.2], [48.6 + i * 1.8, 34.8]], 0.5);
        t.ink([[45.6, 19], [49, 17.6]], 0.7); t.ink([[58.4, 19], [55, 17.6]], 0.7);
        for (let i = 0; i < 4; i++) t.cut(G.limb(spline([[48 + i * 2.6, 16.5], [46 + i * 3.2, 11], [49 + i * 2.4, 6]], 4), [0.9, 0.7, 0.5, 0.4, 0.3, 0.3, 0.3, 0.3, 0.3])); // cabelo ralo
      },
    },
    // BICHO-PAPÃO — sombra enorme e redonda debruçada sobre uma casinha; olhos vermelhos, sorriso de dentes
    bicho: {
      paper: "D9CFE0",
      red(t) { t.fill(ell(31, 40, 4, 4.4, 12)); t.fill(ell(52, 40, 4, 4.4, 12)); t.fill([[80, 74, 1], [87, 74, 1], [87, 80, 1], [80, 80, 1]]); },
      bg(t) { night(t, { gy: 90, moon: [88, 14, 7] });
        t.cut([[72, 90, 1], [72, 72, 1], [83.5, 62, 1], [95, 72, 1], [95, 90, 1]]); // casinha branca
        t.fill([[70.5, 72.5, 1], [83.5, 61, 1], [96.5, 72.5, 1], [96.5, 74, 1], [83.5, 63, 1], [70.5, 74, 1]]);
        t.fill([[74, 80, 1], [78.5, 80, 1], [78.5, 90, 1], [74, 90, 1]]); t.fill([[79, 73, 1], [88, 73, 1], [88, 81, 1], [79, 81, 1]]); t.cut([[80, 74, 1], [87, 74, 1], [87, 80, 1], [80, 80, 1]]); t.fill([[83, 74, 1], [84, 74, 1], [84, 80, 1], [83, 80, 1]]); },
      fig(t) {
        // corpão redondo de borda peluda
        const pts = []; for (let i = 0; i < 46; i++) { const a = i / 46 * Math.PI * 2, r = (i % 2 ? 31 : 34.5) + Math.sin(i * 1.7) * 1.2; pts.push([42 + Math.cos(a) * r, 52 + Math.sin(a) * r * 0.96, i % 2 ? 0 : 1]); }
        const body = pts.filter(p => p[1] < 89.5).map(p => p);
        t.over(body, 1.6); t.rings(body, { margin: 2.2, gap: 3.4, w: 1, n: 4, dash: [2.2, 2] });
        // mão comprida pousando no telhado
        t.over(G.limb([[66, 60], [72, 58], [76, 62]], [6, 5, 4.5]), 1.2);
        const fingers = []; for (let i = 0; i < 4; i++) fingers.push(G.claw([75 + i * 1.6, 61], [77 + i * 3.4, 67 - i * 0.6], 1.6, 1.2)); t.group(fingers, 0.8);
        // olhos arregalados e sorriso de dentes
        for (const x of [31, 52]) { t.fill(ell(x, 40, 8.4, 8.4, 16)); t.cut(ell(x, 40, 6.4, 6.4, 16)); t.fill(ell(x + 1, 40.5, 1.7, 1.9, 8)); }
        t.groove([[22, 29], [30, 31.5], [37, 30]], 1.4); t.groove([[46, 30], [53, 31.5], [61, 29]], 1.4);
        const mouth = [[20, 55], [30, 60], [42, 61.5], [54, 60], [64, 55], [60, 64], [50, 69], [41, 70], [31, 68], [23, 63]];
        t.fill(mouth.map(([x, y]) => [x + (x - 42) * 0.08, y + (y - 62) * 0.15])); t.cut(mouth);
        for (let i = 0; i < 9; i++) { const x = 24 + i * 4.4, yt = 57 + Math.sin((i + 0.5) / 9 * Math.PI) * 3.6, yb = 64 + Math.sin((i + 0.5) / 9 * Math.PI) * 4.6;
          t.fill([[x + 2.2, yt - 0.5, 1], [x + 4.4, yt + 3.4 - Math.abs(i - 4) * 0.2, 1], [x + 6.6, yt - 0.5, 1]]); t.fill([[x, yb + 0.6, 1], [x + 2.2, yb - 3.2, 1], [x + 4.4, yb + 0.6, 1]]); }
      },
    },
    // LOBISOMEM — silhueta uivando diante da lua cheia enorme
    lobis: {
      paper: "E3DCCB",
      _h(q) { const a = 0.72, c = Math.cos(a), sn = Math.sin(a); return q.map(([x, y, k]) => [53 + (x * c - y * sn) * 1.15, 25 + (x * sn + y * c) * 1.15, k]); },
      red(t) { const H = DEF.lobis._h; t.fill(H([[-1, 0.5], [-21, -0.5], [-19, 9], [-1, 7]]));
        t.cut(H([[-17.5, 0.2, 1], [-15.5, 0.2, 1], [-16.5, 3.4, 1]])); t.cut(H([[-11, 0.8, 1], [-9, 0.8, 1], [-10, 3, 1]])); t.cut(H([[-16.5, 8, 1], [-14.4, 7.8, 1], [-15.6, 4.8, 1]])); t.cut(H([[-10.5, 7.6, 1], [-8.4, 7.4, 1], [-9.6, 5, 1]]));
        t.fill(H(ell(-6.5, -3.2, 1.5, 1.2, 8))); },
      bg(t) { night(t, { gy: 90, moon: [55, 40, 31], full: true, stars: [[10, 10, 2.2], [92, 12, 1.8], [8, 60, 1.6], [94, 70, 1.4]] });
        for (const [x, y, r] of [[72, 30, 3], [66, 58, 2.2], [78, 48, 1.6], [40, 54, 1.8]]) t.groove(G.ring(x, y, r, r * 0.8, 10), 0.8, true); },
      fig(t) {
        // pernas de trás em zigue-zague e pés
        const legs = [G.limb([[54, 62], [62, 71], [56, 80], [59, 87]], [9, 6.5, 4.5, 4]), G.limb([[46, 62], [40, 72], [45, 80], [41, 87]], [9, 6.5, 4.5, 4])];
        legs.forEach(l => t.over(l, 1.1)); for (const x of [59, 41]) t.over([[x - 3.5, 85.6], [x + 4, 85.6], [x + 5, 89, 1], [x - 4, 89, 1]], 0.8);
        // tronco com pelo espetado nas costas
        const torso = [[45, 31], [55, 27], [61, 33], [65, 44], [63, 56], [57, 65], [46, 66], [40, 58], [40, 44], [42, 36]];
        const spikes = []; for (let i = 0; i < 6; i++) { const y = 30 + i * 6, x = 58 + Math.sin(i / 5 * Math.PI) * 6.5; spikes.push([[x - 1, y - 1, 1], [x + 7, y + 1.5, 1], [x, y + 5, 1]]); }
        t.group([torso, ...spikes], 1.4); t.within(torso, 1.6, m => m.hatch({ ang: 1.25, gap: 2.4, w: 0.85, seg: [3, 6], hole: [1.5, 4] }));
        // braços com garras: um erguido, um caído
        t.over(G.limb([[46, 36], [35, 44], [29, 37]], [6, 5, 4.4]), 1.1);
        const cl1 = []; for (let i = 0; i < 4; i++) cl1.push(G.claw([29, 36], [22 + i * 1.6, 31 - i * 1.8], 1.6, -0.8)); t.group(cl1, 0.7);
        t.over(G.limb([[59, 38], [67, 50], [68, 60]], [6, 5, 4.4]), 1.1);
        const cl2 = []; for (let i = 0; i < 4; i++) cl2.push(G.claw([68, 60], [64 + i * 2.6, 67], 1.6, 0.8)); t.group(cl2, 0.7);
        // cabeça uivando para cima: focinho, mandíbula aberta, orelhas
        const H = DEF.lobis._h;
        const ruff = []; for (let i = 0; i < 7; i++) { const a = 0.5 + i * 0.42, x = 52 + Math.cos(a) * 9, y = 31 + Math.sin(a) * 6; ruff.push([[52 + Math.cos(a - 0.25) * 5, 31 + Math.sin(a - 0.25) * 4, 1], [x + Math.cos(a) * 3, y + Math.sin(a) * 3, 1], [52 + Math.cos(a + 0.25) * 5, 31 + Math.sin(a + 0.25) * 4, 1]]); }
        t.group(ruff, 1.1);
        t.group([H([[1, -6, 1], [5, -15, 1], [8.5, -4.5, 1]]), H([[-3.5, -6.5, 1], [-1.5, -14, 1], [2, -6, 1]])], 0.9); // orelhas
        t.over(H([[7, -5], [1, -7.5], [-6, -6.8], [-13, -4.6], [-20, -3.2], [-23.5, -1.6, 1], [-21.5, 0.6], [-13, 0.8], [-4, 2], [3, 5], [8, 2]]), 1.2); // crânio e focinho
        t.over(H([[-1, 4.5], [-10, 5.4], [-18, 7.6], [-19.8, 9.4, 1], [-10, 10], [-1, 9]]), 0.9); // mandíbula aberta
        t.cut(H([[-1, 0.8], [-21, -0.2], [-19.4, 8.2], [-1, 6.2]]));
        t.cut(H([[-9, -3.4, 1], [-6.5, -4.8], [-4, -3.4, 1], [-6.5, -2]])); t.fill(H(ell(-6.5, -3.4, 0.7, 0.8, 6)));
        t.fill(H(ell(-23, -1.6, 1.2, 1.2, 6))); t.groove(H([[-17, -2.6], [-11, -3.4]]), 0.7);
      },
    },
    // PISADEIRA — magra e comprida, agachada na cumeeira, unhas enormes, cabelo branco, olho vermelho
    pisa: {
      paper: "D9CFE0",
      red(t) { t.fill(ell(68.6, 24.6, 1.8, 1.4, 8)); },
      bg(t) { night(t, { gy: 100, moon: [18, 16, 10] });
        const roof = [[0, 74.5, 1], [100, 64.5, 1], [100, 100, 1], [0, 100, 1]];
        t.groove([[0, 74.2], [100, 64.2]], 1.6);
        t.within(roof, 0, m => { for (let r = 0; r < 6; r++) for (let i = 0; i < 12; i++) { const x = i * 9 + (r % 2) * 4.5, y = 74.5 - x * 0.1 + 4.5 + r * 5; m.line([[x, y], [x + 4.5, y + 2.6], [x + 9, y]], 0.9); } });
        t.fill([[80, 66.5, 1], [80, 52, 1], [90, 52, 1], [90, 65.5, 1]]); t.within([[80, 66.5, 1], [80, 52, 1], [90, 52, 1], [90, 65.5, 1]], 0, m => { m.knife([79, 56], [91, 56], 0.8); m.knife([79, 60.5], [91, 60.5], 0.8); });
        t.groove([[79.4, 66.5], [79.4, 51.5], [90.6, 51.5], [90.6, 65.5]], 1); },
      fig(t) {
        G.locks([[60, 21], [52, 22], [42, 26], [33, 33], [25, 40], [18, 45]], 4, 2.8, 2.4, 0.7, 0.8, 1.6).forEach(l => t.cut(l)); // cabelo branco ao vento
        const parts = [G.limb([[46, 62], [38, 49], [39, 70]], [6, 4.4, 3.4]), [[35.5, 69, 1], [42, 69.4], [43, 71.4, 1], [35, 71.6, 1]],
          G.limb([[47, 61], [51, 47], [57, 35]], [10, 7.5, 6]), G.limb([[52, 61], [61, 46], [57, 67.5]], [6, 4.4, 3.4]), [[54, 66.8, 1], [60, 67], [61, 69.4, 1], [53.5, 69.6, 1]],
          [[57, 31], [58, 22.5], [63, 18], [69.5, 18.5], [72.5, 23], [77.5, 28.6, 1], [72.5, 29.6], [74.4, 34.4, 1], [68, 35], [61.5, 35]]];
        t.group(parts, 1.3); tone(t, parts[2], 1.25); tone(t, parts[0], 1.9, 1.9, 0.7, 0.9); tone(t, parts[3], 1.2, 1.9, 0.7, 0.9);
        t.over(G.limb([[56.5, 36], [69, 43], [77, 55]], [4.4, 3.6, 3.2]), 1.1); tone(t, G.limb([[56.5, 36], [69, 43], [77, 55]], [4.4, 3.6, 3.2]), 0.6, 1.9, 0.7, 0.9);
        const fingers = []; for (let i = 0; i < 4; i++) fingers.push(G.limb([[77, 55], [78.5 + i * 1.8, 61.5 + i * 0.3]], [2.2, 1.2])); t.group(fingers, 0.8);
        for (let i = 0; i < 4; i++) t.cut(G.claw([78.5 + i * 1.8, 61.5 + i * 0.3], [80 + i * 2.6, 70 + i * 0.6], 1.3, 1.2)); // unhas compridas
        t.cut([[66, 24.8, 1], [68.6, 23.2], [71.4, 24.6, 1], [68.6, 26]]); t.groove([[65.5, 22.4], [71, 21.4]], 0.9);
        t.groove([[69, 31.4], [72.4, 31]], 0.8);
      },
    },
    // MULA-SEM-CABEÇA — galopando, fogo vermelho saindo do pescoço, ferraduras brancas
    mula: {
      paper: "E3DCCB",
      _fire: [[70, 40, 1], [66, 26], [70, 30], [69, 14, 1], [75, 24], [78, 6, 1], [81, 21], [89, 10, 1], [86, 25], [96, 22, 1], [88, 33], [94, 38, 1], [82, 38]],
      red(t) { t.fill(DEF.mula._fire); t.within(DEF.mula._fire, 1.4, m => { for (const [x, y] of [[72, 22], [78, 17], [85, 22], [82, 30]]) m.knife([x - 1, y + 7], [x + 1, y - 2], 1.1); });
        for (const [x, y, r] of [[62, 14, 1.2], [92, 46, 1.1], [60, 24, 0.9], [97, 30, 0.9]]) t.fill(ell(x, y, r, r, 7)); },
      bg(t) { night(t, { gy: 89, moon: [16, 16, 8] }); t.cut(DEF.mula._fire); for (const [x, y, r] of [[62, 14, 1.2], [92, 46, 1.1], [60, 24, 0.9], [97, 30, 0.9]]) t.cut(ell(x, y, r, r, 7)); },
      fig(t) {
        // rabo ao vento
        t.group(G.locks([[27, 48], [20, 46], [13, 47], [7, 52]], 3, 2.2, 2.4, 0.8, 0.5, 0.8), 1.1);
        // pernas de galope (as de trás e da frente abertas)
        const legs = [[[34, 58], [24, 64], [15, 66]], [[38, 60], [36, 71], [31, 80]], [[62, 58], [72, 64], [80, 69]], [[58, 60], [64, 70], [62, 80]]];
        const hooves = []; legs.forEach(ch => { t.over(G.limb(ch, [7, 5, 4]), 1.1); const b = ch[2], a = ch[1], d = Math.atan2(b[1] - a[1], b[0] - a[0]); hooves.push([b, d]); });
        legs.forEach(ch => tone(t, G.limb(ch, [7, 5, 4]), Math.atan2(ch[2][1] - ch[0][1], ch[2][0] - ch[0][0]), 1.9, 0.7, 1));
        hooves.forEach(([b, d]) => { const c = Math.cos(d), s = Math.sin(d), P = (u, v) => [b[0] + c * u - s * v, b[1] + s * u + c * v]; t.over([P(-0.5, -2.6), P(3.4, -3), P(3.8, 3), P(-0.5, 2.6)], 0.8); t.cut(G.claw(P(3.2, -2.4), P(3.2, 2.4), 0.9, 1.2)); });
        // corpo e pescoço cortado
        const body = [[25, 50], [32, 43], [46, 41.5], [58, 42], [66, 45], [70, 52], [67, 59], [58, 62], [36, 62], [27, 59]];
        t.over(body, 1.3); t.over(G.limb([[63, 47], [69, 41], [72, 38]], [11, 10, 9]), 1.2);
        t.within(body, 1.6, m => { for (let i = 0; i < 8; i++) { const x = 34 + i * 4; m.wedge([x, 44.5], [x + 1.8, 49.5], 1.4); m.wedge([x + 1.8, 49.5], [x + 3.6, 44.5], 1.4); } m.hatch({ ang: 0.15, gap: 2.2, w: 1.0, seg: [6, 16], hole: [1, 2.5], box: [24, 51, 72, 64], flat: true }); });
        tone(t, G.limb([[63, 47], [69, 41], [72, 38]], [11, 10, 9]), -0.8);
        t.groove([[66, 37.5], [74, 41]], 1.4); // corte do pescoço
      },
    },
    // CAPELOBO — fera peluda de pé, focinho comprido de tamanduá, garras em foice, umbigo vermelho (o ponto fraco)
    capelobo: {
      paper: "D9CFE0",
      red(t) { t.fill(ell(50, 58, 4.6, 4.6, 14)); t.cut(ell(50, 58, 2.6, 2.6, 10)); t.fill(ell(50, 58, 1.2, 1.2, 8)); t.fill(ell(56.6, 19.8, 1.5, 1.3, 8)); },
      bg(t) { night(t, { gy: 90, moon: [16, 16, 8] }); },
      fig(t) {
        const legs = [G.limb([[42, 72], [40, 88]], [9, 7]), G.limb([[57, 72], [59, 88]], [9, 7])]; legs.forEach(l => { t.over(l, 1.1); tone(t, l, 1.5); });
        for (const x of [40, 59]) t.over([[x - 5, 86], [x + 5, 86], [x + 5.6, 89.4, 1], [x - 5.6, 89.4, 1]], 0.8);
        const body = [[34, 36], [43, 28], [57, 28], [65, 36], [68, 52], [65, 68], [57, 77], [43, 77], [35, 68], [31, 52]];
        t.over(body, 1.4); t.rings(body, { margin: 1.7, gap: 3.1, w: 1, n: 4, dash: [2.4, 1.9] });
        t.over(ell(50, 58, 6.4, 6.4, 14), 1.0); t.cut(ell(50, 58, 4.6, 4.6, 14)); // umbigo
        for (const s of [-1, 1]) { const arm = G.limb([[50 + s * 14, 38], [50 + s * 24, 52], [50 + s * 22, 63]], [8, 6.5, 5.5]);
          const cl = []; for (let i = 0; i < 3; i++) cl.push(G.claw([50 + s * (20 + i * 2.2), 62], [50 + s * (14 + i * 3), 74 + i * 0.6], 2.6, s * 2.4)); t.group([arm, ...cl], 1.2);
          tone(t, arm, 1.1 * s, 1.9, 0.8, 1.2); }
        // cabeça com orelhas e focinho comprido curvado para baixo
        t.over(ell(43.5, 15.5, 2.8, 2.8, 10), 0.8); t.over(ell(55.5, 14.5, 2.8, 2.8, 10), 0.8);
        const sn = spline([[55, 24], [66, 27], [77, 32], [86, 40]], 8); const head = ell(50, 22, 9.6, 8.6, 18);
        t.group([head, G.limb(sn, taper(sn, 7.5, 2))], 1.2);
        t.within(G.limb(sn, taper(sn, 7.5, 2)), 1, m => { for (let i = 0; i < 4; i++) m.knife([62 + i * 5.5, 25 + i * 2.6], [63.4 + i * 5.5, 29 + i * 2.8], 0.8); });
        tone(t, head, 0.4, 2, 0.75, 1.4);
        t.fill(ell(56.6, 19.8, 3.4, 2.6, 10)); t.cut([[54, 20, 1], [56.6, 18.4], [59.4, 19.8, 1], [56.6, 21.4]]); t.groove([[52.5, 16.6], [59.5, 16]], 1.0);
        t.ink([[86, 40.5], [88, 44], [86.6, 47]], 0.8); // língua
      },
    },
    // PACTO — pergaminho assinado com sangue e o punhal que fez o corte
    pacto: {
      paper: "EDE3CC",
      red(t) { t.fill([[60, 66], [63, 60.5, 1], [66, 66], [65.4, 69.6], [63, 71], [60.6, 69.6]]); t.fill(ell(63, 75, 1.2, 1.6, 8)); t.fill([[64, 24, 1], [67.5, 24, 1], [66.5, 31], [65.4, 33.6], [64.4, 31]]); t.fill(ell(64.6, 38, 1.3, 1.8, 8));
        t.fill([[42, 70], [47, 67.6], [52, 70.4], [57, 67.4], [58, 68.6], [52.6, 72], [47.4, 69.6], [42.6, 72]]); },
      bg(t) { night(t, { gy: 100, moon: null, stars: [[12, 12, 2], [88, 10, 2.2], [10, 86, 1.6], [92, 88, 1.8], [20, 50, 1.4]] }); },
      fig(t) {
        const scroll = [[22, 30, 1], [76, 30, 1], [74, 52], [77, 80, 1], [23, 80, 1], [25, 55]];
        t.cut(scroll); t.cut(G.limb([[20, 30], [78, 30]], [6, 6])); t.cut(G.limb([[21, 80], [79, 80]], [6, 6]));
        t.ink([[20, 32.2], [78, 32.2]], 0.8); t.ink([[21, 78], [79, 78]], 0.8); t.ink(G.ring(19.2, 30, 1.8, 2.6, 10), 0.7); t.ink(G.ring(79.6, 80, 1.8, 2.6, 10), 0.7);
        for (let i = 0; i < 6; i++) { const y = 38 + i * 4.4, x1 = i === 5 ? 50 : 70 - (i % 3) * 3; const ln = []; for (let x = 30; x <= x1; x += 2.5) ln.push([x, y + Math.sin(x * 0.9 + i) * 0.7]); t.ink(ln, 0.75); }
        t.cut([[60, 66], [63, 60.5, 1], [66, 66], [65.4, 69.6], [63, 71], [60.6, 69.6]]); t.cut(ell(63, 75, 1.2, 1.6, 8)); // gota de sangue
        t.cut([[42, 70], [47, 67.6], [52, 70.4], [57, 67.4], [58, 68.6], [52.6, 72], [47.4, 69.6], [42.6, 72]]); // assinatura
        // punhal apontando para baixo, ponta suja de sangue
        t.cut([[63.6, 4, 1], [68, 4, 1], [68, 14, 1], [63.6, 14, 1]]); t.ink([[63.6, 6.5], [68, 6.5]], 0.6); t.ink([[63.6, 9.5], [68, 9.5]], 0.6); t.ink([[63.6, 12.4], [68, 12.4]], 0.6);
        t.cut([[58, 14, 1], [73.6, 14, 1], [73.6, 17, 1], [58, 17, 1]]); t.cut([[63.4, 17, 1], [68.2, 17, 1], [65.8, 33, 1]]); t.ink([[65.8, 18], [65.8, 28]], 0.7);
        t.cut(ell(64.6, 38, 1.3, 1.8, 8));
      },
    },
    // ALMA PENADA — fantasma branco em véu, segurando uma vela de chama vermelha
    alma: {
      paper: "E3DCCB",
      red(t) { t.fill([[80, 32, 1], [77.4, 26], [79.6, 20], [80.6, 15, 1], [82.4, 21], [83, 27], [81, 32, 1]]); },
      bg(t) { night(t, { gy: 90, moon: [16, 16, 8] });
        for (const [x, h] of [[12, 12], [88, 10]]) { t.cut([[x - 0.9, 90, 1], [x - 0.9, 90 - h, 1], [x + 0.9, 90 - h, 1], [x + 0.9, 90, 1]]); t.cut([[x - 3.6, 90 - h * 0.72, 1], [x + 3.6, 90 - h * 0.72, 1], [x + 3.6, 90 - h * 0.56, 1], [x - 3.6, 90 - h * 0.56, 1]]); }
        t.within(ell(80, 25, 15, 15, 20), 0, m => m.rays(80, 25, 18, 8, 14, 1.3)); t.cut([[80, 32, 1], [77.4, 26], [79.6, 20], [80.6, 15, 1], [82.4, 21], [83, 27], [81, 32, 1]]); },
      fig(t) {
        const ghost = [[42, 28], [45, 18], [53, 13.5], [61, 16.5], [64.5, 26], [66, 40], [69.5, 52], [72, 63], [66, 66.5], [60.5, 62], [56, 70], [48, 72.5], [38, 76.5], [26, 82.5], [12, 84, 1], [22, 76], [31, 68], [36.5, 57], [39, 45], [40.5, 35]];
        t.cut(ghost); t.cut(G.limb([[63, 40], [71, 43], [77.6, 41]], [6, 5, 4.6]));
        t.cut([[77.6, 33, 1], [82.4, 33, 1], [82.4, 46, 1], [77.6, 46, 1]]); t.ink([[77.6, 33.2], [82.4, 33.2]], 0.7); t.ink([[80, 33.4], [80, 31.6]], 0.5); // vela
        t.ink([[76.8, 39.8], [83, 39.8]], 0.7); t.ink([[76.2, 42.8], [82.8, 43.4]], 0.6);
        t.fill(ell(48.5, 27, 2.6, 3.6, 12)); t.fill(ell(57.5, 27, 2.6, 3.6, 12)); t.fill(ell(53, 37, 2.4, 3.4, 12)); // olhos e boca ocos
        for (const ch of [[[46, 44], [44, 56], [40, 66]], [[54, 46], [53, 58], [50, 68]], [[61, 46], [63, 56], [65, 62]]]) t.ink(ch, 0.8); // dobras do véu
        t.ink([[34, 72], [24, 79]], 0.6);
      },
    },
    // GRITO DA NOITE — rasga-mortalha: coruja de asas abertas gritando, ondas do grito
    grito: {
      paper: "E3DCCB",
      red(t) { t.fill([[47.6, 45, 1], [52.4, 45, 1], [50, 49.4, 1]]); t.fill([[48, 51, 1], [52, 51, 1], [50, 55, 1]]); },
      bg(t) { night(t, { gy: 100, moon: [84, 14, 7] });
        for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const r = 24 + i * 5, arc = []; for (let j = 0; j <= 6; j++) { const a = (s < 0 ? Math.PI : 0) + (j - 3) * 0.09 * (3 - i * 0.4); arc.push([50 + Math.cos(a) * r, 42 + Math.sin(a) * r]); } t.groove(arc, 1.2); } },
      fig(t) {
        // galho
        t.over([[0, 84, 1], [40, 82.5], [70, 83.5], [100, 82, 1], [100, 87, 1], [70, 88], [40, 87.5], [0, 89, 1]], 1.2);
        // asas abertas com penas
        for (const s of [-1, 1]) { const X = v => 50 + s * v; const wing = [[X(8), 50], [X(18), 40], [X(32), 30], [X(44), 24], [X(47), 28, 1], [X(45), 36, 1], [X(46), 40, 1], [X(41), 45, 1], [X(41), 50, 1], [X(35), 54, 1], [X(33), 59, 1], [X(26), 61, 1], [X(20), 66, 1], [X(12), 66]];
          t.over(wing, 1.3); t.within(wing, 1.4, m => { for (let i = 0; i < 5; i++) m.knife([X(12 + i * 4), 56 - i * 2], [X(28 + i * 4), 40 - i * 3.6], 1.0); for (let i = 0; i < 6; i++) m.dot(X(14 + i * 3.2), 48 - i * 1.4, 0.6); }); }
        const body = ell(50, 62, 13, 18, 20); t.over(body, 1.3); t.within(body, 1.6, m => m.dots({ gap: 3.2, r: 0.6, box: [38, 60, 62, 80] }));
        const talons = []; for (const x of [45, 55]) for (let i = 0; i < 3; i++) talons.push(G.claw([x, 78], [x - 2.4 + i * 2.4, 85], 1.3, 0.4)); t.group(talons, 0.6);
        const head = ell(50, 42, 15, 13, 20); t.over(head, 1.3);
        t.cut([[50, 34], [55, 31], [61.5, 31.5], [64, 37], [62.5, 45], [57, 51], [50, 57, 1], [43, 51], [37.5, 45], [36, 37], [38.5, 31.5], [45, 31]]); // disco do rosto
        t.ink([[50, 35], [50, 44]], 0.8);
        for (const x of [44, 56]) { t.fill(ell(x, 41, 2.8, 3, 12)); t.cut(ell(x - 0.8, 40.2, 0.7, 0.7, 6)); }
        t.ink([[47.4, 44.8], [52.6, 44.8]], 0.6); t.ink([[47.6, 50.6], [52.4, 50.6]], 0.6);
      },
    },
    // ASSOMBRAÇÃO — cruz de cova diante da lua vermelha; mão de osso saindo da terra
    assomb: {
      paper: "E3DCCB",
      redBg(t) { t.fill(ell(56, 36, 23, 23, 26)); },
      bg(t) { night(t, { gy: 86, moon: null, stars: [[12, 10, 2.2], [24, 24, 1.4], [90, 70, 1.4], [8, 50, 1.6], [92, 12, 1.6]] }); t.cut(ell(56, 36, 23, 23, 26)); },
      fig(t) {
        // cova e cruz
        t.over([[30, 88, 1], [36, 80], [50, 77], [66, 77], [80, 80], [86, 88, 1]], 1.2);
        t.within([[30, 88, 1], [36, 80], [50, 77], [66, 77], [80, 80], [86, 88, 1]], 1.2, m => m.dots({ gap: 3.2, r: 0.7, box: [34, 78, 84, 88] }));
        const cross = [[[54, 80], [54, 20]], [[42, 33], [70, 33]]]; t.group(cross.map(([a, b]) => G.limb([a, b], [6, 6])), 1.3);
        t.within(G.limb([[54, 80], [54, 20]], [6, 6]), 1.2, m => m.hatch({ ang: Math.PI / 2, gap: 1.8, w: 0.6, seg: [4, 9], hole: [1, 3] }));
        // mão de osso subindo da terra (branca)
        const bones = [G.limb([[24, 90], [25, 78], [26, 68]], [3.6, 3, 2.6]), ell(26.5, 64.5, 4.2, 3.6, 12)];
        for (const [dx, h, a] of [[-4, 9, -0.35], [-1.4, 11, -0.1], [1.4, 11, 0.1], [4, 9, 0.35]]) { const b = [26.5 + dx, 62], e = [b[0] + Math.sin(a) * h, b[1] - Math.cos(a) * h]; bones.push(G.limb([b, [(b[0] + e[0]) / 2, (b[1] + e[1]) / 2], e], [1.7, 1.6, 1.3])); }
        bones.push(G.limb([[22.5, 66], [17.5, 61], [16, 56]], [1.7, 1.5, 1.3]));
        bones.forEach(b => t.cut(b));
        for (const [dx, h, a] of [[-4, 9, -0.35], [-1.4, 11, -0.1], [1.4, 11, 0.1], [4, 9, 0.35]]) { const b = [26.5 + dx, 62], m = [b[0] + Math.sin(a) * h * 0.5, b[1] - Math.cos(a) * h * 0.5]; t.ink([[m[0] - 0.9, m[1]], [m[0] + 0.9, m[1]]], 0.5); }
        t.ink([[25.2, 76], [26.4, 76]], 0.5); t.groove([[14, 89], [20, 87], [30, 87.6], [36, 89]], 1.2);
      },
    },
    // ---- casas de terreno (sem moldura: viram o chão do tabuleiro) ----
    ter_mata: { paper: "CFDDB0", noFrame: true,
      fig(t) { for (const [x, b, tp, sd] of [[16, 100, 30, 1], [50, 100, 18, -1], [84, 100, 32, -1], [33, 100, 52, 1], [67, 100, 50, 1]]) plant(t, x, b, tp, sd, 5);
        for (const x of [6, 26, 44, 60, 78, 94]) t.over([[x - 5, 100, 1], [x - 4, 88, 1], [x - 1.5, 94], [x, 84, 1], [x + 1.5, 94], [x + 4, 88, 1], [x + 5, 100, 1]], 0.8); } },
    ter_rio: { paper: "B4CFD8", noFrame: true,
      fig(t) { for (let r = 0; r < 7; r++) { const y = 8 + r * 14, ph = r % 2 ? 6 : 0, w = []; for (let x = -10; x <= 110; x += 3) w.push([x, y + Math.sin((x + ph) / 6) * 3]);
          const top = w.map(([x, y]) => [x, y - 2.2]), bot = w.map(([x, y]) => [x, y + 2.2]).reverse(); t.fill([...top, ...bot]); }
        t.over([[30, 47], [40, 42], [52, 43], [60, 47, 1], [66, 42, 1], [66, 53, 1], [60, 48, 1], [52, 52], [40, 52]], 1.4); t.cut(ell(37, 46, 1.2, 1.2, 8)); t.groove([[44, 44], [44, 50]], 0.9); } },
    ter_encru: { paper: "E8D3A8", noFrame: true,
      red(t) { for (const [x, y] of [[38, 44], [62, 44], [50, 56]]) t.fill([[x - 1.6, y - 4], [x, y - 10, 1], [x + 1.6, y - 4], [x, y - 2.6]]); },
      fig(t) { t.fill([[0, 0, 1], [100, 0, 1], [100, 100, 1], [0, 100, 1]]);
        t.within([[0, 0, 1], [100, 0, 1], [100, 100, 1], [0, 100, 1]], 0, m => { for (let i = 0; i < 40; i++) { const x = (i * 37) % 100, y = (i * 61) % 100; m.wedge([x, y + 3], [x + 0.8, y - 1.5], 1.3); } });
        for (const [a, b] of [[[-5, -5], [105, 105]], [[105, -5], [-5, 105]]]) t.cut(G.limb([a, b], [30, 30]));
        for (const [a, b] of [[[-5, -5], [105, 105]], [[105, -5], [-5, 105]]]) for (const s of [-1, 1]) t.groove([[a[0] + s * 9, a[1] - s * 9], [b[0] + s * 9, b[1] - s * 9]], 0.7);
        for (const [x, y] of [[38, 44], [62, 44], [50, 56]]) { t.cut([[x - 2.6, y - 3.5], [x, y - 11, 1], [x + 2.6, y - 3.5], [x, y - 1.5]]); t.over([[x - 2.4, y - 3, 1], [x + 2.4, y - 3, 1], [x + 2.4, y + 7, 1], [x - 2.4, y + 7, 1]], 0.8); t.ink([[x, y - 3.4], [x, y - 5]], 0.6); } } },
  });
})();
