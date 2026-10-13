// CORDEL — motor de regras determinístico (sorteio só no embaralhar, com semente). Tudo por comandos: pronto para online.
const CD = (() => {
  const BW = 5, BH = 7, GEN_HP = 20, MAX_MANA = 9, HAND_MAX = 6;
  // ---------- cartas ----------
  const CARDS = {
    // Mata
    saci: { name: "Saci-Pererê", fac: "mata", type: "unit", cost: 2, atk: 2, hp: 2, text: "Entra em qualquer casa vazia a até 3 do seu general.", farSummon: 3 },
    coral: { name: "Cobra-coral", fac: "mata", type: "unit", cost: 2, atk: 1, hp: 2, text: "Veneno: destrói qualquer unidade que ferir (não afeta generais).", venom: true },
    uira: { name: "Uirapuru", fac: "mata", type: "unit", cost: 2, atk: 1, hp: 3, text: "Voa: anda até 3 casas por cima de peças e do rio. Ao entrar: compre 1 carta.", fly: true, onEnter: "draw" },
    onca: { name: "Onça-pintada", fac: "mata", type: "unit", cost: 3, atk: 3, hp: 2, text: "Rápida: age no turno em que entra.", rush: true },
    caipora: { name: "Caipora", fac: "mata", type: "unit", cost: 3, atk: 2, hp: 4, text: "No fim do seu turno, cura 1 nas suas unidades vizinhas (e no general).", endHeal: 1 },
    anhanga: { name: "Anhangá", fac: "mata", type: "unit", cost: 5, atk: 4, hp: 5, text: "Ao entrar: enraíza os inimigos vizinhos (não andam no próximo turno).", onEnter: "rootAround" },
    mapin: { name: "Mapinguari", fac: "mata", type: "unit", cost: 6, atk: 5, hp: 7, text: "Guardião: inimigos vizinhos não podem andar e só podem atacá-lo.", guard: true },
    enraizar: { name: "Enraizar", fac: "mata", type: "spell", cost: 1, target: "enemy", text: "Uma unidade ou general inimigo não anda no próximo turno." },
    cha: { name: "Chá de ervas", fac: "mata", type: "spell", cost: 1, target: "ally", text: "Cura 4 de uma unidade sua ou do seu general." },
    arapuca: { name: "Arapuca", fac: "mata", type: "spell", cost: 2, target: "empty", text: "Armadilha escondida numa casa vazia: o primeiro inimigo que parar nela leva 3." },
    // Assombrações
    corpo: { name: "Corpo-seco", fac: "assom", type: "unit", cost: 1, atk: 2, hp: 1, text: "Último suspiro: 1 de dano em todos os inimigos vizinhos.", lastBreath: 1 },
    bicho: { name: "Bicho-papão", fac: "assom", type: "unit", cost: 2, atk: 2, hp: 3, text: "Guardião: inimigos vizinhos não podem andar e só podem atacá-lo.", guard: true },
    lobis: { name: "Lobisomem", fac: "assom", type: "unit", cost: 3, atk: 3, hp: 3, text: "Fúria: +2 de ataque enquanto estiver ferido.", fury: 2 },
    pisa: { name: "Pisadeira", fac: "assom", type: "unit", cost: 3, atk: 2, hp: 2, text: "Ao entrar: atordoa o inimigo vizinho mais forte (não anda nem ataca no próximo turno).", onEnter: "stunOne" },
    mula: { name: "Mula-sem-cabeça", fac: "assom", type: "unit", cost: 4, atk: 4, hp: 3, text: "Rápida. Galope: anda até 3 casas.", rush: true, move: 3 },
    capelobo: { name: "Capelobo", fac: "assom", type: "unit", cost: 5, atk: 5, hp: 5, text: "Ao destruir uma unidade atacando, recupera toda a vida.", feast: true },
    pacto: { name: "Pacto", fac: "assom", type: "spell", cost: 0, target: "none", text: "Seu general perde 3 de vida. Compre 2 cartas." },
    alma: { name: "Alma penada", fac: "assom", type: "spell", cost: 1, target: "allyUnit", text: "Destrói uma unidade sua: causa 4 de dano em cada inimigo vizinho a ela." },
    grito: { name: "Grito da noite", fac: "assom", type: "spell", cost: 2, target: "enemy", text: "Causa 2 de dano a uma unidade ou general inimigo." },
    assomb: { name: "Assombração", fac: "assom", type: "spell", cost: 3, target: "none", text: "Traz de volta a última unidade sua que morreu, ao lado do seu general." },
  };
  const FACTIONS = {
    mata: { name: "Mata", gen: "Curupira", color: "#2F6B3A", power: { name: "Rastro falso", cost: 1, cd: 2, target: "allyUnit", text: "Troca o Curupira de lugar com uma unidade sua." },
      deck: ["saci", "coral", "uira", "onca", "caipora", "anhanga", "mapin", "enraizar", "cha", "arapuca"] },
    assom: { name: "Assombrações", gen: "Cuca", color: "#7A2340", power: { name: "Feitiço da Cuca", cost: 1, cd: 2, target: "any", text: "1 de dano em qualquer unidade ou general; a Cuca recupera 1." },
      deck: ["corpo", "bicho", "lobis", "pisa", "mula", "capelobo", "pacto", "alma", "grito", "assomb"] },
  };
  // terreno: sorteado com a semente e espelhado (justo para os dois lados)
  const TERR = {
    mata: { name: "Mata fechada", text: "Quem está aqui leva 1 de dano a menos em ataques e revides (mínimo 1)." },
    rio: { name: "Rio", text: "Ninguém para nem passa a pé. Quem voa pula por cima. Dá para atacar por cima do rio." },
    encru: { name: "Encruzilhada", text: "No começo do seu turno, cada peça sua aqui dá +1 de mana." },
  };
  const D8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]], D4 = D8.slice(0, 4);
  const inb = (x, y) => x >= 0 && y >= 0 && x < BW && y < BH;
  const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  class Game {
    constructor(opt = {}) {
      const R = rng(opt.seed ?? 1); this.uid = 1; this.units = []; this.traps = []; this.ev = []; this.over = false; this.winner = null; this.turn = 1; this.cur = 0;
      this.p = [0, 1].map(o => { const fac = (opt.fac || ["mata", "assom"])[o], F = FACTIONS[fac], deck = [];
        for (const c of F.deck) deck.push(c, c); for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
        return { fac, deck, hand: [], mana: 0, max: 0, cd: 0, grave: [], fatigue: 0 }; });
      this.terr = {}; const put = (x, y, k) => { this.terr[x + "," + y] = k; this.terr[(BW - 1 - x) + "," + (BH - 1 - y)] = k; };
      if (R() < 0.5) put(2, 3, "encru"); else put(0, 3, "encru");
      const cand = []; for (let y = 1; y <= 2; y++) for (let x = 0; x < BW; x++) if (Math.max(Math.abs(x - 2), y) > 1) cand.push([x, y]);
      for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
      put(...cand[0], "rio"); put(...cand[1], "mata"); put(...cand[2], "mata");
      for (const o of [0, 1]) { this.units.push({ id: this.uid++, o, gen: true, card: FACTIONS[this.p[o].fac].gen, atk: 2, hp: GEN_HP, max: GEN_HP, x: 2, y: o === 0 ? BH - 1 : 0, moved: false, acted: false, sick: false, rooted: 0, stunned: 0 });
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
    atkOf(u) { const C = this.U(u); return u.atk + (C && C.fury && u.hp < u.max ? C.fury : 0); }
    mine(o) { return this.units.filter(u => u.o === o && u.hp > 0); }
    guardedBy(u) { return this.units.filter(g => g.o !== u.o && g.hp > 0 && !g.gen && CARDS[g.card].guard && cheb(g, u) === 1); }
    canMove(u) { return u.o === this.cur && !u.moved && !u.acted && !u.sick && !u.rooted && !u.stunned && !this.guardedBy(u).length; }
    canAttack(u) { return u.o === this.cur && !u.acted && !u.sick && !u.stunned && this.atkOf(u) > 0; }
    moves(u) { if (!this.canMove(u)) return []; const C = this.U(u), range = (C && C.move) || 2, out = [];
      if (C && C.fly) { for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) if (!this.at(x, y) && this.ter(x, y) !== "rio" && Math.abs(x - u.x) + Math.abs(y - u.y) <= 3 && (x !== u.x || y !== u.y)) out.push([x, y]); return out; }
      const seen = new Set([u.x + "," + u.y]); let fr = [[u.x, u.y]];
      for (let s = 0; s < range; s++) { const nf = []; for (const [x, y] of fr) for (const [dx, dy] of D4) { const nx = x + dx, ny = y + dy, k = nx + "," + ny; if (!inb(nx, ny) || seen.has(k) || this.ter(nx, ny) === "rio") continue; seen.add(k); const o = this.at(nx, ny);
          if (o && o.o !== u.o) continue; nf.push([nx, ny]); if (!o) out.push([nx, ny]); } fr = nf; }
      return out; }
    attacks(u) { if (!this.canAttack(u)) return []; const g = this.guardedBy(u); const out = [];
      for (const [dx, dy] of D8) { const t = this.at(u.x + dx, u.y + dy); if (t && t.o !== u.o && (!g.length || g.includes(t))) out.push(t); } return out; }
    summonTiles(o, cardId) { const C = CARDS[cardId], out = [], G = this.gen(o);
      for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) { if (this.at(x, y) || this.ter(x, y) === "rio") continue;
        if (C.farSummon ? cheb(G, { x, y }) <= C.farSummon : this.mine(o).some(u => cheb(u, { x, y }) === 1)) out.push([x, y]); } return out; }
    spellTargets(o, t) { if (t === "enemy") return this.units.filter(u => u.hp > 0 && u.o !== o).map(u => [u.x, u.y]); if (t === "ally") return this.mine(o).map(u => [u.x, u.y]);
      if (t === "allyUnit") return this.mine(o).filter(u => !u.gen).map(u => [u.x, u.y]); if (t === "any") return this.units.filter(u => u.hp > 0).map(u => [u.x, u.y]);
      if (t === "empty") { const out = []; for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) if (!this.at(x, y) && this.ter(x, y) !== "rio" && !this.traps.some(tr => tr.x === x && tr.y === y)) out.push([x, y]); return out; } return []; }
    playTargets(o, hi) { const id = this.p[o].hand[hi], C = id && CARDS[id]; if (!C || this.p[o].mana < C.cost) return [];
      if (C.type === "unit") return this.summonTiles(o, id); if (C.target === "none") { if (id === "assomb" && !this.p[o].grave.length) return []; return [[-1, -1]]; } return this.spellTargets(o, C.target); }
    powerTargets(o) { const P = this.p[o], F = FACTIONS[P.fac].power; if (P.cd > 0 || P.mana < F.cost) return []; return this.spellTargets(o, F.target); }
    // ----- turno -----
    draw(o, n = 1) { const P = this.p[o]; for (let i = 0; i < n; i++) { if (!P.deck.length) { P.fatigue++; this.hurt(this.gen(o), P.fatigue, null); this.e({ k: "fatigue", o, n: P.fatigue }); continue; } const c = P.deck.pop(); if (P.hand.length < HAND_MAX) { P.hand.push(c); this.e({ k: "draw", o, c }); } else this.e({ k: "burn", o, c }); } }
    startTurn(o) { this.cur = o; const P = this.p[o]; P.max = Math.min(MAX_MANA, P.max + (P.max === 0 ? 2 : 1)); P.mana = P.max; if (P.cd > 0) P.cd--;
      for (const u of this.mine(o)) { u.moved = false; u.acted = false; u.sick = false; }
      for (const u of this.mine(o)) if (this.ter(u.x, u.y) === "encru") { P.mana++; this.e({ k: "cross", o, x: u.x, y: u.y }); }
      if (this.turn > 1) this.draw(o); this.e({ k: "turn", o, turn: this.turn }); }
    endTurn() { if (this.over) return; const o = this.cur;
      for (const u of this.mine(o)) { const C = this.U(u); if (C && C.endHeal) for (const a of this.mine(o)) if (cheb(a, u) === 1 && a.hp < a.max) { a.hp = Math.min(a.max, a.hp + C.endHeal); this.e({ k: "heal", id: a.id, n: C.endHeal }); } }
      for (const u of this.mine(o)) { if (u.rooted) u.rooted--; if (u.stunned) u.stunned--; }
      this.turn++; this.startTurn(1 - o); }
    // ----- dano e morte -----
    hurt(u, n, src) { if (!u || u.hp <= 0 || n <= 0) return; u.hp -= n; this.e({ k: "dmg", id: u.id, n, x: u.x, y: u.y }); }
    reap() { for (let guard = 0; guard < 10; guard++) { const dead = this.units.filter(u => u.hp <= 0 && !u.gone); if (!dead.length) break;
        for (const u of dead) { u.gone = true; this.e({ k: "die", id: u.id, x: u.x, y: u.y });
          if (u.gen) { if (!this.over) { this.over = true; this.winner = 1 - u.o; } continue; } this.p[u.o].grave.push(u.card); const C = CARDS[u.card];
          if (C.lastBreath) for (const v of this.units) if (v.hp > 0 && v.o !== u.o && cheb(v, u) === 1) this.hurt(v, C.lastBreath, u); } }
      this.units = this.units.filter(u => !u.gone);
      const g0 = this.gen(0), g1 = this.gen(1); if (!g0 || !g1) { this.over = true; this.winner = !g0 && !g1 ? null : g0 ? 0 : 1; } }
    // ----- comandos -----
    apply(c) {
      if (this.over) return false; const o = this.cur, P = this.p[o];
      if (c.c === "end") { this.endTurn(); return true; }
      if (c.c === "play") { const ok = this.playTargets(o, c.i).some(([x, y]) => x === c.x && y === c.y); if (!ok) return false; const id = P.hand[c.i], C = CARDS[id];
        P.mana -= C.cost; P.hand.splice(c.i, 1); this.e({ k: "play", o, c: id, x: c.x, y: c.y });
        if (C.type === "unit") this.summon(o, id, c.x, c.y); else this.cast(o, id, c.x, c.y); this.reap(); return true; }
      if (c.c === "power") { if (!this.powerTargets(o).some(([x, y]) => x === c.x && y === c.y)) return false; const F = FACTIONS[P.fac].power; P.mana -= F.cost; P.cd = F.cd; const t = this.at(c.x, c.y), G = this.gen(o);
        this.e({ k: "power", o, x: c.x, y: c.y });
        if (P.fac === "mata") { const gx = G.x, gy = G.y; G.x = t.x; G.y = t.y; t.x = gx; t.y = gy; this.e({ k: "swap", a: G.id, b: t.id }); this.trap(G); this.trap(t); }
        else { this.hurt(t, 1, G); if (G.hp < G.max) { G.hp = Math.min(G.max, G.hp + 1); this.e({ k: "heal", id: G.id, n: 1 }); } }
        this.reap(); return true; }
      const u = this.units.find(z => z.id === c.id && z.hp > 0); if (!u || u.o !== o) return false;
      if (c.c === "move") { if (!this.moves(u).some(([x, y]) => x === c.x && y === c.y)) return false; const fx = u.x, fy = u.y; u.x = c.x; u.y = c.y; u.moved = true; this.e({ k: "move", id: u.id, fx, fy, x: c.x, y: c.y }); this.trap(u); this.reap(); return true; }
      if (c.c === "attack") { const t = this.attacks(u).find(z => z.x === c.x && z.y === c.y); if (!t) return false; u.acted = true; u.moved = true; this.fight(u, t); this.reap(); return true; }
      return false;
    }
    blow(v, n) { if (n > 1 && this.ter(v.x, v.y) === "mata") { this.e({ k: "cover", id: v.id, x: v.x, y: v.y }); return n - 1; } return n; }
    fight(a, t) { const A = this.U(a), T = this.U(t); this.e({ k: "attack", id: a.id, t: t.id });
      this.hurt(t, this.blow(t, this.atkOf(a)), a); if (A && A.venom && !t.gen && t.hp > 0) { t.hp = 0; this.e({ k: "venom", id: t.id }); }
      if (t.hp > 0 && !t.stunned) { this.e({ k: "counter", id: t.id, t: a.id }); this.hurt(a, this.blow(a, this.atkOf(t)), t); if (T && T.venom && !a.gen && a.hp > 0) { a.hp = 0; this.e({ k: "venom", id: a.id }); } }
      if (A && A.feast && t.hp <= 0 && !t.gen && a.hp > 0) { a.hp = a.max; this.e({ k: "heal", id: a.id, n: a.max }); } }
    trap(u) { const i = this.traps.findIndex(t => t.x === u.x && t.y === u.y && t.o !== u.o); if (i < 0) return; this.traps.splice(i, 1); this.e({ k: "trap", x: u.x, y: u.y }); this.hurt(u, 3, null); }
    summon(o, id, x, y) { const C = CARDS[id], u = { id: this.uid++, o, card: id, atk: C.atk, hp: C.hp, max: C.hp, x, y, moved: false, acted: false, sick: !C.rush, rooted: 0, stunned: 0 }; this.units.push(u); this.e({ k: "summon", id: u.id, x, y });
      this.trap(u);
      if (C.onEnter === "draw") this.draw(o);
      if (C.onEnter === "rootAround") for (const v of this.units) if (v.hp > 0 && v.o !== o && cheb(v, u) === 1) { v.rooted = 1; this.e({ k: "root", id: v.id }); }
      if (C.onEnter === "stunOne") { const vs = this.units.filter(v => v.hp > 0 && v.o !== o && cheb(v, u) === 1).sort((a, b) => this.atkOf(b) - this.atkOf(a) || a.id - b.id); if (vs[0]) { vs[0].stunned = 1; this.e({ k: "stun", id: vs[0].id }); } } }
    cast(o, id, x, y) { const t = this.at(x, y), P = this.p[o];
      if (id === "enraizar") { t.rooted = 1; this.e({ k: "root", id: t.id }); }
      else if (id === "cha") { const n = Math.min(4, t.max - t.hp); t.hp += n; this.e({ k: "heal", id: t.id, n: 4 }); }
      else if (id === "arapuca") this.traps.push({ o, x, y });
      else if (id === "pacto") { this.hurt(this.gen(o), 3, null); this.draw(o, 2); }
      else if (id === "alma") { const vs = this.units.filter(v => v.hp > 0 && v.o !== o && cheb(v, t) === 1); t.hp = 0; this.e({ k: "sacrifice", id: t.id }); for (const v of vs) this.hurt(v, 4, t); }
      else if (id === "grito") this.hurt(t, 2, null);
      else if (id === "assomb") { const cid = P.grave.pop(), G = this.gen(o); const spots = D8.map(([dx, dy]) => [G.x + dx, G.y + dy]).filter(([a, b]) => inb(a, b) && !this.at(a, b) && this.ter(a, b) !== "rio").sort((a, b) => (o === 0 ? a[1] - b[1] : b[1] - a[1]) || a[0] - b[0]);
        if (spots.length) this.summon(o, cid, spots[0][0], spots[0][1]); else P.grave.push(cid); }
    }
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
    for (const u of g.units) { if (u.hp <= 0) continue; const tt = g.ter(u.x, u.y); if (tt === "encru") s += (u.o === o ? 1 : -1) * 2.2; else if (tt === "mata" && !u.gen) s += (u.o === o ? 1 : -1) * 0.6; }
    s += (g.p[o].hand.length - g.p[1 - o].hand.length) * 0.8 + (g.traps.filter(t => t.o === o).length) * 1.2;
    return s;
  }
  // melhor ação única (com mover+atacar avaliados juntos)
  function greedy(g, o, P, R, noise) {
    const base = evaluate(g, o, P); let best = null, bv = base + 0.3;
    for (const a of g.actions()) { const h = g.clone(); if (!h.apply(a)) continue; let v = evaluate(h, o, P);
      if (P.combo && a.c === "move") { const u = h.units.find(z => z.id === a.id); if (u) for (const t of h.attacks(u)) { const h2 = h.clone(); h2.apply({ c: "attack", id: u.id, x: t.x, y: t.y }); v = Math.max(v, evaluate(h2, o, P) - 0.2); } }
      v += (R() - 0.5) * noise; if (v > bv) { bv = v; best = a; } }
    return best;
  }
  function playTurn(g, o, P, R, noise) { const plan = []; for (let i = 0; i < 20 && !g.over && g.cur === o; i++) { const a = greedy(g, o, P, R, noise); if (!a) break; g.apply(a); plan.push(a); } return plan; }
  function makeBot(level, o, seed = 9) {
    const P = LV[level] || LV.normal, R = rng(seed + o); let queue = [], qTurn = -1;
    return function next(g) {
      if (g.over || g.cur !== o) return null;
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
