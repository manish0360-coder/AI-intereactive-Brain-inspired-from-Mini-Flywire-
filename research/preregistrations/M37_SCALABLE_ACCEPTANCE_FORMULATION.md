# M37 — Scalable Acceptance / Oracle Formulation Gate

**Status:** FORMULATION ONLY (PASS 1 source audit + formulation, PASS 2 independent verification)
**Milestone:** M37
**Date:** 2026-09-16
**Authority:** Research Director — *M37 — SCALABLE ACCEPTANCE / ORACLE FORMULATION GATE*
**Builds on:** M35 at `c8db982`; independent review of M35 (Gemini) treated as a proposal to audit

**No implementation. No production, experiment, protocol or registry change. No seed consumed,
no configuration generated, no experiment run, no future-study preregistration. Not pushed.**

---

## 1. Verdict

> # M37-YELLOW
> **An EXACT, polynomial-time reformulation of the acceptance predicates exists, and the oracle
> does not need to change at all.** Neither requires approximating or redefining what R1 and R2
> accept. Both equivalences were checked by execution against the frozen `experiments/m7/env.js`.
>
> **The proposed Dijkstra redefinition does not survive as specified.** It rests on descriptions of
> R1 and R2 that are not the repository's, treats the cross-check `exhaustiveMinCost` as the oracle,
> and would create a new population where none is needed. Its one sound core — a shortest-path
> computation under a reliability metric — survives *inside* the exact formulation of R2.
>
> **YELLOW, not GREEN:** the formulation is exact, but three constants and one design choice have no
> recoverable rationale at N ≈ 100 (§11). Those are Research Director rulings, not engineering choices.

---

## 2. Repository evidence

| Quantity | Source | What it computes |
|---|---|---|
| graph | `env.js:47–64` | 20 nodes, 39 undirected entries; traversal adjacency `ADJ` in file order; `DIR_IN` directed copy for R4. **Simple graph: no duplicate pairs, no self-loops** (checked) |
| `simplePaths(goal)` | `env.js:138–157` | every simple path from every start to `goal`, as edge-index arrays, start→goal order; cached per goal |
| **R1** | `env.js:213–217` | `startsWith2 = #starts with ≥ 2 simple paths`; `R1 = startsWith2 >= 6` |
| **R2** | `env.js:219–230` | per start: `minHops`; `bestShort = max ∏p over min-hop routes`; `bestLong = max ∏p over longer routes`; start counts if `bestLong > bestShort`; `R2 = r2Starts >= 1` |
| acceptance | `env.js:203–204` | `R1 ∧ R2 ∧ R3 ∧ R4 ∧ R5 ∧ G11` |
| `expectedCostToGoal` | `env.js:325–340` | Dijkstra from the goal, edge weight `1/p_e` (expected attempts), O(N²) selection |
| `reliabilityOptimalPolicy` | `env.js:342–355` | argmin over neighbours of `1/p + C(v)`, file order as final tie-break, strict `<` |
| `hopOptimalPolicy` | `env.js:357–372` | BFS hop distance on the traversal graph; argmin neighbour, file order tie-break |
| `exhaustiveMinCost` | `env.js:373–386` | min Σ1/p over enumerated simple paths — declared in source as **"AV3: independent exhaustive oracle… Deliberately a DIFFERENT algorithm from Dijkstra, so agreement is evidence"** |

**Downstream consumers (every one found):**
- **`evaluateConstraints`:**
  - protocols `c1/protocol.js`, `q1/protocol.js`, `uqa/protocol.js`, `uqb/protocol.js`;
  - M7 verifiers `verify_acceptance`, `verify_env`, `verify_M7`, `diagnose_G11`;
  - `q1/verify_q1_collection.js`;
  - `verify_m24`, `verify_m24_r1`, `verify_m25`.
- **`reliabilityOptimalPolicy` — the oracle C1's E6 rank uses** (`c1/analyze.js:31–35`):
  - C1 `analyze`, `gate`, `verify_collection`;
  - UQ-B `analyze`, `stress`;
  - M14–M17 verifiers, `m19_3/run_stress`, `verify_env`.
- **`exhaustiveMinCost`:** only the AV3 check in `m7/verify_env.js:172–182`, and M35's read-only harness.

**The frozen intent**, `research/cognitive-audit/M7_PREREGISTRATION.md:168–169`:

| | Constraint | Stated purpose |
|---|---|---|
| **R1** | ≥ 2 distinct routes to the goal from ≥ 6 start nodes | a choice exists |
| **R2** | The hop-count-shortest route has strictly lower expected reliability than at least one longer route | the hidden variable must **contradict** graph distance |

---

## 3. Evidence → Inference → Hypothesis about R1/R2

