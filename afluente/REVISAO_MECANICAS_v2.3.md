# Afluente — Revisão das mecânicas e pesquisa comparada (v2.3)

> **Revisado na v2.4** (`REVISAO_RETENCAO_v2.4.md`). Partidas de até 20–25 min para quem joga bem passaram a ser desejadas, e medições novas mudaram três propostas:
> - o **fim marcado (4.2)** saiu;
> - a **rotação automática** fica, porque o bot cuidadoso diverge dela em só 2% das jogadas;
> - o **desfazer** fica, mas é contado no resultado;
> - a **chuva** fica.
>
> O rio que encaixa (4.1) continua, com um freio: a missão passa a dar 2 peças.

Pedido: olhar as mecânicas do Afluente, ver o que faz sentido ou não na gameplay, pesquisar jogos parecidos, decidir o que manter, acrescentar, tirar ou mudar, e ampliar as pesquisas que já existem (`MECANICAS.md`, `FATOR_REPLAY.md`, `FATOR_REPLAY_2.md`, `SUSTENTABILIDADE.md`, `CLIMA.md`).

Este estudo não repete o que já está nesses documentos. Ele traz três coisas novas:

1. **Medições próprias** no motor atual (extraído do protótipo da v2.2, sem mudanças), com 100 vales por linha em vez de 30 a 40, mais jogadores de referência e quatro variantes de regra.
2. **Pesquisa de jogos que ainda não tinham sido estudados**: Harmonies, Cascadia, Kingdomino, Carcassonne: O Rio, Isle of Skye, Planet, Timberborn, NYT Pips, Puzzmo, Spelunky Daily, Isle of Arrows e Station to Station. Também olhei com mais cuidado as regras de rio do Dorfromantik.
3. **Uma revisão do que o código faz de verdade**, porque em dois pontos ele difere do que os documentos dão a entender: a rotação automática e o Desfazer.

---

## 0. Resumo

| Decisão | O quê | Por quê, em uma linha |
|---|---|---|
| **Mudar (prioridade 1)** | **O rio precisa encaixar**: lado de água só encosta em água, e terra não encosta em água | Em 400 partidas simuladas nenhuma travou; o rio vivo no fim sobe de 47% para 85% das peças de rio; é a regra que dá tensão ao Dorfromantik |
| **Mudar (prioridade 1)** | **O vale do dia tem fim marcado**: termina na última seca do ano 4 (48 jogadas) ou antes, se a pilha acabar; cada peça que sobra vale pontos | Hoje a partida do bot guloso vai de 26 a 88 jogadas, e a do mestre de 27 a 239. Nenhum jogo diário de referência tem duração tão variável |
| **Mudar (prioridade 1)** | **A rotação volta a ser do jogador** no vale do dia | O código já entrega girada a rotação que mais pontua. Nos bots, girar ao acaso tira **49%** dos pontos: metade do quebra-cabeça é feita pela interface |
| **Mudar (prioridade 1)** | **Sem Desfazer livre no vale do dia** | O Desfazer de hoje mostra a peça de duas jogadas à frente e deixa testar tudo. É o mesmo vazamento que a v0.3 apontou |
| **Mudar** | **O momento "afluente" (ligar um ramo seco)** precisa existir | Só **0,4%** das jogadas acordam 2 peças ou mais de uma vez, e 55% das peças de rio já nascem secas |
| **Tirar** | **Ponte** | Já era candidata. A regra é obscura, pouco usada, e o espaço dela vai para a Vereda (abaixo) |
| **Simplificar** | **Chuva de +2 peças**, automática | Não cria decisão, e é a 5ª fonte de peças. Dá para trocá-la por uma pilha inicial maior |
| **Acrescentar (teste)** | **Vereda**: peça especial que é uma segunda nascente e não seca | É a base ecológica mais sólida da pesquisa e dá um alvo de rota na seca |
| **Acrescentar (teste)** | **Bicho do dia**: um bicho do caderno como meta opcional do vale do dia | Variedade diária sem regra nova (Cascadia Daily Trek, metas do Alto, Isle of Skye) |
| **Manter** | Encaixe, peça perfeita, missões com prazo, seca e mata ciliar, pilha como vida (no treino), marcos por bots, fauna sem pontos, caderno, lições | Passam nos três critérios do `MECANICAS.md` e a pesquisa nova os apoia |
| **Congelar** | Arte, clima e fauna 3D | Dez versões seguidas (v1.4 a v2.2) foram de apresentação, e as regras estão paradas desde a v1.3. O teste com pessoas (gate 1 do GDD) ainda não aconteceu |

---

## 1. Diagnóstico geral

### 1.1 O jogo virou "Dorfromantik no Cerrado", e a água pesa pouco

