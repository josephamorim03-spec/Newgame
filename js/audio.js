/* Dice Duel · som e música
 * Tudo é sintetizado com Web Audio: nenhum arquivo de áudio (abre por file://, no HTML único e na Vercel sem
 * pedido extra de rede). Intenção (cozy): dados de resina num feltro, kalimba, piano elétrico abafado, fita velha.
 * Nada assusta: até a ruptura é um punhado de dados rolando para longe e duas notas descendo.
 *
 * A música e os efeitos dividem um relógio harmônico: cada nota de efeito (elo, disparo, sininho, contagem)
 * sai do acorde que está tocando agora, então a corrente "canta" dentro da trilha.
 * O jogo só chama Som.tocar(evento, dados), Som.musica.* e Som.abafar(); a lógica nunca espera o som.
 */
(function () {
  'use strict';
  const cfg = { som: true, musica: true, volSom: 0.8, volMusica: 0.45 };
  let ctx = null, mestre, busSom, busMusica, duckMus, abafa, envioReverb, wow;

  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const sorte = (a, b) => a + Math.random() * (b - a);
  const escolhe = l => l[Math.floor(Math.random() * l.length)];

  // ---------- montagem ----------
  function montar(c) {
    ctx = c;
    mestre = ctx.createGain(); mestre.gain.value = 0.85;
    // limitador: os disparos grandes somam muitas vozes; nada estoura no alto-falante do celular
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -10; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.2;
    mestre.connect(lim).connect(ctx.destination);
    busSom = ctx.createGain(); busSom.connect(mestre);
    // música: duck (abaixa sob os efeitos grandes) → abafa (passa-baixa quando uma janela abre) → volume
    busMusica = ctx.createGain(); busMusica.connect(mestre);
    abafa = ctx.createBiquadFilter(); abafa.type = 'lowpass'; abafa.frequency.value = 18000; abafa.Q.value = 0.5;
    duckMus = ctx.createGain(); duckMus.connect(abafa).connect(busMusica);
    // sala pequena de madeira: resposta ao impulso gerada, cauda que escurece com o tempo
    const reverb = ctx.createConvolver();
    const dur = 2.2, len = Math.floor(ctx.sampleRate * dur), pre = Math.floor(ctx.sampleRate * 0.012);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch); let lp = 0;
      for (let i = pre; i < len; i++) {
        const k = (i - pre) / (len - pre);
        const a = 0.55 + 0.4 * k;                       // o filtro fecha ao longo da cauda: os agudos somem antes
        lp = lp * a + (Math.random() * 2 - 1) * (1 - a);
        d[i] = lp * Math.pow(1 - k, 2.6) * 2.2;
      }
    }
    reverb.buffer = ir;
    const volta = ctx.createGain(); volta.gain.value = 0.32;
    reverb.connect(volta).connect(mestre);
    envioReverb = ctx.createGain(); envioReverb.connect(reverb);
    // fita: um vibrato lento e raso em todas as notas da música (o "wow" do lo-fi)
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.42;
    wow = ctx.createGain(); wow.gain.value = 7;          // cents
    lfo.connect(wow); lfo.start();
    aplicarVolumes();
  }
  // iPhone: sem isto o Web Audio fica na categoria "ambient" e some com a chave de silêncio ligada
  // (no computador toca, no celular não). "playback" toca como um vídeo; com som e música desligados volta ao padrão.
  function sessao() {
    try {
      const s = navigator.audioSession, tipo = cfg.som || cfg.musica ? 'playback' : 'auto';
      if (s && s.type !== tipo) s.type = tipo;
    } catch (e) {}
  }
  function criar() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    sessao();                                            // antes do contexto existir: o iPhone fixa a categoria ao começar
    try { montar(new AC({ latencyHint: 'interactive' })); } catch (e) { ctx = null; return false; }
    return true;
  }
  function aplicarVolumes() {
    if (!ctx) return;
    const t = ctx.currentTime;
    busSom.gain.setTargetAtTime(cfg.som ? cfg.volSom : 0, t, 0.05);
    busMusica.gain.setTargetAtTime(cfg.musica ? cfg.volMusica * 0.6 : 0, t, 0.3);
  }
  // o navegador só libera áudio depois de um toque; o iPhone também usa "interrupted" (depois de uma ligação)
  function desbloquear() {
    if (!criar()) return;
    sessao();
    if (ctx.state !== 'running' && ctx.state !== 'closed') {
      // o Safari só destrava de vez quando algo toca dentro do toque: uma amostra de silêncio basta
      try { const b = ctx.createBufferSource(); b.buffer = ctx.createBuffer(1, 1, ctx.sampleRate); b.connect(ctx.destination); b.start(0); } catch (e) {}
      ctx.resume().catch(() => {});
    }
    if (cfg.musica) musica.iniciar();
  }
  // música abaixa um pouco sob um efeito grande e volta sozinha
  function duck(quanto = 0.5, volta = 0.9) {
    if (!ctx) return;
    const t = ctx.currentTime, g = duckMus.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(1 - quanto, t + 0.04);
    g.setTargetAtTime(1, t + 0.15, volta / 3);
  }
  function abafar(sim) {
    if (!ctx) return;
    abafa.frequency.setTargetAtTime(sim ? 650 : 18000, ctx.currentTime, sim ? 0.08 : 0.18);
  }

  // ---------- relógio harmônico ----------
  // [baixo, voicing do piano, notas do acorde (classes, 0 = dó)]
  const AC_ = {
    Cmaj9: [36, [64, 67, 71, 74], [0, 4, 7, 11, 2]],
    Am9:   [45, [60, 64, 67, 71], [9, 0, 4, 7, 11]],
    Fmaj9: [41, [57, 60, 64, 67], [5, 9, 0, 4, 7]],
    G69:   [43, [59, 62, 64, 69], [7, 11, 2, 4, 9]],
    Em7:   [40, [59, 62, 64, 67], [4, 7, 11, 2]],
    Dm9:   [38, [57, 60, 64, 65], [2, 5, 9, 0, 4]],
    E7sus: [40, [59, 62, 64, 69], [4, 9, 11, 2]],
    Fmaj7: [41, [57, 60, 64, 69], [5, 9, 0, 4]],
  };
  // cenas: começo calmo, partida com groove, reta final (alguém perto da meta) e o fim
  const CENAS = {
    menu:   { bpm: 66, partes: [['Cmaj9', 'Am9', 'Fmaj9', 'G69']] },
    jogo:   { bpm: 76, partes: [['Cmaj9', 'Am9', 'Fmaj9', 'G69'], ['Fmaj9', 'Em7', 'Dm9', 'G69']] },
    final:  { bpm: 82, partes: [['Am9', 'Fmaj9', 'Dm9', 'E7sus'], ['Am9', 'Fmaj7', 'Dm9', 'G69']] },
    fim:    { bpm: 60, partes: [['Fmaj9', 'Cmaj9']] },
  };
  const PENTA = [0, 2, 4, 7, 9];
  let acordeAgora = null;                              // o acorde que está soando (a música atualiza)
  const classes = () => (acordeAgora ? AC_[acordeAgora][2] : PENTA);
  // grau 0, 1, 2… sobe pelas notas do acorde a partir de 'base' (sempre consonante com a trilha)
  function notaAcorde(grau, base = 72) {
    const cl = classes().map(c => ((c - base) % 12 + 12) % 12).sort((a, b) => a - b);
    const oit = Math.floor(grau / cl.length), i = ((grau % cl.length) + cl.length) % cl.length;
    return midi(base + cl[i] + 12 * oit);
  }

  // ---------- blocos de som ----------
  let ruidoBuf = null;
  const ruido = () => {
    if (!ruidoBuf) {
      ruidoBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = ruidoBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return ruidoBuf;
  };
  function enviar(no, quanto) { if (quanto) { const s = ctx.createGain(); s.gain.value = quanto; no.connect(s).connect(envioReverb); } }
  function pan(no, x) {
    if (!x || !ctx.createStereoPanner) return no;
    const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, x)); no.connect(p); return p;
  }
  function tom({ freq, tipo = 'sine', ini = 0, ataque = 0.005, dur = 0.4, ganho = 0.3, filtro = 0, reverbAmt = 0.25, destino = null, glide = 0, x = 0, fita = false }) {
    if (!ctx) return;
    const t = ctx.currentTime + Math.max(0, ini);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo; o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * glide), t + dur);
    if (fita) wow.connect(o.detune);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(ganho, t + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let no = o;
    if (filtro) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filtro; o.connect(f); no = f; }
    no.connect(g);
    pan(g, x).connect(destino || busSom);
    enviar(g, reverbAmt);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function chiado({ ini = 0, dur = 0.08, ganho = 0.2, freq = 2000, q = 1, tipo = 'bandpass', varre = 0, destino = null, reverbAmt = 0.1, ataque = 0, x = 0 }) {
    if (!ctx) return;
    const t = ctx.currentTime + Math.max(0, ini);
    const s = ctx.createBufferSource(); s.buffer = ruido();
    const f = ctx.createBiquadFilter(); f.type = tipo; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (varre) f.frequency.exponentialRampToValueAtTime(varre, t + dur);
    const g = ctx.createGain();
    if (ataque) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(ganho, t + ataque); }
    else g.gain.setValueAtTime(ganho, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g);
    pan(g, x).connect(destino || busSom);
    enviar(g, reverbAmt);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  // dado de resina batendo: um estalo curtíssimo que faz soar três ressonâncias do dado + o baque do feltro
  function impacto({ ini = 0, forca = 1, brilho = 1, feltro = 1, x = 0 }) {
    if (!ctx) return;
    const t = ctx.currentTime + Math.max(0, ini);
    const s = ctx.createBufferSource(); s.buffer = ruido();
    const env = ctx.createGain();
    env.gain.setValueAtTime(forca, t); env.gain.exponentialRampToValueAtTime(0.0001, t + 0.01);
    s.connect(env);
    const sai = ctx.createGain(); sai.gain.value = 2;
    const k = sorte(0.92, 1.1) * brilho;
    for (const [f, q, gn] of [[2150, 9, 1], [3480, 12, 0.7], [5300, 14, 0.45]]) {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * k; bp.Q.value = q;
      const gg = ctx.createGain(); gg.gain.value = gn * 2.2;
      env.connect(bp).connect(gg).connect(sai);
    }
    if (feltro) {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320; lp.Q.value = 2;
      const gg = ctx.createGain(); gg.gain.value = 2.4 * feltro;
      env.connect(lp).connect(gg).connect(sai);
    }
    pan(sai, x).connect(busSom);
    enviar(sai, 0.12);
    s.start(t, Math.random() * 0.8); s.stop(t + 0.06);
  }
  // um dado caindo e quicando: os quiques ficam mais curtos e mais fracos (bola quicando)
  function quicar(ini, forca = 1, x = 0, quiques = 3, gap0 = 0) {
    let t = ini, gap = gap0 || sorte(0.09, 0.12), f = forca;
    for (let k = 0; k <= quiques; k++) {
      impacto({ ini: t, forca: f, brilho: sorte(0.95, 1.08), feltro: k === 0 ? 1 : 0.5, x });
      t += gap; gap *= 0.62; f *= 0.45;
    }
  }
  // kalimba: seno com um parcial alto curto (o "tim" da lâmina de metal)
  function kalimba(freq, ini = 0, ganho = 0.22, destino = null, x = 0) {
    tom({ freq, ini, dur: 1.0, ganho, reverbAmt: 0.35, destino, x, fita: !!destino });
    tom({ freq: freq * 3.01, ini, dur: 0.1, ganho: ganho * 0.22, reverbAmt: 0.2, destino, x });
    tom({ freq: freq * 5.4, ini, dur: 0.04, ganho: ganho * 0.08, reverbAmt: 0, destino, x });
  }
  // piano elétrico: FM com índice que cai rápido (o "tine" do Rhodes) e um passa-baixa morno
  function pianoEl(freq, ini, dur, ganho, destino = busSom, brilho = 1) {
    if (!ctx) return;
    const t = ctx.currentTime + Math.max(0, ini);
    const car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
    car.frequency.value = freq; mod.frequency.value = freq;
    wow.connect(car.detune); wow.connect(mod.detune);
    mg.gain.setValueAtTime(freq * 2.2 * brilho, t); mg.gain.exponentialRampToValueAtTime(freq * 0.25, t + 0.35);
    mod.connect(mg).connect(car.frequency);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1500 + 900 * brilho;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(ganho, t + 0.012);
    g.gain.exponentialRampToValueAtTime(ganho * 0.45, t + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    car.connect(f).connect(g).connect(destino);
    enviar(g, 0.3);
    car.start(t); mod.start(t); car.stop(t + dur + 0.05); mod.stop(t + dur + 0.05);
  }
  // moeda: parciais inarmônicos de metal pequeno
  function moedinha(freq, ini, ganho = 0.05) {
    tom({ freq, ini, dur: 0.22, ganho, reverbAmt: 0.25 });
    tom({ freq: freq * 2.76, ini, dur: 0.12, ganho: ganho * 0.5, reverbAmt: 0.2 });
    tom({ freq: freq * 5.4, ini, dur: 0.05, ganho: ganho * 0.25, reverbAmt: 0 });
  }
  // papel: carta deslizando / virando
  const papel = (ini = 0, sobe = true, ganho = 0.1) => chiado({ ini, dur: 0.16, ganho, freq: sobe ? 700 : 3200, varre: sobe ? 3600 : 800, q: 0.8, ataque: 0.02, reverbAmt: 0.08 });

  // ---------- efeitos (intenção de cada um ao lado) ----------
  const SONS = {
    toque: () => { tom({ freq: 1500, dur: 0.04, ganho: 0.07, reverbAmt: 0 }); tom({ freq: 750, dur: 0.05, ganho: 0.05, reverbAmt: 0 }); }, // botão: clique de madeira fino
    passar: ({ i = 0 } = {}) => tom({ freq: notaAcorde(i + 7, 72), dur: 0.08, ganho: 0.04, reverbAmt: 0.15, x: (i - 2) * 0.25 }),     // mouse por cima de um dado
    rolar: ({ n = 5, atraso = 0.07, queda = 0.27 } = {}) => {                                       // dados chegando à mesa, cada um no seu tempo (bate com a animação .novo do CSS)
      chiado({ dur: 0.35, ganho: 0.05, freq: 900, q: 0.6, ataque: 0.05, reverbAmt: 0 });            // a mão chacoalhando
      for (let i = 0; i < n; i++) quicar(queda + i * atraso, sorte(0.35, 0.5), (i - (n - 1) / 2) * 0.3, 2, 0.2);
    },
    // a rolagem 3D (js/rolagem.js): cada batida gravada soa no quadro em que acontece; forca = impulso da física
    // (lados/s), x = posição da casa no estéreo
    quique: ({ forca = 8, primeira = false, x = 0 } = {}) =>                                        // dado no feltro: o 1º pouso tem corpo, os seguintes se acomodam
      impacto({ forca: Math.min(0.6, Math.max(0.05, forca / (primeira ? 30 : 40))), brilho: sorte(0.95, 1.06), feltro: primeira ? 1 : 0.45, x }),
    choque: ({ forca = 3, x = 0 } = {}) => {                                                        // dado contra dado: estalo seco, sem grave
      impacto({ forca: Math.min(0.5, Math.max(0.06, forca / 14)), brilho: sorte(1.2, 1.4), feltro: 0, x });
      if (Math.random() < 0.5) impacto({ ini: sorte(0.012, 0.028), forca: Math.min(0.25, forca / 30), brilho: sorte(1.3, 1.5), feltro: 0, x });
    },
    aro: ({ forca = 4, x = 0 } = {}) => impacto({ forca: Math.min(0.4, forca / 25), brilho: 0.75, feltro: 0.3, x }),  // dado na borda de madeira da mesa
    escolher: ({ n = 0, x = 0 } = {}) => {                                                          // escolheu um dado que sincroniza: a nota que ele vai somar, bem baixinho
      impacto({ forca: 0.2, brilho: 1.15, feltro: 0, x });
      tom({ freq: notaAcorde(n + 1), dur: 0.35, ganho: 0.05, reverbAmt: 0.35, x });
    },
    perigo: ({ x = 0 } = {}) => {                                                                   // escolheu um dado que rompe: "hm-hm" grave e macio, um aviso, não uma bronca
      impacto({ forca: 0.2, brilho: 0.8, feltro: 0.6, x });
      tom({ freq: 196, tipo: 'triangle', dur: 0.16, ganho: 0.07, filtro: 700, reverbAmt: 0.05 });
      tom({ freq: 185, tipo: 'triangle', ini: 0.14, dur: 0.22, ganho: 0.07, filtro: 600, reverbAmt: 0.1 });
    },
    pegar: () => { impacto({ forca: 0.8, brilho: 1.1, feltro: 0.3 }); chiado({ ini: 0.02, dur: 0.12, ganho: 0.03, freq: 1500, varre: 3000, q: 0.7 }); }, // o dado sai do feltro
    elo: ({ n = 1 } = {}) => {                                                                       // dado assenta na corrente e soma uma nota do acorde: a corrente "canta"
      impacto({ forca: 0.35, brilho: 1.2, feltro: 0.2 });
      kalimba(notaAcorde(n + 1), 0.005, 0.2);
      if (n >= 4) tom({ freq: notaAcorde(n + 1, 84), ini: 0.03, dur: 0.6, ganho: 0.035, reverbAmt: 0.6 });
    },
    bolso: () => { chiado({ dur: 0.12, ganho: 0.2, freq: 380, tipo: 'lowpass', q: 1, reverbAmt: 0.02 }); tom({ freq: 330, glide: 0.6, dur: 0.12, ganho: 0.18, reverbAmt: 0.08 }); }, // guardar no bolso: "fump" de pano
    troca: () => { tom({ freq: 420, glide: 1.5, dur: 0.1, ganho: 0.12 }); impacto({ ini: 0.05, forca: 0.25, feltro: 0 }); tom({ freq: 640, glide: 0.6, ini: 0.08, dur: 0.12, ganho: 0.12 }); },
    disparo: ({ L = 3 } = {}) => {                                                                  // recompensa: a corrente sobe em arpejo e abre num acorde, maior quanto maior a corrente
      duck(0.25 + L * 0.06, 0.6 + L * 0.15);
      chiado({ dur: 0.28 + L * 0.03, ganho: 0.05 + L * 0.008, freq: 500, varre: 6000, q: 1.2, ataque: 0.2, reverbAmt: 0.3 }); // "fuuu" subindo
      const passo = 0.055;
      for (let i = 0; i < L + 1; i++) kalimba(notaAcorde(i + 1), 0.08 + i * passo, 0.18, null, (i / L - 0.5) * 0.6);
      const fim = 0.08 + (L + 1) * passo;
      [0, 1, 2, 3].forEach(k => pianoEl(notaAcorde(k, 60), fim + k * 0.012, 1.5 + L * 0.2, 0.06, busSom, 0.8));
      tom({ freq: notaAcorde(0, 48), ini: fim, dur: 1.2, ganho: 0.1, reverbAmt: 0.1 });
      if (L >= 5) for (let i = 0; i < 8; i++) tom({ freq: notaAcorde(8 + i, 84), ini: fim + 0.1 + i * 0.045, dur: 0.6, ganho: 0.035, reverbAmt: 0.7, x: sorte(-0.6, 0.6) });
      if (L >= 6) chiado({ ini: fim, dur: 1.4, ganho: 0.03, freq: 9000, tipo: 'highpass', ataque: 0.05, reverbAmt: 0.5 });
    },
    tique: ({ k = 0 } = {}) => { tom({ freq: notaAcorde(k + 2, 84), dur: 0.09, ganho: 0.1, reverbAmt: 0.2 }); impacto({ forca: 0.08, brilho: 1.4, feltro: 0 }); }, // cada ponto contado no placar
    ruptura: ({ L = 3 } = {}) => {                                                                   // perda gentil: os dados se espalham pelo feltro e duas notas descem
      duck(0.3, 0.8);
      for (let i = 0; i < Math.min(6, L + 1); i++) quicar(0.04 + i * sorte(0.04, 0.07), sorte(0.25, 0.4), sorte(-0.6, 0.6), 2);
      tom({ freq: notaAcorde(4, 60), tipo: 'triangle', ini: 0.05, dur: 0.4, ganho: 0.11, filtro: 1300, glide: 0.97 });
      tom({ freq: notaAcorde(2, 60), tipo: 'triangle', ini: 0.25, dur: 0.7, ganho: 0.11, filtro: 1000, glide: 0.94 });
      chiado({ ini: 0.02, dur: 0.3, ganho: 0.05, freq: 500, tipo: 'lowpass' });
    },
    salvo: () => { kalimba(notaAcorde(3), 0, 0.16); kalimba(notaAcorde(5), 0.09, 0.16); kalimba(notaAcorde(7), 0.18, 0.12); }, // ruptura evitada: alívio
    carta: () => { papel(0, true, 0.11); impacto({ ini: 0.12, forca: 0.2, brilho: 0.6, feltro: 0.8 }); },   // carta saindo da mão e batendo na mesa
    armou: () => { papel(0, false, 0.08); [9, 10, 12].forEach((g, i) => tom({ freq: notaAcorde(g, 84), ini: 0.1 + i * 0.06, dur: 0.6, ganho: 0.04, reverbAmt: 0.7 })); }, // segredo guardado: brilho curto
    revelou: () => {                                                                                // armadilha disparou: "tchã-rã" mágico, curioso
      duck(0.35, 0.8);
      chiado({ dur: 0.3, ganho: 0.06, freq: 2000, varre: 8000, q: 2, ataque: 0.15, reverbAmt: 0.4 });
      tom({ freq: notaAcorde(0, 48), ini: 0.2, dur: 0.8, ganho: 0.1, reverbAmt: 0.3 });
      [0, 1, 2, 3, 5].forEach((g, i) => kalimba(notaAcorde(g + 4), 0.2 + i * 0.05, 0.12, null, (i - 2) * 0.25));
    },
    virar: () => { papel(0, true, 0.08); papel(0.1, false, 0.07); impacto({ ini: 0.2, forca: 0.25, feltro: 0.5 }); },
    momento: () => { kalimba(notaAcorde(7), 0, 0.13); kalimba(notaAcorde(9), 0.08, 0.11); },        // "bom momento": sininho de recompensa
    vez: () => { tom({ freq: notaAcorde(5), dur: 0.5, ganho: 0.045, reverbAmt: 0.5 }); tom({ freq: notaAcorde(7), ini: 0.1, dur: 0.6, ganho: 0.04, reverbAmt: 0.5 }); }, // sua vez: aviso discreto
    bloqueio: () => { impacto({ forca: 0.4, brilho: 0.85 }); kalimba(notaAcorde(4), 0.05, 0.14); },
    abrir: () => { papel(0, true, 0.1); abafar(true); },                                           // janela abre: papel e a música vai para o fundo
    fechar: () => { papel(0, false, 0.08); abafar(false); },
    vitoria: () => {                                                                                // vitória: fanfarra pequena e calorosa, na tonalidade
      duck(0.8, 3);
      acordeAgora = 'Cmaj9';
      [0, 1, 2, 3, 4, 5, 7].forEach((g, i) => kalimba(notaAcorde(g + 2), i * 0.09, 0.2, null, (i - 3) * 0.2));
      [0, 1, 2, 3, 4].forEach(k => pianoEl(notaAcorde(k, 60), 0.65 + k * 0.03, 3, 0.06, busSom, 1));
      tom({ freq: midi(36), ini: 0.65, dur: 2.5, ganho: 0.12, reverbAmt: 0.1 });
      for (let i = 0; i < 10; i++) tom({ freq: notaAcorde(10 + i, 84), ini: 0.8 + i * 0.06, dur: 0.7, ganho: 0.03, reverbAmt: 0.7, x: sorte(-0.7, 0.7) });
    },
    derrota: () => {                                                                                // derrota: "ah, quase", acolhedor
      duck(0.8, 3);
      acordeAgora = 'Fmaj9';
      kalimba(notaAcorde(6), 0, 0.15); kalimba(notaAcorde(4), 0.22, 0.15); kalimba(notaAcorde(2), 0.44, 0.17);
      [0, 1, 2, 3].forEach(k => pianoEl(notaAcorde(k, 57), 0.6 + k * 0.04, 2.6, 0.055, busSom, 0.6));
      tom({ freq: midi(41), ini: 0.6, dur: 2.2, ganho: 0.1, reverbAmt: 0.1 });
    },
    moeda: ({ n = 1 } = {}) => { for (let i = 0; i < Math.min(10, n); i++) moedinha(1700 * Math.pow(1.06, i), i * 0.065, 0.05); }, // moedas: tilintar que sobe
    compra: () => { [0, 1, 2, 4].forEach((g, i) => kalimba(notaAcorde(g + 5), i * 0.08, 0.16)); moedinha(2100, 0, 0.04); },  // compra feita: presente aberto
    nivel: () => { [0, 1, 2, 3, 4, 5, 7].forEach((g, i) => kalimba(notaAcorde(g + 3), i * 0.08, 0.15)); },  // subiu de nível: escadinha alegre
    falaRival: ({ voz = 'diana' } = {}) => {                                                        // "blá-blá" com a voz do rival: a gata sobe no fim ("miau?"), a coruja é grave e redonda
      const coruja = voz === 'coruja', base = coruja ? 300 : 560;
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const f = base * sorte(0.85, 1.25), ini = i * sorte(0.07, 0.1);
        tom({ freq: f, tipo: 'triangle', ini, dur: 0.07, ganho: 0.035, filtro: coruja ? 900 : 2200, glide: i === n - 1 && !coruja ? 1.35 : coruja ? 0.9 : 1.05, reverbAmt: 0.05 });
      }
    },
  };
  const ultimo = {};
  function tocar(nome, dados) {
    if (!cfg.som || !ctx || ctx.state !== 'running') return;
    const f = SONS[nome]; if (!f) return;
    // o mesmo som duas vezes no mesmo instante vira um só (evita "metralhadora" e estouro)
    const agora = ctx.currentTime;
    if (nome !== 'tique' && ultimo[nome] && agora - ultimo[nome] < 0.03) return;
    ultimo[nome] = agora;
    try { f(dados || {}); } catch (e) { /* som nunca derruba o jogo */ }
  }

  // ---------- música: lo-fi gerado na hora, em cenas ----------
  // Camadas que entram com a intensidade da partida: piano elétrico e baixo sempre; chimbal a partir de 0,3;
  // bumbo e vassourinha a partir de 0,5; contracanto e pad na reta final. A kalimba toca motivos de 1 compasso
  // que se repetem com variação (soa composto, não aleatório) e se encaixam em cada acorde.
  const musica = (() => {
    let tocando = false, timer = null, prox = 0, passo = 0, intens = 0.2, cena = 'jogo', proxCena = null;
    let motivo = [], parte = 0;
    const novoMotivo = () => {
      const dens = cena === 'final' ? 0.55 : cena === 'menu' || cena === 'fim' ? 0.25 : 0.4;
      let g = 4 + Math.floor(Math.random() * 3);
      motivo = Array.from({ length: 8 }, (_, i) => {
        if (i === 0 || Math.random() > dens) return null;
        g = Math.max(2, Math.min(10, g + escolhe([-2, -1, -1, 1, 1, 2])));
        return g;
      });
    };
    const colcheia = () => 60 / CENAS[cena].bpm / 2;
    function agendar() {
      if (!ctx) return;
      // depois de um travamento (aba pesada, celular lento) as colcheias perdidas não saem todas juntas
      if (prox < ctx.currentTime) prox = ctx.currentTime + 0.05;
      while (prox < ctx.currentTime + 0.35) {
        const c = colcheia(), noCompasso = passo % 8, compasso = Math.floor(passo / 8);
        if (noCompasso === 0 && proxCena) { cena = proxCena; proxCena = null; parte = 0; novoMotivo(); }
        const partes = CENAS[cena].partes, prog = partes[parte % partes.length];
        const nome = prog[compasso % prog.length];
        if (noCompasso === 0 && compasso % prog.length === 0 && compasso > 0) { parte++; if (Math.random() < 0.6) novoMotivo(); }
        const [baixo, voicing] = AC_[nome];
        const swing = noCompasso % 2 === 1 ? c * 0.16 : 0;
        const ini = prox - ctx.currentTime + swing;
        if (noCompasso === 0) setTimeout(() => { acordeAgora = nome; }, Math.max(0, (prox - ctx.currentTime) * 1000));
        const D = duckMus, grooveOn = cena === 'jogo' || cena === 'final';
        // piano elétrico: acorde cheio no 1, "stab" curto no contratempo do 2 (groove)
        if (noCompasso === 0) voicing.forEach((n, i) => pianoEl(midi(n), ini + i * 0.014, c * (grooveOn ? 5 : 7.6), 0.032, D, 0.5 + intens * 0.4));
        if (grooveOn && noCompasso === 3 && intens > 0.15) voicing.slice(1).forEach((n, i) => pianoEl(midi(n), ini + i * 0.01, c * 1.4, 0.02, D, 0.4));
        if (grooveOn && noCompasso === 6 && Math.random() < 0.5) pianoEl(midi(voicing[3] + 12), ini, c * 1.5, 0.014, D, 0.3);
        // baixo macio (redondo, quase sem agudo)
        if (noCompasso === 0) tom({ freq: midi(baixo), ini, ataque: 0.02, dur: c * 3.4, ganho: 0.13, filtro: 400, reverbAmt: 0.03, destino: D, fita: true });
        if (grooveOn && noCompasso === 3) tom({ freq: midi(baixo + 12), ini, ataque: 0.01, dur: c * 0.8, ganho: 0.06, filtro: 500, reverbAmt: 0.02, destino: D });
        if (noCompasso === 4) tom({ freq: midi(baixo + 7), ini, ataque: 0.02, dur: c * 2.6, ganho: 0.085, filtro: 400, reverbAmt: 0.03, destino: D, fita: true });
        if (grooveOn && noCompasso === 7 && Math.random() < 0.6) {            // nota de passagem até o próximo baixo
          const seg = AC_[prog[(compasso + 1) % prog.length]][0];
          tom({ freq: midi(seg + escolhe([-1, 2])), ini, ataque: 0.01, dur: c * 0.9, ganho: 0.05, filtro: 450, reverbAmt: 0.02, destino: D });
        }
        // bateria lo-fi
        if (grooveOn) {
          if (intens > 0.3) chiado({ ini, dur: 0.035, ganho: noCompasso % 2 ? 0.022 : 0.012, freq: 8000, tipo: 'highpass', destino: D, reverbAmt: 0 });
          if (intens > 0.5) {
            if (noCompasso === 0 || noCompasso === 5 || (cena === 'final' && noCompasso === 3)) tom({ freq: 120, glide: 0.38, ini, ataque: 0.003, dur: 0.22, ganho: 0.22, destino: D, reverbAmt: 0 });
            if (noCompasso === 2 || noCompasso === 6) { chiado({ ini, dur: 0.16, ganho: 0.05, freq: 1800, q: 0.6, destino: D, reverbAmt: 0.15 }); tom({ freq: 190, ini, dur: 0.06, ganho: 0.03, tipo: 'triangle', destino: D, reverbAmt: 0 }); }
          }
        }
        // kalimba: o motivo do compasso, em notas deste acorde (às vezes uma nota muda)
        const g = motivo[noCompasso];
        if (g != null) {
          const gg = Math.random() < 0.15 ? g + escolhe([-1, 1]) : g;
          const save = acordeAgora; acordeAgora = nome;
          kalimba(notaAcorde(gg, 60), ini, 0.06 + intens * 0.025, D, sorte(-0.3, 0.3));
          acordeAgora = save;
        }
        // reta final: contracanto agudo e pad que respira
        if (cena === 'final' && noCompasso === 0) {
          const save = acordeAgora; acordeAgora = nome;
          tom({ freq: notaAcorde(2 + (compasso % 3), 72), tipo: 'triangle', ini: ini + c * 2, ataque: 0.15, dur: c * 4, ganho: 0.025, filtro: 1800, reverbAmt: 0.5, destino: D, fita: true });
          voicing.forEach(n => tom({ freq: midi(n), tipo: 'sawtooth', ini, ataque: c * 2, dur: c * 8, ganho: 0.008, filtro: 900, reverbAmt: 0.4, destino: D, fita: true }));
          acordeAgora = save;
        }
        // fim e menu: pad lento no lugar da bateria
        if ((cena === 'fim' || cena === 'menu') && noCompasso === 0)
          voicing.forEach(n => tom({ freq: midi(n), tipo: 'triangle', ini, ataque: c * 2.5, dur: c * 8, ganho: 0.016, filtro: 1100, reverbAmt: 0.5, destino: D, fita: true }));
        // chiado de vinil
        if (Math.random() < 0.35) chiado({ ini: ini + Math.random() * c, dur: 0.01, ganho: 0.018, freq: 3000, q: 0.5, destino: D, reverbAmt: 0 });
        prox += c; passo++;
      }
    }
    return {
      iniciar() {
        if (tocando || !ctx || !cfg.musica) return;
        tocando = true; prox = ctx.currentTime + 0.1; passo = 0; parte = 0; novoMotivo();
        timer = setInterval(agendar, 100);
      },
      parar() { tocando = false; clearInterval(timer); timer = null; acordeAgora = null; },
      // 0 a 1: quão perto da meta está quem vai na frente
      intensidade(x) {
        intens = Math.max(0, Math.min(1, x));
        const atual = proxCena || cena;                  // só alterna entre partida e reta final; o fim e o menu ficam
        if (atual === 'jogo' && intens >= 0.75) this.cena('final');
        else if (atual === 'final' && intens < 0.6) this.cena('jogo');
      },
      // troca de cena no começo do próximo compasso (nunca no meio de uma frase)
      cena(nome) { if (CENAS[nome] && nome !== (proxCena || cena)) { if (!tocando) cena = nome; else proxCena = nome; } },
      get tocando() { return tocando; },
      get cenaAtual() { return proxCena || cena; },
    };
  })();

  function configurar(novo) {
    Object.assign(cfg, novo);
    if (!ctx) return;
    sessao();
    aplicarVolumes();
    if (cfg.musica && ctx.state === 'running') musica.iniciar();
    if (!cfg.musica) musica.parar();
  }
  // pausa tudo quando a aba some (economiza bateria no celular)
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    // o Safari recusa o resume fora de um toque: o próximo toque desbloqueia
    if (document.hidden) ctx.suspend().catch(() => {}); else if (cfg.som || cfg.musica) ctx.resume().catch(() => {});
  });

  // para testes: toca um efeito num contexto offline e devolve o pico e o RMS (tools/fumaca.js confere que nada estoura)
  async function medir(nome, dados = {}, dur = 3) {
    const grafo = { ctx, mestre, busSom, busMusica, duckMus, abafa, envioReverb, wow, ruidoBuf, acordeAgora }, salvoCfg = { ...cfg };
    const off = new OfflineAudioContext(2, Math.floor(44100 * dur), 44100);
    ruidoBuf = null;
    try {
      montar(off); cfg.som = true; busSom.gain.value = cfg.volSom;
      SONS[nome](dados);
      const buf = await off.startRendering();
      let pico = 0, soma = 0, n = 0;
      for (let ch = 0; ch < buf.numberOfChannels; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > pico) pico = a; soma += d[i] * d[i]; n++; }
      }
      return { pico, rms: Math.sqrt(soma / n) };
    } finally {
      ({ ctx, mestre, busSom, busMusica, duckMus, abafa, envioReverb, wow, ruidoBuf, acordeAgora } = grafo); Object.assign(cfg, salvoCfg);
    }
  }

  window.Som = { cfg, desbloquear, tocar, musica, configurar, abafar, medir, sons: Object.keys(SONS) };
})();
