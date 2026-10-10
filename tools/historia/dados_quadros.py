#!/usr/bin/env python3
"""Conserta os dados nos quadros da história: o gerador de imagem erra o arranjo das bolinhas (3 em "L", 5 torto, face
lisa), e o dado é o coração do jogo. Aqui o dado da arte fica (o desenho, o contorno, o tom de cada face) e só as bolinhas
mudam: as da arte somem na cor da face e as certas são desenhadas na perspectiva de cada face.

    python3 tools/historia/dados_quadros.py              # todos os quadros com "dados" em arte/historia.json
    python3 tools/historia/dados_quadros.py p-mesa c6-la # só estes
    python3 tools/historia/dados_quadros.py --conferir   # só valida as anotações (dado possível?), não mexe em nada

Cada arte com dados tem, em arte/historia.json, "dados": uma lista; cada dado é {"x", "y"} (um ponto dentro dele, em %
da imagem), "vista" ("obliquo": a frente e o lado direito, com o topo; "canto": a quina de frente, os dois lados e o
topo; "frente": uma face só), "faces" ({"t": topo, "e": frente ou lado esquerdo, "d": lado direito}) e, se precisar,
"giro" (graus), "topo" (a fração da altura que é topo), "corte" (onde a frente encontra o lado, na largura) e "caixa"
([x0, y0, x1, y1] em %, quando a caixa achada sozinha não serve: dados encostados, um na frente do outro).
A caixa do dado é achada sozinha: do ponto, anda para cada lado até sair do contorno escuro para o fundo. Faces vizinhas
não somam 7 e, com topo, esquerda e direita, a ordem do 1, 2, 3 em volta do canto é a de um dado de verdade: o
--conferir recusa um dado impossível.
A arte original fica em arte/historia/quadros/originais/<id>.webp (a correção parte sempre dela), e o resultado com a caixa
de cada dado (azul) e as faces (magenta), para conferir, em builds/dados/<id>.png.
"""
import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parents[2]
PEDIDOS = RAIZ / "arte" / "historia.json"
QUADROS = RAIZ / "arte" / "historia" / "quadros"
ORIGINAIS = QUADROS / "originais"
CONFERIR = RAIZ / "builds" / "dados"
MAGENTA = (255, 0, 255)
TINTA = (58, 42, 46)
PIPS = {1: [(.5, .5)], 2: [(.25, .25), (.75, .75)], 3: [(.25, .25), (.5, .5), (.75, .75)],
        4: [(.25, .25), (.75, .25), (.25, .75), (.75, .75)], 5: [(.25, .25), (.75, .25), (.5, .5), (.25, .75), (.75, .75)],
        6: [(.27, .23), (.27, .5), (.27, .77), (.73, .23), (.73, .5), (.73, .77)]}
# ---------- o dado possível ----------
def orientacoes():
    """as 24 posições de um dado de verdade: (topo, lado esquerdo visível, lado direito visível).
    Dado padrão: 1 em cima, 2 de frente para quem olha, 3 à direita."""
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


# ---------- a geometria ----------
def caixa(im, x, y):
    """a caixa do dado: de um ponto dentro dele, anda em cada direção até sair do contorno escuro para o fundo.
    Dentro do dado há linhas escuras entre as faces e as bolinhas; só é fora quando, depois do escuro, vem uma cor que
    não é a do dado (a cor do dado é a do ponto de partida, com folga para o tom de cada face)"""
    px, (W, H) = im.load(), im.size
    escuro = lambda c: sum(c[:3]) < 230
    base = px[x, y]
    if escuro(base):
        base = next(px[x + d, y] for d in range(1, 40) if not escuro(px[x + d, y]))
    do_dado = lambda c: abs((c[0] - c[1]) - (base[0] - base[1])) < 45 and abs((c[1] - c[2]) - (base[1] - base[2])) < 45 and sum(c) > 330

    def anda(dx, dy):
        i, j, viu, n = x, y, False, 0
        while 0 <= i + dx < W and 0 <= j + dy < H and abs(i - x) + abs(j - y) < min(W, H) * .25:
            i, j = i + dx, j + dy
            c = px[i, j]
            if escuro(c):
                viu, n = True, 0
            elif do_dado(c):
                viu, n = False, 0
            elif viu:
                n += 1
                if n > 5:                      # fundo depois do contorno: saiu do dado
                    return i - dx * n, j - dy * n
        return i, j
    return anda(-1, 0)[0], anda(0, -1)[1], anda(1, 0)[0], anda(0, 1)[1]


