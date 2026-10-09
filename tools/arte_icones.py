#!/usr/bin/env python3
"""Pinta os retratos (rivais e ícones) com a API de imagem da OpenAI e os embute no jogo.

    python3 tools/arte_icones.py                  # todos os retratos de arte/retratos.json
    python3 tools/arte_icones.py diana coruja     # só estes
    python3 tools/arte_icones.py --seco           # mostra os pedidos, não gasta nada
    python3 tools/arte_icones.py --qualidade high # low | medium (padrão) | high
    python3 tools/arte_icones.py --embutir        # só refaz js/retratos_pintados.js com o que já existe

Precisa de OPENAI_API_KEY no ambiente (ARTE_MODELO troca o modelo; padrão gpt-image-1).
Cada imagem fica em arte/fonte/<id>.png (1024 px, fundo transparente, para revisar e regerar)
e entra no jogo como WebP de 160 px em js/retratos_pintados.js, embutida em data URI: funciona por
file://, no servidor e no HTML único, sem pedido extra de rede. Quem não tem versão pintada usa o vetor
de js/retratos.js. Para tirar um retrato pintado, apague arte/fonte/<id>.png e rode --embutir.
"""
import base64
import io
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
PEDIDOS = RAIZ / "arte" / "retratos.json"
FONTE = RAIZ / "arte" / "fonte"
SAIDA = RAIZ / "js" / "retratos_pintados.js"
LADO = 160          # px do WebP no jogo (o maior retrato na tela tem ~120 px em 1x; 160 cobre telas densas)


def prompt_de(cfg, id_):
    texto = cfg["retratos"][id_]
    partes = [cfg["estilo"]]
    if texto.startswith("SPECIAL."):
        partes.append(cfg["especial"])
        texto = texto[len("SPECIAL."):].strip()
    partes.append(texto)
    return " ".join(partes)


def gerar(prompt, qualidade):
    chave = os.environ.get("OPENAI_API_KEY")
    if not chave:
        sys.exit("Falta OPENAI_API_KEY no ambiente.")
    corpo = json.dumps({"model": os.environ.get("ARTE_MODELO", "gpt-image-1"), "prompt": prompt, "size": "1024x1024",
                        "background": "transparent", "quality": qualidade, "n": 1}).encode()
    req = urllib.request.Request("https://api.openai.com/v1/images/generations", data=corpo, method="POST")
    req.add_header("Authorization", f"Bearer {chave}")
    req.add_header("Content-Type", "application/json")
    for tentativa in range(4):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                return base64.b64decode(json.load(r)["data"][0]["b64_json"])
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="replace")[:400]
            if e.code in (429, 500, 502, 503) and tentativa < 3:
                time.sleep(2 ** (tentativa + 2)); continue
            sys.exit(f"A API recusou ({e.code}): {msg}")
        except urllib.error.URLError as e:
            if tentativa < 3:
                time.sleep(2 ** (tentativa + 2)); continue
            sys.exit(f"Sem conexão com a API: {e}")


def webp(png_bytes):
    im = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    caixa = im.getbbox()                    # corta a sobra transparente e centraliza num quadrado
    if caixa:
        im = im.crop(caixa)
    lado = max(im.size)
    quadro = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    quadro.paste(im, ((lado - im.width) // 2, (lado - im.height) // 2))
    quadro = quadro.resize((LADO, LADO), Image.LANCZOS)
    buf = io.BytesIO()
    quadro.save(buf, "WEBP", quality=82, method=6)
    return buf.getvalue()


def embutir():
    itens = {}
    for png in sorted(FONTE.glob("*.png")):
        itens[png.stem] = "data:image/webp;base64," + base64.b64encode(webp(png.read_bytes())).decode()
    linhas = ["/* gerado por tools/arte_icones.py: os retratos pintados (webp em data URI). Vazio = só vetor. */",
              "window.RETRATOS_PINTADOS = Object.assign(window.RETRATOS_PINTADOS || {}, {"]
    linhas += [f'  {k}: "{v}",' for k, v in itens.items()]
    linhas.append("});")
    SAIDA.write_text("\n".join(linhas) + "\n", encoding="utf-8")
    tamanho = SAIDA.stat().st_size // 1024
    print(f"{SAIDA.relative_to(RAIZ)}: {len(itens)} retratos pintados, {tamanho} KB")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    seco = "--seco" in sys.argv
    qualidade = "medium"
    if "--qualidade" in sys.argv:
        qualidade = sys.argv[sys.argv.index("--qualidade") + 1]
        args = [a for a in args if a != qualidade]
    if "--embutir" in sys.argv:
        return embutir()
    cfg = json.loads(PEDIDOS.read_text(encoding="utf-8"))
    ids = args or list(cfg["retratos"])
    desconhecidos = [i for i in ids if i not in cfg["retratos"]]
    if desconhecidos:
        sys.exit(f"Sem pedido para: {', '.join(desconhecidos)}")
    FONTE.mkdir(parents=True, exist_ok=True)
    for id_ in ids:
        p = prompt_de(cfg, id_)
        if seco:
            print(f"--- {id_}\n{p}\n"); continue
        print(f"pintando {id_}…", flush=True)
        (FONTE / f"{id_}.png").write_bytes(gerar(p, qualidade))
        (FONTE / f"{id_}.json").write_text(json.dumps({"prompt": p, "qualidade": qualidade, "modelo": os.environ.get("ARTE_MODELO", "gpt-image-1")}, ensure_ascii=False, indent=1))
    if not seco:
        embutir()


if __name__ == "__main__":
    main()
