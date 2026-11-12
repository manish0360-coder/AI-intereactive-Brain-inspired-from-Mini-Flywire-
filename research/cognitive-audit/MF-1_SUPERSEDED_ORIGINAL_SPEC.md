# MF-1 — Minimal Cognitive Environment
## Phase 1 Engineering Specification

**Status:** DRAFT — awaiting Research Director approval. Nothing implemented. No repository file created, modified, or committed.
**Author role:** Chief Systems Engineer
**Date:** 2026-08-17
**Depends on:** `research/cognitive-audit/` (Phase 0)

---

## 0. Objective and non-goals

**Objective.** Give the `ACTION → OUTCOME` arrow a referent, so that prediction error carries information about something other than MiniFlyWire's own memory tables. Nothing else.

**Success is a measurement, not a feature.** MF-1 succeeds if and only if, after it exists, `statePredictionError` is provably non-zero, provably caused by the environment, and provably zero in a null-environment control run using the same code.

**Explicit non-goals** (any of these appearing in the implementation is a spec violation):

| Not in MF-1 | Why deferred |
|---|---|
| New cognitive modules | Phase 0 found nine unused ones already. |
| Partial observability | Would confound transition uncertainty with state estimation. MF-2. |
| Graph expansion | 20 nodes / 39 edges is enough for a reliability contrast. Changing it changes every Phase 0 baseline. |
| LLM | No. |
| Repairs to D1 / D2 / D3 / F2 | Separately scoped — but see §P.1, which argues the *experiment* cannot run before D1 and F2 are repaired. |
| Reward shaping, curricula, multi-goal | Later. |

---

## A. Where the environment boundary sits

MiniFlyWire currently has **no boundary**: the agent assigns its own next state and computes its own reward. Both happen inside `runAgent`.

MF-1 introduces exactly **one seam**, at two adjacent code locations:

| Seam | Current code | Becomes |
|---|---|---|
| **S1 — state commit** | `main.js:4621` `agentCurrent = next;` | `agentCurrent = outcome.arrivedAt;` |
| **S2 — reward** | `main.js:3644–3743`, the whole `let rewardSignal = 0` block through the `next === goalNeuronId ? 12 : sim > 0.45 ? 2 : …` cascade | `rewardSignal = outcome.reward;` |

**Note on S2's true extent.** Lines 3651–3676 apply `rewardSignal -= 2` (repeat) and `-= 0.3` (over-repetition), and are then **unconditionally discarded**: the cascade at 3707–3743 is an exhaustive if/else-if chain of bare assignments (`= 12`, `= 2`, `= 0.3`, `= -0.4`), so no branch preserves the decrements. Those 26 lines are already dead in the current build — a Phase 0 finding not caught in the first pass, recorded here. The MF-1 deletion therefore starts at 3644, not 3702.

Both are served by a **single** call, placed immediately before S2:

```js
const outcome = MF1.step(next);          // the only crossing of the boundary
```

### The boundary rule

> After MF-1, every fact MiniFlyWire knows about **what happened** must have arrived through the return value of `MF1.step()`.

Formally, partition the world into:

- **PUBLIC (topology).** `neurons.json`, `connections.json`, `userData.neighbors`, `conceptRelations`. The agent keeps full access. It knows the map.
- **PRIVATE (dynamics).** Per-directed-edge transition reliability, per-node reward distribution, and the environment's random stream. The agent has no access, ever.

**Topology public, dynamics private.** This is the deliberate MF-1 scoping decision and it is what keeps MF-1 minimal. Hiding topology as well would be partial observability, which is explicitly out of scope. The agent knows which roads exist; it does not know which are reliable or which destinations pay.

### What deliberately does *not* move behind the boundary

`canReachGoal` (main.js:1022), `goalDistance` (main.js:1082), `futureScore`, and candidate generation all read `userData.neighbors`. They keep reading it. The agent retains a perfect topological planner. This is intentional: it isolates the variable under test to *dynamics*. See §P.5 for the scale interaction this creates.

### Ordering constraint

`MF1.step()` must be called **exactly once per committed action**, from the real-action path only. Specifically it must **not** be called from:

- `runPrediction`'s look-ahead loop, `step > 0` (main.js:1386–2579) — those are imagined steps.
- `replayOneEpisode()` — replay is memory, not action.
- Any HUD, telemetry, or diagnostic path.

Violating this gives the agent free samples of the hidden distribution, which is an information leak. Test **E10** enforces it.

---

## B. What data belongs to the hidden environment

Exactly three things. Nothing else is added.

### B.1 Per-directed-edge transition reliability

```
P : (u, v) → p ∈ (0, 1]      for every directed edge where v ∈ neighbours(u)
```

39 undirected edges → **78 directed entries**. Drawn once at construction from the `envStructure` RNG stream. Directed, because the agent's Q table is directed: `p(u→v) ≠ p(v→u)` in general.

### B.2 Per-node reward distribution

```
R : v → (μ_v, σ_v)
```

20 entries. Reward is a property of **where the agent actually arrives**, not of the edge it intended. This coupling is the point — see §D.2.

### B.3 The environment's random stream

Two streams, `envStructure` and `envSample` (§H). Never exposed.

### Non-membership (recorded so it cannot drift)

These stay on the agent side, unchanged: `transitions`, `rewards`, `penalties`, `Q`, `curiosityMap`, `confidenceMap`, `episodicStore`, `embeddings`, `adjacencyMemory`, all behaviour states, and `goalNeuronId`. MF-1 adds no agent-side state.

---

## C. How hidden transition probabilities work

### C.1 Construction (once, seeded)

```
for each directed edge (u,v):
    isUnreliable = envStructureRng() < config.reliability.unreliableFraction
    p(u,v)       = uniform(isUnreliable ? unreliableP : reliableP)
```

Draw order is a deterministic sort of the directed edge list (`u` asc, then `v` asc), so the draw sequence is stable regardless of JSON ordering.

### C.2 Runtime (per action)

