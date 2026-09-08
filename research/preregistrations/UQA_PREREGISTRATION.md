# UQ-A Pre-Registration — Causal Contribution of the Uncertainty-Regulated Decision Mechanism

**Version:** 1.0 (frozen)
**Date:** 2026-09-03 · **Author:** Chief Systems Engineer
**Authority:** Research Director authorization of 2026-09-03, following the UQ-A identifiability
audit (**GO — METRIC IDENTIFIABLE**) and independent review (**ACCEPT — scientifically identifiable
as specified**)
**Baseline:** git HEAD `3580685440790fd1c2e140d49024824f5d10bff7`
**Predecessors:** M7 frozen `707cb1e` · M8 evidence `f9d97b9` · M9 `04dda03`/`9044c3b` · Q1
`d16d568`/`057ceb0`/`21c7238` · decisions D-001…D-010

> **THIS DOCUMENT IS FROZEN BEFORE ANY MEASUREMENT EXISTS.** No instrumentation is implemented, **no
> liveness pre-check has been run**, no collection has been executed, and no configuration seed has
> been generated or inspected. Its digest is recorded in `UQA_PREREGISTRATION.sha256`. Change arrives
> only as a numbered erratum that quotes this text and binds to its digest; the text is never
> rewritten.
>
> **Every design decision below is frozen. No Director decision remains open.**

---

## 1. Scientific question

> **Does the existing uncertainty-regulated decision mechanism improve the alignment of the agent's
> final learned value structure with environmental reliability?**

This is a question about an **already-implemented** mechanism, not a proposal to add one. §3 records
what exists.

## 2. Causal estimand

**The TOTAL causal effect** of the uncertainty intervention on final learned-value alignment.

Coverage/visitation is a **mediator**, not a confound: the exposure is assigned, and visitation is
caused by it. Conditioning on a mediator would bias the estimate and would answer a
counterfactually incoherent question.

**Frozen prohibitions.** Do **not** adjust for coverage. Do **not** condition the primary outcome on
visited entries. Do **not** attempt to decompose the effect into exploration versus value-updating
contributions. **No such decomposition is identifiable under this design, at any sample size.**

## 3. Established repository facts

Verified from committed source at `3580685`. **These are facts, not hypotheses.**

| | Fact | Source |
|---|---|---|
| F1 | Uncertainty estimation exists and is consumed | `uncertaintyEngine.js` (291 lines), `uncertaintyLedger.js` (516 lines); `main.js:334–343, 404–408` |
| F2 | Uncertainty already conditions the decision score | `scoring.js:315` — `uncertaintySemanticDamp = 1.0 - Math.min(uncertaintyScore * 0.5, 0.4)`, applied at `:344, :345, :404` |
| F3 | Uncertainty also enters arbitration | `executiveController.js:196–197` — `pressureUncertainty = normalizeComponent(uncertaintyScore, 0, 3)` |
| F4 | The two are blended 60/40 | `main.js:2253` — `arbitratedScore = finalWeight * 0.60 + competitiveScore * 0.40` |
| F5 | Q is a signed scale, floored at −20 | `qlearning.js:335`, with `dampQ` guarding *"negative Q should not be dampened further"* |
| F6 | Q key is `"pos#goal->action"`; absent reads as 0 | `qlearning.js:40, 61, 63` |
| F7 | `p_e` is per connections.json entry and symmetric over both traversal directions | `env.js:12–21`, verified: 39 entries, 39 distinct undirected pairs, 0 duplicates, 0 self-loops |
| F8 | A committed total projection from ordered pair to edge index exists | `env.edgeIndexOf(a, b)` — `env.js:311` |
| F9 | Spearman with mid-rank tie averaging is committed | `env.js`, used by four verifiers |
| F10 | `qlearning.js` contains **zero** references to `uncertain*` | the outcome is independent of the exposure's own signal |
| F11 | Goal is constant per headless run | `main.js:1114` sets it from `__M7_GOAL__`; `:3284` is inside a `/* */` block; `:3305`/`:4179` are gated on `window.homeNeuronId`, never defined headless (M9 §7); `:5211` needs KeyR+shift; `:5358` needs a click |
| F12 | Phase switches at `T_SHIFT = 1500` | `env.js:43, 470` |
| F13 | M7 arms are locked | `arms.js:58` — `LOCKED_ARMS` includes A1; **a new arm may not be added to M7** |
| F14 | **A committed prior experiment confirmed a wired-looking pathway was INERT** | `experiments/exec_influence/report.json` (M1, seed 12345, 400 trials, 6,400 events): `Q1_influence_delta_60pct_path: 0`, `Q1_argmax_flip_rate_60pct: 0`, verdict *"executive controller has ZERO influence on the 60% scoring path due to a field-name mismatch ({exploit,explore} expected, {wReward,...} supplied)"*. The 40% arbitrate path was live: `Q3_influence_delta_40pct_arbitrate: 0.486548` |
| F15 | **The uncertainty parameter is NOT subject to that mismatch — both exposure sites are live** | `main.js:2073` passes `uncertaintyScore: uncertaintyScoreValue` into the literal destructured at `scoring.js:151` as `uncertaintyScore`; `main.js:2245` passes the same name into `arbitrate`, destructured at `executiveController.js:145`. **Names match at both sites.** Verified explicitly because of F14 |

