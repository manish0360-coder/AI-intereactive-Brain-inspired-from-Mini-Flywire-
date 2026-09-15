# Phase 0 — Falsification Evidence

Six executable probes. Each imports **unmodified repository modules** and drives them with the exact call pattern `main.js` uses. Nothing in the repository was changed; the probes were executed against a scratch copy of the tree.

Probe sources are in `probes/`. To reproduce, copy the repo to a scratch directory and adjust the import paths at the top of each file to point at that copy, then `node probes/<file>`.

Verbatim output is reproduced below.

---

## Probe A — Q-key namespace split (defect D1)

**Hypothesis under test (to be falsified):** *the Q values learned by the autonomous loop influence action selection.*

**Method.** Replicate main.js:3814 (write) and main.js:1500/1689 (read) exactly, using `render/qlearning.js` unmodified.

`probes/probeA_q_key_namespace.mjs` →

```
Q table after one autonomous learning update: [ [ '5#16->6', 1.2000000000000002 ] ]
getQ(currentKey,k) used by decision scoring -> 0
READ KEY  : "5->6"
WRITE KEY : "5#16->6"
MATCH?    : false

After 500 autonomous Q updates: 275 Q entries written, 0 visible to
calculateDecisionScore's getQ(pos,action).

episodeManager-style write -> [ [ '5->6', 1.5 ] ] | scoring read getQ(5,6) = 1.5

dampQ(agentLast,next) targets bare key. before/after:
  "5->6"    2.25 -> 2.1374999999999997
  "5#16->6" 0.5 -> 0.5
```

**Result: HYPOTHESIS FALSIFIED.** Zero of 275 RL-written Q entries are readable by the decision function. The only readable Q values come from `episodeManager` (human teaching / replay). `dampQ` decrements the teaching-derived value and leaves the RL-derived value untouched — so the RL loop's net effect on the decision is to *erode* the supervised signal.

Note this holds for every goal state including `goalNeuronId === null`, because `makeStateKey` then produces `"5#0"`, still ≠ `"5"`.

---

## Probe B — `futureScore` id bug (defect D2)

**Hypothesis under test:** *the look-ahead planning term contributes to candidate scoring.*

**Method.** Build the real 20-node graph from `neurons.json` + `connections.json`, give nodes a THREE-style auto-incrementing `.id` distinct from `userData.id` (as `createFuturisticNeuron` does), seed the reward tables, and call `futureScore` exactly as main.js:1735 does.

`probes/probeB_futurescore_id.mjs` →

```
neuron passed to futureScore: THREE .id = 1004  | .userData.id = 5
futureScore(neuron, goal=16, depth=3)  = 0
same call with id = userData.id        = 13.419196684605872

futureScore != 0 for 0/20 nodes as actually called from main.js
futureScore != 0 for 20/20 nodes if the id bug were fixed
```

