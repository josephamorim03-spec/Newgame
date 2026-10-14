# Identidade visual do Afluente (v1.4, "Vale vivo")

> **Uma maquete de madeira pintada, vista sob a luz do Cerrado.**
> A água é o que dá cor ao vale. Longe dela, o capim vira palha.

## 1. O que a pesquisa trouxe

- **Dorfromantik**: os criadores dizem que a direção de arte veio de **paisagens impressionistas** e de **brinquedos de madeira** ([GameBusiness.jp](https://www.gamebusiness.jp/article/2022/05/18/20112.html)). Daí os nossos pilares "pintura" e "maquete".
- **Townscaper**: a crítica fala de paleta pastel, simples e coerente, e de um ar de aquarela, como em sonho. O som de vento e de ondas faz parte da calma ([PC Gamer](https://www.pcgamer.com/uk/townscaper-game-of-the-year-personal-pick), [xraispotlight](https://xraispotlight.substack.com/p/how-to-make-procedural-generation)).
- **Islanders**: minimalismo, cores claras, tela sem poluição e trilha calma ([GameWorldObserver](https://gameworldobserver.com/2019/06/14/islanders), [islaguru](https://islaguru.com/articles/islanders-game)).
- **Perspectiva atmosférica** em cenários 2D ([Slynyrd, Pixelblog 62](https://www.slynyrd.com/blog/2026/5/27/pixelblog-62-landscape-backgrounds)):
  - cada plano mais distante fica menos saturado e mais claro;
  - planos de névoa entre as camadas dão profundidade.
- **Pós-processamento leve** (textura de papel, cor por cena, brilho suave) e a temperatura da cor como alavanca de humor, quente ou fria ([itch.io](https://itch.io/post/3945964), [Searchlight Hotel devlog](https://crcherry.itch.io/searchlight-hotel/devlog/562733/art-implementation)).
- **Vento em capim estilizado**: ondas de fase deslocada, guiadas por ruído, que atravessam o campo ([billybeeson](https://billybeeson.myblog.arts.ac.uk/?p=290), [Fab](https://www.fab.com/listings/60791f12-0e3e-4562-82e5-407a876605de?lang=pt-br)).
- **Cerrado**:
  - **Veredas**: linhas de **buritis** ao longo de cursos d'água estreitos, perto de nascentes. As **matas de galeria** acompanham os rios ([Embrapa](https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1176629/1/VI.3-Veredas.pdf)).
  - Há **duas estações** bem marcadas.
  - Os **ipês florescem na seca**, de junho a setembro: roxo, amarelo e depois branco ([Correio Braziliense](https://www.correiobraziliense.com.br/cidades-df/2024/06/6879669-floracao-do-ipe-roxo-esta-no-auge-em-brasilia.html), [Canal Rural](https://www.canalrural.com.br/alem-do-agro/?p=491), [O Hoje](https://ohoje.com/2020/08/27/em-epoca-de-seca-ipes-floridos-colorem-a-paisagem-de-goiania/)).

## 2. Pilares

1. **Maquete**: peças com espessura e **terra vermelha** de Cerrado (laterita) nas laterais, com uma linha clara de estrato. Sombra suave sob o vale.
2. **Pintura**:
   - manchas de luz e sombra em grande escala, presas ao mundo, que costuram as peças;
   - luz do sol em diagonal (soft-light);
   - vinheta suave e grão de papel bem leve por cima de tudo;
   - sem tracejados nem grades: casas vazias são só manchas claras.
3. **A água dá vida**: a umidade é um **campo contínuo** que nasce de cada peça com água viva e se espalha cerca de 2 peças em volta.
   - Perto da água, verde; longe, palha.
   - Não há emendas em hexágono.
   - Quando a água chega, o verde se espalha com ela; na seca, o campo encolhe.
4. **Luz por estação** (paletas em `LPAL`, com transição suave de alguns segundos):

   | Estação | Céu | Luz | Clima |
   |---|---|---|---|
   | **Águas** | verde-água claro | manhã fresca, sol branco | névoa fria, sombra azulada |
   | **Seca** | areia e pêssego | tarde dourada | serras cor de terra, sombra marrom, poeira no ar |
   | **Depois da chuva** (14 s) | lavado | — | **arco-íris** |

5. **Horizonte do Cerrado**: céu, sol difuso no alto à esquerda, nuvens claras devagar e **chapadas** em duas camadas (a de longe quase some na névoa; a de perto tem **buritis**). A névoa apaga o pé das serras e há planície. Uma paralaxe leve acompanha a câmera.
6. **Vida que não pede atenção**:
   - brilhos do sol na água;
   - borboletas e fumaça de chaminé;
   - **pétalas de ipê** caindo dos bosques na seca;
   - pólen e poeira dourada no ar;
   - bandos de pássaros ao longe e, às vezes, **um casal de araras**, com a sombra passando pelo chão;
   - ondas de **vento no capim**.
7. **Som** (já existente): o ambiente segue a câmera (riacho com bolhas, cachoeira, pássaros, vento, cigarras na seca).

## 3. Paleta

| Uso | Águas | Seca |
|---|---|---|
| Céu (alto) | `#bfe2e6` | `#f1d6a8` |
| Névoa | `#eef4e1` | `#f8eacd` |
| Chapada distante | `#b4cfc3` | `#dcbc95` |
| Chapada próxima | `#93b9a5` | `#c79e75` |
| Planície | `#d6e7c6` | `#ead5ab` |
| Luz quente | `#fff2d0` | `#ffd690` |
| Sombra | `#2e5a70` (fria) | `#6b3c2a` (terra) |
| Palha (longe da água) | `#d6c080` | `#d6a860` |

Os acentos ficam com as próprias peças: ipê amarelo `#f2c230`, ipê-rosa, telhados de terracota, araras (`#d8352a`, `#2f6fcf`, `#f3c623`) e a água turquesa do Blender. A interface segue a tinta verde-escura `#1d3b3a` sobre cartões creme `#fffdf7`.

## 4. Emblema e tipografia

- **Emblema**: um hexágono (a peça) com um rio que o atravessa e uma flor de ipê. Fica na tela inicial.
- **Títulos**: Baloo 2 (arredondada, de brinquedo). O texto corrido usa a fonte do sistema.

## 5. Modo Contemplar

- Botão com um olho no canto do vale, item no menu e "Ver meu vale" no fim da partida.
- Some toda a interface. O vale ocupa a tela, enquadrado inteiro, com as chapadas ao fundo.
- A câmera passeia e respira devagar, e os bandos passam com mais frequência.
- Toque em qualquer lugar (ou Esc) para voltar.
- Com "Menos movimento" ligado, a câmera fica parada e os efeitos animados se desligam.

## 6. Desempenho

- Tudo é desenhado no canvas 2D, sem bibliotecas.
- Um quadro completo (fundo, peças, umidade, luz, vento, vida) leva cerca de 3 ms no teste.
- A umidade usa um canvas auxiliar do tamanho da tela. As texturas de luz e vento são geradas uma vez.

## 7. Sensação de jogo (v1.1)

Princípio: **cada ação tem peso, som e resposta no vale, sem pressa**. É a sensação de um brinquedo de madeira, não a de um caça-níquel.

| Momento | O que acontece |
|---|---|
| **Escolher** | A peça sobe, com sombra no chão, e flutua devagar |
| **Girar** | Gira suave, com um clique de madeira |
| **Colocar** | Cai, achata, acomoda; os enfeites brotam e as vizinhas balançam |
| **Impacto** | Toque de madeira grave, vibração curta, números que contam |
| **Combinar** | Cada lado que combina acende em sequência, com uma nota de marimba pentatônica (subindo) |
| **Perfeita e missão** | Anel de luz e um respiro de câmera |

O tempo é o mesmo para tudo: a peça leva cerca de 190 ms para cair, e som, vibração e números saem no impacto.

## 8. Composição: variações dentro da variação (v1.2)

Cada terreno de cada peça é **composto**, e não sorteado objeto por objeto:

1. Os triângulos vizinhos do mesmo terreno viram uma área.
2. Um **arranjo** é escolhido conforme o contexto: bosque à beira d'água vira mata ciliar com buritis; área grande pode virar clareira ou praça.
3. Os objetos são espalhados com **distância mínima** (Poisson), com uma densidade que desenha o arranjo: anel na clareira, fileiras na lavoura, casas dos dois lados do caminho na rua.
4. Cada objeto varia em **espécie, tamanho, espelhamento e tom**.

Assim, duas peças iguais nunca ficam iguais, mas a mesma peça é sempre desenhada do mesmo jeito: o sorteio é estável.

**Bichos raros**, para quem contempla:
- capivara na beira d'água;
- garça no brejo;
- lobo-guará no cerrado (cerca de 6% das áreas de cerrado).

**Rio que acaba**: estreita até sumir num brejo de terra escura, poças e taboas. É como nascem as veredas.

## 9. Ambiente vivo e mundo que responde (v1.4)

O vale tem **tempo próprio**. O jogador não controla nada disso, mas sente:

- **Hora**:
  - o dia anda com as jogadas;
  - a luz vai da alvorada rosada ao meio-dia branco e ao entardecer dourado;
  - a noite é azul, com estrelas, lua, janelas acesas e vaga-lumes.
- **Vento** que muda de direção e de força: as faixas de luz, as copas, a fumaça e o capim se movem juntos, na mesma direção.
- **Nuvens orgânicas**, com sombra deslocada pelo sol.
- **Clima**: chuva nas águas (e arco-íris depois dela), redemoinhos de poeira na seca.
- **Detalhe que só aparece de perto**: capim fio a fio, com sombra e vento.

**Cada elemento parece o que é**: copas de folhas (e não bolas), mata seca ocre e rala, palha com fibra e capim em lâminas.

**O mapa conta a história**, sem nenhum número na tela:

| Situação | O que se vê |
|---|---|
| Pasto isolado | terra parada, sem bicho |
| Pasto com água | gado curraleiro pastando |
| Pasto ao lado da vila | ovelhas no cercado e galinhas |
| Vila pequena → grande | taipa → telha → sobrado → venda e coreto |
| Bosque longe da água na seca | copas ocres e ralas |

## 10. Próximos passos possíveis


- Floração **por espécie** nos bosques durante a seca: as copas de ipê trocam de folha para flor, com sprite novo no Blender.
- **Lobo-guará** ou seriema raros andando no pasto: um momento especial para contemplar.
