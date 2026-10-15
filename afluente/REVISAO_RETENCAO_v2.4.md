# Afluente — Revisão crítica das propostas, com foco em retenção (v2.4)

Retorno sobre a `REVISAO_MECANICAS_v2.3.md`: "partidas longas não importam; o jogo também é para ser contemplativo, então até **20 a 25 minutos para os mais experientes** é um bom número". O pedido é revisar as mecânicas sugeridas de forma crítica, pensando em retenção, e ver se ficou de fora algo que vale a pena.

Este documento revisa cada proposta da v2.3 com a nova restrição de tempo e com quatro horizontes de retenção. Traz também cinco medições novas, que mudaram três das propostas.

---

## 0. Resumo

| Proposta da v2.3 | Veredito agora | O que mudou |
|---|---|---|
| Rio precisa encaixar | **Mantida, com freio**: missão passa a dar 2 peças | Sem freio, a partida do bot mestre dispara: 10% passam de 341 jogadas (45 min ou mais). Com o freio, o máximo é 137 jogadas, como hoje, e o rio vivo sobe de 47% para 85% (seção 3.1) |
| Fim marcado no ano 4 | **Retirada** | Partidas longas são bem-vindas. No lugar: um teto natural pela pilha (o freio acima) e pausas no fim de cada ano |
| Rotação manual | **Retirada. A rotação automática fica** | Medido: o bot cuidadoso escolhe uma rotação diferente da interface em só **2%** das jogadas, e perde 0,6 ponto quando escolhe. A interface tira o tédio, não a decisão |
| Sem desfazer no vale do dia | **Trocada** por "desfazer contado" | Num jogo calmo e de sessão longa, o desfazer protege do erro de toque. Ele fica, mas o resultado mostra quantas vezes foi usado |
| Tirar a chuva de +2 peças | **Retirada. A chuva fica** | Sem chuva, 73% das primeiras jogadas do mestre rendem 1 ponto ou menos, e a partida morre cedo. A chuva é a rede de segurança do começo |
| Tirar a Ponte, pôr a Vereda | **Mantida** | Novidade dentro da partida, com tema forte |
| Bicho do dia | **Mantida e promovida** | É a proposta mais barata para o horizonte "amanhã" (D1) |
| Momento afluente | **Mantida, depois do rio que encaixa** | — |
| Congelar arte | **Mantida, com ressalva** | Num jogo contemplativo a beleza retém, mas a arte de hoje já basta para testar as regras |

**O que ficou de fora e vale a pena** (seção 4), em ordem de valor para retenção:

1. **Vale com começo**: o vale do dia já abre com um trecho de rio e 3 ou 4 peças. Corrige o pior trecho do jogo, as primeiras jogadas.
2. **Link de desafio com a semente** no texto para compartilhar. Hoje o texto não tem link.
3. **Série gentil**, com folga. A série atual é rígida.
4. **Caderno que continua**: hoje um bom jogador fecha os 11 bichos em uma a duas semanas.
5. **Calendário do Cerrado**: o vale do dia segue as estações reais.
6. **Álbum de vales**: cada vale do dia jogado vira uma foto guardada.
7. **Modo livre**, liberado ao conquistar algo: para o público contemplativo.
8. **Fim de partida sem missões impossíveis** e uma contagem das últimas peças.

---

## 1. Como medir retenção aqui

São quatro horizontes, com perguntas diferentes:

| Horizonte | Pergunta | O que existe hoje |
|---|---|---|
| **Primeira sessão (D0)** | A pessoa entende o jogo e gosta dos primeiros minutos? | Cinco lições e a primeira jogada guiada |
| **Sessão** | Fica até o fim e quer outra agora? | Gotas, missões, a última cheia, "tentar o próximo marco", fauna |
| **Amanhã (D1)** | Volta no dia seguinte? | Vale do dia, série rígida, contagem para o próximo vale |
| **Semanas (D7–D30)** | Ainda joga daqui a um mês? | Caderno do Cerrado (11 bichos), Caderno do Céu (18 fenômenos), estatísticas |

