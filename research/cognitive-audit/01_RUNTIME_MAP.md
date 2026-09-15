# Phase 0 — Runtime Map

Everything below is traced from `index.html`. Nothing is inferred from filenames or comments.

---

## 1. Boot

```
index.html
  └─ <script src="three@0.158 (CDN)">
  └─ <script type="module" src="./main.js">
```

`main.js` is the **only** entry point. It is 5,250 lines and contains exactly three top-level functions of consequence: `runPrediction`, `runAgent`, `runAgentLoop`. Everything else is module-level statements executed at import time.

Boot sequence, in source order:

| main.js | Action |
|---|---|
| 1–518 | 40 static imports. |
| 522–545 | `createStars`, `setVisualsGroup`, wire `neuronMap` into `search`, `embeddings`, `connections`. |
| 551–646 | `fetch('neurons.json')` → build 20 neurons, each with `userData.embedding = createEmbedding()` (32-d random unit vector). Then `trainEmbedding(a,b)` for every pair present in the hand-authored `conceptRelations`. Then `fetch('connections.json')` → build the graph and populate `userData.neighbors`. Then `_initEpisodeManagerWhenReady()`. |
| 1008 | `loadBrain()` — restores `transitions, rewards, penalties, signals, curiosityMap, Q, confidenceMap, episodes, homeNeuronId, goalNeuronId` from `localStorage`. |
| 1015 | `rebuildAdjacencyMemory()`. |
| 1017 | `setInterval(saveBrain, 5000)` — persistence is live. |
| 2894 | `animate()` — the render loop. |
| 2901–2910 | `createHUD`, `createThinkingStream`, `createSpeedControl`. |
| 4879 | `keydown` listener. SPACE toggles `agentRunning` and calls `runAgentLoop()`. Shift+R wipes the brain. |
| 4947 | `click` listener — raycast, manual training, Shift+click = set goal, Alt+click = set home. |

**The world.** `neurons.json` is 20 nodes labelled with cognitive-science terms (`percept, signal, context, salience, encode, recall, trace, schema, infer, abstract, predict, reflect, decide, act, adapt, goal, reward, explore, trust, identity`). `connections.json` is a static undirected edge list. `conceptRelations` (render/knowledge.js) is a hand-written adjacency list over the same 20 labels. These three files constitute the entire world. Nothing else enters the system except mouse and keyboard.

`goalNeuronId` initialises to `null` (main.js:1005) and is only ever set by Shift+click, by `loadBrain`, or by the fatigue>80 "seek home" override (main.js:3111), which itself requires a prior Alt+click. **On a fresh install, pressing SPACE runs the agent with no goal.**

---

## 2. The tick

```
runAgentLoop()                                    main.js:4758
  ├─ decaySemanticActivations()
  ├─ decayTransitionUncertainties()
  ├─ decayUncertaintyLedger()
  ├─ decayActivations(0.93)
  ├─ wmDecay()
  ├─ p=0.10: decaySemanticMemory, decayConsolidation, decayTrust,
  │          rebuildSchemas(getAllEpisodes()), rebuildAdjacencyMemory()
  ├─ p=0.05: runConsolidationPass(rewards, Q, transitions)
  ├─ every 20 ticks: [DIAG] + [STORE CENSUS] console lines
  ├─ for (i=0..4) runAgent()                      ← 5 agent steps per tick
  └─ setTimeout(runAgentLoop, agentSpeed=500)
```

Note the loop is **not** wrapped in `try`/`catch`. Any throw inside `runAgent` skips the `setTimeout` at line 4872 and stops the agent permanently.

---

## 3. `runAgent()` — main.js:2976

