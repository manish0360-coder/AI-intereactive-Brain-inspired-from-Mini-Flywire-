# CF-03 Gate Results — MBVI learned-model planning against Dyna-Q

**Verdict: CF-03 FAIL (A4 calibration).** This was declared before the run, because A4 is evaluated on the dev domain and had already failed there (ECE 0.101 > 0.05).

The other criteria held on 20 fresh `gate3` worlds:

| Criterion | Result | Held? |
|---|---|---|
| A1: MBVI beats Dyna-Q on reward relocation (E3) | +220.4 [86.6, 372.8] | yes |
| A2: MBVI non-inferior to Dyna-Q on latent learning (E1) | MBVI − Dyna-Q = −10.0 [−12.7, −7.5] | yes; MBVI was better |
| A3: MBVI's learned model predicts transitions better than uniform (E1S) | +0.682 [0.659, 0.705] nats | yes |
| A4: calibration (ECE ≤ 0.05) | dev 0.101; gate 0.100 | **no** |
| A5: determinism, 93/93 tests, ORACLE sanity | — | yes |

The gate was run once. Nothing was re-run or tuned after any outcome.

| Item | Value |
|---|---|
| Evidence category | Development evaluation gate. Not confirmatory; local commits; no independent reproduction |
| Command | `node experiments/cf03/run_gate.mjs --domain gate3` (exit 0, about 126 s) |
| Code and spec | HEAD `c044e67`; `GATE_SPEC.md` SHA-256 `01f6a9b4…`; frozen before the run |
| Environment | Node v24.15.0, win32-x64 |
| Result file | `gate3_result.json`, SHA-256 `5289b9a2…d8ea`; row hash `571d6d90…ab9c` (900 rows) |
| Worlds | `cf|gate3|world|0…19`; 0 excluded |

## Acceptance

| Criterion | Statistic | 95% CI | Rule | Held |
|---|---|---|---|---|
| A1 E3 reward relocation | DYNAQ − MBVI = **+220.4** steps | [86.6, 372.8] | mean > 0, lower bound > 0 | **yes** |
| A2 E1 latent learning | MBVI − DYNAQ = **−10.0** | [−12.7, −7.5] | upper bound < 10 | **yes** (MBVI better) |
| A3 M1 model log-likelihood (E1S) | MBVI − uniform = **+0.682** nats/prediction | [0.659, 0.705] | mean > 0, lower bound > 0 | **yes** |
| A4 M2 calibration (dev E1S) | ECE **0.101** (gate E1S: 0.100) | — | ≤ 0.05 | **no** |
| A5 infrastructure | Determinism; 93/93 tests; ORACLE ≤ every learner on E1/E3/E2P | — | all | **yes** |

## Reported, with their pre-declared directions

| Measure | Value | Direction confirmed? |
|---|---|---|
| E1 NAIVE: DYNAQ − MBVI | +4.7 [−8.4, 18.7] | **no**, inconclusive |
| E1S stochastic latent learning: DYNAQ − MBVI | +36.1 [11.8, 71.4] | yes |
| E2′ detour after pre-exposure: DYNAQ − MBVI | +7.0 [4.8, 9.4] | yes |
| E3: QL − MBVI | +534.3 [364.6, 696.4] | — |
| NOOPT − MBVI (no optimism, ε = 0.1) | E3 +138.8 [42.2, 262.9] · E1 +21.9 [11.1, 38.4] · E2P +76.0 [14.6, 160.6] | yes |
| NORESET − MBVI (no change detection) | E3 +53.2 [27.7, 78.7] · E2P +96.6 [74.1, 121.3] · E1 0 | yes |
| LOCALRESET − MBVI (reward change-point local) | E3 **−12.6 [−18.2, −7.0]** | **no**, opposite: local reset did better |
| B1 − MBVI (one sweep per decision) | E1 +0.4 [0.1, 0.8] · E3 +0.9 [−0.5, 2.5] · E2P +1.6 [1.2, 2.1] | yes on E1 and E2P but negligible; inconclusive on E3 |

