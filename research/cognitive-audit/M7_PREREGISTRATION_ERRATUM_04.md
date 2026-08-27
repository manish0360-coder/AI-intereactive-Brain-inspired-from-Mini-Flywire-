# M7 Pre-Registration — Erratum 04

**Erratum ID:** M7-ERR-04
**Lineage:** extends [`M7_PREREGISTRATION_ERRATUM_01.md`](M7_PREREGISTRATION_ERRATUM_01.md), [`M7_PREREGISTRATION_ERRATUM_02.md`](M7_PREREGISTRATION_ERRATUM_02.md), and directly supersedes the R5 objective introduced by [`M7_PREREGISTRATION_ERRATUM_03.md`](M7_PREREGISTRATION_ERRATUM_03.md) §3.1
**Date:** 2026-08-20
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-08-20 (R5 / ERR-04).

**Binds to frozen artifact:**

| | |
|---|---|
| Document | [`M7_PREREGISTRATION.md`](M7_PREREGISTRATION.md) v1.0 (frozen 2026-08-19) |
| **SHA-256** | **`2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9`** |
| Sidecar | [`M7_PREREGISTRATION.sha256`](M7_PREREGISTRATION.sha256) |
| Verify | `cd research/cognitive-audit && sha256sum -c M7_PREREGISTRATION.sha256` |

> **THE FROZEN PRE-REGISTRATION IS NOT MODIFIED BY THIS ERRATUM.** Its bytes and digest are unchanged, verified before and after the work this erratum authorises.

---

## 1. Scope — deliberately narrow

This erratum supersedes **one thing**: the *objective function used to identify the reliability-optimal policy* for constraint R5, as defined in ERR-03 §3.1.

It does **not** change R5's purpose, its ≥ 4 threshold, its role in configuration acceptance, the definition of a decision state, the tie-break source, or any frozen parameter. **`EPISODE_CAP = 150` is unchanged and is not tuned.**

---

## 2. The defect in ERR-03's objective

### 2.1 What ERR-03 defined

ERR-03 §3.1 defined the reliability-optimal policy as maximising the probability of reaching the goal within `EPISODE_CAP = 150` traversal attempts, via the finite-horizon recurrence

```
V_h(u) = max over (u,v) ∈ E [ p_uv · V_{h-1}(v) + (1 − p_uv) · V_{h-1}(u) ]
```

### 2.2 Why it is invalid at the pinned horizon — measured

Implemented exactly as specified, the objective **saturates**. With `p_e ≥ 0.25` (frozen §3.5) and 150 attempts, the failure probability is of order `0.75^150 ≈ 1e-19`, far below float64 resolution:

```
H=  5   V == 1 exactly:  1/20   minV = 0.99415257042172078
H= 10   V == 1 exactly:  2/20   minV = 0.99999998662121381
H= 20   V == 1 exactly: 20/20   minV = 1.00000000000000000
H=150   V == 1 exactly: 20/20   minV = 1.00000000000000000

max best-vs-second-best action-value gap at H = 150:  0   (all ties)
```

By `H = 20` every node's value is **exactly 1.0**. At the pinned `H = 150` every action value is `p·1 + (1−p)·1`, so the best-vs-second-best gap is **exactly zero at every decision state**.

The argmax is therefore determined by the `connections.json` tie-break and by floating-point rounding in `p + (1 − p)` — **not by `p_e`**. Anti-vacuity checks confirmed it directly:

- crippling the chosen edge to `p = 0.01` did **not** move the argmax at any decision state;
- the Phase-I → Phase-II reliability swap did **not** change the policy.

**This reproduces the exact degeneracy ERR-03 §2.2 was written to remove**, re-entering through numerical saturation rather than through an infinite horizon. The reported `12/19` differing decision states was an artifact of edge ordering, not of reliability — R5 would have passed, and configurations would have been accepted, for a vacuous reason.

### 2.3 Classification

**Ground 2** of the no-new-errata rule: *a demonstrable measurement invalidity where the criterion cannot distinguish the intended property.*

