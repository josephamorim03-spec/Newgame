#!/usr/bin/env python3
"""Gera a arte do Dice Duel com a API de imagens da OpenAI (rivais, ícones de jogador, cartas, ícone do app).

    python3 tools/gerar_arte.py --listar            -> mostra o que seria gerado e o custo aproximado (não chama a API)
    python3 tools/gerar_arte.py                     -> gera tudo que ainda não existe
    python3 tools/gerar_arte.py --so cartas         -> só um grupo (rivais, icones, cartas, app) ou um item (ex.: coruja)
    python3 tools/gerar_arte.py --so pressa --forcar  -> gera de novo, mesmo que já exista

Precisa da variável OPENAI_API_KEY. O modelo vem de DD_MODELO_IMAGEM (padrão gpt-image-1) e a qualidade de
DD_QUALIDADE (low, medium, high; padrão medium).

Saída:
- assets/arte/<grupo>/<id>.png: 256×256, fundo transparente, é o que o jogo usa;
- builds/arte-bruta/<grupo>/<id>.png: o original em 1024×1024 (fora do git);
- builds/arte-bruta/previa.html: uma folha com tudo lado a lado, para escolher o que fica.

Nada é gerado de novo sem --forcar: cada imagem custa dinheiro.
"""
import argparse
import base64
import io
import json
import os
import sys
import time
from pathlib import Path

import requests
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "assets" / "arte"
BRUTA = RAIZ / "builds" / "arte-bruta"
MODELO = os.environ.get("DD_MODELO_IMAGEM", "gpt-image-1")
QUALIDADE = os.environ.get("DD_QUALIDADE", "medium")
# preço aproximado por imagem quadrada de 1024 no gpt-image-1 (USD); serve só para o aviso de --listar
PRECO = {"low": 0.011, "medium": 0.042, "high": 0.167}

# o mesmo estilo em tudo, para as peças parecerem do mesmo jogo (cores do css/estilo.css)
ESTILO = (
    "Cozy hand-drawn sticker illustration for a relaxing mobile dice game. "
    "Warm limited palette: cream #fbf1df, honey #f2c14e, coral #e8806f, rose #ec8fa8, sage green #5f8f78, "
    "sky blue #6fbfd3, with thick rounded cocoa-brown outlines #3a2a2e. Flat colors with one soft highlight, "
    "no gradients, no texture noise. Single centered subject filling about 80% of the frame, bold simple "
    "silhouette that stays readable at 48 pixels. Transparent background. No text, no letters, no numbers, "
    "no watermark, no frame, no drop shadow."
)

ARTE = {
    "rivais": {
        "biscoito": "Portrait of Biscoito, a playful orange tabby kitten with big shiny eyes, pink nose, tiny whiskers and "
                    "rosy cheeks, holding a round cookie, cheerful and mischievous. Head and shoulders.",
        "coruja": "Portrait of Dona Coruja, a calm wise grandmother owl with soft brown feathers, big round reading glasses, "
                  "a knitted cream shawl and a small steaming teacup, gentle knowing smile. Head and shoulders.",
    },
    "icones": {
        "bolinha": "A round sky-blue blob creature with two dot eyes and a small happy smile.",
        "xicara": "A cute smiling cream teacup character with rosy cheeks and two wisps of steam.",
        "raposa": "A cute fox face, orange with a cream muzzle and pointy ears, friendly eyes.",
        "sapo": "A cute round mint-green frog face with big eyes on top and a wide content smile.",
        "cogumelo": "A cute mushroom character with a coral cap with cream spots and a smiling cream stem face.",
    },
    "cartas": {
        "ajuste": "A single ivory game die with a small honey-colored plus and minus sign floating beside it.",
        "virar": "A single ivory game die flipping over in mid-air with a curved sky-blue arrow looping around it.",
        "rerrolar": "Three ivory game dice tumbling together with small motion swooshes and a circular arrow.",
        "pressa": "Two ivory game dice side by side with speed lines behind them, as if dashing forward.",
        "coringa": "A honey-gold star sitting on top of an ivory game die, sparkling, like a joker wildcard.",
        "sobrecarga": "A bright honey-yellow lightning bolt striking down onto a short chain of ivory dice.",
        "espelho": "A small oval hand mirror with a cocoa frame, reflecting an ivory game die, little glints of light.",
        "fundo": "A cloth pocket with a torn bottom and an ivory game die slipping out and falling.",
        "ancora": "A sage-green ship anchor wrapped by a short chain made of tiny ivory dice.",
        "interferencia": "A crackling coral zigzag static wave cutting across a short chain of ivory dice.",
        "pedagio": "A toll booth barrier arm in coral and cream with a shiny gold coin hovering beside it.",
    },
    "app": {
        "icone-app": "App icon: two ivory dice, one showing five pips and one showing two pips, leaning on each other on "
                     "a round sage-green felt mat with a tiny honey sparkle. Square composition with the mat filling the frame.",
    },
}


