# Phase 1.0 — Agent Stabilization: Implementation Plan

**Authority:** Research Director ruling, 2026-08-18 (APPROVED, Phase 1.0 only)
**Spec:** `MF-1_REVISED_SPEC.md` §1–§3, §12
**Discipline:** one milestone → its gate → report → wait. No unrelated cleanup. No adjacent-defect fixes.

---

## Milestone status

| # | Milestone | Gate | Status |
|---|---|---|---|
| **M1** | **D3 — five sign inversions, explicit term-array refactor** | **S1.1–S1.8** | ✅ **COMPLETE — 16/16 pass** |
| **M2** | **D1 — composite `pos#goal->action` namespace + episodeManager parity** | **S2.1–S2.7** | ✅ **COMPLETE — 14/14 pass** |
| **M3** | **Q4 — pure `getQAny(pos, action)` accessor** | **S2.6a–e** | ✅ **COMPLETE (landed with M2)** |
| **M4** | **Q3 — route live `Math.random()` through seeded RNG** | **S4.1–S4.8** | ✅ **COMPLETE — 12/12 pass** |
| **M5** | **F2 — epsilon stale-action path** | **S3.1–S3.6** | ✅ **COMPLETE — 9/9 pass** |
| **M6** | **`peekTransitionUncertainty` pure accessor (instrument only)** | **M6.1–M6.9** | ✅ **COMPLETE — 18/18 pass** |
| M7 † | Q2 measurement — which subsystem updates go inactive after F2 | S3.4 | ⏸ |
| M8 | D8/F12 — measure and document only, **do not fix** | S2.5 | ⏸ |
| M9 | P5-A / P5-B / P5-C diagnostics | — | ⏸ |
| M10 | **Transition-belief calibration probe** (p = 1.0 / 0.9 / 0.7 / 0.5 / 0.3) | monotonicity | ⏸ |
| M11 | Phase 1.0 report + `c` pre-registration artifact | S6.1 | ⏸ |

> **† Milestone-numbering collision — read before citing "M7".** The row above is *this plan's* M7: a small Q2 measurement of subsystem branch migration after F2. It is **not** the same milestone as the belief experiment specified in [`M7_SCIENTIFIC_SPEC_DRAFT.md`](M7_SCIENTIFIC_SPEC_DRAFT.md), which the Director authorised under the same number on 2026-08-18/19. The two are unrelated in scope, mechanism, and cost. Until the Director renumbers one of them, cite the experiment as **"M7 (belief experiment, `M7_SCIENTIFIC_SPEC_DRAFT.md`)"** and this row as **"M7-Q2 (branch-migration measurement)"**. Recorded during the 2026-08-19 provenance correction; **not renumbered here**, because renumbering a milestone is a scope decision, not a documentation fix.

---

## Ordering decision requiring Director awareness

The spec (§1.1) mandates **D3 → D1 → F2**. The Director's approval list numbers Q3 (RNG routing) as item 5, after F2.

**I have placed Q3 (M4) *before* F2 (M5).** Reason: gate test **S3.5** requires *"with epsilon forced to 0, the action sequence is identical to the pre-fix build under the same seed."* That is unrunnable while 24 live `Math.random()` sites remain unseeded. F2's gate depends on Q3's output, so Q3 must land first.

This changes no scope and no content — only sequence. Flagged rather than assumed.

M1 (D3) needed no such dependency: `calculateDecisionScore` is a pure function and its gate is analytic.

---

## M10 — how the calibration probe runs without the deferred environment

The Director requires a controlled-failure-rate calibration probe before MF-1a, while MF-1a's environment is deferred. These are compatible: **M10 is a unit-level probe of `predictionError.js`, not an environment.**

It drives `updateTransitionUncertainty` directly with synthetic Bernoulli(p) success/failure sequences at p ∈ {1.0, 0.9, 0.7, 0.5, 0.3}, reproducing the real call pattern — including the per-candidate read decay and the per-tick `decayTransitionUncertainties()` — then reads `peekTransitionUncertainty` and compares against the true failure rate.

