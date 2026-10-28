# COG-A — verification report (M-COGA-3 / M-COGA-4, development phase; no confirmatory session)

Every row below quotes the actual output of the named command on this checkout (2026-10-29). Where a check was corrected after a
failure, the failure is recorded.

## 1. Historical gate and integrity

| command | output |
|---|---|
| `node experiments/credit1/verify_credit1.mjs` on `4122186` (before any COG-A commit) | `115/115 checks passed; mutants caught 299/299; agent sessions run: 0` / `GATE PASSED` |
| COG-A touches no runtime, LEARN-0, M7, registry or CREDIT-1 file | `git diff --stat 4122186 -- main.js render instrumentation experiments/m7 experiments/learn0 experiments/credit1 experiments/registry experiments/xfer1 benchmarks connections.json neurons.json .gitattributes` is empty (checked at each COG-A commit) |

## 2. Mathematics and static census (zero sessions)

| command | output |
|---|---|
| `node experiments/coga/test_distal.mjs` | `COG-A distal tests: 11/11 passed` (exhaustive enumeration 9,144 values / 0 mismatches; κ-intervals 1,520 / 0 broken; env.js policy 304 / 0 disagreements) |
| `node experiments/coga/census.mjs --out evidence/census_dev.json` (rules committed first, `8740c06`) | `verdict FEASIBLE; chosen kappa 0.1; max expected attempts 9.64 (cap bound 50); policy cross-check ok` |

## 3. Baselines, environment, RNG contract, events, decision rules

`node experiments/coga/test_coga.mjs` → `COG-A tests: 21/21 checks passed; mutants caught 5/5`.

| check | result |
|---|---|
| N1 structural-null fixture (QB-1): Q(s,·) at the first post-shift decision at every DISTAL state equals its `T_SHIFT` value, in both conditions; the `T_SHIFT` values are equal across conditions | 26 accepted simulation worlds, 86 events, 0 violations, 0 mismatches |
| mutant Q(λ), traces reset per episode | caught (14 violations) |
| mutant Q(λ), traces never reset | caught (86 violations) |
| mutant global Q decay | caught (78 violations) |
| U1–U4 QB-1 units: single-entry in-step update; terminal convention; choice = f(Q(s,·), fresh draws); random tie-break | pass |
| mutant exploration decaying with the decision count | caught |
| R1–R3 RNG contract: one pre-shift stream, distinct post-shift streams per condition, unique seeds within every world (2,912 seeds), incomplete identities refused | pass |
| mutant runner that keeps the pre-shift stream | caught |
| E1–E4 environment: common random numbers before the shift; phase-dependent outcomes after it; refusal and self semantics; identical start sequences | pass |
| V1–V3 events and blinding: first post-shift attempt; Y / Lv scoring; sealed SWAP sessions expose V and t only; a sealed outcome cannot reach the estimator | pass |
| S1–S6 estimator, Manski bounds, M4, M5, bootstrap reproducibility, decision table exclusive and exhaustive (5,151 cells) with spot rows | pass |

**Corrected check (recorded).** On the first run, S3 failed. The test expected the composite M5 to be 0, from a hand-summing error.
The preregistered formula, mean of (V_S·Y_S − V_N·Y_N), and the code both give 0.2 on that fixture. Only the test's expected value
was corrected; the code and the formula are unchanged.

## 4. Baseline tuning (development; phase-I performance only)

`node experiments/coga/run_baselines.mjs --set dev --tune --out evidence/tuning_dev.json` → `chosen {"alpha":0.5,"epsilon":0.1}`.
Grid means of goal arrivals in steps [1000, 1500): 101.9 to 116.5 (flat).

**Finding before tuning.** With deterministic lowest-id tie-breaking, QB-1 reached the goal once in 3,000 steps on development
world 1. It was changed to a random tie-break with the decision's own second uniform (DESIGN.md §3). This is a fairness repair;
A4 still holds.

## 5. MFW development sessions (instruments, determinism, A6)