Na v0.4 o Afluente adotou o laço do Dorfromantik (encaixe, pilha como vida, missões) e manteve a água como identidade. Os números mostram que essa identidade quase não pesa no que se decide:

- Pontos que vêm da água viva: **8%** (bot guloso) e **7%** (bot mestre). Somando a seca e as especiais de água, a água fica em cerca de 20%.
- No fim da partida, **menos da metade das peças de rio tem água** (47% no guloso, 50% no mestre). A maioria dos rios fica solta.
- **55% das peças de rio já são colocadas secas**, longe da rede viva.
- O "momento afluente" (ligar um ramo seco e ver a água descer por tudo de uma vez) foi a promessa da v0.4. Hoje ele **quase não existe**: em 1.646 jogadas do guloso, só 7 acordaram 2 peças ou mais de uma vez (0,4%).

A causa é a v0.4 ter tirado a restrição do rio: qualquer peça cabe em qualquer casa, e rio contra terra vira brejo. Sem restrição, o rio é só mais uma cor, com um bônus pequeno.

### 1.2 A apresentação passou na frente da validação

Desde a v1.3 nenhuma regra mudou. As versões v1.4, v1.5, v1.6, v1.7, v1.8, v1.9, v1.10, v2.0, v2.1 e v2.2 foram todas de arte, clima com física, fauna com esqueleto, mapa de colisão e som. O protótipo tem 4.500 linhas, num arquivo só.

O próprio `FATOR_REPLAY.md` avisa: "**Risco principal:** adicionar sistemas demais antes de validar o núcleo. Cada fase deve ser testada com pessoas antes da próxima." Os documentos têm seis seções "o que observar no teste com pessoas", e nenhuma foi preenchida. O gate 1 do GDD ("5 pessoas jogam 3 vales cada no próprio celular") também não aconteceu.

**Recomendação:** congelar arte e clima até o teste com pessoas. As mudanças de regra deste documento custam pouco código, e a arte atual já basta para testar.

---

## 2. Medições novas (100 vales, motor da v2.2)

Simulador: `sim/revisao/medir.js` (ver seção 9). São os vales `dia-t0` a `dia-t99`, os mesmos para todos os jogadores. Os jogadores são:

| Jogador | Como joga |
|---|---|
| aleatório | casa e rotação ao acaso |
| casa boa, giro ao acaso | escolhe a melhor casa, mas gira ao acaso |
| guloso | melhor ganho imediato (peça ganha = 4 pontos), o bot do Ribeirão |
| cuidadoso | guloso + protege o rio para a seca |
| mestre | cuidadoso + persegue missões, o bot do Rio cheio |

### 2.1 O jogo como está

| Jogador | Pontos (média, mín–máx) | Jogadas (média, mín–máx) | Rio vivo no fim | Trechos que secaram |
|---|---:|---:|---:|---:|
| aleatório | 13 (4–44) | 26 (26–32) | 3% | 0,1 |
| casa boa, giro ao acaso | 91 (34–230) | 34 (26–54) | 18% | 1,5 |
| guloso | 177 (46–512) | 44 (26–88) | 47% | 7,4 |
| cuidadoso | 194 (41–681) | 46 (26–107) | 49% | 1,9 |
| mestre | 354 (51–2.041) | 67 (27–239) | 50% | 7,0 |

De onde vêm os pontos do guloso:

| Encaixe | Perfeita | Missão | Água viva | Especiais | Seca |
|---:|---:|---:|---:|---:|---:|
| 46% | 15% | 20% | 8% | 6% | 6% |

E de onde vêm as peças ganhas por ele (média por partida): missões 8,4; perfeitas 5,3; chuvas 6,2; seca 1,7; especiais 0,6.

O que se lê:

1. **Girar é metade do jogo.** A melhor casa com giro ao acaso faz 91 pontos, e o guloso faz 177. A interface já entrega a melhor rotação (seção 3.3), e com isso faz essa metade pela pessoa.
2. **A duração varia demais.** Com uns 8 s por jogada (o número que `CLIMA.md` usa), o guloso joga de 3,5 a 12 minutos e o mestre de 3,5 a 32 minutos. O alvo do GDD era de 3 a 5 minutos.
3. **A seca separa bem quem cuida do rio, mas pesa pouco nos pontos.** O cuidadoso seca 4× menos trechos (1,9 contra 7,4) e faz só 10% mais pontos. Isso resolve a contradição entre os estudos anteriores: o `MECANICAS.md` media +35% com 30 vales, e o `FATOR_REPLAY_2.md` +6% com 40. Com 100 vales, o número é cerca de +10%.
4. **A chuva é a 2ª maior fonte de peças**, e não depende de nada que a pessoa faça.

### 2.2 Variantes testadas

Cada linha muda uma regra só. Variantes com o mesmo número de vales:

