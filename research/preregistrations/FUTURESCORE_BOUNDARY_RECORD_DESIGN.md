# FutureScore — Production Boundary Record: Implementation Design

**Status:** DESIGN ONLY. No production file is modified by this milestone.
**Author:** Chief Systems Engineer
**Authority:** Director decision "FutureScore implementation design milestone — production boundary record only".
**Base:** `6a727d3` (V2.3 freeze). Frozen inputs: [V2.2 input contract](FUTURESCORE_V2_2_INPUT_CONTRACT.md),
[V2.3 numerical contract](FUTURESCORE_V2_3_NUMERICAL_PROJECTION_CONTRACT.md).
**Gate:** [`verify_fs_boundary_design.js`](verify_fs_boundary_design.js).

> **IMPLEMENTATION: NO-GO. EXPERIMENTS: NO-GO.** This document designs a production change; it does not
> authorize one. Every label below is explicit: **FACT** (source-traced), **INFERENCE** (derived),
> **DESIGN DECISION**, **OPEN QUESTION**.

---

## 1. Problem statement

FutureScore V2.2/V2.3 requires learned edge cost `c_hat(e) = (a_e + 1)/(s_e + 1)` computed from a
traversal-outcome record. No such record exists in production: the only post-outcome writer in the codebase is
the M7 harness credit hook, and the production trust maps are contaminated by pre-outcome, episode-level writers.
This milestone designs the smallest production architecture that supplies admissible evidence.

## 2. Frozen requirements inherited

| Source | Requirement |
|---|---|
| V2.2 D3/D6 | written only at the post-outcome decision site; keyed by canonical graph edges; isolated from episode-level and pre-outcome writers; read-only from FutureScore |
| V2.2 D7 | must not consume records written by `episodeManager._updateTrust`, `main.js:4361`, `main.js:4558` |
| V2.2 D23 | production always reports traversal success — a declared limitation, not to be fixed |
| V2.3 F1–F4 | the consumer needs `a_e` and `s_e` only |
| V2.3 F34–F40 | no oracle, curiosity, Q-values, decision-state history, RNG or instrumentation; no mutation by the consumer |

## 3. Source-traced execution path

**FACT.** Traced call and data flow, not line numbers alone:

```
runAgentLoop()                      main.js:5067   — the per-frame driver
  └─ runAgent()                     main.js:5178   — called 5x per frame; one tick = one runAgent() call
       ├─ next = window.lastReasoning.to           main.js:3828–3832   the INTENDED destination
       ├─ recentMemory.push(current)               main.js:4379        intended, pre-outcome
       ├─ goal block  if (current === goalNeuronId) main.js:4436       intended arrival, pre-outcome
       │    ├─ recordAutonomousSuccess             main.js:4473  → episodeManager _runPipeline:856 → _updateTrust:1092
       │    ├─ R1/R2 reward writes                 main.js:4497–4531
       │    ├─ recordSuccess(pathKey)              main.js:4558  (skipped when __M7_CREDIT__ is set)
       │    └─ reset: agentCurrent = random node   main.js:4744  (goal excluded from the pool)
       ├─ agentLast = agentCurrent                 main.js:4850   agentLast IS now the position moved from
       ├─ _goalResetJustHappened = (next === goal) main.js:4875–4877
       ├─ _m7Traversed = __M7_ENV__ ? env.attempt(_m7From,_m7To) : true    main.js:4897–4903   ← OUTCOME
       ├─ step ledger (instrumentation, guarded)   main.js:4910–4917
       ├─ __M7_CREDIT__.recordTraversal(...)       main.js:4923–4927   ← the only post-outcome writer today
       └─ if (next && !_goalResetJustHappened && _m7Traversed) { agentCurrent = next; ... }   main.js:4929
```

- **The authoritative point.** `_m7Traversed` is assigned once, at `main.js:4900–4903`, from a single environment
  draw. **FACT:** exactly one draw per movement decision (`env.attempt` is called nowhere else in `runAgent`).
- **Edge identity.** `_m7From = agentLast` (assigned from `agentCurrent` at `4850`, so it is the true origin) and
  `_m7To = next` (`main.js:4898–4899`). **FACT:** these are captured at the decision and never reconstructed later.
- **Outcome variable.** `_m7Traversed` (boolean).
- **Immutability.** **FACT:** `_m7Traversed` is `const` and is read, never reassigned; the only later use is the
  gate at `4929`. The sole subsequent `agentCurrent` assignment inside the tick is inside that gate.
- **Retries.** **FACT:** a slip leaves `agentCurrent` unchanged, so the next `runAgent()` tick re-decides from the
  same node and may attempt the same edge again. Repeated attempts are separate, independently recorded events —
  this is the sample size the estimator needs.

