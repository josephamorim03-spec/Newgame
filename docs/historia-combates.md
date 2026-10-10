# Os combates do modo história

Este é o plano de como cada bicho joga: as cartas dele, por que são essas, como o robô se comporta, o que a partida
ensina e como se vence. **O dono aprovou e os decks já estão no jogo** (`js/historia.js`). Os números saem do
simulador (`sim/`, explicado no fim).

## Os princípios

1. **O rival usa a carta que você vai ganhar.** Você aprende a carta apanhando dela e sai do capítulo com ela. O Sapo
   joga o Reverso, a Raposa o Fundo Falso, o Guaxinim o Furto e a Ovelha o Espelho.
2. **O deck cresce com você.** O Sapo tem 1 carta, o Coelho e a Raposa têm 2 e, do Urso em diante, todo bicho tem 3,
   como o jogador. Assim, cada partida do começo mostra uma ou duas ideias novas, e não três.
3. **Toda carta do jogo aparece em algum bicho.** Quem termina a história já viu as 15 cartas usadas contra ele.
4. **A dificuldade sobe aos poucos.** Ela vem de três lugares:
   - o deck do bicho;
   - a regra da casa;
   - o robô "esperto" (o mesmo da Dona Coruja de fora da história), ligado do Guaxinim em diante.

   Vencer o primeiro capítulo é fácil, o último é o mais difícil, e nenhum capítulo do meio é um muro.
5. **As cartas combinam com o bicho.** Cada carta tem um motivo na personalidade dele, e as falas aprovadas que citam
   cartas (Pausa, Espelho, Lacre, Fundo Falso) continuam valendo.

## A curva

"Vence" é quanto o jogador ganha no simulador: os dois lados jogam igual de bem, e a média é sobre todos os decks que
o jogador consegue montar naquele ponto da história (as 6 cartas grátis mais as que a história já deu). O esperto e a
pressa do Coelho não entram nesse número; eles deixam a partida mais difícil do que ele diz.

| Cap. | Bicho | Deck de hoje → vence | Deck proposto → vence | Regra da casa | Robô |
|---|---|---|---|---|---|
| 1 | Sapo | Remendo, Ajuste, Reverso → 56% | **Reverso** → **69%** | meta 12; nenhuma armadilha | aprendiz |
| 2 | Coelho | Pressa, Sobrecarga, Ajuste → 47% | **Pressa, Sobrecarga** → **57%** | **meta 12** (era 16); joga rápido | aprendiz |
| 3 | Raposa | Fundo Falso, Âncora, Virar → 48% | **Fundo Falso, Virar** → **53%** | as armadilhas aparecem | aprendiz |
| 4 | Urso | Pausa, Âncora, Interferência → 60% | **Pausa, Âncora, Ajuste** → **54%** | só dispara com 5 ou mais | aprendiz |
| 5 | Guaxinim | Furto, Pedágio, Fundo Falso → 48% | **Furto, Pedágio, Ajuste** → **52%** | começa com um dado no Bolso | esperto |
| 6 | Ovelha | Espelho, Rerrolar, Âncora → 52% | (igual) → 52% | — | esperto |
| 7 | Dona Coruja | Lacre, Ajuste, Interferência → 48% | **Lacre, Remendo, Interferência** → **47%** | nenhuma: ela já é o teste | esperto |
| 8 | Diana | Interferência, Espelho, Pressa → 52% | **Virar, Espelho, Pressa** → **47%** | **começa com um dado no Bolso** (nova) | esperto |

O que muda de hoje:
- **A curva era um serrote.** O Coelho (47%) era mais difícil que a Raposa, o Urso (60%) mais fácil que todo mundo
  desde o Sapo, e a Diana (52%) mais fácil que a Coruja.
- **Na proposta, o número desce do começo ao fim:** 69, 57, 53, 54, 52, 52, 47, 47. Entre o Urso e a Raposa a
  diferença é ruído (±2 pontos). Do Guaxinim em diante, o esperto pesa por cima.

## Bicho a bicho

### Cap. 1 · Sapo: Reverso

- **Por quê:**
  - é o primeiro capítulo com cartas e a página dele ensina a ler a fita pela outra ponta;
  - uma carta só, e é justamente a que você ganha;
  - o Sapo é um cavalheiro: não usa armadilha nem esconde nada.
- **Como joga:** robô aprendiz, meta 12. Ele usa o Reverso quando a ponta de trás da corrente dele aceita mais dados
  que a frente, e a fala dele explica o que aconteceu (C1-08).
- **O que ensina:** que a corrente tem duas pontas, e que a carta do rival aparece na Mesa e dá para entender o que ela
  fez.
- **Como se vence:** o Remendo (+4,5%) e o Virar (+4,2%) são as cartas que mais ajudam. O Ajuste atrapalha (−5,9%):
  com a Mesa de 3 dados ou mais, ele quase não tem uso numa partida curta.
- **Por que tirar o Remendo e o Ajuste dele:**
  - com eles, o Sapo ficava em 56%, difícil demais para quem acabou de ver a primeira carta;
  - o Remendo vai para a Coruja (Cap. 7).

