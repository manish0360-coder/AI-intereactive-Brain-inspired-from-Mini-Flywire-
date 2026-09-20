# FutureScore — Lineage Note 01: the pre-V2.3 implementation is superseded

**Note ID:** FS-LN-01
**Author:** Chief Systems Engineer
**Kind:** lineage transition. **Not an erratum. Not a repair. Not a reinterpretation of any historical result.**
**Gate:** [`experiments/futurescore/verify_lineage.js`](../../experiments/futurescore/verify_lineage.js)

> **NO HISTORICAL ARTIFACT IS MODIFIED BY THIS NOTE OR BY THE MILESTONE THAT FOLLOWS IT.** The five artifacts
> listed in §3 keep their bytes, their hashes and their original meaning. They are not rerun, not repaired, not
> re-scored against the new implementation, and not reinterpreted as measurements of it.

---

## 1. Authority

Director ruling resolving **P-1 (approved)** and **P-2 (approved)** from
[`FUTURESCORE_CONSUMER_IMPLEMENTATION_READINESS.md`](FUTURESCORE_CONSUMER_IMPLEMENTATION_READINESS.md).
P-1 authorizes a FutureScore lineage transition analogous to `G9-LN-01`. P-2 accepts the existing
`canReachGoal(..., maxDepth = 4)` candidate-admission filter as-is.

## 2. Base

`4fb5c74821fb8ea9b3d0ea32825c8f3b9ec51f7e` — the Boundary Record implementation commit. The V2.3 contract is
frozen at [`FUTURESCORE_V2_3_NUMERICAL_PROJECTION_CONTRACT.md`](FUTURESCORE_V2_3_NUMERICAL_PROJECTION_CONTRACT.md)
(commit `6a727d3`) and is **not altered** by this note. No production FutureScore consumer exists yet.

**Hash convention.** All SHA-256 values below are taken over the **committed blob content** at `HEAD`
(`git show HEAD:<path> | sha256sum`), not over working-tree bytes. Git stores LF; a Windows working tree may hold
CRLF, and `render/planning.js` demonstrates the difference (blob `9f286d73…`, working tree `a35b1d0c…`, with a
clean `git diff`). Blob hashes are the portable record; the gate uses them.

## 3. Historical artifacts (five, preserved unchanged)

### 3.1 `experiments/m39/hook.mjs`
- **SHA-256 (blob@HEAD):** `a606bc935711e4ba0dce4dbcb311bc5f522ead7da257115f8a1638fc165b3e40`
- **Purpose:** the M39 shadow-evaluation instrumentation hook, including the `noFutureScore` mutant arm that
  proves the M39 gate detects removal of the FutureScore contribution.
- **Coupling:** line 34 holds a literal source anchor on the pre-V2.3 call text
  `'return Math.min((n ? futureScore(n, goalNeuronId, rewards, penalties,'`, and throws
  `M39 mutant anchor missing` when it does not match.
- **Why V2.3 invalidates the assumption:** V2.3 removes the `rewards`/`penalties`/`curiosityMap` arguments
  (F34–F37) and replaces `Math.min(imaginedFuture * 4, 20)` with `P(FS) = B·S/(S − FS)` (F23). The anchored text
  will no longer exist, so the mutant arm becomes **non-executable against the post-V2.3 tree**.
- **Disposition:** **NOT edited.** M39-P1's recorded RED evidence stands as a measurement of the pre-V2.3
  implementation.

### 3.2 `experiments/d2/child.mjs`
- **SHA-256 (blob@HEAD):** `27336cefa00bd5e042d307ca639fcb2185bbda4fb65a7fd9877295d77b34c06b`
- **Purpose:** the D2 child process that observes which neuron identity reaches the `futureScore` DFS.
- **Coupling:** lines 43 and 46 invoke the five-argument shape `futureScore(n, goal, ...mk(), 3)`, where `mk()`
  supplies the reward/penalty/curiosity maps.
- **Why V2.3 invalidates the assumption:** under the V2.3 signature those arguments no longer occupy those
  positions. The call would not throw; it would compute values that mean nothing. **A silent-wrong-answer
  coupling, which is precisely why it is recorded here rather than left to be discovered.**
- **Disposition:** **NOT edited.**

### 3.3 `experiments/d2/verify.js`
- **SHA-256 (blob@HEAD):** `2d393442a4686328c82327ca73ca081ea198df172bf01fee428993708d8efcf9`
- **Purpose:** the D2 gate — it spawns `child.mjs` (line 50) and asserts what the `futureScore` DFS looked up
  (§1, lines 78–84) and what it computed before and after the D2 repair (§2, line 95 onward), including that
  every `futureScore` call fed one `calculateDecisionScore` call (line 133).
- **Coupling:** depends on both the pre-V2.3 `futureScore` semantics (a non-negative reward-driven score) and on
  `child.mjs`'s five-argument call shape.
- **Why V2.3 invalidates the assumption:** V2.3 makes `futureScore` non-positive, evidence-driven and
  terminal-terminated. Its PRE/POST arithmetic describes a function that will no longer exist.
