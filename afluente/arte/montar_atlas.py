"""Recorta os sprites renderizados e monta um atlas PNG + metadados JSON.
Uso: python montar_atlas.py <pasta_sprites> <saida_png> <saida_json>"""
import json, sys
from PIL import Image

src, out_png, out_json = sys.argv[1:4]
meta = json.load(open(f'{src}/meta.json'))
items = []
for name, m in meta.items():
    im = Image.open(f'{src}/{name}.png').convert('RGBA')
    px = im.load()
    for y in range(im.height):            # tira o véu de sombra quase invisível do chão
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a < 26:
                px[x, y] = (0, 0, 0, 0)
    box = im.getbbox()
    crop = im.crop(box)
    items.append((name, crop, m['ax'] - box[0], m['ay'] - box[1], m['unit']))
items.sort(key=lambda t: -t[1].height)
W, x, y, row, pos = 640, 1, 1, 0, {}
for name, crop, ax, ay, unit in items:
    if x + crop.width + 1 > W:
        x, y, row = 1, y + row + 1, 0
    pos[name] = (x, y)
    x += crop.width + 1
    row = max(row, crop.height)
H = y + row + 1
atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
out = {}
for name, crop, ax, ay, unit in items:
    px_, py_ = pos[name]
    atlas.alpha_composite(crop, (px_, py_))
    out[name] = [px_, py_, crop.width, crop.height, round(ax, 1), round(ay, 1), unit]
atlas.save(out_png, optimize=True)
json.dump(out, open(out_json, 'w'), separators=(',', ':'))
print(atlas.size)