### 3.1 Goal-entering traversals are excluded

**FACT.** When `next === goalNeuronId`, `_goalResetJustHappened` is true (`4875–4877`), so **no environment draw
occurs** (`4901`) and **no credit is written** (`4924`). The goal block above has already reset the agent to a
random non-goal node (`4744`).

**INFERENCE.** Any edge whose destination is the current goal can never accumulate evidence. Its `c_hat` stays at
the prior value 1 forever. In production this is invisible (every cost is 1). Under M7 it means the last edge of
every route is systematically costed at the optimistic floor, regardless of its true `p`.

**OPEN QUESTION (not fixed here).** Whether the boundary should obtain evidence for goal-entering traversals.
Changing the guard would change M7 environment semantics and parity, which this milestone may not touch.

## 4. Authoritative outcome definition

**DESIGN DECISION.** An *outcome event* exists exactly when, in one `runAgent()` tick:
`next !== null && !_goalResetJustHappened`. Its value is `_m7Traversed`, read at the point of assignment. The
boundary write is placed immediately after the existing credit block (`main.js:4927`), inside the same guard, and
before `agentCurrent` changes at `4929`.

## 5. M7-off semantics

**FACT.** With no harness attached, `globalThis.__M7_ENV__` is undefined, so `_m7Traversed` is the literal `true`
from the conditional's else branch (`main.js:4903`). `env.attempt` is Node-only and is never loaded by the browser
app (`index.html:22` loads `main.js` only); even when loaded but inactive it returns `true` (`env.js:486`).

**INFERENCE.** With M7 off there is no stochastic traversal mechanism at all. `true` is not the outcome of a
trial; it is the absence of a trial.

**DESIGN DECISION.** Record it as a genuine success anyway, because it faithfully reports what happened: the agent
did traverse the edge. This is exactly the all-success regime V2.3 F10 already covers (`c_hat ≡ 1`,
`FS = −d`). **The record stores no environment-mode field**: a mode flag would be run-instrumentation state
(V2.3 F39) and would invite mode-conditional semantics. The regime is a property of the run, documented, not
stored.

**INFERENCE.** Consequently the boundary is *semantically inert in production*: it cannot change any FutureScore
ordering there. Its value is that the same code path yields real evidence under M7 and under any future
environment that can fail.

## 6. Canonical edge identity

**FACT.** Two different conventions exist today:

| Convention | Where | Form |
|---|---|---|
| Undirected environment edge | `env.js:54` `KEY = (a,b) => a<b ? a|b : b|a`; `EDGE_OF` | one index per physical edge; `p` is per **undirected** edge |
| Directed memory key | `run.js:157` `key = from + '->' + to`; `main.js:3544`, `3807` | `"3->7"`, direction-bearing |

**FACT.** `run.js:156` validates with `arms.edgeIndex(from, to)`, which resolves through the **undirected** index,
then stores under the **directed** string. **FACT.** Node ids are stable integers declared in `neurons.json`
(`"id": 1, 2, …`) and edges in `connections.json`; they are data-file constants, so keys are stable across
save/load and across sessions.

**DESIGN DECISION.** One canonical key: `` `${Number(from)}->${Number(to)}` `` — **directed**, numeric-normalized.
- Directed matches the V2.1 recursion, which sums `ε(v,w)` over directed steps.
- `Number()` normalization removes the string/number ambiguity present elsewhere.
- No collision: ids are integers and `->` cannot occur inside an integer literal.
- Validity: an event is recorded only if `to` is a declared neighbour of `from` in the graph loaded from
  `connections.json`. **DESIGN DECISION:** production validates against that adjacency, never against `env.js`
  (a harness module).

**INFERENCE.** Because `p` is undirected but the key is directed, the two directions of one physical edge collect
separate samples, halving the per-key sample size under M7.

**OPEN QUESTION.** Whether a later contract should aggregate the two directions. V2.3 is per directed edge; no
aggregation is designed here.

## 7. Store ownership

**DESIGN DECISION (recommended): a new production module `render/traversalRecord.js`**, owning one map, one
writer function and read-only accessors. It is the only module that can mutate the record.

**FACT (a constraint on any choice).** `experiments/phase1_0/verify_G9.js` pins the entire `render/` surface — 37
modules, 215 exports — and its own mutation controls reject both an added export (`G9.6a`) and an added module
(`G9.6c`). Any option that adds a module or an export to `render/` therefore requires a **lineage transition**: a
recorded note plus a successor gate. **Historical verifiers are never edited.**

### Rejected alternatives

