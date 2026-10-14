"""Renderiza a água do Afluente no Blender: superfície ondulada com refração real sobre um leito de areia e seixos.

Uso:  python agua.py <pasta_saida>      (gera agua_00.png ... agua_23.png)

- Câmera ortográfica inclinada como a do jogo (~52°), para a água refletir o céu do jeito certo. Um período
  de 1×1 unidade do chão vira exatamente 200×158 px; no jogo a imagem é esticada na vertical de volta.
- Cáusticas: rede de luz (Worley) gerada em numpy a cada quadro e projetada no leito.
- Tudo é periódico com período 1: as ondas usam números de onda inteiros, a areia é uma imagem
  gerada com senos inteiros e os seixos são repetidos em 3×3. Assim a textura emenda sem costura.
- As ondas também têm frequência inteira no tempo: o quadro 24 é igual ao quadro 0 (laço perfeito).
"""
import math
import os
import random
import sys

import bpy
import numpy as np

OUT = sys.argv[-1] if len(sys.argv) > 1 and not sys.argv[-1].endswith('.py') else 'agua_out'
os.makedirs(OUT, exist_ok=True)
PXW, PXH, FRAMES, DEPTH, N = 200, 158, int(os.environ.get('QUADROS', 24)), 0.075, 150
ELEV = math.asin(PXH / PXW)
WAVES = [(1, 2, 0.010, 1, 0.3), (-2, 1, 0.008, 2, 1.7), (3, -1, 0.006, 1, 4.1), (2, 3, 0.0045, 3, 2.2),
         (-1, -4, 0.004, 2, 5.3), (4, 1, 0.003, 3, 0.9), (-5, 3, 0.0022, 4, 3.3), (6, -2, 0.0016, 5, 1.1),
         (7, 4, 0.0011, 4, 2.7), (-3, 7, 0.001, 5, 0.4)]


def lin(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c) + (1.0,)


bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = 64
sc.cycles.use_denoising = True
sc.cycles.max_bounces = 8
sc.cycles.transmission_bounces = 8
sc.view_settings.view_transform = 'Standard'
sc.render.resolution_x, sc.render.resolution_y = PXW, PXH
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGB'

# céu e sol (o sol pequeno dá os brilhos nítidos nas cristas)
world = bpy.data.worlds.new('ceu')
sc.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = lin('#a9d3ee')
world.node_tree.nodes['Background'].inputs[1].default_value = 1.35
sun = bpy.data.lights.new('sol', 'SUN')
sun.energy = 5.0
sun.angle = math.radians(1.5)
sun.color = (1.0, 0.96, 0.88)
so = bpy.data.objects.new('sol', sun)
so.rotation_euler = (math.radians(28), math.radians(-14), 0)
sc.collection.objects.link(so)

# câmera de cima cobrindo [0,1]²
cd = bpy.data.cameras.new('cam')
cd.type = 'ORTHO'
cd.ortho_scale = 1.0
cam = bpy.data.objects.new('cam', cd)
cam.location = (0.5, 0.5 - 5 * math.cos(ELEV), 5 * math.sin(ELEV))
cam.rotation_euler = (math.pi / 2 - ELEV, 0, 0)
sc.collection.objects.link(cam)
sc.camera = cam

# ---------- leito: areia (imagem periódica) e seixos repetidos 3×3
S = 256
yy, xx = np.mgrid[0:S, 0:S] / S
rnd = np.random.default_rng(4)
sand = np.zeros((S, S))
for _ in range(40):
    kx, ky = rnd.integers(-12, 13, 2)
    if kx == 0 and ky == 0:
        continue
    sand += rnd.uniform(0.2, 1) / math.hypot(kx, ky) * np.sin(2 * math.pi * (kx * xx + ky * yy) + rnd.uniform(0, 6.28))
sand = (sand - sand.min()) / (sand.max() - sand.min())
grain = rnd.random((S, S)) * 0.18
c1, c2 = np.array(lin('#c4a46a')[:3]), np.array(lin('#ead3a0')[:3])
rgb = c1[None, None, :] * (1 - sand[..., None]) + c2[None, None, :] * sand[..., None]
rgb *= (0.9 + grain[..., None])
img = bpy.data.images.new('areia', S, S)
img.pixels = np.concatenate([rgb, np.ones((S, S, 1))], axis=2)[::-1].reshape(-1).tolist()
bed_m = bpy.data.materials.new('leito')
bed_m.use_nodes = True
nt = bed_m.node_tree
tx = nt.nodes.new('ShaderNodeTexImage')
tx.image = img
tx.extension = 'REPEAT'
tc = nt.nodes.new('ShaderNodeTexCoord')
nt.links.new(tc.outputs['Object'], tx.inputs['Vector'])
caust = bpy.data.images.new('causticas', S, S)
cx_ = nt.nodes.new('ShaderNodeTexImage')
cx_.image = caust
cx_.extension = 'REPEAT'
nt.links.new(tc.outputs['Object'], cx_.inputs['Vector'])
mixc = nt.nodes.new('ShaderNodeMix')
mixc.data_type = 'RGBA'
mixc.blend_type = 'ADD'
mixc.inputs['Factor'].default_value = 0.85
cin = [i for i in mixc.inputs if i.type == 'RGBA']
nt.links.new(tx.outputs['Color'], cin[0])
nt.links.new(cx_.outputs['Color'], cin[1])
nt.links.new([o for o in mixc.outputs if o.type == 'RGBA'][0], nt.nodes['Principled BSDF'].inputs['Base Color'])
nt.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.95
bpy.ops.mesh.primitive_plane_add(size=3, location=(0.5, 0.5, 0))
bed = bpy.context.active_object
bed.location = (0, 0, 0)
bed.data.transform(__import__('mathutils').Matrix.Translation((0.5, 0.5, 0)))
bed.data.materials.append(bed_m)

