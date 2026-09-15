# Phase 0 — Cognitive Loop Audit

The loop from the project instructions, arrow by arrow. An arrow is **CARRIES DATA** only if a value produced upstream changes a value consumed downstream in a way that can change the selected action.

---

## Arrow-by-arrow

### PERCEIVE → SITUATION — ✗ VACUOUS

There is no perception (`02_COMPONENT_LEDGER.md` §1). "Situation" is `agentCurrent`, an integer the agent assigned itself on the previous tick. Nothing is perceived and nothing is constructed.

**Files:** main.js:3071–3083 (initial random placement), main.js:4621 (`agentCurrent = next`).
**Mechanism:** assignment.
**Evidence:** none required — there is no input channel to trace.

---

### SITUATION → MEMORY — ✓ CARRIES DATA

`transitions.get(currentKey)` (main.js:1391), `startNeuron.userData.neighbors` (1403), `rewards.get(currentKey+"->"+k)` (1633), `adjacencyMemory.get(...)` (1549). Keyed lookups on the current node id. Real dataflow.

**Mechanism:** deterministic keyed retrieval.
**Caveat:** memory content is derived entirely from traversals of a graph the agent already possesses in full at t=0. Retrieval cannot surface anything not already in `connections.json`.

---

### MEMORY → BELIEF — ✗ BROKEN

`uncertaintyLedger` computes correct Beta posteriors from memory (`getProceduralUncertainty`, uncertaintyLedger.js). They are spread into `calculateDecisionScore` at main.js:2040 and land in `...rest` (scoring.js:126). Discarded.

`predictionError.uncertaintyState` and `getTransitionUncertainty` are passed explicitly and sit under scoring.js's comment *"Additional params (accepted, unused)"* (scoring.js:120–125).

**Verdict:** beliefs are constructed and then deleted. Three of four uncertainty representations never reach a decision; the fourth (`uncertaintyEngine`) modulates a term worth ≤0.0042 points.

---

### BELIEF → PREDICTION — ✗ VACUOUS

`generateExpectation` (main.js:2864, predictionError.js:82) takes no belief as input. Its arguments are `window.lastReasoning.to` (the action already chosen), `rewards.get(...)`, and `similarity(...)`. No uncertainty, no posterior, no distribution.

---

### PREDICTION → ACTION OPTIONS — ✗ ABSENT

Candidate generation (main.js:1474–1484) is `transitions.get(currentKey) ∪ neighbours`, filtered by four hard gates. No prediction participates. The candidate set is a function of the static graph and the transition table only.

---

### ACTION OPTIONS → DECISION — ✓ CARRIES DATA, ⚠ CORRUPTED

`calculateDecisionScore` runs per candidate and its output is argmaxed. Data flows.

Corrupted by four measured sign inversions (`04_FALSIFICATION_EVIDENCE.md`, Probe C):
- `boredomPenalty` → **+2.00** per unit
- `dangerPenalty` → **+2.00** per unit (a path with `penalty=5` gains **+15**)
- `stressState` → **+0.575** per unit
- `dominantDrive="hunger"` → **−1.99** on a reward-8 candidate

Twelve upstream quantities never arrive (`01_RUNTIME_MAP.md` §6). One (`score`) arrives as `undefined`.

---

### DECISION → ACTION — ⚠ PARTIAL

Two independent selections happen:
- `bestChoice = sorted[0]` (main.js:2236) → `lastDecision` → the console explanation and the HUD.
- `nextKey = topChoices[0].key` (main.js:2448) → the actual move, computed after two more `forEach` blocks push extra candidates on a different scale.

They can disagree. The system's stated reason for acting is not necessarily the reason it acted.

On the epsilon branch (main.js:2222–2229), `runPrediction` returns without writing `window.lastReasoning`. `runAgent` then acts on the **previous** tick's decision. Data does not flow; a stale value is reused.

---

