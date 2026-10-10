# Todos os decks válidos (até 3 cartas, no máx. 2 armadilhas e 1 carta de pontos) contra rivais sorteados.
# Mostra os melhores e piores, quanto cada carta aparece no topo e se algum deck domina.
# Uso: python3 sim/decks.py                 (as 11 cartas do jogo)
#      NOVAS=pausa,furto python3 sim/decks.py   (soma cartas propostas de sim/novas.py)
#      PROCS=4 limita os processos (a máquina pode ser compartilhada); JSON=arquivo grava os números
#      CONFIRMA=6000 joga de novo os 8 melhores (CONFIRMA_N=10: os 10) com mais partidas (1.200 têm ruído de ±1,4 ponto)
#      META=20 joga até 20 pontos (o padrão é 16, como no jogo; 24 também; 12 era a de antes da v0.12); a Mesa é sempre de 5 dados
import random, itertools, statistics, os, json
from collections import Counter
from multiprocessing import Pool
NOVAS = [c for c in os.environ.get('NOVAS', '').split(',') if c]
if NOVAS:
    import novas as D
    D.ativar(NOVAS)
else:
    import deck as D
MAXP = int(os.environ.get('MAXP', '1'))
PROCS = int(os.environ.get('PROCS', '4'))
META = int(os.environ.get('META', '16'))
CONFIRMA_N = int(os.environ.get('CONFIRMA_N', '8'))
DECKS = [list(d) for d in itertools.combinations(D.CARTAS, 3)
         if sum(c in D.ARMADILHAS for c in d) <= 2 and sum(c in D.PONTOS_CARTAS for c in d) <= MAXP]
def avalia(k, rivais=60, semente=1000):
    random.seed(semente + k); d = DECKS[k]; w = n = 0
    for r in random.choices(range(len(DECKS)), k=rivais) if rivais > len(DECKS) else random.sample(range(len(DECKS)), rivais):
        for g in range(20):
            a = g % 2; dd = [d, DECKS[r]] if a == 0 else [DECKS[r], d]
            w += D.Partida(dd, inicia=(g // 2) % 2, meta=META).jogar() == (0 if a == 0 else 1); n += 1
    return w / n
if __name__ == '__main__':
    with Pool(PROCS) as pool: res = pool.map(avalia, range(len(DECKS)), chunksize=4)
    ordem = sorted(range(len(DECKS)), key=lambda k: -res[k])
    print(f"{len(DECKS)} decks, 1.200 partidas por deck contra rivais sorteados, meta {META}" + (f" (com {', '.join(NOVAS)})" if NOVAS else ""))
    print("Melhores:"); [print(f"  {res[k]:.3f}  {' + '.join(DECKS[k])}") for k in ordem[:10]]
    print("Piores:"); [print(f"  {res[k]:.3f}  {' + '.join(DECKS[k])}") for k in ordem[-5:]]
    top = Counter(c for k in ordem[:25] for c in DECKS[k])
    print("Presença nos 25 melhores:", ", ".join(f"{c} {top[c]}" for c in sorted(D.CARTAS, key=lambda c: -top[c])))
    media = {c: statistics.mean(res[k] for k in range(len(DECKS)) if c in DECKS[k]) for c in D.CARTAS}
    print("Vitória média dos decks com a carta:", ", ".join(f"{c} {media[c]:.3f}" for c in sorted(D.CARTAS, key=lambda c: -media[c])))
    melhor = {c: max(res[k] for k in range(len(DECKS)) if c in DECKS[k]) for c in D.CARTAS}
    print("Melhor deck com a carta:", ", ".join(f"{c} {melhor[c]:.3f}" for c in sorted(D.CARTAS, key=lambda c: -melhor[c])))
    print(f"Desvio entre decks {statistics.pstdev(res):.3f} | faixa {min(res):.3f}–{max(res):.3f} | acima de 0,58: {sum(r > 0.58 for r in res)}")
    if os.environ.get('CONFIRMA'):
        n = int(os.environ['CONFIRMA']) // 20
        with Pool(PROCS) as pool: conf = pool.starmap(avalia, [(k, n, 77000) for k in ordem[:CONFIRMA_N]])
        print(f"Confirmação dos {CONFIRMA_N} melhores com {n * 20} partidas cada:")
        for k, c in sorted(zip(ordem[:CONFIRMA_N], conf), key=lambda x: -x[1]): print(f"  {c:.3f}  (antes {res[k]:.3f})  {' + '.join(DECKS[k])}")
        confirmados = {'+'.join(DECKS[k]): c for k, c in zip(ordem[:CONFIRMA_N], conf)}
    if os.environ.get('JSON'):
        json.dump({'decks': DECKS, 'res': res, 'media': media, 'top': dict(top), 'melhor': melhor, 'meta': META,
                   'confirmados': confirmados if os.environ.get('CONFIRMA') else {}}, open(os.environ['JSON'], 'w'))
