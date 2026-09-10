# C1 Pre-Registration — Descriptive Causal Study of Oracle-Alignment of the Candidate-Ranking Policy

**Version:** 2.0 — **DESCRIPTIVE REFORMULATION. FREEZE CANDIDATE. NOT AUTHORISED FOR COLLECTION.**
**Milestone:** M17
**Date:** 2026-09-10
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-09-10 — *M17, descriptive C1 reformulation*, following the
Gemini M16 HOLD.

**Supersedes:** v1.1 (M16, digest
`ff04df64b2ad73dfbbf03eb1a7e086c7259a97dd34c1ab236964e4a89d8f7219`, commit `49c91d5`) and v1.0
(M15, `b9520f83…`, commit `10ff372`). Neither was authorised for collection; both remain in git
history as the reviewed artifacts.

**Inherits:**
`research/spec/CANDIDATE_ADMISSION_SPEC.md` (M13, `e12bb98`) ·
`C1_SUCCESSOR_FORMULATION_MEMO.md` (M14, `b825d1a`)
**Source baseline:** `0f47d7b` (M11 `canReachGoal` repair)

> **NO REGISTERED DATA HAS BEEN COLLECTED. NO REGISTERED SEED HAS BEEN CONSUMED.**

---

## 0. What changed in v2.0, and why

v1.1 proposed a paired sign-flip permutation test against a symmetry null `H0_sym`. §10.3.2 of that
version already conceded, in writing, that **C1 contains no randomised treatment assignment**, that
determinism supplies reproducibility rather than exchangeability, and that `H0_sym` was therefore an
**assumption about a configuration population that the design does not sample from**.

An inferential frame resting on an assumption the design cannot support is not a frame. **v2.0
removes the inferential layer entirely** rather than continuing to carry it with disclaimers.

**Removed in full:** `H0_sym`, the sign-flip permutation test, the sign test, Wilcoxon, α, Bonferroni
and phase α-allocation, p-values (exact and Monte Carlo), the `N ≥ 7` rejection-region arithmetic,
the `EFFECT DETECTED` / `NO EFFECT DETECTED` dispositions, the 20-configuration minimum-evidence
rule, and every population-level inferential claim.

**Preserved unchanged:** the E6 estimand, the decision-time population and its machine-checked
ordering, the oracle, the `n ≥ 2` definedness rule, pairwise deletion, the mandatory diagnostics,
the E1 control, seed governance, and the M14 instrument-validation evidence.

**What replaces the inference** is stated in §4: the study is a **census**, so its quantities are
**exact measurements, not estimates**.

---

## 1. Scientific question

> Within the enumerated accepted configurations of registered block `895000–895999`, **what is the
> effect of the `futureScore` mechanism on the oracle-alignment of the candidate-ranking policy, and
> how is that effect distributed across configurations?**

This is a **descriptive causal** question. It asks *what the effect is, configuration by
configuration, and what its distribution looks like*. It does **not** ask whether an effect exists
in any population beyond the enumerated one, and no part of this study can answer that.

**Construct name, frozen:** *oracle-alignment of the candidate-ranking policy.*
It must **never** be called "planning quality", "cognitive improvement", "intelligence improvement",
or any change in internal representation.

---

## 2. Primary measured quantity — E6 (unchanged from v1.1)

For arm `a ∈ {ARMED, ABLATED}`, decision state `u`, phase `p ∈ {1,2}`:

- `pool_a(u)` — the decision-time candidate pool (§3), size `n_a(u)`
- `v*_p(u)` — the oracle-optimal action (§5)
- `r_a(u,p)` — the **rank** of `v*_p(u)` within `pool_a(u)` by candidate weight **descending**,
  with **rank 0 meaning the oracle-optimal action is ranked first**

```
ρ_a(u,p) = r_a(u,p) / (n_a(u) − 1)          defined only when n_a(u) ≥ 2
δ(u,p)   = ρ_ARMED(u,p) − ρ_ABLATED(u,p)    over jointly defined u (§7)
Δ(c,p)   = mean over jointly defined u of δ(u,p)
```

