# M29 — Cold-Start-Preserving Baseline Formulation: Audit

**Status:** FORMULATION + SOURCE-BOUND ARCHITECTURAL / CAUSAL AUDIT ONLY
**Milestone:** M29
**Date:** 2026-09-11
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-09-11 — *M28 ACCEPTED → M29 AUTHORIZED*

**Nothing was run; the agent was never booted. No seed generated, selected or consumed; no
experiment; no preregistration, registry, production, C1/UQ-B or frozen M7 governance change.**
`main.js`, `run.js`, `permute.js`, `hook.mjs`, `c1/collect.js` and `M7_PREREGISTRATION.md` were read.

---

> **M29-R1 — WORDING REPAIR APPLIED, Director ruling of 2026-09-11 (Gemini independent review).**
> M29 originally wrote that `C × R` is *"the complete available space"* / *"known to be final"*. That
> **overstated the evidence** and is narrowed at five sites to: **under the current frozen
> architecture, `C × R` is the only space for varying the agent's experiential history that the
> source audit identified.**
>
> **Why not the reviewer's exact wording.** The proposed replacement — *"the complete, source-verified
> space…"* — fixes two of three problems and I have adopted both: scoping the domain to *experiential
> history* (correct, since `H = f(C, R)` when `I` is constant, M25) and scoping to the *current frozen
> architecture*. But it retains **"complete"**, and **M29's own Hy-1 records that "a trace found none;
> not proof."** Asserting completeness inside an INFERENCE (In-6) would upgrade Hy-1 from HYPOTHESIS
> to INFERENCE — the category error this program's evidence discipline forbids. The narrower wording
> is therefore not a stylistic preference: it is what M29's own hypothesis register already requires.
>
> **No scientific conclusion of M29 changes.** The three grounds, the HOLD verdict, the M28 retraction
> and the M30 recommendation all stand. Corrected forward, not rewritten; the superseded wording
> remains in the history at `44cf49e`.

## 1. Verdict

> # M29-HOLD
>
> **The burn-in baseline formulation does not survive. I am rejecting my own M28 proposal.**
>
> It fails on **three independent, source-established grounds**, any one of which is sufficient:
>
> 1. **No treatment-neutral baseline can be generated.** `makeGuard` admits exactly two arms and
>    **throws** otherwise; with the guard unset the build is *"behaviourally identical to HEAD"*,
>    i.e. ARMED-equivalent. **Every possible burn-in is run under one arm.** The baseline is
>    therefore **not pre-treatment** — it carries one arm's treatment signature (§3).
> 2. **`saveBrain`/`loadBrain` is lossy.** `timeMemory` is live learned state that feeds
>    `analyzeCandidate` and is **not persisted**. A round-tripped baseline is a **reconstruction no
>    continuous run ever occupies** — invention, not extraction (§6).
> 3. **Frozen §5.4 is scientifically substantive, not merely hygiene.** My M28 claim that it is
>    *"broader than its stated purpose"* was **too strong** and is corrected here (§7).
>
> **Consequence: M28's B → A ordering is now resolved.** B is closed. **Option A — stochastic-
> trajectory robustness over `C × R` — is the correct next direction**, and it can now be specified
> over the **only space for varying the agent's experiential history that the source audit
> identified** under the current frozen architecture — established by audit rather than assumed,
> and bounded by **Hy-1** (a trace finding no further channel is not proof that none exists).

---

## 2. The proposed sequence, and where it breaks

```
I0  deterministic cold-start state   →   H  generated experience   →   B  baseline state
                                                                        ↓
                                                              T  ARMED/ABLATED   →   Y  E6
```

**`I0 → H` is where it breaks.** `H` cannot be generated without an arm, so `B` inherits one (§3).
The sequence is not `I0 → H → B → T → Y` but:

```
I0  →  H|T=x  →  B(x)  →  T  →  Y            with x ∈ {ARMED, ABLATED} and no third option
```

