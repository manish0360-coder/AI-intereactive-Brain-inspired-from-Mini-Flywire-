# FutureScore V2.3 — Study 2 / OQ-1a — Registration Proposal (run count, seed block, driver)

**Status:** PROPOSAL for Research Director authorization (milestone M-STUDY2-DRIVER). **Nothing here is authorized.**
**Scientific seeds generated: **NO**.** **Study 2 executed: **NO**.** The Study-2 driver was **not executed**.
**Design:** [`FUTURESCORE_V2_3_STUDY2_OQ1_DESIGN_FINAL.md`](FUTURESCORE_V2_3_STUDY2_OQ1_DESIGN_FINAL.md) (baseline `d1949f9`,
readiness closure `cfadedd9`) — unchanged by this proposal.
**Driver gate:** [`experiments/study2/verify_driver.js`](../../experiments/study2/verify_driver.js) (D1–D20).
**Labels:** FACT / CALCULATION / INFERENCE / RECOMMENDATION / DIRECTOR DECISION.

The run count is **not** chosen from any expected or observed effect. F-2's illustrative Δ values are not used
(§J of the design records why they cannot be a prior), and no Δ, tau-b or oracle value was computed on any data
for this proposal. The inputs are costs, tractability, goal coverage and the rank structure of the frozen interval.

---

## 1. Inputs

| Input | Value | Label | Source |
|---|---|---|---|
| Goal balance | run count must be a multiple of 4 (goals 8, 12, 16, 19; `configIndex % 4`) | FACT | design §R; `env.js` `GOALS` |
| One run, capture on | ≈ 9 s wall clock; artifact ≈ 1.9 MB | FACT (development machine) | `experiments/study2/shakedown_evidence/SHAKEDOWN.json` |
| One run, capture off (replay) | ≈ 7 s | FACT | same |
| One configuration generated | ≈ 55 ms (steady state) | FACT | timed on development fixture 896066 only |
| Acceptance rate per candidate | UQ-B census (4000 candidates, 897xxx): 2.1–2.9% per goal index; C1 census (4000, 895xxx): 1.5–2.0% | FACT | committed `experiments/uqb/data/candidates.jsonl`, `experiments/c1/data/candidates.jsonl` |
| Exact bootstrap (frozen count-vector implementation, `taub.mjs`) | n=8: 4 ms · n=12: 0.25 s · n=16: 74 s · n=20: ≈ 4.7 h (extrapolated from the C(2n−1, n) vector count: 6.9·10¹⁰ vs 3.0·10⁸) · n=24: ≈ 1.6·10¹³ vectors, infeasible | FACT (n ≤ 16 measured) / CALCULATION (n ≥ 20) | benchmark on synthetic ranks 1…n |

The acceptance rates are used **only to size the seed block**, never as a scientific quantity.

## 2. Run-count options

"Interval ranks" is the data-free rank structure of the frozen §W interval: for n distinct run values sorted
ascending, the 95% bounds fall at these (averaged) order statistics. CALCULATION: computed by the frozen routine
for n ≤ 16 and by an independent exact order-statistic formula that reproduces it at n = 8, 12, 16.

| n | Runs per goal | Interval ranks | Lower bound > 0 requires | Smallest exact two-sided sign-test p (all same sign) | Expected seeds walked (pooled / worst-case rate) | Block compute (walk + runs + replay) | Exact interval (×3: primary, sensitivity, post-shift) |
|---|---|---|---|---|---|---|---|
| 8 | 2 | [2, 7] | 2nd-smallest Δ_r > 0 | 2⁻⁷ ≈ 0.0078 | 389 / 533 | ≈ 1.5 min | < 1 s |
| 12 | 3 | [3.5, 9.5] | mean of 3rd, 4th > 0 | 2⁻¹¹ ≈ 0.00049 | 583 / 800 | ≈ 2.5 min | ≈ 1 s |
| **16** | **4** | **[5, 12]** | **5th-smallest Δ_r > 0** | **2⁻¹⁵ ≈ 3.1·10⁻⁵** | **778 / 1067** | **≈ 3.5 min** | **≈ 4 min** |
| 20 | 5 | [6.5, 14.5] | mean of 6th, 7th > 0 | 2⁻¹⁹ ≈ 1.9·10⁻⁶ | 972 / 1333 | ≈ 4 min | ≈ 14 h |
| 24 | 6 | [8, 17] | 8th-smallest > 0 | 2⁻²³ | 1167 / 1600 | ≈ 5 min | **not computable** with the frozen implementation |

