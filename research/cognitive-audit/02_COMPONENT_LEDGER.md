# Phase 0 — Component Ledger

All 30 components from the project instructions, classified against the evidence standard in `00_METHOD_AND_SCOPE.md` §2.

Legend: **W** = EXISTS + WORKING · **P** = EXISTS + PARTIAL · **NU** = CODE EXISTS BUT NOT ACTUALLY USED · **D** = PLANNED/DOCUMENTED ONLY · **M** = MISSING · **U** = UNCLEAR

---

## Summary

| | Count | Components |
|---|---|---|
| **W** | 4 | Representation, Embeddings, Action execution, Temporal/state transitions |
| **P** | 11 | Memory, Retrieval, Decision scoring, Action selection, Q-learning, Learning, Exploration/exploitation, Goals, Curiosity, Confidence, Adaptation |
| **NU** | 9 | Beliefs, Uncertainty, Planning, Prediction, Prediction-error, Focus, Stress, Fatigue, Long-term learning |
| **D** | 2 | Metacognition, Self-monitoring |
| **M** | 3 | Perception, Counterfactual reasoning, Active information gathering |
| **U** | 1 | Situation/state representation |

---

## 1. Perception — **MISSING**

There is no observation channel. The system's entire input is three static files (`neurons.json`, `connections.json`, `conceptRelations`) plus mouse/keyboard. There is no sensor, no partial observability, no noise, no signal to be extracted from anything.

`main.js:1391` reads `transitions.get(currentKey)` and `main.js:1403` reads `startNeuron.userData.neighbors`. Both are internal memory reads. The agent's "state" is a neuron id it assigned itself.

The `perception` cluster in `neurons.json` (`percept, signal, context, salience`) is a *label on a node*, not a perceptual process. Naming a graph vertex "percept" does not constitute perception.

## 2. Representation — **EXISTS + WORKING**

Node = `{id, label, cluster, neighbors[], embedding[32]}` (main.js:582–590). Edges from `connections.json`. This is a real, consistently used representation. It is a static graph, not a learned model, but it exists and everything reads it.

## 3. Embeddings — **EXISTS + WORKING** (with a caveat about what they mean)

`render/embeddings.js`. `createEmbedding()` returns a normalised 32-d uniform-random vector (embeddings.js:~14). `trainEmbedding(id1,id2)` pulls two vectors together with lr gated by `getQ`, capped at cos > 0.92. `similarity` = dot product of unit vectors = cosine.

Called at boot for every `conceptRelations` pair (main.js:601–613) and from `episodeManager` via `sys.trainEmbedding`. The mechanism works.

Caveat for the ledger: these embeddings encode (a) a random initialisation and (b) a hand-authored adjacency list. They are not learned from any experience of a world. `similarity(a,b)` is therefore a noisy re-read of `conceptRelations`, not a semantic representation acquired by the system.

## 4. Memory — **EXISTS + PARTIAL**

Nine stores exist and are written:

| Store | Written at | Read at | Status |
|---|---|---|---|
| `transitions` | 4338, episodeManager | 1391, 1529 | ✅ live |
| `rewards` | 4260, 4403, `writeReward` | 1548, 1633 | ✅ live |
| `penalties` | 4315, 4383 | 1491, 1635 | ✅ live (wrong sign downstream) |
| `curiosityMap` | 4178, 3962 | 1638 | ✅ live |
| `Q` | 3814/3987 (composite), episodeManager (bare) | 1500, 1689 (bare only) | ⚠️ **split namespace — defect D1** |
| `signals` | 4559 | `analyzeCandidate` → discarded | ❌ never influences |
| `timeMemory` | 4566, 5231 | `analyzeCandidate` → discarded | ❌ never influences |
| `confidenceMap` | 4293, 4319 | 1661 → discarded | ❌ never influences |
| `episodicStore` | `recordManualClick`, `recordAutonomousSuccess` | replay, schema, adjacency | ✅ live, but see §5 |
| `chainMemory` | **nothing** | 1395 | ❌ dead (comment at 1720 confirms) |
| `adjacencyMemory` | `rebuildAdjacencyMemory` | `trajectoryConfidence` | ✅ live |
| `attentionMap` | 5039 (click only) | 1627 → discarded | ❌ never influences |
| `momentumMemory` | `episodeManager` via `sys.learnMomentum` | **never** (`getMomentumBonus` has 0 call sites) | ❌ write-only |
| `activationState` | `boostActivation` | **never** (`getActivation`, `getCompetitionScore`, `getTopActiveNeurons` have 0 call sites) | ❌ write-only |

