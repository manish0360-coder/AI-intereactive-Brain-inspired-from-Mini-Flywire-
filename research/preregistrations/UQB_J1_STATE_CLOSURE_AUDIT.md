# UQ-B J1 — READOUT STATE-CLOSURE AUDIT

**Status:** READ-ONLY FEASIBILITY AUDIT. **No implementation. No protocol change.**
**Date:** 2026-09-09 · **Authority:** Director ruling of 2026-09-09, J1 feasibility gate.
**Frozen protocol:** `UQB_PREREGISTRATION.md` v1.0, `3b3d195`, digest `bc655022…d8dd88` — untouched,
digest revalidates.

**Scope.** No experiment run, no configuration seed from `897000–897999` generated, evaluated or
inspected, no production source modified, no liveness re-run, no scientific result produced. Every
finding below is from committed source.

---

## 1. Complete readout state closure

Method: (a) every function called inside `runPrediction` (`main.js:1390–2722`); (b) for each, whether
its body writes a module-level binding; (c) every top-level mutable binding in every `render/` module;
(d) every exported `get*`/`is*` in `render/` that writes module state; (e) `main.js`'s own top-level
bindings written during `runPrediction`. Comments and string literals stripped in one pass before
brace-depth analysis.

| Binding | Location | Written by | Read by decision path? | Carries across readouts? |
|---|---|---|---|---|
| **`transitionUncertaintyMap`** | `predictionError.js:503` — **private, no export** | `getTransitionUncertainty` — **decays `×0.998` and writes back on every read** (`:578–598`) | **YES** — `main.js:2130`, inside the candidate loop, into `transitionUncertainty:` of the scoring ctx | **YES — this is J1** |
| `localEmotionMap` | `emotionMap.js` — private | `getLocalEmotion` (`:33`) — lazily creates an **all-zero** default | YES — `main.js:1899` | **No.** It never changes an existing value; it only materialises a default. Read-idempotent. |
| `lastArbitrationBreakdown` | `scoring.js` — exported | `calculateDecisionScore` | Read immediately after the write, same candidate iteration | **No.** Write-then-read within one iteration. |
| `liveFutureBonus` | `scoring.js:58` — exported | `calculateDecisionScore` | HUD only (fact G8: `hud.js` has no imports and touches only `document`) | **No.** Behaviourally inert. |
| `hungerDrive`, `boredomDrive`, `stressDrive`, `fatigueDrive`, `socialDrive`, `uncertaintyDrive` | `motivationalState.js` — exported | `updateMotivationalState` (`main.js:1560`) | YES, via `dominantDrive` | **No.** Every drive is assigned with `=`, a pure function of its arguments plus `getSuccessRate()`. It is a derived cache, not accumulated state. |
| `_attentionTargets` | `neuronVisuals.js` — private | `setAttentionSpotlight` (`main.js:2696`, inside the `step === 0` HUD block) | **No** — the identifier appears nowhere outside `neuronVisuals.js`, and not in `main.js` | No. |
| `lastDecision` | `main.js:660` | `runPrediction` | **No** | No. |
| `window.lastReasoning` | `main.js:2635` | `runPrediction` | No — read by `runAgent`, not by the readout's decision | No. |
| RNG streams | `instrumentation/rng.js` | `scoring.js:211` (once per candidate), `main.js:2353`/`:2356` (epsilon) | YES | **Already controlled** — the driver reseeds per `(state, arrangement)` via `initRng`. |

**Across the entire `render/` tree there are exactly TWO read-mutating accessors**
(`getLocalEmotion`, `getTransitionUncertainty`), both in the decision path, and **only one is
non-idempotent.**

> **The closure is one binding: `transitionUncertaintyMap`.** Every readout that evaluates a candidate
> decays that candidate's stored uncertainty by 0.2%, permanently. Over a 19-state × 20-arrangement
> sweep that is thousands of decays in a quantity that feeds the score. This is J1's mechanism, and it
> matches the measured signature exactly: identity vs the *first* guard-off pass 0/19, first vs *last*
> 1/19.

**Two frozen facts are incomplete as written, and this is the correction:**

- **G12** ("`runPrediction` contains no learning-mutating call") listed learning-mutating *calls* and
  missed read-mutating *accessors*. `runPrediction` **does** mutate persistent learned state, through
  `getTransitionUncertainty`.
- **G13** ("consecutive readouts cannot contaminate one another") followed from G12 and inherits the
  same gap.

Neither error changes any estimand, exposure, population, statistic or discriminator.

---

## 2. Snapshot/restore feasibility

