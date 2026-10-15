# Afluente — Por que ainda não diverte, e o que fazer (proposta v4)

**O retorno:** "ainda não tô achando divertido". É a terceira vez, depois da v2.4 (a água no centro), da v3.0 (a economia do vale) e da v3.1 (a aldeia e a despensa).

**Resposta curta:**

- **O que não deu certo:** cada versão acrescentou uma camada sensata no papel e calibrada com bots. Os bots medem equilíbrio, não diversão. O jogo chegou a cerca de 20 regras, e cada uma paga pouco.
- **Proposta:** voltar a um núcleo de 5 regras em que a diversão vem de três coisas:
  - **querer** (a vila pede algo que você entende);
  - **escolher** (o que chega na pilha);
  - **ver** (a vila cresce na sua frente).
- **Como validar:** um protótipo jogável, testado por você e por mais duas ou três pessoas. Não mais calibração por bot.

---

## 1. O que os números mostram, jogada a jogada

`sim/revisao/momento.js`, 10 vales, jogando como o bot cuidadoso e olhando todas as opções a cada jogada:

| Medida | Valor | O que se sente |
|---|---|---|
| Casas vazias onde a peça cabe | mediana **26** (120 opções contando o giro) | muita coisa para olhar |
| A melhor casa contra a segunda melhor | empatam (1 ponto ou menos) em **77%** das jogadas | tanto faz onde pôr |
| A melhor opção contra a opção do meio | 2 pontos ou menos em **43%** das jogadas | a escolha quase não muda nada |
| Girar a peça muda o ganho | em **14%** das casas | girar é trabalho, não decisão |
| Jogadas quietas (3 pontos ou menos, nada acontece) | **44%** | metade da partida é enchimento |
| Ganho da jogada | mediana 4 (p90 28, nas colheitas) | conta que pinga |

Isso confirma as quatro respostas do questionário da v3.0 ("colocar peça não é gostoso", "as jogadas não parecem importar", "coisa demais", "monótono e longo"). As versões seguintes não resolveram nenhuma delas: puseram mais coisas em cima.

## 2. Dois testes que mostraram onde não está o problema

| Teste | Regra | Resultado |
|---|---|---|
| `nucleo_v4.js` | o valor se concentra nas vilas, que sobem de nível quando têm lavoura irrigada e mata em volta | **pior**: 82% de jogadas quietas, porque a maioria das peças não encosta numa vila |
| `uma_coisa.js` | "uma peça, uma coisa": cada peça é lavoura, pasto, mata, casa ou trecho de rio, com bônus de vizinhança, como no Islanders | **igual**: a melhor casa empata com a segunda em 89% das jogadas |

**A lição:** em jogo de pôr peças, a melhor casa quase nunca é muito melhor que a segunda. Mexer na fórmula dos pontos não muda isso, e foi o que fizemos nas últimas três versões. Os jogos do gênero que divertem não tiram a graça daí.

## 3. De onde vem a graça nos jogos que funcionam

| Jogo | O que faz querer a próxima peça |
|---|---|
| **Dorfromantik** | Missões com número exato ("esta mata com 15 peças"). Cada peça que sai é um "isso!" ou um "ah, não". A pilha é a vida, e a missão cumprida dá peças |
| **Islanders** | A barra de pontos enche e você **escolhe** entre dois pacotes. Você planeja o que vai chegar, e prédios novos aparecem ao longo da partida |
| **Cascadia** | Metas de padrão que você escolhe perseguir, e o que pegar entre poucas opções |
| **Townscaper** | Nenhuma meta, mas cada toque faz algo bonito e inesperado acontecer |

Em comum:

1. uma **intenção** que é sua;
2. a **expectativa** sobre o que vem;
3. um **retorno grande e visível** quando dá certo;
4. **novidade** ao longo da partida;
5. **poucas regras**.

O Afluente de hoje tem muitas regras, missões sorteadas com prazo (a intenção é do jogo, não sua), retorno em contas (despensa, produção, colheita), a mesma pilha do começo ao fim e uma tela cheia de avisos.

## 4. As causas, em ordem de peso

1. **Regras demais, cada uma pagando pouco.** São cerca de 20:
   - encaixe, água só encosta em água, rio vivo, mata ciliar, seca, irrigação pela borda e produção por terreno;
   - colheita, quatro tipos de missão com prazo, veredas e afluentes, peça perfeita e especiais por estação;
   - alcance da aldeia, despensa, comida que estraga, friagem, chave da mata, toco, ano farto e peças do ano.

   Ninguém segura isso na cabeça. Vira ruído, não estratégia.
2. **A intenção não é da pessoa.** As missões aparecem sorteadas, com prazo. A aldeia "quer" comida e lenha, mas isso é um número numa ficha, não um pedido no vale.
3. **O retorno chega atrasado e em conta.** O que a jogada fez de bom aparece na seca, como número na despensa.
4. **Nada de novo ao longo da partida.** As mesmas peças do começo ao fim.
5. **Interrupções.** Cartões de primeira vez cobrem o vale nas primeiras jogadas.

## 5. Proposta: "o vale que pede" (núcleo v4)

### As 5 regras

