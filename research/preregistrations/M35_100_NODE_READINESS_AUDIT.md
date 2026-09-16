# M35 — 100-Node FutureScore Readiness Audit

**Status:** READINESS AUDIT (PASS 1 source audit, PASS 2 read-only measurement harness)
**Milestone:** M35
**Date:** 2026-09-16
**Authority:** Director decision — *M35 — 100-NODE FUTURESCORE READINESS AUDIT*
**Builds on:** M34 closure at `fdeac75` (M34-GREEN)

**No 100-node substrate was built. No configuration generated, no seed consumed, no
collection, no preregistration, no production/RNG/graph/`futureScore` change. Not pushed.**

---

## 1. Verdict

> # M35-GREEN (audit) — and the answer is NOT YET
> **The audit is complete and its measurements are reproducible. Its finding is that a
> 100-node substrate must not be built on the existing environment module.**
>
> **The dominant blocker is neither D2 nor the executive controller. It is that the
> configuration-acceptance predicates R1/R2 and the exhaustive oracle enumerate EVERY
> SIMPLE PATH to the goal.** On the real 20-node graph that is 255,595 paths, finishing in
> 1.24 million expansions. On a synthetic 30-node graph of the same density the enumeration is
> still unfinished after **20 million expansions**, having found 3.3 million paths. At N = 100
> the acceptance machinery and the exhaustive oracle are **not computable as written** — long
> before `futureScore` itself becomes a problem.
>
> **`futureScore` itself is structurally defined and cheap at N = 100.** Through the
> production call path it returns **identically zero** — the D2 defect — so a
> FutureScore-focused study at N = 100 would measure nothing.

---

## 2. M35 objective

> Determine whether the planning/admission/oracle substrate can be responsibly expanded from
> the current graph to a 100-node development/stress substrate — without assuming that it can.

---

## 3. A correction to the framing, from source

**The substrate is a 20-node graph, not a 19-node graph.** `neurons.json` carries node ids
1–20 and `connections.json` 39 undirected edges. "19" is the **decision-state count** —
`decisionStates(goal)` returns every node except the goal (all have degree ≥ 2), giving 19 for
each of the four goals — and it is frozen as `FROZEN.decisionStates = 19` in **both** the C1 and
UQ-B protocols. Any statement about "19 nodes" should be read as "19 decision states of a
20-node graph".

---

## 4. FutureScore dependency map

```
main.js runPrediction (per candidate k)
  ├─ findNeuronById(k)                        render/search.js   node map, keyed by data id
  ├─ futureScore(neuron, goal, rewards, penalties, curiosityMap, 3)    render/planning.js
  │     └─ dfs(neuron.id, depth)              ← D2: the THREE.Object3D counter, not userData.id
  │          └─ findNeuronById(currentId) → current.userData.neighbors
  │               └─ rewards / penalties / curiosityMap lookups on "a->b" keys
  ├─ futureBonus = min(imaginedFuture * 4, 20)  → calculateDecisionScore term x1.2
  └─ admission gates, in order
        penalties > 10 · getQ < -0.5 · neighbour-or-transition · canReachGoal(k, goal, 4)

experiments/m7/env.js  (the study environment, single topology, built at import)
  ├─ EDGES / NODES / ADJ / DIR_IN / EDGE_OF        from connections.json + neurons.json
  ├─ GOALS = [8,12,16,19] · N_UNRELIABLE = 13 = floor(0.35 x 39)
  ├─ makeConfig(configSeed, configIndex)           756 draws, per-edge reliabilities, embeddings
  ├─ evaluateConstraints  → R1, R2  ── simplePaths(goal): ALL simple paths, per start node
  │                        → R3, R4  ── spearman over 39 edges
  │                        → R5      ── reliability-optimal vs hop-optimal policy
  ├─ exhaustiveMinCost    ── simplePaths again
  └─ expectedCostToGoal   ── Dijkstra, O(N^2), scales fine
```

---

## 5. 19 → 100 node assumptions discovered

