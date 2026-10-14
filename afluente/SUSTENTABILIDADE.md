# O ano no vale: estações, seca e sustentabilidade (v0.6)

Pedido: trabalhar a ideia de sustentabilidade com as estações do ano avançando, criar dificuldade no "inverno" para quem avança muito, ver se vale a pena e se faz sentido com as mecânicas.

Resumo: **vale a pena**, na forma descrita abaixo. A seca do Cerrado fica no lugar do inverno. A estação muda pelo tempo (a cada 4 peças), não pelos pontos. A dificuldade cresce porque as casas comem mais a cada ano. Tudo isso dá função a campo, vila e bosque, que antes serviam só para encaixar. A seção 8 traz as ressalvas.

---

## 1. O que existia e o que faltava

- **Estações da v0.5**: metas de pontos que davam +3 peças. Eram só recompensa: o vale não mudava, e não havia nada a temer.
- **Missões**: o único objetivo de médio prazo.
- **Biomas**: campo, vila e bosque não tinham função própria. Eram cores para combinar.
- **Faltavam duas coisas**:
  - um motivo para olhar o vale como um todo, em equilíbrio entre os biomas;
  - uma pressão que cresce à medida que a partida avança.

## 2. Referências

- **Dorfromantik**: não há pressão além da pilha. O "só mais uma" vem das missões. Isso é bom para relaxar e é o núcleo que mantemos.
- **Islanders**: metas de pontos que liberam peças. Já usamos isso na v0.5.
- **Banished, Frostpunk, Stardew Valley**: o ciclo de estações com um inverno cria ritmo. Há um tempo de crescer e um tempo de guardar. O inverno é previsível, então o jogador se prepara para ele. Não é um castigo surpresa.
- **O Cerrado de verdade**:
  - Tem duas estações bem marcadas: as águas (mais ou menos de outubro a abril) e a seca (de maio a setembro).
  - A mata ciliar (mata de galeria) segura a margem e a água dos córregos. Sem ela, o córrego seca na estiagem.
  - O "inverno" do Cerrado é seco, não frio. Isso cabe no tema sem inventar neve.

## 3. Tentativas descartadas (simulação)

| Tentativa | Problema |
|---|---|
| Ciclo do ano preso às estações por pontos (v0.5) | O ano andava devagar demais. A maioria das partidas acabava antes da primeira seca, e a mecânica quase não aparecia. |
| Ciclo por tempo, sem a fome crescer | Quem cuidava bem do vale disparava: o bot guloso chegou a 18 anos e 300 peças. A pilha não acabava e a partida perdia a forma. |
| Ciclo de 6 jogadas por estação | O ano inteiro durava 24 jogadas, e a partida média via só 1 ano. O ciclo de 5 também não separava o jogo cuidadoso do guloso. |
| Mata ciliar "qualquer bosque na peça ou na vizinha" | Era fácil demais: quase todo rio ficava protegido por acaso, e a seca não mordia. |

## 4. Regras da v0.6

O tempo passa: **a cada 4 peças colocadas a estação muda**. Um ano tem 16 jogadas:

| Estação | O que acontece |
|---|---|
| **Águas** | Começo do ano. Nada a resolver: é tempo de crescer. |
| **Cheia** | Aviso: "depois da Colheita vem a seca". A Cachoeira entra na pilha. Na primeira vez aparece uma explicação curta. |
| **Colheita** | Ao entrar nela, cada peça com campo e água viva por perto (na peça ou numa vizinha) guarda **1 de comida** no celeiro e vale **+1 ponto**. Cada 2 de comida dão **+1 peça**. A Ponte entra na pilha. Durante a Colheita, os trechos de rio que vão secar ficam **marcados em laranja**, e o ponto onde o rio corta leva a etiqueta "sem mata". |
| **Seca** | O rio só corre por peças com **mata ciliar**. Trecho sem mata seca, e **tudo rio abaixo seca junto**. A luz do vale fica quente e as peças longe da água desbotam. A Lagoa entra na pilha. |
| **Ano novo** (volta das Águas) | Cada **casa** (peça com vila) que teve água por perto durante a seca e comida no celeiro rende **+3 pontos e +1 peça**. Casa com fome custa **−1 peça**. **As chuvas voltam: +2 peças**. O celeiro zera e o rio volta a correr. |

