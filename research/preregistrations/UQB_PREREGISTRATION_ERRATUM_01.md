# UQ-B Pre-Registration — Erratum 01

**Erratum ID:** UQB-ERR-01

**Date:** 2026-09-09
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-09-09 — *J1 resolution, R2 adopted*, following the UQ-B
implementation milestone (`9988acf`) and the J1 readout state-closure audit (`e77de21`).

**Binds to frozen artifact:**

| | |
|---|---|
| Document | [`UQB_PREREGISTRATION.md`](UQB_PREREGISTRATION.md) v1.0 (frozen 2026-09-09, `3b3d195`) |
| **SHA-256** | **`bc655022b63e8022ed6427001da6a90eb2f9ec139cf413ab367e9bc7269ba46e`** |
| Sidecar | [`UQB_PREREGISTRATION.sha256`](UQB_PREREGISTRATION.sha256) |
| Verify | `cd research/preregistrations && sha256sum -c UQB_PREREGISTRATION.sha256` |

> **THE FROZEN PRE-REGISTRATION IS NOT MODIFIED BY THIS ERRATUM.** Its bytes and its digest are
> unchanged, verified immediately before and immediately after. This document corrects two stated
> facts and extends one neutrality clause **by reference**; it does not rewrite the frozen text, and
> the frozen text remains the historical record of what was specified.

---

## 0. Purpose, stated first

The frozen §3 facts **G12** and **G13** are **factually incomplete**, and frozen §15 does not cover a
transform the corrected facts make necessary.

`runPrediction` **does** mutate persistent learned state. It does so not through a
learning-mutating call — G12 enumerated those correctly — but through a **read-mutating accessor**
that G12's method could not see.

This erratum records the corrected facts, authorises the minimal transform that restores §6.2's
same-state comparison, and **changes no scientific decision whatsoever.** §7 below enumerates every
frozen element and confirms each is untouched.

**No estimand, exposure, population, statistic, discriminator, threshold, seed range, sample size,
stopping rule or acceptance criterion is altered by this erratum.**

---

## 1. The source fact G12 and G13 missed

**`render/predictionError.js:578–598`:**

```js
export function getTransitionUncertainty(fromId, toId) {
    const key = String(fromId) + "->" + String(toId);
    const raw = transitionUncertaintyMap.get(key) || 0;
    const decayed = raw * TRANSITION_UNCERTAINTY_DECAY;   // 0.998, :506
    if (decayed < 0.005) {
        transitionUncertaintyMap.delete(key);             // ← persists
        return 0;
    }
    transitionUncertaintyMap.set(key, decayed);           // ← persists
    return decayed;
}
```

`transitionUncertaintyMap` is declared `const … = new Map()` at `:503`. It is **private** — not
exported, with no setter, no whole-map accessor and no reset.

It is called at **`main.js:2130`**, inside the `allCandidates` loop, inside the `STEPS` loop:

```js
transitionUncertainty: getTransitionUncertainty(currentKey, k),
```

so its value enters the scoring context for **every candidate at every step of every readout**, and
every such read decays that entry by 0.2% and persists the decayed value.

**Measured consequence, from the committed implementation milestone (`9988acf`, control J1):** the
same guard-off readout taken before and after a 19-state × 20-arrangement sweep differs at **1 of 19
states**. Isolated by diagnostic: the identity arrangement versus a guard-off pass taken at the *same*
sequence position differs at **0 of 19**, so the §6 permutation machinery draws nothing and mutates
nothing. The drift is the substrate's, not the instrument's.

---

## 2. Correction to G12

**Frozen §3, fact G12 reads:**

> It contains **no learning-mutating call**: no `updateQ`, `setQ`, `dampQ`, `recordAttempt`,
> `recordSuccess`, `recordTraversal`, `reinforcePath`, `weakenPath`, `recordSemanticEdge`,
> `episodeRecordNode`, `rewardCurrentEpisode`, `sealCurrentEpisode`, `rebuildSchemas`,
> `runConsolidationPass`.

