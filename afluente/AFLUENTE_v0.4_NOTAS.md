# Afluente v0.4 — o laço do Dorfromantik com água viva

**Status:** protótipo jogável (`prototipo/afluente.html`). Substitui o núcleo da v0.3 após o teste: "não achei divertido".

## Por que a v0.3 não divertia

- Decisões óbvias: plantar encostado na água e cavar rumo à foz quase sempre era o certo.
- Nada surpreendia: a água ia exatamente aonde se pintava; não havia risco nem reação em cadeia.
- Recompensa pequena e atrasada: pontos só a cada 5 jogadas.
- O simulador mediu "regras que não quebram" e diferença entre bots, não diversão.

## O que torna o Dorfromantik divertido (e o que trouxemos)

| Ingrediente | No Afluente v0.4 |
|---|---|
| Cada jogada é um mini-quebra-cabeça graduado: girar e achar o melhor encaixe, com retorno imediato | +1 por lado que combina; prévia com lados verdes/vermelhos e `+N` antes de colocar; a melhor rotação já vem sugerida |
| As peças são a vida; pontos são consequência | Pilha começa com 22; o jogo acaba quando ela acaba |
| Jogar bem devolve peças | Peça perfeita (cercada, 6 lados combinando): +5 e +1 peça. Missão cumprida: +3 peças |
| Missões com número exato criam planos e risco | "Bosque com 7": o grupo precisa ter exatamente 7 peças; passou, perdeu |
| Peças ruins viram problema a contornar | Lados que não combinam só não pontuam; rio que bate em terra vira brejo e a água para ali |
| Mundo aberto e bonito que cresce | Tabuleiro sem limite, câmera que acompanha, arrastar e pinçar |

**Identidade própria:** a água só corre no rio ligado à nascente. Rios desconectados ficam como leito seco; ligar um deles faz a água descer por tudo de uma vez (+2 por peça que recebe água viva), e o terreno em volta fica verde. Há missões de "ligar à água".

## Números do simulador (40 vales, `parScore` = bot guloso)

| Bot | Pontos | Peças colocadas | Missões cumpridas | Perfeitas |
|---|---:|---:|---:|---:|
| Aleatório | 11 | 22 | 0,1 | 0 |
| Guloso | 157 (49–313) | 39 (23–59) | 4,1 | 4,5 |

Primeira versão proibia rio encostar em terra; no teste isso criou buracos onde quase nenhuma peça cabia. Agora qualquer peça cabe em qualquer casa vazia (guloso: 136 pontos, 36 peças em média).

## A verificar com pessoas

1. A primeira partida é entendida sem ler a ajuda?
2. A pilha acabando gera vontade de "só mais uma"?
3. As missões exatas são lidas no mapa (marcadores `3/9`)?
4. Ligar um rio seco à nascente é um momento memorável?

## Polimento (v0.4.1)

- **Arte 3D feita no Blender** (`arte/`): 3 árvores, pinheiro e versões secas; 2 casas e versões secas; trigo, capim, flores, pedra, junco. Terreno seco usa as versões secas; ao chegar água, o vale fica verde.
- **Partículas** (também do Blender): poeira ao colocar, folhas ao plantar bosque, gotas onde a água chega, brilhos na peça perfeita, pétalas e folhas ao cumprir missão, fumaça nas chaminés das vilas com água.
- **Som sintetizado** (sem arquivos): batida de madeira com notas que sobem conforme os lados combinam, água correndo, arpejo da peça perfeita, fanfarra da missão, aviso de missão perdida. Botão de mudo.
- **Prévia da missão**: antes de colocar, a peça mostra "✓ cumpre a missão" ou "✗ estoura a missão".
- **Primeira jogada guiada**: anel "toque aqui" na melhor casa nas duas primeiras peças.
- **Foto do vale** na tela final.

## Água (v0.4.2)

- **Superfície animada**: 48 quadros em laço gerados no navegador a partir de uma soma de ondas (números de onda inteiros, então a textura emenda sem costura). Para cada pixel calcula-se a normal da superfície, o reflexo do céu com Fresnel (mais céu nos ângulos rasantes) e o brilho especular do sol, que cintila quando as ondas passam.
- **Ancorada no mundo**: a textura não "anda" com a câmera; só as ondas se movem.
- **Margens**: areia seca, terra molhada, espuma fina na beira, água rasa clara junto à margem e mais funda no meio.
- **Correnteza**: riscos de espuma descem o rio no sentido real do fluxo (distância pela rede viva a partir da nascente).
- **Nascente** borbulhando com ondas concêntricas; **brejo** com anéis lentos onde o rio termina em terra; **leito seco** de areia rachada até a água chegar.

## Terreno contínuo e variado (v0.4.3)

Pedido do teste: "não tem variação dentro da própria categoria" e "as linhas não casam".

- **Texturas ancoradas no mundo**: o chão de cada terreno é uma textura que emenda sem costura e não depende da peça. Um campo que atravessa várias peças é uma lavoura só, com os sulcos contínuos.
- **Variação por região**: cada região conectada (o mesmo campo, bosque, pasto ou vila) recebe uma variante, escolhida pela peça mais antiga da região (estável enquanto cresce):
  - Campo: trigo, milho, roças em retalhos, girassol.
  - Pasto: capim, florido, cerrado (árvore torta, cupinzeiro), pastagem (vacas, arbustos).
  - Bosque: mata, pinheiral, ipês (amarelo e roxo), cerradão.
  - Vila: telhados vermelhos, azuis ou de barro; regiões com 3+ peças ganham igreja ou moinho; campos grandes ganham celeiro.
- **Objetos espalhados**: posições aleatórias fixas dentro de cada triângulo, tamanhos variados; buritis e juncos à beira dos rios com água.
- **Sem fresta entre peças**: borda só aparece onde os lados não combinam (linha discreta) ou na borda livre do vale.
- **Arte nova no Blender**: ipê-amarelo, ipê-roxo, buriti, arbusto, árvore do cerrado, 8 casas (3 formatos, 3 cores de telhado), igreja, moinho, celeiro, fardos, vaca, cupinzeiro. Versões secas geradas automaticamente no atlas (`~d`).

## Beleza (v0.4.4)

Pedido do teste: "a água e os elementos ainda não estão bonitos o suficiente; a igreja tá feia".

- **Modelos refeitos no Blender** em resolução maior (256 px), com luz de sol + céu + luz de recorte:
  - Copas orgânicas: esferas subdivididas deformadas por ruído, sombreamento suave e material "pintado" (claro em cima, escuro embaixo, com manchas). Ipês com flores salpicadas.
  - Casas com beiral, cumeeira, fiadas de telha, janelas com moldura e venezianas, rodapé.
  - **Igreja nova**: capela colonial vista de lado — nave branca com janelas altas, torre sineira com sino dourado, óculo, porta azul, coruchéu de barro e cruz; frisos e pilastras azuis.
  - Buriti com folhas em leque, cupinzeiro de barro, vaca malhada, moinho com pás de lona, celeiro.
- **Água estilizada**: degradê de profundidade (turquesa no raso, azul no meio), reflexo do céu, cáusticas suaves em movimento (duas camadas de Worley), brilhos do sol que piscam, espuma na beira, correnteza.
- **Atmosfera**: sombras de nuvens passando devagar sobre o vale, borboletas em pastos floridos e bosques de ipê, laterais das peças com degradê de terra e beirada de grama.
- **Desempenho**: cada peça é pintada uma vez em duas camadas (chão e objetos) e reaproveitada; o atlas tem versões reduzidas (mipmaps). Tempo de desenho por quadro caiu de ~18 ms para ~1,3 ms no teste.

