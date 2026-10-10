# Dice Duel: design

> Versão 0.8 (a progressão, as moedas e a loja estão em `docs/progressao.md`). Os números saem do simulador em `sim/` (robôs jogando milhares de partidas).
> Robôs não leem o rival: os números dizem a direção, não as casas decimais.
> As regras moram em `shared/regras.js`, o mesmo motor no navegador e no servidor do online (`docs/servidor.md`).
> No online, qual armadilha está por trás do "?" nunca sai do servidor: cada jogador recebe só a própria visão.

## 1. A ideia em uma frase

Um duelo de dados 1×1, de 6 a 8 minutos (na meta 16). Os dois disputam a mesma Mesa e montam correntes de dados que
se **sincronizam**. Cada um escolhe a hora de **disparar** a corrente, e um deck de até 3 cartas dá o tempero.

## 2. Regras

1. **A Mesa** tem 5 dados. Os jogadores se alternam pegando 1 dado por vez. Quando a Mesa esvazia, rolam-se
   5 novos, e **quem está atrás no placar abre**.
2. **A corrente** só cresce pela frente. O dado que entra precisa sincronizar com o último:
   - **Eco (=):** o mesmo número;
   - **Passo (±1):** um a mais ou a menos;
   - **Oposto (7):** os dois somam 7, como as faces opostas do dado.
3. **O Bolso** guarda 1 dado. Depois de pegar, o dado vai para a corrente, para o Bolso vazio, ou **troca**
   (o dado do Bolso entra e o novo fica guardado).
4. **Disparar.** Com 3 dados ou mais, você dispara (marca pontos e zera a corrente) ou segura.
   Os pontos são 3 → 1, 4 → 2, 5 → 4, 6 → 6, e com 6 dados a corrente dispara sozinha.
5. **Ruptura.** Se o dado que entra não sincroniza, a corrente se perde.
6. **Vitória:** quem chega primeiro a **16 pontos** (v0.12; as metas 20 e 24 ficaram de fora por ora, §17 de `docs/balanceamento-cartas.md`). Até a v0.11 havia a meta 12: curta
   demais (~7 Mesas, dois disparos de 6 fechavam a partida) e as cartas eram queimadas cedo (`docs/balanceamento-cartas.md` §14).

### Por que é assim (medido)

| Decisão | Sem ela | Com ela |
|---|---|---|
| Corrente só por uma ponta | "segurar até 6" empatava com o melhor robô | o melhor robô vence 66–99% das estratégias fixas |
| Bolso | só 44% das compras tinham escolha real; 7,4 rupturas por partida | 69% das compras com escolha; ~2,3 rupturas por partida |
| Quem está atrás abre a Mesa | quem estava 3+ pontos atrás na metade vencia 24% | 35% |
| Sem dado extra para quem joga em segundo quando há cartas | com o dado extra, quem começa vencia 45% | 50,9% |

O dado extra no Bolso para quem joga em segundo só vale quando **nenhum** dos dois tem cartas
(sem ele, quem começa venceria ~60%).

## 3. Cartas

Antes da partida, cada um monta um deck de **até 3 cartas**, cada uma valendo **uma vez**:
- no máximo **2 armadilhas**;
- no máximo **1 carta de pontos ⚡** (Interferência, Pedágio, Sobrecarga).

| Carta | Tipo | Efeito | Vence sozinha* |
|---|---|---|---|
| Ajuste | efeito | ±1 num dado da Mesa (só com 3+ dados na Mesa, v0.12) | 56,6% |
| Virar | efeito | vira um dado (7 − valor); desfaz uma marca de Espelho | 54,1% |
| Rerrolar | efeito | rola a Mesa toda; desfaz uma marca de Espelho | 55,1% |
| Pressa | efeito | pega 2 dados nesta vez (só com 3 ou 4 dados na Mesa, v0.12; o 2.º é opcional) | 58,1% |
| Remendo (ex-Coringa) | efeito | o próximo dado que romperia a corrente entra **no lugar da frente**: a corrente não rompe nem cresce; só com 2+ dados na Mesa (v0.12) | 55,0% (meta 16) |
| Sobrecarga ⚡ | efeito | +2 no próximo disparo de 4+ | — |
| Pausa (v0.11) | efeito | passa a vez sem pegar dado nem disparar; corrente e Bolso ficam | — |
| Reverso (v0.11) | efeito | inverte a corrente: ela cresce pela outra ponta (2+ dados) | — |
| Furto (v0.11) | efeito | troca os dados dos Bolsos (não é "guardar": o Fundo Falso não pega) | — |
| Espelho | armadilha | marca à vista num dado; quem o pega recebe o dado virado e não pode guardá-lo | 53,7% (marca à vista) |
| Fundo Falso | armadilha | o próximo dado que o rival guardar no Bolso cai (na troca, caem os dois) | 54,5% (deck à mostra) |
| Lacre (v0.11) | armadilha | o próximo efeito do rival é gasto sem agir (a Sobrecarga também) | — |
| Âncora | armadilha | protege sua corrente de 4+: o dado que romperia é jogado fora | 58,9% |
| Interferência ⚡ | armadilha | o próximo disparo do rival com 4+ vale −1, **se ele estiver na frente ou empatado** (v0.11); atrás, ela espera | 57,1% |
| Pedágio ⚡ | armadilha | no próximo disparo do rival, você ganha **+2** (era +3 até a v0.10) | 57,3% |

\* deck de 1 carta contra deck vazio; 50% = carta neutra (`sim/valor_cartas.py`).

**As cartas da v0.11** (Pausa, Reverso, Furto, Lacre) foram medidas com as 15 cartas, Mesa de 5 dados, meta 12 e 16,
em pares, contra a Dona Coruja e contra um jogador descuidado (`sim/escolhidas.py`, `docs/balanceamento-cartas.md`
§9). Todas ficam dentro da faixa das antigas (médias de 48,4% a 50,2%) e nenhuma pune mais quem está aprendendo.
A medição achou um problema antigo: na meta 16, o **Pedágio** dominava (24 dos 25 melhores decks; os +3 poupavam um
disparo inteiro), e sozinho ele era a carta mais forte do jogo (61% contra deck vazio, na meta 12). Desde a v0.11
o Pedágio dá **+2 em qualquer meta**: sozinho cai para 57%, como as outras. Empate não existe: se os dois passam da
meta no mesmo disparo, vence quem disparou.

