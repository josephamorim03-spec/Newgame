# Dice Duel: modo história, "O Caderno da Diana"

> Roteiro e plano do modo história (proposta, v0.15). Nada daqui está no jogo ainda; o que falta para virar jogo está
> no §9. **Toda piada passa pela aprovação do dono antes de entrar no jogo** (§11): cada fala tem um código
> (`docs/historia_piadas.json`) e só as aprovadas vão para o código. O tom segue o `docs/design.md` §6: aconchegante, adulto, frases curtas. A arte segue o `docs/visual-impresso.md`
> (sotaque de gibi impresso: retícula, desencaixe azul e rosa, quadro congelado). As marcas da Diana valem em todo
> quadro (`docs/design.md` §6): ponta da orelha direita dela preta, a esquerda branca, cinza leve acima dos olhos, dois
> riscos escuros na testa e **o ferimento vermelho no dorso do nariz**.

## 1. Em uma frase

Uma gata com um ferimento no nariz que não fecha te ensina a jogar dados. Depois ela te manda recuperar sete páginas
do "caderno de receitas" dela, uma com cada bicho da floresta. No fim você descobre que nunca foi um caderno de
receitas: a receita é ela. E você foi treinado para reescrever uma letra errada no DNA da Diana.

## 2. O segredo (para quem escreve, não para quem joga)

- **A ferida:** um corte na quina de um dado, anos atrás. O corte é o de menos: o que impede de fechar é **uma letra
  errada no DNA dela**, "um Passo onde devia haver um Eco".
- **O plano:** a Diana tentou corrigir sozinha, mas com aquelas patas fica difícil. Então ela precisava de alguém que montasse
  correntes melhor que ela, e treinou essa pessoa.
- **As páginas:** o "caderno de receitas" é o caderno de pesquisa dela, com o protocolo disfarçado de receitas. Quem
  levou as páginas foi o Guaxinim, que vendeu uma para cada bicho. **A Diana deixou a janela aberta de propósito:**
  cada página virou um rival, e cada rival uma lição. A "busca das páginas" foi o treino.
- **A cura:** a correção tem que ser escrita contra a fita original. A fita original é ela. Por isso o último duelo é
  contra a Diana, na Mesa dela, e ela não pode facilitar ("se eu facilitar, a cura sai com defeito").
- **O preço:** em aberto (§7, Final): o dono não gostou de um final "melhor" preso a uma estrela. As opções estão lá.

Tudo isso é plantado desde o começo, para quem jogar de novo achar (§8): o curativo que piora a cada capítulo, o
mural que cresce no fundo dos quadros dela, as frases soltas sobre DNA e as frases dos rivais que sabem de alguma coisa.

## 3. Tom e regras da comédia

A Diana é a graça da história. Ela é seca, segura de si e um pouco manipuladora. Tem uma teoria da conspiração com a
letra D e é gata: derruba coisas da mesa e chama isso de método. Nunca ri da própria piada.

1. **A piada sai da mecânica.** Cada fala engraçada usa uma regra do jogo (Eco, Passo, Oposto, Bolso, ruptura, uma
   carta) ou um fato de genética que encaixa nela (§4). Piada que serviria em qualquer jogo não entra.
2. **O soco vem no fim.** A palavra que faz rir é a última do balão. Quando a piada tem pausa, ela ganha um quadro
   próprio, sem texto ou com "…".
3. **Um balão, uma ideia, até ~90 caracteres** (cabe em 360 px sem rolar, `tools/layout.js`). Cenas de 2 a 4 quadros
   antes da partida e de 1 a 3 depois.
4. **Regra de três e retorno.** As gags voltam com uma variação a cada capítulo (§8). O retorno é mais engraçado que a
   piada nova.
5. **Nada infantil** (como já manda o `design.md` §6): sem "fofinho", sem meme da internet, sem grito. Cada bicho tem
   um trocadilho no máximo (a Ovelha gasta o dela com "Bééém jogado").
6. **A ciência é verdadeira.** O exagero é da Diana, não dos fatos. A lista do §4 foi conferida.
7. **Ninguém é vilão.** "Eliminar" um rival é vencer, carimbar o retrato dele no mural e levar a página. Até o
   Guaxinim tem razão no que diz.

## 4. A bíblia: o jogo já é genética

O Dice Duel encaixa na genética quase sozinho. É daqui que saem as piadas:

