#!/usr/bin/env python3
"""Monta o jogo num único HTML: dist/peleja.html (para publicar) e dist/test.html (com meta viewport, para os testes)."""
import os
root = os.path.dirname(os.path.abspath(__file__))
rd = lambda p: open(os.path.join(root, p), encoding="utf-8").read()
s = rd("src/shell.html")
s = s.replace("/*CORE*/", rd("src/core.js"))
s = s.replace("/*ART*/", rd("vendor/three.min.js") + "\n" + rd("src/flat.js") + "\n" + rd("src/figs.js") + "\n" + rd("src/fx.js") + "\n" + rd("src/arte.js"))
s = s.replace("/*UI*/", rd("src/ui.js"))
os.makedirs(os.path.join(root, "dist"), exist_ok=True)
open(os.path.join(root, "dist/peleja.html"), "w", encoding="utf-8").write(s)
open(os.path.join(root, "dist/test.html"), "w", encoding="utf-8").write('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' + s)
print("dist/peleja.html", len(s), "bytes")
