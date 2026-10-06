# KNOT leaderboard / replay protocol

Competitive Atlas submissions are **routes, not scores**.

## Canonical client code

```
KNOT|<map_id>@v<map_version>|<1-based-point-sequence>
```

Example:

```
KNOT|cross@v1|3-5-1-7-2-6-4-8-1-5
```

The browser can import this code and render a ghost, but the displayed result is always recalculated from the route.

## Server authority

A future leaderboard endpoint should accept only:

```json
{
  "map_id": "cross",
  "map_version": 1,
  "route": [3,5,1,7,2,6,4,8,1,5]
}
```

The server must:

1. load the exact immutable map version;
2. verify route length;
3. verify every point index;
4. reject repeated undirected edges;
5. replay geometry deterministically;
6. recompute score, Crosses, Echoes, Loops and map objectives;
7. derive medal / Feat server-side;
8. store the verified result.

Never accept score, medal, Feat, Cross count, or objective completion as trusted client fields.

## Versioning

Leaderboard keys are effectively:

```
(map_id, map_version)
```

A balance change that affects geometry, move count, scoring, or objectives must increment the map version. Existing records remain attached to their historical version.

## Ghosts

A ghost is just a verified route rendered progressively. It contains no hidden state and cannot alter gameplay.

Recommended visibility:

- your own PB ghost: available after recording it;
- friend/global ghosts: only after the player has cleared the map at least once;
- top routes may be delayed or hidden for newly released puzzle maps if discovery is part of the experience.

This preserves learning value without turning the leaderboard into a solution browser before first completion.

## Local tools

```bash
node tools/verify-route.js "KNOT|cross@v1|3-5-1-..."
node tools/calibrate-atlas.js 30000
```

The verifier mirrors the intended server trust model: route in, deterministic result out.