| No jogo | Na genética | A piada que está pronta |
|---|---|---|
| **Corrente** | a fita de DNA | duas correntes disputando a mesma Mesa: a dupla hélice |
| **Oposto** (somam 7) | pares complementares: A com T, C com G | "O dado sabia disso antes da biologia." |
| **Eco** (o mesmo número) | gêmeos idênticos: o mesmo código | "Mesmo DNA, opiniões diferentes. Um deles sempre é o chato." |
| **Passo** (±1) | mutação pontual | "A maioria passa despercebida. A minha, não." |
| **Corrente de 3** (a menor que dispara) | o códon: três letras, a menor palavra que a célula lê | "Três elos. Um códon." |
| **Ruptura** | mutação, quebra da fita | "Na natureza chamam de mutação. Aqui, de 'arrisquei demais'." |
| **Bolso** | a segunda fita, a cópia de segurança | "A vida guarda duas fitas pelo mesmo motivo." |
| **Remendo** | reparo de DNA | — |
| **Reverso** | transcriptase reversa (a fita lida ao contrário) | Sapo: "Já fui girino. Não volto nem com transcriptase." |
| **Sobrecarga** | superexpressão de um gene | Coelho: "Aqui em casa, mais nunca é demais. É só… mais." |
| **Fundo Falso** | camuflagem, mimetismo | Raposa: "No inverno eu fico branca. É genética. O cachecol é escolha." |
| **Pausa** | dormência, hibernação (o gene não some, fica quieto) | Urso: "O segredo é não acordar." |
| **Furto** | transferência horizontal de genes (bactérias pegam genes umas das outras) | Guaxinim: "Ninguém prende bactéria." |
| **Espelho** | cópia, clonagem | Ovelha: "Não sou a Dolly." |
| **Lacre** | silenciamento (metilação: o gene está escrito, mas não é lido) | Coruja: "Nem tudo que está escrito precisa ser dito." |
| **Interferência** | RNA de interferência (existe, com esse nome) | Diana: "Até o nome da carta é científico. Coincidência? Não." |
| **Seis faces, quatro letras** | o DNA tem 4 bases; o dado tem 6 faces | "Sobram duas. Ninguém sabe pra quê. Igual ao seu Bolso." |

**A tradução da cura (§7, Final):** 1 = A, 6 = T, 2 = C, 5 = G. Os pares que somam 7 são os pares complementares. O 3 e
o 4 também somam 7, "mas a biologia não chamou eles. Acontece".

## 5. Elenco

Todos já têm retrato pintado no jogo (`arte/retratos.json`); a voz de cada um vem da roupa que a arte já deu.

| Quem | Como é (da arte) | A voz | No capítulo |
|---|---|---|---|
| **Diana** | gata branca, olhos azuis, ferimento no nariz | seca, conspiratória, gata | mentora, depois a rival final |
| **Sapo** | chapéu de palha, gravatinha ferrugem | cavalheiro lento do lago; oferece chá de lago | 1 · Reverso |
| **Coelho** | cinza-claro, gravata-borboleta azul-marinho | contador ansioso, sempre atrasado, família enorme | 2 · Sobrecarga |
| **Raposa** | olhos semicerrados, cachecol verde | satisfeita, elegante; diz a verdade de um jeito que parece mentira | 3 · Fundo Falso |
| **Urso** | gorro vermelho de pompom | sonolento; tudo é "cinco minutos" | 4 · Pausa |
| **Guaxinim** | máscara, moletom mostarda | ladrão com teoria econômica | 5 · Furto |
| **Ovelha** | num pasto de hexágonos | cansada da mesma pergunta | 6 · Espelho |
| **Dona Coruja** | a rival "desafiadora" do jogo | bibliotecária; lê a Mesa e lê gente | 7 · Lacre |

Os especiais da casa (Biscoito, Gordinho, Cafú, Bandoleiro, Galgo) não entram na história (decisão do dono). A gag de
fundo de quem acha que o caderno é de receitas de verdade ficou com o **Coelho**: ele testou a página dele, o pão
cresceu, e desde então ele quer o caderno inteiro.

## 6. Estrutura

**O mapa:** uma trilha desenhada no estilo do mural (cortiça, barbante vermelho) com 9 paradas: Prólogo, 7 bichos e a
Mesa da Diana. Cada parada mostra o retrato, as estrelas e a página. O rival vencido ganha um carimbo no retrato
("LIDO", no caso da Coruja).

**Cada capítulo tem:**
- **Interlúdio da Diana** (2 a 3 quadros): ela manda você ao próximo bicho. O curativo e o mural mudam a cada vez (§8).
- **Chegada** (2 a 4 quadros): o rival, a piada dele, o desafio.
- **A partida:** contra o rival, com o deck e a regra da casa dele. As falas dele substituem as falas comuns (as
  chaves de `RIVAIS[].falas`: início, carta, seu disparo grande, a ruptura dele, venceu, perdeu).
- **Depois** (1 a 3 quadros): a página, que é uma "receita" com um desenho de gibi e uma nota da Diana na margem. Na
  derrota, só uma fala do rival e "Revanche".
- **A recompensa:** a página e, nos capítulos em que faz sentido, uma carta (§6.1). Nos outros, moedas.
- **Três estrelas:** vencer; um objetivo do tema do capítulo; um objetivo de jogar bem. As estrelas não travam a
  história. Elas dão cosméticos (12 e 24 estrelas) e um final alternativo (§7, Cap. 8).

### 6.1 As cartas que a história libera

A história libera uma carta só quando **a página daquele capítulo é a própria técnica da carta**, e ela é uma das
quatro que a cura usa no fim: ler a fita ao contrário, esconder, transferir e copiar. Todas continuam à venda na Loja
para quem não joga a história, pelo preço de hoje.

| Cap. | A página ensina | Libera |
|---|---|---|
| 1 · Sapo | ler a fita pela outra ponta | **Reverso** |
| 2 · Coelho | fermento no máximo | moedas (a Sobrecarga é dose, não técnica) |
| 3 · Raposa | a massa esconde o recheio | **Fundo Falso** |
| 4 · Urso | deixar dormir | moedas (a Pausa é descanso, não técnica) |
| 5 · Guaxinim | pegar do vizinho | **Furto** |
| 6 · Ovelha | fazer dois iguais | **Espelho** |
| 7 · Coruja | tampar o que não deve ferver | moedas e a página que falta (o Lacre segue na Loja) |
| 8 · Diana | — | os cosméticos do fim (§9) |

