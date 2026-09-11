# M26 — Two-Axis Population Formulation

**Status:** FORMULATION ONLY — no implementation, no experiment, no seeds, no preregistration
**Milestone:** M26
**Date:** 2026-09-11
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-09-11 — *M25 ACCEPTED → M26 AUTHORIZED*

**Nothing was run. No seed generated, selected, evaluated or consumed; no configuration
instantiated; no experiment implemented; no registry, preregistration, production, C1 or UQ-B
change.** `run.js`, `_driver.js`, `main.js`, `rng.js`, `env.js` and `c1/protocol.js` were **read**;
the agent was never booted. C1 is not reinterpreted anywhere below. The `895000–895999` registry
defect remains open.

**Carried forward, unchanged:** the sampling-device / scientific-unit distinction (M24-R1, M25); and
M25's finding that a fixed `agentSeed` restricts generalisation across agent initialisation.

---

## 0. Verdict, and the finding that forces its wording

> # M26-YELLOW
>
> The two-axis formulation is well-posed and worth defining — **but the axis the architecture
> actually offers is not the axis the mission names.**
>
> **`agentSeed` does not vary agent initialisation. It varies the realised stochastic trajectory.**
> The agent's initial state is a **constant** across all `agentSeed` values (§1.7). A future
> two-axis study can therefore establish that the measured effect is **not an artifact of one
> realised exploration path** — a genuine and falsifiable result — but it **cannot** establish
> robustness "across initial conditions", because initial conditions never vary.

**This does not contradict the ruling; it sharpens it.** The ruling correctly names initialisation
variation as a *necessary* axis for a mechanism-level robustness claim. §1.7 establishes that this
axis **is not available** under the frozen architecture, and that `agentSeed` is a different, weaker
axis wearing the same name. I am reporting that rather than renaming the weaker axis to match the
authorisation.

---

# PASS 1 — SOURCE-BOUND STRUCTURAL AUDIT

Data flow traced, not inferred from names.

## 1.1 Every channel by which `agentSeed` acts — **exactly one**

| Site | What it does |
|---|---|
| `run.js:212` | `boot({ seed: input.agentSeed, goal: cfg.goal })` |
| `_driver.js:25` | inside `boot`: **`initRng(seed)`** — and `seed` is used for nothing else in `boot` |
| `run.js:272–273`, `:301`, `:318–321`, `:400` | **read-only**: draw-count recovery, provenance record, console banner |

> **EVIDENCE. `agentSeed` reaches the system through `initRng` alone.** Every other appearance is
> provenance or accounting. There is no separate initial-state parameter derived from it.

## 1.2 Every RNG stream seeded from `agentSeed` (`rng.js:33–46`, pinned at `run.js:318–321`)

```
cognitive   = agentSeed
visual      = agentSeed ^ 0x9e3779b9
environment = agentSeed ^ 0x5EED
sigma       = agentSeed ^ 0xBEEF
```

**All four.** No stream derives from `configSeed`.

## 1.3 Every stochastic process affected — and where it lives

`main.js` draws randomness through **`liveRng()` only** (`main.js:5`). Every call site, and its
enclosing function:

| Lines | Enclosing function | Role |
|---|---|---|
| `2366`, `2369` | **`runPrediction`** (`:1403`) | ε-greedy exploration and uniform choice |
| `3176`, `3194`, `3208`, `3236`, `3287`, `3338`, `4744` | **`runAgent`** (`:3132`) | relocation, periodic events, the `< 0.92` replay branch |
| `5098`, `5122` | **`runAgentLoop`** (`:5067`) | loop-level events |

> **EVIDENCE. Every randomness consumer is inside a tick-loop or decision function.** The two
> remaining `Math.random` occurrences (`main.js:3293`, `:3297`) are inside a **commented-out block**
> and are dead.

## 1.4 What `agentSeed` does **not** control

The environment content in full — `unreliableSet`, `pPhase1`, `pPhase2`, `embedding`, `goal` — all
from `configSeed`/`configIndex` via `makeConfig`; the graph (`neurons.json`, `connections.json`, 20
nodes / 39 edges); the acceptance predicate; and the frozen run parameters of §1.6.