**EVIDENCE** (source and execution)
- R1 depends on **topology only**; it never reads `p`.
- On the real 20-node graph, **every non-goal start has ≥ 2 routes for every goal** (19 of 19), so
  R1 has never rejected a configuration of this graph (E1c).
- R2 compares **reliability as a product** `∏p` (one-shot traversal probability).
- The oracle minimises **expected attempts** `Σ1/p` (ERR-04). These are different objectives: in
  **40 / 40** synthetic draws some start's max-`∏p` route differs from its min-`Σ1/p` route (E4a).

**INFERENCE**
- R1 selects environments in which a routing *choice* exists; R2 selects environments in which the
  hidden reliability *contradicts* hop distance for at least one start — together, "distance alone is
  not enough".
- The historical record carries **two cost models by construction** — R2's `∏p` and the oracle's
  `Σ1/p` — and nothing in source says they were meant to be unified.

**HYPOTHESIS**
- That the successor substrate should preserve both properties as defined, rather than a simplified
  proxy. This is adopted as the design premise here; it is not proven to be the scientifically best
  premise.

---

## 4. Computational failure at scale

M35 measured, deterministically: 255,595 simple paths to one goal on the real graph (1.24 million
expansions); on synthetic graphs of matched density, **still unfinished at a 20-million-expansion
cap from N = 30 onward**. Every consumer of `simplePaths` inherits that: R1, R2 and AV3. **Nothing
else in acceptance or the oracle enumerates paths** — R3/R4/G11 are Spearman correlations over edges,
R5 is Dijkstra plus BFS, the oracle is Dijkstra.

---

## 5. Audit of the Dijkstra proposal

**Gemini’s description of R1 and R2 does not match the source.** It describes R1 as
`min_s C(s,g) < h(s,g)` and R2 as `min_s C(s,g)/h(s,g) < 0.8`. Source (§2) defines R1 as a route
*count* and R2 as a *reliability-product* comparison against hop-shortest routes, with no `0.8`
anywhere.

| Question | Finding |
|---|---|
| **A** What is compared? | R1 compares **nothing** — it counts routes. R2 compares best `∏p` among hop-shortest routes with best `∏p` among longer routes, per start |
| **B** Does Dijkstra give the reliability optimum? | **Yes, for the right weight.** For `Σ1/p` it already does (`expectedCostToGoal`). For R2's `∏p` it does with weight `−ln p`, which is **≥ 0** for `p ∈ (0,1]`, so the best walk is a simple path. The best-path problem with non-negative weights is **not NP-hard** — that claim in the review applies to longest-path or negative-cycle problems, not this one |
| **C** The hop-optimal comparator | R2's comparator is **not one path**: it is the best `∏p` among **all** hop-shortest routes. A single BFS path would change R2 |
| **D** Does the proposed R1 keep "a choice exists"? | **No.** A cost-vs-hop comparison cannot express route multiplicity; R1 is independent of `p` |
| **E** Does the proposed R2 keep its meaning? | **Only if** the comparator is the best hop-shortest route and the comparison is strict — both unstated in the proposal |
| **F** Deterministic? | Yes, given a tie rule — and ties are load-bearing (E5b) |
| **G** Computable at N ≈ 100? | Yes |
| **H** Meaningful when cost-optimal = hop-optimal? | Under the exact R2 below that case correctly yields **false** for that start. It is not undefined |
| **I** Does it collapse selection into a trivial shortest path? | The proposal as written risks it: it would replace a route-multiplicity condition by a path comparison |
| **J** Same oracle object? | **The oracle is already Dijkstra.** Replacing `exhaustiveMinCost` with Dijkstra would not "make the oracle scalable" — it would destroy AV3's independence, because AV3 exists precisely to be a *different* algorithm |

---

## 6. Alternatives compared

| | Exact quantity | Det. | Cost per goal (N nodes, E edges) | vs R1 | vs R2 | vs oracle | New population? | Verdict |
|---|---|---|---|---|---|---|---|---|
| **A** exhaustive (current) | exact | yes | exponential in N | exact | exact | exact (AV3) | — | **frozen, historical only** |
| **B** Dijkstra as proposed | single cost path vs single hop path | yes | O(N² or E log N) | **not expressible** | **changed** (single-path comparator) | **loses AV3 independence** | yes, unnecessarily | **rejected as specified** |
| **C** k-shortest paths | best among first k routes | yes | poly, needs k | approximate | may miss the longer better route | approximate | yes | rejected — `k` has no recoverable rationale, and an exact option exists |
| **D** bounded length | routes ≤ L | yes | exponential within L | approximate | approximate | approximate | yes | rejected — still exponential, `L` unjustified |
| **E** Monte Carlo sampling | estimate | **no** | poly | probabilistic | probabilistic | probabilistic | yes | rejected — acceptance would become stochastic |
| **F** **exact structural reformulation** | **identical to A in real arithmetic** | yes | **O(N·(N+E))** | **exact** | **exact** | **oracle unchanged; AV3′ = Bellman-Ford** | **no, not by the predicate** | **survives** |