**Limitations by option.**
- **n = 8:** two runs per goal, so any per-goal description is anecdotal. The interval rests on the 2nd and 7th
  order statistics, so a single atypical run moves it. The R5 moderator correlation has 8 points.
- **n = 12:** three runs per goal. The interval still rests on only about three values in each tail.
- **n = 16:** four runs per goal. Heterogeneity by goal and by R5 is descriptive only, with no subgroup test (§M).
  This is a single topology, and the result does not transfer beyond it (design §X.5).
- **n = 20:** each exact interval takes about 4.7 h, so a full analysis needs about 14 h. Every independent re-check
  of the analysis carries the same cost, which weakens routine reproducibility. The gain in resolution over n = 16
  is one order statistic in each tail.
- **n = 24:** the frozen count-vector bootstrap cannot be computed. Adopting it would require a new interval
  algorithm, which is a change to the frozen §W implementation and outside this milestone.

**No power calculation is offered:** a power calculation needs an effect-size prior, and the design forbids using
F-2 as one (§J). The options are compared on coverage, resolution and reproducibility only.

## 3. RECOMMENDATION — run count 16

**Recommended:** `runCount = 16` (config indices 0…15, four runs per goal).

**Rationale (methodological, not result-based):**
1. **Tractability:** it is the largest multiple of 4 whose frozen exact interval is routine to compute (74 s). The
   primary, sensitivity and post-shift intervals together take about 4 minutes, so any reviewer can reproduce the
   whole analysis.
2. **Goal coverage:** four runs per goal.
3. **Resolution:** the interval rests on the 5th and 12th of 16 order statistics, rather than on the extreme
   values that n ≤ 12 gives.
4. **Cost:** the execution cost is negligible (about 3.5 minutes plus about 4 minutes of analysis), so cost is
   not the reason to prefer a smaller n.

**Final authorization is the Research Director's.**

## 4. Proposed seed block (NOT generated)

**Proposed:** configuration seeds **890000–892999** (3,000 seeds). The walk starts at 890000.

| Property | Evidence |
|---|---|
| Disjoint from every used block | lowest consumed seed in the typed registry chain is 895000 (C1). 896xxx dev fixtures, 897xxx UQ-B, 898xxx UQ-A, 899xxx Q1/M8, 900000–900499 M7 are consumed; ≥ 900500 held out. `verify_driver.js` D2.1–D2.4 |
| Not referenced anywhere in the tracked repository | census of six-digit seed literals in `experiments/` and `research/`: no 890xxx–892xxx value |
| Admissible now | `governance.validateRegistration` accepts it: every seed is non-consumed, non-held-out and not a fixture, checked through `experiments/registry/typed.js` (D2.4). This is a predicate check, **not** configuration generation |
| Size | CALCULATION (sum of geometric waits, per-index rates): at n = 16 the walk is expected to request about 778 seeds (sd 193) at the pooled rate, and about 1067 (sd 265) at the worst observed rate of 1.5%. 3,000 is at least 7.3 sd above the worst case, and 5.6 sd for n = 20 |
| If exhausted anyway | the walk stops with `RANGE_EXHAUSTED` before requesting any seed above 892999. The block is **not** extended (§U), and the Director rules |