## 1.5 Where `configSeed` touches the learning run

**One place:** `run.js:120`, `env.generateAccepted(input.configSeed, input.configIndex)` — it selects
the environment content. **It seeds no stream.** (The *readout* is separately seeded by
`readoutSeed(configSeed, arm, state)` — M25 §2.2, outside the learning run.)

## 1.6 Other fixed initialisation variables — the real "initialisation"

From `c1/collect.js` and `run.js:88–103`:

```
arm 'A1'   envMode 'on'   creditMode 'on'   pin 'on'
tickUnit 'step'   ticks 3000   crashAtTick null   warmStore FALSE
```

`warmStore: false` ⇒ **cold start**. And in `main.js` the learned stores begin empty —
`adjacencyMemory = new Map()` (`:926`), `goalNeuronId = null` (`:1017`), `agentCurrent = null`
(`:3081`).

> **`m7Arm = 'A1'` deserves naming: it is an M7 *treatment condition* pinned to one level.** It is a
> fixed axis, not a neutral default.

## 1.7 Does `agentSeed` change initial state, trajectory, or both? — **trajectory only**

**INFERENCE, from §1.1 + §1.3 + §1.6.** `agentSeed` acts only through `initRng`; every consumer of
those streams sits inside a tick-loop function; the learned stores start empty and `warmStore` is
false. **No draw is consumed before the agent loop begins.**

> **Therefore the agent's initial state is identical for every `agentSeed`. `agentSeed` selects
> which pseudo-random sequence the run consumes during learning — nothing else.**
>
> **It is a trajectory-randomisation seed, not an initialisation parameter**, and §6 and §8 are built
> on that.

## 1.8 Can two `agentSeed` values give identical effective trajectories? — **yes, and it is likely**

Randomness is consumed almost entirely at **threshold comparisons**: `liveRng() < epsilon`,
`< 0.1`, `< 0.15`, `< 0.02`, `< 0.92`, `< 0.05`. Two different draws on the same side of a threshold
produce **the same branch**. Distinct streams therefore need not yield distinct trajectories, and for
small thresholds most draws agree.

Additionally `makeRng` opens `let a = (seed >>> 0) || 1`, so **`agentSeed` 0 and 1 collide outright**
(M24-R1 §2.1b) — here in the cognitive stream directly.

> **INFERENCE: effective-trajectory multiplicity is plausible and structurally expected, not exotic.**
> **It is also detectable at zero cost** — `runOnce` already records a run fingerprint, and C1 stores
> `fingerprintArmed` / `fingerprintAblated` per configuration. Two `agentSeed` values yielding an
> identical fingerprint on the same content are an observed duplicate, not an assumption.

## 1.9 Hidden initialisation variables

`globalThis.__M7_GOAL__` (from `cfg.goal` — configuration axis); the `__UQB__` / `__M14__` guards
(instrumentation, default-off); and §1.6's pinned parameters. **No further hidden agent-side
initialisation variable was found.** *That a search found none is EVIDENCE about this trace, not
proof of absence — recorded as Hy-4.*

---

# PASS 1 — THE AXES

## 2.1 Axis C — configuration / environment content

| | |
|---|---|
| scientific unit | configuration **content** `π(cfg) = (goal, unreliableSet, pPhase1, pPhase2, embedding)` |
| sampling device | key `(configSeed, configIndex)` |
| generation | `makeConfig`, deterministic |
| controllable | reliability assignment, embeddings, goal index |
| fixed | graph (20/39), hidden-variable family, `N_UNRELIABLE = 13`, the two uniform ranges |
| stochastic / deterministic | **deterministic** given the key |
| collisions | `m(c) ≥ 1`; seeds 0 and 1 collide; otherwise **UNKNOWN** (Hy-1) |
| reproducibility / provenance | exact; key retained by the registry |

## 2.2 Axis A — as the mission names it, and as the architecture offers it

