# Afluente — Fator replay 2: o fim da partida (pipeline crítico, v1.3)

**Pergunta:** no instante em que a pilha acaba, o que faz a pessoa tocar em "de novo" em vez de fechar o app? E vale mudar alguma mecânica para isso?

O primeiro estudo (`FATOR_REPLAY.md`) listou os motores de replay e implementou a fase 1: estações por pontos, relatório e recorde. Desde então as estações por pontos viraram o ano no vale (v0.6/v0.7), e o fim da partida voltou a ser só um número. Este estudo olha **só para o fim** e passa cada ideia por um funil com filtros e simulação antes de entrar no jogo.

---

## 0. Resumo

| Decisão | O quê | Por quê, em uma linha |
|---|---|---|
| **Feito** | **Marcos do vale**: três gotas por vale (Riacho, Ribeirão, Rio cheio), medidas por bots que jogam a mesma pilha | O número sozinho media a sorte do vale; a gota mede você naquele vale |
| **Feito** | **Onde o bot foi melhor** + **ver o vale do bot** | Mostra o erro na hora, de forma concreta, e o modelo a imitar |
| **Feito** | **Botão principal = tentar o próximo marco neste vale** | A pilha é a mesma: dá para aplicar a lição na hora |
| **Feito** | **A última cheia**: a câmera mostra o vale, a água percorre o rio, os pontos sobem e as gotas acendem | O fim passa a ser um pico, e não um corte |
| **Feito** | **Fauna do Cerrado** (11 bichos) e **Caderno do Cerrado** | Algo que só aparece se você voltar, ligado ao tema e sem dar poder |
| **Feito** | **Quase**: o bicho mais perto ("Tucano: 5 de 6") | Um alvo pequeno e concreto para a próxima partida |
| Mudado | Par e recorde de pontos foram rebaixados para "detalhes" | Simulação: o mesmo bot faz de 46 a 512 pontos, dependendo do vale |
| Depois | Peças novas no caderno, escada de dificuldade (Estiagem), desafio com amigo pelo mesmo vale, filme do vale | Bons, mas dependem de testar o que entrou agora |
| **Não** | Continuar com peças extras, baú no fim, bichos que dão pontos, pontos de fim de jogo, série punitiva | Ferem o tom, a legibilidade ou a justiça do placar |

---

## 1. O pipeline

1. **Diagnóstico**: jogar até o fim e anotar o que se sente, segundo a segundo, na tela de resultado.
2. **Modelo**: o que precisa ser verdade para alguém querer de novo *agora*. Saíram cinco condições (seção 3), cada uma com apoio em pesquisa.
3. **Lista longa**: 22 ideias tiradas de 25 jogos de gêneros diferentes (seção 4).
4. **Filtros**: cada ideia passa por cinco perguntas. Basta um "não" forte para cortar.
5. **Simulação**: o que mexe em números foi medido com bots em 40 vales (seção 5).
6. **Construção e teste**: o que sobrou entrou no protótipo e foi jogado de ponta a ponta num navegador (seção 6).

Os cinco filtros:

- **F1 Tom**: cabe num jogo calmo, contemplativo, de sessões curtas?
- **F2 Legível**: cabe numa frase e se vê no vale?
- **F3 Justo**: a habilidade continua decidindo? (Nada de "comece mais forte".)
- **F4 Fim**: gera vontade de jogar de novo *agora*, e não só amanhã?
- **F5 Custo**: o custo de construir e de explicar cabe no ganho?

---

## 2. Diagnóstico: o fim da v1.1

Jogando até o fim, o que acontecia:

1. A última peça cai e, 1,5 s depois, sobe a folha "A pilha acabou". **Não há clímax**: a partida termina em diminuendo.
2. O maior elemento da folha é o número. **O número não diz nada sozinho**: 140 é bom? Depende do vale.
3. O par vem de um bot guloso, que nem sempre é um bom jogador. Bater o par é comum, então diz pouco.
4. O recorde pessoal compara vales diferentes. A simulação mostra por que isso não funciona:

   | Bot (40 vales) | Pontos: média | mínimo | máximo |
   |---|---:|---:|---:|
   | Guloso | 156 | 46 | 512 |
   | Cuidadoso | 165 | 46 | 511 |
   | Mestre | 240 | 51 | 934 |

   O mesmo bot, jogando sempre igual, varia mais de 10 vezes entre vales. O recorde mede principalmente **a sorte da pilha**. Quem joga melhor amanhã num vale pior "piora".