No hidden-transition environment is created. No agent code is modified to make the signal monotone. If it is not monotone, that is reported and **Phase 1.0 stops before MF-1a**, per the ruling.

---

## Standing constraints (carried into every milestone)

- No new cognitive modules. No architectural redesign. No weight retuning.
- No new export from any `render/` module except the two approved: `getQAny`, `peekTransitionUncertainty`.
- `peekTransitionUncertainty` must never be called from the agent decision path (asserted, not assumed).
- Q2 hoisting is **deferred** — measure the F2 branch-migration effect, do not intervene.
- D8/F12 is **deferred** — measure and document, do not fix.
- `c` for the belief→decision channel is chosen only after P5-C on real Phase 1.0 telemetry, always the **smallest** value meeting the criterion, never optimised for performance, written into a hashed pre-registration artifact before MF-1a.
- §18 claim discipline applies to every artifact. Phase 1.0 is not cognition.

---

## M1 — completed work (detail)

**Method.** Three separable steps, each independently verified, so the refactor and the repair could not be confused with one another:

1. **Refactor.** `finalWeight` rewritten from a 90-line chained `+`/`−` sum into an explicit signed term array, every sign still as it was. Proven **bit-identical to the pre-repair baseline over 200,000 random contexts** (`parity_termarray.js`), with `Math.random` stubbed deterministically so both sides saw the same `drift` draw.
2. **Repair.** Exactly five array entries negated. Diff against the pre-flip artifact is exactly five lines.
3. **Verify.** S1.1–S1.8.

**Why the array form was mandated.** While drafting the spec I attempted the naive in-place sign patch and `driveRewardBoost` did not flip — the source reads `localFear * 2.2 - driveRewardBoost +`, so changing the operator flips the *following* term. That is the same mechanism that produced D3, reproduced on the first attempt by someone who had already mapped every term.

**Artifacts** (`experiments/phase1_0/`):

| File | Role |
|---|---|
| `baseline/scoring_prefix_D3.js` | Frozen pre-repair `render/scoring.js`. Historical reference arm only. |
| `baseline/scoring_termarray_preflip.js` | Frozen intermediate: array form, signs unchanged. |
| `parity_termarray.js` | Proves baseline ≡ pre-flip array (200k contexts). |
| `verify_S1.js` | S1.1–S1.5. |
| `verify_S1b.js` | S1.5b, S1.6, S1.7, S1.8. |

The module under test is always imported **live** from `../../render/scoring.js`. The frozen copies are reference arms, never substitutes — guarding against the Phase 0 D11 anti-pattern.


---

## M2 — completed work (detail)

**Two latent blockers found during the mandatory target-verification step.** Neither is visible from the Phase 0 defect list; both would have made D1 a half-repair that silently re-created the very namespace split it exists to remove.

1. **`recordManualClick` was called with 3 arguments.** Its 4th parameter `activeGoal` defaults to `null`, so *every manually taught episode* was sealed with `activeGoal = null`. Under the composite namespace its Q would be written to `"pos#0"` while the agent read `"pos#<goal>"`. Fixed by passing `goalNeuronId` (main.js:5015).
2. **`recordAutonomousStep` never set `activeGoal` at all.** Same failure for every autonomous exploration step. Fixed by adding an optional 4th parameter (default `null`, backward compatible) and passing `goalNeuronId` (main.js:4592, episodeManager.js:359/390).

Both are inside the Director's "include episodeManager parity" instruction, not scope creep — without them the parity does not exist.

### Changes

