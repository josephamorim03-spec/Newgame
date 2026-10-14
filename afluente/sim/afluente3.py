"""Afluente v0.3 — terrenos em cartas, canais cavados com o dedo.

Regras resumidas:
- Baralho determinístico por seed: cartas de Terreno (C/B/V) e cartas de Canal (comprimento L).
- Mão de 3 + próxima carta visível. Um turno = jogar uma carta.
- Terreno: célula livre vizinha de algo já no vale (peça, canal ou nascente).
- Canal: arrastar de uma célula com água (nascente ou canal) por até L células livres contíguas.
  Pode terminar na foz. Toda a água está sempre ligada à nascente (não existe rede seca).
- Irrigado = terreno vizinho de água (nascente, canal, foz ligada).
- Colheitas em turnos fixos pontuam o que está produtivo naquele momento.
- Pulso: N terrenos despertos na mesma jogada -> bônus.
"""
import random
from collections import deque
from dataclasses import dataclass, field
from afluente import add, ring_dist, hexdist, make_valley, connected, Rules as _R0


@dataclass
class Rules3:
    turns: int = 24
    cards: dict = field(default_factory=lambda: {"C": 7, "B": 6, "V": 3, "L2": 3, "L3": 4, "L4": 1})
    harvest_turns: tuple = (6, 12, 18, 24)
    hv: dict = field(default_factory=lambda: dict(C=2, B=1, V=3, CB=1, BB=1))  # produção por colheita
    pulse_mult: int = 2
    pulse_cap: int = 4
    flor_min: int = 99              # N mínimo de terrenos despertos juntos para virar Florada (99 = desligado)
    flor_mult: float = 2.0          # produção de terreno florido
    foz_mult: float = 1.5          # colheitas após ligar a foz
    foz_flat: int = 0
    foz_plus: int = 0              # com a foz ligada, +N por terreno produtivo em cada Cheia (inteiro, determinístico)
    hand: int = 3
    rocks: int = 4
    removed: int = 10
    radius: int = 4


def make_deck(rng, rules):
    deck = [k for k, n in rules.cards.items() for _ in range(n)]
    assert len(deck) == rules.turns, len(deck)
    rng.shuffle(deck)
    return deck


def evaluate(v, terr, water, rules, flor=frozenset()):
    """terr: cell->C/B/V ; water: set de células de canal. Retorna grandezas produtivas."""
    W = set(water) | {v["src"]}
    F = v["snk"] in water
    nb = lambda c: [add(c, d) for d in range(6)]
    irr = {c for c in terr if any(n in W for n in nb(c))}
    C = {c for c in irr if terr[c] == "C"}
    B = {c for c in irr if terr[c] == "B"}
    V = {c for c in irr if terr[c] == "V" and any(n in C for n in nb(c))}
    CB = sum(1 for c in C if any(n in B for n in nb(c)))
    BB = sum(1 for c in B if any(n in B and n != c for n in nb(c)))
    h = rules.hv
    fm = lambda S: sum(rules.flor_mult if c in flor else 1 for c in S)
    prod = h["C"] * fm(C) + h["B"] * fm(B) + h["V"] * fm(V) + h["CB"] * CB + h["BB"] * BB
    return dict(C=len(C), B=len(B), V=len(V), F=F, prod=prod, irr=len(irr), P=C | B | V)


