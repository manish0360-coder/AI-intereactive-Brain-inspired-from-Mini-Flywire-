# H1-R pre-registration v1.0: belief-driven adaptation under hidden transition reliability (conformed M7 build)

**Status: FROZEN.** Frozen 2026-10-04 under the Research Director ruling "FINAL FREEZE AUTHORIZATION — H1-R".

**Integrity record:** [`H1R_PREREGISTRATION_v1.0.sha256`](H1R_PREREGISTRATION_v1.0.sha256), SHA-256 over the exact bytes of this file. A mismatch is a protocol deviation and must be reported, never silently reconciled.

**What this document authorises:** nothing is run by it. The measurement-layer milestone (§9) precedes Stage 1, and every gate in §11 must be green before Stage 1 and again before Stage 2.

**Predecessor:** [`M7_PREREGISTRATION.md`](../cognitive-audit/M7_PREREGISTRATION.md) v1.0, frozen 2026-08-19, SHA-256 `2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9`, with errata M7-ERR-01 … M7-ERR-10.

**Inheritance rule:** this document inherits every M7 clause that it does not explicitly supersede. Supersessions are listed in Appendix A. Nothing else is changed. H1-R tests the M7 design **as frozen**, on a runtime made to conform to it.

**Tags:**
- **FROZEN**: binding design;
- **FACT**: verifiable from the repository or committed evidence, with the source cited.

No statement in this document is a recommendation.

---

## 1. Lineage, rulings and build identity

### 1.1 Rulings (all Director rulings, 2026-10-04; decision log entries D-013 … D-018)

| Ruling | Record |
|---|---|
| H1-R conformance authorisation (N1, N2, RANDOM, FROZEN, GOAL/G15′, P4) | `experiments/h1r/evidence_final/` |
| Conformance correction (CRG; N2 clarification; Q-KEY, since superseded by R1) | `experiments/h1r/evidence_r2/CORRECTION_REPORT.md` |
| R1: realised-outcome learning order | commit `742f239`; `experiments/h1r/evidence_r1/R1_REPORT.md` |
| R2: goal-entry reliability draw (D-1) and measurement integrity (D-5, part 1) | commit `19d0786`; `experiments/h1r/evidence_d1d5/R2_REPORT.md` |
| R3: configuration-scoped environment stream (D-3B) | commit `e8e904a`; `experiments/h1r/evidence_r3/R3_REPORT.md`; [`H1R_ERRATUM_R3_ENVIRONMENT_SEED.md`](H1R_ERRATUM_R3_ENVIRONMENT_SEED.md) |
| Freeze of this document (D-2 … D-11) | this file |

### 1.2 Build under test (FACT)
- Instrument commit `e8e904a2f213e45dc0fb326f36cf72809f5862cf`.
- M7 instrument build B2 = `707cb1e5205a7e9979f81092ee1ebfa0fe28922e`, materialised blob by blob with verified blob ids (`build_tree.mjs`).

SHA-256 values below are over **committed blob content at `e8e904a`**.

| File | SHA-256 |
|---|---|
| `experiments/h1r/conformance_transform.mjs` | `cf30e20a71d59a67ba6163c55b94399d5d74f3b4609c6e3ea37e27080d5bfd5a` |
| `experiments/h1r/env_seed.mjs` | `80caf09aae290bc77c9f370dfcaaa531490a2841df801505a31bb7faecdc136e` |
| `experiments/h1r/runtime.mjs` | `48844fc1cff6470bd9f72eb02c8db417ccb4fef1b56db3ba427cfb0ab3469771` |
| `experiments/h1r/run_h1r.mjs` | `0f93fea6842c4eff9b4a619fe2bb09a85e6743cb8cc56b1d5557da8147084616` |
| `experiments/h1r/measure.mjs` | `771dcb466c829e6c37eba6429ffef3a7c9e51540caf04af87813e51eaea9a81e` |
| `experiments/h1r/build_tree.mjs` | `33d5f3d84f2609799f796c5cebede586f6eb5138a4c025a56ac2dace8f160402` |
| `experiments/h1r/verify_conformance.mjs` | `056457b919d2cd53bc1d434fbf7b3f5a845b2de99deb6f13e7c0e986373f1906` |
| `experiments/h1r/run_one.mjs` | `e294ce6561882ba40d1be59e2e75e8b266733daf3c1d5933d5d43029dc4b6f01` |
| `experiments/h1r/run_existing_gates.mjs` | `3bddb021b23f32831fccd8480f6f9f87c9299bed52cc83203f3fc6ff7c1c88a2` |
| `experiments/h1r/verify_hook.mjs` | `2adb49deaa8a3e2b66fc2ba1389252b6c10a3800ddb3e2f1d13a8176a3b66006` |
| `research/preregistrations/H1R_ERRATUM_R3_ENVIRONMENT_SEED.md` | `bf3bd47306853300df9518c1c043638bbdda1864bd51802b092837f0a6761888` |

**Conformed files** (blob → SHA-256 before → after, `evidence_r3/conformance_gates.json`):

