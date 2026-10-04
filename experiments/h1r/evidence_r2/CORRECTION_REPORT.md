# H1-R conformance correction: implementation report

Date: 2026-10-04. Implementer: Claude. This report goes to the Research Director for review.

## Provenance and materials

**Build and repository**

| Item | Value |
|---|---|
| Base | B2 = `707cb1e`, blobs materialised with `git cat-file` |
| Transform | guarded transform, SHA-256 `33e4569595fd…` (matches `MANIFEST.json`) |
| Repository HEAD | `6b0fbc3`, with 0 tracked changes |
| Location of all work | untracked, under `experiments/h1r/` |

**Material used.** Only the historical G15 configurations were used: 41 accepted configurations from seeds 900030–900499, plus the pilot configuration 900000/0, all with agent seed 20260819000. No held-out seed (≥ 900500) and no confirmatory agent seed was touched.

**Not done.**
- H1-R was not run.
- No H1 outcome comparison was made.
- No preregistration was written.
- Nothing was committed or pushed.

---

## Implementation summary

The authorised items were completed:

- **A. canReachGoal.** The backtracking fix from `0f47d7b` is applied verbatim, as three guarded lines.
- **B. Q-KEY.** Every Q-learning write that runs in M7 is now filed under the actual transition S --A--> S′. The Q equation and all parameters are unchanged.
- **C. N2.** The trust semantics are clarified and validated: one traversal gives attempt = 1 and success ≤ 1.
- **D. Suites.** The conformance suite and all 25 existing gate scripts were re-run in three configurations: pristine, conformance OFF and conformance ON.

**Correctness invariants all hold:**
- 0 non-edge Q writes.
- 0 S/A mismatches.
- 0 S′ inconsistencies.
- 0 decision-trap states.
- s ≤ a at every trust snapshot.
- OFF is identical to B2.

**One genuine conflict remains.** It has a single root cause: B2 evaluates its whole learning block (self-loop gate, reward, prediction error, Q stash) *before* the single environment draw, so it works on the intended move. Its self-loop gate also reads the lagged previous position.

This has two measured consequences:
- **Return moves** never receive a Q update: 7.07% of executed edge actions, and the share differs by arm.
- **On a slip,** Q receives the reward computed for the intended move. For A1, 81.9% of slipped updates carry a positive reward.

Correcting this needs an interpretation of frozen §3.3 and §3.4, so I stopped rather than choose one. A ruling is required.

**H1-R STATUS: BLOCKED.**

---

## Exact changes

All edits are guarded by `globalThis.__H1R__ && globalThis.__H1R__.on`. With the runtime absent, the tree is identical to B2 (G1′ 21/21; existing gates identical, 25/25 scripts).

### New this round

**CRG-1 / CRG-2 / CRG-3**
- **Where:** `main.js`, inside `canReachGoal` → `dfs`, at three sites:
  - `if (!neuron) return false;`
  - `if (dfs(nextId, depth - 1)) return true;`
  - before `return false; // no path found`
- **Before (B2):** the shared `visited` set is never released, so a node explored in a failed branch is unavailable to its siblings. This gives 9 false negatives and 1 trap state.
- **After (H1R ON):** `visited.delete(currentId)` runs on every exit path, verbatim from `0f47d7b`.
- **Reason:** correctness. Combined with N1, the trap made state 3 / goal 16 undecidable.

**Q-KEY-stash (×2)**
- **Where:** `main.js`, the main TD `updateQ({` and the fallback `updateQ({`.
- **Before:** Q(`agentLast`, `next`) is written immediately, before the environment draw. `agentLast` is the previous tick's position, and `nextState` is the pre-move position.
- **After:** the unchanged argument object is stashed: reward, α, γ and diag.
- **Reason:** key attribution under §3.3.

**Q-KEY-apply**
- **Where:** `main.js`, after `_m7Traversed` is computed.
- **Before:** not present.
- **After:** the stash is applied as Q(S, A) on the same tick, after the outcome. S is the position the action was chosen from. A is the executed action. S′ is A on a success, S on a slip, or the goal on a goal reach.
- **Reason:** the realised next state enters Q-learning (§3.3).

