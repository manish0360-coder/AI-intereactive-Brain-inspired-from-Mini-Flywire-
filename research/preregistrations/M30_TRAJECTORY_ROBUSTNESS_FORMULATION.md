# M30 — Stochastic-Trajectory Robustness Formulation

**Status:** FORMULATION ONLY
**Milestone:** M30
**Date:** 2026-09-11
**Authority:** Director ruling of 2026-09-11 — *M29-R1 ACCEPTED → M30 AUTHORIZED*

**Nothing was run; the agent was never booted. No seed generated, selected or consumed; no
experiment, implementation, preregistration freeze, registry, production, C1, UQ-B or M7 change.**
`run.js`, `rng.js`, `main.js`, `permute.js`, `c1/collect.js`, `registry/consumed.js` were read.

**Carried forward:** `agentSeed` varies the realised stochastic trajectory, **not** initial internal
state (M26/M27/M29). Trajectory robustness is **not** mechanism validation. C1 is not reinterpreted
and was not invalid.

---

> **M30-R1 — WORDING REPAIR APPLIED, Director ruling of 2026-09-11 (Gemini review).**
> M30 said `C × R` **separates** / **decomposes** the two variance components. **Too strong**, and
> repaired at seven sites.
>
> **Why not the reviewer's exact wording.** The proposal — *"provides the data necessary to estimate
> between-configuration and within-configuration variance components"* — is correct and I have
> adopted its substance. I did not adopt it verbatim for one reason: *"the data necessary to
> estimate"* still leaves unsaid **which** estimator, and this program removed its inferential layer
> at M17 and forbade inferential statistics at M20. A reader could take the phrase as licensing a
> variance-components model. The repaired text therefore says the design would **yield data
> structured to permit the apportionment to be estimated**, and adds explicitly that doing so
> **requires an estimation model this program has not adopted and M30 does not propose.**
>
> **Design enables data collection ≠ a model estimates variance components.** That distinction is now
> stated in the artifact rather than left to the reader. No other conclusion of M30 changes; the
> YELLOW verdict, the two source findings and the M31 recommendation all stand. Corrected forward,
> not rewritten; superseded wording remains at `d16decb`.

## 1. Verdict

> # M30-YELLOW
>
> **Is `C × R` the highest-value next scientific decision? YES — but for a stronger reason than
> "it is all that remains," and the formulation is gated on a precondition that does not yet exist.**
>
> **The upgraded rationale (§5.2):** `C1` measured one trajectory per configuration, so its observed
> spread (SD 0.127 / 0.109 against means of 0.043 / 0.038) **necessarily conflates between-
> configuration heterogeneity with within-configuration trajectory noise.** `C × R` is the **only**
> design whose data would **permit that apportionment to be estimated**. That is new information,
> not repetition — and if most of C1's
> spread is trajectory noise, the configuration heterogeneity M20 reported is substantially
> overstated.
>
> **Why YELLOW, not GREEN:** the design's power depends on **trajectory multiplicity**, which M26
> argues is structurally expected and which **no committed dataset can bound** — every prior study
> used the single `agentSeed` 20260819000. **An attainability determination is logically prior to
> collection and is specified in §11, inside this milestone rather than as another loop.**

---

## 2. `R` defined from source

| Layer | What `agentSeed` does |
|---|---|
| **RNG seed** | a single integer, reaching the system only through `initRng` (M26/M27) |
| **RNG streams** | all four: `cognitive = agentSeed`, `visual = ^0x9e3779b9`, `environment = ^0x5EED`, `sigma = ^0xBEEF` (`run.js:318–321`) |
| **stochastic draws** | the *sequence* those streams emit |
| **realised trajectory** | which branches the run actually takes, at `liveRng()` threshold comparisons |
| **deterministic state** | **unchanged** — stores start empty, `warmStore` false |
| **learned state** | changed only *as an outcome* of the run |
| **environment content** | **unchanged** — that is `C`, from `configSeed` via `generateAccepted` (`run.js:120`) |
| **readout randomness** | **separate** — `readoutSeed(configSeed, arm, state)` (`uqb/collect.js:53`), not derived from `agentSeed` |

