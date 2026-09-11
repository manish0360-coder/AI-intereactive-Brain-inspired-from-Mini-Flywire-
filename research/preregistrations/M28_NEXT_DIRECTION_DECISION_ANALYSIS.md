# M28 — Next-Direction Decision Analysis

**Status:** FORMULATION / DECISION ANALYSIS ONLY
**Milestone:** M28
**Date:** 2026-09-11
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-09-11 — *M27 ACCEPTED WITH SPECIFIC REPAIR → M28 AUTHORIZED*

**Nothing was run; the agent was never booted. No seed generated, selected or consumed; no
experiment; no preregistration, registry, production, C1/UQ-B or frozen M7 governance change.**
`main.js`, `run.js`, `uqb/collect.js` and `c1/collect.js` were **read**.

**Carried forward, unchanged:** `agentSeed` varies stochastic trajectory, not initial internal state
(M26). Trajectory robustness would not establish that `futureScore` is a reusable cognitive
mechanism (M26/M27). The initial-state channel exists via `loadBrain` but is closed by frozen M7
§5.4, for a substantive reason (M27).

---

> **CORRECTED IN PART by M29 (2026-09-11).** Two statements below are retracted:
> **(i)** the claim that frozen §5.4 is *"broader than its stated purpose"* was **TOO STRONG** — the
> cold-start clause also secures **attributability** of learned state to the measured exposure, which
> the frozen UQ-B estimand ("continuous presence") requires. M29 §7 retracts it and withdraws the
> implicit suggestion that a "smallest possible refinement" was in view.
> **(ii)** the burn-in baseline candidate of §5 is **REJECTED** — `makeGuard` admits only ARMED and
> ABLATED and throws otherwise, and the guard-off default is ARMED-equivalent, so **no
> treatment-neutral baseline can be generated**; and `saveBrain` omits `timeMemory`, so a
> round-tripped baseline is a reconstruction rather than a copy.
> The **B → A ordering recommendation stands and was vindicated**: B resolved negatively at zero
> compute, which is exactly why it was sequenced first. See
> `M29_BASELINE_FORMULATION_AUDIT.md`. Corrected forward, not rewritten.

## 1. Verdict and recommendation

> # M28-YELLOW
>
> **A useful direction exists, and it is NOT the Director's option A.**
>
> **Recommendation: option C — staged — with the ordering specified as B → A.** The ruling listed C
> as "a staged combination" without an order; **the order is the whole decision**, and B must come
> first.
>
> **Is the Director's option A the best next decision? No.** Not because A is wrong — it is a
> legitimate study — but because **A merely adds robustness information at a level already reached,
> while B either unlocks a new level of evidence or closes it permanently, and B completes inside a
> formulation milestone at zero compute cost.**

**Also delivered here, at no cost: M25's Hy-2 is RESOLVED from source (§2).** That closes the G2.5
rung and removes a live doubt about C1's measurement, and it is reported now rather than queued.

---

## 2. A finding delivered before the comparison: Hy-2 is resolved

M25 raised, and M26/M27 carried, **Hy-2: whether `Δ` is invariant to readout randomisation —
UNKNOWN.** It mattered because `readoutSeed` is **arm-dependent by construction**
(`uqb/collect.js:53`):

```
readoutSeed(configSeed, arm, state) =
    ((configSeed*1000003) ^ (arm === 'ARMED' ? 0x5bf03635 : 0x27d4eb2f) ^ (state*2654435761)) >>> 0
```

If the readout consumed randomness before the measurement, ARMED and ABLATED would differ in
**measurement noise supplied by the instrument** — a confound added by the apparatus itself.

**Traced by offset inside `runPrediction`:**

| | offset |
|---|---|
| `runPrediction` begins | 40959 |
| last `choices.push(...)` — the pool is complete | **66638** |
| first `liveRng()` — the ε-greedy line | **69798** |
| `const sorted = choices.sort(...)` | 69921 |
| `const bestChoice = sorted[0]` | 70072 |
| **`liveRng` draws between function start and the first ε draw** | **0** |

> **EVIDENCE. Zero randomness is consumed before the candidate pool and its weights are complete.**
> The draws at 69798/69801 populate only `exploreChoice`, a separate variable; the source states the
> selection point, pool, distribution and draw order are unchanged and only the *use* of the chosen
> action differs. `bestChoice` is `sorted[0]` of a weight-sorted array whose contents and weights
> were fixed before any draw.
>
> **INFERENCE. E6 — the rank of `v*` within the pool by weight — is INVARIANT to readout
> randomisation at step 0.** Hy-2 is resolved in the favourable direction, and M25's rung **G2.5 is
> closed without an experiment.**

