# CF-03b Gate Results — world model v2 (calibration repair)

**Verdict: CF-03b PASS.** All seven criteria held on 20 fresh `gate3b` worlds. The gate was run once. Nothing was
re-run or tuned after the outcome.

CF-03 itself stays **FAIL** on its criterion A4. This is a new model tested on new worlds, not a re-scoring.

| Item | Value |
|---|---|
| Evidence category | Development evaluation gate. Not confirmatory; local commits; no independent reproduction |
| Command | `node experiments/cf03b/run_gate.mjs --domain gate3b` (exit 0) |
| Code and spec | HEAD `1968083`; `GATE_SPEC.md` SHA-256 `e75e7e1a…3227`; frozen before the run |
| Environment | Node v24.15.0, win32-x64 |
| Result file | `gate3b_result.json`, SHA-256 `a3f8b116…4d08`; row hash `e328d874…1a72` (900 rows) |
| Worlds | `cf|gate3b|world|0…19`; 0 excluded |
| Tests | 108/108 |

## Acceptance

| Criterion | Statistic | 95% CI | Rule | Held |
|---|---|---|---|---|
| B1 calibration (E1S) | MBVI2 ECE **0.028** | — | ≤ 0.05 | **yes** |
| B2 improvement (E1S) | ECE(MBVI) − ECE(MBVI2) = **+0.076** | [0.068, 0.084] | mean > 0, lower bound > 0 | **yes** |
| B3 E3 reward relocation | DYNAQ − MBVI2 = **+171.0** steps | [52.3, 317.5] | mean > 0, lower bound > 0 | **yes** |
| B4 E1 latent learning | MBVI2 − DYNAQ = **−9.3** | [−12.0, −6.8] | upper bound < 10 | **yes** (MBVI2 better) |
| B5 model log-likelihood (E1S) | MBVI2 − uniform = **+0.735** nats | [0.711, 0.758] | mean > 0, lower bound > 0 | **yes** |
| B6 no regression against MBVI | E1 0.0 [0, 0] · E3 −5.1 [−12.7, 3.3] · E1S −0.5 [−2.7, 1.7] · E2P −0.4 [−0.6, −0.2] | — | every upper bound < 10 | **yes** |
| B7 infrastructure | Determinism; 108/108 tests; ORACLE ≤ every learner on E1, E3, E2P | — | all | **yes** |

## Calibration in detail (E1S, hidden reliability U[0.5, 1] per edge)

| Agent | Weighted per-run ECE | Pooled ECE | Noise floor (mean; 95th percentile) |
|---|---|---|---|
| MBVI (v1) | 0.104 | — | — |
| **MBVI2** | **0.028** | 0.010 | 0.030; 0.034 |
| NOPOOL | 0.134 | 0.133 | 0.040; 0.044 |
| NOBLOCK | 0.026 | 0.011 | 0.029; 0.033 |
| GLOBALRESET | 0.028 | 0.010 | 0.030; 0.034 |

The noise floor is the weighted per-run ECE that a forecaster whose bin probabilities were exactly right would
score on the same bin occupancies (2,000 simulations). **MBVI2's 0.028 is inside that band**, so on this statistic
it cannot be told apart from a perfectly calibrated forecaster. The statistic cannot resolve anything below about
0.03; the pooled figure (0.010) is the sharper measure.

MBVI2's pooled reliability table over 10,865 scored predictions:

| Mean predicted | 0.36 | 0.47 | 0.56 | 0.66 | 0.75 | 0.84 | 0.91 |
|---|---|---|---|---|---|---|---|
| Realised hit rate | 0.56 | 0.55 | 0.60 | 0.67 | 0.76 | 0.84 | 0.88 |
| Predictions | 32 | 170 | 786 | 2,618 | 4,413 | 2,598 | 247 |

The two lowest bins still under-predict (0.36 → 0.56, 0.47 → 0.55). They hold 2% of predictions.

Learned on E1S: pooled move rate μ = 0.739 (the true mean reliability is 0.75); strength S = 8 in 14 worlds, 16 in
four, 32 and 64 in one each; destination-novelty rate ν = 0.0006.

## Reported, with their pre-declared directions

| Measure | Value | Direction confirmed? |
|---|---|---|
| NOPOOL − MBVI2, ECE | +0.106 [0.096, 0.115] | **yes**: pooling is what repairs calibration |
| NOBLOCK − MBVI2, E2P | +4.4 [3.6, 5.2] | **yes**: the impassable-exit component helps the detour |
| GLOBALRESET − MBVI2, E3 | +6.7 [−1.1, 13.3] | **no**, inconclusive: the interval includes 0 |

Reported without a declared direction:

| Measure | Value | Reading |
|---|---|---|
| NOBLOCK − MBVI2, E3 | **−5.7 [−10.9, −1.5]** | The impassable-exit component **costs** steps on reward relocation |
| NOBLOCK − MBVI2, ECE | −0.002 [−0.006, 0.002] | It does not affect calibration |
| NOPOOL − MBVI2, E2P | +2.2 [1.7, 2.8] | Pooling helps the detour slightly |
| NOPOOL − MBVI2, E3 / E1 NAIVE / E1S | +2.1 [−3.1, 6.9] / −0.7 [−2.0, 0.3] / +0.5 [−1.1, 1.9] | No measurable behavioural effect of pooling |
| E1 NAIVE: MBVI2 − MBVI | **+2.3 [0.1, 5.6]** | MBVI2 is slightly **worse** than MBVI without pre-exposure |
| E1 NAIVE: DYNAQ − MBVI2 | +43.0 [10.4, 81.6] | — |
| E1S: DYNAQ − MBVI2 | +62.4 [19.8, 112.0] | — |
| E2P: DYNAQ − MBVI2 | +9.6 [6.9, 12.5] | — |
| Log-likelihood: MBVI2 − MBVI | +0.105 [0.095, 0.117] nats | The v2 model predicts better |

