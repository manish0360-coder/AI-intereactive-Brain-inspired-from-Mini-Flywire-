# H1-R pre-registration: belief-driven adaptation under hidden transition reliability (conformed M7 build)

**Status:** **DRAFT v0.1. Not frozen, not hashed, not committed.** Prepared for Research Director review on 2026-10-04 by Claude (implementer). Nothing in this document authorises a run.

**Implementation facts recorded after v0.1 (R2, Director ruling 2026-10-04).** Only implementation facts were added; no scientific content was changed.

- **D-1 (goal-entry draw) and D-5 (measurement) are implemented**: transform `8e969d61…`, files `measure.mjs` and `run_h1r.mjs`, evidence `experiments/h1r/evidence_d1d5/`.
- **Consequence:** the goal-edge facts in §6.3 now describe the pre-R2 runtime.
- **New measured fact, relevant to D-3** (see §12): the environment stream is identical across configurations and arms of one agent seed.

**Implementation facts recorded after v0.1 (R3, Director ruling 2026-10-04).** Only the R3 erratum was recorded; no scientific content was changed.

- **D-3B is implemented**: the environment stream is configuration-scoped. The rule is [`H1R_ERRATUM_R3_ENVIRONMENT_SEED.md`](H1R_ERRATUM_R3_ENVIRONMENT_SEED.md), which supersedes the frozen §5.1 environment-stream row for H1-R. Evidence: `experiments/h1r/evidence_r3/`.
- **The rule:** `envSeed = (0x60800000 + slot·4096·0x6d2b79f5) mod 2^32` with `slot = (agentSeed − 20260819000)·64 + blockCode·32 + acceptedConfigIndex`.
- **Consequences:**
  - the §9.1 "Derived streams" row and the §12 D-3 FACT paragraph describe the pre-R3 runtime;
  - the crossed-factor part of D-3 (shared cognitive stream, boot embeddings and σ within a seed) remains OPEN.

**Build under test:** commit `742f239b526c4a18d431aa9959a87d36840465af` (the H1-R conformance instrument with R1), applied to M7 instrument build B2 = `707cb1e5205a7e9979f81092ee1ebfa0fe28922e`.

**Predecessor:** [`M7_PREREGISTRATION.md`](../cognitive-audit/M7_PREREGISTRATION.md) v1.0, frozen 2026-08-19, SHA-256 `2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9`. It validates unchanged (`sha256sum -c` → OK, 2026-10-04). Errata M7-ERR-01 … M7-ERR-10 apply.

### How to read this document

Every substantive statement carries one tag.

| Tag | Meaning |
|---|---|
| **FACT** | Verifiable now from the repository or committed evidence; the source is cited. |
| **FROZEN** | Binding design: the frozen M7 text, its errata 01–10, and the Director rulings for H1-R (conformance authorisation; R1, 2026-10-04). Quoted or cited, never paraphrased into something new. |
| **INFERENCE** | Reasoning from facts that has **not** been measured. |
| **RECOMMENDATION** | A proposal. It binds nothing until the Director rules on it at freeze. |
| **OPEN** | A decision that must be made before freeze. These are collected in §20. |

---

## 0. What this document is

1. **FACT.** M7 was frozen to test H1 on the M7 instrument build. It never reached Stage 1:
   - gate G15 failed, and M7 is recorded as "**G15 FAIL — a decided negative**" (`research/SYNTHESIS_M7_M8_M9_Q1.md:29`);
   - the 2026-10-04 B2 characterisation then found that B2 departs from the frozen text in several measured ways.
2. **FACT.** H1-R ("H1, re-run") tests the **M7 design as frozen**, on a runtime made to conform to it. The conformance is a guarded source transform under `experiments/h1r/`, and **no production file is modified**. Its implementation, verification and evidence were committed and pushed as `742f239`.
3. **FROZEN** (M7 §0, governing rule). The experiment may not be tuned after implementation.
   - **FACT:** the conformance build was implemented *before* this document, as conformance to the already-frozen M7 design. During that work no H1 outcome metric was computed (see the blinding statements in `experiments/h1r/evidence_*/`).
   - **RECOMMENDATION:** freeze this document **before** the H1-R measurement layer (§10.5) is implemented, and before any Stage-1 run. The analysis code then implements frozen definitions and cannot be fitted to data.
4. This document inherits **every** M7 clause not explicitly superseded here. Supersessions are listed in §2 and Appendix A, and nothing else is changed.

---

## 1. Lineage and authority

**Documents**

| Document | Role | Version-control status (FACT) |
|---|---|---|
| `research/cognitive-audit/M7_PREREGISTRATION.md` | Frozen predecessor | Tracked; digest validates |
| `M7_PREREGISTRATION_ERRATUM_01 … 10.md` | Errata chain | Tracked |
| `M7_LINEAGE_NOTE_01.md` | Episode-level trust credit (`_updateTrust`) | Tracked |
| `M7_SCIENTIFIC_SPEC_DRAFT.md` | The frozen M7 text cites it as the "governing specification" | **Untracked** |
| `M7_GATE_SEMANTICS_AUDIT.md` | ERR-01 cites it as the authority for its option (a) | **Untracked** |
| `M7_CHARACTERIZATION_FINDINGS.md` | Measured properties of the frozen design | **Untracked** |
| `experiments/h1r/` | Conformance instrument and evidence (`evidence_final`, `evidence_r2`, `evidence_r1`) | Tracked at `742f239` |

**Rulings**

| Ruling | Record (FACT) |
|---|---|
| H1-R conformance authorisation (N1, N2, RANDOM, FROZEN, GOAL/G15′, P4) | Relayed prompt; implemented and reported in `experiments/h1r/evidence_final/IMPLEMENTATION_REPORT.md` |
| Conformance correction (CRG; Q-KEY, since superseded by R1; N2 clarification) | Relayed prompt; `evidence_r2/CORRECTION_REPORT.md` |
| **R1: realised-outcome learning order** | Relayed prompt "RESEARCH DIRECTOR DECISION — R1 AUTHORIZED"; `evidence_r1/R1_REPORT.md` |

**FACT.** `research/09_decisions.md` and the rest of `research/` contain **no** reference to H1-R (`git grep -i "H1-R|H1R" research/` returns 0 files).

**RECOMMENDATION (OPEN D-11).** At freeze:
- record the H1-R rulings in the decision log;
- either commit the three untracked M7 documents or cite them by SHA-256, so that the lineage this document relies on is reproducible.

---

## 2. Pre-freeze resolutions (the three mandatory issues)

### 2.1 ERR-05 §3.1 is contradicted by R1

**FROZEN** (M7-ERR-05, Director ruling 2026-08-20), quoted:

> §3: *"`env.attempt(u, v)` determines whether the traversal `u → v` actually occurs. If the attempt fails: … the failure costs **only the elapsed tick**. Unrelated per-tick logic must not be broadly gated."*
>
> §3.1: *"The gate covers exactly the block opened by `agentCurrent = next` — the coherent traversal block — and nothing outside it. **Everything before it in the tick (decision, scoring, Q-learning, prediction error, reward) and everything after it runs unchanged on both outcomes.** One environment draw per movement decision. **The attempt is evaluated exactly once at the block entry**; no code path may draw again for the same decision."*

**FROZEN** (R1, Director ruling 2026-10-04):

> *"Move the single environment outcome determination before the learning block so that learning operates on the transition that actually occurred … decision → ONE environment draw → realized outcome → existing learning rules."*

**The exact contradiction (FACT, by text comparison):**

| ERR-05 §3.1 says | R1 requires | Status |
|---|---|---|
| "Q-learning, prediction error, reward … run **unchanged on both outcomes**" | Learning reads the realised transition, so it **differs** by outcome. On a slip, the section does not run at all (§6.3). | **Direct contradiction** |
| The attempt is evaluated "**at the block entry**" (the traversal block) | The attempt is evaluated **immediately before the self-learning section** | **Contradiction of location**. "Exactly once" is preserved. |
| "the failure costs only the elapsed tick" | A slip produces no reward, no PE and no Q update, so it costs only the tick | **Consistent** |
| "Unrelated per-tick logic must not be broadly gated" | Only learning, which frozen §3.3 makes outcome-related, depends on the outcome | **Consistent** |

**FACT, a further point.** ERR-05 §5 states that frozen §3.3 is "Unchanged". But frozen §3.3 (binding, gate G14) requires that on a slip "the **realised** node (`u`) enters agentCurrent, Q-learning, reward computation and prediction error". The ERR-05 §3.1 ordering, with learning before the draw and on the intended move, cannot satisfy that.

