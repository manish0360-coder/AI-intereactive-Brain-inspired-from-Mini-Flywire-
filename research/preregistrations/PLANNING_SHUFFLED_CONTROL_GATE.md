# PLANNING / `futureScore` — SHUFFLED-CONTROL VALIDITY GATE

**Status:** DRAFT — formulation only. **NOT a pre-registration. No hypothesis is frozen.**
**Date:** 2026-09-09 · **Authority:** Director ruling of 2026-09-09 selecting path β and directing
this final formulation gate, following Gemini's independent adversarial review.
**Companions:** `PLANNING_FORMULATION_DRAFT.md` (`d499f60`), `PLANNING_DISCRIMINATOR_ANALYSIS.md`
(`cc97279`).

**Scope.** No experiment run, no seed generated or inspected, no sample size chosen, no hypothesis
frozen, no pre-registration written, no production source modified, no implementation begun. UQ-A is
not reopened; D-011 is not revisited.

---

## 0. A correction to my own recommendation, made before anything is built on it

In `PLANNING_DISCRIMINATOR_ANALYSIS.md` §7 I recommended β on the ground that its constant `K`
*"governs resolution rather than stringency"* and is therefore categorically different from an
effect-size threshold. Gemini's review adopted that claim without challenge.

**The claim does not survive scrutiny, and it is mine to withdraw.**

Under the null that the shuffled control encodes — that the assignment of `futureBonus` values to
candidates is irrelevant — the ARMED arm is the identity permutation and is **exchangeable** with the
`K` shuffles. The probability that ARMED strictly exceeds all `K` of them is therefore

```
P(ARMED is the strict maximum of K+1 exchangeable draws) = 1 / (K + 1)
```

**`K` is a significance level written as a count.** `K = 19` is α = 0.05; `K = 99` is α = 0.01.
Resolution and stringency are the same quantity here, not two different ones. The design I
recommended is an **exact permutation test**, and calling its parameter something other than a
threshold does not make it one.

This does not by itself sink β — an exact permutation test is a legitimate and assumption-light
procedure. But it relocates the decision: β is not "threshold-free with a better kind of constant",
it is **a hypothesis test with a declared significance level**, which is a policy change for a
program whose last three pre-registrations each froze *"descriptive only"*. §17 and §18 treat it as
such.

---

## 1. What is the shuffled control — exactly

**Established from source.** `main.js:1580-1590` builds `allCandidates`, a `Map` of every candidate
`k` available at the current decision, **complete before any candidate is scored**.
`allCandidates.forEach((value, k) => {` opens at `1594` (brace depth 2, inside the `STEPS` loop at
depth 1). Within one iteration, at depth 3, `futureScore` is called (`1841`) and `futureBonus` is
formed (`1860-1861`); at depth 4 it is passed into `calculateDecisionScore` (`2081`) **in that same
iteration**.

**Definition.** For one decision — one `(tick, step)` at one current node — let the candidate set be
`k₁ … kₙ` in `allCandidates` iteration order, and let `b(kᵢ)` be the `futureBonus` the committed code
computes for `kᵢ`. A shuffle is a permutation `σ` of `{1 … n}`, and the shuffled arm supplies
`b(k_σ(i))` to candidate `kᵢ`.

**What is randomised: nothing about the environment, the agent, the candidate set, or the values.
Only the assignment of the multiset of values to the candidates that produced them.** The multiset
`{b(k₁) … b(kₙ)}` is preserved exactly, element for element.

**What this is NOT:** it does not shuffle actions, labels, oracles, trajectories, rewards, Q values,
or any other scoring term. Every other term keeps its own candidate.

**A structural consequence that must be stated.** Because the value is computed and consumed inside
one iteration, a permutation **cannot** be a value substitution at the anchor the way the ABLATED arm
is. It requires the candidate loop to be restructured into two passes — compute all `b(kᵢ)`, permute,
then score. That is a **control-flow modification**, categorically more invasive than the one-line
ABLATED transform, and its neutrality is correspondingly harder to prove. §3 establishes that the
pre-pass is nonetheless side-effect- and RNG-neutral, which is what makes it admissible at all.

---

## 2. What causal intervention the shuffled arm represents