```
step(intendedTo):
    u = currentNode
    if intendedTo ∉ neighbours(u):  throw MF1IllegalAction
    r = envSampleRng()
    if r < P(u, intendedTo):
        arrivedAt = intendedTo                       // success
    else:
        alts = neighbours(u) \ {intendedTo}
        arrivedAt = alts.length
                    ? alts[floor(envSampleRng() * alts.length)]   // slip
                    : u                                           // stay
```

**Exactly one `envSampleRng()` draw on success, two on a slip.** Documented because it makes the draw count analytically predictable, which test E1 relies on.

### C.3 Why heterogeneous reliability is mandatory, not cosmetic

If every edge had the same `p`, the optimal policy would be **identical** to the deterministic case — every action is equally unreliable, so belief about reliability has zero decision value, and the LEARN arm could not beat the FROZEN arm even with a perfect belief update. The experiment would return a null result caused by the environment design, not by the agent.

Heterogeneity is therefore a **correctness requirement**. The default profile creates a genuine trade-off: a short unreliable route and a longer reliable one, both reaching the goal.

### C.4 Why the graph guarantees a slip target

`connections.json` gives every node degree ≥ 3 (min 3, max 6, verified). So `alts` is never empty and the `stay` fallback is unreachable with the shipped graph. It is retained as a defensive branch and asserted-unreachable in E-tests.

### C.5 Why "slip to a uniform other neighbour"

- **Uniform**, not fixed: a fixed slip target would make failure a deterministic function of the action, re-introducing a learnable closed form and defeating the purpose.
- **To a neighbour**, not teleport: keeps the agent on the graph, so no downstream code (`canReachGoal`, `transitions`) sees an impossible state.
- **Not "stay put"**: staying is trivially detectable and gives the agent a free, noiseless failure signal. Slipping to a *plausible* neighbour is a genuinely harder inference problem while remaining minimal.

---

## D. How hidden reward works

### D.1 Mechanism

```
reward = clamp( μ_arrivedAt + σ_arrivedAt · gaussian(envSampleRng), rewardMin, rewardMax )
```

μ is assigned at construction from `envStructure`:

| Node class | Count | μ | σ |
|---|---|---|---|
| Goal node (`config.goalNode`, default 16) | 1 | 10.0 | 1.0 |
| "Hot" nodes (drawn at random from non-goal) | 2 | 3.0 | 0.8 |
| All others | 17 | 0.0 | 0.4 |

The agent is never told which nodes are hot. Discovering them is the only thing there is to discover about reward.

### D.2 Why reward attaches to the arrival node, not the intended edge

This is the load-bearing design choice in MF-1.

If reward were a property of the *intended* edge, a slip would still pay the intended reward, and transition stochasticity would be decoupled from reward stochasticity. The agent could learn reward perfectly while remaining blind to reliability, and `rewardPredictionError` would carry no information about `P`.

Attaching reward to **where you actually end up** couples them: an unreliable edge toward a hot node has a *lower expected return* than its intended reward suggests. That coupling is precisely what a belief over `P` buys you, and it is what makes the LEARN-vs-FROZEN comparison meaningful.

### D.3 Scale calibration (non-negotiable)

`clamp` is `[-2, +12]`, chosen to match the existing `rewardSignal` range exactly. Reason: downstream consumers are hard-coded to that range —

- `calculateDecisionScore` uses `tanh(reward · 0.1) · 8`, which saturates past ~±20.
- `writeReward` caps at 8–10.
- `updateProceduralUncertainty` normalises with `(rewardSignal + 2) / 14.0` (main.js:3903) — literally the `[-2, 12]` interval.

Changing the reward scale would silently rescale five downstream systems and confound the experiment. **MF-1 changes the reward's *source*, not its *range*.**

### D.4 The legacy reward rule is deleted, not supplemented

`rewardSignal` must be assigned **solely** from `outcome.reward`. If the `similarity()`-based cascade survives in any form — as a fallback, a blend, or an `||` default — the tautology Phase 0 identified survives with it and MF-1 has failed. Test **E9** enforces this.

The `episodeUnique >= 3` anti-farming guard at main.js:3709 is *policy*, not environment. Recommendation: **delete it in MF-1.** It exists to suppress goal-farming under a deterministic reward; with stochastic transitions, farming is no longer free and the guard would mask the effect under test. Flagged for Research Director decision (§Unresolved Q3).

---

## E. How an action is submitted

```js
const outcome = MF1.step(intendedTo);
```

**Contract:**

| Property | Rule |
|---|---|
| Arity | One argument: a node id that must be in `neighbours(currentNode)`. |
| Illegal action | Throws `MF1IllegalAction`. Never silently corrected — silent correction would hide agent bugs inside the environment. |
| Idempotency | **None.** Every call is a fresh sample and advances `tickId`. This is deliberate: `step()` is the act of acting. |
| Re-entrancy | Guarded. A `step()` while another is in flight throws `MF1ReentrantStep`. |
| Call site | Exactly one, in `runAgent`, on the real-action path. Enforced statically (E4) and dynamically (E10). |
| Before `reset()` | Throws `MF1NotReset`. |

**Placement in `runAgent`.** The call goes immediately before the `rewardSignal` block, at approximately main.js:3706, *after* `next` is resolved and the self-loop guard has passed. `agentCurrent` is then set from `outcome.arrivedAt` at the S1 seam. The `_goalResetJustHappened` guard (main.js:4616) must be re-expressed against `outcome.arrivedAt`, not `next` — otherwise a slip onto the goal is missed.

---

## F. What is returned

```js
/** @typedef {Object} MF1Outcome — frozen, plain, no references into env state */
{
  tickId:     number,   // monotonic, environment-owned
  from:       number,   // node the agent was on
  intendedTo: number,   // what it asked for
  arrivedAt:  number,   // where it actually is        ← OBSERVATION
  slipped:    boolean,  // arrivedAt !== intendedTo    (derivable; convenience only)
  reward:     number,   // sampled scalar              ← OBSERVATION
  terminal:   boolean,  // arrivedAt === config.goalNode
}
```

