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
