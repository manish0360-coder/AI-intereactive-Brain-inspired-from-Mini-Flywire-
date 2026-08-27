# M7 Pre-Registration — Erratum 08

**Erratum ID:** M7-ERR-08
**Lineage:** extends [01](M7_PREREGISTRATION_ERRATUM_01.md), [02](M7_PREREGISTRATION_ERRATUM_02.md), [03](M7_PREREGISTRATION_ERRATUM_03.md), [04](M7_PREREGISTRATION_ERRATUM_04.md), [05](M7_PREREGISTRATION_ERRATUM_05.md), [06](M7_PREREGISTRATION_ERRATUM_06.md), [07](M7_PREREGISTRATION_ERRATUM_07.md)
**Date:** 2026-08-23
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-08-23 — *Authorize ERR-08 and G8 re-evaluation*, accepting Classification **C** and adopting **Reading R1**, following the G8 root-cause report.

**Binds to frozen artifact:**

| | |
|---|---|
| Document | [`M7_PREREGISTRATION.md`](M7_PREREGISTRATION.md) v1.0 (frozen 2026-08-19) |
| **SHA-256** | **`2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9`** |
| Verify | `cd research/cognitive-audit && sha256sum -c M7_PREREGISTRATION.sha256` |

> **THE FROZEN PRE-REGISTRATION IS NOT MODIFIED BY THIS ERRATUM.** Verified immediately before and immediately after.

---

## 0. Purpose, stated first

> **This correction exists to remove a false verification requirement, not to make an implementation pass artificially.**

Frozen §9.1 asserts an empirical property of the baseline execution path that is **deductively false for the frozen source**, and was false on the day the document was frozen. No implementation, verifier, or measurement can satisfy it. This erratum withdraws the false clause and nothing else.

**Scope:** exactly two withdrawals inside frozen §9.1. Every other clause of §9, §14 G8, and the whole of the frozen document stands unchanged.

---

## 1. The clause at issue

Frozen **§9.1**, verbatim:

> | Flag | Definition | Measured rate |
> |---|---|---|
> | `replayBranch` | The tick took the `liveRng() < 0.92` **else**-branch (`replayOneEpisode`) | **~8%** of steps |
> | `staleExecution` | The action **executed** differs from the action **selected** on that tick | **4.5%** (17/380, `verify_S3.js` S3.2) |
>
> `staleExecution ⊆ replayBranch` but they are **not equal**. Gate G8 asserts both fire correctly **and asserts that they differ** — asserting them equal would re-introduce the conflation.

---

## 2. Deductive proof that the clause is false for the frozen source

Four premises, each a property of the source, none requiring measurement:

| | Fact | Site |
|---|---|---|
| **P1** | `window.lastReasoning` is assigned at **exactly one** site in the codebase, inside `runPrediction` (which spans 1296 → 3024) | `main.js:2541` |
| **P2** | During an agent run, `runPrediction` has **exactly one reachable call site**: the then-branch of `if (liveRng() < 0.92)`. Its only other call site (`main.js:5337`) is inside a click handler and is unreachable in a headless run | `main.js:3189` |
| **P3** | The executed action is defined at **exactly one** site: `next = window.lastReasoning.to` | `main.js:3681` |
| **P4** | `replayOneEpisode` contains **zero** references to `lastReasoning` or `agentCurrent` | `render/episodeManager.js:430` |

Derivation:

```
D1  (P1,P2)     a selection occurs on step t  <=>  the then-branch ran on t  <=>  NOT replayBranch(t)
D2  (P3)        executed(t) = lastReasoning.to at the moment of read
D3  (D1,D2)     then-branch step: lastReasoning was just written, so executed(t) = selected(t)
                => "executed differs from selected" is FALSE on every then-branch step
D4  (P1,P2,P4)  else-branch step: no write occurred, so executed(t) = selected(t-1);
                selected(t) does not exist
```