O critério de cada proposta passa a ser "melhora qual horizonte, a que custo e com que risco", além dos três critérios do `MECANICAS.md`.

Referência de tempo: com 8 s por jogada (o número de `CLIMA.md`), 20–25 min são **150 a 190 jogadas**. Com 12 s por jogada, que é mais provável para quem joga com calma, são **100 a 125 jogadas**.

---

## 2. Medições novas

### 2.1 Quanto dura a partida de quem joga bem

Jogadas por partida, nos mesmos vales `dia-t*` (mestre com 40 ou 60 vales, os outros com 100):

| Regra | Jogador | Mediana | 75% | 90% | Máximo |
|---|---|---:|---:|---:|---:|
| Como está | cuidadoso | 42 | 54 | 77 | 107 |
| Como está | mestre | 53 | 68 | 124 | 138 |
| Rio encaixa | cuidadoso | 52 | 67 | 91 | 186 |
| Rio encaixa | mestre | 76 | 115 | **341** | **400** (o limite do simulador) |
| Rio encaixa, sem chuva | mestre | 38 | 51 | 63 | 65 |
| Rio encaixa, seca endurece 2× mais rápido | mestre | 55 | 78 | 95 | 136 |
| Rio encaixa, missão dá 2 peças | mestre | 46 | 59 | 66 | 137 |

- **O jogo atual já cabe no alvo.** O mestre chega no máximo a 138 jogadas: 18 min a 8 s por jogada, ou 28 min a 12 s.
- **O rio que encaixa, sozinho, faz a pilha disparar.** O mestre ganha quase uma peça por jogada (0,9), e um vale em cada dez vira uma partida sem fim.
- **Tirar a chuva freia demais.** A partida do mestre cai para 38 jogadas, e o começo morre (2.3).

### 2.2 A rotação automática quase nunca atrapalha

Para cada jogada dos bots que planejam, comparei a rotação escolhida com a que a interface entregaria naquela casa:

| Regra | Jogador | Jogadas em que a rotação difere | Custo imediato médio |
|---|---|---:|---:|
| Como está | cuidadoso | 1,9% | 0,6 ponto |
| Como está | mestre | 2,1% | 0,5 ponto |
| Rio encaixa | cuidadoso | 2,2% | 0,6 ponto |
| Rio encaixa | mestre | 1,9% | 0,6 ponto |

**Isso contradiz a v2.3.** Lá o número era "girar ao acaso tira 49% dos pontos", o que só mostra que girar *errado* custa caro. Achar a melhor rotação numa casa é uma busca de no máximo 6 opções, sem decisão de verdade: a pessoa giraria até o verde aparecer. A decisão está em **escolher a casa**, e essa continua com a pessoa. Numa partida de 100 a 150 jogadas, obrigar a girar toda vez seria só atrito.

### 2.3 O começo é o pior trecho do jogo

Pontos por jogada em cada décimo da partida (bot cuidadoso, regras de hoje, 100 vales):

| Décimo | 1º | 2º | 3º | 4º | 5º | 6º | 7º | 8º | 9º | 10º |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Pontos por jogada | **2,0** | 3,4 | 4,2 | 4,2 | 4,8 | 4,9 | 5,1 | 5,2 | 4,6 | 3,7 |
| Jogadas que rendem ≤ 1 ponto | **56%** | 24% | 16% | 13% | 8% | 7% | 8% | 7% | 6% | 6% |
| Missões cumpridas por jogada | 0,04 | 0,09 | 0,11 | 0,09 | 0,08 | 0,07 | 0,07 | 0,06 | 0,03 | **0,00** |

- **O começo é fraco**: mais da metade das primeiras jogadas quase não pontua, porque o vale tem só a nascente e quase nenhum vizinho para encaixar. É o primeiro contato de quem abre o jogo (D0), e também de quem volta todo dia (D1).
- **O fim esvazia**: no último décimo quase nenhuma missão se cumpre. As missões que aparecem nas últimas peças não têm como ser cumpridas, e a partida se arrasta até a pilha acabar.
- **O meio é bom**, sem queda. Partidas longas não perdem o interesse no meio, nem no mestre: o meio fica entre 5,1 e 5,6 pontos por jogada.

