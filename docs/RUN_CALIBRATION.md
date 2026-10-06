# Run calibration

KNOT Run separates **reachability** from **build mastery**.

## Core invariant

Every generated round/layout signature must have at least one legal route that passes with an **empty build**.

That means:

- a poor Knot draft can make scoring less efficient;
- a poor build can reduce Mastery probability;
- a poor build can force cleaner geometric execution;
- but no Knot choice is allowed to make the next round mathematically impossible.

This is enforced by `tools/calibrate-runs.js`.

## Current generated space

The current generator produces 39 unique round/layout/mandatory-goal signatures across:

- regular 8-point boards;
- rotated regular 8-point boards;
- double-square boards in two rotations;
- regular 10-point boards;
- rotated regular 10-point boards;
- mandatory geometric goals on the fourth round.

The repository stores one deterministic empty-build witness for each signature in:

`tools/run-witnesses.json`

Validation:

```bash
node tools/calibrate-runs.js
```

Current invariant:

```
39 / 39 generated signatures pass with an empty build witness.
```

## Balance tiers

The intended meaning of the thresholds is:

- **Pass** — geometry alone must be enough;
- **Mastery** — should usually require excellent geometry, a synergistic build, or both;
- **Challenge / Focus** — optional lateral objective; it must never be required for basic progression.

This is why the current floors for the two tightest rounds were adjusted:

- Trama densa: 5,200 → **4,900** Pass, while Mastery stays 7,300;
- Trama mestra: 9,500 → **8,500** Pass, while Mastery stays 14,500.

The goal is not to make Runs easy. It is to make failure traceable to execution and strategic efficiency rather than to a hidden impossible draft.

## Regression policy

Any change to:

- scoring;
- move count;
- board layout generation;
- mandatory goals;
- base round targets;
- Echo / Cross / Loop formulas;

must run the Run reachability suite.

If the generator introduces a new signature without a witness, CI should fail until that signature is deliberately calibrated.
