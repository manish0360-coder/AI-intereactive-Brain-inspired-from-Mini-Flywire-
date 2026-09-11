# M25 — Target-Population and Draw-Mechanism Specification

**Status:** FORMULATION ONLY — no implementation, no experiment, no seeds, no preregistration
**Milestone:** M25
**Date:** 2026-09-11
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-09-11 — *M24-YELLOW ACCEPTED → M25 AUTHORIZED*

**Nothing was run. No seed generated, selected, evaluated or consumed; no configuration
instantiated; no new block; no preregistration; no statistical test; no multiplicity estimated; no
`agentSeed` varied; no architecture, production, C1/UQ-B, F1/F2 or registry change.** `env.js`,
`rng.js`, `run.js`, `c1/collect.js`, `c1/protocol.js` and `uqb/collect.js` were **read**. The
`895000–895999` registry-link defect remains open and unrepaired.

**Frozen by the ruling and carried forward:** accepted-key population ≠ unique-configuration
population ≠ full generated population ≠ superpopulation.

---

## 1. Verdict

> # M25-YELLOW
> **A target population and draw mechanism are conditionally justified — for a claim far narrower
> than the one the North Star needs.**
>
> **Chosen target population:** `A′` — accepted **keys** over `S′ = S \ {0}`, `I = {0,1,2,3}` —
> sampled by uniform random key draw with rejection. The **scientific unit is the configuration
> content**; the key is the *sampling device*. The two paths **coincide exactly under a condition
> that is falsifiable at zero cost**, so M25 declares the condition rather than choosing a path (§4).
>
> **And the answer to the Director's §16 question is NO.** No currently definable target population
> would make a future result evidence about a **reusable cognitive mechanism** rather than about a
> particular implementation trajectory. **The missing layer is named exactly in §8 and it is not
> the sampling frame.**

These are answers to two different questions and conflating them would be the error this milestone
exists to prevent.

---

## 2. The decisive source findings

Three facts, read from committed source, that determine everything below.

### 2.1 Every learning-phase RNG stream is seeded from `agentSeed` alone

`experiments/m7/run.js:318–321`:

```
cognitive:   input.agentSeed >>> 0
visual:      (input.agentSeed ^ 0x9e3779b9) >>> 0
environment: (input.agentSeed ^ 0x5EED) >>> 0
sigma:       (input.agentSeed ^ 0xBEEF) >>> 0
```

`configSeed` enters only through `env.generateAccepted(configSeed, configIndex)` (`run.js:120`) —
i.e. it selects the **environment content** and nothing else.

> **EVIDENCE. With `agentSeed` frozen at `20260819000`, the stochastic component of the 3000-tick
> learning run is a SINGLE FIXED SEQUENCE shared by all 70 C1 configurations.**
>
> It is not an independently re-randomised nuisance averaged over the census. It is a **fixed effect
> common to every observation**, perfectly confounded with any population-level result, and **no
> amount of configuration sampling can detect it.** This is stronger than "`agentSeed` is fixed",
> which is how M24 put it, and it is the finding that drives §8 and §16.

### 2.2 The readout stream is *not* seeded from `agentSeed`

`experiments/uqb/collect.js:53–54`, used at `c1/collect.js:68`:

```
readoutSeed(configSeed, arm, state) =
    ((configSeed * 1000003) ^ (arm === 'ARMED' ? 0x5bf03635 : 0x27d4eb2f) ^ (state * 2654435761)) >>> 0
```

**Readout randomisation depends on `configSeed`.** Two keys with identical content therefore share
an identical learning run but receive **different readout streams**.

### 2.3 Acceptance factors through content — carried from M24-R1, re-verified

`evaluateConstraints` reads only `cfg.pPhase1`, `cfg.goal`, `cfg.embedding`; never `cfg.configSeed`;
no agent or arm symbol. Every fiber of `g` is wholly accepted or wholly rejected.

---

## 3. Repeated key vs distinct key with identical content vs replicate

The ruling's §3, and **§2.2 forces a correction to my own M24-R1**.