5. O relatório é honesto, mas é uma lista de contas. A dica é genérica e vem de regras fixas.
6. O botão principal era **"Copiar resultado"**. "Jogar de novo" ficava embaixo, sem dizer **para quê**.
7. Nada se acumula entre partidas: o Caderno do Cerrado do primeiro estudo não foi feito.

**Conclusão**: o fim não tinha pico, não tinha um alvo seguinte e não deixava nada para trás. Faltavam justamente as três coisas que fazem alguém tocar em "de novo".

---

## 3. O modelo: cinco condições para querer de novo

### C1. O fim precisa ser um pico
- **Regra do pico e do fim** (Kahneman): a lembrança de uma experiência pesa mais o momento mais forte e o final.
- **Em jogos casuais**, Gutwin e colegas (CHI 2016) mantiveram os mesmos eventos e só mudaram a ordem num jogo de combinar peças e num jogo de reação. A ordem mudou como as pessoas avaliavam a partida depois.
- **Em Hearthstone**, os valores de pico e fim relatados pelos próprios jogadores tiveram forte correlação com a lembrança 24 horas depois.
- **Ao sair do jogo**: num estudo com entrevistas (16 pessoas) e questionário (111), saídas boas vieram com sensação de fechamento e de objetivo cumprido. Saídas ruins vieram de mau desempenho ou de cortes abruptos (Alexandrovsky e colegas, CHI PLAY 2024).
- **Em outros jogos**: Threes soma as peças uma a uma no fim. Balatro conta os pontos em sequência, e a contagem ensina o sistema.

### C2. A derrota precisa ser legível e "minha"
- Juul (*The Art of Failure*): a falha num jogo mostra uma falta na habilidade ou no jeito de jogar. A pessoa tenta outros jeitos até achar a solução. Esse ciclo de falhar e melhorar é um dos prazeres centrais do jogo.
- Into the Breach: os autores dizem que a prioridade foi o jogo **parecer justo**. Com informação completa, o erro é do jogador, e o jogador sabe qual foi.
- **No Afluente**: tudo é determinístico e visível. Faltava *mostrar* o erro com um termo de comparação.

### C3. Um alvo perto e concreto
- **Gradiente de meta** (Kivetz, Urminsky e Zheng, 2006): no cartão "compre 10 cafés e ganhe 1", as pessoas compram mais rápido à medida que se aproximam do prêmio. Até a *ilusão* de progresso acelera.
- **Progresso dado** (Nunes e Drèze, 2006): cartões que já vêm com dois selos são completados mais.
- **Tarefas interrompidas**: uma meta-análise de 2025 não achou a vantagem de memória do efeito Zeigarnik ("lembramos mais do inacabado"). Achou, porém, a **tendência de voltar** a tarefas interrompidas (efeito Ovsiankina). Então não basta deixar algo "pendurado": é preciso que o próximo passo seja claro e possível.
- **Em outros jogos**: Jetpack Joyride sempre mostra três missões, com metas curtas, médias e longas. Alto's Adventure traz três metas por nível, e o progresso parcial conta.

### C4. Algo que só aparece se eu voltar, sem virar poder
- **Coleção por condições**:
  - em Neko Atsume, gatos raros só vêm com certos objetos;
  - em Terra Nil, os animais voltam quando o bioma está restaurado, e cada um tem suas condições;
  - em Alba, a pessoa fotografa 62 espécies.
- **Dorfromantik** destrava peças e biomas por conquistas.
- **Crítica que já estava no primeiro estudo**: progressão por força ("comece mais forte") tira o sentido da habilidade. O que se acumula deve ser **variedade e história**, nunca vantagem.

### C5. Atrito zero, e o mesmo desafio de novo
- **Estrelas por fase** (Angry Birds, Cut the Rope): o que faz a pessoa repetir a *mesma* fase é a estrela que faltou. A crítica comum é a sorte da física, mas no Afluente a pilha é fixa e não há sorte depois da escolha.
- **Tetris, Super Meat Boy**: recomeçar é imediato.
- **No Afluente**: o vale é determinístico. Repetir o mesmo vale **sabendo o que vem** é aprender, não trapacear.

