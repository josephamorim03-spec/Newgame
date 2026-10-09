# Cartas propostas (ainda fora do jogo), medidas sobre a implementação de referência de sim/deck.py.
# Cada carta é um gancho numa subclasse: deck.py continua igual ao jogo; aqui só se soma o que é novo.
# Uso: NOVAS=pausa,reverso,furto,convite,lacre,ampulheta python3 sim/decks.py   (as 6 aprovadas)
#      NOVAS=pausa python3 sim/valor_cartas.py · BALN='{"ampulheta": 4}' testa outro número
# Texto, regra, interações e números de cada uma: docs/balanceamento-cartas.md.
# Aprovadas: pausa, reverso, furto, convite (versão suave), lacre, ampulheta (+3).
# Descartadas (ficam aqui para reproduzir a medida): rede, gemeo (as duas versões), convite forte
# (convite_bolso=False), pausa com disparo (pausa_dispara=True), ampulheta +2 / +4.
import random
import deck as D
from deck import encaixa, BAL

# números e variantes das cartas novas (os valores abaixo são os aprovados)
BALN = dict(
    ampulheta=3,                 # pontos da Ampulheta (+2: fraca, 46,7%; +4: domina, 56,9%)
    convite_bolso=True,          # Convite suave: o dado convidado que romperia pode ir para o Bolso cheio
    pausa_dispara=False,         # a Pausa não deixa disparar (com disparo ela passava de 52%)
    # robô (não são regras): quanto o dono da Pausa arrisca segurar, e quando ela é usada
    pausa_risco=0.5, pausa_gula='sempre', pausa_ultimo=True, convite_min=3, reverso_mais=False,
    # descartadas
    rede_pts=4, rede_min=1, gemeo_modo='bolso', gemeo_mais=False)
import os, json
BALN.update(json.loads(os.environ.get('BALN', '{}')))   # ex.: BALN='{"ampulheta": 3}' para testar outro número

TODAS = {
    'pausa':     'efeito',     # não pega dado nem dispara nesta vez
    'reverso':   'efeito',     # a corrente passa a crescer pela outra ponta
    'furto':     'efeito',     # troca o seu Bolso com o do rival
    'convite':   'efeito',     # alvo: o rival tem de pegar esse dado na próxima vez em que pegar um
    'lacre':     'armadilha',  # o próximo efeito do rival não funciona
    'ampulheta': 'armadilha',  # ⚡ quando o rival terminar a vez com corrente de 3+ sem disparar, você ganha 3
    'gemeo':     'efeito',     # (descartada) alvo: cópia de um dado da Mesa, na Mesa ou no seu Bolso
    'rede':      'armadilha',  # (descartada) ⚡ na próxima ruptura do rival, você ganha pontos
}
PONTOS_NOVAS = {'rede', 'ampulheta'}
EFEITOS_TODOS = set(D.EFEITOS) | {c for c, t in TODAS.items() if t == 'efeito'}

CARTAS = list(D.CARTAS); ARMADILHAS = set(D.ARMADILHAS); PONTOS_CARTAS = set(D.PONTOS_CARTAS); EFEITOS = set(D.EFEITOS)
def ativar(novas):
    """soma as cartas novas pedidas às 11 do jogo"""
    global CARTAS, ARMADILHAS, PONTOS_CARTAS, EFEITOS
    for c in novas: assert c in TODAS, f'carta nova desconhecida: {c}'
    CARTAS = sorted(set(D.CARTAS) | set(novas))
    ARMADILHAS = set(D.ARMADILHAS) | {c for c in novas if TODAS[c] == 'armadilha'}
    PONTOS_CARTAS = set(D.PONTOS_CARTAS) | (set(novas) & PONTOS_NOVAS)
    EFEITOS = set(D.EFEITOS) | {c for c in novas if TODAS[c] == 'efeito'}


