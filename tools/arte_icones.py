#!/usr/bin/env python3
"""Pinta os retratos (rivais e ícones) com a API de imagem da OpenAI e os embute no jogo.

    python3 tools/arte_icones.py                  # todos os retratos de arte/retratos.json
    python3 tools/arte_icones.py diana coruja     # só estes
    python3 tools/arte_icones.py --seco           # mostra os pedidos, não gasta nada
    python3 tools/arte_icones.py --qualidade high # low | medium (padrão) | high
    python3 tools/arte_icones.py --embutir        # só refaz js/retratos_pintados.js com o que já existe

Precisa de OPENAI_API_KEY no ambiente (ARTE_MODELO troca o modelo; padrão gpt-image-1).
O estilo é o do jogo: cada pedido leva o vetor do personagem (arte/referencia/<id>.png, gerado por
tools/referencias.js) como referência, para a versão pintada manter o desenho, as marcas e o traço.
Sem a referência (ou se a API recusar a edição), o pedido vai só com o texto.
Cada imagem fica em arte/fonte/<id>.png (1024 px, fundo transparente, para revisar e regerar)
e entra no jogo como WebP de 160 px em js/retratos_pintados.js, embutida em data URI: funciona por
file://, no servidor e no HTML único, sem pedido extra de rede. Quem não tem versão pintada usa o vetor
de js/retratos.js. Para tirar um retrato pintado, apague arte/fonte/<id>.png e rode --embutir.
Personagens claros (os de "fundo_opaco" em arte/retratos.json) somem no fundo transparente da API, que
toma o pelo branco por fundo: esses vêm num verde liso e o verde é recortado aqui, a partir das bordas.
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

from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
PEDIDOS = RAIZ / "arte" / "retratos.json"
FONTE = RAIZ / "arte" / "fonte"
REFERENCIA = RAIZ / "arte" / "referencia"
SAIDA = RAIZ / "js" / "retratos_pintados.js"
LADO = 160          # px do WebP no jogo (o maior retrato na tela tem ~120 px em 1x; 160 cobre telas densas)


def prompt_de(cfg, id_):
    texto = cfg["retratos"][id_]
    partes = [cfg["referencia"]] if (REFERENCIA / f"{id_}.png").exists() and cfg.get("referencia") else []
    if id_ in cfg.get("fundo_opaco", []):
        partes.append(cfg["estilo"].replace("plain transparent background", "no transparency"))
        partes.append(cfg["fundo_opaco_texto"])
    else:
        partes.append(cfg["estilo"])
    if texto.startswith("SPECIAL."):
        partes.append(cfg["especial"])
        texto = texto[len("SPECIAL."):].strip()
    partes.append(texto)
    return " ".join(partes)


def multipart(campos, arquivo):
    """corpo multipart/form-data com os campos de texto e uma imagem (sem depender de requests)"""
    fronteira = "----diceduel" + base64.b16encode(os.urandom(8)).decode()
    partes = [f'--{fronteira}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode() for k, v in campos.items()]
    partes.append(f'--{fronteira}\r\nContent-Disposition: form-data; name="image"; filename="{arquivo.name}"\r\n'
                  f'Content-Type: image/png\r\n\r\n'.encode() + arquivo.read_bytes() + b"\r\n")
    partes.append(f"--{fronteira}--\r\n".encode())
    return b"".join(partes), f"multipart/form-data; boundary={fronteira}"


def gerar(prompt, qualidade, ref=None, fundo="transparent"):
    chave = os.environ.get("OPENAI_API_KEY")
    if not chave:
        sys.exit("Falta OPENAI_API_KEY no ambiente.")
    campos = {"model": os.environ.get("ARTE_MODELO", "gpt-image-1"), "prompt": prompt, "size": "1024x1024",
              "background": fundo, "quality": qualidade, "n": 1}
    if ref is not None:
        # com referência: edição a partir do vetor; "input_fidelity" alta segura o desenho original
        corpo, tipo = multipart({**campos, "input_fidelity": "high"}, ref)
        url = "https://api.openai.com/v1/images/edits"
    else:
        corpo, tipo = json.dumps(campos).encode(), "application/json"
        url = "https://api.openai.com/v1/images/generations"
    req = urllib.request.Request(url, data=corpo, method="POST")
    req.add_header("Authorization", f"Bearer {chave}")
    req.add_header("Content-Type", tipo)
    for tentativa in range(4):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                return base64.b64decode(json.load(r)["data"][0]["b64_json"])
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="replace")[:400]
            if e.code == 400 and ref is not None:
                print(f"  a API recusou a edição com referência ({msg[:160]}); tentando só com o texto", flush=True)
                return gerar(prompt, qualidade, fundo=fundo)
            if e.code in (429, 500, 502, 503) and tentativa < 3:
                time.sleep(2 ** (tentativa + 2)); continue
            sys.exit(f"A API recusou ({e.code}): {msg}")
        except urllib.error.URLError as e:
            if tentativa < 3:
                time.sleep(2 ** (tentativa + 2)); continue
            sys.exit(f"Sem conexão com a API: {e}")


def recortar_fundo(png_bytes, tolerancia=70):
    """apaga o fundo liso: inunda a partir das bordas (o contorno grosso segura) e torna transparente"""
    im = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    rgb = im.convert("RGB")
    marca = (255, 0, 255)
    w, h = rgb.size
    for x, y in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]:
        if rgb.getpixel((x, y)) != marca:
            ImageDraw.floodfill(rgb, (x, y), marca, thresh=tolerancia)
    alfa = Image.new("L", im.size, 255)
    px, pa = rgb.load(), alfa.load()
    for y in range(h):
        for x in range(w):
            if px[x, y] == marca:
                pa[x, y] = 0
    im.putalpha(alfa)
    buf = io.BytesIO()
    im.save(buf, "PNG")
    return buf.getvalue()


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
            tem = (REFERENCIA / f"{id_}.png").exists()
            print(f"--- {id_} ({'com o vetor de referência' if tem else 'só texto'})\n{p}\n"); continue
        print(f"pintando {id_}…", flush=True)
        ref = REFERENCIA / f"{id_}.png"
        ref = ref if ref.exists() else None
        if id_ in cfg.get("fundo_opaco", []):
            png = recortar_fundo(gerar(p, qualidade, ref, fundo="opaque"))
        else:
            png = gerar(p, qualidade, ref)
        (FONTE / f"{id_}.png").write_bytes(png)
        (FONTE / f"{id_}.json").write_text(json.dumps({"prompt": p, "qualidade": qualidade, "referencia": bool(ref), "modelo": os.environ.get("ARTE_MODELO", "gpt-image-1")}, ensure_ascii=False, indent=1))
    if not seco:
        embutir()


if __name__ == "__main__":
    main()
