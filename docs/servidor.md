# Servidor do Dice Duel (Railway)

Um serviço Node só: serve o jogo (a página), a API e o WebSocket da partida no mesmo endereço.
Banco: Postgres (o plugin da Railway). Sem `DATABASE_URL`, guarda tudo num arquivo JSON, bom para testar no computador.

## O que ele faz

| Coisa | Como |
|---|---|
| **Conta** | nome (3 a 20 letras) e senha (6+). A senha vira hash `scrypt`. O login devolve um token assinado (HMAC, 30 dias), sem sessão no servidor. |
| **Nome único** | dois nomes são o mesmo quando só mudam maiúsculas, acentos ou separadores: `Ana` = `ana` = `ANA` = `Aná` = `a.na`. A chave sem essas diferenças é `UNIQUE` no banco (duas criações ao mesmo tempo: só uma passa) e é por ela que o login procura. A tela de criar conta avisa enquanto a pessoa digita. Contas antigas migram sozinhas para a chave nova (se duas colidirem, a segunda continua entrando pelo nome exato). |
| **Amigos** | pedido pelo nome; vira amizade quando o outro aceita (ou pede de volta). A lista mostra quem está online, numa sala ou jogando, e o pedido e o aceite chegam ao vivo. Quem está esperando numa sala chama um amigo online pelo nome, e ele recebe o convite com Entrar. Até 200 amigos e pedidos; 30 pedidos a cada 10 min. |
| **Ranking** | Elo (K 32), começando em 1000. Duas abas: **Global** (os 50 melhores) e **Amigos** (você e seus amigos), com a sua posição no global. |
| **Salas** | quem cria recebe um código de 6 letras e um link `/?sala=CODIGO`; ou chama um amigo direto pela lista. |
| **Fila por rating** | pronta e testada, **desligada** (`FILA=1` liga): com pouca gente, juntar por rating só faria todo mundo esperar. Ligada, aparece "Procurar rival": a diferença de rating aceita começa em 100, cresce 5 por segundo de espera até 400, e depois de 90 s vale qualquer rival; a meta (12 ou 16) separa as filas. O par cai numa sala comum (rating, moedas e o limite por par valem igual). Ajustes em `servidor/fila.js`. |
| **Partida** | o servidor é a autoridade: guarda o estado inteiro, aplica as jogadas com o mesmo motor do jogo (`shared/regras.js`) e manda a cada um só a visão dele. A armadilha armada do rival não sai do servidor; o Espelho, que é visível na mesa, sai. |
| **Vários aparelhos** | entrar com o mesmo nome e senha no PC e no celular traz tudo: moedas, itens, rating, nível, decks, recordes e o jeito de jogar (rival, meta, ritmo). Som, música e animações ficam em cada aparelho. |
| **Moedas e loja** | com conta, moedas e itens moram no servidor. Preço e posse são conferidos lá. Cartas que a conta não tem não entram no deck online. |

### Regras contra abuso

- Moedas online só para quem vence. A conta é `22 × margem × rapidez × rating do rival` (×0,5 a ×1,5).
- Vitória por desistência ou queda não rende moedas. O rating conta normalmente.
- O mesmo par de contas vale rating e moedas 3 vezes por dia. Depois disso as partidas viram amistosas.
- Contra os rivais do jogo (que rodam no aparelho), a conta recebe até 300 moedas por dia. O teto pelo maior rating de cada rival continua valendo.
- Quem já jogava sem conta leva o progresso uma vez, ao criar a conta: até 600 moedas, e itens até um valor total de 900.
- Login: 10 tentativas por minuto por IP. Criação de contas: 5 a cada 10 minutos.
- WebSocket: até 120 mensagens a cada 10 s.
- Cada vez tem 2 minutos. Quem passa disso perde.

### Quedas e tempos

| O quê | Quanto |
|---|---|
| Quem cai no meio da partida tem para voltar | **90 s** (depois perde por W.O., sem moedas para ninguém) |
| Relógio da vez de quem está caído | **para**; na volta, continua de onde estava, com pelo menos **30 s** para jogar (o mínimo vale uma vez por vez; numa mesma vez, o relógio fica parado por no máximo 90 s somados: cair e voltar sem fim não segura a partida) |
| Relógio da vez (2 min) | recomeça quando a vez passa e a cada Mesa nova, mesmo quando quem fechou a Mesa abre a próxima |
| O rival de quem caiu vê | "caiu · N s" contando o tempo que falta para a volta |
| O servidor percebe uma conexão morta | em 15 a 30 s (ping a cada 15 s) |
| O aparelho de quem caiu tenta voltar | durante 100 s, de 0,8 s a 5 s entre tentativas; **na hora** quando a internet volta ou o app volta para a frente |
| Conexão "zumbi" (aberta, mas sem resposta) | o aparelho manda um pulso a cada 15 s; 35 s sem ouvir o servidor, ou 4 s sem resposta ao voltar para a frente, contam como queda |
| A aba recarregou (o celular a fechou em segundo plano) | o jogo volta sozinho para a sala guardada no aparelho (por até 3 h) |
| Quem volta depois do fim (inclusive depois do W.O.) | recebe o resultado da partida |
| Convite que ninguém aceitou | some em 24 h |
| Sala sem ninguém conectado | some 30 min depois da última jogada |
| Login | dura 30 dias desde a última vez que o jogo foi aberto |

