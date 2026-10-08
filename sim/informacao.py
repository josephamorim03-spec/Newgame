# Quanto cada armadilha perde quando o rival sabe mais (oculto, aviso de "armada", deck à mostra, marca do Espelho à mostra).
# Uso: python3 sim/informacao.py [partidas]
import random, sys
from multiprocessing import Pool
import deck as D
N = int(sys.argv[1]) if len(sys.argv) > 1 else 16000
MODOS = ['oculto', 'aviso', 'deck', 'marca']
def valor(args):
    c, info = args; random.seed(11); w = 0
    for i in range(N):
        a = i % 2
        P = D.Partida([[c], []] if a == 0 else [[], [c]], inicia=(i // 2) % 2, info=info)
        w += P.jogar() == (0 if a == 0 else 1)
    return w / N
if __name__ == '__main__':
    traps = sorted(D.ARMADILHAS)
    with Pool() as pool: res = pool.map(valor, [(c, m) for c in traps for m in MODOS])
    print(f"  {'':13s} " + " ".join(f"{m:>8s}" for m in MODOS))
    for k, c in enumerate(traps):
        print(f"  {c:13s} " + " ".join(f"{res[k * 4 + j]:8.3f}" for j in range(4)))