Persistence is real: `setInterval(saveBrain, 5000)` (main.js:1017) and `loadBrain()` at 1008.

Partial, not working, because five of the fourteen stores are write-only or read-and-discarded.

## 5. Retrieval — **EXISTS + PARTIAL**

Retrieval is a direct keyed lookup: `transitions.get(k)`, `rewards.get(from+"->"+to)`, `adjacencyMemory.get(...)`, `getSchemaBonus(from,to)` reading a precomputed `_bonusCache`. There is no similarity-based recall, no cue-driven pattern completion, no competition between retrieved items. `replayOneEpisode()` (episodeManager.js:416) filters `episodicStore` by eligibility and replays one — that is the closest thing to associative retrieval, and it runs on 8% of ticks.

**Critical dependency:** `episodicStore` is populated by `recordManualClick` (human training) and `recordAutonomousSuccess` (main.js:4223), which fires **only** when `current === goalNeuronId`. With `goalNeuronId === null` — the default state on a fresh install — no episodes are ever stored. Consequently `adjacencyMemory` is empty, `trajectoryConfidence` returns 0, `computeTrajectoryIntegrity` returns 0 (main.js:955 early-exits on empty store), and `rebuildSchemas` finds no motifs. The three highest-weighted terms in the decision function (`trajectoryIntegrity×40`, `schemaBonus×15`, `goalGradientBoost×2`) are all identically zero unless a human has first taught the system by hand.

## 6. Situation/state representation — **UNCLEAR**

There are three competing notions of "current state" and they disagree:

1. `agentCurrent` — a bare neuron id. This is what `runPrediction` is called with.
2. `makeStateKey(pos, goal)` = `"pos#goal"` — used by `updateQ` and `schemaMemory`.
3. `recentMemory` (last 6 nodes) + `thoughtTrail` (last 6) — used for repetition penalties and trajectory integrity.

No single object is constructed, named, or passed as "the situation". The mismatch between (1) and (2) is defect D1 and is load-bearing. I mark this UNCLEAR rather than PARTIAL because the code does not commit to an answer; different subsystems answer differently, and the disagreement is the bug.

## 7. Beliefs — **CODE EXISTS BUT NOT ACTUALLY USED**

`render/uncertaintyLedger.js` maintains genuine Beta posteriors — `getProceduralUncertainty` returns `{confidence: α/(α+β), uncertainty, volatility, evidenceMass}` from real conjugate updates. This is a correct belief representation.

It is spread into `calculateDecisionScore` at main.js:2040. `calculateDecisionScore`'s signature (scoring.js:31–128) has no `confidence`, `uncertainty`, `volatility`, or `evidenceMass` parameter. All four land in `...rest` (scoring.js:126) and are discarded. **Beliefs are computed correctly and then thrown away.**

## 8. Uncertainty — **CODE EXISTS BUT NOT ACTUALLY USED**

Four separate uncertainty systems exist:

| System | Fed by | Consumed by |
|---|---|---|
| `predictionError.uncertaintyState` | every step | passed to scoring as `uncertaintyState` → "accepted, unused" (scoring.js:123) |
| `predictionError.getTransitionUncertainty` | every step | passed as `transitionUncertainty` → "accepted, unused" (scoring.js:124) |
| `uncertaintyLedger` (Beta) | every step | → `...rest`, unused |
| `uncertaintyEngine.getUncertaintyScore` | **only the epsilon branch** (main.js:4056) | ✅ used, as `uncertaintyScore` → `uncertaintySemanticDamp` |

Only the fourth reaches the score, and it modulates `meaningBoost` — whose maximum contribution is 0.0042 points out of a ~100-point score. Its other consumer is `arbitrate`, which is itself inert (§17).

The system computes uncertainty four different ways and acts on none of them.

