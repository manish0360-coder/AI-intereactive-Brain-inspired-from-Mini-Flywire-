# UQ-B Pre-Registration — Erratum 02

**Erratum ID:** UQB-ERR-02

**Date:** 2026-09-09
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-09-09 — *Milestone 2B, second erratum and corrected
methodology freeze*, following the corrected state-closure audit (`1b4bb02`) and the R2
implementation milestone (`655fe42`).

**Binds to frozen artifacts:**

| | |
|---|---|
| Document | [`UQB_PREREGISTRATION.md`](UQB_PREREGISTRATION.md) v1.0 (frozen 2026-09-09, `3b3d195`) |
| **SHA-256** | **`bc655022b63e8022ed6427001da6a90eb2f9ec139cf413ab367e9bc7269ba46e`** |
| Predecessor erratum | [`UQB_PREREGISTRATION_ERRATUM_01.md`](UQB_PREREGISTRATION_ERRATUM_01.md) (frozen 2026-09-09, `84c738e`) |
| **SHA-256** | **`10e0981df5e4eec78e6c77f5bb9c94c852d36525ce61cd66f12165ae3c64b9e1`** |
| Verify | `cd research/preregistrations && sha256sum -c UQB_PREREGISTRATION.sha256 UQB_PREREGISTRATION_ERRATUM_01.sha256` |

> **NEITHER FROZEN ARTIFACT IS MODIFIED BY THIS ERRATUM.** The bytes and digests of both the v1.0
> pre-registration and UQB-ERR-01 are unchanged, verified immediately before and immediately after.
> This document corrects one factual claim in UQB-ERR-01 and extends one authorisation **by
> reference**; it rewrites neither, and both remain the historical record of what was specified.

---

## 0. Purpose, stated first

UQB-ERR-01 §2 asserted that *"the readout state closure is exactly one binding:
`transitionUncertaintyMap`."* **That claim is wrong**, and it is wrong because the audit it rested on
used an incorrect function boundary.

The corrected audit establishes a **second** readout contamination pathway, `regulateBiology`
(`main.js:2822`), and this erratum records it, records the corrected boundary, and authorises the
minimal control — **for the UQ-B readout only**.

**No scientific decision changes.** §10 below enumerates every frozen element and confirms each
untouched. The hypothesis, the estimands, and the measured quantity are exactly as frozen.

**Implementation is NOT authorised by this erratum.** §12.

---

## 1. Correction to UQB-ERR-01 §2 — the closure claim

**UQB-ERR-01 §2 concluded, and this is the sentence being corrected:**

> **The readout state closure is exactly one binding: `transitionUncertaintyMap`.**

**Corrected, by reference:**

> **UQB-ERR-01 §2 (corrected).** The readout state closure over the complete `runPrediction` body is
> **seven** module-level writers, of which **two** are cross-call contamination sources:
> `getTransitionUncertainty` (`predictionError.js:578–598`, already controlled by R2) and
> **`regulateBiology` (`main.js:2822`, not yet controlled)**. The "exactly one binding" claim was an
> artefact of a truncated audit boundary, corrected in §2 below.

**What in UQB-ERR-01 survives unchanged, and this is most of it.** Its G12 and G13 corrections remain
correct; its §4 extension of §15 to `render/predictionError.js` remains in force; its §5 addition to
§8 remains in force; its §6 scientific boundary remains binding; its §8 acceptance condition —
**J1 = exactly 0/19** — remains binding and is not weakened. R2 itself is unaffected and remains
verified.

**A note on scope, so the correction is not overstated.** G12's *enumerated list* of learning-mutating
calls is confirmed correct even over the previously unaudited region: **no** `updateQ`, `setQ`,
`dampQ`, `recordAttempt`, `recordSuccess`, `recordTraversal`, `reinforcePath`, `weakenPath`,
`recordSemanticEdge`, `episodeRecordNode`, `rewardCurrentEpisode`, `sealCurrentEpisode`,
`rebuildSchemas` or `runConsolidationPass` appears anywhere in `main.js:1390–3033`. The gap was in
cognitive/behavioural state, not in learning state.

## 2. The `runPrediction` boundary, established structurally

> **`runPrediction` spans `main.js:1390–3033`** — 1,644 lines — determined by a brace-depth walk from
> the declaration over comment- and literal-stripped source, not inferred from any internal construct.

The earlier audit used `1390–2722`. **`2722` is where the `STEPS` loop closes**, an internal boundary,
not the function exit. **311 lines were unaudited, and both newly-identified writers lie within them.**

This boundary is mechanically guarded: `verify_uqb_impl.js` control **J3** recomputes it and fails if
it is truncated again; control **J4** enumerates cognitive-state writers reached from `runPrediction`
that are not yet controlled.

## 3. `regulateBiology` — the second readout contamination pathway

**Recorded as an established source fact:**

