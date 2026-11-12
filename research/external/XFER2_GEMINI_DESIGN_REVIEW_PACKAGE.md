# XFER-2 — independent design review request (single round)

**Reviewer role.** You are an independent adversarial reviewer of an experimental design. You have no access to the
repository and must not ask for it; everything you need is below. Do not write code, do not run anything, and do not
redesign the whole study. Attack the causal contrast, name confounds, and recommend the **smallest** modification that
would let the experiment distinguish the competing explanations. One round only.

**Output format (≤ 900 words).** A ranked list of objections. For each: *severity* (BLOCKING = the declared
interpretation could be wrong; MAJOR = weakens it; MINOR), *the confound or flaw*, *what observation would show it
matters*, *the minimal change*. Then: (a) any arm you would drop as redundant, (b) any single control you would add,
(c) any sentence in the declared decision rules that over-claims.

---

## 1. System in one paragraph

A single agent moves on a fixed 20-node undirected graph (39 edges). Each undirected edge has a hidden traversal
reliability; a move can slip and leave the agent in place. One node is the goal (reached → the agent is moved to a
fresh random node and a new episode starts; an episode also ends after 150 calls). At each call the agent scores its
candidate next nodes with a ~34-term additive heuristic and takes the argmax (ε-greedy). **The goal gradient term uses
the true graph's BFS distance to the goal, so the agent has the shortest-path structure from boot.** The agent stores
*episodes* (the ≤ 6-node path that ended at the goal, `source = autonomous_success`) and the runtime can persist its
whole brain and restore it in a later session.

## 2. Two code-level facts the design depends on (read from the runtime)

**Decision-time reads of the episode store** (no `quality` is consulted):

```
adjacencyMemory[a->b]  = number of stored episodes' consecutive pairs equal to (a,b)      // all episodes
trajectoryConfidence(a,b) = min(adjacencyMemory[a->b] / 5, 1)
// goal gradient for candidate k at current node:
if (k !== goal) goalGradientBoost *= 0.10 + 0.90 * trajectoryConfidence(current, k)
else            goalGradientBoost  = 100 * trajectoryConfidence(current, k)
trajectoryIntegrity(path, a, b) = min( #episodes containing the pair a->b (context match >= 0.33) / 5, 1 )   // x40 in the score
```
So with an empty store the goal gradient reaches the agent at 10% strength (and goal-entering moves at 0).

**Replay.** Once in a while the agent replays a random *eligible* stored episode. Eligible = `source` not
replay/imagination, **`quality >= 0.5`**, ≥ 3 nodes, **a simple path (no repeated node)**, every step a graph edge. A
replayed episode runs the procedural pipeline at gain `0.40 × quality`: for each transition it increments the
transition strength, applies a Q update with reward `8·gain·(1 + 0.2·stepsEnabled)` **whether or not the episode
reached a goal**, and writes reward memory. Each distinct replayed label-sequence is replayed once per run.

Consequence: setting `quality = 0.49` removes replay learning for an episode and leaves every decision-time read
unchanged.

## 3. The finding to be explained (XFER-1, exploratory, 80 worlds, 1,500-call sessions)

A cold training session in a world persists its brain. A *new* session (new agent seed, same world) then starts with a
component-masked copy. Primary outcome = goal reaches in the new session; paired by world.

| arm (persisted into the new session) | goal reaches, mean over 80 worlds | vs cold |
|---|---|---|
| nothing (cold) | 88.0 | — |
| everything the product persists | 108.1 | +20 [−2, 43] |
| **episodes only** | **186.2** | **+98 [78, 119]**, 61 worlds +, 9 −, 10 zero |
| another world's episodes (same goal, same graph) | 163.7 | +76 [55, 96] |
| rewards store only | 61.0 | −27 [−46, −9] |
| everything except rewards | 143.4 | +55 |
| signals only / confidence only | = cold in all 80 worlds | 0 |

Per-attempt success barely moves with episodes (0.722 cold, 0.752 episodes, **0.721 foreign episodes**). Cold agents
are still improving at call 1,500; episode agents are at their plateau from the first 500 calls. Real stores are
sparse and goal-terminated: mean 74 episodes (0–182), lengths 3–6 nodes (pooled: 3: 767, 4: 800, 5: 945, 6: 3440), 79%
simple paths, **87% end at the goal**, only ~8 of 78 directed edges reach count 5, mean gate retention
(0.10 + 0.90·tc) 0.28 on edges that lead toward the goal and 0.20 on edges that lead away.

## 4. Competing explanations (XFER-2's question)

* **H-gate** — the benefit is removal of the cold-start attenuation: any store that gives directed-edge familiarity
  suffices; the content of the real experience is irrelevant.
