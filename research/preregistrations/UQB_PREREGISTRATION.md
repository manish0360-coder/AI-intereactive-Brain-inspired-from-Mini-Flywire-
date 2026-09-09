# UQ-B — PRE-REGISTRATION

**Study:** Does the `futureScore` search mechanism produce correct application of acquired knowledge
in a way distinguishable from arbitrary redistribution?

**Version:** 1.0 (frozen)
**Date:** 2026-09-09
**Authority:** Director rulings of 2026-09-09 — mechanism selection (planning / `futureScore`); path
β accepted; readout-level term shuffle adopted; `K = 19`; minimum evidence 20 configurations; §17
seed block `897000–897999`; and the two mandatory pre-freeze clarifications in §2 and §12, inserted
verbatim following independent adversarial review.

> **THIS DOCUMENT IS FROZEN BEFORE ANY MEASUREMENT EXISTS.** No UQ-B implementation exists, no
> liveness pre-check has been run, no configuration seed has been generated or inspected, and no
> data has been collected. **No Director decision remains open.** After this freeze the document may
> be changed only as a numbered erratum that quotes this text and binds to its digest — never by
> editing it in place.

**Formulation lineage** — the audit trail this document freezes:
`PLANNING_FORMULATION_DRAFT.md` (`d499f60`) · `PLANNING_DISCRIMINATOR_ANALYSIS.md` (`cc97279`) ·
`PLANNING_SHUFFLED_CONTROL_GATE.md` (`0ee851b`) · `PLANNING_DISCRIMINATOR_SPEC.md` (`b8270cf`).

---

## 1. Question and scope

**Question.** The `futureScore` term contributes to every candidate's decision score. Does the
assignment of its values to the candidates that generated them carry information relevant to correct
action selection — or is it indistinguishable from an arbitrary rearrangement of those same values?

**Scope.** One mechanism, one environment substrate (M7, arm A1), one exposure, two estimands. No
predecessor artifact is modified, regenerated, re-collected, subset or re-derived.

---

## 2. Causal estimands — two, kept strictly separate

**C1 — the causal comparison.** The **total effect** of the `futureScore` term on the end-of-run
policy, ARMED against ABLATED, paired per configuration, over the fixed §7 population.

> The C1 estimand is the total causal effect of the futureScore mechanism's continuous presence on
> the agent's final greedy policy. It is not an estimate of the mechanism's instantaneous
> contribution at the time of readout. It compares the policies that result from two different
> experiential histories.

**C2 — the redistribution test.** A within-arm exact test of §5's null: whether the observed
assignment of `futureBonus` values to candidates outperforms 19 rearrangements of those same values.

> **C2 is NOT a permutation test of the causal treatment effect and must never be described as one.**
> It tests redistribution inside one arm. C1 is the causal contrast. They are reported separately,
> and no result of one is used to interpret the other.

**No decomposition.** This design does not separate the term's effect on *learning* from its effect
on *choosing*, and no such decomposition is identifiable here at any sample size.

---

## 3. Established repository facts

Verified from committed source at `b8270cf`. **These are facts, not hypotheses.**

