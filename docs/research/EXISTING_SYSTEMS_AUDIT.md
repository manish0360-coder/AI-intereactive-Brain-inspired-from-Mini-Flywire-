# MiniFlyWire existing systems audit (legacy browser agent)

Runtime-audit stream, 2026-11-13. Static reading only; nothing was executed or changed. Companion files: `docs/architecture/RUNTIME_CALL_GRAPH.md` (pipeline, call graph), `docs/engineering/MODULE_DEPENDENCY_MAP.md` (imports, ownership, removal plan). `main.js` was read in full; which `render/` internals were not line-read is listed in the call-graph file §0.

Evidence labels: **[S]** source read in this audit (file:line given); **[CF-00]** measured number quoted from `experiments/cf00_audit/results/audit_summary.json` (goal 16 / no goal, seeds 101/202/303, 3,000 steps, open-loop single-term knockout flip rate = share of greedy multi-candidate decisions whose argmax changes).

## 1. Subsystem table and classification

**How to read the table.**
- "Tick" = one `runAgent()` call (`main.js:3249`); five per `runAgentLoop` (`main.js:5310-5312`). "Loop" = one `runAgentLoop` (`main.js:5200`).
- `runPrediction` runs on 92% of ticks (`main.js:3455-3457`) and iterates a chain of 2-6 steps (`main.js:1613-1621`); every candidate of every chain step is scored, but only step 0 sets the action (`main.js:2764-2769`).
- "Main branch" / "fallback branch" = the two arms of `if (predError)` (`main.js:4144-4340` / `4342-4456`). `predError` is null whenever no expectation is pending (`render/predictionError.js:135-138`); an expectation is created only at the end of a completed `runPrediction` (`main.js:3116-3156`). So the fallback branch runs on replay ticks, after a reset, and after an early return of `runPrediction`.
- "Flip" = CF-00 single-term knockout flip rate, goal 16 / no goal, from `audit_summary.json → termKnockouts`. "n.m." = not measured.
- Persisted = written to `localStorage["brain"]` (`main.js:720-737`). Nothing else is persisted anywhere (only three `localStorage` call sites exist: `main.js:740`, `756`, `5342`).
- Internals marked "not read" were not line-read in this audit; their call sites and exports were.

### 1.1 `render/` modules (38)

