# MiniFlyWire — Engineering Architecture

Engineering reference for the MiniFlyWire cognitive-agent codebase. It describes how the
system is structured, how it boots, how a decision is made on each step, where state lives,
and how to extend it. Audience: developers maintaining or building on the engine.

---

## 1. What the system is

MiniFlyWire is a browser-based, single-agent cognitive sandbox rendered in 3D. A small graph
of 20 "neurons" is drawn with Three.js; an agent walks that graph one node per step. Each step
is a decision: the agent scores every reachable neighbor using a blend of reinforcement-learning
value (Q), reward/penalty memory, semantic similarity, episodic recall, motivational drives,
affective state, and uncertainty, then moves to the winner. Movement outcomes feed back into the
learning and memory systems, so behavior changes over time.

The codebase is plain ES modules plus a global Three.js. There is no build step, framework, or
bundler. It runs from a static file server (e.g. VS Code Live Server).

---

## 2. Project layout

`index.html` and `main.js` live at the project root. All engine modules live in a `render/`
subdirectory — `main.js` imports them as `./render/<name>.js`, and they import each other as
`./<name>.js` (siblings within `render/`).

```
MiniFlyWire/
├── index.html                  # loads THREE (CDN) + main.js as a module
├── main.js                     # orchestrator: boot, agent loop, decision pipeline, input
├── neurons.json                # 20 neurons (id, label, cluster, x/y/z)
├── connections.json            # 39 directed edges (from, to, confidence, histories)
└── render/
    ├── scene.js  render.js  stars.js  connections.js  neuronVisuals.js  ui.js  hud.js
    ├── helpers.js  search.js  memory.js  knowledge.js
    ├── qlearning.js  embeddings.js  momentumMemory.js  trustMemory.js
    ├── scoring.js  executiveController.js  motivationalState.js  candidateAnalysis.js
    ├── cognitiveAttention.js  activationCompetition.js  planning.js
    ├── behavior.js  emotionMap.js
    ├── episodeManager.js  episodicContextEngine.js  schemaMemory.js
    ├── longTermConsolidation.js  semanticMemoryLayer.js  semanticActivation.js
    ├── semanticVitality.js  semanticProvenance.js  semantic.js  episodic.js
    └── predictionError.js  uncertaintyEngine.js  uncertaintyLedger.js
```

> Running the project requires this layout. `index.html` references `./main.js`; `main.js`
> references `./render/*.js`. Serve the root directory over HTTP (ES modules and `fetch()` of
> the JSON files do not work from `file://`).

---

## 3. Runtime model

- **Module system:** native ES modules (`import`/`export`). No transpilation.
- **Three.js:** loaded as a global `<script>` (CDN). Engine modules use the global `THREE`
  symbol directly; they do not import it. Only the rendering layer touches `THREE`.
- **Orchestration:** `main.js` is the single hub. It imports every engine module and wires
  them together. No engine module imports `main.js`.
- **Coupling style:** modules are decoupled at import time and connected at runtime by
  dependency injection. `main.js` hands live function references and shared stores to the
  memory systems during initialization (see §7).

### Boot sequence

`main.js` executes top-to-bottom on load:

1. Create the starfield and register it with the render loop (`createStars`, `setStars`),
   and give the visual layer the scene group (`setVisualsGroup`).
2. Create the empty `neuronMap` and wire it into the search, embedding, and connection layers
   (`setNeuronMap`, `setEmbeddingNeuronMap`, `setConnectionNeuronMap`).
3. `fetch('neurons.json')` → for each neuron, build its 3D representation
   (`createFuturisticNeuron`), attach `userData` (including a fresh random embedding), and store
   it in `neuronMap`. Then run an initial pass of `trainEmbedding` over every `conceptRelations`
   pair so semantically related neurons start closer in embedding space.
4. `fetch('connections.json')` → for each edge, draw the line (`createFuturisticConnection`,
   `connectPoints`) and register the bidirectional neighbor relationship in `userData.neighbors`.
5. `_initEpisodeManagerWhenReady()` wires the episodic substrate (see §7).
6. The render loop (`animate`) runs continuously; the agent loop starts on user input (Spacebar).

