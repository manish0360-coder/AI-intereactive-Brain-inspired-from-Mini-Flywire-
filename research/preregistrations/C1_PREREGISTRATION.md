# C1 Pre-Registration — Oracle-Alignment of the Candidate-Ranking Policy

**Version:** 1.0 — **DRAFT, FROZEN FOR REVIEW. NOT AUTHORISED FOR COLLECTION.**
**Milestone:** M15
**Date:** 2026-09-09
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-09-09 — *M15, frozen C1 preregistration draft*

**Inherits:**
`research/spec/CANDIDATE_ADMISSION_SPEC.md` (M13, `e12bb98`) · `C1_SUCCESSOR_FORMULATION_MEMO.md` (M14, `b825d1a`)
**Source baseline:** `0f47d7b` (M11 `canReachGoal` repair)

> **NO REGISTERED DATA HAS BEEN COLLECTED. NO REGISTERED SEED HAS BEEN CONSUMED.**
> This document defines a study. It does not report one.

---

## 1. Scientific question

> Does the `futureScore` mechanism causally change the **oracle-alignment of the
> candidate-ranking policy**?

**Construct name, frozen:** *oracle-alignment of the candidate-ranking policy.*

This construct must **never** be described as "planning quality", "cognitive improvement",
"reasoning ability", or any change in internal representation. It is a property of how the agent
*orders candidates* relative to an environment-defined optimum, and nothing more.

---

## 2. Primary estimand — E6

For arm `a ∈ {ARMED, ABLATED}`, decision state `u`, phase `p ∈ {1,2}`:

- `pool_a(u)` — the decision-time candidate pool (§3), with size `n_a(u) = |pool_a(u)|`
- `v*_p(u)` — the oracle-optimal action (§5)
- `r_a(u,p)` — the **rank** of `v*_p(u)` within `pool_a(u)` ordered by candidate weight
  **descending**, with **rank 0 meaning the oracle-optimal action is ranked first**

**Normalised rank (primary):**

```
ρ_a(u,p) = r_a(u,p) / (n_a(u) − 1)          defined only when n_a(u) ≥ 2
```

**State-level contrast:**

```
δ(u,p) = ρ_ARMED(u,p) − ρ_ABLATED(u,p)      over jointly defined u (§7)
```

**Per-configuration contrast (the preregistered outcome):**

```
Δ(c,p) = mean over jointly defined u of δ(u,p)
```

Lower `ρ` means the oracle-optimal action is ranked more highly. **A negative `Δ` therefore means
ARMED ranks the oracle-optimal action higher than ABLATED.** Direction is defined here so it cannot
be chosen after seeing data.

### 2.1 Why normalised rank is primary, and what it does not claim

Raw rank `r` is not comparable across states, because pool sizes differ (pilot: 1 to 10). Dividing
by `n − 1` maps rank onto `[0,1]`, where 0 is first and 1 is last, making states commensurable.

**Normalisation is NOT free of treatment dependence, and this document does not claim otherwise.**
`n_a(u)` is itself a function of the arm: the treatment changes the learned state, which changes
F1–F3 admission, which changes pool composition (pilot: pool membership differed between arms in
71 of 76 state-rows). `ρ` is therefore the **normalised total-effect outcome** — it measures the
effect of `futureScore`'s presence on the oracle's ranking position *within whatever pool that
presence produces*. That is the estimand. It is not a within-fixed-pool contrast, and must not be
described as one.

Raw `r` and `n` are **mandatory diagnostics** (§8) precisely so a reader can see how much of any
observed `Δ` co-occurs with pool-size change.

---

## 3. Decision-time candidate population

The E6 population is the pool that exists **at the point `bestChoice` is determined**, and nothing
else. The frozen pipeline (M13 §1.2–1.3):

```
candidate generation (main.js:1593–1604)
  → F1  penalties.get(currentKey+"->"+k) > 10        main.js:1610
  → F2  getQ(makeStateKey(currentKey,goal), k) < -0.5 main.js:1620
  → F3  !isGraphNeighbor && !isEpisodeTrained && !isHumanTrained  main.js:1673
  → F4  goalNeuronId !== null && !canReachGoal(k,goal)            main.js:1678
  → DECISION-TIME CANDIDATE POOL  = contents of `choices` at main.js:2373
  → bestChoice = sorted[0]                                        main.js:2378
```

