# UQ-B J1 — CORRECTED READOUT STATE-CLOSURE AUDIT (Milestone 2A)

**Status:** READ-ONLY AUDIT. **No implementation. No protocol change. No repair.**
**Date:** 2026-09-09 · **Authority:** Director ruling of 2026-09-09, Milestone 2A.
**Supersedes:** the closure claim in `UQB_J1_STATE_CLOSURE_AUDIT.md` (`e77de21`) §1 and in
`UQB_PREREGISTRATION_ERRATUM_01.md` §2, both of which were computed over a truncated span.

**Frozen artifacts, untouched, digests revalidated:** UQ-B v1.0 (`bc655022…`), UQB-ERR-01
(`10e0981d…`).

**Scope compliance.** No repair implemented, no production source modified, no frozen document
changed, `regulateBiology` not frozen, no collection run, **no seed from `897000–897999` generated,
evaluated or inspected**, J1 not weakened, no estimand or C1/C2 change, no ad-hoc exception added.

---

## 1. Correct function boundary — established structurally

Brace-depth walk from the declaration, over comment- and literal-stripped source:

```
entry  main.js:1390   function runPrediction(startKey) {
exit   main.js:3033   }                                     1,644 lines
```

**The previous audit used 1390–2722.** That is where the `STEPS` loop closes — an *internal* boundary
— not the function exit. **311 lines were never audited**, and both newly-found writers live there.

**Structural guard: already present, no verifier change made.** `verify_uqb_impl.js` control **J3**
(added at `655fe42`) recomputes this boundary by brace-depth and fails if it is not `1390..3033`.
**J4** enumerates cognitive-state writers reached from `runPrediction` but not frozen. Per the
Director's §7, no further verifier change was necessary, so none was made.

---

## 2. Complete state closure over 1390–3033

Method: every symbol called in the true span; for each, whether its body writes a module-level
binding; every top-level mutable binding in each writer's module. Comments and string literals
stripped in one pass before brace-depth analysis.

**Seven writers. Two were invisible under the truncated span.**

| # | Writer | main.js | Class | State written | Persistent? | Affects scoring? | Affects `bestChoice`? | Affects epsilon? | Affects C1/C2? | Controlled? |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `updateMotivationalState` | 1560 | D | 6 drives (`motivationalState.js`, exported) | **No** — every drive assigned with `=`, a pure function of its arguments. A derived cache, not accumulated state | yes, via `dominantDrive` (`:2074`) | as a **conduit** only | no | conduit | n/a — carries nothing itself |
| 2 | `getLocalEmotion` | 1899 | D | `localEmotionMap` (`emotionMap.js`, private) | **No** — materialises an all-zero default; never changes an existing value | yes (`localConfidence`…) | read-idempotent | no | no | not needed |
| 3 | `calculateDecisionScore` | 2055 | E | `liveFutureBonus`, `lastArbitrationBreakdown` (`scoring.js`, exported) | **No** — breakdown is written and read inside one candidate iteration; `liveFutureBonus` is HUD-only (G8) | it *is* the scoring | no | no | no | not needed |
| 4 | `getTransitionUncertainty` | 2130 | C | `transitionUncertaintyMap` (`predictionError.js`, private) | **YES** — decays ×0.998 and writes back **on read** | yes (`transitionUncertainty`) | **yes, before the probe** | no | yes | **FROZEN by R2** (`655fe42`), proven over 2,647 samples |
| 5 | `setAttentionSpotlight` | 2696 | F | `_attentionTargets` (`neuronVisuals.js`, private) | yes | no — referenced nowhere outside its module | no | no | no | not needed |
| 6 | **`regulateBiology`** | **2822** | **D** | **9 states** (`behavior.js`, exported): `curiosityState`, `confidenceState`, `stressState`, `fatigueState`, `focusState`, `energyState`, `exhaustionState`, `restingState`, `loopStressState` | **YES — accumulating** | **yes** — 5 of the 9 enter the scoring ctx at `:2107–2111` | **yes, but only on SUBSEQUENT calls** — see §4 | yes (`:2326`) | **yes** | **NOT controlled** |
| 7 | **`generateExpectation`** | **3007** | E | `activeExpectation` (`predictionError.js`, private `let`) | yes | no | **no** — its only consumer is `evaluatePredictionError` at `main.js:3997`, inside `runAgent`, never inside `runPrediction` | no | no | not needed for UQ-B; a leftover mutation, recorded |

