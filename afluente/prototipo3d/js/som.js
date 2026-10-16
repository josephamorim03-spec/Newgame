// O som do vale, todo sintetizado na hora (sem arquivos): os efeitos do jogo (marimba, gota, baque de madeira) e um fundo
// baixinho que muda com o vale: o murmúrio do rio, passarinho de dia, cigarra na seca, grilo de noite, chiado de chuva.
// O que fazia o som falhar no celular, e como fica aqui:
//  - o navegador só deixa tocar depois de um toque: o áudio é destravado no primeiro toque, clique ou tecla da página
//    (qualquer um, não só o do tabuleiro), retomado a cada toque se o sistema o suspendeu, e de novo ao voltar para a aba;
//  - no iPhone a chave de silencioso cala o Web Audio: pedimos a sessão de "reprodução" (navigator.audioSession, Safari 17)
//    e, onde ela não existe, tocamos em laço um <audio> mudo, que faz o iOS tratar a página como player;
//  - alto-falante de celular não toca grave: todo som tem corpo na faixa média (o baque é madeira, não só um grave).
// window.__som.teste(nome) renderiza um efeito fora da linha (OfflineAudioContext) e devolve pico e RMS, para conferir o volume.
const KEY = 'afluente:som';

// um WAV mudo de 0,1 s (8 kHz, 8 bits), em data URI, para o truque do <audio> no iOS antigo
function silentWav() { const n = 800, b = new Uint8Array(44 + n), v = new DataView(b.buffer), s = (o, t) => { for (let i = 0; i < t.length; i++) b[o + i] = t.charCodeAt(i); };
  s(0, 'RIFF'); v.setUint32(4, 36 + n, true); s(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true);
  v.setUint16(32, 1, true); v.setUint16(34, 8, true); s(36, 'data'); v.setUint32(40, n, true); b.fill(128, 44); let bin = ''; for (const x of b) bin += String.fromCharCode(x); return 'data:audio/wav;base64,' + btoa(bin); }

