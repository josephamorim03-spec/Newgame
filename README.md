# KNOT

Mobile-first geometry game with two complementary modes:

- **Run** — roguelike buildcraft with deterministic seeds, local Knot schools, mastery goals, optional challenges, tactical move previews, Reweave and Focus.
- **Atlas** — 12 fixed geometry problems with Pass / Silver / Gold goals, calibrated Feats, objective-aligned rankings, versioned records, shareable routes, personal-best ghosts and verified friend score challenges.

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

See `docs/ATLAS_CALIBRATION.md` for the current calibration policy and empirical margins. See `docs/LEADERBOARD_PROTOCOL.md` for the verified route/ghost/ranking contract.

The game is self-contained: there are no external runtime art or audio assets. Music and sound are synthesized with WebAudio.

Open `index.html` or deploy the repository root directly to Netlify.


## Competitive route tools

```bash
node tools/verify-route.js "KNOT|cross@v1|3-5-1-..."
```

Atlas competition trusts routes, never client-submitted scores.


## Regression checks

The repository has no runtime dependencies. Geometry regression tests run with:

```bash
npm test
```

The suite validates all 24 deterministic Gold/Feat witness routes, advanced geometry metrics, and route rejection rules. GitHub Actions runs the same check on `main` pushes and pull requests.
