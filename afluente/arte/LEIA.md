# Arte 3D do Afluente

Árvores, casas, trigo, plantas, pedras e partículas são modelados e renderizados com o Blender (via o módulo Python `bpy`), sem arquivos .blend: tudo é gerado por código.

- `afluente_sprites.py`: monta cada modelo low-poly, ilumina (sol quente + céu), renderiza em Cycles com fundo transparente e sombra num "shadow catcher". Câmera ortográfica a 52°, a mesma para todos, então os tamanhos relativos se mantêm (1 unidade = raio do hexágono).
- `montar_atlas.py`: recorta os PNGs, tira o véu de sombra quase invisível e monta `atlas.png` + `atlas.json` (`[x, y, w, h, âncora x, âncora y, px por unidade]`).
- O protótipo embute o atlas no HTML (cerca de 66 KB).

## Regenerar

```sh
python3 -m venv venv && venv/bin/pip install bpy pillow
venv/bin/python afluente_sprites.py saida/
venv/bin/python montar_atlas.py saida/ atlas.png atlas.json
```

Depois, reconstrua a página do protótipo para embutir o atlas novo.
