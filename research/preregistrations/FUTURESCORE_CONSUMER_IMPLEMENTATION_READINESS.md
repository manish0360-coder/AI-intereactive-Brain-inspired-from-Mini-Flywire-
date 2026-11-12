# FutureScore Consumer — Implementation Readiness Gate

**Kind:** readiness audit. **No production code modified, nothing committed, no seed generated, no experiment run.**
**Author:** Chief Systems Engineer · **Date:** 2026-09-20 · **Tree audited:** `4fb5c74` (unmodified).
**Frozen inputs, not reopened:** V2.1 semantics, V2.2 input contract, V2.3 numerical/projection contract, the boundary-record architecture, M39/M40/UQ-B, the architecture constitution.
**Active workspace:** MiniFlyWire only. Noetica, Velith and Mini Prometheus are read-only reference context and are untouched.

---

## 1. Executive decision

**GO — with two mandatory prerequisites that require a Director ruling before the implementation commit.**

The frozen V2.3 contract is implementable against the current tree: the evidence boundary exists, its read surface is adequate, the consumer site is a single expression, and no architectural or scientific issue blocks it.

The prerequisites are **not** design questions. They are verifier-lineage questions, created by the fact that four existing artifacts are hard-coupled to the *current* `futureScore` signature and semantics. Implementing V2.3 will make them fail. Under our standing rule they may not be edited, so their transition must be **announced in advance**, exactly as `G9-LN-01` did:

| # | Prerequisite |
|---|---|
| **P-1** | A ruling on the lineage of four coupled artifacts (§10 R-1): `experiments/m39/hook.mjs`, `experiments/d2/{child.mjs,verify.js}`, `experiments/boundary/verify.js` A3, `research/preregistrations/verify_m35.js`. |
| **P-2** | A ruling on the **`D` source and `canReachGoal` interaction** (§10 R-2), the one place where the frozen contract meets a production filter that predates it. |

## 2. Exact source trace (current tree, re-derived — line numbers differ from pre-`4fb5c74` notes)

```
main.js:5067   runAgentLoop()
main.js:5203   runAgent()                      5 calls per frame; one tick = one runAgent()
   │
   ├─ runPrediction / candidate scoring (main.js:3157 runAgent; scoring block ~1700-2300)
   │    ├─ main.js:1703   if (goalNeuronId !== null && !canReachGoal(k, goalNeuronId)) → candidate PRUNED
   │    │                 canReachGoal is defined at main.js:1153, DEPTH-LIMITED (maxDepth = 4)
   │    ├─ main.js:1877   const targetNeuronForFuture = findNeuronById(k)
   │    ├─ main.js:1879-1888  imaginedFuture = futureScore(neuron, goalNeuronId, rewards, penalties, curiosityMap, 3)
   │    ├─ main.js:1898-1899  const futureBonus = Math.min(imaginedFuture * 4, 20)      ← THE PROJECTION SITE
   │    ├─ main.js:2119   futureBonus passed into calculateDecisionScore({...})
   │    │                 render/scoring.js:84 receives it; :176 publishes liveFutureBonus;
   │    │                 :350 and :406 weight it as futureBonus * 1.2
   │    ├─ main.js:2276-2296  arbitratedScore = finalWeight (or 0.60*finalWeight + 0.40*competitiveScore)
   │    ├─ main.js:2398   const sorted = choices.sort((a, b) => b.weight - a.weight)
   │    └─ main.js:2403   const bestChoice = sorted[0]
   │
   ├─ next-state selection → main.js:3853/3857  next = window.lastReasoning.to
   ├─ goal handling       → main.js:4461  if (current === goalNeuronId) { … reset at 4769 }
   ├─ outcome             → main.js:4922-4928  _m7Traversed = __M7_ENV__ ? env.attempt(u,v) : true
   ├─ M7 credit           → main.js:4948-4952  __M7_CREDIT__.recordTraversal(...)
   └─ BOUNDARY WRITE      → main.js:4966-4968  recordTraversalOutcome(_m7From, _m7To, _m7Traversed)
                             → render/traversalRecord.js recordOutcome() → module-private Map
                             → read surface: recordFor(from, to) → { a, s }   (currently UNREAD)
```

