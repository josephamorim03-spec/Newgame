"""Geometria exata de cada sprite do atlas (v2.0): retângulo do CORPO (sem a sombra assada) e a faixa que toca o chão,
em px do atlas relativos à âncora. Usa a mesma regra de separação de sombra do jogo (splitImg): pixel semitransparente
e escuro é sombra. Saída: caixas.json = {nome: [esq, topo, dir, base, chao_esq, chao_dir]} (esq/topo negativos).
Uso: python3 caixas.py   (lê atlas.png e atlas.json desta pasta)"""
import json, os
from PIL import Image
H = os.path.dirname(os.path.abspath(__file__))
A = json.load(open(os.path.join(H, 'atlas.json')))
im = Image.open(os.path.join(H, 'atlas.png')).convert('RGBA')
px = im.load()
out = {}
for n, (x, y, w, h, ax, ay, u) in A.items():
    if n.startswith('_'):
        continue
    xs, ys, rows = [], [], {}
    for j in range(h):
        for i in range(w):
            r, g, b, a = px[x + i, y + j]
            if a < 60:
                continue
            if a <= 205 and max(r, g, b) < 70:   # sombra
                continue
            xs.append(i); ys.append(j); rows.setdefault(j, []).append(i)
    if not xs:
        continue
    l, t, rr, bb = min(xs), min(ys), max(xs) + 1, max(ys) + 1
    band = [j for j in rows if j >= bb - max(2, (bb - t) * 0.18)]
    gl = min(min(rows[j]) for j in band); gr = max(max(rows[j]) for j in band) + 1
    out[n] = [round(l - ax, 1), round(t - ay, 1), round(rr - ax, 1), round(bb - ay, 1), round(gl - ax, 1), round(gr - ax, 1)]
json.dump(out, open(os.path.join(H, 'caixas.json'), 'w'), separators=(',', ':'))
print(len(out), 'sprites; boi', out.get('cow'), 'cercado', out.get('pen'), 'casa', out.get('house_a_red'))