**That is the entire observation channel.** Two genuinely new bits of information per step: *where I ended up* and *what I got*.

`Object.freeze()` is applied to every returned object, and every field is a primitive. No object returned by MF-1 holds a reference into environment state, so no amount of property-walking reaches `P` or `μ`.

### What is deliberately absent

`p`, `μ`, `σ`, the slip-candidate set, the RNG state, expected value, "how unlucky that was", or any diagnostic hint. If the agent wants to know an edge is unreliable, it must estimate it from samples. That is the experiment.

`slipped` is redundant with `arrivedAt !== intendedTo` and is included only for telemetry legibility. It reveals no information the agent does not already have.

---

## G. Guaranteeing MiniFlyWire cannot reach hidden variables

Four independent mechanisms. Any one failing is caught by at least one other.

### G.1 Lexical privacy — the primary guarantee

Hidden state lives in `const` bindings inside the `createEnvironment` closure in `env/mf1Environment.js`. ES module and closure scope are not reflectable in JavaScript: there is no API by which `main.js` can enumerate them. This is a language-level guarantee, not a convention.

### G.2 The oracle-sink pattern — how tests see ground truth without opening a hole

Analysis needs ground truth. Exposing a getter would be a permanent leak. Instead:

```js
createEnvironment({ nodes, edges, seed, config, __oracleSink })
```

`__oracleSink` is an **optional callback invoked exactly once at construction** with the private state.

- The **harness** passes a sink and captures ground truth.
- **`main.js` does not pass one**, and therefore cannot obtain the state — not by accident, not by refactor, not by calling any exported function.

The guarantee is structural: *you can only see the hidden state if you asked for it at construction time, and the agent's construction call is a fixed literal that does not ask.*

No `WeakMap` registry, no symbol-keyed accessor, no `__private` export. Those all create a retrievable handle. This does not.

### G.3 Static leak audit (test E4)

Assert, by source scan:

1. No file in `main.js`, `render/**`, or `instrumentation/**` contains `__oracleSink`.
2. No file in `main.js` or `render/**` imports `env/mf1Oracle.js` or `env/mf1Config.js`'s hidden-parameter exports.
3. `main.js` contains exactly one `MF1.step(` occurrence.
4. `env/mf1Environment.js` never touches `window`, `globalThis`, or `localStorage`.

### G.4 Behavioural ablation (test E6) — the real proof

Static checks prove no *named* path exists. E6 proves no path exists at all:

> Construct two environments with **different hidden parameters** (different structure seed) but an **identical agent seed and identical initial agent state**. Run both. The agent's action sequence must be **bit-identical up to and including the step at which the two environments first return differing outcomes**, and may only diverge after.

If the agent had any read access to hidden state — direct, aliased, or via a timing/ordering side channel — its behaviour would diverge *before* the first differing observation. This is a strictly stronger guarantee than any static check, and it is cheap to run.

---

## H. Deterministic replay and seeding

### H.1 Two new named streams

`instrumentation/rng.js` already has a named-stream registry. MF-1 adds two entries to `initRng`, additively:

```js
export function initRng(seed) {
    streams.set("cognitive",    makeRng(seed));
    streams.set("visual",       makeRng((seed ^ 0x9e3779b9) >>> 0));
    streams.set("envStructure", makeRng((seed ^ 0x85ebca6b) >>> 0));   // NEW
    streams.set("envSample",    makeRng((seed ^ 0xc2b2ae35) >>> 0));   // NEW
    return seed >>> 0;
}
```

Existing `verify.js` tests T1–T6 must still pass unchanged. Nothing else in `rng.js` is touched.

### H.2 Why *two* environment streams, and why this is the most important paragraph in §H

**`envStructure`** is drawn from only at construction (78 reliability values + 20 reward means + hot-node selection). **`envSample`** is drawn from only at runtime.

The separation exists because the experimental arms **will take different action sequences** — that is the entire point of comparing them. Different action sequences consume different numbers of runtime draws. If structure and sampling shared a stream, the arms would face **different hidden worlds**, and any performance difference would be uninterpretable.

With the split, all arms at seed *S* face **exactly the same world**, regardless of how they behave in it. This is the single methodological requirement that makes the arm comparison valid.

By the same logic, `envSample` is separate from `cognitive`: repairing a defect that changes how many `Math.random()` calls the agent makes must not change the weather.

### H.3 Replay contract

A run is fully reproducible from `(seed, config, actionSequence)`:

- Same seed + same config → identical `groundTruth`. **(E2)**
- Same seed + same config + same action sequence → identical outcome sequence. **(E1)**
- Different seed → different `groundTruth` with probability ~1. **(E3)**

`rngDrawCount` (already in the telemetry envelope) is emitted on every `env.step` event as the cumulative `envSample` draw count, giving analysis an independent determinism cross-check.

### H.4 The reproducibility precondition — flagged, not solved here

`instrumentation/rng.js` exists but **`main.js` and `render/**` do not import it.** There are **24 raw `Math.random()` call sites** on the live path (12 in `main.js`, 12 under `render/`), including the epsilon draw, the decay gates, and the random start-node selection.

**Consequence: the browser application is not currently reproducible under any seed.** MF-1's environment will be deterministic; the agent driving it will not be. This is a prerequisite for the experiment, not for the environment. Sized and scoped in §L.3 and §P.2.

---

## I. Instrumentation

### I.1 Schema extension (`instrumentation/traceSchema.js`)

Additive only — the file's own comment requires that channels are extended, never reshaped.

```js
export const CHANNELS = Object.freeze({
    TICK: "tick",
    DECISION: "decision",
    ENV: "env",                       // NEW
});

export const TYPES = Object.freeze({
    TICK_OPEN: "tick.open",
    TICK_CLOSE: "tick.close",
    DECISION_FRAME: "decision.frame",
    ENV_RESET: "env.reset",           // NEW
    ENV_STEP:  "env.step",            // NEW
});
```

