# M38-P0 — Minimal Scalable Development Graph Design

**Status:** FORMULATION ONLY (PASS 1 source + design audit, PASS 2 analytic verification)
**Milestone:** M38-P0
**Date:** 2026-09-16
**Authority:** Research Director — *M38-P0 — MINIMAL SCALABLE DEVELOPMENT GRAPH DESIGN*
**Builds on:** M37 (accepted) at `9f07464`

**No implementation, no graph generated, no configuration, no seed, no experiment, no change to
`env.js`, C1 or UQ-B. Not pushed.**

---

## 1. Verdict

> # M38-P0-GREEN
> **One design is recommended and it is defensible without a fallback: five replicas of the frozen
> 20-node graph, joined pairwise through two fixed port nodes, with goals chosen from the nodes the
> frozen agent can always reach.** It is deterministic, uses no random number generator and no seed,
> keeps the audited local structure exactly, and — the property that decides the design — leaves the
> frozen agent **no dead state** with respect to any goal.

---

## 2. Repository evidence

| # | Fact | Source |
|---|---|---|
| Ev-1 | `canReachGoal(k, goal, maxDepth = 4)`; its DFS returns false at `depth === 0` **before** testing the goal, so a candidate is admissible **iff it is within 3 hops of the goal** | `main.js:1128–1175` |
| Ev-2 | both candidate paths apply that guard, and `if (choices.length === 0) return;` — a node more than 4 hops from the goal has **no admissible move**: a **dead state** for the frozen agent | `main.js:1678, 2425, 2497` |
| Ev-3 | base graph: 20 nodes, 39 undirected edges, no duplicate pair, no self-loop, connected and **2-connected** | `neurons.json`, `connections.json` |
| Ev-4 | 5 clusters of 4 nodes (perception, memory, reasoning, action, learning); 20 intra-cluster and 19 inter-cluster edges; degree 3–6 | `neurons.json` |
| Ev-5 | radius 3, diameter 4; historical goals `{8, 12, 16, 19}` — one each from memory, reasoning, action, learning — degrees `{5, 5, 3, 3}`, eccentricities `{3, 4, 4, 3}` | computed from the files |
| Ev-6 | every historical goal has eccentricity ≤ 4, so the M7 substrate has **no dead state** | computed |
| Ev-7 | goals rotate as `goal = GOALS[configIndex mod 4]`; **no rationale for the specific ids is recorded** | `M7_PREREGISTRATION.md:186` |
| Ev-8 | M37: R1′, R2′, the Dijkstra oracle over `Σ1/p` and Bellman-Ford AV3′ are exact for **any** simple graph | `M37_SCALABLE_ACCEPTANCE_FORMULATION.md` |

---

## 3. Recommended graph-generation rule

| Element | Rule |
|---|---|
| **node count** | `N = 5 × 20 = 100`: five modules `m = 0…4`, each a copy of the frozen base graph |
| **node ids** | `id(m, v) = 20·m + v` for base id `v ∈ 1…20`, giving ids 1–100; each node keeps its base `cluster` label |
| **intra-module edges** | every base edge `(a, b)` of `connections.json` is copied into every module as `(id(m,a), id(m,b))` |
| **inter-module edges** | ports P = {8, 19}: for every module pair `i < j` and each port `v ∈ P`, one edge `(id(i,v), id(j,v))` |
| **edge count** | `5 × 39 + 2 × C(5,2)` = **215 edges** |
| **connectivity** | connected (base connected, every module pair linked). No articulation point is introduced (argued, not executed here: each module is 2-connected and every module pair is joined through two distinct ports; M38 must confirm it) |
| **degree** | unchanged 3–6 for non-port nodes; port base-8 nodes 9, port base-19 nodes 7; mean 4.30 |
| **duplicates / self-loops** | none, by construction: the base has none, inter-module edges join different modules, and each (pair, port) is used once |
| **deterministic order** | edge index = module 0's edges in `connections.json` order, then modules 1–4 likewise, then inter-module edges ordered by `(i, j)` ascending, port 8 before port 19. Adjacency and every tie-break inherit this order, exactly as M7 inherits file order |
| **randomness** | the rule uses no random number generator and no seed |

**Why ports 8 and 19.** Both are historical goals with base eccentricity 3. Joining modules through
them makes every node of every module reachable from them in at most 4 hops. With the
highest-degree centres `{6, 17}` as ports instead, the same goals would have dead states (V1).

---

## 4. Recommended goal-selection rule

> `GOALS = [(0, 8), (1, 19), (2, 8), (3, 19)]`, i.e. ids `[8, 39, 48, 79]`, assigned as
> `goal = GOALS[configIndex mod 4]` — the M7 rotation, unchanged.

**The constraint that decides it: every goal must have eccentricity ≤ 4**, or some starts are dead
states for the frozen agent (Ev-1, Ev-2). It is inherited, not invented: the M7 substrate satisfies it
for every goal (Ev-6).

