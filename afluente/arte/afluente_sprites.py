"""Gera os sprites 3D do Afluente com Blender (bpy): objetos e partículas, com fundo transparente.

Uso:  python afluente_sprites.py <pasta_saida>
Depois: python montar_atlas.py <pasta_saida> atlas.png atlas.json

Convenções:
- 1 unidade do Blender = raio de um hexágono do tabuleiro.
- Câmera ortográfica a 52° de elevação, olhando para o norte; a mesma para todos os objetos,
  então os tamanhos relativos se mantêm. A âncora (x, y) de cada sprite é o ponto do chão (origem).
- Sombra suave num "shadow catcher". Luz: sol quente do noroeste + céu + luz de recorte.
- Folhagem: esferas subdivididas, deformadas por ruído e com sombreamento suave; o material clareia
  as partes voltadas para cima e salpica variação de cor (efeito "maquete pintada").
"""
import json
import math
import os
import random
import sys

import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

OUT = sys.argv[-1] if len(sys.argv) > 1 and not sys.argv[-1].endswith('.py') else 'sprites_out'
os.makedirs(OUT, exist_ok=True)

OBJ_PX, OBJ_SCALE = 256, 1.1      # objetos: 256 px cobrem 1,1 unidade
FX_PX, FX_SCALE = 96, 0.34        # partículas
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
    sc.cycles.samples = 96
    sc.cycles.use_denoising = True
    try:
        sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception:
        pass
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    world = bpy.data.worlds.new('mundo')
    sc.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs[0].default_value = hexcol('#d6ecf2')
    bg.inputs[1].default_value = 0.85
    for name, energy, rot, col in [('sol', 2.4, (24, -18, -30), (1.0, 0.94, 0.84)),
                                   ('recorte', 0.7, (-55, 10, 160), (0.80, 0.90, 1.0))]:
        ld = bpy.data.lights.new(name, 'SUN')
        ld.energy = energy
        ld.angle = math.radians(14)
        ld.color = col
        lo = bpy.data.objects.new(name, ld)
        lo.rotation_euler = tuple(math.radians(v) for v in rot)
        sc.collection.objects.link(lo)
    bpy.ops.mesh.primitive_plane_add(size=6)
    bpy.context.active_object.is_shadow_catcher = True
    return sc


def camera(sc, px, scale, shift_y=0.22):
    cd = bpy.data.cameras.new('cam')
    cd.type = 'ORTHO'
    cd.ortho_scale = scale
    cd.shift_y = shift_y
    cam = bpy.data.objects.new('cam', cd)
    d = 20
    cam.location = (0, -d * math.cos(ELEV), d * math.sin(ELEV))
    cam.rotation_euler = (math.pi / 2 - ELEV, 0, 0)
    sc.collection.objects.link(cam)
    sc.camera = cam
    sc.render.resolution_x = sc.render.resolution_y = px
    return cam


# ---------------------------------------------------------------- materiais

def mat(name, color, rough=0.7, emit=None, trans=0.0, strength=3.0):
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
        p.inputs['Emission Strength'].default_value = strength
    if trans:
        p.inputs['Transmission Weight'].default_value = trans
    return m


def _mix_rgba(nt):
    n = nt.nodes.new('ShaderNodeMix')
    n.data_type = 'RGBA'
    ins = [i for i in n.inputs if i.type == 'RGBA']
    out = [o for o in n.outputs if o.type == 'RGBA'][0]
    return n, n.inputs['Factor'], ins[0], ins[1], out