**Scope, stated honestly:** this covers the C1 readout — one `runPrediction(u)` with
`__UQB_FREEZE__` on, probe captured at `step === 0`. It does **not** claim invariance for
multi-step continuation, where `exploreChoice` does change the executed action.

---

# PASS 1 — THE OPTIONS COMPARED

## 3.1 Option A — stochastic-trajectory robustness over C × R

| | |
|---|---|
| **Question** | Does the direction of the measured contrast survive changing the exploration path? |
| **Scientific unit** | configuration **content**; sampling device `(key, agentSeed)` |
| **Varying axis** | `R` — which pseudo-random sequence the learning run consumes |
| **Fixed** | `I` (constant, asserted cold), graph (20/39), four goals, `m7Arm = 'A1'`, acceptance predicate, ticks, the E6 definition |
| **Could establish** | that the C1 direction is, or is not, an artifact of one exploration path |
| **Could NOT establish** | mechanism-hood; initialisation robustness; graph or task generality; anything M22/M23 block |
| **Causal risk** | low — `R` is pre-treatment in time and does not touch the intervention |
| **Measurement risk** | **low, and lower than believed**: §2 removes the readout confound |
| **Sampling-frame risk** | **trajectory multiplicity** (M26) — distinct seeds may yield bit-identical runs; measurable via fingerprints |
| **Architectural risk** | none — changes one parameter of an existing harness |
| **Scientific value** | **falsification power**, asymmetric: reversal decisive, stability weak |
| **Complexity** | **low to formulate, multiplicative to run** — `|contents| × |seeds| × 2` runs of 3000 ticks |
| **New level, or robustness only?** | **ROBUSTNESS ONLY.** It stays at the level C1 already reached |

## 3.2 Option B — a cold-start-preserving initial-state formulation

| | |
|---|---|
| **Question** | Is there a formulation admitting controlled initial-state/history variation that **preserves** the purpose of frozen §5.4? |
| **Scientific unit** | `(content, baseline-state)` |
| **Varying axis** | `I` — the learned state present at tick 0 |
| **Fixed** | graph, tasks, arm, acceptance; `R` held or crossed |
| **Could establish** | whether the design space can extend beyond `C × R` **at all** — i.e. whether the program's ceiling is structural or governance-shaped |
| **Could NOT establish** | any empirical result — **B is analysis, not measurement** |
| **Causal risk** | **the central one**: a per-arm baseline would confound treatment with starting state (§4.2 rejects it) |
| **Measurement risk** | a warm baseline changes candidate generation ⇒ results not comparable to C1 (M27) |
| **Sampling-frame risk** | a baseline is itself produced by `(content, agentSeed, ticks)` — a whole sub-design needing its own frame |
| **Architectural risk** | **highest** — any adoption requires a Director ruling on §5.4 |
| **Scientific value** | **unlocks a new level, or closes it permanently.** Either outcome is decisive |
| **Complexity** | formulation only; **zero compute** |
| **New level, or robustness only?** | **POTENTIALLY A NEW LEVEL** |

## 3.3 Option C — staged

Two orderings, and they are not equivalent.

| Ordering | Consequence |
|---|---|
| **A → B** | A is specified and run over `C × R`. If B later succeeds, **A was designed over the wrong space** and would need redoing over `C × R × I` |
| **B → A** | B completes as analysis. If it closes, A is specified knowing `C × R` is final. If it opens, A is specified over the correct space **the first time** |

> **B → A dominates.** B's outcome changes what A should be; A's outcome does not change what B
> should be. **Only the B-first ordering has option value, and B costs no compute to obtain it.**

## 3.4 Option D — alternatives considered and rejected

| Candidate | Why rejected |
|---|---|
| **Resolve Hy-2 (readout invariance)** | **Not rejected — delivered in §2 of this memo.** It was a finding, not a milestone |
| **General identifiability survey** — "is *any* mechanism-level estimand identifiable here?" | Genuinely the deepest question, but M22 and M23 already answered the two concrete instances, and the general form is open-ended with no defined success condition. It would risk the formulation loop the program has repeatedly refused |
| **Expand to a second graph / task family** | No environment or task **family** is defined (M25 §P5). Not a population; premature |
| **Do nothing / close the program line** | Defensible, and I am not recommending it — **B is cheap and decisive**, so at least one question remains worth resolving |

---

# PASS 1 — C × R, ANALYSED PRECISELY

