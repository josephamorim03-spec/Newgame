# Dice Duel: design

> Versão 0.8 (a progressão, as moedas e a loja estão em `docs/progressao.md`). Os números saem do simulador em `sim/` (robôs jogando milhares de partidas).
> Robôs não blefam nem leem o rival: os números dizem a direção, não as casas decimais.
> As regras moram em `shared/regras.js`, o mesmo motor no navegador e no servidor do online (`docs/servidor.md`).
> No online, o "?" (armadilha ou blefe) nunca sai do servidor: cada jogador recebe só a própria visão.

## 1. A ideia em uma frase

Um duelo de dados 1×1, de 4 a 6 minutos. Os dois disputam a mesma Mesa e montam correntes de dados que
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
6. **Vitória:** quem chega primeiro à meta (12 ou 16 pontos).

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
| Ajuste | efeito | ±1 num dado da Mesa | 56,6% |
| Virar | efeito | vira um dado (7 − valor); desfaz uma marca de Espelho | 54,1% |
| Rerrolar | efeito | rola a Mesa toda; desfaz uma marca de Espelho | 55,1% |
| Pressa | efeito | pega 2 dados nesta vez (só com 2+ na Mesa; o 2.º é opcional) | 58,1% |
| Coringa | efeito | o próximo dado que entra numa corrente já começada entra com qualquer frente | 56,3% |
| Sobrecarga ⚡ | efeito | +2 no próximo disparo de 4+ | — |
| Espelho | armadilha | marca à vista num dado; quem o pega recebe o dado virado e não pode guardá-lo | 53,7% (marca à vista) |
| Fundo Falso | armadilha | o próximo dado que o rival guardar no Bolso cai (na troca, caem os dois) | 54,5% (deck à mostra) |
| Âncora | armadilha | protege sua corrente de 4+: o dado que romperia é jogado fora | 58,9% |
| Interferência ⚡ | armadilha | o próximo disparo do rival com 4+ vale −1 | 59,0% |
| Pedágio ⚡ | armadilha | no próximo disparo do rival, você ganha +3 | — |

\* deck de 1 carta contra deck vazio; 50% = carta neutra (`sim/valor_cartas.py`).

### Quando as cartas se cruzam (exceções explícitas)

Cada regra abaixo aparece também no painel de Regras do jogo e é conferida por `tools/regras.js`.

| Situação | O que acontece |
|---|---|
| Armadilhas de lados opostos | Não se anulam: cada uma olha só a sua condição. A Âncora do rival segurar a corrente dele **não** gasta a sua Interferência; ela segue esperando o próximo disparo de 4+ dele. |
| "4 ou mais" | É o tamanho da corrente na hora: no disparo (Interferência, Sobrecarga) ou quando o dado ruim ia entrar (Âncora). Com 3, nada é gasto e a carta continua esperando. |
| Interferência + Sobrecarga | As duas valem: um disparo de 4 vale 2 + 2 − 1 = 3. |
| Pedágio | Pega qualquer disparo, inclusive o de 3 e o automático de 6. Se os dois passarem da meta no mesmo disparo, vence quem disparou. |
| Coringa + Âncora | Com o Coringa ativo nenhum dado rompe, então a Âncora não é gasta. |
| Coringa | É gasto no primeiro dado que entra numa corrente **já começada**, mesmo que esse dado já sincronizasse. Corrente vazia e Bolso não gastam. |
| Pressa | Precisa de 2+ dados na Mesa e não passa para a Mesa seguinte. Não se dispara entre os dois dados; o segundo é opcional ("Dispensar"). Se o primeiro completar 6, a corrente dispara sozinha e o segundo começa outra. |
| Espelho | O dado chega virado (7 − valor) e não pode ir para o Bolso; Coringa e Âncora ainda valem. As etiquetas da Mesa e o aviso de ruptura já usam o valor virado. Virar (no dado marcado) e Rerrolar apagam a marca; Ajuste não. Pegar o próprio dado marcado desperdiça o Espelho. |
| Fundo Falso | Só pega quando o dado vai para o Bolso. Na troca, os dois caem e a corrente não muda. |
| Lugar da armadilha | Uma carta armada por vez, contando o blefe. Armadilha que nunca encontra a sua condição fica armada até o fim. |

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
| Qual carta está virada | **não**: pode ser qualquer carta sua ainda não revelada (armadilha ou blefe) |
| O dado marcado pelo Espelho | **sim** |
| Efeitos usados | sim, na hora |

### O blefe (v0.8)

**O problema que um teste com gente apontou.** Com o deck à mostra, um "?" de quem só tem uma armadilha
(ou só uma que mexe em disparo) era certeza, não dúvida: "tenho corrente de 4, ele tem Interferência e armou
algo, então é a Interferência". Não existia blefe.

**A regra.** Qualquer **efeito** pode ser virado para baixo no lugar da armadilha. Para o rival é um "?" igual:
- virado, ele não faz nada e ocupa o lugar da armadilha (uma carta armada por vez);
- quando você o usa, ele funciona normalmente e o blefe se revela ("Blefe!");
- só é permitido se o seu deck ainda esconde uma armadilha que gera "?" (não o Espelho, que é sempre à vista).
  Sem isso, todos saberiam que é blefe.

**O custo do blefe** é o lugar da armadilha: enquanto o efeito está virado, você não arma a sua armadilha de
verdade. Por isso o "?" volta a ser uma leitura do rival (*yomi*, docs/pesquisa.md §2), não uma conta.

