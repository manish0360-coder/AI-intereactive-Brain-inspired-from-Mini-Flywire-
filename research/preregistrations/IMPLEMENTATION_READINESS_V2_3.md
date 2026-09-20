# FutureScore V2.3 — Implementation Readiness (Pass 1, design only)

**Kind:** implementation-design audit. **No production file modified, nothing committed, nothing pushed, no experiment, no seed.**
**Author:** Chief Systems Engineer · **Date:** 2026-09-20
**HEAD audited:** `9df7274b749b97b0c5e05487dea08a61ed0fc805` (parent `4fb5c74`) · working tree clean.
**Frozen authorities:** V2.3 contract (`6a727d3`), V2.2 input contract, boundary record (`4fb5c74`), FS-LN-01 lineage (`9df7274`).
**Labels:** every statement is **FACT** (verified at this HEAD), **INFERENCE**, **DESIGN DECISION**, or **OPEN QUESTION**. Nothing here claims V2.3 is validated; this establishes readiness only.

---

## A. Executive status

**GO — Pass-1 design FROZEN by Director ruling.** The change surface is two expressions in `main.js` plus the
body of one function in `render/planning.js`, with zero dependencies and zero changes to the boundary, candidate
admission, or any historical artifact. The three findings raised by this audit are now **resolved**; none was a
contract defect and the contract is unchanged.

| # | Finding | Director ruling |
|---|---|---|
| **OQ-1** | In the all-success/unseen baseline, FS reduces to `−d(k,g)`, so projected FutureScore overlaps the existing `goalGradientBoost` (`main.js:1975-1980`, ×2.0 at `render/scoring.js:352`). | **ACKNOWLEDGED, NOT A BLOCKER.** `goalGradientBoost` is neither removed nor modified, the contract is not weakened, and the mechanism is not redesigned. Recorded as a post-implementation empirical question (§O). |
| **OQ-2** | `main.js:1226 goalDistance()` must not be reused: it augments the graph with learned `transitions` (`main.js:1256-1262`) and is depth-limited. | **APPROVED.** Build a private BFS in `planning.js` over `userData.neighbors` only — no learned transitions, no depth limit, no external graph dependency, module-private and **not exported**. |
| **OQ-3** | Behaviour when `D < 1`. | **RESOLVED: `D >= 1` is a contract invariant / precondition (F27), not a case to be handled.** No behaviour is invented for `D < 1`, and `P(undefined) = 0` is **not** repurposed as a `D = 0` semantic. The verifier asserts `D >= 1` for the production topology; `−∞` and `P(−∞) = 0` are exercised by synthetic disconnected graphs. |

## B. Exact source trace (verified at `9df7274`)

```
render/connections.js:120,125   n1.neighbors.push(id2); n2.neighbors.push(id1)     ← the known graph, both directions
   │
main.js:1428  function runPrediction(startKey)                                      ← read-only prediction path
   ├─ candidate loop
   ├─ main.js:1703   if (goalNeuronId !== null && !canReachGoal(k, goalNeuronId)) → candidate PRUNED
   │                 canReachGoal defined main.js:1153, maxDepth = 4 (P-2, frozen as-is)
   ├─ main.js:1877   const targetNeuronForFuture = findNeuronById(k)
   ├─ main.js:1879-1888  imaginedFuture = futureScore(neuron, goalNeuronId, rewards, penalties, curiosityMap, 3)
   │                 render/planning.js:175-362  futureScore  → reads rewards/penalties/curiosityMap (:259-274)
   │                                             → calls lookAheadScore (:280-287), weight 0.8 (:304)
   │                 render/planning.js:31-167   lookAheadScore → embeddings.similarity
   ├─ main.js:1898-1899  const futureBonus = Math.min(imaginedFuture * 4, 20)       ← THE PROJECTION SITE
   ├─ main.js:1961-1980  goalGradientBoost (uses goalDistance, main.js:1226)        ← separate distance signal
   ├─ main.js:2119   futureBonus passed into calculateDecisionScore({...})
   │                 render/scoring.js:84 param · :176 liveFutureBonus · :350 ['futureBonus', futureBonus*1.2] · :406 sum
   ├─ main.js:2276-2296  arbitratedScore
   ├─ main.js:2398   const sorted = choices.sort((a, b) => b.weight - a.weight)     ← stable sort (ES2019)
   └─ main.js:2403   const bestChoice = sorted[0]
                          │
                          ▼ action executed later in runAgent
main.js:4922-4928  _m7Traversed = __M7_ENV__ ? env.attempt(u,v) : true              ← outcome becomes authoritative
main.js:4966-4968  recordTraversalOutcome(_m7From, _m7To, _m7Traversed)             ← the ONE boundary writer
render/traversalRecord.js  recordOutcome → module-private Map; recordFor(from,to) → { a, s }   (currently UNREAD)
```

