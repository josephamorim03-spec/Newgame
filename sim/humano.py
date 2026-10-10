# Jogador "humano": usa as cartas pensando no que está em jogo, em vez das regras fixas do robô de deck.py.
#
# O robô do simulador usa cada carta assim que ela "serve" (conserta a Mesa com uma corrente de 2, gasta a Pressa em
# qualquer vez, arma a Interferência contra quem está atrás...) e não conta com as cartas da mão na hora de segurar.
# Gente faz diferente: guarda o conserto para a corrente grande, segura a corrente sabendo que tem um seguro na mão,
# gasta a Pressa quando ela leva a 5 ou 6, a Sobrecarga num disparo grande, arma a armadilha que pega agora.
# Cada regra abaixo entrou porque fez o "humano" vencer mais o robô (docs/balanceamento-cartas.md §15).
#
# Também liga variantes de regra para os experimentos (MEC): tamanho do deck, limite de usos por partida e por Mesa.
#
# Uso: python3 sim/humano.py [experimento ...]   (sem nada: forca)   N=2000 · META=16 · PROCS=4
import random, os, sys, json, itertools, statistics
from multiprocessing import Pool
import deck as D
import novas as N
from deck import encaixa, pontos, opcoes, sinc
N.ativar(['pausa', 'reverso', 'furto', 'lacre'])
EFE, ARM, PTS = set(N.EFEITOS), set(N.ARMADILHAS), set(N.PONTOS_CARTAS)
CARTAS = sorted(N.CARTAS)
META = int(os.environ.get('META', '16'))
NPART = int(os.environ.get('N', '2000'))
PROCS = int(os.environ.get('PROCS', '4'))
ROLL = int(os.environ.get('ROLL', '12'))   # simulações por opção do pensador
D.BAL['coringa_seguro'] = False   # o robô de deck.py fica como no jogo; o seguro do Coringa é parte do "humano"

# ---------- variantes de regra ----------
# usos: quantas cartas cada um pode usar na partida (None: todas as do deck)
# por_mesa: quantas cartas cada um pode usar por Mesa (None: sem limite)
MEC = dict(usos=None, por_mesa=None)
# o que o "humano" faz (cada chave liga uma regra; servem para medir quanto cada uma vale)
HUM = dict(seguro=True, conserto=True, pressa=True, sobre=True, armadilhas=True, nega=True, disparo=True, fim=True,
           # números das regras (ajustados por medição: python3 sim/humano.py ajuste)
           limiar=1.3, limiar_fim=.5, nega_peso=1.0, pressa_alvo=5, r2=.25, f_coringa=.08, f_conserto=.4)

_pronta = D.Jog.pronta
def pronta(j, c):
    if not _pronta(j, c): return False
    P = getattr(j, 'P', None)
    if P is None or j.est.get(c) != 'pronto': return True
    if MEC['usos'] is not None and j.usos >= MEC['usos']: return False
    if MEC['por_mesa'] is not None and j.rod.get(getattr(P, 'rodadas', 0), 0) >= MEC['por_mesa']: return False
    return True
D.Jog.pronta = pronta


# variantes de regra para o balanceamento: o Ajuste só para cima; no máximo N cartas de conserto por deck
AJ = lambda: (1, -1) if D.BAL.get('ajuste_dir', 'ambos') == 'ambos' else (1,)
CONSERTO = {'ajuste', 'virar', 'coringa', 'rerrolar', 'reverso'}
MAXC = int(os.environ.get('MAXCONSERTO', '3'))
SEM = set(c for c in os.environ.get('SEM', '').split(',') if c)   # cartas fora do jogo (para medir o peso de uma carta)
def decks_de(k, maxp=1, maxa=2):
    return [list(d) for d in itertools.combinations(CARTAS, k) if sum(c in ARM for c in d) <= maxa and sum(c in PTS for c in d) <= maxp
            and sum(c in CONSERTO for c in d) <= MAXC and not SEM & set(d)]