| Where | Assumption | Consequence at N = 100 |
|---|---|---|
| `experiments/m7/env.js` | the graph is read from `neurons.json` + `connections.json` **at import**; `EDGES`, `ADJ`, `DIR_IN`, `EDGE_OF` are module-level | **one topology per process.** A second topology cannot coexist without modifying a module C1 and UQ-B evidence depends on |
| `env.js` | `N_UNRELIABLE = 13 = floor(0.35 × 39)` — an absolute count | silently wrong for any other edge count; it is not recomputed per graph |
| `env.js` | `GOALS = [8, 12, 16, 19]` — four fixed node ids | meaningless on another topology |
| `env.js` | `simplePaths(goal)` enumerates **all** simple paths, cached per goal | **combinatorial explosion — see §7** |
| `main.js` | `canReachGoal(start, goal, maxDepth = 4)` | a fixed hop budget against a graph whose diameter grows; admission meaning drifts with N and topology |
| `render/planning.js` | `futureScore` depth default 3; `dfs(neuron.id, …)` | cost fine; identity defect (D2) independent of N |
| `experiments/c1/protocol.js`, `experiments/uqb/protocol.js` | `FROZEN.decisionStates = 19`, `GOAL_DEGREE = {8:5, 12:5, 16:3, 19:3}` | frozen constants of closed studies — a 100-node run can never be a replication of either |
| `render/planning.js` `dfs` | **checked and clear:** `visited` **is** unmarked on backtrack (`planning.js:337`, and `:149` in `lookAheadScore`), so it does **not** carry the M10/M11 defect that `canReachGoal` had. Recorded because the audit tested for it | no scaling consequence |

---

## 6. Blocker classification

| Item | Class | Why |
|---|---|---|
| **D2 — `planning.js:357` passes `neuron.id`** | **A — directly blocks a FutureScore substrate** | Measured at N = 100: through the production call path `futureScore` is non-zero for **0 / 100** start nodes; with `userData.id` it is non-zero for **100 / 100**. A 100-node study of FutureScore would be measuring an identically-zero term. *(For a pure cost/engineering harness it would be B — the cost is the same either way.)* |
| **Executive controller inert** | **C — unrelated to this objective** | It modulates `exploit`/`explore` on the 60 % scoring path; it touches neither `futureScore`, nor admission, nor the oracle. Candidate **ranking** stays well-defined because the live 40 % `arbitrate` blend is unaffected. Becomes B only if the 100-node test is widened to executive influence |
| **Trajectory-seed accounting incomplete** | **D — separate governance decision** | A development stress test on a **new** topology draws no registered configuration seed and records no result. It becomes A the moment the 100-node work is proposed as a registered study |
| **BLOCKER-1 — `simplePaths` enumeration (§7)** | **A — dominant, more important than all three above** | R1/R2 acceptance and `exhaustiveMinCost` are not computable at N = 100 |
| **BLOCKER-2 — single-topology environment** | **A — structural** | A 100-node fixture cannot exist beside the 20-node one without either editing `env.js` (protected historical infrastructure) or adding a separate module |
| **BLOCKER-3 — `maxDepth = 4` admission drift** | **B — must be measured per fixture, not inherited** | Measured below: 0 % of pairs beyond depth 4 at N = 20, ~1 % at N = 100, 14.4 % at N = 200 on random graphs of equal density. Mild at N = 100 for this topology class, but topology-dependent and silent |

---

## 7. Verification results — `node experiments/m35/readiness.js`

**Read-only.** It builds its own synthetic graphs, calls the repository's own planning
functions, never calls `makeConfig`, and reports structure and cost only.

### 7.1 The dominant blocker: simple-path enumeration

