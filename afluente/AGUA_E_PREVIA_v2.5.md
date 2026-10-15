# Afluente — A água no centro e as próximas peças (v2.5)

Dois retornos sobre a `REVISAO_RETENCAO_v2.4.md`:

1. "O que acha de mostrar as **duas próximas peças** ao invés de uma? Mudaria muito?"
2. "Sinto falta de sentido no nome: **vem pouca água**, a maior parte fica seca, o que é frustrante. **A água deveria ser um elemento chave** e fazer mais diferença na gameplay."

As duas perguntas foram respondidas com simulação. O motor é o da v2.2, e os bots são os mesmos dos estudos anteriores, com dois acréscimos: um bot que planeja com as peças visíveis e uma medida nova, o **vale verde**, que é a parte do vale com água viva na peça ou encostada nela, como o jogo já desenha.

---

## 0. Resumo

| Pergunta | Resposta curta |
|---|---|
| Duas próximas peças? | **Vale a pena, mas muda menos do que parece e pede uma correção antes.** Ver a 1ª peça seguinte (que já aparece hoje) quase dobra os pontos de quem planeja (+80% na mediana). A 2ª soma **+11% na mediana**, com muita variação, e partidas 17% mais longas. O problema maior é outro: **os bots das gotas ignoram até a peça que já aparece**, e um bot que só olha a peça seguinte já alcança o Rio cheio em 11 de 18 vales. Primeiro os bots precisam ver o que a pessoa vê. Depois dá para mostrar a segunda peça, menor e esmaecida |
| Água como elemento chave | **Concordo, e os números confirmam o incômodo**: hoje quem joga bem termina com **45% do vale verde**, e quem está começando com **19%**. Proponho um pacote de 4 regras. Com ele o vale termina **86 a 91% verde** (38% para quem está começando), e a água responde por **55% dos pontos** (hoje, 19%). A duração fica dentro dos 20–25 min para quem joga muito bem |

O pacote "a água no centro":

| # | Regra (em uma frase) | Por quê |
|---|---|---|
| 1 | **Água só encosta em água** (o rio encaixa) | O rio para de morrer em brejo: o rio vivo no fim vai de 47% para 87% |
| 2 | **Afluentes**: o vale tem a nascente e mais 2 veredas. Ligar o rio de uma vereda ao rio principal é um afluente: +10 e +3 peças | Dá ao nome um sentido literal e à partida uma meta de rota. Já abre o vale com três fontes de água |
| 3 | **A cheia rega o vale**: quando as chuvas voltam, cada peça verde vale +1 | O verde que o jogo já desenha passa a ser a regra. A água vira o motor dos pontos |
| 4 | **Mais rios na pilha** (de 24% para 32% das peças) | Mais oportunidades de levar água |
| Freio | **A seca dá no máximo 2 peças** (a missão já dá 2, desde a v2.4) | Sem freio, com tanta água viva, a pilha de quem joga muito bem dispara |

---

## 1. Duas próximas peças

### 1.1 O que foi medido

Bot que planeja (o cuidadoso) jogando os mesmos 18 vales de três jeitos:

- **H0**: só a peça da vez, como os bots das gotas jogam hoje;
- **H1**: a peça da vez e a seguinte, que é **o que a pessoa vê hoje**;
- **H2**: a peça da vez e as duas seguintes.

A busca é podada: as 6 melhores jogadas de cada nível seguem para o seguinte.

| Visão | Pontos (média) | Jogadas (média) | Máx. jogadas | Comparado com o nível anterior, vale a vale |
|---|---:|---:|---:|---|
| H0 | 140 | 40 | — | — |
| H1 (o jogo de hoje) | 320 | 62 | 150 | mediana **×1,80**; melhor em 17 de 18 vales |
| H2 | 406 | 73 | 186 | mediana **×1,11**; melhor em 10 de 18 vales (de ×0,64 a ×4,38) |

### 1.2 O que isso quer dizer

