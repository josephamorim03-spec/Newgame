#!/usr/bin/env python3
"""Os quadros do modo história: pinta as artes com a API de imagem da OpenAI e monta as páginas para revisar.

    python3 tools/historia/quadros.py                     # pinta as artes de arte/historia.json que ainda não existem
    python3 tools/historia/quadros.py p-mesa c1-sapo      # só estas (refaz se já existirem)
    python3 tools/historia/quadros.py --refazer           # todas, de novo
    python3 tools/historia/quadros.py --seco [ids...]     # mostra os pedidos, não gasta nada
    python3 tools/historia/quadros.py --qualidade high    # low | medium (padrão) | high
    python3 tools/historia/quadros.py paginas [SAIDA.html]   # monta as páginas (padrão: builds/historia-paginas.html)

Cada arte é um desenho descrito no roteiro (docs/historia.md §7), sem texto: o pedido junta o estilo, o retrato pintado de
cada bicho do quadro (arte/fonte/<id>.png) como referência, o enfeite do nariz da Diana naquele capítulo e a cena.
Sai em arte/historia/quadros/<id>.webp (1536 × 1024, WebP alto, para revisar e regerar sem pesar o repositório) com o
pedido ao lado (<id>.json). As páginas juntam os quadros e põem por cima as falas de docs/historia_piadas.json, em
balões, com o estado de cada uma: as falas continuam passando pela aprovação do dono, e a arte não carrega texto.
Precisa de OPENAI_API_KEY (como o tools/arte_icones.py).
"""
import base64
import io
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import arte_icones as A  # noqa: E402  (a chamada à API mora lá)

RAIZ = A.RAIZ
PEDIDOS = RAIZ / "arte" / "historia.json"
QUADROS = RAIZ / "arte" / "historia" / "quadros"
FALAS = RAIZ / "docs" / "historia_piadas.json"
MODELO_PAGINA = RAIZ / "tools" / "historia" / "paginas_modelo.html"
PARALELO = 4
LADO_PAGINA = 960      # a largura de cada quadro nas páginas de revisão


def prompt_de(cfg, id_):
    a = cfg["artes"][id_]
    partes = [cfg["referencia"]] if a["quem"] else []
    partes.append(cfg["estilo"])
    partes += [cfg["personagens"][p] for p in a["quem"]]
    if a.get("nariz"):
        partes.append(cfg["narizes"][a["nariz"]])
    partes.append("SCENE: " + a["texto"])
    return " ".join(partes)


def refs_de(cfg, id_):
    return [RAIZ / "arte" / "fonte" / f"{p}.png" for p in cfg["artes"][id_]["quem"]] or None


def pintar(cfg, id_, qualidade):
    png = A.gerar(prompt_de(cfg, id_), qualidade, refs_de(cfg, id_), fundo="opaque", tamanho=cfg["tamanho"], modelo=cfg["modelo"])
    im = Image.open(io.BytesIO(png)).convert("RGB")
    im.save(QUADROS / f"{id_}.webp", "WEBP", quality=88, method=6)
    (QUADROS / f"{id_}.json").write_text(json.dumps({"prompt": prompt_de(cfg, id_), "referencias": [p for p in cfg["artes"][id_]["quem"]],
                                                       "qualidade": qualidade, "modelo": cfg["modelo"], "tamanho": cfg["tamanho"]},
                                                      ensure_ascii=False, indent=1), encoding="utf-8")
    return id_


def gerar(cfg, argv):
    qualidade = argv[argv.index("--qualidade") + 1] if "--qualidade" in argv else "medium"
    ids = [a for a in argv if not a.startswith("--") and a != qualidade]
    faltam = [i for i in ids if i not in cfg["artes"]]
    if faltam:
        sys.exit(f"Sem pedido para: {', '.join(faltam)}")
    if not ids:
        ids = [i for i in cfg["artes"] if "--refazer" in argv or not (QUADROS / f"{i}.webp").exists()]
    if "--seco" in argv:
        for i in ids:
            print(f"--- {i} (referências: {', '.join(cfg['artes'][i]['quem']) or 'nenhuma'})\n{prompt_de(cfg, i)}\n")
        return
    QUADROS.mkdir(parents=True, exist_ok=True)
    print(f"pintando {len(ids)} quadros ({cfg['modelo']}, {qualidade}, {PARALELO} por vez)…", flush=True)
    with ThreadPoolExecutor(PARALELO) as ex:
        for feito in ex.map(lambda i: pintar(cfg, i, qualidade), ids):
            print(f"  {feito}", flush=True)


def paginas(cfg, saida):
    falas = {f["id"]: f for f in json.loads(FALAS.read_text(encoding="utf-8"))["falas"]}
    usadas = {q.get("arte") for p in cfg["paginas"] for q in p["quadros"]} | {o[0] for p in cfg["paginas"] for q in p["quadros"] for o in q.get("opcoes", [])}
    imagens = {}
    for id_ in sorted(usadas - {""}):
        arq = QUADROS / f"{id_}.webp"
        if not arq.exists():
            continue
        im = Image.open(arq).convert("RGB")
        im = im.resize((LADO_PAGINA, round(im.height * LADO_PAGINA / im.width)), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, "WEBP", quality=78, method=6)
        imagens[id_] = "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()
    dados = {"paginas": cfg["paginas"], "artes": {k: {"texto": v["texto"], "quem": v["quem"], "nariz": v.get("nariz", "")} for k, v in cfg["artes"].items()},
             "falas": {k: {"quem": f["quem"], "texto": f["texto"], "status": f["status"], "onde": f["onde"]} for k, f in falas.items()},
             "imagens": imagens}
    js = json.dumps(dados, ensure_ascii=False).replace("</", "<\\/")
    saida.parent.mkdir(parents=True, exist_ok=True)
    saida.write_text(MODELO_PAGINA.read_text(encoding="utf-8").replace("/*DADOS*/null", js), encoding="utf-8")
    faltando = sorted(usadas - {""} - set(imagens))
    print(f"{saida}: {len(cfg['paginas'])} páginas, {len(imagens)} artes, {saida.stat().st_size // 1024} KB"
          + (f"; ainda sem arte: {', '.join(faltando)}" if faltando else ""))


def main():
    cfg = json.loads(PEDIDOS.read_text(encoding="utf-8"))
    argv = sys.argv[1:]
    if argv[:1] == ["paginas"]:
        return paginas(cfg, Path(argv[1]) if len(argv) > 1 else RAIZ / "builds" / "historia-paginas.html")
    gerar(cfg, argv)


if __name__ == "__main__":
    main()