**Q-KEY-explore**
- **Where:** `main.js`, D1 `recordAutonomousStep(prev, current, …)`.
- **Before:** the call runs before the draw with `prev` = the lagged `agentLast`. In B2 runs, 63.5% of these pairs were unrealised.
- **After:** the original call is suppressed. The step is recorded after the outcome as (`_m7From`, `next`), only when the move was traversed and was not a goal entry.
- **Reason:** explore-step learning records the real completed step.

**Q-KEY arrival**
- **Where:** `main.js`, after a traversal.
- **Before:** not present.
- **After:** `noteArrival(next)` maintains a window of the last 6 realised arrivals, the same size as `recentMemory`. The window is cleared at both episode boundaries.
- **Reason:** success episodes are built from realised arrivals.

**Q-KEY-success**
- **Where:** `main.js`, `recordAutonomousSuccess(recentMemory, …)`.
- **Before:** the episode is built from the window of attempted targets.
- **After:** `realizedWindow()`.
- **Reason:** success-episode and replay learning use realised pairs.

### Unchanged from the previous round (already reviewed)

N1-MASK, N1-MASK-SEM, N1-GUARD, N1-SEAL, N2 / N2-note, A3, A4-Q, A4-Q-decay, A4-T-decay, A4-T-credit, GOAL, P4-goal, P4-cap.

### Runtime and harness

**`runtime.mjs`.** Adds `stashQ`, `takeQ`, `noteQApply`, `noteArrival`, `realizedWindow` and the `qstats` counters. The runtime draws no random number. Its only state is the pending stash and the arrival window.

**Harness changes:**
- `run_one.mjs`: recorder for the Q-KEY counters and for realised-pair checks.
- `verify_hook.mjs`: anchor updated to the stash sites.
- `verify_conformance.mjs`:
  - new gates A7, A7b, A7c, A7d, A7-AV, S1–S5, T1, P1 and P2;
  - an `H1R_EVAL_ONLY` mode that re-evaluates saved runs;
  - a fix to S3 (my own bug, described below).

**Not changed:** no production file, topology, `T_SHIFT`, Beta prior, α, γ, decay, exploration parameter, seed or arm definition.

---

## Q-KEY correction

### Root cause (verified in code, not assumed)

B2 runs the learning block before two later statements:
- `agentLast = agentCurrent` (B2:4837);
- the single environment draw (B2:4889).

The update therefore wrote Q(previous-tick position, next). The state lags the action by one move, and the bootstrap state is the pre-move position.

Measured with the runtime off (B2, 9 runs):

| Writer | Mis-keyed or unrealised |
|---|---|
| Main TD updates | 11,442 / 26,172 non-edge keys (43.7%) |
| Explore-step pairs | 8,268 / 13,017 unrealised (63.5%) |
| Success-episode pairs | 4,029 / 8,643 unrealised (46.6%) |

### Correction

The correction is described under Exact changes. The following are unchanged:
- α: 0.1 × learning authority (pinned to 1.0), and 0.1 on the fallback path.
- γ = 0.9.
- Clamp ±20.
- Decay rates.

`qlearning.js` carries only the FROZEN choke point (gate S3).

### Evidence

287 main runs: 41 configurations × 7 arms × 3,005 ticks.

**Applied main TD updates: 761,398.**
- 111,536 of them are FROZEN calls, which are blocked at the choke point, so 649,862 are written.
- Real-edge keys: 761,398 (100%). Non-edge keys: 0 (0%).

**Consistency checks:**

| Check | Result |
|---|---|
| S/A mismatches | 0 |
| Origin mismatches | 0 |
| Stash overwritten | 0 |
| S′ inconsistencies | 0 (moved 395,396, stayed 308,407, goal 57,595) |

**Other writers:**
- Explore-step pairs unrealised: 0 / 438,988.
- Success-episode pairs unrealised: 0 / 205,748.
- Non-edge episode-transition writes: 0 / 670,419. Replay non-edge: 0.
- Self no-op re-executions skipped: 34,847. These have no action, so no update.

**Every Q writer inspected:**

| Writer | Status |
|---|---|
| Main TD | corrected |
| Explore-step, success episodes, replay (`_learnProcedural`) | corrected |
| Decay | key-agnostic |
| `dampQ` | lagged key, but never invoked: `run.js` `dampQAllowed()` returns `false` (frozen §10.3) |
| `pruneGoalWraparound` | bare-key prefix; a no-op on composite keys (pre-existing) |
| `Q.clear()` | UI reset only |

