"""Fauna do Cerrado (v1.4): 11 bichos modelados e animados no Blender (bpy), renderizados quadro a quadro.

Uso:  venv/bin/python fauna.py fauna_saida/            (todos)
      SOMENTE=onca,lobo venv/bin/python fauna.py fauna_saida/
Depois: venv/bin/python montar_fauna.py fauna_saida/ fauna.webp fauna.json

Convenções (as mesmas de afluente_sprites.py):
- 1 unidade = raio do hexágono; câmera ortográfica a 52°; sol do noroeste; sombra num "shadow catcher".
- Cada bicho é montado com "juntas" (empties) nos pontos de giro: quadril, ombro, pescoço, cauda, asa.
  As peças do corpo são filhas das juntas; a animação só gira juntas e sobe ou desce o corpo.
- O bicho olha para +x (direita) e é girado 28° para mostrar três quartos. No jogo, o espelho faz a esquerda.
- Duas animações em laço, de 8 quadros cada: "anda" (passo) e "para" (respira, bica, abana o rabo, olha).
  Os bichos de poleiro (tucano, martim-pescador) e o joão-de-barro usam "para" e "pula" no lugar de "anda".
"""
import json
import math
import os
import sys

import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

sys.argv = [sys.argv[0]] + [a for a in sys.argv[1:]]
OUT = sys.argv[-1] if len(sys.argv) > 1 and not sys.argv[-1].endswith('.py') else 'fauna_saida'
sys.argv = [sys.argv[0], OUT]                  # o módulo de sprites lê a pasta de saída de sys.argv
import afluente_sprites as A                   # noqa: E402  (helpers: reset, camera, mat, foliage, ico, cyl, cube)

os.makedirs(OUT, exist_ok=True)
PX, SCALE = 200, 0.62                          # 200 px cobrem 0,62 unidade (~323 px por unidade)
FR = 8                                         # quadros por animação
YAW = math.radians(-28)
SAMPLES = int(os.environ.get('AMOSTRAS', '48'))
TAU = math.tau


# ---------------------------------------------------------------- juntas

def update():
    bpy.context.view_layer.update()


def joint(name, loc, parent=None):
    e = bpy.data.objects.new(name, None)
    e.empty_display_size = 0.02
    e.location = loc
    A.link(e)
    update()
    if parent is not None:
        attach(e, parent)
    return e


def attach(o, j):
    update()
    mw = o.matrix_world.copy()
    o.parent = j
    o.matrix_parent_inverse = j.matrix_world.inverted()
    o.matrix_world = mw
    return o


def on(j, *objs):
    for o in objs:
        attach(o, j)
    return objs[0] if objs else None


class Rig:
    def __init__(self):
        self.root = joint('raiz', (0, 0, 0))
        self.j = {'raiz': self.root}
        self.rest = {}

    def add(self, name, loc, parent='raiz'):
        self.j[name] = joint(name, loc, self.j[parent])
        return self.j[name]

    def done(self):
        self.root.rotation_euler.z = YAW
        update()
        for n, j in self.j.items():
            self.rest[n] = (tuple(j.location), tuple(j.rotation_euler))

    def pose(self, **kw):
        """kw: junta=(rx, ry, rz) em graus, somados ao repouso; 'z' sobe o corpo; 'x' anda (não usado)"""
        for n, j in self.j.items():
            loc, rot = self.rest[n]
            j.location = loc
            j.rotation_euler = rot
        if 'z' in kw:
            self.j['corpo'].location.z = self.rest['corpo'][0][2] + kw.pop('z')
        if 'hop' in kw:
            self.root.location.z = kw.pop('hop')
        for n, (rx, ry, rz) in kw.items():
            if n in self.j:
                r = self.rest[n][1]
                self.j[n].rotation_euler = (r[0] + math.radians(rx), r[1] + math.radians(ry), r[2] + math.radians(rz))
        update()


def seg(p0, p1, r0, r1, m, verts=8, smooth=True):
    """cone/cilindro entre dois pontos (pescoço, perna, bico, cauda)"""
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    o = A.cyl(r0, d.length, tuple((p0 + p1) / 2), m, verts, r1, smooth=smooth)
    o.rotation_euler = Vector((0, 0, 1)).rotation_difference(d).to_euler()
    return o