| | **A\* — agent initialisation** *(what the mission wants)* | **A — trajectory randomisation** *(what exists)* |
|---|---|---|
| scientific unit | an initial agent state | a realised pseudo-random sequence |
| generator | **none exists** | `agentSeed` → `initRng` |
| what varies | initial `Q`, penalties, transitions, position, structure | which draws are consumed during the run |
| status | **NOT AVAILABLE** under the frozen architecture (§1.7) | available, one integer |
| collisions | — | **structurally expected** (§1.8), detectable via fingerprints |
| reproducibility | — | exact |

> **Is `A1 = agentSeed` a sufficient representation of agent initialisation? NO — and not because
> `agentSeed` is one of several initialisation parameters. Because there are none.** The
> initialisation is a constant; `agentSeed` parameterises something else. Calling the available axis
> "initialisation" would be the single most consequential wording error available in this milestone.

---

# PASS 1 — TARGET-POPULATION CANDIDATES

`A′` = accepted keys (M25); `C_A` = unique accepted contents; `S_A` = a set of `agentSeed` values;
`T_A` = the set of distinct *effective trajectories* they induce.

| | Scientific unit | Sampling frame | Finite & enumerable? | Positivity | Multiplicity | Weighting | Permits | Cannot support |
|---|---|---|---|---|---|---|---|---|
| **P1** keys × fixed A | key | `A′` | finite; **not enumerable** (`\|A′\|` unknown) | equal on `A′` | `m(c)` in content | none needed at key level | exact finite-population claim over keys, one trajectory | anything about trajectory or initialisation |
| **P2** contents × fixed A | content | `C_A` | finite; **not constructible** | positive, unequal | `m(c)` | `1/m(c)`, unknown | the same claim about environments | same; reduces to P1 under `m ≡ 1` |
| **P3** keys × `agentSeed` | (key, seed) pair | `A′ × S_A` | finite; not enumerable | equal on the product | `m(c)` **and** trajectory multiplicity | none at pair level | **effect not an artifact of one exploration path** | initialisation, environment, task |
| **P4** contents × `agentSeed` | (content, seed) | `C_A × S_A` | **not constructible** | unequal in `c` | both | `1/m(c)`, unknown | as P3, in the meaningful unit | same |
| **P5** contents × A × task/env | (content, seed, env, task) | — | **no frame** — no env or task family defined | — | — | — | — | **not a population today** |

> **P4 does not automatically win**, and the ruling is right to say so. P4 is the *meaningful* unit
> but is **not constructible** (M25 §4.2: `C_A` cannot be inverted, `m(c)` cannot be computed). P3 is
> constructible and exact. **They coincide under the same falsifiable condition `m ≡ 1`** that M25
> established — so M26 again **declares the condition rather than choosing the path**.
>
> **P5 is not a population**, and naming it must not be mistaken for expanding the target. It is not
> expanded here.

---

# PASS 1 — MULTIPLICITY UNDER TWO AXES

Carried from M24/M25: `m(c) = |g⁻¹(c) ∩ A′|`, and uniform key draw is **size-biased over contents**
by `m(c)`.

**Does adding `agentSeed` change the problem? Yes — it adds a second, larger one.**

| | Content multiplicity `m(c)` | **Trajectory multiplicity `μ(t)`** |
|---|---|---|
| mechanism | two seeds → identical 718-draw stream | two seeds → **same branch at every threshold** |
| plausibility | requires full stream collision — **implausible** (Hy-1) | **structurally expected** (§1.8) |
| measurable? | yes — content hash, free | **yes — run fingerprint, free** |
| constructible exact frame? | **no** | **no** |

> **INFERENCE. The `agentSeed` axis is expected to have *more* duplication than the content axis, not
> less.** Two distinct seeds that never cross a threshold differently produce a bit-identical run and
> therefore a bit-identical `Δ`. Under `key × agentSeed` sampling, such a pair contributes **two
> observations carrying one observation's information**.
>
> **No estimator is invented.** The measurable response is the same as M25's: fingerprint every run,
> report duplicates, and treat "distinct seeds ⇒ distinct trajectories" as a **falsifiable
> precondition**, never an assumption.

---

# PASS 1 — CAUSAL STRUCTURE AND ESTIMAND