| File | Blob | SHA-256 before | SHA-256 after |
|---|---|---|---|
| `main.js` | `113fa47` | `537f37a2…` | `c5c3828adb4eeb9154289bac4010801f49a8061b9f1211ac72bf6f572d83d206` |
| `render/qlearning.js` | `d021bb0` | `a3d4f4b8…` | `fdc2798c3b40559ecf9342cc817db3da8699deba3dc0cf35b1aaf51de68c939d` |
| `render/episodeManager.js` | `c00c3b5` | `757d549b…` | `a8fd8dec477204c1e4a076975919f5efd138529ff1d12d84737f8362532e7eac` |
| `instrumentation/rng.js` | `7d0c4ff` | `8ec69622…` | `289d9229a6a3cfff579ecffb4bea23205a19e9e11a2e3e8b6dbe70134a0a2cc0` |

**Verification at this build (FACT, `experiments/h1r/evidence_r3/`):**
- 469 single-process runs, 0 errors: 71 PASS, 3 FAIL (F2, G15′ and P1, classified in §11), 5 INFO.
- Existing gates: OFF ≡ pristine on 25/25 scripts; ON identical to the R2 evidence (608 PASS / 12 FAIL, classified).

**FROZEN, instrument identity across stages:**
- The measurement-layer milestone (§9) will change the transform. Its SHA-256 values, and that of `analyze.js`, are recorded **before the first Stage-1 run**.
- Instruments and analysis code are identical in Stage 1 and Stage 2.
- Any change after Stage-1 data exist is a reported protocol deviation.

---

## 2. Supersessions of the frozen M7 text (summary; register in Appendix A)
- **Runtime conformance** (validity repairs): N1, N2, A3, A4, GOAL, P4, CRG, R1 (H1R-S1), R2 (D-1), R3 (§5.1 environment stream).
- **Interpretation notes:** H1R-S2 and H1R-S3 (the §10.1/§10.2 premises do not hold).
- **Gate specifications:** H1R-S4 (G8.4c) and H1R-S5 (G15 → G15′).
- **Sampling:** pilot material (§7).
- **Analysis:** the confirmatory test and its CIs (§12); the power procedure (§13).
- **Specification of frozen-but-unpinned items:** §6, §8, §10, §14.
- **Waiver of an exploratory component:** §15.

**No hypothesis, arm, window, primary metric, α, family membership, falsification threshold or claim-ceiling clause is changed.**

---

## 3. Scientific question and hypotheses (FROZEN, M7 §2, unchanged)

The question: does a calibrated internal estimate of a hidden per-edge transition property causally change action selection and improve outcomes and post-shift re-adaptation? The estimate is the existing Beta-Bernoulli path-trust estimator, credited by traversal outcome. The comparison is with the same agent with that estimate severed, in the identical state, under the identical RNG streams.

- **H1:** the estimator (1) converges toward `p_e`; (2) changes action selection at a measurable rate; (3) produces changed decisions that yield higher subsequent return than the belief-severed agent's, in the identical state under the identical RNG stream.
- **H0:** with belief severed, performance, adaptation speed and post-shift recovery are statistically indistinguishable at the Stage-2 sample size.
- **H1-strict:** H1 holds **and** the advantage survives against A5 **and** A6. Only H1-strict licenses causal language.
- **Competing hypotheses A–E:** as frozen M7 §2.4.

The mechanical verdict is §14.

---

## 4. Environment and runtime semantics (FROZEN, as built at `e8e904a`)

**Graph.** 20 nodes and 39 undirected `connections.json` edges, traversable both ways. No topology change.

**Hidden variable.**
- 13 UNRELIABLE edges with `p_e` ~ U(0.25, 0.45); 26 RELIABLE edges with `p_e` ~ U(0.90, 1.00).
- `p_e` is symmetric per undirected edge.
- At tick 1500 the two sets swap silently.
- The secondary Beta(2,2) regime is unchanged and exploratory (M7 §3.5).

**Transition process** (M7 §3.3; R1; R2). For each movement decision there is exactly one draw from `liveRng("environment")`, before the self-learning section.

| Case | Learning (existing rules on the realised transition) | Trust |
|---|---|---|
| Success u → v | the full self-learning section on u → v (reward, prediction error, Q(u, v) with S′ = v); return moves included | a(u→v) += 1, s(u→v) += 1 |
| Slip u ↛ v | the realised transition is u → u, which the section's existing entry guard excludes: no reward, no prediction error, no Q update | a(u→v) += 1 |
| Goal entry u → g (R2) | draws like any edge. On success: learns with a flat +12 and S′ = goal, the existing reset follows. On a slip: an ordinary slip, with no reset. | credited like any traversal |

**Reward** (M7 §3.4, GOAL): +12 on a realised goal entry; otherwise +2 if sim(u, v) > 0.45, +0.3 if sim(u, v) > 0.15, and −0.4 otherwise. `sim` is the cosine similarity of the agent's neuron embeddings.
- FACT: the boot embeddings are a function of the agent seed. During a run, `_learnSemantic` → `trainEmbedding` moves them along learned episode transitions (`render/episodeManager.js`, `render/embeddings.js`, B2).
- FACT: `rewardSignal` exists only on ticks whose self-learning section runs (a realised move or goal entry).

**Environment stream (R3, erratum).** `envSeed = (0x60800000 + slot · 4096 · 0x6d2b79f5) mod 2^32`, with `slot = (agentSeed − 20260819000)·64 + blockCode·32 + acceptedConfigIndex`; blockCode 0 = pilot, 1 = held-out.
- There is no arm term.
- The verified domain is agent seeds 20260819000–009 and 100–119, both blocks, index 0–31. Any other position is refused.

**Observability** (M7 §3.8). The agent never observes `p_e` or a labelled slip.