def rot_y(o, deg):
    o.rotation_euler.y += math.radians(deg)
    return o


def eye(p, r=0.0045):
    return A.ico(r, p, A.mat('olho', '#151210', 0.25), 2, smooth=True)


def leg(rig, name, hip, length, r, m, parent='corpo', foot=None, knee=0.0):
    """perna que gira no quadril (eixo y): do quadril até o chão, com joelho opcional (aves: joelho para trás)"""
    j = rig.add(name, hip, parent)
    x, y, z = hip
    if knee:
        k = (x - knee, y, z - length * 0.5)
        on(j, seg(hip, k, r, r * 0.8, m, 6), seg(k, (x, y, 0.004), r * 0.8, r * 0.6, m, 6))
    else:
        on(j, seg(hip, (x, y, 0.006), r, r * 0.8, m, 6))
    if foot:
        on(j, A.ico(r * 1.4, (x + r * 1.2, y, 0.004), foot, 1, (2.2, 1.2, 0.5)))
    return j


def spots(center, radii, n, m, rmin=0.005, rmax=0.009, seed=1, front=0.0):
    """manchas na superfície de um elipsoide (rosetas da onça), só na metade de cima e voltada para a câmera"""
    import random
    R = random.Random(seed)
    cx, cy, cz = center
    a, b, c = radii
    out = []
    for _ in range(n):
        th = R.uniform(-math.pi * 0.95, math.pi * 0.95)
        ph = R.uniform(-0.15, 1.2)
        nx, ny, nz = math.cos(ph) * math.cos(th), math.cos(ph) * math.sin(th), math.sin(ph)
        if ny > 0.55:                            # lado de trás: a câmera não vê
            continue
        r = R.uniform(rmin, rmax)
        o = A.ico(r, (cx + a * nx * 1.0, cy + b * ny * 1.0, cz + c * nz * 1.0), m, 1, (1, 1, 0.35))
        o.rotation_euler = Vector((0, 0, 1)).rotation_difference(Vector((nx / a, ny / b, nz / c))).to_euler()
        out.append(o)
    return out


def seriema(rig):
    pena = A.foliage('seriema', '#8a7150', '#d2bf9c')
    clara = A.mat('seriema_peito', '#eadfc6', 0.8)
    verm = A.mat('seriema_perna', '#d4643a', 0.6)
    rig.add('corpo', (0, 0, 0.13))
    on(rig.j['corpo'], A.ico(0.05, (0, 0, 0.135), pena, 3, (1.4, 0.82, 0.88), smooth=True),
       A.ico(0.036, (0.03, -0.008, 0.125), clara, 2, (1.15, 0.8, 0.9), smooth=True))
    for s in (-1, 1):
        leg(rig, f'perna{s}', (0.0, s * 0.014, 0.115), 0.115, 0.0055, verm, foot=verm, knee=-0.012)
    rig.add('cauda', (-0.06, 0, 0.14), 'corpo')
    on(rig.j['cauda'], seg((-0.06, 0, 0.14), (-0.135, 0, 0.115), 0.022, 0.008, pena))
    rig.add('pescoco', (0.055, 0, 0.15), 'corpo')
    on(rig.j['pescoco'], seg((0.055, 0, 0.15), (0.09, 0, 0.225), 0.016, 0.011, pena),
       A.ico(0.022, (0.096, 0, 0.233), pena, 2, (1.25, 0.9, 0.95), smooth=True),
       seg((0.112, 0, 0.232), (0.145, 0, 0.226), 0.0065, 0.0015, verm, 6),
       seg((0.09, 0, 0.25), (0.072, 0, 0.285), 0.004, 0.0015, pena, 5),
       seg((0.096, 0, 0.252), (0.088, 0, 0.29), 0.004, 0.0015, pena, 5),
       eye((0.107, -0.017, 0.24)))
    return 'chao'