### ACTION → OUTCOME — ✗ NON-EXISTENT

This is the arrow that decides the whole question.

There is no environment. `rewardSignal` (main.js:3707–3743) is:

```js
if (next === goalNeuronId) rewardSignal = (new Set(recentMemory).size >= 3) ? 12 : 0;
else if (sim > 0.45)       rewardSignal = 2;
else if (sim > 0.15)       rewardSignal = 0.3;
else                       rewardSignal = -0.4;
```

Every input — `next`, `goalNeuronId`, `recentMemory`, `sim` — is available to `calculateDecisionScore` *before* the action. The transition is deterministic (`agentCurrent = next`, no failure mode, no stochasticity, no hidden state). Nothing is observed, because there is nothing to observe.

**The agent cannot be surprised.** Not "is rarely surprised" — cannot, structurally.

---

### OUTCOME → PREDICTION ERROR — ✗ TAUTOLOGICAL

Measured (Probe D), over the exact `main.js` call sequence:

| component | measured | reason |
|---|---|---|
| `statePredictionError` | 0.000 in every step | predicted `= lastReasoning.to`, actual `= lastReasoning.to` |
| `semanticPredictionError` | 0.000 in every step | both compute `similarity(from,to)` on unchanged vectors |
| `goalPredictionError` | 0.000 in every step | both compute `to === goalNeuronId` |
| `compositeError` | `= 0.40 × rewardPredictionError` exactly (±1e-12) | the other three weights multiply zero |

`rewardPredictionError = |rewards.get(k) − f(similarity(k))| / 6`. Both operands are internal tables read at the same instant. The "prediction error" measures how far the reward table has drifted from the embedding table. It is an internal consistency metric, not an error signal about a world.

---

### PREDICTION ERROR → LEARNING — ✓ CARRIES DATA, ⚠ MEANINGLESS CONTENT

The plumbing here is genuinely well built. `compositeError` drives `effectiveLR = 0.1 × learningAuthority` (main.js:3806), `dampQ` (3858), `updateTransitionUncertainty` (3829), `updateSemanticUncertainty` (3888), `applyPredictionErrorToBehavior` (3970), the epsilon boost (3915), and emergency recovery (3948).

Every one of those is driven by a quantity that carries no information about the world.

---

### LEARNING → UPDATED BELIEF/MODEL — ✗ BROKEN AT THE KEY LEVEL

**Defect D1**, the single most consequential finding.

```js
// WRITE — main.js:3815, 3988
updateQ({ state: makeStateKey(agentLast, goalNeuronId), action: next, ... });   // key "5#16->6"

// READ — main.js:1500, 1689 (inside candidate scoring)
const qValue = getQ(currentKey, k);                                            // key "5->6"
```

Measured (Probe A): **500 autonomous Q updates → 275 Q entries written → 0 readable by `calculateDecisionScore`.**

`episodeManager.js:942` writes bare keys (`state: from, action: to`) — those *are* readable. So the only Q signal reaching action selection originates in human teaching and replay of human teaching.

`dampQ(agentLast, next, ...)` (main.js:3858) also uses bare keys. Measured: it decrements the teaching-derived value and leaves the RL-derived value untouched.

**Net effect of reinforcement learning on this system: it erodes the supervised signal and contributes nothing.**

Meanwhile seven subsystems (`semanticMemoryLayer`, `longTermConsolidation`, `cognitiveAttention`, `activationCompetition`, `uncertaintyEngine`, `semanticVitality`, `motivationalState.recordOutcome`) receive essentially all their writes from the `else` branch at main.js:3981–4095, which executes exclusively when `evaluatePredictionError` returned `null` — i.e. exclusively on epsilon steps, i.e. exclusively when the decision system was bypassed and a stale action was re-executed. (Two writers sit outside it — `weakenPath` at 1220 in `pruneGoalWraparound`, `boostActivation` at 4455 in the goal-reached block — and both are also outside the autonomous decision loop, requiring a human click. Line-by-line verification in `04_FALSIFICATION_EVIDENCE.md`, F3.)

