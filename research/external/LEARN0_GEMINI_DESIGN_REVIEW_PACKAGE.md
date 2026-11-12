# LEARN-0 — design-review package, revision 2 (self-contained; no repository access needed)

**What I need from you.** One focused, adversarial review of a **design only**.
- Nothing is frozen.
- No confirmatory world has been generated or run.
- Production code is untouched.

You do not implement or run anything. Judge the following and answer §11 in the format of §12:
- the definition of map knowledge, and the leakage and store-provenance instrumentation (§4);
- the estimand and the multiplicity policy (§5–§6);
- the treatment of the map-off random-stream shift (§7);
- the verified sizing and decision rule (§8);
- the claim limits.

Do not reopen GATE-FLOOR-SCOPE C′ (frozen, not executed) or any closed study.

Every statement is tagged:
- **FACT**: read from the repository, or produced by a gate check or tool that can be re-run;
- **INF**: an inference;
- **REC**: a design choice;
- **OPEN**: an unresolved question.

**Revision 2** applies four targeted corrections from the owner:
1. the estimand scope and the multiplicity policy;
2. the random-stream and admission explanation;
3. an independently verified sizing arithmetic;
4. a store-provenance instrument for residual map information.

## 1. Context

The programme's earlier results come from HEAD with its map oracles **on**. HEAD's decision rule computes:
- graph distances to the goal (BFS);
- a reachability filter;
- a graph diameter;
- a 3-step look-ahead.

So none of those results shows that *experience* drives goal-directed behaviour.

**LEARN-0 asks the missing question.** With every map oracle disabled, does the experience store the agent built in the same world raise legal goal reaches compared with starting cold?

## 2. Runtime pin

**FACT.**
- Local and remote `main` are both `8e699afa56b26b22dca6b5621a57ee378ec33aa7`.
- `0df804c497e6…` is the audit anchor that all GATE-FLOOR trees build from. It is a results commit.
- `git diff` over all runtime paths is empty from `952c9fcf3123…` (the last runtime change, 2026-09-20) to HEAD, and empty from `0df804c` to HEAD.
- Pinned by content: `main.js` blob `09c36b5caf24…`, `render/` tree `dd0d28902b7d…`, `main.js` sha256 `c92c5c6b…`.

The discrepancy is naming only.

## 3. Intervention

**FACT.** The tree is the audited derived HEAD tree, plus two earlier guard lines in diagnostic mode (nothing masked or blocked), plus four lines, one at the entry of each map oracle. With the map off, each oracle returns its neutral value before reading the graph:

| oracle | returns when the map is off | effect |
|---|---|---|
| `goalDistance` | 0 | the non-goal gradient becomes 0 |
| `canReachGoal` | true | the reachability filter is removed |
| `graphDiameter` | 0 | — |
| `futureScore` | undefined | `futureBonus = 0` |

With no switch installed, or with the map on, the tree behaves exactly like bare HEAD; gate N1 checks this on development worlds. Hook state P is used throughout.

## 4. Map knowledge, leakage, and residual map information in the store

**REC (three categories).**

| category | what it is | status |
|---|---|---|
| **local perception** | the current node's neighbours as candidates; recognising the goal when it is one of them | allowed |
| **experience-derived information** | transitions, rewards, penalties, signals, curiosity, goal-keyed Q, confidence, episodes, the episodic adjacency memory | allowed (the treatment) |
| **prohibited oracle access** | the four oracles | blocked |

**FACT (goal-specific terms).** These are the only goal-specific terms:
- For the goal candidate, `100·tc`: an episodic adjacency count of (current → goal) divided by 5.
- For every other candidate, the oracle gradient times `0.10 + 0.90·tc`. This is 0 with the map off.
- `driveGoalBoost` (4 when `goalGradientBoost > 0`).
- Goal-keyed Q.

Other goal-related paths carry no map information into decisions: embedding similarity to the goal is fixed at 0, goal attention is set only by a user click, node positions are used only for drawing, and semantic candidates are skipped while a goal is active.

**FACT (oracle leakage, five layers; unchanged).**
1. Content pins.
2. Executable static audit: 46 graph reads and 41 graph-name lines must equal two classified tables, line by line.
3. Per-session accounting, which voids the block. Map off: every oracle's executed count is 0 and every guard is reached. Map on: every oracle executes and none is blocked.
4. Gate-only body probes. Map off: every body count is 0. Map on: body count = executed count exactly.
5. A candidate-level check at the first decision (§7).

**FACT (residual map information in the store, new).** Blocking the oracle bodies does not show that the *store* holds no map knowledge. So the store was audited separately:
- The persisted store has eight components. Embeddings, positions and the semantic map are **not** persisted.
- Each session runs in its own process, with a cold localStorage asserted by the harness. The driver now refuses the harness's warm-store override.
- Traced on a development world, the stores are keyed by **lagged pairs**: the position two moves back → the current position. Example: `7->5` at graph distance 2, written right after the executed moves 7→8 and 8→5.