**FACT.** No function declaration exists between `main.js:1428` and `main.js:1885`, so the `futureScore` call is
inside `runPrediction` — the path UQ-B G12 established contains no learning-mutating call.
**FACT.** Exactly one executable `futureScore` call exists in production (`main.js:1880`), and exactly one
executable boundary writer (`main.js:4967`) — both re-verified by the FS-LN-01 gate's scanner.

### B.1 Static topology facts (read from the data files; no agent, no seed)

| Fact | Value |
|---|---|
| nodes / undirected edges / directed keys | 20 / 39 / 78 |
| **D = largest finite pairwise hop distance** | **4** (attained 1↔14) |
| unreachable ordered pairs | **0 — the production graph is connected** |
| duplicate connections / self-loops in data | 0 / 0 |

**INFERENCE (important).** Because the production graph is connected, `T = −∞` and `P(−∞) = 0` are
**unreachable in production**. They remain contract requirements and must be tested synthetically.

## C. Exact change surface (minimum)

### A. `render/planning.js`
- **Changes:** the body and signature of `futureScore` only.
- **Unchanged:** `lookAheadScore` (§E), the `search.js` import.
- **Exports unchanged:** `['futureScore', 'lookAheadScore']` — pinned by `verify_G9_successor.js`. New helpers
  (BFS distance, D) are **module-private, not exported** (DESIGN DECISION), or the G9 successor fails.
- **API after V2.3 (DESIGN DECISION):** `futureScore(neuron, goalNeuronId)` → `number | undefined`, returning
  `undefined` when no goal, `0` when the candidate is the goal, a value in `[−∞, 0]` otherwise. `H = 3` becomes a
  module constant, not a caller argument (F15 requires one global constant).

### B. `main.js`
- **Two expressions only:** the call (`1879-1888`) and the projection (`1898-1889`→`1899`).
- **`futureBonus` (DESIGN DECISION):** keep the variable name and its role as "projected future planning bonus",
  and keep its range `[0, 20]`. It changes *meaning* (now a projection of a non-positive planning score) but not
  its type, range, or downstream contract, so `main.js:2119` and all of `render/scoring.js` stay untouched.
- **`imaginedFuture` (DESIGN DECISION):** retain as the raw FS holder so the raw value stays observable.

### C. `render/traversalRecord.js` — **NO CHANGE.** Consumer imports `recordFor` only.
### D. Candidate admission — **NO CHANGE.** `canReachGoal` is not touched (P-2).
### E. `lookAheadScore`
**FACT.** After V2.3, `futureScore` no longer calls it, and `main.js:180` imports it without calling it.
**DESIGN DECISION:** retain the export and the import. It is required by the G9 successor pin and must be
documented as intentionally retained, or a future reader will "clean" it and trip the gate.
### F. Dependencies — **zero remain sufficient** (§K).

## D. Frozen contract mapping

