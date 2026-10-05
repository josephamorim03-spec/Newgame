/* Kaiju 2048: small, asset-free sound palette. Load before the game UI. */
(function (host) {
  "use strict";

  const STORAGE_KEY = "kaiju2048.audio.muted";
  const Context = host.AudioContext || host.webkitAudioContext;
  const quietEvents = { ui: 55, blocked: 100, slide: 65, move: 55, spawn: 95 };
  const lastPlayed = Object.create(null);
  let context = null;
  let master = null;
  let noiseBuffer = null;
  let muted = false;

  try {
    muted = host.localStorage.getItem(STORAGE_KEY) === "1";
  } catch (_) {
    // Private browsing and file:// may deny storage. Sound still works.
  }

  function getContext() {
    if (!Context) return null;
    if (!context) {
      try {
        context = new Context();
        master = context.createGain();
        master.gain.value = muted ? 0 : 0.38;
        master.connect(context.destination);
      } catch (_) {
        context = null;
        master = null;
      }
    }
    return context;
  }

  function unlock() {
    const ctx = getContext();
    if (!ctx) return Promise.resolve(false);
    if (ctx.state === "running") return Promise.resolve(true);
    try {
      return ctx.resume().then(() => ctx.state === "running", () => false);
    } catch (_) {
      return Promise.resolve(false);
    }
  }

  function tone(pitch, endPitch, duration, gain, type, delay) {
    const ctx = context;
    const at = ctx.currentTime + (delay || 0);
    const end = at + duration;
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    oscillator.type = type || "triangle";
    oscillator.frequency.setValueAtTime(Math.max(25, pitch), at);
    if (endPitch) oscillator.frequency.exponentialRampToValueAtTime(Math.max(25, endPitch), end);
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + Math.min(0.012, duration * 0.2));
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(at);
    oscillator.stop(end + 0.01);
    oscillator.onended = function () {
      oscillator.disconnect();
      envelope.disconnect();
    };
  }

  function noise(duration, gain, cutoff, delay) {
    const ctx = context;
    if (!noiseBuffer) {
      const length = Math.floor(ctx.sampleRate * 0.35);
      noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const samples = noiseBuffer.getChannelData(0);
      let seed = 1948;
      for (let i = 0; i < length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
        samples[i] = ((seed >>> 0) / 2147483648) - 1;
      }
    }
    const at = ctx.currentTime + (delay || 0);
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const envelope = ctx.createGain();
    source.buffer = noiseBuffer;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff || 1200, at);
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + Math.min(0.008, duration * 0.2));
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(master);
    source.start(at);
    source.stop(at + duration + 0.01);
    source.onended = function () {
      source.disconnect();
      filter.disconnect();
      envelope.disconnect();
    };
  }

  function sound(event, options) {
    const now = Date.now();
    const gap = quietEvents[event] || 0;
    if (gap && now - (lastPlayed[event] || 0) < gap) return;
    lastPlayed[event] = now;
    const value = Math.max(2, Number(options.value) || 2);
    const tier = Math.max(1, Math.min(11, Math.log2(value)));
    const kind = String(options.kind || options.enemy || "").toLowerCase();

    switch (event) {
      case "slide":
        tone(110, 75, 0.105, 0.15, "sawtooth");
        noise(0.075, 0.15, 500, 0.022);
        tone(225, 120, 0.065, 0.07, "square", 0.03);
        break;
      case "merge": {
        const large = value >= 32;
        const start = large ? 0.035 : 0;
        const base = Math.min(770, 300 + tier * 38);
        tone(base, base * 1.1, 0.105, large ? 0.17 : 0.11, "triangle", start);
        tone(base * 1.5, base * 1.65, 0.13, large ? 0.13 : 0.075, "sine", start + 0.045);
        if (large) {
          noise(0.09, 0.17, 950, start);
          tone(90, 50, 0.18, 0.16, "sawtooth", start);
        }
        break;
      }
      case "move":
        tone(300, 470, 0.075, 0.085, "square");
        tone(170, 120, 0.075, 0.065, "triangle", 0.025);
        break;
      case "shot":
        noise(0.055, 0.12, 3000);
        tone(680, 90, 0.16, 0.2, "sawtooth", 0.042);
        noise(0.115, 0.2, 850, 0.042);
        break;
      case "enemy":
        if (kind.includes("art") || kind.includes("gun")) {
          tone(200, 440, 0.09, 0.105, "sawtooth");
          tone(750, 125, 0.17, 0.18, "square", 0.085);
          noise(0.065, 0.1, 1600, 0.085);
        } else if (kind.includes("para")) {
          tone(400, 165, 0.18, 0.13, "sine");
          tone(560, 240, 0.2, 0.08, "triangle", 0.035);
          noise(0.08, 0.09, 1200, 0.1);
        } else {
          tone(90, 42, 0.24, 0.23, "sawtooth", 0.06);
          noise(0.17, 0.27, 430, 0.06);
        }
        break;
      case "hit":
        tone(220, 55, 0.2, 0.2, "sawtooth");
        noise(0.16, 0.22, 750);
        break;
      case "spawn":
        tone(390, 550, 0.085, 0.055, "sine");
        tone(580, 740, 0.095, 0.045, "triangle", 0.025);
        break;
      case "win":
        [392, 494, 587, 784].forEach((pitch, index) => {
          tone(pitch, pitch * 1.04, 0.22, 0.12, "triangle", index * 0.095);
          tone(pitch * 2, pitch * 2, 0.15, 0.045, "sine", index * 0.095);
        });
        noise(0.09, 0.12, 1800, 0.3);
        break;
      case "lose":
        [330, 262, 165].forEach((pitch, index) => tone(pitch, pitch * 0.8, 0.2, 0.11, "triangle", index * 0.14));
        noise(0.13, 0.09, 500, 0.25);
        break;
      case "blocked":
        tone(130, 100, 0.065, 0.07, "square");
        break;
      case "ui":
        tone(390, 465, 0.04, 0.05, "square");
        break;
      case "idle":
        tone(65, 62, 0.28, 0.018, "sine");
        break;
    }
  }

  const aliases = {
    attack: "shot", fire: "shot", "enemy-attack": "enemy", damage: "hit",
    tap: "ui", select: "ui", victory: "win", defeat: "lose", error: "blocked"
  };

  function play(name, options) {
    if (muted) return false;
    const event = aliases[name] || name;
    const ctx = getContext();
    if (!ctx) return false;
    const details = options || {};
    if (ctx.state === "running") {
      sound(event, details);
    } else {
      const requestedAt = Date.now();
      unlock().then(function (ready) {
        // A stale sound must not burst out when a browser unlocks audio later.
        if (ready && !muted && Date.now() - requestedAt < 350) sound(event, details);
      });
    }
    return true;
  }

  function setMuted(value) {
    muted = !!value;
    try {
      host.localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
    } catch (_) {
      // Persisting the preference is optional.
    }
    if (master && context) {
      const at = context.currentTime;
      master.gain.cancelScheduledValues(at);
      master.gain.setTargetAtTime(muted ? 0 : 0.38, at, 0.012);
    }
    return muted;
  }

  function suspend() {
    if (!context || context.state !== "running") return Promise.resolve(false);
    return context.suspend().then(() => true, () => false);
  }

  host.KaijuAudio = Object.freeze({
    unlock,
    play,
    setMuted,
    isMuted: () => muted,
    suspend,
    resume: unlock,
    isSupported: () => !!Context
  });
})(typeof window !== "undefined" ? window : globalThis);