## Água de verdade e partículas naturais (v0.4.5)

Pedido do teste: "água tem que parecer água de verdade" e partículas melhores.

- **Água renderizada no Blender** (`arte/agua.py`): superfície ondulada com material de água (IOR 1,333, transmissão, reflexo do céu reforçado por Fresnel) e volume que absorve luz, sobre leito de areia e seixos. Cáusticas animadas projetadas no leito. Tudo periódico (ondas com números de onda inteiros, areia de senos inteiros, seixos repetidos 3×3) e em laço de 24 quadros. Câmera inclinada como a do jogo.
- `arte/montar_agua.py` junta os quadros numa folha WebP de 122 KB e ajusta a cor para o turquesa de riacho limpo.
- No jogo: a folha é usada como padrão ancorado no mundo, com mistura entre quadros consecutivos; o meio do rio fica mais azul (mais fundo); brilhos do sol viraram pontos de luz suaves.
- **Partículas**: poeira de terra suave ao colocar peça (no lugar de bolas brancas), fumaça suave que sobe e se espalha, gotículas e anéis na superfície quando a água chega, folhas e pétalas girando no ar, brilho dourado suave na peça perfeita.

## Fator replay — fase 1 (v0.5)

Implementa a primeira fase de `FATOR_REPLAY.md`.

- **Estações do rio** (como as metas do Islanders): metas de pontos 35, 95, 180, 290, 420, 570, 740, 930 e depois +220 a cada estação. Cada estação alcançada dá **+3 peças**. Nomes: Estiagem, Primeiras chuvas, Florada, Tempo das águas, Cheia, Fartura, Vale vivo. Barra no topo com progresso e a próxima novidade.
- **Peças especiais**, liberadas por estação e sorteadas na pilha de forma determinística (a peça é decidida quando aparece como "da vez" ou "depois" e não muda):
  - Estação 2 — **Cachoeira**: rio reto com degrau de pedra e espuma; +6 quando a água chega.
  - Estação 3 — **Ponte**: rio com vila dos dois lados; os lados de terra combinam com qualquer terra.
  - Estação 4 — **Lagoa**: água em 4 lados, lagoa grande com vitórias-régias; +8 e +1 peça quando a água chega.
- **Relatório do vale** no fim: quanto faltou para a próxima estação, missão que ficou a 1 peça, de onde vieram pontos e peças (encaixes, água, missões, perfeitas, especiais, estações), missões estouradas e quantas peças custaram, melhor jogada e uma dica gerada a partir da partida.
- **Recorde pessoal** (estação mais alta; empate pelos pontos) e **par do vale** expresso como estação + pontos.

Simulação (bot guloso, 40 vales): estação média 3,4 (2 a 5), pontos ~191 (72–400), peças colocadas ~47 (27–81). Bot aleatório fica na estação 1. Há espaço para uma pessoa jogando bem passar da estação 5.

## Missões claras e áudio no iOS (v0.5.1)

Pedido do teste: "não entendi as missões até o fim da primeira partida" e "o áudio não funciona no iPhone 13 Pro".

- **Missões**: lista de missões abertas sobre o vale (toque numa para destacar a região e ler a regra); região da missão contornada no tabuleiro; ao escolher onde colocar, a prévia mostra o efeito em cada missão ("4→5/6", "✓" se cumpre, "✗" se estoura) e contorna a região; explicação curta na primeira peça com missão.
- **Áudio no iOS**: o som é liberado no fim do toque (touchend/click), não no início; pede ao iOS uma sessão de "reprodução" (`navigator.audioSession`) e mantém um `<audio>` silencioso tocando, para não ser cortado pela chave de silêncio; retoma o som ao voltar para o app.

## O ano no vale: sustentabilidade e seca (v0.6)

Pedido: estações do ano avançando, com dificuldade no "inverno" para quem avança muito, e sustentabilidade. Análise completa, tentativas descartadas e números em `SUSTENTABILIDADE.md`.

- **As estações passam pelo tempo, não mais pelos pontos**: a cada 4 peças a estação muda. O ano tem 16 jogadas: Águas → Cheia → Colheita → Seca.
- **Colheita**: cada peça de campo com água viva por perto guarda 1 de comida (+1 ponto). Cada 2 de comida dão +1 peça.
- **Seca**:
  - O rio só corre por peças com **mata ciliar** (lado de bosque na peça, ou o lado da vizinha virado para ela é bosque).
  - Trecho sem mata seca, junto com tudo rio abaixo.
  - Durante a Colheita, os trechos em risco ficam marcados em laranja, com a etiqueta "sem mata" onde o rio corta.
- **Ano novo**:
  - Casa com água na seca e comida no celeiro: +3 e +1 peça. Casa com fome: −1 peça.
  - As chuvas dão +2 peças.
  - A fome cresce 0,5 por ano.
- **Painel de equilíbrio** com três indicadores tocáveis:
  - rio na seca;
  - colheita ou celeiro;
  - casas que vão comer.
  - Tocar num indicador mostra a previsão e destaca as peças. Com uma peça escolhida, mostra o antes → depois.
- **Faixas, sons e efeitos** para Cheia, Colheita, Seca e Ano novo. Na seca, a luz do vale fica quente.
- **Fim de partida**:
  - O relatório mostra colheitas, ano novo, fome e trechos secos, com dica tirada da partida.
  - O recorde passa a ser por pontos e foi zerado, porque as regras mudaram.
  - O par do vale é calculado pelas regras novas. Corrigido: o bot do par parava quando todas as jogadas davam saldo negativo.
- **Simulação** (60 vales):
  - Guloso: 2,6 anos, 212 pontos, 43 peças.
  - Cuidadoso: 2,8 anos, 216 pontos, 46 peças. Seca 3× menos rio e alimenta quase o dobro de casas.
  - Aleatório: vê o ano 1 inteiro.
  - Simulador em `sim/ano_no_vale_teste.js`.

## Auditoria, seca simplificada e lições (v0.7)

Pedido: "não sei se a sustentabilidade está boa ou se eu não entendi"; verificar todas as mecânicas; criar um onboarding com fases e mapas específicos. A análise completa está em `MECANICAS.md`.

- **Auditoria**: as mecânicas foram avaliadas por três critérios: criar uma decisão, caber em uma frase visível no tabuleiro e ter consequência perto da decisão.
  - Ficam: encaixe, peça perfeita, água viva, missões, pilha, especiais, desfazer e vale do dia.
  - A Ponte fica marcada como candidata a simplificar.
- **Sustentabilidade simplificada**:
  - Saem colheita, celeiro, casas e fome.
  - O ano tem Águas (8 jogadas) e Seca (4). Na seca, só corre o rio com bosque encostado.
  - Quando a seca chega, cada trecho protegido vale +1 e rende peças: 1 a cada 2 trechos no ano 1, a cada 3 no ano 2, e assim por diante. A seca fica mais dura a cada ano.
  - As chuvas voltam com +2 peças.
  - Na tela: o indicador "Rio protegido para a seca: 3 de 4 → +1 peça", o aviso em laranja nas 4 jogadas antes da seca e a etiqueta "sem mata".
- **Lições**: cinco vales prontos (encaixe, água viva, missões, peça perfeita, seca), cada um com objetivo, casa marcada, texto por passo e tela de acerto ou de "tentar de novo".
  - Quem nunca jogou começa por elas.
  - O link "Pular lições" fica sempre visível.
  - Dá para refazer as lições pelo "?".
  - O motor ganhou vales prontos (`licao-1` … `licao-5`) com peças fixas e reprodução determinística.