```
A (trajectory seed) ──┐
                      ├──► learned state S ──► pool P, weights w ──► Y = E6
C (content) ──────────┤                                   ▲
                      └───────────────────────────────────┘
T (ARMED/ABLATED) ────────────────────────────────────────┘   applied WITHIN each (A,C)
```

Both arms run at the same `(A, C)`, so `τ(A,C) = Y(1;A,C) − Y(0;A,C)` is **deterministic and exactly
computable per cell** — as in C1, where it is exact rather than estimated.

### What is `A`?

**Not** an initialisation condition (§1.7). **Not** a substantive moderator — it carries no meaning;
it is a label for a pseudo-random sequence. It is:

- a **nuisance randomisation axis**, and
- a **source of heterogeneity** in `τ`, and
- **a population axis only if the program declares it one.**

> Calling `A` a moderator would invite a substantive reading of any `τ`-vs-`A` pattern. **There is
> nothing to interpret in `A`**; only its *dispersion* is informative.

### Which estimand? — **the distribution, and specifically the between-`A` component**

| Candidate | Verdict |
|---|---|
| `E_C[τ \| A = a₀]` | what C1 delivers; **cannot address robustness by construction** |
| `E_{A,C}[τ]` | **wrong default.** Averaging over `A` *hides* sign reversal across `A`, which is precisely the failure mode of interest (§9 toy 8) |
| **distribution of `E_C[τ \| A]` across `A`** | **correct.** The robustness question is whether the per-`A` effect keeps its sign and rough magnitude as `A` changes |

> **Chosen on scientific grounds, not convenience:** robustness is a statement about *dispersion and
> sign-stability*, and only the distributional form can express it. A mean over `A` would let a
> design that reverses sign on half its seeds report a clean positive number.
>
> **Direction must be frozen in advance**, as C1 §2 froze `Δ`'s, before any such study is specified.
> **No threshold on dispersion is proposed, and none may be inferred** — M26 names the quantity, not
> a criterion.

---

# PASS 1 — GENERALISATION LADDER

| | Design | More defensible | Still unresolved |
|---|---|---|---|
| **L0** | one content × one seed | nothing beyond that cell | everything |
| **L1** | many contents × one seed | environment-robustness over `A′`; **this is C1's structure** | trajectory, initialisation, env, task |
| **L2** | one content × many seeds | **trajectory-robustness at one environment** — cheap, and it can falsify | environment generality |
| **L3** | many contents × many seeds | the effect is **not an artifact of one exploration path** across the accepted population | **initialisation (never varied), graph, task, M7 arm, and the M22/M23 architectural obstacles** |
| **L4** | + env/task variation | environment- and task-generality | no env or task family is defined; not a population (P5) |

> **L3 is not "mechanism proof" and must never be described as one.** It removes **one** alternative
> explanation — "it was that exploration path" — from a list on which **initialisation, graph, task,
> M7 arm, and identifiability** all remain.
>
> **L2 deserves attention as the cheapest falsifier.** If the effect reverses across seeds at a
> single content, L3 is unnecessary: the trajectory-artifact hypothesis is already supported.

---

# PASS 1 — ATTAINABILITY AND DESIGN RISKS

| Risk | Class | Note |
|---|---|---|
| content multiplicity `m(c)` | **structural**, measurable | content hash, free (M25) |
| duplicate content | structural, measurable | as above |
| **duplicate effective trajectories** | **structural**, **measurable** | **run fingerprint, free** (§1.8) — expected to dominate |
| `agentSeed` collisions (0/1) | structural, **repairable** | exclude seed 0 |
| treatment-dependent candidate pools | **accepted limitation** | frozen; M22 established non-identifiability |
| R5 oracle-dependent eligibility | **accepted limitation** | eligibility is not independent of the hypothesis (M25 §5) |
| treatment-dependent normalisation | **accepted limitation** | `ρ = r/(n−1)`, frozen |
| `n = 1` undefinedness | structural, measurable | C1 recorded 18/18 symmetric |
| differential definedness | measurable | C1 observed **0 of 2660** |
| readout randomness | **measurable, currently untested** | M25's inserted rung G2.5 |
| fixed graph | **accepted limitation** | one 20-node/39-edge graph |
| fixed task/goal | **accepted limitation** | four instances, not a distribution |
| **computational explosion** | **structural** | the design is a **product**: `|contents| × |seeds| × 2 arms` runs of 3000 ticks. C1 was 140 runs for one seed value; L3 multiplies that by `|S_A|` |

