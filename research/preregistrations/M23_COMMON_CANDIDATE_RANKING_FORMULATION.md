# M23 — Common-Candidate Ranking Formulation

**Status:** FORMULATION ONLY — no implementation, no experiment, no preregistration, no seeds
**Milestone:** M23
**Date:** 2026-09-11
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-09-11 — *M22 ACCEPT → M23 authorised*

**Nothing was run. No production source, preregistration, frozen artifact, dataset, F1/F2 filter or
registry entry was modified. No seed was generated, inspected, selected or consumed.** C1 was not
reopened and no E6 replication is proposed. `main.js` was **read**; no line changed. The
`895000–895999` registry defect remains open and untouched.

**Carried forward from M22, not reopened:** `Total = Ranking + Admission` is rejected. **No
proportion of the C1 effect is attributed to ranking versus admission anywhere in this memo**, and
no residual is formed. §P-10 checks specifically that the rejected decomposition has not re-entered
under a new name.

---

## 0. Decision gate — stated first

> # M23-YELLOW
> **The measurement is descriptive only. The causal interpretation is rejected.**
>
> Classification: **B — a legitimate descriptive conditional ranking measurement, but not a causal
> pathway effect.** Not A, and the reason is concrete rather than generic (§3.3). Not D — it is
> genuinely distinct from both E6 and E1 (§4, §5). Not C or E.

The minimum next measurement is formulated at §9, **and I do not recommend spending a registered
block on it** (§10). YELLOW is the classification of the quantity; whether to measure it is a
separate decision, and my answer to that is still no.

---

## 1. The question, exactly as posed

> *"When a candidate is present in both ARMED and ABLATED candidate pools, does the
> ARMED-vs-ABLATED intervention change the candidate's relative ranking within the common candidate
> set?"*

**What kind of quantity this is, determined before anything else is asked of it:** a **descriptive
contrast conditional on a post-treatment selection event** — namely, the candidate surviving *both*
arms' admission filters. It is **not** an intervention on ranking with admission held fixed, and
§3 establishes that it cannot be made into one.

---

# PASS 1 — FORMALISING THE COMMON-SET QUANTITY

## 2. Definitions

Decision state `u`, phase `p`, arm `a ∈ {A = ARMED, B = ABLATED}`. Carried from M22 §2 unchanged.

| Symbol | Definition |
|---|---|
| `P_A`, `P_B` | decision-time pools, sizes `n_A`, `n_B` |
| `P_∩` | `P_A ∩ P_B`, size `m` — the **common pool** |
| `w_A(c)`, `w_B(c)` | candidate weights, **defined for every `c ∈ P_∩` under both arms** |
| `r_a^∩(c)` | **raw common-set rank** of `c`: `\|{c' ∈ P_∩ : w_a(c') > w_a(c)}\|`, rank 0 = first |
| `ρ_a^∩(c)` | **normalised common-set rank** `= r_a^∩(c)/(m − 1)`, defined iff `m ≥ 2` |
| `v*_p(u)` | oracle-optimal candidate — **arm-independent**; may or may not lie in `P_∩` |

**Two candidate contrasts, and they are not equivalent:**

```
ORACLE-ANCHORED  (from M22)
  δ_∩(u,p) = ρ_A^∩(v*) − ρ_B^∩(v*)          defined iff m ≥ 2 ∧ v* ∈ P_∩

ORACLE-FREE  (introduced here)
  τ_∩(u)   = D(u) / T(u)
             T(u) = |{ {c,c'} ⊆ P_∩ : w_A(c)≠w_A(c') ∧ w_B(c)≠w_B(c') }|
             D(u) = |{ those pairs whose order differs between w_A and w_B }|
             defined iff T(u) ≥ 1
```