It intervenes on **the coupling between the mechanism's output and the object that output describes**,
holding the output's distribution fixed.

- ABLATED removes the term: magnitude gone, coupling gone.
- SHUFFLED removes only the coupling: magnitude, scale, and per-decision distribution retained.

The contrast ARMED − ABLATED is therefore the effect of *having* the term; ARMED − SHUFFLED is the
effect of the term **pointing at the right candidate**. The second is the operationalisation of the
Director's stated objective — *distinguishable from arbitrary redistribution* — and it is a valid
control for that question rather than a different mechanism, because the shuffled arm runs the
identical search, over the identical graph, producing the identical numbers, and differs only in which
candidate each number is attached to.

**It is a different mechanism in exactly one respect, and that respect is the hypothesis.**

---

## 3. What is preserved

| | Preserved? | Evidence |
|---|---|---|
| **Computational budget** | **Yes, exactly.** `futureScore` is called once per candidate in both arms; the permutation adds only an array reindex. | `planning.js` — pure; `1594` loop unchanged in extent |
| **Decision opportunities** | **Yes.** The candidate set, its size and its iteration order are untouched. | `allCandidates` built at `1580-1590`, before scoring |
| **Exposure timing** | **Yes.** The value is delivered at the same point in the same iteration. | anchor at `1860-1861` |
| **RNG stream** | **Yes, exactly.** `scoring.js:211` draws once per `calculateDecisionScore` call, so the draw *count* and *order* are unchanged; candidate `i` still receives drift draw `i`. `futureScore` and `lookAheadScore` consume no RNG. The pre-pass therefore perturbs nothing. | `scoring.js:211`; `planning.js` contains no RNG |
| **Non-target mechanisms** | **Yes.** Every other scoring term keeps its own candidate. `runPrediction` contains **no** learning-mutating call — no `updateQ`, `setQ`, `dampQ`, `recordAttempt`, `recordSuccess`, `recordTraversal`, `reinforcePath`, `weakenPath`, or episode write. Its only shared-state writes are `window.lastReasoning` (`2635`) and `thoughtTree.push` (`2709`); the two memory writes at `2276`/`2282` are commented out. | verified over `1390-2722` |
| **Trajectory structure** | **NO — and this is the design's central problem.** | §10 |

**The RNG-neutrality result is the strongest technical point in favour of β** and it is not obvious:
because the cognitive drift draw at `scoring.js:211` is consumed per candidate in loop order, and the
permutation changes neither the order nor the count, the drift is held **fixed per candidate** across
ARMED and SHUFFLED. The control differs from the treatment in the assignment and in nothing else.

---

## 4. What is changed — exactly one thing

> The bijection between candidates and the `futureBonus` values computed for them.

Nothing else. Not the values, not their multiset, not the candidates, not the order, not the budget,
not the RNG, not any other term.

---

## 5. What K is, whether it can be justified, and whether it is a tuning parameter

**What K controls.** Per §0, under the exchangeability null `P(ARMED strictly exceeds all K shuffles)
= 1/(K+1)`. **K sets the test's significance level.** It does not buy resolution separately from
stringency; the two are one quantity.

**Is K scientifically necessary?** For a *calibrated* directional statement, yes. `K = 1` reduces to a
two-arm comparison and reproduces the §5 impossibility of the discriminator analysis exactly — it buys
nothing. Exhaustive enumeration is unavailable: a run makes thousands of decisions, each with its own
candidate set, so the permutation space is astronomically large. Any calibrated statement therefore
requires a finite, chosen `K`.

**Must it be fixed before data?** Yes, unconditionally, and it must never be re-chosen after any
registered result is seen.

**Does any committed source support its selection?** **No.** I searched. The repository has never run
a hypothesis test: M9 §11, Q1 §10 and UQ-A §11 each pre-registered a descriptive-only policy and each
prohibited p-values, intervals and effect sizes. There is no committed precedent, no prior α, and no
mechanical anchor from which `K` could be derived.

> **Stating it plainly, as the ruling requires: K cannot be justified pre-data from committed source.**
> It is a decision-theoretic choice about how much evidence suffices, and only the Director can make
> it. It is an arbitrary tuning parameter in exactly the sense the program has refused elsewhere —
> with the single mitigating difference that fixing it *before* data, and never revisiting it, removes
> the tuning hazard even though it does not remove the arbitrariness.

