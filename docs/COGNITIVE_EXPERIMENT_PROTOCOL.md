# Cognitive Experiment Protocol

Part of the cognitive research package ([handbook](COGNITIVE_ARCHITECTURE_HANDBOOK.md)). The metrics are defined in [`COGNITIVE_METRICS.md`](COGNITIVE_METRICS.md).

**Principles.**
- Every task hides the knowledge it tests.
- Every claim is a paired contrast against a baseline that lacks the mechanism.
- Small development pilots must show that a task discriminates before any large or confirmatory run.
- No tuning happens after outcomes are seen.
- Development, gate and confirmatory runs use disjoint seed domains.

---

## 1. Common setup (CF-01 testbed)

| Item | Definition |
|---|---|
| World | An undirected connected graph with hidden per-edge reliability. Generated worlds: 24 nodes, 30 edges, max degree 4, seeded. Reference world `mfw-graph` = `connections.json` (20 nodes, 39 edges) |
| Observation | `{ node, nActions, goal }` (handbook §8.2). Node labels are relabelled per world, and action labels are permuted per node |
| Dynamics | Exit `i` succeeds with probability p(e), otherwise the agent stays. A blocked edge always fails. In battery v0 (E1–E3), p(e) = 1 except for blocked edges |
| Reward | 1 on arrival at the rewarded node (episode ends); 0 otherwise. The cap is 200 steps (truncated) |
| Seeds | SHA-256 of a label: `cf|<domain>|<task>|<world index>|<stream>`. Domains: `dev` (development, unlimited), `gate` (CF-01 gate, used once), `confirm` (reserved) |
| Common random numbers | All agents in one world share the environment streams: per-edge draws, starts and world generation. The agent stream is `…|agent` |
| Pairing | The unit of analysis is the world. Contrasts are paired within a world |
| Statistics | Mean paired difference with a percentile bootstrap 95% CI (10,000 resamples, seeded stream `cf|stats`). No p-value fishing; one pre-declared primary contrast per task |

## 2. Baselines

**Implemented in CF-01:**

| Agent | Definition | Fixed parameters |
|---|---|---|
| `RANDOM` | Uniform over exits | — |
| `QL` | Goal-conditioned tabular one-step Q-learning. State = (node, cue); ε-greedy, ties broken uniformly | α 0.5, γ 0.95, ε 0.1, Q₀ = 0 |
| `DYNAQ` | `QL` plus a deterministic last-outcome model of every experienced (s, a) and k planning updates per real step on uniformly drawn experienced pairs (Sutton & Barto 2018 §8.2). With a goal cue, the planning reward is 1[s′ = cue]: the cue's meaning is declared task knowledge. Without a cue, the planning reward is the last observed reward for (s, a) | QL parameters plus k = 20 |
| `ORACLE` | Privileged shortest path on the true current graph to the true rewarded node; random when no node is rewarded | upper-bound reference only |

**Later:**
- `MBVI`, the Dirichlet world model with value iteration (CF-03).
- `SR`, a tabular successor representation (CF-06).
- A belief or expected-free-energy agent (CF-05).
- `MFW-legacy` (CF-02).

---

## 3. The battery

Each experiment lists hypothesis, independent variable (IV), dependent variable (DV), controls, randomisation, sample size, baselines, ablations, failure criteria, statistics and reproducibility.

### E1 — Latent learning (C1)

- **Hypothesis.** An agent that learns a transition model uses unrewarded exposure to reach a newly cued goal faster than an agent that caches only values.
- **Design.**
  1. Phase A: 600 steps with no rewarded node and no cue. Every 50 steps the episode is truncated and restarts at a start-stream node.
  2. Phase B: the goal G is cued and rewarded. Five episodes start from a fixed start S with true distance d(S, G) ≥ 3.
