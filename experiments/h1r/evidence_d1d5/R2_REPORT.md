# R2: goal-entry reliability draw (D-1) and measurement integrity (D-5)

**Date:** 2026-10-04. **Implementer:** Claude. **Authority:** Research Director ruling "Implement only R2: D-1 Goal-Entry Reliability Draw + D-5 Measurement Integrity".

**Not done:** H1-R was not run; no H1-R comparative outcome was generated; no scientific parameter was changed.

**Build:**

| Item | Value |
|---|---|
| Base | B2 `707cb1e` |
| Transform | `conformance_transform.mjs`, SHA-256 `8e969d6106f2c8c00d8851e37e206b7783e1e931f68e8d6fccdf85c4f771a2a0` |
| `measure.mjs` | `771dcb466c829e6c37eba6429ffef3a7c9e51540caf04af87813e51eaea9a81e` |
| `run_h1r.mjs` | `269604ab16611511cf27b8e229f993ef1ceefe76f17b134fb9703c6a96308042` |
| `runtime.mjs` | `d616914138e3246ca0f647ab77d8ce84467bf5e000fdebd4b0cda8185d1f899d` (unchanged from R1) |

**Material:** the 41 historical G15 configurations (seeds 900030–900499), agent seed 20260819000. No held-out or confirmatory seed was used.

---

## 1. Runtime path, inspected before implementation (FACT)

| Signal | Origin in the conformed `main.js` (R1 tree) |
|---|---|
| **Environment draw** | `R1-DRAW-EARLY` → `globalThis.__M7_ENV__.attempt(agentCurrent, next)` → the `run.js` wrapper (counts attempts, successes, slips) → `env.attempt(from, to)` → `pFor(from, to)` → `liveRng('environment')`, only when `(from, to)` is a graph edge. The E1 site reuses the outcome (`R1-DRAW`). |
| **Goal exclusion (pre-R2)** | `!(goalNeuronId !== null && Number(next) === Number(goalNeuronId))` inside `R1-DRAW-EARLY` (H1R order). In B2 order it is `!_goalResetJustHappened` at E1. |
| **Trust credit** | E2: `_m7cred.recordTraversal(_m7From, _m7To, _m7Traversed)`, gated by `!_goalResetJustHappened`, so goal entries were never credited. |
| **Primary reward** | `rewardSignal`, declared `let rewardSignal = 0;` inside the self-learning section. It is final after the goal/similarity assignment chain. Its first consumer is `updateLocalEmotion({`, and no assignment follows that line. |
| **ORACLE value** | `arms.bayesianTrustFor` (A7) → `env.trueP(from, to)` → the same `pFor(from, to)` the draw uses |

## 2. Semantic point resolved from the frozen text (not invented)

"Exactly the same mechanism as every other traversable edge" covers the trust credit as well as the draw. Frozen §6.1 requires `recordAttempt` on **every** traversal attempt and `recordSuccess` **iff** it succeeded.

Adding the draw alone would have produced a one-sided credit:
- goal *slips* would pass the E2 gate and be credited as attempts;
- goal *successes* would still be skipped, because the reset had already run.

That would push trust on goal-incident edges toward 0, a bias. So R2 credits goal entries exactly like any traversal.

## 3. Exact change

The transform diff (comments excluded) is exactly the five items below. Every edit is guarded, and the build refuses on any anchor mismatch.

| Tag | Change |
|---|---|
| **R2-GOAL-DRAW** | The goal exclusion is removed from `R1-DRAW-EARLY`. Goal-entering attempts call the same `__M7_ENV__.attempt(u, v)`, exactly once. |
| **R2-GOAL-FLAG** | `_goalResetJustHappened` becomes `(H1R on) ? (runtime goal-reset counter changed this tick) : (B2 expression)`. B2 inferred "reset happened" from the intended node, because a goal entry always arrived. A slipped goal attempt now follows the ordinary slip path: no move, no reset, E2 credits the attempt. |
| **R2-GOAL-CREDIT** | After E2: `if (H1R on && goal reset ran && credit on && !FROZEN) recordTraversal(u, goal, true)`, using R1's recorded decision position `u` (the reset has already moved the agent). |
| **M-STEP** | `if (globalThis.__H1R_MEASURE__) __H1R_MEASURE__.step();` immediately after the E6 telemetry step at the top of `runAgent()` |
| **M-REWARD** | `if (globalThis.__H1R_MEASURE__) __H1R_MEASURE__.reward(rewardSignal);` immediately before `updateLocalEmotion({` |