**Limites éticos (vêm do tom do jogo)**: sem energia, sem baú aleatório, sem série que castiga, sem "continuar" pago com espera. O objetivo é que a pessoa queira voltar, não que se sinta presa.

---

## 4. Lista longa e filtros

✔ passa · ✘ falha · ~ depende

| # | Ideia | De onde | F1 | F2 | F3 | F4 | F5 | Veredito |
|---|---|---|---|---|---|---|---|---|
| 1 | Três marcos por vale | Angry Birds, Cut the Rope, golfe (par), metas do Islanders | ✔ | ✔ | ✔ | ✔ | ✔ | **Feito** |
| 2 | Bots como régua; "onde o bot foi melhor" | análise de partida no xadrez, fantasmas de corrida (Trackmania) | ✔ | ✔ | ✔ | ✔ | ✔ | **Feito** |
| 3 | Ver o vale do bot | replays de xadrez, Mini Metro (foto do mapa) | ✔ | ✔ | ✔ | ✔ | ✔ | **Feito** |
| 4 | O fim como pico (cheia, contagem, gotas) | Threes, Balatro, Peggle | ✔ | ✔ | ✔ | ✔ | ✔ | **Feito** |
| 5 | Botão principal = o próximo marco neste vale | Tetris, Super Meat Boy | ✔ | ✔ | ✔ | ✔ | ✔ | **Feito** |
| 6 | Bichos que voltam por condições do vale | Terra Nil, Neko Atsume, Alba, Pokémon Snap | ✔ | ✔ | ✔ | ✔ | ~ | **Feito** (sem pontos) |
| 7 | "Quase": o bicho mais perto | gradiente de meta, pistas de desbloqueio do Balatro | ✔ | ✔ | ✔ | ✔ | ✔ | **Feito** |
| 8 | Caderno (álbum com pistas) | Alba, museu do Animal Crossing | ✔ | ✔ | ✔ | ~ | ✔ | **Feito** |
| 9 | Três missões fixas entre partidas | Jetpack Joyride, Alto | ✔ | ✔ | ✔ | ✔ | ~ | **Fundido**: as pistas do caderno já são essas metas; dois sistemas seriam demais |
| 10 | Peças novas destravadas | Dorfromantik | ✔ | ✔ | ✔ | ~ | ✘ | **Depois**: muda o vale do dia e exige balanceamento |
| 11 | Escada de dificuldade (Estiagem 1–6) | Ascensão (Slay the Spire), Stakes (Balatro) | ✔ | ✔ | ✔ | ~ | ~ | **Depois**: o Rio cheio já é um teto alto (o bot mestre só alcança em 15 de 40 vales) |
| 12 | Pontos de fim de jogo (rio mais longo) | Dorfromantik de tabuleiro, Cascadia | ✔ | ✘ | ✔ | ~ | ✔ | **Não**: repete a água viva e põe uma conta escondida no fim |
| 13 | Continuar com peças extras | jogos mobile com anúncio | ✘ | ✔ | ✘ | ✔ | ✔ | **Não**: esvazia o placar e o tom |
| 14 | Baú ou recompensa sorteada no fim | caixas de recompensa | ✘ | ✘ | ~ | ✔ | ✔ | **Não** |
| 15 | Série que castiga, energia | jogos de retenção | ✘ | ✔ | ✔ | ✘ | ✔ | **Não** (série gentil fica para depois) |
| 16 | Bichos que dão pontos ou peças | — | ✔ | ✔ | ✘ | ✔ | ✔ | **Não**: viram mais uma otimização, saem da régua dos bots e tiram o "por gosto" da escolha |
| 17 | Percentil global | Mini Metro, Mini Motorways | ✔ | ✔ | ✔ | ✔ | ✘ | **Depois** (precisa de servidor); os bots fazem esse papel localmente |
| 18 | Desafiar alguém com o mesmo vale | Wordle, desafio diário do Spelunky | ✔ | ✔ | ✔ | ~ | ~ | **Depois**: link com a semente |
| 19 | Filme do vale sendo construído | álbuns e retrospectivas | ✔ | ✔ | ✔ | ~ | ~ | **Depois**: bonito, mas não cria alvo |
| 20 | Escolher a variante antes de jogar | personagens do Slay the Spire, baralhos do Balatro | ✔ | ✔ | ✔ | ~ | ~ | **Depois**, como páginas do caderno |
| 21 | Recorde de pontos como meta principal | arcade | ✔ | ✔ | ✘ | ~ | ✔ | **Rebaixado** para "detalhes", por causa do dado da seção 2 |
| 22 | Dica gerada por regras fixas | — | ✔ | ~ | ✔ | ~ | ✔ | **Trocada** pela comparação com o bot |