| | Fact | Source |
|---|---|---|
| G1 | `futureScore` is a depth-3 backtracking best-edge search over learned associative memory: `reward*1.5 − penalty*2 + curiosity*0.4 + future*0.8`. It never reads `Q`, transition probabilities, or `p_e`. | `render/planning.js` |
| G2 | Its fourth term, `lookAheadScore`, returns the max cosine similarity to the goal over a 2-hop neighbourhood, computed on embeddings created by 32 `liveRng()` draws per node before any topology, goal or reliability assignment is consulted. It carries no environmental information. | `main.js:595`, `embeddings.js:101-115` |
| G3 | The embeddings constrained by acceptance criterion R3 are `cfg.embedding`, referenced only by the acceptance predicate and its two verifiers. Nothing installs it into the runtime. | `env.js:234`, `verify_M7.js:271`, `verify_acceptance.js:56` |
| G4 | `futureBonus` is formed at exactly one place and the local occurs exactly twice: declaration and single use. | `main.js:1860-1861`, `:2081` |
| G5 | It reaches **both** decision pathways from that one point: the 60% learned score and the 40% arbitration path. | `scoring.js:350`; `scoring.js:406` → `main.js:2245` → `executiveController.js:143`; blended at `main.js:2253` |
| G6 | `scoring.js:84` declares `futureBonus = 0` as the parameter default: `0` is a value the committed signature accepts. | `render/scoring.js:84` |
| G7 | `futureScore` and `lookAheadScore` are pure — `Map.get`, node lookup and arithmetic only. No writes, no RNG. | `render/planning.js` |
| G8 | `liveFutureBonus` (`scoring.js:58, :176`) reaches `updateHUD` only. `render/hud.js` has **no imports** and touches only `document`. It is behaviourally inert. | `main.js:426, :2664`; `render/hud.js` |
| G9 | `allCandidates` is complete before any candidate is scored, so a within-decision permutation is structurally possible. | `main.js:1580-1590`, loop opens `:1594` |
| G10 | `scoring.js:211` draws once per `calculateDecisionScore` call. A permutation changes neither the number of calls nor their order, so candidate *i* receives drift draw *i* under every arrangement. | `render/scoring.js:211` |
| G11 | `runPrediction(startKey)` depends only on its parameter — **no reference to `agentCurrent`** anywhere in its body. | `main.js:1390-2722` |
| G12 | It contains **no learning-mutating call**: no `updateQ`, `setQ`, `dampQ`, `recordAttempt`, `recordSuccess`, `recordTraversal`, `reinforcePath`, `weakenPath`, `recordSemanticEdge`, `episodeRecordNode`, `rewardCurrentEpisode`, `sealCurrentEpisode`, `rebuildSchemas`, `runConsolidationPass`. | `main.js:1390-2722` |
| G13 | Its only write outside itself is `window.lastReasoning`. `thoughtTree` is `const thoughtTree = []` — **local**, freshly allocated per call. Consecutive readouts cannot contaminate one another. | `main.js:2635`; `:1420` |
| G14 | `choices.push({key, weight: arbitratedScore})`; `sorted = choices.sort(...)`; `bestChoice = sorted[0]`. The greedy argmax is over exactly the 60/40 blend. | `main.js:2256-2258, :2360, :2365` |
| G15 | `main.js:2353-2356` may override the choice with a uniform exploration pick, drawn after `bestChoice` is determined. | `main.js:2353-2356` |
| G16 | `decisionStates(goal)` — non-goal nodes with ≥ 2 traversal neighbours — is **19 states for every one of the four frozen goals**. Graph: 20 nodes, 39 edges, minimum degree 3, no isolated nodes. | `env.js:320-323`; `connections.json`, `neurons.json` |
| G17 | `reliabilityOptimalPolicy` minimises expected attempts (`1/p_e` weights, Dijkstra from goal); `hopOptimalPolicy` minimises edge count. Both use the `connections.json` file-order tie-break, so disagreement is substantive. | `env.js:325-372` |
| G18 | `checkR5` is a conjunct of acceptance and requires the two policies to differ on ≥ 4 decision states — **evaluated on `cfg.pPhase1` only** (`evaluateConstraints` opens `const p = cfg.pPhase1`). | `env.js:209, :389-401` |
| G19 | Permuting chosen **actions across states** would assign illegal actions: the probability a received action is even legal at its new state is 0.165–0.173 across the four goals, bounding shuffled alignment at ≈3.1–3.3 of 19 before the oracle applies. | `connections.json`, `neurons.json` |
| G20 | M7 arms are locked; a new arm may not be added. Gate G9 forbids any new export from a `render/` module. | `arms.js:58`; M7 §14 G9 |

---

## 4. Hypotheses and predictions — NOT facts

| | Hypothesis | Prediction |
|---|---|---|
| **S0** | The term does not change the end-of-run policy. | ARMED and ABLATED readouts identical at every state |
| **S1** | `H_redistribution` — the assignment of `futureBonus` values to candidates carries no correctness-relevant information. | observed alignment not strictly greater than all 19 shuffled alignments |
| **S2** | The assignment is informative for oracle alignment. | observed alignment strictly greater than all 19 |

