// CORDEL — motor de regras determinístico (sorteio só no embaralhar, com semente). Tudo por comandos: pronto para online.
const CD = (() => {
  const BW = 5, BH = 7, GEN_HP = 20, MAX_MANA = 9, HAND_MAX = 6;
  // ---------- cartas ----------
  const CARDS = {
    // Mata
    saci: { name: "Saci-Pererê", fac: "mata", type: "unit", cost: 2, atk: 2, hp: 2, text: "Entra em qualquer casa vazia a até 3 do seu general.", farSummon: 3, sky: "dia", skyText: "De dia: entra em qualquer casa vazia." },
    coral: { name: "Cobra-coral", fac: "mata", type: "unit", cost: 3, atk: 1, hp: 3, text: "Veneno: destrói qualquer unidade que ferir (não afeta generais).", venom: true, sky: "dia", skyText: "Ao sol: ataca sem levar revide.", skyFree: true },
    uira: { name: "Uirapuru", fac: "mata", type: "unit", cost: 2, atk: 1, hp: 3, text: "Voa: anda até 3 casas por cima de peças e do rio. Ao entrar: compre 1 carta.", fly: true, onEnter: "draw", sky: "dia", skyText: "Canto da manhã: de dia, compra 2 ao entrar." },
    onca: { name: "Onça-pintada", fac: "mata", type: "unit", cost: 3, atk: 3, hp: 2, text: "Rápida: age no turno em que entra.", rush: true, sky: "noite", skyText: "Caçadora: de noite, +1 de ataque." },
    caipora: { name: "Caipora", fac: "mata", type: "unit", cost: 3, atk: 2, hp: 4, text: "No fim do seu turno, cura 1 nas suas unidades vizinhas (e no general).", endHeal: 1, sky: "noite", skyText: "De noite, cura 2 em vez de 1." },
    anhanga: { name: "Anhangá", fac: "mata", type: "unit", cost: 5, atk: 4, hp: 5, text: "Ao entrar: enraíza os inimigos vizinhos (não andam no próximo turno).", onEnter: "rootAround", sky: "noite", skyText: "De noite, também causa 1 de dano nos inimigos vizinhos ao entrar." },
    mapin: { name: "Mapinguari", fac: "mata", type: "unit", cost: 6, atk: 5, hp: 7, text: "Guardião: inimigos vizinhos não podem andar e só podem atacá-lo.", guard: true, sky: "dia", skyText: "De dia, recupera 3 de vida no fim do seu turno." },
    enraizar: { name: "Enraizar", fac: "mata", type: "spell", cost: 1, target: "enemy", text: "Causa 1 de dano a uma unidade ou general inimigo, que também não anda no próximo turno.", sky: "dia", skyText: "De dia: 2 de dano." },
    cha: { name: "Chá de ervas", fac: "mata", type: "spell", cost: 1, target: "ally", text: "Cura 4 de uma unidade sua ou do seu general.", sky: "dia", skyText: "De dia: cura 6." },
    arapuca: { name: "Arapuca", fac: "mata", type: "spell", cost: 2, target: "empty", text: "Armadilha escondida numa casa vazia: o primeiro inimigo que parar nela leva 3.", sky: "noite", skyText: "De noite a armadilha causa 4." },
    // Assombrações
    corpo: { name: "Corpo-seco", fac: "assom", type: "unit", cost: 1, atk: 2, hp: 1, text: "Último suspiro: 1 de dano em todos os inimigos vizinhos.", lastBreath: 1, sky: "noite", skyText: "De noite, o último suspiro causa 2." },
    bicho: { name: "Bicho-papão", fac: "assom", type: "unit", cost: 2, atk: 2, hp: 3, text: "Guardião: inimigos vizinhos não podem andar e só podem atacá-lo.", guard: true, sky: "noite", skyText: "De noite, inimigos vizinhos têm −1 de ataque." },
    lobis: { name: "Lobisomem", fac: "assom", type: "unit", cost: 3, atk: 3, hp: 3, text: "Fúria: +2 de ataque enquanto estiver ferido.", fury: 2, moon: true, sky: "noite", skyText: "Lua: em fúria a noite toda." },
    pisa: { name: "Pisadeira", fac: "assom", type: "unit", cost: 3, atk: 2, hp: 2, text: "Ao entrar: atordoa o inimigo vizinho mais forte (não anda nem ataca no próximo turno).", onEnter: "stunOne", sky: "noite", skyText: "De noite, atordoa todos os inimigos vizinhos ao entrar." },
    mula: { name: "Mula-sem-cabeça", fac: "assom", type: "unit", cost: 4, atk: 4, hp: 3, text: "Rápida. Galope: anda até 3 casas.", rush: true, move: 3, sky: "noite", skyText: "De noite, galopa até 4 casas." },
    capelobo: { name: "Capelobo", fac: "assom", type: "unit", cost: 5, atk: 5, hp: 5, text: "Ao destruir uma unidade atacando, recupera toda a vida.", feast: true, sky: "noite", skyText: "De noite: +1 de ataque." },
    pacto: { name: "Pacto", fac: "assom", type: "spell", cost: 0, target: "none", text: "Seu general perde 2 de vida. Compre 2 cartas." },
    alma: { name: "Alma penada", fac: "assom", type: "spell", cost: 1, target: "allyUnit", text: "Destrói uma unidade sua: causa 3 de dano em cada inimigo vizinho a ela." },
    grito: { name: "Grito da noite", fac: "assom", type: "spell", cost: 2, target: "enemy", text: "Causa 2 de dano a uma unidade ou general inimigo.", sky: "noite", skyText: "De noite: 3 de dano." },
    assomb: { name: "Assombração", fac: "assom", type: "spell", cost: 3, target: "none", text: "Traz de volta a última unidade sua que morreu, ao lado do seu general.", sky: "noite", skyText: "De noite, a unidade volta pronta para agir." },
  };
  const FACTIONS = {
    mata: { name: "Mata", gen: "Curupira", color: "#2F6B3A", power: { name: "Rastro falso", cost: 1, cd: 2, target: "allyUnit", text: "Troca o Curupira de lugar com uma unidade sua.", sky: "dia", skyText: "De dia, recarrega em 1 turno." },
      deck: ["saci", "coral", "uira", "onca", "caipora", "anhanga", "mapin", "enraizar", "cha", "arapuca"] },
    assom: { name: "Assombrações", gen: "Cuca", color: "#7A2340", power: { name: "Feitiço da Cuca", cost: 1, cd: 2, target: "any", text: "1 de dano em qualquer unidade ou general; a Cuca recupera 1.", sky: "noite", skyText: "De noite: 2 de dano." },
      deck: ["corpo", "bicho", "lobis", "pisa", "mula", "capelobo", "pacto", "alma", "grito", "assomb"] },
  };
  for (const [k, C] of Object.entries(CARDS)) C.id = k;
  // terreno: sorteado com a semente e espelhado (justo para os dois lados)
  const TERR = {
    mata: { name: "Mata fechada", text: "Quem está aqui leva 1 de dano a menos em ataques e revides (mínimo 1)." },
    rio: { name: "Rio", text: "Ninguém para nem passa a pé. Quem voa pula por cima. Dá para atacar por cima do rio." },
    encru: { name: "Encruzilhada", text: "No começo do seu turno, cada peça sua aqui dá +1 de mana." },
    totem: { name: "Totem", text: "Casa sagrada: no começo do seu turno, cada peça sua aqui conta 1 causo. Quem juntar os causos da meta vence." },
  };
  const D8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]], D4 = D8.slice(0, 4);
  const inb = (x, y) => x >= 0 && y >= 0 && x < BW && y < BH;
  const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  class Game {
    constructor(opt = {}) {
      const R = rng(opt.seed ?? 1); this.rules = { costas: opt.costas ?? true, ceu: opt.ceu ?? true, lado: opt.lado ?? "livre", fase: opt.fase ?? 3, diaAtk: opt.diaAtk ?? false, bando: opt.bando ?? true, ceuFac: opt.ceuFac ?? true, ceuCartas: opt.ceuCartas ?? true, totem: opt.totem ?? 0, troca: opt.troca ?? false, guarda: opt.guarda ?? opt.troca ?? false, noiteAtk: opt.noiteAtk ?? false, off: opt.off || [], only: opt.only || null }; this.seed = opt.seed ?? 1; this.uid = 1; this.units = []; this.traps = []; this.ev = []; this.over = false; this.winner = null; this.turn = 1; this.cur = 0;
      this.p = [0, 1].map(o => { const fac = (opt.fac || ["mata", "assom"])[o], F = FACTIONS[fac], deck = [];
        for (const c of F.deck) deck.push(c, c); for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
        return { fac, deck, hand: [], mana: 0, max: 0, cd: 0, grave: [], fatigue: 0, causos: 0, saved: 0, mull: !!this.rules.troca }; });
      this.terr = {}; const put = (x, y, k) => { this.terr[x + "," + y] = k; this.terr[(BW - 1 - x) + "," + (BH - 1 - y)] = k; };
      if (R() < 0.5) put(2, 3, "encru"); else put(0, 3, "encru");
      const cand = []; for (let y = 1; y <= 2; y++) for (let x = 0; x < BW; x++) if (Math.max(Math.abs(x - 2), y) > 1) cand.push([x, y]);
      for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
      put(...cand[0], "rio"); put(...cand[1], "mata"); put(...cand[2], "mata"); if (this.rules.totem) put(1, 3, "totem");
      for (const o of [0, 1]) { this.units.push({ id: this.uid++, o, gen: true, card: FACTIONS[this.p[o].fac].gen, atk: 2, hp: GEN_HP, max: GEN_HP, x: 2, y: o === 0 ? BH - 1 : 0, f: [0, o === 0 ? -1 : 1], moved: false, acted: false, sick: false, rooted: 0, stunned: 0 });
        for (let i = 0; i < (o === 0 ? 3 : 4); i++) this.draw(o); }
      this.startTurn(0);
    }
    clone() { const g = Object.create(Game.prototype); const s = JSON.parse(JSON.stringify({ ...this, ev: [] })); Object.assign(g, s); g.ev = []; return g; }
    e(x) { this.ev.push(x); }
    // ----- consultas -----
    ter(x, y) { return this.terr[x + "," + y]; }
    at(x, y) { return this.units.find(u => u.x === x && u.y === y && u.hp > 0); }
    gen(o) { return this.units.find(u => u.gen && u.o === o); }
    U(u) { return u.gen ? null : CARDS[u.card]; }
    // céu: dia nas rodadas 1–3, noite nas 4–6, e assim por diante (rodada = um turno de cada jogador)
    round() { return Math.ceil(this.turn / 2); }
    sky() { return this.rules.ceu && Math.floor((this.round() - 1) / this.rules.fase) % 2 ? "noite" : "dia"; }
    skyLeft() { return this.rules.fase - (this.round() - 1) % this.rules.fase; }
    night(u) { return this.rules.ceu && this.rules.ceuFac && this.rules.noiteAtk && this.sky() === "noite" && !u.gen && this.p[u.o].fac === "assom"; }
    day(u) { return this.rules.ceu && this.rules.ceuFac && this.sky() === "dia" && this.p[u.o].fac === "mata"; }
    // traço de céu da carta (☀️/🌙) ativo agora?
    lit(C) { return !!(C && C.sky && this.rules.ceu && this.rules.ceuCartas && this.sky() === C.sky && !this.rules.off.includes(C.id || C.name) && (!this.rules.only || this.rules.only.includes(C.id || C.name))); }
    litU(u) { return this.lit(u.gen ? FACTIONS[this.p[u.o].fac].power : this.U(u)); }
    atkOf(u) { const C = this.U(u), dayAtk = this.rules.diaAtk && this.day(u) && !u.gen ? 1 : 0, fury = C && C.fury && (u.hp < u.max || (C.moon && this.rules.ceu && this.sky() === "noite"));
      const lit = this.lit(C) && (u.card === "onca" || u.card === "capelobo") ? 1 : 0, fear = this.lit(CARDS.bicho) && this.units.some(b => b.card === "bicho" && b.hp > 0 && b.o !== u.o && cheb(b, u) === 1) ? 1 : 0;
      return Math.max(0, u.atk + (fury ? C.fury : 0) + (this.night(u) ? 1 : 0) + dayAtk + lit - fear); }
    // de onde vem o golpe, pelo lado para onde o defensor olha: frente, lado ou costas
    flank(a, t) { if (!this.rules.costas || !t.f) return "frente"; if (this.rules.bando && this.p[t.o].fac === "mata" && this.units.some(v => v !== t && v.hp > 0 && v.o === t.o && cheb(v, t) === 1)) return "frente"; const d = t.f[0] * Math.sign(a.x - t.x) + t.f[1] * Math.sign(a.y - t.y); return d > 0 || (d === 0 && this.rules.lado === "revida") ? (d > 0 ? "frente" : "lado") : d === 0 ? "lado" : "costas"; }
    mine(o) { return this.units.filter(u => u.o === o && u.hp > 0); }
    guardedBy(u) { return this.units.filter(g => g.o !== u.o && g.hp > 0 && !g.gen && CARDS[g.card].guard && cheb(g, u) === 1); }
    canMove(u) { return u.o === this.cur && !u.moved && !u.acted && !u.sick && !u.rooted && !u.stunned && !this.guardedBy(u).length; }
    canAttack(u) { return u.o === this.cur && !u.acted && !u.sick && !u.stunned && this.atkOf(u) > 0; }
    moves(u) { if (!this.canMove(u)) return []; const C = this.U(u), bonus = this.day(u) && !this.rules.diaAtk ? 1 : 0, range = ((C && C.move) || 2) + (C && C.move && this.lit(C) ? 1 : 0) + bonus, out = [];
      if (C && C.fly) { for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) if (!this.at(x, y) && this.ter(x, y) !== "rio" && Math.abs(x - u.x) + Math.abs(y - u.y) <= 3 + bonus && (x !== u.x || y !== u.y)) out.push([x, y]); return out; }
      const seen = new Set([u.x + "," + u.y]); let fr = [[u.x, u.y]];
      for (let s = 0; s < range; s++) { const nf = []; for (const [x, y] of fr) for (const [dx, dy] of D4) { const nx = x + dx, ny = y + dy, k = nx + "," + ny; if (!inb(nx, ny) || seen.has(k) || this.ter(nx, ny) === "rio") continue; seen.add(k); const o = this.at(nx, ny);
          if (o && o.o !== u.o) continue; nf.push([nx, ny]); if (!o) out.push([nx, ny]); } fr = nf; }
      return out; }
    attacks(u) { if (!this.canAttack(u)) return []; const g = this.guardedBy(u); const out = [];
      for (const [dx, dy] of D8) { const t = this.at(u.x + dx, u.y + dy); if (t && t.o !== u.o && (!g.length || g.includes(t))) out.push(t); } return out; }
    summonTiles(o, cardId) { const C = CARDS[cardId], out = [], G = this.gen(o);
      for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) { if (this.at(x, y) || this.ter(x, y) === "rio") continue;
        if (C.farSummon ? this.lit(C) || cheb(G, { x, y }) <= C.farSummon : this.mine(o).some(u => cheb(u, { x, y }) === 1)) out.push([x, y]); } return out; }
    spellTargets(o, t) { if (t === "enemy") return this.units.filter(u => u.hp > 0 && u.o !== o).map(u => [u.x, u.y]); if (t === "ally") return this.mine(o).map(u => [u.x, u.y]);
      if (t === "allyUnit") return this.mine(o).filter(u => !u.gen).map(u => [u.x, u.y]); if (t === "any") return this.units.filter(u => u.hp > 0).map(u => [u.x, u.y]);
      if (t === "empty") { const out = []; for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) if (!this.at(x, y) && this.ter(x, y) !== "rio" && !this.traps.some(tr => tr.x === x && tr.y === y)) out.push([x, y]); return out; } return []; }
    playTargets(o, hi) { const id = this.p[o].hand[hi], C = id && CARDS[id]; if (!C || this.p[o].mana < C.cost) return [];
      if (C.type === "unit") return this.summonTiles(o, id); if (C.target === "none") { if (id === "assomb" && !this.p[o].grave.length) return []; return [[-1, -1]]; } return this.spellTargets(o, C.target); }
    powerTargets(o) { const P = this.p[o], F = FACTIONS[P.fac].power; if (P.cd > 0 || P.mana < F.cost) return []; return this.spellTargets(o, F.target); }
    // ----- turno -----
    draw(o, n = 1) { const P = this.p[o]; for (let i = 0; i < n; i++) { if (!P.deck.length) { P.fatigue++; this.hurt(this.gen(o), P.fatigue, null); this.e({ k: "fatigue", o, n: P.fatigue }); continue; } const c = P.deck.pop(); if (P.hand.length < HAND_MAX) { P.hand.push(c); this.e({ k: "draw", o, c }); } else this.e({ k: "burn", o, c }); } }
    startTurn(o) { this.cur = o; const P = this.p[o]; P.max = Math.min(MAX_MANA, P.max + (P.max === 0 ? 2 : 1)); P.mana = P.max + P.saved; if (P.saved) this.e({ k: "saved", o, n: P.saved }); P.saved = 0; if (P.cd > 0) P.cd--;
      for (const u of this.mine(o)) { u.moved = false; u.acted = false; u.sick = false; }
      for (const u of this.mine(o)) if (this.ter(u.x, u.y) === "encru") { P.mana++; this.e({ k: "cross", o, x: u.x, y: u.y }); }
      for (const u of this.mine(o)) if (this.ter(u.x, u.y) === "totem") { P.causos++; this.e({ k: "causo", o, x: u.x, y: u.y, n: P.causos }); }
      if (this.rules.totem && P.causos >= this.rules.totem && !this.over) { this.over = true; this.winner = o; this.why = "causos"; this.e({ k: "causos", o }); return; }
      if (this.turn > 1) this.draw(o); this.e({ k: "turn", o, turn: this.turn });
      if (this.rules.ceu && o === 0 && this.turn > 1 && (this.round() - 1) % this.rules.fase === 0) this.e({ k: "sky", sky: this.sky() }); }
    endTurn() { if (this.over) return; const o = this.cur;
      for (const u of this.mine(o)) { const C = this.U(u); if (C && C.endHeal) { const n = C.endHeal + (this.lit(C) ? 1 : 0); for (const a of this.mine(o)) if (cheb(a, u) === 1 && a.hp < a.max) { const h = Math.min(n, a.max - a.hp); a.hp += h; this.e({ k: "heal", id: a.id, n: h }); } }
        if (u.card === "mapin" && this.lit(C) && u.hp < u.max) { const h = Math.min(3, u.max - u.hp); u.hp += h; this.e({ k: "heal", id: u.id, n: h }); } }
      this.p[o].saved = this.rules.guarda ? Math.min(1, this.p[o].mana) : 0; this.p[o].mull = false;
      for (const u of this.mine(o)) { if (u.rooted) u.rooted--; if (u.stunned) u.stunned--; }
      this.turn++; this.startTurn(1 - o); }
    // ----- dano e morte -----
    hurt(u, n, src) { if (!u || u.hp <= 0 || n <= 0) return; u.hp -= n; this.e({ k: "dmg", id: u.id, n, x: u.x, y: u.y }); }
    reap() { for (let guard = 0; guard < 10; guard++) { const dead = this.units.filter(u => u.hp <= 0 && !u.gone); if (!dead.length) break;
        for (const u of dead) { u.gone = true; this.e({ k: "die", id: u.id, x: u.x, y: u.y });
          if (u.gen) { if (!this.over) { this.over = true; this.winner = 1 - u.o; } continue; } this.p[u.o].grave.push(u.card); const C = CARDS[u.card];
          if (C.lastBreath) for (const v of this.units) if (v.hp > 0 && v.o !== u.o && cheb(v, u) === 1) this.hurt(v, C.lastBreath + (this.lit(C) ? 1 : 0), u); } }
      this.units = this.units.filter(u => !u.gone);
      const g0 = this.gen(0), g1 = this.gen(1); if (!g0 || !g1) { this.over = true; this.winner = !g0 && !g1 ? null : g0 ? 0 : 1; } }
    // ----- comandos -----
    apply(c) { const P = this.p[this.cur], ok = this.run(c); if (ok && c.c !== "mull" && c.c !== "end") P.mull = false; return ok; }
    run(c) {
      if (this.over) return false; const o = this.cur, P = this.p[o];
      if (c.c === "mull") { if (!P.mull || !Array.isArray(c.idx) || c.idx.length > 2 || new Set(c.idx).size !== c.idx.length || c.idx.some(i => !(i >= 0 && i < P.hand.length))) return false; this.mulligan(o, c.idx); return true; }
      if (c.c === "end") { this.endTurn(); return true; }
      if (c.c === "play") { const ok = this.playTargets(o, c.i).some(([x, y]) => x === c.x && y === c.y); if (!ok) return false; const id = P.hand[c.i], C = CARDS[id];
        P.mana -= C.cost; P.hand.splice(c.i, 1); this.e({ k: "play", o, c: id, x: c.x, y: c.y });
        if (C.type === "unit") this.summon(o, id, c.x, c.y); else this.cast(o, id, c.x, c.y); this.reap(); return true; }
      if (c.c === "power") { if (!this.powerTargets(o).some(([x, y]) => x === c.x && y === c.y)) return false; const F = FACTIONS[P.fac].power; P.mana -= F.cost; P.cd = this.lit(F) && P.fac === "mata" ? 1 : F.cd; const t = this.at(c.x, c.y), G = this.gen(o);
        this.e({ k: "power", o, x: c.x, y: c.y });
        if (P.fac === "mata") { const gx = G.x, gy = G.y; G.x = t.x; G.y = t.y; t.x = gx; t.y = gy; this.e({ k: "swap", a: G.id, b: t.id }); this.trap(G); this.trap(t); }
        else { this.hurt(t, this.lit(F) ? 2 : 1, G); if (G.hp < G.max) { G.hp = Math.min(G.max, G.hp + 1); this.e({ k: "heal", id: G.id, n: 1 }); } }
        this.reap(); return true; }
      const u = this.units.find(z => z.id === c.id && z.hp > 0); if (!u || u.o !== o) return false;
      if (c.c === "move") { if (!this.moves(u).some(([x, y]) => x === c.x && y === c.y)) return false; const fx = u.x, fy = u.y; u.f = [Math.sign(c.x - fx), Math.sign(c.y - fy)]; u.x = c.x; u.y = c.y; u.moved = true; this.e({ k: "move", id: u.id, fx, fy, x: c.x, y: c.y }); this.trap(u); this.reap(); return true; }
      if (c.c === "attack") { const t = this.attacks(u).find(z => z.x === c.x && z.y === c.y); if (!t) return false; u.acted = true; u.moved = true; this.fight(u, t); this.reap(); return true; }
      return false;
    }
    blow(v, n) { if (n > 1 && this.ter(v.x, v.y) === "mata") { this.e({ k: "cover", id: v.id, x: v.x, y: v.y }); return n - 1; } return n; }
    fight(a, t) { const A = this.U(a), T = this.U(t), fl = this.flank(a, t); a.f = [Math.sign(t.x - a.x), Math.sign(t.y - a.y)]; this.e({ k: "attack", id: a.id, t: t.id, flank: fl });
      this.hurt(t, this.blow(t, this.atkOf(a) + (fl === "costas" ? 1 : 0)), a); if (A && A.venom && !t.gen && t.hp > 0) { t.hp = 0; this.e({ k: "venom", id: t.id }); }
      if (t.hp > 0) t.f = [Math.sign(a.x - t.x), Math.sign(a.y - t.y)]; // quem apanha se vira para o agressor
      if (t.hp > 0 && !t.stunned && !(A && A.skyFree && this.lit(A)) && (fl === "frente" || (fl === "lado" && this.rules.lado === "revida"))) { this.e({ k: "counter", id: t.id, t: a.id }); this.hurt(a, this.blow(a, this.atkOf(t)), t); if (T && T.venom && !a.gen && a.hp > 0) { a.hp = 0; this.e({ k: "venom", id: a.id }); } }
      if (A && A.feast && t.hp <= 0 && !t.gen && a.hp > 0) { a.hp = a.max; this.e({ k: "heal", id: a.id, n: a.max }); } }
    trap(u) { const i = this.traps.findIndex(t => t.x === u.x && t.y === u.y && t.o !== u.o); if (i < 0) return; this.traps.splice(i, 1); this.e({ k: "trap", x: u.x, y: u.y }); this.hurt(u, this.lit(CARDS.arapuca) ? 4 : 3, null); }
    summon(o, id, x, y) { const C = CARDS[id], u = { id: this.uid++, o, card: id, atk: C.atk, hp: C.hp, max: C.hp, x, y, f: [0, o === 0 ? -1 : 1], moved: false, acted: false, sick: !C.rush, rooted: 0, stunned: 0 }; this.units.push(u); this.e({ k: "summon", id: u.id, x, y });
      this.trap(u);
      if (C.onEnter === "draw") this.draw(o, this.lit(C) ? 2 : 1);
      if (C.onEnter === "rootAround") for (const v of this.units) if (v.hp > 0 && v.o !== o && cheb(v, u) === 1) { v.rooted = 1; this.e({ k: "root", id: v.id }); if (this.lit(C)) this.hurt(v, 1, u); }
      if (C.onEnter === "stunOne") { const vs = this.units.filter(v => v.hp > 0 && v.o !== o && cheb(v, u) === 1).sort((a, b) => this.atkOf(b) - this.atkOf(a) || a.id - b.id); for (const v of this.lit(C) ? vs : vs.slice(0, 1)) { v.stunned = 1; this.e({ k: "stun", id: v.id }); } }
      if (this.lit(CARDS.assomb) && this.reviving) u.sick = false; }
    cast(o, id, x, y) { const t = this.at(x, y), P = this.p[o];
      if (id === "enraizar") { t.rooted = 1; this.e({ k: "root", id: t.id }); this.hurt(t, this.lit(CARDS.enraizar) ? 2 : 1, null); }
      else if (id === "cha") { const n = Math.min(this.lit(CARDS.cha) ? 6 : 4, t.max - t.hp); t.hp += n; this.e({ k: "heal", id: t.id, n }); }
      else if (id === "arapuca") this.traps.push({ o, x, y });
      else if (id === "pacto") { this.hurt(this.gen(o), 2, null); this.draw(o, 2); }
      else if (id === "alma") { const vs = this.units.filter(v => v.hp > 0 && v.o !== o && cheb(v, t) === 1); t.hp = 0; this.e({ k: "sacrifice", id: t.id }); for (const v of vs) this.hurt(v, 3, t); }
      else if (id === "grito") this.hurt(t, this.lit(CARDS.grito) ? 3 : 2, null);
      else if (id === "assomb") { const cid = P.grave.pop(), G = this.gen(o); const spots = D8.map(([dx, dy]) => [G.x + dx, G.y + dy]).filter(([a, b]) => inb(a, b) && !this.at(a, b) && this.ter(a, b) !== "rio").sort((a, b) => (o === 0 ? a[1] - b[1] : b[1] - a[1]) || a[0] - b[0]);
        if (spots.length) { this.reviving = true; this.summon(o, cid, spots[0][0], spots[0][1]); this.reviving = false; } else P.grave.push(cid); }
    }
    // troca inicial: devolve até 2 cartas ao baralho (posição sorteada com a semente) e compra o mesmo tanto
    mulligan(o, idx) { const P = this.p[o], R = rng(this.seed * 31 + o + 7), back = idx.slice().sort((a, b) => b - a).map(i => P.hand.splice(i, 1)[0]);
      for (const c of back) P.deck.splice(Math.floor(R() * (P.deck.length + 1)), 0, c); P.mull = false; this.e({ k: "mull", o, n: back.length }); this.draw(o, back.length); }
    // todas as ações possíveis do jogador da vez (para o bot)
    actions() { const o = this.cur, out = [];
      this.p[o].hand.forEach((c, i) => { for (const [x, y] of this.playTargets(o, i)) out.push({ c: "play", i, x, y }); });
      for (const [x, y] of this.powerTargets(o)) out.push({ c: "power", x, y });
      for (const u of this.mine(o)) { for (const [x, y] of this.moves(u)) out.push({ c: "move", id: u.id, x, y }); for (const t of this.attacks(u)) out.push({ c: "attack", id: u.id, x: t.x, y: t.y }); }
      return out; }
  }

  // ---------- bot: busca gulosa com avaliação de posição ----------
  const LV = { facil: { noise: 7, combo: false, threat: 0.5, quit: 0.3 }, normal: { noise: 0.6, combo: true, threat: 1, quit: 0 }, dificil: { noise: 0.6, combo: true, threat: 1.3, quit: 0, plans: 6 } };
  function evaluate(g, o, P) {
    if (g.over) return g.winner === o ? 1e5 : g.winner === null ? 0 : -1e5;
    const me = g.gen(o), foe = g.gen(1 - o); let s = (me.hp - foe.hp) * 3 + (foe.hp <= 8 ? (8 - foe.hp) * 2 : 0) - (me.hp <= 8 ? (8 - me.hp) * 2 * P.threat : 0);
    for (const u of g.units) { if (u.gen || u.hp <= 0) continue; const v = g.atkOf(u) * 1.5 + u.hp + (CARDS[u.card].guard ? 2 : 0) + (CARDS[u.card].venom ? 2 : 0) + 1.5; const enemyG = g.gen(1 - u.o);
      s += (u.o === o ? 1 : -1) * (v + Math.max(0, 4 - cheb(u, enemyG)) * 0.6); }
    for (const u of g.units) if (u.o !== o && u.hp > 0 && cheb(u, me) <= 3 && !u.gen) s -= g.atkOf(u) * 0.8 * P.threat;
    if (g.rules.costas) for (const m of g.units) { if (m.hp <= 0) continue; for (const e of g.units) if (e.o !== m.o && e.hp > 0 && cheb(e, m) === 1) { const fl = g.flank(e, m); if (fl !== "frente") s += (m.o === o ? -1 : 1) * (fl === "costas" ? 1.6 : 0.8); } }
    for (const u of g.units) { if (u.hp <= 0) continue; const tt = g.ter(u.x, u.y); if (tt === "encru") s += (u.o === o ? 1 : -1) * 2.2; else if (tt === "mata" && !u.gen) s += (u.o === o ? 1 : -1) * 0.6; }
    if (g.rules.totem) { const T = g.rules.totem, mine = g.p[o].causos, his = g.p[1 - o].causos; s += (mine - his) * 4 + (mine >= T - 2 ? (mine - T + 3) * 6 : 0) - (his >= T - 2 ? (his - T + 3) * 6 * P.threat : 0);
      for (const u of g.units) if (u.hp > 0 && g.ter(u.x, u.y) === "totem") s += (u.o === o ? 1 : -1) * 3.5; }
    s += (g.p[o].hand.length - g.p[1 - o].hand.length) * 0.8 + (g.traps.filter(t => t.o === o).length) * 1.2;
    return s;
  }
  // melhor ação única (com mover+atacar avaliados juntos)
  function greedy(g, o, P, R, noise) {
    const base = evaluate(g, o, P); let best = null, bv = base + 0.3;
    for (const a of g.actions()) { const h = g.clone(); if (!h.apply(a)) continue; let v = evaluate(h, o, P);
      if (P.combo && a.c === "move") { const u = h.units.find(z => z.id === a.id); if (u) for (const t of h.attacks(u)) { const h2 = h.clone(); h2.apply({ c: "attack", id: u.id, x: t.x, y: t.y }); v = Math.max(v, evaluate(h2, o, P) - 0.2); } }
      if (a.c === "play" && g.p[o].hand[a.i] === "pacto") { const G = g.gen(o); if (g.p[o].hand.length <= 3 && G.hp >= 12 && g.p[o].deck.length >= 2) v += 7; }
      v += (R() - 0.5) * noise; if (v > bv) { bv = v; best = a; } }
    return best;
  }
  function playTurn(g, o, P, R, noise) { const plan = []; for (let i = 0; i < 20 && !g.over && g.cur === o; i++) { const a = greedy(g, o, P, R, noise); if (!a) break; g.apply(a); plan.push(a); } return plan; }
  function makeBot(level, o, seed = 9) {
    const P = LV[level] || LV.normal, R = rng(seed + o); let queue = [], qTurn = -1;
    return function next(g) {
      if (g.over || g.cur !== o) return null;
      if (g.p[o].mull) { const H = g.p[o].hand, cheap = H.filter(c => CARDS[c].cost <= 3).length, idx = H.map((c, i) => [CARDS[c].cost, i]).filter(([c]) => c >= 5).sort((a, b) => b[0] - a[0]).slice(0, Math.max(0, 2 - Math.max(0, cheap - 1))).map(([, i]) => i);
        const dup = H.findIndex((c, i) => CARDS[c].type === "spell" && H.indexOf(c) !== i); if (dup >= 0 && idx.length < 2 && !idx.includes(dup)) idx.push(dup); return { c: "mull", idx }; }
      if (P.plans) { // difícil: testa vários planos de turno inteiro e a melhor resposta do oponente a cada um
        if (qTurn !== g.turn || !queue.length) { let best = null, bv = -Infinity; const opp = LV.normal;
          for (let k = 0; k < P.plans; k++) { const h = g.clone(); const plan = playTurn(h, o, P, R, k === 0 ? 0 : 1.5); if (!h.over) { h.endTurn(); playTurn(h, 1 - o, opp, R, 0); }
            const v = evaluate(h, o, P); if (v > bv) { bv = v; best = plan; } }
          queue = best.slice(); qTurn = g.turn; }
        while (queue.length) { const a = queue.shift(); const h = g.clone(); if (h.apply(a)) return a; }
        return { c: "end" }; }
      if (P.quit && R() < P.quit * 0.35) return { c: "end" };
      return greedy(g, o, P, R, P.noise) || { c: "end" };
    };
  }
  return { Game, CARDS, FACTIONS, TERR, BW, BH, GEN_HP, makeBot, LV, rng, cheb };
})();
if (typeof module !== "undefined") module.exports = CD;
