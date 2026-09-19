# FutureScore V2.3 — Numerical + Projection Contract (FROZEN)

**Status:** FROZEN by Research Director decision (V2.3 freeze authorization).
**Author:** Chief Systems Engineer
**Scope:** specification only. No production code, no agent run, no experiment, no seed.
**Base:** `aa70e93` (FutureScore V2.2 freeze). Verified by [`verify_fs_v23.js`](verify_fs_v23.js).
**Depends on (frozen, not reopened):** the V2.1 semantic layer and the V2.2 input / learned-cost contract,
[`FUTURESCORE_V2_2_INPUT_CONTRACT.md`](FUTURESCORE_V2_2_INPUT_CONTRACT.md).

> **IMPLEMENTATION: NO-GO. EXPERIMENTS: NO-GO.** Both remain NO-GO until separately authorized.
> This contract makes no claim of statistical significance, empirical validation or behavioral validity.

---

## 1. Frozen items

| # | Frozen item |
|---|---|
| F1 | `c_hat(e) = (a_e + 1)/(s_e + 1)` |
| F2 | `a` = total recorded traversal attempts (V2.2 boundary record) |
| F3 | `s` = successful traversal outcomes (V2.2 boundary record) |
| F4 | `f = a − s` |
| F5 | `c_hat = 1 + f/(s+1)` |
| F6 | `c_hat >= 1` |
| F7 | success cannot increase `c_hat` |
| F8 | failure strictly increases `c_hat` |
| F9 | unobserved edge (`a = 0`): `c_hat = 1` |
| F10 | all-success edge (`s = a`): `c_hat = 1` |
| F11 | the estimator is NOT Bayesian |
| F12 | the estimator is consistent for `1/p` |
| F13 | `epsilon(e) = −c_hat(e)` |
| F14 | forgetting `λ = 1` |
| F15 | `H = 3` |
| F16 | H is an initial normative computational horizon inherited from the legacy design, NOT empirically optimized |
| F17 | `T_struct(v,g) = −d(v,g)` |
| F18 | `T(g,g) = 0` |
| F19 | disconnected `= −∞` |
| F20 | optional learned terminal refinement remains disabled |
| F21 | `FS_H ∈ [−∞, 0]` |
| F22 | `FS_H` is non-increasing with increasing H |
| F23 | `P(FS) = B·S/(S − FS)` |
| F24 | `B = 20` |
| F25 | `S = D` |
| F26 | `D` = largest finite pairwise hop distance of the known graph |
| F27 | `D >= 1` |
| F28 | `P(−∞) = 0` |
| F29 | `P(undefined) = 0` |
| F30 | `P` is strictly increasing over finite FS |
| F31 | `P ∈ [0, B]` |
| F32 | `P` reaches B only at `FS = 0` |
| F33 | no cap is applied to P |
| F34 | no oracle input |
| F35 | no curiosity input |
| F36 | no Q-value input |
| F37 | no decision-state-history input |
| F38 | no RNG |
| F39 | no instrumentation dependence |
| F40 | no mutation during FutureScore evaluation |

---

## 2. Edge-cost estimator

### 2.1 Definition

For a canonical edge `e`, from the V2.2 boundary record (post-outcome, canonical-edge keyed, isolated from
episode-level and pre-outcome writers):

```
a_e = recorded traversal attempts      s_e = successful traversal outcomes      f_e = a_e − s_e
c_hat(e) = (a_e + 1)/(s_e + 1) = 1 + f_e/(s_e + 1)
epsilon(e) = −c_hat(e)
```

### 2.2 Derivation

1. **Target.** Under slip-in-place a traversal of `e` takes a geometric number of attempts with mean `1/p_e`
   (the per-edge term of the validation reference, `experiments/m7/env.js:298–304`). The estimand is `1/p_e`.
2. **MLE.** For Bernoulli data the MLE of `p` is `s/a`; by invariance of the MLE, the MLE of `1/p` is `a/s`
   (attempts per success), undefined at `s = 0`.
3. **Additive smoothing.** Within smoothings `(a + x)/(s + y)`, requiring `c = 1` for every all-success record
   `(n, n)` forces `x = y`; this also gives `c = 1` for the unobserved record. `x = y = 1` is the smallest integer
   pseudo-count keeping `c` finite at `s = 0`.

**Additive-smoothing interpretation.** c_hat = (a+1)/(s+1) is an additively smoothed estimator of the MLE a/s of expected traversal attempts 1/p.
It is the attempts-per-success ratio after adding one pseudo-observation that is a success.

**Shrinkage interpretation.** For `s >= 1`: `c_hat = w·(a/s) + (1 − w)·1` with `w = s/(s + 1)` — the MLE shrunk
toward the structural floor 1. Equivalently `c_hat − a/s = −f/(s(s + 1))`.

### 2.3 Not Bayesian

The estimator is **not** a Bayesian posterior expectation or posterior plug-in. Requiring
`E[1/p | n successes] = 1` for every `n` forces all posterior mass onto `p = 1`, which a proper prior achieves
only as a point mass at `p = 1`; that prior leaves the posterior undefined after any failure. Within the Beta
family every proper prior (`β₀ > 0`) gives an all-success value `(n + α₀ + β₀ − 1)/(n + α₀ − 1)` that depends on
`n`. No proper prior yields `c_hat`.

### 2.4 Properties

