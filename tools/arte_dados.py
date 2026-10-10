#!/usr/bin/env python3
"""Pinta a face das skins de dado que o CSS não faz bem (a lã da Ovelha, o veio da madeira da Coruja, o verde do
Sapo) com a API de imagem da OpenAI e embute no jogo.

    python3 tools/arte_dados.py                  # todos os pedidos de arte/dados.json
    python3 tools/arte_dados.py la madeira       # só estes
    python3 tools/arte_dados.py --seco           # mostra os pedidos, não gasta nada
    python3 tools/arte_dados.py --qualidade high # low | medium (padrão) | high
    python3 tools/arte_dados.py --embutir        # só refaz js/dados_pintados.js com o que já existe

Cada pedido é a superfície de uma face, sem bolinhas, opaca (gpt-image-2, ou o "modelo" do arquivo de pedidos).
A pintura fica em arte/fonte/dados/<id>.png (1024 px, para revisar e regerar) e entra no jogo como WebP de 112 px
(o miolo da imagem, sem a beirada, onde o gerador às vezes desenha uma moldura) em js/dados_pintados.js. O jogo põe
a pintura por baixo das bolinhas e do brilho da skin (js/jogo.js, pintarDados); sem ela, vale o degradê do CSS.
Para tirar uma, apague o png e rode --embutir.
"""
import base64
import io
import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import arte_icones as A  # noqa: E402  (a chamada à API mora lá)

RAIZ = A.RAIZ
PEDIDOS = RAIZ / "arte" / "dados.json"
FONTE = RAIZ / "arte" / "fonte" / "dados"
SAIDA = RAIZ / "js" / "dados_pintados.js"
LADO = 112          # o maior dado na tela tem ~56 px em 1x
MIOLO = 0.86        # fica com o miolo: a beirada é onde o gerador desenha moldura ou sombra


def webp(png_bytes):
    im = Image.open(io.BytesIO(png_bytes)).convert("RGB")
    w, h = im.size
    c = int(min(w, h) * MIOLO)
    im = im.crop(((w - c) // 2, (h - c) // 2, (w + c) // 2, (h + c) // 2)).resize((LADO, LADO), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=80, method=6)
    return buf.getvalue()


def embutir():
    prontos = {png.stem: "data:image/webp;base64," + base64.b64encode(webp(png.read_bytes())).decode()
               for png in sorted(FONTE.glob("*.png"))}
    linhas = ["/* gerado por tools/arte_dados.py a partir de arte/dados.json: a face pintada de algumas skins de dado (webp em data URI). Vazio = só o CSS. */",
              "window.DADOS_PINTADOS = Object.assign(window.DADOS_PINTADOS || {}, {"]
    linhas += [f'  {k}: "{v}",' for k, v in prontos.items()]
    linhas.append("});")
    SAIDA.write_text("\n".join(linhas) + "\n", encoding="utf-8")
    print(f"{SAIDA.relative_to(RAIZ)}: {len(prontos)} pintados, {SAIDA.stat().st_size // 1024} KB")


def main():
    cfg = json.loads(PEDIDOS.read_text(encoding="utf-8"))
    if "--embutir" in sys.argv:
        return embutir()
    qualidade = sys.argv[sys.argv.index("--qualidade") + 1] if "--qualidade" in sys.argv else "medium"
    ids = [a for a in sys.argv[1:] if not a.startswith("--") and a != qualidade] or list(cfg["itens"])
    faltam = [i for i in ids if i not in cfg["itens"]]
    if faltam:
        sys.exit(f"Sem pedido para: {', '.join(faltam)}")
    FONTE.mkdir(parents=True, exist_ok=True)
    for id_ in ids:
        p = f'{cfg["estilo"]} {cfg["itens"][id_]}'
        if "--seco" in sys.argv:
            print(f"--- {id_}\n{p}\n"); continue
        print(f"pintando {id_}…", flush=True)
        (FONTE / f"{id_}.png").write_bytes(A.gerar(p, qualidade, fundo="opaque", modelo=cfg["modelo"]))
        (FONTE / f"{id_}.json").write_text(json.dumps({"prompt": p, "qualidade": qualidade, "modelo": cfg["modelo"]}, ensure_ascii=False, indent=1))
    if "--seco" not in sys.argv:
        embutir()


if __name__ == "__main__":
    main()