class Partida(N.Partida):
    def __init__(s, decks, estilos=('humano', 'humano'), inicia=0, meta=META):
        super().__init__(decks, inicia=inicia, meta=meta)
        s.estilo = list(estilos)
        for x in s.j: x.P = s; x.usos = 0; x.rod = {}; x.quando = []
        s.mesas_com_carta = [set(), set()]
    def hum(s, p): return s.estilo[p] in ('humano', 'pensador')
    def pensa(s, p): return s.estilo[p] == 'pensador' and not getattr(s, '_simulando', False)

    # contagem de usos (efeito usado ou armadilha armada), para os limites e para medir quando as cartas saem
    def _conta(s, p, c):
        j = s.j[p]; j.usos += 1; r = getattr(s, 'rodadas', 0); j.rod[r] = j.rod.get(r, 0) + 1
        j.quando.append(s.turnos)
    def usar(s, p, c):
        if s.j[p].est.get(c) == 'pronto': s._conta(p, c)
        super().usar(p, c)
    def fire(s, p):
        super().fire(p)
        if getattr(s, 'meio', None) is None and max(x.pts for x in s.j) >= s.meta / 2: s.meio = (s.j[0].pts, s.j[1].pts)
    def armar(s, p, c, alvo=None):
        s._conta(p, c); super().armar(p, c, alvo)

    # ---------- o que está em jogo ----------
    def fim_perto(s, p):
        """reta final: alguém a um disparo grande da meta"""
        return max(x.pts for x in s.j) >= s.meta - 6
    def seguro_na_mao(s, p):
        """quanto as cartas da mão diminuem o risco de segurar (1 = nada)"""
        j = s.j[p]; L = len(j.cor); f = 1.0
        if j.coringa or (j.pronta('coringa') and L <= D.BAL['coringa_max']): f = min(f, HUM['f_coringa'])          # o dado que romperia troca a frente
        if L >= D.BAL['ancora_min'] and (j.armada == 'ancora' or (j.armada is None and j.pronta('ancora'))): f = min(f, .15)
        if (j.pronta('ajuste') and D.BAL['ajuste_modo'] == 'livre') or j.pronta('virar'): f = min(f, HUM['f_conserto'])     # consertam um dado da Mesa (se houver dado)
        if j.pronta('reverso') and L >= 2: f = min(f, .6)
        if j.pronta('rerrolar'): f = min(f, .65)
        return f
    def risco(s, p):
        r = super().risco(p)
        if s.hum(p) and HUM['seguro'] and r > .03: r *= s.seguro_na_mao(p)
        return r

    # ---------- disparar ou segurar ----------
    def quer_disparar(s, p):
        if not s.hum(p) or not HUM['disparo']: return super().quer_disparar(p)
        j = s.j[p]; R = s.j[1 - p]; L = len(j.cor)
        if L < 3: return False
        extra = 2 if j.sobre and L >= 4 else 0
        if L >= D.LIM or j.pts + pontos(L) + extra >= s.meta: return True
        r = s.risco(p)
        if j.armada == 'ancora' and L >= 4: r *= .2
        if j.pronta('pausa'): r *= .5
        # olha dois passos: crescer até 5 é o que vale (1 → 2 → 4 → 6); depois do primeiro passo, o risco típico
        r2 = min(1, max(r, HUM['r2']))
        agora = pontos(L) + extra
        um = (1 - r) * (pontos(L + 1) + (2 if j.sobre and L + 1 >= 4 else 0))
        dois = (1 - r) * (1 - r2) * (pontos(min(L + 2, D.LIM)) + (2 if j.sobre else 0)) if L + 2 <= D.LIM else 0
        # reta final: o rival a um disparo da meta; pontos agora valem mais que pontos depois
        if HUM['fim'] and R.pts + pontos(max(3, len(R.cor) + 1)) >= s.meta and j.pts + agora < s.meta:
            um *= .8; dois *= .6
        return agora >= max(um, dois)

    # ---------- cartas no começo da vez ----------
    def em_jogo(s, p):
        """o que se perde (ou se deixa de ganhar) se nada entrar na corrente nesta vez"""
        j = s.j[p]; L = len(j.cor)
        if s.garante(p):   # o Bolso salva: só se deixa de crescer
            return {5: 2.0, 4: 1.0}.get(L, 0.0)
        return {2: .6, 3: 1.4, 4: 2.5, 5: 4.0}.get(L, 0.0)
    def cartas_antes(s, p):
        if not s.hum(p): return super().cartas_antes(p)
        j = s.j[p]; R = s.j[1 - p]; m = s.mesa
        L = len(j.cor)
        if HUM['conserto']:
            precisa = L >= 2 and not any('corrente' in s.destinos(p, X) for X in m)
            limiar = HUM['limiar_fim'] if s.fim_perto(p) else HUM['limiar']
            if precisa and m and s.em_jogo(p) >= limiar: s.consertar(p)
        else:
            return super().cartas_antes(p)
        # negar ao rival o único dado que serve à corrente grande dele (Virar, Ajuste, Rerrolar)
        if HUM['nega'] and len(R.cor) >= 4 and len(m) >= 2:
            so = [i for i, X in enumerate(m) if encaixa(R.cor, X, R.coringa)]
            if len(so) == 1 and not R.coringa:
                i = so[0]; meu, _ = s.planeja(p)
                if meu != i:
                    if j.pronta('virar') and not encaixa(R.cor, 7 - m[i]):
                        if s.efeito(p, 'virar'): m[i] = 7 - m[i]; s.desarma(i)
                    elif j.pronta('ajuste') and (D.BAL['ajuste_modo'] != 'mesa3' or len(m) >= 3) and any(1 <= m[i] + d <= 6 and not encaixa(R.cor, m[i] + d) for d in AJ()):
                        if s.efeito(p, 'ajuste'): m[i] = next(m[i] + d for d in AJ() if 1 <= m[i] + d <= 6 and not encaixa(R.cor, m[i] + d))
                    elif j.pronta('rerrolar') and len(R.cor) >= 5 and s.efeito(p, 'rerrolar'):
                        m[:] = [random.randint(1, 6) for _ in m]; s.desarma(None)
        # Furto: o Bolso dele salva a minha corrente grande, ou é o que segura a corrente grande dele
        if j.pronta('furto') and R.bolso is not None:
            meu = len(j.cor) >= 3 and not s.garante(p) and encaixa(j.cor, R.bolso, j.coringa)
            nega = len(R.cor) >= 4 and encaixa(R.cor, R.bolso, R.coringa) and (j.bolso is None or not encaixa(R.cor, j.bolso))
            if (meu or nega) and s.efeito(p, 'furto'): j.bolso, R.bolso = R.bolso, j.bolso
        if HUM['armadilhas']: s.armadilha(p)
        else: s.armadilha_robo(p)
    def armadilha_robo(s, p):
        """as armadilhas como o robô arma (deck.py e novas.py), para medir quanto a escolha do humano vale"""
        j = s.j[p]; R = s.j[1 - p]; m = s.mesa
        if j.armada is not None: return
        if j.pronta('interferencia') and len(R.cor) >= 3: return s.armar(p, 'interferencia')
        if j.pronta('pedagio') and len(R.cor) >= 3: return s.armar(p, 'pedagio')
        if j.pronta('fundo') and (R.bolso is not None or len(R.cor) >= 1): return s.armar(p, 'fundo')
        if j.pronta('ancora') and len(j.cor) >= 3: return s.armar(p, 'ancora')
        if j.pronta('espelho') and len(R.cor) >= 2 and len(m) >= 3:
            i_meu, _ = s.planeja(p)
            alvos = [i for i, X in enumerate(m) if i != i_meu and encaixa(R.cor, X) and not encaixa(R.cor, 7 - X)]
            if alvos: return s.armar(p, 'espelho', alvos[0])
        if j.pronta('lacre') and any(R.pronta(e) for e in N.EFEITOS_TODOS): s.armar(p, 'lacre')
    def consertar(s, p):
        """nada entra na corrente: o conserto mais barato que resolve"""
        j = s.j[p]; m = s.mesa
        aj = D.BAL['ajuste_modo']
        if j.pronta('ajuste') and aj != 'nao_pega' and (aj != 'mesa3' or len(m) >= 3):
            for i, X in enumerate(m):
                for d in AJ():
                    if 1 <= X + d <= 6 and encaixa(j.cor, X + d):
                        if s.efeito(p, 'ajuste'): m[i] = X + d
                        return
        if j.pronta('virar'):
            alvo = [i for i, X in enumerate(m) if encaixa(j.cor, 7 - X)]
            if alvo:
                if s.efeito(p, 'virar'): m[alvo[0]] = 7 - m[alvo[0]]; s.desarma(alvo[0])
                return
        if j.pronta('reverso') and len(j.cor) >= 2 and any(encaixa(j.cor[:1], X) for X in m):
            if s.efeito(p, 'reverso'): j.cor.reverse()
            return
        if j.pronta('coringa') and not s.garante(p) and len(m) >= D.BAL['coringa_mesa'] and len(j.cor) <= D.BAL['coringa_max']:   # o Coringa salva, mas não faz crescer
            if s.efeito(p, 'coringa'): j.coringa = True
            return
        if j.pronta('rerrolar') and len(m) >= 2:
            if s.efeito(p, 'rerrolar'): m[:] = [random.randint(1, 6) for _ in m]; s.desarma(None)
    def armadilha(s, p):
        """uma armadilha por vez: a que pega agora"""
        j = s.j[p]; R = s.j[1 - p]; m = s.mesa
        if j.armada is not None: return
        L, RL = len(j.cor), len(R.cor)
        if j.pronta('ancora') and L >= 3: return s.armar(p, 'ancora')
        if j.pronta('interferencia') and RL >= 3 and R.pts >= j.pts - 1: return s.armar(p, 'interferencia')
        if j.pronta('pedagio') and RL >= 3: return s.armar(p, 'pedagio')
        if j.pronta('fundo') and (R.bolso is None and RL >= 2 or R.bolso is not None and RL >= 3): return s.armar(p, 'fundo')
        if j.pronta('lacre') and RL >= 2 and any(R.pronta(e) for e in N.EFEITOS_TODOS): return s.armar(p, 'lacre')
        if j.pronta('espelho') and RL >= 2 and len(m) >= 3:
            i_meu, _ = s.planeja(p)
            alvos = [i for i, X in enumerate(m) if i != i_meu and encaixa(R.cor, X) and not encaixa(R.cor, 7 - X)]
            if alvos: s.armar(p, 'espelho', alvos[0])
        # reta final: armadilha que sobrou na mão não vale nada no fim
        if j.armada is None and s.fim_perto(p):
            for c in ('interferencia', 'pedagio', 'fundo', 'lacre'):
                if j.pronta(c) and RL >= 2: return s.armar(p, c)

    # ---------- a vez ----------
    def vez_de(s, p):
        if not s.hum(p): return super().vez_de(p)
        if s.pensa(p): s.cartas_pensando(p)
        else: s.cartas_antes(p)
        if s.vencedor is not None: return
        if getattr(s, '_pausou', False): s._pausou = False; s._sem_disparo = True; s.decidir(p); return
        s.resto_da_vez(p)
    def resto_da_vez(s, p):
        """a vez depois das cartas do começo: Pausa, Pressa, Sobrecarga, o dado (ou os dois) e disparar ou segurar"""
        j = s.j[p]
        if s.passa(p): s.decidir(p); return
        n_pegas = 1
        if j.pronta('pressa') and D.BAL['pressa_min'] <= len(s.mesa) <= D.BAL['pressa_max']:
            L = len(j.cor); alvo = (HUM['pressa_alvo'] - 1 if s.fim_perto(p) else HUM['pressa_alvo']) if HUM['pressa'] else 4
            ok = any('corrente' in s.destinos(p, a) and any(encaixa(j.cor + [a], b) for k, b in enumerate(s.mesa) if k != i)
                     for i, a in enumerate(s.mesa)) and L + 2 >= alvo
            if ok and s.efeito(p, 'pressa'): n_pegas = 2
        if j.pronta('sobrecarga') and len(j.cor) == 5 and any(encaixa(j.cor, X, j.coringa) for X in s.mesa):
            if s.efeito(p, 'sobrecarga'): j.sobre = True
        for k in range(n_pegas):
            if not s.mesa: break
            if k > 0 and s.sem_saida(p): break
            i, m = s.escolhe_dado(p, n_pegas == 1); s._k = k; v = s.tirar(p, i)
            ds = s.destinos(p, v); s.espelhado = False
            if m not in ds: m = max(ds, key=lambda x: s.nota(p, v, x)) if ds else 'corrente'
            s.colocar(p, v, m)
            if len(j.cor) >= D.LIM: s.fire(p)
            if max(x.pts for x in s.j) >= s.meta: return
        s.decidir(p)
    def decidir(s, p):
        if not s.hum(p) or getattr(s, '_sem_disparo', False): return super().decidir(p)
        j = s.j[p]; L = len(j.cor); antes = j.pts
        quer = s.quer_disparar(p)
        if s.pensa(p) and 3 <= L < D.LIM and j.pts + pontos(L) < s.meta:
            sim, nao = s.simula(p, ('disparo', True)), s.simula(p, ('disparo', False))
            quer = sim >= nao
        if quer:
            # Sobrecarga num disparo grande (5+), ou no que fecha a partida
            if j.pronta('sobrecarga') and L >= 4 and (not HUM['sobre'] or L >= 5 or j.pts + pontos(L) + 2 >= s.meta or s.fim_perto(p)):
                if s.efeito(p, 'sobrecarga'): j.sobre = True
            s.fire(p)
        elif L >= 3: s.segurar(p)

    # ---------- o pensador: simula o resto da partida para cada opção ----------
    def escolhe_dado(s, p, pode_pensar=True):
        f = getattr(s, '_forca', None)
        if f is not None: s._forca = None; return f
        if not (pode_pensar and s.pensa(p)): return s.planeja(p)
        ops = []
        for i, X in enumerate(s.mesa):
            v = 7 - X if (s.marca and s.marca[1] == i and s.marca[0] != p) else X
            ops += [(i, m) for m in (s.destinos(p, v) or ['corrente'])]
        if len(ops) <= 1: return ops[0] if ops else s.planeja(p)
        padrao = s.planeja(p)
        notas = {op: s.simula(p, ('dado', op)) for op in ops}
        return max(ops, key=lambda op: (notas[op], op == padrao))
    def opcoes_cartas(s, p):
        """as cartas que dá para usar no começo da vez, com os alvos que mudam alguma coisa"""
        j = s.j[p]; R = s.j[1 - p]; m = s.mesa; ops = []
        serve = lambda cor, X, cg=False: encaixa(cor, X, cg)
        for c in j.deck:
            if not j.pronta(c): continue
            if c in ARM:
                if j.armada is not None: continue
                if c == 'espelho': ops += [('espelho', i) for i, X in enumerate(m) if serve(R.cor, X) and len(m) >= 2]
                else: ops.append((c,))
            elif c == 'ajuste':
                for i, X in enumerate(m):
                    for d in AJ():
                        Y = X + d
                        if 1 <= Y <= 6 and ((not serve(j.cor, X) and serve(j.cor, Y)) or (len(R.cor) >= 2 and serve(R.cor, X) and not serve(R.cor, Y))): ops.append(('ajuste', i, d))
            elif c == 'virar':
                ops += [('virar', i) for i, X in enumerate(m) if (not serve(j.cor, X) and serve(j.cor, 7 - X)) or (len(R.cor) >= 2 and serve(R.cor, X) and not serve(R.cor, 7 - X))]
            elif c == 'rerrolar' and m: ops.append(('rerrolar',))
            elif c == 'coringa' and not j.coringa and j.cor: ops.append(('coringa',))
            elif c == 'reverso' and len(j.cor) >= 2 and j.cor[0] != j.cor[-1]: ops.append(('reverso',))
            elif c == 'furto' and (j.bolso is not None or R.bolso is not None) and j.bolso != R.bolso: ops.append(('furto',))
            elif c == 'pausa' and m: ops.append(('pausa',))
        return ops
    def aplicar_carta(s, p, op):
        j = s.j[p]; R = s.j[1 - p]; m = s.mesa; c = op[0]
        if c in ARM: return s.armar(p, c, op[1] if c == 'espelho' else None)
        if not s.efeito(p, c): return
        if c == 'ajuste': m[op[1]] += op[2]
        elif c == 'virar': m[op[1]] = 7 - m[op[1]]; s.desarma(op[1])
        elif c == 'rerrolar': m[:] = [random.randint(1, 6) for _ in m]; s.desarma(None)
        elif c == 'coringa': j.coringa = True
        elif c == 'reverso': j.cor.reverse()
        elif c == 'furto': j.bolso, R.bolso = R.bolso, j.bolso
        elif c == 'pausa': s._pausou = True
    def cartas_pensando(s, p):
        """uma carta (ou nenhuma) no começo da vez: a que mais vence nas simulações"""
        ops = s.opcoes_cartas(p)
        if not ops: return
        notas = {None: s.simula(p, ('carta', None))}
        for op in ops: notas[op] = s.simula(p, ('carta', op))
        melhor = max(notas, key=lambda o: (notas[o], o is None))
        if melhor is not None:
            s.aplicar_carta(p, melhor)
            if not getattr(s, '_pausou', False): s.cartas_pensando(p)   # depois de uma carta, outra?
    def simula(s, p, acao):
        import copy
        n = ROLL; w = 0; estado = random.getstate()
        s._nsim = getattr(s, '_nsim', 0) + 1
        for k in range(n):
            random.seed(s._nsim * 7919 + k * 104729 + s.turnos)   # as mesmas sortes para todas as opções desta decisão
            c = copy.deepcopy(s); c._simulando = True; c.estilo = ['humano', 'humano']
            t = acao[0]
            if t == 'carta':
                if acao[1] is not None: c.aplicar_carta(p, acao[1])
                if getattr(c, '_pausou', False): c._pausou = False; c._sem_disparo = True; c.decidir(p)
                else: c.resto_da_vez(p)
            elif t == 'dado':
                c._forca = acao[1]; c.resto_um_dado(p)
            else:
                j = c.j[p]
                if acao[1]:
                    if j.pronta('sobrecarga') and len(j.cor) >= 4 and (len(j.cor) >= 5 or c.fim_perto(p)) and c.efeito(p, 'sobrecarga'): j.sobre = True
                    c.fire(p)
                else: c.segurar(p)
            if c.vencedor is None and max(x.pts for x in c.j) < c.meta:
                c.vez = 1 - p; c.turnos += 1; c.jogar()
            v = c.vencedor if c.vencedor is not None else (0 if c.j[0].pts >= c.meta else 1)
            w += v == p
        random.setstate(estado)
        return w / n
    def resto_um_dado(s, p):
        """o resto da vez depois de escolher (forçar) o dado: coloca, dispara se fez 6, decide"""
        j = s.j[p]
        i, m = s.escolhe_dado(p); v = s.tirar(p, i)
        ds = s.destinos(p, v); s.espelhado = False
        if m not in ds: m = max(ds, key=lambda x: s.nota(p, v, x)) if ds else 'corrente'
        s.colocar(p, v, m)
        if len(j.cor) >= D.LIM: s.fire(p)
        if max(x.pts for x in s.j) >= s.meta: return
        s.decidir(p)

    # ---------- o dado ----------
    def planeja(s, p):
        if not s.hum(p) or not HUM['nega']: return super().planeja(p)
        j = s.j[p]; R = s.j[1 - p]; best = None; bv = -1e9
        evita_bolso = R.armada not in (None, 'espelho') and R.est.get('fundo') in ('pronto', 'armado')
        marcado = s.marca[1] if (s.marca and s.marca[0] != p) else None
        for i, X in enumerate(s.mesa):
            if i == marcado and len(s.mesa) > 1 and any(s.destinos(p, Y) for k, Y in enumerate(s.mesa) if k != i): continue
            neg = 0
            if len(R.cor) >= 2 and encaixa(R.cor, X, R.coringa):
                resto = s.mesa[:i] + s.mesa[i + 1:]; rf = sum(encaixa(R.cor, x, R.coringa) for x in resto)
                peso = HUM['nega_peso'] * {2: 1.0, 3: 2.0, 4: 3.5, 5: 5.0}.get(len(R.cor), 1.0)
                neg = peso * (1.6 if rf == 0 else .4 if rf == 1 and len(resto) >= 2 else 0)
            ds = s.destinos(p, X)
            if evita_bolso and 'corrente' in ds: ds = ['corrente']
            for m in ds:
                v = s.nota(p, X, m) + neg + random.random() * .01
                if v > bv: bv = v; best = (i, m)
        if best: return best
        return D.Partida.planeja(s, p)


