# FutureScore V2.2 — Input / Learned-Cost Contract (FROZEN)

**Status:** FROZEN by Director governance decision, following the V2.2-R1 production evidence-source closure.
**Author:** Chief Systems Engineer
**Scope:** specification only. No production code, no estimator, no projection, no experiment, no seed.
**Source base:** `523ec38` (M40-P1). Every source reference below is to that tree and is re-checked by
[`verify_fs_v22.js`](verify_fs_v22.js).

This document records two frozen layers:

- **V2.1 semantic layer** (frozen earlier; restated here only so the contract is self-contained — not reopened);
- **V2.2 input / evidence layer** (frozen by this milestone).

The next stage (V2.3 numerical / projection design) is **not** begun here.

---

## 1. Frozen V2.1 semantic layer (restated, not reopened)

FutureScore is goal-directed future planning: a learned internal analogue of goal-directed environmental cost
structure.

```
FS_H(k | M, g) = max over π ∈ Π_H(k, g) of [ Σ_{e ∈ π} ε_M(e) + T_M(end(π), g) ]

F_h(v) = 0                                   if v = g
       = T_M(v, g)                           if h = 0 or v is a dead end
       = max over w ∉ path of [ ε_M(v,w) + F_{h−1}(w) ]   otherwise
```

- accumulated learned edge evidence along a path; best-future (maximum) selection over paths;
- partial paths are valid; a path terminates at the goal, at horizon H, or at a dead end;
- `T_M(g, g) = 0`; `T_M ≤ 0`; the oracle is validation-only.

---

## 2. Frozen V2.2 decisions

| # | Decision |
|---|---|
| D1 | FutureScore consumes **learned traversal-cost evidence**. |
| D2 | The raw current `rewards`, `penalties` and `curiosityMap` maps are **NOT** FutureScore evidence sources. |
| D3 | Admissible evidence must originate from **actual traversal outcomes recorded AFTER the environment decides the traversal outcome**. |
| D4 | `trustMemory` (`render/trustMemory.js`) remains the **production storage owner**. |
| D5 | FutureScore must consume a **narrow production-owned evidence boundary**, not the contaminated raw trust maps (`pathAttempts`, `pathSuccesses`). |
| D6 | The boundary must be: **(a)** written only from the post-outcome decision site; **(b)** keyed only by canonical graph edges; **(c)** isolated from episode-level and pre-outcome writers; **(d)** read-only from FutureScore. |
| D7 | FutureScore must not consume records written by **`episodeManager._updateTrust`**, **`main.js:4361`**, or **`main.js:4558`**. |
| D8 | Goal-specific episode credit is **NOT** edge-cost evidence. |
| D9 | Curiosity is **NOT** edge-cost evidence. |
| D10 | Frequency alone is **NOT** edge-cost evidence. Counts may serve as **sample size** for the estimator. |
| D11 | Successful traversal evidence is **admissible**. |
| D12 | Failed traversal evidence is **admissible**. |
| D13 | Learned edge cost: `c_hat_M(e) >= 0`. |
| D14 | FutureScore edge contribution: `epsilon_M(e) = -c_hat_M(e) <= 0`. |
| D15 | Edge evidence is **goal-agnostic**. Goal-directedness comes from path termination and `T_M(v,g)`. |
| D16 | The oracle is **forbidden at runtime**: hidden `p`, `expectedCostToGoal`, oracle values, oracle-derived quantities. |
| D17 | Curiosity, Q-values, decision-state history and instrumentation are **forbidden** FutureScore inputs. |
| D18 | FutureScore is **read-only, deterministic and mutation-free**. |
| D19 | No goal → FutureScore **undefined**. |
| D20 | Candidate equal to goal → FutureScore **= 0**. |
| D21 | Disconnected terminal → `T_M = -infinity`. |
| D22 | FutureScore range: **`[-infinity, 0]`**. |
| D23 | **CURRENT PRODUCTION LIMITATION:** the current production environment always reports traversal success. Failed traversal outcomes are available only under the M7 experimental environment. This is a **declared architectural limitation**; the environment is not modified to fix it. |

### 2.1 Final evidence-source wording (normative)

> c_hat is derived solely from a traversal-outcome record written only at the post-outcome decision site, keyed by canonical graph edges, and isolated from every episode-level or pre-outcome writer (including _updateTrust and main.js:4361/4558). In the current production environment every recorded outcome is a success; this is a declared architectural limitation.

### 2.2 Conceptual transformation (no coefficients)

