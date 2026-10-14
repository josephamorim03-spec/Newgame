"""Leito do rio seco no Blender: o MESMO leito de areia e seixos da água (agua.py), sem a água,
com uma crosta de barro rachado em relevo (bump de verdade, iluminado pelo mesmo sol).
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

# ---------- crosta de barro rachado (Worley periódico: placas separadas por rachaduras)
cr = np.random.default_rng(21)
# grade 7×7 com sorteio dentro de cada célula: placas de tamanho parecido, sem pontos colados
# (pontos muito próximos criavam faixas escuras largas no meio das placas)
g7 = (np.stack(np.meshgrid(np.arange(7), np.arange(7)), -1).reshape(-1, 2) + 0.5 + cr.uniform(-0.34, 0.34, (49, 2))) / 7
pts = g7 % 1.0
f1 = np.full((S, S), 9.0)
f2 = np.full((S, S), 9.0)
for px, py in pts:
    for ox in (-1, 0, 1):
        for oy in (-1, 0, 1):
            d = np.hypot(xx - px - ox, yy - py - oy)
            f2 = np.where(d < f1, f1, np.minimum(f2, d))
            f1 = np.minimum(f1, d)
edge = f2 - f1
crack = np.clip(1 - edge / 0.0075, 0, 1) ** 1.2          # 1 na rachadura, 0 no meio da placa
plate = np.clip(1 - (f1 / 0.11) ** 2, 0, 1)                 # placas abauladas (domo liso a partir do centro)
height = 0.3 * plate - 0.9 * crack

# areia mais clara e seca, barro um pouco mais escuro nas bordas das placas
d1, d2, dk = np.array(lin('#c8ad80')[:3]), np.array(lin('#e8d6b0')[:3]), np.array(lin('#86684a')[:3])
dry = d1[None, None, :] * (1 - sand[..., None]) + d2[None, None, :] * sand[..., None]
dry *= (0.93 + grain[..., None] * 0.6)
dry = dry * (1 - 0.10 * (1 - plate[..., None])) * (1 - crack[..., None]) + dk[None, None, :] * crack[..., None]
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
