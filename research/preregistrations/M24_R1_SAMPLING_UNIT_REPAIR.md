# M24-R1 — Sampling-Unit and Target-Population Repair

**Status:** FORMULATION / AUDIT ONLY — no experiment, no seeds, no new block, no implementation
**Milestone:** M24-R1
**Date:** 2026-09-11
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-09-11 — *M24 HOLD → M24-R1 AUTHORIZED*
**Supersedes:** the inclusion-probability, positivity and cluster claims of M24 (`1e9741a`) — §12

**Nothing was run. No production source, preregistration, frozen artifact, dataset, F1/F2 filter or
registry entry was modified. No seed was generated, selected, evaluated or consumed; no
configuration was instantiated; no statistical test was introduced.** `env.js`, `rng.js` and
`c1/protocol.js` were read. The `895000–895999` registry defect remains open and unrepaired.

---

## 1. Verdict

> # M24-R1: YELLOW SUSTAINED — with three corrections
>
> **The Director's objection is correct and my M24 statement was wrong as written.** Uniform key
> sampling with rejection is **exactly uniform over accepted KEYS** and **size-biased over unique
> accepted CONFIGURATIONS**, by a factor equal to each configuration's preimage multiplicity.
>
> YELLOW survives — but only because the **accepted-key population is itself a legitimate,
> operationally defined finite target population**, not because the configuration-level claim can be
> rescued. It cannot, except under an assumption I am marking UNKNOWN rather than asserting.

---

## 2. Formal definitions

From `env.js:162–206`, read and unmodified.

```
K   = S × I                      key space;  S = {0 … 2³²−1} (makeRng coerces >>> 0),  I = {0,1,2,3}
f   : K → CFG                    f(k) = makeConfig(seed, index)
CFG ∋ cfg = (configSeed, configIndex, goal, unreliableSet, pPhase1, pPhase2, embedding)
π   : CFG → CONTENT              π(cfg) = (goal, unreliableSet, pPhase1, pPhase2, embedding)
g   = π ∘ f : K → CONTENT        the SCIENTIFIC map
α   : K → {T,F}                  α(k) = f(k).accepted
A   = { k ∈ K : α(k) }           accepted keys
C_A = g(A) ⊆ CONTENT             unique accepted configurations
m(c)= | g⁻¹(c) ∩ A |             preimage multiplicity of an accepted configuration
```

### 2.1 Three source facts that fix the whole analysis

**(a) `f` is trivially injective, and this is a representational artifact, not a scientific fact.**
`cfg` carries `configSeed` and `configIndex` **as fields** (`env.js:192–197`). Two distinct keys
therefore *always* yield distinct `cfg` objects, even when every scientifically meaningful component
is identical. **The implemented return value is a configuration-with-provenance-key.** Any claim of
injectivity that leans on `f` rather than on `g` is vacuous.

**(b) `g` is NOT injective, with one verified collision.** `makeRng` opens
`let a = (seed >>> 0) || 1` (`rng.js:18`), so seed 0 and seed 1 drive an identical stream. Hence for
every `i ∈ I`, `g(0,i) = g(1,i)` — identical goal, unreliable set, both reliability vectors and all
embeddings. **`m = 2` for those four configurations.**

**(c) Acceptance factors through content.** `evaluateConstraints(cfg)` reads only `cfg.pPhase1`,
`cfg.goal` and `cfg.embedding` — all components of `π(cfg)`. Therefore `α = ᾱ ∘ g` for some
`ᾱ : CONTENT → {T,F}`, and:

> **Every fiber `g⁻¹(c)` is wholly accepted or wholly rejected.** `A` is a union of complete fibers.

This is what makes the arithmetic in §3 exact rather than approximate.

**(d) The outcome depends on content, not on the key.** The run's environment stream is seeded from
`agentSeed ^ 0x5EED` (`rng.js:46`), **not** from `configSeed`. With `agentSeed` fixed, `Δ` is a
function of `π(cfg)` alone. **Two keys with the same content therefore produce the identical `Δ` —
an exact replica, carrying no additional information about the outcome.**

---

## 3. The correct sampling distribution — exact answers

Draw keys i.i.d. uniformly from `K`; discard those with `α(k) = F`; retain the rest.

