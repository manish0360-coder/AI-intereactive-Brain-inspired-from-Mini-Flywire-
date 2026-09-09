# PLANNING / `futureScore` — DIRECTIONAL DISCRIMINATOR ANALYSIS

**Status:** DRAFT — formulation only. **NOT a pre-registration. No hypothesis is frozen.**
**Date:** 2026-09-09 · **Authority:** Director ruling of 2026-09-09 selecting option (ii)
(threshold-free graded directional discriminator) and directing this analysis.
**Companion:** `PLANNING_FORMULATION_DRAFT.md` at `d499f60`. Section references below are to it.

**Scope.** No experiment was run, no seed was generated or inspected, no sample size was chosen, no
hypothesis was frozen, no pre-registration was written, and no production source was modified. UQ-A
is not reopened; D-011 is not revisited.

**The question this document answers.** Design a scientifically valid, threshold-free **study-level**
directional discriminator for

> *Does the `futureScore` search mechanism improve correct application of acquired knowledge relative
> to its ablation?*

that does not hide treatment-dependent trajectory/arrival selection.

**The answer, stated first.** A causally valid **population** exists and is identified below
(option B, on principal-stratification grounds). A valid threshold-free **study-level directional
rule does not exist**, and §5 proves why rather than asserting it. §6 states exactly what remains
available threshold-free, and §7 gives the minimal honest path, which is not a threshold on an effect
size.

---

## 1. The criterion for threshold-free validity

Threshold-freeness has worked twice in this program — UQ-A §14b (*LIVE iff the argmax flip rate is
strictly greater than zero*) and the M8 H5 accept rule. It is worth being precise about **why** §14b
worked, because that is the test any candidate rule must pass.

> **A threshold-free criterion is scientifically valid when, and only when, the hypothesis it
> discriminates has a STRUCTURAL zero — a null under which the observed quantity is exactly zero as a
> matter of mechanism, not approximately zero as a matter of sampling.**

§14b qualifies: if the exposure is disconnected from the decision, the argmax flip count is exactly
`0`, because the runtime is deterministic and an identical score vector yields an identical argmax.
There is no noise band around zero to threshold away.

**A directional claim has no structural zero.** "The armed arm is more often correct" concerns the
*balance* of two integer counts, both of which fluctuate across configurations for reasons unrelated
to the mechanism — the environment draw, the goal, the trajectory. Under a true directional null the
difference is *approximately* zero, never exactly zero. That single fact governs everything below,
and it is the reason §5 reaches the conclusion it does.

**This is not an argument against option (ii). It is the test option (ii) must pass**, and it is
applied honestly rather than worked around.

---

## 2. What is being compared — the four candidate populations

Notation, fixed pre-data. For configuration `c`, phase `φ ∈ {1, 2}`, and decision state
`u ∈ decisionStates(goal(c))` (19 per configuration, §7 of the memo):

- `V_A(c,φ,u) = 1` iff the ARMED arm arrives at `u` during phase `φ`; `V_B` likewise for ABLATED.
- `a_A(c,φ,u)` = the action ARMED executes at first arrival, defined only when `V_A = 1`; `a_B`
  likewise.
- `R(c,φ,u)`, `H(c,φ,u)` = the reliability- and hop-optimal actions under the `p` in force in phase
  `φ`. **Arm-independent, computed before any run.**

| | Population compared | Missing decisions |
|---|---|---|
| **A** Fixed population, per-arm alignment | all `19 × 2` cells, for each arm separately | cells the arm never reached |
| **B** Common-arrival / flip set | `S = { cells : V_A = 1 AND V_B = 1 }` | none inside `S` by construction |
| **C** All-arrival | every arrival event, weighted by arrival count | none, but weights are arm-dependent |
| **D** Alternative source-supported contrast | see §4 | see §4 |

---

## 3. Option-by-option analysis

### 3.1 Option A — fixed decision-state population, per-arm oracle alignment

**Population.** All 38 cells per configuration, identical for both arms, fixed before data. This is
the only option whose population is manifestly not treatment-selected.

**The dilemma.** `a_A` is undefined where `V_A = 0`, so an alignment count over the fixed population
requires a rule for unreached cells, and there are exactly two:

- **A1 — "unreached counts as not aligned."** No arbitrary neutral score is invented; the statement
  *"the arm did not execute the reliability-optimal action at this cell"* is literally true when the
  arm never went there. **But the resulting quantity is a joint measure of correctness and
  visitation.** An arm that reaches the goal quickly traverses fewer decision states and is *penalised*
  for it. That is precisely the "measures visitation rather than application" failure the Director's
  brief names, and it is worse than a nuisance: the mechanism under test plausibly changes trajectory
  length, so the confound is correlated with the exposure by construction.
- **A2 — rate over the arm's own reached cells,** `n_A / |{V_A = 1}|`. Numerator and denominator are
  both post-treatment, and the denominators differ between arms. The two arms are then scored over
  **different populations**, so the contrast is not a contrast of the same estimand. This is not
  option B; it is strictly worse, because B at least compares both arms over one common set.

**Verdict on A.** The fixed population is the right instinct and the wrong outcome. A1 measures
visitation; A2 silently changes the estimand between arms. **Rejected — but see §4, where the fixed
population is recovered by changing the outcome rather than the imputation rule.**

| Criterion | A1 | A2 |
|---|---|---|
| population treatment-selected | no | **yes, and differently per arm** |
| post-treatment selection | no | yes |
| missing handled without inventing a neutral score | yes | n/a |
| measures application, not visitation | **no** | partly |
| can establish direction | yes, but of a confounded quantity | no |
| threshold-free | see §5 | see §5 |
| freezable pre-data | yes | yes |
| hidden conditioning | none | **denominator is post-treatment** |

### 3.2 Option B — common-arrival / flip-set analysis

**Population.** `S(c,φ) = { u : V_A = 1 and V_B = 1 }` — cells both arms reach. The flip set is the
subset of `S` where `a_A ≠ a_B`.

**The objection, and why it does not hold.** The obvious charge is post-treatment selection:
membership in `S` depends on trajectories, and trajectories are caused by the exposure. In an ordinary
randomised experiment that charge would be decisive.

**It does not apply here, and the reason is a property of this design that should be stated
explicitly because it is unusual.** This is not a randomised trial with one arm observed per unit.
The runtime is deterministic given `(configuration, agent seed, arm)` — verified on the committed
UQ-A evidence, where every configuration was run under **both** arms and re-running reproduced every
recorded value byte-for-byte. **Both potential outcomes are computed for every unit.**

Consequently, for each cell the pair `(V_A, V_B)` is a **deterministic function of the unit**, not of
any assignment. `S` is the *always-visited principal stratum*, and:

1. Stratum membership is **assignment-invariant** — identical whichever arm is being examined.
2. Stratum membership is therefore **not a collider** on any path from arm to outcome; conditioning on
   it induces no selection bias between arms.
3. The stratum is **directly observed**, not latent. In a real-world experiment principal strata must
   be inferred under assumptions; here they are computed.

**The contrast within `S` is therefore an internally valid causal estimand:** the effect of the
mechanism on action correctness **among decision-state cells that both arms would reach.** That is a
principal-stratum effect, and it is exactly the object the scientific question asks about — *given
that the agent is at this decision, does the mechanism make its choice better?*

**What the objection correctly limits is scope, not validity.** `S` is not the full population. Cells
reached by only one arm are excluded, and the effect there is not estimated by this contrast. That is
a stated limitation of the estimand, not a bias in it. The one-armed and never-reached cells must be
**counted and reported** — they are the description of the stratum, and reporting a stratum effect
without its stratum sizes would be the same error as reporting a ρ without its coverage.

**Missing decisions.** None arise inside `S`. No neutral action is invented, and none is needed. This
is the only option with that property.

| Criterion | B |
|---|---|
| population treatment-selected | membership is assignment-invariant → **not selection bias** |
| post-treatment selection | conditioning is on a principal stratum, which is causally licensed |
| missing handled without a neutral score | **yes — none arise** |
| measures application, not visitation | **yes** — both arms stood at the same decision |
| can establish direction | at the per-configuration level, yes; at study level see §5 |
| threshold-free | per comparison yes; study level see §5 |
| freezable pre-data | yes — the rule is frozen; membership is computed after |
| hidden conditioning | **declared, not hidden** — the stratum must be reported with its sizes |

**Verdict on B.** The only causally valid population for a correctness comparison. Adopted.

### 3.3 Option C — all-arrival analysis