**Run structure.**
- 3000 ticks; Phase I is τ 0–1499 and Phase II is τ 1500–2999 (§6).
- Goal = `GOALS[configIndex mod 4]` over {8, 12, 16, 19}.
- An episode ends at a goal reach or at the 150-tick cap.
- P4 clears the pre-reset reasoning at both reset sites.
- Run settings: `envMode = on`, `creditMode = on`, `pin = on`, `tickUnit = 'step'`, `ticks = 3000`, one OS process per run, cold `localStorage`.
- The runtime is installed with `trustMode = 'traversal'`.

**Learning-authority pins** (M7 §10.2): learning authority ≡ 1.0 and `dampQ` disabled in every arm, with G12 binding.

---

## 5. Arms (FROZEN, M7 §4; semantics as built)

| Arm | E3: per-edge `bayesianTrust` | E4: aggregate | Learning | Selection |
|---|---|---|---|---|
| A1 BELIEF | raw | raw | all | normal |
| A2 ABLATION | 0.5 | null | all | normal |
| A3 RANDOM | raw | raw | all | the executed step-0 action is uniform over graph neighbours (one cognitive draw) |
| A4 FROZEN | raw | raw | no Q write and no trust write (Q- and trust-frozen; other stores adapt) | normal |
| A5 AGGREGATE-ONLY | 0.5 | raw | all | normal |
| A6 SHUFFLED | trust(σ(e)), with σ a fixed derangement seeded by `agentSeed XOR 0xBEEF`; canonical direction of the mapped edge | raw | all | normal |
| A7 ORACLE | configured `p_e` of the current phase (`env.trueP`) | raw | all | normal |

Held identical across arms within a (configuration, seed) cell (M7 §4.3, §5.2): graph, `{p_e}`, goal, configuration seed, agent seed, every stream initialisation (including the R3 environment stream), the tick budget, every scoring coefficient, and the learning-authority pins.

---

## 6. Ticks, phases and windows (D-6, FROZEN)
- One tick = one `runAgent()` call (`tickUnit = 'step'`).
  - FACT: every run makes exactly 3,005 calls, of which `pressSpace` runs the first 5.
- **τ = i − 5**, where i is the 0-based `runAgent()` call index (the `measure.mjs` event index). Calls 0–4 belong to no window.
- Phase II iff τ ≥ 1500. This is exact, because `env.setTick(5l)` precedes loop l.
- Windows (inclusive):

  | Window | τ range | Role |
  |---|---|---|
  | W1 | [0, 299] | primary |
  | W2 | [300, 1499] | descriptive |
  | W3 | [1500, 1799] | primary; carries the ERR-07 §3.1 limitation |
  | W4 | [1800, 2999] | descriptive; a null is predicted |

  Window sizes |W| are 300, 1200, 300 and 1200.
- "At τ = 1499" means after call 1504, at the loop boundary before `setTick(1500)`. "At τ = 2999" means after call 3004.

---

## 7. Seeds, configurations and streams (D-2, FROZEN)
1. **Pilot configurations.** The ERR-07 sequential accepted stream from configuration seed **886000** (`generateAcceptedStream` semantics; configIndex = accepted index i; goal = GOALS[i mod 4]). Pilot = indices 0–4. **Hard bound 889999:** if the configurations required at any point are not accepted at or below 889999, no further run starts, and the study halts and is reported, with no continuation.
2. **Pilot agent seeds:** 20260819004–008. 20260819009 is not used.
3. **Extension** (M7 §15.0; at most once; §13): accepted indices 5–9 of the same stream × the same seeds 004–008. The pooled pilot is 10 × 5, fully crossed.
4. **Confirmatory material.** The 30 accepted configurations of the ERR-07 stream from 900500. Agent seeds are the first S* of 20260819100–119, ascending.
5. **R3 positions:** (agentSeed, `pilot` | `heldout`, accepted index).
6. **Registry actions before any generation:**
   - record the H1-R pilot configuration block 886000–889999;
   - record trajectory records (H1-R, pilot) for 20260819004–008;
   - record (H1-R, registered) for the confirmatory seeds used;
   - record H1-R's use of the held-out stream before Stage 2.

---

## 8. Outcomes and metric definitions (D-4, FROZEN)

**Primary metric** (M7 §8.5). For each run and window, `R_W = ( Σ r over events [i, r] with τ = i − 5 ∈ W ) / ( |W| / 100 )`.
- A tick without an event contributes 0.
- Stale and replay ticks are not excluded.

**Goal-reach rate** = (number of events with r = 12 and τ ∈ W) / (|W|/100).

**Post-shift recovery half-life** (M7 §8.5):
- TR(τ) = Σ r over τ′ ∈ [τ − 99, τ];
- thr = 0.5 · R_W2;
- t_below = the first τ ∈ [1500, 2999] with TR(τ) < thr. If there is none, HL = 0;
- otherwise t_rec = the first τ ∈ (t_below, 2999] with TR(τ) ≥ thr, and HL = t_rec − 1500. If there is no t_rec, HL = 1500 (right-censored; the censoring count is reported per arm).

**F-10 measure.** For arm A1, `R_all = Σ r over τ ∈ [0, 2999] / 30` per run.
- P̄ = the mean of the pilot configuration means (Stage 1, extension included).
- H̄ = the mean of the held-out configuration means.