**The mechanism under change is exactly two expressions:** `main.js:1879-1888` (the call) and `main.js:1898-1899` (the projection), plus the body of `futureScore` in `render/planning.js:175-362`.

## 3. V2.3 conformance matrix (current code vs frozen contract)

| Item | Frozen requirement | Current code | Verdict |
|---|---|---|---|
| F1 estimator | `c_hat = (a+1)/(s+1)` | absent — no cost estimator exists | **TO BUILD** |
| F2–F4 evidence | `a`, `s` from the post-outcome record | `planning.js:259-274` reads `rewards`, `penalties`, `curiosityMap` | **VIOLATION — must be removed** |
| F13 | `ε = −c_hat ≤ −1` | `planning.js:296-304` computes a **positive** total `reward*1.5 − penalty*2 + curiosity*0.4 + future*0.8` | **VIOLATION** |
| F21/F22 | `FS ∈ [−∞, 0]`, non-increasing in H | current FS is ≥ 0 and grows with depth | **VIOLATION** |
| F17–F19 terminal | `T = −d(v,g)`; `T(g,g)=0`; disconnected `−∞` | **no terminal term at all**; DFS returns `0` at `d<=0` (`planning.js:209`) | **TO BUILD** |
| goal termination | path ends at `g` with `F=0` | **absent** — the DFS never tests `nextId === goalNeuronId` | **TO BUILD** |
| F15 horizon | `H = 3`, global constant | depth arg `3` passed at `main.js:1886`, default `3` at `planning.js:182` | **CONFORMS** (value), but H must become a module constant, not a caller argument |
| simple path | `w ∉ path` | `planning.js:236-242, 337` marks on entry, deletes on backtrack | **CONFORMS** |
| F23–F25 projection | `P = B·S/(S−FS)`, `B=20`, `S=D` | `Math.min(imaginedFuture*4, 20)` — the M40-saturating cap | **VIOLATION — must be replaced** |
| F28/F29 | `P(−∞)=0`, `P(undefined)=0` | no such cases exist today | **TO BUILD** |
| F34 oracle | forbidden | not present in `planning.js` | **CONFORMS** |
| F35 curiosity | forbidden | `curiosityMap` is a parameter and is read | **VIOLATION** |
| F36 Q-values | forbidden | not present | **CONFORMS** |
| F37 decision state | forbidden | not present (`futureScore` receives only `neuron`, `goal`, maps) | **CONFORMS** |
| F38 RNG | forbidden | none in `planning.js` | **CONFORMS** |
| F39 instrumentation | forbidden | none in `planning.js` (hooks inject from outside) | **CONFORMS** |
| F40 mutation | forbidden | reads only; `visited` is call-local | **CONFORMS** |
| deterministic ties | required | `main.js:2398` `Array.prototype.sort` is stable (ES2019), so equal weights keep pool order | **CONFORMS** (record the dependence on sort stability) |

**`lookAheadScore` must stop feeding `futureScore`** (`planning.js:280-287`, weight `0.8` at `:304`) — it is embedding similarity, disqualified by V2.2 §3.4. **Its export must remain**, because `verify_G9_successor.js` pins `planning.js` to exactly `['futureScore','lookAheadScore']`; removing the export would trip that gate. It is also imported at `main.js:180`.

## 4. Dependency / input audit

**To remove from the FutureScore path:** `rewards`, `penalties`, `curiosityMap` parameters and their three reads; the `lookAheadScore` call inside `futureScore`.

**To introduce:** a read-only import of `recordFor` from `render/traversalRecord.js`, and a BFS hop-distance over the known neighbour graph (`userData.neighbors`, built from `connections.json` by `render/connections.js:120,125`).

**Import direction:** `planning.js → traversalRecord.js → search.js`. `traversalRecord.js` imports only `search.js`; `planning.js` already imports `search.js` and `embeddings.js`. **No cycle is created.**

