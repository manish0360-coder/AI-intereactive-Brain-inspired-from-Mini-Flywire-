# UQ-A collection data

Produced by `experiments/uqa/run_collection.js` against the frozen UQ-A
pre-registration
(`03eba04ac908861332fb2d7b0d3c0994468e1bd5ab5f78a5acf092dcd20196c4`, frozen at
`63247bb`), after the §14b liveness pre-check returned **LIVE** at `5d04469`.

| Artifact | Committed | Contents |
|---|---|---|
| `candidates.jsonl` | yes | all 4,000 candidates (1,000 seeds × 4 goal indices) with terminal disposition and, for each rejection, the exact failing acceptance checks |
| `INTEGRITY.sha256` | yes | SHA-256 of the artifacts, plus the regeneration and verification commands |
| `../results/uqa_results.json` | yes | the frozen-protocol outcome: accounting closure, seed census, §18/§19 disposition, and one entry per configuration carrying both arms' ρ, coverage, exclusion count, M7 fingerprint and load-hook attestation |
| `../results/uqa_results.sha256` | yes | digest of the results artifact |
| `qtables.jsonl` | **no** | 192 raw end-of-run Q tables (96 configurations × 2 arms), 1.20 MB |

## Outcome

**SATISFIED**, per §18/§19.

| Condition | Required | Observed | |
|---|---:|---:|---|
| accepted configurations, each run under both arms | 20 | **96** | met |

The complete registered range was processed: 4,000 candidates over all 1,000
seeds — 96 accepted and collected under both arms (192 runs), 3,904 rejected,
none pending, none failed. The range was **not** extended and sampling was not
adapted; §19 forbids both, and no emerging result was inspected to alter
execution.

Realised acceptance yield: 96/1,000 = **0.096 configurations per seed**.
Goal-degree composition of the accepted set, reported per §18 as a disclosure
and **never as a threshold or a filter**: degree 5 (goals 8, 12) = 50;
degree 3 (goals 16, 19) = 46.

## What was computed

Per configuration, per arm: `rho(Q_final, pPhase1)`, `rho(Q_final, pPhase2)`,
coverage, and the non-edge exclusion count. Per configuration: the paired ρ and
coverage differences, which §11 and §13 license explicitly ("by how much,
descriptively"). Across configurations: **counts** of the direction of those
differences.

`ρ` is the repository's committed Spearman implementation — the one in
`experiments/m7/env.js` that §6 designates via F9, with mid-rank tie averaging
and returning 0 when either variable is constant. `analyze.js` holds a verbatim
copy (`env.js` may not be modified and the function is module-private there) and
`assertSpearmanFidelity()` re-extracts the committed text at run time and
requires byte identity. This matters because the repository contains a *second*
Spearman, in `experiments/m7/verify_G15.js`, which returns `NaN` rather than 0
for a constant vector.

## What was deliberately not computed

No p-values, confidence intervals, hypothesis tests, significance claims, effect
sizes or models — §11 forbids them and forbids adding them once data exists.

**Cross-configuration aggregates of the paired difference were also not
computed.** §11 enumerates the descriptive quantities as the ρ values, coverage
counts and exclusion counts, and licenses the difference *per comparison*; it
does not license an aggregate estimate, which would read as an effect size. Any
such addition may enter only through a numbered erratum frozen before it is
computed.

The two phases are reported **separately and never pooled** (§10). Coverage is
reported alongside every ρ and is **never used as an adjustment** (§12): it is
part of the total causal pathway, so adjusting for it would remove part of the
treatment effect.

## The exposure, and how it is proved rather than asserted

§5 **E-BOTH**: `uncertaintyScore` is delivered as exactly `0` at both frozen read
sites — `render/scoring.js:151` (via `main.js:2073`) and
`render/executiveController.js:145` (via `main.js:2245`). Both consume the same
local `uncertaintyScoreValue`, assigned once at `main.js:2045-2046`, so
neutralising the assignment reaches both sites and nothing else. `instrument.js`
asserts that the identifier occurs exactly three times rather than assuming it,
and refuses to transform if it does not.

No production source is modified. The transform runs in memory through an ESM
load hook. Because `module.register()` runs the hook in a separate loader
thread, the hook writes an attestation naming the arm and the SHA-256 of the
exact source it handed to the module system; the collector recomputes that
digest independently and refuses the run unless the two agree. The verifier then
re-checks the attestation for all 192 runs. That is what makes `ABLATED` a fact
about the executed bytes rather than a label the parent wrote on itself.

The `getUncertaintyScore` call is preserved and only its value is discarded, so
both arms execute the same call sequence. The function is pure — it reads
`surpriseMap`, `inconsistencyMap` and `visitCount` and mutates nothing.

## Raw Q-table schema

Each `qtables.jsonl` line is one run: the run identity joined to the complete
end-of-run Q table, verbatim and unfiltered.

```
{configSeed, configIndex, goal, uqaArm, agentSeed, arm, ticks,
 exposure, preregistration, preregistrationCommit, fixture,   <- run identity
 qEntries: [["pos#goal->action", value], ...]}                <- raw section 6 x
```

Nothing in the raw layer is reduced, ranked or correlated. The §6 population
read, the §8 absent-is-zero rule, the §9 exclusion count and the §12 coverage
count are all applied offline in `analyze.js`, so every published number remains
recomputable from evidence the analysis never touched.

## Why the raw Q tables are not committed

The repository convention, established by M7 and followed by M8 and Q1, is that
raw measurement data is not versioned: `experiments/m7/verify_G15.js` recomputes
its entire population from frozen seeds rather than reading a stored dataset.

This costs nothing in reproducibility, because the collection is deterministic
and its integrity is pinned three ways:

1. `INTEGRITY.sha256` records the digest of the complete stream.
2. `results/uqa_results.json` records a per-arm M7 fingerprint and a per-arm
   load-hook attestation for **each** configuration, so a single run can be
   validated without regenerating the other ninety-five.
3. `verify_uqa.js` re-runs a collected configuration under both arms — chosen by
   a fixed rule, so the check cannot be steered — and requires its fingerprints,
   ρ values and coverage to match the recorded result exactly.

## Regenerate and verify

```
cd experiments/uqa
node verify_uqa.js             # 105 assertions; the fixture runs consume no UQ-A seed
node run_collection.js         # ~25 min: 4000 candidates, 96 configurations x 2 arms x 3000 ticks
node verify_uqa.js             # section K then validates the produced artifact
```

Section K reports `SKIP` and counts as neither pass nor fail when no result
artifact exists, rather than passing on a missing one.

## Frozen parameters

Range `898000-898999` · agent seed `20260819000` · M7 arm `A1` · 3000 ticks ·
exposure `E-BOTH` · arms `ARMED` + `ABLATED` · population 78 directed
adjacencies · minimum evidence 20 accepted configurations (Director judgment,
§18 — a pre-data judgment, not mechanically required by source).

Consumed and never touched: Q1 `899000-899499`, M8 `899500-899999`, M7
`900000-900029` and `900030-900499`. Held-out `>= 900500` was never generated,
evaluated or inspected — proven at runtime by the env seed census
(1,000 seeds evaluated, min 898000, max 898999), not asserted in prose.
