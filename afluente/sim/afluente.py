"""Simulador de regras do Afluente (v0.2 e variantes v0.3).

Motor puro + bots. Uso: python3 afluente.py
"""
import random
from collections import deque
from dataclasses import dataclass, field

DIRS = [(1, 0), (1, -1), (0, -1), (-1, 0), (-1, 1), (0, 1)]
OPP = lambda i: (i + 3) % 6
CHANNELS = {"none": (), "reto": (0, 3), "suave": (0, 2), "fechada": (0, 1), "bif": (0, 2, 4)}


def add(c, d):
    return (c[0] + DIRS[d][0], c[1] + DIRS[d][1])


def ring_dist(c):
    q, r = c
    return max(abs(q), abs(r), abs(q + r))


def rotations(ch):
    seen, out = set(), []
    for k in range(6):
        p = frozenset((x + k) % 6 for x in CHANNELS[ch])
        if p not in seen:
            seen.add(p)
            out.append(p)
    return out


@dataclass
class Rules:
    turns: int = 32
    terrain: dict = field(default_factory=lambda: {"C": 14, "B": 12, "V": 6})
    channels: dict = field(default_factory=lambda: {"none": 14, "reto": 5, "suave": 6, "fechada": 5, "bif": 2})
    w: dict = field(default_factory=lambda: dict(E=1, R=1, C=4, B=3, V=7, XCB=2, XBB=2, XVB=3, F=15))
    pulse_mult: int = 2
    pulse_cap: int = 4
    harvest_turns: tuple = ()        # turnos ao fim dos quais há Colheita
    harvest_w: dict = field(default_factory=lambda: dict(C=1, B=1, V=2))
    harvest_foz_mult: float = 1.0    # multiplicador da Colheita se a foz estiver ligada
    board_score: bool = True         # pontua o tabuleiro final (v0.2) ou só colheitas
    rocks: int = 4
    removed: int = 10
    radius: int = 4


def make_valley(rng, rules):
    while True:
        R = rules.radius
        cells = {(q, r) for q in range(-R, R + 1) for r in range(-R, R + 1) if ring_dist((q, r)) <= R}
        outer = [c for c in cells if ring_dist(c) == R]
        rng.shuffle(outer)
        removed = 0
        for c in outer:
            if removed == rules.removed:
                break
            trial = cells - {c}
            if connected(trial):
                cells = trial
                removed += 1
        edge = [c for c in cells if any(add(c, d) not in cells for d in range(6))]
        src = rng.choice(edge)
        far = [c for c in edge if hexdist(c, src) >= 2 * R - 1]
        if not far:
            continue
        snk = rng.choice(far)
        sp, kp = inward(src, cells), inward(snk, cells)
        protected = {src, snk, add(src, sp), add(snk, kp)}
        cand = [c for c in cells if c not in protected]
        rng.shuffle(cand)
        rocks = set()
        for c in cand:
            if len(rocks) == rules.rocks:
                break
            if connected(cells - rocks - {c} - {src, snk} | {src}):
                rocks.add(c)
        build = cells - rocks - {src, snk}
        if len(build) >= rules.turns and connected(build | {src}):
            return dict(cells=cells, src=src, snk=snk, sport=sp, kport=kp, rocks=rocks, build=build)


def hexdist(a, b):
    return ring_dist((a[0] - b[0], a[1] - b[1]))


def inward(c, cells):
    opts = [d for d in range(6) if add(c, d) in cells]
    return min(opts, key=lambda d: ring_dist(add(c, d)))


def connected(cells):
    if not cells:
        return True
    start = next(iter(cells))
    seen, dq = {start}, deque([start])
    while dq:
        c = dq.popleft()
        for d in range(6):
            n = add(c, d)
            if n in cells and n not in seen:
                seen.add(n)
                dq.append(n)
    return len(seen) == len(cells)


def make_deck(rng, rules):
    ter = [t for t, n in rules.terrain.items() for _ in range(n)]
    ch = [c for c, n in rules.channels.items() for _ in range(n)]
    assert len(ter) == len(ch) == rules.turns, (len(ter), len(ch))
    rng.shuffle(ter)
    rng.shuffle(ch)
    return list(zip(ter, ch))