**A Interferência só freia quem lidera (v0.11).** Valendo sempre, ela estava em 15 dos 20 decks mais fortes da meta
12: o −1 no disparo automático de 6 obrigava o rival a disparar mais uma vez (dois disparos de 6 fecham a meta 12).
Agora o −1 só vale se o rival estiver na frente ou empatado; atrás, o disparo não a gasta. Ela passa a ser uma carta
de recuperação, e o simulador mostra a meta 12 mais variada (10 dos 20 melhores com ela) e a meta 16 sem nenhum deck
acima de 58% (`docs/balanceamento-cartas.md` §12).

**Coringa virou Remendo (v0.12).** O nome prometia um curinga, uma carta que vale qualquer coisa, e era isso quando o
dado entrava "com qualquer frente". Desde que o dado ruim passou a entrar no lugar da frente, a carta não vale qualquer
coisa: ela remenda a corrente (não rompe, mas também não cresce). Primeiro o nome foi Boia, mas a boia já é o símbolo do
"salvou" nos bons momentos do fim da partida (o Bolso ou a Âncora evitando uma ruptura): o mesmo desenho teria dois
sentidos. O Remendo diz o mecanismo e tem desenho próprio, um retalho costurado. O id interno continua `coringa`: decks
salvos, contas e partidas guardadas seguem valendo. A pintura é um retalho mel costurado, com pontos creme e um X coral
(`arte/cartas.json`, pintado por `tools/arte_icones.py`); a pintura antiga, um palhaço, saiu.

**Os textos (v0.12).** Cada carta segue o mesmo formato: o que faz, quando vale (os dados na Mesa, o tamanho da
corrente) e o detalhe que confunde, com exemplo ("o 2 vira 5"; "2-3-4 vira 4-3-2"). Os rótulos curtos não se repetem
(Remendo "remenda a frente", Âncora "segura corrente de 4+"). O livro de regras deixa nas cartas o que é de cada uma
e fica, em "Quando as cartas se cruzam", só com as interações.

### Quando as cartas se cruzam (exceções explícitas)

Cada regra abaixo aparece também no painel de Regras do jogo e é conferida por `tools/regras.js`.

| Situação | O que acontece |
|---|---|
| Armadilhas de lados opostos | Não se anulam: cada uma olha só a sua condição. A Âncora do rival segurar a corrente dele **não** gasta a sua Interferência; ela segue esperando o próximo disparo de 4+ dele. |
| "4 ou mais" | É o tamanho da corrente na hora: no disparo (Interferência, Sobrecarga) ou quando o dado ruim ia entrar (Âncora). Com 3, nada é gasto e a carta continua esperando. |
| Interferência + Sobrecarga | As duas valem: um disparo de 4 vale 2 + 2 − 1 = 3. |
| Pedágio | Pega qualquer disparo, inclusive o de 3 e o automático de 6. Se os dois passarem da meta no mesmo disparo, vence quem disparou. |
| Coringa + Âncora | Com o Coringa ativo nenhum dado rompe, então a Âncora não é gasta. |
| Coringa | Não alonga a corrente (v0.12): o dado que romperia **troca a frente** e a corrente fica do mesmo tamanho (não completa o 6.º dado). É gasto no primeiro dado que entra numa corrente **já começada**, mesmo que esse dado já sincronizasse (aí ele entra normal, como mais um elo). Corrente vazia e Bolso não gastam. Até a v0.11 o dado entrava como mais um elo: jogando como gente (segurar a corrente de 5 contando com ele), o Coringa vencia 64,9% sozinho na meta 12 e estava nos 25 melhores decks da 16 (`docs/balanceamento-cartas.md` §14). |
| Pressa | Só com 3 ou 4 dados na Mesa (v0.12): nunca abre uma Mesa nem pega o último dado. Com 2, ela pegava o último dado (que era do rival) e quem está atrás abria a Mesa seguinte: 3 dados seguidos com o rival só assistindo, em 24% das partidas com ela (`docs/balanceamento-cartas.md` §16). Não passa para a Mesa seguinte. Não se dispara entre os dois dados; o segundo é opcional ("Dispensar"). Se o primeiro completar 6, a corrente dispara sozinha e o segundo começa outra. |
| Espelho | O dado chega virado (7 − valor) e não pode ir para o Bolso; Coringa e Âncora ainda valem. As etiquetas da Mesa e o aviso de ruptura já usam o valor virado. Virar (no dado marcado) e Rerrolar apagam a marca; Ajuste não. Pegar o próprio dado marcado desperdiça o Espelho. |
| Fundo Falso | Só pega quando o dado vai para o Bolso. Na troca, os dois caem e a corrente não muda. |
| Lugar da armadilha | Uma armadilha armada por vez. Armadilha que nunca encontra a sua condição fica armada até o fim. |

### Bugs corrigidos na v0.8

| Bug | Efeito no jogo | Correção |
|---|---|---|
| `podeUsar` recusava qualquer carta enquanto o rival "pensava" | **O rival fácil (então o Biscoito) nunca usava cartas** (0 de 18 em 6 partidas de teste) | a checagem saiu da regra e foi para o clique |
| Pressa + corrente completando 6 | o segundo dado sumia sem aviso | o disparo automático acontece e o segundo dado continua |
| Pressa sem saída | o segundo dado era obrigatório e podia forçar uma ruptura | botão "Dispensar o 2.º dado" (o robô também dispensa) |
| Pressa no último dado | a carta só dizia "precisa de 2 dados" | o texto e o aviso dizem que ela não passa para a Mesa seguinte |
| Segundo dado da Pressa no 6 | o aviso "pegue o segundo dado" aparecia na vez do rival | a vez nova limpa o estado da Pressa |
| Coringa com corrente vazia | era gasto no primeiro dado, que não precisava dele | só é gasto numa corrente já começada |
| Dado com Espelho do rival | etiquetas e aviso de ruptura usavam o valor **antes** de virar: o jogo dizia "Eco" e rompia sem pedir confirmação | etiqueta "vira X", relação e aviso calculados com o valor virado |
| Aviso de armadilha na decisão | listava armadilhas que não mexem no disparo e falava em Interferência com corrente de 3 | diz o que cada possibilidade faria neste disparo |