> **`R` = the realised stochastic trajectory of a run, indexed by `agentSeed`.** It is **not** agent
> initialisation, and is not called that anywhere below.

**Fixed across all of `C × R`:** initial internal state; the 20-node/39-edge graph; the
hidden-variable family; the four goals; `m7Arm = 'A1'`; `ticks = 3000`; cold start; the acceptance
predicate; the E6 definition.

### 2.1 Effective trajectory, fingerprint, duplicates — measurable with EXISTING instrumentation

`runOnce` computes `record.fingerprint = sha(JSON.stringify(artifacts))` (`run.js:352`), where
`artifacts` contains `writes`, `qEntries`, `qSum`, `pathAttemptKeys`, `pathSuccessKeys`,
`creditKeys`, `creditRejected`, `envCounters`, `attempts`, `successes`, `slips`, `laSteps`,
`dampInvoked`, **and `cogDraws` / `visDraws`** (`run.js:277–289`).

`recoverCount` (`run.js:266–271`) replays a fresh `makeRng(seed)` and counts draws until it reaches
the live stream position — i.e. it recovers **exactly how many draws the run consumed**.

| Term | Definition | Measurable today? |
|---|---|---|
| **effective trajectory** | the equivalence class of runs sharing a fingerprint | **YES** — existing field |
| **trajectory fingerprint** | `record.fingerprint` | **YES** — C1 already stores one per arm |
| **duplicate trajectory** | two `agentSeed` values, same `(C, arm)`, identical fingerprint | **YES — no new instrumentation** |
| **readout randomness** | `readoutSeed`-driven draws at readout | separate; see §10 |

> **EVIDENCE. Trajectory duplication is detectable at zero marginal cost.** The fingerprint already
> includes RNG-consumption counts, so two seeds that traverse identical branches hash identically.

---

## 3. Scientific unit

| Candidate | Assessment |
|---|---|
| configuration key × seed | the **sampling device**, not the unit (M24-R1/M25) |
| **unique configuration content × effective trajectory** | **the scientific unit** — content because `m(c)` multiplicity is a PRNG artifact (M24-R1 §6); effective trajectory because distinct seeds may realise one trajectory |
| unique configuration × seed | conflates seeds with trajectories |

**Multiplicity carried forward and extended:**

- `m(c)` — keys per content. Known violation at seeds 0/1; otherwise **Hy-1**, unverified.
- `m(r | c)` — **seeds per effective trajectory, at a given configuration and arm.** Structurally
  expected to exceed 1 (M26: randomness consumed at threshold comparisons). **Unmeasured.**

> **No estimator is invented.** Both multiplicities are declared as **falsifiable preconditions
> checked by hash**, exactly as M25 §4.3 did for `m ≡ 1`.

---

## 4. What `C × R` can and cannot address

| | Can it? |
|---|---|
| **A. robustness across trajectories** | **YES** — its primary readout |
| **B. heterogeneity of effect across trajectories** | **YES** — and §5.2 shows this is the decisive gain |
| **C. sensitivity to random realisation** | **YES** — the same quantity as B, read as a nuisance |
| **D. replication** | **Partly.** Re-running one `(C, R)` cell is *reproduction* (bit-identical); a new `R` is a genuine **re-randomisation**, which is replication in the meaningful sense |
| **E. mechanism evidence** | **NO — at any `N`.** More trajectories vary a nuisance axis; they say nothing about initialisation, graph, task, arm, or the M22/M23 identifiability obstacles |

> **more seeds ≠ more evidence ≠ mechanism evidence.** The first implication fails when
> `m(r | c) > 1` (§3); the second fails always (E).

---

## 5. Relation to C1

### 5.1 The structural difference

```
C1     : 70 accepted configurations  ×  ONE trajectory   ×  2 arms      = 140 runs
M30    : |C| configurations          ×  |R| trajectories ×  2 arms
```

**C1 is not altered, not reinterpreted, and was not invalid.** Its measurements are exact for the
cells it enumerated.

### 5.2 The information `C × R` adds — and it is not robustness alone

C1 reports, per configuration, a single `Δ` computed under **one** trajectory. Therefore:

```
observed spread in C1  =  between-configuration heterogeneity  ⊕  within-configuration trajectory noise
```