class Game3:
    def __init__(self, seed, rules):
        self.rules = rules
        rng = random.Random(seed)
        vr = _R0(turns=rules.turns, rocks=rules.rocks, removed=rules.removed, radius=rules.radius)
        self.v = make_valley(rng, vr)
        self.queue = make_deck(rng, rules)
        self.hand = [self.queue.pop(0) for _ in range(rules.hand)]
        self.terr, self.water = {}, set()
        self.turn = 0
        self.score = dict(colheita=0.0, pulso=0, foz=0)
        self.flor = frozenset()
        self.q = evaluate(self.v, self.terr, self.water, rules)
        self.log = []

    # ------------------------------------------------ legalidade
    def free(self, c):
        return c in self.v["build"] and c not in self.terr and c not in self.water

    def terrain_cells(self):
        occ = list(self.terr) + list(self.water) + [self.v["src"]]
        return {add(c, d) for c in occ for d in range(6) if self.free(add(c, d))}

    def canal_paths(self, L):
        """Todos os caminhos simples de 1..L células livres a partir da água. A foz pode ser o último passo."""
        if self.v["snk"] in self.water:
            pass
        sources = set(self.water) | {self.v["src"]}
        out = set()

        def ext(path):
            out.add(tuple(path))
            if len(path) == L or path[-1] == self.v["snk"]:
                return
            last = path[-1]
            for d in range(6):
                n = add(last, d)
                if n in path:
                    continue
                if self.free(n) or (n == self.v["snk"] and n not in self.water):
                    ext(path + [n])

        for s in sources:
            for d in range(6):
                n = add(s, d)
                if self.free(n) or (n == self.v["snk"] and n not in self.water):
                    ext([n])
        return out

    def moves(self):
        ms = list(self._moves())
        # sem jogada legal: descarta uma carta (o turno passa); deve ser raro e é medido
        return ms or [(hi, ("X", None)) for hi in range(len(self.hand))]

    def _moves(self):
        seen = set()
        for hi, card in enumerate(self.hand):
            if card in seen:
                continue
            seen.add(card)
            if card in ("C", "B", "V"):
                for c in self.terrain_cells():
                    yield hi, ("T", c)
            else:
                for p in self.canal_paths(int(card[1])):
                    yield hi, ("W", p)

    # ------------------------------------------------ aplicação
    def outcome(self, hi, mv):
        r = self.rules
        terr, water = self.terr, self.water
        if mv[0] == "T":
            terr = dict(terr); terr[mv[1]] = self.hand[hi]
        elif mv[0] == "W":
            water = set(water) | set(mv[1])
        q = evaluate(self.v, terr, water, r, self.flor)
        newly = q["P"] - self.q["P"]
        N = len(newly)
        flor = self.flor
        if N >= r.flor_min:
            flor = self.flor | newly
            q = evaluate(self.v, terr, water, r, flor)
        q["flor"] = flor
        q["N"] = N
        pulse = r.pulse_mult * min(r.pulse_cap, max(0, N - 2))
        foz = r.foz_flat if (q["F"] and not self.q["F"]) else 0
        harv = 0.0
        if (self.turn + 1) in r.harvest_turns:
            harv = q["prod"] * (r.foz_mult if q["F"] else 1.0) + (r.foz_plus * len(q["P"]) if q["F"] else 0)
        return pulse + foz + harv, q, pulse, foz, harv, terr, water

    def play(self, hi, mv):
        delta, q, pulse, foz, harv, terr, water = self.outcome(hi, mv)
        self.terr, self.water, self.q, self.flor = terr, water, q, q["flor"]
        self.score["pulso"] += pulse
        self.score["foz"] += foz
        self.score["colheita"] += harv
        self.hand.pop(hi)
        if self.queue:
            self.hand.append(self.queue.pop(0))
        self.turn += 1
        self.log.append(dict(turn=self.turn, pulse=pulse, F=q["F"], kind=mv[0], N=q["N"], flor=len(q["flor"])))

    def total(self):
        return sum(self.score.values())

    def done(self):
        return self.turn >= self.rules.turns


# ---------------------------------------------------------------- bots

def bot_random(g, rng):
    return rng.choice(list(g.moves()))


def _foz_dist(g, water):
    W = set(water) | {g.v["src"]}
    return min(hexdist(c, g.v["snk"]) for c in W)


def _dry_ready(g, terr, water):
    """Terrenos ainda secos (combustível de Pulso)."""
    W = set(water) | {g.v["src"]}
    return sum(1 for c in terr if not any(add(c, d) in W for d in range(6)))