# ---------- experimentos ----------
def jogo(decks, estilos, inicia, meta, mec, hum):
    MEC.update(mec); HUM.update(hum)
    P = Partida(decks, estilos, inicia=inicia, meta=meta)
    v = P.jogar()
    return v, P


def bloco(args):
    """n partidas: A (estilo a) contra B (estilo b), decks sorteados de pool_a / pool_b, lados alternados"""
    a, b, n, semente, pool_a, pool_b, meta, mec, hum = args
    random.seed(semente)
    w = 0; st = dict(mesas=0, usos=0, sobra=0, quando=[], atras_venceu=0, atras=0, primeiro=0, cartas=0, desvio=0)
    for g in range(n):
        lado = g % 2; da, db = random.choice(pool_a), random.choice(pool_b)
        decks = [da, db] if lado == 0 else [db, da]
        est = [a, b] if lado == 0 else [b, a]
        inicia = (g // 2) % 2
        v, P = jogo(decks, est, inicia, meta, mec, hum)
        w += v == lado
        st['mesas'] += getattr(P, 'rodadas', 0); st['primeiro'] += v == inicia
        m = getattr(P, 'meio', None)
        if m and abs(m[0] - m[1]) >= 3: st['atras'] += 1; st['atras_venceu'] += v == (0 if m[0] < m[1] else 1)
        for k in (0, 1):
            x = P.j[k]; st['cartas'] += len(x.deck); st['usos'] += x.usos
            st['sobra'] += sum(1 for c in x.deck if x.est[c] == 'pronto'); st['quando'] += [t / max(1, P.turnos) for t in x.quando]
    return w, n, st


def mede(a, b, n=NPART, pool_a=None, pool_b=None, meta=META, mec=None, hum=None, semente=1):
    pool_a = pool_a or decks_de(3); pool_b = pool_b or pool_a
    mec = dict(dict(usos=None, por_mesa=None), **(mec or {})); hum = dict(HUM, **(hum or {}))
    blocos = max(1, min(PROCS * 4, n // 10)); por = n // blocos
    with Pool(PROCS) as pool:
        res = pool.map(bloco, [(a, b, por, semente * 1000 + k, pool_a, pool_b, meta, mec, hum) for k in range(blocos)])
    w = sum(r[0] for r in res); tot = sum(r[1] for r in res)
    st = {k: (sum((r[2][k] for r in res), []) if k == 'quando' else sum(r[2][k] for r in res)) for k in res[0][2]}
    p = w / tot
    return dict(p=p, erro=1.96 * (p * (1 - p) / tot) ** .5, n=tot, mesas=st['mesas'] / tot, primeiro=st['primeiro'] / tot,
                usos=st['usos'] / (2 * tot), sobra=st['sobra'] / max(1, st['cartas']),
                quando=statistics.median(st['quando']) if st['quando'] else float('nan'),
                cedo=sum(q < .25 for q in st['quando']) / max(1, len(st['quando'])),
                virada=st['atras_venceu'] / max(1, st['atras']))


def fmt(r): return f"{r['p']:6.1%} ±{r['erro']:.1%}"



def _um_deck(args):
    k, pool, mec, n = args[:4]
    random.seed((args[4] if len(args) > 4 else 5000) + k); MEC.update(dict(dict(usos=None, por_mesa=None), **mec)); w = 0
    for g in range(n):
        lado = g % 2; d = pool[k]; r = random.choice(pool)
        decks = [d, r] if lado == 0 else [r, d]
        w += Partida(decks, ('humano', 'humano'), inicia=(g // 2) % 2, meta=META).jogar() == lado
    return w / n



def _pressa_bloco(args):
    """[Pressa] contra deck vazio: vitórias da Pressa e partidas em que alguém pegou 3+ dados seguidos"""
    bal, n, sem = args; D.BAL.update(bal or dict(pressa_min=2, pressa_max=5, pressa_abre='atras')); random.seed(sem)
    out = dict(w=0, tres=0, tres_venceu=0, n=n)
    for g in range(n):
        lado = g % 2; decks = [[], []] if bal is None else [['pressa'], []] if lado == 0 else [[], ['pressa']]
        P = Partida(decks, ('humano', 'humano'), inicia=(g // 2) % 2, meta=META); v = P.jogar()
        out['w'] += v == lado
        seq = getattr(P, 'seq', []); runs = []; run = 1
        for a, b in zip(seq, seq[1:]):
            if a == b: run += 1
            else: runs.append((a, run)); run = 1
        if seq: runs.append((seq[-1], run))
        tres = [q for q, r in runs if r >= 3]
        if tres: out['tres'] += 1; out['tres_venceu'] += v == tres[0]
    return out

if __name__ == '__main__':
    quais = sys.argv[1:] or ['forca']
    if 'forca' in quais:
        print(f"\n## Força: humano x robô (decks de 3 sorteados, meta {META}, {NPART} partidas)")
        base = mede('humano', 'robo')
        print(f"  humano completo  {fmt(base)}  · cartas usadas por partida {base['usos']:.2f} · sobram {base['sobra']:.0%} · usadas com a partida em {base['quando']:.0%}")
        r0 = mede('robo', 'robo')
        print(f"  robô x robô      {fmt(r0)}  · cartas usadas {r0['usos']:.2f} · sobram {r0['sobra']:.0%} · usadas com a partida em {r0['quando']:.0%}")
        for k in HUM:
            r = mede('humano', 'robo', hum={k: False})
            print(f"  sem '{k:10s}'   {fmt(r)}  ({r['p'] - base['p']:+.1%})", flush=True)
    if 'ajuste' in quais:
        # busca coordenada: cada número, alguns valores; fica o que vence mais o robô (mesmas sementes para todos)
        GRADE = dict(nega_peso=[0, .3, .6, 1.0], limiar=[.8, 1.3, 2.0, 3.0], limiar_fim=[0, .5, 1.3], pressa_alvo=[4, 5, 6],
                     r2=[.15, .25, .4], f_coringa=[.02, .08, .3], f_conserto=[.2, .4, .7])
        melhor = {}
        for rodada in range(int(os.environ.get('RODADAS', '1'))):
            for k, vals in GRADE.items():
                res = {v: mede('humano', 'robo', hum=dict(melhor, **{k: v}))['p'] for v in vals}
                melhor[k] = max(res, key=res.get)
                print(f"  {k:12s} " + "  ".join(f"{v}: {p:.1%}" for v, p in res.items()) + f"  -> {melhor[k]}", flush=True)
        print("  melhor:", json.dumps(melhor))
    if 'pensador' in quais:
        print(f"\n## Pensador (simula {ROLL}x cada opção de carta, dado e disparo; o resto da partida jogado pelo humano)")
        for b in ('robo', 'humano'):
            r = mede('pensador', b, n=int(os.environ.get('NP', '200')))
            print(f"  pensador x {b:7s} {fmt(r)}  · cartas usadas {r['usos']:.2f} · sobram {r['sobra']:.0%} · usadas com a partida em {r['quando']:.0%}", flush=True)

    # ---------- variantes de deck: o que muda com 0, 1, 2, 3 ou 4 cartas, ou com limite de usos ----------
    VARIANTES = {
        '3 cartas (hoje)':        dict(k=3, mec={}),
        '2 cartas':               dict(k=2, mec={}),
        '3 no deck e usa só 2':    dict(k=3, mec=dict(usos=2)),
        '3 cartas e 1 por Mesa':   dict(k=3, mec=dict(por_mesa=1)),
        '1 carta':                dict(k=1, mec={}),
        '4 cartas':               dict(k=4, mec={}),
        'sem cartas':             dict(k=0, mec={}),
    }
    if 'mecanicas' in quais:
        print(f"\n## Variantes de deck (meta {META}; humano x humano para o jogo, humano x robô para a habilidade; {NPART} partidas cada)")
        print("  variante               | Mesas | habilidade (humano x robô) | quem começa | virada (3+ atrás no meio) | cartas usadas | sobram | usadas no 1º quarto | mediana do uso")
        for nome, v in VARIANTES.items():
            pool = decks_de(v['k']) if v['k'] else [[]]
            jj = mede('humano', 'humano', pool_a=pool, mec=v['mec'])
            hb = mede('humano', 'robo', pool_a=pool, mec=v['mec'])
            print(f"  {nome:22s} | {jj['mesas']:5.1f} | {fmt(hb):26s} | {jj['primeiro']:11.1%} | {jj['virada']:25.1%} | {jj['usos']:13.2f} | {jj['sobra']:6.0%} | {jj['cedo']:19.0%} | {jj['quando']:.0%}", flush=True)
    if 'decks' in quais:
        # equilíbrio: cada deck contra decks sorteados (humano x humano); algum domina? quantos são jogáveis?
        def varre(pool, mec, n):
            with Pool(PROCS) as pp: res = pp.map(_um_deck, [(k, pool, mec, n) for k in range(len(pool))], chunksize=2)
            return res
        for nome in os.environ.get('VARIANTES', '3 cartas (hoje),2 cartas,3 no deck e usa só 2').split(','):
            v = VARIANTES[nome]; pool = decks_de(v['k'])
            res = varre(pool, v['mec'], int(os.environ.get('ND', '400')))
            ordem = sorted(range(len(pool)), key=lambda k: -res[k])
            from collections import Counter
            top = Counter(c for k in ordem[:max(10, len(pool) // 16)] for c in pool[k])
            media = {c: statistics.mean(res[k] for k in range(len(pool)) if c in pool[k]) for c in CARTAS if any(c in d for d in pool)}
            jog = sum(r >= .45 for r in res) / len(res)
            print(f"\n  {nome}: {len(pool)} decks · desvio {statistics.pstdev(res):.3f} · melhor {res[ordem[0]]:.1%} ({' + '.join(pool[ordem[0]])}) · acima de 58%: {sum(r > .58 for r in res)} · jogáveis (45%+): {jog:.0%}")
            print("    melhores: " + " | ".join(f"{res[k]:.1%} {'+'.join(pool[k])}" for k in ordem[:5]))
            if os.environ.get('CONFIRMA'):
                # com poucas partidas por deck, o "melhor" sai inflado pela sorte: os melhores jogam de novo, com outras sementes
                nc, ntop = int(os.environ['CONFIRMA']), int(os.environ.get('CONFIRMA_N', '12'))
                with Pool(PROCS) as pp: conf = pp.map(_um_deck, [(k, pool, v['mec'], nc, 90000) for k in ordem[:ntop]])
                cs = sorted(zip(conf, ordem[:ntop]), reverse=True)
                print(f"    confirmados ({nc} partidas): " + " | ".join(f"{c:.1%} {'+'.join(pool[k])}" for c, k in cs[:6]) + f" · acima de 58%: {sum(c > .58 for c, _ in cs)} de {ntop}")
            print("    cartas no topo: " + ", ".join(f"{c} {top[c]}" for c in sorted(CARTAS, key=lambda c: -top[c]) if top[c]))
            print("    média dos decks com a carta: " + ", ".join(f"{c} {media[c]:.1%}" for c in sorted(media, key=lambda c: -media[c])), flush=True)

    if 'mecanicas_p' in quais:
        # as variantes com o bom jogador: quanto ele vence o casual (mais = mais habilidade em jogo) e como gasta as cartas
        n = int(os.environ.get('NP', '240'))
        print(f"\n## Variantes de deck com o pensador (simula {ROLL}x cada opção) contra o humano; {n} partidas cada")
        print("  variante               | pensador x humano | Mesas | cartas usadas (pensador e humano) | sobram | usadas no 1º quarto | mediana do uso")
        for nome in os.environ.get('VARIANTES', '3 cartas (hoje),2 cartas,3 no deck e usa só 2,3 cartas e 1 por Mesa,sem cartas').split(','):
            v = VARIANTES[nome]; pool = decks_de(v['k']) if v['k'] else [[]]
            r = mede('pensador', 'humano', n=n, pool_a=pool, mec=v['mec'], semente=int(os.environ.get('SEMENTE', '1')))
            print(f"  {nome:22s} | {fmt(r):17s} | {r['mesas']:5.1f} | {r['usos']:33.2f} | {r['sobra']:6.0%} | {r['cedo']:19.0%} | {r['quando']:.0%}", flush=True)
    if 'pressa' in quais:
        # a Pressa no fim da Mesa: pegar o último dado (que era do rival) e, atrás no placar, abrir a Mesa seguinte
        print(f"\n## Pressa: deck [Pressa] contra deck vazio (humano x humano, meta {META}, {NPART} partidas)")
        for nome, bal in [('hoje (2+ dados na Mesa)', dict(pressa_min=2, pressa_abre='atras')),
                          ('A: só com 3+ dados na Mesa', dict(pressa_min=3, pressa_abre='atras')),
                          ('B: quem esvaziou com ela não abre', dict(pressa_min=2, pressa_abre='rival')),
                          ('E: só com 3 ou 4 dados na Mesa', dict(pressa_min=3, pressa_max=4, pressa_abre='atras')),
                          ('sem Pressa (deck vazio x vazio)', None)]:
            with Pool(PROCS) as pp: rs = pp.map(_pressa_bloco, [(bal, NPART // 16, 900 + k) for k in range(16)])
            w = sum(r['w'] for r in rs); n = sum(r['n'] for r in rs); t = sum(r['tres'] for r in rs); tv = sum(r['tres_venceu'] for r in rs)
            print(f"  {nome:36s} Pressa vence {w / n:.1%} · partidas com 3+ dados seguidos de alguém: {t / n:.1%} · quem fez isso venceu {tv / max(1, t):.0%}", flush=True)
    if 'metas' in quais:
        # a duração: o que muda com a meta (o jogo, a habilidade com as cartas, a virada, a queima e o equilíbrio)
        print(f"\n## Metas (decks de 3 sorteados; humano x humano para o jogo, humano x robô para a habilidade; {NPART} partidas cada)")
        print("  meta | Mesas | minutos* | habilidade (humano x robô) | quem começa | virada (3+ atrás no meio) | sobram | usadas no 1º quarto")
        for meta in (12, 16, 20, 24):
            jj = mede('humano', 'humano', meta=meta); hb = mede('humano', 'robo', meta=meta)
            print(f"  {meta:4d} | {jj['mesas']:5.1f} | {jj['mesas'] * 35 / 60:3.0f} a {jj['mesas'] * 50 / 60:2.0f} | {fmt(hb):26s} | {jj['primeiro']:11.1%} | {jj['virada']:25.1%} | {jj['sobra']:6.0%} | {jj['cedo']:.0%}", flush=True)
        print("  * de 35 a 50 s por Mesa (o que dava os 4 a 6 minutos da meta 12)")
    if 'metas_p' in quais:
        n = int(os.environ.get('NP', '240'))
        print(f"\n## Metas com o pensador ({ROLL} simulações) x humano; {n} partidas cada")
        for meta in (12, 16, 20, 24):
            r = mede('pensador', 'humano', n=n, meta=meta, semente=int(os.environ.get('SEMENTE', '1')))
            print(f"  meta {meta:2d}: pensador vence {fmt(r)} · Mesas {r['mesas']:.1f} · cartas usadas no 1º quarto {r['cedo']:.0%}", flush=True)