### Cap. 2 · Coelho: Pressa e Sobrecarga, meta 12

- **Por quê:**
  - ele está sempre atrasado: a Pressa pega dois dados numa vez;
  - a página é "fermento no máximo": a Sobrecarga dá +2 num disparo de 4 ou mais;
  - a meta 12 faz da partida uma corridinha, a cara dele.
- **Como joga:** robô aprendiz, ritmo rápido (já existe: `ritmo: 0.55`). Ele gasta a Pressa cedo, sempre que ela leva a
  corrente a 4.
- **O que ensina:** que a Sobrecarga só paga no disparo de 4 ou mais, e por isso dá para negar o 4 a ele (pegar o dado
  que sincroniza com a frente dele).
- **Como se vence:** com a Pressa contra a pressa (+3,3%) e a Âncora (+2,7%). A Interferência (−3,2%) e o Ajuste (−6%)
  atrapalham: ele dispara rápido demais para a Interferência pegar.
- **Por que tirar o Ajuste:** com ele, o Coelho (47%) era mais difícil que a Raposa e o Urso, no capítulo 2.

### Cap. 3 · Raposa: Fundo Falso e Virar

- **Por quê:**
  - é o capítulo que apresenta as armadilhas;
  - o Fundo Falso é a página dela ("a massa esconde o recheio") e a carta que você ganha;
  - o Virar é a trapaça de virar o dado do avesso (o 2 vira 5), a cara de quem chama roubo de mimetismo.
- **Como joga:** robô aprendiz. Ela arma o Fundo Falso cedo, e a Diana explica o "?" antes da partida.
- **O que ensina:** a ler o "?" do rival e a não confiar no Bolso quando ela tem uma armadilha armada.
- **Como se vence:** com o Virar (+2,6%) e o Reverso (+1,6%), que você acabou de ganhar do Sapo.
- **Por que tirar a Âncora:** a Âncora é carta de defesa paciente, mais do Urso do que de uma raposa. Sem ela, a
  Raposa vai de 48% para 53%.

### Cap. 4 · Urso: Pausa, Âncora e Ajuste

- **Por quê:**
  - a Pausa é hibernar (a fala aprovada C4-07: "não é preguiça, é estratégia de inverno");
  - a Âncora segura uma corrente grande inteira, um abraço de urso;
  - o Ajuste é o tiquinho de mel a mais: ele acerta o dado de que precisa.
  - Ele é o primeiro com 3 cartas.
- **Como joga:** robô aprendiz, e só dispara com 5 dados ou mais (regra de hoje).
- **O que ensina:** a correr contra quem é lento. Enquanto ele monta a corrente de 5, você dispara duas de 4.
- **Como se vence:** o Reverso é a carta que mais ajuda (+3,4%), o Virar vem em seguida (+2,1%), e a Âncora atrapalha
  (−2,7%).
- **Por que tirar a Interferência:**
  - a Interferência só age contra quem lidera, e o Urso quase nunca lidera, então ela ficava parada na mão dele;
  - com o Ajuste, o Urso vai de 60% (o mais fácil depois do Sapo) para 54%.

### Cap. 5 · Guaxinim: Furto, Pedágio e Ajuste

- **Por quê:**
  - o Furto troca os Bolsos: é a página dele ("pegar do vizinho") e a carta que você ganha;
  - o Pedágio cobra 2 pontos do seu próximo disparo, coisa de quem vive do que é dos outros;
  - o Ajuste é a pata molhada que "sente melhor" (a fala da 4.ª rodada), com a qual ele acerta o dado.
- **Como joga:** robô esperto. Ele começa com um dado no Bolso e você sem (regra de hoje).
- **O que ensina:**
  - a cuidar do Bolso;
  - a escolher a hora do disparo: com o Pedágio armado, o disparo seguinte paga 2 a ele, então vale disparar um 3
    barato para gastar o Pedágio.
- **Como se vence:** com a Interferência (+4,0%), porque ele lidera cedo graças ao Bolso, e com o Reverso (+2,5%).
- **Por que tirar o Fundo Falso:**
  - ele já era da Raposa, e repetir apaga a cara dos dois;
  - com o Ajuste, o Guaxinim vai de 48% para 52%, já com o esperto ligado.

### Cap. 6 · Ovelha: Espelho, Rerrolar e Âncora (como hoje)