Detalhes das regras:

- **Mata ciliar**: a peça de rio tem um lado de bosque, ou a peça vizinha tem um lado de bosque virado para ela. É a mesma regra do encaixe, então proteger o rio e encaixar bem andam juntos.
- **A fome cresce**: no ano 1 cada casa come 1, no ano 2 come 1,5, no ano 3 come 2, e assim por diante. Esta é a dificuldade do "inverno" para quem avança muito.
- **A água que volta depois da seca não pontua de novo**. Os +2 da água viva valem só na primeira vez que a peça recebe água, para a seca não virar fonte de pontos.
- **A fome nunca acaba a partida sozinha**: se a pilha zerar só por causa da fome, fica 1 peça.

### Interface

- **Barra do ano**: quatro trechos coloridos (Águas, Cheia, Colheita, Seca), a marca de onde se está e a próxima estação com as jogadas que faltam ("Seca em 3 jogadas").
- **Painel de equilíbrio**, com três indicadores tocáveis:
  - **Rio na seca X/Y**: quantos trechos continuam correndo na seca. Na seca vira "Rio correndo".
  - **Colheita N**: a previsão de comida. Depois da colheita vira "Celeiro N".
  - **Casas F/H**: quantas casas vão comer no ano novo, como previsão.
  - Tocar num indicador explica a regra e destaca no vale as peças envolvidas: trechos que vão secar, campos com água ou casas sem água na seca.
  - Com uma peça escolhida, o painel mostra o antes e o depois (por exemplo, "Rio na seca 2→3/4").
- **Faixas e sons**: Colheita, Seca e Ano novo têm faixa, som e efeito no vale (brilho dourado nos campos, poeira nos trechos que secam, chuva e o rio voltando a correr).
- **Relatório final**: mostra o ano alcançado, as colheitas, o ano novo (pontos e saldo de peças), as casas com fome e os trechos secos. A dica do fim vem da partida, por exemplo sobre a mata ciliar ou os campos perto do rio.
- **Recorde**: passa a ser por pontos e foi zerado, porque as regras mudaram. O par do vale é calculado com as regras novas.

## 5. Como encaixa nas mecânicas que já existem

- **Encaixe de lados** continua sendo o centro. A regra nova nunca pede uma peça "errada": um rio com bosque dos lados, encostado num bosque, encaixa e protege ao mesmo tempo.
- **Água viva** ganha uma segunda camada. Antes bastava ligar o rio; agora é preciso ligar e proteger, e a ordem importa: um trecho sem mata perto da nascente corta o rio inteiro na seca.
- **Campo e vila** ganham função: campo produz comida, vila consome. Bosque protege. Fica um triângulo simples: rio, campo e vila, com o bosque segurando o rio.
- **Missões** não mudaram e continuam sendo a maior fonte de peças.
- **Peças especiais** entram conforme o ano anda (Cheia, Colheita, Seca) e aparecem mais cedo que na v0.5.
- **Pilha** continua sendo a vida da partida. A colheita e o ano novo dão ou tiram peças, então cuidar do vale faz a pilha durar mais anos.

## 6. Números (simulação, 60 vales por linha)

Bots usados:

- **aleatório**: joga sem critério.
- **guloso**: pega o maior ganho imediato e ignora o ano. É ele que define o par.
- **cuidadoso**: guloso que também pesa o rio protegido, a comida prevista e as casas com água.

Valores na forma média (mín–máx). Simulador: `sim/ano_no_vale_teste.js`.

| Regra v0.6 | Anos | Pontos | Peças | Comida | Casas alimentadas | Casas com fome | Trechos secos |
|---|---|---|---|---|---|---|---|
| aleatório | 1,3 | 15 | 22 | 2 | 0,7 | 3 | 0 |
| guloso | 2,6 (1–6) | 212 (47–648) | 43 (19–99) | 13 | 4,5 | 12 | 11,9 |
| cuidadoso | 2,8 (1–9) | 216 (25–1117) | 46 (18–145) | 19 | 8,2 | 13 | 3,8 |

