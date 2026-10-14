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
FX_PX, FX_SCALE = 128, 0.34       # partículas (v1.5: 128 px, formas novas e variações)
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


FOL_PAL = {}


def foliage(name, dark, light, speck=None, speck_amt=0.0, speck_scale=40.0):
    """folhagem pintada: clara em cima, escura embaixo, com manchas (flores no caso dos ipês)"""
    m = bpy.data.materials.get(name)
    if m:
        return m
    FOL_PAL[name] = (dark, light, speck)
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


# ---------------------------------------------------------------- v1.3: copas feitas de folhas
# Cada copa vira centenas de "cartas" de folha (losangos) espalhadas na casca de um elipsoide, em volta de um
# núcleo escuro. Cada folha tem a própria cor (mais clara em cima e por fora, variação aleatória) e o material
# deixa passar um pouco de luz (translucência), então as folhas contra o sol brilham.
LEAFY = True
TREE_FOL = {'folha0', 'folha1', 'folha2', 'folha3', 'folha4', 'ipe_amarelo', 'ipe_roxo', 'ipe_branco', 'arbusto',
            'cerrado', 'pequi', 'lobeira'}
DRYV = False            # versão de seca: folhas cor de palha e ferrugem, copa rala


def _lerp(a, b, k):
    return tuple(a[i] * (1 - k) + b[i] * k for i in range(3)) + (1.0,)


def leaf_mat():
    m = bpy.data.materials.get('folhas_cartas')
    if m:
        return m
    m = bpy.data.materials.new('folhas_cartas')
    m.use_nodes = True
    nt = m.node_tree
    out = nt.nodes['Material Output']
    pb = nt.nodes['Principled BSDF']
    pb.inputs['Roughness'].default_value = 0.62
    ca = nt.nodes.new('ShaderNodeVertexColor')
    ca.layer_name = 'Col'
    nt.links.new(ca.outputs['Color'], pb.inputs['Base Color'])
    tr = nt.nodes.new('ShaderNodeBsdfTranslucent')
    nt.links.new(ca.outputs['Color'], tr.inputs['Color'])
    mx = nt.nodes.new('ShaderNodeMixShader')
    mx.inputs['Fac'].default_value = 0.22
    nt.links.new(pb.outputs[0], mx.inputs[1])
    nt.links.new(tr.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], out.inputs['Surface'])
    return m


def canopy(r, loc, sc, pal, seed, dens=1.0, leaf=0.032):
    dark, light, speck = pal
    D, L = hexcol(dark), hexcol(light)
    if DRYV:
        D, L = _lerp(D, hexcol('#5a4423'), 0.72), _lerp(L, hexcol('#cfa65a'), 0.7)
        dens *= 0.5
    rnd = random.Random(seed * 7919 + 13)
    corec = _lerp(D, (0, 0, 0, 1), 0.35)
    cm = bpy.data.materials.get('nucleo_' + dark + ('s' if DRYV else ''))
    if not cm:
        cm = bpy.data.materials.new('nucleo_' + dark + ('s' if DRYV else ''))
        cm.use_nodes = True
        cm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = corec
        cm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.9
    blob_solid(r * (0.62 if DRYV else 0.8), loc, cm, sc, seed=seed, amount=0.3)
    n = int(dens * 430 * (r / 0.12) ** 2 * (sc[0] * sc[1] + sc[1] * sc[2] + sc[0] * sc[2]) / 3)
    verts, faces, cols = [], [], []
    S = hexcol(speck) if speck else None
    rust = hexcol('#a0582a')
    for i in range(n):
        u = rnd.uniform(-1, 1)
        th = rnd.uniform(0, math.tau)
        q = math.sqrt(1 - u * u)
        nx, ny, nz = q * math.cos(th), q * math.sin(th), u
        if nz < -0.45 and rnd.random() < 0.75:
            continue
        rr = r * (0.84 + 0.24 * rnd.random())
        P = Vector((loc[0] + nx * rr * sc[0], loc[1] + ny * rr * sc[1], loc[2] + nz * rr * sc[2]))
        nv = Vector((nx * sc[1] * sc[2], ny * sc[0] * sc[2], nz * sc[0] * sc[1])).normalized()
        t1 = nv.cross(Vector((0, 0, 1)))
        if t1.length < 1e-3:
            t1 = Vector((1, 0, 0))
        t1.normalize()
        t2 = nv.cross(t1)
        a = rnd.uniform(0, math.tau)
        d1 = (t1 * math.cos(a) + t2 * math.sin(a) + nv * rnd.uniform(-0.7, 0.7)).normalized()
        d2 = nv.cross(d1).normalized()
        Ls = leaf * rnd.uniform(0.7, 1.35)
        Wd = Ls * 0.55
        b0 = len(verts)
        verts += [tuple(P - d1 * Ls * 0.5), tuple(P + d2 * Wd * 0.5), tuple(P + d1 * Ls * 0.5), tuple(P - d2 * Wd * 0.5)]
        faces.append((b0, b0 + 1, b0 + 2, b0 + 3))
        k = max(0.0, min(1.0, 0.2 + 0.7 * (nz + 1) / 2 + rnd.uniform(-0.2, 0.2)))
        c = _lerp(D, L, k)
        if S and rnd.random() < 0.18:
            c = _lerp(c, S, 0.7)
        if DRYV and rnd.random() < 0.22:
            c = _lerp(c, rust, 0.6)
        cols.append(c)
    me = bpy.data.meshes.new('folhas')
    me.from_pydata(verts, [], faces)
    me.update()
    attr = me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
    for fi, c in enumerate(cols):
        for li in range(4):
            attr.data[fi * 4 + li].color = c
    o = link(bpy.data.objects.new('copa', me))
    o.data.materials.append(leaf_mat())
    return o