| Contract item | Where it lands |
|---|---|
| F1–F5 `c_hat=(a+1)/(s+1)` | private helper in `planning.js`, from `recordFor(v,w)` |
| F13 `ε = −c_hat` | inside the recursion |
| F15 `H = 3` | module constant |
| F17–F19 terminal | private BFS over `userData.neighbors`; `−d`, `0` at goal, `−∞` when no path |
| F21/F22 range and monotonicity in H | property of the recursion; verified by gate |
| F23–F25 projection | `main.js:1899`, `B = 20`, `S = D` |
| F28/F29 `P(−∞)=0`, `P(undefined)=0` | `main.js` projection expression |
| F34–F40 forbidden inputs, purity | enforced by removing the three map parameters and by the gate's static scan |

## E. Data-flow proof

| Arrow | Owner | Input | Output | Mutation | Undefined state | Failure behaviour |
|---|---|---|---|---|---|---|
| env outcome → boundary | `main.js:4922-4968` | `(u,v,_m7Traversed)` | one record event | writes the private Map only | none | non-edge pairs rejected by adjacency validation |
| boundary → `recordFor` | `traversalRecord.js` | `(from,to)` | `{a,s}` **copy** | none | unseen edge → `{0,0}` | never throws; unknown pair reads `{0,0}` |
| `recordFor` → `c_hat` | `planning.js` (new) | `{a,s}` | `≥ 1` | none | `{0,0}` → `1` | division impossible: denominator `s+1 ≥ 1` |
| `c_hat` → recursion | `planning.js` (new) | edge costs + adjacency | `FS ∈ [−∞,0]` or `undefined` | none | no goal → `undefined` | disconnected → `−∞` |
| `FS` → projection | `main.js:1899` | `FS`, `D` | `[0,20]` | none | `undefined`/`−∞` → `0` | `D ≥ 1` asserted (OQ-3) |
| projection → score | `scoring.js:350,406` | `futureBonus` | weighted term | none | — | unchanged contract |
| score → action | `main.js:2398-2403` | weights | `bestChoice` | none in `runPrediction` | — | stable sort keeps ties deterministic |

**Proof that forbidden inputs are unreachable — by import and call graph, not by name search:**
- **FACT.** After the change, `planning.js` imports exactly `findNeuronById` (`search.js`), `similarity`
  (`embeddings.js`, used only by `lookAheadScore`) and `recordFor` (`traversalRecord.js`). None of those modules
  exports or transitively reaches `rewards`, `penalties`, `curiosityMap`, `Q`, the oracle, RNG, or a clock.
- **FACT.** `rewards`/`penalties`/`curiosityMap` reach `futureScore` **only** as parameters today
  (`planning.js:179-181`); removing the parameters removes the only channel.
- **FACT.** `traversalRecord.js` imports only `search.js`; it holds no RNG, clock, or instrumentation.
- **INFERENCE.** Therefore the post-change `futureScore` can read only: the neuron map (topology), the goal id,
  and the boundary record. `similarity` remains reachable from the module but not from `futureScore`'s call graph
  — the gate must assert this structurally (call-graph, not grep).

## F. Graph semantics

| Need | Source | Status |
|---|---|---|
| known neighbours | `neuron.userData.neighbors`, built at `connections.js:120,125` | **sufficient, unchanged** |
| node identity | integer ids from `neurons.json` | **FACT:** stable, unique |
| edge identity | directed `from->to`; evidence keyed directionally by the boundary | sufficient |
| directedness | **FACT:** adjacency is symmetric (both directions pushed); evidence is directional | no change needed |
| goal identity | `goalNeuronId` | passed in |
| pairwise hop distance | **must be built** (§K) | **BUILD:** private BFS |
| finite vs disconnected | BFS reachability | `−∞` when unreached |

**OQ-2 / FACT.** `main.js:1226 goalDistance()` is **not** a pure topology function: lines 1256-1262 add
`transitions` edges with `strength > 1` to the frontier, and it is depth-limited (`maxDepth = 8`), returning `-1`
for "unreachable within budget". **Reusing it would inject learned transition memory into FutureScore**, which
V2.2/V2.3 forbid. **DESIGN DECISION:** do not reuse it; do not modify it.

**The estimator stays edge-local and the recursion stays path-based**: `c_hat` is computed per directed edge
inside the recursion; distances are used only at terminals. No node-scoring transformation occurs.