---

## 5. Simulações

Simulador: `sim/replay_teste.js`, com o motor extraído do protótipo por `sim/extrair_motor.js`. São 40 vales (`dia-t0` … `dia-t39`) e cinco jogadores:

- **aleatório**;
- **casual**: um guloso que erra, escolhendo ao acaso entre as três melhores jogadas;
- **guloso**: só o ganho imediato, com cada peça ganha valendo 4 pontos;
- **cuidadoso**: o guloso que também protege o rio para a seca;
- **mestre**: o cuidadoso que também persegue as missões.

### 5.1 Que régua usar para os marcos

Com uma régua ingênua (marco 1 = guloso, 2 = cuidadoso, 3 = mestre), surgiram dois problemas:

- o mestre **perde do guloso em 10 de 40 vales**, porque a pilha de cada vale é uma bola de neve;
- quase todo jogador casual ficaria **sem nenhuma gota** (31 de 40).

Por isso a régua escolhida é:

- **Riacho**: 70% dos pontos do guloso.
- **Ribeirão**: os pontos do guloso (o antigo par).
- **Rio cheio**: o melhor entre cuidadoso e mestre, e pelo menos 30% acima do guloso.

Na média, o Rio cheio fica em **1,85×** os pontos do guloso.

| Jogador | 0 gotas | 1 | 2 | 3 |
|---|---:|---:|---:|---:|
| Aleatório | 40 | 0 | 0 | 0 |
| Casual | 19 | 12 | 5 | 4 |
| Guloso | 0 | 0 | 40 | 0 |
| Cuidadoso | 3 | 9 | 25 | 3 |
| Mestre | 0 | 10 | 15 | 15 |

Leitura:

- Quem joga com atenção chega ao Riacho logo.
- O Ribeirão é a régua do "jogou direito".
- O Rio cheio pede jogar melhor que um bot que só olha uma jogada à frente: proteger o rio, perseguir missões e planejar buracos. Mesmo o mestre só o alcança em 15 de 40 vales, então há espaço para uma pessoa crescer.

**Custo**: o bot mestre leva de 0,4 s a 10 s por vale (o pior caso é um vale de 138 peças), num Web Worker. O par (guloso) sai primeiro, e as gotas aparecem quando os três terminam.

### 5.2 Fauna: calibrar a raridade

Porcentagem dos 40 vales em que o bicho apareceu (casual / guloso / mestre), já com os limites escolhidos:

| Bicho | Condição | Raridade | casual | guloso | mestre |
|---|---|---|---:|---:|---:|
| Seriema | pasto com 6 peças | comum | 75 | 98 | 95 |
| Tucano | bosque com 6 | comum | 78 | 88 | 92 |
| João-de-barro | vila com 4 | comum | 60 | 72 | 72 |
| Garça | 2 brejos com água viva | comum | 52 | 65 | 65 |
| Capivara | 6 peças com água viva ao mesmo tempo | incomum | 30 | 45 | 48 |
| Ema | campo com 8 | incomum | 28 | 38 | 42 |
| Martim-pescador | cachoeira com água viva | incomum | 30 | 40 | 42 |
| Anta | bosque com 6 e rio vivo passando por dentro | incomum | 35 | 35 | 48 |
| Lobo-guará | pasto com 8 encostado em bosque com 8 | raro | 18 | 32 | 35 |
| Tamanduá-bandeira | pasto com 12 | raro | 18 | 25 | 50 |
| Onça-pintada | na seca, 10 trechos de rio correndo | lendário | 2 | 8 | 22 |

Decisões que vieram dos números:

- **A primeira partida já traz 3 ou 4 bichos.** Isso é o progresso dado: o caderno nunca começa vazio.
- **Capivara** com 10 peças de água viva aparecia em só 30% das partidas, raro demais para um bicho "da água". O limite caiu para 6.
  - O dado diz outra coisa importante: **rio vivo longo é raro**. A maioria dos rios fica solta. A capivara vira um incentivo suave para ligar rios.
