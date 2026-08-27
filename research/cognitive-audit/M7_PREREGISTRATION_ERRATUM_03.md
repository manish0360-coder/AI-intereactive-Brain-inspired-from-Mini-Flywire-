# M7 Pre-Registration — Erratum 03

**Erratum ID:** M7-ERR-03
**Lineage:** extends [`M7_PREREGISTRATION_ERRATUM_01.md`](M7_PREREGISTRATION_ERRATUM_01.md) (ERR-01a, ERR-01b) and [`M7_PREREGISTRATION_ERRATUM_02.md`](M7_PREREGISTRATION_ERRATUM_02.md) (ERR-02)
**Date:** 2026-08-20
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-08-20, items 1–8.

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

This erratum supersedes **one thing**: the *objective function* left underspecified by frozen §3.5 constraint **R5**.

It does **not** change R5's purpose, its threshold, its role in configuration acceptance, or any other constraint. R1–R4 are untouched.

---

## 2. The defect

### 2.1 The frozen text

Frozen §3.5, constraint R5:

> | **R5** | Expected-reliability-optimal and hop-optimal policies differ on ≥ 4 states | the hidden variable is decision-relevant |

The phrase **"expected-reliability-optimal"** is not defined anywhere in the frozen document. No objective, no horizon, and no tie-break rule is given.

### 2.2 Why the natural reading is degenerate — proof