**`R` is not "agent initialisation" and is not called that anywhere here.**

| Question | Answer |
|---|---|
| What does `agentSeed` change? | Which pseudo-random sequence the learning run consumes — all four streams derive from it (`run.js:318–321`) |
| What stays identical? | **The entire initial internal state** — stores empty, `warmStore` false, cold asserted (M26/M27) |
| Can trajectories collide? | **Yes, structurally expected** — randomness is consumed at threshold comparisons, so distinct seeds on the same side of every threshold give a bit-identical run (M26) |
| Are duplicates measurable? | **Yes, free** — `runOnce` records a run fingerprint; C1 stores `fingerprintArmed` / `fingerprintAblated` |
| Is readout randomness separate? | **Yes — and now shown not to matter for E6** (§2) |
| Is `C × R` a meaningful population? | It is a **well-defined** population over (content, trajectory). `R` carries **no substantive meaning** — it is a nuisance label |
| Robustness, heterogeneity, or other? | **A robustness study, whose readout is heterogeneity across a nuisance axis.** Not a mechanism study |

### Estimand

| Candidate | Verdict |
|---|---|
| mean treatment contrast over `R` | **Rejected.** The mean cannot distinguish a true null from a sign-reversing effect — `+0.5` and `−0.5` average to exactly `0` (M26 toy 8) |
| conditional contrast `τ | R = r` | the per-cell quantity; exact, but not itself the answer |
| **distribution of `E_C[τ | R]` across `R`, with sign-stability as the primary readout** | **SELECTED** |
| effect heterogeneity as a variance | a summary *of* that distribution; may be reported, **never as the primary claim**, and with no threshold |

> Selected because robustness **is** a statement about dispersion and sign-stability. Direction must
> be frozen in advance, as C1 §2 froze `Δ`'s. **No dispersion threshold is proposed and none may be
> inferred.**

---

# PASS 1 — COLD-START ANALYSIS

**I do not propose removing or weakening frozen §5.4, and nothing below does.**

§5.4's stated purpose, from the frozen text itself: one OS process per run, because `main.js` has
top-level side effects and ESM caching returns the cached instance — so sharing a store *"would
silently share learned state across arms."*

> **The hazard named is SILENT, UNDECLARED sharing across arms.** That is the property to preserve.

| Candidate formulation | Preserves arm independence? | Assessment |
|---|---|---|
| **Immutable baseline snapshot + explicit initialised state** | **YES** — identical state into both arms | Clean in principle; needs declared provenance |
| **Cloned pre-seeded state** | **YES**, if cloned from one source into both arms | Equivalent to the above |
| **Provenance-tagged state** | neutral on its own | **Necessary**, not sufficient — it supplies exactly the intended-vs-leaked distinction M27 identified as missing |
| **Independent per-arm initialised state** | **NO** | **REJECTED.** Different starting states per arm confound treatment with baseline. This is the design §5.4 exists to prevent |
| **State generated BEFORE treatment assignment** | **YES** | **The key candidate.** A common pre-treatment baseline is a shared covariate, exactly as the configuration is |
| **State from an independent seed** | neutral | Helps provenance and framing; does not by itself address arm independence |

### The finding

> **A scientifically clean formulation appears to exist: a burn-in baseline produced *before*
> treatment assignment, snapshotted immutably, provenance-tagged, and loaded IDENTICALLY into both
> arms.** It creates no silent cross-arm sharing — the state is common, declared, and pre-treatment.
>
> **But it violates the LETTER of §5.4**, which requires cold `localStorage` asserted at start,
> regardless of provenance. So §5.4 is **broader than its stated purpose**: it forbids a class of
> designs that do not create the hazard it names.
>
> **Whether to refine §5.4 to express its purpose — rather than weaken it — is a Director and
> governance decision. I am not proposing it, and M28 changes nothing.**

**Three limitations that survive even the clean formulation, and must not be lost:**

1. **It changes the scientific object.** A warm baseline changes `transitions`/`penalties`/`Q`,
   therefore candidate generation and F1/F2 admission, therefore the pool E6 normalises over.
   **Results would not be comparable to C1** (M27).
2. **The baseline needs its own sampling frame.** A burn-in state is a function of
   `(content, agentSeed, ticks)`; "which baseline?" becomes a population question of its own.
3. **It does not touch M22/M23.** Non-identifiability of the pathway decomposition and the shared
   `penalties` cause are architectural and survive any baseline design.

---

# PASS 1 — INFORMATION VALUE

