# LEARN-0 — does experience help when the map is switched off?

**Status: FROZEN PREREGISTRATION (freeze milestone, 2026-10-24).** The confirmatory run is **NOT AUTHORIZED and NOT EXECUTED**.
- The design is revision 2 plus the one correction Gemini's revision-2 review required (section 11). Gemini's verdict: PASS WITH CLAIM LIMITS.
- The freeze record is `FREEZE.md` / `FREEZE.json`, verified by `verify_freeze_learn0.mjs`.
- Block L's 360 configurations were generated only to check for collisions (`blockL_worlds.json`). No session was run.
- No production file has been changed.

**Question.** When all four map oracles are disabled, does the experience store that the agent built in the same world raise legal goal reaches, compared with the same agent starting cold?

Every statement below carries one of four tags:

- **FACT** — read from the repository, or produced by a gate check or tool that anyone can re-run.
- **INF** — an inference drawn from facts.
- **REC** — a recommendation, that is, a choice made in this design.
- **OPEN** — a question for the reviewer or the owner (section 13).

---

## 1. Runtime pin: resolving 0df804c against 8e699af

**FACT (git).**
- Local `main` and `origin/main` are both `8e699afa56b26b22dca6b5621a57ee378ec33aa7`.
- The audit anchor `0df804c497e649affb9e7ebacb10fdc81ab6de8d` is the "audited HEAD" that every GATE-FLOOR tree has been built from since GATE-FLOOR-HEAD. It is a results commit, not a runtime commit.
- `git diff --name-only` over `main.js render index.html connections.json neurons.json instrumentation experiments/m7` is **empty** from `952c9fcf3123eb6e7ca2deab8247d2a99af541cf` to HEAD.
- The same diff from `0df804c` to HEAD is also **empty**.
- So the last runtime change is 952c9fc (2026-09-20, the FutureScore V2.3 consumer).
- The runtime is byte-identical at all three commits:

| object | value |
|---|---|
| `main.js` blob | `09c36b5caf24ed1bf447a13fe924d8297a11a301` |
| `render/` tree | `dd0d28902b7d136e719b9cba05bdc04cd549b705` |
| `main.js` sha256 | `c92c5c6b6d2e32aed9114e2a8dc4075134630bfe6e5547b8052b9e8b839a3de3` |

The discrepancy is one of naming only.

**REC.** Pin by content (`config.mjs` `RUNTIME`). Gate check `S1` re-derives every value from git. It fails if any runtime path differs between 952c9fc and HEAD, or if 8e699af stops being an ancestor of HEAD.

## 2. Substrate

**FACT.** The experiment tree is built in three steps:
1. The PRODSEM *derived* HEAD tree.
2. Plus the two GATE-FLOOR-INTERACTION guard lines. They are installed in **diagnostic mode**, which masks and blocks nothing.
3. Plus exactly **four LEARN-0 lines** (`transform.mjs`). Each one sits at the entry of one oracle:

| oracle | file | when the map is off it returns | reason this value is neutral |
|---|---|---|---|
| `goalDistance` | main.js (BFS to the goal; trained transitions count as extra edges) | `0` | the caller's gradient `dist > 0 ? 30/(dist+0.5)*0.75+5 : dist === -1 ? -8 : 0` becomes 0 |
| `canReachGoal` | main.js (DFS, depth 4) | `true` | the admission filter admits every candidate that local perception or experience proposes |
| `graphDiameter` | main.js (all-pairs BFS) | `0` | it is only the projection scale, and its projection receives `undefined` |
| `futureScore` | render/planning.js (BFS from the goal + H=3 path enumeration) | `undefined` | `projectFutureScore(undefined, ·)` returns 0 |

Pins (gate `S2`):
- LEARN-0 `main.js` `3d3266fd…`
- `render/planning.js` `34e06c65…`
- 147 files, all identical to the guard base except the two edited files.
- Removing the four tagged lines restores the base byte for byte.

**FACT (gate N1).** With the map on, the instrumented LEARN-0 tree produces results identical to bare HEAD. Hook state P is used throughout.

## 3. Map knowledge, the audited call graph, and residual map information

**REC (definition).** Three categories are kept apart:

| category | what it is | status |
|---|---|---|
| **local perception** | the current node's own neighbours as candidates; recognising the goal when it is one of them | allowed in every cell |
| **experience-derived information** | anything computed from what the agent itself did: transitions, rewards, penalties, signals, curiosity, goal-keyed Q, confidence, episodes, the episodic adjacency memory | allowed (the treatment) |
| **prohibited oracle access** | any read of graph structure beyond the current node's neighbours, done on the agent's behalf: the four oracles | blocked in every map-off cell |

**FACT (static audit, gate `S3`).** Two scans run over every line of `main.js` and `render/*.js` in the LEARN-0 tree:
- **Graph reads.** The 46 hits must **equal** `map_audit_table.json` (file, line and exact text). Classes:
  - 14 inside a guarded oracle;
  - 8 oracle call sites;
  - 4 local perception;
  - 6 legality of the pair just executed;
  - 2 embedding-drift protection (goal-free);
  - 3 construction;
  - 3 not reached (click listener only);
  - 1 visual;
  - 1 write-only;
  - 2 unused by the scorer;
  - 2 dead.
- **Graph names.** The 41 hits must **equal** `map_sweep_table.json`.

Mutants M7, M8 and M8b show that both scans catch an extra read, a missing guard, and an unreviewed line.