This is the decision named in §18.

---

## 6. Null model

> **H_shuffle₀ — Arbitrary redistribution.** *The assignment of `futureBonus` values to the candidates
> that generated them carries no information relevant to correct action selection. Any permutation of
> those values within a decision, including the identity, is equally good.*

**Scientifically meaningful, not merely convenient.** It is the precise formal content of hypothesis
P4 from the formulation memo (*live but normatively random*), and P4 is the mechanistically expected
outcome given that memo's §1.2: the term's fourth component, weighted `0.8`, is
`lookAheadScore` — the maximum cosine similarity to the goal over a 2-hop neighbourhood, computed on
embeddings created at `main.js:595` by 32 `liveRng()` draws per node, before any topology, goal or
reliability assignment is consulted. A mechanism with a substantial information-free component may
change decisions without informing them, and `H_shuffle₀` is the hypothesis that says so.

**Its exchangeability assumption is exact, not distributional.** Under `H_shuffle₀` the identity
permutation is one of the `n!` equally good assignments; no normality, variance or independence
assumption is needed. That is a genuine strength.

**One attribution limit, declared now.** `futureBonus(k)` and other terms — notably `qValue(u,k)` —
are both functions of the same learning history and are therefore correlated. A shuffle destroys that
correlation along with the mechanism's own information. Rejecting `H_shuffle₀` establishes that **the
assignment matters**; it does **not** establish that the mechanism contributes information beyond what
other terms already carry. That is the same class of limit as UQ-A §13's ban on mechanism attribution
and must be carried into any pre-registration verbatim.

---

## 7. The directional discriminator

Given a per-configuration, per-phase alignment count `A(arm)` = the number of population cells at
which that arm's action equals the oracle's:

```
ARMED-BETTER      iff  A(ARMED) >  A(σ)  for every one of the K pre-declared shuffles σ
ARMED-NOT-BETTER  iff  A(ARMED) ≤ A(σ)  for at least one σ, and A(ARMED) ≥ A(σ) for at least one σ
ARMED-WORSE       iff  A(ARMED) <  A(σ)  for every σ
```

Three-valued, exhaustive, mutually exclusive, computed by strict integer comparison, and fixed before
data. **Majority-wins is not used**, and no effect-size threshold appears anywhere.

**A threshold is nonetheless mathematically necessary, and it is `K` itself.** The rule above contains
no threshold *on the outcome*; the stringency lives entirely in how many shuffles must be beaten. Per
§5, the pre-data justification required is a justification of the significance level `1/(K+1)`, and no
committed source supplies one.

**Aggregation across configurations remains subject to the §5 impossibility of the discriminator
analysis** and is not solved here. The verdict above is *per configuration, per phase*. A study-level
statement over those verdicts needs its own rule, and the only non-vacuous one available is again a
count comparison. This is worth stating flatly: **β calibrates the per-configuration comparison; it
does not repeal the study-level aggregation problem.**

---

## 8. Randomness and reproducibility

β introduces stochasticity into an architecture that currently has none beyond its seeded streams.
It is containable, and exactly three things must be seeded and frozen:

1. **The permutation seed.** `K` permutations per decision must be generated from a pre-declared
   deterministic generator seeded by `(configuration seed, arm index, tick, step)` — never from the
   cognitive/visual/environment streams, which would perturb the run.
2. **`K` itself**, and the shuffle indices `1 … K`, frozen in the pre-registration.
3. **The identity-exclusion rule.** Whether a drawn permutation that happens to equal the identity is
   kept or redrawn must be frozen, because it changes the null's support.

With those frozen, every shuffled arm is as reproducible as the existing two, and the UQ-A
attestation machinery extends to it unchanged. **Stochasticity is acceptable. It is not the reason to
doubt β.**

---

## 9. Pairing

Exact pairing is preserved. The acceptance predicate depends only on the configuration seed and is
evaluated once, before any arm runs, so all `K + 2` arms see identical configurations by construction
— the property UQ-A verified across 96 configurations and 192 runs. A configuration would enter the
result only if **all** its arms completed.