**REC (instrument I7).**
- Every relational entry of each T export must be a lag-1 or lag-2 pair of **T's own position sequence**, or a self pair of a visited node. This covers pair-keyed maps, transitions, the (pos, action) of goal-keyed Q, and episode node pairs.
- The check runs on every T before any test session. A failing world is excluded, and the analysis refuses a world without a passing check.

**FACT (development worlds 0–9; gate on worlds 1–2).**
- **0 off-trajectory entries** in 10 of 10 stores. Entries by class: lag 1 12,515; lag 2 2,559; self 224.
- Lag 2 is required: with lag 1 only, the real stores fail.
- The rule is non-vacuous: per world it excludes **111–153 of the 380 ordered node pairs**.
- Injecting an untraversed edge into transitions, an untraversed far pair into goal-keyed Q, every graph edge into signals, or an extra episode: each is flagged.

**FACT (limitation).**
- T visited all 20 nodes and executed **66–76 of the 78 directed edges**.
- **INF.** The store describes nothing T did not traverse. But in 20-node worlds experience covers most of the graph, so "experience" here includes a nearly complete, experience-learned record of the edges. Q can also learn distance-like values along traversed routes.
- That is allowed, but LEARN-0 **cannot distinguish** learning a map from experience from other uses of experience. It says nothing about larger graphs.

## 5. Cells and estimand

**REC.** For each world there are six sessions of 1,500 calls each:

| session | map | start | seed |
|---|---|---|---|
| T | off | cold | train seed; its export is the store |
| N0 | off | cold | test seed |
| **N1** | off | **full store, all 8 components** | test seed |
| N1E | off | episodes only | test seed |
| N1Q | off | Q only | test seed |
| O0 | on | cold | test seed |

- **Primary (sole).** E1 = E_w[Y(N1) − Y(N0)], where Y is legal goal reaches.
- **Scope.** E1 is the **total effect** of delivering the whole store at the start of a map-off session, compared with starting cold, under the same procedure and test seed. It is **not** the causal contribution of any component or mechanism. In development the components pulled in opposite directions: episodes +53.5, Q −48.0, full −18.5.
- **Store identity.** Per-component hashes are checked at the first call. The store is frozen before any test.
- **Pairing.** One test seed and one configuration per world.

## 6. Secondaries and the multiplicity policy

The secondaries are exploratory:

| id | what |
|---|---|
| S1 | non-graph resets and all resets |
| S2 | late-half minus early-half legal reaches |
| S3 | downhill rate of legal moves at true distance ≥ 2, against uniform chance |
| S4 | goal-entry share |
| S5 | O0 − N0, descriptive |
| S6 | the component contrasts |
| S7 | diagnostics |
| byGoal | within each goal |

**REC.**
- **28** unadjusted 95 % intervals are produced. The analysis counts them and the gate checks the count.
- **No secondary carries a label, changes E1's label, or is a confirmatory claim.** Revision 1's component margin labels were removed.
- With 28 intervals, about 1.4 are expected to exclude the true value by chance.
- A secondary pattern can only motivate a new preregistered study.

## 7. Candidate admission and the random stream

**FACT (gate, first decision of a development world).**
- Disabling `canReachGoal` admitted one extra candidate, at distance 4. The filter admits exactly the candidates within 3 edges.
- `drift = (liveRng()−0.5)·curiosity·0.06` is drawn once per scored candidate. So the extra candidate shifts every later random draw.
- Verified: shared candidates differ only in the three oracle terms and `drift`, and the map-off drift sequence is the map-on sequence plus one draw.

**INF (why N1 − N0 is not threatened).**
- N0 and N1 run the same map-off procedure with the same seed. The extra admissions and draw shifts belong to the procedure both arms receive, and E1 is defined under that procedure.
- Some of the store's effect may run through candidates that only the map-off procedure admits. That is part of the estimand, not a bias.
- The shared seed gives common random numbers only until the store makes the trajectories diverge. After that, the random paths differ; that costs precision, not bias, and the paired bootstrap over worlds absorbs it.
- A bias would need the procedure to differ between the arms. Instruments I1–I4 void any world where it does.

**REC.**
- Map-on contrasts (O0 − N0) stay descriptive: they bundle oracle terms, the removed filter and the shift.
- No N1-against-O0 contrast is computed.
- The intervention was not redesigned.

## 8. Margin, decision rule, sample size (independently verified)

**Method.**
- Paired percentile bootstrap: 10,000 resamples, 95 %.
- δ = 20 legal reaches. This is the programme margin, a judgment; sensitivity labels at 15 and 30 decide nothing.
- Decision rule:

| label | condition |
|---|---|
| LEARNS | CI lower ≥ δ |
| HARMS | CI upper ≤ −δ |
| NO_EFFECT | −δ < CI lower and CI upper < δ |
| INCONCLUSIVE | otherwise |

**FACT (verified).**
- Exact quantiles come from bisection on high-precision CDFs.
- The development SD was recomputed from the raw rows.
- The closed form was checked by Monte Carlo through the analysis's own bootstrap and decision rule, under a normal model and under the development data's own shape: 400 replications per cell, agreement within 0.051 (about 2 Monte Carlo standard errors).

