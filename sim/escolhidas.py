# As 4 cartas escolhidas (Lacre, Pausa, Furto, Reverso) com as 11 do jogo: pares, Dona Coruja e quem está aprendendo.
# Uso:
#   NOVAS=lacre,pausa,furto,reverso META=16 JSON=/tmp/esc16.json python3 sim/decks.py   (antes: os números de cada deck)
#   python3 sim/escolhidas.py pares /tmp/esc16.json
#   python3 sim/escolhidas.py coruja /tmp/esc16.json      (os 10 melhores e os melhores com carta nova × Dona Coruja)
#   python3 sim/escolhidas.py descuidado /tmp/esc16.json  (cada carta contra um robô que às vezes pega o dado errado)
# PROCS=4 limita os processos; a meta vem do JSON (META do decks.py).
import sys, os, json, random, itertools, statistics
from multiprocessing import Pool
import novas as D
ESCOLHIDAS = ['lacre', 'pausa', 'furto', 'reverso']
D.ativar(ESCOLHIDAS)
PROCS = int(os.environ.get('PROCS', '4'))
DECKS = [list(d) for d in itertools.combinations(D.CARTAS, 3)
         if sum(c in D.ARMADILHAS for c in d) <= 2 and sum(c in D.PONTOS_CARTAS for c in d) <= 1]
# os decks da Dona Coruja no jogo (js/jogo.js, DECKS_CORUJA): ela sorteia um por partida
DECKS_CORUJA = [
    ['ancora', 'coringa', 'interferencia'], ['fundo', 'interferencia', 'pressa'], ['ajuste', 'fundo', 'interferencia'],
    ['ancora', 'coringa', 'rerrolar'], ['ajuste', 'ancora', 'coringa'], ['ajuste', 'ancora', 'virar'],
    ['coringa', 'pedagio', 'pressa'], ['ancora', 'coringa', 'fundo'], ['coringa', 'fundo', 'interferencia'],
]
ERRO = float(os.environ.get('ERRO', '0.3'))   # o descuidado escolhe dado e destino ao acaso nesta fração das vezes

class Partida(D.Partida):
    """Partida em que alguns jogadores são descuidados: às vezes pegam um dado qualquer e o põem em qualquer destino"""
    descuidados = ()
    def planeja(s, p):
        if p in s.descuidados and random.random() < ERRO:
            i = random.randrange(len(s.mesa)); X = s.mesa[i]
            if s.marca and s.marca[1] == i and s.marca[0] != p: X = 7 - X
            ds = s.destinos(p, X)
            return (i, random.choice(ds) if ds else 'corrente')
        return super().planeja(p)

def jogo(d0, d1, inicia, meta, descuidados=()):
    P = Partida([d0, d1], inicia=inicia, meta=meta); P.descuidados = descuidados
    return P.jogar()

def contra(args):
    """vitória do deck d contra rivais: 'coruja' (deck sorteado de DECKS_CORUJA) ou 'descuidado' (deck sorteado, erra às vezes)"""
    d, tipo, n, meta, semente = args
    random.seed(semente); w = 0
    for k in range(n):
        r = random.choice(DECKS_CORUJA if tipo == 'coruja' else DECKS); a = k % 2
        dd = [d, r] if a == 0 else [r, d]
        desc = () if tipo == 'coruja' else (1 - a,)   # o rival é quem erra
        w += jogo(dd[0], dd[1], (k // 2) % 2, meta, desc) == a
    return w / n

def pares(dados):
    import numpy as np
    cartas = sorted(D.CARTAS); ix = {c: i for i, c in enumerate(cartas)}
    decks, res = dados['decks'], np.array(dados['res'])
    X = np.zeros((len(decks), len(cartas)))
    for k, d in enumerate(decks):
        for c in d: X[k, ix[c]] = 1
    beta, *_ = np.linalg.lstsq(X, res, rcond=None)   # modelo aditivo: deck = soma das cartas
    prev = X @ beta; resid = res - prev
    out = []
    for a, b in itertools.combinations(cartas, 2):
        ks = [k for k, d in enumerate(decks) if a in d and b in d]
        if len(ks) < 3: continue
        out.append((float(resid[ks].mean()), a, b, float(res[ks].mean()), float(prev[ks].mean()), len(ks)))
    out.sort(reverse=True)
    def linha(o): return f"  {o[1]:13s} + {o[2]:13s} real {o[3]:.3f}  esperado {o[4]:.3f}  sinergia {o[0] * 100:+.1f}  ({o[5]} decks)"
    print(f"Pares (meta {dados['meta']}): sinergia = média real dos decks com as duas − o esperado pelo modelo aditivo")
    print("10 mais fortes:"); [print(linha(o)) for o in out[:10]]
    print("5 mais fracas:"); [print(linha(o)) for o in out[-5:]]
    print("Pares com carta nova:")
    for o in out:
        if o[1] in ESCOLHIDAS or o[2] in ESCOLHIDAS:
            if abs(o[0]) >= 0.015: print(linha(o))
    print("Maior |sinergia| com carta nova:", max((abs(o[0]) * 100, o[1], o[2]) for o in out if o[1] in ESCOLHIDAS or o[2] in ESCOLHIDAS))

if __name__ == '__main__':
    modo, arq = sys.argv[1], sys.argv[2]
    dados = json.load(open(arq)); meta = dados['meta']
    decks, res = dados['decks'], dados['res']
    ordem = sorted(range(len(decks)), key=lambda k: -res[k])
    if modo == 'pares':
        pares(dados)
    elif modo == 'coruja':
        alvo = [decks[k] for k in ordem[:10]]
        for c in ESCOLHIDAS:   # o melhor deck com cada carta nova
            k = next(k for k in ordem if c in decks[k])
            if decks[k] not in alvo: alvo.append(decks[k])
        n = int(os.environ.get('N', '6000'))
        with Pool(PROCS) as pool: w = pool.map(contra, [(d, 'coruja', n, meta, 500 + i) for i, d in enumerate(alvo)])
        print(f"Contra a Dona Coruja (deck sorteado de DECKS_CORUJA), meta {meta}, {n} partidas por deck:")
        for d, x in sorted(zip(alvo, w), key=lambda t: -t[1]):
            print(f"  {x:.3f}  {' + '.join(d)}  (contra o campo {res[decks.index(d)]:.3f})")
    elif modo == 'descuidado':
        n = int(os.environ.get('N', '300'))
        with Pool(PROCS) as pool: w = pool.map(contra, [(d, 'descuidado', n, meta, 900 + i) for i, d in enumerate(decks)], chunksize=4)
        print(f"Contra um robô descuidado ({ERRO:.0%} das escolhas ao acaso, deck sorteado), meta {meta}, {n} partidas por deck:")
        print(f"  todos os decks: {statistics.mean(w):.3f} (contra o robô esperto: {statistics.mean(res):.3f})")
        linhas = []
        for c in sorted(D.CARTAS):
            ks = [k for k, d in enumerate(decks) if c in d]
            mc = statistics.mean(w[k] for k in ks); me = statistics.mean(res[k] for k in ks)
            linhas.append((mc - me, c, mc, me))
        for g, c, mc, me in sorted(linhas, reverse=True):
            print(f"  {c:13s} contra o descuidado {mc:.3f}  contra o esperto {me:.3f}  diferença {g * 100:+.1f}{'  (nova)' if c in ESCOLHIDAS else ''}")
        print("  melhores contra o descuidado:", "; ".join(f"{w[k]:.3f} {'+'.join(decks[k])}" for k in sorted(range(len(decks)), key=lambda k: -w[k])[:5]))