def foliage(name, dark, light, speck=None, speck_amt=0.0, speck_scale=40.0):
    """folhagem pintada: clara em cima, escura embaixo, com manchas (flores no caso dos ipês)"""
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes['Principled BSDF']
    p.inputs['Roughness'].default_value = 0.85
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(geo.outputs['Normal'], sep.inputs[0])
    mr = nt.nodes.new('ShaderNodeMapRange')
    mr.inputs['From Min'].default_value = -0.3
    mr.inputs['From Max'].default_value = 1.0
    nt.links.new(sep.outputs['Z'], mr.inputs['Value'])
    mix, fac, a, b, out = _mix_rgba(nt)
    a.default_value = hexcol(dark)
    b.default_value = hexcol(light)
    nt.links.new(mr.outputs['Result'], fac)
    col = out
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 9.0
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.42
    ramp.color_ramp.elements[1].position = 0.62
    nt.links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    mix2, fac2, a2, b2, out2 = _mix_rgba(nt)
    nt.links.new(col, a2)
    b2.default_value = hexcol(dark)
    nt.links.new(ramp.outputs['Color'], fac2)
    mul = nt.nodes.new('ShaderNodeMath')
    mul.operation = 'MULTIPLY'
    mul.inputs[1].default_value = 0.35
    nt.links.new(ramp.outputs['Color'], mul.inputs[0])
    nt.links.new(mul.outputs[0], fac2)
    col = out2
    if speck:
        n2 = nt.nodes.new('ShaderNodeTexVoronoi')
        n2.inputs['Scale'].default_value = speck_scale
        r2 = nt.nodes.new('ShaderNodeValToRGB')
        r2.color_ramp.elements[0].position = 0.0
        r2.color_ramp.elements[1].position = 0.18
        r2.color_ramp.elements[0].color = (1, 1, 1, 1)
        r2.color_ramp.elements[1].color = (0, 0, 0, 1)
        nt.links.new(n2.outputs['Distance'], r2.inputs['Fac'])
        mix3, fac3, a3, b3, out3 = _mix_rgba(nt)
        nt.links.new(col, a3)
        b3.default_value = hexcol(speck)
        m3 = nt.nodes.new('ShaderNodeMath')
        m3.operation = 'MULTIPLY'
        m3.inputs[1].default_value = speck_amt
        nt.links.new(r2.outputs['Color'], m3.inputs[0])
        nt.links.new(m3.outputs[0], fac3)
        col = out3
    nt.links.new(col, p.inputs['Base Color'])
    return m


# ---------------------------------------------------------------- geometria

def link(o):
    bpy.context.scene.collection.objects.link(o)
    return o


def finish(obj, m, smooth=False):
    obj.data.materials.append(m)
    for poly in obj.data.polygons:
        poly.use_smooth = smooth
    return obj


def ico(r, loc, m, sub=1, scale=(1, 1, 1), smooth=False):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=r, location=loc)
    o = bpy.context.active_object
    o.scale = scale
    return finish(o, m, smooth)


def blob(r, loc, m, scale=(1, 1, 1), seed=0, amount=0.28):
    """copa orgânica: esfera subdividida deformada por ruído, sombreamento suave"""
    o = ico(r, loc, m, 3, scale, smooth=True)
    tex = bpy.data.textures.new(f'ruido{seed}', 'CLOUDS')
    tex.noise_scale = 0.35 * r / 0.15
    tex.noise_depth = 1
    mod = o.modifiers.new('deforma', 'DISPLACE')
    mod.texture = tex
    mod.strength = r * amount
    mod.mid_level = 0.5
    mod.texture_coords = 'GLOBAL'
    o.location.x += seed * 0.0001
    return o


def cyl(r, h, loc, m, verts=8, r2=None, rot=(0, 0, 0), smooth=False):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=loc, rotation=rot)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=h, location=loc, rotation=rot)
    return finish(bpy.context.active_object, m, smooth)


