# FutureScore V2.3 — Study 2 Feasibility Audit (F-1, F-2), Pass 1.5

**Kind:** bounded feasibility audit. **No production change, no harness, no confirmatory seed, no run of Study 2,
no commit, no push.**
**Author:** Chief Systems Engineer · **Date:** 2026-09-21 · **Baseline:** `a066d47` (Study 1 frozen, untouched).
**Seed usage:** only the registered development fixtures `896066:0`, `896066:1`, `896238:2`, `896329:3`,
regenerated deterministically from their config seeds. Census after the audit: `896066, 896238, 896329`.
**No agent was booted and no trajectory was executed.** All numbers below are static computations over
configuration `p`-vectors and the fixed topology.
**Labels:** FACT / CALCULATION / INFERENCE / OPEN QUESTION.

---

## F-1 — Geometry vs reliability disagreement: **PASS**

### F-1.1 The acceptance predicate already guarantees disagreement

**FACT.** `env.js:248`: `const R5 = r5.count >= 4;` and `env.js:203-204`:
`cfg.accepted = … && cfg.checks.R5 === true && …`.

**FACT.** `r5DecisionStateDiff(p, goal)` computes
`reliabilityOptimalPolicy(p, goal).policy` versus `hopOptimalPolicy(goal).policy`
and counts the decision states where the two first choices differ.

**INFERENCE (strong, structural).** Every **accepted** M7 configuration has, by construction, **at least 4
decision states where the reliability-optimal first move differs from the hop-optimal first move.** F-1 is
therefore not a property we have to hope for in a sample — it is enforced by the configuration filter. This is
the ERR-03/ERR-04 "decision relevance" criterion doing exactly the job OQ-1 needs.

### F-1.2 Measured on the four development fixtures

| Fixture | Goal | Accepted | Differing decision states (R5) | Differing nodes |
|---|---|---|---|---|
| 896066:0 | 8 | yes | **8 / 19** | 1, 6, 10, 12, 14, 15, 18, 20 |
| 896066:1 | 12 | yes | **11 / 19** | 1, 2, 3, 5, 6, 8, 10, 14, 15, 16, 20 |
| 896238:2 | 16 | yes | **8 / 19** | 2, 4, 6, 7, 8, 9, 14, 17 |
| 896329:3 | 19 | yes | **4 / 19** | 2, 7, 11, 18 |

**CALCULATION.** Disagreement spans **all four goals** (8, 12, 16, 19) and **all four fixtures**, ranging from
the R5 floor (4/19) to 11/19.

### F-1.3 Does disagreement survive candidate admission?

**CALCULATION.** The maximum hop distance from any node to any of the four goals is **4**. `canReachGoal` uses
`maxDepth = 4`, and the agent's known graph is a superset of the physical graph.
**INFERENCE:** on this topology **candidate admission prunes nothing**, so every disagreement state remains
scoreable. The P-2 limitation is **vacuous here** — worth recording, because Pass-1 listed it as a threat.

### F-1.4 Can V2.3 score the candidates where disagreement occurs?

**FACT.** `decisionStates(goal)` selects nodes with degree ≥ 2 that are not the goal, which is exactly where a
choice exists. **INFERENCE:** combined with F-1.3, every R5-differing state presents ≥ 2 admitted candidates to
V2.3.

### F-1.5 Do unreliable edges lie on relevant alternative paths?

**INFERENCE.** A differing first choice at state `u` means the expected-attempts-optimal successor is not the
hop-optimal one, which requires an unreliable edge on the hop-optimal route and a viable alternative. Acceptance
term R1 independently requires ≥ 2 distinct simple paths from ≥ 6 start nodes. Both hold for all four fixtures.

### F-1 verdict

**F-1 PASS.** Disagreement is guaranteed by the acceptance predicate, present on every fixture and every goal,
and unaffected by candidate admission.

**OPEN QUESTION (for seed planning, not a blocker):** fixture `896329:3` sits at the R5 floor (4/19). Study 2
should pre-register **stratification or a minimum R5 count**, because a floor-level configuration carries far
less information to detect (see F-2.4).

---

## F-2 — V2.3 rankability: **PASS structurally; empirical rankability NOT YET DECIDABLE STATICALLY**

### F-2.1 Theoretical range of `c_hat`

**CALCULATION.** `c_hat = (a+1)/(s+1)`, converging to `1/p`.
With `P_UNRELIABLE = [0.25, 0.45]` → `1/p ∈ [2.22, 4.00]`; `P_RELIABLE = [0.90, 1.00]` → `1/p ∈ [1.00, 1.11]`.
**Unreliable edges therefore cost up to ~4× a reliable edge.** Unobserved and all-success edges sit at exactly 1.

### F-2.2 Theoretical range of raw FutureScore, and whether `−d` swamps evidence

**CALCULATION.** With `H = 3`, a scored path contributes at most 3 edge costs plus a terminal `−d` with
`d ∈ [0, 4]`. Evidence can move a single edge's contribution by up to `4 − 1 = 3`, and a 3-edge path by up to 9,
against a maximum terminal spread of 4. **INFERENCE: the terminal does NOT overwhelm plausible learned
variation** — a single unreliable edge (cost ≈ 4) already outweighs one hop of geometric difference (1).

### F-2.3 Does the projection preserve ordering?