def trocar_bolinhas(im, x0, y0, x1, y1):
    """some com as bolinhas da arte: manchas escuras soltas dentro do dado (o contorno e as arestas encostam na borda da
    caixa ou são grandes, e ficam) viram a cor da face em volta. Devolve a cor das bolinhas antigas."""
    px, (W, H) = im.load(), im.size
    escuro = lambda c: sum(c[:3]) < 260
    x0, y0, x1, y1 = max(0, x0), max(0, y0), min(W - 1, x1), min(H - 1, y1)
    area = (x1 - x0) * (y1 - y0)
    vistos, cores = set(), []
    for j in range(y0, y1 + 1):
        for i in range(x0, x1 + 1):
            if (i, j) in vistos or not escuro(px[i, j]):
                continue
            mancha, fila, borda = [], [(i, j)], False
            while fila:
                a, b = fila.pop()
                if (a, b) in vistos or not (x0 <= a <= x1 and y0 <= b <= y1) or not escuro(px[a, b]):
                    continue
                vistos.add((a, b)); mancha.append((a, b))
                borda |= a - x0 < 3 or x1 - a < 3 or b - y0 < 3 or y1 - b < 3
                fila += [(a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)]
            if borda or len(mancha) > area * .04 or len(mancha) < 4:
                continue                               # contorno, aresta ou sujeira: fica
            ms = set(mancha)
            anel = [px[a + da, b + db] for a, b in mancha for da, db in ((3, 0), (-3, 0), (0, 3), (0, -3))
                    if (a + da, b + db) not in ms and 0 <= a + da < W and 0 <= b + db < H and not escuro(px[a + da, b + db])]
            if not anel:
                continue
            cores += [px[a, b] for a, b in mancha[::5]]
            fundo = sorted(anel, key=sum)[len(anel) // 2]
            for a, b in mancha:                        # a mancha e um anel fino em volta (a borda suavizada da bolinha)
                for da in (-1, 0, 1):
                    for db in (-1, 0, 1):
                        if 0 <= a + da < W and 0 <= b + db < H:
                            px[a + da, b + db] = fundo
    return sorted(cores, key=sum)[len(cores) // 2] if cores else TINTA


def faces_do_cubo(x0, y0, x1, y1, vista, topo, corte):
    """as faces dentro da caixa, cada uma com os cantos na ordem A, B, C, D (A + u·(B−A) + w·(D−A) é o paralelogramo)"""
    w, h = x1 - x0, y1 - y0
    t, m = topo * h, x0 + corte * w
    if vista == "frente":
        return {"e": [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]}
    if vista == "canto":                       # a quina de frente: a aresta vertical em m
        return {"t": [(x0, y0 + t / 2), (x0 + (x1 - m), y0), (x1, y0 + t / 2), (m, y0 + t)],
                "e": [(x0, y0 + t / 2), (m, y0 + t), (m, y1), (x0, y1 - t / 2)],
                "d": [(m, y0 + t), (x1, y0 + t / 2), (x1, y1 - t / 2), (m, y1)]}
    fundo = w - (m - x0)                       # oblíquo: a frente é um retângulo; o topo e o lado vão para trás e para a direita
    return {"t": [(x0 + fundo, y0), (x1, y0), (m, y0 + t), (x0, y0 + t)],
            "e": [(x0, y0 + t), (m, y0 + t), (m, y1), (x0, y1)],
            "d": [(m, y0 + t), (x1, y0), (x1, y1 - t), (m, y1)]}


def girar(pts, cx, cy, graus):
    a = math.radians(graus)
    return [(cx + (p[0] - cx) * math.cos(a) - (p[1] - cy) * math.sin(a), cy + (p[0] - cx) * math.sin(a) + (p[1] - cy) * math.cos(a)) for p in pts]


def bolinhas(pts, v, papel):
    """as bolinhas no paralelogramo da face; no topo do oblíquo os cantos vêm em outra ordem"""
    if papel == "t":
        a, b, d = pts[3], pts[2], pts[0]       # D, C, A: a beirada da frente é a de baixo
    else:
        a, b, d = pts[0], pts[1], pts[3]
    mapa = lambda u, w: (a[0] + u * (b[0] - a[0]) + w * (d[0] - a[0]), a[1] + u * (b[1] - a[1]) + w * (d[1] - a[1]))
    r = .11
    return [[mapa(u + r * math.cos(k * math.pi / 16), w + r * math.sin(k * math.pi / 16)) for k in range(32)] for (u, w) in PIPS[v]]


# ---------- pintar ----------
def consertar(id_, dados):
    ORIGINAIS.mkdir(parents=True, exist_ok=True)
    orig = ORIGINAIS / f"{id_}.webp"
    if not orig.exists():
        orig.write_bytes((QUADROS / f"{id_}.webp").read_bytes())
    im = Image.open(orig).convert("RGB")
    W, H = im.size
    S = 4                                              # desenhado 4x maior e reduzido: borda lisa
    camada = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
    dc = ImageDraw.Draw(camada)
    caixas, contornos = [], []                      # para a imagem de conferência
    esc = lambda pts: [(p[0] * S, p[1] * S) for p in pts]
    for dado in dados:
        if dado.get("caixa"):
            x0, y0, x1, y1 = [round(v / 100 * (W if i % 2 == 0 else H)) for i, v in enumerate(dado["caixa"])]
        else:
            x0, y0, x1, y1 = caixa(im, round(dado["x"] / 100 * W), round(dado["y"] / 100 * H))
        cor_pip = trocar_bolinhas(im, x0, y0, x1, y1)
        borda = max(2.5, (x1 - x0) * .07)              # o contorno da arte fica; as faces começam por dentro dele
        vista = dado.get("vista", "obliquo")
        faces = faces_do_cubo(x0 + borda, y0 + borda, x1 - borda, y1 - borda, vista, dado.get("topo", .28),
                              dado.get("corte", .5 if vista == "canto" else .7))
        if dado.get("giro"):
            faces = {k: girar(v, (x0 + x1) / 2, (y0 + y1) / 2, dado["giro"]) for k, v in faces.items()}
        for k, pts in faces.items():
            if dado["faces"].get(k):
                for b in bolinhas(pts, dado["faces"][k], k):
                    dc.polygon(esc(b), fill=tuple(cor_pip[:3]) + (255,))
            contornos.append(pts)
        caixas.append((x0, y0, x1, y1))
    camada = camada.resize((W, H), Image.LANCZOS)
    Image.alpha_composite(im.convert("RGBA"), camada).convert("RGB").save(QUADROS / f"{id_}.webp", "WEBP", quality=88, method=6)
    CONFERIR.mkdir(parents=True, exist_ok=True)
    conf = Image.open(QUADROS / f"{id_}.webp").convert("RGB")
    dconf = ImageDraw.Draw(conf)
    for c in caixas:
        dconf.rectangle(c, outline=(0, 200, 255), width=2)
    for pts in contornos:
        dconf.polygon(pts, outline=MAGENTA, width=2)
    conf.save(CONFERIR / f"{id_}.png")
    print(f"  {id_}: {len(dados)} dados")


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
        a = cfg["artes"][id_]
        consertar(id_, a["dados"])


if __name__ == "__main__":
    main()
