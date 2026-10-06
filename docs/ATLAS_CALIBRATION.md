# Atlas calibration

KNOT's Atlas goals are not guessed by feel alone.

The repository includes `tools/calibrate-atlas.js`, a dependency-free calibrator that mirrors Atlas geometry.

It now has two layers:

1. **deterministic witnesses** — one known route for Gold and one for the map-specific Feat on every map;
2. **seeded Monte Carlo exploration** — used to estimate empirical ceilings and discover alternate routes.

Run:

```bash
node tools/calibrate-atlas.js 30000
```

The deterministic phase must always pass before a goal ships.

## Current Atlas

There are 12 fixed maps and therefore 24 deterministic target witnesses:

| Map | Main question | Gold |
| --- | --- | --- |
| Primeira trama | score | 3,000 points |
| Cruzamento | intersection density | 12 Crosses |
| Jardim de Echo | repeated segment length | 4 Echoes |
| Halo | enclosing the center | 3 Halos |
| Estrela aberta | one large region | Loop with 10 vertices |
| Dupla trama | repeated closures | 5 Loops |
| Linha limpa | uncontaminated closure | 3 clean Loops |
| Trama mestra | composition | 18 Crosses + 5 Loops |
| Espelho | bilateral structure | 4 true reflected edge pairs |
| Mosaico | compact geometry | 4 triangle Loops |
| Ritual | event sequencing | 2 Cross → Echo → Loop sequences + 4 Loops |
| Concentração | spatial economy | 4 Loops using at most 6 unique points |

Each map also has a separately calibrated **Feat** that asks a lateral or hybrid question.

## Metrics tracked

The calibrator evaluates:

- score
- Crosses
- Echoes
- center Loops / Halos
- largest Loop
- total Loops
- clean Loops
- triangle Loops
- real mirrored edge pairs
- completed Ritual sequences
- unique points used

## Design rule

Passing should be discoverable by a competent player. Silver should require deliberate planning. Gold should require map-specific understanding. A Feat should ask a genuinely different question, not simply "Gold but bigger".

A solver witness proves reachability, not fun. Human playtests still decide whether a target is understandable, satisfying, and appropriately difficult.

For Ritual, Cross → Echo → Loop must happen across **three distinct moves**. For Espelho, an edge that is its own mirror does **not** count as a reflected pair.
