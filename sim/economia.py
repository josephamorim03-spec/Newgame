# Progressão do Dice Duel: (1) comprar cartas não pode dar vantagem (nada de pagar para vencer);
# (2) quantas moedas uma vitória rende com a fórmula de margem e rapidez.
# Uso: python3 sim/economia.py
import random, itertools, statistics as E
from multiprocessing import Pool
import deck as D

GRATIS = ['ajuste', 'virar', 'pressa', 'coringa', 'ancora', 'interferencia']   # já vêm liberadas
COMPRA = [c for c in D.CARTAS if c not in GRATIS]                            # se compram com moedas
PONTOS = {'interferencia', 'pedagio', 'sobrecarga'}
valido = lambda d: sum(c in D.ARMADILHAS for c in d) <= 2 and sum(c in PONTOS for c in d) <= 1
TODOS = [list(d) for d in itertools.combinations(D.CARTAS, 3) if valido(d)]

def contra_campo(d, n=2400, seed=0):
    random.seed(seed); w = 0
    for k in range(n):
        r = random.choice(TODOS); a = k % 2
        w += D.Partida([d, r] if a == 0 else [r, d], inicia=(k // 2) % 2).jogar() == (0 if a == 0 else 1)
    return w / n

def melhor(decks):
    with Pool() as pool: res = pool.starmap(contra_campo, [(d, 1200, i) for i, d in enumerate(decks)])
    k = max(range(len(decks)), key=lambda i: res[i]); return decks[k], res[k], res

def partidas(n=6000):
    # vitórias entre robôs espertos com decks sorteados: margem e número de Mesas
    random.seed(5); out = []
    for k in range(n):
        P = D.Partida([random.choice(TODOS), random.choice(TODOS)], inicia=k % 2); w = P.jogar()
        out.append((P.j[w].pts - P.j[1 - w].pts, P.rodadas))
    return out

def moedas(base, margem, rodadas, meta=12):
    """base do modo × margem (×1,0 a ×2,0) × rapidez (×1,0 a ×1,5); a escala acompanha a meta."""
    mm = 1 + min(1.0, max(0, margem) / (meta * 2 / 3))           # vencer por 8+ (meta 12) dobra
    rapida, normal = round(meta * 5 / 12), round(meta * 6 / 12)   # em Mesas: 5 e 6 com meta 12
    mr = 1.5 if rodadas <= rapida else 1.25 if rodadas <= normal else 1.0
    return round(base * mm * mr)

if __name__ == '__main__':
    gratis = [d for d in TODOS if all(c in GRATIS for c in d)]
    com_compra = [d for d in TODOS if any(c in COMPRA for c in d)]
    dg, wg, _ = melhor(gratis); dc, wc, rc = melhor(com_compra)
    print(f"Cartas grátis: {', '.join(GRATIS)}\nCartas à venda: {', '.join(COMPRA)}")
    print(f"Melhor deck só com cartas grátis: {' + '.join(dg)} vence {wg:.3f} contra o campo")
    print(f"Melhor deck com alguma carta comprada: {' + '.join(dc)} vence {wc:.3f}")
    print(f"Decks com carta comprada acima do melhor grátis: {sum(r > wg + 0.01 for r in rc)} de {len(rc)}")
    pts = partidas()
    marg = sorted(m for m, _ in pts); rod = sorted(r for _, r in pts)
    q = lambda xs, p: xs[int(p * (len(xs) - 1))]
    print(f"\nMargem da vitória: p25 {q(marg, .25)} · mediana {q(marg, .5)} · p75 {q(marg, .75)} · p90 {q(marg, .9)}")
    print(f"Mesas por partida: p25 {q(rod, .25)} · mediana {q(rod, .5)} · p75 {q(rod, .75)}")
    for base, nome in [(8, 'Biscoito (iniciante)'), (14, 'Dona Coruja (avançado)'), (22, 'Online')]:
        ms = sorted(moedas(base, m, r) for m, r in pts)
        print(f"  {nome:24s} moedas por vitória: p25 {q(ms, .25)} · mediana {q(ms, .5)} · p75 {q(ms, .75)} · máx {ms[-1]} · média {E.mean(ms):.1f}")