| Variante | Guloso: pontos | Guloso: jogadas | Rio vivo no fim | Cuidadoso ÷ guloso | Observação |
|---|---:|---:|---:|---:|---|
| **Como está** | 177 | 44 | 47% | 1,10 | — |
| **Rio precisa encaixar** | **272** | 54 | **85%** | **1,13** | **0 descartes em 400 partidas**; nas peças de rio, 86% das casas abertas continuam valendo, e nunca menos de 4 casas |
| Cascata (cada peça a mais que acorda na mesma jogada vale +1 a mais) | 177 | 44 | 47% | 1,10 | Sem efeito: com as regras atuais, ligar um ramo seco quase nunca acontece |
| Irrigação (lado de campo ou vila que combina vale +1 com água viva por perto) | 164 | 41 | 40% | 1,23 | Aumenta a diferença por habilidade, mas não leva mais água ao vale. Não é conclusivo |
| Sem chuva de +2 | 126 | 34 | 49% | 1,06 | Partidas 23% mais curtas, e a seca perde peso |

Medidas extras com o rio encaixando:

- **Separa melhor quem joga bem.** O aleatório vai de 13 para 20 pontos e o guloso de 177 para 272.
- **A seca pesa mais.** Com mais rio vivo, há mais trecho a perder: o guloso seca 18,8 trechos e o cuidadoso 6,9.
- **A água pesa mais nos pontos.** Água viva, especiais e seca passam de 20% para 29% dos pontos do guloso.
- **Rio que nasce seco cai de 55% para 22%** das peças de rio. Na rede viva, ligar mais de uma peça de uma vez ainda é raro (13 em 2.049 jogadas), porque o bot guloso não prepara ramos.
- **Partidas mais longas** (54 jogadas em média, contra 44). Isso reforça a necessidade do fim marcado (seção 4.2).

**Limites**: bots não são pessoas. O guloso não sente frustração diante de uma casa "impossível", e é exatamente por isso que a v0.4 tirou a restrição ("criou buracos onde quase nenhuma peça cabia"). Nos números a partida nunca trava, mas a sensação de buraco só um teste com pessoas mostra. A seção 4.1 traz como amortecer isso.

---

## 3. Mecânica por mecânica (o que o código faz hoje)

Os critérios são os mesmos do `MECANICAS.md`: (1) cria uma decisão, (2) cabe numa frase e se vê no vale, (3) tem consequência perto da decisão. Acrescentei um quarto, vindo do vale do dia: (4) **é justo para comparar**, ou seja, todos jogam o mesmo jogo.

| Mecânica | 1 | 2 | 3 | 4 | Veredito |
|---|---|---|---|---|---|
| Encaixe de lados (+1) | ✔ | ✔ | ✔ | ✔ | **Manter** |
| Qualquer peça em qualquer casa | ✘ para o rio | ✔ | ✔ | ✔ | **Mudar**: só para o rio (4.1) |
| Brejo (rio contra terra) | ✘ | ✔ | ✔ | ✔ | **Mudar**: o brejo passa a vir da peça "fim de rio" e da Lagoa, e não de um encaixe errado. A garça continua (pede brejos) |
| Peça perfeita (+5, +1 peça) | ✔ | ✔ | ✔ | ✔ | **Manter**. Com o rio encaixando, as perfeitas sobem (7,9 peças contra 5,3), em vez de cair |
| Água viva (+2 na primeira vez) | ~ | ✔ | ✔ | ✔ | **Manter**. Ganha peso com o rio encaixando |
| Missões com prazo | ✔ | ✔ | ✔ | ✔ | **Manter**. O Dorfromantik de tabuleiro usa número exato, mas o teste da v0.9 mostrou que aqui isso pune. O prazo fica |
| Missão de água | ✔ | ✔ | ✔ | ✔ | **Manter** |
| Pilha como vida | ✔ | ✔ | ~ | ✘ no diário | **Manter no treino**; no vale do dia, **com fim marcado** (4.2) |
| Cachoeira, Lagoa | ~ | ✔ | ✔ | ✔ | **Manter** |
| Ponte | ✘ | ✘ | ✔ | ✔ | **Tirar**. A vaga dela vai para a Vereda (4.6) |
| Seca e mata ciliar | ✔ | ✔ | ✔ (aviso 4 jogadas antes) | ✔ | **Manter**. Ganha peso com o rio encaixando |
| Chuva (+2 peças) | ✘ | ✔ | — | ✔ | **Simplificar** (4.5) |
| **Rotação já escolhida** | ✘ | — | — | ✘ | **Mudar** (4.3) |
| **Desfazer livre** | — | — | — | ✘ | **Mudar no diário** (4.4) |
| Marcos por bots (3 gotas) | ✔ | ✔ | ✔ | ✔ | **Manter**. É o melhor achado dos estudos anteriores |
| Fauna sem pontos, caderno | ✔ (por gosto) | ✔ | ✔ | ✔ | **Manter**, com o bicho do dia (4.7) |
| Lições | — | ✔ | ✔ | — | **Manter**. A lição 2 muda se o rio passar a encaixar |
| Clima, hora, vento | ✘ | — | — | ✔ | **Manter como mundo, sem regra** (já decidido em `CLIMA.md`). Congelar |

