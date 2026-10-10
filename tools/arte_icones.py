#!/usr/bin/env python3
"""Pinta os retratos (rivais e ícones) com a API de imagem da OpenAI e os embute no jogo.

    python3 tools/arte_icones.py                  # todos os retratos de arte/retratos.json
    python3 tools/arte_icones.py diana coruja     # só estes
    python3 tools/arte_icones.py --seco           # mostra os pedidos, não gasta nada
    python3 tools/arte_icones.py --qualidade high # low | medium (padrão) | high
    python3 tools/arte_icones.py --embutir        # só refaz js/retratos_pintados.js com o que já existe
    python3 tools/arte_icones.py --pedidos arte/cartas.json [ids...]   # os ícones das cartas (js/cartas_pintadas.js)

Precisa de OPENAI_API_KEY no ambiente (ARTE_MODELO troca o modelo; padrão gpt-image-1).
O estilo é o do jogo: cada pedido leva o vetor do personagem (arte/referencia/<id>.png, gerado por
tools/referencias.js) como referência, para a versão pintada manter o desenho, as marcas e o traço.
Sem a referência (ou se a API recusar a edição), o pedido vai só com o texto.
Cada imagem fica em arte/fonte/<id>.png (1024 px, fundo transparente, para revisar e regerar)
e entra no jogo como WebP de 160 px em js/retratos_pintados.js, embutida em data URI: funciona por
file://, no servidor e no HTML único, sem pedido extra de rede. Quem não tem versão pintada usa o vetor
de js/retratos.js. Para tirar um retrato pintado, apague arte/fonte/<id>.png e rode --embutir.
Personagens claros (os de "fundo_opaco" em arte/retratos.json) somem no fundo transparente da API, que
toma o pelo branco por fundo: esses vêm num verde-croma liso, que é recortado aqui (o pedido cru
fica em builds/crus/ para conferir o recorte).
Um "pelo" no arquivo de pedidos ({"alvo": [r, g, b], "contorno": [r, g, b], "itens": [...]}) alinha o branco do pelo
desses itens ao tom do retrato e, com "contorno", o traço escuro ao cacau do jogo (as patas da Diana, arte/patas.json,
usam o branco da cabeça dela: cada pintura vem num tom um pouco diferente).
Outro arquivo de pedidos (--pedidos) pode trocar a pasta das fontes ("fonte"), o arquivo de saída ("saida"),
a variável global ("variavel"), o prefixo da referência ("prefixo_referencia") e o lado do WebP ("lado"), e lista
os pedidos em "itens": é assim que os ícones das cartas usam esta mesma ferramenta (arte/cartas.json).
"""
import base64
import io
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
PEDIDOS = RAIZ / "arte" / "retratos.json"
REFERENCIA = RAIZ / "arte" / "referencia"
# o padrão é o dos retratos; o arquivo de pedidos pode trocar cada um destes
PADRAO = {"fonte": "arte/fonte", "saida": "js/retratos_pintados.js", "variavel": "RETRATOS_PINTADOS",
          "prefixo_referencia": "", "lado": 160}   # 160 px: o maior retrato na tela tem ~120 px em 1x; 160 cobre telas densas


def opcoes(cfg):
    o = {**PADRAO, **{k: cfg[k] for k in PADRAO if k in cfg}}
    return RAIZ / o["fonte"], RAIZ / o["saida"], o["variavel"], o["prefixo_referencia"], o["lado"]


def itens(cfg):
    return cfg.get("itens") or cfg["retratos"]


def ref_de(cfg, id_):
    return REFERENCIA / f"{opcoes(cfg)[3]}{id_}.png"


