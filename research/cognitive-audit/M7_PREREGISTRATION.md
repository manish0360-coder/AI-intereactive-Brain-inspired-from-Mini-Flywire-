# M7 Pre-Registration — Belief-Driven Adaptation Under Hidden Transition Reliability

**Artifact status:** **FROZEN 2026-08-19.** Content is final. Any subsequent change invalidates the recorded digest and constitutes a protocol deviation that must be reported as such.
**Version:** **1.0 (frozen)**
**Date authored:** 2026-08-19 · **Date frozen:** 2026-08-19
**Author:** Chief Systems Engineer
**Governing specification:** [`M7_SCIENTIFIC_SPEC_DRAFT.md`](M7_SCIENTIFIC_SPEC_DRAFT.md) revision 2
**Authority:** Director rulings of 2026-08-19 — B1 (G16) approved; multiplicity family confirmed at six; freeze authorised. **No implementation authorisation has been given.**
**Integrity digest:** SHA-256, recorded in the sidecar [`M7_PREREGISTRATION.sha256`](M7_PREREGISTRATION.sha256). The digest cannot be embedded in the file it covers, so it is held externally (§21).

---

## 0. What this document is, and the rule that governs it

This is the pre-registration for M7. Once frozen and hashed, it fixes every analytic decision **before** any data exists and **before** the approved trust-rectification change is implemented in source.

> **GOVERNING SCIENTIFIC RULE (Director, 2026-08-19).** The pre-registration specifies the experiment **before** the source implementation of the approved rectification change. **The experiment may not be tuned after implementation.**

### 0.1 The consequence of that rule, stated explicitly

This document describes a build **that does not yet exist**. The approved symmetric `trustBonus` (§13) is specified here but is *not implemented* in `render/scoring.js` as of authoring. That is intentional and is the point of the ordering.

It follows that:

- **Gate G16 is not a formality.** It is the mechanism that proves the *implemented* build matches the build this document specifies. If G16 fails, the correct response is to fix the implementation to match this document — **never** to amend this document to match the implementation.
- Any discrepancy discovered between this specification and the implemented build after freeze is reported as a **protocol deviation**, in a dedicated section of the final report, with its direction and likely effect on results.

### 0.2 Freeze procedure (not yet executed)

1. Director reviews this document.
2. Any corrections are made **before** freeze.
3. The file is hashed: `sha256sum M7_PREREGISTRATION.md`; the digest is recorded in the Phase 1.0 report and in the commit message that freezes it.
4. **The hash is taken before Stage 1 runs**, not before Stage 2 — because under Ruling Q6 the frozen artifact contains the *procedure* that computes the Stage-2 sample size, and that procedure must be immune to pilot results.
5. Only after the hash exists may the §13 rectification be implemented.

### 0.3 File location — RESOLVED by Director ruling (2026-08-19)

> **This artifact's canonical path is `research/cognitive-audit/M7_PREREGISTRATION.md`.** It does **not** move to `experiments/m7/`, and `experiments/m7/` is **not to be created yet**. The governing specification's §14.1 has been amended to point here. The artifact is governance, not experiment code.

The full-path amendment is documentation only; no experiment scaffolding exists.

---

## 1. Baseline identification (exact and unambiguous)

Every number this study produces is relative to one specific build.

| | |
|---|---|
| Repository | `mini-flywire` |
| Git HEAD | **`7c8bddeae3df524f0e2dd5eff09f905540b79ed3`** ("Engineering Readness Review") |
| Branch | `main`, tracking `origin/main`, no divergence |
| Working-tree state | HEAD **plus uncommitted M1–M6**, comprising 11 modified tracked files and 3 untracked paths (`benchmarks/harness/headlessShim.js`, `experiments/phase1_0/`, `research/cognitive-audit/`) |
| Milestones present | M1 (D3 scoring signs) · M2 (D1 composite Q namespace) · M3 (`getQAny`) · M4 (seeded RNG routing) · M5 (F2 epsilon stale-action) · M6 (`peekTransitionUncertainty`) |
| **Not** present | D2 repair · F2b repair · D8/F12 repair · D12 repair · trust rectification |

### 1.1 Verified gate state at authoring — 69/69 assertions green

Re-run 2026-08-19 against this exact tree:

| Milestone | Script | Result |
|---|---|---|
| M1 | `verify_S1.js` + `verify_S1b.js` | **16/16** (12 + 4) |
| M1 refactor parity | `parity_termarray.js` | **200000/200000** bit-identical, worst \|delta\| = 0 |
| M2 + M3 | `verify_S2.js` | **14/14** |
| M4 | `verify_S4.js` | **12/12** |
| M5 | `verify_S3.js` | **9/9** (gates S3.1–S3.6) |
| M6 | `verify_S6.js` | **18/18** |

### 1.2 Reproduction command — working directory is load-bearing

`verify_S2.js` and `verify_S4.js` resolve paths relative to the current working directory and **fail with `ENOENT` when launched from the repository root**. All seven scripts pass from `experiments/phase1_0`:

```bash
cd experiments/phase1_0 && node verify_S1.js && node verify_S1b.js && node verify_S2.js && node verify_S3.js && node verify_S4.js && node verify_S6.js && node parity_termarray.js
```

### 1.3 Known baseline defects, deliberately unrepaired

Carried as declared limitations, not as unknowns.

| ID | Defect | Status in this study |
|---|---|---|
| **D2** | `futureScore` calls `dfs(neuron.id, …)` instead of `userData.id` ⇒ `futureBonus ≡ 0` for **0/20 nodes non-zero** (measured). No look-ahead exists. | **Unrepaired (Ruling Q4).** Scopes M7 to one-step belief use. See §17. |
| **F2b** | Replay branch leaves `lastReasoning` stale. Branch fires ~8% of steps; **measured stale-execution rate 4.5% (17/380)**. | **Unrepaired (Ruling Q3).** Handled by exclusion, §9. |
| **D8/F12** | `rewards` map bare-keyed while Q is composite ⇒ `rewardPredictionError` partly a namespace artifact. | **Unrepaired.** Propagates only through the prediction-error pathway pinned in §10.2. |
| **D12** | `episodeRewards` undeclared at `main.js:4545`; currently unreachable because `recentMemory` is cleared at `main.js:4484` first. | **Unrepaired.** Run-stability risk; harness must fail loudly and crashed pairs are dropped across all arms (§9.4). |
| **S3.7** | `verify_S3.js` header comment claims gates `S3.1–S3.7`; only **S3.1–S3.6** exist. | Recorded. Cite M5 as **S3.1–S3.6, 9/9**. |

---

## 2. Hypotheses

### 2.1 H1 (primary, directional)

In an environment with hidden per-edge transition reliability `p_e`, the existing Beta-Bernoulli path-trust estimator will:

1. converge toward `p_e`;
2. change action selection at a measurable rate;
3. and the decisions it changes will yield higher subsequent return than the decisions the belief-severed agent makes **in the identical state under the identical RNG stream**.