`SCHEMA_VERSION` → `"1.1.0"`. `validateEnvelope` needs no change (it reads the frozen objects). Existing test T5 must still pass with the version constant updated in one place.

### I.2 Event payloads

```js
// env.reset
{ startNode, goalNode, nodeCount, edgeCount, configHash }

// env.step   — OBSERVATIONS ONLY
{ from, intendedTo, arrivedAt, slipped, reward, terminal }
```

Emitted with `rngDrawCount = cumulative envSample draws`.

### I.3 Ground truth never enters the event stream

`P` and `μ` go **only** into the recorder manifest, written by the harness:

```js
const gt = capturedGroundTruth;                       // from __oracleSink
createRecorder({ runId, seed, config: { arm, mf1Config, groundTruth: gt }, outDir });
```

Rationale: the event stream is the thing most likely to be replayed, diffed, and eventually fed back into some future analysis-in-the-loop. Keeping ground truth out of it means a future mistake cannot turn analysis into an oracle for the agent. The manifest is written once, read only by offline analysis.

### I.4 Behaviour-neutrality is preserved

`emit()` is a no-op when the bus is disabled, and MF-1 emits *after* the outcome is computed, never before. No environment decision depends on telemetry. The existing T4 neutrality test extends to the env channel unchanged.

### I.5 New probe

`benchmarks/harness/envProbe.js`, modelled exactly on `decisionProbe.js`: a non-invasive wrapper that calls the real `MF1.step`, emits the frame, and returns the outcome untouched.

---

## J. Control and experimental arms

Three arms. All share seed, config, graph, and code path; they differ in exactly one line each.

### ARM_NULL — instrument calibration

`MF1_NULL` config: all `p = 1.0`, `σ = 0` everywhere, reward from a deterministic node table. Belief update fully enabled.

**Purpose:** prove the measurement apparatus reads zero when there is nothing to measure. If `statePredictionError` is not identically 0 in ARM_NULL, the instrument is broken and ARM_LEARN's non-zero result means nothing. **This arm is what makes E7 interpretable.**

### ARM_FROZEN — the control

`MF1_DEFAULTS`. The agent **acts in the stochastic world but does not model it**:

```js
const learningState = MF1.beliefFrozen ? outcome.intendedTo : outcome.arrivedAt;
```

- Physical position always advances to `outcome.arrivedAt` — the world does not care what the agent believes.
- All *learning* writes (`updateQ`'s `nextState`, `updateTransitionUncertainty`, `evaluatePredictionError`'s `actualNextId`) use `learningState`.
- Reward learning is **unchanged and fully enabled**.

The agent therefore holds the belief `T(s,a) = a` — exactly the belief the current architecture implicitly holds.

### ARM_LEARN — the experimental arm

`MF1_DEFAULTS`, `beliefFrozen = false`. Learning writes use `outcome.arrivedAt`.

### Why this is the right control

The contrast is **not** "learning vs not learning" — both arms learn reward identically. The contrast is exactly:

> *Does maintaining a belief that transitions can fail produce better behaviour than assuming they cannot?*

That is a clean, single-variable operationalisation of "belief maintenance", it requires no new cognitive module, and it is measurable with the infrastructure that already exists. `statePredictionError` is structurally 0 in ARM_FROZEN (predicted = actual = `intendedTo`) and non-zero in ARM_LEARN — which also gives a free internal consistency check.

### Primary and secondary metrics

| Metric | Definition | Prediction if H1 holds |
|---|---|---|
| **M1 (primary)** | Mean steps from episode start to goal | LEARN < FROZEN |
| **M2** | Mean reward per step | LEARN > FROZEN |
| **M3** | Slip rate on chosen edges | LEARN < FROZEN (avoids unreliable edges) |
| **M4 (calibration)** | Correlation between agent's `getTransitionUncertainty(u,v)` and true `1 − p(u,v)` | LEARN ≫ 0; FROZEN ≈ 0 |
| **M5 (instrument)** | Mean `statePredictionError` | NULL = 0; FROZEN = 0; LEARN > 0 |

**M4 is the strongest single result available** and I recommend it as the headline: it directly tests whether an internal variable tracks a hidden external quantity it can only reach through observation. That is a defensible operational definition of belief.

### Run protocol

30 seeds × 3 arms × N steps (N ≈ 5,000). Paired comparison across seeds (each seed = one world, all three arms face it). Report paired differences with a bootstrap CI. Pre-register the falsification conditions in §N.

---

## K. Files added and modified

### Added (6 files)

| Path | Purpose | Imported by |
|---|---|---|
| `env/mf1Environment.js` | `createEnvironment`, `step`, `reset`, error classes. All hidden state. | `main.js`, harness |
| `env/mf1Config.js` | `MF1_DEFAULTS`, `MF1_NULL`, `configHash()` | `main.js`, harness |
| `env/mf1Oracle.js` | `groundTruth(captured)`, `calibrationReport()` | **harness and tests only** |
| `benchmarks/harness/envProbe.js` | Behaviour-neutral telemetry wrapper for `step` | harness |
| `experiments/mf1_env/run.js` | 3-arm runner, recorder, report | — |
| `experiments/mf1_env/verify.js` | Tests E1–E10 | — |

New top-level `env/` directory, parallel to `render/` and `instrumentation/`. The name states the boundary. It must not be placed under `render/`.

### Modified (3 files)

| Path | Change | Est. lines |
|---|---|---|
| `instrumentation/rng.js` | +2 stream registrations in `initRng` | +2 |
| `instrumentation/traceSchema.js` | +1 channel, +2 types, version bump | +4 |
| `main.js` | The seam (§L.1) | ~15 changed, ~60 deleted |

### Explicitly NOT modified

