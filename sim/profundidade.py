# (v0.13: o blefe e o desafio saíram do jogo; este estudo fica como registro. docs/balanceamento-cartas.md §18)
# Profundidade: as cartas mudam a melhor jogada? Quanto vale ler o "?" do rival, e quanto medo do blefe compensa?
#
# Joga o jogo de hoje (15 cartas: as 11 de deck.py + Pausa, Reverso, Furto, Lacre de novas.py, Mesa de 5 dados) com
# o BLEFE, que deck.py não modela: um efeito virado ocupa o lugar da armadilha, não faz nada e, quando usado, age.
#
# Jogadores (estilo por lado):
#   ganancioso  só os próprios pontos: usa as próprias cartas, mas ignora o rival (não nega dado, não desvia do
#               Espelho, não teme o "?")
#   padrao      o robô do jogo (nega o dado que o rival precisa, desvia do Espelho; teme o "?" no Bolso com
#               probabilidade `medo`)
#   planejador  em cada escolha de dado e em cada "disparar ou segurar", simula o resto da partida `n` vezes por
#               opção (com o robô padrão dos dois lados) e fica com a que mais vence. Como trata o "?" do rival:
#                 info='oraculo'  sabe o que é (limite de quanto vale ler o rival)
#                 info='crenca'   sorteia o que é a cada simulação: armadilha escondida ou blefe (peso `q` do blefe)
#                 info='cego'     faz de conta que não há nada virado
#   blefe=b     em toda vez sem armadilha armada, com o rival de corrente 2+ e uma armadilha ainda escondida no
#               deck, vira um efeito com probabilidade b
#
# Uso: python3 sim/profundidade.py [experimento ...]   (blefe, profundidade, leitura, decisoes; sem nada: todos)
#      N=600 partidas por confronto · ROLL=16 simulações por opção · META=12 · PROCS=4
import random, copy, os, sys, json, itertools, statistics
from multiprocessing import Pool
import deck as D
import novas as N
from deck import encaixa
N.ativar(['pausa', 'reverso', 'furto', 'lacre'])
EFE = set(N.EFEITOS)
ARM = set(N.ARMADILHAS)
PTS = set(N.PONTOS_CARTAS)
META = int(os.environ.get('META', '12'))
NPART = int(os.environ.get('N', '600'))
ROLL = int(os.environ.get('ROLL', '16'))
PROCS = int(os.environ.get('PROCS', '4'))

# um efeito virado (blefe) continua usável pelo dono; usá-lo desvira (e o Lacre do rival o anula, como no jogo)
def _pronta(j, c):
    e = j.est.get(c)
    return e == 'pronto' or (e == 'armado' and c in EFE)
D.Jog.pronta = _pronta

DECKS = [list(d) for d in itertools.combinations(sorted(N.CARTAS), 3)
         if sum(c in ARM for c in d) <= 2 and sum(c in PTS for c in d) <= 1]
# decks em que o blefe é possível: um efeito para virar e uma armadilha (sem ser o Espelho) para o "?" esconder
DECKS_BLEFE = [d for d in DECKS if any(c in EFE for c in d) and any(c in ARM - {'espelho'} for c in d)]

PADRAO = dict(tipo='padrao', medo=1.0, blefe=0.0, desafia=0.0)
# DESAFIO (proposta): na sua vez, antes do dado, você pode desafiar o "?" do rival.
#   blefe  -> a carta dele se perde e você ganha `acerto` pontos
#   armadilha -> ela fica à vista e ele ganha `erro` pontos
# e um blefe que ninguém desafiou rende `bonus` pontos quando o dono o desvira
DESAFIO = dict(ligado=False, acerto=1, erro=1, bonus=1)
DESAFIO.update(json.loads(os.environ.get('DESAFIO', '{}')))


