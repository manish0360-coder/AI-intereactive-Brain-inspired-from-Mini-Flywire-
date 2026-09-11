# M27 — Initialisation-Axis Feasibility Audit

**Status:** FORMULATION + SOURCE-BOUND FEASIBILITY AUDIT ONLY
**Milestone:** M27
**Date:** 2026-09-11
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-09-11 — *M26 ACCEPT WITH SPECIFIC REPAIR → M27 AUTHORIZED*

**Nothing was run; the agent was never booted. No seed generated, selected or consumed; no
experiment; no preregistration, registry, production, C1 or UQ-B change; no architecture modified.**
`run.js`, `_driver.js`, `main.js`, `arms.js`, `rng.js` and `M7_PREREGISTRATION.md` were **read**.

**Preserved exactly, from M26:** `agentSeed` varies the realised stochastic trajectory after a
**common deterministic initial state** — it does not vary initial internal state. **Preserved claim
boundary:** robustness across stochastic trajectories would be evidence about robustness of the
observed effect; varying `agentSeed` alone would **not** establish that `futureScore` is a reusable
cognitive mechanism.

---

## 1. Verdict

> # M27-HOLD
>
> **No legitimate initial-state or experience-history axis can currently be defined.** The
> architecture *does* contain a pre-tick state-loading path (`loadBrain`, `main.js:1099`) — but the
> **frozen M7 preregistration §5.4 requires "Cold `localStorage` per run, asserted at start"**, and
> `runOnce` enforces it with an assertion that **throws** (`run.js:224–231`).
>
> **The axis is therefore not merely absent — it is explicitly prohibited by the frozen
> architecture, and prohibited for a stated reason that would itself have to be solved first (§5).**
>
> This is a source-established negative, not an inference from absence. A deeper architecture-level
> formulation would be required, and that is a governance decision, not an engineering one.

**I am not claiming "no axis exists".** The *stochastic-trajectory* axis exists and is well defined
(M26). What does not exist is an **initial-state / experience-history** axis, which is what M27 was
asked to find.

---

# PASS 1 — SOURCE TRACE

## 2.1 The candidate mechanisms, traced

### (a) `warmStore` — **fault injection, not a state axis**

| | |
|---|---|
| **Source** | `run.js:103` (input), `run.js:222` (action) |
| **What it does** | `if (process.env.M7_RUN_WARMSTORE) globalThis.localStorage.setItem('brain', '{}')` |
| **When** | **after** `boot()` at `:211`, therefore **after** `loadBrain()` has already run |
| **What state it changes** | **none** — it writes the *empty* object `'{}'`; `loadBrain` would restore nothing from it even if it ran |
| **Initial state or trajectory?** | **neither** |
| **Deterministic?** | deterministic |
| **Changes the intervention / pool / oracle / measurement?** | no |
| **Part of the frozen architecture?** | yes — as a **fault injector** |
| **Legitimate axis?** | **NO** |

> The source says so in its own words (`run.js:219–221`): *"fault injection, so G10.2 can be
> DEMONSTRATED to fire rather than merely asserted."* **`warmStore` exists to prove the cold-start
> guard works.** Reading it as a pre-seeding lever inverts its purpose.

### (b) The cold-start guard — **the decisive finding**

```
run.js:213-231   G10.2 — COLD localStorage, ASSERTED AT START (frozen §5.4)
                 const coldOk = keysAtStart.length === 0 && brainAtStart === null;
                 if (!coldOk) { restore(); throw new Error('G10 VIOLATION: …'); }
```

And the frozen clause it cites, verbatim from `M7_PREREGISTRATION.md §5.4`:

> *"**Cold `localStorage` per run**, asserted at start (`setInterval(saveBrain, 5000)` writes;
> startup reads back)."*

> **EVIDENCE. Cold start is a frozen constitutional requirement of the M7 substrate, inherited
> unchanged by M8, Q1, UQ-A, UQ-B and C1, and enforced by a throwing assertion.**

### (c) `loadBrain` — a real pre-tick path, closed by (b)