`run_mfw.mjs --set dev` (18 second-stage-accepted development worlds × 2 conditions = 36 sessions), then
`analyze_dev.mjs` (`evidence/dev_analysis.json`):

| item | result |
|---|---|
| sessions / crashed | 36 / 0 |
| map-off accounting (every oracle executed 0 times, blocked > 0 times) | 36/36 |
| environment refusals under the guard | 0 |
| clock violations (Variant C preload) | 0 |
| RNG shared-instance proof (`isSeeded()` false before boot, true at the first step; re-seed at step 1500) | 36/36 — **R5 of `M1_AUDIT.md` VERIFIED** |
| I-IDENT (SWAP and NO-SWAP logs identical on steps < 1500) | 18/18 worlds |
| blocked illegal executions (execution guard) | 881 in 36 sessions |
| repeat run B | 36/36 logs byte-identical |
| t0 = T0B | 36/36 identical — **A6 t0-invariance VERIFIED (development)** |
| high load (10 workers + 12 busy-loop processes) | 36/36 identical — **A6 load-invariance VERIFIED (development)** |
| mean wall time per session (10 workers) | 14.9 s |

Visitation: every DISTAL state was encountered in both conditions by every agent (AA = 30 of 30 pairs, q = 1.0).

## 6. Null calibration on development-simulation worlds

`run_baselines.mjs --set sim:0:400` (254 accepted worlds, 439 AA pairs per agent; `evidence/null_calibration_sim.json`):

| agent | θ̂ | 95% interval | covers 0 |
|---|---|---|---|
| random walk | 0.025 | [−0.034, 0.081] | yes |
| QB-1 | −0.009 | [−0.036, 0.017] | yes |

On the 18 development worlds alone (30 pairs), the random walk's θ̂ was −0.30 [−0.54, −0.07]. The simulation run shows this was
small-sample variation, not a defect.

## 7. Pre-shift competence (P2) — a substantive finding

Steps [1000, 1500), NO-SWAP, development worlds (18):

| agent | agreement with A₁* at decision states | downhill moves (hop distance) | mean p of the chosen edge |
|---|---|---|---|
| random walk | 0.336 | 0.405 | 0.744 |
| QB-1 | 0.678 | 0.709 | 0.812 |
| MFW, hook state P + COG-A env (the design) | **0.330** | 0.502 | **0.662** |
| MFW, hook state H + COG-A env (E2 credit on; development check only) | 0.360 | 0.508 | 0.676 |

MFW is somewhat goal-directed (more downhill moves than the random walk), but its choices are **not** informed by the hidden
reliabilities. Its agreement with the reliability-optimal set equals the random walk's, and the edges it chooses are *less*
reliable than a random walk's. This agrees with M7's G15 result (`research/SYNTHESIS_M7_M8_M9_Q1.md` §2).

**The formal P2 test** uses the world-paired bootstrap of (agent − random walk) agreement, 10,000 replicates
(`evidence/p2_dev.json`):

| agent | difference | 95% interval | P2 |
|---|---|---|---|
| MFW (P) | −0.007 | [−0.057, 0.048] | **FAIL** |
| QB-1 | 0.342 | [0.303, 0.378] | PASS |

Under the preregistered precondition P2 (DECISION_TABLE.md R7), a confirmatory run on this evidence would most likely be
**NON-EVALUABLE** for θ_MFW. This is a failed scientific gate at the development stage, and it is referred to the Research
Director (README.md).

## 8. Power simulation

`node experiments/coga/power.mjs --dev evidence/dev_analysis.json --out evidence/power_sim.json --R 500 --B 1000`
(`evidence/power_sim.txt`; primary scenario ρ = 0, τ = 0, no support loss, r_N = 0.30 from the development MFW NO-SWAP rate).

- **Type I** (P(L > 0) at θ = 0): 0.012–0.034 across n = 40…400.
- **Coverage**: 0.92–0.96.
- Smallest n on the grid with power ≥ 0.80 at θ = δ and equivalence ≥ 0.80 at θ = 0: see `POWER_ANALYSIS.md`.
