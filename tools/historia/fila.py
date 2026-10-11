#!/usr/bin/env python3
"""A fila de arte do modo história, na ordem combinada com o dono, para rodar quando houver crédito na API.

    python3 tools/historia/fila.py          # confere o crédito e roda os passos 1 a 3
    python3 tools/historia/fila.py --seco   # só mostra o que roda

1. o cachecol maior (a folha de modelo do nariz, partindo da v1);
2. os quadros que o dono pediu para corrigir: p-pata, i1-le, c3-raposa, c1-pag-a e c6-ovelha (o da Ovelha é uma edição
   da arte atual, só os hexágonos), e as quatro artes novas do roteiro (c7-lacre, c7-tampa, c8-bolso, f-empurra);
3. os rascunhos dos dados que a troca de bolinhas não consertou (tools/historia/dados_ia.py), com as pranchas para o dono.
Depois: marcar de novo os dados, a boca e a cabeça dos quadros repintados (arte/historia.json), e o dono escolhe as
variações dos dados (dados_ia.py aplicar ...).
"""
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
PASSOS = [
    ["tools/historia/quadros.py", "narizes", "cachecol"],
    ["tools/historia/quadros.py", "--qualidade", "high", "p-pata", "i1-le", "c3-raposa", "c1-pag-a", "c6-ovelha",
     "c7-lacre", "c7-tampa", "c8-bolso", "f-empurra"],
    ["tools/historia/dados_ia.py", "rascunhos"],
]


def tem_credito():
    req = urllib.request.Request("https://api.openai.com/v1/images/generations", method="POST",
                                 data=json.dumps({"model": "gpt-image-1-mini", "prompt": "a small pink die", "size": "1024x1024",
                                                  "quality": "low", "n": 1}).encode())
    req.add_header("Authorization", "Bearer " + os.environ["OPENAI_API_KEY"]); req.add_header("Content-Type", "application/json")
    try:
        urllib.request.urlopen(req, timeout=120).read()
        return True
    except urllib.error.HTTPError as e:
        return "credit" not in e.read().decode(errors="replace") and "quota" not in str(e)


def main():
    for p in PASSOS:
        print("$ python3 " + " ".join(p))
    if "--seco" in sys.argv:
        return
    if not tem_credito():
        sys.exit("Sem crédito na API (platform.openai.com → Billing). Nada rodou.")
    for p in PASSOS:
        subprocess.run([sys.executable, *p], cwd=RAIZ, check=True)


if __name__ == "__main__":
    main()
