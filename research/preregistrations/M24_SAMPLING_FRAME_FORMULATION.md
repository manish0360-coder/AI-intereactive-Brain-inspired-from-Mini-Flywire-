# M24 — Sampling-Frame Formulation

**Status:** FORMULATION ONLY — no implementation, no experiment, no seeds, no new block
**Milestone:** M24
**Date:** 2026-09-11
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-09-11 — *M23 ACCEPT → M24 AUTHORIZED*

**Nothing was run. No production source, preregistration, frozen artifact, dataset, F1/F2 filter or
registry entry was modified. No seed was generated, selected, evaluated or consumed, and no
configuration was instantiated.** `main.js`, `experiments/m7/env.js` and `instrumentation/rng.js`
were **read**; no line changed. No statistical test is introduced and no sample size is proposed.
The `895000–895999` registry-link defect remains open and is **not** repaired here.

**Closed by prior rulings and not reopened:** the `Total = Ranking + Admission` decomposition; the
intersection-as-ranking-pathway reading; `τ_∩` as a causal successor to E6; another E6 census for
more observations; explaining the positive C1 `Δ` before a discriminating measurement exists.

---

## 0. Decision gate — stated first

> # M24-YELLOW
> **A defensible sampling frame exists, but not the one the program has been using, and not for the
> population the program would want.**
>
> **`P2` — the accepted-configuration population — is operationally definable, and uniform random
> seed draw with rejection yields a probability sample of it with known, equal inclusion
> probabilities.** That is a genuine frame and I am not going to call it RED.
>
> **Three limitations are mandatory, not optional:** the target is `P2` and **never** `P1` (§7);
> C1's contiguous block is a **census**, not a sample, and the frame requires changing the
> *selection mechanism* (§6); and the frame licenses generalisation level **B only** — it brings
> mechanism transfer (level D) **no closer at all** (§8, §9).

---

## 1. The exact question

> *What is the scientifically defensible target population of MiniFlyWire configurations, how could
> configurations be sampled from that population, and under what assumptions — if any — could
> observations from a future registered block support claims beyond that finite enumerated block?*

**Answered in order at §4 (population), §6 (sampling), §5/§7 (assumptions), §8 (what is licensed).**

---

## 2. Formal definition of a configuration

From `experiments/m7/env.js:162–206`, read and not modified.

`makeConfig(configSeed, configIndex)` returns a configuration determined by:

| Component | Source | Determined by |
|---|---|---|
| `goal` | `GOALS[configIndex % GOALS.length]` | **`configIndex` only** |
| `unreliableSet` | `shuffledIndices(39, rnd)`, first `N_UNRELIABLE = 13` | `configSeed` only |
| `pPhase1`, `pPhase2` | 39 draws from `P_UNRELIABLE = [0.25,0.45]` and 39 from `P_RELIABLE = [0.90,1.00]`; phase 2 swaps which set is low | `configSeed` only |
| `embedding` | 20 nodes × `EMBED_DIM = 32` draws, normalised | `configSeed` only |
| `accepted` | `R1 ∧ R2 ∧ R3 ∧ R4 ∧ R5 ∧ G11` | the above — **no agent, no arm** |

**Fixed for every configuration in the entire program**, and therefore *outside* any population the
current system can sample over:

- the **graph**: 20 nodes, 39 edges, read from `neurons.json` / `connections.json`;
- the **hidden-variable family**: Bernoulli edge reliability, 13 of 39 unreliable, from two fixed
  uniform ranges;
- the **agent seed**: `agentSeed = 20260819000`, frozen in `experiments/c1/protocol.js` — *identical
  for all 70 C1 configurations*;
- `m7Arm = 'A1'`, `ticks = 3000`, `decisionStates = 19`.

> **A "configuration" is a reliability assignment plus an embedding plus a goal index, on one fixed
> 20-node graph, evaluated by one fixed agent seed.** Every population below is a population of
> *those*, and of nothing else. This is the single most important scope fact in the memo.

### 2.1 The nine determinations required