| Graph | Simple paths to one goal | Enumeration |
|---|---|---|
| **real 20-node substrate**, goal 8 | **255,595** | complete, 1,240,112 expansions |
| synthetic N = 20, mean degree 3.9 | 122,724 | complete, 1,608,313 expansions |
| synthetic N = 30 | 3,314,878 found so far | **UNFINISHED** at the 20,000,000-expansion cap |
| synthetic N = 40 | 2,461,554 found so far | **UNFINISHED** at the 20,000,000-expansion cap |
| synthetic N = 50 | 3,923,455 found so far | **UNFINISHED** at the 20,000,000-expansion cap |
| synthetic N = 60 | 974,212 found so far | **UNFINISHED** at the 20,000,000-expansion cap |
| synthetic N = 100 | 957,504 found so far | **UNFINISHED** at the 20,000,000-expansion cap |

The count is per goal and per configuration, and `evaluateConstraints` runs it for **every
candidate configuration**. The budget is a **deterministic expansion cap**, not a timer, so these
numbers are identical on every run — two consecutive runs of the harness produce byte-identical
JSON apart from elapsed milliseconds. The real 20-node graph finishes in 1.24 million expansions.
At N = 30 the enumeration has already found 3.3 million paths when it hits 20 million expansions
and is nowhere near finished. **Fewer paths appear at N = 60 and N = 100 only because the budget is
spent deeper in a larger graph before reaching the goal at all** — not because those graphs are
easier.

### 7.2 Admission reachability under `maxDepth = 4`

| Graph | mean distance | max | pairs beyond depth 4 |
|---|---|---|---|
| real 20-node, 4 real goals | 2.13 | 4 | **0 / 76 (0.0 %)** |
| synthetic N = 50 | 2.59 | 5 | 3 / 196 (1.5 %) |
| synthetic N = 100 | 2.71 | 5 | 4 / 396 (1.0 %) |
| synthetic N = 200 | 3.47 | 6 | 115 / 796 (14.4 %) |

At N = 20 the budget is not binding at all (diameter 4). At larger N it starts to bind, and how
much depends on topology — these are random graphs of matched density, the mildest case.

### 7.3 `futureScore` itself

| Graph / depth | node lookups (all start nodes) | time | non-zero as `main.js` calls it | non-zero with `userData.id` |
|---|---|---|---|---|
| N = 20, depth 3 | 16,402 | 13 ms | **0 / 20** | 20 / 20 |
| N = 50, depth 3 | 46,922 | 27 ms | **0 / 50** | 50 / 50 |
| N = 100, depth 3 | 108,438 | 36 ms | **0 / 100** | 100 / 100 |
| N = 100, depth 4 | 461,368 | 129 ms | — | — |
| N = 100, depth 5 | 1,750,072 | 568 ms | — | — |

Cost grows roughly linearly in N at fixed depth and ~3.7× per extra depth level. **No explosion
at N = 100 for depth 3–4.** The zeros are D2, measured, not inferred.

### 7.4 Isolation

Configurations generated by the audit: **0** (`makeConfig` is never called, so `env.evaluatedSeeds()`
stays empty). The typed layer still refuses 895500. Free configuration territory is **0–894999**;
895000–899999 and 900000–900499 are consumed, ≥ 900500 held out. A 100-node development fixture
can therefore be fully isolated from every registered seed.

---

## 8. Is 100-node development testing ready?

**Technically: NO, not on the existing environment module.**
`futureScore`, candidate generation and `expectedCostToGoal` would be fine. The acceptance
predicates and the exhaustive oracle would not run (§7.1), and the environment cannot hold a
second topology (§5).

**Scientifically: NO, and not for the same reason.**
Even with a working 100-node environment, D2 makes the FutureScore term identically zero on the
production path, so the headline question — does FutureScore survive expansion of the state
space — cannot be measured until D2 is repaired. The frozen constants of C1/UQ-B also mean a
100-node run can never be a replication of either, exactly as the ruling already required.

---

## 9. Exact minimum repairs, as separate milestones