def ema(rig):
    pena = A.foliage('ema', '#6a6557', '#b8b29e')
    perna = A.mat('ema_perna', '#857f6c', 0.8)
    rig.add('corpo', (0, 0, 0.2))
    on(rig.j['corpo'], A.blob(0.078, (0, 0, 0.205), pena, (1.3, 0.92, 0.88), seed=3, amount=0.22))
    for s in (-1, 1):
        leg(rig, f'perna{s}', (0.01, s * 0.024, 0.17), 0.17, 0.0095, perna, foot=perna, knee=-0.02)
    rig.add('cauda', (-0.09, 0, 0.21), 'corpo')
    on(rig.j['cauda'], A.blob(0.042, (-0.105, 0, 0.215), pena, (1.1, 1, 0.9), seed=4, amount=0.32))
    rig.add('pescoco', (0.08, 0, 0.24), 'corpo')
    on(rig.j['pescoco'], seg((0.075, 0, 0.235), (0.115, 0, 0.375), 0.02, 0.011, pena),
       A.ico(0.021, (0.12, 0, 0.385), pena, 2, (1.3, 0.9, 0.9), smooth=True),
       seg((0.135, 0, 0.383), (0.165, 0, 0.378), 0.008, 0.002, A.mat('ema_bico', '#4e4a44', 0.6), 6),
       eye((0.128, -0.017, 0.39)))
    return 'chao'


def tucano(rig):
    preto = A.foliage('tucano', '#121416', '#3a4044')
    branco = A.mat('tucano_papo', '#fff3cf', 0.6)
    bico = A.foliage('tucano_bico', '#e06a14', '#ffb43a')
    madeira = A.foliage('poleiro', '#5a3d25', '#8a6440')
    A.cyl(0.035, 0.09, (0, 0, 0.045), madeira, 9, 0.03)
    seg((-0.07, 0, 0.095), (0.07, 0, 0.098), 0.012, 0.009, madeira, 6)
    rig.add('corpo', (0, 0, 0.1))
    on(rig.j['corpo'], A.ico(0.04, (-0.01, 0, 0.145), preto, 3, (1.05, 0.9, 1.35), smooth=True),
       A.ico(0.026, (0.018, -0.008, 0.16), branco, 2, (0.8, 0.9, 1.0), smooth=True),
       A.ico(0.011, (0.012, -0.012, 0.12), A.mat('tucano_rabo', '#d6352a', 0.6), 1))
    rig.add('cauda', (-0.03, 0, 0.115), 'corpo')
    on(rig.j['cauda'], seg((-0.03, 0, 0.115), (-0.06, 0, 0.05), 0.016, 0.01, preto, 6))
    rig.add('pescoco', (0.01, 0, 0.18), 'corpo')
    on(rig.j['pescoco'], A.ico(0.028, (0.012, 0, 0.198), preto, 2, (1, 0.9, 0.95), smooth=True),
       A.ico(0.03, (0.068, 0, 0.198), bico, 2, (2.0, 0.55, 0.62), smooth=True),
       A.ico(0.009, (0.024, -0.02, 0.205), A.mat('tucano_olho', '#5fb3e0', 0.3), 1),
       eye((0.026, -0.026, 0.206), 0.004),
       A.ico(0.007, (0.11, 0, 0.192), A.mat('tucano_ponta', '#1a1a1a', 0.5), 1))
    return 'poleiro'


