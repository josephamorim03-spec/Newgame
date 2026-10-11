# Dice Duel

Um duelo de dados 1×1 aconchegante, para celular e navegador.

Os dois jogadores disputam a mesma Mesa de 5 dados e montam **correntes** de dados que se sincronizam:
- **Eco:** o mesmo número;
- **Passo:** um a mais ou a menos;
- **Oposto:** soma 7.

Cada um guarda um dado no **Bolso**, escolhe a hora de **disparar** a corrente para marcar pontos e leva um
**deck de até 3 cartas** com efeitos e armadilhas. A armadilha fica virada para baixo: o rival vê um "?", sabe que é
uma armadilha, mas não qual. A partida vai a 16 pontos e dura de 6 a 8 minutos.

**Progressão sem pagar para vencer:**
- moedas só vêm de vitórias, e rendem mais com margem maior e menos Mesas;
- elas compram cartas novas (que dão estilo, não força) e cosméticos (skins de dado, ícones, mesas);
- a experiência sobe em toda partida;
- um rating evita que jogador forte farme o modo fácil.

**Ícones:** básicos, animais humanizados (raposa, sapo, urso, coelho, guaxinim), natureza (cogumelos, monstera, cacto) e os
**especiais**, de moldura dourada: Biscoito, Gordinho, Cafú e Bandoleiro.

**Online:** conta com nome e senha, ranking, e salas para jogar com amigos. Você manda um link de convite (`/?sala=CODIGO`)
e o amigo cai direto na sala. O servidor é a autoridade da partida e roda na Railway (`docs/servidor.md`).

> Esta branch (`DiceDuel`) guarda só o Dice Duel. A `main` do repositório continua com o design do LIMIAR,
> como manda a política de branches do projeto.

## Jogar

- **Direto:** abra `index.html` no navegador (funciona por `file://`, sem servidor).
- **Arquivo único, bom para mandar a quem testa ou abrir no celular:** `dist/dice-duel.html`.
- **Gerar o arquivo único de novo depois de mexer no código:** `python3 tools/empacotar.py`.
- **Com o online:** `npm install && npm start` e abra `http://localhost:8080`. Na Railway, siga `docs/servidor.md`.

**Contra quem (v0.15: o Jogar abre os dois modos, nesta ordem):**
- **História**, "O Caderno da Diana": a Diana, uma gata branca de olhos azuis, ensina a jogar e manda você atrás de sete
  bichos, um por capítulo (até a Dona Coruja, que lê a Mesa). Quem vem fica em silhueta até você tentar;
- **Online**: um amigo por link de convite, ou a fila (vale rating e moedas).

**Em Ajustes dá para ligar e desligar:**
- som e música, com volume;
- animações e brilhos;
- tremor e vibração;
- falas do rival e etiquetas de ajuda.

## O que tem aqui

