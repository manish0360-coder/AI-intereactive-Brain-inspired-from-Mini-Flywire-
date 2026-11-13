# MiniFlyWire module dependency map

Runtime-audit stream, 2026-11-13. Static reading only; nothing was executed or changed. Companion files: `docs/architecture/RUNTIME_CALL_GRAPH.md`, `docs/research/EXISTING_SYSTEMS_AUDIT.md`.

## 1. Import graph (static `import` statements)

Extracted from source; line = line of the `import` keyword.

| Importer | Line | Imports from | Names |
|---|---|---|---|
| `main.js` | 5 | `instrumentation/rng.js` | `liveRng` |
| `main.js` | 11 | `render/embeddings.js` | `createEmbedding, trainEmbedding, similarity, setEmbeddingNeuronMap` |
| `main.js` | 21 | `render/emotionMap.js` | `getLocalEmotion, updateLocalEmotion` |
| `main.js` | 33 | `render/qlearning.js` | `Q, getQ, setQ, updateQ, dampQ, makeStateKey, GOAL_NONE` |
| `main.js` | 54 | `render/knowledge.js` | `conceptRelations` |
| `main.js` | 65 | `render/neuronVisuals.js` | `CLUSTER_COLORS, setVisualsGroup, createFuturisticNeuron, createFuturisticConnection, tickNeuronPulse, flashNeuronClick, spawnTravelDot, setNeuronHighlight, getNeuronCluster, setAttentionSpotlight` |
| `main.js` | 82 | `render/scene.js` | `scene, camera, renderer, group` |
| `main.js` | 102 | `render/helpers.js` | `normalize, dot` |
| `main.js` | 114 | `render/render.js` | `animate, setStars` |
| `main.js` | 126 | `render/search.js` | `setNeuronMap, findNeuronById` |
| `main.js` | 138 | `render/stars.js` | `createStars` |
| `main.js` | 149 | `render/connections.js` | `connectPoints, setConnectionNeuronMap` |
| `main.js` | 161 | `render/memory.js` | `transitions, rewards, penalties, confidenceMap, signals, thoughtTrail, curiosityMap` |
| `main.js` | 178 | `render/planning.js` | `lookAheadScore, futureScore` |
| `main.js` | 198 | `render/episodeManager.js` | `initEpisodeManager, recordManualClick, recordAutonomousSuccess, recordAutonomousStep, replayOneEpisode, getEpisodesForBuildMap, getAllEpisodes, getEpisodeStats, clearAllEpisodes, exportEpisodes, loadEpisodes` |
| `main.js` | 243 | `render/hud.js` | `createHUD, updateHUD, createThinkingStream, updateThinkingStream, createSpeedControl` |
| `main.js` | 264 | `render/behavior.js` | `curiosityState, confidenceState, stressState, fatigueState, changeFatigue, changeStress, focusState, explorationMode, regulateBiology, updateBehavior, loopStressState, exhaustionState, applyPredictionErrorToBehavior` |
| `main.js` | 286 | `render/momentumMemory.js` | `learnMomentum, getMomentumBonus, momentumMemory` |
| `main.js` | 305 | `render/predictionError.js` | `generateExpectation, evaluatePredictionError, resetExpectation, getRollingError, uncertaintyState as predUncertaintyState, updateTransitionUncertainty, getTransitionUncertainty, updateSequenceError, getSequenceError, recordSemanticExpectationOutcome, getSemanticExpectationConfidence, decayTransitionUncertainties` |
| `main.js` | 333 | `render/uncertaintyLedger.js` | `updateProceduralUncertainty, getProceduralUncertainty, updateSemanticUncertainty, propagateUncertainty, decayUncertaintyLedger, getCombinedUncertainty, registerOllamaPair, getLedgerSummary` |
| `main.js` | 356 | `render/semanticActivation.js` | `recordSemanticActivation, decaySemanticActivations` |
| `main.js` | 372 | `render/semanticProvenance.js` | `PROVENANCE, writeReward, writeTransition, shouldTrainEmbedding, logActivation, getActivationDominance` |
| `main.js` | 388 | `render/motivationalState.js` | `updateMotivationalState, computeExecutiveWeights, recordOutcome, getMotivationalSnapshot` |
| `main.js` | 395 | `render/semanticVitality.js` | `getSemanticSignal, activateSemanticVitality, reinforceSemanticStrength, reinforceEpisodeSemantics, penalizeSemanticPath, decaySemanticSystems` |
| `main.js` | 404 | `render/uncertaintyEngine.js` | `getUncertaintyScore, updateUncertainty, decayUncertainty` |
| `main.js` | 410 | `render/executiveController.js` | `explainArbitration, arbitrate` |
| `main.js` | 415, 424 | `render/scoring.js` | `lastArbitrationBreakdown`; `liveFutureBonus` |
| `main.js` | 431 | `render/activationCompetition.js` | `setActivation, boostActivation, decayActivations, getCompetitionScore, getActivation, getTopActiveNeurons, isContextEligible` |
| `main.js` | 441 | `render/semanticMemoryLayer.js` | `recordSemanticEdge, getNoiseSuppressedScore, getSemanticEdgeStrength, isNoiseEdge, decaySemanticMemory, getSemanticSummary` |
| `main.js` | 450 | `render/longTermConsolidation.js` | `reinforcePath, weakenPath, runConsolidationPass, getConsolidationScore, isStableMemory, decayConsolidation, getConsolidationSummary` |
| `main.js` | 460 | `render/cognitiveAttention.js` | `updateAttentionFocus, setGoalAttention, getAttentionScore, applyAttentionAmplification, strengthenAttention, weakenAttention, resetAttentionFocus, getAttentionSnapshot` |
| `main.js` | 471 | `render/episodicContextEngine.js` | `episodeRecordNode, sealCurrentEpisode, isLearningGated, rewardCurrentEpisode, getEpisodeVaultForReplay, getCurrentEpisodeState, resetManualSession, wmDecay, wmGetSnapshot, setConceptRelations, setEpisodeManagerBridge` |
| `main.js` | 495 | `render/trustMemory.js` | `pathSuccesses, pathAttempts, recordAttempt, recordSuccess, getPathTrust, getTrustUncertainty, decayTrust, getTrustSnapshot` |
| `main.js` | 526 | `render/traversalRecord.js` | `recordOutcome as recordTraversalOutcome, clear as clearTraversalRecord` |
| `main.js` | 542 | `render/schemaMemory.js` | `initSchemaMemory, rebuildSchemas, getSchemaBonus, getSchemas` |
| `render/candidateAnalysis.js` | 14, 22, 30, 46, 64 | `embeddings.js`, `search.js`, `knowledge.js`, `semanticActivation.js`, `uncertaintyLedger.js` | `similarity`; `findNeuronById`; `conceptRelations`; `getSemanticActivationFactor`; `getCombinedSemanticUncertainty` |
| `render/embeddings.js` | 5, 40, 53 | `instrumentation/rng.js`, `helpers.js`, `search.js` | `liveRng`; `normalize, dot`; `findNeuronById` |
| `render/episodeManager.js` | 5 | `instrumentation/rng.js` | `liveRng` |
| `render/episodicContextEngine.js` | 5 | `instrumentation/rng.js` | `liveRng` |
| `render/longTermConsolidation.js` | 20 | `semanticMemoryLayer.js` | `recordSemanticEdge` |
| `render/neuronVisuals.js` | 5 | `instrumentation/rng.js` | `liveRng` |
| `render/planning.js` | 36 | `traversalRecord.js` | `recordFor` |
| `render/render.js` | 5, 17 | `scene.js`, `neuronVisuals.js` | `renderer, scene, camera, group`; `tickNeuronPulse` |
| `render/scoring.js` | 5 | `instrumentation/rng.js` | `liveRng` |
| `render/semantic.js` | 14 | `embeddings.js` | `similarity` |
| `render/semanticProvenance.js` | 5, 57 | `instrumentation/rng.js`, `helpers.js` | `liveRng`; `growReward` |
| `render/stars.js` | 5 | `instrumentation/rng.js` | `liveRng` |
| `render/traversalRecord.js` | 33 | `search.js` | `findNeuronById` |
| `instrumentation/sessionRecorder.js` | 13 (55, 56 dynamic) | `telemetryBus.js` (`node:fs`, `node:path`) | `subscribe` |
| `instrumentation/telemetryBus.js` | 10 | `traceSchema.js` | `makeEnvelope, validateEnvelope` |
| `benchmarks/harness/decisionProbe.js` | 10, 11 | `instrumentation/telemetryBus.js`, `instrumentation/traceSchema.js` | `emit`; `CHANNELS, TYPES` |
| `benchmarks/harness/headlessShim.js` | 15, 16 | `node:fs`, `node:path` | — |

