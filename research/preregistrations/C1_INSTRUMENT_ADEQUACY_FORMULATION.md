# C1 Instrument-Adequacy — Formulation and Frozen Diagnostic Specification (M19 PASS 1.1)

**Status:** FORMULATION AND FROZEN SPECIFICATION, v1.1. **THE DIAGNOSTIC HAS NOT BEEN RUN.**
**Milestone:** M19 PASS 1.1 (supersedes the M19 PASS 1 formulation at `7e6617f`)
**Date:** 2026-09-10
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-09-10 — *M19 PASS 1.1, adequacy decision-rule clarification*

**Binds to:** `C1_PREREGISTRATION.md` v2.0 (M17, digest
`a2168c418aaf64b84a3170dba7bd11b4776afd2e0ba8ac1bf42b7c0880f95439`, commit `f57820b`) §12
**Evidence inherited:** `experiments/m14/m14_attainability.json` (M14, `b825d1a`)

> **NO REGISTERED C1 SEED IS CONSUMED. `895000–895999` IS UNTOUCHED.**
> This document defines a diagnostic. It does not report one, and execution awaits a separate
> Director authorisation.

---

## 0. What this milestone must decide, and what it must not

C1 v2.0 §12 requires a pre-collection gate establishing that the instrument produces a
**non-degenerate description**. v2.0 removed the inferential layer, which also removed the old
gate's central check ("is the rejection region non-empty"). That check is meaningless without a
test, and this document does not resurrect it in disguise.

**Forbidden throughout, and absent from every criterion below:** p-values, hypothesis tests, α,
statistical rejection, population inference, `H0_sym`, power, and significance language. Adequacy is
a property of the **instrument**, examined by construction and by measurement of the instrument's
response — never by a test on data, and (per §0.1) never fully established before collection.

**The diagnostic yields INSTRUMENT evidence only.** No quantity it produces is evidence about
`futureScore`, and none may be reported as a C1 finding. This is the same fence M14 operated
under, and for the same reason.

### 0.1 The gate's epistemic status — it falsifies, it does not certify

**This gate cannot establish that the instrument is adequate on the registered block, and v1.1 does
not claim it can.**

The fixtures live in `896xxx`; the registered block is `895000–895999`. Concluding from the former
to the latter is a **sampling-frame inference**, and this program has no sampling frame — that
absence is precisely why M17 deleted C1's entire inferential layer. Adequacy on `895xxx` is
therefore not establishable before collection, **with or without a numerical threshold**. The
threshold question, which prompted this revision, turns out to be secondary to a prior one.

What the gate can do is **detect a failure**. If the instrument is degenerate on the fixtures, that
is a fact about the instrument and it blocks collection. If no failure is detected, the correct
conclusion is *"no adequacy failure was detected on the fixtures examined"* — not *"the instrument
is adequate"*.

The gate is therefore **asymmetric by construction**: a failure is informative and blocking; a
non-failure is permissive but not probative. §6 names the outcomes accordingly.

---

## 1. Four distinct properties, in increasing strength

The Director's four terms are not synonyms. Conflating them is how UQ-B's C2 passed review: C2 was
**measurable** and its null was **valid**, and nobody asked whether it was **informative**.

| Level | Property | Question it answers | Failure looks like |
|---|---|---|---|
| **L1** | **Mathematical measurability** | Is `ρ` defined at all? | `ρ` undefined everywhere (`n < 2`, or `v* ∉ pool`) — nothing exists to describe |
| **L2** | **Variation** | Does the measured quantity take more than one value? | `Δ` constant across the census — the description is a single number that could not have been otherwise |
| **L3** | **Informativeness** | Does the variation arise from the treatment acting on the *construct*, rather than from the apparatus? | `Δ` varies, but only because the normalisation denominator `n` moved — the instrument reports pool-size change wearing the costume of rank change |
| **L4** | **Scientific adequacy** | Could the description have come out **materially differently**, and does the instrument demonstrably respond when the thing it tracks changes? | The outcome was forced by construction — precisely UQ-B's C2, whose observed result was the only one attainable |

**L4 ⟹ L3 ⟹ L2 ⟹ L1.** Each level is necessary for the next and none is sufficient for it.

### 1.1 What UQ-B's C2 actually failed

C2 was measurable (an integer 0…19 was always computed) and it varied (values differed across
configurations). It failed at **L4**: given the tie structure, `0/71` was the only attainable
outcome. The design never asked whether the observation could have been different.

