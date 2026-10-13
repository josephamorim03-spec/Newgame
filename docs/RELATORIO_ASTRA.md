# Relatório: o que o Astra fez na Mula e como foi aplicado aos outros 14

Fonte: commit `4f28a72` do Astra (só a Mula). As mesmas técnicas foram aplicadas por Claude aos outros 14 personagens na branch `peleja/claude-figs`.
Comparação: `docs/figsheet-antes.png` × `docs/figsheet-depois.png`, e no jogo `docs/efeitos-no-tabuleiro.png`.

## 1. O que o Astra fez de diferente

| # | Técnica | Na Mula | Por que funciona |
|---|---|---|---|
| 1 | **Orçamento de polígonos** | 7.144 triângulos, esferas de 12×6 segmentos, contorno fino (0,025) | O boneco é visto com ~130 px de altura. A silhueta vem da forma, não da densidade da malha. Os meus tinham de 30 a 105 mil triângulos sem ganho visível. |
| 2 | **Volumes contínuos** (`sweep`: anéis elípticos ligados) | Pescoço e chamas numa peça só | Pilhas de cones e esferas parecem "montadas"; uma superfície contínua parece esculpida. |
| 3 | **Massas sobrepostas com variação de tom** | Barril + peito mais claro + anca | Dá volume sem textura e marca a anatomia. |
| 4 | **Articulação legível** | Joelho em tom claro, patas afinando, espaço vazio entre as quatro patas | O olho lê o bicho pelos vazios tanto quanto pelos cheios. |
| 5 | **O objeto certo** | Ferradura em U aberta, "não uma bota de metal" | Detalhes que dizem *o que é* valem mais que detalhes que só enfeitam. |
| 6 | **Superfície fina curva** | Manta que acompanha o dorso, com faixa dourada | Geometria própria (dupla face) em vez de caixas. |
| 7 | **Fogo esculpido** | Chamas curvas, assimétricas, em camadas vermelho → laranja → amarelo → creme, com brilho próprio e sem contorno | O fogo estático fica bonito em qualquer direção, e só o que se mexe vira partícula. |
| 8 | **Âncoras + FX 2D** | `K.anchor(tipo, ponto)` no modelo, projetado com a mesma câmera da imagem; pool fixo de 120 partículas; números por cima | O jogo continua leve (o boneco é uma imagem pronta) e mesmo assim tem movimento. |
| 9 | **Disciplina de entrega** | Um personagem, contrato mantido, verificação nas 8 direções em celular simulado, números no commit | Fácil de revisar e de integrar sem quebrar nada. |

## 2. O que foi aplicado nos outros 14

**Kit de modelagem** (`src/figs.js`):
- Segmentos proporcionais ao tamanho da peça.
- Contorno de 0,03.
- `K.sweep`: a técnica da Mula, generalizada.
- `K.loft`: tubo afinado ao longo de uma curva, usado em rabos, galhadas, focinhos, cabelo e na cobra.
- `K.flame`: as chamas da Mula, reutilizáveis.
- `K.claw`: garra curva em gancho.
- `K.anchor(tipo, ponto, normal)`: com a normal, o efeito some quando aquele ponto está de costas para a câmera, por exemplo os olhos.
- `FIGS.stats(id)`: conta os triângulos.

| personagem | forma | efeito |
|---|---|---|
| Curupira | cabelo de fogo esculpido em 3 camadas + franja de chamas; pernas e saia contínuas | brasas subindo do cabelo |
| Saci | carapuça num tubo só que tomba para o lado; redemoinho em espiral contínua; braço do cachimbo | **fumaça** do cachimbo + brilho do fornilho |
| Cobra-coral | corpo contínuo enrolado; os anéis são trechos do mesmo tubo; cabeça e língua bífida em tubo | — |
| Uirapuru | asas e cauda achatadas em tubo; patas com garrinhas | **notas musicais** subindo do bico |
| Onça | corpo ao longo da espinha, barriga clara, rabo curvo lateral | — |
| Caipora | porco com corpo contínuo e presas curvas; cocar em penas achatadas | — |
| Anhangá | galhada em tubos ramificados, pescoço e patas contínuos | **olhos em brasa** (só quando visíveis) + **cintilação** espiritual |
| Mapinguari | menos tufos e maiores; braços contínuos; garras em gancho | — |
| Cuca | focinho e mandíbulas em tubos achatados com dentes; mechas amarelas em tubo; rabo curvo | — |
| Corpo-seco | membros finos contínuos com juntas; fios de cabelo | **olhos em brasa** pulsando |
| Bicho-papão | tufos maiores e menos; braços e garras curvas | **olhos** pulsando |
| Lobisomem | pernas digitígradas contínuas, tronco por `sweep`, rabo cheio, focinho em tubo | — |
| Pisadeira | cabelo em mechas contínuas; unhas curvas enormes; nariz em tubo | **olhos em brasa** |
| Capelobo | focinho de tamanduá num tubo só com língua; garras em foice | **umbigo vermelho pulsando** (o ponto fraco) |

