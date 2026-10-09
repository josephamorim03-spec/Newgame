# Dice Duel: implementação de referência das regras (v0.8, alinhada a shared/regras.js) e robôs, para simular o balanceamento.
# Fora do modelo: o blefe (os robôs não leem o "?" do rival além do Fundo Falso; ver docs/balanceamento-cartas.md).
# Regras: Mesa de 5 dados, corrente pela frente, Bolso, quem está atrás abre a Mesa, deck de até 3 cartas.
# Deck de até 3 cartas, cada uma 1x por partida. Armadilhas: no máximo 1 armada por vez.
import random
from functools import lru_cache
PONT={3:1,4:2,5:4,6:6,7:8}; LIM=6; META=12
def pontos(L): return PONT.get(L,0)
def sinc(a,b): return a==b or abs(a-b)==1 or a+b==7
def encaixa(cor,v,coringa=False): return (not cor) or coringa or sinc(cor[-1],v)
@lru_cache(None)
def _opc(f): return sum(sinc(f,x) for x in range(1,7))
def opcoes(cor): return 6 if not cor else _opc(cor[-1])

ARMADILHAS={'espelho','interferencia','fundo','pedagio','ancora'}
# números das cartas (os valores finais, ajustados por simulação; docs/design.md §4)
BAL=dict(interf_menos=1, interf_min=4, interf_max=9, interf_6='normal', pedagio=2, pedagio16=2, fundo_tudo=True, rerrolar_tudo=True, ancora_min=4, rerrolar_cor=2, coringa_cor=2, sobre=2, espelho_sem_bolso=True)
import os, json
BAL.update(json.loads(os.environ.get('BAL', '{}')))   # ex.: BAL='{"pedagio": 2}' para testar outro número
EFEITOS={'rerrolar','virar','ajuste','pressa','coringa','sobrecarga'}
CARTAS=sorted(ARMADILHAS|EFEITOS)
PONTOS_CARTAS={'interferencia','pedagio','sobrecarga'}   # cartas ⚡: no máximo 1 por deck

class Jog:
    def __init__(s,deck):
        s.deck=list(deck); s.est={c:'pronto' for c in deck}; s.cor=[]; s.pts=0; s.bolso=None
        s.armada=None; s.coringa=False; s.sobre=False; s.usou=[]
    def pronta(s,c): return s.est.get(c)=='pronto'

