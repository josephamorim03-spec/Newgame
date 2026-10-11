# Dice Duel: a arte do modo história (proposta)

> Como desenhar "O Caderno da Diana" (`docs/historia.md`) com a API de imagem sem perder a identidade do jogo. Parte
> do que já está aprovado: o estilo dos retratos (`arte/retratos.json`: adesivo chapado, contorno cacau, uma sombra e um
> brilho por forma, a paleta do jogo) e o sotaque de gibi impresso que já está em produção (`docs/visual-impresso.md`:
> retícula, desencaixe azul e rosa, onomatopeias, quadro congelado). Nada aqui foi gerado para o jogo ainda; o §3 é um
> teste de modelos com uma imagem cada.

## 1. A ideia: a API desenha as peças, o código monta o gibi

Pedir quadros inteiros prontos ("um painel de gibi com a Diana no lago e um balão") é o jeito mais caro e mais
instável. Cada quadro sai num traço um pouco diferente, a Diana muda de cara entre um quadro e outro, o texto dentro da
imagem sai torto, e a cada ajuste de fala o quadro precisa ser refeito. Um gibi de 8 capítulos tem uns 120 quadros.

A proposta é o contrário, em camadas:

| Camada | Quem faz | Por quê |
|---|---|---|
| **Fundo** de cada lugar (o quarto da Diana, a lagoa, a toca…) | API, uma vez por lugar | é o que muda pouco; sem personagem e sem texto |
| **Personagem** em pose e expressão, recortado | API, a partir do retrato aprovado | a mesma pose serve a muitos quadros |
| **Objeto** (o curativo, o cone, a xícara com girino, o pão, a pipeta) | API, recortado | as gags que voltam são objetos trocados por cima da mesma Diana |
| **Quadro, balão, legenda, onomatopeia, retícula, desencaixe, linhas de movimento, "…"** | código (CSS, SVG) | já existe no jogo; é o que dá a cara de gibi e fica igual em todo quadro |
| **Enquadramento** (plano geral, médio, close) | código: a mesma imagem, mais perto | um close não precisa de arte nova |

Ganhos:
- **A Diana é a mesma em todo quadro**, porque é a mesma imagem.
- **A piada do nariz** (8 enfeites) vira 8 adesivos pequenos sobre uma Diana só, e não 8 Dianas.
- **Uma fala reescrita não refaz arte nenhuma**, porque o texto mora no código.
- **O peso fica pequeno**: um quadro é um fundo já carregado, um adesivo e texto.
- **O movimento sai barato**: o fundo anda devagar, o personagem anda mais rápido, o objeto cai.

**O mural sai sem a API.** Ele é cortiça com fotos e barbante. A cortiça é um fundo; as fotos são os retratos que o
jogo já tem, em moldura de polaroide feita em CSS; o barbante é uma linha SVG; os post-its são CSS. Assim ele cresce
sozinho a cada capítulo vencido, carimba os rivais vencidos e põe a foto **do ícone de quem joga** no meio, como pede
a revelação.

## 2. O que a API faz, e o que não faz

**Faz:** fundos, personagens em pose e expressão, objetos. Sempre:
- **sem texto:** nada de letras, números, placas, lombadas escritas;
- **chapado:** sem retícula pedida ao modelo, que a desenha mal e cada vez de um jeito; a retícula entra no código, por
  cima de tudo, igual em toda peça;
- **com o retrato aprovado como referência** de cada personagem, e as marcas escritas no pedido.

**Não faz:** balão, legenda, onomatopeia, quadro, retícula, desencaixe, linhas de movimento, emanata (o suor, o "!",
o "?"), o mural, as páginas do caderno, a fita da cura, o título riscado ("DianaDice"). Tudo isso é código, e é ele que
amarra as peças num gibi só.

**Um tratamento único no fim,** em código e igual para tudo:
- contorno no cacau do jogo (o `tools/arte_icones.py` já alinha);
- cores puxadas para a paleta;
- uma sombra de retícula fina nas áreas escuras do fundo;
- o desencaixe azul e rosa só nos quadros de impacto (a revelação, a cura).

## 3. O teste de modelos (uma imagem por modelo, qualidade baixa)

O projeto usa o `gpt-image-1`. A chave tem acesso a modelos mais novos. Mesmo pedido para todos:
- a Diana aprovada (`arte/fonte/diana.png`) como referência;
- da cintura para cima, atrás da mesinha de feltro, empurrando um dado com a pata, olhar de lado desconfiado.

Prancha em `builds/arte/comparacao/prancha.jpg`.