**No hypothesis is favoured.** S1 is the mechanistically expected outcome given G2: a term whose
fourth component is an information-free field may change decisions without informing them.

**A fourth outcome is reported and is not a hypothesis.** *Redistribution-dominates* — observed
alignment strictly **less** than all 19 — is recorded as a disclosure (§12). A design unable to
express it would not be a test.

---

## 5. Exposure and null — FROZEN

### 5.1 The C1 exposure

| Arm | Definition |
|---|---|
| **ARMED** | the committed behaviour, unchanged |
| **ABLATED** | `futureBonus` delivered as **exactly `0`** at its single formation point |

Applied at the G4 anchor (`main.js:1860-1861`), which delivers `0` to **both** G5 pathways. This is
dual-path **by construction, not by choice**: no single upstream point reaches one path only. The
`futureScore(…)` call at `main.js:1841` is **preserved**, so both arms execute an identical call
sequence; G7 establishes this changes no state.

### 5.2 The C2 null

> **`H_redistribution`.** *The assignment of `futureBonus` values to the candidates that generated
> them carries no information relevant to correct action selection. Within each decision, every
> arrangement of that decision's `futureBonus` multiset — including the observed identity arrangement
> — is equally good.*

Under `H_redistribution` the identity arrangement is exchangeable with any other. **The assumption is
exact**: no normality, variance or independence assumption is used.

---

## 6. The C2 permutation — FROZEN

1. **Unit.** One decision — one `(state u, step)` — with candidate set `allCandidates` (G9), of size
   `n(u) ≥ |neighbours(u)| ≥ 3`.
2. **The permutation.** A bijection `σ_u` of `{1…n(u)}` in `allCandidates` iteration order; candidate
   *i* receives `b(k_{σ_u(i)})`. The value multiset is preserved element for element. **Candidate
   identity, topology, legality, candidate ordering and every non-target quantity are unchanged.**
3. **Arrangement.** The tuple `(σ_u)` over all 19 states. **The observed identity arrangement is
   arrangement 0**, one of the `K + 1 = 20` members.
4. **Count.** Exactly `K = 19` shuffled arrangements. Not adaptive, not extendable, not reducible.
5. **Distinctness.** Each shuffled arrangement must differ from arrangement 0 and from every other,
   enforced by redraw. *Reason:* a collision with the identity necessarily ties, and §12's tie rule
   then blocks rejection — so collisions would make the realised level a function of collision
   frequency rather than of `K`. Distinctness keeps the level exactly `1/(K+1)`.
6. **Generation.** Fisher–Yates from a dedicated deterministic generator seeded by a frozen function
   of `(configuration seed, arm, shuffle index j ∈ 1…19, state u)`. It **must not** draw from the
   `cognitive`, `visual` or `environment` streams.
7. **Scope.** The arrangement applies at every scoring decision inside a readout. Steps ≥ 1 cannot
   affect step 0's `bestChoice`, so this does not affect the statistic; it is frozen for
   reproducibility only.

**Why the state-level alternative is rejected:** permuting chosen *actions* across states would
refute the null by construction (G19) — ≈83% of such assignments are actions the agent cannot
execute. That falsifier could not fail, and a criterion that cannot fail proves nothing.

---

## 7. Population — FROZEN

```
POPULATION(c) = decisionStates(goal(c)) = 19 states, for every frozen goal   (G16)
```

Computed from topology and goal alone, before any run. **Identical for every arm and every
arrangement. No arrival conditioning of any kind.** Every state yields a readout in every arm, so
**there is no missing data, no imputation, and no neutral action is invented.**

**State ordering, frozen:** ascending node id.

---

## 8. The readout — FROZEN

```
readout(u) = bestChoice.key from runPrediction(u), taken at step === 0
```

- **`bestChoice`, not the executed action** — the greedy argmax **before** the G15 exploration
  override, because the question concerns applied knowledge, not exploration.
- **Step 0 only.** Steps ≥ 1 are the imagination chain and cannot affect step 0's `bestChoice`.
- **Taken at end of run, with learning frozen.** G11–G13 establish that the readout is
  state-faithful, mutates no learned representation, and cannot contaminate the next readout.