**That enumeration is correct and is not withdrawn.** It is **incomplete as a claim about mutation**,
and is corrected to read, by reference:

> **G12 (corrected).** `runPrediction` contains no call from the enumerated learning-mutating set.
> It **does**, however, mutate persistent learned state through a **read-mutating accessor**:
> `getTransitionUncertainty` (`render/predictionError.js:578–598`) decays the stored value and writes
> it back on every read, and is called at `main.js:2130` inside the candidate loop. A search for
> mutating *calls* cannot detect a mutating *read*, which is why the original enumeration missed it.

**Established by the same audit, and recorded so the closure is not re-derived:** across the entire
`render/` tree exactly **two** exported accessors mutate module state on read —
`getLocalEmotion` (`emotionMap.js:33`) and `getTransitionUncertainty`. The first only materialises an
**all-zero default** and never changes an existing value, so it is read-idempotent. Every other
binding written during `runPrediction` carries nothing across readouts: `lastArbitrationBreakdown` is
written and read within one candidate iteration; `liveFutureBonus` is behaviourally inert (G8); the six
`motivationalState` drives are assigned with `=` as pure functions of their arguments — a derived
cache, not accumulated state; `_attentionTargets` is referenced nowhere outside `neuronVisuals.js`;
`main.js`'s `lastDecision` is not read by the decision path.

> **The readout state closure is exactly one binding: `transitionUncertaintyMap`.**

## 3. Correction to G13

**Frozen §3, fact G13 concludes:**

> Consecutive readouts cannot contaminate one another.

That conclusion followed from G12 and inherits its gap. Corrected, by reference:

> **G13 (corrected).** `runPrediction`'s only write outside itself is `window.lastReasoning`;
> `thoughtTree` is local, freshly allocated per call. **However**, consecutive readouts **do**
> contaminate one another through the G12-corrected read-mutating accessor, unless persistence is
> suspended as §4 below provides. With it suspended, the original conclusion holds.

## 4. Extension to §15 — the guarded transform of `render/predictionError.js`

**Frozen §15 states, and this erratum leaves both prohibitions fully in force:**

> - **No production source modification.** The exposure and the permutation are delivered by the
>   committed ESM load-hook technique, in memory.
> - **No new M7 arm** (G20). **No new export from any `render/` module** — M7 gate G9.

**Extended, by reference:**

> **§15 (extended).** The in-memory guarded transform may additionally cover
> `render/predictionError.js`, for the **sole** purpose of suspending persistence inside
> `getTransitionUncertainty` during a §8 readout.
>
> The transform **must**: change only the two persistence statements (`:590`, `:594`); leave the
> returned value **exactly** as the committed code computes it, including the `< 0.005 ⇒ 0` rule;
> introduce **no new export**; modify **no** file on disk; and be **default-off**, so that with the
> guard unset the build is behaviourally identical to the committed runtime.
>
> **Unchanged and still binding:** no production source modification on disk, no new export from any
> `render/` module, no new M7 arm. The committed export surface of `render/predictionError.js` is
> untouched, so gate **G9** (`verify_G9.js:86`) continues to pass; the committed source text of
> `getTransitionUncertainty` is untouched, so gate **M6.6** (`verify_S6.js:80–82`, which pins that
> text byte-for-byte) continues to pass. Both gates read the file from disk, which the transform never
> touches.

**Why this and not snapshot/restore.** Literal snapshot/restore is infeasible: the map is private with
no setter, and restoring it from outside would require a new export from a `render/` module, which
§15's surviving prohibition forbids. Preventing the write is strictly smaller than undoing it and
needs no export.

**Why not `peekTransitionUncertainty`.** That accessor (`:568`) exists and is already exported, but it
returns the **undecayed** value without the `< 0.005 ⇒ 0` rule, so the readout would consume an input
the committed decision path never computes; and its own header declares it *"MEASUREMENT ONLY — must
never be called from the agent decision path (asserted by gate M6.8)."*

