"""Gera os sprites 3D do Afluente com Blender (bpy) e monta um atlas PNG + JSON.

Uso:  python afluente_sprites.py <pasta_saida>
Requer o módulo bpy (pip install bpy) e Pillow.

Convenções:
- 1 unidade do Blender = raio de um hexágono do tabuleiro.
- Câmera ortográfica a 52° de elevação, olhando para o norte; a mesma para todos os objetos,
  então os tamanhos relativos se mantêm. A âncora (x, y) de cada sprite é o ponto do chão (origem).
- Sombra suave num "shadow catcher", fundo transparente.
"""
import json
import math
import os
import sys

import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

OUT = sys.argv[-1] if len(sys.argv) > 1 and not sys.argv[-1].endswith('.py') else 'sprites_out'
os.makedirs(OUT, exist_ok=True)

OBJ_PX, OBJ_SCALE = 176, 1.1      # objetos: 176 px cobrem 1,1 unidade
FX_PX, FX_SCALE = 72, 0.34        # partículas
ELEV = math.radians(52)


def hexcol(h, a=1.0):
    h = h.lstrip('#')
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    return (*lin, a)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 48
    sc.cycles.use_denoising = True
    try:
        sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception:
        pass
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Standard'
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    # luz: sol quente vindo do alto à esquerda + céu azulado
    world = bpy.data.worlds.new('mundo')
    sc.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs[0].default_value = hexcol('#cfe6f0')
    bg.inputs[1].default_value = 0.75
    sun_data = bpy.data.lights.new('sol', 'SUN')
    sun_data.energy = 2.6
    sun_data.angle = math.radians(12)
    sun_data.color = (1.0, 0.95, 0.86)
    sun = bpy.data.objects.new('sol', sun_data)
    sun.rotation_euler = (math.radians(24), math.radians(-18), math.radians(-30))
    sc.collection.objects.link(sun)
    # chão que só recebe sombra
    bpy.ops.mesh.primitive_plane_add(size=6)
    floor = bpy.context.active_object
    floor.is_shadow_catcher = True
    return sc


def camera(sc, px, scale, shift_y=0.22):
    cam_data = bpy.data.cameras.new('cam')
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = scale
    cam_data.shift_y = shift_y
    cam = bpy.data.objects.new('cam', cam_data)
    d = 20
    cam.location = (0, -d * math.cos(ELEV), d * math.sin(ELEV))
    cam.rotation_euler = (math.pi / 2 - ELEV, 0, 0)
    sc.collection.objects.link(cam)
    sc.camera = cam
    sc.render.resolution_x = sc.render.resolution_y = px
    return cam


def mat(name, color, rough=0.75, emit=None, alpha=1.0, trans=0.0):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = hexcol(color)
    p.inputs['Roughness'].default_value = rough
    if emit:
        p.inputs['Emission Color'].default_value = hexcol(emit)
        p.inputs['Emission Strength'].default_value = 3.0
    if trans:
        p.inputs['Transmission Weight'].default_value = trans
    if alpha < 1:
        p.inputs['Alpha'].default_value = alpha
    return m


def finish(obj, m, flat=True):
    obj.data.materials.append(m)
    if flat:
        for poly in obj.data.polygons:
            poly.use_smooth = False
    return obj


def ico(r, loc, m, sub=1, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=r, location=loc)
    o = bpy.context.active_object
    o.scale = scale
    return finish(o, m)


def cyl(r, h, loc, m, verts=8, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=loc)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=h, location=loc)
    return finish(bpy.context.active_object, m)