- **A informação tem retorno decrescente.** A primeira peça seguinte é a grande virada: dá para planejar um buraco, guardar um lado e preparar a peça perfeita. A segunda ajuda menos, e às vezes atrapalha, porque o vale é uma bola de neve: planejar mais longe muda a pilha e muda a sorte.
- **Partidas um pouco mais longas** (+17% de jogadas), além de mais tempo pensando por jogada. Dentro do alvo de 20–25 min isso não é problema.
- **Para quem está começando, quase nada muda**: quem ainda não usa nem a peça seguinte não vai usar a segunda.
- **Para quem já joga bem**, muda o tipo de prazer: dá para fazer pequenos projetos ("o bosque que vem daqui a duas fecha este buraco"). Com o rio que encaixa (pacote, regra 1), isso conta mais, porque saber que vem uma peça de rio ajuda a deixar a passagem aberta.

### 1.3 O problema que aparece antes: as gotas

Os bots que calculam as gotas jogam como H0: **não olham nem a peça seguinte**, que a pessoa já vê. Nos mesmos 18 vales:

- Rio cheio (o marco mais alto) = 266 pontos, em média;
- o bot H1 passa do Rio cheio em **11 de 18 vales**.

Uma pessoa que planeja com a peça seguinte vai fazer 3 gotas com frequência. O "Rio cheio" deixa de ser um teto e a escada perde a graça em poucas semanas, o que atinge justamente a retenção de quem mais joga. Mostrar duas peças sem corrigir isso piora o problema.

### 1.4 Recomendação

1. **Primeiro: os bots das gotas veem o que a pessoa vê.** Hoje isso é a peça seguinte (H1). O bot H1 leva cerca de 12 s por vale num núcleo, mais que os 0,4 a 10 s do mestre atual, mas ainda cabe num Web Worker.
2. **Depois, mostrar a 2ª peça**, menor e esmaecida ("depois do depois"), como as filas de próximas peças de jogos de encaixe.
   - **No celular**: a barra de baixo tem 96 px e já mostra a peça da vez (84 px) e a seguinte (92 px). A 2ª precisa ficar ao lado da seguinte em tamanho menor, uns 56 px. Também dá para empilhar as duas seguintes na vertical.
   - **Gotas**: com duas peças à vista, os bots precisam de H2, que leva perto de 2 min por vale. Isso já não cabe no navegador e passa a ser **pré-calculado** junto do calendário de vales, como o validador do GDD já previa.
   - **Desfazer**: com duas peças à vista, desfazer revela a 3ª. O "desfazer contado" da v2.4 continua valendo.
3. **Testar com pessoas antes de fixar**, com duas perguntas: "você planejou com a segunda peça?" e "a barra de baixo ficou confusa?".

**Mudaria muito?** Para a maioria, não. Para quem joga bem, sim: mais planejamento e mais pontos. O retorno é menor que o da peça que já aparece, e o custo de verdade fica em recalcular as gotas.

---

## 2. A água no centro do jogo

### 2.1 O diagnóstico, em números

Medidas no fim da partida, regras de hoje (60 vales):

| Medida | Iniciante (aleatório) | Guloso | Cuidadoso |
|---|---:|---:|---:|
| Peças com rio na pilha | 24% | 24% | 24% |
| Rio vivo no fim | 3% | 47% | 46% |
| **Vale verde no fim** | **19%** | **45%** | 43% |
| Pontos ligados à água (água viva, especiais, seca) | 5% | 19% | 25% |

O incômodo tem causa clara:

- **pouca água entra**: 1 peça em 4 tem rio;
- **a água que entra morre**: rio contra terra vira brejo, e a água para ali;
- **a água viva vale pouco**: +2 uma vez só, e depois nada.

E quem abre o jogo pela primeira vez vê um vale quatro quintos seco. O primeiro contato com um jogo chamado *Afluente* é de seca.

### 2.2 As camadas do pacote

Cada linha soma uma regra à de cima (60 vales; "vale verde" e "pontos da água" do guloso e do cuidadoso):

| Camada | Vale verde: iniciante / guloso / cuidadoso | Rio vivo (guloso) | Pontos da água (guloso) | Jogadas do guloso: média / 90% | Afluentes ligados (de 2) |
|---|---|---:|---:|---|---:|
| **Hoje** | 19% / 45% / 43% | 47% | 19% | 43 / 56 | — |
| + rio que encaixa (com missão de 2 peças) | 16% / 66% / 69% | 87% | 29% | 44 / 65 | — |
| + 2 veredas (afluentes) | 35% / 79% / 79% | 95% | 34% | 49 / 71 | 0,33 |
| + a cheia rega o vale (+1 por peça verde) | 35% / 79% / 84% | 95% | 52% | 50 / 74 | 0,28 |
| + mais rios na pilha (32%) | 38% / 86% / 90% | 94% | 56% | 54 / 77 | 0,50 |
| **+ freio: seca dá no máx. 2 peças** | **38% / 86% / 91%** | **94%** | **55%** | **52 / 77** | 0,47 |