### 3.1 A rotação automática, no código

`select(k)` em `prototipo/afluente.html` usa `E.options(G.s,k)`. Essa função devolve as rotações **ordenadas pelo ganho do bot guloso** (pontos + 4 × peças), e a peça abre na primeira delas. A pessoa toca numa casa e recebe a melhor rotação para ela. Girar só serve para piorar ou para empatar.

### 3.2 O Desfazer, no código

`commit()` guarda o estado anterior em `G.undo`, e o botão volta a ele em qualquer jogada, inclusive no vale do dia. Como `place()` revela a peça seguinte do "depois" (`resolve(n, n.next+1)`), quem coloca e desfaz **vê a peça de duas jogadas à frente**. E pode experimentar cada casa até achar a melhor. É o mesmo problema que a v0.3 descreveu ("o Undo vazava informação").

---

## 4. Propostas

### 4.1 O rio precisa encaixar (prioridade 1)

**Regra, em uma frase:** *água só encosta em água.*

- Um lado de água precisa dar em outro lado de água ou numa casa vazia. Um lado de terra não pode dar em água.
- **Como no Dorfromantik.** Lá, rio e trilho são as únicas restrições de colocação. O desenvolvedor explicou no fórum do Steam que os rios foram feitos de propósito como peças "mais difíceis", e que lagos e margens servem para terminá-los.
- **Como amortecer o "buraco impossível"** que levou a v0.4 a tirar a restrição:
  1. **Mostrar só as casas que aceitam a peça** e apagar as outras, como faz o app do Carcassonne.
  2. **Peças de saída para o rio**: o "fim de rio" (já existe no gerador, com 1 lado de água, onde o rio afina até o brejo) e a Lagoa, que fecha até 4 lados de água.
  3. **Deixar passar**: se nenhuma casa aceita a peça, aparece o botão "deixar a peça no rio", e ela vai embora sem custo. Nas simulações isso nunca foi preciso, mas a saída precisa existir.
- **O que muda junto**:
  - `legal()` no motor (uma linha) e o descarte;
  - o realce das casas válidas;
  - a lição 2, que hoje mostra o brejo como resultado de um encaixe errado.
- **Como testar**: teste A/B com pessoas (seção 7). Perguntar se alguma peça de rio pareceu "sem lugar".

### 4.2 Vale do dia com fim marcado (prioridade 1)

**Regra:** *o vale do dia acaba na última seca do ano 4. Peças que sobram na pilha valem 3 pontos cada.*

- São 48 jogadas, cerca de 6 a 7 minutos. Se a pilha acabar antes, a partida acaba antes, como hoje.
- **Por quê**:
  - na pesquisa, nenhum jogo diário de referência tem duração variável: Wordle, NYT Pips, Connections, Spelunky Daily, o Daily Climb do Slay the Spire, o desafio diário do Mini Metro;
  - o Dorfromantik tem o modo **Rápido**, com número fixo de peças;
  - a sessão mediana no celular é de cerca de 4,5 minutos (GameAnalytics, 2024).
- **O que se mantém**: ganhar peças continua valendo, porque a peça que sobra vira ponto e a partida pode acabar antes se a pilha zerar. O laço do Dorfromantik fica de pé, sem a cauda de 239 jogadas.
- **O fim vira um pico natural**: a última seca é a "última cheia" da v1.3, agora com um sentido de regra. "O vale atravessou quatro secas."
- **Treino e Zen** continuam sem fim, como hoje. É a separação do NYT Tiles (diário, mais um Zen infinito) e do Dorfromantik (Clássico, Rápido e Criativo).
- **Calibrar no simulador**: o número de anos (3 ou 4), o valor da peça que sobra (2 a 4) e as gotas dos bots com a regra nova. Com 48 jogadas fixas, a variação de pontos entre vales também deve cair, o que é bom para a comparação.

### 4.3 A rotação volta a ser do jogador (prioridade 1)

- **No vale do dia:**
  - a peça abre na mesma orientação em que estava;
  - os lados que combinariam aparecem em verde enquanto se gira, e a prévia `+N` acompanha;
  - nada escolhe pela pessoa.