def cube(size, loc, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.scale = size
    return finish(o, m)


def prism(w, d, h, loc, m):
    """telhado de duas águas: cumeeira ao longo de x, largura w, meia-profundidade d, altura h"""
    x, y, z = loc
    v = [(-w / 2, -d, 0), (w / 2, -d, 0), (w / 2, d, 0), (-w / 2, d, 0), (-w / 2, 0, h), (w / 2, 0, h)]
    v = [(a + x, b + y, c + z) for a, b, c in v]
    f = [(0, 1, 5, 4), (2, 3, 4, 5), (0, 4, 3), (1, 2, 5), (0, 3, 2, 1)]
    me = bpy.data.meshes.new('telhado')
    me.from_pydata(v, [], f)
    me.update()
    o = bpy.data.objects.new('telhado', me)
    bpy.context.scene.collection.objects.link(o)
    return finish(o, m)


# ---------------------------------------------------------------- modelos

def tree_round(live, var=0):
    trunk = mat('tronco', '#6e4a2b')
    dark = ['#2f7a35', '#3a8a3a', '#2c6f3a'][var] if live else ['#7d7f45', '#8a8650', '#74783f'][var]
    light = ['#4f9c3f', '#5cab45', '#3f8a45'][var] if live else ['#9a9a5c', '#a39d62', '#8d915a'][var]
    leaf, leaf2 = mat(f'copa{live}{var}', dark), mat(f'copa2{live}{var}', light)
    k = 1.0 if live else 0.72
    if var == 0:      # copa redonda
        cyl(0.035, 0.16 * k, (0, 0, 0.08 * k), trunk, 6)
        ico(0.17 * k, (0, 0, 0.27 * k), leaf, 1, (1, 1, 1.05))
        ico(0.1 * k, (-0.06 * k, -0.07 * k, 0.35 * k), leaf2, 1)
    elif var == 1:    # moita larga de três copas
        cyl(0.03, 0.1 * k, (0, 0, 0.05 * k), trunk, 6)
        ico(0.12 * k, (-0.08 * k, 0, 0.17 * k), leaf, 1)
        ico(0.13 * k, (0.08 * k, 0.02, 0.19 * k), leaf2, 1)
        ico(0.11 * k, (0, -0.05, 0.27 * k), leaf, 1)
    else:             # árvore alta e estreita
        cyl(0.03, 0.14 * k, (0, 0, 0.07 * k), trunk, 6)
        ico(0.12 * k, (0, 0, 0.32 * k), leaf, 1, (1, 1, 1.9))
        ico(0.07 * k, (-0.04 * k, -0.06 * k, 0.4 * k), leaf2, 1)


def tree_pine(live):
    trunk = mat('tronco', '#7a5230')
    leaf = mat(f'pinho{live}', '#256b33' if live else '#727543')
    k = 1.0 if live else 0.75
    cyl(0.03, 0.12 * k, (0, 0, 0.06 * k), trunk, 6)
    cyl(0.16 * k, 0.24 * k, (0, 0, 0.22 * k), leaf, 7, 0.0)
    cyl(0.12 * k, 0.2 * k, (0, 0, 0.36 * k), leaf, 7, 0.0)


def house(live, var=0):
    wall = mat(f'parede{live}', '#fbf1df' if live else '#e2d6c0')
    roof = mat(f'telhado{live}{var}', (['#e0663f', '#c9503a'][var]) if live else '#ad9179')
    wood = mat('porta', '#6b4426')
    win = mat(f'janela{live}', '#ffd257' if live else '#9e927c', emit='#ffcc4d' if live else None)
    w, d, h = (0.24, 0.18, 0.14) if var == 0 else (0.18, 0.17, 0.2)
    cube((w, d, h), (0, 0, h / 2), wall)
    prism(w * 1.12, d * 0.62, 0.11 if var == 0 else 0.12, (0, 0, h), roof)
    cube((0.045, 0.01, 0.075), (-w * 0.2, -d / 2 - 0.004, 0.0375), wood)
    cube((0.05, 0.01, 0.045), (w * 0.22, -d / 2 - 0.004, h * 0.6), win)
    cube((0.035, 0.035, 0.08), (w * 0.28, d * 0.15, h + 0.07), mat('chamine', '#9a6a4a'))


def wheat(live):
    stalk = mat(f'talo{live}', '#c9a640' if live else '#cdb886')
    head = mat(f'espiga{live}', '#f0c64a' if live else '#dccb98')
    pts = [(-0.06, -0.02), (0.0, 0.03), (0.06, -0.01), (-0.03, 0.06), (0.04, 0.07), (0.02, -0.06), (-0.08, 0.05)]
    for i, (x, y) in enumerate(pts):
        h = 0.14 + 0.03 * ((i * 7) % 3)
        cyl(0.006, h, (x, y, h / 2), stalk, 4)
        ico(0.022, (x, y, h + 0.012), head, 1, (0.8, 0.8, 1.9))


def tuft(live):
    g = mat(f'capim{live}', '#6fae3f' if live else '#b8a061')
    import random
    rnd = random.Random(3)
    for i in range(9):
        a = rnd.random() * math.tau
        r = rnd.random() * 0.05
        h = 0.07 + rnd.random() * 0.06
        bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=0.012, radius2=0, depth=h,
                                        location=(math.cos(a) * r, math.sin(a) * r, h / 2),
                                        rotation=(rnd.uniform(-.35, .35), rnd.uniform(-.35, .35), 0))
        finish(bpy.context.active_object, g)


def flowers():
    stem = mat('caule', '#5f9e3c')
    cols = [mat('flor1', '#fff7e6'), mat('flor2', '#ffd24a'), mat('flor3', '#f29bb5')]
    for i, (x, y) in enumerate([(-0.05, 0), (0.03, 0.04), (0.05, -0.04), (-0.01, -0.05)]):
        h = 0.06 + 0.015 * i
        cyl(0.004, h, (x, y, h / 2), stem, 4)
        ico(0.022, (x, y, h + 0.01), cols[i % 3], 1, (1, 1, 0.6))


