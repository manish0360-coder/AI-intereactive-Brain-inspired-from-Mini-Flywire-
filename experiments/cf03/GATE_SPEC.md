# CF-03 Gate Specification — MBVI against Dyna-Q (frozen)

**Status.** Frozen in the CF-03 implementation commit, before the `gate3` domain was run.

- This is a development evaluation gate, not confirmatory. Commits are local.
- The result is bound to the commit it ran at.
- The acceptance criteria are the Director-approved ones (review 2026-11-07, §E). They are reproduced unchanged below and are not altered by anything observed on the dev domain.

**Important, declared before the gate run.** Criterion A4 is evaluated on the dev domain, as approved. **It already failed on dev** (ECE 0.101 > 0.05; see the disclosure). CF-03 therefore **cannot PASS** at this freeze. The gate3 run still goes ahead, to measure A1–A3 and the reported contrasts on fresh worlds. No parameter was changed after the dev result.

## Command

```bash
node experiments/cf03/run_gate.mjs --domain gate3
```

The driver refuses to run if any file under `cognitive/` or `experiments/cf03/` is uncommitted or modified, or if `results/gate3_result.json` already exists.

## The agent (MBVI, `cognitive/core/`)

| Part | Frozen definition |
|---|---|
| Observation / action | `{node, nActions, goal}` and an action index (handbook §8); nothing else |
| Transition model | Dirichlet per (s, a) over SELF, each observed non-self outcome, and UNKNOWN. Prior α₀ = 0.25 on SELF and on UNKNOWN. p(SELF) = (n_self + α₀)/(N + 2α₀), p(s′) = n(s′)/(N + 2α₀), p(UNKNOWN) = α₀/(N + 2α₀) |
| Reward and termination | Functions of the arrival state (CD-011). Optimistic Beta-style prior: P = (k + β₀)/(n + β₀) with β₀ = 0.1, which is 1 before any arrival. A failed move carries no reward information. With a cue, the declared semantics R = D = 1[s′ = cue] apply (CD-005) |
| Change handling | Transition reset when N ≥ 20 and the observed category had p < 0.05. Reward reset when n ≥ 5 and the observed reward had p < 0.05, clearing every state (global change-point) |
| Planner | Gauss–Seidel value iteration over visited states. γ = 0.95, θ = 1e-6, budget 100 sweeps per decision, warm start; values cleared on a cue change |
| Exploration | UNKNOWN valued at V_opt = 1; greedy choice, ties broken uniformly by the agent's stream; ε = 0 |
| Ablations | NOOPT (V_opt = 0, ε = 0.1); NORESET (no resets); LOCALRESET (reward reset clears one state only); B1 (budget 1 sweep) |

## Frozen evaluation values

| Item | Value |
|---|---|
| Domain / worlds | `gate3`; `cf|gate3|world|0…19`. Count rule as CF-01b: n = max(20, ⌈(2.8·SD_dev/mean_dev)²⌉), capped at 60, applied to the dev A1 differences. Dev: SD 375.5, mean 242.4 → 18.8 → **n = 20** |
| Cells | E1 EXPLORED and E1 NAIVE (CF-01 E1); E3 (CF-01 E3); E1S EXPLORED (E1 with hidden reliability U[0.5, 1] per edge); E2P PRE (CF-01b E2′) |
| Agents | RANDOM, QL, DYNAQ, ORACLE, MBVI and the four ablations. CF-01 parameters for the CF-01 agents |
| Seeds | As in CF-01/CF-01b. Bootstrap `cf|stats|gate3|cf03|…`, 10,000 resamples |
| **A1** | E3: DYNAQ − MBVI, mean > 0 and lower 95% bound > 0 |
| **A2** | E1 EXPLORED: MBVI − DYNAQ upper 95% bound < 10 steps (non-inferiority) |
| **A3** | E1S: per-world mean log-likelihood of MBVI's predictions minus the uniform-over-exits predictor 1/(nActions + 1); mean > 0 and lower bound > 0 |
| **A4** | Calibration on dev E1S: prediction-count-weighted mean of per-run ECE (10 bins, modal non-self outcome) ≤ 0.05 |
| **A5** | G1 determinism; all 93 tests pass (CF-01 57, E2′ 6, core 16, invariance 6, v1 8); G5 ORACLE ≤ every learner on E1, E3 and E2P |
| Verdict | PASS: A1–A5. FAIL: A5 holds but some of A1–A4 fail, listed. INVALID: A5 fails |

**Reported, with pre-declared directions** (positive means DYNAQ or the ablation needs more steps than MBVI):
- E1 NAIVE, E1S and E2P PRE: DYNAQ − MBVI > 0.
- Ablation − MBVI > 0 for NOOPT (E3), NORESET (E3, E2P), LOCALRESET (E3) and B1 (E1, E3).
- Planning backups, sweeps, budget-hit share and steps-to-goal for every MBVI variant.

## Development-domain disclosure (`cf|dev|world|0…19`, row hash `9dcf0850…`; observed before this freeze; no parameter changed)

| Criterion / measure | Dev result |
|---|---|
| A1 E3 | +242.4 [96.2, 413.5] (holds) |
| A2 E1 | MBVI − DYNAQ = −10.0 [−12.3, −7.9] (holds) |
| A3 M1 | +0.660 [0.643, 0.676] nats (holds) |
| **A4 ECE** | **0.1012 (fails)** |
| E1 NAIVE / E1S / E2P | +44.7 [10.4, 83.0] / +54.5 [18.7, 104.5] / +10.3 [7.8, 12.9] |

**Ablations against MBVI:**

| Ablation | E3 | E1 | E2P |
|---|---|---|---|
| NOOPT | +262.0 | +64.0 | +93.6 |
| NORESET | +54.2 | — | +138.9 |
| **LOCALRESET** | **−8.7 [−15.4, −1.5]: opposite to the pre-declared direction** | — | — |
| B1 | −0.05 | +0.2 | +2.0 |

**A4 diagnosis (descriptive, not tested):**
- MBVI made 0 transition resets on dev E1S, and NORESET has the same ECE (0.1012), so resets are not the cause.
- The likely cause is early overconfidence from the weak SELF prior (α₀ = 0.25). After 1–4 successes the model predicts 0.67–0.89, while reliabilities in E1S average 0.75.
- NOOPT, which samples pairs more often, has ECE 0.075.
- A fix (for example a hierarchical prior over reliability shared across pairs) would be a design change for a later milestone. It is **not** made here, because A4 is evaluated on the dev data already seen.

**Compute on dev** (MBVI): 6.5–17.8 sweeps and 292–1,025 backups per decision. The budget of 100 was never hit.
