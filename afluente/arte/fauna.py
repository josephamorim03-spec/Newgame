"""Fauna do Cerrado (v1.9): 12 bichos modelados e animados no Blender (bpy), renderizados quadro a quadro.

Uso:  venv/bin/python fauna.py fauna_saida/            (todos)
      SOMENTE=onca,lobo venv/bin/python fauna.py fauna_saida/
      PREVIA=1 AMOSTRAS=16 ...                         (só 2 quadros por animação, para conferir a forma)
Depois: venv/bin/python montar_fauna.py fauna_saida/ fauna.webp fauna.json

Convenções (as mesmas de afluente_sprites.py):
- 1 unidade = raio do hexágono; câmera ortográfica a 52°; sol do noroeste; sombra num "shadow catcher".
- O bicho olha para +x (direita) e é girado 28° para mostrar três quartos. No jogo, o espelho faz a esquerda.
- Duas animações em laço, de 8 quadros cada: "anda" (passo) e "para" (respira, bica, abana o rabo, olha).
  Os bichos de poleiro (tucano, martim-pescador) e o joão-de-barro usam "para" e "pula" no lugar de "anda".

Desde a v1.9 o corpo não é mais um monte de esferas encostadas. É uma superfície contínua (metaball):
- o tronco, o pescoço, a cabeça, a cauda e as pernas são "tubos" de influência que se fundem nas juntas, como
  músculo sob a pele (ombro, coxa, papada);
- um esqueleto simples (cinemática direta) posiciona tudo a cada quadro: quadril, joelho, pescoço, cabeça, cauda, asa;
- bicos, orelhas, pernas finas de ave, asas e poleiros são malhas "loft" (anéis elípticos ao longo de um caminho),
  com UV ao longo do comprimento para o degradê (ponta preta do bico do tucano, por exemplo);
- a pelagem é um material só, com regiões por coordenada do bicho (barriga clara, crina e meias pretas do lobo,
  faixa do tamanduá) e rosetas de Voronoi na onça.
"""
import json
import math
import os
import sys

import bpy
from mathutils import Euler, Matrix, Vector
from bpy_extras.object_utils import world_to_camera_view

sys.argv = [sys.argv[0]] + [a for a in sys.argv[1:]]
OUT = sys.argv[-1] if len(sys.argv) > 1 and not sys.argv[-1].endswith('.py') else 'fauna_saida'
sys.argv = [sys.argv[0], OUT]                  # o módulo de sprites lê a pasta de saída de sys.argv
import afluente_sprites as A                   # noqa: E402  (helpers: reset, camera, mat, ico, mesh)

os.makedirs(OUT, exist_ok=True)
PX, SCALE = 220, 0.62                          # 220 px cobrem 0,62 unidade (~355 px por unidade)
FR = 8                                         # quadros por animação
YAW = math.radians(-28)
SAMPLES = int(os.environ.get('AMOSTRAS', '40'))
TAU = math.tau

# metaball: campo s*(1-d²/r²)³ por elemento, superfície onde a soma vale THRESH.
STIFF, THRESH = 2.0, 0.6
KB = 1 / math.sqrt(1 - (THRESH / STIFF) ** (1 / 3))   # raio de influência / raio visível (elemento sozinho)
HC = 0.35                                              # espaçamento das bolas num tubo, em raios
KC = 1 / math.sqrt(1 - (THRESH * HC * 35 / (32 * STIFF)) ** (2 / 7))  # idem num tubo denso (integral do campo)
RES = float(os.environ.get('RESOLUCAO', '0.0021'))     # tamanho da célula da malha do metaball no render


# ---------------------------------------------------------------- esqueleto (cinemática direta)

class Sk:
    """juntas com posição de repouso (no espaço do bicho) e pai. pose() calcula, para cada junta, a matriz D que
    leva um ponto do repouso para a pose: D = W_pose · W_repouso⁻¹."""

    def __init__(self):
        self.j = {'raiz': (None, Vector((0, 0, 0)))}
        self.ordem = ['raiz']
        self.D = {}

    def add(self, nome, loc, pai='raiz'):
        self.j[nome] = (pai, Vector(loc))
        self.ordem.append(nome)

    def pose(self, **kw):
        lift = kw.pop('z', 0.0)
        hop = kw.pop('hop', 0.0)
        W = {}
        for n in self.ordem:
            pai, pos = self.j[n]
            rx, ry, rz = kw.get(n, (0, 0, 0))
            R = Euler((math.radians(rx), math.radians(ry), math.radians(rz))).to_matrix().to_4x4()
            if pai is None:
                W[n] = Matrix.Translation((0, 0, hop)) @ R
            else:
                off = pos - self.j[pai][1]
                if n == 'corpo':
                    off = off + Vector((0, 0, lift))
                W[n] = W[pai] @ Matrix.Translation(off) @ R
            self.D[n] = W[n] @ Matrix.Translation(-pos)

    def pt(self, j, co):
        return self.D[j] @ Vector(co)

    def q(self, j):
        return self.D[j].to_quaternion()


# ---------------------------------------------------------------- corpo contínuo (metaball)

class Corpo:
    def __init__(self, nome, m, sk):
        mb = bpy.data.metaballs.new(nome)
        mb.resolution = 0.006
        mb.render_resolution = RES
        mb.threshold = THRESH
        mb.update_method = 'FAST'
        self.mb = mb
        self.o = A.link(bpy.data.objects.new(nome, mb))
        mb.materials.append(m)
        self.sk = sk

    def _el(self, tipo, co, r, esc=None, quat=None):
        e = self.mb.elements.new(type=tipo)
        e.co = co
        e.radius = r
        e.stiffness = STIFF
        if esc:
            e.size_x, e.size_y, e.size_z = esc
        if quat is not None:
            e.rotation = quat
        return e

    def bola(self, j, co, r, esc=(1, 1, 1), rot=(0, 0, 0)):
        """elipsoide de raio visível r (semieixos r·esc), girado por rot (graus) e pela junta"""
        q = self.sk.q(j) @ Euler([math.radians(a) for a in rot]).to_quaternion()
        self._el('ELLIPSOID', self.sk.pt(j, co), r * KB, esc, q)

    def tubo(self, pts):
        """tubo de raio variável por uma sequência de (junta, ponto, raio visível). Cada ponto vai com a sua junta,
        então o tubo dobra suave entre juntas (pescoço, joelho, cauda)."""
        P = [(self.sk.pt(j, co), r) for j, co, r in pts]
        for (a, ra), (b, rb) in zip(P, P[1:]):
            L = (b - a).length
            u = 0.0
            while u < 1.0:
                r = ra + (rb - ra) * u
                self._el('BALL', a.lerp(b, u), r * KC)
                u += HC * r / max(L, 1e-6)
        b, rb = P[-1]
        self._el('BALL', b, rb * KC)


# ---------------------------------------------------------------- malhas de detalhe