**The delayed-key problem is eliminated** for every Q writer that runs in M7. The coverage gap is reported under Remaining blockers.

---

## N2 trust validation

**Exact semantics used.** M7 credit is always on in H1-R. For every traversal attempt of a real edge:
- `attempts += 1`;
- `successes += 1` if and only if that traversal succeeded (E2 site).

The episode-level success writer is suppressed. FROZEN makes no trust write at all (A4-T).

**Evidence:**

| Gate | Result |
|---|---|
| B1 | keys with s > a: max 0, over 7,872 snapshots |
| B2 | trust range [0.0625, 0.9963] |
| B3 | store equals reconstruction from executed moves (decay mirrored), 0 mismatches; episode credits offered 168,741, applied 0 |
| B-AV (anti-vacuity, runtime off) | up to 63 keys with s > a |
| B-DIAG (attempt-gated diagnostic) | s > a in 41/41 runs, max trust 1.894 |

B-DIAG shows why the episode credit must stay suppressed.

**Remaining ambiguity:** none for §6.1. The reward side of §3.3 is a separate question, covered under Remaining blockers.

---

## canReachGoal correction

**Root cause.** The DFS uses a shared `visited` set with no release on exit, so nodes visited in a failed branch are lost to sibling branches.

**Provenance.** HEAD `0f47d7b` adds exactly three `visited.delete(currentId)` lines. Its base blob `113fa47` is B2's `main.js`, so the fix applies verbatim (gate S2: 3 guarded releases).

**Static check (gate S5).** Exhaustive over 20 states × goals {8, 12, 16, 19}, against BFS ground truth:

| Tree | False negatives | False positives | Trap states |
|---|---|---|---|
| B2 | 9 | 0 | 1 (state 3 / goal 16: every neighbour judged unreachable) |
| Conformed | 0 | 0 | 0 |

**Dynamic check: no-commit share of decision ticks (gate T1).** "Before" is the 84b4 tree on the same configurations.

| Arm | Goal 16 before → after |
|---|---|
| A1 | 41.9% → 0.7% |
| A2 | 44.6% → 0.8% |
| A3 RANDOM | 74.9% → 0.1% |
| A4 | 47.0% → 1.0% |
| A5 | 40.2% → 0.9% |
| A6 | 44.9% → 0.8% |
| A7 | 46.3% → 1.0% |

For the other goals, the share was at most 2.9% before and at most 1.2% after. Pooled per arm after the fix: 0.21%–1.00% (C-INFO).

**RANDOM at goal 16.** The admission filter runs before the A3 draw, so before the fix the trap also blocked uniform choice. A3 is still uniform over graph neighbours: χ² p = 0.517, 0 non-neighbour picks.

**N1 re-checked after the fix:**
- 0 NONEDGE moves over 761,728 edge attempts.
- 0 N1-GUARD firings.
- 0 non-edge trust keys.

---

## Conformance results

424 runs, 0 errors.

**First pass: 40 PASS / 2 FAIL / 1 CONFLICT / 2 INFO.** One of the two FAILs, S3, was a bug in my own gate: the regex `/H1R/` also matched `__H1R__`. I fixed it to count the `// H1R` tag. I also added gate P2 (the Phase-8 requirement).

**Re-evaluated on the saved runs, no re-execution: 42 PASS / 1 FAIL / 1 CONFLICT / 2 INFO.**
- FAIL: P1.
- CONFLICT: A7d.
- INFO: B-DIAG and C-INFO.

The first-pass outputs are kept as `*.firstpass.*`.

**P1 FAIL (857/861 distinct).** A2 and A5 produce identical fingerprints in 4 of 41 configurations: 900177/2, 900211/0, 900211/1 and 900211/2. In those configurations the aggregate route never changes a decision within 3,000 ticks.

The Phase-8 requirement (P2: BELIEF, ABLATION, RANDOM and FROZEN pairwise distinct) passes 246/246. A1 differs from A5 in 41/41 configurations and from A6 in 41/41.

---

## Historical regression results