Boot is asynchronous (two chained `fetch` promises). The episode manager is intentionally
initialized inside the connections `.then(...)`, after `neuronMap` is fully populated.

---

## 4. Core data structures

### 4.1 The neuron map (`neuronMap`)

`neuronMap` is a `Map<number, THREE.Mesh>`: neuron id → its core sphere mesh. The mesh carries
all cognitive metadata in `userData`:

```js
neuron.userData = {
  isNeuron: true,
  id,                 // logical neuron id (matches neurons.json)
  label,              // e.g. "percept", "infer", "goal"
  cluster,            // one of: perception | memory | reasoning | action | learning
  neighbors: [],      // logical ids of graph-adjacent neurons (filled at connect time)
  embedding,          // Float[32] unit vector, mutated by trainEmbedding
};
```

This is the central representation: graph adjacency, cluster identity, and the semantic
embedding all live on the render mesh. Anything that reasons over the graph resolves a neuron via
`findNeuronById(id)` and reads `userData`. When writing keys, always use the logical id
(`userData.id`), not the Three.js object id.

The 20 neurons are organized into 5 clusters of 4 (perception, memory, reasoning, action,
learning). Each cluster has a fixed color (`CLUSTER_COLORS` in `neuronVisuals.js`).

### 4.2 Shared learning/memory stores

Singleton `Map`s exported from `memory.js`, `qlearning.js`, and `trustMemory.js`. They are the
mutable backbone of learning state and are read/written from many modules.

| Store | Module | Key format | Meaning |
|---|---|---|---|
| `Q` | qlearning | `"state->action"` | Q-value, clamped to ±20 |
| `transitions` | memory | `"from->to"` | how often a path was taken |
| `rewards` | memory | `"from->to"` | accumulated reward on a path |
| `penalties` | memory | `"from->to"` | accumulated penalty on a path |
| `confidenceMap` | memory | `"from->to"` | visual/confidence signal |
| `signals` | memory | `"from->to"` | path importance |
| `curiosityMap` | memory | `"from->to"` | visit counts for novelty |
| `thoughtTrail` | memory | array | recent node history |
| `pathSuccesses` / `pathAttempts` | trustMemory | `"from->to"` | Bayesian trust evidence |

All path keys use the `"from->to"` string convention with logical ids.

### 4.3 Concept relations (`knowledge.js`)

`conceptRelations` is a static label→[labels] adjacency describing semantic relatedness
(e.g. `percept: ["signal", "context", "salience"]`). It is independent of the graph edges in
`connections.json` and is used for initial embedding training and for the semantic meaning bonus
during candidate analysis.

### 4.4 Cross-step runtime state on `window`

Some per-run state is kept on `window` so it survives across the asynchronous step boundaries:

| Global | Purpose |
|---|---|
| `window.recentMemory` | recent node-id path window |
| `window.lastReasoning` | `{from, to}` of the most recent decision |
| `window.homeNeuronId` | id treated as "home/rest" for recovery logic (persisted) |
| `window._predictionErrorEpsilonBoost` | temporary exploration boost after large surprise |

Treat these as part of the engine's runtime contract; several decision and learning steps read
them.

---

## 5. Subsystem reference

The engine is organized into eight layers. Each entry lists the layer's responsibility, its
modules, and the key entry points.

### 5.1 Rendering / scene
`scene.js`, `render.js`, `stars.js`, `connections.js`, `neuronVisuals.js`, `ui.js`, `hud.js`

Owns the Three.js scene, camera, renderer, animation loop, and all visual elements (glowing
cluster-colored neurons, connection lines, travel dots, click flashes, starfield), plus two DOM
overlays: the reasoning box (`ui.js`, bottom-left) and the live HUD (`hud.js`, top-right).

- `scene.js` — exports `scene`, `camera`, `renderer`, `group`; mouse-wheel zoom and resize handlers.
- `render.js::animate()` — the rAF loop: rotates stars, calls `tickNeuronPulse`, decays per-neuron
  activation scale, renders.
