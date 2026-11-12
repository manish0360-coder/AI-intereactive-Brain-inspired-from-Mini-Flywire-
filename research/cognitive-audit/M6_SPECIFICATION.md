# M6 — Pure Observation Path for Transition Uncertainty
## Specification only. No code written. No commit. Awaiting Director approval.

**Date:** 2026-08-18 · **Milestone:** M6 of Phase 1.0 · **Status:** DRAFT

**Recon caveat:** the device workspace was unavailable this turn, so `git` could not be run. Milestone presence was verified by **content inspection** of the live files instead (below). HEAD was `7c8bdde` with nothing committed as of the M5 report, and no commit has been made since. **A `git status` / `git log` check should be repeated when the workspace returns** — recorded as an open item, not assumed away.

Live-repo milestone verification (content):

| Milestone | Marker | Found |
|---|---|---|
| M1 · D3 | `D3 FIX` in `render/scoring.js` | 5 |
| M2 · D1 | `getQ(makeStateKey(` in `main.js` | 8 |
| M3 · Q4 | `export function getQAny` in `render/qlearning.js` | 1 |
| M4 · Q3 | `liveRng(` in `main.js` / `export function liveRng` | 12 / 1 |
| M5 · F2 | `exploreChoice` in `main.js` | 5 |

---

## 1. Current implementation

`render/predictionError.js`

```js
const transitionUncertaintyMap = new Map();            // :503  module-private
const TRANSITION_UNCERTAINTY_LR    = 0.12;             // :505  EMA rate
const TRANSITION_UNCERTAINTY_DECAY = 0.998;            // :506  decay-per-READ

export function updateTransitionUncertainty(fromId, toId, errorMagnitude) {   // :510
    const key = String(fromId) + "->" + String(toId);
    const old = transitionUncertaintyMap.get(key) || 0;
    const updated = old + TRANSITION_UNCERTAINTY_LR * (errorMagnitude - old);
    transitionUncertaintyMap.set(key, Math.min(Math.max(updated, 0), 1));
}

export function getTransitionUncertainty(fromId, toId) {                      // :529
    const key = String(fromId) + "->" + String(toId);
    const raw = transitionUncertaintyMap.get(key) || 0;
    const decayed = raw * TRANSITION_UNCERTAINTY_DECAY;      // ← MUTATION
    if (decayed < 0.005) { transitionUncertaintyMap.delete(key); return 0; }   // ← DELETION
    transitionUncertaintyMap.set(key, decayed);              // ← WRITE-BACK
    return decayed;
}

export function decayTransitionUncertainties() { ... value * 0.995 ... }      // :674
```

## 2. Exact mutation caused by `getTransitionUncertainty`

Per call, on the read path:

1. **Multiplies** the stored value by `0.998` and **writes it back** (`:545`).
2. **Deletes the key entirely** if the result falls below `0.005` (`:541`).
3. Returns the post-decay value, so caller and store are mutated together.

It does **not** touch counts, timestamps, posteriors, RNG, or episode state — there are none in this structure. The damage is confined to the value itself and to key existence.

### Measured, on the real agent under the headless shim (seed 20260818, 60 ticks)

| Measurement | Value |
|---|---|
| Getter reads | 4,278 |
| Learning steps (`_diagCounters.mqfTotal`) | 292 |
| **Reads per learning step** | **14.54** |
| Values changed by a single read | 6 / 6 sampled |
| Values changed by **1,000** calls to a pure peek | 0 / 6 |
| Reads to destroy an entry sitting at the EMA floor (0.00522) | **22** — under 2 agent steps |

The store is decayed ~14.5× per step while the EMA is updated **once** per step. Steady-state consequence, simulated against a tracked error of 0.40:

| reads/step | stored value | % of the quantity it is supposed to track |
|---|---|---|
| 0 | 0.3967 | 99.2% |
| 4 | 0.3719 | 93.0% |
| **14.54 (measured)** | **0.3168** | **79.2%** |
| 30 | 0.2623 | 65.6% |

**The stored uncertainty is a function of how often it was read, not only of the evidence.** Read frequency depends on node degree (the scoring loop reads once per candidate) and on the policy, so the distortion is systematic and correlated with the agent's own behaviour.

## 3. All callers

| Site | Purpose | Return value used? |
|---|---|---|
| `main.js:315` | import | — |
| `main.js:2036` | `transitionUncertainty: getTransitionUncertainty(currentKey, k)` — **once per candidate**, inside the scoring loop | **No.** It is passed to `calculateDecisionScore`, whose signature lists `transitionUncertainty` in the *"Additional params (accepted, unused)"* block (`scoring.js:168`). The identifier appears nowhere else in that file. |
| `main.js:4018` | `console.log(... "| transUnc:", ...)` — once per learning step | Formatting only |

Writers / decayers, for completeness: `updateTransitionUncertainty` ← `main.js:3868` (once per learning step); `decayTransitionUncertainties` ← `main.js:4819` (once per `runAgentLoop` tick).