All 25 existing gate scripts were run (14 M7, 11 Phase-1.0), using each tree's own B2 copies of the scripts.

| Configuration | Result |
|---|---|
| Pristine B2 | 619 PASS / 1 FAIL (S1b S1.7, historical) |
| Conformance OFF | 619 PASS / 1 FAIL; identical to pristine in every script (pass counts and failing ids) |
| Conformance ON | 600 PASS / 20 FAIL |

Classification of the 20 failures with conformance ON:

| Script (84b4 tree → this tree) | Failing ids | Class | Cause (measured) |
|---|---|---|---|
| verify_cap (42/0 → 38/4) | B1, B3, B4 | historical-test expectation | The section-B fixture assumes the goal is reached before 150 ticks on one pinned trajectory (boot driver, goal 8). Under H1R that trajectory enters a habit cycle (see Scientific impact) and reaches the goal once in 1,005 steps. The cap therefore legitimately fires, and armed ≠ disarmed. The cap mechanics themselves all pass (C1–C7, D1–D4, E1–E3, F1–F2, G1–G3, H1–H4, H6–H12). |
| verify_cap | H5 | measurement issue | The anti-vacuity check counts only *closed* episodes. Under H1R the un-armed 1,200-tick run has a single episode that stays open for all 1,200 ticks (8× the cap). The violation is present but not counted. |
| verify_stepledger (28/1 → 22/7) | B1, B2, B3, C2, C3, D1 | historical-test expectation | Records are inspected only at goal-reach samples. The 600-tick pilot fixture (900000/0) contains 0 goal reaches under H1R, although 605 ledger writes occur. Both edits contribute: on A1 the fixture has 1 goal reach without CRG and 9 without Q-KEY. |
| verify_stepledger | A3 | intentional conformance difference | The GOAL edit means eligibility is no longer read, so the ledger cannot change the outcome. This already failed on the 84b4 tree. |
| verify_e5 (30/0 → 29/1) | 5c | historical-test expectation | Assumes pinned qSum > unpinned qSum. Under correct keying the main TD update is net-negative on many real-step keys, and the dominant positive writer (explore-step learning) is not scaled by authority. The pin's isolated effect is still verified by 5d (pass). |
| verify_e3e4 (32/4 → 34/2) | I.3b, I.3c | measurement issue | An 80-tick, no-env, no-credit sensitivity probe. A5/A6 do deliver altered per-edge trust (2,632 and 2,757 differing calls; I.2 passes), but no decision flips within 80 ticks. At full length A1 ≠ A5 and A1 ≠ A6 in 41/41 configurations. |
| verify_goal (23/3 → 24/2) | B2, B3 | historical-test expectation | Bit-identity pins to the pre-seam B2 trajectory. They pass OFF. C2 now passes. |
| verify_G15 (22/2 → 22/2) | C2, C3 | intentional conformance difference | Flat +12, eligibility not read. G15′ (structural) passes in the conformance suite. |
| verify_S2 (13/1 → 13/1) | S2.4b | intentional conformance difference | The fixture is a non-edge 8→16 transition, which N1 masks. |
| verify_S1b (3/1 → 3/1) | S1.7 | historical; also fails in pristine B2 | Not caused by H1R. |

**Real regressions found: none.**

---

## Determinism

| Check | Result |
|---|---|
| G1′: OFF ≡ B2 (fingerprint and cognitive draw count) | 21/21 pairs |
| H1: repeated ON runs identical | 21/21 |
| H2: recorder is neutral | 21/21 |
| Existing `verify_determinism` with ON | 29/0 |
| Existing G8, G10 with ON | pass |
| Eval-only re-evaluation of saved runs | reproduces every first-pass verdict, except the S3 fix and the new P2 |

The boot-driver trajectory depends on module import order: `episodicContextEngine` draws `liveRng()` when it loads. Each ordering is deterministic. This is pre-existing and affects only the boot-driver fixtures.

---

## Scientific impact

**The H1 question is unchanged.** The corrections remove artefacts:
- non-edge movement and learning;
- decision traps;
- mis-attributed Q;
- duplicate trust success.

**The learner now differs materially from the B2 learner** that the G15, pilot and characterization numbers came from. B2-era behavioural figures should not be carried over into H1-R planning.