`B` is **post-treatment with respect to arm `x`**, and `x` is an unresolvable researcher degree of
freedom.

### 2.1 State a burn-in would change — traced, not assumed

`saveBrain` (`main.js:684–712`) persists **exactly**:

| Persisted | Feeds |
|---|---|
| `transitions` | **candidate generation** (`:1593`), **F3** `isEpisodeTrained` (`:1648`) |
| `penalties` | **F1** (`:1610`) **and the weight** (`:1754`, ×1.5 at `:1878`) |
| `Q` | **F2** (`:1620`) |
| `rewards` | **F3** `isHumanTrained` |
| `signals` | **`analyzeCandidate` (`:1698`) — the weight** |
| `curiosity`, `confidence` | scoring terms |
| `episodes` | → `rebuildAdjacencyMemory()` (`:1121`) → **F3** `hasEpisodicWitness` |
| `homeNeuronId`, `goalNeuronId` | goal state — **`goalNeuronId` is overridden by `__M7_GOAL__` at `:1114`** |

**NOT persisted, though it is live learned state:**

| Omitted | Feeds |
|---|---|
| **`timeMemory`** (`:1015`, written `:4825`, `:5543`) | **`analyzeCandidate` (`:1698`) — the weight** |
| `adjacencyMemory` | rebuilt from `episodes`, not restored directly |
| biological state | not in the persisted set |

> **EVIDENCE. The persistence layer is not a complete state snapshot.** It restores some weight-
> bearing stores and leaves at least one (`timeMemory`) empty.

---

## 3. Arm independence — the decisive test

The proposed design: generate one baseline **before** treatment assignment, snapshot immutably,
create two processes, load the identical baseline into both, then apply `T`.

**Does a common baseline preserve §5.4's reason?** The distinctions the ruling asks for:

| | Assessment |
|---|---|
| **shared scientific baseline** | **Yes** — both arms would receive byte-identical content |
| **accidental shared mutable state** | **Avoided** — separate OS processes; each mutates its own copy |
| **shared filesystem / localStorage** | **Avoided if** the baseline is copied into each process's own store, never a shared handle |
| **copied state** | this is the honest description — a copy, not a share |
| **process isolation** | **Preserved** — one process per run is untouched |
| **provenance** | **Declared** — which is precisely what M27 identified as missing |

> **On the mechanics, the design is sound.** Loading identical declared content into two isolated
> processes creates no silent cross-arm sharing. **"Same state = independent" is not the argument;
> the argument is that the state is common, explicit, and mutated independently thereafter.**

### 3.1 …and it fails anyway, on provenance

`experiments/uqb/permute.js`:

```
export const ARMS = Object.freeze(['ARMED', 'ABLATED']);        // :37
export const ABLATED_VALUE = 0;                                  // :40
makeGuard({ arm, … }) { if (!ARMS.includes(arm)) throw … }        // :199-200
  const delivered = arm === 'ABLATED' ? values.map(() => ABLATED_VALUE) : values;   // :207
```

and `experiments/uqb/hook.mjs` — **DEFAULT-OFF**: *"With `__UQB__`, `__UQB_PROBE__` and
`__UQB_EXPOSE__` all unset … the build is behaviourally identical to HEAD."*

> **EVIDENCE. There are exactly two arms, `makeGuard` throws on anything else, and the guard-off
> default delivers `futureBonus` — i.e. it is ARMED-equivalent.**
>
> **INFERENCE. No treatment-neutral burn-in exists.** Every baseline is generated under ARMED (or
> guard-off, which is the same thing) or under ABLATED.

**Why this is fatal to the *claim*, not merely inconvenient:**

- A baseline generated under ARMED gives **both** arms a history shaped by the very term under test.
  The measured contrast becomes *"the effect of `futureBonus` in phase 2, given a phase-1 history
  that had `futureBonus`."*
- Generated under ABLATED, it becomes a different conditional effect.
- **The two need not agree, and nothing selects between them.** The burn-in arm is a free parameter
  with no principled resolution — exactly the kind of post-hoc choice this program freezes in
  advance precisely because it cannot be chosen after seeing data.

