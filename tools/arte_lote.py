#!/usr/bin/env python3
"""Arte em lote, no mesmo processo do Steam Dice (Cronomotor): muitos rascunhos baratos, peneira do crítico,
o dono escolhe, novos candidatos a partir da escolha e a aprovação final.

    python3 tools/arte_lote.py rascunhos arte/lotes/revisao-1.json [--so gordinho,galgo] [--seco]
    python3 tools/arte_lote.py candidatos arte/lotes/revisao-1.json gordinho=C galgo=A [--n 3] [--qualidade medium]
    python3 tools/arte_lote.py prancha arte/lotes/revisao-1.json r1 gordinho=CAD galgo=BEF   # só as que passaram
    python3 tools/arte_lote.py aprovar arte/lotes/revisao-1.json gordinho=r2/B cacto=r1/D

1. rascunhos: N opções por item em "low" (em paralelo), em builds/arte/<lote>/r1/<id>/<letra>.png, e a prancha
   builds/arte/<lote>/r1/prancha-<grupo>.jpg: cada opção grande e no tamanho real (40 px, no claro e no escuro),
   com letras grandes. O crítico (.claude/agents/critico-de-icones.md) olha só a prancha e deixa passar 3 por item.
2. candidatos: a letra escolhida vira a referência (edição com input_fidelity alta) e saem novas versões mais
   acabadas, em r2 (depois r3...), com a prancha.
3. aprovar: a versão escolhida vai para a pasta de fontes do arquivo de pedidos do item (arte/fonte ou
   arte/fonte/cartas) e o js de saída é refeito (tools/arte_icones.py --embutir).

O lote (arte/lotes/*.json) diz, por item: o arquivo de pedidos (que dá o estilo, a borda e o fundo), o texto,
quantos rascunhos, variantes do texto (para os rascunhos explorarem ideias diferentes), e opcionalmente
"mestra" (a imagem aprovada que serve de base: só muda o que o texto pede) ou "estilo" (imagens aprovadas do
jogo, mandadas como referência de estilo com fidelidade baixa: o traço e a paleta, não o personagem).
Precisa de OPENAI_API_KEY (como o arte_icones.py). Nada sai do builds/ sem "aprovar".
"""
import io
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
import arte_icones as A  # noqa: E402  (o pedido, a API, o recorte do fundo e o embutir moram lá)

RAIZ = A.RAIZ
LETRAS = "ABCDEFGHIJKL"
PARALELO = 4          # a API aceita 20 imagens de referência por minuto
FONTE_LETRA = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
TXT_ESTILO = ("The attached image shows finished art from the same game. Match its outline weight, flat cel shading, "
              "palette and finish exactly, but draw a completely different subject, the one described below; "
              "do not copy the subjects of the attached image.")
TXT_MESTRA = ("The attached image is the approved artwork. Change only what is asked below and keep everything else "
              "identical: same character, pose, framing, colors, outline and background.")
TXT_REFINO = ("The attached image is the chosen draft. Keep its design, pose, composition and colors, and redraw it "
              "as the clean finished version: crisp uniform outline, tidy flat shapes, no stray marks.")


def carregar(lote_arq):
    lote = json.loads(Path(lote_arq).read_text(encoding="utf-8"))
    lote["_nome"] = Path(lote_arq).stem
    return lote


def cfg_de(item):
    return json.loads((RAIZ / item["pedidos"]).read_text(encoding="utf-8"))


def prompt(item_id, item, texto, modo):
    """o mesmo pedido do arte_icones.py (estilo do arquivo de pedidos, fundo, borda, SPECIAL), com o texto do lote"""
    cfg = dict(cfg_de(item), referencia=None, itens={item_id: texto}, retratos={item_id: texto})
    base = A.prompt_de(cfg, item_id)
    abre = {"estilo": TXT_ESTILO, "mestra": TXT_MESTRA, "refino": TXT_REFINO}.get(modo)
    return f"{abre} {base}" if abre else base


def folha_estilo(caminhos, destino):
    """junta as imagens de estilo numa folha só (o pedido de edição leva uma imagem)"""
    ims = [Image.open(RAIZ / c).convert("RGBA").resize((512, 512)) for c in caminhos]
    folha = Image.new("RGBA", (512 * len(ims), 512), (0, 0, 0, 0))
    for i, im in enumerate(ims):
        folha.alpha_composite(im, (512 * i, 0))
    destino.parent.mkdir(parents=True, exist_ok=True)
    folha.save(destino)
    return destino