> `regulateBiology` (`main.js:2822`) is called **once per `runPrediction` invocation**,
> unconditionally, with `activity: 1, mentalLoad: STEPS`. It is **deterministic** — it consumes no
> randomness. It writes nine module-level `export let` bindings in `render/behavior.js`:
> `curiosityState`, `confidenceState`, `stressState`, `fatigueState`, `focusState`, `energyState`,
> `exhaustionState`, `restingState`, `loopStressState`. **These writes accumulate.**
>
> Five of the nine — `curiosityState`, `confidenceState`, `stressState`, `fatigueState`, `focusState`
> — enter the `calculateDecisionScore` context directly at `main.js:2107–2111`, inside the candidate
> loop. Separately, `updateMotivationalState` (`:1560`) recomputes the six drives from those same
> states and `dominantDrive` enters the context at `:2074`. `epsilon` (`:2326`) reads `fatigueState`.

**The accumulation is an artefact of the readout procedure, not the phenomenon.** In normal execution
one `runPrediction` accompanies one agent step, so biological ageing tracks experience. In a readout
sweep, 19 states × 20 arrangements = **380 calls** advance the biology by 380 steps while **zero**
actions are executed. The accumulation is a function of how many times the policy is interrogated,
which is a property of the measurement design.

## 4. Ordering — `regulateBiology` executes after `bestChoice` is determined

**Recorded as an established source fact:**

```
main.js:1492   STEPS loop opens
main.js:2360   choices.sort(...)          <- the ordering that selects the winner
main.js:2365   bestChoice = sorted[0]     <- THE MEASURED QUANTITY (§8, at step === 0)
main.js:2722   STEPS loop closes
main.js:2822   regulateBiology(...)       <- the nine writes occur HERE
main.js:3033   runPrediction exits
```

> **Within a single `runPrediction` call, `regulateBiology` executes strictly after `bestChoice` has
> already been determined.**

## 5. Current-call measurement neutrality is distinct from cross-call contamination

The distinction is load-bearing and is recorded explicitly so neither half is later mistaken for the
other:

- **Current-call measurement neutrality.** Because of §4, `regulateBiology` **cannot** alter the
  `bestChoice` measured in the same call. That value is already fixed when the writes occur. This is a
  **structural** property of the call ordering, not an empirical observation.
- **Cross-call contamination.** The writes are persistent. On **subsequent** `runPrediction` calls the
  drifted states are read at `:2107–2111`, `:1560`/`:2074` and `:2326`, so they **can** affect the
  `bestChoice` measured by those later calls. This pathway is real, is established from source, and is
  the reason a control is authorised.

**Consequently, the control authorised in §8 cannot change any measured value in its own call. It can
only prevent one readout from perturbing the next.**

## 6. Fixture evidence — recorded as fixture-specific, not as proof of inertness

**Exact fixture:** `configSeed 100026`, `configIndex 0`, `agentSeed 20260819000`, M7 arm `A1`, `300`
ticks, goal `8`. Outside `897000–897999`, outside every consumed block, far below the held-out floor.
**Exact procedure:** boot and run once; then take the full 19-state readout 21 times in sequence,
guard-off, R2 freeze on, reseeding `initRng(700000 + u)` per readout.

**Observed:** the behaviour states drift monotonically — `exhaustionState` 32.49 → 100.00, saturating
at pass 10; `fatigueState` 30.48 → 55.75; `stressState` 3.39 → 9.04; the dominant drive flips
`boredom → fatigue` at pass 10. The RNG canary diverges from pass 2. **Across all 21 passes — 399
readouts — `bestChoice` changed at 0 of 19 states.**

> **This 0/19 result is evidence about ONE fixture at 300 ticks. It is NOT proof that the pathway is
> inert, and it may not be cited as such.** §3 and §5 establish the causal path from source; a single
> non-observation cannot refute a path that is present in the code. The frozen study runs 3,000 ticks
> over up to 96 configurations.

## 7. The C2 ordering confound

**Recorded, because it is the reason this matters for the frozen statistic rather than merely for
tidiness:**

> The readout driver iterates arrangements in the outer position and states in the inner position, so
> **arrangement 0 — the observed identity arrangement, the very quantity §12's discriminator compares
> against all 19 shuffles — is always measured at the least-aged cognitive state**, and arrangement 19
> at the most-aged. Any effect of the drift on `bestChoice` is therefore **systematically correlated
> with arrangement index**, in exactly the comparison that decides `H_redistribution`. The sign of
> such an effect cannot be established a priori.

This is the same class of defect for which `PLANNING_DISCRIMINATOR_ANALYSIS.md` rejected the
fixed-readout-order alternative, arriving through a different mechanism.

## 8. Authorisation — guarded in-memory suspension, UQ-B readout only

**Extending frozen §15 and UQB-ERR-01 §4, by reference:**