- **Nas referências**: o app do Carcassonne mostra as casas válidas, mas não sugere a jogada. No Dorfromantik, destacar encaixes existe só como mod da comunidade, e o jogo não gira pela pessoa. A Celeste trata ajudas como opção de acessibilidade, que se escolhe e se recomenda não usar na primeira vez.
- **Ajuda opcional** "girar para o melhor encaixe": fica no menu, ligada nas lições e no treino. Se ligada no vale do dia, o resultado mostra "com ajuda".
- **Por quê**: nos bots, girar responde por metade dos pontos. Hoje essa metade é da interface, e não da pessoa. A teoria da autodeterminação, já citada no primeiro estudo, liga a vontade de voltar à sensação de competência e de autonomia.

### 4.4 Desfazer no vale do dia (prioridade 1)

- **Antes de colocar**, tudo continua reversível: tocar em outra casa ou girar.
- **Depois de colocar**, não há desfazer na primeira partida do dia. A prévia exata (`+N`, missões, seca) já protege do erro de toque.
- **Alternativa mais branda**, para o caso de o teste mostrar frustração: 1 desfazer por ano do vale, e o "depois" não muda depois de desfazer. É o modelo do Puzzmo (Really Bad Chess), em que se desfaz mas o contador não volta, e do Connections, que dá um orçamento de erros.
- No treino e nas repetições, o desfazer continua livre.

### 4.5 Fontes de peças: de 5 para 3

Hoje as peças vêm de cinco lugares: missões, perfeitas, seca, chuva e Lagoa. O teste da v0.7 já perguntava: "ela entende de onde vêm as peças da pilha?"

- **Chuva**: sai. A pilha inicial passa de 22 para 26. A chuva continua como evento visual e sonoro (o rio volta a correr, arco-íris).
- **Lagoa**: deixa de dar +1 peça e passa a valer só pontos.
- Ficam **missões, perfeitas e seca**. As três dependem de decisão, e cada uma cabe numa frase.
- Calibrar no simulador junto com o fim marcado (4.2).

### 4.6 Vereda: a peça especial que fica no lugar da Ponte

**Regra:** *a Vereda é uma nascente: o rio que sai dela é água viva, e ela não seca.*

- **Ecologia**: das ideias da pesquisa, é a mais bem fundamentada.
  - A Embrapa descreve as veredas como coletoras da água dos platôs e como responsáveis pela perenidade dos cursos d'água do Cerrado.
  - O papel da mata ciliar em manter a vazão na seca **não é consenso**. Um estudo em 324 bacias do arco Amazônia–Cerrado (GRL, 2018) achou que o desmatamento aumentou a vazão mínima; o IPAM, em bacias de Mato Grosso, achou o contrário. A mata ciliar continua defensável como proteção da margem e contra o assoreamento, e o texto do jogo pode falar em "a mata segura a margem".
- **Decisão**: a Vereda dá um segundo ponto de partida para a água. Ela cria uma escolha de rota ("ligo a Vereda ao rio principal ou abro uma rede nova?") e um abrigo para a seca.
- **O tema já está pronto**: buritis, garça e o modelo de buriti da v2.1.
- **Teste no simulador**: quanto ela muda o rio vivo e a seca. Cuidado para não deixar a seca fácil demais.

### 4.7 Bicho do dia (meta opcional)

- O vale do dia escolhe um bicho do caderno: "Hoje: Lobo-guará — um pasto com 8 peças encostado num bosque com 8".
- Cumprir dá um selo no resultado e no texto para compartilhar ("🐾 lobo-guará"). Não dá pontos nem mexe nas gotas.
- **Por quê**: a pesquisa traz três precedentes:
  - o **Daily Trek do Cascadia** troca o objetivo todo dia;
  - o **Isle of Skye** troca as regras de pontuação a cada partida;
  - o **Alto's Adventure** traz metas por nível.

  Todos dão variedade sem conteúdo novo. E no **Planet** e no **Cascadia** a fauna é o centro, enquanto aqui ela corre o risco de passar despercebida: o `FATOR_REPLAY_2.md` já listava "os bichos passam despercebidos" como risco.
- O bicho do dia é escolhido pelo validador entre os que o bot mestre alcança naquele vale, para nunca ser impossível.

### 4.8 O momento "afluente" (depois de 4.1)

Com o rio encaixando, os ramos secos ficam encaixáveis. Assim, ligar um ramo seco à rede viva passa a ser possível de planejar. Duas opções para testar, uma de cada vez:

- **Tabela crescente**, como no Harmonies: lá, um rio de 2, 3, 4, 5 e 6 peças vale 2, 5, 8, 11 e 15 pontos. No Afluente, seria cada peça que acorda na mesma jogada valer +1 a mais que a anterior.
- **Espetáculo, sem ponto extra**: a água desce peça por peça com o som subindo, como a queda em cadeia do Puzzle Bobble ou o quadrado do Two Dots.