Lower `ρ` means the oracle-optimal action is ranked more highly. **A negative `Δ` therefore means
ARMED ranks the oracle-optimal action higher than ABLATED.** Direction is fixed here so it cannot be
chosen after seeing data.

### 2.1 Normalisation carries treatment dependence — unchanged and still declared

`n_a(u)` is itself a function of the arm: the treatment changes learned state, which changes F1–F3
admission, which changes pool composition (M14 pilot: pool membership differed between arms in 71 of
76 state-rows). `ρ` is therefore the **normalised total-effect outcome** — the effect of
`futureScore`'s presence on the oracle's ranking position *within whatever pool that presence
produces*. It is not a within-fixed-pool contrast and must not be described as one. Raw `r` and `n`
are mandatory diagnostics (§8) so a reader can see how much of any `Δ` co-occurs with pool-size
change.

---

## 3. Decision-time candidate population (unchanged from v1.1)

```
candidate generation (main.js:1593–1604)
  → F1  penalties.get(currentKey+"->"+k) > 10          main.js:1610
  → F2  getQ(makeStateKey(currentKey,goal), k) < -0.5  main.js:1620
  → F3  !isGraphNeighbor && !isEpisodeTrained && !isHumanTrained   main.js:1673
  → F4  goalNeuronId !== null && !canReachGoal(k,goal)             main.js:1678
  → DECISION-TIME CANDIDATE POOL = contents of `choices` at main.js:2373
  → bestChoice = sorted[0]                                         main.js:2378
```

**Operational definition:** `pool_a(u)` is the contents of `choices` immediately **before** the
in-place sort at `main.js:2373`.

**Exclusion, machine-checkable:** the loops at `main.js:2423` and `main.js:2453` push additional
candidates **after** `bestChoice` is fixed at `main.js:2378`. Those candidates **MUST NOT** enter
the E6 population. The M17 verifier asserts `2373 < 2378 < 2423 < 2453` in committed source and
**fails** if that ordering changes.

F1–F4 parameters are frozen per `CANDIDATE_ADMISSION_SPEC.md`; the study is **conditioned on** those
17 parameters, 13 of which have no rationale recoverable from the committed record.

---

## 4. Causal contrast, and why this is a census rather than a sample

| Arm | Definition |
|---|---|
| **ARMED** | the committed runtime: `futureBonus` delivered as computed |
| **ABLATED** | `futureBonus` delivered as exactly `0` to every candidate |

The exposure applies **for the entire run**, so the arms live two different experiential histories.
`Δ(c,p)` is the **total causal effect** of the mechanism's continuous presence for configuration
`c` in phase `p`.

### 4.1 Unit-level effects are measured exactly, not estimated

Three design facts, each established by earlier milestones rather than assumed here:

1. the runtime is **deterministic** (M11 and M14 reproduced runs byte-identically across
   independent processes);
2. **both arms are run on every accepted configuration** — nothing is assigned, sampled, or held
   back;
3. the registered block is **enumerated exhaustively** — all 1000 seeds × 4 goal indices, with no
   early exit and no adaptive extension (§13).

Therefore, for each configuration, `Δ(c,p)` is a **quantity computed exactly**, carrying no
sampling error, no estimation error, and no standard error. There is nothing for a confidence
interval to be about.

### 4.2 What that licenses, and what it does not

- **Licensed:** the set of accepted configurations of block `895000–895999` is a **census**. Its
  mean, median, quantiles and counts are **exact descriptions of that population**, not estimates
  of anything. The census mean of `Δ(c,p)` **is** the average treatment effect over that
  enumerated population, exactly.
- **Not licensed:** any statement about configurations outside the enumerated set. The block is a
  **deterministic enumeration, not a random sample from a defined superpopulation**, and this
  program has never defined such a superpopulation or a sampling frame over it. Without one there
  is no target of inference, and therefore no valid inferential procedure — which is precisely why
  v1.1's inferential layer is removed rather than repaired.

