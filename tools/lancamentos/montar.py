#!/usr/bin/env python3
"""Monta js/lancamentos.js (a biblioteca de rolagens do Dice Duel) a partir dos lançamentos gravados do Cronomotor.

Os lançamentos são física 3D de verdade gravada offline no Godot (steamdicegame: tests/gravar_lancamentos.gd).
O jogo só os toca; a face continua sendo a da regra (shared/rolagem.js corrige o cubo).

    # 1) exportar do Godot (um projeto mínimo basta; ver tools/lancamentos/exportar.gd)
    SAIDA=/tmp/lancamentos.json godot --headless --path <projeto> -s tools/lancamentos/exportar.gd
    # 2) montar a versão enxuta
    python3 tools/lancamentos/montar.py /tmp/lancamentos.json

Enxuga para a web: só 1 a 5 dados (a Mesa tem 5), 8 lançamentos por quantidade (do mais calmo ao mais
agitado), 30 quadros por segundo (o jogo interpola) e números inteiros.
"""
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
POR_QUANTIDADE = 8
PASSO = 2  # 60 Hz -> 30 Hz


def agitacao(l):
    n, b = l["dados"], l["batidas"]
    pontos = (len(l["posicoes"]) // n - 1) / l["hz"]
    for k in range(0, len(b), 5):
        pontos += 1.0 if b[k + 1] == 1 else 0.5 if b[k + 1] == 2 else 0
    return pontos / n


def enxugar(l):
    n = l["dados"]
    quadros = len(l["posicoes"]) // n
    idx = list(range(0, quadros, PASSO))
    if idx[-1] != quadros - 1:
        idx.append(quadros - 1)
    p, q = [], []
    for f in idx:
        for d in range(n):
            x, y, z = l["posicoes"][f * n + d]
            p += [round(x * 100), round(y * 100), round(z * 100)]
            q += [round(c * 1000) for c in l["rotacoes"][f * n + d]]
    # o último quadro pode cair fora da grade de 30 Hz: guardamos o tempo de cada quadro amostrado
    tempos = [round(f / l["hz"] * 1000) for f in idx]
    b = l["batidas"]
    batidas = []
    for k in range(0, len(b), 5):
        batidas += [round(b[k] * 1000), int(b[k + 1]), int(b[k + 2]), int(b[k + 3]), round(b[k + 4] * 10)]
    return {"n": n, "esp": round(l["espacamento"], 4), "t": tempos,
            "ini": [round(x * 1000) for x in l["inicios"]], "rep": [round(x * 1000) for x in l["repousos"]],
            "fac": l["faces_finais"], "b": batidas, "p": p, "q": q}


def main():
    fonte = json.loads(Path(sys.argv[1]).read_text())
    saida = []
    for n in range(1, 6):
        ls = sorted([l for l in fonte if l["dados"] == n], key=agitacao)
        escolha = [ls[round(i * (len(ls) - 1) / (POR_QUANTIDADE - 1))] for i in range(POR_QUANTIDADE)]
        saida += [enxugar(l) for l in escolha]
    texto = ("/* gerado por tools/lancamentos/montar.py: rolagens gravadas com física 3D (do Cronomotor).\n"
             " * Posições em centésimos de lado do dado (x direita, y altura, z para o jogador); rotações em milésimos\n"
             " * (quatérnios x,y,z,w); tempos em ms; batidas = [t, tipo (0 feltro, 1 dado, 2 aro), dado, outro, impulso×10]. */\n"
             "(function (r, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else r.LANCAMENTOS = f(); })"
             "(typeof self !== 'undefined' ? self : this, function () { return " + json.dumps(saida, separators=(",", ":")) + "; });\n")
    alvo = RAIZ / "js" / "lancamentos.js"
    alvo.write_text(texto, encoding="utf-8")
    print(f"{alvo.relative_to(RAIZ)}: {len(saida)} lançamentos, {len(texto) // 1024} KB")


if __name__ == "__main__":
    main()
