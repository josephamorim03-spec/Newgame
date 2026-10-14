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
