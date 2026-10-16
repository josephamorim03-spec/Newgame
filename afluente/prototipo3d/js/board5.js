// O tabuleiro 3D com o núcleo v5 ("o rio é o orçamento", ../../nucleo/regras.js). Mesmo jeito de jogar do board3d.js
// (casas marcadas no chão, toque escolhe e gira, a peça brota no vale), e por cima o que o v5 pede:
//  - a vazão do rio no placar (💧 usada/total), e quem fica sem água marcado no vale;
//  - as plaquinhas das vilas, com o pedido de cada uma e o que a peça escolhida muda;
//  - os olhos-d'água no chão, com quanto somam;
//  - "A vila cresceu!": a escolha entre dois pacotes, e a vila ganha casa nova no vale;
//  - o aviso da seca antes de ela chegar;
//  - a história do começo (o vale da nascente), as peças da mão em 3D, a maquete da peça que cai no lugar e levanta poeira;
//  - o "juice": som sintetizado (sem arquivos), vibração, tremor no baque, confete na vila que cresce, gotas no olho-d'água,
//    a maquete que gira com mola, o placar que conta e pulsa, e a tela do fim.
import * as THREE from 'three';
import { Game, rot, KQ, KR, K, PEDIDOS, vazao, nbk, opp, NOME, PACIENCIA } from '../../nucleo/regras.js';
import { toon, U } from './mat.js';
import { createSom } from './som.js';
import { createMenu } from './menu5.js';