**Consequence worth stating plainly:** the dominant caller discards the value. Its only effect on the program is the mutation. ~14 of every 14.54 reads per step exist to produce a side effect nobody consumes.

Existing observers: **none.** No test or instrumentation currently reads this state. (`experiments/exec_influence/scoring.real.js:124` mentions the parameter name only, in its own stale copy of the scoring signature.)

## 4. Underlying state / storage

- `transitionUncertaintyMap : Map<string, number>`, module-private, **not exported**.
- Key: `String(fromId) + "->" + String(toId)` — built identically by the updater and the getter. Ids arrive as both numbers and strings depending on call path; the `String()` coercion is what makes them agree. **Any new accessor must reproduce this expression exactly**, or it will read a different key.
- Value: `number` in `[0, 1]`.
- **Not persisted.** `saveBrain` writes `transitions, rewards, penalties, signals, curiosity, Q, confidence, episodes, homeNeuronId, goalNeuronId` — this map is absent, so it is session-only state.

## 5. Proposed pure accessor — **Option A, recommended**

**Add a separate pure accessor. Leave `getTransitionUncertainty` exactly as it is.**

```js
// render/predictionError.js — additive, ~6 lines
//
// PURE. Reads the stored value; writes nothing, deletes nothing, decays nothing.
// MEASUREMENT ONLY — must never be called from the agent decision path.
// Key expression is copied verbatim from updateTransitionUncertainty/
// getTransitionUncertainty so all three address the same entry.
export function peekTransitionUncertainty(fromId, toId) {
    return transitionUncertaintyMap.get(String(fromId) + "->" + String(toId)) || 0;
}
```

### Why not change the existing getter (Option B)

Option B — make the getter pure and leave decay to `decayTransitionUncertainties()` — is defensible on the merits: the read-decay's own comment ("prevents uncertainty from being permanent even for transitions that later stabilize") describes precisely what `decayTransitionUncertainties()` already does, so the read path is a second, uncontrolled copy of a stated-purpose function. Removing it would raise stored values by roughly 26% at the measured read rate.

**But that is an agent-behaviour change, not a measurement fix.** It would alter every stored uncertainty trajectory, and M6's mandate is explicitly instrumentation-only. **Recommend Option A.** Option B should be its own milestone with its own gate and its own before/after evidence, if the Director ever wants it.

### Contract note the Director should approve explicitly

`peek(u,v)` and `get(u,v)` will **not** return the same number: `get` returns the value *after* applying one decay (and floors to 0 below 0.005), `peek` returns the value as stored. That divergence is intended and is the entire point. Tests must compare `peek` against the store, never against `get`.

## 6. Exact files that would change

| File | Change | Size |
|---|---|---|
| `render/predictionError.js` | **+1 export**, `peekTransitionUncertainty`. Nothing else touched. | ~6 lines |
| `experiments/phase1_0/verify_S6.js` | **new** gate, M6.1–M6.8 | ~120 lines |
| `research/cognitive-audit/PHASE_1_0_IMPLEMENTATION_PLAN.md` | status update | ~15 lines |

Nothing else. No change to `main.js`, `scoring.js`, or any other `render/` module.

This is the second and last of the two accessors permitted by the Phase 1.0 no-new-export rule (`getQAny`, landed in M2; `peekTransitionUncertainty`, here).

## 7. Exact tests / gates

| ID | Assertion |
|---|---|
| **M6.1** | `peek(u,v)` returns the same value before and after — read, compare, identical to the last write. |
| **M6.2** | 100,000 consecutive `peek` calls leave every value and the map size unchanged. |
| **M6.3** | `peek` consumes no RNG: `liveRng` stream position identical before/after 1,000 peeks, under a fixed seed. |
| **M6.4** | `peek` does not alter decision output: `calculateDecisionScore` over a fixed context set is bit-identical with and without an interleaved peek sweep, at a fixed seed. |
| **M6.5** | `peek` alters no counts, posteriors or map membership: `Map.size` and a full key/value snapshot are deep-equal across a sweep. |
| **M6.6** | `getTransitionUncertainty` behaviour is **unchanged**: for a seeded sequence of updates and reads, the returned series and resulting map state match a pinned pre-M6 baseline exactly. |
| **M6.7** | Export surface of `render/predictionError.js` grows by exactly one name; no other module's exports change. |
| **M6.8** | **Static guard:** `peekTransitionUncertainty` appears in no file under `main.js` or `render/` other than its own definition — it can never enter the decision path. |

### The regression test the Director asked for

**M6.9 — why the old getter is invalid for calibration.** Seed 20 edges to known values. Perform ten calibration sweeps using `getTransitionUncertainty`, and ten using `peek`. Assert:

- under `get`, every value decreases monotonically across sweeps, by ~`0.998^(10×sweepIndex)`;
- under `get`, entries seeded near the floor are **deleted** — the map shrinks;
- under `peek`, all twenty values and the map size are identical after all ten sweeps.

