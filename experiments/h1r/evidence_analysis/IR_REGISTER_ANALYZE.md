# Interpretation register: `experiments/h1r/analyze.js`

This document answers the 36 questions of the D-021(b) interpretation register (`GEMINI_INSTRUCTIONS.md` §8.2) for this implementation.

**Basis of each answer:**

| Label | Meaning |
|---|---|
| **TEXT** | Settled by H1-R v1.0, an inherited M7 clause or D-020 |
| **RULING** | Settled by the Director's frozen rulings recorded in `research/09_decisions.md`: D-024 (IR-03b, IR-12, IR-34c, PR-1–PR-3, PR-5–PR-12, X-1, C-1–C-3) and D-025 (PR-4 and the closing micro-rulings) |
| **INFERENCE** | The only reading the text and rulings admit, or a detail that must be fixed to compute at all (listed as I-n in `analyze.js`) |

Nothing is pending. Under D-023 there is no second implementation; this register documents the readings `analyze.js` implements.

## Metric layer (run records)

**IR-01** **TEXT** (v1.0 §6, §8).
- Events `[i, r]` count for window W when τ = i − 5 ∈ W.
- R_all sums τ ∈ [0, 2999] and divides by 30.
- Calls 0–4 belong to no window.

**IR-02** **TEXT** (v1.0 §8). The goal-reach rate counts events with r = 12 exactly and τ ∈ W, divided by |W|/100.

**IR-03** Half-life.
- (a) **TEXT.** TR(τ) = Σ r over τ′ ∈ [τ − 99, τ]. For τ ≥ 1500 this window includes Phase-I ticks down to τ′ = 1401. It is summed directly in ascending order (I-14).
- (b) **RULING IR-03b** (D-024 §1). thr = 0.5 · R_W2, unclamped and negative when R_W2 < 0. The threshold used is recorded in `descriptive.halfLifeThreshold`.
- (c) **TEXT.** t_below uses `<`; t_rec uses `≥` on (t_below, 2999].
- (d) **TEXT.**
  - Censored runs report HL = 1500 with `censored: true`.
  - The per-arm censoring counts are in `stage2.descriptive.censoringCountsPerArm`.

**IR-04** **FACT and INFERENCE.**
- In the MS-1 record, `ticks[i] = 'D'` means M-DECISION fired, i.e. the step-0 selection write: that is a decision tick.
- `'R'` means M-REPLAY fired, i.e. the replay branch.

**IR-05** **INFERENCE I-13.** The shadow weight is:

```text
w₀ = applied ? clamp(F − t)·0.60 + arbitrate({…, confidenceScore − t, …})·0.40 : clamp(F − t)
```

- `arbitrate` is the pinned B2 function.
- Every other recorded input is unchanged: arb, unc, ew, selfLoop, and `drift: 0` as in the B2 call.

**IR-06** **INFERENCE.** Every candidate-loop entry passes a trust value to the scoring call, so no candidate in the records "keeps its weight". The clause concerns entries appended after the loop, which D-020 pin 1 excludes from both argmaxes.

**IR-07** **TEXT** (D-020 pins 1 and 3).
- argmax₁ and argmax₀ are the first key of the stable descending sort; on ties the earliest-inserted candidate wins.
- The recomputed argmax₁ must equal the recorded `bestChoice`. On a mismatch `analyze.js` stops: the record would not be measurementClean.

**IR-08**
- (a) **INFERENCE I-1.** Counts are over τ ∈ [0, 2999].
- (b) Replay ticks are `'R'` ticks with τ ∈ [0, 2999].
- (c) **TEXT.** The unfiltered rate is Σ flips / Σ 3000.
- (d) **INFERENCE.** The per-window rates are flips / (|W| − replay ticks in W), and flips / |W|.

**IR-09** **RULING PR-4** (D-025 §1) with **INFERENCE I-28**.
- (a) x = |recorded trust term| / 12; for a decision tick, the maximum over its recorded step-0 candidate entries (K1).
- (b) bin = min(4, ⌊10x⌋) (B1).
- (c) Per run and per study: pooled Σflips / Σdecisions per bin, then the Spearman ρ of bin index vs rate (E1); an empty bin or zero variance gives null (F1, IR-12).
- (d) The study ρ has the §12 bootstrap CI on the full grid (C-2, C-3), fresh `makeRng(770002)`.
- The mandatory output is `link3.monotonicity = { decisions: [int × 5], flips: [int × 5] }`; ρ and rates are in `descriptive.monotonicity`.

**IR-10**
- (a) **TEXT.** The population is the flipped decision ticks with t ≤ 2980 (t is τ).
- (b) **TEXT.** ε ticks are not distinguished.
- (c) **TEXT.** The switch is at call t + 5.
- (d) **TEXT.** Σ r over τ ∈ [t, t + 20) in the base run and in the fork, and difference = base − fork.