**The habit-cycle mechanism is real, but it is not a defect.** Explore-step learning writes Q(from → to) with a positive reward, 8·gain, on every completed step, independent of the goal. The rule is unchanged from B2, where it ran at a similar volume per run (about 1,446 vs about 1,497) but with 63.5% of its writes on unrealised pairs. Filed under real steps, it can lock a trajectory into a cycle. Example, the verify_cap fixture, cycle 4→3→2→1→4, contributions to Q on the cycle edges:

| Writer | Contribution |
|---|---|
| Explore-step learning | +35 to +42 |
| Main TD | −11 to −20 |
| Decay | about −8 |

This lock-in was the cause of the cap and stepledger fixture failures. It applies equally to every arm whose policy reads Q.

**The open conflict bears directly on F-11** (whether the environment rewards reliability knowledge) **and on the primary metric** (mean return per 100 ticks, which sums `rewardSignal`):
- If a slip pays the intended move's reward, unreliability costs the agent little reward.
- The return-move gap differs by arm (4.68%–14.77%), which is a potential confound in the learned Q.

**A5 vs A2.** The aggregate route alone is behaviourally inert in 4 of 41 configurations, so the A5 contrast is weaker. This is a note for the Director, not a blocker.

---

## Remaining blockers

### B-1: the learning block is evaluated on the intended move, before the draw

**Class:** scientific-design issue, with correctness implications. A ruling is required. This is one root cause with two consequences.

**(i) Coverage gap (gate A7d).** The self-loop gate `agentLast !== next` (B2:3831) reads the lagged position. A move back to the previous node therefore runs no learning block at all: no reward, no prediction error, no Q update.
- 57,925 of 819,323 executed edge actions are affected (7.07%).
- Per arm: A1 6.37%, A2 4.68%, A3 14.77%, A4 4.74%, A5 6.08%, A6 6.59%, A7 6.30%.
- 99.5% of the affected actions are return moves, and no return move is ever updated.

*Correction to my previous report:* the dormant "repeated same path" −2 (and the −0.3 repetition term) would not reach Q if the gate were fixed. The goal/similarity chain below them always assigns `rewardSignal` and overwrites both.

**(ii) Slip reward (frozen §3.3, binding gate G14; §3.4).** On a slip, the applied reward is the one computed for the intended move:
- `sim(current, next)` > 0.45 gives +2;
- `sim(current, next)` > 0.15 gives +0.3;
- otherwise −0.4.

Measured for A1, pooled over the 41 configurations × 3,000 ticks:

| Outcome | Q updates | Reward breakdown |
|---|---|---|
| Slipped | 45,928 | 28,262 at +2, 9,343 at +0.3, 8,323 at −0.4 (81.9% positive) |
| Moved | 56,074 | 28,520 at +2, 14,485 at +0.3, 13,069 at −0.4 |
| Goal | 7,684 | all +12 |

So a slipped attempt earns exactly what a success earns. Frozen §3.3 says the realised node enters "reward computation and prediction error", and §3.4 says unreliability costs the agent only elapsed ticks.

**Why I stopped.** A conformant fix has to decide what a non-move earns. That is an interpretation, and the instruction was to stop and report rather than choose one silently.

**Options for the ruling:**
- **R1 (recommended).**
  - Take the single environment draw *before* the learning block. It is still exactly one draw per decision, with the same stream and the same (u, v).
  - Evaluate the unchanged learning block on the realised transition, using the true pre-move position.
  - **On a success:** the same rules apply to u→v, and return moves are included.
  - **On a slip:** the realised transition is u→u, so the existing self-loop guard skips learning: no reward, no prediction error, no Q update. The intended edge still receives its trust attempt (E2). This uses no new reward code and satisfies §3.3 and §3.4 literally.
- **R2.** On a slip, update Q(u, v) with S′ = u and a new reward value, for example 0. Not recommended, because it introduces new reward semantics.
- **R3.** Accept the current behaviour through an erratum. Not recommended, because the gap is arm-differential and bears on F-11.

### Non-blocking items

Each is classified in the regression table above:
- P1: measurement issue. My own criterion was stricter than Phase 8; P2 passes.
- `experiments/h1r/evidence/` is stale (transform bf3ff). My deletion was blocked by a safety check; please delete it yourself.

---