- **Recorde** zerado de novo, porque as regras mudaram.
- **Simulação** (30 vales):
  - Guloso: 48 peças e 201 pontos.
  - Cuidadoso: 56 peças e 271 pontos.
  - As versões sem teto disparavam até 300 peças.

## Menus e acabamento (v0.8)

Pedido: revisão final de menus, regras e gráficos.

- **Tela inicial**:
  - Mostra um vale de vitrine (jogadas pré-calculadas, para abrir rápido), o título e uma frase sobre o jogo.
  - O botão **Vale do dia** muda conforme o dia: "novo", "continuar · N peças" ou "jogado · ver o resultado".
  - Tem também **Vale de treino** e **Lições**.
  - Mostra a sequência de dias jogando ou, depois de jogar, quanto falta para o próximo vale.
  - Links para Como jogar, Estatísticas e Som.
  - Quem já joga abre o jogo por ela; quem nunca jogou abre direto na lição 1.
- **Menu de pausa** (botão ☰, no lugar do "?"):
  - Continuar, Tela inicial, Como jogar e Recomeçar (vale ou lição).
  - Chaves de Som, Vibração e Menos movimento.
  - Fecha tocando fora da folha ou com Esc.
- **Estatísticas**:
  - Vales do dia jogados, recorde, dias seguidos e maior sequência.
  - Os últimos 7 dias, com pontos.
  - Quantas vezes ficou acima do par e quantas lições foram feitas.
  - O par de cada dia é guardado quando é calculado.
- **Lições**: lista com as cinco, marcadas quando feitas, e qualquer uma pode ser refeita. "Pular lições" leva à tela inicial.
- **Resultado do dia**: as jogadas ficam guardadas, então dá para rever o resultado mesmo depois de jogar outros vales. Novo botão Tela inicial e a contagem para o próximo vale do dia.
- **Missões**: no máximo 3 aparecem sobre o vale (as mais perto de cumprir); as outras ficam num "+N".
- **Correções**:
  - Regra `[hidden]` na própria página.
  - Frase "faltaram N jogadas para a seca" só aparece quando a seca renderia peças.

## Missões com prazo, leito seco do Blender e som do vale (v0.9)

Pedido: "estourar a missão não faz sentido", "as rachaduras parecem de outra arte", melhorar o som (por exemplo, ouvir a água de perto ao dar zoom) e ajustar mecânicas.

- **Missões com prazo** no lugar do número exato:
  - A região precisa chegar a N peças em até X jogadas, com o prazo (⏳) na bandeira e na lista.
  - Passar do número não tem problema. Se o prazo acaba, a missão vai embora sem castigo e com um aviso neutro.
  - Lição 3 refeita para a regra nova. Números em `MECANICAS.md`, seção 6.
- **Leito seco** (`arte/leito_seco.py`):
  - É o mesmo leito de areia e seixos da água, renderizado sem água, com barro rachado em relevo e iluminado pelo mesmo sol.
  - Fica ancorado no mundo como a água, então quando a chuva volta a água cobre as mesmas pedras.
  - Substitui as rachaduras desenhadas em vetor. São 18 KB.
- **Som do vale** (sintetizado, sem arquivos):
  - O ambiente segue a câmera e o zoom.
  - **Riacho**: ruído filtrado, mais bolhas sintetizadas uma a uma. Quanto mais perto e mais água no centro da tela, mais bolhas e mais brilho. Vem do lado da tela onde está a água.
  - **Cachoeira**: ronco grave quando está à vista.
  - **Bosques**: pássaros, vindos do lado de cada bosque e mais raros na seca.
  - **Capim**: vento que sobe e desce.
  - **Seca**: cigarras.
  - Nova chave "Sons do vale" no menu.
- O indicador do rio mostra "+1 peça a cada N" quando a seca ainda não renderia peças.

## Contemplação: identidade visual (v1.0)

Pedido: o jogo tem que ser contemplativo e bonito. Integrar técnicas de arte, pesquisar e aprofundar a identidade visual. Pesquisa, pilares e paleta estão em `IDENTIDADE_VISUAL.md`.

- **Umidade contínua**: todas as peças são desenhadas verdes, e a secura é um campo que se espalha a partir da água viva, sem emendas em hexágono. Antes, cada peça trocava inteira entre molhada e seca.
- **Luz por estação**: Águas (manhã fresca), Seca (tarde dourada) e arco-íris quando a chuva volta, com transição suave. O fundo da página acompanha.
- **Fundo pintado**: céu, sol difuso, nuvens, chapadas em duas camadas com buritis, névoa e planície, com paralaxe. O quadro do vale se dissolve nas bordas.
- **Sobre o vale**:
  - manchas de luz em grande escala que costuram as peças;
  - luz diagonal;
  - ondas de vento no capim;
  - vinheta;
  - grão de papel.
- **Vida**:
  - brilhos na água;
  - pétalas de ipê na seca;
  - pólen e poeira no ar;
  - bandos de pássaros e araras com sombra no chão.
- **Maquete**:
  - terra vermelha do Cerrado nas laterais das peças;
  - casas vazias sem tracejado;
  - divisas e bordas mais leves;
  - sem frestas entre os triângulos do chão.
- **Modo Contemplar**: botão de olho, item no menu e "Ver meu vale". Some a interface e a câmera passeia devagar.
- **Emblema** na tela inicial (hexágono com rio e ipê). A tela inicial e o retrato do fim usam o fundo pintado.

## Sensação de jogo (v1.1)

Pedido: aperfeiçoar visuais e sensação de jogo (game feel).

- **Colocar a peça**:
  - A peça cai com peso: acelera, achata no impacto e volta com uma molinha.
  - Os enfeites (árvores, casas) brotam com um pequeno exagero.
  - As vizinhas dão um leve pulo em onda.
  - Cada lado que combina acende em sequência, com uma nota de marimba pentatônica.
  - O toque de madeira e a vibração saem no instante em que a peça encosta no chão, e não no toque do botão.
- **Peça perfeita e missão**: anel de luz que se expande, brilho suave e um respiro de câmera de 2,5%.
- **Escolher e girar**:
  - A peça fantasma sobe, ganha sombra no chão e flutua.
  - Girar anima a rotação, com um clique de madeira.
- **Interface**:
  - Pontos e peças contam até o valor novo, no ritmo do impacto.
  - A peça da vez desliza do "depois".
  - Botões afundam ao toque.
  - As faixas entram com um pequeno salto.
- **Vale**:
  - Bosques sem casas balançam com o vento, na mesma direção das faixas de vento do capim.
  - Na seca, a umidade recua devagar dos trechos que secam (2,4 s).
  - Raios de sol suaves, mais fortes na seca.
- **Correção**: a peça que ainda está caindo não entra no recorte de luz e umidade. Antes, o lugar dela "acendia" antes da hora.
- O desenho de um quadro continua em cerca de 3 ms.

## Composição, modelos novos, brejo e desempenho (v1.2)

Pedido: trabalhar mais o 3D, criar variações dentro da própria variação (com um algoritmo), melhorar componentes e partículas. E a pergunta: o rio que acaba não deveria estreitar?

- **22 modelos novos no Blender**:
  - árvores: duas formas novas de copa, pequizeiro, lobeira e ipê-branco;
  - plantas: canela-de-ema, capim-dourado, girassol e milho;
  - campo e vila: cerca, poço, horta, espantalho, carro de boi, galinhas, pedras chatas, tronco caído, casinha de taipa com telhado de palha e casa de telha terracota;
  - bichos: capivara, garça e lobo-guará.
  - O atlas não guarda mais as versões secas, porque a secura agora é o campo contínuo. Com isso ficou menor que antes (385 KB, eram 421), mesmo com os modelos novos.