- `neuronVisuals.js` — `createFuturisticNeuron`, `createFuturisticConnection`, `flashNeuronClick`,
  `spawnTravelDot`, `setNeuronHighlight`, `CLUSTER_COLORS`.
- `connections.js::connectPoints` — draws an edge and registers the neighbor relation in both
  endpoints' `userData.neighbors`.
- `hud.js::updateHUD({...})` — re-renders the metrics panel (thought, curiosity, stress,
  confidence, fatigue, focus, Q, future, score, dominant drive, episode/stable counts).

### 5.2 Foundation
`helpers.js`, `search.js`, `memory.js`, `knowledge.js`

- `helpers.js` — `normalize`, `dot`, and `growReward(old, delta)` (diminishing-returns growth used
  instead of a hard reward cap).
- `search.js` — `setNeuronMap`, `findNeuronById` (resolves a logical id to its mesh).
- `memory.js` / `knowledge.js` — the shared stores and concept relations described in §4.

### 5.3 Procedural learning
`qlearning.js`, `embeddings.js`, `momentumMemory.js`, `trustMemory.js`

- `qlearning.js` — `getQ`, `setQ`, `updateQ({state, action, reward, nextState, alpha=0.35,
  gamma=0.75})` (Bellman update, Q clamped to ±20), and `dampQ` (surprise-driven multiplicative
  decay used to break stale high-Q loops).
- `embeddings.js` — `createEmbedding(size=32)`, `trainEmbedding(id1, id2)` (symmetric attraction +
  selective push-away of unrelated neurons, with a learning rate scaled by Q-certainty),
  `similarity(a, b)` (cosine via dot product on unit vectors).
- `momentumMemory.js` — remembers `prev→current→next` flow and provides a momentum bonus for
  continuing an established sequence.
- `trustMemory.js` — Bayesian (Laplace-smoothed Beta) path trust: `recordAttempt`, `recordSuccess`,
  `getPathTrust` = `(successes+1)/(attempts+2)`. Trust is written only by validated autonomous
  success, not by manual teaching.

### 5.4 Decision / arbitration
`candidateAnalysis.js`, `scoring.js`, `executiveController.js`, `motivationalState.js`,
`cognitiveAttention.js`, `activationCompetition.js`, `planning.js`

This is the per-step decision pipeline. See §6 for the full flow.

- `candidateAnalysis.js::analyzeCandidate({...})` — per-candidate feature extraction: blocks
  invalid moves (self-loops, heavily penalized paths, goal-unreachable), computes semantic
  similarity, the meaning bonus (direct and one-step transitive `conceptRelations` matches,
  refractory- and uncertainty-gated), attention, signal strength, and time decay.
- `motivationalState.js` — six drives (hunger, boredom, stress, fatigue, social, uncertainty)
  updated each step from behavior state; `computeExecutiveWeights()` maps drives to component
  weights `{wReward, wSemantic, wConfidence, wUncertainty, wCuriosity, wCost}`;
  `getMotivationalSnapshot()` exposes the dominant drive.
- `scoring.js::calculateDecisionScore({...})` — combines all candidate signals into a single
  weighted score, clamped to ±400. As a side effect it writes `lastArbitrationBreakdown`
  (component sub-scores) for the arbitration stage and the HUD.
- `executiveController.js::arbitrate({...})` — competitive ("winner-takes-more") arbitration over
  normalized pressure signals scaled by the executive weights; `explainArbitration` renders a
  human-readable breakdown for the reasoning box.
- `cognitiveAttention.js` — maintains a focus vector from recent rewarding nodes and amplifies
  candidates aligned with it.
- `activationCompetition.js` — lateral-inhibition activation state used to bias competing
  candidates.
- `planning.js::futureScore(...)` — bounded look-ahead estimate of downstream reward toward the
  goal; feeds the `futureBonus` term.

### 5.5 Affective / biological
`behavior.js`, `emotionMap.js`