* **H-replay** — the benefit is replay-driven procedural learning from real goal-terminated trajectories.
* **H-content** — the real store's decision-time structure (which edges, which direction, goal-termination) carries
  information beyond exposure.

## 5. Proposed design (nothing has been run)

Every arm delivers *only* an episode store (all other stores empty at the first call). Fresh worlds, fresh agent seeds.

| arm | store | purpose |
|---|---|---|
| COLD | none | baseline |
| REAL | the world's own training store | reproduction |
| REAL_NR | same episodes, `quality = 0.49` | decision-time reads **without** replay learning |
| COVER | 182 goal-free walks, world-independent (one store for every world), every directed edge ≥ 5 uses, 79% simple paths / 21% loop-containing as in the real pool, lengths and quality drawn from the pooled real distributions, replay-eligible | generic exposure **with** replay |
| COVER_NR | same walks, `quality = 0.49` | generic exposure, reads alone |
| REV_NR | the world's real paths reversed, `quality = 0.49` | same exposure amount and structure, direction of travel inverted |
| DONOR_SG / DONOR_XG | another world's real store, same goal / different goal | goal specificity of foreign real experience |

**Measured residual differences** (outcome-free, on the 80 existing real stores): COVER − REAL episode count +107.6,
transitions +448, directed edges at count ≥ 5: 78 vs 8.1; mean |Δtc| over directed edges 0.85; gate retention COVER 1.0
on every edge class; integrity 1.0 everywhere (so +40 is added equally to every candidate); COVER ends at the goal in
3.7% of episodes (real 87%); replay-eligible share 79% (real 70%). REAL_NR: |Δtc| = 0, eligible share 0.
REV_NR: gate retention mirrored (toward-goal 0.20, away 0.28).

**Behavioural verification of the switch:** with the runtime's own episode manager and a recording stub, an eligible
store triggers Q updates and a `quality = 0.49` copy triggers none; loop-containing episodes never trigger them
regardless of quality.

## 6. Estimand, rules, predictions (declared before any outcome)

`benefit(X) = mean over worlds of goalReaches[X] − goalReaches[COLD]`; `R(X) = benefit(X) / benefit(REAL)`; seeded
percentile bootstrap over worlds. `R ≥ 0.80` reproduces, `0.40–0.80` partial, `< 0.40` does not; an interval that
straddles a bin edge is "ambiguous". If `benefit(REAL)` is not > 0 with the interval excluding 0, nothing is interpreted.

Declared interpretation: `R(COVER_NR)` reproduces → "benefit is removal of the cold-start attenuation"; else
`R(REAL_NR)` reproduces → "real decision-time content carries information exposure does not"; else both fail →
"needs replay learning from real episodes"; otherwise "inconclusive".

Predictions: P1 benefit(REAL) > 0; P2 R(REAL_NR) ≥ 0.70; P3 R(COVER_NR) ≥ 0.70; P4 R(REV_NR) < 0.30;
P5 mean(COVER − COVER_NR) < 0; P6 mean(DONOR_SG − DONOR_XG) > 0.

Blocks: C = 24 worlds (instrument check and exploratory look), D = 48 worlds (replication); predictions fixed before C
and not revised for D; run once each; a world is excluded only for a failed construct check or a failed session; no
outcome-based exclusion. Secondary diagnostics (attempt success, slips, store statistics) are never substitutes.

## 7. Weaknesses I already see (so you can look elsewhere)

1. COVER is saturated and not count-matched; it is an upper bound of exposure, not a matched control.
2. COVER carries no goal-ward asymmetry (gate retention equal on every edge class), unlike any real store; a COVER
   benefit could therefore mean "full unlock", and a COVER failure could be caused by symmetric exposure or by replay
   noise rather than by missing content.
3. The agent already has the oracle goal gradient; "information" is hard to define when the cold agent is handicapped
   by an attenuation rule.
4. REV_NR and REAL_NR use `quality = 0.49`; I found no other consumer of `quality` in decision scoring, but I only
   read the code, and the test session also produces its own (replayable) episodes.
5. The ratio R is unstable when benefit(REAL) is small in a block.

## 8. Questions

1. Does COVER_NR test "generic exposure suffices", or does its saturation/symmetry make a positive *and* a negative
   result uninformative?
2. Is REV_NR a sound structure-matched control, or does reversal confound terminal-node, loop and start-node structure?
3. Is `quality = 0.49` a clean replay switch, and what interaction with the session's own episodes could spoil it?
4. Which arm is redundant? Which single control (for example a count- and coverage-matched but goal-uncorrelated
   store, or a goal-ward-only store with the real edge profile) would most improve identifiability?
5. Do the declared interpretation sentences ever claim more than the contrasts support?
6. Are the bins, the ratio and the block sizes defensible for the information needed?