def joao(rig):
    barro = A.foliage('ninho', '#8a5530', '#c98a52')
    pena = A.foliage('joao', '#a0622e', '#d89a60')
    claro = A.mat('joao_peito', '#efd2a8', 0.8)
    perna = A.mat('joao_perna', '#5a3a22', 0.8)
    madeira = A.foliage('mourao', '#5a3d25', '#8a6440')
    # ninho de barro em cima de um mourão de cerca (parado), atrás do pássaro; a porta vira para a câmera
    A.cyl(0.016, 0.13, (-0.09, 0.06, 0.065), madeira, 7)
    A.cyl(0.05, 0.012, (-0.09, 0.06, 0.135), barro, 12)
    A.ico(0.06, (-0.09, 0.06, 0.16), barro, 3, (1.25, 0.95, 0.82), smooth=True)
    A.ico(0.016, (-0.075, 0.006, 0.165), A.mat('ninho_furo', '#24160c', 1.0), 2, (1.0, 0.6, 1.2))
    rig.add('corpo', (0.05, -0.04, 0.04))
    on(rig.j['corpo'], A.ico(0.033, (0.05, -0.04, 0.06), pena, 3, (1.35, 0.9, 0.95), smooth=True),
       A.ico(0.022, (0.068, -0.048, 0.055), claro, 2, (1, 0.8, 0.85), smooth=True))
    for s in (-1, 1):
        leg(rig, f'perna{s}', (0.05, -0.04 + s * 0.01, 0.04), 0.04, 0.003, perna)
    rig.add('cauda', (0.012, -0.04, 0.065), 'corpo')
    on(rig.j['cauda'], seg((0.012, -0.04, 0.065), (-0.03, -0.04, 0.085), 0.012, 0.006, pena, 6))
    rig.add('pescoco', (0.08, -0.04, 0.08), 'corpo')
    on(rig.j['pescoco'], A.ico(0.02, (0.088, -0.04, 0.095), pena, 2, smooth=True),
       seg((0.104, -0.04, 0.095), (0.125, -0.04, 0.092), 0.005, 0.001, perna, 5),
       eye((0.097, -0.058, 0.1), 0.0035))
    return 'pula'


def garca(rig):
    branco = A.foliage('garca', '#c9cfca', '#ffffff')
    bico = A.mat('garca_bico', '#e8b53a', 0.5)
    perna = A.mat('garca_perna', '#2a2a26', 0.8)
    rig.add('corpo', (0, 0, 0.14))
    on(rig.j['corpo'], A.ico(0.04, (0, 0, 0.15), branco, 3, (1.55, 0.85, 0.85), smooth=True))
    for s in (-1, 1):
        leg(rig, f'perna{s}', (0.005, s * 0.01, 0.13), 0.13, 0.0035, perna, knee=-0.01)
    rig.add('cauda', (-0.05, 0, 0.15), 'corpo')
    on(rig.j['cauda'], seg((-0.05, 0, 0.15), (-0.1, 0, 0.13), 0.02, 0.005, branco))
    rig.add('pescoco', (0.045, 0, 0.16), 'corpo')
    on(rig.j['pescoco'], seg((0.045, 0, 0.16), (0.075, 0, 0.215), 0.011, 0.008, branco))
    rig.add('cabeca', (0.075, 0, 0.215), 'pescoco')
    on(rig.j['cabeca'], seg((0.075, 0, 0.215), (0.062, 0, 0.275), 0.008, 0.007, branco),
       A.ico(0.016, (0.068, 0, 0.283), branco, 2, (1.35, 0.95, 1), smooth=True),
       seg((0.082, 0, 0.283), (0.135, 0, 0.276), 0.0045, 0.0008, bico, 5),
       A.ico(0.003, (0.074, -0.014, 0.288), A.mat('olho_g', '#d9b53a', 0.3), 1))
    return 'chao'


def martim(rig):
    azul = A.foliage('martim', '#1f6f88', '#3fa6c4')
    peito = A.foliage('martim_peito', '#b45a2a', '#e08a4a')
    madeira = A.foliage('poleiro', '#5a3d25', '#8a6440')
    seg((-0.09, 0, 0.085), (0.08, 0, 0.115), 0.01, 0.007, madeira, 6)
    seg((-0.06, 0, 0.0), (-0.06, 0, 0.095), 0.009, 0.008, madeira, 6)
    rig.add('corpo', (0, 0, 0.11))
    on(rig.j['corpo'], A.ico(0.03, (0, 0, 0.14), azul, 3, (1.1, 0.95, 1.25), smooth=True),
       A.ico(0.024, (0.012, -0.006, 0.132), peito, 2, (0.9, 0.9, 1.1), smooth=True))
    rig.add('cauda', (-0.02, 0, 0.12), 'corpo')
    on(rig.j['cauda'], seg((-0.02, 0, 0.12), (-0.045, 0, 0.075), 0.012, 0.007, azul, 6))
    rig.add('pescoco', (0.01, 0, 0.165), 'corpo')
    on(rig.j['pescoco'], A.ico(0.026, (0.012, 0, 0.182), azul, 2, (1.1, 0.95, 1), smooth=True),
       seg((0.034, 0, 0.18), (0.085, 0, 0.176), 0.008, 0.0012, A.mat('martim_bico', '#1d1d1d', 0.4), 6),
       A.ico(0.01, (0.02, -0.02, 0.17), A.mat('martim_papo', '#fff6e8', 0.6), 1),
       eye((0.022, -0.024, 0.188), 0.004))
    return 'poleiro'