```
runAgent()
 ├─ p=0.10  curiosityMap *= 0.995
 ├─ p=0.15  decaySemanticSystems(), decayUncertainty()
 ├─ penalties *= 0.98 (delete < 0.05)
 ├─ p=0.02  rewards *= 0.9995
 ├─ transitions *= 0.995
 ├─ Q *= (rewards.get(qKey) > 5 ? 0.9998 : 0.999)     ← see §6, defect D8
 ├─ if (!agentRunning) return
 ├─ if (!agentCurrent) agentCurrent = random non-goal node
 ├─ if (fatigueState > 80 && homeNeuronId) goalNeuronId = homeNeuronId
 │
 ├─ p=0.92  runPrediction(agentCurrent)               ← CHOOSE  (writes window.lastReasoning)
 │  else    replayOneEpisode()                        ← DREAM
 │
 ├─ updateBehavior({reward, penalty, success, repeated, isHome, aggregateTrust})
 ├─ build the "why chosen / why not others" console explanation from lastDecision
 │
 ├─ reasoning  = window.lastReasoning                 ← may be STALE, see defect D5
 ├─ next       = reasoning.to
 ├─ sim        = similarity(emb[reasoning.from], emb[next])
 ├─ safeScore  = a second, entirely separate scoring formula (main.js:3465)
 ├─ reasoningBox.innerText = ...                      ← HUD only
 │
 ├─ if (agentLast !== null && next !== null && agentLast !== next && agentLast !== goal):
 │    ├─ rewardSignal  = f(next===goal, sim)          ← COMPUTED, NOT OBSERVED
 │    ├─ updateLocalEmotion(agentLast, next, rewardSignal)
 │    ├─ predError = evaluatePredictionError({next, rewardSignal, sim, goalProgress})
 │    │
 │    ├─ IF predError (normal step):
 │    │    updateQ(state=makeStateKey(agentLast,goal), action=next, ...)   ← composite key
 │    │    updateTransitionUncertainty, updateSequenceError, dampQ(agentLast,next)
 │    │    recordSemanticExpectationOutcome, updateSemanticUncertainty
 │    │    updateProceduralUncertainty, propagateUncertainty
 │    │    epsilon-boost / recovery / curiosity signal
 │    │    applyPredictionErrorToBehavior
 │    │
 │    └─ ELSE (predError === null — epsilon step only):
 │         updateQ(same composite key)
 │         recordSemanticEdge, reinforcePath/weakenPath
 │         updateAttentionFocus, strengthenAttention/weakenAttention
 │         boostActivation
 │         updateUncertainty (uncertaintyEngine)
 │         activateSemanticVitality / penalizeSemanticPath
 │         recordOutcome (motivationalState)
 │
 ├─ recordAttempt(agentLast->next)
 ├─ recentMemory.push(next)
 ├─ curiosityMap update
 ├─ if (next === goal): recordAutonomousSuccess, reward whole path, recordSuccess,
 │                      clear recentMemory, sealCurrentEpisode, resetAttentionFocus,
 │                      resetExpectation, jump agent to random non-goal node
 ├─ transitions[prev][current]++  (graph neighbours only)
 ├─ signals, timeMemory
 ├─ recordAutonomousStep(prev, current) if not goal
 ├─ agentLast = agentCurrent
 └─ if (!goalResetJustHappened) { agentCurrent = next; recordSemanticActivation;
                                  changeFatigue(0.05); draw line; thoughtTrail.push }
```

### The critical branch

`evaluatePredictionError` returns `null` **iff** no expectation is stored (predictionError.js:135). An expectation is stored only at the end of a *complete* `runPrediction` (main.js:2843–2887). `runPrediction` returns early on the epsilon branch (main.js:2228) and never reaches that block.

Therefore:

- **~80% of steps** take the `IF` branch: Q, uncertainty, damping, behaviour modulation.
- **~20% of steps** (the epsilon jumps) take the `ELSE` branch, which is the **only** path that feeds `semanticMemoryLayer`, `longTermConsolidation`, `cognitiveAttention`, `activationCompetition`, `uncertaintyEngine`, `semanticVitality`, and `motivationalState.recordOutcome`.

Seven subsystems are fed exclusively by the branch that fires when the decision system was bypassed.

---

## 4. `runPrediction(startKey)` — main.js:1284