**Procedure (already frozen, §S / ERR-07 §4).** Slot `i` = config index `i`. The walk requests seeds strictly
ascending from the block start. Slot `i + 1` resumes at slot `i`'s accepted seed + 1. Nothing is skipped or
reordered. Every requested seed, every rejected candidate (with its failed acceptance checks) and every accepted
seed are written to `PLAN.json` before any agent run.

## 5. Registration to be authored by the Director

The driver runs only from a registration file with exactly these fields (`experiments/study2/registration.template.json`).
The fixed fields must equal the frozen design, and the driver refuses any other value.

| Field | Proposed value |
|---|---|
| `authorization` | the Director's ruling reference (the driver refuses an empty value) |
| `seedBlock` | `{ "lo": 890000, "hi": 892999 }` |
| `runCount` | `16` |
| `trajectoryUse` | `{ "study": "M7-substrate", "category": "registered" }` — see §6 item 4 |
| `driverManifestSha256` | `727193a8556493b589cbd50bf15377e25ed3667e21efa64e404b89ce10875687` (sha256 of `experiments/study2/DRIVER_MANIFEST.json`) |
| fixed | `agentSeed 20260819000`, `arm A1`, `envMode/creditMode/pin on`, `tickUnit step`, `ticks 3000`, `primaryWindowMaxTau 1500`, `productionBaselineCommit a066d47…` |

Execution also requires `STUDY2_EXECUTION_AUTHORISED=1`, `--execute`, a committed and unmodified driver matching the
pinned manifest, an unchanged production tree, and a fresh output directory.

## 6. Director decisions requested

1. **Seed block:** authorize 890000–892999, or name another block.
2. **Run count:** authorize 16, or name another multiple of 4. n ≥ 24 is not computable with the frozen interval
   implementation.
3. **Driver:** register `driverManifestSha256 = 727193a8…` (Z9). Until then, Z9 stays OPEN.
4. **Agent-seed trajectory use (interpretation to confirm).** The typed registry records `agentSeed 20260819000` as
   `M7-substrate / registered`. The design (§R) reuses it as the M7 substrate's frozen constant, as UQ-B and C1 did.
   The proposal registers the use under `M7-substrate` (registry decision `REPRODUCTION`). Registering it under a
   new study name would be refused (`CONSUMED_BY_OTHER_STUDY`) unless a registry authorization record is added,
   which is out of this milestone's scope.
5. **Apparatus-integrity halt (confirm).** The frozen §T covers crashes: recorded, excluded, not replaced. §U covers
   a failed replay: re-executed once. Neither covers a per-event apparatus check failing inside a run (K(e)
   identity, FULL = live, GEO = −d, snapshot, temporal witnesses). The driver **halts the block** on such a failure
   and substitutes nothing, pending a Director ruling. This is not result-dependent: no oracle value or Δ exists at
   that point.
6. **Acceptance and R5 (disclosure to confirm).** Seed selection uses only the frozen acceptance predicate
   `cfg.accepted` (R1–R5, G11; §T). R5 is computed inside `env.js` from the configuration's own `p`. That is
   pre-registered environment eligibility, retained as-is by the design (§M). It is not a Study-2 outcome and not
   `U*` or Δ. The driver code names no oracle symbol (D5).
7. **After execution (not now):** record the used block as consumed territory in a new registry chain link, as
   M34 did for C1.

## 7. Computational estimate (n = 16, proposed block)

| Stage | Estimate |
|---|---|
| Acceptance walk (≈ 780–1070 configurations × 55 ms) | ≈ 45–60 s |
| 16 runs, capture on (× ≈ 9 s) | ≈ 2.5 min |
| G-IMPL-2 replay of slot 0, capture off | ≈ 7 s |
| Analysis: 16 configurations regenerated; tau-b over ≈ 16 × 1,400 primary events | seconds |
| Exact intervals: primary, sensitivity, post-shift (× 74 s) | ≈ 4 min |
| Storage: 16 run artifacts | ≈ 30 MB (whether to commit them or archive them is an execution-milestone decision) |

**Scientific seeds generated: **NO**. Study 2 executed: **NO**.**