- **Algoritmo de composição**, para cada terreno de cada peça:
  - os triângulos vizinhos do mesmo terreno viram uma área;
  - um arranjo é escolhido por sorteio estável e pelo contexto (água ao lado, tamanho da área);
  - os objetos são espalhados com distância mínima (amostragem de Poisson) e densidade própria do arranjo;
  - cada objeto varia em espécie, tamanho, espelhamento (plantas pequenas e bichos) e tom (5 tons de folhagem).
- **Arranjos**:

  | Terreno | Arranjos |
  |---|---|
  | Bosque | mata densa, clareira (com pequizeiro, flores, pedra ou cupinzeiro no meio), cerrado aberto, beira-rio (buritis e taboas colados na água); ipê de destaque em cerca de 1/3 dos bosques; sub-bosque |
  | Vila | rua (com caminho de terra), praça (com poço ou árvore no meio), sítio (horta, galinhas, cerca, carro) |
  | Campo | lavoura em fileiras na direção das linhas da textura (trigo, milho, girassol), com espantalho, fardos ou carro |
  | Pasto | capim (com capim-dourado), florido (com canela-de-ema), cerrado (pequizeiro, cupinzeiros, às vezes um lobo-guará), pasto (vacas e cerca); capivara na beira d'água |

- **Rio que termina**: estreita até sumir num **brejo**, com terra escura e úmida, poças, taboas e às vezes uma garça. A peça de "fim de rio" afina até o centro em vez de virar uma lagoa.
- **Vida**:
  - peixes que saltam em arco, com respingos na saída e na entrada;
  - libélulas pairando sobre a água, que somem na seca;
  - folhas caindo dos bosques na época das águas.
- **Desempenho em telas 3× (iPhone)**:
  - O campo de umidade é calculado em meia resolução e só é refeito quando algo muda. A mistura fica recortada pelo contorno das peças.
  - A resolução vai até 2×.
  - Qualidade adaptativa: se o aparelho passar de cerca de 26 ms por quadro, cai para 1,5× e tira vento e raios; depois cai para 1,25× e tira as manchas e o segundo passe da umidade.
  - No zoom, no máximo 3 peças são redesenhadas por quadro.
## O fim da partida: marcos, a última cheia e a fauna (v1.3)

Pedido: fazer a pessoa querer jogar de novo quando a partida termina. Estudar outros jogos, de gêneros parecidos e diferentes, e passar as ideias por um pipeline crítico, mudando mecânicas se valer a pena. O estudo completo, com fontes e simulações, está em `FATOR_REPLAY_2.md`.

- **Marcos do vale**: três gotas por vale, Riacho, Ribeirão e Rio cheio.
  - Três bots jogam a mesma pilha num Web Worker: guloso, cuidadoso e mestre.
  - Riacho = 70% do guloso; Ribeirão = o guloso (o antigo par); Rio cheio = o melhor bot, e pelo menos 30% acima do guloso.
  - Durante a partida, as gotas e o próximo número aparecem no placar, e uma faixa avisa quando um marco é alcançado.
  - Motivo: na simulação, o mesmo bot faz de 46 a 512 pontos dependendo do vale. O recorde de pontos media a sorte da pilha.
- **A última cheia**: no fim, a câmera mostra o vale inteiro e um brilho percorre o rio vivo. Na folha, os pontos contam até o total e as gotas acendem uma a uma, cada uma com uma nota.
- **Folha do fim refeita**:
  - título com o marco alcançado e o quanto faltou para o próximo;
  - "onde o bot foi melhor", com uma frase sobre a maior diferença;
  - "ver o vale do bot";
  - botão principal "Tentar o (próximo marco) neste vale";
  - bichos e uma pista;
  - detalhes recolhidos.
- **Fauna do Cerrado**: 11 bichos que aparecem quando o vale tem o hábitat deles.
  - Exemplos: pasto com 6 peças traz a seriema; brejos com água trazem a garça; na seca, 10 trechos de rio correndo trazem a onça.
  - Não dão pontos. Ficam no vale, no retrato do fim e no modo Contemplar.
  - Desenhados em vetor com a paleta do jogo. Garça, capivara e lobo-guará usam os modelos do Blender da v1.2.
  - Os enfeites desses três bichos só aparecem depois que o bicho voltou ao vale na partida.
- **Caderno do Cerrado**: álbum com barra de progresso, três pistas com "seu melhor" e a grade de bichos (os que faltam aparecem em silhueta). Fica na tela inicial, no menu e no fim.
- **Estatísticas**: rios cheios, bichos e as gotas da semana. O vale do dia mostra o marco na tela inicial. O texto para compartilhar ganhou as gotas e os bichos.
- **Simulação** (40 vales, `sim/replay_teste.js`):
  - jogador casual: 0–3 gotas = 19/12/5/4;
  - cuidadoso: 3/9/25/3;
  - mestre: 0/10/15/15.
  - Raridade dos bichos: comuns aparecem em 52–98% das partidas, raros em 18–50% e a onça em 2% (casual) a 22% (mestre).
- **O que não mudou**: as regras de pontuação. Lições e números anteriores continuam válidos.

## Vale vivo: ambiente que se move sozinho e mundo que responde ao mapa (v1.4)

**Cada elemento pensado em separado (Blender)**
- **Copas de folhas**: as árvores deixaram de ser bolas 3D. Agora são centenas de folhas (cartões em losango) em volta de um miolo escuro, com cor variando folha a folha e um pouco de luz atravessando.
- **Mata seca de verdade**: versões `_seco` das árvores, com metade das folhas em ocre e ferrugem e galhos aparecendo. Elas aparecem nos bosques longe da água durante a seca.
- **Palha que parece palha**: material com fibras, usado nos fardos, no carro de boi, no telhado de taipa e nos sacos da venda.
- **Capim feito de lâminas** curvas, não de bolinhas. O capim-dourado tem as cabecinhas amarelas.
- **Bichos e vila**:
  - ovelhas com corpo de lã em tufos, em duas poses (cabeça erguida e pastando);
  - gado **curraleiro pé-duro** caramelo, a raça do Cerrado;
  - cercado com cocho.
- **Construções**: sobrado (duas versões), venda e coreto.
- **Atlas**: 72 sprites, embutido como WebP (227 KB, o PNG tinha 680).

**Ambiente simulado** (o jogador não controla nada disso)
- **Hora do dia**: o dia anda conforme se joga. São 16 jogadas por dia, 12 de sol (6 h às 18 h) e 4 de noite.
  - Alvorada rosada e entardecer dourado.
  - À noite: céu azul-escuro com estrelas e lua, janelas acesas e vaga-lumes.
  - As lições ficam sempre às 10 h.
- **Vento** com direção e força que mudam devagar (soma de ondas, com rajadas). Ele move:
  - as faixas de luz no capim;
  - o balanço das árvores, em onda que atravessa o vale;
  - a fumaça, o pólen e as folhas;
  - o capim fio a fio.
- **Nuvens**: tufos que nascem a barlavento, crescem, atravessam o vale levados pelo vento e se desfazem. A sombra cai deslocada conforme a posição do sol e a altura da nuvem.
- **Clima**: chuva só nas águas, cerca de 14% de chance por jogada.
  - Gotas inclinadas pelo vento, anéis na água e luz acinzentada.
  - Quando a chuva passa de dia, vem o arco-íris.
  - Na seca há redemoinhos de poeira.
- **Capim fio a fio no zoom**: touceiras de lâminas afinadas, com sombra na direção oposta ao sol, que se curvam com as rajadas (as altas mais).
  - Só aparece de perto e na qualidade máxima.
  - No máximo 3600 lâminas, desenhadas em lote: um caminho por cor.
  - Não nasce em cima de casas e árvores.