class Partida(N.Partida):
    def __init__(s, decks, estilos, inicia=0, meta=META):
        super().__init__(decks, inicia=inicia, meta=meta)
        s.estilo = [dict(PADRAO, **estilos[0]), dict(PADRAO, **estilos[1])]
        s.conta = {'blefes': [0, 0], 'blefes_usados': [0, 0], 'interrogacao': [0, 0], 'decisoes': [0, 0], 'divergiu': [0, 0]}
        s._forca = None
        s.revelada = [False, False]; s._qid = [0, 0]; s._visto = [-1, -1]
        for k in ('desafios', 'desafio_acertou', 'bonus_blefe'): s.conta[k] = [0, 0]

    # ---------- blefe ----------
    def usar(s, p, c):
        j = s.j[p]
        if j.armada == c and c in EFE:   # desvirou o blefe
            j.armada = None; s.conta['blefes_usados'][p] += 1
            if DESAFIO['ligado'] and DESAFIO['bonus']:
                j.pts += DESAFIO['bonus']; s.conta['bonus_blefe'][p] += 1
                if s.vencedor is None and j.pts >= s.meta: s.vencedor = p
        super().usar(p, c)
    def armar(s, p, c, alvo=None):
        super().armar(p, c, alvo); s.revelada[p] = False; s._qid[p] += 1
    def chance_desafio(s, p):
        """desafia = número fixo, ou 'esperto': a chance de o "?" ser blefe, pelo que resta no deck do rival
        (supondo que ele blefa com metade das oportunidades)"""
        d = s.estilo[p]['desafia']
        if d != 'esperto': return d
        traps, efs = s.escondidas(1 - p)
        return 0.0 if not efs else 0.5 * len(efs) / (0.5 * len(efs) + len(traps))
    def desafiar(s, p):
        r = s.j[1 - p]; c = r.armada; s.conta['desafios'][p] += 1
        if c in EFE:
            r.est[c] = 'perdido'; r.armada = None; s.j[p].pts += DESAFIO['acerto']; s.conta['desafio_acertou'][p] += 1
            if s.vencedor is None and s.j[p].pts >= s.meta: s.vencedor = p
        else:
            s.revelada[1 - p] = True; r.pts += DESAFIO['erro']
            if s.vencedor is None and r.pts >= s.meta: s.vencedor = 1 - p
    def escondidas(s, p):
        """o que o "?" de p pode ser aos olhos do rival: armadilhas escondidas (sem o Espelho) e efeitos não usados"""
        j = s.j[p]
        return ([c for c in j.deck if c in ARM - {'espelho'} and j.est[c] in ('pronto', 'armado')],
                [c for c in j.deck if c in EFE and j.est[c] in ('pronto', 'armado')])
    def cartas_antes(s, p):
        j = s.j[p]; r = s.j[1 - p]; e = s.estilo[p]
        # desafio: decide uma vez por "?" do rival, na primeira vez em que o vê
        if DESAFIO['ligado'] and r.armada not in (None, 'espelho') and not s.revelada[1 - p] and s._visto[p] != s._qid[1 - p]:
            s._visto[p] = s._qid[1 - p]
            if random.random() < s.chance_desafio(p): s.desafiar(p)
            if s.vencedor is not None: return
        super().cartas_antes(p)
        if j.armada is None and e['blefe'] > 0 and len(r.cor) >= 2:
            traps, efs = s.escondidas(p)
            efs = [c for c in efs if j.est[c] == 'pronto']
            if traps and efs and random.random() < e['blefe']:
                c = random.choice(efs); j.est[c] = 'armado'; j.armada = c; s.conta['blefes'][p] += 1
                s.revelada[p] = False; s._qid[p] += 1
        if r.armada not in (None, 'espelho'): s.conta['interrogacao'][p] += 1

    def pode_ser(s, p, c):
        if s.revelada[1 - p]: return s.j[1 - p].armada == c   # desafiada e à vista: é certeza
        # medo: o leitor só leva o "?" a sério com probabilidade `medo` (na simulação do planejador, sempre)
        return super().pode_ser(p, c) and (getattr(s, '_simulando', False) or random.random() < s.estilo[p]['medo'])

    # ---------- escolha do dado ----------
    def planeja(s, p):
        # a escolha "de consulta" (o robô também chama planeja para pensar no Espelho, no Convite...): heurística
        return s.planeja_ganancioso(p) if s.estilo[p]['tipo'] == 'ganancioso' else s.planeja_padrao(p)
    def escolhe_dado(s, p):
        """a escolha de verdade do dado que p vai pegar"""
        if s._forca and s._forca[0] == p:
            f = s._forca[1]; s._forca = None; return f
        if s.estilo[p]['tipo'] == 'planejador' and not getattr(s, '_simulando', False): return s.planeja_simulando(p)
        return s.planeja(p)
    def planeja_padrao(s, p):
        r = s.j[1 - p]; e = s.estilo[p]
        # medo: com um "?" que pode ser Fundo Falso, o robô do jogo foge do Bolso; aqui só com probabilidade `medo`
        guarda = r.armada
        if r.armada not in (None, 'espelho') and (random.random() >= e['medo'] or (s.revelada[1 - p] and r.armada != 'fundo')): r.armada = None
        try: return N.Partida.planeja(s, p)
        finally: r.armada = guarda
    def planeja_ganancioso(s, p):
        j = s.j[p]; best = None; bv = -1e9
        for i, X in enumerate(s.mesa):
            for m in s.destinos(p, X):
                v = s.nota(p, X, m) + random.random() * .01
                if v > bv: bv = v; best = (i, m)
        return best or (random.randrange(len(s.mesa)), 'corrente')
    def opcoes_dado(s, p):
        ops = []
        for i, X in enumerate(s.mesa):
            v = 7 - X if (s.marca and s.marca[1] == i and s.marca[0] != p) else X
            ds = s.destinos(p, v) or ['corrente']
            ops += [(i, m) for m in ds]
        return ops
    def planeja_simulando(s, p):
        ops = s.opcoes_dado(p)
        padrao = s.planeja_padrao(p)
        if len(ops) <= 1: return ops[0] if ops else padrao
        notas = {op: s.simula(p, ('dado', op)) for op in ops}
        best = max(ops, key=lambda op: (notas[op], op == padrao))
        s.conta['decisoes'][p] += 1; s.conta['divergiu'][p] += best != padrao
        if best != padrao and hasattr(s, 'diario'): s.diario.append(s.descreve_dado(p, padrao, best, notas))
        return best
    def descreve_dado(s, p, robo, plano, notas):
        """o que mudou entre a escolha do robô e a do planejador (para o experimento 'decisoes')"""
        j = s.j[p]; r = s.j[1 - p]
        val = lambda op: 7 - s.mesa[op[0]] if (s.marca and s.marca[1] == op[0] and s.marca[0] != p) else s.mesa[op[0]]
        precisa = lambda X: len(r.cor) >= 2 and encaixa(r.cor, X)
        return dict(tipo='dado', robo=robo, plano=plano, ganho=notas[plano] - notas[robo],
                    nota_perdida=s.nota(p, val(robo), robo[1]) - s.nota(p, val(plano), plano[1]),
                    negou=precisa(val(plano)) and not precisa(val(robo)), destino=(robo[1], plano[1]), cor=len(j.cor),
                    cor_rival=len(r.cor), q=r.armada not in (None, 'espelho'), placar=j.pts - r.pts)

    # ---------- disparar ou segurar ----------
    def decidir(s, p):
        e = s.estilo[p]; j = s.j[p]; L = len(j.cor)
        if (e['tipo'] != 'planejador' or getattr(s, '_simulando', False) or getattr(s, '_sem_disparo', False)
                or L < 3 or L >= D.LIM or j.pts + D.pontos(L) >= s.meta):
            return N.Partida.decidir(s, p)
        quer = s.quer_disparar(p)
        sim, nao = s.simula(p, ('disparar', True)), s.simula(p, ('disparar', False))
        dispara = sim >= nao - 1e-9
        s.conta['decisoes'][p] += 1; s.conta['divergiu'][p] += dispara != quer
        if dispara != quer and hasattr(s, 'diario'):
            s.diario.append(dict(tipo='disparo', robo=quer, plano=dispara, ganho=abs(sim - nao), L=L, risco=s.risco(p), placar=j.pts - s.j[1 - p].pts,
                                 cor_rival=len(s.j[1 - p].cor), mesa=len(s.mesa), q=s.j[1 - p].armada not in (None, 'espelho')))
        if dispara:
            if j.pronta('sobrecarga') and L >= 4 and s.efeito(p, 'sobrecarga'): j.sobre = True
            s.fire(p)
        else: s.segurar(p)

    # ---------- simulação do resto da partida ----------
    def simula(s, p, acao):
        info = s.estilo[p].get('info', 'oraculo'); q = s.estilo[p].get('q', 0.3)
        w = 0
        for _ in range(s.estilo[p].get('n', ROLL)):
            c = copy.deepcopy(s); c._simulando = True
            for k in (0, 1): c.estilo[k] = dict(PADRAO)   # dali em diante, os dois jogam como o robô do jogo
            r = c.j[1 - p]
            if r.armada not in (None, 'espelho'):
                if info == 'cego':
                    r.est[r.armada] = 'pronto'; r.armada = None
                elif info == 'crenca':
                    # sorteia o que o "?" é: uma armadilha escondida (peso 1 - q) ou um blefe com um efeito (peso q)
                    traps, efs = c.escondidas(1 - p)
                    if traps and efs: esc = random.choice(efs) if random.random() < q else random.choice(traps)
                    else: esc = random.choice(traps or efs)
                    r.est[r.armada] = 'pronto'; r.est[esc] = 'armado'; r.armada = esc
            if info == 'semcartas':
                # planeja como se o rival não tivesse (mais) cartas: nenhuma na mão, nada virado (a marca do Espelho é pública e fica)
                for k in r.est:
                    if not (k == 'espelho' and r.armada == 'espelho'): r.est[k] = 'usado'
                if r.armada != 'espelho': r.armada = None
            if acao[0] == 'dado':
                c._forca = (p, acao[1])
                c.continua_pegada(p)
            else:
                j = c.j[p]
                if acao[1]:
                    if j.pronta('sobrecarga') and len(j.cor) >= 4 and c.efeito(p, 'sobrecarga'): j.sobre = True
                    c.fire(p)
                else: c.segurar(p)
            if c.vencedor is None and max(x.pts for x in c.j) < c.meta:
                c.vez = 1 - p; c.turnos += 1
                c.jogar()
            v = c.vencedor if c.vencedor is not None else (0 if c.j[0].pts >= c.meta else 1)
            w += v == p
        return w / s.estilo[p].get('n', ROLL)
    def continua_pegada(s, p):
        """o resto da vez de p depois de escolher o dado (só a pegada única; a Pressa segue o robô)"""
        j = s.j[p]
        i, m = s.escolhe_dado(p); v = s.tirar(p, i)
        ds = s.destinos(p, v); s.espelhado = False
        if m not in ds: m = max(ds, key=lambda x: s.nota(p, v, x)) if ds else 'corrente'
        s.colocar(p, v, m)
        if len(j.cor) >= D.LIM: s.fire(p)
        if max(x.pts for x in s.j) >= s.meta: return
        s.decidir(p)

    # o planejador só simula a pegada única (com a Pressa, a vez segue o robô)
    def vez_de(s, p):
        if s.estilo[p]['tipo'] == 'planejador' and not getattr(s, '_simulando', False):
            j = s.j[p]
            s.cartas_antes(p)
            if s.passa(p): s.decidir(p); return
            usa_pressa = j.pronta('pressa') and len(j.cor) >= 2 and len(s.mesa) >= 2 and any(
                'corrente' in s.destinos(p, a) and any(encaixa(j.cor + [a], b) for k, b in enumerate(s.mesa) if k != i) for i, a in enumerate(s.mesa))
            if not usa_pressa:
                if j.pronta('sobrecarga') and D.BAL['sobre'] == 2 and len(j.cor) == 5 and any(encaixa(j.cor, X, j.coringa) for X in s.mesa):
                    if s.efeito(p, 'sobrecarga'): j.sobre = True
                if s.mesa: s.continua_pegada(p)
                return
            # com a Pressa: o caminho do robô (a primeira cartas_antes já foi feita)
            s._ja_fez_cartas = True
        return super().vez_de(p)