## Mean test-phase steps

| Cell | RANDOM | QL | DYNAQ | ORACLE | MBVI | **MBVI2** | NOPOOL | NOBLOCK | GLOBALRESET |
|---|---|---|---|---|---|---|---|---|---|
| E1 EXPLORED | 352.4 | 189.6 | 28.8 | 19.5 | 19.5 | **19.5** | 19.5 | 19.5 | 19.5 |
| E1 NAIVE | 335.6 | 173.6 | 110.8 | 19.5 | 65.5 | **67.8** | 67.1 | 66.2 | 67.8 |
| E3 | 287.2 | 522.5 | 215.5 | 18.5 | 49.6 | **44.5** | 46.6 | 38.9 | 51.2 |
| E1S EXPLORED | 425.8 | 223.7 | 89.0 | 27.2* | 27.2 | **26.7** | 27.1 | 26.4 | 26.7 |
| E2P PRE | 241.7 | 293.1 | 28.3 | 16.9 | 19.1 | **18.8** | 20.9 | 23.1 | 18.8 |

\* ORACLE ignores reliabilities, so it is not a bound on E1S.

MBVI2 censoring was 0% in every cell. Planning compute on E1S: 28.5 sweeps and 1,671 backups per decision (MBVI in
CF-03: 17.7 and 1,014); the 100-sweep budget was hit in 0.008% of decisions. The v2 model changes its predictions
for every pair after each observation, so value iteration has more to re-converge.

**Reference world `mfw-graph` (reported only):** E3: MBVI2 44, MBVI 65, DYNAQ 636. E1 NAIVE: MBVI2 85, MBVI 94,
DYNAQ 72, so both planners are worse than Dyna-Q there. E1S: MBVI2 28, MBVI 26.

## What this shows, and what it does not

**Shown, on 20 fresh 24-node worlds:**
- A model that pools what it learns across state–action pairs is calibrated to the limit this statistic can
  measure, where the CF-03 model was not, and it predicts transitions better (+0.105 nats).
- This did not cost task performance (B6), and the CF-03 advantages over Dyna-Q were re-established with the new
  model (B3–B5).
- The repair is attributable: removing pooling returns the calibration error to 0.134.

**Not shown:**
- **That calibration improves behaviour.** MBVI2 and MBVI need the same steps within noise on every task, and MBVI2
  is slightly worse on E1 NAIVE. On these worlds a planner does not need calibrated probabilities to act well.
  Calibration is expected to matter once something consumes the probabilities: arbitration between controllers and
  decisions about when to plan (CF-04). That is a prediction, not a result.
- **That the local reward change-point is better.** The direction was the declared one but the interval includes 0.
- **That the impassable-exit component is a net gain.** It helps the detour (+4.4) and costs on reward relocation
  (−5.7).
- **Generality.** Same limits as CF-03: 24-node worlds, full observability, one reliability distribution,
  stationary within a task phase, no independent reproduction. The pooled prior assumes pairs are exchangeable; a
  world with two distinct populations of edges has not been tested.
- **Anything about MiniFlyWire's legacy agent**, which did not take part (CF-02).

## Amendment after independent review (2026-11-13)

The text above is left as first written. An independent review
([`ARCHITECTURE_DECISIONS.md`](../../../docs/architecture/ARCHITECTURE_DECISIONS.md), "Independent falsification
review") found three statements stronger than the evidence. The gate verdict is unchanged; these corrections
govern how it may be cited.

1. **Withdrawn:** "it cannot be told apart from a perfectly calibrated forecaster". The reliability table above
   shows two low bins off by about two standard errors (0.36 → 0.56, n = 32; 0.47 → 0.55, n = 170). The correct
   statement is that the weighted per-run statistic is inside its noise band, and that the model under-predicts
   where it predicts below 0.5.
2. **Narrowed:** "calibrated" means *calibrated on worlds from the generator the model was developed on*.
   Reliabilities are U[0.5, 1]; the Beta with the same mean and variance has strength 8, and the model learned
   μ = 0.739 with S = 8 in 14 of 20 worlds. `gate3b` shares that generator with `dev`. The gate does not show
   calibration under any other reliability distribution, and it has no control showing that a forecaster which
   always outputs the pooled mean would fail.
3. **Corrected:** "This did not cost task performance" holds for the four B6 cells only. On E1 NAIVE, which B6
   does not cover, MBVI2 needed 2.3 more steps than MBVI [0.1, 5.6], and it used about 61% more sweeps per
   decision on E1S than MBVI did in the CF-03 run (28.5 against 17.7; different runs).

Also noted by the review: the NOPOOL ablation removes two pooled components at once, so it does not show which
one repairs calibration; and the statistic scores only pairs that have already moved.

## Open items carried forward

1. The impassable-exit trade-off (E2P gain, E3 cost) needs a task that isolates it before it is kept or dropped.
2. Calibration after a change is unmeasured; E1S is stationary.
3. The two low-probability bins still under-predict.