- **Som**:
  - camada de chuva;
  - o vento acompanha a força do vento;
  - grilos à noite;
  - menos pássaros à noite e na chuva;
  - cigarras só de dia na seca.

**O mundo responde ao mapa**
- **Pasto**:
  - sem vila nem água: "morto", sem bicho, só capim seco, pedras e cupinzeiros;
  - com vila ao lado: um cercado com ovelhas e galinhas (mais ovelhas se também tem água), e ovelhas soltas nas outras áreas de pasto da peça;
  - com água: gado pastando, mais cabeças quanto maior o pasto.
- **Bichos animados**: cada um alterna entre andar até um ponto perto e parar. A ovelha baixa a cabeça para pastar, vira para o lado em que anda e dá pulinhos ao andar.
- **Vila cresce sozinha** com o tamanho da região:
  - até 2 peças: casinhas de taipa;
  - até 5: casas de telha;
  - a partir de 6: sobrados;
  - a partir de 10: venda, sobrado e praça com coreto.
- **Lavouras perto da vila** ganham mais espantalhos, fardos e carros de boi.

**Desempenho**
- Fora do Contemplar, o quadro leva 2 a 4 ms no teste (o capim fio a fio custa cerca de 1,6 ms no zoom).
- No Contemplar, o custo é dos recortes do rio, que já existia na v1.2. A qualidade adaptativa reduz a resolução quando passa de 26 ms.
## Bichos em 3D, partículas do Blender e correções visuais (v1.5)

Feita em paralelo com a v1.4 (vale vivo) e juntada sobre ela. As partículas novas entraram no atlas WebP da v1.4.

Retorno do teste no iPhone:
- os bichos precisam de forma e animação 3D;
- as partículas precisam de formas melhores;
- os rótulos se sobrepõem e crescem demais no zoom;
- a tela "pisca preto" antes de a peça assentar;
- falta clareza e integração entre os terrenos.

- **Fauna em 3D** (`arte/fauna.py`):
  - Os 11 bichos foram modelados no Blender com "juntas" (quadril, ombro, pescoço, cabeça, cauda, tromba). As peças do corpo são filhas das juntas.
  - Duas animações em laço de 8 quadros:
    - **anda**: passo alternado nas aves; trote em diagonal nos quadrúpedes; pulinho no joão-de-barro e nos pássaros de poleiro;
    - **para**: respira, bica o chão, olha para o lado, abana o rabo ou mexe a tromba.
  - As araras que cruzam o céu também viraram um modelo do Blender, com 8 quadros de bater de asas.
  - **Pássaros no mundo, não na tela**:
    - os bandos (araras e pássaros ao longe) têm posição, altura e velocidade próprias em unidades do vale;
    - arrastar a câmera não os leva junto, e o zoom os aumenta na mesma proporção do mapa;
    - eles atravessam o vale de um lado ao outro, com uma deriva leve e a sombra no chão logo abaixo.
    - Antes, a posição e o tamanho eram da tela: eles "grudavam" na tela e cresciam sozinhos no zoom.
  - O tucano e o martim-pescador ficam num poleiro, e o joão-de-barro ao lado do ninho de barro com a porta virada para a câmera. A onça tem rosetas na superfície.
  - `montar_fauna.py` recorta todos os quadros de um bicho pela mesma caixa, para a âncora não tremer, e gera `fauna.webp` (WebP com transparência) e `fauna.json`.
- **No vale**:
  - cada bicho tem um pequeno comportamento: fica parado (faz o ciclo e descansa), escolhe outro ponto do hábitat a até 3 casas e anda até lá, virando para o lado certo;
  - a velocidade depende do bicho (o lobo-guará anda rápido; o tamanduá, devagar);
  - os de poleiro ficam no lugar.
  - No caderno, os cartões usam o mesmo render. A silhueta dos que faltam vem dele.
- **Partículas novas** (`afluente_sprites.py`, 128 px):
  - folhas com contorno, nervura e curvatura, em três tons (verde, amarela e seca; na seca caem mais folhas secas);
  - pétalas de ipê em rosa, amarelo e branco;
  - gota em forma de gota;
  - poeira em nuvem;
  - brilho de quatro pontas;
  - borboletas laranja e azul, com borda escura.
  - `atualizar_atlas.py` troca só esses sprites no atlas, sem renderizar tudo de novo. `embutir.py` põe os atlas no protótipo.
- **Piscar preto (iPhone)**:
  - A dica e o painel da peça mudavam de altura (por exemplo, a dica com duas linhas ou a missão na peça da vez). Isso redimensionava o canvas, e o Safari mostra um quadro vazio ao realocar.
  - Agora os dois têm altura fixa. O canvas só é realocado quando o tamanho muda de verdade, e é redesenhado na mesma hora.
  - Os canvas antigos do cache das peças são liberados na hora, porque o iOS demora a liberar memória.
- **Rótulos**:
  - todos os balões do vale passam por um arranjo único, por prioridade: "toque aqui", a peça escolhida, a prévia das missões, "sem mata", as bandeiras e a nascente;
  - eles não se sobrepõem, não entram na faixa das missões no topo e têm tamanho limitado (12 a 15 px), sem crescer com o zoom;
  - a prévia de uma missão substitui a bandeira dela, em vez de aparecer junto;
  - "cumpre a missão" virou "· missão ✓" no balão da peça, e "nova missão" saiu (o painel já mostra).
  - Contornos e marcas ✓/✗ também têm tamanho máximo.
- **Zoom nítido**:
  - o cache de cada peça vai até 200 px por raio (era 100);
  - peças fora da tela não são desenhadas, e no zoom o cache delas é liberado.
- **Sombras no lugar**:
  - a sombra assada em cada sprite do Blender é separada no carregamento (pixels escuros e translúcidos);
  - ela é desenhada antes dos objetos e recortada pelo chão da peça;
  - as peças também são recortadas pelo seu contorno, com espaço para as copas.
  - A mancha escura que flutuava sobre o céu na borda do vale sumiu.
- **Integração entre terrenos**:
  - a divisa entre dois terrenos de uma peça deixou de ser uma reta e virou uma curva suave: cada terreno avança sobre o outro em "línguas";
  - nessas divisas entram moitas, tufos, flores e cercas (ecótonos);
  - correção: a linha de divisa antiga era desenhada na aresta errada (entre o triângulo i e o i−1).

## Terrenos coerentes de perto (v1.6)

Reação a capturas do iPhone em que o vale, visto de perto, "não fazia sentido".

**O rio seco parecia calçada quebrada.** Rio que não está ligado à nascente fica seco, e a textura dele era um mosaico regular de placas rachadas.
- `leito_seco.py` refeito: areia com marcas de correnteza e seixos, e só algumas manchas de barro com rachaduras finas.
- O leito fica afundado: barranca em sombra e o meio mais claro e úmido.
- Seixos no fundo e capim nas barrancas.
- Resultado: lê como um riacho seco do Cerrado.

**Objetos não respeitavam o espaço.**
- Cada objeto agora tem uma pegada calculada pela largura real do sprite:
  - casas e construções não se sobrepõem entre si nem às árvores;
  - casas e construções ficam dentro da peça.
- Nada entra no canal do rio, exceto buritis, taboas, garça e capivara. Isso vale para os bichos também.
- A igreja e o moinho se afastam do rio ao longo do próprio triângulo.
- O cercado só entra se couber; se não couber, as ovelhas ficam soltas.

**Emendas retas entre terrenos.**
- Dentro da peça, triângulos de terrenos diferentes se encontram numa linha ondulada (a mesma dos dois lados), em vez de um corte reto do centro ao canto.
- A borda da mata ganha uma sombra suave.
- A linha das bordas que não combinam ficou mais discreta.

