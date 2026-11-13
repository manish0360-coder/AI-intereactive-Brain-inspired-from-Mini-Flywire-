# Reconciliation of the Gemini review of CF-03c and CF-04

**Date:** 2026-11-14. **Review lodged verbatim at:** `CF03C_CF04_GEMINI_REVIEW.md` (SHA-256 `d3dc492a…`, byte-identical
to the file the owner supplied). **Bundle the reviewer was given:** `CF03C_CF04_GEMINI_REVIEW_BUNDLE.md`.

Each statement in the review is checked here against the frozen specifications, the source code and the recorded
result files (`experiments/cf03c/results/gate3c_result.json`, `experiments/cf04/results/gate4_result.json`). No
frozen record, result file or source file is changed by this document.

## 1. How much independent weight the review carries

The review agrees with both verdicts. Before counting that as confirmation:

- It did not answer the sixteen numbered questions in the requested form. Questions 9 (the HIGH exemption), 15
  (the bootstrap), 16 (steering toward a negative result) and 12 (the smallest useful change to the testbed) are
  not addressed at all.
- Most of its findings restate sentences from the bundle's cover, which the party under review wrote.
- It contains factual errors about the experiments (section 2), which a check against the appendices would have
  caught.
- It contradicts itself on CF-04: the verdict section calls the arbitration hypothesis "definitively falsified at
  this scale", and the baseline section calls the same test "unfair / strawman".

**Standing:** useful second opinion, weak as independent verification. Its one substantive challenge (the habit
controller was not a competent fallback) is correct and is accepted below. Nothing in it changes a gate verdict.

## 2. Claim-by-claim check

| # | Review's statement | Check against the record | Standing |
|---|---|---|---|
| 1 | CF-03c is PARTIAL; the claim holds only for U5 and bimodal worlds | Matches the frozen verdict table and `RESULTS.md` | **Confirmed** |
| 2 | The model "failed calibration thresholds on WIDE (0.055) and ARCSINE (0.055)" | 0.0553 and 0.0548 are the **upper bounds** of the intervals; the estimates are 0.050 and 0.050. The criterion was on the upper bound, so the failure is real but marginal | **Imprecise** |
| 3 | "V3's actual superiority lies in resolution, not calibration error" | **Half right.** Against the constant forecaster, yes: the whole advantage is resolution (table in section 3). Against the per-pair Laplace forecaster it is the opposite: V3 has **lower** resolution than Laplace in every family, and where it wins it wins on reliability. On HIGH there is no resolution to be had and V3 is worse than the constant | **Corrected** |
| 4 | BIMODAL passed because its two modes "align well with the model's shrinkage"; WIDE and ARCSINE fail because dispersion "violates the implicit assumption of unimodal exchangeability" | The explanation is inverted: BIMODAL is the family that is not unimodal. A simpler reading fits all five families: the outcome follows the **spread** of edge reliabilities. Section 3 shows the model beats Laplace where the matched Beta strength is 3.7 or more and loses where it is 2.7 or less, which is where Laplace's own prior (strength 2) is already nearly right. This is a description of five data points, not a tested claim | **Not accepted as stated**; alternative recorded |
| 5 | Sample sizes "were formally derived from pre-registered power equations (80% power)" | Only partly. The rule n = max(20, ⌈(2.8·SD/mean)²⌉) gave 55 for CF-04. For CF-03c it gave 6 on the development family, so the **minimum of 20** applied, and no pilot existed for the unseen families by design. CF-03c's sample size was a floor, not a power calculation | **Overstated** |
| 6 | "Avoiding pseudoreplication": the world is the unit | Correct (`cognitive/testbed/stats.mjs`; every contrast is paired by world) | **Confirmed** |
| 7 | Capping at 200 steps biases differences toward zero; 233 capped QL episodes | Correct for contrasts that involve QL, DYNAQ or the planner without change detection. **The two arbitration criteria are untouched:** the planner, ARB, ARB_T10 and RANDSWITCH had 0 capped episodes in 55 worlds | **Confirmed, with its scope narrowed** |
| 8 | Medians should accompany step counts | Fair. Computed now from the recorded rows (section 3). Medians agree with the means on every arbitration contrast | **Accepted**; adopted for CF-05 |
| 9 | The habit controller "takes 1,000 episodes to adapt" | Wrong unit. Q-learning needs about 950 more **steps** than the planner over 30 episodes (+951.1 [709.0, 1,203.6]), understated by capping | **Wrong** |
| 10 | CF-04's agent pairing is "unfair / strawman"; a fair test needs an accelerated model-free arm such as Dyna-Q+ | **Accepted in substance.** Q-learning is not a competent fallback. Two qualifications from the record: (a) Dyna-Q was run alone in the same gate and needs +115.3 steps more than the planner [93.5, 138.1], so a Dyna-based habit arm would also be the weaker controller; (b) the published case for a model-free controller is that it is **cheaper**, and compute was not counted | **Accepted**; wording of the CF-04 conclusion tightened (section 4) |
| 11 | Arbitration failed "because false-positive handoffs occurred frequently due to noise (14.2% habit share on SHAM runs)" | **Contradicted by criterion A3.** In the sham arm the habit acted in 14.2% of decisions and the cost was +0.3 steps [−2.4, 2.7]: noise-driven handoffs were not costly when nothing had changed. The cost is in the change arm, in the 15 episodes with the block (+16.0 [12.4, 19.8]), when the two controllers' policies differ most | **Not supported** |
| 12 | The hypothesis is "definitively falsified at this scale" | Too strong, and inconsistent with #10. Supported wording: arbitration between this planner and tabular Q-learning, with this reliability signal, gave no benefit and at θ = 0.05 cost 13.8 steps. Arbitration for the purpose of saving computation was not tested | **Overstated** |
| 13 | CUSUM constants "lack sensitivity analyses" | Correct. They were set a priori and never varied | **Accepted**; a sensitivity arm is added to CF-05's reported contrasts |
| 14 | `emIterations = 25` should have convergence logged | Correct that it is not logged. The model counts passes (`stats().emPasses`) but not how often the limit was reached | **Accepted** for the next model version; no change to the frozen v3 |
| 15 | Put the exploration bonus "directly inside `cognitive/core/planner.mjs`" | Not possible without breaking the record: that file is the frozen CF-03 planner, and three recorded gates run through it. A bonus goes in a new planner version beside it | **Declined as written** |
| 16 | "Remove `cognitive/mind/arb/`" | The owner's decision governs: remove it from the integration roadmap; keep the implementation and evidence | **Superseded by the owner** |
| 17 | CF-05 should test recovery with a recency bonus against a count-model Dyna-Q+ | Agrees with the proposal already recorded; the owner has made it the next priority | **Agreed** |