- **IV.** Agent: QL vs DYNAQ (primary). Exposure: EXPLORED vs NAIVE, a fresh agent with phase B only (secondary).
- **DV.** Total steps over the 5 phase-B episodes, each capped at 200.
- **Controls.**
  - QL EXPLORED vs QL NAIVE is a built-in negative control. QL cannot learn from zero reward, so its expected difference is 0, and a non-zero CI flags a leak.
  - ORACLE gives the bound.
- **Seeds.** World, start and goal come from the world stream. CRN apply.
- **Sample size.** 20 worlds for the gate. This is a pilot for large effects; a task that cannot show its effect at n = 20 is not useful as an instrument.
- **Primary contrast.** D1 = steps(QL, EXPLORED) − steps(DYNAQ, EXPLORED).
- **Failure.** The CI of D1 includes or lies below 0. The task is then not admitted.

### E2 — Detour (C3, C6)

- **Hypothesis.** A model-based agent re-routes faster than a model-free one when a learned route is blocked.
- **Design.**
  1. Phase A: goal G cued, 40 episodes from S.
  2. Phase B: an edge e on a shortest S→G path is blocked. Removing e must keep the graph connected and raise d(S, G). Then 3 episodes from S.
- **IV.** Agent.
- **DV.** Total steps over the 3 phase-B episodes. Secondary: attempts on the blocked edge.
- **Controls.** ORACLE (knows the block). RANDOM.
- **Primary contrast.** D2 = steps(QL) − steps(DYNAQ).
- **Failure.** The CI includes or lies below 0.
- **Known limit.** A deterministic last-outcome model updates after one failed attempt. A probabilistic model (CF-03) will need several, and that is the intended contrast later.
- **CF-01 outcome.** E2 was **not admitted** (+121.2 [−3.0, 236.2]). It is replaced by E2′, which adds pre-exposure, and E2′ needs its own gate on a fresh domain (CD-010). This section stays as the record of what was tested.

### E3 — Revaluation by reward relocation (C5)

- **Hypothesis.** A model-based agent abandons an old goal and reaches a new rewarded location faster than a model-free one.
- **Design.**
  1. Phase A: no cue; reward at G1; 30 episodes from S.
  2. Phase B: the reward moves, unannounced, to G2. G2 ≠ G1, d(S, G2) ≥ 3, G2 is not on any shortest S→G1 path. Reaching G1 no longer ends the episode. Then 5 episodes from S.
- **IV.** Agent.
- **DV.** Total steps over the phase-B episodes. Secondary: visits to G1 during phase B (perseveration).
- **Primary contrast.** D3 = steps(QL) − steps(DYNAQ).
- **Failure.** The CI includes or lies below 0.
- **Cued variant.** A cued goal switch is reserved for CF-03. The goal-conditioned QL has no habit interference under a cue, so the cued switch reduces to E1.

### E4 — Hidden structural change (C4)

- **Hypothesis.** An agent with a probabilistic transition model and change detection reroutes after an unannounced reliability change faster than fast-forgetting MF.
- **Design.**
  - Reliabilities come from the M7 generator family.
  - At step T, the reliability of route-critical edges changes, unannounced.
  - Primary DV: the distal switch rate. The COG-A Addendum 1 definition is reused: a counterfactual cause attribution at decision states whose best action changes only for downstream reasons.
- **Baselines.** QL with α tuned only on the dev domain; DYNAQ; MBVI.
- **Prerequisite.** CF-03.
- **Known risk.** COG-A propagation precondition P2 failed at 1,500 steps (`experiments/coga/VERIFICATION_REPORT.md`). Horizon and power must therefore be calibrated on dev worlds before any gate.

### E5 — Transfer (C8)

- **Hypothesis.** Structure learned on world family F speeds learning on an unseen member of F, more than a fresh agent and more than an agent trained on a mismatched family F′.
- **IV.** Training family (F, F′, none).
- **DV.** Steps to criterion on the test world.
- **Prerequisite.** CF-06.
- **Failure.** Gain(F) is not above gain(F′).

### E6 — Partial observability (C7, D)