**Classification key:** A local/ephemeral · B RNG · C learning · D cognitive/behavioural ·
E measurement/readout-only · F unrelated/external.

**RNG state (class B), audited separately.** `scoring.js:211` draws once per `calculateDecisionScore`
call; `main.js:2353`/`:2356` are the epsilon draws. The readout driver reseeds via `initRng` per
`(state, arrangement)`. `regulateBiology` consumes **no** randomness (0 draws — deterministic).
`permute.js` imports nothing and uses its own generator (§6.6).

**Learning state (class C):** the only learning-state mutation in the whole span is #4, and it is
frozen. **No `updateQ`, `setQ`, `dampQ`, `recordAttempt`, `recordSuccess`, `recordTraversal`,
`reinforcePath`, `weakenPath`, `recordSemanticEdge`, `episodeRecordNode`, `rewardCurrentEpisode`,
`sealCurrentEpisode`, `rebuildSchemas` or `runConsolidationPass` appears anywhere in 1390–3033** —
so G12's *enumerated list* survives the correction intact, including over the region it never saw.

**Corrected count.** The closure is **two** cross-call contamination sources, not one: #4 (frozen) and
#6 (open). ERR-01 §2's "exactly one binding" was wrong because the span was.

---

## 3. `regulateBiology` — traced

**Call.** `main.js:2822`, once per `runPrediction` invocation, with `activity: 1, mentalLoad: STEPS`.
Unconditional. **Deterministic** — no RNG.

**Writes** (all `export let` in `render/behavior.js`, module-level, accumulating):
`energyState -= activity*0.4` and `-= mentalLoad*0.25` · `exhaustionState += repetition*0.05`,
`+= danger*0.08`, `*= 0.995` · `fatigueState = f(exhaustion, energy)` · `stressState +=`/`*=` ·
`confidenceState *= 0.99995`/`*= 0.997` · `curiosityState *= 0.997`/`*= 0.998` ·
`loopStressState +=`/`*= 0.992` · `restingState`, `focusState`.

**Storage.** `export let` bindings in `render/behavior.js`. ESM live bindings are **read-only to
importers**, so external restore is impossible without new setters — which frozen §15 forbids.

**Which readout paths read them.** `main.js:2107–2111` places `curiosityState`, `confidenceState`,
`stressState`, `fatigueState`, `focusState` **directly into the `calculateDecisionScore` context,
inside the candidate loop**. Separately `updateMotivationalState` (`:1560`) recomputes the six drives
from those same states, and `dominantDrive` enters the ctx at `:2074`. `epsilon` (`:2326`) reads
`fatigueState`.

**Accumulation is necessary, not incidental.** Each call applies the same deterministic deltas, so *n*
readout calls advance the biology by *n* steps regardless of what the agent does.

> **Artifact or phenomenon?** **Artifact of the readout procedure.** In normal execution one
> `runPrediction` accompanies one agent step, so biological ageing tracks experience — that is the
> phenomenon. In a readout sweep, 19 states × 20 arrangements = **380 calls** age the agent by 380
> steps while **zero** actions are executed and zero time passes in the agent's world. The
> accumulation is a function of how many times we chose to interrogate the policy, which is a
> property of the measurement design, not of the agent.

---

## 4. Greedy-policy measurement vs execution dynamics — the decisive ordering

The §8 readout observes `bestChoice` at `main.js:2365`, at `step === 0`, before the epsilon override.

```
main.js:1492   STEPS loop opens
main.js:2107   curiosityState/confidenceState/stressState/fatigueState/focusState -> scoring ctx
main.js:2253   arbitratedScore = finalWeight*0.60 + competitiveScore*0.40
main.js:2326   epsilon computed (reads fatigueState)
main.js:2353   epsilon draw           <- AFTER the score vector is complete
main.js:2360   choices.sort           <- bestChoice determined here
main.js:2365   bestChoice = sorted[0] <-- THE MEASURED QUANTITY
main.js:2722   STEPS loop closes
main.js:2822   regulateBiology(...)   <-- writes the 9 states
main.js:3033   runPrediction exits
```