**Operational definition:** `pool_a(u)` is the contents of `choices` immediately **before** the
in-place sort at `main.js:2373`.

**Exclusion, machine-checkable:** the loops at `main.js:2423` and `main.js:2453` push additional
candidates **after** `bestChoice` is fixed at `main.js:2378`. Those candidates **MUST NOT** enter
the E6 population. The verifier `experiments/m15/verify_prereg.js` asserts
`2373 < 2378 < 2423 < 2453` in the committed source and **fails** if that ordering changes, which
makes the exclusion a checkable property rather than a promise.

**F1–F4 parameters are frozen** exactly as specified in `CANDIDATE_ADMISSION_SPEC.md` and are not
modified by this study. The study is **conditioned on** those 17 parameters, 13 of which have no
rationale recoverable from the committed record.

---

## 4. Causal contrast

| Arm | Definition |
|---|---|
| **ARMED** | the committed runtime: `futureBonus` delivered as computed |
| **ABLATED** | `futureBonus` delivered as exactly `0` to every candidate |

The exposure applies **for the entire run**, not only at readout, so the two arms live two
different experiential histories. C1 is therefore the **total causal effect** of the mechanism's
continuous presence, not its instantaneous contribution at the moment of measurement.

**Causal estimand:** the average treatment effect on the normalised oracle-alignment rank.

**Statistical null (§10):** the population mean of the paired configuration-level `Δ` is zero.

**The trivial implementation null — "`futureScore` contributes nothing to the score" — is NOT the
null of this study.** Under a deterministic runtime that null makes both arms byte-identical, so
every difference statistic is exactly 0 with zero variance; it is a structural zero and is
trivially false, because `futureBonus` enters the score arithmetic. Rejecting it would establish
nothing. This study tests the directional null instead.

---

## 5. Oracle

`v*_p(u) = env.reliabilityOptimalPolicy(p_phase, goal).policy.get(u)`, which is derived from
`env.expectedCostToGoal` (Dijkstra with edge weight `1/p[edge]`), both already committed in
`experiments/m7/env.js`. **No oracle is invented, and no cost is invented for off-graph actions.**

Three quantities are kept strictly distinct and must never be conflated:

| Quantity | Meaning |
|---|---|
| **oracle-optimal action** `v*_p(u)` | environment-defined optimum; fixed before any run |
| **agent-selected action** `best_a(u)` | what the agent actually chose |
| **candidate-ranking position** `r_a(u,p)` | where the oracle-optimal action sits in the agent's ordering |

**E6 uses only the first and third.** It never requires a cost for the agent's chosen action, which
is what makes it immune to the off-graph problem described next.

**Declared substrate property.** In the M14 pilot, **44 of 76** chosen actions (58%) were not graph
edges, so `expectedCostToGoal` does not define a cost for them. This is a declared property of the
substrate. It is **not** grounds to invalidate E6 — E6 never evaluates the chosen action — but it
does disqualify chosen-action cost estimands, and it remains an unexplained substrate property.

---

## 6. Definedness, and the n = 1 case

`ρ_a(u,p)` is **defined** iff **both**:

1. **`n_a(u) ≥ 2`**, and
2. **`v*_p(u) ∈ pool_a(u)`**.

### 6.1 Why n = 1 is excluded rather than assigned a value

`ρ = r/(n−1)` is arithmetically undefined at `n = 1`, and **no convention such as `ρ = 0` is
adopted.** The reason is substantive, not arithmetic: E6 measures the oracle-optimal action's
*position among alternatives*. When the pool holds one candidate there are no alternatives, so
there is no ranking position to measure. Assigning `ρ = 0` would score a **forced** choice as
perfect alignment, and would do so asymmetrically whenever the two arms have different pool sizes —
importing a forced outcome into a ranking estimand.

`n = 1` is therefore a **definedness precondition**, and such states are excluded by §7 and counted
in the mandatory missingness table.