**The proposal's central claim — that the baseline is a *pre-treatment* covariate like the
configuration — is false.** The configuration is generated by `makeConfig` with no agent and no arm
(M24-R1 §2.1c). A baseline cannot be.

---

## 4. Scientific object

Does a burn-in baseline change the object C1 measured? **Traced:**

| | Changed? | Route |
|---|---|---|
| candidate generation | **YES** | `transitions` → `allCandidates` (`:1593`) |
| F1 admission | **YES** | `penalties` (`:1610`) |
| F2 admission | **YES** | `Q` (`:1620`) |
| F3 admission | **YES** | `transitions`, `rewards`, `episodes`→`adjacencyMemory` |
| F4 reachability | no | graph-derived |
| candidate weights | **YES** | `penalties` (`:1754`/`:1878`), `signals` (`:1698`) |
| oracle | **NO** | environment-defined; `__M7_GOAL__` overrides restored `goalNeuronId` at `:1114` |
| E6 pool size `n` | **YES** | downstream of admission |
| normalisation `ρ = r/(n−1)` | **YES** | via `n` |
| learned trajectory | **YES** | by construction |

**Interpretation: (B) — the design would be valid but would measure a NEW scientific object.**
Not (A) invalid *on this ground alone*; not (C) — **comparability to C1 is not available and must not
be forced**: C1's estimand is the effect of the mechanism's *continuous presence* from a cold start,
and a warm baseline changes both the pool and the starting point.

*(The design is nonetheless rejected — on §3, §6 and §7, not on this.)*

---

## 5. Baseline population

`B = f(configuration, burn-in arm, agentSeed, burn-in duration, I0, RNG state at snapshot)`.

Traced: `I0` is constant (M26/M27); `agentSeed` fixes all four streams (`run.js:318–321`); the
burn-in arm is forced (§3.1); duration and snapshot point are free parameters with **no frozen
value**.

| Candidate unit | Assessment |
|---|---|
| configuration | insufficient — ignores the baseline |
| baseline | insufficient — ignores the environment |
| **configuration × baseline** | the design's implied unit — **but each baseline is itself a function of a configuration**, so the two axes are *not* orthogonal |
| configuration × trajectory | the `C × R` unit (M26) — well defined |

> **A third multiplicity appears.** Distinct burn-ins can yield identical baselines — the same
> collapse mechanism as trajectory multiplicity (M26: randomness consumed at threshold comparisons),
> now compounded with content multiplicity (M24-R1) and trajectory multiplicity. **Measurable by
> hashing the persisted object; no estimator is invented here.**

---

## 6. Synthetic vs generated — and the loss that decides it

| Form | Preserves *extraction, not speculation*? |
|---|---|
| 1. hand-authored synthetic state | **NO** — pure invention |
| 2. copied real state | **Would**, if a faithful copy existed |
| 3. state generated by actual experience | **Would**, in principle |
| 4. state from a separate preparatory procedure | **Only if** faithful and neutral — §3.1 denies neutral |
| 5. state modified after generation | **NO** — invention by editing |

> **The decisive finding: forms 2 and 3 are NOT AVAILABLE, because the only persistence channel is
> lossy.** `timeMemory` is live learned state that feeds `analyzeCandidate` (`:1698`) and is **absent
> from `saveBrain`**. A save/load round trip yields warm `Q`/`penalties`/`transitions`/`signals`
> beside an **empty `timeMemory`** — a combination **no continuous run ever occupies**.
>
> **A round-tripped baseline is therefore a reconstruction, not a copy.** It is closer to form 5
> than to form 2, and *"generated"* does not rescue it: what is loaded is not what was generated.

**This also answers the ruling's warning directly: generated ≠ automatically legitimate.** Here the
generated state is legitimate; the *restored* state is not the generated state.

---

## 7. M7 §5.4 — correcting my own M28 claim