## G. Estimator semantics (from `traversalRecord.js`, unchanged)

| Case | `recordFor` | `c_hat` |
|---|---|---|
| unseen edge | `{a:0,s:0}` | 1 |
| one success | `{1,1}` | 1 |
| one failure | `{1,0}` | 2 |
| n successes | `{n,n}` | 1 |
| n failures | `{n,0}` | n+1 |
| mixed (a=10,s=5) | `{10,5}` | 11/6 ≈ 1.833 |
| invalid / non-edge pair | `{0,0}` (never written) | 1 |
| reverse edge | independent key | independent |
| self-edge | never written | 1 (never consulted: recursion excludes `v→v`) |

**FACT.** `recordFor` returns a fresh copy, so a consumer cannot mutate stored evidence. **The existing API is
sufficient without modification.**

## H. Recursion semantics (H = 3)

```
FS(k | g):
  if g is null/undefined        → undefined
  if k === g                    → 0
  d(·) = BFS distances from g over userData.neighbors      (computed once per call)
  return F(k, H, {k})

F(v, h, P):
  if v === g                                → 0
  if h === 0 or no neighbour w ∉ P          → T(v) = (d has v) ? −d(v) : −∞
  else                                      → max over w ∉ P, in neighbour-array order, of
                                               [ −c_hat(v,w) + F(w, h−1, P ∪ {w}) ]
```

**Resolved:** base/terminal/goal/no-neighbour cases are all specified by V2.3 §4; cycles are prevented by the
simple-path set seeded with `{k}`; a component without the goal yields `−∞` at its terminal and propagates.
**DESIGN DECISION (tie handling):** iterate `userData.neighbors` in array order and replace the incumbent only on
**strictly greater** value, so the earliest-listed neighbour wins a tie. **FACT:** neighbour order is deterministic
(built from `connections.json` file order, no duplicates, no self-loops).

**Ambiguities found: none material.** Two were checked and resolved by the contract text itself: the simple-path
set includes the candidate (V2.3 §4 `F_H(k; {k})`), and `v === g` absorbs at any depth. **OQ-3** (below) is the
only genuinely unspecified case and it concerns the projection, not the recursion.

## I. Projection integration

Replace `main.js:1899` with `P(FS) = B·S/(S − FS)`, `B = 20`, `S = D`.

| Case | Value with D = 4 |
|---|---|
| `FS = 0` (candidate is the goal) | `20` |
| `FS = −1` | `16.00` |
| `FS = −2` | `13.33` |
| `FS = −4` | `10.00` |
| `FS → −∞` | `0` |
| `FS` undefined (no goal) | `0` |
| `S = 0` | **excluded by precondition — see below** |

**FACT.** `S = D = 4 > 0` in the production graph.
**OQ-3 — RESOLVED (Director ruling).** `D >= 1` (F27) is a **contract invariant and precondition**, not a case
requiring behaviour. The implementation does not invent a `D < 1` path, and `P(undefined) = 0` is **not**
repurposed as a `D = 0` semantic. The verifier **asserts `D >= 1` for the production topology**; the `−∞` and
`P(−∞) = 0` requirements are exercised on synthetic disconnected graphs instead.
**Unit/meaning:** `futureBonus` remains a non-negative bonus in `[0, 20]` entering `render/scoring.js:350` at
weight ×1.2, exactly as today.

## J. Numerical examples (hand-worked from the frozen equations; D = 4, H = 3, B = 20)