stones = [lin(c) for c in ('#a08e74', '#c2b294', '#7e6e5a', '#d6c8ad', '#8f6f52', '#6f7466', '#b59b78')]
smats = []
for i, c in enumerate(stones):
    m = bpy.data.materials.new(f'seixo{i}')
    m.use_nodes = True
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = c
    m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.55
    smats.append(m)
R = random.Random(9)
pebbles = []
for i in range(46):
    x, y, r = R.random(), R.random(), R.uniform(0.012, 0.045)
    sx, sy, sz = R.uniform(0.8, 1.3), R.uniform(0.7, 1.1), R.uniform(0.45, 0.7)
    rz = R.uniform(0, 6.28)
    m = smats[R.randrange(len(smats))]
    for ox in (-1, 0, 1):
        for oy in (-1, 0, 1):
            bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=8, radius=r, location=(x + ox, y + oy, r * sz * 0.35))
            o = bpy.context.active_object
            o.scale = (sx, sy, sz)
            o.rotation_euler = (0, 0, rz)
            o.data.materials.append(m)
            for p in o.data.polygons:
                p.use_smooth = True

# ---------- superfície da água
bpy.ops.mesh.primitive_grid_add(x_subdivisions=N, y_subdivisions=N, size=3, location=(0.5, 0.5, DEPTH))
water = bpy.context.active_object
for p in water.data.polygons:
    p.use_smooth = True
wm = bpy.data.materials.new('agua')
wm.use_nodes = True
pb = wm.node_tree.nodes['Principled BSDF']
pb.inputs['Base Color'].default_value = lin('#ffffff')
pb.inputs['Roughness'].default_value = 0.015
pb.inputs['IOR'].default_value = 1.333
pb.inputs['Transmission Weight'].default_value = 1.0
pb.inputs['Specular IOR Level'].default_value = 1.0
# volume fechado (fundo abaixo do leito) que absorve luz: azul-esverdeado conforme a profundidade
sol = water.modifiers.new('espessura', 'SOLIDIFY')
sol.thickness = DEPTH + 0.03
sol.offset = -1
va = wm.node_tree.nodes.new('ShaderNodeVolumeAbsorption')
va.inputs['Color'].default_value = lin('#6fcbec')
va.inputs['Density'].default_value = 8.0
wm.node_tree.links.new(va.outputs[0], wm.node_tree.nodes['Material Output'].inputs['Volume'])
lw = wm.node_tree.nodes.new('ShaderNodeLayerWeight')
lw.inputs['Blend'].default_value = 0.35
gl = wm.node_tree.nodes.new('ShaderNodeBsdfGlossy')
gl.inputs['Roughness'].default_value = 0.02
ms = wm.node_tree.nodes.new('ShaderNodeMixShader')
wm.node_tree.links.new(lw.outputs['Fresnel'], ms.inputs['Fac'])
wm.node_tree.links.new(pb.outputs[0], ms.inputs[1])
wm.node_tree.links.new(gl.outputs[0], ms.inputs[2])
wm.node_tree.links.new(ms.outputs[0], wm.node_tree.nodes['Material Output'].inputs['Surface'])
water.data.materials.append(wm)

base = [(v.co.x + 0.5, v.co.y + 0.5) for v in water.data.vertices]

CR = np.random.default_rng(11)
NC = 150
CP = CR.random((NC, 2))
CM = CR.integers(1, 3, NC)
CPH = CR.random(NC) * 6.28
CRAD = CR.uniform(0.008, 0.02, NC)


def caustics(tp):
    pts = CP + CRAD[:, None] * np.stack([np.cos(CM * tp + CPH), np.sin(CM * tp + CPH)], 1)
    f1 = np.full((S, S), 9.0)
    f2 = np.full((S, S), 9.0)
    for px, py in pts:
        for ox in (-1, 0, 1):
            for oy in (-1, 0, 1):
                d = np.hypot(xx - px - ox, yy - py - oy)
                f2 = np.where(d < f1, f1, np.minimum(f2, d))
                f1 = np.minimum(f1, d)
    v = f2 - f1
    I = np.clip(1 - v / 0.011, 0, 1) ** 1.6 * 0.75
    rgb = np.stack([I * 0.95, I * 1.0, I * 0.9], -1)
    caust.pixels = np.concatenate([rgb, np.ones((S, S, 1))], axis=2)[::-1].reshape(-1).tolist()


for f in range(FRAMES):
    tp = f / FRAMES * 2 * math.pi
    caustics(tp)
    for v, (x, y) in zip(water.data.vertices, base):
        h = 0.0
        for kx, ky, a, mm, ph in WAVES:
            h += a * math.sin(2 * math.pi * (kx * x + ky * y) - mm * tp + ph)
        v.co.z = h
    water.data.update()
    sc.render.filepath = os.path.join(OUT, f'agua_{f:02d}.png')
    bpy.ops.render.render(write_still=True)
    print('quadro', f, flush=True)