**Link ③ flip rate (A1 runs).**
- A **decision tick** is a τ on which `runPrediction` step 0 writes a non-null selection.
- argmax₁ = the first key of the existing stable descending sort of the A1 weights.
- The **shadow weight** of a candidate replaces the delivered T by 0.5 in both the pre-clamp score F and `arbitrate`'s `confidenceScore`; each changes by −12(T − 0.5).
  - Every other input stays at its A1 value, including the realised `drift` value, the executive weights and A1's `confidenceState`.
  - The ±400 clamp is re-applied.
  - The shadow never calls `calculateDecisionScore`.
  - Candidates whose weight has no trust input keep their weight.
- argmax₀ = the first key of the same stable sort of the shadow weights.
- A flip is argmax₁ ≠ argmax₀, regardless of ε-exploration.
- **F-2 statistic:** FR = Σ flips / Σ(3000 − replay ticks), pooled over all Stage-2 A1 runs.
- Also reported: the unfiltered rate (Σ flips / Σ 3000), per-window rates, and the monotonicity diagnostic (decision ticks binned by max_k |T_k − 0.5| into 5 equal-width bins on [0, 0.5]; Spearman ρ of bin index against rate, with the §12 bootstrap CI).

**Link ④ conditional advantage.**
- **Population:** flipped decision ticks t ≤ 2980 of each A1 run, ε ticks included.
- **Sample:** m = 10 per run, or all if fewer. `makeRng(770004)` drives a Fisher–Yates permutation of each run's population sorted by t; runs are taken in (configuration index, then seed) ascending order, and the first m are kept.
- **Fork:** a fresh process replays the identical A1 run and switches the E3 and E4 deliveries to A2's immediately before call t + 5.
- **CA** = the mean over the sampled decisions of [Σ r over τ ∈ [t, t+20) in A1] − [the same in the fork].
- A crashed fork is re-run once; if it crashes again, the sample is dropped and reported.

**Link ② calibration (A1 runs).**
- **Keys:** directed keys `u->v`, goal-entering keys included, with ≥ 5 raw attempts within the phase ([0, 1499] for τ = 1499; [1500, 2999] for τ = 2999).
- trust = (s+1)/(a+2) from the store at τ; p = that phase's configured `p_e`.
- **ρ_run** = Spearman with average ranks. It is undefined if fewer than 3 keys qualify, and the count of undefined runs is reported.
- **F-1 statistic:** the mean of ρ_run over A1 runs at τ = 1499.
- **Permutation null:** 10,000 shuffles per run, using one `makeRng(770003)` sequentially over runs in (configuration index, then seed) order.
- **Brier score:** over every drawn attempt, using the key's trust just before the attempt, against the prequential base rate (successes so far + 1)/(attempts so far + 2).
- Also reported: a calibration curve (10 equal-width trust bins at τ = 1499) and the rank partial correlation controlling for raw attempts.
- Undirected pooled variant (descriptive): (s₁ + s₂ + 1)/(a₁ + a₂ + 2).

**Link ①.**
- n_updates = trust-attempt increments in W;
- at τ = 1499 and 2999, the fraction of attempted keys with ≥ 3 raw attempts;
- trust-value entropy in bits, over 10 equal-width bins.

**Steps-to-goal.**
- Episodes split at goal and cap resets.
- Per run, the Kaplan–Meier median, censored at the cap and at the run end. An undefined median counts as +∞ in the median of run medians.

**Trajectory entropy.** Bits, over realised directed transitions in W.

**Slip rate.** Over drawn, non-goal-entering attempts in W; goal-entering attempts are reported separately. Descriptive.

All metrics are computed by `analyze.js` (§1.2 identity rule).

---

## 9. Measurement status and the required milestone (D-5, FROZEN)

**FACT:** `run_h1r.mjs` saves the reward events `[callIndex, rewardSignal]`, `calls`, the fingerprint, `envCounters` and the validity flags.

**Measurable now:**
- R_W in all windows;
- F-4, F-5, F-6, F-8, F-9, F-11;
- the headline fraction;
- goal-reach rate;
- half-life and F-7;
- F-10;
- A5 ≡ A2 identity;
- whole-run n_updates.

**Must exist and be verified before Stage 1** (neutrality, exactness and anti-vacuity gates for each):
1. per-tick records: replay, decision and no-commit flags;
2. per-attempt records: τ, edge, goal-entering flag, outcome, prior trust;
3. goal and cap reset events;
4. trust snapshots with raw per-phase attempt counts at τ = 1499 and 2999;
5. A1 and shadow weights, with an observational pre-clamp probe in `render/scoring.js`;
6. the A5 floor-binding counter;
7. the fork driver and mid-run arm-switch hook, with three gates:
   - a no-switch fork reproduces the original run;
   - a switch at call 0 reproduces the A2 run;
   - a fork equals the original for τ < t;
8. `analyze.js`;
9. the run orchestrator, with registry checks;
10. the registry records of §7.

---

## 10. Inclusion, exclusion and validity (D-7, FROZEN; M7 §9 unchanged)
- **Stale exclusion.** Stale-execution ticks (= replay ticks, ERR-08) are excluded from links ③ and ④ only, with filtered and unfiltered results reported (M7 §9.3). Under ERR-08 the stale ticks carry no selection, so the numerators are identical and only the denominators differ.
- **Validity failures.** Any of the 11 validity flags false = a crash under M7 §9.4: the whole (configuration, seed) pair is dropped from all 7 arms, counted and reported. The 11 flags are:
  - `completed`, `episodeCapArmed`, `replayCooldownDeterministic`;
  - `runtimeAttached`, `transformMatches`, `measurementClean`;
  - `envStreamScoped`, `envDrawsWithinReserve`, `cognitiveDrawsWithinReserve`, `visualDrawsWithinReserve`, `envSegmentDisjointFromConfig`.

  §12's row rule then applies.
