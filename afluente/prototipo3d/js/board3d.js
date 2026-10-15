// O tabuleiro 3D: o vale vira jogo. A peça na mão aparece no canto (com as bordas coloridas e o rio), as casas livres em
// volta do vale ficam marcadas no chão, um toque escolhe a casa (o jogo já sugere o melhor giro), outro toque ou os botões
// giram a peça, e "Colocar" faz a peça brotar no vale: o relevo muda, o rio segue pelas bordas de água, nascem casas nas
// bordas de vila, plantação nas de lavoura, mata nas de mata, campo nas de campo; o capim, a água e as árvores entram
// junto. As estações do jogo mandam no clima (8 jogadas nas Águas, 4 na Seca).
import * as THREE from 'three';
import { Game, rot } from './game3d.js';

const COL = { A: '#3f8fc0', B: '#2f6a2a', C: '#d9b04a', V: '#c0583a', G: '#8cbf4a' };
const rnd = (() => { let a = 2718281; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();

export function buildBoard(api) {
  const { scene, camera, dom, R, TILES, hexCenter, heightAt, waterDist, inHex, edgeMid, DIRS, sectorType, PATHS, addRiver, ST } = api;
  const start = TILES.map(t => ({ q: t.q, r: t.r, e: api.edgesOf(t), src: t.kind === 'rio' }));
  for (const t of TILES) t.e0 = api.edgesOf(t);
  const game = Game({ seed: 'vale-3d', start, maxDist: 128, center: api.CENTER, cellPos: hexCenter });

  // ---------- painel do jogo (HTML por cima do mapa)
  const box = document.createElement('div'); box.id = 'jogo'; box.innerHTML = `
    <div class="mao"><canvas id="mao" width="132" height="132" aria-label="Peça na mão (toque para girar)"></canvas>
      <div class="lado"><div id="placar"></div><div class="gira"><button id="pL" aria-label="Girar a peça para a esquerda">⟲</button><button id="pR" aria-label="Girar a peça para a direita">⟳</button></div>
      <div class="prox"><span>próxima</span><canvas id="prox" width="44" height="44"></canvas></div></div></div>
    <div class="acao"><button id="colocar" disabled>Escolha uma casa marcada</button></div>
    <div id="aviso" aria-live="polite"></div>`;
  document.body.appendChild(box);
  const css = document.createElement('style'); css.textContent = `
    #jogo{position:fixed;left:max(12px,env(safe-area-inset-left));bottom:calc(max(12px,env(safe-area-inset-bottom)) + 26px);display:flex;flex-direction:column;gap:8px;pointer-events:none;z-index:5}
    #jogo .mao{display:flex;gap:10px;align-items:center;background:var(--paper);border-radius:18px;padding:8px 10px;box-shadow:0 4px 16px rgba(0,0,0,.14);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);pointer-events:auto}
    #jogo canvas#mao{width:96px;height:96px;cursor:pointer;touch-action:none}
    #jogo .lado{display:flex;flex-direction:column;gap:6px;min-width:120px}
    #placar{font:700 13px Nunito,system-ui;line-height:1.35}
    #placar b{font:800 18px "Baloo 2",system-ui}
    #jogo .gira{display:flex;gap:6px}
    #jogo .gira button{width:40px;height:36px;border:1px solid var(--line);background:#fff;border-radius:12px;font:800 18px system-ui;color:var(--ink)}
    #jogo .prox{display:flex;align-items:center;gap:6px;font-size:12px;opacity:.8}
    #jogo .prox canvas{width:32px;height:32px}
    #jogo .acao{pointer-events:auto}
    #colocar{border:0;border-radius:999px;background:var(--ink);color:#fff;font:800 15px "Baloo 2",system-ui;padding:10px 18px;min-height:44px;box-shadow:0 3px 12px rgba(0,0,0,.18)}
    #colocar:disabled{background:var(--paper);color:var(--ink);opacity:.9;font-weight:700}
    #aviso{font:700 13px Nunito,system-ui;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.5);max-width:300px;min-height:18px}
    @media (max-width:520px){#jogo .mao{padding:6px 8px}#jogo canvas#mao{width:78px;height:78px}}`;
  document.head.appendChild(css);
  const $ = id => document.getElementById(id);

  function drawThumb(cv, e) { const g = cv.getContext('2d'), W = cv.width, c = W / 2, r = W * 0.46; g.clearRect(0, 0, W, W);
    const P = i => { const a = (-60 * i + 30) * Math.PI / 180; return [c + r * Math.cos(a), c + r * Math.sin(a)]; };   // canto entre a borda i e i−1 (tela: y para baixo = sul)
    for (let d = 0; d < 6; d++) { const a = P(d), b = P(d + 1); g.beginPath(); g.moveTo(c, c); g.lineTo(...a); g.lineTo(...b); g.closePath(); g.fillStyle = e[d] === 'A' ? COL.G : COL[e[d]]; g.fill(); }
    g.lineWidth = W * 0.11; g.lineCap = 'round'; g.strokeStyle = COL.A;
    const A = e.map((x, d) => x === 'A' ? d : -1).filter(d => d >= 0), mid = d => { const a = -60 * d * Math.PI / 180; return [c + r * 0.87 * Math.cos(a), c + r * 0.87 * Math.sin(a)]; };
    for (const d of A) { g.beginPath(); g.moveTo(...mid(d)); g.lineTo(A.length === 1 ? c + (mid(d)[0] - c) * 0.3 : c, A.length === 1 ? c + (mid(d)[1] - c) * 0.3 : c); g.stroke(); }
    g.beginPath(); for (let i = 0; i <= 6; i++) { const p = P(i); i ? g.lineTo(...p) : g.moveTo(...p); } g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.9)'; g.stroke(); }

  // ---------- casas livres marcadas no chão, e o fantasma da peça escolhida
  const slotsG = new THREE.Group(); scene.add(slotsG);
  const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
  const fillMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide });
  const hexPts = (c, k = 0.97, lift = 0.25) => [0, 1, 2, 3, 4, 5].map(i => { const a = (-60 * i + 30) * Math.PI / 180, x = c[0] + R * k * Math.cos(a), z = c[1] + R * k * Math.sin(a); return new THREE.Vector3(x, Math.max(heightAt(x, z), -0.4) + lift, z); });
  function drawSlots() { slotsG.clear(); for (const s of game.slots()) { const c = hexCenter(s.q, s.r), pts = hexPts(c); const ln = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), lineMat); slotsG.add(ln);
    const ctr = new THREE.Vector3(c[0], Math.max(heightAt(c[0], c[1]), -0.4) + 0.2, c[1]), fg = new THREE.BufferGeometry(), fp = []; for (let i = 0; i < 6; i++) fp.push(...ctr.toArray(), ...pts[(i + 1) % 6].toArray(), ...pts[i].toArray());
    fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); const fm = new THREE.Mesh(fg, fillMat); fm.userData.slot = s; slotsG.add(fm); } }
  const ghost = new THREE.Group(); scene.add(ghost);
  function drawGhost() { ghost.clear(); if (!sel) return; const c = hexCenter(sel.q, sel.r), e = sel.opts[sel.i].e, m = sel.opts[sel.i].match, y = Math.max(heightAt(c[0], c[1]), -0.4) + 0.6;
    for (let d = 0; d < 6; d++) { const a1 = (-60 * d + 30) * Math.PI / 180, a2 = (-60 * (d + 1) + 30) * Math.PI / 180, g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([c[0], y, c[1], c[0] + R * 0.95 * Math.cos(a2), y, c[1] + R * 0.95 * Math.sin(a2), c[0] + R * 0.95 * Math.cos(a1), y, c[1] + R * 0.95 * Math.sin(a1)], 3));
      ghost.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: e[d] === 'A' ? COL.G : COL[e[d]], transparent: true, opacity: 0.62, depthWrite: false, side: THREE.DoubleSide })));
      if (e[d] === 'A') { const [mx, mz] = edgeMid(c, d, 0.82), band = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, Math.hypot(mx - c[0], mz - c[1])), new THREE.MeshBasicMaterial({ color: COL.A, transparent: true, opacity: 0.9 }));
        band.position.set((mx + c[0]) / 2, y + 0.05, (mz + c[1]) / 2); band.rotation.y = Math.atan2(mx - c[0], mz - c[1]); ghost.add(band); }
      if (m[d] !== null) { const [bx, bz] = edgeMid(c, d, 0.9), mk = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.35, 0.6), new THREE.MeshBasicMaterial({ color: m[d] ? 0x5fd86a : 0xf0a040 }));
        mk.position.set(bx, y + 0.15, bz); mk.rotation.y = -(-60 * d) * Math.PI / 180 + Math.PI / 2; mk.rotation.y = Math.atan2(Math.cos(-d * Math.PI / 3), -Math.sin(-d * Math.PI / 3)) + Math.PI / 2; ghost.add(mk); } } }

  // ---------- escolher, girar, colocar
  let sel = null;
  function select(q, r) { const opts = game.options(q, r); if (!opts.length) { say('Essa peça não encaixa aí: água que chega não pode bater em terra.'); return; } sel = { q, r, opts, i: 0 }; refresh(); }
  function turn(dir) { if (!sel) { hand = rot(hand, dir > 0 ? 1 : 5); refresh(); return; } sel.i = (sel.i + (dir > 0 ? 1 : sel.opts.length - 1)) % sel.opts.length; refresh(); }
  let hand = game.draw(game.S.next);
  function refresh() { const S = game.S, e = sel ? sel.opts[sel.i].e : hand;
    drawThumb($('mao'), e); const nx = game.draw(S.next + 1); if (S.left > 1) { drawThumb($('prox'), nx); $('prox').parentElement.style.visibility = 'visible'; } else $('prox').parentElement.style.visibility = 'hidden';
    $('placar').innerHTML = `<b>${S.score}</b> pontos<br>${S.left} peça${S.left === 1 ? '' : 's'} · ${game.phase()} ${S.clock + 1}/${game.seasonLen()}`;
    const b = $('colocar'); if (game.over()) { b.disabled = true; b.textContent = `Fim: ${S.score} pontos`; }
    else if (sel) { const o = sel.opts[sel.i]; b.disabled = false; b.textContent = `Colocar  +${o.pts}${o.tiles ? ` · +${o.tiles} peça` : ''}`; } else { b.disabled = true; b.textContent = 'Escolha uma casa marcada'; }
    drawGhost(); ST.seca = game.phase() === 'Seca'; }
  let sayT = 0; function say(t) { $('aviso').textContent = t; sayT = 5; }
  $('pL').onclick = () => turn(-1); $('pR').onclick = () => turn(1); $('mao').onclick = () => turn(1);
  addEventListener('keydown', e => { if (e.key === 'r' || e.key === 'R') turn(1); if (e.key === 'Enter' && sel) commit(); });
  $('colocar').onclick = () => commit();
  function commit() { if (!sel || game.over()) return; const { q, r } = sel, o = sel.opts[sel.i]; const res = game.place(q, r, o.e); sel = null; hand = game.draw(game.S.next);
    grow(q, r, o.e); say(res.events.length ? res.events.join(' · ') : `+${res.pts} ponto${res.pts === 1 ? '' : 's'}`); floatText(q, r, `+${res.pts}`);
    drawSlots(); if (!game.slots().some(s => game.options(s.q, s.r).length) && !game.over()) { game.skip(); hand = game.draw(game.S.next); say('Essa peça não cabia em lugar nenhum: passou a vez.'); } refresh(); }

  // ---------- toque no mapa (sem confundir com arrastar)
  let down = null; const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  dom.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: e.timeStamp }; });
  dom.addEventListener('pointerup', e => { if (!down) return; const mv = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = e.timeStamp - down.t;   /* hora do evento, não do processamento (num aparelho lento o quadro atrasa o 'soltar') */ down = null; if (mv > 8 || dt > 400) return;
    const rc = dom.getBoundingClientRect(); ndc.set((e.clientX - rc.left) / rc.width * 2 - 1, -(e.clientY - rc.top) / rc.height * 2 + 1); ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(slotsG.children.filter(o => o.isMesh), false)[0]; if (hit) { const s = hit.object.userData.slot; if (sel && sel.q === s.q && sel.r === s.r) turn(1); else select(s.q, s.r); } });

  // ---------- a peça brota no vale
  const growing = [];
  function grow(q, r, e) { const c = hexCenter(q, r), t = { q, r, c, e: e.slice(), kind: 'peca', cerrado: rnd() < 0.35 }; TILES.push(t);
    const before = new Set(scene.children);
    // rio: cada borda de água leva ao meio da peça (uma só: o brejo morre a um terço); o meio fica um pouco fora do centro
    const A = e.map((x, d) => x === 'A' ? d : -1).filter(d => d >= 0), j = [c[0] + (rnd() - 0.5) * 4, c[1] + (rnd() - 0.5) * 4];
    const curvePts = (a, b, m) => { const cv = new THREE.CatmullRomCurve3([a, m, b].map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal'); return cv.getSpacedPoints(24).map(v => [v.x, v.z]); };
    if (A.length === 1) { const m0 = edgeMid(c, A[0], 0.9), end = [c[0] + (m0[0] - c[0]) * 0.25, c[1] + (m0[1] - c[1]) * 0.25]; addRiver(curvePts(m0, end, [(m0[0] + end[0]) / 2 + (rnd() - 0.5) * 3, (m0[1] + end[1]) / 2 + (rnd() - 0.5) * 3]), 2.2); }
    else if (A.length === 2) { const a = edgeMid(c, A[0], 0.9), b = edgeMid(c, A[1], 0.9); addRiver(curvePts(a, b, j), 2.6); }
    else for (const d of A) { const a = edgeMid(c, d, 0.9); addRiver(curvePts(a, j, [(a[0] + j[0]) / 2 + (rnd() - 0.5) * 3, (a[1] + j[1]) / 2 + (rnd() - 0.5) * 3]), 2.4); }
    // casas nas bordas de vila (porta para o meio da peça e um caminho até lá)
    const WALL = [0xf2ece0, 0xf0d9a8, 0xf4efe6, 0xf3d58a, 0xe8e0f0], BAND = [0x3f78b0, 0x9a4a32, 0x4f8a4a, 0x2f5a9a, 0xa8402e], ROOF = [0xb4563a, 0xa94d34, 0xbd6440];
    for (let d = 0; d < 6; d++) if (e[d] === 'V') { const a = -d * Math.PI / 3 + (rnd() - 0.5) * 0.3, k = R * (0.5 + rnd() * 0.1), p = [c[0] + Math.cos(a) * k, c[1] + Math.sin(a) * k];
      if (waterDist(p[0], p[1]) < 6) continue; const rotY = Math.atan2(c[0] - p[0], c[1] - p[1]) + (rnd() - 0.5) * 0.3, bi = Math.floor(rnd() * BAND.length);
      const h = { p, rot: rotY, w: 6 + rnd() * 1.4, d: 5 + rnd() * 0.6, wall: WALL[Math.floor(rnd() * WALL.length)], band: BAND[bi], trim: BAND[(bi + 2) % BAND.length], roof: ROOF[Math.floor(rnd() * ROOF.length)], porch: rnd() < 0.3 };
      api.props.addHouse(h).traverse(o => o.layers.enable(1)); PATHS.push([[p[0] + Math.sin(rotY) * (h.d / 2 + 1), p[1] + Math.cos(rotY) * (h.d / 2 + 1)], j]); }
    // chão, água e capim
    const gm = api.groundFor(t);
    for (const d of A) { const n = TILES.find(u => u.q === q + DIRS[d][0] && u.r === r + DIRS[d][1]); if (n && n.gm) api.groundFor(n); }   /* o rio novo entra um pouco no vizinho */
    const wm = A.length ? api.waterFor(t) : null; api.fillField(c[0] - R - 2, c[1] - R - 2, c[0] + R + 2, c[1] + R + 2); const gr = api.grassFor(t);
    // árvores: mata nas bordas B, umas árvores e cupinzeiros no campo, buritis e moitas na beira d'água
    const inSector = (x, z, type) => inHex(x, z, c, 0.92) && sectorType(t, x, z) === type;
    const tries = (n, fn, test, minD) => { let k = 0; for (let i = 0; i < n * 40 && k < n; i++) { const x = c[0] + (rnd() - 0.5) * 2 * R, z = c[1] + (rnd() - 0.5) * 2 * R; if (!inHex(x, z, c, 0.92) || !test(x, z)) continue; if (api.place(fn(), x, z, minD)) k++; } };
    const nB = e.filter(x => x === 'B').length, nG = e.filter(x => x === 'G').length;
    tries(nB * 3, () => api.makeTree(t.cerrado ? 'pequi' : 'mata', 0.85 + rnd() * 0.3), (x, z) => inSector(x, z, 'B') && waterDist(x, z) > 1.8, 4.6);
    tries(nB * 3, () => api.makeTree('moita', 0.8 + rnd() * 0.5), (x, z) => inSector(x, z, 'B') && waterDist(x, z) > 1.2, 2.2);
    tries(Math.ceil(nG * 0.6), () => (rnd() < 0.15 ? api.makeTree('ipe', 0.8 + rnd() * 0.15) : api.makeTree('cerrado', 0.85 + rnd() * 0.35)), (x, z) => inSector(x, z, 'G') && waterDist(x, z) > 3, 7);
    tries(Math.ceil(nG * 0.5), api.makeTermite, (x, z) => inSector(x, z, 'G'), 3);
    if (A.length) { tries(A.length + 1, api.makeBuriti, (x, z) => { const w = waterDist(x, z); return w > 0.8 && w < 3.5; }, 4); tries(A.length * 2, () => api.makeTree('moita', 0.8 + rnd() * 0.4), (x, z) => { const w = waterDist(x, z); return w > 1.4 && w < 6; }, 2.5); }
    const trees = scene.children.filter(o => !before.has(o) && o.isGroup && (o.userData.kind || o.userData.regua === 'buriti'));
    // plantação nas bordas C (milho, girassol ou trigo; as fileiras seguem a direção da peça)
    const crop = ['milho', 'milho', 'girassol', 'trigo'][Math.floor(rnd() * 4)], gap = crop === 'trigo' ? 0.5 : 0.9, step = crop === 'girassol' ? 1.0 : 0.5, pts = [];
    if (e.includes('C')) for (let x = c[0] - R; x < c[0] + R; x += gap) for (let z = c[1] - R; z < c[1] + R; z += step) { const xx = x + (rnd() - 0.5) * 0.08, zz = z + (rnd() - 0.5) * 0.12;
      if (api.fieldAt(xx, zz) > 0.6 && inSector(xx, zz, 'C') && !api.blocked(xx, zz, 0.6)) pts.push([xx, zz]); }
    if (api.mobile) for (let i = pts.length - 1; i > 0; i -= 2) pts.splice(i, 1);
    const cropM = api.props.addCrop(crop, pts);
    const merged = api.mergeTrees(trees);
    api.buildNear();
    // brotar: o chão sobe, as árvores e a plantação crescem do chão, as casas sobem, a água aparece
    const items = [gm, ...merged, cropM, gr, ...scene.children.filter(o => !before.has(o) && o.isGroup && ['casa'].includes(o.userData.regua))].filter(Boolean);
    for (const o of items) { o.userData.sy = o.scale.y; o.scale.y = 0.02; } if (wm) wm.visible = false;
    growing.push({ items, wm, t: 0, c });
    ring(c); }
  // anel de luz que se abre a partir do centro da peça nova
  const rings = [];
  function ring(c) { const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.8, depthWrite: false }));
    m.position.set(c[0], Math.max(heightAt(c[0], c[1]), -0.4) + 0.5, c[1]); scene.add(m); rings.push({ m, t: 0 }); }
  const floats = [];
  function floatText(q, r, txt) { const c = hexCenter(q, r), cv = document.createElement('canvas'); cv.width = 256; cv.height = 96; const g = cv.getContext('2d');
    g.font = '800 64px "Baloo 2", system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 10; g.strokeStyle = 'rgba(20,40,30,.7)'; g.strokeText(txt, 128, 50); g.fillStyle = '#fff6c8'; g.fillText(txt, 128, 50);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false })); sp.scale.set(12, 4.5, 1); sp.position.set(c[0], 8, c[1]); sp.renderOrder = 999; scene.add(sp); floats.push({ sp, t: 0 }); }

  drawSlots(); refresh(); say('Toque numa casa marcada para encaixar a peça. Toque de novo para girar.');
  return { game, select, turn, commit, sel: () => sel, update(dt) {
    for (let i = growing.length - 1; i >= 0; i--) { const g = growing[i]; g.t += dt; const k = Math.min(1, g.t / 1.4), e = 1 - Math.pow(1 - k, 3);
      for (const o of g.items) o.scale.y = Math.max(0.02, o.userData.sy * e); if (g.wm && k > 0.45) g.wm.visible = true; if (k >= 1) growing.splice(i, 1); }
    for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += dt; const s = 1 + r.t * 26; r.m.scale.set(s, 1, s); r.m.material.opacity = Math.max(0, 0.8 * (1 - r.t / 0.9)); if (r.t > 0.9) { scene.remove(r.m); rings.splice(i, 1); } }
    for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.t += dt; f.sp.position.y = 8 + f.t * 3; f.sp.material.opacity = Math.max(0, 1 - f.t / 2.2); if (f.t > 2.2) { scene.remove(f.sp); floats.splice(i, 1); } }
    fillMat.opacity = 0.08 + 0.06 * Math.sin(performance.now() * 0.004);
    if (sayT > 0) { sayT -= dt; if (sayT <= 0) $('aviso').textContent = ''; } } };
}