## H1-R status

**BLOCKED**

---

## Commit readiness

Not committed and not pushed.

The work is technically ready for Research Director review. The authorised items are verification-complete.

`evidence_r2/diagnostics/` contains scratch probes with absolute local paths. They are reproducibility aids and are not intended for commit.

---

## Self-audit

1. **Every Q writer inspected?** Yes. See the writer table under Q-KEY correction.
2. **State/action timing verified rather than assumed?** Yes. A7 showed 0 S/A and 0 origin mismatches; A7b showed 0 S′ inconsistencies. The B2 lag was measured with the runtime off (A7-AV).
3. **Q mathematics altered?** No. The apply passes the original reward, α and γ; `qlearning.js` carries only the A4 choke point (S1, S3).
4. **Every candidate-generating path inspected?** Yes:
   - the memory/neighbour loop (N1-MASK);
   - the semantic loop (N1-MASK-SEM);
   - `structureMap` (neighbours by construction);
   - A3 (uniform over neighbours);
   - replay re-execution (a self no-op).

   N1-GUARD fired 0 times.
5. **N1 re-checked after the canReachGoal fix?** Yes: 0 NONEDGE moves, 0 guard firings, 0 non-edge trust keys.
6. **Duplicate trust success credit impossible?** Yes. B1 (s ≤ a everywhere) and B3 (0 reconstruction mismatches, 0 episode credits applied).
7. **RNG stream separation preserved?** Yes. CRG and Q-KEY draw nothing. A3 makes one cognitive draw (C1, C2). G1′ holds. The existing env, M7 and determinism gates pass with ON.
8. **Environment randomness changed?** No. The draw site and stream are unchanged; there is one draw per decision.
9. **Topology or parameters changed?** No. Only 3 code files are transformed (`MANIFEST.json`), and no data or configuration file is touched.
10. **OFF identical to pristine?** Yes: G1′ 21/21, and 25/25 scripts identical.
11. **Intentional gate failures distinguished from regressions?** Yes. Each failure was traced to its cause with probes, not inferred. Two of my own readings were overturned along the way:
    - **Oscillation trap.** I hypothesised that the agent was stuck in return-move oscillation. Measurement refuted it: return-move share 6.9%, longest streak 3.
    - **65 goal reaches.** One probe showed 65 goal reaches in the cap scenario, which contradicted the gate. That probe lacked verify_cap's import of `episodicContextEngine` before `boot()`, an import that shifts the cognitive RNG stream. Reproduced in the gate's exact order, the agent settles into a habit cycle and reaches the goal once. Q attribution then showed explore-step learning sustaining the cycle.
12. **RANDOM and FROZEN still genuinely different?** Yes. P2 246/246. C3: RANDOM is uniform and BELIEF is not. D1–D3: FROZEN writes nothing; D-AV confirms.
13. **H1 outcomes exposed or analysed?** Disclosure: my first isolation probe printed goal-reach counts for A1, A2 and A3 on the pilot configuration (900000/0, 600 ticks). I did not use, compare or report them. After that, diagnostics were restricted to A1 or to boot-driver runs with no arm, and the saved probe was edited to A1 only. The per-arm figures in this report are mechanism quantities (no-commit share, coverage gap), not outcomes.
14. **Historical-build contamination?** The "before" figures for T1 come from the 84b4 tree, which has the same B2 base and the same seeds. Only no-commit shares are compared. The existing gates use each tree's own B2 copies, not HEAD.
15. **Remaining measurable confounds?** The two that could be measured now were measured:
    - the return-move gap per arm;
    - the slip-reward share, pooled for A1.

    Both feed B-1. The slip-reward path is structural and shared by every arm, so measuring it per arm would not change the conclusion.

---

## Next optimised decision

**One ruling from the Research Director on B-1**, the realised-transition learning block. I recommend option R1.

After that ruling:
- I implement it as a single guarded edit: relocate the existing draw, and de-lag the guard under H1R.
- I add a slip gate: slipped ticks carry no reward, no prediction error and no Q update.
- I re-run the same suites, about 15 minutes of compute.
- A7d is expected to become a PASS.
- The tree then goes to the Director for the freeze decision.

This is the only open item: A7d and the slip-reward conflict both resolve with this one ruling.