---

## 7. Surviving formulation — exact specification

### 7.1 Graph population
An undirected, simple, connected-or-not graph `G = (V, E)` with integer node ids, edges indexed in a
fixed file order, and a per-edge reliability `p_e ∈ (0, 1]`. **How that graph is generated at
N ≈ 100 is not defined by this milestone** (RULING-2).

### 7.2 R1′ — route multiplicity, exact

> For `s ≠ g`: `s` has ≥ 2 distinct simple paths to `g` ⟺ some block on the block-cut-tree route
> from s to g has ≥ 3 vertices.

*Why:* every simple s–g path passes through the same sequence of blocks (biconnected components),
entering and leaving each at fixed articulation vertices. A block that is a single edge admits one
route through it; a block with ≥ 3 vertices is 2-connected and, by Menger's theorem, admits ≥ 2
internally disjoint routes between any two of its vertices. The number of paths is the product over
the route's blocks, so it is ≥ 2 exactly when one factor is.

`R1′ = #{ s ≠ g : criterion holds } ≥ R1_MIN`. Computed with Tarjan's biconnected components,
O(N + E), plus one block-cut-tree walk per start. **Unreachable start: 0 paths, criterion false.**

**Verified:** agrees exactly with the enumerating definition on **617** (graph, goal) pairs — the real
graph for all 20 goals and 60 synthetic graphs with bridges and trees — exercising 3,394 starts that
satisfy it and 2,328 that do not (E1a, E1b).

### 7.3 R2′ — reliability contradicts hop distance, exact

For each start `s` reachable from `g`:
- `h(s)` = BFS hop distance on the traversal graph;
- `R_hop(s)` = max over **hop-shortest** routes of `∏p` — a max-product DP over BFS layers, taking
  only edges `u→v` with `h(v) = h(u) − 1`;
- `R*(s)` = max over **all** simple routes of `∏p` — Dijkstra from `g` with weight `−ln p_e ≥ 0`.

> `R2(s) ⟺ R*(s) > R_hop(s)`

*Why:* `R* ≥ R_hop` always. If `R* > R_hop`, no hop-shortest route attains `R*`, so the optimum is a
longer route and `bestLong ≥ R* > bestShort`. Conversely `bestLong > bestShort` gives
`R* ≥ bestLong > bestShort`. Zero-weight edges (`p = 1`) cannot make a cycle beneficial.

`R2′ = #{ s : R2(s) } ≥ R2_MIN`.

**Numerical rule:** both `R*(s)` and `R_hop(s)` are recomputed as `∏p` **along their arg-optimal routes
in start→goal order**, exactly as `env.js` multiplies, and compared with **strict >**. The only
possible disagreement with the enumerating definition is a sub-ULP near-tie between two distinct
routes; none occurred.

**Verified:** `r2Starts` from the **frozen `env.evaluateConstraints` itself** equals R2′ on all **100**
real-graph draws (4 goals × 25 synthetic reliability vectors), and per-start agreement holds on 1,080
further synthetic pairs, with 905 satisfying starts and 2,075 not (E2a–E2c). **Ties are load-bearing:**
on an exact tie (all `p = 1`), a non-strict `≥` disagrees on 19 starts while strict `>` agrees
everywhere (E5b).

### 7.4 Oracle

**The oracle does not change.** It remains `C(u) = min_{(u,v)} [1/p_uv + C(v)]`, solved by Dijkstra from
the goal (`expectedCostToGoal`), with the policy taken by strict `<` and connections-file order as the
final tie-break (`reliabilityOptimalPolicy`). Weights `1/p ≥ 1` are positive, so the optimum is a simple
path and no enumeration is needed.

**AV3′ — the independent cross-check at scale:** Bellman-Ford on the same `Σ1/p` weights, an
edge-relaxation algorithm independent of Dijkstra's label-setting, so agreement stays evidence.

**Verified:** the frozen Dijkstra oracle equals the frozen AV3 exhaustive minimum on 1,200
(start, goal, draw) values (max |diff| 8.88e-16), and Bellman-Ford reproduces it exactly (E3a, E3b).
A wrong weight (`p²`) disagrees, so the check is not vacuous (E5c).

### 7.5 Tie, unreachable and goal handling

| Case | Rule |
|---|---|
| **Unreachable start** | R1′ false; R2′ false; oracle cost `∞`; excluded from decision states it cannot reach |
| goal | excluded from every per-start count (`s ≠ g`), exactly as `simplePaths` does |
| R2′ tie | **strict >** after recomputing both products along arg-optimal routes in start→goal order |
| oracle tie | strict `<` over neighbours in connections-file order — **unchanged** |
| deterministic order | edge index order for adjacency; Dijkstra selection by lowest cost, then node order |

