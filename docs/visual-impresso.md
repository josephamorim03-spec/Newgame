# Dice Duel: técnicas do Aranhaverso (avaliação e plano)

> Pergunta: vale a pena trazer para o Dice Duel animações, efeitos e identidade visual no espírito do
> *Homem-Aranha no Aranhaverso*? Resposta curta: **vale, como sotaque, não como identidade.** As técnicas do filme
> vêm da impressão em papel (retícula, cores desencaixadas, quadros segurados), e o Dice Duel já é papel, feltro e
> fichas. A parte do filme que não cabe é o glitch, o ruído e a energia de cidade: o tom do jogo é aconchegante
> (`docs/design.md` §6–7: "nada no som deve assustar", "perder também é aconchegante").

## 1. Por que faz sentido (e onde não faz)

**A favor:**
- **O jogo já tem as duas chapas.** As cores dos jogadores são azul (`--voce` #6fbfd3) e rosa (`--rival` #ec8fa8):
  quase o ciano e o magenta da impressão. O "desencaixe" das cores do filme, feito com essas duas, vira o duelo
  desenhado: você e o rival saindo do registro por um instante.
- **Os pips já são bolinhas.** A retícula (os pontinhos da impressão barata de gibi) é a mesma forma do dado.
- **O som já fala em onomatopeias.** O `design.md` §7 descreve o som como "plonc", "fump", "fuuu", "tchã-rã".
  Escrever essas palavras na tela, em poucos momentos, junta som e imagem e ainda ajuda quem joga sem som.
- **A técnica mais famosa do filme é sobre aprender.** Miles se move "em dois" (12 quadros por segundo, cada desenho
  segurado por dois quadros) enquanto aprende, e "em uns" (24) quando domina. No Dice Duel, a corrente curta pode
  disparar em dois e a corrente de 5 ou 6 em uns: o lance fica mais fluido quanto melhor ele é. É barato e conta algo.
- **Picos raros pedem um quadro congelado.** Sinfonia e Virada já são os momentos mais raros; uma pausa curta em
  "quadro de gibi" (hit-stop) os separa dos disparos comuns.
- **A Loja vende estilo.** Uma mesa e uma skin de dado "de gibi" encaixam na progressão sem mexer em força
  (`docs/progressao.md`: só cosméticos, todo cosmético pago com um equivalente ganho jogando).

**Contra (e por isso, até a v0.14, só sotaque; na v0.15 o dono pediu a interface toda, ver §3):**
- **Glitch, aberração cromática forte e ruído** brigam com o tom. O filme teve aviso de fotossensibilidade.
- **Tela partida, caixas de legenda e tipografia de gibi em tudo** trocariam a cara do jogo e do onboarding que a
  v0.14 acabou de acertar.
- **Desempenho no celular:** filtros SVG (`feTurbulence`, `feDisplacementMap`) a cada quadro pesam. Tudo aqui é CSS
  (gradientes, `text-shadow`, Web Animations) e o canvas de partículas que já existe.
- **Marca:** nada de aranha, teia, logo, nome ou letreiro do filme. A gente usa a técnica (de domínio público, é
  impressão de gibi), não a propriedade. Por isso o nome interno é **"impresso"**, e o cosmético se chama **Gibi**.

## 2. As técnicas, uma a uma

| Técnica do filme | O que é | No Dice Duel | Onde |
|---|---|---|---|
| Animar em dois / em uns | segurar cada pose por 2 quadros; em uns, fluido | **sim**: a cascata do disparo de 2 a 4 dados anda em passos; de 5 e 6, fluida. A rolagem 3D **não** (é física gravada, ficaria travada) | `Fx.contagem`, cascata em `js/jogo.js` ~1140–1170 |
| Retícula (Ben-Day) | pontos de tinta no lugar do degradê | **sim**, sutil: no clarão do disparo de 4+ e no selo final de 5 e 6 | `Fx.clarao`, `.clarao` e `.contagem.n5/.n6.final` em `css/estilo.css` |
| Desencaixe de cores | as chapas de cor saem do registro | **sim, em 2 lugares**: a armadilha revelada (o "?" vira carta) e o "+N" que estoura no placar. Só azul e rosa, 150 ms, volta ao registro | `case 'revelou'` (~1223), `Fx.orbes` → placar (~1180) |
| Onomatopeia desenhada | o som escrito no quadro | **sim, 4 momentos**: ruptura "plonc" (pequena, caindo), Bolso que salva "fump", disparo de 5+ "fuuu!", armadilha "tchã!" | `case 'ruptura'` (~1197), `'salvo'` (~1206), disparo, `'revelou'` |
| Quadro congelado | a ação para num painel com moldura | **sim, só Sinfonia e Virada**: 250 ms de pausa visual com borda de tinta e retícula, depois segue | `e.L === 6` (~1170), vitória com `e.virada` (~1243) |
| Linhas de velocidade / *smear* | rastro desenhado do movimento | **talvez**: no voo dos pontos até o placar e da carta jogada | `Fx.orbes`, `Fx.voar` |
| Cada personagem com seu estilo | cada aranha anima de um jeito | **depois**: a Diana em dois (ágil, de gato), a Dona Coruja em uns (calma) | falas, avatares |
| Tela partida em painéis | dois quadros lado a lado | **depois**: só no versus (Você × rival) | janela do versus |
| Glitch, *kirby krackle*, tremor contínuo | ruído dimensional | **não** | — |

## 3. O plano

### Fase 0: protótipo atrás de uma bandeira (feita)
- `Fx.cfg.impresso`: `?impresso=1` na URL liga e fica guardado no aparelho (`diceduel.impresso`); `?impresso=0` desliga.
  Sem a bandeira, nada muda (a ordem das chamadas e o tempo da festa são os de antes).
- Três coisas, em `js/efeitos.js` (`reticula`, `desencaixe`, `quadro`) e no fim do bloco do clarão em `css/estilo.css`:
  - **anel de retícula** no clarão do disparo de 4+, na cor de quem disparou (azul ou rosa), abrindo em 6 poses seguradas;
  - **desencaixe** na armadilha revelada: a chamada e o painel de quem armou ganham as chapas azul e rosa fora do
    registro, em 3 poses (420 ms), e voltam;
  - **quadro congelado** na Sinfonia: 260 ms com tudo parado (as animações da página e as partículas; os orbes empurram
    o relógio deles), moldura de papel com fio de tinta e retícula nas bordas. O tremor e as chamadas ("Sinfonia!",
    "Harmonia!") vêm quando a imagem volta a andar. O relógio da vez, a rede e o motor não param.
    Ele vem depois do impacto que a partida já tem (`Fx.impacto`, 150 ms na corrente de 6): o impacto incha a corrente,
    o quadro congela a tela. Se, somados, os 410 ms parecerem travamento, o quadro passa a substituir o impacto.
- `node tools/impresso_demo.js` grava a mesma sequência sem e com (celular, 390 px) em `builds/impresso/`
  (`sem.webm`, `com.webm` e quadros). **Decidir olhando; se não ficar melhor, para aqui.**

### Fase 1: o sotaque no jogo de sempre (feita)
Ligado por padrão (`?impresso=0` desliga no aparelho, para comparar; `?impresso=1` volta a ligar). Tudo em
`js/efeitos.js`, `css/estilo.css` e nos eventos de `js/jogo.js`; nada nas regras nem no servidor.

| Momento | O que acontece |
|---|---|
| Disparo de 2 a 4 | a cascata dos dados e o selo que conta (+1, +2, +4) andam **em dois**: poses seguradas (`steps`) em vez de deslizar. A corrente curta é "desenho de quem está aprendendo" |
| Disparo de 4+ | o clarão ganha o **anel de retícula** na cor de quem disparou (fase 0) |
| Disparo de 5 e 6 | cascata e selo **fluidos**, selo final em mel com retícula clara, e a onomatopeia "FUUU!" (6: "FUUUM!", maior) quando a festa estoura |
| Sinfonia e Virada | o **quadro congelado** (260 ms, moldura de papel e retícula nas bordas); a chamada vem depois |
| "+N" de 4 ou mais no placar | chega com as chapas azul e rosa fora do registro e assenta |
| Armadilha revelada | chamada e painel fora do registro (fase 0) e "TCHÃ!" na cor do dono |
| Salvo (Bolso ou Âncora) | "ufa!", pequeno e verde-claro |
| Ruptura de 2+ | "plonc", pequeno, sem as chapas, **caindo** devagar: a ruptura continua gentil |

**Regras do sotaque:**
- **Uma onomatopeia por lance:** outra que chegue em menos de 700 ms fica de fora.
- **Só papel, tinta, azul e rosa:** a Fredoka que já carrega (nada novo na CSP); a retícula é desenhada num canvas uma
  vez por cor (`data:`, já permitido).
- **Obedece aos Ajustes:** sem "Animações" ou com "reduzir movimento", nada disso aparece; sem "Brilhos e confete",
  nem retícula, nem quadro, nem onomatopeia.
- **Sem pisca-pisca:** no máximo um clarão e um quadro congelado por lance.

**A medir no teste com gente:** se o quadro congelado (somado ao impacto de 150 ms) lê como festa ou como travamento;
se as onomatopeias são lidas ou viram ruído; se a cascata em dois parece "estilo" ou "o celular engasgou".

### Fase 2: o cosmético Gibi (2 a 3 dias)
Para quem quiser o estilo inteiro, sem impor a ninguém:
- **Mesa Gibi** (Loja, ~250 moedas): feltro com retícula, chamadas viram caixas de legenda (retângulo, borda de tinta),
  onomatopeias maiores, toda cascata em dois até o quinto dado.
- **Dado Retícula** (Loja): marfim com contorno de tinta e pips de retícula. A skin já vale na corrente, no Bolso, na
  Mesa e na rolagem 3D.
- **Equivalente ganho jogando** (regra da progressão): a Mesa Gibi também como presente de um nível novo (o 7, que hoje
  não dá nada).
- Mexe em: `R.CATALOGO` (`shared/regras.js`, o servidor valida as compras), `MESAS_VISUAL` / `DADOS` (`js/jogo.js`),
  classe `mesa-gibi` no `body` e o bloco de CSS dela; teste de compra em `tools/fumaca.js` e na API.

### Fase 3 (talvez): o estilo por personagem e o versus em painéis
Só se a Fase 1 passar no teste com gente.

### Interface de gibi (v0.15, pedido do dono)
Depois da Fase 1 em produção, o dono pediu mais: o nome "Dice Duel" estava fraco (texto liso, em Fredoka, creme e mel) e o
gibi podia ir para a interface toda. Isso muda a decisão do §1 ("só um toque"): **a interface passa a ser de gibi
aconchegante**, no mesmo estilo dos retratos e da arte da história (adesivo chapado, contorno cacau, uma sombra dura) mais
o impresso. Tudo no fim de `css/estilo.css`, sob `.impresso` (`?impresso=0` volta ao visual anterior, menos o letreiro, que vale sempre):

| Peça | Como ficou |
|---|---|
| **O letreiro** (tela inicial, cabeçalho, começo da partida) | SVG em 4 camadas: sombra, uma borda de papel larga que junta as letras num recorte só (o adesivo), a chapa fora do registro (**azul em DICE, rosa em DUEL**: você e o rival) e a letra com contorno cacau. Empilhado, em caixa alta, torto (−5°). Entra como adesivo colado, em 4 poses. Contorno cacau sozinho some na noite; a borda de papel é o que o faz ler |
| **Botões** (Jogar, Online, Vamos lá...) | cor chapada, contorno cacau e sombra dura cacau; o Jogar tem retícula na metade de baixo, a "sombra impressa" |
| **Balões** (a saudação da tela inicial e as falas do rival) | contorno cacau, cantos redondos e o rabinho apontando para quem fala |
| **Fichas dos jogadores** | quadros de gibi: contorno e sombra dura cacau; a cor da vez segue por fora |
| **Chamadas** | caixa de gibi: contorno cacau e a chapa da cor do momento deslocada (mel, rosa ou lilás), no lugar do aro |
| **Janelas** | contorno e sombra dura cacau |
| **Começo da partida** | o letreiro no alto e os dois lados como quadros frente a frente, cada um com a retícula da sua cor (azul você, rosa o rival), tortos para lados opostos (empilhados no celular, lado a lado a partir de 600 px); entre eles, um "VS" numa explosão de mel com contorno cacau e as chapas azul e rosa, que estoura em poses seguradas (o selo redondo com × da 1.ª versão o dono não aprovou) |
| **Fundo** | retícula clara nas bordas da noite, limpa no meio |

**O que ficou de fora, de propósito:** os dados (as skins e a rolagem 3D seguem como estão: contorno neles mexeria em toda
skin); o ícone do app e a prévia de compartilhamento (`img/`), que pedem arte nova; e trocar o nome do jogo, que o dono não
pediu (o pedido foi a forma do nome).

### Legibilidade (v0.16, pedido do dono)
A retícula atrás do texto atrapalhava a leitura no perfil, nas Tarefas, nos ícones de baixo (Deck, Loja, Regras,
Ajustes) e nos botões do topo. Eles ficaram lisos, com um contorno de papel mais firme e uma sombra dura; no Jogar, a
retícula ficou só na faixa de baixo, abaixo da palavra. **Regra daqui em diante: textura nunca atrás de letra.** Os
pontinhos ficam no fundo da página, onde não há texto.

### Proposta: o caderno e o nanquim (reflexão; a 1.ª parte foi feita na v0.17, abaixo)
O dono pediu para pensar em mais gibi: páginas e modais com textura e cor de nanquim, rabiscos, traços de tinta, papel
rasgado, tudo ligado ao enredo. **Vale fazer, com uma condição: cada textura conta um pedaço da história, e fica só onde a
história está.** Cada material tem um sentido:

| Material | O que é na história | Onde entra | Onde não entra |
|---|---|---|---|
| **Papel de caderno** (pautado, margem vermelha) | o Caderno da Diana, que é o caderno de pesquisa disfarçado | o mapa da história, a página conquistada no fim do capítulo, as recompensas | Loja, Ajustes, Online, deck: são telas de uso, e precisam ser lidas depressa |
| **Borda rasgada** | as páginas que o Guaxinim arrancou e vendeu, uma para cada bicho | o topo da página do caderno e cada página recuperada | qualquer coisa que não seja página do caderno |
| **Fita adesiva** | a "Fita Dupla", a fita de DNA da cura | segurando a página no mapa e as páginas recuperadas | botões e partida |
| **Traço de nanquim** (sublinhado de pincel, carimbo, círculo à mão, seta) | a mão da Diana anotando | acentos pequenos: título sublinhado, carimbo "Feito", o capítulo da vez circulado, a seta do guia no Prólogo | atrás de texto, e na partida |
| **Aguada de nanquim** (manchas escuras) | as cenas pesadas da história | os quadros dramáticos do gibi (a revelação, o Cap. 8, a cura), com o colega da arte | o menu e as janelas: no celular, a janela cobre a tela e a aguada nem aparece |
| **Retícula e as chapas azul e rosa** | o jogo impresso | a partida e o letreiro, como hoje | atrás de letra |

**Por que não pôr em tudo:** a partida pede leitura rápida (painéis, Mesa, cartas), e a Loja e os Ajustes são
formulários. Textura demais ali repete o problema da retícula atrás do texto. O jogo continua aconchegante: o nanquim é
cacau e chapado, como a arte dos retratos (contorno cacau, uma sombra por forma), e não mancha fotográfica.

**Cuidados:**
- **Desempenho:** o rasgado é uma máscara com um SVG pequeno e fixo, e a sombra vira `drop-shadow` (a máscara corta o
  `box-shadow`). Nada de `feTurbulence` vivo.
- **Texto:** nota "da Diana" na margem só com fala aprovada (a regra da história, `docs/historia.md` §11). O protótipo
  usou o contador de estrelas no lugar dela.
- **Arte da história:** o colega faz os quadros. Os traços de nanquim são código, por cima de tudo, como o balão e a
  retícula (`docs/arte-historia.md`).

**O protótipo** (no `builds/`, fora do jogo): o mapa como página do caderno, com o topo rasgado, a fita mel com pontinhos
de dado, o título "O Caderno da Diana" em Caveat (a letra das receitas), as pautas azuis, a margem vermelha e o carimbo
"FEITO" torto nos capítulos vencidos.

**Fases, se o dono aprovar:**
1. **O mapa como página do caderno** e a **página conquistada** no fim de cada capítulo (a página rasgada que volta,
   presa com a fita). Cerca de 1 dia.
2. **Os acentos de nanquim:** carimbo, sublinhado de pincel nos títulos da história, o capítulo da vez circulado à mão,
   a seta do guia no Prólogo. Meio dia.
3. **A aguada de nanquim nos quadros dramáticos do gibi,** junto com o colega da arte.

### O caderno no jogo (v0.17, pedido do dono)
O dono gostou do protótipo e pediu dois ajustes: a margem vermelha não pode passar pelos retratos, e tocar num capítulo
deve mostrar as metas das estrelas. Ficou assim (`#janelaHistoria`, `js/historia.js`, fim de `css/estilo.css`):
- **A página:** papel pautado com a margem vermelha **no recuo**, fora dos cartões; os cartões são opacos (nem pauta nem
  margem passam por trás de retrato ou texto). Topo rasgado (máscara fixa, sem sorteio) e a fita mel com pontinhos de
  dado segurando a página. A sombra e a fita ficam num envoltório (`.folha-caderno`), porque a máscara cortaria as duas.
- **A mão da Diana:** o título "O Caderno da Diana" e o contador de estrelas em Caveat, com um traço de pincel embaixo do
  título; o capítulo feito ganha o carimbo verde "FEITO", torto; o capítulo da vez, uma **seta à mão na margem** (um
  círculo em volta cortava o retrato e o botão).
- **As metas:** tocar no capítulo (no texto, não no Jogar) abre, de leve, a lista: ★ vencer, ★★ e ★★★ as metas do
  capítulo, a regra da casa e a melhor vez. Um aberto por vez; tocar de novo fecha. **Com o rival em silhueta, as metas
  ficam fechadas** ("As metas aparecem quando você conhecer o rival"): elas contariam quem vem ("Não perca dado para o
  Fundo Falso"). O Prólogo diz que não tem estrelas.

## A identidade visual: o jogo de mesa da Diana
Depois de quatro rodadas (o impresso, a interface de gibi, a legibilidade e o caderno), a identidade cabe em poucas
regras. Elas servem para decidir as próximas telas sem inventar estilo novo a cada uma.

**A ideia:** um jogo de dados de mesa, à noite, com uma gata que anota tudo num caderno. **Aconchego de objeto de
verdade** (feltro, madeira, papel, fita, carimbo) **impresso como gibi** (contorno cacau, retícula, as chapas azul e rosa).

**Os materiais, um por superfície, cada um com um sentido:**

| Material | Sentido | Onde |
|---|---|---|
| **Noite** com pontinhos nas bordas | a sala escura em volta da mesa | o fundo de tudo |
| **Feltro e madeira** | a mesa: aqui se joga | a Mesa, a cena da tela inicial, as correntes |
| **Papel liso com contorno cacau** (adesivo) | as peças do jogo | fichas, cartas, botões, janelas de uso (Loja, Ajustes, deck, Online) |
| **Papel de caderno** (pauta, margem, rasgado, fita, carimbo) | o Caderno da Diana | só a história |
| **Nanquim** (traço de pincel, seta, carimbo) | a mão da Diana anotando | acentos pequenos, na história |
| **Retícula e chapas azul/rosa** | a festa impressa | os momentos da partida e o letreiro |

**As letras, cada uma com uma voz:** Fredoka é o jogo (títulos, números, botões); Nunito é a explicação (texto corrido);
**Caveat é a Diana escrevendo**, e só ela (o caderno, as receitas, as notas). Nada de quarta fonte.

**As cores, cada uma com um papel:** cacau é a tinta (contorno, texto); papel e mel são a base e a ação (o Jogar, o que
é seu de fazer agora); **azul é você e rosa é o rival**, sempre (as chapas, as fichas, o VS); eco, passo e oposto
(lilás, verde, laranja) são só as relações dos dados; o verde de carimbo é só "feito".

**As regras (cada uma veio de um ajuste do dono):**
- **Textura nunca atrás de letra.** Pontinho, pauta e margem ficam onde não há texto.
- **Nenhum traço por cima de rosto ou botão.** A margem corre no recuo; a seta fica na margem; o "?" vai ao meio da
  cabeça, mas dentro da caixa do retrato.
- **O material diz onde você está.** Feltro é jogar, papel liso é ajustar, caderno é a história. Se uma tela mistura
  dois, ela está errada.
- **Movimento de gibi só no que é festa ou revelação:** poses seguradas, quadro congelado, estouro. O resto se move
  macio.
- **Uma onomatopeia, um clarão, um quadro por lance.**

**Próximos passos possíveis, nessa linha:** a página conquistada no fim do capítulo, presa com a mesma fita; a aguada
de nanquim só nos quadros dramáticos do gibi (com o colega da arte); o ícone do app e a prévia de compartilhamento
a partir do letreiro.

## O rumo (análise crítica, v0.17)
Antes de mais estilo, as 14 telas foram fotografadas lado a lado no celular (`tools/telas.js`) e lidas contra as regras
acima.

**O que já funciona e não se mexe:** a paleta (cacau, papel, mel, azul você, rosa rival); os retratos pintados; o
letreiro adesivo; o começo da partida com o VS; o Caderno da Diana; os momentos de festa da partida. Juntos, eles já
fazem uma identidade própria: um jogo de mesa à noite, com uma gata que anota tudo, impresso como gibi.

**Os problemas, em ordem de peso:**
1. **A partida é a tela menos desenhada, e é onde a pessoa passa quase todo o tempo.** Os dois painéis têm o mesmo peso
   (o seu não se destaca do da Diana), há muitas etiquetas pequenas ao mesmo tempo ("Começa" embaixo de cada dado,
   chips de carta, "Corrente 0/6", "qualquer dado começa"), e a Mesa, que é o coração, é um retângulo verde com dados
   pequenos. A identidade está nas bordas e quase não está no centro.
2. **O estilo está se acumulando por camadas.** Impresso, interface de gibi e caderno vieram um por vez, em resposta a
   pedidos. Já há três tipos de cartão (os da Loja e do deck com aro mel, as fichas com contorno cacau, os capítulos do
   caderno), contornos que existem numas telas e não noutras, e cada ajuste mexe direto no CSS. Mais textura agora
   aumentaria esse ruído.
3. **Nada foi visto num celular de verdade nem por jogadores.** Desempenho (máscaras, sombras, o quadro congelado),
   legibilidade ao sol e o "isso parece travamento?" só se medem assim. Os dois pedidos de ajuste do dono (pontinhos atrás
   do texto, margem cruzando os retratos) mostram que a tela real pega o que a foto no computador não pega.
4. **A primeira impressão de fora ainda é a antiga:** o ícone do app e a prévia do link compartilhado.
5. **Arestas menores:** o letreiro empilhado fica apertado no cabeçalho pequeno (pede uma versão de uma linha); a tela
   "Como quer jogar?" ficou vazia sem a cena (pede a cena ou o letreiro, menores); havia texto desatualizado (o Online sem
   servidor ainda oferecia Diana e Coruja; corrigido).

**Vale a pena continuar? Sim, mas mudando o modo de trabalhar:** parar de acrescentar material novo e passar a
**consolidar, desenhar o centro e validar**. O ganho estético agora está em fazer o que já existe ficar coerente e bonito
onde importa, não em mais efeito.

**A sequência recomendada:**
1. **Consolidar (1 dia):** um só "adesivo" (contorno, sombra, raio e estados) para todo cartão e botão, em variáveis
   CSS, aplicado na Loja, no deck, no Perfil e na partida; o letreiro de uma linha para tamanhos pequenos; a cena (menor)
   de volta na tela dos modos. Sem mudar o jeito do jogo.
2. **Desenhar a partida (2 a 3 dias, em protótipos lado a lado antes de mexer no jogo):** o seu painel com mais peso que o
   do rival; a Mesa como protagonista (dados maiores, feltro e madeira mais ricos); menos etiquetas ao mesmo tempo (as
   ajudas aparecem quando servem); o retrato do rival maior e mais expressivo, porque a arte pintada já existe.
3. **Validar (meio dia + o teste com 5 a 8 pessoas de `design.md` §9):** um iPhone e um Android de entrada; medir
   legibilidade, 60 qps na cascata de 6 e o quadro congelado.
4. **O ícone e a prévia (meio dia), com a API de imagem:** a única peça desta lista em que a pintura ajuda mais que o
   código. Opções pelo `tools/arte_icones.py`, filtradas pelo crítico de ícones, e o dono escolhe.
5. **Só depois, a história:** a página conquistada presa com a fita; a aguada de nanquim nos quadros dramáticos, com o
   colega da arte.

**Andamento (v0.17):**
- **1. Consolidar: feito.** `--adesivo-pequeno` é o cartão em repouso da Loja, do deck e do Perfil (o selecionado já era
  igual em todos); o letreiro de uma linha no cabeçalho; a cena da Diana, menor, na tela dos modos.
- **2. A partida: a primeira passada, de baixo custo.** As cartas do rival viraram fichas baixas (ícone e nome; tocar
  mostra a carta) e os dados da Mesa cresceram de 13% para 14,5% da largura no celular. A etiqueta da jogada na corrente
  ("Passo", "Oposto") foi para a direita: à esquerda cobria as etiquetas dos elos. As etiquetas embaixo dos dados da Mesa
  ficaram: com um dado escolhido, elas dizem o que acontece (±1, Bolso, 7, =), e isso é informação, não ruído. O
  redesenho maior da partida (o seu painel, o retrato do rival) espera o teste num celular de verdade.
- **4. O ícone e a prévia: o ícone fica** (vetor: um dado com contorno cacau no feltro, emoldurado de madeira, já é a
  identidade e lê bem a 32 px; pintado, perderia nitidez pequeno). **A prévia foi refeita em código**, sem a API: a
  antiga anunciava o blefe (que saiu na v0.13) e a Coruja como rival direta. `tools/previa.js` a monta a partir do
  próprio jogo (o letreiro, a cena da Diana à mesa, a noite pontilhada), então ela acompanha o visual. A descrição e o
  texto alternativo do link também foram atualizados. A API de imagem não foi necessária nesta rodada.

**O que não fazer:** textura nas telas de uso (Loja, Ajustes, deck, Online); textura animada; estilo próprio por tela; a
API de imagem para peça de interface (pauta, fita, carimbo, traço, retícula: em código saem com a cor exata, nítidos e
leves); qualquer mudança visual sem a foto de antes e depois nas telas reais.

**Como trabalhar daqui em diante:** a cada versão, `node tools/telas.js` fotografa todas as telas para olhar lado a lado;
toda proposta nova vem primeiro como protótipo sobre a tela real, com antes e depois, e passa pelas regras desta página.

## 4. Como verificar
- `node tools/fumaca.js`, `node tools/estreia_e2e.js` (as chamadas do guia não podem atrasar), `node tools/layout.js`
  (onomatopeia e quadro não vazam em 360 px), `node tools/vercel_local.js` (CSP), `python3 tools/empacotar.py`.
- Num iPhone de verdade: a cascata de 6 com o quadro congelado não pode cair abaixo de 60 qps.
- **No teste com 5 a 8 pessoas** (`design.md` §9): o quadro congelado da Sinfonia lê como festa ou como travamento?
  As onomatopeias são lidas ou viram ruído? Alguém sente que "deixou de ser aconchegante"?

## 5. Recomendação
Fases 0 e 1 feitas. A Fase 2 vale depois do teste com gente: é o lugar
certo para o estilo inteiro, porque quem escolhe é o jogador.