**New files:**
- `measure.mjs`: records `[callIndex, rewardSignal]` per call. It draws nothing and returns nothing to the agent.
- `run_h1r.mjs`: the experiment driver. It records provenance hashes, validity conditions, and the reward record (or its digest). It performs no aggregation.

**Verification changes:**
- the recorder (`run_one.mjs`) gains a measurement reconciliation, per-attempt `p_e`, an exact per-draw check against a mirrored environment stream, and goal-credit reconstruction;
- gates R2a–R2e, R2x, R2-AV, M1–M5 and M-AV are added; R1e and E2 are re-specified; static gate S6 is added;
- two new mutants: `mutant-goaldraw` and `mutant-measure`.

**Untouched (FACT):** `env.js`, `arms.js`, `run.js`, `runtime.mjs`, the topology, `T_SHIFT`, Beta(1,1), α, γ, decays, reward constants, arms and the held-out stream. There are 0 tracked changes outside `experiments/h1r/`.

## 4. Verification

Conformance suite: 460 runs, 0 errors.
- **First pass: 57 PASS / 4 FAIL / 3 INFO** (`conformance_run.pass1.log`).
- **Final pass: 58 PASS / 4 FAIL / 4 INFO** (`conformance_run.log`). This adds the exact check R2x and the R2b-INFO diagnostic; every first-pass verdict is unchanged.

| # | Required property | Result | Class |
|---|---|---|---|
| 1 | Goal-entering edges now draw | **R2a:** 84,051 goal-entering attempts, every realised goal entry drew (46,861/46,861), 0 per-tick draw mismatches. **R1e:** draws 820,871 = 429,078 moves + 344,932 slips + 46,861 goal entries; at most 1 per tick; equals the environment stream's own counter. | **FACT** |
| 2 | Goal-entering edges can slip according to `p_e` | **R2a:** 37,190 goal-entering slips. **R2x:** each of the 84,051 goal-entering outcomes equals `u_k < p_e`, where `u_k` is the k-th draw of an independently mirrored environment stream; 0 mismatches. | **FACT** |
| 3 | Non-goal and goal-entering edges use the same mechanism | **R2x:** the same exact check holds for all 736,820 other attempts (0 mismatches, 0 unattributed draws; checked = draws). **S6:** one draw call site, with no goal exclusion. **R2c:** `env.attempt` and `env.trueP` both read `pFor`. | **FACT** |
| 4 | No extra RNG draws | Exactly one draw per edge-attempt decision, none otherwise (R1e). The measurement draws nothing (M4) and leaves every RNG draw count unchanged (M3, fingerprints including cognitive and visual draws). Stream separation holds: `verify_M7` G2 passes with ON. | **FACT** |
| 5 | R1 semantics intact | R1a: 475,939 Q updates, 0 mismatches, 0 non-edge. R1b: 0 learning on unrealised ticks. R1c: return moves 71,826/71,826. R1d: 0 updates on 344,932 slip ticks, **goal slips included**. R1-AV holds. R2d: goal resets 46,861 = realised goal entries; a slipped goal attempt causes no reset, reward or learning. R2e/B3: the trust store equals the independent reconstruction (goal attempts and successes included); s ≤ a everywhere. | **FACT** |
| 6 | Measurement does not change behaviour or RNG | **M3:** fingerprint (including all draw counts) identical with and without the measurement, 21/21 across all 7 arms. **H2:** recorder plus measurement neutral, 21/21. **M4:** the probes are call-only statements; `measure.mjs` has no RNG reference. | **FACT** |
| 6b | Measurement is exact | **M1:** 475,939 events = 475,939 learning passes; 0 presence mismatches; 0 events on unrealised ticks; 0 duplicates, orphans or non-finite values. **M2:** every value equals the reward the main TD update used (475,939 compared, 0 mismatches). **M-AV:** a probe moved before the reward chain gives 4,952 mismatches; in B2 order the probe follows the reward onto 13,110 unrealised ticks with 0 value mismatches. **M5:** the driver reproduces the verified run's fingerprint and reward-record digest in 6/6 runs, all validity conditions true. | **FACT** |
| 7 | ORACLE operates against the same physical process | **R2c:** both `env.attempt` and `env.trueP` read `pFor(from, to)`; A7 goal-entering outcomes calibrate (z = −0.13, n = 12,478). Delivery exactness: G5 and e3e4 I.2-A7 pass with ON. Goal-incident edges, where A7 previously saw p ≈ 0.25–0.45 on edges that never slipped, are now governed by that same p. | **FACT** |
| 8 | No H1-R comparative outcome generated | No return, window, rate or arm contrast was computed. The measurement block carries counts and digests only. | **FACT**, with the disclosure in §6 |
| 9 | No scientific parameter changed | The transform diff is exactly the five R2 items; no change to `env.js`, `arms.js`, `run.js` or the configuration code. | **FACT** |