> *"More stochastic trajectories" versus "new initial-state/history variation" — which attacks the
> largest remaining uncertainty?*

| | What is uncertain | Size of the uncertainty |
|---|---|---|
| **More trajectories (A)** | whether the C1 direction is stable across exploration paths | **Bounded.** One alternative explanation, on a quantity M22/M23 established is not decomposable or attributable. A stable answer leaves the interpretive position unchanged |
| **Initial-state variation (B)** | whether the program's evidential ceiling is **structural** or merely **governance-shaped** | **Larger, and structural.** It determines whether `C × R` is the permanent ceiling |

**A's honest strength, stated fairly:** a *reversal* under A would be decisive and would close the
C1 line. That is real falsification power, and it is the best argument for A.

**Why it still loses the ordering:** A's decisive outcome is only obtainable by **running** an
expensive product design. **B's decisive outcome is obtainable by analysis, now.** Resolving the
cheaper decisive question first is the ordinary discipline, and it is also the discipline this
program has applied in every milestone since M20.

> **I am not preferring B because it is more complex. I am preferring it because it is CHEAPER to
> resolve and its answer changes what A should be.**

---

# PASS 2 — ADVERSARIAL SELF-REVIEW

**1. Is `C × R` a new scientific axis, or merely repeated stochastic runs?**
**Attack largely lands.** `R` is a nuisance label with no substantive content. `C × R` is a
*legitimate* population but adds no new **level** of evidence — it re-measures the same estimand
under a re-randomised nuisance. **This is the core reason A is not the best next decision.**

**2. Can repeated trajectories separate mechanism from substrate idiosyncrasy?**
**No — attack lands completely.** Every trajectory shares the same initial state, graph, task set
and arm. Repetition over `R` cannot distinguish a mechanism from a property of *this substrate*, at
any `N`. Asserting otherwise would be the "more seeds = mechanism evidence" error the ruling forbids.

**3. Would a controlled initial-state axis accidentally introduce a new mechanism?**
**Partially lands, and it is the sharpest objection to B.** A **hand-authored** baseline would be
invention — a state no experience produces — and would violate *"architecture grows by extraction,
not speculation."* A baseline **harvested from a real burn-in** is extraction. **B's formulation must
therefore forbid synthetic baselines outright**, and §5's candidate does, by requiring the baseline
to be *generated*, not authored.

**4. Does pre-seeding change candidate generation, and therefore the object?**
**Lands, and is conceded in §5.** `transitions` feeds `allCandidates`; `penalties`/`Q` feed F1/F2. A
warm baseline changes the pool E6 normalises over. **Any B-derived study measures a different
object than C1 and must never be pooled with it.**

**5. Is §5.4 a measurement safeguard or a deeper scientific constraint?**
**The decisive question, and the frozen text answers it.** Its stated reason is *silent* sharing of
learned state across arms via process/ESM caching — **a contamination safeguard**. It is not a claim
that cold starts are scientifically necessary. **That is precisely why a refinement, rather than a
weakening, is conceivable — and precisely why the decision is the Director's, not mine.**

**6. Does R5 oracle-dependent eligibility survive the new design?**
**It survives, and so does its problem.** Acceptance conditions on the oracle disagreeing with the
naive policy on ≥ 4 states — hypothesis-adjacent eligibility (M25 §5). **Unchanged by either option,
and inherited by both.**

**7. Does key/content multiplicity remain relevant?**
**Yes, and under A it compounds.** Content multiplicity `m(c)` persists (M24-R1), and `R` adds
trajectory multiplicity that M26 argues is **larger**. Under B, a third multiplicity would appear:
distinct burn-ins yielding identical baselines.

**8. Is fixed graph/task structure still limiting?**
**Yes, under every option.** One 20-node/39-edge graph, four goal instances, one M7 arm. **Neither A
nor B touches this**, and no option should be described as approaching transfer.

**9. Does a second axis create computational explosion without proportional value?**
**Lands against A specifically.** A is a product design: `|contents| × |seeds| × 2` runs of 3000
ticks. C1 was 140 runs at one seed value. **Multiplying compute to re-measure a non-decomposable
quantity under a nuisance axis is exactly the trade the ruling warns against** — and it is a second
independent reason to resolve B first, since B may change what gets multiplied.

### Falsifying my own recommendation

**The strongest counter: "B will just return HOLD again, like M27, so it is a wasted milestone."**
**It fails**, and §5 is the reason: M27 asked whether a legitimate axis *exists today* and found it
prohibited. B asks whether one can be *formulated* preserving the prohibition's purpose — a design
question with a **concrete target** M27 supplied (the intended-vs-leaked distinction). §5 already
shows a candidate that meets it. **B will return a substantive answer, not a repeat.**