The previous round measured the consequence: 45,928 slip-tick Q updates for A1 carried the intended move's reward, 81.9% of them positive (`evidence_r2/CORRECTION_REPORT.md`). So the contradiction already existed between frozen §3.3 and ERR-05 §3.1. R1 resolves it in favour of the frozen text.

**FROZEN** (this document). Supersession **H1R-S1** replaces the two ERR-05 §3.1 sentences, for H1-R only. Its full text is in Appendix A. M7's own record is not altered.

### 2.2 §10.1 and §10.2: assumptions that no longer hold

**FROZEN**, M7 §10.1, quoted:

> *"Under stochastic transitions, ordinary Q-learning absorbs `p_e` for free: a low-reliability edge produces more no-progress steps at step cost, so its Q value falls with no belief mechanism at all."*

**FROZEN**, M7 §10.2, quoted:

> *"Slips raise `compositeError`, which lowers `learningAuthority` … and triggers `dampQ` … Both are implicitly reliability-sensitive, so an arm that merely zeroes `bayesianTrust` is not belief-free."*

These are **design premises**, not measurement definitions. They are marked superseded below and are **not rewritten**.

| ID | Assumption | Truth value | Evidence |
|---|---|---|---|
| **S2-a** | Slipped attempts update Q(u, v) ("no-progress steps … its Q value falls") | **False under R1** | FACT: 0 Q updates on 320,383 slip ticks (`evidence_r1`, gate R1d). Q(u, v) learns only from realised moves (R1a: 498,388 updates, 0 mismatches). |
| **S2-b** | The existing reward has a "step cost" | **False in B2 and in H1-R** | FACT: the reward rules are goal +12; `sim(u, v) > 0.45` → +2; `> 0.15` → +0.3; otherwise −0.4. The "repeated path" −2 and repetition −0.3 terms are always overwritten (`main.js`, B2). There is no per-tick cost. |
| **S3-a** | Slips raise `compositeError` | **False in B2 and in H1-R** | FACT: B2 sets `predictedNextId = actualNextId = window.lastReasoning.to` by design (`main.js` comment block above `generateExpectation`), so state-PE is 0 by construction. Under R1, PE is not evaluated on slip ticks. |
| **S3-b** | The PE pathway carries reliability information through slips | **No slip input in H1-R** | FACT: follows from S3-a and R1. |

**What remains in force (FROZEN):**
- learning authority ≡ 1.0 and `dampQ` disabled in every arm (§10.2), with G12 and its anti-vacuity control (verified: `verify_e5` 30/0 and `verify_M7` G12 pass with conformance ON);
- the temporal discrimination strategy (W1 and W3; conditional advantage; A5 and A6);
- H-B and its F-7 test.

**INFERENCE, not measured.**
- Under R1, A2 (Q-learning intact, belief severed) can absorb `p_e` only *indirectly*:
  - per-tick Q decay between successful traversals;
  - the composition of episodes and success episodes (realised arrivals only);
  - how often goals are reached.
- A2 is therefore *not* an "ordinary stochastic-MDP Q-learner". H-B's discriminating signature (A2 matches A1 asymptotically and recovers at the same rate) remains testable as frozen, but a match would mean "this agent's non-belief learning matched belief", not "textbook Q-learning matched belief".
- The exploratory 2×2 belief × PE-α factorial (frozen exploratory, §10.2) is expected to be uninformative about slips, because no slip reaches the PE pathway.

**RECOMMENDATION.**
- Keep the pins and G12 unchanged. They are now precautionary.
- Keep the exploratory factorial as declared (exploratory only), or have the Director waive it explicitly. Do not silently drop it.
- Record S2-a/b and S3-a/b in the supersession register (Appendix A, H1R-S2 and H1R-S3).

### 2.3 Is A5 (AGGREGATE-ONLY) still a legitimate arm?

**FACT, correcting the premise.** The R1 evidence does **not** show A5 identical to BELIEF:
- A5 differs from A1 (BELIEF) in **41/41** configurations (gate P3, `evidence_r1/conformance_eval.log`).
- A5 is identical to **A2 (ABLATION)** in **10/41** configurations (gate P1). The earlier figures were 11/41 on the first tree (`84b4197b`) and 4/41 on the Q-KEY tree.
- No other arm pair is ever identical.

**FACT, mechanism.** A5 and A2 differ in exactly one place: E4, `aggregateTrustFor`, which delivers `null` in A2 and the raw value in A5 (`experiments/m7/arms.js`). The aggregate (the mean Beta trust over paths with ≥ 2 attempts) enters behaviour only through `updateBehavior`, as a **one-sided floor**: `if (confidenceState < 10 × aggregateTrust) confidenceState = 10 × aggregateTrust` (`render/behavior.js`, B2). A5 therefore diverges from A2 only on ticks where confidence has fallen below the floor *and* the raised confidence later changes a decision. Where that never happens in a run, A5 ≡ A2 bit-for-bit.

**Assessment:**
- **Construct validity (FACT + FROZEN).** A5 implements frozen §4 exactly ("aggregate trust live; per-edge severed"). G4, G5, G6 and e3e4 I.2-A5/A5b verify that the delivered values match their definitions, with conformance ON.
- **Purpose (FROZEN §2.3, §4).** A5 tests whether an advantage could come from a **global reliability signal** instead of per-edge correspondence ("global arousal / exploration-temperature effect"). A5 ≡ A2 means this system's global route had no behavioural effect in that run, so the global route cannot explain any A1 advantage there. That is a legitimate result of the control, not a failure of it.
- **Information (INFERENCE).** In pairs where A5 ≡ A2, the A1−A5 difference equals the A1−A2 difference exactly. The A5 prong of H1-strict then carries no independent information for those pairs. Holm's correction stays valid under any dependence among the six tests, so the family-wise error rate is not inflated. The cost is redundancy, not bias.

**RECOMMENDATION.** Retain A5 **unchanged**. Frozen §4.2 forbids removing it without Director approval, and no scientific ground for removal exists. In addition, pre-register two **descriptive** reports and one interpretation rule:
1. The count of (config, seed) pairs with fingerprint A5 ≡ A2, overall and per window.
2. Floor-binding activity: the number of `updateBehavior` calls in which the aggregate floor raised `confidenceState`, in A1 and A5.
3. **Interpretation rule.** F-6 not firing establishes only that "the gain is not attributable to this system's global-reliability route". It does not establish that no global mechanism could produce the gain.

These additions are non-confirmatory and change no test. Instrumenting item 2 is part of the measurement layer (§10.5).

---

## 3. Scientific question (FROZEN, M7 title and §2)

Does a calibrated internal estimate of a hidden per-edge transition property — the existing Beta-Bernoulli path-trust estimator, credited by traversal outcome — causally change action selection and improve outcomes and post-shift re-adaptation? The comparison is with the same agent with that estimate severed, in the identical state under the identical RNG streams.

---

## 4. Hypotheses (FROZEN, M7 §2, unchanged)

- **H1.** In an environment with hidden per-edge reliability `p_e`, the trust estimator will:
  1. converge toward `p_e`;
  2. change action selection at a measurable rate;
  3. produce changed decisions that yield higher subsequent return than the belief-severed agent's, in the identical state under the identical RNG stream.
- **H0.** With belief severed, performance, adaptation speed and post-shift recovery are statistically indistinguishable at the Stage-2 n.
- **H1-strict.** H1 holds **and** the advantage survives against A5 **and** A6. Only H1-strict licenses causal language.

**Competing hypotheses (FROZEN, M7 §2.4):**

| | Hypothesis | Discriminating signature | H1-R note |
|---|---|---|---|
| A | Belief-based adaptation | Advantage largest in W1 and W3, shrinking by W4; calibrated; flip rate rising with \|trust − 0.5\|; conditional advantage > 0; survives A5 and A6 | — |
| B | Ordinary model-free RL | A2 matches A1 asymptotically **and** recovers equally fast after the shift | INFERENCE: A2 is not an ordinary stochastic-MDP learner under R1 (§2.2) |
| C | Static heuristics | A4 matches A1 | **FACT:** A4 disables Q and trust updates only. `rewards`, curiosity, `transitions`, emotion and episodic stores still adapt (frozen §4: "Q updates and trust updates disabled; scoring heuristics intact"). A4 is "Q- and trust-frozen", not static; see §14. |
| D | Memorisation | Collapse on held-out configurations and after the shift | — |
| E | Random exploration | A3 matches A1 | — |

---

## 5. Causal mechanism under test