| quantity | value |
|---|---|
| z0.975, z0.80 | 1.959964, 0.841621 |
| development E1 differences (30 worlds) | SD **107.54**, skewness −0.07, excess kurtosis −1.24 |
| SD 95 % interval | χ² (normal theory): **[85.64, 144.57]**; bootstrap: [86.34, 123.95] |
| 25 % inflation (SD 134.4) | = a **one-sided 93.2 %** upper confidence limit on the SD |
| rule n ≥ ((z0.975+z0.80)·SD/δ)² | 227 at 107.5; **355 at 134.4**; 411 at 144.57. Revision 1's "410" is corrected here. |
| **n = 360** (90 per goal, 2,160 sessions) | — |
| effect labelled LEARNS with probability 0.80 at n = 360 | 35.9 / **39.8** / 41.3 |

Label probabilities at SD 134.4 and n = 360 (LEARNS / HARMS / NO_EFFECT / INCONCL.):

| true E1 | probabilities |
|---|---|
| 0 | 0 / 0 / .61 / .39 |
| ±20 | directional .025, INCONCLUSIVE .95 |
| ±40 | directional .81, INCONCLUSIVE .19 |

**INF.** The rule targets effects **meaningfully larger than δ**, about 2δ. A true effect of exactly ±δ is INCONCLUSIVE with probability 0.95 **for every n**; this was verified for n = 180 to 1,440.

**REC.**
- **n = 360 is kept as a deliberately limited design.** It is the programme rule, with its inflation fixed before any outcome. The development *mean* was not used.
- Alternatives considered and **not adopted**:
  - n = 411, the rule at the χ² upper SD limit;
  - n = 475, 0.80 for NO_EFFECT at a true effect of 0, which is a different (equivalence) objective.
- Neither was judged by which result it would favour.

## 9. Development calibration

**FACT.** XFER-1 worlds 0–29, completed-study worlds; 180 sessions, all clean.

| contrast | value |
|---|---|
| E1 | −18.5 [−57.2, 18.3] |
| N1E − N0 | +53.5 [29.1, 76.4] |
| N1Q − N0 | −48.0 [−81.0, −12.9] |
| O0 − N0 | +128.7 [100.1, 157.6] |
| non-graph resets, N1 − N0 | +140.8 |

**REC.**
- The calibration was used for: the SD; adding the component cells, as exploratory secondaries; and the legal-move restriction of S3.
- It was not used for δ, for n beyond the SD, or for the primary contrast.

## 10. Worlds, exclusions, stopping, gate

**FACT and REC.**
- **Worlds.** Fresh stream indices **1672–2031**. They come after C′; 0–1391 belong to earlier studies. 90 worlds per goal. Seeds are fresh.
- **Configurations.** These are not generated until the freeze milestone.
- **Exclusion.** A world is excluded when a session still fails after one retry. It is also excluded **before its tests** when its store fails the construct or provenance check. Nothing is excluded for its outcomes. More than 10 % excluded makes the block INVALID.
- **Stopping.** Fixed n, no interim look.
- **Gate** (development worlds 0–3 only): **62 checks passed, 0 failed; 21 of 21 mutants caught.**
  - New in revision 2: sizing re-derivation, store provenance with four injection mutants, unlabelled secondaries, warm-store refusal, and an analysis mutant that removes the provenance check.
  - Bindings: decision `2009d7a2…`, design `6ce4fb4a…`, preregistration `b6a8008e…`.

## 11. Questions

1. **Map knowledge and store provenance.** Is the three-way split (local perception / experience / prohibited oracle access) correct? Is I7 (every store entry on T's own lag ≤ 2 trajectory) a sound, non-vacuous test against indirect map reconstruction? Is the coverage limitation (66–76 of 78 edges experienced) stated adequately, or does it undermine the question?
2. **Leakage.** Are the five oracle layers plus I7 enough to claim zero oracle access? Is anything misclassified?
3. **Random stream.** Is the argument in §7 correct, that the shared map-off procedure makes the admission and draw shifts part of the estimand rather than a bias in N1 − N0?
4. **Estimand.** Is "total effect of the whole store, not of any mechanism" the right framing for the sole primary? Is the multiplicity policy (28 unadjusted, exploratory, no labels, no claims) adequate?
5. **Sample size.** Is n = 360 defensible as a deliberately limited design, given the verified operating characteristics? Or should 411 or 475 be adopted before any outcome?
6. **Margin.** Is δ = 20 acceptable for this question, given that the rule targets effects of about 2δ?
7. **S3 and the non-graph resets.** Are the descriptive S3 (legal moves only; the chance rate is not a null) and the separately reported non-graph resets handled correctly?
8. **Claim limits.** Anything over-claimed or under-claimed, including "not map-free learning" and "not a component claim"?

## 12. Answer format

For each question, answer one of:
- `AGREE`
- `AGREE WITH CLAIM LIMIT: <text>`
- `OBJECT: <specific, minimal correction>`

Then give at most three numbered **required** corrections (what, why, how small). Then give one verdict: `PASS`, `PASS WITH CLAIM LIMITS`, `LIMITED CORRECTION` or `BLOCK`. Label anything that is not required `OPTIONAL`.
