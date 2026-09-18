# M39 — FutureScore Shadow-Evaluation Formulation

**Status:** FORMULATION ONLY. No implementation, no new seed, no configuration generated, no
experiment, no change to C1, UQ-B, `env.js`, production code or any historical artifact.
**Base:** D2 `8b9355f` (FutureScore identity repaired). **Gate:** `research/preregistrations/verify_m39.js`.
**Reviewed input:** Gemini's review of the proposed capped-trajectory experiment, treated as a
hypothesis to audit rather than a design to adopt.

> # M39-GREEN
> A state-matched shadow evaluation is defensible, and most of its machinery **already exists in the
> repository**: UQ-B built it to measure FutureScore **before D2**, when FutureScore was nearly
> always 0. The recommended study replaces Gemini's RANDOM and ORACLE arms and redefines its oracle,
> so the design is narrower than Gemini's. Seven rulings are needed before anything is preregistered
> (§14).

---

## 1. Exact scientific question

> **With the complete decision-relevant state held fixed, does the correctly wired FutureScore term
> change which candidate the agent ranks first (`bestChoice`)? When it does, does it move that choice
> toward or away from the repository's existing expected-attempts oracle?**

This is a question about **one immediate ranking decision**, not about trajectories, learning,
planning or cognition. Its role in the programme: it is the first measurement that can **falsify**
FutureScore as a decision-quality mechanism on this substrate. Only a mechanism that survives such a
test is a candidate for extraction as a cognitive primitive.

---

## 2. Source trace — current repaired source (`8b9355f`)

| Step | Where | What it does |
|---|---|---|
| entry | `main.js:1403` | `function runPrediction(startKey)`; step 0 is the decision, steps ≥ 1 are the imagination chain |
| pre-filter pool | `main.js:1593` | `allCandidates` = learned `transitions.get(currentKey)` keys ∪ graph neighbours |
| loop | `main.js:1607` | `allCandidates.forEach((value, k) => {` |
| filter F1 | `main.js:1610` | penalty on `currentKey->k` > 10 |
| filter F2 | `main.js:1620` | goal-namespaced `Q < -0.5` |
| filter F3 | `main.js:1674` | not a graph neighbour, not episode-trained, not human-trained |
| filter F4 | `main.js:1678` | `canReachGoal(k, goal)`: the candidate must be within 3 hops of the goal |
| filter F5 | `main.js:1710` | `analyzeCandidate` returns null (its own penalty > 10 check) |
| FutureScore | `main.js:1854` | `futureScore(targetNeuron, goal, rewards, penalties, curiosityMap, 3)` |
| cap | `main.js:1874` | `futureBonus = Math.min(imaginedFuture * 4, 20)` |
| scoring | `main.js:2068` | `calculateDecisionScore({... futureBonus ...})`: `futureBonus × 1.2` in the learned score, and in the arbitration `semanticScore` |
| blend | `main.js:2266` | `arbitratedScore = finalWeight × 0.60 + competitiveScore × 0.40` |
| scored pool | `main.js:2271` | `choices.push({ key: k, weight: arbitratedScore })` |
| exploration draw | `main.js:2366` | ε draw, taken **before** sorting |
| **decision** | `main.js:2378` | `const bestChoice = sorted[0]`: the greedy argmax over the scored pool |
| augmentation | `main.js:2423` | after `bestChoice`, neighbours missing from `choices` are appended with weight = raw embedding similarity |
| executed move | `main.js:2596` | `nextKey` = exploration pick, or `topChoices[0]` of the augmented softmax-sorted pool, then two anti-repeat swaps that read `thoughtTrail` |
| biology | `main.js:2835` | `regulateBiology(...)`, strictly after `bestChoice` |

**Three distinct "choices" exist, and they must not be conflated:**

1. `bestChoice`: argmax over the FutureScore-scored pool.
2. The greedy executed move: augmented pool, softmax order, history-dependent anti-repeat swaps.
3. The executed move with the ε override.

FutureScore enters only (1) directly. **The readout is `bestChoice` at step 0**, exactly as UQ-B §8.

**Pool invariance (structural):** every exclusion F1–F5 precedes the FutureScore call. The
post-filter pool is therefore **identical under every arm** that changes only `futureBonus`.

---

## 3. What already exists (evidence; not re-invented)