def pintar(item_id, item, texto, modo, ref, qualidade, saida, fidelidade="high"):
    if saida.exists():          # rodar de novo completa o que faltou (limite da API, queda de conexão)
        return
    opaco = item_id in cfg_de(item).get("fundo_opaco", [])
    p = prompt(item_id, item, texto, modo)
    t0 = time.time()
    for tentativa in range(6):
        try:
            png = A.gerar(p, qualidade, ref, fundo="opaque" if opaco else "transparent", fidelidade=fidelidade)
            break
        except SystemExit as e:     # o arte_icones.py encerra no erro; aqui o limite por minuto só pede espera
            if "429" not in str(e) or tentativa == 5:
                print(f"  {item_id}: {e}", flush=True); return
            time.sleep(25)
    if opaco:
        png = A.recortar_fundo(png)
    saida.parent.mkdir(parents=True, exist_ok=True)
    saida.write_bytes(png)
    saida.with_suffix(".json").write_text(json.dumps({"prompt": p, "qualidade": qualidade, "modo": modo,
        "referencia": str(ref.relative_to(RAIZ)) if ref else None, "fidelidade": fidelidade if ref else None}, ensure_ascii=False, indent=1))
    print(f"  {saida.relative_to(RAIZ)} ({time.time() - t0:.0f} s)", flush=True)


def pasta(lote, rodada):
    return RAIZ / "builds" / "arte" / lote["_nome"] / rodada