def loft(nome, sk, sec, m, n=14, ref=(0, 0, 1), tampa=True):
    """malha por anéis elípticos ao longo de um caminho. sec = [(junta, ponto, a, b)]: a = meia-largura (lado),
    b = meia-altura (na direção de ref). Ganha UV com u ao longo do caminho (0 na base, 1 na ponta)."""
    P = [(sk.pt(j, co), a, b, sk.D[j]) for j, co, a, b in sec]
    L = len(P)
    verts, faces, uvs = [], [], []
    for i, (p, a, b, D) in enumerate(P):
        t = (P[min(i + 1, L - 1)][0] - P[max(i - 1, 0)][0]).normalized()
        rf = (D.to_3x3() @ Vector(ref)).normalized()
        side = t.cross(rf)
        if side.length < 1e-5:
            side = t.cross(Vector((1, 0, 0)))
        side.normalize()
        up = side.cross(t).normalized()
        for k in range(n):
            ang = TAU * k / n
            verts.append(p + side * (math.cos(ang) * a) + up * (math.sin(ang) * b))
            uvs.append((i / (L - 1), k / n))
    for i in range(L - 1):
        for k in range(n):
            k2 = (k + 1) % n
            faces.append((i * n + k, i * n + k2, (i + 1) * n + k2, (i + 1) * n + k))
    if tampa:
        for i, sgn in ((0, -1), (L - 1, 1)):
            c = len(verts)
            verts.append(P[i][0] + (P[i][0] - P[i - sgn][0]).normalized() * min(P[i][1], P[i][2]) * 0.5 * (1 if i else 1))
            uvs.append((i / (L - 1), 0.5))
            for k in range(n):
                k2 = (k + 1) % n
                faces.append((i * n + k2, i * n + k, c) if sgn < 0 else (i * n + k, i * n + k2, c))
    me = bpy.data.meshes.new(nome)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    uv = me.uv_layers.new(name='UVMap')
    for poly in me.polygons:
        poly.use_smooth = True
        for li in poly.loop_indices:
            uv.data[li].uv = uvs[me.loops[li].vertex_index]
    me.materials.append(m)
    return A.link(bpy.data.objects.new(nome, me))


def chapa(nome, sk, j, contorno, z, m, esp=0.0015, cor_baixo=None):
    """placa fina (asa, cauda de arara): contorno no plano xy da junta, na altura z; com cor_baixo, a face de baixo
    é outra placa logo abaixo, de outra cor"""
    out = []
    for dz, mm, inv in ((esp, m, False), (-esp, cor_baixo or m, True)):
        vs = [tuple(sk.pt(j, (x, y, z + dz))) for x, y in contorno]
        f = list(range(len(vs)))
        me = bpy.data.meshes.new(nome)
        me.from_pydata(vs, [], [f[::-1] if inv else f])
        me.materials.append(mm)
        out.append(A.link(bpy.data.objects.new(nome, me)))
    return out


def preso(sk, j, o):
    """objeto criado na posição de repouso passa a seguir a junta"""
    o.matrix_basis = sk.D[j] @ o.matrix_basis
    return o


def olho(sk, j, co, r=0.0045, cor='#151210'):
    return preso(sk, j, A.ico(r, co, A.mat('olho' + cor, cor, 0.22), 2, smooth=True))


def bolinha(sk, j, co, r, m, esc=(1, 1, 1)):
    return preso(sk, j, A.ico(r, co, m, 3, esc, smooth=True))


# ---------------------------------------------------------------- materiais

def _nodes(m):
    m.use_nodes = True
    return m.node_tree, m.node_tree.nodes['Principled BSDF']


def _mr(nt, val, a, b, c=0.0, d=1.0):
    n = nt.nodes.new('ShaderNodeMapRange')
    n.inputs['From Min'].default_value = a
    n.inputs['From Max'].default_value = b
    n.inputs['To Min'].default_value = c
    n.inputs['To Max'].default_value = d
    n.clamp = True
    nt.links.new(val, n.inputs['Value'])
    return n.outputs['Result']


def _vm(nt, op, a, b=None, vec=None):
    n = nt.nodes.new('ShaderNodeVectorMath')
    n.operation = op
    nt.links.new(a, n.inputs[0])
    if b is not None:
        nt.links.new(b, n.inputs[1])
    if vec is not None:
        n.inputs[1].default_value = vec
    return n.outputs['Value'] if op in ('LENGTH', 'DOT_PRODUCT') else n.outputs['Vector']


def _math(nt, op, a, b=None, val=None):
    n = nt.nodes.new('ShaderNodeMath')
    n.operation = op
    nt.links.new(a, n.inputs[0])
    if b is not None:
        nt.links.new(b, n.inputs[1])
    elif val is not None:
        n.inputs[1].default_value = val
    return n.outputs[0]


def _regiao(nt, co, reg):
    """fator 0..1 de uma região no espaço do bicho"""
    k = reg[0]
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(co, sep.inputs[0])
    if k == 'abaixo':                     # ('abaixo', z cheio, z nada, cor)
        f = _mr(nt, sep.outputs['Z'], reg[1], reg[2], 1, 0)
    elif k == 'acima':                    # ('acima', z nada, z cheio, cor)
        f = _mr(nt, sep.outputs['Z'], reg[1], reg[2], 0, 1)
    elif k == 'elip':                     # ('elip', centro, raios, suave, cor)
        d = _vm(nt, 'SUBTRACT', co, vec=reg[1])
        d = _vm(nt, 'MULTIPLY', d, vec=tuple(1 / r for r in reg[2]))
        f = _mr(nt, _vm(nt, 'LENGTH', d), 1 - reg[3], 1 + reg[3], 1, 0)
    elif k == 'faixa':                    # ('faixa', normal, c, meia-largura, suave, cor, limite elip ou None)
        nrm = Vector(reg[1]).normalized()
        d = _math(nt, 'ABSOLUTE', _math(nt, 'SUBTRACT', _vm(nt, 'DOT_PRODUCT', co, vec=tuple(nrm)), val=reg[2]))
        f = _mr(nt, d, reg[3], reg[3] + reg[4], 1, 0)
        if len(reg) > 6 and reg[6]:
            f = _math(nt, 'MULTIPLY', f, _regiao(nt, co, reg[6] + ('',)))
    return f


