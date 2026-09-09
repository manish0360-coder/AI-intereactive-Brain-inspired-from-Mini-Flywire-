# C1 Successor — Formulation Memo (M14)

**Status:** FORMULATION ONLY — not a preregistration, not an implementation
**Milestone:** M14
**Date:** 2026-09-09
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-09-09 — *M14, C1 successor formulation memo*

**Substrate:** `research/spec/CANDIDATE_ADMISSION_SPEC.md` (M13, `e12bb98`)
**Source baseline:** `0f47d7b` (M11 repair) · **De-risking evidence:** `experiments/m14/m14_attainability.json`

> **SCOPE BOUNDARY, STATED FIRST.** This memo may establish only that **an instrument is
> measurable**. It does **not** claim that `futureScore` has a demonstrated causal effect, and
> nothing in §6–§7 is evidence about `futureScore`. Every number here comes from four
> non-registered fixtures used to test the *instrument*, not the mechanism.

---

## 1. Problem statement

UQ-B's C2 discriminator could not reject in any configuration. A successor is needed that can
detect whether `futureScore` changes the **actual greedy policy**, at resolution sufficient to
avoid a repeat of that structural failure.

The measurement target is the greedy decision `bestChoice`, computed at `main.js:2378` over the
**decision-time candidate pool** — and nothing else.

---

## 2. Lessons from UQ-B C2

| Failure | Mechanism | Requirement it imposes on the successor |
|---|---|---|
| Rejection unattainable in 0/71 configurations, both phases | The statistic `A` was an integer count over 19 states; redistribution moved it by 0 or 1, so ties dominated (median **19 of 19** shuffles tied) and strict `>` could never hold | The statistic must be **high-resolution and tie-free**, and its **attainable rejection region must be demonstrated before freezing** |
| Nominal α = 0.05 was never in force | Realised level collapsed to ≈ 0 on a coarse discrete statistic | Level must be attainable for the *actual* statistic, not assumed from the test's form |
| The null probed a near-null component | Redistribution changed the policy at **0 states in 73% of shuffles**, while ablation changed it at a median of **15/19** | The estimand must probe the component that **carries the effect** — the causal contrast, not the redistribution |
| C1 existed but was unusable | §13 forbade cross-configuration aggregation, so no study-level inference was licensed | The successor must **preregister its aggregation rule** |

The lesson D-011 did not catch: **null validity was checked; attainability was not.**

---

## 3. Decision-time population — exact definition

For a decision at state `u` with goal `g`:

```
pool(u) = { k ∈ allCandidates(u) : ¬F1(k) ∧ ¬F2(k) ∧ ¬F3(k) ∧ ¬F4(k) }
```

where `allCandidates(u) = keys(transitions.get(u)) ∪ neighbours(u)` (`main.js:1593–1604`) and F1–F4
are the filters frozen in M13 §1.2. Operationally, `pool(u)` is the contents of `choices` at
`main.js:2373`, immediately before the in-place sort.