**The M19 criteria therefore target L3 and L4 explicitly**, because L1 and L2 alone are exactly
what C2 satisfied.

### 1.2 Four further concepts that must not be equated

The levels above describe *what property* is at stake. These four describe *how strongly it is
established*. Silently equating them is how an existence-based gate can pass on one cell.

| Concept | Definition | Established by |
|---|---|---|
| **Exercisable** | Some attainable data would satisfy the criterion; it is not unsatisfiable by construction | Reasoning about the measurement space, **before** any run |
| **Observed** | At least one instance satisfying the criterion appears in the data | Bare existence — the v1.0 standard |
| **Sufficiently demonstrated** | The observation is not an artifact of a single cell, and it reproduces across the strata the frozen design already defines | §2.3 |
| **Instrument is adequate** | The instrument will produce a non-degenerate description **on the registered block** | **Not establishable pre-collection** (§0.1) |

**`Exercisable` ⇏ `Observed` ⇏ `Sufficiently demonstrated` ⇏ `Adequate`.** None of these
implications holds, and the last one fails for a structural reason, not a quantitative one.

### 1.3 Is an existence-based criterion sufficient? — the direct answer

**No.**

A criterion satisfied by exactly one cell out of several hundred is `Observed` but not
`Sufficiently demonstrated`: a single cell can be a boundary case, a rounding artifact, or a
coincidence, and nothing in bare existence distinguishes those from a real instrument property.
The v1.0 criteria conflated `Observed` with `Sufficiently demonstrated`, and the `MARGINAL`
escalation was a patch over that conflation rather than a repair of it.

**But strengthening the evidential standard does not reach `Adequate` either.** Even a criterion
demonstrated overwhelmingly on `896xxx` fixtures says nothing certain about `895xxx`, for the
reason in §0.1. So:

> **Scientific adequacy cannot be established pre-collection — not because a defensible threshold
> is missing, but because the fixture-to-block step is an inference this program has no basis to
> make.** No threshold, arbitrary or derived, would repair that.

The minimum defensible alternative, adopted in §2.3 and §6, is therefore twofold: **raise the
evidential standard from `Observed` to `Sufficiently demonstrated` without introducing any
threshold**, and **rename the gate's output so it claims only what it can support.**

---

## 2. Can the CRITERIA be defined without an arbitrary threshold?

**Yes — with one derived boundary.** Note the narrowed question: §1.3 established that *adequacy
itself* is not establishable pre-collection at all, so what remains to define threshold-free are the
**criteria** and their **satisfaction standard**. Both are, below.

Every criterion is either an **existence condition** (whose only boundary is zero), a
**mathematically derived boundary** (§2.1), or a **robustness property** (§2.3). No number is
chosen for convenience anywhere in this document.

### 2.1 The one derived boundary: `n ≥ 3`

`ρ = r/(n−1)` with `r ∈ {0, …, n−1}` has **exactly `n` attainable values**:

```
n = 1   ρ undefined                              (excluded by C1 v2.0 §6)
n = 2   ρ ∈ {0, 1}                               BINARY
n = 3   ρ ∈ {0, 0.5, 1}                          first GRADED n
n = 6   ρ ∈ {0, 0.2, 0.4, 0.6, 0.8, 1}           graded
```

The boundary between a binary instrument and a graded one is therefore **exactly `n = 3`**, as a
matter of arithmetic. It is derived, not selected — and it matters because **a binary E6 would
reproduce UQ-B's coarseness regime**, which is the failure this whole line of work exists to avoid.
Requiring that graded pools exist is the anti-UQ-B safeguard at the resolution level.

### 2.2 Why no count threshold is imposed

No criterion requires "at least *k*" defined cells, configurations, or non-zero differences for any
`k > 1`. Any such `k` would be invented. Instead the criteria are existence-based, **and every
count is reported in full** so marginality is visible rather than hidden behind a cutoff.

### 2.3 The satisfaction standard — from `Observed` to `Sufficiently demonstrated`

v1.0 required bare existence. v1.1 replaces that with **two robustness properties, neither of which
is a count, a percentage, an effect size, or a sample size.** A criterion counts as
`Sufficiently demonstrated` only when **both** hold.

#### S1 — Leave-one-out robustness

> The criterion still holds after deleting **any single** observation from the fixture set.