Then state the consequence: **the entries a getter-based sweep destroys first are the *low*-uncertainty ones — that is, the *reliable* edges.** A calibration sweep would therefore preferentially delete one tail of the very distribution it is trying to correlate, producing a bias whose direction is known in advance. That is not noise; it is a systematic corruption of the measurement.

## 8. Proof the accessor cannot perturb the measured state

Three independent arguments, one already measured:

1. **Structural.** The proposed body contains a single `Map.prototype.get` and a `||` default. There is no `set`, no `delete`, no arithmetic on stored state, no call to any other function. `Map.prototype.get` is specified as non-mutating.
2. **Empirical, already run** (on a scratch copy with a measurement scaffold, repo untouched): 1,000 peeks across 6 live keys changed nothing (`C_peekChangedAnything: false`); 100,000 peeks on an entry at the 0.00522 floor left it at 0.00522 with map size unchanged, while **22 getter reads destroyed the same entry**.
3. **Gate-enforced.** M6.2 and M6.5 re-assert this on every future run, so a later edit that quietly adds a write is caught.

## 9. Risks / unexpected dependencies

| # | Risk | Assessment |
|---|---|---|
| R1 | Something depends on the read-decay | **No evidence for it, and Option A does not remove it anyway.** The dominant caller discards the return value, and a dedicated time-based decay already exists. Risk is neutralised by not touching the getter. |
| R2 | `peek` and `get` disagree, confusing a later reader | Real. Mitigated by documenting the contract (§5) and by M6.6 comparing `peek` to the store rather than to `get`. |
| R3 | Key-construction drift between `peek` and the updater | Real and easy to get wrong — ids arrive as both numbers and strings. Mitigated by copying the key expression verbatim and by M6.1 writing through `updateTransitionUncertainty` and reading through `peek`. |
| R4 | `peek` leaks into the decision path later | Mitigated by the M6.8 static guard, which is permanent. |
| R5 | Measured values are already distorted by past reads | **Unavoidable and important.** `peek` stops *future* measurement damage; it cannot undo the ~21% suppression already baked into a running session's store. Any P5 calibration must therefore start from a **fresh session**, and that requirement belongs in the P5 protocol. |
| R6 | State is session-only | `transitionUncertaintyMap` is not in `saveBrain`. Calibration runs cannot resume across sessions. Recorded; no action in M6. |

## 10. Explicitly deferred — inspected, not fixed

| Item | Status |
|---|---|
| **F2b** — replay branch (`liveRng() < 0.92` else `replayOneEpisode`) leaves `lastReasoning` stale on ~8% of steps | Reported in M5. Untouched. |
| **D8 / F12** — Q-decay namespace mismatch | Deferred by ruling. Untouched. |
| **Belief→decision coupling** — `transitionUncertainty` accepted-and-unused at `scoring.js:168`; ∂score/∂it = 0 (P5-A) | Deferred. M6 does **not** connect it. |
| **Option B** — making `getTransitionUncertainty` pure | Recommended against for M6; needs its own milestone. |
| Scoring weights, hidden-transition environment, MF-1a, ARM_TEXTBOOK | Untouched. |
| Line-ending normalisation of unrelated files | Untouched. |

### New observations found during recon — documented, not acted on

1. **`main.js:2036` is a pure side-effect call.** Its return value is discarded by `calculateDecisionScore`. Removing the call entirely would change behaviour *only* through the decay it causes. Not proposed; recorded.
2. **`getTransitionUncertainty` is the only mutating getter in the uncertainty subsystem.** `getProceduralUncertainty` (uncertaintyLedger) and `getUncertaintyScore` (uncertaintyEngine) were checked and are pure. M6 is a single-function fix, not a subsystem problem — which is the main reason it can stay this small.
3. **The map is session-only** (absent from `saveBrain`).

---

## Interaction with P5 (Step 5 — no implementation)

P5 / M-CAL must eventually correlate the agent's internal transition uncertainty against true hidden transition reliability. That requires sampling all 78 directed edges repeatedly across a long run.

With the current getter, each sample of the full edge set would apply **78 additional decays** on top of the ~14.54 per step the agent already causes — the measurement would become the dominant decay source, and the sampled quantity would be an artifact of the sampling schedule. Worse, entries near the floor would be **deleted** by the sweep, and those are precisely the low-uncertainty (reliable) edges, so the correlation would be computed over a distribution the measurement had truncated at one end.

`peekTransitionUncertainty` makes the sample a no-op on the state, so M-CAL measures the agent rather than the probe. That is the whole of M6's contribution to P5.

**M6 does not:** create the hidden environment, connect uncertainty to scoring, define M-CAL's statistic, or run any calibration. Those remain deferred.

---

**End of specification. No source file modified. Nothing committed. Awaiting Director approval before any M6 code is written.**