---

### UPDATED BELIEF → NEXT DECISION — ⚠ PARTIAL

What genuinely closes:

| Loop | Write | Read | Weight |
|---|---|---|---|
| `transitions` | main.js:4338, episodeManager | main.js:1391, 1529, 1706 | ×3 |
| `rewards` | main.js:4260, 4403 | main.js:1633 | `tanh(r·0.1)·8` |
| `episodicStore` → `adjacencyMemory` | `rebuildAdjacencyMemory` | `trajectoryConfidence`, `computeTrajectoryIntegrity` | **×40** |
| `episodicStore` → `schemas` | `rebuildSchemas` | `getSchemaBonus` | **×15** |
| `trustMemory` | main.js:4303 | `getPathTrust` | ×1.5 |
| `penalties` | main.js:4315 | main.js:1491 gate, 1758 | gate works; score term inverted |
| `curiosityMap` | main.js:4178 | main.js:1638 | ×2, max 0.16 |
| `behavior` states | `regulateBiology`, `updateBehavior` | scoring, epsilon, depth | mixed signs |

What does not close: Q from RL, all four uncertainty systems, momentum, activation competition, working memory, `signals`, `timeMemory`, `confidenceMap`, `attentionMap`, `chainMemory`.

**Crucially:** the three highest-weighted terms in the whole decision function — `trajectoryIntegrity×40`, `schemaBonus×15`, `goalGradientBoost×2` — all derive from `episodicStore`, which is populated by `recordManualClick` (human) and by `recordAutonomousSuccess`, which fires only when `current === goalNeuronId`. **With `goalNeuronId === null` (the default), the store stays empty and all three terms are identically zero.**

---

## The loop, redrawn as it actually is

```
                 [human: Shift+click sets goal, clicks a training path]
                                        │
                                        ▼
                            episodicStore, transitions,
                            rewards, bare-key Q, embeddings
                                        │
   ┌────────────────────────────────────┼─────────────────────────────────┐
   │                                    ▼                                 │
   │   agentCurrent ──► candidate set (static graph ∪ transitions)        │
   │        ▲                           │                                 │
   │        │                           ▼                                 │
   │        │              calculateDecisionScore  ← 4 inverted signs     │
   │        │                  (+0.26% from arbitrate)                    │
   │        │                           │                                 │
   │        │                           ▼                                 │
   │        │              argmax ──► agentCurrent = next                 │
   │        │                           │                                 │
   │        │                           ▼                                 │
   │        │        rewardSignal = f(next, similarity)   ← COMPUTED,     │
   │        │                           │                    NOT OBSERVED │
   │        │                           ▼                                 │
   │        │        compositeError = 0.40·|rewards − f(sim)|             │
   │        │                           │                                 │
   │        │            ┌──────────────┴───────────────┐                 │
   │        │            ▼                              ▼                 │
   │        │   updateQ("pos#goal->act")      [epsilon branch only]       │
   │        │            │                    semanticLayer, consolidation│
   │        │            ✗ NEVER READ         attention, activation,      │
   │        │       (read key is "pos->act")  uncertaintyEngine, vitality │
   │        │                                          │                  │
   │        └──────────────────────────────────────────┘                  │
   │                    (transitions / rewards / trust only)              │
   └──────────────────────────────────────────────────────────────────────┘
```

**Of the twelve arrows in the specified loop: two carry data cleanly, three carry data with corrupted content or values, and seven are vacuous, tautological, or broken.**

The loop does not close end-to-end. It closes through a shortcut: human teaching → `transitions`/`rewards`/`episodicStore` → score → action → `transitions`/`rewards`. Everything between "action" and "learning" — outcome, prediction, prediction error — is a computation over the system's own internal state, and the reinforcement-learning arm of the loop is severed by a key-namespace mismatch.