### 2.4 O caderno acaba cedo

Com a frequência de cada bicho medida no `FATOR_REPLAY_2.md`, este é o número esperado de partidas para ver os 11:

| Jogador | Partidas para completar os 11 | Sem contar a onça |
|---|---:|---:|
| casual | 51 | 10 |
| guloso | 14 | 6,5 |
| mestre | 6,4 | 4,9 |

Para quem joga só o vale do dia, o caderno de fauna acaba em **uma a duas semanas** para quem joga bem. Para quem joga sem atenção, a única coisa que falta depois de dez dias é a onça. Depois disso, o horizonte D7–D30 só tem o Caderno do Céu.

---

## 3. Revisão de cada proposta

### 3.1 Rio precisa encaixar → mantida, com freio

**Retenção:**

- **Sessão**: torna o rio uma decisão, que é o motor de maestria do `FATOR_REPLAY.md`: jogar bem rende muito mais que jogar mal (o aleatório faz 20 pontos, o guloso 272).
- **Primeira sessão**: é um risco. Uma regra a mais, e a sensação de "esta peça não cabe".
- **Semanas**: dá profundidade, porque o mesmo vale passa a ter rotas.

**Freio:** sem freio, a regra quebra o alvo de duração. A peça ganha precisa ser um pouco mais rara. Testei três freios com o bot mestre:

| Freio | Mestre: mediana / 90% / máx | Cuidadoso ÷ guloso (pontos) | Problema |
|---|---|---:|---|
| Sem chuva | 38 / 63 / 65 | 0,99 | Começo morto, partidas curtas, e a seca deixa de pagar |
| Seca 2× mais dura | 55 / 95 / 136 | 0,98 | Cabe no tempo, mas proteger o rio deixa de valer pontos |
| **Missão dá 2 peças (eram 3)** | **46 / 66 / 137** | 1,03 | O melhor dos três. Começo ainda fraco (4.1 resolve) |

Para comparação: o rio que encaixa sem freio dá 76 / 341 / 400 e 1,13. O jogo de hoje dá 53 / 124 / 138 e 1,10.

#### 3.1.1 Missão com 2 peças: o freio recomendado

Com o rio que encaixa e a missão dando 2 peças (100 vales; mestre com 40):

| | Hoje | Rio encaixa + missão 2 peças |
|---|---:|---:|
| Guloso: pontos | 177 | 208 |
| Guloso: jogadas (mín–máx) | 44 (26–88) | 44 (27–93) |
| Mestre: jogadas (mediana / máx) | 53 / 138 | 46 / 137 |
| Rio vivo no fim (guloso) | 47% | **85%** |
| Trechos secos: guloso / cuidadoso | 7,4 / 1,9 | 10,2 / 3,9 |
| Descartes (sem casa válida) | — | 0 |

- **A duração fica igual à de hoje**: o máximo do mestre é 137 jogadas, de 18 a 27 minutos. O alvo de 20 a 25 minutos fica preservado.
- **O rio vivo quase dobra** (de 47% para 85%), e a seca continua separando quem cuida do rio: 2,6× menos trechos secos.
- **Ponto fraco**: a vantagem do cuidadoso em pontos cai de +10% para +3%. Com mais rio vivo, as missões e o encaixe pesam relativamente mais que a seca. O próximo ajuste a testar é a missão dar 3 peças nos anos 1 e 2 e 2 peças depois. Isso não foi simulado. Ele afrouxa o começo (o 1º décimo continua fraco: 69% das jogadas do mestre rendem 1 ponto ou menos) e freia só a cauda. A seção 4.1 ataca o começo por outro lado.

**Para o primeiro contato**: a lição 2 passa a ensinar "água só encosta em água" e mostra o "fim de rio" como o jeito certo de terminar. As casas que não aceitam a peça ficam apagadas.

### 3.2 Fim marcado → retirado