| Existing machinery | Source | Reused for |
|---|---|---|
| the step-0 `bestChoice` readout via an exposed `runPrediction(u)` and a guarded probe | `experiments/uqb/instrument.js` (`__UQB_PROBE__`, `__UQB_EXPOSE__`) | the readout |
| ABLATED = `futureBonus` delivered as exactly 0 at its formation point, with the `futureScore` call preserved | UQ-B §5.1 | the ZERO arm |
| within-decision permutation of the `futureBonus` multiset (two-pass restructuring, dedicated generator) | UQ-B §6, `experiments/uqb/permute.js` | the PERM arm |
| freeze of the read-mutating `transitionUncertaintyMap` (R2), and snapshot/restore of the nine `regulateBiology` states (R3) | `UQB_J1_STATE_CLOSURE_AUDIT_CORRECTED.md`; `instrument.js` `__UQB_FREEZE__`; `bio.js` `__UQB_FREEZE_BIO__` | holding state fixed across readouts |
| per-readout RNG reseeding, identical across arms at a state | UQ-B §16.1 | pairing the drift draw |
| pre-filter size, rejected count and scored-pool size per decision | `experiments/m9/probe.js` ledger (used by M11) | the pool definitions |
| deterministic long runs under the M7 harness: the replay cooldown was the **sole** causal clock source, and `__M7_REPLAY_ONCE__` restores determinism | Director ruling 2026-08-26, `experiments/m7/verify_determinism.js`, `experiments/m7/run.js` | state generation |
| oracles: `reliabilityOptimalPolicy` (expected attempts, Σ1/p, Dijkstra) and `hopOptimalPolicy` | `experiments/m7/env.js` | correctness |

**UQ-B measured the pre-D2 mechanism.** Its frozen results show 71 configurations and **0 C2
rejections** in 142 (configuration, phase) cells. In **100 of the 142 cells all 19 shuffles tied the
observed alignment** (e.g. 897022:0, observed 2, shuffles all 2). The other 42 varied, and they occur
only for goals 8, 12 and 19. Those are goals for which some of nodes 1–4 lie within 3 hops, so the
pre-D2 misresolution (1→5, 2→9, 3→13, 4→17) could give non-zero values. *Inference, not proof:* the
ties and the variation are what the D2 defect predicts. UQ-B accepted no goal-16 configuration.

UQ-B stays frozen and valid as a record of the defective mechanism. It is **not** evidence about the
repaired one. M39 is its successor question, not a reanalysis.

**Correction to the D2 record (lineage, not a reopening).** D2's note stated that seeded 300-tick
runs diverge after about 780 decisions. That was measured under the **Phase 1.0 driver**, which does
not set `__M7_REPLAY_ONCE__`. The M7 harness does set it, and under the 2026-08-26 ruling its runs were
deterministic over 48 runs. Whether that still holds with the **repaired** FutureScore is **unverified**
and is pilot check P1.

---

## 4. Fixed-state definition

A **fixed state** is the tuple

```
σ = (S, u, g, ρ)
  S  the complete learned and behavioural state at a snapshot of an ARMED M7-harness run
  u  the decision node queried (startKey)
  g  the goal
  ρ  the RNG stream state installed immediately before the readout
```

Classification of every state variable that can affect candidate construction or scoring:

| Variable | Enters via | Treatment |
|---|---|---|
| `transitions`, `rewards`, `penalties`, `curiosityMap`, Q table, `adjacencyMemory`, episodes, schemas, consolidation, semantic layer, path trust, local emotions, embeddings | pool, filters, scoring, FutureScore | **frozen**: snapshot, read-only during readouts (no learning writer in `runPrediction`, J1 §2) |
| `transitionUncertaintyMap` | decays **on read** | **frozen** by the existing R2 guard |
| nine `behavior.js` states | scoring context; written after `bestChoice` | **frozen** by the existing R3 snapshot/restore |
| motivational drives | recomputed from their arguments | **regenerated**: a pure function of frozen inputs |
| `thoughtTrail`, `recentMemory` | repetition penalty, trajectory integrity | **frozen** at the snapshot's values; see RU-3 |
| per-candidate drift (`scoring.js`, one draw per call) | final score | **replayed**: identical reseed per `(c, u)` across arms |
| ε draw | after the pool is scored | irrelevant to `bestChoice`; consumed identically |
| wall clock | see §10 | excluded by construction for the readout; tested empirically (P4) |

