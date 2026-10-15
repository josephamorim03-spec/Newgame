# Auditoria das mecânicas e onboarding (v0.7)

Pedido: verificar todas as mecânicas (como funcionam e se há fundamento para mantê-las), decidir sobre a sustentabilidade e criar um onboarding com fases iniciais em mapas específicos.

Os números abaixo vêm de 30 vales simulados com as regras da v0.7 (simulador em `sim/`). O bot **guloso** busca só o ganho imediato; o **cuidadoso** também pesa o rio protegido para a seca.

## 1. Critério

Uma mecânica fica se cumpre três condições:

1. **Cria uma decisão**: muda onde ou como a peça é colocada.
2. **Pode ser explicada em uma frase e vista no tabuleiro**, sem conta escondida.
3. **Tem consequência perto da decisão**: a pessoa liga causa e efeito.

## 2. Mecânica por mecânica

| Mecânica | O que faz | Peso no jogo (guloso) | Veredito |
|---|---|---|---|
| **Encaixe de lados** | +1 por lado igual ao do vizinho | 45% dos pontos | **Manter.** É o núcleo e é visível na hora (✓ verde). Lição 1. |
| **Qualquer peça cabe em qualquer casa** | Lado que não combina só não pontua | — | **Manter.** A proibição antiga criava buracos impossíveis. *(v2.4 voltou a exigir água com água; v2.3 'brejo' manteve só "rio não se corta": ver as notas.)* |
| **Peça perfeita** | 6 lados combinando: +5 e +1 peça | 16% dos pontos, cerca de 6 peças por jogo | **Manter.** Premia planejar buracos. Lição 4. |
| **Água viva** | Rio ligado à nascente; +2 por peça na primeira vez que recebe água | 7% dos pontos | **Manter.** É a identidade do jogo e a base da seca e das missões de água. Lição 2. |
| **Brejo** | Rio contra terra termina num brejo e para ali | — | **Manter só como visual.** Explicado em uma frase na lição 2. |
| **Missões com prazo** ("Bosque 4/6 · 10⏳"), na v0.9 | A região precisa chegar a N peças antes do prazo: +3 peças. Passar do número não tem problema; se o prazo acaba, a missão só vai embora | Maior fonte de peças quando a pessoa persegue as missões | **Mudada na v0.9.** Na regra antiga de número exato, passar do número perdia a missão. Ver seção 6. Lição 3. |
| **Missão de água** | Levar água viva até a peça marcada: +3 peças | dentro das missões | **Manter.** Lição 2. |
| **Pilha como vida** | O jogo acaba quando a pilha acaba; jogar bem ganha peças | — | **Manter.** É o laço do Dorfromantik. |
| **Peças especiais** (Cachoeira, Lagoa, Ponte) | Entram na pilha com o tempo | 5% dos pontos | **Manter Cachoeira e Lagoa.** A Ponte ("terra combina com qualquer terra") é a regra mais obscura e é candidata a simplificar. Não ganhou lição: cada especial explica a si mesma quando aparece. |
| **Ano no vale da v0.6** (colheita, celeiro, casas, fome crescente) | Contas de comida e consumo a cada ano | Efeito pequeno nos pontos | **Retirado.** Detalhes na seção 3. |
| **Seca e mata ciliar (v0.7)** | Na seca, só corre o rio com bosque encostado; o rio protegido rende pontos e peças | 4–15% dos pontos e cerca de 8 peças por jogo (com as chuvas) | **Manter, para testar.** Uma regra, visível, com aviso antes. Lição 5. |
| **Desfazer** | Volta a última peça | — | **Manter.** É jogo casual e o desfazer reduz frustração. |
| **Vale do dia, par, recorde, relatório** | Mesmo vale para todos; meta e retrato da partida | — | **Manter.** É o motor do "só mais uma". |

## 3. Sustentabilidade: o que deu errado e o que mudou

A ideia (o rio precisa da mata para atravessar a seca) é boa e verdadeira para o Cerrado. A v0.6 errou na **forma**:

- **Regras demais**: colheita, celeiro, casas, comida por casa crescendo, fome, chuvas. Eram seis regras novas para um jogo cujo núcleo cabe em três.
- **Contas escondidas**: "Casas 4/6" depende de comida ÷ consumo do ano e de água na seca. Ninguém faz essa conta olhando o vale.
- **Consequência longe da decisão**: o campo colocado agora só pesava 8 jogadas depois, no ano novo.
- **Punição sentida como injusta**: perder peças por "fome" de casas que a pilha obrigou a colocar.

A v0.7 fica com **uma regra só**, espacial e visível:

> **Na seca, o rio só corre onde há bosque encostado.**

Como fica:

- O ano tem **Águas (8 jogadas)** e **Seca (4 jogadas)**, as duas estações do Cerrado.
- Nas 4 jogadas antes da seca, o rio que vai secar fica **em laranja**, com "sem mata" no ponto onde o rio corta.
- **Quando a seca chega**, cada trecho que continua correndo vale **+1** e rende **peças**:
  - no ano 1, +1 peça a cada 2 trechos;
  - no ano 2, a cada 3;
  - no ano 3, a cada 4.
  - Essa é a **dificuldade que cresce** quando se avança: a seca fica mais dura a cada ano.
- **As chuvas voltam** com **+2 peças**, e o rio corre de novo.
- Na tela, um indicador mostra "Rio protegido para a seca: 3 de 4 → +1 peça" e, com uma peça escolhida, o antes e o depois.

Por que essa calibragem (30 vales por linha):

| Regra da seca | Guloso: peças | Cuidadoso: peças | Problema |
|---|---|---|---|
| +1 peça a cada 2 trechos, sempre | 47 | 90, chegando a 300 | **Disparada**: o rio protegido cresce e paga todo ano |
| No máximo 3 ou 4 peças por seca, + chuvas | 67–72 | 73–101, chegando a 300 | Ainda dispara |
| A cada 2, 3, 4… sem chuvas | 35 | 36 | A seca quase não rende e as partidas ficam curtas |
| **A cada 2, 3, 4… + chuvas de +2 (escolhida)** | **48** | **56** | Duração igual à da v0.5 (cerca de 47 peças) |

Com a regra escolhida:

- quem protege o rio faz **35% mais pontos** (271 contra 201);
- seca **metade** dos trechos;
- mantém **5×** mais rio correndo na seca.

## 4. Onboarding: as lições

Hoje o jogo se explicava numa folha de texto antes de jogar. Ninguém aprende assim: as regras só fazem sentido com a peça na mão. A v0.7 troca a folha por **cinco lições curtas**, cada uma num vale pronto.

### Princípios

- **Uma mecânica por lição**, num vale montado para ela, com peças fixas (sempre as mesmas).
- **Um objetivo visível** no cartão do topo, com o progresso ("Objetivo: 6 lados combinando (4/6)").
- **A casa certa vem marcada** ("toque aqui") e a peça já vem girada. O texto muda a cada passo: antes de escolher, com a peça escolhida, depois de colocar.
- **O erro é parte da lição.** Na lição 3, passar de 5 perde a missão. Na lição 5, quem joga só pelos pontos deixa o rio secar. Nos dois casos a tela diz o que aconteceu e oferece "Tentar de novo".
- **Curto**: 1 a 3 jogadas por lição, cerca de 2 minutos no total.
- **Sem prisão**: o link "Pular lições" fica sempre visível, e as lições podem ser refeitas pelo botão "?".
- **Esconder o que ainda não foi ensinado**: a barra do ano só aparece na lição da seca, e a lista de missões fica escondida durante as lições.
- Quem nunca fez as lições começa por elas. No fim, o botão leva ao vale do dia.

### As cinco lições

| Lição | Vale | Objetivo | Ensina |
|---|---|---|---|
| 1 · Encaixe | Nascente, um bosque e um campo | 6 lados combinando | Tocar, girar, colocar; +1 por lado; qualquer peça cabe |
| 2 · Água viva | Uma peça de rio com bandeira, a 2 casas da nascente | Levar água até a bandeira | Água viva, +2 por peça, missão de água (+3 peças), brejo |
| 3 · Missões | Bosque de 3 peças com a missão "5" | Bosque com exatamente 5 | Número exato, prévia "3→4/5", ✗ quando passa; missão = peças na pilha |
| 4 · Peça perfeita | Uma casa cercada por bosque e campo | Fechar com os 6 lados combinando | Peça perfeita: +5 e +1 peça |
| 5 · Seca e mata ciliar | Rio de 3 trechos sem mata; seca em 2 jogadas | 3 trechos protegidos | Laranja = vai secar; bosque encostado protege; a seca rende peças |

