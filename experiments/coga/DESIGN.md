# COG-A — design (M-COGA-2; not yet frozen)

Status: **design, not frozen**. Everything here is fixed **except δ and q_min**, which need the Research Director's substantive
judgment (§13). The protocol freeze (M-COGA-5) pins this file by hash. Labels as in `M1_AUDIT.md`.

## 1. Question and claim limits

After an unannounced change of the hidden edge reliabilities, does MiniFlyWire (MFW, map oracles off) choose the newly optimal
action at decision states whose optimal choice changed **for downstream reasons**, at its **first post-change decision there**,
more often than without the change, and specifically rather than through general randomisation?

- A positive result can establish at most: cross-state propagation of experienced change (planning or replay) in this
  20-node, topology-known, hidden-reliability world. It does **not** establish a cognitive map, model-based planning as such,
  general cognition or general intelligence.
- A null or equivalence result shows only that this procedure detected no propagation at first post-change decisions within
  1,500 steps.

## 2. Environment contract

| item | definition | status |
|---|---|---|
| graph | `connections.json` / `neurons.json`: 20 nodes, 39 undirected edges, adjacency in file order | FACT |
| world i | the i-th accepted configuration of the M7 stream from configuration seed 200,000 with `configIndex = i` (`env.generateAcceptedStream`), unchanged M7 acceptance | FACT (`xfer1/config.mjs:7`); dev worlds 0–29 reproduce seeds 200116…202196 |
| second-stage acceptance | a world is used only if it has ≥ K_dist = 1 DISTAL state (§5); rejected indices are logged and consumed | PROPOSAL (census rule) |
| phases | steps `[0, 1500)` phase I (`pPhase1`); steps `[1500, 3000)` phase II (`pPhase2`) under **SWAP**, `pPhase1` throughout under **NO-SWAP** | PROPOSAL (M7 constants) |
| step | baselines: one attempt per step; MFW: one `runAgent()` call (`__M7_TEL__.step()`), at most one attempt | FACT (MFW: `main.js:3255`, `:5014-5020`) |
| attempt(from, to) | a non-edge pair is **refused** (agent stays, step consumed, counted); an edge e succeeds iff `u(e, j) < p_phase(e)`, where `u(e, j)` is the j-th uniform of the environment stream of edge e in that session (common random numbers: the same `u(e, j)` for every agent and condition of the world) | PROPOSAL |
| episode | ends on arrival at the goal or after 150 steps; baselines then start at the next start node drawn from the world's environment start stream (uniform over non-goal nodes, indexed by episode number); MFW starts are drawn by its runtime (`main.js:3404`) | PROPOSAL / FACT |
| reward | baselines receive r = 1 on arrival at the goal, else 0; MFW uses its internal reward (`main.js:4825`) and sees the same arrivals | PROPOSAL / FACT |
| what no agent receives | p, the phase, the swap time, distances, oracle outputs | PROPOSAL; MFW oracle accounting I2 verifies the oracles |
| topology | known to every agent (adjacency at reset); MFW holds it already, Q ignores it, Dyna-Q's model starts with the known edges and unknown outcomes | PROPOSAL |

## 3. Agents