**I do not propose weakening or modifying §5.4, and nothing here does.**

§5.4 provides, verbatim: one OS process per run; **cold `localStorage` per run, asserted at start**;
crashed runs fail loudly.

| Part | Classification |
|---|---|
| one process per run | **implementation safeguard** — ESM singleton caching |
| crashed runs fail loudly | **implementation safeguard** with scientific effect (no silent dropping) |
| **cold `localStorage`, asserted** | **BOTH** — and M28 saw only half |

### 7.1 The correction

> **M28 said §5.4 is "broader than its stated purpose." That was TOO STRONG, and I am retracting it.**
>
> §5.4's *stated reason* is contamination. But the clause also secures a second property M28 did not
> credit: **every run's learned state is entirely attributable to that run's measured exposure.**
>
> That is not hygiene — it is what makes the frozen estimand well-posed. UQ-B's committed estimand
> is *"the total causal effect of the `futureScore` mechanism's **continuous presence** on the
> agent's final greedy policy."* **"Continuous presence" is only well-defined from a known zero.**
> With a warm baseline, the mechanism's presence during the pre-history is a separate, unspecified
> condition, and the estimand loses its referent.

**So: does a common immutable pre-treatment baseline preserve every relevant guarantee? NO.** It
preserves process isolation and non-silent-sharing. **It does not preserve attributability**, and
attributability is load-bearing for the frozen estimand.

**Which clause would require Director consideration, if any?** On this analysis, **none should be
proposed** — the clause is doing scientific work, not merely procedural work. **I am withdrawing
M28's implicit suggestion that a "smallest possible refinement" was in view.**

---

## 8. Causal structure of `B`

| Candidate role | Verdict |
|---|---|
| pre-treatment | **NO** — §3.1: `B` is generated under an arm |
| treatment-independent covariate | **NO** — same reason |
| mediator | **No** — `B` precedes `T` in time; it is not on a path from `T` to `Y` *within a run* |
| moderator | **Closest available reading** — the phase-2 effect may depend on `B`, but `B` is not a substantive variable; it is a treated history |
| nuisance state | **No** — it carries treatment signature; a nuisance would not |
| **new experimental factor** | **YES — this is what it actually is** |

> **What would actually be estimated:** the effect of the phase-2 treatment **conditional on a
> phase-1 history produced under a chosen arm**. That is a **history-dependence** contrast, not an
> initial-state robustness contrast.
>
> **Baseline variation ≠ mechanism evidence. Robustness across baselines ≠ reusable mechanism.**
> Neither is claimed anywhere here.

---

## 9. Alternatives

| | Candidate | Verdict and reason |
|---|---|---|
| **A** | common generated burn-in baseline | **REJECTED** — §3.1 (not neutral), §6 (lossy), §7 (attributability) |
| **B** | controlled pre-treatment experience history | **REJECTED** — same three grounds; "pre-treatment" is precisely what §3.1 denies |
| **C** | immutable baseline snapshot / clone | **REJECTED** — the snapshot is lossy (§6); a clone of a reconstruction is still a reconstruction |
| **D** | another existing state channel | **NONE FOUND.** M27 traced the pre-tick channels; `localStorage['brain']` is the only one, and §6 shows it is incomplete |
| **E** | stochastic-trajectory robustness (`C × R`) only | **ACCEPTED as the next direction** — the only axes the source audit identified, now established by audit rather than assumed (bounded by Hy-1) |
| **F** | deeper architecture research | **Available, and not recommended now** — it would require making persistence complete *and* inventing a neutral arm. Two architectural changes, for a design that would still measure a different object than C1 |
| **G** | 2×2 burn-in-arm × measurement-arm factorial | **Noted and rejected for now.** It is a *legitimate* design for a **history-dependence** question, and it sidesteps the "which arm?" free parameter by crossing it. But it still requires §7's attributability sacrifice and §6's lossy snapshot, and it answers a question the program has not posed |

---

