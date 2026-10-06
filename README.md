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

See `docs/ATLAS_CALIBRATION.md` for Atlas target calibration, `docs/RUN_CALIBRATION.md` for the empty-build Run reachability invariant, `docs/RUN_SYNERGIES.md` for the seven named Run engines, and `docs/LEADERBOARD_PROTOCOL.md` for the verified route/ghost/ranking contract.

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


## Run reachability

```bash
npm run calibrate:runs
```

The current generator has 39 unique round/layout/mandatory-goal signatures. All 39 have a deterministic passing route with an empty build, so Knot choices affect efficiency and Mastery rather than basic mathematical reachability.

## Presentation and audio

`gamefeel.js` preserves board elements between moves; `gamefeel.css` supplies tactile pin/thread feedback and reduced-motion alternatives. `knot-audio.js` shares a C-major pentatonic palette between effects and music, schedules notes against the WebAudio clock, and ducks the music under effects. Run uses an 84 BPM evolving motif; Atlas uses a quieter 72 BPM arrangement. Music pauses when the page is hidden; music and effects remain independently switchable.