def prompt_de(cfg, id_):
    texto = itens(cfg)[id_]
    partes = [cfg["referencia"]] if ref_de(cfg, id_).exists() and cfg.get("referencia") else []
    if id_ in cfg.get("fundo_opaco", []):
        partes.append(cfg["estilo"].replace("plain transparent background", "no transparency"))
        partes.append(cfg["fundo_opaco_texto"])
    else:
        partes.append(cfg["estilo"])
    if cfg.get("borda") and id_ not in cfg.get("sem_borda", []):
        partes.append(cfg["borda"])     # a borda de adesivo, menos nos que vão pequenos dentro de botões (a moeda)
    if texto.startswith("SPECIAL."):
        partes.append(cfg["especial"])
        texto = texto[len("SPECIAL."):].strip()
    partes.append(texto)
    return " ".join(partes)


def multipart(campos, arquivos):
    """corpo multipart/form-data com os campos de texto e uma ou mais imagens (sem depender de requests)"""
    arquivos = arquivos if isinstance(arquivos, (list, tuple)) else [arquivos]
    nome = "image" if len(arquivos) == 1 else "image[]"     # várias referências (os quadros da história) vão como lista
    fronteira = "----diceduel" + base64.b16encode(os.urandom(8)).decode()
    partes = [f'--{fronteira}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode() for k, v in campos.items()]
    for arquivo in arquivos:
        partes.append(f'--{fronteira}\r\nContent-Disposition: form-data; name="{nome}"; filename="{arquivo.name}"\r\n'
                      f'Content-Type: image/png\r\n\r\n'.encode() + arquivo.read_bytes() + b"\r\n")
    partes.append(f"--{fronteira}--\r\n".encode())
    return b"".join(partes), f"multipart/form-data; boundary={fronteira}"


def gerar(prompt, qualidade, ref=None, fundo="transparent", fidelidade="high", tamanho="1024x1024", modelo=None):
    """ref: uma imagem ou uma lista delas (os quadros da história mandam o retrato de cada bicho do quadro).
    O gpt-image-2 (os dados e os quadros) não tem fundo transparente nem input_fidelity: esses dois só vão ao 1"""
    chave = os.environ.get("OPENAI_API_KEY")
    if not chave:
        sys.exit("Falta OPENAI_API_KEY no ambiente.")
    modelo = modelo or os.environ.get("ARTE_MODELO", "gpt-image-1")
    campos = {"model": modelo, "prompt": prompt, "size": tamanho, "quality": qualidade, "n": 1}
    if modelo.startswith("gpt-image-1"):
        campos["background"] = fundo
    if ref is not None:
        # com referência: edição a partir do vetor; "input_fidelity" alta segura o desenho original
        # (baixa quando a imagem é só referência de estilo, ver tools/arte_lote.py)
        corpo, tipo = multipart({**campos, "input_fidelity": fidelidade} if modelo.startswith("gpt-image-1") else campos, ref)
        url = "https://api.openai.com/v1/images/edits"
    else:
        corpo, tipo = json.dumps(campos).encode(), "application/json"
        url = "https://api.openai.com/v1/images/generations"
    req = urllib.request.Request(url, data=corpo, method="POST")
    req.add_header("Authorization", f"Bearer {chave}")
    req.add_header("Content-Type", tipo)
    for tentativa in range(4):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                return base64.b64decode(json.load(r)["data"][0]["b64_json"])
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="replace")[:400]
            if e.code == 400 and ref is not None:
                print(f"  a API recusou a edição com referência ({msg[:160]}); tentando só com o texto", flush=True)
                return gerar(prompt, qualidade, fundo=fundo, fidelidade=fidelidade, tamanho=tamanho, modelo=modelo)
            if e.code in (429, 500, 502, 503) and tentativa < 3:
                time.sleep(2 ** (tentativa + 2)); continue
            sys.exit(f"A API recusou ({e.code}): {msg}")
        except (urllib.error.URLError, ConnectionError, TimeoutError) as e:   # inclui a conexão que cai no meio da resposta
            if tentativa < 3:
                time.sleep(2 ** (tentativa + 2)); continue
            sys.exit(f"Sem conexão com a API: {e}")