**Rows the extractor missed, added from a direct `grep -n "from ['\"]"` and from reading `main.js:1-549`:**

| Importer | Line | Imports from | Names |
|---|---|---|---|
| `main.js` | 92 | `render/ui.js` | `reasoningBox` |
| `main.js` | 217 | `render/scoring.js` | `calculateDecisionScore` |
| `main.js` | 232 | `render/semantic.js` | `buildSemanticMap` |
| `main.js` | 253 | `render/candidateAnalysis.js` | `analyzeCandidate` |
| `render/embeddings.js` | 74-76 | `render/qlearning.js` | `getQAny` |
| `render/planning.js` | 10-12, 19-21 | `render/search.js`, `render/embeddings.js` | `findNeuronById`; `similarity` |
| `render/connections.js` | 8-12 | `render/scene.js` | `group` |
| `render/stars.js` | 16-18 | `render/scene.js` | `scene` |

**Notes.**
- `main.js` imports 36 of the 38 `render/` modules. `render/episodic.js` has no importer anywhere in scope. `render/semantic.js` is imported and used (`main.js:1666`).
- `scoring.js` is imported three times by `main.js` (lines 217, 415, 424).
- No dynamic `import()` of a project module exists in scope (`sessionRecorder.js:55-56` loads `node:fs` and `node:path`).
- No circular import exists. The potential cycles are avoided by run-time injection, which hides four real dependencies from this table: `episodeManager.js` ← 13 references (`main.js:847-893`), `schemaMemory.js` ← `getQ`, `makeStateKey`, visit map (`main.js:898-911`), `episodicContextEngine.js` ← bridge callback and `conceptRelations` (`main.js:917-933`), `candidateAnalysis.js` ← `canReachGoal` (`main.js:1818`).
- `benchmarks/harness/decisionProbe.js` calls `calculateDecisionScore` and `arbitrate` (`:39-44`); how it obtains them was not determined.
- `instrumentation/sessionRecorder.js`, `telemetryBus.js`, `traceSchema.js` are imported only by each other and by the harness, never by the app.