def pele(nome, escuro, claro, regioes=(), manchas=None, rough=0.82, fio=0.18):
    """pelagem ou plumagem: clara em cima e escura embaixo (pela normal), com fios de ruído fino, regiões de cor
    por coordenada do bicho e, se pedido, rosetas (onça)"""
    m = bpy.data.materials.get(nome)
    if m:
        return m
    m = bpy.data.materials.new(nome)
    nt, p = _nodes(m)
    p.inputs['Roughness'].default_value = rough
    tc = nt.nodes.new('ShaderNodeTexCoord')
    co = tc.outputs['Object']
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(geo.outputs['Normal'], sep.inputs[0])
    mix, fac, a, b, col = A._mix_rgba(nt)
    a.default_value = A.hexcol(escuro)
    b.default_value = A.hexcol(claro)
    nt.links.new(_mr(nt, sep.outputs['Z'], -0.35, 0.95), fac)
    # fios: ruído fino e alongado no sentido do corpo, escurece um pouco
    nz = nt.nodes.new('ShaderNodeTexNoise')
    nz.inputs['Scale'].default_value = 160.0
    nz.inputs['Detail'].default_value = 4.0
    esticado = _vm(nt, 'MULTIPLY', co, vec=(0.35, 1.0, 1.0))
    nt.links.new(esticado, nz.inputs['Vector'])
    for reg in regioes:
        f = _regiao(nt, co, reg)
        mx, ff, a2, b2, o2 = A._mix_rgba(nt)
        nt.links.new(col, a2)
        cor = reg[-2] if reg[0] == 'faixa' and len(reg) > 6 else reg[-1]
        b2.default_value = A.hexcol(cor)
        nt.links.new(f, ff)
        col = o2
    if manchas:
        esc, cor, zmin = manchas
        vo = nt.nodes.new('ShaderNodeTexVoronoi')
        vo.inputs['Scale'].default_value = esc
        dist = _vm(nt, 'ADD', co, _vm(nt, 'MULTIPLY', nz.outputs['Color'], vec=(0.006, 0.006, 0.006)))
        nt.links.new(dist, vo.inputs['Vector'])
        rp = nt.nodes.new('ShaderNodeValToRGB')
        els = rp.color_ramp.elements
        els[0].position, els[0].color = 0.0, (0.25, 0.25, 0.25, 1)
        els[1].position, els[1].color = 0.13, (0, 0, 0, 1)
        for pos, v in ((0.19, 1), (0.31, 1), (0.37, 0)):
            e = els.new(pos)
            e.color = (v, v, v, 1)
        nt.links.new(vo.outputs['Distance'], rp.inputs['Fac'])
        sp = nt.nodes.new('ShaderNodeSeparateXYZ')
        nt.links.new(co, sp.inputs[0])
        f = _math(nt, 'MULTIPLY', rp.outputs['Color'], _mr(nt, sp.outputs['Z'], zmin, zmin + 0.015))
        mx, ff, a2, b2, o2 = A._mix_rgba(nt)
        nt.links.new(col, a2)
        b2.default_value = A.hexcol(cor)
        nt.links.new(f, ff)
        col = o2
    mx, ff, a2, b2, o2 = A._mix_rgba(nt)
    nt.links.new(col, a2)
    b2.default_value = A.hexcol(escuro)
    nt.links.new(_math(nt, 'MULTIPLY', _mr(nt, nz.outputs['Fac'], 0.45, 0.75), val=fio), ff)
    nt.links.new(o2, p.inputs['Base Color'])
    return m


def bico(nome, paradas, rough=0.45):
    """degradê ao longo do comprimento de um loft (UV u): paradas = [(posição, cor)]"""
    m = bpy.data.materials.get(nome)
    if m:
        return m
    m = bpy.data.materials.new(nome)
    nt, p = _nodes(m)
    p.inputs['Roughness'].default_value = rough
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['UV'], sep.inputs[0])
    rp = nt.nodes.new('ShaderNodeValToRGB')
    els = rp.color_ramp.elements
    els[0].position, els[0].color = paradas[0][0], A.hexcol(paradas[0][1])
    els[1].position, els[1].color = paradas[1][0], A.hexcol(paradas[1][1])
    for pos, c in paradas[2:]:
        e = els.new(pos)
        e.color = A.hexcol(c)
    nt.links.new(sep.outputs['X'], rp.inputs['Fac'])
    nt.links.new(rp.outputs['Color'], p.inputs['Base Color'])
    return m


MADEIRA = None


def madeira():
    return pele('madeira', '#4a3220', '#8a6440', rough=0.9, fio=0.35)


# ---------------------------------------------------------------- pernas

def quatro_pernas(sk, xs, w, hz, kz, kdx=(0.0, 0.0), fdx=(0.0, 0.0)):
    """registra quadril (pernaN) e joelho (joelhoN) das quatro pernas. Ordem: traseira -y, traseira +y,
    dianteira -y, dianteira +y (o trote usa as diagonais 0+3 e 1+2)"""
    pernas = []
    for i, (x, y) in enumerate(((xs[0], -w), (xs[0], w), (xs[1], -w), (xs[1], w))):
        tr = 0 if i < 2 else 1
        q, k, f = (x, y, hz), (x + kdx[tr], y, kz), (x + fdx[tr], y, 0.0)
        sk.add(f'perna{i}', q, 'corpo')
        sk.add(f'joelho{i}', k, f'perna{i}')
        pernas.append((i, q, k, f))
    return pernas


def desenha_pernas(C, pernas, r0, r1, r2, pata=None):
    """perna contínua do quadril (grossa, funde com o corpo) ao pé; pata = (escala do pé, deslocamento x)"""
    for i, q, k, f in pernas:
        fz = (f[0], f[1], r2 * 0.95)
        C.tubo([(f'perna{i}', q, r0), (f'joelho{i}', k, r1), (f'joelho{i}', fz, r2)])
        if pata:
            esc, dx = pata
            C.bola(f'joelho{i}', (f[0] + dx, f[1], r2 * 0.8), r2, esc)


def ave_pernas(sk, hips, joelho_dx, joelho_z, pai='raiz'):
    for i, (x, y, z) in enumerate(hips):
        sk.add(f'perna{i}', (x, y, z), pai)
        sk.add(f'joelho{i}', (x + joelho_dx, y, joelho_z), f'perna{i}')
    return [(i, h, (h[0] + joelho_dx, h[1], joelho_z), (h[0], h[1], 0.0)) for i, h in enumerate(hips)]


def desenha_ave_pernas(sk, pernas, r, m, dedos=0.012):
    for i, h, k, f in pernas:
        J, K = f'perna{i}', f'joelho{i}'
        fz = (f[0], f[1], r * 0.9)
        loft(f'perna{i}', sk, [(J, h, r * 1.5, r * 1.5), (K, k, r * 1.05, r * 1.05), (K, fz, r * 0.9, r * 0.9)], m, 10)
        for ang in (-35, 0, 35, 180):           # três dedos para a frente, um para trás
            a = math.radians(ang)
            L = dedos * (0.6 if ang == 180 else 1.0)
            ponta = (f[0] + math.cos(a) * L, f[1] + math.sin(a) * L, r * 0.4)
            loft(f'dedo{i}', sk, [(K, fz, r * 0.7, r * 0.6), (K, ponta, r * 0.35, r * 0.3)], m, 6)


# ---------------------------------------------------------------- bichos
# cada função registra as juntas no esqueleto e devolve (desenha, estilo). desenha(sk) cria a geometria na pose atual.