## 9. Goals — **EXISTS + PARTIAL**

`goalNeuronId` is a single integer. It gates candidate admission (`canReachGoal`, main.js:1559), produces `goalGradientBoost` (1817–1888), and disables all semantic candidates (2325). This is real and it works.

Partial because: there is one goal, it is set by a human Shift+click, it is never generated, never decomposed into subgoals, never abandoned or revised except by the fatigue>80 home override, and the autonomous goal-setting code is commented out (main.js:3086–3094). Default value is `null`.

## 10. Curiosity — **EXISTS + PARTIAL**

`curiosityMap` counts per-path visits; `curiosityBoost = (1/√(visits+1))*0.08` (main.js:1643) enters the score at ×2 → max 0.16 points. `curiosityState` (behavior.js) enters at **−0.8 per unit** — inverted, so global curiosity *suppresses* every candidate uniformly (a constant offset, so it does not change the argmax, but it does mean the "curiosity" state variable has no exploratory effect). Prediction-error-driven curiosity (main.js:3958–3966) writes into `curiosityMap`.

Working as a novelty counter. Not working as a drive.

## 11. Confidence — **EXISTS + PARTIAL**

Two things are called confidence:
- `confidenceState` (behavior.js:20), updated by `updateBehavior` from reward/penalty/repetition and floored by aggregate Bayesian trust (main.js:3194–3216). Reaches the score at `min(c,20)*0.5`. ✅ live.
- `confidenceMap` (per-path), written on goal-reach at main.js:4293. Read at main.js:1661 into `confidenceBoost` — **which is never passed to `calculateDecisionScore`**. ❌ dead.
- `confidence = topProb` from the softmax (main.js:2370). Degenerate: because the augmented `choices` array mixes scores on ~400× different scales, `exp(w-maxW)` underflows and `topProb ≈ 1.0` essentially always.

## 12. Stress — **CODE EXISTS BUT NOT ACTUALLY USED (as a penalty)**

`stressState` has real dynamics (`regulateBiology`, `changeStress`, loop detection at main.js:3175). It genuinely drives the epsilon escape boost (main.js:2195–2201) — that part works.

But its path into the decision score is **`+ stressState * 0.4`** (scoring.js:359, verified numerically at +0.575/unit including the `costScore` interaction). Stress raises every candidate's score by a constant. It cannot select against anything.

## 13. Fatigue — **EXISTS + PARTIAL**

`fatigueState` correctly reduces `dynamicDepth` (main.js:1330–1343), lowers epsilon, enters the score at −0.35/unit, and triggers the home override. This one is wired correctly. Partial only because the "thinking depth" it modulates has no downstream effect (§23).

## 14. Focus — **CODE EXISTS BUT NOT ACTUALLY USED**

`focusState` is exported from behavior.js and passed into `calculateDecisionScore` — which never reads it, computing its own `effectiveFocus = max(0,conf)*exp(-stress/30)` instead (scoring.js:186). `attentionMap` (main.js:902) is written only by clicks and read into `focus` at 1627, which goes nowhere. `cognitiveAttention.getAttentionScore` has zero call sites. Only `applyAttentionAmplification` survives, at ×0.4.

## 15. Learning — **EXISTS + PARTIAL**

Learning that demonstrably changes behaviour:
- `transitions[from][to]++` → `transitionBoost` ×3. ✅
- `rewards` → `tanh(r*0.1)*8`. ✅
- `episodicStore` → `trajectoryIntegrity` ×40 and `schemaBonus` ×15. ✅ (requires human teaching)
- `trustMemory` → `trustBonus` ×1.5. ✅
- `embeddings` via `trainEmbedding`. ✅ (but see §3)

Learning that does not:
- Q-learning (§16).
- `semanticMemoryLayer`, `longTermConsolidation`, `cognitiveAttention`, `activationCompetition`, `uncertaintyEngine`, `semanticVitality` — all updated **only on the epsilon branch** (main.js:3981–4095), i.e. only when the decision system was bypassed.

## 16. Q-learning — **EXISTS + PARTIAL (structurally broken)**