---

## 5. Candidate-pool definitions

| Term | Definition |
|---|---|
| **pre-filter pool** `P⁰(σ)` | `allCandidates` at `main.js:1593` |
| **decision-time pool** `P(σ)` | the keys pushed into `choices` at `main.js:2271`, i.e. after F1–F5 |
| **selected action** `b_A(σ)` | `bestChoice.key` at `main.js:2378` under arm A |

`P(σ)` is arm-invariant (§2). An empty `P(σ)` means no `bestChoice`; the state is **undefined**, is
counted, and is excluded from every rate.

---

## 6. Oracle — existing source only

**Primary:** `R*(u) = argmin over v ∈ N(u) of [1/p(u,v) + C(v)]`, where `C = expectedCostToGoal(p, g)`
is the set-valued form of `env.reliabilityOptimalPolicy`, over graph neighbours only, under the
reliability regime **in force at the snapshot** (RU-4). This is UQ-B §9's primary oracle and R5's
reliability-optimal policy. It is the only existing oracle that encodes the environment's hidden
reliability, which is what "decision quality" means in M7.

**Disclosure only:** `H*(u)` = the set of neighbours on some hop-shortest route. Two reasons it is
not primary:

1. `goalGradientBoost` (`main.js`, `30/(dist + 0.5)·0.75 + 5`, ×2 in scoring) already encodes hop
   distance directly, so hop alignment is largely fixed without FutureScore.
2. FutureScore never reads `p` (UQ-B G1). If it helps at all, the help must come through learned memory.

**Set-valued, not tie-broken:** env's file-order tie-break picks one element. The study scores
membership in the full argmin set. Ties are measure-zero under continuous `p` but common for `H*`.

**Rejected:** Gemini's "optimal shortest-path action" as the primary oracle, for reason (1) above;
and any new oracle.

---

## 7. Missing or undefined oracle cases

| Case | Handling |
|---|---|
| `R*(u) ∩ P(σ) = ∅`, the oracle action filtered out (e.g. by F4 when the optimal neighbour is 4 hops from the goal, or by F1/F2) | **unattainable**: counted, excluded from the primary denominator. Unbiased, because attainability is arm-invariant (§2) |
| `P(σ) = ∅` | **undefined**: counted, excluded |
| `b_A(σ)` is a trained non-neighbour | scored **incorrect** (not in `N(u)`), and counted separately |
| `u = g` | excluded by the population definition |

The attainable fraction is itself reported. If it is small, the estimand is ill-defined (failure
condition X3).

---

## 8. Estimands

| | Estimand | Verdict |
|---|---|---|
| E1 | decision-change rate `D = mean over σ of 1[b_ON ≠ b_ZERO]`, oracle-free | **secondary**: existence of influence; D2 showed it is non-zero at one state |
| **E2** | **paired oracle contrast** `Δ = mean over attainable σ of (1[b_ON ∈ R*] − 1[b_ZERO ∈ R*])`, with discordant counts `n₊` (ON correct, ZERO not) and `n₋` (the reverse) | **PRIMARY** |
| E3 | assignment informativeness: alignment under ON vs within-decision permutations PERMⱼ of the same `futureBonus` values | **secondary**: separates information from magnitude |
| E4 | oracle-action rank or score margin | **rejected**: the 60/40 blend with a nonlinear arbitration and a drift term has no interpretable margin scale; pools are small (graph degree 3–6, plus any trained candidates), so ranks are coarse |
| E5 | trajectory goal-reach and steps-to-goal | **rejected here**: arms diverge after the first differing decision (D2: decision 4), so later states are not paired. This is Gemini's valid point |

**Why E2:** it is paired on an identical pool with identical RNG. Its conditioning set is
arm-invariant. It uses an existing oracle. It separates **helps** (`n₊`) from **hurts** (`n₋`) instead
of netting them silently. Within a fixed σ the readout is deterministic, so "probability of choosing
the optimum" is a rate over states, not a per-state probability. Gemini's wording is corrected on
this point.

**What E2 is not:** UQ-B's C1 compared end-of-run policies from **different histories** (a total
effect). E2 holds history fixed and toggles only the readout-time term: the **instantaneous
contribution** UQ-B explicitly did not estimate.

---

## 9. Interventions and controls