| Property | Assessment |
|---|---|
| consumer writes to the record | **must not** — only `recordFor` is imported; `recordOutcome` stays out of `planning.js` |
| sole writer preserved | yes — `main.js:4967` remains the single executable call (gate B4.1) |
| new persistence | none |
| RNG / clock / instrumentation / environment / oracle | none introduced |
| mutation | `recordFor` returns copies (`traversalRecord.js`), so a consumer cannot mutate stored evidence |

## 5. Focused prior-art conclusion

No change to V2.3. The completed audit found no implementation of *isolated traversal outcomes → learned edge cost → retry-in-place goal planning*. The nearest learned work (PathUCB/PathTS, arXiv:2607.15440) optimizes a **reset-on-failure** objective with `w = −log p̂` and **publishes no code**; Min-Exp-Cost-Path (arXiv:1802.00898) shares our objective family but assumes probabilities are known. Nothing in this source pass contradicts that. **No external dependency is warranted for this milestone.**

## 6. Proposed production boundary (conceptual, no code)

**`render/planning.js` — `futureScore`:**
- **Signature:** drop `rewards`, `penalties`, `curiosityMap`; keep `(neuron, goalNeuronId)`; make `H = 3` a module constant rather than a caller-supplied depth.
- **Preamble:** no goal → **undefined**; `k === goal` → `0`; compute BFS distances from `g` once per call over `userData.neighbors`.
- **Recursion:** `F_h(v, P)`: `0` if `v === g`; `T = −d(v)` (or `−∞` when `d(v)` is undefined) if `h === 0` or no unvisited neighbour; else `max over w ∉ P of [ −c_hat(v,w) + F_{h−1}(w, P ∪ {w}) ]`, with `c_hat` from `recordFor(v,w)`.
- **Removed:** the `reward*1.5 − penalty*2 + curiosity*0.4 + future*0.8` total and the `deeper*0.9` discount.
- **Kept:** the visited-set discipline (mark on entry, delete on backtrack) and the `lookAheadScore` export.

**`main.js:1879-1899`:** call the new signature; replace `Math.min(imaginedFuture*4, 20)` with `P(FS) = B·S/(S−FS)`, `B=20`, `S=D`, mapping `−∞` and `undefined` to `0`.

**Adapter:** none required. The existing call graph accommodates V2.3 because `futureScore` is already called once per candidate with the candidate neuron and the goal, and its result already flows through a single scalar into `calculateDecisionScore`.

## 7. Proposed test architecture

**Unit (no agent, synthetic graph + synthetic record — the `experiments/boundary/verify.js` pattern):**
1. unseen edge → `c_hat = 1`; 2. all-success edge → `c_hat = 1` for any `n`; 3. mixed → `(a+1)/(s+1)` exactly; 4. failure-only → `1+f`; 5. disconnected candidate → `FS = −∞`, `P = 0`; 6. `k === g` → `FS = 0`, `P = B`; 7. horizon boundary → `FS_H` non-increasing for `H = 0..5`, and `FS = −d` in the all-success regime; 8. deterministic ties → identical FS for symmetric candidates, and stable pool order preserved; 9. directed identity → `1→2` evidence does not affect `2→1`; 10. record immutability → mutating a returned `{a,s}` changes nothing; 11. no mutation → record digest identical before/after a full evaluation sweep; 12–15. static: no RNG, no clock, no oracle symbol, no curiosity/Q/decision-state symbol reachable from `planning.js` **code** (comments excluded — the lesson from B4.4/B8.1).

**Integration:**
16. `futureBonus` reaches `calculateDecisionScore` and `liveFutureBonus` with the new range; `bestChoice` selection still resolves; candidate pool unchanged; no exception across all 20 nodes × the fixture goals.

**Scientific behaviour (specified now, **not run**):** concordance of `FS` with `−C_p` under M7; rankability/non-degeneracy (N1–N4) over a decision-state census. Both require separate authorization.

## 8. Exact implementation scope