```
runPrediction(startKey)
 ├─ dynamicDepth = agentRunning ? 4 : 1, modulated by fatigue/confidence/curiosity
 ├─ STEPS = clamp(dynamicDepth, 2, 6)
 │
 └─ for (step = 0; step < STEPS; step++):
      ├─ memoryMap     = transitions.get(currentKey)
      ├─ structureMap  = graph neighbours of currentKey
      ├─ embeddingMap  = goalNeuronId ? EMPTY : buildSemanticMap(...)
      ├─ updateMotivationalState(...) ; executiveWeights = computeExecutiveWeights()
      │
      ├─ allCandidates = memoryMap ∪ neighbours
      ├─ FOR EACH candidate k:
      │    ├─ gate: penalties > 10 → skip
      │    ├─ gate: getQ(currentKey,k) < -0.5 → skip
      │    ├─ gate: !graphNeighbour && !(transitions>5) && !(reward>4 && adjacency>0) → skip
      │    ├─ gate: goal set && !canReachGoal(k, goal) → skip
      │    ├─ analysis = analyzeCandidate(...)
      │    ├─ ~30 local terms computed
      │    ├─ finalWeight = calculateDecisionScore({~40 fields})
      │    ├─ competitive = arbitrate({...})            (only if executiveWeights)
      │    ├─ arbitrated  = finalWeight*0.60 + competitive*0.40
      │    └─ choices.push({key:k, weight:arbitrated})
      │
      ├─ epsilon = clamp(0.2 - fatigue*0.002 + predBoost + stressBoost, 0.02, 0.7)
      ├─ IF rand < epsilon:  currentKey = randomChoice.key;  RETURN     ← exits the FUNCTION
      │
      ├─ sorted = choices.sort(desc by weight)
      ├─ bestChoice = sorted[0];  lastDecision = {current, best, all:top3}
      │
      ├─ structureMap.forEach → push MORE choices with weight = raw cosine similarity
      ├─ embeddingMap.forEach → push MORE choices (skipped entirely when goal is set)
      │
      ├─ softmax over the AUGMENTED choices array
      ├─ confidence = choices[0].prob
      ├─ topChoices = slice(0, confidence>0.7 ? 1 : confidence>0.4 ? 2 : 3)
      ├─ draw prediction lines
      ├─ nextKey = topChoices[0].key   (+ anti-repeat swaps)
      ├─ IF step === 0: window.lastReasoning = {from: currentKey, to: nextKey}
      ├─ IF step === 0: updateHUD, updateThinkingStream, setAttentionSpotlight
      ├─ thoughtTree.push({from, to, step})
      └─ currentKey = nextKey                              ← imagination advances
 │
 ├─ regulateBiology({activity, mentalLoad: STEPS, repetition, loopDepth, danger, isHome})
 ├─ draw thoughtTree lines (removed after 3s)
 └─ IF window.lastReasoning: generateExpectation({...})
```

### What the multi-step loop actually accomplishes

`STEPS` is 2–6. Only `step === 0` writes `window.lastReasoning`. Steps 1..N-1 advance a local `currentKey`, push into `thoughtTree`, and draw lines that are deleted after 3 seconds. **No state produced by steps 1..N-1 reaches action selection, memory, or learning.** The rollout's only functional effect is `regulateBiology({mentalLoad: STEPS})`, i.e. it makes the agent tired.

### The two-stage candidate list

`bestChoice` and `lastDecision` are computed from `sorted` (main.js:2231–2236). *After* that, two more `forEach` blocks push additional candidates into the same `choices` array with weights on a completely different scale (raw cosine similarity, ≈[-1,1], versus `arbitratedScore` ≈[-400,400]). The softmax then runs over the merged array, and `nextKey` comes from that. So:

- The action taken (`nextKey`) and the action explained (`lastDecision.best`) are computed from **different candidate sets** and can differ.
- Because the weight scales differ by ~400×, `exp(w - maxW)` underflows to 0 for every semantic candidate whenever any scored candidate exists. `topProb` is therefore ≈1.0, `confidence > 0.7`, and `topChoices = choices.slice(0,1)`. The softmax is an argmax with extra steps, and "confidence" is a constant.

---

## 5. Module graph

51 JS files. Import roots: `main.js` (app) and `experiments/exec_influence/run.js`, `verify.js` (offline harness).

**Never imported by anything:** `render/episodic.js` (`buildEpisodeMap` — superseded, comment at main.js:219 acknowledges it).

**Imported but with zero call sites** (imported symbol names appear only in the import statement):

| Module | Dead imports in main.js |
|---|---|
| `activationCompetition.js` | `setActivation`, `getCompetitionScore`, `getActivation`, `getTopActiveNeurons`, `isContextEligible` |
| `episodicContextEngine.js` | `episodeRecordNode`, `isLearningGated`, `getEpisodeVaultForReplay`, `wmGetSnapshot` |
| `momentumMemory.js` | `getMomentumBonus`, `momentumMemory` |
| `executiveController.js` | `explainArbitration` |
| `predictionError.js` | `getSemanticExpectationConfidence` |
| `semanticProvenance.js` | `shouldTrainEmbedding`, `getActivationDominance`, `writeTransition` |
| `trustMemory.js` | `getTrustUncertainty`, `getTrustSnapshot` |
| `uncertaintyLedger.js` | `getCombinedUncertainty`, `registerOllamaPair`, `getLedgerSummary` |
| `episodeManager.js` | `getEpisodesForBuildMap`, `getEpisodeStats` |
| `qlearning.js` | `setQ` |
| `schemaMemory.js` | `getSchemas` |
| `planning.js` | `lookAheadScore` (reached only via `futureScore`) |