def capivara(sk):
    pelo = pele('capivara', '#5a3b22', '#a87c4f', [('abaixo', 0.03, 0.055, '#4a3020'),
                                                    ('elip', (0.16, 0, 0.08), (0.03, 0.05, 0.04), 0.3, '#4a3020')])
    escuro = A.mat('capivara_escuro', '#2e1f14', 0.7)
    sk.add('corpo', (0, 0, 0.085))
    sk.add('pescoco', (0.06, 0, 0.09), 'corpo')
    sk.add('cauda', (-0.09, 0, 0.08), 'corpo')
    pernas = quatro_pernas(sk, (-0.055, 0.052), 0.03, 0.068, 0.034, kdx=(-0.006, 0.004))

    def desenha(sk):
        C = Corpo('capivara', pelo, sk)
        C.tubo([('corpo', (-0.088, 0, 0.078), 0.036), ('corpo', (-0.055, 0, 0.087), 0.052),
                ('corpo', (0.0, 0, 0.087), 0.053), ('corpo', (0.045, 0, 0.083), 0.045)])
        C.tubo([('pescoco', (0.06, 0, 0.088), 0.04), ('pescoco', (0.1, 0, 0.096), 0.031),
                ('pescoco', (0.135, 0, 0.092), 0.028)])
        C.bola('pescoco', (0.152, 0, 0.083), 0.026, (1.15, 0.82, 1.1))     # focinho alto e quadrado
        C.bola('pescoco', (0.11, 0, 0.108), 0.026, (1.3, 0.95, 0.85))      # testa
        desenha_pernas(C, pernas, 0.019, 0.012, 0.011, ((1.4, 1.0, 0.6), 0.006))
        bolinha(sk, 'pescoco', (0.175, 0, 0.088), 0.01, escuro, (0.6, 1.5, 0.9))
        for e in (-1, 1):
            bolinha(sk, 'pescoco', (0.098, e * 0.02, 0.128), 0.008, escuro, (0.8, 0.45, 1.0))
        olho(sk, 'pescoco', (0.126, -0.024, 0.109), 0.0045)
    return desenha, 'chao'


def anta(sk):
    pelo = pele('anta', '#221c19', '#5c5048', [('elip', (0.15, 0, 0.11), (0.05, 0.05, 0.03), 0.4, '#3c332e')])
    claro = A.mat('anta_orelha', '#ddd4c8', 0.8)
    sk.add('corpo', (0, 0, 0.13))
    sk.add('pescoco', (0.07, 0, 0.14), 'corpo')
    sk.add('tromba', (0.17, 0, 0.112), 'pescoco')
    sk.add('cauda', (-0.11, 0, 0.13), 'corpo')
    pernas = quatro_pernas(sk, (-0.07, 0.068), 0.032, 0.11, 0.055, kdx=(-0.008, 0.004))

    def desenha(sk):
        C = Corpo('anta', pelo, sk)
        C.tubo([('corpo', (-0.112, 0, 0.122), 0.045), ('corpo', (-0.07, 0, 0.135), 0.064),
                ('corpo', (-0.005, 0, 0.13), 0.062), ('corpo', (0.055, 0, 0.133), 0.052)])
        C.tubo([('pescoco', (0.07, 0, 0.142), 0.044), ('pescoco', (0.108, 0, 0.138), 0.036),
                ('pescoco', (0.145, 0, 0.122), 0.03)])
        C.bola('pescoco', (0.13, 0, 0.13), 0.034, (1.3, 0.85, 1.0))
        C.tubo([('pescoco', (0.065, 0, 0.18), 0.011), ('pescoco', (0.105, 0, 0.165), 0.009)])  # crina curta
        C.tubo([('tromba', (0.162, 0, 0.114), 0.02), ('tromba', (0.184, 0, 0.104), 0.014),
                ('tromba', (0.196, 0, 0.086), 0.0105)])
        C.bola('cauda', (-0.118, 0, 0.13), 0.011)
        desenha_pernas(C, pernas, 0.024, 0.014, 0.012, ((1.2, 1.1, 0.7), 0.004))
        for e in (-1, 1):
            o = loft('orelha', sk, [('pescoco', (0.112, e * 0.024, 0.155), 0.011, 0.004),
                                    ('pescoco', (0.108, e * 0.03, 0.175), 0.01, 0.0035),
                                    ('pescoco', (0.104, e * 0.034, 0.19), 0.002, 0.002)], pelo, 10, ref=(1, 0, 0))
            bolinha(sk, 'pescoco', (0.104, e * 0.034, 0.188), 0.0045, claro)
        olho(sk, 'pescoco', (0.148, -0.024, 0.13), 0.0042)
    return desenha, 'chao'


def onca(sk):
    pelo = pele('onca', '#a8621a', '#efae4a',
                [('elip', (0.0, 0, 0.082), (0.09, 0.026, 0.024), 0.35, '#f3e4c4'),
                 ('elip', (0.162, 0, 0.128), (0.016, 0.03, 0.014), 0.4, '#f3e4c4')],
                manchas=(50.0, '#24160d', 0.07))
    sk.add('corpo', (0, 0, 0.128))
    sk.add('pescoco', (0.07, 0, 0.14), 'corpo')
    sk.add('cauda', (-0.1, 0, 0.13), 'corpo')
    pernas = quatro_pernas(sk, (-0.072, 0.064), 0.03, 0.105, 0.05, kdx=(-0.01, 0.006))

    def desenha(sk):
        C = Corpo('onca', pelo, sk)
        C.tubo([('corpo', (-0.1, 0, 0.124), 0.042), ('corpo', (-0.055, 0, 0.13), 0.05),
                ('corpo', (0.0, 0, 0.126), 0.047), ('corpo', (0.055, 0, 0.134), 0.051)])
        C.tubo([('pescoco', (0.075, 0, 0.142), 0.04), ('pescoco', (0.11, 0, 0.15), 0.035)])
        C.bola('pescoco', (0.124, 0, 0.15), 0.037, (1.12, 1.0, 0.9))
        C.bola('pescoco', (0.157, 0, 0.137), 0.019, (1.05, 1.1, 0.85))
        C.tubo([('cauda', (-0.1, 0, 0.13), 0.014), ('cauda', (-0.15, 0, 0.105), 0.012),
                ('cauda', (-0.188, 0, 0.07), 0.011), ('cauda', (-0.205, 0, 0.042), 0.01),
                ('cauda', (-0.216, 0, 0.05), 0.0095)])
        desenha_pernas(C, pernas, 0.025, 0.016, 0.015, ((1.4, 1.05, 0.65), 0.007))
        bolinha(sk, 'pescoco', (0.176, 0, 0.142), 0.0065, A.mat('onca_nariz', '#5a2e22', 0.5), (0.8, 1.2, 0.7))
        for e in (-1, 1):
            loft('orelha', sk, [('pescoco', (0.108, e * 0.026, 0.172), 0.011, 0.004),
                                ('pescoco', (0.104, e * 0.031, 0.188), 0.008, 0.003),
                                ('pescoco', (0.101, e * 0.033, 0.194), 0.002, 0.002)], pelo, 10, ref=(1, 0, 0))
        olho(sk, 'pescoco', (0.148, -0.028, 0.158), 0.005, '#b8901a')
    return desenha, 'chao'


