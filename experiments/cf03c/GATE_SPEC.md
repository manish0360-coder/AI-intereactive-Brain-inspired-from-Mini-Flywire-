# CF-03c Gate Specification — calibration robustness of world model v3 (frozen)

**Status.** Frozen in the CF-03c implementation commit, before the `gate3c` domain was run.

- Development evaluation gate, not confirmatory. Commits are local until the owner authorises a push.
- The result is bound to the commit it ran at.
- CF-03 stays FAIL on A4 and CF-03b stays PASS with its amended, narrower claim. Neither record is edited.

## The question

CF-03b showed the v2 model calibrated on worlds from the generator it was developed on (edge reliability
U[0.5, 1]). The independent review asked whether that is calibration or a match to one generator, and whether a
forecaster that always predicts the average would do as well. This gate answers both, on reliability families the
model has never been run on.

## What changed in the model (v3, `cognitive/mind/v3/`)

v2 (`cognitive/mind/world_model.mjs`) is frozen and unedited. v3 repairs two defects the review found. Both are
reproduced against v2 in `cognitive/tests/test_mind_v3.mjs`.

| Defect in v2 | Reproduction | Repair in v3 |
|---|---|---|
| Leave-one-out weights computed under different hyper-parameters than the pooled totals. A pair that never moved could get P(stay) > 1 and a negative probability | Five pairs moved three times each, then 13 failures on one pair: P(stay) = 1.0002, UNKNOWN = −0.0002 | The empirical-Bayes step runs to a fixed point (at most 25 passes); each pair's weight is stored in the pass that builds the totals, and the leave-one-out mean subtracts exactly that weight |
| One ordinary failure reset a reliable pair: after about 35 successes P(stay) < 0.05, so a single failure cleared all counts | 34 or more successes then one failure: counts cleared to 1 | Evidence-accumulating change detection. Two CUSUM statistics per pair ("got worse", "got better") against the alternative that the outcome now has probability 0.9. A change is declared when its posterior odds exceed 1 under a prior change rate of 0.002 per attempt, i.e. when the statistic exceeds ln 499. Counts then become the observations of the run that raised it. Statistics accumulate once a pair has 5 observations |

The change-detection constants (0.9, 0.002, 5) were chosen a priori and not tuned. Everything else is the v2
definition. The agent MBVI3 is MBVI2 with the v3 model; a test asserts the two agent sources are identical after
renaming.

## Design

**Task E1F** (`cognitive/testbed/tasks_v3.mjs`): the E1S task (600 unrewarded exploration steps, then 5 test
episodes to a cued goal) with every edge's hidden reliability drawn from a named family.

| Family | Reliability per edge (u ~ U[0, 1]) | Role |
|---|---|---|
| U5 | 0.5 + 0.5u | The development family. The only one run before this freeze |
| WIDE | 0.1 + 0.9u | **Unseen.** Much wider; many poor edges |
| BIMODAL | 0.95 or 0.55, equal shares | **Unseen.** Two populations: violates the model's single-population assumption |
| ARCSINE | 0.2 + 0.8·sin²(πu/2) | **Unseen.** Mass at both ends |
| HIGH | 0.9 + 0.1u | **Unseen.** Nearly reliable; little to resolve |

**Forecasters scored side by side.** One agent (MBVI3) acts. Every forecaster is fed exactly the transitions it
experiences and is asked for P(move) before each one. All are scored on identical events, so a difference between
forecasters is not a difference in behaviour.

| Forecaster | Definition |
|---|---|
| V3 | World model v3 |
| **CONST** | One number for every pair: the running overall move rate, (moves + 0.5)/(attempts + 1). The average-probability baseline |
| LAPLACE | Per pair, no sharing: (moves + 1)/(attempts + 2) |
| V2, V1 | The CF-03b and CF-03 models |
| V3_NOPOOL_MOVE, V3_NOPOOL_DEST | v3 without the pooled move-success prior; v3 without the pooled destination-novelty rate (the two halves of CF-03b's single NOPOOL ablation) |

**Scored event.** Did the attempt change the node? Scored on **every** attempt, including a pair's first (CF-03b
scored only pairs that had already moved). Scores: Brier, log-loss, and ECE in 10 equal-width bins.

## Command

```bash
node experiments/cf03c/run_gate.mjs --domain gate3c
```

The driver refuses to run if any file under `cognitive/` or `experiments/cf03c/` is uncommitted or modified, or if
`results/gate3c_result.json` already exists.

## Frozen evaluation values