Quem já comprou a carta recebe as moedas dela de volta, para não ganhar repetido.

**As regras da casa** usam o que o motor já aceita (meta, deck do rival, quem abre, Bolso inicial, ritmo do rival)
ou um ajuste no robô. Todas passam pelo simulador antes (`sim/`), como qualquer carta (§9).

| Cap. | Rival | Meta | Deck do rival | Regra da casa | Estrelas (além de vencer) |
|---|---|---|---|---|---|
| P | Diana | 8 | — | a estreia de hoje, sem cartas | — (é o tutorial) |
| 1 | Sapo | 12 | Remendo, Ajuste, Reverso | nenhuma armadilha | dispare uma corrente de 4 · dispare logo depois de um Reverso |
| 2 | Coelho | 16 | Pressa, Sobrecarga, Ajuste | o Coelho joga no ritmo rápido | dispare em duas Mesas seguidas · nenhuma ruptura |
| 3 | Raposa | 16 | Fundo Falso, Âncora, Virar | as armadilhas aparecem (a Diana explica o "?" antes) | não perca dado para o Fundo Falso · vença por 4+ |
| 4 | Urso | 16 | Pausa, Âncora, Interferência | o Urso só dispara com 5 ou mais | Paciência (segure e dispare 2 a mais) · corrente de 5 |
| 5 | Guaxinim | 16 | Furto, Pedágio, Fundo Falso | ele começa com o Bolso cheio; você, vazio | termine com o Bolso cheio · um Bloqueio |
| 6 | Ovelha | 16 | Espelho, Rerrolar, Âncora | a mesa de hexágonos (só visual) | uma Esquiva · uma Harmonia |
| 7 | Dona Coruja | 16 | o deck dela de hoje + Lacre | nenhuma: ela já é o teste | um Bloqueio · vença sem ruptura |
| 8 | Diana | 16 | Interferência, Espelho, Pressa | a Mesa dela, feltro vinho | **Fita complementar:** dispare uma corrente de 4+ só de Opostos · vença |

## 7. O roteiro

Convenções: **Q1, Q2…** são os quadros. *Itálico* descreve o desenho; "…" sozinho é um quadro de pausa. CAIXA é a
narração (pouca). Na partida, as falas aparecem no balão do retrato, como hoje.

### Prólogo: "Boa noite. Uma partida?"

*É a estreia que já existe (meta 8, sem cartas), com quadros e o guia na voz da Diana.*

**Antes**
- **Q1.** *A cena da tela inicial: a Diana atrás da mesinha de feltro. No nariz, um curativo com estampa de pips de dado.*
  DIANA: "Boa noite. Você joga dados?"
- **Q2.** *A pata dela empurra um dado devagar até a beirada da mesa.*
  DIANA: "Não importa. Eu ensino. Sou ótima professora e péssima em deixar coisas em cima da mesa."
- **Q3.** *O dado cai para fora do quadro. Ela não olha.*
  DIANA: "Não pergunte do nariz."

**O guia, na voz dela** (no lugar das chamadas de `GUIA_TXT`, só no modo história):

| Quando | A Diana diz |
|---|---|
| primeiro Eco | "Eco. O mesmo número. Gêmeos idênticos: mesmo código, opiniões diferentes." |
| primeiro Passo | "Passo. Um a mais ou um a menos. Uma mutação pequena. A maioria passa despercebida." *(toca no nariz)* "A minha, não." |
| primeiro Oposto | *em revisão (G-03a ou G-03b):* "…Os opostos se completam. Diz o dado." ou "…Cada número tem o seu par. Quase romântico." |
| primeira corrente de 3 | "Três elos. Um códon: a menor frase que a vida sabe ler. Já dá para disparar." |
| primeira ruptura | "Rompeu. Na natureza chamam isso de mutação. Aqui chamamos de 'arrisquei demais'." |
| primeiro uso do Bolso | "O Bolso guarda um dado. A vida guarda duas fitas pelo mesmo motivo." |

**Depois (vitória ou derrota)**
- **Q1.** *A Diana olhando o placar, a orelha preta caída.*
  DIANA: "Você aprende rápido."
- **Q2.** *Ela abre um caderno: "RECEITAS DA DIANA". Sobram tocos de páginas arrancadas.*
  DIANA: "Ótimo. Preciso de um favor. Alguém levou sete páginas do meu caderno de receitas."
- **Q3.** *Close no rosto dela.*
  DIANA: "Sete. Como a soma dos opostos. Não é coincidência. Quase nada é."

### Capítulo 1: O Sapo, "Lagoa das Vitórias-Régias" (Reverso)

**Interlúdio**
- **Q1.** *Dois curativos cruzados em X no nariz.* DIANA: "Dobrei a dose."
- **Q2.** DIANA: "O Sapo está com a página um. Ele é educado. Vai te oferecer chá."
- **Q3.** DIANA: "Não aceite. É água do lago."

**Chegada**
- **Q1.** *O Sapo numa vitória-régia, tirando o chapéu de palha.* SAPO: "Boa noite. Aceita um chá?"
- **Q2.** *Uma xícara turva, com um girino dentro.* SAPO: "É do lago, sim. Orgânico."
- **Q3.** SAPO: "A página se chama 'Sopa de Girino ao Contrário'. Achei de mau gosto. Já fui girino."
- **Q4.** SAPO: "Ganhe e ela é sua. Perca, e você toma o chá."