blob_solid = blob


def blob(r, loc, m, scale=(1, 1, 1), seed=0, amount=0.28):
    if LEAFY and m.name in TREE_FOL and r >= 0.045:
        return canopy(r, loc, scale, FOL_PAL[m.name], seed)
    return blob_solid(r, loc, m, scale, seed, amount)


def straw_mat(name, base, light):
    """palha e feno: fibras finas em faixas, com relevo e variação de cor"""
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    pb = nt.nodes['Principled BSDF']
    pb.inputs['Roughness'].default_value = 0.95
    tc = nt.nodes.new('ShaderNodeTexCoord')
    wv = nt.nodes.new('ShaderNodeTexWave')
    wv.wave_type = 'RINGS'
    wv.inputs['Scale'].default_value = 26.0
    wv.inputs['Distortion'].default_value = 6.0
    wv.inputs['Detail'].default_value = 4.0
    nt.links.new(tc.outputs['Object'], wv.inputs['Vector'])
    nz = nt.nodes.new('ShaderNodeTexNoise')
    nz.inputs['Scale'].default_value = 160.0
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    mixf = nt.nodes.new('ShaderNodeMath')
    mixf.operation = 'MULTIPLY_ADD'
    mixf.inputs[1].default_value = 0.6
    nt.links.new(wv.outputs['Fac'], mixf.inputs[0])
    nt.links.new(nz.outputs['Fac'], mixf.inputs[2])
    mix, fac, a, b, out = _mix_rgba(nt)
    a.default_value = hexcol(base)
    b.default_value = hexcol(light)
    nt.links.new(mixf.outputs[0], fac)
    nt.links.new(out, pb.inputs['Base Color'])
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.55
    bump.inputs['Distance'].default_value = 0.004
    nt.links.new(mixf.outputs[0], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], pb.inputs['Normal'])
    return m