- Computed from base distances, each goal above has eccentricity **4** in the replica (R3).
- Under this wiring **exactly {8, 17, 19} qualify** as goals; 17 is adjacent to both ports (R4).
- **12 and 16 cannot be goals in any base-distance-preserving replica** — that is, one whose
  inter-module edges join counterpart nodes. Even with every node as a port, their eccentricity is ≥ 5
  (R5).
- **Design choice:** 8 and 19 rather than 17, because both are historical goals. Four goals across four
  different modules mirrors M7's four goals across four different clusters.

**Disclosed consequence:** goal degrees become `{9, 7, 9, 7}` instead of `{5, 5, 3, 3}`, and no
eccentricity-4 or degree-3 goal remains. This is forced by the dead-state constraint within this
family, not chosen.

---

## 5. Reliability interface and predicate evaluation

| | |
|---|---|
| reliability | `p: number[215]` indexed by edge index (§3). **How `p` is drawn is not defined here** — it belongs to a configuration generator and to RULING-1 |
| R1, R2 | M37's R1′ (block-cut tree) and R2′ (`R*(s) > R_hop(s)`, strict) on this graph |
| oracle | Dijkstra over `Σ1/p` from the goal; AV3′ Bellman-Ford. **∏p and Σ1/p are not unified** |
| R3, R4, G11 | Spearman over the 215 edges, as in M7 |
| R5 | reliability-optimal vs hop-optimal policy, over decision states: a decision state is a non-goal node with ≥ 2 neighbours (`env.js:319`, ERR-03); minimum degree is 3, so 99 decision states per goal |

---

## 6. What is inherited and what is new

| Inherited from M7 exactly | Intentionally new |
|---|---|
| local topology of every module (the audited 20-node graph) | five modules and the 20 port edges |
| cluster labels | node ids 1–100 |
| file-order tie-breaking | goal ids 8, 39, 48, 79 |
| goal rotation `GOALS[configIndex mod 4]` | goal degree composition `{9, 7, 9, 7}` |
| R1–R5 and G11 definitions, via M37's exact forms | — |
| the two cost models, ∏p and Σ1/p, kept separate | — |

---

## 7. Why it is sufficient for the immediate research goal

- **EVIDENCE:** the state space is five times larger; the cross-module distance reaches 6 hops, beyond
  the base diameter 4, so reaching a goal from another module needs a route through a port; every goal
  remains within the frozen agent's admission budget from every start.
- **INFERENCE:** that gives FutureScore-style mechanisms a task in which the goal is regularly beyond
  immediate look-ahead, without silently breaking the frozen agent's admission gate.
- **HYPOTHESIS:** that this structure is useful for studying look-ahead and route choice. Nothing here
  establishes it.
- **DESIGN CHOICE:** replicas instead of an invented random-graph distribution, because the repository
  offers evidence for the base topology and none for any generative distribution.

**Known limitation:** the modules are isomorphic. Per-configuration edge reliabilities
differ across modules, so hidden structure is not replicated — but a future study must consider
whether symmetry matters for its question.

---

## 8. Fallback

**None.** The design needs no seed, no distribution and no invented constant, and its one forced
consequence is disclosed.

---

## 9. Research Director ruling

**No new ruling is required** by the graph or goal rule. **RULING-1 from M37 remains open** and still
gates any configuration population: the reliability constants (`N_UNRELIABLE` for 215 edges, P ranges),
`R1_MIN`, `R2_MIN` and R5's "≥ 4 differing decision states".

---

## 10. Boundary

This is a **DEVELOPMENT substrate only**: not C1, not UQ-B, not a replication or reanalysis of either,
non-comparable to both, and not evidence for or against FutureScore, planning or cognition. No claim
about any of those is made here. `experiments/m7/env.js`, C1, UQ-B, all data and every seed block remain
frozen.

---

## 11. Exact M38 implementation boundary

**In:**
- one additive module that builds this graph deterministically from `neurons.json` and
  `connections.json` exactly as §3–§4, and exposes nodes, edges, adjacency and `GOALS`;
- M37's exact R1′/R2′/oracle/AV3′ operating on it;
- a verifier that builds the graph and **confirms by BFS** every analytic property checked here — 100
  nodes, 215 edges, simple, connected, no articulation point, goal eccentricities 4, the qualifying goal
  set `{8, 17, 19}` — plus equivalence of R1′/R2′/oracle against frozen `env.js` on the 20-node graph.

**Out:**
- reliability draws or any configuration;
- any constant awaiting RULING-1;
- seeds, `makeConfig`, agent runs, FutureScore measurement, preregistration;
- any change to `env.js`, `main.js`, C1, UQ-B or registries.

---

## 12. Status

> # M38-P0-GREEN
> A single deterministic, seed-free design survives analytic verification. RULING-1 (from M37) is the
> only open decision, and it gates configurations, not the graph.

---

Believe in yourself and keep going