**Na partida:** início: "Calma. Aqui o tempo anda devagar." · Reverso: "Reverso: a fita volta pela outra ponta. Já fui
girino. Não volto nem com transcriptase." · seu disparo grande: "Que salto." · ruptura dele: "Escorreguei na
vitória-régia." · venceu: "Chá?" · perdeu: "Justo. A página é sua. O chá também, se quiser."

**Depois**
- **Q1.** *A página um.* Em revisão: **C1-13a** "SOPA DE GIRINO AO CONTRÁRIO · Ingredientes: A, T, C e G. Nessa ordem. Ou na
  outra." ou **C1-13b** *o título escrito espelhado; na margem:* "Ler no espelho. Ou com o Reverso."
- **Q2.** SAPO: "Sabe por que ela quer isso? Dizem que a salamandra regenera uma perna inteira."
- **Q3.** SAPO: "Eu não. Sou sapo. Todo mundo confunde."

### Interlúdio: "Coisa de receita"

- **Q1.** *A Diana lendo a página um. No fundo, pela primeira vez, um mural de cortiça com uma foto de dado e um
  barbante vermelho.* DIANA: "Uma a menos."
- **Q2.** *Ela olha para o nada.* DIANA: "O que é o DNA, se não um conjunto de dados?"
- **Q3.** *Ela percebe você olhando o mural e cobre a cortiça com a pata.* DIANA: "…Coisa de receita. Próximo: o Coelho."

### Capítulo 2: O Coelho, "Toca Número 12" (Sobrecarga)

**Interlúdio**
- **Q1.** *Curativo e, por cima, um adesivo: "NÃO PERGUNTE".* DIANA: "O Coelho tem a página dois. Ele joga rápido."
- **Q2.** DIANA: "Ele faz tudo rápido. A família dele que o diga: são quarenta e três."

**Chegada**
- **Q1.** *O Coelho com uma planilha, cercado de silhuetas de coelhinhos.* COELHO: "Desculpe, estou atrasado. Para tudo.
  Sempre."
- **Q2.** COELHO: "A página? 'Pão que Cresce Sozinho'. Testei. Cresceu. Tivemos que mudar de toca."
- **Q3.** COELHO: "Jogo rápido, tá? Tenho reunião de família. É uma reunião grande."

**Na partida:** início: "Valendo. Vai. Vai. Vai." · Sobrecarga: "Mais dois. Aqui em casa mais nunca é demais. É só…
mais." · seu disparo grande: "Isso conta como multiplicação?" · ruptura dele: "Contei errado. De novo. Eram quarenta e
quatro." · venceu: "Ganhei! Preciso ir. Atrasado." · perdeu: "Toma a página. Corre que ainda dá tempo de… alguma coisa."

**Depois**
- **Q1.** *A página dois.* Em revisão: **C2-12a** "PÃO QUE CRESCE SOZINHO · Ingredientes: G, G, G e G. Fermento: sim." ou
  **C2-12b** *uma mancha de farinha em forma de pata de coelho; na margem:* "Não deixar o Coelho ler."
- **Q2.** COELHO: "Ela é sua amiga? Avisa que o curativo está torto."
- **Q3.** Em revisão: **C2-14a** COELHO: "Ela tem outras receitas? Pergunto por um amigo. Quarenta e três amigos." ou
  **C2-14b** sem esta fala.

### Capítulo 3: A Raposa, "Toca de Inverno" (Fundo Falso)

**Interlúdio** *(as armadilhas aparecem aqui)*
- **Q1.** *Um mini cachecol verde enrolado no nariz.* DIANA: "Inspiração."
- **Q2.** DIANA: "A Raposa tem a página três. Ela vai mentir para você."
- **Q3.** DIANA: "Não. Pior. Ela vai dizer a verdade de um jeito que parece mentira."
- **Q4.** *A Diana vira uma carta para baixo: o "?".* DIANA: "E ela usa armadilhas. Eu também. Achei que era hora de
  contar."

**Chegada**
- **Q1.** *A Raposa num sofá de toca, olhos semicerrados, satisfeita.* Em revisão (sem gênero): **C3-04a** "Ah. Você deve ser o
  projeto da gata." ou **C3-04b** "Ah. Quem a gata anda treinando."
- **Q2.** RAPOSA: "No inverno eu fico branca, sabia? É genética. O cachecol é escolha."
- **Q3.** RAPOSA: "A página é 'Torta de Fundo Falso'. Adorei. Quase não devolvo." **Q4.** "…" **Q5.** "Quase."

**Na partida:** início: "Fique à vontade. Nada aqui é o que parece. Inclusive eu." · armou: "Armei alguma coisa. Ou
não. É uma raposa falando." · Fundo Falso pegou: "O fundo era falso. A raposa, verdadeira." · seu disparo grande:
"Hm. Você não é fácil de enganar." · ruptura dela: "Que deselegante. Para mim." · venceu: "Volte quando quiser perder
com estilo." · perdeu: "Leve. E cuidado com a gata: ela é mais raposa do que eu."

**Depois**
- **Q1.** *A página três.* Em revisão: **C3-14a** "TORTA DE FUNDO FALSO · Recheio: segredo. Até para quem come." ou **C3-14b**
  *uma aba de papel colada; levantada:* "Achou que ia ter receita aqui?"

### Capítulo 4: O Urso, "Caverna do Gorro" (Pausa)

