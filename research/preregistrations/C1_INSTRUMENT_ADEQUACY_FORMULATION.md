# C1 Instrument-Adequacy — Formulation and Frozen Diagnostic Specification (M19 PASS 1)

**Status:** FORMULATION AND FROZEN SPECIFICATION. **THE DIAGNOSTIC HAS NOT BEEN RUN.**
**Milestone:** M19 PASS 1
**Date:** 2026-09-10
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-09-10 — *M19 PASS 1, C1 instrument-adequacy formulation*

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
statistical rejection, population inference, `H0_sym`, power, and significance language. Adequacy
is a property of the **instrument**, established by construction and by measurement of the
instrument's response — never by a test on data.

**The diagnostic yields INSTRUMENT evidence only.** No quantity it produces is evidence about
`futureScore`, and none may be reported as a C1 finding. This is the same fence M14 operated
under, and for the same reason.

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

---

## 2. Can adequacy be defined without an arbitrary threshold?

**Yes, with one derived boundary.** Every criterion below is either an **existence condition**
("there is at least one …", whose only boundary is zero) or a **mathematically derived boundary**.
No number is chosen for convenience.

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

**Marginality is handled without inventing a threshold**: if a criterion is satisfied by **exactly
one** instance — the unique minimal positive integer, not a chosen bound — the diagnostic returns
`MARGINAL` and escalates to the Director rather than declaring adequacy. §5.

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

`A9` and `A5` resolve it **in advance**, in opposite directions: `A9` shows the instrument *does*
move when its reference moves (so it is not blind), and `A5` shows it does *not* move when nothing
changes (so it is not noisy). With both in hand, an inert result on the registered block would be a
statement about the mechanism, not about the instrument.

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

| Outcome | Condition |
|---|---|
| **ADEQUATE** | Every criterion `A1`–`A11` is satisfied on **Set C ∪ Set F**, and no criterion is satisfied by exactly one instance |
| **MARGINAL** | Every criterion is satisfied, but at least one **only by a single instance**, or a criterion holds on one fixture set and not the other. **Escalates to the Director; does not authorise collection** |
| **INADEQUATE** | Any criterion fails. Collection does not begin; the specific criterion and its diagnosis are reported |

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
anything cognitive or representational. It establishes only whether the frozen E6 instrument is
capable of producing a description that could have come out otherwise. An `ADEQUATE` verdict
licenses **collection**, and nothing else.