def quadruped(rig, fur, legm, body_r, body_scale, body_z, legs, leg_r, head, tail, extra=None, blobby=False):
    rig.add('corpo', (0, 0, body_z))
    if blobby:
        on(rig.j['corpo'], A.blob(body_r, (0, 0, body_z), fur, body_scale, seed=7, amount=0.12))
    else:
        on(rig.j['corpo'], A.ico(body_r, (0, 0, body_z), fur, 3, body_scale, smooth=True))
    for i, (x, y, L) in enumerate(legs):
        leg(rig, f'perna{i}', (x, y, L), L, leg_r, legm)
    if extra:
        extra()
    head()
    tail()


def capivara(rig):
    pelo = A.foliage('capivara', '#6e4a2c', '#ad7f52')
    escuro = A.mat('capivara_escuro', '#3a2618', 0.9)
    def head():
        rig.add('pescoco', (0.07, 0, 0.085), 'corpo')
        on(rig.j['pescoco'], A.ico(0.038, (0.105, 0, 0.09), pelo, 3, (1.5, 0.95, 1.1), smooth=True),
           A.cube((0.034, 0.048, 0.042), (0.148, 0, 0.082), pelo, bevel=0.013),
           A.ico(0.012, (0.166, 0, 0.088), escuro, 1, (0.6, 1.4, 0.8)))
        for e in (-1, 1):
            on(rig.j['pescoco'], A.ico(0.009, (0.088, e * 0.022, 0.125), escuro, 1, (0.8, 0.5, 1)))
        on(rig.j['pescoco'], eye((0.125, -0.026, 0.102)))
    def tail():
        rig.add('cauda', (-0.09, 0, 0.08), 'corpo')
    quadruped(rig, pelo, escuro, 0.062, (1.6, 1.0, 0.95), 0.078,
              [(-0.055, -0.03, 0.045), (-0.055, 0.03, 0.045), (0.05, -0.03, 0.045), (0.05, 0.03, 0.045)], 0.013, head, tail)
    return 'chao'


def anta(rig):
    pelo = A.foliage('anta', '#2c2522', '#5f534a')
    claro = A.mat('anta_orelha', '#d9d0c4', 0.8)
    def head():
        rig.add('pescoco', (0.09, 0, 0.14), 'corpo')
        on(rig.j['pescoco'], seg((0.08, 0, 0.15), (0.13, 0, 0.13), 0.04, 0.03, pelo),
           A.ico(0.036, (0.14, 0, 0.12), pelo, 3, (1.45, 0.82, 0.95), smooth=True))
        rig.add('tromba', (0.185, 0, 0.11), 'pescoco')
        on(rig.j['tromba'], seg((0.175, 0, 0.115), (0.215, 0, 0.09), 0.013, 0.009, pelo))
        for e in (-1, 1):
            on(rig.j['pescoco'], A.ico(0.013, (0.115, e * 0.026, 0.162), pelo, 2, (0.6, 0.7, 1.1)),
               A.ico(0.006, (0.112, e * 0.028, 0.175), claro, 1))
        on(rig.j['pescoco'], eye((0.156, -0.026, 0.132)))
    def tail():
        rig.add('cauda', (-0.11, 0, 0.14), 'corpo')
        on(rig.j['cauda'], A.ico(0.01, (-0.118, 0, 0.135), pelo, 1))
    quadruped(rig, pelo, pelo, 0.07, (1.6, 0.95, 0.95), 0.125,
              [(-0.07, -0.032, 0.09), (-0.07, 0.032, 0.09), (0.065, -0.032, 0.09), (0.065, 0.032, 0.09)], 0.017, head, tail)
    return 'chao'