- **FROZEN** (M7 §6). `trust(e) = (s_e + 1)/(a_e + 2)` with a Beta(1,1) prior, so an untried edge gives 0.5. It reaches the decision through `bayesianTrust → trustBonus`. No new cognitive module.
- **FROZEN** (G16, implemented). The trust bonus is symmetric: `trustBonus = (bayesianTrust − 0.5) × 8`, with term weight 1.5, giving ±12 per unit of trust. FACT: `verify_G16` passes 28/0 with conformance ON.
- **FROZEN** (§6.1, N2). Credit is by traversal outcome. Each real-edge attempt adds `a += 1`, and adds `s += 1` iff that attempt succeeded. The episode-level success writer is suppressed under M7 credit. Trust decay of 0.9997 per tick is unchanged.
  - FACT: s ≤ a at 7,872/7,872 snapshots; the store equals the reconstruction from moves; 160,950 episode credits were offered and 0 applied (`evidence_r1` B1–B3).
- **FACT.** The trust key is **directed** (`"u->v"`), but `p_e` is per **undirected** `connections.json` entry and governs both directions (ruling R6; ERR-03 note; `env.js` header). Each undirected edge therefore has up to two independent trust estimates of the same `p_e`. This affects the calibration unit (OPEN D-4c).
- **FACT.** Goal-entering moves never receive trust credit: the E2 condition excludes `_goalResetJustHappened`. Trust on goal-entering keys stays at 0.5.

---

## 6. Environment

### 6.1 Graph (FROZEN §3.1; FACT on structure)

- 20 nodes (`neurons.json`); 39 `connections.json` entries.
- `render/connections.js` adds both directions, so the traversal graph is **undirected**: 39 edges, 78 directed adjacencies (ERR-03 note).
- No topology change.

### 6.2 Hidden variable (FROZEN §3.2, §3.5, rulings R6/R7)

**Primary regime (bimodal):**
- exactly ⌊0.35 × 39⌋ = 13 UNRELIABLE edges, `p_e ~ U(0.25, 0.45)`;
- 26 RELIABLE edges, `p_e ~ U(0.90, 1.00)`;
- `p_e` is symmetric per undirected edge and constant within a phase.

**Secondary regime:** Beta(2,2). It is exploratory, and runs only under frozen §3.5's condition (F-11 does not fire **and** at least one primary-family member is confirmed at Stage 2).

### 6.3 Transition process

**FROZEN** (§3.3; R1). The table below is "existing learning rules applied to the realised transition", determined from the frozen text before R1 was implemented (`evidence_r1/R1_REPORT.md`).

| Case | Environment | Agent | Learning (self-learning section) | Trust |
|---|---|---|---|---|
| Success u → v | one draw from `liveRng("environment")`, success | moves to v | the full section on u → v: reward, PE (actual = v), Q(u, v) with S′ = v, every store keyed u → v. **Return moves included.** | `a(u→v) += 1`, `s(u→v) += 1` |
| Slip u ↛ v | one draw, failure | **remains at u** | the realised transition is u → u. The section's own entry guard ("prevents corrupt self-loop learning") excludes it: **no reward, no PE, no Q update**. Only the tick is spent. | `a(u→v) += 1` only |
| Goal entry u → g | **no draw** (FACT; pre-existing) | reaches g; the existing reset to a random non-goal start (cognitive stream) follows | as a success, with flat +12 and S′ = goal | **no credit** (FACT) |

FACT, verification on `evidence_r1` (287 main runs):
- R1a, Q-key correctness: 498,388 updates, 0 mismatches.
- R1b, no learning from unrealised transitions: 0.
- R1c, return-move coverage: 71,736/71,736.
- R1d, slips: 0 updates across 320,383 slip ticks.
- R1e, environment draws: 756,668 draws = 756,668 edge-attempt decisions; at most 1 per tick; 0 on goal entries.

**FACT, a departure from §3.3 measured on 2026-10-04 (OPEN D-1).** Frozen §3.3 says *attempting* any edge slips with probability 1 − `p_e`. At runtime a goal-entering attempt never slips, so a goal-incident edge is effectively reliable whatever its configured `p_e`.

Measured on the 41 already-inspected ERR-09 diagnostic configurations (configuration arithmetic only; `h1r_prereg_checks/goal_edge_reliability.mjs`):

| | Phase I | Phase II |
|---|---|---|
| Configs with ≥ 1 configured-UNRELIABLE goal-incident edge | 31/41 | 40/41 |
| Unreliable goal-incident edges | 49 of 159 | 110 of 159 |
| R2 holds (configured → effective) | 41 → 41 | 41 → 41 |
| R5 holds (configured → effective) | 41 → 41 | 41 → 40 |
| Mean decision-relevant states (configured → effective) | 7.71 → 6.54 | 6.93 → 6.49 |
| Max \|ρ(reliability, directed distance-to-goal)\| (configured → effective) | 0.100 → **0.326** | 0.278 → **0.342** |
| Configs with effective \|ρ\| ≥ 0.10 | **26/41** | 21/41 |

In the R1 evidence, goal entries were 62,103 of 818,771 edge-attempt decisions (7.6%).

**FACT (implementation, R2).** Goal-entering attempts now use the same draw as every other edge (R2-GOAL-DRAW, R2-GOAL-FLAG, R2-GOAL-CREDIT). Verified on `evidence_d1d5`:
- 84,051 goal-entering attempts: 46,861 realised and 37,190 slipped;
- every drawn outcome (820,871 in all) equals `u_k < p_e` on an independently reproduced environment stream (gate R2x);
- a slipped goal attempt is an ordinary slip, and every goal reset is a realised entry (R2d);
- goal attempts are credited like any traversal (R2e).

The table above and consequences 1–3 below describe the **pre-R2** runtime.

**INFERENCE (pre-R2).** This has three consequences:
1. **A7 (ORACLE) is not an oracle of the realised dynamics.** It is fed the configured `p_e` on goal-incident edges, which may be 0.25–0.45, although those edges never slip. A7 may therefore *avoid* the goal edge it should take. This biases the ceiling in F-11 and in the headline fraction (A1 − A2)/(A7 − A2).
2. **There is a runtime topology leak.** Effective reliability correlates with distance to the goal, which R4 and G11 exist to prevent. The belief channel cannot use it (goal-entering trust is never credited). Q-learning can, symmetrically across Q-reading arms.
3. **Margins shrink.** R5's decision-relevance margin is smaller at runtime than at acceptance.

### 6.4 Reward

**FROZEN** (§3.4, GOAL/G15′; "completely unchanged" reward rules):
- `rewardSignal` = **+12** on a goal reach. The flat rate is the GOAL conformance edit; eligibility is never read.
- Otherwise:
  - **+2** if `sim(u, v) > 0.45`;
  - **+0.3** if `sim(u, v) > 0.15`;
  - **−0.4** otherwise.
- `sim` is the cosine similarity of the two endpoints' embeddings.

**FACT.** Under R1, `rewardSignal` is computed only when the self-learning section runs, i.e. once per realised move or goal entry. Slip ticks, self no-op ticks and no-decision ticks produce no `rewardSignal`.

R1 evidence, all arms pooled:

| Outcome | Rewards |
|---|---|
| Move | +2 ×204,885; +0.3 ×123,133; −0.4 ×108,267 |
| Goal | +12 ×62,103 |
| Slip | none |

**FACT.** No reward term contains `p_e`:
- In Phase I, the reward-relevant observable (endpoint cosine similarity) satisfies |ρ(`p_e`, cos)| < 0.10 by acceptance (R3).
- In Phase II it is unconstrained: one inspected pilot configuration measured 0.2174 (ERR-07 §3.1 table, `900022`).

### 6.5 Configuration generation (FROZEN §3.5; ERR-04, ERR-07)

- A configuration is accepted iff R1–R5 hold **and** each of five observables has |Spearman ρ(observable, `p_e`)| < 0.10 **on `pPhase1` only** (ERR-07 Rulings A and B). The observables are: endpoint cosine similarity, directed distance-to-goal, source degree, destination degree and canonical edge index.
- Acceptance is deterministic sequential rejection sampling, strictly ascending, with no retry cap (ERR-07 §4/§5; `env.generateAccepted`, `generateAcceptedStream`).
- **FACT:** in the inspected pilot block, R1–R5 accept 8/30 and the full predicate accepts 1/30 (`M7_CHARACTERIZATION_FINDINGS.md` §3).

### 6.6 Reliability shift (FROZEN §3.6)

At tick 1500 the RELIABLE and UNRELIABLE sets are swapped silently. `env.setTick` is called between agent loops, so the phase is constant within a tick (FACT).

**FROZEN** (ERR-07 §3.1, binding limitation). After the shift, `p_e` may correlate with fixed graph observables at up to |ρ| ≈ 0.31 (measured on pilot candidates). Any W3 result must be reported with this limitation.

### 6.7 Run structure (FROZEN §3.7, with rulings)