def itens(filtro=None):
    for grupo, coisas in ARTE.items():
        for id_, desc in coisas.items():
            if filtro in (None, grupo, id_):
                yield grupo, id_, desc


def gerar(desc, chave):
    corpo = {"model": MODELO, "prompt": f"{desc}\n\n{ESTILO}", "size": "1024x1024", "n": 1,
             "quality": QUALIDADE, "background": "transparent", "output_format": "png"}
    for tentativa in range(4):
        r = requests.post("https://api.openai.com/v1/images/generations", timeout=180,
                          headers={"Authorization": f"Bearer {chave}", "Content-Type": "application/json"},
                          data=json.dumps(corpo))
        if r.status_code == 200:
            return base64.b64decode(r.json()["data"][0]["b64_json"])
        try: erro = r.json().get("error") or {}
        except ValueError: erro = {}
        if r.status_code in (429, 500, 502, 503) and tentativa < 3:
            time.sleep(2 ** (tentativa + 1)); continue
        raise SystemExit(f"A API recusou ({r.status_code}): {erro.get('message') or r.text[:300]}")


def previa(feitos):
    linhas = "".join(f'<figure><img src="{g}/{i}.png"><figcaption>{g}/{i}</figcaption></figure>' for g, i in feitos)
    (BRUTA / "previa.html").write_text(
        "<!doctype html><meta charset=utf-8><title>Arte do Dice Duel</title><style>body{font-family:sans-serif;"
        "background:#5f8f78;display:flex;flex-wrap:wrap;gap:16px;padding:16px}figure{margin:0;background:#fbf1df;"
        "border-radius:12px;padding:8px;text-align:center}img{width:160px;height:160px}</style>" + linhas,
        encoding="utf-8")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--so", help="grupo ou item")
    ap.add_argument("--forcar", action="store_true", help="gera de novo o que já existe")
    ap.add_argument("--listar", action="store_true", help="só lista e estima o custo")
    a = ap.parse_args()
    lista = [(g, i, d) for g, i, d in itens(a.so) if a.forcar or not (SAIDA / g / f"{i}.png").exists()]
    if not lista:
        print("Nada a gerar (use --forcar para refazer)."); return
    custo = len(lista) * PRECO.get(QUALIDADE, PRECO["medium"])
    print(f"{len(lista)} imagens · {MODELO} · qualidade {QUALIDADE} · ~US$ {custo:.2f}")
    if a.listar:
        for g, i, d in lista: print(f"  {g}/{i}: {d}")
        return
    chave = os.environ.get("OPENAI_API_KEY")
    if not chave:
        sys.exit("Falta a variável OPENAI_API_KEY.")
    feitos = []
    for g, i, d in lista:
        print(f"  gerando {g}/{i}…", flush=True)
        png = gerar(d, chave)
        (BRUTA / g).mkdir(parents=True, exist_ok=True); (SAIDA / g).mkdir(parents=True, exist_ok=True)
        (BRUTA / g / f"{i}.png").write_bytes(png)
        img = Image.open(io.BytesIO(png)).convert("RGBA").resize((256, 256), Image.LANCZOS)
        img.save(SAIDA / g / f"{i}.png", optimize=True)
        feitos.append((g, i))
    previa(feitos)
    print(f"Pronto: {len(feitos)} imagens em {SAIDA.relative_to(RAIZ)}; prévia em {(BRUTA / 'previa.html').relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