**Q1 — What population is uniformly sampled?**
`P(k | retained) = 1/|A|` for every `k ∈ A`. **Uniform over `A`, the accepted-KEY population.
Exactly.** Nothing else is uniformly sampled.

**Q2 — Inclusion probability of an individual accepted key.**
Per retained draw: `1/|A|`. For `n` retained draws without replacement: `n/|A|`. **Known and equal.**

**Q3 — Inclusion probability of an individual accepted unique configuration `c ∈ C_A`.**
Because fibers are wholly in or out of `A` (§2.1c):

```
P(retained draw yields content c)  =  m(c) / |A|            and   Σ_{c ∈ C_A} m(c) = |A|
```

**Proportional to multiplicity. Equal only if `m` is constant on `C_A`.**

**Q4 — What happens when `|g⁻¹(c)| > 1`?**
That configuration is over-represented by exactly the factor `m(c)`. The induced distribution over
`C_A` is the **size-biased (multiplicity-weighted)** one, and the sample mean of any outcome `Y`
converges to

```
E[Y] = Σ_c  m(c)·Y(c) / |A|        (multiplicity-weighted mean)
                                    NOT   (1/|C_A|) Σ_c Y(c)   (unweighted mean over unique configs)
```

These coincide **iff** `m` is constant on `C_A`. Because `Y = Δ` is a function of content (§2.1d),
duplicates are exact replicas: they **add no information about `Δ`** while **shifting the weights**.
That is the worst combination — cost without benefit.

**Q5 — Uniform over keys, configurations, or neither?**
> **Uniform over accepted KEYS. Size-biased over unique accepted CONFIGURATIONS. Never both, unless
> `g` restricted to `A` is injective.**

---

## 4. Duplicates and collisions

### 4.1 What is established, and what is not

| | Status |
|---|---|
| `g(0,i) = g(1,i)` for all four `i` — the `\|\| 1` collapse | **EVIDENCE** (executed: 64 draws identical, with seeds 7/8 as a non-vacuous control) |
| Whether any other pair of seeds collides under `g` | **UNKNOWN** — not established, not excluded |
| `f` injective (provenance-carrying) | **EVIDENCE** — and scientifically empty (§2.1a) |
| Distinct `configIndex` never collides | **EVIDENCE** — `goal = GOALS[i % 4]` is injective on `I = {0,1,2,3}`, and `goal ∈ CONTENT` |

**I am not claiming the general collision rate is negligible.** The mulberry32 state recurrence
`a ← a + 0x6d2b79f5` is a bijection on 32 bits, so distinct seeds drive disjoint state sequences, and
a full ~718-draw output collision is *implausible*. **Implausible is a hypothesis (Hy-1), not a
finding**, and nothing below rests on it.

### 4.2 Should a duplicate configuration count once or many times?

**Once.** Given §2.1d, a duplicate is an exact replica of the outcome. Counting it twice asserts that
an environment is "twice as much of the population" because two integers happen to index it — which
has **no scientific referent**. Multiplicity is a property of the *generator's* arithmetic, not of
the population of environments.

### 4.3 Is repeated generation of the same configuration replication?

**No.** It is *reproduction*, not replication. Replication requires an independent opportunity for
the result to differ. Under a deterministic runtime with a fixed `agentSeed`, re-running the same
content yields bit-identical output. It is a **useful integrity check** — the C1 fingerprints
already serve that role — and it is **zero evidence** about the effect.

### 4.4 Should provenance remain part of the observational unit?

**Yes for governance, no for the estimand.** The key must be retained so the registry can record
consumption and so any result is reproducible. But the **scientific unit is the content**, and
provenance must never be allowed to make two identical environments look like two observations.

### 4.5 Tiny examples — uniform over keys vs uniform over unique configurations

Let `A = {k₁, k₂, k₃}` with `g(k₁) = g(k₂) = c₁` and `g(k₃) = c₂`. So `C_A = {c₁, c₂}`, `m(c₁) = 2`,
`m(c₂) = 1`. Let `Δ(c₁) = 0`, `Δ(c₂) = 3`.

| Design | Distribution over `C_A` | Estimand it converges to |
|---|---|---|
| **Uniform over keys** | `P(c₁) = 2/3`, `P(c₂) = 1/3` | `(2·0 + 1·3)/3 = **1.0**` |
| **Uniform over unique configurations** | `P(c₁) = P(c₂) = 1/2` | `(0 + 3)/2 = **1.5**` |