def lobo(rig):
    pelo = A.foliage('lobo', '#b04c18', '#f0a050')
    preto = A.mat('lobo_preto', '#1f1a16', 0.9)
    branco = A.mat('lobo_branco', '#f3ead8', 0.8)
    def extra():
        on(rig.j['corpo'], seg((0.01, 0, 0.215), (0.075, 0, 0.215), 0.016, 0.02, preto, 8))
    def head():
        rig.add('pescoco', (0.07, 0, 0.2), 'corpo')
        on(rig.j['pescoco'], seg((0.06, 0, 0.195), (0.12, 0, 0.25), 0.024, 0.018, pelo),
           seg((0.075, 0, 0.215), (0.115, 0, 0.255), 0.012, 0.009, preto, 6),
           A.ico(0.028, (0.13, 0, 0.255), pelo, 2, (1.3, 0.9, 0.9), smooth=True),
           seg((0.145, 0, 0.252), (0.19, 0, 0.24), 0.013, 0.005, preto, 6),
           eye((0.14, -0.022, 0.265)))
        for e in (-1, 1):
            on(rig.j['pescoco'], seg((0.122, e * 0.016, 0.27), (0.115, e * 0.024, 0.32), 0.014, 0.001, pelo, 5),
               seg((0.123, e * 0.013, 0.272), (0.117, e * 0.02, 0.31), 0.008, 0.001, preto, 5))
    def tail():
        rig.add('cauda', (-0.085, 0, 0.19), 'corpo')
        on(rig.j['cauda'], seg((-0.085, 0, 0.19), (-0.15, 0, 0.12), 0.018, 0.013, pelo),
           A.ico(0.014, (-0.155, 0, 0.113), branco, 1))
    quadruped(rig, pelo, preto, 0.05, (1.8, 0.85, 0.85), 0.18,
              [(-0.06, -0.025, 0.165), (-0.06, 0.025, 0.165), (0.06, -0.025, 0.165), (0.06, 0.025, 0.165)], 0.009, head, tail, extra)
    return 'chao'


def tamandua(rig):
    pelo = A.foliage('tamandua', '#6f6b62', '#aaa598')
    escuro = A.foliage('tamandua_rabo', '#3a3631', '#6b665c')
    preto = A.mat('tamandua_preto', '#1c1a17', 0.9)
    branco = A.mat('tamandua_branco', '#efe9da', 0.8)
    def extra():
        # faixa diagonal preta com borda branca, do peito ao lombo
        for m, sc, off in ((branco, (0.28, 1.04, 1.04), 0.0), (preto, (0.17, 1.06, 1.06), 0.0)):
            o = A.ico(0.05, (0.035 + off, 0, 0.098), m, 3, (sc[0] * 1.6, sc[1] * 0.9, sc[2] * 1.0), smooth=True)
            o.rotation_euler.y = math.radians(-38)
            on(rig.j['corpo'], o)
    def head():
        rig.add('pescoco', (0.07, 0, 0.105), 'corpo')
        on(rig.j['pescoco'], seg((0.07, 0, 0.105), (0.11, 0, 0.09), 0.026, 0.018, pelo),
           seg((0.11, 0, 0.09), (0.19, 0, 0.06), 0.014, 0.004, pelo),
           eye((0.112, -0.019, 0.1)))
    def tail():
        rig.add('cauda', (-0.08, 0, 0.11), 'corpo')
        on(rig.j['cauda'], rot_y(A.blob(0.05, (-0.13, 0, 0.13), escuro, (1.5, 0.35, 1.1), seed=5, amount=0.22), -20))
    quadruped(rig, pelo, preto, 0.05, (1.6, 0.9, 1.0), 0.098,
              [(-0.05, -0.03, 0.065), (-0.05, 0.03, 0.065), (0.05, -0.03, 0.065), (0.05, 0.03, 0.065)], 0.013, head, tail, extra, blobby=True)
    return 'chao'


