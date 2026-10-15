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

## v1.6: leito de riacho e casinha de taipa

- `leito_seco.py` não cobre mais tudo com placas rachadas:
  - areia com marcas de correnteza (ondas periódicas);
  - manchas de barro (picos de um ruído de baixa frequência) com rachaduras finas só dentro delas;
  - os mesmos seixos da água.
- `house_rustic` (`house_d`): paredes mais altas, barrado, batentes azuis, telhado de palha íngreme sem fiadas.
- `straw_mat` passou a guardar a cor base, para que a cumeeira saia marrom-palha e não cinza.
- `cow`: gado curraleiro caramelo (v1.4).
- v1.8: `cart` com `hay_fiber_mat()` (faixas tortas cruzadas, sem anéis) e `hay_strands()` (fios soltos que seguem o monte e caem pelas bordas). Para trocar só ele no atlas: `atualizar_atlas.py` com uma pasta contendo `cart.png` e o `meta.json` dele, depois `embutir.py`.

## v1.9: fauna com corpo contínuo (metaball) e esqueleto

`fauna.py` foi refeito. O corpo de cada bicho deixou de ser um conjunto de esferas encostadas e virou uma superfície contínua só:

- **Corpo** (`Corpo`): um metaball com tubos de raio variável (tronco, pescoço, cauda, pernas). Os tubos se fundem nas juntas como músculo sob a pele.
  - O raio passado é o raio **visível**: as constantes `KB` (elemento sozinho) e `KC` (tubo denso) convertem para o raio de influência.
  - `RESOLUCAO` (padrão 0,0021 u) controla a densidade da malha no render.
- **Esqueleto** (`Sk`): cinemática direta, com quadril, joelho, pescoço, cabeça, cauda, asa e mão.
  - Cada ponto do modelo é escrito na pose de repouso, junto com a junta a que pertence.
  - A cada quadro, a pose recalcula as matrizes e o bicho inteiro é refeito.
  - O joelho dobra na fase em que a pata volta para a frente.
- **Malhas de detalhe** (`loft`): bicos, orelhas, pernas finas de ave, dedos, poleiros e mourão são anéis elípticos ao longo de um caminho, com 10 a 14 lados.
  - Cada malha ganha UV ao longo do comprimento. É isso que faz o degradê do bico do tucano, com a ponta preta.
  - As asas e a cauda da arara são placas de duas cores: azul por cima, amarelo por baixo.
- **Pelagem** (`pele`): um material só por bicho, com:
  - degradê pela normal;
  - fios de ruído fino;
  - regiões por coordenada do bicho (`abaixo`, `acima`, `elip`, `faixa` com limite): meias e crina pretas do lobo, faixa do tamanduá, barriga clara da onça;
  - rosetas de Voronoi na onça.

```sh
PREVIA=1 AMOSTRAS=12 SOMENTE=onca,lobo venv/bin/python fauna.py /tmp/fz   # 2 quadros por animação, ~4 s por bicho
AMOSTRAS=40 venv/bin/python fauna.py fauna_saida/                        # 184 quadros, ~6 min
venv/bin/python montar_fauna.py fauna_saida/ fauna.webp fauna.json && python3 embutir.py && sh ../sim/gerar_index.sh
```

O tamanho no jogo não depende do render. O jogo mede a largura do corpo no atlas e aplica a tabela `FLEN` do protótipo. No joão-de-barro e nos bichos de poleiro, essa largura inclui o ninho ou o poleiro: se eles mudarem de tamanho, ajuste `FLEN`.

## v1.10: pedras facetadas e seixos

- `pedra()` em `afluente_sprites.py`: esfera subdividida com os vértices sacudidos ao acaso, base reta e chanfro leve nas quinas. Com `smooth=True` e `rough` baixo, vira seixo rolado.
- Sprites novos: `pebbles`, `pebbles_b` e `pebbles_c` (grupos de seixos de leito). `rock` e `rock_b` foram refeitos.
- Para refazer só esses sprites:
  ```sh
  SOMENTE=rock,rock_b,pebbles,pebbles_b,pebbles_c venv/bin/python afluente_sprites.py /tmp/rk
  venv/bin/python atualizar_atlas.py /tmp/rk atlas.png atlas.json
  ```
  Depois gere o `atlas.webp` e rode `embutir.py`.
## v2.0: geometria exata e nuvens

- `caixas.py` lê `atlas.png` e `atlas.json` e grava `caixas.json`, com o corpo de cada sprite (sem a sombra) e a faixa que toca o chão, relativos à âncora. `embutir.py` embute esse arquivo como `const BOX`. Rode os dois sempre que o atlas mudar.
- `nuvens.py <pasta>`: 4 cúmulos inteiros com volume (Cycles, 12 rebatimentos no volume), na câmera e no sol dos sprites.
- `TUFO=1 nuvens.py <pasta>`: 3 tufos com volume. Monte a faixa (3 × 256) em `tufos.webp`; o jogo usa esses tufos para desenhar as nuvens que se formam (v1.10).

## v2.0: moinho sem velas

- `windmill_torre`: só a torre, o capelo e a porta do moinho. As velas são desenhadas no jogo (`drawMill`), viradas para o vento e girando com ele, com a mesma projeção da câmera (ortográfica, 52°).
- A geometria do rotor segue `windmill()`: cubo a 0,3 u de altura e 0,125 u à frente do eixo; braços de 0,22 u; lona de 0,03 a 0,19 u do cubo, com 0,045 u de largura.
- Para refazer: `SOMENTE=windmill_torre venv/bin/python afluente_sprites.py saida_v20/`, depois `venv/bin/python atualizar_atlas.py saida_v20 atlas.png atlas.json`, o WebP e `python3 embutir.py`.
- O sprite `windmill`, com as velas, continua no atlas para o mapa de colisão (a pegada é a mesma).