**Snapshot/restore in the literal sense: INFEASIBLE.** `transitionUncertaintyMap` is declared
`const … = new Map()` at `predictionError.js:503` and is **not exported**. No setter, whole-map getter
or reset exists (`resetExpectation` targets `activeExpectation`). Restoring it from outside would
require a new export from a `render/` module, which frozen **§15 forbids** ("No new export from any
`render/` module — M7 gate G9").

**But the objective is achievable by a strictly smaller means: prevent the mutation rather than undo
it.** The frozen §15 sanctions the in-memory ESM load-hook transform and forbids only on-disk
modification and new exports. A guarded no-write branch is neither.

> **VERDICT: FEASIBLE**, via a guarded transform that makes the readout non-mutating — which does not
> merely work around G12, it makes G12 **true**.

Two committed gates constrain the design and both are satisfied, because each reads the **committed**
file from disk while the transform is in memory:

- `verify_S6.js:80–82` pins the **source text** of `getTransitionUncertainty` byte-for-byte.
- `verify_G9.js:86` pins the **export surface** of `predictionError.js`.

A third committed fact must be surfaced: `peekTransitionUncertainty` (`:568`) already exists, is
already exported, and is a genuinely non-mutating read — but its own header states it is
*"MEASUREMENT ONLY — must never be called from the agent decision path (asserted by gate M6.8)."*

---

## 3. Minimal repair design — two variants, R2 recommended

### R2 — freeze the write, keep the value (RECOMMENDED)

**File transformed in memory:** `render/predictionError.js`, inside `getTransitionUncertainty` only.
**Change:** under a guard, skip the two persistence statements — `transitionUncertaintyMap.delete(key)`
(`:590`) and `transitionUncertaintyMap.set(key, decayed)` (`:594`) — and return the value the
committed code would have returned.

- **Value semantics preserved exactly.** The returned number is still `raw × 0.998` with the
  `< 0.005 ⇒ 0` rule. Only persistence changes.
- **Same-state invariant.** With the map frozen, all 20 arrangements read identical values at every
  state, in both arms.
- **Production default unchanged.** Guard unset ⇒ one falsy global read; byte-identical behaviour,
  provable by the same `I1`-style no-op assertion already used for `main.js`.
- **No new export. No on-disk change.** `verify_S6` and `verify_G9` continue to pass against the
  committed file.
- **RNG.** `getTransitionUncertainty` consumes no randomness; the driver already reseeds per
  `(state, arrangement)`.

### R1 — route the readout to `peek` (smaller, but changes the measured value)

Transform `main.js:2130` only, routing to the already-exported `peekTransitionUncertainty` under the
guard. Touches **no** `render/` module. **Rejected as primary** because `peek` returns the *undecayed*
`raw` without the `< 0.005 ⇒ 0` rule, so the readout would consume a slightly different input than the
committed decision path computes — and because it puts a declared measurement-only accessor into the
decision path, against gate M6.8's stated intent.

### How the invariant would be proven

Extend `verify_uqb_impl.js`: (i) guard-off byte-identity of the `predictionError.js` transform;
(ii) the existing J1 control — the same guard-off readout before and after the sweep — must reach
**0/19**; (iii) a new control asserting the map is byte-identical before and after a full sweep;
(iv) E1's like-for-like comparison must still hold; (v) all existing 60 assertions unchanged.
**J1 is the acceptance test and must not be weakened.**

---

## 4. Alternative A — freeze readout order and accept drift: REJECTED

It does not solve J1, and it is worse than merely weaker.

Fixed order buys **reproducibility**, not **same-state comparison**. Arrangement 19 would still be read
against a more-decayed map than arrangement 0. The manipulated variable would be *futureBonus
assignment + accumulated decay*, and the confound would be **monotonically ordered with arrangement
index**.

> **This is specifically dangerous for C2.** Arrangement 0 *is* the observed identity — the quantity
> the test compares against all 19 shuffles. Under fixed order it always runs first, against the
> least-decayed map. The observed arrangement would receive a systematic, arrangement-index-correlated
> advantage or disadvantage in exactly the comparison that decides `H_redistribution`, and its sign
> cannot be established a priori.

A confound that is deterministic is still a confound, and one aligned with the test statistic is the
worst kind.

## 5. Alternative B — amend §6.2/G13 to permit drift: REJECTED

It renames the problem. §6.2 requires arrangements to be compared under "the same state"; permitting
drift by erratum does not make the comparison isolate `futureBonus`, it abandons the isolation while
keeping the language of it. It also falls squarely inside the Director's stated non-acceptance list
("deterministic drift", "fixed readout order", "the decisions happened to remain unchanged").

**An erratum IS still required — but for the factual correction to G12/G13, not to license the drift.**

---

## 6. Scientific verdict

**R2 best preserves the frozen estimand and causal isolation, and it is the only option that makes the
protocol's own stated property true rather than reinterpreting it.**

Under R2 the only difference between arrangement 0 and each of the 19 shuffles is the frozen §6
term-level assignment of `futureBonus`. Under A or B, the difference is that assignment *plus* an
arrangement-ordered decay confound.

R2's honest cost, stated: within a readout, a transition read at more than one step no longer decays
between those reads. That is a behavioural change **inside the probe**, not in the agent's own
execution — and it is what §8's "with learning frozen" already asserts should be the case.

---

## 7. Required pre-freeze change

An erratum to the frozen pre-registration is required. **It changes no scientific decision** — no
estimand, exposure, population, statistic, discriminator, `K`, `α`, minimum evidence, stopping rule or
seed block.

1. **Correct G12/G13.** `runPrediction` does mutate persistent learned state, via
   `getTransitionUncertainty`'s decay-on-read (`predictionError.js:578–598`). Readouts are therefore
   not independent by default.
2. **Amend §15** to state that the in-memory guarded transform may also cover
   `render/predictionError.js`, for the sole purpose of suspending persistence during a readout, with
   the standing prohibitions on on-disk modification and new exports **unchanged**.
3. **Amend §8** to record that the readout is taken with `transitionUncertaintyMap` persistence
   suspended, so that "with learning frozen" is literally true.

---

## 8. Next milestone

**Implementation and verification of R2 only, and only on explicit authorisation.** Extend the hook to
`render/predictionError.js`; add the guard; extend the verifier with the four controls in §3; require
**J1 to reach 0/19** as the acceptance test.

**Ordering matters:** the erratum in §7 must be frozen and pushed **before** the repair is
implemented, so no protocol text is written after seeing repair results. That is UQ-A §14a's ordering
discipline applied to an erratum.

**Not authorised by this audit:** any implementation, any protocol edit, the main collection, or any
consumption of `897000–897999`.
