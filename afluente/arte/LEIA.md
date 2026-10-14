# Arte 3D do Afluente

Árvores, casas, trigo, plantas, pedras e partículas são modelados e renderizados com o Blender (via o módulo Python `bpy`), sem arquivos .blend: tudo é gerado por código.

- `afluente_sprites.py`: monta cada modelo low-poly, ilumina (sol quente + céu), renderiza em Cycles com fundo transparente e sombra num "shadow catcher". Câmera ortográfica a 52°, a mesma para todos, então os tamanhos relativos se mantêm (1 unidade = raio do hexágono).
- `montar_atlas.py`: recorta os PNGs, tira o véu de sombra quase invisível e monta `atlas.png` + `atlas.json` (`[x, y, w, h, âncora x, âncora y, px por unidade]`).
- O protótipo embute o atlas no HTML (cerca de 420 KB).
- `agua.py` renderiza a água (24 quadros em laço, leito de areia e seixos, cáusticas); `montar_agua.py` monta `agua.webp`:
  `venv/bin/python agua.py quadros/ && venv/bin/python montar_agua.py quadros/ agua.webp`
- `montar_atlas.py` também cria a versão seca de cada modelo (`nome~d`): plantas menores e cor de palha, construções desbotadas.

## Regenerar

```sh
python3 -m venv venv && venv/bin/pip install bpy pillow
venv/bin/python afluente_sprites.py saida/
venv/bin/python montar_atlas.py saida/ atlas.png atlas.json
```

Depois, reconstrua a página do protótipo para embutir o atlas novo.

## Leito seco (`leito_seco.py`)

- Reaproveita a cena de `agua.py` (câmera, sol, areia e seixos) sem a superfície da água.
- Acrescenta uma crosta de barro rachado:
  - os pontos vêm de uma grade 7×7 com sorteio, para não haver pontos colados, que criavam faixas escuras;
  - as rachaduras são feitas com Worley;
  - as placas têm relevo de verdade (bump).
- Saída: `leito_seco.png` com 400×316 px por período. No jogo vira `leito_seco.webp` e é usada como padrão ancorado no mundo, com a mesma escala da água.

Uso: `python leito_seco.py <pasta>` (com o `bpy` instalado no ambiente, como em `agua.py`).

## v1.2: modelos novos e atlas sem versões secas

- **Modelos novos**: `tree_d` e `tree_e` (formas de copa), `pequi`, `lobeira`, `ipe_white`, `canela`, `tuft_gold`, `sunflower`, `corn`, `fence`, `well`, `garden`, `scarecrow`, `cart`, `chickens`, `rock_b`, `log`, `house_d` (taipa e palha), `house_c_terra`, `capybara`, `egret` e `loboguara`.
- **Renderizar só alguns**: `SOMENTE=pequi,lobeira venv/bin/python afluente_sprites.py saida/` acrescenta ao `meta.json` que já existe.
- **Atlas**: `montar_atlas.py` não gera mais as versões secas (`~d`). No jogo, a secura é um campo contínuo desenhado por cima do vale. `SECOS=1` volta a gerá-las. Atlas de 1024 px de largura, com 56 sprites, em 385 KB.

## v1.4: folhas, palha, capim, bichos e vila

- **Copas de folhas** (`canopy()`): cartões em losango sobre uma casca elipsoide em volta de um miolo escuro, com cor por vértice e material translúcido (`leaf_mat`). O `blob()` usa isso automaticamente nas folhagens de árvore.
- **Versões secas**: `SECAS=1 venv/bin/python afluente_sprites.py saida/` renderiza `<nome>_seco` (copa ocre e ferrugem, metade das folhas) para as árvores, o pequizeiro, a lobeira e o arbusto.
- **Materiais**:
  - `straw_mat()`: palha com fibras, usada nos fardos, no carro, no telhado de taipa e nos sacos;
  - `blades()`: lâminas de capim curvas, usadas em `tuft` e `tuft_gold`.
- **Modelos novos**:
  - `sheep_a` e `sheep_b` (ovelha em pé e pastando);
  - `pen` (cercado com cocho);
  - `sobrado` e `sobrado_b`, `venda`, `coreto`;
  - `cow`, refeito como gado curraleiro caramelo.
- **WebP**: depois de montar o atlas, `python3 -c "from PIL import Image;Image.open('atlas.png').save('atlas.webp','WEBP',quality=90,method=6)"`. O jogo embute o `atlas.webp`.
## v1.5: fauna animada, partículas novas e atualização parcial do atlas

- **Instalar o Blender como módulo** (o `bpy` só existe para Python 3.11):
  `uv venv -p 3.11 venv && uv pip install --python venv/bin/python bpy pillow`
- **Fauna** (`fauna.py`): 11 bichos com juntas e duas animações de 8 quadros ("para" e "anda").
  ```sh
  AMOSTRAS=40 venv/bin/python fauna.py fauna_saida/      # ~7 min em 4 núcleos; SOMENTE=onca,lobo para refazer só alguns
  venv/bin/python montar_fauna.py fauna_saida/ fauna.webp fauna.json
  ```
  `PREVIA=1 AMOSTRAS=16` renderiza só 2 quadros por animação, para conferir a modelagem.
- **Partículas** (`afluente_sprites.py`, dicionário `FX`):
  - folhas `leaf`, `leaf2` e `leaf3`;
  - pétalas `petal`, `petal2` e `petal3`;
  - `drop`, `puff` e `sparkle`;
  - borboletas `butterfly` e `butterfly2`.
  ```sh
  SOMENTE=fx_leaf,fx_leaf2,... venv/bin/python afluente_sprites.py fx_saida/
  venv/bin/python atualizar_atlas.py fx_saida/ atlas.png atlas.json   # troca só esses sprites no atlas atual
  ```
- **Embutir no protótipo**: `python3 embutir.py` grava `ATLAS`/`atlasImg` e `FATLAS`/`faunaImg` em `prototipo/afluente.html`. Depois rode `sh ../sim/gerar_index.sh`.
- **Sombras**: o jogo separa, ao carregar, a sombra assada de cada sprite (pixels escuros com alfa ≤ 205) e a desenha recortada pelo chão da peça.