| # | Case | Evidence | FS | P |
|---|---|---|---|---|
| 1 | candidate **is** the goal | — | `0` | `20.00` |
| 2 | unseen one-hop edge to goal | `{0,0}` | `−1 + 0 = −1` | `16.00` |
| 3 | successful one-hop edge to goal | `{5,5}` | `−1` | `16.00` |
| 4 | failed one-hop edge to goal | `{5,0}` | `−6` | `8.00` |
| 5 | two-hop path, all unseen | `{0,0}` ×2 | `−2` | `13.33` |
| 6 | three-hop path, all unseen | `{0,0}` ×3 | `−3` | `11.43` |
| 7 | competing: reliable 2-hop vs flaky 1-hop | `{4,4}`×2 vs `{4,1}` | `max(−2, −2.5) = −2` | `13.33` |
| 8 | disconnected candidate | any | `−∞` | `0` |
| 9 | cycle candidate (only neighbour already in P) | any | terminal `−d(v)` | per `d` |
| 10 | terminal fallback at h=0, `d(end)=2`, two unseen steps | `{0,0}`×2 | `−2 + (−2) = −4` | `10.00` |

**Check (F10/§2.4 of V2.3):** with all-success or unseen evidence, every row reduces to `FS = −d(k,g)`.

> **RANGE CLARIFICATION (Director ruling) — do not freeze a topology-specific range as an invariant.**
> The **formal contract is `FS ∈ [−∞, 0]` and `P(FS) ∈ [0, 20]`**. The `[10, 20]` span implied by rows 1–6 and 10
> is a **baseline artifact of the current `D = 4` topology under trivial (unseen/all-success) evidence only**.
> Nontrivial learned evidence raises `c_hat` above 1, lowers `FS`, and therefore produces projected values below
> that baseline — row 4 already shows `P = 8.00`. **The successor verifier must test the formal contract and must
> not encode `[10, 20]`.**

**Non-degeneracy under the trivial-evidence baseline:** the minimum adjacent gap is `16.00 − 13.33 = 2.67`, above
the N3 floor `B/(4D) = 1.25` — no saturation, unlike the M40 cap.

## K. Focused reuse audit (only the three new components)

| Component | Candidates | Decision | Reason |
|---|---|---|---|
| hop-distance helper | `main.js:1226 goalDistance` | **DO NOT USE** | mixes learned `transitions` into topology (OQ-2); depth-limited to 8; lives in `main.js`, not importable |
| | `graphlib`, `ngraph.path`, `graphology` | **DO NOT USE** | a dependency for ~15 lines of BFS on a 20-node graph; adds supply-chain surface the audit says to avoid; MiniFlyWire stays dependency-free |
| | **private BFS in `planning.js`** | **BUILD FROM SCRATCH** | ~15 lines, no dependency, exactly the contract's semantics (full known graph, `−∞` when unreached) |
| bounded-horizon recursion | existing `futureScore` DFS skeleton | **ADAPT** | keep the visited-set discipline (`planning.js:236-242,337`), replace the value computation |
| directed edge-cost lookup | `recordFor` | **REUSE AS-IS** | already returns `{a,s}` copies per directed key |

**BUILD is lowest-risk** because the total new code is small and deterministic, a dependency would need pinning,
licence review and a supply-chain pass (none performed), and the existing helper is disqualified on *scientific*
grounds, not convenience.

## L. Successor verifier specification — `experiments/futurescore/verify.js`

Tests the **V2.3 contract**, never historical semantics. Structural over source-text wherever possible: the
module is imported live and driven with a synthetic graph and synthetic evidence (the `experiments/boundary/verify.js`
pattern), so most assertions are behavioural.

