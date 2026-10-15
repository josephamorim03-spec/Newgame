# Sistema de interface do Afluente (v2.3)

**O pedido:** acabar com sobreposições, fontes pequenas e rótulos disputando espaço, e saber o que é prioridade na tela.

A resposta tem três partes: regras escritas (este documento), tokens no CSS e dois auditores automáticos que medem a tela. Uma mudança visual só está pronta quando os auditores passam.

## 1. Hierarquia: o que importa mais

Há duas camadas por cima do vale: os **elementos da interface** (HTML) e os **rótulos do vale** (desenhados no canvas).

A regra é uma só: **quanto mais a informação muda a jogada que a pessoa vai fazer agora, mais alta a prioridade**. Quem é mais baixo cede o lugar.

| Nível | Nome no código (`PRI`) | O que é | Exemplos | Sem espaço |
|---|---|---|---|---|
| 7 | `guia` | o que fazer agora | "toque aqui" | fica sempre |
| 6 | `jogada` | o resultado da peça na mão | "+5 · +1 peça" acima da peça escolhida | fica sempre |
| 5 | `previa` | o efeito da peça numa missão | "3→4/5 ✓", "prazo acaba" | fica sempre |
| 4 | `aviso` | regra prestes a pesar | "sem mata" antes da seca; bandeira da missão durante a lição | procura lugar ao lado |
| 3 | `alerta` | missão quase completa ou com prazo curto | "4/5 · 2⏳" | procura lugar ao lado |
| 2 | `info` | missão em andamento | "2/6 · 9⏳" | some (continua nas fichas do topo) |
| 1 | `ambiente` | orientação geral | "nascente" | some |

**Clima e efeitos são decoração** e nunca cobrem o nível 4 para cima:

- a chuva, o véu da tempestade, a neblina e o clarão do raio são desenhados **antes** dos rótulos;
- os tufos de nuvem ficam quase transparentes enquanto há uma peça escolhida.

**Na interface (HTML)** valem as mesmas ideias:

- **cartão de dica (coach):** esconde os botões dos cantos enquanto está aberto, porque é a coisa mais importante na tela;
- **faixa de aviso** ("As chuvas voltaram!"): passa por cima de tudo por 1,5 s e conta como obstáculo para os rótulos do vale;
- **cartão da lição e fichas de missão do topo:** cobrem o vale, e por isso o enquadramento da câmera desconta a altura deles (`overlayTop`). O vale aparece inteiro na área livre.

## 2. Rótulos do vale (`layoutLabels`)

1. São coletados durante o desenho (`label(x, y, texto, {pri})`) e dispostos no fim do quadro, do mais importante para o menos importante.
2. Cada rótulo tenta a posição dele e, se estiver ocupada, posições vizinhas (acima, abaixo, de lado).
3. **Obstáculos:** nenhum rótulo é posto embaixo de:
   - fichas de missão, cartão da lição, faixa de aviso, cartão de dica;
   - botões dos cantos, boletim do Contemplar;
   - a peça escolhida, com as marcas dos lados;
   - os números que sobem depois de uma jogada.
   A lista é lida da própria página a cada 250 ms (`uiObstacles`).
4. **Obrigatórios** (nível 5 para cima): sem lugar livre, ficam na melhor posição possível em vez de sumir.
5. **Tamanho:** 12 a 13 px, discretos (fundo um pouco transparente). Não crescem com o zoom nem ficam ilegíveis de longe.
6. **Presos ao terreno (v2.3):** o rótulo anda com o vale. Se o terreno sai da tela, o rótulo sai junto; ele nunca gruda na borda da tela. Antes, preso à borda, ele parecia seguir a tela quando se arrastava o mapa. Também só procura lugar logo ao lado do terreno: até uma linha para cima, e os alertas até duas linhas e um pouco para os lados.
6. O resultado de cada quadro fica em `G.lbl`, para o auditor.

## 2.1 Textos na partida (v2.3)

Durante a partida, a linha de dica só aparece quando há algo a fazer agora:
- a peça não cabe em casa nenhuma: deixar passar;
- a seca chega em até 4 jogadas e há rio em risco.

As explicações (onde tocar, como girar, o que combina) ficam nas lições e na primeira partida de quem ainda não fez o tutorial. Sem dica, a linha some e o espaço volta para o vale. O botão principal diz a ação ("Colocar", "Deixar passar"), e não explica.

## 3. Tipografia: uma escala só

Antes havia 22 tamanhos soltos, de 10 a 60 px. Agora os tamanhos são tokens no `:root`:

| Token | Tamanho | Uso |
|---|---|---|
| `--t-micro` | 11 px | só legenda curta em MAIÚSCULAS ("PEÇAS", "DEPOIS", "COMUM") |
| `--t-xs` | 12,5 px | menor texto corrido: fichas, notas, cartões do caderno |
| `--t-sm` | 13,5 px | textos de apoio, explicações curtas |
| `--t-md` | 15 px | texto do corpo, dicas, botões comuns |
| `--t-lg` | 17 px | nome da peça, títulos de lista |
| `--t-xl` | 19 px | botão principal, título de estação |
| `--t-2xl` | 22 px | números de estatística |
| `--t-3xl` | 28 px | título "Afluente", títulos de folha |
| `--t-hero` / `--t-big` | 46 / 60 px | tela inicial e pontuação final |

**Regras:**

- nada abaixo de 11 px;
- 11 px só em maiúsculas;
- título e botão principal usam `clamp()` e **nunca quebram linha nem vazam**;
- quando falta espaço, some primeiro a parte dispensável do texto (classe `.lg`: "Missão:", "para a seca") e só depois as reticências.

## 4. Toque

- **Área mínima de toque: 44 px** (`--alvo`). Em botões desenhados menores (fichas de missão, indicador do rio, botões dos cantos, "Pular lições"), a área cresce com um `::after` invisível e o desenho não muda.
- **Botões do canto:** ficam nos cantos do vale e somem quando o cartão de dica aparece.

## 5. Telas

- **Em pé (360 a 430 px de largura):** coluna única. Título e botão principal se ajustam à largura.
- **Deitado (altura até 560 px):** o vale fica à esquerda e o painel à direita (placar, estação, dica, peça, botões). Nada fica abaixo da dobra.
- **Tablet e computador:** coluna de até 520 px no centro.

## 6. Os auditores (rodar antes de publicar)

### `sim/interface_teste.js`: a tela

```sh
node sim/interface_teste.js [pasta_de_capturas] [telas] [situações]
```

Percorre 7 tamanhos de tela (360×640, 375×667, 390×844, 412×915, 844×390 deitado, 768×1024, 1280×800) e 11 situações:

- início, meio da partida, peça escolhida;
- aviso de seca, faixa de aviso, missões;
- lição, resultado, caderno, menu, Contemplar.

Em cada uma, mede:

| Medida | Erro | Aviso |
|---|---|---|
| FONTE | menor que 11 px | menor que 12 px fora das maiúsculas |
| CORTE | texto cortado sem reticências | com reticências |
| VAZA | texto maior que a caixa, por cima do vizinho | — |
| QUEBRA | botão principal em duas linhas | outro botão em duas linhas |
| SOBREPOSIÇÃO | dois componentes da interface se cobrindo | — |
| FORA | componente fora da tela | — |
| TOQUE | área de toque menor que 36 px | menor que 44 px |
| RÓTULO | rótulo do vale embaixo da interface, ou de nível 3 para cima sumido | rótulo de nível 1 ou 2 escondido |
| JS | qualquer erro de JavaScript | — |

Sai com código 1 se houver erro e, com a pasta, salva uma captura de cada tela.

**Estado depois do teste no celular (v2.3, rótulos presos ao terreno):** 77 telas, 0 erros e 33 avisos aceitos:

- 32 rótulos de nível 1 e 2 escondidos: presos ao terreno, discretos e sem grudar na borda, os de pouca prioridade cedem o lugar mais vezes. A informação continua nas fichas do topo;
- "Contemplar o vale" em 2 linhas no menu da tela de 360 px.

**Estado na v2.4:** 77 telas, 0 erros e 12 avisos aceitos:

- dez rótulos de nível 1 escondidos: "vereda" e "nascente" nas primeiras jogadas, quando o vale aberto com as veredas divide a tela com as fichas e os botões dos cantos;
- uma bandeira de nível 2 escondida no celular de 360 px, durante a faixa de aviso;
- "Contemplar o vale" em 2 linhas no menu da tela de 360 px.

Na v2.4, o rótulo de alerta (nível 3) para cima também procura lugar mais longe, até 6 linhas abaixo e uma largura para o lado, antes de sumir. E o cartão de dica de uma partida não passa para a próxima.

**Estado na v2.3:** 77 telas, 0 erros e 4 avisos aceitos:

- "Contemplar o vale" em 2 linhas no menu da tela de 360 px;
- três bandeiras de nível 2 escondidas em celulares pequenos. A informação continua nas fichas do topo.

**Antes deste sistema:** 492 erros e 441 avisos.

### `sim/coerencia_teste.js`: o mundo e as regras

```sh
node sim/coerencia_teste.js [vales]
```

Joga partidas inteiras com o tempo correndo e confere, quadro a quadro, que o que se vê não contradiz as regras (detalhes em `CLIMA.md`, seção 8). Também confere que gado, ovelhas e fauna só ficam onde o mapa de colisão deixa.

## 7. Revisão visual

O que os auditores não pegam (espaçamento estranho num texto, cor errada, um efeito feio) se vê nas capturas. Com a pasta de capturas do `interface_teste.js`, olhe ao menos estas telas: celular pequeno, deitado e computador, nas situações "meio", "escolhida" e "lição".
