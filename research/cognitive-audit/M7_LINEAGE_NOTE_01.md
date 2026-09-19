# M7 — Historical Lineage Note 01: episode-level success writer inside the trust record

**Note ID:** M7-LN-01
**Author:** Chief Systems Engineer
**Origin:** FutureScore V2.2-R1 production evidence-source closure; recorded with the frozen
[`FUTURESCORE_V2_2_INPUT_CONTRACT.md`](../preregistrations/FUTURESCORE_V2_2_INPUT_CONTRACT.md).
**Kind:** historical research-lineage note. **Not an erratum.**

> **NOTHING HISTORICAL IS MODIFIED.** The frozen [`M7_PREREGISTRATION.md`](M7_PREREGISTRATION.md), its sidecar,
> errata 01–10, every M7 verifier and every M7/M39/M40 evidence file are unchanged. No gate, threshold, statistic,
> acceptance criterion or study conclusion is altered or re-adjudicated by this note. No run was made to produce it.

---

## 1. Finding (source-level)

Frozen §6.1 specifies, under M7 credit: `recordAttempt(u→v)` on every traversal attempt, and `recordSuccess(u→v)`
**iff that attempt succeeded**. M7-ERR-05 and the E2 wiring bypass the two legacy writers in `main.js` when
`__M7_CREDIT__` is set (`main.js:4356–4361`, `main.js:4558`).

A third writer into the same store is **not** bypassed:

| Site | Behaviour |
|---|---|
| `render/episodeManager.js:1082–1101` `_updateTrust` | `sys.recordSuccess(from->to)` for every transition of the sealed episode |
| reached via | `main.js:4473` `recordAutonomousSuccess` → `episodeManager.js:344` / `855` `_runPipeline` (trust authority 1.00 for `autonomous_success`, `episodeManager.js:57–65`) |
| trigger | `main.js:4436` `current === goalNeuronId` — the *intended* move, evaluated before `env.attempt` (`main.js:4897–4903`) |
| trajectory | reconstructed from `recentMemory`, which is appended with the *intended* node (`main.js:4379`) |
| M7 guard | none (`episodeManager.js` references no `__M7_CREDIT__`) |

Consequently, under M7 credit mode, `pathSuccesses` can receive **pre-outcome, episode-level successes without
matching attempts**, including on an edge whose traversal slipped. `getPathTrust = (s+1)/(a+2)` then no longer
equals the frozen §6.1 posterior for such edges, and can exceed 1 when `s > a + 1`.

## 2. Status

- **EVIDENCE:** the source path above exists at base `523ec38`.
- **NOT MEASURED:** how often the path fired in any historical M7 run, and whether it moved any reported
  quantity. No experiment was run for this note.
- **INFERENCE (bounded):** historical M7 trust-derived quantities under credit mode should be read as
  "traversal-outcome credit plus any autonomous-success episode credit", not as a pure §6.1 estimator,
  until a separately authorised audit establishes the magnitude.

## 3. Disposition

Recorded for lineage only. Any re-analysis, erratum or repair requires a separate Director ruling. FutureScore
V2.2 excludes this writer by contract (decision D7) and does not depend on its resolution.
