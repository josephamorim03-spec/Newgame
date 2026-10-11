#!/usr/bin/env python3
"""Conserta os dados dos quadros da história trocando só as bolinhas: o dado da arte fica (o desenho, o contorno, a cor, o
tom de cada face) e as bolinhas erradas viram as certas. O gerador de imagem erra o arranjo (3 em "L", 5 torto, face
lisa, faces vizinhas somando 7), e o dado é o coração do jogo.

    python3 tools/historia/dados_quadros.py              # todos os quadros com "dados" em arte/historia.json
    python3 tools/historia/dados_quadros.py p-mesa c6-la # só estes
    python3 tools/historia/dados_quadros.py --conferir   # só valida as anotações (dado possível?), não mexe em nada

Para cada dado (em arte/historia.json, "dados": {"caixa": [x0, y0, x1, y1] em % da imagem, "faces": {"t", "e", "d"}}):
1. as bolinhas da arte somem: manchas compactas e redondas que destoam da face (escuras ou claras) viram a cor da face;
2. as faces de verdade são achadas na arte: as regiões da cor do dado separadas pelas arestas de tinta (cada uma vira um
   quadrilátero, o casco dela); a de cima é o topo, as outras a frente (ou o lado esquerdo) e o lado direito;
3. as bolinhas certas são desenhadas em cada face, na perspectiva dela, na cor das bolinhas antigas.
Só mexe num dado quando as faces achadas são confiáveis (cada região preenche o quadrilátero dela, os quadriláteros não se
cruzam e cobrem o dado); senão o dado fica como a arte e ganha "conferido": false, à espera do tools/historia/dados_ia.py.
Faces vizinhas não somam 7 e a ordem do 1, 2, 3 em volta do canto é a de um dado de verdade: o --conferir recusa um dado
impossível; sem "faces", a ferramenta escolhe uma posição possível e grava.
Quando houver crédito na API, tools/historia/dados_ia.py faz o mesmo pelo gerador (recorte, variações, encaixe).
A arte original fica em arte/historia/quadros/originais/<id>.webp (a ferramenta parte sempre dela), e a conferência (as
faces achadas em magenta) em builds/dados/<id>.png.
"""
import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))

RAIZ = Path(__file__).resolve().parents[2]
PEDIDOS = RAIZ / "arte" / "historia.json"
QUADROS = RAIZ / "arte" / "historia" / "quadros"
ORIGINAIS = QUADROS / "originais"
CONFERIR = RAIZ / "builds" / "dados"
ACEITOS = RAIZ / "arte" / "historia" / "dados_ia"     # os dados redesenhados pelo gerador e aceitos (tools/historia/dados_ia.py)
PIPS = {1: [(.5, .5)], 2: [(.25, .25), (.75, .75)], 3: [(.25, .25), (.5, .5), (.75, .75)],
        4: [(.25, .25), (.75, .25), (.25, .75), (.75, .75)], 5: [(.25, .25), (.75, .25), (.5, .5), (.25, .75), (.75, .75)],
        6: [(.27, .23), (.27, .5), (.27, .77), (.73, .23), (.73, .5), (.73, .77)]}


# ---------- o dado possível ----------
def orientacoes():
    """as 24 posições de um dado de verdade: (topo, lado esquerdo visível, lado direito visível)"""
    base = {(0, 0, 1): 1, (0, 0, -1): 6, (0, -1, 0): 2, (0, 1, 0): 5, (1, 0, 0): 3, (-1, 0, 0): 4}
    rx = lambda v: (v[0], -v[2], v[1])
    rz = lambda v: (-v[1], v[0], v[2])
    vistos, fila = set(), [base]
    while fila:
        d = fila.pop()
        chave = tuple(sorted(d.items()))
        if chave in vistos:
            continue
        vistos.add(chave)
        fila += [{r(k): v for k, v in d.items()} for r in (rx, rz)]
    return {(dict(c)[(0, 0, 1)], dict(c)[(0, -1, 0)], dict(c)[(1, 0, 0)]) for c in vistos}


VALIDAS = orientacoes()


def escolher_faces(id_, n):
    t, e, d = sorted(VALIDAS)[(sum(map(ord, id_)) * 7 + n * 5) % len(VALIDAS)]
    return {"t": t, "e": e, "d": d}


