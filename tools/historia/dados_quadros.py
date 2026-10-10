#!/usr/bin/env python3
"""Os dados dos quadros da história viram código: o gerador de imagem erra o arranjo das bolinhas (3 em "L", 5 torto, face
lisa), e o dado é o coração do jogo. Esta ferramenta apaga o dado da arte (pinta com o fundo em volta) e completa a
anotação dele; a página do gibi (tools/historia/paginas_modelo.html) desenha por cima o dado do próprio jogo, um cubo com a
skin do dono, as bolinhas certas e o contorno de tinta, no mesmo lugar e acompanhando a câmera dos closes.

    python3 tools/historia/dados_quadros.py              # todos os quadros com "dados" em arte/historia.json
    python3 tools/historia/dados_quadros.py p-mesa c6-la # só estes
    python3 tools/historia/dados_quadros.py --conferir   # só valida as anotações (dado possível?), não mexe em nada

Cada arte com dados tem, em arte/historia.json, "dados": uma lista; cada dado tem "caixa" ([x0, y0, x1, y1] em % da
imagem; sem ela, "x" e "y", um ponto dentro do dado, e a caixa é achada sozinha e gravada), "vista" ("obliquo": a frente e
o lado direito, com o topo; "canto": a quina de frente; "frente": quase só uma face), "faces" ({"t": topo, "e": frente ou
lado esquerdo, "d": lado direito}; sem elas, a ferramenta escolhe uma posição possível e grava), e se precisar "giro"
(graus) e "skin" (senão vale "dados_skin" da arte, ou rosa). Faces vizinhas não somam 7 e a ordem do 1, 2, 3 em volta do
canto é a de um dado de verdade: o --conferir recusa um dado impossível.
A arte original fica em arte/historia/quadros/originais/<id>.webp (a ferramenta parte sempre dela), e a arte sem os dados,
com a caixa de cada um marcada, em builds/dados/<id>.png para conferir.
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parents[2]
PEDIDOS = RAIZ / "arte" / "historia.json"
QUADROS = RAIZ / "arte" / "historia" / "quadros"
ORIGINAIS = QUADROS / "originais"
CONFERIR = RAIZ / "builds" / "dados"


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


def escolher_faces(id_, n):
    """sem números anotados, o dado ganha uma posição possível, diferente de um dado para o outro e sempre a mesma"""
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


# ---------- achar e apagar o dado da arte ----------
def caixa(im, x, y):
    """a caixa do dado: de um ponto dentro dele, anda em cada direção até sair do contorno escuro para o fundo"""
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
                if n > 5:
                    return i - dx * n, j - dy * n
        return i, j
    return anda(-1, 0)[0], anda(0, -1)[1], anda(1, 0)[0], anda(0, 1)[1]


def apagar(im, x0, y0, x1, y1):
    """o dado some: o que, ligado ao meio da caixa, não parece o fundo em volta (a mediana de um anel de fora da caixa), e
    a sombra dele (o fundo mais escuro, embaixo e ao lado) são apagados e preenchidos a partir do fundo mais próximo nas
    quatro direções. A página desenha o dado novo e a sombra dele."""
    px, (W, H) = im.load(), im.size
    m = 4
    anel = [px[min(W - 1, max(0, i)), min(H - 1, max(0, j))] for i in range(x0 - m, x1 + m, 2) for j in (y0 - m, y1 + m)] + \
           [px[min(W - 1, max(0, i)), min(H - 1, max(0, j))] for j in range(y0 - m, y1 + m, 2) for i in (x0 - m, x1 + m)]
    fundo = sorted(anel, key=sum)[len(anel) // 2]
    luz = lambda c: c[0] + c[1] + c[2] + 1
    longe = lambda c: max(abs(c[0] - fundo[0]), abs(c[1] - fundo[1]), abs(c[2] - fundo[2])) > 34
    sombra = lambda c: luz(c) < luz(fundo) - 18 and all(abs(c[k] / luz(c) - fundo[k] / luz(fundo)) < .06 for k in range(3))
    w, h = x1 - x0, y1 - y0
    X0, Y0, X1, Y1 = max(0, x0 - int(w * .18) - 3), max(0, y0 - 3), min(W - 1, x1 + int(w * .08) + 3), min(H - 1, y1 + int(h * .2) + 3)
    marca, fila = set(), [((x0 + x1) // 2, (y0 + y1) // 2)]
    while fila:                                        # o dado e a sombra ligados a ele: a pata ao lado não some
        i, j = fila.pop()
        if (i, j) in marca or not (X0 <= i <= X1 and Y0 <= j <= Y1):
            continue
        c = px[i, j]
        dentro = x0 - 3 <= i <= x1 + 3 and y0 - 3 <= j <= y1 + 3
        if not ((dentro and longe(c)) or sombra(c)):
            continue
        marca.add((i, j))
        fila += [(i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)]
    apagados = set()                                   # e uma borda de 2 pixels em volta, para não sobrar fio do contorno
    for i, j in marca:
        for di in range(-2, 3):
            for dj in range(-2, 3):
                if 0 <= i + di < W and 0 <= j + dj < H:
                    apagados.add((i + di, j + dj))
    novo = {}
    for i, j in apagados:                              # cada pixel: o fundo mais próximo à esquerda, à direita, acima e abaixo, pesado pela distância
        soma, peso = [0, 0, 0], 0
        for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            k = 1
            while (i + di * k, j + dj * k) in apagados:
                k += 1
            a, b = i + di * k, j + dj * k
            if 0 <= a < W and 0 <= b < H:
                c = px[a, b]
                soma = [soma[n] + c[n] / k for n in range(3)]
                peso += 1 / k
        if peso:
            novo[(i, j)] = tuple(round(v / peso) for v in soma)
    for (i, j), cor in novo.items():
        px[i, j] = cor


def consertar(id_, arte):
    ORIGINAIS.mkdir(parents=True, exist_ok=True)
    orig = ORIGINAIS / f"{id_}.webp"
    if not orig.exists():
        orig.write_bytes((QUADROS / f"{id_}.webp").read_bytes())
    im = Image.open(orig).convert("RGB")
    W, H = im.size
    caixas = []
    for n, dado in enumerate(arte["dados"]):
        if not dado.get("caixa"):                      # acha e grava, para a página saber onde desenhar
            x0, y0, x1, y1 = caixa(im, round(dado["x"] / 100 * W), round(dado["y"] / 100 * H))
            dado["caixa"] = [round(x0 / W * 100, 2), round(y0 / H * 100, 2), round(x1 / W * 100, 2), round(y1 / H * 100, 2)]
        dado.setdefault("faces", escolher_faces(id_, n))
        caixas.append(tuple(round(v / 100 * (W if i % 2 == 0 else H)) for i, v in enumerate(dado["caixa"])))
    for c in caixas:                                   # apaga depois de achar todas (um dado apagado não atrapalha achar o outro)
        apagar(im, *c)
    im.save(QUADROS / f"{id_}.webp", "WEBP", quality=88, method=6)
    CONFERIR.mkdir(parents=True, exist_ok=True)
    conf = im.copy()
    d = ImageDraw.Draw(conf)
    for c in caixas:
        d.rectangle(c, outline=(255, 0, 255), width=2)
    conf.save(CONFERIR / f"{id_}.png")
    print(f"  {id_}: {len(caixas)} dados")


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