| Group | Tests |
|---|---|
| A estimator | exhaustive `0 ≤ s ≤ a ≤ N`: identity, `c ≥ 1`, success step `≤ 0`, failure step `> 0` |
| B unseen edge | `c = 1`; FS over an unseen graph equals `−d` |
| C success/failure | monotone updates through `recordOutcome` on a synthetic record |
| D directed identity | `1→2` evidence leaves `2→1` unchanged |
| E terminal distance | `T = −d` on path/cycle/star/grid graphs |
| F goal terminal | `FS(g) = 0`, `P = B` |
| G disconnected | two-component graph → `FS = −∞`, `P = 0` |
| H horizon | `H = 3` fixed; `FS_H` non-increasing for H = 0..5; no caller can override |
| I simple path | no node repeats within a candidate path; cycle graphs terminate |
| J ties | symmetric neighbours produce identical FS; earliest-listed wins; repeated runs byte-identical |
| K projection | exact rationals: `P(0)=B`, strict monotonicity, **`P ∈ [0,B]` as the formal range — never `[10,20]`**, `P(−∞)=P(undefined)=0`, span/gap N2/N3; plus `D >= 1` asserted for the production topology (F27 precondition) |
| L negativity | `FS ≤ 0` across an exhaustive sweep |
| M forbidden inputs | **call-graph**: `futureScore` reaches only `findNeuronById` and `recordFor`; plus a static scan of *code* (comments/strings stripped) for oracle/curiosity/Q/RNG/clock symbols |
| N read-only boundary | record digest identical before/after a full FS sweep; mutating a returned `{a,s}` changes nothing |
| O no second writer | exactly one executable `recordOutcome` call repo-wide, outside the verifier |
| P no dependency | `package.json` unchanged; `planning.js` imports only local modules |
| Q historical integrity | the five FS-LN-01 blob hashes unchanged |
| R G9 | `verify_G9.js` byte-identical; G9 successor green; `planning.js` exports still `[futureScore, lookAheadScore]` |
| S admission | `canReachGoal` body byte-identical, `maxDepth = 4` |
| T scope | only the declared milestone files changed, excluding the milestone's own files (the FS-LN-01 fix) |

**Scanner requirements (B4.1 lesson, mandatory):** strip comments and string/template contents while preserving
line numbers; isolate a single `import` statement (`[^}]`, never a lazy cross-statement capture); resolve renamed
aliases; and carry self-tests proving detection of the real call, a renamed alias and a synthetic second call,
and non-detection of comments and strings.

## M. Mutation matrix

| # | Mutation | Expected failing gate |
|---|---|---|
| 1 | remove `+1` smoothing → `a/s` | A (division by zero / identity), B (unseen ≠ 1) |
| 2 | reverse ratio → `(s+1)/(a+1)` | A (failure step becomes negative), C |
| 3 | restore curiosity input | M (call graph + static scan) |
| 4 | restore reward input | M |
| 5 | restore penalty input | M |
| 6 | change `H` from 3 | H |
| 7 | allow cycles (drop the visited set) | I (node repeats), L (FS may diverge) |
| 8 | flip terminal sign → `+d` | E, L (positive FS) |
| 9 | goal terminal ≠ 0 | F |
| 10 | restore `Math.min(FS*4, 20)` | K (P(0) ≠ B, monotonicity, no-cap) |
| 11 | projection positive-only / clamp | K |
| 12 | write to `traversalRecord` from FS | N (digest changes), O |
| 13 | add a second traversal writer | O |
| 14 | change `canReachGoal maxDepth` | S |
| 15 | introduce an external dependency | P |
| 16 | non-deterministic tie order (e.g. sort by random) | J |

## N. Architecture Constitution check

**FACT.** Changes are confined to MiniFlyWire; Noetica, Velith and Mini Prometheus are untouched and absent from
the change surface. FutureScore remains a research mechanism under validation, not platform infrastructure; it
absorbs no manufacturing or engineering logic and creates no new subsystem (the BFS is a private helper, not a
graph service). One owner per capability: evidence → `traversalRecord.js`; planning value → `planning.js`;
projection and scoring integration → `main.js`. Mechanism stays separate from content. No production-layer
leakage, no drift.

## O. Risks and ambiguities