- A registry refusal at planning time is not an exclusion: the run never executes.
- Runs without a goal reach are included (M7 §9.4).
- No other exclusion exists (M7 §9.5).

---

## 11. Gate battery (D-8, FROZEN)

**Blocking before Stage 1 and again before Stage 2:**
- **Frozen:** M7 G1–G6 and G8–G16, with H1R-S4 and H1R-S5.
- **Conformance:**
  - X0, G1′;
  - A1–A6, A-AV;
  - R1a–R1e, R1-AV;
  - R2a, R2c, R2d, R2e, R2x, R2-AV;
  - B1–B3, B-AV;
  - C1–C3, C-AV;
  - D1–D3, D-AV;
  - E1, E2, E-AV;
  - F1, F2′, F-AV;
  - G15′-S, G15′(9.4);
  - S1–S6, T1;
  - P2, P3;
  - M1–M5, M-AV;
  - R3-F, R3a, R3b, R3c, R3c2, R3d, R3e, R3h, R3j, R3-DRV, R3-CAL, R3-AV;
  - H1, H2;
  - every gate of the §9 milestone.

**Non-blocking, reported:**
- R2b (it pools arms that share a stream by design; R3-CAL is the calibration gate);
- P1 (A2 ≡ A5 on 7/41 diagnostic configurations at `e8e904a`);
- F2 and G15′ as originally declared (they contradict M7 §9.4);
- the INFO gates;
- the classified historical-verifier failures with conformance ON: e1e2 G1f/AV8b, cap B1/B3/B4/H7, goal B2/B3, stepledger A3, S1b S1.7, S2 S2.4b.

Any blocking-gate failure halts the study (M7 §9.4).

---

## 12. Confirmatory test (supersedes frozen §11.2's test and §11.4's clustering for paired differences)

For comparison k ∈ {A2, A5, A6} and window W ∈ {W1, W3}, let d_cs = Y^{A1}_cs(W) − Y^{k}_cs(W) over the complete C × S array of held-out configurations and confirmatory seeds.

- **Model:** d_cs = μ + α_c + β_s + ε_cs, with crossed, independent, mean-zero random configuration and seed effects.
- **Estimand:** μ is the mean paired difference over accepted configurations, weighted by the fixed goal allocation (8, 8, 7, 7)/30, and over agent seeds.
- **Statistic:** t′ = d̄ / √((MS_C + MS_S)/(C·S)), with MS_C = S·Σ_c(d̄_c· − d̄)²/(C−1) and MS_S = C·Σ_s(d̄_·s − d̄)²/(S−1). It is referred to Student's t with ν = min(C−1, S−1) degrees of freedom, giving a two-sided p. MS_CS is not used in the test.
- **Degenerate case:** if MS_C + MS_S = 0, then p = 1 when d̄ = 0, and p = 0 otherwise.
- **Holm:** the six p-values {A1vA2, A1vA5, A1vA6} × {W1, W3} are Holm-adjusted, p̃₍ⱼ₎ = max_{i≤j} min(1, (7−i)·p₍ᵢ₎). A member is **confirmed iff p̃ < 0.01 and d̄ > 0**.
- **99% CI:** the 99% CI of a paired difference is d̄ ± t_{ν,0.995}·√((MS_C + MS_S)/(C·S)). A CI "contains 0" iff lower ≤ 0 ≤ upper. This CI is used for "≈" (frozen §15.0), F-4 to F-9 and F-11 (on the pilot array).
- **Incomplete arrays:** any configuration row containing a dropped cell is removed before testing. If fewer than 2 rows or 2 seeds remain, the test is not computable and the comparison is not confirmed.
- **Descriptive only:** MS_CS, the variance components and every Satterthwaite or Wilcoxon variant.

**Further frozen analysis elements**
- **Two-way (pigeonhole) bootstrap.**
  - B = 10,000. Each analysis starts a fresh `makeRng(770002)` (mulberry32, `instrumentation/rng.js`).
  - Each iteration draws C configuration indices, then S seed indices, uniformly with replacement (⌊u·n⌋), and recomputes the statistic on the available cells.
  - The 99% interval is the 50th and 9,950th order statistics (1-based).
  - Used for: the headline fraction (A1 − A2)/(A7 − A2) per primary window; the F-1 mean ρ; F-3; the link ③ monotonicity diagnostic; and descriptive link CIs.
  - The headline-fraction degenerate-denominator rule (M7 §11.3) uses the §12 CI of (A7 − A2).
- **Effect sizes:** d̄; the variance components σ̂_c² = max(0, (MS_C − MS_CS)/S), σ̂_s² = max(0, (MS_S − MS_CS)/C), σ̂_e² = MS_CS; and the matched-pairs rank-biserial correlation on configuration means. All descriptive.
- **Sensitivity analyses** (descriptive; disagreement in sign with the primary is reported as a finding):
  - min F′ with Satterthwaite df;
  - Wilcoxon (Pratt, two-sided) on all cells;
  - Wilcoxon on configuration means;
  - Wilcoxon on seed means.