| Module | Executes / how often | Inputs | Outputs | Output reaches (reader) | Changes selection? | Learns? | Persisted? | Separately measurable? | Class |
|---|---|---|---|---|---|---|---|---|---|
| `activationCompetition.js` | `boostActivation` on fallback branch and goal arrival (`main.js:4402`, `4831`); `decayActivations` per loop (`main.js:5227`) | node id, reward | `activationState` Map (`:12`) | nobody: `getActivation`, `getCompetitionScore`, `getTopActiveNeurons`, `isContextEligible` are imported (`main.js:435-438`) and never called | No (no reader) | writes only | No | Nothing to measure | **Inert** |
| `behavior.js` | `regulateBiology` once per `runPrediction` (`main.js:2952`); `updateBehavior` per tick when a decision exists (`main.js:3539`); `applyPredictionErrorToBehavior` main branch (`main.js:4331`); `changeFatigue` per move (`main.js:5103`) | reward/penalty of chosen edge, repetition, aggregate trust, prediction error | live bindings `curiosityState`, `confidenceState`, `stressState`, `fatigueState`, `focusState`, `loopStressState`, `exhaustionState` (`:14-99`) | ε (`main.js:2441-2465`), chain depth (`main.js:1565-1606`), scorer terms (`scoring.js:374-379`), drift scale (`scoring.js:210-213`), home override (`main.js:3426-3435`), motivational drives (`main.js:1689-1696`) | Score terms: flip 0 / 0, identical for all candidates [CF-00 `variesAcrossCandidates` 0]. Via ε: yes, share n.m. `focusState` is passed (`main.js:2241`) and never used in a term (`scoring.js:100`, absent from `TERMS` `:333-384`). `explorationMode`, `energyState`, `restingState`, `survivalState`, `survivalPressure` have no external reader | Yes (internals not read) | No | Only by ablating ε | **Partially functional** |
| `candidateAnalysis.js` | per candidate per chain step (`main.js:1804`) | keys, `penalties`, `signals`, `timeMemory`, goal, `canReachGoal` | `{targetNeuron, label1, label2, clampedScore, meaningBoost, attention, signal, timeScore, goalBoost, episodeMatch}` (`:390-418`) | Only `targetNeuron` and `meaningBoost` are used (`main.js:2152`, `2199`). `score` is destructured (`main.js:1839`) but the field is named `clampedScore` (`:397`) → always `undefined`. `attention`, `signal`, `timeScore`, `goalBoost` (constant 0, `:381`) are unused in `runPrediction` | `meaningBoost` flip 0.01% / 0.40%, mean abs 0.000 / 0.001. Its three rejections (`:101-153`) repeat `main.js:1726`, the self-candidate case, and `main.js:1794` | No | No | Yes (term knockout) | **Duplicated** |
| `cognitiveAttention.js` | `applyAttentionAmplification` per candidate (`main.js:2167`); `updateAttentionFocus`/`strengthenAttention`/`weakenAttention` fallback branch only (`main.js:4392-4398`); `resetAttentionFocus` on goal arrival (`main.js:4828`); `setGoalAttention` on Shift+click only (`main.js:5513`) | `reward·3 + Q·2 + noiseSuppressedScore` (`main.js:2163-2164`), candidate embedding | that number × `max(0.3, 1 + (cos − 0.5)·strength·2)` (`:131-140`) | scorer ×0.4 (`scoring.js:348`) | flip 1.09% / 2.63% | focus vector moves only on the fallback branch | No | Yes | **Misleadingly named** (a multiplier on reward and Q already in the score; selects nothing. A goal set through `__M7_GOAL__` never reaches `setGoalAttention`) |
| `connections.js` | once per edge at load (`main.js:666`) | positions, ids | THREE line; **pushes ids into both nodes' `userData.neighbors`** (`:120`, `:125`) | every graph reader in §2 | It is the map | No | No | — | **UI** (also writes agent state: it is the only writer of the adjacency) |
| `embeddings.js` | `createEmbedding` per node at load (`main.js:620`, random via `liveRng` `:110`); `trainEmbedding` at load on `conceptRelations` (`main.js:641`) and from the episode pipeline (`episodeManager.js:1044`); `similarity` per candidate and per tick | node ids; imports `getQAny` (`:74-76`, used `:199-299`) | 32-d vectors on `userData.embedding`; cosine `similarity` (`:340`) | reward (`main.js:3655`, `4070-4086`), expectation (`main.js:3126`), `meaningBoost`? no (`candidateAnalysis.js:197` result unused), attention, secondary pool weights (`main.js:2559-2566`), `buildSemanticMap` | Indirectly through reward and attention; n.m. in isolation | Yes | **No** (vectors are re-randomised every load while the stores trained on them are restored) | No direct knockout exists | **Functional but unvalidated** |
| `emotionMap.js` | `getLocalEmotion` per candidate (`main.js:2029`); `updateLocalEmotion` per learning tick (`main.js:4096`) | reward, danger, repeat count | per-edge `{confidence, fatigue, stress, trust, fear}` (`:46-58`) | scorer (`scoring.js:360-364`) | flips ≤0.10% each; group 0.12% / 0.28% | Yes, unbounded additive (`:93-121`) | No | Yes | **Duplicated** (edge familiarity again). Read key is `startKey→k` (`main.js:2030`), so chain steps ≥1 read the wrong edge; write key is `agentLast→next` (§4.3 D1) |
| `episodeManager.js` | `recordAutonomousStep` per learning tick with a non-goal target (`main.js:4960`), a no-op unless the pair is a true edge (`:387-391`); `recordAutonomousSuccess` per goal arrival (`main.js:4590`); `replayOneEpisode` on 8% of ticks (`main.js:3478`); `recordManualClick` per click (`main.js:5453`) | path window, goal, injected system refs (`main.js:847-893`) | `episodicStore` (`:134`); writes to `transitions`, Q, `rewards`, momentum, trust, `confidenceMap`, consolidation (`:973-1019`, `:1088-1099`, `:1193`) | `getAllEpisodes` → `adjacencyMemory` (`main.js:955`), `computeTrajectoryIntegrity` (`main.js:991`), schemas (`main.js:5247`) | `trajectoryIntegrity` flip 0.35% / 0; adjacency gate inside the 2.81% goal-gradient figure | Yes | Yes (`episodes`, `main.js:732`, `810`) | Partly | **Partially functional**. Replay buffers keep `activeGoal: null` (`_createBuffer` line 18 of the block at `:681`; `:517-519` never sets it), so replay writes Q under `pos#0` (`:1000-1001`, `qlearning.js:46-48`) while a goal-directed decision reads `pos#<goal>` (`main.js:1924`). Replay cooldown is 4 s of wall clock (`:511-513`) |
| `episodic.js` | never; no importer (`main.js:225-228` records the removal) | — | — | — | No | — | — | — | **Unnecessary** |
| `episodicContextEngine.js` | `wmDecay` per loop (`main.js:5228`); `sealCurrentEpisode` on goal arrival and tick cap (`main.js:4822`, `3271`); `rewardCurrentEpisode` (`main.js:4825`); `getCurrentEpisodeState` for display (`main.js:3904`, `5303`) | — | working memory Map, episode vault | display only (`main.js:3933-3939`) | No. Nodes enter only through `episodeRecordNode` → `wmAddNode` (`:283-288`), and `episodeRecordNode` has no caller (imported `main.js:472`, never used). Whether the bridge (`main.js:924-933`) ever fires with ≥2 nodes: not determined (seal body not read), but nothing feeds it | No | No | — | **Inert** |
| `executiveController.js` | `arbitrate` per candidate (`main.js:2371`) | five component scores from `lastArbitrationBreakdown`, executive weights | scalar ×12 (`:135`, body) blended 40% (`main.js:2383`) | `choices[].weight` | **0 of 6,908** argmax changes (goal), 1 of 7,198 (no goal) [CF-00 `arbitrationChangedArgmax`]. `isSelfLoop` (`main.js:2380`) can never be true because self candidates are rejected earlier (`candidateAnalysis.js:123-134`). `explainArbitration` never called | No | No | Already measured | **Inert** |
| `helpers.js` | `normalize`, `dot` from embeddings (`embeddings.js:114-343`); `growReward` from `semanticProvenance.js:126` | vectors | vectors, scalars | embeddings, reward writes | support | No | — | — | **Functional but unvalidated**. `main.js:102-107` imports `normalize`, `dot` and never uses them. The extractor also matched the name `dot` in `activationCompetition.js:91-95`, `cognitiveAttention.js:205-209`, `episodicContextEngine.js:240`; those modules do not import `helpers.js`, so they are local variables |
| `hud.js` | `createHUD`, `createThinkingStream`, `createSpeedControl` once (`main.js:3174-3183`); `updateHUD`, `updateThinkingStream` at step 0 (`main.js:2786`, `2816`) | state values passed in | DOM | — | No | — | — | — | **UI** (reads only; its speed slider writes `agentSpeed` through a callback, `main.js:3180`). It shows `liveFutureBonus`, which is the value of the last candidate scored, not of the chosen one (`scoring.js:176`, `main.js:2794`) |
| `knowledge.js` | data, read at load and per candidate | — | `conceptRelations` (20 labels × 3) | embedding pre-training (`main.js:635-641`), `meaningBoost` (`candidateAnalysis.js:242-262`), secondary-pool filter (`main.js:2553`, `2600`), context tags (`main.js:917`) | Through reward (O8); filter effect n.m. | No | — | No knockout exists | **Functional but unvalidated** (and a privileged prior, O8) |
| `longTermConsolidation.js` | `getConsolidationScore` per candidate (`main.js:2155`); `reinforcePath`/`weakenPath` fallback branch (`main.js:4379-4387`) and episode consolidation (`episodeManager.js:1193`); `runConsolidationPass` 5% of loops (`main.js:5256`); `decayConsolidation` 10% of loops (`main.js:5233`) | edge, reward | registry entry, stable flag; `consolidationBonus` ≤1.5 | scorer ×2.0 (`scoring.js:347`); `runConsolidationPass` multiplies stable edges' `rewards` by 1.0002 (`:110-112`) and ignores its `Q` and `transitions` arguments | flip 0.07% / 0.14% | Yes | No | Yes | **Partially functional**. `isStableMemory` never called |
| `memory.js` | holds 7 exported containers (`:8-44`); no functions | — | `transitions`, `rewards`, `penalties`, `confidenceMap`, `signals`, `thoughtTrail`, `curiosityMap` | candidate pool, scorer inputs, behaviour, reward | group "visit/transition counts and recency" 0.59% / **11.73%**; `repetitionPenalty` 10.1% no-goal [CF-00] | Yes | Yes, except `thoughtTrail` | Yes | **Verified functional**. `confidenceMap` is written (`main.js:4660`, `4691`, `episodeManager.js:1096`) and read only for display colour (`main.js:3022`) and into the unused local `confidenceBoost` (`main.js:1896-1901`): write-only for decisions, yet persisted. `signals` is read only into the unused `signal` field (`candidateAnalysis.js:315-319`) |
| `momentumMemory.js` | `learnMomentum` from the episode pipeline (`episodeManager.js:1019`) | 3-node sequences | `momentumMemory` Map | only `pruneGoalWraparound` deletes from it (`main.js:1441-1446`); `getMomentumBonus` imported (`main.js:289`), never called | No | writes only | No | — | **Inert** |
| `motivationalState.js` | `updateMotivationalState`, `computeExecutiveWeights`, `getMotivationalSnapshot` once per chain step (`main.js:1689-1700`); `recordOutcome` fallback branch only (`main.js:4448`) | behaviour states | six drives; weights `{wReward…wCost}` (`:290-299`); snapshot `{hungerDrive…, dominant}` (`:311-323`) | `arbitrate` (inert); `dominantDrive` → drive terms (`scoring.js:281-287`) | drive terms flip 0 / ≤0.04% | drives track behaviour states (internals not read) | No | Already measured | **Broken**: two of its three outputs are read under names it does not export. (1) `scoring.js:300-301` reads `executiveWeights.exploit` / `.explore`; the object has only `w*` fields → both are always 1.0. (2) `main.js:1916-1917` reads `motivationalSnapshot.boredom`; the field is `boredomDrive` → `motivationalBoredom` is always 0 and `boredomPenalty` is `visits·0.25` only (`main.js:1919-1921`) |
| `neuronVisuals.js` | create at load (`main.js:600`, `663`); `tickNeuronPulse` per frame (`render.js:46`); `spawnTravelDot`, `setAttentionSpotlight` per decision/move | positions, cluster | meshes | — | No | — | — | — | **UI** (reads only; `main.js:613-621` replaces the returned mesh's `userData` with the agent's record). `CLUSTER_COLORS`, `getNeuronCluster` imported by `main.js` and unused |
| `planning.js` | `futureScore` per candidate per chain step (`main.js:1971`) | candidate mesh, goal; `recordFor` evidence | non-positive score, depth `H = 3` (`:211`, `:395`) | `projectFutureScore` → `futureBonus` (`main.js:1990-1991`), scorer ×1.2 | flip 0.22% / 0; closed loop: first arrival 2/3/6 → 151/62/29 moves when removed [CF-00 `closedLoop.NOFUT`] | No | No | Yes | **Verified functional** (as an oracle, O4). `lookAheadScore` (`:50`) imported at `main.js:180`, never called |
| `predictionError.js` | `generateExpectation` end of each completed `runPrediction` (`main.js:3137`); `evaluatePredictionError` per learning tick (`main.js:4127`); transition/sequence/semantic updates main branch (`main.js:4182-4245`); decay per loop (`main.js:5220`) | chosen target, agent reward, similarity | error object (`learningAuthority`, `compositeError`, `attentionWidening`, flags), `uncertaintyState` | Q learning rate (`main.js:4157-4172`), `dampQ` (`main.js:4214-4223`), ε boost (`main.js:4276-4297`), behaviour (`main.js:4331`), home override (`main.js:4302-4309`), curiosity counts (`main.js:4319-4326`) | Not through the score: `uncertaintyState`, `transitionUncertainty`, `sequenceError` are accepted and unused (`scoring.js:167-169`). Via ε and learning rate: n.m. | Yes | No | Not separated | **Partially functional**. The predicted and the actual next node are the same variable (`main.js:3138-3139` and `4129` both pass `window.lastReasoning.to`), so the state component cannot be non-zero on a prediction tick; the comment at `main.js:3105-3108` states this. `getSemanticExpectationConfidence`, `peekTransitionUncertainty` never called |
| `qlearning.js` | `getQ` per candidate (`main.js:1735`, `1924`); `updateQ` per learning tick (`main.js:4167` or `4348`) and per episode transition (`episodeManager.js:1003`); `dampQ` (`main.js:4219`) | composite state `pos#goal`, action, agent reward | `Q` Map keyed `"pos#goal->action"` (`:46-48`, `:61`) | scorer ×5 (`scoring.js:336`), `repetitionFatigue` (`scoring.js:202-203`), `dynamicFocus`, attention input, hard filter `Q < −0.5` (`main.js:1736`) | flip 1.85% / 1.44% | Yes | Yes | Yes | **Verified functional**. `setQ` unused outside the module. `updateQ` scans the whole table for the max (`:194-214`) |
| `render.js` | `animate` once, then per frame (`main.js:3167`, `:37`) | scene | frames | — | No | — | — | — | **UI** (reads only) |
| `scene.js` | module load | — | `scene`, `camera`, `renderer`, `group` | visual modules; click raycast (`main.js:5403-5405`) | No | — | — | — | **UI** (reads only) |
| `schemaMemory.js` | `getSchemaBonus` per candidate (`main.js:2323`) and again for the winner log (`main.js:2510`); `rebuildSchemas` 10% of loops (`main.js:5247`) and from the episode store (`episodeManager.js:1149`, `1224`) | episode store, Q, visit counts (`main.js:898-911`) | `_bonusCache` | scorer ×15 (`scoring.js:355`) | flip 0.16% / 0 | Yes | No (rebuilt) | Yes | **Partially functional**. Rebuild is throttled by `Date.now()` with a 15 s interval (`:80`, `:133-134`) unless forced. `getSchemas`, `getSchemaDiagnostics` never called |
| `scoring.js` | `calculateDecisionScore` per candidate per chain step (`main.js:2185`) | 40+ fields | clamped sum of 36 terms (`:333-387`, `:451`); `lastArbitrationBreakdown`; `liveFutureBonus` | `choices[].weight` | It is the score | No | No | — | **Verified functional**, with the defects in §4.3 |
| `search.js` | `findNeuronById` everywhere (53 external references) | id | mesh | all graph readers | support | — | — | — | **Functional but unvalidated** |
| `semantic.js` | `buildSemanticMap` per chain step **when no goal is set** (`main.js:1664-1670`) | all meshes | Map of all 19 other nodes → `similarity × 2` (`:47-85`) | appended to `choices` if related in `conceptRelations` and not already present (`main.js:2570-2612`) | Can be chosen by the argmax (`main.js:2637`, `2713`) when it outranks the scored candidates; n.m. (CF-00 knockouts cover the 36 scorer terms only) | No | No | No knockout exists | **Partially functional** (no-goal mode only) |
| `semanticActivation.js` | `recordSemanticActivation` per move (`main.js:5088`) and on large error (`main.js:4252`); factor read per related candidate (`candidateAnalysis.js:268`); decay per loop (`main.js:5215`) | label pairs | factor ≤1 | multiplies `meaningBoost` only (`candidateAnalysis.js:277`) | Bounded by `meaningBoost`: 0.01% / 0.40% | Yes | No | Not separately | **Inert** |
| `semanticMemoryLayer.js` | `getNoiseSuppressedScore` per candidate (`main.js:2148`); `recordSemanticEdge` fallback branch (`main.js:4369`) and from `reinforcePath` (`longTermConsolidation.js:66`); decay 10% of loops | edge, labels, reward | score | scorer ×1.0 (`scoring.js:346`) and attention input (`main.js:2164`) | flip 0.06% / 0.04% | Yes | No | Yes | **Partially functional**. `isNoiseEdge`, `getSemanticEdgeStrength` (external) never called |
| `semanticProvenance.js` | `writeReward`, `logActivation` per path edge on goal arrival (`main.js:4647-4648`) and per episode transition (`episodeManager.js:1013-1014`) | reward map, key, source | scaled reward write; `provenanceLog` | `rewards` | via `rewards` only | — | No | No | **Partially functional**. `writeTransition`, `shouldTrainEmbedding`, `getActivationDominance` have no caller, so `provenanceLog` (`:169`) is write-only |
| `semanticVitality.js` | `getSemanticSignal` per candidate (`main.js:2139`); `activateSemanticVitality`/`penalizeSemanticPath` fallback branch (`main.js:4430-4437`); reinforcement from the episode pipeline (`episodeManager.js:1057`, `1066`); decay 15% of ticks (`main.js:3326`) | path key | signal | scorer ×1.2 × damp (`scoring.js:345`) | flip 0.06% / 0.01% | Yes | No | Yes | **Partially functional**. Reads `Date.now()` (`:136`); effect of that read not determined |
| `stars.js` | once (`main.js:553`) | — | points | — | No | — | — | — | **UI** (reads only) |
| `traversalRecord.js` | `recordOutcome` per attempted move (`main.js:5059`), true edges only (`:110`) | from, to, outcome | `{a, s}` per edge (`:119-124`) | `planning.js:231` edge cost `(a+1)/(s+1)` | Only when outcomes differ. With no `__M7_ENV__` every attempt succeeds (`main.js:5017-5020`), so `s = a` and every edge cost is exactly 1 | Yes | No | Only with a slipping environment | **Functional but unvalidated**. The header comment at `main.js:520-521` ("WRITE-ONLY … nothing reads it") is stale: `planning.js` reads it |
| `trustMemory.js` | `getPathTrust` per candidate (`main.js:2296-2299`); `recordAttempt` per learning tick (`main.js:4478`); `recordSuccess` per path edge on goal arrival (`main.js:4675`, `episodeManager.js:1092`); `decayTrust` 10% of loops | edge key | `(s+1)/(a+2)` (`:87-96`) | scorer `(trust − 0.5)·8·1.5` (`scoring.js:183-184`, `358`); aggregate → behaviour (`main.js:3525-3552`) | flip 1.00% / 0.39% | Yes | No | Yes | **Misleadingly named**. Successes are credited to consecutive pairs of the path window (`main.js:4640-4675`); attempts are credited to `agentLast→next`, a different pair (§4.3 D1). The ratio is not a success rate of any one edge |
| `ui.js` | module load (`:9`, `:76`) | — | `reasoningBox` element | written at `main.js:3909`, `5363`, `5616`, `5663` | No | — | — | — | **UI** (reads only) |
| `uncertaintyEngine.js` | `getUncertaintyScore` per candidate (`main.js:2176`); `updateUncertainty` fallback branch only (`main.js:4417`); decay 15% of ticks (`main.js:3327`) | path key, predicted Q, reward | score | `uncertaintySemanticDamp` ≤0.4 on `meaningBoost` and `semanticVitalityScore` (`scoring.js:315-316`, `344-345`); `arbitrate` | Bounded by those two terms (≤0.06%) | Yes, on fallback ticks only | No | Not separately | **Partially functional** |
| `uncertaintyLedger.js` | `getProceduralUncertainty` per candidate (`main.js:2276`); updates main branch (`main.js:4249`, `4267`, `4270`); decay per loop (`main.js:5224`) | edge, outcome | Beta fields | Procedural fields are spread into the scorer call and collected by `...rest` (`scoring.js:170`), which is never read. Semantic side multiplies `meaningBoost` (`candidateAnalysis.js:271-277`) | No (procedural); bounded by `meaningBoost` (semantic) | Yes | No | — | **Inert**. `registerOllamaPair`, `getCombinedUncertainty`, `getLedgerSummary` never called |