| # | Question | Answer | Status |
|---|---|---|---|
| 1 | What determines a configuration? | `(configSeed, configIndex)` and nothing else | **EVIDENCE** |
| 2 | What does the seed determine? | `unreliableSet`, both phase reliability vectors, all embeddings — **not** the goal | **EVIDENCE** |
| 3 | One seed ⇒ one configuration? | One seed ⇒ **four** configurations, one per `configIndex ∈ {0,1,2,3}`, sharing the seed's reliability and embeddings, differing only in `goal` | **EVIDENCE** |
| 4 | Can distinct seeds give the same configuration? | **Yes, and one instance is certain**: `makeRng` begins `let a = (seed >>> 0) \|\| 1`, so **seeds 0 and 1 produce identical streams** hence identical configurations. Beyond that, collisions over 39 + 39 + 640 draws are not excluded but are not characterised | **EVIDENCE** (the 0/1 collapse) + **UNKNOWN** (general collision rate) |
| 5 | Are configurations independent? | The four sharing a seed are **not** — they share the entire reliability and embedding structure and differ only in goal. Across distinct seeds: no dependence by construction, but not established | **EVIDENCE** (within-seed dependence) + **UNKNOWN** (across-seed) |
| 6 | Identically distributed? | Only meaningful once a *draw mechanism* over seeds is specified. The generator alone does not supply one | **INFERENCE** |
| 7 | Does the seed generator define a probability distribution? | **No.** `makeRng` is mulberry32 — a deterministic function. It induces a distribution **only** when composed with a distribution over seeds, which the current design does not supply | **INFERENCE — and §12.5 is built on it** |
| 8 | Does the randomisation have a meaningful target population? | There is **no randomisation** in the current design. Seeds are chosen by Director fiat as contiguous blocks | **EVIDENCE** |
| 9 | Is the generating process part of the population definition? | **Yes, necessarily** — see toy case 8 (§11). The same seed range under a different `makeConfig` is a different population | **INFERENCE** |

---

## 3. Seed space vs configuration space vs accepted space

Three distinct objects, routinely conflated, kept apart here:

```
SEED SPACE            S = { 0 … 2³² − 1 }                            |S| = 4 294 967 296
                      (makeRng coerces with >>> 0; 0 collapses to 1)

CANDIDATE SPACE       K = S × {0,1,2,3}                              |K| ≈ 1.72 × 10¹⁰
                      one element per (seed, goal index) pair

CONFIGURATION SPACE   C = image of makeConfig over K
                      |C| ≤ |K|, with equality only if makeConfig is injective — NOT established
                      (seeds 0 and 1 already collide)

ACCEPTED SPACE        A = { k ∈ K : makeConfig(k).accepted }
```

**The map `K → C` is many-to-one by at least one verified instance.** A uniform draw over **seeds**
is therefore *not* a uniform draw over **configurations** unless injectivity holds — which is
unknown. This distinction does real work in toy case 4 (§11).

---

## 4. The generation / acceptance pipeline

```
configSeed ─┐
            ├─► makeConfig ─► cfg (unreliableSet, pPhase1/2, embedding, goal)
configIndex ┘                   │
                                ├─► evaluateConstraints ─► R1 R2 R3 R4 R5 G11
                                │                              │
                                │                              ▼
                                │                      cfg.accepted   ◄── PRE-TREATMENT
                                ▼
                        [ if accepted ]  ARMED run (3000 ticks) ──┐
                                          ABLATED run (3000 ticks)┤
                                                                  ▼
                              candidate generation (main.js:1591) ─► F1 F2 F3 F4 ─► pool
                                                                  ▼
                                                         19 decision states × 2 phases
                                                                  ▼
                                                            measured cells ─► E6
```

| Stage | Det./stoch. | Fixed/learned | Pre-/post-treatment | Changes eligibility? | Creates selection? | Distribution known? | Controlled by prereg? |
|---|---|---|---|---|---|---|---|
| seed choice | **deterministic (fiat)** | fixed | pre | yes — defines the frame | **YES** | **no — it is a choice, not a draw** | block is preregistered; *mechanism* is not a sampling design |
| `makeConfig` | deterministic | fixed | pre | no | no | induced, not specified | yes (frozen code) |
| `evaluateConstraints` → `accepted` | deterministic | fixed | **PRE** | **YES** | **YES — §7** | **no** | yes (frozen predicate) |
| agent runs (both arms) | deterministic given `agentSeed` | **learned during run** | treatment | no | no | n/a | yes |
| F1–F4 admission | deterministic | **learned** | **POST** | no (cell-level) | yes, at candidate level (M23) | no | yes |
| cell definedness (`n ≥ 2`, `v* ∈ pool`) | deterministic | learned | post | no | yes, at cell level | no | yes |