| Kind | File | Change |
|---|---|---|
| production | `render/planning.js` | rewrite `futureScore` body + signature; keep both exports |
| production | `main.js` | two expressions: the call (`1879-1888`) and the projection (`1898-1899`) |
| test/verifier | `experiments/futurescore/verify.js` *(new)* | unit + integration gates above |
| verifier lineage | successor gate(s) for the artifacts in §10 R-1 | per the Director ruling |
| documentation | lineage note for the coupled artifacts | per the Director ruling |

No other file. No new module, no new export, no persistence change, no change to `traversalRecord.js`, `trustMemory`, M7, rewards/penalties writers, or the goal-entering guard.

## 9. Architecture / constitution check

Entirely within **MiniFlyWire**, which owns cognitive mechanisms under validation. FutureScore remains an experimental mechanism, not production infrastructure for other layers. **Noetica would independently reimplement** any validated mechanism; no MiniFlyWire code is exported to it. **Velith and Mini Prometheus are untouched.** The four repositories remain separate; nothing in this milestone crosses them.

## 10. Risks

**R-1 (prerequisite P-1) — four artifacts are hard-coupled to the current `futureScore` and will fail on implementation:**

| Artifact | Coupling | Failure mode |
|---|---|---|
| `experiments/m39/hook.mjs:34` | literal source anchor `'return Math.min((n ? futureScore(n, goalNeuronId, rewards, penalties,'` | its `noFutureScore` mutant **throws** `M39 mutant anchor missing` — the M39 mutant arm becomes non-executable |
| `experiments/d2/child.mjs:43,46` | calls `futureScore(n, goal, ...mk(), 3)` with the 5-arg shape | silently passes maps into the new parameter positions → D2 re-execution produces wrong values and its gate fails |
| `experiments/boundary/verify.js:218` (A3) | asserts `render/planning.js` byte-identical to base | fails by construction once `planning.js` changes |
| `research/preregistrations/verify_m35.js` | measures the D2 defect (`futureScoreCost`, `d2Measured`) in the live tree | already failing pre-change; the measurement becomes meaningless |

None may be edited. Minimum resolution: **one ruling** authorizing a lineage note plus successor gate(s), as with `G9-LN-01`.

**R-2 (prerequisite P-2) — `D` and the `canReachGoal` filter.**
- `S = D` requires the largest finite pairwise hop distance. Nothing computes it today; it must come from topology, deterministically, with no cached mutable state. Recomputing per evaluation is O(V·E) per candidate unless hoisted.
- `canReachGoal` (`main.js:1153`) prunes with **`maxDepth = 4`**, so it is *depth-limited reachability*, not connectivity. A candidate that is connected at distance 5+ is pruned before FutureScore sees it, while V2.3's `T = −d` is defined over full BFS distance. The two notions of "reachable" differ. This is a pre-existing production filter, not a contract defect; the ruling needed is whether the consumer accepts the filter as-is (recommended, minimal) or the mismatch is recorded as a known limitation.

**R-3 — behaviour changes by design.** `futureBonus` moves from a saturating positive cap to a bounded monotone map of a non-positive score. Agent behaviour *will* change; that is the point, and it is why the scientific run is a separate authorization.

**R-4 — `lookAheadScore` becomes unused by `futureScore`** while remaining exported (required by the G9 successor) and imported at `main.js:180`. Record as intentional, or the next reader will "clean" it and trip the gate.

**R-5 — evaluation cost.** Adding a BFS per call on top of the existing DFS raises per-decision cost; hoisting the BFS to one computation per decision is the obvious mitigation but must not introduce cross-call mutable state (F40).

## 11. GO / NO-GO

**GO.**

The frozen V2.3 contract is implementation-ready against the current tree. No architectural, scientific or licensing issue blocks it; the consumer is a two-expression change plus a rewritten `futureScore` body; the evidence boundary is in place, isolated, and read-only from the consumer's side.

**Implementation may not begin until P-1 and P-2 are ruled on**, because both concern artifacts and filters that predate the contract and that the standing rules forbid me from changing unilaterally.

**Experiments remain NO-GO** and are not part of the next milestone.
