(() => {
  const $ = id => document.getElementById(id);
  const K = CD, CARDS = K.CARDS, FAC = K.FACTIONS, TERR = K.TERR, BW = K.BW, BH = K.BH, INK = ART.INK, RED = "#E8402F";
  const cv = $("cv"), ctx = cv.getContext("2d");
  // tabuleiro reto em 2D; os personagens são miniaturas 3D (FIGS) que viram para onde andam
  let is3D = false; $("gl").hidden = true; const figOK = () => typeof FIGS !== "undefined" && FIGS.ok(); const face = new Map();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TURN_S = 45, HEART = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 18 2 9.5A4.6 4.6 0 0 1 10 4a4.6 4.6 0 0 1 8 5.5Z" fill="#E0473A" stroke="#2A1E16" stroke-width="1.6"/></svg>';
  const GEN_ART = { Curupira: "curupira", Cuca: "cuca" };
  const SHORT = { saci: "Saci", coral: "Cobra-coral", uira: "Uirapuru", onca: "Onça", caipora: "Caipora", anhanga: "Anhangá", mapin: "Mapinguari", enraizar: "Enraizar", cha: "Chá", arapuca: "Arapuca",
    corpo: "Corpo-seco", bicho: "Bicho-papão", lobis: "Lobisomem", pisa: "Pisadeira", mula: "Mula", capelobo: "Capelobo", pacto: "Pacto", alma: "Alma penada", grito: "Grito", assomb: "Assombração" };
  let g = null, mode = "bot", myFac = "mata", level = "normal", sound = true, bot = null, viewer = 0;
  let sel = null, inspect = null, say = null, anims = [], floats = [], ghosts = [], parts = [], dpos = new Map(), dhp = new Map(), dscale = new Map(), clock = 0, fx = [], shake = { amp: 0, t0: 0, d: 0.3 }, ver = 0, pv = { key: "", list: [] }, busyUntil = 0, botWait = 0, turnStart = 0, paused = false, pauseAt = 0, ended = false;
  const stats = [{ dmg: 0, kills: 0, played: 0 }, { dmg: 0, kills: 0, played: 0 }];
  const view = { w: 1, h: 1, dpr: 1, t: 60, ox: 0, oy: 0 };
  try { const o = JSON.parse(localStorage.getItem("pj-save") || "{}"); myFac = o.fac || myFac; level = o.level || level; mode = o.mode || mode; sound = o.sound ?? true; } catch (e) {}
  const save = () => { try { localStorage.setItem("pj-save", JSON.stringify({ fac: myFac, level, mode, sound })); } catch (e) {} };

  // ---------- medidas: tabuleiro e cartas se ajustam à tela ----------
  function layout() { const W = $("app").clientWidth, nc = Math.max(5, $("hand").children.length), cw = Math.floor(Math.min(78, (W - 16 - (nc - 1) * 5) / nc)), ch = Math.round(cw * 1.32), app = $("app");
    app.style.setProperty("--cw", cw + "px"); app.style.setProperty("--ch", ch + "px");
    const n = $("hand").children.length, room = W - 16, need = n * cw + (n - 1) * 5; app.style.setProperty("--gap", (need > room && n > 1 ? Math.floor((room - n * cw) / (n - 1)) : 5) + "px"); }
  function resize() { layout(); FX.clear(); const r = cv.getBoundingClientRect(); view.w = Math.max(1, r.width); view.h = Math.max(1, r.height); view.dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(view.w * view.dpr); cv.height = Math.round(view.h * view.dpr); const head = figOK() ? 0.6 : 0; view.t = Math.floor(Math.min((view.w - 12) / BW, (view.h - 10) / (BH + head))); view.ox = Math.round((view.w - view.t * BW) / 2); view.oy = Math.round((view.h - view.t * (BH + head)) / 2 + view.t * head);
    if (is3D) { ISO.resize(view.w, view.h, view.dpr); view.t = ISO.tilePx(); } }
  new ResizeObserver(resize).observe($("stage"));
  // o tabuleiro gira para quem está jogando ficar sempre embaixo
  const sxy = (x, y) => viewer === 0 ? [x, y] : [BW - 1 - x, BH - 1 - y];
  // no 3D, SX/SY dão o centro do retrato da miniatura naquela casa
  const SX = (x, y) => is3D ? ISO.project(x, y, 0.58, viewer)[0] : view.ox + (sxy(x, y)[0] + 0.5) * view.t, SY = (x, y) => is3D ? ISO.project(x, y, 0.58, viewer)[1] : view.oy + (sxy(x, y)[1] + 0.5) * view.t;
  const human = o => mode === "hot" || o === 0;

  // ---------- desenho: tabuleiro claro, fichas redondas com a cor do time ----------
  const YOU = "#2F7FD8", FOE = "#E0473A", GOLD = "#F2B632", CREAM = "#FFF8EA", FONT = '"Lilita One", "Alfa Slab One", Georgia, sans-serif';
  const teamCol = o => (o === viewer ? YOU : FOE);
  function rrect(k, x, y, w, h, r) { k.beginPath(); k.roundRect(x, y, w, h, r); }
  function heart(k, x, y, r) { k.beginPath(); k.moveTo(x, y + r * 0.9); k.bezierCurveTo(x - r * 1.6, y - r * 0.1, x - r * 0.8, y - r * 1.3, x, y - r * 0.45); k.bezierCurveTo(x + r * 0.8, y - r * 1.3, x + r * 1.6, y - r * 0.1, x, y + r * 0.9); k.closePath(); }
  function pieceOf(u, alpha) { const p = dpos.get(u.id) || u, sc = dscale.has(u.id) ? dscale.get(u.id) : 1, isSel = sel && sel.k === "unit" && sel.id === u.id;
    const ready = u.o === g.cur && human(u.o) && !g.over && !busy() && !(sel && sel.k !== "unit") && (g.moves(u).length || g.attacks(u).length), tired = u.o === g.cur && human(u.o) && !g.over && !busy() && !ready && alpha === 1;
    return { key: u.id, art: u.gen ? GEN_ART[u.card] : u.card, team: teamCol(u.o), gen: !!u.gen, x: p.x, y: p.y, lift: isSel ? 0.1 : 0, scale: sc, alpha, tired, ready, sel: isSel, pulse: 0.45 + 0.4 * Math.sin(clock * 5) }; }
  function draw3D() {
    const k = ctx, t = view.t; k.setTransform(view.dpr, 0, 0, view.dpr, 0, 0); k.clearRect(0, 0, view.w, view.h); if (!g) return;
    if (ISO.needBoard(g, viewer)) ISO.buildBoard(g, viewer);
    const sq = shake.amp > 0 ? Math.max(0, 1 - (clock - shake.t0) / shake.d) : 0; let sh = null; if (sq > 0 && clock >= shake.t0) { const a = shake.amp * sq * sq / t; sh = [(Math.random() - 0.5) * 2 * a, (Math.random() - 0.5) * 2 * a]; }
    const hl = highlights(), allyT = hl.place.filter(([x, y]) => g.at(x, y)), placeT = hl.place.filter(([x, y]) => !g.at(x, y));
    const list = g.units.map(u => pieceOf(u, 1)).concat(ghosts.map(gh => pieceOf(gh.u, gh.alpha)));
    ISO.syncPieces(list, viewer); ISO.setMarks({ place: placeT, move: hl.move, target: hl.target, ally: allyT }, viewer, clock); ISO.render(clock, sh);
    for (const tr of g.traps) if (tr.o === viewer || (mode === "bot" && tr.o === 0)) { const [x, y] = ISO.project(tr.x, tr.y, 0.02, viewer); k.globalAlpha = 0.8; k.drawImage(ART.token("arapuca", 96), x - t * 0.22, y - t * 0.22, t * 0.44, t * 0.44); k.globalAlpha = 1; }
    for (const pc of list) overlayUnit(k, pc);
    drawEffects(k, hl);
  }
  // números e selos por cima da miniatura (2D, sempre nítidos)
  function overlayUnit(k, pc) { const u = g.units.find(z => z.id === pc.key) || (ghosts.find(gh => gh.u.id === pc.key) || {}).u; if (!u || pc.scale <= 0.05) return;
    const t = view.t, rad = (pc.gen ? 0.46 : 0.41) * pc.scale, [x, y] = ISO.project(pc.x, pc.y, 0.17 + (rad + 0.05) * 0.92 + pc.lift, viewer), R = rad * t, hp = dhp.has(u.id) ? dhp.get(u.id) : u.hp;
    k.save(); k.globalAlpha = pc.alpha;
    if (pc.gen) { const w = R * 0.42, cy = y - R - 2; k.fillStyle = GOLD; k.beginPath(); k.moveTo(x - w, cy + w * 0.5); k.lineTo(x - w, cy - w * 0.45); k.lineTo(x - w * 0.5, cy); k.lineTo(x, cy - w * 0.65); k.lineTo(x + w * 0.5, cy); k.lineTo(x + w, cy - w * 0.45); k.lineTo(x + w, cy + w * 0.5); k.closePath(); k.fill(); k.lineWidth = 2; k.strokeStyle = INK; k.stroke(); }
    const b = Math.max(10, R * 0.36), fs = Math.max(13, Math.round(b * 1.2)); k.font = `${fs}px ${FONT}`; k.textAlign = "center"; k.textBaseline = "middle";
    const ax = x - R * 0.86, ay = y + R * 0.7; k.fillStyle = GOLD; k.beginPath(); k.arc(ax, ay, b, 0, 7); k.fill(); k.lineWidth = 2; k.strokeStyle = INK; k.stroke(); k.fillStyle = INK; k.fillText(g.atkOf(u), ax, ay + 1);
    const hx = x + R * 0.86, hy = y + R * 0.7; heart(k, hx, hy + 1, b * 1.08); k.fillStyle = hp < u.max ? "#C81E2C" : "#E0473A"; k.fill(); k.stroke();
    k.lineWidth = 3; k.strokeStyle = INK; k.strokeText(Math.max(0, hp), hx, hy + 1); k.fillStyle = "#FFFFFF"; k.fillText(Math.max(0, hp), hx, hy + 1);
    if (u.rooted || u.stunned || (u.sick && u.o === g.cur && human(u.o))) { const lab = u.stunned ? "TONTO" : u.rooted ? "PRESO" : "zzz", w = lab === "zzz" ? R * 0.9 : R * 1.4, hh = Math.max(14, R * 0.38), ly = y - R * 0.95;
      k.fillStyle = lab === "zzz" ? "#FFFFFF" : FOE; rrect(k, x - w / 2, ly, w, hh, hh / 2); k.fill(); k.lineWidth = 1.6; k.strokeStyle = INK; k.stroke(); k.fillStyle = lab === "zzz" ? "#5A4D40" : "#FFFFFF"; k.font = `800 ${Math.round(hh * 0.62)}px Nunito, sans-serif`; k.fillText(lab, x, ly + hh / 2 + 0.5); }
    k.restore(); }
  function draw() { if (is3D) return draw3D();
    const k = ctx, t = view.t; k.setTransform(view.dpr, 0, 0, view.dpr, 0, 0); k.clearRect(0, 0, view.w, view.h); if (!g) return;
    const sq = shake.amp > 0 ? Math.max(0, 1 - (clock - shake.t0) / shake.d) : 0; if (sq > 0 && clock >= shake.t0) { const a = shake.amp * sq * sq; k.translate((Math.random() - 0.5) * 2 * a, (Math.random() - 0.5) * 2 * a); }
    k.fillStyle = INK; rrect(k, view.ox - 6, view.oy - 6, t * BW + 12, t * BH + 12, 14); k.fill();
    k.save(); rrect(k, view.ox, view.oy, t * BW, t * BH, 9); k.clip();
    for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) { const [vx, vy] = sxy(x, y), px = view.ox + vx * t, py = view.oy + vy * t, tr = g.ter(x, y);
      k.fillStyle = (x + y) % 2 ? "#F1E6CC" : "#FAF3E3"; k.fillRect(px, py, t, t);
      if (tr) k.drawImage(ART.img("ter_" + tr, 128), px, py, t, t);
      k.strokeStyle = "rgba(42,30,22,0.13)"; k.lineWidth = 1; k.strokeRect(px + 0.5, py + 0.5, t - 1, t - 1); }
    // meio do campo
    k.strokeStyle = "rgba(42,30,22,0.25)"; k.lineWidth = 2; k.setLineDash([6, 6]); k.beginPath(); k.moveTo(view.ox, view.oy + 3.5 * t); k.lineTo(view.ox + BW * t, view.oy + 3.5 * t); k.stroke(); k.setLineDash([]);
    k.restore();
    for (const tr of g.traps) if (tr.o === viewer || (mode === "bot" && tr.o === 0)) { const x = SX(tr.x, tr.y), y = SY(tr.x, tr.y); k.globalAlpha = 0.75; k.drawImage(ART.token("arapuca", 96), x - t * 0.24, y - t * 0.24, t * 0.48, t * 0.48); k.globalAlpha = 1; }
    const hl = highlights();
    const placeUnits = hl.place.filter(([x, y]) => g.at(x, y)); hl.place = hl.place.filter(([x, y]) => !g.at(x, y));
    for (const [x, y] of hl.place) { const px = SX(x, y), py = SY(x, y); k.fillStyle = "rgba(242,182,50,0.28)"; rrect(k, px - t / 2 + 4, py - t / 2 + 4, t - 8, t - 8, 10); k.fill(); k.strokeStyle = "#D99A1E"; k.lineWidth = 3; k.setLineDash([7, 5]); k.stroke(); k.setLineDash([]); }
    for (const [x, y] of hl.move) { k.fillStyle = "rgba(47,127,216,0.85)"; k.beginPath(); k.arc(SX(x, y), SY(x, y), t * 0.12, 0, 7); k.fill(); k.strokeStyle = "#FFFFFF"; k.lineWidth = 3; k.stroke(); }
    for (const [x, y] of hl.target) { const px = SX(x, y), py = SY(x, y), r = t * 0.47; k.strokeStyle = FOE; k.lineWidth = 4; k.setLineDash([8, 5]); k.lineDashOffset = -clock * 30; k.beginPath(); k.arc(px, py, r, 0, 7); k.stroke(); k.setLineDash([]); }
    const order = g.units.slice().sort((a, b) => SY(a.x, a.y) - SY(b.x, b.y));
    const all = order.map(u => [u, 1]).concat(ghosts.map(gh => [gh.u, gh.alpha])).sort((a, b) => SY(a[0].x, a[0].y) - SY(b[0].x, b[0].y));
    for (const [u, a] of all) drawUnit(k, u, a);
    // Todos os números/selos por cima de TODOS os bonecos e partículas.
    if (figOK()) for (const [u, a] of all) drawFig(k, u, a, true);
    for (const [x, y] of placeUnits) { k.strokeStyle = "#2E9E4F"; k.lineWidth = 5; k.setLineDash([8, 5]); k.lineDashOffset = -clock * 30; k.beginPath(); k.arc(SX(x, y), SY(x, y), t * 0.47, 0, 7); k.stroke(); k.setLineDash([]); }
    drawEffects(k, hl);
  }
  function drawEffects(k, hl) {
    for (const f of fx) { if (clock < f.t0) continue; const q = (clock - f.t0) / f.d; if (q > 1) continue; drawStar(k, f, q); }
    if (hl.preview) for (const pr of hl.preview) drawPreview(k, pr);
    for (const p of parts) { k.globalAlpha = Math.max(0, 1 - p.life / p.max); k.fillStyle = p.c; k.beginPath(); k.arc(p.x, p.y, p.s / 2, 0, 7); k.fill(); } k.globalAlpha = 1;
    for (const f of floats) { if (clock < f.t0) continue; const a = (clock - f.t0) / f.d; if (a > 1) continue; k.globalAlpha = a > 0.7 ? (1 - a) / 0.3 : 1;
      const pop = f.pop ? 1 + 0.7 * Math.max(0, 1 - a / 0.14) : 1, rise = f.pop ? a * 14 : a * 22; k.font = `${Math.round(f.size * pop)}px ${FONT}`; k.textAlign = "center"; k.textBaseline = "middle"; k.lineJoin = "round";
      k.lineWidth = f.pop ? 8 : 6; k.strokeStyle = f.pop ? INK : "#FFFFFF"; k.strokeText(f.text, f.x, f.y - rise); k.fillStyle = f.pop ? "#FFFFFF" : f.c; if (f.pop) { k.fillStyle = f.c; } k.fillText(f.text, f.x, f.y - rise); } k.globalAlpha = 1;
    }
  // estrela de impacto (estilo gibi)
  function drawStar(k, f, q) { const r = f.r * (q < 0.25 ? 0.3 + 0.95 * (q / 0.25) : 1.25 - 0.25 * (q - 0.25) / 0.75); k.save(); k.globalAlpha = q > 0.6 ? (1 - q) / 0.4 : 1; k.translate(f.x, f.y); k.rotate(f.rot);
    const star = (R, ri, n) => { k.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, rr = i % 2 ? ri : R * (0.8 + 0.2 * Math.sin(i * 7.3)); k.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } k.closePath(); };
    star(r, r * 0.5, 9); k.fillStyle = "#FFD23F"; k.fill(); k.lineWidth = 3; k.strokeStyle = INK; k.stroke(); star(r * 0.6, r * 0.32, 9); k.fillStyle = "#F57C2A"; k.fill(); star(r * 0.28, r * 0.14, 6); k.fillStyle = "#FFFFFF"; k.fill(); k.restore(); }
  // etiqueta de prévia em cima do alvo
  function drawPreview(k, pr) { const t = view.t, x = SX(pr.x, pr.y), y = SY(pr.x, pr.y) - t * 0.33, w = t * 0.96, h = t * 0.4; k.save();
    k.fillStyle = "rgba(42,30,22,0.3)"; rrect(k, x - w / 2 + 1, y - h / 2 + 3, w, h, 9); k.fill(); k.fillStyle = "#FFFFFF"; rrect(k, x - w / 2, y - h / 2, w, h, 9); k.fill(); k.strokeStyle = INK; k.lineWidth = 2; k.stroke();
    k.textAlign = "center"; k.textBaseline = "middle"; const big = Math.max(14, Math.round(t * 0.21)), small = Math.max(10, Math.round(t * 0.135));
    k.font = `${big}px ${FONT}`; k.fillStyle = FOE; k.fillText(pr.kills ? "☠ derruba" : "−" + pr.dealt, x, y - h * 0.17);
    k.font = `800 ${small}px Nunito, sans-serif`; k.fillStyle = pr.dies ? FOE : "#5A4D40"; k.fillText(pr.dies ? "e você cai ☠" : pr.taken ? `revida −${pr.taken}` : "sem revide", x, y + h * 0.26); k.restore(); }
  function predict(u) { const key = u.id + ":" + ver; if (pv.key === key) return pv.list; const list = [];
    for (const t of g.attacks(u)) { const h = g.clone(); h.apply({ c: "attack", id: u.id, x: t.x, y: t.y }); const ta = h.units.find(z => z.id === t.id), ua = h.units.find(z => z.id === u.id);
      list.push({ x: t.x, y: t.y, dealt: t.hp - Math.max(0, ta ? ta.hp : 0), kills: !ta || ta.hp <= 0, taken: Math.max(0, u.hp - Math.max(0, ua ? ua.hp : 0)), dies: !ua || ua.hp <= 0 }); }
    pv.key = key; pv.list = list; return list; }
  function faceDir(u) { const f = face.get(u.id) || (u.o === 0 ? [0, -1] : [0, 1]); return FIGS.dirOf(viewer === 0 ? f[0] : -f[0], viewer === 0 ? f[1] : -f[1]); }
  function drawFig(k, u, alpha, labels = false) {
    const t = view.t, p = dpos.get(u.id) || u, x = SX(p.x, p.y), y0 = SY(p.x, p.y), sc = dscale.has(u.id) ? dscale.get(u.id) : 1; if (sc <= 0) return;
    const col = teamCol(u.o), dark = u.o === viewer ? "#245FA6" : "#B8352B", hp = dhp.has(u.id) ? dhp.get(u.id) : u.hp, isSel = sel && sel.k === "unit" && sel.id === u.id;
    const by = y0 + t * 0.26, rw = t * 0.4 * sc, rh = t * 0.15 * sc, th = t * 0.07 * sc, lift = isSel ? t * 0.07 : 0;
    k.save(); k.globalAlpha = alpha;
    const h = t * 1.78 * sc, w = h * 0.8;
    if (!labels) {
      const ready = u.o === g.cur && human(u.o) && !g.over && !busy() && !(sel && sel.k !== "unit") && (g.moves(u).length || g.attacks(u).length), tired = u.o === g.cur && human(u.o) && !g.over && !busy() && !ready && alpha === 1;
      k.fillStyle = "rgba(42,30,22,0.25)"; k.beginPath(); k.ellipse(x + 2, by + th + 3, rw * 1.02, rh * 1.05, 0, 0, 7); k.fill();
      if (ready || isSel) { const pulse = isSel ? 1 : 0.55 + 0.45 * Math.sin(clock * 5); k.globalAlpha = alpha * pulse; k.strokeStyle = GOLD; k.lineWidth = isSel ? 6 : 4; k.beginPath(); k.ellipse(x, by + th / 2, rw + 5, rh + 4, 0, 0, 7); k.stroke(); k.globalAlpha = alpha; }
      k.fillStyle = dark; k.beginPath(); k.ellipse(x, by + th, rw, rh, 0, 0, Math.PI); k.lineTo(x - rw, by); k.ellipse(x, by, rw, rh, 0, Math.PI, 0, true); k.closePath(); k.fill(); k.lineWidth = 2; k.strokeStyle = INK; k.stroke();
      k.fillStyle = col; k.beginPath(); k.ellipse(x, by, rw, rh, 0, 0, 7); k.fill(); k.stroke();
      if (u.gen) { k.strokeStyle = GOLD; k.lineWidth = 3; k.beginPath(); k.ellipse(x, by, rw - 4, rh - 3, 0, 0, 7); k.stroke(); }
      const art = u.gen ? GEN_ART[u.card] : u.card, dir = faceDir(u), sp = FIGS.sprite(art, 256, 320, dir);
      if (tired) k.globalAlpha = alpha * 0.62; k.drawImage(sp, x - w / 2, by - lift - h * 0.885, w, h); k.globalAlpha = alpha;
      if (art === "mula") FX.paint(k, u.id, FIGS.anchors(art, dir), x - w / 2, by - lift - h * 0.885, w, h, alpha * (tired ? 0.62 : 1), by - lift);
      k.restore(); return;
    }
    const b = Math.max(10, t * 0.16), fs = Math.max(13, Math.round(b * 1.2)); k.font = `${fs}px ${FONT}`; k.textAlign = "center"; k.textBaseline = "middle";
    const ax = x - rw * 0.98, ay = by + rh * 0.55; k.fillStyle = GOLD; k.beginPath(); k.arc(ax, ay, b, 0, 7); k.fill(); k.lineWidth = 2; k.strokeStyle = INK; k.stroke(); k.fillStyle = INK; k.fillText(g.atkOf(u), ax, ay + 1);
    const hx = x + rw * 0.98, hy = by + rh * 0.55, hurt = hp < u.max; heart(k, hx, hy + 1, b * 1.08); k.fillStyle = hurt ? "#C81E2C" : "#E0473A"; k.fill(); k.stroke();
    k.lineWidth = 3; k.strokeStyle = INK; k.strokeText(Math.max(0, hp), hx, hy + 1); k.fillStyle = "#FFFFFF"; k.fillText(Math.max(0, hp), hx, hy + 1);
    if (u.gen) { const cw = t * 0.13, cy = by + rh * 0.9; k.fillStyle = GOLD; k.beginPath(); k.moveTo(x - cw, cy + cw * 0.5); k.lineTo(x - cw, cy - cw * 0.45); k.lineTo(x - cw * 0.5, cy); k.lineTo(x, cy - cw * 0.65); k.lineTo(x + cw * 0.5, cy); k.lineTo(x + cw, cy - cw * 0.45); k.lineTo(x + cw, cy + cw * 0.5); k.closePath(); k.fill(); k.lineWidth = 1.8; k.strokeStyle = INK; k.stroke(); }
    if (u.rooted || u.stunned || (u.sick && u.o === g.cur && human(u.o))) { const lab = u.stunned ? "TONTO" : u.rooted ? "PRESO" : "zzz", ww = lab === "zzz" ? t * 0.36 : t * 0.56, hh = Math.max(14, t * 0.2), ly = by - h * 0.86;
      k.fillStyle = lab === "zzz" ? "#FFFFFF" : FOE; rrect(k, x - ww / 2, ly, ww, hh, hh / 2); k.fill(); k.lineWidth = 1.6; k.strokeStyle = INK; k.stroke(); k.fillStyle = lab === "zzz" ? "#5A4D40" : "#FFFFFF"; k.font = `800 ${Math.round(hh * 0.62)}px Nunito, sans-serif`; k.fillText(lab, x, ly + hh / 2 + 0.5); }
    k.restore();
  }
  function drawUnit(k, u, alpha) { if (figOK()) return drawFig(k, u, alpha);
    const t = view.t, p = dpos.get(u.id) || u, x = SX(p.x, p.y) + (p.ox || 0), y = SY(p.x, p.y) + (p.oy || 0), sc = dscale.has(u.id) ? dscale.get(u.id) : 1; if (sc <= 0) return;
    const d = t * (u.gen ? 0.9 : 0.82) * sc, R = d / 2, rw = Math.max(4, d * 0.09), col = teamCol(u.o), hp = dhp.has(u.id) ? dhp.get(u.id) : u.hp, isSel = sel && sel.k === "unit" && sel.id === u.id;
    const ready = u.o === g.cur && human(u.o) && !g.over && !busy() && !(sel && sel.k !== "unit") && (g.moves(u).length || g.attacks(u).length), tired = u.o === g.cur && human(u.o) && !g.over && !ready;
    k.save(); k.globalAlpha = alpha;
    k.fillStyle = "rgba(42,30,22,0.28)"; k.beginPath(); k.ellipse(x + 1, y + R * 0.18 + 2, R * 0.98, R * 0.9, 0, 0, 7); k.fill();
    if (ready || isSel) { const pulse = isSel ? 1 : 0.6 + 0.4 * Math.sin(clock * 5); k.strokeStyle = GOLD; k.globalAlpha = alpha * pulse; k.lineWidth = isSel ? 6 : 4; k.beginPath(); k.arc(x, y, R + 4, 0, 7); k.stroke(); k.globalAlpha = alpha; }
    k.fillStyle = col; k.beginPath(); k.arc(x, y, R, 0, 7); k.fill(); k.lineWidth = 2.2; k.strokeStyle = INK; k.stroke();
    k.drawImage(ART.token(u.gen ? GEN_ART[u.card] : u.card, 192), x - R + rw, y - R + rw, (R - rw) * 2, (R - rw) * 2);
    k.lineWidth = 2; k.strokeStyle = INK; k.beginPath(); k.arc(x, y, R - rw, 0, 7); k.stroke();
    if (tired) { k.fillStyle = "rgba(250,243,227,0.45)"; k.beginPath(); k.arc(x, y, R - rw, 0, 7); k.fill(); }
    if (u.gen) { const w = d * 0.22, cy = y - R - 1; k.fillStyle = GOLD; k.beginPath(); k.moveTo(x - w, cy + w * 0.5); k.lineTo(x - w, cy - w * 0.45); k.lineTo(x - w * 0.5, cy); k.lineTo(x, cy - w * 0.65); k.lineTo(x + w * 0.5, cy); k.lineTo(x + w, cy - w * 0.45); k.lineTo(x + w, cy + w * 0.5); k.closePath(); k.fill(); k.lineWidth = 2; k.strokeStyle = INK; k.stroke(); }
    const b = Math.max(10, d * 0.19), fs = Math.max(13, Math.round(b * 1.2)); k.font = `${fs}px ${FONT}`; k.textAlign = "center"; k.textBaseline = "middle";
    const ax = x - R * 0.8, ay = y + R * 0.74; k.fillStyle = GOLD; k.beginPath(); k.arc(ax, ay, b, 0, 7); k.fill(); k.lineWidth = 2; k.strokeStyle = INK; k.stroke(); k.fillStyle = INK; k.fillText(g.atkOf(u), ax, ay + 1);
    const hx = x + R * 0.8, hy = y + R * 0.74, hurt = hp < u.max; heart(k, hx, hy + 1, b * 1.08); k.fillStyle = hurt ? "#C81E2C" : "#E0473A"; k.fill(); k.stroke();
    k.lineWidth = 3; k.strokeStyle = INK; k.strokeText(Math.max(0, hp), hx, hy + 1); k.fillStyle = "#FFFFFF"; k.fillText(Math.max(0, hp), hx, hy + 1);
    if (u.rooted || u.stunned || (u.sick && u.o === g.cur && human(u.o))) { const lab = u.stunned ? "TONTO" : u.rooted ? "PRESO" : "zzz", w = lab === "zzz" ? d * 0.42 : d * 0.66, hh = Math.max(14, d * 0.2), ly = y - R + hh * 0.2;
      k.fillStyle = lab === "zzz" ? "#FFFFFF" : FOE; rrect(k, x - w / 2, ly, w, hh, hh / 2); k.fill(); k.lineWidth = 1.6; k.strokeStyle = INK; k.stroke(); k.fillStyle = lab === "zzz" ? "#5A4D40" : "#FFFFFF"; k.font = `800 ${Math.round(hh * 0.62)}px Nunito, sans-serif`; k.fillText(lab, x, ly + hh / 2 + 0.5); }
    k.restore();
  }
  function highlights() { const out = { move: [], target: [], place: [] }; if (!g || busy() || !human(g.cur) || g.over) return out; const o = g.cur;
    if (sel && sel.k === "unit") { const u = g.units.find(z => z.id === sel.id); if (u) { out.move = g.moves(u); out.target = g.attacks(u).map(z => [z.x, z.y]); out.preview = predict(u); } }
    else if (sel && sel.k === "card") { const C = CARDS[g.p[o].hand[sel.i]]; const ts = g.playTargets(o, sel.i).filter(([x]) => x >= 0); if (C && C.type === "spell" && (C.target === "enemy" || C.target === "any")) out.target = ts; else out.place = ts; }
    else if (sel && sel.k === "power") { const F = FAC[g.p[o].fac].power; if (F.target === "any") out.target = g.powerTargets(o); else out.place = g.powerTargets(o); }
    return out; }

  // ---------- ações e animação ----------
  const busy = () => clock < busyUntil;
  function act(c) {
    const snap = new Map(g.units.map(u => [u.id, JSON.parse(JSON.stringify(u))])), pre = new Map(g.units.map(u => [u.id, u.hp]));
    const turnBefore = g.cur; g.ev = []; if (!g.apply(c)) { sfx("err"); return false; }
    const evs = g.ev.splice(0); let tc = clock; const step = d => { const s = tc; tc += d; return s; };
    for (const [id, hp] of pre) dhp.set(id, hp); for (const u of g.units) if (!pre.has(u.id)) dhp.set(u.id, u.hp);
    const mid = () => [view.w / 2, view.oy + view.t * 3.5];
    for (const e of evs) {
      if (e.k === "play") { const C = CARDS[e.c]; stats[e.o].played++; const [mx, my] = mid(); float(mx, my, C.name, INK, 24, step(0.15), 1.1); sfx(C.type === "spell" ? "spell" : "card"); if (!human(e.o) || mode === "hot") tell(`${FAC[g.p[e.o].fac].gen} jogou ${C.name}`, C.text, e.c); }
      else if (e.k === "summon") { const t0 = step(0.25); dscale.set(e.id, 0); anims.push({ t0, d: 0.25, f: a => { dscale.set(e.id, a >= 1 ? 1 : 0.4 + 0.6 * ease(a)); if (a >= 1) dscale.delete(e.id); } }); burstAt(e.x, e.y, 10, t0); }
      else if (e.k === "move") { face.set(e.id, [Math.sign(e.x - e.fx), Math.sign(e.y - e.fy)]); const t0 = step(0.26); dpos.set(e.id, { x: e.fx, y: e.fy }); anims.push({ t0, d: 0.26, f: a => { const q = ease(a); dpos.set(e.id, { x: e.fx + (e.x - e.fx) * q, y: e.fy + (e.y - e.fy) * q }); if (a >= 1) dpos.delete(e.id); } });
        if (snap.get(e.id)?.card === "mula") anims.push({ t0, d: 0.01, f: () => FX.dust(e.id) }); sfx("move", t0); }
      else if (e.k === "swap") { const a = snap.get(e.a), b = snap.get(e.b), t0 = step(0.3); for (const [id, f, to] of [[e.a, a, b], [e.b, b, a]]) { dpos.set(id, { x: f.x, y: f.y }); anims.push({ t0, d: 0.3, f: q => { const z = ease(q); dpos.set(id, { x: f.x + (to.x - f.x) * z, y: f.y + (to.y - f.y) * z - Math.sin(z * Math.PI) * 0.4 }); if (q >= 1) dpos.delete(id); } }); } }
      else if (e.k === "attack" || e.k === "counter") { const a = g.units.find(z => z.id === e.id) || snap.get(e.id), b = g.units.find(z => z.id === e.t) || snap.get(e.t); if (!a || !b) continue;
        face.set(e.id, [Math.sign(b.x - a.x), Math.sign(b.y - a.y)]);
        const big = e.k === "attack", D = big ? 0.46 : 0.36, hit = D * 0.5, t0 = step(hit), dx = b.x - a.x, dy = b.y - a.y, reach = big ? 0.55 : 0.42;
        anims.push({ t0, d: D, f: q => { const z = q < 0.3 ? -0.14 * ease(q / 0.3) : q < 0.5 ? -0.14 + (reach + 0.14) * ((q - 0.3) / 0.2) ** 2 : reach * (1 - ease((q - 0.5) / 0.5)); dpos.set(e.id, { x: a.x + dx * z, y: a.y + dy * z }); if (q >= 1) dpos.delete(e.id); } });
        anims.push({ t0: t0 + hit, d: 0.22, f: q => { const z = Math.sin(Math.min(1, q) * Math.PI) * 0.12 * (1 - q); if (g.units.some(u => u.id === e.t)) dpos.set(e.t, { x: b.x + dx * z, y: b.y + dy * z }); if (q >= 1) dpos.delete(e.t); } });
        sfx("hit", t0 + hit); step(0.1); }
      else if (e.k === "dmg") { const t0 = step(0.06), who = g.units.find(z => z.id === e.id) || snap.get(e.id); if (who) stats[1 - who.o].dmg += e.n; const tx = SX(e.x, e.y), ty = SY(e.x, e.y);
        float(tx, ty - view.t * 0.1, "−" + e.n, RED, Math.min(54, 34 + e.n * 3), t0, 1.15, true); anims.push({ t0, d: 0.01, f: () => dhp.set(e.id, (dhp.get(e.id) ?? 0) - e.n) });
        fx.push({ x: tx, y: ty, r: view.t * (0.32 + Math.min(5, e.n) * 0.04), rot: Math.random() * 2, t0, d: 0.42 }); kick(Math.min(14, 3 + e.n * 2), t0); burstAt(e.x, e.y, 8, t0, [RED, INK, "#F3E7C8"]); }
      else if (e.k === "heal") { const u = g.units.find(z => z.id === e.id) || snap.get(e.id); if (!u) continue; const t0 = step(0.12); float(SX(u.x, u.y), SY(u.x, u.y), "+" + e.n, "#2E9E4F", 26, t0, 1); anims.push({ t0, d: 0.01, f: () => dhp.set(e.id, u.hp) }); sfx("heal", t0); }
      else if (e.k === "die") { const u = snap.get(e.id) || g.units.find(z => z.id === e.id); if (!u) continue; const t0 = step(0.3); if (!u.gen) stats[1 - u.o].kills++; const gh = { u: { ...u, hp: pre.get(e.id) ?? u.hp }, alpha: 1 }; ghosts.push(gh);
        anims.push({ t0, d: 0.35, f: a => { gh.alpha = 1 - a; if (a >= 1) ghosts = ghosts.filter(z => z !== gh); } }); burstAt(e.x, e.y, 16, t0, [INK, "#F3E7C8", "#5E5240"]); sfx("die", t0); }
      else if (e.k === "cross") { const t0 = step(0.18); float(SX(e.x, e.y), SY(e.x, e.y) - 16, "+1 mana", "#2C5E8A", 20, t0, 1.1); burstAt(e.x, e.y, 8, t0, ["#C9932B", "#2C5E8A"]); sfx("heal", t0); }
      else if (e.k === "cover") { float(SX(e.x, e.y), SY(e.x, e.y) + view.t * 0.3, "mata −1", "#2F6B3A", 15, tc + 0.2, 1); }
      else if (e.k === "venom") { const u = snap.get(e.id); if (u) float(SX(u.x, u.y), SY(u.x, u.y) - 20, "veneno!", "#2F6B3A", 20, step(0.1), 1); }
      else if (e.k === "root" || e.k === "stun") { const u = g.units.find(z => z.id === e.id); if (u) float(SX(u.x, u.y), SY(u.x, u.y) - 18, e.k === "root" ? "enraizado" : "atordoado", INK, 18, step(0.12), 1.1); }
      else if (e.k === "trap") { const t0 = step(0.2); float(SX(e.x, e.y), SY(e.x, e.y) - 24, "ARAPUCA!", "#B3301E", 22, t0, 1.2); burstAt(e.x, e.y, 18, t0, ["#7A5A35", INK]); sfx("trap", t0); }
      else if (e.k === "sacrifice") { const u = snap.get(e.id); if (u) float(SX(u.x, u.y), SY(u.x, u.y) - 20, "sacrifício", "#7A2340", 20, step(0.1), 1); }
      else if (e.k === "power") { sfx("spell"); const F = FAC[g.p[e.o].fac]; const [mx, my] = mid(); float(mx, my, F.power.name, INK, 22, step(0.15), 1.1); if (!human(e.o)) tell(`${F.gen} usou ${F.power.name}`, F.power.text, GEN_ART[F.gen]); }
      else if (e.k === "fatigue") { const [mx, my] = mid(); float(mx, my, "Baralho vazio: −" + e.n, "#B3301E", 20, step(0.2), 1.2); }
      else if (e.k === "burn") { if (human(e.o)) tell("Mão cheia", `${CARDS[e.c].name} foi descartada.`, e.c); }
      else if (e.k === "turn") step(0.1);
    }
    ver++; busyUntil = Math.max(busyUntil, tc + 0.05); anims.push({ t0: tc, d: 0.01, f: () => { dhp.clear(); refresh(); } });
    if (g.cur !== turnBefore) onTurnChange();
    if (sel && sel.k === "unit" && !g.units.some(u => u.id === sel.id)) sel = null; if (sel && sel.k !== "unit") sel = null;
    if (inspect && inspect.unit && !g.units.some(u => u.id === inspect.unit)) inspect = null;
    refresh(); return true;
  }
  const ease = a => a <= 0 ? 0 : a >= 1 ? 1 : a * a * (3 - 2 * a);
  function float(x, y, text, c, size, t0, d, pop = false) { floats.push({ x, y, text, c, size, t0, d, pop }); }
  function kick(amp, t0) { if (reduce) return; anims.push({ t0, d: 0.01, f: () => { if (amp >= shake.amp * Math.max(0, 1 - (clock - shake.t0) / shake.d)) shake = { amp, t0: clock, d: 0.28 }; } }); }
  function burstAt(bx, by, n, t0, cols = [GOLD, "#FFFFFF"]) { if (reduce) n = Math.ceil(n / 3); anims.push({ t0, d: 0.01, f: () => { const x = SX(bx, by), y = SY(bx, by); for (let i = 0; i < n; i++) { const a = Math.random() * 7, v = 60 + Math.random() * 140; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0, max: 0.35 + Math.random() * 0.35, c: cols[i % cols.length], s: 3 + Math.random() * 4 }); } } }); }
  function stepAnims(dt) { clock += dt; for (const a of anims) { if (clock < a.t0) continue; const q = Math.min(1, (clock - a.t0) / a.d); a.f(q); if (q >= 1) a.done = true; } anims = anims.filter(a => !a.done);
    for (const p of parts) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; } parts = parts.filter(p => p.life < p.max); floats = floats.filter(f => clock < f.t0 + f.d); fx = fx.filter(f => clock < f.t0 + f.d); }
  function onTurnChange() { sel = null; inspect = null; turnStart = performance.now(); if (g.over) return;
    if (mode === "hot") { $("passWho").textContent = `Vez de ${FAC[g.p[g.cur].fac].gen}`; setTimeout(() => { if (!g.over) { $("ovPass").hidden = false; refresh(); } }, 700); }
    else if (g.cur === 0) { tell("Sua vez", "Toque numa carta e depois numa casa iluminada, ou numa peça com contorno dourado.", null, 2500); sfx("turn"); } else botWait = clock + 0.6; }

  // ---------- toques no tabuleiro ----------
  function tileAt(px, py) { if (is3D) return ISO.pick(px, py, viewer); const vx = Math.floor((px - view.ox) / view.t), vy = Math.floor((py - view.oy) / view.t); if (vx < 0 || vy < 0 || vx >= BW || vy >= BH) return null; return viewer === 0 ? [vx, vy] : [BW - 1 - vx, BH - 1 - vy]; }
  cv.addEventListener("pointerup", e => {
    if (!g || g.over || paused || !$("ovPass").hidden) return; ensureAudio(); say = null; const r = cv.getBoundingClientRect(), tl = tileAt(e.clientX - r.left, e.clientY - r.top); if (!tl) { sel = null; inspect = null; refresh(); return; }
    const [x, y] = tl, here = g.at(x, y), o = g.cur, mine = human(o) && !busy();
    if (mine && sel && sel.k === "card" && g.playTargets(o, sel.i).some(([a, b]) => a === x && b === y)) { act({ c: "play", i: sel.i, x, y }); return; }
    if (mine && sel && sel.k === "power" && g.powerTargets(o).some(([a, b]) => a === x && b === y)) { act({ c: "power", x, y }); return; }
    if (mine && sel && sel.k === "unit") { const u = g.units.find(z => z.id === sel.id);
      if (u && here && here.o !== u.o && g.attacks(u).includes(here)) { act({ c: "attack", id: u.id, x, y }); return; }
      if (u && !here && g.moves(u).some(([a, b]) => a === x && b === y)) { act({ c: "move", id: u.id, x, y }); sel = { k: "unit", id: u.id }; return; } }
    if (here) { if (mine && here.o === o) { sel = sel && sel.k === "unit" && sel.id === here.id ? null : { k: "unit", id: here.id }; inspect = sel ? { unit: here.id } : null; sfx("tap"); } else { sel = null; inspect = { unit: here.id }; sfx("tap"); } }
    else { sel = null; inspect = g.ter(x, y) ? { ter: g.ter(x, y) } : null; }
    refresh();
  });

  // ---------- faixa de informação ----------
  function tell(title, text, art, ms = 2600) { say = { title, text, art, until: performance.now() + ms }; renderInfo(); }
  function thumb(id) { const c = document.createElement("canvas"); c.width = c.height = 104; if (id) c.getContext("2d").drawImage(ART.img(id, 104), 0, 0); return c; }
  function renderInfo() {
    const el = $("info"); el.innerHTML = ""; el.className = ""; if (!g) return; const o = g.cur;
    let art = null, title = "", sub = "", text = "", btn = null;
    if (say && performance.now() < say.until) { el.className = "say"; art = say.art || GEN_ART[FAC[g.p[viewer].fac].gen]; title = say.title; text = say.text; }
    else if (sel && sel.k === "card") { const id = g.p[o].hand[sel.i], C = CARDS[id]; art = id; title = C.name; sub = C.type === "unit" ? `${C.cost} mana · ${C.atk}/${C.hp}` : `${C.cost} mana · feitiço`; text = C.text;
      const ok = g.playTargets(o, sel.i).length > 0; if (!ok) text = (g.p[o].mana < C.cost ? "Mana insuficiente. " : "Sem alvo agora. ") + C.text;
      else if (C.type === "spell" && C.target === "none") { btn = document.createElement("button"); btn.className = "btn use hot"; btn.textContent = "Usar"; btn.addEventListener("click", () => { act({ c: "play", i: sel.i, x: -1, y: -1 }); }); }
      else text = (C.type === "unit" ? "Toque numa casa dourada. " : C.target === "empty" ? "Toque numa casa dourada vazia. " : C.target === "enemy" ? "Toque num inimigo (aro vermelho). " : "Toque numa peça sua (aro verde). ") + C.text; }
    else if (sel && sel.k === "power") { const F = FAC[g.p[o].fac]; art = GEN_ART[F.gen]; title = F.power.name; sub = `${F.power.cost} mana · recarga ${F.power.cd}`; text = (F.power.target === "any" ? "Toque em qualquer peça (aro vermelho). " : "Toque numa peça sua (aro verde). ") + F.power.text; }
    else if (inspect && inspect.unit) { const u = g.units.find(q => q.id === inspect.unit); if (u) { const F = FAC[g.p[u.o].fac]; art = u.gen ? GEN_ART[u.card] : u.card; title = u.gen ? `${u.card}` : CARDS[u.card].name;
        sub = `${u.o === viewer || mode === "bot" && u.o === 0 ? "sua" : "inimiga"} · ${g.atkOf(u)}/${u.hp}`; const st = [u.rooted && "enraizada", u.stunned && "atordoada", u.sick && "chegou agora"].filter(Boolean).join(", ");
        const tr = g.ter(u.x, u.y); text = (u.gen ? `General. Poder: ${F.power.text}` : CARDS[u.card].text) + (st ? ` (${st})` : "") + (tr ? ` Em ${TERR[tr].name}: ${TERR[tr].text}` : "");
        if (sel && sel.k === "unit" && sel.id === u.id) { const m = g.moves(u).length, a = g.attacks(u).length; text = (m || a ? `${m ? "Pontos: andar. " : ""}${a ? "Vermelho: atacar — a etiqueta mostra o dano e a revida. " : ""}` : "Já agiu neste turno. ") + text; } } }
    else if (inspect && inspect.ter) { const T = TERR[inspect.ter]; art = "ter_" + inspect.ter; title = T.name; sub = "terreno"; text = T.text; }
    else if (g.over) { title = "Fim da peleja"; }
    else if (!human(o)) { art = GEN_ART[FAC[g.p[o].fac].gen]; title = `${FAC[g.p[o].fac].gen} está jogando…`; text = "Toque nas peças inimigas para ver o que fazem."; }
    else { art = GEN_ART[FAC[g.p[o].fac].gen]; title = mode === "hot" ? `Vez de ${FAC[g.p[o].fac].gen}` : "Sua vez"; sub = `turno ${Math.ceil(g.turn / 2)}`;
      text = g.actions().length ? "Toque numa carta, ou numa peça com contorno dourado. Toque nas inimigas para ver o que fazem." : "Nada mais a fazer: toque em Passar."; }
    el.appendChild(thumb(art)); const tx = document.createElement("div"); tx.className = "tx"; const b = document.createElement("b"); b.textContent = title; if (sub) { const em = document.createElement("em"); em.textContent = " · " + sub; b.appendChild(em); }
    const sp = document.createElement("span"); sp.textContent = text; tx.append(b, sp); el.appendChild(tx); if (btn) el.appendChild(btn);
  }

  // ---------- mão e barras ----------
  function cardEl(id, i, playable, selected) { const C = CARDS[id], b = document.createElement("button"); b.type = "button"; b.className = "card" + (C.type === "spell" ? " spell" : "") + (playable ? "" : " poor") + (selected ? " sel" : "");
    b.setAttribute("aria-label", `${C.name}, custo ${C.cost}`); const c = document.createElement("canvas"); c.width = c.height = 140; c.getContext("2d").drawImage(ART.img(id, 140), 0, 0); b.appendChild(c);
    const co = document.createElement("span"); co.className = "co"; co.textContent = C.cost; b.appendChild(co);
    if (C.type === "unit") { const a = document.createElement("span"); a.className = "a"; a.textContent = C.atk; const h = document.createElement("span"); h.className = "h"; h.textContent = C.hp; b.append(a, h); }
    const nm = document.createElement("span"); nm.className = "nm"; nm.textContent = SHORT[id] || C.name; b.appendChild(nm);
    b.addEventListener("click", () => { if (!g || g.over || paused) return; ensureAudio(); sfx("tap");
      if (busy() || !human(g.cur)) { inspect = null; tell(C.name, C.text, id, 3000); return; }
      sel = sel && sel.k === "card" && sel.i === i ? null : { k: "card", i }; inspect = null; say = null; refresh(); });
    return b; }
  function manaEl(el, P, mine) { el.innerHTML = '<i class="on"></i>'; const s = document.createElement("span"); s.textContent = mine ? `${P.mana}/${P.max}` : `${P.max}`; el.appendChild(s); el.setAttribute("aria-label", `Mana ${s.textContent}`); }
  function refresh() { renderHud(); renderInfo(); }
  function renderHud() {
    if (!g) return; const foeTurn = !g.over && g.cur !== viewer; $("topBar").classList.toggle("turn", foeTurn); $("myBar").classList.toggle("turn", !g.over && g.cur === viewer);
    $("oName").dataset.turn = foeTurn ? (mode === "bot" ? "jogando…" : "vez dele") : ""; const me = viewer, op = 1 - me, PM = g.p[me], PO = g.p[op];
    const gm = g.gen(me), go = g.gen(op); $("mHp").innerHTML = HEART + (gm ? Math.max(0, gm.hp) : 0); $("oHp").innerHTML = HEART + (go ? Math.max(0, go.hp) : 0);
    manaEl($("mMana"), PM, true); manaEl($("oMana"), PO, false);
    $("oName").textContent = FAC[PO.fac].gen; $("oInfo").textContent = `${PO.hand.length} na mão · ${PO.deck.length} no baralho`;
    const oc = $("oPor").getContext("2d"); oc.clearRect(0, 0, 68, 68); oc.drawImage(ART.token(GEN_ART[FAC[PO.fac].gen], 68), 0, 0);
    const pw = FAC[PM.fac].power, myTurn = g.cur === me && human(me) && !g.over; $("bPow").innerHTML = ""; const pc = document.createElement("canvas"); pc.width = pc.height = 44; pc.getContext("2d").drawImage(ART.token(GEN_ART[FAC[PM.fac].gen], 44), 0, 0); $("bPow").appendChild(pc);
    $("bPow").appendChild(document.createTextNode(PM.cd > 0 ? `Poder em ${PM.cd}` : `Poder · ${pw.cost}`)); $("bPow").setAttribute("aria-label", `${pw.name}: ${pw.text}`);
    $("bPow").setAttribute("aria-disabled", myTurn && g.powerTargets(me).length ? "false" : "true"); $("bPow").classList.toggle("hot", !!(sel && sel.k === "power"));
    $("bEnd").setAttribute("aria-disabled", myTurn ? "false" : "true"); $("bEnd").classList.toggle("hot", myTurn && !busy() && !g.actions().length);
    const hand = $("hand"), showHand = mode === "bot" ? 0 : (g.cur === me && $("ovPass").hidden ? me : -1), hsig = [showHand, g.cur, g.p[me].hand.join(","), g.p[me].mana, sel ? sel.k + sel.i : "", busy()].join("|");
    if (hand.dataset.sig === hsig) return; hand.dataset.sig = hsig; hand.innerHTML = "";
    if (showHand < 0) for (let i = 0; i < g.p[me].hand.length; i++) { const b = document.createElement("div"); b.className = "card back"; hand.appendChild(b); }
    else g.p[showHand].hand.forEach((id, i) => hand.appendChild(cardEl(id, i, g.cur === showHand && !busy() && g.playTargets(showHand, i).length > 0, sel && sel.k === "card" && sel.i === i)));
    layout();
  }
  $("bPow").addEventListener("click", () => { if (!g || g.over || paused) return; const P = g.p[viewer], F = FAC[P.fac].power;
    if (busy() || !human(g.cur) || g.cur !== viewer) { tell(F.name, `${F.text} Custa ${F.cost} mana, recarga de ${F.cd} turnos.`, GEN_ART[FAC[P.fac].gen], 3500); return; }
    if (P.cd > 0) { tell(F.name, `Recarregando: volta em ${P.cd} turno(s). ${F.text}`, GEN_ART[FAC[P.fac].gen]); return; } if (P.mana < F.cost) { tell(F.name, `Precisa de ${F.cost} mana. ${F.text}`, GEN_ART[FAC[P.fac].gen]); return; }
    if (!g.powerTargets(g.cur).length) { tell(F.name, "Sem alvo para o poder agora. " + F.text, GEN_ART[FAC[P.fac].gen]); return; }
    sel = sel && sel.k === "power" ? null : { k: "power" }; inspect = null; say = null; sfx("tap"); refresh(); });
  $("bEnd").addEventListener("click", () => { if (!g || g.over || busy() || paused || !human(g.cur)) return; act({ c: "end" }); });

  // ---------- som ----------
  let AC = null; const lastS = {};
  function ensureAudio() { if (!sound) return; try { if (navigator.audioSession && navigator.audioSession.type !== "playback") navigator.audioSession.type = "playback";
      if (!AC) { AC = new (window.AudioContext || window.webkitAudioContext)(); const sb = AC.createBufferSource(); sb.buffer = AC.createBuffer(1, 1, 22050); sb.connect(AC.destination); sb.start(0); } if (AC.state !== "running") AC.resume(); } catch (e) { AC = null; } }
  function sfx(kind, at) { if (at !== undefined && at > clock + 0.01) { anims.push({ t0: at, d: 0.01, f: () => sfx(kind) }); return; } if (!sound || !AC || AC.state !== "running") return; const t0 = AC.currentTime; if (lastS[kind] && t0 - lastS[kind] < 0.05) return; lastS[kind] = t0;
    const tone = (a, b, v, d, type = "sine", o = 0) => { const os = AC.createOscillator(), gn = AC.createGain(); os.type = type; os.frequency.setValueAtTime(a, t0 + o); os.frequency.exponentialRampToValueAtTime(b, t0 + o + d); gn.gain.setValueAtTime(0.0001, t0); gn.gain.setValueAtTime(v, t0 + o); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + o + d); os.connect(gn); gn.connect(AC.destination); os.start(t0); os.stop(t0 + o + d + 0.02); };
    const noise = (v, d, f) => { const n = AC.createBufferSource(), b = AC.createBuffer(1, Math.ceil(AC.sampleRate * d), AC.sampleRate), ch = b.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 2); const fl = AC.createBiquadFilter(); fl.type = "bandpass"; fl.frequency.value = f; const gg = AC.createGain(); gg.gain.value = v; n.buffer = b; n.connect(fl); fl.connect(gg); gg.connect(AC.destination); n.start(t0); };
    if (kind === "tap") tone(700, 900, 0.03, 0.05); else if (kind === "card") noise(0.18, 0.18, 2500); else if (kind === "spell") tone(400, 900, 0.05, 0.3, "triangle"); else if (kind === "move") noise(0.12, 0.12, 700);
    else if (kind === "hit") { noise(0.3, 0.12, 1200); tone(160, 70, 0.1, 0.12); } else if (kind === "die") tone(240, 60, 0.12, 0.4, "triangle"); else if (kind === "heal") tone(600, 900, 0.04, 0.2); else if (kind === "trap") { noise(0.35, 0.2, 500); tone(120, 50, 0.15, 0.2); }
    else if (kind === "turn") { tone(523, 523, 0.05, 0.1, "triangle"); tone(784, 784, 0.05, 0.15, "triangle", 0.09); } else if (kind === "err") tone(160, 140, 0.05, 0.15, "sawtooth");
    else if (kind === "win") [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.07, 0.22, "triangle", i * 0.13)); else if (kind === "lose") [392, 330, 262].forEach((f, i) => tone(f, f, 0.07, 0.3, "triangle", i * 0.17)); }

  // ---------- telas ----------
  function start() {
    ensureAudio(); const other = myFac === "mata" ? "assom" : "mata", seed = 1 + Math.floor(Math.random() * 1e6);
    g = new K.Game({ seed, fac: [myFac, other] }); g.ev = []; bot = mode === "bot" ? K.makeBot(level, 1, seed) : null; viewer = 0;
    for (const s of stats) Object.assign(s, { dmg: 0, kills: 0, played: 0 }); fx = []; FX.clear(); ver++; face.clear(); anims = []; floats = []; ghosts = []; parts = []; dpos.clear(); dhp.clear(); dscale.clear(); sel = null; inspect = null; say = null; busyUntil = clock; paused = false; ended = false;
    for (const id of ["ovHome", "ovEnd", "ovMenu", "ovPass"]) $(id).hidden = true; $("hand").dataset.sig = ""; resize(); turnStart = performance.now();
    if (mode === "hot") { $("passWho").textContent = `Vez de ${FAC[g.p[0].fac].gen}`; $("ovPass").hidden = false; } else tell("Sua vez", "Toque numa carta e depois numa casa iluminada perto do seu general.", null, 3500);
    refresh();
  }
  function finish() { ended = true; const w = g.winner, name = o => mode === "bot" ? (o === 0 ? "Você" : "Bot") : FAC[g.p[o].fac].gen;
    $("eTitle").textContent = w === null ? "Empate" : mode === "bot" ? (w === 0 ? "Vitória!" : "Derrota") : `${FAC[g.p[w].fac].gen} vence!`;
    $("eWhy").textContent = w === null ? "Os dois generais caíram juntos." : g.gaveUp !== undefined ? `${mode === "bot" && g.gaveUp === 0 ? "Você desistiu" : FAC[g.p[g.gaveUp].fac].gen + " desistiu"} no turno ${Math.ceil(g.turn / 2)}.` : `${FAC[g.p[1 - w].fac].gen} caiu no turno ${Math.ceil(g.turn / 2)}.`;
    $("eStats").innerHTML = `<thead><tr><th></th><th>${name(0)}</th><th>${name(1)}</th></tr></thead><tbody><tr><td>Dano causado</td><td>${stats[0].dmg}</td><td>${stats[1].dmg}</td></tr><tr><td>Unidades derrubadas</td><td>${stats[0].kills}</td><td>${stats[1].kills}</td></tr><tr><td>Cartas jogadas</td><td>${stats[0].played}</td><td>${stats[1].played}</td></tr><tr><td>Vida do general</td><td>${Math.max(0, g.gen(0)?.hp ?? 0)}</td><td>${Math.max(0, g.gen(1)?.hp ?? 0)}</td></tr></tbody>`;
    sfx(mode === "bot" ? (w === 0 ? "win" : "lose") : "win"); $("ovEnd").hidden = false; }
  $("bGo").addEventListener("click", start); $("bAgain").addEventListener("click", start);
  $("bPass").addEventListener("click", () => { viewer = g.cur; FX.clear(); $("ovPass").hidden = true; turnStart = performance.now(); $("hand").dataset.sig = ""; refresh(); sfx("turn"); });
  const home = () => { for (const id of ["ovEnd", "ovMenu", "ovPass"]) $(id).hidden = true; $("ovHome").hidden = false; g = null; FX.clear(); paused = false; };
  $("bHome").addEventListener("click", home); $("bHome2").addEventListener("click", home);
  $("bMenu").addEventListener("click", () => { if (!g) return; paused = true; pauseAt = performance.now(); $("ovMenu").hidden = false; });
  $("bResume").addEventListener("click", () => { ensureAudio(); paused = false; turnStart += performance.now() - pauseAt; $("ovMenu").hidden = true; });
  $("bGiveUp").addEventListener("click", () => { $("ovMenu").hidden = true; paused = false; g.gaveUp = mode === "bot" ? 0 : g.cur; g.over = true; g.winner = mode === "bot" ? 1 : 1 - g.cur; finish(); });
  (function facs() { const box = $("facs"); for (const [id, F] of Object.entries(FAC)) { const l = document.createElement("label"), i = document.createElement("input"); i.type = "radio"; i.name = "fac"; i.value = id; i.checked = id === myFac; i.addEventListener("change", () => { myFac = id; save(); });
      const s = document.createElement("span"), c = document.createElement("canvas"); c.width = c.height = 128; c.getContext("2d").drawImage(ART.token(GEN_ART[F.gen], 128), 0, 0); const b = document.createElement("b"); b.textContent = F.gen; const sm = document.createElement("small");
      sm.textContent = id === "mata" ? "Mata: armadilhas, veneno e mobilidade" : "Assombrações: força bruta e sacrifício"; s.append(c, b, sm); l.className = "fac"; l.append(i, s); box.appendChild(l); } })();
  for (const r of document.querySelectorAll('input[name="mode"]')) { r.checked = r.value === mode; r.addEventListener("change", () => { mode = r.value; $("lvSeg").hidden = mode !== "bot"; save(); }); } $("lvSeg").hidden = mode !== "bot";
  for (const r of document.querySelectorAll('input[name="lv"]')) { r.checked = r.value === level; r.addEventListener("change", () => { level = r.value; save(); }); }
  $("optSound").checked = sound; $("optSound").addEventListener("change", e => { sound = e.target.checked; save(); if (sound) ensureAudio(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && g && !g.over && !paused) { paused = true; pauseAt = performance.now(); $("ovMenu").hidden = false; } });

  let lastT = 0, hudT = 0, wasBusy = false;
  function frame(ts) { requestAnimationFrame(frame); const dt = Math.min(0.05, (ts - lastT) / 1000 || 0); lastT = ts;
    FX.frame(dt, !!g && !paused && !g.over && $("ovPass").hidden);
    if (g && !paused && !document.hidden) { stepAnims(dt);
      if (g.over && !busy() && !ended) finish();
      else if (!g.over && bot && g.cur === 1 && !busy() && clock >= botWait) { const a = bot(g); if (a) act(a); botWait = clock + 0.4; }
      else if (!g.over && human(g.cur) && $("ovPass").hidden && !busy()) { const left = TURN_S - (performance.now() - turnStart) / 1000; $("bEndT").style.width = Math.max(0, left / TURN_S * 100) + "%"; if (left <= 0) { tell("Tempo esgotado", "O turno passou sozinho."); act({ c: "end" }); } } }
    draw(); const b = g && busy(); if (g && (b !== wasBusy || (say && performance.now() > say.until))) { wasBusy = b; if (say && performance.now() > say.until) say = null; refresh(); } }
  window.__pj = { get g() { return g; }, SX, SY, act, get busy() { return busy(); } };
  requestAnimationFrame(frame);
})();