`render/scoring.js`, `render/qlearning.js`, `render/planning.js`, `render/predictionError.js`, `render/behavior.js`, `render/episodeManager.js`, `render/schemaMemory.js`, and all remaining `render/**`. **If MF-1 requires a change under `render/`, the boundary has been drawn in the wrong place and the design should come back for review.**

### Not modified but must be neutralised for experimental runs

`main.js:1017` `setInterval(saveBrain, 5000)` and `main.js:1008` `loadBrain()`. `localStorage` persistence across arms is a cross-contamination channel (§P.6). Gate both behind `MF1.persistenceEnabled`, default `true` for interactive play, forced `false` by the harness.

---

## L. The smallest possible implementation

### L.1 The `main.js` seam in full

**Delete** (main.js:3644–3743, ~60 lines): `let rewardSignal = 0`, the already-dead `-= 2` / `-= 0.3` decrements, the `episodeUnique` computation and its `>= 3` guard, and the entire `sim > 0.45 / 0.15` cascade.

**Insert** at that location:

```js
// ── MF-1 ENVIRONMENT BOUNDARY ────────────────────────────────
// The single crossing. Everything the agent learns about what
// happened arrives through `outcome`.
const outcome = MF1.step(next);

const rewardSignal   = outcome.reward;
const learningState  = MF1.beliefFrozen ? outcome.intendedTo : outcome.arrivedAt;
```

**Change** three existing references:

| main.js | From | To |
|---|---|---|
| 3784 | `actualNextId: next` | `actualNextId: learningState` |
| 4617 | `Number(next) === Number(goalNeuronId)` | `Number(outcome.arrivedAt) === Number(goalNeuronId)` |
| 4621 | `agentCurrent = next;` | `agentCurrent = outcome.arrivedAt;` |

**Add** at boot (near main.js:1015, after `connections.json` resolves):

```js
MF1.reset({ startNode: agentCurrent });
```

That is the whole seam: **~15 lines changed, ~60 deleted, net negative.** MF-1 makes `main.js` smaller.

### L.2 Size estimate

| Component | LOC (excl. comments) |
|---|---|
| `env/mf1Environment.js` | 120 |
| `env/mf1Config.js` | 45 |
| `env/mf1Oracle.js` | 40 |
| `benchmarks/harness/envProbe.js` | 30 |
| `experiments/mf1_env/run.js` | 160 |
| `experiments/mf1_env/verify.js` (E1–E10) | 220 |
| `instrumentation/*` edits | 6 |
| `main.js` seam | +15 / −60 |
| **Total new code** | **≈ 635 LOC** |

Against a 17,500-LOC repository, MF-1 is **3.6%**. That ratio is deliberate and should be defended: the thing Phase 0 identified as the blocking architectural gap costs less than four percent of the code already written around it.

### L.3 The honest addendum

The 635 LOC above buys the **environment**. It does not buy a runnable **experiment**, because the agent loop is browser-bound and unseeded (§H.4). Closing that gap costs an additional:

| Item | LOC | Note |
|---|---|---|
| Route 24 `Math.random()` sites through `rng("cognitive")` | ~24 | Mechanical, but touches `render/**` — needs an explicit exception to §K |
| Headless shim (stub `THREE`, minimal DOM, local `fetch`) | ~120 | Test-only, lives under `benchmarks/harness/` |

**Total to a runnable experiment: ≈ 780 LOC.** I would rather state this now than discover it at integration. Decision requested in §Unresolved Q1.

---

## M. Tests that prove the environment is genuinely hidden

| ID | Test | Assertion | Type |
|---|---|---|---|
| **E4** | Static leak audit | No file in `main.js` / `render/**` / `instrumentation/**` contains `__oracleSink`; none imports `env/mf1Oracle.js`; `main.js` contains exactly one `MF1.step(`; `mf1Environment.js` never references `window`, `globalThis`, or `localStorage`. | source scan |
| **E5** | Surface audit | `Object.keys(env)` ⊆ `{step, reset, actionsFrom, tickId, stepCount}`. Every returned outcome is `Object.isFrozen`. Every outcome field is a primitive. Deep-walking every reachable property from `env` reaches no numeric value equal to any `p` or `μ` in ground truth. | runtime |
| **E6** | **Behavioural ablation** | Two envs, different `envStructure` seed, identical agent seed and initial state. Agent action sequences must be bit-identical **up to and including** the first step at which outcomes differ. Divergence before that point ⇒ FAIL. | runtime |
| **E10** | No free sampling | After a run of *K* agent actions, `env.stepCount === K`. Also assert `step()` throws `MF1ReentrantStep` under nesting, and that a run with the look-ahead depth forced to 6 produces the same `stepCount` as depth 2 (proving imagination does not touch the environment). | runtime |

**E6 is the test that matters.** E4 and E5 prove no *named* path exists; E6 proves no path exists.

---

## N. Tests that prove non-zero prediction error

| ID | Test | Assertion |
|---|---|---|
| **E7** | Prediction error is non-zero | Over 2,000 steps in ARM_LEARN: `mean(statePredictionError) > 0.05`, and the empirical slip rate matches `1 − E[p]` within a 95% binomial CI. |
| **E8** | **Null-arm parity (the control)** | The *same binary* under `MF1_NULL` yields `statePredictionError == 0` for every step, and `compositeError` reproduces the Phase 0 relation `= 0.40 × rewardPredictionError`. |
| **E9** | Reward is not computable from public information | Regress `reward` on all public features (`from`, `intendedTo`, `similarity(from,to)`, graph distance to goal). Assert residual variance > 0 with `p < 0.001`. Additionally assert `Var[reward | (from,intendedTo)] > 0` — the same action from the same state must not always pay the same amount. Additionally assert `main.js` contains no `similarity(` call on the `rewardSignal` assignment path. |
| **E11** | Prediction error is *informative*, not merely non-zero | Mutual information between `statePredictionError` at *t* and `slipped` at *t* must be > 0.5 bits. Guards against a non-zero error that is pure noise. |

