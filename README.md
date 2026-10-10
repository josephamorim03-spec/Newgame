# Dice Duel

Um duelo de dados 1×1 aconchegante, para celular e navegador.

Os dois jogadores disputam a mesma Mesa de 5 dados e montam **correntes** de dados que se sincronizam:
- **Eco:** o mesmo número;
- **Passo:** um a mais ou a menos;
- **Oposto:** soma 7.

Cada um guarda um dado no **Bolso**, escolhe a hora de **disparar** a corrente para marcar pontos e leva um
**deck de até 3 cartas** com efeitos e armadilhas. Um efeito virado para baixo vira **blefe**: para o rival, é um
"?" igual ao de uma armadilha. A partida vai a 16, 20 ou 24 pontos; na 16, o padrão, dura de 6 a 8 minutos.

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
- **duas pessoas** no mesmo aparelho;
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
| `sim/` | regras de referência em Python e os experimentos de balanceamento |
| `tools/empacotar.py` | gera o HTML único |
| `tools/lancamentos/` | exporta os lançamentos gravados do Godot e monta `js/lancamentos.js` |
| `tools/arte_icones.py` | pinta os retratos com a API de imagem da OpenAI, no estilo do jogo (pedidos em `arte/retratos.json`, com o vetor de cada personagem como referência), e os embute no jogo |
| `tools/referencias.js` | desenha os vetores de `js/retratos.js` em `arte/referencia/` (rode de novo quando mudar um vetor) |
| `tools/fumaca.js` | teste de fumaça: joga partidas inteiras no navegador e falha com qualquer erro |
| `tools/regras.js` | testes dirigidos das cartas (Pressa, Coringa, Espelho, blefe, Âncora × Interferência) |
| `tools/layout.js` | verificador de layout em 5 larguras: texto vazando, fora da caixa, quebrado, descentralizado |
| `tools/macaco.js` | o macaco: toques ao acaso em tudo, com vigia de travamento e de estado impossível |
| `tools/online_e2e.js` | ponta a ponta do online: dois navegadores, conta, convite, partida, revanche, ranking |
| `tools/vercel_local.js` | simula o Vercel (só o que o `.vercelignore` publica, com a CSP do `vercel.json`) e joga uma partida |
| `docs/design.md` | regras, cartas, números, decisões e por quê |
| `docs/pesquisa.md` | o que jogos de cartas no celular ensinam (deck pequeno, armadilhas, contra-jogo) |
| `docs/progressao.md` | moedas, rating contra o farm, XP e níveis, loja, cosméticos, regras de monetização |
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
node tools/fumaca.js                           # 4 partidas no navegador (celular, computador, Coruja, a dois)
node tools/regras.js                           # as cartas fazem o que o texto delas diz
node tools/layout.js                           # layout em 360, 390, 430, 768 e 1360 px
node tools/online_e2e.js                       # online de ponta a ponta, com o servidor local
node tools/macaco.js                           # toca em tudo ao acaso e vigia travamentos e estados impossíveis
node tools/vercel_local.js                     # a página como o Vercel publica, com a CSP
```

## Estado

**v0.12 (nesta branch, ainda não publicada):** metas 16 (padrão), 20 e 24, no lugar de 12 e 16; o Coringa troca a frente
da corrente em vez de alongá-la; e no online fica óbvio de quem é a vez (selo com relógio no alto da Mesa, a Mesa acesa na
sua vez, chamada e sininhos quando a vez chega, lembretes, aviso na aba e de novo ao voltar para a tela). As cartas na partida
viraram cartas (arte, nome, o que fazem, estado à vista): segurar para olhar, tocar na carta e no dado para usar, ou
arrastar até o dado ou a Mesa (`docs/design.md` §8, "Cartas na mão"). Números em
`docs/balanceamento-cartas.md` §14 e a vez em `docs/design.md` §8.

**v0.11, em produção:** a página no Vercel (`diceduel-game.vercel.app`) e o servidor na Railway, os dois publicados da branch `DiceDuel`. 15 cartas (Pausa, Reverso, Furto e Lacre na v0.11), Pedágio +2 e Interferência só em quem lidera (`docs/balanceamento-cartas.md`). O resumo copiável do fim da partida traz:
- o deck de cada um;
- as cartas que agiram;
- as rupturas;
- o uso do Bolso;
- os blefes.

Os números do balanceamento estão em `docs/design.md` §2–4 e `docs/balanceamento-cartas.md`. As exceções e combinações das cartas, os bugs
corrigidos na v0.8 e o blefe estão em `docs/design.md` §3–4.
