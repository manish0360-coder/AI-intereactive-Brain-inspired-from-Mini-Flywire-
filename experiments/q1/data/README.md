# Q1 collection data

Produced by `experiments/q1/run_collection.js` against the frozen Q1
pre-registration (`0ad12fe2f190645d2126c9e55aef4f270f853009`) with the
collection parameters ratified by Director decision **D-006**, using the Q1
instrumentation committed at `50be4b4`.

| Artifact | Committed | Contents |
|---|---|---|
| `candidates.jsonl` | yes | all 2000 candidates (500 seeds x 4 goal indices) with terminal disposition and, for each rejection, the exact failing acceptance checks |
| `manifest.json` | yes | accounting closure, seed census, the pre-declared sufficiency counts, and one entry per accepted configuration with its fingerprint, diagnostics and per-stream digests |
| `INTEGRITY.sha256` | yes | SHA-256 of all four artifacts, plus the regeneration and verification commands |
| `transitions.jsonl` | **no** | 37,659 raw §6 transition records, 10.05 MB |
| `boundaries.jsonl` | **no** | 97,810 §3 window-boundary records, 26.22 MB |

## Outcome

**INCONCLUSIVE — INSUFFICIENT MATERIAL**, per D-006 §5.

| Condition | Required | Observed | |
|---|---:|---:|---|
| DESYNC events pooled | 100 | 3,166 | met |
| accepted configurations | 20 | **17** | **unmet** |
| configurations in `degree5` | 15 | **9** | **unmet** |
| configurations in `degree3` | 15 | **8** | **unmet** |

The complete registered range was processed: 2000 candidates over all 500
seeds, 17 accepted and collected, 1983 rejected, none pending, none failed.

**The range was not extended and sampling was not adapted.** D-006 §5 forbids
both, and the disposition above is the pre-declared outcome for exactly this
case. The realised acceptance yield was 17/500 = **0.034 configurations per
seed**, against the 0.082 figure documented from M8 and used to size the range.
D-006 §3 recorded that projection as "not a guarantee", and D-006 §7 dependency 6
assigned the resulting risk to the stopping rule rather than to the range. That
is what happened.

## Raw record schema

Each transition line is the frozen §6 closed record joined to the run identity:

```
{configSeed, configIndex, goal, stratum, agentSeed, arm, ticks,
 preregistration, decision, fixture,          <- run identity
 seq, tickIndex, site, fromPos, toPos}        <- frozen section 6 record
```

`site` is drawn from the closed §4 taxonomy `cap | pool | goalReset | advance`.
Boundary lines carry `kind: write | read` instead, and are measurement
infrastructure rather than taxonomy members — the closed taxonomy is never
widened by bookkeeping. Transitions and boundaries draw from **one** monotonic
`seq` counter per run, so gap membership is an observed total order rather than
an inference from an assumed in-tick source layout.

Nothing here is classified. No `GAP_COMPOSITION`, `FIRST_DIVERGING_TRANSITION`,
`LAST_TRANSITION_BEFORE_EVALUATION`, `TRANSITION_COUNT`, ORIGIN, AGE, mechanism
frequency, statistic or causal label is computed anywhere in the collection.
Those are §7 observables belonging to a later authorised milestone.

## The DESYNC count

`desyncEvents` applies the frozen §2 predicate `lastReasoning.from !==
agentCurrent` to raw recorded fields at the §3 closing edge (`main.js:3819`).
It is a **collection/evaluability count**, not a Q1 result.

Note that this denominator is reads at the closing edge, **not** the
evaluation-paired events M8 used. Q1 §8 states this directly: "Q1 has its own
denominator; M9's 7,178 is context, not Q1's population." The two numbers are
not comparable and must not be reported as if they were.

## Why the raw streams are not committed

The repository convention, established by M7 and followed by M8, is that raw
measurement data is not versioned: `experiments/m7/verify_G15.js` recomputes its
entire population from frozen seeds rather than reading a stored dataset.

This costs nothing in reproducibility, because the collection is deterministic
and its integrity is pinned three ways:

1. `INTEGRITY.sha256` records the digest of each complete stream.
2. `manifest.json` records a SHA-256 of **each** configuration's transition and
   boundary streams, so a single run can be validated without regenerating the
   other sixteen.
3. `verify_q1_collection.js` re-runs a collected configuration — chosen
   deterministically, so the check cannot be steered — and requires its digests
   and its M7 fingerprint to match the manifest exactly.

## Regenerate and verify

```
cd experiments/q1
node verify_q1_runner.js       # readiness gate: 59 assertions, consumes no Q1 seed
node run_collection.js         # ~12 min: 2000 candidates, 17 configurations x 3000 ticks
node verify_q1_collection.js
```

`verify_q1_collection.js` refuses to run without the raw streams rather than
passing on partial evidence.

## Frozen parameters

Range `899000-899499` · agent seed `20260819000` · arm `A1` · 3000 ticks ·
minimum evidence 100 / 20 / 15 (Director judgment, D-006 §4).

Consumed and never touched: M8 `899500-899999`, M7 `900000-900029` and
`900030-900499`. Held-out `>= 900500` was never generated, evaluated or
inspected — proven at runtime by the env seed census, not asserted in prose.
