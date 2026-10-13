// FIGS — miniaturas 3D dos personagens (Three.js), modeladas com primitivas e renderizadas em 3/4
// para imagens transparentes, em 8 direções: o boneco vira para onde anda (0 = de frente para você, 4 = de costas).
// O tabuleiro continua 2D; só os bonecos são 3D.
const FIGS = (() => {
  const T = THREE, C = c => new T.Color(c).convertSRGBToLinear();
  let R = null, scene, cam, outline;
  const cache = new Map(), models = new Map();
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
    const K = {
      root,
      mat: (c, o = {}) => new T.MeshStandardMaterial({ color: C(c), roughness: o.rough ?? 0.72, metalness: o.metal ?? 0, emissive: C(o.em || "#000000") }),
      // malha com contorno fino (casco invertido)
      mesh(geo, col, o = {}) { const m = new T.Mesh(geo, typeof col === "string" ? K.mat(col, o) : col); if (o.out !== false) { const h = new T.Mesh(geo, outline); h.scale.setScalar(1 + (o.ow ?? 0.045)); m.add(h); } (o.parent || root).add(m); return m; },
      at(m, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) { m.position.set(...p); m.rotation.set(...r); m.scale.set(...s); return m; },
      ball(r, col, p, s = [1, 1, 1], o = {}) { return K.at(K.mesh(new T.SphereGeometry(r, 28, 18), col, o), p, o.rot || [0, 0, 0], s); },
      cone(r, h, col, p, rot = [0, 0, 0], o = {}) { return K.at(K.mesh(new T.ConeGeometry(r, h, o.seg || 16), col, o), p, rot, o.s || [1, 1, 1]); },
      cyl(r1, r2, h, col, p, rot = [0, 0, 0], o = {}) { return K.at(K.mesh(new T.CylinderGeometry(r1, r2, h, o.seg || 20), col, o), p, rot, o.s || [1, 1, 1]); },
      box(w, h, d, col, p, rot = [0, 0, 0], o = {}) { return K.at(K.mesh(new T.BoxGeometry(w, h, d), col, o), p, rot); },
      torus(r, t, col, p, rot = [0, 0, 0], o = {}) { return K.at(K.mesh(new T.TorusGeometry(r, t, 10, 28, o.arc || Math.PI * 2), col, o), p, rot, o.s || [1, 1, 1]); },
      limb(a, b, r, col, o = {}) { const A = new T.Vector3(...a), B = new T.Vector3(...b), d = B.clone().sub(A), len = d.length();
        const m = K.mesh(new T.CylinderGeometry(o.r2 ?? r, r, len, 14), col, o); m.position.copy(A.clone().add(B).multiplyScalar(0.5)); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
        if (o.joint !== false) { K.ball(r, col, a, [1, 1, 1], o); K.ball(o.r2 ?? r, col, b, [1, 1, 1], o); } return m; },
      lathe(pts, col, p = [0, 0, 0], o = {}) { return K.at(K.mesh(new T.LatheGeometry(pts.map(([x, y]) => new T.Vector2(x, y)), 32), col, o), p, o.rot || [0, 0, 0], o.s || [1, 1, 1]); },
      eye(p, r, look = [0, 0], o = {}) { K.ball(r, o.white || "#FFFFFF", p, [1, o.h || 1.12, 0.7], { ow: 0.1, rough: 0.3 }); K.ball(r * 0.56, o.iris || "#1E1612", [p[0] + look[0] * r * 0.35, p[1] + look[1] * r * 0.3, p[2] + r * 0.5], [1, 1, 0.6], { out: false, rough: 0.2 });
        K.ball(r * 0.18, "#FFFFFF", [p[0] + look[0] * r * 0.35 - r * 0.2, p[1] + r * 0.28, p[2] + r * 0.8], [1, 1, 1], { out: false, em: "#FFFFFF" }); },
      brow(p, w, rz, col = "#2A1E16") { K.box(w, w * 0.22, w * 0.25, col, p, [0, 0, rz], { out: false }); },
      teeth(n, x0, x1, y, z, h, dir = -1, col = "#FFFDF5", curve = 0) { for (let i = 0; i < n; i++) { const u = n > 1 ? i / (n - 1) : 0.5, x = x0 + (x1 - x0) * u; K.cone(h * 0.45, h, col, [x, y, z - curve * (u - 0.5) ** 2], [dir > 0 ? 0 : Math.PI, 0, 0], { ow: 0.08, seg: 8, rough: 0.35 }); } },
      // tufos de pelo espalhados numa elipse (dão volume e acabamento)
      tufts(n, c, rx, ry, rz, col, size, seed = 1, o = {}) { let s = seed; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
        for (let i = 0; i < n; i++) { const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u), nx = r * Math.cos(th), ny = u, nz = r * Math.sin(th);
          if (o.minY !== undefined && ny < o.minY) continue; if (o.front === false && nz > 0.4) continue;
          const p = [c[0] + nx * rx, c[1] + ny * ry, c[2] + nz * rz], m = K.cone(size * 0.5, size * 1.6, col, p, [0, 0, 0], { seg: 7, ow: 0.06 });
          m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(nx, ny * 0.8 - 0.25, nz).normalize()); } },
    };
    return K;
  }
  const SKIN = "#B86A40", DARK = "#6B3E26";
  const DEF = {
    // CURUPIRA: cabelo de fogo em camadas, tanga vermelha com saia de folhas, braçadeiras, pés virados para trás
    curupira: { build(K) {
      for (const s of [-1, 1]) { K.limb([s * 0.11, 0.48, 0], [s * 0.12, 0.12, 0.02], 0.068, SKIN, { r2: 0.058 }); K.torus(0.06, 0.016, "#E8452C", [s * 0.12, 0.17, 0.02], [Math.PI / 2, 0, 0], { ow: 0.08 });
        // pé virado: calcanhar na frente, dedos para trás
        K.ball(0.085, SKIN, [s * 0.12, 0.06, -0.07], [0.9, 0.62, 1.55]); for (let i = 0; i < 4; i++) K.ball(0.028, SKIN, [s * 0.12 + (i - 1.5) * 0.034, 0.045, -0.2], [1, 0.85, 1.25], { ow: 0.1 }); }
      K.lathe([[0.001, 0.4], [0.19, 0.42], [0.21, 0.52], [0.18, 0.6], [0.001, 0.6]], "#C9372A");
      K.box(0.18, 0.2, 0.03, "#E8452C", [0, 0.38, 0.17], [-0.12, 0, 0], { ow: 0.06 });
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; K.cone(0.06, 0.24, i % 3 ? "#4FAE4A" : "#7BC24A", [Math.sin(a) * 0.18, 0.47, Math.cos(a) * 0.15], [Math.cos(a) * 0.35 + Math.PI, 0, -Math.sin(a) * 0.35], { seg: 6 }); }
      K.ball(0.2, SKIN, [0, 0.74, 0], [1, 1.12, 0.8]);
      for (const y of [0.74, 0.69]) K.box(0.13, 0.018, 0.01, "#E8452C", [0, y, 0.162], [0, 0, 0], { out: false });
      K.torus(0.14, 0.026, "#3FA34D", [0, 0.9, 0.03], [Math.PI / 2 - 0.25, 0, 0]); for (let i = 0; i < 5; i++) K.ball(0.03, "#F2C94C", [-0.1 + i * 0.05, 0.86 - Math.abs(i - 2) * 0.012, 0.15], [1, 1, 1], { ow: 0.08 });
      for (const s of [-1, 1]) { K.limb([s * 0.19, 0.87, 0], [s * 0.29, 0.66, 0.06], 0.056, SKIN, { r2: 0.05 }); K.limb([s * 0.29, 0.66, 0.06], [s * 0.3, 0.52, 0.12], 0.05, SKIN, { r2: 0.046 }); K.ball(0.062, SKIN, [s * 0.3, 0.49, 0.13]);
        K.torus(0.058, 0.016, "#3FA34D", [s * 0.24, 0.77, 0.03], [Math.PI / 2, 0.4 * s, 0], { ow: 0.08 }); }
      // cabelo de fogo: três camadas (vermelho por fora, laranja, amarelo nas pontas de dentro)
      const fl = (x, y, z, h, r, rx, rz, col, o = {}) => K.cone(r, h, col, [x, y, z], [rx, 0, rz], { seg: 10, ...o });
      for (let i = 0; i < 11; i++) { const a = (i / 10 - 0.5) * 2.6, h = 0.5 - Math.abs(a) * 0.08; fl(Math.sin(a) * 0.22, 1.44 + h * 0.3, -0.06 - Math.cos(a) * 0.05, h, 0.12, -0.45, -a * 0.55, "#E23B2E"); }
      for (let i = 0; i < 7; i++) { const a = (i / 6 - 0.5) * 2, h = 0.38; fl(Math.sin(a) * 0.15, 1.47 + h * 0.3, -0.02, h, 0.09, -0.35, -a * 0.5, "#F57C2A"); }
      for (let i = 0; i < 4; i++) { const a = (i / 3 - 0.5) * 1.4; fl(Math.sin(a) * 0.1, 1.55, 0.02, 0.26, 0.06, -0.25, -a * 0.5, "#FFD23F", { out: false }); }
      K.ball(0.3, SKIN, [0, 1.2, 0], [1, 1, 0.95]); for (const s of [-1, 1]) K.ball(0.07, SKIN, [s * 0.29, 1.2, 0], [0.55, 1, 1]);
      for (let i = 0; i < 7; i++) fl(-0.21 + i * 0.07, 1.43, 0.16, 0.2, 0.06, 0.65, (i - 3) * -0.22, i % 2 ? "#E23B2E" : "#F57C2A", { seg: 8 });
      K.eye([-0.1, 1.22, 0.25], 0.075, [0.8, 0]); K.eye([0.1, 1.22, 0.25], 0.075, [0.8, 0]);
      K.brow([-0.1, 1.32, 0.26], 0.09, 0.15); K.brow([0.1, 1.32, 0.26], 0.09, -0.25);
      K.ball(0.03, "#A85A34", [0, 1.15, 0.29], [1, 0.8, 1], { out: false });
      K.torus(0.075, 0.022, "#7A2230", [0, 1.09, 0.27], [0, 0, Math.PI], { arc: Math.PI, ow: 0.12 });
      for (const s of [-1, 1]) for (const y of [1.14, 1.11]) K.box(0.06, 0.014, 0.01, "#E8452C", [s * 0.19, y, 0.245], [0, s * 0.5, 0.12 * s], { out: false });
    } },
    // SACI: uma perna só sobre um redemoinho, carapuça vermelha com aba, short vermelho, cachimbo fumegando
    saci: { build(K) {
      for (let i = 0; i < 3; i++) K.torus(0.16 - i * 0.04, 0.012, "#D9CFC0", [0, 0.03 + i * 0.05, 0], [Math.PI / 2, 0, i], { out: false });
      K.limb([0, 0.48, 0], [0.02, 0.12, 0.02], 0.072, DARK, { r2: 0.062 }); K.ball(0.088, DARK, [0.02, 0.07, 0.07], [0.95, 0.62, 1.55]);
      K.lathe([[0.001, 0.38], [0.2, 0.4], [0.215, 0.52], [0.19, 0.6], [0.001, 0.6]], "#E23B2E"); K.torus(0.19, 0.022, "#3E2A1E", [0, 0.58, 0], [Math.PI / 2, 0, 0], { ow: 0.06 }); K.box(0.05, 0.04, 0.02, "#F2C94C", [0, 0.58, 0.2], [0, 0, 0], { ow: 0.1 });
      K.ball(0.19, DARK, [0, 0.76, 0], [1, 1.1, 0.8]);
      K.limb([-0.18, 0.88, 0], [-0.3, 0.7, 0.04], 0.054, DARK); K.limb([-0.3, 0.7, 0.04], [-0.17, 0.6, 0.1], 0.05, DARK);
      K.limb([0.18, 0.88, 0], [0.31, 1.04, 0.08], 0.054, DARK); K.ball(0.066, DARK, [0.33, 1.1, 0.09]);
      K.ball(0.3, DARK, [0, 1.22, 0]); for (const s of [-1, 1]) K.ball(0.07, DARK, [s * 0.29, 1.22, 0], [0.55, 1, 1]);
      K.torus(0.29, 0.05, "#B52A22", [0, 1.36, 0], [Math.PI / 2 + 0.08, 0, 0]);
      K.cyl(0.18, 0.29, 0.34, "#E23B2E", [0, 1.55, -0.02], [-0.1, 0, 0]); K.cone(0.18, 0.44, "#E23B2E", [0.19, 1.76, 0.02], [0, 0, -1.05]); K.ball(0.08, "#FFFFFF", [0.4, 1.66, 0.05], [1, 1, 1], { rough: 0.95 });
      K.eye([-0.1, 1.24, 0.25], 0.078, [-0.6, 0.1]); K.eye([0.1, 1.24, 0.25], 0.078, [-0.6, 0.1]); K.brow([-0.1, 1.335, 0.26], 0.09, -0.2); K.brow([0.1, 1.335, 0.26], 0.09, 0.2);
      K.ball(0.03, "#5A3220", [0, 1.17, 0.29], [1, 0.8, 1], { out: false });
      K.torus(0.09, 0.022, "#5A1A1A", [0, 1.11, 0.27], [0, 0, Math.PI], { arc: Math.PI, ow: 0.12 }); K.box(0.035, 0.042, 0.02, "#FFFFFF", [-0.025, 1.085, 0.29], [0, 0, 0], { ow: 0.15 });
      K.limb([0.09, 1.08, 0.27], [0.26, 1.05, 0.3], 0.016, "#8B5A2B", { joint: false }); K.cyl(0.042, 0.036, 0.1, "#8B5A2B", [0.27, 1.09, 0.3]);
      for (const [x, y, r] of [[0.3, 1.21, 0.035], [0.26, 1.31, 0.045], [0.32, 1.42, 0.04], [0.28, 1.52, 0.03]]) K.ball(r, "#EDE7E0", [x, y, 0.3], [1, 1, 1], { ow: 0.08, rough: 1 });
    } },
    // MAPINGUARI: bloco peludo com tufos, olho único com sobrancelha, bocarra na barriga com língua, braços compridos e garras
    mapin: { build(K) {
      const FUR = "#8A5A35", DFUR = "#6B4227";
      for (const s of [-1, 1]) { K.cyl(0.13, 0.15, 0.28, DFUR, [s * 0.2, 0.14, 0]); for (let i = 0; i < 3; i++) K.cone(0.025, 0.08, "#FFF6E0", [s * 0.2 + (i - 1) * 0.06, 0.03, 0.15], [Math.PI / 2, 0, 0], { seg: 6 }); }
      K.ball(0.55, FUR, [0, 0.82, 0], [1, 1.12, 0.82]);
      K.tufts(70, [0, 0.82, 0], 0.55, 0.62, 0.45, DFUR, 0.06, 3, { front: false });
      for (let i = 0; i < 9; i++) { const a = -1.1 + i * 0.275; K.cone(0.08, 0.22, FUR, [Math.sin(a) * 0.42, 1.38 + Math.cos(a) * 0.04, -0.05], [0, 0, -a * 0.9], { seg: 8 }); }
      for (const s of [-1, 1]) { K.limb([s * 0.5, 1.05, 0], [s * 0.66, 0.6, 0.06], 0.13, FUR, { r2: 0.11 }); K.limb([s * 0.66, 0.6, 0.06], [s * 0.62, 0.3, 0.12], 0.11, FUR, { r2: 0.1 });
        K.tufts(10, [s * 0.6, 0.6, 0.06], 0.12, 0.3, 0.12, DFUR, 0.05, 7 + s);
        for (let i = 0; i < 3; i++) K.cone(0.032, 0.19, "#FFF6E0", [s * 0.62 + (i - 1) * 0.06, 0.17, 0.17], [0.55, 0, s * -0.2], { seg: 8, rough: 0.3 }); }
      K.box(0.42, 0.075, 0.09, DFUR, [0, 1.26, 0.42], [0.3, 0, 0]);
      K.ball(0.16, "#FFFFFF", [0, 1.08, 0.42], [1, 1, 0.6], { rough: 0.3 }); K.ball(0.09, "#E0412F", [0, 1.08, 0.5], [1, 1, 0.5], { out: false, rough: 0.3 }); K.ball(0.042, "#1E1612", [0, 1.08, 0.545], [1, 1, 0.5], { out: false }); K.ball(0.02, "#FFFFFF", [-0.03, 1.11, 0.56], [1, 1, 1], { out: false, em: "#FFFFFF" });
      K.ball(0.27, "#5E1520", [0, 0.68, 0.38], [1, 0.62, 0.5], { ow: 0.06 }); K.ball(0.12, "#C2566A", [0, 0.6, 0.46], [1.3, 0.5, 0.5], { out: false });
      K.teeth(6, -0.19, 0.19, 0.79, 0.49, 0.1, -1, "#FFFDF5", 0.25); K.teeth(5, -0.15, 0.15, 0.57, 0.49, 0.09, 1, "#FFFDF5", 0.25);
    } },
    // CUCA: cabeça de jacaré com a boca aberta e escamas, cabeleira amarela comprida, xale, colar, rabo saindo do vestido
    cuca: { build(K) {
      const G = "#5DA34A", DG = "#3E7D36";
      K.limb([0, 0.18, -0.3], [0, 0.08, -0.62], 0.1, G, { r2: 0.04 }); for (let i = 0; i < 4; i++) K.cone(0.03, 0.07, DG, [0, 0.2 - i * 0.03, -0.35 - i * 0.08], [0, 0, 0], { seg: 6 });
      K.lathe([[0.001, 0], [0.4, 0.02], [0.36, 0.3], [0.26, 0.62], [0.2, 0.86], [0.001, 0.9]], "#7C3F98");
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; K.cone(0.05, 0.1, "#7C3F98", [Math.sin(a) * 0.39, 0.03, Math.cos(a) * 0.39], [Math.PI, 0, 0], { seg: 6, ow: 0.06 }); }
      K.lathe([[0.001, 0.6], [0.34, 0.64], [0.31, 0.8], [0.18, 0.93], [0.001, 0.95]], "#4E2466");
      for (let i = 0; i < 7; i++) K.ball(0.03, i % 2 ? "#F2C94C" : "#E8566A", [-0.12 + i * 0.04, 0.95 - Math.abs(i - 3) * 0.012, 0.16], [1, 1, 1], { ow: 0.1 });
      for (const s of [-1, 1]) { K.limb([s * 0.22, 0.86, 0], [s * 0.36, 0.62, 0.12], 0.065, "#7C3F98", { r2: 0.07 }); K.ball(0.07, G, [s * 0.38, 0.56, 0.14]);
        for (let i = 0; i < 3; i++) K.cone(0.018, 0.1, "#FFF6E0", [s * 0.38 + (i - 1) * 0.035, 0.48, 0.17], [0.3, 0, 0], { seg: 6, ow: 0.1 }); }
      for (let i = 0; i < 9; i++) { const a = -1.2 + i * 0.3; K.ball(0.1, "#F6C945", [Math.sin(a) * 0.26, 0.98 - Math.abs(a) * 0.08, -0.17 - Math.cos(a) * 0.05], [0.8, 2.6, 0.8]); }
      const head = new T.Group(); K.root.add(head); head.position.set(0, 1.2, 0); head.rotation.y = 0.45; const H = kit(head);
      H.ball(0.26, G, [0, 0, -0.04], [1, 0.9, 1]);
      H.box(0.3, 0.12, 0.52, G, [0, -0.02, 0.36], [-0.12, 0, 0]); H.box(0.28, 0.08, 0.48, DG, [0, -0.17, 0.32], [0.22, 0, 0]);
      H.box(0.24, 0.05, 0.44, "#C2304A", [0, -0.1, 0.32], [0.05, 0, 0], { out: false });
      for (let i = 0; i < 6; i++) for (const s of [-1, 1]) H.cone(0.022, 0.07, "#FFFDF5", [s * 0.11, -0.1, 0.16 + i * 0.07], [Math.PI, 0, 0], { seg: 6, ow: 0.1 });
      for (let i = 0; i < 5; i++) for (const s of [-1, 1]) H.ball(0.022, DG, [s * 0.07, 0.05, 0.2 + i * 0.08], [1, 0.6, 1], { out: false });
      for (const s of [-1, 1]) { H.ball(0.085, G, [s * 0.11, 0.17, 0.05]); H.ball(0.062, "#FFE45C", [s * 0.11, 0.19, 0.1], [1, 1, 0.7], { ow: 0.1, rough: 0.3 }); H.box(0.014, 0.07, 0.02, "#1E1612", [s * 0.11, 0.19, 0.145], [0, 0, 0], { out: false }); H.brow([s * 0.11, 0.27, 0.09], 0.1, s * 0.3, DG); }
      H.ball(0.03, "#2A1E16", [-0.06, 0.06, 0.6], [1, 1, 1], { out: false }); H.ball(0.03, "#2A1E16", [0.06, 0.06, 0.6], [1, 1, 1], { out: false });
      for (let i = 0; i < 7; i++) H.cone(0.05, 0.18, "#F6C945", [-0.22 + i * 0.075, 0.22, -0.12], [-0.9, 0, (i - 3) * -0.25], { seg: 8 });
    } },
    // LOBISOMEM: lobo de pé com bermuda rasgada, peito claro, ombros peludos, garras, rabo
    lobis: { build(K) {
      const F = "#6E6A78", D = "#4A4654", L = "#B9B2C2";
      for (const s of [-1, 1]) { K.limb([s * 0.15, 0.6, -0.02], [s * 0.2, 0.32, 0.1], 0.09, F, { r2: 0.07 }); K.limb([s * 0.2, 0.32, 0.1], [s * 0.18, 0.08, -0.02], 0.065, F, { r2: 0.06 }); K.ball(0.08, D, [s * 0.18, 0.05, 0.05], [1, 0.6, 1.5]);
        for (let i = 0; i < 3; i++) K.cone(0.018, 0.06, "#FFF6E0", [s * 0.18 + (i - 1) * 0.04, 0.04, 0.16], [Math.PI / 2, 0, 0], { seg: 6 }); }
      K.lathe([[0.001, 0.5], [0.26, 0.5], [0.28, 0.62], [0.26, 0.72], [0.001, 0.72]], "#3E5A8A"); for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; K.cone(0.04, 0.09, "#3E5A8A", [Math.sin(a) * 0.25, 0.47, Math.cos(a) * 0.25], [Math.PI, 0, 0], { seg: 5, ow: 0.06 }); }
      K.cone(0.11, 0.55, F, [0, 0.55, -0.34], [-1.1, 0, 0]); K.tufts(8, [0, 0.55, -0.4], 0.08, 0.2, 0.15, D, 0.04, 5);
      K.ball(0.33, F, [0, 0.92, 0], [1, 1.2, 0.85]); K.ball(0.2, L, [0, 0.94, 0.18], [1, 1.3, 0.6], { ow: 0.04 });
      K.tufts(26, [0, 1.12, -0.02], 0.34, 0.18, 0.28, D, 0.055, 11, { minY: -0.2 });
      for (const s of [-1, 1]) { K.limb([s * 0.3, 1.06, 0], [s * 0.42, 0.76, 0.1], 0.075, F); K.limb([s * 0.42, 0.76, 0.1], [s * 0.36, 0.53, 0.18], 0.062, F);
        for (let i = 0; i < 3; i++) K.cone(0.022, 0.12, "#FFF6E0", [s * 0.36 + (i - 1) * 0.04, 0.44, 0.2], [0.2, 0, 0], { seg: 6, ow: 0.1 }); }
      K.ball(0.26, F, [0, 1.38, 0.02]); K.tufts(12, [0, 1.38, -0.05], 0.26, 0.24, 0.2, D, 0.045, 13, { front: false });
      for (const s of [-1, 1]) { K.cone(0.09, 0.3, F, [s * 0.16, 1.66, -0.02], [0, 0, -s * 0.25]); K.cone(0.05, 0.18, "#E8A4B4", [s * 0.155, 1.63, 0.035], [0, 0, -s * 0.25], { out: false }); }
      K.at(K.mesh(new T.CylinderGeometry(0.07, 0.13, 0.3, 16), L), [0, 1.3, 0.26], [Math.PI / 2 - 0.15, 0, 0]);
      K.ball(0.052, "#1E1612", [0, 1.34, 0.42], [1.2, 0.8, 1], { out: false, rough: 0.2 });
      K.ball(0.09, "#C2304A", [0, 1.2, 0.3], [1, 0.6, 0.6], { ow: 0.08 }); for (const s of [-1, 1]) K.cone(0.02, 0.07, "#FFFDF5", [s * 0.05, 1.235, 0.35], [Math.PI, 0, 0], { seg: 6, ow: 0.15 });
      K.eye([-0.1, 1.44, 0.21], 0.06, [0.2, 0.2], { white: "#FFD23F" }); K.eye([0.1, 1.44, 0.21], 0.06, [-0.2, 0.2], { white: "#FFD23F" });
      K.brow([-0.1, 1.52, 0.25], 0.12, -0.35, "#2F2C38"); K.brow([0.1, 1.52, 0.25], 0.12, 0.35, "#2F2C38");
    } },
    // ---------- Mata ----------
    // COBRA-CORAL: corpo enrolado em anéis vermelho/creme/preto, cabeça erguida, língua bífida
    coral: { scale: 1.55, build(K) {
      const pts = []; for (let i = 0; i <= 46; i++) { const u = i / 46; if (u < 0.72) { const a = u / 0.72 * Math.PI * 3.6, r = 0.36 - u * 0.12; pts.push([Math.cos(a) * r, 0.1 + u * 0.18, Math.sin(a) * r - 0.05]); } else { const v = (u - 0.72) / 0.28; pts.push([Math.cos(Math.PI * 3.6) * 0.27 * (1 - v), 0.23 + v * 0.55, -0.05 + v * 0.18]); } }
      const band = i => { const k = i % 7; return k < 3 ? "#E23B2E" : k === 3 || k === 6 ? "#FFF0C8" : "#1F1A17"; };
      pts.forEach((p, i) => K.ball(0.1 - i * 0.0008, band(i), p, [1, 0.95, 1], { ow: 0.05, rough: 0.45 }));
      const h = pts[pts.length - 1]; K.ball(0.14, "#1F1A17", [h[0], h[1] + 0.06, h[2] + 0.06], [1, 0.75, 1.25], { rough: 0.4 }); K.torus(0.11, 0.025, "#FFF0C8", [h[0], h[1] + 0.02, h[2] - 0.02], [Math.PI / 2, 0, 0], { ow: 0.08 });
      for (const s of [-1, 1]) K.eye([h[0] + s * 0.07, h[1] + 0.12, h[2] + 0.14], 0.035, [0, 0], { white: "#FFD23F" });
      K.box(0.012, 0.012, 0.16, "#E23B2E", [h[0], h[1] + 0.02, h[2] + 0.25], [0, 0, 0], { out: false }); for (const s of [-1, 1]) K.box(0.01, 0.01, 0.07, "#E23B2E", [h[0] + s * 0.02, h[1] + 0.02, h[2] + 0.35], [0, s * 0.5, 0], { out: false });
    } },
    // UIRAPURU: passarinho redondo cantando, papo laranja, bico aberto, notas no ar
    uira: { scale: 1.3, build(K) {
      const B = "#8B6B3E", DB = "#5E4526";
      for (const s of [-1, 1]) { K.limb([s * 0.1, 0.3, 0], [s * 0.1, 0.06, 0.03], 0.02, "#D9A02E"); for (const a of [-0.5, 0, 0.5]) K.limb([s * 0.1, 0.05, 0.03], [s * 0.1 + Math.sin(a) * 0.07, 0.03, 0.03 + Math.cos(a) * 0.08], 0.014, "#D9A02E"); }
      K.ball(0.36, B, [0, 0.55, 0], [1, 0.95, 1]); K.ball(0.25, "#E8662E", [0, 0.6, 0.18], [1, 1.05, 0.7], { ow: 0.04 });
      for (const s of [-1, 1]) K.ball(0.22, DB, [s * 0.32, 0.58, -0.05], [0.35, 0.8, 1.1], { rot: [0.3, 0, s * -0.3] });
      for (let i = 0; i < 3; i++) K.ball(0.13, DB, [(i - 1) * 0.1, 0.62, -0.42], [0.5, 0.25, 1.4], { rot: [-0.6, (i - 1) * 0.4, 0] });
      K.ball(0.25, B, [0, 0.98, 0.06]); K.cone(0.07, 0.2, "#F2C94C", [0, 1.0, 0.36], [Math.PI / 2 - 0.35, 0, 0], { seg: 10 }); K.cone(0.06, 0.16, "#D9A92E", [0, 0.93, 0.34], [Math.PI / 2 + 0.45, 0, 0], { seg: 10 });
      K.eye([-0.11, 1.04, 0.2], 0.06, [0, 0]); K.eye([0.11, 1.04, 0.2], 0.06, [0, 0]);
      for (const [x, y] of [[0.35, 1.3], [0.52, 1.5], [-0.38, 1.4]]) { K.ball(0.045, "#2A1E16", [x, y, 0.1], [1.2, 0.9, 0.6], { out: false }); K.box(0.014, 0.18, 0.014, "#2A1E16", [x + 0.04, y + 0.09, 0.1], [0, 0, 0], { out: false }); K.box(0.07, 0.014, 0.014, "#2A1E16", [x + 0.07, y + 0.17, 0.1], [0, 0, -0.5], { out: false }); }
    } },
    // ONÇA-PINTADA: de quatro, rosetas no corpo, rosnando
    onca: { scale: 1.32, build(K) {
      const Y = "#F2A93B", W = "#FFF3D6", SP = "#2A1E16";
      for (const [x, z] of [[-0.16, 0.28], [0.16, 0.28], [-0.16, -0.3], [0.16, -0.3]]) { K.limb([x, 0.42, z], [x, 0.08, z + 0.02], 0.075, Y, { r2: 0.065 }); K.ball(0.08, Y, [x, 0.05, z + 0.06], [1, 0.6, 1.3]); }
      K.ball(0.32, Y, [0, 0.52, 0], [0.85, 0.75, 1.45]);
      K.tufts(0, [0, 0, 0], 0, 0, 0, Y, 0);
      let sd = 5; const rnd = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
      for (let i = 0; i < 26; i++) { const th = rnd() * Math.PI * 2, u = rnd() * 1.6 - 0.8, x = Math.cos(th) * 0.27 * Math.sqrt(1 - u * u * 0.6), y = 0.52 + Math.sin(th) * 0.24, z = u * 0.42; if (y < 0.4) continue;
        K.torus(0.035, 0.011, SP, [x, y, z], [0, Math.atan2(x, 0.0001), 0], { out: false, s: [1, 1, 1] }).lookAt(new T.Vector3(x * 3, (y - 0.52) * 3 + 0.52, z)); }
      K.limb([0, 0.62, -0.42], [0, 0.95, -0.62], 0.05, Y, { r2: 0.04 }); K.ball(0.05, SP, [0, 0.97, -0.63]);
      K.ball(0.27, Y, [0, 0.78, 0.48]); for (const s of [-1, 1]) { K.ball(0.09, Y, [s * 0.18, 1.0, 0.42], [1, 1, 0.5]); K.ball(0.05, SP, [s * 0.18, 1.0, 0.44], [1, 1, 0.4], { out: false }); }
      for (const [x, y] of [[-0.12, 0.92], [0.12, 0.92], [0, 0.98], [-0.18, 0.8], [0.18, 0.8]]) K.ball(0.025, SP, [x, y, 0.7], [1, 1, 0.4], { out: false });
      K.ball(0.14, W, [0, 0.7, 0.66], [1.1, 0.75, 0.75], { ow: 0.05 }); K.ball(0.04, "#C2566A", [0, 0.76, 0.76], [1.2, 0.8, 0.8], { out: false });
      K.ball(0.07, "#9E1F2C", [0, 0.63, 0.72], [1.1, 0.6, 0.6], { out: false }); for (const s of [-1, 1]) K.cone(0.018, 0.06, "#FFFDF5", [s * 0.05, 0.67, 0.76], [Math.PI, 0, 0], { seg: 6, ow: 0.1 });
      K.eye([-0.1, 0.87, 0.68], 0.048, [0, 0], { white: "#B9E36B" }); K.eye([0.1, 0.87, 0.68], 0.048, [0, 0], { white: "#B9E36B" });
      K.brow([-0.1, 0.93, 0.71], 0.08, -0.35); K.brow([0.1, 0.93, 0.71], 0.08, 0.35);
    } },
    // CAIPORA: indiazinha de cocar, porrete erguido, montada num porco-do-mato com presas
    caipora: { build(K) {
      const P = "#5C4A44", DP = "#3E312D";
      for (const [x, z] of [[-0.17, 0.25], [0.17, 0.25], [-0.17, -0.25], [0.17, -0.25]]) { K.cyl(0.07, 0.06, 0.3, P, [x, 0.15, z]); K.cyl(0.07, 0.07, 0.05, "#2A1E16", [x, 0.03, z]); }
      K.ball(0.36, P, [0, 0.48, 0], [0.9, 0.75, 1.25]);
      for (let i = 0; i < 9; i++) K.cone(0.05, 0.18, DP, [0, 0.78 - Math.abs(i - 4) * 0.02, -0.36 + i * 0.08], [0, 0, 0], { seg: 7 });
      K.ball(0.24, P, [0, 0.52, 0.42], [1, 0.95, 1]); for (const s of [-1, 1]) K.cone(0.07, 0.14, P, [s * 0.15, 0.72, 0.38], [0, 0, -s * 0.4]);
      K.cyl(0.11, 0.12, 0.14, "#C9A39A", [0, 0.46, 0.66], [Math.PI / 2, 0, 0]); for (const s of [-1, 1]) { K.ball(0.025, "#5C4A44", [s * 0.045, 0.47, 0.735], [1, 1, 0.5], { out: false }); K.cone(0.025, 0.13, "#FFFDF5", [s * 0.13, 0.48, 0.6], [-0.3, 0, -s * 0.6], { seg: 8 }); }
      for (const s of [-1, 1]) K.eye([s * 0.11, 0.62, 0.6], 0.04, [0, 0], { white: "#F2C94C" });
      // a menina
      for (const s of [-1, 1]) K.limb([s * 0.1, 0.84, 0.02], [s * 0.3, 0.62, 0.05], 0.05, SKIN);
      K.lathe([[0.001, 0.8], [0.16, 0.82], [0.17, 0.9], [0.001, 0.92]], "#E23B2E");
      K.ball(0.15, SKIN, [0, 1.02, 0], [1, 1.1, 0.85]);
      K.limb([0.14, 1.08, 0], [0.24, 1.0, 0.1], 0.04, SKIN); K.limb([0.24, 1.0, 0.1], [0.28, 1.18, 0.14], 0.04, SKIN);
      K.limb([0.28, 1.0, 0.14], [0.3, 1.62, 0.12], 0.03, "#8A5A35", { r2: 0.05, joint: false }); K.ball(0.07, "#6E4226", [0.3, 1.64, 0.12]);
      K.ball(0.2, SKIN, [0, 1.32, 0]); K.eye([-0.07, 1.33, 0.17], 0.045, [0.5, 0]); K.eye([0.07, 1.33, 0.17], 0.045, [0.5, 0]);
      K.torus(0.05, 0.015, "#7A2230", [0, 1.24, 0.18], [0, 0, Math.PI], { arc: Math.PI, ow: 0.12 });
      K.torus(0.19, 0.03, "#E23B2E", [0, 1.42, 0], [Math.PI / 2 - 0.15, 0, 0]);
      for (let i = 0; i < 7; i++) { const a = (i - 3) * 0.35; K.cone(0.04, 0.26, i % 2 ? "#F59A23" : "#E23B2E", [Math.sin(a) * 0.17, 1.58, -0.04 - Math.cos(a) * 0.02], [-0.25, 0, -a * 0.8], { seg: 8 }); }
      K.ball(0.18, "#2A1E16", [0, 1.36, -0.07], [1.05, 1, 0.9], { out: false });
    } },
    // ANHANGÁ: veado branco espiritual, galhada grande, olhos de fogo vermelhos, brilhos em volta
    anhanga: { build(K) {
      const W = "#F4F1EA", A = "#E3D3B4";
      for (const [x, z] of [[-0.13, 0.26], [0.13, 0.26], [-0.13, -0.26], [0.13, -0.26]]) { K.limb([x, 0.5, z], [x, 0.24, z + 0.03], 0.045, W, { r2: 0.04 }); K.limb([x, 0.24, z + 0.03], [x, 0.05, z], 0.035, W, { r2: 0.03 }); K.ball(0.04, "#5E5248", [x, 0.03, z + 0.01], [1, 0.7, 1.2]); }
      K.ball(0.28, W, [0, 0.62, 0], [0.8, 0.75, 1.4]); K.cone(0.06, 0.12, W, [0, 0.7, -0.4], [-1.9, 0, 0]);
      K.limb([0, 0.75, 0.25], [0, 1.08, 0.38], 0.1, W, { r2: 0.08 });
      K.ball(0.15, W, [0, 1.16, 0.4], [0.9, 0.9, 1]); K.cyl(0.06, 0.09, 0.2, W, [0, 1.1, 0.55], [Math.PI / 2 + 0.3, 0, 0]); K.ball(0.035, "#2A1E16", [0, 1.07, 0.65], [1.2, 1, 1], { out: false });
      for (const s of [-1, 1]) { K.ball(0.06, W, [s * 0.15, 1.24, 0.36], [0.5, 1, 1.6], { rot: [0, 0, s * -0.8] });
        K.ball(0.04, "#FF3B2A", [s * 0.08, 1.2, 0.52], [1, 0.8, 0.7], { out: false, em: "#C81E1E" });
        K.limb([s * 0.06, 1.28, 0.38], [s * 0.18, 1.5, 0.3], 0.025, A); K.limb([s * 0.18, 1.5, 0.3], [s * 0.34, 1.72, 0.22], 0.022, A); K.limb([s * 0.34, 1.72, 0.22], [s * 0.42, 1.92, 0.18], 0.018, A);
        K.limb([s * 0.18, 1.5, 0.3], [s * 0.16, 1.72, 0.36], 0.018, A); K.limb([s * 0.3, 1.66, 0.24], [s * 0.26, 1.88, 0.28], 0.016, A); K.limb([s * 0.34, 1.72, 0.22], [s * 0.52, 1.8, 0.2], 0.016, A); }
      for (const [x, y, z] of [[-0.42, 1.0, 0.2], [0.45, 0.9, 0.1], [-0.3, 1.5, -0.1], [0.36, 1.36, 0.3], [0, 1.95, 0.1]]) K.ball(0.035, "#FFF7C2", [x, y, z], [1, 1, 1], { out: false, em: "#FFE680" });
    } },
    // ---------- Assombrações ----------
    // CORPO-SECO: magro e seco, costelas, trapo, olhos fundos com brasa
    corpo: { build(K) {
      const S = "#9FA88A", DS = "#6F7860";
      for (const s of [-1, 1]) { K.limb([s * 0.08, 0.6, 0], [s * 0.1, 0.3, 0.03], 0.04, S, { r2: 0.035 }); K.limb([s * 0.1, 0.3, 0.03], [s * 0.1, 0.06, 0], 0.035, S); K.ball(0.05, DS, [s * 0.1, 0.04, 0.04], [1, 0.6, 1.5]); }
      K.lathe([[0.001, 0.52], [0.13, 0.53], [0.15, 0.66], [0.001, 0.68]], "#7A5A3A"); for (let i = 0; i < 6; i++) K.cone(0.035, 0.12, "#7A5A3A", [(i - 2.5) * 0.05, 0.48, 0.1], [Math.PI, 0, 0], { seg: 5, ow: 0.06 });
      K.lathe([[0.001, 0.66], [0.12, 0.68], [0.15, 0.8], [0.16, 0.95], [0.1, 1.05], [0.001, 1.06]], S);
      for (let i = 0; i < 4; i++) K.torus(0.12 - i * 0.008, 0.012, DS, [0, 0.98 - i * 0.07, 0.04], [0.2, 0, Math.PI], { arc: Math.PI * 0.8, out: false });
      for (const s of [-1, 1]) { K.limb([s * 0.15, 1.0, 0], [s * 0.22, 0.75, 0.05], 0.032, S); K.limb([s * 0.22, 0.75, 0.05], [s * 0.22, 0.5, 0.08], 0.03, S); for (let i = 0; i < 3; i++) K.limb([s * 0.22, 0.48, 0.08], [s * 0.22 + (i - 1) * 0.03, 0.38, 0.1], 0.01, S, { joint: false }); }
      K.limb([0, 1.05, 0], [0, 1.14, 0.02], 0.045, S);
      K.ball(0.2, "#AEB797", [0, 1.32, 0.03], [0.9, 1.15, 0.9]);
      for (const s of [-1, 1]) { K.ball(0.06, "#3B3445", [s * 0.075, 1.36, 0.19], [1, 1.1, 0.6], { out: false }); K.ball(0.025, "#FF4A2A", [s * 0.075, 1.36, 0.215], [1, 1, 1], { out: false, em: "#D02010" }); }
      K.cone(0.025, 0.05, "#3B3445", [0, 1.28, 0.21], [Math.PI, 0, 0], { out: false, seg: 3 }); K.box(0.13, 0.012, 0.01, "#3B3445", [0, 1.2, 0.2], [0, 0, 0], { out: false }); for (let i = 0; i < 5; i++) K.box(0.008, 0.04, 0.01, "#3B3445", [-0.05 + i * 0.025, 1.2, 0.205], [0, 0, 0], { out: false });
      for (const [x, z, r] of [[-0.06, 0, -0.3], [0.02, 0.02, 0.1], [0.08, -0.02, 0.4]]) K.limb([x, 1.5, z], [x * 2.5, 1.66, z - 0.04], 0.008, "#5F6650", { joint: false });
    } },
    // BICHO-PAPÃO: bola peluda escura, olhos vermelhos enormes, sorriso de dentes, mãozinhas com garras
    bicho: { scale: 1.04, build(K) {
      const P = "#3D2F52";
      for (const s of [-1, 1]) K.ball(0.1, P, [s * 0.2, 0.06, 0.05], [1, 0.6, 1.3]);
      K.ball(0.55, P, [0, 0.66, 0], [1, 0.95, 0.9]); K.tufts(110, [0, 0.66, 0], 0.55, 0.52, 0.5, P, 0.07, 9);
      for (const s of [-1, 1]) { K.ball(0.17, "#FFFFFF", [s * 0.2, 0.82, 0.4], [1, 1, 0.55], { rough: 0.3 }); K.ball(0.1, "#E0412F", [s * 0.2, 0.82, 0.48], [1, 1, 0.5], { out: false, rough: 0.3 }); K.ball(0.045, "#1E1612", [s * 0.2, 0.82, 0.52], [1, 1, 0.5], { out: false }); K.ball(0.022, "#FFFFFF", [s * 0.2 - 0.04, 0.86, 0.54], [1, 1, 1], { out: false, em: "#FFFFFF" });
        K.box(0.2, 0.04, 0.05, "#1E1729", [s * 0.2, 1.0, 0.44], [0, 0, s * 0.3], { out: false });
        K.limb([s * 0.48, 0.6, 0.1], [s * 0.6, 0.42, 0.28], 0.05, P); for (let i = 0; i < 4; i++) K.cone(0.016, 0.1, "#E8E2F0", [s * 0.6 + (i - 1.5) * 0.03, 0.36, 0.33], [0.5, 0, 0], { seg: 6, ow: 0.1 }); }
      K.ball(0.32, "#1E1729", [0, 0.5, 0.36], [1, 0.38, 0.4], { ow: 0.04 });
      K.teeth(8, -0.26, 0.26, 0.58, 0.47, 0.09, -1, "#FFFDF5", 0.3); K.teeth(7, -0.22, 0.22, 0.42, 0.47, 0.08, 1, "#FFFDF5", 0.3);
    } },
    // PISADEIRA: velha alta e magra, camisola escura, cabelo branco desgrenhado, nariz comprido, unhas enormes, olhos vermelhos
    pisa: { build(K) {
      const S = "#C9C3B0";
      K.lathe([[0.001, 0], [0.24, 0.02], [0.2, 0.4], [0.14, 0.86], [0.12, 1.06], [0.001, 1.08]], "#4A3E66"); for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; K.cone(0.04, 0.09, "#4A3E66", [Math.sin(a) * 0.23, 0.02, Math.cos(a) * 0.23], [Math.PI, 0, 0], { seg: 5, ow: 0.06 }); }
      for (const s of [-1, 1]) { K.limb([s * 0.13, 1.0, 0], [s * 0.3, 0.75, 0.12], 0.035, "#4A3E66"); K.limb([s * 0.3, 0.75, 0.12], [s * 0.34, 0.56, 0.24], 0.03, S); K.ball(0.04, S, [s * 0.34, 0.54, 0.25]);
        for (let i = 0; i < 4; i++) { K.limb([s * 0.34, 0.53, 0.25], [s * 0.34 + (i - 1.5) * 0.03, 0.45, 0.3], 0.009, S, { joint: false }); K.cone(0.01, 0.16, "#F2EEDC", [s * 0.34 + (i - 1.5) * 0.035, 0.36, 0.33], [Math.PI - 0.4, 0, 0], { seg: 5, ow: 0.1 }); } }
      K.limb([0, 1.06, 0], [0, 1.16, 0.04], 0.04, S);
      K.ball(0.17, S, [0, 1.32, 0.05], [0.85, 1.2, 0.9]); K.cone(0.035, 0.18, "#B8B19C", [0, 1.3, 0.27], [Math.PI / 2 + 0.4, 0, 0], { seg: 10 });
      for (const s of [-1, 1]) { K.ball(0.035, "#FFFFFF", [s * 0.06, 1.37, 0.18], [1.2, 0.8, 0.6], { ow: 0.1 }); K.ball(0.02, "#FF3B2A", [s * 0.06, 1.37, 0.2], [1, 1, 1], { out: false, em: "#C81E1E" }); K.brow([s * 0.065, 1.42, 0.19], 0.08, s * 0.4); }
      K.box(0.07, 0.01, 0.01, "#2A1E16", [0, 1.18, 0.2], [0, 0, 0], { out: false });
      for (let i = 0; i < 13; i++) { const a = (i / 12 - 0.5) * 3.4; K.ball(0.06, "#EDEBE4", [Math.sin(a) * 0.17, 1.22 - Math.abs(a) * 0.06, -0.03 - Math.cos(a) * 0.08], [0.6, 3.2 - Math.abs(a) * 0.4, 0.6], { rot: [0.15, 0, a * 0.15] }); }
      for (let i = 0; i < 6; i++) K.cone(0.05, 0.16, "#EDEBE4", [-0.15 + i * 0.06, 1.5, -0.02], [-0.5, 0, (i - 2.5) * -0.4], { seg: 7 });
    } },
    // MULA-SEM-CABEÇA: mula galopando com manta vermelha, pescoço terminando em fogo, ferraduras
    mula: { build(K) {
      const B = "#5B3A29", DB = "#3E2A1E";
      for (const [x, z, k] of [[-0.14, 0.3, 1], [0.14, 0.32, -1], [-0.14, -0.3, -1], [0.14, -0.28, 1]]) { K.limb([x, 0.52, z], [x, 0.28, z + k * 0.06], 0.065, B, { r2: 0.05 }); K.limb([x, 0.28, z + k * 0.06], [x, 0.07, z + k * 0.02], 0.045, B, { r2: 0.04 }); K.cyl(0.05, 0.055, 0.06, "#9AA0A6", [x, 0.04, z + k * 0.02], [0, 0, 0], { metal: 0.5, rough: 0.35 }); }
      K.ball(0.3, B, [0, 0.6, 0], [0.8, 0.72, 1.4]);
      K.box(0.5, 0.05, 0.42, "#B5223A", [0, 0.78, 0], [0, 0, 0], { ow: 0.04 }); K.box(0.52, 0.025, 0.44, "#F2C94C", [0, 0.755, 0], [0, 0, 0], { out: false });
      K.limb([0, 0.65, -0.4], [0, 0.5, -0.62], 0.04, DB); for (let i = 0; i < 4; i++) K.cone(0.04, 0.2, DB, [(i - 1.5) * 0.03, 0.42, -0.66], [-2.4, 0, (i - 1.5) * 0.3], { seg: 6 });
      K.limb([0, 0.72, 0.32], [0, 1.0, 0.5], 0.13, B, { r2: 0.11 }); K.ball(0.11, "#E23B2E", [0, 1.05, 0.52], [1, 0.4, 1], { out: false, em: "#A01C10" });
      for (let i = 0; i < 9; i++) { const a = (i / 8 - 0.5) * 2.4; K.cone(0.07, 0.4 - Math.abs(a) * 0.08, "#E23B2E", [Math.sin(a) * 0.1, 1.24, 0.5 + Math.cos(a) * 0.02], [-0.3, 0, -a * 0.4], { seg: 8, em: "#7A1008" }); }
      for (let i = 0; i < 6; i++) { const a = (i / 5 - 0.5) * 2; K.cone(0.05, 0.3, "#F59A23", [Math.sin(a) * 0.07, 1.22, 0.52], [-0.25, 0, -a * 0.35], { seg: 8, out: false, em: "#8A4A08" }); }
      for (let i = 0; i < 3; i++) K.cone(0.03, 0.2, "#FFE45C", [(i - 1) * 0.04, 1.2, 0.53], [-0.2, 0, (i - 1) * -0.3], { seg: 8, out: false, em: "#A08010" });
      for (const [x, y, z] of [[0.2, 1.5, 0.4], [-0.18, 1.45, 0.6], [0.05, 1.62, 0.5]]) K.ball(0.025, "#FFB03A", [x, y, z], [1, 1, 1], { out: false, em: "#FF8A00" });
    } },
    // CAPELOBO: fera peluda de pé, focinho comprido de tamanduá, garras em foice, umbigo vermelho (o ponto fraco)
    capelobo: { build(K) {
      const F = "#4B3B2F", DF = "#33271F";
      for (const s of [-1, 1]) { K.cyl(0.11, 0.13, 0.3, F, [s * 0.18, 0.15, 0]); for (let i = 0; i < 3; i++) K.cone(0.025, 0.09, "#FFF6E0", [s * 0.18 + (i - 1) * 0.05, 0.03, 0.12], [Math.PI / 2, 0, 0], { seg: 6 }); }
      K.ball(0.42, F, [0, 0.75, 0], [1, 1.15, 0.85]); K.tufts(60, [0, 0.75, 0], 0.42, 0.48, 0.36, DF, 0.06, 4, { front: false });
      K.torus(0.075, 0.02, "#FFE0D0", [0, 0.6, 0.36], [0, 0, 0], { ow: 0.08 }); K.ball(0.06, "#E0412F", [0, 0.6, 0.36], [1, 1, 0.5], { out: false, em: "#801010" });
      for (const s of [-1, 1]) { K.limb([s * 0.38, 0.98, 0], [s * 0.5, 0.66, 0.12], 0.09, F); K.limb([s * 0.5, 0.66, 0.12], [s * 0.45, 0.44, 0.24], 0.08, F);
        for (let i = 0; i < 3; i++) K.cone(0.035, 0.24, "#FFF6E0", [s * 0.45 + (i - 1) * 0.06, 0.34, 0.3], [0.7, 0, 0], { seg: 8, rough: 0.3 }); }
      K.ball(0.25, "#5E4B3C", [0, 1.32, 0.02]); for (const s of [-1, 1]) K.ball(0.07, "#5E4B3C", [s * 0.19, 1.5, -0.02], [1, 1, 0.6]);
      const sn = []; for (let i = 0; i <= 8; i++) { const u = i / 8; sn.push([0, 1.26 - u * u * 0.32, 0.2 + u * 0.52]); } sn.forEach((p, i) => K.ball(0.1 - i * 0.008, "#6E5A4A", p, [1, 0.9, 1.1], { ow: 0.05 }));
      K.ball(0.04, OUTLINE_INK, [0, 0.94, 0.74], [1.2, 1, 1], { out: false }); K.limb([0, 0.92, 0.74], [0.02, 0.8, 0.8], 0.012, "#E8566A", { joint: false });
      for (const s of [-1, 1]) { K.ball(0.04, "#FFFFFF", [s * 0.1, 1.38, 0.2], [1, 0.9, 0.6], { ow: 0.1 }); K.ball(0.022, "#E0412F", [s * 0.1, 1.38, 0.225], [1, 1, 1], { out: false, em: "#901010" }); K.brow([s * 0.1, 1.44, 0.22], 0.1, s * 0.35); }
    } },
  };
  const OUTLINE_INK = "#2A1E16";
  function model(id) { if (models.has(id)) return models.get(id); const D = DEF[id]; if (!D) return null; setup(); const inner = new T.Group(); D.build(kit(inner)); inner.scale.setScalar(D.scale || 1); const root = new T.Group(); root.add(inner); models.set(id, root); return root; }
  // dir: 0 = de frente para quem olha a tela, 2 = virado para a direita, 4 = de costas, 6 = para a esquerda (8 direções)
  function sprite(id, w = 256, h = 320, dir = 0) { const key = id + "@" + w + "x" + h + ":" + dir; if (cache.has(key)) return cache.get(key); const root = model(id); if (!root) return null;
    root.rotation.y = dir * Math.PI / 4; scene.add(root);
    const yaw = 0, pitch = 0.36, dist = 9, aim = new T.Vector3(0, 0.95, 0);
    cam.aspect = w / h; cam.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, aim.y + Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist); cam.lookAt(aim);
    const H = 2.45; cam.fov = 2 * Math.atan(H / 2 / dist) * 180 / Math.PI; cam.updateProjectionMatrix();
    R.setSize(w, h, false); R.render(scene, cam); scene.remove(root);
    const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(R.domElement, 0, 0); cache.set(key, c); return c; }
  // direção (dx, dy) na tela -> índice 0..7 (dy > 0 = para baixo = de frente)
  function dirOf(dx, dy) { const a = Math.atan2(dx, dy); return ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8; }
  let okFlag = null; function ok() { if (okFlag === null) { try { setup(); okFlag = !!R; } catch (e) { okFlag = false; } } return okFlag; }
  return { DEF, sprite, dirOf, ok, has: id => !!DEF[id] };
})();
