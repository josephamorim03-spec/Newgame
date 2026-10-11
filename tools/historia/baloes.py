#!/usr/bin/env python3
"""Grava em arte/historia.json ("baloes") os ajustes feitos no editor de balões (a página publicada com
tools/historia/quadros.py paginas --editor, coleção "baloes" do banco dela).

    python3 tools/historia/baloes.py PASTA     # PASTA: os documentos lidos do banco, um JSON por balão (PASTA/baloes/<chave>.json)

Cada chave é página_quadro[_oOpção]_balão; cada ajuste tem x, y (canto de cima à esquerda) e w (largura) em % do quadro,
fs (a escala da letra), tx, ty (a ponta do rabinho, em % do quadro; sem eles, o rabinho é o automático) e semRabo.
Um balão que voltou ao automático no editor some do banco e, aqui, do arquivo. Depois de gravar, refaz os quadros do gibi do
jogo (tools/historia/quadros.py jogo), para o jogo mostrar os balões no lugar novo.
"""
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
PEDIDOS = RAIZ / "arte" / "historia.json"
CAMPOS = ("x", "y", "w", "fs", "tx", "ty", "semRabo")


def main():
    pasta = Path(sys.argv[1]) / "baloes"
    cfg = json.loads(PEDIDOS.read_text(encoding="utf-8"))
    novos = {}
    for arq in sorted(pasta.glob("*.json")):
        d = json.loads(arq.read_text(encoding="utf-8"))
        d = d.get("data", d)                           # o arquivo do banco traz o corpo em "data" (ou direto)
        aj = {k: d[k] for k in CAMPOS if d.get(k) is not None and d.get(k) is not False}
        if "x" in aj and "y" in aj:
            novos[arq.stem] = aj
    antes = cfg.get("baloes", {})
    cfg["baloes"] = novos
    PEDIDOS.write_text(json.dumps(cfg, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(novos)} balões ajustados ({len(set(novos) - set(antes))} novos, {len(set(antes) - set(novos))} voltaram ao automático)")
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import quadros                                     # o gibi do jogo leva os balões ajustados
    quadros.jogo(cfg)


if __name__ == "__main__":
    main()