### 1.2 Subsystems inside `main.js`, and the non-`render/` files

| Subsystem | Where | Executes | Reaches | Selection effect | Learns / persisted | Class |
|---|---|---|---|---|---|---|
| Bootstrap and graph build | `main.js:553-677` | once | everything | — | — | **Verified functional** |
| Brain persistence | `saveBrain` `main.js:709-750` every 5 s (`:1148`); `loadBrain` `:754-828` at load (`:1124`) | timer / load | 8 stores + 2 ids | carry-over | persists a subset only: trust, emotion map, embeddings, attention, behaviour states, consolidation, all uncertainty stores, traversal record are lost on reload | **Functional but unvalidated** |
| Candidate pool and filters | `main.js:1709-1796` | per chain step | `choices` | NOREACH closed loop: arrivals 2,347 → 3,110, non-graph moves 2.7% → 12.4% [CF-00] | — | **Verified functional** (oracle O2) |
| Goal gradient | `main.js:2053-2126` | per candidate | scorer ×2.0 | flip 2.81% / 0, the largest single term | — | **Verified functional** (oracle O3) |
| Selection | `main.js:2438-2490`, `2713-2769` | per chain step | `window.lastReasoning` | ε draws 15.5% / 12.9% of step-0 decisions [CF-00] | — | **Verified functional** |
| "Softmax" | `main.js:2616-2650` | per chain step | `topChoices`, line colours | Never sampled. The action is `topChoices[0]`, the arg-max of weight (`main.js:2637`, `2713`); probabilities set only how many runners-up exist for the two anti-repeat swaps (`main.js:2723-2734`) and the display | — | **Misleadingly named** |
| Imagination chain, steps ≥1 | loop `main.js:1621-2852`, guard `:2764` | 1-5 extra steps per `runPrediction` | `thoughtTree` lines (`main.js:3001-3083`) | No action. Side effects: each extra step consumes cognitive RNG (ε draw `:2483`, one `drift` draw per candidate `scoring.js:211`), recomputes drives (`:1689`), and raises `mentalLoad` (`:2958`). CF-00: 24,912 imagined steps not executed | — | **Unnecessary** |
| Reward function | `main.js:3982-4088` | per learning tick | every learning store | — | — | **Functional but unvalidated** (agent-owned, O7) |
| Per-step learning block | `main.js:3961-4963` | per tick with `agentLast` set | Q, rewards, penalties, curiosity, signals, emotion, trust attempts, uncertainty stores | — | — | **Broken** (§4.3 D1: every per-step write is keyed to `agentLast→next`, a pair the agent does not traverse) |
| Goal handling and reset | `main.js:4553-4677`, `4717-4901`, `4992-4994` | per goal selection | reset, episode commit | — | — | **Broken** (O5, O6; contains a latent `ReferenceError`, §4.1) |
| Decay passes | `main.js:3311-3389`, `5215-5257` | per tick / per loop | stores | — | — | **Functional but unvalidated** (two defects, §4.3 D5, D6) |
| Second "reasoning" score | `main.js:3654-3889` | per tick | console, `reasoningBox`, and one write: `penalties += 0.1` when `safeScore < 0` (`main.js:4905-4929`) | n.m. | — | **Duplicated** (a second, different scoring formula; `episodeScore` `:3851-3873` is logged only) |
| Legacy state | `chainMemory` `:833`, `attentionMap` `:939`, `currentGoal` `:831`, `timeMemory` `:1040`, `lastClicked` `:5391`, `episodeRewards` `:4880` | — | — | none | — | **Unnecessary** (§4.2) |
| Click handler / manual training | `main.js:5393-5692` | on click | `recordManualClick`, goal, home, `thoughtTrail`, `pruneGoalWraparound` | sets the goal | — | **UI** (writes agent state) |
| M7 / step-ledger hooks | 8 `globalThis` guards (§3) | when attached | trust read, learning rate, environment | experiments only | — | **Research-only** |
| `instrumentation/rng.js` | `liveRng` on every random draw (23 call sites) | — | decisions | seeded determinism (CF-00 repeat byte-identical) | — | **Verified functional**. `makeRng`, `initRng`, `rng`, `cognitiveRng`, `visualRng`, `isSeeded` have no caller in scope (drivers are out of scope) |
| `instrumentation/sessionRecorder.js`, `telemetryBus.js`, `traceSchema.js` | not imported by `main.js` or any `render/` module | never in the app | — | none | — | **Research-only** (3 files) |
| `benchmarks/harness/decisionProbe.js`, `headlessShim.js` | not imported by the app | harness only | — | none | — | **Research-only** (2 files). `headlessShim.js:106` sets `window = globalThis`, which is what makes the bare `recentMemory` reads resolve under Node |