export function createSom() {
  const AU = { ctx: null, out: null, on: true, unlocked: false, amb: null }; try { AU.on = localStorage.getItem(KEY) !== '0'; } catch (e) {}
  let tag = null;
  function make() { if (AU.ctx) return AU.ctx; const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    try { AU.ctx = new C({ latencyHint: 'interactive' }); } catch (e) { try { AU.ctx = new C(); } catch (e2) { return null; } }
    Object.assign(AU, wire(AU.ctx)); AU.ctx.onstatechange = () => { if (AU.on && AU.unlocked && AU.ctx.state !== 'running' && !document.hidden) AU.ctx.resume().catch(() => {}); }; return AU.ctx; }
  // a saída: volume geral, um compressor para os sons somados não estourarem, e o bus do fundo separado
  function wire(c) { const out = c.createGain(); out.gain.value = 0.9; const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    out.connect(comp); comp.connect(c.destination); const bus = c.createGain(); bus.gain.value = 0; bus.connect(out); return { out, bus }; }
  function unlock() { if (!AU.on) return; const c = make(); if (!c) return;
    try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch (e) {}
    if (!navigator.audioSession && !tag) { tag = document.createElement('audio'); tag.setAttribute('playsinline', ''); tag.setAttribute('x-webkit-airplay', 'deny'); tag.preload = 'auto'; tag.loop = true; tag.src = silentWav(); }
    if (tag && tag.paused) tag.play().catch(() => {});
    if (c.state !== 'running') c.resume().catch(() => {});
    if (!AU.unlocked) { try { const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch (e) {} AU.unlocked = true; startAmbient(); } }
  for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) addEventListener(ev, unlock, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => { if (!AU.ctx) return; if (document.hidden) { AU.ctx.suspend().catch(() => {}); if (tag) tag.pause(); } else if (AU.on && AU.unlocked) { AU.ctx.resume().catch(() => {}); if (tag) tag.play().catch(() => {}); } });

  // ---------- instrumentos. Cada um recebe o contexto e o destino, para o teste poder tocar fora da linha
  let C = null, D = null;   // contexto e destino da vez
  const now = () => C.currentTime;
  function tone(f, t0, dur, type = 'sine', vol = 0.15, slide = 0, att = 0.006) { const t = now() + t0, o = C.createOscillator(), g = C.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(D); o.start(t); o.stop(t + dur + 0.05); }
  let noiseBuf = null; const noise = () => { if (noiseBuf && noiseBuf.sampleRate === C.sampleRate) return noiseBuf; const n = C.sampleRate * 2; noiseBuf = C.createBuffer(1, n, C.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return noiseBuf; };
  function hiss(t0, dur, freq, vol, type = 'bandpass', q = 0.8) { const t = now() + t0, s = C.createBufferSource(), f = C.createBiquadFilter(), g = C.createGain(); s.buffer = noise();
    f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(D); s.start(t, Math.random()); s.stop(t + dur + 0.02); }
  // marimba: fundamental, o 4º harmônico curto (o "toc" da baqueta) e um triângulo no 2º, que dá corpo no alto-falante pequeno
  const marimba = (f, t0, v = 0.2) => { tone(f, t0, 0.5, 'sine', v); tone(f * 2, t0, 0.22, 'triangle', v * 0.22); tone(f * 4, t0, 0.06, 'sine', v * 0.3, 0, 0.002); };
  const SFX = {
    sel: () => marimba(660, 0, 0.32),
    no: () => { tone(260, 0, 0.14, 'square', 0.11, 0.75); tone(196, 0.07, 0.16, 'square', 0.1, 0.8); },
    rot: () => { tone(1100, 0, 0.05, 'triangle', 0.26); hiss(0, 0.06, 3200, 0.35); },
    // baque: madeira (médio, curto) + terra (ruído grave) + o grave por baixo, para quem tem fone
    thud: () => { tone(150, 0, 0.3, 'sine', 0.45, 0.45); tone(420, 0, 0.09, 'triangle', 0.5, 0.6, 0.002); hiss(0, 0.25, 700, 0.8, 'lowpass', 0.7); hiss(0.02, 0.4, 1800, 0.12); },
    water: () => { tone(420, 0, 0.16, 'sine', 0.26, 2.2); tone(640, 0.09, 0.16, 'sine', 0.22, 2.0); tone(900, 0.18, 0.2, 'sine', 0.16, 1.6); hiss(0, 0.35, 2600, 0.06); },
    grow: () => [523.3, 659.3, 784, 1046.5, 1318.5].forEach((f, i) => marimba(f, i * 0.085, 0.2)),
    perfect: () => [784, 1174.7, 1568].forEach((f, i) => marimba(f, i * 0.06, 0.16)),
    open: () => { hiss(0, 0.35, 1400, 0.16); marimba(587.3, 0.05, 0.12); },
    pack: () => { marimba(784, 0, 0.18); marimba(1174.7, 0.08, 0.16); },
    dry: () => { tone(330, 0, 0.6, 'triangle', 0.14, 0.7); tone(247, 0.15, 0.6, 'triangle', 0.1, 0.7); },
    rain: () => { hiss(0, 0.9, 2500, 0.14); marimba(587.3, 0.1, 0.13); marimba(880, 0.25, 0.13); },
    page: () => marimba(880, 0, 0.24), count: (n = 0) => marimba(1046.5 + (n % 5) * 90, 0, 0.13),
    end: () => [392, 523.3, 659.3, 784, 1046.5, 1318.5, 1568].forEach((f, i) => marimba(f, i * 0.11, 0.2)),
  };
  const ready = () => AU.on && AU.unlocked && AU.ctx && AU.ctx.state === 'running';
  const play = (name, arg) => { if (!AU.on) return; if (AU.ctx && AU.ctx.state !== 'running' && AU.unlocked) AU.ctx.resume().catch(() => {}); if (!AU.ctx || !AU.unlocked) return;
    C = AU.ctx; D = AU.out; try { SFX[name](arg); } catch (e) {} };
  const sfx = {}; for (const k of Object.keys(SFX)) sfx[k] = a => play(k, a);

  // ---------- o fundo: rio (ruído filtrado que respira), chuva, e bichos que aparecem de vez em quando
  function startAmbient() { const c = AU.ctx; if (!c || AU.amb) return; const src = c.createBufferSource(); C = c; src.buffer = noise(); src.loop = true;
    const rio = c.createBiquadFilter(); rio.type = 'bandpass'; rio.frequency.value = 520; rio.Q.value = 0.6; const rg = c.createGain(); rg.gain.value = 0.18;
    const ch = c.createBiquadFilter(); ch.type = 'highpass'; ch.frequency.value = 2200; const cg = c.createGain(); cg.gain.value = 0;
    src.connect(rio); rio.connect(rg); rg.connect(AU.bus); src.connect(ch); ch.connect(cg); cg.connect(AU.bus); src.start();
    AU.amb = { rg, cg, rio, next: 1.5, st: { day: 1, rain: 0, seca: false, water: 1 } }; }
  function bird() { const t0 = 0, f = 2400 + Math.random() * 1400, n = 2 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) tone(f * (1 + (i % 2) * 0.12), t0 + i * 0.11, 0.09, 'sine', 0.07, 1.25, 0.004); }
  function bemtevi() { const f = 2100; tone(f, 0, 0.12, 'sine', 0.08, 1.15); tone(f * 1.25, 0.16, 0.1, 'sine', 0.08, 0.9); tone(f * 1.1, 0.3, 0.22, 'sine', 0.08, 0.85); }
  function cigarra() { const t = now(), o = C.createOscillator(), am = C.createOscillator(), ag = C.createGain(), g = C.createGain(), d = 2.5 + Math.random() * 2;
    o.type = 'sawtooth'; o.frequency.value = 4800 + Math.random() * 600; am.frequency.value = 38; ag.gain.value = 0.5; am.connect(ag); ag.connect(g.gain);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.018, t + d * 0.3); g.gain.linearRampToValueAtTime(0.0001, t + d); const f = C.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 5000; f.Q.value = 3;
    o.connect(f); f.connect(g); g.connect(D); o.start(t); am.start(t); o.stop(t + d + 0.05); am.stop(t + d + 0.05); }
  function grilo() { for (let i = 0; i < 3; i++) tone(4200, i * 0.07, 0.04, 'sine', 0.05, 1, 0.003); }
  // chamado pelo jogo a cada quadro: day 0..1, rain 0..1, seca, water (quanto do rio está correndo, 0..1)
  function ambient(dt, st) { const a = AU.amb; if (!a || !ready()) return; C = AU.ctx; D = AU.bus; const k = 1 - Math.exp(-dt * 1.5);
    AU.bus.gain.value += ((AU.on ? 1 : 0) - AU.bus.gain.value) * k;
    a.rg.gain.value += ((0.05 + 0.13 * st.water) * (st.seca ? 0.6 : 1) - a.rg.gain.value) * k; a.cg.gain.value += (st.rain * 0.22 - a.cg.gain.value) * k;
    a.rio.frequency.value = 480 + Math.sin(now() * 0.35) * 90;
    a.next -= dt; if (a.next > 0) return; a.next = 3 + Math.random() * 6; if (st.rain > 0.4) return;
    if (st.day < 0.3) grilo(); else if (st.seca && Math.random() < 0.55) cigarra(); else if (Math.random() < 0.3) bemtevi(); else bird(); }

  function setOn(v) { AU.on = v; try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {}
    if (v) { unlock(); if (AU.ctx) AU.ctx.resume().catch(() => {}); if (tag) tag.play().catch(() => {}); } else { if (AU.bus) AU.bus.gain.value = 0; if (AU.ctx) AU.ctx.suspend().catch(() => {}); if (tag) tag.pause(); } }

  // teste: toca um efeito num contexto fora da linha e mede
  async function teste(name) { const O = new OfflineAudioContext(1, 44100 * 2, 44100), sv = [C, D]; C = O; D = wire(O).out;
    try { SFX[name](); } finally { C = sv[0]; D = sv[1]; } const buf = await O.startRendering(), d = buf.getChannelData(0); let pk = 0, s = 0; for (const x of d) { pk = Math.max(pk, Math.abs(x)); s += x * x; } return { pico: +pk.toFixed(3), rms: +Math.sqrt(s / d.length).toFixed(4) }; }
  const api = { sfx, ambient, setOn, get on() { return AU.on; }, get state() { return AU.ctx ? AU.ctx.state : 'nenhum'; }, get unlocked() { return AU.unlocked; }, teste };
  window.__som = api; return api;
}