Pilot occurrence: `n = 1` arose in **1 of 76** state-rows, and in that row **both** arms had
`n = 1` simultaneously (896238:2, state 3 — the goal-16 case that M11's repair left with exactly one
admissible candidate). Its frequency in the registered block is unknown.

---

## 7. Missingness rule

**Pairwise deletion, on definedness only.** A state `u` contributes to `Δ(c,p)` iff `ρ` is defined
(§6) in **BOTH** arms.

The jointly-defined state set is determined **solely** by `n_a(u)` and `v*_p(u) ∈ pool_a(u)`. It
**never** consults `ρ`, `δ`, `Δ`, or any outcome magnitude. This is what keeps the inclusion rule
from being outcome-dependent.

**Mandatory per configuration and phase**, reported whatever the result:

| Field | Meaning |
|---|---|
| `statesTotal` | 19 |
| `jointlyDefined` | contributing states |
| `armedOnlyUndefined` | defined in ABLATED but not ARMED |
| `ablatedOnlyUndefined` | defined in ARMED but not ABLATED |
| `neitherDefined` | undefined in both |
| `excluded` | `statesTotal − jointlyDefined` |
| `n1Armed`, `n1Ablated` | states excluded specifically by the `n = 1` precondition |

### 7.1 Asymmetric missingness is NOT claimed to be impossible

The M14 pilot observed **zero** one-arm-only undefined cells (0 of 152), and all 3 undefined cells
were undefined in **both** arms. **That is an observation on four fixtures, not a proof of
structural impossibility.** `v*`'s survival through F1–F4 depends on learned state, which is
treatment-dependent, so asymmetric missingness is structurally possible.

**Monitoring, preregistered:** `armedOnlyUndefined` and `ablatedOnlyUndefined` are reported for
every configuration and summed study-wide. If the study-wide one-arm-only count is non-zero, the
final report **must** state that the jointly-defined population was shaped by the treatment and
must qualify the causal interpretation accordingly. This is a **disclosure requirement, not a
threshold**: no count triggers exclusion, adjustment, or reanalysis.

---

## 8. Mandatory secondary diagnostics

Reported for every configuration and phase; **none may be promoted to the primary outcome, and no
α is spent on any of them.**

1. raw rank `r_ARMED(u,p)`, `r_ABLATED(u,p)`
2. pool size `n_ARMED(u)`, `n_ABLATED(u)`
3. per-state E6 defined/undefined status
4. jointly defined cell count
5. ARMED-only defined cells
6. ABLATED-only defined cells
7. neither-defined cells
8. candidate-pool size distribution by arm
9. **E1 policy Hamming distance** (§9)

---

## 9. E1 — the wiring / exposure control

```
E1(c) = |{ u : best_ARMED(u) ≠ best_ABLATED(u) }|          integer 0…19
```

**Purpose:** to demonstrate that the exposure reached the measured object — that ARMED and ABLATED
policies differ at all. It is the analogue of UQ-B §12's ablated-wiring control.

**Validity condition:** a configuration with `E1(c) = 0` is marked **INVALID** and excluded from the
primary analysis, because the exposure produced no policy difference and its `Δ` carries no
information about the mechanism. This condition reads the *policy*, never `Δ`.

**E1 must NOT be interpreted** as evidence that `futureScore` improves planning, cognition, or
oracle-alignment. It shows only that the two arms differ. The phrase **"large causal effect" is
forbidden** unless and until a registered analysis establishes magnitude.

---

## 10. Unit of analysis, aggregation, and statistical design

### 10.1 Unit

**The configuration is the unit of inference.** The 19 states are **not** 19 independent
experimental units; they are the internal population from which one configuration-level outcome is
constructed. Phases 1 and 2 are analysed **separately and never pooled**.

### 10.2 State → configuration

`Δ(c,p) = mean over jointly defined u of δ(u,p)` — an unweighted mean, frozen. Unweighted because
each decision state is one element of the frozen 19-state population and no committed basis exists
for weighting them differently; inventing one would be inventing rationale.

### 10.3 Configuration → study