**FACT (admission and the goal's identity, main.js).** A candidate is admitted when it is a neighbour of the current node, an episode-trained transition (strength > 5), or a human-trained pair. With the map on, `canReachGoal` must also be true.

These are the goal-specific terms:
- `goalGradientBoost = 100·tc` for the goal candidate, where `tc` is the episodic adjacency count of (current → goal) divided by 5. This is experience-derived and gated by local perception.
- For every other candidate, the oracle gradient times `0.10 + 0.90·tc`. With the map off this is 0.
- `driveGoalBoost`, which is non-zero only when `goalGradientBoost > 0`.
- Goal-keyed Q (`pos#goal->action`).

Other goal-related paths carry no map information into decisions:
- The embedding similarity to the goal (`goalBoost`) is fixed at 0 (`candidateAnalysis.js:381`).
- Goal attention is set only by a user click.
- Node positions are used only for drawing.
- Semantic candidates are skipped while a goal is active.

### 3a. How zero oracle leakage is verified (unchanged layers)

1. **Content pins.** The session and the analysis refuse any other tree.
2. **The executable static audit** above.
3. **Per-session guard accounting (I2, voids the block).** Map off: every oracle's *executed* count is 0, and every oracle's *blocked* count is > 0. Map on: the reverse. The analysis recomputes this from the raw counts.
4. **Gate-only independent body probes (K0).** Map off: every body count is 0. Map on: the body count equals the guard's executed count exactly.
5. **Gate-only candidate-level check (K1)** at the first decision. See section 5a.

### 3b. Residual map information in the delivered store (new in revision 2)

Blocking the four oracle bodies does **not** by itself show that the delivered *store* carries no map knowledge. So the store was audited separately.

**FACT (code).**
- The persisted store has eight components (`xfer1/brain.mjs`): transitions, rewards, penalties, signals, curiosity, Q, confidence, episodes. Embeddings, node positions and the semantic map are **not** persisted.
- Every session runs in its own process. The harness asserts a **cold localStorage** at the start of each run (`experiments/m7/run.js`, G10). The driver serves exactly one store, the delivered one.
- New in this revision: the driver refuses to run when the harness's warm-store override `M7_RUN_WARMSTORE` is set.

**FACT (development, traced).** The relational entries of a training export are not all graph edges.
- Signals, curiosity, confidence and Q are keyed by a **lagged pair**: the position two moves back → the current position (`main.js` `prev = agentLast`, `current = next`).
- Example: on development world 1, `7->5` (graph distance 2) is written right after the executed moves 7→8 and 8→5.
- Goal credit (`recentMemory`, at most 6 positions) and episode replay write pairs along the agent's own path.

**REC (instrument I7, `provenance.mjs`).**
- Every relational entry of a world's T export must be a lag-1 or lag-2 pair of **T's own position sequence**, or a self pair of a visited node. This covers the pairs in rewards, penalties, signals, curiosity, confidence and transitions; the (pos, action) pair of each Q key; and the consecutive nodes of each episode.
- The position sequence is rebuilt from T's arrival trace. It includes non-graph executions and post-reset jumps, which are also the agent's own experience.
- The orchestrator runs this check on every T before any test session. A world that fails is **excluded**, and the analysis refuses a world whose control lacks a passing check.

**FACT (development worlds 0–9, T sessions only; scratch tool, plus gate R on worlds 1–2).** All of the following hold:
- **0 off-trajectory entries** in 10 of 10 stores. Entries by class, summed over the 10 worlds:
  - lag 1: 12,515
  - lag 2: 2,559
  - self: 224
- Lag 2 is needed: with lag 1 only, the real stores fail (gate `R1`).
- The rule is non-vacuous: per world it **excludes 111–153 of the 380 ordered node pairs**.
- An untraversed edge injected into transitions, an untraversed far pair injected into goal-keyed Q, a dump of every graph edge into signals, and an injected episode are all flagged (gate mutants RM1–RM4).

**FACT (coverage; this is a limitation).** In those 10 worlds, T visited all 20 nodes and executed **66–76 of the 78 directed edges**.

**INF and limitation.**
- The store can describe nothing that T did not itself traverse in sequence. But in these 20-node worlds, T traverses most of the graph.
- So "experience" here includes an **experience-learned, nearly complete record of the graph's edges**, and goal-keyed Q can learn values that track the distance to the goal along traversed routes.
- That is allowed: it is experience, not oracle access. LEARN-0 **does not distinguish** learning a map from experience from any other use of experience, and it says nothing about larger graphs where experience would be partial.
- There is no held-out information to leak. T and the test cells share world and goal **by design**, and the store is frozen before any test: per-component hashes are recorded in phase 1b and checked at the first call of every store cell (I3).

## 4. Cells, training and test separation, store identity

**REC.** For every world `w` in block L there are six sessions of 1,500 calls each:

| session | map | start | seed |
|---|---|---|---|
| T | off | cold | `trainSeed(w) = 1,100,100,000 + 2w`; its export is the store |
| N0 | off | cold | `testSeed(w) = trainSeed(w) + 1` |
| **N1** | off | **all 8 components of T's export** | testSeed(w) |
| N1E | off | episodes only | testSeed(w) |
| N1Q | off | Q only | testSeed(w) |
| O0 | **on** | cold | testSeed(w) |

Instruments that void the block or exclude a world:
- I3: store identity.
- I4: pairing.
- I5: training fidelity.
- I7: provenance.

## 5. Outcomes, estimand, and the multiplicity policy

**REC (primary).** E1 = E_w[ Y_w(N1) − Y_w(N0) ], where Y is **legal goal reaches** per test session. E1 is the **sole** primary outcome.

**Scope of E1 (REC).**
- E1 estimates the **total effect** of delivering the tested store: all eight persisted components of the world's own map-off training export, delivered together at the start of a map-off session, compared with starting cold, under the same map-off procedure and test seed.
- It is **not** the causal contribution of any single component or learning mechanism.
- Components can interact and can cancel. In development, episodes alone gave +53.5, Q alone gave −48.0, and the full store gave −18.5. E1 cannot separate those effects, and it is not asked to.

**REC (secondaries: exploratory, descriptive).**

| id | what |
|---|---|
| S1 | non-graph resets and all resets, N1 − N0 |
| S2 | late-half minus early-half legal reaches, in N0 and in N1 |
| S3 | downhill rate of **legal** moves at true distance ≥ 2, against uniform chance, N1 against N0 |
| S4 | goal-entry share from a goal-adjacent node |
| S5 | O0 − N0, descriptive only (section 5a) |
| S6 | N1E − N0, N1Q − N0, N1E − N1 |
| S7 | mechanism diagnostics |
| byGoal | E1, N1E, N1Q and S5 within each goal |

**Multiplicity policy (REC; `config.SECONDARY_POLICY`).**
- **28** secondary intervals are produced: S1 2 + S2 2 + S3 3 + S4 1 + S5 1 + S6 3 + byGoal 16. The analysis counts them, and the gate checks that the count equals the declared 28.
- All are **unadjusted** 95 % percentile intervals, reported as estimates.
- **No secondary carries a label. None changes E1's label. None is a confirmatory claim.**
- The component margin labels of revision 1 were **removed** from the analysis and from the verdict. The verdict states that every secondary estimate is exploratory.
- With 28 unadjusted intervals, about 1.4 are expected to exclude the true value by chance alone. Any secondary pattern can only motivate a new preregistered study, for example a component study (LEARN-1).
- Gate check `A1` confirms that a fixture with very large component effects (+90 / −90) leaves E1's label and the verdict's claims unchanged.

### 5a. Map-off procedure, candidate admission, and the random stream

**FACT (gate K1, development world 1, first decision).**
- Disabling `canReachGoal` removes the reachability filter. Candidates more than 3 edges from the goal can then be admitted. The filter's depth test precedes its goal test, so it admits exactly the candidates within 3 edges.
- At the first decision, map off admitted one extra candidate at distance 4.
- `drift = (liveRng() − 0.5)·curiosity·0.06` is drawn once per scored candidate. Each extra candidate therefore shifts every later `liveRng()` draw in that call, and in the rest of the session.
- Gate K1 verifies this exactly: shared candidates differ only in the three oracle terms and `drift`, and the map-off drift sequence is the map-on sequence plus one draw per extra candidate.

**INF (why this does not threaten the primary contrast).**
1. N0 and N1 run the **same** map-off procedure: same tree, same neutral oracles, same admission rule, same test seed. The extra admissions and draw shifts are part of the procedure **both** arms receive. They are not a difference between the arms.
2. E1 is defined as the store effect **under** that procedure. Some of the store's effect may run through candidates that only the map-off procedure admits; for example, trained non-graph candidates that the filter would have removed. That is part of the estimand, not a bias.
3. The shared test seed gives common random numbers only until the two trajectories diverge, which the store itself causes. After that, the random-number paths differ. This affects **precision**, not bias. The world is the unit of analysis, and the per-world variance, seed noise included, is what the paired bootstrap over worlds measures.
4. A threat would exist only if the procedure differed between N0 and N1. Instruments I1–I4 make the procedure identical apart from the delivered store, and they void any world where it is not.

**REC (map-on contrasts stay descriptive).**
- Every contrast with O0 (S5 = O0 − N0) bundles three things: the oracle terms, the removed filter, and the random-stream shift. It is reported as "what switching the oracles on does to a cold agent here", with no attribution to any oracle.
- No N1-against-O0 contrast is computed.
- The intervention was **not** redesigned to make results cleaner.

## 6. Uncertainty, margin, decision rule, sample size

All numbers in this section are independently verified:
- `sizing.mjs` computes exact normal and χ² quantiles by bisection on high-precision CDFs; there are no table constants.
- `tools/sizing_learn0.mjs` writes `evidence/sizing_learn0.json`. It recomputes the development SD from the **raw rows**, and checks the closed form by Monte Carlo through the analysis's **own** bootstrap and decision rule.
- Gate checks `S5` re-derive every number in `config.SIZING` and compare it with the evidence file.

**Method.**
- Paired percentile bootstrap: 10,000 resamples, seed 20261014, 95 % for E1.
- **Margin (a judgment).** δ = 20 legal reaches, the programme margin. Sensitivity labels at δ = 15 and δ = 30 are reported but do not decide anything.
- **Decision rule.**

| label | condition |
|---|---|
| LEARNS_WITHOUT_MAP | CI lower ≥ δ |
| EXPERIENCE_HARMS_WITHOUT_MAP | CI upper ≤ −δ |
| NO_PRACTICAL_EFFECT | −δ < CI lower and CI upper < δ |
| INCONCLUSIVE | otherwise |

**FACT (verified arithmetic).**

| quantity | value |
|---|---|
| z0.975, z0.80 | 1.959964, 0.841621 |
| development E1 differences (30 worlds, from the raw rows) | mean −18.53, SD **107.54**, skewness −0.07, excess kurtosis −1.24 (lighter tails than normal) |
| χ² 95 % interval for that SD (df 29; assumes normality) | **[85.64, 144.57]** |
| percentile-bootstrap 95 % interval for that SD (10,000 resamples) | [86.34, 123.95] |
| the 25 % inflation (SD 134.4) equals | a **one-sided 93.2 %** upper confidence limit on the SD (normal theory). It lies above the bootstrap upper limit. |
| rule n ≥ ((z0.975 + z0.80)·SD/δ)² | 227 at SD 107.5; **355 at SD 134.4**; 411 at SD 144.57 |
| **n chosen** | **360** (90 worlds per goal) |
| at n = 360, the true effect labelled LEARNS with probability 0.80 | 35.9 (SD 107.5); **39.8 (SD 134.4)**; 41.3 (SD 144.6) |

Label probabilities at n = 360 and SD 134.4 (closed form). Columns: LEARNS / HARMS / NO_EFFECT / INCONCLUSIVE.

| true E1 | probabilities |
|---|---|
| −40 | 0 / .806 / 0 / .194 |
| −20 | 0 / .025 / .025 / .950 |
| 0 | 0 / 0 / .612 / .388 |
| +20 | .025 / 0 / .025 / .950 |
| +40 | .806 / 0 / 0 / .194 |

**Monte Carlo check.** 400 replications per cell, run through `pairedSummary` and `classifyE1`, under two models: normal differences, and the development differences' own shape. Both agree with the closed form within 0.051, which is about 2 Monte Carlo standard errors.

**INF. What the rule is built to do.**
- The rule n ≥ ((z0.975 + z0.80)·SD/δ)² gives a probability of about 0.80 of labelling LEARNS (or HARMS) when the true effect is about δ + 2.8·SE, that is about **40 = 2δ** at n = 360.
- It is designed to identify effects **meaningfully larger than δ**, not effects equal to δ.
- For a true effect of exactly ±δ, the directional label has probability 1 − Φ(1.96) = **0.025 for every n**, and INCONCLUSIVE has probability 0.95. Gate `S5` verifies this for n = 180, 360, 720 and 1,440.
- No sample size makes an effect sitting at the margin decidable.

**REC. n = 360 is a deliberately limited design with disclosed operating characteristics.**
- It applies the programme's rule. That rule and its 25 % inflation were fixed before any LEARN-0 outcome existed, and are the same as in PRODSEM, INTERACTION and C′.
- The development **mean** was not used to set n or δ. δ is the programme margin, and n is the rule applied to the development **SD** only.
- The inflation already corresponds to a one-sided 93 % upper limit on the SD. The non-parametric interval for the SD lies below it.
- Two alternatives were considered and **not adopted**:

| alternative | n | objective | why not |
|---|---|---|---|
| the rule at the χ² upper limit | 411 | 0.80 at 2δ even if the SD is 144.6 | raises that probability by only a few points, at +14 % sessions |
| 80 % chance of NO_PRACTICAL_EFFECT at a true effect of 0 | 475 | a different objective (equivalence) from the programme's rule | — |

  Neither alternative was chosen or rejected because of which result it would favour. Adopting either is the owner's call (OPEN-2).

## 7. Development calibration

**FACT.**
- XFER-1 development worlds 0–29; completed-study worlds, not LEARN-0 worlds. 180 sessions.
- Every session passed integrity and the map audit, and store delivery was exact.
- The calibration ran on the pre-review driver. Its decision-relevant logic is unchanged; later revisions only added checks, the legal-move restriction of S3, and the warm-store refusal.

| contrast | mean [95 % CI] | SD |
|---|---|---|
| E1 = N1 − N0 (legal) | −18.5 [−57.2, 18.3] | 107.5 |
| N1E − N0 | +53.5 [29.1, 76.4] | 67.2 |
| N1Q − N0 | −48.0 [−81.0, −12.9] | 95.8 |
| N1E − N1 | +72.1 [41.3, 104.8] | 89.0 |
| S5 = O0 − N0 | +128.7 [100.1, 157.6] | 81.6 |
| S1 non-graph, N1 − N0 | +140.8 [91.5, 190.5] | 140.4 |
| S2 N0, late − early | −7.8 [−20.3, 5.1] | 35.8 |

**What the calibration was used for (REC):**
- the SD for the sizing rule;
- adding the component cells, as **exploratory** secondaries;
- the S3 restriction to legal moves.

**What it was not used for:**
- δ;
- n beyond the SD;
- the primary contrast;
- any confirmatory world.

## 8. Worlds, seeds, accounting

**FACT and REC.**
- Block L is stream indices **1672–2031** (360 worlds). They come after C′ (1392–1671); 0–1391 belong to earlier studies.
- The index rule gives exactly 90 worlds per goal.
- Agent seeds run from 1,100,103,344 to 1,100,104,063. All are fresh and outside the MCF-1 blocks.
- **The configurations are not generated in this milestone.** That happens at the freeze milestone, and the orchestrator refuses held-out seeds and unbalanced goals.
- Sessions: 360 training + 1,800 test = **2,160**.

## 9. Exclusions and stop conditions

**REC.**
- **World exclusion.** A world is excluded when any of its six sessions still fails after **one deterministic retry**. Failure means a crash, an incomplete run, an integrity violation, an oracle-audit failure, or a store-delivery mismatch. A world is also excluded **before any test session** when its T export fails the store construct check or the **provenance check (I7)**. Nothing is excluded for what its outcomes were.
- **Block validity.** The block is INVALID when more than 10 % of worlds are excluded, or when any remaining record fails I1–I7.
- **Stopping.** The plan is fixed: 2,160 sessions. No interim look, no extension, no optional stopping, one frozen analysis.
- **Hard stops before any session:**
  - a tree pin mismatch;
  - a design or decision digest that differs from the freeze;
  - a gate failure at the freeze milestone;
  - a driver refusal (now including a warm-store override).
- **After outcomes.** No tuning. Any deviation is recorded as a deviation.

## 10. Verification

`node experiments/learn0/verify_learn0.mjs` uses only XFER-1 development worlds 0–3 and prints no confirmatory endpoint.

| section | checks |
|---|---|
| S | runtime identity, pins, both audits, declared design, calibration, **the verified sizing arithmetic** (recomputed from the raw rows; evidence equality; Monte Carlo agreement; behaviour at the margin), digests, hygiene, preregistration current |
| N | neutrality; zero executed calls and every guard reached with the map off; every oracle runs with the map on; determinism; refusals, **including M7_RUN_WARMSTORE** |
| K | body probes, candidate scope, the drift shift |
| D | independent recomputation of the move counts; store delivery |
| **R** | **store provenance on real T exports; non-vacuity; lag 2 is required; injection mutants RM1–RM4** |
| A | labels; **secondaries carry no labels and no claim; declared interval count = produced**; refusals, **including failed or missing provenance** |
| P | the exact plan and freshness |
| O | orchestrator self-test, **which runs provenance before the tests**; its real records pass every analysis rule |
| M | mutants, **including M16: provenance check removed from the analysis** |

**FACT (last run, 2026-10-24, revision 2 + the review's claim-limit correction).** **62 checks passed, 0 failed; 21 of 21 mutants caught.** That includes RM1–RM4 and M16. The log is `evidence/gate_verify_learn0.log`.

| digest | revision 2 as reviewed | after the claim-limit correction |
|---|---|---|
| decision | `2009d7a2…cdf43b4` | `9beeef97…19c8f0` |
| design | `6ce4fb4a…91dfa9` | `f2614ca3…5e74e` |
| preregistration | `b6a8008e…a926ec` | `70dcc4be…51c7d3` |

The only cause of the change is the added `RULES.learnsLimit` (section 11).

Revision 1's gate history (two fixed check errors and two tightened fixtures) is unchanged and was disclosed in revision 1.

## 11. What each label would and would not license (REC)

| E1 label | strongest allowed sentence | next decision |
|---|---|---|
| LEARNS_WITHOUT_MAP | the persisted store, as a whole, raises legal reaches by at least δ without the map, in the world and goal it was trained on | LEARN-1: a preregistered component and transfer study |
| NO_PRACTICAL_EFFECT | the persisted store, as a whole, changes legal reaches by less than δ either way | a component study, if the owner wants one; S6 is exploratory and settles nothing |
| EXPERIENCE_HARMS_WITHOUT_MAP | the persisted store, as a whole, lowers legal reaches by at least δ | a preregistered study of the mechanism |
| INCONCLUSIVE | none beyond the interval itself | the design question goes back to the Director |

No label licenses "planning", "understanding", "transfer", "recall", "map-free learning" (section 3b), or any statement about a single component. No label changes production code.

**Claim limit (mandatory correction from the Gemini revision-2 review; `config.mjs` `RULES.learnsLimit`, appended to every LEARNS_WITHOUT_MAP verdict):** A LEARNS_WITHOUT_MAP outcome may reflect experience-derived graph reconstruction and path-keyed Q-values; it does not demonstrate map-free spatial reasoning, abstract route planning, or cognition.

## 12. What this milestone did not do (FACT)

- No confirmatory configuration was generated.
- No block-L session was run, and none was planned.
- C′ was not executed.
- No production file was changed (gate S1).
- Nothing was committed or pushed during design; the package is committed by the freeze milestone.
- The development T sessions used for the provenance measurements (worlds 0–9) and the gate (worlds 0–3) are XFER-1 development worlds.
- The freeze milestone generated block L's configurations (stream indices 1672–2031) **only** to check them for collisions. No session was run, and no block-L outcome exists.

## 13. Open questions

- **OPEN-1. Residual map information.** In 20-node worlds, experience covers most of the graph (66–76 of 78 directed edges). E1 therefore cannot tell "experience-learned map" apart from other uses of experience. Is that acceptable as a stated limitation? Or should a later study test a partial-experience condition, for example a shorter T? That would be a new study, not a change here.
- **OPEN-2. n.** Keep 360, the rule as fixed? Or adopt 411, the rule at the χ² upper SD limit, or 475, the equivalence objective? Revision 2 recommends 360. Either alternative is acceptable if the owner prefers it **before** any confirmatory outcome.
- **OPEN-3. δ.** δ = 20 is the programme margin, not derived from this question.
- **OPEN-4. S3 null.** In development the cold no-map agent beats uniform chance (0.588 against 0.458, all far moves). S3 is descriptive only.
- **OPEN-5. Non-graph shortcuts.** The store roughly doubles non-graph resets. The guards stay in diagnostic mode, and non-graph resets are reported separately.
- **OPEN-6. Stream extension at the freeze.** A held-out collision would stop the study before any session.
- **OPEN-7. Registry bookkeeping.** LEARN-0's consumption is not registered in the typed registry, as with C′.
- **OPEN-8. Q harm and the lagged credit.** Q is written under lag-2 pairs (`prev = agentLast`). That is a runtime property, documented and not changed. It may explain the development Q-only harm; that question belongs to LEARN-1, not here.

## 14. Files

| file | role |
|---|---|
| `config.mjs` | declarations, the decision rule, `SECONDARY_POLICY`, `PROVENANCE`, `SIZING`, digests |
| `transform.mjs`, `session.mjs`, `plan.mjs`, `orchestrate.mjs`, `analyze.mjs` | the runtime path. Training sessions carry the trace; phase 1b runs provenance |
| `static_audit.mjs`, `map_audit_table.json`, `map_sweep_table.json` | the executable call-graph audit |
| `provenance.mjs` | **new**: the store provenance check (I7) |
| `sizing.mjs`, `tools/sizing_learn0.mjs`, `evidence/sizing_learn0.json` | **new**: the independently verified sizing arithmetic |
| `export_prereg.mjs`, `preregistration.json` | the machine-readable preregistration |
| `verify_learn0.mjs` | the design gate |
| `tools/calib_learn0.mjs`, `evidence/calib_*` | development calibration |

## 15. Revision 2: what changed and why

1. **Estimand and multiplicity.**
   - E1 remains the sole primary, and its scope is now stated as the total effect of the whole store.
   - The secondary component labels were removed from the analysis and the verdict.
   - The 28-interval multiplicity policy is declared, counted and gated.
2. **Map-off procedure.** Section 5a documents the extra candidates and the random-stream shift, and explains why they do not bias N1 − N0. Map-on contrasts are descriptive. The intervention is unchanged.
3. **Sample size.**
   - Recomputed independently, using exact quantiles, the raw rows, and a Monte Carlo run through the analysis's own code.
   - Corrected: the χ² upper SD limit is 144.57, so the rule there needs **411**, not 410 as revision 1 said.
   - The inflation's equivalent confidence level was added: one-sided 93.2 %.
   - It is stated explicitly that the rule targets effects of about 2δ, and that an effect at ±δ is INCONCLUSIVE with probability 0.95 for any n.
   - n = 360 is kept as a deliberately limited design.
4. **Residual map information.**
   - New store provenance instrument I7, with gate section R and four injection mutants.
   - The lagged-pair semantics of the stores are documented.
   - The coverage limitation is stated.
   - A warm-store refusal was added to the driver.
   - All earlier pins, audits, counters, probes and identity checks are unchanged.
