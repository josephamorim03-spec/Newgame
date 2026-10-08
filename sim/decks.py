# Todos os decks válidos (até 3 cartas, no máx. 2 armadilhas e 1 carta de pontos) contra rivais sorteados.
# Mostra os melhores e piores, quanto cada carta aparece no topo e se algum deck domina.
# Uso: python3 sim/decks.py
import random, itertools, statistics, os
from collections import Counter
from multiprocessing import Pool
import deck as D
PONTOS = {'interferencia', 'pedagio', 'sobrecarga'}
MAXP = int(os.environ.get('MAXP', '1'))
DECKS = [list(d) for d in itertools.combinations(D.CARTAS, 3)
         if sum(c in D.ARMADILHAS for c in d) <= 2 and sum(c in PONTOS for c in d) <= MAXP]
def avalia(k):
    random.seed(1000 + k); d = DECKS[k]; w = n = 0
    for r in random.sample(range(len(DECKS)), 60):
        for g in range(20):
            a = g % 2; dd = [d, DECKS[r]] if a == 0 else [DECKS[r], d]
            w += D.Partida(dd, inicia=(g // 2) % 2).jogar() == (0 if a == 0 else 1); n += 1
    return w / n
if __name__ == '__main__':
    with Pool() as pool: res = pool.map(avalia, range(len(DECKS)))
    ordem = sorted(range(len(DECKS)), key=lambda k: -res[k])
    print(f"{len(DECKS)} decks, 1.200 partidas por deck contra rivais sorteados")
    print("Melhores:"); [print(f"  {res[k]:.3f}  {' + '.join(DECKS[k])}") for k in ordem[:10]]
    print("Piores:"); [print(f"  {res[k]:.3f}  {' + '.join(DECKS[k])}") for k in ordem[-5:]]
    top = Counter(c for k in ordem[:25] for c in DECKS[k])
    print("Presença nos 25 melhores:", ", ".join(f"{c} {top[c]}" for c in sorted(D.CARTAS, key=lambda c: -top[c])))
    media = {c: statistics.mean(res[k] for k in range(len(DECKS)) if c in DECKS[k]) for c in D.CARTAS}
    print("Vitória média dos decks com a carta:", ", ".join(f"{c} {media[c]:.3f}" for c in sorted(D.CARTAS, key=lambda c: -media[c])))
    print(f"Desvio entre decks {statistics.pstdev(res):.3f} | faixa {min(res):.3f}–{max(res):.3f} | acima de 0,58: {sum(r > 0.58 for r in res)}")