> **§15 (further extended).** The in-memory guarded transform may additionally cover
> `render/behavior.js`, for the **sole** purpose of suspending the persistent writes performed by
> `regulateBiology` during a §8 readout.
>
> **During UQ-B readout, persistent writes caused by `regulateBiology` are suspended so that repeated
> arrangement measurements probe the same pre-readout cognitive state rather than progressively ageing
> the agent across arrangement order.**
>
> The transform **must**: suspend only those persistent writes; leave every returned value and every
> other behaviour unchanged; introduce **no new export**; modify **no** file on disk; and be
> **default-off**, so that with the guard unset the build is behaviourally identical to the committed
> runtime.
>
> **Unchanged and still binding:** no production source modification on disk, no new export from any
> `render/` module, no new M7 arm. Gate **G9** (`verify_G9.js`) is unaffected because the committed
> export surface is untouched.

**This is an experimental measurement control, not a production architecture change.** Outside the
UQ-B readout, `regulateBiology` behaves exactly as committed, and normal production behaviour is
preserved in full.

**What this control does NOT assert.** It does **not** claim, and may never be cited as claiming, that
biological or cognitive state is irrelevant to the agent's behaviour, that `regulateBiology` is
unimportant, or that the architecture would be improved by its absence. It asserts only that a
*measurement* which interrogates the policy 380 times must not age the agent 380 steps in the process.

## 9. `generateExpectation` requires no control

**Recorded so a future audit does not rediscover it as a surprise:**

> `generateExpectation` (`main.js:3007`) writes `activeExpectation`, a private `let` in
> `render/predictionError.js`, and also executes after `bestChoice` is determined. **It requires no
> control for this readout**, because its relevant consumer is `evaluatePredictionError`
> (`main.js:3997`), which is inside `runAgent` and is **never called from `runPrediction`**. No
> readout reads `activeExpectation`, so it cannot influence any measured `bestChoice`.

For completeness, two further writers are recorded as requiring no control: `getLocalEmotion`
(`:1899`) only materialises an all-zero default and never alters an existing value; and
`lastArbitrationBreakdown` (`scoring.js`, written at `:2055`) is consumed within its own candidate
iteration. `setAttentionSpotlight` (`:2696`) writes visual state referenced nowhere outside
`neuronVisuals.js`.

## 10. Every frozen scientific decision, confirmed unchanged

| Frozen element | Status |
|---|---|
| C1 estimand (§2, §11) | **UNCHANGED** |
| C2 estimand and null `H_redistribution` (§2, §5.2) | **UNCHANGED** |
| §5.1 exposure — `futureBonus` delivered as exactly 0, dual-path | **UNCHANGED** |
| §6 term-level `futureBonus` permutation | **UNCHANGED** |
| §7 population — all 19 decision states, no arrival conditioning | **UNCHANGED** |
| §8 `bestChoice` readout at step 0, **before the ε override** | **UNCHANGED** |
| §9 oracles | **UNCHANGED** |
| §10 statistic and phase separation, never pooled | **UNCHANGED** |
| §12 discriminator — strictly greater than all 19 | **UNCHANGED** |
| §12 tie rule — ties do not reject, no post-hoc tie breaking | **UNCHANGED** |
| §12 ABLATED wiring control | **UNCHANGED** |
| `K = 19`, `α = 1/(K+1) = 1/20` (§25) | **UNCHANGED** |
| §18 minimum — 20 complete accepted configurations | **UNCHANGED** |
| §19 complete-range enumeration, no early stop | **UNCHANGED** |
| §19 `INCONCLUSIVE — INSUFFICIENT MATERIAL` rule | **UNCHANGED** |
| §17 seed block `897000–897999` | **UNCHANGED** |
| §19 no adaptive extension | **UNCHANGED** |
| §24 no post-result additions or relaxations | **UNCHANGED** |
| §13 statistics policy and multiplicity treatment | **UNCHANGED** |
| §23 interpretive limits | **UNCHANGED** |
| UQB-ERR-01 §8 acceptance — **J1 = exactly 0/19** | **UNCHANGED, and not weakened** |

## 11. No change to the hypothesis or the estimand

The scientific question is exactly as frozen: whether the assignment of `futureBonus` values to the
candidates that generated them carries information relevant to correct action selection. **No
estimand, exposure, population, statistic, discriminator, threshold, seed range, sample size, stopping
rule or acceptance criterion is altered by this erratum.**

## 12. Implementation is a separate milestone

**This erratum authorises the control; it does not implement it.** Implementation and verification of
the `regulateBiology` suspension are a **separate, Director-authorised milestone**, and no part of it
may begin on the authority of this document alone.

**No gate is weakened by this erratum.** J1's acceptance remains **exactly 0/19**; J4 remains a
failing control until the authorised repair is implemented and verified; and every existing assertion
in `verify_uqb_impl.js` stands unmodified.

## 13. State at issue

No UQ-B configuration seed from `897000–897999` has been generated, evaluated or inspected. No
collection has been run. The `regulateBiology` control is **not** implemented at the time this erratum
is frozen. Production source is unchanged on disk. The frozen UQ-B v1.0 and UQB-ERR-01 digests both
revalidate.

**This erratum authorises the control described in §8 and nothing else. It does not authorise the main
collection.**
