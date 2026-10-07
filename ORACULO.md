# ORÁCULO

> **Veja o destino. Declare outro futuro. Altere o mínimo possível. Descubra se você estava certo.**

ORÁCULO é um jogo tático de contrafactuais determinísticos para mobile. O jogador observa um sistema, assiste ao **Destino** original, declara uma profecia alternativa e interfere minimamente no presente antes de pressionar **REVELAR**.

A habilidade central não é reflexo, grind ou sorte. É **ler causalidade antes que ela aconteça**.

## Estado deste branch

Este branch documenta a direção de design do ORÁCULO e não altera o KNOT da `main`.

## Loop central

```text
CONTEMPLAR
   ↓
DESTINO
   ↓
REBOBINAR
   ↓
DECLARAR
   ↓
INTERVIR
   ↓
REVELAR
   ↓
TESTEMUNHAR
   ↓
VEREDITO
```

## Documentação

- [00 — Visão e pilares](docs/oraculo/00_VISAO_E_PILARES.md)
- [01 — Loop e gameplay](docs/oraculo/01_LOOP_E_GAMEPLAY.md)
- [02 — Regras e entidades](docs/oraculo/02_REGRAS_E_ENTIDADES.md)
- [03 — Profecias, Convicção e score](docs/oraculo/03_PROFECIAS_CONVICCAO_SCORE.md)
- [04 — Solver e geração](docs/oraculo/04_SOLVER_E_GERACAO.md)
- [05 — UX mobile e gamefeel](docs/oraculo/05_UX_MOBILE_E_GAMEFEEL.md)
- [06 — Run e conteúdo](docs/oraculo/06_RUN_E_CONTEUDO.md)
- [07 — MVP e implementação](docs/oraculo/07_MVP_E_IMPLEMENTACAO.md)
- [08 — Playtest, métricas e kill criteria](docs/oraculo/08_PLAYTEST_E_METRICAS.md)

## Regra de ouro

Uma mecânica nova só entra se fortalecer ao menos uma destas competências:

- **leitura** — entender estado e intenções;
- **previsão** — construir uma cadeia causal;
- **compromisso** — declarar um futuro antes de saber se está certo;
- **elegância** — alterar pouco o presente;
- **autoria** — reconhecer por que o resultado aconteceu.

Se apenas adiciona conteúdo, raridade, números ou espetáculo, não pertence ao núcleo atual.