---

## 9. Oracles — FROZEN

`R_phase(u) = env.reliabilityOptimalPolicy(p_phase, goal).policy.get(u)` — the expected-attempts
optimum (G17). `H_phase(u) = env.hopOptimalPolicy(goal).policy.get(u)` is recorded for every state as
a **disclosure**, never as the test statistic.

**G18 is a limitation of record:** the ≥ 4 disagreement guarantee holds for **phase 1 only**. The
phase-2 disagreement count is reported per configuration and is never used to include, exclude or
weight anything.

---

## 10. Statistic and phase handling — FROZEN

```
A(arrangement, phase) = | { u ∈ POPULATION : readout(u) == R_phase(u) } |     integer, 0…19
```

The readout is one end-of-run policy scored against **both** regimes, exactly as UQ-A scored one final
Q table against `pPhase1` and `pPhase2`.

**Phase 1 and phase 2 are computed, reported and tested separately, and are NEVER pooled or
averaged.** Phase 1 alignment reads as retention/interference relative to the first regime; phase 2 as
adaptation to the second. **Neither may be called "phase 1 performance" or "phase 2 performance".**
The reliability oracle is phase-varying; the hop oracle is not, and that asymmetry is preserved in
reporting.

---

## 11. C1 — the causal comparison — FROZEN

Per configuration, per phase: `A(0, phase)` under ARMED and under ABLATED, and their difference.

**Reported descriptively.** §13 forbids inferential machinery for C1. C1 is subject to the
study-level aggregation limit established in `PLANNING_DISCRIMINATOR_ANALYSIS.md` §5, and **this
design does not repeal it**: C1 licenses *"arming the term changes alignment by X at this
configuration"* and no aggregate directional claim.

**S0 is decided by C1 and is threshold-free:** S0 is refuted by a single state at which the ARMED and
ABLATED readouts differ. Its null is a **structural zero** — under a disconnected term the readouts are
identical by determinism.

---

## 12. C2 — the discriminator — FROZEN

```
REDISTRIBUTION-REJECTED  iff  A(0, phase) > A(j, phase)  for every j = 1…19
NOT-REJECTED             otherwise
```

Evaluated **per configuration, per phase**. Declared one-sided level `α = 1/(K+1) = 1/20 = 0.05`.

> A REJECTED verdict for C2 indicates that the observed alignment was higher than all 19
> deterministic alternative redistributions of the same numerical values for this specific
> configuration. It is an exact statement about this sample and does not carry the same frequentist
> guarantees as a p-value derived from a distributional test.

**Tie rule — FROZEN.** **Ties do not reject.** Equality with any `A(j)` fails the strict inequality
and yields NOT-REJECTED. **No post-hoc tie breaking, no jitter, no secondary criterion, no
re-ranking, no mid-p adjustment.** This is what makes the level exact rather than nominal.

**Disclosure, not a second test.** `A(0, phase) < A(j, phase)` for every `j` is reported as
**REDISTRIBUTION-DOMINATES**. It carries no declared level and spends no additional α.

**Mandatory wiring control.** C2 is run identically on the **ABLATED** readout. Under ablation every
`futureBonus` is exactly `0`, so every permutation of a constant vector is the identity and all 20
arrangements must be **byte-identical**, forcing NOT-REJECTED.

> **If the ABLATED C2 ever rejects, the implementation is broken and the study halts under §20.**

---

## 13. Statistics policy — FROZEN

**C1: descriptive only** — the alignment counts and their per-configuration differences.
**C2: exactly one exact test per configuration per phase**, at the declared level, and nothing else.

**Prohibited, and not addable after data exists:** p-values beyond C2's exact construction, confidence
intervals, additional hypothesis tests, effect sizes, models, cross-configuration aggregates of the C1
difference, and any post-hoc statistical addition. A method may enter only through a numbered erratum
frozen before it is computed.

**Multiplicity, stated plainly rather than corrected away.** C2 yields one verdict per
`(configuration, phase)`. The study reports the **count of REDISTRIBUTION-REJECTED verdicts out of the
total number of C2 tests performed**, alongside the exactly-known null expectation `0.05 × N`.

