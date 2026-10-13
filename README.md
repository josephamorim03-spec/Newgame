# Peleja — duelo do folclore

Jogo de cartas e tabuleiro **1x1, por turnos, feito para celular em retrato**. Dois generais do folclore brasileiro se enfrentam num tabuleiro **5x7**: **Curupira** (facção **Mata**) contra **Cuca** (facção **Assombrações**). Vence quem derrubar o general inimigo.

- **Jogo publicado (último build):** `dist/peleja.html`, um arquivo único que funciona offline.
- **Briefing para melhorar as miniaturas 3D com outro modelo:** [`docs/ASTRA.md`](docs/ASTRA.md)
- **ASTRA — Mula (primeiro personagem):** [antes/depois, limites e verificação](docs/ASTRA-MULA.md)
- **ASTRA — Saci:** [oito direções, fumaça e verificação](docs/ASTRA-SACI.md)

## Regras em uma tela
- Cada general tem 20 de vida e também luta.
- A mana começa em 2 e sobe 1 por turno, até 9. Cada jogador tem uma mão de até 6 cartas, tiradas de um baralho de 20 (10 cartas × 2).
- Unidades entram ao lado do general ou de outra unidade sua, e só agem no turno seguinte. As **rápidas** são exceção.
- No seu turno, cada peça **anda até 2 casas e depois ataca uma vizinha** (8 direções). Quem apanha **revida**.
- O general tem um **poder com recarga**:
  - Curupira: *Rastro falso*, troca de lugar com uma unidade sua.
  - Cuca: *Feitiço da Cuca*, 1 de dano em qualquer peça e cura 1.
- **Terreno** sorteado e espelhado a cada partida:
  - **mata fechada:** −1 de dano recebido, mínimo 1;
  - **rio:** ninguém passa a pé, quem voa pula;
  - **encruzilhada:** +1 de mana no começo do turno de quem estiver nela.
- Turno de 45 s. Modos: contra o bot (fácil, normal, difícil) ou 2 jogadores no mesmo celular.

## Como rodar
```bash
python3 build.py                 # gera dist/peleja.html e dist/test.html
open dist/peleja.html            # ou qualquer navegador
```
Não há dependências em tempo de execução: o Three.js r128 vai embutido (`vendor/three.min.js`).

## Testes (Node + Playwright/Chromium)
| comando | o que verifica |
|---|---|
| `node tools/regras.js` | 77 cenários: cada carta, poder e terreno faz exatamente o que o texto diz |
| `node tools/fuzz.js` | partidas inteiras pela interface, com ações aleatórias (bot e 2 no celular); procura erros e estados impossíveis |
| `node tools/ceu.js` | fotos da troca inicial, do anoitecer com traços 🌙 acesos e dos totens |
| `node tools/layout.js` | larguras de 320, 360, 390 e 430 px: nada saindo da tela, nomes de carta sem corte |
| `node tools/telas.js` | fotografa 14 telas em `shots/` para revisão lado a lado |
| `node tools/balanco.js 600 normal` | bot x bot alternando lados: vitória por facção e por quem começa, duração e taxa de vitória de quem jogou cada carta |
| `node tools/figsheet.js` | folha das miniaturas 3D (frente, lado e costas) em `shots/figsheet.png` |
| `node tools/personagem.js saci 4b80fe7` | antes/depois nas oito direções, fumaça, orçamento e comparação dos outros personagens |
| `node tools/mula.js` | antes/depois da Mula, oito direções, triângulos/contornos, âncoras, FX e sprites dos demais personagens |

Para WebGL em Chromium sem GPU, os scripts usam `--use-gl=swiftshader --enable-unsafe-swiftshader`.

## Arquitetura
```
src/core.js    regras puras e determinísticas (comandos play/power/move/attack/end, eventos, bot) — sem DOM, pronto para online
src/ui.js      tabuleiro em canvas 2D, toques, animações (golpe, tremida, estrela, números), prévia de combate, HUD, telas
src/figs.js    MINIATURAS 3D: personagens modelados por código em Three.js e renderizados em 8 direções como imagens
src/fx.js      partículas 2D ancoradas no personagem; fogo, fumaça, brilho e poeira; pool compartilhado de 120 partículas
src/flat.js    ilustrações 2D (feitiços e casas de terreno) + fallback das peças sem WebGL
src/arte.js    ART.img / ART.token: escolhe miniatura 3D (personagens) ou ilustração 2D (feitiços)
src/shell.html página, CSS e marcadores /*CORE*/ /*ART*/ /*UI*/ preenchidos pelo build
legacy/        motores de arte anteriores (xilogravura e tabuleiro 3D), só para referência
```
- **Determinismo:** o sorteio do baralho e do terreno usa semente; tudo o mais é comando → evento. A interface só traduz eventos em animação.
- **Miniaturas:** `FIGS.sprite(id, w, h, dir)` renderiza uma vez e guarda em cache. `dir` vai de 0 (de frente para quem olha a tela) até 4 (de costas), em 8 direções. A peça vira para onde andou ou atacou. Suas peças começam de costas e as do rival de frente.
- **Sem WebGL:** o jogo cai para fichas redondas 2D (FLAT) automaticamente.

## Decisões de design (histórico curto)
- Cordel e xilogravura foram tentados (`legacy/entalhe.js`) e trocados: ruins de ler no celular.
- Leitura em primeiro lugar:
  - aro **azul = você** e **vermelho = inimigo**;
  - etiqueta de prévia no alvo ("−3 / revida −2" ou "☠");
  - contorno dourado pulsando = pode agir;
  - "zzz" = acabou de entrar.