- **Hypothesis.** When the current observation does not identify the state (aliased nodes), history or belief and episodic retrieval are necessary.
- **Design.** Pairs of nodes emit the same label. A cue seen earlier in the episode determines which exit is rewarded.
- **Baselines.** Memoryless QL (expected to fail), a k-history QL, a belief agent, and an episodic agent.
- **Prerequisite.** CF-05.

### E7 — Memory ablation (C10)

Disable one memory subsystem at a time: episodic, semantic or procedural cache. Measure the drop on the task that needs it (E6 for episodic, E5 for semantic), and check that unrelated tasks are unchanged. A pre-declared double dissociation is required.

### E8 — Motivation ablation (C10)

Remove the exploration bonus. Prediction: coverage speed in E1 phase A, and with it the E1 latent-learning benefit, falls. A noisy-edge control must not attract the bonus.

### E9 — Planning ablation (C3, C10)

MBVI with a planning budget of 0 (equal to its MF fallback) vs full. Predictions:
- the E2 and E3 benefits vanish at budget 0;
- the planning budget–performance curve is monotone.

### E10 — Long-horizon behaviour (R)

Generated worlds with diameter ≥ 8 and keyed doors: a sub-goal must be visited before the goal becomes reachable. This tests dependent decisions. Prerequisite: CF-04.

**Not in battery v0:** E4–E10 each need their prerequisite milestone. They are specified here so that later milestones cannot redefine them after seeing data. Changing a definition means a new protocol version, committed before the run.

---

## 4. CF-01 development gate (pre-declared)

This section was committed before any gate-domain run. The exact parameter values are frozen in `experiments/cf01/GATE_SPEC.md` at the CF-01 implementation commit, again before the gate run. Values may change on the `dev` domain until that freeze; every change is listed in `GATE_SPEC.md`.

| Gate | Pass rule |
|---|---|
| G1 Determinism | The whole gate run, done twice, gives byte-identical result records (SHA-256 equal) |
| G2 Isolation | All isolation tests pass: schema, freeze, globals, imports, forbidden APIs, label permutation, privileged channel. Every mutant is caught by its named check (handbook §13). *Note (2026-11-07):* `run_gate.mjs` counts the real-world label-permutation test (`test_worlds.mjs`) under G3; only its mutant is counted under G2. Both passed, so the CF-01 verdict is unaffected |
| G3 Environment correctness | Unit tests pass: the reset/step contract; empirical success rate inside the binomial 99.9% interval for p ∈ {0.3, 0.7}; blocked edges never traversed; goal entry obeys dynamics; truncation ≠ done; invalid action rejected; CRN invariance |
| G4 Task discriminability | For each of E1, E2 and E3 on 20 `gate` worlds: the primary contrast's mean > 0 **and** its 95% bootstrap CI lower bound > 0. A task that fails is **not admitted** to the battery; it is recorded and redesigned in a later milestone |
| G5 Reference sanity | Mean ORACLE steps ≤ mean steps of every learner on every task. A failure means a bug and stops the gate |

**Reported, not pass/fail:**
- The E1 negative control (QL EXPLORED − QL NAIVE).
- RANDOM.
- DYNAQ EXPLORED − DYNAQ NAIVE.
- Secondary metrics.
- Results on `mfw-graph`.

**Outcome labels:**
- **CF-01 PASS:** G1, G2, G3 and G5 pass and at least two of the three tasks are admitted.
- **CF-01 PARTIAL:** fewer than two tasks are admitted. The gate infrastructure is still valid.
- **CF-01 FAIL:** G1, G2, G3 or G5 fails.

---

## 5. Reproducibility requirements (all experiments)

Every run records:
- the command and exit code;
- the Node version, platform and HEAD;
- the spec hash and the seed domain;
- the per-world result rows;
- the result hash.

Raw logs stay outside the repository. Summaries are committed. A confirmatory run additionally needs:
- a pushed freeze commit before the run (needs authorisation);
- an analysis script committed with the freeze;
- an independent reproduction of the headline contrast.