| | |
|---|---|
| **Source** | `main.js:729` (definition), **`main.js:1099` (called at module top level)** |
| **When** | during `boot()`'s `import('../../main.js')`, **before the agent loop can start** |
| **What state it changes** | `rewards`, `Q`, `penalties`, `transitions`, `curiosity`, `confidence`, `episodes`, `homeNeuronId`, `goalNeuronId` — then `rebuildAdjacencyMemory()` at `:1121` |
| **Initial state or trajectory?** | **genuine initial internal state** |
| **Changes candidate generation?** | **YES** — `transitions` feeds `allCandidates` (`main.js:1593`); `penalties`/`Q` feed F1/F2 |
| **Changes the oracle?** | **NO** — `__M7_GOAL__` is applied *after* `loadBrain` (`main.js:1114`), so the frozen experiment goal overrides any restored `goalNeuronId`. *The comment at `:1110` states this ordering is deliberate.* |
| **Changes the intervention?** | no |
| **Changes only measurement?** | no |
| **Frozen architecture?** | the path is production code; **using it with content is forbidden by §5.4** |
| **Legitimate axis?** | **NOT AVAILABLE** — see §5 |

### (d) M7 arms — **a treatment manipulation, not an initialisation**

`run.js:128` — `arms.configure({ arm: … })`, wiring `bayesianTrustFor` / `aggregateTrustFor`
(`:135–136`) and, when `arms.pinsPredictionErrorPathway()`, the prediction-error pathway (`:138`).

> Arms select **which trust/uncertainty behaviour is active**. That changes *the mechanism under
> study*, not the agent's starting condition. Varying `arm` would be **a different intervention**,
> confounded with `T`. **Not an initialisation axis.**

### (e)–(j) The remaining candidates

| Candidate | Finding |
|---|---|
| **pre-seeded stores** | the only route is `localStorage['brain']` → closed by §5.4 |
| **memory initialisation** | `adjacencyMemory = new Map()` (`:926`) — empty; rebuilt from restored episodes, of which there are none under cold start |
| **learned-store initialisation** | `Q`, `penalties`, `transitions`, `rewards` all begin empty |
| **persisted state before the tick loop** | **only** `localStorage['brain']`, asserted empty |
| **initial biological state** | governed by `__UQB_FREEZE_BIO__` at *readout*, not at init; no pre-tick biological parameterisation found |
| **initial cognitive state** | `goalNeuronId = null` (`:1017`), `agentCurrent = null` (`:3081`); goal supplied by `__M7_GOAL__` from the **configuration** axis |
| **anything else affecting `futureScore` before ordinary experience** | none found beyond the above |

> *That a trace found nothing further is EVIDENCE about this trace, not proof of absence — Hy-1.*

---

## 3. The axes, defined separately

| | Definition | Exists? | Controllable? |
|---|---|---|---|
| **A1 — stochastic trajectory** | which pseudo-random sequence the run consumes; `agentSeed → initRng` | **YES** | **YES** — one integer |
| **A2 — initial internal state** | the contents of `Q`, `penalties`, `transitions`, `rewards`, `episodes` **before tick 0** | path exists (`loadBrain`) | **NO — prohibited by frozen §5.4** |
| **A3 — memory / history** | prior experience carried into a run | same path as A2 | **NO — same prohibition** |
| **A4 — environment / experience-history** | the experience produced *during* a run | **not independent** — a deterministic function of `(content, agentSeed)` given cold start (M25 §11) | **NO** |
| **A5 — other** | **none established.** M7 arms (§2.1d) are a treatment manipulation, not an initialisation axis | — | — |

**These are not collapsed into one category.** A1 is available; A2 and A3 are the *same* prohibited
route; A4 is a mediator with no degrees of freedom; A5 is empty.

---

## 4. Causal role of each candidate

| Axis | Causal role | Would changing it alter … |
|---|---|---|
| **A1** `agentSeed` | **nuisance variation**, pre-treatment in time, and a **source of heterogeneity** in `τ`. *Not* a moderator in any substantive sense — it labels a random sequence | exposure **no** · pool **indirectly**, via the learned state the trajectory produces · oracle **no** · normalisation **indirectly** · E6 definition **no** · learned state **yes, as an outcome of the run** · stochastic realisation **yes, directly** |
| **A2/A3** warm brain | **experimental manipulation** of a pre-treatment variable | exposure **no** · **pool YES, directly** (`transitions` → `allCandidates`; `penalties`/`Q` → F1/F2) · oracle **no** (`__M7_GOAL__` overrides) · normalisation **yes**, via pool size · E6 definition **no** · learned state **yes, by construction** |
| **A4** experience history | **mediator** — M22's, and the one shown non-decomposable | — (not independently settable) |
| **M7 arm** | **a second treatment**, on the trust pathway | **exposure-adjacent: it changes the mechanism under test.** Confounded with `T` |
| **readout seed** | **measurement manipulation** | **only measurement** (M25 §2.2, rung G2.5) |