### 1.3 Counts (59 rows: 38 modules, 15 `main.js` subsystems, 6 non-`render/` files in 3 rows + rng)

| Class | Count |
|---|---|
| Verified functional | 9 |
| Functional but unvalidated | 8 |
| Partially functional | 10 |
| Inert | 6 |
| Duplicated | 3 |
| Misleadingly named | 3 |
| Broken | 3 |
| Research-only | 6 |
| Unnecessary | 3 |
| UI | 8 |

"Verified" means a CF-00 number shows an effect on selection or on a closed-loop outcome. It does not mean correct: four of the nine verified rows are oracle channels.

## 2. Oracle and information-leak channels

"Legitimate" = what a situated agent could observe: its current node, the exits of that node, a goal identity. Everything else below is privileged or a shortcut. All line references were read in this audit.

| # | Channel | Where (read) | What the agent gets | Used by decision at |
|---|---|---|---|---|
| O1 | Whole true adjacency on mesh `userData.neighbors` | written `render/connections.js:120,125` (called from `main.js:666`); array created `main.js:619` | Neighbour list of every node, not only the current one | candidate pool `main.js:1638,1677,1715`; all channels below |
| O2 | `canReachGoal` depth-4 DFS over true adjacency | `main.js:1153-1201` | Rejects any candidate from which the goal is not within 3 further hops (`depth===0` test precedes the goal test, `main.js:1176-1179`) | `main.js:1794`; again inside `analyzeCandidate` `render/candidateAnalysis.js:140-153` (duplicate of the same test); again for the secondary pool `main.js:2542` |
| O3 | `goalDistance` BFS (true adjacency plus learned `transitions` with strength > 1) | `main.js:1317-1374` | Exact hop distance from every candidate to the goal | `goalGradientBoost` `main.js:2067-2073`, weight ×2.0 `render/scoring.js:352` |
| O4 | `futureScore` (FutureScore V2.3) over true graph + `graphDiameter` all-pairs BFS | `render/planning.js:283` (called `main.js:1971`), `main.js:1277-1314` (called per candidate `main.js:1991`) | Look-ahead cost to goal on ground-truth topology | `futureBonus` ×1.2 `render/scoring.js:350` |
| O5 | Goal-entry bypass of the environment | `main.js:4992-4994`, `5017-5020` | A move whose target is the goal never calls `__M7_ENV__.attempt`; the agent is reset instead of moved (`main.js:4858-4862`) | every goal arrival |
| O6 | Goal "arrival" is declared at selection time, not on occupancy | `main.js:4553` (`current` is `next`, the chosen target, `main.js:4484`); move happens later at `main.js:5062-5063` | Goal reward (12, `main.js:4052-4056`), episode commit and success credit are granted for choosing the goal as the next node, before any transition is attempted | all learning stores |
| O7 | Agent-computed reward | `main.js:3982-4088` | Reward is a closed-form function of goal identity and of embedding similarity (`sim` thresholds 0.45 / 0.15, `main.js:4070-4086`); no environment emits it | Q, rewards, penalties, emotion map, uncertainty stores |
| O8 | Designer prior `conceptRelations` pre-trained into embeddings | `render/knowledge.js:10-42`; `main.js:632-644` (`trainEmbedding` on every related pair at load) | 54 of the 60 directed relation pairs are true graph edges, covering 54 of the 78 directed edges (computed in this audit from `neurons.json`, `connections.json`, `knowledge.js`). `similarity` therefore encodes most of the adjacency before any experience, and O7 turns it into reward | `sim` in reward `main.js:3655,4070`; `meaningBoost` `render/candidateAnalysis.js:242-262`; secondary-pool filter `main.js:2553,2600`; attention via embeddings |
| O9 | Non-graph candidates | `main.js:1711-1713` (every key of `transitions.get(currentKey)`), admitted by `main.js:1763-1791`; no-goal pool from `buildSemanticMap` over all 19 other nodes `render/semantic.js:47-85`, `main.js:2570-2612` | The agent may select a non-adjacent node; with no `__M7_ENV__` attached the move always succeeds (`main.js:5017-5020`) | CF-00: 2.7% of BASE moves non-graph [CF-00 `closedLoop.BASE`] |
| O10 | Agent owns start and reset positions | `main.js:3401-3404`, `4858-4862`, `3291-3294` | Position state is a variable of the agent module; the environment holds none | every episode |
| O11 | Goal injection and M7 arm hooks | `main.js:1139` (`__M7_GOAL__`), `2296-2299` (`__M7_ARMS__.bayesianTrustFor`), `3550-3552`, `4157-4159`, `4214-4215` | Experiment code can replace trust, learning rate and Q damping from outside; arm A7 "delivers p_e" per the comment at `main.js:2290` (the arm file is out of scope: not determined) | experiments only |
| O12 | `localStorage["brain"]` restore at module load | `main.js:1124`, `754-828` | Silent cross-session carry-over of 8 stores plus goal and home ids | any session not started from a cleared store |

