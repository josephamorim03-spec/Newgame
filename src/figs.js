// FIGS — miniaturas 3D dos personagens (Three.js), modeladas com primitivas e renderizadas em 3/4
// para imagens transparentes, em 8 direções: o boneco vira para onde anda (0 = de frente para você, 4 = de costas).
// O tabuleiro continua 2D; só os bonecos são 3D.
const FIGS = (() => {
  const T = THREE, C = c => new T.Color(c).convertSRGBToLinear();
  let R = null, scene, cam, outline;
  const cache = new Map(), models = new Map(), anchorCache = new Map();
  const EMPTY_ANCHORS = Object.freeze({});
  function setup() { if (R) return; R = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); R.outputEncoding = T.sRGBEncoding; R.setClearColor(0x000000, 0);
    R.toneMapping = T.NoToneMapping; scene = new T.Scene();
    scene.add(new T.HemisphereLight(C("#FFF6E8"), C("#7A6A58"), 0.75));
    const key = new T.DirectionalLight(C("#FFF1DC"), 0.95); key.position.set(-2.5, 4, 3.5); scene.add(key);
    const fill = new T.DirectionalLight(C("#DCE6FF"), 0.25); fill.position.set(3, 1.5, 2); scene.add(fill);
    const rim = new T.DirectionalLight(C("#FFFFFF"), 0.45); rim.position.set(1, 3, -4); scene.add(rim);
    outline = new T.MeshBasicMaterial({ color: C("#2A1E16"), side: T.BackSide });
    cam = new T.PerspectiveCamera(24, 1, 0.1, 50); }
  // ---------- kit de modelagem ----------
  function kit(root) {
    // segmentos proporcionais ao tamanho: a silhueta vem da forma, não da densidade da malha (lição da Mula: 7 mil triângulos)
    const seg = r => r >= 0.25 ? 16 : r >= 0.1 ? 12 : r >= 0.04 ? 9 : 7;
    const K = {
      root,
      // ponto de emissão de efeito; n = para onde ele "olha" (some quando estiver de costas para a câmera)
      anchor(type, p, n) { const a = root.userData.anchors || (root.userData.anchors = {}); (a[type] || (a[type] = [])).push({ p: new T.Vector3(...p), n: n ? new T.Vector3(...n).normalize() : null }); },
      mat: (c, o = {}) => new T.MeshStandardMaterial({ color: C(c), roughness: o.rough ?? 0.72, metalness: o.metal ?? 0, emissive: C(o.em || "#000000") }),
      // malha com contorno fino (casco invertido)
      mesh(geo, col, o = {}) { const m = new T.Mesh(geo, typeof col === "string" ? K.mat(col, o) : col); if (o.out !== false) { const h = new T.Mesh(geo, outline); h.scale.setScalar(1 + (o.ow ?? 0.03)); m.add(h); } (o.parent || root).add(m); return m; },
      at(m, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) { m.position.set(...p); m.rotation.set(...r); m.scale.set(...s); return m; },
      ball(r, col, p, s = [1, 1, 1], o = {}) { const n = o.seg || seg(r * Math.max(...s)); return K.at(K.mesh(new T.SphereGeometry(r, n, o.rings || Math.max(5, Math.round(n * 0.62))), col, o), p, o.rot || [0, 0, 0], s); },
      cone(r, h, col, p, rot = [0, 0, 0], o = {}) { return K.at(K.mesh(new T.ConeGeometry(r, h, o.seg || (r > 0.06 ? 10 : 7)), col, o), p, rot, o.s || [1, 1, 1]); },
      cyl(r1, r2, h, col, p, rot = [0, 0, 0], o = {}) { return K.at(K.mesh(new T.CylinderGeometry(r1, r2, h, o.seg || seg(Math.max(r1, r2))), col, o), p, rot, o.s || [1, 1, 1]); },
      box(w, h, d, col, p, rot = [0, 0, 0], o = {}) { return K.at(K.mesh(new T.BoxGeometry(w, h, d), col, o), p, rot); },
      torus(r, t, col, p, rot = [0, 0, 0], o = {}) { return K.at(K.mesh(new T.TorusGeometry(r, t, o.rings || 6, o.seg || o.tseg || 18, o.arc || Math.PI * 2), col, o), p, rot, o.s || [1, 1, 1]); },
      limb(a, b, r, col, o = {}) { const A = new T.Vector3(...a), B = new T.Vector3(...b), d = B.clone().sub(A), len = d.length();
        const m = K.mesh(new T.CylinderGeometry(o.r2 ?? r, r, len, o.seg || seg(r)), col, o); m.position.copy(A.clone().add(B).multiplyScalar(0.5)); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
        if (o.joint !== false) { K.ball(r, col, a, [1, 1, 1], o); K.ball(o.r2 ?? r, col, b, [1, 1, 1], o); } return m; },
      lathe(pts, col, p = [0, 0, 0], o = {}) { return K.at(K.mesh(new T.LatheGeometry(pts.map(([x, y]) => new T.Vector2(x, y)), o.seg || 18), col, o), p, o.rot || [0, 0, 0], o.s || [1, 1, 1]); },
      // anéis horizontais ligados (técnica da Mula): pescoços, chamas, troncos
      centered(g, col, o) { g.computeBoundingBox(); const c = g.boundingBox.getCenter(new T.Vector3()); g.translate(-c.x, -c.y, -c.z); const m = K.mesh(g, col, o); m.position.copy(c); return m; },
      // o.follow: cada anel acompanha a direção do caminho (tecido dobrado, mechas)
      sweep(rings, col, o = {}) { const v = [], idx = [], n = o.n || o.seg || 10;
        for (let i = 0; i < rings.length; i++) { const [x, y, z, rx, rz] = rings[i], q = new T.Quaternion();
          if (o.follow) { const a = rings[Math.max(0, i - 1)], b = rings[Math.min(rings.length - 1, i + 1)]; q.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize()); }
          for (let j = 0; j < n; j++) { const a = j / n * Math.PI * 2, d = new T.Vector3(Math.cos(a) * rx, 0, Math.sin(a) * rz).applyQuaternion(q); v.push(x + d.x, y + d.y, z + d.z); } }
        for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < n; j++) { const a = i * n + j, b = i * n + (j + 1) % n; idx.push(a, a + n, b, b, a + n, b + n); }
        for (let j = 1; j < n - 1; j++) { idx.push(0, j, j + 1); const e = (rings.length - 1) * n; idx.push(e, e + j + 1, e + j); }
        const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(v, 3)); g.setIndex(idx); g.computeVertexNormals(); return K.centered(g, col, o); },
      tube(pts, radius, col, o = {}) { const curve = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p))); return K.centered(new T.TubeGeometry(curve, o.steps || 16, radius, o.seg || 6, false), col, o); },
      // tubo afinado ao longo de uma curva (rabos, galhadas, focinhos, cobra, cabelo); r = [início, fim] ou função(u)
      loft(pts, r, col, o = {}) { const curve = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p))), N = o.steps || 14, m = o.n || 8, u0 = o.u0 ?? 0, u1 = o.u1 ?? 1;
        const rad = typeof r === "function" ? r : u => r[0] + (r[1] - r[0]) * u, fr = curve.computeFrenetFrames(N, false), v = [], idx = [], up = new T.Vector3(0, 1, 0);
        for (let i = 0; i <= N; i++) { const t = i / N, u = Math.min(1, Math.max(0, u0 + (u1 - u0) * t)), P = curve.getPointAt(u), tg = curve.getTangentAt(u);
          let nrm = new T.Vector3().crossVectors(tg, up); if (nrm.lengthSq() < 1e-4) nrm = fr.normals[i].clone(); nrm.normalize(); const bn = new T.Vector3().crossVectors(tg, nrm).normalize(), rr = Math.max(0.002, rad(u));
          for (let j = 0; j < m; j++) { const a = j / m * Math.PI * 2, c = Math.cos(a) * rr, s2 = Math.sin(a) * rr * (o.flat || 1); v.push(P.x + nrm.x * c + bn.x * s2, P.y + nrm.y * c + bn.y * s2, P.z + nrm.z * c + bn.z * s2); } }
        for (let i = 0; i < N; i++) for (let j = 0; j < m; j++) { const a = i * m + j, b = i * m + (j + 1) % m; idx.push(a, b, a + m, b, b + m, a + m); }
        for (let j = 1; j < m - 1; j++) { idx.push(0, j + 1, j); const e = N * m; idx.push(e, e + j, e + j + 1); }
        const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(v, 3)); g.setIndex(idx); g.computeVertexNormals(); return K.centered(g, col, o); },
      // chama esculpida curva e cheia (da Mula), em camadas de cor
      flame(base, h, bend, rad, col, em) { const [x, y, z] = base, [bx, bz] = bend;
        return K.sweep([[x, y, z, rad * 0.72, rad * 0.65], [x + bx * 0.1, y + h * 0.18, z + bz * 0.1, rad * 0.92, rad * 0.7], [x + bx * 0.25, y + h * 0.38, z + bz * 0.25, rad, rad * 0.72],
          [x + bx * 0.65, y + h * 0.64, z + bz * 0.55, rad * 0.62, rad * 0.44], [x + bx * 1.18, y + h * 0.83, z + bz * 0.87, rad * 0.28, rad * 0.2], [x + bx, y + h, z + bz, 0.002, 0.002]], col, { out: false, em }); },
      eye(p, r, look = [0, 0], o = {}) { K.ball(r, o.white || "#FFFFFF", p, [1, o.h || 1.12, 0.7], { ow: 0.08, rough: 0.3 }); K.ball(r * 0.56, o.iris || "#1E1612", [p[0] + look[0] * r * 0.35, p[1] + look[1] * r * 0.3, p[2] + r * 0.5], [1, 1, 0.6], { out: false, rough: 0.2 });
        K.ball(r * 0.18, "#FFFFFF", [p[0] + look[0] * r * 0.35 - r * 0.2, p[1] + r * 0.28, p[2] + r * 0.8], [1, 1, 1], { out: false, em: "#FFFFFF" }); },
      brow(p, w, rz, col = "#2A1E16") { K.box(w, w * 0.22, w * 0.25, col, p, [0, 0, rz], { out: false }); },
      teeth(n, x0, x1, y, z, h, dir = -1, col = "#FFFDF5", curve = 0) { for (let i = 0; i < n; i++) { const u = n > 1 ? i / (n - 1) : 0.5, x = x0 + (x1 - x0) * u; K.cone(h * 0.45, h, col, [x, y, z - curve * (u - 0.5) ** 2], [dir > 0 ? 0 : Math.PI, 0, 0], { ow: 0.06, seg: 6, rough: 0.35 }); } },
      // garra curva em gancho (loft afinado)
      claw(a, b, bend, r, col = "#FFF6E0") { const m = [(a[0] + b[0]) / 2 + bend[0], (a[1] + b[1]) / 2 + bend[1], (a[2] + b[2]) / 2 + bend[2]]; return K.loft([a, m, b], [r, 0.003], col, { steps: 6, n: 6, ow: 0.05 }); },
      // tufos de pelo espalhados numa elipse (dão volume e acabamento)
      tufts(n, c, rx, ry, rz, col, size, seed = 1, o = {}) { let s = seed; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
        for (let i = 0; i < n; i++) { const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u), nx = r * Math.cos(th), ny = u, nz = r * Math.sin(th);
          if (o.minY !== undefined && ny < o.minY) continue; if (o.front === false && nz > 0.4) continue;
          const p = [c[0] + nx * rx, c[1] + ny * ry, c[2] + nz * rz], m = K.cone(size * 0.5, size * 1.6, col, p, [0, 0, 0], { seg: 5, ow: 0.05 });
          m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(nx, ny * 0.8 - 0.25, nz).normalize()); } },
    };
    return K;
  }
  const SKIN = "#B86A40", DARK = "#6B3E26";
  const DEF = {
    // CURUPIRA: mechas de fogo curvas em três camadas, saia de folhas e pés para trás.
    curupira: { build(K) {
      const S = SKIN, GREEN = "#3FA34D", RED = "#E23B2E", ORANGE = "#F57C2A", GOLD = "#FFD23F";
      const ball = (r, c, p, scale = [1, 1, 1], o = {}) => K.ball(r, c, p, scale, { seg: 10, rings: 6, ow: 0.03, ...o });
      const limb = (a, b, r, o = {}) => K.limb(a, b, r, S, { seg: 10, joint: false, ow: 0.035, ...o });
      // Base firme: calcanhares para a frente (+Z), dedos e peito do pé para trás (-Z).
      for (const side of [-1, 1]) {
        limb([side * 0.115, 0.50, 0], [side * 0.155, 0.30, 0.025], 0.072, { r2: 0.06 });
        ball(0.061, S, [side * 0.155, 0.30, 0.025]);
        limb([side * 0.155, 0.30, 0.025], [side * 0.17, 0.10, 0], 0.056, { r2: 0.046 });
        ball(0.085, S, [side * 0.17, 0.065, -0.085], [0.92, 0.62, 1.65]);
        for (let i = 0; i < 3; i++) ball(0.027, S, [side * 0.17 + (i - 1) * 0.037, 0.049, -0.205], [1, 0.75, 1.25], { seg: 8, rings: 5, out: false });
        K.torus(0.054, 0.014, RED, [side * 0.17, 0.145, 0], [Math.PI / 2, 0, 0], { seg: 12, rings: 4, ow: 0.03 });
      }
      K.lathe([[0.01, 0.42], [0.20, 0.44], [0.215, 0.53], [0.17, 0.65], [0.01, 0.65]], "#C9372A", [0, 0, 0], { seg: 14, ow: 0.025 });
      K.box(0.13, 0.20, 0.025, RED, [0, 0.43, 0.18], [-0.1, 0, 0], { ow: 0.03 });
      // Folhas largas, pontudas e sobrepostas; continuam envolvendo a cintura por trás.
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, x = Math.sin(a), z = Math.cos(a), low = 0.35 + (i % 2) * 0.025;
        const leaf = K.sweep([[0, low, 0.06, 0.004, 0.004], [0, 0.43, 0.04, 0.07, 0.018], [0, 0.56, 0, 0.058, 0.022], [0, 0.61, -0.015, 0.012, 0.005]], i % 3 ? "#4FAE4A" : "#7BC24A", { seg: 6, ow: 0.025 });
        leaf.position.applyAxisAngle(new T.Vector3(0, 1, 0), a); leaf.position.x += x * 0.17; leaf.position.z += z * 0.15; leaf.rotation.y = a;
      }
      ball(0.205, S, [0, 0.83, 0], [1.05, 1.18, 0.82]);
      for (const y of [0.80, 0.755]) K.box(0.12, 0.018, 0.012, RED, [0, y, 0.166], [0, 0, 0], { out: false });
      limb([-0.19, 0.95, 0], [-0.31, 0.76, 0.035], 0.065); limb([-0.31, 0.76, 0.035], [-0.34, 0.57, 0.11], 0.055);
      ball(0.067, S, [-0.34, 0.535, 0.12], [0.85, 1.05, 0.8]);
      limb([0.19, 0.95, 0], [0.34, 0.80, 0.01], 0.065); limb([0.34, 0.80, 0.01], [0.24, 0.66, 0.13], 0.055);
      ball(0.065, S, [0.22, 0.65, 0.14], [0.85, 1, 0.75]);
      for (const side of [-1, 1]) K.torus(0.065, 0.018, GREEN, [side * 0.25, 0.86, 0.01], [Math.PI / 2, side * 0.4, 0], { seg: 12, rings: 4, ow: 0.03 });
      K.torus(0.15, 0.023, GREEN, [0, 0.975, 0.025], [Math.PI / 2 - 0.25, 0, 0], { seg: 16, rings: 4, ow: 0.03 });
      for (let i = 0; i < 5; i++) ball(0.025, GOLD, [-0.10 + i * 0.05, 0.935 - Math.abs(i - 2) * 0.01, 0.16], [1, 1, 0.75], { seg: 8, rings: 5, out: false });
      ball(0.29, S, [0, 1.275, 0.015], [1, 1.02, 0.94], { seg: 14, rings: 8 });
      for (const side of [-1, 1]) {
        ball(0.065, S, [side * 0.285, 1.27, 0.015], [0.55, 1, 0.75], { seg: 10, rings: 6 });
        ball(0.073, "#FFFDF5", [side * 0.10, 1.29, 0.263], [1, 1.05, 0.5], { out: false });
        ball(0.037, "#2A1E16", [side * 0.10 + 0.006, 1.285, 0.297], [1, 1.05, 0.35], { seg: 10, rings: 6, out: false });
        ball(0.012, "#FFFFFF", [side * 0.10 - 0.005, 1.305, 0.31], [1, 1, 0.5], { seg: 6, rings: 4, out: false, em: "#FFFFFF" });
        K.brow([side * 0.10, 1.375, 0.271], 0.10, side * 0.20);
        for (const y of [1.18, 1.145]) K.box(0.061, 0.015, 0.012, RED, [side * 0.185, y, 0.248], [0, side * 0.5, side * 0.12], { out: false });
      }
      ball(0.038, "#A85A34", [0, 1.205, 0.30], [1, 0.8, 0.8], { out: false });
      K.tube([[-0.105, 1.14, 0.27], [-0.05, 1.105, 0.285], [0.045, 1.11, 0.283], [0.10, 1.145, 0.27]], 0.016, "#7A2230", { steps: 10, seg: 4, out: false });
      // Massa de cabelo contínua + mechas curvas em volta de toda a cabeça.
      ball(0.295, RED, [0, 1.47, -0.018], [1.03, 0.52, 0.99], { seg: 16, rings: 8 });
      const flame = (x, y, z, h, r, bendX, bendZ, col, outlined = false) => K.sweep([
        [x, y, z, r * 0.65, r * 0.7], [x, y + h * 0.25, z, r, r * 0.8],
        [x + bendX * 0.35, y + h * 0.65, z + bendZ * 0.4, r * 0.52, r * 0.48],
        [x + bendX, y + h, z + bendZ, 0.003, 0.003]], col, { seg: 8, ow: 0.025, out: outlined, em: col === RED ? "#401006" : col === ORANGE ? "#6A2705" : "#916000" });
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, x = Math.sin(a), z = Math.cos(a), h = 0.34 + (i % 3) * 0.055;
        flame(x * 0.21, 1.40, z * 0.18 - 0.025, h, 0.103, x * 0.085 + 0.035, z * 0.055 - 0.05, RED);
      }
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + 0.35, x = Math.sin(a), z = Math.cos(a);
        flame(x * 0.12, 1.51, z * 0.11 - 0.015, 0.33 + (i % 2) * 0.065, 0.088, 0.06 + x * 0.035, -0.065, ORANGE);
      }
      for (const [x, z, h] of [[-0.065, 0.04, 0.28], [0.045, -0.07, 0.35], [0.085, 0.085, 0.24]]) flame(x, 1.61, z, h, 0.052, 0.035, -0.05, GOLD, false);
      // Uma franja quente enquadra o rosto, sem cobrir olhos ou marcas faciais.
      for (const side of [-1, 1]) flame(side * 0.20, 1.37, 0.18, 0.20, 0.063, side * 0.025, -0.055, ORANGE);
      K.anchor("fire", [-0.12, 1.76, 0.02]); K.anchor("fire", [0.055, 1.87, -0.07]); K.anchor("fire", [0.16, 1.74, 0.06]);
      K.anchor("glow", [0, 1.72, 0]); K.anchor("dust", [-0.17, 0.05, -0.16]);
    } },
    // SACI: uma única perna flexionada, carapuça caída, cachimbo de barro e espiral de vento.
    saci: { build(K) {
      const S = DARK, RED = "#E23B2E", DR = "#B52A22", INK = "#2A1E16";
      const ball = (r, c, p, scale = [1, 1, 1], o = {}) => K.ball(r, c, p, scale, { seg: 12, rings: 7, ow: 0.035, ...o });
      const limb = (a, b, r, c = S, o = {}) => K.limb(a, b, r, c, { seg: 10, joint: false, ow: 0.035, ...o });
      // A perna é visível entre o calção e o pé, sem nenhum segundo membro.
      limb([0, 0.54, 0], [-0.075, 0.32, 0.025], 0.078, S, { r2: 0.058 });
      ball(0.061, S, [-0.075, 0.32, 0.025]);
      limb([-0.075, 0.32, 0.025], [0.015, 0.13, 0.035], 0.052, S, { r2: 0.044 });
      ball(0.083, S, [0.02, 0.083, 0.085], [0.85, 0.63, 1.6]);
      for (let i = 0; i < 3; i++) ball(0.025, S, [-0.025 + i * 0.028, 0.065, 0.19], [0.8, 0.7, 1], { seg: 8, rings: 5, out: false });
      K.lathe([[0.01, 0.43], [0.17, 0.44], [0.195, 0.52], [0.155, 0.63], [0.01, 0.63]], RED, [0, 0, 0], { seg: 14, ow: 0.03 });
      K.torus(0.152, 0.022, INK, [0, 0.615, 0], [Math.PI / 2, 0, 0], { seg: 16, rings: 4, s: [1, 0.87, 1] });
      K.box(0.045, 0.042, 0.025, "#F2C94C", [0.015, 0.61, 0.148], [0, 0, 0], { out: false });
      ball(0.19, S, [-0.025, 0.82, 0], [0.88, 1.18, 0.8], { rot: [0, 0, -0.10] });
      // Mão na cintura e outra segurando o cachimbo, deixando espaço entre braço e corpo.
      limb([-0.16, 0.94, 0], [-0.31, 0.79, 0.04], 0.055);
      limb([-0.31, 0.79, 0.04], [-0.20, 0.66, 0.12], 0.047);
      ball(0.06, S, [-0.18, 0.665, 0.13], [0.85, 1, 0.75]);
      limb([0.13, 0.94, 0], [0.30, 0.85, 0.11], 0.055);
      limb([0.30, 0.85, 0.11], [0.40, 1.045, 0.23], 0.047);
      ball(0.055, S, [0.405, 1.045, 0.235], [0.85, 1, 0.85]);
      ball(0.29, S, [-0.025, 1.245, 0.015], [1, 1.03, 0.9], { seg: 16, rings: 10 });
      for (const side of [-1, 1]) ball(0.063, S, [-0.025 + side * 0.285, 1.24, 0.015], [0.5, 1, 0.7]);
      // Expressão travessa com sorriso de canto; olhos e nariz sem excesso de malhas.
      for (const side of [-1, 1]) {
        const x = -0.025 + side * 0.10;
        ball(0.072, "#FFFFFF", [x, 1.26, 0.252], [1, 1.07, 0.5], { out: false });
        ball(0.037, INK, [x + 0.014, 1.255, 0.284], [1, 1.1, 0.35], { seg: 10, rings: 6, out: false });
        ball(0.012, "#FFFFFF", [x + 0.006, 1.272, 0.299], [1, 1, 0.5], { seg: 6, rings: 4, out: false, em: "#FFFFFF" });
        K.brow([x, 1.35 + side * 0.01, 0.262], 0.095, side * 0.20);
      }
      ball(0.04, "#7D4A2B", [-0.02, 1.18, 0.29], [1.05, 0.7, 0.9], { out: false });
      K.tube([[-0.13, 1.135, 0.257], [-0.075, 1.095, 0.27], [0, 1.09, 0.275], [0.09, 1.13, 0.257]], 0.017, "#3E201A", { seg: 4, steps: 10, out: false });
      K.box(0.036, 0.03, 0.014, "#FFFDF5", [-0.07, 1.107, 0.283], [0, 0, 0.14], { out: false });
      // Gorro de tecido: dobra lateral que desce; ponta vermelha, sem pompom de Papai Noel.
      K.sweep([[0, 1.40, -0.01, 0.286, 0.248], [-0.02, 1.55, -0.025, 0.24, 0.205], [-0.065, 1.71, -0.045, 0.15, 0.14], [-0.16, 1.80, -0.045, 0.09, 0.085], [-0.28, 1.70, -0.035, 0.055, 0.055], [-0.31, 1.60, -0.015, 0.006, 0.006]], RED, { seg: 16, ow: 0.025, follow: true });
      K.torus(0.276, 0.032, DR, [-0.015, 1.418, 0.005], [Math.PI / 2, 0, 0.04], { seg: 20, rings: 5, s: [1, 0.87, 1], ow: 0.025 });
      K.tube([[-0.065, 1.72, 0.098], [-0.135, 1.70, 0.095], [-0.235, 1.69, 0.035]], 0.01, DR, { steps: 8, seg: 4, out: false });
      // Cachimbo afastado da bochecha: haste curva, bojo oco e borda nítida em 3D.
      K.tube([[0.085, 1.125, 0.26], [0.22, 1.09, 0.31], [0.36, 1.075, 0.285], [0.44, 1.09, 0.265]], 0.021, "#8B5A2B", { steps: 12, seg: 6, ow: 0.04 });
      K.lathe([[0.01, 0], [0.048, 0.01], [0.068, 0.09], [0.067, 0.14], [0.045, 0.14], [0.043, 0.095]], "#8B5A2B", [0.44, 1.04, 0.265], { seg: 12, ow: 0.03 });
      K.torus(0.056, 0.013, "#5A3520", [0.44, 1.18, 0.265], [Math.PI / 2, 0, 0], { seg: 12, rings: 4, out: false });
      ball(0.038, "#E8662E", [0.44, 1.158, 0.265], [1, 0.15, 1], { seg: 10, rings: 5, out: false, em: "#7A1008" });
      // Dois fios de vento desenham uma espiral, com a perna sempre livre no centro.
      for (let strand = 0; strand < 2; strand++) { const pts = [];
        for (let i = 0; i <= 32; i++) { const u = i / 32, a = u * Math.PI * 3.2 + strand * 2.5, r = 0.29 - u * 0.18; pts.push([Math.cos(a) * r, 0.035 + u * 0.21, Math.sin(a) * r]); }
        K.tube(pts, strand ? 0.010 : 0.015, strand ? "#B9A384" : "#D9CFC0", { steps: 40, seg: 4, out: false });
      }
      K.anchor("smoke", [0.44, 1.188, 0.265]); K.anchor("glow", [0.44, 1.165, 0.265]); K.anchor("dust", [0.02, 0.05, 0.08]);
    } },
    // MAPINGUARI: bloco peludo (menos tufos, maiores), braços contínuos, garras em gancho, olho único e bocarra
    mapin: { build(K) {
      const FUR = "#8A5A35", DFUR = "#6B4227";
      for (const s of [-1, 1]) { K.cyl(0.13, 0.15, 0.28, DFUR, [s * 0.2, 0.14, 0]); for (let i = 0; i < 3; i++) K.cone(0.025, 0.08, "#FFF6E0", [s * 0.2 + (i - 1) * 0.06, 0.03, 0.15], [Math.PI / 2, 0, 0], { seg: 5 }); }
      K.ball(0.55, FUR, [0, 0.82, 0], [1, 1.12, 0.82]); K.ball(0.4, "#9A6A42", [0, 0.76, 0.12], [1, 1.05, 0.7], { out: false });
      K.tufts(34, [0, 0.82, 0], 0.55, 0.62, 0.45, DFUR, 0.075, 3, { front: false });
      for (let i = 0; i < 9; i++) { const a = -1.1 + i * 0.275; K.cone(0.08, 0.22, FUR, [Math.sin(a) * 0.42, 1.38 + Math.cos(a) * 0.04, -0.05], [0, 0, -a * 0.9], { seg: 6 }); }
      for (const s of [-1, 1]) { K.loft([[s * 0.48, 1.08, 0], [s * 0.66, 0.78, 0.04], [s * 0.67, 0.5, 0.1], [s * 0.62, 0.3, 0.13]], [0.14, 0.1], FUR, { n: 10 });
        K.tufts(8, [s * 0.62, 0.66, 0.06], 0.12, 0.28, 0.12, DFUR, 0.055, 7 + s);
        for (let i = 0; i < 3; i++) K.claw([s * 0.62 + (i - 1) * 0.06, 0.25, 0.15], [s * 0.6 + (i - 1) * 0.07, 0.07, 0.25], [0, -0.01, 0.06], 0.03); }
      K.box(0.42, 0.075, 0.09, DFUR, [0, 1.26, 0.42], [0.3, 0, 0]);
      K.ball(0.16, "#FFFFFF", [0, 1.08, 0.42], [1, 1, 0.6], { rough: 0.3 }); K.ball(0.09, "#E0412F", [0, 1.08, 0.5], [1, 1, 0.5], { out: false, rough: 0.3 }); K.ball(0.042, "#1E1612", [0, 1.08, 0.545], [1, 1, 0.5], { out: false }); K.ball(0.02, "#FFFFFF", [-0.03, 1.11, 0.56], [1, 1, 1], { out: false, em: "#FFFFFF" });
      K.ball(0.27, "#5E1520", [0, 0.68, 0.38], [1, 0.62, 0.5], { ow: 0.05 }); K.ball(0.12, "#C2566A", [0, 0.6, 0.46], [1.3, 0.5, 0.5], { out: false });
      K.teeth(6, -0.19, 0.19, 0.79, 0.49, 0.1, -1, "#FFFDF5", 0.25); K.teeth(5, -0.15, 0.15, 0.57, 0.49, 0.09, 1, "#FFFDF5", 0.25);
    } },
    // CUCA: focinho de jacaré contínuo e achatado, boca aberta, mechas amarelas em tubo, rabo curvo com escamas
    cuca: { build(K) {
      const G = "#5DA34A", DG = "#3E7D36";
      K.loft([[0, 0.24, -0.25], [0, 0.14, -0.5], [0.08, 0.06, -0.72], [0.18, 0.04, -0.82]], [0.11, 0.015], G, { n: 9, flat: 0.75 });
      for (let i = 0; i < 4; i++) K.cone(0.03, 0.07, DG, [0.02 * i, 0.27 - i * 0.05, -0.36 - i * 0.12], [0, 0, 0], { seg: 5 });
      K.lathe([[0.001, 0], [0.4, 0.02], [0.36, 0.3], [0.26, 0.62], [0.2, 0.86], [0.001, 0.9]], "#7C3F98");
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; K.cone(0.05, 0.1, "#7C3F98", [Math.sin(a) * 0.39, 0.03, Math.cos(a) * 0.39], [Math.PI, 0, 0], { seg: 5, ow: 0.05 }); }
      K.lathe([[0.001, 0.6], [0.34, 0.64], [0.31, 0.8], [0.18, 0.93], [0.001, 0.95]], "#4E2466");
      for (let i = 0; i < 7; i++) K.ball(0.03, i % 2 ? "#F2C94C" : "#E8566A", [-0.12 + i * 0.04, 0.95 - Math.abs(i - 3) * 0.012, 0.16], [1, 1, 1], { ow: 0.08 });
      for (const s of [-1, 1]) { K.loft([[s * 0.22, 0.86, 0], [s * 0.34, 0.72, 0.06], [s * 0.37, 0.6, 0.13]], [0.07, 0.06], "#7C3F98", { n: 8 }); K.ball(0.07, G, [s * 0.38, 0.56, 0.14]);
        for (let i = 0; i < 3; i++) K.claw([s * 0.38 + (i - 1) * 0.035, 0.53, 0.16], [s * 0.38 + (i - 1) * 0.04, 0.44, 0.2], [0, 0, 0.02], 0.016); }
      // mechas amarelas: tubos que caem pelas costas
      for (let i = 0; i < 7; i++) { const a = -1.15 + i * 0.38; K.loft([[Math.sin(a) * 0.2, 1.38, -0.12], [Math.sin(a) * 0.27, 1.12, -0.2 - Math.cos(a) * 0.05], [Math.sin(a) * 0.3, 0.86, -0.18 - Math.cos(a) * 0.06], [Math.sin(a) * 0.29, 0.68, -0.12]], u => 0.075 * (1 - u * 0.6), i % 2 ? "#F6C945" : "#E8B232", { n: 7, steps: 10 }); }
      const head = new T.Group(); K.root.add(head); head.position.set(0, 1.2, 0); head.rotation.y = 0.45; const H = kit(head);
      H.ball(0.26, G, [0, 0, -0.04], [1, 0.9, 1]);
      H.loft([[0, 0.02, 0.05], [0, 0.0, 0.32], [0, -0.03, 0.62]], u => 0.17 - u * 0.08, G, { flat: 0.5, n: 10, steps: 8 });
      H.loft([[0, -0.14, 0.05], [0, -0.17, 0.3], [0, -0.24, 0.56]], u => 0.15 - u * 0.07, DG, { flat: 0.42, n: 10, steps: 8 });
      H.loft([[0, -0.08, 0.1], [0, -0.1, 0.32], [0, -0.13, 0.52]], u => 0.11 - u * 0.05, "#C2304A", { flat: 0.45, n: 8, steps: 6, out: false });
      for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { H.cone(0.02, 0.07, "#FFFDF5", [s * (0.1 - i * 0.008), -0.06 - i * 0.004, 0.16 + i * 0.075], [Math.PI, 0, 0], { seg: 5, ow: 0.08 }); H.cone(0.018, 0.06, "#FFFDF5", [s * (0.09 - i * 0.008), -0.16 - i * 0.012, 0.18 + i * 0.065], [0, 0, 0], { seg: 5, ow: 0.08 }); }
      for (let i = 0; i < 5; i++) for (const s of [-1, 1]) H.ball(0.022, DG, [s * 0.07, 0.07 - i * 0.01, 0.15 + i * 0.09], [1, 0.6, 1], { out: false });
      for (const s of [-1, 1]) { H.ball(0.085, G, [s * 0.11, 0.17, 0.05]); H.ball(0.062, "#FFE45C", [s * 0.11, 0.19, 0.1], [1, 1, 0.7], { ow: 0.08, rough: 0.3 }); H.box(0.014, 0.07, 0.02, "#1E1612", [s * 0.11, 0.19, 0.145], [0, 0, 0], { out: false }); H.brow([s * 0.11, 0.27, 0.09], 0.1, s * 0.3, DG); }
      H.ball(0.025, "#2A1E16", [-0.05, 0.04, 0.6], [1, 1, 1], { out: false }); H.ball(0.025, "#2A1E16", [0.05, 0.04, 0.6], [1, 1, 1], { out: false });
      for (let i = 0; i < 7; i++) H.loft([[-0.2 + i * 0.066, 0.2, -0.1], [-0.22 + i * 0.073, 0.3, -0.2], [-0.26 + i * 0.087, 0.26, -0.32]], [0.05, 0.01], "#F6C945", { steps: 5, n: 6 });
    } },
    // LOBISOMEM: pernas digitígradas contínuas, rabo cheio, focinho em tubo, garras curvas
    lobis: { build(K) {
      const F = "#6E6A78", D = "#4A4654", L = "#B9B2C2";
      for (const s of [-1, 1]) { K.loft([[s * 0.15, 0.62, -0.02], [s * 0.2, 0.34, 0.12], [s * 0.19, 0.2, -0.04], [s * 0.18, 0.07, 0.0]], u => 0.095 - u * 0.045, F, { n: 9, steps: 12 }); K.ball(0.08, D, [s * 0.18, 0.05, 0.05], [1, 0.6, 1.5]);
        for (let i = 0; i < 3; i++) K.claw([s * 0.18 + (i - 1) * 0.04, 0.05, 0.12], [s * 0.18 + (i - 1) * 0.045, 0.02, 0.2], [0, 0.01, 0.01], 0.014); }
      K.lathe([[0.001, 0.5], [0.26, 0.5], [0.28, 0.62], [0.26, 0.72], [0.001, 0.72]], "#3E5A8A"); for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; K.cone(0.04, 0.09, "#3E5A8A", [Math.sin(a) * 0.25, 0.47, Math.cos(a) * 0.25], [Math.PI, 0, 0], { seg: 4, ow: 0.05 }); }
      K.loft([[0, 0.6, -0.26], [0, 0.66, -0.48], [0.08, 0.86, -0.62], [0.14, 1.02, -0.6]], u => 0.06 + Math.sin(Math.PI * u) * 0.06, D, { n: 9, steps: 12 });
      K.sweep([[0, 0.66, 0, 0.26, 0.22], [0, 0.85, 0.02, 0.32, 0.26], [0, 1.05, 0, 0.36, 0.27], [0, 1.18, -0.01, 0.3, 0.22], [0, 1.25, 0, 0.14, 0.12]], F);
      K.ball(0.2, L, [0, 0.94, 0.18], [1, 1.3, 0.6], { ow: 0.03 });
      K.tufts(18, [0, 1.12, -0.02], 0.34, 0.18, 0.28, D, 0.065, 11, { minY: -0.2 });
      for (const s of [-1, 1]) { K.loft([[s * 0.3, 1.08, 0], [s * 0.43, 0.8, 0.08], [s * 0.37, 0.56, 0.18]], [0.08, 0.06], F, { n: 9 });
        for (let i = 0; i < 3; i++) K.claw([s * 0.37 + (i - 1) * 0.04, 0.52, 0.2], [s * 0.36 + (i - 1) * 0.05, 0.4, 0.24], [0, 0, 0.03], 0.02); }
      K.ball(0.26, F, [0, 1.38, 0.02]); K.tufts(9, [0, 1.38, -0.05], 0.26, 0.24, 0.2, D, 0.055, 13, { front: false });
      for (const s of [-1, 1]) { K.cone(0.09, 0.3, F, [s * 0.16, 1.66, -0.02], [0, 0, -s * 0.25]); K.cone(0.05, 0.18, "#E8A4B4", [s * 0.155, 1.63, 0.035], [0, 0, -s * 0.25], { out: false }); }
      K.loft([[0, 1.36, 0.16], [0, 1.31, 0.3], [0, 1.3, 0.4]], u => 0.12 - u * 0.05, L, { n: 10, steps: 6 });
      K.ball(0.05, "#1E1612", [0, 1.335, 0.43], [1.2, 0.8, 1], { out: false, rough: 0.2 });
      K.ball(0.09, "#C2304A", [0, 1.2, 0.3], [1, 0.6, 0.6], { ow: 0.06 }); for (const s of [-1, 1]) K.cone(0.02, 0.07, "#FFFDF5", [s * 0.05, 1.235, 0.35], [Math.PI, 0, 0], { seg: 5, ow: 0.12 });
      K.eye([-0.1, 1.44, 0.21], 0.06, [0.2, 0.2], { white: "#FFD23F" }); K.eye([0.1, 1.44, 0.21], 0.06, [-0.2, 0.2], { white: "#FFD23F" });
      K.brow([-0.1, 1.52, 0.25], 0.12, -0.35, "#2F2C38"); K.brow([0.1, 1.52, 0.25], 0.12, 0.35, "#2F2C38");
    } },
    // COBRA-CORAL: um corpo contínuo enrolado, anéis como trechos do mesmo tubo; cabeça triangular, língua bífida
    coral: { scale: 1.55, build(K) {
      const pts = []; for (let i = 0; i <= 26; i++) { const u = i / 26; if (u < 0.72) { const a = u / 0.72 * Math.PI * 3.6, r = 0.36 - u * 0.12; pts.push([Math.cos(a) * r, 0.1 + u * 0.18, Math.sin(a) * r - 0.05]); } else { const v = (u - 0.72) / 0.28; pts.push([Math.cos(Math.PI * 3.6) * 0.27 * (1 - v), 0.23 + v * 0.55, -0.05 + v * 0.18]); } }
      const BANDS = ["#E23B2E", "#E23B2E", "#E23B2E", "#FFF0C8", "#1F1A17", "#1F1A17", "#FFF0C8"], NB = 42, rad = u => 0.1 - u * 0.03;
      for (let b = 0; b < NB; b++) K.loft(pts, rad, BANDS[b % 7], { u0: b / NB, u1: (b + 1.04) / NB, steps: 3, n: 10, ow: 0.04, rough: 0.45 });
      const h = pts[pts.length - 1];
      K.loft([[h[0], h[1] + 0.02, h[2] - 0.05], [h[0], h[1] + 0.05, h[2] + 0.08], [h[0], h[1] + 0.04, h[2] + 0.24]], u => 0.11 - u * 0.06, "#1F1A17", { flat: 0.6, n: 10, steps: 6, rough: 0.4 });
      K.torus(0.1, 0.022, "#FFF0C8", [h[0], h[1] + 0.02, h[2] - 0.03], [Math.PI / 2, 0, 0], { ow: 0.06 });
      for (const s of [-1, 1]) K.eye([h[0] + s * 0.065, h[1] + 0.1, h[2] + 0.1], 0.035, [0, 0], { white: "#FFD23F" });
      K.loft([[h[0], h[1] + 0.03, h[2] + 0.24], [h[0], h[1] + 0.02, h[2] + 0.34]], [0.008, 0.007], "#E23B2E", { out: false, steps: 2, n: 4 });
      for (const s of [-1, 1]) K.loft([[h[0], h[1] + 0.02, h[2] + 0.34], [h[0] + s * 0.03, h[1] + 0.03, h[2] + 0.41]], [0.007, 0.002], "#E23B2E", { out: false, steps: 2, n: 4 });
    } },
    // UIRAPURU: passarinho redondo cantando; notas musicais sobem de verdade
    uira: { scale: 1.3, build(K) {
      const B = "#8B6B3E", DB = "#5E4526";
      for (const s of [-1, 1]) { K.limb([s * 0.1, 0.3, 0], [s * 0.1, 0.06, 0.03], 0.02, "#D9A02E"); for (const a of [-0.5, 0, 0.5]) K.claw([s * 0.1, 0.05, 0.03], [s * 0.1 + Math.sin(a) * 0.07, 0.025, 0.03 + Math.cos(a) * 0.08], [0, 0.01, 0], 0.014, "#D9A02E"); }
      K.ball(0.36, B, [0, 0.55, 0], [1, 0.95, 1]); K.ball(0.25, "#E8662E", [0, 0.6, 0.18], [1, 1.05, 0.7], { ow: 0.03 });
      for (const s of [-1, 1]) K.loft([[s * 0.3, 0.72, 0.05], [s * 0.36, 0.56, -0.08], [s * 0.3, 0.42, -0.3]], u => 0.13 * Math.sin(Math.PI * (0.2 + u * 0.8)), DB, { flat: 0.35, n: 8, steps: 8 });
      for (let i = 0; i < 3; i++) K.loft([[(i - 1) * 0.06, 0.58, -0.3], [(i - 1) * 0.12, 0.5, -0.5], [(i - 1) * 0.17, 0.38, -0.66]], u => 0.07 * Math.sin(Math.PI * (0.15 + u * 0.85)), DB, { flat: 0.3, n: 7, steps: 6 });
      K.ball(0.25, B, [0, 0.98, 0.06]); K.cone(0.07, 0.2, "#F2C94C", [0, 1.0, 0.36], [Math.PI / 2 - 0.35, 0, 0], { seg: 8 }); K.cone(0.06, 0.16, "#D9A92E", [0, 0.93, 0.34], [Math.PI / 2 + 0.45, 0, 0], { seg: 8 });
      K.eye([-0.11, 1.04, 0.2], 0.06, [0, 0]); K.eye([0.11, 1.04, 0.2], 0.06, [0, 0]);
      K.anchor("notes", [0, 1.02, 0.42]);
    } },
    // ONÇA-PINTADA: corpo contínuo ao longo da espinha, rabo curvo, rosetas, rosnando
    onca: { scale: 1.32, build(K) {
      const Y = "#F2A93B", W = "#FFF3D6", SP = "#2A1E16";
      for (const [x, z] of [[-0.16, 0.28], [0.16, 0.28], [-0.16, -0.3], [0.16, -0.3]]) { K.loft([[x, 0.46, z], [x, 0.26, z + 0.03], [x, 0.08, z + 0.02]], [0.08, 0.06], Y, { n: 9 }); K.ball(0.08, Y, [x, 0.05, z + 0.06], [1, 0.6, 1.3]); }
      K.loft([[0, 0.55, -0.45], [0, 0.6, -0.15], [0, 0.6, 0.15], [0, 0.62, 0.38]], u => 0.2 + Math.sin(Math.PI * u) * 0.06, Y, { flat: 0.92, n: 12, steps: 12 });
      K.loft([[0, 0.48, 0.0], [0, 0.46, 0.25]], [0.17, 0.17], W, { flat: 0.6, n: 10, steps: 3, out: false });
      let sd = 5; const rnd = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
      for (let i = 0; i < 22; i++) { const z = -0.42 + rnd() * 0.78, a = (rnd() - 0.5) * 2.6, x = Math.sin(a) * 0.235, y = 0.6 + Math.cos(a) * 0.235; if (y < 0.5) continue;
        K.torus(0.034, 0.011, SP, [x, y, z], [0, 0, 0], { out: false, tseg: 10 }).lookAt(new T.Vector3(x * 4, (y - 0.6) * 4 + 0.6, z)); }
      K.loft([[0, 0.6, -0.46], [0.06, 0.52, -0.66], [0.22, 0.46, -0.78], [0.34, 0.58, -0.76]], [0.05, 0.035], Y, { n: 8, steps: 10 }); K.ball(0.045, SP, [0.345, 0.6, -0.755]);
      K.ball(0.27, Y, [0, 0.8, 0.48]); for (const s of [-1, 1]) { K.ball(0.09, Y, [s * 0.18, 1.02, 0.42], [1, 1, 0.5]); K.ball(0.05, SP, [s * 0.18, 1.02, 0.44], [1, 1, 0.4], { out: false }); }
      for (const [x, y] of [[-0.12, 0.94], [0.12, 0.94], [0, 1.0], [-0.18, 0.82], [0.18, 0.82]]) K.ball(0.025, SP, [x, y, 0.7], [1, 1, 0.4], { out: false });
      K.ball(0.14, W, [0, 0.72, 0.66], [1.1, 0.75, 0.75], { ow: 0.04 }); K.ball(0.04, "#C2566A", [0, 0.78, 0.76], [1.2, 0.8, 0.8], { out: false });
      K.ball(0.07, "#9E1F2C", [0, 0.65, 0.72], [1.1, 0.6, 0.6], { out: false }); for (const s of [-1, 1]) K.cone(0.018, 0.06, "#FFFDF5", [s * 0.05, 0.69, 0.76], [Math.PI, 0, 0], { seg: 5, ow: 0.08 });
      K.eye([-0.1, 0.89, 0.68], 0.048, [0, 0], { white: "#B9E36B" }); K.eye([0.1, 0.89, 0.68], 0.048, [0, 0], { white: "#B9E36B" });
      K.brow([-0.1, 0.95, 0.71], 0.08, -0.35); K.brow([0.1, 0.95, 0.71], 0.08, 0.35);
    } },
    // CAIPORA: menina de cocar montada num porco-do-mato (corpo contínuo, presas curvas)
    caipora: { build(K) {
      const P = "#5C4A44", DP = "#3E312D";
      for (const [x, z] of [[-0.17, 0.25], [0.17, 0.25], [-0.17, -0.25], [0.17, -0.25]]) { K.loft([[x, 0.36, z], [x, 0.2, z + 0.01], [x, 0.06, z]], [0.075, 0.06], P, { n: 8 }); K.cyl(0.065, 0.07, 0.05, "#2A1E16", [x, 0.03, z]); }
      K.loft([[0, 0.46, -0.42], [0, 0.5, -0.1], [0, 0.52, 0.2], [0, 0.5, 0.42]], u => 0.27 + Math.sin(Math.PI * u) * 0.05, P, { flat: 0.85, n: 12, steps: 10 });
      for (let i = 0; i < 9; i++) K.cone(0.05, 0.18, DP, [0, 0.78 - Math.abs(i - 4) * 0.02, -0.36 + i * 0.08], [0, 0, 0], { seg: 5 });
      K.ball(0.24, P, [0, 0.54, 0.44], [1, 0.95, 1]); for (const s of [-1, 1]) K.cone(0.07, 0.14, P, [s * 0.15, 0.74, 0.4], [0, 0, -s * 0.4]);
      K.cyl(0.11, 0.12, 0.14, "#C9A39A", [0, 0.48, 0.68], [Math.PI / 2, 0, 0]); for (const s of [-1, 1]) { K.ball(0.025, "#5C4A44", [s * 0.045, 0.49, 0.755], [1, 1, 0.5], { out: false }); K.claw([s * 0.1, 0.44, 0.62], [s * 0.2, 0.6, 0.66], [s * 0.04, -0.02, 0.04], 0.026, "#FFFDF5"); }
      for (const s of [-1, 1]) K.eye([s * 0.11, 0.64, 0.62], 0.04, [0, 0], { white: "#F2C94C" });
      for (const s of [-1, 1]) K.loft([[s * 0.1, 0.86, 0.02], [s * 0.26, 0.74, 0.04], [s * 0.3, 0.62, 0.06]], [0.05, 0.045], SKIN, { n: 8 });
      K.lathe([[0.001, 0.82], [0.16, 0.84], [0.17, 0.92], [0.001, 0.94]], "#E23B2E");
      K.ball(0.15, SKIN, [0, 1.04, 0], [1, 1.1, 0.85]);
      K.loft([[0.14, 1.1, 0], [0.25, 1.02, 0.1], [0.28, 1.2, 0.14]], [0.04, 0.037], SKIN, { n: 8 });
      K.loft([[0.28, 1.0, 0.14], [0.29, 1.3, 0.13], [0.3, 1.62, 0.12]], [0.028, 0.05], "#8A5A35", { n: 8, steps: 4 }); K.ball(0.075, "#6E4226", [0.3, 1.65, 0.12]);
      K.ball(0.2, SKIN, [0, 1.34, 0]); K.eye([-0.07, 1.35, 0.17], 0.045, [0.5, 0]); K.eye([0.07, 1.35, 0.17], 0.045, [0.5, 0]);
      K.torus(0.05, 0.014, "#7A2230", [0, 1.26, 0.18], [0, 0, Math.PI], { arc: Math.PI, ow: 0.1 });
      K.torus(0.19, 0.028, "#E23B2E", [0, 1.44, 0], [Math.PI / 2 - 0.15, 0, 0]);
      for (let i = 0; i < 7; i++) { const a = (i - 3) * 0.35; K.loft([[Math.sin(a) * 0.16, 1.46, -0.04], [Math.sin(a) * 0.21, 1.6, -0.08], [Math.sin(a) * 0.27, 1.74, -0.1]], u => 0.045 * Math.sin(Math.PI * (0.2 + 0.8 * u)), i % 2 ? "#F59A23" : "#E23B2E", { flat: 0.4, n: 6, steps: 6 }); }
      K.ball(0.18, "#2A1E16", [0, 1.38, -0.07], [1.05, 1, 0.9], { out: false });
    } },
    // ANHANGÁ: veado branco espiritual, galhada em tubos, olhos de fogo e cintilação animada
    anhanga: { build(K) {
      const W = "#F4F1EA", A = "#E3D3B4";
      for (const [x, z] of [[-0.13, 0.26], [0.13, 0.26], [-0.13, -0.26], [0.13, -0.26]]) { K.loft([[x, 0.52, z], [x, 0.3, z + 0.04], [x, 0.18, z - 0.01], [x, 0.05, z]], u => 0.05 - u * 0.02, W, { n: 7, steps: 10 }); K.ball(0.038, "#5E5248", [x, 0.03, z + 0.01], [1, 0.7, 1.2]); }
      K.loft([[0, 0.6, -0.36], [0, 0.64, -0.1], [0, 0.64, 0.14], [0, 0.66, 0.3]], u => 0.2 + Math.sin(Math.PI * u) * 0.04, W, { flat: 0.95, n: 12, steps: 10 });
      K.cone(0.06, 0.12, W, [0, 0.72, -0.4], [-1.9, 0, 0]);
      K.loft([[0, 0.72, 0.26], [0, 0.9, 0.34], [0, 1.1, 0.4]], [0.11, 0.08], W, { n: 10, steps: 6 });
      K.ball(0.15, W, [0, 1.16, 0.4], [0.9, 0.9, 1]); K.loft([[0, 1.15, 0.45], [0, 1.1, 0.56], [0, 1.07, 0.64]], [0.085, 0.055], W, { n: 10, steps: 5 }); K.ball(0.035, "#2A1E16", [0, 1.07, 0.665], [1.2, 1, 1], { out: false });
      for (const s of [-1, 1]) { K.ball(0.06, W, [s * 0.15, 1.24, 0.36], [0.5, 1, 1.6], { rot: [0, 0, s * -0.8] });
        K.ball(0.038, "#FF3B2A", [s * 0.08, 1.2, 0.52], [1, 0.8, 0.7], { out: false, em: "#C81E1E" });
        const main = [[s * 0.06, 1.28, 0.38], [s * 0.2, 1.52, 0.3], [s * 0.34, 1.74, 0.22], [s * 0.44, 1.94, 0.18]];
        K.loft(main, [0.028, 0.012], A, { n: 6, steps: 12 });
        for (const [p0, p1] of [[[s * 0.18, 1.48, 0.31], [s * 0.15, 1.72, 0.36]], [[s * 0.3, 1.68, 0.24], [s * 0.26, 1.9, 0.29]], [[s * 0.36, 1.78, 0.21], [s * 0.54, 1.84, 0.19]]]) K.loft([p0, [(p0[0] + p1[0]) / 2 + s * 0.02, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2], p1], [0.018, 0.006], A, { n: 6, steps: 5 });
        K.anchor("eyes", [s * 0.08, 1.2, 0.54], [s * 0.3, 0, 1]); }
      for (const p of [[-0.42, 1.0, 0.2], [0.45, 0.9, 0.1], [-0.3, 1.5, -0.1], [0.36, 1.36, 0.3], [0, 1.95, 0.1]]) K.anchor("spirit", p);
    } },
    // CORPO-SECO: magro e seco, membros finos contínuos, costelas, olhos fundos com brasa pulsando
    corpo: { build(K) {
      const S = "#9FA88A", DS = "#6F7860";
      for (const s of [-1, 1]) { K.loft([[s * 0.08, 0.62, 0], [s * 0.1, 0.32, 0.03], [s * 0.1, 0.06, 0]], u => 0.04 - u * 0.008, S, { n: 7 }); K.ball(0.05, DS, [s * 0.1, 0.04, 0.04], [1, 0.6, 1.5]); K.ball(0.04, S, [s * 0.1, 0.32, 0.03]); }
      K.lathe([[0.001, 0.52], [0.13, 0.53], [0.15, 0.66], [0.001, 0.68]], "#7A5A3A"); for (let i = 0; i < 6; i++) K.cone(0.035, 0.12, "#7A5A3A", [(i - 2.5) * 0.05, 0.48, 0.1], [Math.PI, 0, 0], { seg: 4, ow: 0.05 });
      K.lathe([[0.001, 0.66], [0.12, 0.68], [0.15, 0.8], [0.16, 0.95], [0.1, 1.05], [0.001, 1.06]], S);
      for (let i = 0; i < 4; i++) K.torus(0.12 - i * 0.008, 0.012, DS, [0, 0.98 - i * 0.07, 0.04], [0.2, 0, Math.PI], { arc: Math.PI * 0.8, out: false });
      for (const s of [-1, 1]) { K.loft([[s * 0.15, 1.0, 0], [s * 0.23, 0.76, 0.05], [s * 0.22, 0.5, 0.08]], [0.034, 0.028], S, { n: 7, steps: 8 }); K.ball(0.032, S, [s * 0.23, 0.76, 0.05]);
        for (let i = 0; i < 3; i++) K.loft([[s * 0.22, 0.49, 0.08], [s * 0.22 + (i - 1) * 0.03, 0.38, 0.1]], [0.011, 0.005], S, { n: 4, steps: 2 }); }
      K.limb([0, 1.05, 0], [0, 1.14, 0.02], 0.045, S);
      K.ball(0.2, "#AEB797", [0, 1.32, 0.03], [0.9, 1.15, 0.9]);
      for (const s of [-1, 1]) { K.ball(0.06, "#3B3445", [s * 0.075, 1.36, 0.19], [1, 1.1, 0.6], { out: false }); K.ball(0.025, "#FF4A2A", [s * 0.075, 1.36, 0.215], [1, 1, 1], { out: false, em: "#D02010" }); K.anchor("eyes", [s * 0.075, 1.36, 0.23], [0, 0, 1]); }
      K.cone(0.025, 0.05, "#3B3445", [0, 1.28, 0.21], [Math.PI, 0, 0], { out: false, seg: 3 }); K.box(0.13, 0.012, 0.01, "#3B3445", [0, 1.2, 0.2], [0, 0, 0], { out: false }); for (let i = 0; i < 5; i++) K.box(0.008, 0.04, 0.01, "#3B3445", [-0.05 + i * 0.025, 1.2, 0.205], [0, 0, 0], { out: false });
      for (const [x, z] of [[-0.06, 0], [0.02, 0.02], [0.08, -0.02]]) K.loft([[x, 1.49, z], [x * 1.8, 1.6, z - 0.03], [x * 2.6, 1.68, z - 0.02]], [0.008, 0.003], "#5F6650", { n: 4, steps: 4, out: false });
    } },
    // BICHO-PAPÃO: bola peluda escura (tufos maiores e menos), olhos vermelhos que pulsam, sorriso de dentes
    bicho: { scale: 1.04, build(K) {
      const P = "#3D2F52";
      for (const s of [-1, 1]) K.ball(0.1, P, [s * 0.2, 0.06, 0.05], [1, 0.6, 1.3]);
      K.ball(0.55, P, [0, 0.66, 0], [1, 0.95, 0.9]); K.tufts(56, [0, 0.66, 0], 0.55, 0.52, 0.5, P, 0.09, 9);
      for (const s of [-1, 1]) { K.ball(0.17, "#FFFFFF", [s * 0.2, 0.82, 0.4], [1, 1, 0.55], { rough: 0.3 }); K.ball(0.1, "#E0412F", [s * 0.2, 0.82, 0.48], [1, 1, 0.5], { out: false, rough: 0.3 }); K.ball(0.045, "#1E1612", [s * 0.2, 0.82, 0.52], [1, 1, 0.5], { out: false }); K.ball(0.022, "#FFFFFF", [s * 0.2 - 0.04, 0.86, 0.54], [1, 1, 1], { out: false, em: "#FFFFFF" });
        K.box(0.2, 0.04, 0.05, "#1E1729", [s * 0.2, 1.0, 0.44], [0, 0, s * 0.3], { out: false });
        K.loft([[s * 0.48, 0.6, 0.1], [s * 0.58, 0.5, 0.2], [s * 0.6, 0.42, 0.28]], [0.055, 0.045], P, { n: 8 }); for (let i = 0; i < 4; i++) K.claw([s * 0.6 + (i - 1.5) * 0.03, 0.4, 0.3], [s * 0.6 + (i - 1.5) * 0.035, 0.31, 0.36], [0, 0, 0.02], 0.016, "#E8E2F0");
        K.anchor("eyes", [s * 0.2, 0.82, 0.5], [s * 0.2, 0, 1]); }
      K.ball(0.32, "#1E1729", [0, 0.5, 0.36], [1, 0.38, 0.4], { ow: 0.03 });
      K.teeth(8, -0.26, 0.26, 0.58, 0.47, 0.09, -1, "#FFFDF5", 0.3); K.teeth(7, -0.22, 0.22, 0.42, 0.47, 0.08, 1, "#FFFDF5", 0.3);
    } },
    // PISADEIRA: velha alta e magra, cabelo branco em mechas contínuas, unhas curvas enormes, olhos vermelhos
    pisa: { build(K) {
      const S = "#C9C3B0";
      K.lathe([[0.001, 0], [0.24, 0.02], [0.2, 0.4], [0.14, 0.86], [0.12, 1.06], [0.001, 1.08]], "#4A3E66"); for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; K.cone(0.04, 0.09, "#4A3E66", [Math.sin(a) * 0.23, 0.02, Math.cos(a) * 0.23], [Math.PI, 0, 0], { seg: 4, ow: 0.05 }); }
      for (const s of [-1, 1]) { K.loft([[s * 0.13, 1.0, 0], [s * 0.3, 0.76, 0.12], [s * 0.34, 0.57, 0.24]], [0.037, 0.03], "#4A3E66", { n: 7, steps: 8 }); K.ball(0.04, S, [s * 0.34, 0.54, 0.25]);
        for (let i = 0; i < 4; i++) { const x = s * 0.34 + (i - 1.5) * 0.032; K.loft([[x, 0.53, 0.25], [x, 0.47, 0.29]], [0.01, 0.008], S, { n: 4, steps: 2 }); K.claw([x, 0.47, 0.29], [x + (i - 1.5) * 0.01, 0.3, 0.36], [0, 0.02, 0.06], 0.011, "#F2EEDC"); } }
      K.limb([0, 1.06, 0], [0, 1.16, 0.04], 0.04, S);
      K.ball(0.17, S, [0, 1.32, 0.05], [0.85, 1.2, 0.9]); K.loft([[0, 1.36, 0.18], [0, 1.3, 0.28], [0, 1.23, 0.34]], [0.035, 0.008], "#B8B19C", { n: 7, steps: 5 });
      for (const s of [-1, 1]) { K.ball(0.035, "#FFFFFF", [s * 0.06, 1.37, 0.18], [1.2, 0.8, 0.6], { ow: 0.08 }); K.ball(0.02, "#FF3B2A", [s * 0.06, 1.37, 0.2], [1, 1, 1], { out: false, em: "#C81E1E" }); K.brow([s * 0.065, 1.42, 0.19], 0.08, s * 0.4); K.anchor("eyes", [s * 0.06, 1.37, 0.22], [s * 0.2, 0, 1]); }
      K.box(0.07, 0.01, 0.01, "#2A1E16", [0, 1.18, 0.2], [0, 0, 0], { out: false });
      for (let i = 0; i < 11; i++) { const a = (i / 10 - 0.5) * 3.6, sx = Math.sin(a), cz = Math.cos(a); K.loft([[sx * 0.12, 1.5, 0.0 - cz * 0.05], [sx * 0.2, 1.42, -0.05 - cz * 0.1], [sx * 0.24, 1.15, -0.06 - cz * 0.1], [sx * 0.27 + (i % 2 ? 0.03 : -0.02), 0.86 - Math.abs(a) * 0.05, -0.04 - cz * 0.08]], u => 0.05 * (1 - u * 0.7), i % 2 ? "#EDEBE4" : "#DAD6CC", { n: 6, steps: 10 }); }
      K.ball(0.15, "#EDEBE4", [0, 1.46, 0.0], [1.1, 0.6, 1]);
    } },
    // CAPELOBO: focinho de tamanduá num tubo só, garras em foice curvas, umbigo vermelho que pulsa (o ponto fraco)
    capelobo: { build(K) {
      const F = "#4B3B2F", DF = "#33271F";
      for (const s of [-1, 1]) { K.cyl(0.11, 0.13, 0.3, F, [s * 0.18, 0.15, 0]); for (let i = 0; i < 3; i++) K.cone(0.025, 0.09, "#FFF6E0", [s * 0.18 + (i - 1) * 0.05, 0.03, 0.12], [Math.PI / 2, 0, 0], { seg: 5 }); }
      K.ball(0.42, F, [0, 0.75, 0], [1, 1.15, 0.85]); K.ball(0.3, "#5E4B3C", [0, 0.7, 0.1], [1, 1.1, 0.7], { out: false }); K.tufts(30, [0, 0.75, 0], 0.42, 0.48, 0.36, DF, 0.075, 4, { front: false });
      K.torus(0.075, 0.02, "#FFE0D0", [0, 0.6, 0.36], [0, 0, 0], { ow: 0.06 }); K.ball(0.06, "#E0412F", [0, 0.6, 0.36], [1, 1, 0.5], { out: false, em: "#801010" }); K.anchor("eyes", [0, 0.6, 0.38], [0, 0, 1]);
      for (const s of [-1, 1]) { K.loft([[s * 0.38, 1.0, 0], [s * 0.52, 0.72, 0.1], [s * 0.46, 0.46, 0.24]], [0.1, 0.08], F, { n: 9 });
        for (let i = 0; i < 3; i++) K.claw([s * 0.46 + (i - 1) * 0.06, 0.42, 0.26], [s * 0.44 + (i - 1) * 0.07, 0.2, 0.36], [0, 0.03, 0.09], 0.036); }
      K.ball(0.25, "#5E4B3C", [0, 1.32, 0.02]); for (const s of [-1, 1]) K.ball(0.07, "#5E4B3C", [s * 0.19, 1.5, -0.02], [1, 1, 0.6]);
      K.loft([[0, 1.28, 0.16], [0, 1.22, 0.42], [0, 1.08, 0.62], [0, 0.94, 0.74]], u => 0.11 - u * 0.075, "#6E5A4A", { n: 10, steps: 12 });
      for (let i = 0; i < 3; i++) K.box(0.08 - i * 0.015, 0.012, 0.012, "#3E3127", [0, 1.27 - i * 0.07, 0.4 + i * 0.1], [0.4 + i * 0.3, 0, 0], { out: false });
      K.ball(0.035, OUTLINE_INK, [0, 0.93, 0.76], [1.2, 1, 1], { out: false }); K.loft([[0, 0.92, 0.76], [0.02, 0.84, 0.8], [-0.01, 0.78, 0.82]], [0.012, 0.004], "#E8566A", { out: false, n: 4, steps: 4 });
      for (const s of [-1, 1]) { K.ball(0.04, "#FFFFFF", [s * 0.1, 1.38, 0.2], [1, 0.9, 0.6], { ow: 0.08 }); K.ball(0.022, "#E0412F", [s * 0.1, 1.38, 0.225], [1, 1, 1], { out: false, em: "#901010" }); K.brow([s * 0.1, 1.44, 0.22], 0.1, s * 0.35); }
    } },
    mula: { build(K) {
      const B = "#5B3A29", DB = "#3E2A1E", LIGHT = "#79513A", RED = "#B5223A", GOLD = "#F2C94C";
      const ball = (r, col, p, scale = [1, 1, 1], o = {}) => K.ball(r, col, p, scale, { seg: 12, rings: 6, ow: 0.025, ...o });
      // Anéis elípticos conectados: volumes contínuos em vez de pilhas de cones.
      const sweep = (rings, col, o = {}) => {
        const vertices = [], indices = [], n = 10;
        for (const [x, y, z, rx, rz] of rings) for (let j = 0; j < n; j++) {
          const a = j / n * Math.PI * 2; vertices.push(x + Math.cos(a) * rx, y, z + Math.sin(a) * rz);
        }
        for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < n; j++) {
          const a = i * n + j, b = i * n + (j + 1) % n, c = a + n, d = b + n; indices.push(a, c, b, b, c, d);
        }
        for (let j = 1; j < n - 1; j++) { indices.push(0, j, j + 1); const e = (rings.length - 1) * n; indices.push(e, e + j + 1, e + j); }
        const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.Float32BufferAttribute(vertices, 3)); geo.setIndex(indices); geo.computeVertexNormals();
        return K.mesh(geo, col, { ow: 0.025, ...o });
      };
      // Barril alongado, peito e anca separados; espaço negativo entre as quatro patas.
      ball(0.31, B, [0, 0.68, -0.02], [0.86, 0.88, 1.75], { rings: 8 });
      ball(0.23, LIGHT, [0, 0.69, 0.30], [1.04, 1.22, 0.93], { rings: 8 });
      ball(0.24, B, [0, 0.70, -0.36], [1.04, 1.05, 0.95], { rings: 8 });
      const legs = [
        [-0.18, 0.32, 0.40, 0.27, 0.58, 0.10], [0.18, 0.32, 0.25, 0.32, 0.20, 0.075],
        [-0.18, -0.36, -0.49, 0.31, -0.61, 0.075], [0.18, -0.36, -0.25, 0.28, -0.32, 0.10]
      ];
      for (const [x, z, kneeZ, kneeY, hoofZ, hoofY] of legs) {
        ball(0.11, B, [x, 0.54, z], [0.9, 1.5, 1.05]);
        K.limb([x, 0.56, z], [x, kneeY, kneeZ], 0.06, B, { r2: 0.043, joint: false, ow: 0.025 });
        ball(0.05, LIGHT, [x, kneeY, kneeZ], [1, 1.12, 1]);
        K.limb([x, kneeY, kneeZ], [x, hoofY + 0.035, hoofZ], 0.037, B, { r2: 0.03, joint: false, ow: 0.025 });
        ball(0.068, DB, [x, hoofY, hoofZ + 0.02], [0.90, 0.72, 1.20]);
        // U aberto atrás do casco: ferradura, não uma bota de metal.
        const shoe = K.mesh(new T.TorusGeometry(0.048, 0.012, 4, 12, Math.PI * 1.65), "#9AA0A6", { metal: 0.5, rough: 0.35, ow: 0.02 });
        K.at(shoe, [x, hoofY - 0.031, hoofZ + 0.02], [Math.PI / 2, 0, Math.PI * 0.175], [1, 1.28, 1]);
      }
      // Manta curva: acompanha o dorso e cai dos dois lados, com barra dourada.
      const blanket = (z0, z1, col, outset = 0) => {
        const v = [], idx = [], sections = 8;
        for (const z of [z0, z1]) for (let i = 0; i <= sections; i++) {
          const a = -1.68 + i / sections * 3.36;
          v.push(Math.sin(a) * (0.277 + outset), 0.68 + Math.cos(a) * (0.295 + outset), z);
        }
        for (let i = 0; i < sections; i++) { const j = i + sections + 1; idx.push(i, j, i + 1, i + 1, j, j + 1); }
        const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.Float32BufferAttribute(v, 3)); geo.setIndex(idx); geo.computeVertexNormals();
        const mat = K.mat(col); mat.side = T.DoubleSide; return K.mesh(geo, mat, { out: false });
      };
      blanket(-0.30, 0.22, RED); blanket(-0.315, -0.275, GOLD, 0.003); blanket(0.195, 0.235, GOLD, 0.003);
      for (const side of [-1, 1]) {
        K.box(0.025, 0.022, 0.54, GOLD, [side * 0.275, 0.65, -0.04], [0, 0, 0], { out: false });
        K.box(0.028, 0.16, 0.025, GOLD, [side * 0.278, 0.76, -0.04], [0, 0, 0], { out: false });
      }
      // Cauda em arco, afinada e com tufo, separada da anca.
      const tailCurve = new T.CatmullRomCurve3([[0, 0.78, -0.53], [0.05, 0.77, -0.67], [0.11, 0.58, -0.79], [0.15, 0.43, -0.84]].map(p => new T.Vector3(...p)));
      K.mesh(new T.TubeGeometry(tailCurve, 8, 0.035, 6, false), DB, { ow: 0.03 });
      ball(0.08, DB, [0.15, 0.42, -0.84], [0.6, 1.6, 0.7], { rot: [0.45, 0, -0.25] });
      // Pescoço inclinado e contínuo, terminando em abertura incandescente; sem cabeça.
      sweep([[0, 0.72, 0.31, 0.16, 0.18], [0, 0.92, 0.40, 0.14, 0.16], [0, 1.13, 0.52, 0.105, 0.12], [0, 1.25, 0.57, 0.10, 0.10]], B);
      K.cyl(0.104, 0.104, 0.04, DB, [0, 1.235, 0.57], [0, 0, 0], { seg: 12, ow: 0.02 });
      ball(0.10, "#F59A23", [0, 1.26, 0.57], [1, 0.32, 1], { out: false, em: "#F57C2A" });
      // Chamas esculpidas curvas, assimétricas e cheias; brasas só no FX animado.
      const flame = (x, z, height, bendX, bendZ, radius, col, em) => sweep([
        [x, 1.255, z, radius * 0.72, radius * 0.65],
        [x + bendX * 0.10, 1.255 + height * 0.18, z + bendZ * 0.10, radius * 0.92, radius * 0.70],
        [x + bendX * 0.25, 1.255 + height * 0.38, z + bendZ * 0.25, radius, radius * 0.72],
        [x + bendX * 0.65, 1.255 + height * 0.64, z + bendZ * 0.55, radius * 0.62, radius * 0.44],
        [x + bendX * 1.18, 1.255 + height * 0.83, z + bendZ * 0.87, radius * 0.28, radius * 0.20],
        [x + bendX, 1.255 + height, z + bendZ, 0.002, 0.002]
      ], col, { out: false, em });
      flame(-0.06, 0.56, 0.33, -0.10, -0.05, 0.08, "#E23B2E", "#7A1008");
      flame(0.05, 0.56, 0.43, 0.10, -0.11, 0.085, "#E23B2E", "#7A1008");
      flame(0, 0.57, 0.51, -0.035, -0.16, 0.08, "#F59A23", "#8A4A08");
      flame(-0.045, 0.61, 0.28, -0.07, 0.01, 0.06, "#F59A23", "#8A4A08");
      flame(0.025, 0.64, 0.36, 0.05, -0.025, 0.055, "#FFE45C", "#A08010");
      flame(-0.015, 0.64, 0.23, -0.015, 0, 0.038, "#FFF0C8", "#A08010");
      K.anchor("fire", [-0.055, 1.34, 0.57]); K.anchor("fire", [0.055, 1.39, 0.56]); K.anchor("fire", [0, 1.48, 0.53]);
      K.anchor("glow", [0, 1.27, 0.57]); K.anchor("dust", [0, 0.055, 0]);
    } },
    // CAPELOBO: fera peluda de pé, focinho comprido de tamanduá, garras em foice, umbigo vermelho (o ponto fraco)
  };
  const OUTLINE_INK = "#2A1E16";
  function model(id) { if (models.has(id)) return models.get(id); const D = DEF[id]; if (!D) return null; setup(); const inner = new T.Group(); const Kt = kit(inner); D.build(Kt); if (!(inner.userData.anchors && inner.userData.anchors.dust)) Kt.anchor("dust", [0, 0.055, 0]); inner.scale.setScalar(D.scale || 1); const root = new T.Group(); root.add(inner); models.set(id, root); return root; }
  // dir: 0 = de frente para quem olha a tela, 2 = virado para a direita, 4 = de costas, 6 = para a esquerda (8 direções)
  function frameModel(root, w, h, dir) {
    root.rotation.y = dir * Math.PI / 4;
    const yaw = 0, pitch = 0.36, dist = 9, aim = new T.Vector3(0, 0.95, 0);
    cam.aspect = w / h; cam.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, aim.y + Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist); cam.lookAt(aim);
    const H = 2.45; cam.fov = 2 * Math.atan(H / 2 / dist) * 180 / Math.PI; cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true); root.updateMatrixWorld(true);
  }
  function sprite(id, w = 256, h = 320, dir = 0) { const key = id + "@" + w + "x" + h + ":" + dir; if (cache.has(key)) return cache.get(key); const root = model(id); if (!root) return null;
    frameModel(root, w, h, dir); scene.add(root);
    R.setSize(w, h, false); R.render(scene, cam); scene.remove(root);
    const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(R.domElement, 0, 0); cache.set(key, c); return c; }
  // Coordenadas na imagem canônica 256×320, com a mesma câmera do sprite.
  function anchors(id, dir = 0) { const key = id + ":" + dir; if (anchorCache.has(key)) return anchorCache.get(key);
    if (!DEF[id]) return EMPTY_ANCHORS; const root = model(id), inner = root.children[0], local = inner.userData.anchors;
    if (!local) return EMPTY_ANCHORS; frameModel(root, 256, 320, dir); const out = {};
    for (const type of Object.keys(local)) { const pts = [];
      for (const { p, n } of local[type]) { const w = p.clone().applyMatrix4(inner.matrixWorld);
        if (n) { const nw = n.clone().transformDirection(inner.matrixWorld), toCam = cam.position.clone().sub(w).normalize(); if (nw.dot(toCam) < 0.12) continue; }
        const v = w.project(cam); pts.push([(v.x + 1) * 128, (1 - v.y) * 160]); }
      if (pts.length) out[type] = pts; }
    anchorCache.set(key, out); return out; }
  // direção (dx, dy) na tela -> índice 0..7 (dy > 0 = para baixo = de frente)
  function dirOf(dx, dy) { const a = Math.atan2(dx, dy); return ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8; }
  let okFlag = null; function ok() { if (okFlag === null) { try { setup(); okFlag = !!R; } catch (e) { okFlag = false; } } return okFlag; }
  // diagnóstico: triângulos (com contornos) e malhas de um boneco
  function stats(id) { const root = model(id); if (!root) return null; let tris = 0, meshes = 0;
    root.traverse(o => { if (!o.isMesh) return; meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; }); return { tris: Math.round(tris), meshes }; }
  return { DEF, sprite, anchors, dirOf, ok, stats, has: id => !!DEF[id] };
})();