| Arm | What changes | What stays fixed | Recommendation |
|---|---|---|---|
| **ON** | nothing, the committed repaired behaviour | — | required |
| **ZERO** | `futureBonus` = 0 at `main.js:1874` in both the learned and the arbitration paths | pool, every other term, RNG draw sequence, the `futureScore` call itself | **required**: the causal contrast |
| **PERM** | assignment of the same `futureBonus` multiset across the pool's candidates | values, mean, variance, cap, pool, RNG | **recommended**: see below |
| RANDOM (Gemini) | independent random values | — | **rejected** |
| ORACLE-INJECTED (Gemini) | `futureBonus` = cap (20) on `R*`, 0 elsewhere | pool, RNG | **pilot diagnostic only** |

**Why ZERO alone is not enough.** `futureBonus` also enters the arbitration's `semanticScore`, which
`arbitrate()` combines nonlinearly. Removing it changes score **magnitude** as well as **information**.
Gemini's temperature concern does not apply as stated: the softmax runs only **after** `bestChoice`.
But a magnitude channel exists.

**Why PERM beats RANDOM.** PERM holds the exact per-decision value multiset, so any ON-vs-PERM
difference is attributable to **which candidate received which value**. RANDOM would add an arbitrary
distribution choice and would not be matched per decision. It identifies nothing PERM does not. UQ-B
also froze a mandatory wiring control that carries over: under ZERO every permutation is the identity,
so a PERM "effect" under ZERO means broken instrumentation.

**Why ORACLE-INJECTED is diagnostic only.** It establishes channel **capacity**: whether a maximal
bonus on the oracle action can make it `bestChoice`. That bounds what E2 could ever show, and it
separates "FutureScore is uninformative" from "the channel is too weak to matter". Its value mapping
(20 on the oracle action, 0 elsewhere) is a design choice, not a mechanism, so it has no place in the
confirmatory estimand.

---

## 10. Wall-clock handling

- **State generation** is a long run. Under the M7 harness the only proven causal clock site is
  neutralised by `__M7_REPLAY_ONCE__`. This must be **re-verified with the repaired source** (P1). If
  it fails, snapshots must be serialised as data, not regenerated from seed (RU-2).
- **A single readout:**
  - `runPrediction`'s body (`main.js:1403` onward) contains no direct `Date.now()`.
  - `analyzeCandidate` reads `Date.now()` only to compute `timeScore` (`render/candidateAnalysis.js:348`).
    `main.js` destructures `timeScore` at `:1731` and **never uses it** (its only occurrence).
  - Replay, schema rebuild and context-shift writers are not called from `runPrediction` (J1 §2).
  - A complete **transitive** static proof is **not claimed**, because the call graph is deep. It is
    replaced by an empirical test: P4 evaluates every readout under two widely separated fixed clock
    values, through an outside wrapper, and requires byte-identical readouts.
- No production clock behaviour changes. **Gemini's "not an MDP" is not adopted.** The evidence
  supports wall-clock-dependent runtime behaviour in one driver, and nothing stronger.

---

## 11. State generation

- **Population per configuration:** `decisionStates(g)`, i.e. 19 states for every frozen goal, as
  in UQ-B §7. It is computed from topology alone, with **no arrival conditioning**. Every state is
  read out in every arm.
- **Snapshot:** the end of one ARMED M7-harness run per configuration (RU-2).
- **Rejected:** Gemini's random-walk state sampling. A random walk produces graph positions, not
  agent states. The learned memory FutureScore reads must come from the agent's own history.
- **Separation of development and science:**
  - The pilot reuses **only already-evaluated development fixtures** from the consumed development
    block `896000–896999`: M11's four accepted fixtures `896066:0`, `896066:1`, `896238:2`, `896329:3`.
  - No new seed is consumed.
  - The scientific population must come from a block the Director rules (RU-1). It is never generated
    before preregistration.
  - Nothing measured in the pilot enters the study.

---

## 12. Minimal development pilot (the next milestone; nothing run here)

Four fixtures × 19 states × arms {ON, ZERO, PERM₁…₁₉, ORACLE-INJECTED}, all readouts in-process at one
snapshot per fixture.