class Partida:
    def __init__(s,decks,inicia=0,info='marca',meta=META):
        s.j=[Jog(decks[0]),Jog(decks[1])]; s.vez=inicia; s.mesa=[]; s.marca=None; s.info=info; s.meta=meta
        # sem cartas dos dois lados, quem joga em segundo começa com um dado no Bolso; com cartas não precisa
        if not decks[0] and not decks[1]: s.j[1-inicia].bolso=random.randint(1,6)
        s.turnos=0; s.ev=[]; s.vencedor=None
    # ---------- regras ----------
    def destinos(s,p,v):
        j=s.j[p]; ds=[]
        if encaixa(j.cor,v,j.coringa): ds.append('corrente')
        if getattr(s,'espelhado',False): return ds
        if j.bolso is None: ds.append('guardar')
        elif encaixa(j.cor,j.bolso,j.coringa): ds.append('trocar')
        return ds
    def garante(s,p):
        j=s.j[p]; return j.bolso is None or encaixa(j.cor,j.bolso,j.coringa)
    def desarma(s,i):
        # mexer no dado marcado (ou rolar a Mesa toda) desfaz o Espelho
        if s.marca and (i is None or s.marca[1]==i):
            dono=s.marca[0]; s.marca=None; s.j[dono].est['espelho']='perdido'; s.j[dono].armada=None; s.ev.append((dono,'espelho_desfeito'))
    def usar(s,p,c):
        j=s.j[p]; j.est[c]='usado'; j.usou.append(c)
    def efeito(s,p,c):
        """gasta o efeito c; devolve se ele age (gancho para cartas que anulam efeitos, em sim/novas.py)"""
        s.usar(p,c); return True
    def romper(s,p):
        """a corrente de p rompe (gancho para cartas que olham a ruptura, em sim/novas.py)"""
        s.j[p].cor=[]; s.ev.append((p,'ruptura'))
    def armar(s,p,c,alvo=None):
        j=s.j[p]; j.est[c]='armado'; j.armada=c
        if c=='espelho': s.marca=(p,alvo)
    def disparar_trap(s,p,c):
        j=s.j[p]; j.est[c]='usado'; j.armada=None; j.usou.append(c); s.ev.append((p,c))
    def tirar(s,p,i):
        v=s.mesa.pop(i)
        if s.marca:
            dono,k=s.marca
            if k==i:
                s.marca=None
                if dono!=p: v=7-v; s.disparar_trap(dono,'espelho'); s.espelhado=BAL['espelho_sem_bolso']
                else: s.j[dono].est['espelho']='perdido'; s.j[dono].armada=None
            elif k>i: s.marca=(dono,k-1)
        return v
    def colocar(s,p,v,modo):
        j=s.j[p]; r=s.j[1-p]; entra=v
        if modo in ('guardar','trocar') and r.armada=='fundo':
            # Fundo Falso: o dado que iria para o Bolso cai
            s.disparar_trap(1-p,'fundo')
            if modo=='trocar' and not BAL['fundo_tudo']: entra=j.bolso; j.bolso=None
            else: entra=None; j.bolso=None
        elif modo=='guardar': j.bolso=v; entra=None
        elif modo=='trocar': entra=j.bolso; j.bolso=v
        if entra is None: return
        if encaixa(j.cor,entra,j.coringa):
            # o Coringa só é gasto num dado que entra numa corrente já começada (como no jogo)
            if j.cor: j.coringa=False
            j.cor.append(entra)
        elif j.armada=='ancora' and len(j.cor)>=BAL['ancora_min']:
            s.disparar_trap(p,'ancora')
        else:
            s.romper(p)
    def fire(s,p):
        j=s.j[p]; r=s.j[1-p]; L=len(j.cor); bonus_sobre=j.sobre
        # disparo de 3 não gasta a Sobrecarga (a de +2 só vale em 4+, como no jogo)
        if bonus_sobre and isinstance(BAL['sobre'],int) and L<4: bonus_sobre=False
        else: j.sobre=False
        efL=L+(1 if bonus_sobre and BAL['sobre']=='dado' else 0)
        if bonus_sobre and BAL['sobre']=='teto6': efL=L+1
        g=pontos(efL)+(BAL['sobre'] if bonus_sobre and isinstance(BAL['sobre'],int) else 0)
        if bonus_sobre and BAL['sobre']=='teto6': g=min(6,g)
        if bonus_sobre and BAL['sobre']=='curto2': g+=2
        # interf_6: 'normal' (o 6 perde 1, como no jogo) ou 'gasta' (o disparo de 6 gasta a Interferência sem tirar ponto)
        if L>=6 and BAL['interf_6']=='gasta' and r.armada=='interferencia':
            s.disparar_trap(1-p,'interferencia')
        elif BAL['interf_min']<=L<=BAL['interf_max'] and r.armada=='interferencia':
            g=max(0,g-BAL['interf_menos']) if BAL['interf_menos']!=2 else pontos(efL-1); s.disparar_trap(1-p,'interferencia')
        if r.armada=='pedagio':
            # +2 nas duas metas desde a v0.11 (docs/balanceamento-cartas.md §10); pedagio16 separa a meta 16 para testes
            r.pts+= (g+1)//2 if BAL['pedagio']=='metade' else BAL['pedagio16'] if s.meta>=16 else BAL['pedagio']; s.disparar_trap(1-p,'pedagio')
        j.pts+=g; j.cor=[]
        # se os dois passarem da meta no mesmo disparo (Pedágio), vence quem disparou
        if s.vencedor is None:
            if j.pts>=s.meta: s.vencedor=p
            elif r.pts>=s.meta: s.vencedor=1-p
    # ---------- robô ----------
    def nota(s,p,X,modo):
        j=s.j[p]; nc=j.cor; nb=j.bolso
        if modo=='corrente': nc=j.cor+[X]
        elif modo=='guardar': nb=X
        elif modo=='trocar': nc=j.cor+[j.bolso]; nb=X
        vb=0 if nb is None else (0.9 if nb in (2,5) else 0.6)
        return opcoes(nc)+3*(len(nc)-len(j.cor))+2.5*vb
    def planeja(s,p):
        j=s.j[p]; r=s.j[1-p]; best=None; bv=-1e9
        sabe_deck = s.info in ('deck','marca')
        # o Espelho armado é público: só um "?" (armadilha escondida) pode ser o Fundo Falso
        evita_bolso = sabe_deck and r.armada not in (None,'espelho') and r.est.get('fundo') in ('pronto','armado')
        marcado = s.marca[1] if (s.info=='marca' and s.marca and s.marca[0]!=p) else None
        for i,X in enumerate(s.mesa):
            if i==marcado and len(s.mesa)>1 and any(s.destinos(p,Y) for k,Y in enumerate(s.mesa) if k!=i): continue
            neg=0
            if len(r.cor)>=2 and encaixa(r.cor,X):
                resto=s.mesa[:i]+s.mesa[i+1:]; rf=sum(encaixa(r.cor,x) for x in resto)
                neg=4 if rf==0 else (1 if rf==1 and len(resto)>=2 else 0)
            ds=s.destinos(p,X)
            if evita_bolso and 'corrente' in ds: ds=['corrente']
            for m in ds:
                v=s.nota(p,X,m)+neg+random.random()*.01
                if v>bv: bv=v; best=(i,m)
        if best: return best
        if len(r.cor)>=2:
            for i,X in enumerate(s.mesa):
                if encaixa(r.cor,X): return (i,'corrente')
        return (random.randrange(len(s.mesa)),'corrente')
    def risco(s,p):
        j=s.j[p]
        if s.garante(p): return .03
        if len(s.mesa)>=2:
            k=sum(encaixa(j.cor,v) for v in s.mesa); return 1 if k==0 else .6 if k==1 else .1
        pf=opcoes(j.cor)/6
        return (1-pf)**4 if not s.mesa else (1-pf)**5
    def quer_disparar(s,p):
        j=s.j[p]; L=len(j.cor)
        if L<3: return False
        if L>=LIM or j.pts+pontos(L)>=s.meta: return True
        r=s.risco(p)
        if j.armada=='ancora': r*=.2
        return r*pontos(L) > (pontos(L+1)-pontos(L))*(1-r)
    def sem_saida(s,p):
        return all(not s.destinos(p,X) for X in s.mesa)
    def cartas_antes(s,p):
        """efeitos e armadilhas que o robô decide usar no começo da vez"""
        j=s.j[p]; r=s.j[1-p]; m=s.mesa
        precisa = len(j.cor)>=2 and not any('corrente' in s.destinos(p,X) for X in m)
        # Virar / Ajuste / Rerrolar: consertar a Mesa quando nada entra na corrente
        if precisa and j.pronta('virar'):
            alvo=[i for i,X in enumerate(m) if encaixa(j.cor,7-X)]
            if alvo and s.efeito(p,'virar'): m[alvo[0]]=7-m[alvo[0]]; s.desarma(alvo[0]); precisa=False
        if precisa and j.pronta('ajuste'):
            for i,X in enumerate(m):
                for d in (1,-1):
                    if 1<=X+d<=6 and encaixa(j.cor,X+d):
                        if s.efeito(p,'ajuste'): m[i]=X+d; precisa=False
                        break
                if not precisa or not j.pronta('ajuste'): break
        if precisa and j.pronta('coringa') and len(j.cor)>=BAL['coringa_cor']:
            if s.efeito(p,'coringa'): j.coringa=True; precisa=False
        if precisa and j.pronta('rerrolar') and len(j.cor)>=BAL['rerrolar_cor'] and s.efeito(p,'rerrolar'):
            if BAL['rerrolar_tudo']: m[:]=[random.randint(1,6) for _ in m]; s.desarma(None)
            else: i=random.randrange(len(m)); m[i]=random.randint(1,6); s.desarma(i)
        # negação pública: o único dado que serve ao rival com corrente grande
        if len(r.cor)>=4 and len(m)>=2:
            so=[i for i,X in enumerate(m) if encaixa(r.cor,X)]
            if len(so)==1:
                i=so[0]
                if j.pronta('virar') and not encaixa(r.cor,7-m[i]):
                    if s.efeito(p,'virar'): m[i]=7-m[i]; s.desarma(i)
                elif j.pronta('rerrolar') and s.efeito(p,'rerrolar'):
                    if BAL['rerrolar_tudo']: m[:]=[random.randint(1,6) for _ in m]; s.desarma(None)
                    else: m[i]=random.randint(1,6); s.desarma(i)
        # armadilhas (uma armada por vez)
        if j.armada is None:
            if j.pronta('interferencia') and len(r.cor)>=3: s.armar(p,'interferencia')
            elif j.pronta('pedagio') and len(r.cor)>=3: s.armar(p,'pedagio')
            elif j.pronta('fundo') and (r.bolso is not None or len(r.cor)>=1): s.armar(p,'fundo')
            elif j.pronta('ancora') and len(j.cor)>=3: s.armar(p,'ancora')
            elif j.pronta('espelho') and len(r.cor)>=2 and len(m)>=3:
                i_meu,_=s.planeja(p)
                alvos=[i for i,X in enumerate(m) if i!=i_meu and encaixa(r.cor,X) and not encaixa(r.cor,7-X)]
                if alvos: s.armar(p,'espelho',alvos[0])
    def passa(s,p):
        """o robô passa a vez sem pegar dado (gancho para cartas novas, em sim/novas.py)"""
        return False
    def vez_de(s,p):
        j=s.j[p]
        s.cartas_antes(p)
        if s.passa(p): s.decidir(p); return
        n_pegas=1
        if j.pronta('pressa') and len(j.cor)>=2 and len(s.mesa)>=2:
            ok=any('corrente' in s.destinos(p,a) and any(encaixa(j.cor+[a],b) for k,b in enumerate(s.mesa) if k!=i) for i,a in enumerate(s.mesa))
            if ok and s.efeito(p,'pressa'): n_pegas=2
        # Sobrecarga antes do 6.º dado: com corrente de 5 e um dado que entra, o disparo automático de 6 leva o +2
        if j.pronta('sobrecarga') and BAL['sobre']==2 and len(j.cor)==5 and any(encaixa(j.cor,X,j.coringa) for X in s.mesa):
            if s.efeito(p,'sobrecarga'): j.sobre=True
        for k in range(n_pegas):
            if not s.mesa: break
            # o segundo dado da Pressa é opcional: sem saída segura, o robô dispensa
            if k>0 and s.sem_saida(p): break
            i,m=s.planeja(p); v=s.tirar(p,i)
            ds=s.destinos(p,v); s.espelhado=False
            if m not in ds: m = max(ds,key=lambda x:s.nota(p,v,x)) if ds else 'corrente'
            s.colocar(p,v,m)
            # com 6 a corrente dispara sozinha; o segundo dado da Pressa (se houver) começa outra
            if len(j.cor)>=LIM: s.fire(p)
            if max(x.pts for x in s.j)>=s.meta: return
        s.decidir(p)
    def decidir(s,p):
        j=s.j[p]
        if s.quer_disparar(p):
            L=len(j.cor)
            if j.pronta('sobrecarga') and (L in (3,4) if BAL['sobre']=='curto2' else L in (4,5) if BAL['sobre']=='teto6' else L>=(5 if BAL['sobre']=='dado' else 4)):
                if s.efeito(p,'sobrecarga'): j.sobre=True
            s.fire(p)
    def jogar(s):
        while max(x.pts for x in s.j)<s.meta and s.turnos<800:
            if not s.mesa:
                s.mesa=[random.randint(1,6) for _ in range(5)]; s.marca=None; s.rodadas=getattr(s,'rodadas',0)+1
                for x in s.j:
                    if x.armada=='espelho': x.armada=None  # marca sem dono (não acontece na prática)
                if s.j[0].pts!=s.j[1].pts: s.vez=0 if s.j[0].pts<s.j[1].pts else 1
            s.vez_de(s.vez)
            s.vez=1-s.vez; s.turnos+=1
        if s.vencedor is not None: return s.vencedor
        return 0 if s.j[0].pts>=s.meta else 1

def duelo(d0,d1,n,info='marca'):
    w=0
    for i in range(n):
        if i%2==0: w+= Partida([d0,d1],inicia=i//2%2,info=info).jogar()==0
        else: w+= Partida([d1,d0],inicia=i//2%2,info=info).jogar()==1
    return w/n
