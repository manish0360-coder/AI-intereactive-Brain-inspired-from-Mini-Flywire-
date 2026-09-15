# Phase 0 — Verdict

> **"Is MiniFlyWire currently cognitive, and if not, what is the minimum missing mechanism that would allow us to experimentally demonstrate a transition toward genuine cognitive behavior?"**

---

## 1. The answer

**No. MiniFlyWire is not currently cognitive, and it is not a partially-completed cognitive system.**

It is a **heuristic scoring function over a fully-observable static graph**, wrapped in an unusually elaborate instrumentation layer. On the operational ladder in the project instructions it sits at **Level 0–1**: state → weighted lookup → argmax. It does not reach Level 2 (model-based decision), because the two mechanisms that would constitute a model — look-ahead (`futureScore`) and learned value (`Q`) — are both measurably severed from action selection.

I want to be precise about what kind of "no" this is, because it is not the usual one.

The usual "not yet cognitive" verdict says: *the loop is implemented but shallow; deepen it.* That verdict does not apply here. The measurements in `04_FALSIFICATION_EVIDENCE.md` support a stronger and more uncomfortable claim:

**The loop cannot be completed by any amount of work on the loop, because the arrow `ACTION → OUTCOME` has no referent.**

---

## 2. Why this is architectural, not a bug list

Twelve defects are documented, and several are severe. It is tempting to read the verdict as "fix D1 through D12 and you have a cognitive system." That reading is wrong, and I think it is the most important thing this audit has to say.

Consider what happens if every defect is fixed:

- Fix **D1** (Q key namespace) → Q values become readable. But what does Q converge to? `rewardSignal` is `f(next === goal, similarity(from,to))`. That function is fully known at t=0. Q-learning would be laboriously rediscovering a closed-form expression the agent already computes on every step.
- Fix **D2** (`futureScore` id) → look-ahead returns non-zero. But it searches `userData.neighbors`, i.e. `connections.json`, which the agent has in full from boot. `goalDistance` (main.js:1082) already does exact BFS on the same graph. Look-ahead would be re-deriving known facts.
- Fix **D3** (sign inversions) → the score becomes coherent. It is still a hand-tuned weighted sum of 28 terms with no principle selecting the weights.
- Fix **D4** (prediction error) → nothing to fix. `statePredictionError` is zero because the world is deterministic and the agent chooses its own next state. There is no version of this system with a static graph, deterministic transitions, and a reward function computable at decision time in which the agent can be surprised.

That last one is the load-bearing observation. **Prediction error is not broken in MiniFlyWire. It is correctly reporting zero, because there is nothing to predict.**

### The formal statement

Let the environment be `E = (S, A, T, R, O)`. In MiniFlyWire:

- `S` = node id (20 values). Fully known.
- `A` = graph neighbours. Fully known from `connections.json`.
- `T(s,a) = a`. Deterministic, no failure mode, no stochasticity, known.
- `R(s,a) = f(a === goal, similarity(emb[s], emb[a]))`. Computable at decision time from tables the agent owns.
- `O = S`. Full observability. No noise, no aliasing, no latency, no hidden variables.

A system in which `T` and `R` are known and deterministic and `O` is the identity has **zero epistemic uncertainty by construction**. Its optimal policy is computable in closed form by BFS. There is no belief to maintain, because there is nothing unknown. There is no prediction to make, because the transition is an assignment. There is no learning signal, because there is no residual between model and world — the model *is* the world file.

This is why the audit found nine components classified NOT USED and three MISSING. Those are not thirty independent oversights. They are thirty symptoms of one fact: **the components that would represent uncertainty, prediction, and belief have nothing to represent, so every attempt to wire them in produced code whose output was — correctly, if accidentally — discarded.**

The dead code is diagnostic. A system that genuinely needed belief-tracking would not have tolerated `getProceduralUncertainty`'s output falling into `...rest` for however many commits it has been there, because behaviour would have visibly degraded. Nothing degraded, because nothing depended on it.

