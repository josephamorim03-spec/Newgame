# Briefing: melhorar as miniaturas 3D do Peleja

Situação atual: veja `docs/figsheet-depois.png` (15 personagens de frente, lado e costas) e `docs/efeitos-no-tabuleiro.png`. O que já foi feito a partir da Mula está em [`docs/RELATORIO_ASTRA.md`](RELATORIO_ASTRA.md); a seção 3 de lá lista os próximos pedidos.

## Objetivo
1. **Formas melhores** nos 15 personagens de `src/figs.js`, mantendo a identidade de cada um.
2. **Partículas animadas** ancoradas nos bonecos: fumaça no cachimbo do Saci, fogo na Mula e no cabelo do Curupira, brilho nos olhos da Anhangá e do Corpo-seco, poeira ao andar.

## Como o jogo usa as miniaturas (não quebrar)
- O tabuleiro é **2D (canvas)**. Cada boneco é renderizado **uma vez por direção** por `FIGS.sprite(id, 256, 320, dir)` e desenhado como imagem. Isso deixa o jogo leve no celular.
- **Contrato público a manter:** `FIGS.sprite`, `FIGS.dirOf(dx, dy)`, `FIGS.ok()`, `FIGS.has(id)`, e a estrutura `DEF[id] = { scale?, build(K) }` com o kit `K` (pode ser estendido).
- O pé do boneco fica a ~88,5% da altura da imagem (`ui.js`, função `drawFig`: `by - h * 0.885`). Se mudar o enquadramento, ajuste os dois juntos.
- **Restrições:**
  - Three.js **r128**;
  - tudo procedural em JS, sem .glb, texturas externas ou CDN além do que já está embutido;
  - um único HTML, que funciona offline;
  - até 8 mil triângulos por boneco;
  - cada imagem legível com 60 px de altura;
  - contorno escuro fino e paleta atual.

## Partículas: arquitetura pedida
Como os bonecos são imagens fixas, as partículas **não podem** ficar dentro do render 3D:
1. **Já existe.** Em `figs.js`, `FIGS.anchors(id, dir)`. Ela devolve pontos de emissão em pixels da imagem 256×320, para cada direção, por exemplo `{ smoke: [[x, y]], fire: [[x, y], ...], glow: [[x, y]] }`. Calcule-os projetando pontos 3D do modelo com a mesma câmera do `sprite`.
2. Crie um módulo `FX` em canvas 2D, chamado de `ui.js` dentro de `drawFig`, depois da imagem do boneco:
   - um pool fixo de no máximo **120 partículas** na tela, sem alocar memória por quadro;
   - **fumaça:** sobe, cresce, fica transparente e balança com o vento;
   - **fogo:** chamas e brasas, com mistura aditiva ou cores quentes;
   - **brilho:** pulsa;
   - **poeira:** quando a peça anda (evento `move` em `ui.js`);
   - pausa com a aba escondida; com `prefers-reduced-motion`, apenas o brilho fica, sem movimento.
3. O efeito **nunca cobre** os números de ataque e vida, desenhados na base. Desenhe as partículas antes dos números ou limite a área de desenho.

## Identidade de cada personagem (marcas fixas)
| id | personagem | marcas que não podem sumir |
|---|---|---|
| curupira | Curupira (general Mata) | cabelo de fogo em camadas, **pés virados para trás**, saia de folhas, pele marrom |
| saci | Saci-Pererê | **uma perna só**, carapuça vermelha caída, cachimbo, redemoinho |
| coral | Cobra-coral | anéis vermelho/creme/preto, cabeça erguida, língua bífida |
| uira | Uirapuru | passarinho redondo cantando, papo laranja, notas no ar |
| onca | Onça-pintada | rosetas, rosnando, quatro patas |
| caipora | Caipora | indiazinha de cocar e porrete, montada num porco-do-mato com presas |
| anhanga | Anhangá | veado **branco** com galhada grande e **olhos de fogo vermelhos** |
| mapin | Mapinguari | peludo e enorme, **olho único**, **boca na barriga**, garras |
| cuca | Cuca (general Assombrações) | **cabeça de jacaré** de boca aberta, cabelo amarelo, vestido roxo, rabo |
| corpo | Corpo-seco | magro e seco, costelas, olhos fundos com brasa |
| bicho | Bicho-papão | bola peluda escura, olhos vermelhos enormes, sorriso de dentes |
| lobis | Lobisomem | lobo de pé, bermuda rasgada, garras |
| pisa | Pisadeira | velha alta e magra, cabelo branco, nariz comprido, **unhas enormes**, olhos vermelhos |
| mula | Mula-sem-cabeça | corpo de mula com manta, **pescoço terminando em fogo**, ferraduras |
| capelobo | Capelobo | **focinho de tamanduá**, garras em foice, **umbigo vermelho** (ponto fraco) |

## Como entregar
- Trabalhe **um personagem por vez**, começando pela Mula (forma + fogo), e mostre o antes e depois antes de seguir.
- Rode `python3 build.py`, `node tools/figsheet.js`, `node tools/regras.js` e `node tools/telas.js`. Anexe `shots/figsheet.png` e uma tela do jogo.
- Faça commits numa branch nova a partir de `peleja/prototype` (por exemplo `peleja/astra-figs`), explicando o que mudou em cada personagem. Não altere `src/core.js` (regras).