**Result: HYPOTHESIS FALSIFIED.** `planning.js:357` passes `neuron.id` (THREE's `Object3D` counter) where `neuron.userData.id` is required. `futureBonus` is identically 0 for every candidate on every step, so the `futureBonus * 1.2` term in `calculateDecisionScore` and the HUD "Future" readout are permanently zero.

**Caveat (honest).** `createFuturisticNeuron` allocates ~4 `Object3D`s per neuron on top of scene/camera/group/stars, so the earliest neurons' mesh ids may land inside the 1–20 range and resolve to an *unrelated* node instead of `undefined`. I could not settle which without a browser run. Both outcomes are non-functional; the second is strictly worse, because it silently evaluates look-ahead from the wrong node.

---

## Probe C — Sign inversions in `calculateDecisionScore` (defect D3)

**Hypothesis under test:** *terms named "penalty" reduce a candidate's score.*

**Method.** Numerical partial derivative of the unmodified `render/scoring.js` `calculateDecisionScore` about a zero baseline (which also zeroes the stochastic `drift` term).

`probes/probeC_score_signs.mjs` →

```
baseline finalWeight = 0.0000

name                        d(score)/d(input)  sign  INTENT  VERDICT
transitionBoost                  2.8750     +       +     ok
qValue                           4.8500     +       +     ok
reward                           0.5973     +       +     ok
habitBoost                       1.9000     +       +     ok
curiosityBoost                   2.0000     +       +     ok
chainReward                      3.7000     +       +     ok
meaningBoost                     0.3500     +       +     ok
futureBonus                      1.2000     +       +     ok
boredomPenalty                   2.0000     +       -     *** INVERTED ***
repetitionPenalty              -14.1421     -       -     ok
localConfidence                  1.5000     +       +     ok
localStress                     -1.4000     -       -     ok
localFatigue                    -1.1000     -       -     ok
localTrust                       1.2000     +       +     ok
localFear                       -2.2000     -       -     ok
confidenceState                  0.1750     +       +     ok
stressState                      0.5750     +       -     *** INVERTED ***
fatigueState                    -0.1250     -       -     ok
dangerPenalty                    2.0000     +       -     *** INVERTED ***
selfLoopPenalty                 -1.0000     -       -     ok
goalGradientBoost                2.0000     +       +     ok
schemaBonus                     15.0000     +       +     ok
trajectoryIntegrity             40.0000     +       +     ok
semanticVitalityScore            1.2000     +       +     ok
noiseSuppressedScore             1.0000     +       +     ok
consolidationBonus               2.0000     +       +     ok
attentionAmplifiedScore          0.4000     +       +     ok
bayesianTrust                   12.0000     +       +     ok
```

`probes/probeC2_drive_and_magnitudes.mjs` →

```
E[d(score)/d(curiosityState)] = -0.8002  (intended: + for exploration)
hunger drive effect on a reward=8 candidate: -1.9921 (intended: amplify reward-seeking, i.e. +)
boredom drive effect: 0.1200

realistic candidate score = 96.40
term contributions:
   trajectoryIntegrity*40           24.00
   transitionBoost*3                16.44
   qValue*5                         15.00
   habitBoost*2                     13.18
   attnAmplified*0.4                8.00
   dangerPenalty*2 (WRONG SIGN)     6.00
   stressState*0.4 (WRONG SIGN)     4.80
   boredomPenalty*2 (WRONG SIGN)    4.80
   tanh(reward*.1)*8                4.30
   trustBonus*1.5                   2.40
   schemaBonus*15                   0.00
   goalGradient*2                   0.00
```

**Result: HYPOTHESIS FALSIFIED for `boredomPenalty` and `dangerPenalty`.** Both *increase* the score. `stressState` and `curiosityState` are also inverted relative to their documented roles, and `dominantDrive="hunger"` *reduces* the score of a high-reward candidate by 1.99 — the opposite of the stated "amplify reward-seeking".

**Root cause.** `scoring.js:279–368` is one 90-line chained `+`/`-` expression. The alternation drifts after `localFear * 2.2 -`, so `driveRewardBoost` is subtracted and `boredomPenalty`, `stressState`, `dangerPenalty` are added.

**Behavioural consequence.** `dangerPenalty = penalty × 1.5` and enters at ×2. A path with `penalties = 5` gains **+15 points** for being dangerous. Since the admission gate only rejects `penalties > 10` (main.js:1491) and the penalty cap is 5–8, the system has a live gradient toward previously-punished paths. In the realistic candidate above, the three inverted terms contribute **15.6 of 96.4 points (16%)** in the wrong direction.

---

## Probe D — Prediction error is tautological (defect D4)

**Hypothesis under test:** *`compositeError` measures a mismatch between prediction and outcome.*

**Method.** Drive `render/predictionError.js` with the exact main.js sequence: `generateExpectation` from `window.lastReasoning` (main.js:2843–2887), then `evaluatePredictionError` from the same `window.lastReasoning` (main.js:3782–3789), with `rewardSignal` computed by main.js:3707–3743.

`probes/probeD_prediction_error.mjs` →

```
step | statePE | semanticPE | goalPE | rewardPE | composite
5->6  |  0.000  |   0.000    | 0.000  |  0.950   | 0.380
6->8  |  0.000  |   0.000    | 0.000  |  0.450   | 0.180
8->9  |  0.000  |   0.000    | 0.000  |  0.067   | 0.027
9->11  |  0.000  |   0.000    | 0.000  |  0.067   | 0.027
5->6  |  0.000  |   0.000    | 0.000  |  0.950   | 0.380

statePredictionError is 0 in every step; semanticPE 0; goalPE 0.
compositeError == 0.40 * rewardPredictionError exactly: true

rewardPredictionError = |rewards.get(from->to) - f(similarity(from,to))| / 6
  -> both operands are read from internal memory at the same instant;
     neither is an observation of an outcome.
```

**Result: HYPOTHESIS FALSIFIED.** Three of the four error components are structurally zero:

- `statePredictionError`: predicted `= window.lastReasoning.to`; actual `= window.lastReasoning.to`. Identical by construction.
- `semanticPredictionError`: both sides call `similarity(from, to)` on the same unchanged embedding vectors.
- `goalPredictionError`: both sides evaluate `to === goalNeuronId`.

So `compositeError ≡ 0.40 × rewardPredictionError` (exact to 1e-12), and `rewardPredictionError` is the disagreement between the `rewards` table and a threshold function of the `embeddings` table, both read at the same instant.

This signal drives `effectiveLR`, `dampQ`, `updateTransitionUncertainty`, `applyPredictionErrorToBehavior`, the epsilon boost, and the emergency-recovery goal override. The system's learning rate is modulated by how far its reward table has drifted from its embedding table.

---

## Probe E — Executive arbitration influence (defect D6)

**Hypothesis under test:** *the executive controller influences which action is selected.*

**Method 1 — the repository's own experiment, re-run from a scratch copy.**

```
$ node experiments/exec_influence/run.js
{
  "experiment": "M1 / executive-influence",
  "seed": 12345, "trials": 400, "candidatesPerDecision": 4,
  "metrics": {
    "Q1_influence_delta_60pct_path": 0,
    "Q1_argmax_flip_rate_60pct": 0,
    "Q2_capability_delta_60pct_correctShape": 8.064138,
    "Q3_influence_delta_40pct_arbitrate": 0.486548
  },
  "conclusion": {
    "sixtyPercentPathInert": true,
    "codePathIsCapableWhenWiredCorrectly": true,
    "fortyPercentPathLive": true,
    "verdict": "CONFIRMED: executive controller has ZERO influence on the 60% scoring
               path due to a field-name mismatch ({exploit,explore} expected,
               {wReward,...} supplied). The 40% arbitrate path is live."
  }
}
```

Reproduced exactly, including every metric digit. Confirmed by inspection: `computeExecutiveWeights` (motivationalState.js) returns `{wReward, wSemantic, wConfidence, wUncertainty, wCuriosity, wCost}`; `calculateDecisionScore` reads `executiveWeights?.exploit ?? 1.0` and `?.explore ?? 1.0` (scoring.js:256–257).

**Method 2 — does the live 40% path change the *decision*?** The repo measures mean |Δscore| but not argmax flips for the blended value. `probes/probeE_arbitration_influence.mjs` replicates main.js:2107–2143 exactly over 20,000 four-candidate decisions:

```
argmax changed by the 40% arbitrate blend: 51/20000 = 0.26%
mean spread of calculateDecisionScore across 4 candidates: 32.97
mean spread of arbitrate() competitiveScore across same 4: 0.32
→ arbitrate contributes 0.4 x 0.32 = 0.13 of discriminative range
  vs 0.6 x 32.97 = 19.78
```

**Result: HYPOTHESIS FALSIFIED.** The 60% path ignores the executive controller entirely (0 influence, 0 flips — the repo's own measurement). The 40% path is live but non-discriminative: `arbitrate` returns a weighted average of sigmoid-normalised pressures, which is nearly constant across candidates, so it acts as an offset rather than a selector. It changes the chosen action in 0.26% of decisions and supplies 0.65% of the discriminative range.

**Credit where due:** this experiment was built by the project, and it is methodologically sound — seeded RNG, matched arms, a capability control (Q2) that proves the code path *would* work if wired correctly, and persisted telemetry. It is the model the other 29 components need.

**One caution:** `experiments/exec_influence/scoring.real.js` has drifted from `render/scoring.js` (29 diff lines; the live file has a `schemaScore` field the copy lacks). A harness that validates a stale duplicate will eventually certify behaviour the product does not have.

---

## Non-executable findings, established by trace

These could not be settled numerically without a browser, but are settled by reading the execution path.

**F1 — Multi-step look-ahead is discarded.** `runPrediction` runs `STEPS` (2–6) imagined steps. Only `step === 0` writes `window.lastReasoning` (main.js:2491). Steps 1..N−1 push into `thoughtTree`, which is rendered as `THREE.Line` objects and removed after 3 s (main.js:2804). No planning result reaches action selection, memory, or learning. The rollout's only functional effect is `regulateBiology({mentalLoad: STEPS})` — it makes the agent tired.

**F2 — Epsilon exploration is a no-op with side effects.** main.js:2222–2229 selects a random candidate, assigns it to the local `currentKey`, and `return`s from `runPrediction`. `window.lastReasoning` is not written, so `runAgent` re-executes the *previous* action. The random choice is discarded. Its real effect is to skip `generateExpectation`, which makes `evaluatePredictionError` return `null` (predictionError.js:135) and reroutes `runAgent` into its `else` branch.

**F3 — Seven subsystems are fed only by the epsilon branch.** Verified writer line numbers for `semanticMemoryLayer`, `longTermConsolidation`, `cognitiveAttention`, `activationCompetition`, `uncertaintyEngine`, `semanticVitality`, and `motivationalState.recordOutcome`:

```
recordSemanticEdge        4008          reinforcePath             4018
weakenPath                1220, 4026    updateAttentionFocus      4031
strengthenAttention       4035          weakenAttention           4037
boostActivation           4041, 4455    updateUncertainty         4056
activateSemanticVitality  4069          penalizeSemanticPath      4076
recordOutcome             4087
```

The `else` branch spans main.js:3981–4095 and executes exclusively when `predError === null` — i.e. exclusively on steps where the decision system was bypassed and a stale action was re-executed. Every writer above falls inside it, with two exceptions, both also outside the autonomous decision loop: `weakenPath` at 1220 sits in `pruneGoalWraparound` (fires on Shift+click), and `boostActivation` at 4455 sits in the goal-reached block (which requires a human-set goal). Nothing reads `activationCompetition` at all, so the latter is moot.

**F4 — The action taken and the action explained come from different candidate sets.** `bestChoice`/`lastDecision` are fixed at main.js:2236 from `sorted`. Two further `forEach` blocks (2276–2348) then push additional candidates into the same array with raw cosine-similarity weights (≈[−1,1]) alongside `arbitratedScore` weights (≈[−400,400]). `nextKey` comes from the softmax over the merged array.

**F5 — The softmax is degenerate.** With a ~400× scale gap, `exp(w − maxW)` underflows to 0 for every semantic candidate whenever a scored candidate exists. `topProb ≈ 1.0`, so `confidence > 0.7`, so `topChoices = choices.slice(0,1)` on essentially every step. The three-way confidence branch (main.js:2380–2386) has one reachable arm.

**F6 — Working memory is never populated.** `episodeRecordNode` and `wmAddNode` (episodicContextEngine.js:277, 124) have **zero call sites** anywhere in the repository outside their own file. `sealCurrentEpisode` therefore seals an empty buffer, the episode vault stays at size 0, and the `setEpisodeManagerBridge` callback (main.js:887, which requires `nodes.length >= 2`) never fires.

**F7 — `activationCompetition` and `momentumMemory` are write-only.** `boostActivation`/`decayActivations` and `learnMomentum` are called; `getActivation`, `getCompetitionScore`, `getTopActiveNeurons`, `isContextEligible`, `computeLateralInhibition`, and `getMomentumBonus` have zero call sites.

**F8 — Beliefs are computed and deleted.** `getProceduralUncertainty` returns `{confidence, uncertainty, volatility, evidenceMass}` from real Beta posteriors and is spread into `calculateDecisionScore` at main.js:2040. None of those four names appear in the function's signature; all land in `...rest` (scoring.js:126). `uncertaintyState`, `transitionUncertainty`, and `sequenceError` are declared under the comment *"Additional params (accepted, unused)"* (scoring.js:120–125).

**F9 — Twelve computed quantities never reach the decision.** `attention`, `signal`, `timeScore`, `goalBoost`, `focus`, `chainBoost`, `confidenceBoost`, `uncertaintyState`, `transitionUncertainty`, `sequenceError`, the four Beta fields, and `score`. `score` is worse than unused: `analyzeCandidate` returns `clampedScore`, so `const { score } = analysis` (main.js:1604) binds `undefined`.

**F10 — The episodic layer requires a human.** `episodicStore` is written by `recordManualClick` (click handler) and `recordAutonomousSuccess`, which fires only when `current === goalNeuronId`. `goalNeuronId` initialises to `null` (main.js:1005) and is set only by Shift+click. On a fresh install, pressing SPACE runs the agent with no goal, so no episodes are stored, `adjacencyMemory` stays empty, `computeTrajectoryIntegrity` early-exits at main.js:955, and `rebuildSchemas` finds no motifs. **The three highest-weighted terms in the decision function (`trajectoryIntegrity×40`, `schemaBonus×15`, `goalGradientBoost×2`) are all identically zero until a human teaches the system by hand.**

**F11 — `episodeRewards` is never declared.** main.js:4504 and 4506 reference it inside a `recentMemory.forEach`. This does not throw only because `recentMemory` was emptied at main.js:4443, so the callback never runs. `runAgentLoop` has no `try`/`catch`, so if that clear ever moved, the `ReferenceError` would skip the `setTimeout` at main.js:4872 and stop the agent permanently.

**F12 — Q decay reads the wrong namespace.** main.js:3061–3065 does `rewards.get(key)` where `key` is a Q key (`"5#16->6"`) and `rewards` is keyed `"5->6"`. The lookup always misses, so the "gentler decay for manually-trained paths" branch never fires; everything decays at 0.999.