**Answer to the mandated question — it is BOTH, but with a decisive temporal separation:**

1. **Candidate scoring / sorting: YES**, via `:2107–2111` and `:2074` → `calculateDecisionScore` →
   `finalWeight` → `arbitratedScore` (`:2253`) → `sort` (`:2360`) → `bestChoice` (`:2365`). This is a
   confirmed source-level path to the measured quantity, **not** an epsilon-only effect.
2. **Epsilon override: YES**, separately, via `fatigueState` at `:2326`. This path cannot touch
   `bestChoice`, which is chosen by the sort at `:2360` from a score vector already complete before
   the draw at `:2353`.

> **THE ORDERING RESULT, and it is the most useful finding in this audit:**
> `regulateBiology` runs at `:2822`, **after** the loop that determines `bestChoice` at `:2365`.
> Within a single `runPrediction` call it therefore **cannot** affect that call's measured value.
> Its entire influence on the measurement is on **subsequent** calls.

The same holds for `generateExpectation` (`:3007`) and `setAttentionSpotlight` (`:2696`, inside the
`step === 0` HUD block after `:2365`).

---

## 5. Is J1 testing the correct invariant?

**J1 is not modified.** The requirement it should encode:

> For a repeated full-population `bestChoice` readout to be scientifically valid, **every state that
> can influence the step-0 score vector must hold the same value at the start of every readout.**
> Concretely: the learned representation, `transitionUncertaintyMap`, and the nine `behavior.js`
> states, since five of those enter the scoring context directly and the drives are recomputed from
> them.

Against the actual closure: **#4 is now controlled; #6 is not.** So the invariant is **not**
satisfied, and J1's 1/19 is a true signal rather than a stale one.

**Contamination pathway, stated explicitly:**

```
readout n   -> regulateBiology (:2822) -> behavior.js states drift
readout n+1 -> those states enter the scoring ctx (:2107-2111) and the drives (:1560, :2074)
            -> calculateDecisionScore -> finalWeight -> arbitratedScore -> sort -> bestChoice
```

**And the confound is systematically ordered.** The driver iterates `for j { for u }`, so
**arrangement 0 — the observed identity, the very quantity C2 tests against all 19 shuffles — is
always measured at the youngest biology**, and arrangement 19 at the oldest. That is precisely the
arrangement-index-correlated structure the discriminator analysis rejected Alternative A for, now
arriving through a different door.

---

## 6. Measurement — exact fixture, exact procedure

**Fixture:** `configSeed 100026`, `configIndex 0`, `agentSeed 20260819000`, M7 arm `A1`, `300` ticks,
goal `8`. The same fixture used by the previous verification. Outside `897000–897999`, outside every
consumed block, far below the held-out floor. **No UQ-B collection seed generated, evaluated or
inspected. No adaptive sampling, no fixture search, no fixture change.**

**Procedure, deterministic:** boot and run the fixture once; then take the full 19-state readout 21
times in sequence, guard-off (no permutation), R2 freeze ON, each readout reseeding
`initRng(700000 + u)`; record `bestChoice` per state per pass, and the behaviour vector after each.

| pass | `bestChoice` changed vs pass 0 | canary changed | exhaustion | fatigue | stress | dominant |
|---:|---:|---:|---:|---:|---:|---|
| 0 | **0/19** | 0/19 | 32.49 | 30.48 | 3.39 | boredom |
| 2 | **0/19** | 1/19 | 43.96 | 34.59 | 3.77 | boredom |
| 5 | **0/19** | 14/19 | 63.77 | 41.66 | 4.50 | boredom |
| 9 | **0/19** | 19/19 | 96.06 | 53.20 | 5.49 | boredom |
| 10 | **0/19** | 19/19 | **100.00** | 54.84 | 5.74 | **fatigue** |
| 20 | **0/19** | 19/19 | 100.00 | 55.75 | 9.04 | fatigue |

**Findings, separating source fact from inference:**

- **Source fact:** the behaviour states drift substantially and monotonically; `exhaustionState`
  saturates at its ceiling of 100 by pass 10; the dominant drive flips `boredom → fatigue` at pass 10.