Testado: as cinco lições se resolvem seguindo a casa marcada. Jogando só pelos pontos, a lição 5 falha, que é justamente o que ela precisa mostrar.

## 5. O que observar no teste com pessoas

- Alguém precisou abrir o "?" depois das lições?
- Na primeira partida de verdade, a pessoa olhou o laranja antes da seca?
- Ela entende de onde vêm as peças da pilha (missões, perfeitas, seca, chuvas)?
- A seca parece justa ou punitiva?
- Quanto tempo as lições levaram? Alguém pulou?

Se a seca ainda parecer um sistema à parte, o próximo passo é testar um **modo sem seca**: as mecânicas 1 a 7 sozinhas já formam um jogo completo. A seca entraria só a partir de um certo vale, como a primeira "página" do Caderno do Cerrado previsto em `FATOR_REPLAY.md`.

## 6. Missões: de "número exato" para "prazo" (v0.9)

Retorno do teste: "estourar a missão? Estou sendo punido por fazer mais do que se pede?" A crítica procede:

- **No tema**, crescer o bosque não deveria ser erro.
- **Na prática**, o número exato fazia a pessoa evitar encostar peças boas na região, ou seja, jogar contra o próprio encaixe.

A regra nova põe a tensão no **tempo**, não num teto:

- A peça de missão pede que a região cresça **+2 a +4 peças** (vila: +2 ou +3) em até **3 jogadas por peça pedida + 2**. Missão de água: 10 jogadas.
- O número aparece na bandeira, junto com o prazo ("4/6 · 10⏳").
- Passar do número não tem problema. Se o prazo acaba, a missão vai embora sem castigo.

Simulação (30 vales):

| Regra | Bot guloso: missões feitas | Bot que persegue missões | Peças por partida (persegue) |
|---|---|---|---|
| Número exato (antiga) | 3,8 | 4,7 | 56 |
| Prazo curto (+N jogadas) | 1,0 | — | 36 |
| **Prazo de 3 jogadas por peça + 2 (escolhida)** | **2,3** | **5,0** | **56** |

O resultado mais importante é a diferença entre os bots:

- Com prazo, quem **persegue** a missão faz mais que o dobro do guloso (5,0 contra 2,3).
- Com número exato, a diferença era pequena (4,7 contra 3,8), porque as missões se cumpriam quase por acaso.

Ou seja, a missão agora recompensa a **intenção**. O tamanho da partida continua o mesmo.

## 7. Marcos e fauna (v1.3) pelos mesmos três critérios

| Mecânica | Cria uma decisão? | Cabe numa frase e se vê? | Consequência perto? | Veredito |
|---|---|---|---|---|
| **Marcos do vale** (3 gotas medidas por bots) | Sim: "proteger o rio agora ou pontuar já?" ganha um alvo | Sim: gotas e número no placar | Sim: a faixa aparece na jogada em que o marco é alcançado | **Manter**. Substitui o par e o recorde como medida principal |
| **Fauna** (11 bichos por hábitat) | Sim, e por gosto: crescer o pasto para o lobo-guará custa pontos | Sim: "Um pasto com 8 peças encostado num bosque com 8" | Sim: o bicho aparece na hora, no lugar do hábitat | **Manter**, sem pontos, para não virar mais uma conta |

Detalhes, números e o que foi descartado estão em `FATOR_REPLAY_2.md`.

## 8. Missões durante a partida (v2.4)

A pergunta: as missões fazem sentido no meio da partida?

A medida foi feita com bots: o guloso, o cuidadoso e o mestre, que persegue missões. Foram 30 a 60 vales, nas regras da v2.3 e nas da água no centro. Simuladores: `sim/revisao/missoes.js` e `sim/v24_teste.js`.

