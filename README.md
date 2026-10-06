# KNOT

Mobile-first geometry game with two complementary modes:

- **Run** — roguelike buildcraft with deterministic seeds, local Knot schools, mastery goals, optional challenges, tactical move previews, Reweave and Focus.
- **Atlas** — fixed geometry maps with Pass / Silver / Gold goals, versioned records, personal-best routes and visual PB ghost replays.

## Design pillars

- one simple action, many consequences;
- geometry is the board, the strategy and the scoring substrate;
- information should clarify decisions, not automate them;
- global variety can be large, but each run uses a constrained local grammar;
- failure should teach what to try next;
- progression adds vocabulary and mastery rather than permanent stat power;
- no streaks, timers or FOMO loops.

## Calibration

Atlas goals are tested with a dependency-free Monte Carlo calibrator:

```bash
node tools/calibrate-atlas.js 30000
```

See `docs/ATLAS_CALIBRATION.md` for the current calibration policy and empirical margins.

The game is self-contained: there are no external runtime art or audio assets. Music and sound are synthesized with WebAudio.

Open `index.html` or deploy the repository root directly to Netlify.