Com a Pressa nova, o simulador (`sim/deck.py`, alinhado ao jogo) mede o melhor deck em 60,3% (antes 59,7%) e só
3 decks acima de 58%: dentro do ruído de 1.200 partidas por deck.

### Equilíbrio dos decks (`sim/decks.py`)

São 133 decks válidos; cada um jogou 1.200 partidas contra rivais sorteados.
- **O melhor** (Âncora + Coringa + Interferência) vence **59,7%**, e só 4 decks passam de 58%.
- **A vitória média dos decks** com cada carta vai de 47,8% (Espelho) a 53,3% (Interferência).
- **Os 25 melhores decks** usam as 11 cartas.

**O combo quebrado que motivou o limite de ⚡.** Pedágio + Sobrecarga vencia 75–80%, porque cartas que
mexem direto em pontos se somam numa corrida até 12. Enfraquecer cada uma deixava as cartas sem graça;
limitar a 1 carta ⚡ por deck resolveu.

**Ajustes feitos pelos números:**
- Interferência: de "um dado a menos" para −1 ponto (65% → 59%);
- Âncora: só para correntes de 4+;
- Rerrolar: rola a Mesa toda;
- Pedágio: +3 pontos;
- Sobrecarga: +2 pontos;
- Espelho: o dado virado não vai para o Bolso;
- Dissipar (anti-armadilha dedicada) saiu; desfazer a marca virou o segundo uso de Virar e Rerrolar.

**Cartas fracas no robô:** Espelho, Rerrolar e Virar (~48%). Pode ser falta de habilidade do robô com elas.
Olhar os resumos dos testes com gente antes de reforçar.

## 4. Informação: o que o rival vê

| | O rival vê? |
|---|---|
| O seu deck de 3 cartas | **sim**, desde o começo (tela de "versus") e durante a partida |
| Que há uma carta virada | **sim** ("?") |
| Qual armadilha está virada | **não**: só que é uma das suas armadilhas ainda não reveladas (a tela lista quais) |
| O dado marcado pelo Espelho | **sim** |
| Efeitos usados | sim, na hora |

### O "?" (v0.13: sem blefe)

A armadilha é armada virada para baixo: o rival vê um "?" e sabe que é uma armadilha, mas não qual. Com o deck à
mostra, o "?" é uma das armadilhas dele ainda não reveladas (o Espelho nunca é "?": a marca fica à vista).
- **Começo (versus):** os dois decks inteiros.
- **Durante:** cada carta aparece como "na mão" até agir; a armadilha armada **não** é marcada no deck do dono
  visto pelo rival, aparece só o "?" ("armadilha virada") ao lado. Tocar nele lista quais armadilhas ele pode ser e o
  que cada uma faria agora.
- **Na hora de disparar:** o aviso lista o que o "?" pode ser e o que cada possibilidade faria **neste** disparo.
- **Quando age:** a carta se revela com o nome, para os dois.

**O blefe (v0.8 a v0.12) saiu na v0.13.** Ele nasceu de um teste com gente: com o deck à mostra, o "?" de quem só
tinha uma armadilha era certeza. A regra deixava virar um **efeito** no lugar da armadilha; na v0.11 ganhou o
**desafio** (pagar para ver: +2 por pegar o blefe, +2 para o dono da armadilha de verdade, +3 pelo blefe que passava).
Saiu porque mudava pouco quem ganha (todas as estratégias entre 47,7% e 50,6%), só se sustentava com pontos fora dos
dados (~17% dos pontos de uma partida), não tinha o que ler (deck de 3 à mostra; contra robô e no online, sem rosto,
o desafio era cara ou coroa) e somava exceções (só com armadilha escondida, ocupava o lugar dela, só desvirava na
vez seguinte, o Lacre o pegava). Números em `docs/balanceamento-cartas.md` §13 (o estudo) e §18 (a decisão).

**Robôs:** a Diana e a Dona Coruja não blefam nem desafiam; armam as armadilhas como antes.

Por quê (`sim/informacao.py`): mostrar quase não enfraquece as armadilhas.

| Armadilha | Totalmente oculta | Com o deck e a marca à mostra |
|---|---|---|
| Espelho | 54,9% | 53,7% |
| Fundo Falso | 56,5% | 54,5% |
| Âncora, Interferência, Pedágio | iguais | |

O que muda é que o rival ganha decisões: desviar do dado marcado custa a ele, e a dúvida "é Fundo Falso ou
Interferência?" é dedução, não pegadinha. A pesquisa (docs/pesquisa.md) aponta o mesmo.

**Armadilha armada não é motivo para pânico.** Na simulação, quem passou a jogar com medo (disparar cedo,
evitar o Bolso sem saber) perdeu mais do que as armadilhas tiram. O jogo diz isso nas dicas.

## 5. Primeiras partidas (onboarding)

**A estreia (v0.14).** Até a v0.13, quem tocava em Jogar pela primeira vez escolhia o rival e caía na tela de montar
o deck, com 15 cartas (várias com preço da Loja), antes de rolar um dado; depois vinha uma partida inteira até 16 com
Eco, Passo, Oposto, Bolso, disparo e três cartas ao mesmo tempo. Os jogos que ensinam bem fazem o contrário: a primeira
batalha do Clash Royale tem deck fixo e sem relógio, o Marvel Snap libera os tipos de carta em ordem, o Balatro ensina
pela própria partida. Agora:
- **Primeira partida:** o Jogar começa direto uma partida contra a Diana, **até 8 pontos e sem cartas** dos dois lados
  (sem escolha de rival, sem deck). Você começa; a Diana, que joga em segundo, ganha o dado no Bolso de sempre das
  partidas sem cartas. O versus diz o que fazer em uma frase. Ela vale como uma partida contra a Diana (rating,
  moedas na vitória, experiência, recordes).
- **Segunda partida:** o caminho de antes: a escolha do rival e o deck "Primeira mesa" (só efeitos) por cima dela.
- **Armadilhas:** chegam depois da primeira partida **com cartas** (a estreia não conta), ou em Ajustes → "Todas as
  cartas liberadas". A Diana também só usa efeitos até lá.
- **Quem já jogava** (recordes ou deck no aparelho, ou uma conta que já jogou, ao entrar nela) não passa pela estreia
  nem pelas explicações.

