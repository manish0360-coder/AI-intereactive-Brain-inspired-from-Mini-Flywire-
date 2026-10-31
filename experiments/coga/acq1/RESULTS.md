# ACQ-1 — results (M-COGA-9)

Protocol frozen at `4d1baff`, lock `4fbba10`. Run 2026-10-31, 620/620 sessions, wall 100.3 min, 10 workers.
Machine-readable: `evidence/results.json`, per-world rows included. Raw sessions: `../data/acq1-confirmatory/` (git-ignored, 112 MB, sha256
per file in `evidence/confirmatory_manifest.json`).

## 1. Decision

| item | value |
|---|---|
| primary Δ = E_w[ψ_w(MFW-P) − ψ_w(RW)], window [9000, 12000) | **0.1306** |
| 95% stratified t interval | **[0.0903, 0.1710]** (SE 0.0203, df 88.6) |
| δ | 0.10 |
| L > 0 | yes |
| U < δ | no |
| L ≥ δ | **no**: the effect is not shown to exceed the margin |
| decision row | **A1, SUPPORTED** |

The frozen rule returns SUPPORTED. The estimate is above δ, the lower bound is below it. So the shift is detectable and is not shown to be
negligible; the data do not show that it is larger than the margin. Sensitivity rows at δ = 0.05 and δ = 0.15 are both A1.

Licensed claim (`DECISION_TABLE.md`): in this world class and budget, MFW's decisions come to depend on experienced edge reliability, toward
the better action. Not licensed: a cognitive map, a world model, planning, propagation across states, transfer, general cognition, or which
mechanism is responsible.

## 2. Sample and exclusions

| item | value |
|---|---|
| worlds allocated / analysed / void | 100 / 100 / 0 |
| goals | 25 worlds each on 8, 12, 16, 19 |
| indices / configuration seeds | 3240–3339 / 365489–369480 |
| sessions | 600 analysed + 20 repeats |
| usable SWITCH states per world | mean 6.31, min 2, max 10 |
| refusals, clock violations, oracle executions, RNG failures | 0, 0, 0, 0 |
| repeat logs byte-identical | 20/20 |

## 3. Instruments on the confirmatory worlds

| instrument | estimate | rule | result |
|---|---|---|---|
| null, ψ(RW) | −0.0002 [−0.0037, 0.0033] | inside ±δ | pass |
| positive control, ψ(QB-1) | 0.677 [0.653, 0.700] | lower bound above δ | pass |

## 4. Levels and baseline comparisons

| agent | ψ, window [9000, 12000) |
|---|---|
| MFW-P | 0.130 [0.090, 0.171] |
| MFW-H | 0.146 [0.105, 0.187] |
| MFW-A | 0.080 [0.039, 0.121] |
| RW | −0.000 [−0.004, 0.003] |
| QB-1 | 0.677 [0.653, 0.700] |
| Dyna-Q | 0.603 [0.581, 0.626] |

| contrast | estimate | level |
|---|---|---|
| MFW-A − MFW-P (secondary) | −0.050 [−0.114, 0.014] | 97.5% |
| MFW-H − MFW-P (secondary) | 0.016 [−0.048, 0.079] | 97.5% |
| MFW-P − QB-1 (descriptive) | −0.546 [−0.591, −0.501] | 95% |
| R, MFW-P − RW (descriptive) | 0.069 [0.044, 0.094] | 95% |
| R, QB-1 − RW (descriptive) | 0.358 [0.341, 0.375] | 95% |

Neither repair shows a detectable change in the end level. H − P lies inside ±δ. A − P does not, so a meaningful deficit of A is not excluded.
MFW-P reaches about a fifth of QB-1's level.

## 5. Learning curve (3,000-step bins, mean ψ)

| window | MFW-P | MFW-H | MFW-A | RW | QB-1 | Dyna-Q |
|---|---|---|---|---|---|---|
| [0, 3000) | −0.048 | 0.034 | −0.026 | −0.001 | 0.292 | 0.403 |
| [3000, 6000) | 0.004 | 0.072 | −0.014 | −0.003 | 0.528 | 0.575 |
| [6000, 9000) | 0.079 | 0.109 | 0.047 | 0.003 | 0.624 | 0.606 |
| [9000, 12000) | 0.130 | 0.146 | 0.080 | −0.000 | 0.677 | 0.603 |

## 6. Sensitivity (prespecified)