def cube(size, loc, m, rot=(0, 0, 0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.scale = size
    if bevel:
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        bv = o.modifiers.new('chanfro', 'BEVEL')
        bv.width = bevel
        bv.segments = 2
    return finish(o, m)


def mesh(name, verts, faces, m):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    return finish(link(bpy.data.objects.new(name, me)), m)


def gable_house(w, d, h, rh, wall, roof, over=0.025, tiles=True):
    """casa com paredes, empenas na cor da parede e telhado de duas águas com beiral (cumeeira em x),
    cumeeira mais escura e fiadas de telha na água da frente"""
    cube((w, d, h), (0, 0, h / 2), wall, bevel=0.004)
    mesh('empena', [(-w / 2, -d / 2, h), (-w / 2, d / 2, h), (-w / 2, 0, h + rh), (w / 2, -d / 2, h), (w / 2, d / 2, h), (w / 2, 0, h + rh)],
         [(0, 1, 2), (3, 5, 4)], wall)
    t = 0.018
    ang = math.atan2(rh, d / 2)
    ln = math.hypot(rh, d / 2) + over
    rc = roof.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value
    dark = mat(roof.name + '_escuro', '#%02x%02x%02x' % tuple(int(255 * (min(1, c) ** (1 / 2.2)) * 0.62) for c in rc[:3]), 0.8)
    for side in (-1, 1):
        cy, cz = side * (d / 4 + over * 0.3), h + rh / 2 + 0.004
        cube((w + 2 * over, ln, t), (0, cy, cz), roof, bevel=0.003)
        rot = ang if side < 0 else -ang
        bpy.context.active_object.rotation_euler = (rot, 0, 0)
        if tiles and side < 0:
            for frac in (-0.3, -0.05, 0.2):
                fy, fz = frac * ln, t / 2 + 0.003
                y2, z2 = fy * math.cos(rot) - fz * math.sin(rot), fy * math.sin(rot) + fz * math.cos(rot)
                cube((w + 2 * over, 0.009, 0.0025), (0, cy + y2, cz + z2), dark)
                bpy.context.active_object.rotation_euler = (rot, 0, 0)
    cube((w + 2 * over + 0.004, 0.03, 0.02), (0, 0, h + rh + 0.006), dark, bevel=0.004)


# ---------------------------------------------------------------- árvores

def trunk(h, r=0.03, lean=0.0):
    return cyl(r, h, (lean * 0.5, 0, h / 2), mat('tronco', '#6b4a2e', 0.9), 7, r * 0.7, rot=(0, lean * 2, 0), smooth=True)


def tree_round(var=0):
    greens = [('#2f6f30', '#79b84c'), ('#2d6a34', '#86c055'), ('#2a6236', '#6fae4c')]
    m = foliage(f'folha{var}', *greens[var])
    rnd = random.Random(10 + var)
    if var == 0:
        trunk(0.17)
        for i, (x, y, z, r) in enumerate([(0, 0, 0.27, 0.15), (-0.08, -0.04, 0.24, 0.1), (0.08, -0.02, 0.25, 0.1), (0.0, -0.05, 0.36, 0.1)]):
            blob(r, (x, y, z), m, seed=i + 1)
    elif var == 1:
        trunk(0.1, 0.028)
        for i, (x, y, z, r) in enumerate([(-0.09, 0.01, 0.16, 0.11), (0.09, 0.03, 0.18, 0.12), (0.0, -0.05, 0.25, 0.11), (0.02, 0.06, 0.27, 0.09)]):
            blob(r, (x, y, z), m, seed=i + 11)
    else:
        trunk(0.16, 0.026)
        for i, (x, y, z, r, sz) in enumerate([(0, 0, 0.33, 0.11, (1, 1, 1.9)), (-0.03, -0.04, 0.45, 0.07, (1, 1, 1.4))]):
            blob(r, (x, y, z), m, sz, seed=i + 21, amount=0.18)


def pine():
    m = foliage('pinho', '#1f5a32', '#4f9a52')
    trunk(0.1, 0.025)
    for i, (z, r, h) in enumerate([(0.17, 0.15, 0.2), (0.28, 0.12, 0.18), (0.38, 0.085, 0.16)]):
        o = cyl(r, h, (0, 0, z), m, 14, 0.0, smooth=True)
        tex = bpy.data.textures.new(f'pinho{i}', 'CLOUDS')
        tex.noise_scale = 0.08
        mod = o.modifiers.new('deforma', 'DISPLACE')
        mod.texture = tex
        mod.strength = 0.018
        mod.texture_coords = 'GLOBAL'


def ipe(petal, petal_light, name):
    m = foliage(name, petal, petal_light, speck='#fff3d6', speck_amt=0.55, speck_scale=55)
    trunk(0.2, 0.026, lean=0.04)
    cyl(0.014, 0.12, (0.06, 0, 0.2), mat('tronco', '#6b4a2e', 0.9), 6, 0.01, rot=(0, 0.7, 0))
    for i, (x, y, z, r, sz) in enumerate([(0.0, 0.0, 0.3, 0.14, (1.25, 1.15, 0.8)), (-0.1, -0.03, 0.28, 0.09, (1, 1, 0.85)),
                                          (0.11, 0.02, 0.3, 0.09, (1, 1, 0.85)), (0.02, -0.05, 0.37, 0.09, (1.1, 1, 0.8))]):
        blob(r, (x, y, z), m, sz, seed=i + 31)


def buriti():
    bark = mat('buriti_tronco', '#8a6a48', 0.9)
    leaf = foliage('buriti_folha', '#2f6b2e', '#7cbf4f')
    cyl(0.026, 0.48, (0, 0, 0.24), bark, 8, 0.02, smooth=True)
    for k in range(9):
        a = k / 9 * math.tau
        tilt = math.radians(55 + (k % 3) * 12)
        L = 0.2 + 0.03 * (k % 2)
        # folha em leque: triângulos achatados abrindo a partir do topo
        tip = (math.cos(a) * L * math.sin(tilt), math.sin(a) * L * math.sin(tilt), 0.48 + L * math.cos(tilt) - 0.05)
        sx, sy = -math.sin(a) * 0.05, math.cos(a) * 0.05
        mid = (tip[0] * 0.55, tip[1] * 0.55, 0.48 + (tip[2] - 0.48) * 0.55 + 0.03)
        mesh(f'folha{k}', [(0, 0, 0.48), (mid[0] + sx, mid[1] + sy, mid[2]), tip, (mid[0] - sx, mid[1] - sy, mid[2])],
             [(0, 1, 2, 3)], leaf)
    ico(0.035, (0, 0, 0.47), mat('buriti_coco', '#7a4a26'), 2, smooth=True)


def bush():
    m = foliage('arbusto', '#2f6b31', '#7fbf55')
    for i, (x, y, z, r) in enumerate([(0, 0, 0.06, 0.08), (0.07, -0.03, 0.06, 0.065), (-0.07, -0.02, 0.05, 0.06), (0.0, 0.04, 0.09, 0.06)]):
        blob(r, (x, y, z), m, (1.15, 1, 0.85), seed=i + 41)


def cerrado_tree():
    m = foliage('cerrado', '#4e6e2c', '#a3bd5a')
    t = mat('tronco_torto', '#5a3c24', 0.9)
    cyl(0.024, 0.14, (0.0, 0, 0.07), t, 7, 0.02, smooth=True)
    cyl(0.02, 0.15, (0.045, 0, 0.18), t, 7, 0.015, rot=(0, math.radians(35), 0), smooth=True)
    cyl(0.015, 0.1, (-0.03, 0, 0.17), t, 6, 0.01, rot=(0, math.radians(-40), 0), smooth=True)
    blob(0.12, (0.08, 0, 0.26), m, (1.45, 1.2, 0.5), seed=51)
    blob(0.08, (-0.06, -0.02, 0.22), m, (1.4, 1.1, 0.55), seed=52)


# ---------------------------------------------------------------- construções

WALL = '#fbf3e4'
TRIM = '#3f6f9e'


def door_and_windows(w, d, h, shutters=TRIM):
    wood = mat('porta', '#7a4a2a', 0.8)
    glow = mat('janela', '#ffd46a', 0.5, emit='#ffc94d', strength=2.2)
    sh = mat(f'veneziana{shutters}', shutters)
    frame = mat('moldura', '#ffffff', 0.6)
    fy = -d / 2 - 0.003
    cube((0.05, 0.006, 0.085), (-w * 0.22, fy, 0.0425), wood)
    cube((0.06, 0.004, 0.095), (-w * 0.22, fy + 0.001, 0.0475), frame)
    for x in ([w * 0.18] if w < 0.3 else [w * 0.1, w * 0.32]):
        cube((0.042, 0.006, 0.042), (x, fy, h * 0.58), glow)
        cube((0.05, 0.004, 0.05), (x, fy + 0.001, h * 0.58), frame)
        for s in (-1, 1):
            cube((0.016, 0.007, 0.046), (x + s * 0.034, fy, h * 0.58), sh)


def house(shape=0, roof='#d9643a', shutters=TRIM):
    wall = mat('parede', WALL, 0.8)
    base = mat('rodape', '#d9c8a8', 0.9)
    rf = mat(f'telhado{roof}', roof, 0.75)
    w, d, h, rh = [(0.24, 0.18, 0.13, 0.09), (0.17, 0.17, 0.19, 0.1), (0.34, 0.16, 0.12, 0.08)][shape]
    gable_house(w, d, h, rh, wall, rf)
    cube((w + 0.006, d + 0.006, 0.022), (0, 0, 0.011), base)
    door_and_windows(w, d, h, shutters)
    cube((0.035, 0.035, 0.09), (w * 0.28, d * 0.12, h + rh * 0.75), mat('chamine', '#9a6a4a'), bevel=0.003)


def church():
    """capela colonial vista de lado: nave comprida branca, torre sineira numa ponta, frisos azuis, telhado de barro"""
    wall = mat('igreja', '#fdf8ee', 0.75)
    trim = mat('igreja_friso', '#2f6aa3', 0.6)
    gold = mat('igreja_ouro', '#e0b040', 0.35)
    rf = mat('telhado_igreja', '#c1583a', 0.75)
    dark = mat('igreja_vao', '#3a2e2a', 0.9)
    glass = mat('janela', '#ffd46a', 0.5, emit='#ffc94d', strength=2.2)
    w, d, h = 0.3, 0.17, 0.17
    # nave, deslocada para a direita
    bpy.ops.object.select_all(action='DESELECT')
    tw, th, tx, ty = 0.115, 0.4, -0.15, -0.035
    nave_x = tx + tw / 2 + w / 2 + 0.006   # empena da nave encosta na lateral da torre
    before = set(bpy.context.scene.objects)
    gable_house(w, d, h, 0.09, wall, rf, over=0.0)
    for o in set(bpy.context.scene.objects) - before:
        o.location.x += nave_x
    cube((w + 0.006, d + 0.006, 0.024), (nave_x, 0, 0.012), trim)
    fy = -d / 2 - 0.004
    for x in (-0.06, 0.03, 0.12):   # janelas altas com moldura azul
        cube((0.034, 0.005, 0.07), (nave_x + x - 0.03, fy, h * 0.55), glass)
        cube((0.044, 0.004, 0.08), (nave_x + x - 0.03, fy + 0.001, h * 0.55), trim)
    # torre na ponta esquerda, um pouco à frente
    cube((tw, tw, th), (tx, ty, th / 2), wall, bevel=0.004)
    for z in (0.012, th * 0.6, th):
        cube((tw + 0.012, tw + 0.012, 0.018), (tx, ty, z), trim)
    for sx in (-1, 1):
        cube((0.014, 0.014, th), (tx + sx * tw / 2, ty - tw / 2, th / 2), trim)
    fty = ty - tw / 2 - 0.004
    cube((0.05, 0.006, 0.085), (tx, fty, th * 0.8), dark)                       # sineira
    ico(0.02, (tx, fty - 0.004, th * 0.79), gold, 2, (1, 1, 1.2), smooth=True)  # sino
    door = mat('porta_igreja', '#2f5d8f', 0.7)
    cube((0.05, 0.006, 0.09), (tx, fty, 0.045), door)                           # porta
    cyl(0.025, 0.006, (tx, fty, 0.09), door, 16, rot=(math.pi / 2, 0, 0))
    cyl(0.018, 0.006, (tx, fty - 0.001, th * 0.42), glass, 16, rot=(math.pi / 2, 0, 0))  # óculo
    cyl(tw * 0.8, 0.13, (tx, ty, th + 0.065), rf, 4, 0.0, rot=(0, 0, math.pi / 4))      # coruchéu
    cube((0.009, 0.009, 0.075), (tx, ty, th + 0.165), gold)
    cube((0.042, 0.009, 0.009), (tx, ty, th + 0.18), gold)


def windmill():
    body = mat('moinho', '#f4ead6', 0.8)
    rf = mat('telhado_moinho', '#7a4b2f', 0.75)
    blade = mat('pas', '#fbf6ea', 0.7)
    wood = mat('madeira', '#8a5a36', 0.8)
    cyl(0.1, 0.32, (0, 0, 0.16), body, 16, 0.07, smooth=True)
    cyl(0.088, 0.1, (0, 0, 0.37), rf, 16, 0.0, smooth=True)
    cyl(0.014, 0.05, (0, -0.1, 0.3), wood, 8, rot=(math.pi / 2, 0, 0))
    for k in range(4):
        a = k * math.pi / 2 + math.radians(20)
        cx, cz = math.cos(a) * 0.11, 0.3 + math.sin(a) * 0.11
        cube((0.012, 0.008, 0.22), (cx, -0.125, cz), wood, (0, -a + math.pi / 2, 0))
        cube((0.045, 0.004, 0.16), (cx + math.cos(a + math.pi / 2) * 0.026, -0.128, cz + math.sin(a + math.pi / 2) * 0.026), blade, (0, -a + math.pi / 2, 0))
    cube((0.04, 0.006, 0.065), (0, -0.097, 0.033), mat('porta', '#7a4a2a', 0.8))


def barn():
    red = mat('celeiro', '#b4432f', 0.8)
    white = mat('moldura', '#ffffff', 0.6)
    gable_house(0.3, 0.22, 0.15, 0.12, red, mat('telhado_celeiro', '#6a5244', 0.8))
    cube((0.1, 0.006, 0.11), (0, -0.113, 0.055), white)
    cube((0.09, 0.007, 0.1), (0, -0.113, 0.055), mat('porta_celeiro', '#8f3324', 0.8))
    for s in (-1, 1):
        cube((0.13, 0.008, 0.008), (0, -0.115, 0.055), white, (0, s * 0.83, 0))


# ---------------------------------------------------------------- campo, pasto, beira-rio

def wheat():
    stalk, head = mat('talo', '#c9a640'), foliage('espiga', '#c9952a', '#f6d363')
    rnd = random.Random(7)
    for i in range(12):
        x, y = rnd.uniform(-0.09, 0.09), rnd.uniform(-0.07, 0.07)
        hgt = 0.13 + rnd.random() * 0.05
        cyl(0.005, hgt, (x, y, hgt / 2), stalk, 4)
        ico(0.018, (x, y, hgt + 0.012), head, 2, (0.75, 0.75, 1.9), smooth=True)


def haybale():
    hay = foliage('feno', '#c79a3a', '#f1d07a')
    for x, y, rz in [(-0.075, 0.0, 0.3), (0.085, 0.04, -0.2)]:
        cyl(0.066, 0.095, (x, y, 0.066), hay, 20, rot=(0, math.pi / 2, rz), smooth=True)


def tuft():
    g = foliage('capim', '#4f8a2e', '#9fd45e')
    rnd = random.Random(3)
    for i in range(14):
        a, r, h = rnd.random() * math.tau, rnd.random() * 0.05, 0.07 + rnd.random() * 0.07
        cyl(0.011, h, (math.cos(a) * r, math.sin(a) * r, h / 2), g, 3, 0.0, rot=(rnd.uniform(-.4, .4), rnd.uniform(-.4, .4), 0))


def flowers():
    stem = mat('caule', '#5f9e3c')
    cols = [mat('flor1', '#ffffff'), mat('flor2', '#ffd24a'), mat('flor3', '#f29bb5'), mat('flor4', '#b18be0')]
    rnd = random.Random(5)
    for i in range(7):
        x, y = rnd.uniform(-0.07, 0.07), rnd.uniform(-0.05, 0.05)
        h = 0.05 + rnd.random() * 0.04
        cyl(0.004, h, (x, y, h / 2), stem, 4)
        ico(0.02, (x, y, h + 0.008), cols[i % 4], 2, (1, 1, 0.55), smooth=True)
        ico(0.007, (x, y - 0.002, h + 0.016), mat('miolo', '#e8a13a'), 1)


def rock():
    st = foliage('pedra', '#8e877c', '#d2ccc0')
    ico(0.07, (0, 0, 0.03), st, 2, (1.25, 1, 0.65), smooth=False)
    ico(0.045, (0.075, 0.03, 0.02), st, 2, (1, 1, 0.7))


def reeds():
    g = foliage('junco', '#3f7a2e', '#8fc45a')
    cat = mat('taboa', '#6e4326')
    for i, (x, y) in enumerate([(-0.04, 0), (0.0, 0.03), (0.04, -0.01), (0.02, -0.04), (-0.02, -0.03)]):
        h = 0.13 + 0.02 * (i % 3)
        cyl(0.005, h, (x, y, h / 2), g, 4)
        if i % 2 == 0:
            cyl(0.012, 0.04, (x, y, h - 0.01), cat, 8, smooth=True)


def cow():
    body = mat('vaca', '#f2ece2', 0.8)
    spot = mat('vaca_mancha', '#3b2a22', 0.8)
    nose = mat('vaca_focinho', '#e9a6a0', 0.8)
    parts = []
    parts.append(cube((0.2, 0.09, 0.085), (0, 0, 0.105), body, bevel=0.02))
    parts.append(cube((0.07, 0.093, 0.05), (-0.03, 0, 0.115), spot, bevel=0.012))
    parts.append(cube((0.075, 0.07, 0.07), (0.13, 0, 0.135), body, bevel=0.015))
    parts.append(cube((0.03, 0.06, 0.035), (0.175, 0, 0.12), nose, bevel=0.008))
    for x, y in [(-0.07, -0.03), (-0.07, 0.03), (0.07, -0.03), (0.07, 0.03)]:
        parts.append(cube((0.022, 0.022, 0.065), (x, y, 0.032), spot))
    a = math.radians(-25)
    for o in parts:
        x, y = o.location.x, o.location.y
        o.location.x, o.location.y = x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a)
        o.rotation_euler.z += a


def termite_mound():
    clay = foliage('cupinzeiro', '#8e4b2c', '#d0865a')
    o = cyl(0.075, 0.2, (0, 0, 0.1), clay, 14, 0.02, smooth=True)
    tex = bpy.data.textures.new('cupim', 'CLOUDS')
    tex.noise_scale = 0.05
    mod = o.modifiers.new('deforma', 'DISPLACE')
    mod.texture = tex
    mod.strength = 0.02
    mod.texture_coords = 'GLOBAL'
    blob(0.045, (0.045, 0.02, 0.05), clay, seed=61)


# ---------------------------------------------------------------- partículas

def p_sparkle():
    m = mat('brilho', '#fff3b0', emit='#ffe27a')
    pts = []
    for i in range(8):
        a = i / 8 * math.tau + math.pi / 2
        r = 0.15 if i % 2 == 0 else 0.035
        pts.append((math.cos(a) * r, math.sin(a) * r, 0))
    o = mesh('estrela', [(0, 0, 0)] + pts, [(0, i + 1, (i + 1) % 8 + 1) for i in range(8)], m)
    o.rotation_euler = (math.pi / 2 - ELEV, 0, 0)


def p_leaf():
    o = ico(0.07, (0, 0, 0), mat('folha_p', '#5aa847'), 2, (1.6, 0.7, 0.18), smooth=True)
    o.rotation_euler = (math.radians(30), 0, math.radians(25))


def p_drop():
    ico(0.07, (0, 0, 0), mat('gota', '#4fc0ec', rough=0.1, trans=0.3), 3, (0.85, 0.85, 1.25), smooth=True)


def p_puff():
    m = mat('fumaca', '#fbf7ef')
    for x, y, z, r in [(0, 0, 0, 0.09), (0.07, 0.02, 0.03, 0.065), (-0.07, 0.01, 0.02, 0.06), (0.0, -0.02, 0.07, 0.06)]:
        ico(r, (x, y, z), m, 3, smooth=True)


def p_petal():
    o = ico(0.06, (0, 0, 0), mat('petala', '#f6a3c0'), 2, (1.2, 0.8, 0.15), smooth=True)
    o.rotation_euler = (math.radians(50), math.radians(20), 0)


def p_butterfly():
    m = mat('borboleta', '#ffb43a', 0.6)
    for s in (-1, 1):
        o = ico(0.06, (s * 0.055, 0, 0), m, 2, (1, 0.75, 0.12), smooth=True)
        o.rotation_euler = (math.radians(55), s * math.radians(25), 0)
    cyl(0.008, 0.08, (0, 0, 0), mat('corpo', '#3a2a20'), 6, rot=(math.radians(55), 0, 0))


OBJECTS = {
    'tree_a': lambda: tree_round(0), 'tree_b': lambda: tree_round(1), 'tree_c': lambda: tree_round(2),
    'pine': pine, 'ipe_yellow': lambda: ipe('#d9a51c', '#ffdf55', 'ipe_amarelo'),
    'ipe_pink': lambda: ipe('#b2457c', '#f08cc0', 'ipe_roxo'),
    'buriti': buriti, 'bush': bush, 'cerrado_tree': cerrado_tree,
    'house_a_red': lambda: house(0, '#d9643a'), 'house_a_blue': lambda: house(0, '#4f7fa8', '#d9643a'),
    'house_a_terra': lambda: house(0, '#b8693f', '#3f8a5a'),
    'house_b_red': lambda: house(1, '#c9503a'), 'house_b_blue': lambda: house(1, '#5a86a0', '#c9503a'),
    'house_b_terra': lambda: house(1, '#a85a35', '#3f8a5a'),
    'house_c_red': lambda: house(2, '#d65a3a'), 'house_c_blue': lambda: house(2, '#4a7896', '#d9a73a'),
    'church': church, 'windmill': windmill, 'barn': barn,
    'wheat': wheat, 'haybale': haybale, 'tuft': tuft, 'flowers': flowers,
    'rock': rock, 'reeds': reeds, 'cow': cow, 'termite': termite_mound,
}
FX = {'sparkle': p_sparkle, 'leaf': p_leaf, 'drop': p_drop, 'puff': p_puff, 'petal': p_petal, 'butterfly': p_butterfly}


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


if __name__ == '__main__':
    only = os.environ.get('SOMENTE')
    meta_path = os.path.join(OUT, 'meta.json')
    meta = json.load(open(meta_path)) if only and os.path.exists(meta_path) else {}
    for n, b in OBJECTS.items():
        if only and n not in only.split(','):
            continue
        meta[n] = render(n, b, OBJ_PX, OBJ_SCALE, 0.24)
        print('ok', n, flush=True)
    for n, b in FX.items():
        if only and 'fx_' + n not in only.split(','):
            continue
        meta['fx_' + n] = render('fx_' + n, b, FX_PX, FX_SCALE, 0.0, floor=False)
        print('ok fx', n, flush=True)
    with open(meta_path, 'w') as f:
        json.dump(meta, f, indent=1)