class Partida(D.Partida):
    # ---------- regras novas ----------
    def efeito(s, p, c):
        # Lacre: o próximo efeito do rival é gasto e não age
        s.usar(p, c)
        if s.j[1 - p].armada == 'lacre':
            s.disparar_trap(1 - p, 'lacre'); return False
        return True
    def romper(s, p):
        # Rede ⚡: a ruptura de uma corrente de 3+ do rival rende pontos
        L = len(s.j[p].cor); super().romper(p)
        r = s.j[1 - p]
        if r.armada == 'rede' and L >= BALN['rede_min']:
            r.pts += BALN['rede_pts']; s.disparar_trap(1 - p, 'rede')

    def tirar(s, p, i):
        # Convite: o dado convidado sai da Mesa (por quem for): o convite acaba
        cv = getattr(s, 'convite', None)
        if cv:
            dono, k = cv
            s.convite = None if k == i else (dono, k - 1) if k > i else cv
            if k == i and dono != p: s._forcado = p   # o próximo colocar() é o do dado convidado
        return super().tirar(p, i)
    def convidado(s, p):
        """índice do dado que p tem de pegar (Convite do rival), ou None"""
        cv = getattr(s, 'convite', None)
        return cv[1] if cv and cv[0] != p and cv[1] < len(s.mesa) else None
    def planeja(s, p):
        k = s.convidado(p)
        if k is None: return super().planeja(p)
        X = 7 - s.mesa[k] if (s.marca and s.marca[1] == k and s.marca[0] != p) else s.mesa[k]
        ds = s.destinos(p, X)
        return (k, max(ds, key=lambda m: s.nota(p, X, m)) if ds else 'corrente')
    def destinos(s, p, v):
        ds = super().destinos(p, v)
        # Convite (versão suave): o dado convidado que romperia pode ir para o Bolso cheio; o dado de lá sai do jogo
        if not ds and BALN['convite_bolso'] and getattr(s, '_forcado', None) == p: ds = ['descartar']
        return ds
    def colocar(s, p, v, modo):
        s._forcado = None
        if modo == 'descartar':
            j = s.j[p]; r = s.j[1 - p]
            if r.armada == 'fundo': j.bolso = None; s.disparar_trap(1 - p, 'fundo')
            else: j.bolso = v
            return
        super().colocar(p, v, modo)
    def segurar(s, p):
        # Ampulheta ⚡: o rival segurou uma corrente de 3+ em vez de disparar
        r = s.j[1 - p]
        if r.armada == 'ampulheta' and len(s.j[p].cor) >= 3:
            r.pts += BALN['ampulheta']; s.disparar_trap(1 - p, 'ampulheta')

    # ---------- robô ----------
    def quer_disparar(s, p):
        j = s.j[p]
        if j.pronta('pausa') and BALN['pausa_risco'] < 1 and (BALN['pausa_gula'] == 'sempre' or j.pts <= s.j[1 - p].pts):
            # com a Pausa na mão, segurar é menos arriscado (como a Âncora armada)
            L = len(j.cor)
            if L < 3: return False
            if L >= D.LIM or j.pts + D.pontos(L) >= s.meta: return True
            r = s.risco(p) * BALN['pausa_risco']
            return r * D.pontos(L) > (D.pontos(L + 1) - D.pontos(L)) * (1 - r)
        return super().quer_disparar(p)
    def fura_tudo(s, p):
        """qualquer dado que p pegar agora rompe a corrente (nada entra, Bolso não salva)"""
        return bool(s.mesa) and s.sem_saida(p)
    def cartas_antes(s, p):
        j = s.j[p]; r = s.j[1 - p]; m = s.mesa
        precisa = len(j.cor) >= 2 and not any('corrente' in s.destinos(p, X) for X in m)
        # Reverso: a outra ponta serve e a frente não
        if j.pronta('reverso') and len(j.cor) >= 2 and BALN['reverso_mais'] and not precisa:
            # também quando a outra ponta tem bem mais dados que servem
            frente = sum(encaixa(j.cor, X) for X in m); tras = sum(encaixa(j.cor[:1], X) for X in m)
            if tras >= frente + 2 and s.efeito(p, 'reverso'): j.cor.reverse()
        if precisa and j.pronta('reverso') and any(encaixa(j.cor[:1], X) or (j.bolso is not None and encaixa(j.cor[:1], j.bolso)) for X in m):
            if s.efeito(p, 'reverso'): j.cor.reverse()
        # convidado pelo rival: conserta o dado convidado se ele romperia a corrente
        k = s.convidado(p)
        if k is not None and len(j.cor) >= 2 and not s.destinos(p, m[k]):
            X = m[k]
            if j.pronta('virar') and encaixa(j.cor, 7 - X) and s.efeito(p, 'virar'): m[k] = 7 - X; s.desarma(k)
            elif j.pronta('ajuste') and any(1 <= X + d <= 6 and encaixa(j.cor, X + d) for d in (1, -1)) and s.efeito(p, 'ajuste'):
                m[k] = X + 1 if X + 1 <= 6 and encaixa(j.cor, X + 1) else X - 1
            elif j.pronta('coringa') and s.efeito(p, 'coringa'): j.coringa = True
            elif j.pronta('rerrolar') and s.efeito(p, 'rerrolar'): m[:] = [random.randint(1, 6) for _ in m]; s.desarma(None)
        # Furto: o dado do Bolso dele salva a minha corrente, ou é o que segura a corrente grande dele
        if j.pronta('furto') and r.bolso is not None:
            meu = len(j.cor) >= 3 and not s.garante(p) and encaixa(j.cor, r.bolso, j.coringa)
            nega = len(r.cor) >= 3 and encaixa(r.cor, r.bolso, r.coringa) and (j.bolso is None or not encaixa(r.cor, j.bolso))
            if (meu or nega) and s.efeito(p, 'furto'): j.bolso, r.bolso = r.bolso, j.bolso
        super().cartas_antes(p)
        # Gêmeo (Bolso): sem garantia no Bolso, copia para ele o dado que vai pegar (Eco garantido depois)
        if BALN['gemeo_modo'] == 'bolso' and j.pronta('gemeo') and len(j.cor) >= 2 and not s.garante(p) and m:
            i, modo = s.planeja(p)
            if modo == 'corrente' and s.efeito(p, 'gemeo'):
                if r.armada == 'fundo': j.bolso = None; s.disparar_trap(1 - p, 'fundo')
                else: j.bolso = m[i]
        # Convite: o rival tem de pegar um dado que rompe a corrente dele (e o Bolso dele não salva)
        if j.pronta('convite') and len(r.cor) >= BALN['convite_min'] and len(m) >= 2 and s.convidado(1 - p) is None:
            i_meu, _ = s.planeja(p)
            marcado = s.marca[1] if s.marca else None   # Convite e Espelho nunca no mesmo dado
            alvos = [i for i, X in enumerate(m) if i != i_meu and i != marcado and not s.destinos(1 - p, X)]
            if alvos and s.efeito(p, 'convite'): s.convite = (p, alvos[0])
        # Gêmeo: só um dado serve à minha corrente; a cópia deixa um Eco garantido para a próxima vez
        if BALN['gemeo_modo'] == 'mesa' and j.pronta('gemeo') and len(j.cor) >= 2 and len(m) >= 2:
            marcado = s.marca[1] if (s.marca and s.marca[0] != p) else None
            serve = [i for i, X in enumerate(m) if i != marcado and encaixa(j.cor, X, j.coringa)]
            if len(serve) == 1 and s.efeito(p, 'gemeo'): m.append(m[serve[0]])
            elif BALN['gemeo_mais'] and len(j.cor) >= 3 and serve and j.pronta('gemeo'):
                # também com corrente de 3+: copia o dado que vai pegar se a cópia não serve ao rival
                i, modo = s.planeja(p)
                if modo == 'corrente' and i != marcado and not encaixa(r.cor, m[i]) and s.efeito(p, 'gemeo'): m.append(m[i])
        # armadilhas novas (se nenhuma outra foi armada)
        if j.armada is None:
            if j.pronta('rede') and len(r.cor) >= 2: s.armar(p, 'rede')
            elif j.pronta('ampulheta') and len(r.cor) >= 2: s.armar(p, 'ampulheta')
            elif j.pronta('lacre') and any(r.pronta(e) for e in EFEITOS_TODOS): s.armar(p, 'lacre')
    def passa(s, p):
        # Pausa: não pegar quando tudo rompe, ou deixar ao rival o último dado que rompe a corrente dele
        j = s.j[p]; r = s.j[1 - p]
        if not j.pronta('pausa') or not s.mesa: return False
        k = s.convidado(p)
        quer = len(j.cor) >= 2 and (s.fura_tudo(p) if k is None else not s.destinos(p, s.mesa[k]))
        if not quer and BALN['pausa_ultimo'] and len(s.mesa) == 1 and len(r.cor) >= 3 and s.fura_tudo(1 - p) and 'corrente' not in s.destinos(p, s.mesa[0]):
            quer = True
        if quer and s.efeito(p, 'pausa'):
            if not BALN['pausa_dispara']: s._sem_disparo = True
            return True
        return False
    def decidir(s, p):
        if getattr(s, '_sem_disparo', False):
            s._sem_disparo = False
            j = s.j[p]
            if len(j.cor) >= 3: s.segurar(p)
            return
        j = s.j[p]; L = len(j.cor); antes = j.pts
        D.Partida.decidir(s, p)
        if L >= 3 and len(j.cor) == L and j.pts == antes: s.segurar(p)