---

## 3. What MiniFlyWire actually is

Stripping away everything that does not affect the argmax, the running system is:

```
score(s, a) =  3·log1p(transitions[s][a])
            +  5·Q_taught[s][a]
            +  8·tanh(0.1·rewards[s→a])
            +  2·log(visits[s→a]+1)
            + 40·trajectoryIntegrity(recentPath, s, a)     ← 0 without human teaching
            + 15·schemaBonus(s, a)                         ← 0 without human teaching
            +  2·goalGradient(a, goal)                     ← 0 without a human-set goal
            + 12·(bayesianTrust − 0.5)
            +  ε·(small semantic / consolidation / attention terms)
            +  (three inverted penalty terms)
            +  0.4·arbitrate(...)                          ← changes the argmax 0.26% of the time

action = argmax_a score(s, a)
```

Under the default configuration — SPACE pressed, nothing clicked — the three largest terms are identically zero and the system reduces to a visit-count-and-reward heuristic over graph neighbours.

This is a legitimate thing to have built. It is a graph-traversal policy with homeostatic modulation and a striking real-time visualisation. It is not a cognitive architecture, and no rewiring of the existing modules will make it one.

**What it is genuinely good at, and should not be discarded:**

- The **instrumentation layer** (`instrumentation/`, `benchmarks/harness/`) is real experimental infrastructure: seeded RNG, a validated telemetry bus, a session recorder, a decision probe. That is exactly what a research system needs.
- The **`exec_influence` experiment** is a correct falsification design — matched arms, a capability control, persisted telemetry, a falsifiable verdict. It found a real defect the audit independently reproduced.
- The **provenance system** (`semanticProvenance.js`) — separating manual training from direct experience from replay by write authority — is a genuinely good idea that most toy cognitive systems lack.
- `schemaMemory.js` is the most carefully engineered module in the repo, and it is one of the few that reads the composite Q keys correctly.

The problem is not capability. The problem is that thirty mechanisms were built before one environment was built.

---

## 4. The minimum missing mechanism

**An environment with hidden structure that makes prediction non-trivial — and a reward that is not computable at decision time.**

That is one mechanism, not a list. Everything else in the specified loop becomes measurable the moment it exists, and nothing in the loop is measurable until it does.

Concretely, the minimum viable change is to make **at least one** of the following true, on the existing 20-node graph, with no new modules:

| Option | Change | What it makes measurable |
|---|---|---|
| **(a) Stochastic transitions** | `T(s,a)` succeeds with hidden per-edge probability `p_e`, else the agent stays or slips to a neighbour. `p_e` is never exposed to the agent. | `statePredictionError` becomes non-zero and informative. Belief over `p_e` becomes necessary. Beta posteriors in `uncertaintyLedger` acquire a referent. |
| **(b) Hidden reward** | Reward is drawn from a hidden distribution attached to the node, not computed from `similarity()`. | `rewardPredictionError` stops being an internal-consistency metric. Q-learning has something to learn that BFS cannot give it. |
| **(c) Partial observability** | The agent observes a noisy or aliased feature vector instead of the node id; `connections.json` is not given to it. | Perception acquires a referent. Situation-state construction becomes a real computation instead of an integer copy. |
| **(d) Non-stationarity** | Edge costs or rewards change on a schedule the agent cannot see. | Adaptation and long-term consolidation become falsifiable. Volatility tracking acquires a referent. |

**Cheapest defensible starting point: (a) + (b).** Both are localised. (a) is a change to how `agentCurrent` is assigned. (b) is a change to how `rewardSignal` is produced. Neither requires a new module. Together they turn every currently-vacuous arrow in the loop into a measurable one.

### Why this is the *minimum*

Because every alternative candidate for "the minimum missing mechanism" fails a falsification test:

- *"Fix the Q key mismatch."* → Then Q converges to a closed-form function of the graph. No cognitive claim is demonstrated. **Necessary but not sufficient.**
- *"Fix the planning id bug."* → Then look-ahead re-derives `connections.json`. **Not sufficient.**
- *"Add a world model."* → A world model of a world the agent is handed in full is an identity function. **Not sufficient.**
- *"Add counterfactual reasoning."* → Counterfactuals over a deterministic known transition function are just re-running BFS from another node. **Not sufficient.**
- *"Add active information gathering."* → There is no information to gather. Everything is already known. **Not merely insufficient — undefinable.**
- *"Fix the sign inversions."* → Improves policy quality; demonstrates nothing about cognition. **Not sufficient.**

Only the introduction of hidden structure makes any of the above meaningful. This is why I am confident it is the minimum: it is the unique change that is *presupposed* by all the others.

---

## 5. The experiment that would demonstrate the transition

Once hidden structure exists, the cognitive claim becomes falsifiable with a single measurement, and it needs no new architecture:

**Hypothesis H1.** *After introducing hidden per-edge transition probabilities, MiniFlyWire's prediction error carries information about the world.*

**Test.** Measure mutual information between `statePredictionError` at step `t` and the agent's subsequent policy change at `t+1`, against a control in which the agent's belief update is disabled (prediction error computed and logged but not routed into `effectiveLR`, `dampQ`, or `updateTransitionUncertainty`).

**Baseline that must be beaten.** A frozen-belief agent with identical scoring. If the belief-updating agent does not reach the goal in fewer steps than frozen-belief, no cognitive capability has been demonstrated — only bookkeeping.

**Pre-registered falsification condition.** If `statePredictionError` remains at 0.000, or if the belief-updating and frozen-belief arms are statistically indistinguishable, H1 is refuted and the environment change was insufficient.

The infrastructure to run this **already exists** in `instrumentation/` and `benchmarks/harness/`. The `exec_influence` experiment is a working template. This is not a large build.

---

## 6. Recommended sequencing

I am explicitly not proposing implementation here (Phase 0 is evidence-gathering), but the audit implies an ordering, and stating it is part of the finding.

1. **Freeze feature work.** Nothing in the 30-component list should be extended until (2) is done.
2. **Build the environment.** Hidden transition probabilities and hidden reward on the existing 20-node graph. This is the only work that changes the verdict.
3. **Repair the four severed arrows** — D1 (Q namespace), D2 (`futureScore` id), D3 (sign inversions), F2 (epsilon `return`). These are cheap, and until they are fixed no measurement of the loop means anything.
4. **Delete or quarantine the nine NOT-USED subsystems.** They are not free: they cost every reader of this codebase the effort of determining that they do nothing, and they make the system look more capable than it is. `research/` documents the intent; the code can be re-derived when there is something for it to do.
5. **Then, and only then**, run H1 and re-audit.

---

## 7. Statement against interest

The instruction was: *do not optimise the answer to preserve the existing architecture; if the evidence says the architecture is wrong, say so.*

The evidence says the architecture is wrong, and it says so in a specific way that I want to state without hedging:

**The thirty components were built in the wrong order.** Perception, belief, uncertainty, prediction, planning, counterfactual reasoning, and metacognition were each implemented as a module before there existed anything for them to be *about*. That ordering guarantees the outcome the audit found: correct-looking code whose output is silently discarded, because no downstream consumer could have a genuine use for it.

The nine NOT-USED classifications are the fingerprint of this. They are not sloppiness. A module that computes Beta posteriors over a fully-known deterministic transition function is producing a constant, and a constant will always end up in `...rest` eventually.

The good news is that the correction is small and does not invalidate the work. The 20-node graph is fine. The instrumentation is good. `schemaMemory`, the provenance system, and the `exec_influence` harness are genuinely well built. What is missing is roughly 200 lines that make the world uncertain — and once that exists, most of the thirty modules will have, for the first time, something real to compute.

MiniFlyWire is currently a **simulation of a cognitive architecture**. The distance to an actual experimental cognitive system is not thirty modules. It is one environment.
