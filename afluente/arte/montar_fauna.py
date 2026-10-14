"""Monta o atlas da fauna (v1.4) a partir dos quadros de fauna.py.
Uso: venv/bin/python montar_fauna.py fauna_saida/ fauna.webp fauna.json

- Todos os quadros de um bicho são recortados pela mesma caixa (a união das caixas), então a âncora (o ponto do
  chão) fica no mesmo lugar em todos os quadros e a animação não treme.
- Escala 0,8 (cerca de 258 px por unidade, nítido mesmo no zoom) e WebP com transparência.
- JSON: {"nome_anim_i": [x, y, w, h, âncora x, âncora y, px por unidade], "_estilo": {bicho: "chao"|"poleiro"|"pula"}}"""
import json, sys
from PIL import Image

src, out_img, out_json = sys.argv[1:4]
K = 0.8
meta = json.load(open(f'{src}/meta.json'))
styles = meta.pop('_estilo', {})
groups = {}
for name in meta:
    groups.setdefault(name.split('_')[0], []).append(name)
items = []
for animal, names in groups.items():
    ims = {}
    box = None
    for n in names:
        im = Image.open(f'{src}/{n}.png').convert('RGBA')
        px = im.load()
        for y in range(im.height):
            for x in range(im.width):
                if px[x, y][3] < 20:
                    px[x, y] = (0, 0, 0, 0)
        b = im.getbbox()
        box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
        ims[n] = im
    for n in sorted(names):
        m = meta[n]
        c = ims[n].crop(box)
        c = c.resize((max(1, round(c.width * K)), max(1, round(c.height * K))), Image.LANCZOS)
        items.append((n, c, (m['ax'] - box[0]) * K, (m['ay'] - box[1]) * K, m['unit'] * K))
W, x, y, row, pos = 1024, 1, 1, 0, {}
items.sort(key=lambda t: (-t[1].height, t[0]))
for n, c, ax, ay, u in items:
    if x + c.width + 1 > W:
        x, y, row = 1, y + row + 1, 0
    pos[n] = (x, y)
    x += c.width + 1
    row = max(row, c.height)
H = y + row + 1
atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
out = {'_estilo': styles}
for n, c, ax, ay, u in items:
    atlas.alpha_composite(c, pos[n])
    out[n] = [pos[n][0], pos[n][1], c.width, c.height, round(ax, 1), round(ay, 1), round(u, 2)]
atlas.save(out_img, 'WEBP', quality=88, method=6)
json.dump(out, open(out_json, 'w'), separators=(',', ':'))
print(atlas.size)
