#!/usr/bin/env python3
"""Os dados dos quadros redesenhados pelo gerador, no lugar exato: recorta cada dado, pede ao gerador o mesmo dado com as
bolinhas certas (variações), o dono escolhe uma e ela é encaixada de volta, só em cima do dado.

    python3 tools/historia/dados_ia.py rascunhos                 # os dados que a troca de bolinhas não consertou ("conferido": false)
    python3 tools/historia/dados_ia.py rascunhos p-cai c4-caverna  # só os destes quadros
    python3 tools/historia/dados_ia.py rascunhos --todos         # todos os dados, também os já consertados
    python3 tools/historia/dados_ia.py rascunhos --n 3 --qualidade medium
    python3 tools/historia/dados_ia.py aplicar p-cai:1=b c4-caverna:2=a   # escolhe a variação de cada dado (o número é o do dado)

1. rascunhos: para cada dado, o recorte quadrado em volta dele (a caixa e uma margem) vai ampliado para 1024 px ao
   gerador, com o pedido de redesenhar só o dado do meio, no mesmo lugar, tamanho, ângulo, cor e contorno, mostrando os
   números da anotação ("faces" em arte/historia.json) no arranjo certo. Saem N variações em
   builds/dados_ia/<id>/<dado>/<letra>.png e a prancha builds/dados_ia/<id>/prancha.jpg: o recorte da arte e as variações,
   lado a lado, com as letras.
2. aplicar: a variação escolhida vai para arte/historia/dados_ia/<id>-<dado>.png e o dado ganha "ia" na anotação. O
   tools/historia/dados_quadros.py encaixa esses recortes por cima da arte (só a área do dado, com a borda esfumada),
   no lugar da troca de bolinhas, toda vez que roda.
Precisa de OPENAI_API_KEY (como o tools/arte_icones.py).
"""
import io
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import arte_icones as A  # noqa: E402  (a chamada à API mora lá)

RAIZ = A.RAIZ
PEDIDOS = RAIZ / "arte" / "historia.json"
QUADROS = RAIZ / "arte" / "historia" / "quadros"
ORIGINAIS = QUADROS / "originais"
ACEITOS = RAIZ / "arte" / "historia" / "dados_ia"
RASCUNHOS = RAIZ / "builds" / "dados_ia"
LETRAS = "abcdefgh"
MIN_LARGURA = 6               # % da largura do quadro: só os dados que aparecem grandes (decisão do dono)
MARGEM = .45                  # o recorte vai além da caixa do dado: o gerador precisa ver o entorno para casar o traço
FONTE_LETRA = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
ARRANJO = {1: "one pip in the center", 2: "two pips on a diagonal", 3: "three pips on a diagonal", 4: "four pips, one in each corner",
           5: "four pips in the corners and one in the center", 6: "six pips in two parallel rows of three"}
NOMES = {"t": "the top face", "e": "the front-left face", "d": "the right face"}


def recorte(W, H, caixa):
    """o quadrado em volta do dado (em pixels da imagem inteira), dentro da imagem"""
    x0, y0, x1, y1 = caixa[0] / 100 * W, caixa[1] / 100 * H, caixa[2] / 100 * W, caixa[3] / 100 * H
    lado = max(x1 - x0, y1 - y0) * (1 + 2 * MARGEM)
    lado = min(lado, W, H)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    rx0 = int(min(max(0, cx - lado / 2), W - lado))
    ry0 = int(min(max(0, cy - lado / 2), H - lado))
    return rx0, ry0, rx0 + int(lado), ry0 + int(lado)


def prompt(dado):
    faces = "; ".join(f"{NOMES[k]} shows {v} ({ARRANJO[v]})" for k, v in dado["faces"].items())
    return ("Edit the attached image, a crop of a cozy comic-book panel. Redraw ONLY the six-sided die in the center of the image, "
            "keeping it exactly where it is, with exactly the same size, angle, perspective, colors, outline thickness, shading, "
            "highlights and drawing style, so that it can be pasted back into the panel seamlessly. Do not move, resize or "
            "restyle anything else: the surroundings, other objects and any other dice stay identical. Only the pips of the "
            f"central die change: {faces}. The pips are round, evenly spaced and drawn in the same color as before, following the "
            "perspective of each face. A face never shows more than six pips and no face is blank. No text.")