| Modelo | As marcas da Diana | Fora do pedido | Fundo transparente | Tokens de entrada (imagem) |
|---|---|---|---|---|
| gpt-image-1 | **perdeu**: ferida virou ponto na testa, um olho castanho, orelha alaranjada | — | sim | 4.354 |
| gpt-image-1.5 | ferida virou mancha rosa; mancha de gata tricolor no corpo | mancha no corpo | sim | 4.354 |
| gpt-image-2 | **todas certas** (ponta preta na orelha certa, riscos, ferida no dorso do nariz) | camisa e suspensório | **não** (veio branco) | 1.024 |
| gpt-image-2.5-flare | todas certas | bandana laranja | sim | 1.024 |
| **gpt-image-2.5-sunburst** | **todas certas** | **nada** | **sim** | **1.024** |

**Leitura:**
- Os modelos 2.x seguram a identidade da Diana, que o `gpt-image-1` perde mesmo com a referência.
- Os 2.x gastam um quarto dos tokens de imagem na entrada.
- O `gpt-image-2.5-sunburst` foi o único que fez exatamente o pedido, com fundo transparente.
- Os 2.x não aceitam o `input_fidelity` que o projeto manda hoje (a ferramenta precisa tirar esse campo para eles).
- O `gpt-image-2` não faz fundo transparente: com ele, entra o verde-croma que a ferramenta já recorta.

Uma imagem por modelo é pouco para decidir de vez. A proposta é usar o **sunburst** no piloto e o **flare** como
segunda opção na mesma prancha, para o crítico e o dono escolherem.

## 4. Como pedir (para sair igual sempre)

- **Um arquivo de pedidos por tipo** (`arte/historia/personagens.json`, `fundos.json`, `objetos.json`), no formato
  que o `arte_icones.py` e o `arte_lote.py` já leem. Cada pedido junta:
  - o estilo do jogo;
  - o bloco do tipo ("fundo, sem personagem, sem texto, formato 3:2, cores 20% mais apagadas que os personagens");
  - o pedido do item.
- **Referência de identidade:** o retrato aprovado do personagem.
- **Referência de estilo:** uma folha com 6 peças já aprovadas (dois retratos, duas cartas, um momento, uma pata). O
  `arte_lote.py` já manda isso ("estilo").
- **Folha de modelo primeiro.** Para cada personagem, antes dos quadros, uma folha com 5 expressões: neutra, feliz,
  murcha, desconfiada e surpresa (o Urso troca uma por "dormindo"). Aprovada, ela vira a referência de todas as poses
  dele. É o que estúdios fazem para o personagem não "andar" entre quadros.
- **As marcas fixas no pedido e no crítico.** A lista da Diana (`docs/design.md` §6) vai em todo pedido dela e no
  briefing do crítico, que reprova a peça sem as marcas.
- **Rascunho barato, final caro.** Os rascunhos saem em qualidade baixa, em lote; só a escolhida sai em qualidade
  alta, com a escolhida como referência (o caminho de "candidatos" do `arte_lote.py`).

## 5. A revisão (como as falas)

Sem nova regra, só o processo de hoje:
1. Rascunhos em lote.
2. O **crítico** (`.claude/agents/critico-de-icones.md`, com um briefing novo para quadros: as marcas, a leitura no
   tamanho do celular, nada de texto) deixa passar 3 por item.
3. O **dono escolhe** numa página igual à das falas: a prancha de cada item, com Aprovar, Ajustar (com nota) e Recusar.
4. A escolhida sai em qualidade alta e passa pelo tratamento do §2.
5. Ela entra no jogo. Peça sem aprovação não entra: o teste da história reprova, como faz com as falas.

## 6. Os efeitos de gibi (código)

No jogo de sempre já estão em produção (`visual-impresso.md`, fases 0 e 1):
- a retícula no clarão;
- o desencaixe na armadilha revelada;
- o quadro congelado na Sinfonia e na Virada;
- as onomatopeias;
- a cascata em dois.

No leitor da história, os mesmos recursos, nas horas certas:

| Recurso | Onde |
|---|---|
| **Close sem arte nova** (a mesma imagem, mais perto) | "Não pergunte do nariz.", o rosto da Diana na revelação |
| **Quadro mudo** (sem balão, um tempo parado) | a Coruja entregando a última página, o ferimento fechado |
| **Quadro congelado com retícula e desencaixe** | o mural revelado, a fita da cura encostando no nariz |
| **Onomatopeia desenhada** | o dado caindo da mesa ("toc"), o ronco do Urso, o pão crescendo |
| **Emanata** (gota de suor, "!", "?", "…" flutuando) | as reações secas da Diana; o Coelho atrasado |
| **Linhas de movimento** | a pata empurrando o dado, o Guaxinim fugindo |
| **Virar a página** (a transição entre cenas) | entre o interlúdio e a chegada de cada bicho |
| **Paralaxe leve** (fundo devagar, personagem mais rápido) | a primeira cena de cada lugar |

Tudo respeita "Animações" nos Ajustes e o "reduzir movimento" do sistema, como hoje.

## 7. Quanto é

Contando o que o roteiro pede, sem refazer o que o código monta:

| Tipo | Quantos |
|---|---|
| Folhas de modelo (8 personagens) | 8 |
| Poses para os quadros (a Diana tem mais: sentada, com a pipeta, com o pincel, no espelho, cobrindo o mural) | ~40 |
| Fundos (9 lugares, mais a cortiça) | 10 |
| Objetos (os 7 enfeites do nariz, o cone-abajur, a xícara, o pão em 3 tamanhos, a pipeta, a carta "?") | ~18 |
| **Peças finais** | **~76** |

- **Rascunhos:** com 4 por peça, uns 300 em qualidade baixa e uns 76 em alta. No teste, um pedido em qualidade baixa
  com referência gastou ~1.500 tokens nos modelos 2.x.
- **Peso no jogo:** o objetivo é que cada capítulo some no máximo ~250 KB de imagens. Fundos em WebP de 960 px, poses
  de 480 px, objetos de 240 px, num arquivo por capítulo (`js/historia_arte_c1.js`…) carregado só quando o capítulo
  abre. O jogo de sempre não fica mais pesado.

## 8. O plano

1. **Piloto (1 a 2 dias), só o Prólogo e o Capítulo 1:**
   - **Arte nova:**
     - as folhas de modelo da Diana e do Sapo;
     - 4 poses da Diana e 3 do Sapo;
     - 2 fundos (o quarto da Diana e a lagoa) e a cortiça do mural;
     - 3 objetos (o curativo de pips, os dois em X e a xícara com girino).
   - **Código:**
     - o leitor de gibi em camadas (fundo, personagem, objeto, balão);
     - os efeitos do §6;
     - o mural montado com os retratos que já existem.
   - **Gasto:** uns 60 rascunhos em qualidade baixa e 15 finais.
   - O dono vê o Prólogo e o Capítulo 1 desenhados e decide se a direção vale para o resto.
2. **Os outros capítulos,** um por vez, no mesmo processo, já com o modelo, os pedidos e o crítico afinados no piloto.
3. **Depois,** se fizer sentido: um cosmético "Gibi" na Loja com a mesma linguagem (`visual-impresso.md`, fase 2).

## 9. Riscos

| Risco | O que fazer |
|---|---|
| O modelo novo muda de comportamento ou sai do ar | o modelo fica escrito no `.json` de cada peça (como hoje); as peças aprovadas ficam em `arte/fonte/`, não dependem da API depois |
| A Diana "anda" entre poses | folha de modelo aprovada como referência de toda pose; o crítico confere as marcas |
| O gibi pesa no celular | arte por capítulo, carregada sob demanda; o `tools/layout.js` e um teste de peso por capítulo |
| A cara de IA (dedos a mais, olho torto) | o crítico reprova; poses simples, de meio corpo, sem mãos complicadas |
| Peça parecida com personagem ou marca de alguém | nada de nome de obra no pedido; o pasto de hexágonos sem nada de marca (como a ovelha de hoje) |

## O caminho misto (decisão do dono, depois de ver as duas versões)

O dono pediu o melhor dos dois mundos. Ficou assim:

| Peça | Quem faz | Por quê |
|---|---|---|
| **A cena** (o bicho no lugar dele, a Diana à mesa) | a API, quadro inteiro (`tools/historia/quadros.py`, `arte/historia.json`) | é onde os quadros inteiros foram bem: a identidade dos bichos e a composição |
| **O nariz da Diana** | a API, **uma vez** por enfeite, numa folha de modelo (`arte/historia/narizes/`); cada quadro da Diana a usa como referência | na 1.ª versão cada quadro inventava o enfeite; o dono pediu um padrão (a lã é o modelo) |
| **As receitas** | o papel do caderno uma vez (`arte/historia/pagina-base.png`) e o desenho chapado nele; título e notas em letra de mão pelo código | os desenhos da 1.ª versão pareciam objetos em cima do livro, com sombra e volume |
| **O mural** | **o código**, com os retratos que o jogo já tem (polaroide, barbante, post-it, cartão, carimbo, a hélice de dados) | é igual em todo quadro e cresce sozinho; nos quadros pintados ele aparece só de canto |
| **Balão, rabinho, retícula, desencaixe, onomatopeia, linhas de movimento, close** | o código | o balão fica sobre a arte, do tamanho da fala, longe do rosto, com o rabinho apontando para a boca marcada em cada arte (`boca`); o close é uma câmera que leva a cabeça de quem fala ao centro |