| File | Change |
|---|---|
| `render/qlearning.js` | **+`getQAny(pos, action)`** (Q4). Pure; max Q across all goal contexts; tolerates legacy bare keys. |
| `render/episodeManager.js` | Composite Q write via injected `makeStateKey`; `recordAutonomousStep` gains optional `activeGoal`. |
| `render/embeddings.js` | 6 bare `getQ` reads → `getQAny` (prevents a silent learning-rate change). |
| `main.js` | 8 read sites → composite; `dampQ` → composite; `makeStateKey` injected into `initEpisodeManager`; `goalNeuronId` passed to `recordManualClick` and `recordAutonomousStep`. 12 edits, every anchor verified unique. |

### Headline gate results

- **S2.1** — Phase 0 Probe A inverted: **278/278** RL Q entries now readable by the scorer (baseline **0/275**).
- **S2.4** — taught episode `1→2→5→8→16` writes `1#16->2, 2#16->5, 5#16->8, 8#16->16`; all 4 readable; zero bare keys.
- **S2.7** — `dampQ` now erodes the RL-learned value and leaves an unrelated legacy key untouched.
- **S2.5** — D8/F12 measured and **confirmed still present**, per ruling: a Q key looked up in the bare-keyed `rewards` map misses, so the "gentler decay for taught paths" branch stays unreachable and everything decays at 0.999.


---

## M4 — completed work (detail)

### Site census — 24 occurrences, but only 22 are live code

| Class | Count | Sites |
|---|---|---|
| **Live · cognitive** | **18** | `main.js` ×10 (epsilon test, random candidate, 3 decay gates, 2 agent placements, think-vs-replay gate, loop decay gate, consolidation gate); `embeddings.js` createEmbedding; `episodeManager.js` ×3 (replay selection, 2 id generators); `episodicContextEngine.js` id generator; `scoring.js` drift; `semanticProvenance.js` ×2 |
| **Live · visual** | **4** | `neuronVisuals.js` pulse phase; `stars.js` ×3 |
| **Dead — inside `/* */`** | **2** | `main.js:3098,3102` — the commented-out random-goal block. Not code; correctly left untouched. |

Two of the 18 "cognitive" sites (`semanticProvenance.js`) sit in `shouldTrainEmbedding`, which Phase 0 found is imported by `main.js` and **never called**. Routed anyway so the site cannot become an unseeded landmine if it is ever wired up. Two more (`episodeManager` id generators) also embed `Date.now()`, so the resulting id *strings* stay non-reproducible — the RNG draw is now deterministic but the timestamp is not. Not fixed: out of Q3 scope, recorded below as a residual risk.

### Design

`instrumentation/rng.js` gains two additive exports. `rng()` is untouched.

```js
export function isSeeded()                 { return streams.size > 0; }
export function liveRng(stream="cognitive"){ const s = streams.get(stream);
                                             return s ? s() : Math.random(); }
```

`rng()` deliberately **throws** on an uninitialised stream — right for the offline harness, fatal in the browser where nobody calls `initRng()`. `liveRng()` is the live-path accessor with the contract that makes Q3 safe:

- **no seed** → returns exactly `Math.random()`; the application is byte-for-byte unchanged
- **seed set** → returns the named deterministic stream

Cognitive and visual draws use separate streams, so a variable number of render-frame draws can never desync the cognitive sequence — the separation `rng.js` was designed around.

### Invariants asserted

| | Invariant | Test |
|---|---|---|
| I1 | Unseeded `liveRng()` **is** `Math.random()` | S4.4a |
| I2 | Seeded draws reproduce exactly | S4.2a–c |
| I3 | Visual draws cannot perturb the cognitive sequence | S4.5 |
| I4 | No probability or threshold changed (0.1, 0.15, 0.02, 0.92, 0.05, 0.40, 0.12) | S4.7a–b |
| I5 | Routing added and removed **no** draws | S4.6 |
| I6 | `rng()`'s throwing contract preserved | S4.8 + `exec_influence/verify.js` 8/8 |

### Incidental finding — line endings