**Pairing is not the problem. §10 is.**

---

## 10. Trajectory selection — does the shuffled arm solve it, or add to it?

**It adds to it. This is the finding that decides the shape of β.**

Using the ruling's precise terminology: the discriminator analysis licensed conditioning on the
**principal stratum defined by paired potential trajectories** — the set of decision-state cells both
arms would reach. That was valid because both potential outcomes are computed for every unit, making
stratum membership a deterministic function of the unit and invariant to which arm is examined.

**With `K` shuffled arms run as full arms, the stratum becomes the intersection of `K + 2`
trajectories.** Its validity survives — membership is still assignment-invariant — but its **size does
not**. Every additional arm can only shrink the common set, and:

> **`K` trades directly against the population it is meant to calibrate.** Raising `K` to sharpen the
> test shrinks the very set the test is computed on. At `K = 19` a cell must be reached by twenty
> distinct trajectories.

That is not a tuning inconvenience; it is a **structural conflict between β's resolution and β's
evidence**, and it is fatal to the run-time-shuffle form of the design. A design whose precision
parameter destroys its own sample is not a better design.

**Therefore: β as a third (and Kth) *running* arm is rejected.** It does not solve the selection
problem; it multiplies it.

β survives only if the shuffle can be applied somewhere that generates no additional trajectory. §11
establishes that such a place exists.

---

## 11. A better, arm-independent population — and it exists

The ruling asks whether a population exists that avoids conditioning on treatment-dependent arrival
**altogether**. It does, and it is available on the current architecture.

**The policy readout.** `runPrediction(startKey)` (`main.js:1390`) takes an arbitrary start node and
returns the agent's decision from it. Verified over its whole body (`1390-2722`):

- it contains **no learning-mutating call** — no `updateQ`, `setQ`, `dampQ`, `recordAttempt`,
  `recordSuccess`, `recordTraversal`, `reinforcePath`, `weakenPath`, `recordSemanticEdge`,
  `episodeRecordNode`, `rewardCurrentEpisode`, `sealCurrentEpisode`, `rebuildSchemas` or
  `runConsolidationPass`;
- its only shared-state writes are `window.lastReasoning` (`2635`) and `thoughtTree.push` (`2709`);
  the two memory writes at `2276`/`2282` are commented out;
- it is **already invoked with an arbitrary node** by committed code — `main.js:5501`,
  `runPrediction(clickedId)`.

So at end of run, with learning frozen, the agent's decision can be read at **each of the 19 decision
states**, in every arm, with no arrival required.

**What this buys, and it is more than β does:**

| | principal stratum (option B) | policy readout |
|---|---|---|
| conditioning on arrival | yes, licensed but limiting | **none** |
| missing data | one-armed and never-reached cells | **none — all 19 states, every arm** |
| estimand | principal-stratum effect | **full-population effect** |
| shrinks with more arms | yes | **no** |

**This is the substantive advance of this gate, and it is independent of β.** It removes the
limitation Gemini's review §I.2 correctly identified as inherent — *"the estimand is a
principal-stratum effect … cannot be generalised"* — and it removes it by construction rather than by
assumption.

**Two conditions must be resolved before it can be used, and both are real:**

1. **The epsilon-greedy override.** `main.js:2353-2356` draws `liveRng() < epsilon` and, if taken,
   replaces the choice with a uniform pick. A readout of the *executed* action therefore mixes
   knowledge application with exploration. The clean object is the **pre-override greedy choice** —
   `bestChoice`, the argmax of the sorted `choices` immediately before `2353`. Capturing it requires a
   guarded probe of exactly the kind Q1 committed at `50be4b4`; it is precedented, but it is
   instrumentation that does not yet exist.
2. **Readout RNG.** `runPrediction` draws at `2353`/`2356` and `scoring.js:211` draws once per
   candidate. Nineteen readouts therefore consume RNG. Because they occur **after** the run, they
   cannot perturb it — but the readout must still be seeded and frozen so it reproduces.

**With the readout as the population, the shuffle applies at readout, and §10's conflict disappears
entirely:** no third trajectory, no stratum intersection, no shrinkage, `K` costs only `K` cheap
re-scorings of 19 states. This is the only form in which β is viable.