---

## 5. Scientific legitimacy — the eight tests

Applied to **A2/A3 (warm brain)**, the only candidate that would be an initialisation axis.

| # | Test | Answer |
|---|---|---|
| 1 | meaningful construct? | **Yes** — "an agent that has already learned something" is a real construct |
| 2 | independent of `T`? | **Yes** — set before the run; `T` applies during it |
| 3 | fixable while configuration varies? | **Yes in principle** — one brain, many configurations |
| 4 | configuration fixable while it varies? | **Yes in principle** |
| 5 | changes the object studied? | **YES — materially.** It changes candidate generation and admission (§4), so E6 would be measured on a differently-constituted pool |
| 6 | reveals an existing mechanism, or introduces a new one? | **Depends entirely on provenance.** A brain *harvested from a real run* is extraction. A **hand-authored** brain is **invention** |
| 7 | inside the frozen architecture? | **NO.** Frozen §5.4 requires cold `localStorage`, asserted at start |
| 8 | interpretable as robustness? | **Not as currently framed** — it would be a *sensitivity* study of the effect to prior learning, which is a different question |

### 5.1 Why the prohibition is substantive, not bureaucratic

Frozen §5.4's neighbouring clause gives the reason:

> *"One OS process per run. `main.js` has top-level side effects and ESM caching returns the cached
> instance on re-import — batching runs in one process would silently share learned state across
> arms."*

> **Cold start is the guarantee that ARMED and ABLATED do not contaminate each other, and that no run
> inherits a previous run's brain.** Deliberately warming the store would reintroduce precisely the
> contamination the guard exists to exclude — and would then require a **new mechanism** to
> distinguish *intended* pre-seeded state from *leaked* state. **That mechanism does not exist.**
>
> So A2/A3 is not one governance sign-off away from being usable. **It requires solving the problem
> the prohibition was written to solve.**

## 6. Architectural constraint classification

| Axis | Class | Reason |
|---|---|---|
| **A1** stochastic trajectory | **GREEN** | already represented; scientifically interpretable as trajectory robustness (M26) |
| **A2 / A3** warm brain | **RED** | requires superseding frozen §5.4 **and** inventing an intended-vs-leaked-state distinction |
| **A4** experience history | **RED** | not independently settable; a mediator |
| **M7 arm as an axis** | **RED** | a second treatment; changes the mechanism under test — *"mechanism ≠ content"*, and it would be a silent scope change |
| **readout seed** | **YELLOW** | represented and controllable, but it is *measurement* variation; its scientific meaning (does `Δ` even depend on it?) is **unresolved** — M25 Hy-2 |

**No architecture was modified, and none is proposed.**

---

## 7. I, R, H, C, T, Y — what is actually controllable

| | Object | Currently controllable? | By what |
|---|---|---|---|
| **I** | initial internal state | **NO** — constant, asserted cold | — |
| **R** | stochastic trajectory | **YES** | `agentSeed` |
| **H** | experience history | **NO** — deterministic function of `(C, R)` given `I` constant | — |
| **C** | configuration content | **YES** | `(configSeed, configIndex)` |
| **T** | ARMED/ABLATED | **YES** | the frozen intervention |
| **Y** | E6 outcome | derived | `Y = f(I, R, C, T)` with `I` constant |

> **Verified mapping, against the ruling's instruction not to assume it:** `agentSeed → R`, **not**
> `agentSeed → I`. Established at M26 (`boot` → `initRng` only; every `liveRng` consumer inside a
> tick-loop function; stores empty; `warmStore` false) and re-confirmed here.

**Consequence:** with `I` constant and `H` determined, the only two free axes are `C` and `R`. **The
two-axis design M26 formulated is `C × R`, and it is the entire space currently available.**

---

## 8. The L2 question — evaluated, not run

**Design:** one fixed configuration × many `agentSeed` values. **Correct name, and the source
supports it: a *stochastic-trajectory robustness study*.** It is **not** an initialisation study and
must never be called one.

**Could establish:**
- Whether `τ` at that configuration keeps its **sign** across trajectories.
- If the sign **reverses**: a decisive negative — the C1 direction at that configuration is
  trajectory-dependent, i.e. an artifact of one exploration path.
- The **dispersion** of `τ` across `R` at that configuration.