> **The study makes NO study-level significance claim.** The count is a description against a known
> null expectation, not a test. No multiplicity correction is applied, because none is needed for a
> claim that is not being made — and introducing one would be a post-hoc addition. **A reader may not
> interpret the rejection count as a study-level finding, and no report may present it as one.**

---

## 14. Design — FROZEN

**Paired two-arm collection with a readout-level permutation.** Per accepted configuration:

- **2 runs** — ARMED and ABLATED — identical in every parameter but the §5.1 exposure.
- **Readouts** — for each arm, 20 arrangements × 19 states, taken at end of run in the same process,
  since the learned state lives in module singletons.

**There is no third running arm.** The permutation is applied at readout only, so it generates no
additional trajectory, and the §7 population cannot shrink with `K`.

**Unit of analysis: the configuration.** *n* = accepted configurations, never 19 and never 38. This
inherits the M7 §C6 discipline that M8, Q1 and UQ-A all carry.

**Pairing is exact.** The acceptance predicate depends only on the configuration seed and is evaluated
once, before either arm runs.

**One process per run** — `run.js` claims the process and `main.js` is a singleton ESM module (M7 gate
G10).

**Inherited substrate, unchanged:** agent seed `20260819000` · M7 arm `A1` · `3000` ticks · goal
indices `[0,1,2,3]` · `T_SHIFT = 1500`.

### 14a. Liveness pre-check — a pre-registered protocol component

**Ordering, frozen.** This document is **frozen and committed BEFORE the liveness pre-check is run**,
so the liveness result cannot influence any design element.

```
FREEZE  →  liveness pre-check  →  LIVE: run the collection
                               →  INERT: stop per §14c
```

**Motivation from committed evidence.** M1 (`experiments/exec_influence/report.json`) records a
pathway that read as wired and was confirmed to have **exactly zero** influence. A term that never
changes the chosen candidate cannot change any readout.

**The criterion — threshold-free.** Using the committed `benchmarks/harness/decisionProbe.js` over the
real `calculateDecisionScore` and `arbitrate`, with an identical per-trial RNG stream in both arms:

> **LIVE** iff the argmax flip rate between `futureBonus` armed and `futureBonus = 0` is **strictly
> greater than zero**. **INERT** iff it is exactly zero.

The influence delta is reported alongside as a **mandatory diagnostic, never the criterion**. A
non-zero delta with a zero flip rate is the cosmetic signature and is classified INERT.

It consumes **no configuration seed** and runs no collection.

### 14c. Inertness disposition — FROZEN

If INERT: the collection must **not** be run; the result is reported as **EXPOSURE INERT — MAIN
COLLECTION NOT RUN** with the flip rate and delta; the exposure must not be changed; the
implementation must not be repaired and re-run under this protocol; no new configuration, range or
battery may be generated; UQ-B closes on that disposition.

---

## 15. Instrumentation neutrality — FROZEN

- **No production source modification.** The exposure and the permutation are delivered by the
  committed ESM load-hook technique, in memory. With the guard unset the build is bit-identical to
  HEAD.
- **No new M7 arm** (G20). **No new export from any `render/` module** — M7 gate G9.
- **RNG neutrality, established:** G7 and G10 together mean the arrangements differ in the assignment
  and in nothing else — candidate *i* receives drift draw *i* under every arrangement.
- **The permutation requires a two-pass restructuring of the candidate loop.** This is a control-flow
  change, more invasive than the §5.1 substitution, and its neutrality must be proved by **mutation
  control, not assertion**: the transform must be shown to change exactly the assignment and nothing
  else.
- Each arm's delivered source is digested and compared against an independently recomputed transform,
  so an arm label is a fact rather than a claim.

---

## 16. Reproducibility — FROZEN

1. **Readout RNG.** Before **each** `(state, arrangement)` readout, the streams are re-seeded via
   `initRng` (`instrumentation/rng.js:32`) with a frozen function of `(configuration seed, arm,
   state)` — **identical across all 20 arrangements at that state**. Without this the cognitive drift
   differs between arrangements and the comparison is confounded by noise rather than by assignment.
   Re-seeding occurs only after the run has ended and cannot perturb it.
