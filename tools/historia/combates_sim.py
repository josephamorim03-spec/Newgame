# Os combates do modo história no simulador (docs/historia-combates.md): o deck de cada bicho contra todos os decks que
# o jogador pode montar naquele ponto (as cartas grátis + as que a história já deu), os dois lados jogando "como gente"
# (sim/humano.py). Mostra quanto o jogador vence e quais cartas dele mais ajudam e atrapalham contra cada bicho.
# Uso: python3 tools/historia/combates_sim.py [partidas por deck]        (a proposta; 600 por padrão)
#      CAPS='{"C1": {"meta": 12, "deck": ["reverso"], "ganhos": []}}' python3 tools/historia/combates_sim.py 300
#      Cada capítulo: meta, deck do bicho, ganhos (as cartas que a história já deu), e as regras da casa que o
#      simulador conhece: dispmin (o Urso só dispara com 5+) e bolso (o bicho começa com um dado no Bolso). PROCS=4
import sys, os, random, itertools, json
SIM = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'sim')
sys.path.insert(0, SIM); os.chdir(SIM)
import humano as H
from multiprocessing import Pool
NP = int(sys.argv[1]) if len(sys.argv) > 1 else 600
GRATIS = ['ajuste', 'virar', 'pressa', 'coringa', 'ancora', 'interferencia']
PONTOS = {'interferencia', 'pedagio', 'sobrecarga'}
ARM = {'espelho', 'interferencia', 'fundo', 'pedagio', 'ancora', 'lacre'}
G2 = ['reverso']; G3 = G2 + ['fundo']; G5 = G3 + ['furto']; G6 = G5 + ['espelho']
CAPS = json.loads(os.environ.get('CAPS', 'null')) or {
    'C1': dict(meta=12, deck=['reverso'], ganhos=[]),
    'C2': dict(meta=12, deck=['pressa', 'sobrecarga'], ganhos=G2),
    'C3': dict(meta=16, deck=['fundo', 'virar'], ganhos=G2),
    'C4': dict(meta=16, deck=['pausa', 'ancora', 'ajuste'], ganhos=G3, dispmin=5),
    'C5': dict(meta=16, deck=['furto', 'pedagio', 'ajuste'], ganhos=G3, bolso=True),
    'C6': dict(meta=16, deck=['espelho', 'rerrolar', 'ancora'], ganhos=G5),
    'C7': dict(meta=16, deck=['lacre', 'coringa', 'interferencia'], ganhos=G6),
    'C8': dict(meta=16, deck=['virar', 'espelho', 'pressa'], ganhos=G6 + ['lacre'], bolso=True),   # o Lacre vem da Loja
}

def validos(cartas):
    return [list(d) for d in itertools.combinations(sorted(set(cartas)), 3)
            if sum(c in ARM for c in d) <= 2 and sum(c in PONTOS for c in d) <= 1]

def joga(args):
    cap, pdeck, semente = args; c = CAPS[cap]; random.seed(semente); w = 0
    for g in range(NP):
        P = H.Partida([pdeck, c['deck']], ('humano', 'humano'), inicia=g % 2, meta=c['meta'])
        if c.get('bolso'): P.j[1].bolso = random.randint(1, 6)
        if c.get('dispmin'):
            quer = P.quer_disparar
            P.quer_disparar = lambda p, quer=quer: quer(p) and (p == 0 or len(P.j[p].cor) >= c['dispmin'])
        w += P.jogar() == 0
    return cap, tuple(pdeck), w / NP

if __name__ == '__main__':
    tarefas = [(cap, d, 1000 + i) for cap, c in CAPS.items() for i, d in enumerate(validos(GRATIS + c['ganhos']))]
    res = {}
    with Pool(int(os.environ.get('PROCS', '4'))) as pool:
        for cap, d, w in pool.imap_unordered(joga, tarefas): res.setdefault(cap, []).append((w, d))
    for cap in CAPS:
        ws = sorted(res[cap]); media = sum(w for w, _ in ws) / len(ws)
        def com(c, tem): xs = [w for w, d in ws if (c in d) == tem]; return sum(xs) / max(1, len(xs))
        delta = sorted(((com(c, True) - com(c, False), c) for c in {c for _, d in ws for c in d}), reverse=True)
        print(f"{cap} {CAPS[cap]['deck']}: o jogador vence {media:.1%} (média de {len(ws)} decks); "
              f"pior {ws[0][0]:.0%} {list(ws[0][1])}; melhor {ws[-1][0]:.0%} {list(ws[-1][1])}")
        print('   ajuda:', ', '.join(f'{c} {v:+.1%}' for v, c in delta[:3]), '| atrapalha:', ', '.join(f'{c} {v:+.1%}' for v, c in delta[-2:]))
