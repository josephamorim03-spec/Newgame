# 10 — Originalidade, referências e guardrails

## 1. Correção importante

A geometria de **anéis concêntricos rotativos não é, por si, original**.

Há jogos e puzzles anteriores que usam:
- anéis concêntricos;
- rotação;
- alinhamento;
- tabuleiros circulares;
- roguelikes em anéis.

Portanto não devemos vender o projeto como:
> “o primeiro jogo de puzzle com anéis.”

A identidade precisa estar em outro lugar.

---

# 2. O hook que devemos proteger

> **Alinhamentos parciais criam Phase Locks armazenados que mudam temporariamente a topologia dos seus próximos movimentos, e a build pode reprogramar essas relações.**

O ponto original do produto é a combinação:

1. puzzle radial de uma ação;
2. Phase Locks gerados pelo próprio estado do puzzle;
3. propagação previsível de movimento;
4. buildcraft que altera as leis do movimento;
5. ameaça telegráfica que usa o mesmo tabuleiro;
6. progressão por novas gramáticas;
7. UGC baseado em regras.

---

# 3. Referências absorvidas — sem copiar forma

## Tetris
Absorver:
- regra curta;
- domínio longo;
- estado inteiro legível.

Não copiar:
- peças;
- linhas;
- queda.

## 2048
Absorver:
- input mínimo;
- uma ação muda o tabuleiro todo;
- baixa barreira.

Não copiar:
- merge numérico;
- grade 4×4;
- condição 2048.

## Balatro
Absorver:
- modificadores que reinterpretam regras;
- power spikes;
- possibilidade de “quebrar” a matemática;
- run com identidade.

Não copiar:
- cartas;
- poker;
- Jokers;
- blinds;
- estrutura visual.

## Slay the Spire
Absorver:
- adaptação;
- decisões com custo de oportunidade;
- dificuldade que muda avaliação.

Não copiar:
- deck/combat card loop;
- mapa tradicional;
- energia/cartas.

## Packmaster
Absorver:
- pool local;
- subconjuntos diferentes por run;
- evitar content bloat.

## Isaac
Absorver:
- interação entre efeitos;
- surpresa;
- celebração;
- descoberta.

## Brotato
Absorver:
- builds muito diferentes dentro de estrutura repetível;
- tooltips claros;
- velocidade.

## Geometry Dash
Absorver:
- criação comunitária;
- conteúdo compartilhável;
- domínio observável.

---

# 4. Colisões encontradas na checagem

## Nine Circles of Hell
Usa anéis concêntricos rotativos e alinhamento de passagens/mármores.

Guardrail:
- não depender da fantasia “alinhe aberturas para chegar ao centro”.

## Ringcraft
Projeto de 2026 descrito como roguelike turn-based de dois anéis: dungeon e spells.

Guardrail:
- não estruturar jogo em “anel de inimigos + anel de cartas/spells”.

## Interregnum
Tática roguelike em quatro anéis concêntricos.

Guardrail:
- não usar movimentação de unidades em lanes circulares como core.

## Spinstack
Puzzle de stacking com anéis/concentricidade e rotação de base.

Guardrail:
- não usar tetrominós, stacking e limpeza de anéis como loop.

## Wireworks
Roguelike de módulos, fios, sinais e sinergias.

Guardrail:
- evitar direção de “placa de circuito + fios + programação visual” como fantasia principal.

---

# 5. Phase Lock versus engrenagem literal

Há também puzzles físicos com anéis mecanicamente engrenados.

Por isso, a apresentação de Phase Lock deve preferir:
- fase;
- ressonância;
- sincronização;
- ondas;
- vínculos temporários;

a:
- engrenagem industrial permanente.

O movimento oposto pode existir, mas a fantasia deve ser digital/espectral e o vínculo deve ser criado/destruído pelo estado do puzzle.

---

# 6. O que torna o design distinto

Compare:

### Puzzle de anéis convencional
> giro para alinhar uma configuração.

### RING//BREAK
> giro para criar Ressonância **e** para fabricar relações que mudarão o que “girar” significa nos turnos seguintes.

Esse segundo nível é a tese.

---

# 7. Risco de parecer Balatro

A maior ameaça não é visual.

É estrutural:
- 5 slots;
- raridades;
- drafts;
- multiplicadores;
- run.

Para evitar clone:
- Protocolos devem focar movimento/topologia;
- Anomalias devem atuar espacialmente;
- resolução precisa ser física/tátil;
- UI não deve lembrar mão/shop/poker;
- economia deve ser mínima;
- scoring não deve copiar Chips × Mult.

---

# 8. Risco de parecer match-3

Não utilizar:
- swap de duas peças adjacentes;
- objetivos candy-like;
- boosters típicos;
- cascata como única profundidade.

A profundidade central precisa continuar sendo:
**movimento global + Phase Lock.**

---

# 9. Risco de virar “sistema demais”

A comunidade que queremos atingir gosta de profundidade, não necessariamente de complexidade explícita.

Guardrail:
> cinco regras interagindo > vinte subsistemas independentes.

---

# 10. Pesquisa comunitária aplicada

Padrões que orientam este GDD:

- mods de informação extremamente populares → tooltips/Atlas nativos;
- QoL popular → velocidade e restart nativos;
- Packmaster → famílias locais por run;
- Cryptid versus vanilla+ → Standard e BREAK;
- Geometry Dash → Forge/UGC futuro;
- mods de stats → pós-run explicável;
- builds combinatórias → Protocolos sistêmicos;
- reclamações de pool diluída → controle de conteúdo;
- jogadores rejeitando automação de decisão → preview sem “best move”.

---

# 11. Nota de propriedade intelectual

Este documento é direção de design, não parecer jurídico.

Antes de comercialização:
- pesquisa de marca para nome final;
- revisão de arte/nomenclatura;
- análise jurídica específica se necessário;
- evitar reproduzir assets, texto, personagens ou implementações de terceiros.

Conceitos gerais de game design podem inspirar o projeto; expressão específica de terceiros não deve ser copiada.