## Pôr no ar na Railway

1. **New Project → Deploy from GitHub repo**: este repositório, branch `DiceDuel`. A Railway acha o `package.json`
   e roda `npm start`. O `railway.json` define o healthcheck em `/api/saude`.
2. **+ New → Database → PostgreSQL** no mesmo projeto.
3. Variáveis do serviço do jogo (**Variables**):
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`: a referência ao banco, pela rede interna.
   - `SEGREDO` = 32+ caracteres aleatórios, por exemplo `${{secret(48)}}` ou a saída de `openssl rand -hex 32`.
     Trocar o `SEGREDO` desconecta todo mundo, mas ninguém perde a conta.
   - `NODE_ENV` = `production`.
   - `FILA` = `1` só quando houver gente bastante para a busca de rival por rating (sem ela, o botão nem aparece).
4. **Settings → Networking → Generate Domain**. O jogo fica em `https://<nome>.up.railway.app`, e os convites usam esse endereço.
5. **Deixe 1 réplica.** As salas vivem na memória do processo. Com duas réplicas, os dois amigos podiam cair em processos diferentes.
   Um processo aguenta com folga as primeiras centenas de partidas ao mesmo tempo.

As tabelas (`contas`, `partidas`, `amizades`, `config`) se criam sozinhas na primeira subida. Um deploy novo encerra as partidas em andamento.
Contas, moedas e ranking ficam no Postgres.

**Conferir:** `curl https://<nome>.up.railway.app/api/saude` deve responder `{"ok":true,"banco":"postgres",...}`.

## A página no Vercel (opcional)

O endereço curto do jogo é **https://diceduel-game.vercel.app**: o Vercel serve só a página (`index.html`, `css/`, `js/`, `shared/`,
veja o `vercel.json`) a partir da branch `DiceDuel`, e a conta, o ranking e as salas continuam na Railway.

- A `<meta name="dice-servidor">` do `index.html` diz à página onde está o servidor. Quando o próprio servidor serve a página,
  ele a manda vazia, e a página fala com o mesmo endereço (é assim no computador e no endereço da Railway).
- A página chama a API e o WebSocket **direto** na Railway (o Vercel não repassa WebSocket, e repassar a API faria todo mundo
  chegar com o IP do Vercel, estourando o limite de login por IP).
- Na Railway, `ORIGENS` = `https://diceduel-game.vercel.app` libera o CORS da API para essa página. Mais de um endereço: separe por vírgula.
- O convite usa o endereço da página aberta: quem jogou pelo Vercel convida pelo Vercel.

## Rodar no computador

```bash
npm install
npm start                                   # http://localhost:8080 (banco em dados/banco.json)
npm test                                    # motor, API, salas, quedas, limite por par (node:test)
TESTE_DATABASE_URL=postgres://... npm test  # o mesmo, mais um roteiro contra um Postgres de verdade
NODE_PATH=$(npm root -g) node tools/online_e2e.js   # dois navegadores: conta, convite, partida, revanche, ranking
NODE_PATH=$(npm root -g) node tools/reconexao_e2e.js  # quedas: conexão morta, aba recarregada, sem internet
NODE_PATH=$(npm root -g) node tools/amigos_e2e.js     # nome repetido, amizade, chamar pela lista, ranking de amigos, fila
# sem baixar navegador: CHROMIUM="/caminho/do/chrome" usa o Chrome instalado
python3 tools/empacotar.py                          # dist/dice-duel.html (arquivo único)
```

Aberto por `file://` ou como arquivo único (`dist/dice-duel.html`), o jogo continua funcionando contra os rivais e a dois.
A janela Online explica que precisa do servidor.

## API