```
traversal-outcome record (per canonical edge: attempts, successes; written post-outcome only)
        │  estimator — monotone: non-increasing in success evidence, non-decreasing in failure
        │  evidence, defined for unattempted edges through a declared prior   ← V2.3, unresolved
        ▼
c_hat_M(e) >= 0
        ▼
epsilon_M(e) = -c_hat_M(e) <= 0   → accumulated along paths (§1)
```

---

## 3. Rationale and source evidence (V2.2-R1)

### 3.1 Lifecycle of the trust record

```
main.js:4379  recentMemory.push(current)          intended move, BEFORE the outcome
main.js:4436  if (current === goalNeuronId)        intended goal arrival, BEFORE the outcome
   └─ 4473 recordAutonomousSuccess → episodeManager._runPipeline (855) → _updateTrust (1082–1101)
          → recordSuccess(from->to) for every pair of the reconstructed episode   NOT gated on M7
main.js:4356–4361  recordAttempt(agentLast->next)  M7 credit off only; stale agentLast (M7-ERR-05)
main.js:4558       recordSuccess(pathKey)          M7 credit off only; episode-level
main.js:4897–4903  _m7Traversed = __M7_ENV__ ? env.attempt(u,v) : true      THE ACTUAL OUTCOME
main.js:4923–4927  __M7_CREDIT__.recordTraversal(u, v, _m7Traversed)       post-outcome credit
   └─ experiments/m7/run.js:151–160  canonical-edge check → recordAttempt; if (succeeded) recordSuccess
main.js:5111       decayTrust(0.9997)
consumers          getPathTrust → bayesianTrust (main.js:2179–2182); aggregate trust (main.js:3400–3414)
```

### 3.2 Findings

| Finding | Evidence |
|---|---|
| `trustMemory` is production runtime | imported by `main.js:497–506`; read by production scoring (`main.js:2179–2182`) |
| M7 is a Node-only experimental harness | `experiments/m7/env.js:29–31` and `run.js:51–54` import `node:*`; `index.html` loads only `main.js` |
| `__M7_CREDIT__` is test-only | defined only in `experiments/m7/run.js:151` and `_armrun.js:161`; production reads it only as a guard |
| Production never fails a traversal | `main.js:4900–4903` yields `true` without `__M7_ENV__`; `env.attempt` returns `true` when inactive (`env.js:486`) |
| `trustMemory` is not persisted | `saveBrain` (`main.js:684–712`) omits `pathAttempts`/`pathSuccesses` |
| Raw trust maps are contaminated in every mode | `_updateTrust` (`episodeManager.js:1082–1101`) calls `recordSuccess` for autonomous-success episodes (trust authority 1.00, `episodeManager.js:57–65`), with no M7 guard; the episode is built from `recentMemory`, which holds intended moves (`main.js:4379`) — pre-outcome successes, without matching attempts |
| The only admissible writer | the post-outcome site `main.js:4923–4927` |

### 3.3 Architectural owner

The **outcome** is owned by the environment/runtime substrate at the single decision point `main.js:4897–4927`.
The **storage** is owned by MiniFlyWire `render/trustMemory.js`. The M7 harness, `episodeManager`, Noetica and
Velith are not owners.

### 3.4 Terminal input boundary (V2.2, carried forward)

| Input to `T_M(v,g)` | Status |
|---|---|
| structural topology (connectivity, hop distance on the known graph) | allowed — required baseline |
| learned edge cost `c_hat_M` over known edges | allowed |
| optional learned refinement | allowed only if built from admissible evidence, in cost units, and goal-relevance validated |
| oracle (`p`, `expectedCostToGoal`, oracle values) | forbidden |
| curiosity | forbidden |
| decision state (`thoughtTrail`, `recentMemory`, `lastDecision`, current node, position history) | forbidden |
| `lookAhead` (embedding similarity) | does **not** qualify: not in cost units, built from inadmissible evidence, unvalidated |

---

## 4. Out of scope — deferred to V2.3 and later

Estimator form and prior; forgetting (`decayTrust` admissibility as forgetting); horizon H; terminal scale;
the `futureBonus` projection over `[-infinity, 0]` and the undefined case; concordance measure and threshold;
persistence of the boundary record across page loads; implementation; experiments. None is decided here.

## 5. Lineage

The M7 historical-lineage consequence of the `_updateTrust` finding is recorded in
[`../cognitive-audit/M7_LINEAGE_NOTE_01.md`](../cognitive-audit/M7_LINEAGE_NOTE_01.md). No historical M7, M39 or
M40 evidence is altered.