This is a **robustness property, not a quantity**: it says the conclusion does not rest on one
cell. It happens to imply at least two instances, but `2` is **derived** from
"not-dependent-on-a-single-observation" rather than chosen — the same style of derivation as the
`n ≥ 3` boundary in §2.1. No larger number is imposed, because no larger number is derivable.

#### S2 — Replication across the design's own strata

> Wherever the criterion's precondition arises, the criterion holds **independently within each
> stratum** of the partition the frozen design already defines: the **four frozen goal indices**
> × **{Set C, Set F}** (§4).

The strata are **not chosen by this document**. The four goal indices are frozen in the C1
substrate; the Set C / Set F split already exists to break the circularity in §4. S2 adds no new
partition and no new number.

**Applicable vs satisfied — these are distinguished, not conflated.** If a criterion's precondition
never arises in a stratum (for example, `A9` requires the two phase oracles to disagree somewhere,
which is a property of the configuration), that stratum is reported as **`NOT EXERCISABLE`**. A
stratum where the criterion is exercisable but unsatisfied is a **failure**. Silence about which of
the two occurred would be the conflation this section exists to prevent, so both are reported per
stratum.

**What S1 and S2 do not do.** They raise the standard from `Observed` to
`Sufficiently demonstrated` on the fixtures examined. They do **not** reach `Adequate` (§0.1, §1.3),
and no accumulation of fixture evidence would.

---

## 3. The adequacy criteria

All are evaluated on non-registered development fixtures (§4). `cell` means a
(fixture, phase, state) triple for which the relevant quantity is defined.

### L1 — measurability

| ID | Criterion | Form |
|---|---|---|
| **A1** | There exists at least one cell where `ρ` is defined in **both** arms (`n ≥ 2` and `v* ∈ pool`, per arm). | existence |
| **A2** | There exists at least one fixture/phase with `jointlyDefined ≥ 1`, so `Δ` exists. | existence, derived from the estimator |

### L2 — variation

| ID | Criterion | Form |
|---|---|---|
| **A3** | `ρ` takes **≥ 2 distinct values** across defined cells. | existence of variation |
| **A4** | `Δ` takes **≥ 2 distinct values** across fixture/phases. | existence of variation |
| **A5** | **Negative control (determinism):** re-measuring the **same arm twice** yields `δ = 0` at **every** cell. Any non-zero difference here is apparatus noise, and would make all other variation uninterpretable. | exact equality |

`A5` is what licenses attributing observed variation to the treatment rather than to the
measurement. Without it, `A3`/`A4` prove nothing.

### L3 — informativeness

| ID | Criterion | Form |
|---|---|---|
| **A6** | There exists at least one cell with **`r_ARMED ≠ r_ABLATED`** — the treatment moves the oracle's *actual rank*, not merely the normalisation denominator. | existence |
| **A7** | The non-zero `δ` cells are **not exclusively** normalisation-driven. Each non-zero cell is classified as `rank-driven` (`r` differs, `n` equal), `normalisation-driven` (`r` equal, `n` differs), or `both`; the full decomposition is reported. | existence + full disclosure |
| **A8** | **Graded resolution exists:** at least one defined pool has **`n ≥ 3`** (§2.1). | derived boundary |

> **A7 is not a formality.** The M14 record already shows the normalisation confound is pervasive:
> of 149 jointly-defined cells, **24** are purely rank-driven, **31** purely normalisation-driven
> and **88** both. Roughly four in five moving cells also changed pool size. C1 v2.0 §2.1 declares
> `ρ` a *normalised total-effect outcome* for exactly this reason; A7 forces the decomposition into
> the open rather than leaving a reader to assume rank change.

### L4 — scientific adequacy

| ID | Criterion | Form |
|---|---|---|
| **A9** | **Positive control (oracle substitution):** where the phase-1 and phase-2 oracles name *different* actions (`v*₁ ≠ v*₂`), the instrument's rank must differ for at least one such cell. This shows E6 responds when **the reference it tracks** changes — using two oracles the environment already defines, with no new arm, no new run, and nothing invented. | existence |
| **A10** | **Forced-outcome check:** the observed `r` values must not be concentrated at a single value across all defined cells. If `r` is constant by construction, the description was forced and E6 reports the pool's shape rather than the agent's ranking. | existence of ≥2 distinct `r` |
| **A11** | **No structural degeneracy:** the instrument is neither **inert** (`δ = 0` at every cell) nor **saturated** (`|δ| = 1` at every cell). | existence of an interior value |

#### 3.1 The `inert` case, and the ambiguity that destroyed UQ-B's interpretation