**The decisive row is `accepted`, and its decisive property is that it is PRE-treatment.**

---

## 5. P1 / P2 / P3

| | Definition | Size |
|---|---|---|
| **P1** | Generated population — all configurations reachable: `makeConfig(k)` for `k ∈ K` | ≈ 1.72 × 10¹⁰ candidates |
| **P2** | Eligible/accepted population — `{k ∈ K : accepted}` | unknown; **C1's block accepted 70/4000 = 1.75%** |
| **P3** | Observed study population — C1's 70 accepted configurations from block 895000–895999 | 70 |

### 5.1 Is `P3 ⊂ P2 ⊂ P1` a useful representation?

**Partly — and the useful part is the part it gets wrong.**

- **`P2 ⊆ P1`: established**, true by definition of the predicate.
- **`P3 ⊆ P2`: established** — C1 ran only configurations with `cfg.accepted` (`run_collection.js`
  via `env.makeConfig`), and its accounting records 70 ACCEPTED / 3930 REJECTED / 0 INVALID /
  0 FAILED.
- **But `P3` is not a *sample* of `P2` in any sense the chain suggests.** Precisely:

```
P3  =  P2 ∩ B          where B = {895000…895999} × {0,1,2,3}
```

**C1 is a complete census of the accepted configurations inside one contiguous seed block.** Every
candidate in `B` was enumerated; every accepted one was kept. The subset relation is exact and
exhaustive — which is *stronger* than a sample in one sense and *useless as a sample* in another,
because the inclusion probability of every element of `P2` is **0 or 1 by fiat**, not `n/N` by
design.

### 5.2 Which can be the defensible target population?

| | Verdict |
|---|---|
| **P1** | **NO.** Acceptance is 1.75% and selects on outcome-adjacent structure (§7). A `P1` claim from `P2` data requires inclusion probabilities that are unknown and, per §7.5, not estimable without circularity. |
| **P2** | **YES — conditionally.** Operationally definable by committed deterministic code; samplable with known equal inclusion probabilities (§6.3). **This is the frame, and it is the only one.** |
| **P3** | **It is already fully observed.** A census needs no frame; exact statements about it are level A and are what C1 and M20 already deliver. |

---

## 6. Sampling-frame requirements

| # | Requirement | Status | Note |
|---|---|---|---|
| 1 | Identifiable target population | **ESTABLISHED for P2** | deterministic committed predicate over a bounded key space |
| 2 | Known / defensible generation mechanism | **ESTABLISHED** | `makeConfig`, frozen and committed |
| 3 | Inclusion probability | **CONTRADICTED as used; ESTABLISHED under §6.3** | contiguous block ⇒ probabilities are 0/1 by fiat |
| 4 | Selection mechanism | **CONTRADICTED as used** | Director fiat, not randomisation |
| 5 | Eligibility mechanism | **ESTABLISHED** | deterministic, pre-treatment, arm-independent |
| 6 | Independence / dependence | **CONTRADICTED within seed**; **UNKNOWN across seeds** | the four goal-variants of a seed share all reliability and embedding structure |
| 7 | Duplication / collision | **CONTRADICTED (one verified instance)**; otherwise **UNKNOWN** | seeds 0 and 1 collapse to one stream |
| 8 | Temporal / order effects | **NOT APPLICABLE** | `makeConfig` depends only on its arguments; `SEEN` is audit-only |
| 9 | Seed-block effects | **UNKNOWN** | §6.2 — the load-bearing unknown |
| 10 | Acceptance-selection effects | **CONTRADICTED for P1; controlled for P2** | §7 |
| 11 | Hidden state variables | **CONTRADICTED** | `agentSeed` is **fixed at one value**, so agent initialisation is not sampled at all |
| 12 | Observed block representative, not merely convenient | **UNKNOWN — and this is the claim §12.7 destroys** | |