| agent | definition | parameters |
|---|---|---|
| Random walk | uniform over the current node's neighbours | none |
| QB-1 | tabular one-step Q-learning exactly as `M1_AUDIT.md` §4 (Q = 0 initially; in-step update; terminal at the goal; truncation bootstraps; constant α, γ, ε; two fresh uniforms per decision; greedy ties by ascending node id) | γ = 0.95 fixed; α, ε tuned (§3.1) |
| Dyna-Q | QB-1 plus the classic tabular Dyna-Q planning loop (Sutton & Barto, *Reinforcement Learning*, 2nd ed., §8.2): a deterministic model storing the last observed (r, s') of every experienced (s, a); after each real step, k planning updates on (s, a) drawn uniformly from the experienced pairs | γ = 0.95; α, ε as tuned for QB-1; **k = 5** (initial preregistered cap; sensitivity k ∈ {1, 20} on development worlds only) |
| MFW | the pinned LEARN-0 tree; map off (`__LEARN0__`, all four oracles blocked, I2 accounting); guard ON (`__GFGUARD__`: graph-only admission, execution guard); hook state P (`arm OFF, envMode off, creditMode off, pin off`) with the COG-A environment installed as `__M7_ENV__`; Variant C clock preload (VIRTUAL, t0 = 1767225600000, 500 ms per fired loop) | none (fixed runtime, not tuned) |

Interaction budget: 3,000 steps for every agent. Dyna-Q's k planning updates are **computation**, not interaction; every session
reports value updates per real step. MFW's internal computation is reported as is.

### 3.1 Tuning (development only)

QB-1's (α, ε) is chosen on development worlds from the grid α ∈ {0.1, 0.3, 0.5} × ε ∈ {0.05, 0.10, 0.20} by **phase-I
performance only**: goal arrivals in steps [1000, 1500) under NO-SWAP (no swap-dependent quantity is used). Dyna-Q uses the same
(α, ε). Every grid point's result is recorded. MFW is not tuned.

## 4. RNG contract and session identity

- Seed of any stream = first 32 bits (big-endian) of `sha256(canonical JSON {study:'COG-A', version, world, agent, condition, purpose})`.
- Environment streams: `agent = 'ENV'`, `condition = 'ANY'`, purpose `slip:<edge>` or `start`; shared by every agent and condition
  of the world.
- Agent streams: before the shift `condition = 'pre'` (identical in SWAP and NO-SWAP); from the first step ≥ 1500
  `condition = 'SWAP'` or `'NOSWAP'` (independent, as required by A6).
- MFW: `initRng(seed(world, 'MFW', 'pre', 'agent'))` at boot; `initRng(seed(world, 'MFW', condition, 'agent'))` at the start of step
  1500 (via `__M7_TEL__.step()`), which re-derives the cognitive, visual and (unused) environment streams.
- Every session record carries: study version, world, configuration seed, goal, agent, condition, every stream id and seed, PRNG
  (mulberry32), environment, agent and tree hashes, and the full attempt log `[step, from, to, legal, success]`.
- Checks: all derived seeds unique within the study; SWAP and NO-SWAP attempt logs identical on steps `[0, 1500)` (**I-IDENT**);
  results independent of execution order (one process per session; re-running in the reverse order reproduces every record).

## 5. Classification, events and outcomes

Distal and stable states come from `distal.mjs` with **γ = 0.95, κ = 0.10** (selected by the pre-declared census rule,
`census.mjs`, commit `8740c06`; see §11), objectives `attempts` and `discounted` both as costs, continuations on G∖{s}.

- **DISTAL(w)**: decision states DISTAL under both objectives with disjoint unions A₁*/A₂*, at κ/2, κ and 2κ.
- **STABLE(w)**: decision states with identical phase-I and phase-II near-optimal sets under both objectives at the three tolerances.
- **Event** for state s in a session: the first attempt with `from = s` at a step ≥ 1500. `V = 1` if it exists, `t` its step.
- **Outcome** at a DISTAL event: `Y = 1` iff the attempted target ∈ A₂*(s) (refused or other targets score 0).
- **Leaving** at a STABLE event: `L = 1` iff the attempted target ∉ A₁*(s).

## 6. Estimand, estimator and analyses

Per agent g, world w, DISTAL state s: `V_S, V_N, Y_S, Y_N`. Strata: **AA** (V_S = V_N = 1), **A0** (1, 0), **0A** (0, 1), **00** (0, 0).

**Primary estimand (E1).** θ_g = E[Σ_{s∈AA_w} (Y_S − Y_N)] / E[|AA_w|], expectation over accepted worlds.
**Estimator.** θ̂_g = Σ_w Σ_{AA_w} (Y_S − Y_N) / Σ_w |AA_w|.
**Interval.** Goal-stratified cluster bootstrap over accepted worlds (all of a world's sessions together), B = 10,000, fixed seed,
percentile 95% interval. Worlds with `|AA_w| = 0` stay in the resampling and add 0 to both sums; a replicate with zero total AA is
redrawn (the count of redraws is reported).

**Interpretation.** θ is an effect **within the observed paired-support stratum**. Route and visitation differences (M1) and
adaptation over all distal states (M2, M5) are separate questions and are never reported as θ.

| id | analysis (preregistered) |
|---|---|
| M1 | counts AA, A0, 0A, 00 per agent, condition and goal; AA share q = \|AA\| / (\|AA\| + \|A0\| + \|0A\|); encounter-rate difference SWAP − NO-SWAP |
| M2 | Manski bounds on θ_E over E = AA ∪ A0 ∪ 0A (missing first-opportunity choice set to 0 or 1): lower `(Σ_AA d + Σ_A0 (Y_S − 1) − Σ_0A Y_N) / \|E\|`, upper `(Σ_AA d + Σ_A0 Y_S + Σ_0A (1 − Y_N)) / \|E\|` |
| M3 | θ̂ by SWAP-event time bins [1500, 1650), [1650, 2000), [2000, 3000); θ̂ on the time-matched subset \|t_S − t_N\| ≤ 150 |
| M4 | world-weighted θ̂_w = mean over worlds with \|AA_w\| > 0 of the per-world mean difference, against the event-weighted θ̂ |
| M5 | composite: mean over all DISTAL pairs of (V_S·Y_S − V_N·Y_N) (secondary; mixes route and choice) |
| M6 | θ is NOT EVALUABLE if q < q_min (§13) |

**Instruments.**
- **I-NULL:** θ_QB1 (structural null, `M1_AUDIT.md` §4), on the confirmatory worlds (baselines run on every confirmatory world);
  its interval must lie inside ±δ.
- **I-SPEC:** λ_g = same pairing over STABLE states, with L in place of Y. A positive θ is labelled *specific* only if the upper bound of λ is below δ.
- **PC:** θ_Dyna − θ_QB1, paired by world, on the development-simulation worlds (§9), before the freeze; passes iff its lower bound
  exceeds δ (`DECISION_TABLE.md`).
- **I-IDENT:** see §4.
- **I2:** MFW map-off accounting (every oracle executed 0 times, blocked > 0 times).
- **I-GUARD:** MFW refused attempts = 0 and blocked illegal executions recorded.
- **P2:** pre-swap competence, the share of steps-[1000, 1500) attempts that follow π₁* at decision states, compared with the random-walk share.

## 7. Statistical decision

Decision rules: `DECISION_TABLE.md`, a superiority-plus-equivalence (TOST) reading of one 95% interval of θ_MFW against δ. One
primary outcome, one interval, no multiplicity adjustment for it; secondary analyses are descriptive. No interim analysis and no
optional stopping: the confirmatory sample size is fixed at the freeze.

## 8. Power and sample size

Method and results: `POWER_ANALYSIS.md`. The confirmatory n is chosen there from a simulation that reproduces the estimator and
the bootstrap, with nuisance parameters estimated on development worlds under the blinding rule (§10).

## 9. Territory and seeds

| use | territory | status |
|---|---|---|
| development | accepted-stream indices 0–29 (seed 200,000 stream; already development-consumed by XFER-1, LEARN-0, CREDIT-1) | PROPOSAL (reuse for development only) |
| development-simulation (positive control, QB-1 null calibration, baseline tuning; MFW only for nuisance parameters if the 30 development worlds are too few) | accepted configurations of the M7 stream started at configuration seed **150,000** (`generateAcceptedStream(150000, ·)`), below the 200,000 study stream; never a confirmatory world. Seed 100,000 was avoided: MCF-1 uses configuration 100000 / index 1 / accepted 100026 for development (FACT `experiments/mcf1/config.mjs:62-63`); no configuration seed in 150,000–199,999 appears in the repository | PROPOSAL |
| confirmatory | accepted-stream indices from 3240 upward (after CREDIT-1's reserved 2032–3239), contiguous, after second-stage acceptance | PROPOSAL |
| excluded | configuration seeds 886000–900499 (registry: consumed), ≥ 900500 (held-out) | FACT (registry) |

The registry is not modified (`M1_AUDIT.md` §7). A collision check proves the confirmatory configuration seeds are disjoint from
every range above and from the development and simulation seeds actually generated.

## 10. Blinding of development outcomes

Before δ and q_min are frozen, **no SWAP-condition choice outcome (Y_S or L_S) of any agent is computed or inspected.**
Development runs may use: visitation (V in both conditions, AA structure), NO-SWAP outcomes, timings, invariants and instrument
counters. The analysis code enforces this with an explicit `sealed` mode. Power simulation draws SWAP outcomes from assumed effect
sizes, not from data.

## 11. Static census (zero sessions) — result

`node experiments/coga/census.mjs` on development worlds 0–29 (`evidence/census_dev.json`):

| γ | κ | mean DISTAL / world | worlds with ≥ 1 | total DISTAL | mean STABLE / world |
|---|---|---|---|---|---|
| 0.95 | 0.20 | 0.13 | 4/30 | 4 | 3.17 |
| **0.95** | **0.10** | **1.00** | **18/30** | **30** | **5.07** |
| 0.95 | 0.05 | 1.83 | 24/30 | 55 | 6.27 |
| 0.90 / 0.99 | 0.10 | 1.00 / 1.00 | 18/30 / 18/30 | 30 / 30 | 5.03 / 5.10 |

- Verdict **FEASIBLE**; the rule selects κ = 0.10 (exactly at its 1.0 threshold: a borderline result, recorded as such).
- Max expected attempts to the goal over every state and both phases is 9.64 (≤ 50): the 150-step cap is negligible (D-f), and
  γ = 0.95's 20-step horizon exceeds it.
- The G∖{s} argmin agrees with `env.reliabilityOptimalPolicy` for every state and phase of all 30 worlds (D-g).
- Classes at the chosen setting (570 decision states): NO_SWITCH 176, STABLE 152, LOCAL 133, DISTAL 30, INTERACTION 28,
  DISTAL_UNSTABLE 27, OBJECTIVE_DISAGREES 24. Most switches are LOCAL, as expected when every edge changes.

## 12. Validity, exclusions and failed sessions

- A session that crashes, fails I-IDENT, I2 or I-GUARD, or whose clock observation shows a violation is **void**; a void session
  voids its world for every agent (paired design). Voided worlds are reported with reasons and are not replaced.
- If more than 5% of confirmatory worlds are void, the result is VOID (decision table R8).
- An implementation defect found after the freeze stops the study; it is repaired and documented, and the confirmatory run is
  repeated in full on fresh territory only with a new freeze.

## 13. Parameters

| parameter | meaning | depends on it | selection | status |
|---|---|---|---|---|
| γ | discount for QB-1/Dyna-Q and for the discounted objective | DISTAL set, baselines | a priori 0.95 (20-step horizon > max expected attempts 9.64); sensitivity 0.90/0.99 changes nothing | FROZEN by rule (`8740c06`) |
| κ | near-optimality tolerance (relative cost) | DISTAL and STABLE sets, A₁*/A₂* | first of 0.20/0.10/0.05 with ≥ 1.0 DISTAL per development world | **0.10** by rule |
| K_dist | minimum DISTAL states for a world to be used | which worlds enter | 1: a world without one cannot contribute an event | 1 by rule |
| W_t | time-matching window for M3 | M3 only | 150 steps = one episode cap | a priori |
| k | Dyna-Q planning updates per real step | positive control | 5 (preregistered cap); sensitivity 1, 20 on development only | a priori |
| (α, ε) | QB-1 / Dyna-Q learning rate and exploration | baselines | development tuning on phase-I performance (§3.1) | M-COGA-4 |
| **δ** | smallest effect on θ (probability difference) that matters scientifically | every decision row, I-NULL, I-SPEC, PC, n | **Research Director**: substantive judgment, informed by power curves | **OPEN** |
| **q_min** | minimum AA share for θ to be interpretable | M6 / row R7 | **Research Director**, informed by the development AA shares and the M2 bound width (1 − q) | **OPEN** |
| n | confirmatory accepted worlds | power | `POWER_ANALYSIS.md` | after δ |