**Atenção**: os bots atuais não preparam ramos. A variante de cascata não mudou nada nos números, porque o guloso só olha uma jogada. Para medir, é preciso um bot que olhe 2 jogadas à frente, ou então teste com pessoas.

---

## 5. O que a pesquisa nova acrescenta, jogo por jogo

| Jogo | Mecânica relevante | Recepção | Lição para o Afluente |
|---|---|---|---|
| **Dorfromantik** (videogame) | Rio e trilho precisam ligar. Missões nas peças. Perfeita dá +1 peça. Modos Clássico, Rápido (peças fixas), Difícil, Criativo e Mensal | "Muito positivas" no Steam. Críticas: repetição, trechos longos sem missões, peças inúteis | 4.1 e 4.2. Gerar a pilha com garantias (já se faz com uma missão a cada 4 peças) |
| **Dorfromantik: The Duel** | Os dois jogadores recebem as mesmas peças, em paisagens separadas | — | É o formato do vale do dia: mesma pilha e comparação justa. Reforça 4.4 |
| **Dorfromantik** (tabuleiro) | Missão de número exato. Bandeira só pontua com a região fechada. Rio mais longo pontua no fim. Campanha em caixas | Spiel des Jahres 2023 | "Fechar a região" é um bom tipo de missão para uma página futura do caderno |
| **Harmonies** | O rio pontua por uma tabela crescente. Cartas de animal pedem padrões de hábitat | "Sólido, sem destaque". Animais fáceis valem pouco | 4.8. Bichos difíceis devem ser mais raros e mais celebrados (já é assim) |
| **Cascadia** | Corredores de hábitat e cartas de fauna que variam por partida. App com **Daily Trek** | Bem recebido, com uma carta desequilibrada | 4.7 |
| **Kingdomino** | Região = tamanho × coroas; região sem coroa vale 0 | Críticas à sorte | Multiplicador em peça rara (por exemplo, a Vereda multiplicando a rede dela). Só depois do 4.1 |
| **Carcassonne: O Rio** | O rio abre o jogo: nascente, depois o rio, depois o lago | — | O rio como espinha do vale. O app mostra as casas válidas sem sugerir a jogada (4.3) |
| **Isle of Skye** | 4 regras de pontuação sorteadas entre 16 | — | Variedade diária por regra, como o bicho do dia (4.7) |
| **Planet**, **Earth** | Animais por condição de hábitat | Planet: "raso" | A fauna como coleção pura funciona se for vista e lembrada (4.7) |
| **Timberborn** | Seca anunciada com contagem, que cresce a cada ciclo. A irrigação some de longe para perto | A espera entre aviso e efeito é elogiada. As "badtides" sem defesa afastam iniciantes e viraram opcionais | A seca do Afluente já acerta no aviso. Não endurecer além do ano 4. A irrigação é tentadora, mas o teste aqui não fechou |
| **Against the Storm** | A estação ruim também tem um lado bom | — | A seca já paga peças pelo rio protegido. Mantido |
| **Terra Nil** | Restaurar e ver os bichos voltarem | Curto, pouco replay | O caderno com pistas já responde a isso |
| **NYT Pips** (2025) | 3 puzzles por dia (fácil, médio, difícil), rotação manual da peça | Sucesso | Dificuldade em níveis paralelos, e não em duração |
| **Puzzmo** | Desfaz, mas o contador não volta. Placar no plano pago | Reclamações de trapaça nos placares | 4.4 |
| **Spelunky Daily**, **Slay the Spire** | Mesma semente para todos e uma tentativa (Spelunky) | Muito citados como modelo | "A primeira partida vale", que o Afluente já faz |
| **Isle of Arrows** | Peças ao acaso e desafio diário com placar | "Tedioso e dependente de sorte" depois de horas | O diário precisa de régua justa. As gotas por bots já resolvem isso melhor |
| **Station to Station**, **Islanders: New Shores** | Metas de estrelas e patamares de pontos | Bem recebidos | Já estão nas gotas |
| **Tiny Glade**, **Summerhouse** | Sem metas | "Nada em jogo", "sem progressão" | O Afluente não deve virar brinquedo. A beleza não substitui a regra |

**Mercado**:

- O Dorfromantik anunciou em 2025 uma versão para celular "reimaginada para toque", e o Islanders já tem versão para celular. O gênero está chegando ao celular, e o diferencial do Afluente precisa ser a **água** e o **diário**, não a peça hexagonal.
- Jogos pagos são uma fatia pequena da receita no iOS. As vitrines que combinam com o tom do jogo são assinaturas sem anúncio: Apple Arcade, que pôs puzzles "cozy" em 2026, Netflix Puzzled e o modelo do NYT e do Puzzmo. Isso reforça o que o GDD já dizia: o arquivo de vales é o caminho de monetização, nunca a energia.