| Caminho | O quê |
|---|---|
| `index.html` | a página do jogo |
| `css/estilo.css` | o visual aconchegante (mesa de madeira, feltro, fichas de papel) |
| `js/jogo.js` | tela, rivais, bons momentos, recordes, ajustes, loja e a janela Online (conta, salas, ranking) |
| `shared/regras.js` | o motor de regras, puro, usado pelo navegador e pelo servidor |
| `servidor/` | API, contas, ranking, salas e partida online (Node, Express, WebSocket, Postgres) |
| `js/retratos.js` | os rivais (Diana, Dona Coruja) e os ícones dos jogadores em vetor; a versão pintada, quando existe, vem de `js/retratos_pintados.js` |
| `js/rolagem.js`, `shared/rolagem.js`, `js/lancamentos.js` | a rolagem 3D: lançamentos gravados com física (do Cronomotor), corrigidos para a face da regra |
| `js/audio.js` | efeitos e trilha lo-fi sintetizados na hora (Web Audio, sem arquivos de áudio) |
| `js/efeitos.js` | partículas, dados voando, chamadas de "bom momento", contagem do placar |
| `sim/` | regras de referência em Python e os experimentos de balanceamento |
| `tools/empacotar.py` | gera o HTML único |
| `tools/lancamentos/` | exporta os lançamentos gravados do Godot e monta `js/lancamentos.js` |
| `tools/arte_icones.py` | pinta os retratos com a API de imagem da OpenAI, no estilo do jogo (pedidos em `arte/retratos.json`, com o vetor de cada personagem como referência), e os embute no jogo |
| `tools/arte_dados.py` | pinta a face das skins de dado que o CSS não faz bem (a lã da Ovelha, a madeira da Coruja, o verde do Sapo) com o gpt-image-2 (`arte/dados.json`) e embute em `js/dados_pintados.js` |
| `tools/historia/baloes.py` | grava em `arte/historia.json` os ajustes do editor de balões (posição, largura, letra e ponta do rabinho de cada balão, feitos à mão na página `quadros.py paginas --editor`) |
| `tools/historia/dados_quadros.py` | conserta os dados dos quadros da história trocando só as bolinhas: acha as faces de cada dado pelas arestas de tinta da arte e desenha as bolinhas certas nelas; só mexe quando a face achada é confiável, e recusa um dado impossível (faces vizinhas somando 7, canto espelhado) |
| `tools/historia/dados_ia.py` | os dados que a troca de bolinhas não conserta: recorta cada um, pede ao gerador variações dele com as bolinhas certas, o dono escolhe e a escolhida volta exatamente ao lugar (precisa de crédito na API) |
| `tools/historia/quadros.py` | os quadros do modo história: pinta as artes de `arte/historia.json` (gpt-image-2, com os retratos de referência) em `arte/historia/quadros/`, monta as páginas com as falas por cima, para revisar, e gera os quadros do gibi do jogo (`quadros.py jogo` → `js/historia_quadros_dados.js`, 768 px) |
| `tools/referencias.js` | desenha os vetores de `js/retratos.js` em `arte/referencia/` (rode de novo quando mudar um vetor) |
| `tools/fumaca.js` | teste de fumaça: joga partidas inteiras no navegador e falha com qualquer erro |
| `tools/estreia_e2e.js` | a estreia e o guia: primeira partida sem cartas, explicações uma vez só, fim da derrota, a partida seguinte e quem já jogava |
| `tools/previa.js` | monta a imagem de compartilhamento (`img/previa.png`) a partir do próprio jogo: o letreiro e a cena da Diana |
| `tools/telas.js` | fotografa as 14 telas do jogo no tamanho de celular, para revisar a identidade visual lado a lado |
| `tools/impresso_demo.js` | grava o protótipo das técnicas de gibi (`?impresso=1`, `docs/visual-impresso.md`) sem e com, para comparar |
| `tools/regras.js` | testes dirigidos das cartas (Pressa, Remendo, Espelho, armadilha virada, Âncora × Interferência) |
| `tools/layout.js` | verificador de layout em 5 larguras: texto vazando, fora da caixa, quebrado, descentralizado |
| `tools/macaco.js` | o macaco: toques ao acaso em tudo, com vigia de travamento e de estado impossível |
| `tools/online_e2e.js` | ponta a ponta do online: dois navegadores, conta, convite, partida, revanche, ranking |
| `tools/vercel_local.js` | simula o Vercel (só o que o `.vercelignore` publica, com a CSP do `vercel.json`) e joga uma partida |
| `docs/design.md` | regras, cartas, números, decisões e por quê |
| `docs/pesquisa.md` | o que jogos de cartas no celular ensinam (deck pequeno, armadilhas, contra-jogo) |
| `docs/historia.md` | o modo história "O Caderno da Diana": roteiro em quadros, a Diana e a cura, os rivais, as gags e como vira jogo |
| `docs/arte-historia.md` | a arte do modo história: a API desenha as peças (fundo, pose, objeto), o código monta o gibi; o teste de modelos e o plano |
| `js/historia.js`, `js/historia_falas.js` | o modo história: os capítulos, o leitor de gibi, o mapa; as falas aprovadas (geradas por `tools/historia/piadas_fonte.py`) |
| `js/historia_quadros.js`, `css/quadros.css` | o desenho dos quadros pintados da história (a arte, a câmera, os balões com o rabinho até quem fala, a receita, o mural), o mesmo no gibi do jogo e nas páginas de conferência |
| `docs/progressao.md` | moedas, rating contra o farm, XP e níveis, loja, cosméticos, regras de monetização |
| `docs/visual-impresso.md` | técnicas do Aranhaverso no Dice Duel: o que cabe, o que não cabe e o plano |
| `docs/servidor.md` | o servidor: o que faz, regras contra abuso, como pôr na Railway, API |