The working tree stored untouched files as **CRLF** while **HEAD is LF**. That is the pre-existing anomaly behind the "68 modified files" `git status` has shown since Phase 0 — not something this work introduced. Files written during M1/M2/M4 are LF and therefore now diff *cleanly* against HEAD; untouched files still show as whitespace-only modifications. Recorded, not fixed: normalising the other 60 files is unrelated cleanup.


---

## M5 — completed work (detail)

> **Provenance correction, 2026-08-19 (Director-authorised).** The milestone table previously recorded M5 as ⏸ (not started) while the repair was in fact present in the working tree and gated. This section was added, and the table row corrected, as a **documentation-only** change during the M7 design gate. **No source file, test, or experimental mechanism was modified by this correction.** The discrepancy was found while auditing the baseline that M7 will cite; it is recorded rather than quietly fixed because the M7 pre-registration must name an accurate baseline build.

**What was already in the tree.** The F2 repair is at [`main.js:2234`](../../main.js:2234) (`// ── F2 REPAIR (Phase 1.0) ──`). Its gate is [`experiments/phase1_0/verify_S3.js`](../../experiments/phase1_0/verify_S3.js).

### The defect

The epsilon branch drew a random candidate, assigned it to the **local** `currentKey`, and `return`ed out of `runPrediction` before `window.lastReasoning` was written. `runAgent` then re-read the *previous* step's decision and executed that move again. The exploratory choice was computed and discarded. Measured on the real loop, seed 20260818: **67 of 381 steps (17.6%) executed an action that had not been selected in that step.**

### The change

The draw is recorded as intent (`exploreChoice`) and the function continues. The selection point, the candidate pool, the uniform distribution, and the RNG draw order and count are all exactly as before — the only change is that the chosen action is **used** instead of thrown away. `lastDecision.best` becomes `exploreChoice || bestChoice` so that `updateBehavior` and the reasoning box are fed the action actually performed ([`main.js:2295`](../../main.js:2295), [`2478`](../../main.js:2478)).

### Gate results — 9/9

| | |
|---|---|
| S3.1a–c | Static: the epsilon block contains no `return`; the draw precedes the `lastReasoning` write; the drawn candidate is what gets executed |
| S3.2 | Stale executions cut from **67/381 (17.6%) to 17/380 (4.5%)** |
| S3.3 | Raising epsilon no longer raises the stale rate (**natural 4.5% → pinned 0.0%**; the pre-fix baseline went 17.6% → 40.9%, which was the defect signature) |
| S3.4 | A higher epsilon now produces a different executed path |
| S3.5a–b | Same seed → identical executed action sequence (235 decisions); different seed → different sequence |
| S3.6 | Else-branch subsystem activity measured and reduced, **not eliminated** — Q2 deferred per ruling |

### Residual — F2b, reported not repaired

`main.js` takes the replay branch on ~8% of steps ([`main.js:3170`](../../main.js:3170), `liveRng() < 0.92` else `replayOneEpisode`) and never calls `runPrediction`, so `lastReasoning` is not refreshed on those steps. **Measured residual stale-execution rate after M5: 17/380 = 4.5%.** Note the two figures are different quantities: the branch *fires* on ~8% of steps, but only 4.5% of steps end up executing a stale action. Separate defect, outside M5 scope, deliberately untouched.

### Gate-id discrepancy (recorded, not changed)

The header comment of `verify_S3.js` reads `GATE : S3.1 – S3.7`. The file implements **S3.1–S3.6** (9 assertions); **no S3.7 is defined or executed.** The header is inaccurate; the gate is not. Recorded here so the M7 baseline citation is exact. Correcting the comment would modify a test file and is therefore out of scope for a documentation correction.


---

## Verified M1–M6 baseline (the build M7 will cite)

Re-run in full on 2026-08-19 against the current working tree. **Every Phase 1.0 gate green: 69/69 assertions.**