Not found: any channel exposing true edge reliability to the legacy agent when no experiment hook is attached (searched `p_e`, `reliab` in the in-scope files: only comments).

## 3. Hidden global dependencies

Full list from `grep -o "(window|globalThis)\.[A-Za-z_$]…"` over the in-scope files (DOM APIs `addEventListener`, `innerWidth`, `innerHeight` excluded).

| Global | Writers | Readers | Role |
|---|---|---|---|
| `window.lastReasoning` | `main.js:2765` (step 0 of `runPrediction` only) | `main.js:3116-3152`, `3569`, `3637`, `3948-3949` | **The action channel.** `runAgent` executes `window.lastReasoning.to`. Never cleared, so the 8% replay branch (`main.js:3455-3479`) re-executes the previous decision |
| `window.recentMemory` | `main.js:3277`, `3308`, `4501`, `4816`; shim `benchmarks/harness/headlessShim.js:96` | `main.js:1522`, `3498`; **and as the bare identifier `recentMemory`** in `runAgent` (`main.js:3276`, `3734`, `3749`, `3820`, `4049`, `4496-4501`, `4569`, `4590`, `4640`, `4746`, `4815`, `4878`). `main.js` declares no `recentMemory` outside `runPrediction` (`main.js:1522`), so every one of those reads resolves through the global object | Path window (max 6, `main.js:4497`) used for goal-reward eligibility, episode commit and path credit |
| `window._predictionErrorEpsilonBoost` | `main.js:4276`, `4292`, `4297`, `4454`, `4843` | `main.js:2438` | Prediction error → ε |
| `window.homeNeuronId` | `main.js:817`, `5537` | `main.js:735`, `3430-3435`, `3545`, `4305-4309`, `5108` | Home node; can overwrite `goalNeuronId` (`main.js:3435`, `4309`) |
| `window.lastNeuron` | `main.js:5470`, `5477`, `5528` | none | Write-only |
| `window.lastClicked` | `main.js:5689` | `main.js:5677-5683` | Click bookkeeping. The module-level `let lastClicked` (`main.js:5391`) is a different, unused variable |
| `globalThis.__M7_GOAL__` | external | `main.js:1139` | Goal injection |
| `globalThis.__M7_TEL__` | external | `main.js:3255`, `3473` | Telemetry |
| `globalThis.__M7_EPISODE_CAP__` | external | `main.js:3268` | 150-tick cap |
| `globalThis.__M7_ARMS__` | external | `main.js:2296-2297`, `3550-3551` | Replaces trust read and aggregate trust |
| `globalThis.__M7_PE__` | external | `main.js:4157-4158`, `4215` | Pins learning authority; disables `dampQ` |
| `globalThis.__M7_CREDIT__` | external | `main.js:4473`, `4675`, `5040` | Re-keys trust credit |
| `globalThis.__M7_ENV__` | external | `main.js:5014` | The only environment transition function |
| `globalThis.__MFW_STEP_LEDGER__` | external | `main.js:3279`, `4047`, `4818`, `5027` | Step ledger |
| `globalThis.__M7_REPLAY_ONCE__` | external | `render/episodeManager.js:505` | Replay cooldown switch |
| `THREE` (bare global) | `index.html:19` (CDN script) or `headlessShim.js:67` | `main.js:591`, `2681-2696`, `3030-3071`, `5139-5162`, `5388-5389`; `render/connections.js:63-84` and the visual modules | Rendering library; the agent's graph lives on its objects |
| `localStorage`, `fetch`, `document`, `setTimeout`, `setInterval`, `requestAnimationFrame` | browser or `headlessShim.js:88-141` | `main.js:582`, `647`, `740`, `756`, `1148`, `5314`, `5342`; visual modules | Platform |