**A vila virava um hexágono de terra com bolinhas.**
- O chão da vila agora é capim com terreiros de terra batida em manchas irregulares, então a peça se emenda com as vizinhas.
- A vila é marcada pelas casas, hortas e cercas.

**Casinha de taipa parecia caixote.** Refeita no Blender:
- paredes caiadas mais altas e barrado de terra;
- porta e janela com batente azul;
- telhado de palha íngreme com beiral curto.

**Zoom nítido.**
- O zoom máximo do jogo foi de 80 para 120.
- As peças na tela são guardadas com até 160 px por unidade (eram 100). Fora da tela, voltam à resolução baixa para poupar memória.
- As texturas do chão têm o dobro de resolução.
- A pinça do iOS não amplia mais a página, que era o que deixava tudo borrado: quem dá zoom é o jogo.
- As bandeiras de missão mantêm o tamanho na tela em vez de crescer com o zoom.

**Desempenho no zoom máximo**: cerca de 2 ms por quadro no teste.
- Preencher o leito seco duas vezes com textura custava cerca de 60 ms; virou cor lisa.
- Com 220 px por unidade, o navegador do teste perdia a aceleração das telas grandes. Por isso o limite ficou em 160.

## Chão em manchas: integração entre terrenos refeita (v1.7)

Feita sobre a v1.6 (terrenos coerentes). Mantém a pegada real dos objetos, o leito de riacho seco e a vila sobre capim, e troca só o desenho do chão.

Retorno: mesmo com as divisas onduladas (v1.5 e v1.6), ainda apareciam retas entre os terrenos, cunhas e emendas entre peças.

**Por que acontecia**:
- o chão era pintado como seis triângulos, cada um com a textura do seu terreno;
- toda divisa era uma aresta reta, e entre peças vizinhas sobrava um fio de anti-serrilhado;
- as curvas da tentativa anterior só deformavam um trecho de cada reta.

**O que a pesquisa trouxe**:
- **Texture splatting**: uma camada de base e cada terreno por cima, revelado por uma máscara de opacidade. A borda da máscara é perturbada por ruído para não ser geométrica.
- **Mesclar só perto da borda** (Catlike Coding, Hex Map): mesclar o hexágono inteiro vira borrão; o terreno precisa continuar legível.
- **Máscara desfocada antes de usar** (fórum MonoGame) e ruído na borda (shader de hexágonos do Godot Shaders).
- **Dorfromantik** é modular: peças curadas que se recombinam por regras, com cores por bioma.
- **O `ctx.filter` (blur) não funciona de forma confiável no Safari**. O desfoque precisa vir de outro jeito.

**Como ficou**:
1. **Capim de base contínuo**: o hexágono inteiro, um pouco maior que a peça, recebe a mesma textura de capim presa ao mundo. As emendas entre peças somem.
2. **Uma mancha por terreno** (campo, vila, bosque e variantes de pasto). Para cada ponto calcula-se a "distância para dentro" da união dos triângulos daquele terreno:
   - **arestas onde o terreno continua** (no triângulo vizinho ou na peça ao lado) não limitam a mancha;
   - **onde o terreno muda**, a mancha recua e some em degradê;
   - os cantos são arredondados (mínimo suave entre as arestas), então as pontas das cunhas recuam do centro;
   - a borda tem ruído preso ao mundo, de quatro oitavas, e por isso combina entre peças vizinhas.
3. **A máscara é calculada em 44×50 e ampliada com suavização**: a ampliação faz o desfoque, sem `ctx.filter`.
   - A textura do terreno entra só dentro da máscara (`source-in`), por cima do capim.
   - Os terrenos são desenhados em ordem fixa: pasto, campo, vila e bosque.
4. **Entre dois terrenos diferentes aparece uma faixa de capim** (um ecótono). As moitas e flores da v1.5 continuam nessa faixa.
5. **Enfeites que caíram fora da própria mancha** (trigo ou horta no capim) são retirados. As árvores ficam, porque a mata avançando sobre o capim é natural.
6. **A sombra assada dos sprites** ficou 28% mais clara.

**Custo**:
- montar o cache de 26 peças leva 150 ms (antes, 100 ms);
- um quadro normal continua em cerca de 2,5 ms;
- a peça fantasma guarda a sua máscara, porque ela só depende da forma da peça.

## Enfeites sem sobreposição e feno de verdade (v1.8)

Aplicado por cima do chão em manchas da v1.7.

- **Feno do carro de boi** refeito no Blender. Era uma bolha lisa com anéis e parecia pão. Agora é:
  - um monte irregular com textura de fios cruzados;
  - 420 fios soltos por cima, alguns caindo pelas bordas;
  - um carro com guardas de ripa.
- **Construções não se empilham**:
  - a folga vertical entre elas segue a altura real do sprite;
  - o telhado não pode passar da borda de trás da própria peça (antes, a casa da frente encostava na de trás e parecia uma torre).
- **Cercas soltas** no meio do pasto, nas divisas e nas ruas: removidas. Cerca só no sítio e no cercado.
- **Cercado**: só em pasto grande ou em cerca de 40% dos outros. No resto, as ovelhas pastam soltas.
- **Ipês só florescem na seca**. Nas águas, a mesma árvore aparece verde; o contexto da peça ganhou a estação.
- **Rio seco**: a margem ficou estreita e suave, e saiu a faixa interna que parecia trilha de roda.
- **Lagoa seca**: menor, com barro no meio e capim e taboas em volta, em vez de um disco de areia do tamanho da peça.
- **Chão da mata** mais perto do capim: a mata é dada pelas árvores, não por um hexágono escuro.
- **Fauna 3D** menor (de 2,1 para 1,55 vezes a escala da maquete), para não cobrir casas e árvores.
- v1.8b:
  - o gado pasta mais perto do seu ponto e mais longe do cercado, então não anda mais por cima da cerca;
  - saiu a cerca solta das lavouras;
  - borboletas com metade do tamanho (0,1 da peça).

## Mundo com regras: tabela métrica e mapa de colisão (v1.9)

Os bugs de sobreposição vinham de um mesmo problema: cada elemento era posto e desenhado sem saber dos outros. O boi só não podia nascer no rio, mas podia andar até ele. O cercado só olhava o próprio centro. Cada bicho tinha um tamanho escolhido "no olho". A v1.9 cria uma camada de lógica entre o tabuleiro e o desenho.

1. **Layout único por peça, em unidades do mundo.**
   - A composição dos enfeites roda uma vez por peça, com raio 1, e o resultado é guardado em cache.
   - O desenho só escala esse layout. O que se vê de perto, de longe e no mapa de colisão é o mesmo arranjo. Antes, o sorteio dependia da posição em pixels e mudava com o zoom.
2. **Tabela métrica.** Referência: 1 unidade (o raio da peça) equivale a uns 20 m, e a casa de telha mede uns 7,5 m.
   - Bichos e objetos pequenos são exagerados de forma uniforme para serem lidos, mas mantêm a ordem: galinha < ovelha < capivara < boi < casa < cercado.
   - `MSCALE` corrige os sprites do atlas que fugiam da tabela. O cercado ficou 24% menor e não engole mais a vila. O carro de boi, as galinhas, a capivara e a garça de enfeite também foram corrigidos.
   - `FLEN` dá o comprimento de cada bicho da fauna. A escala de desenho é medida no próprio sprite, pela largura do corpo sem sombra, ao carregar. Assim a onça e o tamanduá saem do mesmo tamanho, a seriema fica menor que a ema, e a arara voando segue a mesma tabela.