### 6.1 What a fresh contiguous block *does* establish

1. **Non-overlap** with consumed territory — an accounting fact, verified by the registry.
2. **Reproducibility** — deterministic regeneration from committed code.
3. **Freedom from prior inspection** — the configurations were not seen when the design was frozen,
   which is what preregistration requires and is genuinely valuable.

### 6.2 What it does **not** establish

**It does not establish representativeness, and no amount of block-freshness can.** Two independent
reasons:

1. **Determinism is not randomisation.** `makeRng` is mulberry32 — a pure function. It induces a
   distribution over configurations only when composed with a distribution over seeds. Choosing
   `895000–895999` by fiat supplies no such distribution. **The randomisation must live in the
   selection mechanism, not in the generator.** A well-mixing PRNG makes configurations *look*
   unpatterned; it does not make the *selection* a probability sample, and the inference depends on
   the latter.
2. **Numerical disjointness is not statistical independence.** Disjointness guarantees that no
   configuration is measured twice. It says nothing about whether the block's configurations are
   distributed as `P2` is. Toy case 10 (§11) exhibits the gap.

> **A contiguous block can support model-based inference to `P2` only under an explicit
> exchangeability assumption on the seed → configuration map, which is currently UNKNOWN — neither
> established nor contradicted. It can never support design-based inference, because there is no
> design.**

### 6.3 The frame that does work, and it is cheap

**Draw seeds uniformly at random from the seed space, evaluate `accepted`, and keep the accepted
ones.** This is rejection sampling. Because the acceptance predicate is deterministic and
pre-treatment, the retained set is a **uniform random sample of `P2`, with equal and known
inclusion probability, requiring no weighting and no exchangeability assumption**.

**This is a change of *selection mechanism*, not of instrument, estimand, or code under test.** It
consumes no more compute than a block of the same size, and it converts model-based inference into
design-based inference. It is the single substantive finding of M24.

*Stated as a requirement, not as a proposal to execute — §14 keeps M24 at the formulation boundary.*

---

## 7. The acceptance-selection analysis

C1: **4000 candidates → 70 accepted (1.75%), 3930 rejected.** The question is whether that 1.75% can
stand for the 100%.

### 7.1 Does acceptance depend on variables related to E6? **Yes — directly and by design.**

E6 is the rank of the **oracle-optimal action** in the agent's pool. Two acceptance terms are
conditions *on the oracle's own structure*:

| Term | `env.js` | What it requires |
|---|---|---|
| **R2** | `:219–228` | some **longer** route has strictly **higher** reliability than the best hop-shortest route — i.e. the reliability-optimal route is *not* the hop-shortest one |
| **R5** | `:239–241` | the finite-horizon **reliability-optimal policy differs from the hop-optimal policy on ≥ 4 decision states** |

**R5 is an explicit condition on the oracle's disagreement with the naive policy.** A configuration
where the oracle happens to agree with hop-shortest on all but three states is **excluded by
construction**. Since E6 measures where the oracle's choice sits in the agent's ranking, acceptance
conditions on a property of exactly the object the outcome is anchored to.

Three further terms (**R3**, **R4** at `:232–241`, and **G11** at `:258–273`) require
`|ρ(p_e, observable)| < 0.10` for five observables — endpoint cosine similarity, directed
distance-to-goal, source out-degree, destination in-degree, canonical edge index. These
**deliberately remove** configurations where reliability is predictable from a cheap proxy.

### 7.2 Does acceptance depend on goal/state structure? **Yes.**

`R1` requires ≥ 2 distinct simple paths from ≥ 6 start nodes; `R2`/`R5` are computed per goal via
`simplePaths(cfg.goal)` and `directedDistToGoal(cfg.goal)`. **Acceptance is goal-dependent**, which
is why the four goal-variants of one seed accept or reject differently and why C1's accepted set is
unevenly composed across goals (15/17/18/20 for goals 8/12/16/19 — M20 §4.3).

### 7.3 Can acceptance induce systematic composition differences? **Yes, and it is intended to.**