**Interlúdio**
- **Q1.** *A Diana com um cone de veterinário no pescoço.* DIANA: "É um acessório."
- **Q2.** "…" **Q3.** DIANA: "Está na moda. Em clínica veterinária."
- **Q4.** *O mural no fundo, agora com três fotos e um bilhete: "DISPARO. DUELO. DOBRO. → D".* DIANA: "O Urso tem a
  página quatro. Está hibernando. Não acorde ele." **Q5.** "Quer dizer: acorde. Com educação."

**Chegada**
- **Q1.** *Caverna escura. Um volume enorme com um gorro vermelho. O ronco desenhado: "zZz", com pips no lugar dos pingos.*
- **Q2.** *Um olho abre.* URSO: "…É primavera?"
- **Q3.** Em revisão: **C4-04a** URSO: "Não? Então estou sonhando. Joga rápido, antes que eu acorde." ou **C4-04b** "Não?
  Então me acorda em março."
- **Q4.** CAIXA: "Ursos hibernam meses e acordam sem perder músculo. A ciência quer muito esse segredo." URSO: "O segredo
  é não acordar."

**Na partida:** início: "(bocejo) Vai você primeiro. Vai você sempre." · Pausa: "Pausa. Não é preguiça. É estratégia de
inverno." · seu disparo grande: "Hm. Isso foi… acordado." · ruptura dele: "Cochilei no meio." · venceu: "Pronto. Posso
voltar a dormir?" · perdeu: "Leva a página. Fecha a porta. Apaga a luz."

**Depois**
- **Q1.** *A página quatro.* Em revisão: **C4-12a** "MEL EM BANHO-MARIA · Tempo de preparo: um inverno." ou **C4-12b** *o pote
  de olhos fechados; na margem:* "Não acordar o mel."
- **Q2.** *O Urso dormindo de novo, com a página na pata. Você a puxa devagar.*
- **Q3.** URSO *(dormindo)*: "…a gata… o nariz… ela pediu pra não contar…" **Q4.** *(ronco)*

### Capítulo 5: O Guaxinim, "Ferro-Velho do Moletom" (Furto)

**Interlúdio**
- **Q1.** *Uma meia enrolada no nariz.* DIANA: "O cone sumiu."
- **Q2.** DIANA: "Suspeito de alguém de máscara."
- **Q3.** DIANA: "Por coincidência, o Guaxinim tem a página cinco. Por coincidência, ele usa máscara. Eu não acredito em
  coincidência."

**Chegada**
- **Q1.** *O Guaxinim num monte de tralha, usando o cone da Diana como abajur.* GUAXINIM: "Isso? Achei."
- **Q2.** GUAXINIM: "Não roubei. Fiz uma transferência horizontal."
- **Q3.** GUAXINIM: "Bactéria faz isso o tempo todo: pega o gene do vizinho e pronto. Ninguém prende bactéria."
- **Q4.** GUAXINIM: "As páginas? Fui eu, sim. Todas. Depois vendi uma para cada bicho." **Q5.** "Modelo de assinatura."

**Na partida:** início: "Bonito seu Bolso. Seria uma pena se…" · Furto: "Troca justa. Para mim." · Pedágio: "Taxa de
serviço." · seu disparo grande: "Ei. Isso era meu. Quer dizer. Ia ser." · ruptura dele: "Lixo. Literalmente." ·
venceu: "Volte sempre. Traga coisas." · perdeu: "Tá. Leva a página. E o cone." **(beat)** "…Fica com o cone? Não? Tá."

**Depois**
- **Q1.** *A página cinco.* Em revisão: **C5-14a** "SALADA DE SOBRAS DOS OUTROS · Ingredientes: os do vizinho." ou **C5-14b**
  *uma etiqueta de preço por cima do título:* "Página 5 · 4,99 por mês".
- **Q2.** GUAXINIM: "Pergunta pra gata quem deixou a janela aberta."

### Capítulo 6: A Ovelha, "Pasto Hexagonal" (Espelho)

**Interlúdio**
- **Q1.** *Um tufo branco e fofo no nariz.* DIANA: "Algodão."
- **Q2.** "…" **Q3.** DIANA: "É lã. Da Ovelha. Ela ainda não sabe."
- **Q4.** DIANA: "Página seis. Ela é simpática. Não fale de clonagem."

**Chegada**
- **Q1.** *A Ovelha num pasto de hexágonos, com uma falha na lã do ombro.* OVELHA: "Não sou a Dolly."
- **Q2.** OVELHA: "Não sou parente da Dolly. Não lembro dela. Sim, todo mundo pergunta."
- **Q3.** OVELHA: "Quer trocar? Dou duas pedras por um dado." **Q4.** "…" **Q5.** "Ninguém nunca quer a ovelha. Eu sei."

**Na partida:** início: "Rola. Vê se sai sete." · Espelho: "Espelho: uma cópia de você, ao contrário. É o mais perto
de clone que eu chego." · seu disparo grande: "Bééém jogado." · ruptura dela: "Desmanchou. Igual tricô." · venceu:
"Leva um pouco de lã de lembrança. Parece que alguém já levou." · perdeu: "Toma a página. E diz pra gata devolver a
minha lã."

**Depois**
- **Q1.** *A página seis.* Em revisão: **C6-12a** "PUDIM GÊMEO · Rende: duas porções idênticas. A segunda não lembra da
  primeira." ou **C6-12b** *duas páginas idênticas grampeadas; na margem:* "Uma delas é a cópia. Não pergunte qual."

### Interlúdio: "Cansei de disfarçar"