- A duração longa é desejada, e o jogo atual já cabe no alvo (2.1). Um corte no ano 4 encurtaria justamente a partida de quem joga melhor, que é quem mais gosta do jogo.
- O que a v2.3 queria resolver com o fim marcado (comparar dias diferentes) as gotas por bots já resolvem.
- **No lugar: pausa no fim do ano.** Quando as chuvas voltam, uma faixa discreta diz: "Ano 3 no vale. Seu vale fica guardado." Em partidas de 20 min no celular a interrupção é certa. O jogo já guarda e retoma ("continuar · N peças"), mas uma pausa com nome faz a parada parecer escolha, e não abandono. Isso se apoia no estudo de saída de sessões citado no `FATOR_REPLAY_2.md`, em que saídas boas vêm com sensação de fechamento.

### 3.3 Rotação manual → retirada

- O dado da seção 2.2 decide: a rotação automática não tira decisão, só tira atrito.
- **Uma melhoria pequena e barata**: quando outra rotação da mesma casa protege o rio para a seca (a escolha do bot cuidadoso, nos 2% das jogadas), aparece um ícone discreto "↻ protege o rio". Isso ensina a seca no momento em que ela importa, sem escolher pela pessoa.

### 3.4 Sem desfazer no vale do dia → trocada por "desfazer contado"

- **Retenção**: num jogo de sessão longa e tom calmo, perder uma jogada boa por um erro de toque é frustração pura, e frustração sem causa é o que faz fechar o app (C2 do `FATOR_REPLAY_2.md`: a derrota precisa ser "minha").
- **Justiça**: a comparação principal é com os bots, que não desfazem, e entre amigos pelo texto compartilhado. O que importa é ser honesto, não ser rígido.
- **Regra**:
  - o desfazer continua livre, sempre da última peça;
  - o resultado do vale do dia mostra "↶ 2", ou o selo "sem desfazer";
  - o texto para compartilhar leva o mesmo número.
- É o modelo do Puzzmo, em que se pode desfazer e o contador não volta, e do modo difícil do Wordle, que é opcional e aparece no resultado. Quem quer competir joga sem desfazer, e quem quer contemplar não perde nada.

### 3.5 Tirar a chuva → retirada

A chuva é automática, mas tem duas funções que a v2.3 não viu:

- **rede de segurança**: para quem joga mal, ela é praticamente a única fonte de peças (4 de 4 peças ganhas pelo aleatório), e é ela que deixa a primeira partida chegar ao ano 3;
- **ritmo**: o rio volta a correr, arco-íris. É um presente previsível a cada ano, e funciona como o "progresso dado" do `FATOR_REPLAY_2.md`.

A Lagoa continua dando +1 peça. Simplificar as fontes de peças não compensa mexer no que funciona.

### 3.6 Vereda no lugar da Ponte → mantida

- **Sessão**: é a novidade de meio de partida, como os pacotes do Islanders. A partida longa precisa de coisas novas aparecendo, e as especiais fazem esse papel.
- **Semanas**: é um bom candidato a bicho novo, o buriti com arara-canindé ("uma Vereda com água viva na seca").
- **Teste no simulador**: confirmar que ela não vira um segundo motor de peças, porque o rio que encaixa já acelera a pilha.

### 3.7 Bicho do dia → mantida e promovida

- **Amanhã (D1)**: dá um motivo diferente a cada dia, com o mesmo vale para todos.
- **Semanas**: a sequência dos bichos do dia pode guiar o caderno. A onça aparece como bicho do dia quando o vale permite, e assim o casual tem uma chance real de vê-la.
- **Custo**: o validador escolhe, entre os bichos que o bot mestre alcança naquele vale, o que o jogador ainda não tem. Se tiver todos, escolhe o mais raro.

### 3.8 Momento afluente → mantida, depois de 3.1

Sem mudança. Só faz sentido testar depois que o rio encaixar, e com um bot que olhe 2 jogadas à frente.

### 3.9 Congelar arte → mantida, com ressalva

- O público contemplativo fica pela beleza: Townscaper e Tiny Glade vendem quase só por ela. Mas as críticas desses jogos ("brinquedo", "nada em jogo") mostram que a beleza não segura sem regra.
- A ordem certa continua sendo regra primeiro, porque o teste com pessoas decide a regra. A arte atual não invalida nenhum teste, e a arte nova não muda nenhuma conclusão.

