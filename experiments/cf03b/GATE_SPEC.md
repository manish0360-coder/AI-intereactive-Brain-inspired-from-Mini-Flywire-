# CF-03b Gate Specification — world model v2 (calibration repair), frozen

**Status.** Frozen in the CF-03b implementation commit, before the `gate3b` domain was run.

- This is a development evaluation gate, not confirmatory. Commits are local until the owner authorises a push.
- The result is bound to the commit it ran at.
- CF-03 stays **FAIL** on its criterion A4. This gate does not re-score CF-03. It tests a new model on new worlds.

## Why this gate exists

CF-03's learned-model planner (MBVI) beat Dyna-Q on reward relocation but failed calibration: expected calibration
error 0.101 against a limit of 0.05 ([CF-03 results](../cf03/results/RESULTS.md)). A dev-domain diagnostic, made
before this freeze, found three causes in the v1 model (`cognitive/core/world_model.mjs`):

| Cause | Evidence on dev (`cf|dev|world|0…19`, E1S, 10,949 scored predictions) |
|---|---|
| The prior on move success is too weak and is not shared between state–action pairs | Mean prediction 0.65–0.69 against a realised hit rate of 0.74–0.77 at every observation count from 1 to 16: the model under-predicts throughout |
| Probability leaks to UNKNOWN after a destination is known | The v1 rule keeps α₀/(N + 2α₀) on "a destination never seen", although every action in these worlds has one destination |
| The statistic has a noise floor | A forecaster whose bin probabilities were exactly right would score about 0.03 on the same predictions |

CF-03 also found that the local reward change-point did better than the declared global one, on dev and on `gate3`.

## The change under test (MBVI2, `cognitive/mind/`)

MBVI2 is MBVI with a different learned model. The planner (`cognitive/core/planner.mjs`), optimism value, greedy
choice, cue semantics and quality log are the same code paths.

| Part | Frozen definition (`cognitive/mind/world_model.mjs`, `WM2_DEFAULTS`) |
|---|---|
| Observation / action | `{node, nActions, goal}` and an action index; nothing else |
| Move success | Pairs are draws from one population Beta(S·μ, S·(1 − μ)). μ is the pooled move rate over the *other* pairs (leave-one-out) with hyper-prior mean 0.5 worth 1 observation. S is the value in {1, 2, 4, 8, 16, 32, 64} with the highest Beta-binomial marginal likelihood (ties: the smaller; 2 before any data). P(move) = (nMove + S·μ)/(N + S) |
| Impassable exits | A pair that has never moved is impassable with prior weight π = 0.05. After k failures the posterior weight is w = π/(π + (1 − π)·P_k), P_k = Π_{j<k} (S(1 − μ) + j)/(S + j), and P(move) is multiplied by (1 − w). Pairs enter the pooled statistics with weight (1 − w) |
| Destination | A pair that has never moved puts its move mass on UNKNOWN. Otherwise the chance of a new destination is u = min(ν, κ/(nMove + κ)), with ν = (E + κ)/(R + 1) pooled over pairs (E = moves that revealed a second or later destination, R = repeat moves) and κ = 0.25 |
| Reward and termination | As CF-03: functions of the arrival state, optimistic prior β₀ = 0.1. **Reward change-points are local** to one arrival state |
| Transition reset | As CF-03: N ≥ 20 and observed category with p < 0.05 clears the pair |
| Planner / exploration | As CF-03: γ = 0.95, θ = 1e-6, budget 100 sweeps, warm start, UNKNOWN valued at 1, greedy with uniform ties |
| Ablations | NOPOOL (fixed Beta(1, 1), v1 destination rule); NOBLOCK (π = 0); GLOBALRESET (the CF-03 global reward change-point) |

Everything the model uses is learned from the agent's own transitions. μ, S and ν are estimated from its counts.
No hidden reliability, topology or reward location is given to it; `cognitive/tests/test_mind.mjs` checks this
(source isolation and a counterfactual-invariance test).

## Command

```bash
node experiments/cf03b/run_gate.mjs --domain gate3b
```

The driver refuses to run if any file under `cognitive/` or `experiments/cf03b/` is uncommitted or modified, or if
`results/gate3b_result.json` already exists.

## Frozen evaluation values