## Verificar

```bash
cd sim && python3 valor_cartas.py      # valor de cada carta sozinha
cd sim && python3 informacao.py        # armadilhas: oculto × à mostra
cd sim && NOVAS=pausa,reverso,furto,lacre python3 decks.py   # os 402 decks das 15 cartas: algum domina? (meta 16; META=20 e META=24 também)
cd sim && NOVAS=pausa,reverso,furto,lacre JSON=/tmp/d.json python3 decks.py && JSON=/tmp/d.json NOVAS=pausa,reverso,furto,lacre python3 torneio.py   # os 20 melhores uns contra os outros
cd sim && python3 economia.py          # cartas compradas não superam as grátis; moedas por vitória
npm install && npm test                        # motor, API, salas, quedas, limite por par
export NODE_PATH=$(npm root -g)                # Playwright instalado globalmente (ou: npm i -D playwright)
node tools/fumaca.js                           # 3 partidas no navegador (celular, computador, Coruja)
node tools/estreia_e2e.js                      # a primeira partida, o guia e a tela do fim da derrota
node tools/historia_e2e.js                     # o modo história: mapa, gibi, Prólogo, Sapo, recompensa e só falas aprovadas
node tools/regras.js                           # as cartas fazem o que o texto delas diz
node tools/layout.js                           # layout em 360, 390, 430, 768 e 1360 px
node tools/online_e2e.js                       # online de ponta a ponta, com o servidor local
node tools/macaco.js                           # toca em tudo ao acaso e vigia travamentos e estados impossíveis
node tools/vercel_local.js                     # a página como o Vercel publica, com a CSP
```

## Estado

**v0.17, em produção** (a página no Vercel e o servidor na Railway, publicados da branch `DiceDuel`): o Caderno da Diana e a legibilidade.
- **A rolagem dos dados** (queixa de um jogador): nítida no celular (cada face montada em 2x), sem beira serrilhada
  nem risco solto ao lado do dado, e no ar com os cantos e as quinas redondos do dado parado (uma esfera em cada vértice).
- **Consolidação (o rumo, `docs/visual-impresso.md`):** um só cartão pequeno na Loja, no deck e no Perfil; o letreiro de
  uma linha no cabeçalho; a cena da Diana de volta na tela dos modos.
- **Duas queixas de jogador na partida:** sem saída (nada sincroniza, nem o do Bolso), a barra avisa na hora e traz o
  "Romper"; e tocar no dado do Bolso, que antes não fazia nada, agora o levanta: o dado tocado depois na Mesa fica
  guardado no lugar dele (a mesma troca, na outra ordem; o balanceamento não muda). Pegar o mesmo número que está no Bolso não
  oferece mais a troca (daria no mesmo): o dado vai à corrente.
- **As dicas do guia viram um balão da Diana** no painel dela, com o rabinho até o retrato: não cobrem mais a Mesa nem
  encostam na beira da tela. As chamadas de festa ("Passo!") ficam com a mesma margem dos dois lados.
- **A fala da Diana na tela inicial** fica em cima dela, centrada e em 1 ou 2 linhas equilibradas (ao lado da cabeça
  ela ficava espremida em 4 ou 5 linhas).
- **A partida:** as cartas do rival em fichas baixas e os dados da Mesa maiores; a etiqueta da jogada ("Passo",
  "Oposto") passou para a direita da corrente, onde não cobre mais as etiquetas dos elos.
- **Ajustes finos:** os botões liga/desliga em mel (a cor da ação), e a tela inicial maior no computador.
- **O fim da partida** com o placar em quadros, como o começo: retratos, pontos, o carimbo "VENCEU" e o título com as
  chapas azul e rosa.
- **A prévia do link** refeita a partir do jogo (`tools/previa.js`): a antiga ainda anunciava o blefe e a Coruja como
  rival direta.