## Mean test-phase steps

Steps are summed over the test episodes (5 for E1, E1S and E3; 3 for E2P).

| Cell | RANDOM | QL | DYNAQ | ORACLE | **MBVI** | NOOPT | NORESET | LOCALRESET | B1 |
|---|---|---|---|---|---|---|---|---|---|
| E1 EXPLORED | 305.0 | 126.7 | 30.5 | 20.5 | **20.5** | 42.4 | 20.5 | 20.5 | 20.9 |
| E1 NAIVE | 281.4 | 151.1 | 71.2 | 20.5 | **66.5** | 81.5 | 66.5 | 66.5 | 64.8 |
| E3 | 328.3 | 587.8 | 273.9 | 19.5 | **53.5** | 192.3 | 106.7 | 40.9 | 54.4 |
| E1S EXPLORED | 349.0 | 216.3 | 64.5 | 27.1* | **28.4** | 112.7 | 28.4 | 28.4 | 28.9 |
| E2P PRE | 262.2 | 296.5 | 24.7 | 16.2 | **17.7** | 93.7 | 114.3 | 17.7 | 19.3 |

\* ORACLE ignores reliabilities, so it is not a bound on E1S.

**Other behavioural measures:**
- Steps to goal per test episode, MBVI: E1 4.1 · E1 NAIVE 13.3 · E3 10.7 · E1S 5.7 · E2P 5.9.
- MBVI censoring was 0% in every cell. DYNAQ's was 20% on E3.
- Arrivals at the old goal after relocation (E3): QL 60.7 · DYNAQ 8.1 · MBVI 2.4.
- Attempts on the blocked edge (E2P): QL 64.6 · DYNAQ 3.7 · MBVI 1.3.

## Planning compute (MBVI; budget 100 sweeps per decision)

| Cell | Sweeps / decision | Backups / decision | Budget hit | Decisions |
|---|---|---|---|---|
| E1 EXPLORED | 12.7 | 740 | 0% | 621 |
| E1 NAIVE | 7.9 | 276 | 0% | 67 |
| E3 | 6.4 | 277 | 0% | 190 |
| E1S EXPLORED | 17.7 | 1,014 | 0% | 628 |
| E2P PRE | 10.9 | 639 | 0% | 764 |

B1 uses exactly 1 sweep (36–58 backups) per decision and performs almost as well. **Because value iteration is warm-started across decisions, these worlds do not need much computation per decision.** The budget was never binding.

Model events (MBVI, means per run): E1 / E3 / E1S made 0 transition resets and 0–1 global reward resets.

## What this shows, and what it does not

**Shown, on 20 fresh 24-node worlds:**
- **End-to-end learned-model planning:**
  - The agent learns transitions only from its own experience. Counterfactual-invariance tests confirm this: its behaviour is unchanged by hidden reliability, topology or reward location until it could observe them, and agents that peek at the world are caught.
  - It plans by value iteration on that model.
  - It beats the Dyna-Q baseline on reward relocation and matches the privileged ORACLE on latent learning (20.5 vs 20.5).
- **Mechanism attribution by ablation:**
  - Optimism-driven directed exploration and change detection are the components the gains depend on.
  - Planning budget is not.
  - The global reward change-point, which CD-011 declared, is **not** supported; the local variant did better.

**Not shown:**
- **Calibrated uncertainty (A4 failed).** The likely cause, seen on dev and not tested: early overconfidence from the weak SELF prior (α₀ = 0.25). Resets are ruled out, because there were 0 of them and NORESET has the same ECE.
- **Faster learning without pre-exposure.** E1 NAIVE was inconclusive.
- **Anything about MiniFlyWire's own agent**, which did not take part (CF-02 deferred).
- **Generality.** These are 24-node, mostly deterministic worlds; there is no partial observability, and nothing has been independently reproduced.

**Reference world `mfw-graph` (reported only):**
- E3: MBVI 65 against DYNAQ 636 and QL 68.
- E1 NAIVE: MBVI 94 against DYNAQ 72, so MBVI was worse here.