**No hypothesis is stated, tested, rejected, or failed to be rejected anywhere in this study.**

---

## 5. Oracle (unchanged from v1.1)

`v*_p(u) = env.reliabilityOptimalPolicy(p_phase, goal).policy.get(u)`, derived from
`env.expectedCostToGoal` (Dijkstra, edge weight `1/p[edge]`), both already committed in
`experiments/m7/env.js`. **No oracle is invented, and no cost is invented for off-graph actions.**

Kept strictly distinct: the **oracle-optimal action** `v*_p(u)`; the **agent-selected action**
`best_a(u)`; the **candidate-ranking position** `r_a(u,p)`. E6 uses only the first and third, which
is why it never needs a cost for the agent's chosen action.

**Declared substrate property:** in the M14 pilot, **44 of 76** chosen actions (58%) were not graph
edges. This disqualifies chosen-action cost estimands; it does **not** affect E6, and it remains an
unexplained substrate property rather than a C1 finding.

---

## 6. Definedness, and the n = 1 case (unchanged from v1.1)

`ρ_a(u,p)` is **defined** iff **both**: (1) `n_a(u) ≥ 2`, and (2) `v*_p(u) ∈ pool_a(u)`.

`ρ = r/(n−1)` is arithmetically undefined at `n = 1`, and **no convention such as `ρ = 0` is
adopted.** The reason is substantive: E6 measures an action's position *among alternatives*, and a
one-candidate pool has none. Assigning `ρ = 0` would score a **forced** choice as perfect alignment,
asymmetrically whenever the arms differ in pool size. `n = 1` is therefore a **definedness
precondition**; such states are excluded by §7 and counted in the mandatory tables (§8, §9.4).