def rascunhos(cfg, ids, todos, n, qualidade):
    trabalhos = []
    for id_ in ids:
        im = Image.open(ORIGINAIS / f"{id_}.webp" if (ORIGINAIS / f"{id_}.webp").exists() else QUADROS / f"{id_}.webp").convert("RGB")
        for k, dado in enumerate(cfg["artes"][id_].get("dados", []), 1):
            if dado.get("conferido") and not todos:
                continue
            if dado["caixa"][2] - dado["caixa"][0] < MIN_LARGURA:   # miúdo de fundo: não vale uma imagem
                continue
            r = recorte(*im.size, dado["caixa"])
            pasta = RASCUNHOS / id_ / str(k)
            pasta.mkdir(parents=True, exist_ok=True)
            cr = im.crop(r).resize((1024, 1024), Image.LANCZOS)
            cr.save(pasta / "recorte.png")
            trabalhos += [(id_, k, dado, pasta, letra) for letra in LETRAS[:n]]
    print(f"{len(trabalhos)} pedidos ({cfg['modelo']}, {qualidade})", flush=True)

    def um(t):
        id_, k, dado, pasta, letra = t
        png = A.gerar(prompt(dado), qualidade, pasta / "recorte.png", fundo="opaque", modelo=cfg["modelo"])
        (pasta / f"{letra}.png").write_bytes(png)
        return f"{id_}:{k}={letra}"
    with ThreadPoolExecutor(4) as ex:
        for feito in ex.map(um, trabalhos):
            print(" ", feito, flush=True)
    for id_ in sorted({t[0] for t in trabalhos}):
        prancha(id_)


def prancha(id_):
    """por dado, uma linha: o recorte da arte e as variações, com as letras"""
    fonte = ImageFont.truetype(FONTE_LETRA, 34)
    linhas = []
    for pasta in sorted((RASCUNHOS / id_).iterdir(), key=lambda p: int(p.name) if p.name.isdigit() else 0):
        if not pasta.is_dir():
            continue
        pecas = [("arte", pasta / "recorte.png")] + [(l, pasta / f"{l}.png") for l in LETRAS if (pasta / f"{l}.png").exists()]
        linha = Image.new("RGB", (len(pecas) * 330, 360), (255, 255, 255))
        d = ImageDraw.Draw(linha)
        for i, (rot, arq) in enumerate(pecas):
            linha.paste(Image.open(arq).convert("RGB").resize((320, 320)), (i * 330, 40))
            d.text((i * 330 + 6, 2), f"dado {pasta.name} · {rot}" if i == 0 else rot.upper(), fill=(0, 0, 0), font=fonte)
        linhas.append(linha)
    if linhas:
        o = Image.new("RGB", (max(l.width for l in linhas), sum(l.height for l in linhas)), (255, 255, 255))
        y = 0
        for l in linhas:
            o.paste(l, (0, y)); y += l.height
        o.save(RASCUNHOS / id_ / "prancha.jpg", quality=85)
        print(f"  {RASCUNHOS / id_ / 'prancha.jpg'}")


def aplicar(cfg, escolhas):
    ACEITOS.mkdir(parents=True, exist_ok=True)
    for e in escolhas:
        alvo, letra = e.split("=")
        id_, k = alvo.split(":")
        arq = RASCUNHOS / id_ / k / f"{letra}.png"
        if not arq.exists():
            sys.exit(f"Não existe: {arq}")
        (ACEITOS / f"{id_}-{k}.png").write_bytes(arq.read_bytes())
        cfg["artes"][id_]["dados"][int(k) - 1]["ia"] = letra
        print(f"  {id_}, dado {k}: variação {letra}")
    PEDIDOS.write_text(json.dumps(cfg, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    import dados_quadros                                      # refaz os quadros com os recortes aceitos
    for id_ in sorted({e.split(":")[0] for e in escolhas}):
        dados_quadros.consertar(id_, cfg["artes"][id_])
    PEDIDOS.write_text(json.dumps(cfg, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def main():
    cfg = json.loads(PEDIDOS.read_text(encoding="utf-8"))
    argv = sys.argv[1:]
    if not argv or argv[0] not in ("rascunhos", "aplicar"):
        sys.exit(__doc__)
    if argv[0] == "aplicar":
        return aplicar(cfg, argv[1:])
    n = int(argv[argv.index("--n") + 1]) if "--n" in argv else 3
    qualidade = argv[argv.index("--qualidade") + 1] if "--qualidade" in argv else "medium"
    resto = [a for a in argv[1:] if not a.startswith("--") and a not in (str(n), qualidade)]
    ids = resto or [k for k, v in cfg["artes"].items() if v.get("dados")]
    rascunhos(cfg, ids, "--todos" in argv, n, qualidade)


if __name__ == "__main__":
    main()