const COL = { A: '#3f8fc0', B: '#2f6a2a', C: '#d9b04a', V: '#c0583a', G: '#8cbf4a' };
const TEMA = { roca: '🌾 Roça', mata: '🌳 Mata', rio: '💧 Rio', vila: '🏠 Vila' };
const rnd = (() => { let a = 1618033; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();

export function buildBoard5(api) {
  const { scene, camera, dom, R, TILES, hexCenter, heightAt, waterDist, inHex, edgeMid, DIRS, sectorType, PATHS, addRiver, ST } = api;
  const start = TILES.map(t => ({ q: t.q, r: t.r, e: api.edgesOf(t), src: t.kind === 'rio' }));
  // ---------- a partida salva (no aparelho): o sorteio do vale e a lista de jogadas; reabrir refaz o vale jogada por jogada
  // (o núcleo é determinístico: o mesmo sorteio com as mesmas jogadas dá o mesmo vale)
  const SAVE = 'afluente:v5:partida', REC = 'afluente:v5:recordes', PREF = 'afluente:v5:ajustes';
  const ler = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }, gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const hj = new Date(), DIARIO = `v5-${hj.getFullYear()}-${String(hj.getMonth() + 1).padStart(2, '0')}-${String(hj.getDate()).padStart(2, '0')}`,   /* o dia daqui (em UTC o vale do dia virava às 21 h no Brasil) */ urlVale = new URLSearchParams(location.search).get('vale');
  let salva = ler(SAVE); if (salva && (salva.v !== 1 || salva.over || !Array.isArray(salva.acts))) salva = null;
  const seed = urlVale || (salva ? salva.seed : DIARIO), retoma = salva && salva.seed === seed && salva.acts.length ? salva.acts : null;
  const acts = [];   // ['p', casa, lados] colocou · ['s'] passou · ['c', i] escolheu o pacote i
  const game = Game({ seed, start });
  const S = game.S, groundY = (x, z) => Math.max(heightAt(x, z), -0.4);

  // ---------- juice: som sintetizado na hora (marimba, água, baque), vibração do celular, tremor da câmera e confete
  const som = createSom(), SFX = som.sfx;
  const pref = Object.assign({ vib: true, q: 'auto', giro: false }, ler(PREF) || {});
  const buzz = p => { if (!pref.vib) return; try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };
  let shakeT = 0, shakeD = 0.3, shakeA = 0; const shake = (a, d = 0.3) => { shakeA = a; shakeD = d; shakeT = d; };
  // confete (flores e folhas na vila que cresce, gotas no olho-d'água): sobe, cai devagar balançando e some
  const confTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 32; const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(16, 16, 14, 8, 0, 0, 7); g.fill(); return new THREE.CanvasTexture(cv); })();
  const bits = [];
  function burst(c, colors, n = 26, sp = 14, up = 18, y0 = 6) { const y = groundY(c[0], c[1]) + y0;
    for (let i = 0; i < n; i++) { const sm = new THREE.Sprite(new THREE.SpriteMaterial({ map: confTex, color: colors[i % colors.length], transparent: true, depthWrite: false })), a = rnd() * 6.283, v = sp * (0.4 + rnd() * 0.6);
      sm.position.set(c[0], y, c[1]); sm.scale.setScalar(1.2 + rnd() * 0.9); sm.material.rotation = rnd() * 6; scene.add(sm);
      bits.push({ s: sm, vx: Math.cos(a) * v, vz: Math.sin(a) * v, vy: up * (0.6 + rnd() * 0.6), spin: (rnd() - 0.5) * 12, t: 0, life: 1.6 + rnd() * 0.8 }); } }
  const FLORES = ['#f2c12e', '#e889b5', '#fff3d6', '#7cc04a', '#e0663f'], GOTAS = ['#7fd4ff', '#bfeaff', '#3f9fd8'], OURO = ['#ffe08a', '#fff6c8', '#f2c12e'];

  // ---------- painel (HTML por cima do mapa)
  // o mínimo à vista (o jogo é de olhar): uma pílula com os números, a peça na mão e, só com uma casa escolhida, "Colocar";
  // explicação só quando se toca (na pílula, numa plaquinha do mapa, na peça)
  const box = document.createElement('div'); box.id = 'jogo'; box.innerHTML = `
    <button type="button" id="placar" aria-label="Placar (toque para entender)"></button>
    <div id="aviso" aria-live="polite"></div>
    <div class="mao"><canvas id="mao" width="132" height="132" aria-label="Peça na mão (toque para girar)"></canvas><canvas id="prox" width="44" height="44" aria-label="Próxima peça"></canvas></div>
    <button type="button" id="colocar" hidden>Colocar</button>`;
  document.body.appendChild(box);
  // ---------- a história do começo: o porquê da água e das vilas, em quatro páginas curtas (aparece na primeira vez)
  const HIST = [
    ['🌱', 'O vale da nascente', 'No meio do Cerrado, uma nascente teima em correr. Em volta dela, umas poucas famílias fizeram casa, roça e curral.'],
    ['💧', 'A água é pouca', 'Cada roça e cada casa encostada no rio bebe um pouco dela, e a água chega primeiro a quem está mais perto da nascente. Quando ela acaba, o resto seca.'],
    ['🏠', 'As vilas pedem', 'As vilas vão pedindo o que falta: água, lavoura, mata, campo para o gado. Atender um pedido traz mais pessoas para o vale e, com elas, novas peças para construir.'],
    ['🌧️', 'Olhos-d\'água e seca', 'Escondidos no Cerrado há olhos-d\'água. Leve o rio até eles para ter mais água. E se prepare: na seca, as nascentes dão a metade.'],
  ];
  const hs = document.createElement('div'); hs.id = 'historia'; hs.setAttribute('role', 'dialog'); hs.setAttribute('aria-modal', 'true'); hs.setAttribute('aria-labelledby', 'hsT');
  hs.innerHTML = '<div class="folha"><div class="ic" id="hsI"></div><h2 id="hsT"></h2><p id="hsP"></p><div class="pts" id="hsD"></div><div class="bt"><button type="button" class="pular" id="hsPular">Pular</button><button type="button" class="ir" id="hsIr">Continuar</button></div></div>';
  document.body.appendChild(hs);
  const hb = document.createElement('button'); hb.type = 'button'; hb.id = 'hsAbre'; hb.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 5.5c3-1.5 6.5-1.5 10 1v13c-3.5-2.5-7-2.5-10-1z"/><path d="M22 5.5c-3-1.5-6.5-1.5-10 1v13c3.5-2.5 7-2.5 10-1z"/></svg>'; hb.setAttribute('aria-label', 'Ler a história do vale'); document.body.appendChild(hb);
  const sb = document.createElement('button'); sb.type = 'button'; sb.id = 'somBtn'; const somTxt = () => { sb.innerHTML = som.on ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M16 9.5l5 5"/><path d="M21 9.5l-5 5"/></svg>'; sb.setAttribute('aria-label', som.on ? 'Desligar o som' : 'Ligar o som'); }; somTxt();
  sb.onclick = () => { som.setOn(!som.on); somTxt(); if (som.on) setTimeout(SFX.sel, 60); }; document.body.appendChild(sb);
  const fm = document.createElement('div'); fm.id = 'fim5'; fm.hidden = true; fm.setAttribute('role', 'dialog'); fm.setAttribute('aria-modal', 'true');
  fm.innerHTML = '<div class="folha"><div class="ic">🌅</div><h2>O vale acolheu</h2><div class="num" id="fimN">0</div><p>pessoas</p><p id="fimS"></p><p id="fimR"></p><button type="button" id="fimJ">Jogar outro vale</button><button type="button" id="fimM" class="m2">Menu</button></div>'; document.body.appendChild(fm);
  let hsI = 0; const KEY = 'afluente:v5:historia';
  function hsShow(i) { if (i) SFX.page(); hsI = i; const [ic, t, x] = HIST[i]; $('hsI').textContent = ic; $('hsT').textContent = t; $('hsP').textContent = x;
    $('hsD').innerHTML = HIST.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join(''); $('hsIr').textContent = i < HIST.length - 1 ? 'Continuar' : 'Começar'; hs.hidden = false; }
  function hsClose() { hs.hidden = true; try { localStorage.setItem(KEY, '1'); } catch (e) {} }
  let seen = false; try { seen = localStorage.getItem(KEY) === '1'; } catch (e) {}
  hs.hidden = true;
  const pk = document.createElement('div'); pk.id = 'pacote5'; pk.hidden = true; pk.setAttribute('role', 'dialog'); pk.setAttribute('aria-modal', 'true');
  pk.innerHTML = '<div class="folha"><h2 id="pkT">A vila cresceu!</h2><p id="pkS"></p><div class="pks" id="pkO"></div></div>'; document.body.appendChild(pk);
  const css = document.createElement('style'); css.textContent = `
    #jogo{pointer-events:none;z-index:5}
    #placar{position:fixed;left:50%;transform:translateX(-50%);top:max(12px,env(safe-area-inset-top));pointer-events:auto;border:0;border-radius:999px;background:rgba(252,250,244,.72);color:var(--ink);
      font:700 14px Nunito,system-ui;padding:6px 14px;min-height:36px;box-shadow:0 2px 12px rgba(0,0,0,.1);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);white-space:nowrap;display:flex;gap:12px;align-items:center}
    #placar b{font:800 17px "Baloo 2",system-ui}#placar .ag{color:#1f6f9a}#placar span{display:inline-flex;gap:3px;align-items:baseline}
    #aviso{position:fixed;left:50%;transform:translateX(-50%);top:calc(max(12px,env(safe-area-inset-top)) + 46px);max-width:min(360px,calc(100vw - 32px));font:700 13.5px/1.35 Nunito,system-ui;color:#fff;text-align:center;
      background:rgba(20,40,38,.55);border-radius:14px;padding:7px 12px;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transition:opacity .4s ease;pointer-events:none}
    #aviso.on{opacity:1}
    #jogo .mao{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(max(14px,env(safe-area-inset-bottom)) + 58px);pointer-events:auto;width:96px;height:96px}
    #jogo canvas#mao{width:96px;height:96px;cursor:pointer;touch-action:none;filter:drop-shadow(0 4px 8px rgba(0,0,0,.25))}
    #jogo canvas#prox{position:absolute;left:calc(100% + 6px);bottom:6px;width:34px;height:34px;opacity:.9;filter:drop-shadow(0 2px 4px rgba(0,0,0,.25))}
    #colocar{position:fixed;left:50%;transform:translateX(-50%);bottom:max(14px,env(safe-area-inset-bottom));pointer-events:auto;border:0;border-radius:999px;background:var(--ink);color:#fff;
      font:800 16px "Baloo 2",system-ui;padding:8px 26px;min-height:44px;box-shadow:0 3px 14px rgba(0,0,0,.22);max-width:calc(100vw - 32px);white-space:nowrap;animation:sobeC .25s cubic-bezier(.2,1.4,.4,1)}
    @keyframes sobeC{from{transform:translate(-50%,24px);opacity:0}to{transform:translate(-50%,0);opacity:1}}
    #colocar[hidden]{display:none}
    #historia{position:fixed;inset:0;display:flex;align-items:flex-end;justify-content:center;padding:16px;background:linear-gradient(to top,rgba(15,35,35,.55),rgba(15,35,35,.05) 60%);z-index:30}
    #historia[hidden]{display:none}
    #historia .folha{width:100%;max-width:440px;background:var(--paper);border-radius:24px;padding:18px 18px 14px;box-shadow:0 10px 34px rgba(0,0,0,.3);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
    #historia .ic{font-size:34px;line-height:1}#historia h2{margin:6px 0 4px;font:800 24px "Baloo 2",system-ui}#historia p{margin:0;font:600 16px/1.45 Nunito,system-ui}
    #historia .pts{display:flex;gap:6px;margin:12px 0 10px}#historia .pts i{width:8px;height:8px;border-radius:50%;background:var(--line)}#historia .pts i.on{background:var(--ink)}
    #historia .bt{display:flex;justify-content:space-between;align-items:center;gap:10px}
    #historia .pular{border:0;background:none;color:var(--ink);opacity:.75;font:700 15px Nunito,system-ui;min-height:44px;padding:0 6px}
    #historia .ir{border:0;border-radius:999px;background:var(--ink);color:#fff;font:800 16px "Baloo 2",system-ui;padding:10px 22px;min-height:44px}
    #hsAbre,#somBtn{position:fixed;top:calc(max(12px,env(safe-area-inset-top)) + 4px);width:32px;height:32px;border:0;background:none;padding:4px;z-index:6;color:#fff;filter:drop-shadow(0 1px 3px rgba(0,0,0,.45));line-height:0;cursor:pointer}
    #hsAbre svg,#somBtn svg{width:24px;height:24px;display:block}
    #hsAbre{right:calc(max(12px,env(safe-area-inset-right)) + 38px)}#somBtn{right:max(10px,env(safe-area-inset-right))}
    #jogo button,#pacote5 button,#historia button,#hsAbre,#somBtn,#fim5 button{transition:transform .08s ease}#jogo button:active,#pacote5 button:active,#historia button:active,#hsAbre:active,#somBtn:active,#fim5 button:active{transform:scale(.93)}
    @keyframes sobe{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}@keyframes pulsa{0%{transform:scale(1)}35%{transform:scale(1.45)}100%{transform:scale(1)}}
    #pacote5 .folha,#historia .folha,#fim5 .folha{animation:sobe .32s cubic-bezier(.2,1.4,.4,1)}#pP{display:inline-block}#pP.pulsa{animation:pulsa .45s ease-out}
    #fim5{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(15,35,35,.35);z-index:25}#fim5[hidden]{display:none}
    #fim5 .folha{width:100%;max-width:380px;text-align:center;background:var(--paper);border-radius:26px;padding:22px 18px 18px;box-shadow:0 10px 34px rgba(0,0,0,.3);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
    #fim5 .ic{font-size:40px}#fim5 h2{margin:4px 0 0;font:800 22px "Baloo 2",system-ui}#fim5 .num{font:800 64px/1.05 "Baloo 2",system-ui}#fim5 p{margin:2px 0 8px;font:700 15px/1.4 Nunito,system-ui}
    #fim5 button{margin-top:8px;border:0;border-radius:999px;background:var(--ink);color:#fff;font:800 17px "Baloo 2",system-ui;padding:12px 24px;min-height:48px}#fim5 button.m2{background:none;color:var(--ink);margin-left:6px}#fimR{font-size:14px;opacity:.8}
    #pacote5{position:fixed;inset:0;display:flex;align-items:flex-end;justify-content:center;background:rgba(20,40,40,.35);z-index:20;padding:12px}
    #pacote5[hidden]{display:none}
    #pacote5 .folha{width:100%;max-width:460px;background:var(--paper);border-radius:22px;padding:16px;box-shadow:0 8px 30px rgba(0,0,0,.25);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
    #pacote5 h2{margin:0 0 4px;font:800 22px "Baloo 2",system-ui}#pacote5 p{margin:0 0 10px;font:700 14px Nunito,system-ui;line-height:1.35}
    #pacote5 .pks{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    #pacote5 button{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 8px;border:2px solid var(--line);border-radius:18px;background:#fff;color:var(--ink);font:800 17px "Baloo 2",system-ui;min-height:44px;cursor:pointer}
    #pacote5 button .t{display:flex;gap:2px}#pacote5 canvas{width:40px;height:40px}
    @media (max-width:520px){#jogo .mao,#jogo canvas#mao{width:84px;height:84px}
      #placar{left:max(12px,env(safe-area-inset-left));transform:none;gap:9px;padding:6px 12px;font-size:13px}#placar b{font-size:16px}.marca{display:none}}`;
  document.head.appendChild(css);
  const $ = id => document.getElementById(id);

  // a peça desenhada como maquete em 3D: o topo inclinado com os seis setores, a lateral de terra, o rio e o que cresce
  // em cima (árvores na mata, telhado na vila, fileiras na lavoura, capim no campo), com luz vinda do alto à esquerda
  function shadeHex(h, k) { const n = parseInt(h.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f(n >> 8 & 255)},${f(n & 255)})`; }
  function drawThumb(cv, e) { const g = cv.getContext('2d'), W = cv.width, H = cv.height, c = W / 2, r = W * 0.43, sq = 0.64, cy = H * 0.43, dep = W * 0.13; g.clearRect(0, 0, W, H);
    const P = (i, yo = 0) => { const a = (-60 * i + 30) * Math.PI / 180; return [c + r * Math.cos(a), cy + r * Math.sin(a) * sq + yo]; };
    const M = (d, k) => { const a = -60 * d * Math.PI / 180; return [c + r * k * Math.cos(a), cy + r * k * Math.sin(a) * sq]; };
    // sombra no chão e lateral (as faces viradas para baixo na tela)
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(c, cy + dep + r * sq * 0.9, r * 0.95, r * sq * 0.35, 0, 0, 7); g.fill();
    for (let d = 0; d < 6; d++) { const am = -60 * d * Math.PI / 180; if (Math.sin(am) < 0.2) continue; const a = P(d), b = P(d + 1);
      g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.lineTo(b[0], b[1] + dep); g.lineTo(a[0], a[1] + dep); g.closePath();
      const lg = g.createLinearGradient(0, Math.min(a[1], b[1]), 0, Math.max(a[1], b[1]) + dep); lg.addColorStop(0, Math.cos(am) > 0 ? '#8a6440' : '#a57a4e'); lg.addColorStop(1, '#5a4030'); g.fillStyle = lg; g.fill();
      g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.lineTo(b[0], b[1] + dep * 0.18); g.lineTo(a[0], a[1] + dep * 0.18); g.closePath(); g.fillStyle = shadeHex(e[d] === 'A' ? COL.G : COL[e[d]], 0.8); g.fill(); }
    // topo: setores com a luz do alto à esquerda
    for (let d = 0; d < 6; d++) { const a = P(d), b = P(d + 1), am = -60 * d * Math.PI / 180, k = 1 + 0.12 * Math.cos(am - 2.4);
      g.beginPath(); g.moveTo(c, cy); g.lineTo(...a); g.lineTo(...b); g.closePath(); g.fillStyle = shadeHex(e[d] === 'A' ? COL.G : COL[e[d]], k); g.fill(); }
    // rio
    const A = e.map((x, d) => x === 'A' ? d : -1).filter(d => d >= 0); g.lineCap = 'round';
    for (const [lw, cl] of [[W * 0.13, '#2d6f96'], [W * 0.09, COL.A], [W * 0.03, '#a9dcf3']]) { g.lineWidth = lw; g.strokeStyle = cl;
      for (const d of A) { const m = M(d, 0.9), t = A.length === 1 ? M(d, 0.3) : [c, cy]; g.beginPath(); g.moveTo(...m); g.lineTo(...t); g.stroke(); } }
    // o que cresce em cada setor (de trás para frente)
    const ord = [0, 1, 2, 3, 4, 5].sort((a, b) => M(a, 0.55)[1] - M(b, 0.55)[1]), u = W / 132;
    for (const d of ord) { const [x, y] = M(d, 0.58), t = e[d];
      if (t === 'B') for (const [ox, oy, s] of [[-7, -2, 1], [6, 2, 0.85], [0, 5, 0.9]]) { const X = x + ox * u, Y = y + oy * u, R = 7 * u * s;
        g.fillStyle = '#5a4030'; g.fillRect(X - u, Y - R * 0.3, 2 * u, R * 0.8); g.fillStyle = '#2f6a2a'; g.beginPath(); g.arc(X, Y - R, R, 0, 7); g.fill(); g.fillStyle = '#5f9a3a'; g.beginPath(); g.arc(X - R * 0.3, Y - R * 1.3, R * 0.55, 0, 7); g.fill(); }
      if (t === 'V') { const X = x, Y = y + 2 * u, w = 13 * u, h = 8 * u; g.fillStyle = '#f2ece0'; g.fillRect(X - w / 2, Y - h, w, h); g.fillStyle = '#3f78b0'; g.fillRect(X - w / 2, Y - 2.4 * u, w, 2.4 * u);
        g.fillStyle = '#b4563a'; g.beginPath(); g.moveTo(X - w / 2 - 2 * u, Y - h); g.lineTo(X, Y - h - 7 * u); g.lineTo(X + w / 2 + 2 * u, Y - h); g.closePath(); g.fill(); g.fillStyle = '#5a3a28'; g.fillRect(X - 1.6 * u, Y - 4.5 * u, 3.2 * u, 4.5 * u); }
      if (t === 'C') { g.strokeStyle = '#8c6a1c'; g.lineWidth = 1.6 * u; for (let j = -2; j <= 2; j++) { g.beginPath(); g.moveTo(x - 8 * u, y + j * 3.2 * u - 2 * u); g.lineTo(x + 8 * u, y + j * 3.2 * u + 2 * u); g.stroke(); } }
      if (t === 'G') { g.strokeStyle = '#4f8a2a'; g.lineWidth = 1.3 * u; for (const [ox, oy] of [[-6, 0], [0, 3], [6, -1]]) for (const k of [-1, 0, 1]) { g.beginPath(); g.moveTo(x + ox * u, y + oy * u); g.lineTo(x + ox * u + k * 2 * u, y + oy * u - 5 * u); g.stroke(); } } }
    g.beginPath(); for (let i = 0; i <= 6; i++) { const p = P(i); i ? g.lineTo(...p) : g.moveTo(...p); } g.lineWidth = Math.max(1.5, W * 0.015); g.strokeStyle = 'rgba(255,255,255,.85)'; g.stroke(); }

  // ---------- etiquetas no mundo (sprites de texto): plaquinhas das vilas, olhos-d'água, "sem água"
  const tags = new THREE.Group(); scene.add(tags);
  function tag(txt, x, y, z, o = {}) { const cv = document.createElement('canvas'), g = cv.getContext('2d'), f = o.size || 44; g.font = `800 ${f}px "Baloo 2", system-ui`;
    const w = Math.ceil(g.measureText(txt).width) + f * 0.9; cv.width = w; cv.height = Math.ceil(f * 1.5); g.font = `800 ${f}px "Baloo 2", system-ui`;
    const r = cv.height / 2; g.fillStyle = o.bg || 'rgba(255,250,236,.94)'; g.beginPath(); g.roundRect(2, 2, w - 4, cv.height - 4, r - 2); g.fill();
    if (o.ring) { g.lineWidth = 4; g.strokeStyle = o.ring; g.stroke(); }
    g.fillStyle = o.fg || '#5a3b12'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, cv.height / 2 + 2);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    // tamanho fixo na tela (como um rótulo de jogo), seja qual for a distância da câmera
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, sizeAttenuation: false })); const hh = (o.k || 1) * 0.04; sp.userData.info = o.info || '';
    sp.scale.set(hh * w / cv.height, hh, 1); sp.position.set(x, y, z); sp.renderOrder = 998; tags.add(sp); return sp; }
  const springG = new THREE.Group(); scene.add(springG);
  const springMat = new THREE.MeshBasicMaterial({ color: 0x7fd4ff, transparent: true, opacity: 0.55, depthWrite: false });
  function drawTags(pv) { for (const o of tags.children) { o.material.map.dispose(); o.material.dispose(); } tags.clear(); springG.clear();
    const W = game.water();
    // vilas: o pedido e, com a peça escolhida, o que ela muda
    const ch = new Map((pv ? pv.vil : []).map(v => [v.id, v]));
    for (const v of S.vilas.values()) { const P = PEDIDOS[v.req.t], c = hexCenter(KQ(v.id), KR(v.id)), cur = game.progress(v), x = ch.get(v.id);
      const falta = PACIENCIA - (v.wait || 0);
      const txt = x && x.after !== x.before ? (x.done ? `${P.icone} ✓ a vila cresce!` : `${P.icone} ${x.before}→${x.after}/${v.req.n}`) : (v.req.t === 'agua' ? `${P.icone} quer água` : `${P.icone} ${cur}/${v.req.n}`) + (falta <= 3 ? ` ⏳${falta}` : '');
      const info = `Vila (nível ${v.lvl}) pede ${P.txt(v.req.n)}${v.req.t === 'agua' ? '' : ` — tem ${cur} de ${v.req.n}`}. Atendida, ganha pessoas, uma casa e peças novas.${falta <= 3 ? ` Está perdendo a paciência: em ${falta} jogada${falta === 1 ? '' : 's'} sem avanço ela troca de pedido.` : ''}`;
      tag(txt, c[0], groundY(c[0], c[1]) + 16, c[1], x && x.done ? { bg: '#3f9a4a', fg: '#fff', info } : { ring: '#e0663f', info }); }
    // olhos-d'água: um poço claro no chão e quanto ele soma
    for (const [k, f] of S.springs) { const c = hexCenter(KQ(k), KR(k)), y = groundY(c[0], c[1]) + 0.3;
      const m = new THREE.Mesh(new THREE.CircleGeometry(4.5, 28).rotateX(-Math.PI / 2), springMat); m.position.set(c[0], y, c[1]); springG.add(m);
      tag(`+${vazao(f, game.isSeca())}💧`, c[0], y + 6, c[1], { bg: 'rgba(225,245,255,.92)', fg: '#1f5f86', k: 0.75, info: `Olho-d'água: leve o rio até ele e a nascente ganha +${vazao(f, game.isSeca())} 💧.` }); }
    // quem gasta água e ficou sem: lavoura e vila secas
    for (const k of W.dry) { const c = hexCenter(KQ(k), KR(k)); tag('🥀', c[0], groundY(c[0], c[1]) + 9, c[1], { bg: 'rgba(224,122,46,.92)', fg: '#fff', k: 0.7, info: 'Sem água: a água da nascente acabou antes de chegar aqui. Ligue um olho-d\'água ou tire gente do rio acima.' }); }
    // a seca chegando: quem vai secar
    if (!game.isSeca() && game.seasonLen() - S.clock <= 3) { const sp = game.secaPreview(); for (const k of sp.dry) if (!W.dry.has(k)) { const c = hexCenter(KQ(k), KR(k)); tag('☀️', c[0], groundY(c[0], c[1]) + 9, c[1], { bg: 'rgba(255,228,204,.92)', fg: '#8a3a0c', k: 0.7, info: 'Vai secar quando a seca chegar: na seca as nascentes dão a metade.' }); } }
  }

  // ---------- casas livres e o fantasma da peça escolhida
  const slotsG = new THREE.Group(); scene.add(slotsG);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide });
  const hotRingMat = new THREE.MeshBasicMaterial({ color: 0xffcf5a, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide });
  const badRingMat = new THREE.MeshBasicMaterial({ color: 0x3a2a22, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
  const fillMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide });
  const hotMat = new THREE.MeshBasicMaterial({ color: 0xffcf5a, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
  const badFillMat = new THREE.MeshBasicMaterial({ color: 0x3a2a22, transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide });
  const hexPts = (c, k = 0.97, lift = 0.25) => [0, 1, 2, 3, 4, 5].map(i => { const a = (-60 * i + 30) * Math.PI / 180, x = c[0] + R * k * Math.cos(a), z = c[1] + R * k * Math.sin(a); return new THREE.Vector3(x, groundY(x, z) + lift, z); });
  // a borda da casa como uma faixa no chão (uma linha de 1 px sumia no celular, ainda mais sobre o chão seco)
  const ringGeo = (c, w) => { const o = hexPts(c, 0.97, 0.3), i = hexPts(c, 0.97 - w / R, 0.3), p = []; for (let k = 0; k < 6; k++) { const k2 = (k + 1) % 6; p.push(...o[k].toArray(), ...o[k2].toArray(), ...i[k2].toArray(), ...o[k].toArray(), ...i[k2].toArray(), ...i[k].toArray()); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); return g; };
  // casas onde a peça na mão ajuda o pedido de uma vila ficam douradas
  function hotSlots() { const hot = new Set(); for (const k of game.slots()) for (const o of game.options(k)) if (o.vil.some(v => v.after > v.before)) { hot.add(k); break; } return hot; }
  // todas as casas da beira aparecem: onde a peça cabe, faixa branca (dourada se ajuda uma vila); onde não cabe em giro nenhum,
  // faixa escura e fina — tocar nela mostra a peça ali com os lados que brigam em vermelho e diz por quê
  let fitN = 0;
  function drawSlots() { slotsG.clear(); const hot = hotSlots(); fitN = 0;
    for (const k of game.slots()) { const ok = game.options(k).length > 0, q = KQ(k), r = KR(k), c = hexCenter(q, r), pts = hexPts(c); if (ok) fitN++;
      slotsG.add(new THREE.Mesh(ringGeo(c, ok ? 1.1 : 0.55), ok ? (hot.has(k) ? hotRingMat : ringMat) : badRingMat));
      const ctr = new THREE.Vector3(c[0], groundY(c[0], c[1]) + 0.2, c[1]), fg = new THREE.BufferGeometry(), fp = []; for (let i = 0; i < 6; i++) fp.push(...ctr.toArray(), ...pts[(i + 1) % 6].toArray(), ...pts[i].toArray());
      fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); const fm = new THREE.Mesh(fg, ok ? (hot.has(k) ? hotMat : fillMat) : badFillMat); fm.userData.slot = { k, q, r, bad: !ok }; slotsG.add(fm); } }
  // a maquete da peça escolhida: uma laje de terra com os seis setores em cima, o rio, árvores, casa e fileiras, flutuando
  // sobre a casa marcada (balança devagar); as marcas verdes/laranja dizem que lado encaixa
  const ghost = new THREE.Group(); scene.add(ghost);
  const MM = {}; const mm = h => MM[h] || (MM[h] = toon({ color: new THREE.Color(h) }));
  const MT = {}; const mmTop = h => MT[h] || (MT[h] = toon({ color: new THREE.Color(h), side: THREE.DoubleSide }));
  const GH = 2.2;   // espessura da laje (m)
  const atY = (o, x, y, z) => { o.position.set(x, y, z); return o; };
  function maquete(e) { const m = new THREE.Group();
    for (let d = 0; d < 6; d++) { const a1 = (-60 * d + 30) * Math.PI / 180, a2 = (-60 * (d + 1) + 30) * Math.PI / 180, k = R * 0.95;
      const top = new THREE.BufferGeometry(); top.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, k * Math.cos(a2), 0, k * Math.sin(a2), k * Math.cos(a1), 0, k * Math.sin(a1)], 3));
      top.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3));   // o topo é plano: a normal aponta para cima
      m.add(new THREE.Mesh(top, mmTop(e[d] === 'A' ? COL.G : COL[e[d]])));
      const side = new THREE.BufferGeometry(), x1 = k * Math.cos(a1), z1 = k * Math.sin(a1), x2 = k * Math.cos(a2), z2 = k * Math.sin(a2);
      side.setAttribute('position', new THREE.Float32BufferAttribute([x1, 0, z1, x2, 0, z2, x2, -GH, z2, x1, 0, z1, x2, -GH, z2, x1, -GH, z1], 3)); side.computeVertexNormals();
      m.add(new THREE.Mesh(side, new THREE.MeshToonMaterial({ color: 0x8a6440, side: THREE.DoubleSide }))); }
    const A = e.map((x, d) => x === 'A' ? d : -1).filter(d => d >= 0);
    for (const d of A) { const [mx, mz] = edgeMid([0, 0], d, A.length === 1 ? 0.9 : 0.92), L = Math.hypot(mx, mz) * (A.length === 1 ? 0.7 : 1), b = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.5, L), mm('#3f8fc0'));
      const ux = mx / Math.hypot(mx, mz), uz = mz / Math.hypot(mx, mz); b.position.set(mx - ux * L / 2, 0.2, mz - uz * L / 2); b.rotation.y = Math.atan2(mx, mz); m.add(b); }
    for (let d = 0; d < 6; d++) { const a = -d * Math.PI / 3, at = (k, da = 0) => [Math.cos(a + da) * R * k, Math.sin(a + da) * R * k];
      if (e[d] === 'B') for (const [k, da, s2] of [[0.55, -0.18, 1], [0.7, 0.16, 0.85], [0.42, 0.2, 0.9]]) { const [x, z] = at(k, da), tr = new THREE.Group();
        tr.add(atY(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, 3, 6), mm('#6b4a32')), 0, 1.5, 0));
        tr.add(atY(new THREE.Mesh(new THREE.IcosahedronGeometry(2.8, 0), mm('#3f7f35')), 0, 4.6, 0));
        tr.position.set(x, 0, z); tr.scale.setScalar(s2); m.add(tr); }
      if (e[d] === 'V') { const [x, z] = at(0.58), h = new THREE.Group(); h.add(atY(new THREE.Mesh(new THREE.BoxGeometry(6, 3.2, 4.6), mm('#f2ece0')), 0, 1.6, 0));
        const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 3.9, 2.4, 4, 1).rotateY(Math.PI / 4).scale(1.1, 1, 0.85), mm('#b4563a')); roof.position.y = 4.4; h.add(roof);
        h.position.set(x, 0, z); h.rotation.y = Math.atan2(-x, -z); m.add(h); }
      if (e[d] === 'C') for (let j = -2; j <= 2; j++) { const [x, z] = at(0.58), row = new THREE.Mesh(new THREE.BoxGeometry(9, 0.9, 0.7), mm('#d9b04a')); row.position.set(x + Math.sin(a) * j * 1.6, 0.45, z - Math.cos(a) * j * 1.6); row.rotation.y = -a; m.add(row); }
      if (e[d] === 'G') for (const da of [-0.25, 0, 0.25]) { const [x, z] = at(0.6, da), tf = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.6, 5), mm('#6aa03a')); tf.position.set(x, 0.8, z); m.add(tf); } }
    m.traverse(o => { if (o.isMesh) o.castShadow = true; }); return m; }
  let gKey = '', gBob = 0, gPrev = null, gSpin = 0, gPop = 1;
  function drawGhost() { if (!sel) { ghost.clear(); gKey = ''; gPrev = null; return; } const c = hexCenter(sel.q, sel.r), o = sel.opts[sel.i], e = o.e, m = o.marks, key = sel.k + ':' + e.join('') + (sel.bad ? ':x' : '');
    if (key !== gKey) { ghost.clear(); gKey = key; const mq = maquete(e); ghost.add(mq); ghost.userData.mq = mq;
      // girou na mesma casa: a maquete nova começa no giro antigo e vira até o novo; casa nova: ela salta para o lugar
      if (gPrev && gPrev.k === sel.k) { let dr = ((o.r - gPrev.r) % 6 + 6) % 6; if (dr > 3) dr -= 6; gSpin = -dr * Math.PI / 3; } else gPop = 0; gPrev = { k: sel.k, r: o.r };
      for (let d = 0; d < 6; d++) if (m[d] !== null) { const [bx, bz] = edgeMid([0, 0], d, 0.97), mk = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.7, 0.8), new THREE.MeshBasicMaterial({ color: m[d] === 'x' ? 0xe0402a : m[d] ? 0x5fd86a : 0xf0a040 }));   /* verde: igual; laranja: terra com terra diferente; vermelho: rio contra terra */
        mk.position.set(bx, 0.2, bz); mk.rotation.y = Math.atan2(Math.cos(-d * Math.PI / 3), -Math.sin(-d * Math.PI / 3)) + Math.PI / 2; mq.add(mk); }
      ghost.position.set(c[0], groundY(c[0], c[1]) + 7, c[1]); ghost.userData.base = groundY(c[0], c[1]) + 7; ghost.scale.setScalar(0.92); } }
  // a maquete que cai: gravidade até o chão, achata no baque, levanta poeira, e só então a peça brota no vale
  const drops = [], dusts = [];
  const dustTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'), rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, 'rgba(226,205,165,.9)'); rg.addColorStop(1, 'rgba(226,205,165,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })();
  function dust(c) { const y = groundY(c[0], c[1]); for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283 + rnd() * 0.4, sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, transparent: true, depthWrite: false, opacity: 0.8 }));
    sp.position.set(c[0] + Math.cos(a) * R * 0.9, y + 1, c[1] + Math.sin(a) * R * 0.9); sp.scale.setScalar(4 + rnd() * 3); scene.add(sp); dusts.push({ sp, vx: Math.cos(a) * (5 + rnd() * 4), vz: Math.sin(a) * (5 + rnd() * 4), vy: 2 + rnd() * 2, t: 0 }); } }
  // ---------- escolher, girar, colocar
  let sel = null;
  // o giro sugerido: o que atende ou avança um pedido, liga um olho-d'água, recebe água e encaixa mais lados
  const ICO = { B: '🌳', C: '🌾', G: '🌿' };
  const value = o => (o.perfect ? 3 : 0) + (o.closes ? o.closes.length * 3 : 0) + o.vil.filter(v => v.done).length * 10 + o.vil.filter(v => v.after > v.before).length * 3 + (o.spring ? 4 : 0) + (o.wetSelf ? 1 : 0) - (o.drySelf ? 2 : 0) - o.lost.length * 2 + o.marks.filter(Boolean).length * 0.5;
  // os giros de uma casa onde a peça não cabe: cada lado com vizinho é igual (verde), terra diferente (laranja) ou rio contra terra (x)
  function tries(k) { const base = game.hand().e, seen = new Set(), out = []; for (let r = 0; r < 6; r++) { const e = rot(base, r), sig = e.join(''); if (seen.has(sig)) continue; seen.add(sig);
      const marks = [], bad = []; for (let d = 0; d < 6; d++) { const n = game.board.get(nbk(k, d)); if (!n) { marks.push(null); continue; } const ne = n.e[opp(d)], x = (e[d] === 'A') !== (ne === 'A');
        marks.push(x ? 'x' : ne === e[d]); if (x) bad.push(e[d] === 'A' ? `o rio da peça bateria em ${NOME[ne]}` : `a peça cortaria o rio do vizinho com ${NOME[e[d]]}`); }
      out.push({ r, e, marks, bad, vil: [], lost: [] }); }
    return out.sort((a, b) => a.bad.length - b.bad.length); }
  function select(k) { if (S.over) return; if (S.escolha.length) { openPack(); return; } const opts = game.options(k);
    if (!opts.length) { const tr = tries(k); SFX.no(); buzz([8, 30, 8]); sel = { k, q: KQ(k), r: KR(k), opts: tr, i: 0, bad: true }; refresh(); badSay(); return; }
    SFX.sel(); buzz(6);
    let bi = 0; opts.forEach((o, i) => { if (value(o) > value(opts[bi])) bi = i; }); sel = { k, q: KQ(k), r: KR(k), opts, i: bi }; refresh();
    dica('marcas', 'Os traços na beira da peça: verde, o lado é igual ao do vizinho; laranja, terra diferente (pode). A plaquinha da vila mostra o que a peça muda. Toque de novo para girar.'); }
  function turn(dir) { if (!sel) { if (!S.over) { SFX.no(); say('Escolha primeiro uma casa marcada: a peça gira lá.'); } return; } SFX.rot(); buzz(4); sel.i = (sel.i + (dir > 0 ? 1 : sel.opts.length - 1)) % sel.opts.length; refresh(); if (sel.bad) badSay(); }
  function badSay() { const o = sel.opts[sel.i], uniq = [...new Set(o.bad)];
    say(`Não cabe aqui em nenhum giro: ${uniq.join('; ')} (lado vermelho). Rio só encosta em rio.${fitN ? ` Ela cabe em ${fitN} casa${fitN === 1 ? '' : 's'} de faixa branca.` : ''}`, 6); }
  let shownP = 0, pAnim = 0;
  function countP() { if (pAnim) return; const step = () => { if (shownP >= S.gente) { pAnim = 0; return; } shownP++; const el = $('pP'); if (el) { el.textContent = shownP; el.classList.remove('pulsa'); void el.offsetWidth; el.classList.add('pulsa'); }
      SFX.count(shownP); pAnim = setTimeout(step, 90); }; pAnim = setTimeout(step, 450); }
  let ambW = 1;
  function flow() { const W = game.water(); let f = 0, u = 0; for (const n of W.nets) { f += n.flow; u += n.used; } return [u, f]; }
  // a miniatura da mão gira com o mapa: a câmera vira em passos de 60°, e a peça é desenhada como vai ficar na tela
  const camK = () => { const gc = window.__previa && window.__previa.gameCam; return gc ? ((Math.round(gc.state.yawK) % 6) + 6) % 6 : 0; }, view = e => rot(e, (6 - camK()) % 6);
  function refresh() { const e = sel ? sel.opts[sel.i].e : game.hand().e; drawThumb($('mao'), view(e));
    if (S.left > 1) { drawThumb($('prox'), view(game.next().e)); $('prox').parentElement.style.visibility = 'visible'; } else $('prox').parentElement.style.visibility = 'hidden';
    const [u, f] = flow(), sec = game.isSeca(); ambW = f ? 0.35 + 0.65 * Math.max(0, 1 - u / f) : 0.35;
    $('placar').innerHTML = `<span>👥 <b id="pP">${shownP}</b></span><span class="ag">💧 <b>${u}/${f}</b></span><span>🧩 <b>${S.left}</b></span><span>${sec ? '☀️' : '🌧️'} <b>${S.clock + 1}/${game.seasonLen()}</b></span>`;
    placarInfo = `${shownP} pessoas no vale · 💧 ${u} de ${f} da água da nascente em uso · 🧩 ${S.left} peça${S.left === 1 ? '' : 's'} na pilha · ${sec ? `☀️ seca: dia ${S.clock + 1} de ${game.seasonLen()}, as nascentes dão a metade` : `🌧️ águas: dia ${S.clock + 1} de ${game.seasonLen()}, depois vem a seca`}`;
    const b = $('colocar');
    if (S.over) { b.hidden = false; b.textContent = 'Fim do vale'; }
    else if (sel && sel.bad) b.hidden = true;
    else if (sel) { const o = sel.opts[sel.i], x = []; if (o.vil.some(v => v.done)) x.push('🏠✓'); if (o.spring) x.push(`+${o.spring}💧`); if (o.perfect) x.push('✨'); for (const c of o.closes || []) x.push(`${ICO[c.type]}+1`); if (o.drySelf || o.lost.length) x.push('🥀');
      b.hidden = false; b.textContent = 'Colocar' + (x.length ? '  ' + x.join(' ') : ''); }
    else b.hidden = true;
    drawGhost(); drawTags(sel && !sel.bad ? sel.opts[sel.i] : null); ST.seca = sec; if (S.gente > shownP) countP(); }
  let sayT = 0, placarInfo = ''; function say(t, sec = 4.5) { const el = $('aviso'); el.textContent = t; el.classList.add('on'); sayT = sec; }
  $('placar').onclick = () => { SFX.page(); say(placarInfo, 6); };
  $('mao').onclick = () => { if (sel) turn(1); else { SFX.page(); say(`Esta é a peça na mão, virada como vai ficar no mapa. Ela cabe em ${fitN} casa${fitN === 1 ? '' : 's'} com faixa branca (dourada: ajuda uma vila). Toque numa delas; toque de novo (ou na peça) para girar.`, 6); } };
  addEventListener('keydown', e => { if (e.key === 'r' || e.key === 'R') turn(1); if (e.key === 'Enter' && sel) commit(); });
  const novoVale = () => { try { localStorage.removeItem(SAVE); } catch (e) {} location.search = '?vale=' + Date.now().toString(36); };
  $('colocar').onclick = () => { if (S.over) { showEnd(); return; } commit(); };
  function commit() { if (!sel || sel.bad || S.over) return; const { k, q, r } = sel, o = sel.opts[sel.i]; const res = game.place(k, o.e); if (!res) return; sel = null; acts.push(['p', k, o.e.join('')]);
    const mq = ghost.userData.mq, c0 = hexCenter(q, r); follow(c0);
    const land = () => { grow(q, r, o.e); dust(c0); SFX.thud(); buzz(18); shake(0.9, 0.28);
      let dl = 0.25; for (const x of res.ev) { const kc = x.k != null ? hexCenter(KQ(x.k), KR(x.k)) : c0;
        if (x.t === 'pedido') { chegam(x.k, growVillage(x.k), x.lvl >= 2 ? 2 : 1); const m = x.txt.match(/\+\d+ pessoas/); floatText(KQ(x.k), KR(x.k), m ? m[0] : `nível ${x.lvl}!`, '#d9ffcf');
          setTimeout(() => { SFX.grow(); buzz([20, 40, 30]); burst(kc, FLORES, 36, 16, 22, 10); shake(0.5, 0.25); }, dl * 1000); dl += 0.35; }
        if (x.t === 'nascente') setTimeout(() => { SFX.water(); burst(kc, GOTAS, 22, 9, 16, 2); floatText(KQ(x.k), KR(x.k), x.txt.match(/\+\d+ 💧/) ? x.txt.match(/\+\d+ 💧/)[0] : '+💧', '#cdefff'); }, dl * 1000);
        if (x.t === 'perfeita') setTimeout(() => { SFX.perfect(); burst(kc, OURO, 18, 8, 14, 3); }, dl * 1000);
        if (x.t === 'fechou') setTimeout(() => { SFX.perfect(); burst(kc, x.type === 'B' ? ['#3f7f35', '#7cc04a', '#2f6a2a'] : x.type === 'C' ? ['#d9b04a', '#f2c12e', '#fff3d6'] : ['#8cbf4a', '#cfe8a0', '#6aa03a'], 22, 10, 16, 4); floatText(KQ(x.k), KR(x.k), `${ICO[x.type]} +1 🧩`, '#fff6c8'); }, dl * 1000);
        if (x.t === 'perfeita') setTimeout(() => floatText(q, r, '✨ +1 🧩', '#fff6c8'), dl * 1000 + 200);
        if (x.t === 'mudou') setTimeout(() => { SFX.page(); floatText(KQ(x.k), KR(x.k), '🔄 pedido novo', '#ffe6c8'); }, dl * 1000);
        if (x.t === 'seca') setTimeout(SFX.dry, 300); if (x.t === 'chuva') setTimeout(SFX.rain, 300); }
      if (S.over && !S.escolha.length) setTimeout(showEnd, 1600); };
    if (mq) { ghost.remove(mq); mq.position.copy(ghost.position); mq.scale.copy(ghost.scale); scene.add(mq); drops.push({ mq, v: 0, y: mq.position.y, floor: groundY(c0[0], c0[1]) + 0.3, land, t: 0 }); }
    else land();
    ghost.clear(); gKey = '';
    const txt = res.ev.map(x => x.txt); if (txt.length) say(txt.join(' · '), 5);
    dicasDepois(res);
    passIfStuck(); salvar();
    drawSlots(); refresh(); if (S.escolha.length) setTimeout(openPack, 1300); }

  // nenhuma casa serve para a peça na mão: ela passa (o relógio das estações anda junto); repete se a próxima também não servir
  function passIfStuck() { let n = 0; const msgs = [];
    while (!S.over && !S.escolha.length && !game.fits() && n++ < 30) { const r = game.skip(); acts.push(['s']); msgs.push('a peça não cabia em lugar nenhum e passou'); if (r) for (const x of r.ev) { msgs.push(x.txt); if (x.t === 'pedido') { chegam(x.k, growVillage(x.k), x.lvl >= 2 ? 2 : 1); SFX.grow(); } } }
    if (msgs.length) { say(msgs.join(' · ')); SFX.no(); }
    if (S.escolha.length && n) setTimeout(openPack, 600); if (S.over && n) setTimeout(showEnd, 900); }
  // ---------- "A vila cresceu!": dois pacotes; o escolhido entra logo depois da peça na mão
  function openPack() { const ch = S.escolha[0]; if (!ch) { pk.hidden = true; return; } $('pkS').textContent = 'O que chega na pilha? As 3 peças entram logo depois da peça na mão.';
    const box = $('pkO'); box.innerHTML = '';
    ch.forEach((p, i) => { const b = document.createElement('button'); b.type = 'button'; b.innerHTML = `<span>${TEMA[p.tema] || p.tema}</span><span class="t"></span>`;
      for (const t of p.tiles) { const c = document.createElement('canvas'); c.width = c.height = 80; drawThumb(c, view(t.e)); b.querySelector('.t').appendChild(c); }
      b.onclick = () => { game.choose(i); acts.push(['c', i]); salvar(); SFX.pack(); buzz(10); pk.hidden = true; if (S.over && !S.escolha.length) setTimeout(showEnd, 600); say(`${TEMA[p.tema] || p.tema}: 3 peças a caminho`); passIfStuck(); drawSlots(); refresh(); if (S.escolha.length) setTimeout(openPack, 300); };
      box.appendChild(b); });
    pk.hidden = false; SFX.open(); }

  // ---------- toque no mapa (sem confundir com arrastar)
  let down = null; const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  dom.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: e.timeStamp }; });
  dom.addEventListener('pointerup', e => { if (!down) return; if (menu.aberto()) { down = null; return; } const mv = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = e.timeStamp - down.t; down = null; if (mv > 8 || dt > 400) return;
    const rc = dom.getBoundingClientRect(); ndc.set((e.clientX - rc.left) / rc.width * 2 - 1, -(e.clientY - rc.top) / rc.height * 2 + 1); ray.setFromCamera(ndc, camera);
    ray.camera = camera; const th = ray.intersectObjects(tags.children, false).find(h => h.object.userData.info); if (th) { SFX.page(); say(th.object.userData.info, 6); return; }
    const hit = ray.intersectObjects(slotsG.children.filter(o => o.isMesh), false)[0]; if (hit) { const s = hit.object.userData.slot; if (sel && sel.k === s.k) turn(1); else select(s.k); } });

  // ---------- a vila cresce: uma casa nova numa peça dela, num lugar livre longe da água
  const WALL = [0xf2ece0, 0xf0d9a8, 0xf4efe6, 0xf3d58a, 0xe8e0f0], BAND = [0x3f78b0, 0x9a4a32, 0x4f8a4a, 0x2f5a9a, 0xa8402e], ROOF = [0xb4563a, 0xa94d34, 0xbd6440];
  function addHouseAt(c, p) { const rotY = Math.atan2(c[0] - p[0], c[1] - p[1]) + (rnd() - 0.5) * 0.4, bi = Math.floor(rnd() * BAND.length);
    const h = { p, rot: rotY, w: 6 + rnd() * 1.4, d: 5 + rnd() * 0.6, wall: WALL[Math.floor(rnd() * WALL.length)], band: BAND[bi], trim: BAND[(bi + 2) % BAND.length], roof: ROOF[Math.floor(rnd() * ROOF.length)], porch: rnd() < 0.3 };
    const o = api.props.addHouse(h); o.userData.house = h; o.traverse(x => x.layers.enable(1)); const dl = -h.w * 0.22, dz = h.d / 2 + 0.9, door = [p[0] + dl * Math.cos(rotY) + dz * Math.sin(rotY), p[1] - dl * Math.sin(rotY) + dz * Math.cos(rotY)];
    if (api.connectPath) api.connectPath(door, 3, 1.0, { p, w: h.w, d: h.d, rot: rotY }); else PATHS.push([door, c]); return o; }   // da porta até a rede de caminhos (world.js)
  function growVillage(id) { const v = S.vilas.get(id) || [...S.vilas.values()].find(x => x.tiles.has(id)); if (!v) return; const ks = [...v.tiles];
    for (let n = 0; n < 40; n++) { const k = ks[Math.floor(rnd() * ks.length)], c = hexCenter(KQ(k), KR(k)), a = rnd() * 6.283, d = R * (0.25 + rnd() * 0.5), p = [c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d];
      if (waterDist(p[0], p[1]) < 6 || api.blocked(p[0], p[1], 1.5) || (api.buildSpot && !api.buildSpot(p[0], p[1], 4.2))) continue; const o = addHouseAt(c, p); if (api.syncCollision) api.syncCollision();   /* casa nova longe de árvore, pedra e roça, e já com colisão */ o.userData.sy = o.scale.y; o.scale.y = 0.02; growing.push({ items: [o], wm: null, t: 0, c }); ring(c); return o.userData.house; } return null; }

  // ---------- gente nova chega a pé à vila que cresceu: vem de fora do vale (do lado oposto ao centro) até a casa nova e
  // fica morando, com uma rotina entre a casa e os lugares de trabalho em volta (roça, beira do rio, campo, mata, vizinhança)
  const towardW = (x, z) => { const e = 0.6, gx = waterDist(x + e, z) - waterDist(x - e, z), gz = waterDist(x, z + e) - waterDist(x, z - e); return Math.atan2(-gx, -gz); };
  function vilaSpots(v) { const out = [], keys = new Set(v.tiles);
    for (const k of v.tiles) for (let d = 0; d < 6; d++) keys.add(K(KQ(k) + DIRS[d][0], KR(k) + DIRS[d][1]));
    for (const t of TILES) { if (!keys.has(K(t.q, t.r))) continue; const e = t.e || api.edgesOf(t);
      for (let d = 0; d < 6; d++) { const ty = e[d], a = -d * Math.PI / 3, at = r => [t.c[0] + Math.cos(a) * R * r, t.c[1] + Math.sin(a) * R * r];
        if (ty === 'A') { for (let r = 0.2; r < 0.95; r += 0.05) { const [x, z] = at(r), w = waterDist(x, z); if (w > 0.7 && w < 1.5) { out.push({ x, z, t: 'A', face: towardW(x, z) }); break; } } }
        else if ('CGBV'.includes(ty)) for (const r of [0.5, 0.4, 0.62, 0.3]) { const [x, z] = at(r); if (waterDist(x, z) > 1.5 && !api.blocked(x, z, 0.7)) { out.push({ x, z, t: ty }); break; } } } }
    return out; }
  function chegam(id, house, n, perto = false) { const g = api.gente; if (!g || !g.arrive) return; const v = S.vilas.get(id) || [...S.vilas.values()].find(x => x.tiles.has(id)); if (!v) return;
    const c = hexCenter(KQ(v.id), KR(v.id)), C0 = api.CENTER || [0, 0]; let dx = c[0] - C0[0], dz = c[1] - C0[1]; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    const spots = vilaSpots(v), door = house ? null : [c[0] + 2, c[1] + 2];
    if (perto) { const h = house, at = h ? [h.p[0] + Math.sin(h.rot) * (h.d / 2 + 1.4), h.p[1] + Math.cos(h.rot) * (h.d / 2 + 1.4)] : door; for (let i = 0; i < n; i++) g.arrive({ from: [at[0] + i * 0.8, at[1]], house, door, spots }); return; }   // reabrindo o vale: já moram lá
    for (let i = 0; i < n; i++) setTimeout(() => { const j = (i - (n - 1) / 2) * 2.2, from = [c[0] + dx * R * 2.4 - dz * j, c[1] + dz * R * 2.4 + dx * j]; g.arrive({ from, house, door, spots }); }, 1200 + i * 1400); }

  // ---------- a peça brota no vale (o mesmo do board3d.js)
  const growing = [];
  function grow(q, r, e) { const c = hexCenter(q, r), t = { q, r, c, e: e.slice(), kind: 'peca', cerrado: rnd() < 0.35 }; TILES.push(t);
    const before = new Set(scene.children);
    const A = e.map((x, d) => x === 'A' ? d : -1).filter(d => d >= 0), j = [c[0] + (rnd() - 0.5) * 4, c[1] + (rnd() - 0.5) * 4];
    const curvePts = (a, b, m) => { const cv = new THREE.CatmullRomCurve3([a, m, b].map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal'); return cv.getSpacedPoints(24).map(v => [v.x, v.z]); };
    if (A.length === 1) { const m0 = edgeMid(c, A[0], 0.9), end = [c[0] + (m0[0] - c[0]) * 0.25, c[1] + (m0[1] - c[1]) * 0.25]; addRiver(curvePts(m0, end, [(m0[0] + end[0]) / 2 + (rnd() - 0.5) * 3, (m0[1] + end[1]) / 2 + (rnd() - 0.5) * 3]), 2.2); }
    else if (A.length === 2) { const a = edgeMid(c, A[0], 0.9), b = edgeMid(c, A[1], 0.9); addRiver(curvePts(a, b, j), 2.6); }
    else for (const d of A) { const a = edgeMid(c, d, 0.9); addRiver(curvePts(a, j, [(a[0] + j[0]) / 2 + (rnd() - 0.5) * 3, (a[1] + j[1]) / 2 + (rnd() - 0.5) * 3]), 2.4); }
    // uma casa por lado de vila: procura um lugar no setor (vários ângulos e distâncias) longe da água e do que já tem ali,
    // para a peça de vila nunca ficar sem casa (antes era uma tentativa só, e às vezes não nascia nenhuma)
    let casas = 0; for (let d = 0; d < 6; d++) if (e[d] === 'V') for (let n = 0; n < 10; n++) { const a = -d * Math.PI / 3 + (rnd() - 0.5) * (0.3 + n * 0.06), k = R * (0.5 + (rnd() - 0.5) * 0.12 * (1 + n * 0.5)), p = [c[0] + Math.cos(a) * k, c[1] + Math.sin(a) * k];
      if (waterDist(p[0], p[1]) < (n < 6 ? 6 : 4) || api.blocked(p[0], p[1], 1.0) || (api.buildSpot && !api.buildSpot(p[0], p[1], 4.2))) continue; addHouseAt(j, p); casas++; break; }
    const gm = api.groundFor(t);
    for (let d = 0; d < 6; d++) { const n = TILES.find(u => u.q === q + DIRS[d][0] && u.r === r + DIRS[d][1]); if (!n || !n.gm) continue;
      const ne = n.e || (api.edgesOf ? api.edgesOf(n) : null); if (e[d] === 'A' || (e[d] === 'C' && ne && ne[(d + 3) % 6] === 'C')) api.groundFor(n); }   // rio que entra no vizinho; lavoura que continua na do vizinho (some a emenda)
    const wm = A.length ? api.waterFor(t) : null; api.fillField(c[0] - R - 2, c[1] - R - 2, c[0] + R + 2, c[1] + R + 2); const gr = api.grassFor(t);
    const inSector = (x, z, type) => inHex(x, z, c, 0.92) && sectorType(t, x, z) === type;
    api.plant(t);   /* árvores, moitas, cupinzeiros e pedras pelo motor de flora (flora.js): o setor de cada borda diz o que nasce, a água traz o buritizal */
    const trees = scene.children.filter(o => !before.has(o) && o.isGroup && (o.userData.kind || o.userData.regua === 'buriti'));
    const crop = ['milho', 'milho', 'girassol', 'trigo'][Math.floor(rnd() * 4)], gap = crop === 'trigo' ? 0.5 : 0.9, step = crop === 'girassol' ? 1.0 : 0.5, pts = [];
    if (e.includes('C')) for (let x = c[0] - R; x < c[0] + R; x += gap) for (let z = c[1] - R; z < c[1] + R; z += step) { const xx = x + (rnd() - 0.5) * 0.08, zz = z + (rnd() - 0.5) * 0.12;
      if (api.fieldAt(xx, zz) > 0.6 && inSector(xx, zz, 'C') && !api.blocked(xx, zz, 0.6)) pts.push([xx, zz]); }
    if (api.mobile) for (let i = pts.length - 1; i > 0; i -= 2) pts.splice(i, 1);
    const cropM = api.props.addCrop(crop, pts);
    const merged = api.mergeTrees(trees);
    api.buildNear();
    if (api.syncCollision) api.syncCollision();   // casas, varandas, troncos, cupinzeiros e pedras da peça nova entram na colisão
    if (gm) gm.userData.soft = true; if (gr) gr.userData.soft = true;
    const items = [gm, ...merged, cropM, gr, ...scene.children.filter(o => !before.has(o) && o.isGroup && ['casa'].includes(o.userData.regua))].filter(Boolean);
    for (const o of items) { o.userData.sy = o.scale.y; o.scale.y = 0.02; } if (wm) wm.visible = false;
    growing.push({ items, wm, t: 0, c });
    ring(c); }
  // a câmera desliza até perto da peça posta (60% do caminho, em ~1 s), para o que acontece ficar à vista
  let camGo = null, lastCamK = 0, fimContado = false;
  function follow(c) { const gc = window.__previa && window.__previa.gameCam; if (!gc) return; const f = gc.state; camGo = { gc, x: f.fx + (c[0] - f.fx) * 0.6, z: f.fz + (c[1] - f.fz) * 0.6, t: 0 }; }
  const rings = [];
  function ring(c) { const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.8, depthWrite: false }));
    m.position.set(c[0], groundY(c[0], c[1]) + 0.5, c[1]); scene.add(m); rings.push({ m, t: 0 }); }
  const floats = [];
  function floatText(q, r, txt, fill = '#fff6c8') { const c = hexCenter(q, r), cv = document.createElement('canvas'); cv.width = 360; cv.height = 96; const g = cv.getContext('2d');
    g.font = '800 64px "Baloo 2", system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 10; g.strokeStyle = 'rgba(20,40,30,.7)'; g.strokeText(txt, 180, 50); g.fillStyle = fill; g.fillText(txt, 180, 50);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false })); const y0 = groundY(c[0], c[1]) + 10;
    sp.scale.set(0.1, 0.1, 1); sp.position.set(c[0], y0, c[1]); sp.renderOrder = 999; scene.add(sp); floats.push({ sp, t: 0, y0 }); }
  // o fim: quantas pessoas o vale acolheu (contando), as vilas, e um vale novo
  function showEnd() { if (!fm.hidden) return; const vs = [...S.vilas.values()], olhos = [...game.board.values()].filter(t => t.src && !t.nasc).length, mx = vs.reduce((a, v) => Math.max(a, v.lvl), 0);
    $('fimS').textContent = `${vs.length} ${vs.length === 1 ? 'vila' : 'vilas'}, a maior no nível ${mx}${olhos ? ` · ${olhos} ${olhos === 1 ? "olho-d'água ligado" : "olhos-d'água ligados"}` : ''}.`;
    { const r = Object.assign({ best: 0, partidas: 0, dia: {} }, ler(REC) || {}); if (!fimContado) { fimContado = true; const novo = S.gente > r.best; r.partidas++; r.best = Math.max(r.best, S.gente);
        if (seed === DIARIO) r.dia[seed] = Math.max(r.dia[seed] || 0, S.gente); gravar(REC, r); try { localStorage.removeItem(SAVE); } catch (e) {}
        $('fimR').textContent = novo && r.partidas > 1 ? '🏆 Novo recorde!' : `🏆 Recorde: ${r.best} pessoas`; } }
    fm.hidden = false; SFX.end(); buzz([30, 60, 30, 60, 60]); const gc = window.__previa && window.__previa.gameCam; if (gc) burst([gc.state.fx, gc.state.fz], FLORES, 60, 24, 28, 14);
    let n = 0; const el = $('fimN'), tgt = S.gente, st = Math.max(1, Math.ceil(tgt / 40)); const tick = () => { n = Math.min(tgt, n + st); el.textContent = n; if (n < tgt) setTimeout(tick, 35); }; tick(); }

  $('hsIr').onclick = () => { if (hsI < HIST.length - 1) hsShow(hsI + 1); else hsClose(); }; $('hsPular').onclick = hsClose; hb.onclick = () => hsShow(0); hb.hidden = true; hb.style.display = 'none';   // a história fica no menu
  addEventListener('keydown', e => { if (!hs.hidden && e.key === 'Escape') hsClose(); });
  { const mp = document.querySelector('.marca p'); if (mp) mp.textContent = 'O vale da nascente'; }
  // ---------- dicas da primeira partida: cada uma aparece uma vez (no aparelho), na hora em que a coisa acontece
  const DICAS = 'afluente:v5:dicas', vistas = new Set(ler(DICAS) || []);
  function dica(id, txt, atraso = 0) { if (vistas.has(id)) return; vistas.add(id); gravar(DICAS, [...vistas]); const f = () => say('💡 ' + txt, 8); atraso ? setTimeout(f, atraso) : f(); }
  function dicasDepois(res) { const W = game.water(), t = res.ev.map(x => x.t), espera = t.length ? 5200 : 0;
    if (t.includes('fechou')) dica('fechou', 'Região fechada: uma mata, lavoura ou campo de 3 peças ou mais que não tem mais lado livre devolve 1 peça à pilha. O botão Colocar mostra antes (🌳+1).', espera);
    else if (t.includes('perfeita')) dica('perfeita', 'Encaixe perfeito: com 3 vizinhos ou mais e todos os lados iguais, a peça devolve 1 à pilha. O botão Colocar mostra ✨ antes.', espera);
    else if (t.includes('pedido')) dica('pedido', 'A vila foi atendida: chegou gente (os pontos) e peças para a pilha. Agora ela pede outra coisa; veja a plaquinha. Vila grande traz mais gente, mas menos peças.', espera);
    else if (t.includes('mudou')) dica('mudou', `Vila sem paciência: ${PACIENCIA} jogadas sem nenhum avanço e ela troca de pedido. O ⏳ na plaquinha avisa antes.`, espera);
    else if (W.dry.size) dica('seco', '🥀 ficou sem água: a vazão da nascente acabou antes de chegar ali. Ligue o rio a um olho-d\'água para ter mais, ou ponha a lavoura mais perto da nascente.', espera);
    else if (!game.isSeca() && game.seasonLen() - S.clock <= 3) dica('seca', `A seca chega em ${game.seasonLen() - S.clock} jogada${game.seasonLen() - S.clock === 1 ? '' : 's'}: as nascentes vão dar a metade, e o que tem ☀️ vai secar.`, espera);
    else if (S.springs.size && acts.length >= 3) dica('olho', 'Os círculos azuis no chão são olhos-d\'água: leve um rio até encostar neles e a nascente ganha a água deles.', espera); }

  // ---------- salvar, reabrir, passar a peça, o menu
  function salvar() { if (S.over) return; gravar(SAVE, { v: 1, seed, acts, gente: S.gente, pilha: S.left, jogadas: acts.filter(a => a[0] !== 'c').length, over: S.over, t: Date.now() }); }
  // (a cada jogada a tela pede a peça na mão e a próxima, e é isso que sorteia a seguinte: aqui também, na mesma ordem)
  function reabre(list) { for (const a of list) { if (S.over) break; let ev = null; game.next();
      if (a[0] === 'p') { const k = a[1], e = a[2].split(''), h = game.hand().e; if (![0, 1, 2, 3, 4, 5].some(r => rot(h, r).join('') === a[2])) break;   // a jogada salva não é a peça da mão: para aqui
        const res = game.place(k, e); if (!res) break; grow(KQ(k), KR(k), e); ev = res.ev; }
      else if (a[0] === 's') { const r = game.skip(); if (!r) break; ev = r.ev; } else if (a[0] === 'c') game.choose(a[1]);
      if (ev) for (const x of ev) if (x.t === 'pedido') chegam(x.k, growVillage(x.k), x.lvl >= 2 ? 2 : 1, true);
      acts.push(a); game.next(); }
    for (const g of growing) { for (const o of g.items) o.scale.y = o.userData.sy; if (g.wm) g.wm.visible = true; } growing.length = 0;   // o vale já está pronto, sem brotar de novo
    for (const r of rings) scene.remove(r.m); rings.length = 0; shownP = S.gente; }
  function passar() { if (S.over || S.escolha.length) return; sel = null; const r = game.skip(); if (!r) return; acts.push(['s']); SFX.no(); const msgs = ['A peça passou'];
    for (const x of r.ev) { msgs.push(x.txt); if (x.t === 'pedido') { chegam(x.k, growVillage(x.k), x.lvl >= 2 ? 2 : 1); SFX.grow(); } }
    say(msgs.join(' · ')); passIfStuck(); salvar(); drawSlots(); refresh(); if (S.escolha.length) setTimeout(openPack, 600); if (S.over && !S.escolha.length) setTimeout(showEnd, 900); }
  const nomeVale = sd => sd === DIARIO ? 'vale do dia' : sd.startsWith('v5-') ? `vale de ${sd.slice(11, 13)}/${sd.slice(8, 10)}` : `vale ${sd.slice(-4)}`;
  const vaPara = sd => { try { localStorage.removeItem(SAVE); } catch (e) {} location.search = '?vale=' + encodeURIComponent(sd); };
  const quality = api.quality;
  const aplica = () => { if (quality) quality.set(pref.q); const gz = document.getElementById('giro'); if (gz) gz.hidden = !pref.giro; gravar(PREF, pref); };
  const menu = createMenu({
    som: n => SFX[n] && SFX[n](),
    estado: () => { const r = ler(REC) || {}, sv = acts.length && !S.over ? { seed, nome: nomeVale(seed), jogadas: acts.filter(a => a[0] !== 'c').length, gente: S.gente } : null;
      return { salva: sv, fim: S.over ? String(S.gente) : '', diario: DIARIO, diarioFeito: r.dia && r.dia[DIARIO], recorde: r.best || 0, partidas: r.partidas || 0,
        atual: { seed, nome: nomeVale(seed), jogadas: acts.filter(a => a[0] !== 'c').length, pilha: S.left, podePassar: !S.over && !S.escolha.length } }; },
    diario: () => vaPara(DIARIO), novo: () => vaPara(Date.now().toString(36)), recomecar: () => vaPara(seed), passar, historia: () => hsShow(0),
    ajustes: () => ({ som: som.on, vib: pref.vib, q: pref.q, giro: pref.giro }),
    ajustar: (k, v) => { if (k === 'som') { som.setOn(v); somTxt(); } else { pref[k] = v; aplica(); if (k === 'vib' && v) buzz(12); } },
    fechou: () => { if (!acts.length && !seen) hsShow(0); else if (!acts.length) say('Toque numa casa com faixa branca para pôr a peça.', 5); } });
  aplica();
  if (retoma) reabre(retoma);
  drawSlots(); refresh();
  // o título some depois de uns segundos (o vale fica sozinho na tela)
  setTimeout(() => { const m = document.querySelector('.marca'); if (m) { m.style.transition = 'opacity 1.6s ease'; m.style.opacity = '0'; } }, 6000);
  $('fimJ').onclick = novoVale; $('fimM').onclick = () => { fm.hidden = true; menu.inicio(); };
  menu.inicio();   // a tela de início, por cima do vale já montado
  return { game, select, turn, commit, sel: () => sel, teste: { grow, reabre }, update(dt) {
    som.ambient(dt, { day: U.uDay.value, rain: U.uRain.value, seca: game.isSeca(), water: ambW });
    for (let i = growing.length - 1; i >= 0; i--) { const g = growing[i]; g.t += dt; const k = Math.min(1, g.t / 1.4), e = 1 - Math.pow(1 - k, 3), sp = 1 - Math.exp(-6 * g.t) * Math.cos(11 * g.t);
      for (const o of g.items) o.scale.y = Math.max(0.02, o.userData.sy * (o.userData.soft || k >= 1 ? e : sp)); if (g.wm && k > 0.45) g.wm.visible = true; if (k >= 1) growing.splice(i, 1); }
    // a maquete caindo (g = 9,8 m/s², um pouco exagerada para ler no mapa) e o baque
    for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; if (!d.hit) { d.v += 32 * dt; d.y -= d.v * dt; d.mq.position.y = d.y;
        if (d.y <= d.floor) { d.hit = true; d.mq.position.y = d.floor; d.land(); } }
      else { d.t += dt; const q = Math.min(1, d.t / 0.35); d.mq.scale.set(d.mq.scale.x, Math.max(0.02, 0.92 * (1 - q) * (1 - 0.35 * Math.sin(q * Math.PI))), d.mq.scale.z); d.mq.position.y = d.floor - q * GH;
        if (q >= 1) { scene.remove(d.mq); d.mq.traverse(o => { if (o.geometry) o.geometry.dispose(); }); drops.splice(i, 1); } } }
    for (let i = dusts.length - 1; i >= 0; i--) { const p = dusts[i]; p.t += dt; p.sp.position.x += p.vx * dt; p.sp.position.z += p.vz * dt; p.sp.position.y += p.vy * dt; p.vx *= 0.94; p.vz *= 0.94; p.vy *= 0.96;
      p.sp.scale.multiplyScalar(1 + dt * 1.4); p.sp.material.opacity = Math.max(0, 0.8 * (1 - p.t / 1.1)); if (p.t > 1.1) { scene.remove(p.sp); p.sp.material.dispose(); dusts.splice(i, 1); } }
    // a maquete flutua devagar sobre a casa escolhida
    if (ghost.children.length && ghost.userData.base != null) { gBob += dt; gSpin *= Math.exp(-dt * 13); gPop = Math.min(3, gPop + dt);
      const pop = 1 - Math.exp(-7 * gPop) * Math.cos(12 * gPop); ghost.scale.setScalar(0.92 * Math.max(0.05, pop));
      ghost.position.y = ghost.userData.base + Math.sin(gBob * 2.2) * 0.5; ghost.rotation.y = gSpin + Math.sin(gBob * 0.9) * 0.03; }
    if (shakeT > 0) { shakeT -= dt; const k = Math.max(0, shakeT / shakeD) ** 2; camera.position.x += (Math.random() - 0.5) * shakeA * k; camera.position.y += (Math.random() - 0.5) * shakeA * k * 0.7; camera.position.z += (Math.random() - 0.5) * shakeA * k; }
    for (let i = bits.length - 1; i >= 0; i--) { const b = bits[i]; b.t += dt; b.vy -= 30 * dt; b.vx *= 0.985; b.vz *= 0.985; if (b.vy < -6) b.vy = -6 + Math.sin(b.t * 8) * 1.5;
      b.s.position.x += b.vx * dt; b.s.position.y += b.vy * dt; b.s.position.z += b.vz * dt; b.s.material.rotation += b.spin * dt; b.s.material.opacity = Math.min(1, (b.life - b.t) * 2);
      if (b.t > b.life) { scene.remove(b.s); b.s.material.dispose(); bits.splice(i, 1); } }
    for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += dt; const s = 1 + r.t * 26; r.m.scale.set(s, 1, s); r.m.material.opacity = Math.max(0, 0.8 * (1 - r.t / 0.9)); if (r.t > 0.9) { scene.remove(r.m); rings.splice(i, 1); } }
    for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.t += dt; const sk = 1 - Math.exp(-8 * f.t) * Math.cos(12 * f.t); f.sp.scale.set(16 * sk, 4.3 * sk, 1); f.sp.position.y = f.y0 + f.t * 3; f.sp.material.opacity = Math.max(0, 1 - f.t / 2.2); if (f.t > 2.2) { scene.remove(f.sp); floats.splice(i, 1); } }
    if (camGo) { const f = camGo.gc.state, k = 1 - Math.exp(-dt * 4); f.fx += (camGo.x - f.fx) * k; f.fz += (camGo.z - f.fz) * k; camGo.t += dt; if (camGo.t > 1.4) camGo = null; }
    fillMat.opacity = 0.08 + 0.06 * Math.sin(performance.now() * 0.004); hotMat.opacity = 0.26 + 0.12 * Math.sin(performance.now() * 0.005);
    ringMat.opacity = 0.7 + 0.25 * Math.sin(performance.now() * 0.004); { const ck = camK(); if (ck !== lastCamK) { lastCamK = ck; refresh(); } }
    if (sayT > 0) { sayT -= dt; if (sayT <= 0) $('aviso').classList.remove('on'); } } };
}