2. **Permutation seeds** per §6.6, from a separate generator.
3. **Determinism requirement.** Two independent executions must reproduce every `A(j, phase)`, every
   C1 value and every fingerprint exactly.
4. **No dependence on** filesystem metadata, mtime, wall-clock time, network access, undeclared seeds,
   or input ordering. Identical verdicts are required in the authoring tree, a `git archive`
   materialization, and a fresh CRLF checkout.

---

## 17. Seed governance — FROZEN

**Configuration-seed block: `897000–897999` inclusive.**

Ruled by the Director on 2026-09-09. This is a **pre-data design decision, not an optimisation for
any expected outcome**: it was made before any UQ-B seed was generated, evaluated or inspected, and
before any implementation existed.

`1,000 seeds × 4 frozen goal indices = 4,000 candidate configurations.`

**Disjointness, with the arithmetic stated rather than asserted:**

| | Block | Status | Disjoint because |
|---|---|---|---|
| | `≥ 900500` | **HELD OUT** — never generated, inspected, inferred or touched | `897999 < 900500` |
| | `900030-900499` | consumed — M7-ERR-09 gate-diagnostic range | `897999 < 900030` |
| | `900000-900029` | consumed — M7 pilot (frozen §5.1) | `897999 < 900000` |
| | `899500-899999` | consumed — M8 collection (D-003 H), at `f9d97b9` | `897999 < 899500` |
| | `899000-899499` | consumed — Q1 collection (D-006 §1 A), at `d16d568` | `897999 < 899000` |
| | `898000-898999` | consumed — UQ-A collection, at `f7cc052` | `897999 < 898000` |

The UQ-B block lies **entirely below every consumed block and every held-out seed**. The lowest
previously consumed seed is `898000`, and `897999 < 898000`, so a single comparison establishes
disjointness from all six rows at once.

**The held-out block `≥ 900500` is never generated, inspected, inferred or touched**, and this is
proven at runtime by the environment's own seed census rather than asserted in prose.

**No acceptance walk.** Every candidate is evaluated **directly at its own seed** (M7-ERR-09 §3.3), so
no seed outside `897000–897999` is ever reached. `env.generateAccepted` walks forward from a rejected
seed; from the upper bound `897999` such a walk would cross into UQ-A's consumed `898000`, and the
collection must refuse it rather than permit it.

---

## 18. Minimum evidence — FROZEN

> **FROZEN: at least 20 accepted configurations**, each with:
> - complete paired ARMED/ABLATED **C1** data;
> - complete **C2** readout data for **all 19** decision states;
> - **both** phase-specific C2 results;
> - **no missing or imputed policy readouts.**

A configuration failing any of these four conditions does not count toward the minimum and is recorded
with its reason.

**Per D-006 §4, this number is a pre-data Director judgment, not mechanically required by source, and
must never be represented as such.** It is the twice-established project figure — D-003 B for M8,
D-006 §1 E for Q1, §18 for UQ-A — and it transfers because the unit of analysis is the configuration
in all four studies.

**Not imported, with the reason recorded:** the 100-DESYNC-event minimum (no DESYNC observable here)
and the 15-per-stratum minimum (this design is not stratified). The goal-degree composition of the
accepted configurations is **reported as a disclosure, never as a threshold and never as a filter**.

---

## 19. Stopping rule — FROZEN

Enumerate the **entire** §17 range. Evaluate every candidate **directly at its own seed** — the
M7-ERR-09 §3.3 discipline, no acceptance walk. Collect every accepted configuration.

**Do not stop when 20 configurations are reached.** The minimum is a reporting threshold, not a
collection target, and the complete registered range must be processed.

**Never extend the range for any reason**, including an observed under-yield. **Never adapt collection
after observing any result.**

**If complete enumeration yields fewer than 20 qualifying configurations, the study is
`INCONCLUSIVE — INSUFFICIENT MATERIAL`**, naming the failing condition, with **no additional sampling
permitted, no additional seed block, no relaxation of `K`, no alteration of the discriminator, and no
post-result change to the minimum.**

