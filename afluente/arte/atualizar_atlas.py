"""Troca ou acrescenta sprites no atlas já montado, sem renderizar tudo de novo (v1.4).
Uso: venv/bin/python atualizar_atlas.py <pasta_com_meta.json> atlas.png atlas.json
Lê os sprites atuais do atlas, substitui os que estão na pasta (mesmo nome) e reempacota."""
import json, sys
from PIL import Image

src, png, js = sys.argv[1:4]
atlas, A = Image.open(png).convert('RGBA'), json.load(open(js))
items = {}
for n, (x, y, w, h, ax, ay, u) in A.items():
    items[n] = (atlas.crop((x, y, x + w, y + h)), ax, ay, u)
meta = json.load(open(f'{src}/meta.json'))
for n, m in meta.items():
    im = Image.open(f'{src}/{n}.png').convert('RGBA')
    px = im.load()
    for yy in range(im.height):
        for xx in range(im.width):
            if px[xx, yy][3] < 26:
                px[xx, yy] = (0, 0, 0, 0)
    b = im.getbbox()
    items[n] = (im.crop(b), m['ax'] - b[0], m['ay'] - b[1], m['unit'])
order = sorted(items.items(), key=lambda t: -t[1][0].height)
W, x, y, row, pos = 1024, 1, 1, 0, {}
for n, (c, *_r) in order:
    if x + c.width + 1 > W:
        x, y, row = 1, y + row + 1, 0
    pos[n] = (x, y)
    x += c.width + 1
    row = max(row, c.height)
out_im = Image.new('RGBA', (W, y + row + 1), (0, 0, 0, 0))
out = {}
for n, (c, ax, ay, u) in order:
    out_im.alpha_composite(c, pos[n])
    out[n] = [pos[n][0], pos[n][1], c.width, c.height, round(ax, 1), round(ay, 1), u]
out_im.save(png, optimize=True)
json.dump(out, open(js, 'w'), separators=(',', ':'))
print(out_im.size, len(out))