3. **Pegada inteira.** Construções grandes e o cercado testam oito pontos do contorno da pegada, não só o centro:
   - nenhum desses pontos pode cair no canal do rio;
   - nenhum pode sair da área do próprio terreno, porque um cercado no pasto não invade a vila ao lado.
4. **Mapa de colisão do vale** (`G.world`): uma grade de 0,04 u (cerca de 80 cm), refeita quando o tabuleiro muda. Cada célula guarda bits:

   | Bit | Significado |
   |---|---|
   | `TERRA` | dentro de uma peça |
   | `AGUA` | canal, nascente ou lagoa |
   | `MARGEM` | até 0,14 u da água |
   | `BLOQ` | pegada de casa, cercado, cerca, tronco, pedra |
   | `OCLU` | a área "atrás" de um objeto alto, onde o bicho seria desenhado por cima dele |
   | `CERC` | dentro do cercado |
   | `ROCA` | lavoura |

5. **Regras por espécie** (`WRULE`): `terra`, `gado`, `cercado`, `margem` e `vau`.
   - O gado não entra na água, na lavoura, no cercado nem atrás de casas.
   - A ovelha do cercado não sai dele.
   - A capivara e o martim ficam na beira, e a garça anda no raso.
   - Destinos e caminhos são testados (`wok`, `wseg`), e só se anda em linha reta por caminho livre.
   - A casa de cada bicho da fauna é procurada (`wnear`) até cair num lugar válido. Se não há lugar, o bicho não é desenhado, em vez de aparecer onde não faz sentido.
6. **Gado e ovelhas viraram agentes**, com posição no mundo. Andam até pontos válidos perto de casa, pastam parados e evitam esbarrar uns nos outros.
7. **Aves**: a arara voando e os passarinhos usam a mesma tabela e ficam presos ao mundo, não à tela. Ficam numa camada acima de tudo e com um leve exagero de tamanho, por estarem mais perto da câmera.

**Fauna com corpo contínuo** (no mesmo pacote). O pedido era "mais polígonos, menos bolas coladas". Os 12 bichos foram remodelados no Blender:
- O corpo é uma superfície única (metaball). Tronco, pescoço, cabeça, cauda e pernas são tubos que se fundem, sem emendas visíveis.
- Um esqueleto simples move quadril, joelho, pescoço e cauda. O joelho dobra quando a pata volta, e a arara bate as asas com o pulso atrasado em relação ao braço.
- Bicos, orelhas, pernas de ave e poleiros são malhas lisas de 10 a 14 lados, com degradê ao longo do comprimento.
- A pelagem tem regiões de cor: meias e crina pretas e ponta branca da cauda no lobo-guará, faixa preta com borda branca no tamanduá, barriga e focinho claros e rosetas na onça, papo branco no tucano, peito ruivo no martim.
- O ninho do joão-de-barro ficou na proporção do pássaro.

**Teste de invariantes**: num navegador sem tela, seis vales são jogados por um bot, e 1.600 quadros de cada um são conferidos célula a célula. O resultado foi zero bicho na água, em casa ou cerca, atrás de objeto alto, fora do tabuleiro ou fora do cercado, e zero violação da regra da fauna.

## Nuvens de verdade, ovelha legível e tela baixa (v1.9b)

Aplicado por cima da tabela métrica e do mapa de colisão da v1.9.

- **Nuvens numa camada acima do vale.** Antes, o corpo da nuvem era um véu quase invisível. Agora:
  - são 4 formas de nuvem vista de cima, geradas uma vez;
  - os tufos crescem a partir do centro, sempre encostados, sem bolinhas soltas;
  - cada tufo pega sol no alto à esquerda e tem a borda azulada;
  - têm paralaxe de altura: ficam maiores e andam mais quando a câmera se move, por isso leem como algo mais perto do olho;
  - somem quando o zoom chega perto do chão;
  - a sombra no chão tem a mesma forma, deslocada pela posição do sol.
- **Ovelha legível.** De cima, era uma bola branca e parecia nuvem. Agora tem tufos maiores, barriga em sombra, e cara, orelhas e patas pretas maiores.
- **Ovelhas fora da água:**
  - o ponto de partida e o passeio ficam longe do rio pela soma da margem com o raio do passeio;
  - nada de ovelha solta na peça da nascente.
- **Tela baixa** (celular deitado com as barras do navegador, até 540 px de altura):
  - o vale tinha altura zero e, desde a v1.5, a página travava;
  - agora o vale tem pelo menos 260 px e a página rola;
  - `draw()` não roda sem tamanho.

## Bichos com corpo inteiro e profundidade de verdade (v1.9d)

Defeito: o boi aparecia "em cima da cerca". Ele tinha duas causas.
1. O mapa de colisão testava só um círculo de 3 cm nos pés do bicho, mas o desenho do boi tem cerca de 30 × 20 cm.
2. Os bichos eram desenhados sempre por cima da imagem pronta dos enfeites da peça, sem ordem de profundidade.

O que mudou:
- **Corpo inteiro:** `wbody` testa o retângulo que o sprite ocupa, em 5 × 5 pontos, com um palmo de folga.
  - Boi e ovelha solta não podem ter nenhum pedaço sobre cerca, cercado, casa, água, lavoura ou a área que um objeto alto cobre.
  - O destino e o caminho também são testados com o corpo inteiro.
- **Cercado:** as patas e a barriga da ovelha ficam no miolo. Toda ovelha nascida na área do cercado pertence a ele. No cercado, as ovelhas são um pouco menores e podem ficar encostadas, como rebanho.
- **Áreas de colisão do tamanho do desenho:** a cerca do cercado e a copa das árvores ficaram mais largas.
- **Profundidade:**
  - nas peças com bichos, a imagem pronta guarda só chão, caminhos e sombras;
  - os enfeites são desenhados a cada quadro, junto com os bichos, de trás para a frente: o arbusto na frente cobre a ovelha atrás dele;
  - as peças sem bichos continuam com tudo pronto, sem custo extra.
- **Teste automático novo:** 5 minutos simulados de animação em 4 vales, medindo cada vez que o corpo de um bicho cruza o desenho de um cercado, casa ou copa.
  - Antes: de 862 a 3.454 cruzamentos com cercados por vale.
  - Depois: zero. Os encostos em copa que ainda aparecem são ovelhas atrás de arbustos, desenhadas corretamente por trás deles.

## Rio com forma própria, pedras de verdade, nuvens que se formam e mapa que reage (v1.10)

**Fim do riacho.** Antes, todo rio que acabava virava a mesma cunha triangular, e o rio que batia em terra também. Agora cada peça tem um **esqueleto do rio**, sorteado pela própria peça:
- **Meandro:** os braços fazem uma curva suave. O deslocamento lateral é zero e sem inclinação no centro e na borda, então o canal continua emendando reto com a peça vizinha.
- **Fim de riacho:** língua que afina e se curva (40%), poça de contorno irregular (35%) ou braços de vereda que se abrem no brejo (25%).
- **Rio que bate em terra:** termina em língua ou poça, e nunca em estrela.
- **Dentro da peça:** o fim inteiro, com a margem de areia, cabe na peça. Se passar da borda, encolhe para o lado aberto.
- **Pontas:** brejo escuro e, com água, poças com halo de lama, sempre dentro da peça. Antes, essas poças apareciam flutuando na borda.
- **Um esqueleto só:** o desenho, a composição dos enfeites e o mapa de colisão usam o mesmo esqueleto. Água, buritis, seixos e bichos concordam sobre onde está o rio.
- **Custo:** o contorno é montado uma vez por peça, em unidades da peça, e só transformado a cada quadro.