**Quem joga muito bem** (bot mestre, 30 vales), em número de jogadas:

| Configuração | Mediana | 90% | Máximo |
|---|---:|---:|---:|
| Hoje | 53 | 124 | 138 |
| Pacote sem freio | 77 | **329** | 354 |
| Pacote com a seca pagando só pontos | 41 | 53 | 65 |
| **Pacote com seca de no máx. 2 peças** | **62** | **101** | **110** |

Com 8 a 12 s por jogada, 110 jogadas dão de **15 a 22 minutos**, dentro do alvo.

**A diferença entre jogar mal e jogar bem**: o iniciante faz 43 pontos e o guloso 386, quase 9×. Hoje são 13 contra 169. Mais pontos para todos, e a habilidade continua decidindo.

### 2.3 Cada regra, explicada

#### Regra 1 — Água só encosta em água

- Já defendida nas v2.3 e v2.4: o rio vivo no fim vai de 47% para 87%, e nenhuma partida travou.
- Muda a lição 2: o brejo deixa de ser "erro" e passa a vir só da peça "fim de rio". A garça continua pedindo brejos, e eles passam a ser escolha.

#### Regra 2 — Afluentes (o sentido do nome)

**Regra:** *o vale abre com a nascente e duas veredas a 4 casas dela. O rio de uma vereda que chega ao rio da nascente é um afluente: +10 pontos e +3 peças, uma vez por vereda.*

- **O nome passa a ser literal.** Afluente é o rio que deságua noutro maior. Hoje o nome descreve o que quase nunca acontece. Com a regra, ele descreve o objetivo da partida.
- **As veredas são água desde o começo.** São três fontes em vez de uma: só elas já levam o vale verde do iniciante de 16% para 35%.
- **Meta de rota de longo prazo**: "chegar à vereda do norte antes da seca" dá direção à partida longa, como a foz da v0.3, mas sem obrigar.
- **Ecologia**: na pesquisa da v2.3, a vereda é a base mais sólida para "a água que não seca" (Embrapa). As veredas não secam: são nascentes.
- **Ponto aberto**: os bots ligam só 0,3 a 0,5 das 2 veredas por partida, porque o guloso não planeja rotas. Uma pessoa vendo a meta deve ligar mais, e só o teste confirma. Duas ajudas baratas:
  - mostrar a distância ("faltam 3 casas até a vereda");
  - o "toque aqui" das primeiras jogadas apontar para ela.

  Se ainda assim ninguém ligar, aproximar as veredas para 3 casas.

#### Regra 3 — A cheia rega o vale

**Regra:** *quando as chuvas voltam, cada peça verde (com água viva na peça ou encostada) vale +1.*

- **O visual vira regra.** Desde a v1.0 o jogo desenha a umidade se espalhando a partir da água viva. Hoje isso é só bonito. Com a regra, o verde é exatamente o que pontua, e a pessoa entende olhando o vale.
- **A água rende sempre**, e não só uma vez. Uma peça regada cedo pontua em todas as cheias da partida. Era a ideia certa da v0.3 ("o *quando* passa a importar"), agora sem uma conta escondida.
- **Por que não repete o erro da v0.6** (colheita, celeiro, fome):
  - é uma regra só, que se vê no vale;
  - não tira nada de ninguém;
  - a consequência chega a cada 12 jogadas, com o verde sempre à vista;
  - não depende de nenhum número que a pessoa precise lembrar.
- **Peso**: perto de 27% dos pontos do guloso. É alto, mas de propósito: a água deve ser o centro. Se o teste mostrar que o encaixe perdeu a graça, a cheia pode valer +1 só para peças de campo e vila. As de bosque já ganham com a seca.
- **A cheia vira momento**: a volta das chuvas já tem arco-íris e som. Agora ganha também o número: "+34", com o brilho correndo pelas peças verdes. É um pico de prazer previsível a cada ano.