- O tabuleiro fica **reto na vertical**; o 3D fica **só nos personagens**, como miniaturas em 3/4.
- Lições trazidas do DiceDuel:
  - de quem é a vez, óbvio de longe;
  - mostrar o resultado sem decidir pelo jogador;
  - receita de áudio do iOS;
  - testes automáticos de regras e layout.

## Balanço atual (outubro/2026)
Medido com `tools/balanco.js`, 1000 partidas no bot normal: **Mata 52% · Assombrações 45%**, quem começa vence 47%, ~11 turnos por jogador. No bot difícil fica perto disso.
Mudanças feitas a partir da simulação:
- **Enraizar** (1 mana) agora também causa 1 de dano. Antes o bot nunca jogava a carta, porque só prender era fraco demais.
- **Pacto:** o general perde 2 de vida (antes 3) e compra 2 cartas. O bot passou a usá-lo quando tem a mão curta e o general está com vida sobrando.
- **Cobra-coral:** 1/3 por 3 de mana (antes 1/2 por 2), para sobreviver a um golpe antes de envenenar.
- Testados e **descartados**:
  - Mapinguari com 4 de ataque derrubou a Mata para 32%;
  - Alma penada com 3 de dano desequilibrou para a Mata.

## Regras novas: costas e lado, dia e noite (outubro/2026)
- **Costas e lado.** Cada peça olha para onde andou ou atacou.
  - Golpe pelas costas: +1 de dano e sem revide.
  - De lado: sem revide.
  - Quem apanha se vira para o agressor.
  - **A Mata anda em bando:** uma peça da Mata com aliado colado não é pega de lado nem pelas costas.
- **Dia e noite** trocam a cada 3 rodadas.
  - De dia, a Mata anda +1.
  - De noite, o Lobisomem fica em fúria. (O +1 de ataque geral das Assombrações foi trocado pelos traços das cartas; ver abaixo.)
- **Alma penada** causa 3 de dano (antes 4).

Simulação (`REGRAS='{...}' node tools/balanco.js`):

| regras | Mata | Assombrações | turnos por jogador |
|---|---|---|---|
| sem as regras novas | 52% | 46% | 11,4 |
| costas + céu, sem bando | 35% | 65% | 8,3 |
| **costas + céu + bando + Alma 3 (atual)** | **51%** | **48%** | **8,8** |
| atual, bot difícil (150 partidas) | 44% | 56% | 9,8 |

As regras novas encurtam a partida em cerca de 23%. Sem o "bando", a facção agressiva dominava.

## Céu nas cartas, totens e troca (outubro/2026)
### Traços ☀️/🌙 (sempre ligados)
Quase toda carta e os dois poderes têm um traço que só vale numa hora do dia. Na mão, o selo acende; no tabuleiro, a peça ganha o selo no canto e o ataque fica laranja quando sobe (cinza quando cai).

| Mata ☀️ | Mata 🌙 | Assombrações 🌙 |
|---|---|---|
| Saci entra em qualquer casa vazia | Onça +1 de ataque | Corpo-seco: suspiro de 2 |
| Cobra-coral ataca sem revide | Caipora cura 2 | Bicho-papão: vizinhos −1 de ataque |
| Uirapuru compra 2 ao entrar | Anhangá também fere 1 ao entrar | Lobisomem em fúria |
| Mapinguari recupera 3 no fim do turno | Arapuca causa 4 | Pisadeira atordoa todos os vizinhos |
| Enraizar causa 2 | | Mula galopa 4 |
| Chá cura 6 | | Capelobo +1 de ataque |
| Rastro falso recarrega em 1 | | Grito causa 3 · Assombração volta pronta · Feitiço da Cuca causa 2 |

A Mata continua andando +1 de dia. O +1 de ataque geral das Assombrações à noite saiu: agora a noite delas vem das cartas.

Medição traço a traço (400 partidas cada, só aquele traço ligado, base 59%×40%): Capelobo sem revide valia +9 pontos para as Assombrações e foi trocado por +1 de ataque; Bicho-papão +6; Cuca, Grito e Assombração +4 cada; Mapinguari +4 para a Mata; Uirapuru e Anhangá +3.

### Regras extras (menu inicial, desligadas por padrão)
- **🗿 Totens e causos.** Duas casas sagradas no meio (1,3) e (3,3). No começo do seu turno, cada peça sua num totem conta 1 causo. 6 causos também vence.
- **↺ Troca e mana guardada.** No seu primeiro turno, antes de agir, troque até 2 cartas. Até 1 mana que sobrar passa para o turno seguinte.

| regras (bot normal, `REGRAS=...`) | Mata | Assombrações | turnos | por causos |
|---|---|---|---|---|
| sem traços nas cartas (versão anterior) | 51% | 48% | 8,8 | — |
| traços, 1ª versão (com +1 geral à noite) | 39% | 61% | 8,0 | — |
| **traços, versão atual (1000 partidas)** | **49%** | **50%** | **8,4** | — |
| atual, bot difícil (150) | 53% | 47% | 9,1 | — |
| + totens (meta 8) | 49% | 51% | 7,8 | 14% |
| + totens (meta 6) | 51% | 50% | 7,4 | 24% |
| + troca e mana guardada | 50% | 50% | 8,5 | — |
| + totens + troca | 49% | 51% | 7,3 | 25% |

Na primeira versão do bot, a troca jogava fora as cartas caras e o Mapinguari ia embora (Mata 45%). Agora o bot só troca carta cara se a mão não tiver jogadas baratas, e troca feitiço repetido.