- **Por quê:**
  - o Espelho faz "dois iguais", a página dela e a Dolly (a fala aprovada C6-07: "É o mais perto de clone que eu
    chego");
  - o Rerrolar é rolar os dados a cada rodada, como no jogo de hexágonos que ela não cita;
  - a Âncora é "o maior exército do pasto", que não deixa a corrente dela cair.
- **Como joga:** robô esperto. Ela marca o dado de que você precisa.
- **O que ensina:** que o dado marcado vira a face de baixo (7 menos ele), e às vezes a face de baixo também serve.
- **Como se vence:** o **Virar apaga a marca do Espelho** e é a carta que mais ajuda (+5,3%). O Reverso e o Remendo
  vêm depois. O Furto (−3,9%) e a Interferência (−5,1%) atrapalham.
- **Nada muda:** ela está em 52%, onde o capítulo 6 deve estar.

### Cap. 7 · Dona Coruja: Lacre, Remendo e Interferência

- **Por quê:**
  - o Lacre "tampa o que não deve ferver", a página dela (a fala aprovada C7-05: "Nem tudo que está escrito precisa
    ser dito");
  - o Remendo é o que uma bibliotecária faz com livro velho: remenda a lombada;
  - a Interferência é de quem lê a Mesa e corta quem está na frente.
- **Como joga:** robô esperto, sem regra da casa: ela já é o teste.
- **O que ensina:** a gastar o Lacre dela com uma carta barata antes da carta que importa.
- **Como se vence:** com o Furto (+3,4%), a Pressa (+2,6%) e o Fundo Falso (+1,7%), as cartas que a história já deu.
- **Por que trocar o Ajuste pelo Remendo:**
  - o número fica quase igual (48% → 47%);
  - o Remendo saiu do Sapo e precisava de um bicho;
  - o Ajuste já está no Urso e no Guaxinim.

### Cap. 8 · Diana: Virar, Espelho e Pressa, começando com o Bolso

- **Por quê:** é o deck da fita dupla.
  - O **Virar** e o **Espelho** são as duas cartas que dão a face complementar (7 menos o dado), como a base
    complementar do DNA.
  - A **Pressa** é de quem esperou a vida inteira pela cura.
- **A regra da casa nova:**
  - ela começa com um dado no Bolso, e você sem;
  - é o mesmo dado do Prólogo: sem cartas, quem joga em segundo começa com um dado no Bolso, e quem jogava em
    segundo era ela. Você nem reparou;
  - "Dessa vez vale."
- **Como joga:** robô esperto.
- **O que ensina:** tudo. A estrela da fita complementar (uma corrente de 4 ou mais só de Opostos) fica mais fácil de
  enxergar contra quem joga com faces complementares.
- **Como se vence:**
  - o **Lacre** é a carta que mais ajuda (+3,7%): anula o Virar ou a Pressa dela;
  - o Reverso (+3,0%) e o Virar (+2,1%) vêm depois;
  - como o Lacre não é prêmio da história (§6.1 aprovou só quatro cartas), a Coruja pode dar a dica no fim do Cap. 7,
    numa fala nova que passa pela sua revisão.
- **Por que trocar a Interferência pelo Virar e dar o Bolso:**
  - com o deck de hoje, a Diana (52%) era mais fácil que a Coruja (48%);
  - com o Virar e o Bolso, ela fica em 47%;
  - a fala aprovada do Espelho (C8-03) continua valendo.

## As falas e as estrelas

- Todas as falas ligadas a uma carta continuam com a carta no deck do bicho: C1 Reverso, C2 Sobrecarga, C3 Fundo
  Falso, C4 Pausa, C5 Furto e Pedágio, C6 Espelho, C7 Lacre, C8 Espelho. Nenhuma fala precisa mudar.
- Duas falas novas, com duas opções cada, estão na revisão (C7-15a/b e C8-09a/b). Entra a opção que o dono aprovar:
  - a Coruja dando a dica do Lacre no fim do Cap. 7, entre a C7-11 e a C7-12;
  - a Diana mostrando o dado do Bolso antes da partida do Cap. 8, depois da R-11.
- As estrelas não mudam. A do Sapo ("dispare logo depois de um Reverso") continua fazendo sentido, já que o Reverso é
  a única carta dele.

## O que o simulador não mede

- **O robô do jogo não é o do simulador.** Lá os dois lados jogam "como gente boa" (`sim/humano.py`). Aqui o
  aprendiz erra de propósito e o esperto não. Por isso, do Guaxinim em diante, a partida real é mais difícil que o
  número.
- **O jogador de verdade aprende durante a história.** No Sapo, ele está vendo cartas pela primeira vez.
- **A pressa do Coelho** é pressão de tempo e não entra no número.

O teste com gente (fase 6 do `docs/historia.md`) é o que fecha a curva: quantas revanches cada capítulo pede. A meta é
0 a 1 no Sapo, 1 a 2 no meio e 2 a 3 na Diana.

## Como refazer os números

O script está em `tools/historia/combates_sim.py`:

```
python3 tools/historia/combates_sim.py                # a proposta, 600 partidas por deck do jogador
CAPS='{"C1": {...}}' python3 tools/historia/combates_sim.py 300   # outra proposta
```

Cada linha mostra:
- a média de vitória do jogador;
- o pior e o melhor deck dele;
- as cartas do jogador que mais ajudam e as que mais atrapalham contra aquele bicho.

## Feito

1. Os decks e a regra nova da Diana estão em `js/historia.js`, e a tabela do `docs/historia.md` §6.1 foi atualizada.
2. As duas falas novas estão na revisão.
3. Falta o teste com gente, que fecha a curva.