def _cartas_antes_guardada(s, p):
    if getattr(s, '_ja_fez_cartas', False): s._ja_fez_cartas = False; return
    return Partida._cartas_antes_real(s, p)
Partida._cartas_antes_real = Partida.cartas_antes
Partida.cartas_antes = _cartas_antes_guardada


def confronto(args):
    """A contra B em `n` partidas (lados e quem começa alternados); devolve vitórias de A e contagens"""
    a, b, n, semente, pool_a, pool_b = args
    random.seed(semente); w = 0; extra = {'blefes': 0, 'blefes_usados': 0, 'interrogacao_viu_a': 0, 'decisoes_a': 0, 'divergiu_a': 0, 'turnos': 0}
    for g in range(n):
        da = random.choice(pool_a); db = random.choice(pool_b)
        lado = g % 2
        decks = [da, db] if lado == 0 else [db, da]
        est = [a, b] if lado == 0 else [b, a]
        P = Partida(decks, est, inicia=(g // 2) % 2)
        v = P.jogar()
        w += v == lado
        ia, ib = lado, 1 - lado
        extra['blefes'] += P.conta['blefes'][ib] + P.conta['blefes'][ia]
        extra['blefes_usados'] += P.conta['blefes_usados'][ib] + P.conta['blefes_usados'][ia]
        extra['interrogacao_viu_a'] += P.conta['interrogacao'][ia]
        extra['decisoes_a'] += P.conta['decisoes'][ia]; extra['divergiu_a'] += P.conta['divergiu'][ia]
        extra['turnos'] += P.turnos
    return w, n, extra


def mede(a, b, n=NPART, pool_a=DECKS, pool_b=DECKS, semente=1):
    blocos = max(1, min(PROCS * 4, n // 25)); por = n // blocos
    with Pool(PROCS) as pool:
        res = pool.map(confronto, [(a, b, por, semente * 1000 + k, pool_a, pool_b) for k in range(blocos)])
    w = sum(r[0] for r in res); tot = sum(r[1] for r in res)
    extra = {k: sum(r[2][k] for r in res) for k in res[0][2]}
    p = w / tot; erro = 1.96 * (p * (1 - p) / tot) ** .5
    return p, erro, tot, extra


def nome(e):
    if e['tipo'] == 'planejador': return f"planejador({e.get('info', 'oraculo')}{', q=' + str(e['q']) if e.get('info') == 'crenca' else ''})"
    return e['tipo'] + (f"(medo {e['medo']})" if e['tipo'] == 'padrao' and e.get('medo', 1) != 1 else '') + (f" blefa {e['blefe']}" if e.get('blefe') else '')


def linha(a, b, **kw):
    p, erro, tot, x = mede(a, b, **kw)
    div = f" · decisões em que o planejador discordou do robô: {x['divergiu_a'] / max(1, x['decisoes_a']):.0%}" if x['decisoes_a'] else ''
    bl = f" · blefes por partida {x['blefes'] / tot:.2f}" if x['blefes'] else ''
    print(f"  {nome(a):34s} x {nome(b):34s} {p:6.1%} ±{erro:.1%}  ({tot} partidas{bl}{div})", flush=True)
    return p, erro


def diario(args):
    n, semente = args
    random.seed(semente); out = []
    for g in range(n):
        decks = [random.choice(DECKS), random.choice(DECKS)]
        P = Partida(decks, [dict(tipo='planejador', info='oraculo'), PADRAO], inicia=g % 2); P.diario = []
        P.jogar(); out += P.diario
    return out


if __name__ == '__main__':
    quais = sys.argv[1:] or ['profundidade', 'leitura', 'blefe']
    G = dict(tipo='ganancioso'); P0 = dict(PADRAO)
    if 'profundidade' in quais:
        print(f"\n## 1. Habilidade: quanto um jogador melhor vence (decks sorteados, meta {META})")
        linha(P0, G)
        linha(dict(tipo='planejador', info='oraculo'), P0, n=NPART // 2)
        linha(dict(tipo='planejador', info='oraculo'), G, n=NPART // 2)
    if 'leitura' in quais:
        print(f"\n## 2. Ler o \"?\": planejador que sabe o que é x que ignora (rival padrão que blefa 0,5; decks com blefe possível)")
        BL = dict(PADRAO, blefe=0.5)
        linha(dict(tipo='planejador', info='oraculo'), BL, n=NPART // 2, pool_b=DECKS_BLEFE)
        linha(dict(tipo='planejador', info='cego'), BL, n=NPART // 2, pool_b=DECKS_BLEFE)
        linha(dict(tipo='planejador', info='crenca', q=0.3), BL, n=NPART // 2, pool_b=DECKS_BLEFE)
    if 'decisoes' in quais:
        print("\n## 4. Onde o planejador discorda do robô (o que é jogar bem)")
        with Pool(PROCS) as pool: ds = [d for r in pool.map(diario, [(NPART // 8, 500 + k) for k in range(8)]) for d in r]
        dd = [d for d in ds if d['tipo'] == 'dado']; df = [d for d in ds if d['tipo'] == 'disparo']
        print(f"  {len(ds)} discordâncias em {NPART} partidas: {len(dd)} na escolha do dado, {len(df)} em disparar ou segurar")
        neg = sum(d['negou'] for d in dd); mais_val = sum(d['nota_perdida'] > 0.5 for d in dd)
        print(f"  dado: {neg / len(dd):.0%} pegam o dado que o rival precisava (o robô não); {mais_val / len(dd):.0%} abrem mão de valor imediato (nota menor)")
        from collections import Counter
        print("  destino (robô → planejador):", ", ".join(f"{a}→{b} {n}" for (a, b), n in Counter(d['destino'] for d in dd).most_common(6)))
        seg = [d for d in df if not d['plano']]; dis = [d for d in df if d['plano']]
        def resumo(xs, k): return statistics.mean(x[k] for x in xs) if xs else float('nan')
        print(f"  disparo: o planejador SEGURA onde o robô dispara {len(seg)}x (corrente média {resumo(seg, 'L'):.1f}, risco {resumo(seg, 'risco'):.2f}, placar {resumo(seg, 'placar'):+.1f})")
        print(f"           o planejador DISPARA onde o robô segura {len(dis)}x (corrente média {resumo(dis, 'L'):.1f}, risco {resumo(dis, 'risco'):.2f}, placar {resumo(dis, 'placar'):+.1f}, corrente do rival {resumo(dis, 'cor_rival'):.1f})")
        print(f"  com um \"?\" do rival na mesa: {sum(d['q'] for d in ds) / len(ds):.0%} das discordâncias")
    if 'cartas' in quais:
        print("\n## 5. As cartas do rival mudam a melhor jogada? (planejador que conhece o deck do rival x que finge que ele não tem cartas)")
        linha(dict(tipo='planejador', info='oraculo'), P0, n=NPART)
        linha(dict(tipo='planejador', info='semcartas'), P0, n=NPART)
    if 'armadilhas' in quais:
        print("\n## 6. Valor de saber o \"?\", armadilha por armadilha (rival padrão com essa armadilha no deck, sem blefe)")
        for t in ['fundo', 'interferencia', 'pedagio', 'ancora', 'lacre']:
            com = [d for d in DECKS if t in d]
            a1 = linha(dict(tipo='planejador', info='oraculo'), P0, n=NPART // 2, pool_b=com)
            a2 = linha(dict(tipo='planejador', info='cego'), P0, n=NPART // 2, pool_b=com)
            print(f"    {t}: saber vale {a1[0] - a2[0]:+.1%}", flush=True)
    if 'desafio' in quais:
        DESAFIO['ligado'] = True
        print(f"\n## 7. Desafio: vitórias do leitor (desafia com prob. c) contra o blefador (blefa com prob. b) · {json.dumps(DESAFIO)}")
        tab = {}
        for b in (0.0, 0.5, 1.0):
            for c in (0.0, 0.5, 1.0):
                tab[b, c] = linha(dict(PADRAO, desafia=c), dict(PADRAO, blefe=b), n=NPART * 4, pool_a=DECKS_BLEFE, pool_b=DECKS_BLEFE)[0]
        print("  leitor (linhas: blefe do rival; colunas: chance de desafiar)")
        for b in (0.0, 0.5, 1.0): print(f"    blefe {b:.1f}: " + "  ".join(f"{tab[b, c]:.1%}" for c in (0.0, 0.5, 1.0)))
    if 'blefe' in quais:
        print(f"\n## 3. Medo x blefe (robôs; o leitor joga contra o blefador, os dois com decks onde o blefe é possível)")
        for medo in (0.0, 0.5, 1.0):
            for b in (0.0, 0.3, 1.0):
                linha(dict(PADRAO, medo=medo), dict(PADRAO, blefe=b), n=NPART * 4, pool_a=DECKS_BLEFE, pool_b=DECKS_BLEFE)
