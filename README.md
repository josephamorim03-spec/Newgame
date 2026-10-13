# Peleja — duelo do folclore

Jogo de cartas e tabuleiro **1x1, por turnos, feito para celular em retrato**. Dois generais do folclore brasileiro se enfrentam num tabuleiro **5x7**: **Curupira** (facção **Mata**) contra **Cuca** (facção **Assombrações**). Vence quem derrubar o general inimigo.

- **Jogo publicado (último build):** `dist/peleja.html`, um arquivo único que funciona offline.
- **Briefing para melhorar as miniaturas 3D com outro modelo:** [`docs/ASTRA.md`](docs/ASTRA.md)

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
| `node tools/regras.js` | 33 cenários: cada carta, poder e terreno faz exatamente o que o texto diz |
| `node tools/fuzz.js` | partidas inteiras pela interface, com ações aleatórias (bot e 2 no celular); procura erros e estados impossíveis |
| `node tools/layout.js` | larguras de 320, 360, 390 e 430 px: nada saindo da tela, nomes de carta sem corte |
| `node tools/telas.js` | fotografa 14 telas em `shots/` para revisão lado a lado |
| `node tools/figsheet.js` | folha das miniaturas 3D (frente, lado e costas) em `shots/figsheet.png` |

Para WebGL em Chromium sem GPU, os scripts usam `--use-gl=swiftshader --enable-unsafe-swiftshader`.

## Arquitetura
```
src/core.js    regras puras e determinísticas (comandos play/power/move/attack/end, eventos, bot) — sem DOM, pronto para online
src/ui.js      tabuleiro em canvas 2D, toques, animações (golpe, tremida, estrela, números), prévia de combate, HUD, telas
src/figs.js    MINIATURAS 3D: personagens modelados por código em Three.js e renderizados em 8 direções como imagens
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