def lobo(sk):
    pelo = pele('lobo', '#a8481a', '#f2a24c',
                [('abaixo', 0.11, 0.14, '#1d1814'),
                 ('elip', (0.07, 0, 0.236), (0.055, 0.04, 0.026), 0.3, '#1d1814'),
                 ('elip', (0.112, 0, 0.222), (0.02, 0.03, 0.02), 0.4, '#f3ead8'),
                 ('elip', (0.178, 0, 0.241), (0.02, 0.03, 0.03), 0.3, '#1d1814'),
                 ('elip', (-0.163, 0, 0.098), (0.02, 0.03, 0.02), 0.3, '#f3ead8')])
    sk.add('corpo', (0, 0, 0.195))
    sk.add('pescoco', (0.07, 0, 0.205), 'corpo')
    sk.add('cauda', (-0.09, 0, 0.19), 'corpo')
    pernas = quatro_pernas(sk, (-0.06, 0.058), 0.022, 0.18, 0.09, kdx=(-0.012, 0.004))

    def desenha(sk):
        C = Corpo('lobo', pelo, sk)
        C.tubo([('corpo', (-0.088, 0, 0.19), 0.034), ('corpo', (-0.04, 0, 0.196), 0.037),
                ('corpo', (0.02, 0, 0.196), 0.035), ('corpo', (0.06, 0, 0.202), 0.037)])
        C.tubo([('pescoco', (0.075, 0, 0.212), 0.029), ('pescoco', (0.105, 0, 0.24), 0.022)])
        C.bola('pescoco', (0.126, 0, 0.254), 0.023, (1.2, 0.9, 0.88))
        C.tubo([('pescoco', (0.14, 0, 0.252), 0.015), ('pescoco', (0.165, 0, 0.245), 0.011),
                ('pescoco', (0.183, 0, 0.239), 0.0075)])
        C.tubo([('cauda', (-0.09, 0, 0.19), 0.013), ('cauda', (-0.128, 0, 0.152), 0.018),
                ('cauda', (-0.152, 0, 0.118), 0.016), ('cauda', (-0.164, 0, 0.096), 0.01)])
        desenha_pernas(C, pernas, 0.018, 0.0085, 0.0075, ((1.4, 1.0, 0.7), 0.004))
        for e in (-1, 1):
            loft('orelha', sk, [('pescoco', (0.12, e * 0.014, 0.266), 0.012, 0.004),
                                ('pescoco', (0.116, e * 0.02, 0.298), 0.009, 0.003),
                                ('pescoco', (0.112, e * 0.025, 0.33), 0.0015, 0.0015)], pelo, 10, ref=(1, 0, 0))
        olho(sk, 'pescoco', (0.14, -0.02, 0.262), 0.004)
    return desenha, 'chao'


def tamandua(sk):
    pelo = pele('tamandua', '#68635a', '#aca697',
                [('elip', (-0.17, 0, 0.12), (0.075, 0.06, 0.07), 0.3, '#4a453d'),
                 ('elip', (0.05, 0, 0.035), (0.028, 0.06, 0.04), 0.3, '#e6e0d0'),
                 ('faixa', (0.73, 0, 0.68), 0.095, 0.018, 0.003, '#f0eadb', ('elip', (0.0, 0, 0.1), (0.1, 0.07, 0.07), 0.15)),
                 ('faixa', (0.73, 0, 0.68), 0.095, 0.012, 0.003, '#1a1815', ('elip', (0.0, 0, 0.1), (0.1, 0.07, 0.07), 0.15))],
                fio=0.3)
    sk.add('corpo', (0, 0, 0.1))
    sk.add('pescoco', (0.07, 0, 0.1), 'corpo')
    sk.add('cauda', (-0.08, 0, 0.1), 'corpo')
    pernas = quatro_pernas(sk, (-0.05, 0.05), 0.03, 0.08, 0.04, kdx=(-0.006, 0.004))

    def desenha(sk):
        C = Corpo('tamandua', pelo, sk)
        C.tubo([('corpo', (-0.08, 0, 0.1), 0.04), ('corpo', (-0.03, 0, 0.106), 0.049),
                ('corpo', (0.03, 0, 0.1), 0.046), ('corpo', (0.065, 0, 0.098), 0.038)])
        C.tubo([('pescoco', (0.075, 0, 0.098), 0.031), ('pescoco', (0.11, 0, 0.09), 0.02),
                ('pescoco', (0.15, 0, 0.077), 0.0105), ('pescoco', (0.19, 0, 0.063), 0.0065),
                ('pescoco', (0.205, 0, 0.058), 0.0055)])
        for co, r, esc, rot in (((-0.11, 0, 0.122), 0.036, (1.2, 0.42, 1.15), -15), ((-0.152, 0, 0.13), 0.044, (1.15, 0.38, 1.1), -5),
                                ((-0.192, 0, 0.12), 0.04, (1.1, 0.34, 1.0), 10), ((-0.222, 0, 0.098), 0.026, (1.1, 0.3, 0.9), 25)):
            C.bola('cauda', co, r, esc, (0, rot, 0))
        desenha_pernas(C, pernas, 0.02, 0.014, 0.012, ((1.3, 1.1, 0.6), 0.004))
        for e in (-1, 1):
            bolinha(sk, 'pescoco', (0.09, e * 0.02, 0.118), 0.006, pelo, (0.8, 0.6, 1.0))
        olho(sk, 'pescoco', (0.112, -0.016, 0.1), 0.0032)
    return desenha, 'chao'


def seriema(sk):
    pena = pele('seriema', '#6a563a', '#b39c76', [('elip', (0.035, 0, 0.128), (0.028, 0.04, 0.022), 0.4, '#e6dbc2')], fio=0.3)
    verm = bico('seriema_bico', [(0.0, '#d4643a'), (1.0, '#b84a28')])
    perna = A.mat('seriema_perna', '#d4643a', 0.6)
    sk.add('corpo', (0, 0, 0.135))
    sk.add('pescoco', (0.045, 0, 0.15), 'corpo')
    sk.add('cauda', (-0.05, 0, 0.14), 'corpo')
    pernas = ave_pernas(sk, [(0.0, -0.014, 0.12), (0.0, 0.014, 0.12)], -0.014, 0.062)

    def desenha(sk):
        C = Corpo('seriema', pena, sk)
        C.tubo([('corpo', (-0.05, 0, 0.142), 0.026), ('corpo', (-0.012, 0, 0.137), 0.038),
                ('corpo', (0.032, 0, 0.142), 0.031)])
        C.bola('cauda', (-0.082, 0, 0.134), 0.019, (1.7, 0.75, 0.5), (0, 15, 0))
        C.bola('cauda', (-0.118, 0, 0.12), 0.014, (1.6, 0.7, 0.4), (0, 22, 0))
        C.tubo([('pescoco', (0.045, 0, 0.152), 0.018), ('pescoco', (0.068, 0, 0.19), 0.012),
                ('pescoco', (0.086, 0, 0.222), 0.011)])
        C.bola('pescoco', (0.095, 0, 0.232), 0.017, (1.3, 0.88, 0.95))
        loft('bico', sk, [('pescoco', (0.108, 0, 0.233), 0.0055, 0.006), ('pescoco', (0.128, 0, 0.231), 0.0035, 0.004),
                          ('pescoco', (0.146, 0, 0.225), 0.0008, 0.0008)], verm, 10)
        for dx, h in ((0.0, 0.046), (0.007, 0.04), (-0.007, 0.038)):   # topete de penas
            loft('topete', sk, [('pescoco', (0.094 + dx, 0, 0.246), 0.0028, 0.0018),
                                ('pescoco', (0.088 + dx * 2, 0, 0.246 + h * 0.6), 0.002, 0.0014),
                                ('pescoco', (0.078 + dx * 2.5, 0, 0.246 + h), 0.0005, 0.0005)], pena, 6, ref=(1, 0, 0))
        olho(sk, 'pescoco', (0.103, -0.015, 0.238), 0.0038)
        desenha_ave_pernas(sk, pernas, 0.0042, perna, 0.014)
    return desenha, 'chao'