## 3. The data behind items 3, 4 and 8

**Brier decomposition** (pooled bins; Brier ≈ reliability − resolution + uncertainty; the binning residual is
below 0.0012 in every row). Lower reliability is better; higher resolution is better.

| Family | Forecaster | Brier | Reliability | Resolution | Uncertainty |
|---|---|---|---|---|---|
| U5 | V3 | 0.1902 | 0.0028 | 0.0059 | 0.1933 |
| U5 | LAPLACE | 0.2051 | 0.0182 | 0.0063 | 0.1933 |
| U5 | CONST | 0.1940 | 0.0011 | 0.0005 | 0.1933 |
| WIDE | V3 | 0.2158 | 0.0019 | 0.0351 | 0.2500 |
| WIDE | LAPLACE | 0.2112 | 0.0015 | 0.0399 | 0.2500 |
| WIDE | CONST | 0.2499 | 0.0025 | 0.0019 | 0.2500 |
| BIMODAL | V3 | 0.1769 | 0.0036 | 0.0203 | 0.1942 |
| BIMODAL | LAPLACE | 0.1859 | 0.0121 | 0.0210 | 0.1942 |
| BIMODAL | CONST | 0.1944 | 0.0012 | 0.0009 | 0.1942 |
| ARCSINE | V3 | 0.1959 | 0.0019 | 0.0484 | 0.2430 |
| ARCSINE | LAPLACE | 0.1942 | 0.0030 | 0.0516 | 0.2430 |
| ARCSINE | CONST | 0.2409 | 0.0019 | 0.0041 | 0.2430 |
| HIGH | V3 | 0.0502 | 0.0031 | 0.0000 | 0.0469 |
| HIGH | LAPLACE | 0.0935 | 0.0461 | 0.0001 | 0.0469 |
| HIGH | CONST | 0.0478 | 0.0007 | 0.0000 | 0.0469 |

Where V3's Brier advantage comes from (negative = V3 better):

