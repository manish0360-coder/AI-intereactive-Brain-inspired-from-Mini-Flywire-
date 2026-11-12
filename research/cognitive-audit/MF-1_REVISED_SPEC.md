# MF-1 REVISED SPECIFICATION
## Phase 1.0 — Agent Stabilization · Phase 1.1 — MF-1a (Hidden Transitions Only)

**Status:** DRAFT — awaiting Research Director approval. No implementation. No source file modified. No commit. No push.
**Supersedes:** `MF-1_ENGINEERING_SPECIFICATION.md` (Phase 1 draft, 2026-08-17)
**Incorporates:** Independent Adversarial Review (2026-08-18), Research Director decision MODIFY
**Depends on:** `research/cognitive-audit/` (Phase 0)

**Measurements run while writing this spec** (against unmodified repository modules, in a scratch copy; no repo file touched):

| Probe | Result | Where |
|---|---|---|
| **P5-A** — does transition belief influence the decision? | **No. ∂ = 0.000000000000; 0/20,000 argmax flips.** | §12.1 |
| **P5-B** — coefficient needed to open a channel | `c = 1` (no goal gradient) … `c = 8` (full gradient) — **8× regime dependence** | §12.2 |
| **D3 naive in-place patch** | **Failed: 1 of 5 terms did not flip.** Justifies the mandated term-array refactor | §2.1.1 |
| **D3 impact** | Changes the chosen action in **17.5%** of decisions | §2.1.2 |
| **`stressState` / `fatigueState` are multi-path** | Invalidated my own S1.3 test as originally drafted; corrected | §2.1.1 |
| **`getTransitionUncertainty` mutates on read** | Belief calibration is **currently unmeasurable without perturbing it** | §8.2 |

Everything else in this document is proposal, not evidence, and is marked as such.

---

## 0. What changed and why

The reviewer's central objection is correct and I accept it without reservation:

> *"Measuring belief updates in an agent with a broken utility function is meaningless. The agent might learn a perfect model of the world and still choose badly for reasons that have nothing to do with its beliefs."*

The original MF-1 spec flagged D1 and F2 as blocking (§P.1) but under-weighted **D3**. That was an error of judgement on my part, and it was the reviewer's sharpest catch. An agent whose scoring function rewards danger by +2.0/unit is not a rational actor, and no experiment run on it is interpretable. D3 should have been listed first, not third.

Two further review points I accept fully:

- **Hidden `T` + hidden `R` simultaneously is a dual-credit-assignment confound.** Splitting into MF-1a (hidden transitions, known reward) and MF-1b (hidden reward, deterministic transitions) is straightforwardly better experimental design. My §D.2 argument for coupling reward to the arrival node was an argument about *signal strength*, and I let it override *experimental separability*. Separability wins.
- **`ARM_TEXTBOOK` is essential.** Without it, a positive result cannot distinguish "MiniFlyWire's architecture does something" from "we have rediscovered model-based RL." This was a genuine gap in the original spec.

### One point where I partially disagree, on the record

The review's recommended fix list includes **"P.5 (Signal Swamping): the weights must be re-balanced."** The Director has correctly overruled this in favour of *measure first, and only intervene if the signal is structurally incapable of influencing action*. I want to strengthen that instruction with a finding:

**The problem is not that the transition-belief signal is weak. It is that no channel exists.** `transitionUncertainty` is passed into `calculateDecisionScore` (main.js:2024) and appears in the parameter list under the literal comment *"Additional params (accepted, unused)"* (scoring.js:120–126). Its coefficient is not small — it is absent. Rebalancing weights cannot fix a term that is not in the expression.

This has a consequence the Director should see immediately, because it determines whether MF-1a can run at all — see **§12** and **§0.1** below.

### 0.1 — Escalation: the three-part evidence conjunction has a structural precondition

The approved evidence requirement is the conjunction of:

1. Belief calibration
2. Policy adaptation
3. Performance

Requirement **2 is currently impossible by construction.** For a learned transition belief to change action preference, it must enter the quantity that is argmaxed. It does not. Therefore, on the current code:

- Requirement 1 (calibration) **can** be satisfied — `updateTransitionUncertainty` maintains a real EMA (see §8, with an important caveat).
- Requirement 2 (policy adaptation) is **identically zero** — now measured, not inferred: ∂`finalWeight`/∂`transitionUncertainty` = 0.000000000000, and the argmax changed in **0 of 20,000** decisions when belief was swept across its full range (§12.1).
- Requirement 3 (performance) would consequently be null.

MF-1a would return "belief without policy change," which the Director's own interpretation table reads as *"MiniFlyWire can represent information but cannot use it."* That is a true and publishable finding — but it is already known from Phase 0, and running a full three-arm experiment to rediscover it would be a waste of the experiment.

**Recommendation:** the P.5 diagnostic (§12) is not a side task. It is a **Phase 1.0 gate**. Its outcome determines whether MF-1a is worth running, and if the minimum intervention is approved, that intervention belongs in Phase 1.0 — because it is a *wiring* fix of exactly the same class as D1 (a value is computed, passed, and never read), not a retune.

Director ruling required. See §12.4.

---

# PART I — PHASE 1.0: AGENT STABILIZATION

## 1. Phase 1.0 stabilization specification

**Objective.** Make the agent minimally interpretable *in the existing deterministic environment*. Nothing more.

**Scope.** Three approved repairs (D3, D1, F2), one measurement-instrument addition (§8.2), and one diagnostic (§12). No new cognitive modules. No architectural change. No weight retuning.

**Explicitly out of scope for Phase 1.0:** the environment, hidden dynamics, `env/`, D2 (planning id), D8/F12 (Q-decay namespace), F4 (action/explanation divergence), F5 (degenerate softmax), F6 (working memory unpopulated), F7 (write-only subsystems).

**On D2 specifically:** leave `futureScore` broken. A working look-ahead would give the agent model-based reach that confounds the MF-1a belief comparison. Its brokenness is currently a control, and repairing it now would cost us that control.

### 1.1 Ordering constraint

The three repairs are **not independent** and must land in this order, each with its own gate:

```
D3 (scoring signs)  →  D1 (Q namespace)  →  F2 (epsilon path)
```

- **D3 first.** D1 connects the Q channel to the decision function. Connecting a learning signal to a scorer with inverted penalties would propagate the inversion into the learned policy. Fix the utility function before connecting anything to it.
- **D1 second.** F2's fix changes which learning branch executes (§4.3). Verifying that requires Q writes to already be readable.
- **F2 third**, because it has the largest and least local side effects.

Each repair is verified against its own exit test (§3) before the next begins. A combined "fix all three then test" approach is rejected: it makes attribution of any behavioural change impossible.

---

## 2. Exact D3 / D1 / F2 fixes

### 2.1 — D3: scoring sign inversions

**File:** `render/scoring.js`, the `finalWeight` expression at lines 279–368.
**Change class:** operator signs only. **No coefficient is altered.**

#### The five inverted terms

| Term | Current effective ∂score/∂x | Corrected | Coefficient |
|---|---|---|---|
| `boredomPenalty` | **+2.00** | −2.00 | unchanged (2) |
| `dangerPenalty` | **+2.00** | −2.00 | unchanged (2) |
| `stressState` | **+0.575** | −0.40 direct | unchanged (0.4) |
| `curiosityState` | **−0.80** | +0.80 | unchanged (0.8) |
| `driveRewardBoost` | **−1.00** | +1.00 | unchanged (1) |

