#!/usr/bin/env python3
"""Empacota o Dice Duel num arquivo HTML único (CSS e JS embutidos), fácil de abrir no celular ou mandar a quem testa.

    python3 tools/empacotar.py              -> dist/dice-duel.html (página completa)
    python3 tools/empacotar.py --artefato   -> builds/artefato.html (sem <html>/<head>/<body>, para publicar como artefato)
"""
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent


def embutir(html: str) -> str:
    def css(m):
        return "<style>\n" + (RAIZ / m.group(1)).read_text(encoding="utf-8") + "\n</style>"

    def js(m):
        return "<script>\n" + (RAIZ / m.group(1)).read_text(encoding="utf-8") + "\n</script>"

    html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', css, html)
    html = re.sub(r'<script src="((?:js|shared)/[^"]+)"></script>', js, html)
    return html


def para_artefato(html: str) -> str:
    """O visualizador de artefatos já põe o esqueleto da página: fica só o título, as fontes, o estilo e o corpo."""
    cabeca = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
    corpo = re.search(r"<body>(.*)</body>", html, re.S).group(1)
    cabeca = re.sub(r"<meta[^>]*>\n?", "", cabeca)
    return cabeca.strip() + "\n" + corpo.strip() + "\n"


def main():
    html = embutir((RAIZ / "index.html").read_text(encoding="utf-8"))
    if "--artefato" in sys.argv:
        saida = RAIZ / "builds" / "artefato.html"
        html = para_artefato(html)
    else:
        saida = RAIZ / "dist" / "dice-duel.html"
    saida.parent.mkdir(parents=True, exist_ok=True)
    saida.write_text(html, encoding="utf-8")
    print(f"{saida.relative_to(RAIZ)}: {len(html) // 1024} KB")


if __name__ == "__main__":
    main()