- **Basis** (Appendix B.2). The test's size is ≤ α for every σ_c², σ_s², σ_e² ≥ 0 and every C, S ≥ 2, under normal, independent effects in a complete array. The proof:
  - D = (MS_C + MS_S)/(CS) = aU + bV′ with a + b = Var(d̄) + σ_e²/(CS);
  - g(x) = 2[1 − Φ(c√x)] is convex;
  - χ²_m/m ≤_cx χ²_k/k for m ≥ k = min(C−1, S−1).

---

## 13. Stage 1, the single extension, and Stage 2 (frozen §12 and §15.0 made exact)

Stage 1 uses the first 5 accepted configurations (indices 0–4) of the ERR-07 sequential stream from configuration seed 886000 (hard bound 889999), × agent seeds 20260819004–008 × 7 arms, at R3 positions (seed, pilot, index).

- **F-11 first.** F-11 is evaluated first: the §12 99% CI of (A7 − A2) on the 5 × 5 array, in W1 and W3.
  - If the CI excludes 0 in at least one window, there is no extension.
  - If it contains 0 in both, exactly one extension runs: indices 5–9 of the same stream × the same seeds × 7 arms.
  - F-11 is then re-evaluated once on the 10 × 5 array. If the CI still contains 0 in both windows, the study is void and Stage 2 does not run.
  - If the required accepted configurations do not exist at or below 889999, the study halts and is reported.
- **What Stage-1 data are for:** only the gates, F-11, the variance components of the power procedure (on the final pilot array), and F-10's pilot reference. They never enter a §12 test. They may void, size or veto, but never support an H1 verdict.
- **Fixed before Stage 2:** S* and the go/void decision are fixed before any Stage-2 run.
- **Single analysis:** Stage-2 data are analysed once, after all Stage-2 runs and validity checks, by the `analyze.js` whose SHA-256 was recorded before the first Stage-1 run.
- **Reporting collision facts:** configuration-generator contacts are reported as exact enumerations over (cell, candidate) pairs. Probabilities are labelled model-based (geometric acceptance at the ERR-09 rates; union bound over cells) and given at point and conservative rates (Appendix B.1).

**Power procedure** (supersedes frozen §12.3 steps 1–3):
1. From the final pilot array of A1 − A2 cell differences, for each W ∈ {W1, W3}: μ̂ = d̄ and σ̂_c², σ̂_s², σ̂_e² (§12), used as they are.
2. For each S ∈ {2, …, 20}, run B = 10,000 iterations:
   - draw a_c ~ N(0, σ̂_c²) for 30 configurations, b_s ~ N(0, σ̂_s²), and e_cs ~ N(0, σ̂_e²), with normal deviates from `makeRng(770001)` through Box–Muller in the fixed order a, b, e (row-major);
   - form d_cs = μ̂ + a_c + b_s + e_cs;
   - apply the §12 test and reject iff p < 0.01/6.
3. S* = the smallest S with power ≥ 0.80 in both W1 and W3; otherwise S* = 20, and the cap rule (frozen §12.4) applies unchanged.
4. Confirmatory runs = 30 · S* · 7, using the first S* of 20260819100–119.

**No optional stopping (FACT, structure of the protocol).**
- Stage-1 outcomes reach Stage 2 only through the go/void decision and S*, both fixed before any Stage-2 run.
- Stage-2 cells share no configuration seed, agent seed, R3 environment segment or configuration-generator segment with Stage 1. The only cross-stage contacts (an environment segment touching a candidate generator) are enumerated, with their model probabilities, in Appendix B.1.
- The §12 test has size ≤ α at every fixed S, so P_H0(confirmation) = Σ_S P(S* = S) · P_H0(reject | S) ≤ α.
- There is no interim look at Stage-2 outcomes.
- **Stage 1 is never reported as evidence for or against H1.**

**Determinism re-runs.** Every arm of the cell (configuration with index c ≡ 0 mod 5, first seed) is re-run in fresh processes, in both stages. Any fingerprint mismatch halts the study.

---

## 14. Falsification criteria and verdict function (pins frozen §2, §15, §16 and §18)

A criterion based on a 99% CI of a difference fires when the CI contains 0. F-3 and F-7 also fire when the CI lies below 0. F-1 and F-3 fire when their statistic is undefined.

| Criterion | Fires iff (frozen thresholds; windows and directions pinned) |
|---|---|
| F-11 | §13 procedure: the (A7 − A2) CI contains 0 in both W1 and W3 after the single extension (the study is void) |
| F-1 | mean ρ_run at τ = 1499 < 0.30, or its CI contains 0, or the statistic is undefined |
| F-2 | FR < 0.01 |
| F-3 | the conditional-advantage CI contains 0 or lies below 0, or CA is undefined |
| F-4 | the (A1 − A2) CI contains 0 in both W1 and W3 |
| F-5 | the (A1 − A6) CI contains 0 in both W1 and W3 |
| F-6 | the (A1 − A5) CI contains 0 in both W1 and W3 |
| F-7 | the CI of the paired (A2 half-life − A1 half-life) contains 0 or lies below 0 |
| F-8 | A4 ≈ A1: the (A4 − A1) CI contains 0 in both W1 and W3, at the full Stage-2 n |
| F-9 | A3 ≈ A1: the (A3 − A1) CI contains 0 in both W1 and W3, at the full Stage-2 n |
| F-10 | P̄ > 0 and H̄/P̄ < 0.60. If P̄ ≤ 0 it does not fire, and the verdict carries "memorisation not assessable". |

