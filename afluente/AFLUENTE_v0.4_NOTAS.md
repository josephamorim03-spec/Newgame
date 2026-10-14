# Afluente v0.4 — o laço do Dorfromantik com água viva

**Status:** protótipo jogável (`prototipo/afluente.html`). Substitui o núcleo da v0.3 após o teste: "não achei divertido".

## Por que a v0.3 não divertia

- Decisões óbvias: plantar encostado na água e cavar rumo à foz quase sempre era o certo.
- Nada surpreendia: a água ia exatamente aonde se pintava; não havia risco nem reação em cadeia.
- Recompensa pequena e atrasada: pontos só a cada 5 jogadas.
- O simulador mediu "regras que não quebram" e diferença entre bots, não diversão.

## O que torna o Dorfromantik divertido (e o que trouxemos)

| Ingrediente | No Afluente v0.4 |
|---|---|
| Cada jogada é um mini-quebra-cabeça graduado: girar e achar o melhor encaixe, com retorno imediato | +1 por lado que combina; prévia com lados verdes/vermelhos e `+N` antes de colocar; a melhor rotação já vem sugerida |
| As peças são a vida; pontos são consequência | Pilha começa com 22; o jogo acaba quando ela acaba |
| Jogar bem devolve peças | Peça perfeita (cercada, 6 lados combinando): +5 e +1 peça. Missão cumprida: +3 peças |
| Missões com número exato criam planos e risco | "Bosque com 7": o grupo precisa ter exatamente 7 peças; passou, perdeu |
| Peças ruins viram problema a contornar | Lados que não combinam só não pontuam; rio que bate em terra vira brejo e a água para ali |
| Mundo aberto e bonito que cresce | Tabuleiro sem limite, câmera que acompanha, arrastar e pinçar |

**Identidade própria:** a água só corre no rio ligado à nascente. Rios desconectados ficam como leito seco; ligar um deles faz a água descer por tudo de uma vez (+2 por peça que recebe água viva), e o terreno em volta fica verde. Há missões de "ligar à água".

## Números do simulador (40 vales, `parScore` = bot guloso)

| Bot | Pontos | Peças colocadas | Missões cumpridas | Perfeitas |
|---|---:|---:|---:|---:|
| Aleatório | 11 | 22 | 0,1 | 0 |
| Guloso | 157 (49–313) | 39 (23–59) | 4,1 | 4,5 |

Primeira versão proibia rio encostar em terra; no teste isso criou buracos onde quase nenhuma peça cabia. Agora qualquer peça cabe em qualquer casa vazia (guloso: 136 pontos, 36 peças em média).

## A verificar com pessoas

1. A primeira partida é entendida sem ler a ajuda?
2. A pilha acabando gera vontade de "só mais uma"?
3. As missões exatas são lidas no mapa (marcadores `3/9`)?
4. Ligar um rio seco à nascente é um momento memorável?

## Polimento (v0.4.1)

- **Arte 3D feita no Blender** (`arte/`): 3 árvores, pinheiro e versões secas; 2 casas e versões secas; trigo, capim, flores, pedra, junco. Terreno seco usa as versões secas; ao chegar água, o vale fica verde.
- **Partículas** (também do Blender): poeira ao colocar, folhas ao plantar bosque, gotas onde a água chega, brilhos na peça perfeita, pétalas e folhas ao cumprir missão, fumaça nas chaminés das vilas com água.
- **Som sintetizado** (sem arquivos): batida de madeira com notas que sobem conforme os lados combinam, água correndo, arpejo da peça perfeita, fanfarra da missão, aviso de missão perdida. Botão de mudo.
- **Prévia da missão**: antes de colocar, a peça mostra "✓ cumpre a missão" ou "✗ estoura a missão".
- **Primeira jogada guiada**: anel "toque aqui" na melhor casa nas duas primeiras peças.
- **Foto do vale** na tela final.

## Água (v0.4.2)

- **Superfície animada**: 48 quadros em laço gerados no navegador a partir de uma soma de ondas (números de onda inteiros, então a textura emenda sem costura). Para cada pixel calcula-se a normal da superfície, o reflexo do céu com Fresnel (mais céu nos ângulos rasantes) e o brilho especular do sol, que cintila quando as ondas passam.
- **Ancorada no mundo**: a textura não "anda" com a câmera; só as ondas se movem.
- **Margens**: areia seca, terra molhada, espuma fina na beira, água rasa clara junto à margem e mais funda no meio.
- **Correnteza**: riscos de espuma descem o rio no sentido real do fluxo (distância pela rede viva a partir da nascente).
- **Nascente** borbulhando com ondas concêntricas; **brejo** com anéis lentos onde o rio termina em terra; **leito seco** de areia rachada até a água chegar.

## Terreno contínuo e variado (v0.4.3)

Pedido do teste: "não tem variação dentro da própria categoria" e "as linhas não casam".

- **Texturas ancoradas no mundo**: o chão de cada terreno é uma textura que emenda sem costura e não depende da peça. Um campo que atravessa várias peças é uma lavoura só, com os sulcos contínuos.
- **Variação por região**: cada região conectada (o mesmo campo, bosque, pasto ou vila) recebe uma variante, escolhida pela peça mais antiga da região (estável enquanto cresce):
  - Campo: trigo, milho, roças em retalhos, girassol.
  - Pasto: capim, florido, cerrado (árvore torta, cupinzeiro), pastagem (vacas, arbustos).
  - Bosque: mata, pinheiral, ipês (amarelo e roxo), cerradão.
  - Vila: telhados vermelhos, azuis ou de barro; regiões com 3+ peças ganham igreja ou moinho; campos grandes ganham celeiro.