- **Q1.** *A Diana sem nada no nariz. O ferimento à mostra, sem enfeite. Primeiro quadro sério da história.* DIANA:
  "Cansei de disfarçar."
- **Q2.** *O mural agora coberto por um lençol, com o barbante vermelho saindo por baixo.* DIANA: "Não é nada. É um lençol."
- **Q3.** DIANA: "Última página. Dona Coruja. Ela sabe ler." **Q4.** "Ler a Mesa. Ler gente. Ler… coisas que eu não contei."

### Capítulo 7: Dona Coruja, "A Biblioteca" (Lacre)

**Chegada**
- **Q1.** *Uma biblioteca de estantes altas. Lombadas: "Volume A", "Volume T", "Volume C", "Volume G".* CORUJA: "Boa
  noite. Sente-se. A Diana mandou você."
- **Q2.** CORUJA: "Mandou você em todo mundo antes de mim. Esperta. Mandou você treinar."
- **Q3.** CORUJA: "Ela vai te dizer que 'Dona Coruja' também começa com D. Diga a ela que 'Dona' é pronome de tratamento."
- *(o Coelho numa mesa de leitura, ofegante, com uma pilha de livros de receitas e um pão que não cabe na mesa)*

**Na partida:** início: "Sem pressa. Quem escreve precisa saber ler." · Lacre: "Lacre. Nem tudo que está escrito
precisa ser dito." · seu disparo grande: "Jogada precisa. Você leu." · ruptura dela: "Hum. Escrevi uma letra errada.
Acontece com os melhores." · venceu: "Ainda não. Volte quando ler mais rápido." · perdeu: "Agora sim. Sente-se.
Precisamos falar da gata." *(sem gênero; em revisão)*

**Depois** *(a virada começa)*
- **Q1.** *A Coruja entrega a última página: só o desenho de um nariz de gato com um X.* Em revisão: **C7-10a** CORUJA: "A
  última. Não tem ingrediente nenhum." ou **C7-10b** quadro mudo.
- **Q2.** CORUJA: "Uma letra errada, no meio de quase três bilhões. Um Passo onde devia haver um Eco. Por isso não fecha."
- **Q3.** CORUJA: "Ela não te ensinou a jogar por gentileza. Pergunte a ela." *(sem o "querida"; em revisão)*

### A revelação: "O mural"

- **Q1.** *A Diana puxa o lençol. O mural inteiro: barbante vermelho para todo lado, a foto de cada bicho com um carimbo,
  a sua foto no meio e uma dupla hélice desenhada com dados no lugar dos degraus.* DIANA: "Você acha que é coincidência
  tudo começar com D?"
- **Q2.** *Três cartões no mural, ligados pelo barbante: DIANA · DADOS · DNA.* DIANA: "Meu nome. Dados. DNA. Está tudo
  conectado."
- **Q3.** *A foto da Dona Coruja, com um post-it: "D?".* DIANA: "Até a Dona Coruja." **Q4.** "Ela diz que 'Dona' é pronome
  de tratamento." **Q5.** "É o que um D diria."
- **Q6.** *A Diana sentada, séria.* DIANA: "Uma letra. Errada. Desde que eu nasci. O corte foi a quina de um dado. O não
  fechar é comigo."
- **Q7.** *A pata dela segurando uma pipeta, torta, pingando.* DIANA: "Eu tentei sozinha. Mas com essas patas fica difícil." *(texto do dono)*
- **Q8.** DIANA: "Então eu ensinei alguém que monta correntes melhor do que eu." **Q9.** "…" **Q10.** "Você."
- **Q11.** *(o jogador escolhe um dos dois botões; o outro aparece em seguida)*
  - [Você me usou.] DIANA: "Usei. Ensinei. Em gatês é a mesma palavra."
  - [E as páginas?] DIANA: "O Guaxinim levou. Eu deixei a janela aberta. Com um bilhete: 'por favor, não leve as
    páginas'." **(beat)** "Guaxinim não lê bilhete. Eu sabia."
- **Q12.** DIANA: "E não: eu não estava brincando com os seus dados na tela inicial." **Q13.** "Estava sequenciando."
- **Q14.** *O Coelho na porta, abraçado a um pão do tamanho dele.* COELHO: "Então… não é um livro de receitas?" DIANA: "É." **Q15.** "A receita sou eu."
- **Q16.** *A Diana na Mesa dela, os dados prontos.* DIANA: "Falta escrever. A correção tem que ser feita contra a fita
  original. A fita original sou eu." **Q17.** "Jogue sério. Se eu facilitar, a cura sai com defeito."

### Capítulo 8: Diana, "Fita Dupla"

**Na partida:** início: "Boa noite. Uma partida?" *(a primeira fala do jogo, palavra por palavra; logo depois, num
balão menor:)* "Dessa vez vale." · primeiro Oposto seu: "Par complementar. A com T. Bonito." · Espelho: "Espelho. Você
vai ter que ler ao contrário. Como eu." · seu disparo grande: "Isso. Escreve assim." · ruptura dela: "Arrisquei demais.
De novo. Está no meu DNA." · venceu: "Ainda não. Revanche?" **(beat)** "Por favor." · perdeu: "Mereceu." *(sem o
"Revanche?" de sempre; vem a cena da cura)*

### Final: "Quase três bilhões e uma"