*(Measured values from Phase 0 Probe C; `stressState`'s +0.575 includes an indirect path through `dynamicFocus`.)*

#### Why these are corrections, not retuning — the documentary basis

The Director forbade arbitrary retuning. Every sign below is justified by evidence **internal to the same function**, not by desired behaviour:

1. **`lastArbitrationBreakdown` is written by the same author, in the same function, over the same terms, and disagrees with `finalWeight`.** Its `costScore` field (scoring.js:400–406) is composed of `fatigueState*0.35 + stressState*0.4 + boredomPenalty*2 + repetitionPenalty…` — i.e. it classifies `stressState` and `boredomPenalty` as **costs**. `finalWeight` subtracts `fatigueState` but *adds* `stressState` and `boredomPenalty`. The breakdown is internally consistent; `finalWeight` is not. The breakdown is therefore the better evidence of intent.
2. Its `curiosityScore` field (scoring.js:395–398) is `curiosityBoost*2 + curiosityState*0.8 + driveCuriosityBoost` — **positive**. `finalWeight` subtracts `curiosityState`.
3. `driveRewardBoost` is documented at scoring.js:227 as *"hunger → amplify reward-seeking"* and its sibling `driveCuriosityBoost` is added. Subtraction contradicts the comment and the sibling.
4. `dangerPenalty` derives from `penalty * 1.5` (main.js:1758), where `penalties > 10` is a hard candidate-rejection gate (main.js:1491). A quantity used to *reject* a candidate cannot coherently also *promote* it.

**Root cause:** operator-precedence drift in a 90-line chained `+`/`−` expression. The alternation breaks after `localFear * 2.2 -`.

#### Mandated implementation form

The fix must **restructure the expression into an explicit term array**, not patch signs in place:

```js
const terms = [
    ['transitionBoost',  transitionBoost * 3 * exploitW],
    ['qValue',           qValue * 5 * exploitW],
    // …one entry per term, sign carried inside the value…
    ['boredomPenalty',  -boredomPenalty * 2],
    ['dangerPenalty',   -dangerPenalty * 2],
    // …
];
const finalWeight = terms.reduce((s, [, v]) => s + v, 0);
```

Rationale: a 90-line chained expression is how this defect happened, and patching signs inside it leaves the same trap for the next editor. The array form makes every sign locally visible, makes term-level telemetry free (§14.4), and is a pure refactor — the arithmetic is identical. **This is the only structural change permitted in Phase 1.0, and it adds no mechanism.**

#### Known scale consequence (must be measured, not assumed)

D3 changes `finalWeight`'s magnitude. Swings: `boredomPenalty` ±4/unit, `dangerPenalty` ±4/unit, `stressState` ±0.8/unit, `curiosityState` ±1.6/unit. In the Phase 0 realistic candidate, the three inverted penalty terms contributed **+15.6 of 96.4 points**; after the fix they contribute **−15.6**, a 31.2-point swing on a ~96-point score.

Downstream consequences that must be checked, not assumed:
- The 60/40 arbitrate blend: `finalWeight` shrinks, so `arbitrate`'s relative share rises. Re-measure the argmax-flip rate (Phase 0 baseline: 0.26%).
- The `Math.max(-400, Math.min(400, …))` clamp: verify the clamp rate does not rise above the pre-fix rate.
- The softmax over the augmented candidate array (F5): verify `topChoices.length` distribution is unchanged.

Exit test **S1.4** covers these.

#### 2.1.1 — Measured: the in-place sign patch fails, which is why the term-array form is mandated

I attempted the naive fix (edit signs inside the existing chained expression) against a scratch copy and measured the result. **One of the five terms did not change at all, and two "coefficient unchanged" assertions failed.** Verbatim:

```
term                  orig d     fixed d    |same magnitude|
boredomPenalty          2.0000    -2.0000    YES
dangerPenalty           2.0000    -2.0000    YES
stressState             0.5750    -0.2250    NO
curiosityState         -0.7762     0.8170    NO
hunger drive           -1.9921    -1.9921    YES   <- did not flip at all
```

Three distinct lessons, all of which change this specification:

1. **`driveRewardBoost` did not flip.** The source reads `localFear * 2.2 - driveRewardBoost + driveCuriosityBoost +`. Changing the operator before `driveRewardBoost` flips the *following* term instead. This is precisely the failure mode that produced D3 in the first place, and I reproduced it on the first attempt. **This is the empirical justification for mandating the term-array refactor** — in-place sign editing of this expression is demonstrably error-prone, including for someone who has already mapped every term.

2. **`stressState` and `fatigueState` are multi-path.** Each enters `finalWeight` twice — once directly, once through `dynamicFocus`:

   | variable | direct | via `dynamicFocus × 0.25` | total | Phase 0 measured |
   |---|---|---|---|---|
   | `stressState` | +0.400 | −0.25 × (−0.7) = **+0.175** | +0.575 | +0.5750 ✓ |
   | `fatigueState` | −0.350 | −0.25 × (−0.9) = **+0.225** | −0.125 | −0.1250 ✓ |

   Correcting only the direct `stressState` term yields −0.400 + 0.175 = **−0.225**, not −0.575. So \|∂\| is *not* preserved, and S1.3's original wording would have failed a correct fix. **The indirect path via `dynamicFocus` is legitimate and must not be touched** — `dynamicFocus` is a composite "directed capacity" quantity, and stress/fatigue suppressing it is coherent. Only the direct term's sign is wrong.

3. **`curiosityState` is stochastic.** It also feeds `drift = (rng()−0.5) × curiosityState × 0.06`. A single-sample derivative carries that noise (−0.7762 vs the true −0.8002). S1.3 must average over ≥ 20,000 draws or hold the RNG fixed.

**Consequence for the fix.** Only the **direct** term's sign changes for `stressState`; `dynamicFocus` is left alone. Post-fix predicted values, to be asserted exactly:

| term | pre-fix ∂ | post-fix ∂ (predicted) |
|---|---|---|
| `boredomPenalty` | +2.000 | **−2.000** |
| `dangerPenalty` | +2.000 | **−2.000** |
| `stressState` | +0.575 | **−0.225** (= −0.400 direct + 0.175 via `dynamicFocus`) |
| `curiosityState` | −0.800 | **+0.800** (mean over ≥20k draws) |
| `driveRewardBoost` (hunger, reward=8) | −1.992 | **+1.992** |

#### 2.1.2 — Measured: D3 is not cosmetic

Over 20,000 synthetic 4-candidate decisions, comparing pre-fix against the corrected-sign variant:

```
mean score   orig 85.51   fixed 63.98   (shift -21.53)
±400 clamp   orig 0.000%  fixed 0.000%   (not worse)
argmax differs in 17.51% of decisions
```

**D3 changes the chosen action in roughly one decision in six.** Any measurement taken before this repair — including Phase 0's own behavioural characterisation — describes a different agent. This is the quantitative form of the reviewer's objection, and it settles the sequencing question: D3 first, without exception.

*(These figures use synthetic context ranges matched to Phase 0 magnitudes and a deliberately naive patch. The definitive numbers come from S1.4 against the real term-array implementation and real Phase 1.0 telemetry. The order of magnitude is what matters here.)*

---

### 2.2 — D1: Q-learning key namespace mismatch

**Fix direction: unify on the composite key `"pos#goal->action"`.** Reads are brought up to the writes, not the reverse.

#### Why composite, not bare

| Argument | Detail |
|---|---|
| `schemaMemory` already assumes composite | `_motifAvgQ` calls `_sys.getQ(_sys.makeStateKey(nodes[i], goal), action)` (schemaMemory.js:386, 399). Reverting to bare would silently zero the schema value-modulation. |
| Goal-conditioning is a deliberate design decision | The repo's own "STEP 3" notes (main.js:33–38, qlearning.js:16–36) introduce it intentionally. Reverting is a *design* change; fixing the read is a *wiring* change. The Director forbade the former. |
| Forward-compatible | MF-1b and any multi-goal work need goal-conditioned Q. |
| Low verification risk | **With a single fixed goal, composite and bare are isomorphic** (`pos#16` ↔ `pos`). This gives a strong equivalence test — see S2.3. |

#### Complete call-site inventory

**Readers to convert to composite:**

| Location | Current | Becomes |
|---|---|---|
| main.js:1500 | `getQ(currentKey, k)` (candidate gate `< -0.5`) | `getQ(makeStateKey(currentKey, goalNeuronId), k)` |
| main.js:1689 | `getQ(currentKey, k)` (**the qValue that is scored**) | same form |
| main.js:2520, 2537 | HUD / thinking stream | same form |
| main.js:3555 | console + reasoning box | `getQ(makeStateKey(currentNeuron.userData.id, goalNeuronId), nextNeuron.userData.id)` |
| main.js:4054 | `getQ(agentLast, next)` → `updateUncertainty` | `getQ(makeStateKey(agentLast, goalNeuronId), next)` |
| main.js:5141, 5209 | click-handler HUD | same form |
| schemaMemory.js:399 | already composite | **no change** |

**Writers:**

| Location | Current | Becomes |
|---|---|---|
| main.js:3815, 3988 | already composite | **no change** |
| main.js:3858 | `dampQ(agentLast, next, …)` — bare | `dampQ(makeStateKey(agentLast, goalNeuronId), next, …)` |
| episodeManager.js:942 | `{state: from, action: to}` — bare | `{state: sys.makeStateKey(from, episode.activeGoal), action: to, nextState: sys.makeStateKey(to, episode.activeGoal)}` |

**This last one is mandatory and is the part most likely to be missed.** `episodeManager` is currently the *only* writer of readable Q. Converting the readers to composite without converting `episodeManager` would make the teaching-derived Q unreadable — turning a repair into a regression that silently removes the one working learning channel.

**Verified feasible:** `episodeManager` already carries `activeGoal` on every sealed episode (episodeManager.js:325, 761; default `null` at 651). `makeStateKey(pos, null)` yields `"pos#0"` via the `GOAL_NONE` sentinel, so null-goal episodes remain well-formed. `initEpisodeManager` must additionally receive `makeStateKey` in its injected `sys` object (main.js:816–856) — one added line.

**`render/embeddings.js` (lines 193, 194, 287–293)** reads bare Q to gate the semantic learning rate. After unification these return 0, pinning the lr at its floor (`baseLr * 0.3`). Two options:

- **(a) Add `getQAny(pos, action)`** to `qlearning.js` — returns the max Q over all goal suffixes for that `(pos, action)`. ~8 lines, pure read, no behaviour change beyond restoring the pre-fix value. **Recommended.**
- (b) Accept the lr floor. Simpler, but silently changes embedding dynamics — a hidden behaviour change inside a "no behaviour change" phase.

Recommend **(a)**. Requires Director approval as it adds one exported function (a pure accessor, no mechanism).

#### Adjacent defect NOT in scope

**D8/F12** — the Q decay loop (main.js:3061–3065) does `rewards.get(key)` with a *Q-namespace* key against a *reward-namespace* map, so the "gentler decay for taught paths" branch never fires. This is literally the same class of bug and is 2 lines. It is **not** in the approved list. Flagged for explicit Director inclusion or explicit deferral; not included by default. Whichever is chosen, exit test S2.5 records the actual decay rate so it is documented rather than silent.

---

### 2.3 — F2: epsilon / stale-action execution path

**Current behaviour** (main.js:2222–2229): on an epsilon draw, a random candidate is selected, assigned to the *local* `currentKey`, and `runPrediction` **returns**. `window.lastReasoning` is never written. `runAgent` then reads the *previous* step's `lastReasoning` and re-executes the previous action. The random choice is discarded.

**Two defects in one:** exploration does not occur, and a stale action is executed.

#### The fix

Move the epsilon decision to *after* the candidate set is final, so the explored action is drawn from the same pool the greedy action comes from, and let it flow through the normal downstream path.

```js
// BEFORE the `sorted`/softmax block — record intent only, do not act, do not return:
const exploreThisStep = (rng("cognitive") < epsilon && choices.length > 0);

// … existing structureMap / embeddingMap augmentation and softmax run unchanged …

// AT the nextKey assignment (main.js:2448), replacing `topChoices[0].key`:
let nextKey = exploreThisStep
    ? choices[Math.floor(rng("cognitive") * choices.length)].key
    : topChoices[0].key;
```

The early `return` is **deleted**. Everything downstream — `lastDecision`, HUD, `window.lastReasoning`, `thoughtTree`, and critically `generateExpectation` — then executes on every step.

`lastDecision.best` must additionally be set to the explored candidate when `exploreThisStep`, so the recorded explanation matches the action taken. (This does not fix F4 in general — the action/explanation divergence caused by the two-stage candidate list remains, and is out of scope.)

#### 2.3.1 — F2's fix has a large, non-local side effect. This requires a Director ruling.

Removing the early `return` means `generateExpectation` runs every step, so `evaluatePredictionError` never returns `null`, so **the `else` branch at main.js:3981–4095 becomes unreachable.**

Phase 0 finding F3: that branch is the **only** writer for seven subsystems.

| Subsystem | Writer | Currently fed | After F2 fix | Feeds the decision? |
|---|---|---|---|---|
| `semanticMemoryLayer` | `recordSemanticEdge` (4008) | ~20% of steps | **0%** | yes — `noiseSuppressedScore × 1.0` |
| `longTermConsolidation` | `reinforcePath`/`weakenPath` (4018/4026) | ~20% | **0%** | yes — `consolidationBonus × 2.0` |
| `cognitiveAttention` | `updateAttentionFocus` (4031) | ~20% | **0%** | yes — `attentionAmplifiedScore × 0.4` |
| `semanticVitality` | `activateSemanticVitality` (4069) | ~20% | **0%** | yes — `semanticVitalityScore × 1.2` |
| `uncertaintyEngine` | `updateUncertainty` (4056) | ~20% | **0%** | yes — `uncertaintyScore` damping |
| `activationCompetition` | `boostActivation` (4041) | ~20% | **0%** | no — nothing reads it |
| `motivationalState` | `recordOutcome` (4087) | ~20% | **0%** | indirectly, via drives |

**Fixing F2 therefore silently changes five inputs to the decision function.** A Phase 1.0 exit gate asserting "no new cognitive mechanism was added" would be accompanied, unremarked, by *seven mechanisms being removed*.

**Option (i) — accept and document.** Those systems were only ever fed by a broken path; the honest post-fix state is "not fed." Smallest change. But five score terms decay to zero, which is itself an unmeasured change to the utility function during a stabilization phase.

**Option (ii) — hoist the seven writes out of the conditional** so they run every step, as their logic implies (none of them has any dependence on whether an expectation existed). Preserves intent. But raises their update rate 5×, changing their magnitudes.

**Recommendation: (ii), with mandatory before/after measurement (test S3.4).** Rationale: both options change behaviour; only (ii) preserves the designed intent, and (ii)'s change is *measurable and bounded* while (i)'s is a silent removal. But (ii) is strictly speaking neither D3, D1, nor F2 — it is a *consequence* of F2, and the Director should rule rather than have me decide.

**Note on `attentionAmplifiedScore` under either option.** `getAttentionScore` returns `0.5` when no focus is set (cognitiveAttention.js:118), giving `factor = 1 + (0.5−0.5)·strength·2 = 1`, so `applyAttentionAmplification` returns `rawScore` **unchanged**. Since `rawCandidateScore = reward*3 + qValue*2 + noiseSuppressedScore` (main.js:1927), the `× 0.4` term is a **silent duplication**: effective `+reward × 1.2`, `+qValue × 0.8`, `+noise × 0.4`. The true effective qValue coefficient is therefore **5.8, not 5**. This matters for §12 — the baseline against which any belief signal must compete is larger than the expression suggests.

---

## 3. Stabilization exit tests

Gate: **every test below must pass before Phase 1.1 begins.** Delivered as `experiments/phase1_0/verify.js`, in the style of the existing `experiments/exec_influence/verify.js` (`ok(name, cond)`; `process.exit(fail ? 1 : 0)`).

### S1 — D3: sensible sign semantics

| ID | Assertion |
|---|---|
| **S1.1** | Numerical ∂`finalWeight`/∂x for all 28 scored inputs. Every term named `*Penalty`, plus `stressState` and `fatigueState`, has ∂ < 0. Every term named `*Boost`, `*Bonus`, `*Score`, `reward`, `qValue`, `bayesianTrust`, `curiosityState` has ∂ > 0. This is Phase 0 Probe C re-run as a regression test. |
| **S1.2** | `dominantDrive:"hunger"` **increases** the score of a high-reward candidate; `"boredom"` increases a high-curiosity candidate. |
| **S1.3** | **Anti-retuning test — corrected form, see §2.1.1.** For *single-path* terms, assert \|∂\| equals the Phase 0 measured value to 1e-9. For the three *multi-path* terms (`stressState`, `fatigueState`, `curiosityState`) assert instead that the **literal coefficient in the term array** matches the pre-fix literal by source comparison, and that the measured ∂ equals the analytically predicted direct+indirect sum. `curiosityState` must be averaged over ≥ 20,000 draws to integrate out `drift`. Non-negotiable. |
| **S1.4** | Scale-consequence audit: over 20,000 synthetic 4-candidate decisions, report and record (a) arbitrate argmax-flip rate (Phase 0 baseline 0.26%), (b) ±400 clamp rate, (c) `topChoices.length` distribution. Fail if the clamp rate exceeds the pre-fix rate. |
| **S1.5** | Behavioural: an agent with a taught high-reward path and an accumulated `penalties` entry on an alternative must prefer the taught path. Pre-fix this may fail; post-fix it must pass. |

### S2 — D1: Q writes are readable by decision selection

| ID | Assertion |
|---|---|
| **S2.1** | Phase 0 Probe A inverted: after 500 autonomous `updateQ` calls, the number of entries readable by the scoring-path `getQ(…)` equals the number written (was 0/275). |
| **S2.2** | Round-trip: `updateQ({state: makeStateKey(a,g), action: b, …})` then the exact main.js:1689 read form returns a non-zero value. |
| **S2.3** | **Single-goal isomorphism.** With one fixed goal held constant for a whole run, the composite-key build and a bare-key build produce identical action sequences under the same seed. Proves the namespace change is a pure re-keying, not a behaviour change. |
| **S2.4** | `episodeManager` write/read parity: a taught episode's Q is readable by the scoring path (guards the regression described in §2.2). |
| **S2.5** | Record the realised Q decay rate per key class. Documents D8 whether or not it is fixed. |
| **S2.6** | *(if `getQAny` approved)* `embeddings.trainEmbedding` learning rate matches its pre-fix value for a Q-populated pair. |

### S3 — F2: exploration produces the intended new action

| ID | Assertion |
|---|---|
| **S3.1** | With `epsilon = 1.0` forced, the executed action differs from `topChoices[0].key` on ≥ 95% of steps (where ≥ 2 candidates exist). Pre-fix this is ~0%. |
| **S3.2** | `window.lastReasoning.from === agentCurrent` at every step. Directly falsifies the stale-action path. |
| **S3.3** | Over 2,000 steps, `evaluatePredictionError` returns `null` **zero** times. |
| **S3.4** | **Branch-migration audit (mandatory under either §2.3.1 option).** Record the per-step update counts and the realised magnitudes of `noiseSuppressedScore`, `consolidationBonus`, `attentionAmplifiedScore`, `semanticVitalityScore`, `uncertaintyScore` before and after the fix. The change must be *reported*, and under option (ii) must be within a pre-registered factor of 5× ± 1. **No silent migration.** |
| **S3.5** | With `epsilon = 0.0` forced, the action sequence is identical to the pre-fix build under the same seed. Isolates the fix to the exploration path. |

### S4 — reproducibility

| ID | Assertion |
|---|---|
| **S4.1** | All 24 `Math.random()` sites (12 in `main.js`, 12 under `render/`) are routed through `rng("cognitive")`. Static scan: zero `Math.random(` outside `instrumentation/`. |
| **S4.2** | Same seed + same config ⇒ byte-identical action sequence over 2,000 steps, across 3 independent runs. |
| **S4.3** | Different seed ⇒ different action sequence. |
| **S4.4** | Telemetry on vs off ⇒ identical action sequence (extends existing T4). |
| **S4.5** | Node (headless shim) and browser produce identical sequences at the same seed. |

**§S4 requires the §P.2 exception** from the original spec: routing RNG touches `render/**`. It is mechanical (`Math.random()` → `rng("cognitive")`), adds no mechanism, and without it *no* Phase 1.0 or Phase 1.1 comparison is valid. Approval requested.

### S5 — no new cognitive mechanism was added

| ID | Assertion |
|---|---|
| **S5.1** | Static diff audit: no new file under `render/`. No new export from any existing `render/` module except the approved `getQAny` (§2.2) and `peekTransitionUncertainty` (§8.2). |
| **S5.2** | The set of terms in `calculateDecisionScore` is unchanged in *membership*. Under §12.4, at most one previously-accepted-and-unused parameter becomes read; no new parameter is introduced. |
| **S5.3** | No new state container (`Map`, `Set`, array) is added to any agent-side module. |
| **S5.4** | `git diff --stat` for Phase 1.0 touches only: `render/scoring.js`, `render/qlearning.js`, `render/episodeManager.js`, `render/embeddings.js`, `render/predictionError.js`, `main.js`, `instrumentation/rng.js`, plus `experiments/phase1_0/**`. Any other path fails the gate. |

### S6 — explicit non-claim

**S6.1** — The Phase 1.0 report must contain the sentence, verbatim:

> *Phase 1.0 establishes a minimally interpretable agent in a deterministic, fully-observable environment. It does not demonstrate cognition, learning of world structure, belief, or any capability beyond a repaired heuristic scorer.*

---

# PART II — PHASE 1.1: MF-1a

## 4. MF-1a environment specification

Unchanged from the original MF-1 spec except as noted. Sections A, E, F, G, H, I, K, L of `MF-1_ENGINEERING_SPECIFICATION.md` **carry over intact**. The changes are: reward becomes fixed and public (§6), hidden reward is removed entirely (deferred to MF-1b), and a third arm is added (§5).

### 4.1 Boundary — unchanged

One seam. `MF1.step(intendedTo)` at main.js ~3644, returning the sole observation channel. **Topology public, dynamics private.**

### 4.2 Hidden state — reduced to one item

| | Original MF-1 | **MF-1a** |
|---|---|---|
| Per-directed-edge reliability `P(u,v)` | hidden | **hidden** |
| Per-node reward `μ_v, σ_v` | hidden | **removed — reward is fixed, deterministic, and public (§6)** |
| Environment RNG | hidden | hidden |

MF-1a hides **exactly one thing**. This is what makes the credit assignment unambiguous.

### 4.3 Observation returned

```js
{ tickId, from, intendedTo, arrivedAt, slipped, reward, terminal }   // frozen, all primitives
```

`reward` is now a *deterministic public function* of `arrivedAt` (§6), so it carries no hidden information. It is retained in the outcome for uniformity with MF-1b and because the agent must still observe *which* reward it got — that depends on `arrivedAt`, which is stochastic. **The stochasticity of reward-received is entirely inherited from the stochasticity of arrival.** That is the single channel under test.

---

## 5. Three-arm experimental design

All arms: same environment instance, same seed, same graph, same fixed public reward, same step budget, same episode-reset rule, same ε schedule.

### ARM_FROZEN — naive-transition control

MiniFlyWire, stabilized, acting in the stochastic world but holding the belief `T(s,a) = a`.

```js
const learningState = MF1.beliefFrozen ? outcome.intendedTo : outcome.arrivedAt;
```

- Physical position always advances to `outcome.arrivedAt` — the world ignores beliefs.
- All *learning* writes (`updateQ.nextState`, `updateTransitionUncertainty`, `evaluatePredictionError.actualNextId`) use `learningState`.
- Reward learning identical to ARM_MINIFLYWIRE (and trivial, since reward is public).

`statePredictionError` is structurally 0 in this arm — a free internal consistency check.

### ARM_MINIFLYWIRE — experimental

Identical, `beliefFrozen = false`. Learning writes use `outcome.arrivedAt`. Transition belief updates and (subject to §12.4) is read by the decision function.

### ARM_TEXTBOOK — external baseline

A conventional certainty-equivalent model-based RL agent with **none** of MiniFlyWire's machinery. New file `benchmarks/baselines/tabularMBRL.js`, ~80 LOC.

```
counts     N(s,a,s')                       initialised 0
model      T̂(s'|s,a) = N(s,a,s') / Σ_s'' N(s,a,s'')      (uniform prior until first visit)
reward     R(s') — READ DIRECTLY from env.rewardFunction(); not learned
value      Q(s,a) = Σ_s' T̂(s'|s,a) · [ R(s') + γ · max_a' Q(s',a') ]
solver     prioritised sweeping, priority = |ΔQ|, queue cap 200, θ = 1e-4
policy     ε-greedy over Q
```

**Fairness constraints (all mandatory, all tested):**

| Constraint | Rule |
|---|---|
| Action space | `env.actionsFrom(s)` — byte-identical to MiniFlyWire's graph neighbours |
| Reward knowledge | Both arms receive the identical public reward function at t=0 |
| ε | Matched to ARM_MINIFLYWIRE's *realised mean* ε, measured in a pilot run. Report an ε-sensitivity sweep (0.05 / 0.10 / 0.20) so parity claims are not an artifact of one ε. |
| γ | 0.9, matching main.js:3820 |
| Budget | Identical step count and identical episode-reset rule |
| Environment | Same instance, same seed — all three arms face the same world (guaranteed by the `envStructure`/`envSample` split, §15.2) |

**Purpose, stated plainly.** ARM_TEXTBOOK is not there to be beaten. It is there so that a positive `MINIFLYWIRE > FROZEN` result cannot be reported as novel if it is merely model-based RL. Per the Director's interpretation table, **parity with TEXTBOOK is an acceptable and honest outcome.**

---

## 6. Fixed-known reward design

**Reward is deterministic, public, and identical for all three arms.**

```js
R(v) = (v === config.goalNode) ? 10 : 0          // deterministic, no noise
```

Exposed as a public environment method:

```js
env.rewardFunction(): Readonly<Record<number, number>>   // complete, from t=0
```

### 6.1 Removing reward learning as a variable

To eliminate reward *learning* as a confound, at `env.reset()` the harness pre-seeds every arm's reward knowledge from `env.rewardFunction()`:

- **ARM_TEXTBOOK** reads `R` directly in its Bellman backup.
- **ARM_FROZEN / ARM_MINIFLYWIRE**: `rewards` is pre-populated so that `rewards.get("u->v") = R(v)` for every directed edge, identically in both arms, before step 0.

All three arms therefore begin with **complete and correct reward knowledge**. Any performance difference is attributable to transition belief and nothing else. This is the operational meaning of "reward fixed and known."

### 6.2 Expectation alignment (required for §8 to work)

`generateExpectation` must set `predictedReward = R(intendedTo)`. Then:

- **On success:** `statePE = 0`, `rewardPE = 0`, `semanticPE = 0`, `goalPE = 0` ⇒ `compositeError = 0`.
- **On slip:** `statePE = 1.0`; `rewardPE = |R(intendedTo) − R(arrivedAt)| / 6`; `semanticPE = |sim(u,intended) − sim(u,arrived)| / 2`; `goalPE` non-zero if either is the goal.

`compositeError` is therefore **zero on success and strictly positive on slip** — monotone in the per-edge failure rate. This is the property §8's calibration metric depends on, and it only holds if `predictedReward` is aligned as specified. Test **E-CAL-0**.

### 6.3 Scale

The `[-2, 12]` clamp from the original §D.3 is retained: five downstream consumers hard-code that range, most explicitly `(rewardSignal + 2) / 14.0` at main.js:3903. `R ∈ {0, 10}` sits inside it. Unchanged.

---

## 7. Hidden transition design

Carried over from the original spec §C, unchanged.

**Construction** (once, from `envStructure`, over a deterministically sorted directed-edge list):

```
for each directed edge (u,v):                       // 39 undirected → 78 directed
    isUnreliable = envStructureRng() < unreliableFraction     // 0.35
    p(u,v)       = uniform(isUnreliable ? [0.45,0.60] : [0.90,0.98])
```

**Runtime:**

```
step(intendedTo):
    if intendedTo ∉ neighbours(u): throw MF1IllegalAction
    if envSampleRng() < P(u,intendedTo):  arrivedAt = intendedTo
    else:                                 arrivedAt = uniform(neighbours(u) \ {intendedTo})
```

One `envSample` draw on success, two on a slip. Every node has degree ≥ 3 (verified), so a slip target always exists.

### 7.1 The trade-off structure is a correctness requirement, not a parameter

The reviewer's §4 is right: the minimum viable environment is not about node count, it is about **the structure of the choice**. Homogeneous reliability leaves the optimal policy unchanged, so belief has zero decision value and *all three arms would tie by construction*.

**Mandatory constructive constraint.** After construction, the environment must verify — analytically, at config load, not at analysis time — that there exists a designated **fork node** `f` with two routes to the goal:

- `route_short`: fewer hops, product of reliabilities **low**
- `route_long`: more hops, product of reliabilities **high**
- such that `E[steps | route_long] < E[steps | route_short]` by a pre-registered margin (≥ 20%)

If the seed's draw does not produce such a fork, the environment **rejects the seed** and the harness advances to the next. Rejected seeds are logged. This makes the trade-off a *verified property of every run*, not a hope.

`f`, `route_short`, and `route_long` are recorded in the manifest and are the anchor for the policy-adaptation metric (§9).

---

## 8. Belief calibration metric (Requirement 1)

### 8.1 Definition

**M-CAL** = Spearman rank correlation ρ between the agent's internal per-edge transition uncertainty and the ground-truth failure probability:

```
x_e = peekTransitionUncertainty(u, v)      for directed edge e = (u,v)
y_e = 1 − p(u,v)                           from the oracle
M-CAL = spearman(x, y)  over  E_k = { e : visits(e) ≥ k },  k = 10 (pre-registered)
```

**Spearman, not Pearson**, because `updateTransitionUncertainty` is an EMA of `compositeError` — a *monotone but non-linear and compressed* function of the failure rate (§6.2). Rank correlation is the correct statistic; Pearson would understate a real effect.

- Bootstrap 95% CI across seeds.
- Permutation null: shuffle `y` within `E_k`, 10,000 draws.
- Reported for all three arms. **Prediction: ARM_FROZEN ≈ 0** (it never observes `arrivedAt`, so it never accumulates transition error) — a built-in negative control.
- ARM_TEXTBOOK's analogue: ρ between `1 − T̂(intendedTo | s,a)` and `1 − p`. This tells us how well a textbook estimator does on the same data, which is the honest reference point.

### 8.2 — BLOCKING INSTRUMENT DEFECT: `getTransitionUncertainty` is a mutating getter

This was not caught in Phase 0 and it invalidates M-CAL as currently measurable.

```js
export function getTransitionUncertainty(fromId, toId) {          // predictionError.js:529
    const raw     = transitionUncertaintyMap.get(key) || 0;
    const decayed = raw * TRANSITION_UNCERTAINTY_DECAY;           // 0.998
    if (decayed < 0.005) { transitionUncertaintyMap.delete(key); return 0; }
    transitionUncertaintyMap.set(key, decayed);                   // ← WRITES ON READ
    return decayed;
}
```

**Three consequences:**

1. **Reading the belief changes the belief.** A calibration probe that reads all 78 edges decays all 78. The act of measuring M-CAL destroys the quantity being measured. This alone makes Requirement 1 unmeasurable.
2. **Decay rate is coupled to node degree.** The getter is called once per candidate per step (main.js:2024) plus once per step in the console log (main.js:3977). A degree-6 node decays its edge beliefs ~7×/step; a degree-3 node ~4×/step — while both update only once per step (LR 0.12). Approximate steady-state suppression: **≈0.93 × signal at degree 3, ≈0.89 at degree 6.** A ~4–5% degree-dependent bias.
3. **Double decay.** `decayTransitionUncertainties()` (0.995) also runs once per `runAgentLoop` tick (main.js:4778), on top of the per-read decay.

**Required fix — measurement instrument only:**

```js
// predictionError.js — ADD. Pure. No mutation. Not called by any agent path.
export function peekTransitionUncertainty(fromId, toId) {
    return transitionUncertaintyMap.get(String(fromId) + "->" + String(toId)) || 0;
}
```

~4 lines, strictly additive, **zero effect on agent behaviour** (test S5.2 confirms no agent-side call site). This is an instrument fix, not an agent fix, and therefore does not violate the "repair only D3/D1/F2" constraint.

**Consequence 2 is a separate question and I am NOT proposing to fix it.** The degree-dependent decay is agent behaviour. It biases M-CAL by an estimated 4–5%, monotone in degree; since edge reliability is drawn i.i.d. and independent of degree, it should add noise rather than spurious correlation. **Required mitigation:** report M-CAL both raw and stratified by node degree (test E-CAL-3). If the two disagree materially, that is a finding to report, not a defect to fix mid-experiment.

---

## 9. Policy adaptation metric (Requirement 2)

Performance is not evidence of belief use. Two independent measures, both pre-registered.

### 9.1 M-POL-1 — preference reversal at the designated fork

Using the fork `f` guaranteed by §7.1:

```
π_reliable(t) = P( agent selects the route_long branch at node f )   in window t
```

Fit a logistic trend on cumulative visits to `f`.

- **Prediction (ARM_MINIFLYWIRE):** slope > 0, 95% CI excluding 0.
- **Prediction (ARM_FROZEN):** slope ≈ 0. Structural negative control — it cannot represent the difference.
- **Prediction (ARM_TEXTBOOK):** slope > 0. Reference for what a correct estimator achieves on the same evidence.

### 9.2 M-POL-2 — within-agent score causality

From per-candidate decision telemetry (§14.4), for each `(s,a)` with ≥ 10 observations, regress:

```
Δ score(s,a)  on  Δ peekTransitionUncertainty(s,a)     [other terms held as covariates]
```

**Prediction if belief is used:** coefficient < 0, CI excluding 0.
**Prediction under the current scoring function:** **exactly 0** — see §12. This is the direct test of whether the belief→decision channel exists at all, and it is the reason §12 must be resolved before MF-1a runs.

### 9.3 Disambiguation rule (pre-registered)

| M-POL-1 | M-POL-2 | Reading |
|---|---|---|
| > 0 | > 0 | Belief influences policy through the scoring function. The claimed mechanism. |
| > 0 | = 0 | Policy changed **but not via transition belief**. Another mechanism is responsible — most likely `dampQ` acting on Q through prediction error. **Must be investigated and attributed before any belief claim.** |
| = 0 | = 0 | No policy adaptation. Requirement 2 fails. |
| = 0 | > 0 | Scores moved but choice did not — the signal is real but sub-threshold against competing terms. Report as *"representable, sub-decisional."* |

The second row is the trap the Director's instruction anticipates. `dampQ` reduces Q on high prediction error (main.js:3856–3864), which *would* change policy without any transition-belief term being read. **A positive M-POL-1 with zero M-POL-2 must be reported as `dampQ`, not as belief.**

---

## 10. Performance metrics (Requirement 3)

| ID | Metric | Definition |
|---|---|---|
| **M-PERF-1** *(primary)* | Steps to goal | Mean steps from episode start to `terminal`, over the last 50% of episodes |
| **M-PERF-2** | Reward per step | Total reward / steps |
| **M-PERF-3** | Realised slip rate | Fraction of executed actions with `slipped === true`. Direct behavioural signature of reliability avoidance. |
| **M-PERF-4** | Regret | Excess steps vs the optimal policy under the true `P` (computable — the oracle has `P`) |

**M-PERF-4 is the most informative** and is only available because the environment is small enough to solve exactly. It converts "did it improve" into "how much of the achievable improvement did it capture," which is what makes the TEXTBOOK comparison quantitative rather than ordinal.

Paired across seeds (each seed = one world, all three arms). Bootstrap 95% CI on paired differences. 30 seeds, ≥ 5,000 steps per arm per seed.

---

## 11. Textbook baseline definition

Specified in §5 (`ARM_TEXTBOOK`). Additional requirements:

- **File:** `benchmarks/baselines/tabularMBRL.js`. Imports **nothing** from `render/`. Enforced by static test.
- **Independence:** must not import `env/mf1Oracle.js`. Learns `T̂` from observation only, exactly like MiniFlyWire.
- **No tuning against the result.** Hyperparameters (γ, queue cap, θ) are fixed before the first MF-1a run and recorded in the manifest. Changing them after seeing results invalidates the comparison.
- **Sanity gate (E-TB-1):** on a *deterministic* environment (`MF1_NULL`), ARM_TEXTBOOK must find the optimal path. If the baseline cannot solve the easy case, it is not a baseline.

---

## 12. P.5 influence diagnostic

Per the Director: measure first; intervene only if the signal is *structurally incapable* of influencing action; report the exact structural reason; pre-register any intervention.

### 12.1 P5-A — structural influence measurement

**Method.** Numerical partial derivative of the real `render/scoring.js` `calculateDecisionScore`, over 20,000 decision contexts sampled from a real Phase 1.0 deterministic run (not synthetic ranges — the reviewer's point about representativeness applies).

```
∂ finalWeight / ∂ transitionUncertainty     sweeping [0, 1]
∂ finalWeight / ∂ sequenceError
∂ finalWeight / ∂ uncertaintyState
∂ finalWeight / ∂ {confidence, uncertainty, volatility, evidenceMass}   (the Beta posterior fields)
```

Plus the decision-level measure: **argmax-flip rate** when transition belief is swept across its full attainable range, holding all else fixed.

**Result — already measured against the unmodified `render/scoring.js`:**

```
d(finalWeight)/d(transitionUncertainty ) = 0.000000000000
d(finalWeight)/d(sequenceError         ) = 0.000000000000
d(finalWeight)/d(uncertaintyState      ) = 0.000000000000
d(finalWeight)/d(confidence            ) = 0.000000000000     <- Beta posterior, via ...rest
d(finalWeight)/d(uncertainty           ) = 0.000000000000     <- Beta posterior, via ...rest
d(finalWeight)/d(volatility            ) = 0.000000000000     <- Beta posterior, via ...rest
d(finalWeight)/d(evidenceMass          ) = 0.000000000000     <- Beta posterior, via ...rest

argmax changed in 0/20000 decisions when transition belief swept 0 -> 1  =  0.0000%

d(finalWeight)/d(uncertaintyScore      ) = -0.241000          <- the ONE uncertainty channel
                                                                 that is read; acts only as
                                                                 uncertaintySemanticDamp on
                                                                 meaningBoost + semanticVitality
```

**P5-A is therefore already answered: NO.** Transition belief cannot change the selected action, at any magnitude, in any context. Not weakly — exactly zero, to floating-point precision, over 20,000 decisions.

*(This is the diagnostic the Director ordered, run early because it gates everything else. The definitive version must re-run against real Phase 1.0 telemetry rather than synthetic contexts; but a derivative that is identically zero cannot become non-zero under a different input distribution, so the conclusion is distribution-independent.)*

**Structural reason (provable by reading, not inference).** `render/scoring.js` lines 120–126:

```js
    // ── Additional params (accepted, unused) ─
    // Prevents "unknown property" warnings when
    // the caller spreads extra context objects.
    uncertaintyState,
    transitionUncertainty,
    sequenceError,
    ...rest
```

`transitionUncertainty` is destructured and never referenced in the `finalWeight` expression. The four Beta-posterior fields from `getProceduralUncertainty` (spread at main.js:2040) fall into `...rest`. **There is no coefficient to rebalance. The channel does not exist.**

### 12.2 P5-B — capability sweep (only if P5-A confirms zero)

If and only if P5-A returns exactly zero, measure what a channel *would* cost:

```
finalWeight' = finalWeight − c · transitionUncertainty · max(qValue, 0)
```

Sweep `c ∈ {0, 0.5, 1, 2, 4, 8, 16}`. For each, report over the same 20,000 real contexts:

- argmax-flip rate vs `c = 0`
- flip rate **stratified by `goalGradientBoost` magnitude** — this is the direct test of the swamping hypothesis
- the term's share of total absolute score mass

**Form rationale.** Multiplying by `qValue` means "discount the learned value of an action by how unreliable that action has proven." That is the textbook certainty-equivalent correction and it is the *minimum* semantically defensible form. An additive `−c · transitionUncertainty` would penalise unreliable edges even where the agent has no value stake, which is a stronger and less defensible claim.

**Note the true competitive baseline.** Because `applyAttentionAmplification` returns `rawScore` unchanged when no attention focus is set (§2.3.1 note), the effective `qValue` coefficient is **5.8, not 5**, and effective `reward` is `tanh(r·0.1)·8 + 1.2r`. Measured delta on a representative context: **+8.800**. P5-B must compete against 5.8, and the report must state this.

#### P5-B — measured sweep (preliminary, synthetic contexts)

20,000 four-candidate decisions per cell, stratified by the goal-gradient regime:

| `c` | flip% @ `goalGradient` 0–100 | flip% @ 0–20 | flip% @ 0 | term share of \|score\| mass (0–20 regime) |
|---|---|---|---|---|
| 0 | 0.00% | 0.05% | 0.04% | 0.00% |
| 0.5 | 0.63% | 1.92% | 2.41% | 0.88% |
| 1 | 1.33% | 3.96% | **5.13%** | 1.77% |
| 2 | 2.58% | **7.89%** | 9.86% | 3.54% |
| 4 | 4.86% | 15.40% | 19.13% | 7.07% |
| 8 | **9.86%** | 28.48% | 34.44% | 14.13% |
| 16 | 18.30% | 44.85% | 51.87% | 28.10% |

**(bold = first `c` meeting the ≥5% pre-registration criterion in that regime)**

Three findings that change §12.4:

1. **The swamping hypothesis is confirmed and quantified.** The coefficient required to reach a 5% flip rate is **`c = 8` under a full-range goal gradient but `c = 1` when the gradient is absent — an 8× difference.** Goal gradient is a genuine swamper, exactly as the reviewer suspected. But it is a *regime-dependent* swamper, not a constant one.

2. **`c` therefore cannot be pre-registered from synthetic data.** The correct value depends on the realised `goalGradientBoost` distribution, which is gated by `trajectoryConfidence` and is zero without episodic evidence (Phase 0 F10). **P5-C is not optional — it is the input that determines `c`.** Any `c` chosen before P5-C would be a guess dressed as a pre-registration.

3. **There is a noise floor.** At `c = 0` the flip rate is 0.04–0.05% in the low-gradient regimes, caused by the stochastic `drift` term (`(rng()−0.5) × curiosityState × 0.06`, scoring.js:166–169). It is 0.00% in the wide-gradient regime, where candidates are far enough apart that drift cannot reorder them. **Any pre-registered flip threshold must exceed this floor**, and the ≥5% criterion does so by two orders of magnitude.

### 12.3 Swamping, measured rather than assumed

`goalGradientBoost × 2.0` reaches 200 points; `qValue × 5.8` reaches ~116. But `goalGradientBoost` is gated by `trajectoryConfidence`, which is 0 without episodic evidence (Phase 0 F10). So the 200-point figure is an upper bound that may rarely be realised.

**P5-C:** from real Phase 1.0 telemetry, report the empirical distribution of `goalGradientBoost` and its share of total score mass. If its realised median is small, the swamping concern is not supported by data and no intervention is warranted on those grounds. **This is the measurement the Director asked for, and it may well dissolve the problem.**

### 12.4 — Director ruling requested

If P5-A confirms zero influence, the minimum pre-registered intervention is:

> **Read the parameter that is already being passed.** Add one term to `calculateDecisionScore`: `− c · transitionUncertainty · max(qValue, 0)`, with `c` fixed *before* the first MF-1a run at the smallest P5-B sweep value achieving ≥ 5% argmax-flip rate **under the goal-gradient distribution actually observed in P5-C**, not under a synthetic one.

Given the measured 8× regime dependence, the procedure is: run Phase 1.0 → collect real `goalGradientBoost` telemetry (P5-C) → re-run the P5-B sweep on those real contexts → read `c` off the curve → record it in the pre-registration document and hash it into the manifest → only then run MF-1a. From the preliminary sweep, `c` will land somewhere in **[1, 8]**; the exact value is an empirical question, not a design choice.

**Arguments that this is a wiring fix, not a retune:**

- `transitionUncertainty` is already computed, already passed, already destructured. Only the read is missing — the identical failure mode as D1 (value written, never readable).
- No existing coefficient changes. S1.3 (anti-retuning) still passes.
- `c` is selected from a pre-registered criterion on Phase 1.0 data, **before any MF-1a data exists**. It cannot be tuned to produce a result.

**Argument against:** it adds a term to the decision function, which is closer to "new mechanism" than D1/D3/F2, and S5.2 must be relaxed to permit exactly one previously-unused parameter to become read.

**My recommendation: approve, with `c` locked in writing before the first MF-1a run.** Without it, Requirement 2 is structurally unsatisfiable and MF-1a can only return the already-known "represents but cannot use" result.

**If the Director declines:** MF-1a should still run, but the hypothesis must be restated in advance as *"MiniFlyWire can form a calibrated transition belief but cannot act on it"* — with M-POL-2 = 0 as a **pre-registered prediction**, not a discovered failure. That is a legitimate and honest experiment. It must not be presented afterwards as a surprise.

---

## 13. Falsification criteria

**Hypothesis H-MF1a.** *MiniFlyWire's architecture forms a calibrated belief about hidden transition reliability and uses that belief to improve its policy.*

Pre-registered before the first run. All three must hold; any one failing falsifies H-MF1a.

| | Criterion | Falsified if |
|---|---|---|
| **1. Calibration** | M-CAL (Spearman ρ, edges with ≥10 visits) | 95% bootstrap CI **includes 0**, or does not exceed the permutation null at α = 0.01 |
| **2. Policy adaptation** | M-POL-1 logistic slope **and** M-POL-2 regression coefficient | Either CI **includes 0**. If M-POL-1 > 0 while M-POL-2 = 0, H-MF1a is **not** supported — attribute to `dampQ` per §9.3 |
| **3. Performance** | Paired (FROZEN − MINIFLYWIRE) on M-PERF-1 | 95% CI **includes 0** |

**Baseline comparison** (interpretation, not falsification — per the Director's table):

| Result | Reading |
|---|---|
| MINIFLYWIRE > FROZEN | The mechanism has causal value |
| MINIFLYWIRE ≈ TEXTBOOK | Capability may simply be standard model-based RL. **Acceptable outcome; must be reported as such.** |
| MINIFLYWIRE > TEXTBOOK | The additional architecture contributes something beyond the standard baseline. **Requires mechanism identification before any claim.** |
| MINIFLYWIRE < TEXTBOOK | The architecture is a net cost on this task. Must be reported. |

**Environment-validity precondition.** A null result is uninterpretable unless the environment gate tests pass. If E-ENV-1 (fork trade-off exists) or E-TB-1 (baseline solves the deterministic case) fail, **no conclusion may be drawn about the agent.** Checked before analysis, not after.

---

## 14. Experimental controls

| # | Control | Purpose |
|---|---|---|
| **C1** | ARM_FROZEN | Lesions exactly the mechanism under test. `statePredictionError` structurally 0 ⇒ free consistency check. |
| **C2** | ARM_TEXTBOOK | Distinguishes "architecture works" from "we rediscovered model-based RL." |
| **C3** | `MF1_NULL` deterministic arm | Instrument calibration. Same binary must read `statePredictionError == 0` and reproduce Phase 0's `compositeError = 0.40 × rewardPE`. **Without C3, a non-zero reading in the stochastic arm is not evidence.** |
| **C4** | Permutation null on M-CAL | Guards against ρ arising from rank-ordering artifacts. |
| **C5** | Shuffled-belief ablation | Randomly permute the belief map across edges once, mid-run. If performance is unaffected, the belief was not being used regardless of M-POL. **Strongest single control on Requirement 2.** |
| **C6** | ε-sensitivity sweep | 0.05 / 0.10 / 0.20 for all arms. Guards against TEXTBOOK parity being an ε artifact. |
| **C7** | Seed-rejection log | §7.1 rejects seeds without a fork. Rejection rate must be reported — a high rate means the config is marginal. |
| **C8** | Persistence disabled | `loadBrain`/`saveBrain` off. `localStorage` across arms is a cross-contamination channel. |
| **C9** | Degree stratification of M-CAL | Quantifies the §8.2 consequence-2 bias. |
| **C10** | Pre-registration document | M-CAL k=10, `c` from §12.4, fork margin ≥ 20%, primary metric M-PERF-1, all fixed in writing before run 1, hash recorded in the manifest. |

---

## 15. Reproducibility requirements

### 15.1 Prerequisites from Phase 1.0

S4.1–S4.5 must pass. Without the RNG routing, no arm comparison is valid.

### 15.2 Stream separation — the methodological keystone

```js
initRng(seed) registers:
  "cognitive"     seed
  "visual"        seed ^ 0x9e3779b9
  "envStructure"  seed ^ 0x85ebca6b     // construction only
  "envSample"     seed ^ 0xc2b2ae35     // runtime only
  "baseline"      seed ^ 0x27d4eb2f     // ARM_TEXTBOOK's ε-greedy — NEW for MF-1a
```

`envStructure` / `envSample` separation is what guarantees **all three arms face the same world** despite consuming different numbers of runtime draws. `baseline` is separate so the textbook arm's exploration cannot perturb the environment or the cognitive stream.

### 15.3 Manifest contents

Per run: `seed`, `configHash`, `arm`, `groundTruth` (via `__oracleSink`, harness-side only), fork node and both routes, pre-registration hash, code hash, ε schedule, rejected-seed log, `rngDrawCount` per stream.

**Ground truth never enters the event stream** — manifest only (original spec §I.3).

### 15.4 Determinism gate

E1 (replay), E2 (structure/sample independence), E3 (seed sensitivity), E12 (Node/browser parity), E13 (no wall-clock dependence) carry over from the original spec, plus:

- **E-REP-1:** identical `(seed, arm)` ⇒ byte-identical action sequence, 3 runs.
- **E-REP-2:** all three arms at seed *S* produce deep-equal `groundTruth`.

---

## 16. What would constitute success

**Phase 1.0 success:** S1–S6 all pass. The agent's utility function has correct sign semantics with unchanged coefficients; Q writes are readable; exploration executes the intended action; runs are reproducible; no mechanism was added; the branch-migration consequence of the F2 fix is measured and reported rather than silent.

Phase 1.0 success is **not** a cognitive result and the report must say so (S6.1).

**Phase 1.1 (MF-1a) success:** the conjunction of §13's three criteria, with C3 and E-ENV-1 passing.

The strongest available result is: **M-CAL ρ significantly > 0, M-POL-1 and M-POL-2 slopes significantly > 0, M-PERF-1 improved over FROZEN, and MINIFLYWIRE ≈ TEXTBOOK.** That would be an honest and genuinely valuable finding: *MiniFlyWire can form and use a model of hidden transition dynamics, performing comparably to standard model-based RL.* Nothing more, and it should be reported in exactly those words.

**Parity with TEXTBOOK is success, not failure.** A first demonstration that the architecture can do a thing correctly is worth having. Exceeding TEXTBOOK would be a stronger result but is not required, and claiming it without mechanism identification is not permitted (§18).

---

## 17. What would constitute failure

| Outcome | Reading | Is it a failure of MiniFlyWire? |
|---|---|---|
| M-CAL ≈ 0 | Belief does not form | Yes — the representation does not track the world |
| M-CAL > 0, M-POL = 0 | Represents but cannot use | Yes — **but this is the *predicted* outcome if §12.4 is declined**, and must be pre-registered as such |
| M-POL > 0, M-CAL ≈ 0 | Policy changed via another mechanism | Not a failure, but **no belief claim is permitted**. Investigate `dampQ` first (§9.3) |
| Calibration + policy, no performance gain | Belief is used but does not help | Environment or scoring problem, not necessarily a belief failure. Check E-ENV-1 first |
| MINIFLYWIRE < TEXTBOOK | Architecture is a net cost here | Yes, and it must be reported prominently |
| All three arms tie | Almost certainly an environment defect | **Not a result.** Check E-ENV-1, C5, C6 before drawing any conclusion |
| C5 (shuffled belief) shows no effect | Belief was never used regardless of other metrics | Yes — this **overrides** a positive M-POL-1 |

**Failure of Phase 1.0** is any S-test failing, and in particular **S1.3** (a coefficient changed) or **S5.x** (mechanism added). Either means the stabilization became a redesign, and Phase 1.1 must not proceed.

---

## 18. Claims we are NOT allowed to make

Binding on every artifact produced by Phase 1.0 and Phase 1.1 — reports, commit messages, README, portfolio material, and any external communication.

### 18.1 Absolutely prohibited

1. **"MiniFlyWire is cognitive"** / "demonstrates cognition" / "thinks" / "understands." MF-1a tests one mechanism in a 20-node fully-observable tabular MDP.
2. **Any claim about perception, metacognition, self-monitoring, counterfactual reasoning, planning, or active information gathering.** Phase 0 classified these MISSING or NOT-USED, and MF-1a tests none of them.
3. **Any claim that the other 29 components contributed.** The task does not demand them. Their presence during a successful run is not evidence of participation. Attribution requires ablation.
4. **"Belief" inferred from performance alone.** Requirement 1 must hold independently (§13).
5. **"Belief" when M-POL-1 > 0 and M-POL-2 = 0.** That is `dampQ` until proven otherwise (§9.3).
6. **Any claim surviving a failed C5 (shuffled-belief ablation).**
7. **Novelty over standard RL** without `MINIFLYWIRE > TEXTBOOK` **and** an identified mechanism. Parity means parity.
8. **Generalisation beyond the tested envelope:** 20 nodes, 39 edges, full observability, single fixed goal, stationary dynamics, known deterministic reward, tabular. Every claim must be scoped to that envelope in the same sentence.
9. **Any claim from Phase 1.0 alone.** Stabilization is not a result (S6.1).
10. **Any metric defined or modified after seeing data.** All thresholds pre-registered (C10).

### 18.2 Required scoping language

Every reported positive result must carry, in the same paragraph:

> *Measured on a 20-node, 39-edge, fully-observable, stationary tabular MDP with a single fixed goal and known deterministic reward. Hidden structure was limited to per-directed-edge transition reliability. No claim is made about perception, planning, metacognition, or generalisation beyond this environment.*

### 18.3 Required negative disclosure

Any report must state, whatever the outcome:

- The Phase 0 defects that remain unrepaired (D2, D8, F4, F5, F6, F7).
- That D2 (`futureScore` ≡ 0) was **deliberately left broken** as a control.
- That nine components were NOT-USED at Phase 0 and MF-1a did not change that.
- The realised argmax-flip rate of the executive controller (Phase 0: 0.26%).
- Under §2.3.1 option (i): that seven subsystems ceased receiving writes.

---

# Closing sections

## 1. Proposed file changes

### Phase 1.0

**Modified (7):**
```
render/scoring.js          D3 — sign corrections + term-array refactor   ~90 restructured, 0 coefficients changed
render/qlearning.js        D1 — getQAny accessor (pending approval)      +8
render/episodeManager.js   D1 — composite write at :942                  ~4
render/embeddings.js       D1 — getQAny at :193,194,287-293              ~4
render/predictionError.js  peekTransitionUncertainty (instrument)        +4
main.js                    D1 reads (8 sites), dampQ, F2 path, RNG       ~40
instrumentation/rng.js     +baseline stream                              +1
```

**Conditionally modified (needs §S4 exception):**
```
main.js + render/**        24 Math.random() → rng("cognitive")           ~24
```

**Conditionally modified (needs §12.4 ruling):**
```
render/scoring.js          one term: − c · transitionUncertainty · max(qValue,0)   +3
```

**Conditionally modified (needs §2.3.1 ruling, option ii):**
```
main.js                    hoist 7 writes out of the else branch         ~25 moved
```

**Added (3):**
```
experiments/phase1_0/verify.js       S1–S6                     ~260
experiments/phase1_0/p5_diagnostic.js P5-A / P5-B / P5-C        ~140
benchmarks/harness/headlessShim.js   THREE/DOM/fetch stubs      ~120
```

### Phase 1.1 (MF-1a)

**Added (6):**
```
env/mf1aEnvironment.js               hidden T only, public R    ~110
env/mf1aConfig.js                    + fork verification        ~60
env/mf1aOracle.js                    ground truth, oracle sink  ~40
benchmarks/baselines/tabularMBRL.js  ARM_TEXTBOOK               ~80
benchmarks/harness/envProbe.js       telemetry wrapper          ~30
experiments/mf1a/run.js              3 arms × 30 seeds          ~200
experiments/mf1a/verify.js           E-tests + C-controls       ~240
```

**Modified (3):** `instrumentation/traceSchema.js` (+ENV channel, +2 types, v1.1.0), `instrumentation/rng.js` (+2 env streams), `main.js` (the seam: +15 / −60).

**Never modified:** every other `render/` file, `research/`, `LAB_NOTES/`, `Portfolio_Assets/`, `PROJECT_MEMORY/`, `experiments/exec_influence/`.

## 2. Exact interfaces

```js
// ── render/qlearning.js  (D1 — pending approval) ─────────────────────
export function getQAny(pos, action): number;   // max Q over all goal suffixes; pure

// ── render/predictionError.js  (instrument — §8.2) ───────────────────
export function peekTransitionUncertainty(fromId, toId): number;   // pure, no decay, no write

// ── render/scoring.js  (D3 — form is mandated, arithmetic unchanged) ─
const terms = [ ['name', signedValue], … ];
const finalWeight = terms.reduce((s,[,v]) => s+v, 0);
export let lastTermBreakdown;      // term-level telemetry, free from the array form

// ── env/mf1aEnvironment.js ───────────────────────────────────────────
export class MF1IllegalAction extends Error {}
export class MF1ReentrantStep extends Error {}
export class MF1NotReset      extends Error {}

export function createEnvironment({ nodes, edges, seed, config, __oracleSink });
// public surface — nothing else reachable:
{
  reset({startNode}): { at, tickId:0 },
  step(intendedTo):   MF1aOutcome,                       // frozen, all primitives
  actionsFrom(node):  number[],                          // PUBLIC topology
  rewardFunction():   Readonly<Record<number,number>>,   // PUBLIC — MF-1a only
  get tickId(), get stepCount(),
}
/** MF1aOutcome */ { tickId, from, intendedTo, arrivedAt, slipped, reward, terminal }

// ── env/mf1aConfig.js ────────────────────────────────────────────────
export const MF1A_DEFAULTS = {
  goalNode: 16,
  reliability: { reliableP:[0.90,0.98], unreliableP:[0.45,0.60], unreliableFraction:0.35 },
  reward: { goalReward: 10, elsewhere: 0 },        // deterministic, public
  slip:  { mode:'uniformOtherNeighbour' },
  clamp: { rewardMin:-2, rewardMax:12 },           // MUST match legacy range
  fork:  { minAdvantage: 0.20, rejectSeedIfAbsent: true },
};
export const MF1_NULL = { /* p = 1.0 — control arm C3 */ };
export function verifyForkStructure(env, groundTruth): { ok, forkNode, routeShort, routeLong, advantage };

// ── benchmarks/baselines/tabularMBRL.js ──────────────────────────────
export function createTabularMBRL({ actionsFrom, rewardFunction, gamma:0.9,
                                    epsilon, rng, queueCap:200, theta:1e-4 });
{ selectAction(state): number, observe({from,action,arrivedAt,reward}): void,
  get model(): Readonly<...> }   // for the M-CAL analogue

// ── env/mf1aOracle.js — HARNESS AND TESTS ONLY ───────────────────────
export function groundTruth(captured): { edgeReliability, goalNode, forkNode,
                                         routeShort, routeLong, seed, configHash };
export function calibrationReport(groundTruth, peekFn, visitCounts, k=10):
       { spearmanRho, permutationP, n, byDegree };     // metric M-CAL
export function optimalPolicy(groundTruth): Map;        // for M-PERF-4 regret
```

## 3. Test plan

**Phase 1.0 gate — all must pass:** S1.1–S1.5 (D3), S2.1–S2.6 (D1), S3.1–S3.5 (F2), S4.1–S4.5 (reproducibility), S5.1–S5.4 (no mechanism added), S6.1 (non-claim).

**Blocking within Phase 1.0:** S1.3 (no coefficient changed), S2.3 (single-goal isomorphism), S2.4 (episodeManager parity — the regression guard), S3.4 (branch-migration audit), S5.4 (diff scope).

**P.5 diagnostic (Phase 1.0, gates Phase 1.1):** P5-A structural influence, P5-B capability sweep, P5-C empirical goal-gradient distribution.

**Phase 1.1 gate:** E1–E3, E12, E13 (determinism); E4–E6, E10 (hiddenness — E6 behavioural ablation is the real proof); E-ENV-1 (fork exists), E-TB-1 (baseline solves deterministic case), E-CAL-0 (`predictedReward` alignment per §6.2), E-CAL-3 (degree stratification); C1–C10 (controls).

## 4. Estimated implementation size

| Scope | LOC | Elapsed |
|---|---|---|
| Phase 1.0 repairs (D3 + D1 + F2) | ~150 | ~1.0 day |
| RNG routing + headless shim | ~145 | ~0.7 day |
| `verify.js` S1–S6 | ~260 | ~0.8 day |
| P.5 diagnostic | ~140 | ~0.4 day |
| **Phase 1.0 total** | **≈ 695** | **≈ 2.9 days** |
| MF-1a environment + config + oracle | ~210 | ~0.6 day |
| ARM_TEXTBOOK | ~80 | ~0.4 day |
| MF-1a run + verify | ~440 | ~1.3 days |
| main.js seam | +15 / −60 | ~0.2 day |
| **Phase 1.1 total** | **≈ 760** | **≈ 2.5 days** |
| **Combined** | **≈ 1,455** | **≈ 5.4 days** |

Larger than the original MF-1 estimate (780 LOC). The increase is ARM_TEXTBOOK, the Phase 1.0 gate suite, and the P.5 diagnostic — all of which exist because the review was right that the original design could not be interpreted.

## 5. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| **R1** | **§12.4 declined ⇒ Requirement 2 structurally unsatisfiable. No longer a risk — P5-A has measured ∂ = 0 and 0/20,000 flips (§12.1). MF-1a would return the already-known "represents but cannot use".** | **Blocking, confirmed** | Director ruling. If declined, restate the hypothesis in advance and pre-register M-POL-2 = 0 (§12.4) |
| **R2** | D3's 31-point scale swing perturbs the arbitrate blend, clamp rate, softmax | High | S1.4 measures all three; S1.3 proves no retuning |
| **R3** | F2 fix silently disables 7 subsystems, changing 5 score inputs | High | §2.3.1 ruling + S3.4 mandatory audit |
| **R4** | D1 without the `episodeManager` change removes the only working Q channel | High | S2.4 explicitly guards it |
| **R5** | `getTransitionUncertainty` mutates on read ⇒ M-CAL unmeasurable | High | `peekTransitionUncertainty` (§8.2); C9 for the residual degree bias |
| **R6** | Homogeneous reliability ⇒ all arms tie ⇒ uninterpretable null | High | E-ENV-1 fork verification at config load; seed rejection |
| **R7** | 24 unseeded `Math.random()` ⇒ arms not comparable | High | S4.1; needs the §S4 exception |
| **R8** | ARM_TEXTBOOK tuned (even unconsciously) after seeing results | Medium | Hyperparameters fixed pre-run, in the manifest; C6 ε-sweep |
| **R9** | M-POL-1 > 0 driven by `dampQ`, misreported as belief | Medium | §9.3 disambiguation + C5 shuffled-belief ablation |
| **R10** | Empty `episodicStore` ⇒ top-3 score terms ≈ 0 ⇒ arms tie for unrelated reasons | Medium | Programmatic goal; report `trajectoryIntegrity`/`schemaBonus` realised distributions |
| **R11** | Scope creep — "while we're in there" | Medium | S5.4 diff-scope gate is a hard review gate |
| **R12** | Harness validates a stale copy (already happened once, Phase 0 D11) | Medium | Direct imports only; no `*.real.js` under new experiment dirs |
| **R13** | Phase 1.0 success misread as a cognitive result | Medium | S6.1 verbatim disclaimer; §18 |

## 6. Unresolved scientific questions

**Q1 — §12.4: approve the minimum belief→decision wiring?** P5-A has now *measured* the answer to the Director's question — transition belief cannot change the argmax, at any magnitude (∂ = 0, 0/20,000 flips). Per the Director's own instruction (*"If no: report the exact structural reason and propose the minimum pre-registered intervention"*), the reason is reported (§12.1) and the intervention is proposed (§12.4). **Recommend approve**, with `c` derived from P5-C on real telemetry and locked in writing before run 1. *Blocking.*

**Q2 — §2.3.1: accept the seven-subsystem shutdown, or hoist the writes?** **Recommend hoist (ii)** with mandatory S3.4 measurement. *Blocking.*

**Q3 — §S4: permit RNG routing through `render/**`?** Without it no comparison is valid. **Recommend approve.** *Blocking.*

**Q4 — §2.2: approve `getQAny` for `embeddings.js`?** Alternative is a silent embedding-lr change. **Recommend approve.**

**Q5 — D8 (Q-decay namespace): include or defer?** Same bug class as D1, 2 lines. **Recommend explicit deferral with S2.5 documenting the realised rate** — keeps Phase 1.0 scope honest.

**Q6 — Is M-CAL a sufficient operational definition of belief?** Spearman ρ between an internal variable and a hidden external quantity reachable only through observation. I believe it is defensible. **Must be ruled on before run 1** — post-hoc definition changes are not acceptable.

**Q7 — Is MINIFLYWIRE ≈ TEXTBOOK an acceptable terminal result for Phase 1.1?** The Director's table says yes. Worth confirming explicitly, because it determines whether Phase 1.2 is a victory lap or a rescue.

**Q8 — What does MF-1a tell us if it succeeds?** Stated for the record, in advance: it tells us MiniFlyWire can do model-based RL on a 20-node MDP. It tells us **nothing** about the other 29 components, because the task does not demand them. The reviewer's §11 is correct and should be quoted in the final report rather than argued with.

**Q9 — Should MF-1b (hidden reward, deterministic transitions) be specified now or after MF-1a?** **Recommend after.** MF-1a will change our estimate of what the agent can express, and specifying MF-1b now would bake in assumptions we are about to test.

---

**End of revised specification. Awaiting Research Director approval. No implementation will begin, and no source file will be modified, before that approval.**

**Blocking rulings required: Q1, Q2, Q3.**