**No third case exists.** For the two sets to differ non-trivially there must be a step carrying a selection where `executed ≠ selected`. By **P3** the executed action is *defined as* `lastReasoning.to`; by **P1+P2** `lastReasoning` is written at most once per step. Such a step is therefore **structurally impossible**. ∎

**Empirical cross-check** (seed 20260818, 80 loop-ticks; 405 agent steps): 364/364 then-branch steps wrote exactly one selection, none wrote more than one; 41/41 else-branch steps attempted a self-transition `u→u`. `replayBranch = staleExecution = 41`, with zero steps in either asymmetric difference.

**The clause was false at freeze.** The `liveRng() < 0.92` branch structure and the F2 repair (`best: exploreChoice || bestChoice`, asserted by `verify_S3.js:26`, an **M5 deliverable**) both existed on 2026-08-19. Frozen §1.1's "Not present" list names *F2b*, **not** F2.

---

## 3. Rulings

### 3.1 (A) Operational definition of `staleExecution` — PRESERVED

`staleExecution` is operationally defined by the **replay / no-selection condition already present in the frozen system**: a step on which the `liveRng() < 0.92` **else**-branch was taken, so no fresh selection was written and the executed action is the carried-over one. This is exactly the condition frozen §9.2 describes as the one where *"the scorer's argmax has no causal relation to the executed action"*. **Its meaning is unchanged.**

### 3.2 (B) In the frozen baseline, the two sets are equal

> **`staleExecution = replayBranch`**

This is a consequence of the frozen source (§2), not a redefinition.

### 3.3 (C) The "not equal" requirement is WITHDRAWN

> The frozen §9.1 clause **"but they are *not equal*"**, and the frozen §14 G8 sub-clause **"the two are verified to differ"**, are **withdrawn as deductively false for the frozen source.**

They are withdrawn as **inapplicable**, not weakened: the property they assert cannot hold for any build with this control flow, and a verifier asserting it can never be made non-vacuous, because the honest build is indistinguishable from a deliberately conflated one.

### 3.4 (D) The 4.5% (17/380) attribution is WITHDRAWN

> The frozen §9.1 attribution of the rate **"4.5% (17/380, `verify_S3.js` S3.2)"** to `staleExecution` is **withdrawn as unsupported and incompatible with the frozen baseline structure.**

`verify_S3.js` S3.2 computes `learningSteps − freshDecisions`. Because `freshDecisions ≡ then-branch step count` exactly (P1–P3), that quantity equals

```
learningSteps - freshDecisions  ==  replayLearned - (thenBranchCount - thenBranchLearned)
```

— measured `26 = 38 − 12` on the current build. It is an **algebraic net of two disjoint populations**, whose subtrahend consists of then-branch steps that selected an action and executed it, i.e. the *opposite* of stale, entering with a negative sign only because `updateQ` did not run on them. It is **not a count of steps**, admits no per-step indicator, and the relation `⊆ replayBranch` is undefined for it.

**History is not rewritten.** The figure 17/380 is preserved as the frozen baseline's value of that same residual. It is not re-attributed, re-computed, or deleted — only its *label* as a `staleExecution` rate is withdrawn.

### 3.5 (E) The §9.2 exclusion is UNCHANGED

Frozen §9.2 stands verbatim:

> *"Ticks where `staleExecution === true` are excluded from the link-③ and link-④ analysis sets, and only from those."*

Under §3.2 the exclusion set is exactly the replay / no-selection ticks — which is precisely the population §9.2's own rationale describes. **The exclusion remains active, non-empty, and operationally identical to what the frozen document intended.** Frozen §9.3's mandatory dual reporting remains fully operative, and the exclusion-validity rule remains capable of firing.

### 3.6 Gate G8 after this erratum

| Frozen §14 sub-clause | Status |
|---|---|
| *"`replayBranch` and `staleExecution` each fire on exactly the right steps"* | **RETAINED** — verified per step with detecting mutations |
| *"the two are verified to differ"* | **WITHDRAWN** per §3.3 |
| *"stale rate reproduces `verify_S3.js` S3.2 on the same seed"* | **SUPERSEDED** — it rested on the §3.4 attribution. The correct cross-path assertion is that the E6 per-step flags **account for** the S3.2 residual exactly, `L − D = replayLearned − thenNotLearned`, every term measured. This is a consistency check between two differently-scoped measurements, **not** a claim that they are equal. |