- `behavior.js` — global affective state (`curiosityState`, `confidenceState`, `stressState`,
  `fatigueState`, `focusState`) plus an energy/exhaustion/loop-stress body model.
  - `regulateBiology({activity, mentalLoad, repetition, loopDepth, danger, isHome})` recomputes
    the body each step (energy drain, exhaustion, loop suffering, fatigue).
  - `updateBehavior({reward, penalty, success, repeated, pathLength, isHome})` updates the
    emotional states once per step.
  - `applyPredictionErrorToBehavior(predError)` translates a prediction-error severity tier into
    stress/confidence/curiosity/loop-stress changes.
  - Mutators `changeStress` / `changeFatigue` exist because external modules cannot reassign
    `export let` bindings directly.
- `emotionMap.js` — per-path "local emotions" (confidence, stress, fatigue, trust, fear) that feed
  the scoring function as path-specific affect.

### 5.6 Episodic / semantic memory
`episodeManager.js`, `episodicContextEngine.js`, `schemaMemory.js`, `longTermConsolidation.js`,
`semanticMemoryLayer.js`, `semanticActivation.js`, `semanticVitality.js`, `semanticProvenance.js`,
`semantic.js`

- `episodeManager.js` — the unified episodic substrate and single entry point for all episodic
  learning. Every experience (manual click, autonomous success, autonomous step, replay) becomes
  an `Episode` and is pipelined once into the downstream memory systems. Key exports:
  `recordManualClick`, `recordAutonomousSuccess`, `recordAutonomousStep`, `replayOneEpisode`,
  `getAllEpisodes`, `getEpisodeStats`, `exportEpisodes`/`loadEpisodes`, and the `episodicStore`.
- `episodicContextEngine.js` — working memory with decay and automatic episode segmentation
  (topic-shift detection, episode sealing, learning gating). Sealed episodes are bridged into
  `episodeManager` via the bridge registered at init.
- `schemaMemory.js` — read-only abstraction layer above episodes; extracts recurring node "roles"
  across episodes and provides `getSchemaBonus(fromId, toId)`.
- `longTermConsolidation.js` — promotes frequently reinforced edges to stable long-term memory;
  `reinforcePath`, `getConsolidationScore`, `getConsolidationSummary`.
- `semanticMemoryLayer.js` — cortical-style generalization and noise suppression over edges;
  `recordSemanticEdge`, `getNoiseSuppressedScore`.
- `semanticActivation.js` — refractory inhibition that reduces the semantic bonus for
  recently-traversed pairs (anti-perseveration).
- `semanticVitality.js` — separates earned semantic strength (slow) from current vitality (fast).
- `semanticProvenance.js` — tags every semantic write with a source authority weight
  (direct experience > manual > autonomous > replay/inferred) to gate learning influence.

### 5.7 Uncertainty / prediction
`predictionError.js`, `uncertaintyEngine.js`, `uncertaintyLedger.js`

- `predictionError.js` — predictive-processing layer: `generateExpectation` before action,
  `evaluatePredictionError` after action (returns a structured error object with a severity tier),
  plus per-transition and sequence-level error tracking.
- `uncertaintyLedger.js` — Beta-distribution epistemic uncertainty per transition and per concept
  pair (`getProceduralUncertainty`, `getCombinedSemanticUncertainty`), with propagation and decay.
- `uncertaintyEngine.js` — prediction-surprise / inconsistency / novelty signals
  (`updateUncertainty`, `getUncertaintyScore`).

These uncertainty signals reduce the weight of semantic meaning and increase exploration when the
agent's world-model is unreliable.

---

## 6. The decision pipeline (per step)

For the current neuron, `runPrediction(startKey)` evaluates every candidate neighbor and selects
one. The flow per candidate:

```
1. updateMotivationalState(behavior states)            // once per step
   executiveWeights = computeExecutiveWeights()          // {wReward..wCost}

2. for each candidate k:
   a. analyzeCandidate(...)        -> semantic similarity, meaning bonus, attention, signal, time
   b. gather signals:
        qValue          = getQ(currentKey, k)
        reward/penalty  = rewards/penalties memory
        futureBonus     = min(futureScore(...) * 4, 20)
        bayesianTrust   = getPathTrust("current->k")
        schemaBonus     = getSchemaBonus(...)
        trajectoryIntegrity, consolidationBonus, noiseSuppressedScore,
        attentionAmplifiedScore, semanticVitalityScore,
        uncertainty (procedural + per-transition + sequence),
        local path emotions, motivational drive
   c. finalWeight = calculateDecisionScore({ ...signals, executiveWeights })   // writes breakdown
   d. competitiveScore = arbitrate({ ...lastArbitrationBreakdown, executiveWeights })
   e. weight = 0.60 * finalWeight + 0.40 * competitiveScore
   f. choices.push({ key: k, weight })

3. softmax over weights -> probabilities
   epsilon-greedy selection (epsilon boosted by stress-escape and prediction-error)
   nextKey = chosen candidate

4. (step 0 only) updateHUD(...)
5. regulateBiology({...})   // body update at end of the prediction pass
```

The two scoring stages are complementary: `calculateDecisionScore` produces a learned linear score
(weighted toward Q/reward/episodic signals); `arbitrate` produces a competitive score where the
dominant motivational pressure leads. They are blended 60/40 so learned value dominates while
motivation modulates.

`lastArbitrationBreakdown` is a module-level handoff: `calculateDecisionScore` writes the component
sub-scores, and `arbitrate` reads them on the next line. The two calls are synchronous and
adjacent; preserve that ordering if you refactor.

### Signal catalogue (inputs to `calculateDecisionScore`)

| Signal | Source | Role |
|---|---|---|
| `qValue` | qlearning | learned procedural value |
| `transitionBoost` | transitions memory | path familiarity |
| `reward` | rewards memory | direct path reward |
| `habitBoost` | curiosity/visit memory | repeated-success habit |
| `curiosityBoost` | curiosityMap | novelty pull |
| `meaningBoost` | candidateAnalysis | semantic relatedness (small weight) |
| `semanticVitalityScore` | semanticVitality | experience-based semantic signal |
| `noiseSuppressedScore` | semanticMemoryLayer | rewards stable edges, penalizes noise |
| `consolidationBonus` | longTermConsolidation | stable-LTM edges |
| `schemaBonus` | schemaMemory | abstract-pattern membership |
| `trajectoryIntegrity` | main (`computeTrajectoryIntegrity`) | episode-context coherence |
| `attentionAmplifiedScore` | cognitiveAttention | focus alignment |
| `futureBonus` | planning | look-ahead reward |
| `goalGradientBoost` | main (`goalDistance`) | pull toward the goal |
| `bayesianTrust` | trustMemory | earned reliability |
| `uncertaintyScore` / transition / sequence | uncertainty layers | reliability damping |
| `local*` emotions | emotionMap | per-path affect |
| `curiosity/confidence/stress/fatigue/focus State` | behavior | global affect |
| `executiveWeights` / `dominantDrive` | motivationalState | motivational modulation |

---

## 7. Memory & learning wiring (dependency injection)

The episodic substrate is connected at boot, not via static imports. `_initEpisodeManagerWhenReady()`
in `main.js` calls:

```js
initEpisodeManager({
  transitions, rewards, confidenceMap,        // shared stores
  updateQ,                                     // q-learning
  PROVENANCE, writeReward, logActivation,      // provenance-gated writes
  trainEmbedding,                              // embeddings
  reinforceEpisodeSemantics, reinforceSemanticStrength,  // semantic vitality
  recordSuccess,                               // bayesian trust (autonomous only)
  reinforcePath,                               // long-term consolidation
  findNeuronById, learnMomentum,
  rebuildSchemas,                              // injected to avoid a circular import
});
initSchemaMemory({ findNeuronById });
setConceptRelations(conceptRelations);         // data-drive the context engine
setEpisodeManagerBridge(sealedEp => recordAutonomousSuccess(...));  // context engine -> manager
```

This is the architectural contract for the memory layer: episode recording is the single funnel,
and each downstream system (Q, embeddings, trust, consolidation, semantics, schema) updates at its
own rate from that funnel. To add a memory consumer, inject its writer here and call it from the
`episodeManager` pipeline rather than importing across modules.

### What writes where, and when