| | What is shared | What differs | Scientific status |
|---|---|---|---|
| **Repeated key** | everything | nothing | **Reproduction.** Bit-identical. Zero information about the effect; a genuine integrity check (C1's fingerprints already serve this) |
| **Distinct key, identical content** | environment content; learning run **bit-identical** (§2.1) | **readout RNG stream** (§2.2) | **A replicate under measurement-randomisation variation.** *Not* a pure duplicate |
| **Replicate** | the scientific unit | an independently re-randomised nuisance | the general notion; the row above is a **narrow special case** of it |

> **CORRECTION to M24-R1.** M24-R1 stated that duplicate-content keys are *"exact replicas… no
> information gain."* **That is too strong.** It is correct for the learning phase and false in
> general: `readoutSeed` depends on `configSeed` (§2.2), so duplicate-content keys differ in readout
> randomisation.
>
> **Whether that changes `Δ` is UNKNOWN.** `E6` reads ranks of candidate *weights*, and `best` is
> taken at step 0 before the epsilon override, so `Δ` may well be invariant — but the stream is
> reseeded per readout precisely because something consumes randomness, and **I could not establish
> outcome-equivalence from source.** The ruling asked me to establish it rather than assume it; the
> honest answer is that it is not established, and a concrete route by which it could fail is named.

**Consequence.** Duplicate content is neither "new data" nor "worthless". It is a **readout-level
replicate**: it carries no new information about the environment or the learning trajectory, and it
*might* carry information about measurement stability — which is not the estimand.

---

## 4. The scientific unit, and the resolution of the two paths

### 4.1 Candidate units

| Candidate unit | What varies | What is held fixed | Duplicates informative? | Target population it defines | Matches the scientific question? |
|---|---|---|---|---|---|
| **key identity** | provenance integer | — | trivially (different keys) | `A′` | **No** — provenance is an implementation artifact |
| **configuration content** | environment | agent, graph family, code | no (environment identical) | `C_A` | **Yes, for a configuration-robustness question** |
| content **+ provenance** | both | — | by construction | `A′` | No — reintroduces the artifact |
| content **+ agent initialisation** | environment **and** agent | graph, code | — | not currently a population (§8) | **Yes, for a mechanism question** |
| content **+ environment family** | environment structure | code | — | not currently a population (§9) | Yes, for a transfer question |
| content **+ experience history** | history | — | — | not an independent axis (§11) | — |

### 4.2 Path A and Path B, formally

**Path A — accepted keys.** `A′ = {k ∈ S′ × I : α(k)}`. Finite (`≤ (2³²−1)·4`). Unit: key. Uniform
key draw with rejection gives inclusion probability `1/|A′|` — **exact, equal, known, assumption-free
(M24-R1 §3).** Estimand: the mean of `Δ` over accepted keys, i.e. the **multiplicity-weighted** mean
over contents. Licensed claim: *a statement about accepted keys*, and — per the ruling — **it may
not be called a claim about unique configurations** unless §4.3's condition holds.

**Path B — unique accepted configurations.** `C_A = g(A′)`, `m(c) = |g⁻¹(c) ∩ A′|`.

| Property of `m(c)` | Status |
|---|---|
| finite | **YES** — bounded by `\|A′\|` |
| known | **NO** |
| computable for a given `c` | **only by enumerating the `2³²`-sized fiber** — not feasible |
| enumerable over `C_A` | **NO** |
| estimable without unacceptable assumptions | **NO** — and the ruling forbids estimating it experimentally, which is also the only route that could bound it |
| scientifically meaningful as a weight | **NO — see §6** |

> **Uniform sampling over unique configurations is NOT operationally possible.** It would require
> either `m(c)` (unavailable) or a direct sampler over `C_A` (which does not exist — `C_A` is defined
> only as the image of a map we can evaluate forward, never invert).

### 4.3 The resolution — declare the condition, do not choose a path

The two paths **coincide exactly iff `m ≡ 1` on `A′`**. And that condition is:

1. **Already true for the one verified violation**, which `S′ = S \ {0}` removes at zero cost
   (M24-R1 §4.5);
2. **Falsifiable at zero cost on any future draw** — hash the content of each drawn configuration and
   look for duplicates. No extra run, no extra seed, no estimation of `m(c)`;
3. **Not assumable** — it remains **Hy-1**.

> **M25 therefore declares: the scientific unit is the configuration CONTENT; the key is the sampling
> device; `m ≡ 1` is a falsifiable precondition monitored on every draw. If a content-duplicate is
> ever observed, the precondition fails and the claim reverts to key-level, which is exact and
> assumption-free.**

This is not a compromise between two paths. It is the observation that the paths are **the same
measurement under a checkable condition**, and that choosing between them in advance would be
choosing between a scientifically meaningless weighting (Path A's estimand) and an unsamplable
population (Path B) when neither choice is necessary.

---

## 5. Acceptance as part of the target population

Reused from M24-R1 and **not re-litigated**: the acceptance predicate is **pre-treatment and
arm-independent**, so it cannot induce collider bias on the treatment contrast.

> **What that licenses:** `A′` is a legitimate, operationally decidable finite subset.
> **What it does NOT license:** that `A′` represents the unrestricted generated population. It does
> not. Acceptance conditions on the oracle's structure (R2 at `env.js:227`; **R5 at `:241` requires
> the reliability-optimal and hop-optimal policies to differ on ≥ 4 decision states**), and C1
> accepted **70 of 4000 (1.75%)**.

**Should acceptance remain part of the target population for future studies?**

**Yes, for a configuration-robustness question — and this is the one place where the restriction is a
feature rather than a cost.** A mechanism claim is a claim about environments where the mechanism
*could* matter. An environment in which the reliability-optimal and hop-optimal policies coincide
everywhere offers the mechanism nothing to do, and including it would dilute the estimand toward zero
for a reason that has nothing to do with the mechanism.

**But the honest counterweight, which §18 develops:** the predicate is also uncomfortably close to
encoding the mechanism's own operating condition. `R5` requires the oracle to disagree with the naive
policy — which is precisely the circumstance in which a lookahead term has something to contribute.
**The eligibility rule and the hypothesis are not independent.** That is a limitation of any claim
over `A′` and it must be declared; it is not a reason to change the frozen rules, which M25 does not
touch.

---

## 6. Multiplicity: `P_key(c) = m(c)/|A′|` versus `P_unique(c) = 1/|C_A|`

The ruling asks the right question: *does the mechanism's scientific behaviour belong to the
configuration itself, or to the configuration-generation process?*

**It belongs to the configuration.** `m(c)` counts how many 32-bit integers happen to map to a
content under mulberry32's arithmetic. It is a property of **the PRNG**, not of the environment, not
of the agent, not of the mechanism. Weighting environments by `m(c)` asserts that an environment is
"more of the population" because more integers index it — **a statement with no scientific referent.**
MiniFlyWire is not studying mulberry32.

> **Therefore `P_unique` is the scientifically appropriate distribution and `P_key` is an
> implementation artifact.** The ruling warns against assuming "unique is automatically more
> scientific"; the conclusion here is not assumed, it is derived from what `m(c)` *is*.

**And yet `P_unique` is not samplable (§4.2).** That is exactly why §4.3's condition matters: it is
the only route by which the samplable distribution and the meaningful one are the same object.

**One case would overturn this**, and it is worth stating: if the *generation process itself* were
the scientific object — e.g. a question about what environments this generator tends to produce —
then `P_key` would be correct and `P_unique` wrong. **No MiniFlyWire question is of that form**, and
if one ever is, this section must be revisited rather than reused.

---

## 7. Is multiplicity relevant to the mechanism? — toy cases

| # | Case | Key-level inference | Unique-configuration inference | Mechanism robustness |
|---|---|---|---|---|
| 1 | two keys → identical content, **identical outcome** | counts the content twice; weight distorted, no information added | counts once; correct | unaffected — the duplicate says nothing |
| 2 | two keys → identical content, **different outcome** | treats them as two observations | **the unit is ill-defined**: one content, two outcomes | **informative** — it would prove the outcome depends on something outside the content, i.e. on readout randomisation (§2.2) |
| 3 | two keys → **nearly** identical content, different outcome | two legitimate observations | two legitimate observations | ordinary sensitivity; not a duplication problem at all |
| 4 | `m(c)` **correlates** with `Δ(c)` | **biased** relative to `P_unique` — see §18.2, where the sign flips | correct | a real hazard; the guard is §4.3 |
| 5 | `m(c)` **independent** of `Δ(c)` | unbiased for the mean, inflated apparent precision | correct | benign |

**Case 2 deserves the emphasis.** Under §2.2 it is *possible*, not excluded. If it occurred, it would
not be a nuisance — it would be **evidence that `Δ` is not a function of content alone**, which is a
fact about the instrument worth knowing. §4.3's duplicate check would surface it for free.

**Case 4 is the one that matters for validity**, and §18.2 shows it can reverse the sign of the
reported effect. There is no known mechanism linking `m(c)` to `Δ(c)` — but *"no mechanism I can
think of"* is **HYPOTHESIS**, not evidence, and the guard is the falsifiable precondition, not the
intuition.

---

## 8. Agent initialisation — the missing layer

**Configuration robustness** = does the effect persist across environments, holding the agent fixed?
**Agent-initialisation robustness** = does it persist across agent initialisations?

Current studies establish the first and **cannot address the second at all**, because `agentSeed` is
degenerate at one value — and by §2.1 this is stronger than a fixed parameter: **all four RNG streams
of the learning run derive from it**, so the entire census shares one pseudo-random learning
sequence.

**What exactly becomes possible or impossible:**

| | `agentSeed` fixed (today) | `agentSeed` varied |
|---|---|---|
| **Possible** | *"For agent initialisation 20260819000, over `A′`, the effect is X."* | *"Over agent initialisations and environments, the effect is X"* — and, decisively, **the variance can be attributed between the two axes** |
| **Impossible** | **Any claim separating the mechanism from this initialisation.** They are perfectly confounded | — |
| **Undetectable** | any dependence of the result on that one learning sequence — it is a shared fixed effect, invisible to configuration sampling | detectable |

> **This is the exact missing layer.** Not a bigger `N`, not a better frame: **a second axis.**
> A mechanism that reproduces across 10 000 environments under one learning sequence has been shown
> to be robust to environments. It has been shown **nothing** about robustness to initialisation, and
> "robust to initialisation" is closer to what "mechanism" means.

**M25 does not make varying `agentSeed` mandatory.** It states what is and is not claimable either
way, which is what the ruling asked. **Which claim the program wants is a Director decision.**

---

## 9. Environment

| Regime | Claim permitted |
|---|---|
| **Fixed environment (today)** — one 20-node, 39-edge graph, one hidden-variable family (13/39 unreliable, two fixed uniform ranges) | claims about **reliability assignments on this graph**; nothing about graph structure |
| **Varying environment** | claims about environments within the sampled family |
| **Environment family** | claims about the family, if the family itself is a defined population |

**The population is not expanded here.** For the *next* meaningful claim, the minimum is the current
fixed environment — §8's axis is both cheaper and more fundamental, since initialisation-dependence
would undermine an environment-varying result just as thoroughly.

---

## 10. Task / goal

The four goals `GOALS[configIndex % 4]` are **four fixed task instances**, enumerated exhaustively
for every seed. They are **part of configuration content** (`goal ∈ π(cfg)`), and they could serve
as a **stratification variable** since acceptance is goal-dependent.

> **They are NOT a representative task distribution, and no evidence suggests they are.** They were
> not sampled from a task family; no task family is defined. A result "across four goals" is a result
> about **those four goals**. Under uniform key draw the goal marginal in `K` is exactly uniform, but
> **the marginal in `A′` is an outcome of the acceptance predicate, not a design choice** — C1
> observed 15/17/18/20 across goals 8/12/16/19.

---

## 11. Experience history

Under the current architecture, experience-induced state is a **deterministic mediator**: it is a
function of `(content, agentSeed)` and of nothing else (§2.1). It is therefore:

- **not** part of configuration (it is produced by the run, not by `makeConfig`);
- **not** part of agent initialisation (it is downstream of it);
- **not** an independent population axis — it has **no degrees of freedom** once content and
  `agentSeed` are fixed;
- **a mediator**, and the one M22 established cannot be decomposed.

> **To make experience an axis would require either varying `agentSeed` (§8) or injecting history
> directly — an architecture change.** M25 prescribes neither.

**Why this matters for the North Star, stated without prescribing:** the objective is mechanisms that
survive *changing* experience, not mechanisms that reproduce under identical history. Today the
program can only observe the latter. **That gap is real, and it is the same gap as §8.**

---

## 12. The generalisation ladder

The ruling's ladder, **modified**: its G1/G2 are not two rungs but one rung under two readings of the
unit (§4.3), and a rung is missing between G2 and G3.

| | Target population | Sampling unit | Required variation | Strongest licensed claim | Major limitation |
|---|---|---|---|---|---|
| **G0** | the enumerated configurations | — (census) | none | exact statement about them | **licensed today** (C1/M20) |
| **G1** | `A′`, accepted keys, fixed agent & environment | key | random key draw | *"over accepted keys, for this initialisation and graph, the effect is X"* | estimand multiplicity-weighted; implementation-dependent unless §4.3 holds |
| **G2** | `C_A`, unique contents, same conditions | content | G1 **+ `m ≡ 1` verified** | *the same claim, about environments* | **not separately samplable**; reduces to G1 under §4.3 |
| **G2.5** *(inserted)* | `C_A` with readout randomisation varied | content | re-randomised readout per unit | *the effect is not an artifact of measurement randomisation* | **currently untestable** — §2.2 makes it possible in principle and it has never been done |
| **G3** | contents × agent initialisations | (content, agentSeed) | **`agentSeed` varied** | *"the effect is not an artifact of one learning sequence"* | **the first rung that is about a mechanism at all** |
| **G4** | × environments | (content, agentSeed, env) | environment family defined | *"the effect is not an artifact of this graph"* | needs a defined family |
| **G5** | × tasks | + task | task family defined | *"…not an artifact of these four goals"* | no task family exists |
| **G6** | new problem family | — | — | **mechanism transfer** | also blocked by M22/M23 architectural obstacles, which are **not** sampling problems |

> **G0 is licensed. G1 is reachable by governance alone. G2 collapses into G1 under §4.3. G3 is the
> first rung that speaks about a mechanism, and it is unreachable without a second axis.**
> **G2.5 is newly identified here and costs nothing to add once §2.2 is acknowledged.**

---

## 13. Path A — advantages and limitations

**Advantages, all real:** exact finite-population inference; equal, known inclusion probabilities
with **no assumption about the PRNG**; complete reproducibility; registry-compatible provenance;
dissolves the cluster problem of contiguous blocks (M24-R1 §9.2).

**Limitation, and it is not fatal:** the estimand is **implementation-dependent** — it weights
environments by a PRNG collision structure (§6).

**Is that acceptable?** *Not because keys are implementation artifacts* — that alone would be a bad
reason to reject it, since every experimental unit is operationalised somehow. *And not because it is
statistically convenient* — that alone would be a bad reason to accept it.

> **It is acceptable because §4.3 makes the artifact falsifiable rather than assumed.** Under
> `m ≡ 1` the key-level estimand **is** the content-level estimand; if a duplicate appears, the
> program learns that and reverts to the exact key-level claim. Nothing is hidden either way.

---

## 14. Path B — advantages and limitations

**Advantage:** the unit is the scientifically meaningful one (§6).

**Limitation:** **it is not operationally possible.** `C_A` cannot be enumerated or sampled directly;
`m(c)` is unknown, uncomputable in practice, and — by the ruling's own constraint — not to be
estimated experimentally.

> **No weighting estimator is invented here, and no pilot is proposed to make the path look
> feasible.** Path B is not *pursued*; it is **reached** by Path A whenever §4.3's condition holds.
> That is the only honest form in which it is available.

---

## 15. Decision matrix

| Property | **Accepted keys `A′`** | **Unique configurations `C_A`** | **Broader agent population** | **Environment / task population** |
|---|---|---|---|---|
| operationally definable | **YES** — decidable per key by committed code | **YES** as a set; **NO** as a sampling frame | **NO** — no population defined | **NO** — no family defined |
| sampling design available | **YES** — uniform key draw + rejection | **NO** — no sampler over `C_A` | **NO** | **NO** |
| inclusion probabilities | **exact, equal, known** | `m(c)/\|A′\|` under key draw; unknown | n/a | n/a |
| duplicate handling | counts each key | requires `m(c)` | n/a | n/a |
| current evidence | C1 census (not a sample) | same census | **none** — one value | **none** — one graph, four goals |
| scientific meaning | weight is a **PRNG artifact** (§6) | **the meaningful unit** | **the mechanism question** | the transfer question |
| mechanism robustness | **NO** — confounded with one learning sequence (§2.1) | **NO** — same confound | **YES, partially** | YES, further |
| transferability | **NO** | **NO** | not alone | not alone |
| assumptions required | **none** for the key claim; **Hy-1** for the content claim | `m(c)` known | — | — |
| current blocker | selection is block-fiat, not randomised | `m(c)` unknown & unsamplable | **`agentSeed` degenerate** | no defined family |

---

## 16. The North Star question, answered directly

> *"Which minimum target population would allow a future MiniFlyWire result to be meaningful evidence
> about a reusable cognitive mechanism rather than merely about a particular implementation
> trajectory?"*

# We cannot yet define such a population.

The minimum population for a *mechanism* claim is **G3 — contents × agent initialisations** — and
that is not a population today, because `agentSeed` has one value and, by §2.1, **all four learning
RNG streams derive from it**. Every C1 observation shares one pseudo-random learning sequence.

**A result over `A′`, however perfectly sampled, is evidence about environments under one learning
trajectory.** It is not evidence about a mechanism, because the mechanism and the trajectory are
**perfectly confounded** and configuration sampling cannot separate them **at any `N`**.

**The exact missing layer, per §22 of the ruling:** a second axis of variation at the **agent
initialisation**. Not more configurations. Not a better frame. **A second axis.**

**And even G3 would not be sufficient** for transfer: M22's non-identifiability of the
ranking/admission decomposition and M23's finding that admission and weighting share a direct cause
(`penalties`) are **architectural**, and no population design touches them.

---

## 17. The minimum legitimate draw mechanism

Specification only. **Not implemented, no seeds selected, no ranges created.**

| | |
|---|---|
| **Population** | `A′ = {k ∈ S′ × I : α(k)}`, `S′ = {1 … 2³²−1}` (seed 0 excluded — removes the one verified collision), `α` pinned by commit digest |
| **Sampling unit** | **key**, as the sampling device; the **scientific unit is content** (§4.3) |
| **Selection mechanism** | uniform random draw over `S′ × I` with rejection on `¬α`; the draw's own randomisation source declared and preregistered **before any key is drawn** |
| **Inclusion probability** | `1/\|A′\|` per retained draw — exact, equal, known, assumption-free |
| **Duplicate handling** | content-hash every drawn configuration; **record duplicates as a falsifiable precondition check (§4.3)**. Zero duplicates ⇒ key-level and content-level claims coincide. Any duplicate ⇒ precondition fails, claim reverts to key-level, and the duplicate is reported (§7 case 2) |
| **Acceptance handling** | acceptance is **eligibility**, applied pre-treatment; it defines the population and is **never** described as representing the generated population (§5) |
| **Clustering / dependence** | uniform key draw dissolves the contiguous-block cluster structure. *If a seed-then-all-four-goals design is ever preferred, the cluster is legitimate but must be declared and honoured* |
| **Licensed inference** | **G1 only** — design-based finite-population inference over `A′`, conditional on `agentSeed = 20260819000`, one graph, one hidden-variable family, and the four enumerated goals |

---

## 18. PASS 2 — adversarial self-review

### 18.1 The eight attacks

**(a) The sampling unit is an implementation artifact.** **Lands on Path A's estimand and is
answered, not dismissed.** `m(c)` is a PRNG property (§6). §4.3 converts the artifact from an
assumption into a falsifiable precondition. **It does not make it disappear**, and if `m ≢ 1` the
key-level claim is exact but implementation-dependent.

**(b) "Unique configuration" is ill-defined.** **Partially lands.** It is well-defined as
`π(cfg) = (goal, unreliableSet, pPhase1, pPhase2, embedding)` — but that projection is *my* choice,
not the system's: the system returns provenance-carrying objects (M24-R1 §2.1a). A different
projection (say, treating embeddings as nuisance) would yield a different `C_A` and different `m`.
**The content projection must be declared explicitly, and §17 does so.**

**(c) Multiplicity weighting changes the estimand.** **Lands — and §18.2 shows it can reverse the
sign.**

**(d) Fixed `agentSeed` invalidates the intended claim.** **Lands completely for a mechanism claim,
and not at all for a configuration claim.** §8, §16. The verdict is built on conceding this.

**(e) Fixed environment invalidates transfer.** **Lands.** §9, §12 G4.

**(f) The accepted-population restriction encodes the mechanism.** **Lands, and it is the sharpest
attack in this section.** `R5` requires the oracle to disagree with the naive policy on ≥ 4 states —
precisely the condition under which a lookahead term has anything to contribute. **The eligibility
rule is not independent of the hypothesis.** §5 concedes this. It is a limitation of every claim over
`A′`, it cannot be removed without changing frozen rules M25 must not touch, and it must be declared
in any future artifact.

**(g) Seed randomness mistaken for scientific random sampling.** **Does not land — this is the one
the program has already fixed.** M24-R1 §9 established that randomisation must live in the selection,
not the generator; §17 places it there.

**(h) The target population is not operationally enumerable.** **Partially lands.** `A′` is
*decidable* per key but **not enumerable** — `|A′|` is unknown and M25 does not estimate it. Design-
based inference needs inclusion probabilities, not the population size, so the sampling design is
unaffected; but **any statement requiring `|A′|` is unavailable**, and none is made.

### 18.2 A case where the two paths give **opposite** scientific conclusions

`C_A = {c₁, c₂}` with `m(c₁) = 3`, `Δ(c₁) = −1`; `m(c₂) = 1`, `Δ(c₂) = +2`. So `|A′| = 4`.

```
Path A (keys)          E[Δ] = (3·(−1) + 1·(+2)) / 4 = −0.25     →  favours ARMED
Path B (unique)        E[Δ] = ((−1) + (+2)) / 2     = +0.50     →  favours ABLATED
```

**Opposite signs from the same population.** Under the frozen convention the sign *is* the scientific
conclusion, so **the choice of unit could invert the reported direction of the effect.**

**Why it matters:** the unit must be fixed **before data**, exactly as C1 §2 fixed the sign
convention, "so it cannot be chosen after seeing data." §17 fixes it; §4.3 makes the condition under
which the two agree **checkable rather than assumed**.

**Is such a correlation plausible?** No mechanism linking `m(c)` to `Δ(c)` is known. **That is
HYPOTHESIS, not evidence** — and it is exactly the kind of intuition this program has repeatedly
found to be wrong. The guard is the precondition check, not the intuition.

### 18.3 Did the verdict survive for the right reason?

**I tested RED.** RED would require no defensible target population. But `A′` is decidable by
committed code and admits exact, assumption-free inclusion probabilities — a real design-based frame
(M24-R1 §8). **RED would be a false negative.**

**I tested GREEN.** GREEN would require a justified population *and* draw mechanism without material
qualification. Five qualifications are mandatory: the content-projection declaration (18.1b); the
`m ≡ 1` precondition (§4.3); `agentSeed` confounding (§8); the eligibility-encodes-the-mechanism
limitation (18.1f); and **G1-only** licensing (§12). **GREEN would overclaim.**

**YELLOW survives — but note what it is YELLOW *about*.** It is YELLOW about the *sampling object*.
**The answer to §16 is an unqualified NO**, and that is not a YELLOW finding — it is a clean negative
that no amount of sampling work will change.

---

## 19. Evidence → Inference → Hypothesis

**EVIDENCE**
- **Ev-1.** All four learning-run RNG streams are seeded from `agentSeed` (`run.js:318–321`);
  `configSeed` enters only via `generateAccepted` (`:120`).
- **Ev-2.** `agentSeed = 20260819000`, fixed for all 70 C1 configurations (`c1/protocol.js`).
- **Ev-3.** `readoutSeed = f(configSeed, arm, state)` (`uqb/collect.js:53`), used at
  `c1/collect.js:68`.
- **Ev-4.** `evaluateConstraints` reads only content fields; no agent or arm symbol.
- **Ev-5.** R5 (`env.js:241`) requires reliability-optimal and hop-optimal policies to differ on ≥ 4
  decision states; C1 accepted 70 of 4000.
- **Ev-6.** `makeRng` opens `let a = (seed >>> 0) || 1`; seeds 0 and 1 share a stream (executed).
- **Ev-7.** Goals are `GOALS[configIndex % 4]`, four fixed instances, part of content.

**INFERENCE**
- **In-1.** The stochastic component of learning is a **fixed effect common to the entire census**,
  not an averaged nuisance (Ev-1, Ev-2) ⇒ mechanism and learning sequence are perfectly confounded,
  undetectably, at any `N`.
- **In-2.** Duplicate-content keys share an identical learning run but differ in readout
  randomisation (Ev-1, Ev-3) ⇒ they are **readout-level replicates**, not exact replicas
  ⇒ **M24-R1's "exact replicas" was too strong** (§3).
- **In-3.** `m(c)` is a PRNG property, so `P_key` weights environments by an implementation artifact
  (Ev-6) ⇒ `P_unique` is the meaningful distribution (§6).
- **In-4.** Path A and Path B coincide iff `m ≡ 1`, which is falsifiable at zero cost (§4.3).
- **In-5.** Eligibility is not independent of the hypothesis (Ev-5) ⇒ a declared limitation of every
  `A′` claim (18.1f).
- **In-6.** Experience history has no degrees of freedom given `(content, agentSeed)` (Ev-1) ⇒ it is
  a mediator, not an axis (§11).

**HYPOTHESIS**
- **Hy-1.** `m ≡ 1` on `A′` (i.e. `g` injective beyond the removed collision). **Plausible; not
  established. Every content-level claim is conditional on it and none is asserted without it.**
- **Hy-2.** That `Δ` is invariant to readout randomisation — i.e. §7 case 2 never occurs. **Not
  established from source** (In-2).
- **Hy-3.** That `m(c)` is uncorrelated with `Δ(c)` (§18.2).
- **Hy-4.** That C1's 1.75% acceptance rate is typical of `A′`.

**No cognitive interpretation is promoted. No claim of transferability is made, and none would follow
from the existence of a sampling frame.**

---

## 20. Decision gate

> # M25-YELLOW
> **Target population conditionally justified, with explicit assumptions.**

**Chosen target population.** `A′` — accepted keys over `S′ = S \ {0}` × `I` — drawn uniformly at
random with rejection; **scientific unit: configuration content**; `m ≡ 1` monitored as a falsifiable
precondition.

**Why chosen.** It is the **only** operationally definable population admitting exact, equal, known,
assumption-free inclusion probabilities; and under §4.3's checkable condition it *is* the
scientifically meaningful content-level population, so the program need not choose between a
meaningless weighting and an unsamplable target.

**What it does NOT establish.**
1. **Nothing about a reusable cognitive mechanism** (§16) — mechanism and learning sequence are
   perfectly confounded (In-1).
2. Nothing about the unrestricted generated population — acceptance is 1.75% and outcome-adjacent.
3. Nothing about agent initialisation, graph structure, or task generality.
4. Nothing about transfer — additionally blocked by the M22/M23 architectural obstacles.
5. Nothing that survives if `m ≢ 1`, beyond the exact key-level claim.

**Minimum next milestone.** **None is required, and I am not proposing one to fill the gap.** The
scientific object is now settled: the sampling question is closed at G1, and §16 answers that G1 is
not what the North Star needs. The next decision is **the Director's choice of which claim the
program wants**, and it is a strategic choice, not a measurement:

- **(i) Accept G1** as the program's ceiling for now, and implement §17 — **an implementation
  milestone** (`M26 — Draw-Mechanism Implementation`), requiring its own Pass 1 specification gate
  and Pass 2 implementation-plus-verification gate, never collapsed into one.
- **(ii) Pursue G3** — the first rung that speaks about a mechanism — which requires a second axis at
  agent initialisation. That is a **formulation** milestone first (`M26 — Agent-Initialisation
  Population Formulation`), because §8 shows the claim structure changes, not merely the `N`.
- **(iii) Neither** — conclude that MiniFlyWire's current architecture cannot separate mechanism from
  trajectory, and treat that as the finding.

**My recommendation: (ii), as formulation only.** Not because a limitation exists — that is never a
reason — but because **(i) buys precision on a claim §16 shows is not the one the program needs**,
while (ii) addresses the exact missing layer. I note honestly that (ii) does not resolve the M22/M23
architectural obstacles either, so **(iii) remains a defensible Director call** and I would not argue
against it.

**Milestone type: FORMULATION** under either (ii) or (iii); **IMPLEMENTATION** only under (i).

**Still outstanding, still untouched, and required before any successor draws keys:** the
`895000–895999` registry-link defect.