**The narrowing this entails must be stated.** A readout shuffle asks whether the term's assignment is
informative **given what was learned**. It does not ask whether the term improved the learning. The
total effect of the term on acquisition remains the ARMED-vs-ABLATED contrast, which the readout
population also serves — and serves better than the principal stratum did.

---

## 12. Oracle validity, and four things that must not be conflated

The oracles are unchanged and remain legitimate: `reliabilityOptimalPolicy` minimises expected
attempts (`env.js:325-356`), `hopOptimalPolicy` minimises edge count (`:357-372`), both share the
`connections.json` tie-break so disagreements are substantive, and `checkR5` guarantees ≥ 4
disagreement states per accepted configuration — **on `cfg.pPhase1` only**, since
`evaluateConstraints` opens `const p = cfg.pPhase1`.

**Four distinct claims, in strictly increasing strength. A study may only assert those it earns:**

| | Claim | Established by |
|---|---|---|
| 1 | **Action change** — the mechanism changes what is chosen | a non-empty flip set; structural-zero null |
| 2 | **Oracle alignment** — changes land on the oracle's action | labelled flips |
| 3 | **Correct application** — alignment is not attributable to arbitrary redistribution | rejecting `H_shuffle₀` (β) |
| 4 | **"Planning"** — the mechanism internally represents and optimises a future path | **NOT establishable by any design here.** §1 of the formulation memo shows the mechanism cannot read `p_e`; any reliability alignment is necessarily indirect through reward memory |

**Claim 4 is out of reach and must be excluded from every future report.** β reaches claim 3, and
claim 3 is the Director's stated objective.

---

## 13. Phase handling

Unchanged from the formulation memo §5, and applied to the readout population:

- The reliability oracle is evaluated with the `p` **in force at the decision being scored**. For a
  policy readout taken at end of run, the learned state is a single object, so the readout is scored
  against **`pPhase1` and `pPhase2` separately**, exactly as UQ-A scored one final Q table against
  both — retention/interference against regime 1, adaptation against regime 2.
- **The two are never pooled.** The hop oracle is constant; the reliability oracle is not. That
  asymmetry is preserved in reporting.
- The phase-2 R5-disagreement count is a **per-configuration disclosure**, since acceptance guarantees
  it only for phase 1.

---

## 14. The smallest sufficient hypothesis set

Three. P1/P2/P3 from the formulation memo collapse into the alignment layer; nothing is added because
it is interesting.

| | Hypothesis | Contrast |
|---|---|---|
| **S0** | The mechanism does not change the readout policy. | ARMED vs ABLATED |
| **S1** | It changes the policy, and the change is not distinguishable from arbitrary redistribution. (`H_shuffle₀`) | ARMED vs K shuffles |
| **S2** | It changes the policy, and the change is oracle-aligned beyond arbitrary redistribution. | ARMED vs K shuffles |

S0 is the liveness question at the policy level. S1 and S2 are the two sides of the Director's
objective. The `ARMED-WORSE` verdict of §7 is an outcome of the S1/S2 contrast, not a fourth
hypothesis.

---

## 15. Falsification

| | Falsifier, which can genuinely occur |
|---|---|
| **S0** | one decision state where ARMED and ABLATED readouts differ. Structural-zero null: under a disconnected term the readouts are identical by determinism. Cannot be construction-guaranteed — an INERT outcome is a real possibility. |
| **S1** | `A(ARMED) > A(σ)` for all `K` shuffles in some configuration. Can occur; and can fail to occur, since the term's dominant component is an information-free field. |
| **S2** | `A(ARMED) ≤ A(σ)` for at least one `σ`. Can occur, and under `H_shuffle₀` occurs with probability `K/(K+1)`. |

No falsifier is vacuous and none is guaranteed by construction. The P4 vacuity guard carries forward:
`H_shuffle₀` is evaluated on the full readout population, never on a subset where its falsifier would
be structurally forced.

---

## 16. D-011 compliance

**Yes, the complete discriminator can be frozen before any registered result is observed** —
*conditional on the §18 decision*, because `K` is part of the discriminator and `K` is not yet chosen.