- **Length:** 3000 ticks.
- **Phases:** Phase I is ticks 0–1499; Phase II is ticks 1500–2999.
- **Goal:** `GOALS[configIndex mod 4]` over {8, 12, 16, 19}.
- **Episode end:** a goal reach (existing reset) or 150 ticks (the cap, implemented 2026-08-23; one tick = one `runAgent()` call; stale and replay ticks count).
- **P4:** at both reset sites, the pre-reset reasoning is cleared (FACT: 0 stale post-reset actions over 63,092 resets).

**Tick unit — FACT and OPEN D-6.** `experiments/m7/run.js` still says the *run-length* tick unit "requires a ruling before any real 3000-tick run". No repository record of that ruling exists. Every later study fixed `tickUnit = 'step'`, i.e. one `runAgent()` call, 3000 ticks = 600 loops. The run executes **3005** `runAgent()` calls, because `pressSpace` adds one untimed loop of 5 calls before tick 0.

**RECOMMENDATION.**
- Ratify `tickUnit = 'step'`.
- Define the tick index τ = (runAgent call index) − 5. Windows are on τ ∈ [0, 2999], and the 5 pre-boot calls fall in no window. This matches the convention FutureScore Study 2 pinned.

### 6.8 Observability (FROZEN §3.8)

The agent never observes `p_e` or any labelled slip signal. It can infer a slip only by finding itself still at u.

---

## 7. The seven arms: exact runtime semantics

**FROZEN** (§4, §4.1–4.3): each arm differs from A1 by exactly one manipulation; A1, A2, A5, A6 and A7 may not be removed without Director approval.

**FACT:** the semantics below are read from `experiments/m7/arms.js` and the conformed `main.js`.

| Arm | E3: per-edge `bayesianTrust` delivered to scoring | E4: aggregate | Learning | Selection |
|---|---|---|---|---|
| **A1 BELIEF** | raw `getPathTrust(u→v)` | raw | all | normal |
| **A2 ABLATION** | **0.5** | **null** | all (Q intact) | normal |
| **A3 RANDOM** | raw | raw | all | at each committed step-0 decision, the executed action is **uniform over the current node's graph neighbours**, from one `liveRng()` draw on the cognitive stream (Director-authorised) |
| **A4 FROZEN** | raw | raw | **no Q write** (the `updateQ` choke point plus Q decay); **no trust write** (E2 credit plus trust decay). Other stores adapt. | normal |
| **A5 AGGREGATE-ONLY** | **0.5** | raw | all | normal |
| **A6 SHUFFLED** | `trust(σ(e))`. σ is a fixed derangement over the 39 canonical edge indices, seeded by `agentSeed XOR 0xBEEF`. The trust read is the canonical direction of the mapped edge. | raw | all | normal |
| **A7 ORACLE** | **configured `p_e`** of the current phase (`env.trueP`). See OPEN D-1 for goal-incident edges. | raw | all | normal |

**Held identical across arms (FROZEN §4.3):**
- graph, `{p_e}`, goal, config seed, agent seed and stream initialisation;
- tick budget and every scoring coefficient;
- learning authority ≡ 1.0 and `dampQ` disabled.

**FACT:**
- A3 consumes one extra cognitive draw per committed decision; the environment stream is untouched.
- In every arm, replay-branch ticks (`liveRng() ≥ 0.92`, about 8% of steps) execute the carried-over action instead of a fresh selection. After a successful move this is a self no-op. **After a slip it is a genuine re-attempt of the intended edge**, with a draw and, on success, learning.

---

## 8. Frozen implementation semantics (exact build)

**Build identity (FACT):**

| Item | Value |
|---|---|
| Instrument commit | `742f239b526c4a18d431aa9959a87d36840465af` (2026-10-04 14:21 +0530), pushed to `origin/main` |
| B2 agent blobs | `707cb1e5205a7e9979f81092ee1ebfa0fe28922e`, 146 blobs materialised with `git cat-file`, blob ids verified (`build_tree.mjs`) |
| Transform | `experiments/h1r/conformance_transform.mjs`, SHA-256 `e24f6057d77b9f4ec78293019ed5f788c7d15c62a983d9303355aca74014b69f` |
| `main.js` (blob `113fa47…`) | `537f37a2…` → `e38d7774198bb4e6cd24665e62827793994d781ff3905b445bf63d375b54fe98` |
| `render/episodeManager.js` (blob `c00c3b5b…`) | `757d549b…` → `a8fd8dec477204c1e4a076975919f5efd138529ff1d12d84737f8362532e7eac` |
| `render/qlearning.js` (blob `d021bb08…`) | `a3d4f4b8…` → `fdc2798c3b40559ecf9342cc817db3da8699deba3dc0cf35b1aaf51de68c939d` |
| Runtime | `experiments/h1r/runtime.mjs`, SHA-256 `d616914138e3246ca0f647ab77d8ce84467bf5e000fdebd4b0cda8185d1f899d`. It must be installed with `trustMode = 'traversal'`. `attemptGated` is diagnostic only. |
| Driver | `experiments/m7/run.js` (B2, unchanged), SHA-256 `9f6494b2…`; `arms.js` `913f265a…`; `env.js` `4a72bd23…` |

**Edits (FACT; `experiments/h1r/README.md`).** Every edit is guarded by `globalThis.__H1R__ && globalThis.__H1R__.on`:
- N1-MASK, N1-MASK-SEM, N1-GUARD, N1-SEAL (edge-only);
- N2 (traversal-only trust success);
- A3 (RANDOM);
- A4-Q, A4-T (FROZEN);
- GOAL (flat +12);
- P4 (×2);
- CRG (×3, the `0f47d7b` `canReachGoal` backtracking fix);
- **R1-DRAW-EARLY, R1-VIEW, R1-RESTORE, R1-DRAW**.

Without the runtime, the tree is identical to B2: G1′ 21/21, and all 25 existing gate scripts match pristine.

**Run settings (FROZEN, or FACT where noted):**
- `envMode = on`, `creditMode = on`, `pin = on`;
- `tickUnit = 'step'` (OPEN D-6), `ticks = 3000`;
- `crashAtTick = null`, `warmStore = false`;
- one OS process per run, cold `localStorage` (frozen §5.4).

**Validity conditions recorded by `run.js`** (FACT, see the comments there):
- `episodeCapArmed === true`;
- `replayCooldownDeterministic === true` (`__M7_REPLAY_ONCE__`, Director ruling 2026-08-26);
- `completed === true`.

---

## 9. Seeds and configurations

### 9.1 Frozen allocation (FROZEN, M7 §5.1, §15.0; ERR-07; ERR-09)

| Purpose | Allocation |
|---|---|
| Pilot configurations | `900000–900004` |
| F-11 extension configurations | `900005–900009` (single use) |
| Held-out configurations | 30 **accepted** configurations from the sequential stream starting at `900500` (ERR-07 §4), with mandatory provenance per configuration |
| Pilot agent seeds | `20260819000–004` |
| F-11 extension agent seeds | `20260819005–009` |
| Confirmatory agent seeds | the first `n_seeds` of `20260819100–119`, ascending |
| Derived streams | cognitive = seed; visual = seed ^ `0x9e3779b9`; environment = seed ^ `0x5EED` (**superseded for H1-R by erratum R3**: one disjoint 4096-draw segment per (agent seed, block, accepted configuration index), no arm term); σ = seed ^ `0xBEEF` |
| Bootstrap seeds | power 770001; effect size 770002; calibration null 770003 |
| Gate-diagnostic range (no hypothesis test, not Stage-1 data) | `900030–900499` (ERR-09) |

### 9.2 Facts established now

1. **The frozen pilot is degenerate.**
   - Resolving the frozen pilot slots (seed `900000 + i`, configIndex `i`) under ERR-07 walk semantics gives accepted seeds 900000 (goal 8), **900014** (goals 12, 16 and 19) and **900160** (goal 8). That is **3 distinct `p_e` vectors**.
   - The F-11 extension slots resolve to 900014 and 900160 again, adding no new `p_e` vector. This agrees with ERR-09 §2 and §3.2(3).
   - **900160 lies in the ERR-09 range**, which ERR-09 §3.1 declares "**not** Stage-1 data".
   - An ERR-07-style pilot *stream* from 900000 gives 900000, 900014, 900074, 900160 and 900211: three of five in the ERR-09 range.
   - All walks stayed below 900212, well under 900500.