## 2. Shared-state ownership

"Owner" = the module that declares the store. "Foreign writers" = code outside the owner that mutates it directly.

| State | Declared (owner) | Foreign writers | Readers on the decision path | Persisted |
|---|---|---|---|---|
| True adjacency `userData.neighbors` | three.js mesh, created `main.js:619` | `render/connections.js:120-125` | `main.js:1187`, `1343`, `1638`, `1715`; `planning.js:262`, `343`; `traversalRecord.js:75-80`; `episodeManager.js:387-389` | No (rebuilt from `connections.json`) |
| Embeddings `userData.embedding` | three.js mesh, `main.js:620` | `embeddings.js` `trainEmbedding` (internals not read) | `main.js:2167`, `2560`, `3655`; `candidateAnalysis.js:197`; `semantic.js:62` | **No**, although the persisted stores were shaped by them |
| `neuronMap` | `main.js:567` | — | injected into `search.js`, `embeddings.js`, `connections.js` (`main.js:570-576`); passed to `episodeManager` and `uncertaintyLedger` calls | No |
| `transitions` | `render/memory.js:8` | `main.js:794`, `1410-1415`, `3370-3376`, `4710-4712`, `5344`; `episodeManager.js:973-975` | `main.js:1347`, `1626`, `1764`; `episodeManager.js:462` | Yes |
| `rewards` | `render/memory.js:13` | `main.js:1429-1431`, `3355-3363`, `4627`, `4775`; `semanticProvenance.writeReward` (called `main.js:4647`, `episodeManager.js:1013`); `longTermConsolidation.js:112` | `main.js:1783`, `1868`, `3131`, `3490`, `3687` | Yes |
| `penalties` | `render/memory.js:18` | `main.js:1478`, `3332-3346`, `4687`, `4755`, `4922` | `main.js:1726`, `1870`; `candidateAnalysis.js:101-107` | Yes |
| `curiosityMap` | `render/memory.js:44` | `main.js:3313-3314`, `4323`, `4545` | `main.js:1873`, `3492`, `3699`, `4002` | Yes |
| `confidenceMap` | `render/memory.js:29` | `main.js:4660`, `4691`; `episodeManager.js:1096` | none (display `main.js:3022`) | Yes |
| `signals` | `render/memory.js:34` | `main.js:4935` | none (unused field) | Yes |
| `thoughtTrail` | `render/memory.js:39` | `main.js:5186-5189`, `5555-5559` | `main.js:1628`, `2006`, `2728-2733`, `2885-2913` | No |
| `Q` | `render/qlearning.js:12` | `main.js:803`, `1421-1426`, `3385-3389`, `5349`; own `updateQ`, `dampQ` | `main.js:1735`, `1924`; `embeddings.js:199-299` via `getQAny` | Yes |
| `pathSuccesses`, `pathAttempts` | `render/trustMemory.js:30-33` | none direct | `main.js:3529-3531` (direct read), `getPathTrust` `main.js:2298` | No |
| `momentumMemory` | `render/momentumMemory.js:17` | `main.js:1441-1446` (delete) | none | No |
| `episodicStore` | `render/episodeManager.js:134` | none direct | `getAllEpisodes` at `main.js:955`, `991`; `schemaMemory.js:129-525` (passed as argument) | Yes |
| Behaviour states | `render/behavior.js:14-99` (`export let`) | only through `changeFatigue`, `changeStress`, `regulateBiology`, `updateBehavior`, `applyPredictionErrorToBehavior` | `main.js:1565-1606`, `2237-2241`, `2441-2465`; `scoring.js:374-379` | No |
| `lastArbitrationBreakdown`, `liveFutureBonus` | `render/scoring.js:58-67` | own, once per scored candidate | `main.js:2367`, `2794`, `3903` | No |
| `uncertaintyState` | `render/predictionError.js:39` | own | passed `main.js:2250`, unused | No |
| Position: `agentCurrent`, `agentLast` | `main.js:3198-3201` | `main.js:3293-3294`, `3404`, `4861-4862`, `4967`, `5063`, `5359-5360` | everywhere in `runAgent` | No |
| `goalNeuronId` | `main.js:1042` | `main.js:820`, `1139`, `3435`, `4309`, `5361`, `5508` | 50+ reads | Yes |
| `lastDecision` | `main.js:685` | `main.js:2527`, `4865` | `main.js:3488-3631`, `5030` | No |
| `adjacencyMemory` | `main.js:951` | `rebuildAdjacencyMemory` only | `main.js:965`, `1784` | No (rebuilt) |
| `window.lastReasoning`, `window.recentMemory`, `window._predictionErrorEpsilonBoost`, `window.homeNeuronId` | global object | see `docs/research/EXISTING_SYSTEMS_AUDIT.md` §3 | action, path credit, ε, goal override | only `homeNeuronId` |