def ema(sk):
    pena = pele('ema', '#625d50', '#bcb6a2', [('elip', (0.08, 0, 0.25), (0.035, 0.045, 0.03), 0.4, '#3a372f')], fio=0.3)
    perna = A.mat('ema_perna', '#857f6c', 0.8)
    bc = bico('ema_bico', [(0.0, '#5a554c'), (1.0, '#3e3a34')])
    sk.add('corpo', (0, 0, 0.205))
    sk.add('pescoco', (0.075, 0, 0.23), 'corpo')
    sk.add('cauda', (-0.08, 0, 0.21), 'corpo')
    pernas = ave_pernas(sk, [(0.01, -0.024, 0.18), (0.01, 0.024, 0.18)], -0.022, 0.092)

    def desenha(sk):
        C = Corpo('ema', pena, sk)
        C.tubo([('corpo', (-0.072, 0, 0.2), 0.04), ('corpo', (-0.025, 0, 0.21), 0.056),
                ('corpo', (0.03, 0, 0.207), 0.05), ('corpo', (0.064, 0, 0.217), 0.036)])
        C.bola('cauda', (-0.092, 0, 0.19), 0.032, (1.25, 0.9, 0.8), (0, 25, 0))    # penas caídas da traseira
        for e in (-1, 1):
            C.bola('corpo', (0.008, e * 0.03, 0.172), 0.024, (1.1, 0.8, 1.2))     # coxas
        C.tubo([('pescoco', (0.075, 0, 0.232), 0.023), ('pescoco', (0.098, 0, 0.3), 0.0135),
                ('pescoco', (0.114, 0, 0.37), 0.0115)])
        C.bola('pescoco', (0.121, 0, 0.383), 0.017, (1.35, 0.9, 0.85))
        loft('bico', sk, [('pescoco', (0.134, 0, 0.383), 0.007, 0.004), ('pescoco', (0.152, 0, 0.381), 0.006, 0.0032),
                          ('pescoco', (0.166, 0, 0.377), 0.001, 0.001)], bc, 10)
        olho(sk, 'pescoco', (0.127, -0.015, 0.389), 0.0038)
        desenha_ave_pernas(sk, pernas, 0.0075, perna, 0.02)
    return desenha, 'chao'


def garca(sk):
    branco = pele('garca', '#c4cbc6', '#ffffff', fio=0.08, rough=0.7)
    bc = bico('garca_bico', [(0.0, '#e8b53a'), (0.85, '#e0a828'), (1.0, '#8a6a20')])
    perna = A.mat('garca_perna', '#24241f', 0.8)
    sk.add('corpo', (0, 0, 0.15))
    sk.add('pescoco', (0.04, 0, 0.16), 'corpo')
    sk.add('cabeca', (0.075, 0, 0.215), 'pescoco')
    sk.add('cauda', (-0.05, 0, 0.15), 'corpo')
    pernas = ave_pernas(sk, [(0.005, -0.01, 0.134), (0.005, 0.01, 0.134)], -0.012, 0.07)

    def desenha(sk):
        C = Corpo('garca', branco, sk)
        C.tubo([('corpo', (-0.052, 0, 0.15), 0.02), ('corpo', (-0.01, 0, 0.152), 0.029),
                ('corpo', (0.034, 0, 0.157), 0.025)])
        C.bola('cauda', (-0.078, 0, 0.14), 0.015, (1.9, 0.8, 0.45), (0, 15, 0))
        C.tubo([('pescoco', (0.042, 0, 0.165), 0.012), ('pescoco', (0.068, 0, 0.19), 0.009),
                ('cabeca', (0.075, 0, 0.215), 0.0085), ('cabeca', (0.066, 0, 0.248), 0.008),
                ('cabeca', (0.068, 0, 0.272), 0.0085)])
        C.bola('cabeca', (0.072, 0, 0.281), 0.012, (1.35, 0.88, 0.92))
        loft('bico', sk, [('cabeca', (0.084, 0, 0.281), 0.0042, 0.0048), ('cabeca', (0.11, 0, 0.278), 0.0026, 0.003),
                          ('cabeca', (0.136, 0, 0.274), 0.0006, 0.0006)], bc, 10)
        olho(sk, 'cabeca', (0.078, -0.011, 0.285), 0.0028, '#d9b53a')
        desenha_ave_pernas(sk, pernas, 0.0034, perna, 0.016)
    return desenha, 'chao'


def tucano(sk):
    preto = pele('tucano', '#0e1012', '#3a4044', [('elip', (0.02, 0, 0.172), (0.024, 0.045, 0.03), 0.3, '#fff1c4'),
                                                   ('elip', (0.004, 0, 0.115), (0.016, 0.04, 0.012), 0.4, '#d6352a')],
                 rough=0.6, fio=0.1)
    bc = bico('tucano_bico', [(0.0, '#e8a020'), (0.15, '#ff9a20'), (0.55, '#f26a14'), (0.86, '#ffb43a'), (0.9, '#151515')])
    azul = A.mat('tucano_olho', '#4fa8e0', 0.3)
    sk.add('corpo', (0, 0, 0.11))
    sk.add('pescoco', (0.005, 0, 0.185), 'corpo')
    sk.add('cauda', (-0.02, 0, 0.115), 'corpo')

    def desenha(sk):
        mad = madeira()
        loft('toco', sk, [('raiz', (0, 0.01, 0.0), 0.036, 0.034), ('raiz', (0, 0.01, 0.06), 0.032, 0.03),
                          ('raiz', (0, 0.01, 0.092), 0.03, 0.028)], mad, 14)
        loft('galho', sk, [('raiz', (-0.075, 0.0, 0.094), 0.008, 0.008), ('raiz', (0.0, 0.0, 0.098), 0.012, 0.011),
                           ('raiz', (0.075, 0.0, 0.1), 0.007, 0.007)], mad, 10)
        C = Corpo('tucano', preto, sk)
        C.tubo([('corpo', (-0.008, 0, 0.115), 0.024), ('corpo', (-0.01, 0, 0.14), 0.034),
                ('corpo', (0.0, 0, 0.17), 0.029)])
        C.bola('cauda', (-0.032, 0, 0.088), 0.013, (0.95, 0.8, 1.9), (0, -25, 0))
        C.bola('cauda', (-0.042, 0, 0.06), 0.011, (0.85, 0.7, 2.0), (0, -20, 0))
        C.bola('pescoco', (0.012, 0, 0.198), 0.025, (1.0, 0.9, 0.95))
        loft('bico', sk, [('pescoco', (0.028, 0, 0.198), 0.011, 0.017), ('pescoco', (0.05, 0, 0.199), 0.011, 0.016),
                          ('pescoco', (0.08, 0, 0.196), 0.0085, 0.012), ('pescoco', (0.105, 0, 0.189), 0.005, 0.0065),
                          ('pescoco', (0.118, 0, 0.181), 0.0012, 0.0012)], bc, 14)
        bolinha(sk, 'pescoco', (0.024, -0.02, 0.205), 0.008, azul, (1, 0.5, 1))
        olho(sk, 'pescoco', (0.026, -0.025, 0.206), 0.0038)
        for e in (-1, 1):                     # pés agarrados no galho
            bolinha(sk, 'corpo', (0.006, e * 0.012, 0.106), 0.006, A.mat('tucano_pe', '#5a6a8a', 0.6), (1.4, 0.8, 0.7))
    return desenha, 'poleiro'