**No arbitrary threshold is proposed for any of these.** The computational row is flagged because a
product design makes cost grow multiplicatively, and **that is a reason to prefer L2 as a first
falsifier**, not a reason to shrink the population arbitrarily.

---

# PASS 1 — SCIENTIFIC CLAIM BOUNDARY

**A successful L3 study COULD establish:**

> *Over the accepted configuration population, and over the sampled trajectory-randomisation seeds,
> the measured candidate-ranking contrast keeps its direction — conditional on this graph, this
> hidden-variable family, these four goals, `m7Arm = 'A1'`, the cold-start initial state, and the
> frozen acceptance predicate.*

**It COULD NOT establish:**

1. **That `futureScore` is a reusable cognitive mechanism.** Not weaker evidence for it — **no
   evidence of that kind at all**. Robustness to exploration noise and mechanism-hood are different
   propositions.
2. **Robustness across agent initialisations** — initialisation does not vary (§1.7).
3. Anything about other graphs, other tasks, or other M7 arms.
4. Anything the M22 non-identifiability and M23 shared-cause findings block — **architectural, and
   untouched by any population design**.

> **The smuggling route to guard against is a two-step:** *"robust across seeds"* → *"robust"* →
> *"a mechanism."* **Each arrow is invalid.** The first drops the conditioning; the second changes
> the proposition.

---

# PASS 2 — ADVERSARIAL VERIFICATION

**1. `agentSeed` is a sufficient representation of agent initialisation.** **FALSIFIED — §1.7.**
It represents no initialisation at all. Counterexample by construction: hold `agentSeed` at any two
values; the initial `Q`, penalties, transitions, `adjacencyMemory`, `agentCurrent` and `warmStore`
are identical in both. Nothing initial differs.

**2. Configuration content is a sufficient representation of environment.** **PARTIALLY FALSIFIED.**
Content captures reliability, embeddings and goal — but the **graph is not part of content** and
never varies. "Environment" in the ordinary sense includes structure; `C` covers only the
parameterisation laid over one fixed structure.

**3. P4 is the correct scientific population.** **FALSIFIED as stated.** P4 is the correct *unit* and
a non-constructible *frame* (§P-candidates). Asserting P4 as the population would assert a frame that
does not exist.

**4. `key × agentSeed` is unbiased for the intended scientific unit.** **FALSIFIED.** It is exactly
uniform on the *pair* frame and **size-biased over contents** by `m(c)` (M25 §3), and additionally
over-weights trajectories with high `μ(t)`. **Unbiasedness holds for the sampling device, not for the
scientific unit** — the distinction M24-R1 was written to protect.

**5. Varying `agentSeed` suffices for mechanism-level evidence.** **FALSIFIED — and this is the one
the ruling explicitly forbids claiming.** It removes one alternative explanation from a list of at
least five (§claim boundary). Necessary, nowhere near sufficient.

**6. The treatment effect averaged across `agentSeed` measures robustness.** **FALSIFIED, with a
counterexample (§9 toy 8):** seeds giving `τ = +0.5` and `τ = −0.5` average to exactly `0`, and seeds
giving `+0.02` and `−0.02` also average to `0`. **The mean cannot distinguish "no effect" from
"violently unstable effect."** Robustness is dispersion and sign-stability, not a mean.

**7. The R5-defined accepted population is neutral.** **FALSIFIED.** R5 requires the
reliability-optimal and hop-optimal policies to differ on ≥ 4 decision states — **precisely the
circumstance in which a lookahead term has something to contribute** (M25 §5). Eligibility is not
independent of the hypothesis. Declared, not repaired.

**8. Multiplicity can be ignored.** **FALSIFIED, and more sharply than in M25.** Trajectory
multiplicity is *structurally expected* (§1.8), not merely possible. Ignoring it would inflate the
apparent number of independent observations on the very axis the study is about.