The predicate's purpose is to retain environments where reliability-based reasoning is *necessary
and not shortcut-able*. That is sound experimental design. **It also means `P2` is a deliberately
engineered subpopulation**, and any claim reading as though it were about configurations in general
misdescribes it.

### 7.4 Can accepted configurations be treated as representative of generated ones? **No.**

§7.1–§7.3 give the mechanism; §11 case 5 gives the abstract form. This is the single clearest RED
inside the YELLOW: **`P1` is not reachable from `P2` data.**

### 7.5 Are acceptance probabilities known, and can they be estimated without circularity?

- **Known?** No. The marginal acceptance rate is *observable* (1.75% in one block), but the
  acceptance probability *as a function of configuration features* is not characterised.
- **Estimable without circularity?** **No, for the purpose that matters.** To reweight `P2` up to
  `P1` one needs `Pr(accept | features)` for features related to the outcome. But the outcome-related
  features are exactly `R2`/`R5` — *deterministic components of the acceptance rule itself*, taking
  value 1 on every accepted unit and 0 on every rejected one. **Conditional on those features
  acceptance is degenerate, so the propensity is 0 or 1 and no overlap exists.** This is a
  positivity violation, not a modelling inconvenience.
- **Would any weighting scheme solve it?** **No, and none is proposed.** Reweighting requires
  positivity. Rejected configurations have acceptance probability exactly 0 by a deterministic rule;
  no weight is finite there. **Post-hoc weighting is rejected outright** — its identification
  assumption is not merely undefensible, it is provably false.

---

## 8. The generalisation hierarchy

| Level | Statement | Licensed now? | What it would need |
|---|---|---|---|
| **A — within-census** | exact statement about the 70 enumerated configurations | **YES — already delivered** (C1, M20) | nothing; it is a census |
| **B — finite-population** | statement about a completely specified finite target population (`P2`) | **NO as things stand; YES under §6.3** | uniform random seed draw with rejection; nothing else |
| **C — superpopulation** | statement about a broader hypothetical generating population | **NO** | a defensible superpopulation model — *which does not exist*: `P1` is itself a finite deterministic image of a finite key space under one frozen generator, so there is no larger population for it to be a sample *of*, short of positing a distribution over graphs, hidden-variable families and agent seeds that the system does not have |
| **D — mechanism transfer** | the mechanism transfers to other tasks/environments | **NO — and not by any margin** | variation in the things §2 lists as fixed: the graph, the hidden-variable family, the agent seed. **No sampling frame over configurations touches any of these** |

> **A larger `N` moves A → B and stops.** It cannot reach C, because no superpopulation is defined.
> It cannot reach D, because D is not a sampling question at all. **This is the trap the ruling
> named, and it is worth stating in the strongest form: sampling more configurations from one graph
> with one agent seed produces a more precise statement about one graph with one agent seed.**

---

## 9. Relevance to cognitive-mechanism discovery

**What level of evidence would be required before a MiniFlyWire mechanism could reasonably be
considered transferable rather than merely successful on a finite development census?**

At minimum, and in this order:

1. **Level B on `P2`** — §6.3. Necessary, cheap, and currently absent.
2. **Variation in what §2 fixes.** Multiple graphs, more than one hidden-variable family, and
   **multiple agent seeds**. Until `agentSeed` varies, *nothing* separates "a property of the
   mechanism" from "a property of this one initialisation."
3. **An identification strategy for the mechanism itself.** M22 established that the
   ranking/admission decomposition is not identifiable under this architecture, and M23 that the
   common-set comparison cannot be causal because admission and weighting share a direct cause
   (`penalties`). **Neither is a sampling problem, and neither is fixed by any sampling frame.**
4. **Independent replication on a substrate whose admission path does not share causes with its
   weighting** — an architectural change, not an experiment.

> **A sampling frame alone validates nothing about cognition.** It is one prerequisite for stronger
> claims, and on its own it licenses only a more precisely scoped descriptive statement. **No
> cognitive, planning, intelligence, engineering or manufacturing claim follows from the existence
> of a sampling frame**, and none is made anywhere in this memo.

**Ordering consequence for the North Star.** Items 3 and 4 are *architectural*; item 2 is *scope*;
item 1 is *governance*. Item 1 is by far the cheapest and is genuinely necessary — but it is the
smallest of the four, and completing it would leave the transfer question exactly where it is today.

