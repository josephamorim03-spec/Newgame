"""Nuvens do Afluente (v2.0): cúmulos com VOLUME de verdade no Blender (Cycles), vistos pela câmera do jogo
(ortográfica, 52°) e iluminados pelo mesmo sol dos sprites. Cada nuvem é um aglomerado de esferas (metaball:
base mais plana, topo em couve-flor) usado como contorno de um volume com densidade modulada por ruído, então
a borda se desfaz como nuvem e não como bola. Saída: nuvem_0..3.png (512×384, fundo transparente).
Uso: venv/bin/python nuvens.py <pasta>"""
import math, os, random, sys
import bpy

OUT = sys.argv[-1] if len(sys.argv) > 1 and not sys.argv[-1].endswith('.py') else 'nuvens_saida'
os.makedirs(OUT, exist_ok=True)
ELEV = math.radians(52)


def hexcol(h, a=1.0):
    h = h.lstrip('#')
    s = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return (*[c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in s], a)


def scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 48
    sc.cycles.volume_step_rate = 2.0
    sc.cycles.volume_max_steps = 256
    sc.cycles.volume_bounces = 12
    sc.cycles.max_bounces = 16
    sc.cycles.transparent_max_bounces = 16
    sc.cycles.use_denoising = True
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Standard'
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.resolution_x, sc.render.resolution_y = 512, 384
    w = bpy.data.worlds.new('ceu'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = hexcol('#a9c8e0'); bg.inputs[1].default_value = 0.75
    for name, energy, rot, col in [('sol', 3.4, (24, -18, -30), (1.0, 0.95, 0.86)), ('recorte', 0.5, (-55, 10, 160), (0.8, 0.9, 1.0))]:
        ld = bpy.data.lights.new(name, 'SUN'); ld.energy = energy; ld.angle = math.radians(10); ld.color = col
        lo = bpy.data.objects.new(name, ld); lo.rotation_euler = tuple(math.radians(v) for v in rot); sc.collection.objects.link(lo)
    cd = bpy.data.cameras.new('cam'); cd.type = 'ORTHO'; cd.ortho_scale = 3.4
    cam = bpy.data.objects.new('cam', cd); d = 20
    cam.location = (0, -d * math.cos(ELEV), d * math.sin(ELEV) + 0.35); cam.rotation_euler = (math.pi / 2 - ELEV, 0, 0)
    sc.collection.objects.link(cam); sc.camera = cam
    return sc


def cloud_mat(seed):
    m = bpy.data.materials.new(f'nuvem{seed}'); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    vol = nt.nodes.new('ShaderNodeVolumePrincipled')
    vol.inputs['Color'].default_value = hexcol('#ffffff')
    vol.inputs['Anisotropy'].default_value = 0.2
    tc = nt.nodes.new('ShaderNodeTexCoord')
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 3.2; nz.inputs['Detail'].default_value = 8.0
    nz.inputs['Roughness'].default_value = 0.62
    nz.noise_dimensions = '4D'; nz.inputs['W'].default_value = seed * 1.7
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.3; ramp.color_ramp.elements[0].color = (0, 0, 0, 1)
    ramp.color_ramp.elements[1].position = 0.5; ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
    nt.links.new(nz.outputs['Fac'], ramp.inputs['Fac'])
    mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 16.0
    nt.links.new(ramp.outputs['Color'], mul.inputs[0])
    nt.links.new(mul.outputs[0], vol.inputs['Density'])
    nt.links.new(vol.outputs['Volume'], out.inputs['Volume'])
    return m


def cumulus(seed):
    rnd = random.Random(seed)
    mb = bpy.data.metaballs.new('cumulo'); mb.resolution = 0.05; mb.render_resolution = 0.035
    ob = bpy.data.objects.new('cumulo', mb); bpy.context.scene.collection.objects.link(ob)
    n = 26 + rnd.randint(0, 10)
    for i in range(n):
        a = rnd.random() * math.tau; q = math.sqrt(rnd.random())
        x, y = math.cos(a) * q * 0.95, math.sin(a) * q * 0.55
        r = 0.42 * (1.2 - 0.55 * q) * rnd.uniform(0.85, 1.2)
        z = r * 0.55 + (1 - q) * 0.25 * rnd.random()
        el = mb.elements.new(); el.co = (x, y, z); el.radius = r; el.stiffness = 2.2
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.convert(target='MESH')
    me = bpy.context.active_object
    # base achatada: corta o que fica abaixo do chão da nuvem
    for v in me.data.vertices:
        if v.co.z < 0.04:
            v.co.z = 0.04 + (v.co.z - 0.04) * 0.15
    me.data.materials.append(cloud_mat(seed))
    return me


for v in range(4):
    sc = scene()
    cumulus(100 + v * 31)
    sc.render.filepath = os.path.join(OUT, f'nuvem_{v}.png')
    bpy.ops.render.render(write_still=True)
    print('ok nuvem', v, flush=True)
