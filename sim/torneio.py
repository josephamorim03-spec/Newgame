# Torneio entre os decks mais fortes: cada um dos N melhores (de um JSON de sim/decks.py) contra todos os outros.
# Contra o campo inteiro os melhores decks passam de 60% porque o campo tem muitos decks fracos; aqui se vê se algum
# deck domina os outros fortes (o que um jogador de verdade encontraria).
# Uso: META=12 NOVAS=pausa,reverso,furto,lacre JSON=/tmp/m12.json TOP=20 N=600 python3 sim/torneio.py
import os, json, random, itertools
from multiprocessing import Pool
NOVAS = [c for c in os.environ.get('NOVAS', '').split(',') if c]
if NOVAS:
    import novas as D
    D.ativar(NOVAS)
else:
    import deck as D
META = int(os.environ.get('META', '12')); TOP = int(os.environ.get('TOP', '20')); N = int(os.environ.get('N', '600'))
dados = json.load(open(os.environ['JSON']))
ordem = sorted(range(len(dados['decks'])), key=lambda k: -dados['res'][k])
DECKS = [dados['decks'][k] for k in ordem[:TOP]]
def par(ij):
    i, j = ij; random.seed(31 * i + j); w = 0
    for g in range(N):
        a = g % 2; dd = [DECKS[i], DECKS[j]] if a == 0 else [DECKS[j], DECKS[i]]
        w += D.Partida(dd, inicia=(g // 2) % 2, meta=META).jogar() == a
    return i, j, w / N
if __name__ == '__main__':
    with Pool(int(os.environ.get('PROCS', '4'))) as pool: res = pool.map(par, list(itertools.combinations(range(TOP), 2)))
    m = [[0.5] * TOP for _ in range(TOP)]
    for i, j, w in res: m[i][j] = w; m[j][i] = 1 - w
    media = [sum(m[i][k] for k in range(TOP) if k != i) / (TOP - 1) for i in range(TOP)]
    print(f"meta {META}: os {TOP} melhores decks contra os outros {TOP - 1} ({N} partidas por par)")
    for i in sorted(range(TOP), key=lambda i: -media[i]):
        pior = min((m[i][k], k) for k in range(TOP) if k != i)
        print(f"  {media[i]:.3f}  {' + '.join(DECKS[i]):38s} (campo {dados['res'][ordem[i]]:.3f}; perde mais para {' + '.join(DECKS[pior[1]])}: {pior[0]:.2f})")