---

## 10. Toy and adversarial cases

| # | Case | What it shows | Which assumption does the work |
|---|---|---|---|
| 1 | Uniform random sample from a fully specified finite population | design-based inference valid; inclusion probability `n/N` known | **randomisation in the selection** |
| 2 | Deterministic enumeration of a seed block | inclusion probability ∈ {0,1}; no design-based inference. **This is C1** | *none available* — there is no design |
| 3 | Seed block with clustered configurations | block is a cluster sample with unknown design effect; spread understated, centre possibly displaced | **absence of locality in seed → config** |
| 4 | Many seeds producing duplicate configurations | uniform over **seeds** ≠ uniform over **configurations**; effective N < nominal N. *Verified instance: seeds 0 and 1* | **injectivity of `makeConfig`** |
| 5 | Acceptance strongly correlated with the outcome | `P2` mean ≠ `P1` mean; a `P2` claim is sound, a `P1` claim is biased. **This is C1's actual situation (R2, R5)** | **acceptance ⊥ outcome** — false here |
| 6 | Acceptance independent of the outcome | `P2` mean = `P1` mean; acceptance harmless for `P1` claims. **Not C1's situation** | the same assumption, when true |
| 7 | Rare configurations systematically excluded | tails truncated; extreme behaviour unobservable at any `N` | **support coverage** |
| 8 | Two generation mechanisms over the same seed range | the seed range does **not** identify the population; `895000–895999` is meaningless without pinning `makeConfig` | **the generator is part of the population definition** |
| 9 | New block with the same distribution as the old | replication is possible; two censuses of two blocks are still not a probability sample | **exchangeability** — buys replication, not representativeness |
| 10 | New block with a different distribution despite numerical disjointness | disjointness delivers non-overlap and nothing more | **disjointness ⇒ independence** — false |

**What is doing the scientific work, across all ten: (i) randomisation located in the *selection*,
and (ii) independence of acceptance from the outcome.** The current design has neither. §6.3 supplies
(i) exactly. **Nothing can supply (ii)** — which is why the target must be `P2`, permanently.

---

## 11. PASS 2 — self-falsification

### P-1. Has seed space been confused with configuration space?
**Checked, and the distinction is load-bearing.** §3 separates them, and §11 case 4 shows uniform
over seeds ≠ uniform over configurations without injectivity — **which is not established, and has
one verified counter-instance**. Honest consequence: §6.3 delivers a uniform sample of `P2`
*indexed by keys*, and a uniform sample of `P2` *as a set of configurations* only under injectivity.
**I am not claiming the stronger version.**

### P-2. Has enumeration been confused with sampling?
**This was the program's standing error and §5.1 names it.** C1 is a census of `P2 ∩ B`. It was never
a sample and nothing in the committed record claimed otherwise — M17 removed inference precisely
because the frame was absent.

### P-3. Has disjointness been confused with independence?
**Attacked directly at §6.2.2 and toy case 10.** Disjointness is an accounting property.

### P-4. Has acceptance been confused with random sampling?
**No — §7 treats acceptance as the hardest constraint in the memo**, and rejects post-hoc weighting
on positivity grounds rather than on grounds of inconvenience.

### P-5. Has deterministic generation been confused with a probability distribution?
**The central attack, and §2.1.7 / §6.2.1 concede it in full.** mulberry32 is a pure function. It
supplies no distribution. **Every claim in this memo that needs a distribution gets it from §6.3's
draw mechanism and from nowhere else.**

### P-6. Has a finite census been confused with a superpopulation sample?
**No, and §8 forecloses it:** level C is unavailable because **no superpopulation is defined**. `P1`
is a finite deterministic image of a finite key space. There is nothing for it to be a sample of
unless one posits distributions over graphs, hidden-variable families and agent seeds — which the
system does not have and M24 does not invent.

### P-7. *"A fresh 1000-seed block is automatically representative."* — **destroy it**
**REJECTED EXPLICITLY. It is false, and here is the strongest form of the refutation.**