**Verdicts:**
- **H1 is SUPPORTED iff** at least one A1vA2 member is confirmed, **and** none of F-1, F-2, F-3, F-7, F-8, F-9 or F-10 fires.
- **H1-STRICT iff** H1 is SUPPORTED, **and** there is a window W ∈ {W1, W3} in which A1vA2, A1vA5 and A1vA6 are all confirmed, **and** neither F-5 nor F-6 fires.
- Otherwise the verdict is **NOT SUPPORTED**. Every criterion that fired is reported, and frozen §16 and §18 apply as written, including escalation when three or more of F-1 to F-10 fire.
- No other rule, window, metric or exclusion may enter the verdict.
- If F-11 fires, the study is void and no verdict is issued.
- The secondary-regime trigger is unchanged (M7 §3.5).

---

## 15. A5, exploratory components and descriptive reports (D-9, D-10, FROZEN)
- **A5** is retained unchanged (M7 §4.2). Reported descriptively:
  - the count of (configuration, seed) cells with fingerprint A5 ≡ A2, overall and per window;
  - the number of `updateBehavior` calls in which the aggregate floor raised `confidenceState`, in A1 and A5.
- **Interpretation rule:** F-6 not firing establishes only that the gain is not attributable to this system's global-reliability route.
- **The exploratory 2×2 PE factorial (M7 §10.2) is WAIVED.** Under R1 no slip reaches the prediction-error pathway, state prediction error is 0 by construction in B2, and running the factorial would need an arm variant that does not exist.

---

## 16. Claim ceiling (FROZEN, M7 §17)

The M7 §17 ceiling, scoped claim and forbidden words apply unchanged. Two qualifiers are required with any claim:
- "under realised-outcome learning (R1)";
- "where FROZEN means Q- and trust-frozen".

---

## 17. Governance and records (D-11, FROZEN)
- **Decision log:** `research/09_decisions.md`, entries D-013 … D-018 (the H1-R rulings and this freeze).
- **The three M7 governing documents** are committed with `-text`, at these SHA-256 values:

  | Document | SHA-256 |
  |---|---|
  | `M7_SCIENTIFIC_SPEC_DRAFT.md` | `27865156379bbe39402b96665154b96b5f79dfd36d0fbbf689f6d0b40d360d57` |
  | `M7_GATE_SEMANTICS_AUDIT.md` | `ee09a15549d73f06af36caaf0672dce0682fc8e3947c37c69bec41e30f64560d` |
  | `M7_CHARACTERIZATION_FINDINGS.md` | `6b79436e4afdb06ab8dc4b58a5e7f56e2103c854669ce58c25c850d0747383fd` |

- **This file and its integrity record** are committed with `-text`.
- **Freeze consistency check:** `node research/preregistrations/h1r_v1_checks/verify_freeze.mjs`.

---

## 18. Researcher-degrees-of-freedom register

M7 §19 applies in full. Additional pins:

| Choice | Pinned in |
|---|---|
| Learning order, slip semantics, goal-entry draw | §4 (R1, R2) |
| Environment stream | §4, R3 erratum |
| Tick unit, index, windows, snapshot points | §6 |
| Pilot and confirmatory material, positions, bound | §7 |
| Every metric definition | §8 |
| Validity handling | §10 |
| Gate battery | §11 |
| Test, df, Holm, CI, row rule, undefined cases | §12 |
| Bootstrap, effect sizes, sensitivity | §12 |
| Extension trigger, pilot data use, power procedure, no interim look | §13 |
| Falsification windows and directions; verdict function | §14 |
| Analysis seeds | 770001 (power), 770002 (bootstrap), 770003 (permutation), 770004 (link ④ sample) |
| Analysis-code identity | §1.2 |

---

## Appendix A — Supersession register (H1-R only; M7's own record is not altered)
- **H1R-S1** replaces two M7-ERR-05 §3.1 sentences:
  - replaced: "Everything before it in the tick (decision, scoring, Q-learning, prediction error, reward) and everything after it runs unchanged on both outcomes." and "The attempt is evaluated exactly once at the block entry.";
  - replacement: for each movement decision, `env.attempt(u, v)` is evaluated exactly once, immediately before the self-learning section, from `liveRng("environment")`; the E1 site reuses the outcome. The section runs on the realised transition. A slip (u → u) is excluded by the existing entry guard, so it costs only the elapsed tick. E1′ performs the move, and E2 credits the intended edge.
  - Authority: R1 (`742f239`).
- **H1R-S2:** M7 §10.1 premise sentence 1 does not hold for H1-R. Slipped attempts do not update Q under R1, and there is no step cost. The design consequences it motivated are unchanged.
- **H1R-S3:** M7 §10.2 premise sentence 1 does not hold for B2 or H1-R (state prediction error is 0 by construction). The pins and G12 remain binding.
- **H1R-S4:** G8.4c becomes "≥ 0, reported"; the G8.4b identity remains binding.
- **H1R-S5:** G15 is superseded by G15′ (G15′-S, F1, F2′, F-AV, G15′(9.4)).
- **G14 reading** (clarification): on a slip, nothing about v enters learning, reward or prediction error; u remains `agentCurrent`; the intended edge receives the trust attempt.
- **R2 (D-1):** goal-entering attempts draw and are credited like every edge (M7 §3.3, §6.1).
- **R3:** the M7 §5.1 environment-stream row is superseded for H1-R by `H1R_ERRATUM_R3_ENVIRONMENT_SEED.md`.
- **Sampling:** the M7 §5.1 and §12.1 pilot material (configurations 900000–900004 and seeds 20260819000–004) and the §15.0 extension material (900005–900009, 20260819005–009) are superseded by §7 and §13.
  - FACT: the frozen pilot resolves to 3 distinct `p_e` vectors, and its configurations are consumed in the registry.
  - FACT: seeds 000–003 are refused for H1-R by the registry, and only 004–009 are both available and inside the R3 domain.