**The defect predates any observed result.** It follows from frozen §3.3, frozen §3.5's `p_e` ranges, and frozen §3.7's `EPISODE_CAP`, all fixed at freeze. **No Stage-1, pilot, or confirmatory run has been executed and no experimental data exists.** It was found by the anti-vacuity verification the Director mandated, before any configuration was accepted.

### 2.4 What was explicitly NOT done

A smaller horizon *would* have made ERR-03's objective non-degenerate (measured: `H ≤ 40` is `p_e`-sensitive). **That option was rejected by Director ruling.** Selecting a horizon to make a criterion pass is parameter tuning, and `EPISODE_CAP = 150` is frozen §3.7 — changing it would supersede a second frozen clause to rescue the first.

---

## 3. The superseding objective — R5″

### 3.1 Definition

> The **reliability-optimal policy** is the deterministic policy that **minimises expected attempts-to-goal** under fixed edge reliabilities, where each traversal of edge `e` contributes an expected retry cost of **`1 / p_e`**.

This follows directly from frozen §3.3: a slip leaves the agent at `u` and consumes one attempt, so the number of attempts to traverse `e` successfully is geometric with mean `1 / p_e`.

Expected cost-to-goal `C` is the unique solution of

```
C(goal) = 0
C(u)    = min over (u,v) ∈ E [ 1 / p_uv  +  C(v) ]
```

and the policy is

```
π_rel(u) = argmin over (u,v) ∈ E [ 1 / p_uv  +  C(v) ]
```

### 3.2 Why this does not saturate

Every weight `1 / p_e` lies in `[1, 4]` (since `p_e ∈ [0.25, 1.0]`), is strictly positive, and is **unbounded above as `p_e → 0`**. Costs are sums of such weights, so they take distinct real values with no ceiling. There is no probability approaching 1 and therefore no floating-point saturation. Making an edge less reliable strictly increases its contribution — the property R5 must be able to detect.

### 3.3 Computation

Deterministic over the fixed graph. All weights are positive, so `C` is computed by Dijkstra from the goal on the traversal graph. **No new constant, seed, threshold, or horizon is introduced.**

### 3.4 Tie-break — final tie-break only

Exact ties in the argmin are resolved by existing **`connections.json` file order**, the same ordering `main.js:627` uses to build adjacency. Per the Director's ruling this is the **final** tie-break: it applies only when expected costs are exactly equal, never as a primary ordering. Under §3.2 exact ties are rare, in contrast to ERR-03's objective where they were universal.

### 3.5 Unchanged from ERR-03

| | |
|---|---|
| Threshold | `π_rel` must differ from `π_hop` on **≥ 4 decision states** (frozen R5) |
| Decision state | non-goal node with ≥ 2 traversal neighbours (ERR-03 §3.4) |
| `π_hop` | neighbour minimising hop distance on the traversal graph, ties by `connections.json` order (ERR-03 §3.4) |
| Pre-shift only | R1–R5 acceptance is evaluated on the Phase-I assignment (ERR-03 §4) |

---

## 4. Strengthened anti-vacuity requirement

Configuration acceptance is blocked until **all five** hold. If any remains RED, work stops; the test is not weakened and no parameter is tuned.

| | Requirement |
|---|---|
| **AV1** | Policy sensitivity under the Phase-I → Phase-II reliability swap: `π_rel` must change. |
| **AV2** | Crippling a chosen edge must be able to move the optimal action away from it. |
| **AV3** | The expected-cost oracle must be **cross-checked against exhaustive simple-path computation** on the fixed graph: `C(u)` must equal `min over simple paths u→goal of Σ 1/p_e`, exactly. |
| **AV4** | The required `π_rel` vs `π_hop` decision difference (≥ 4 decision states) must be verified. |
| **AV5** | Independence from agent/cognitive seeds must be verified. |

AV3 is the strongest of these: an independent exhaustive computation over ~300 000 enumerated simple paths, agreeing to floating-point tolerance with the Dijkstra oracle, establishes correctness by a wholly different method.