Every arrival contributes, so a cell visited eleven times by one arm and twice by the other dominates
the comparison in proportion to revisit counts. **Revisit counts are caused by the exposure** — they
are the arm's looping and dwelling behaviour. Weighting correctness by them makes the outcome a
mixture of correctness and trajectory shape, and unlike A1 the mixture weights differ per arm.

There is no version of C that repairs this without collapsing to first-arrival, which is B.

**Verdict on C. Rejected.** It measures visitation most directly of the three.

### 3.4 Option D — a superior source-supported comparison

Two genuinely different contrasts are available from committed source. Both are recorded; neither is
proposed for adoption in this document.

**D1 — realised cost against the oracle's optimum.** `env.getCounters()` records `attempts`,
`successes` and `slips` per run, and `expectedCostToGoal(p, goal)` (`env.js:325`) gives the oracle's
minimum expected attempts from any state. A per-run *excess cost over optimal* is defined for every
run regardless of where it went, needs no imputation, and requires no conditioning of any kind.

**Why it is not adopted:** it measures **policy optimality**, not correct application of knowledge at
a decision. It aggregates exploration, learning, environment luck and planning into one number, and
attributing a difference in it to the search mechanism would be exactly the decomposition UQ-A §2
declares unidentifiable at any sample size. It answers a different, coarser question.

**D2 — a magnitude-preserving, information-destroying control arm.** Instead of ablating
`futureBonus` to `0`, replace each candidate's `futureBonus` with the value computed for a *different*
candidate at the same tick, under a pre-declared deterministic permutation. The term's magnitude,
scale and RNG consumption are preserved exactly; only its **coupling to the candidate it describes**
is destroyed.

This is scientifically the strongest idea in this analysis, because it separates two things the
ARMED/ABLATED contrast cannot:

- **ARMED vs ABLATED** — the total effect of *having* the term.
- **ARMED vs SHUFFLED** — the effect of the term's *information content*, with its magnitude held
  fixed.

Given §1.2 of the memo — the term's fourth component is an information-free random field — this is
the contrast that directly interrogates hypothesis P4 (*live but normatively random*) rather than
leaving it to be inferred.

**Why it is not adopted here:** it is a **third arm**, and therefore a scope increase requiring its
own neutrality analysis, its own liveness question, a ruling on the permutation's definition, and
tripled collection. It is recorded in §7 as the recommended structural answer to the problem §5
identifies, and it is not smuggled in as a discriminator choice.

---

## 4. Recovering the fixed population — and why it does not rescue direction

For completeness, since option A's instinct is sound: the fixed population *can* be used without
imputation if the outcome is redefined so that it is total on the population. The natural candidate
is a per-cell three-valued label `{ ARMED-aligned, ABLATED-aligned, no-comparison }`, where the third
value covers one-armed and never-reached cells and is **reported, never scored**.

That is a faithful description of the fixed population — and it collapses, for every comparative
purpose, to option B plus a stratum-size report. The comparison still happens only where both arms
acted, because that is the only place a comparison exists. **The fixed population disciplines the
reporting; it does not create additional comparable cells.**

This is worth stating because it forecloses a tempting move: no reweighting or reallocation of the
non-comparable cells can manufacture a comparison there, and any rule that appears to do so is
imputing an action under another name.

---

## 5. The study-level rule — why no valid threshold-free directional rule exists

Option B fixes the population. It leaves the question the Director's ruling actually turns on: given a
per-configuration, per-phase integer difference

```
δ(c,φ) = n_A(c,φ) − n_B(c,φ)
```

— where `n_A` counts cells in `S(c,φ)` at which ARMED executed `R(u)`, and `n_B` likewise for
ABLATED — **what threshold-free study-level rule turns the collection of `δ` values into a
direction?**

Exactly two families of threshold-free rule exist over a set of integers, because threshold-freeness
permits only strict comparison and logical quantification. There is no third.

### 5.1 Family 1 — universal quantification (dominance)

> **ARMED-DOMINANT** iff `δ(c,φ) ≥ 0` for every `(c,φ)`, with `> 0` for at least one.
> **ABLATED-DOMINANT** iff `δ ≤ 0` everywhere, with `< 0` somewhere.
> **NULL** iff `δ = 0` everywhere. **MIXED** otherwise.

**Causally clean, freezable, refutable by a single counterexample, and conservative by
construction** — noise cannot manufacture a direction, because noise produces MIXED.