If `δ = 0` everywhere, two very different worlds are consistent with it: the mechanism genuinely
does not move `v*`'s rank, or E6 cannot see that it does. **UQ-B's `0/71` was exactly this
ambiguity, and it was unresolvable after the fact.**

`A5` and `A9` bear on that ambiguity from opposite directions, and v1.1 states their reach exactly.

**What they establish, on the examined fixtures only:**

- **`A5`** — E6 returns exactly zero when nothing changes, so it is **not noisy**: an observed
  non-zero `δ` is not apparatus artefact.
- **`A9`** — E6 responds when **the particular reference it tracks** (`v*`) is substituted, so it
  is **not globally inert**: the measurement is wired to the oracle rather than stuck.

**What they do NOT establish — and v1.0 wrongly implied otherwise:**

> `A5` and `A9` do **not** establish that E6 is sensitive to every change the treatment could
> produce — neither on the fixtures nor on the registered block. `A9` demonstrates responsiveness
> to **one specific manipulation** (oracle substitution), which is not the treatment and does not
> stand in for it. Sensitivity to a manipulation is not sensitivity in general, and no control in
> this diagnostic ranges over the space of changes the treatment might make.

**Therefore, correctly stated:** an inert result on the registered block would **remain ambiguous**
between *"the mechanism did not move `v*`'s rank"* and *"E6 did not register a movement that
occurred"*. `A5` and `A9` **narrow** that ambiguity — they exclude apparatus noise and global
inertness as explanations — but they **do not remove it**. Any inert C1 result must report the
residual ambiguity as a limitation, and must not be presented as evidence that the mechanism has no
effect.

The v1.0 sentence claiming an inert result "would be a statement about the mechanism, not about the
instrument" is **withdrawn**: it asserted universal E6 sensitivity, which these controls cannot
support.

**E6 is designed not to respond to reorderings that leave `v*` in place.** A cell with
`E1(c) > 0` and `δ = 0` is therefore expected and is **not** evidence of blindness; only a
census-wide inert result with `A9` failing would be. This is stated so the diagnostic is not
misread as requiring E6 to track every policy change.

---

## 4. Fixtures — and a safeguard against circularity

**Selection rule, frozen:** within the `896xxx` development territory, take the accepted
configurations in **ascending `(configSeed, configIndex)` order**, at each of the four frozen goal
indices, forming two disjoint sets:

- **Set C (continuity)** — the four fixtures M14 used: `896066:0`, `896066:1`, `896238:2`,
  `896329:3`. Retained so the adequacy result is comparable with the recorded M14 evidence.
- **Set F (fresh)** — the next accepted configuration at each goal index **not used by M14**,
  resolved by the same ascending enumeration at execution time.

> **Why Set F exists.** E6 was selected in M14 partly *because* it behaved well on Set C. Declaring
> it adequate using only Set C would be circular: the fixtures that motivated the choice would also
> be its examination. Set F is held out from that selection and guards against fixture-specific
> flattery. **Adequacy requires the criteria to hold on Set C ∪ Set F, and any criterion that holds
> on one set but not the other is reported as a discrepancy rather than averaged away.**

**Governance.** `896000–896999` is recorded as consumed (M18, `c59d457`) — consumed *for studies*.
Its purpose was always development and instrument fixtures, and M18's own design deliberately kept
`uqb/protocol.assertSeedAllowed` permitting it so instrument tooling keeps working. Using it here is
that purpose, not an exception to it. **No fixture may lie outside `896xxx`, and the registered C1
block `895000–895999` is never touched.**

---

## 5. The frozen diagnostic

Eight measurements, no statistics. Each maps to criteria in §3.

| ID | Measurement | Serves |
|---|---|---|
| **D1** | For every fixture/phase/state: `ρ_ARMED`, `ρ_ABLATED`, `r` and `n` per arm, definedness status | A1, A2, A3, A8 |
| **D2** | **Negative control:** collect one arm **twice** and compare all recorded values | A5 |
| **D3** | `δ` per cell and `Δ` per fixture/phase | A4, A11 |
| **D4** | **Positive control:** for cells where `v*₁ ≠ v*₂`, the rank of each oracle's action within the *same* pool | A9 |
| **D5** | Pool-size distribution per arm; count of `n = 1`, `n = 2`, `n ≥ 3`; weight ties within pools | A8 |
| **D6** | Classification of every non-zero `δ` cell as rank-driven / normalisation-driven / both | A6, A7 |
| **D7** | Distribution of `r` across defined cells | A10 |
| **D8** | `E1(c)` per fixture, and the joint tabulation of (`E1 > 0`, `δ ≠ 0`) | §3.1 disambiguation |