- **Q1.** *A sua corrente vencedora (a maior da partida) vira uma fita impressa, com as letras embaixo dos dados: 2 5 2
  5 → C G C G.* DIANA *(lendo)*: "Dois, cinco, dois, cinco." **Q2.** "…Parece senha de wi-fi."
  - *Se a corrente tiver 3 ou 4:* DIANA: "O três e o quatro não dizem nada. São tipo 'hmm'. Todo texto tem."
- **Q3.** *A fita encosta no nariz dela. Retícula, desencaixe azul e rosa, quadro congelado (`visual-impresso.md`).*
- **Q4.** *Close: o ferimento fechado. Ela encosta a pata. Quadro mudo.*
- **Q5.** DIANA: "Fechou." **Q6.** "Faz cócegas."
**O fecho: o Eco (decisão do dono).** A letra errada era "um Passo onde devia haver um Eco". A correção pôs um Eco.
Talvez dois. Um final só para todo mundo; a 3.ª estrela do Cap. 8 dá um quadro a mais.
- **Q7.** DIANA: "Fechou. Fechou." **Q8.** *Ela para.* "Por que eu estou falando duas vezes? Vezes?"
- **Q9.** DIANA: "Você pôs um Eco. Eco." **Q10.** "…Passa amanhã. Manhã." **Q11.** "Revanche? Vanche?"
- *Com a 3.ª estrela, um quadro a mais:* DIANA: "Fita complementar perfeita. Eu ensinei bem. Bem."

**Créditos:** *o título "DICE DUEL" na tela.*

**Pós-créditos 1**
- **Q1.** *A Diana com um pincel atômico na frente do título. Ela risca "Dice Duel" e escreve por cima: "DianaDice".*
  DIANA: "DianaDice não seria um nome melhor para esse jogo?" **Q2.** "…" **Q3.** "Seria."

**Pós-créditos 2** *(em revisão: X-02a ou X-02b)*
- **X-02a.** *A Diana, curada, abre a porta. O Sapo de chapéu, com uma xícara turva.* SAPO: "Soube da cura. Trouxe chá."
  DIANA: "É do lago?" SAPO: "Orgânico."
- **X-02b.** Sem o segundo pós-créditos: a história termina no "DianaDice".

## 8. As gags que voltam

Para cada uma valer, ela muda um pouco a cada aparição e paga no fim.

| Gag | P | 1 | 2 | 3 | 4 | 5 | 6 | antes do 7 | Paga em |
|---|---|---|---|---|---|---|---|---|---|
| **O nariz** | curativo de pips | dois em X | "NÃO PERGUNTE" | cachecol da Raposa | cone | meia (o cone sumiu) | lã da Ovelha | nada: "cansei de disfarçar" | Final: fechou |
| **O mural** | — | uma foto e um barbante | (fundo) | (fundo) | "DISPARO. DUELO. DOBRO. → D" | (fundo) | (fundo) | coberto por lençol | Revelação |
| **A letra D** | — | — | — | — | o bilhete no mural | — | — | — | Revelação: "É o que um D diria." · Pós-créditos: "DianaDice" |
| **O pão do Coelho** | — | — | testou a página, "mudar de toca" | *(um pão aparece na janela da Diana)* | *(maior)* | *(maior)* | *(pela porta)* | o Coelho na biblioteca, atrás de receitas | "A receita sou eu." |
| **Quem sabe de algo** | — | — | — | Raposa: "ela é mais raposa do que eu" | Urso dormindo: "ela pediu pra não contar" | Guaxinim: "quem deixou a janela aberta" | — | Coruja: "não foi por gentileza" | Revelação |
| **A pata** | ela derruba um dado | — | — | — | — | — | — | — | "Eu estava sequenciando." |
| **"Revanche?"** | a fala de sempre dela | — | — | — | — | — | — | — | Cap. 8: "…Por favor." · Final: "Revanche?" |
| **O chá do Sapo** | — | "É do lago, sim." | — | — | — | — | — | — | "Chá?" quando ele vence · Pós-créditos 2, se o X-02a passar |

## 9. Como vira jogo

**O que já existe e serve:** a estreia (o Prólogo), o motor com meta e decks livres (`criarPartida`), os robôs
(`automatoEscolhe`/`automatoDispara`), as falas por chave (`RIVAIS[].falas`), os retratos pintados de todos os bichos,
a pata da Diana, a cascata, o impacto e as tarefas do dia.

**O que falta:**
1. **`js/historia.js`:** os capítulos como dados, por exemplo
   `{ id, rival, local, meta, deckRival, regra, estrelas: [...], recompensa: { carta, pagina }, cenas: { antes, depois,
   derrota }, falas }`, com cada quadro como `{ quem, arte, humor, plano, fala, caixa, efeito }`.
2. **O leitor de gibi:** uma janela por cima de tudo que mostra 1 a 4 quadros por vez, com borda de tinta e retícula
   (o CSS do `visual-impresso.md`, Fase 1). Tocar avança, "Pular" leva à partida, e o texto respeita o `layout.js`.
   Os retratos vêm de `Retratos.retrato(id, humor)`.
3. **Arte nova** (pelo `tools/arte_icones.py`, no estilo do jogo):
   - o mural de cortiça, em três estados;
   - os 7 enfeites do nariz;
   - 8 fundos;
   - as 7 páginas-receita;
   - a fita da cura;
   - o título riscado.
   Os bichos que hoje só têm o retrato-ícone precisam de duas expressões (feliz e murcho), como a Diana e a Coruja já têm.
