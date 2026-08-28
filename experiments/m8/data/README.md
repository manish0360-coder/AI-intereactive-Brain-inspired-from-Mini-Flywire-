# M8 collection data

Produced by `experiments/m8/run_collection.js` against the frozen M8
pre-registration (`8fb0bec13bb2940fa2e7e7f823c632427a28fae3`).

| Artifact | Committed | Contents |
|---|---|---|
| `candidates.jsonl` | yes | all 2000 candidates (500 seeds x 4 goal indices) with terminal disposition |
| `manifest.json` | yes | accounting closure, seed census, and one entry per accepted configuration with its fingerprint, diagnostics and event digest |
| `INTEGRITY.sha256` | yes | SHA-256 of all three artifacts, plus the regeneration and verification commands |
| `events.jsonl` | **no** | 118,179 raw observation records, 51.65 MB |

## Why the raw stream is not committed

The repository convention, established by M7, is that raw measurement data is
not versioned: `experiments/m7/verify_G15.js` recomputes its entire population
from frozen seeds rather than reading a stored dataset. M8 follows it.

This costs nothing in reproducibility, because the collection is deterministic
and its integrity is pinned three ways:

1. `INTEGRITY.sha256` records the digest of the complete `events.jsonl`.
2. `manifest.json` records a SHA-256 of **each** configuration's event stream,
   so a single run can be validated without regenerating the other forty.
3. `verify_m8_collection.js` D1 re-runs a collected configuration and requires
   its digest to match the manifest exactly.

## Regenerate and verify

```
cd experiments/m8
node run_collection.js        # ~40 min: 41 configurations x 3000 ticks
node verify_m8_collection.js
```

`verify_m8_collection.js` refuses to run without `events.jsonl` rather than
passing on partial evidence.

## Frozen parameters

Range `899500-899999` · agent seed `20260819000` · arm `A1` · 3000 ticks.
Held-out `>= 900500` and the consumed ranges `900000-900029` and
`900030-900499` are never generated, evaluated, or inspected.