---

## 6. O que não fazer

- **Fauna que dá pontos.** Um dos estudos sugere isso, citando Cascadia e Planet. Mantenho o "não" do `FATOR_REPLAY_2.md`: os bichos sairiam da régua dos bots e virariam mais uma conta. O bicho do dia (4.7) dá a visibilidade sem esse custo.
- **Clima que dá ou tira pontos.** Já foi decidido em `CLIMA.md`, e a pesquisa sobre Timberborn não muda isso.
- **Número exato nas missões**, que é a regra do Dorfromantik de tabuleiro. O teste da v0.9 mostrou que aqui isso pune.
- **Lista das peças que faltam** (o app do Carcassonne tem). Com a pilha sorteada e crescendo, ela não ajuda, e é uma tela a mais.
- **Mais um sistema antes do teste com pessoas.** Inclusive a irrigação: a variante simples não levou mais água ao vale.

---

## 7. Teste com pessoas: o próximo passo

O gate 1 do GDD, agora como teste A/B:

- **Versão A**: a v2.2 como está.
- **Versão B**: rio que encaixa (4.1), fim no ano 4 (4.2), rotação manual (4.3) e vale do dia sem desfazer (4.4).
- **Quem**: de 6 a 10 pessoas, cada uma jogando 2 vales em cada versão, em ordem alternada, no próprio celular.

| Pergunta | Como medir |
|---|---|
| O rio virou decisão? | A pessoa hesita antes de pôr uma peça de rio? Fala do rio sem ser perguntada? |
| Alguma peça de rio "não tinha lugar"? | Contar os "deixar passar" e perguntar |
| A partida termina na hora certa? | Tempo de partida; "achou curta, certa ou longa?" |
| Girar é gostoso ou chato? | Quantas rotações por jogada; "sentiu que a jogada era sua?" |
| Sem desfazer, frustra? | Contar os erros de toque relatados |
| Quer de novo agora? | A medida principal dos estudos anteriores: % de partidas seguidas de outra em até 1 minuto |

Depois do teste, nesta ordem: Vereda (4.6), bicho do dia (4.7), fontes de peças (4.5), momento afluente (4.8). Cada um só entra se o teste anterior pedir.

---

## 8. Método e limites

- **Simulações**: motor extraído de `prototipo/afluente.html` (v2.2), sem nenhuma mudança na versão "como está". As variantes trocam uma linha cada (ver seção 9). São 100 vales por linha, menos na contagem de cascata e de casas válidas, que usou 40.
- **Bots não são pessoas.** Os bots medem se uma regra quebra, a diferença entre estilos de jogo e a duração. Não medem diversão nem frustração.
- **Pesquisa**: a busca na web funcionou, mas a leitura das páginas foi bloqueada no ambiente. As afirmações vêm dos trechos devolvidos pela busca. O que não pôde ser confirmado ficou fora deste texto, ou aparece com ressalva (por exemplo, o efeito da mata ciliar na vazão).

## 9. Arquivos

- `sim/revisao/motor.js`: o motor da v2.2, extraído do protótipo.
- `sim/revisao/m_encaixe_rio.js`, `m_cascata.js` e `m_irriga.js`: as variantes. A variante sem chuva usa `AFLUENTE_CFG={"rain":0}`.
- `sim/revisao/medir.js`: pontos, duração, fontes de pontos e de peças, rio vivo e descartes. Uso: `node medir.js 100 rand,slotbest_rotrand,guloso,cuidadoso,mestre`; para uma variante, `MOTOR=m_encaixe_rio.js node medir.js 100 guloso`.
- `sim/revisao/casc.js`: cascatas por jogada e casas válidas para peças de rio.
- `sim/revisao/resultados/`: as saídas usadas neste documento.

---

## Fontes