- **Analysis:** M7 §11.2's test (Wilcoxon over cells) and §11.4's configuration clustering for paired differences are superseded by §12. §12.3 steps 1–3 are superseded by §13.
- **Waiver:** the M7 §10.2 exploratory factorial (§15).

## Appendix B — Frozen facts and reproducible checks (no agent run; no configuration generated; no outcome)

### B.1 Configuration-generator contacts and cross-stage disjointness
Command: `node research/preregistrations/h1r_v1_checks/config_generator_contacts.mjs`

A (cell, candidate) pair "touches" when the cell's environment segment and the candidate's generator segment share a mulberry32 state.
- Reserve rule: environment 4,096 draws, generator 1,024.
- Actual rule: environment ≤ 3,000 draws, generator exactly 756.

| Statement | Type | Sample space / denominator | Value |
|---|---|---|---|
| Pilot contacts | EXACT count | 200,000 pairs: 5 seeds × 10 indices × candidates 886000–889999 | 0 (both rules) |
| Confirmatory contacts | EXACT count | 36,000,000 pairs: 20 seeds × 30 indices × candidates 900500–960499 (model mass of A₂₉ beyond 960499 is 0 to 9 decimals) | 44 (reserve) / 31 (actual) |
| Generator self-overlap, 886000–960499 | EXACT | every separation 1 … 74,499 | minimum 14,173 draws (needs < 756) |
| Cross-stage environment contacts | EXACT count | pilot cells × held-out candidates; confirmatory cells × pilot candidates | 3; 2 |
| P(some confirmatory cell flagged) | MODEL, union bound | independent Bernoulli acceptance per goal index (rates 7, 11, 14, 9 of 470; ERR-09 samples), sequential walk from 900500; Σ over 600 cells of P(accepted seed ∈ contacting set) | reserve 1.95 × 10⁻⁶ (point), 8.37 × 10⁻⁴ (one-sided 95% lower rates), 9.54 × 10⁻⁴ (half rates); actual shared state 3.20 × 10⁻¹⁴, 6.33 × 10⁻⁷, 9.10 × 10⁻⁷ |
| P(10 pilot configurations within 889999) | MODEL | the same process from 886000 | 1.0000000000 (point); 0.9999999644 (95% lower); 0.9999999724 (half) |
| Cross-stage: P(some touched candidate accepted) | MODEL | the same process | pilot→held-out 3.04 × 10⁻⁹⁴ / 1.56 × 10⁻³⁸; confirmatory→pilot 8.45 × 10⁻⁷ / 8.62 × 10⁻⁴ |
| "≈ 1 × 10⁻⁶ per run" (former R3 report wording) | **WITHDRAWN** | one generator start uniform on 2³² states: 5,119/2³² = 1.19 × 10⁻⁶ | wrong model, not used (Appendix C) |

A flagged cell is dropped under §10. The per-run flag `envSegmentDisjointFromConfig` is evaluated under the reserve rule.

### B.2 Size of the §12 test
Command: `node research/preregistrations/h1r_v1_checks/min_f_size_simulation.mjs`

This is a supporting illustration only; the bound itself is the analytic proof in §12. Rejection rate at α = 0.01 under μ = 0, 20,000 replications, 46 scenarios (C ∈ {5, 10, 30}, S ∈ {2, 3, 5, 8, 10, 20}, normal and t₃ effects):

| Test | Maximum rejection rate |
|---|---|
| Frozen test | 0.0103 |
| Satterthwaite min F′ (descriptive) | 0.078 (at C = 30, S = 2) |
| Configuration-means t | 0.888 |
| All-cells t | 0.747 |

### B.3 Registry status
Command: `node research/preregistrations/h1r_v1_checks/pilot_registry_status.mjs`
- Configurations 886000–889999: neither held out nor consumed.
- Configuration 900500: held out.
- Trajectory seeds 20260819000–003: refused for H1-R; 004–009: AVAILABLE; 100–119: AVAILABLE.

### B.4 R3 compatibility of the pilot (FACT)
- Pilot slots 256–265, 320–329, 384–393, 448–457 and 512–521 lie inside the verified domain, with block code 0 and index < 32.
- R3c proves all 1,920 domain segments disjoint and free of contact with every domain seed's cognitive, visual and σ streams.
- Verification runs used seed 20260819000 only.
- `envSegmentDisjointFromConfig` cannot fail for a pilot configuration (B.1: 0 contacts).

## Appendix C — Corrections to earlier records
- `experiments/h1r/evidence_r3/R3_REPORT.md` §4 UNRESOLVED 2: the sentence "INFERENCE: the per-run probability is about 1 × 10⁻⁶" is withdrawn and replaced by the B.1 wording.
- The pre-freeze working documents (the draft, the freeze-package proposal and its audit) are superseded by this file and are not part of the record.