1. **No randomisation exists.** Inclusion probabilities are 0 or 1 by fiat (§6.2.1).
2. **Even a perfect PRNG cannot rescue it.** Suppose mulberry32 has ideal avalanche on adjacent
   seeds. The block's configurations would then be *unpatterned*, but the **selection** would remain
   deterministic. Design-based inference draws its validity from the researcher's randomisation, not
   from the target's apparent irregularity. **Unpatterned ≠ randomly selected.**
3. **The assumption is untested and would remain so.** "Adjacent seeds decorrelate" is a property of
   mulberry32 that this program has never verified for `makeConfig`'s composition of 39 + 39 + 640
   draws. It is **UNKNOWN** (§6, requirement 9) and it would be doing all the work.
4. **Block-level dependence is structurally guaranteed regardless.** Each seed contributes **four**
   configurations sharing an entire reliability vector and embedding set (§2.1.3, §2.1.5). Within a
   1000-seed block, the 4000 candidates comprise **at most 1000 independent reliability draws**, so
   even under ideal seed mixing the effective independent count is at most a quarter of the nominal
   one. A block is a **cluster sample with cluster size 4** and no design to account for it.
5. **It would not even establish what it appears to.** Representativeness of *what*? Of `P1` — barred
   by §7. Of `P2` — only under 2 and 3 above.

> **Verdict: a fresh contiguous block establishes non-overlap, reproducibility and freedom from
> prior inspection. It establishes NOTHING about representativeness, and the claim that it does is
> rejected.**

### P-8. Does any proposed weighting rely on unknown inclusion probabilities?
**No weighting is proposed.** §7.5 rejects it on a **positivity violation**: rejected configurations
have acceptance probability exactly 0 under a deterministic rule, so no finite weight exists. This is
stronger than "the probabilities are unknown" — they are known and they are zero.

### P-9. Is the proposed target population operationally definable?
**Yes, and this is why the verdict is YELLOW rather than RED.** `P2 = {k ∈ K : makeConfig(k).accepted}`
is decidable by committed deterministic code for any key, with no agent execution and no seed
consumption. **Weakness conceded:** `P2`'s cardinality is unknown, and the memo does not estimate it
— doing so would require evaluating configurations, which M24 is forbidden from doing and which I
have not done.

### P-10. Would the framework support genuine mechanism-transfer claims?
**No, and I want this to be the sentence that survives.** §8 level D and §9. The frame would upgrade
A → B over a population of reliability assignments on **one graph** under **one agent seed**.
Mechanism transfer requires varying precisely what §2 lists as fixed. **§6.3 is necessary,
inexpensive, and nowhere near sufficient — and presenting it as progress toward transfer would be
the largest overclaim available in this milestone.**

---

## 12. Evidence → Inference → Hypothesis

**EVIDENCE** *(committed source and artifacts)*
- **Ev-1.** `makeConfig` is driven only by `configSeed`; `goal = GOALS[configIndex % 4]` (`env.js:162–166`).
- **Ev-2.** `cfg.accepted = R1 ∧ R2 ∧ R3 ∧ R4 ∧ R5 ∧ G11`, computed with no agent and no arm (`env.js:199–205`).
- **Ev-3.** R2 requires a longer route to beat the hop-shortest on reliability (`:219–228`); **R5
  requires the reliability-optimal and hop-optimal policies to differ on ≥ 4 decision states**
  (`:239–241`); R3/R4/G11 require `|ρ| < 0.10` on five observables (`:232–273`).
- **Ev-4.** `makeRng` is mulberry32 and begins `let a = (seed >>> 0) || 1` (`instrumentation/rng.js:17–18`).
- **Ev-5.** `agentSeed = 20260819000`, fixed for all C1 configurations (`c1/protocol.js`).
- **Ev-6.** C1: 1000 seeds, 4000 candidates, **70 ACCEPTED / 3930 REJECTED / 0 INVALID / 0 FAILED**.
- **Ev-7.** The graph is fixed: 20 nodes, 39 edges, 13 unreliable.

**INFERENCE** *(follows logically or mathematically)*
- **In-1.** Seeds 0 and 1 produce identical configurations ⇒ `makeConfig` is **not injective** (Ev-4).
- **In-2.** A deterministic generator induces no distribution over configurations absent a
  distribution over seeds ⇒ a contiguous block is not a probability sample (Ev-4).