| Item | Value |
|---|---|
| Domain / worlds | `gate3c`; `cf|gate3c|world|0…19`. Never used before. Count rule as CF-01b: n = max(20, ⌈(2.8·SD_dev/mean_dev)²⌉), capped at 60; dev differences Brier(CONST) − Brier(V3): SD 0.0035, mean 0.0040 → 6.0 → **n = 20** |
| Unit and intervals | The world. Paired differences with a percentile bootstrap, 10,000 resamples, 95%. For ECE, the weighted per-run statistic is recomputed on worlds resampled with replacement |
| Seeds | Environment `…|E1F|<family>|env`, agent `…|E1F|<family>|agent`, reliabilities `…|E1F|<family>|rel`; bootstrap `cf|stats|gate3c|cf03c|…` |
| **K1** skill over CONST | Per unseen family, Brier(CONST) − Brier(V3). All four: lower bound > −0.002. WIDE, BIMODAL, ARCSINE: lower bound > 0. HIGH is exempt from the strict form because its edges barely differ, so there is little a forecaster can resolve; this exemption is fixed now |
| **K2** calibration | Per unseen family, V3's weighted per-run ECE on the move event over all attempts: upper 95% bound ≤ 0.05 |
| **K3** skill over LAPLACE | Per unseen family, Brier(LAPLACE) − Brier(V3): lower bound > 0 |
| **K4** the repairs cost nothing | On U5, fresh worlds: Brier(V2) − Brier(V3) lower bound > −0.002; and MBVI3 − MBVI2 steps upper bound < 10 on E1 EXPLORED, E3, E1S EXPLORED and E2P PRE |
| **K5** validity | V3 makes no prediction outside [0, 1] in any family |
| **K6** infrastructure | Determinism (two in-process runs); all 127 tests pass (CF-01 57, E2′ 6, core 16, invariance 6, v1 8, mind 15, mind v3 19) |

**Verdict and what each verdict licenses** (fixed now):

| Verdict | Condition | Claim allowed |
|---|---|---|
| PASS | K1–K6 hold in every unseen family | "v3 is calibrated and more skilful than a constant forecaster across the five tested reliability families", subject to an independent review of the evidence before the claim is used |
| PARTIAL | K4–K6 hold; K1–K3 hold in some unseen families | The claim is made for the families that pass, by name, and the failures are reported with equal prominence |
| FAIL | K4 or K5 fails | v3 is not adopted; the CF-03b claim stays as amended (one generator) |
| INVALID | K6 fails | None |

Twelve family-level conditions must all hold for PASS, with no multiplicity correction; requiring all of them makes
the gate conservative as a whole. Everything else below is reported and is not pass/fail.

**Reported:** every forecaster's Brier, log-loss, ECE with interval, and the ECE noise floor (2,000 simulations);
the Murphy decomposition (reliability, resolution, uncertainty) from pooled bins; ECE split by untried/tried pair
and by exploration/test phase; the CF-03b modal-destination statistic; V2's count of invalid predictions; changes
declared per run; learned μ, S, ν; task steps and censoring per family; the battery contrasts against Dyna-Q and
against MBVI3 without change detection.

**Pre-declared expectations** (reported, not tested):

- V3_NOPOOL_MOVE is worse than V3 on Brier in every family: the pooled move prior is the component that matters.
- V3_NOPOOL_DEST equals V3 on the move event (it differs only in where a move leads), and is worse on the
  modal-destination statistic.
- BIMODAL is the family most likely to fail, because the model assumes one population of edges.

## Development-domain disclosure (`cf|dev|world|0…19`, row hash `cf0e3dda…`; observed before this freeze)

Only U5 and the existing battery were run on dev. **No unseen family has been run on any domain**, including in
tests: the E1F test runs U5 only, and the family samplers are tested as pure functions.

| Measure (U5, dev) | Result |
|---|---|
| Brier: V3 0.1924 · V2 0.1923 · CONST 0.1964 · LAPLACE 0.2067 · V1 0.2143 | |
| Brier(CONST) − Brier(V3) | +0.0040 [0.0025, 0.0055] |
| Brier(LAPLACE) − Brier(V3) | +0.0144 [0.0128, 0.0159] |
| Brier(V2) − Brier(V3) | −0.0001 [−0.0003, −0.0000]: v3 is not better than v2 on this family |
| ECE: V3 0.033 [0.030, 0.036]; noise floor 0.030 | |
| **ECE: CONST 0.028 [0.022, 0.035]** | The constant forecaster is at least as well calibrated as V3 |
| Resolution: V3 0.0049 · LAPLACE 0.0071 · CONST 0.0000 | |
| ECE on a pair's first attempt: V3 0.095 | First attempts are poorly calibrated |
| MBVI3 − MBVI2 steps | E1 0 · E3 0 · E2P 0 · E1S −0.4 [−1.3, 0.3] |
| Changes declared per run on E1S (stationary) | 0.30 worse, 0.10 better |

**What the dev numbers already say, declared before the run.** On the development family the review was right:
calibration alone does not separate the model from a constant, which is as well calibrated. The model's advantage
over the constant is real but small (Brier 2% lower), and comes from resolution. v3 is a repair, not an
improvement, over v2 on this family. K1 therefore tests the property that matters, and K2 alone would be a weak
criterion.

**Not tested by this gate.** Worlds where an action has several destinations (the environment has none);
calibration after a change; worlds larger than 24 nodes.