The Bellman update in `qlearning.js:92–230` is correct: `Q ← Q + α(r + γ·max_a' Q(s',a') − Q)`, clamped to ±20, with a working `maxFutureQ` scan and diagnostic counters.

**Defect D1.** The online RL loop writes composite keys:
```js
updateQ({ state: makeStateKey(agentLast, goalNeuronId), action: next, ... })  // main.js:3815 → "5#16->6"
```
Action selection reads bare keys:
```js
const qValue = getQ(currentKey, k);                                          // main.js:1689 → "5->6"
```
These are disjoint key spaces. Measured (`04_FALSIFICATION_EVIDENCE.md`, Probe A): **500 autonomous Q updates produced 275 Q entries, 0 of which are visible to `calculateDecisionScore`.**

The only Q values the scorer can read come from `episodeManager` (episodeManager.js:942, `state: from, action: to` — bare keys), i.e. from human teaching and replay of human teaching. And `dampQ(agentLast, next, ...)` (main.js:3858) also uses bare keys — so the online loop's only effect on readable Q is to **erode** the teaching-derived values.

Net: reinforcement learning is a write-only sink that decays the supervised signal.

## 17. Decision scoring — **EXISTS + PARTIAL**

`calculateDecisionScore` (scoring.js:31–433) is genuinely the decision function; it exists, it runs, its output is argmaxed. But four terms carry the wrong sign (measured, Probe C):

| Term | measured ∂score/∂x | intent |
|---|---|---|
| `boredomPenalty` | **+2.00** | penalty |
| `dangerPenalty` | **+2.00** | penalty |
| `stressState` | **+0.575** | cost |
| `curiosityState` | **−0.80** | drive |
| `driveRewardBoost` (`dominantDrive="hunger"`) | **−1.99** on a reward-8 candidate | "amplify reward-seeking" |

These are operator-precedence errors in a 90-line chained expression (scoring.js:279–368): the `+`/`-` alternation drifts after the `localFear * 2.2 -` term. `dangerPenalty = penalty * 1.5` and enters at ×2, so a path with `penalty = 5` gets **+15 points** for being dangerous.

The executive-weight modulation (`exploitW`, `exploreW`) is inert — see §26.

## 18. Action selection — **EXISTS + PARTIAL**

Argmax over `choices`, with an epsilon-greedy branch and a softmax stage. Three problems:

1. **Epsilon is a no-op with side effects (defect D5).** main.js:2222–2229 picks a random candidate, assigns it to a local `currentKey`, then `return`s from `runPrediction` entirely. `window.lastReasoning` is not updated. `runAgent` then reads the *previous* step's `lastReasoning` and re-executes the same move. The random choice is discarded. The only real effect is that `generateExpectation` is skipped, which flips `runAgent` into its `else` learning branch.
2. **The explanation and the action come from different candidate sets** (§4 of `01_RUNTIME_MAP.md`). `lastDecision.best` ≠ `topChoices[0]` in general.
3. **The softmax is degenerate** — scale mismatch of ~400× between the two candidate populations means `topProb ≈ 1.0` and `topChoices` is always length 1.

## 19. Action execution — **EXISTS + WORKING**

`agentCurrent = next` (main.js:4621). Position changes, a line is drawn, a travel dot spawns. It works.

## 20. Feedback/outcome — **MISSING as an observation; PARTIAL as a computation**

`rewardSignal` (main.js:3645–3743) is:
```js
if (next === goalNeuronId) rewardSignal = (uniqueNodes >= 3) ? 12 : 0;
else if (sim > 0.45)       rewardSignal = 2;
else if (sim > 0.15)       rewardSignal = 0.3;
else                       rewardSignal = -0.4;
```
where `sim = similarity(emb[from], emb[to])`.

Every term is computable **before** the action is taken, from information the decision function already had. There is no environment to return anything. The agent does not receive an outcome; it recomputes its own prior.

## 21. Prediction — **CODE EXISTS BUT NOT ACTUALLY USED**

`generateExpectation` (predictionError.js:82) stores `{predictedNextId, predictedReward, predictedSimilarity, predictedConfidence, predictedGoalProgress}` derived entirely from `window.lastReasoning`, i.e. from the action already chosen.