**9. Duplicate content is a duplicate scientific unit.** **PARTIALLY FALSIFIED — carried from M25
§3.** Duplicate content under the *same* `agentSeed` shares the learning run bit-for-bit but differs
in readout stream (`readoutSeed` depends on `configSeed`). It is a **readout-level replicate**, and
whether `Δ` is invariant to that remains **UNKNOWN**.

**10. More seeds automatically means more scientific information.** **FALSIFIED.** By §1.8, extra
`agentSeed` values may reproduce existing trajectories exactly, adding rows and no information. And
by §5, seeds vary a *nuisance* axis: **10 000 trajectory seeds still yield zero information about
initialisation, graph, or task.** Information comes from **which axis** varies, not from `N`.

---

# PASS 2 — TOY POPULATIONS

`τ` = the per-cell treatment effect; direction under the frozen convention (`τ < 0` favours ARMED).

| # | Case | Can conclude | Cannot conclude |
|---|---|---|---|
| 1 | one content `c₁` × seeds `{a₁,a₂}`; `τ = −0.2, −0.18` | the effect at `c₁` survives two exploration paths | anything about other contents; **two seeds is not a population** |
| 2 | contents `{c₁,c₂}` × one seed `a₁`; `τ = −0.2, +0.1` | heterogeneity across environments at `a₁` — **C1's structure** | whether either sign survives a different path |
| 3 | `{c₁,c₂} × {a₁,a₂}`, all `τ < 0` | direction stable over both axes in this 2×2 | that 4 cells constitute either population |
| 4 | `c₁` reachable from keys `k₁,k₂` (`m = 2`) | key-sampling over-weights `c₁` **2:1** | that the content is "twice as present" — `m` is a PRNG property |
| 5 | `a₁ ≠ a₂` produce **identical fingerprints** | the two rows are **one observation**; effective `\|S_A\| = 1` | any trajectory-robustness claim from this pair — **it is detectable, so it need not be assumed** |
| 6 | `a₁ ≠ a₂` produce different fingerprints | two genuinely distinct trajectories | that two is enough |
| 7 | `τ(a₁) = −0.30`, `τ(a₂) = −0.02` | same sign, **15× magnitude spread** | stability of magnitude; **the mean `−0.16` represents neither** |
| 8 | `τ(a₁) = +0.5`, `τ(a₂) = −0.5` | **the effect reverses with the exploration path** — a decisive negative | any directional claim. **Mean = 0, identical to a true null** (attack 6) |
| 9 | `τ(c₁) = +0.5`, `τ(c₂) = −0.5` at fixed `a` | environment-driven reversal — **already visible in C1** (goal 19 phase 1, M20 §4.3) | that it is trajectory-driven; the axes are not separated by this design |
| 10 | R5 admits 70 of 4000 | a claim about the admitted 1.75% | anything about the excluded 98.25%; **and eligibility is hypothesis-adjacent** (attack 7) |

> **Toys 8 and 9 together are the argument for the two-axis design**: C1 has already observed
> reversal across *contents*. Whether reversal also occurs across *trajectories* is unknown, and it
> is the difference between "heterogeneous effect" and "artifact of one path."

---

# EVIDENCE → INFERENCE → HYPOTHESIS

**EVIDENCE**
- **Ev-1.** `boot` uses `seed` only for `initRng` (`_driver.js:25`); `run.js:212` passes `agentSeed`.
- **Ev-2.** All four streams derive from `agentSeed` (`run.js:318–321`); none from `configSeed`.
- **Ev-3.** Every `liveRng()` site in `main.js` lies inside `runPrediction` (`:1403`), `runAgent`
  (`:3132`) or `runAgentLoop` (`:5067`); the two `Math.random` sites (`:3293`, `:3297`) are commented
  out.