- **Source fact:** across all 21 passes — 399 readouts — **`bestChoice` changed at 0 of 19 states.**
- **Source fact:** the RNG canary diverges from pass 2 and is fully divergent by pass 6, which is the
  epsilon branch responding to the drift. That path cannot reach `bestChoice` (§4).
- **Inference, and its limit:** in *this* fixture the contamination did not realise as a decision
  change. **This is one fixture at 300 ticks. It is not evidence that the pathway is inert**, and it
  cannot be, because §4 establishes the pathway from source. The frozen study runs 3,000 ticks over
  up to 96 configurations.

---

## 7. Implementation

**None.** No production code, no experimental transform, no persistence guard, no export was created.
No verifier change was made: J3/J4 already provide the structural guard §1 requires.

---

## 8. Scientific decision report

> ## RULING: **C — READOUT CONTAMINATION AFFECTS `bestChoice`**

**Exact causal path** (§5, all source-confirmed):

```
regulateBiology  main.js:2822
  -> behavior.js curiosityState, confidenceState, stressState, fatigueState, focusState
  -> scoring ctx  main.js:2107-2111    (and dominantDrive via :1560 -> :2074)
  -> calculateDecisionScore -> finalWeight
  -> arbitratedScore  main.js:2253
  -> choices.sort     main.js:2360
  -> bestChoice       main.js:2365     THE MEASURED QUANTITY
```

**Why C and not B.** B would require that the state *cannot* influence the measured `bestChoice`. It
can — the path above is in the source. The fixture shows the effect did not *realise* over 21 passes,
which is a fact about one fixture, not a property of the mechanism. Ruling B on that evidence would be
inferring absence from a single non-observation, in a design where the confound is **systematically
ordered with arrangement index** and therefore aligned with the C2 statistic.

**Why not D.** The instrument is salvageable. The closure over the true span is now complete and
**bounded at seven writers**, of which exactly two are cross-call contamination sources — one already
controlled, one not. This is an enumerable list, not an open-ended one.

### The smallest scientifically defensible control — identified, NOT implemented

> Suspend `regulateBiology`'s writes for the duration of a readout, by the same guarded, default-off,
> in-memory technique R2 uses.

**Its consequence is unusually clean, and this is the key point.** Because `regulateBiology` runs at
`:2822`, strictly **after** `bestChoice` is determined at `:2365`, suspending it **cannot change any
measured value in its own call**. It can only stop a readout from perturbing the *next* readout.

> **It is measurement-neutral by construction — a stronger property than R2 had.** R2 suspended a
> mutation occurring *before* the measurement (inside a read at `:2130`), so its neutrality had to be
> proven empirically across 2,647 samples. This one occurs strictly after, so its neutrality is
> structural.

**Consequences, stated plainly:**

- All 380 readouts would probe the **identical end-of-run agent**, which is what §8's "at end of run"
  already asserts.
- It does **not** claim biology fails to regulate in normal execution. It regulates exactly as
  committed; only the readout stops advancing it.
- It would require a second erratum: ERR-01 §2's closure claim is wrong and must be corrected, and
  §15 would need extending to `render/behavior.js` on the same terms (no on-disk change, no new
  export, default-off).
- `generateExpectation` (`:3007`) also mutates after the measurement. It cannot affect UQ-B (its only
  consumer is in `runAgent`), so controlling it is **not** required — recorded so a future audit does
  not rediscover it as a surprise.

**One honest caveat on the same-state target.** Even with both controls, `getLocalEmotion`'s
first-touch default materialisation (#2) and `lastArbitrationBreakdown` (#3) remain mutations. Neither
can change a measured value — the first never alters an existing value, the second is consumed within
its own iteration — so neither belongs in the control set. That completes the accounting: **two
controls, seven writers, all classified.**

---

## 9. Frozen decisions preserved

UQ-B v1.0 and UQB-ERR-01 remain frozen and untouched; both digests revalidate. C1, C2, `K = 19`,
`α = 1/20`, the `897000–897999` block, the full 19-state readout, the term-level `futureBonus`
permutation and the `bestChoice`-before-epsilon measurement are unchanged and unreinterpreted.

**J1 is not fixed, and UQ-B is not ready for collection.**