| Milestone | Gate script | Result |
|---|---|---|
| M1 (D3) | `verify_S1.js` + `verify_S1b.js` | **16/16** (12 + 4) |
| M1 refactor parity | `parity_termarray.js` | **200000/200000 bit-identical**, worst \|delta\| 0 |
| M2 + M3 (D1 / Q4) | `verify_S2.js` | **14/14** |
| M4 (Q3 RNG) | `verify_S4.js` | **12/12** |
| M5 (F2) | `verify_S3.js` | **9/9** |
| M6 (peek accessor) | `verify_S6.js` | **18/18** |

**Reproduction requirement — working directory matters.** `verify_S2.js` and `verify_S4.js` resolve data and module paths relative to the **current working directory** and fail with `ENOENT` if launched from the repository root. All seven scripts run green when launched from `experiments/phase1_0`:

```
cd experiments/phase1_0
node verify_S1.js && node verify_S1b.js && node verify_S2.js \
  && node verify_S3.js && node verify_S4.js && node verify_S6.js \
  && node parity_termarray.js
```

Recorded, not fixed — making the two scripts CWD-independent would modify test files. This requirement must be carried into the M7 pre-registration so the baseline is reproducible by a reviewer.


---

## M6 — completed work (detail)

Spec: `M6_SPECIFICATION.md` (same directory). Gate: `experiments/phase1_0/verify_S6.js`.

### The problem, measured

`getTransitionUncertainty` decays the stored value by 0.998 **on every read** and deletes the entry below 0.005. Measured on the live agent under the headless shim (seed 20260818, 60 ticks): **4,278 reads across 292 learning steps = 14.54 reads per step**, against *one* EMA update per step. The stored value therefore converges to ~79% of the quantity it is meant to track, and the shortfall is a function of node degree and policy — not of evidence.

The dominant caller (`main.js:2036`, once per candidate) **discards the return value**: `transitionUncertainty` sits in `calculateDecisionScore`'s *"accepted, unused"* block. So ~14 of every 14.54 reads per step exist only to produce a side effect nobody consumes.

### The change

One additive export in `render/predictionError.js`:

```js
export function peekTransitionUncertainty(fromId, toId) {
    return transitionUncertaintyMap.get(String(fromId) + "->" + String(toId)) || 0;
}
```

`getTransitionUncertainty` is **byte-identical** to its pre-M6 form (asserted by M6.6a). Option B — making the getter itself pure — was considered and rejected for M6: it would raise every stored value ~26%, which is an agent-behaviour change, not a measurement fix.

**Contract:** `peek(u,v) ≠ get(u,v)` by design — `get` returns the value *after* one decay and floors to 0 below 0.005; `peek` returns it as stored. Tests compare `peek` against the store, never against `get`.

### Gate results — 18/18

| | |
|---|---|
| M6.1–M6.2 | 100,000 peeks change no value and no key |
| M6.3 | RNG stream position untouched by 1,000 peeks |
| M6.4 | Decision scores bit-identical with a full peek sweep interleaved |
| M6.5 | Key/value snapshot deep-equal across a 5,000-call sweep |
| M6.6 | Getter source byte-identical; still decays 0.998/read; still deletes below the floor |
| M6.7 | Export surface = pre-M6 set + exactly one name |
| M6.8 | Static guard: no agent-path file references `peek` |
| M6.9a–e | **Differential deletion demonstrated:** 40 getter sweeps destroyed 1 of 10 low-uncertainty (reliable) edges and 0 of 10 high-uncertainty ones; the same 40 peek sweeps destroyed nothing |

M6.9d/e were added during implementation because the specified narrative claimed differential deletion but the drafted test only asserted it in a print statement. The gate now proves it.

### Line endings

`render/predictionError.js` was one of the untouched CRLF files. Its CRLF endings were **preserved**, so the review diff is purely additive: **49 added lines, 0 removed**. (Files touched in M1/M2/M4/M5 are LF, matching HEAD; this one stays CRLF to keep the diff minimal.)