## 4. Hypotheses and predictions — NOT facts

| | Hypothesis | Prediction under the primary outcome |
|---|---|---|
| **H0** | The pathway is **inert** | ρ is materially indistinguishable between arms, and coverage is comparable |
| **H1** | The pathway is a **regulator** improving alignment | ρ is higher with the pathway armed |
| **H2** | The pathway is **cosmetic** — score changes absorbed downstream before affecting representation | ρ comparable, but coverage may differ |
| **H3** | The pathway **degrades** alignment | ρ is lower with the pathway armed |

**No hypothesis is favoured.** H3 is stated explicitly because a mechanism that has never been
ablated may be harmful, and a design that cannot express that is not a test.

**H2 is not a theoretical worry in this codebase — it is a demonstrated failure mode.** F14 records a
committed prior experiment that confirmed the executive controller had **exactly zero** influence on
the 60% scoring path, through a silent field-name mismatch that a code reading would not reveal.
That is why §14a is a pre-registered protocol component rather than an optional check, and why F15
was verified explicitly rather than assumed.

**No threshold is pre-registered for "materially indistinguishable"** — see §11.

## 5. EXPOSURE — **FROZEN: E-BOTH**

Ruled by the Director on 2026-09-03. F2 and F3 establish that uncertainty enters the decision at two
independent sites, blended 60/40 (F4). **The intervention is E-BOTH: both sites.**

| Arm | Definition |
|---|---|
| **ARMED** | the committed behaviour — `uncertaintyScore` reaches `scoring.js:151` and `executiveController.js:145` unchanged |
| **ABLATED** | `uncertaintyScore` is delivered as **exactly `0`** at **both** read sites |

**The ablated value is frozen at `0`**, which is the parameter's own committed default
(`scoring.js:151` — `uncertaintyScore = 0`). It is therefore the neutral value the architecture
already defines, not a chosen constant. At that value `uncertaintySemanticDamp` evaluates to `1.0`
(no damping) and `pressureUncertainty` to `normalizeComponent(0, 0, 3)`.

**Both sites are ablated together and are never separated.** E-SCORE and E-ARB — ablating one site
only — are **not part of UQ-A**. They may be run only as separately pre-registered successor
studies, and **never selected after seeing a UQ-A result**.

**Rationale, recorded:** §1 asks about "the uncertainty-regulated decision mechanism". Ablating one
site would leave a substantial fraction of that mechanism live and make a null result
uninterpretable.

## 6. Primary outcome

**Spearman rank correlation ρ** between:

- **x** — the final-run Q value for each population entry: `Q.get(makeStateKey(pos, goal) + "->" + action)`, **absent ⇒ 0**, read once at end of run;
- **y** — the environmental edge reliability `p_e` for that entry, obtained via `env.edgeIndexOf(pos, action)`.

Computed with the repository's committed Spearman implementation (F9), **mid-rank tie averaging**,
returning 0 when either variable is constant.

## 7. Fixed population

**All 78 valid directed adjacencies** — both directed traversals of each of the 39 physical
connections (F7). **The same population is evaluated in both arms.** The population is fixed a
priori and is arm-independent.

## 8. Unvisited entries

An absent Q entry is assigned **Q = 0**, exactly the repository's existing read semantics (F6).

**Interpretation, frozen:** Q = 0 is the **neutral pre-learning representation** — *the learning
process formed no preference for that state-action pair*. This is legitimate because Q is a signed
scale floored at −20 (F5), so 0 is the neutral midpoint, not the bottom.

**Never:** exclude unvisited entries · threshold them · impute any other value · select
treatment-dependent subsets.

## 9. Non-edge entries

Entries for which `env.edgeIndexOf(pos, action)` is **undefined** are excluded — no ground-truth
`p_e` exists for them. **The excluded count is reported per arm.**

## 10. Frozen measurement rules

| | Rule |
|---|---|
| **Direction** | Both directed traversals kept **separately**. No averaging, no max across directions. `p_e` is symmetric for the physical edge; Q remains directional. |
| **Goal** | The existing goal namespace exactly as the headless substrate supports it (F11 — one goal per run). **No additional goal aggregation is invented.** |
| **Phase** | Q evaluated **once at end of run**. Report `rho(Q_final, pPhase1)` and `rho(Q_final, pPhase2)` **separately. Never pooled.** |
| **Phase interpretation** | Phase 1 correlation = **retention/interference** of final cumulative knowledge relative to the first environmental regime. Phase 2 correlation = **adaptation** of final cumulative knowledge to the second regime. **These must never be called "Phase 1 performance" or "Phase 2 performance."** |
| **Q sign** | **Raw Q values.** Not clipped to non-negative. |
| **Ties** | The repository's committed Spearman with mid-rank tie handling. Ties are **structural**: each of the 39 `p_e` values appears twice across the 78 directed entries. |

## 11. Statistics

**Descriptive only** — the ρ values, coverage counts, and exclusion counts.

**Prohibited, and not addable after data exists:** p-values, confidence intervals, hypothesis tests,
significance claims, effect sizes, models, and any post-hoc statistical addition. A method may enter
only through a numbered erratum frozen before it is computed, carrying a fully specified null,
statistic, threshold and decision rule.

**Consequence, stated plainly:** this design reports whether ρ differs between arms and by how much,
**descriptively**. It does not test whether that difference is "significant", and no such claim may
be made.

## 12. Coverage — mandatory co-primary diagnostic

**Coverage** = the number of the 78 fixed-population entries for which an **explicit Q entry exists**
at end of run. Reported **per arm, per configuration**, alongside every ρ.

**Coverage must NEVER be used as an adjustment.** Coverage is **part of the total causal pathway**;
differences in coverage between arms are **themselves part of the treatment effect** (§2).

## 13. Interpretive limits

The primary outcome measures **alignment of the final learned value structure with environmental
reliability**.

It does **NOT** measure: absolute Q accuracy · learning speed · policy optimality · general
representation quality · the separate contribution of exploration versus value updating.

**No causal language beyond the total effect.** The design licenses *"arming the pathway changes
alignment by X"*. It does not license claims about why, about mechanism sufficiency, or about any
connection to the M7 G15 outcome. Q1 §7's ban on "proximate cause" carries forward.

## 14. Design

**Paired two-arm ablation.** Every accepted configuration is run under both arms — armed and
ablated — with all other parameters identical. Pairing is exact because the runtime is deterministic
given seed, arm and configuration.