- `predictedNextId` = the action just selected. Predicting your own next action in a deterministic system is not prediction.
- `predictedReward` = `rewards.get(from+"->"+to)` — a memory read.
- `predictedSimilarity` = `similarity(from, to)` — a memory read.

Nothing about the *world* is predicted, because the world is a static graph the agent already has in full.

## 22. Prediction-error computation — **CODE EXISTS BUT NOT ACTUALLY USED**

Measured (Probe D). Over the exact `main.js` call sequence:

| component | value | why |
|---|---|---|
| `statePredictionError` | **0.000 always** | predicted = `lastReasoning.to`; actual = `lastReasoning.to`. Identical by construction. |
| `semanticPredictionError` | **0.000 always** | both sides call `similarity(from,to)` on the same unchanged embeddings. |
| `goalPredictionError` | **0.000 always** | both sides evaluate `to === goalNeuronId`. |
| `rewardPredictionError` | varies | `\|rewards.get(k) − f(similarity(k))\| / 6` |

So `compositeError ≡ 0.40 × rewardPredictionError`, exactly (verified to 1e-12). And `rewardPredictionError` is the disagreement between two internal memory stores read at the same instant. It measures nothing external.

This signal nonetheless drives `effectiveLR`, `dampQ`, `updateTransitionUncertainty`, the epsilon boost, and the emergency-recovery goal override. The system's learning rate is modulated by the mismatch between its reward table and its embedding table.

## 23. Planning — **CODE EXISTS BUT NOT ACTUALLY USED**

Two mechanisms, both non-functional:

**(a) The `STEPS` rollout.** `runPrediction` runs 2–6 imagined steps. Only `step === 0` writes `window.lastReasoning`. Steps 1..N-1 produce `thoughtTree` entries that are drawn as lines and deleted after 3 seconds. No planning result influences the action.

**(b) `futureScore` — defect D2.** `planning.js:355–358` calls `dfs(neuron.id, depth)`. `neuron` is a `THREE.Mesh`; `neuron.id` is THREE's global auto-incrementing Object3D id. The intended value is `neuron.userData.id`. Measured (Probe B): `futureScore` returns **0 for 20/20 nodes** as actually called, versus non-zero for 20/20 with the id corrected.

`futureBonus = min(imaginedFuture*4, 20)` is therefore identically 0 for every candidate on every step. The `futureBonus * 1.2` term in `calculateDecisionScore` and the HUD's "Future" readout are both permanently zero.