| Achado | v2.3 | Problema |
|---|---|---|
| Missões de vila cumpridas | 17% (guloso) e 35% (mestre) | A vila é rara na pilha (13% da terra), mas tinha o mesmo prazo que bosque e campo |
| Missões nascidas no último décimo da partida | 0 cumpridas, em dezenas | A pilha acabava antes do prazo. Era uma promessa impossível no fim |
| Missões abertas quando a pilha acaba | cerca de 20% | O mesmo efeito |
| Missão de água, com o rio que encaixa | 95% cumpridas | Ficou automática: levar água até a peça vira consequência de jogar |

O que mudou:

- **Prazo pela raridade do terreno**: 4 jogadas por peça pedida em bosque e campo, 6 em vila, mais 3 de folga. Vila cumprida pelo mestre: de 28% para 54%.
- **Missão só nasce se a pilha pode cumpri-la**: são precisas pelo menos as peças pedidas, mais 1.
- **Missão de água virou "água na seca"**: a peça marcada precisa ter água correndo quando a seca chegar. Ela junta as duas regras da água, ligar e proteger com mata, e separa quem cuida do rio. O guloso cumpre 41%, e o cuidadoso 88%.
- **Recompensa de +2 peças** (eram 3). Isso freia a pilha, que com mais água viva crescia demais.

O que a missão faz agora:

- dá uma meta de médio prazo visível, com bandeira, ficha, prévia "3→4/5" e prazo;
- premia a intenção: quem persegue cumpre perto do dobro do guloso;
- o fracasso continua sem castigo: a missão só vai embora.

Pelos três critérios da seção 1, ela fica.

## 9. A economia do vale (v3.0)

Cada terreno passa a ter uma função, e cada função cabe numa frase:

- lavoura irrigada +2;
- pasto irrigado +1;
- vila com água +1 por lavoura irrigada encostada, até 3;
- mata junto ao rio +1.

Irrigada é a peça que o rio vivo toca. A jogada vale o encaixe mais o quanto o vale passa a produzir, e a colheita, na chegada da seca, soma a produção com a água da seca.

Pelos critérios da seção 1:

1. **Cria decisão.** Onde passa o rio, onde fica a lavoura e onde fica a vila mudam os pontos. Planejar dá 26% a 45% a mais que só olhar o ganho imediato.
2. **Cabe numa frase e se vê no vale.** O verde é o irrigado, e a prévia mostra o número em cada peça que muda.
3. **A consequência fica perto da decisão.** O ganho de produção entra na jogada; a colheita repete esse ganho a cada ano e é anunciada pela barra do ano.

Saíram a cheia e os pontos por trecho na seca, porque a colheita faz o mesmo papel com mais sentido.

## 10. A aldeia e a despensa (v3.1)

Cada peça com vila é uma casa. A aldeia colhe o que está a até 2 casas dela: comida da lavoura e do pasto irrigados, lenha da mata. Na seca, cada casa come 2 e queima 1 de lenha (2 com friagem, a mesma frente fria do céu). A chave "Proteger a mata do rio" decide se a aldeia pode cortar a mata da beira quando falta lenha. A mata cortada não segura o rio e fica em toco por um ano. Nas chuvas, cada casa atendida vale +5; o ano farto traz +3 peças, e metade ou mais das casas atendidas, +2.

Pelos critérios da seção 1:

1. **Cria decisão.** Onde fica a mata (perto da vila e longe do rio, ou na beira) e se a chave fica ligada. Planejar dá 60% de anos fartos, contra 43% de quem só olha o ganho imediato.
2. **Cabe numa frase e se vê no vale.** A ficha da despensa mostra o que tem e o que falta antes da seca, e a prévia da peça mostra 🌾 e 🪵.
3. **A consequência fica perto da decisão.** O corte, a seca do rio e a colheita menor acontecem na mesma virada da seca. O toco cobra no ano seguinte.

A colheita da seção 9 continua em pontos, e o rio que aguenta a seca voltou a valer +1 por trecho: sem isso, cortar a mata da beira não custava nada (`ALDEIA_E_RECURSOS.md`, seção 3.7).