Three ownership problems stand out: the environment's topology and the agent's embeddings live on render objects; the action is passed through a `window` property that is never cleared; and five `memory.js` maps are mutated from three or four different files with no accessor.

## 3. Removal / merge plan

Nothing here was applied. Line references for every reason are in `docs/research/EXISTING_SYSTEMS_AUDIT.md` (§1, §4) and `docs/architecture/RUNTIME_CALL_GRAPH.md` (§2).

**What "zero behavioural change" means below.** No store read by a decision changes, and the number and order of `liveRng()` draws on the cognitive stream is unchanged. The second condition matters: a seeded run is only byte-identical if every draw is preserved. Each tier-A item should still be confirmed by the existing byte-identity check (CF-00 reports the repeat of seed 101 as identical), because this plan rests on static reading.

### Tier A: removable on static evidence (no reader, no RNG draw, no clock effect)

| # | Change | Evidence |
|---|---|---|
| A1 | Delete `render/episodic.js` | No importer in scope |
| A2 | Delete `planning.lookAheadScore` and its import | Imported `main.js:180`, never called |
| A3 | Delete the 38-39 exported functions with no caller (list: call-graph §2.2) and the 39 unused names in `main.js` import lists | Reference search. Caveat: experiment drivers outside the scope may import some (`getTrustSnapshot`, `getLedgerSummary`, `getSchemaDiagnostics`, `initRng` are plausible); grep `experiments/` and `cognitive/` first |
| A4 | Remove `chainMemory`, `chainMap`, `chainBoost`, `chainReward` | Never written; term constant 0 [CF-00] |
| A5 | Remove `attentionMap` and `focus`; `currentGoal`; `let lastClicked`; `window.lastNeuron` | Write-only |
| A6 | Remove `selfLoopPenalty` and `isSelfLoop` plumbing | Unreachable; term always 0 [CF-00] |
| A7 | Remove the dead `episodeRewards` loop (`main.js:4878-4895`), `oldEpisodeStrength`, `episodeMemoryBonus` | Loop body never runs; constants 0 |
| A8 | Remove the empty label conditionals (`main.js:2862-2876`, `2931-2945`) and the duplicate neighbour loop (`:1677-1679`) | No effect |
| A9 | Remove unused return fields of `analyzeCandidate` (`clampedScore`, `attention`, `signal`, `timeScore`, `goalBoost`, `episodeMatch`, `label1`, `label2`) together with `timeMemory` and its two `Date.now()` writes | No consumer; removes one clock read per candidate |
| A10 | Remove the scorer parameters `focusState`, `uncertaintyState`, `transitionUncertainty`, `sequenceError`, and the `getProceduralUncertainty` spread | Accepted, unused. The getters must be checked for side effects before deleting the calls: `getTransitionUncertainty` and `getProceduralUncertainty` internals were not read (a `peekTransitionUncertainty` exists, which suggests the plain getter may mutate): **not determined** → move to tier B if they write |
| A11 | Delete `activationCompetition.js` entirely (calls at `main.js:4402`, `4831`, `5227`) | No reader of its state; its functions draw no RNG (internals of `boostActivation`, `decayActivations` read: `:18-38` are Map updates only by signature; bodies not line-read → confirm) |
| A12 | Delete `momentumMemory.js` and the `learnMomentum` injection; drop step 4 of `pruneGoalWraparound` | Reader never called |
| A13 | Remove steps 2 and 5 of `pruneGoalWraparound` (`main.js:1420-1426`, `1452-1457`) | Cannot match (D5, D4) |
| A14 | Replace the Q-decay rate lookup by the constant 0.999 (`main.js:3385-3389`) | 0.9998 branch unreachable (D6) |
| A15 | Replace `executiveWeights?.exploit ?? 1.0` and `.explore` by nothing (`scoring.js:300-301`, `335-340`) and `motivationalBoredom` by 0 | Always 1.0 / 0 (D2, D3) |
| A16 | Stop persisting `signals` and `confidenceMap`; then remove `signals` | No decision reader. `confidenceMap` still colours thought-tree lines (`main.js:3022`): keep in memory or drop the colouring |