**Could not establish:**
- Anything about the other 69 C1 configurations — C1 already showed heterogeneity **across
  configurations** (goal 19 phase 1, M20 §4.3), so one configuration may be unrepresentative.
- Anything about **`I`** — it does not vary.
- Anything about mechanism-hood, graph, task, or the M22/M23 architectural obstacles.

**Is it worth a future implementation?** **Yes — but its value is asymmetric, and that asymmetry is
the argument for it.**

> **A reversal would be decisive; a non-reversal would be weak.** At one configuration, stability
> across seeds removes one alternative explanation for **that cell only**. But a reversal would show
> the C1 direction is not a property of the configuration at all. **A cheap, high-power
> falsification attempt with a low-power confirmation is exactly the right shape for a first study**
> — and this program has correctly refused studies with the opposite shape.

**Caveat that must be carried:** trajectory multiplicity is structurally expected (M26), so distinct
`agentSeed` values may yield **bit-identical runs**. The design must fingerprint every run and report
duplicates; otherwise "many seeds" may be far fewer effective trajectories.

---

## 9. The missing axis — explicit statement

> **No legitimate initial-state or experience-history axis currently exists.** This is established by
> source: the only pre-tick state path is `loadBrain` ← `localStorage['brain']`, and frozen §5.4
> requires that store cold, asserted at start, enforced by a throwing assertion. **I have not
> invented one.**

**Which next step follows?** The ruling's four options:

| | Option | Assessment |
|---|---|---|
| **A** | stochastic-trajectory robustness | **RECOMMENDED** — available, cheap, asymmetrically falsifying (§8) |
| **B** | initial-state/history formulation | **blocked** — §5 shows it needs an architecture change *and* a new intended-vs-leaked-state mechanism. Not formulable as a study today |
| **C** | architecture research | **the only route to A2/A3**, and a **Director/governance decision**, not an engineering one. Would have to supersede a frozen clause that exists for a substantive reason |
| **D** | another source-supported direction | **none found.** The readout-seed axis (M25 G2.5) is measurement sensitivity, not effect robustness |

---

# PASS 2 — ADVERSARIAL TEST OF THE TEN CASES

| # | Case | Legitimate axis? | Why |
|---|---|---|---|
| 1 | different `agentSeed`, **identical initial state** | **YES — for trajectory robustness only** | This is the actual situation (M26). Legitimate, correctly named, and insufficient for mechanism claims |
| 2 | different `agentSeed`, **different trajectory** | **YES**, same as 1 | Must be **verified**, not assumed — fingerprints; case 5 of M26 §toys |
| 3 | different `warmStore`, same `agentSeed` | **NO — not even achievable** | `warmStore` writes `'{}'` **after** `loadBrain` has run, then the guard **throws**. It is fault injection (§2.1a) |
| 4 | different memory/history, same configuration | **NO as things stand** | Requires a warm brain ⇒ violates frozen §5.4 |
| 5 | pre-seeded state changing **candidate generation** | **Legitimate in principle; prohibited in practice** | `transitions` feeds `allCandidates` (`main.js:1593`). It would be a real axis — and it changes the pool E6 normalises over, so results would not be comparable to C1 |
| 6 | pre-seeded state changing **only later learning** | **Probably not constructible** | Any store the run reads (`penalties`, `Q`, `transitions`) is **also** read by F1/F2/F3 at decision time. "Later learning only" would need a store that affects updating but not admission; **none was found** |
| 7 | an axis that changes **the oracle** | **NO — illegitimate** | The oracle must be environment-defined. *Note: `loadBrain` restores `goalNeuronId`, but `__M7_GOAL__` overrides it at `main.js:1114`, so the oracle is protected even under a warm brain* |
| 8 | an axis that changes **ARMED/ABLATED exposure** | **NO — illegitimate** | That changes the intervention, not the population. It would be a different experiment wearing the same name |
| 9 | an axis that changes **only readout** | **Legitimate, but a different question** | Measurement sensitivity (M25 G2.5). It asks whether `Δ` depends on readout randomisation — worth knowing, **not** effect robustness |
| 10 | an axis changing **both initial state and trajectory** | **NO as a single axis** | Confounded by construction. It would require factorial separation of `I` and `R` — and `I` is not settable, so the factorial cannot be built |