**Second counter: "a reversal under A would moot B entirely, so A first is cheaper in expectation."**
**Partially lands.** If A falsified C1's direction, B's value would drop sharply. But A's answer
requires the expensive run, whereas **B's requires none** — so B-first is cheaper in *every* branch,
not merely in expectation.

---

# EVIDENCE → INFERENCE → HYPOTHESIS

**EVIDENCE**
- **Ev-1.** In `runPrediction`: pool complete at offset 66638; first `liveRng` at 69798; sort at
  69921; `bestChoice` at 70072; **zero draws between function start and the first ε draw**.
- **Ev-2.** `readoutSeed` is arm-dependent (`uqb/collect.js:53–54`).
- **Ev-3.** Frozen §5.4's stated reason is that sharing a store *"would silently share learned state
  across arms."*
- **Ev-4.** `transitions` feeds `allCandidates`; `penalties`/`Q` feed F1/F2 (`main.js:1593`, `:1610`,
  `:1620`).
- **Ev-5.** All four learning streams derive from `agentSeed` (`run.js:318–321`).
- **Ev-6.** `runOnce` records run fingerprints; C1 stores them per configuration.

**INFERENCE**
- **In-1.** E6 is invariant to readout randomisation at step 0 ⇒ **Hy-2 resolved; G2.5 closed**
  (Ev-1, Ev-2).
- **In-2.** `R` is a nuisance axis; `C × R` adds robustness information, not a new evidential level
  (Ev-5).
- **In-3.** §5.4's hazard is *silent, undeclared* cross-arm sharing; a common, declared, pre-treatment
  baseline does not create it (Ev-3).
- **In-4.** Any warm baseline changes the pool E6 normalises over ⇒ not comparable to C1 (Ev-4).
- **In-5.** B-first dominates A-first, because B's outcome changes A's design and B costs no compute.

**HYPOTHESIS**
- **Hy-1.** No further pre-tick state channel exists (M27) — a trace found none; not proof.
- **Hy-3.** Trajectory multiplicity is low enough for "many seeds" to mean many trajectories. **Not
  established; M26 argues the opposite.**
- **Hy-5.** A harvested burn-in baseline is *extraction* rather than *invention*. **Plausible;
  unestablished; and it is exactly what B must adjudicate.**
- **Hy-6.** That a §5.4 refinement preserving the purpose is acceptable to the program's
  constitution. **A governance question, not an engineering one, and not assumed here.**

**Not claimed anywhere:** `agentSeed` = initialisation; trajectory robustness = mechanism
validation; more seeds = reusable-mechanism evidence; removing cold-start is acceptable; pre-seeding
is automatically legitimate.

---

# M28 OUTCOME

> # M28-YELLOW
> **A useful direction exists — option C, staged, ordered B → A — but the consequential formulation
> question (does a cold-start-preserving initial-state formulation actually survive scrutiny?) is
> exactly what the next milestone must resolve.**

Not GREEN: neither option is ready for implementation design — A awaits B's outcome, and B is
analysis. Not HOLD: a defensible next direction exists, and §5 already exhibits a candidate.

## Single highest-value next milestone

> ## M29 — Cold-Start-Preserving Baseline Formulation *(formulation only)*
>
> Adjudicate the §5 candidate: a burn-in baseline produced **before treatment assignment**,
> snapshotted immutably, **provenance-tagged**, and loaded **identically into both arms**.
>
> It must determine: whether arm independence is genuinely preserved; whether synthetic baselines
> can be forbidden in a checkable way (PASS 2 §3); what sampling frame the baseline itself would
> need (§5 limitation 2); that any resulting study measures a **different object** than C1 and may
> never be pooled with it (§5 limitation 1); and **exactly which frozen clause would have to be
> refined, leaving that decision to the Director.**
>
> **It must not modify frozen M7 governance, propose weakening §5.4, or authorise any experiment.**

**If M29 closes the question**, then `C × R` is the permanent ceiling and option A becomes the
correct next step — specified once, over a space known to be final.

**On the record, unchanged:** neither A nor B, at any `N`, distinguishes a reusable cognitive
mechanism from a property of this substrate. M22's non-identifiability and M23's shared-cause
finding are architectural and survive both.

**Still outstanding, still untouched:** the `895000–895999` registry-link defect.

---

Believe in yourself and keep going
