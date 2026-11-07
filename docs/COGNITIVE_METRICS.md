# Cognitive Metrics

Part of the cognitive research package ([handbook](COGNITIVE_ARCHITECTURE_HANDBOOK.md)).

Every metric is computed from the **environment trace**, which is the environment's own log. The only exceptions are the model-quality metrics, which are computed from the agent's declared predictions, and these say so. No metric reads an agent's internal state to decide whether the agent succeeded.

## 1. Behavioural metrics

| ID | Metric | Definition | Used by |
|---|---|---|---|
| B1 | Episode steps | Environment steps from reset to arrival at the rewarded node; a truncated episode counts as its cap (200) | E1–E3 primaries |
| B2 | Phase total | Sum of B1 over the first *k* episodes of a phase (k declared per task) | E1 (k = 5), E2 (k = 3), E3 (k = 5) |
| B3 | Censoring rate | Share of episodes in a phase that reached the cap | reported with every B2 |
| B4 | Blocked-edge attempts | Attempts on the blocked edge during phase B | E2 secondary |
| B5 | Perseveration | Arrivals at the old goal node during phase B | E3 secondary |
| B6 | Coverage | Distinct (node, exit) pairs tried by step t | E1 phase A, E8 |
| B7 | Regret to oracle | B2(agent) − B2(ORACLE) on the same world | reported |
| B8 | Distal switch rate | COG-A Addendum 1 definition: at decision states whose best action changed for downstream reasons, the share of first post-change attempts that use the new best action | E4 |

## 2. Contrasts and statistics

- **Paired world-level difference.** D = mean over worlds w of [B2(baseline, w) − B2(mechanism, w)]. Positive means the mechanism helps.
- **Interval.** Percentile bootstrap 95% CI over worlds: 10,000 resamples from the seeded stream `cf|stats`.
- **Admission rule (CF-01 G4).** Mean D > 0 and the CI lower bound > 0.
- **Effect size.** D divided by the mean B2 of the baseline. Reported, not gated.
- **Multiplicity.** One primary contrast per task, declared in advance. Secondary contrasts are descriptive.

## 3. Model-quality metrics (CF-03 onward)

| ID | Metric | Definition |
|---|---|---|
| M1 | Held-out predictive log-likelihood | Mean log p̂(s′ \| s, a) over transitions held out from learning (next-step prediction before the update) |
| M2 | Success calibration (ECE) | 10 equal-width bins of predicted success probability against realised success; expected calibration error |
| M3 | Brier score | Mean (p̂ − outcome)² for traversal success |
| M4 | Change-detection latency | Steps from an unannounced change to the first time surprise exceeds a threshold fixed on dev worlds |
| M5 | Planning cost | Value-iteration sweeps or backups per decision |

## 4. Integrity metrics (hard gates)

| ID | Gate | Pass |
|---|---|---|
| I1 | Determinism | Identical result hash across two full runs |
| I2 | Observation schema | Exactly `node`, `nActions`, `goal`; integers or null; frozen |
| I3 | No privileged leakage | Isolation tests and mutants (handbook §13) all pass |
| I4 | CRN | Per-edge outcome sequences are identical across agents for the same world |
| I5 | Environment statistics | Empirical success rate within the binomial 99.9% interval of p |

## 5. Acceptance criteria by capability (later milestones)

These are fixed before the milestone that tests them, in the protocol version for that milestone.

| Capability | Accept when |
|---|---|
| C1 latent learning | E1: D(QL vs mechanism) admitted, and mechanism EXPLORED − NAIVE > 0 with CI > 0 |
| C3/C6 detour | E2: D admitted against QL and against DYNAQ (CF-03 claims require beating DYNAQ, not only QL) |
| C5 revaluation | E3: D admitted, and perseveration (B5) is lower than QL's with CI > 0 |
| C4 structural change | E4: distal switch rate DiD (change minus no-change) exceeds QL's, CI > 0 |
| C9 calibration | M2 ECE ≤ 0.05 in stationary dev worlds, and M4 latency below a pre-set bound |
| C7 recall | E6: context-matched minus mismatched effect > 0, CI > 0; memoryless and k-history baselines fail the task |
| C8 transfer | E5: gain(F) − gain(F′) > 0, CI > 0 |
| C10 dissociation | E7–E9: each ablation hurts its own task (CI > 0) and leaves the others inside a pre-set equivalence margin |