O pedido de arte agora pede o estilo do jogo sem desvio (fundo chapado, no máximo três objetos, só a paleta do jogo, sem
retícula pintada) e um canto livre para o balão. O piloto (Prólogo, Cap. 1, receitas, mural, a revelação e o fim) está em
**Quadros do Caderno da Diana** (https://claude.ai/artifact/4LfMUuqa94bKGNzQKBH1u5). Os quadros marcados "arte antiga" esperam
crédito na API; a fila está em `arte/historia.json` (`_refazer`).

## Plano de uso do crédito (econômico e direcionado)

Estado: 61 desenhos nas páginas. **17 já estão no estilo novo** (o Prólogo, as receitas do Sapo e da Raposa, os quadros
corrigidos e as 4 cenas novas). **44 ainda são da 1.ª versão.** O cachecol foi aprovado como está.

### O que aprendemos (vale para todo pedido)
- **gpt-image-2**, com o retrato aprovado de cada bicho como referência: segura as marcas da Diana (a ponta preta na
  orelha certa, os dois riscos, os olhos azuis).
- **O nariz vem da folha de modelo** (`arte/historia/narizes/`), nunca do texto: o texto sozinho errou o enfeite (o
  curativo apareceu na Diana curada).
- **Estilo do jogo sem desvio:** contorno cacau, chapado com uma sombra e um brilho, só a paleta do jogo, fundo com
  poucas formas e no máximo três objetos, sem retícula pintada (o código põe), sem texto além do letreiro pedido.
- **Um canto livre para o balão**, e a boca e a cabeça marcadas depois (de graça, no `arte/historia.json`).
- **Dados: poucos, grandes e da cor do dono.** O gerador erra o arranjo das bolinhas; a troca de bolinhas conserta de
  graça cerca de 1 em 3, e o resto custa redesenho. Dado que não é da piada não entra no pedido.
- **Correção pequena é edição da arte atual**, não pintura nova (a Ovelha só com os hexágonos): sai certa de primeira
  e não muda o resto do quadro.
- **Pedido de gesto ou direção precisa dizer o lado** (o girino precisou de 3 tentativas até o pedido dizer onde ficam
  as linhas de movimento).
- Taxa de refazer observada: **cerca de 1 em 4** quadros novos.

### As regras de gasto
1. **Uma imagem por quadro, em qualidade média**; a alta só nos quadros de impacto (os closes, a revelação e a cura).
   Variações só quando a primeira falha.
2. **Não consertar dados de quadro que vai ser repintado**: o redesenho já traz dados novos, e só os que a troca de
   bolinhas não consertar vão para o `dados_ia.py`, com **uma** variação primeiro.
3. **Dado miúdo de fundo não se conserta**: no pedido novo ele simplesmente não existe.
4. **Conferir cada lote antes do próximo** (marcar boca, cabeça e dados, trocar as bolinhas, olhar o resultado), e o
   dono vê o lote na página antes de seguir.

### As fases
| Fase | O quê | Imagens (estimativa) |
|---|---|---|
| 1 | Os 19 quadros mais vistos da 1.ª versão (3 ou mais aparições nas páginas: a revelação, o Coelho, o Sapo, a Diana de cada capítulo, o fim), na ordem da história | 19 + ~5 refeitas |
| 2 | Os outros 17 quadros de personagem e as 8 receitas no papel do caderno (edição do papel-base) | 25 + ~6 refeitas |
| 3 | Os dados que sobrarem errados nos quadros novos e grandes (≥ 6% da largura), uma variação cada | ~15 + ~5 |
| **Total** | | **~75 imagens**, contra ~250 de repintar tudo e pedir 3 variações por dado |

A coruja de dois óculos no c7-lacre entra na fase 2, como edição (só os óculos). O valor de cada imagem aparece no
painel da OpenAI (platform.openai.com → Usage); o plano conta imagens porque o preço por imagem muda com o modelo e a
qualidade.