**E8 is what makes E7 mean anything.** Non-zero prediction error is trivially achievable by breaking something. E8 demonstrates that the *same code* reads exactly zero when the environment is deterministic — so the non-zero reading in E7 is attributable to the environment and nothing else. Without E8, E7 is not evidence.

---

## O. Tests that prove environment determinism

| ID | Test | Assertion |
|---|---|---|
| **E1** | Replay determinism | Same `(seed, config, actionSequence)` → byte-identical outcome sequence and identical final `rngDrawCount`, across 3 independent runs. |
| **E2** | **Structure/sample independence** | Same seed, two *different* action sequences → `groundTruth` objects deep-equal. This is the test that guarantees all arms face the same world. |
| **E3** | Seed sensitivity | Seeds *S* and *S+1* → `groundTruth` differs in > 90% of the 78 reliability entries. |
| **E12** | Cross-environment reproducibility | Node and browser (via the headless shim) produce identical outcome sequences at the same seed. Guards against `Date.now()` or platform float divergence. |
| **E13** | No wall-clock dependence | `mf1Environment.js` contains no `Date.now()`, `new Date()`, or `performance.now()` on any path affecting outcomes. (`makeEnvelope` stamps `ts` — that is telemetry only and must not feed back.) | 

---

## P. Threats to experimental validity

Ordered by severity. **P.1 is a blocking issue and I am raising it as a recommended change to the approved plan.**

### P.1 — BLOCKING: the experiment cannot run before D1 and F2 are repaired

The approved sequencing is *"build environment → then repair severed mechanisms → then run experiment."* Building first is correct. **Running before repair is not**, for two independent reasons:

**D1 (Q-key namespace, Phase 0 Probe A).** `updateQ` writes `"pos#goal->action"`; the scorer reads `"pos->action"`. Measured: 500 RL updates → 0 readable. In ARM_LEARN, every reward the environment pays is written to a key the decision function cannot read. **The learning arm cannot express what it learns.** M1, M2, and M3 would be null by construction, and the null result would be misattributed to the environment or to the belief hypothesis.

*M4 (belief calibration) survives D1*, because `updateTransitionUncertainty` uses its own keyspace. So a D1-unrepaired run could still test M4 — but M1–M3 would be uninterpretable.

**F2 (epsilon stale-action path).** On ~20% of steps, `runPrediction` returns without writing `window.lastReasoning`, and the agent re-executes its previous action. Against a *stochastic* environment this is worse than it was against a deterministic one: it injects an uncontrolled ~20% rate of unintended repeated actions into both arms, inflating variance and biasing slip statistics.

**Recommendation to the Research Director:** amend the sequence to

> build MF-1 → repair **D1 + F2 only** (the minimum viable repair set, ≈ 20 LOC) → run.

D2 (planning id) and D3 (scoring signs) can and should remain unrepaired for MF-1, so the experiment tests one thing at a time. D2 in particular is *helpful* to leave broken: a functioning `futureScore` would give the agent extra model-based reach that confounds the belief comparison.

### P.2 — The agent is not reproducible

24 unseeded `Math.random()` sites (§H.4). Without routing them through `rng("cognitive")`, no two runs at the same seed are comparable, and paired arm comparison is invalid. Cost ≈ 24 LOC but touches `render/**`, which §K otherwise forbids. **Explicit exception requested.**

### P.3 — Uniform reliability would guarantee a null result

Covered in §C.3. If the reliability profile is homogeneous, the optimal policy is unchanged and no belief update can help. **Mitigation:** E14 — assert the default config yields at least one goal-reaching route whose expected return strictly exceeds the shortest topological route. Verified analytically at config load, not discovered at analysis time.

### P.4 — The three highest-weighted score terms are zero without a human

Phase 0 F10: `trajectoryIntegrity×40`, `schemaBonus×15`, and `goalGradientBoost×2` all require `episodicStore` to be non-empty, which requires a human-set goal and manual teaching. An autonomous MF-1 run starts with all three at zero, so the decision function degenerates to a visit-count heuristic — and the arms may be indistinguishable **for reasons unrelated to belief**.

**Mitigation (choose one, Research Director decision — §Unresolved Q2):**
- (a) Set `goalNeuronId` programmatically in the harness and let episodes accumulate autonomously. Cleanest; requires no human.
- (b) Ship a fixed pre-taught brain fixture (a serialised `localStorage` blob) loaded identically in all arms. Controls the starting point exactly, but bakes in a human trajectory.

I recommend **(a)**, with (b) as a robustness replication.

### P.5 — The public topological planner may swamp the belief signal

`goalGradientBoost` reaches ×2 with a base up to 100 (main.js:1827) — up to 200 points, versus `qValue×5` at up to 100. Because topology stays public (§A), the agent has a *perfect* shortest-path signal and only a *learned* reliability signal. If the gradient dominates, the agent will take the short unreliable route regardless of belief, and both arms will behave identically.

**Mitigation:** E15 — a scale audit before the main run. Sweep the reliability contrast and confirm a regime exists where belief measurably changes the argmax. If no such regime exists at the current weights, that is itself a publishable Phase-0-style finding (*"the goal gradient is scaled such that no belief signal can compete"*) and should be reported rather than tuned away.

### P.6 — `localStorage` cross-contamination

`loadBrain()` at boot and `setInterval(saveBrain, 5000)` mean arm *N* inherits arm *N−1*'s Q table, rewards, and episodes. This would silently destroy every paired comparison. **Mitigation:** harness forces `MF1.persistenceEnabled = false`; E16 asserts `localStorage.getItem("brain") === null` at the end of a harness run.

### P.7 — Reward-scale drift

Five downstream systems hard-code the `[-2, 12]` range (§D.3). If a future config widens it, `tanh` saturation and `writeReward`'s cap silently clip the signal. **Mitigation:** E17 — assert `config.clamp` equals `[-2, 12]`; changing it requires deliberately editing the test.

### P.8 — Slip statistics are confounded by the anti-repeat swaps