def martim(sk):
    azul = pele('martim', '#1a6278', '#45aac8', [('elip', (0.014, 0, 0.125), (0.026, 0.05, 0.03), 0.35, '#c8642e'),
                                                 ('elip', (0.016, 0, 0.162), (0.012, 0.04, 0.008), 0.4, '#fff6e8')],
                rough=0.55, fio=0.12)
    bc = bico('martim_bico', [(0.0, '#2a2a2a'), (1.0, '#141414')])

    def desenha(sk):
        mad = madeira()
        loft('galho', sk, [('raiz', (-0.09, 0.0, 0.085), 0.01, 0.01), ('raiz', (0.0, 0.0, 0.1), 0.0085, 0.0085),
                           ('raiz', (0.08, 0.0, 0.112), 0.006, 0.006)], mad, 10)
        loft('estaca', sk, [('raiz', (-0.06, 0.0, 0.0), 0.01, 0.01), ('raiz', (-0.06, 0.0, 0.092), 0.008, 0.008)], mad, 10)
        C = Corpo('martim', azul, sk)
        C.tubo([('corpo', (-0.004, 0, 0.115), 0.019), ('corpo', (-0.003, 0, 0.137), 0.026),
                ('corpo', (0.004, 0, 0.158), 0.022)])
        C.bola('cauda', (-0.028, 0, 0.09), 0.009, (0.85, 0.8, 2.1), (0, -20, 0))
        C.bola('pescoco', (0.012, 0, 0.181), 0.022, (1.12, 0.95, 0.95))
        C.bola('pescoco', (-0.008, 0, 0.192), 0.011, (1.2, 0.8, 0.9))           # topete
        loft('bico', sk, [('pescoco', (0.03, 0, 0.18), 0.0055, 0.0068), ('pescoco', (0.058, 0, 0.178), 0.0035, 0.004),
                          ('pescoco', (0.086, 0, 0.175), 0.0006, 0.0006)], bc, 10)
        olho(sk, 'pescoco', (0.022, -0.02, 0.187), 0.0036)
    sk.add('corpo', (0, 0, 0.11))
    sk.add('pescoco', (0.005, 0, 0.17), 'corpo')
    sk.add('cauda', (-0.015, 0, 0.12), 'corpo')
    return desenha, 'poleiro'


def joao(sk):
    pena = pele('joao', '#9a5c2a', '#dc9e62', [('elip', (0.068, -0.04, 0.056), (0.02, 0.03, 0.018), 0.4, '#f0d6ae')], fio=0.12)
    barro = pele('ninho', '#86512c', '#c98a52', fio=0.45)
    perna = A.mat('joao_perna', '#5a3a22', 0.8)
    bc = bico('joao_bico', [(0.0, '#4a3220'), (1.0, '#2a1c12')])
    sk.add('corpo', (0.05, -0.04, 0.06))
    sk.add('pescoco', (0.075, -0.04, 0.075), 'corpo')
    sk.add('cauda', (0.015, -0.04, 0.065), 'corpo')
    pernas = ave_pernas(sk, [(0.05, -0.048, 0.048), (0.05, -0.032, 0.048)], -0.006, 0.024)

    def desenha(sk):
        mad = madeira()
        loft('mourao', sk, [('raiz', (-0.07, 0.05, 0.0), 0.013, 0.013), ('raiz', (-0.07, 0.05, 0.1), 0.012, 0.012)], mad, 10)
        # ninho em forma de forno: casca de barro (metaball de outra família), boca escura virada para a câmera
        N = Corpo('ninho', barro, sk)
        N.bola('raiz', (-0.07, 0.05, 0.104), 0.032, (1.0, 0.95, 0.25))
        N.bola('raiz', (-0.07, 0.05, 0.122), 0.036, (1.2, 0.95, 0.78))
        N.bola('raiz', (-0.052, 0.028, 0.114), 0.015, (1.0, 0.9, 1.1))
        bolinha(sk, 'raiz', (-0.05, 0.013, 0.118), 0.009, A.mat('ninho_furo', '#1e120a', 1.0), (1.0, 0.5, 1.25))
        C = Corpo('joao', pena, sk)
        C.tubo([('corpo', (0.022, -0.04, 0.065), 0.012), ('corpo', (0.045, -0.04, 0.061), 0.019),
                ('corpo', (0.066, -0.04, 0.066), 0.016)])
        C.bola('cauda', (-0.008, -0.04, 0.075), 0.008, (2.1, 0.8, 0.45), (0, -15, 0))
        C.bola('pescoco', (0.083, -0.04, 0.09), 0.015)
        loft('bico', sk, [('pescoco', (0.096, -0.04, 0.09), 0.0035, 0.0035), ('pescoco', (0.114, -0.04, 0.087), 0.0007, 0.0007)], bc, 8)
        olho(sk, 'pescoco', (0.09, -0.054, 0.095), 0.003)
        desenha_ave_pernas(sk, pernas, 0.0022, perna, 0.008)
    return desenha, 'pula'


def arara(sk):
    """arara-canindé em voo (só para os bandos que cruzam o céu): asas azuis por cima, amarelas por baixo"""
    azul = pele('arara', '#1a52a8', '#4f9ae8', [('abaixo', 0.293, 0.302, '#f2b21e'),
                                                 ('elip', (0.07, 0, 0.305), (0.012, 0.05, 0.01), 0.3, '#f4f1e6'),
                                                 ('elip', (0.058, 0, 0.322), (0.02, 0.05, 0.012), 0.4, '#3fa04a')],
                rough=0.55, fio=0.1)
    asa_az = A.mat('arara_asa', '#2a66c0', 0.55)
    asa_am = A.mat('arara_asa_baixo', '#f0b41e', 0.6)
    bc = bico('arara_bico', [(0.0, '#2a2a2a'), (1.0, '#101010')])
    sk.add('corpo', (0, 0, 0.3))
    for e in (-1, 1):
        sk.add(f'asa{e}', (0.0, e * 0.016, 0.305), 'corpo')
        sk.add(f'mao{e}', (-0.012, e * 0.085, 0.305), f'asa{e}')

    def desenha(sk):
        C = Corpo('arara', azul, sk)
        C.tubo([('corpo', (-0.045, 0, 0.3), 0.015), ('corpo', (-0.005, 0, 0.302), 0.024),
                ('corpo', (0.04, 0, 0.305), 0.02)])
        C.bola('corpo', (0.06, 0, 0.308), 0.019)
        loft('bico', sk, [('corpo', (0.072, 0, 0.307), 0.008, 0.009), ('corpo', (0.084, 0, 0.302), 0.005, 0.006),
                          ('corpo', (0.09, 0, 0.292), 0.0012, 0.0012)], bc, 10)
        olho(sk, 'corpo', (0.066, -0.016, 0.312), 0.003)
        chapa('cauda', sk, 'corpo', [(-0.04, -0.012), (-0.2, -0.003), (-0.205, 0.0), (-0.2, 0.003), (-0.04, 0.012)], 0.299,
              asa_az, cor_baixo=asa_am)
        for e in (-1, 1):
            # braço (até o pulso) e mão com as primárias abertas
            chapa('asa', sk, f'asa{e}', [(0.016, e * 0.016), (0.012, e * 0.088), (-0.04, e * 0.088), (-0.036, e * 0.016)][::e], 0.305,
                  asa_az, cor_baixo=asa_am)
            pr = [(0.012, e * 0.085), (0.0, e * 0.12), (-0.022, e * 0.165), (-0.038, e * 0.172), (-0.046, e * 0.16),
                  (-0.05, e * 0.13), (-0.044, e * 0.085)]
            chapa('mao', sk, f'mao{e}', pr[::e], 0.305, asa_az, cor_baixo=asa_am)
    return desenha, 'voa'