def recortar_fundo(png_bytes, tolerancia=70):
    """apaga o fundo liso (verde-croma): a cor é lida nos cantos e sai da imagem toda, inclusive de vãos
    fechados como a alça da xícara; a borda serrilhada entre o fundo e o contorno fica meio transparente"""
    im = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    w, h = im.size
    px = im.load()
    cantos = [px[x, y][:3] for x, y in [(2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3)]]
    chave = tuple(sorted(c[i] for c in cantos)[1] for i in range(3))
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            d = max(abs(r - chave[0]), abs(g - chave[1]), abs(b - chave[2]))
            if d < tolerancia:
                px[x, y] = (r, g, b, 0)
            elif d < tolerancia * 1.6:
                px[x, y] = (r, g, b, int(255 * (d - tolerancia) / (tolerancia * 0.6)))
    buf = io.BytesIO()
    im.save(buf, "PNG")
    return buf.getvalue()


def furar(png_bytes):
    """abre o miolo de um objeto vazado (a boia): tudo o que é claro e ligado ao centro, até o contorno escuro
    (inclusive a borda de adesivo creme por dentro do furo), vira transparente; a faixa suavizada que encosta
    no contorno fica meio transparente, para a borda do furo não serrilhar"""
    im = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    w, h = im.size
    px = im.load()
    claro = lambda c: min(c[0], c[1]) > 185 and c[0] - c[2] < 85        # creme e branco (não o coral nem o contorno)
    furo, pilha = set(), [(w // 2, h // 2)]
    while pilha:
        x, y = pilha.pop()
        if (x, y) in furo or not (0 <= x < w and 0 <= y < h) or not claro(px[x, y]):
            continue
        furo.add((x, y))
        pilha += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    borda = {(x + dx, y + dy) for x, y in furo for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (2, 0), (-2, 0), (0, 2), (0, -2))} - furo
    for x, y in furo:
        px[x, y] = (0, 0, 0, 0)
    for x, y in borda:                       # transição: quanto mais claro, mais transparente
        if 0 <= x < w and 0 <= y < h:
            r, g, b, a = px[x, y]
            luz = (r + g + b) / 3
            if luz > 110:
                px[x, y] = (r, g, b, int(a * max(0.0, min(1.0, (235 - luz) / 125))))
    buf = io.BytesIO()
    im.save(buf, "PNG")
    return buf.getvalue()


def webp(png_bytes, lado_final):
    im = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    caixa = im.getbbox()                    # corta a sobra transparente e centraliza num quadrado
    if caixa:
        im = im.crop(caixa)
    lado = max(im.size)
    quadro = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    quadro.paste(im, ((lado - im.width) // 2, (lado - im.height) // 2))
    quadro = quadro.resize((lado_final, lado_final), Image.LANCZOS)
    buf = io.BytesIO()
    quadro.save(buf, "WEBP", quality=82, method=6)
    return buf.getvalue()


def alinhar(px, w, h, escolhe, alvo, mexe):
    """o tom mais comum entre os pixels que escolhe(cor) aceita vira o alvo; os pixels que mexe(cor) aceita andam juntos"""
    contagem = {}
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            c = px[x, y]
            if c[3] == 255 and escolhe(c):
                contagem[c[:3]] = contagem.get(c[:3], 0) + 1
    if not contagem:
        return
    base = max(contagem, key=contagem.get)
    fator = [alvo[i] / max(1, base[i]) for i in range(3)]
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and mexe((r, g, b, a)):
                px[x, y] = (min(255, round(r * fator[0])), min(255, round(g * fator[1])), min(255, round(b * fator[2])), a)


def tom_do_pelo(png_bytes, alvo, contorno=None):
    """alinha o branco do pelo a um tom (o do retrato do personagem): o branco mais comum da pintura vira o alvo, e os
    tons claros e neutros (pelo e a sombra dele) andam junto; o rosa, o contorno e o resto não mudam"""
    im = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    px = im.load()
    w, h = im.size
    alinhar(px, w, h, lambda c: min(c[:3]) > 220, alvo, lambda c: min(c[:3]) > 150 and max(c[:3]) - min(c[:3]) < 40)
    # o contorno (com contorno=[r, g, b]): o escuro mais comum vira o cacau do jogo, e os escuros andam junto
    if contorno:
        alinhar(px, w, h, lambda c: sum(c[:3]) < 260, contorno, lambda c: sum(c[:3]) < 330)
    buf = io.BytesIO()
    im.save(buf, "PNG")
    return buf.getvalue()


def embutir(cfg):
    fonte, saida, variavel, _, lado = opcoes(cfg)
    prontos = {}
    pelo = cfg.get("pelo") or {}
    for png in sorted(fonte.glob("*.png")):
        dados = png.read_bytes()
        if png.stem in cfg.get("furos", []):      # objetos vazados: o miolo sai transparente (ver furar)
            dados = furar(dados)
        if png.stem in pelo.get("itens", []):     # o pelo no tom do retrato (ver tom_do_pelo)
            dados = tom_do_pelo(dados, pelo["alvo"], pelo.get("contorno"))
        prontos[png.stem] = "data:image/webp;base64," + base64.b64encode(webp(dados, lado)).decode()
    linhas = [f"/* gerado por tools/arte_icones.py a partir de {PEDIDOS.relative_to(RAIZ)}: as versões pintadas (webp em data URI). Vazio = só vetor. */",
              f"window.{variavel} = Object.assign(window.{variavel} || {{}}, {{"]
    linhas += [f'  {k}: "{v}",' for k, v in prontos.items()]
    linhas.append("});")
    saida.write_text("\n".join(linhas) + "\n", encoding="utf-8")
    tamanho = saida.stat().st_size // 1024
    print(f"{saida.relative_to(RAIZ)}: {len(prontos)} pintados, {tamanho} KB")


def main():
    global PEDIDOS
    if "--pedidos" in sys.argv:
        PEDIDOS = (Path.cwd() / sys.argv[sys.argv.index("--pedidos") + 1]).resolve()
    args = [a for a in sys.argv[1:] if not a.startswith("--") and Path(a).resolve() != PEDIDOS]
    seco = "--seco" in sys.argv
    qualidade = "medium"
    if "--qualidade" in sys.argv:
        qualidade = sys.argv[sys.argv.index("--qualidade") + 1]
        args = [a for a in args if a != qualidade]
    cfg = json.loads(PEDIDOS.read_text(encoding="utf-8"))
    fonte = opcoes(cfg)[0]
    if "--embutir" in sys.argv:
        return embutir(cfg)
    ids = args or list(itens(cfg))
    desconhecidos = [i for i in ids if i not in itens(cfg)]
    if desconhecidos:
        sys.exit(f"Sem pedido para: {', '.join(desconhecidos)}")
    fonte.mkdir(parents=True, exist_ok=True)
    for id_ in ids:
        p = prompt_de(cfg, id_)
        if seco:
            tem = ref_de(cfg, id_).exists()
            print(f"--- {id_} ({'com o vetor de referência' if tem else 'só texto'})\n{p}\n"); continue
        print(f"pintando {id_}…", flush=True)
        ref = ref_de(cfg, id_)
        ref = ref if ref.exists() else None
        if id_ in cfg.get("fundo_opaco", []):
            cru = gerar(p, qualidade, ref, fundo="opaque")
            (RAIZ / "builds" / "crus").mkdir(parents=True, exist_ok=True)
            (RAIZ / "builds" / "crus" / f"{id_}.png").write_bytes(cru)
            png = recortar_fundo(cru)
        else:
            png = gerar(p, qualidade, ref)
        (fonte / f"{id_}.png").write_bytes(png)
        (fonte / f"{id_}.json").write_text(json.dumps({"prompt": p, "qualidade": qualidade, "referencia": bool(ref), "modelo": os.environ.get("ARTE_MODELO", "gpt-image-1")}, ensure_ascii=False, indent=1))
    if not seco:
        embutir(cfg)


if __name__ == "__main__":
    main()