def blades(n, rad, hmin, hmax, dark, light, seed, width=0.008, lean=0.5, heads=None):
    """capim de verdade: lâminas achatadas e curvas, escuras na base e claras na ponta"""
    rnd = random.Random(seed)
    D, L = hexcol(dark), hexcol(light)
    verts, faces, cols = [], [], []
    for i in range(n):
        a = rnd.random() * math.tau
        rr = rad * math.sqrt(rnd.random())
        x0, y0 = math.cos(a) * rr, math.sin(a) * rr
        h = rnd.uniform(hmin, hmax)
        dirr = a + rnd.uniform(-0.8, 0.8)
        bend = lean * rnd.uniform(0.3, 1.0)
        w = width * rnd.uniform(0.7, 1.2)
        px, py = -math.sin(dirr), math.cos(dirr)
        segs = 4
        b0 = len(verts)
        for j in range(segs + 1):
            t = j / segs
            off = bend * h * t * t
            cx, cy, cz = x0 + math.cos(dirr) * off, y0 + math.sin(dirr) * off, h * t * (1 - 0.25 * t * bend)
            ww = w * (1 - t) * 0.5 + 0.0008
            verts += [(cx - px * ww, cy - py * ww, cz), (cx + px * ww, cy + py * ww, cz)]
            c = _lerp(D, L, min(1, t * 1.1 + rnd.uniform(-0.1, 0.1)))
            if j < segs:
                faces.append((b0 + 2 * j, b0 + 2 * j + 1, b0 + 2 * j + 3, b0 + 2 * j + 2))
                cols.append(c)
    me = bpy.data.meshes.new('capim')
    me.from_pydata(verts, [], faces)
    me.update()
    attr = me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
    for fi, c in enumerate(cols):
        for li in range(4):
            attr.data[fi * 4 + li].color = c
    o = link(bpy.data.objects.new('capim', me))
    o.data.materials.append(leaf_mat())
    if heads:
        hm = mat('cabecinha' + heads, heads, 0.5)
        for i in range(n // 2):
            a = rnd.random() * math.tau
            rr = rad * math.sqrt(rnd.random())
            ico(0.009, (math.cos(a) * rr * 1.2, math.sin(a) * rr * 1.2, rnd.uniform(hmin, hmax) * 1.05), hm, 1, smooth=True)
    return o


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
    hay = straw_mat('feno_fibra', '#b98a32', '#f0cf78')
    for x, y, rz in [(-0.075, 0.0, 0.3), (0.085, 0.04, -0.2)]:
        cyl(0.066, 0.095, (x, y, 0.066), hay, 20, rot=(0, math.pi / 2, rz), smooth=True)


def tuft():
    blades(46, 0.05, 0.07, 0.15, '#3f7326', '#b4dc6a', 3, width=0.01, lean=0.55)


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
    """gado curraleiro (pé-duro), raça do Cerrado: caramelo, corpo arredondado, cupim leve, chifres em lira"""
    body = mat('vaca', '#b8763e', 0.85)
    belly = mat('vaca_barriga', '#e3c9a0', 0.9)
    dark = mat('vaca_escuro', '#3a2a20', 0.8)
    horn = mat('vaca_chifre', '#eadfc8', 0.6)
    P = []
    P.append(ico(0.1, (0, 0, 0.105), body, 3, (1.0, 0.48, 0.5), smooth=True))
    P.append(ico(0.07, (-0.01, 0, 0.088), belly, 2, (1.1, 0.62, 0.42), smooth=True))
    P.append(ico(0.032, (0.06, 0, 0.143), body, 2, (0.9, 0.75, 0.55), smooth=True))      # cupim (giba)
    P.append(ico(0.045, (-0.075, 0, 0.115), body, 2, (0.8, 0.95, 0.95), smooth=True))  # anca
    hd = ico(0.04, (0.125, 0, 0.13), body, 2, (1.25, 0.72, 0.78), smooth=True)
    hd.rotation_euler.y = math.radians(22)
    P.append(hd)
    P.append(ico(0.022, (0.165, 0, 0.108), belly, 2, (1.0, 1.05, 0.85), smooth=True))  # focinho claro
    P.append(ico(0.012, (0.182, 0, 0.1), dark, 1, (0.8, 1.4, 0.8), smooth=True))
    for e in (-1, 1):
        ear = ico(0.014, (0.112, e * 0.04, 0.14), body, 1, (0.7, 1.7, 0.45), smooth=True)
        ear.rotation_euler.x = e * 0.5
        P.append(ear)
        h = cyl(0.006, 0.032, (0.122, e * 0.03, 0.16), horn, 6, 0.002, rot=(-e * 1.05, 0.2, 0))
        P.append(h)
    for x, y in [(-0.065, -0.026), (-0.065, 0.026), (0.06, -0.026), (0.06, 0.026)]:
        P.append(cyl(0.011, 0.075, (x, y, 0.038), body, 8, 0.008, smooth=True))
        P.append(cyl(0.0105, 0.012, (x, y, 0.006), dark, 8))
    P.append(cyl(0.004, 0.08, (-0.11, 0, 0.09), body, 6, rot=(0, 0.35, 0)))
    P.append(ico(0.009, (-0.124, 0, 0.05), dark, 1, (0.8, 0.8, 1.6), smooth=True))
    a = math.radians(-25)
    for o in P:
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


# ---------------------------------------------------------------- v1.2: mais Cerrado, mais vida no campo e na vila

def tree_round_more(var):
    """mais duas formas de árvore de copa redonda (variações da mesma espécie)"""
    greens = {3: ('#2c6431', '#8cc65a'), 4: ('#336d2c', '#a2c95a')}
    m = foliage(f'folha{var}', *greens[var])
    if var == 3:   # copa larga e baixa, tronco que se divide
        trunk(0.12, 0.03, lean=-0.03)
        for i, (x, y, z, r, sc) in enumerate([(-0.1, 0.0, 0.2, 0.12, (1.2, 1, 0.8)), (0.1, 0.02, 0.21, 0.12, (1.2, 1, 0.8)),
                                              (0.0, -0.04, 0.27, 0.12, (1.3, 1.1, 0.75)), (0.02, 0.07, 0.25, 0.1, (1, 1, 0.8))]):
            blob(r, (x, y, z), m, sc, seed=i + 71)
    else:          # árvore alta e estreita com copa em camadas
        trunk(0.22, 0.024)
        for i, (z, r) in enumerate([(0.24, 0.1), (0.34, 0.085), (0.43, 0.065)]):
            blob(r, (0.01 * i, -0.01 * i, z), m, (1.15, 1.1, 0.8), seed=i + 81, amount=0.22)


def pequi():
    """pequizeiro: copa larga em guarda-chuva, tronco grosso e torto, frutos verdes"""
    m = foliage('pequi', '#3b6a26', '#9fc860')
    t = mat('tronco_pequi', '#5b3f28', 0.9)
    cyl(0.04, 0.16, (0, 0, 0.08), t, 8, 0.03, smooth=True)
    cyl(0.026, 0.13, (0.05, 0, 0.19), t, 7, 0.018, rot=(0, math.radians(30), 0), smooth=True)
    cyl(0.024, 0.12, (-0.05, 0.01, 0.18), t, 7, 0.016, rot=(0.2, math.radians(-32), 0), smooth=True)
    for i, (x, y, z, r) in enumerate([(-0.11, 0, 0.27, 0.12), (0.11, 0.01, 0.28, 0.12), (0, -0.05, 0.3, 0.13), (0.0, 0.07, 0.29, 0.1)]):
        blob(r, (x, y, z), m, (1.55, 1.3, 0.48), seed=i + 91)
    fr = mat('pequi_fruto', '#7c9a2c', 0.6)
    for x, y in [(-0.12, -0.08), (0.06, -0.1), (0.16, -0.04)]:
        ico(0.016, (x, y, 0.235), fr, 2, smooth=True)


def lobeira():
    """lobeira: arbusto de folhas grandes cinza-esverdeadas e frutos redondos (fruta-do-lobo)"""
    m = foliage('lobeira', '#4f6b3e', '#a9c08a')
    cyl(0.018, 0.1, (0, 0, 0.05), mat('tronco', '#6b4a2e', 0.9), 6, 0.014)
    for i, (x, y, z, r) in enumerate([(0, 0, 0.13, 0.085), (-0.07, 0.01, 0.1, 0.065), (0.07, -0.01, 0.11, 0.07)]):
        blob(r, (x, y, z), m, (1.25, 1.1, 0.8), seed=i + 101, amount=0.4)
    fr = mat('lobeira_fruto', '#9db84a', 0.5)
    for x, y, z in [(-0.05, -0.07, 0.07), (0.04, -0.07, 0.09)]:
        ico(0.022, (x, y, z), fr, 2, smooth=True)


def canela():
    """canela-de-ema: caules escuros com tufo no alto e flor lilás"""
    st = mat('canela_caule', '#4a3a2c', 0.9)
    lf = foliage('canela_folha', '#4f7a34', '#a6c86a')
    fl = mat('canela_flor', '#b98ee6', 0.5)
    for x, y, h in [(-0.03, 0.0, 0.12), (0.03, 0.02, 0.15), (0.0, -0.03, 0.1)]:
        cyl(0.012, h, (x, y, h / 2), st, 6, 0.009)
        blob(0.035, (x, y, h + 0.01), lf, (1, 1, 0.8), seed=int(h * 1000), amount=0.5)
        ico(0.014, (x, y - 0.012, h + 0.04), fl, 2, (1, 1, 0.8), smooth=True)


def tuft_gold():
    """capim-dourado: lâminas finas cor de palha com cabecinhas douradas"""
    blades(40, 0.055, 0.09, 0.17, '#8a6a2a', '#e9c873', 13, width=0.006, lean=0.35, heads='#f2c14a')


def sunflower():
    st = mat('girassol_caule', '#5f8f34')
    pet = mat('girassol_petala', '#f6c21c', 0.6)
    mid = mat('girassol_miolo', '#5a3518', 0.8)
    lf = foliage('girassol_folha', '#3f7a2c', '#86bd4e')
    for i, (x, y, h) in enumerate([(-0.05, 0.02, 0.2), (0.05, 0.0, 0.23), (0.0, -0.04, 0.18)]):
        cyl(0.007, h, (x, y, h / 2), st, 5)
        blob(0.03, (x + 0.02, y, h * 0.5), lf, (1.3, 0.6, 0.4), seed=111 + i, amount=0.2)
        cyl(0.036, 0.012, (x, y - 0.012, h), pet, 14, rot=(math.radians(70), 0, 0))
        cyl(0.019, 0.016, (x, y - 0.016, h), mid, 12, rot=(math.radians(70), 0, 0))


def corn():
    st = foliage('milho', '#4f8a2c', '#a8d05e')
    cob = mat('espiga_milho', '#e8c34a', 0.6)
    rnd = random.Random(17)
    for i in range(5):
        x, y = rnd.uniform(-0.07, 0.07), rnd.uniform(-0.05, 0.05)
        h = 0.2 + rnd.random() * 0.05
        cyl(0.007, h, (x, y, h / 2), st, 5)
        for k in range(3):
            a = rnd.random() * math.tau
            mesh(f'folha_milho{i}{k}', [(x, y, h * (0.35 + 0.2 * k)), (x + math.cos(a) * 0.06, y + math.sin(a) * 0.06, h * (0.3 + 0.2 * k)),
                                        (x + math.cos(a) * 0.09, y + math.sin(a) * 0.09, h * (0.15 + 0.2 * k)),
                                        (x + math.cos(a + 0.3) * 0.05, y + math.sin(a + 0.3) * 0.05, h * (0.32 + 0.2 * k))], [(0, 1, 2, 3)], st)
        ico(0.014, (x + 0.012, y - 0.01, h * 0.55), cob, 2, (0.8, 0.8, 1.8), smooth=True)


def fence():
    wood = mat('cerca', '#8a6040', 0.85)
    for x in (-0.13, 0.0, 0.13):
        cube((0.016, 0.016, 0.1), (x, 0, 0.05), wood, bevel=0.003)
    for z in (0.04, 0.08):
        cube((0.28, 0.01, 0.014), (0, -0.006, z), wood, bevel=0.002)


def well():
    """poço: boca de pedra, dois esteios, sarilho e um telhadinho de duas águas"""
    stone = foliage('poco_pedra', '#8e877c', '#d6cfc2')
    wood = mat('madeira', '#8a5a36', 0.8)
    rf = mat('telhado_poco', '#b8693f', 0.75)
    cyl(0.06, 0.07, (0, 0, 0.035), stone, 16)
    cyl(0.045, 0.072, (0, 0, 0.037), mat('agua_poco', '#2b5a6a', 0.2), 16)
    for x in (-0.055, 0.055):
        cube((0.012, 0.012, 0.15), (x, 0, 0.11), wood)
    cyl(0.009, 0.12, (0, 0, 0.15), wood, 8, rot=(0, math.pi / 2, 0))
    for side in (-1, 1):
        cube((0.15, 0.075, 0.008), (0, side * 0.03, 0.2), rf, (side * -0.62, 0, 0), bevel=0.002)
    cube((0.155, 0.012, 0.012), (0, 0, 0.222), mat('telhado_poco_escuro', '#7a4028', 0.8))


def garden():
    """horta: canteiros com fileiras de verduras"""
    soil = mat('terra_horta', '#7a4f30', 0.95)
    wood = mat('cerca', '#8a6040', 0.85)
    greens = [foliage('alface', '#4f9a3a', '#b4e07a'), foliage('couve', '#2f6f3a', '#79b25a')]
    for row, y in enumerate((-0.06, 0.06)):
        cube((0.26, 0.08, 0.02), (0, y, 0.01), soil, bevel=0.004)
        cube((0.27, 0.088, 0.008), (0, y, 0.004), wood)
        for k in range(5):
            blob(0.022, (-0.1 + k * 0.05, y, 0.03), greens[(row + k) % 2], (1, 1, 0.7), seed=120 + row * 5 + k, amount=0.35)


def scarecrow():
    wood = mat('madeira', '#8a5a36', 0.8)
    shirt = mat('espantalho_camisa', '#c0563a', 0.8)
    hat = mat('chapeu', '#d8b25a', 0.8)
    cube((0.012, 0.012, 0.22), (0, 0, 0.11), wood)
    cube((0.16, 0.012, 0.012), (0, 0, 0.17), wood)
    cube((0.07, 0.03, 0.08), (0, 0, 0.15), shirt, bevel=0.008)
    ico(0.026, (0, 0, 0.215), mat('saco', '#e3d1a6', 0.9), 2, smooth=True)
    cyl(0.05, 0.008, (0, 0, 0.237), hat, 16)
    cyl(0.022, 0.03, (0, 0, 0.255), hat, 12)


def cart():
    """carro de boi: caixa de madeira com duas rodas maciças e cabeçalho"""
    wood = mat('carro', '#9a6a40', 0.85)
    dark = mat('carro_escuro', '#5d3f26', 0.9)
    cube((0.2, 0.12, 0.05), (0, 0, 0.09), wood, bevel=0.004)
    for y in (-0.07, 0.07):
        cyl(0.055, 0.016, (0, y, 0.055), dark, 16, rot=(math.pi / 2, 0, 0))
    cube((0.2, 0.012, 0.012), (0.18, 0, 0.07), dark, (0, 0.15, 0))
    hay = straw_mat('feno_fibra', '#b98a32', '#f0cf78')
    blob(0.06, (0, 0, 0.13), hay, (1.4, 0.9, 0.5), seed=131, amount=0.3)


def chickens():
    body = [mat('galinha_branca', '#f4efe6', 0.8), mat('galinha_ruiva', '#c4733a', 0.8)]
    comb = mat('crista', '#d63a2a', 0.6)
    beak = mat('bico', '#e8a83a', 0.6)
    for i, (x, y, rz) in enumerate([(-0.05, 0.0, 0.4), (0.05, 0.03, -0.6), (0.0, -0.05, 2.2)]):
        b = body[i % 2]
        o = ico(0.03, (x, y, 0.035), b, 2, (1.3, 1, 0.95), smooth=True)
        o.rotation_euler.z = rz
        hx, hy = x + math.cos(rz) * 0.03, y + math.sin(rz) * 0.03
        ico(0.016, (hx, hy, 0.062), b, 2, smooth=True)
        ico(0.008, (hx, hy, 0.078), comb, 1)
        ico(0.006, (hx + math.cos(rz) * 0.015, hy + math.sin(rz) * 0.015, 0.06), beak, 1)


def rock_b():
    st = foliage('pedra2', '#8a8274', '#cfc6b6')
    for i, (x, y, r, sc) in enumerate([(0, 0, 0.06, (1.6, 1.1, 0.35)), (0.08, -0.03, 0.04, (1.3, 1, 0.5)), (-0.07, 0.02, 0.035, (1.2, 1, 0.6))]):
        ico(r, (x, y, r * sc[2] * 0.6), st, 2, sc)


def log():
    bark = mat('tronco', '#6b4a2e', 0.9)
    ring = mat('anel_tronco', '#d8b07a', 0.8)
    cyl(0.03, 0.22, (0, 0, 0.03), bark, 10, rot=(0, math.pi / 2, 0.4), smooth=True)
    cyl(0.031, 0.004, (0.1 * math.cos(0.4), 0.1 * math.sin(0.4), 0.03), ring, 10, rot=(0, math.pi / 2, 0.4))
    cyl(0.035, 0.05, (-0.12, -0.06, 0.025), bark, 10, smooth=True)
    cyl(0.036, 0.004, (-0.12, -0.06, 0.051), ring, 10)


def house_rustic():
    """casinha de taipa: parede ocre, telhado de palha, varanda com esteios"""
    wall = mat('taipa', '#f3eadb', 0.9)
    straw = straw_mat('palha_fibra', '#9a7434', '#d9b468')
    wood = mat('madeira', '#8a5a36', 0.8)
    gable_house(0.22, 0.16, 0.12, 0.085, wall, straw, over=0.03, tiles=True)
    cube((0.23, 0.17, 0.03), (0, 0, 0.015), mat('barrado', '#c47a45', 0.9))
    cube((0.05, 0.006, 0.08), (-0.05, -0.088, 0.04), mat('porta', '#7a4a2a', 0.8))
    cube((0.04, 0.006, 0.035), (0.05, -0.083, 0.065), mat('janela_escura', '#3a2a20', 0.9))
    for x in (-0.13, 0.13):
        cube((0.012, 0.012, 0.07), (x, -0.1, 0.035), wood)
    cube((0.27, 0.012, 0.01), (0, -0.1, 0.07), wood)


def capybara():
    fur = foliage('capivara', '#6e4a2c', '#a87a4e')
    dark = mat('capivara_focinho', '#3a2618', 0.9)
    for i, (x, y, rz) in enumerate([(-0.04, 0.0, 0.25), (0.07, 0.04, -0.4)]):
        sc = 1.0 if i == 0 else 0.75
        o = ico(0.06 * sc, (x, y, 0.05 * sc), fur, 3, (1.55, 1, 0.9), smooth=True)
        o.rotation_euler.z = rz
        hx, hy = x + math.cos(rz) * 0.09 * sc, y + math.sin(rz) * 0.09 * sc
        h = ico(0.035 * sc, (hx, hy, 0.065 * sc), fur, 2, (1.5, 1, 1.1), smooth=True)
        h.rotation_euler.z = rz
        ico(0.012 * sc, (hx + math.cos(rz) * 0.045 * sc, hy + math.sin(rz) * 0.045 * sc, 0.062 * sc), dark, 1)
        for e in (-1, 1):
            ico(0.008 * sc, (hx - math.sin(rz) * 0.022 * sc * e, hy + math.cos(rz) * 0.022 * sc * e, 0.098 * sc), dark, 1)


def egret():
    """garça-branca parada na beira da água"""
    white = mat('garca', '#fbfbf6', 0.6)
    beak = mat('garca_bico', '#e8b53a', 0.5)
    leg = mat('garca_perna', '#2a2a26', 0.8)
    for x in (-0.012, 0.012):
        cyl(0.004, 0.11, (x, 0, 0.055), leg, 4)
    ico(0.035, (0, 0, 0.13), white, 2, (1.5, 0.9, 0.85), smooth=True)
    cyl(0.009, 0.1, (0.035, 0, 0.18), white, 6, 0.007, rot=(0, math.radians(-25), 0), smooth=True)
    ico(0.016, (0.055, 0, 0.23), white, 2, (1.3, 1, 1), smooth=True)
    cyl(0.005, 0.06, (0.09, 0, 0.228), beak, 5, 0.0, rot=(0, math.radians(95), 0))


def loboguara():
    """lobo-guará: pelo laranja, patas longas e pretas, orelhas grandes, crina escura"""
    fur = foliage('lobo', '#b8531e', '#ee9a4a')
    black = mat('lobo_preto', '#1f1a16', 0.9)
    white = mat('lobo_branco', '#f3ead8', 0.8)
    ico(0.05, (0, 0, 0.17), fur, 3, (1.8, 0.85, 0.85), smooth=True)
    for x, y in [(-0.06, -0.025), (-0.06, 0.025), (0.06, -0.025), (0.06, 0.025)]:
        cyl(0.009, 0.15, (x, y, 0.075), black, 6, 0.007)
    cyl(0.02, 0.07, (0.1, 0, 0.2), fur, 8, 0.016, rot=(0, math.radians(-50), 0), smooth=True)
    ico(0.03, (0.13, 0, 0.235), fur, 2, (1.4, 0.9, 0.9), smooth=True)
    cyl(0.011, 0.04, (0.17, 0, 0.23), black, 6, 0.004, rot=(0, math.radians(100), 0))
    for e in (-1, 1):
        cyl(0.014, 0.05, (0.12, e * 0.016, 0.27), black, 4, 0.0, rot=(e * 0.25, 0, 0))
    cube((0.08, 0.012, 0.02), (0.01, 0, 0.215), black, bevel=0.004)
    cyl(0.016, 0.1, (-0.11, 0, 0.17), fur, 6, 0.01, rot=(0, math.radians(-120), 0), smooth=True)
    ico(0.014, (-0.15, 0, 0.13), white, 1)


# ---------------------------------------------------------------- v1.3: ovelhas, cercado, vila que cresce

def sheep(pose=0):
    """ovelha: corpo de lã feito de muitos tufos, cara e patas pretas; pose 0 cabeça erguida, 1 pastando"""
    wool = mat('la', '#f4efe4', 0.98)
    wool2 = mat('la_sombra', '#d9d1c2', 0.98)
    black = mat('ovelha_preto', '#2a2420', 0.8)
    rnd = random.Random(41 + pose)
    for i in range(46):
        u = rnd.uniform(-1, 1)
        th = rnd.uniform(0, math.tau)
        q = math.sqrt(1 - u * u)
        x, y, z = q * math.cos(th) * 0.075, q * math.sin(th) * 0.045, u * 0.042
        if z < -0.03:
            continue
        ico(rnd.uniform(0.018, 0.026), (x, y, 0.1 + z), wool if z > -0.005 else wool2, 2, smooth=True)
    for x, y in [(-0.045, -0.022), (-0.045, 0.022), (0.045, -0.022), (0.045, 0.022)]:
        cyl(0.007, 0.075, (x, y, 0.0375), black, 6, 0.006)
    hx, hz = (0.09, 0.13) if pose == 0 else (0.1, 0.045)
    hd = ico(0.024, (hx, 0, hz), black, 2, (1.5, 0.95, 1.0), smooth=True)
    hd.rotation_euler.y = math.radians(-25 if pose == 0 else 55)
    ico(0.016, (hx - 0.022, 0, hz + 0.018), wool, 2, smooth=True)
    for e in (-1, 1):
        ear = ico(0.01, (hx - 0.006, e * 0.026, hz + 0.004), black, 1, (1.8, 0.7, 0.5))
        ear.rotation_euler.z = e * 0.6


def pen():
    """cercado de madeira com cocho de água"""
    wood = mat('cerca', '#8a6040', 0.85)
    W, D = 0.46, 0.3
    for x in [-W / 2 + k * W / 4 for k in range(5)]:
        for y in (-D / 2, D / 2):
            cube((0.014, 0.014, 0.085), (x, y, 0.0425), wood, bevel=0.002)
    for y in (-D / 2, D / 2):
        for z in (0.035, 0.07):
            cube((W, 0.008, 0.012), (0, y - 0.004, z), wood)
    for x in (-W / 2, W / 2):
        for yy in (-D / 4, D / 4):
            cube((0.014, 0.014, 0.085), (x, yy, 0.0425), wood, bevel=0.002)
        for z in (0.035, 0.07):
            cube((0.008, D, 0.012), (x, 0, z), wood)
    cube((0.1, 0.035, 0.03), (0.12, 0.06, 0.015), mat('cocho', '#6e4a2c', 0.9), bevel=0.003)
    cube((0.088, 0.024, 0.004), (0.12, 0.06, 0.03), mat('agua_cocho', '#3c7d92', 0.15))


def sobrado(wall='#f3e3c3', roof='#c75b3a', trim='#2f6aa3'):
    """sobrado de dois andares com sacada, cunhais e telhado de telha"""
    wm = mat(f'sobrado{wall}', wall, 0.8)
    rf = mat(f'telhado{roof}', roof, 0.75)
    tr = mat(f'friso{trim}', trim, 0.6)
    w, d, h = 0.28, 0.19, 0.25
    gable_house(w, d, h, 0.085, wm, rf)
    cube((w + 0.006, d + 0.006, 0.026), (0, 0, 0.013), mat('rodape', '#d9c8a8', 0.9))
    for sx in (-1, 1):
        cube((0.016, 0.016, h), (sx * w / 2, -d / 2, h / 2), tr)
    glow = mat('janela', '#ffd46a', 0.5, emit='#ffc94d', strength=2.2)
    fy = -d / 2 - 0.004
    for x in (-0.08, 0.0, 0.08):
        cube((0.036, 0.006, 0.045), (x, fy, h * 0.33), glow)
        cube((0.036, 0.006, 0.055), (x, fy, h * 0.78), glow)
        for sx in (-1, 1):
            cube((0.012, 0.007, 0.05), (x + sx * 0.026, fy, h * 0.33), tr)
    cube((0.05, 0.007, 0.075), (0.0, fy - 0.001, 0.0375), mat('porta', '#7a4a2a', 0.8))
    cube((w * 0.8, 0.05, 0.01), (0, -d / 2 - 0.025, h * 0.6), tr)
    for k in range(9):
        cube((0.005, 0.005, 0.04), (-w * 0.38 + k * w * 0.095, -d / 2 - 0.048, h * 0.6 + 0.02), tr)
    cube((w * 0.8, 0.005, 0.005), (0, -d / 2 - 0.048, h * 0.6 + 0.04), tr)


def venda():
    """venda de esquina: toldo listrado, sacos e caixotes na porta"""
    wall = mat('venda', '#f6e9cf', 0.8)
    gable_house(0.24, 0.17, 0.14, 0.08, wall, mat('telhado#b8693f', '#b8693f', 0.75))
    red, white = mat('toldo_v', '#cf4a34', 0.7), mat('toldo_b', '#fbf4e6', 0.7)
    for k in range(6):
        cube((0.04, 0.07, 0.006), (-0.1 + k * 0.04, -0.12, 0.12), red if k % 2 == 0 else white, (math.radians(-22), 0, 0))
    cube((0.07, 0.006, 0.09), (0, -0.087, 0.045), mat('porta_venda', '#2f6aa3', 0.7))
    sack = straw_mat('saco_fibra', '#cdb489', '#efe0bd')
    for x in (-0.09, -0.06):
        ico(0.022, (x, -0.13, 0.022), sack, 2, (1, 1, 1.2), smooth=True)
    cube((0.04, 0.04, 0.035), (0.09, -0.13, 0.0175), mat('caixote', '#9a6a40', 0.85), bevel=0.003)
    cube((0.035, 0.035, 0.03), (0.095, -0.13, 0.05), mat('caixote', '#9a6a40', 0.85), bevel=0.003)


def coreto():
    """coreto de praça: plataforma octogonal, colunas finas, telhado em ponta"""
    white = mat('coreto', '#fbf7ee', 0.7)
    blue = mat('coreto_azul', '#3f7fae', 0.6)
    rf = mat('coreto_telhado', '#d06a42', 0.7)
    cyl(0.17, 0.05, (0, 0, 0.025), white, 8, rot=(0, 0, math.pi / 8))
    cyl(0.175, 0.012, (0, 0, 0.052), blue, 8, rot=(0, 0, math.pi / 8))
    for k in range(8):
        a = k * math.pi / 4 + math.pi / 8
        cyl(0.008, 0.16, (math.cos(a) * 0.15, math.sin(a) * 0.15, 0.13), white, 6)
    cyl(0.19, 0.016, (0, 0, 0.215), blue, 8, rot=(0, 0, math.pi / 8))
    cyl(0.2, 0.11, (0, 0, 0.275), rf, 8, 0.0, rot=(0, 0, math.pi / 8))
    ico(0.014, (0, 0, 0.34), mat('igreja_ouro', '#e0b040', 0.35), 2, smooth=True)


# ---------------------------------------------------------------- partículas

def _flat(name, outline, m, bend=0.0, cup=0.0, thick=0.004):
    """forma plana (folha, pétala, asa) a partir de um contorno 2D, com curvatura e espessura leves"""
    n = len(outline)
    verts = [(0.0, 0.0, cup)]
    for (x, y) in outline:
        verts.append((x, y, bend * x * x + cup * 0.0))
    faces = [(0, i + 1, (i + 1) % n + 1) for i in range(n)]
    o = mesh(name, verts, faces, m)
    sol = o.modifiers.new('espessura', 'SOLIDIFY')
    sol.thickness = thick
    sub = o.modifiers.new('suave', 'SUBSURF')
    sub.levels = 2
    for poly in o.data.polygons:
        poly.use_smooth = True
    return o


def _leaf_outline(L=0.13, W=0.05, n=24, tip=1.6):
    pts = []
    for i in range(n):
        t = i / n * math.tau
        x = math.cos(t) * L / 2
        w = W / 2 * math.sin(t) * (1 - 0.35 * (math.cos(t) > 0) * abs(math.cos(t)) ** tip)
        pts.append((x, w))
    return pts


def p_sparkle():
    m = mat('brilho', '#fff6c8', emit='#ffe27a', strength=4.0)
    pts = []
    for i in range(16):                         # estrela de 4 pontas longas e 4 curtas
        a = i / 16 * math.tau + math.pi / 2
        r = (0.16 if i % 4 == 0 else 0.07) if i % 2 == 0 else 0.02
        pts.append((math.cos(a) * r, math.sin(a) * r))
    o = _flat('estrela', pts, m, thick=0.002)
    o.modifiers['suave'].levels = 0
    o.rotation_euler = (math.pi / 2 - ELEV, 0, 0)


def _leaf(dark, light, rib):
    m = foliage('folha_' + dark, dark, light)
    o = _flat('folha', _leaf_outline(), m, bend=1.6)
    cyl(0.0025, 0.12, (0, 0, 0.004), mat('nervura_' + rib, rib, 0.8), 5, 0.001, rot=(0, math.radians(90), 0))
    cyl(0.003, 0.03, (-0.075, 0, 0.004), mat('cabo_' + rib, rib, 0.8), 5, 0.002, rot=(0, math.radians(90), 0))
    for ob in bpy.context.scene.objects:
        if ob.type == 'MESH' and ob is not o and ob.location.z < 0.05:
            ob.parent = o
    o.rotation_euler = (math.radians(40), math.radians(-15), math.radians(28))


def p_leaf():
    _leaf('#3f8f3a', '#8cd068', '#2f6a2a')


def p_leaf2():
    _leaf('#7d9a2a', '#d6d65a', '#5f7420')


def p_leaf3():
    _leaf('#a8541c', '#f0a44a', '#7a3a14')


def _petal(dark, light):
    m = foliage('petala_' + dark, dark, light)
    pts = []
    for i in range(28):                          # pétala de ipê: base estreita, ponta larga e ondulada
        t = i / 28 * math.tau
        r = 0.11 * (0.5 + 0.5 * math.cos(t)) ** 0.7 * (1 + 0.07 * math.cos(5 * t))
        pts.append((math.cos(t) * r, math.sin(t) * r * 0.8))
    o = _flat('petala', pts, m, bend=-1.0, cup=0.0, thick=0.003)
    o.rotation_euler = (math.pi / 2 - ELEV + math.radians(15), math.radians(10), math.radians(25))


def p_petal():
    _petal('#b2457c', '#f6a8cf')


def p_petal2():
    _petal('#c99a12', '#ffe36a')


def p_petal3():
    _petal('#a9a1ac', '#fffafd')


def p_drop():
    m = mat('gota', '#5cc6ee', rough=0.05, trans=0.45)
    ico(0.06, (0, 0, 0), m, 4, (0.9, 0.9, 1.0), smooth=True)
    cyl(0.054, 0.12, (0, 0, 0.065), m, 24, 0.0, smooth=True)
    ico(0.014, (-0.02, -0.04, 0.02), mat('gota_brilho', '#ffffff', emit='#ffffff', strength=3.0), 2, smooth=True)


def p_puff():
    m = foliage('fumaca', '#d9d0bf', '#fffaf0')
    import random
    R = random.Random(4)
    for i in range(8):
        a = i / 8 * math.tau
        r = 0.045 + R.random() * 0.03
        blob(r, (math.cos(a) * 0.06, math.sin(a) * 0.03, R.random() * 0.05), m, seed=i + 20, amount=0.3)
    blob(0.075, (0, 0, 0.03), m, seed=30, amount=0.25)


def _butterfly(col, edge, name):
    base = mat('asa_' + name, col, 0.55)
    dark = mat('borda_' + name, edge, 0.7)
    fore = [(0.0, 0.0), (0.05, 0.02), (0.11, 0.075), (0.115, 0.1), (0.06, 0.1), (0.02, 0.06)]
    hind = [(0.0, 0.0), (0.02, -0.01), (0.08, -0.03), (0.09, -0.07), (0.05, -0.085), (0.015, -0.04)]
    for s in (-1, 1):
        for shape, z in ((fore, 0.0), (hind, 0.0)):
            outer = [(x * s * 1.0, y) for x, y in shape]
            inner = [(x * s * 0.78 + 0.004 * s, y * 0.78) for x, y in shape]
            o1 = _flat('asa', outer, dark, thick=0.002)
            o2 = _flat('asa_in', inner, base, thick=0.002)
            o2.location.z = 0.0015
            for o in (o1, o2):
                o.rotation_euler = (0, s * math.radians(-25), 0)
    cyl(0.007, 0.09, (0, 0, 0.0), mat('corpo', '#2a2018'), 6, rot=(math.radians(90), 0, 0))
    for o in bpy.context.scene.objects:
        if o.type == 'MESH':
            o.rotation_euler.x += math.radians(55)


def p_butterfly():
    _butterfly('#ffae2e', '#2a1a10', 'laranja')


def p_butterfly2():
    _butterfly('#3a8fe0', '#14243a', 'azul')


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
    # v1.2
    'tree_d': lambda: tree_round_more(3), 'tree_e': lambda: tree_round_more(4),
    'pequi': pequi, 'lobeira': lobeira, 'ipe_white': lambda: ipe('#8f8a92', '#fbf3f6', 'ipe_branco'),
    'canela': canela, 'tuft_gold': tuft_gold, 'sunflower': sunflower, 'corn': corn,
    'fence': fence, 'well': well, 'garden': garden, 'scarecrow': scarecrow, 'cart': cart, 'chickens': chickens,
    'rock_b': rock_b, 'log': log, 'house_d': house_rustic, 'house_c_terra': lambda: house(2, '#b8693f', '#3f8a5a'),
    'capybara': capybara, 'egret': egret, 'loboguara': loboguara,
    # v1.3
    'sheep_a': lambda: sheep(0), 'sheep_b': lambda: sheep(1), 'pen': pen,
    'sobrado': sobrado, 'sobrado_b': lambda: sobrado('#e8eef0', '#a8503a', '#3f8a5a'), 'venda': venda, 'coreto': coreto,
}
# versões de seca das árvores (copa rala, cor de palha e ferrugem): SECAS=1
SECAS = ['tree_a', 'tree_b', 'tree_c', 'tree_d', 'tree_e', 'cerrado_tree', 'pequi', 'lobeira', 'bush']
FX = {'sparkle': p_sparkle, 'leaf': p_leaf, 'leaf2': p_leaf2, 'leaf3': p_leaf3, 'drop': p_drop, 'puff': p_puff,
      'petal': p_petal, 'petal2': p_petal2, 'petal3': p_petal3, 'butterfly': p_butterfly, 'butterfly2': p_butterfly2}


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
    if os.environ.get('SECAS') == '1':
        globals()['DRYV'] = True
        for n in SECAS:
            if only and n + '_seco' not in only.split(','):
                continue
            meta[n + '_seco'] = render(n + '_seco', OBJECTS[n], OBJ_PX, OBJ_SCALE, 0.24)
            print('ok', n + '_seco', flush=True)
        globals()['DRYV'] = False
    for n, b in FX.items():
        if only and 'fx_' + n not in only.split(','):
            continue
        meta['fx_' + n] = render('fx_' + n, b, FX_PX, FX_SCALE, 0.0, floor=False)
        print('ok fx', n, flush=True)
    with open(meta_path, 'w') as f:
        json.dump(meta, f, indent=1)