| # | Milestone | Scope | Why it is separate |
|---|---|---|---|
| **R-1** | **Repair D2** — `planning.js` `dfs(neuron.id …)` → `neuron.userData.id`, with a gate proving the term becomes non-zero on the production path and that no other decision changes | one line plus a verifier | It is a production change to the scoring path and must be measured before and after on the **existing** 20-node substrate first. It is also the cheapest of the three and unblocks any FutureScore question |
| **R-2** | **Additive development environment** — a new module parameterised by `(nodes, edges, goals)`, leaving `experiments/m7/env.js` byte-identical | new file, no historical edit | The M18/M34 successor convention applies: never edit a module closed studies depend on |
| **R-3** | **Acceptance predicates that are computable at scale** — restate R1/R2 (and the exhaustive oracle) without full simple-path enumeration, e.g. k-shortest-paths or bounded sampling | **a scientific redefinition** | R1/R2 define what an *acceptable configuration* is. Changing them changes the population. This needs a Director ruling and a preregistration, not an engineering patch |

R-1 is independent. R-2 is mechanical. **R-3 is the real decision**, and it should be taken before
any 100-node fixture is designed, because it determines what a 100-node configuration *is*.

---

## 10. Historical integrity

| | |
|---|---|
| M34 | remains **GREEN** — 75/75, memo gate 29/29 |
| 895000–895999 | still recorded consumed by C1; typed layer refuses it |
| registered seeds consumed | **0** — `makeConfig` never called |
| C1 · UQ-B · production · `futureScore` · RNG · the 20-node fixtures | **unchanged** — this milestone adds files only |
| M33 · M33-R1 | 69/69 · 114/114 |
| working tree | clean apart from pre-existing untracked files |
| pushed | **NO** |

---

## 11. Evidence → Inference → Hypothesis

**EVIDENCE** *(executed by the harness)*
- **Ev-1.** 20 nodes, 39 edges, mean degree 3.9, diameter 4; decision states 19 per goal.
- **Ev-2.** 255,595 simple paths to goal 8 on the real graph; > 2,000,000 at N = 30 synthetic.
- **Ev-3.** `futureScore` at N = 100: 108,438 lookups / 36 ms at depth 3; 0/100 non-zero as called, 100/100 with `userData.id`.
- **Ev-4.** Pairs beyond depth 4: 0 % at N = 20, 1.0 % at N = 100, 14.4 % at N = 200.
- **Ev-5.** `env.js` reads its graph at import; `N_UNRELIABLE`, `GOALS`, `decisionStates`, `GOAL_DEGREE` are per-topology constants.

**INFERENCE**
- **In-1.** The acceptance/oracle layer, not the planner, is what fails first as N grows (Ev-2).
- **In-2.** A FutureScore result at N = 100 would be uninterpretable while D2 stands (Ev-3).
- **In-3.** A second topology requires an additive module, because the existing one is a singleton (Ev-5).

**HYPOTHESIS**
- **Hy-20.** That random graphs of matched mean degree represent the topology a 100-node fixture would use. They are the mildest case for the depth budget; a sparse or lattice-like graph would bind harder. **Not established.**
- **Hy-21.** That no further scaling defect hides behind the acceptance layer — untestable until a 100-node environment exists.

---

## 12. Status

> # M35-GREEN (audit complete) — 100-node construction NOT authorised by this audit
> Three blockers are named, two of them structural and one scientific. The harness is read-only
> and reproducible.

---

## 13. Exact next optimized decision

> ## Take R-3 first as a ruling, and R-1 as the next implementation milestone
> **R-3 (Director):** decide how an acceptable configuration is defined when all-simple-path
> enumeration is infeasible. Until that is settled, a 100-node fixture has no definition of
> acceptance, and building one would prejudge the answer.
>
> **R-1 (implementation, independent):** repair D2 on the existing 20-node substrate, with a
> gate measuring the before/after difference. It is one line, it is verifiable today, and no
> FutureScore question at any N is answerable without it.

**Not recommended:** building the 100-node graph now. **Not recommended:** activating the
executive controller or touching trajectory-seed accounting for this objective — neither blocks it.

---

Believe in yourself and keep going