`runPrediction` at main.js:2451–2463 rewrites `nextKey` to `topChoices[1]` when it would repeat. So `intendedTo` is not always the argmax. **Mitigation:** telemetry must record both the argmax and the post-swap `intendedTo`; analysis conditions on the swap flag.

### P.9 — Multiple-comparison risk

Five metrics × three arms invites cherry-picking. **Mitigation:** pre-register M1 as primary and M4 as the headline mechanism test *before* the first run; treat M2, M3, M5 as secondary and report them regardless of outcome.

### P.10 — The harness may validate a stale copy

Phase 0 D11: `experiments/exec_influence/scoring.real.js` has already drifted from `render/scoring.js`. **Mitigation:** `experiments/mf1_env/` must import `env/mf1Environment.js` **directly**. No `.real.js` copies. E18 asserts no file under `experiments/mf1_env/` matches `*.real.js`.

---

# Closing sections

## 1. Proposed file changes

**Added (6):**
```
env/mf1Environment.js              ~120 LOC   hidden state + step/reset
env/mf1Config.js                   ~45  LOC   MF1_DEFAULTS, MF1_NULL, configHash
env/mf1Oracle.js                   ~40  LOC   ground truth — TESTS/HARNESS ONLY
benchmarks/harness/envProbe.js     ~30  LOC   behaviour-neutral telemetry wrapper
experiments/mf1_env/run.js         ~160 LOC   3-arm runner + report
experiments/mf1_env/verify.js      ~220 LOC   E1–E18
```

**Modified (3):**
```
instrumentation/rng.js             +2   LOC   envStructure, envSample streams
instrumentation/traceSchema.js     +4   LOC   ENV channel, 2 types, version 1.1.0
main.js                            +15 / −60  the seam only
```

**Conditionally modified (requires §P.2 exception):**
```
main.js + render/**                ~24  LOC   route Math.random() through rng("cognitive")
benchmarks/harness/headlessShim.js ~120 LOC   THREE/DOM/fetch stubs — test-only
```

**Not modified:** every other file under `render/`, `research/`, `LAB_NOTES/`, `Portfolio_Assets/`, `PROJECT_MEMORY/`, and `experiments/exec_influence/`.

## 2. Exact interfaces

```js
// ── env/mf1Environment.js ────────────────────────────────────────────
export class MF1IllegalAction  extends Error {}
export class MF1ReentrantStep  extends Error {}
export class MF1NotReset       extends Error {}

/**
 * @param {{id:number}[]}                 nodes         PUBLIC topology
 * @param {{from:number,to:number}[]}     edges         PUBLIC topology
 * @param {number}                        seed
 * @param {MF1Config}                     config
 * @param {(privateState:object)=>void=}  __oracleSink  harness only; main.js MUST NOT pass this
 * @returns {MF1Environment}
 */
export function createEnvironment({ nodes, edges, seed, config, __oracleSink });

// MF1Environment — the complete public surface. Nothing else is reachable.
{
  reset({ startNode }): { at:number, tickId:0 },
  step(intendedTo:number): MF1Outcome,        // frozen
  actionsFrom(node:number): number[],         // === userData.neighbors; PUBLIC
  get tickId(): number,
  get stepCount(): number,
}

/** @typedef MF1Outcome — frozen, all primitives */
{ tickId, from, intendedTo, arrivedAt, slipped, reward, terminal }

// ── env/mf1Config.js ─────────────────────────────────────────────────
export const MF1_DEFAULTS = {
  goalNode: 16,
  reliability: { reliableP:[0.90,0.98], unreliableP:[0.45,0.60], unreliableFraction:0.35 },
  reward: { goalMean:10, goalSd:1.0, hotNodeCount:2, hotMean:3, hotSd:0.8,
            baseMean:0, baseSd:0.4 },
  slip:  { mode:'uniformOtherNeighbour', stayIfNoAlternative:true },
  clamp: { rewardMin:-2, rewardMax:12 },      // MUST match legacy range — see D.3
};
export const MF1_NULL = { /* p = 1.0, sd = 0 — deterministic control */ };
export function configHash(config): string;

// ── env/mf1Oracle.js — HARNESS AND TESTS ONLY ────────────────────────
export function groundTruth(captured): {
  edgeReliability: Record<string, number>,   // "u->v" -> p     (78 entries)
  nodeRewardMean:  Record<string, number>,   // "v"    -> mu    (20 entries)
  hotNodes: number[], goalNode: number, seed: number, configHash: string,
};
export function calibrationReport(groundTruth, agentUncertaintySnapshot): {
  pearsonR: number, spearmanRho: number, n: number,   // metric M4
};

// ── instrumentation/traceSchema.js (additive) ────────────────────────
CHANNELS.ENV = "env";
TYPES.ENV_RESET = "env.reset";     // { startNode, goalNode, nodeCount, edgeCount, configHash }
TYPES.ENV_STEP  = "env.step";      // { from, intendedTo, arrivedAt, slipped, reward, terminal }
SCHEMA_VERSION  = "1.1.0";

// ── instrumentation/rng.js (additive) ────────────────────────────────
initRng(seed) also registers: "envStructure", "envSample"
```

## 3. Test plan

