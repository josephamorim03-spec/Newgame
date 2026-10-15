// Câmera do jogo: vista de cima, inclinada como num mapa isométrico, para administrar e construir o vale.
// Arrastar move o mapa; pinça ou roda do mouse dá zoom (de perto a câmera deita um pouco, de longe fica mais a pino);
// o mapa gira em passos de 60° (os lados do hexágono), por botão, teclas Q/E, botão direito ou dois dedos girando,
// sempre parando alinhado; a inclinação ajusta um pouco (dois dedos para cima/baixo, ou botão direito vertical).
import * as THREE from 'three';

export function createGameCamera(camera, dom, { center, radius = 75, groundY = () => 0 }) {
  const S = { fx: center[0], fz: center[1], dist: 110, distT: 110, yawK: 0, yaw: 0, tilt: 0, tiltT: 0, enabled: true };
  const STEP = Math.PI / 3, MIN = 24, MAX = 175;
  const elevOf = d => THREE.MathUtils.degToRad(THREE.MathUtils.lerp(46, 62, THREE.MathUtils.clamp((d - MIN) / (MAX - MIN), 0, 1)));
  const clampFocus = () => { const dx = S.fx - center[0], dz = S.fz - center[1], r = Math.hypot(dx, dz); if (r > radius) { S.fx = center[0] + dx / r * radius; S.fz = center[1] + dz / r * radius; } };
  const pxToM = () => 2 * Math.tan(camera.fov * Math.PI / 360) * S.dist / dom.clientHeight;
  function pan(dx, dy) { const k = pxToM(), c = Math.cos(S.yaw), s = Math.sin(S.yaw), el = elevOf(S.dist) + S.tilt;
    // o mapa acompanha o dedo: direita da tela = (cos, -sin) no chão; para cima da tela = para frente (-sin, -cos), alongado pela inclinação
    S.fx -= c * dx * k; S.fz += s * dx * k; S.fx -= s * dy * k / Math.sin(el); S.fz -= c * dy * k / Math.sin(el); clampFocus(); }
  function rotate(dir) { S.yawK += dir; }
  function zoom(f) { S.distT = THREE.MathUtils.clamp(S.distT * f, MIN, MAX); }
  // ---------- mouse
  let drag = null;
  dom.addEventListener('contextmenu', e => { if (S.enabled) e.preventDefault(); });
  dom.addEventListener('pointerdown', e => { if (!S.enabled || e.pointerType === 'touch') return; drag = { b: e.button, x: e.clientX, y: e.clientY, rx: 0 }; dom.setPointerCapture(e.pointerId); });
  dom.addEventListener('pointermove', e => { if (!drag || e.pointerType === 'touch') return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    if (drag.b === 0) pan(dx, dy); else { drag.rx += dx; S.yaw -= dx * 0.006; S.tiltT = THREE.MathUtils.clamp(S.tiltT - dy * 0.003, -0.18, 0.26); } });
  dom.addEventListener('pointerup', e => { if (!drag || e.pointerType === 'touch') return; if (drag.b !== 0) S.yawK = Math.round(S.yaw / STEP); drag = null; });
  dom.addEventListener('wheel', e => { if (!S.enabled) return; e.preventDefault(); zoom(Math.exp(e.deltaY * 0.0012)); }, { passive: false });
  addEventListener('keydown', e => { if (!S.enabled) return; if (e.key === 'q' || e.key === 'Q') rotate(-1); if (e.key === 'e' || e.key === 'E') rotate(1); });
  // ---------- toque: um dedo move; dois dedos fazem pinça (zoom), giro (passo de 60° ao soltar) e inclinação
  const T = new Map(); let two = null;
  const mid = () => { const p = [...T.values()]; return { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2, d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), a: Math.atan2(p[1].y - p[0].y, p[1].x - p[0].x) }; };
  dom.addEventListener('pointerdown', e => { if (!S.enabled || e.pointerType !== 'touch') return; dom.setPointerCapture(e.pointerId); T.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (T.size === 2) two = mid(); });
  dom.addEventListener('pointermove', e => { if (!S.enabled || !T.has(e.pointerId)) return; const p = T.get(e.pointerId), dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (T.size === 1) pan(dx, dy);
    else if (T.size === 2 && two) { const m = mid(); zoom(two.d / Math.max(10, m.d)); let da = m.a - two.a; da = Math.atan2(Math.sin(da), Math.cos(da)); S.yaw -= da;
      S.tiltT = THREE.MathUtils.clamp(S.tiltT - (m.y - two.y) * 0.002, -0.18, 0.26); pan((m.x - two.x) * 0.5, 0); two = m; } });
  const up = e => { if (!T.has(e.pointerId)) return; T.delete(e.pointerId); if (T.size < 2 && two) { S.yawK = Math.round(S.yaw / STEP); two = null; } };
  dom.addEventListener('pointerup', up); dom.addEventListener('pointercancel', up);

  const tgt = new THREE.Vector3();
  return {
    state: S, rotate, zoom,
    get yawDeg() { return ((Math.round(S.yawK) * 60) % 360 + 360) % 360; },
    focus: tgt,
    update(dt) {
      if (!S.enabled) return;
      const k = 1 - Math.exp(-dt * 6);
      if (!drag && !two) { const target = S.yawK * STEP; S.yaw += (target - S.yaw) * k; }
      S.dist += (S.distT - S.dist) * k; S.tilt += (S.tiltT - S.tilt) * k;
      const el = elevOf(S.dist) + S.tilt, fy = groundY(S.fx, S.fz) + 1.5;
      tgt.set(S.fx, fy, S.fz);
      camera.position.set(S.fx + Math.sin(S.yaw) * Math.cos(el) * S.dist, fy + Math.sin(el) * S.dist, S.fz + Math.cos(S.yaw) * Math.cos(el) * S.dist);
      camera.lookAt(tgt);
    },
  };
}