## 4. Dead code, write-only stores, inconsistent interfaces

### 4.1 Dead or unreachable code

| Item | Where | Evidence |
|---|---|---|
| `render/episodic.js` (`buildEpisodeMap`) | whole file | No importer in scope; removal noted at `main.js:225-228` |
| `planning.lookAheadScore` | `render/planning.js:50` | Imported `main.js:180`, no call |
| Exported functions with no caller in scope | `activationCompetition.js:40-83` (8 of 11), `episodeManager.js:538` `getEpisodesForBuildMap`, `:554` `getEpisodeStats`, `:593` `getActiveGoalCoverage`; `episodicContextEngine.js:189`, `283`, `491`, `516`, `554`, `583`, `594`; `executiveController.js:288`; `longTermConsolidation.js:128`; `momentumMemory.js:95`; `predictionError.js:568`, `705`; `schemaMemory.js:269`, `290`; `semanticActivation.js:191`; `semanticMemoryLayer.js:123`; `semanticProvenance.js:146`, `205`, `239`; `semanticVitality.js:259`, `265`; `trustMemory.js:171` (and `:112` externally); `uncertaintyEngine.js:194`, `270`; `uncertaintyLedger.js:294`, `468`, `488`; `neuronVisuals.js:517` | Reference search described in `docs/architecture/RUNTIME_CALL_GRAPH.md` §2 |
| Imported by `main.js` and never used | `lookAheadScore`, `getEpisodesForBuildMap`, `getEpisodeStats`, `setQ`, `GOAL_NONE`, `normalize`, `dot`, `CLUSTER_COLORS`, `tickNeuronPulse`, `getNeuronCluster`, `explorationMode`, `getMomentumBonus`, `getSemanticExpectationConfidence`, `getCombinedUncertainty`, `registerOllamaPair`, `getLedgerSummary`, `writeTransition`, `shouldTrainEmbedding`, `getActivationDominance`, `explainArbitration`, `setActivation`, `getCompetitionScore`, `getActivation`, `getTopActiveNeurons`, `isContextEligible`, `getSemanticEdgeStrength`, `isNoiseEdge`, `isStableMemory`, `getAttentionScore`, `episodeRecordNode`, `isLearningGated`, `getEpisodeVaultForReplay`, `resetManualSession`, `wmGetSnapshot`, `getTrustUncertainty`, `getTrustSnapshot`, `getSchemas`, `scene`, `renderer` | Import lines `main.js:11-549`; no other reference in `main.js` |
| Latent `ReferenceError` | `main.js:4878-4895` | `episodeRewards` is not declared anywhere (`main.js:3743` records its removal). The loop does not throw only because `recentMemory` was emptied 60 lines earlier (`main.js:4815-4816`) |
| Empty conditionals | `main.js:2862-2876`, `2931-2945` | Label tests ("work", "hunt", "home", "bed") with empty bodies; none of those labels exists in `neurons.json` |
| `isHome` label test | `main.js:2970-2990` | Tests for labels "home", "rest", "bed"; not present in the 20 labels |
| `selfLoopPenalty`, `isSelfLoop` | `main.js:2219-2220`, `2380` | Unreachable: self candidates return `null` at `candidateAnalysis.js:123-134`. CF-00: term always 0 |
| `chainReward` | `main.js:1960` | Constant 0; CF-00: always 0 |
| `oldEpisodeStrength`, `episodeMemoryBonus` | `main.js:3745`, `3772-3778` | Constant 0 |
| Duplicate neighbour loop | `main.js:1638-1640` and `1677-1679` | Same statement twice; second `if (!startNeuron) return` at `:1674` is unreachable after `:1624` |
| Commented-out blocks | `main.js:2397-2414`, `3410-3418`, `5195` | — |

### 4.2 Unused state and write-only stores

| Store | Written | Read | Verdict |
|---|---|---|---|
| `chainMemory` | never (`main.js:833`) | `main.js:1630` → `chainBoost` (`:1864`, unused) | Dead |
| `attentionMap` | click handler `main.js:5487-5492` | `main.js:1862` → `focus` (unused) | Write-only |
| `currentGoal` | `main.js:5550` | only in a comment (`:1857`) | Write-only |
| `timeMemory` | `main.js:4942`, `5680` (`Date.now()`) | `candidateAnalysis.js:336-356` → `timeScore` (unused), `:411` `episodeMatch` (unused, and keyed with `startNeuron.id`, the three.js object id, not `userData.id`) | Write-only for decisions |
| `signals` | `main.js:4935` | `candidateAnalysis.js:315-319` → `signal` (unused) | Write-only, **persisted** |
| `confidenceMap` | `main.js:4660`, `4691`, `episodeManager.js:1096` | line colour `main.js:3022`; unused local `main.js:1896-1901` | Write-only for decisions, **persisted** |
| `window.lastNeuron` | `main.js:5470`, `5477`, `5528` | none | Write-only |
| `let lastClicked` | `main.js:5391` | none (code uses `window.lastClicked`) | Dead |
| `activationState` | `activationCompetition.js` | no caller of any getter | Write-only |
| `momentumMemory` | `episodeManager.js:1019` | deletion only (`main.js:1441-1446`) | Write-only |
| `provenanceLog` | `semanticProvenance.js:173-180` | `getActivationDominance` (no caller) | Write-only |
| working memory, episode vault | `episodicContextEngine.js` | display only | Write-only for decisions |
| procedural uncertainty ledger | `main.js:4267`, `4270` | spread into `...rest` (`scoring.js:170`) | Write-only for decisions |
| Unused locals in `runPrediction` | `homeNode` `:1527`, `memorySize` `:1537`, `chainMap` `:1630`, `label1`, `label2`, `score`, `attention`, `signal`, `timeScore`, `goalBoost` `:1832-1851`, `focus` `:1862`, `chainBoost` `:1864`, `penalty` only via `dangerPenalty`, `confidenceBoost` `:1900`, `directRewardStrength` `:1962` | — | — | Dead locals |
| `_diagVisits`, `_diagLoops`, `_diagCounters` | exported at `main.js:3234-3245` | `_diagCounters.visits` is passed to schema memory as `diagVisits` (`main.js:910`) | **Not** read-only instrumentation as the comment at `main.js:3209-3212` says: the visit counts gate schema Q access (`schemaMemory.js:105`, `MIN_QKEY_VISITS`; internals not read) |