| ID | Proves | Category | Blocking? |
|---|---|---|---|
| E1 | Same seed + action sequence → identical outcomes | determinism (O) | yes |
| E2 | Same seed, different actions → identical ground truth | determinism (O) | **yes — validates arm comparison** |
| E3 | Different seed → different world | determinism (O) | yes |
| E4 | No named path to hidden state (static) | hiddenness (M) | yes |
| E5 | Public surface is minimal; outcomes frozen | hiddenness (M) | yes |
| E6 | **No path at all — behavioural ablation** | hiddenness (M) | **yes — the real proof** |
| E7 | `statePredictionError > 0`; slip rate matches `1 − E[p]` | non-zero PE (N) | yes |
| E8 | **Same code reads exactly 0 under `MF1_NULL`** | non-zero PE (N) | **yes — makes E7 evidence** |
| E9 | Reward not computable from public info; no `similarity()` on the reward path | non-zero PE (N) | yes |
| E10 | `stepCount === actionCount`; imagination never steps | hiddenness (M) | yes |
| E11 | PE is informative (MI with `slipped` > 0.5 bits) | non-zero PE (N) | yes |
| E12 | Node/browser parity | determinism (O) | no |
| E13 | No wall-clock dependence | determinism (O) | yes |
| E14 | Reliability profile admits a belief-exploitable regime | validity (P.3) | **yes** |
| E15 | Goal gradient does not swamp belief | validity (P.5) | **yes** |
| E16 | No `localStorage` contamination across arms | validity (P.6) | yes |
| E17 | Reward clamp is `[-2, 12]` | validity (P.7) | yes |
| E18 | No `*.real.js` copies under `experiments/mf1_env/` | validity (P.10) | yes |

Delivered as `experiments/mf1_env/verify.js` in the style of the existing `verify.js`: `ok(name, cond)`, `process.exit(fail ? 1 : 0)`.

**Gate:** E1–E11, E13–E18 must pass before a single experimental run is recorded.

## 4. Estimated implementation size

| Scope | LOC | Elapsed |
|---|---|---|
| Environment + config + oracle | 205 | ~0.5 day |
| Probe + telemetry + rng edits | 40 | ~0.2 day |
| `main.js` seam | +15 / −60 | ~0.2 day |
| `verify.js` (E1–E18) | 220 | ~0.7 day |
| `run.js` (3 arms, recorder, report) | 160 | ~0.5 day |
| **MF-1 environment subtotal** | **≈ 635** | **≈ 2.1 days** |
| §P.2 RNG routing (needs exception) | 24 | ~0.2 day |
| Headless shim (test-only) | 120 | ~0.5 day |
| **Total to a runnable experiment** | **≈ 780** | **≈ 2.8 days** |

MF-1 is 3.6% of the existing 17,500 LOC.

## 5. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | **D1 unrepaired ⇒ ARM_LEARN cannot express what it learns; M1–M3 null by construction** | **Blocking** | Amend sequence: build MF-1 → repair D1 + F2 (~20 LOC) → run (§P.1) |
| R2 | F2 stale-action path injects ~20% unintended repeats into both arms | High | Same repair set as R1 |
| R3 | 24 unseeded `Math.random()` sites ⇒ runs not comparable | High | §P.2 exception, ~24 LOC |
| R4 | Homogeneous reliability ⇒ guaranteed null result | High | E14, checked at config load |
| R5 | Empty `episodicStore` ⇒ top-3 score terms are 0 ⇒ arms indistinguishable for unrelated reasons | High | §P.4 mitigation (a): programmatic goal |
| R6 | Goal gradient (up to 200 pts) swamps belief signal | Medium | E15 scale audit; report as a finding if unavoidable |
| R7 | `localStorage` contaminates arms | Medium | E16 + `persistenceEnabled = false` |
| R8 | Reward scale drift breaks five downstream consumers | Medium | E17 locks the clamp |
| R9 | Harness drifts from live modules (already happened once) | Medium | Direct imports only; E18 |
| R10 | Multiple-comparison cherry-picking | Medium | Pre-register M1 primary, M4 headline |
| R11 | Scope creep — "while we're in there" additions | Medium | §K's "not modified" list is a review gate; any `render/**` change requires re-review |
| R12 | Headless shim behaves differently from the browser | Low | E12 parity test |

## 6. Unresolved scientific questions

**Q1 — Where does the experiment run?** The browser app is unseeded and DOM-bound. Options: (a) headless shim, ~120 LOC test-only, full determinism; (b) seeded browser runs with manual export, no shim but weaker reproducibility; (c) extract the agent loop into a headless-safe module — rejected, that is architecture redesign and out of scope. **Recommendation: (a).** *Director decision required.*

**Q2 — How does `episodicStore` get populated without a human?** (a) programmatic goal, autonomous accumulation; (b) fixed pre-taught brain fixture. **Recommendation: (a) primary, (b) as robustness replication.** *Director decision required.*

**Q3 — Should the `episodeUnique >= 3` anti-farming guard survive?** It was added to suppress goal-farming under deterministic reward. Under stochastic transitions farming is no longer free, and the guard may mask the effect under test. **Recommendation: delete for MF-1.** *Director decision required.*

**Q4 — Node-reward vs edge-reward.** §D.2 argues for arrival-node reward because it couples reward and transition stochasticity. Edge-reward would decouple them and give a cleaner Q-learning target but a weaker test of belief. **Recommendation: node-reward.** Worth an explicit ruling since it is not reversible without re-running everything.

**Q5 — Is M4 (belief calibration) a sufficient operational definition of belief maintenance?** Correlating `getTransitionUncertainty(u,v)` with true `1 − p(u,v)` shows an internal variable tracking a hidden external quantity reachable only through observation. I believe that is defensible. **The Director should rule on it before the first run**, because it is the headline claim and post-hoc definition changes are not acceptable.

**Q6 — What is the pre-registered falsification condition for H1?** Proposal: *if the paired difference `FROZEN − LEARN` in mean steps-to-goal has a 95% bootstrap CI containing 0 across 30 seeds, H1 is refuted.* Note this is refutable in two distinct ways — belief genuinely does not help, or the environment does not reward belief (R4/R6). **E14 and E15 must pass first**, otherwise a null result is uninterpretable. *Director sign-off required before any run.*

**Q7 — Does MF-1 change the Phase 0 verdict if the experiment returns null?** Stated in advance for the record: a null result would mean MiniFlyWire's *scoring architecture* cannot exploit belief even when belief is available and correct. That is a finding about the architecture, not about MF-1, and it would be the strongest argument yet for the Phase 0 conclusion that the decision function — not the module inventory — is the thing that needs rethinking.

---

**End of specification. Awaiting Research Director approval. No implementation will begin, and no repository file will be created or modified, before that approval.**