**Primary test (frozen): two-sided exact sign test** on the configuration-level `Δ(c,p)` values
against a null median of 0, run **separately per phase**.

- `α = 0.025` per phase (Bonferroni across the two phases; family-wise `α = 0.05`).
- Configurations with `Δ(c,p)` **exactly** 0 are dropped and `N` reduced, preregistered.

**Why the sign test is primary.** It assumes only that, under H0, the sign of each paired
difference is equally likely — no normality, no symmetry, no variance-homogeneity. This program has
now twice been damaged by instruments whose assumptions were never examined (C2's tie structure;
E2's treatment-dependent definedness). An assumption-light exact test removes distributional
assumption as a failure mode entirely, at a known cost in power.

**Secondary disclosure (no α, never primary):** Wilcoxon signed-rank on the same values, reported
alongside. It uses magnitude and is more powerful, but it assumes symmetry of the difference
distribution under H0, which this program has no committed basis to assert. It is therefore
reported, never relied upon.

**No other test may be added after data exist.** No p-value beyond these, no confidence intervals
on the primary, no effect-size model, no covariate adjustment, no subgroup analysis.

### 10.4 Hypotheses

- **H0:** the population mean (median, for the sign test) of `Δ(c,p)` is 0 — `futureScore`'s
  presence does not systematically change the oracle-alignment of the candidate-ranking policy.
- **H1 (two-sided):** it is not 0.

Two-sided deliberately: this program has no committed basis for predicting a direction, and
predicting one after UQ-B's recorded direction counts would be post-hoc.

---

## 11. Attainability gate — MANDATORY, PRE-COLLECTION

This gate exists because UQ-B's C2 was frozen with a rejection region that was **structurally
unreachable**, and D-011 did not catch it because it checked null *validity* and never *power*.

**The gate is evaluated on NON-REGISTERED fixtures BEFORE any registered seed is consumed.** If any
check fails, collection does not begin and the design returns to the Director. No result from this
gate may alter any definition above; it can only permit or block collection.

| # | Check | Pass condition |
|---|---|---|
| **A1** | **Rejection region non-empty** | With `N` valid configurations, the two-sided exact sign test at `α = 0.025` must have a non-empty rejection region. Minimum: `2·(1/2)^N ≤ 0.025`, i.e. **`N ≥ 7`**. The gate asserts the expected `N` clears this with margin. |
| **A2** | E6 definedness | jointly-defined states per configuration/phase recorded; the gate reports the rate and fails if **any** configuration/phase has fewer than **10 of 19** jointly defined (a majority of the frozen population) |
| **A3** | One-arm-only missingness | counted and reported; a non-zero count does not fail the gate but is escalated to the Director before collection |
| **A4** | `n = 1` incidence | counted and reported per arm |
| **A5** | Rank ties | weight ties within a pool counted; any tie requires a preregistered tie-break to be added **before** collection |
| **A6** | Attainable rank range | the observed set of `r` values must contain more than one distinct value |
| **A7** | Zero variance | `Δ` must not be identically 0 across fixtures |
| **A8** | Pool size | distribution reported per arm |
| **A9** | Structural degeneracy | the C2 check: it must be demonstrated that the primary test's rejection region can be reached by *some* attainable configuration of the data, not merely that the test is well-formed |
| **A10** | Null/alternative distinguishability | the instrument must produce non-zero `δ` at some states and zero at others, so it is neither inert nor saturated |
| **A11** | Determinism | independent processes reproduce every recorded value byte-identically |
| **A12** | Arm separation | ARMED and ABLATED run fingerprints must differ |

**No adaptive tuning after registered data.** Nothing in §2–§10 may be changed once collection
begins. Any change requires a numbered erratum before collection, on the UQ-B erratum model.

---

## 12. Seed governance

**Registered block for C1: `895000–895999`** (1000 seeds × 4 goal indices = 4000 candidates).

Justified against the existing frozen registry: it lies below every consumed range
(898000–898999 UQ-A, 899000–899499 Q1, 899500–899999 M8, 900000–900499 M7), below the spent UQ-B
block 897000–897999, below the 896000–896999 territory used for M9–M14 development and instrument
fixtures, and far below the held-out floor 900500. Registry check at draft time: **0 collisions**,
with **no seed evaluated** (`env.evaluatedSeeds()` empty).

- **897000–897999 is SPENT and must never be reused.**
- **895000–895999 is NOT consumed by M15.** No enumeration, no `makeConfig`, no run.
- Development and gate fixtures use **896xxx only**, never the registered block.
- The seed guard must be fail-closed in both directions, on the UQ-B `assertSeedAllowed` model:
  both a call-site flag and an environment authorisation are required before any registered seed is
  evaluated.
- **Governance recommendation (not part of this study):** `896000–896999` should be added to the
  committed `CONSUMED_RANGES` registry, since M9–M14 used it for fixtures and it is currently
  unrecorded.

---

## 13. Acceptance, stopping, and disposition

**Acceptance of a configuration** uses the committed `env.makeConfig` predicate (R1–R5, G11),
unchanged.

**Stopping rule:** the **complete** registered range is processed. There is no early exit, no
adaptive extension, no retry, and no stopping based on observed results. §12's range is not
extensible.

**Per-configuration dispositions:**

| Disposition | Meaning |
|---|---|
| `ACCEPTED` | accepted by `makeConfig`, both arms collected, `E1 ≥ 1`, `jointlyDefined ≥ 10` |
| `REJECTED` | not accepted by `makeConfig` |
| `INVALID` | `E1 = 0`, or `jointlyDefined < 10` |
| `FAILED` | a runtime fault prevented collection |

**Minimum evidence:** at least **20 valid configurations per phase**. Below that the study is
reported **INCONCLUSIVE — INSUFFICIENT MATERIAL**, and no test is interpreted. This is a reporting
threshold, never a collection target.

**Study-level outcomes:** `EFFECT DETECTED` (H0 rejected at the preregistered α, direction
reported), `NO EFFECT DETECTED` (H0 not rejected — explicitly **not** evidence of absence), or
`INCONCLUSIVE — INSUFFICIENT MATERIAL`.

---

## 14. Evidence / inference / hypothesis

### 14.1 Established evidence — what the M14 pilot actually demonstrated

On four accepted **non-registered** fixtures (896066:0, 896066:1, 896238:2, 896329:3), 152
decision-time pools:

- the captured pool's argmax equalled the independent probe's `bestChoice` in 76/76 cases
- 0 weight ties across all 152 pools; pool size min 1, median 6, max 10
- E6 defined for both arms in 149/152 cells; 0 one-arm-only; 3 neither-defined
- `n = 1` in 1 of 76 state-rows, symmetric across arms
- rank values spanned 0–9; non-zero per-state differences in 12–16 of 19 states
- results byte-identical across independent processes; arm fingerprints differed in 4/4 fixtures
- 44 of 76 chosen actions were not graph edges

**This is instrument-validation evidence only.**

### 14.2 Valid inference

E6 is measurable, high-resolution, tie-free, scale-invariant, oracle-grounded without invention,
and — unlike E2 and E4 — free of treatment-dependent *outcome* selection. C2's specific failure
mode cannot recur for a continuous paired statistic aggregated across configurations with a
non-empty exact rejection region.

### 14.3 Untested hypotheses — what C1 is designed to test

That `futureScore`'s presence systematically changes the oracle-alignment of the candidate-ranking
policy, i.e. that `E[Δ(c,p)] ≠ 0`.

**The M14 pilot is NOT causal evidence that `futureScore` improves oracle-alignment**, and its
per-configuration values were deliberately not reported as a result. Nothing in this document
asserts a cognitive claim, and no result of C1 may be reported as one without a separate authorised
interpretation milestone.

---

## 15. What this study cannot establish

It cannot establish that `futureScore` constitutes planning, improves cognition, or changes
internal representations. It measures one property — the ranking position of an
environment-defined optimal action within the agent's decision-time candidate pool — under one
substrate whose 17 admission parameters are declared rather than justified, on the post-M11
runtime. Results are **not comparable with UQ-B's**, which measured the pre-repair substrate.