| Alternative | Why rejected |
|---|---|
| **Reuse `trustMemory` maps** | Directly violates V2.2 D7: `_updateTrust` (`episodeManager.js:1092`) writes them pre-outcome with no M7 guard. Contamination is the defect being escaped. |
| **New exports inside `trustMemory.js`** | Same file as the contaminated writers, so isolation could only be asserted by convention; a future caller of `recordSuccess` sits one line away. Also trips the same G9 transition, so it buys nothing. |
| **Keep counts in `main.js` module scope** (smallest possible: no new module, no new export, no G9 transition) | Rejected on isolation and testability: the evidence would live in the most contaminated file, with no module boundary to make "only one writer" statically provable, and no read interface to hand FutureScore. This is the genuine cost trade-off: it is cheaper but it cannot be *proved* isolated, which is the whole point of the boundary. |
| **Place it under `instrumentation/`** | V2.3 F39 forbids FutureScore depending on instrumentation. |
| **Rework `trustMemory` globally** | Out of scope by Director instruction, and unnecessary. |

## 8. Persistence decision

**FACT.** `saveBrain` (`main.js:684–712`) serializes transitions, rewards, penalties, signals, curiosity, Q,
confidence, episodes, `homeNeuronId`, `goalNeuronId`. It does **not** persist `pathAttempts`/`pathSuccesses`.
`loadBrain` (`729–781`) restores only those same maps. Trust has never been persisted.

**DECISION: NOT REQUIRED.**
- **Justification from V2.3 semantics, not convenience:** in production every outcome is a success, so
  `c_hat ≡ 1` for any counts whatever; persisting or discarding them cannot change a single FutureScore value
  (F10). Under M7 every run is in-process and starts from a defined cold state, which is what reproducibility
  gates require.
- **INFERENCE.** Persistence becomes a genuine semantic question only if production ever produces failures; it
  would then interact with forgetting (V2.3 F14, λ = 1) and cold-start priors. That requires its own ruling.
- **DESIGN DECISION.** The implementation does not extend the `saveBrain`/`loadBrain` schema. This also avoids
  cross-version restore of a record whose semantics are still young.

## 9. M7 compatibility model

**FACT.** M7 records its own outcome evidence through `__M7_CREDIT__.recordTraversal` → `recordAttempt` /
`recordSuccess` into `trustMemory` (`run.js:151–160`), and M7 arms read it through `getPathTrust`
(`main.js:2179–2182`).

**DESIGN DECISION: independent. The boundary neither mirrors nor replaces M7 storage.**
- The boundary writes its own map; `trustMemory` is untouched; `__M7_CREDIT__` is untouched.
- During an M7 run both records are written from the same `_m7Traversed` value. **INFERENCE:** this duplication
  is harmless because the stores are disjoint and no M7 consumer reads the new map.
- **INFERENCE (parity).** The write consumes no RNG, performs no I/O and touches no existing structure, so M7
  decision streams, arm behaviour and state digests are unchanged. Historical M7/M39/M40 evidence keeps its
  meaning.
- **OPEN QUESTION.** Whether a future M7 successor should read the boundary instead of `trustMemory`. Not
  designed here.

## 10. Existing-writer contamination audit

Every writer that could conceivably reach a trust-like store, and why it cannot reach this record:

| Writer | Location | Nature | Excluded by |
|---|---|---|---|
| `_updateTrust` | `episodeManager.js:1082–1101` | episode-level, pre-outcome, no M7 guard | different module and map; no import of the record |
| legacy attempt | `main.js:4356–4361` | pre-outcome, stale `agentLast` | not modified; writes `trustMemory` only |
| episode success | `main.js:4558` | episode-level, pre-outcome | not modified; writes `trustMemory` only |
| R1, R2, R3, P4 | `main.js:4497–4531`, `4600–4658` | goal-arrival reward/penalty shaping | never call the record |
| P3, P5 | `main.js:4566–4570`, `4796–4810` | similarity, anti-repetition, self-referential shaping | never call the record |
| R4, R5 | `longTermConsolidation.js:112`, `episodeManager.js:1013` | stability, episode-quality credit incl. replay/imagination | never call the record |
| R6, P2, `decayTrust` | `main.js:3232–3250`, `3214–3226`, `5111` | recency transforms | the record has no decay path (λ = 1) |
| curiosity | `curiosityMap` writers | novelty | never call the record |

**DESIGN DECISION.** Isolation is enforced structurally and provable statically: exactly **one** call site of the
writer exists in the whole repository, and it is the post-outcome site. Gate B4 asserts this.

## 11. Proposed read interface

```
// render/traversalRecord.js — read-only surface for consumers
recordFor(from, to) -> { a, s }        // frozen object; { a: 0, s: 0 } for an unobserved edge
```

- **DESIGN DECISION.** The consumer receives `a` and `s` **and nothing else**: no timestamps, no environment mode,
  no episode data, no provenance, no ordering, no RNG state, no instrumentation handle.