- **Per autonomous step:** `recordAutonomousStep` (lightweight) + the live learning writes in
  `runAgent` (Q update, reward/penalty/curiosity/trust/semantic edges, prediction error).
- **On goal reach (manual or autonomous):** `recordManualClick` / `recordAutonomousSuccess` seal an
  episode and run the full pipeline (Q, embedding, trust, consolidation, schema rebuild).
- **Provenance gating:** writes carry a source tag; lower-authority sources (replay, inferred) get
  reduced learning influence via `semanticProvenance`.

---

## 8. Execution flow (agent loop)

```
runAgentLoop()        // scheduler; runs while agentRunning, interval = agentSpeed
  └─ runAgent()
       ├─ runPrediction(currentId)        // §6 decision pipeline -> next node
       ├─ move agent (spawnTravelDot, flashNeuronClick, highlight)
       ├─ live learning writes:
       │    updateQ(...), rewards/penalties/curiosity/signals/time memory,
       │    recordAttempt/recordSuccess (trust), recordSemanticEdge,
       │    momentum, semantic vitality
       ├─ evaluatePredictionError(...) -> applyPredictionErrorToBehavior(...)
       ├─ updateBehavior(...)             // single affective update per step
       └─ episodic recording (step / success), schema/adjacency rebuild on seal
```

Input handlers (`main.js`): Spacebar toggles autonomous training; clicking a neuron raycasts to
select it, runs a manual prediction/teaching step, and (if it is the goal) seals and trains the
episode.

State persists across sessions through `saveBrain()` / `loadBrain()` (localStorage), which
serialize the full learned state — Q-table, transitions, rewards, penalties, signals, episodic
store, and `homeNeuronId` — so a reload resumes the trained brain.

---

## 9. Goals and navigation

- `goalNeuronId` (nullable) is the current target. When set, candidates that cannot reach the goal
  within a bounded depth are filtered out (`canReachGoal`).
- `goalDistance` provides a bounded graph-distance estimate that becomes the `goalGradientBoost`
  pull term.
- `trajectoryConfidence` / `computeTrajectoryIntegrity` measure how well a candidate continues a
  path that has actually occurred in stored episodes, giving episode-consistent routes preference
  over semantically-similar shortcuts.
- `adjacencyMemory` counts how often each `A→B` appeared as consecutive steps in sealed episodes
  and is rebuilt whenever episodes change.

---

## 10. Extending the system

**Add a neuron.** Append an entry to `neurons.json` (`id`, `label`, `cluster`, `x/y/z`) and add its
edges to `connections.json`. If it should participate in semantic bonuses, add its label and
relations to `conceptRelations` in `knowledge.js`. Use one of the five existing cluster names so it
inherits a color.

**Add a decision signal.** Compute it per candidate in `runPrediction`, pass it into
`calculateDecisionScore({...})`, and add a weighted term in `scoring.js`. If it should also affect
competitive arbitration, fold it into the relevant `lastArbitrationBreakdown` component.

**Add a memory consumer.** Inject its writer through `initEpisodeManager({...})` and invoke it from
the `episodeManager` pipeline. Avoid importing memory modules into each other; route through the
injection hub to keep the static graph acyclic.

**Tune learning.** Q-learning rates are `alpha=0.35`, `gamma=0.75` (defaults in `updateQ`), Q is
clamped to ±20; the final decision score is clamped to ±400; embeddings are length-32 unit
vectors. Exploration is epsilon-greedy with stress- and surprise-driven boosts.

**Read live state.** `getMotivationalSnapshot`, `getAttentionSnapshot`, `getSemanticSummary`,
`getConsolidationSummary`, `getEpisodeStats`, and `getTrustSnapshot` expose subsystem state for the
HUD and debugging.

---

## 11. Module index