2. **Registry status** (`experiments/registry/typed.js`, read-only query; `h1r_prereg_checks/seed_registry_status.mjs`):

   | Seed(s) | Status |
   |---|---|
   | Config 900000–900029 | consumed (M7 pilot) |
   | Config 900030–900499 | consumed (ERR-09) |
   | Config **900500+** | **held out and unconsumed**; the held-out stream is uninspected |
   | Config 893000–894999 | **free** (never consumed, not held out; M35/M37 "free territory 0–894999" minus Study 2's 890000–892999) |
   | Agent seeds **20260819100–119** and 20260819004–009 | **AVAILABLE** |
   | Agent seed **20260819000** (registered to "M7-substrate") | **refused** for H1-R by the M33-R1 typed registry ("no authorization covers this exact value and study pair") |
   | Agent seeds **20260819001–003** (consumed as M31 development seeds) | **refused** for H1-R |

3. **RNG streams.** Across all 30 frozen pilot, extension and confirmatory agent seeds × 4 derived streams (7,140 pairs), the minimum separation on the mulberry32 cycle is **1,411,985 draws**. Per-run consumption is at most 78,538 cognitive draws and 2,893 environment draws (`evidence_r1`). **No stream overlap is possible within or across runs** (`h1r_prereg_checks/stream_overlap.mjs`).
4. **Prior exposure (FACT, disclosure).**
   - Agent seed 20260819000 has been run in all seven arms on the 41 ERR-09 configurations during H1-R verification. Only fingerprints and mechanism counts were inspected.
   - One pooled outcome-adjacent count was reported: 4/287 runs with no goal reach. While diagnosing them I saw their arm labels; those are not reported here.
   - No confirmatory configuration and no confirmatory agent seed has ever been used.

### 9.3 Recommendation (OPEN D-2)

1. **Pilot configurations.** Replace the degenerate frozen pilot with **5 accepted configurations from a fresh sequential stream starting at `893000`**, using ERR-07 semantics. Impose a hard upper bound of `894999`, asserted mechanically as in ERR-09 §3.2, and register the block to H1-R. The F-11 extension takes the **next 5** accepted configurations of the same stream.

   Rationale: this gives 5 distinct configurations from never-inspected material, avoids the ERR-09 contradiction, and keeps Stage 1 and the F-11 bootstrap clustered over real configurations.

   *Alternative:* keep the frozen pilot. Then F-11 and the §12.3 power simulation rest on 3 distinct `p_e` vectors, one of which is ERR-09 material, and this must be stated as a protocol limitation.
2. **Pilot agent seeds.** Either:
   - record registry authorisations for H1-R pilot use of `20260819000–003` (category `pilot`) and keep the frozen §5.1 block; or
   - use a fresh, available block.

   The second choice must be named at freeze and re-checked for stream overlap.
3. **Confirmatory material.** Unchanged and untouched: the held-out stream from `900500` (ERR-07) and agent seeds `20260819100–119`.

---

## 10. Outcomes

### 10.1 Primary outcome (FROZEN §8.5)

**Mean return per 100 ticks**, per window: `(sum of rewardSignal over window) / (window ticks / 100)`.

**H1-R operationalisation (INFERENCE from FROZEN + R1; to be ratified):** the per-tick contribution is `rewardSignal` if the self-learning section ran on that tick (a realised move or goal entry), and 0 otherwise. Stale and replay ticks are **not** excluded (frozen §8.5).

### 10.2 Windows (FROZEN §7)

| Window | Ticks | Status |
|---|---|---|
| W1 | 0–299 | Primary |
| W2 | 300–1499 | Descriptive |
| W3 | 1500–1799 | Primary, carrying the ERR-07 §3.1 limitation |
| W4 | 1800–2999 | Descriptive; a null is predicted |

### 10.3 Secondary outcomes (FROZEN §8.5 and §8.1–§8.4; all descriptive unless they enter a falsification criterion)

- **Goal-reach rate.** Median steps-to-goal; **OPEN D-4e**: censoring of capped episodes.
- **Post-shift recovery half-life.** Fully pinned in frozen §8.5, including the degenerate cases.
- **Trajectory entropy.** **OPEN D-4f**: no definition exists.
- **Held-out vs pilot performance** (F-10). **OPEN D-4g**: measure and window unspecified.
- **Link ①:** `n_updates`; fraction of traversed edges with ≥ 3 observations; entropy of trust values.
- **Link ②:** Spearman ρ(trust, `p_e`) over edges with ≥ 5 attempts at ticks 1499 and 2999, against a 10,000-shuffle permutation null; Brier score; calibration curve; partial correlation controlling for visit count. **OPEN D-4c:** unit = directed trust key or undirected edge (§5).
- **Link ③:** argmax flip rate between A1 and A2 "at identical state and identical RNG stream position", on eligible ticks (non-stale), reported filtered and unfiltered. **OPEN D-4a:** how A2's argmax is evaluated within A1's state, given that E4's effect is stateful through `confidenceState`.
- **Link ④:** conditional advantage, i.e. the return over the next k = 20 ticks, A1 vs A2, "from the identical state", on flipped decisions; bootstrap CI clustered by configuration. **OPEN D-4b:** forking method and the sampling of flipped decisions.
- Slip rate on chosen edges, A1 vs A2. **OPEN D-4h:** per attempted edge-decision, excluding goal entries (recommended).
- **Recommended descriptive additions:** A5 ≡ A2 identity counts and floor-binding activity (§2.3); count of runs without a goal reach per arm (reported, never excluded); habit diagnostics (share of explore-step Q increments on the most-visited cycle edges). All are labelled exploratory.

### 10.4 Treatment of runs without a goal reach

- **FROZEN** (§9.4): "Agent never reaches goal in a run → **Included.** That is signal, not failure."
- **FACT** (`evidence_r1`, diagnostic material, pooled): 4/287 runs had no goal reach.
- The primary metric is defined for such runs, since return accrues from realised moves.
- Goal-reach rate = 0. Steps-to-goal is undefined (D-4e). The half-life is defined by return.

### 10.5 Instrumentation status (FACT)

The **primary metric is not measured by any existing driver**:
- `run.js` records the action sequence, Q sum, trust keys, environment counters and draw counts, but no per-tick `rewardSignal`, goal events, trust values at ticks 1499/2999, stale flags, flip-rate shadow or forked returns;
- the frozen `experiments/m7/analyze.js` (§18.1) **does not exist**;
- `git grep` finds no M7/H1-R metric code.

**RECOMMENDATION.** A dedicated measurement-layer milestone after freeze:
- an insert-only recorder for every §10.1–§10.3 quantity, proven neutral (fingerprint identical with and without it, as gate H2 does now);
- `analyze.js` implementing §12 exactly;
- anti-vacuity mutants for every metric;
- a dry run on the 41 diagnostic configurations that **asserts computability only and reports no outcome values**.

---

## 11. Inclusion and exclusion (FROZEN §9, unchanged)

- **Exclusion:** stale-execution ticks are excluded from links ③ and ④ only. `staleExecution = replayBranch` (ERR-08 §3.2). Results are reported filtered and unfiltered. A disagreement in sign or verdict marks the exclusion NOT VALIDATED and is a primary finding (§9.3).
- **Crash:** the whole (config, seed) pair is dropped from all seven arms and reported. Silent dropping is forbidden.
- **No other exclusions** (§9.5).

**RECOMMENDATION (OPEN D-7).** A run whose record fails a validity condition of §8 (cap not armed, replay cooldown non-deterministic, H1R runtime not attached, or transform SHA mismatch) is treated **exactly like a crash**: the whole pair is dropped from all arms and reported. This adds no new exclusion criterion; it applies §9.4's existing crash rule to a build-integrity failure.

---

## 12. Statistical analysis (FROZEN §11, unchanged unless an OPEN item rules otherwise)

**Primary family: six tests**, {A1 vs A2, A1 vs A5, A1 vs A6} × {W1, W3}.

| Element | Specification |
|---|---|
| Test | Wilcoxon signed-rank on paired differences, paired by (config, seed); Pratt ties; two-sided |
| Significance | α = 0.01; Holm across the 6 tests; confirmed iff the Holm-adjusted p < 0.01 **and** the direction is as H1 predicts |
| Effect sizes | Matched-pairs rank-biserial correlation. **Headline:** (A1 − A2)/(A7 − A2), with a bootstrap CI over configurations. If the (A7 − A2) CI includes 0, report the fraction as "undefined" and give the raw difference. |
| Bootstrap | BCa, 10,000 resamples, **clustered by configuration**, seed 770002, 99% CIs |
| Equivalence "≈" | The 99% BCa CI of the paired difference on the primary metric contains 0 in **both** W1 and W3 (§15.0) |
| Comparison rules | All primary comparisons are paired within (config, seed). An arm's value is never compared against another pair's. Every other comparison, window or metric is descriptive (CIs, no p-values). No metric may be introduced after unblinding unless labelled exploratory. |

**FACT and INFERENCE, pseudoreplication (OPEN D-3).**
- Agent seeds are nested within configurations, yet the frozen Wilcoxon treats every (config, seed) pair as independent (n = 30 × `n_seeds`, up to 600).
- The frozen bootstrap clusters by configuration, so the test and the CI use **different** units of independence.
- The §12.3 power simulation resamples pair differences i.i.d., likewise ignoring nesting.
- If between-configuration variance is material, the p-values are anti-conservative and the power estimate optimistic. With the degenerate frozen pilot (3 distinct `p_e` vectors), the power simulation would also under-sample between-configuration variance.

**FACT (measured during R2 verification).** The environment stream is `agentSeed XOR 0x5EED` (frozen §5.1), with no configuration component. Every configuration and arm run with one agent seed therefore consumes the **same** uniform sequence.

On the 287 diagnostic runs (one seed), this produced the same-signed calibration deviation in every run: z = −14.1 in Phase I and +19.7 in Phase II, pooled as if independent. Yet every single outcome was exactly `u_k < p_e` (R2x).

Across arms this is the intended common-random-numbers pairing. Across configurations it couples the units the frozen analysis treats as independent clusters: in Stage 2, each seed's stream is shared by all 30 configurations.

**INFERENCE:** configuration-clustered inference, and the D-3 recommendation below, should also account for the seed as a **crossed** factor. Examples are two-way (configuration × seed) clustering, or a seed-level sensitivity analysis. Deriving the stream from (agentSeed, configSeed) instead would change frozen §5.1 and would need a ruling.

**R3 implementation fact.** Ruled and implemented: the stream is now derived from (agentSeed, block, accepted configuration index); see [erratum R3](H1R_ERRATUM_R3_ENVIRONMENT_SEED.md).
- This removes the **environment** coupling between configurations.
- The arms of one (configuration, seed) still share their stream (frozen §5.2 pairing).
- The configurations of one seed still share its cognitive stream, boot embeddings and σ, so the crossed-factor question above remains OPEN under D-3.

**RECOMMENDATION.** For each primary test, aggregate to the configuration level (the mean paired difference over seeds; n = 30) and apply the frozen Wilcoxon, Pratt and Holm to the 30 configuration means. The power simulation then resamples **configurations**. This makes the test and the bootstrap use the same independence unit. It changes the frozen test, so it requires a ruling. If it is not adopted, report a configuration-level sensitivity analysis next to every primary test.

---

## 13. Two-stage protocol and stopping rules (FROZEN §12, §15.0)

**Stage 1 (pilot).** 5 configurations × 5 agent seeds × 7 arms = 175 runs. Its purposes, in order:
1. verify all gates (§15);
2. evaluate **F-11 first**;
3. estimate variance;
4. run the §12.3 power procedure.

**F-11 stopping rule.**
- If the 99% CI of (A7 − A2) excludes 0 in at least one of W1 and W3, F-11 does not fire; proceed.
- Otherwise take the **single** extension (175 runs) and re-evaluate on the pooled 50 pairs.
- If it still contains 0 in both, **the experiment is void, and Stage 2 does not run**.
- F-11's validity depends on OPEN D-1.

**Power procedure (§12.3).**
- Grid `n_pairs ∈ {30, 60, …, 600}`; bootstrap power with B = 10,000 and seed 770001; rejection at p < 0.01/6.
- Choose the smallest n with power ≥ 0.80 in **both** W1 and W3; otherwise 600.
- Then `n_seeds = n_pairs/30`.

**Cap (§12.4).** At most 4,200 confirmatory runs. If under-powered, run at the cap and report it as under-powered. Never drop arms or windows, and never change α or the metric.

**Stage 2.** The held-out stream (30 accepted configurations from 900500) × `n_seeds` × 7 arms, with every gate re-verified before the first run.

**Stopping.**
- **RECOMMENDATION:** no interim analysis or optional stopping during Stage 2. The frozen text provides none, and stating it closes a degree of freedom.
- **FROZEN:** any G1–G16 failure halts the study (§9.4). Crashes are handled by §11.
- Stage 1 is never reported as evidence for or against H1.

---

## 14. Falsification and abandonment (FROZEN §15, §16, unchanged), with H1-R notes

| Criterion | Threshold (frozen) | H1-R note |
|---|---|---|
| **F-11** Degenerate environment | A7 ≈ A2 (§15.0, with the single extension) → void | **Depends on D-1.** The A7 ceiling is currently mis-specified on goal-incident edges. |
| F-1 No calibration | ρ(trust, `p`) < 0.30 or CI includes 0 at the end of Phase I | Calibration unit is D-4c; instrument not built |
| F-2 No decision change | Flip rate < 1% of eligible decisions | Instrument and definition: D-4a |
| F-3 Changed decisions do not help | Conditional-advantage CI includes 0 | Instrument and method: D-4b |
| F-4 No run-level benefit | (A1 − A2) CI includes 0 in both W1 and W3 | — |
| F-5 Not informational | (A1 − A6) CI includes 0 | — |
| F-6 Not per-edge | (A1 − A5) CI includes 0 | Read with the §2.3 interpretation rule |
| F-7 Ordinary RL explains it | 99% CI of (A2 half-life − A1 half-life) includes 0 or lies below 0 | Read with §2.2 (A2 under R1) |
| F-8 Static heuristics | A4 ≈ A1 at full n | A4 freezes Q and trust only (§4, H-C note) |
| F-9 Random | A3 ≈ A1 at full n | — |
| F-10 Memorisation | A1 held-out < 60% of pilot-configuration performance | Measure and window: D-4g |

**Abandonment and escalation (FROZEN §16):**
- **Redesign the environment** if F-11 fires, or if G11 or G13 is unsatisfiable.
- **Abandon the belief direction** if F-1 fires with visit-tracking diagnosed, if F-2 fires under the symmetric form (raising the weight is forbidden), or if F-5 fires.
- **Abandon the claim but continue** if F-7 fires.
- **Escalate if three or more of F-1…F-10 fire:** stop iterating, and turn to the D2 repair or a hidden-reward design.
- **D2-shaped failure:** if F-1 and F-2 pass and F-3 fails, the response is "repair D2 and re-run unchanged".
- Do **not** abandon over a W4 null, a small effect, or a negative result.

---

## 15. Gate battery (all green before Stage 1 and again before Stage 2)

**FROZEN** (§14; §12.1): G1–G6 and G8–G16. G7 is superseded by G16.

**FACT** (`evidence_r1/existing_gates.json`, conformance ON):

| Gate | Script | Status ON |
|---|---|---|
| G1–G6, G11–G14 | `verify_M7.js` | 49/0 |
| G8 | `verify_G8.js` | 21/1: **G8.4c** |
| G9 | `phase1_0/verify_G9.js` | 11/0 |
| G10 | `verify_G10.js` | 38/0 |
| G12 | `verify_e5.js` | 30/0 |
| G15 | `verify_G15.js` | 23/1: **C2** |
| G16 | `phase1_0/verify_G16.js` | 28/0 |

**Supersessions required for H1-R** (FROZEN once ratified; Appendix A):
- **H1R-S4, G8.4c.** It asserts that then-branch steps which executed an action but did not learn exist (> 0). In B2 they came from the lagged-guard coverage gap that R1 removes; G8's harness has no environment, so no slips. The accounting identity G8.4b (`L − D = replayLearned − thenNotLearned`) remains in force. G8.4c becomes "≥ 0, reported".
- **H1R-S5, G15 → G15′.** The legacy eligibility predicate (`episodeUnique ≥ 3`) no longer determines reward. G15′ consists of:
  - structural: the GOAL edit makes the eligibility operand constant (G15′-S);
  - dynamic: every goal reach carries exactly one +12 update (F1), and the eligibility rate is 1 in every run where it is defined (F2′, per §9.4);
  - anti-vacuity (F-AV).

  FACT: all pass on `evidence_r1`.

**H1-R conformance gates (FACT, `verify_conformance.mjs`).** RECOMMENDATION: the blocking set is
- X0, G1′;
- A1–A6, A-AV;
- R1a–R1e, R1-AV;
- B1–B3, B-AV;
- C1–C3, C-AV;
- D1–D3, D-AV;
- E1, E2, E-AV;
- F1, F2′, F-AV;
- G15′-S, G15′(9.4);
- S1–S5, T1;
- P2, P3;
- H1, H2.

All pass on `evidence_r1` (45 PASS). Diagnostic, non-blocking: R1-INFO, B-DIAG, C-INFO, **P1** (all 21 arm pairs distinct; A2 ≡ A5 in 10/41, see §2.3), and **F2 / G15′ as originally declared** (they required a goal reach in every run, contradicting §9.4).

**Other historical verifiers** (cap, goal, stepledger, e1e2 G1f/AV8b, S2.4b, S1b S1.7). With conformance ON they fail for classified, non-correctness reasons (`evidence_r1/R1_REPORT.md`). RECOMMENDATION: they are regression evidence, not gates. Their failures are recorded, not gating.

**Anti-vacuity (FROZEN §13.6).** A gate that passes before and after a change proves nothing. Every gate that detects a repair must fail against the pre-change build or a mutant. FACT: G1′, A-AV, R1-AV (B2 order and the R1-VIEW mutant), B-AV, C-AV, D-AV, E-AV and F-AV all demonstrate this. **RECOMMENDATION:** the measurement layer (§10.5) must carry its own mutants, e.g. a recorder that drops slip-tick returns, or a shadow argmax that ignores the arm, and each must be caught.

---

## 16. Determinism requirements

**FROZEN** (§5.4; G10): one OS process per run; cold `localStorage` asserted at start; crashes fail loudly.

**FACT** (`evidence_r1`):

| Check | Result |
|---|---|
| H1: two independent processes identical (fingerprint and cognitive draws) | 21/21 |
| H2: recorder neutrality | 21/21 |
| G1′: OFF ≡ B2 | 21/21 |
| `verify_determinism` with ON | 29/0 |
| `verify_G10` | 38/0 |

The replay cooldown is deterministic (`__M7_REPLAY_ONCE__`, Director ruling 2026-08-26), and there is no stream overlap (§9.2).

**RECOMMENDATION.** During Stage 1 and Stage 2, re-run a pre-registered 5% of runs (the first (config, seed) pair of every fifth configuration, in all arms) in fresh processes, and require identical fingerprints. Any mismatch halts the study, as a gate failure does.

---

## 17. Claim ceiling (FROZEN §17), with H1-R qualifiers

**Strongest permitted claim:**

> MiniFlyWire maintains a calibrated internal model of a hidden per-edge transition property; that model causally changes which action it selects on the immediately following step; and the changed selections measurably improve subsequent outcomes and post-shift re-adaptation — on one 20-node graph, for one hidden-variable family, with one-step use only and no planning (D2 unrepaired), with the prediction-error learning-rate pathway pinned, and at a realised fraction (A1 − A2)/(A7 − A2) of oracle-attainable gain.

**H1-R additions (RECOMMENDATION), each a required qualifier:**
- "under realised-outcome learning (R1)";
- "with goal-entering moves draw-free", unless D-1 is resolved by making them draw;
- "where FROZEN means Q- and trust-frozen".

The forbidden words of §17 apply unchanged.

---

## 18. What each result would lead to (decision map)

| Result | Next action |
|---|---|
| F-11 fires | **FROZEN:** void; redesign the environment (§3). **INFERENCE:** if D-1 is unresolved, first check whether the A7 ceiling was invalid on goal edges. |
| F-1 fires, with visit-tracking diagnosed | **FROZEN:** abandon the belief direction (one-step trust on this graph). |
| F-2 fires | **FROZEN:** belief is structurally dominated by Q; abandon. Raising the trust weight is forbidden. |
| F-1 and F-2 pass, F-3 fails | **FROZEN:** the D2-shaped failure. Repair D2 (look-ahead planning) and re-run H1-R unchanged. |
| F-5 fires | **FROZEN:** the gain was exploration perturbation; abandon the belief direction. |
| F-6 fires (with F-5 not firing) | **FROZEN:** H1-strict fails; the gain reduces to a global-reliability effect. |
| F-7 fires | **FROZEN:** report that model-free learning matches belief; abandon the claim, continue the work. |
| F-8 or F-9 fires | **FROZEN:** H-C or H-E wins (with the A4 qualifier). |
| F-10 fires | **FROZEN:** memorisation. |
| Three or more of F-1…F-10 | **FROZEN:** stop iterating; the next candidates are the D2 planning repair or hidden *reward* instead of hidden dynamics. |
| H1-strict confirmed | **FROZEN:** the claim ceiling of §17 applies. Then run the secondary Beta(2,2) regime under frozen §3.5. **RECOMMENDATION:** next build the D2 repair, so the belief can be tested beyond one step. |
| Under-powered at the cap | **FROZEN:** report as under-powered with the achieved power. No redesign to fit the budget. |

---

## 19. Adversarial completeness audit

Each item is marked **RESOLVED now (R)**, **RESOLVED by an existing ruling (E)** or **OPEN (O)** with a pointer to §20.

| # | Area | Finding | State |
|---|---|---|---|
| 1 | Hidden confound | Goal-entering moves are draw-free. Effective reliability correlates with distance to the goal (effective \|ρ\| up to 0.326 in Phase I, ≥ 0.10 in 26/41 configs). A7 is fed configured `p_e` on edges that never slip. | **O: D-1** |
| 2 | Hidden confound | Post-shift leakage: degree observables up to \|ρ\| ≈ 0.31, and the reward-relevant cosine similarity is unconstrained in Phase II (0.2174 measured in one pilot configuration) | **E** (ERR-07 §3.1 binding W3 limitation; carried) |
| 3 | Hidden confound | Habit entrenchment: explore-step learning (+8·gain per realised step) can lock Q-reading arms into cycles; 4/287 diagnostic runs had no goal reach | **E** (§9.4 includes them; reported descriptively, §10.3) |
| 4 | Hidden confound | A3 makes an extra cognitive draw per decision | **R** (environment stream untouched; A3 is not in the primary family; no pairing claim relies on the cognitive position across arms) |
| 5 | Arm ambiguity | A3 "uniform" covers committed step-0 decisions, uniform over graph neighbours; replay ticks re-execute the carried-over action | **R** (Director-authorised operationalisation; stated in §7) |
| 6 | Arm ambiguity | A4 freezes Q and trust only | **R** for semantics (§7); interpretation of F-8 narrowed (§14) |
| 7 | Arm ambiguity | A6 reads the canonical direction of σ(e) for both traversal directions, so reverse-direction trust values are never delivered in A6 | **R** for semantics (FACT, stated in §7). G6, as operationalised by ERR-06, passes with conformance ON (`verify_M7` 49/0). INFERENCE: A6's delivered multiset is drawn from canonical-direction keys only; record this at freeze. |
| 8 | Arm ambiguity | A7 on goal-incident edges | **O: D-1** |
| 9 | Arm ambiguity | A5 ≡ A2 in 10/41 configurations | **R** (§2.3: retain; descriptive reports) |
| 10 | Pseudoreplication | Seeds are nested in configurations: the Wilcoxon unit differs from the bootstrap unit; the power simulation is i.i.d. | **O: D-3** |
| 11 | Pseudoreplication | Pilot has 3 distinct `p_e` vectors | **O: D-2** |
| 12 | Pseudoreplication | Calibration uses directed trust keys against undirected `p_e` | **O: D-4c** |
| 13 | Outcome leakage | No H1 outcome computed; confirmatory material untouched; diagnostic and pilot exposure disclosed (§9.2) | **R** |
| 14 | Post-hoc degrees of freedom | Links ③/④ instruments; calibration unit; steps-to-goal censoring; trajectory entropy; F-10 window; slip-rate definition; tick index | **O: D-4, D-6** (must be pinned before freeze) |
| 15 | Exclusion ambiguity | `staleExecution = replayBranch` (ERR-08); a stale tick after a slip is a genuine re-attempt; validity-condition failures | **E** / **O: D-7** |
| 16 | Reward leakage | No `p_e` term in the reward; Phase I cosine–`p_e` correlation bounded by R3; goal reward flat (G15′) | **R / E**, except Phase II (#2) and goal-edge effective reliability (#1) |
| 17 | RNG and seed leakage | Stream overlap: minimum 1,411,985 draws against ≤ 78,538 per run; registry refusals for pilot seeds 000–003 | **R** for overlap; **O: D-2** for authorisations |
| 18 | Baseline invalidity | A2 is not an "ordinary" Q-learner under R1; A7 ceiling issue; A4 not static | **R** (documented, §2.2, §4) / **O: D-1** |
| 19 | Documented vs runtime | §3.1 "directed edges" vs undirected `p_e` | **E** (ruling R6, ERR-03) |
| 20 | Documented vs runtime | §3.3 "attempting any edge" vs draw-free goal entry | **O: D-1** |
| 21 | Documented vs runtime | ERR-05 §3.1 vs R1 | **R** (H1R-S1, Appendix A) |
| 22 | Documented vs runtime | §10.1/§10.2 premises | **R** (H1R-S2/S3) |
| 23 | Documented vs runtime | G14 "realised node enters learning/reward/PE" on a slip | **R** (R1 reading: the realised self-transition is excluded by the existing guard; u is the from-state of the next learning event; Appendix A) |
| 24 | Documented vs runtime | Frozen pilot block vs ERR-09 §3.1 (slot 4 resolves into the ERR-09 range) | **O: D-2** |
| 25 | Documented vs runtime | §18.1 `analyze.js` absent; primary metric not recorded | **O: D-5** (implementation milestone after freeze) |
| 26 | Documented vs runtime | Run-length tick unit not ruled | **O: D-6** |
| 27 | Unresolved contradiction | Frozen §9.4 "gate failure halts" vs G8.4c and legacy G15 under H1-R | **O: D-8** (ratify H1R-S4 and S5) |
| 28 | Governance | Untracked governing documents; H1-R rulings absent from the decision log | **O: D-11** |

---

## 20. Decisions required before freeze (OPEN register)

| ID | Decision | Recommendation |
|---|---|---|
| **D-1** | **Implemented in R2** (the recommended option; verified R2a–R2e and R2x). For the record: goal-entering moves were draw-free, contrary to §3.3. This invalidates the A7 ceiling on goal edges and creates a runtime topology leak. | **Make goal-entering attempts draw like every other edge.** A slip leaves the agent at u with no reset and no learning, under R1 semantics; success reaches the goal. This implements §3.3 literally and makes R2, R4, R5 and A7 consistent with the runtime. It needs a scoped implementation and re-verification milestone. Structurally, the new draws come only from the environment stream, so G2 separation is preserved. Behaviour, and hence later cognitive-stream consumption, changes by design. Alternatives: (b) redefine A7 to deliver the effective p = 1 on goal-entering edges, which changes arm semantics; (c) declare the limitation, accepting a biased F-11 and oracle fraction. |
| **D-2** | Pilot material and seeds | A fresh pilot stream from `893000` (bounded at `894999`, registered); the F-11 extension continues that stream; registry authorisations for `20260819000–003` (or a named fresh block) (§9.3) |
| **D-3** | Pseudoreplication in the primary test and the power simulation | Configuration-level aggregation (n = 30) for the Wilcoxon, with Holm unchanged; power simulation resamples configurations. Otherwise mandate a configuration-level sensitivity analysis. |
| **D-4** | Unpinned metric definitions: (a) link ③ shadow argmax; (b) link ④ fork method and sampling; (c) calibration unit; (e) steps-to-goal censoring; (f) trajectory entropy; (g) the F-10 measure and window; (h) slip-rate unit | Pin each in this document before freeze. For (a): A2's argmax = argmax over the same candidates with `bayesianTrust ≡ 0.5`, using A1's state as-is (per-edge route only), declared as such. For (b): deterministic re-execution to tick t followed by an arm switch, on a pre-registered random sample of flipped decisions (sample size and seed fixed here). For (c): directed keys with ≥ 5 attempts, plus an undirected pooled variant reported descriptively. |
| **D-5** | The measurement layer and `analyze.js` do not exist | **Partly implemented (R2).** The per-call `rewardSignal` record (`measure.mjs`, probes M-STEP and M-REWARD) and the driver `run_h1r.mjs` are verified (M1–M5, M-AV: neutral, exact, no RNG). Still open: windowing (needs D-6), the remaining §10.3 instruments, and `analyze.js`. |
| **D-6** | Run-length tick unit | Ratify `step`; τ = call index − 5 |
| **D-7** | Records that fail validity conditions | Handle as crashes (whole pair dropped from all arms, reported) |
| **D-8** | Gate battery under H1-R | Ratify H1R-S4 (G8.4c) and H1R-S5 (G15 → G15′), the blocking conformance set, and the non-gating status of the classified historical-verifier failures (§15) |
| **D-9** | A5 | Retain unchanged; add the §2.3 descriptive reports and the interpretation rule |
| **D-10** | Exploratory 2×2 PE factorial | Keep as declared, or waive explicitly |
| **D-11** | Governance records | Log the H1-R rulings in `research/09_decisions.md`; commit or hash the three untracked M7 documents |

---

## 21. Researcher-degrees-of-freedom register

M7 §19 applies in full.

**H1-R additions, all pinned here or OPEN:**

| Choice | Pinned to |
|---|---|
| Learning order | R1 (§6.3; Appendix A) |
| Slip learning semantics | No learning; the existing guard (§6.3) |
| Goal-entering draw | D-1 |
| Primary-metric tick contribution | §10.1 |
| Tick unit and index | D-6 |
| Pilot material | D-2 |
| Test independence unit | D-3 |
| Link ③/④ instruments | D-4a, D-4b |
| Calibration unit | D-4c |
| Validity-failure handling | D-7 |
| Gate battery | D-8 |
| A5 reporting | D-9 |
| Determinism re-runs | §16 |
| No interim analysis | §13 |

---

## Appendix A — Supersession register for H1-R (draft text)

> **H1R-S1 — supersedes, for H1-R only, the two M7-ERR-05 §3.1 sentences quoted as "Replaced" below.**
>
> *Replaced:* "Everything before it in the tick (decision, scoring, Q-learning, prediction error, reward) and everything after it runs unchanged on both outcomes." and "The attempt is evaluated exactly once at the block entry."
>
> *Replacement:* "For each movement decision, `env.attempt(u, v)` is evaluated **exactly once**, immediately **before** the self-learning section, from `liveRng("environment")` with the same arguments and exclusions as the E1 site, which reuses the outcome and does not draw again. The self-learning section is evaluated on the **realised** transition: on success, `u → v`; on a slip, the realised transition is `u → u`, which the section's existing entry guard excludes from learning, so the slip produces no reward, no prediction-error evaluation and no Q update, and costs only the elapsed tick. The coherent traversal block (E1′) alone performs the move, and E2 credits the intended edge `u → v`. Everything else in ERR-05, including the scope of the E1′ block and its side-effect list, is unchanged."
>
> *Authority:* Director ruling R1 (2026-10-04). *Grounds:* ERR-05 §3.1 conflicts with frozen §3.3 (binding, G14), which requires the realised node to enter learning, reward and PE (measured: 81.9% of slip-tick updates carried positive intended-move reward in B2 order). *Implemented in:* `experiments/h1r/conformance_transform.mjs` (R1-DRAW-EARLY, R1-VIEW, R1-RESTORE, R1-DRAW), commit `742f239`. *Verified by:* `verify_conformance.mjs` R1a–R1e and R1-AV.

> **H1R-S2 — marks M7 §10.1 premise sentence 1 as not holding for H1-R** (S2-a, S2-b in §2.2). The rationale sentence is retained for the record; the design consequences it motivated (temporal windows, A5, A6, conditional advantage) are unchanged.

> **H1R-S3 — marks M7 §10.2 premise sentence 1 as not holding for B2 or H1-R** (S3-a, S3-b). The pins (learning authority ≡ 1.0, `dampQ` disabled) and G12 remain binding.

> **H1R-S4 — G8 sub-assertion G8.4c** ("thenNotLearned > 0") becomes "≥ 0, reported" for H1-R. The G8.4b identity remains binding.

> **H1R-S5 — G15 is superseded by G15′ for H1-R** (§15). The definition of G15′ is that of `verify_conformance.mjs` (G15′-S, F1, F2′, F-AV, G15′(9.4)).

> **G14 reading under R1 (clarification, not a supersession).** "On a slip: realised node enters learning/reward/PE" is satisfied as follows: nothing about the intended node v enters learning, reward or PE; u remains `agentCurrent` and is the from-state of the next learning event; the intended edge receives the trust attempt.

## Appendix B — Reproducible checks run for this draft (configuration and registry only; no agent run, no outcome)

```bash
node research/preregistrations/h1r_prereg_checks/goal_edge_reliability.mjs
```

```bash
node research/preregistrations/h1r_prereg_checks/stream_overlap.mjs
```

```bash
node research/preregistrations/h1r_prereg_checks/seed_registry_status.mjs
```

| Check | Output on 2026-10-04 (all seeds evaluated below 900500) |
|---|---|
| Goal-edge reliability | Phase I: 31/41 configs with unreliable goal edges; R5 mean 7.71 → 6.54; max effective \|ρ₄\| 0.326; 26 configs ≥ 0.10. Phase II: 40/41; R5 41 → 40; \|ρ₄\| 0.342. |
| Stream overlap | 120 streams, 7,140 pairs, minimum lag 1,411,985 draws |
| Registry | 893000/894999 free; 900000–900499 consumed; 900500+ held out and unconsumed; 20260819000–003 refused for H1-R; 004–009 and 100–119 available |

The pilot-slot resolution (§9.2, item 1) was computed with `env.generateAccepted(900000 + i, i)` and `env.generateAcceptedStream(900000, 5)`. The highest seed evaluated was 900211.