- **DESIGN DECISION.** `c_hat` is **not** computed here. The record stores evidence; the estimator (V2.3 F1) lives
  with FutureScore. This keeps the record free of numerical policy.
- Accessors return copies, so a consumer cannot mutate stored state (V2.3 F40).

## 12. Data schema

```
key   : `${Number(from)}->${Number(to)}`          canonical, directed
value : { a: integer >= 0, s: integer >= 0, with s <= a }
store : one Map, module-private, not exported directly
```

**DESIGN DECISION.** One map of pairs rather than two parallel maps: a single atomic update keeps `s <= a` a
structural property rather than a coordination requirement between two stores.

## 13. Lifecycle

| Phase | Behaviour |
|---|---|
| module load | empty map |
| outcome event | `a += 1`; `s += 1` if the traversal happened |
| goal-entering tick | no event (§3.1) |
| reload | empty again — not persisted (§8) |
| "clear brain" (`main.js:5209–5215`) | cleared, alongside the other stores; a reset is not an evidence writer |
| M7 run | written identically; harness stores untouched |

## 14. Failure modes

| # | Mode | Handling |
|---|---|---|
| F-1 | non-edge pair reaches the writer (the ERR-05 stale-key family) | adjacency validation rejects it; gate B2 |
| F-2 | goal-entering edges never observed | **accepted and documented** (§3.1); open question, not patched |
| F-3 | directed split of an undirected `p` | accepted under V2.3; open question (§6) |
| F-4 | id type drift (`"3"` vs `3`) | `Number()` normalization in the key |
| F-5 | a second writer appears later | gate B4 fails the build |
| F-6 | another subsystem reads the record and feeds it back | gate B7 restricts consumers to FutureScore |
| F-7 | counts grow unbounded in long runs | integers only; λ = 1 by contract; no decay path exists |

## 15. Test / gate plan

| Gate | Asserts |
|---|---|
| **B1** | the write is in `runAgent`, after `_m7Traversed` is assigned, inside `next !== null && !_goalResetJustHappened`, before `agentCurrent = next` |
| **B2** | key is `Number(from)->Number(to)`; only declared adjacency is accepted; non-edges and self-pairs rejected |
| **B3** | `a` increments on every event; `s` increments exactly when the outcome is true; `s <= a` always |
| **B4** | exactly one writer call site repo-wide; the record is not imported by `episodeManager.js`, `trustMemory.js`, or any reward/penalty/curiosity path |
| **B5** | M7 runs: `trustMemory` and `__M7_CREDIT__` untouched; no RNG consumed; M7 decision stream and state digest unchanged |
| **B6** | `saveBrain`/`loadBrain` schema unchanged; the record is empty after a simulated reload |
| **B7** | consumers are read-only: accessors return copies; mutating a returned value does not alter the store |
| **B8** | no `p`, `trueP`, `expectedCostToGoal` or oracle-derived value reachable from the record or its consumer |
| **B9** | no curiosity, Q-value, `recentMemory`, `thoughtTrail`, `lastDecision` or position history reachable |
| **B10** | no RNG, `Date.now`, `performance.now` or tick counter in the module |
| **B11** | aggregation is deterministic: the same event sequence yields byte-identical state, and reordering independent edges does not change per-key counts |
| **B12** | the FutureScore consumer performs no mutation: the record digest is identical before and after evaluation |

## 16. Minimal implementation plan (proposed sequence, each separately authorized)

1. **G9 lineage transition.** A note recording that the `render/` surface gains one module, plus a successor gate.
   `verify_G9.js` itself is never edited.
2. **`render/traversalRecord.js`** — roughly 30 lines: the map, `recordOutcome(from, to, succeeded)`,
   `recordFor(from, to)`, `clear()`.
3. **`main.js`: one import and one call**, immediately after the credit block at `4927`, under the same guard,
   plus adjacency validation.
4. **Clear hook** in the existing clear-brain path.
5. **Gates B1–B12.**

**DESIGN DECISION (staging).** Steps 2–4 leave the record **write-only**: nothing reads it, so agent behaviour is
bit-identical. That makes the first production commit verifiable by a behaviour-identity gate, and it separates
"evidence exists" from "FutureScore changes". FutureScore and the projection come in later, separately
authorized milestones.

## 17. Non-goals

Not FutureScore, not the projection, not `planning.js`, not `main.js:1874`, not M7, not `trustMemory`'s existing
maps or writers, not the contaminated reward/penalty writers, not persistence, not the goal-edge guard, not
unrelated legacy cleanup.

## 18. Implementation authorization boundary

This document authorizes nothing. Implementation requires a separate Director ruling covering: the production
edit at the post-outcome site, the new `render/` module, and the G9 lineage transition. **Implementation:
NO-GO. Experiments: NO-GO.**