**IR-11** **FACT and TEXT.**
- (a) The raw count is the fourth snapshot column: the instrument's attempts of the key whose τ lies in the phase.
- (b) Trust = (s+1)/(a+2), from the snapshot's a and s.
- (c) p is that of the key's undirected edge, from the configuration table: Phase I at `tau1499`, Phase II at `tau2999`.

**IR-12** **RULING IR-12** (D-024 §1).
- ρ is `null` with fewer than 3 qualifying keys (reason `fewerThan3Keys`).
- ρ is `null` with zero variance in either variable (reason `zeroVariance`).

**IR-13** **RULING PR-5** (D-024 §3) with **INFERENCE I-18**.
- (a) The configured p is permuted across the qualifying keys (M7 §11.5).
- (b) One `makeRng(770003)` sequence over the A1 runs of the records document; inside each run, τ = 1499 then τ = 2999.
- (c) Runs in (configIndex, seed) order.
- (d) Keys ordered by (from, to) ascending (D-020 pin 6).
- (e) Fisher–Yates, D-020 pin 5; each shuffle permutes the key-ordered p vector itself.
- An undefined observed ρ runs no shuffles and draws nothing; p is null. p = (1 + #{|ρ*| ≥ |ρ|}) / 10,001; the 99th percentile is the 9,900th raw ρ*. Per-run values only.

**IR-14** **RULING PR-6** (D-024 §4) with **INFERENCE I-19**.
- (a) Trust just before the attempt = (s+1)/(a+2) from the attempt record's prior (a, s) (v1.0 §9 item 2).
- (b) One global prequential base rate across all keys, cumulative through the run, over attempts with τ ∈ [0, 2999], excluding the current attempt.
- (c) Brier(trust), Brier(base) and their difference, per run (whole run); the arm summary is the mean of per-run scores.

**IR-15** **RULING PR-7** (D-024 §5; D-025 §4, §8) with **INFERENCES I-20, I-29**.
- (a) n_updates counts actual trust-store increments: 0 in A4 (frozen store); every drawn attempt in the other arms. Per window and whole run.
- (b) The fraction of keys with ≥ 3 raw attempts in the phase, over the keys with ≥ 1 raw attempt in the phase.
- (c) Entropy in bits of the trust values of the keys with ≥ 1 raw attempt, bin = min(9, ⌊10x⌋) on [0, 1]. All seven arms.

**IR-16** **RULING PR-8** (D-024 §6) with **INFERENCE I-21**.
- Episodes from τ = 0; a goal reset at call g ends its episode at g; a cap reset at call c ends its episode at c − 1 (the observation lag is corrected, so a cap episode is 150 ticks).
- Kaplan–Meier median per run: the smallest t with S(t) ≤ 0.5; censored at the cap and at the run end; an undefined median is +∞.
- The median of run medians per arm uses two-middle averaging, +∞ dominating. All seven arms.

**IR-17**
- **Slip rate (TEXT):** slips divided by drawn non-goal-entering attempts with τ ∈ W. Goal-entering attempts are reported separately.
- **Trajectory entropy: RULING PR-9** (D-024 §7). Realised directed transitions in W: successes (goal entries included) as u → v and slips as u → u; no reset teleports, no unrecorded self-choice no-ops. Per run per window W1–W4; the arm summary is the mean.

## Study layer

**IR-18** **TEXT** and **RULING PR-3** (D-024 §2).
- A (configuration, seed) pair with any arm's run invalid is dropped from all 7 arms.
- The §12 row rule removes every configuration row that contains a dropped pair among the analysed seeds, for the §12 tests and CIs only:
  - in the pilot: the Stage-1 array, and the pooled array if the extension was taken;
  - in the held-out block: the first S\* seeds.
- Every other quantity uses every valid cell.

**IR-19** **TEXT.** d̄ is the plain mean of the analysed (row-reduced) array, the §12 statistic. On a complete array it equals the goal-allocation-weighted mean the estimand describes.

**IR-20**
- (a) **INFERENCE.** The six family members share one analysed array, so either all are computable or none is. If none is, Holm is not applied and nothing is confirmed (§12).
- (b) **TEXT.** There is no CI.
- (c) **RULING PR-1** (D-024 §2). A criterion whose CI is not computable fires.

**IR-21** **TEXT.**
- p follows the §12 degenerate rule.
- se = 0, so the CI is [d̄, d̄].
- t′ is reported as `"Infinity"`, `"-Infinity"` or `"NaN"`.

**IR-22** **TEXT.** Holm uses p̃₍ⱼ₎ = max_{i≤j} min(1, (7 − i)·p₍ᵢ₎). Adjusted values do not depend on the order of tied p-values (check U5).

**IR-23**
- (a) **TEXT.** The 5 × 5 array is configurations 0–4 × seeds 004–008.
- (b) **TEXT.** The pooled 10 × 5 array is configurations 0–9.
- (c) **INFERENCE I-12.** The row rule applies.
- (d) **TEXT.** The study halts.
- (e) **RULING C-1** (D-024 §12, D-025 §2). A non-computable or both-containing initial CI takes the extension first; non-computable or firing after it → `fires: true`, `VOID`; extension unavailable → `fires: false`, `HALT`; `stage2: null` and no verdict in both cases.

**IR-24**
- (a) **TEXT.** The final pilot array is 5 × 5, or 10 × 5 after the extension.
- (b) **INFERENCE I-2.** MS_CS.
- (c) **TEXT.** σ̂ components as in §12. The deviates are scaled by their square roots.
- (d) **TEXT.** D-020 pin 4, with **INFERENCE I-9**.
- (e) **TEXT.** The §12 test, including the degenerate case.
- (f) **TEXT.** S\* is the smallest S with power ≥ 0.80 in both W1 and W3, otherwise 20 and under-powered.

**IR-25** **TEXT.** The first S\* of 20260819100–119, in ascending order.

**IR-26**
- (a) **INFERENCE I-11.** Stage-2 A1 runs.
- (b) **INFERENCE I-5.**
- (c) **TEXT**, with **I-3**, **I-4** and **RULING IR-34c**.
- (d) **TEXT.** "Contains 0" means lower ≤ 0 ≤ upper. **RULINGS PR-2, C-2, C-3:** a null CI fires F-1; the bootstrap uses every available valid cell on the complete grid.

**IR-27** **INFERENCE I-16.**

**IR-28**
- (a) **TEXT**, D-020 pin 5 and **I-6**:
  - runs in (configuration, seed) ascending order;
  - each run's population sorted by t;
  - one makeRng(770004) sequence;
  - the first m = min(10, n) are kept.
- (b) **TEXT.**
- (c) **INFERENCE.** Each resampled cell contributes its kept, non-dropped differences; the statistic is their mean.
- (d) **TEXT.** CA is undefined when no sampled decision remains, and then F-3 fires. **RULING PR-2:** a null CI fires F-3.

**IR-29** **TEXT.** The §12 CI (§12: "used for … F-4 to F-9") of the per-cell difference (A2 half-life − A1 half-life). F-7 fires iff lower ≤ 0 (**I-7**); a non-computable CI fires (**PR-1**).

**IR-30** **TEXT.** "≈" per §12, on the Stage-2 array with S\* seeds.

**IR-31**
- **INFERENCE.** The configuration means of A1 R_all are taken over valid seeds (**PR-3**). Extension configurations count only if the extension was taken (**I-10**).
- **TEXT.** P̄ ≤ 0 means not assessable, and F-10 does not fire.
- **RULING PR-1.** Otherwise an undefined P̄ or H̄ fires F-10.

**IR-32**
- (a) **INFERENCE I-8.**
- (b) **RULING IR-34c.**
- (c) **TEXT.** M7 §11.3, via the §12 CI of (A7 − A2); a non-computable CI leaves the fraction undefined (**I-17**).

**IR-33**
- (a) **TEXT and RULING C-1.** VOID means no verdict; HALT means the study halts and there is no verdict.
- (b) **TEXT.** One window must carry A1vA2, A1vA5 and A1vA6 all confirmed.
- (c) **TEXT.** Escalation is three or more of F-1 … F-10.
- (d) The fired list is reported in order F-1 … F-10. Every criterion is a boolean (I-15 is retired).

**IR-34**
- (a) **I-3.**
- (b) **I-4**, with **RULING C-3**: the index grid is the complete configuration × seed grid (G1).
- (c) **RULING IR-34c.**

**IR-35** **RULING PR-10** (D-024 §8, D-025 §6) with **INFERENCES I-25, I-27**.
- (a) The committed Appendix-B.2 `satt` variant on the §12 analysed array: t′ with ν_S = (MS_C + MS_S)² / (MS_C²/(C−1) + MS_S²/(S−1)); a degenerate denominator gives null.
- (b) Exact conditional sign-flip distribution of the Pratt statistic, two-sided, on every valid cell, on configuration means and on seed means; direction sign(T⁺ − T⁻), compared with the sign of the primary d̄.
- (c) r = (T⁺ − T⁻)/(T⁺ + T⁻) on configuration means with Pratt ranking; every difference zero gives null.

**IR-36** **RULING PR-11** (D-024 §9) with **INFERENCE I-26**.
- The count of cells with fingerprint A5 ≡ A2 is reported overall, as a whole-run diagnostic.
- Per window: identity of the saved reward-event streams restricted to the window, computed from run records (`records.descriptive.a5EqualsA2PerWindow`); the study input schema carries no event streams, so the study-level per-window value is null with the reason.
- The floor counts in A1 and A5 are reported as Σ `floorRaises` over the valid cells.