| Rota | Faz |
|---|---|
| `GET /api/saude` | healthcheck |
| `POST /api/contas` `{nome, senha, importar?}` | cria a conta e devolve `{token, conta}` |
| `POST /api/entrar` `{nome, senha}` | `{token, conta}` |
| `GET /api/eu` | perfil e um token novo |
| `GET /api/nomes/:nome` | `{livre}` ou `{livre:false, erro}` (com qual nome existente ele bate) |
| `GET /api/ranking` | top 50 (público) |
| `GET /api/ranking/amigos` | você e seus amigos em ordem, com `posicao`, e `global: {posicao, total}` |
| `GET /api/amigos` | `{amigos, recebidos, enviados}`; cada amigo com `online` e `onde` (`esperando`, `jogando` ou `null`) |
| `POST /api/amigos` `{nome}` | pede amizade (se o outro já tinha pedido, aceita) |
| `POST /api/amigos/aceitar` `{nome}` | aceita o pedido de `nome` |
| `POST /api/amigos/remover` `{nome}` | recusa, cancela ou desfaz |
| `GET /api/config` | `{fila}`: o que este servidor oferece |
| `POST /api/loja/comprar` `{tipo, id}` | `tipo`: `cartas`, `dados`, `icones` ou `mesas` |
| `POST /api/loja/usar` `{tipo, id}` | troca o dado, o ícone ou a mesa em uso |
| `PUT /api/eu/dados` `{decks, rec, cfg, deckVisto}` | guarda o que segue a conta entre aparelhos (cartas que a conta não tem saem do deck) |
| `POST /api/solo` `{nivel, venceu, margem, rodadas, meta, momentos}` | resultado contra um rival do jogo (com o teto diário) |
| `POST /api/salas` `{meta}` | cria uma sala |
| `GET /api/salas/:codigo` | quem está na sala |

As rotas de conta pedem `Authorization: Bearer <token>`.

**WebSocket `/ws`**

- O cliente manda:
  - `{tipo:'ola', token}`
  - `{tipo:'entrar', sala, deck}`
  - `{tipo:'acao', acao}`, em que `acao` é:
    - `{tipo:'pegar', idx}`
    - `{tipo:'destino', modo}`
    - `{tipo:'carta', carta, idx?, delta?}`
    - `{tipo:'disparar'}`
    - `{tipo:'segurar'}`
  - `{tipo:'revanche', deck?}`
  - `{tipo:'desistir'}`
  - `{tipo:'sair'}`
  - `{tipo:'chamar', nome}`: chama um amigo online para a sala que você criou
  - `{tipo:'procurar', meta, deck}` e `{tipo:'cancelarBusca'}`: a fila por rating (quando ligada)
  - `{tipo:'pulso'}`: o servidor responde `pulso` (a página descobre conexão morta)
- Com conta, a página fica conectada mesmo fora de uma sala: é a presença (online) dos amigos.
- O servidor responde:
  - `ola`
  - `amigos` `{evento: 'pedido'|'aceito'|'removido', nome}`: a lista de amigos mudou;
  - `chamado` `{de, icone, rating, sala, meta}`: um amigo chamou para a sala dele;
  - `chamou`, `procurando` `{janela, naFila}`, `buscaCancelada`, `achou` `{sala, rival, rating}` (logo depois vêm `sala` e `estado`);
  - `aviso` `{erro, codigo?}`: algo fora da partida não deu certo (chamar, procurar). Ao contrário de `erro`, não tira ninguém da sala;
  - `sala`: quem está e quem está conectado;
  - `estado`: a visão de quem recebe; quem recebe é sempre o jogador 0;
  - `fim`: prêmio e perfil novo;
  - `erro`. Com `codigo: 'sala'`, o jogador saiu da sala: ela não existe mais (o servidor reiniciou ou o convite
    expirou), está cheia, recusou o deck, ou a mesma conta entrou por outra aba. O cliente sai da partida e volta
    ao jogo contra o rival, com o aviso. Sem código, foi só a jogada que foi recusada: o cliente destrava e o
    servidor manda o estado certo logo em seguida.

**Estabilidade:**
- Uma mensagem grande demais ou um quadro inválido fecha só aquela conexão.
- O cliente que manda uma jogada e não recebe resposta em 7 s pede o estado de novo.
- `servidor/testes/caos_*.test.js` mandam lixo para todas as rotas e para o WebSocket, e jogam milhares de ações
  ao acaso no motor e no servidor (quedas, voltas, duas abas, revanches); nenhuma partida pode ficar presa.

## Arquivos

| Caminho | O quê |
|---|---|
| `servidor/index.js` | sobe tudo (lê `PORT`, `SEGREDO`, `DATABASE_URL`) |
| `servidor/app.js` | rotas, loja, solo, importação, WebSocket |
| `servidor/salas.js` | salas, partida com autoridade, prêmios, quedas e prazos |
| `servidor/fila.js` | a fila por rating (janela que abre com a espera); desligada sem `FILA=1` |
| `servidor/banco.js` | Postgres e memória/arquivo, com a mesma interface |
| `servidor/autenticacao.js` | hash de senha, token, limite por IP |
| `servidor/testes/` | testes (`npm test`) |
| `shared/regras.js` | o motor de regras, o mesmo no navegador e no servidor |