---

## 4. (F) What is NOT changed

| Category | Status |
|---|---|
| **Frozen document bytes and digest** | **Unchanged** |
| Production behaviour — `main.js`, `render/`, `instrumentation/rng.js` | **Unchanged.** No line altered by this erratum. |
| **F2b** | **NOT repaired.** Ruling Q3 defers it; frozen §18.4 lists the replay branch as not changed. |
| RNG contract, draw counts, stream separation | Unchanged |
| Topology, thresholds, metrics, hypotheses, windows, family = 6, the 4200-run cap | Unchanged |
| Acceptance criteria — R1–R5 and the ERR-07 G11 conjunct | Unchanged |
| Experimental parameters, Stage 1 behaviour | Unchanged |
| Frozen §9.2 exclusion rule, §9.3 dual reporting, §9.4 run-level inclusion | Unchanged |
| Gates G1–G6, G9–G16 | Unchanged, not weakened |
| ERR-01 … ERR-07 | Unchanged, still in force |
| **D2, F2b, D8/F12, D12 — unrepaired** | Unchanged |

### 4.1 Correction to ERR-01a §5

ERR-01a §5 states of gate G8: *"G8 compares two measurement paths on the same build … Both would report the same figure for whichever build is under test."* That claim is **withdrawn as an unsupported inference**. Build-identity does not imply population-identity: on the identical build the two paths report **41** and **26** respectively, because they count different populations. ERR-01a is otherwise unaffected.

### 4.2 (G) Why this is a correction and not a redesign

No threshold, observable, metric, predictor, constant, or scientific criterion is introduced or altered. No behaviour changes. Nothing is redefined to fit the implementation — the operational meaning of `staleExecution` (§3.1) is exactly what frozen §9.2 already relies on. What is removed is a **verification claim that was false about the code on the day it was frozen**, together with a **mislabel** of a pre-existing verifier's arithmetic. The gate becomes strictly less demanding in one respect and unchanged in every other; nothing is made to pass that would otherwise have failed on its merits.

---

## 5. Erratum register — cumulative

| ID | Clarifies / supersedes | Implemented in |
|---|---|---|
| **M7-ERR-01a** | Frozen G16.3 breakdown bit-identity | `phase1_0/verify_G16.js` |
| **M7-ERR-01b** | `verify_S3.js` S3.2 single-seed threshold | `phase1_0/verify_S3prime.js` |
| **M7-ERR-02** | Application of S1.7 to the rectification | `phase1_0/verify_S1prime.js` |
| **M7-ERR-03** | Frozen §3.5 R5 objective | *superseded by ERR-04* |
| **M7-ERR-04** | ERR-03 §3.1 objective (saturating) | `m7/env.js` |
| **M7-ERR-05** | Frozen §18.3 E1 gate scope | `main.js`, `m7/verify_e1e2.js` |
| **M7-ERR-06** | Frozen G3, G6, G11 operationalisation | `main.js`, `m7/_armrun.js`, `m7/verify_M7.js` |
| **M7-ERR-07** | Frozen §3.5 acceptance predicate; §5.1/§12.3 held-out semantics; unfrozen `maxTries` | `m7/env.js`, `m7/verify_env.js`, `m7/verify_M7.js` |
| **M7-ERR-08** | **Frozen §9.1 "not equal" clause and 4.5% attribution; §14 G8 sub-clauses (ii) and (iii)** | `m7/verify_G8.js` |

---

## STATUS: ERRATUM ISSUED · FROZEN DOCUMENT UNMODIFIED

Digest `2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9` validates unchanged. No production file altered. F2b not repaired. The §9.2 exclusion remains active and non-empty. No Stage 1, pilot, or confirmatory run. Held-out block `900500–900529` uninspected. Nothing committed, nothing pushed.