ANIMALS = {'arara': arara, 'seriema': seriema, 'tucano': tucano, 'joao': joao, 'garca': garca, 'capivara': capivara, 'ema': ema,
           'martim': martim, 'anta': anta, 'lobo': lobo, 'tamandua': tamandua, 'onca': onca}


# ---------------------------------------------------------------- animações

def anim(sk, kind, style, i):
    """pose do quadro i (0..FR-1) da animação 'anda', 'para' ou 'voa'"""
    t = i / FR
    s, c = math.sin(TAU * t), math.cos(TAU * t)
    p = {}
    legs = sorted(n for n in sk.j if n.startswith('perna'))
    if style == 'voa':                           # bater de asas: a mão atrasa um pouco em relação ao braço
        for e in (-1, 1):
            p[f'asa{e}'] = (e * 42 * s, 0, 0)
            p[f'mao{e}'] = (e * 28 * math.sin(TAU * t - 0.9), 0, 0)
        p['hop'] = -0.008 * s
        sk.pose(**p)
        return
    if kind == 'anda' and style == 'chao':
        if len(legs) == 2:                       # aves que andam: passo alternado, corpo balança, cabeça vai e vem
            for n, sg in zip(legs, (1, -1)):
                p[n] = (0, 26 * sg * s, 0)
                p['joelho' + n[5:]] = (0, 38 * max(0.0, -sg * c), 0)
            p['z'] = 0.005 * abs(c) - 0.003
            p['pescoco'] = (0, 9 * math.sin(TAU * t * 2), 0)
            p['cauda'] = (0, -6 * s, 0)
        else:                                    # quadrúpedes: diagonais juntas (trote); o joelho dobra na volta
            for n, sg in zip(legs, (1, -1, -1, 1)):
                p[n] = (0, 22 * sg * s, 0)
                p['joelho' + n[5:]] = (0, 42 * max(0.0, -sg * c), 0)
            p['z'] = 0.004 * abs(math.sin(TAU * t))
            p['pescoco'] = (0, 4 * math.sin(TAU * t * 2), 0)
            p['cauda'] = (0, 0, 12 * s)
    elif kind == 'anda':                         # poleiro e joão-de-barro: um pulinho
        h = max(0.0, math.sin(TAU * t))
        p['hop'] = 0.02 * h if style == 'pula' else 0.0
        p['corpo'] = (0, -8 * h, 0)
        p['cauda'] = (0, -25 * h, 0)
        p['pescoco'] = (0, 10 * math.sin(TAU * t * 2), 0)
        for n in legs:
            p['joelho' + n[5:]] = (0, 30 * h, 0)
    else:                                        # parado: respira, bica ou olha, abana a cauda
        p['z'] = 0.002 * s
        if style == 'chao' and len(legs) == 2:   # ave no chão: bica o chão no meio do ciclo
            dip = max(0.0, math.sin(math.pi * min(1, max(0, (t - 0.25) / 0.5))))
            p['pescoco'] = (0, 55 * dip, 0)
            if 'cabeca' in sk.j:
                p['cabeca'] = (0, 20 * dip, 0)
            p['cauda'] = (0, -8 * dip, 0)
        elif style == 'chao':                    # quadrúpede: olha para o lado e abaixa a cabeça para farejar
            p['pescoco'] = (0, 18 * max(0.0, math.sin(TAU * t)), 16 * math.sin(TAU * t))
            p['cauda'] = (0, 0, 22 * s)
            if 'tromba' in sk.j:
                p['tromba'] = (0, 0, 25 * math.sin(TAU * t * 2))
        else:                                    # poleiro: vira a cabeça e balança a cauda
            p['pescoco'] = (8 * math.sin(TAU * t), 0, 30 * math.sin(TAU * t))
            p['cauda'] = (0, -15 * max(0.0, math.sin(TAU * t * 2)), 0)
    sk.pose(**p)


def construir(sk, desenha):
    """cria o bicho na pose atual, preso a uma raiz girada (três quartos); devolve o que foi criado"""
    antes = set(bpy.data.objects)
    raiz = A.link(bpy.data.objects.new('raiz', None))
    raiz.rotation_euler.z = YAW
    desenha(sk)
    novos = [o for o in bpy.data.objects if o not in antes]
    for o in novos:
        if o is not raiz:
            o.parent = raiz
    bpy.context.view_layer.update()
    return novos


def apagar(objs):
    for o in objs:
        d = o.data
        bpy.data.objects.remove(o)
        if d is not None and d.users == 0:
            if isinstance(d, bpy.types.MetaBall):
                bpy.data.metaballs.remove(d)
            elif isinstance(d, bpy.types.Mesh):
                bpy.data.meshes.remove(d)


def render_animal(name, build):
    sc = A.reset()
    sc.cycles.samples = SAMPLES
    if name == 'arara':                          # no céu: sem chão e sem sombra
        for o in list(sc.objects):
            if o.type == 'MESH':
                bpy.data.objects.remove(o)
    cam = A.camera(sc, PX, SCALE, 0.18)
    sk = Sk()
    desenha, style = build(sk)
    meta = {}
    u = world_to_camera_view(sc, cam, Vector((0, 0, 0)))
    previa = os.environ.get('PREVIA')
    for kind in (('voa',) if style == 'voa' else ('para', 'anda')):
        for i in ([0, 3] if previa else range(FR)):
            anim(sk, kind, style, i)
            novos = construir(sk, desenha)
            sc.render.filepath = os.path.join(OUT, f'{name}_{kind}{i}.png')
            bpy.ops.render.render(write_still=True)
            apagar(novos)
            meta[f'{name}_{kind}{i}'] = {'px': PX, 'ax': round(u.x * PX, 2), 'ay': round((1 - u.y) * PX, 2), 'unit': round(PX / SCALE, 3)}
    print('ok', name, style, flush=True)
    return meta, style


if __name__ == '__main__':
    only = os.environ.get('SOMENTE')
    meta_path = os.path.join(OUT, 'meta.json')
    meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
    styles = meta.pop('_estilo', {})
    for n, b in ANIMALS.items():
        if only and n not in only.split(','):
            continue
        m, st = render_animal(n, b)
        meta.update(m)
        styles[n] = st
    meta['_estilo'] = styles
    with open(meta_path, 'w') as f:
        json.dump(meta, f, indent=1)