- **O mapa da história é uma página do caderno:** pauta, margem vermelha no recuo (fora dos retratos), topo rasgado, a
  fita segurando a página, o título na letra da Diana com um traço de pincel, o carimbo "FEITO" e uma seta à mão no
  capítulo da vez.
- **Tocar num capítulo abre as metas das estrelas** (vencer e as duas do capítulo), a regra da casa e a melhor vez; com o
  rival em silhueta, as metas ficam fechadas.
- **Legibilidade:** sem pontinhos atrás do texto nos painéis do menu; no Jogar, só na faixa de baixo.
- A identidade visual em regras (materiais, letras, cores) está em `docs/visual-impresso.md`.

**v0.16:** o menu e o mistério da história.
- **O menu só tem o Jogar,** que abre os modos História e Online (nesta ordem). **A partida avulsa contra a Diana ou a
  Dona Coruja saiu** (os rivais estão na história; moedas de vitória, rating e Tarefas do dia agora vêm do online).
- **No mapa da história, como no Pokémon:** os rivais que a pessoa ainda não tentou são silhuetas com "?" e o nome do
  lugar fica fechado; tocar em Jogar revela (e perder não esconde de novo). O "?" fica no meio da cabeça de cada bicho.
- Detalhes em `docs/design.md` §8 e `docs/historia.md`.

**v0.15:** o modo história
em quadros pintados e a interface de gibi.
- **O gibi da história com arte:** onde a fala tem quadro, o gibi mostra o quadro pintado (64 artes, 768 px) com os
  balões no lugar que o dono ajustou, um por toque; perto e detalhe pela câmera, quadros mudos, as receitas em letra
  de mão no papel do caderno e o mural montado com os retratos (`docs/arte-historia.md`, "Os quadros no jogo").
- **O dado de cada bicho:** Sapo verde, Diana rosa, Coelho branco clássico, Coruja madeira, Ovelha de lã, Urso mel e a
  Raposa com o verde do Sapo; os dados dos quadros com as bolinhas de um dado de verdade.
- **A interface de gibi:** o letreiro virou um adesivo (contorno cacau, borda de papel, DICE com a chapa azul e DUEL
  com a rosa); botões, balões, fichas, chamadas e janelas ganharam contorno e sombra dura cacau; o começo da partida
  mostra os dois lados como quadros frente a frente. `?impresso=0` volta ao visual anterior (menos o letreiro).
  Detalhes em `docs/visual-impresso.md` §3.

**v0.14:** a primeira partida e a sensação de jogar bem.
- **A estreia:** na primeira visita, Jogar começa direto uma partida contra a Diana até 8 pontos, sem cartas (sem
  escolher rival nem montar deck). As cartas chegam na segunda; as armadilhas, depois dela.
- **O guia:** o primeiro Eco, Passo e Oposto, a primeira corrente de 3 e a primeira ruptura ganham, uma vez só, uma
  chamada que dá nome ao que a pessoa acabou de fazer ("Oposto! 2 e 5 somam 7").
- **Paciência:** segurar uma corrente que já podia disparar e ela render 2+ pontos a mais vira bom momento
  ("Valeu esperar!" na hora). É o primeiro bom momento que premia uma decisão, não um resultado.
- **Fim da derrota sem "+0":** os bons momentos vêm primeiro, depois a experiência e o rating.
- **Sotaque de gibi impresso** (`docs/visual-impresso.md`): retícula no clarão, quadro congelado na Sinfonia e na
  Virada, as chapas azul e rosa fora do registro na armadilha e no "+N", onomatopeias ("FUUU!", "TCHÃ!", "ufa!",
  "plonc") e a cascata curta "em dois". `?impresso=0` desliga, para comparar.
- **Juice:** o disparo em cascata (cada dado acende na nota dele, um selo conta +1, +2, +4... e o "+N" estoura no
  placar do tamanho do lance); a tela inicial com a rival à mesa, a saudação da hora e três dados (dois brancos e um rosa no
  meio) que rolam ao toque; a mesa não pisca mais marrom no tremor.