**Dorfromantik**
- Restrição de rio e trilho: [Wikipedia](https://en.wikipedia.org/wiki/Dorfromantik)
- Explicação do desenvolvedor no fórum do Steam: [discussão 1](https://steamcommunity.com/app/1455840/discussions/0/4615641483009433506), [discussão 2](https://steamcommunity.com/app/1455840/discussions/0/3069740688726840807)
- Modos de jogo: [TheXboxHub](https://www.thexboxhub.com/dorfromantik-review/), [Film Stories](https://filmstories.co.uk/reviews/dorfromantik-review-tile-based-relaxation-game-really-pops/)
- Crítica sobre trechos sem missões e peças inúteis: [TurnBasedLovers](https://turnbasedlovers.com/review/dorfromantik-early-review-now-relax/)
- Versão para celular: [Gematsu](https://www.gematsu.com/2025/05/dorfromantik-coming-to-ps5-xbox-series-ps4-xbox-one-and-mobile)
- Jogo de tabuleiro: [Board Game Cafe](https://boardgamecafe.net/2023/10/02/dorfromantik/), [Wikipedia](https://en.wikipedia.org/wiki/Dorfromantik:_The_Board_Game), [The Duel](https://www.boardseyeview.net/post/dorfromantik-the-duel)
- Mod "Show Perfects": [itch.io](https://game-theory-studio.itch.io/dorfromantik-mods/devlog/715324/show-perfects-100)

**Jogos de tabuleiro**
- Harmonies: [BGA](https://en.doc.boardgamearena.com/Bugsclarification_harmonies), [Zatu](https://zatu.com/products/harmonies), [Meeple Mountain](https://www.meeplemountain.com/reviews/harmonies/)
- Cascadia: [Meeple Mountain](https://www.meeplemountain.com/reviews/cascadia-review-building-a-cardboard-countryside/), [Cascadia Digital na App Store](https://apps.apple.com/app/id6449233571)
- Kingdomino: [regras](https://blueorangegames.eu/wp-content/uploads/2020/04/Kingdomino-Free-Sample-EN.pdf)
- Carcassonne: O Rio: [Modern Jive](https://modernjive.com/carcassonne/carcassonnetheriver.htm); app (análise de 2010): [Meadow Party](https://meadowparty.com/blog/2010/12/22/carcassonne-app/)
- Isle of Skye: [Miniature Market](https://www.miniaturemarket.com/reviewcorner/isle-of-skye-from-chieftain-to-king-review)
- Planet: [Tabletop Gaming](https://www.tabletopgaming.co.uk/reviews/planet-review)

**Água e seca**
- Timberborn: [wiki da seca](https://timberborn.wiki.gg/wiki/Drought), [Boiling Steam](https://boilingsteam.com/timberborn-review/), [pedido sobre as badtides](https://timberborn.featureupvote.com/suggestions/500197/comment/573518)
- Against the Storm: [wiki da estação de tempestade](https://wiki.hoodedhorse.com/Against_the_Storm/Storm_Season)
- Terra Nil: [Shacknews](https://shacknews.com/article/134777/terra-nil-review-nature-appreciation)
- Puzzle Bobble: [Wikipedia](https://en.wikipedia.org/wiki/Puzzle_Bobble)
- Two Dots: [Macworld](https://www.macworld.com/article/224594/you-should-play-twodots-brings-a-much-needed-twist-to-the-match-three-genre.html)

**Puzzle diário e retenção**
- Wordle: [Wikipedia](https://en.wikipedia.org/wiki/Wordle)
- NYT Pips: [Tom's Guide](https://www.tomsguide.com/gaming/nyts-new-game-pips-is-already-addictive-heres-how-to-play)
- NYT Tiles: [central de ajuda](https://thenewyorktimeshelpcenter.helpjuice.com/360029050872-Tiles)
- Puzzmo: [Adrian Hon](https://adrianhon.substack.com/p/puzzmo)
- Spelunky Daily: [wiki](https://spelunky.fandom.com/wiki/Daily_Challenge_Mode_(HD))
- Isle of Arrows: [Steam](https://store.steampowered.com/app/1946970/Isle_of_Arrows/)
- Benchmarks de celular (GameAnalytics): [Q1 2024](https://gamedevreports.substack.com/p/gameanalytics-benchmarks-in-mobile), [relatório 2025](https://investgame.net/wp-content/uploads/2025/02/2025-GameAnalytics-Mobile-Gaming-Benchmarks.pdf)
- Celeste, modo de assistência: [Tampere PlayLab](https://blogs.tuni.fi/playlab/features/too-steep-a-hill-to-die-on-celeste-assist-mode-and-accessibility/)

**Mercado**
- Receita de jogos pagos no iOS: [Sensor Tower](https://sensortower.com/blog/premium-game-revenue-2019)
- Apple Arcade: [Apple Newsroom](https://apple.com/newsroom/2026/08/apple-arcade-levels-up-with-block-blast-plus-and-art-of-fauna-cozy-puzzles-plus/)
- Netflix Puzzled: [App Store](https://apps.apple.com/app/id6742752351)

**Ecologia do Cerrado**
- Veredas: [Embrapa](https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1176629/1/VI.3-Veredas.pdf)
- Matas de galeria: [Embrapa](https://www.alice.cnptia.embrapa.br/alice/bitstream/doc/183601/1/CERRADO-Caract-recup-matas-galeria-142-192.pdf)
- Desmatamento e vazão: [GRL 2018](https://doaj.org/article/3eb93cb69e88468093af60356596698d), [IPAM](https://ipam.org.br/deforestation-alters-the-flow-of-streams-in-the-transition-between-the-amazon-and-the-cerrado/)