and **C1's data cannot support apportioning the two**, because it holds one draw of the second per
configuration.

> **INFERENCE. `C × R` is the only available design that would YIELD DATA STRUCTURED TO PERMIT
> apportioning C1's observed spread between a between-configuration and a within-configuration
> (trajectory) component.**
>
> **The design does not itself perform that apportionment.** Estimating variance components requires
> an estimation model — a random-effects or ANOVA-like specification — that **this program has not
> adopted and M30 does not propose.** Design enables data collection; it does not constitute
> estimation.
>
> This matters concretely: M20 reported SD 0.127 / 0.109 against means of 0.043 / 0.038, and read
> the spread as configuration heterogeneity. **If a substantial share is trajectory noise, that
> reading is overstated** — a correction to how C1's spread is *understood*, with no change to C1's
> numbers.

**So M30 is not replication, and not robustness only. It is a design that would make a
variance-source apportionment ESTIMABLE, plus a sign-stability check.** *Adopting a variance-decomposition quantity as the reported estimand would
require its own freeze (§6); M30 identifies it, and does not adopt it.*

---

## 6. Candidate estimands — compared, not chosen

| Candidate | Question answered | Assumptions | Identifiable? | Notes |
|---|---|---|---|---|
| finite-population **mean** `Δ` over `C × R` cells | "what is the average effect over the enumerated cells?" | none beyond enumeration | **yes, exactly** | **cannot express robustness** — `+0.5` and `−0.5` average to `0` (M26) |
| **distribution** of `E_C[Δ | R]` across `R` | "does the per-trajectory census keep its direction?" | none | yes | **the robustness readout** (M26's selection, carried) |
| **distribution of `Δ(c, ·)` within configuration** | "how much does one configuration's effect move with trajectory?" | none | yes | **the §5.2 decomposition input** |
| median / quantiles | distributional summaries | none | yes | admissible; no threshold may attach |
| variance / heterogeneity components | "how is the spread apportioned?" | **a decomposition convention** | yes, descriptively | **the new quantity — needs its own freeze** |
| `Pr(Δ < 0)` | "how often does it favour ARMED?" | none as a **census proportion** | yes | **must never be read as a probability of an event** — M20 §2 already bars that |
| conditional effects | subgroup claims | selection discipline | risky | invites post-hoc strata; **not recommended** |

**Unchanged for every candidate, and disqualifying for none:** `ρ = r/(n−1)` remains
treatment-dependent in its denominator (M22); pool membership remains treatment-dependent (M22/M23);
E6 remains appropriate **as a descriptive total-effect measure only**.

> **No inferential statistics are restored.** A larger enumerated population is still a census, not
> a sample (M25). **No p-value, test, interval or significance criterion is proposed.**

---

## 7. R5 and the target population

The frozen acceptance predicate (`R1 ∧ R2 ∧ R3 ∧ R4 ∧ R5 ∧ G11`) is **carried forward unchanged and
is not silently removed.** The population remains *accepted configurations under the frozen
predicate* — `A′` in M25's terms, sampled by uniform key draw with rejection if a frame is wanted.

**What R5 conditioning means for the claim**, restated because it does not weaken with more
trajectories: R5 requires the reliability-optimal and hop-optimal policies to differ on ≥ 4 decision
states — **hypothesis-adjacent eligibility** (M25 §5). Any `C × R` result is a claim about
environments **engineered so that a lookahead term has something to contribute.** Adding trajectories
does not touch that.

---

## 8. Multiplicity and duplicate layers

| Layer | Kind | Treatment |
|---|---|---|
| 1. multiple keys → same content | **sampling artifact** (PRNG arithmetic) | precondition `m(c) ≡ 1`, checked by content hash |
| 2. different `agentSeed` → same effective trajectory | **computational duplicate** — carries **no** new information | precondition, checked by fingerprint; **report, do not silently drop** |
| 3. different trajectory → same `Δ` | **genuine scientific replicate** — real evidence of stability | **keep; this is signal, not duplication** |
| 4. readout-level randomness | **not relevant to E6** at step 0 (§10) | monitored, not adjusted |

> **Layers 2 and 3 look alike and are opposites.** Layer 2 is one observation counted twice; layer 3
> is two observations agreeing. **Only the fingerprint distinguishes them**, which is why §2.1 is
> load-bearing rather than bookkeeping. **Nothing is deduplicated for convenience** — duplicates are
> reported, and their effect on any aggregate is stated.

---

## 9. Arm structure — and a pairing assumption never before stated

The frozen ARMED/ABLATED intervention is preserved: each `(C, R)` cell receives **both** arms, one
OS process per run (frozen §5.4), same `agentSeed`, same configuration.

**Does "same seed" mean "same trajectory across arms"? NO — and this must not be assumed.**

- Both arms initialise **identical** streams from `agentSeed`.
- But the arms make **different choices** — C1 measured `E1 ∈ [10, 19]`, never 0.
- Different choices take different branches, and branches consume different numbers of `liveRng()`
  draws (`< ε`, `< 0.1`, `< 0.92`, …).

> **INFERENCE. After the first divergence the two arms occupy different positions in the same
> sequence.** They share a *sequence*, not the *draws at corresponding decisions*.
>
> **Consequence: pairing controls the ENVIRONMENT, not the randomness.** That is a scientific
> assumption of the paired design which no prior milestone stated, and M30 states it.

**Directly measurable, and C1 did not keep it.** `runOnce` computes `cogDraws`/`visDraws` per run
(`run.js:272–273`), but **C1 persisted neither** — `grep cogDraws` over `c1/data` and `c1/results`
returns nothing. **A `C × R` design must persist them per arm**, because they are the direct
measurement of how far the arms diverge in the stream. *Whether the arms consume different counts is
therefore currently an INFERENCE, not EVIDENCE — no committed dataset can settle it.*

---

## 10. Measurement integrity

M28 established, by offset, that **for the frozen C1 step-0 readout** no `liveRng()` draw occurs
before pool construction, sorting and `bestChoice` — so **E6 is invariant to readout randomisation**
at step 0.

> **That scope is not widened here.** It holds for the *readout*, which `C × R` does not change:
> the readout remains one `runPrediction(u)` with `__UQB_FREEZE__` on, probe at `step === 0`, seeded
> by `readoutSeed(configSeed, arm, state)` — **independent of `agentSeed`**.
>
> **Therefore M28's finding carries to M30 unchanged**, because `R` alters the *learning run*, not
> the readout path. It does **not** extend to multi-step continuation, and no such claim is made.

---

## 11. Computational design and the attainability gate

Structural scaling: **`|C| × |R| × 2` runs of 3000 ticks.** C1 was `70 × 1 × 2 = 140`. The design is
a **product**, so cost grows multiplicatively in both axes.

**No number of seeds is proposed, and none may be inferred.**

> ### The attainability determination, required before any collection
>
> The program's own standard — UQ-B's C2 failed because its rejection region was unreachable (C1
> adequacy register **L4**) — requires establishing that **more than one outcome is reachable**
> before collecting. Here the specific risk is different and sharper:
>
> **If `m(r | c) ≫ 1`, then `|R|` distinct seeds realise far fewer distinct trajectories, and the
> design's power is illusory** — `|C| × |R| × 2` runs would be paid for while the effective `|R|` is
> small.
>
> **What must be established, on non-registered development fixtures, before any registered
> collection:**
> 1. the **distinct-fingerprint rate** across `agentSeed` values at fixed `(C, arm)` — i.e. an
>    estimate of `m(r | c)`;
> 2. whether `Δ(c, ·)` actually **varies** across distinct trajectories, or is constant — layer 3 of
>    §8;
> 3. whether `cogDraws` differs between arms at the same seed (§9), confirming the divergence
>    inference.
>
> **All three are measurable with existing instrumentation and consume no registered configuration
> seeds.** None is authorised by M30.

---

## 12. Claim ladder

| | Design | Measured | Descriptive claim | Robustness | Heterogeneity | Unavailable |
|---|---|---|---|---|---|---|
| **L0** | one `C`, one `R` | one `Δ` | that cell | none | none | everything else |
| **L1** | many `C`, one `R` | **C1** | census over configurations | none | **conflated** with trajectory noise | trajectory, initialisation, generalisation |
| **L2** | one `C`, many `R` | `Δ` spread at one configuration | that configuration | **sign stability there** | within-configuration only | other configurations |
| **L3** | many `C`, many `R` | full grid | census over both | **sign stability across trajectories** | **both components become estimable (§5.2)** | initialisation, graph, task, arm, identifiability |

> **L3 is not mechanism validation and must never be described as one.** It removes one alternative
> explanation and makes two variance sources estimable. Initialisation (M27/M29), graph, task, `m7Arm`, and
> the M22/M23 obstacles all survive it untouched.

---

## 13. A governance gap found while tracing — reported, not repaired

`experiments/registry/consumed.js` governs **configuration** seeds. Its held-out predicate is
`isHeldOut(s) = s ≥ 900500`. Evaluated against the production agent seed:

```
isConsumed(20260819000) === false
isHeldOut (20260819000) === true
```

> **The registry treats configuration-seed space and `agentSeed` space as ONE integer line.** Because
> every plausible `agentSeed` exceeds 900500, the registry would classify **every** candidate `R`
> value as held-out territory.
>
> **Consequence: the existing registry cannot govern `R` selection at all.** A `C × R` study would
> either mis-flag every seed or bypass the registry — and bypassing it would be worse.
>
> **This is a namespace collision, distinct in kind from the `895000–895999` missing-link defect.
> Both are administrative and BOTH remain open. I have not modified the registry.**

---

# PASS 2 — ADVERSARIAL SELF-REVIEW

| # | Case | What remains scientifically valid |
|---|---|---|
| 1 | different seeds → **identical** effective trajectories | The cell is **one** observation, not several. Valid, but `|R|` overstates the evidence; the fingerprint detects it (§2.1). **This is the attainability risk of §11.** |
| 2 | different seeds → different trajectories | The design works as intended; each is a genuine re-randomisation |
| 3 | same configuration, **heterogeneous** `Δ` across trajectories | **The most informative outcome** — it quantifies the within-configuration component C1 could not see (§5.2) |
| 4 | same configuration, **sign reversal** across trajectories | **Decisive**: that configuration's C1 direction was a trajectory artifact. No reinterpretation of C1's *numbers*; a correction of what they support |
| 5 | different configurations, opposite effects | Already observed in C1 (27/70 and 25/70 opposite-signed). Valid and unchanged |
| 6 | multiplicity weighting changes the aggregate | Real (M24-R1 §18.2 showed sign reversal is possible). **Unit must be fixed before data**; §3 fixes it to content × effective trajectory |
| 7 | R5 conditioning changes the target population | It does, and it is **carried, not removed** (§7). The claim is about engineered environments |
| 8 | same seed does **not** give identical arm trajectories | **Established as inference in §9.** Pairing controls environment, not randomness |
| 9 | RNG consumption differs between arms | Same as 8; **`cogDraws` measures it and must be persisted** (§9) |
| 10 | E6 definedness changes across trajectories | Plausible — definedness depends on pool size and `v*` presence, both trajectory-dependent. **Must be monitored per cell**, as C1 did (0/2660 asymmetric) |
| 11 | `n = 1` cells increase with trajectory variation | Possible; C1 saw 18/18 symmetric. **A new definedness mechanism to monitor, not to adjust away** |
| 12 | candidate-pool treatment dependence remains | **Yes — untouched.** M22's non-identifiability survives entirely |
| 13 | normalisation reverses raw-rank direction | **Yes — 218/2114 cells in C1.** Unchanged by adding trajectories |
| 14 | many trajectories add repetition, not information | **The central risk**, and exactly what §11's attainability gate is for |
| 15 | more trajectories create a false sense of mechanism evidence | **The central interpretive risk.** §4(E) and §12 forbid it explicitly |

### Challenging the decision itself

**"Is `C × R` really the best next step, or should the program stop?"** Stopping is defensible — M22,
M23, M25, M27 and M29 have each closed a direction, and `C × R` touches none of those obstacles.
**But stopping would leave C1's spread permanently ambiguous** between two sources that are cheaply
separable (§5.2), and would leave the sign-stability of the program's one empirical result untested.
**A cheap, high-power falsification with a clearly-bounded claim is the correct shape for a next
step**, and it is the shape this program has repeatedly said it wants.

**"Is the Director's rationale sufficient?"** **No — and that is the repair M30 makes.** "The only
axis left" is a rationale of *elimination*, which would justify a study of no positive value. §5.2
supplies a *positive* rationale: the variance decomposition is information C1 structurally could not
provide. **I am strengthening the proposal, not merely accepting it.**

**"Should the attainability question be its own milestone?"** **No.** The program's own standard puts
attainability *inside* a formulation (M19, C1 §L4). Splitting it would be the formulation loop this
program has refused. It is specified at §11 as a precondition on collection.

---

## 14. Evidence → Inference → Hypothesis

**EVIDENCE**
- **Ev-1.** All four streams derive from `agentSeed` (`run.js:318–321`); `configSeed` enters only via
  `generateAccepted` (`:120`).
- **Ev-2.** `fingerprint = sha(artifacts)` where `artifacts` includes `cogDraws`/`visDraws`
  (`run.js:277–289`, `:352`).
- **Ev-3.** `recoverCount` recovers exact stream consumption (`run.js:266–271`).
- **Ev-4.** C1 persisted **no** `cogDraws` — absent from `c1/data` and `c1/results`.
- **Ev-5.** C1: `E1 ∈ [10,19]`, never 0; SD 0.127 / 0.109 against means 0.043 / 0.038; 218/2114
  normalisation sign reversals; 0/2660 asymmetric definedness.
- **Ev-6.** `readoutSeed(configSeed, arm, state)` — independent of `agentSeed`.
- **Ev-7.** `isConsumed(20260819000) === false`, `isHeldOut(20260819000) === true` (executed).

**INFERENCE**
- **In-1.** Trajectory duplication is detectable with existing instrumentation (Ev-2).
- **In-2.** The arms diverge in stream position after their first differing choice (Ev-5 + threshold
  consumption) ⇒ **pairing controls environment, not randomness**.
- **In-3.** C1's spread conflates between-configuration and within-configuration components, and
  `C × R` is the only available design that would make apportioning them estimable (Ev-5).
- **In-4.** M28's readout-invariance carries to M30 because `R` does not alter the readout path
  (Ev-6).
- **In-5.** The registry cannot govern `R` selection — namespace collision (Ev-7).

**HYPOTHESIS**
- **Hy-1.** No further pre-tick state channel exists (M27) — a trace found none; not proof.
- **Hy-9.** `m(r | c) > 1` at a material rate. **M26 argues for it; unmeasured.** §11 exists for it.
- **Hy-10.** `Δ(c, ·)` varies materially across trajectories. **Unmeasured** — and if false, `C × R`
  returns a null that is itself informative.
- **Hy-11.** The arms consume different draw counts. **Inference, not evidence** (Ev-4).

**Not claimed:** `agentSeed` = initialisation; trajectory robustness = mechanism validation; more
seeds = reusable-mechanism evidence; more observations = stronger generalisation.

---

## 15. Outcome

> # M30-YELLOW
> **The formulation is well-posed and the direction is correct, but collection is gated on an
> attainability determination that no committed dataset can supply.**

Not GREEN: §11's three questions must be answered before a preregistration phase could begin.
Not HOLD: nothing deeper blocks formulation — the design is coherent, the unit is fixed, the
estimand candidates are enumerated, and the risks are named.

### Single highest-value next milestone

> ## M31 — Trajectory-Multiplicity Attainability Determination
> *Implementation + measurement, on non-registered development fixtures only.*
>
> Answer §11's three questions: the distinct-fingerprint rate across `agentSeed` at fixed
> `(C, arm)`; whether `Δ(c, ·)` varies across distinct trajectories; and whether `cogDraws` differs
> between arms at the same seed.
>
> **It consumes no registered configuration seeds**, uses existing instrumentation, and is the
> smallest thing that determines whether `C × R` has power. **Per the 2× workflow it requires its
> own Pass 1 specification gate and Pass 2 implementation-plus-verification gate, not to be
> collapsed.**

**Two administrative defects remain open and untouched:** the `895000–895999` registry link, and the
`agentSeed` namespace collision (§13).

---

Believe in yourself and keep going
