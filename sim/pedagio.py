# Quanto o Pedágio decide a partida: em que fração das partidas ele dispara, quantas vezes os pontos dele dão
# a vitória direto ao dono (o rival dispara sem chegar à meta e o Pedágio leva o dono até ela), quantas vezes os
# dois passam da meta juntos (vence quem disparou) e a vitória dos decks com ele.
# Uso: META=12 BAL='{"pedagio": 2}' NOVAS=pausa,reverso,furto,lacre python3 sim/pedagio.py
import os, random, itertools, statistics
from collections import Counter
from multiprocessing import Pool
NOVAS = [c for c in os.environ.get('NOVAS', '').split(',') if c]
if NOVAS:
    import novas as D
    D.ativar(NOVAS)
else:
    import deck as D
META = int(os.environ.get('META', '12'))
N = int(os.environ.get('N', '40000'))
DECKS = [list(d) for d in itertools.combinations(D.CARTAS, 3)
         if sum(c in D.ARMADILHAS for c in d) <= 2 and sum(c in D.PONTOS_CARTAS for c in d) <= 1]
COM = [d for d in DECKS if 'pedagio' in d]

_fire = D.Partida.fire
def fire(s, p):
    r = s.j[1 - p]; armado = r.armada == 'pedagio'
    antes_dono, antes_disp = r.pts, s.j[p].pts
    _fire(s, p)
    if armado:
        dono = 1 - p
        s.reg['disparou'] = True
        roubo = s.vencedor == dono and s.j[p].pts < s.meta          # o Pedágio levou o dono à meta no disparo do rival
        juntos = s.j[p].pts >= s.meta and r.pts >= s.meta              # os dois passaram: vence quem disparou
        s.reg.update(roubo=roubo, juntos=juntos, ganho=r.pts - antes_dono)
D.Partida.fire = fire

def lote(k):
    random.seed(7000 + k)
    out = Counter()
    for _ in range(N // 8):
        d = random.choice(COM); o = random.choice(DECKS)
        a = random.randrange(2); dd = [d, o] if a == 0 else [o, d]
        P = D.Partida(dd, inicia=random.randrange(2), meta=META); P.reg = {}
        w = P.jogar()
        out['partidas'] += 1; out['venceu'] += (w == a)
        if P.reg.get('disparou'):
            out['disparou'] += 1; out['venceu_disparou'] += (w == a)
            out['roubo'] += P.reg['roubo']; out['juntos'] += P.reg['juntos']
    return out

if __name__ == '__main__':
    with Pool(int(os.environ.get('PROCS', '4'))) as pool: tot = sum(pool.map(lote, range(8)), Counter())
    n = tot['partidas']
    print(f"meta {META}, Pedágio {D.BAL['pedagio16'] if META >= 16 else D.BAL['pedagio']}: {n} partidas de decks com Pedágio contra o campo")
    print(f"  vitória dos decks com Pedágio: {tot['venceu'] / n:.1%}")
    print(f"  o Pedágio disparou em {tot['disparou'] / n:.1%} das partidas; quando dispara, o dono vence {tot['venceu_disparou'] / max(1, tot['disparou']):.1%}")
    print(f"  vitória entregue direto pelo Pedágio (o rival disparou e o dono chegou à meta): {tot['roubo'] / n:.1%} das partidas")
    print(f"  os dois passaram da meta no mesmo disparo (vence quem disparou): {tot['juntos'] / n:.1%} das partidas")