**Attempt to falsify the M27-HOLD verdict.** The strongest available counter is case 5: *a real
initialisation axis does exist in production code, so HOLD overstates.* **It fails on two grounds.**
First, the frozen protocol forbids it and enforces the prohibition by throwing — "exists in
production" is not "available to a study." Second, §5.1: the prohibition exists to prevent
cross-run contamination, so lifting it requires inventing the intended-vs-leaked distinction.
**Both would have to be resolved before A2 becomes formulable, and neither is an engineering task.**

---

## 10. Evidence → Inference → Hypothesis

**EVIDENCE**
- **Ev-1.** `run.js:222` — `warmStore` writes `'{}'`, **after** `boot()` at `:211`.
- **Ev-2.** `run.js:213–231` — cold-`localStorage` assertion, citing frozen §5.4; throws on violation.
- **Ev-3.** `M7_PREREGISTRATION.md §5.4` — *"Cold `localStorage` per run, asserted at start."*
- **Ev-4.** `main.js:1099` — `loadBrain()` at module top level; restores the learned stores and
  `goalNeuronId`; `rebuildAdjacencyMemory()` at `:1121`.
- **Ev-5.** `main.js:1114` — `__M7_GOAL__` applied **after** `loadBrain`.
- **Ev-6.** `run.js:128–138` — `arms.configure` wires trust behaviour and the prediction-error pin.
- **Ev-7.** `main.js:1593` — `allCandidates` is built from `transitions` ∪ graph neighbours.
- **Ev-8.** Learned stores start empty (`:926`, `:1017`, `:3081`).

**INFERENCE**
- **In-1.** `warmStore` cannot pre-seed state: wrong content, wrong ordering, and the guard throws
  (Ev-1, Ev-2).
- **In-2.** A genuine pre-tick state path exists but is **closed by the frozen protocol** (Ev-3, Ev-4).
- **In-3.** A warm brain would change candidate generation and admission, hence the pool E6
  normalises over (Ev-4, Ev-7).
- **In-4.** The oracle is protected from a warm brain by the ordering at Ev-5.
- **In-5.** M7 arms are a treatment on the trust pathway, not an initialisation (Ev-6).
- **In-6.** `I` is constant, `H` is determined by `(C, R)`; **`C × R` is the entire available design
  space** (Ev-8 + M26).

**HYPOTHESIS**
- **Hy-1.** No further pre-tick state channel exists. A trace found none; that is not proof.
- **Hy-2.** `Δ` is invariant to readout randomisation — carried from M25, **UNKNOWN**.
- **Hy-3.** A harvested-brain axis would be *extraction* rather than *invention*. **Plausible and
  unestablished** — and moot while §5.4 stands.
- **Hy-4.** Trajectory multiplicity is low enough for "many seeds" to mean many trajectories.
  **Not established; M26 argues the opposite direction.**

**No cognitive, planning, intelligence or mechanism-validation claim is made.**

---

## 11. Outcome

> # M27-HOLD
> **No legitimate initial-state or experience-history axis can currently be defined; a deeper
> architecture-level formulation would be required.**

**Not GREEN:** the axis M27 was asked to find does not exist as an available axis (§9).
**Not YELLOW:** this is not an unresolved interpretation — the prohibition is explicit, frozen,
cited in source, and enforced by a throwing assertion. Calling it YELLOW would suggest the question
is open when the source closes it.

### The single highest-value next milestone

> ## M28 — Stochastic-Trajectory Robustness Formulation *(formulation only)*
>
> Formulate — **not run** — the `C × R` design M26 defined and §8 evaluated: the estimand as the
> **distribution** of `τ` across trajectories (never the mean); the `m ≡ 1` and
> distinct-seed-⇒-distinct-trajectory **falsifiable preconditions**, checked by fingerprint; the
> direction convention frozen in advance; and the naming discipline that forbids calling it an
> initialisation study.

**Why this and not architecture research (option C):** C is the only route to `A2`, but it means
superseding a frozen clause that exists to prevent cross-run contamination, and inventing a
mechanism that does not exist (§5.1). **That is a Director and governance decision about the
program's constitution — not something an engineering milestone should initiate.** I am naming it as
the sole route and leaving the decision where it belongs.

**And a caution I want on the record:** M28 would formulate a study over the *only* axes available,
which is not the same as the axes the North Star needs. **`C × R` robustness is worth establishing
and will not, at any `N`, distinguish a reusable mechanism from a property of this substrate.**

**Still outstanding, still untouched:** the `895000–895999` registry-link defect.

---

Believe in yourself and keep going