**Números (triângulos, com contornos):**

| personagem | antes | depois |
|---|---|---|
| Curupira | 81.392 | 13.064 |
| Saci | 51.344 | 7.126 |
| Cobra-coral | 100.164 | 7.596 |
| Uirapuru | 57.256 | 5.052 |
| Onça | 63.880 | 9.668 |
| Caipora | 48.466 | 9.738 |
| Anhangá | 105.424 | 5.260 |
| Mapinguari | 29.822 | 6.628 |
| Cuca | 69.724 | 11.248 |
| Corpo-seco | 49.333 | 5.281 |
| Bicho-papão | 30.628 | 7.352 |
| Lobisomem | 54.602 | 8.670 |
| Pisadeira | 58.170 | 7.516 |
| Capelobo | 51.850 | 6.518 |
| Mula | 7.144 | 6.760 |

No total, de ~860 mil para ~118 mil triângulos (−86%). Isso deixa a primeira aparição de cada boneco mais rápida no celular.

**FX** (`src/fx.js`), a partir do módulo do Astra:
- Novos tipos de partícula: fumaça (sobe, cresce e balança) e notas musicais.
- Novos brilhos: olhos em brasa pulsando e cintilação espiritual.
- Fogo e poeira continuam como o Astra fez, e a poeira agora vale para todos os bonecos.
- Continua com o pool fixo de 120 partículas, a pausa com a aba escondida e o modo de movimento reduzido, em que só os brilhos ficam e param de pulsar.

**Verificação:**
- 33 testes de regras.
- Layout em 320, 360, 390 e 430 px.
- 3 partidas automáticas (bot e 2 no celular), sem erros e sem estados impossíveis.
- Folha das 15 miniaturas em frente, lado e costas.
- Tela com 11 bonecos e efeitos ao mesmo tempo: 30 partículas vivas, longe do limite de 120.

## 3. O que ainda pode melhorar (próximos pedidos ao Astra)
- **Curupira (13 mil) e Cuca (11 mil)** passam do orçamento de 8 mil do briefing. Podem ser enxugados.
- **Fumaça do Saci e notas do Uirapuru** ficam discretas no tamanho do tabuleiro, de propósito, para não poluir. Podem ganhar mais presença só no instante em que a peça age.
- **Rostos:** olhos e bocas ainda são esferas e toros simples. Uma passada dedicada a expressões, por exemplo pálpebras e sobrancelhas em `sweep`, daria mais personalidade.
- **Animais de frente** (Onça, Mula, Anhangá) continuam estreitos nas direções 0 e 4. Isso é inevitável com a câmera atual, e pode ser compensado com um leve giro de 3/4 nessas direções.

## 4. Nota sobre `tools/mula.js` (QA do Astra)
- Este script foi feito para a etapa 1 e verifica que os **outros** personagens ficaram idênticos ao commit original `3f1c896`. Agora que os 14 foram remodelados, essa parte vai acusar diferença, e isso é esperado.
- O restante do script continua valendo: orçamento da Mula, âncoras, pool de FX, pausa, movimento reduzido, offline e fallback 2D.
- Para a próxima etapa, passe a nova referência: `node tools/mula.js 570e5fa`.

## 5. Etapa 2 do Astra: Saci (commit `7342a4f`)
O Saci do Astra **substituiu** o meu. Ele está melhor e tem a mesma contagem de triângulos que ele relatou (6.760).

**O que aprendi dele:**
- **Recentrar a malha antes do contorno.** O contorno é uma cópia escalada da peça. Se a geometria está longe da origem, o traço "escorrega" para um lado. Agora `sweep`, `loft` e `tube` recentram a malha, e isso corrigiu um defeito discreto nos meus tubos.
- **`sweep` com `follow`:** cada anel acompanha a direção do caminho. Foi assim que ele fez a carapuça que dobra e desce.
- **Pose conta história:** perna única flexionada, uma mão na cintura e a outra segurando o cachimbo, com espaço vazio entre braço e corpo.
- **O objeto certo, de novo:** haste curva, fornilho oco com borda e brasa dentro. A fumaça sai da abertura.
- **Evitar o clichê:** a carapuça sem pompom não lembra Papai Noel.
- **Vento legível:** dois fios em espiral, deixando a perna livre no centro.

**Como juntei:** o Astra partiu da versão anterior à minha remodelagem.
- Mantive meu `fx.js` e meu `ui.js`, que já tratam fumaça, notas, olhos e poeira para todos.
- Trouxe o modelo do Saci dele e as ferramentas do kit que ele usa: `tube`, `sweep` com `follow`, e as opções `seg` e `rings` em `torus`, `limb` e `lathe`.
- A fumaça dele passa a usar a âncora `smoke` com o emissor geral.

**Próxima referência para `tools/personagem.js`:** o commit desta junção.