**Duplicated modules.** `experiments/exec_influence/executiveController.real.js` is byte-identical to `render/executiveController.js`. `experiments/exec_influence/scoring.real.js` differs from `render/scoring.js` by 29 diff lines: it adds an injectable `rng` and **lacks the `schemaScore` field** the live file has. The harness tests a stale copy.

---

## 6. Where each computed quantity ends up

Inside `runPrediction`'s candidate loop, ~30 quantities are computed. This table records their fate.

| Computed | main.js | Reaches the argmax? |
|---|---|---|
| `transitionBoost` | 1706 | ✅ ×3 |
| `qValue = getQ(currentKey,k)` | 1689 | ✅ ×5 — **but see defect D1: always 0 for RL-learned values** |
| `reward` | 1633 | ✅ `tanh(r*0.1)*8` |
| `habitBoost` | 1647 | ✅ ×2 |
| `curiosityBoost` | 1643 | ✅ ×2 |
| `meaningBoost` | analysis | ✅ ×0.15×semanticWeight → max contribution **0.0042** |
| `goalGradientBoost` | 1817 | ✅ ×2 — 0 when no goal is set |
| `schemaBonus` | 2077 | ✅ ×15 |
| `trajectoryIntegrity` | 2101 | ✅ ×40 — largest coefficient in the formula |
| `bayesianTrust` | 2053 | ✅ `max(0,t-0.5)*8*1.5` |
| `semanticVitalityScore` | 1902 | ✅ ×1.2 |
| `noiseSuppressedScore` | 1912 | ✅ ×1.0 |
| `consolidationBonus` | 1919 | ✅ ×2.0 |
| `attentionAmplifiedScore` | 1930 | ✅ ×0.4 |
| `futureBonus` | 1754 | ✅ ×1.2 — **but see defect D2: identically 0** |
| `boredomPenalty` | 1684 | ⚠️ **+2.0 — sign inverted** |
| `dangerPenalty` | 1758 | ⚠️ **+2.0 — sign inverted** |
| `stressState` | import | ⚠️ **+0.4 — sign inverted** |
| `curiosityState` | import | ⚠️ **−0.8 — sign inverted** |
| `chainReward` | 1725 | ➖ hardcoded `0` |
| `transitionUncertainty` | 2024 | ❌ declared in `calculateDecisionScore`'s "accepted, unused" block (scoring.js:124) |
| `sequenceError` | 2032 | ❌ same |
| `uncertaintyState` | 2014 | ❌ same |
| `...getProceduralUncertainty(...)` | 2040 | ❌ spreads `{confidence, uncertainty, volatility, evidenceMass}` into `...rest` — unused |
| `attention` | analysis | ❌ destructured, never used |
| `signal` | analysis | ❌ destructured, never used |
| `timeScore` | analysis | ❌ destructured, never used |
| `goalBoost` | analysis | ❌ hardcoded 0 in `candidateAnalysis.js`, destructured, never used |
| `score` | analysis | ❌ **`undefined`** — `analyzeCandidate` returns `clampedScore`, not `score` |
| `focus` (`attentionMap`) | 1627 | ❌ computed, never used |
| `chainBoost` | 1629 | ❌ computed, never used |
| `confidence` / `confidenceBoost` (`confidenceMap`) | 1661 | ❌ computed, never used |
| `localEmotion.*` | 1791 | ✅ five terms, correct signs |

Twelve of thirty computed quantities never reach the decision. Four reach it with the wrong sign. One is a JavaScript `undefined` produced by a field-name mismatch between producer and consumer.

**Defect D8:** the Q decay loop (main.js:3061–3065) reads `rewards.get(key)` where `key` is a **Q key** (`"5#16->6"`) while `rewards` is keyed `"5->6"`. The lookup always misses, so the "gentler decay for manually-trained paths" branch never fires and every Q value decays at 0.999.