| analysis | estimate |
|---|---|
| percentile bootstrap of Δ (10,000 replicates) | 0.131 [0.092, 0.170] |
| harmonic state weights | 0.112 [0.067, 0.157] |
| ψ(MFW-P) against 0, no RW pairing | 0.130 [0.090, 0.171] |
| goal 8 | 0.179 [0.112, 0.246] |
| goal 12 | 0.093 [0.006, 0.179] |
| goal 16 | 0.125 [0.025, 0.226] |
| goal 19 | 0.125 [0.047, 0.204] |

Per-world Δ: SD 0.202, range −0.397 to 0.650, positive in 75 of 100 worlds, median 0.134.

## 7. Raw metrics, last window (description only, confounded)

| agent | mean p E1 | mean p E2 | own agreement E1 | own agreement E2 |
|---|---|---|---|---|
| MFW-P | 0.749 | 0.520 | 0.393 | 0.369 |
| RW | 0.751 | 0.546 | 0.303 | 0.280 |
| QB-1 | 0.899 | 0.625 | 0.860 | 0.704 |

## 8. Development against confirmatory

| window | MFW-P dev / conf | MFW-H dev / conf | MFW-A dev / conf | QB-1 dev / conf |
|---|---|---|---|---|
| [0, 3000) | −0.017 / −0.048 | 0.047 / 0.034 | 0.077 / **−0.026** | 0.326 / 0.292 |
| [3000, 6000) | 0.011 / 0.004 | 0.063 / 0.072 | 0.054 / **−0.014** | 0.555 / 0.528 |
| [6000, 9000) | 0.069 / 0.079 | 0.112 / 0.109 | 0.095 / 0.047 | 0.651 / 0.624 |
| [9000, 12000) | 0.131 / 0.130 | 0.140 / 0.146 | 0.137 / **0.080** | 0.687 / 0.677 |

MFW-P, MFW-H and QB-1 replicate. MFW-A's development pattern does not: its early lead is absent and its end level is lower.

## 9. Exploratory diagnostics

Written after the outcome was known, in `posthoc.mjs`, output `evidence/posthoc.json`. Unadjusted. They do not change the decision. Interpretation:
`RESEARCH_REPORT.md`.

| Δ variant, window [9000, 12000) | estimate | row if the frozen rule were applied |
|---|---|---|
| first attempts only (retries after a slip dropped) | 0.149 [0.108, 0.189] | A1 |
| within (state, predecessor) pairs | 0.128 [0.087, 0.168] | A1 |
| goal-entering choices restored | 0.130 [0.090, 0.171] | A1 |
| goal-adjacent states dropped | 0.134 [0.093, 0.174] | A1 |
| sets recomputed with goal edges at p = 1 | 0.146 [0.104, 0.189] | A1 |

| ψ by hop stratum (goal entries restored) | states | MFW-P | QB-1 |
|---|---|---|---|
| A1 nearer the goal | 106 | 0.063 [−0.036, 0.162] | 0.759 |
| equal | 373 | 0.142 [0.094, 0.190] | 0.640 |
| A2 nearer the goal | 153 | 0.149 [0.065, 0.234] | 0.730 |

| ψ by propagation class (goal entries restored) | states | MFW-P | QB-1 |
|---|---|---|---|
| LOCAL | 361 | 0.129 [0.073, 0.185] | 0.701 |
| DISTAL | 124 (68 worlds) | 0.095 [0.004, 0.186] | 0.557 |
| other | 147 | 0.150 [0.073, 0.228] | 0.708 |

| bin (Δ, all attempts) | estimate |
|---|---|
| [0, 1500) | −0.052 [−0.093, −0.012] |
| [1500, 3000) | −0.034 [−0.076, 0.007] |
| [3000, 4500) | −0.003 [−0.044, 0.038] |
| [4500, 6000) | 0.032 [−0.010, 0.074] |
| [6000, 7500) | 0.065 [0.023, 0.107] |
| [7500, 9000) | 0.095 [0.054, 0.136] |
| [9000, 10500) | 0.129 [0.087, 0.170] |
| [10500, 12000) | 0.140 [0.098, 0.182] |

| goal entries per 1,000 steps, by 3,000-step window | E1 | E2 |
|---|---|---|
| MFW-P | 145, 170, 183, 193 | 88, 119, 134, 145 |
| RW | 30, 30, 30, 30 | 22, 22, 22, 22 |
| QB-1 | 212, 247, 266, 277 | 138, 150, 159, 164 |

These counts are **not like for like**: MFW's final hop never slips (`RESEARCH_REPORT.md` §5) and MFW draws its own starts.