- **Impacto e ponto de partida:** os disparos de 5 e 6 e a armadilha que pega param o tempo por um instante antes do
  estouro; a corrente a um dado de fechar a partida pulsa; o botão vira "Disparar e vencer"; os dados que dão a vitória
  ao rival ganham um "!"; o disparo que vence conta até o fim antes de a vitória estourar; a ruptura cai em dominó.
- **O rival à mesa:** antes de pegar, ele olha a Mesa (a Diana um dado no máximo, a Coruja os dados que servem a você); a
  carta dele sai da mão e voa até o vão acima da Mesa, sem cobrir o painel dele.
- **O fim em sequência:** moedas, a barra de experiência enchendo de onde estava, o nível; a próxima coisa a ganhar;
  "Faltaram 2 pontos" na derrota apertada; "Revanche contra Diana"; recordes só quando dizem algo.
- **Tarefas do dia:** três por dia, iguais para todos, 15 moedas cada, **também na derrota**; a primeira vitória do
  dia que rende moedas rende em dobro. No menu e no fim da partida (`docs/progressao.md` §4.1).

Detalhes em `docs/design.md` §5, §6 e §7 e `docs/progressao.md` §4.1; testes em `tools/estreia_e2e.js` e `npm test`.

**v0.13:** **o blefe e o
desafio saíram.** O "?" do rival é sempre uma armadilha de verdade; tocar nele mostra quais armadilhas do deck dele ele
pode ser e o que cada uma faria agora. Sem os +2/+2/+3 do desafio, os pontos voltam a vir só dos dados e das cartas
(o porquê e os números em `docs/balanceamento-cartas.md` §18). No online, antes de cada partida os dois montam o deck
(preparação de 60 s, `docs/servidor.md`). Cada vez tem 2 min (Rápida). Política de AFK: parado
na sua vez por 60 s (sem tocar na tela), o jogo pergunta "Você ainda está aí?"; sem resposta em 30 s, derrota por
inatividade (90 s parado). Queda de internet segue a mesma regra, só na sua vez. Ninguém joga por você nem perde a vez,
e a tela do fim diz por que a partida acabou.

**v0.12:** meta 16 (a 12 acabava
cedo demais; 20 e 24 voltam quando tiverem o próprio ajuste); o Coringa virou Remendo: o dado que romperia entra no lugar da frente, em vez de alongar a corrente; Pressa
só com 3 ou 4 dados na Mesa, Ajuste com 3+ e Remendo com 2+ (nenhum deck acima de ~58%, `docs/balanceamento-cartas.md` §17);
no online fica óbvio de quem é a vez (o relógio na etiqueta "sua vez" do painel, a Mesa acesa na sua vez, chamada e sininhos
quando a vez chega, lembretes, aviso na aba e de novo ao voltar para a tela). Jogar abre a escolha do rival, com o retrato, a
dificuldade e o que a vitória rende de cada uma. Tocar no seu nome abre o Perfil (nível, recordes e o seu visual com o que
você já tem). O modo a dois no mesmo aparelho saiu do jogo (o motor ainda o usa nos testes
de regras, para ninguém jogar sozinho no meio do teste). As cartas na partida viraram cartas (arte, nome, o que fazem, estado à
vista): segurar para olhar, tocar na carta e no dado para usar, ou arrastar até o dado ou a Mesa. O dado não tem mais botões
de destino: tocar nele e na corrente ou no Bolso, arrastar até eles, ou tocar de novo nele (`docs/design.md` §8). Números em
`docs/balanceamento-cartas.md` §14 e a vez em `docs/design.md` §8.

**v0.11:** a página no Vercel (`diceduel-game.vercel.app`) e o servidor na Railway, os dois publicados da branch `DiceDuel`. 15 cartas (Pausa, Reverso, Furto e Lacre na v0.11), Pedágio +2 e Interferência só em quem lidera (`docs/balanceamento-cartas.md`). O resumo copiável do fim da partida traz:
- o deck de cada um;
- as cartas que agiram;
- as rupturas;
- o uso do Bolso.

Os números do balanceamento estão em `docs/design.md` §2–4 e `docs/balanceamento-cartas.md`. As exceções e combinações das cartas, os bugs
corrigidos na v0.8 e a história do blefe (que saiu na v0.13) estão em `docs/design.md` §3–4.