### Tier B: no decision reader, but removal changes RNG order, timing or a store; needs a byte-identity or equivalence gate

| # | Change | Why a gate is needed | Gate |
|---|---|---|---|
| B1 | Stop computing chain steps ≥1 of `runPrediction` | They draw ε and one `drift` per candidate per step, recompute drives, and set `mentalLoad = STEPS` | Not byte-identical by construction. Gate: arrivals, first arrival, non-graph share vs BASE on the CF-00 design with more seeds than 3 |
| B2 | Remove the `arbitrate` blend (`executiveController.js`, `computeExecutiveWeights`) | Changed 0 of 6,908 and 1 of 7,198 arg-maxes [CF-00], but rescaling by 0.6 changes the softmax-derived `topChoices` length, which controls the anti-repeat swaps | Decision-level replay: executed action identical on recorded states |
| B3 | Remove the five candidate-constant terms (`curiosityState`, `confidenceState`, `stressState`, `fatigueState`, `fatigueOverload`) and the constant part of `dynamicFocus` | Flip 0 [CF-00], but they shift scores relative to the ±400 clamp (1,818 scores at the clamp, goal 16) and relative to the unscored secondary candidates (D10) | Same as B2 |
| B4 | Delete `episodicContextEngine.js` | No decision reader found; `sealCurrentEpisode` may call the bridge into `recordAutonomousSuccess` (`main.js:924-933`), and the module draws `liveRng` for ids (`:120`) | Confirm the bridge never fires with ≥2 nodes (not determined), then byte-identity |
| B5 | Remove `uncertaintyLedger.js` procedural side | Spread is unused, but `propagateUncertainty` and the semantic side feed `meaningBoost` | Term knockout for `meaningBoost` is 0.01% / 0.40%; equivalence gate |
| B6 | Remove `semanticActivation.js`, `uncertaintyEngine.js`, `meaningBoost` path of `candidateAnalysis.js` | All bounded by `meaningBoost` (mean abs 0.000-0.001) and two ≤0.06% terms | Equivalence gate, goal and no-goal |
| B7 | Remove the second "reasoning" score (`main.js:3654-3889`) | It writes one penalty (`main.js:4905-4929`) | Measure that write's effect first |
| B8 | Remove the softmax block, keep arg-max + runner-ups | `topChoices` length depends on the probabilities | Decision-level replay |
| B9 | Remove `semanticProvenance.logActivation` and `provenanceLog` | Write-only, but it reads the clock, not RNG | Byte-identity |