- **Lobo-guará** com 6+6 era comum demais (65%). Subiu para 8+8.
- **A onça mede intenção**: aparece em 2% das partidas do casual, mas em 22% das do mestre. É o bicho de quem cuida do rio na seca, que é a mensagem de sustentabilidade do jogo, agora como recompensa e não como punição.
- **A garça transforma um "erro" em hábitat.** O brejo (rio que bate em terra) era só a falha visual do rio. Agora ele tem uma função.

---

## 6. O que entrou no protótipo (v1.3)

### 6.1 Durante a partida
- **Gotas no placar**: abaixo dos pontos aparecem as três gotas e o número do próximo marco ("💧◯◯ 140"). Ao passar de um marco, uma faixa avisa ("Ribeirão! Próximo marco: Rio cheio (214)") com um som de gotas subindo.
  - É a estrutura de metas do Islanders de volta, sem regra nova.
- **Bichos no vale**: quando a condição se cumpre, o bicho aparece numa peça do seu hábitat, com uma faixa ("Novo no caderno: Seriema!") e dois pios.
  - Os bichos ficam no vale, aparecem no retrato do fim e no modo Contemplar.
  - Não dão pontos.
  - Garça, capivara e lobo-guará usam os modelos do Blender da v1.2. Os mesmos bichos de enfeite (garça no brejo, capivara na beira d'água, lobo-guará no cerrado) só aparecem depois que o bicho voltou ao vale. Assim o enfeite vira consequência do hábitat, e não sorteio.

### 6.2 O fim (cerca de 3 segundos, sem pressa)
1. A última peça cai.
2. A câmera enquadra o vale inteiro.
3. **A última cheia**: um brilho percorre o rio vivo da nascente para baixo, com anéis na água e o som do riacho. Os bichos dão um pulinho.
4. A folha sobe com o **retrato do vale** (com os bichos). Os **pontos contam até o total** e **as gotas acendem uma a uma**, cada uma com uma nota de marimba mais alta.
5. **O título** é o marco alcançado: *Fio d'água*, *Riacho!*, *Ribeirão!* ou *Rio cheio!*.

Com "Menos movimento" ligado, a câmera e a cheia não se movem.

### 6.3 A folha do fim, na ordem de importância
1. Marco, pontos e as três gotas com os números de cada uma.
2. **Quase**:
   - "Faltaram 12 pontos para o Ribeirão.";
   - "Seu melhor neste vale: …" quando o vale é repetido.
3. **Onde o bot do próximo marco foi melhor**:
   - uma tabela curta (peças colocadas, encaixes, missões, rio na seca, água viva, peças perfeitas);
   - uma frase sobre a maior diferença;
   - o botão **"Ver o vale do bot"**, que troca o retrato pelo vale que o bot montou com a mesma pilha.
4. **Botão principal: "Tentar o Ribeirão neste vale"**. Com as três gotas, o principal passa a ser "Jogar outro vale".
5. **Voltaram ao seu vale**: os cartões dos bichos (com "novo!") e o **Quase** do caderno ("Tucano: um bosque com 6 peças. Neste vale você chegou a 5 de 6."), além do link para o caderno.
6. **Detalhes da partida** (fechado): o ano alcançado, o recorde de pontos (com a ressalva de que cada vale tem uma sorte), o relatório antigo e os números.
7. Compartilhar: o texto ganhou as gotas e os bichos ("Afluente #1 — 346 pts 💧💧💧 · Rio cheio … 🐾 5 bichos no vale").

### 6.4 Entre partidas
- **Caderno do Cerrado** (na tela inicial, no menu e no fim):
  - barra de progresso;
  - **três pistas**: os próximos bichos, com a condição e o seu melhor ("Seu melhor: 6 de 8");
  - a grade dos 11 bichos. Os que faltam aparecem como silhueta, com uma frase do hábitat e a raridade.
- **Estatísticas**: rios cheios, bichos e as gotas de cada vale do dia na semana.
- **Tela inicial**: o vale do dia mostra o marco alcançado ("Jogado: 346 pontos · Rio cheio").

### 6.5 Regras de justiça
- O vale do dia continua contando só a primeira partida, para o compartilhamento ser comparável.
- Repetir o vale serve para buscar o próximo marco, e o "seu melhor neste vale" é guardado à parte.
- Os bots não veem o futuro: jogam a pilha uma peça por vez, como a pessoa (com a mesma "peça da vez").

---

## 7. Mudanças de mecânica: o que mudou e o que não mudou

| Mecânica | Antes | Agora | Por quê |
|---|---|---|---|
| Medida de uma partida | Pontos, par (bot guloso), recorde | **Marcos do vale** (3 gotas). Pontos continuam como meio | Seção 2: os pontos variam 10× entre vales |
| "Jogar de novo" | Recomeça, sem dizer para quê | **"Tentar o (próximo marco) neste vale"** | C5: o mesmo desafio, com um alvo |
| Fauna | Pássaros e araras decorativos | **Bichos com condições de hábitat**, sem pontos | C4: novidade que não vira poder; reforça o tema |
| Brejo | Só visual | Hábitat da garça | Dá uma razão para um "erro" |
| Rio vivo longo | +2 por peça | Igual, mais capivara e anta como incentivo suave | O dado mostrou rio vivo curto na maioria das partidas |

Não mudou, de propósito:

- encaixe, água viva, missões com prazo, seca e mata ciliar, peça perfeita e pilha;
- **as regras de pontuação continuam as mesmas**, então os bots, as lições e os números dos estudos anteriores seguem válidos.

**Mudanças que este estudo recomenda testar a seguir**, cada uma só se o teste com pessoas pedir:

1. **Páginas do caderno abrem variantes de vale de treino** ("Vereda", "Estiagem"). Seria a escada de dificuldade (ideia 11), escolhida antes de jogar (ideia 20).
2. **Desafio com a mesma semente**: um link "jogue o meu vale", com as gotas do outro jogador.
3. **Série gentil**: uma "chuva" cobre um dia perdido por semana (já proposta no primeiro estudo).

---

## 8. Riscos e o que medir no teste com pessoas

| Risco | Sinal | Medida |
|---|---|---|
| As gotas viram a única coisa que importa e o jogo perde a calma | A pessoa repete o mesmo vale muitas vezes, frustrada | Repetições seguidas do mesmo vale; perguntar "como se sentiu ao repetir?" |
| A comparação com o bot humilha em vez de ensinar | Comentários como "o bot é injusto" | A pessoa consegue dizer, em uma frase, o que faria diferente? |
| Os bichos passam despercebidos | Ninguém fala deles | Abriu o caderno? Mencionou um bicho sem ser perguntado? |
| O Rio cheio fica longe demais | Ninguém nunca chega lá | % de vales com 3 gotas depois de 10 partidas |
| A cerimônia cansa na 20ª partida | A pessoa toca para pular | Se for o caso, deixar tocar para pular a contagem (já some com "Menos movimento") |

**A medida principal (a mesma do primeiro estudo)**: % de partidas seguidas de outra em até 1 minuto. Comparar a v1.2 com a v1.3.

---

## 9. Arquivos

- `prototipo/afluente.html` e `prototipo/index.html` (gerado por `sim/gerar_index.sh`).
- Motor:
  - `Engine.botPlay` e `Engine.botValue`: os bots dos marcos;
  - `Engine.FAUNA`, `habitat`, `faunaProgress`, `faunaStep`: a fauna, que entra também no `replay`.
- `sim/replay_teste.js`: marcos e fauna (uso: `node replay_teste.js 20 guloso,cuidadoso,mestre,casual 0`).
- `sim/extrair_motor.js`: copia o motor do protótipo para `sim/ano_no_vale_motor.js`.

---

## Fontes

- Kahneman e a regra do pico e do fim, em jogos casuais: Gutwin, Rooke, Cockburn, Mandryk e Lafreniere (2016), *Peak-End Effects on Player Experience in Casual Games*, CHI — [resumo](https://scispace.com/papers/peak-end-effects-on-player-experience-in-casual-games-1y0gj53bkd), [ACM](https://dx.doi.org/10.1145/2858036.2858419)
- Pico e fim em Hearthstone — [Tilburg University](https://research.tilburguniversity.edu/en/publications/exploring-peak-end-effects-in-player-affect-through-hearthstone/); em jogos narrativos — [ACM](https://dl.acm.org/doi/abs/10.1145/3582437.3587195)
- Saída de sessões de jogo: Alexandrovsky e colegas (2024), *Disengagement From Games*, CHI PLAY — [ACM](https://dl.acm.org/doi/10.1145/3677066), [arXiv](https://arxiv.org/html/2406.00189v1), [proposta de tese no KIT](https://hci.iar.kit.edu/208_430.php)
- Kivetz, Urminsky e Zheng (2006), *The Goal-Gradient Hypothesis Resurrected* — [Columbia](https://business.columbia.edu/faculty/research/goal-gradient-hypothesis-resurrected-purchase-acceleration-illusionary-goal), [PDF](https://business.columbia.edu/sites/default/files-efs/pubfiles/1200/goalgradient.pdf)
- Meta-análise sobre os efeitos Zeigarnik e Ovsiankina (2025) — [Palgrave Communications / RePEc](https://ideas.repec.org/a/pal/palcom/v12y2025i1d10.1057_s41599-025-05000-w.html), [PDF (Univ. de Berna)](https://www.kog.psy.unibe.ch/e48276/e1785865/s41599-025-05000-w1_ger.pdf)
- Juul, *The Art of Failure* — [Times Higher Education](https://www.timeshighereducation.com/node/112558), [Big Think](https://bigthink.com/personal-growth/play-video-games-to-fail), [MATLIT](https://impactum-journals.uc.pt/matlit/article/download/2182-8830_4-2_16/2229?inline=1)
- Into the Breach e a justiça — [Newsweek](https://www.newsweek.com/entertainment/video-games/breach-mods-soundtrack-mobile-nintendo-860670), [Game Developer](https://gamedeveloper.com/game-platforms/road-to-the-igf-subset-games-i-into-the-breach-i-), [Gamasutra](https://gamasutra.com:443/business/how-subset-games-made-the-jump-from-i-ftl-i-to-i-into-the-breach-i-)
- Jetpack Joyride (missões) — [análise de Adrian Crook](https://adriancrook.com/?p=4709), [Game Informer](https://gameinformer.com/b/news/archive/2011/09/05/why-you-shouldn-t-pass-over-jetpack-joyride)
- Alto's Adventure (três metas por nível) — [AppUnwrapper](https://www.appunwrapper.com/2015/02/19/altos-adventure-review/), [TapSmart](https://www.tapsmart.com/games/review-altos-adventure-endless-running-skiing-fun/), [Hardcore Gaming 101](https://www.hardcoregaming101.net/altos-adventure/)
- Estrelas no Angry Birds — [wiki](https://angrybirds.fandom.com/wiki/Stars?oldid=5182), [crítica no GameSpot](https://www.gamespot.com/angry-birds/user-reviews/2200-540730/)
- Threes (contagem no fim) — [Wikipedia](https://en.wikipedia.org/wiki/Threes), [AV Club](https://avclub.com/hold-the-phone-threes-has-an-ending-1798263214)
- Balatro (contagem em sequência) — [Blake Crosley](https://blakecrosley.com/pt-BR/guides/design/balatro), [Chris Coyier](https://chriscoyier.net/2025/03/13/on-balatro/)
- Terra Nil (animais que voltam) — [GameLuster](https://gameluster.com/terra-nil-how-find-all-animals-guide/), [The Fandomentals](https://www.thefandomentals.com/terra-nil-review-reverse-city-builder)
- Neko Atsume (gatos raros por objeto) — [iMore](https://www.imore.com/neko-atsume-game-guide-how-collect-all-cats/4)
- Alba: A Wildlife Adventure — [Wikipedia](https://en.wikipedia.org/wiki/Alba:_A_Wildlife_Adventure), [Keengamer](https://www.keengamer.com/articles/guides/alba-a-wildlife-adventure-all-animals-guide/)
- Dorfromantik (desbloqueios) — [Wikipedia](https://en.wikipedia.org/wiki/Dorfromantik)
- Cascadia (variedade por cartas de pontuação) — [Wikipedia](https://en.wikipedia.org/wiki/Cascadia_(board_game))
- Fauna do Cerrado:
  - veredas e buritis — [Embrapa](https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1176629/1/VI.3-Veredas.pdf);
  - aves de vereda — [Biota Neotropica](https://scielo.br/j/bn/a/6x3t4VZqScLV3GkFKFNJBNt/abstract/?lang=en);
  - lobo-guará no cerrado e anta nas matas de galeria — [mapa de fauna, JBB](https://jbb.ibict.br/bitstream/1/1884/38/mapa_3_14_mapa_de_fauna_eejbb.pdf);
  - matas de galeria — [trilha ecológica, JBB](https://jbb.ibict.br/bitstream/1/629/1/Trilha%20Ecol%c3%b3gica.pdf)