**FACT.** `P(FS) = B·S/(S − FS)` is strictly increasing in FS over finite values (verified 400-point sweep, V2.3
gate L7) with no cap. **INFERENCE:** candidate *ranking* is identical under raw FS and under `futureBonus`, so
rankability is a property of FS alone.

### F-2.4 Differentiation under idealised evidence (CALCULATION, not measurement)

Setting `c_hat = 1/p` exactly on every directed edge — i.e. **perfect learning**, achieved by seeding the
boundary record through its public writer — and scoring every admitted candidate at every decision state:

| Fixture | Goal | States with distinct FS (evidence) | States with distinct FS (geometry only) | Top choice changed | τ vs oracle, evidence | τ vs oracle, geometry | **Δ** |
|---|---|---|---|---|---|---|---|
| 896066:0 | 8 | **19/19** | 17/19 | 6/19 | 0.6842 | 0.5332 | **+0.1510** |
| 896066:1 | 12 | **19/19** | 18/19 | 9/19 | 0.6737 | 0.3217 | **+0.3520** |
| 896238:2 | 16 | **19/19** | 19/19 | 8/19 | 0.6702 | 0.4653 | **+0.2049** |
| 896329:3 | 19 | **19/19** | 18/19 | 6/19 | 0.3684 | 0.3489 | **+0.0195** |
| **mean** | | | | | **0.5991** | **0.4173** | **+0.1818** |

τ is Kendall tau-b between the mechanism's candidate ordering and the oracle ordering
`−(1/p(u,v) + C(v))`, with `C = expectedCostToGoal`. The oracle is **analysis-only** and never entered the
scored mechanism.

**CALCULATION, and the limits of what it shows.** Under perfect learning the mechanism (i) produces distinct FS
values at **19/19** decision states on every fixture, (ii) changes the top choice at **6–9 of 19** states, and
(iii) improves oracle concordance on **all four** fixtures. **This is theoretical rankability, not empirical
rankability** — `c_hat` was set to `1/p` by construction rather than learned from traversal outcomes.

**INFERENCE, important for seed planning:** `896329:3` — the R5-floor fixture — yields **Δ = +0.0195**, near
null even with perfect evidence. **Detectability varies strongly across configurations**, and a study drawing
configurations near the R5 floor could return an inconclusive result for reasons of configuration choice rather
than mechanism.

### F-2.5 Is the M40 saturation failure structurally removed?

**FACT.** M40-P1 recorded 372/372 candidates at the projection cap of 20, giving 0/76 rankable states.
**FACT.** V2.3 removed `Math.min(FS·4, 20)`; the replacement is injective over finite FS with no cap (gate L4/L7/L8).
**CALCULATION.** In F-2.4 the mechanism is rankable at 19/19 states per fixture.
**INFERENCE:** the specific M40 obstacle — cap saturation — is structurally removed.

### F-2 verdict

**F-2 PASS for structural/theoretical rankability**: the frozen mechanism *can* differentiate candidates and
*can* improve oracle concordance in this environment, with the projection preserving ordering and the M40 cap
obstacle gone.

**F-2 = NOT YET DECIDABLE STATICALLY for empirical rankability.** Nothing here shows that evidence *actually
learned during a run* approaches `1/p` closely enough to reproduce these effects. Two quantities are unknown and
cannot be derived from the repository:

1. **Per-edge visit counts** under the real policy — whether decision-relevant edges are attempted often enough
   for `c_hat` to move off the prior (Pass-1 requirement 5, still unverified).
2. **Realised `c_hat` versus `1/p`** — the estimator's actual convergence within `RUN_TICKS = 3000` and across
   the `T_SHIFT = 1500` regime change, where pre-shift evidence becomes wrong.

**Minimum future controlled feasibility run** (a *measurement*, not Study 2): a single arm on the development
fixtures, executing the normal V2.3 policy under M7, recording only per-edge `{a, s}` and realised `c_hat`
against `1/p` at checkpoints, plus the count of decision states whose candidates carry non-prior evidence.
No comparison, no arms, no oracle-concordance endpoint. It would answer whether learned evidence becomes
non-degenerate at all.

---

## Study 2 feasibility

**Scientifically feasible, conditional on the controlled feasibility run.** F-1 removes the environment-level
doubt entirely. F-2 shows the mechanism is capable in principle and leaves exactly one open empirical link:
whether learning actually populates `c_hat` during a run.

## What must be resolved before Pass 2

| # | Item | Type |
|---|---|---|
| 1 | Controlled feasibility run (F-2 empirical link) — dev fixtures only, measurement-only, separately authorized | blocking |
| 2 | Seed authorization: fresh registered range and count, pre-registered | blocking |
| 3 | R5 stratification rule — Study 2 should pre-register a minimum R5 count or stratify, given `896329:3`'s near-null Δ | blocking for interpretability |
| 4 | `T_SHIFT` policy: pre-shift, post-shift, or stratified evaluation | blocking |
| 5 | Anti-leakage static gate: the oracle must reach analysis only | blocking |
| 6 | Pre-registration of endpoint, τ statistic, state-inclusion rule, stopping rule, analysis hash | blocking |

**Not required:** any change to V2.3, `H`, the estimator, the projection, admission, `goalGradientBoost`, or the
M7 environment. Nothing in this audit motivates a redesign.