def problema(dado):
    f = dado.get("faces", {})
    lista = list(f.values())
    if len(set(lista)) != len(lista):
        return "duas faces com o mesmo número"
    for i, a in enumerate(lista):
        for b in lista[i + 1:]:
            if a + b == 7:
                return f"{a} e {b} são opostos (somam 7) e não aparecem juntos"
    if {"t", "e", "d"} <= f.keys() and (f["t"], f["e"], f["d"]) not in VALIDAS:
        return f"topo {f['t']}, esquerda {f['e']}, direita {f['d']}: a ordem do canto está espelhada"
    return None


# ---------- geometria ----------
def casco(pontos):
    p = sorted(set(pontos))
    if len(p) < 3:
        return p
    cruz = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    baixo, cima = [], []
    for q in p:
        while len(baixo) >= 2 and cruz(baixo[-2], baixo[-1], q) <= 0:
            baixo.pop()
        baixo.append(q)
    for q in reversed(p):
        while len(cima) >= 2 and cruz(cima[-2], cima[-1], q) <= 0:
            cima.pop()
        cima.append(q)
    return baixo[:-1] + cima[:-1]


def quadrilatero(c):
    """os 4 cantos da face: o quadrilátero de maior área com vértices do casco, em volta do centro, começando no de cima à
    esquerda (A, B, C, D no sentido horário na tela)"""
    if len(c) > 36:
        c = c[::len(c) // 36 + 1]
    area = lambda q: abs(sum(q[i][0] * q[(i + 1) % 4][1] - q[(i + 1) % 4][0] * q[i][1] for i in range(4))) / 2
    n, melhor, mq = len(c), -1, list(c[:4])
    for i in range(n):
        for j in range(i + 1, n):
            for k in range(j + 1, n):
                for l in range(k + 1, n):
                    q = [c[i], c[j], c[k], c[l]]
                    a = area(q)
                    if a > melhor:
                        melhor, mq = a, q
    cx, cy = sum(p[0] for p in mq) / 4, sum(p[1] for p in mq) / 4
    mq.sort(key=lambda p: math.atan2(p[1] - cy, p[0] - cx))
    i = min(range(4), key=lambda k: mq[k][0] + mq[k][1])
    return mq[i:] + mq[:i]


# ---------- a arte ----------
luz = lambda c: .3 * c[0] + .59 * c[1] + .11 * c[2]


def componentes(dentro, x0, y0, x1, y1):
    """regiões ligadas (4 vizinhos) dos pixels em que dentro(i, j) é verdadeiro, dentro da caixa"""
    vistos, regs = set(), []
    for j in range(y0, y1):
        for i in range(x0, x1):
            if (i, j) in vistos or not dentro(i, j):
                continue
            reg, fila = [], [(i, j)]
            vistos.add((i, j))
            while fila:
                a, b = fila.pop()
                reg.append((a, b))
                for q in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                    if q not in vistos and x0 <= q[0] < x1 and y0 <= q[1] < y1 and dentro(*q):
                        vistos.add(q); fila.append(q)
            regs.append(reg)
    return regs


def kmeans1(vals, k):
    cs = sorted(vals)
    centros = [cs[int(len(cs) * (n + .5) / k)] for n in range(k)]
    for _ in range(12):
        grupos = [[] for _ in range(k)]
        for v in vals:
            grupos[min(range(k), key=lambda n: abs(v - centros[n]))].append(v)
        centros = [sum(g) / len(g) if g else centros[n] for n, g in enumerate(grupos)]
    return centros


def achar_faces(im, x0, y0, x1, y1, quantas):
    """as faces: o que não é tinta, dentro do contorno do dado (não encosta na borda da caixa), separado pelas arestas.
    Se as arestas não separam (face com só troca de tom), separa pelo tom."""
    px, (W, H) = im.load(), im.size
    w, h = x1 - x0, y1 - y0
    ox0, oy0, ox1, oy1 = x0, y0, x1, y1                # a caixa marcada; a busca vai um pouco além (a marcação pode cortar o contorno)
    x0, y0, x1, y1 = max(0, x0 - w // 6), max(0, y0 - h // 6), min(W, x1 + w // 6), min(H, y1 + h // 6)
    L = sorted(luz(px[i, j]) for j in range(oy0, oy1, 2) for i in range(ox0, ox1, 2))
    tinta, claro = L[len(L) // 12], L[len(L) * 3 // 4]
    limiar = tinta + (claro - tinta) * .42
    regs = componentes(lambda i, j: luz(px[i, j]) > limiar, x0, y0, x1, y1)
    centro = lambda r: (sum(a for a, _ in r) / len(r), sum(b for _, b in r) / len(r))
    regs = [r for r in regs if w * h * .035 < len(r) < w * h * .9 and ox0 <= centro(r)[0] <= ox1 and oy0 <= centro(r)[1] <= oy1
            and not any(a - x0 < 2 or x1 - 1 - a < 2 or b - y0 < 2 or y1 - 1 - b < 2 for a, b in r[::5])]
    regs.sort(key=len, reverse=True)
    if len(regs) < quantas and regs:                   # as faces ligadas: separa pelo tom
        junto = set(regs[0])
        centros = kmeans1([luz(px[a, b]) for a, b in regs[0][::3]], quantas)
        rot = lambda a, b: min(range(quantas), key=lambda n: abs(luz(px[a, b]) - centros[n]))
        novas = []
        for n in range(quantas):
            novas += [r for r in componentes(lambda i, j: (i, j) in junto and rot(i, j) == n, x0, y0, x1, y1) if len(r) > w * h * .035]
        if len(novas) > 1:
            regs = sorted(novas + regs[1:], key=len, reverse=True)
    return regs[:quantas]


def apagar_bolinhas(im, reg, q):
    """dentro da face (o quadrilátero, um pouco para dentro), o que destoa do tom dela em manchas compactas vira a cor dela;
    devolve as cores das bolinhas apagadas"""
    px, (W, H) = im.load(), im.size
    dentro = ImageDraw.Draw(m := Image.new("L", im.size, 0))
    cx, cy = sum(p[0] for p in q) / 4, sum(p[1] for p in q) / 4
    dentro.polygon([(cx + (p[0] - cx) * 1.02, cy + (p[1] - cy) * 1.02) for p in q], fill=255)
    mp = m.load()
    cores_face = sorted((px[a, b] for a, b in reg[::2]), key=luz)
    face = cores_face[len(cores_face) // 2]
    destoa = lambda c: abs(luz(c) - luz(face)) > 38 or max(abs(c[k] - face[k]) for k in range(3)) > 60
    xs, ys = [p[0] for p in q], [p[1] for p in q]
    bx0, by0, bx1, by1 = int(min(xs)), int(min(ys)), int(max(xs)) + 1, int(max(ys)) + 1
    manchas = componentes(lambda i, j: mp[i, j] and destoa(px[i, j]), bx0, by0, bx1, by1)
    area = (bx1 - bx0) * (by1 - by0)
    cores = []
    for mancha in manchas:
        if len(mancha) < 4 or len(mancha) > area * .09:
            continue
        mx, my = [a for a, _ in mancha], [b for _, b in mancha]
        bw, bh = max(mx) - min(mx) + 1, max(my) - min(my) + 1
        if max(bw, bh) / min(bw, bh) > 3.4 and len(mancha) > 12:
            continue                                   # risco de brilho comprido: fica
        cores += [px[a, b] for a, b in mancha[::2]]
        for a, b in mancha:
            for da in (-1, 0, 1):
                for db in (-1, 0, 1):
                    if 0 <= a + da < W and 0 <= b + db < H and mp[a + da, b + db]:
                        px[a + da, b + db] = face
    return cores


def papeis(regioes):
    """topo, frente/esquerda e direita pela posição dos centros"""
    if not regioes:
        return []
    cs = [(sum(p[0] for p in r) / len(r), sum(p[1] for p in r) / len(r)) for r in regioes]
    if len(regioes) == 1:
        return ["e"]
    if len(regioes) == 3:
        topo = min(range(3), key=lambda k: cs[k][1])
        resto = sorted([k for k in range(3) if k != topo], key=lambda k: cs[k][0])
        out = [None] * 3
        out[topo], out[resto[0]], out[resto[1]] = "t", "e", "d"
        return out
    hs = [max(p[1] for p in r) - min(p[1] for p in r) for r in regioes]
    if abs(cs[0][1] - cs[1][1]) > .35 * max(hs):        # um em cima do outro: topo e frente
        return ["t", "e"] if cs[0][1] < cs[1][1] else ["e", "t"]
    return ["e", "d"] if cs[0][0] < cs[1][0] else ["d", "e"]


def bolinhas(q, v):
    """as bolinhas no quadrilátero (bilinear: A em cima à esquerda, B em cima à direita, C embaixo à direita, D embaixo à esquerda)"""
    a, b, c, d = q
    mapa = lambda u, w: ((1 - u) * (1 - w) * a[0] + u * (1 - w) * b[0] + u * w * c[0] + (1 - u) * w * d[0],
                         (1 - u) * (1 - w) * a[1] + u * (1 - w) * b[1] + u * w * c[1] + (1 - u) * w * d[1])
    r = .1
    return [[mapa(u + r * math.cos(k * math.pi / 16), w + r * math.sin(k * math.pi / 16)) for k in range(32)] for (u, w) in PIPS[v]]


def encaixar(im, dado, aceito):
    """o recorte aceito volta ao lugar dele (o mesmo quadrado do tools/historia/dados_ia.py), mas só a área do dado, com a
    borda esfumada: o resto do recorte não substitui a arte"""
    from dados_ia import recorte
    W, H = im.size
    r = recorte(W, H, dado["caixa"])
    patch = Image.open(aceito).convert("RGB").resize((r[2] - r[0], r[3] - r[1]), Image.LANCZOS)
    x0, y0, x1, y1 = (dado["caixa"][i] / 100 * (W if i % 2 == 0 else H) for i in range(4))
    folga = (x1 - x0) * .12
    mascara = Image.new("L", im.size, 0)
    ImageDraw.Draw(mascara).rounded_rectangle((x0 - folga, y0 - folga, x1 + folga, y1 + folga), radius=folga * 2, fill=255)
    mascara = mascara.filter(ImageFilter.GaussianBlur(folga * .6))
    camada = im.copy()
    camada.paste(patch, r[:2])
    im.paste(camada, (0, 0), mascara)


def consertar(id_, arte):
    ORIGINAIS.mkdir(parents=True, exist_ok=True)
    orig = ORIGINAIS / f"{id_}.webp"
    if not orig.exists():
        orig.write_bytes((QUADROS / f"{id_}.webp").read_bytes())
    im = Image.open(orig).convert("RGB")
    W, H = im.size
    S = 4                                              # desenhado 4x maior e reduzido: borda lisa
    camada = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
    dc = ImageDraw.Draw(camada)
    achadas, poucas = [], []
    ia = []
    for n, dado in enumerate(arte["dados"]):
        dado.setdefault("faces", escolher_faces(id_, n))
        if dado.get("pular"):                           # conferido à mão e recusado: fica como a arte, à espera do dados_ia.py
            dado["conferido"] = False
            continue
        aceito = ACEITOS / f"{id_}-{n + 1}.png"
        if dado.get("ia") and aceito.exists():          # o dado redesenhado pelo gerador (tools/historia/dados_ia.py) entra no lugar
            ia.append((dado, aceito))
            continue
        x0, y0, x1, y1 = (round(v / 100 * (W if i % 2 == 0 else H)) for i, v in enumerate(dado["caixa"]))
        x0, y0, x1, y1 = max(0, x0), max(0, y0), min(W, x1), min(H, y1)
        quantas = 1 if dado.get("vista") == "frente" else 3
        regs = achar_faces(im, x0, y0, x1, y1, quantas)
        # confiança: cada região preenche o quadrilátero dela, os quadriláteros não se cruzam e cobrem o dado
        area = lambda q: abs(sum(q[i][0] * q[(i + 1) % 4][1] - q[(i + 1) % 4][0] * q[i][1] for i in range(4))) / 2
        faces = []
        for reg, papel in zip(regs, papeis(regs)):
            q = quadrilatero(casco(reg))
            faces.append((reg, papel, q, len(reg) / max(1, area(q))))
        mascaras = []
        for _, _, q, _ in faces:
            m = Image.new("1", im.size, 0); ImageDraw.Draw(m).polygon(q, fill=1); mascaras.append(m)
        cruza = any(sum(Image.composite(mascaras[a], Image.new("1", im.size, 0), mascaras[b]).get_flattened_data()) > .12 * min(area(faces[a][2]), area(faces[b][2]))
                    for a in range(len(faces)) for b in range(a + 1, len(faces)))
        cobre = sum(area(f[2]) for f in faces) / max(1, (x1 - x0) * (y1 - y0))
        def paralelogramo(q):                          # lados opostos com comprimento parecido e quase paralelos
            ld = [(q[(i + 1) % 4][0] - q[i][0], q[(i + 1) % 4][1] - q[i][1]) for i in range(4)]
            for a, b in ((ld[0], ld[2]), (ld[1], ld[3])):
                la, lb = math.hypot(*a), math.hypot(*b)
                if min(la, lb) < 1 or max(la, lb) / min(la, lb) > 1.3:
                    return False
                if abs(a[0] * b[1] - a[1] * b[0]) / (la * lb) > math.sin(math.radians(12)):
                    return False
            return True
        # faces vizinhas encostam: cada face tem um canto a poucos pixels de um canto de outra
        lado = math.sqrt(max(1, (x1 - x0) * (y1 - y0)))
        encostam = all(any(min(math.dist(p, r) for r in g[2]) < .12 * lado for p in f[2]) for f in faces for g in faces if g is not f)
        boa = (len(faces) >= min(2, quantas) and all(.72 < f[3] < 1.12 for f in faces) and not cruza and cobre > .38
               and all(paralelogramo(f[2]) for f in faces) and encostam)
        dado["conferido"] = boa
        if not boa:
            poucas.append(n + 1)
            continue
        desenhar, cores = [], []
        for reg, papel, q, _ in faces:
            v = dado["faces"].get(papel)
            if not v:
                continue
            cores += apagar_bolinhas(im, reg, q)
            cx, cy = sum(p[0] for p in q) / 4, sum(p[1] for p in q) / 4
            desenhar.append(([(cx + (p[0] - cx) * .93, cy + (p[1] - cy) * .93) for p in q], v))
        if cores:
            cores.sort(key=luz)
            cor_pip = cores[len(cores) // 2]
        else:
            cor_pip = (64, 40, 48) if luz(im.getpixel(((x0 + x1) // 2, (y0 + y1) // 2))) > 110 else (250, 240, 220)
        for q, v in desenhar:
            for b in bolinhas(q, v):
                dc.polygon([(p[0] * S, p[1] * S) for p in b], fill=tuple(cor_pip[:3]) + (255,))
            achadas.append(q)
    camada = camada.resize((W, H), Image.LANCZOS)
    saida = Image.alpha_composite(im.convert("RGBA"), camada).convert("RGB")
    for dado, aceito in ia:
        encaixar(saida, dado, aceito)
    saida.save(QUADROS / f"{id_}.webp", "WEBP", quality=88, method=6)
    CONFERIR.mkdir(parents=True, exist_ok=True)
    conf = saida.copy()
    d = ImageDraw.Draw(conf)
    for q in achadas:
        d.polygon(q, outline=(255, 0, 255), width=2)
    conf.save(CONFERIR / f"{id_}.png")
    print(f"  {id_}: {len(arte['dados'])} dados, {len(achadas)} faces" + (f"; sem confiança (ficou como a arte): dado {poucas}" if poucas else ""))


def main():
    cfg = json.loads(PEDIDOS.read_text(encoding="utf-8"))
    ids = [a for a in sys.argv[1:] if not a.startswith("--")] or [k for k, v in cfg["artes"].items() if v.get("dados")]
    ruins = [f"{id_}, dado {n + 1}: {erro}" for id_ in ids for n, dado in enumerate(cfg["artes"][id_].get("dados", []))
             if (erro := problema(dado))]
    if ruins:
        sys.exit("Dado impossível:\n  " + "\n  ".join(ruins))
    if "--conferir" in sys.argv:
        return print(f"{len(ids)} quadros, todos os dados possíveis")
    for id_ in ids:
        consertar(id_, cfg["artes"][id_])
    PEDIDOS.write_text(json.dumps(cfg, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