| Item | Value |
|---|---|
| Domain / worlds | `gate3b`; `cf|gate3b|world|0…19`. Never used before. Count rule as CF-01b and CF-03: n = max(20, ⌈(2.8·SD_dev/mean_dev)²⌉), capped at 60. Dev B3 differences: SD 374.5, mean 248.3 → 17.8; dev B2 differences: SD 0.015, mean 0.072 → 0.3. **n = 20** |
| Cells | E1 EXPLORED, E1 NAIVE, E3, E1S EXPLORED (hidden reliability U[0.5, 1] per edge), E2P PRE — the CF-03 cells |
| Agents | RANDOM, QL, DYNAQ, ORACLE, MBVI (v1, unchanged), MBVI2 and its three ablations |
| Seeds | As CF-01. Bootstrap `cf|stats|gate3b|cf03b|…`, 10,000 resamples |
| **B1** calibration | Prediction-count-weighted mean of per-run ECE of MBVI2 on E1S ≤ **0.05**. Same statistic and limit as CF-03 A4, now on fresh worlds (10 equal-width bins, modal non-self outcome) |
| **B2** improvement | Per-world ECE(MBVI) − ECE(MBVI2) on E1S: mean > 0 and lower 95% bound > 0 |
| **B3** | E3: DYNAQ − MBVI2, mean > 0 and lower bound > 0 (CF-03 A1) |
| **B4** | E1 EXPLORED: upper bound of MBVI2 − DYNAQ < 10 steps (CF-03 A2) |
| **B5** | E1S: MBVI2 mean log-likelihood minus the uniform-over-exits predictor, mean > 0 and lower bound > 0 (CF-03 A3) |
| **B6** no regression | Upper bound of MBVI2 − MBVI < 10 steps on each of E1 EXPLORED, E3, E1S EXPLORED and E2P PRE |
| **B7** infrastructure | Determinism (two in-process runs); all 108 tests pass (CF-01 57, E2′ 6, core 16, invariance 6, v1 8, mind 15); ORACLE ≤ every learner on E1, E3 and E2P |
| Verdict | PASS: B1–B7. FAIL: B7 holds but some of B1–B6 fail, listed. INVALID: B7 fails |

There are six pass/fail criteria and no multiplicity correction: all six must hold, so the gate as a whole is
conservative. The ablation contrasts below are reported, not tested.

**Reported, with pre-declared directions** (positive means the ablation is worse than MBVI2):

- NOPOOL − MBVI2 on ECE > 0: pooling is what repairs calibration.
- NOBLOCK − MBVI2 on E2P PRE > 0: the impassable-exit component helps the detour.
- GLOBALRESET − MBVI2 on E3 > 0: the local reward change-point is better.
- Also reported without a direction: the same ablations on the other cells; E1 NAIVE; pooled ECE; the noise floor
  (the weighted per-run ECE of a forecaster whose bin probabilities were exactly right, 2,000 simulations); the
  learned μ, S and ν; planning compute; the `mfw-graph` reference world.

## Development-domain disclosure (`cf|dev|world|0…19`, row hash `d2b9acfc…`; observed before this freeze)

The model was developed on the dev domain in two steps. Both are disclosed because the second was made after
seeing the first.

| Step | Model | Dev ECE (E1S) |
|---|---|---|
| 0 | MBVI v1 (CF-03) | 0.1012 |
| 1 | Pooled move-success prior + impassable mixture + local reward reset, v1 destination rule | 0.0625 |
| 2 | Step 1 + pooled destination-novelty rate (the frozen design) | **0.0295** |

No further change was made after step 2. Dev results of the frozen design:

| Criterion / measure | Dev result |
|---|---|
| B1 ECE | 0.0295 (holds); pooled 0.0097; noise floor mean 0.0295, 95th percentile 0.0335 |
| B2 ECE improvement | +0.072 [0.065, 0.078] (holds) |
| B3 E3 | +248.3 [98.3, 420.5] (holds) |
| B4 E1 | MBVI2 − DYNAQ = −10.0 [−12.3, −7.9] (holds) |
| B5 log-likelihood | +0.719 [0.704, 0.735] nats (holds); MBVI2 − MBVI = +0.106 [0.098, 0.114] |
| B6 MBVI2 − MBVI | E1 0.0 · E3 −5.9 [−13.0, 1.1] · E1S +1.3 [0.1, 2.4] · E2P −0.5 [−0.7, −0.3] (holds) |
| NOPOOL − MBVI2, ECE | +0.099 [0.090, 0.106] |
| NOBLOCK − MBVI2, E2P | +4.4 [3.7, 5.1] |
| GLOBALRESET − MBVI2, E3 | +9.2 [2.7, 15.6] |
| Learned on E1S | μ 0.737 (true mean reliability 0.75); S between 4 and 32; ν 0.0006 |

**Known weakness, declared before the run.** On dev, MBVI2 needs 1.3 more steps than MBVI on E1S
([0.1, 2.4]): better calibration did not buy better behaviour there. B6 tolerates this (margin 10 steps). The gate
claims calibration without loss of performance. It does not claim that calibration improves performance.
