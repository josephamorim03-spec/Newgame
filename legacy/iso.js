// ISO — tabuleiro 3D (Three.js): maquete com casas em relevo, terreno modelado e miniaturas (base na cor do time + retrato em pé).
// A interface 2D por cima usa ISO.project para saber onde desenhar números e etiquetas, e ISO.pick para tocar nas casas.
const ISO = (() => {
  const T = THREE, BW = 5, BH = 7, TOP = 0.2;
  let R, scene, cam, W = 1, H = 1, dpr = 1, board = null, marks = null, pieces = new Map(), boardKey = "", yaw = 0.42, pitch = 0.72, zoom = 1, baseCam = null;
  const texCache = new Map(), C = c => new T.Color(c).convertSRGBToLinear();
  const mat = (c, o = {}) => new T.MeshStandardMaterial({ color: C(c), roughness: o.r ?? 0.85, metalness: 0, flatShading: !!o.flat, transparent: !!o.tr, opacity: o.op ?? 1, emissive: C(o.em || "#000000") });
  // casa (x, y) do jogo -> mundo; v = casa já girada para quem está olhando
  const wx = vx => vx - (BW - 1) / 2, wz = vy => vy - (BH - 1) / 2;
  function init(canvas) {
    R = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap; R.outputEncoding = T.sRGBEncoding; R.toneMapping = T.NoToneMapping;
    scene = new T.Scene();
    scene.add(new T.HemisphereLight(C("#FFF4DE"), C("#8C7A62"), 0.75));
    const sun = new T.DirectionalLight(C("#FFF1D6"), 0.95); sun.position.set(-4, 9, 5); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 25 }); sun.shadow.bias = -0.0015; sun.shadow.radius = 3; scene.add(sun);
    cam = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  }
  function setView(y, p) { yaw = y; pitch = p; fit(); }
  function resize(w, h, d) { W = w; H = h; dpr = d; R.setPixelRatio(d); R.setSize(w, h, false); fit(); }
  // câmera ortográfica enquadrando o tabuleiro inteiro (com folga para miniaturas e números)
  function fit() { if (!cam) return; const dist = 30, dir = new T.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    cam.position.copy(dir.multiplyScalar(dist)); cam.up.set(0, 1, 0); cam.lookAt(0, 0, 0); cam.updateMatrixWorld();
    const pts = []; for (const x of [-BW / 2 - 0.2, BW / 2 + 0.2]) for (const z of [-BH / 2 - 0.2, BH / 2 + 0.2]) for (const y of [-0.55, 1.15]) pts.push(new T.Vector3(x, y, z));
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; const inv = cam.matrixWorldInverse;
    for (const p of pts) { const q = p.clone().applyMatrix4(inv); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
    const bw = x1 - x0, bh = y1 - y0, s = Math.max(bw / W, bh / H), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    Object.assign(cam, { left: cx - W * s / 2, right: cx + W * s / 2, top: cy + H * s / 2, bottom: cy - H * s / 2 }); cam.updateProjectionMatrix(); baseCam = cam.position.clone(); }
  // ---------- tabuleiro ----------
  function tileMesh(c, h = TOP) { const m = new T.Mesh(new T.BoxGeometry(0.94, h, 0.94), mat(c)); m.castShadow = false; m.receiveShadow = true; return m; }
  function tree(g, x, z, s) { const t = new T.Mesh(new T.CylinderGeometry(0.025 * s, 0.035 * s, 0.14 * s, 6), mat("#7A4E2E")); t.position.set(x, TOP + 0.07 * s, z); t.castShadow = true; g.add(t);
    for (const [y, r, h] of [[0.2, 0.13, 0.22], [0.32, 0.1, 0.2]]) { const c = new T.Mesh(new T.ConeGeometry(r * s, h * s, 7), mat("#4E9E47", { flat: true })); c.position.set(x, TOP + y * s, z); c.castShadow = true; c.receiveShadow = true; g.add(c); } }
  function buildBoard(g, viewer) {
    if (board) scene.remove(board); board = new T.Group(); scene.add(board);
    const slab = new T.Mesh(new T.BoxGeometry(BW + 0.36, 0.5, BH + 0.36), mat("#6B4A33")); slab.position.y = -0.25; slab.receiveShadow = true; board.add(slab);
    const rim = new T.Mesh(new T.BoxGeometry(BW + 0.12, 0.06, BH + 0.12), mat("#3E2A1E")); rim.position.y = 0.02; board.add(rim);
    for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) { const [vx, vy] = viewer === 0 ? [x, y] : [BW - 1 - x, BH - 1 - y], X = wx(vx), Z = wz(vy), tr = g.ter(x, y);
      if (tr === "rio") { const bed = tileMesh("#5F8FB0", 0.08); bed.position.set(X, 0.04, Z); board.add(bed);
        const water = new T.Mesh(new T.BoxGeometry(0.94, 0.03, 0.94), new T.MeshStandardMaterial({ color: C("#7EC3E6"), roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.85 })); water.position.set(X, 0.13, Z); water.userData.water = true; board.add(water);
        for (const dz of [-0.2, 0.15]) { const w = new T.Mesh(new T.BoxGeometry(0.5, 0.012, 0.03), mat("#FFFFFF", { em: "#555555" })); w.position.set(X + (dz > 0 ? 0.1 : -0.08), 0.15, Z + dz); w.userData.wave = dz; board.add(w); }
        continue; }
      const base = tr === "mata" ? "#9CCB78" : tr === "encru" ? "#E6CC92" : (x + y) % 2 ? "#EADBB8" : "#F5ECD5";
      const m = tileMesh(base); m.position.set(X, TOP / 2, Z); board.add(m);
      if (tr === "mata") for (const [dx, dz, s] of [[-0.24, -0.22, 1], [0.24, -0.18, 0.85], [0.02, 0.22, 0.95], [-0.27, 0.27, 0.7], [0.29, 0.27, 0.75]]) tree(board, X + dx, Z + dz, s);
      if (tr === "encru") { for (const r of [Math.PI / 4, -Math.PI / 4]) { const p = new T.Mesh(new T.BoxGeometry(1.15, 0.012, 0.2), mat("#F7E9C6")); p.rotation.y = r; p.position.set(X, TOP + 0.006, Z); p.receiveShadow = true; board.add(p); }
        for (const [dx, dz] of [[-0.12, -0.08], [0.12, -0.08], [0, 0.12]]) { const cnd = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 0.14, 8), mat("#FFFDF5")); cnd.position.set(X + dx, TOP + 0.07, Z + dz); cnd.castShadow = true; board.add(cnd);
          const fl = new T.Mesh(new T.ConeGeometry(0.03, 0.08, 6), new T.MeshBasicMaterial({ color: C("#FF9A3C") })); fl.position.set(X + dx, TOP + 0.19, Z + dz); fl.userData.flame = Math.random() * 6; board.add(fl); } } }
    marks = new T.Group(); scene.add(marks); boardKey = viewer + ":" + JSON.stringify(g.terr);
  }
  // ---------- miniaturas ----------
  function portraitTex(id) { if (texCache.has(id)) return texCache.get(id); const c = ART.token(id, 256), t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; texCache.set(id, t); return t; }
  function makePiece(p) { const g = new T.Group(), team = C(p.team);
    const base = new T.Mesh(new T.CylinderGeometry(0.38, 0.42, 0.16, 40), mat(p.team, { r: 0.5 })); base.position.y = 0.08; base.castShadow = true; base.receiveShadow = true; g.add(base);
    const top = new T.Mesh(new T.CylinderGeometry(0.3, 0.34, 0.02, 40), mat(p.team, { r: 0.4 })); top.position.y = 0.17; top.material.color.multiplyScalar(0.8); g.add(top);
    if (p.gen) { const gold = new T.Mesh(new T.TorusGeometry(0.41, 0.025, 8, 40), mat("#F2B632", { r: 0.35 })); gold.rotation.x = Math.PI / 2; gold.position.y = 0.16; g.add(gold); }
    const stand = new T.Group(); stand.position.y = 0.17; g.add(stand);
    const rad = p.gen ? 0.46 : 0.41, cy = rad + 0.05;
    const ring = new T.Mesh(new T.CircleGeometry(rad + 0.045, 48), new T.MeshStandardMaterial({ color: team, roughness: 0.5 })); ring.position.set(0, cy, -0.012); ring.castShadow = true; stand.add(ring);
    const back = new T.Mesh(new T.CircleGeometry(rad + 0.06, 48), new T.MeshStandardMaterial({ color: C("#2A1E16"), side: T.BackSide })); back.position.set(0, cy, -0.016); stand.add(back);
    const face = new T.Mesh(new T.CircleGeometry(rad, 48), new T.MeshStandardMaterial({ map: portraitTex(p.art), roughness: 0.75 })); face.position.set(0, cy, 0); stand.add(face);
    const foot = new T.Mesh(new T.BoxGeometry(0.16, 0.08, 0.06), mat("#2A1E16")); foot.position.set(0, 0.04, -0.01); stand.add(foot);
    const glow = new T.Mesh(new T.RingGeometry(0.45, 0.53, 48), new T.MeshBasicMaterial({ color: C("#F2B632"), transparent: true, opacity: 0, depthWrite: false })); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.01; g.add(glow);
    g.userData = { stand, face, glow, mats: [], cy, rad }; g.traverse(o => { if (o.material) g.userData.mats.push(o.material); }); scene.add(g); return g; }
  // lista de peças: { key, art, team, gen, x, y (fracionário, casa do jogo), lift, scale, alpha, tired, ready, sel }
  function syncPieces(list, viewer) { const seen = new Set();
    for (const p of list) { seen.add(p.key); let g = pieces.get(p.key); if (!g || g.userData.art !== p.art || g.userData.team !== p.team) { if (g) scene.remove(g); g = makePiece(p); g.userData.art = p.art; g.userData.team = p.team; pieces.set(p.key, g); }
      const vx = viewer === 0 ? p.x : BW - 1 - p.x, vy = viewer === 0 ? p.y : BH - 1 - p.y; g.position.set(wx(vx), TOP + (p.lift || 0), wz(vy)); g.scale.setScalar(Math.max(0.001, p.scale ?? 1));
      g.userData.stand.rotation.set(-pitch * 0.45, yaw, 0, "YXZ");
      const a = p.alpha ?? 1; for (const m of g.userData.mats) { if (m === g.userData.glow.material) continue; m.transparent = a < 1; m.opacity = a; }
      g.userData.face.material.color.setScalar(p.tired ? 0.62 : 1);
      g.userData.glow.material.opacity = p.sel ? 0.95 : p.ready ? p.pulse : 0; g.userData.glow.material.color.set(p.sel ? "#FFD23F" : "#F2B632"); }
    for (const [k, g] of pieces) if (!seen.has(k)) { scene.remove(g); pieces.delete(k); } }
  // ---------- marcas no chão ----------
  const markGeo = { tile: new T.PlaneGeometry(0.86, 0.86), dot: new T.CircleGeometry(0.12, 24), ring: new T.RingGeometry(0.44, 0.56, 48) };
  const markMat = { place: new T.MeshBasicMaterial({ color: C("#F2B632"), transparent: true, opacity: 0.55, depthWrite: false }), dot: new T.MeshBasicMaterial({ color: C("#2F7FD8") }),
    foe: new T.MeshBasicMaterial({ color: C("#E0473A"), transparent: true, opacity: 0.95, depthWrite: false }), ally: new T.MeshBasicMaterial({ color: C("#2E9E4F"), transparent: true, opacity: 0.95, depthWrite: false }) };
  function setMarks(m, viewer, clock) { if (!marks) return; while (marks.children.length) marks.remove(marks.children[0]);
    const add = (geo, mt, x, y, h, s = 1) => { const vx = viewer === 0 ? x : BW - 1 - x, vy = viewer === 0 ? y : BH - 1 - y, o = new T.Mesh(geo, mt); o.rotation.x = -Math.PI / 2; o.position.set(wx(vx), h, wz(vy)); o.scale.setScalar(s); marks.add(o); };
    const pul = 1 + 0.06 * Math.sin(clock * 6);
    for (const [x, y] of m.place || []) add(markGeo.tile, markMat.place, x, y, TOP + 0.015);
    for (const [x, y] of m.move || []) add(markGeo.dot, markMat.dot, x, y, TOP + 0.02);
    for (const [x, y] of m.target || []) add(markGeo.ring, markMat.foe, x, y, TOP + 0.02, pul);
    for (const [x, y] of m.ally || []) add(markGeo.ring, markMat.ally, x, y, TOP + 0.02, pul); }
  function render(clock, shake) { if (!R || !board) return;
    board.traverse(o => { if (o.userData.flame !== undefined) o.scale.y = 0.85 + 0.25 * Math.sin(clock * 9 + o.userData.flame); if (o.userData.wave !== undefined) o.position.x += Math.sin(clock * 2 + o.userData.wave * 10) * 0.0008; });
    if (baseCam) { cam.position.copy(baseCam); if (shake) { cam.position.x += shake[0]; cam.position.y += shake[1]; } }
    R.render(scene, cam); }
  // mundo -> tela (px CSS); h = altura acima do topo da casa
  const v3 = new T.Vector3();
  function project(x, y, h, viewer) { const vx = viewer === 0 ? x : BW - 1 - x, vy = viewer === 0 ? y : BH - 1 - y; v3.set(wx(vx), TOP + h, wz(vy)).project(cam); return [(v3.x + 1) / 2 * W, (1 - v3.y) / 2 * H]; }
  // tela -> casa do jogo (raio contra o plano do topo das casas)
  const ray = new T.Raycaster(), plane = new T.Plane(new T.Vector3(0, 1, 0), -TOP), hit = new T.Vector3();
  function pick(px, py, viewer) { ray.setFromCamera({ x: px / W * 2 - 1, y: -(py / H * 2 - 1) }, cam); if (!ray.ray.intersectPlane(plane, hit)) return null;
    const vx = Math.round(hit.x + (BW - 1) / 2), vy = Math.round(hit.z + (BH - 1) / 2); if (vx < 0 || vy < 0 || vx >= BW || vy >= BH) return null; return viewer === 0 ? [vx, vy] : [BW - 1 - vx, BH - 1 - vy]; }
  // tamanho de uma casa na tela (para escalar números e etiquetas)
  function tilePx() { const a = project(0, 3, 0, 0), b = project(1, 3, 0, 0); return Math.hypot(b[0] - a[0], b[1] - a[1]); }
  return { init, resize, setView, buildBoard, needBoard: (g, v) => boardKey !== v + ":" + JSON.stringify(g.terr), syncPieces, setMarks, render, project, pick, tilePx, get yaw() { return yaw; } };
})();