**Unit of analysis:** the **configuration**, not the entry. *n* = number of accepted configurations,
never 78 and never 156. This inherits the M7 §C6 discipline (*"unit of analysis the configuration —
n = 41, not 26143 events"*).

## 14a. Liveness pre-check — a pre-registered protocol component

**Ordering, frozen.** This document is **frozen and committed BEFORE the liveness pre-check is
run.** The liveness result therefore cannot influence the protocol definition or the exposure
selection, both of which are already fixed by §5. Sequence:

```
FREEZE this document  →  run the liveness pre-check  →  LIVE: run the main collection
                                                     →  INERT: stop per §14c
```

**Motivation, from committed evidence.** F14 records that this architecture has already produced a
**confirmed-inert** pathway that read as wired. A pathway that never changes the executed decision
cannot change any representation, because representation is written along the executed trajectory
only.

### 14b. The liveness criterion — fixed before execution

**Method, inherited from `experiments/exec_influence/run.js` (M1), not invented.** A seeded battery
calls the real `calculateDecisionScore` and `arbitrate` directly over candidate sets and compares the
ARMED against the ABLATED exposure of §5. **Battery parameters inherited from M1 exactly** — seed
`12345`, `N = 400` trials, 4 candidates per decision — so the result is directly comparable with the
committed M1 figures. **It consumes no configuration seed and runs no collection.**

**What is measured** — both are M1's own metrics, computed on the blended `arbitratedScore`
(`main.js:2253`, 60% scoring + 40% arbitrate):

| Quantity | M1 analogue |
|---|---|
| **argmax flip rate** — the fraction of trials in which ablation changes *which candidate wins* | `Q1_argmax_flip_rate_60pct` |
| **influence delta** — the magnitude of score change under ablation | `Q1_influence_delta_60pct_path` |

**The criterion, frozen and threshold-free:**

> **LIVE** iff the **argmax flip rate is strictly greater than zero**.
> **INERT** iff the **argmax flip rate is exactly zero**.

**Why the argmax and not the delta.** The criterion is discrete and requires no threshold, and it is
mechanistically exact: only the winning candidate is executed, so a pathway that never changes the
winner cannot change the trajectory and therefore cannot change the learned representation. **No
threshold is introduced, and none may be added.**

**The influence delta is reported alongside as a mandatory diagnostic, never as the criterion.** A
**non-zero delta with a zero flip rate is precisely the H2 "cosmetic" signature** and must be
reported in those terms.

### 14c. Inertness disposition — frozen

If the exposure is **INERT**:

1. **The main collection must NOT be run.** No configuration seed is consumed.
2. The UQ-A result is reported as **EXPOSURE INERT — MAIN COLLECTION NOT RUN**, with the flip rate
   and influence delta.
3. **The exposure must not be silently changed** — E-SCORE and E-ARB remain outside UQ-A (§5).
4. **The implementation must not be repaired and re-run under this protocol.** If a defect is found
   in the ablation mechanism itself, that is a verification failure under §20, reported as such, and
   any corrected attempt requires a new pre-registration.
5. **No new configuration, range or battery may be generated** in response.
6. UQ-A closes on that disposition.

**The liveness check is a pre-condition, never an adaptive mechanism.** Its numbers are never
reported as UQ-A results, never enter §6, and may not modify any frozen element of this document.
Its only two permitted effects are: proceed to §14/§19 as written, or stop under §14c.

## 15. Instrumentation-neutrality requirements

Inherited from Q1 §11 and the M7 postmortem invariants, unweakened:

- **No production source modification.** The exposure is delivered by the committed guarded-hook
  technique (ESM load hook + in-memory source transform), as Q1 did. **OPEN:** the exact hook design.
- **No new M7 arm** (F13 — `LOCKED_ARMS`). The exposure is a UQ-A-scoped guard, not an M7 arm.
- Default-off; with the guard unset the build must be **bit-identical** to HEAD.
- The measurement must consume no RNG, alter no environment or agent state, introduce no async
  boundary, and read Q by `Map` read only (non-mutating).
- **The ablation must change exactly the intended sites and nothing else**, verified by mutation
  control, not assertion.

## 16. Reproducibility

Inherited from Q1 §12: deterministic; digest-pinned artifacts; identical verdicts in the authoring
tree, a `git archive` materialization and a fresh CRLF checkout. **No dependence on** filesystem
metadata, mtime, wall-clock time, network access, undeclared seeds, or input ordering.

## 17. Seed governance — FROZEN

> ### Configuration-seed block: **`898000–898999`**
>
> **1,000 seeds · four frozen goal indices per seed · 4,000 candidate configurations.**

Ruled by the Director on 2026-09-03 (option S-1000).

**Placement determined by precedent.** Every prior block is a contiguous run terminating immediately
below the previously consumed block: M7 `900000–900499`, M8 `899500–899999` (D-003 H), Q1
`899000–899499` (D-006 §1 A). This block begins immediately below `899000`.

**Size — the recorded Director rationale.** §18 fixes the minimum at 20 accepted configurations by
precedent. The prior Q1 block of 500 seeds produced 17 accepted configurations, so a 500-seed block
has historically been insufficient on the observed yield. **1,000 is the smallest proposed block
providing reasonable capacity for the frozen minimum without introducing adaptive extension.** This
is a **pre-data design decision, not an optimisation for any expected outcome** — no UQ-A result is
expected, predicted or optimised for anywhere in this protocol.

**Yield is not a guarantee.** D-006 §7 dependency 6 records that acceptance yield is not a stable
planning constant. An under-yield is absorbed by §19's stopping rule, **never by extension**.

**Boundaries, frozen.** Contiguous and explicitly enumerated. Every candidate evaluated **directly at
its own seed** — no acceptance walk (the M7-ERR-09 §3.3 discipline). Disjoint from Q1
`899000–899499`, M8 `899500–899999`, M7 `900000–900029` and `900030–900499`. Strictly below the
held-out floor `900500`, which is **never generated, inspected or inferred**. Disjointness is
arithmetic: `898999 < 899000 <=` every consumed and held-out seed.

## 18. Minimum evidence

**Inherited from precedent where it genuinely transfers; not invented where it does not.**

**FROZEN: at least 20 accepted configurations**, each run under **both** arms. This is the
twice-established project figure — D-003 B set it for M8, and D-006 §1 E inherited it for Q1
"in form from M8 §12 … because that form is the established project precedent". It transfers to
UQ-A unchanged because the unit of analysis is the configuration in all three studies.

**Per D-006 §4, this number is a pre-data Director judgment, not mechanically required by source,
and must never be represented as such.** §11 pre-registers no test and no precision target, so no
mechanical anchor exists.

**Not imported, with the reason recorded:**

- **The 100-DESYNC-event minimum** — UQ-A has no DESYNC observable. It does not apply.
- **The 15-per-stratum minimum** — M8 and M9 pre-registered the goal-degree stratifier as
  scientifically relevant to their outcomes; **UQ-A's §6 primary outcome is not stratified.**
  Importing a threshold for an analysis this protocol does not perform would be arbitrary rather
  than conservative.

**The protective function is not lost, it is served differently.** The risk a per-stratum minimum
guards against is a degenerate or unbalanced sample. In UQ-A that risk is structurally removed:
**the design is paired**, so both arms see exactly the same accepted configurations by construction,
and the comparison cannot be distorted by which configurations were accepted.

**Replacing the threshold with a transparency requirement:** the goal-degree composition of the
accepted configurations (degree 5 = goals 8, 12; degree 3 = goals 16, 19) is **reported** with the
result. It is a disclosure, **never a threshold and never a filter**.

## 19. Stopping rule — frozen

Inheriting D-006 §5 unchanged: enumerate the **entire** §17 range; evaluate every
candidate **directly at its own seed** (the M7-ERR-09 §3.3 discipline — no acceptance walk); collect
every accepted configuration; **never extend the range for any reason**, including an observed
under-yield; **never adapt collection after observing any result**; if any minimum-evidence condition
is unmet, the result is **INCONCLUSIVE — INSUFFICIENT MATERIAL**, naming the failing condition, with
**no additional sampling permitted**.

## 20. Failure rules

The study halts and reports rather than repairing, if: a run violates the seed boundary; an incorrect
arm, agent seed or tick budget is used; instrumentation neutrality fails; evidence is incomplete or
corrupt; determinism fails; or the two arms are not exactly paired. **No silent repair, no
substitution, no range extension.**

## 21. Analysis lock

**Exactly one primary outcome** (§6), frozen before any data exists. The analysis population (§7),
exclusions (§8, §9), phase handling (§10), tie handling (§10) and reporting format (§22) are frozen
with it. **No alternative primary outcome may be selected after collection, and no secondary
outcome may be promoted to primary.**

## 22. Reporting requirements

Every report must carry, together: `rho(Q_final, pPhase1)` and `rho(Q_final, pPhase2)` **per arm,
never pooled**; **coverage per arm**; the **non-edge exclusion count per arm**; the number of
accepted configurations; and the §13 interpretive limits. A ρ difference reported without its
coverage is a protocol violation.

## 23. Prohibitions

UQ-A does **not**: modify, regenerate, re-collect, subset or re-derive any M7, M8, M9 or Q1 artifact;
add an M7 arm; modify production source; introduce any observable beyond §6 and §12; touch, generate,
inspect or infer anything about the held-out block `>= 900500`; use the M7 G15 outcome as a target;
or pool its denominator with any predecessor study.

## 24. Open implementation details

Not scientific decisions; each must be resolved and verified before collection, none may be chosen
from results: the exposure hook design (§15) · the guard name and scope · the verifier's mutation
controls · the artifact format and integrity sidecar · the fixture band for implementation testing.

## 25. Scientific status summary

| Category | Content |
|---|---|
| **Established repository facts** | F1–F13, §3 |
| **Frozen design decisions** | §2, §6–§14, §16, §19–§23 |
| **Hypotheses** | H0–H3, §4 — **not facts, none favoured** |
| **Predictions** | §4 right-hand column |
| **Open Director decisions** | **NONE.** All frozen, including §5 exposure, §17 seed block and §18 minimum evidence. |
| **Open implementation details** | §24 |

---

## 26. Integrity and freeze

This document follows the convention established for `M7_PREREGISTRATION.md`,
`M8_PREREGISTRATION.md`, `M9_PREREGISTRATION.md` and `Q1_PREREGISTRATION.md`: a SHA-256 sidecar over
the exact bytes, a `.gitattributes` `-text` entry so the digest survives checkout on every platform,
and verification by

```
cd research/preregistrations && sha256sum -c UQA_PREREGISTRATION.sha256
```

A digest mismatch means the pre-registration changed after freeze. That is a **protocol deviation**
and must be reported with its direction and likely effect — never silently reconciled.

---

## STATUS: PRE-REGISTRATION FROZEN · NO INSTRUMENTATION · NO LIVENESS CHECK · NO MEASUREMENT

Exposure frozen at **E-BOTH** (§5). Liveness pre-check pre-registered and ordered **after** this
freeze (§14a–§14c). Primary outcome, population, Q=0 treatment, direction, phase and coverage
handling all frozen (§6–§13). Minimum evidence frozen at **20 accepted configurations** (§18). Seed
block frozen at **`898000–898999`** (§17). Stopping rule inherited from D-006 §5 (§19).

**No Director decision remains open.**

No instrumentation implemented. **No liveness pre-check run.** No collection executed. No
configuration seed generated or inspected. No production source modified. The held-out block
`>= 900500` is untouched. M7, M8, M9 and Q1 artifacts are unchanged.