**O guia: nomear depois de fazer.** Cada explicação aparece **uma vez**, logo depois de a pessoa fazer a coisa, e não
antes: a descoberta é dela, o jogo só dá o nome (o prazer de "entender sozinho" é o mesmo da piada que se resolve na
cabeça de quem ouve). São cinco:

| Quando | Chamada |
|---|---|
| o primeiro Eco, Passo e Oposto da pessoa | "Passo!" · "4 e 3: um a mais ou um a menos sincroniza." (com os números do lance) |
| a primeira corrente de 3, na hora de decidir | "Já dá para disparar" · disparar marca agora; segurar arrisca, mas cada dado a mais vale mais (os botões já dizem quanto) |
| a primeira ruptura de 2 dados ou mais | "A corrente rompeu" · um dado guardado no Bolso pode salvar a corrente numa hora dessas |

Valem em qualquer partida (também online), até aparecerem. Com as ajudas desligadas não aparecem e não ficam marcadas.
Ficam numa faixa própria, logo acima do seu painel, e fora da fila das chamadas de festa: na fila, uma explicação de
4 s atrasava o "Belo disparo!" do lance seguinte.
O que já apareceu fica no aparelho (`guia` no `diceduel.v1`), não na conta.
- **Prévia antes de confirmar:** ao escolher o alvo de Virar ou Ajuste, cada dado mostra como ficaria.
  Cancelar devolve a carta.

## 6. Gamefeel: recompensar os bons momentos

| Momento | O que acontece |
|---|---|
| Cada elo da corrente | uma nota de kalimba que **sobe** a cada elo; brilhinhos no dado; "Boa corrente!" no 4.º e "Corrente de 5!" no 5.º |
| Disparo (v0.14: em cascata) | cada dado da corrente **acende na nota dele** do arpejo (80 ms + 85 ms por dado; era 55 ms, rápido demais para o olho), e um selo sobre a corrente **conta o valor** que ela vai somando (+1, +2, +4, +6) até fechar em mel no valor de verdade (com Sobrecarga ou Interferência). Só então: clarão, brilhos, tremor com 5+, e os pontos voam até o placar, que segura o número de antes até eles chegarem e **conta** tique a tique; o "+N" estoura no placar em mel, do tamanho do lance. Uns 1,3 s ao todo |
| Sinfonia (6 dados) | chamada grande, vibração curta |
| Harmonia (todos os elos do mesmo tipo, 4+) | chamada "Harmonia!" (só enfeite, não muda pontos) |
| Bloqueio (levar o único dado que servia ao rival com corrente de 3+) | "Bloqueio!" |
| Salvo (Bolso ou Âncora evitam a ruptura) | "Salvo!" e um acorde de alívio |
| Esquiva (o dono do Espelho teve de pegar o próprio dado) | "Esquiva!" para quem desviou |
| Armadilha que pega | revelação com brilho e o nome da carta |
| Virada (vencer depois de estar 4+ pontos atrás) | "Virada!" no fim |
| Paciência (v0.14): segurou uma corrente que já podia disparar e ela rendeu **2 pontos ou mais** a mais | "Valeu esperar!" na hora (com 6, a Sinfonia já festeja) e, no fim, "Paciência: segurou a corrente de 3 e disparou com 5 (+4 em vez de +1)" com uma ampulheta |
| Fim de partida | lista de **bons momentos** (repetições viram "×2"), **recordes** (maior disparo, maior corrente, melhor sequência) e confete na vitória |

**Tocar escolhe, não pega (v0.9.2).** Um toque sem querer não pode custar a partida:
- tocar num dado da Mesa só o **escolhe** (ele sobe com um aro dourado); nada sai da Mesa;
- tocar em outro dado troca a escolha; "Cancelar" (ou Esc) desfaz sem gastar a vez;
- o dado só é pego quando se escolhe o destino (corrente, guardar ou trocar), numa ação só;
- tocar de novo no mesmo dado leva ao destino principal, mas **nunca** a uma ruptura nem a desperdiçar o próprio
  Espelho: nesses casos é preciso apertar o botão do aviso;
- as cartas que pedem um dado (Virar, Espelho, Ajuste) seguem a mesma regra: escolher, poder trocar de dado, e só
  então confirmar; "Cancelar" devolve a carta para a mão;
- no segundo dado da Pressa vale o mesmo, e "Dispensar o 2.º dado" continua lá.

No online, a jogada vai ao servidor como `{tipo:'pegar', idx, modo}`: dado e destino juntos.

**O deck no meio da partida.** Abrir o deck e apertar o botão não abandona a partida: ele vira "Salvar deck", e o
deck novo vale a partir da próxima. Para recomeçar já existe o link "Recomeçar agora". Contra a Diana e a Dona
Coruja isso conta como derrota e não rende experiência. Sem essa regra, abandonar a partida seria um jeito de
nunca perder rating.

**Perder também é aconchegante.** A ruptura é um "plonc" descendente com poeirinha caindo devagar, nunca um
estrondo. A derrota diz "Fim de partida" e mostra os bons momentos da partida.

**A tela do fim sem "+0" (v0.14).** Na derrota, a tela abria com uma moeda grande e "+0", e logo abaixo o rating
caindo: a primeira coisa lida era o que não se ganhou (o risco que `docs/progressao.md` §7 já apontava). Agora, sem
moedas (derrota, ou teto do rival), não há número grande: os **bons momentos vêm primeiro**, depois a experiência
(que sobe sempre), o rating e, miúda, a linha das moedas. Na vitória com moedas, nada muda.