### 7.6 Computational burden at N ≈ 100 (INFERENCE, not measured here)

With the M35-measured mean degree 3.9, `E ≈ 195` at N = 100. Per goal:
- R1′: O(N + E) ≈ 300 steps for blocks, plus ≈ N·(N+E) ≈ 3·10⁴ for per-start walks;
- R2′: Dijkstra O(N²) ≈ 10⁴ + DP O(E);
- oracle: O(N²) ≈ 10⁴;
- AV3′: O(N·E) ≈ 2·10⁴.

That is about 10⁵ elementary steps per configuration, **versus an exhaustive enumeration that M35 found
still unfinished after 2·10⁷ expansions at N = 30**. **No N = 100 run was executed by this milestone.**

---

## 8. Development-vs-study boundary

**This is a successor DEVELOPMENT substrate.** Its acceptance predicates are *defined* identically to
M7's, but it runs on a different graph with constants not yet ruled, so its population is
**NOT comparable to C1 or UQ-B** unless a future preregistered study establishes comparability. It is
**not** C1, **not** UQ-B, **not** a replication of C1, **not** a reanalysis of UQ-B, and it provides **no**
evidence for or against FutureScore, planning, cognition or mechanism validity. No claim about any of
those is made here.

**Remains historical and frozen:** `experiments/m7/env.js`, `simplePaths`, `exhaustiveMinCost`, the C1
and UQ-B protocols, data and results, every registered seed block. The exhaustive definitions stay the
authoritative record for every past study.

---

## 9. What must be preregistered before any future study

- the graph-generation rule and the goal-selection rule (RULING-2);
- the numeric constants (RULING-1);
- R1′, R2′, the oracle and AV3′ exactly as in §7, including the tie and unreachable rules;
- that both cost models are preserved (RULING-3);
- the seed territory (free: 0–894999) and the statement that the population is non-comparable.

---

## 10. PASS 1 outcome

| | |
|---|---|
| candidate formulations | A exhaustive, B Dijkstra-as-proposed, C k-shortest, D bounded, E sampling, F exact structural |
| rejected | B (misdescribes R1/R2; destroys AV3 independence; creates an unnecessary population), C and D (approximate, unjustified parameters), E (stochastic acceptance) |
| surviving | **F** — exact R1′ and R2′; unchanged oracle; Bellman-Ford as AV3′ |
| historical | A stays frozen and authoritative for every past study |

---

## 11. Unresolved — requires Research Director ruling

- **RULING-1 — constants at N ≈ 100.** Each has no recoverable rationale for scaling. Keep them
  absolute, or state them as fractions?
  - `R1_MIN = 6` starts (6 of 19 at N = 20; would be 6 of 99);
  - `R2_MIN = 1` start;
  - R5's ≥ 4 differing decision states;
  - `N_UNRELIABLE = 13 = floor(0.35 × 39)`;
  - `GOALS = [8, 12, 16, 19]`.

  `G11_THRESHOLD = 0.10` does have a recoverable rationale (it reuses the frozen R3/R4 threshold).
- **RULING-2 — graph and goal generation.** The 20-node graph was hand-authored; no source defines how a
  100-node development graph or its goals are chosen. The formulation is exact for any graph, but the
  population depends entirely on this rule.
- **RULING-3 — preserve both cost models?** R2 uses `∏p`, the oracle uses `Σ1/p`, and they select
  different routes (E4a). This milestone preserves both exactly; unifying them would be a scientific
  redefinition and should be ruled on, not done silently.

---

## 12. Exact M38 boundary

**In:**
- a **new, additive** module taking `(nodes, edges, goals, p)` as arguments, implementing R1′, R2′, the
  Dijkstra oracle and Bellman-Ford AV3′ exactly as §7;
- a verifier proving, against the frozen `env.js` on the 20-node graph, that R1′ = R1, R2′ = `r2Starts`,
  oracle = `expectedCostToGoal` and AV3′ = oracle, with mutation tests;
- tractability measured on **synthetic** graphs up to N ≈ 100.

**Out:**
- any change to `env.js`, C1, UQ-B, registries, production or the RNG;
- `makeConfig` on any seed, any configuration population, any graph generator, any constant for
  N ≈ 100 (RULING-1/2), any preregistration, and any FutureScore measurement.

---

## 13. Status

> # M37-YELLOW
> The exact scalable formulation exists and is verified against the frozen code; the population it
> would define at N ≈ 100 still needs RULING-1, RULING-2 and RULING-3.

---

Believe in yourself and keep going
