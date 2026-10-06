# Run synergy engines

KNOT Run uses a small set of named two-piece engines.

The goal is not to create a large recipe encyclopedia. The goal is to make a few combinations memorable enough that a player can form a hypothesis during the draft and then try to express it geometrically.

## Current engines

| Engine | Knots | What changes |
| --- | --- | --- |
| **Rupture** | Blood Knot + Fracture | A Loop closed by a line that also creates Crosses scales harder with each closing Cross. |
| **Chorus** | Echo Knot + Crescendo | An Echo that closes a Loop creates an encore worth part of the Loop value. |
| **Needlework** | Clean Thread + Trinity | A clean triangle carries tension into the next Loop instead of fully resetting. |
| **Kaleidoscope** | Mirror Loom + Prism Knot | A 4+ vertex Loop closed while creating a new mirrored edge pair gets an extra geometric multiplier. |
| **Orbit** | Heartline + Halo Knot | A center-enclosing Loop closed by a center-crossing line gets a large combined payoff. |
| **Constellation** | Long Thread + Star Knot | A 5+ vertex Loop scales with how many long edges belong to that Loop. |
| **Lattice** | Golden Junction + Braid | A single line that is both an Echo and creates Crosses converts the event into immediate score and tension. |

`First Loom` deliberately remains outside the named recipes. It is a flexible, low-context Knot rather than a recipe piece.

## Draft policy

The Run still has a constrained local grammar of three Knot schools.

If the player already owns part of a named recipe **and the missing piece is legal inside that Run's current Knot pool**, the draft reserves one visible option for a recipe-completing Knot.

This does not auto-pick the synergy and does not import a Knot from an unavailable school.

Reweave still changes the remaining choices.

## Build vs execution

Owning both pieces only puts an engine **online**.

The engine still requires a geometric trigger:

- Rupture needs a closing line that Crosses;
- Chorus needs an Echo closure;
- Needlework needs a clean triangle;
- Kaleidoscope needs a large Loop and a new mirrored pair on its closing move;
- Orbit needs center enclosure + center-crossing closure;
- Constellation needs a large Loop containing long edges;
- Lattice needs Echo + Cross on the same line.

Run summaries track how many times each engine actually fired. This is intentional: a player should be able to distinguish "my draft was weak" from "my engine was online, but I did not execute it."

## Balance invariant

Named engines are **upside**, not required keys.

The empty-build reachability invariant remains:

```
39 / 39 generated Run round signatures have a deterministic passing route with no Knots.
```

Synergies are therefore aimed at:

- Mastery;
- high-score expression;
- satisfying build identity;
- alternate geometric plans;
- replayable "I want to try this engine again" moments.

They should not determine whether basic progression is mathematically possible.