### Tier C: merges (overlapping function; each needs a measured gate)

| # | Merge | Evidence of overlap | Gate |
|---|---|---|---|
| C1 | One edge-familiarity store in place of `trustMemory`, `emotionMap`, `confidenceMap`, `transitions` counts, `curiosityMap` visits, `longTermConsolidation`, `semanticMemoryLayer`, `semanticVitality` | All are per-edge counters reinforced by the same agent reward; CF-00 closed loop: removing any one of NOQ / NOEPI / NOSEM / NOATT / NOTRUST / NOAFFECT did not lower arrivals (n = 3, descriptive) | Pre-registered equivalence on arrivals and first arrival, goal and no-goal, n ≫ 3 |
| C2 | One oracle module for `canReachGoal`, `goalDistance`, `graphDiameter`, `planning.hopDistancesFrom` | Four BFS/DFS over the same adjacency (`main.js:1153`, `1277`, `1317`; `planning.js:253`); `graphDiameter` is recomputed per candidate | Pure refactor: unit equality on all 20×20 pairs. Then put the module behind an explicit switch so the oracle can be turned off |
| C3 | Single reachability test | Applied at `main.js:1794`, `candidateAnalysis.js:140-153`, `main.js:2542` | The first two are strictly redundant (tier A if `analyzeCandidate`'s copy is removed); the third guards a different pool |
| C4 | `semantic.js` into `candidateAnalysis.js` or `embeddings.js` | 92-line wrapper around `similarity` | Refactor; byte-identity in no-goal mode |
| C5 | `search.js`, `helpers.js` into one utility module | 31 and 111 lines | Refactor |
| C6 | `motivationalState.js` + `executiveController.js` | The second consumes only the first | After B2 both may go |
| C7 | `episodeManager` motif detection and `schemaMemory` motif detection | `_detectMotifs` (`episodeManager.js:1237`) and `_detectMotifsForSchema` (`schemaMemory.js:420`) (bodies not compared: overlap not determined) | Read both first |

### Tier D: defects to fix, not to remove (each changes behaviour and needs its own decision record)

D1 (learning keyed to `agentLast→next`), O5/O6 (goal declared at selection, environment bypassed), D8/D9 (reported vs executed action, stale action on replay ticks), D10 (unscored candidates in the arg-max), replay writing Q under the no-goal namespace, the wall-clock replay cooldown and schema throttle, embeddings not persisted, `window.lastReasoning` as the action channel. Removing or merging modules before these are settled will change what the measured gates of tiers B and C compare against.

### Order

1. Tier A in one commit per item, each followed by the byte-identity check.
2. C2 and C3 (pure refactors) to isolate the oracle behind one switch.
3. Tier D decisions.
4. Tiers B and C against the corrected baseline.