def rock_small():
    ico(0.07, (0, 0, 0.03), mat('pedra', '#a29b8f'), 1, (1.2, 1, 0.65))
    ico(0.045, (0.07, 0.03, 0.02), mat('pedra2', '#c4bdb2'), 1, (1, 1, 0.7))


def spring_stones():
    st = [mat('pedra', '#a29b8f'), mat('pedra2', '#c4bdb2')]
    for i in range(11):
        a = i / 11 * math.tau
        ico(0.055 + 0.012 * (i % 3), (math.cos(a) * 0.34, math.sin(a) * 0.34, 0.02), st[i % 2], 1, (1.1, 1, 0.6))


def reeds():
    g = mat('junco', '#5b8f3a')
    h_ = mat('taboa', '#7a4b2a')
    for i, (x, y) in enumerate([(-0.04, 0), (0.0, 0.03), (0.04, -0.01), (0.02, -0.04)]):
        h = 0.12 + 0.02 * i
        cyl(0.005, h, (x, y, h / 2), g, 4)
        if i % 2 == 0:
            cyl(0.012, 0.035, (x, y, h - 0.01), h_, 6)


# partículas
def p_sparkle():
    """estrela de 4 pontas, plana, virada para a câmera"""
    m = mat('brilho', '#fff3b0', emit='#ffe27a')
    pts = []
    for i in range(8):
        a = i / 8 * math.tau + math.pi / 2
        r = 0.15 if i % 2 == 0 else 0.035
        pts.append((math.cos(a) * r, math.sin(a) * r, 0))
    me = bpy.data.meshes.new('estrela')
    me.from_pydata([(0, 0, 0)] + pts, [], [(0, i + 1, (i + 1) % 8 + 1) for i in range(8)])
    o = bpy.data.objects.new('estrela', me)
    bpy.context.scene.collection.objects.link(o)
    o.rotation_euler = (math.pi / 2 - ELEV, 0, 0)
    finish(o, m)


def p_leaf():
    ico(0.07, (0, 0, 0), mat('folha', '#5aa847'), 1, (1.6, 0.7, 0.18))
    bpy.context.active_object.rotation_euler = (math.radians(30), 0, math.radians(25))


def p_drop():
    ico(0.07, (0, 0, 0), mat('gota', '#4fc0ec', rough=0.1, trans=0.3), 2, (0.85, 0.85, 1.25))


def p_puff():
    m = mat('fumaca', '#fbf7ef')
    for x, y, z, r in [(0, 0, 0, 0.09), (0.07, 0.02, 0.03, 0.065), (-0.07, 0.01, 0.02, 0.06), (0.0, -0.02, 0.07, 0.06)]:
        ico(r, (x, y, z), m, 2)


def p_petal():
    ico(0.06, (0, 0, 0), mat('petala', '#f6a3c0'), 1, (1.2, 0.8, 0.15))
    bpy.context.active_object.rotation_euler = (math.radians(50), math.radians(20), 0)


OBJECTS = {
    'tree_a': lambda: tree_round(True, 0), 'tree_b': lambda: tree_round(True, 1), 'tree_c': lambda: tree_round(True, 2),
    'pine': lambda: tree_pine(True),
    'tree_dry_a': lambda: tree_round(False, 0), 'tree_dry_b': lambda: tree_round(False, 1), 'pine_dry': lambda: tree_pine(False),
    'house_a': lambda: house(True, 0), 'house_b': lambda: house(True, 1),
    'house_dry_a': lambda: house(False, 0), 'house_dry_b': lambda: house(False, 1),
    'wheat': lambda: wheat(True), 'wheat_dry': lambda: wheat(False),
    'tuft': lambda: tuft(True), 'tuft_dry': lambda: tuft(False),
    'flowers': flowers, 'rock': rock_small, 'reeds': reeds,
}
FX = {'sparkle': p_sparkle, 'leaf': p_leaf, 'drop': p_drop, 'puff': p_puff, 'petal': p_petal}


def render(name, build, px, scale, shift, floor=True):
    sc = reset()
    if not floor:
        for o in list(sc.objects):
            if o.type == 'MESH':
                bpy.data.objects.remove(o)
    cam = camera(sc, px, scale, shift)
    build()
    path = os.path.join(OUT, name + '.png')
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    u = world_to_camera_view(sc, cam, Vector((0, 0, 0)))
    return {'px': px, 'ax': round(u.x * px, 2), 'ay': round((1 - u.y) * px, 2), 'unit': round(px / scale, 3)}


meta = {}
for n, b in OBJECTS.items():
    meta[n] = render(n, b, OBJ_PX, OBJ_SCALE, 0.24)
    print('ok', n, flush=True)
for n, b in FX.items():
    meta['fx_' + n] = render('fx_' + n, b, FX_PX, FX_SCALE, 0.0, floor=False)
    print('ok fx', n, flush=True)
with open(os.path.join(OUT, 'meta.json'), 'w') as f:
    json.dump(meta, f, indent=1)