## 10. Option value — did B-first pay off?

> **The ruling asks whether M28's B → A ordering was actually the best decision. YES — and M29 is
> the demonstration, not an argument for it.**

- B resolved **negatively**, at **zero compute**.
- The resolution **changed what A means**: under the current frozen architecture, `C × R` is now the
  **only source-identified** space for varying the agent's experiential history — established by
  audit rather than assumed. A future `C × R` study may state that scoping as established, **not**
  as a completeness proof (Hy-1).
- Had A run first, an expensive product design would have been executed without knowing whether its
  space was final — and §3.1/§6/§7 would still have been sitting there, unexamined.

**Does resolving the baseline question create a new scientific level? No — it closes one.** That is
still the correct outcome: the ordering was chosen because B's answer changes A's meaning, and it
did.

**I am not endorsing B-first because it was cheaper.** It was chosen because its answer was
decision-relevant, and the answer turned out to be a closure. Cheapness made the closure free.

---

# PASS 2 — ADVERSARIAL SELF-REVIEW

**1. Common baseline creates hidden arm dependence.** **Does not land on the mechanics** (§3:
separate processes, copied content, independent mutation) — **but lands decisively on provenance**
(§3.1). The dependence is not hidden in the plumbing; it is in the baseline's own treatment history.

**2. Baseline generation contains treatment leakage.** **LANDS — this is the primary finding.**
`makeGuard` throws outside `{ARMED, ABLATED}`; guard-off is ARMED-equivalent. There is no neutral
generation mode.

**3. Baseline changes candidate admission and invalidates the E6 comparison.** **Lands as
non-comparability, not invalidity** (§4, interpretation **B**). Comparability must not be forced.

**4. Baseline generation selects on the same oracle C1 uses.** **Partially lands.** The oracle is
environment-defined and `__M7_GOAL__` protects it at `:1114`. But eligibility (R5) still conditions
on the oracle disagreeing with the naive policy (M25 §5), and a baseline study would inherit that
hypothesis-adjacent eligibility unchanged.

**5. Baseline multiplicity creates a new sampling artifact.** **Lands** — §5. A third multiplicity
atop content and trajectory multiplicity.

**6. Two distinct burn-ins produce identical learned state.** **Lands, and is expected** — the same
threshold-collapse mechanism as trajectory multiplicity (M26). Measurable by hashing the persisted
object.

**7. Identical learned state still produces different stochastic trajectories.** **Lands, and it
matters**: a common baseline does **not** make the subsequent runs deterministic-equivalent —
`agentSeed` still governs `R`. So a baseline design would need `R` controlled *as well*, making it
`C × B × R` — a three-axis product.

**8. Baseline varies something that should remain fixed.** **Lands — §7.** It varies the zero point
that the frozen estimand's *"continuous presence"* is defined against.

**9. Baseline becomes an accidental new mechanism.** **Lands via §6.** A restored state with warm
stores and empty `timeMemory` is not a state the architecture produces; treating it as an initial
condition introduces a configuration no experience generates.

**10. Baseline formulation shifts the confound rather than resolving it.** **Lands.** It replaces
"one fixed trajectory" with "one fixed *treated* history" — a confound of the same shape, with an
extra free parameter attached.

### Challenging my own HOLD

**Strongest counter: "the 2×2 factorial (alternative G) dissolves objection 2, so HOLD is too
strong."** **It genuinely dissolves objection 2** — crossing the burn-in arm removes the free
parameter. **But it does not touch §6 (lossy snapshot) or §7 (attributability)**, and either alone
sustains the HOLD. G is recorded as a real future option, not dismissed.

**Second counter: "you are rejecting your own M28 proposal, which suggests M28 was careless."**
**Partially fair, and worth stating plainly.** M28 proposed the burn-in on a *conceptual* argument
about §5.4's purpose and did **not** trace `makeGuard`'s arm set or `saveBrain`'s field list. **M29
is what tracing produced.** That is the 2× workflow working as designed — a formulation proposed,
then independently audited against source — but the M28 claim about §5.4 should have been marked
HYPOTHESIS rather than stated as an interpretation of fact, and §7 corrects it.