## 5. Addition to §8 — the readout is taken with persistence suspended

**Frozen §8 defines the readout and states it is taken "at end of run, with learning frozen".**
Added, by reference:

> **§8 (added).** The readout is taken with `transitionUncertaintyMap` **persistence suspended** per
> §4. This makes §8's "with learning frozen" literally true rather than approximately true, and it is
> what allows §6.2's requirement — that arrangements be compared under **the same state** — to hold.

## 6. Scientific boundary — what R2 is, and what it is not

Stated precisely, because the distinction is load-bearing and must not be blurred in any later report:

> **R2 changes the behaviour of the READOUT PROCEDURE. It does not change the agent's normal learning
> or execution mechanism.**

- This erratum makes **no claim** that transition uncertainty does not decay in normal execution. It
  does decay, on every read, exactly as `predictionError.js` specifies, and that behaviour is
  untouched during the agent's run.
- Persistence is suspended **only** during the controlled §8 policy readout, and **only** so that the
  20 arrangements are compared from the same relevant state.
- **R2 is experimental control machinery. It is not an improvement to the cognitive architecture**,
  and it must never be described as one, nor cited as evidence about the architecture's design.
- The one behavioural consequence inside the probe, recorded rather than glossed: within a single
  readout, a transition read at more than one step no longer decays between those reads. That is a
  property of the probe, not of the agent.

## 7. Every frozen scientific decision, confirmed unchanged

| Frozen element | Status |
|---|---|
| C1 estimand (§2, §11) | **UNCHANGED** |
| C2 estimand and null `H_redistribution` (§2, §5.2) | **UNCHANGED** |
| §5.1 exposure — `futureBonus` delivered as exactly 0, dual-path | **UNCHANGED** |
| §6 term-level permutation definition | **UNCHANGED** |
| §7 population — all 19 decision states, no arrival conditioning | **UNCHANGED** |
| §8 `bestChoice` readout at step 0, before the ε override | **UNCHANGED** (§5 adds only the persistence-suspension condition) |
| §9 oracles | **UNCHANGED** |
| §10 statistic and phase separation, never pooled | **UNCHANGED** |
| §12 discriminator — strictly greater than all 19 | **UNCHANGED** |
| §12 tie rule — ties do not reject, no post-hoc tie breaking | **UNCHANGED** |
| §12 ABLATED wiring control | **UNCHANGED** |
| `K = 19`, `α = 1/(K+1) = 0.05` (§25) | **UNCHANGED** |
| §18 minimum — 20 complete accepted configurations | **UNCHANGED** |
| §19 complete-range enumeration, no early stop | **UNCHANGED** |
| §19 `INCONCLUSIVE — INSUFFICIENT MATERIAL` rule | **UNCHANGED** |
| §17 seed block `897000–897999` | **UNCHANGED** |
| §19 no adaptive extension | **UNCHANGED** |
| §24 no post-result additions or relaxations | **UNCHANGED** |
| §13 statistics policy and multiplicity treatment | **UNCHANGED** |
| §23 interpretive limits | **UNCHANGED** |

**No threshold, seed range, statistic, acceptance criterion or study conclusion is altered.**

## 8. Acceptance condition for the repair

The repair authorised here is accepted only if control **J1 reaches exactly 0/19** — the same
guard-off readout, taken before and after a full arrangement sweep, must agree at every one of the 19
states.

**J1 may not be weakened.** Deterministic drift is not acceptable merely because decisions happen to
be unchanged; the criterion may not be replaced by influence delta; readout order may not be averaged
over; and drift may not be statistically adjusted for.

## 9. State at issue

No UQ-B configuration seed from `897000–897999` has been generated, evaluated or inspected. No
collection has been run. R2 is **not** implemented at the time this erratum is frozen. Production
source is unchanged on disk. The frozen UQ-B pre-registration digest revalidates.

**This erratum authorises the R2 transform and nothing else.** It does not authorise the main
collection.