**Anti-vacuity (FACT).**
- **R2-AV:** `mutant-goaldraw` and B2 order both give 0 goal slips and fail calibration (z = 25.4 and 37.4).
- **M-AV:** as above.
- **R1-AV, A-AV, B-AV, C-AV, D-AV, E-AV and F-AV** all hold.

**Determinism (FACT).**
- H1: 21/21.
- G1′ (OFF ≡ B2): 21/21.
- Existing gates: OFF identical to pristine in all 25 scripts (619 PASS / 1 FAIL, the historical S1b S1.7).

**Existing gates with conformance ON (FACT):** 608 PASS / 12 FAIL. This is exactly the set classified in R1 (e1e2 G1f/AV8b; cap B1/B3/B4/H7; goal B2/B3; G8.4c; stepledger A3; S1b S1.7; S2.4b), minus `verify_G15` C2, which now passes. No new failure.

## 5. Remaining FAILs and their classification

| Gate | Result | Class | Explanation |
|---|---|---|---|
| **R2b** | goal-entering z = 1.92; other edges z = **6.18** | **Measurement problem in my own gate (pseudoreplication).** No mechanism fault (FACT, by R2x). | All 287 main runs use agent seed 20260819000, and the environment stream (`seed XOR 0x5EED`) has no configuration or arm component, so every run consumes the **same** uniform sequence. Pooling them as independent replicates that sequence's own sampling deviation 287 times. **FACT:** the deviation is phase-structured. The shared stream's first ~1,457 draws sit below uniform (mean F̂ − x = −0.0051 for reliable p, −0.0110 for unreliable) and the remainder above (+0.0050, +0.0116). Observed per-attempt excess is −0.0081 in Phase I (z = −14.1) and +0.0141 in Phase II (z = +19.7), matching in sign and magnitude. Mulberry32 shows no lag-1 dependence over 10⁷ draws. Two earlier explanations of mine (a marginal CDF shift over all 2,900 draws; serial dependence) were **refuted by measurement** before this one was confirmed. |
| F2, G15′ (as originally declared) | 6/287 runs without a goal reach | Measurement problem in my gate (unchanged from R1) | Contradicts frozen §9.4; F2′ and G15′(9.4) pass |
| P1 | A2 ≡ A5 in 5/41 configurations | Scientific-design property (pre-existing) | The aggregate route is a one-sided floor. P2 and P3 pass 246/246. |

**UNRESOLVED, new design fact for the pre-registration (D-3).** The frozen environment stream is shared by every configuration and arm of one agent seed. Across arms this is intended common random numbers. Across configurations it couples the units that the frozen configuration-clustered analysis treats as independent: in Stage 2, each seed's stream is shared by all 30 configurations. A ruling is needed on crossed (configuration × seed) inference, or on deriving the stream from (seed, config), which would change frozen §5.1.

## 6. Disclosures

- **FACT:** my smoke test printed the per-arm goal-reach count of A1 and A7 for one diagnostic configuration (900074/1). It was not used, compared or reported further.
- **FACT:** as in every earlier round, `runs.json` holds per-run mechanism counts, including per-run goal-entry counts, for the 41 diagnostic configurations. These are non-confirmatory and already consumed. No confirmatory configuration or seed has been touched.
- **RECOMMENDATION:** make pilot-stage verification evidence outcome-blind, storing per-run gate booleans instead of counts.

## 7. Classification summary

| Class | Items |
|---|---|
| **FACT** | Items 1–9 of §4; runtime path (§1); exact mechanism (R2x); measurement exact and neutral (M1–M5); OFF ≡ B2; no new existing-gate failure; R2b's cause (a shared stream, measured) |
| **INFERENCE** | The ORACLE ceiling is now consistent with the physical process for every edge (from R2c plus R2x); the shared-stream coupling may affect configuration-clustered Stage-2 inference (not yet quantified) |
| **UNRESOLVED** | D-3 extended by the shared-stream fact; windowing of the reward record (needs D-6); the remaining measurement instruments (links ①–④, `analyze.js`) and the other OPEN register items D-2, D-4 and D-6 to D-11 |