**Como mostrar durante a partida:**
- **Começo (versus):** os dois decks inteiros.
- **Durante:** cada carta aparece como "na mão" até agir. A carta virada **não** é marcada no deck do dono
  visto pelo rival; aparece só o "?" ao lado.
- **Na hora de disparar:** o aviso lista o que o "?" pode ser e o que cada possibilidade faria **neste**
  disparo, e lembra que pode ser blefe com tal e tal efeito.
- **Quando age:** a carta se revela com o nome (armadilha) ou com "Blefe!" (efeito).

**Robôs:** a Dona Coruja blefa às vezes (quando o rival tem corrente de 3+ e ela não armou nada); a Diana não.
O simulador não modela blefe (os robôs dele não leem o rival), então o efeito do blefe sai dos testes com gente:
o resumo copiável agora conta os blefes de cada um.

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

- **Primeira visita:** o deck "Primeira mesa" (só efeitos) e a rival Diana (a mais fácil).
- **Armadilhas:** chegam depois da primeira partida (ou em Ajustes → "Todas as cartas liberadas").
  A Diana também só usa efeitos até lá.
- **Prévia antes de confirmar:** ao escolher o alvo de Virar ou Ajuste, cada dado mostra como ficaria.
  Cancelar devolve a carta.

## 6. Gamefeel: recompensar os bons momentos

| Momento | O que acontece |
|---|---|
| Cada elo da corrente | uma nota de kalimba que **sobe** a cada elo; brilhinhos no dado; "Boa corrente!" no 4.º e "Corrente de 5!" no 5.º |
| Disparo | arpejo que cresce com a corrente; o placar **conta** até o valor novo; brilhos em volta; tremor leve com 5+ |
| Sinfonia (6 dados) | chamada grande, vibração curta |
| Harmonia (todos os elos do mesmo tipo, 4+) | chamada "Harmonia!" (só enfeite, não muda pontos) |
| Bloqueio (levar o único dado que servia ao rival com corrente de 3+) | "Bloqueio!" |
| Salvo (Bolso ou Âncora evitam a ruptura) | "Salvo!" e um acorde de alívio |
| Esquiva (o dono do Espelho teve de pegar o próprio dado) | "Esquiva!" para quem desviou |
| Armadilha que pega | revelação com brilho e o nome da carta |
| Virada (vencer depois de estar 4+ pontos atrás) | "Virada!" no fim |
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

**O tom (v0.9):** aconchegante, mas adulto e bonito. Nada de falas infantis ("que vitória gostosa", "doce como
algodão-doce"). Os textos são curtos e sóbrios, como um bom adversário de mesa falaria: "Boa leitura da Mesa",
"Arrisquei demais", "Partida bem jogada".

**Os rivais:**
- **Diana**, uma gata branca de olhos azuis que joga solto e arrisca;
- **Dona Coruja**, que joga com paciência e lê a Mesa.

A Diana tem marcas fixas, que a arte precisa respeitar: ponta da orelha direita (dela) preta, a esquerda branca,
um cinza leve logo acima dos olhos, dois riscos escuros simétricos e horizontais na testa e um pequeno ferimento
vermelho no dorso do nariz.

Os dois piscam, ficam felizes ou murcham, e soltam falas curtas (dá para desligar). A Dona Coruja leva um
dos 9 melhores decks da simulação.

## 7. Som e música (intenções)

Tudo é sintetizado na hora com Web Audio: nenhum arquivo de áudio. Nada no som deve assustar.

| Som | Intenção |
|---|---|
| Pegar um dado | madeira macia: o toque foi recebido |
| Elo | kalimba subindo a escala pentatônica: a corrente "canta" e cresce |
| Bolso / troca | "pop" macio: guardado em segurança |
| Disparo | arpejo + acorde morno, maior quanto maior a corrente: recompensa |
| Ruptura | duas notas descendo, abafadas: "ah, quase", sem susto |
| Armadilha armada | brilho curto e agudo: há um segredo na mesa |
| Armadilha revelada | "tchã-rã" mágico: surpresa curiosa, não punição |
| Vitória / derrota | fanfarra pequena / três notas descendo com acorde acolhedor |
| Falas do rival | "blá-blá" curto e macio |

**A música** é um lo-fi gerado na hora, a 72 bpm:
- acordes de piano elétrico abafado (Cmaj7 – Am7 – Fmaj7 – G6) e um baixo macio;
- uma kalimba que passeia pela escala e chiado de vinil;
- quando alguém se aproxima da meta, a música "esquenta": mais notas e uma escovinha nos contratempos.

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
- etiquetas de ajuda na Mesa.

**Partida:**
- modo (contra um rival ou 2 jogadores);
- rival (Diana ou Dona Coruja);
- meta (12 ou 16);
- ritmo do rival (calmo, normal, rápido).

**Cartas e progresso:**
- liberar todas as cartas;
- apagar recordes.

## 9. Próximos passos

- **Testar com 5 a 8 pessoas.** O resumo copiável do fim de partida já traz o deck, as cartas que agiram,
  as rupturas e o uso do Bolso.
- **Medir no teste** se a Interferência ainda pesa demais com gente e se Espelho, Rerrolar e Virar são fracos
  de verdade ou só no robô.
- **Medir o blefe com gente:** quantas vezes o "?" era blefe e se o rival passou a disparar de 3 para fugir da
  Interferência.
