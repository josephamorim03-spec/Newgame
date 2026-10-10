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

**Contra quem:**
- **Diana**, uma gata branca de olhos azuis, a rival fácil;
- **Dona Coruja**, que lê a Mesa;
- **um amigo, online**, por link de convite (vale rating e moedas).

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
| `js/pata.js` | as patas da Diana na tela inicial, mexendo nos dados da mesinha |
| `sim/` | regras de referência em Python e os experimentos de balanceamento |
| `tools/empacotar.py` | gera o HTML único |
| `tools/lancamentos/` | exporta os lançamentos gravados do Godot e monta `js/lancamentos.js` |
| `tools/arte_icones.py` | pinta os retratos com a API de imagem da OpenAI, no estilo do jogo (pedidos em `arte/retratos.json`, com o vetor de cada personagem como referência), e os embute no jogo |
| `tools/referencias.js` | desenha os vetores de `js/retratos.js` em `arte/referencia/` (rode de novo quando mudar um vetor) |
| `tools/fumaca.js` | teste de fumaça: joga partidas inteiras no navegador e falha com qualquer erro |
| `tools/estreia_e2e.js` | a estreia e o guia: primeira partida sem cartas, explicações uma vez só, fim da derrota, a partida seguinte e quem já jogava |
| `tools/regras.js` | testes dirigidos das cartas (Pressa, Remendo, Espelho, armadilha virada, Âncora × Interferência) |
| `tools/layout.js` | verificador de layout em 5 larguras: texto vazando, fora da caixa, quebrado, descentralizado |
| `tools/macaco.js` | o macaco: toques ao acaso em tudo, com vigia de travamento e de estado impossível |
| `tools/online_e2e.js` | ponta a ponta do online: dois navegadores, conta, convite, partida, revanche, ranking |
| `tools/vercel_local.js` | simula o Vercel (só o que o `.vercelignore` publica, com a CSP do `vercel.json`) e joga uma partida |
| `docs/design.md` | regras, cartas, números, decisões e por quê |
| `docs/pesquisa.md` | o que jogos de cartas no celular ensinam (deck pequeno, armadilhas, contra-jogo) |
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
node tools/regras.js                           # as cartas fazem o que o texto delas diz
node tools/layout.js                           # layout em 360, 390, 430, 768 e 1360 px
node tools/online_e2e.js                       # online de ponta a ponta, com o servidor local
node tools/macaco.js                           # toca em tudo ao acaso e vigia travamentos e estados impossíveis
node tools/vercel_local.js                     # a página como o Vercel publica, com a CSP
```

## Estado

**v0.14, na branch `DiceDuel-primeira-partida` (ainda não publicada):** a primeira partida e a sensação de jogar bem.
- **A estreia:** na primeira visita, Jogar começa direto uma partida contra a Diana até 8 pontos, sem cartas (sem
  escolher rival nem montar deck). As cartas chegam na segunda; as armadilhas, depois dela.
- **O guia:** o primeiro Eco, Passo e Oposto, a primeira corrente de 3 e a primeira ruptura ganham, uma vez só, uma
  chamada que dá nome ao que a pessoa acabou de fazer ("Oposto! 2 e 5 somam 7").
- **Paciência:** segurar uma corrente que já podia disparar e ela render 2+ pontos a mais vira bom momento
  ("Valeu esperar!" na hora). É o primeiro bom momento que premia uma decisão, não um resultado.
- **Fim da derrota sem "+0":** os bons momentos vêm primeiro, depois a experiência e o rating.
- **Juice:** o disparo em cascata (cada dado acende na nota dele, um selo conta +1, +2, +4... e o "+N" estoura no
  placar do tamanho do lance); a tela inicial com a rival à mesa, a saudação da hora e dados que rolam ao toque, e as patas da Diana mexendo nos
  dados e ameaçando pegá-los; a mesa
  não pisca mais marrom no tremor.

Detalhes em `docs/design.md` §5, §6 e §7; teste em `tools/estreia_e2e.js`.

**v0.13, em produção** (a página no Vercel e o servidor na Railway, publicados da branch `DiceDuel`): **o blefe e o
desafio saíram.** O "?" do rival é sempre uma armadilha de verdade; tocar nele mostra quais armadilhas do deck dele ele
pode ser e o que cada uma faria agora. Sem os +2/+2/+3 do desafio, os pontos voltam a vir só dos dados e das cartas
(o porquê e os números em `docs/balanceamento-cartas.md` §18). No online, antes de cada partida os dois montam o deck
(preparação de 60 s, `docs/servidor.md`). Estourar o tempo da vez não perde mais a partida: o jogo joga por você e
avisa os dois; só 3 vezes seguidas no automático viram W.O., e a tela do fim diz por que a partida acabou. A vez no ritmo Rápida tem
60 s; quem entrou no automático e não voltou tem só 15 s por vez (o rival não espera à toa), até tocar na tela.

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
