"""Embute os atlas no protótipo (v1.4). Uso: python3 embutir.py
- atlas.webp + atlas.json -> const ATLAS=... e atlasImg.src (o atlas.webp sai do atlas.png; ver LEIA.md)
- caixas.json -> const BOX=... (geometria do corpo de cada sprite, v2.0)
- fauna.webp + fauna.json -> const FATLAS=... e faunaImg.src (se existirem)"""
import base64, json, os, re
H = os.path.join(os.path.dirname(__file__), '..', 'prototipo', 'afluente.html')
s = open(H, encoding='utf-8').read()
b64 = lambda p: base64.b64encode(open(p, 'rb').read()).decode()
here = os.path.dirname(__file__)
A = json.load(open(os.path.join(here, 'atlas.json')))
s = re.sub(r'const ATLAS=\{.*?\};', lambda m: 'const ATLAS=' + json.dumps(A, separators=(',', ':')) + ';', s, count=1)
s = re.sub(r'atlasImg\.src="data:image/(png|webp);base64,[^"]*"', lambda m: 'atlasImg.src="data:image/webp;base64,' + b64(os.path.join(here, 'atlas.webp')) + '"', s, count=1)
# geometria exata dos sprites (caixas.py): const BOX=... logo depois do ATLAS
cj = os.path.join(here, 'caixas.json')
if os.path.exists(cj):
    B = 'const BOX=' + json.dumps(json.load(open(cj)), separators=(',', ':')) + ';'
    if re.search(r'const BOX=\{.*?\};', s):
        s = re.sub(r'const BOX=\{.*?\};', lambda m: B, s, count=1)
    else:
        s = re.sub(r'(const ATLAS=\{.*?\};)', lambda m: m.group(1) + '\n' + B, s, count=1)
fj, fw = os.path.join(here, 'fauna.json'), os.path.join(here, 'fauna.webp')
if os.path.exists(fj):
    F = json.load(open(fj))
    s = re.sub(r'const FATLAS=\{.*?\};', lambda m: 'const FATLAS=' + json.dumps(F, separators=(',', ':')) + ';', s, count=1)
    s = re.sub(r'faunaImg\.src="data:image/webp;base64,[^"]*"', lambda m: 'faunaImg.src="data:image/webp;base64,' + b64(fw) + '"', s, count=1)
open(H, 'w', encoding='utf-8').write(s)
print('ok', len(s))
