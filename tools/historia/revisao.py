#!/usr/bin/env python3
"""Monta a página de revisão das falas do modo história: o modelo com docs/historia_piadas.json embutido.

    python3 tools/historia/revisao.py SAIDA.html

As decisões do dono ficam no banco da página publicada (coleção "revisao", um documento por código de fala, mais
"nome", "fecho" e "cartas"); o Claude as lê de volta e as passa para o JSON (docs/historia.md §11).
"""
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
modelo = (RAIZ / 'tools' / 'historia' / 'revisao_modelo.html').read_text(encoding='utf-8')
dados = json.loads((RAIZ / 'docs' / 'historia_piadas.json').read_text(encoding='utf-8'))
js = json.dumps(dados, ensure_ascii=False).replace('</', '<\\/')
saida = Path(sys.argv[1] if len(sys.argv) > 1 else RAIZ / 'builds' / 'historia-revisao.html')
saida.parent.mkdir(parents=True, exist_ok=True)
saida.write_text(modelo.replace('/*DADOS*/null', js), encoding='utf-8')
print(f'{saida}: {len(dados["falas"])} falas')