| Property | Proof |
|---|---|
| `c_hat >= 1` | `s <= a` |
| success cannot increase cost | `c(a+1, s+1) − c(a, s) = −f/((s+1)(s+2)) <= 0` |
| failure strictly increases cost | `c(a+1, s) − c(a, s) = 1/(s+1) > 0` |
| unobserved edge = 1 | `c(0, 0) = 1` |
| all-success edge = 1 | `c(n, n) = 1` for all `n` — counts alone create no differentiation |
| consistency | for `p > 0`, `s/a → p` a.s., so `c_hat = (1 + 1/a)/(s/a + 1/a) → 1/p`; for `p = 0`, `c_hat = a + 1 → ∞` |

**All-success production regime.** Every production traversal succeeds (V2.2 declared limitation), so
`c_hat ≡ 1` on every edge and production FutureScore equals `−d(k,g)` for every H. This is a declared
identifiability limitation, not a defect to be worked around.

### 2.5 Forgetting

`λ = 1` (disabled). Any future `λ < 1` must be applied by the record owner at write time, equally to `a` and `s`,
clocked by outcome events. `decayTrust(0.9997)` is not admissible: it acts on the raw contaminated maps and is
clocked by `liveRng() < 0.1` per loop iteration (`main.js:5098` → `5111`).

---

## 3. Planning horizon

`H = 3`. **Status:** initial normative design constant. It is inherited from the legacy horizon and selected as
the initial bounded computational horizon (evaluation cost grows as branching^H). **No empirical claim is made
that 3 is optimal.** H is a global integer constant, fixed during every evaluation, independent of candidate,
goal and state. Path length counts edges from the candidate `k`; the edge `u → k` is not included.

---

## 4. Terminal and FutureScore recursion

```
T(v,g) = T_struct(v,g) = −d(v,g)      d = BFS hop distance on the agent's known neighbour graph
T(g,g) = 0        d(v,g) = ∞  ⇒  T(v,g) = −∞        refinement R: disabled

F_h(v; P) = 0                                         if v = g
          = T(v,g)                                    if h = 0, or v has no neighbour outside P
          = max over w ∉ P of [ epsilon(v,w) + F_{h−1}(w; P ∪ {w}) ]   otherwise

FS_H(k | g) = F_H(k; {k})         no goal ⇒ FS undefined        k = g ⇒ FS = 0
```

**Bounds.** With `c_hat >= 1` and `T = −d`: `−D_ĉ(k,g) <= FS_H(k|g) <= −d(k,g)` (`D_ĉ` = learned shortest-path
cost), `FS_{H+1} <= FS_H`, and `FS_H ∈ [−∞, 0]`. In the all-success regime `FS_H(k|g) = −d(k,g)` for every H.

---

## 5. Projection

```
P(FS) = B·S/(S − FS)     for finite FS ∈ (−∞, 0]
P(−∞) = 0                P(undefined / no goal) = 0
B = 20                   S = D
D = largest finite pairwise hop distance of the known graph,  D >= 1
```

- **B = 20** — inherited interface bound; keeps the downstream weights unchanged.
- **S = D** — derived from the topology diameter; a structural scale anchor; **not fitted to behavioral
  outcomes** and not claimed to be behaviorally optimal. Using the largest *finite* distance excludes `S = ∞`
  (a disconnected graph's literal diameter), which would make `P ≡ B` — the M40 collapse.
- `P` is strictly increasing over finite FS (`P' = B·S/(S − FS)² > 0`), `P ∈ [0, B]`, reaches `B` only at
  `FS = 0`, and **no cap is applied**. `P` depends only on FS (state-invariant).

### 5.1 Non-degeneracy

Over the production operating range `FS ∈ [−X_op, 0]` with `X_op = D` and resolution `δ = 1`:

| | Property |
|---|---|
| N1 | injective over finite FS |
| N2 | span `P(0) − P(−D) = B/2` exactly when `S = D` |
| N3 | minimum adjacent gap `B·S·δ/(S + X_op)² = B/(4D)` |
| N4 | no cap: `P = B` only at `FS = 0` |

These are analytic properties. Whether they suffice behaviourally is an experimental question.

---

## 6. Forbidden inputs

FutureScore and P read only the V2.2 boundary record, the known graph topology and the goal. Forbidden: the
oracle (`p`, `expectedCostToGoal`, oracle values, oracle-derived quantities), curiosity, Q-values, decision-state
history (`thoughtTrail`, `recentMemory`, `lastDecision`, the current node, position history), RNG and
instrumentation. FutureScore evaluation performs no mutation.

---

## 7. Implementation prerequisites

1. The V2.2 boundary record: a production write at the post-outcome site (near `main.js:4924`), active with M7
   off, isolated from `_updateTrust` and `main.js:4361`/`4558` — a production change requiring authorization.
2. FutureScore rewrite in `render/planning.js` per §4.
3. `P` replacing `main.js:1874`, with D computed from topology.
4. An implementation verifier: identity, purity (no mutation, no RNG), anti-circularity (FS unchanged under a
   `p` swap with memory held fixed), static input gate, property tests for §1, a static topology census for N1–N4.

## 8. Status

- V2.3 numerical + projection contract: **FROZEN**.
- Implementation design: may be proposed next.
- **Implementation: NO-GO until separately authorized.**
- **Experiments: NO-GO until separately authorized.**
