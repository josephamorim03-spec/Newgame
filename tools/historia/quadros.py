#!/usr/bin/env python3
"""Os quadros do modo história: pinta as artes com a API de imagem da OpenAI e monta as páginas para revisar.

    python3 tools/historia/quadros.py                     # pinta as artes de arte/historia.json que ainda não existem
    python3 tools/historia/quadros.py p-mesa c1-sapo      # só estas (refaz se já existirem)
    python3 tools/historia/quadros.py --refazer           # todas, de novo
    python3 tools/historia/quadros.py --seco [ids...]     # mostra os pedidos, não gasta nada
    python3 tools/historia/quadros.py --qualidade high    # low | medium (padrão) | high
    python3 tools/historia/quadros.py paginas [SAIDA.html] [--piloto]   # monta as páginas (padrão: builds/historia-paginas.html)
    python3 tools/historia/quadros.py narizes [ids...]        # a folha de modelo do nariz (arte/historia/narizes/)
    python3 tools/historia/quadros.py pagina-base            # o papel do caderno de receitas (arte/historia/pagina-base.png)

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
import re
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import arte_icones as A  # noqa: E402  (a chamada à API mora lá)

RAIZ = A.RAIZ
PEDIDOS = RAIZ / "arte" / "historia.json"
QUADROS = RAIZ / "arte" / "historia" / "quadros"
NARIZES = RAIZ / "arte" / "historia" / "narizes"
FALAS = RAIZ / "docs" / "historia_piadas.json"
MODELO_PAGINA = RAIZ / "tools" / "historia" / "paginas_modelo.html"
PARALELO = 4
LADO_PAGINA = 960      # a largura de cada quadro nas páginas de revisão


PAGINA_BASE = NARIZES.parent / "pagina-base.png"   # o papel do caderno de receitas: toda receita é desenhada em cima dele


def prompt_de(cfg, id_):
    a = cfg["artes"][id_]
    if a.get("pagina"):
        return cfg["pagina"]["desenho"] + a["texto"]
    partes = []
    if a.get("nariz") and "diana" in a["quem"]:
        partes.append(cfg["referencia_nariz"])       # a folha de modelo do nariz vem primeiro e manda no enfeite
    if a["quem"]:
        partes.append(cfg["referencia"])
    partes.append(cfg["estilo"])
    partes += [cfg["personagens"][p] for p in a["quem"]]
    if a.get("nariz"):
        partes.append(cfg["narizes"][a["nariz"]])
    partes.append("SCENE: " + a["texto"])
    return " ".join(partes)


def refs_de(cfg, id_):
    a = cfg["artes"][id_]
    if a.get("pagina"):
        return [PAGINA_BASE]
    refs = []
    for p in a["quem"]:
        modelo = NARIZES / f"{a['nariz']}.png"
        refs.append(modelo if p == "diana" and a.get("nariz") and modelo.exists() else RAIZ / "arte" / "fonte" / f"{p}.png")
    return refs or None


def tamanho_de(cfg, id_):
    return "1024x1536" if cfg["artes"][id_].get("pagina") else cfg["tamanho"]


def pintar(cfg, id_, qualidade):
    a = cfg["artes"][id_]
    if a.get("edicao"):                                # só corrige o que o dono apontou: a edição parte da arte atual (a original, sem a troca de bolinhas)
        atual = QUADROS / "originais" / f"{id_}.webp"
        atual = atual if atual.exists() else QUADROS / f"{id_}.webp"
        base = RAIZ / "builds" / "edicao" / f"{id_}.png"
        base.parent.mkdir(parents=True, exist_ok=True)
        Image.open(atual).convert("RGB").save(base)
        png = A.gerar("Edit the attached comic panel. " + a["edicao"], qualidade, base, fundo="opaque", tamanho=tamanho_de(cfg, id_), modelo=cfg["modelo"])
        Image.open(io.BytesIO(png)).convert("RGB").save(QUADROS / f"{id_}.webp", "WEBP", quality=88, method=6)
        (QUADROS / "originais" / f"{id_}.webp").unlink(missing_ok=True)   # a nova arte é a nova original (os dados são refeitos depois)
        return id_
    png = A.gerar(prompt_de(cfg, id_), qualidade, refs_de(cfg, id_), fundo="opaque", tamanho=tamanho_de(cfg, id_), modelo=cfg["modelo"])
    if (QUADROS / "originais" / f"{id_}.webp").exists():   # arte nova: os dados mudaram de lugar
        (QUADROS / "originais" / f"{id_}.webp").unlink()
        print(f"  {id_}: arte nova; marque de novo os dados dela (\"dados\" em arte/historia.json) e rode tools/historia/dados_quadros.py", flush=True)
    im = Image.open(io.BytesIO(png)).convert("RGB")
    im.save(QUADROS / f"{id_}.webp", "WEBP", quality=88, method=6)
    (QUADROS / f"{id_}.json").write_text(json.dumps({"prompt": prompt_de(cfg, id_), "referencias": [str(r.relative_to(RAIZ)) for r in refs_de(cfg, id_) or []],
                                                       "qualidade": qualidade, "modelo": cfg["modelo"], "tamanho": tamanho_de(cfg, id_)},
                                                      ensure_ascii=False, indent=1), encoding="utf-8")
    return id_


def pagina_base(cfg):
    png = A.gerar(cfg["pagina"]["base"], "high", fundo="opaque", tamanho="1024x1536", modelo=cfg["modelo"])
    PAGINA_BASE.parent.mkdir(parents=True, exist_ok=True)
    PAGINA_BASE.write_bytes(png)
    print(PAGINA_BASE.relative_to(RAIZ))


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


def paginas(cfg, saida, piloto=False):
    falas = {f["id"]: f for f in json.loads(FALAS.read_text(encoding="utf-8"))["falas"]}
    pags = [p for p in cfg["paginas"] if p.get("piloto") or not piloto]
    usadas = {q.get("arte") for p in pags for q in p["quadros"]} | {o[0] for p in pags for q in p["quadros"] for o in q.get("opcoes", [])}
    imagens = {}
    for id_ in sorted(usadas - {""}):
        if cfg["artes"].get(id_, {}).get("mural"):
            continue
        arq = QUADROS / f"{id_}.webp"
        if not arq.exists():
            continue
        im = Image.open(arq).convert("RGB")
        lado = LADO_PAGINA if im.width >= im.height else LADO_PAGINA * 2 // 3     # as páginas do caderno são em pé
        im = im.resize((lado, round(im.height * lado / im.width)), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, "WEBP", quality=78, method=6)
        imagens[id_] = "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()
    def nova(id_):   # a arte já saiu no pedido novo (estilo chapado, folha do nariz, espaço do balão, receita no papel)?
        meta = QUADROS / f"{id_}.json"
        return meta.exists() and ("SIMPLE: a few big flat" in meta.read_text(encoding="utf-8") or "DRAWN ON THE PAPER" in meta.read_text(encoding="utf-8"))
    campos = ("texto", "quem", "nariz", "boca", "cabeca", "dados", "dados_skin", "evitar", "lugar", "titulo", "espelho", "aba", "pagina", "mural")
    # o mural é montado na página com os retratos que o jogo já tem (a versão pintada, em data URI)
    retratos = {}
    if any(cfg["artes"].get(q.get("arte"), {}).get("mural") for p in pags for q in p["quadros"]):
        for linha in (RAIZ / "js" / "retratos_pintados.js").read_text(encoding="utf-8").splitlines():
            m = re.match(r'\s+([a-z]+): "(data:[^"]+)",', linha)
            if m:
                retratos[m.group(1)] = m.group(2)
    dados = {"paginas": [p for p in cfg["paginas"] if p.get("piloto") or not piloto],
             "artes": {k: {**{c: v[c] for c in campos if c in v}, "nova": nova(k)} for k, v in cfg["artes"].items()},
             "falas": {k: {"quem": f["quem"], "texto": f["texto"], "status": f["status"], "onde": f["onde"]} for k, f in falas.items()},
             "imagens": imagens, "murais": cfg.get("murais", {}), "retratos": retratos}
    js = json.dumps(dados, ensure_ascii=False).replace("</", "<\\/")
    saida.parent.mkdir(parents=True, exist_ok=True)
    saida.write_text(MODELO_PAGINA.read_text(encoding="utf-8").replace("/*DADOS*/null", js), encoding="utf-8")
    faltando = sorted(i for i in usadas - {""} - set(imagens) if not cfg["artes"].get(i, {}).get("mural"))
    print(f"{saida}: {len(pags)} páginas, {len(imagens)} artes, {saida.stat().st_size // 1024} KB"
          + (f"; ainda sem arte: {', '.join(faltando)}" if faltando else ""))


def narizes(cfg, ids):
    m = cfg["nariz_modelo"]
    ids = ids or list(m["itens"])
    NARIZES.mkdir(parents=True, exist_ok=True)
    def um(id_):
        # um enfeite já aprovado só muda o que o dono pediu: a edição parte da imagem dele, não do retrato
        if id_ in m.get("edicao", {}):
            p, base = m["edicao"][id_], RAIZ / m["bases"][id_]
        else:
            p, base = f'{m["regra"]} NOSE: {m["itens"][id_]}', RAIZ / "arte" / "fonte" / "diana.png"
        png = A.gerar(p, "high", base, fundo="opaque", modelo=cfg["modelo"])
        (NARIZES / f"{id_}.png").write_bytes(png)
        (NARIZES / f"{id_}.json").write_text(json.dumps({"prompt": p, "modelo": cfg["modelo"], "qualidade": "high"}, ensure_ascii=False, indent=1), encoding="utf-8")
        return id_
    with ThreadPoolExecutor(PARALELO) as ex:
        for feito in ex.map(um, ids):
            print(f"  {feito}", flush=True)


def main():
    cfg = json.loads(PEDIDOS.read_text(encoding="utf-8"))
    argv = sys.argv[1:]
    if argv[:1] == ["pagina-base"]:
        return pagina_base(cfg)
    if argv[:1] == ["narizes"]:
        return narizes(cfg, argv[1:])
    if argv[:1] == ["paginas"]:
        resto = [a for a in argv[1:] if a != "--piloto"]
        return paginas(cfg, Path(resto[0]) if resto else RAIZ / "builds" / "historia-paginas.html", "--piloto" in argv)
    gerar(cfg, argv)


if __name__ == "__main__":
    main()