Pilot occurrence: `n = 1` arose in 1 of 76 state-rows, with **both** arms at `n = 1` simultaneously
(896238:2, state 3 — the goal-16 case M11's repair left with exactly one admissible candidate). Its
frequency in the registered block is unknown.

---

## 7. Missingness rule (unchanged in mechanism; inferential gate removed)

**Pairwise deletion, on definedness only.** A state `u` contributes to `Δ(c,p)` iff `ρ` is defined
in **BOTH** arms. The jointly-defined set is determined **solely** by `n_a(u)` and
`v*_p(u) ∈ pool_a(u)`; it **never** consults `ρ`, `δ`, `Δ`, or any outcome magnitude.

Per configuration and phase, report `statesTotal` (19), `jointlyDefined`, `armedOnlyUndefined`,
`ablatedOnlyUndefined`, `neitherDefined`, `excluded`, `n1Armed`, `n1Ablated`, and

```
missing_A = 19 − |{u : ρ_ARMED(u,p) defined}|
missing_B = 19 − |{u : ρ_ABLATED(u,p) defined}|
asym      = |missing_A − missing_B|
```

**No `asym > k` exclusion threshold is adopted for any k ≥ 1**, for the reason given in v1.1: `asym`
is a count with no natural scale and no pre-data basis exists for choosing 1, 2 or 3.

**In v2.0 the `asym = 0` subset is no longer a "concordance test" — there is no test.** It becomes a
**stratified descriptive report** (§9.6): every descriptive summary in §9 is reported twice, once on
all valid configurations and once on the `asym = 0` stratum, side by side. If the two descriptions
differ materially, that difference is itself reported as a finding about differential definedness.
Nothing is excluded, adjudicated, or concluded from the comparison.

**Asymmetric missingness is NOT claimed to be impossible.** The pilot observed 0 one-arm-only cells
in 152, on four fixtures. That is an observation, not a proof: `v*`'s survival through F1–F4 depends
on learned state, which is treatment-dependent. Equal counts also do not imply equal missing *sets*
(§16.3).

---

## 8. Mandatory diagnostics (unchanged from v1.1)

Reported for every configuration and phase; **none may be promoted to a primary outcome**, and since
there is no inference, none carries any inferential status:

1. raw rank `r_ARMED(u,p)`, `r_ABLATED(u,p)`
2. pool size `n_ARMED(u)`, `n_ABLATED(u)`
3. per-state E6 defined/undefined status
4. jointly defined cell count
5. ARMED-only defined cells
6. ABLATED-only defined cells
7. neither-defined cells
8. candidate-pool size distribution by arm
9. **E1 policy Hamming distance** (§10)

---

## 9. THE PREREGISTERED DESCRIPTIVE ANALYSIS PLAN

Everything in this section is **descriptive**. No quantity here is an estimate, and none has a
p-value, α, confidence interval, standard error, or test statistic attached. All summaries are
computed **separately per phase** and **never pooled across phases**.

### 9.1 The primary reported object

> **The complete, per-configuration list of `Δ(c,p)` values, reported in full.**

Every configuration's value is published — no aggregation is permitted to replace the underlying
list. Aggregate summaries (§9.2) accompany the list; they never substitute for it.

### 9.2 Distributional summaries of `Δ(c,p)`, per phase

| Quantity | Definition |
|---|---|
| `N` | number of valid configurations entering the summary (§13) |
| mean | census mean of `Δ` — exactly the ATE over the enumerated population (§4.2) |
| median | census median |
| quantiles | min, p05, p10, p25, p50, p75, p90, p95, max |
| IQR | p75 − p25 |
| range | max − min |
| SD | census standard deviation, reported as a **descriptive spread of the census only** — never as a standard error and never used to form an interval |

### 9.3 Sign counts, per phase

| Count | Definition |
|---|---|
| `nNegative` | `#{c : Δ(c,p) < 0}` — ARMED ranks the oracle-optimal action **higher** |
| `nPositive` | `#{c : Δ(c,p) > 0}` — ABLATED ranks it higher |
| `nZero` | `#{c : Δ(c,p) = 0}` — exactly equal |

Reported as **counts and proportions of the census**. A proportion here describes the census; it is
**not** an estimate of any probability, and **must not** be compared to 0.5, tested, or described
using the word "significant".

### 9.4 Definedness and missingness reporting, per phase

Distribution of `jointlyDefined` (min, quartiles, max, full histogram); totals and per-configuration
values of `armedOnlyUndefined`, `ablatedOnlyUndefined`, `neitherDefined`; study-wide `n1Armed` /
`n1Ablated` counts; distribution of `asym`, including the exact count of configurations with
`asym = 0`.

### 9.5 Rank and pool-size diagnostics, per phase and per arm

Distribution of raw rank `r` (histogram over attainable ranks); distribution of pool size `n`;
count of `n = 1` occurrences; count of weight ties within pools (the M14 pilot observed 0 in 152
pools — a recurrence would matter and must be reported).

### 9.6 Mandatory stratified and sensitivity reporting

All of §9.2 and §9.3 are reported for each of the following strata, side by side with the full
census, **descriptively and with no exclusion, test, or adjudication**:

1. **all valid configurations** (the primary report);
2. the **`asym = 0`** stratum (symmetric definedness, §7);
3. the **stability curve**: summaries recomputed on `jointlyDefined ≥ k` for `k = 1, 5, 10, 15, 19`.

The primary report is always stratum 1. Strata 2 and 3 exist so a reader can see whether the
description depends on differentially-defined or sparsely-defined configurations, which an arbitrary
cutoff would have concealed rather than answered.

### 9.7 Mandatory visualisations

| # | Figure | Purpose |
|---|---|---|
| V1 | Histogram of `Δ(c,p)`, one panel per phase | shape of the effect distribution |
| V2 | ECDF of `Δ(c,p)` per phase, with a reference line at 0 | full distribution without binning choices |
| V3 | Per-configuration dot plot of `Δ`, sorted by value, every configuration shown | §9.1's "no aggregation hides a configuration" made visual |
| V4 | Scatter `Δ` vs `jointlyDefined` | the §9.6.3 sensitivity, shown not summarised |
| V5 | Scatter `Δ` vs `asym` | whether the effect co-varies with differential definedness |
| V6 | Paired scatter `ρ_ARMED(u,p)` vs `ρ_ABLATED(u,p)` at state level, with the identity line | where the state-level effect lives |
| V7 | Pool-size distribution by arm (overlaid histograms) | the treatment's effect on pool composition |
| V8 | Raw-rank distribution by arm | resolution actually attained |

Figures carry **no fitted lines, no trend estimates, no error bars, no confidence bands, and no
significance annotation**. V4 and V5 are scatter plots only; a regression line would be an
inferential claim.

### 9.8 E1 reporting

Distribution of `E1(c)` across configurations, and the count with `E1 = 0`. E1 is a validity control
(§10), never an outcome.

---

## 10. E1 — the wiring / exposure control (unchanged in role)

```
E1(c) = |{ u : best_ARMED(u) ≠ best_ABLATED(u) }|          integer 0…19
```

**Purpose:** to demonstrate the exposure reached the measured object — that the arms' policies
differ at all. A configuration with `E1(c) = 0` is marked **INVALID** and excluded from the
descriptive summaries, because the exposure produced no policy difference. This condition reads the
*policy*, never `Δ`.

**E1 must NOT be interpreted** as evidence that `futureScore` improves planning, cognition, or
oracle-alignment. It shows only that the arms differ. The phrase **"large causal effect" is
forbidden**, in this document and in any report of this study.

---

## 11. Unit of analysis

**The configuration is the unit.** The 19 states are **not** independent units; they are the
internal population from which one configuration-level value is constructed by the unweighted mean
in §2. The mean is unweighted because each state is one element of the frozen 19-state population
and no committed basis exists for weighting them differently.

Phases 1 and 2 are reported **separately and never pooled**. With no tests, there is **no
multiplicity problem and therefore no α to allocate and no correction to apply** — the v1.1
Bonferroni scheme is removed along with the tests it corrected.

---

## 12. Instrument-adequacy gate — MANDATORY, PRE-COLLECTION

v1.1's gate checked, among other things, that a rejection region was non-empty. **With no test,
that check is meaningless and is removed.** The gate's remaining purpose is unchanged and still
essential: to establish **before any registered seed is consumed** that the instrument produces a
non-degenerate description.

Evaluated on **non-registered fixtures only**. If any check fails, collection does not begin and the
design returns to the Director. No gate result may alter any definition above.

| # | Check | Pass condition |
|---|---|---|
| **A1** | Non-degenerate spread | `Δ` is not identically 0 across fixtures; the observed range is non-zero |
| **A2** | E6 definedness | jointly-defined counts recorded per fixture/phase; the distribution is reported. **No minimum is imposed** |
| **A3** | Asymmetric missingness | `missing_A`, `missing_B`, `asym` recorded; size of the `asym = 0` stratum reported; a non-zero `asym` count is escalated to the Director before collection |
| **A4** | `n = 1` incidence | counted per arm |
| **A5** | Rank ties | weight ties within pools counted; any tie requires a preregistered tie-break added **before** collection |
| **A6** | Attainable rank range | more than one distinct `r` value observed |
| **A7** | Pool-size behaviour | distribution reported per arm |
| **A8** | Structural degeneracy | the instrument must not be inert (all `δ = 0`) nor saturated (all `δ` at an extreme) |
| **A9** | Treatment-dependent definedness | the rate at which definedness differs by arm is measured and reported |
| **A10** | Determinism | independent processes reproduce every recorded value byte-identically |
| **A11** | Arm separation | ARMED and ABLATED run fingerprints differ |

**No adaptive tuning after registered data.** Nothing in §1–§11 may change once collection begins.
Any change requires a numbered erratum **before** collection.

---

## 13. Acceptance, stopping, and disposition

**Acceptance** uses the committed `env.makeConfig` predicate (R1–R5, G11), unchanged.

**Stopping rule:** the **complete** registered range is processed. No early exit, no adaptive
extension, no retry, and no stopping based on observed results. The range is not extensible.

**Configuration validity — derived, not selected.** `Δ(c,p) = mean over jointly defined u` is
undefined when that set is empty (`0/0`). Therefore **`jointlyDefined ≥ 1`** is the validity rule,
derived from the estimator and from nothing else.

| Disposition | Meaning |
|---|---|
| `ACCEPTED` | accepted by `makeConfig`, both arms collected, `E1 ≥ 1`, `jointlyDefined ≥ 1` |
| `REJECTED` | not accepted by `makeConfig` |
| `INVALID` | `E1 = 0`, or `jointlyDefined = 0` (`Δ` undefined) |
| `FAILED` | a runtime fault prevented collection |

**The 20-configuration minimum-evidence rule is removed.** It existed to support inference, and
with no inference it has no basis; retaining a number whose only justification was statistical power
would repeat the defect M16 corrected in Repair 2. A census of any size is describable. The single
derived requirement is `N ≥ 1` — an empty census has nothing to describe — and `N` is reported
prominently in every summary so a reader can judge the material for themselves.

**Study outcome** is a **description**, not a verdict. The report presents §9's distributions,
counts and figures. There is no `EFFECT DETECTED`, no `NO EFFECT DETECTED`, and no
`INCONCLUSIVE` — those were dispositions of a hypothesis test that no longer exists. The only
non-descriptive outcome is `NO MATERIAL` (`N = 0`), meaning the block yielded nothing to describe.

---

## 14. Seed governance (unchanged from v1.1)

**Registered block: `895000–895999`** (1000 seeds × 4 goal indices = 4000 candidates). Verified
against the committed registry: below every consumed range (898000–898999 UQ-A, 899000–899499 Q1,
899500–899999 M8, 900000–900499 M7), below the spent UQ-B block 897000–897999, below the
896000–896999 territory used for M9–M17 development fixtures, and far below the held-out floor
900500. **0 collisions**, with **no seed evaluated**.

- **897000–897999 is SPENT and must never be reused.**
- **`895000–895999` is NOT consumed by M17.** No enumeration, no `makeConfig`, no run.
- Development and gate fixtures use **896xxx only**.
- The seed guard must be fail-closed in both directions on the UQ-B `assertSeedAllowed` model.
- **Governance recommendation (not part of this study):** `896000–896999` should be added to the
  committed `CONSUMED_RANGES` registry. It remains a separate administrative issue.

---

## 15. ALLOWED AND FORBIDDEN CONCLUSIONS

This section is binding on every report of this study.

### 15.1 Allowed

1. "Across the `N` accepted configurations of block `895000–895999`, `Δ(c,p)` had census mean *m*,
   median *q50*, and IQR *[q25, q75]*." — exact descriptions of the census.
2. "`nNegative` of `N` configurations had `Δ < 0`; `nPositive` had `Δ > 0`; `nZero` had `Δ = 0`."
3. "For configuration `c`, removing `futureScore` changed the normalised oracle-alignment rank by
   `Δ(c,p)`." — a **unit-level causal statement**, licensed because both arms were run on that
   configuration under a deterministic runtime (§4.1).
4. "The census mean of `Δ` over the enumerated accepted configurations of this block is *m*." —
   licensed because the census mean **is** the ATE over that population, exactly.
5. Descriptions of shape, spread, skew, outliers and stratum differences, phrased as descriptions.
6. Statements that a quantity was **not** measured, or that a question is **not** answerable by this
   design.

### 15.2 Forbidden

1. **Any inferential claim**: p-values, α, significance, confidence or credible intervals, standard
   errors, hypothesis tests, power, or the words "significant", "reject", "fail to reject", "null
   hypothesis".
2. **Any generalisation beyond the enumerated configurations** — to other seed blocks, to
   "configurations in general", to the agent overall, or to other tasks, environments, or
   architectures.
3. **Any claim that an effect does or does not exist** in a population. The study measures a census;
   absence of a large census mean is not evidence of no effect anywhere.
4. **Any cognitive or representational claim**: that `futureScore` constitutes planning, improves
   cognition, reasoning, intelligence or internal representations, or that the agent "plans".
5. **Any comparison with UQ-B's results.** UQ-B measured the **pre-M11-repair** substrate; M11
   established the substrates differ materially. The two are not comparable and must not be
   juxtaposed as though they were.
6. **Any causal claim about mechanism** — *why* `futureScore` changes the ranking. The study
   measures *that* it does, per configuration, and by how much.
7. **Promotion of any diagnostic** (raw `r`, `n`, `E1`, missingness) to an outcome.
8. **Any post-hoc analysis** not specified in §9, including fitted trends on V4/V5, subgroup
   comparisons, or re-stratification chosen after seeing the data.

### 15.3 Required phrasing

The report must state, verbatim and prominently:

> "This is a descriptive census of the accepted configurations of one registered seed block. It
> reports exactly measured per-configuration causal effects and their distribution. It performs no
> statistical inference and licenses no generalisation beyond the configurations enumerated."

---

## 16. Residual limitations, declared

1. **No generalisation.** The block is a deterministic enumeration, not a random sample from a
   defined superpopulation, and no sampling frame exists. This is the reason the inferential layer
   was removed, and it is a permanent limitation of the design, not a temporary gap.
2. **Normalisation carries treatment dependence.** `n_a(u)` is arm-affected (§2.1); `ρ` is a
   normalised total-effect outcome.
3. **Equal missingness counts do not imply equal missing sets.** The `asym = 0` stratum controls the
   *count* of differentially-defined states, not *which* states they are. Two arms can each lose two
   states and lose different ones. No rule here controls that residual.
4. **The substrate is declared, not justified.** 13 of 17 candidate-admission parameters have no
   rationale recoverable from the committed record (M13).
5. **Off-graph actions are unexplained.** 58% of chosen actions in the pilot were not graph edges.
   E6 is unaffected, but the property is undiagnosed.
6. **One block only.** Whether the description would look similar in another block is unknown and
   unanswerable from this study.

---

## 17. Evidence / inference / hypothesis

### 17.1 Established evidence — what the M14 pilot demonstrated

On four accepted **non-registered** fixtures, 152 decision-time pools: captured-pool argmax matched
the independent probe's `bestChoice` in 76/76; **0 weight ties** across 152 pools; pool size min 1,
median 6, max 10; E6 defined for both arms in **149/152** cells with **0 one-arm-only** and 3
neither-defined; `n = 1` in 1 of 76 state-rows, symmetric across arms; ranks spanned 0–9 with
non-zero per-state differences in 12–16 of 19 states; results byte-identical across independent
processes; arm fingerprints differed in 4/4 fixtures; 44/76 chosen actions were not graph edges.

**This is instrument-validation evidence only.**

### 17.2 Valid inference

E6 is measurable, high-resolution, tie-free, scale-invariant, oracle-grounded without invention, and
free of treatment-dependent *outcome* selection. Under determinism with both arms run and the block
exhaustively enumerated, per-configuration effects are exact and the census summaries are exact
descriptions rather than estimates.

### 17.3 Untested hypotheses — and they remain untested by design

That `futureScore` has a systematic effect on oracle-alignment **in any population beyond the
enumerated configurations** remains untested. **C1 as reformulated does not test it and cannot.**
Answering it would require a defined superpopulation and a sampling frame over it — neither of which
this program has established. That is a prerequisite for any future inferential milestone, not a
defect of this one.

**The M14 pilot is NOT causal evidence that `futureScore` improves oracle-alignment**, and its
per-configuration values were deliberately never reported as a result.

---

## 18. What this study cannot establish

It cannot establish that `futureScore` constitutes planning, improves cognition, or changes internal
representations; nor that any effect generalises beyond the enumerated configurations of one block.
It measures one property — the ranking position of an environment-defined optimal action within the
agent's decision-time candidate pool — under one substrate whose 17 admission parameters are
declared rather than justified, on the post-M11 runtime.
