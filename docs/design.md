# Dice Duel: design

> Versão 0.7 (a progressão, as moedas e a loja estão em `docs/progressao.md`). Os números saem do simulador em `sim/` (robôs jogando milhares de partidas).
> Robôs não blefam nem leem o rival: os números dizem a direção, não as casas decimais.

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
| Pressa | efeito | pega 2 dados nesta vez | 58,1% |
| Coringa | efeito | o próximo dado entra com qualquer frente | 56,3% |
| Sobrecarga ⚡ | efeito | +2 no próximo disparo de 4+ | — |
| Espelho | armadilha | marca à vista num dado; quem o pega recebe o dado virado e não pode guardá-lo | 53,7% (marca à vista) |
| Fundo Falso | armadilha | o próximo dado que o rival guardar no Bolso cai (na troca, caem os dois) | 54,5% (deck à mostra) |
| Âncora | armadilha | evita a próxima ruptura de uma corrente sua com 4+ | 58,9% |
| Interferência ⚡ | armadilha | o próximo disparo do rival com 4+ vale −1 | 59,0% |
| Pedágio ⚡ | armadilha | no próximo disparo do rival, você ganha +3 | — |

\* deck de 1 carta contra deck vazio; 50% = carta neutra (`sim/valor_cartas.py`).

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
| O seu deck de 3 cartas | **sim**, desde o começo (tela de "versus") |
| Que há uma armadilha armada | **sim** ("?") |
| Qual armadilha está armada | **não** (só aparece quando dispara) |
| O dado marcado pelo Espelho | **sim** |
| Efeitos usados | sim, na hora |

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

- **Primeira visita:** o deck "Primeira mesa" (só efeitos) e o rival Biscoito (o mais fácil).
- **Armadilhas:** chegam depois da primeira partida (ou em Ajustes → "Todas as cartas liberadas").
  O Biscoito também só usa efeitos até lá.
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

**Perder também é aconchegante.** A ruptura é um "plonc" descendente com poeirinha caindo devagar, nunca um
estrondo. A derrota diz "Quase!" e mostra os bons momentos da partida.

**Os rivais:**
- **Biscoito**, um gatinho que joga por diversão;
- **Dona Coruja**, que joga com calma e lê a Mesa.

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
| Falas do rival | "blá-blá" fofinho |

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
- rival (Biscoito ou Dona Coruja);
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
- **Avaliar um "?" que vira dedução:** limitar quais armadilhas cada arquétipo pode ter (modelo das classes do
  Hearthstone).