### 4.3 Inconsistent interfaces and logic defects

| # | Defect | Evidence | Consequence |
|---|---|---|---|
| D1 | **Per-step learning is keyed to a pair the agent does not traverse.** The learning block runs before the move. At that point `agentLast` is the node before the current one (`agentLast = agentCurrent` at `main.js:4967` runs after the block; the move is at `:5063`), `agentCurrent` is where the agent stands, and `next` is the target just chosen from `agentCurrent` (`main.js:3457`, `3948-3949`). The block then uses `prev = agentLast`, `current = next` (`main.js:4483-4484`) | `updateQ({state: agentLast, action: next, nextState: agentCurrent})` `main.js:4167-4175`; `updateLocalEmotion` `:4096-4110`; `recordAttempt(agentLast→next)` `:4473-4480`; `curiosityMap` `:4506-4548`; `penalties` `:4683-4692`, `4905-4929`; `signals` `:4933-4935`; `updateTransitionUncertainty` `:4182`; `recordAutonomousStep(prev, current)` `:4960`. The reward credited comes from `sim` of the real pair `agentCurrent→next` (`main.js:3639-3658`). The code acknowledges the stale `agentLast` for the attempt site only (`main.js:5007-5010`) | For a walk A→B→C the TD update is written to Q[A][C] with successor B. It lands on a key the decision reads only when C is also a candidate at A. Path-level credit on goal arrival is correctly keyed (consecutive pairs of the path window, `main.js:4640-4675`), which is consistent with CF-00 finding that arrivals survive removal of Q. Size of the effect: not measured |
| D2 | Executive weights read under absent names | `scoring.js:300-301` vs `motivationalState.js:290-299` | `exploitW = exploreW = 1` always |
| D3 | Boredom read under an absent name | `main.js:1916-1917` vs `motivationalState.js:311-323` | Motivational boredom never enters `boredomPenalty` |
| D4 | `weakenPath` called with the wrong arity | `main.js:1453-1455` passes `(key, 1.0)`; signature is `(fromId, toId, amount)` (`longTermConsolidation.js:75-77`) → looks up `"<goal>-><id>->1"`, never present | Step 5 of `pruneGoalWraparound` is a no-op |
| D5 | Goal-wraparound Q prune cannot match | `main.js:1420-1426` tests `key.startsWith(goalId + "->")`; Q keys are `"pos#goal->action"` (`qlearning.js:46-48`, `61`) | Step 2 of the prune is a no-op for composite keys |
| D6 | Reward-dependent Q decay cannot match | `main.js:3385-3389` looks up `rewards.get(<Q key>)`; `rewards` keys are `"from->to"` | Every Q value decays at 0.999; the 0.9998 branch is unreachable |
| D7 | `analyzeCandidate` result field mismatch | `main.js:1839` reads `score`; module returns `clampedScore` (`candidateAnalysis.js:397`) | `undefined`, unused |
| D8 | Reported decision ≠ executed action | `lastDecision.best = exploreChoice ‖ bestChoice` (`main.js:2527-2536`), where `bestChoice` is the best *scored* candidate; the executed `nextKey` can differ after the secondary pools are appended (`:2540-2612`), after the anti-repeat swaps (`:2720-2736`), and on replay ticks | `updateBehavior` (`main.js:3488-3553`) and the reasoning text are fed a different edge from the one executed. CF-00: moves matching the greedy arg-max 5,164 / 6,668 |
| D9 | Stale action on replay ticks | `window.lastReasoning` is not cleared (`main.js:3455-3479`, `3948-3949`) | The previous decision is executed again from a new position. CF-00: 92.0% of moves match the step-0 choice |
| D10 | Secondary pools bypass the scorer | `main.js:2540-2568` (true neighbours not already scored, weight = raw similarity) and `:2570-2612` | A true neighbour rejected by the penalty or Q filter re-enters with a weight in [−1, 1] and wins whenever every scored candidate is negative. Reachability is re-applied (`:2542`); the penalty > 10 and Q < −0.5 blocks are not |
| D11 | Exploration pool ≠ greedy pool | ε draw at `main.js:2483-2488` happens before the secondary pools are appended | Exploration samples scored candidates only |
| D12 | Q counted four times with opposite signs | `scoring.js:336` (+5q), `:382` (−1.2·max(0, q−2)), `:379` with `:239-242` (−0.15q), `:348` with `main.js:2164` (+0.8q × attention factor) | Not a bug by itself; makes the weight of Q state-dependent |
| D13 | `dynamicFocus` is subtracted | `scoring.js:255-260`, `379` | Higher fatigue and stress raise every score by a constant; higher reward/Q/habit lower it |
| D14 | Local emotion read with the chain's start key | `main.js:2029-2032` uses `startKey`, not `currentKey` | Wrong edge on chain steps ≥1 (display only) |
| D15 | Goal comparison type-sensitive | `main.js:4052`, `4553`, `3152` use `===` between `next` and `goalNeuronId`; elsewhere `Number()` is applied (`main.js:4992-4994`) | Works while both are numbers (`main.js:1139` coerces). A goal restored from JSON is a number too; other sources: not determined |

### 4.4 Uncontrolled shared state on three.js objects

| State | Owner in practice | Writers | Readers |
|---|---|---|---|
| `mesh.userData.neighbors` (true adjacency) | render mesh | `main.js:619`, `connections.js:120-125` | `main.js:1187`, `1291`, `1343`, `1473`, `1638`, `1715`, `2828`, `4706-4707`, `5430`; `planning.js:262`, `343`; `traversalRecord.js:75-80`; `candidateAnalysis.js:294`; `episodeManager.js:387-389`, `459-461` |
| `mesh.userData.embedding` | render mesh | `main.js:620`; `trainEmbedding` (`embeddings.js:153`, internals not read) | `main.js:2167`, `2560`, `3126-3128`, `3655-3657`, `4393`, `5513`; `candidateAnalysis.js:197-201`; `semantic.js:62-66` |
| `mesh.userData.label`, `.cluster`, `.id` | render mesh | `main.js:613-618` | throughout |
| `mesh.position` | render mesh | `main.js:610` | drawing only |