#### Regra 4 — Mais rios na pilha

- De 24% para 32% das peças com rio, uma linha no gerador.
- Leva o vale verde de quem joga bem de 79–84% para 86–90%.

#### Freio — A seca dá no máximo 2 peças

- Com tanta água viva, a seca, que paga peças por trecho protegido, virou o motor da pilha infinita.
- Limitada a 2 peças por seca, ela continua premiando quem protege o rio (o cuidadoso seca **3× menos trechos**: 7,0 contra 20,2) e para de alongar a partida sem fim.
- **Ponto aberto**: em pontos, o cuidadoso empata com o guloso (380 contra 386). Proteger o rio aparece no vale (trechos secos) e no caderno (a onça), mas pouco no placar. Para testar a seguir: trecho protegido na seca valendo +2 em vez de +1.

### 2.4 Riscos

| Risco | Sinal no teste | Ajuste |
|---|---|---|
| A cheia vira a única coisa que importa, e o encaixe perde a graça | A pessoa ignora os lados e só busca água | Cheia só para campo e vila; ou +1 a cada 2 peças verdes |
| As veredas ficam longe e ninguém liga | Afluentes ligados por partida perto de zero | Veredas a 3 casas; indicar o caminho |
| O vale verde demais perde o drama da seca | "A seca não muda nada" | A seca já seca 7 a 20 trechos por partida; manter o laranja e o "sem mata" |
| Três regras novas de uma vez | Dúvidas no teste | Lições: a regra 1 na lição 2; as veredas na lição 2 (um afluente de 2 casas); a cheia na lição 5, junto da seca |

### 2.5 O que entra na tela

- **As veredas** com buritis, desde a primeira jogada. Elas já existem como modelo do Blender (v2.1).
- **Uma linha no painel**: "Afluentes 0/2", e ao tocar, as veredas são destacadas.
- **A prévia da peça** mostra "+N na próxima cheia" quando a peça fica verde.
- **No fim e no compartilhamento**: "🌊 2 afluentes · vale 88% verde".

---

## 3. Ordem recomendada (atualiza a v2.4)

| Etapa | O quê |
|---|---|
| 1 | Bots das gotas com a mesma visão da pessoa (a peça seguinte) |
| 2 | Teste A/B com pessoas: hoje contra **o pacote "a água no centro"** + vale com começo + desfazer contado |
| 3 | Se o pacote passar: a 2ª peça visível, com gotas pré-calculadas |
| 4 | O resto da v2.4: link de desafio, série gentil, bicho do dia, caderno que continua |

O "vale com começo" da v2.4 combina com as veredas. O vale do dia abre com a nascente, as duas veredas e um trecho de rio, e a paisagem inicial já mostra a meta.

---

## 4. Método e limites

- **Bots não são pessoas.** Eles mostram se a regra quebra, quanto o vale fica verde e quanto dura a partida, mas não mostram se a cheia é gostosa ou se os afluentes motivam.
- **Os bots não planejam rotas**, então a taxa de afluentes ligados (0,3 a 0,5) é um piso, e não uma previsão.
- **A busca com 2 peças à vista é podada** (6 melhores por nível) e cobre só 18 vales. As médias têm muita variação, por causa da bola de neve da pilha. As medianas por vale são o número mais confiável.

## 5. Arquivos

- `sim/revisao/olhar.js`: bot que planeja com H peças visíveis. Uso: `node olhar.js motor.js 1 18`.
- `sim/revisao/m_agua.js`: o pacote "a água no centro". As opções ficam em `AFLUENTE_CFG`:
  - `veredas`: número de veredas;
  - `cheia`: pontos por peça verde;
  - `rioPct`: fração de peças com rio;
  - `afluPts` e `afluTiles`: pontos e peças por afluente;
  - `cap`: máximo de peças por seca.

  A configuração recomendada é `{"veredas":2,"cheia":1,"rioPct":0.32,"cap":2}`. `m_encaixe_agua.js` é o mesmo arquivo, com o nome que o `fases.js` reconhece.
- `sim/revisao/medir.js` agora também mede o vale verde e os afluentes ligados.
- `sim/revisao/resultados/`:
  - `previa_h*.json`: as duas peças à vista;
  - `agua_*.txt`: as camadas e os freios.