**O tom (v0.9):** aconchegante, mas adulto e bonito. Nada de falas infantis ("que vitória gostosa", "doce como
algodão-doce"). Os textos são curtos e sóbrios, como um bom adversário de mesa falaria: "Boa leitura da Mesa",
"Arrisquei demais", "Partida bem jogada".

**Os rivais:**
- **Diana**, uma gata branca de olhos azuis que joga solto e arrisca;
- **Dona Coruja**, que joga com paciência e lê a Mesa.

A Diana tem marcas fixas, que a arte precisa respeitar: ponta da orelha direita (dela) preta, a esquerda branca,
um cinza leve logo acima dos olhos, dois riscos escuros verticais no meio da testa (um de cada lado) e um pequeno
ferimento vermelho no dorso do nariz, entre os olhos, bem acima das narinas.

Os dois piscam, ficam felizes ou murcham, e soltam falas curtas (dá para desligar). A Dona Coruja leva um
dos 9 melhores decks da simulação.

### A rolagem (v0.10)

A Mesa nova cai como **dados de verdade**. São cubos 3D que giram, se batem, quicam e assentam exatamente onde o
dado parado fica, com a face que a regra já sorteou. A ideia e os dados vêm do Cronomotor
(`steamdicegame`, docs/02-arte/06-rolagem-dos-dados.md).

**A regra decide; a física só anima.** O motor sorteia as faces como sempre. Depois:
- a tela sorteia (só para enfeite) um dos 40 lançamentos gravados com física 3D no Godot, de 1 a 5 dados
  (`js/lancamentos.js`, 122 KB, 35 KB comprimido), às vezes espelhado;
- cada dado ganha uma **correção de face**: uma simetria do cubo que leva a face sorteada para onde a face
  gravada caiu, entre as 4 equivalentes a de menor giro;
- nos últimos ~0,3 s entra o **ajuste final**: o dado desliza até a casa, gira até o ângulo do dado parado e
  termina exatamente de pé. A troca pelo dado parado não dá salto.

`servidor/testes/rolagem.test.js` confere todos os lançamentos × dados × faces × espelho (1.440 casos): a face da
regra sempre termina para cima, de pé, no ângulo certo e na casa.

**Na tela:**
- cubos em CSS 3D, com a skin do jogador nas seis faces, luz por face e uma sombra que se afasta e clareia com a
  altura;
- **o pouso é o dado parado (v0.10.1).** Cada dado tem a própria perspectiva, com o olho em cima da casa dele:
  pousado, o cubo é visto de cima, sem lateral à mostra, e não entorta longe do centro da tela. A face de cima
  pousada recebe a mesma luz do dado parado, guarda a beirada de baixo da skin e tem a mesma sombra (6 px abaixo,
  desfocada). A troca acontece no quadro em que o cubo pousa;
- **o pouso sem quebra (v0.11).** O ajuste final (deslizar até a casa e endireitar) termina ainda junto do último
  movimento da física, não com o dado já parado (parecia patinar no feltro). Nos últimos 0,1 s o cubo fica na pose final
  e se funde no dado parado: o dado parado aparece por baixo e o cubo some aos poucos, junto com o miolo e a sombra
  dele (que, por cima, acinzentariam o dado). Antes, a troca era num quadro só, e o cubo 3D, desenhado mais macio que
  o dado nítido, dava um estalo; o "assento" depois da troca saiu.
- **um dado de verdade, não abas de papel.** As faces têm o canto arredondado do dado parado, então as quinas
  do cubo ficariam ocas. Um **miolo** (cubo menor, 41% do lado a partir do centro; 38,5% na pelúcia) enche as
  quinas como um dado de canto gasto, sem aparecer pelos cantos quando o dado está pousado. A face que fica quase
  de perfil esmaece: de perfil ela seria uma lasca com bolinhas saindo do contorno;
- cada batida gravada (feltro, dado contra dado, borda) soa no quadro em que acontece;
- nada espera a rolagem: dá para escolher um dado ainda girando. Só a Diana e a Dona Coruja esperam os dados
  assentarem antes de escolher (no máximo 2,5 s);
- a primeira Mesa rola quando as janelas do começo (deck, versus) fecham. Sem animações (Ajustes ou "reduzir
  movimento"), os dados aparecem parados, com o som de antes.

**O que ficou de fora do Cronomotor, de propósito:** o copo de couro 3D (pede renderização 3D de verdade e
pesaria no celular) e o desenho a nanquim (é a linguagem de outro jogo). A rolagem do Dice Duel usa os próprios
dados e skins.

**Regravar:** `tools/lancamentos/` (exportar do Godot e montar a versão enxuta; o passo a passo está no topo de
`montar.py`).

## 7. Som, música e gamefeel (intenções)

Tudo é sintetizado na hora com Web Audio: nenhum arquivo de áudio (abre por `file://`, no HTML único e na Vercel
sem pedido extra). Nada no som deve assustar.

**Uma harmonia só.** A música e os efeitos dividem um relógio harmônico: as notas do elo, do disparo, dos sininhos e
da contagem do placar saem do acorde que está tocando agora. A corrente "canta" dentro da trilha, nunca contra ela.

| Som | Intenção |
|---|---|
| Mesa rolando | com a rolagem 3D, cada batida gravada soa no quadro dela (linhas "Dado …" abaixo); sem animações, cada dado cai, achata no feltro e quica, um depois do outro |
| Escolher um dado | prévia: se sincroniza, toca baixinho a nota que vai somar; se rompe, um "hm-hm" grave e macio |
| Pegar um dado | o estalo do dado saindo do feltro |
| Elo | o dado assenta e soa a próxima nota do acorde: a corrente sobe e cresce |
| Bolso / troca | "fump" de pano: guardado em segurança |
| Disparo | um "fuuu" que sobe, arpejo da corrente e um acorde morno; os pontos voam até o placar com um tique por ponto |
| Ruptura | os dados se espalham pelo feltro e duas notas descem: "ah, quase", sem susto |
| Sua vez | dois sininhos discretos e o painel dá um pulinho; no online, três sininhos que sobem e um acorde (para ouvir de longe), também nos lembretes da vez |
| Armadilha armada / revelada | brilho curto / "tchã-rã" mágico: surpresa curiosa, não punição |
| Janela abrindo | papel; a música vai para o fundo (abafada) enquanto ela estiver aberta |
| Vitória / derrota | fanfarra pequena / três notas descendo com acorde acolhedor |
| Falas do rival | "blá-blá" com a voz de cada um: a gata sobe no fim, a coruja é grave e redonda |
| Dado no feltro (1º pouso) | toque abafado com um grave curto: o dado chegou, com peso |
| Dado no feltro (quiques seguintes) | o mesmo toque, mais agudo e mais baixo quanto mais fraco: o dado se acomodando |
| Dado contra dado | estalo seco e agudo, sem grave, às vezes com um segundo toque logo depois: dois dados de osso se batendo |
| Dado na borda | toque de madeira curto: a borda da mesa |

**A música** é um lo-fi gerado na hora, em cenas, com piano elétrico (FM), baixo redondo, kalimba e o "wow" de fita:
- **partida** (76 bpm, com balanço): duas progressões que se alternam; o chimbal entra quando alguém passa de 30% da
  meta, o bumbo e a vassourinha a partir de 50%;
- **reta final** (82 bpm), quando alguém passa de 75% da meta: progressão em lá menor, contracanto e um pad que respira;
- **fim**: só piano e pad, devagar, até a próxima partida;
- a kalimba toca motivos de um compasso que se repetem com variação, então soa composta, não aleatória;
- a música abaixa sozinha sob disparos, armadilhas e o fim (e volta), e um limitador segura os picos.

**A tela inicial (v0.14).** Era um fundo escuro com o logo e os botões: a arte pintada só aparecia depois do primeiro
toque. Agora o logo deu lugar a uma cena: a rival da vez (a Diana na estreia) espia por trás de uma mesinha de feltro e
madeira, respira, e diz a saudação da hora ("Bom dia", "Boa tarde", "Boa noite"; as falas da partida também). Três dados
descansam no feltro (o do meio, na pele da rival, dá um pulinho de vez em quando). **Tocar num dado o rola**; se os três
formarem uma corrente, a rival repara ("Olha: isso já é uma corrente."). **Tocar na rival**, ela sorri e fala outra
frase. Em telas baixas (até 680 px) a cena encolhe; com "reduzir movimento", fica parada.

**As patas da Diana** (`js/pata.js`). Gata que é, a Diana não deixa os dados em paz. Ela espia com as duas patas
apoiadas na borda da mesa, uma de cada lado do queixo; só as patas, sem braço nem corpo. A cada 4 a 8 s uma delas sai da
borda, desce num dado, dá uma ou duas batidinhas (o dado treme, um toque abafado no feltro e uma vibração leve, só depois
de a pessoa já ter tocado na tela, porque antes o navegador recusa), arrasta o dado na direção dela com a cabeça
inclinada, travessa, e solta; o dado volta para o lugar e a pata volta para a borda. **Cada dado é da pata do lado dele:**
o da esquerda, a pata da esquerda; o da direita, a da direita; o do meio, meio a meio. Às vezes ela comenta ("Esse aqui
parece meu.", "Só estou olhando.", "Calma. Ainda não peguei."). Tocar num dado ou nela no meio do gesto faz as patas
voltarem depressa para a borda. A pata não sobe pela tela (passaria pelo rosto): erguer é ela crescer um pouco e a
sombra no feltro se afastar.

A pata é um **sprite de quatro poses**, trocadas como quadros (vetor, no traço de cacau e no branco da Diana):
- **dorso:** vista de cima, apoiada na borda, com os vãos dos dedos;
- **virando:** de lado, estreita, com a beirada rosa das almofadinhas aparecendo;
- **palma:** erguida, de frente para quem olha: a almofada maior, de três lobos, e os quatro feijõezinhos rosa em arco;
- **gancho:** os dedos dobrados por cima da aresta do dado, com as quatro pontinhas rosa apertando a face dele.

A investida: dorso → virando → palma ao erguer (a palma fica no ar em cima do dado, a ameaça); palma → virando → gancho
ao descer na aresta de cima do dado; uma ou duas apertadas; puxa o dado pela aresta (ele inclina, arrastado pela
beirada); gancho → virando → dorso ao soltar, e a pata volta para a borda. A pata da direita é o espelho da da esquerda. Com a Dona Coruja escolhida, não há patas; com as animações desligadas, elas ficam paradas
na borda.

**A mesa não pisca mais marrom.** O tremor dos disparos de 5 e 6 movia a própria mesa; o transform a fazia virar um
contexto de empilhamento e a moldura de madeira (o `::before`, z-index −1) passava por cima do feltro por um quarto de
segundo. Agora treme o que envolve a mesa.

**Gamefeel:** o dado afunda quando é tocado; a corrente esquenta com 4 dados e ferve com 5; o disparo de 4+ solta um
clarão; o celular vibra de leve ao escolher, pegar e disparar (dá para desligar). Com "reduzir movimento" ou as
animações desligadas, tudo isso vira instantâneo.

## 8. Ajustes

**Som:**
- efeitos sonoros (com volume);
- música (com volume).

**Imagem e toque:**
- animações (respeita "reduzir movimento" do sistema);
- brilhos e confete;
- tremor leve da mesa;
- vibração;
- falas do rival;
- **ajudas na partida** (v0.11): etiquetas nos dados, faces da próxima casa, a linha "disparar vale…", o risco de
  segurar, a explicação da carta virada e os "toque em…". Desligadas, a barra de jogada fica com uma frase curta e os
  botões; os avisos de que a corrente vai romper continuam (evitam toque errado). Também liga e desliga pelo botão
  menu de pausa (o botão no alto da tela).

**Partida em foco (v0.11): o jogo é o jogo.** Durante a partida, a tela tem só os dois painéis e a Mesa. O cabeçalho
inteiro sai (logo, moedas, Online, Regras, Deck, Ajustes) e no PC o "Como se joga" sai da lateral (as Regras abrem por cima, pela Pausa).
O tabuleiro fica **centrado na tela** (vertical e horizontal) e, no alto, só uma faixa com **Som** (cala efeitos e
música juntos) e **Pausa**. **A decisão aparece no seu painel, no lugar da fileira de cartas,** logo abaixo da
corrente que ela afeta, e só quando há decisão: dado escolhido (Na corrente, Guardar, Trocar, Cancelar), para onde
vai o dado, disparar ou segurar, o segundo dado da Pressa, uma carta com alvo e o fim. Não há barra solta: o
tabuleiro não se mexe. Escolher um dado não tem texto: o "sua vez" do painel e as etiquetas dos dados bastam; a vez
do rival aparece no painel dele. O único caminho para fora da jogada é a **Pausa**: ela abre
uma lista curta: Continuar, a chave das ajudas, Regras, Ajustes, Menu principal (fora do online) e
Desistir, que pede um segundo toque quando conta como derrota (contra o rival, depois do primeiro dado, e
online). Deck, Loja e Online moram no menu principal. Fora da partida, o cabeçalho volta. A fala do rival sai do retrato e nunca cobre o Bolso nem o placar.

**Cartas na mão (v0.12): as cartas são cartas.** Na partida, as cartas eram pílulas de texto com um ícone de traço de
18 px, iguais a um botão qualquer, e tocar abria uma janela por cima da Mesa com um parágrafo e "Usar/Fechar". Os
dados são objetos (rolam, pousam, voam); as cartas não eram. Agora:
- **as suas são cartas de verdade**, com a mesma arte pintada do deck, o nome e o que fazem ("±1 num dado",
  "−1 em quem lidera"); as do rival são fichas mais baixas (arte e nome), para a sua mão ter o destaque;
- **o estado se lê sem tocar**: na sua vez, a carta que dá para usar agora **sobe com o aro de mel**; a que não serve
  agora fica rente e apagada; a armadilha armada fica **escura, virada para baixo**, como a carta virada
  do rival; a usada fica cinza e riscada. Usar faz a carta dar um pulinho e apagar; armar faz ela virar;
- **a mão em leque**: as três cartas um pouco abertas, como seguradas; a escolhida sobe reta.
- **olhar sem usar**: **segurar** qualquer carta (sua ou do rival) mostra a carta grande, com o texto inteiro, acima
  dela; soltar some e nada acontece. No computador, basta parar o mouse em cima. O botão **Ler** abre a janela de leitura.
- **usar tocando**: tocar numa carta sua, na sua vez, a levanta. A que pede um dado (Ajuste, Virar, Espelho) já
  espera o dado: as etiquetas da Mesa mostram como cada dado fica, e **tocar no dado já usa** (Virar e Espelho; o
  Ajuste ainda pergunta −1 ou +1). As outras mostram **Usar/Armar**, **Ler** e ✕ numa fileira embaixo.
  Tocar de novo na carta, ou em Cancelar, a devolve. A frase do que fazer (ou por que ela não serve agora) aparece
  na linha da Mesa, perto dos dados; a carta que não serve agora treme.
- **usar arrastando**: arrastar a carta segue o dedo, inclinando com o movimento. A que pede um dado encolhe e fica
  acima do dedo; o dado sob ele acende com a etiqueta do que vai acontecer, e soltar nele usa. As outras usam ao
  soltar em qualquer lugar acima do seu painel (a Mesa acende). Soltar de volta no painel não faz nada.
- As do rival, e as suas fora da vez, continuam abrindo a janela de leitura ao tocar.
- no celular baixo (até 700 de altura), e a dois em telas de até 760, o "o que faz" sai da carta para caber tudo.

Referências: o "?" junto do retrato do Segredo de Hearthstone, a carta grande ao segurar do Marvel Snap, a carta
que leva até o alvo do Slay the Spire, a inclinação e a vibração do Balatro, e Dicey Dungeons (dado e carta se tocam).

**O dado sem botões (v0.12).** Os botões Na corrente / Guardar / Trocar, embaixo do painel, eram mais uma camada entre
o dedo e o dado: a pessoa escolhia o dado na Mesa e lia três botões lá embaixo. Agora o dado vai direto ao lugar:
- **tocar no dado** o escolhe: a **corrente** e o **Bolso** acendem, cada um com uma etiqueta do que acontece se o dado
  for para lá (verde "Passo", "guardar", "troca: entra o 3"; mel quando vai perguntar; coral "rompe"; apagado "não pode");
- **tocar na corrente ou no Bolso**, ou **arrastar o dado** até eles, leva o dado; **tocar de novo no dado** faz a
  melhor jogada segura (como antes); tocar num espaço vazio da Mesa (ou Esc) desfaz a escolha;
- **pergunta só quando há risco** ou quando o lugar apontado não é o que a regra deixa: o dado que não serve solto na
  corrente pergunta se troca com o do Bolso, se guarda, ou (sem nenhuma jogada segura) se rompe. O dado novo solto no
  Bolso cheio, com o do Bolso servindo na corrente, troca **sem perguntar**: o gesto já diz o que a pessoa quer.
- A regra não muda: com uma jogada segura disponível, não dá para romper de propósito; a pergunta oferece a segura.
- A vez não aparece mais num selo no meio da Mesa: a etiqueta "sua vez" do painel basta. No online, o relógio da vez
  mora nela ("SUA VEZ · 23 s", vermelha nos 10 s finais).

**De quem é a vez (v0.12): óbvio de longe.** No teste com gente, um segundo de desatenção bastava para não saber,
de volta à tela, se a vez era sua ou do rival (e no online o tempo da vez acabar é derrota). Agora:
- **Selo de vez** no alto da Mesa, no lugar do título: "Sua vez" na sua cor, respirando; "Vez de Diana…" apagado, com
  o contorno do rival. No online ele traz o relógio da vez sempre à vista (antes só nos 30 s finais, escondido no
  "rodada · dados"), vermelho e pulsando nos 10 s finais.
- **A Mesa acende na sua vez:** o feltro ganha um aro da sua cor que respira e um brilho sobre a madeira. Na vez do
  rival, os dados da Mesa e a sua ficha esmaecem: o que está aceso é de quem joga.
- **No online, a vez que chega avisa:** chamada "Sua vez · 60 s para jogar", três sininhos e vibração. A aba do navegador
  vira "● Sua vez · 38 s". A vez é lembrada na metade do tempo (se nada foi escolhido) e nos 10 s finais ("Ainda é sua
  vez: se o tempo acabar, você perde a partida"). Quem volta para a tela (outra aba, celular bloqueado) na sua vez vê
  e ouve o aviso de novo.
- **Bug corrigido:** o sininho da vez guardava a memória dentro do objeto do jogo; no online cada estado do servidor é
  um objeto novo, então o aviso **nunca tocava no online**. A memória saiu do jogo, e a chave conta as vezes: abrir a
  Mesa duas vezes seguidas (quem está atrás abre) também avisa.
- **Sua vez de novo:** quando a vez volta para você em seguida, a chamada diz por quê ("você está atrás no placar e abre
  a Mesa nova" ou "Diana usou a Pausa e passou a vez"); o aviso da Pausa do rival já diz "você joga de novo". Sem isso,
  jogar duas ou três vezes seguidas parecia erro do jogo (`docs/balanceamento-cartas.md` §16).

**Sem modo a dois (v0.12).** O "2 jogadores" no mesmo aparelho saiu do menu (o dono não fazia questão e não estava
bom). Quem tinha o modo marcado volta para o rival; uma partida a dois guardada não volta. O motor ainda sabe jogar a
dois: é assim que `tools/regras.js` joga as duas mãos pela tela.

**Menu principal (v0.11).** O jogo abre nele: logo, nome, rating, nível e moedas, **Jogar** grande, Online, e uma
fileira de ícones (Deck, Loja, Regras, Ajustes).

**Perfil e Loja (v0.12).** A Loja fazia dois papéis: vender e ser o lugar do perfil (título, rating, nível, XP) e do
visual. Ficou assim:
- **Tocar no seu nome na tela inicial abre o Perfil:** nome, título, nível com a barra de XP ("12 de 60 XP para o
  nível 2"), moedas, ratings (contra os rivais e online), recordes (partidas, vitórias, melhor sequência, maior
  disparo, maior corrente) e **Seu visual**: ícone, dado e mesa, **só com o que você já tem**, com um toque para vestir.
  "Mais na Loja" leva à Loja. Sem conta, um "Entrar ou criar conta" lembra que o progresso fica só no aparelho.
- **A Loja continua sendo a Loja:** as moedas precisam de um destino, e comprar é outra coisa que se arrumar. O ícone
  dela virou uma lojinha com toldo (era uma moeda, que se confundia com o saldo).
- **Bug do "Convidado":** o menu só se redesenhava ao abrir. Quem entrava na conta pela janela Online, aberta por cima
  do menu, voltava a ver "Convidado" (e as moedas de antes da compra). Agora tudo o que mostra a conta se redesenha
  quando ela muda, e o menu também sempre que uma janela por cima dele fecha. O `tools/online_e2e.js` confere.

**Escolha do rival (v0.12).** A escolha Diana/Dona Coruja era um seletor pequeno no menu, com uma linha de texto: não
dava para ver quem era cada uma nem o que mudava. Agora **Jogar** abre "Escolha o rival", no lugar dos botões do menu
(o logo e o título saem, para caber sem rolar em 360×640):
- um cartão por rival, com o **retrato pintado**, o nome, a dificuldade ("Para começar", "Desafiadora"), o jeito de
  jogar e o que a vitória rende (cerca de X moedas e o rating dela; ou "vitórias não rendem mais moedas", se o seu
  rating já passou do teto daquela rival). Tocar escolhe; a escolhida ganha o contorno dourado e o retrato sorri;
- embaixo, o **seu deck**, com "Trocar";
- **Jogar contra Diana** (o botão diz quem) começa; "← Voltar" (ou Esc) volta ao menu. Na primeira visita, o deck
  "Primeira mesa" abre por cima, e fechá-lo volta para a escolha.

Ajustes não repete modo nem
rival: ficou com meta, ritmo do rival, som e imagem. O cartão do fim tem **Jogar de novo** inteiro em cima e, em
baixo, Menu e Ver a Mesa; Compartilhar é o ícone ao lado do título. Fora da partida, o cabeçalho tem só logo,
moedas (a Loja) e **Menu**: Online, Regras, Deck e Ajustes moram no menu principal. Começar pelo menu depois de uma partida online larga a sala (ali, "jogar
de novo" seria revanche).

**Texto inteiro, sempre.** Nenhum texto de botão, etiqueta ou cartão é cortado com "…" nem encosta na borda, de
320 px ao PC; o `tools/layout.js` reprova as duas coisas ("cortado com …", "texto sem respiro"). Onde falta largura,
o texto quebra de linha (o miúdo dos botões da decisão, a linha do último lance sobre a Mesa, que no celular tem duas
linhas reservadas) ou a peça encolhe o que não é texto (em 320 px, o Bolso perde a palavra e fica a caixa do dado).

**Margens de segurança (entalhe e barrinha).** Janelas, menu principal e a barra da partida ficam inteiros entre o
entalhe de cima e a barrinha de baixo do aparelho. O CSS lê essas margens por variáveis (`--seg-topo`, `--seg-baixo`,
em `:root`) e não por `env()` espalhado; a janela soma a margem uma vez só (antes a caixa ganhava margem embaixo
além da altura máxima e o topo dela saía da tela no iPhone). O `tools/layout.js` roda também num iPhone simulado
(entalhe 59 px, barrinha 34 px) e reprova caixa que passa do topo seguro ou entra na barrinha.

**Cartas no celular.** Os nomes compridos (Sobrecarga, Fundo Falso, Interferência) aparecem inteiros: sem o ícone e
em 12 px; o raio das cartas de pontos virou um selo no canto, que não rouba a largura do nome.

**Partida offline guardada.** A partida contra o rival fica guardada no aparelho a cada jogada (desde o
primeiro dado; acabar ou começar outra apaga). Fora da partida não há relógio: fechar a aba e voltar dias depois
mostra, no menu, o placar com **Continuar** e **Abandonar**. Enquanto ela existe, o menu não oferece começar outra.
Abandonar pede um segundo toque e diz o preço antes: contra o rival conta como derrota ("seu rating vai de 1000
para 977"). Online o relógio é o da sala (tempo por vez escolhido ao criá-la, em
`docs/servidor.md`): quem cai tem o tempo de voltar e, se não volta, perde.

**Partida** (modo e rival se escolhem no menu principal):
- ritmo do rival (calmo, normal, rápido).

**Cartas e progresso:**
- liberar todas as cartas;
- apagar recordes.

## 9. Próximos passos

- **Testar com 5 a 8 pessoas.** O resumo copiável do fim de partida já traz o deck, as cartas que agiram,
  as rupturas e o uso do Bolso.
- **Medir no teste** se a Interferência ainda pesa demais com gente e se Espelho, Rerrolar e Virar são fracos
  de verdade ou só no robô.
- **Medir a estreia com gente (v0.14):** quantos terminam a primeira partida e quantos começam a segunda; se as
  chamadas do guia (4,2 s, no alto da Mesa) são lidas ou atrapalham a vez da Diana; e se a Paciência aparece de vez em
  quando (rara demais, ninguém a vê; comum demais, perde o valor).
- **Medir o "?" com gente:** se o rival passa a disparar de 3 para fugir da Interferência quando ela pode estar armada.