The first Director ruling on this point (2026-08-20, superseded by item 1 of the same day's later ruling) proposed *"maximize eventual goal-reach probability under fixed `p_e`"*. That objective is **independent of `p_e`** in this environment, and therefore cannot detect the property R5 exists to establish.

Under frozen §3.3 a slip leaves the agent **at `u`**, consuming one tick. A stationary deterministic policy `π` therefore **retries the same edge** until it succeeds. Every `p_e ≥ 0.25 > 0` (frozen §3.5), so each attempted edge succeeds with probability 1 in the limit. The induced trajectory is exactly the deterministic walk following `π`.

Hence:

```
P(eventually reach goal | π)  =  1  if π's walk from the start reaches the goal
                                 0  if it cycles
```

— a value in `{0, 1}` that **does not depend on `p_e` at all**.

Consequently every goal-reaching policy ties at 1, the "expected-reliability-optimal policy" is not a function of the hidden variable, and R5's comparison against the hop-optimal policy would be decided **entirely by the tie-break rule**, not by reliability. R5 would report "decision-relevant" or "not decision-relevant" for reasons unrelated to `p_e`.

### 2.3 Classification

This is **ground 2** of the no-new-errata rule: *a demonstrable measurement invalidity where the criterion cannot distinguish the intended property.*

**The defect predates any observed result.** It is a property of the frozen text combined with the §3.3 slip model, both fixed at freeze on 2026-08-19. **No Stage-1, pilot, or confirmatory run has been executed, and no experimental data exists.** Nothing in this erratum is informed by an outcome.

---

## 3. The superseding definition — R5′

### 3.1 Objective (Director ruling items 2–3)

> The **expected-reliability-optimal policy** is the deterministic policy maximising the probability of reaching the goal within the already-frozen **`EPISODE_CAP = 150`** traversal attempts (frozen §3.7).

Computed by the finite-horizon Bellman recurrence:

```
V_h(u)  =  max over (u,v) ∈ E  [ p_uv · V_{h-1}(v)  +  (1 − p_uv) · V_{h-1}(u) ]

V_h(goal)      = 1     for all h
V_0(u ≠ goal)  = 0
```

The `(1 − p_uv) · V_{h-1}(u)` term is the slip: the agent remains at `u` having consumed one attempt. This is exactly frozen §3.3.

**The horizon is not a new parameter.** `EPISODE_CAP = 150` is already pinned by frozen §3.7 ("Episode end: goal reached … or 150 ticks elapsed"). This erratum introduces **no new constant**.

The policy compared under R5 is `π_rel(u) = argmax_v` evaluated at the full horizon `h = 150`.

### 3.2 Tie-break (Director ruling item 4)

Exact ties are resolved by **existing `connections.json` file order** — the same ordering `main.js:627` uses to build adjacency via `connectPoints`. Among tied neighbours, the one whose `connections.json` entry has the lowest index wins. **No new ordering is invented.**

### 3.3 Threshold (Director ruling item 5, unchanged from frozen R5)

R5 is satisfied only when `π_rel` differs from the topology/hop-optimal policy `π_hop` on **at least 4 decision states**.

### 3.4 Two definitions made explicit

Neither is a new parameter; both are stated so the criterion is unambiguous.

| | |
|---|---|
| **Decision state** | A non-goal node with **≥ 2 traversal neighbours**. A node with a single neighbour affords no decision, so a policy "difference" there is not meaningful. |
| **`π_hop`** | At each node, the neighbour minimising hop distance to the goal on the **traversal graph**, ties by `connections.json` order. The traversal graph is used — not the directed `connections.json` orientation — because it is the agent's actual action set, and `π_rel` is defined over that same action set. Comparing two policies over different action sets would be incoherent. |

**Note on the traversal graph.** `render/connections.js` `connectPoints()` pushes **both** directions, so the agent traverses an undirected graph: 39 `connections.json` entries → **78 directed adjacencies**. Frozen §3.1 describes them as "39 directed edges". Ruling R6 ("exactly ⌊0.35×39⌋ = 13 UNRELIABLE edges") is self-consistent only if `p_e` is assigned per **entry** and governs both traversal directions, which is how `env.js` implements it: `p_uv = p_vu`.

This does **not** affect R4, which the Director separately ruled uses the **directed** distance from destination `v` to the goal. R4 measures leakage correlation; R5 compares policies. They legitimately use different notions.

### 3.5 Anti-vacuity requirement (Director ruling item 7)

The R5 mechanism must be **demonstrated sensitive to `p_e`** — the exact property whose absence made the superseded objective invalid.

> **Required:** with topology held fixed, changing the reliability values must change at least one admissible action ranking, i.e. `π_rel` must differ between two `p_e` assignments over the same graph.

A mechanism that produced the same policy for every `p_e` would be exhibiting the §2.2 degeneracy again and must fail this check.

---

## 4. Post-shift acceptance (Director ruling item 8)

> **R1–R5 configuration acceptance applies to the PRE-SHIFT (Phase I) configuration only.** The post-shift distribution swap of frozen §3.6 is an **intervention**, not a second configuration, and is **not re-tested** against the acceptance constraints.

This resolves an ambiguity the frozen text left open — §3.5 defines acceptance for "a configuration", while §3.6 introduces a mid-run swap without stating whether the swapped assignment must also satisfy R1–R5. Ruling item 8 fixes the literal reading: acceptance is a property of the configuration **as generated**.

`env.js` implements this: `evaluateConstraints()` operates on `pPhase1` only.

---

## 5. What this erratum does NOT change

| Category | Status |
|---|---|
| **Frozen document bytes and digest** | **Unchanged** — validated before and after |
| R5's purpose, its ≥ 4 threshold, its role in acceptance | Unchanged |
| R1, R2, R3, R4 | Unchanged |
| `EPISODE_CAP = 150`, `T_SHIFT = 1500`, `RUN_TICKS = 3000` | Unchanged — reused, not redefined |
| §3.5 bimodal regime, `f = 0.35` → 13 edges, both p ranges | Unchanged |
| §3.6 reliability shift mechanics | Unchanged |
| Hypotheses H1 / H0 / H1-strict; competing hypotheses | Unchanged |
| Seven arms; controls locked | Unchanged |
| Metrics; windows W1–W4 | Unchanged |
| Confirmatory family = 6; Holm; α = 0.01; bootstrap seeds | Unchanged |
| Stage-1 → power → Stage-2 procedure; **4200 cap** | Unchanged |
| Falsification F-1…F-11; §15.0 equivalence | Unchanged |
| **Claim ceiling and forbidden-word list** | Unchanged |
| **D2, F2b, D8/F12, D12 — all unrepaired** | Unchanged |
| ERR-01a (G16.3′), ERR-01b (S3.2′), ERR-02 (S1.7′) | Unchanged, still in force |
| Historical gates S1.7, S3.2 | Preserved, still executed, still reported |

**Scope in one sentence:** this erratum defines one previously undefined objective function and states two definitions it depends on. It introduces no new constant, changes no threshold, and touches no hypothesis, arm, metric, window, sample-size rule, or claim.

---

## 6. Erratum register — cumulative

| ID | Supersedes | Replacement | Implemented in | Result |
|---|---|---|---|---|
| **M7-ERR-01a** | Frozen §13.4 G16.3, breakdown bit-identity sub-clause | G16.3′(1)–(5) + anti-vacuity, tol 1e-12 | `experiments/phase1_0/verify_G16.js` | **7/7 PASS** |
| **M7-ERR-01b** | `verify_S3.js` S3.2 single-seed residual threshold | S3.2′(a)–(b), fixed six-seed panel | `experiments/phase1_0/verify_S3prime.js` | **2/2 PASS** |
| **M7-ERR-02** | Application of `verify_S1b.js` S1.7 to the M7 rectification | S1.7′(1)–(6), independent pre-D3 arm | `experiments/phase1_0/verify_S1prime.js` | **7/7 PASS** |
| **M7-ERR-03** | Frozen §3.5 R5 objective (undefined; degenerate reading) | R5′ finite-horizon Bellman, `EPISODE_CAP = 150`, `connections.json` tie-break | `experiments/m7/env.js` | see §7 |

All superseded originals remain **preserved and reported**. No frozen text has ever been edited.

---

## 7. Implementation status

**At the time this erratum was written: NOT YET IMPLEMENTED.** Per Director ruling item 6, this document is authored *before* the R5 implementation is completed, preserving the discipline that the criterion is fixed before the mechanism that satisfies it.

Implementation follows in `experiments/m7/env.js` (`checkR5` → `reliabilityOptimalPolicy`, `hopOptimalPolicy`, `r5DecisionStateDiff`), with verification in `experiments/m7/verify_env.js` including the §3.5 anti-vacuity check.

---

## STATUS: ERRATUM ISSUED · FROZEN DOCUMENT UNMODIFIED

`M7_PREREGISTRATION.md` and `M7_PREREGISTRATION.sha256` were not modified; digest `2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9` validates unchanged. No Stage-1, pilot, or confirmatory run. No experiment-derived decision. Nothing committed, nothing pushed.