**But its directional verdicts are practically unreachable.** With a population on the order of a
hundred configurations × two phases, a single configuration with a sign opposed to the trend forces
MIXED. Any mechanism whose effect is not perfectly uniform across every environment draw returns
MIXED with near-certainty, and §1.2 of the memo gives a specific mechanistic reason to expect
non-uniformity: an additive information-free field of weight `0.8` sits inside the term.

**A criterion whose informative verdicts essentially cannot fire is vacuous**, and vacuity is the one
failure mode this program has ruled on most consistently (M7-ERR-10; D-007 §4 retiring Q1 §9.5 for
being *"vacuous at every n"*). Dominance therefore cannot be the study's directional rule. It remains
useful as a *reported verdict* — see §6 — but not as the answer to the direction question.

### 5.2 Family 2 — strict comparison of aggregate counts (sign)

> **Direction = sign(N_A − N_B)**, where `N_A = Σ δ⁺` and `N_B = Σ δ⁻` over configurations, or
> equivalently the sign-majority over per-configuration `δ`.

**Reachable, decisive, and it always returns a direction.** It introduces no constant: `>` between
two integers is not a threshold.

**And that is exactly its defect.** It returns a direction *unconditionally*, including under a pure
null. Applied to the committed UQ-A evidence, this rule would have read the ρ-phase-1 direction counts
`{armedHigher: 50, ablatedHigher: 45, equal: 1}` as **"direction established: armed higher."** We
correctly refused to say that. Adopting a rule now that would have licensed it is not progress toward
option (ii); it is a regression in rigour wearing option (ii)'s clothing.

Distinguishing `50 : 45` from noise requires knowing the scale of variation under the null — which is
inference, and inference requires either a test or a threshold. Threshold-freeness cannot supply it.

### 5.3 The impossibility, stated exactly

> **A threshold-free study-level rule over `{δ(c,φ)}` is either conservative and vacuous (Family 1) or
> reachable and noise-susceptible (Family 2). No threshold-free rule is both non-vacuous and
> noise-immune.**
>
> This follows from §1: threshold-freeness is valid only against a structural zero, and a directional
> claim about the balance of two fluctuating integer counts has no structural zero. The obstruction is
> in the *hypothesis*, not in the aggregation, and no cleverness in the aggregation removes it.

**Therefore: no valid threshold-free study-level directional discriminator exists for this question.**

This is reported because the ruling explicitly invited it. It is not a refusal to design one, and it
is not a re-litigation of option (ii): option (ii) was the right thing to test, and this is the result
of testing it.

---

## 6. What IS available threshold-free, and should be frozen

All three layers below have structural-zero or single-counterexample nulls, are causally interpretable
on the option-B population, are freezable before data, and are non-vacuous — each can return more than
one outcome, and each outcome can genuinely occur.

**Layer 1 — existence (structural zero).**
> Is the flip set empty?
Decides **P0**. Null is exactly zero by determinism. Immune to the §3.2 stratum restriction, because
existence claims do not depend on how the comparison set was reached.

**Layer 2 — universal alignment forms (single counterexample).**
> Does every flip satisfy `a_A = R(u)` / `a_A = H(u)` / `a_B = R(u)` / neither?
Decides the strong forms of **P1, P2, P3, P4**. Each is refuted by one counterexample. The P4 vacuity
guard from §10 of the memo carries forward: P4 is evaluated on the full flip set, never on the
decisive subset where its falsifier would be construction-guaranteed.

**Layer 3 — the dominance verdict, reported and not overclaimed.**
> `{ ARMED-DOMINANT, ABLATED-DOMINANT, NULL, MIXED }` per §5.1, reported **per phase, never pooled**,
> with the stratum sizes.
Non-vacuous *as a verdict* — MIXED is a substantive finding about configuration-dependence, and the
dominant verdicts, though unlikely, are not impossible. It must be pre-declared that **MIXED
establishes no direction**, so that the near-certain outcome is named in advance rather than
discovered afterwards.

**Mandatory reporting alongside, all of it:** stratum sizes `|S(c,φ)|`; counts of one-armed and
never-reached cells per arm; the per-configuration `δ` values; and the phase-2 R5-disagreement count
per configuration, which §4.2 of the memo showed the acceptance predicate does not guarantee.

**What layers 1–3 deliver:** whether the mechanism is live at decision states, whether it is purely
aligned with either normative standard, and whether its effect on correctness is uniform. **What they
do not deliver: direction under MIXED.**

---