- **In-3.** Acceptance is **pre-treatment and arm-independent** ⇒ it restricts the target population
  but does **not** bias estimation *within* that population (Ev-2). *This distinguishes it sharply
  from the post-treatment conditioning M23 rejected.*
- **In-4.** Acceptance conditions on the oracle's structure ⇒ `P2` is not representative of `P1`
  in a dimension the outcome depends on (Ev-3).
- **In-5.** Conditional on R2/R5, acceptance is degenerate (0 or 1) ⇒ **positivity fails** ⇒ no
  reweighting from `P2` to `P1` exists (Ev-2, Ev-3).
- **In-6.** Uniform seed draw + rejection on a deterministic pre-treatment predicate yields a
  uniform sample of `P2` with known equal inclusion probability (Ev-2).
- **In-7.** Four configurations per seed share all reliability and embedding structure ⇒ a seed block
  is a **cluster sample with cluster size 4** (Ev-1).

**HYPOTHESIS** *(plausible, unvalidated, and not relied upon)*
- **Hy-1.** That mulberry32 decorrelates adjacent seeds through `makeConfig`'s composition. **Not
  tested here; no conclusion rests on it.**
- **Hy-2.** That `makeConfig` collisions beyond the 0/1 collapse are negligible.
- **Hy-3.** That `P2`'s acceptance rate is near 1.75% across the seed space — observed in **one**
  block and nowhere else.
- **Hy-4.** Everything M21–M23 left open.

**No cognitive, planning, intelligence, engineering or manufacturing claim is made, and none may be
inferred from the existence, or the absence, of a sampling frame.**

---

## 13. Classification

> # M24-YELLOW
> **Partial / conditional sampling frame. Explicit limitations required.**

**The frame:** `P2`, the accepted-configuration population under the frozen predicate, sampled by
**uniform random seed draw with rejection** (§6.3).

**The limitations, all mandatory in any future artifact that uses it:**

1. **The target is `P2`, never `P1`.** Acceptance conditions on the oracle's structure, and
   positivity fails, so no reweighting to `P1` exists (§7.5, In-5).
2. **A contiguous block is not a sample.** C1's `P3` is a census of `P2 ∩ B` (§5.1). The frame
   requires changing the **selection mechanism** — randomisation must live there, not in the PRNG.
3. **Cluster structure must be honoured.** Four configurations per seed share all reliability and
   embedding structure; the effective independent count is at most the seed count (In-7).
4. **The population is one graph, one hidden-variable family, one agent seed.** Level B and no
   further; level C has no superpopulation to refer to, and level D is not a sampling question
   (§8, §9).
5. **`P2`'s size is unknown** and M24 did not estimate it.

---

## 14. Exact next milestone

**Minimum formal requirements that would make a future study interpretable** — stated as
requirements, **not** as a recommendation to run one:

1. **A declared target population**, named as `P2` with its predicate pinned by commit digest.
2. **Uniform random seed draw with rejection**, replacing contiguous-block enumeration — the draw
   mechanism and its own randomisation source preregistered before any seed is drawn.
3. **Cluster-aware reporting** — seed as the primary sampling unit, not the candidate.
4. **No reweighting to `P1`**, explicitly forbidden on positivity grounds.
5. **Generalisation language capped at level B**, with the one-graph / one-agent-seed scope stated
   in the required phrasing.
6. **`agentSeed` varied** if any claim is to concern the mechanism rather than this initialisation.

**Recommended next milestone: none — and I want to be plain about why rather than proposing one out
of momentum.** M24's requirements are governance changes, not a study. Requirement 6 is the one that
would matter most for the North Star, and it is the one no sampling frame supplies. Items 3 and 4 of
§9 remain architectural obstacles that M22 and M23 established are not fixable by measurement.

**If the Director elects to proceed**, the correct next step is
**M25 — Target-Population and Draw-Mechanism Specification (formulation only)**, scoped to the six
requirements above and to nothing else: no preregistration, no seeds, no new block, no code.

**Still outstanding, still untouched, and required before any successor draws seeds:** the
`895000–895999` registry-link defect (M21 §1.7).