| # | Establishes | Pass criterion |
|---|---|---|
| P0 | instrumentation integrity | every UQ-B/M9 anchor resolves exactly once on current `main.js` (they fail closed) |
| P1 | state reproducibility | two fresh processes give identical M7 run fingerprints for each fixture, with the repaired source |
| P2 | candidate-pool reproducibility | `P⁰`, `P` and `b_A` identical across two processes, and `P` identical across all arms |
| P3 | FutureScore reproducibility | the `futureBonus` vector is identical across processes; all zeros under ZERO; multiset-preserving under PERM |
| P4 | clock invariance of the readout | identical readouts under two fixed clock values (outside wrapper, diagnostic only) |
| P5 | oracle attainability | attainable fraction of the 76 `(fixture, u)` states, reported |
| P6 | non-trivial intervention | `n₊ + n₋ > 0` and `D > 0` |
| P7 | no obvious degeneracy | fraction of candidates at the cap (20), fraction of states where all pool candidates share one `futureBonus`, and ORACLE-INJECTED controllability |

The pilot computes **no inferential statistic** and no Δ is interpreted.

---

## 13. Evidence, inference, hypothesis

- **EVIDENCE:**
  - pool exclusions precede FutureScore (§2);
  - UQ-B's machinery exists; its C2 never rejected, and 100 of 142 cells tie completely;
  - the M7 harness had deterministic long runs under `__M7_REPLAY_ONCE__` (pre-D2);
  - D2 showed FutureScore changes `bestChoice` at one state;
  - `timeScore` is computed but unused.
- **INFERENCE:**
  - UQ-B's null C2 reflects the D2 defect rather than the mechanism;
  - a readout at a fixed snapshot is clock-independent (to be tested, P4);
  - ZERO confounds information with magnitude.
- **HYPOTHESIS, to be tested and not assumed:** the repaired FutureScore moves `bestChoice` toward
  `R*` (`n₊ > n₋`). Its competitor is that it moves decisions **without** informing them. The
  mechanism gives reason to expect this: its `lookAheadScore` component reads embeddings built from
  random draws that carry no environmental information (UQ-B G2).
- **No claim** that FutureScore is useful, optimal, improves planning, or improves cognition.

---

## 14. Rulings required (unresolved from the repository)

- **RU-1** Scientific population seed block (none assigned; must be disjoint from every consumed
  block and the held-out floor).
- **RU-2** Snapshot timing (end of run vs several time points) and history arm (ARMED only), and
  whether a snapshot must be serialised if P1 fails.
- **RU-3** Treatment of `thoughtTrail`/`recentMemory` when reading out at `u` ≠ the agent's position
  (frozen as in UQ-B, or neutralised).
- **RU-4** Which reliability regime defines `R*` at an end-of-run snapshot (the run ends after
  `T_SHIFT`, so phase 2 is in force; UQ-B scored both and never pooled).
- **RU-5** Unit of inference (configuration, not state, since the 19 states share one learned
  state) and the minimum number of configurations.
- **RU-6** The attainability threshold below which E2 is declared ill-defined.
- **RU-7** Whether M39 may import the frozen UQ-B/M9 instrumentation read-only, or must reimplement it.

---

## 15. Explicit failure conditions

- **X1** P0–P4 fail: the measurement is not reproducible. Halt; no study.
- **X2** P3 finds all-zero `futureBonus` under ON: the D2 repair did not reach the readout path. Halt.
- **X3** P5: too few attainable states (RU-6). E2 is ill-defined on this substrate.
- **X4** P6: `n₊ + n₋ = 0` over all fixtures. There is no instantaneous effect to study at this scale.
  This is a result, not a failure, and it ends the E2 line.
- **X5** P7: `futureBonus` saturates at the cap for nearly all candidates, or ORACLE-INJECTED cannot
  change `bestChoice`. The channel is degenerate and any E2 null is uninterpretable.
- **X6** a PERM effect under ZERO: the instrumentation is broken (inherited UQ-B wiring control).

---

## 16. Proposed next milestone

**M39-P1 — development pilot.** Implement P0–P7 exactly as §12, on the four existing development
fixtures, in its own directory. It imports the existing instrumentation if RU-7 permits. It uses no new
seed, computes no inference and makes no claim. Its output decides between preregistering E2 (M40) and
stopping the E2 line under X3–X5.

**Boundary:** development only. Not C1, not UQ-B, not a reanalysis of either. No FutureScore,
planning, learning or cognition claim.

---

> # M39-GREEN
> The formulation is complete and source-verified. The pilot is the next step. No design decision is
> taken on a scientific population before RU-1–RU-7.

Believe in yourself and keep going