- **Objetos espalhados**: posições aleatórias fixas dentro de cada triângulo, tamanhos variados; buritis e juncos à beira dos rios com água.
- **Sem fresta entre peças**: borda só aparece onde os lados não combinam (linha discreta) ou na borda livre do vale.
- **Arte nova no Blender**: ipê-amarelo, ipê-roxo, buriti, arbusto, árvore do cerrado, 8 casas (3 formatos, 3 cores de telhado), igreja, moinho, celeiro, fardos, vaca, cupinzeiro. Versões secas geradas automaticamente no atlas (`~d`).

## Beleza (v0.4.4)

Pedido do teste: "a água e os elementos ainda não estão bonitos o suficiente; a igreja tá feia".

- **Modelos refeitos no Blender** em resolução maior (256 px), com luz de sol + céu + luz de recorte:
  - Copas orgânicas: esferas subdivididas deformadas por ruído, sombreamento suave e material "pintado" (claro em cima, escuro embaixo, com manchas). Ipês com flores salpicadas.
  - Casas com beiral, cumeeira, fiadas de telha, janelas com moldura e venezianas, rodapé.
  - **Igreja nova**: capela colonial vista de lado — nave branca com janelas altas, torre sineira com sino dourado, óculo, porta azul, coruchéu de barro e cruz; frisos e pilastras azuis.
  - Buriti com folhas em leque, cupinzeiro de barro, vaca malhada, moinho com pás de lona, celeiro.
- **Água estilizada**: degradê de profundidade (turquesa no raso, azul no meio), reflexo do céu, cáusticas suaves em movimento (duas camadas de Worley), brilhos do sol que piscam, espuma na beira, correnteza.
- **Atmosfera**: sombras de nuvens passando devagar sobre o vale, borboletas em pastos floridos e bosques de ipê, laterais das peças com degradê de terra e beirada de grama.
- **Desempenho**: cada peça é pintada uma vez em duas camadas (chão e objetos) e reaproveitada; o atlas tem versões reduzidas (mipmaps). Tempo de desenho por quadro caiu de ~18 ms para ~1,3 ms no teste.

## Água de verdade e partículas naturais (v0.4.5)

Pedido do teste: "água tem que parecer água de verdade" e partículas melhores.

- **Água renderizada no Blender** (`arte/agua.py`): superfície ondulada com material de água (IOR 1,333, transmissão, reflexo do céu reforçado por Fresnel) e volume que absorve luz, sobre leito de areia e seixos. Cáusticas animadas projetadas no leito. Tudo periódico (ondas com números de onda inteiros, areia de senos inteiros, seixos repetidos 3×3) e em laço de 24 quadros. Câmera inclinada como a do jogo.
- `arte/montar_agua.py` junta os quadros numa folha WebP de 122 KB e ajusta a cor para o turquesa de riacho limpo.
- No jogo: a folha é usada como padrão ancorado no mundo, com mistura entre quadros consecutivos; o meio do rio fica mais azul (mais fundo); brilhos do sol viraram pontos de luz suaves.
- **Partículas**: poeira de terra suave ao colocar peça (no lugar de bolas brancas), fumaça suave que sobe e se espalha, gotículas e anéis na superfície quando a água chega, folhas e pétalas girando no ar, brilho dourado suave na peça perfeita.

## Fator replay — fase 1 (v0.5)

Implementa a primeira fase de `FATOR_REPLAY.md`.

- **Estações do rio** (como as metas do Islanders): metas de pontos 35, 95, 180, 290, 420, 570, 740, 930 e depois +220 a cada estação. Cada estação alcançada dá **+3 peças**. Nomes: Estiagem, Primeiras chuvas, Florada, Tempo das águas, Cheia, Fartura, Vale vivo. Barra no topo com progresso e a próxima novidade.
- **Peças especiais**, liberadas por estação e sorteadas na pilha de forma determinística (a peça é decidida quando aparece como "da vez" ou "depois" e não muda):
  - Estação 2 — **Cachoeira**: rio reto com degrau de pedra e espuma; +6 quando a água chega.
  - Estação 3 — **Ponte**: rio com vila dos dois lados; os lados de terra combinam com qualquer terra.
  - Estação 4 — **Lagoa**: água em 4 lados, lagoa grande com vitórias-régias; +8 e +1 peça quando a água chega.
- **Relatório do vale** no fim: quanto faltou para a próxima estação, missão que ficou a 1 peça, de onde vieram pontos e peças (encaixes, água, missões, perfeitas, especiais, estações), missões estouradas e quantas peças custaram, melhor jogada e uma dica gerada a partir da partida.
- **Recorde pessoal** (estação mais alta; empate pelos pontos) e **par do vale** expresso como estação + pontos.

Simulação (bot guloso, 40 vales): estação média 3,4 (2 a 5), pontos ~191 (72–400), peças colocadas ~47 (27–81). Bot aleatório fica na estação 1. Há espaço para uma pessoa jogando bem passar da estação 5.

## Missões claras e áudio no iOS (v0.5.1)

Pedido do teste: "não entendi as missões até o fim da primeira partida" e "o áudio não funciona no iPhone 13 Pro".

- **Missões**: lista de missões abertas sobre o vale (toque numa para destacar a região e ler a regra); região da missão contornada no tabuleiro; ao escolher onde colocar, a prévia mostra o efeito em cada missão ("4→5/6", "✓" se cumpre, "✗" se estoura) e contorna a região; explicação curta na primeira peça com missão.
- **Áudio no iOS**: o som é liberado no fim do toque (touchend/click), não no início; pede ao iOS uma sessão de "reprodução" (`navigator.audioSession`) e mantém um `<audio>` silencioso tocando, para não ser cortado pela chave de silêncio; retoma o som ao voltar para o app.