---

## 11. Evidence → Inference → Hypothesis

**EVIDENCE**
- **Ev-1.** `ARMS = ['ARMED','ABLATED']` (`permute.js:37`); `makeGuard` throws otherwise (`:199–200`).
- **Ev-2.** `hook.mjs` DEFAULT-OFF: with the guards unset the build is *"behaviourally identical to
  HEAD."*
- **Ev-3.** `saveBrain` persists `transitions, rewards, penalties, signals, curiosity, Q, confidence,
  episodes, homeNeuronId, goalNeuronId` (`main.js:684–712`).
- **Ev-4.** `timeMemory` is live learned state (`:1015`, `:4825`, `:5543`), feeds `analyzeCandidate`
  (`:1698`), and is **absent** from `saveBrain`.
- **Ev-5.** `__M7_GOAL__` overrides restored `goalNeuronId` at `:1114`.
- **Ev-6.** Frozen §5.4: cold `localStorage` per run, asserted at start.
- **Ev-7.** UQ-B's committed estimand names the *"continuous presence"* of the mechanism.

**INFERENCE**
- **In-1.** No treatment-neutral baseline exists ⇒ `B` is not pre-treatment (Ev-1, Ev-2).
- **In-2.** A round-tripped baseline is a reconstruction, not a copy (Ev-3, Ev-4).
- **In-3.** Cold start secures attributability, which the frozen estimand requires (Ev-6, Ev-7) ⇒
  **M28's "broader than its stated purpose" is retracted.**
- **In-4.** `B` is a new experimental factor, not a covariate or nuisance (In-1).
- **In-5.** A baseline design would be `C × B × R`, not `C × B` (PASS 2 §7).
- **In-6.** With B closed, `C × R` is the **only source-identified** space for varying the agent's
  experiential history under the current frozen architecture. **This is the result of an audit that
  found no further axis — NOT a proof of completeness. Hy-1 bounds it, and In-6 may never be read as
  upgrading Hy-1 into an inference.**

**HYPOTHESIS**
- **Hy-1.** No further pre-tick state channel exists (M27) — a trace found none; not proof.
- **Hy-7.** That a complete-persistence repair plus a neutral arm would make a baseline axis
  legitimate. **Plausible; unestablished; and it is two architectural changes, not one.**
- **Hy-8.** That the 2×2 factorial (alternative G) would be worth posing later. **Unevaluated.**

**Preserved, not claimed:** `agentSeed` ≠ initialisation; trajectory robustness ≠ mechanism
validation; more seeds ≠ reusable-mechanism evidence; generated baseline ≠ automatically legitimate;
common baseline ≠ automatically sufficient.

---

## 12. Outcome

> # M29-HOLD
> **No legitimate initial-state/history formulation survives without deeper architectural research.**

Not GREEN: the formulation fails on three independent grounds. Not YELLOW: this is not one
unresolved question — §3.1, §6 and §7 are each independently sufficient, and two of them would
require architectural change to address.

### Single highest-value next milestone

> ## M30 — Stochastic-Trajectory Robustness Formulation *(formulation only)*
>
> **Option A, now reached by elimination rather than by default.** Formulate the `C × R` design over
> the space M29 established is the **only one source-identified** under the current
> frozen architecture: estimand as the **distribution** of `τ` across
> trajectories (never the mean); direction frozen in advance; **trajectory multiplicity** and
> **content multiplicity** as falsifiable preconditions checked by fingerprint and content hash; and
> the naming discipline forbidding any initialisation reading.
>
> **It must not authorise an experiment**, and it must carry forward that `C × R` robustness will
> not, at any `N`, distinguish a reusable cognitive mechanism from a property of this substrate.

**Still outstanding, still untouched:** the `895000–895999` registry-link defect.

---

Believe in yourself and keep going