def evaluate(v, board, rules):
    """board: cell -> (terreno, portas). Retorna dict de grandezas."""
    def ports(c):
        if c == v["src"]:
            return {v["sport"]}
        if c == v["snk"]:
            return {v["kport"]}
        return board[c][1] if c in board else ()

    seen, dq = {v["src"]}, deque([v["src"]])
    while dq:
        c = dq.popleft()
        for d in ports(c):
            n = add(c, d)
            if n in seen:
                continue
            if (n in board or n == v["snk"]) and OPP(d) in ports(n):
                seen.add(n)
                dq.append(n)
    A = {c for c in seen if c in board}
    F = int(v["snk"] in seen)
    irr = set(A)
    for a in A:
        for d in range(6):
            n = add(a, d)
            if n in board:
                irr.add(n)
    C = {c for c in irr if board[c][0] == "C"}
    B = {c for c in irr if board[c][0] == "B"}
    nb = lambda c: [add(c, d) for d in range(6)]
    V = {c for c in irr if board[c][0] == "V" and any(n in C for n in nb(c))}
    E = sum(1 for c in board for d in (0, 1, 5) if add(c, d) in board and board[add(c, d)][0] == board[c][0])
    XCB = sum(1 for c in C if any(n in B for n in nb(c)))
    XBB = sum(1 for c in B if any(n in B and n != c for n in nb(c)))
    XVB = sum(1 for c in V if any(n in B for n in nb(c)))
    q = dict(E=E, R=len(A), C=len(C), B=len(B), V=len(V), XCB=XCB, XBB=XBB, XVB=XVB, F=F)
    q["board"] = sum(rules.w[k] * q[k] for k in rules.w) if rules.board_score else 0
    q["harvest"] = (rules.harvest_w["C"] * q["C"] + rules.harvest_w["B"] * q["B"] + rules.harvest_w["V"] * q["V"]) \
        * (rules.harvest_foz_mult if F else 1.0)
    q["irrigated"] = len(irr)
    return q


class Game:
    def __init__(self, seed, rules):
        self.rules = rules
        rng = random.Random(seed)
        self.v = make_valley(rng, rules)
        self.queue = make_deck(rng, rules)
        self.hand = [self.queue.pop(0) for _ in range(3)]
        self.board = {}
        self.turn = 0
        self.pulse_total = 0
        self.harvest_total = 0.0
        self.q = evaluate(self.v, self.board, rules)
        self.log = []

    def legal_cells(self):
        out = set()
        for c in list(self.board) + [self.v["src"]]:
            for d in range(6):
                n = add(c, d)
                if n in self.v["build"] and n not in self.board:
                    out.add(n)
        return out

    def moves(self):
        for hi, (t, ch) in enumerate(self.hand):
            for c in self.legal_cells():
                for p in rotations(ch):
                    yield hi, c, p

    def outcome(self, hi, cell, ports):
        """Pré-visualização pura: retorna (delta_total, q_novo, pulso, colheita)."""
        r = self.rules
        b = dict(self.board)
        b[cell] = (self.hand[hi][0], ports)
        q = evaluate(self.v, b, r)
        N = (q["C"] - self.q["C"]) + (q["B"] - self.q["B"]) + (q["V"] - self.q["V"])
        pulse = r.pulse_mult * min(r.pulse_cap, max(0, N - 2))
        harv = q["harvest"] if (self.turn + 1) in r.harvest_turns else 0
        delta = q["board"] - self.q["board"] + pulse + harv
        return delta, q, pulse, harv, b

    def play(self, hi, cell, ports):
        delta, q, pulse, harv, b = self.outcome(hi, cell, ports)
        self.board = b
        self.q = q
        self.pulse_total += pulse
        self.harvest_total += harv
        self.hand.pop(hi)
        if self.queue:
            self.hand.append(self.queue.pop(0))
        self.turn += 1
        self.log.append(dict(turn=self.turn, irrigated=q["irrigated"], placed=len(b), pulse=pulse, delta=delta))

    def total(self):
        return self.q["board"] + self.pulse_total + self.harvest_total

    def done(self):
        return self.turn >= self.rules.turns


# ---------------------------------------------------------------- bots

def bot_random(g, rng):
    return rng.choice(list(g.moves()))


def bot_greedy(g, rng):
    best, bv = None, -1e9
    for m in g.moves():
        val = g.outcome(*m)[0] + rng.random() * 1e-3
        if val > bv:
            best, bv = m, val
    return best


def run(seed, rules, bot, bot_seed=0):
    g = Game(seed, rules)
    rng = random.Random(bot_seed * 7919 + seed)
    while not g.done():
        g.play(*bot(g, rng))
    return g


def active_frontier(g, board, q_cells=None):
    """Portas ATIVAS (alimentadas pela nascente) que apontam para célula livre construível."""
    v = g.v
    # recomputa conjunto ativo
    def ports(c):
        if c == v["src"]:
            return {v["sport"]}
        return board[c][1] if c in board else ()
    seen, dq = {v["src"]}, deque([v["src"]])
    while dq:
        c = dq.popleft()
        for d in ports(c):
            n = add(c, d)
            if n in board and n not in seen and OPP(d) in ports(n):
                seen.add(n); dq.append(n)
    front = set()
    for c in seen:
        for d in ports(c):
            n = add(c, d)
            if n in v["build"] and n not in board:
                front.add(n)
    dist = min((hexdist(c, v["snk"]) for c in seen), default=12)
    return front, dist


def make_bot_river(w_front=5.0, w_dist=2.5):
    """Jogador competente: protege e estende o rio ativo, busca a foz, e no resto é guloso."""
    def bot(g, rng):
        best, bv = None, -1e9
        remaining = g.rules.turns - g.turn - 1
        for m in g.moves():
            delta, q, pulse, harv, b = g.outcome(*m)
            front, dist = active_frontier(g, b)
            fut = 0.0
            if remaining > 0:
                fut = w_front * min(len(front), 3) - (0 if q["F"] else w_dist * dist)
            val = delta + fut + rng.random() * 1e-3
            if val > bv:
                best, bv = m, val
        return best
    return bot