| Family | V3 − LAPLACE: Brier | of which reliability | of which resolution | V3 − CONST: Brier | of which reliability | of which resolution |
|---|---|---|---|---|---|---|
| U5 | −0.0149 | −0.0154 | −0.0004 | −0.0038 | +0.0017 | +0.0054 |
| WIDE | **+0.0046** | +0.0004 | −0.0048 | −0.0341 | −0.0005 | +0.0332 |
| BIMODAL | −0.0090 | −0.0084 | −0.0007 | −0.0175 | +0.0025 | +0.0194 |
| ARCSINE | **+0.0017** | −0.0011 | −0.0033 | −0.0450 | 0.0000 | +0.0443 |
| HIGH | −0.0433 | −0.0430 | −0.0001 | **+0.0024** | +0.0024 | 0.0000 |

**Verified statement.** V3 beats a constant forecaster through resolution, in the four families where edges differ.
V3 never out-resolves Laplace: sharing between pairs trades a little resolution for a large gain in reliability
when pairs are alike (U5, BIMODAL, HIGH), and the trade is a net loss when pairs are spread wide (WIDE, ARCSINE).
Worlds of 20 in which V3 has the lower Brier score: against CONST 15 / 20 / 20 / 20 / 0; against LAPLACE
20 / 0 / 19 / 7 / 20 (U5 / WIDE / BIMODAL / ARCSINE / HIGH).

**Spread of each family** and the Beta strength with the same mean and variance:

| Family | Variance of edge reliability | Matched strength S | S the model learned | Model beats Laplace |
|---|---|---|---|---|
| HIGH | 0.0008 | 56.0 | 16–64 | yes |
| U5 | 0.0208 | 8.0 | mostly 8 | yes |
| BIMODAL | 0.0400 | 3.7 | 2–4 | yes |
| WIDE | 0.0675 | 2.7 | 2–4 | no |
| ARCSINE | 0.0800 | 2.0 | 1–4 | no |

**Truncation and medians in CF-04** (change arm, all steps after the change):

| Agent | Mean | Median | Worlds with a capped episode | Capped episodes |
|---|---|---|---|---|
| ORACLE | 200.8 | 195.0 | 0 | 0 |
| Planner (MBVI3) | 247.3 | 253.0 | 0 | 0 |
| ARB | 261.1 | 255.0 | 0 | 0 |
| ARB_T10 | 246.5 | 232.0 | 0 | 0 |
| RANDSWITCH | 249.9 | 244.0 | 0 | 0 |
| DYNAQ | 362.7 | 346.0 | 4 | 5 |
| Planner without change detection | 411.0 | 407.0 | 23 | 28 |
| QL | 1,198.4 | 953.0 | 37 | 233 |

Paired, world by world: ARB is worse than the planner in 46 worlds and better in 9 (median difference +16.0);
worse than RANDSWITCH in 35 and better in 20 (median +7.0). ARB_T10 is worse than the planner in 34 worlds and
better in 18. The planner is behind ORACLE after the block is removed in 54 of 55 worlds (median 35.0).

## 4. What changes as a result

| Item | Change | Where |
|---|---|---|
| CF-04 conclusion | Narrowed by a dated amendment: "not supported for this controller pair and this purpose"; "harmful" applies to θ = 0.05 only; arbitration to save computation is untested; false-positive handoffs are not the cause | `experiments/cf04/results/RESULTS.md` (amendment; original text kept) |
| CF-03c reading | Amendment recording the corrected resolution statement and the spread explanation as a hypothesis | `experiments/cf03c/results/RESULTS.md` (amendment; original text kept) |
| Owner's decisions 1–5 | Recorded | `docs/architecture/ARCHITECTURE_DECISIONS.md` |
| Truncation | CF-05 reports medians and paired win/loss counts beside every mean, counts capped episodes per agent, and makes its criteria only on agents with no capped episodes or states the bias | CF-05 specification |
| Computational fairness | CF-05 counts work for every agent (planner backups, Dyna planning updates) and includes a Dyna-Q+ arm with a planning budget matched to the planner's | CF-05 specification |
| Baseline selection | Count-model Dyna-Q+, tuned on `dev` with the same search budget as the mechanism under test | CF-05 specification |
| Statistical power | CF-05's sample size comes from the rule applied to the primary contrast on `dev`, and the specification states the smallest detectable effect before the run | CF-05 specification |
| Sensitivity of change-detection constants | A reported arm in CF-05 | CF-05 specification |

## 5. Questions the review left open

They stay open and are carried into the CF-05 specification's "not answered" section: whether exempting HIGH in
advance was a loophole; whether the percentile bootstrap is adequate at 20 worlds; whether the designer steered
toward the expected negative result; and what single change to the testbed would most widen what these results
can say. No independent human has reviewed any of this work.