**Reuse, not reinvention.** D1–D8 are computable from the same decision-time pool capture M14
already validated (`experiments/m14/probe.js`, one guarded snapshot at `main.js:2373`). The
diagnostic adds **no new instrumentation to production**, and E6, the C1 preregistration, UQ-B,
production code and seed governance are all unmodified.

---

## 6. Acceptance criteria and outcomes

The outcome names are **renamed in v1.1** so they claim only what §0.1 permits. `ADEQUATE` is
withdrawn: no result of this gate can certify adequacy.

| Outcome | Condition | What it licenses |
|---|---|---|
| **NO FAILURE DETECTED** | Every criterion is `Sufficiently demonstrated` (§2.3: S1 **and** S2), on every stratum where it is exercisable | Collection **may** proceed, subject to a Director ruling. It does **not** assert the instrument is adequate |
| **MARGINAL** | Every criterion is `Observed`, but at least one fails **S1** (rests on a single observation) or **S2** (does not replicate across a stratum where it is exercisable) | **Escalates. Does not permit collection** |
| **FAILURE DETECTED** | Any criterion is exercisable in a stratum and unsatisfied there | **Blocks collection.** The criterion and its diagnosis are reported |
| **NOT EXERCISABLE** | Reported *per criterion per stratum* where the precondition never arises | Neither pass nor fail; disclosed so silence is never read as success |

**`NO FAILURE DETECTED` is a permission, not a finding.** The phrase "the instrument is adequate"
may not appear in any report of this diagnostic.

**No criterion may be relaxed, and no threshold introduced, after the diagnostic runs.** If a
criterion proves unsatisfiable, that is a finding about the instrument and returns to the Director —
it is not grounds to weaken the criterion. This is the standing anti-tuning rule that UQ-B's C2
lacked.

**The diagnostic cannot alter C1.** No result may change E6, the estimand, the population, the
oracle, the missingness rule, or the analysis plan. It can only permit collection, block it, or
escalate.

---

## 7. Evidence / inference / hypothesis

### 7.1 Established evidence (recorded, from M14 `b825d1a`)

152 decision-time pools over four non-registered fixtures: pool sizes 1–10 with **145/152 at
`n ≥ 3`**, 5 at `n = 2`, 2 at `n = 1`; **0 weight ties** in 152 pools; E6 defined for both arms in
**149/152** cells, **0** one-arm-only; ranks spanned **0–9**; byte-identical reproduction across
independent processes; arm fingerprints differed in **4/4** fixtures. Of 149 jointly-defined cells,
the rank/normalisation decomposition is **24 rank-driven, 31 normalisation-driven, 88 both, 6
identical**. Where the two phase oracles disagree (**41/76** states), the rank of the oracle's
action differed in **38/38** exercisable cells.

**All of this is instrument evidence. None of it is evidence about `futureScore`.**

### 7.2 Valid inference

The M14 record indicates every criterion in §3 is *exercisable* — each has at least one instance in
recorded data — so the diagnostic is not designed to be unsatisfiable, and equally not designed to
be trivially satisfiable: `A7`'s decomposition already shows the normalisation confound is
pervasive, and `A6` would fail if rank never moved.

### 7.3 Hypotheses — untested, and untested by this diagnostic

That the criteria will hold on **Set F**, the held-out fixtures, is **not established**; that is
what the diagnostic is for. That `futureScore` has any effect on oracle-alignment remains untested
and is untestable by this diagnostic, which measures the instrument and not the mechanism.

---

## 8. What this diagnostic cannot establish

It cannot establish that `futureScore` changes oracle-alignment, that any effect exists, or
anything cognitive or representational.

It also **cannot establish that the instrument is adequate** (§0.1, §1.3). It can detect a failure
on the fixtures examined, and it can fail to detect one. A `NO FAILURE DETECTED` outcome licenses
**collection** and nothing else — it is a permission, not a finding, and the phrase "the instrument
is adequate" may not appear in any report of this diagnostic.

Nor do its controls establish that E6 is sensitive to every change the treatment could produce
(§3.1). An inert C1 result would remain ambiguous, and that ambiguity must be reported rather than
resolved by appeal to this gate.