def onca(rig):
    pelo = A.foliage('onca', '#b8741e', '#eeab44')
    claro = A.mat('onca_barriga', '#f6e6c4', 0.8)
    mancha = A.mat('onca_mancha', '#2a1a10', 0.9)
    def extra():
        on(rig.j['corpo'], *spots((0, 0, 0.13), (0.06 * 1.75, 0.06 * 0.9, 0.06 * 0.85), 70, mancha, seed=11))
    def head():
        rig.add('pescoco', (0.08, 0, 0.13), 'corpo')
        on(rig.j['pescoco'], A.ico(0.04, (0.122, 0, 0.145), pelo, 3, (1.2, 1.0, 0.95), smooth=True),
           A.ico(0.022, (0.152, -0.004, 0.13), claro, 2, (1.0, 1.0, 0.8), smooth=True),
           A.ico(0.007, (0.172, -0.004, 0.138), A.mat('onca_nariz', '#5a2e22', 0.6), 1),
           A.ico(0.0055, (0.15, -0.03, 0.158), A.mat('olho_o', '#c9a21a', 0.3), 1))
        on(rig.j['pescoco'], *spots((0.122, 0, 0.145), (0.048, 0.04, 0.038), 14, mancha, 0.003, 0.005, seed=12))
        for e in (-1, 1):
            on(rig.j['pescoco'], A.ico(0.012, (0.105, e * 0.028, 0.18), pelo, 2, (0.7, 0.5, 0.9)))
    def tail():
        rig.add('cauda', (-0.09, 0, 0.14), 'corpo')
        on(rig.j['cauda'], seg((-0.09, 0, 0.14), (-0.17, 0, 0.1), 0.012, 0.009, pelo),
           seg((-0.17, 0, 0.1), (-0.2, 0, 0.06), 0.009, 0.008, pelo),
           A.ico(0.011, (-0.2, 0, 0.058), mancha, 1))
    quadruped(rig, pelo, pelo, 0.06, (1.75, 0.9, 0.85), 0.13,
              [(-0.07, -0.03, 0.1), (-0.07, 0.03, 0.1), (0.065, -0.03, 0.1), (0.065, 0.03, 0.1)], 0.016, head, tail, extra)
    return 'chao'


def arara(rig):
    """arara-canindé em voo (só para os bandos que cruzam o céu): asas azuis por cima, amarelas por baixo"""
    azul = A.foliage('arara_azul', '#1f5fb8', '#4f9ae8')
    amarelo = A.foliage('arara_amarela', '#e0a218', '#ffd84a')
    rig.add('corpo', (0, 0, 0.3))
    on(rig.j['corpo'], A.ico(0.03, (0, 0, 0.3), azul, 3, (1.8, 0.85, 0.8), smooth=True),
       A.ico(0.024, (0.012, 0, 0.29), amarelo, 2, (1.5, 0.8, 0.7), smooth=True),
       A.ico(0.022, (0.058, 0, 0.305), azul, 2, smooth=True),
       A.ico(0.012, (0.07, -0.012, 0.3), A.mat('arara_rosto', '#f4f1e6', 0.6), 1),
       seg((0.075, 0, 0.3), (0.092, 0, 0.29), 0.009, 0.002, A.mat('arara_bico', '#1a1a1a', 0.4), 6),
       seg((-0.04, 0, 0.3), (-0.17, 0, 0.29), 0.014, 0.003, azul))
    for s_ in (-1, 1):
        rig.add(f'asa{s_}', (0.0, s_ * 0.02, 0.305), 'corpo')
        for m, z, k in ((amarelo, -0.004, 0.95), (azul, 0.0, 1.0)):
            o = A.ico(0.07 * k, (-0.005, s_ * 0.085, 0.305 + z), m, 3, (0.5, 1.25, 0.07), smooth=True)
            o.rotation_euler.z = math.radians(14 * s_)
            on(rig.j[f'asa{s_}'], o)
        on(rig.j[f'asa{s_}'], seg((-0.01, s_ * 0.15, 0.305), (-0.05, s_ * 0.175, 0.305), 0.012, 0.003, azul, 6))
    return 'voa'


ANIMALS = {'arara': arara, 'seriema': seriema, 'tucano': tucano, 'joao': joao, 'garca': garca, 'capivara': capivara, 'ema': ema,
           'martim': martim, 'anta': anta, 'lobo': lobo, 'tamandua': tamandua, 'onca': onca}