def prancha(lote, rodada, ids, filtro=None, sufixo=""):
    """uma linha por item: cada opção grande e no tamanho real (40 px) no claro e no escuro, com a letra.
    filtro {id: "CAD"} mostra só essas letras, nessa ordem (a peneira do crítico), em prancha-<grupo>-<sufixo>.jpg"""
    base = pasta(lote, rodada)
    grupos = {}
    for i in ids:
        grupos.setdefault(lote["itens"][i].get("grupo", "lote"), []).append(i)
    fonte, fonte_p = ImageFont.truetype(FONTE_LETRA, 46), ImageFont.truetype(FONTE_LETRA, 26)
    saidas = []
    for grupo, gids in grupos.items():
        linhas = [(i, [base / i / f"{l}.png" for l in filtro[i]] if filtro and i in filtro else sorted(base.joinpath(i).glob("*.png"))) for i in gids]
        linhas = [(i, arqs) for i, arqs in linhas if arqs]
        if not linhas:
            continue
        cols = max(len(a) for _, a in linhas)
        cel, rot = 260, 200
        folha = Image.new("RGB", (rot + cols * cel, len(linhas) * (cel + 70) + 20), (251, 241, 223))
        d = ImageDraw.Draw(folha)
        for r, (i, arqs) in enumerate(linhas):
            y = 20 + r * (cel + 70)
            d.text((14, y + cel // 2 - 16), i, fill=(58, 42, 46), font=fonte_p)
            for c, arq in enumerate(arqs):
                x = rot + c * cel
                im = Image.open(arq).convert("RGBA")
                folha.paste(im.resize((220, 220), Image.LANCZOS), (x + 20, y), im.resize((220, 220), Image.LANCZOS))
                mini = im.resize((40, 40), Image.LANCZOS)
                d.rectangle((x + 20, y + 226, x + 70, y + 276), fill=(251, 241, 223))
                d.rectangle((x + 76, y + 226, x + 126, y + 276), fill=(46, 35, 48))
                folha.paste(mini, (x + 25, y + 231), mini)
                folha.paste(mini, (x + 81, y + 231), mini)
                d.text((x + 150, y + 222), arq.stem, fill=(196, 132, 58), font=fonte)
        destino = base / f"prancha-{grupo}{'-' + sufixo if sufixo else ''}.jpg"
        folha.save(destino, quality=88)
        saidas.append(destino)
        print(f"prancha: {destino.relative_to(RAIZ)}")
    return saidas


def rascunhos(lote, so, seco):
    ids = so or list(lote["itens"])
    tarefas = []
    for i in ids:
        item = lote["itens"][i]
        n = item.get("n", lote.get("n", 6))
        textos = item.get("variantes") or [item["texto"]]
        ref, modo, fid = None, None, "high"
        if item.get("mestra"):
            ref, modo = RAIZ / item["mestra"], "mestra"
        elif item.get("estilo"):
            ref, modo, fid = folha_estilo(item["estilo"], pasta(lote, "r1") / f"_estilo-{i}.png") if not seco else None, "estilo", "low"
        for k in range(n):
            texto = textos[k % len(textos)]
            if seco:
                print(f"--- {i} {LETRAS[k]} ({modo or 'só texto'})\n{prompt(i, item, texto, modo)}\n")
                continue
            tarefas.append((i, item, texto, modo, ref, "low", pasta(lote, "r1") / i / f"{LETRAS[k]}.png", fid))
    if seco:
        return
    for t in tarefas:
        t[6].parent.mkdir(parents=True, exist_ok=True)
    print(f"{len(tarefas)} rascunhos em low, {PARALELO} por vez…", flush=True)
    with ThreadPoolExecutor(PARALELO) as ex:
        list(ex.map(lambda t: pintar(*t), tarefas))
    prancha(lote, "r1", ids)


def proxima_rodada(lote):
    n = 2
    while pasta(lote, f"r{n}").exists():
        n += 1
    return f"r{n}"


def localizar(lote, i, escolha):
    """'C' (rodada 1) ou 'r2/B'"""
    rodada, letra = escolha.split("/") if "/" in escolha else ("r1", escolha)
    arq = pasta(lote, rodada) / i / f"{letra}.png"
    if not arq.exists():
        sys.exit(f"Não achei {arq.relative_to(RAIZ)}")
    return arq


def candidatos(lote, escolhas, n, qualidade):
    rodada = proxima_rodada(lote)
    tarefas = []
    for i, escolha in escolhas.items():
        item = lote["itens"][i]
        ref = localizar(lote, i, escolha)
        texto = item.get("texto_final", item["texto"])
        for k in range(n):
            tarefas.append((i, item, texto, "refino", ref, qualidade, pasta(lote, rodada) / i / f"{LETRAS[k]}.png", "high"))
    print(f"{len(tarefas)} candidatos em {qualidade} ({rodada})…", flush=True)
    with ThreadPoolExecutor(PARALELO) as ex:
        list(ex.map(lambda t: pintar(*t), tarefas))
    prancha(lote, rodada, list(escolhas))


def aprovar(lote, escolhas):
    feitos = set()
    for i, escolha in escolhas.items():
        item = lote["itens"][i]
        arq = localizar(lote, i, escolha)
        cfg = cfg_de(item)
        fonte = A.opcoes(cfg)[0]
        fonte.mkdir(parents=True, exist_ok=True)
        destino_id = item.get("id", i)
        (fonte / f"{destino_id}.png").write_bytes(arq.read_bytes())
        (fonte / f"{destino_id}.json").write_text(arq.with_suffix(".json").read_text(encoding="utf-8"), encoding="utf-8")
        print(f"aprovado: {i} ← {arq.relative_to(RAIZ)} → {(fonte / destino_id).relative_to(RAIZ)}.png")
        feitos.add(item["pedidos"])
    for pedidos in feitos:
        A.PEDIDOS = RAIZ / pedidos
        A.embutir(json.loads((RAIZ / pedidos).read_text(encoding="utf-8")))


def main():
    args = sys.argv[1:]
    if len(args) < 2 or args[0] not in ("rascunhos", "candidatos", "aprovar", "prancha"):
        sys.exit(__doc__)
    acao, lote = args[0], carregar(args[1])
    opc = {a.split("=")[0]: a.split("=")[1] for a in args[2:] if "=" in a and not a.startswith("--")}
    so = None
    if "--so" in args:
        so = args[args.index("--so") + 1].split(",")
    n = int(args[args.index("--n") + 1]) if "--n" in args else 3
    qualidade = args[args.index("--qualidade") + 1] if "--qualidade" in args else "medium"
    if acao == "rascunhos":
        rascunhos(lote, so, "--seco" in args)
    elif acao == "candidatos":
        candidatos(lote, opc, n, qualidade)
    elif acao == "prancha":     # prancha arte/lotes/x.json r1 gordinho=CAD galgo=BEF  (a peneira, só essas letras)
        rodada = args[2] if len(args) > 2 and "=" not in args[2] else "r1"
        prancha(lote, rodada, list(opc) or so or list(lote["itens"]), opc or None, "peneira" if opc else "")
    else:
        aprovar(lote, opc)


if __name__ == "__main__":
    main()