**This is the only admissible population.** The loops at `main.js:2423` and `:2453` push further
candidates *after* `bestChoice` is fixed at `:2378`; anything measured downstream of `:2497` is a
different set (M13 §1.3, independently confirmed in Gemini's M13 review §2).

**Measured properties** (152 pools, 4 fixtures × 2 arms × 19 states):

- pool size: **min 1, median 6, max 10**
- **weight ties: 0 across all 152 pools** — scores are continuous floats
- pool *membership* differs between arms in **71/76** state-rows

---

## 4–5. Candidate estimand comparison and definitions

Let `A` = ARMED, `B` = ABLATED. `w_a(u,k)` is candidate `k`'s weight in arm `a` at state `u`;
`best_a(u) = argmax_k w_a(u,k)`; `v*_p(u)` is the reliability-optimal action from
`env.reliabilityOptimalPolicy(p, goal)`; `n_a(u) = |pool_a(u)|`.

### E1 — policy-change Hamming
`H(c) = |{ u : best_A(u) ≠ best_B(u) }|`, integer 0…19.

### E2 — continuous regret difference
`regret_a(u,p) = [1/p_e(u,best_a) + C_p(best_a)] − min_v [1/p_e(u,v) + C_p(v)]`, with
`C_p = env.expectedCostToGoal(p, goal)`. `Δ_E2(c,p) = mean_u regret_A − mean_u regret_B`.

### E3 — rank displacement of the chosen action
`rank of best_A(u) within pool_B(u)` ordered by weight.

### E4 — oracle-alignment count difference (UQ-B's C1 form)
`Δ_E4(c,p) = |{u : best_A(u)=v*_p(u)}| − |{u : best_B(u)=v*_p(u)}|`, integer −19…+19.

### E5 — score margin
`margin_a(u) = w_a(best) − w_a(second)`.

### E6 — normalised rank of the oracle-optimal action *(recommended)*
```
r_a(u,p) = rank of v*_p(u) within pool_a(u), ordered by weight descending   (0 = agent's own pick)
ρ_a(u,p) = r_a(u,p) / (n_a(u) − 1)     if n_a(u) > 1, else 0
Δ_E6(c,p) = mean_u [ ρ_A(u,p) − ρ_B(u,p) ]
```
Lower `ρ` = the agent ranks the oracle-optimal action more highly.

### Comparison against the 15 required attributes

| # | Attribute | E1 | E2 | E3 | E4 | E5 | **E6** |
|---|---|---|---|---|---|---|---|
| 1 | Definition | exact | exact | exact | exact | exact | exact |
| 2 | Unit of analysis | configuration | config × phase | configuration | config × phase | configuration | config × phase |
| 3 | Observable inputs | `best` both arms | `best` + oracle cost | pools + `best` | `best` + oracle | pool weights | pool weights + oracle |
| 4 | Candidate population | decision-time | decision-time | decision-time | decision-time | decision-time | decision-time |
| 5 | Measures actual `bestChoice`? | yes | yes | yes | yes | yes | **indirectly — measures the pool ordering that produces it** |
| 6 | Causal interpretation | total effect on the argmax | confounded (see below) | partly confounded | confounded | none | total effect on oracle-ranking |
| 7 | Resolution | 20 levels | continuous but sparse | ranks 0–7 | 39 levels, floor-compressed | continuous | **ranks 0–9, normalised continuous** |
| 8 | Degeneracy | null is a structural zero | **defined for both arms in only 32/76** | undefined in 19/76 | floor: 2–7 of 19 aligned | none | **undefined in 3/152** |
| 9 | Ceiling/floor | 12–15 of 19 observed | — | — | **floor-compressed** | — | none observed |
| 10 | Tie sensitivity | none (argmax) | none | none (0 ties) | none | none | **none (0 ties in 152 pools)** |
| 11 | Arbitrary scaling | none | none | none | none | **fully scale-dependent** | **none (rank-based)** |
| 12 | Downstream dependence | none | none | none | none | none | none |
| 13 | ARMED/ABLATED compatible | yes | yes | yes | yes | yes | yes |
| 14 | Requires a new oracle? | **no** | no (uses committed `expectedCostToGoal`) | no | no | no | **no (uses committed `reliabilityOptimalPolicy`)** |
| 15 | Evaluable without changing production? | yes | yes | yes | yes | yes | **yes (one guarded read-only capture)** |

---

## 6. Attainability analysis

Four accepted non-registered fixtures, one per goal (896066:0, 896066:1, 896238:2, 896329:3),
ARMED and ABLATED, 3000 ticks, all 19 decision states.

**Instrument validity.** The argmax derived from the captured pool matched the independent probe's
`bestChoice` in **76/76** cases, so the snapshot is the set the decision was actually taken over.
Results are **byte-identical across independent processes**. Run fingerprints differ between arms
in **4/4** fixtures, so the two arms are genuinely separated.

**Definedness — the discriminating criterion:**

| Estimand | Defined for BOTH arms | Defined for ONE arm only | Neither |
|---|---|---|---|
| E2 (regret) | **32/76 (42%)** | **27** | 17 |
| E6 (oracle rank) | **149/152 (98%)** | **0** | 3 |

**Attainable range and non-degeneracy for E6:** ranks span **0–9**; per configuration/phase
**n = 17–19 of 19** states contribute; non-zero per-state differences occur in **12–16 of 19**.

**E1** is always defined and observed at **12–15 of 19** — far from both floor and ceiling.

> The per-configuration Δ values produced by this run are deliberately **not** reported as a
> result. They come from four fixtures chosen to exercise the instrument, and treating them as
> evidence about `futureScore` is exactly the error this memo exists to prevent.

---

## 7. Discriminability analysis

**Null side.** Under the sharp null *"`futureScore` contributes nothing to any decision"*, the
runtime is deterministic, so ARMED and ABLATED runs are byte-identical and **every** difference
statistic is exactly 0 with zero variance. This is a **structural zero** in the sense established
in UQ-A: the null value is 0 as a matter of mechanism, not of sampling.

That makes any difference estimand threshold-free against the sharp null — but the sharp null is
**trivially false**, because `futureBonus` enters the score arithmetic. Refuting it establishes
nothing of interest. **This is the single most important design point in this memo:** the
successor must not be built around the sharp null.

**Plausible-alternative side.** The useful null is directional:
`H0: E[Δ_E6(c,p)] = 0` — `futureScore` does not systematically change how highly the agent ranks
the oracle-optimal action. Individual `Δ` values are non-zero under this null; only their mean is
zero. This null **requires a test**, has a non-degenerate sampling distribution, and cannot become
structurally unrejectable the way C2 did, because `Δ_E6` is continuous and tie-free.

**Why C2's failure cannot recur here.** C2 failed because its rejection region required a strict
maximum over 20 draws of a coarse integer, and ties made that unattainable. `Δ_E6` is a
**per-configuration continuous quantity** aggregated across ~70 configurations; there is no
per-unit permutation maximum, no tie-breaking requirement, and no discrete rejection region.

---

## 8. Structural failure-mode analysis

| Mode | Affected | Status |
|---|---|---|
| **Treatment-dependent outcome selection** — which states are measurable depends on the arm | **E2, E4** | **FATAL.** 58% of chosen actions are not graph edges, so the oracle cost is undefined for them; 27/76 rows are defined for one arm only. This is the arrival-selection confound identified in UQ-A. |
| Undefined statistic | E3 (19/76), E2 | Disqualifying for a primary estimand |
| Floor compression | E4 (2–7 of 19 aligned) | Reduces resolution |
| Arbitrary scaling | E5 | Not interpretable across configurations |
| Trivial null | E1 | Usable only as a control, not as the estimand |
| **Pool-size dependence** | **E6** | **Residual, not fatal** — see §13 |
| Ties | none | 0 ties observed across 152 pools |

---

## 9. Recommended successor estimand

> **E6 — the normalised rank of the oracle-optimal action within the decision-time pool,
> contrasted ARMED vs ABLATED, per configuration per phase.**

Recommended **because of its structure, not its numbers**:

1. **It does not depend on what the agent chose.** `v*` is fixed by the environment before any run,
   so the outcome cannot be selected by the treatment through the agent's own decision — the flaw
   that disqualifies E2 and E4.
2. **It uses an existing committed oracle** (`env.reliabilityOptimalPolicy`). No oracle is invented.
3. **It is rank-based**, hence invariant to the arbitrary scale of `futureBonus` — which matters
   because `futureBonus` is clamped by `Math.min(imaginedFuture * 4, 20)`, an arbitrary scaling.
4. **It reads the whole pool**, so resolution scales with pool size (median 6) instead of collapsing
   to one bit per state.
5. **It measures the decision-time population exactly**, per M13 §1.3.

**E1 is retained as a mandatory wiring/attainability control**, playing the role UQ-B §12's
ablated-wiring control played: if `H(c) = 0` for a configuration, the exposure did not reach the
measured object and that configuration's E6 value carries no information.

---

## 10. Why the alternatives were rejected

- **E2 (continuous regret)** — rejected on **treatment-dependent definedness**: defined for both
  arms in only 32/76 rows, one arm only in 27. Repairing it by restricting to jointly-defined
  states would select the population using the treatment, which is precisely the confound UQ-A
  ruled out. Extending the oracle to non-graph actions would require inventing cost semantics for
  learned shortcuts — forbidden.
- **E4 (alignment count)** — the estimand UQ-B used. Same off-graph problem, plus floor compression
  (2–7 of 19) and only 39 discrete levels. Not a resolution improvement.
- **E3 (chosen-action rank displacement)** — undefined in 19/76 rows because the ARMED pick is not
  always in the ABLATED pool; definedness again depends on the treatment.
- **E5 (score margin)** — fully scale-dependent (observed means 60–93 in arbitrary units), not
  comparable across configurations, no oracle grounding.
- **E1 (Hamming)** as primary — its sharp null is a structural zero and trivially false, so
  rejecting it would establish nothing. Kept as a control.

---

## 11. Proposed null and alternative

- **H0:** `E[Δ_E6(c,p)] = 0` — `futureScore`'s presence does not systematically change how highly
  the agent ranks the oracle-optimal action within its decision-time pool.
- **H1 (two-sided):** `E[Δ_E6(c,p)] ≠ 0`.

Two-sided deliberately: this program has no committed basis for predicting a direction, and
predicting one after UQ-B's direction counts would be post-hoc.

---

## 12. Proposed unit of analysis

**The configuration**, with phases 1 and 2 analysed **separately and never pooled** (UQ-B §10's
discipline, which was sound and is not implicated in the C2 failure).

`Δ_E6(c,p)` is one real number per configuration per phase, computed as a mean over that
configuration's defined states.

**On statistical design:** per the ruling, no test, α, or aggregation rule is chosen here. The
measurement object is now established as a *continuous, paired, per-configuration real value with
no ties*. What logically follows is a **paired location test on that per-configuration difference,
with a preregistered α and a preregistered handling rule for undefined states** — but the specific
test must be chosen only after its distributional properties are examined on non-registered
fixtures, which is a prerequisite (§14), not a decision taken here.

---

## 13. Unresolved questions

1. **Pool-size dependence of the normalisation.** `ρ = r/(n−1)` mixes rank position with pool size,
   and pool membership differs between arms in **71/76** rows. Those differences are part of the
   total causal effect, not a measurement artifact — but whether the primary estimand should use
   normalised `ρ` or raw rank `r` is **undecided** and must be fixed before freezing.
2. **The 3/152 undefined cells.** Observed symmetric (never one-arm-only), but symmetry is not
   structurally guaranteed, since `v*`'s survival through F1–F4 depends on learned state. A
   preregistration must specify the handling rule *in advance*.
3. **Whether ranking the oracle-optimal action is the right notion of "planning."** E6 measures
   goal-relevant *ordering quality*, not goal *achievement*. That is a scientific choice the
   Director should make explicitly.
4. **Off-graph actions.** 58% of chosen actions are not graph edges. E6 sidesteps this, but it
   remains an unexplained property of the substrate and may deserve its own milestone.
5. **Sample size.** ~70 usable configurations are expected from a registered block, but the power of
   any chosen test against a plausible effect size has not been examined.

---

## 14. Explicit prerequisites for a C1 preregistration

1. Director decision on §13.1 (normalised vs raw rank) and §13.3 (is E6 the right notion).
2. A **distributional pilot** on non-registered fixtures — more than four — characterising
   `Δ_E6`'s spread and shape, sufficient to choose a test rather than assume one.
3. An **attainability gate**, stated in the preregistration and evaluated before collection: the
   chosen test's rejection region must be demonstrably reachable for the observed statistic. This
   is the D-011 repair and is mandatory.
4. A preregistered **undefined-state handling rule** (§13.2).
5. A preregistered **aggregation rule, test and α**.
6. A fresh **registered seed block** — 897000–897999 is consumed and must not be reused.
7. The **E1 wiring control** specified as a mandatory per-configuration validity condition.
8. Explicit statement that the study is conditioned on the **13 Class-D parameters** of
   `CANDIDATE_ADMISSION_SPEC.md` that have no recoverable rationale.
9. Explicit statement that results are measured on the **post-M11 substrate** and are therefore not
   comparable with UQ-B's.

---

## 15. Evidence / inference / hypothesis

**Evidence.** 152 decision-time pools; 0 weight ties; pool size min 1 / median 6 / max 10; probe
cross-check 76/76; determinism byte-identical; arm fingerprints differ 4/4; pool membership differs
71/76; 44/76 chosen actions are not graph edges; E2 both-arm definedness 32/76 with 27 one-arm-only;
E6 both-arm definedness 149/152 with **0** one-arm-only; E6 ranks span 0–9 with 12–16 of 19 non-zero
per-state differences; E1 observed 12–15 of 19.

**Inference.** E6 is the only compared estimand that is simultaneously high-resolution, tie-free,
scale-invariant, oracle-grounded without invention, and free of treatment-dependent outcome
selection. C2's specific failure mode cannot recur for a continuous paired statistic aggregated
across configurations.

**Hypothesis (untested).** That `Δ_E6` has a non-zero systematic mean. **Nothing in this memo tests
that**, and the fixture values reported here are instrument diagnostics, not evidence.

**No cognitive claim is made.** This memo establishes that an instrument is measurable. It does not
establish that `futureScore` has a causal effect on cognition, representation, or planning.
