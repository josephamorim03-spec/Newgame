"""Leito do rio seco no Blender: o MESMO leito de areia e seixos da água (agua.py), sem a água,
com marcas de correnteza na areia e algumas manchas de barro rachado (bump de verdade, iluminado pelo mesmo sol).
Assim o rio seco e o rio com água são o mesmo material visto em duas estações.

Uso:  python leito_seco.py <pasta_saida>      (gera leito_seco.png, 400×316 = 1×1 unidade do chão)
"""
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[-1] if len(sys.argv) > 1 and not sys.argv[-1].endswith('.py') else 'leito_out'
src = open(os.path.join(HERE, 'agua.py'), encoding='utf-8').read()
src = src[:src.index('# ---------- superfície da água')]
sys.argv = [sys.argv[0], OUT]
exec(compile(src, 'agua.py', 'exec'))  # cena, câmera, sol, areia e seixos idênticos aos da água

sc.render.resolution_x, sc.render.resolution_y = 400, 316
sc.cycles.samples = 96

# ---------- leito de riacho seco: areia com marcas da correnteza, seixos e só algumas manchas de barro rachado
# (v1.5: o mosaico de placas cobrindo tudo parecia calçada; riacho seco do Cerrado é areia e cascalho)
TAU = 2 * math.pi
cr = np.random.default_rng(21)
# marcas de correnteza: ondas finas e tortas, periódicas (números de onda inteiros)
rip = np.sin(TAU * (9 * xx + 2 * yy) + 1.4 * np.sin(TAU * (2 * yy - xx)) + 0.8 * np.sin(TAU * (3 * xx + 4 * yy)))
rip = (rip * 0.5 + 0.5) ** 2
# manchas de barro: ruído de baixa frequência (soma de senos periódicos), só os picos viram barro
low = sum(np.sin(TAU * (kx * xx + ky * yy) + ph) for kx, ky, ph in [(1, 2, 0.3), (2, -1, 1.7), (3, 1, 4.1), (-1, 3, 2.6)]) / 4
clay = np.clip((low - 0.18) / 0.22, 0, 1)
# rachaduras finas e irregulares só dentro do barro (Worley numa grade 11×11 com sorteio)
g = (np.stack(np.meshgrid(np.arange(11), np.arange(11)), -1).reshape(-1, 2) + 0.5 + cr.uniform(-0.4, 0.4, (121, 2))) / 11
f1 = np.full((S, S), 9.0)
f2 = np.full((S, S), 9.0)
for px, py in g % 1.0:
    for ox in (-1, 0, 1):
        for oy in (-1, 0, 1):
            d = np.hypot(xx - px - ox, yy - py - oy)
            f2 = np.where(d < f1, f1, np.minimum(f2, d))
            f1 = np.minimum(f1, d)
crack = np.clip(1 - (f2 - f1) / 0.0035, 0, 1) * clay
height = 0.25 * rip * (1 - clay) + 0.2 * clay - 0.8 * crack

d1, d2 = np.array(lin('#cdb184')[:3]), np.array(lin('#e9d8b2')[:3])
dc, dk = np.array(lin('#a98a64')[:3]), np.array(lin('#7a5f44')[:3])
dry = d1[None, None, :] * (1 - sand[..., None]) + d2[None, None, :] * sand[..., None]
dry *= (0.93 + grain[..., None] * 0.6) * (0.96 + 0.06 * rip[..., None])
dry = dry * (1 - clay[..., None] * 0.55) + dc[None, None, :] * clay[..., None] * 0.55
dry = dry * (1 - crack[..., None] * 0.8) + dk[None, None, :] * crack[..., None] * 0.8
img.pixels = np.concatenate([dry, np.ones((S, S, 1))], axis=2)[::-1].reshape(-1).tolist()

hi = bpy.data.images.new('crosta', S, S)
hi.colorspace_settings.name = 'Non-Color'
hv = (height - height.min()) / (height.max() - height.min())
hi.pixels = np.concatenate([np.repeat(hv[..., None], 3, 2), np.ones((S, S, 1))], axis=2)[::-1].reshape(-1).tolist()
ht = nt.nodes.new('ShaderNodeTexImage')
ht.image = hi
ht.extension = 'REPEAT'
ht.interpolation = 'Cubic'
nt.links.new(tc.outputs['Object'], ht.inputs['Vector'])
bump = nt.nodes.new('ShaderNodeBump')
bump.inputs['Strength'].default_value = 0.4
bump.inputs['Distance'].default_value = 0.004
nt.links.new(ht.outputs['Color'], bump.inputs['Height'])
nt.links.new(bump.outputs['Normal'], nt.nodes['Principled BSDF'].inputs['Normal'])
# sem água não há cáusticas
mixc.inputs['Factor'].default_value = 0.0
caust.pixels = [0.0, 0.0, 0.0, 1.0] * (S * S)

# seixos secos: foscos e empoeirados
for m in smats:
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = 0.9
    c = b.inputs['Base Color'].default_value
    b.inputs['Base Color'].default_value = (c[0] * 0.8 + 0.03, c[1] * 0.8 + 0.025, c[2] * 0.8 + 0.015, 1)

sc.render.filepath = os.path.join(OUT, 'leito_seco.png')
bpy.ops.render.render(write_still=True)
print('ok', sc.render.filepath, flush=True)
