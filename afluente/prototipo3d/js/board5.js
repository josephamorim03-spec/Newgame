// O tabuleiro 3D com o núcleo v5 ("o rio é o orçamento", ../../nucleo/regras.js). Mesmo jeito de jogar do board3d.js
// (casas marcadas no chão, toque escolhe e gira, a peça brota no vale), e por cima o que o v5 pede:
//  - a vazão do rio no placar (💧 usada/total), e quem fica sem água marcado no vale;
//  - as plaquinhas das vilas, com o pedido de cada uma e o que a peça escolhida muda;
//  - os olhos-d'água no chão, com quanto somam;
//  - "A vila cresceu!": a escolha entre dois pacotes, e a vila ganha casa nova no vale;
//  - o aviso da seca antes de ela chegar.
import * as THREE from 'three';
import { Game, rot, KQ, KR, K, PEDIDOS } from '../../nucleo/regras.js';

const COL = { A: '#3f8fc0', B: '#2f6a2a', C: '#d9b04a', V: '#c0583a', G: '#8cbf4a' };
const TEMA = { roca: '🌾 Roça', mata: '🌳 Mata', rio: '💧 Rio', vila: '🏠 Vila' };
const rnd = (() => { let a = 1618033; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();

export function buildBoard5(api) {
  const { scene, camera, dom, R, TILES, hexCenter, heightAt, waterDist, inHex, edgeMid, DIRS, sectorType, PATHS, addRiver, ST } = api;
  const start = TILES.map(t => ({ q: t.q, r: t.r, e: api.edgesOf(t), src: t.kind === 'rio' }));
  const seed = new URLSearchParams(location.search).get('vale') || ('v5-' + new Date().toISOString().slice(0, 10));
  const game = Game({ seed, start });
  const S = game.S, groundY = (x, z) => Math.max(heightAt(x, z), -0.4);

  // ---------- painel (HTML por cima do mapa)
  const box = document.createElement('div'); box.id = 'jogo'; box.innerHTML = `
    <div class="mao"><canvas id="mao" width="132" height="132" aria-label="Peça na mão (toque para girar)"></canvas>
      <div class="lado"><div id="placar"></div><div class="gira"><button id="pL" aria-label="Girar a peça para a esquerda">⟲</button><button id="pR" aria-label="Girar a peça para a direita">⟳</button></div>
      <div class="prox"><span>próxima</span><canvas id="prox" width="44" height="44"></canvas></div></div></div>
    <div class="acao"><button id="colocar" disabled>Escolha uma casa marcada</button></div>
    <div id="aviso" aria-live="polite"></div>`;
  document.body.appendChild(box);
  const pk = document.createElement('div'); pk.id = 'pacote5'; pk.hidden = true; pk.setAttribute('role', 'dialog'); pk.setAttribute('aria-modal', 'true');
  pk.innerHTML = '<div class="folha"><h2 id="pkT">A vila cresceu!</h2><p id="pkS"></p><div class="pks" id="pkO"></div></div>'; document.body.appendChild(pk);
  const css = document.createElement('style'); css.textContent = `
    #jogo{position:fixed;left:max(12px,env(safe-area-inset-left));bottom:calc(max(12px,env(safe-area-inset-bottom)) + 26px);display:flex;flex-direction:column;gap:8px;pointer-events:none;z-index:5}
    #jogo .mao{display:flex;gap:10px;align-items:center;background:var(--paper);border-radius:18px;padding:8px 10px;box-shadow:0 4px 16px rgba(0,0,0,.14);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);pointer-events:auto}
    #jogo canvas#mao{width:96px;height:96px;cursor:pointer;touch-action:none}
    #jogo .lado{display:flex;flex-direction:column;gap:6px;min-width:132px}
    #placar{font:700 13px Nunito,system-ui;line-height:1.35}#placar b{font:800 18px "Baloo 2",system-ui}#placar .ag{color:#1f6f9a}
    #jogo .gira{display:flex;gap:6px}
    #jogo .gira button{width:44px;height:40px;border:1px solid var(--line);background:#fff;border-radius:12px;font:800 18px system-ui;color:var(--ink)}
    #jogo .prox{display:flex;align-items:center;gap:6px;font-size:12px;opacity:.8}#jogo .prox canvas{width:32px;height:32px}
    #jogo .acao{pointer-events:auto}
    #colocar{border:0;border-radius:999px;background:var(--ink);color:#fff;font:800 15px "Baloo 2",system-ui;padding:10px 18px;min-height:44px;box-shadow:0 3px 12px rgba(0,0,0,.18);max-width:min(340px,calc(100vw - 24px))}
    #colocar:disabled{background:var(--paper);color:var(--ink);opacity:.9;font-weight:700}
    #aviso{font:700 13px Nunito,system-ui;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.6);max-width:min(320px,calc(100vw - 24px));min-height:18px}
    #pacote5{position:fixed;inset:0;display:flex;align-items:flex-end;justify-content:center;background:rgba(20,40,40,.35);z-index:20;padding:12px}
    #pacote5[hidden]{display:none}
    #pacote5 .folha{width:100%;max-width:460px;background:var(--paper);border-radius:22px;padding:16px;box-shadow:0 8px 30px rgba(0,0,0,.25);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
    #pacote5 h2{margin:0 0 4px;font:800 22px "Baloo 2",system-ui}#pacote5 p{margin:0 0 10px;font:700 14px Nunito,system-ui;line-height:1.35}
    #pacote5 .pks{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    #pacote5 button{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 8px;border:2px solid var(--line);border-radius:18px;background:#fff;color:var(--ink);font:800 17px "Baloo 2",system-ui;min-height:44px;cursor:pointer}
    #pacote5 button .t{display:flex;gap:2px}#pacote5 canvas{width:40px;height:40px}
    @media (max-width:520px){#jogo .mao{padding:6px 8px}#jogo canvas#mao{width:78px;height:78px}}`;
  document.head.appendChild(css);
  const $ = id => document.getElementById(id);

  function drawThumb(cv, e) { const g = cv.getContext('2d'), W = cv.width, c = W / 2, r = W * 0.46; g.clearRect(0, 0, W, W);
    const P = i => { const a = (-60 * i + 30) * Math.PI / 180; return [c + r * Math.cos(a), c + r * Math.sin(a)]; };
    for (let d = 0; d < 6; d++) { const a = P(d), b = P(d + 1); g.beginPath(); g.moveTo(c, c); g.lineTo(...a); g.lineTo(...b); g.closePath(); g.fillStyle = e[d] === 'A' ? COL.G : COL[e[d]]; g.fill(); }
    g.lineWidth = W * 0.11; g.lineCap = 'round'; g.strokeStyle = COL.A;
    const A = e.map((x, d) => x === 'A' ? d : -1).filter(d => d >= 0), mid = d => { const a = -60 * d * Math.PI / 180; return [c + r * 0.87 * Math.cos(a), c + r * 0.87 * Math.sin(a)]; };
    for (const d of A) { g.beginPath(); g.moveTo(...mid(d)); g.lineTo(A.length === 1 ? c + (mid(d)[0] - c) * 0.3 : c, A.length === 1 ? c + (mid(d)[1] - c) * 0.3 : c); g.stroke(); }
    g.beginPath(); for (let i = 0; i <= 6; i++) { const p = P(i); i ? g.lineTo(...p) : g.moveTo(...p); } g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.9)'; g.stroke(); }

  // ---------- etiquetas no mundo (sprites de texto): plaquinhas das vilas, olhos-d'água, "sem água"
  const tags = new THREE.Group(); scene.add(tags);
  function tag(txt, x, y, z, o = {}) { const cv = document.createElement('canvas'), g = cv.getContext('2d'), f = o.size || 44; g.font = `800 ${f}px "Baloo 2", system-ui`;
    const w = Math.ceil(g.measureText(txt).width) + f * 0.9; cv.width = w; cv.height = Math.ceil(f * 1.5); g.font = `800 ${f}px "Baloo 2", system-ui`;
    const r = cv.height / 2; g.fillStyle = o.bg || 'rgba(255,250,236,.94)'; g.beginPath(); g.roundRect(2, 2, w - 4, cv.height - 4, r - 2); g.fill();
    if (o.ring) { g.lineWidth = 4; g.strokeStyle = o.ring; g.stroke(); }
    g.fillStyle = o.fg || '#5a3b12'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, cv.height / 2 + 2);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    // tamanho fixo na tela (como um rótulo de jogo), seja qual for a distância da câmera
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, sizeAttenuation: false })); const hh = (o.k || 1) * 0.045;
    sp.scale.set(hh * w / cv.height, hh, 1); sp.position.set(x, y, z); sp.renderOrder = 998; tags.add(sp); return sp; }
  const springG = new THREE.Group(); scene.add(springG);
  const springMat = new THREE.MeshBasicMaterial({ color: 0x7fd4ff, transparent: true, opacity: 0.55, depthWrite: false });
  function drawTags(pv) { for (const o of tags.children) { o.material.map.dispose(); o.material.dispose(); } tags.clear(); springG.clear();
    const W = game.water();
    // vilas: o pedido e, com a peça escolhida, o que ela muda
    const ch = new Map((pv ? pv.vil : []).map(v => [v.id, v]));
    for (const v of S.vilas.values()) { const P = PEDIDOS[v.req.t], c = hexCenter(KQ(v.id), KR(v.id)), cur = game.progress(v), x = ch.get(v.id);
      const txt = x && x.after !== x.before ? (x.done ? `${P.icone} ✓ a vila cresce!` : `${P.icone} ${x.before}→${x.after}/${v.req.n}`) : v.req.t === 'agua' ? `${P.icone} quer água` : `${P.icone} ${cur}/${v.req.n}`;
      tag(txt, c[0], groundY(c[0], c[1]) + 16, c[1], x && x.done ? { bg: '#3f9a4a', fg: '#fff' } : { ring: '#e0663f' }); }
    // olhos-d'água: um poço claro no chão e quanto ele soma
    for (const [k, f] of S.springs) { const c = hexCenter(KQ(k), KR(k)), y = groundY(c[0], c[1]) + 0.3;
      const m = new THREE.Mesh(new THREE.CircleGeometry(4.5, 28).rotateX(-Math.PI / 2), springMat); m.position.set(c[0], y, c[1]); springG.add(m);
      tag(`olho-d'água +${f}💧`, c[0], y + 6, c[1], { bg: 'rgba(225,245,255,.95)', fg: '#1f5f86', k: 0.8 }); }
    // quem gasta água e ficou sem: lavoura e vila secas
    for (const k of W.dry) { const c = hexCenter(KQ(k), KR(k)); tag('sem água', c[0], groundY(c[0], c[1]) + 9, c[1], { bg: '#e07a2e', fg: '#fff', k: 0.75 }); }
    // a seca chegando: quem vai secar
    if (!game.isSeca() && game.seasonLen() - S.clock <= 3) { const sp = game.secaPreview(); for (const k of sp.dry) if (!W.dry.has(k)) { const c = hexCenter(KQ(k), KR(k)); tag('seca na seca', c[0], groundY(c[0], c[1]) + 9, c[1], { bg: 'rgba(255,228,204,.95)', fg: '#8a3a0c', k: 0.75 }); } }
  }

  // ---------- casas livres e o fantasma da peça escolhida
  const slotsG = new THREE.Group(); scene.add(slotsG);
  const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
  const fillMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide });
  const hotMat = new THREE.MeshBasicMaterial({ color: 0xffcf5a, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
  const hexPts = (c, k = 0.97, lift = 0.25) => [0, 1, 2, 3, 4, 5].map(i => { const a = (-60 * i + 30) * Math.PI / 180, x = c[0] + R * k * Math.cos(a), z = c[1] + R * k * Math.sin(a); return new THREE.Vector3(x, groundY(x, z) + lift, z); });
  // casas onde a peça na mão ajuda o pedido de uma vila ficam douradas
  function hotSlots() { const hot = new Set(); for (const k of game.slots()) for (const o of game.options(k)) if (o.vil.some(v => v.after > v.before)) { hot.add(k); break; } return hot; }
  function drawSlots() { slotsG.clear(); const hot = hotSlots();
    for (const k of game.slots()) { if (!game.options(k).length) continue; const q = KQ(k), r = KR(k), c = hexCenter(q, r), pts = hexPts(c);
      slotsG.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
      const ctr = new THREE.Vector3(c[0], groundY(c[0], c[1]) + 0.2, c[1]), fg = new THREE.BufferGeometry(), fp = []; for (let i = 0; i < 6; i++) fp.push(...ctr.toArray(), ...pts[(i + 1) % 6].toArray(), ...pts[i].toArray());
      fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); const fm = new THREE.Mesh(fg, hot.has(k) ? hotMat : fillMat); fm.userData.slot = { k, q, r }; slotsG.add(fm); } }
  const ghost = new THREE.Group(); scene.add(ghost);
  function drawGhost() { ghost.clear(); if (!sel) return; const c = hexCenter(sel.q, sel.r), o = sel.opts[sel.i], e = o.e, m = o.marks, y = groundY(c[0], c[1]) + 0.6;
    for (let d = 0; d < 6; d++) { const a1 = (-60 * d + 30) * Math.PI / 180, a2 = (-60 * (d + 1) + 30) * Math.PI / 180, g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([c[0], y, c[1], c[0] + R * 0.95 * Math.cos(a2), y, c[1] + R * 0.95 * Math.sin(a2), c[0] + R * 0.95 * Math.cos(a1), y, c[1] + R * 0.95 * Math.sin(a1)], 3));
      ghost.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: e[d] === 'A' ? COL.G : COL[e[d]], transparent: true, opacity: 0.62, depthWrite: false, side: THREE.DoubleSide })));
      if (e[d] === 'A') { const [mx, mz] = edgeMid(c, d, 0.82), band = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, Math.hypot(mx - c[0], mz - c[1])), new THREE.MeshBasicMaterial({ color: COL.A, transparent: true, opacity: 0.9 }));
        band.position.set((mx + c[0]) / 2, y + 0.05, (mz + c[1]) / 2); band.rotation.y = Math.atan2(mx - c[0], mz - c[1]); ghost.add(band); }
      if (m[d] !== null) { const [bx, bz] = edgeMid(c, d, 0.9), mk = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.35, 0.6), new THREE.MeshBasicMaterial({ color: m[d] ? 0x5fd86a : 0xf0a040 }));
        mk.position.set(bx, y + 0.15, bz); mk.rotation.y = Math.atan2(Math.cos(-d * Math.PI / 3), -Math.sin(-d * Math.PI / 3)) + Math.PI / 2; ghost.add(mk); } } }

  // ---------- escolher, girar, colocar
  let sel = null;
  // o giro sugerido: o que atende ou avança um pedido, liga um olho-d'água, recebe água e encaixa mais lados
  const value = o => o.vil.filter(v => v.done).length * 10 + o.vil.filter(v => v.after > v.before).length * 3 + (o.spring ? 4 : 0) + (o.wetSelf ? 1 : 0) - (o.drySelf ? 2 : 0) - o.lost.length * 2 + o.marks.filter(Boolean).length * 0.5;
  function select(k) { if (S.escolha.length) { openPack(); return; } const opts = game.options(k); if (!opts.length) { say('Essa peça não encaixa aí: rio só encosta em rio.'); return; }
    let bi = 0; opts.forEach((o, i) => { if (value(o) > value(opts[bi])) bi = i; }); sel = { k, q: KQ(k), r: KR(k), opts, i: bi }; refresh(); }
  function turn(dir) { if (!sel) return; sel.i = (sel.i + (dir > 0 ? 1 : sel.opts.length - 1)) % sel.opts.length; refresh(); }
  function flow() { const W = game.water(); let f = 0, u = 0; for (const n of W.nets) { f += n.flow; u += n.used; } return [u, f]; }
  function refresh() { const e = sel ? sel.opts[sel.i].e : game.hand().e; drawThumb($('mao'), e);
    if (S.left > 1) { drawThumb($('prox'), game.next().e); $('prox').parentElement.style.visibility = 'visible'; } else $('prox').parentElement.style.visibility = 'hidden';
    const [u, f] = flow(), sec = game.isSeca();
    $('placar').innerHTML = `<b>${S.gente}</b> gente · <span class="ag">💧 ${u}/${f}</span><br>${S.left} peça${S.left === 1 ? '' : 's'} · ${sec ? 'Seca' : 'Águas'} ${S.clock + 1}/${game.seasonLen()}`;
    const b = $('colocar');
    if (S.over) { b.disabled = false; b.textContent = `Fim: ${S.gente} gente · jogar de novo`; }
    else if (sel) { const o = sel.opts[sel.i], x = []; if (o.vil.some(v => v.done)) x.push('a vila cresce!'); if (o.spring) x.push(`olho-d'água +${o.spring}💧`); if (o.drySelf) x.push('fica sem água'); if (o.lost.length) x.push(`${o.lost.length} perde${o.lost.length > 1 ? 'm' : ''} a água`);
      b.disabled = false; b.textContent = 'Colocar' + (x.length ? ' · ' + x.join(' · ') : ''); }
    else { b.disabled = true; b.textContent = 'Escolha uma casa marcada'; }
    drawGhost(); drawTags(sel ? sel.opts[sel.i] : null); ST.seca = sec; }
  let sayT = 0; function say(t) { $('aviso').textContent = t; sayT = 6; }
  $('pL').onclick = () => turn(-1); $('pR').onclick = () => turn(1); $('mao').onclick = () => turn(1);
  addEventListener('keydown', e => { if (e.key === 'r' || e.key === 'R') turn(1); if (e.key === 'Enter' && sel) commit(); });
  $('colocar').onclick = () => { if (S.over) { location.reload(); return; } commit(); };
  function commit() { if (!sel || S.over) return; const { k, q, r } = sel, o = sel.opts[sel.i]; const res = game.place(k, o.e); if (!res) return; sel = null;
    grow(q, r, o.e); follow(hexCenter(q, r));
    const txt = res.ev.map(x => x.txt); say(txt.length ? txt.join(' · ') : 'Peça no vale');
    for (const x of res.ev) if (x.t === 'pedido') { growVillage(x.k); floatText(KQ(x.k), KR(x.k), `nível ${x.lvl}!`); }
    if (!S.over && !S.escolha.length && !game.fits()) { game.skip(); say('Essa peça não cabia em lugar nenhum: passou a vez.'); }
    drawSlots(); refresh(); if (S.escolha.length) setTimeout(openPack, 900); }

  // ---------- "A vila cresceu!": dois pacotes; o escolhido entra logo depois da peça na mão
  function openPack() { const ch = S.escolha[0]; if (!ch) { pk.hidden = true; return; } $('pkS').textContent = 'O que chega na pilha? As 3 peças entram logo depois da peça na mão.';
    const box = $('pkO'); box.innerHTML = '';
    ch.forEach((p, i) => { const b = document.createElement('button'); b.type = 'button'; b.innerHTML = `<span>${TEMA[p.tema] || p.tema}</span><span class="t"></span>`;
      for (const t of p.tiles) { const c = document.createElement('canvas'); c.width = c.height = 80; drawThumb(c, t.e); b.querySelector('.t').appendChild(c); }
      b.onclick = () => { game.choose(i); pk.hidden = true; say(`${TEMA[p.tema] || p.tema}: 3 peças a caminho`); drawSlots(); refresh(); if (S.escolha.length) setTimeout(openPack, 300); };
      box.appendChild(b); });
    pk.hidden = false; }

  // ---------- toque no mapa (sem confundir com arrastar)
  let down = null; const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  dom.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: e.timeStamp }; });
  dom.addEventListener('pointerup', e => { if (!down) return; const mv = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = e.timeStamp - down.t; down = null; if (mv > 8 || dt > 400) return;
    const rc = dom.getBoundingClientRect(); ndc.set((e.clientX - rc.left) / rc.width * 2 - 1, -(e.clientY - rc.top) / rc.height * 2 + 1); ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(slotsG.children.filter(o => o.isMesh), false)[0]; if (hit) { const s = hit.object.userData.slot; if (sel && sel.k === s.k) turn(1); else select(s.k); } });

  // ---------- a vila cresce: uma casa nova numa peça dela, num lugar livre longe da água
  const WALL = [0xf2ece0, 0xf0d9a8, 0xf4efe6, 0xf3d58a, 0xe8e0f0], BAND = [0x3f78b0, 0x9a4a32, 0x4f8a4a, 0x2f5a9a, 0xa8402e], ROOF = [0xb4563a, 0xa94d34, 0xbd6440];
  function addHouseAt(c, p) { const rotY = Math.atan2(c[0] - p[0], c[1] - p[1]) + (rnd() - 0.5) * 0.4, bi = Math.floor(rnd() * BAND.length);
    const h = { p, rot: rotY, w: 6 + rnd() * 1.4, d: 5 + rnd() * 0.6, wall: WALL[Math.floor(rnd() * WALL.length)], band: BAND[bi], trim: BAND[(bi + 2) % BAND.length], roof: ROOF[Math.floor(rnd() * ROOF.length)], porch: rnd() < 0.3 };
    const o = api.props.addHouse(h); o.traverse(x => x.layers.enable(1)); PATHS.push([[p[0] + Math.sin(rotY) * (h.d / 2 + 1), p[1] + Math.cos(rotY) * (h.d / 2 + 1)], c]); return o; }
  function growVillage(id) { const v = S.vilas.get(id) || [...S.vilas.values()].find(x => x.tiles.has(id)); if (!v) return; const ks = [...v.tiles];
    for (let n = 0; n < 40; n++) { const k = ks[Math.floor(rnd() * ks.length)], c = hexCenter(KQ(k), KR(k)), a = rnd() * 6.283, d = R * (0.25 + rnd() * 0.5), p = [c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d];
      if (waterDist(p[0], p[1]) < 6 || api.blocked(p[0], p[1], 1.5)) continue; const o = addHouseAt(c, p); o.userData.sy = o.scale.y; o.scale.y = 0.02; growing.push({ items: [o], wm: null, t: 0, c }); ring(c); return; } }

  // ---------- a peça brota no vale (o mesmo do board3d.js)
  const growing = [];
  function grow(q, r, e) { const c = hexCenter(q, r), t = { q, r, c, e: e.slice(), kind: 'peca', cerrado: rnd() < 0.35 }; TILES.push(t);
    const before = new Set(scene.children);
    const A = e.map((x, d) => x === 'A' ? d : -1).filter(d => d >= 0), j = [c[0] + (rnd() - 0.5) * 4, c[1] + (rnd() - 0.5) * 4];
    const curvePts = (a, b, m) => { const cv = new THREE.CatmullRomCurve3([a, m, b].map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal'); return cv.getSpacedPoints(24).map(v => [v.x, v.z]); };
    if (A.length === 1) { const m0 = edgeMid(c, A[0], 0.9), end = [c[0] + (m0[0] - c[0]) * 0.25, c[1] + (m0[1] - c[1]) * 0.25]; addRiver(curvePts(m0, end, [(m0[0] + end[0]) / 2 + (rnd() - 0.5) * 3, (m0[1] + end[1]) / 2 + (rnd() - 0.5) * 3]), 2.2); }
    else if (A.length === 2) { const a = edgeMid(c, A[0], 0.9), b = edgeMid(c, A[1], 0.9); addRiver(curvePts(a, b, j), 2.6); }
    else for (const d of A) { const a = edgeMid(c, d, 0.9); addRiver(curvePts(a, j, [(a[0] + j[0]) / 2 + (rnd() - 0.5) * 3, (a[1] + j[1]) / 2 + (rnd() - 0.5) * 3]), 2.4); }
    for (let d = 0; d < 6; d++) if (e[d] === 'V') { const a = -d * Math.PI / 3 + (rnd() - 0.5) * 0.3, k = R * (0.5 + rnd() * 0.1), p = [c[0] + Math.cos(a) * k, c[1] + Math.sin(a) * k];
      if (waterDist(p[0], p[1]) < 6) continue; addHouseAt(j, p); }
    const gm = api.groundFor(t);
    for (const d of A) { const n = TILES.find(u => u.q === q + DIRS[d][0] && u.r === r + DIRS[d][1]); if (n && n.gm) api.groundFor(n); }
    const wm = A.length ? api.waterFor(t) : null; api.fillField(c[0] - R - 2, c[1] - R - 2, c[0] + R + 2, c[1] + R + 2); const gr = api.grassFor(t);
    const inSector = (x, z, type) => inHex(x, z, c, 0.92) && sectorType(t, x, z) === type;
    const tries = (n, fn, test, minD) => { let k = 0; for (let i = 0; i < n * 40 && k < n; i++) { const x = c[0] + (rnd() - 0.5) * 2 * R, z = c[1] + (rnd() - 0.5) * 2 * R; if (!inHex(x, z, c, 0.92) || !test(x, z)) continue; if (api.place(fn(), x, z, minD)) k++; } };
    const nB = e.filter(x => x === 'B').length, nG = e.filter(x => x === 'G').length;
    tries(nB * 3, () => api.makeTree(t.cerrado ? 'pequi' : 'mata', 0.85 + rnd() * 0.3), (x, z) => inSector(x, z, 'B') && waterDist(x, z) > 1.8, 4.6);
    tries(nB * 3, () => api.makeTree('moita', 0.8 + rnd() * 0.5), (x, z) => inSector(x, z, 'B') && waterDist(x, z) > 1.2, 2.2);
    tries(Math.ceil(nG * 0.6), () => (rnd() < 0.15 ? api.makeTree('ipe', 0.8 + rnd() * 0.15) : api.makeTree('cerrado', 0.85 + rnd() * 0.35)), (x, z) => inSector(x, z, 'G') && waterDist(x, z) > 3, 7);
    tries(Math.ceil(nG * 0.5), api.makeTermite, (x, z) => inSector(x, z, 'G'), 3);
    if (A.length) { tries(A.length + 1, api.makeBuriti, (x, z) => { const w = waterDist(x, z); return w > 0.8 && w < 3.5; }, 4); tries(A.length * 2, () => api.makeTree('moita', 0.8 + rnd() * 0.4), (x, z) => { const w = waterDist(x, z); return w > 1.4 && w < 6; }, 2.5); }
    const trees = scene.children.filter(o => !before.has(o) && o.isGroup && (o.userData.kind || o.userData.regua === 'buriti'));
    const crop = ['milho', 'milho', 'girassol', 'trigo'][Math.floor(rnd() * 4)], gap = crop === 'trigo' ? 0.5 : 0.9, step = crop === 'girassol' ? 1.0 : 0.5, pts = [];
    if (e.includes('C')) for (let x = c[0] - R; x < c[0] + R; x += gap) for (let z = c[1] - R; z < c[1] + R; z += step) { const xx = x + (rnd() - 0.5) * 0.08, zz = z + (rnd() - 0.5) * 0.12;
      if (api.fieldAt(xx, zz) > 0.6 && inSector(xx, zz, 'C') && !api.blocked(xx, zz, 0.6)) pts.push([xx, zz]); }
    if (api.mobile) for (let i = pts.length - 1; i > 0; i -= 2) pts.splice(i, 1);
    const cropM = api.props.addCrop(crop, pts);
    const merged = api.mergeTrees(trees);
    api.buildNear();
    const items = [gm, ...merged, cropM, gr, ...scene.children.filter(o => !before.has(o) && o.isGroup && ['casa'].includes(o.userData.regua))].filter(Boolean);
    for (const o of items) { o.userData.sy = o.scale.y; o.scale.y = 0.02; } if (wm) wm.visible = false;
    growing.push({ items, wm, t: 0, c });
    ring(c); }
  // a câmera desliza até perto da peça posta (60% do caminho, em ~1 s), para o que acontece ficar à vista
  let camGo = null;
  function follow(c) { const gc = window.__previa && window.__previa.gameCam; if (!gc) return; const f = gc.state; camGo = { gc, x: f.fx + (c[0] - f.fx) * 0.6, z: f.fz + (c[1] - f.fz) * 0.6, t: 0 }; }
  const rings = [];
  function ring(c) { const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.8, depthWrite: false }));
    m.position.set(c[0], groundY(c[0], c[1]) + 0.5, c[1]); scene.add(m); rings.push({ m, t: 0 }); }
  const floats = [];
  function floatText(q, r, txt) { const c = hexCenter(q, r), cv = document.createElement('canvas'); cv.width = 320; cv.height = 96; const g = cv.getContext('2d');
    g.font = '800 64px "Baloo 2", system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 10; g.strokeStyle = 'rgba(20,40,30,.7)'; g.strokeText(txt, 160, 50); g.fillStyle = '#fff6c8'; g.fillText(txt, 160, 50);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false })); sp.scale.set(15, 4.5, 1); sp.position.set(c[0], 10, c[1]); sp.renderOrder = 999; scene.add(sp); floats.push({ sp, t: 0 }); }

  drawSlots(); refresh(); say("Leve o rio às lavouras e às vilas: cada uma gasta 1 💧 da nascente. Ligue olhos-d'água para ter mais. As vilas pedem; atendidas, crescem.");
  return { game, select, turn, commit, sel: () => sel, update(dt) {
    for (let i = growing.length - 1; i >= 0; i--) { const g = growing[i]; g.t += dt; const k = Math.min(1, g.t / 1.4), e = 1 - Math.pow(1 - k, 3);
      for (const o of g.items) o.scale.y = Math.max(0.02, o.userData.sy * e); if (g.wm && k > 0.45) g.wm.visible = true; if (k >= 1) growing.splice(i, 1); }
    for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += dt; const s = 1 + r.t * 26; r.m.scale.set(s, 1, s); r.m.material.opacity = Math.max(0, 0.8 * (1 - r.t / 0.9)); if (r.t > 0.9) { scene.remove(r.m); rings.splice(i, 1); } }
    for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.t += dt; f.sp.position.y = 10 + f.t * 3; f.sp.material.opacity = Math.max(0, 1 - f.t / 2.2); if (f.t > 2.2) { scene.remove(f.sp); floats.splice(i, 1); } }
    if (camGo) { const f = camGo.gc.state, k = 1 - Math.exp(-dt * 4); f.fx += (camGo.x - f.fx) * k; f.fz += (camGo.z - f.fz) * k; camGo.t += dt; if (camGo.t > 1.4) camGo = null; }
    fillMat.opacity = 0.08 + 0.06 * Math.sin(performance.now() * 0.004); hotMat.opacity = 0.26 + 0.12 * Math.sin(performance.now() * 0.005);
    if (sayT > 0) { sayT -= dt; if (sayT <= 0) $('aviso').textContent = ''; } } };
}