4. **Robôs dos bichos:** o robô de hoje, com o deck do capítulo e um ou dois ajustes de jeito (o Urso só dispara de 5+;
   o Coelho no ritmo rápido; a Raposa arma cedo).
5. **Regras da casa:** Bolso inicial (Guaxinim) e mesa visual (Ovelha, Diana). O resto já é parâmetro.
6. **A cura:** a tradução da maior corrente (1 = A, 6 = T, 2 = C, 5 = G, 3 e 4 = "·"). A 3.ª estrela do Cap. 8 (uma
   corrente de 4+ só com elos Oposto, a Harmonia em Oposto que o motor já detecta) dá no máximo um quadro a mais.
7. **Progresso:** `st.historia = { capitulo, estrelas: {}, paginas: [] }`, guardado no aparelho e, com conta, nos extras
   (como os recordes). A carta liberada pela história, com conta, passa pelo servidor: ele a dá quando recebe o relato
   do capítulo vencido, com as mesmas travas das partidas contra os rivais (`docs/servidor.md`).
8. **Só falas aprovadas:** o `js/historia.js` lê as falas do `docs/historia_piadas.json` (montado no empacotamento) e
   recusa, nos testes, qualquer fala sem `"status": "aprovada"`. Uma fala reprovada some do jogo, e o quadro dela fica
   mudo até ganhar outra.
9. **Menu:** "História" ao lado do "Online", com o retrato da Diana e o capítulo atual. O mapa abre por cima do menu.
10. **Recompensas finais:**
   - o ícone **Diana**;
   - a mesa **Mural**;
   - o dado **Hélice**;
   - nas 12 e nas 24 estrelas, os cosméticos do pasto de hexágonos e da biblioteca.

**Em fases (cada uma jogável e testável):**
1. **Fatia vertical, 3 a 4 dias:** o leitor de gibi, o Prólogo com o guia na voz da Diana e os capítulos 1 e 2. É o
   suficiente para testar o humor com gente.
2. **O miolo, 4 a 6 dias:** capítulos 3 a 6, as regras da casa, as estrelas, o mapa e as páginas.
3. **O fim, 3 a 4 dias:** Coruja, revelação, Cap. 8, a cura com a sua corrente, os dois finais, créditos e pós-créditos.
4. **A arte**, em paralelo, por lotes do `arte_icones.py` (a revisão de cada lote é do dono, como hoje).

**Testes:**
- `tools/historia_e2e.js`: joga o Prólogo e o Cap. 1 pela tela, confere a página, a carta liberada e que "Pular" não
  pula a partida.
- `tools/layout.js`: os balões em 360 px.
- O simulador: as regras da casa ficam entre 40% e 60% para um jogador médio, com o rival um pouco mais difícil a cada
  capítulo.

## 10. Decisões do dono

| Pergunta | Decisão |
|---|---|
| Os especiais da casa entram? | **Não.** O Biscoito também saiu; a gag das receitas ficou com o Coelho. |
| A história libera cartas? | **Algumas, quando faz sentido**, e elas continuam à venda (§6.1: 4 de 7). |
| A orelha trocada? | **Saiu.** O fecho é o **Eco** (§7, Final), um final só para todo mundo. |
| O nome? | **"O Caderno da Diana"**. "Fita Dupla" fica como título do último capítulo. |
| As cartas (§6.1)? | **Aprovadas:** Reverso, Fundo Falso, Furto e Espelho. |
| As piadas? | **Toda piada passa pela aprovação do dono** (§11). |

**Os nomes que estavam na mesa** (escolhido: O Caderno da Diana):

| Nome | O que diz | Contra |
|---|---|---|
| **Fita Dupla** | dupla hélice, as duas correntes na Mesa, a fita do lo-fi | o jogador só entende no meio |
| **O Caderno da Diana** | a busca das páginas; sem spoiler | não promete nada de genética |
| **Sete Receitas** | as sete páginas e o disfarce | vira menos engraçado depois da revelação |
| **Uma Letra Errada** | a ferida e a cura, em três palavras | conta o mistério antes da hora |
| **Tudo Começa com D** | a teoria da Diana vira o título | entrega a piada do mural |
| **Códon** | curto, estranho, científico | frio; não tem a Diana |

A primeira rodada de revisão (140 falas) aprovou 128, pediu 2 ajustes e recusou 11: as sete páginas-receita
(o formato "receita com instruções" não funcionou), duas falas do pão do Coelho, o "cinco minutos" do Urso e o Oposto
do guia. Cada recusada voltou com duas opções (a e b) para a segunda rodada; o dono aprova uma e recusa a outra. Duas
falas aprovadas da Coruja foram reescritas sem gênero ("Está pronta", "querida") e voltaram à revisão.

## 11. Aprovação das piadas

- Toda fala e toda gag tem um código (`P-01`, `C1-04`, `R-07`…) em `docs/historia_piadas.json`.
- O dono revisa na página **Falas da Fita Dupla** (https://claude.ai/artifact/FQDAAEvy5B9VeQEKawmGMT), montada por
  `tools/historia/revisao.py` a partir do JSON, com as falas e três botões: **Aprovar**, **Ajustar** (com nota) e **Recusar**. As decisões
  voltam para o JSON, com a nota.
- Fala nova ou reescrita entra como **pendente** e passa de novo pela revisão. Nada entra no jogo pendente.
- Uma piada recusada pode levar junto o retorno dela (§8): quando isso acontece, a página avisa ("a gag do nariz depende
  desta").