- **Disposition:** **NOT edited.** The D2 defect and its repair remain historically established.

### 3.4 `experiments/boundary/verify.js` — check **A3** only
- **SHA-256 (blob@HEAD):** `a83d2173034b83f9414b78cb4b5924820aa040d11574c68e9c1b1e3140e99b24`
- **Purpose:** the Boundary Record gate (54 checks).
- **Coupling:** check **A3** (line 218) asserts `git diff --name-only <base> -- render/planning.js` is empty and
  that no added line matches `liveFutureBonus|imaginedFuture \* 4` — i.e. *"FutureScore and the projection are
  untouched"*.
- **Why V2.3 invalidates the assumption:** A3 asserts the **absence of the very change V2.3 authorizes**. It was
  true of the boundary milestone and cannot survive the consumer milestone.
- **Disposition:** **NOT edited.** A3 is retired as a running assertion at the moment the consumer lands; the
  other 53 checks stay meaningful and are expected to continue passing.

### 3.5 `research/preregistrations/verify_m35.js`
- **SHA-256 (blob@HEAD):** `51372daedb7b6084dd292ff43da2bfac696624f5b7f9db36a89366a00fc6b700`
- **Purpose:** the M35 100-node readiness memo gate.
- **Coupling:** its `futureScoreCost` (line 73) and `d2Measured` (line 79) checks measure the live tree's
  FutureScore cost profile and the D2 defect, with mutation controls at lines 145 and 150.
- **Why V2.3 invalidates the assumption:** those checks describe the pre-V2.3 cost profile. (They already fail at
  `4fb5c74` for reasons unrelated to this milestone — the D2 repair changed what they measure.)
- **Disposition:** **NOT edited.**

## 4. The lineage transition

| | **Pre-V2.3 FutureScore lineage** | **V2.3 FutureScore consumer lineage** |
|---|---|---|
| Mechanism | `futureScore(neuron, goal, rewards, penalties, curiosityMap, depth)` — non-negative score from reward/penalty/curiosity maps plus embedding look-ahead; projection `min(FS·4, 20)` | `FS_H(k|g) ∈ [−∞, 0]` from post-outcome traversal evidence via `c_hat = (a+1)/(s+1)`; terminal `T = −d(v,g)`; projection `P = B·S/(S − FS)` |
| Evidence source | `rewards`, `penalties`, `curiosityMap` (pre-outcome, episode-level, shaping) | the V2.2 boundary record (`render/traversalRecord.js`), post-outcome only |
| Verification owner | M39, D2, M35, boundary A3 | the new FutureScore gate (to be created by the implementation milestone) |
| Status | **historical, closed** | **active from the implementation milestone onward** |

**Historical measurements remain historical.** M39-P1's RED result, the D2 defect and repair, the M40-P1 no-go
and every UQ-B result are measurements of the pre-V2.3 mechanism. They are **not** evidence about the V2.3
consumer, and this note forbids presenting them as such. Nothing is rerun to "confirm" them against the new tree.

## 5. Successor gates

After the implementation milestone, successor verification must establish:

| ID | Must establish |
|---|---|
| S-1 | the five historical artifacts exist and their blob SHA-256 values are unchanged from §3 |
| S-2 | no historical verifier or preregistration has been modified |
| S-3 | the new FutureScore gate owns V2.3 behaviour (estimator, recursion, terminal, projection, invariants F1–F40) |
| S-4 | the production implementation conforms to V2.3, with no forbidden input reachable from `planning.js` code |
| S-5 | `canReachGoal` is byte- and behaviour-unchanged for this milestone |
| S-6 | the traversal boundary (`render/traversalRecord.js`) is unchanged, and the consumer never writes to it |
| S-7 | no external dependency was introduced |
| S-8 | G9 history is untouched and the G9 successor still passes |

This note's own gate (`verify_lineage.js`) establishes the **pre-implementation** half: L1–L8 in §7 of the
readiness report's numbering, i.e. artifacts present, hashes matching, production FutureScore not yet changed.

## 6. P-2 — accepted known boundary limitation

> **V2.3 terminal distance uses full graph hop distance, while candidate admission uses depth-limited
> reachability with `maxDepth = 4`. Graph-connected states beyond that admission depth can therefore be filtered
> out before FutureScore evaluates them.**

This is a **known boundary limitation and an accepted scope constraint of the FutureScore consumer milestone**.
It is **not** described as a defect. `canReachGoal` (`main.js:1153`) is accepted as-is: not modified, `maxDepth`
not increased, not replaced with full connectivity, and candidate-admission research is not mixed into the
FutureScore implementation.

## 7. Future work (explicitly out of scope)

Candidate-admission depth may be investigated later as an independent research question — whether depth-limited
admission changes which states FutureScore is allowed to evaluate, and whether that interacts with the terminal
term. **It is outside this milestone and outside the FutureScore consumer milestone**, and it requires its own
authorization. Recording it here creates no commitment to pursue it.