---

## 20. Failure rules — FROZEN

The study halts and reports rather than repairing if: a run violates the seed boundary; an incorrect
arm, agent seed or tick budget is used; instrumentation neutrality fails; a readout is missing or
incomplete; evidence is corrupt; determinism fails; the arms are not exactly paired; the arrangements
are not distinct; or **the §12 ABLATED wiring control rejects**. **No silent repair, no substitution,
no range extension.**

---

## 21. Analysis lock — FROZEN

**Exactly two estimands (§2), one statistic (§10), one C2 discriminator (§12), one tie rule (§12).**
The population (§7), readout (§8), oracles (§9), phase handling (§10), permutation (§6), `K`, `α` and
the reporting format (§22) are frozen with them.

**No alternative estimand or statistic may be selected after collection, and no secondary outcome may
be promoted to primary.**

---

## 22. Reporting requirements — FROZEN

Every report must carry, together: `A(0, phase)` per arm per configuration for both phases;
the C1 difference per configuration per phase; the C2 verdict per configuration per phase; the count
of REDISTRIBUTION-REJECTED verdicts **with the null expectation `0.05 × N` and the §13 statement that
no study-level claim is made**; the ABLATED wiring-control result; the number of accepted
configurations; the goal-degree composition; the phase-2 R5-disagreement count per configuration; and
the §23 interpretive limits.

**A C2 verdict reported without its ABLATED wiring-control result is a protocol violation.**

---

## 23. Interpretive limits — FROZEN

The primary outcome measures **alignment of the end-of-run greedy policy with an external optimality
standard**, and whether that alignment survives rearrangement of the mechanism's own values.

It does **NOT** measure: absolute policy quality · learning speed · executed-trajectory performance ·
the term's separate contributions to learning versus choosing.

**Two claims are permanently out of reach and may not appear in any report:**

1. **Independent information.** A shuffle destroys the term's correlation with other terms (notably
   `qValue`) along with its own information. Rejecting `H_redistribution` establishes that the
   assignment matters; it does **not** establish that the mechanism contributes information beyond
   what correlated terms already carry.
2. **"Planning."** G1 and G2 establish that the mechanism cannot read `p_e`; any reliability alignment
   is necessarily indirect through reward memory. **This study cannot show that the mechanism plans,
   and no report may say that it does.**

Q1 §7's ban on causal language, including "proximate cause", carries forward unchanged.

---

## 24. Prohibitions — FROZEN

UQ-B does **not**: modify, regenerate, re-collect, subset or re-derive any M7, M8, M9, Q1 or UQ-A
artifact; add an M7 arm; add any export to a `render/` module; modify production source; introduce any
observable beyond §8, §10 and §12; touch, generate, inspect or infer anything about the held-out block
`≥ 900500`; use the M7 G15 outcome as a target; or pool its denominator with any predecessor study.

**Explicitly prohibited post-result additions or relaxations:** changing `K`; adding a second `K`;
adding any further test; relaxing the strict inequality; adding tie-breaking; changing the readout,
the population, the statistic, the oracle or the phase rule; adding an aggregate; extending the seed
range; or altering the minimum. **Any of these may enter only through a numbered erratum frozen before
it is computed.**

---

## 25. `K = 19` — Director methodological judgment

> **`K = 19`, giving a declared one-sided level `α = 1/(K+1) = 1/20 = 0.05`, is a Director
> methodological judgment of 2026-09-09. It is NOT a source-derived quantity.** No committed source
> supports it: the repository has never run a hypothesis test, and M9 §11, Q1 §10 and UQ-A §11 each
> froze a descriptive-only policy. It must be disclosed in these terms wherever it appears, exactly as
> D-006 §4 required for the 20-configuration minimum.
>
> It is frozen before any data collection and may never be revisited or re-chosen.
>
> **This study departs from the descriptive-only statistics policy of its three predecessors.** The
> departure is deliberate, is **confined to C2**, and does not extend to C1, which remains descriptive.

---

## 26. Falsification — every criterion can genuinely fail