## 7. The minimal honest path

Two options. They are not equivalent, and I recommend the second.

**(α) Freeze layers 1–3 and declare in the frozen text that direction is not established under
MIXED.** This is option (i) reached honestly — after testing option (ii) and finding the obstruction
is in the hypothesis rather than the aggregation. Cheapest, fully D-011-complete, and its limitation
is declared before data. It leaves the motivating question unanswered.

**(β) Freeze layers 1–3 and add the D2 shuffled control arm, with its comparison rule frozen in
advance.** This is option (iii) in D-011's sense — it does require a pre-declared constant — but the
constant is of a fundamentally better kind than an effect-size threshold:

> Under (β) the noise scale is supplied **by the mechanism itself**, not chosen. A rule of the form
> *"ARMED is more `R`-aligned than every one of K pre-declared deterministic shuffles"* has one
> constant, `K`, which governs resolution rather than stringency, and which cannot be tuned toward a
> desired verdict because the shuffles are generated from pre-declared seeds. An effect-size threshold
> has a constant that **is** the verdict.

(β) also converts hypothesis **P4** from something inferred into something contrasted, which given
§1.2 of the memo — the term's fourth component is an information-free field — is the sharpest
available question about this mechanism.

**Cost of (β), stated plainly:** a third arm, tripled collection, its own neutrality and liveness
analysis, and a Director ruling on the permutation's exact definition. It is a larger study.

**Recommendation: (β).** (α) buys honesty at the price of a study that cannot answer the question that
made this mechanism worth selecting. (β) answers it, and the constant it introduces is calibrated by
the mechanism rather than chosen for it.

---

## 8. Exact specification, for adversarial review before any freeze

Stated precisely enough to be attacked. **Nothing here is frozen.**

**Population (option B, on the §7 fixed frame of the memo).** For each accepted configuration `c` and
phase `φ ∈ {1,2}`, over `u ∈ decisionStates(goal(c))` (19 per configuration):

```
S(c,φ)  = { u : V_A(c,φ,u) = 1 AND V_B(c,φ,u) = 1 }        the always-visited principal stratum
FLIP    = { u ∈ S : a_A(u) ≠ a_B(u) }
DECISIVE= { u ∈ FLIP : R(u) ≠ H(u) AND {a_A(u), a_B(u)} = {R(u), H(u)} }
```

`V`, `a` are taken at **first arrival within the phase** (memo §6). `R`, `H` use the `p` in force in
phase `φ` (memo §5). Phases are never pooled. Self-loops are excluded per D-009.

**Per-unit outcome.** `δ(c,φ) = |{u ∈ S : a_A(u) = R(u)}| − |{u ∈ S : a_B(u) = R(u)}|`.

**Study-level verdicts.** Layer 1 and Layer 2 as in §6; Layer 3 the four-valued dominance verdict per
phase, with MIXED pre-declared to establish no direction.

**Mandatory joint reporting.** `|S(c,φ)|`; one-armed and never-reached counts per arm; every
`δ(c,φ)`; `|FLIP|` and `|DECISIVE|`; the phase-2 R5-disagreement count per configuration.

**Declared limitations, to be carried into any pre-registration verbatim.**

1. The estimand is a **principal-stratum effect** on the always-visited stratum, not a
   population-average effect. Its validity rests on both potential outcomes being computed for every
   unit, which holds only because the runtime is deterministic given `(configuration, agent seed,
   arm)`. **If that determinism ever fails, this estimand fails with it.**
2. Cells reached by one arm only are **not** evidence of correctness in either direction and are
   reported, never scored.
3. **No direction is established under MIXED**, and no post-hoc rule may be added to extract one.

**Where to attack this.** For an adversarial reviewer, the load-bearing claims are: §1's structural-
zero criterion; §3.2's principal-stratification argument, which is the whole basis for option B;
§5.3's impossibility claim; and §7(β)'s assertion that a shuffle-calibrated constant is categorically
different from an effect-size threshold. If §3.2 is wrong, option B is invalid and only §4's reporting
frame survives. If §5.3 is wrong, a threshold-free directional rule exists and (β)'s cost is
unnecessary.

---

## 9. What this document authorises

**Nothing.** It is formulation analysis. No hypothesis is frozen, no pre-registration exists, no
parameter or seed is selected, no production source is modified, no arm is implemented, and no
liveness check has been run.

The next milestone requires its own authorisation.
