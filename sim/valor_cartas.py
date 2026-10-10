# Quanto cada carta vale sozinha: deck de 1 carta contra deck vazio (50% = não muda nada).
# Uso: python3 sim/valor_cartas.py [partidas]   (NOVAS=pausa,furto soma cartas propostas; PROCS=4 limita os processos)
import random, sys, os
from multiprocessing import Pool
NOVAS = [c for c in os.environ.get('NOVAS', '').split(',') if c]   # cartas propostas (sim/novas.py)
if NOVAS:
    import novas as D
    D.ativar(NOVAS)
else:
    import deck as D
N = int(sys.argv[1]) if len(sys.argv) > 1 else 16000
META = int(os.environ.get("META", "16"))   # meta da partida (16, 20 ou 24; 12 era a de antes da v0.12)
def valor(c):
    random.seed(9); w = 0; usos = 0
    for i in range(N):
        a = i % 2
        P = D.Partida([[c], []] if a == 0 else [[], [c]], inicia=(i // 2) % 2, meta=META)
        dono = 0 if a == 0 else 1
        w += P.jogar() == dono; usos += any(u.startswith(c) for u in P.j[dono].usou)
    return c, w / N, usos / N
if __name__ == '__main__':
    with Pool(int(os.environ.get("PROCS", "4"))) as pool: res = pool.map(valor, D.CARTAS)
    for c, w, u in sorted(res, key=lambda x: -x[1]):
        print(f"  {c:13s} {'armadilha' if c in D.ARMADILHAS else 'efeito':9s} vence {w:.3f}  usada em {u:.0%} das partidas")