Variações testadas:

| Variação | Guloso | Cuidadoso | Leitura |
|---|---|---|---|
| Mata "qualquer bosque perto" | 287 pts, 4,6 secos | 323 pts, 1,3 secos | A seca quase não morde |
| Sem a chuva de +2 peças | 178 pts, 2,2 anos | 169 pts, 2,3 anos | Partidas curtas, o ano novo pesa demais |
| Sem a fome crescer | 312 pts, até 18,75 anos | 788 pts, 5,7 anos (até 300 peças) | Disparada: partidas sem fim |
| Estação de 6 jogadas | 203 pts, 1,7 ano | 164 pts, 1,6 ano | Vê só 1 ano |

Em 20 vales, o bot cuidadoso fez 204 pontos contra 164 do guloso, e 45 peças contra 38. Em 60 vales a diferença de pontos cai para perto de zero, porque a variação entre vales é grande. O que se mantém em qualquer amostra:

- quem cuida do rio seca **3× menos** trechos;
- colhe **45% mais**;
- alimenta **quase o dobro** de casas.

Como sobrevive mais anos, o bot cuidadoso também acumula mais casas, e a fome crescente alcança. É isso que se quer: a dificuldade do "inverno" pega quem avança muito.

## 7. Partida típica

- **Quem joga sem prestar atenção** vê pelo menos um ano inteiro: chega ao ano 2 com cerca de 20 peças.
- **Quem joga bem** passa por 2 a 3 anos novos. Cada ano novo é um momento de tensão, com previsão visível desde a Colheita.
- **No ano 3 ou 4** a fome de 2 por casa aperta, e a partida tende a acabar ali, a menos que o vale tenha muito campo com água.

## 8. Veredito e ressalvas

**Por que vale a pena**

1. **Dá ritmo.** O ano é um relógio visível: crescer nas águas, preparar na Colheita, aguentar a seca.
2. **Dá a dificuldade pedida, e ela cresce com o avanço.** O primeiro ano é gentil e os seguintes apertam.
3. **Dá função a campo, vila e bosque.** Cada peça passa a ter dois valores: o encaixe agora e o papel no ano.
4. **Tem tema forte e verdadeiro**: seca do Cerrado, mata ciliar e colheita. Não é um sistema colado de fora.
5. **É legível.** Tudo é previsto antes de acontecer: a laranja da seca, o painel e a prévia da peça. Nada pune de surpresa.

**Ressalvas**

1. **Os bots não provam a diversão.** O bot cuidadoso é míope e mesmo assim muda muito o que acontece no vale, mas a pontuação final varia demais entre vales. Precisa de teste com pessoas.
2. **Carga mental**: há três indicadores novos. Para não pesar no começo, a explicação só aparece na primeira Cheia, os avisos aparecem só quando importam (a laranja só na Colheita) e o painel fica numa linha.
3. **A fome tira peças.** Quem ignora o ano perde peças no ano novo. Foi limitado (nunca acaba a partida sozinha e as chuvas sempre devolvem +2), mas pode frustrar. Se frustrar, a primeira alavanca é a fome tirar 1 peça a cada 2 casas.

## 9. Alavancas para o teste

| Alavanca | Valor atual | Para mais fácil | Para mais difícil |
|---|---|---|---|
| Jogadas por estação | 4 | 5 | — |
| Mata ciliar | lado de bosque na peça ou virado para ela | qualquer bosque perto | só bosque na própria peça |
| Comida por peça ganha | 2 | 1 | 3 |
| Fome | −1 peça por casa | −1 a cada 2 | — |
| Chuvas no ano novo | +2 peças | +3 | 0 |
| Fome crescendo por ano | +0,5 | +0,25 | +1 |

Todas estão no topo do motor (`CFG`), e o simulador aceita trocá-las sem mexer no código.

## 10. Para o teste com pessoas

Perguntas para observar:

- Entendeu por que o rio secou?
- Viu a laranja antes da seca?
- Tocou nos indicadores do painel?
- Achou o ano novo justo?
- Jogou diferente no segundo ano?
- A seca deixou o jogo mais interessante ou só mais punitivo?