**The two designs target different numbers — a 50% difference here — from the same population.**
The gap is governed entirely by the correlation between `m(c)` and `Δ(c)`; it vanishes only when `m`
is constant, and **nothing in the system guarantees or even monitors that**.

**Second example — why de-duplication does not fix it.** Draw `n` keys uniformly and discard
repeated contents. Content `c` is included with probability `1 − (1 − m(c)/|A|)ⁿ ≈ n·m(c)/|A|` for
small `n` — **still proportional to `m(c)`**. De-duplication removes the double-counting but **not
the size bias**. Any fix must weight by `1/m(c)`, and `m(c)` is not computable without enumerating
fibers over a `2³²`-sized seed space.

**Minimal exact repair available today:** **exclude seed 0 from `S`.** On `S' = {1 … 2³²−1}`,
`(seed >>> 0) || 1` is the identity, and the only *verified* collision disappears. This costs
nothing, requires no code change to run (it is a declaration about the draw range), and reduces the
open question to Hy-1.

---

## 5. Acceptance-selection — verified, and what it licenses

**Verified against source, not assumed.** `evaluateConstraints` (`env.js:209–277`) contains **no**
reference to `ARMED`, `ABLATED`, `futureBonus`, `agentSeed`, `arm` or `tick` — scanned by the gate.
`cfg.accepted` is assigned inside `makeConfig`, before any run exists.

> **`A = {k ∈ K : α(k)}` is completely determined before ARMED/ABLATED exposure and is independent
> of treatment.**

**What that licenses — exactly, and no more:**

1. **Acceptance cannot induce collider bias on the treatment contrast.** Both arms run on the same
   accepted configuration; acceptance is a property of the environment alone. *This is categorically
   different from the post-treatment conditioning M23 rejected.*
2. **`A` is a well-defined finite target population**, decidable for any key by committed
   deterministic code with no agent execution.
3. **Estimation within `A` is unbiased** under the §3 design.

**What it does NOT license, stated because the ruling required it:**

> **Acceptance being pre-treatment does NOT make the accepted population representative of the
> generated population.** Those are different claims and only the first is established. Acceptance
> conditions on the oracle's structure — R2 (`:227`) requires a longer route to beat the hop-shortest
> on reliability; **R5 (`:241`) requires the reliability-optimal and hop-optimal policies to differ
> on ≥ 4 decision states** — and `Δ` is anchored to that same oracle. C1 accepted **70 of 4000
> (1.75%)**. `A` is a deliberately engineered subpopulation.

**Composition consequence.** Acceptance is goal-dependent (`R1`, `R2`, `R5` all use `cfg.goal`).
Although `I = {0,1,2,3}` makes goals exactly uniform in `K`, **the goal marginal in `A` is an outcome
of the predicate, not a design choice** — C1 observed 15/17/18/20 across goals 8/12/16/19.

---

## 6. Positivity, by target population — M24 over-generalised this

The ruling's three-way distinction, applied separately to each target. **M24 collapsed these into one
sentence and that was wrong.**

| Target population | Inclusion probability | Regime | Reweighting? |
|---|---|---|---|
| **1. Accepted keys `A`** | `1/\|A\|`, equal | **positive and equal** | **Not needed.** Positivity holds |
| **2. Generated keys `K`** | `0` for every rejected key, by a deterministic rule | **exactly zero** | **Impossible.** No finite weight exists. Positivity violated, irreparably |
| **3. Unique accepted configurations `C_A`** | `m(c)/\|A\|` | **positive but UNEQUAL** | **Exists in principle** — weights `∝ 1/m(c)` — but `m(c)` is **UNKNOWN** without fiber enumeration |
| **4. Any broader superpopulation** | undefined | **not applicable** | No superpopulation is defined (§8), so positivity has no referent |