| Module | Layer | Responsibility | Key exports |
|---|---|---|---|
| `main.js` | orchestration | boot, agent loop, decision pipeline, input, persistence | (entry point) |
| `scene.js` | render | scene/camera/renderer/group, zoom, resize | `scene`, `camera`, `renderer`, `group` |
| `render.js` | render | animation loop | `animate`, `setStars` |
| `stars.js` | render | starfield | `createStars` |
| `connections.js` | render | edge lines + neighbor registration | `connectPoints`, `setConnectionNeuronMap` |
| `neuronVisuals.js` | render | neuron meshes, pulses, dots, highlight | `createFuturisticNeuron`, `CLUSTER_COLORS`, `spawnTravelDot` |
| `ui.js` | render | reasoning box DOM | `reasoningBox` |
| `hud.js` | render | live metrics panel | `createHUD`, `updateHUD` |
| `helpers.js` | foundation | math + reward growth | `normalize`, `dot`, `growReward` |
| `search.js` | foundation | id → mesh lookup | `setNeuronMap`, `findNeuronById` |
| `memory.js` | foundation | shared learning stores | `transitions`, `rewards`, `penalties`, `curiosityMap`, ... |
| `knowledge.js` | foundation | semantic relations | `conceptRelations` |
| `qlearning.js` | procedural | Q-table + Bellman update | `getQ`, `updateQ`, `dampQ`, `Q` |
| `embeddings.js` | procedural | semantic vectors | `createEmbedding`, `trainEmbedding`, `similarity` |
| `momentumMemory.js` | procedural | sequence momentum | `learnMomentum`, `getMomentumBonus` |
| `trustMemory.js` | procedural | Bayesian path trust | `recordSuccess`, `getPathTrust` |
| `candidateAnalysis.js` | decision | per-candidate features | `analyzeCandidate` |
| `scoring.js` | decision | linear decision score | `calculateDecisionScore`, `lastArbitrationBreakdown` |
| `executiveController.js` | decision | competitive arbitration | `arbitrate`, `explainArbitration` |
| `motivationalState.js` | decision | drives → weights | `updateMotivationalState`, `computeExecutiveWeights` |
| `cognitiveAttention.js` | decision | focus vector | `updateAttentionFocus`, `applyAttentionAmplification` |
| `activationCompetition.js` | decision | lateral inhibition | `getCompetitionScore`, `boostActivation` |
| `planning.js` | decision | look-ahead | `futureScore` |
| `behavior.js` | affective | emotion + body model | `regulateBiology`, `updateBehavior`, `applyPredictionErrorToBehavior` |
| `emotionMap.js` | affective | per-path emotions | `getLocalEmotion`, `updateLocalEmotion` |
| `episodeManager.js` | memory | unified episodic substrate | `recordManualClick`, `recordAutonomousSuccess`, `getAllEpisodes` |
| `episodicContextEngine.js` | memory | working memory + segmentation | `episodeRecordNode`, `sealCurrentEpisode`, `setEpisodeManagerBridge` |
| `schemaMemory.js` | memory | role abstraction | `rebuildSchemas`, `getSchemaBonus` |
| `longTermConsolidation.js` | memory | stable LTM promotion | `reinforcePath`, `getConsolidationSummary` |
| `semanticMemoryLayer.js` | memory | generalization + noise suppression | `recordSemanticEdge`, `getNoiseSuppressedScore` |
| `semanticActivation.js` | memory | refractory inhibition | `getSemanticActivationFactor` |
| `semanticVitality.js` | memory | strength vs vitality | `reinforceSemanticStrength`, `getSemanticStrength` |
| `semanticProvenance.js` | memory | source-authority gating | `PROVENANCE`, `writeReward`, `getProvenanceAuthority` |
| `semantic.js` | memory | semantic map builder | `buildSemanticMap` |
| `predictionError.js` | uncertainty | predictive processing | `generateExpectation`, `evaluatePredictionError`, `getTransitionUncertainty` |
| `uncertaintyLedger.js` | uncertainty | Beta epistemic ledger | `getProceduralUncertainty`, `getCombinedSemanticUncertainty` |
| `uncertaintyEngine.js` | uncertainty | surprise/novelty signals | `updateUncertainty`, `getUncertaintyScore` |

---

*Reference for the current `main` + `render/` engine. The decision pipeline (§6) and the
injection-based memory wiring (§7) are the two areas to understand before making changes.*