---

## 4. O que ficou de fora e vale a pena

### 4.1 Vale com começo (prioridade alta: D0 e D1)

**Regra:** *o vale do dia abre com a nascente, um trecho de rio de 2 a 3 peças e mais 2 ou 3 peças de terra*, gerados pela semente.

- **Dado**: o primeiro décimo da partida é o pior trecho do jogo (2.3).
- **Precedentes**:
  - o **Carcassonne: O Rio** abre o jogo com o rio;
  - a **v0.3 do próprio Afluente** tinha um "córrego inicial de 2 casas", criado justamente porque o começo travava.
- **Variedade diária**: cada dia começa com uma paisagem diferente, como um rio que desce reto, uma curva com mata ou uma vila na beira. O vale fica reconhecível desde a primeira jogada, e isso também vale para a imagem do compartilhamento.
- **Custo**: o motor já tem vales prontos (as lições usam `board`). Basta gerar a abertura pela semente e recalibrar as gotas.

### 4.2 Link de desafio (prioridade alta: D1 e aquisição)

- **Hoje**: o texto para compartilhar não tem link (é só texto copiado), e não há como abrir o vale de outra pessoa.
- **Regra**: o texto leva `…/afluente/#dia-47`, que abre aquele vale do dia, com as gotas de quem mandou como meta extra ("Ana fez 💧💧 aqui").
- **Precedentes**: a grade do Wordle se espalhou por ser compartilhada. *Dorfromantik: The Duel* é exatamente "mesmas peças, paisagens separadas". O desafio pela semente já estava como "depois" no `FATOR_REPLAY_2.md` (ideia 18).
- **Retenção**: traz o pertencimento, a terceira necessidade da teoria da autodeterminação, que o jogo hoje não toca. Também traz gente nova.

### 4.3 Série gentil (prioridade alta: D1)

- **Hoje**: "dias seguidos" é rígida. Perder um dia zera a série.
- **Regra**:
  - uma "chuva de folga" cobre um dia perdido por semana;
  - quando a série zera, a tela dá boas-vindas, e não fala de perda.
- **Evidência**: o Duolingo publica que separar a meta diária da série deu +3,3% de retenção no D14. A pesquisa anterior já registrava que perder uma série longa leva ao abandono, e que voltar importa mais que manter a série. Isso já tinha sido decidido no `FATOR_REPLAY.md` e não foi feito.

### 4.4 O caderno continua (prioridade alta: D7–D30)

O caderno de fauna acaba em uma a duas semanas (2.4). Três camadas, sem dar poder:

1. **Mais bichos com condições combinadas**, ligados às regras novas: arara-canindé (Vereda viva na seca), ariranha (rio vivo de 15 peças), veado-campeiro (pasto com 10 e nenhuma vila encostada), pato-mergulhão (cachoeira e mata encostada, o bicho mais raro). A fauna do Cerrado tem espécies de sobra.
2. **Páginas que abrem variantes no treino**: Vereda, Estiagem e Florada. Isso estava no `FATOR_REPLAY.md` e no `FATOR_REPLAY_2.md` como "depois". É o motor de progressão em variedade, não em força.
3. **O bicho no seu vale**: cada bicho tem um "seu recorde" (o maior hábitat em que apareceu). Assim a coleção continua depois de completa. É barato, porque `faunaProgress` já mede isso.

### 4.5 Calendário do Cerrado (prioridade média: D30 em diante)

**Regra:** *o vale do dia segue a estação real do Cerrado.*

- **Seca real (maio a setembro)**:
  - os vales começam na seca;
  - os ipês florescem (a floração na seca já existe desde a v1.8);
  - há mais bichos de seca no sorteio do bicho do dia.
- **Águas (outubro a abril)**: os vales começam nas águas, com mais Cachoeira e Lagoa.
- **Semanas especiais**: Florada dos ipês (agosto e setembro) e Primeiras chuvas (outubro), com o "vale da semana" do `FATOR_REPLAY.md`.

Por que entra:

- dá ritmo ao ano inteiro sem conteúdo novo, só com parâmetros do gerador;
- reforça o tema;
- cria o "volta em agosto para ver a florada", um motivo de longo prazo que não pune quem falta.

**Cuidado**: o jogo deve indicar a estação real na tela inicial, para quem está no hemisfério norte entender por que é "seca".

### 4.6 Álbum de vales (prioridade média: D7–D30, público contemplativo)

- Cada vale do dia jogado vira uma foto: o retrato do fim, que já existe, guardado num calendário. Tocar numa foto abre o vale no modo Contemplar.
- **Custo baixo**: as jogadas já ficam guardadas (desde a v0.8 dá para rever o resultado), então o vale pode ser remontado com `replay`. Não é preciso guardar imagem.
- **Precedentes**: a foto do sistema no fim do Mini Metro, e o próprio Contemplar. Para quem joga pela beleza, um mês de vales é a recompensa.

### 4.7 Modo livre (prioridade média: público contemplativo)

- **Regra**: pilha sem fim, sem pontos, sem gotas, com seca e fauna funcionando.
- Liberado depois do primeiro Rio cheio, como recompensa.
- **Precedentes**: o modo Criativo do Dorfromantik e o Zen do NYT Tiles.
- **Risco**: virar brinquedo. Por isso fica fora do vale do dia e só abre depois de conquistado.

### 4.8 Fim sem missões impossíveis e últimas peças (prioridade média: sessão)

- **Dado**: no último décimo quase nenhuma missão se cumpre (2.3).
- **Regra**:
  1. Uma peça só traz missão se a pilha tem peças para cumpri-la: pelo menos as peças pedidas, mais uma.
  2. Quando restam 5 peças, aparece "últimas 5 peças", e a câmera abre um pouco. O fim fica com tensão crescente, e não com a pilha simplesmente minguando. É o pico do fim do `FATOR_REPLAY_2.md`, que hoje só começa depois da última peça.
- **Custo**: duas linhas no motor e uma faixa.

### 4.9 Considerados e deixados para depois

| Ideia | Por que não agora |
|---|---|
| Notificação diária (aviso do navegador) | Só funciona com o app instalado na tela inicial, e o tom é delicado. Entra depois da série gentil, sempre opcional e desligada por padrão |
| Escada de dificuldade (Estiagem 1–6) | O Rio cheio ainda é um teto alto. Só quando alguém fizer três gotas com frequência |
| Placar global | Precisa de servidor e traz a queixa de trapaça (Puzzmo, Slay the Spire 2). O link de desafio (4.2) faz o papel social |
| Missão "fechar a região" (bandeira do Dorfromantik) | Boa, mas é mais uma regra. Fica como página do caderno (4.4) |

---

## 5. Ordem recomendada

| Etapa | O quê | Horizonte |
|---|---|---|
| 1 | Teste com pessoas: v2.2 contra v2.2 + rio que encaixa (com freio) + vale com começo + desfazer contado | D0, sessão |
| 2 | Link de desafio, série gentil, bicho do dia | D1 |
| 3 | Fim sem missões impossíveis, últimas peças, pausa no fim do ano | Sessão |
| 4 | Vereda, mais bichos, "seu recorde" no caderno | Sessão, D7–D30 |
| 5 | Álbum de vales, calendário do Cerrado, modo livre | D30 em diante |

Medidas para o teste (seção 7 da v2.3, mais estas):

- tempo da primeira jogada até a primeira peça que pontua;
- quantas partidas foram interrompidas e retomadas;
- partidas por pessoa em 7 dias;
- quantas pessoas abriram um link de desafio.

---

## 6. Arquivos

- `sim/revisao/fases.js`: duração (mediana e percentis), rotação comparada com a da interface, e pontos, peças e missões por décimo da partida. Uso: `node fases.js motor.js mestre 60`; com variante: `node fases.js m_encaixe_rio.js mestre 40 '{"divGrow":2}'`.
- `sim/revisao/m_encaixe_rio_q2.js`: rio que encaixa, com missão dando 2 peças.
- `sim/revisao/resultados/`: as saídas usadas aqui (`fases_*.txt`, `freio_*.txt`).
