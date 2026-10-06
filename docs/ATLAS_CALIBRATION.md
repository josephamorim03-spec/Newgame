# Atlas calibration

KNOT's Atlas goals are not intended to be guessed by feel alone.

The repository includes `tools/calibrate-atlas.js`, a dependency-free Monte Carlo search that simulates legal routes using the same geometric grammar as Atlas. It checks every fixed map, searches for a Gold witness, and reports observed ceilings for:

- score
- Crosses
- Echoes
- Halos / center Loops
- largest Loop
- total Loops
- clean Loops

Run:

```bash
node tools/calibrate-atlas.js 30000
```

Use a larger budget before raising a Gold goal.

## Current calibration snapshot

A 30,000-route-per-map search found Gold witnesses for all eight current maps.

| Map | Gold target | Observed relevant ceiling* |
| --- | --- | ---: |
| Primeira trama | 3,000 score | ~4,133 score |
| Cruzamento | 12 Crosses | 21 Crosses |
| Jardim de Echo | 4 Echoes | 7 Echoes |
| Halo | 3 center Loops | 5 center Loops |
| Estrela aberta | Loop 10 | 10+ route vertices observed |
| Dupla trama | 5 Loops | 6 Loops |
| Linha limpa | 3 clean Loops | 4 clean Loops |
| Trama mestra | 18 Crosses + 5 Loops | simultaneous Gold witness found; separate searches reached 35 Crosses / 7 Loops |

*These are empirical search results, not mathematical proofs of the true maxima.

## Design rule

Passing should be discoverable by a competent player. Silver should ask for deliberate planning. Gold should require map-specific understanding but retain more than one plausible route whenever possible.

The solver is a calibration tool, not the game. Human playtests still decide whether a target is understandable, satisfying, and appropriately difficult.