**The correction in one line:** *zero probability* (target 2) is not *unknown probability* (target 3)
is not *unequal but positive* (target 3's regime). M24 asserted the target-2 conclusion — "no
reweighting exists" — as though it covered targets 1 and 3. **It does not.** Target 1 needs no
weighting; target 3 needs weights that exist but are unavailable.

---

## 7. The fixed agent seed

`agentSeed = 20260819000`, frozen in `c1/protocol.js`, **identical for all 70 C1 configurations**.
The environment stream during a run is seeded from `agentSeed ^ 0x5EED` (`rng.js:46`) — so the
agent side of the system is **degenerate at a single point**.

> **The proposed frame samples configuration variation *conditional on one fixed agent
> initialisation*. It supports no claim about the agent whatsoever.**

Formally the true unit is a pair `(content, agentSeed)`; the frame varies the first coordinate and
holds the second at one value, so every claim carries `| agentSeed = 20260819000` whether written or
not — and it must be written.

**Separating the two sampling problems:**

| Dimension | Currently | Would be needed for |
|---|---|---|
| configuration seed | enumerated in contiguous blocks (not sampled) | any claim about environments |
| **agent seed** | **degenerate — one value** | **any claim about the mechanism rather than this initialisation** |
| environment / graph | **fixed** — one 20-node, 39-edge graph | any claim about environment structure |
| goal distribution | enumerated (all four per seed); marginal in `A` set by the predicate | any claim about goal generality |

**No experiment is prescribed here.** This is a statement of which target populations are reachable
by which variation, and the answer is that three of the four dimensions are currently not populations
at all.

---

## 8. Finite population vs superpopulation

**The ruling asks precisely: can a deterministic finite key space support a legitimate
finite-population statement without a superpopulation? The answer is YES, and it matters.**

Design-based (Horvitz–Thompson) inference requires exactly three things: a well-defined finite
population, a **randomised** selection with known inclusion probabilities, and a measurement.
**It requires no distributional model, no superpopulation, and no assumption about the target's
structure — the randomness is supplied entirely by the researcher's draw.** Determinism of `f` is
irrelevant to its validity, and on target 1 the inclusion probabilities are known and equal exactly.

| Level | Target population required | Sampling requirement | Current evidence | Blocker | Licensed? |
|---|---|---|---|---|---|
| **A — within-census** | the 70 enumerated configurations | none — it is a census | C1 / M20 | none | **YES, already delivered** |
| **B — finite population** | **`A`** (keys) — or `C_A` under Hy-1 | uniform random key draw + rejection | none yet | selection mechanism is contiguous-block fiat | **NO now; YES under §3, for `A`** |
| **C — superpopulation** | a hypothetical generating population | a defensible superpopulation model | none | **none is definable**: `K` is a finite deterministic key space and `A` a finite deterministic subset; there is no larger population for them to be a sample *of* unless one posits distributions over graphs, hidden-variable families and agent seeds that the system does not have | **NO** |
| **D — mechanism transfer** | environments/tasks beyond this graph | variation in §7's fixed dimensions | none | **not a sampling problem**; plus the M22 non-identifiability and M23 shared-cause obstacles, both architectural | **NO** |

> **Level B is genuinely available and needs no superpopulation fiction.** Level C is unavailable not
> because it is difficult but because **no superpopulation exists to refer to**. That asymmetry is
> the most useful clarification in M24-R1.

---

## 9. The fresh seed block

The rejection stands. **A fresh 1000-seed block is not automatically representative.** Six properties,
kept apart because conflating them is how the error arises:

| Property | Does a fresh contiguous block have it? |
|---|---|
| **Numerical disjointness** | **YES** — accounting fact, registry-verifiable |
| **Reproducibility** | **YES** — deterministic regeneration from committed code |
| **Freedom from prior inspection** | **YES** — preregistration's actual guarantee |
| **Independence of random draws** | **NO** — there are no random draws |
| **Probability sampling** | **NO** — inclusion probabilities are 0/1 by fiat |
| **Representativeness** | **NO — not established by any of the above** |

### 9.1 Is a randomly selected key set scientifically different from a contiguous block?

**Yes, and the difference is not cosmetic — it is the difference between an assumption and a design.**

- **Contiguous block:** inference to `A` requires assuming the block is exchangeable with `A`. That
  is an unverified claim about how `makeConfig` composes 39 + 39 + 640 mulberry32 draws across
  adjacent seeds. It is **UNKNOWN**, and it would be carrying the entire inferential load.
- **Random key draw:** inference to `A` is valid **by construction**, with inclusion probabilities
  known exactly, and **requires no assumption about `f` at all**.

> **Random selection removes an assumption. It does not add machinery, cost, or compute.** That is
> the whole argument, and it is why the repair is cheap.

### 9.2 Correction to M24's cluster claim

M24 asserted cluster-size-4 as a general property. **It is not.** It is a property of **contiguous-
block enumeration**, where all four goal-variants of every seed are taken, so 4000 candidates rest on
1000 reliability draws. Under **uniform key sampling** the probability that any two of ~10³ drawn
keys share a seed is ≈ `n²/(2·2³²) ≈ 10⁻⁴`, so clusters essentially do not form. The proposed design
**dissolves** the cluster problem rather than inheriting it. *A deliberate seed-then-all-four-goals
design would reintroduce it legitimately, if declared.*

---

## 10. North Star

**Does demonstrating a mechanism on many configurations of one fixed agent and one fixed environment
establish transferability? No — and not nearly.**

Sampling-frame validity contributes exactly one link in *interpretable → falsifiable → transferable
→ reusable*: it makes a **falsifiable** claim have a **defined scope**. Without it, "the effect is X"
has no referent beyond the enumerated set. With it, the claim becomes "over `A`, conditional on
`agentSeed = 20260819000`, on this graph, the effect is X."

**That is a real gain and a small one.** It is orthogonal to transferability:

- **Transfer needs variation in §7's fixed dimensions** — above all the **agent seed**, since with one
  initialisation nothing distinguishes "a property of the mechanism" from "a property of this run."
- **Two architectural obstacles remain untouched by any frame:** M22's non-identifiability of the
  ranking/admission decomposition, and M23's finding that admission and weighting share a direct
  cause (`penalties`). Neither is a sampling problem; neither is fixed by sampling.

**No cognitive, planning, intelligence, engineering or manufacturing claim follows from the existence
or absence of a sampling frame**, and none is made here. *These dimensions are named as what would
eventually matter; none is prescribed for variation now.*

---

## 11. Evidence → Inference → Hypothesis

**EVIDENCE**
- **Ev-1.** `cfg` carries `configSeed` and `configIndex` as fields (`env.js:192–197`).
- **Ev-2.** `makeRng` opens `let a = (seed >>> 0) || 1` (`rng.js:18`); seeds 0 and 1 produce an
  identical stream (executed, 64 draws; control pair 7/8 differs).
- **Ev-3.** `evaluateConstraints` reads only `cfg.pPhase1`, `cfg.goal`, `cfg.embedding`, and contains
  no agent or arm symbol.
- **Ev-4.** R2 (`:227`) and R5 (`:241`) condition on the reliability-optimal policy's structure.
- **Ev-5.** The environment stream is seeded `agentSeed ^ 0x5EED` (`rng.js:46`); `agentSeed` is fixed
  at `20260819000`.
- **Ev-6.** C1: 4000 candidates → 70 accepted (1.75%), 3930 rejected, 0 invalid, 0 failed.

**INFERENCE**
- **In-1.** `f` is injective but `g = π ∘ f` is not (Ev-1, Ev-2). Injectivity of `f` is scientifically
  empty.
- **In-2.** `α` factors through `g`, so `A` is a union of complete fibers (Ev-3) — making §3's
  arithmetic exact.
- **In-3.** Uniform key draw + rejection is uniform on `A` and **size-biased with weights `m(c)` on
  `C_A`** (In-2).
- **In-4.** `Δ` is a function of content given fixed `agentSeed` (Ev-5) ⇒ duplicates are exact
  replicas: no information gain, but weight distortion.
- **In-5.** Positivity holds on `A`, fails absolutely on `K`, and holds-but-unequally on `C_A`
  (Ev-3, Ev-4, In-3).
- **In-6.** Design-based finite-population inference needs no superpopulation; level C is blocked by
  the **absence of a definable superpopulation**, not by difficulty.
- **In-7.** Cluster structure is a property of block enumeration, not of uniform key sampling.

**HYPOTHESIS**
- **Hy-1.** That `g` is injective on `S' = S \ {0}` — i.e. `m ≡ 1`. **Plausible from the mulberry32
  recurrence; not established. Every configuration-level claim depends on it, and none is asserted
  without it.**
- **Hy-2.** That C1's 1.75% acceptance rate is typical of `K`. Observed in one block.
- **Hy-3.** That contiguous blocks are exchangeable with `A`. **Unverified, and the §3 design makes
  it unnecessary.**

---

## 12. Explicit corrections to M24

| # | M24 said | Status | Correct statement |
|---|---|---|---|
| **C-1** | *"Uniform random seed draw with rejection yields a probability sample of `P2` with known, equal inclusion probabilities."* | **TOO STRONG — the Director's objection is upheld** | Equal **over accepted keys `A`**. Over unique accepted configurations `C_A` it is **size-biased with probability `m(c)/\|A\|`**, equal only if `m` is constant — which is **not established** |
| **C-2** | *"No reweighting from `P2` to `P1` exists… positivity violation."* | **CORRECT for `K`, OVER-GENERALISED as stated** | Positivity **holds and is equal** on `A`; **fails absolutely** on `K`; **holds but unequally** on `C_A`, where weights `1/m(c)` exist in principle but `m(c)` is unknown |
| **C-3** | *"A 1000-seed block is a cluster sample with cluster size 4"* — stated generally | **TOO GENERAL** | True of **contiguous-block enumeration**; **not** a property of uniform key sampling, which dissolves clustering (§9.2) |
| **C-4** | *"`P2` … the accepted-configuration population"* | **AMBIGUOUS — the root of C-1** | `P2` conflated `A` (keys) with `C_A` (configurations). They are **different populations with different inclusion probabilities**, and every future artifact must name which one it means |

**M24's other conclusions are unaffected:** acceptance is pre-treatment and arm-independent;
acceptance conditions on the oracle's structure so `P1` is unreachable; the fresh-block
representativeness claim is rejected; the fixed agent seed bounds every claim; level D is not a
sampling question.

---

## 13. Classification

> # M24-R1: YELLOW
> **Partial / conditional sampling frame. Explicit limitations required.**

**I tested RED and it does not hold.** RED would require that no defensible frame exists. But
uniform key draw with rejection gives **exact, equal, known inclusion probabilities on `A`**, and `A`
is operationally decidable by committed deterministic code. That is a valid design-based frame for a
real finite population, and §8 shows it needs no superpopulation. **Calling that RED would be a
false negative.**

**I tested GREEN and it does not hold either.** GREEN would require a frame without material
qualification. Five qualifications are mandatory:

1. **The sampling unit is the KEY.** The target is `A`. Configuration-level uniformity requires
   **Hy-1**, which is unverified.
2. **`K` is unreachable.** Positivity fails absolutely (§6, target 2).
3. **`C_A` is reachable only up to multiplicity**, with weights that exist but are unknown (§6,
   target 3). **Exclude seed 0** to remove the one verified collision (§4.5).
4. **One graph, one hidden-variable family, one agent seed.** Every claim carries
   `| agentSeed = 20260819000`.
5. **Level B only** (§8).

---

## 14. Exact next milestone

**None recommended, and not because a limitation exists — because the minimum necessary structure is
now fully identified and none of it requires data.** M24-R1's output is a set of declarations. The
scientifically necessary structure, complete:

1. **Name the target population explicitly as `A`** (accepted keys), with the acceptance predicate
   pinned by commit digest.
2. **Declare the sampling unit as the key**, and state the configuration-level claim as conditional
   on Hy-1 — never as established.
3. **Exclude seed 0** from the draw range, removing the one verified collision at zero cost.
4. **Randomise the selection**: uniform key draw with rejection, the draw mechanism and its own
   randomisation source preregistered before any key is drawn.
5. **Forbid reweighting to `K`** on positivity grounds; **forbid unweighted configuration-level
   claims** unless Hy-1 is established.
6. **Cap generalisation at level B**, with `| agentSeed`, one-graph and one-hidden-variable-family
   scope in the required phrasing.
7. **Vary `agentSeed`** before any claim concerns the mechanism rather than this initialisation.

**Requirements 1–6 are governance declarations costing nothing. Requirement 7 is the one that matters
for the North Star, and no sampling frame supplies it.** Items 3 and 4 of the M24 §9 chain — the M22
non-identifiability and the M23 shared-cause obstacle — remain architectural and are untouched by
everything above.

**If the Director elects to proceed**, the next milestone is
**M25 — Target-Population and Draw-Mechanism Specification (formulation only)**, scoped to
requirements 1–6 and to nothing else: no preregistration, no seeds, no new block, no code. Any
implementation would be a **separate implementation milestone with its own verification and
integrity gate**, per the standing 2× workflow discipline.

**Still outstanding, still untouched, and required before any successor draws keys:** the
`895000–895999` registry-link defect.