---

## 5. What this erratum does NOT change

| Category | Status |
|---|---|
| **Frozen document bytes and digest** | **Unchanged** — validated before and after |
| **`EPISODE_CAP = 150`** | **Unchanged, not tuned.** Still governs episode termination (frozen §3.7); it is simply no longer the R5 objective's horizon |
| Environment execution semantics (§3.3 slip, §3.6 shift, §3.7 run structure) | Unchanged |
| R1, R2, R3, R4 | Unchanged |
| R6, R7, R8 (Director rulings) | Unchanged |
| R5 purpose, ≥ 4 threshold, acceptance role | Unchanged |
| `T_SHIFT = 1500`, `RUN_TICKS = 3000`, `f = 0.35` → 13 edges, both p ranges | Unchanged |
| Hypotheses; seven arms; metrics; windows W1–W4 | Unchanged |
| Confirmatory family = 6; Holm; α = 0.01; bootstrap seeds | Unchanged |
| Stage-1 → power → Stage-2 procedure; **4200 cap** | Unchanged |
| Falsification F-1…F-11; §15.0 equivalence | Unchanged |
| **Claim ceiling and forbidden-word list** | Unchanged |
| **D2, F2b, D8/F12, D12 — all unrepaired** | Unchanged |
| ERR-01a, ERR-01b, ERR-02 | Unchanged, still in force |
| ERR-03 §2 (degeneracy proof), §3.2–3.4, §4 | Unchanged and still in force |
| Historical gates S1.7, S3.2 | Preserved, still executed, still reported |

**Scope in one sentence:** this erratum replaces one objective function with a non-saturating one and strengthens the anti-vacuity requirement around it. It introduces no new constant and touches no hypothesis, arm, metric, window, sample-size rule, or claim.

---

## 6. Erratum register — cumulative

| ID | Supersedes | Replacement | Implemented in | Result |
|---|---|---|---|---|
| **M7-ERR-01a** | Frozen §13.4 G16.3 breakdown bit-identity | G16.3′(1)–(5) + anti-vacuity | `experiments/phase1_0/verify_G16.js` | **7/7 PASS** |
| **M7-ERR-01b** | `verify_S3.js` S3.2 single-seed threshold | S3.2′(a)–(b), six-seed panel | `experiments/phase1_0/verify_S3prime.js` | **2/2 PASS** |
| **M7-ERR-02** | Application of S1.7 to the M7 rectification | S1.7′(1)–(6), pre-D3 arm | `experiments/phase1_0/verify_S1prime.js` | **7/7 PASS** |
| **M7-ERR-03** | Frozen §3.5 R5 objective (undefined; infinite-horizon degenerate) | Finite-horizon Bellman | *superseded by ERR-04* | withdrawn — saturating |
| **M7-ERR-04** | ERR-03 §3.1 objective (saturating at `H = 150`) | R5″: minimise expected attempts-to-goal, `w_e = 1/p_e` | `experiments/m7/env.js` | see §7 |

ERR-03 is **not deleted**. Its §2 degeneracy proof, §3.2 tie-break, §3.3 threshold, §3.4 definitions and §4 pre-shift ruling all remain in force; only its §3.1 objective is superseded.

---

## 7. Implementation status

**At the time this erratum was written: NOT YET IMPLEMENTED.** Per Director ruling, this document is authored *before* the R5″ implementation, preserving the discipline that the criterion is fixed before the mechanism that satisfies it.

Implementation follows in `experiments/m7/env.js`, with the five §4 anti-vacuity checks in `experiments/m7/verify_env.js`. **No configuration may be accepted until all five are green.**

---

## STATUS: ERRATUM ISSUED · FROZEN DOCUMENT UNMODIFIED

`M7_PREREGISTRATION.md` and `M7_PREREGISTRATION.sha256` were not modified; digest `2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9` validates unchanged. `EPISODE_CAP = 150` unchanged. No Stage-1, pilot, or confirmatory run. No experiment-derived decision. Nothing committed, nothing pushed.