| ID | Item | Type |
|---|---|---|
| **OQ-1** | Under trivial evidence FS degenerates to `−d`, overlapping `goalGradientBoost` (×1.2 vs ×2.0). **ACKNOWLEDGED, NOT A BLOCKER.** Deferred verbatim to post-implementation evaluation: *"Does learned traversal evidence create discriminative behavior beyond the existing geometric goal gradient when evidence is nontrivial?"* `goalGradientBoost` is not removed or modified; the mechanism is not redesigned. | RESOLVED — empirical question for later |
| **OQ-3** | `D < 1`. **RESOLVED:** `D >= 1` is a contract precondition; no behaviour invented; verifier asserts it for the production topology. | RESOLVED |
| R-1 | Behaviour changes by design: `futureBonus` moves from a frequently saturated cap to a monotone projection of a non-positive score. Its formal range stays `[0, 20]`; the trivial-evidence baseline on this topology sits in the upper part of that range, and nontrivial evidence goes lower. | accepted consequence |
| R-2 | The `−∞` branch is unreachable in the production graph, so only synthetic tests can cover it. | test-design risk, covered by G |
| R-3 | Per-decision cost rises (BFS + DFS per candidate). Hoisting the BFS per decision must not introduce cross-call mutable state (F40). | implementation risk |
| R-4 | `lookAheadScore` becomes dead but must stay exported. | documentation risk |
| R-5 | The four FS-LN-01-coupled artifacts will fail once implemented — already announced; no further action. | closed by FS-LN-01 |

## P. Stop conditions (implementation must not begin if any holds)

1. A topology violating the `D >= 1` precondition reaches the projection (F27 breached).
2. Any need to modify `canReachGoal`, `traversalRecord.js`, or a historical artifact.
3. Inability to prove the boundary is the sole evidence owner (gate O fails).
4. Inability to express the forbidden-input test structurally (gate M reduced to grep-only).
5. A dependency becomes necessary without explicit authorization.
6. Contract ambiguity discovered in the recursion or projection beyond OQ-3.
7. The verifier cannot distinguish production call sites from prose (the B4.1 failure mode).

**None of 1–7 currently holds.** OQ-3 is resolved as a precondition, and the production topology satisfies it
(`D = 4`).

## Q. Exact implementation sequence (Pass 2, on authorization)

1. Rewrite `futureScore` in `render/planning.js` (private BFS, `c_hat`, recursion, `H = 3` constant).
2. Replace the two `main.js` expressions (call, projection with `B = 20`, `S = D`).
3. Create `experiments/futurescore/verify.js` with groups A–T and scanner self-tests.
4. Run: new gate, FS-LN-01 lineage gate, G9 successor, V2.2/V2.3 gates.
5. One commit; announce the four FS-LN-01 artifacts flipping to failed as already recorded.

## R. Exact expected files changed (Pass 2)

| File | Change |
|---|---|
| `render/planning.js` | `futureScore` body + signature; exports unchanged |
| `main.js` | two expressions |
| `experiments/futurescore/verify.js` | **new** |

No other file. Not `traversalRecord.js`, not `canReachGoal`, not any historical artifact, not `package.json`.

## S. Verification gates for Pass 2

`experiments/futurescore/verify.js` (A–T, all pass) · `experiments/futurescore/verify_lineage.js` (still 39/39
except the checks FS-LN-01 predicted would flip) · `verify_G9_successor.js` 12/12 · `verify_fs_v22.js` 38/38 ·
`verify_fs_v23.js` (contract text unchanged).

## T. Final recommendation

**GO — Pass-1 design FROZEN.** All three findings are resolved by Director ruling (§A): OQ-2 approved (private
BFS, module-private, not exported), OQ-1 acknowledged and deferred to post-implementation evaluation, OQ-3
resolved as a contract precondition. No contract change is proposed or required, and the frozen contract is
unchanged.

**Frozen for Pass 2:** `futureScore(neuron, goalNeuronId)` with module-private `H = 3`, private topology BFS,
`recordFor`, `c_hat = (a+1)/(s+1)`, simple-path recursion, terminal `−d`, goal `0`, disconnected `−∞`, and no
curiosity/reward/penalty/RNG/clock/oracle/Q/instrumentation/persistence input; the two `main.js` expressions with
`futureBonus` and `goalGradientBoost` retained; no change to `traversalRecord.js`, `canReachGoal` or
`lookAheadScore`'s export; zero new dependencies; and `experiments/futurescore/verify.js` per §L–§M.

**V2.3 is not claimed to be validated.** This establishes implementation readiness only. Pass 2 requires its own
authorization.