*(Marked partially UNCLEAR on one point: `createFuturisticNeuron` allocates ~4 Object3Ds per neuron, so the first few neurons' mesh ids may fall inside the 1–20 range and resolve to an unrelated node rather than to `undefined`. Both outcomes are non-functional; the second is worse, because it silently scores the wrong node.)*

## 24. Counterfactual reasoning — **MISSING**

Nothing evaluates "what would have happened if I had chosen differently". `lastDecision.all` stores the top-3 alternatives and prints "low score / penalty high / less optimal" to the console (main.js:3262–3290). That is a post-hoc label on a score comparison, not a counterfactual simulation. No alternative branch is ever rolled forward or compared against the realised outcome.

## 25. Exploration/exploitation — **EXISTS + PARTIAL**

The epsilon schedule is genuinely adaptive: `clamp(0.2 − fatigue*0.002 + predictionErrorBoost + stressEscapeBoost, 0.02, 0.7)` (main.js:2210). The stress-escape term is a real, sensible anti-perseveration mechanism.

But the exploration *action* is discarded (defect D5, §18). The agent computes a random choice and does not take it. What the epsilon branch actually does is skip expectation generation, which reroutes learning into a different branch. Exploration in MiniFlyWire is a learning-path switch, not a behavioural one.

## 26. Metacognition — **PLANNED/DOCUMENTED ONLY**

`executiveController.js` is a serious implementation of competitive arbitration. It is inert:

- The repo's own experiment (`experiments/exec_influence/report.json`, reproduced here) measures **`Q1_influence_delta_60pct_path = 0`** and **`Q1_argmax_flip_rate_60pct = 0`**. `computeExecutiveWeights` returns `{wReward, wSemantic, wConfidence, wUncertainty, wCuriosity, wCost}`; `calculateDecisionScore` reads `executiveWeights?.exploit` and `?.explore` (scoring.js:256–257), both `undefined`, both defaulting to `1.0`.
- The 40% `arbitrate` blend is live but non-discriminative. Measured (Probe E): it changes the argmax in **51/20000 = 0.26%** of decisions, contributing 0.13 of ~20 points of across-candidate range.

`explainArbitration` — the introspection function — has zero call sites.

## 27. Self-monitoring — **PLANNED/DOCUMENTED ONLY**

Extensive: `[DIAG]`, `[STORE CENSUS]`, `[SCHEMA REUSE]`, `[EPISODE ATTEMPT]`, `[rank-change]`, `[normAvgQ]`, `getSchemaDiagnostics`, `_diagCounters`. All of it writes to `console.log` or the HUD. **No monitored quantity feeds back into a decision.** This is instrumentation for a human reader, which is valuable, but it is not self-monitoring in the cognitive sense: the system does not observe itself and change what it does.

## 28. Adaptation — **EXISTS + PARTIAL**

Behavioural states (`fatigue`, `stress`, `confidence`, `curiosity`) do change over time and two of them do change behaviour: fatigue reduces `dynamicDepth`, stress raises epsilon. That is real homeostatic adaptation.

It is partial because `dynamicDepth` modulates a rollout with no downstream effect (§23), and two of the four states enter the decision function with inverted signs (§17).

## 29. Long-term learning — **CODE EXISTS BUT NOT ACTUALLY USED**

`longTermConsolidation.js` implements promotion of recurring edges to stable LTM, and `runConsolidationPass` fires on 5% of ticks (main.js:4814). `getConsolidationScore` does reach the score at ×2.0.

But `reinforcePath`/`weakenPath` — the writers — are called on the epsilon branch (main.js:4018, 4026) and, for `weakenPath`, in `pruneGoalWraparound` on Shift+click (main.js:1220). The consolidation store is therefore fed only by steps where the agent re-executed a stale move, plus a human goal-setting action. `isStableMemory` has zero call sites.

Cross-session persistence works (`setInterval(saveBrain, 5000)`).

## 30. Temporal/state transitions — **EXISTS + WORKING**

`agentLast → agentCurrent → next`, `recentMemory` (6), `thoughtTrail` (6), `timeMemory` timestamps, episode sealing on goal-reach. The temporal bookkeeping is coherent and correct.

One off-by-one worth recording: at the moment `updateQ` is called (main.js:3814), `agentLast` is the position *before* the current one and `agentCurrent` is the current one, while `next` is the *upcoming* move. So the update is `Q[s=agentLast, a=next]` with `s' = agentCurrent` — pairing a past state with a future action. Given defect D1 makes these writes unreadable anyway, this is currently latent rather than active.

---

## Additional defects recorded during the trace

| ID | Location | Description |
|---|---|---|
| D6 | main.js:4502–4519 | `recentMemory.forEach` referencing `episodeRewards`, which is **never declared anywhere**. Harmless only because `recentMemory` was emptied at line 4443, so the callback never runs. If that clear were ever moved, this throws a `ReferenceError` inside `runAgent` — and `runAgentLoop` has no `try`/`catch`, so the agent would stop permanently. |
| D7 | main.js:1604 | `const { score } = analysis` — `analyzeCandidate` returns `clampedScore` (candidateAnalysis.js), not `score`. Silent `undefined`. |
| D8 | main.js:3061–3065 | Q decay reads `rewards.get(qKey)` with a Q-namespace key against a reward-namespace map. Always misses; the "protect manually-trained paths" branch never fires. |
| D9 | `experiments/exec_influence/scoring.real.js` | Drifted from `render/scoring.js` (missing `schemaScore`). The harness validates a stale duplicate. |
| D10 | main.js:466–477 | `episodeRecordNode` and `wmAddNode` have **zero call sites**. `episodicContextEngine`'s working memory is never populated, so `sealCurrentEpisode` seals nothing, the episode vault stays empty, and the `setEpisodeManagerBridge` callback (which requires ≥2 nodes) never fires. |