Any code holding `neuronMap` or `group` can mutate the agent's world model; nothing freezes these objects.

## 5. Clock and randomness on the decision path; evaluation paths

### 5.1 Wall clock

| Read | Where | On the decision or learning path? |
|---|---|---|
| Replay cooldown, 4 s | `episodeManager.js:511-513` | **Yes (learning).** Whether a replay writes depends on real time unless `__M7_REPLAY_ONCE__` is set (`:505-507`) |
| Schema rebuild throttle, 15 s | `schemaMemory.js:80`, `133-134` | **Yes.** Determines when `schemaBonus` changes, unless forced (`episodeManager.js:1149`) |
| `timeMemory` stamps → `timeScore` | `main.js:4942`, `5680`; `candidateAnalysis.js:346-356` | Read per candidate; result unused → no effect |
| Episode ids and timestamps | `episodeManager.js:663`, `688`, `789`; `episodicContextEngine.js:56-403` | Stored (and persisted with episodes); effect on selection: not determined |
| `lastConsolidated`, `lastSeen`, `lastAccessTime`, expectation timestamp, provenance log | `longTermConsolidation.js:54`; `semanticMemoryLayer.js:58`; `semanticVitality.js:136`; `predictionError.js:101`; `semanticProvenance.js:180`, `211` | Whether any of these is read back into a score: not determined (internals not read) |
| Loop cadence, autosave, line removal | `main.js:5314`, `1148`, `2701`, `3077`, `5167` | Cadence only |

CF-00 reports the seed-101 repeat as byte-identical, so under that harness the two "Yes" rows did not vary; that is a property of the run, not of the code.

### 5.2 Randomness

All draws go through `liveRng()`, which returns `Math.random()` when no seed stream exists (`instrumentation/rng.js:89-92`); the browser app never seeds it (no `initRng` call in scope). `Math.random` appears nowhere else in live code (`main.js:3410-3414` is commented out).

| Draw | Where | Stream |
|---|---|---|
| ε test and uniform pick | `main.js:2483-2486`, once or twice per chain step, including imagined steps | cognitive |
| `drift` | `scoring.js:210-213`, once per candidate per chain step | cognitive |
| Predict-or-replay branch | `main.js:3455` | cognitive |
| Decay lotteries | `main.js:3311`, `3325`, `3353`, `5231`, `5255` | cognitive |
| Start, reset and cap positions | `main.js:3404`, `4861`, `3293` | cognitive |
| Replay episode pick, episode ids | `episodeManager.js:473`, `653`, `789`; `episodicContextEngine.js:120` | cognitive |
| Embedding initialisation | `embeddings.js:110` | cognitive |

Episode-id generation and visual modules (`neuronVisuals.js`, `stars.js`) call `liveRng` with the default stream as far as the import shows; which stream argument they pass was not determined. If they use the cognitive stream, drawing a star or an id shifts every later decision draw.

### 5.3 Incorrect evaluation paths

1. **Arrivals are counted without occupancy and without the environment** (O5, O6). Any metric built on goal arrivals measures "chose the goal as next from a node where it was a candidate", not "reached the goal under the environment's dynamics".
2. **Non-graph moves succeed** when no `__M7_ENV__` is attached (`main.js:5017-5020`), and count as moves.
3. **The reasoning display and the behaviour update use `lastDecision.best`**, which is not always the executed action (D8).
4. **`[SCHEMA REUSE]` log** (`main.js:2509-2524`) reports the schema share of the best scored candidate's weight; that weight is the 60/40 blend (`main.js:2383`), not the sum the schema term entered, and the candidate may not be the executed one.
5. **HUD `futureBonus`** is the last candidate's value (`scoring.js:176`).
6. **Trust** mixes attempts on one pair with successes on another (D1), so `getPathTrust` is not an estimate of any edge's reliability unless `__M7_CREDIT__` is attached.
7. **Prediction error's state component** compares a variable with itself (§1.1 `predictionError.js`).

## 6. Corrections to docs/COGNITIVE_AUDIT.md

| Claim in `COGNITIVE_AUDIT.md` | Finding |
|---|---|
| §3.4, §4, §8: `semantic.buildSemanticMap` is never called; `semantic.js` INERT | **Wrong for goal-free operation.** It is called at `main.js:1666` on every chain step when `goalNeuronId === null` (`main.js:1664-1670`). The V8 coverage session behind the claim ran with goal 16 (`audit_summary.json → sessions`, label `COVERAGE_g16_s404`), where the guard skips it. Its output adds non-neighbour candidates in no-goal mode (`main.js:2570-2612`). Effect on selection: not measured |
| §4: `knowledge.js` "used as a candidate logic filter" | Only for the two secondary pools (`main.js:2553`, `2600`). The main scored pool is not filtered by it; in `candidateAnalysis.js:242-262` it only sets `meaningBoost` |
| §4: `candidateAnalysis.js` "rejects candidates via `canReachGoal`" | True but redundant: the same test already ran at `main.js:1794` before the call |
| §2.2: decision is "ε-greedy" over the blended score | Incomplete: the arg-max is taken over scored candidates **plus** unscored secondary candidates weighted by raw similarity (D10), with two anti-repeat swaps; a softmax is computed and never sampled |
| §4: `predictionError.js` "mostly updated on the fallback branch" | By source it is the reverse: the prediction-error stores are updated in the main branch (`main.js:4182-4270`). The fallback branch (`main.js:4342-4456`) is where `semanticMemoryLayer`, step-level consolidation, attention focus, `uncertaintyEngine`, vitality activation and the motivational outcome are updated. Relative frequency of the two branches: not measured here |
| §4: `trustMemory.js` "(successes+1)/(attempts+2) per edge" | Attempts and successes are counted on different pairs (D1) |
| §4: `motivationalState.js` issues | Misses D3 (`boredom` field) |
| §6 L1: `goalDistance` "used at :2067, :1270" | One call site, `main.js:2067`; `:1270` is a comment |
| §3.4: `recordManualClick`, `loadEpisodes`, `exportEpisodes`, `setGoalAttention` listed as never called | Correct for the headless run only. In the app they are called at `main.js:5453`, `810`, `732`, `5513` |
| §2.2: "episodes are saved only when the goal is reached" | Also on manual click sequences (`main.js:5453`) |
| Not in the audit | D1, D4, D5, D6, D8, D10, the latent `ReferenceError` (§4.1), `_diagCounters.visits` feeding schema memory (§4.2), replay writing Q under the no-goal namespace (§1.1 `episodeManager.js`), O6, O8's 54/60 overlap |

Confirmed as stated: the `exploit`/`explore` mismatch; arbitration changing 0 of 6,908 arg-maxes; write-only `activationCompetition` and `momentumMemory`; `episodic.js` unimported; `...rest` swallowing the procedural ledger; three accepted-and-unused scorer inputs; the oracle channels L1-L4, L7; the wall-clock schema throttle.
