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