| | Falsifier | Why it is not vacuous |
|---|---|---|
| **S0** | one state where ARMED and ABLATED readouts differ | structural-zero null; an INERT outcome is a real possible result, and §14c exists for it |
| **S1** | `A(0) > A(j)` for all 19 `j` in some configuration-phase | can occur; and can fail to occur, since G2 makes the term's dominant component information-free. The state-level alternative that *could not* fail is rejected in §6 for exactly this reason |
| **S2** | `A(0) ≤ A(j)` for at least one `j` | occurs with probability `19/20` under `H_redistribution` |
| **wiring** | ABLATED C2 rejects | cannot occur if the implementation is correct; if it occurs the study halts under §20 |

`H_redistribution` is evaluated over the **full 19-state population**, never over a subset on which
its falsifier would be structurally forced.

---

## 27. D-011 compliance

| | Element | Where |
|---|---|---|
| 1 | Discriminator | §12 (C2), §11 (S0) |
| 2 | Observables | §8, §10 |
| 3 | Comparison / decision rule | §12, including the tie rule |
| 4 | Refutation criteria | §26 |
| 5 | Identifiability audit | §3 (G1–G20), §28 |
| 6 | Stopping / minimum-evidence rule | §18, §19 |
| 7 | Post-hoc prohibition | §24 |

**All seven elements are satisfied.** The discriminator is complete and computable before any
registered result exists, conditional only on the §17 seed ruling, which fixes *where* the study runs
and changes no element of the discriminator.

---

## 28. Identifiability

| Observable | Available from | Precedent |
|---|---|---|
| readout `bestChoice` at step 0 | guarded probe at `main.js:2365` | Q1 instrumentation, `50be4b4` |
| arm, proven on executed source | ESM load hook + loader-thread attestation | UQ-A, `f7cc052` |
| decision-state population | `env.decisionStates(goal)` | committed export |
| `R_phase`, `H_phase` | `env.reliabilityOptimalPolicy`, `env.hopOptimalPolicy` | committed exports, used by the acceptance predicate |
| `pPhase1`, `pPhase2` | `env.makeConfig(seed, index)` | Q1 and UQ-A collection |
| non-degeneracy | `env.checkR5`, a conjunct of acceptance | `env.js:398-401` |

**No new export is required**, so M7 gate G9 is respected.

---

## 29. Open implementation details

Not scientific decisions; each must be resolved and verified before collection, and none may be chosen
from results: the `bestChoice` probe design and guard name · the two-pass permutation transform and
its mutation controls · the readout driver and its seeding function · the artifact format and
integrity sidecar · the fixture band for implementation testing, which must lie outside every
registered block.

---

## 30. Scientific status summary

| Category | Content |
|---|---|
| **Established repository facts** | G1–G20, §3 |
| **Frozen design decisions** | §2, §5–§16, §18–§27 |
| **Hypotheses** | S0–S2, §4 — **not facts, none favoured** |
| **Open Director decisions** | **NONE.** All frozen, including §5 exposure, §6 permutation, §12 `K` and α, §17 seed block and §18 minimum evidence. |
| **Open implementation details** | §29 |

---

## 31. Integrity and freeze

This document is **FROZEN at version 1.0**. Its identity is a SHA-256 over its exact bytes, recorded
in `UQB_PREREGISTRATION.sha256`, and `.gitattributes` carries a `-text` entry for both files so the
digest survives an end-of-line-converting checkout on any platform.

**Verify with:** `cd research/preregistrations && sha256sum -c UQB_PREREGISTRATION.sha256`

A mismatch means the pre-registration changed after freeze. That is a **PROTOCOL DEVIATION** and must
be reported in the final report with its direction and likely effect on results — never silently
reconciled.

**State at freeze, each verified immediately before hashing:** no UQ-B implementation exists; the
§14a liveness pre-check has NOT been run; no collection has been executed; no configuration seed has
been generated or inspected; the held-out block `≥ 900500` is untouched; production source is
unchanged; the M7, M8, M9, Q1 and UQ-A artifacts are unchanged and their digests revalidate.

**The next milestone is the §14a liveness pre-check, run against this frozen document, as a separate
authorised milestone. The main collection is not authorised by this freeze.**