1. **Encaixar.** Lado que combina vale +1. Água só encosta em água. Fica como está: é o prazer de mão, o "clique" da peça.
2. **A água dá vida.** O que o rio vivo toca fica verde. Fica como está, e é o que se vê.
3. **Cada vila pede uma coisa de cada vez**, numa plaquinha sobre ela, em palavras simples:
   - "🌾 duas lavouras com água encostadas";
   - "🌳 uma mata encostada";
   - "💧 o rio passando por aqui";
   - "🏠 crescer até 4 casas".

   Cumpriu: **a vila cresce na sua frente** (casa → sobrado → venda → capela) e **você escolhe o que chega** entre dois pacotes de peças. Por exemplo, "Roça: 3 lavouras + 1 rio" ou "Mata: 3 bosques + 1 pasto". Depois vem o próximo pedido. Sem prazo: a pilha é o relógio.
4. **A seca é a prova do ano.** O rio sem mata seca, como hoje. Na chegada da seca, cada vila mostra ✓ ou ✗: se ainda tem água e comida em volta, ganha uma peça. É a despensa em uma linha, sem conta.
5. **A pilha é a vida.** Acabou, acabou.

### Como fica uma jogada

> Sai uma **lavoura**. A vila do norte pede "duas lavouras com água encostadas" e já tem uma. Há três casas vazias encostadas nela, mas só uma recebe o rio. Você põe lá, a placa vira ✓, as casas viram sobrado e aparecem dois pacotes. Você escolhe "Mata", porque a seca vem em 3 jogadas e o trecho do rio perto da vila está sem mata.

Isso tem as três coisas que faltam hoje:

- **querer:** "preciso de uma lavoura";
- **escolher:** o pacote, de olho na seca;
- **ver:** a vila cresce.

### O que o seu pedido da v3.1 vira

Recursos, época difícil, sustentabilidade e progresso continuam, mas como **pedido visível** em vez de **conta**:

| Pediu | Hoje (v3.1) | No núcleo v4 |
|---|---|---|
| comida, lenha | dois estoques na despensa | a vila pede lavoura com água e mata encostada |
| época difícil | despensa, friagem, ano farto | a seca prova o ano: cada vila ✓ ou ✗ |
| sustentabilidade | chave da mata e toco | a mata segura o rio na seca. **"Cortar a mata"** pode voltar depois como pedido de vila grande ("lenha para a festa"), uma escolha com cara de escolha |
| progresso e orgulho | — | a vila cresce em níveis, e os pacotes trazem peças novas: moinho, curral, ponte, cais, capela |
| aldeia trabalhando sozinha | regra escondida | a vila se ajeita sozinha com o que você põe em volta |

### O que sai

- **As missões sorteadas com prazo:** viram os pedidos das vilas.
- **Despensa, comida que estraga, friagem, chave da mata, toco, ano farto e peças do ano:** viram "a seca prova o ano".
- **Produção por terreno e colheita em pontos:** o verde continua sendo o que importa, mas pelo que a vila pede.
- **Cheia e peças por trecho de rio na seca.**
- **Veredas e afluentes:** viram um pedido ("ligar a vereda").

**Ficam:**

- o visual 3D;
- o clima e o céu;
- o Caderno e os bichos;
- o vale do dia e os marcos;
- o desfazer;
- deixar a peça passar;
- uma peça seguinte visível.

### Um ponto para você decidir

**Os pacotes mostram o que vai chegar, mas não a ordem.** Você pediu uma só peça seguinte visível, e isso continua. O pacote é uma escolha de vez em quando (a cada pedido cumprido), não uma fila na tela. Se preferir, o pacote pode entrar embaralhado na pilha, sem revelar nada além de "vêm 3 lavouras".

## 6. Como vamos saber se ficou divertido

- **Um protótipo jogável do núcleo**, como um modo novo no mesmo HTML ("Vale novo, teste"), com o 3D. Assim dá para comparar com o de hoje no mesmo dia.
- **Você e mais duas ou três pessoas** jogam 15 minutos cada. Observar:

| Sinal bom | Sinal ruim |
|---|---|
| A pessoa fala sozinha: "preciso de uma lavoura!" | Põe a peça em qualquer lugar |
| Olha a peça seguinte antes de pôr a atual | Pergunta "o que isso faz?" mais de uma vez |
| Hesita na escolha do pacote | Escolhe o pacote sem ler |
| Quer jogar de novo | Termina e fecha |

- **Os bots servem só para a duração da partida**, não para decidir o que é divertido.

## 7. Passos

| # | Passo | Tamanho |
|---|---|---|
| 1 | Protótipo do núcleo v4 como modo à parte: pedidos das vilas, pacotes e seca ✓/✗, com o motor e o 3D de hoje | médio |
| 2 | Teste com você e mais 2–3 pessoas, com a tabela acima | curto |
| 3 | Se passar: cortar as regras que saem, refazer as lições (uma por regra) e aposentar a despensa | médio |
| 4 | Peças novas nos pacotes (moinho, curral, ponte, cais) e as vilas crescendo no 3D | médio |

Os scripts desta análise estão em `sim/revisao/`: `momento.js`, `nucleo_v4.js` e `uma_coisa.js`.