- **Ev-4.** Learned stores start empty (`:926`, `:1017`, `:3081`); `warmStore` is false.
- **Ev-5.** `configSeed` enters the learning run only via `generateAccepted` (`run.js:120`).
- **Ev-6.** Randomness is consumed at threshold comparisons (`< epsilon`, `< 0.1`, `< 0.92`, …).
- **Ev-7.** `makeRng` opens `let a = (seed >>> 0) || 1`.
- **Ev-8.** Fixed run parameters incl. `m7Arm = 'A1'` (`run.js:88–103`).
- **Ev-9.** C1 records per-configuration run fingerprints.

**INFERENCE**
- **In-1.** `agentSeed` varies the realised trajectory and **not** the initial state (Ev-1…Ev-4).
- **In-2.** "Agent initialisation" is **not an available axis** (In-1, Ev-4).
- **In-3.** Distinct `agentSeed` values can yield identical trajectories, and this is structurally
  expected (Ev-6, Ev-7).
- **In-4.** Trajectory multiplicity is measurable at zero cost via fingerprints (Ev-9, In-3).
- **In-5.** The robustness estimand must be the **distribution** of `τ` across `A`; a mean over `A`
  cannot distinguish a null from a sign-reversing effect (toy 8).
- **In-6.** `key × agentSeed` is uniform on pairs and size-biased on contents (M25 §3 carried).

**HYPOTHESIS**
- **Hy-1.** `m ≡ 1` on `A′` (content injectivity beyond the removed collision) — carried, unverified.
- **Hy-2.** `Δ` is invariant to readout randomisation — carried, **UNKNOWN**.
- **Hy-3.** The trajectory-multiplicity rate is low enough to be practically ignorable. **Not
  established; §1.8 argues the opposite direction.**
- **Hy-4.** No further hidden agent-side initialisation variable exists (§1.9) — a trace found none,
  which is not proof.

**No cognitive, planning, intelligence or mechanism-validation claim is made, and none follows from
any population design.**

---

# M26 OUTCOME

> # M26-YELLOW
> *A useful formulation; population and estimand questions remain unresolved.*

**Well-posed.** The two-axis design is definable: sample `(key, agentSeed)` pairs; compute `τ` exactly
per cell; report the **distribution of `E_C[τ | A]` across `A`**; fingerprint every run; treat
"distinct seeds ⇒ distinct trajectories" and `m ≡ 1` as **falsifiable preconditions**.

**Unresolved, and why it is not GREEN:**

1. **The axis is not the one the mission names.** `agentSeed` varies trajectory, not initialisation
   (§1.7). Whether an initialisation axis can exist at all is **outside M26's scope** and is the next
   question.
2. **Trajectory multiplicity is structurally expected and unquantified** (Hy-3).
3. **The estimand's distributional form needs Director ratification**, since it changes what "the
   result" is from a number to a distribution.
4. **Content multiplicity persists** and now compounds.

**Not HOLD:** no foundational ambiguity blocks definition — the study *is* definable, and §1.7
resolves the ambiguity rather than leaving it open.

## The single highest-value next formulation milestone

> ## M27 — Initialisation-Axis Feasibility Formulation *(formulation only)*
>
> **Question:** *Can an agent-initialisation axis be constructed at all without modifying frozen
> architecture — and if not, what exactly would have to change?*
>
> Candidate levers visible in the source and **not evaluated here**: `warmStore` (`run.js:103`),
> pinned M7 arms other than `'A1'`, and pre-seeded learned stores. Each would have to be assessed for
> whether it constitutes *initialisation variation* or merely another treatment, and whether it is
> reachable within governance.

**Why M27 rather than proceeding to design the trajectory study:** §1.7 shows the authorised mission —
robustness *across initial conditions* — cannot be fulfilled by the available axis. Building the
trajectory study first would deliver a real but different result under a name that invites the wrong
reading. **Settling whether the named axis exists is worth more than measuring the substitute.**

**I note the counter-argument fairly:** L2 — one content × many seeds — is cheap and can *falsify*
(toy 8), and falsification is the North Star's first link. **If the Director prefers falsification
speed over axis correctness, L2-first is defensible**, and I would specify it without reservation.

**Milestone type: FORMULATION** under either route. **No implementation is authorised by M26, and
none is requested.**

**Still outstanding, still untouched:** the `895000–895999` registry-link defect.

---

Believe in yourself and keep going