`τ_∩` is the **discordance fraction among co-admitted candidates** — the proportion of comparable
common pairs the two weightings order differently. It answers the question as literally posed
("*does the ranking change*"), whereas `δ_∩` answers a narrower one ("*where does the oracle's
choice sit*").

**Configuration-level aggregation.** Unweighted mean over the states where the quantity is defined,
matching C1's `Δ` convention — reported per configuration, then described across configurations.
**Never pooled across configurations as though states were independent** (§P-6).

### 2.1 Three structural properties of `τ_∩`, established by definition

1. **Phase-independent.** `τ_∩` never references `v*`, so it does not vary with phase. This halves
   the measurement units (one value per state, not per state-phase) and removes phase as a factor.
2. **Defined more often than `δ_∩` or `δ`.** It survives the case where `v*` is arm-exclusive, which
   makes both oracle-anchored quantities undefined (attainability case 6, §7).
3. **Computable with no additional treatment.** Every `c ∈ P_∩` was admitted by *both* arms, so
   `w_A(c)` and `w_B(c)` were **both actually computed by the runtime**. No weight is imputed, no
   candidate is force-admitted, and no rejected candidate is scored. *In this narrow sense the
   answer to "can it be computed without introducing an additional treatment?" is yes — but see §3,
   which is the part that matters.*

---

## 3. The critical causal test

### 3.1 The two things that must not be confused

| | |
|---|---|
| **(i) Observed common-candidate comparison** | Among candidates that *happened* to survive both arms' filters, compare their orderings. **This is what `τ_∩` and `δ_∩` are.** |
| **(ii) Causal intervention on ranking, admission held fixed** | `do(weights := w_A)` vs `do(weights := w_B)` with the pool held at a common value. **This is what neither quantity is.** |

M22 established that (ii) does not exist under this architecture: pool and weights are two
deterministic functions of one mediator, and no intervention on `T` separates them. M23 asks the
narrower question of whether (i) is nonetheless *scientifically* usable.

### 3.2 Does restricting to survivors isolate ranking?

**No.** Restricting to `P_∩` removes the *arithmetic* contribution of exclusive candidates — that
much is true and is why `τ_∩` is not merely E6 renamed. But it does **not** isolate ranking, because
the *set on which the comparison is computed* is itself an admission outcome. The comparison is
**admission-conditioned**, not admission-free.

### 3.3 The selection mechanism is concrete, and it is in the source

This is not a generic collider worry. `penalties` is a **direct common cause of both the admission
decision and the weight**:

| | `main.js` | role |
|---|---|---|
| **F1 admission** | `:1610` — `if (penalties.get(currentKey + "->" + k) > 10) return;` | excludes the candidate |
| **weight** | `:1754` — `const penalty = penalties.get(currentKey + '->' + k) \|\| 0;` → `:1878` — `penalty * 1.5` | enters the weight linearly |

```
                penalties(c)  ── F1 ──►  c ∈ P_a      ─┐
   T ──► S ──┤                                         ├──► c ∈ P_∩   ◄── CONDITIONED ON
                penalties(c)  ────────►  w_a(c)       ─┘         │
                                              │                  │
                                              └──────────────────┴──► the measured contrast
```

**Conditioning on `c ∈ P_∩` conditions on a post-treatment variable that shares a direct cause with
the outcome.** Concretely, it restricts to candidates whose penalty is `≤ 10` **under both arms** —
a two-sided truncation of a variable that enters the compared weights with coefficient 1.5. The
surviving set is therefore systematically non-random *in exactly the quantity being compared*.

F2 gives a second instance (`getQ(...) < −0.5` at `:1620`), and F3 a third through
`transitions`/`rewards`.

> **Consequence, stated plainly:** `τ_∩` and `δ_∩` **do not admit a causal interpretation as the
> effect of the intervention on ranking.** They are descriptive statements about a
> treatment-selected subpopulation of candidates. Classification **A is rejected.**

### 3.4 What survives the test

The quantity remains **well-defined, computable without imputation, and interpretable
conditionally**: *"among candidates both arms admitted, the two weightings order X% of comparable
pairs differently."* Every report of it must carry the conditioning clause, because the clause is
not a caveat — it is part of the estimand.

---

## 4. Is it different from E6, or a re-representation of it?

The Director's five questions. Toy cases use `ρ = r/(n−1)`, rank 0 = first.

### Case Q1 — *Can common-set ranking vary while E6 does not?* **YES**

`P_A = P_B = {a,b,c}`, `v* = a`. `w_A`: `a > b > c`. `w_B`: `a > c > b`.
`r_A = r_B = 0` ⇒ `ρ_A = ρ_B = 0` ⇒ **`δ = 0`**. But the pair `{b,c}` is discordant ⇒ **`τ_∩ = 1/3`**.

### Case Q2 — *Can E6 vary while common-set ranking does not?* **YES**

`P_∩ = {a,b,c}`, both arms order `a > b > c`, `v* = b`. `P_A = {a,b,c}` ⇒ `r_A = 1, n_A = 3,
ρ_A = 0.5`. `P_B = {a,b,c,d}` with `d` above `b` ⇒ `r_B = 2, n_B = 4, ρ_B = 2/3`.
**`δ = 0.5 − 0.667 = −0.167`**, while **`τ_∩ = 0`** and `δ_∩ = 0`.

### Case Q3 — *Can admission differences change E6 while leaving common-set ranking unchanged?* **YES**

Case Q2 is exactly this: the common ordering is identical and the entire `δ` arises with `τ_∩ = 0`.
**This does not license attributing `δ` to admission** — that is the rejected decomposition (§P-10).
It shows only that the two quantities can move independently.

### Case Q4 — *Can common-set ranking change independently of pool size?* **YES**

Case Q1 has `n_A = n_B = m = 3` — every size fixed — and `τ_∩ = 1/3 ≠ 0`.

### Case Q5 — *Do they distinguish different observable phenomena?* **YES**

Q1 and Q2 are mutually exclusive demonstrations: one has `δ = 0, τ_∩ ≠ 0`; the other `δ ≠ 0,
τ_∩ = 0`. A re-representation of the same quantity could produce neither.

> **Verdict on D:** `τ_∩` is **not redundant with E6**. §8 records the separate concern that on the
> only available data it is *empirically* correlated with E6, which is a value question, not an
> identity question.

---

## 5. Is it different from E1? — the comparison that most threatens its value

C1 already committed a diagnostic that answers "does the intervention change the ranking":

```
E1(c) = |{ u : best_ARMED(u) ≠ best_ABLATED(u) }|          (C1 v2.0 §10)
```

C1 measured `E1 ∈ [10, 19]`, mean 14.69, **never 0**. **So it is already established that the
top-ranked candidate differs in at least 10 of 19 states in every C1 configuration.** Any proposal
claiming to establish "the intervention changes ranking" is therefore claiming something already in
the record, and I raise this against my own §9 rather than waiting for it to be raised.

**What `τ_∩` adds that `E1` does not:**

1. **`E1` is argmax-only.** It says the top choice differs; it says nothing about the ordering below
   the top.
2. **`E1` is admission-confounded.** The argmax can differ because the winning candidate is *absent*
   from the other arm's pool. On M14 development fixtures, of 55 state-rows where the argmax
   differed, **31 involved a best candidate not co-admitted** (19 where ARMED's best was absent from
   ABLATED's pool, 18 where ABLATED's was absent from ARMED's; the two overlap), and only **24** had
   both bests co-admitted. `τ_∩` is computed only on co-admitted candidates, so it cannot be
   produced by a candidate's mere absence.
3. **`E1` has no null.** It is a validity control with a structural interpretation (`E1 = 0` means
   the exposure did not reach the measurement). `τ_∩` has an attainable, non-structural null
   (`τ_∩ = 0`: identical common ordering), observed in 11 of 75 usable M14 rows.

**But `E1` already answers the headline.** `τ_∩` is a *finer-grained, admission-cleaner* version of a
question the record has already answered affirmatively. That is resolution, not a new fact, and §10
weighs it accordingly.

---

## 6. Existing-data analysis — M14 development fixtures

Computed read-only from `experiments/m14/m14_attainability.json` (`b825d1a`): **76 state-rows across
4 development fixtures on non-registered 896xxx territory** (152 state-phase rows for the
oracle-anchored quantities; 76 for the phase-independent `τ_∩`).

> **Scope, binding.** These figures establish only that the measurement is **mathematically
> exercisable and distinguishable from E6 and E1**. They are development fixtures, not a census.
> **They are not evidence for any population claim, any hypothesis, or any property of the
> mechanism**, and they must never be cited as a preview of a registered result.

| `τ_∩` (oracle-free) | |
|---|---|
| state-rows | 76 |
| rows with ≥ 1 comparable common pair (`τ_∩` defined) | **75** |
| **zero discordance** (common ordering identical) | **11** |
| some discordance | 64 |
| discordance fraction: min / mean / max | **0.000 / 0.460 / 1.000** |

| Argmax structure (`E1`-style) | |
|---|---|
| argmax differs | 55 / 76 |
| — both bests co-admitted | **24** |
| — ARMED's best absent from `P_B` | 19 |
| — ABLATED's best absent from `P_A` | 18 |

| `δ_∩` (oracle-anchored), from M22 §7.2 | |
|---|---|
| state-phase rows where `δ` and `δ_∩` both defined | 148 |
| `δ ≠ 0` **and** `δ_∩ = 0` | 23 |
| `δ_∩ ≠ 0` **and** `δ = 0` | 2 |
| descriptive per-row `corr(δ, δ_∩)` | **0.957** |

**Reading, strictly limited.** `τ_∩` spans its full range `[0, 1]` and takes its null value in 11
rows, so **it is not forced by construction** — the L4 failure mode that disqualified UQ-B's C2 does
not apply. Nothing here speaks to any registered population.

---

## 7. Attainability — the ten required cases

| # | Case | `τ_∩` | `δ_∩` | `δ` (E6) | Note |
|---|---|---|---|---|---|
| 1 | identical pools + identical ranking | **0** | 0 | 0 | joint null; attainable (11 M14 rows) |
| 2 | identical pools + different ranking | **> 0** | may be 0 | may be 0 | **Q1**; pool sizes fixed |
| 3 | different pools + identical common ranking | **0** | 0 | **≠ 0** | **Q2/Q3** |
| 4 | different pools + different common ranking | **> 0** | ≠ 0 | ≠ 0 | the general case |
| 5 | oracle candidate shared (`v* ∈ P_∩`) | defined | **defined** | defined | 149/152 M14 rows |
| 6 | **oracle candidate exclusive to one arm** | **defined** | **undefined** | **undefined** | `τ_∩`'s structural advantage (§2.1.2) |
| 7 | empty intersection (`m = 0`) | **undefined** | undefined | may be defined | blind spot; 0 M14 rows |
| 8 | one-element intersection (`m = 1`) | **undefined** (no pairs) | undefined (÷0) | may be defined | blind spot; 2 M14 rows |
| 9 | multiple common candidates (`m ≥ 2`) | defined | defined if `v* ∈ P_∩` | — | 150/152 M14 rows |
| 10 | common candidates whose ordering changes | **> 0** | — | — | 64/75 M14 rows |

**No acceptance threshold is proposed and none may be inferred from this table.** Every entry is a
definedness or attainability statement.

**Resolution boundary.** `τ_∩`'s denominator `T(u)` is the number of comparable common pairs, so
`m = 2` admits exactly one pair and `τ_∩ ∈ {0, 1}` — binary. `m ≥ 3` gives at least three pairs and
the first graded values. This is the same structural boundary C1's formulation derived for `ρ`, and
it must be declared in advance, not discovered in data.

---

## 8. Classification

| | | |
|---|---|---|
| **A** | legitimate causal estimand | **REJECTED** — §3.3: conditioning on `P_∩` conditions on a post-treatment variable sharing a direct cause (`penalties`) with the compared weights |
| **B** | legitimate descriptive conditional ranking measurement, not a causal pathway effect | **SELECTED** |
| **C** | measurable but scientifically non-identifying | rejected — it identifies a real conditional fact with an attainable null (§6, §7) |
| **D** | redundant with E6 | rejected as an identity claim (§4: Q1 and Q2 are mutually exclusive); **but see §10 on empirical correlation** |
| **E** | not well-posed | rejected — definitions, definedness conditions and edge cases are all explicit (§2, §7) |

---

# PASS 2 — ADVERSARIAL SELF-CHALLENGE

### P-1. Post-treatment conditioning
**Lands, fatally, for causal purposes.** §3.3. Conceded in the classification itself, not buried in a
caveat: **B, not A**.

### P-2. Intersection selection
**Lands.** `P_∩` is a function of *both* arms' states, so the selected candidate set varies with the
pair, not with a fixed frame. Two configurations' `τ_∩` values are computed over differently
selected candidate sets, so cross-configuration comparison compares quantities over non-identical
selections. This must be declared as a property of the estimand.

### P-3. Causal interpretation
**Lands.** No phrasing rescues it. In particular *"the intervention reorders co-admitted
candidates"* is **not** licensed: the licensed statement is *"among co-admitted candidates, the two
arms' weightings order them differently"*, which attributes the difference to **the two arms'
weightings** — themselves products of 3000 divergent ticks — not to the intervention acting on
ranking.

### P-4. Normalisation
**Partially lands.** `τ_∩` divides by comparable pairs `T(u)`, which is itself `m`-dependent, so
`τ_∩` is not free of set-size effects — it is free of the *exclusive-candidate arithmetic*, which is
a weaker claim. `δ_∩`'s `1/(m−1)` inherits the same ratio-dependence that M22 §5.1 identified in E6.
**Neither quantity escapes normalisation by a treatment-dependent denominator.**

### P-5. Oracle dependence
**Lands on `δ_∩`, not on `τ_∩`.** `δ_∩` inherits every oracle-definition dependency C1 carries, and
is undefined when `v*` is arm-exclusive. `τ_∩` references no oracle. **This is the main reason §9
formulates `τ_∩` rather than `δ_∩`** — and it is also why `τ_∩` can say nothing about alignment or
quality, only about *change*.

### P-6. Candidate-level vs configuration-level aggregation
**Lands as a reporting constraint.** Pairs within one state are *not independent observations* —
they are derived from a single ranking, so `T(u)` pair-counts have strong internal dependence.
Aggregation must therefore be state-level first (one `τ_∩` per state), then configuration-level
(mean over states), and **no pooled pair-count may ever be treated as a sample size**. Descriptive
use only; this dependence would invalidate any inferential use outright.

### P-7. Empty and one-element intersections
**Lands as a blind spot, and it is asymmetric with E6.** At `m ≤ 1`, `τ_∩` is undefined while `δ`
may be perfectly well defined — so the states `τ_∩` can describe are a **proper subset** of those E6
describes, selected on `m`, which is itself treatment-dependent. A **new missingness mechanism**,
not covered by C1's zero-asymmetry result, which would have to be monitored rather than assumed
benign (M22 F-c).

### P-8. Treatment-dependent weights
**Lands, and it is the deepest objection.** Both `w_A` and `w_B` are products of full divergent
histories. `τ_∩` therefore measures **total-history divergence restricted to co-admitted
candidates** — *not* the ranking contribution of the `futureBonus` term. It is a **total effect on a
selected subset**, not a mechanism-isolating measurement. Anyone reading `τ_∩` as "what
`futureBonus` does to ordering" is making the error M22 rejected.

### P-9. Is the apparent ranking signal simply a consequence of admission?
**Partially lands — and the answer has two halves that must not be merged.**
- **Arithmetically, no.** `τ_∩` is computed only over candidates present in both pools, so an
  exclusive candidate cannot contribute a discordant pair. Case Q2 confirms a pure admission
  difference leaves `τ_∩ = 0`.
- **Structurally, yes in part.** The *set* is admission-determined and penalty-truncated (§3.3), so
  the measured value is conditioned on admission even though not arithmetically produced by it.

### P-10. Has the rejected decomposition re-entered under a new name?
**Checked explicitly, because the Director warned of exactly this. It has not — and here is the test
that would catch it.** The decomposition would be back if this memo did any of:

- form `δ − τ_∩` or `δ − δ_∩` and call the residual "admission" — **it does not**;
- report a proportion of the C1 effect as ranking versus admission — **it does not; §0 forbids it**;
- claim `τ_∩` measures "the ranking pathway" — **it does not; §P-3 and §P-8 forbid it**;
- use Q3 to attribute `δ` to admission — **§4 Q3 explicitly blocks that reading**.

`τ_∩` is a **standalone conditional descriptive quantity**, related to `δ` by no identity and by no
decomposition. Its relationship to `δ` is reported as **independent variation** (Q1, Q2), never as
components of a sum.

### P-11. M22's finding that generation itself is treatment-dependent
**Revisited, and it strengthens P-2 rather than being neutralised.** Because `G_a = keys(transitions_a)
∪ N(u)` is arm-dependent, `P_∩` is an intersection of two sets that differ *before* filtering as well
as after. A candidate can be absent from `P_∩` because it was never generated under one arm — not
only because a filter rejected it. **`τ_∩` cannot distinguish those two routes to exclusion**, and
does not attempt to.

---

## 9. The minimum next measurement, as required by the YELLOW gate

> **`τ_∩` — the discordance fraction among co-admitted candidates.** Per decision state with
> `m ≥ 3`: the proportion of comparable common pairs that the two arms' weightings order
> differently. Configuration-level value = unweighted mean over defined states. Reported as a
> distribution across configurations, exactly as C1 reported `Δ`.

**Minimality.** It requires one addition to what M14 already records — nothing beyond pool
membership with weights, which M14 has. It needs **no oracle**, **no phase split** (§2.1.1), no
imputed weight, and no force-admitted candidate.

**It must be reported with the conditioning clause in the estimand's own name**, never as
"the effect of the intervention on ranking."

**Mandatory declarations if it is ever specified:** the `m ≥ 3` boundary and the treatment of
`m ∈ {0,1,2}`, fixed in advance (§7); monitoring of the new `m`-dependent missingness (P-7);
state-level-then-configuration aggregation with pair-counts never used as a sample size (P-6); and
an explicit statement that it is a total-effect measure on a selected subset (P-8).

---

## 10. Recommendation — and it is not to measure this

**M23-YELLOW classifies the quantity. It does not recommend spending a registered block on it, and I
do not.**

**Against measuring:**

1. **The headline is already answered.** `E1 ∈ [10,19]`, never 0, in every C1 configuration (§5).
   That the intervention changes the ranking is committed evidence. `τ_∩` refines the resolution and
   removes the admission confound from the *argmax* statement — genuine, but incremental.
2. **The causal interpretation is rejected** (§3.3), so no result could support a mechanism claim,
   and the North Star requires mechanisms that are *validated*, not merely described.
3. **`δ_∩` correlates 0.957 with `δ` on the only available data** (M22 §P-3). `τ_∩` is a different
   statistic and that figure does not transfer to it — but it is a warning about this family.
4. **P-8 is decisive on transferability.** `τ_∩` measures total-history divergence on a selected
   subset. Handing Noetica *"the two arms' weightings order co-admitted candidates differently"* is
   not handing over a reimplementable mechanism.

**For measuring, stated fairly:** `τ_∩` is the best-posed quantity this line has produced —
oracle-free, with an attainable non-structural null, defined where E6 is not (case 6), not forced by
construction, and cleanly distinct from both E6 and E1. If the Director wants a characterisation of
the scoring rule's ordering stability, this is the correct instrument and I would specify it without
reservation.

**My recommendation: close this branch.** M22 established that the question motivating it has no
answer. M23 establishes that the surviving measurement cannot be causal and is largely a
finer-grained restatement of what `E1` already shows. **A small, well-identified ranking primitive is
more valuable than a large uninterpretable claim — but `τ_∩` is not well-*identified*; it is
well-*defined*, which is a different thing, and the difference is exactly §3.3.**

### 10.1 Highest-value alternative, if the branch closes

The binding constraint is unchanged since M20 and is **not** a missing measurement:

> **No sampling frame exists over configurations.** It forced inference out of C1 (M17), made
> adequacy uncertifiable (M19), bounded M20 to one block, and bounds every successor.

Defining one is a **scientific commitment, not an experiment** — it consumes no seeds and needs no
instrument. Until it exists, every study in this program terminates in a descriptive census of one
block, whatever it measures. **That, not another candidate-ranking quantity, is the highest-value
open question.** I flag it as the alternative rather than proposing it as M24, because choosing to
work on it is a Director decision about the program's direction, not a milestone I should assume.

---

## 11. Evidence → Inference → Hypothesis → Future validation

**Evidence** *(committed record, directly established)*
- **Ev-1.** `penalties` gates admission at `main.js:1610` and enters the weight at `:1754`/`:1878`
  (coefficient 1.5). `getQ` gates at `:1620`.
- **Ev-2.** `E1(c) = |{u : best_ARMED(u) ≠ best_ABLATED(u)}|` (C1 v2.0 §10); C1 measured
  `E1 ∈ [10,19]`, mean 14.69, never 0.
- **Ev-3.** M14 records pool membership with weights for both arms on 4 development fixtures.
- **Ev-4.** The M14 counts in §6 — exercisability only.

**Inference** *(follows mathematically or logically)*
- **In-1.** Conditioning on `c ∈ P_∩` conditions on a post-treatment variable sharing a direct cause
  with the compared weights ⇒ **no causal interpretation** (Ev-1).
- **In-2.** `τ_∩` and `δ` can vary independently in both directions ⇒ **not redundant** (§4).
- **In-3.** `τ_∩` is phase-independent and defined when `v*` is arm-exclusive ⇒ **strictly broader
  definedness than the oracle-anchored quantities**, but undefined at `m ≤ 1` ⇒ **a new
  treatment-dependent missingness mechanism**.
- **In-4.** `τ_∩` is a total-effect measure on a selected subset, **not** a mechanism-isolating one.

**Hypothesis** *(untested)*
- **Hy-1.** Whether co-admitted candidates are reordered in any registered population, and how much.
- **Hy-2.** Whether the §6 development-fixture structure holds anywhere else.
- **Hy-3.** M21's H-4…H-6, unchanged.

**Future validation** *(what would be required before anything is promoted)*
- A sampling frame (§10.1) before any generalisation.
- An identification strategy that does not condition on a post-treatment set — **none is known to
  exist under this architecture** (M22 §5, M23 §3.3).
- Independent replication on a substrate whose admission path does **not** share causes with its
  weighting. *That is an architectural change, not an experiment, and it is outside M23's scope.*

**No cognitive, planning, intelligence, mechanism or engineering-usefulness claim is made or
promoted anywhere in this memo.** A common-set ranking signal is a statement about weight orderings
over a selected candidate subset. It is **not** cognition, **not** planning, **not** intelligence,
and **not** evidence of engineering usefulness.

---

## 12. Next milestone

**None proposed.** M23's output is the YELLOW classification plus the recommendation to close the
branch (§10). The alternative direction is recorded at §10.1 for a Director decision.

**If the Director instead elects to proceed**, the next milestone is
**M24 — `τ_∩` Estimand Specification (formulation only)**, scoped to the mandatory declarations in
§9 and to nothing else: no preregistration, no seeds, no implementation.

**Still outstanding, still untouched, and required before any successor selects seeds:** the
`895000–895999` registry link (M21 §1.7).
