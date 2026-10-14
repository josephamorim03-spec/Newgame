"""Recorta os sprites renderizados, cria as versões secas e monta um atlas PNG + metadados JSON.
Uso: python montar_atlas.py <pasta_sprites> <saida_png> <saida_json>

Versão seca ("nome~d"): plantas ficam menores, desbotadas e puxadas para o palha; construções só desbotam.
Assim cada modelo existe nos dois estados sem renderizar duas vezes."""
import json, sys
from PIL import Image

PLANTS = {'tree_a', 'tree_b', 'tree_c', 'pine', 'ipe_yellow', 'ipe_pink', 'buriti', 'bush', 'cerrado_tree', 'wheat', 'tuft', 'flowers', 'reeds'}


def dry(im, plant):
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            l = 0.3 * r + 0.59 * g + 0.11 * b
            k = 0.72 if plant else 0.4          # quanto perde de cor
            r2, g2, b2 = (r * (1 - k) + l * k, g * (1 - k) + l * k, b * (1 - k) + l * k)
            if plant:                           # palha: puxa para o ocre
                r2, g2, b2 = r2 * 1.08 + 12, g2 * 0.98 + 6, b2 * 0.72
            px[x, y] = (min(255, int(r2)), min(255, int(g2)), min(255, int(b2)), a)
    if plant:
        im = im.resize((max(1, int(im.width * 0.8)), max(1, int(im.height * 0.8))), Image.LANCZOS)
    return im

src, out_png, out_json = sys.argv[1:4]
# versões secas: desde a v1.2 a secura é um campo contínuo desenhado por cima do vale, então o atlas não precisa
# mais delas (SECOS=1 volta a gerar)
import os
SECOS = os.environ.get('SECOS') == '1'
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
    if SECOS and not name.startswith('fx_'):
        plant = name in PLANTS
        d = dry(crop.copy(), plant)
        f = 0.8 if plant else 1.0
        items.append((name + '~d', d, (m['ax'] - box[0]) * f, (m['ay'] - box[1]) * f, m['unit'] * f))
items.sort(key=lambda t: -t[1].height)
W, x, y, row, pos = 1024, 1, 1, 0, {}
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