# ---------------------------------------------------------------- animações

def anim(rig, kind, style, i):
    """pose do quadro i (0..FR-1) da animação 'anda' ou 'para'"""
    t = i / FR
    s, c = math.sin(TAU * t), math.cos(TAU * t)
    p = {}
    legs = sorted(n for n in rig.j if n.startswith('perna'))
    if style == 'voa':                           # bater de asas
        p['asa-1'] = (-55 * s, 0, 0)
        p['asa1'] = (55 * s, 0, 0)
        p['hop'] = 0.01 * c
        rig.pose(**p)
        return
    if kind == 'anda' and style == 'chao':
        if len(legs) == 2:                       # aves que andam: passo alternado, corpo balança, cabeça vai e vem
            p[legs[0]] = (0, 28 * s, 0)
            p[legs[1]] = (0, -28 * s, 0)
            p['z'] = 0.006 * abs(c) - 0.003
            p['pescoco'] = (0, 10 * math.sin(TAU * t * 2), 0)
            p['cauda'] = (0, -6 * s, 0)
        else:                                    # quadrúpedes: diagonais juntas (trote)
            a = 24
            p[legs[0]] = (0, a * s, 0)           # traseira esq
            p[legs[3]] = (0, a * s, 0)           # dianteira dir
            p[legs[1]] = (0, -a * s, 0)
            p[legs[2]] = (0, -a * s, 0)
            p['z'] = 0.005 * abs(math.sin(TAU * t * 1.0))
            p['pescoco'] = (0, 4 * math.sin(TAU * t * 2), 0)
            p['cauda'] = (0, 0, 12 * s)
    elif kind == 'anda':                         # poleiro e joão-de-barro: um pulinho
        h = max(0.0, math.sin(TAU * t))
        p['hop'] = 0.02 * h if style == 'pula' else 0.0
        p['corpo'] = (0, -8 * h, 0)
        p['cauda'] = (0, -25 * h, 0)
        p['pescoco'] = (0, 10 * math.sin(TAU * t * 2), 0)
    else:                                        # parado: respira, bica ou olha, abana a cauda
        p['z'] = 0.002 * s
        if style == 'chao' and len(legs) == 2:   # ave no chão: bica o chão no meio do ciclo
            dip = max(0.0, math.sin(math.pi * min(1, max(0, (t - 0.25) / 0.5))))
            p['pescoco'] = (0, 55 * dip, 0)
            if 'cabeca' in rig.j:
                p['cabeca'] = (0, 20 * dip, 0)
            p['cauda'] = (0, -8 * dip, 0)
        elif style == 'chao':                    # quadrúpede: olha para o lado e abaixa a cabeça para farejar
            p['pescoco'] = (0, 18 * max(0.0, math.sin(TAU * t)), 16 * math.sin(TAU * t))
            p['cauda'] = (0, 0, 22 * s)
            if 'tromba' in rig.j:
                p['tromba'] = (0, 0, 25 * math.sin(TAU * t * 2))
        else:                                    # poleiro: vira a cabeça e balança a cauda
            p['pescoco'] = (8 * math.sin(TAU * t), 0, 30 * math.sin(TAU * t))
            p['cauda'] = (0, -15 * max(0.0, math.sin(TAU * t * 2)), 0)
    rig.pose(**p)


def render_animal(name, build):
    sc = A.reset()
    sc.cycles.samples = SAMPLES
    if name == 'arara':                          # no céu: sem chão e sem sombra
        for o in list(sc.objects):
            if o.type == 'MESH':
                bpy.data.objects.remove(o)
    cam = A.camera(sc, PX, SCALE, 0.18)
    rig = Rig()
    style = build(rig)
    rig.done()
    meta = {}
    u = world_to_camera_view(sc, cam, Vector((0, 0, 0)))
    previa = os.environ.get('PREVIA')
    for kind in (('voa',) if style == 'voa' else ('para', 'anda')):
        for i in ([0, 3] if previa else range(FR)):
            anim(rig, kind, style, i)
            sc.render.filepath = os.path.join(OUT, f'{name}_{kind}{i}.png')
            bpy.ops.render.render(write_still=True)
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