**Pedras do rio seco.** As pedras antigas eram bolhas claras de poucos polígonos e, de longe, pareciam nuvenzinhas no chão. Agora:
- `rock` é um matacão de arenito facetado, com quinas chanfradas e líquen;
- `rock_b` são pedras de canga (laterita);
- três grupos novos de seixos rolados (`pebbles`, `pebbles_b`, `pebbles_c`): lisos, de cinco cores (cinza, ocre, ferro, quartzo, escuro), meio enterrados e alongados no sentido da correnteza.

No leito seco, os seixos seguem o fundo do canal, afastados da borda da peça (o vizinho tem os seus), com um matacão às vezes no barranco e capim nas margens.

**Nuvens que se formam.** Antes eram 4 desenhos fixos que só aumentavam e diminuíam. Agora são cúmulos montados tufo a tufo:
- **Onde nascem:** a maioria nasce sobre o vale, de preferência sobre mata e água viva (evapotranspiração). Na seca, nascem poucas e ralas.
- **Como crescem:** tufos novos brotam encostados nos antigos, para os lados e um pouco para cima, e cada um incha em cerca de 3 s.
- **Como se desfazem:** pela borda, com os tufos de fora encolhendo primeiro.
- **Chuva:** com chuva, as nuvens escurecem aos poucos.
- **Visibilidade:** ficam bem visíveis na visão de cima, inclusive no começo da partida, quando a câmera ainda está próxima. Ficam transparentes quando a câmera desce perto do chão e ficam mais claras enquanto o jogador escolhe onde pôr a peça.
- **Desenho:** cada nuvem é montada numa imagem opaca e só então desenhada com transparência, sem manchas de sobreposição. A imagem é refeita a cada 150 ms. O custo caiu de ~8 ms para ~0,1 ms por quadro com 6 a 12 nuvens.
- **Correção:** um passo de tempo negativo (relógio voltando) não faz mais o tempo das nuvens andar para trás.

**Física da água.**
- **Chegada:** quando a água chega, ela desce o rio a partir da nascente, pela distância ao longo do rio, e cada peça enche a partir do lado por onde a água entra, com uma frente de espuma. Antes, cada peça só aparecia em degradê, na ordem da distância até a peça colocada.
- **Seca:** os trechos que perdem a água esvaziam, com a lâmina encolhendo do trecho mais baixo para o mais alto.

**O mapa reage ao baque da peça.**
- Os bichos da fauna até 1,7 casa de distância fogem um pouco, mais rápido, para um ponto que a regra da espécie permite.
- Os bichos de poleiro dão um pulinho.
- O gado e as ovelhas se afastam dentro da área de casa, sem atravessar cerca nem água.
- Passarinhos pousados na mata vizinha levantam voo e sobem.
- O rio vivo ao lado faz ondas.

**Testes.**
- Invariantes do mundo: zero bicho na água, em bloqueio ou fora do tabuleiro. Zero gado solto atrás de objeto alto: desde a v1.9d, a ovelha do cercado pode ficar atrás da cerca, porque a profundidade é ordenada. Zero violação de fauna.
- Quadro médio de 2,3 ms com nuvens.
## Motor de disposição com geometria exata e nuvens do Blender (v2.0)

### Diagnóstico
- **Ponto de apoio:** o motor supunha que cada sprite ficava centrado no ponto de apoio e que esse ponto era o pé. Na verdade, a âncora é o centro do objeto em 3D. O cercado se estende 30 px abaixo dela (a cerca da frente), e o boi é assimétrico (28 px à esquerda, 41 à direita). Toda colisão errava lado e tamanho.
- **Pegada:** só construções e árvores tinham pegada. Lavoura, feno e enfeites usavam um círculo genérico.
- **Ordem:** quem ganhava o espaço dependia da ordem das áreas. Se a lavoura viesse antes, o cercado entrava por cima dela.
- **Profundidade:** os bichos eram desenhados por cima de tudo da peça.

### Arquitetura nova
1. **Geometria exata** (`arte/caixas.py` gera `caixas.json`, embutido como `const BOX`).
   - Para cada sprite: o retângulo do corpo (sem a sombra, com a mesma regra de separação do jogo) e a faixa que toca o chão, relativos à âncora.
   - `objGeom()` dá, para qualquer objeto, o desenho na tela (`sb`) e a base no chão (`fb`).
2. **Regras de disposição** (`add()` do `compose`), na ordem:
   1. **Água:** a base nunca fica sobre o canal ou a margem. Construção, cercado, árvore e lavoura também não cobrem o rio com o desenho.
   2. **Terreno:** a base de construção, cercado e lavoura fica inteira dentro da área do próprio terreno. Os demais objetos são testados pelo centro.
   3. **Peça:** o desenho de construção e cercado cabe inteiro no hexágono. Isso elimina as sobreposições entre peças vizinhas.
   4. **Ninguém em cima de ninguém:**
      - construção e cercado, pelo desenho inteiro;
      - lavoura contra árvore, pelo desenho;
      - o resto, pela base.
   5. **Prioridade:** vila, depois pasto (cercado), lavoura e mata. O cercado procura onde cabe (centro da área, depois os pontos mais próximos, em dois tamanhos); se não cabe, as ovelhas ficam soltas. Igreja, moinho e celeiro procuram posições ao longo do seu triângulo.
3. **Mapa de colisão dos bichos** com as mesmas caixas:
   - base de construções, cercas e troncos bloqueia;
   - o desenho acima da base marca oclusão;
   - lavoura inteira é proibida para o gado;
   - o canal tem o comprimento do rio desenhado.
4. **Bichos:** corpo exato (as duas orientações, porque viram ao andar) testado contra o mapa.
5. **Profundidade:**
   - o cercado é desenhado em duas metades (cerca de trás e cerca da frente), ordenadas junto com as ovelhas;
   - nas peças com bichos, os enfeites são ordenados com eles.

### Medição
`medidor.js` usa a geometria exata em 6 vales, com 5 minutos de animação em cada:

| Defeito | Antes (4 vales) | Depois (6 vales) |
|---|---|---|
| Sobreposição de construção ou cercado | 24 | 0 |
| Sobreposição entre peças | 3 | 0 |
| Objeto sobre a água | 41 | 0 |
| Invasão de terreno | 22 | 2 |
| Bicho sobre água ou objeto | — | 0 |

As 2 invasões que restam são especiais (igreja e moinho) numa vila de um triângulo só, onde nada cabe.

### Nuvens (combinadas com a v1.10)
- **Simulação da v1.10:** as nuvens nascem sobre a mata e a água, crescem tufo a tufo e se desfazem pela borda.
- **Desenho:** cada tufo agora é um **tufo com volume renderizado no Blender** (`arte/nuvens.py` com `TUFO=1`, 3 formas em `tufos.webp`, 24 KB), em vez de um disco com degradê. Por isso parecem cúmulos, não bolhas.
- **Camada de cima:** na visão geral, as nuvens passam sobre o vale com paralaxe de altura e somem quando o zoom desce. Enquanto o jogador escolhe onde pôr a peça, ficam a 25% (antes 45%) para não esconder a jogada.
- **Modo cúmulo inteiro:** `nuvens.py` sem `TUFO` continua gerando os 4 cúmulos inteiros, para uso futuro (por exemplo, uma moldura no horizonte).

### Medição final (v1.10 + motor v2.0, 6 vales, 5 min de animação)

| Defeito | v1.10 sozinha | Com o motor v2.0 |
|---|---|---|
| Sobreposição de construção ou cercado | 33 | 0 |
| Objeto sobre a água | 16 | 0 |
| Invasão de terreno | 30 | 2 |
| Sobreposição entre peças | 3 | 0 |
| Bichos sobre água ou objetos | 0 | 0 |