### 2.2 H0 (null)

With belief severed, performance, adaptation speed, and post-shift recovery are statistically indistinguishable from the belief arm at the Stage-2 sample size determined by §11.

### 2.3 H1-strict — the only claim that licenses causal language

> **H1-strict holds iff H1 holds AND the advantage survives against both AGGREGATE-ONLY (A5) and SHUFFLED (A6).**

That is: the advantage derives specifically from **per-edge correspondence** between belief and hidden variable — not from a global reliability signal (A5 would match), and not from the mere presence of an additional score term (A6 would match).

H1 alone licenses at most *"an edge-reliability estimate improved performance."* Only H1-strict licenses *"belief causally improved decisions."*

### 2.4 Competing hypotheses and their pre-registered discriminating signatures

| | Hypothesis | Discriminating signature |
|---|---|---|
| **A** | Genuine belief-based adaptation | Advantage largest in W1 and W3, shrinking by W4; calibration high; flip rate monotone increasing in \|trust−0.5\|; conditional advantage > 0; survives A5 and A6 |
| **B** | Ordinary model-free RL | A2 matches A1 asymptotically **and recovers at the same rate after the shift** |
| **C** | Static heuristics | A4 (FROZEN) matches A1; no learning curve |
| **D** | Memorization | Collapse on held-out configs and after the shift; belief tracks visit counts not `p_e` |
| **E** | Random exploration | A3 (RANDOM) matches A1; outcome independent of `p_e` |

**Pre-registered note on B:** ordinary Q-learning absorbs `p_e` for free under stochastic transitions. The A-vs-B discriminator is therefore **temporal** (W1 and W3), never the asymptote. A W4 null is *predicted by H1* and is not evidence against it.

---

## 3. Environment definition (exact)

### 3.1 Graph

The existing graph, unchanged: **20 nodes** (`neurons.json`), **39 directed edges** (`connections.json`). No topology change.

### 3.2 Hidden variable

For each directed edge `e = (u→v)`: a hidden **traversal reliability** `p_e ∈ [0,1]`, constant within a phase, never exposed to any agent-reachable code path.

### 3.3 Transition process

Attempting edge `e = (u→v)`:

| Outcome | Probability | Result |
|---|---|---|
| **success** | `p_e` | agent arrives at `v` |
| **slip** | `1 − p_e` | agent **remains at `u`**, one tick consumed |

**Realised-vs-intended semantics (binding, gate G14):** on a slip, the **realised** node (`u`) enters `agentCurrent`, Q-learning, reward computation and prediction error; the **intended** edge (`u→v`) is what receives the trust *attempt*. Confusing these would make the agent learn a false model of its own dynamics.

### 3.4 Reward process — completely unchanged

No new reward branch, no slip penalty, no reliability term. `rewardSignal` is computed by the existing rules (`main.js:3684–3785`) on the **realised** transition. **Unreliability costs the agent only elapsed ticks against a fixed budget.** This is deliberate: it removes the "reward-design artifact" objection at the root.

### 3.5 Configuration generation

A **configuration** = one `{p_e}` assignment + one goal node, from a config seed independent of every agent seed.

**Primary regime (bimodal) — the only regime any claim rests on:**

- fraction `f = 0.35` of edges UNRELIABLE, `p_e ~ U(0.25, 0.45)`
- remaining `0.65` RELIABLE, `p_e ~ U(0.90, 1.00)`

**Secondary regime (continuous):** `p_e ~ Beta(2,2)`. **Run condition pinned:** run **only if** F-11 does not fire **and** at least one member of the primary confirmatory family (§11.1) is confirmed at Stage 2. **Fully exploratory** — reported in the exploratory section, no pre-registered claim rests on it, and it is not part of any confirmatory family.

**Rejection sampling.** A configuration is accepted only if **all five** hold:

| | Constraint | Purpose |
|---|---|---|
| **R1** | ≥ 2 distinct routes to the goal from ≥ 6 start nodes | a choice exists |
| **R2** | The hop-count-shortest route has strictly lower expected reliability than at least one longer route | the hidden variable must **contradict** graph distance |
| **R3** | \|Spearman ρ(p_e, cosine similarity of e's endpoints)\| < 0.10 | no leakage through embeddings |
| **R4** | \|Spearman ρ(p_e, e's graph distance to goal)\| < 0.10 | no leakage through topology |
| **R5** | Expected-reliability-optimal and hop-optimal policies differ on ≥ 4 states | the hidden variable is decision-relevant |

Configurations failing any constraint are **discarded and redrawn** from the next config seed in sequence. The count of discards per accepted configuration is logged.

### 3.6 Reliability shift

At **tick 1500** of 3000, the RELIABLE and UNRELIABLE edge sets are **swapped**. Silently — nothing signals the change to the agent.

### 3.7 Run structure

| | |
|---|---|
| Run length | **3000 ticks** — Phase I: 0–1499 · Phase II: 1500–2999 |
| Start node | random per episode (existing mechanism, cognitive stream) |
| Goal | fixed within a configuration; rotated across configurations over **{8, 12, 16, 19}**, assigned by `goal = GOALS[configIndex mod 4]` |
| Episode end | goal reached (existing reset) **or** 150 ticks elapsed |
| Environment draws | `liveRng("environment")` — a stream no cognitive code reads |

### 3.8 Observability

The agent observes: current node, neighbours, embeddings, its own memory, goal id, internal motivational state. **It never observes `p_e`, nor any labelled slip signal, nor any function of `p_e` other than the realised outcome sequence.** It can *infer* a slip — it intended `v` and finds itself at `u`. That inference is the only observation channel, and it is exactly the channel under test.

---

## 4. Experimental arms (exactly seven)

Each arm differs from A1 by **exactly one** manipulation.

| | Arm | Manipulation | Kills |
|---|---|---|---|
| **A1** | **BELIEF** | Full: per-edge trust live, aggregate trust live | — (treatment) |
| **A2** | **ABLATION** | `bayesianTrust ≡ 0.5` at `main.js:2065` **and** `aggregateTrust ≡ null` at `main.js:3245`. Q-learning fully intact. | **H-B.** Primary baseline; also the Q-only control |
| **A3** | **RANDOM** | Uniform action selection | H-E |
| **A4** | **FROZEN** | Q updates and trust updates disabled; scoring heuristics intact | H-C |
| **A5** | **AGGREGATE-ONLY** | Aggregate trust live; per-edge severed (`bayesianTrust ≡ 0.5`) | "global arousal / exploration-temperature effect" |
| **A6** | **SHUFFLED** | `bayesianTrust = trust(σ(e))`, σ a fixed derangement over edges, drawn per run seed | **C5.** Identical value distribution, destroyed correspondence |
| **A7** | **ORACLE** | `bayesianTrust = p_e` (true hidden value) | Establishes the ceiling |

### 4.1 Both trust pathways must be severed in A2 — this is not optional

`trustMemory` reaches the decision by **two** independent routes:

1. **Per-edge:** `getPathTrust(u→v)` → `bayesianTrust` → `trustBonus` → score. Carries *which edge*.
2. **Aggregate:** `main.js:3232–3245` computes mean `(s+1)/(a+2)` over paths with ≥2 attempts → `updateBehavior({aggregateTrust})` → confidence floor → `confidenceState` → score, and → `focusState` → `dynamicFocus`. Carries *how reliable the world is on average*.

Severing only route 1 would leave A2 holding a genuine statistic of the hidden variable, biasing the measured effect toward zero invisibly. **Gate G4 counter-asserts both.**

### 4.2 Controls locked (Director ruling)

**A1, A2, A5, A6, A7 may not be removed or simplified without explicit Director approval.** A run configuration omitting any of these is not a valid M7 run. A3 and A4 are sanity floors and are also retained. **Stage 1 exercises all seven arms.**

### 4.3 Held identical across all arms

Graph · configuration `{p_e}` · goal · config seed · agent seed · RNG stream initialisation · tick budget · every scoring coefficient · `learningAuthority ≡ 1.0` · `dampQ` disabled.

---

## 5. Paired-seed procedure

### 5.1 Seed blocks (disjoint by construction)

| Purpose | Block | Notes |
|---|---|---|
| Pilot configurations | `900000–900004` | 5 configs. Tuning permitted **in Stage 1 only** |
| **Held-out configurations** | `900500–900529` | **30 configs. Never inspected during design. Confirmatory only** |
| Pilot agent seeds | `20260819000–20260819004` | 5 seeds |
| **Confirmatory agent seeds** | `20260819100–20260819119` | **20 seeds, disjoint from pilot** |
| Environment stream | derived: `agentSeed XOR 0x5EED` | Bernoulli traversal draws **only** |
| Shuffle permutation (A6) | derived: `agentSeed XOR 0xBEEF` | σ |
| Power bootstrap | `770001` | §11 |
| Effect-size bootstrap | `770002` | §11 |
| Permutation null (calibration) | `770003` | §11 |

Confirmatory seeds are disjoint from pilot seeds so that no confirmatory run reuses a seed whose behaviour was observed during tuning.

### 5.2 Pairing

The unit of pairing is the **(configuration, agent-seed) pair**. Every pair is run through **all seven arms** with identical seeds and identical stream initialisation.

- Stage 1: 5 configs × 5 seeds = **25 pairs** × 7 arms = **175 runs**
- Stage 2: 30 configs × `n_seeds` (§11) × 7 arms, capped at **4200 runs**

All primary comparisons are **paired within (config, seed)**. An arm's value is never compared against a different pair's value.

### 5.3 RNG stream separation (gate G2)

Environment Bernoulli draws come **exclusively** from `liveRng("environment")`. If they came from the cognitive stream, the added draw would desynchronise A1 and A2 and destroy pairing. G2 asserts the cognitive stream's draw count and order are identical to the environment-OFF build at `p_e ≡ 1.0`.

### 5.4 Execution requirements

- **One OS process per run.** `main.js` has top-level side effects and ESM caching returns the cached instance on re-import — batching runs in one process would silently share learned state across arms.
- **Cold `localStorage` per run**, asserted at start (`setInterval(saveBrain, 5000)` writes; startup reads back).
- A crashed run **fails loudly** and is recorded. Silent dropping is forbidden (§10.4).

---

## 6. The cognitive mechanism under test

The **existing** `trustMemory` Beta-Bernoulli estimator:

```
trust(e) = (s_e + 1) / (a_e + 2)        # posterior mean of Beta(1,1)
```

reaching the decision through the **existing** `bayesianTrust → trustBonus` term. **No new cognitive module is introduced.**

### 6.1 Required evidence re-keying

In the current build, `recordSuccess` is credited at **episode** level (every edge of a goal-reaching path), so `trust(e)` estimates `P(e lay on a successful episode)` — policy-dependent and confounded with goal distance.

**Under M7, credit is by traversal outcome:**

- `recordAttempt(u→v)` on **every traversal attempt** of `e`
- `recordSuccess(u→v)` **iff that attempt succeeded**

Only then is `trust(e)` the posterior mean of `p_e`, and only then is calibration (§8.2) a meaningful test rather than a tautology.

### 6.2 Prior

`Beta(1,1)`. Untried edge ⇒ `trust = 0.5` exactly.

---

## 7. Analysis windows

| Window | Ticks | Role |
|---|---|---|
| **W1 early** | 0–299 | **PRIMARY.** Fast-belief advantage: Beta converges in O(5–10) samples/edge; Q does not |
| **W2 mid** | 300–1499 | Descriptive. Convergence behaviour |
| **W3 post-shift** | 1500–1799 | **PRIMARY.** Re-adaptation speed — the strongest A-vs-B discriminator |
| **W4 late** | 1800–2999 | Descriptive. Asymptote — **a null here is predicted by H1 and is not evidence against it** |

**Only W1 and W3 are confirmatory.** W2 and W4 are descriptive, reported with CIs and **no p-values**.

---

## 8. Metrics (exact definitions)

One metric family per causal link. A run-level improvement with link ② or ③ absent is **not** a positive result.

### 8.1 Link ① — belief updates exist

- `n_updates` (count of trust updates)
- fraction of traversed edges with ≥ 3 observations
- Shannon entropy of the `trust` value distribution

**Pass:** non-degenerate. Failure here means broken wiring, not a false hypothesis.

### 8.2 Link ② — belief is informative (calibration)

- **Primary:** Spearman `ρ(trust_e, p_e)` over edges with **≥ 5 attempts**, computed at end of Phase I (tick 1499) and end of Phase II (tick 2999), against a permutation null (§11.5)
- **Secondary:** Brier score of `trust_e` predicting the next traversal outcome, vs. a global-base-rate predictor
- **Diagnostic:** calibration curve, 10 equal-width bins
- **Anti-memorization:** partial correlation of `trust_e` with `p_e` **controlling for visit count** — separates "belief tracks the world" from "belief tracks where the agent went"

### 8.3 Link ③ — decisions change (argmax flip rate)

Paired, per-decision, identical state and identical RNG stream position:

```
flip_rate = |{ticks : argmax(A1 candidates) != argmax(A2 candidates)}| / |eligible ticks|
```

- **Eligible ticks** = all ticks **minus** stale-execution ticks (§9)
- Reported **filtered and unfiltered**, always both
- **Monotonicity diagnostic (DESCRIPTIVE — no p-value, no falsification threshold):** flip rate binned by `max_e |trust_e − 0.5|` into 5 equal-width bins, reported as a Spearman ρ between bin index and flip rate with a 99% CI. Monotone increasing is predicted under H1 and flat under H-E, but **no confirmatory claim rests on it** and it is not a member of the primary family

### 8.4 Link ④ — changed decisions improve outcomes (conditional advantage)

**The metric that isolates causal contribution; a run-level comparison cannot provide it.**

Restricted to **flipped** decisions. For each, compare realised return over the next **k = 20 ticks**, A1 vs A2, from the identical state:

```
conditional_advantage = mean over flipped decisions of [ return_A1(t..t+20) - return_A2(t..t+20) ]
```

Reported with a bootstrap CI **clustered by configuration** (§11.4).

**Also:** **slip rate on chosen edges**, A1 vs A2 — the most direct behavioural read-out. If belief works, the belief agent traverses more reliable edges. **If this is flat, no score difference should be believed.**

### 8.5 Link ⑤ — run-level outcome

- **PRIMARY METRIC:** **mean return per 100 ticks**, computed per window as `(sum of rewardSignal over window) / (window ticks / 100)`
- Secondary: goal-reach rate; median steps-to-goal; **post-shift recovery half-life**, defined exactly as: the number of ticks after 1500 until the trailing 100-tick mean return first reaches 50% of that run's W2 mean return. **Degenerate cases pinned:** if the trailing mean never falls below that 50% threshold after the shift, half-life = **0**; if it never reaches the threshold before tick 2999, half-life is **right-censored at 1500** and the censored value is used in the paired comparison, with the censoring count reported per arm
- Anti-memorization: trajectory entropy; held-out vs. pilot configuration performance

**Stale-execution steps are NOT excluded from link-⑤ metrics.** Return is a property of the realised trajectory; removing ticks from it would distort the quantity itself. Exclusion applies **only** to links ③ and ④, where the argmax→execution correspondence is what is being measured.

---

## 9. Inclusion and exclusion rules

### 9.1 The F2b distinction — two flags, not one

These are **different quantities** and were conflated in revision 1 of the specification:

| Flag | Definition | Measured rate |
|---|---|---|
| `replayBranch` | The tick took the `liveRng() < 0.92` **else**-branch (`replayOneEpisode`) | **~8%** of steps |
| `staleExecution` | The action **executed** differs from the action **selected** on that tick | **4.5%** (17/380, `verify_S3.js` S3.2) |

`staleExecution ⊆ replayBranch` but they are **not equal**. Gate G8 asserts both fire correctly **and asserts that they differ** — asserting them equal would re-introduce the conflation.

### 9.2 Exclusion rule (pre-registered, binding)

> **Ticks where `staleExecution === true` are excluded from the link-③ and link-④ analysis sets, and only from those.**

Rationale: on those ticks the scorer's argmax has no causal relation to the executed action, so they inject pure attribution noise into the one measurement that establishes causality.

### 9.3 Mandatory dual reporting (Ruling Q3 — binding)

**Every table reporting a link-③ or link-④ result must carry:**

1. the **count and percentage** of ticks excluded as stale executions;
2. the **same statistic computed on the unfiltered set**;
3. the **direction and magnitude** of the difference between filtered and unfiltered.

> **Exclusion-validity rule.** If filtered and unfiltered results **disagree in sign** or **disagree in falsification verdict**, the exclusion is declared **NOT VALIDATED**. That disagreement is reported as a **primary finding**, and it triggers the Ruling Q3 clause under which repairing F2b may be reconsidered. It is **not** resolved by preferring whichever result is more favourable.

### 9.4 Run-level inclusion

| Situation | Rule |
|---|---|
| Run completes 3000 ticks | Included |
| Run crashes | **The entire (config, seed) pair is dropped from ALL SEVEN arms**, preserving pairing. Count, config, seed, arm and error reported. Never silently dropped |
| Agent never reaches goal in a run | **Included.** That is signal, not failure |
| Configuration rejected by R1–R5 | Discarded at generation, redrawn from the next config seed. Discard count logged |
| Gate failure (any of G1–G16) | **The study halts.** No data from a build with a failing gate enters any analysis |

### 9.5 No other exclusions

**No exclusion may be introduced after freeze.** Any additional exclusion applied post-freeze is a protocol deviation, must be reported as such, and results computed under it are exploratory.

---

## 10. Confound controls

### 10.1 Q-learning confound — the principal threat

Under stochastic transitions, ordinary Q-learning absorbs `p_e` **for free**: a low-reliability edge produces more no-progress steps at step cost, so its Q value falls with no belief mechanism at all.

**Therefore an A1 > A2 endpoint difference is not evidence of anything.** Discriminating power rests entirely on:

- the **W1** (early) and **W3** (post-shift) windows, where a Beta posterior converges in O(5–10) observations per edge but Q at `α = 0.1` needs an order of magnitude more and must propagate value backwards through the graph;
- the **conditional advantage** on flipped decisions (§8.4);
- **A5** and **A6**, which hold information content and value distribution respectively fixed.

### 10.2 Prediction-error pathway pinning (Ruling Q2 — binding)

Slips raise `compositeError`, which lowers `learningAuthority` (scaling the Q learning rate at `main.js:3846`) and triggers `dampQ` at `main.js:3899`. Both are **implicitly reliability-sensitive**, so an arm that merely zeroes `bayesianTrust` is **not belief-free**.

> **In every confirmatory arm: `learningAuthority` is pinned to exactly `1.0`, and `dampQ` is disabled.**

**Declared cost:** the confirmatory result describes an agent with one native pathway pinned off. This must be stated in the final report and must not quietly disappear.

**Secondary — DECLARED EXPLORATORY:** a 2×2 factorial (belief on/off × PE-α on/off) measuring the interaction. Its sample size is deliberately **not** pre-registered, and it is therefore **exploratory by construction**: reported in the exploratory section with CIs and no p-values, supporting no claim. This removes what would otherwise be an unpinned n.

### 10.3 G12 anti-vacuity requirement (binding)

Gate G12 must prove the pinning is **actually active**, not merely configured:

| | Assertion |
|---|---|
| **G12(a)** | A counter proves `learningAuthority` returned exactly `1.0` on **100%** of learning steps; the step count is reported |
| **G12(b)** | A counter proves `dampQ` was invoked **exactly zero** times |
| **G12(c)** | Both counters are emitted and asserted **per run**, not sampled |
| **G12(d)** | **ANTI-VACUITY:** a deliberately **un-pinned control run** is included in the gate and **MUST FAIL** these assertions — proving the counters can detect the unpinned state rather than passing vacuously |

### 10.4 Other controls

| Confound | Control |
|---|---|
| Observable leakage | Constraints R3/R4 + gate G11: a predictor of `p_e` from observables alone must perform at chance |
| Redundancy with graph distance | Constraints R2/R5 + gate G13 |
| Exploration-temperature artifact | **A6 SHUFFLED** — identical value distribution, destroyed correspondence |
| Reward-design artifact | No new reward code (§3.4) + gate G15: goal-reward eligibility rate must show no systematic dependence on `p_e` |
| Benchmark contamination | One process per run; cold `localStorage` per run; gate G10 |
| D12 latent crash | Harness fails loudly; crashed pairs dropped across all arms and reported (§9.4). Silent dropping would create survivorship bias correlated with reliability |
| Within-run dependence | All bootstraps clustered by configuration (§11.4) |

---

## 11. Statistical analysis (fully specified, no post-hoc choices)

### 11.1 Primary confirmatory family — **six hypotheses**

Revision 1 of the specification named the three arm comparisons as the correction family while separately specifying the primary test on **two** windows — leaving the total count of primary hypotheses ambiguous (3 comparisons × 2 windows = 6 tests). **Resolved before freeze, in the conservative direction, and confirmed by Director ruling 2026-08-19:**

> **The primary confirmatory family is SIX hypotheses:** {A1vA2, A1vA5, A1vA6} × {W1, W3}.

| # | Comparison | Window |
|---|---|---|
| 1 | A1 vs A2 | W1 |
| 2 | A1 vs A2 | W3 |
| 3 | A1 vs A5 | W1 |
| 4 | A1 vs A5 | W3 |
| 5 | A1 vs A6 | W1 |
| 6 | A1 vs A6 | W3 |

Every other comparison, window, arm and metric is **descriptive**: reported with CIs, **no p-values**, supporting no confirmatory claim.

### 11.2 Test and correction

| | |
|---|---|
| **Test** | Wilcoxon signed-rank on paired differences, paired by (config, seed) |
| **Tie handling** | **Pratt method** (zero differences retained in ranking, dropped from the statistic). Fixed here to remove a real analyst degree of freedom |
| **Sidedness** | **Two-sided.** H1 is directional but a significant reversal must be detectable, not silently discarded |
| **α** | **0.01** |
| **Correction** | **Holm–Bonferroni across all six** members of the primary family |
| **Significance criterion** | A hypothesis is confirmed iff its Holm-adjusted p < 0.01 **and** the effect is in the direction predicted by H1 |

### 11.3 Effect size

- **Matched-pairs rank-biserial correlation** for each primary comparison
- **Headline measure — fraction of oracle-attainable gain:** `(A1 − A2) / (A7 − A2)`, with a bootstrap CI over configurations

> **Degenerate-denominator rule (pinned in advance):** if the `(A7 − A2)` CI includes zero, the fraction is **not reported as a point estimate**. F-11 (§12) is evaluated first and, if it fires, the study is void — so this rule applies only to the borderline case, where the raw paired difference is reported instead and the fraction is reported as "undefined (oracle gain not distinguishable from zero)".

### 11.4 Bootstrap procedure

| | |
|---|---|
| Resamples | **10 000** |
| Method | **BCa** (bias-corrected and accelerated) |
| **Clustering** | **By configuration.** The resampling unit is the configuration, not the individual decision or run — decisions within a run are not independent, and treating ~3000 correlated decisions as independent would massively inflate significance |
| Seed | **770002**, fixed |
| CI level | **99%** (matching α = 0.01) |

### 11.5 Calibration null

Spearman `ρ(trust_e, p_e)` tested against a **permutation null**: **10 000** random shuffles of `p_e` across edges, seed **770003**. Reported with the permutation p-value and the null distribution's 99th percentile.

### 11.6 Reporting requirements

- Every arm, every window, every seed reported — including failures, crashes and exclusions with counts and reasons
- CIs privileged over p-values throughout
- **No metric may be introduced after unblinding without being labelled exploratory**
- Dual filtered/unfiltered reporting per §9.3 on every link-③ and link-④ table

---

## 12. Two-stage protocol and the deterministic sample-size procedure

### 12.1 Stage 1 — Pilot (~175 runs)

**5 pilot configs (`900000–900004`) × 5 pilot agent seeds (`20260819000–004`) × 7 arms = 175 runs.**

Purposes, in order:

1. **Verify all gates** — **G1–G6 and G8–G15** (G7 is superseded by G16), plus **G16 green as a precondition for Stage 1 running at all**;
2. **Evaluate F-11 FIRST** — if A7 ≈ A2 **per the §15.0 definition and its bounded single-extension procedure**, the environment does not reward reliability knowledge, the experiment is **void**, and Stage 2 **does not run**;
3. **Establish measurable variance** in the primary metric;
4. **Estimate variance and effect characteristics** per window;
5. **Execute the §12.3 power procedure** to determine the Stage-2 sample size.

> **Stage 1 may not be reported as evidence for or against H1.** Its only outputs are: gate verdicts, the F-11 verdict, variance estimates, and one integer (`n_seeds`).

### 12.2 What Stage 1 may and may not change

| May be finalised on pilot data | May NOT be changed by pilot data |
|---|---|
| Stage-2 `n_seeds` (via §12.3 only) | Arms; windows; primary metric; α; family membership; exclusion rules; falsification thresholds; environment parameters; the rectification form |

### 12.3 Power procedure — deterministic, executable, no discretion

Executed once, after Stage 1, exactly as follows:

**Step 1.** For each primary window `W ∈ {W1, W3}`, compute the 25 paired differences `d_i = returnA1_i − returnA2_i` over Stage-1 (config, seed) pairs.

**Step 2.** For each candidate `n_pairs` on the grid

```
n_pairs ∈ {30, 60, 90, 120, ..., 570, 600}      (multiples of 30)
```

run a **bootstrap power simulation**, seed **770001**, `B = 10 000` iterations:

- draw `n_pairs` values with replacement from the empirical distribution of `d`;
- apply the Wilcoxon signed-rank test (Pratt ties, two-sided);
- reject if `p < 0.01 / 6` — the **most conservative Holm position**, so the estimate cannot be optimistic;
- power = fraction of the `B` iterations rejecting.

**Step 3.** `n_pairs*` = the **smallest** grid value achieving **power ≥ 0.80 in BOTH W1 and W3** (the harder window governs). **If no grid value achieves this, `n_pairs* = 600`** and the cap rule §12.4 applies.

**Step 4.** Convert to the run plan:

```
n_configs = 30                       (fixed: the held-out block contains exactly 30)
n_seeds   = n_pairs* / 30            (integer by grid construction; 1..20)
total_runs = 30 * n_seeds * 7
```

Confirmatory agent seeds are the **first `n_seeds`** of `20260819100–20260819119`, in ascending order.

**Step 5 — cap.** The grid maximum is `n_pairs = 600`, i.e. **30 configs × 20 seeds × 7 arms = 4200 runs**, exactly the hard cap.

### 12.4 The cap rule (binding)

> **Hard maximum: 4200 confirmatory runs.**
>
> If the §12.3 procedure does **not** reach power ≥ 0.80 at `n_pairs = 600`, the study **runs at the cap** and is **reported as under-powered**, stating the achieved power at 600 for each primary window.
>
> **The cap is NEVER met by dropping arms, removing windows, widening α, changing the primary metric, or altering the design in any way.** Under-powered and honestly reported is the required outcome; a redesigned study that fits the budget is not.

### 12.5 Stage 2 — Confirmatory

Held-out configurations `900500–900529`; `n_seeds` from §12.3; all seven arms; every gate re-verified before the first run.

---

## 13. The trust rectification (approved, NOT YET IMPLEMENTED)

### 13.1 The change

```js
// current (rectified — discards all evidence that an edge is BAD)
const trustBonus = Math.max(0, bayesianTrust - 0.5) * 8;

// approved (symmetric)
const trustBonus = (bayesianTrust - 0.5) * 8;
```

Single line, `render/scoring.js:184`. Magnitude preserved; enters the M1 term array with weight `1.5`, giving an effective slope of **±12 per unit trust**.

### 13.2 Why it is required for this experiment to be interpretable

Under `Beta(1,1)`, an untried edge sits at exactly `t = 0.5` — the rectification point. With rectification, **every observation that an edge is unreliable is discarded**: the agent can prefer a proven-good edge but can **never avoid a proven-bad one**. In any state where all candidates have `t ≤ 0.5`, A1 and A2 are **provably bit-identical** — collapsing the arms in exactly the regime (early learning, post-shift) that carries the primary discriminating signal.

### 13.3 Implementation ordering (binding)

> **This pre-registration is authored BEFORE the rectification is implemented.** Order of operations:
>
> 1. This document reviewed by the Director;
> 2. This document **frozen and hashed**;
> 3. **Only then** the §13.1 change implemented;
> 4. **G16 green** (§13.4) and M1 `verify_S1.js` + `verify_S1b.js` re-run green;
> 5. Stage 1.
>
> **The experiment is not tuned after implementation.** If G16 fails, the implementation is corrected to match this document — never the reverse.

### 13.4 G16 — the five required properties (Director-approved)

| | Property | Executable assertions |
|---|---|---|
| **G16.1** | **Positive-side magnitude preserved** | `∂score/∂t` for `t > 0.5` **bit-identical** to the pre-change build. Sweep `t ∈ {0.55, 0.60, …, 1.00}` against the `verify_S1.js` base context; require exact float equality with frozen pre-change values. Slope remains **+12/unit**. **Absolute score values asserted too**, not only the derivative — a preserved slope with a shifted intercept would still change every argmax |
| **G16.2** | **Negative evidence becomes decision-usable** | (a) `∂score/∂t` **nonzero and correctly signed** throughout `t < 0.5`: sweep `t ∈ {0.00, 0.05, …, 0.45}`, require strictly increasing score at slope +12/unit. (b) **Behavioural:** two candidates identical in every scoring input except trust — proven-bad (`s=0, a=10` ⇒ `t ≈ 0.083`) vs. neutral/untried (`t = 0.5`) — the proven-bad candidate **must lose the argmax**, and **must win or tie under the pre-change build**. (c) Continuity at `t = 0.5`: score exactly equals the neutral baseline there |
| **G16.3** | **No unrelated coefficients change** | Every other term derivative **bit-unchanged** (reuse `verify_S1.js` S1.3a machinery over the full NEG ∪ POS set); `lastArbitrationBreakdown` bit-identical across ≥ 20 000 contexts; module export surface unchanged |
| **G16.4** | **Isolated and auditable** | (a) `git diff` touches **exactly one line**, removing exactly the `Math.max(0, …)` wrapper — asserted by diff parsing, not by eye. (b) No other `render/` file modified. (c) A frozen pre-change copy committed under `experiments/m7/baseline/` as a **reference arm only, never a substitute**. (d) The module under test imported **live** from `render/scoring.js` |
| **G16.5** | **M1 regressions remain valid** | `verify_S1.js` (12/12) **and** `verify_S1b.js` (4/4) both green against the modified file, run from `experiments/phase1_0` |

### 13.5 Anticipated G16.5 conflict — declared in advance

M1's gates compare against `baseline/scoring_prefix_D3.js` and `baseline/scoring_termarray_preflip.js`, whose `bayesianTrust` behaviour **is the rectified form**. Any M1 assertion that implicitly depends on rectification will surface here.

> **If an M1 assertion conflicts, it is reported to the Director as a finding requiring a ruling. An M1 assertion may NOT be weakened to accommodate M7.**

### 13.6 Anti-vacuity principle (applies to G16 and G12 alike)

**A gate that passes both before and after the change proves nothing.** Every assertion claiming to detect the repair must be **demonstrated to fail against the pre-change build**. The gate reports both runs.

---

## 14. Verification gates — all must be green before data collection

| | Gate | Assertion |
|---|---|---|
| **G1** | Default parity | With M7 off, action sequence, Q table, trust maps and score stream **bit-identical** to the current build over ≥ 10 seeds × 1000 ticks |
| **G2** | Stream separation | Environment draws only from `"environment"`; cognitive stream draw count and order identical to the off-build |
| **G3** | Generalisation | With `p_e ≡ 1.0`, stochastic build ≡ deterministic build |
| **G4** | Ablation completeness | A2: every `bayesianTrust` read returns exactly 0.5 **and** `aggregateTrust` is null at every call — counter-asserted at both sites |
| **G5** | Oracle fidelity | A7 delivers exactly `p_e` |
| **G6** | Shuffle validity | σ bijective, no fixed point; delivered value multiset equals A1's at every tick |
| **G8** | Exclusion-flag correctness | `replayBranch` and `staleExecution` each fire on exactly the right steps; **the two are verified to differ**; stale rate reproduces `verify_S3.js` S3.2 on the same seed |
| **G9** | No new cognitive exports | Export surface of every `render/` module unchanged |
| **G10** | Run hygiene | One process per run; cold `localStorage`; crashes fail loudly and are recorded |
| **G11** | No observable leakage | Every accepted config satisfies R3, R4; predictor of `p_e` from observables performs at chance |
| **G12** | PE pathway pinned | §10.3, including the (d) anti-vacuity control |
| **G13** | Decision relevance | Every accepted config satisfies R2, R5 |
| **G14** | Realised-vs-intended | On a slip: realised node enters learning/reward/PE; intended edge receives the trust attempt. Asserted per step |
| **G15** | No reward artifact | Goal-reward eligibility rate shows no systematic dependence on `p_e` |
| **G16** | Trust rectification | §13.4, five properties |

*(G7 is superseded by G16, which subsumes and extends it.)*

**G1, G4, G12, G13 and G16 are the gates whose failure would silently invalidate the study rather than break it visibly.** They run before Stage 1 **and again** before Stage 2.

---

## 15. Falsification criteria (pre-registered thresholds, not negotiable after freeze)

**F-11 is evaluated FIRST, on Stage-1 data, before any A1-vs-A2 comparison is examined.**

### 15.0 Definition of the equivalence operator "≈" (pinned)

The criteria below use "≈". Left undefined it would be a post-hoc lever, so it is defined here:

> **"X ≈ Y" means: the 99% BCa CI of the paired difference (X − Y) on the primary metric (§8.5), computed per §11.4 clustered by configuration, CONTAINS ZERO in BOTH W1 and W3.**

**Known property, stated rather than hidden:** equivalence-by-CI-inclusion is weak evidence at small n — an under-powered comparison always contains zero. This is why F-11 carries the bounded extension rule below, and why F-8/F-9 (sanity floors) are evaluated at the full Stage-2 n where the CI is informative.

**F-11 evaluation procedure (deterministic, bounded):**

1. Compute the 99% CI of (A7 − A2) in W1 and in W3 on Stage-1 data.
2. If the CI **excludes zero in at least one** window ⇒ **F-11 does not fire**; proceed to §12.3.
3. If the CI **contains zero in both** ⇒ take the **single pre-registered pilot extension**: 5 additional configs (`900005–900009`) × 5 additional seeds (`20260819005–009`) × 7 arms = 175 further runs. **This extension may be taken at most ONCE.** Extension runs are pilot data and do **not** count against the 4200 confirmatory cap.
4. Re-evaluate on the pooled 50-pair pilot. If the CI **still contains zero in both** windows ⇒ **F-11 FIRES. Experiment void. Stage 2 does not run.**

| | Criterion | Threshold | Kills |
|---|---|---|---|
| **F-11** | **Environment degenerate** | A7 ≈ A2 per **§15.0**, including its bounded single-extension procedure | **Experiment VOID** — not the hypothesis. Redesign §3. Stage 2 does not run |
| **F-1** | Belief does not track the hidden variable | Spearman ρ(trust, p) < 0.30, or CI includes 0, at end of Phase I | Link ② — **fatal to H1** |
| **F-2** | Belief does not change decisions | argmax flip rate < 1% of eligible decisions | Link ③ — **fatal to H1** |
| **F-3** | Changed decisions do not help | Conditional-advantage CI includes 0 | Link ④ — **fatal to H1** |
| **F-4** | No run-level benefit | (A1 − A2) CI includes 0 in **both** W1 and W3 at the §12.3-determined n | Link ⑤ |
| **F-5** | Gain is not informational | (A1 − A6) CI includes 0 | **C5 — fatal to H1-strict** |
| **F-6** | Gain is not per-edge | (A1 − A5) CI includes 0 | H1-strict; reduces to a global-arousal effect |
| **F-7** | Ordinary RL explains it | 99% CI of the paired difference (A2 half-life − A1 half-life), clustered by configuration, **includes zero or lies below zero** | **H-B wins** |
| **F-8** | Static heuristics explain it | A4 ≈ A1 per §15.0, evaluated at full Stage-2 n | H-C wins |
| **F-9** | Random explains it | A3 ≈ A1 per §15.0, evaluated at full Stage-2 n | H-E wins |
| **F-10** | Memorization | A1 held-out performance < 60% of pilot-config performance | H-D wins |

---

## 16. Abandonment criteria

**Abandon the design and redesign the environment if:**

- **F-11 fires** — a perfectly informed agent gains nothing, so nothing downstream means anything;
- **G11 or G13 cannot be satisfied by any configuration** — the 20-node graph cannot support a hidden variable that is both non-leaky and decision-relevant. **The graph, not the agent, is the limit.**

**Abandon the belief direction — and report that as the Phase 1.0 result — if:**

- **F-1 fires** and diagnosis shows `trust_e` tracks visit counts rather than `p_e` even after the §6.1 re-keying;
- **F-2 fires** under the symmetric form — with a genuinely calibrated belief and a ±12/unit term, a flip rate below 1% means belief is structurally dominated by Q. **Raising the weight to force flips is tuning-to-win and is forbidden**;
- **F-5 fires** — SHUFFLED matches BELIEF, so any gain was exploration perturbation. The cleanest possible refutation.

**Abandon the claim while continuing the work if:**

- **F-7 fires** — report honestly: *"the environment is learnable, and model-free RL learns it as well as the belief mechanism does."*

**Do NOT abandon merely because:**

- W4 shows no difference — **H1 predicts this**;
- the effect is small — a small, calibrated, replicated, oracle-bounded effect is a result; a large unbounded one would be more suspicious;
- the result is negative — a negative M7 is as informative as a positive one, and more likely.

### 16.1 Escalation rule

If **three or more** of F-1…F-10 fire, **do not iterate on M7.** Return to the Director with the position that one-step transition belief is the wrong minimal mechanism for this architecture, and that the **D2 planning repair** — or hidden *reward* rather than hidden *dynamics* — is the better next candidate.

### 16.2 The D2-shaped failure, named in advance

> **F-1 passes, F-2 passes, F-3 fails** — belief is calibrated, it does change decisions, and the changed decisions do not improve outcomes.

With no look-ahead, the agent can decline one unreliable hop but cannot route around an unreliable *region*, so a locally better choice can still lead somewhere worse. **If this pattern appears, the correct recommendation is "repair D2 and re-run M7 unchanged" — not to add a mechanism or reweight a term.** Named here so it cannot be re-read afterwards as evidence against the belief hypothesis.

---

## 17. Claim ceiling and forbidden claims (binding)

**M7 must not be described as proving general cognition, intelligence, consciousness, planning, or discovery.**

**Strongest permitted claim, even if every criterion passes:**

> A calibrated internal model of a hidden environmental property causally influencing action selection and adaptation.

**Scoped to this system, in full:**

> *MiniFlyWire maintains a calibrated internal model of a hidden per-edge transition property; that model causally changes which action it selects on the immediately following step; and the changed selections measurably improve subsequent outcomes and post-shift re-adaptation — on one 20-node graph, for one hidden-variable family, with one-step use only and no planning (D2 unrepaired), with the prediction-error learning-rate pathway pinned, and at a realised fraction `(A1−A2)/(A7−A2)` of oracle-attainable gain.*

**Forbidden words** as a description of the result: cognition (unqualified), intelligence, consciousness, understanding, planning, reasoning, discovery, emergence, self-awareness.

**Permitted words**, because the design measures them: calibrated, causal, belief (in the operational sense, defined at first use), adaptation, one-step.

**This ceiling binds** the abstract, the README, every commit message, and any external communication.

---

## 18. Implementation delta — what happens AFTER this document is frozen

Nothing below may be implemented before the freeze.

### 18.1 New files

| File | Role |
|---|---|
| `experiments/m7/env.js` | Hidden `{p_e}` store, config generator with R1–R5 rejection sampling, Bernoulli draw from the `"environment"` stream. **Harness-owned; never imported by `render/`** |
| `experiments/m7/arms.js` | The seven arm switches, all default-off |
| `experiments/m7/run.js` | Single-run driver (one process per run) |
| `experiments/m7/analyze.js` | Metrics and statistics |
| `experiments/m7/verify_M7.js` | Gates G1–G16 |
| `experiments/m7/baseline/scoring_prerect.js` | Frozen pre-rectification `scoring.js` — reference arm only |

### 18.2 `render/scoring.js` — exactly one line

The §13.1 rectification. **Only after freeze, and only after G16 is approved.**

### 18.3 `main.js` — approximately 35 guarded lines, inert when off

| # | Site | Change |
|---|---|---|
| E1 | `main.js:4662` | Gate `agentCurrent = next` on `env.attempt(agentLast, next)`; returns `true` unconditionally when M7 is off |
| E2 | `main.js:4152` / `4344` | Credit `recordAttempt`/`recordSuccess` by **traversal outcome** under the M7 flag (§6.1) |
| E3 | `main.js:2065` | Arm switch on the `bayesianTrust` read: identity / `0.5` / `p_e` / `trust(σ(e))` |
| E4 | `main.js:3245` | Arm switch on `aggregateTrust` (§4.1 — without this the ablation is incomplete) |
| E5 | `main.js:3846` / `3899` | Pin `learningAuthority ≡ 1.0`; disable `dampQ` |
| E6 | decision + step sites | Telemetry emission including `replayBranch` and `staleExecution` flags |

### 18.4 What is NOT changed

`render/planning.js` (D2) · the replay branch (F2b) · the `rewards` keying (D8/F12) · `main.js:4545` (D12) · `transitionUncertainty` wiring · `getTrustUncertainty` activation · any scoring weight · graph topology · reward code · any existing test · any existing research document.

### 18.5 Delta summary

**~35 guarded lines in `main.js` + 6 new harness files + 1 gated one-line scoring change.** No new module in `render/`. No new export from any cognitive module. Every arm switch at exactly one read site.

---

## 19. Researcher-degrees-of-freedom register

Every choice that could otherwise be made after seeing data, and where it is pinned.

| Choice | Pinned to | Section |
|---|---|---|
| Primary metric | Mean return per 100 ticks | §8.5 |
| Primary windows | W1 (0–299), W3 (1500–1799) only | §7 |
| Confirmatory family size | **6** (3 comparisons × 2 windows) | §11.1 |
| Statistical test | Wilcoxon signed-rank, **two-sided** | §11.2 |
| Tie handling | **Pratt method** | §11.2 |
| α and correction | 0.01, Holm across 6 | §11.2 |
| Bootstrap method / resamples / seed | BCa / 10 000 / **770002** | §11.4 |
| Bootstrap clustering unit | **Configuration** | §11.4 |
| Permutation null / seed | 10 000 / **770003** | §11.5 |
| Power simulation seed / B | **770001** / 10 000 | §12.3 |
| Power rejection threshold | `0.01 / 6` (most conservative Holm position) | §12.3 |
| n grid | {30, 60, …, 600} | §12.3 |
| n selection rule | Smallest achieving ≥ 0.80 in **both** W1 and W3 | §12.3 |
| Effect-size adjustment | **None.** Stage-1 point estimate used as-is | §12.3 |
| Hard cap behaviour | Run at cap, report under-powered; never drop arms | §12.4 |
| Exclusion set | `staleExecution` ticks, links ③/④ only | §9.2 |
| Exclusion validity | Sign/verdict disagreement ⇒ NOT VALIDATED | §9.3 |
| Crashed-run handling | Whole pair dropped from all 7 arms, reported | §9.4 |
| Degenerate oracle denominator | Fraction reported "undefined"; raw difference given | §11.3 |
| Config acceptance | R1–R5, redraw on failure | §3.5 |
| Goal assignment | `GOALS[configIndex mod 4]` over {8,12,16,19} | §3.7 |
| Confirmatory seeds | First `n_seeds` of `20260819100–119`, ascending | §5.1 |
| Secondary regime status | Descriptive only; no claim rests on it | §3.5 |

---

## 20. Director decisions — ALL FOUR RESOLVED 2026-08-19

| # | Decision | **Ruling** | Where applied |
|---|---|---|---|
| **1** | Pre-registration file path | **Keep at `research/cognitive-audit/M7_PREREGISTRATION.md`. Do not create `experiments/m7/` yet.** Governing spec §14.1 amended to match — documentation/governance only | §0.3; spec §9.1, §14.1, blocker B3 |
| **2** | Confirmatory family size | **CONFIRMED = 6.** Holm correction across all six. "Family = 3" must not remain anywhere in either document | §11.1; spec §11 (α, Multiplicity, §9.1 power procedure, §13.13) |
| **3** | `Beta(2,2)` continuous regime | **CONFIRMED = exploratory only.** Not a confirmatory hypothesis; activation governed by the deterministic rule already specified, never an undefined post-hoc condition | §3.5; spec §6.3 |
| **4** | 2×2 PE-pathway factorial | **CONFIRMED = exploratory only.** May not be promoted to a confirmatory result; no unfixed sample-size choice introduced | §10.2; spec §13.2 |

### 20.1 Multiplicity structure — CONFIRMED by Director, 2026-08-19

An earlier ruling text transposed the two factors. The Director's confirmation fixes the structure explicitly and it is now closed:

> **3 primary comparisons** — A1 vs A2, A1 vs A5, A1 vs A6
> **× 2 primary windows** — W1, W3
> **= 6 primary tests. Holm correction applied across these six.**
> **No third primary window is introduced. W2 and W4 remain descriptive/non-primary.**

This matches §11.1 and §7 exactly. **No ambiguity remains on this point.**

---

## 21. Signature block

| | |
|---|---|
| **Pre-registration SHA-256** | Recorded in the sidecar [`M7_PREREGISTRATION.sha256`](M7_PREREGISTRATION.sha256). **A digest cannot be contained in the bytes it covers**, so it is held in a separate immutable record rather than inline |
| **Hash algorithm** | SHA-256 over the exact bytes of this file |
| **Baseline git HEAD** | `7c8bddeae3df524f0e2dd5eff09f905540b79ed3` + uncommitted M1–M6 |
| **Baseline gate state** | **69/69 green**, re-verified immediately before freeze on 2026-08-19 (M1 16/16 · parity 200000/200000 · M2+M3 14/14 · M5 9/9 · M4 12/12 · M6 18/18) |
| **Frozen by** | Chief Systems Engineer, under Director authorisation of 2026-08-19 |
| **Date frozen** | 2026-08-19 |
| **Rectification implemented after freeze** | *(pending — MUST be after; not yet authorised)* |

### 21.1 Verification of this artifact

To confirm this document has not changed since freeze:

```bash
cd research/cognitive-audit && sha256sum -c M7_PREREGISTRATION.sha256
```

A mismatch means the pre-registration was altered after freeze. That is a **protocol deviation** and must be reported in the final report with its direction and likely effect — never silently reconciled.

---

## STATUS: FROZEN · HASHED · NOT IMPLEMENTED

This document is final. **No implementation authorisation has been given.**

At the moment of freeze: no source code, test, gate, or experiment was created, modified, or run in producing this document. `render/scoring.js` is unmodified and still contains `Math.max(0, bayesianTrust - 0.5) * 8` — **the rectification is not implemented**. D2, F2b, D8/F12 and D12 are unrepaired. `experiments/m7/` does not exist. No pilot or confirmatory run has been executed. Nothing committed, nothing pushed.
