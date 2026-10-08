/* Dice Duel · som e música
 * Tudo é sintetizado com Web Audio: nenhum arquivo de áudio.
 * Intenção (cozy): madeira macia, sininhos de kalimba, acordes de piano elétrico abafado.
 * Nada assusta: até a ruptura é um "plonc" descendente, nunca um estrondo.
 * O jogo só chama Som.tocar(evento) e Som.musica.*; a lógica nunca espera o som.
 */
(function () {
  'use strict';
  const cfg = { som: true, musica: true, volSom: 0.8, volMusica: 0.45 };
  let ctx = null, mestre, busSom, busMusica, reverb, envioReverb;

  // escala pentatônica de dó maior (sempre soa bem, em qualquer ordem)
  const PENTA = [0, 2, 4, 7, 9];
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const notaPenta = (grau, base = 72) => midi(base + PENTA[((grau % 5) + 5) % 5] + 12 * Math.floor(grau / 5));

  function criar() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }
    mestre = ctx.createGain(); mestre.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3;
    mestre.connect(comp).connect(ctx.destination);
    busSom = ctx.createGain(); busSom.connect(mestre);
    busMusica = ctx.createGain(); busMusica.connect(mestre);
    // reverb suave: resposta ao impulso gerada (ruído com decaimento)
    reverb = ctx.createConvolver();
    const dur = 2.4, len = Math.floor(ctx.sampleRate * dur);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    reverb.buffer = ir;
    const voltaReverb = ctx.createGain(); voltaReverb.gain.value = 0.35;
    reverb.connect(voltaReverb).connect(mestre);
    envioReverb = ctx.createGain(); envioReverb.gain.value = 1; envioReverb.connect(reverb);
    aplicarVolumes();
    return true;
  }
  function aplicarVolumes() {
    if (!ctx) return;
    const t = ctx.currentTime;
    busSom.gain.setTargetAtTime(cfg.som ? cfg.volSom : 0, t, 0.05);
    busMusica.gain.setTargetAtTime(cfg.musica ? cfg.volMusica * 0.55 : 0, t, 0.3);
  }
  // o navegador só libera áudio depois de um toque
  function desbloquear() {
    if (!criar()) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (cfg.musica) musica.iniciar();
  }

  // ---------- blocos de som ----------
  function tom({ freq, tipo = 'sine', ini = 0, ataque = 0.005, dur = 0.4, ganho = 0.3, filtro = 0, reverbAmt = 0.25, destino = null, glide = 0 }) {
    if (!ctx) return;
    const t = ctx.currentTime + ini;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo; o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * glide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(ganho, t + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let no = o;
    if (filtro) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filtro; o.connect(f); no = f; }
    no.connect(g);
    const bus = destino || busSom;
    g.connect(bus);
    if (reverbAmt) { const s = ctx.createGain(); s.gain.value = reverbAmt; g.connect(s).connect(envioReverb); }
    o.start(t); o.stop(t + dur + 0.05);
  }
  let ruidoBuf = null;
  function ruido({ ini = 0, dur = 0.08, ganho = 0.2, freq = 2000, q = 1, tipo = 'bandpass', varre = 0, destino = null, reverbAmt = 0.1 }) {
    if (!ctx) return;
    if (!ruidoBuf) {
      ruidoBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = ruidoBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = ctx.currentTime + ini;
    const s = ctx.createBufferSource(); s.buffer = ruidoBuf;
    const f = ctx.createBiquadFilter(); f.type = tipo; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (varre) f.frequency.exponentialRampToValueAtTime(varre, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(ganho, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(destino || busSom);
    if (reverbAmt) { const r = ctx.createGain(); r.gain.value = reverbAmt; g.connect(r).connect(envioReverb); }
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  // kalimba: seno com um parcial alto curto (o "tim" do metal)
  function kalimba(freq, ini = 0, ganho = 0.22, destino = null) {
    tom({ freq, tipo: 'sine', ini, dur: 0.9, ganho, reverbAmt: 0.35, destino });
    tom({ freq: freq * 3.01, tipo: 'sine', ini, dur: 0.12, ganho: ganho * 0.25, reverbAmt: 0.2, destino });
  }
  function madeira(ini = 0, alto = 1) {
    ruido({ ini, dur: 0.045, ganho: 0.35, freq: 1700 * alto, q: 3 });
    tom({ freq: 190 * alto, tipo: 'triangle', ini, dur: 0.09, ganho: 0.25, reverbAmt: 0.05 });
  }

  // ---------- efeitos (intenção de cada um ao lado) ----------
  const SONS = {
    toque: () => tom({ freq: 1320, dur: 0.05, ganho: 0.06, reverbAmt: 0 }),                // interface: confirma o toque
    rolar: () => { for (let i = 0; i < 6; i++) madeira(i * 0.055 + Math.random() * 0.03, 0.8 + Math.random() * 0.5); }, // dados chegando à mesa
    pegar: () => madeira(0, 1.1),                                                            // o dado sai da Mesa
    elo: ({ n = 1 } = {}) => kalimba(notaPenta(n + 2), 0, 0.22),                            // cada elo sobe uma nota: a corrente "canta"
    bolso: () => tom({ freq: 520, glide: 0.55, dur: 0.12, ganho: 0.18, tipo: 'sine', reverbAmt: 0.1 }), // guardar no bolso: "pop" macio
    troca: () => { tom({ freq: 420, glide: 1.5, dur: 0.1, ganho: 0.15 }); tom({ freq: 640, glide: 0.6, ini: 0.07, dur: 0.12, ganho: 0.15 }); },
    disparo: ({ L = 3 } = {}) => {                                                           // recompensa: arpejo que cresce com a corrente
      for (let i = 0; i < L + 1; i++) kalimba(notaPenta(i + 2), i * 0.07, 0.2);
      const acorde = [60, 64, 67, 71].map(midi);
      acorde.forEach((f, k) => tom({ freq: f, tipo: 'triangle', ini: (L + 1) * 0.07, ataque: 0.04, dur: 1.4 + L * 0.15, ganho: 0.07, filtro: 2200, reverbAmt: 0.5 }));
      if (L >= 5) for (let i = 0; i < 6; i++) tom({ freq: notaPenta(10 + i, 72), ini: 0.45 + i * 0.05, dur: 0.5, ganho: 0.06, reverbAmt: 0.6 });
    },
    ruptura: () => {                                                                          // perda gentil: "plonc" descendente, sem susto
      tom({ freq: midi(67), tipo: 'triangle', dur: 0.35, ganho: 0.16, filtro: 1400, glide: 0.9 });
      tom({ freq: midi(62), tipo: 'triangle', ini: 0.16, dur: 0.6, ganho: 0.16, filtro: 1100, glide: 0.85 });
      ruido({ ini: 0.02, dur: 0.25, ganho: 0.06, freq: 600, tipo: 'lowpass' });
    },
    salvo: () => { kalimba(notaPenta(5), 0, 0.18); kalimba(notaPenta(7), 0.09, 0.18); },      // ruptura evitada: alívio
    carta: () => ruido({ dur: 0.22, ganho: 0.12, freq: 900, varre: 4500, q: 0.7 }),          // carta virando: papel
    armou: () => { [84, 88, 91].forEach((n, i) => tom({ freq: midi(n), ini: i * 0.06, dur: 0.6, ganho: 0.05, reverbAmt: 0.7 })); }, // segredo guardado: brilho curto
    revelou: () => {                                                                          // armadilha disparou: "tchã-rã" mágico, curioso
      tom({ freq: midi(76), glide: 1.5, dur: 0.25, ganho: 0.08 });
      [79, 83, 86, 91].forEach((n, i) => kalimba(midi(n), 0.12 + i * 0.06, 0.13));
    },
    virar: () => ruido({ dur: 0.18, ganho: 0.1, freq: 500, varre: 2500, q: 0.8 }),
    momento: () => { kalimba(notaPenta(8), 0, 0.14); kalimba(notaPenta(10), 0.08, 0.12); },  // "bom momento": sininho de recompensa
    bloqueio: () => { madeira(0, 0.7); kalimba(notaPenta(4), 0.05, 0.15); },
    vitoria: () => {                                                                          // vitória: fanfarra pequena e calorosa
      [0, 2, 4, 5, 7].forEach((g, i) => kalimba(notaPenta(g + 2), i * 0.11, 0.22));
      [60, 64, 67, 72].map(midi).forEach(f => tom({ freq: f, tipo: 'triangle', ini: 0.6, ataque: 0.05, dur: 2.4, ganho: 0.07, filtro: 2400, reverbAmt: 0.6 }));
    },
    derrota: () => {                                                                          // derrota: "ah, quase", acolhedor
      kalimba(notaPenta(5), 0, 0.16); kalimba(notaPenta(3), 0.22, 0.16); kalimba(notaPenta(2), 0.44, 0.18);
      [57, 60, 64].map(midi).forEach(f => tom({ freq: f, tipo: 'triangle', ini: 0.5, ataque: 0.08, dur: 2, ganho: 0.06, filtro: 1500, reverbAmt: 0.6 }));
    },
    falaRival: () => { [0, 1, 2].forEach(i => tom({ freq: 520 + Math.random() * 260, ini: i * 0.07, dur: 0.06, ganho: 0.04, tipo: 'triangle', reverbAmt: 0.05 })); }, // "blá-blá" fofinho
  };
  function tocar(nome, dados) {
    if (!cfg.som || !ctx || ctx.state !== 'running') return;
    const f = SONS[nome]; if (f) try { f(dados); } catch (e) { /* som nunca derruba o jogo */ }
  }

  // ---------- música: lo-fi aconchegante gerada na hora ----------
  // Cmaj7 – Am7 – Fmaj7 – G6, 72 bpm. Camadas: piano elétrico abafado, baixo, kalimba que passeia, chiado de vinil.
  const ACORDES = [[48, [60, 64, 67, 71]], [45, [57, 60, 64, 67]], [41, [57, 60, 64, 65]], [43, [55, 59, 62, 64]]];
  const musica = (() => {
    let tocando = false, timer = null, prox = 0, passo = 0, intens = 0.3, grauMel = 4;
    const BPM = 72, colcheia = 60 / BPM / 2;
    function agendar() {
      if (!ctx) return;
      while (prox < ctx.currentTime + 0.4) {
        const compasso = Math.floor(passo / 8) % ACORDES.length, noCompasso = passo % 8;
        const [baixo, acorde] = ACORDES[compasso];
        const ini = prox - ctx.currentTime;
        if (noCompasso === 0) {
          acorde.forEach((n, i) => tom({ freq: midi(n), tipo: 'triangle', ini: ini + i * 0.012, ataque: 0.03, dur: colcheia * 7.5, ganho: 0.045, filtro: 1200 + intens * 900, reverbAmt: 0.45, destino: busMusica }));
          tom({ freq: midi(baixo), tipo: 'sine', ini, ataque: 0.02, dur: colcheia * 3.6, ganho: 0.12, reverbAmt: 0.05, destino: busMusica });
        }
        if (noCompasso === 4) tom({ freq: midi(baixo + 7), tipo: 'sine', ini, ataque: 0.02, dur: colcheia * 3, ganho: 0.08, reverbAmt: 0.05, destino: busMusica });
        // kalimba passeando pela pentatônica (mais notas quando a partida esquenta)
        if (Math.random() < 0.22 + intens * 0.25 && noCompasso !== 0) {
          grauMel = Math.max(2, Math.min(11, grauMel + [-2, -1, 1, 1, 2][Math.floor(Math.random() * 5)]));
          kalimba(notaPenta(grauMel, 60), ini, 0.07 + intens * 0.03, busMusica);
        }
        // escovinha suave nos contratempos, só quando a partida esquenta
        if (intens > 0.55 && noCompasso % 2 === 1) ruido({ ini, dur: 0.05, ganho: 0.025, freq: 7000, tipo: 'highpass', destino: busMusica, reverbAmt: 0 });
        // chiado de vinil
        if (Math.random() < 0.3) ruido({ ini: ini + Math.random() * colcheia, dur: 0.012, ganho: 0.02, freq: 3000, q: 0.5, destino: busMusica, reverbAmt: 0 });
        prox += colcheia; passo++;
      }
    }
    return {
      iniciar() {
        if (tocando || !ctx || !cfg.musica) return;
        tocando = true; prox = ctx.currentTime + 0.1; passo = 0;
        timer = setInterval(agendar, 120);
      },
      parar() { tocando = false; clearInterval(timer); timer = null; },
      intensidade(x) { intens = Math.max(0, Math.min(1, x)); },
      get tocando() { return tocando; },
    };
  })();

  function configurar(novo) {
    Object.assign(cfg, novo);
    if (!ctx) return;
    aplicarVolumes();
    if (cfg.musica && ctx.state === 'running') musica.iniciar();
    if (!cfg.musica) musica.parar();
  }
  // pausa tudo quando a aba some (economiza bateria no celular)
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else if (cfg.som || cfg.musica) ctx.resume();
  });

  window.Som = { cfg, desbloquear, tocar, musica, configurar };
})();