Element-by-element: discriminator (§7) ✔ · observables (§11, the readout policy at 19 states) ✔ ·
decision rule (§7) ✔ · refutation criteria (§15) ✔ · identifiability audit (§11, with two named
prerequisites) ✔ · stopping/minimum-evidence rule — not yet, and correctly not chosen here ·
post-hoc prohibition ✔ as boilerplate.

**The one element that cannot be frozen today is the value of `K`.** That is precisely why this gate
ends in classification B and not A.

---

## 17. Complexity test — α against β, judged on value and not ambition

| | α (two arms, non-directional) | β (two arms + K readout shuffles) |
|---|---|---|
| **Answers the stated objective** | **No.** Cannot distinguish the mechanism from arbitrary redistribution. | **Yes.** That is exactly `H_shuffle₀`. |
| **New assumptions** | none | one: exchangeability of the identity permutation under `H_shuffle₀` — **exact, not distributional** |
| **New stochasticity** | none | permutation seeds + readout RNG; **fully containable** (§8) |
| **New selection problems** | none beyond the population choice | **none, in the readout form** (§11). Fatal in the running-arm form (§10) |
| **New tuning parameters** | none | **one: `K`, which is a significance level and has no source-based justification** (§5) |
| **New failure modes** | MIXED, near-certain → no direction | attribution limit (§6); a two-pass loop restructuring whose neutrality must be proved (§1) |
| **Implementation complexity** | one-line transform, proven | two-pass restructuring + a `bestChoice` probe + K readouts |
| **Information gained** | liveness, pure-alignment refutations, dominance verdict — and, with §11, a full-population paired alignment count | all of that, **plus** a calibrated answer to whether the mechanism beats its own noise |

**β remains superior, and the reason is specific rather than aspirational.** α cannot answer the
question the Director posed — *distinguishable from arbitrary redistribution* is the whole objective,
and α has no comparison that addresses it. α would deliver an honest study whose most likely terminal
state is MIXED, which is UQ-A's outcome reached by a shorter road.

**β's costs are real and I do not minimise them:** one exact assumption, one unjustifiable-from-source
constant, a control-flow modification, and an attribution limit. But every one of them is **declarable
in advance**, and the single cost that once looked fatal — §10's population collapse — is removed
entirely by the §11 readout, which is itself an improvement α should adopt regardless.

**I would reject β if it were still the running-arm design of §10.** It is not, and the revised form
earns its complexity.

---

## 18. Classification

> ## **B — β REQUIRES ONE SPECIFIC DIRECTOR DECISION**

Not A: `K` is part of the discriminator, `K` has no source-based justification (§5), and a
discriminator with an unchosen parameter cannot be frozen. Not C: §11 establishes that every required
observable is computable on the current architecture, with two named and precedented prerequisites.
Not D: α cannot answer the stated objective (§17).

### The ONE decision

> **Does this study adopt a pre-registered exact permutation test — thereby fixing a significance
> level `α = 1/(K+1)` through the choice of `K`, and departing from the descriptive-only statistics
> policy that M9 §11, Q1 §10 and UQ-A §11 each froze — and if so, what is `K`?**

The two parts are one decision because they cannot be separated: adopting the test *is* fixing `K`,
and `K` *is* the significance level. Whatever value is chosen must be frozen before collection, never
revisited, and its justification recorded as a Director judgment rather than a source-derived
quantity — the same disclosure D-006 §4 required for the 20-configuration minimum.

**No value of `K` is proposed here, and none may be inferred from this document.**

### Two consequences of the ruling, whichever way it goes

1. **The §11 policy readout should be adopted regardless of the `K` decision.** It removes the
   principal-stratum limitation entirely, needs no permutation, and improves α as much as β. Its two
   prerequisites — a `bestChoice` probe and a seeded readout — are ordinary instrumentation of a kind
   Q1 has already committed.
2. **Claim 4 of §12 — that the mechanism is "planning" — is unreachable by any design considered
   here** and must be excluded from every future report on this mechanism.

---

## 19. What this document authorises

**Nothing.** No hypothesis is frozen, no pre-registration exists, no parameter or seed is selected, no
production source is modified, no arm is implemented, and no liveness check has been run.

The next milestone requires its own authorisation.