def make_bot(w_prod=1.0, w_dry=0.0, w_foz=0.0, w_harv_soon=True):
    """Bot paramétrico. Valor = ganho imediato + produção atual ponderada pelas colheitas restantes
    + potencial de Pulso (terrenos secos) - distância à foz."""
    def bot(g, rng):
        r = g.rules
        left_h = sum(1 for t in r.harvest_turns if t > g.turn + 1)
        best, bv = None, -1e18
        for m in g.moves():
            delta, q, pulse, foz, harv, terr, water = g.outcome(*m)
            mult = r.foz_mult if q["F"] else 1.0
            val = delta + w_prod * q["prod"] * mult * left_h
            if left_h:
                val += w_dry * _dry_ready(g, terr, water)
                if not q["F"]:
                    val -= w_foz * _foz_dist(g, water)
            val += rng.random() * 1e-3
            if val > bv:
                best, bv = m, val
        return best
    return bot


def bot_greedy(g, rng):
    best, bv = None, -1e18
    for m in g.moves():
        val = g.outcome(*m)[0] + rng.random() * 1e-3
        if val > bv:
            best, bv = m, val
    return best


def run(seed, rules, bot, bot_seed=0):
    g = Game3(seed, rules)
    rng = random.Random(bot_seed * 7919 + seed)
    while not g.done():
        g.play(*bot(g, rng))
    return g


# ---------------------------------------------------------------- bot planejador (2 lances, cartas visíveis)
import copy


def frontier(g, terr, water):
    W = set(water) | {g.v["src"]}
    return {add(c, d) for c in W for d in range(6)
            if add(c, d) in g.v["build"] and add(c, d) not in terr and add(c, d) not in water}


def dry_reachable(g, terr, water):
    """Terrenos secos que ainda têm célula livre vizinha (podem despertar com um canal)."""
    W = set(water) | {g.v["src"]}
    n = 0
    for c in terr:
        nbs = [add(c, d) for d in range(6)]
        if any(x in W for x in nbs):
            continue
        if any(x in g.v["build"] and x not in terr and x not in water for x in nbs):
            n += 1
    return n


def static_value(g, q, terr, water, turn_after, w_front=3.0, w_dry=1.2, w_foz=2.0):
    r = g.rules
    left_h = sum(1 for t in r.harvest_turns if t > turn_after)
    mult = r.foz_mult if q["F"] else 1.0
    val = (q["prod"] * mult + (r.foz_plus * len(q["P"]) if q["F"] else 0)) * left_h
    if left_h:
        val += w_front * min(len(frontier(g, terr, water)), 4)
        val += w_dry * dry_reachable(g, terr, water)
        if not q["F"]:
            val -= w_foz * _foz_dist(g, water) * (left_h / len(r.harvest_turns))
    return val


def make_planner(beam=12, **kw):
    def bot(g, rng):
        cands = []
        for m in g.moves():
            delta, q, pulse, foz, harv, terr, water = g.outcome(*m)
            cands.append((delta + static_value(g, q, terr, water, g.turn + 1, **kw) + rng.random() * 1e-3, m))
        cands.sort(key=lambda x: -x[0])
        if g.turn + 1 >= g.rules.turns:
            return cands[0][1]
        best, bv = cands[0][1], -1e18
        for v1, m in cands[:beam]:
            h = copy.copy(g)
            h.hand, h.queue, h.score, h.log = list(g.hand), list(g.queue), dict(g.score), []
            d1 = g.outcome(*m)[0]
            h.play(*m)
            v2 = -1e18
            for m2 in h.moves():
                delta, q, pulse, foz, harv, terr, water = h.outcome(*m2)
                v2 = max(v2, delta + static_value(h, q, terr, water, h.turn + 1, **kw))
            if d1 + v2 > bv:
                best, bv = m, d1 + v2
        return best
    return bot
