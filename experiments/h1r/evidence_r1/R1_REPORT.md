# R1 — Realised-outcome learning order: implementation report

**Date:** 2026-10-04. **Implementer:** Claude. **Authority:** Research Director ruling "R1 AUTHORIZED".

**Build and repository**

| Item | Value |
|---|---|
| Base | B2 = `707cb1e` |
| Transform | guarded, SHA-256 `e24f6057d77b…` |
| Repository HEAD before the milestone | `6b0fbc3` |

**Material:** only the 41 historical G15 configurations (seeds 900030–900499), plus the pilot configuration 900000/0, with agent seed 20260819000. One existing gate (`verify_cap`) uses its own pinned verification seed, 20260819002. No held-out seed and no confirmatory seed was used.

**Not done:** H1-R was not run, no H1 outcome comparison was made, and no preregistration was written.

---

## R1 implementation summary

**The change.** The decision's single environment draw now happens *before* B2's self-learning section. That section then reads the transition that actually occurred:
- **from** = the decision position;
- **to** = the realised node.

Afterwards, the existing E1′ traversal block performs the move, and E2 credits the intended edge.

**What is unchanged:** learning rules, reward constants, the Q equation, α, γ, decay, topology, `T_SHIFT`, the Beta prior, seeds and arms.

**What R1 supersedes.** The four Q-KEY stash/apply edits of the previous round are removed. Once the section runs on the realised transition, B2's own `updateQ`, `recordAutonomousStep` and `recordAutonomousSuccess` calls already receive the correct (S, A, S′).

**Results:**
- Every R1 gate passes, including anti-vacuity against both B2 order and an R1-VIEW mutant.
- The previous round's blocker B-1 is resolved:
  - the return-move coverage gap goes from 7.07% to 0%: 71,736/71,736 return moves learned;
  - slip-tick Q updates go from 81.9% positive to none at all: 0 updates on 320,383 slip ticks.

## Semantic determination (made before implementing, from the frozen text)

**Frozen text relied on:**
- §3.3 (binding): on a slip, the realised node u "enters agentCurrent, Q-learning, reward computation and prediction error". The intended edge receives the trust attempt.
- §3.4: `rewardSignal` is computed by the existing rules on the realised transition, with "no new reward branch, no slip penalty". Unreliability costs "only elapsed ticks".
- The existing code: the self-learning section opens with a guard commented "prevents corrupt self-loop learning" (`agentLast !== next`). The section is written in post-move terms: `prev = agentLast // where we were before`, `current = next // where we moved now`, and Q uses (`agentLast`, `next`, `agentCurrent`).

**What learning receives in each case:**

| Case | Realised transition | What learning receives |
|---|---|---|
| A. Success | u → v | The full existing section on u → v: reward `sim(u, v)` (or +12 at the goal), PE with actual = v, Q(u, v) with S′ = v, and every store keyed u → v. Return moves included. Then the trust attempt and success on u → v. |
| B. Slip | u → u | The existing entry guard excludes self-transitions, so there is no reward, no PE and no Q update. The tick is spent, which is the §3.4 cost model and is restated by ERR-05 E1′. The realised node u stays `agentCurrent` and is the from-state of the next learning event. The intended edge u → v receives the trust attempt and no success. |
| C. Goal | u → goal | Goal-entering moves take no environment draw. This is pre-existing, and R1 forbids adding draws. The move is realised and learns as in A, with the flat +12 and S′ = goal; then the existing reset runs. |

**Why B is the only reading that uses existing rules alone.** Applied literally to a non-move, the reward rules would give `sim(u, u) = 1`, which is +2. That contradicts §3.4. Any other value, including 0, would be a new reward branch, and §3.4 forbids new branches. The section's own self-loop guard is the existing rule for self-transitions.

**Surfaced for the Director (explained; not blocking R1):**

1. **ERR-05 §3.1** (Director ruling, 2026-08-20) states that Q-learning, prediction error and reward run "unchanged on both outcomes". R1 deliberately supersedes that sentence. The supersession must be recorded as an erratum in the H1-R preregistration.
2. **Design premises not met.**
   - §10.1 assumes Q absorbs `p_e` through slipped steps "at step cost". B2's reward rules have no step cost, and B2 paid slips the intended reward. Under R1 a slip is not a learning event, so Q absorbs `p_e` only indirectly (through decay, and through episode and success composition).
   - §10.2 assumes slips raise `compositeError`. In B2, state-PE is 0 by construction (`predictedNextId = actualNextId = lastReasoning.to`), and PE was evaluated on the intended move. Under R1 slips are not evaluated. The pins (learning authority 1.0, `dampQ` off) are unchanged.

   Neither premise is a semantic rule. Both describe the design rationale, and neither held in B2 as built.

---

## Root cause

B2's `runAgent` order is:
1. decision (`next = lastReasoning.to`);
2. the self-learning section, which contains the guard, reward, emotion, PE, Q, transition uncertainty, curiosity, recent memory, success episode, goal reset and the D1 explore step;
3. `agentLast = agentCurrent`;
4. the single environment draw (E1);
5. E2 credit;
6. the traversal block.

The section therefore learned from the **intended** move before its outcome was known, and its guard compared `next` with a `agentLast` that still held the previous tick's position. This had three consequences:
- **Slips were learned as if completed.** In the previous round (A1, 41 configurations): 45,928 slip updates, 81.9% of them with positive reward.
- **Return moves were never learned:** 7.07% of executed edge actions.
- **Lagged keys** went into curiosity, `rewards`, `penalties`, `transitions`, emotion and transition uncertainty.

---

## Exact change

All edits are in `conformance_transform.mjs` on `main.js` and guarded by `globalThis.__H1R__ && globalThis.__H1R__.on`. All anchors are exact and refuse to build on mismatch.

| Tag | Location | Before (B2) | After (H1R on) |
|---|---|---|---|
| R1-DRAW-EARLY | Immediately above the self-learning guard (which must have its exact shape and the SAFE SELF LEARNING header) | No draw here | `_h1rTrav = (next !== null && next is not the goal && __M7_ENV__) ? __M7_ENV__.attempt(agentCurrent, next) : true`. This is the same call, arguments, exclusions and stream as E1. `noteR1(...)` records it. |
| R1-VIEW | Same place | — | `agentLast = agentCurrent`. On success, `agentCurrent = next`; on a slip, `next = agentCurrent` (the realised node). |
| R1-RESTORE | Before `agentLast = agentCurrent; // store current as "previous"` (verified to follow the section's closing brace) | — | `agentCurrent = u` unless the goal reset ran, and `next =` the intended v. The E1′ traversal block then performs the move, and E2 credits u → v. |
| R1-DRAW | E1 site | `(next !== null && !_goalResetJustHappened && _m7env) ? _m7env.attempt(_m7From, _m7To) : true` | `(H1R) ? _h1rTrav : (unchanged expression)`. No second draw. |
| Q-KEY ×4 | — | (previous round) | **Removed**: B2's original `updateQ` ×2, D1 explore call and `recordAutonomousSuccess(recentMemory, …)` are restored verbatim. |

**Other files:**
- `runtime.mjs`: Q-KEY stash machinery removed; `noteR1` / `r1stats` added. It records only and draws nothing.
- `verify_hook.mjs`, insert-only: a `learn` hook at section entry, an `explore` hook, and a `goal` hook that reads `agentLast` when the runtime is on.
- `run_one.mjs`: per-tick resolution of every learning write against that tick's realised transition, plus per-tick accounting of environment draws.
- `verify_conformance.mjs`: gates R1a–R1e, R1-INFO, R1-AV (with an R1-VIEW mutant), F2′, G15′(9.4) and P3. S1 now checks R1 structure. Tree paths are written relative to the temp directory.
- `README.md`.

---

## RNG validation

**Architecture, verified in code before editing:**
- `env.attempt(u, v)` draws `liveRng('environment')` only for a real graph edge. Self moves and non-edges return `true` with no draw.
- No other agent code reads the environment stream.
- `run.js` calls `env.setTick()` between agent ticks, so the phase is fixed within a tick.
- B2's E1 arguments are (`agentLast` synced to `agentCurrent`, `next`). Neither changes between the decision and E1, except by the goal reset, and goal-entering moves take no draw.

So moving the call earlier within the same tick leaves the environment draw sequence unchanged by construction.

**Gate R1e:**
- Draws: 756,668, equal to edge-attempt decisions, 756,668 (436,285 moves + 320,383 slips).
- Per-tick mismatches: 0. Maximum draws in any tick: 1. Goal-entry draws: 0.
- The environment stream's own counter reads 756,668.

**Existing gates with conformance ON:**
- e1e2: G2a–G2c (RNG isolation) and AV7 (rejects two draws per decision) pass.
- `verify_env` 54/0, `verify_M7` 49/0, `verify_determinism` 29/0.

The cognitive and visual streams are untouched: R1 adds no cognitive draw.

---

## Realised-outcome validation

Every learning write in a tick is resolved against that tick's realised transition, over 287 main runs (41 configurations × 7 arms × 3,005 ticks).

| Gate | Result |
|---|---|
| R1b: no learning from an unrealised transition | Learning-section entries on slip, self or no-decision ticks: 0/498,388. `transitions` writes unrealised: 0/498,388. Explore-step pairs unrealised: 0/436,285. Success-episode pairs unrealised: 0/193,101. |
| R1c: coverage | Every realised move (436,285) and goal entry (62,103) gets exactly one learning pass and one main Q update: missing 0, duplicates 0. **Return moves: 71,736/71,736.** Per arm: A1 9,047/9,047, A2 7,447/7,447, A3 20,993/20,993, A4 8,347/8,347, A5 7,247/7,247, A6 9,528/9,528, A7 9,127/9,127. |
| R1d: a slip gets no reward and no update | Slip ticks: 320,383. Q updates on slip ticks: 0, of which positive: 0. |
| R1-INFO: reward by realised outcome (existing rules) | Moves: +2 ×204,885, +0.3 ×123,133, −0.4 ×108,267. Goal: +12 ×62,103. Slip: none. |
| R1-AV: anti-vacuity | The measurements do catch both defects. **B2 order (runtime off):** 7,779 Q updates on slip ticks (6,114 positive), 13,062 mismatched keys, 204/645 return moves covered. **R1-VIEW mutant:** 3,422 on slip ticks, 4,815 mismatched, 133/373 covered. Both draw exactly once per decision. |

---

## Q-learning validation

**R1a** covers every main TD update: 498,388 updates. FROZEN calls are included; they are blocked at the choke point.

| Measured for each update | Result |
|---|---|
| Intended action | from the E1 hook |
| Realised outcome | from the E1 / goal hooks |
| Q key S = decision position | 0 mismatches |
| A = realised node | 0 mismatches |
| S′ = the realised node (or the goal) | 0 mismatches |
| Reward | tallied above |
| Non-edge keys | 0 |
| Updates on unrealised ticks | 0 |

**Q-key correctness: 100%.** No equation or parameter changed: the original call sites are restored verbatim, and `qlearning.js` carries only the FROZEN choke point (S3).

**Every other Q writer:**
- Explore-step and success-episode learning: realised pairs only (R1b).
- Replay: non-edge pairs 0 (A3).
- Decay: key-agnostic.
- `dampQ`: never invoked, because `dampQAllowed()` returns `false` (frozen §10.3).

---

## N2 / N1 / RANDOM / FROZEN / P4 regression

| Item | Result |
|---|---|
| **N1** | 0 NONEDGE moves over 756,668 edge attempts (A1). 0 non-edge transitions or episode pairs (A2, A3). 0 non-edge trust keys (A4). 62,103/62,103 goal reaches canonical (A5). 0 N1-GUARD firings (A6). |
| **N2** | s ≤ a at all 7,872 snapshots (B1). Trust in [0.0556, 0.9965] (B2). Store equals the reconstruction from moves, 0 mismatches; episode credits offered 160,950, applied 0 (B3). Anti-vacuity: up to 63 keys with s > a with the runtime off (B-AV). |
| **RANDOM** | Wired in 41/41 runs (C1); 113,357 uniform decisions. Distinct from BELIEF in 41/41 (C2). Uniform: χ² = 61.0, df = 58, p = 0.369, 0 non-neighbour picks; argmax share 0.257 vs 0.259 expected (C3). |
| **FROZEN** | Q unchanged (D1). Trust unchanged (D2). Policy still runs: 113,280 decisions, 1,681,362 E3 reads (D3). Anti-vacuity (D-AV). |
| **P4** | 0 stale post-reset moves or goal reaches over 63,092 resets (E1, E2). E-AV detects 387 with the runtime off. |
| **canReachGoal** | FN 0, FP 0, traps 0 (B2: FN 9, trap 3/goal 16) (S5). Worst no-commit share per arm and goal: 1.4% (T1; goal 16 was 40–75% on the first tree). |
| **Arms distinct** | BELIEF, ABLATION, RANDOM and FROZEN are pairwise distinct in 246/246 (P2). Every manipulated arm differs from BELIEF in 246/246 (P3). |

---

## Full conformance results

427 runs, 0 errors, 713 s.

**First pass: 42 PASS / 3 FAIL / 3 INFO.** It is preserved as `conformance_gates.firstpass.json` and `conformance_run.firstpass.log`.

Three gates were then added, defined from the frozen text: F2′, G15′(9.4) and P3. The saved runs were re-evaluated without executing anything.

**Final: 45 PASS / 3 FAIL / 0 CONFLICT / 3 INFO.** The three remaining FAILs:

**F2 FAIL, and G15′ FAIL because it composes F2.** F2, as I declared it, required at least one goal reach in every run. Four of 287 runs reached no goal: every episode ended at the cap, while moves were normal. Frozen §9.4 states: "Agent never reaches goal in a run → **Included.** That is signal, not failure." So F2's per-run requirement contradicts the frozen design.

The G15′ property itself holds: 62,103/62,103 goal reaches carry exactly one +12 update (F1). F2′ (eligibility rate 1 in every run where it is defined) passes, and so does G15′(9.4). F2 and G15′ are kept exactly as declared, not weakened.

**Class:** measurement problem in my own gate, plus a scientific-design note.

Diagnosis of the four runs, a mechanism check on one of them:
- The goal was an admissible candidate at **76/76** decisions taken next to the goal.
- It ranked 2nd–6th, with mean weight −4.1 against the best candidate's 32.4.
- ε was about 0.095 over about 5.4 candidates. The chance of exploration never picking the goal in 76 tries is about 0.26.

So nothing blocks the goal. Under R1, the stores that selection reads (`rewards`, curiosity, `transitions`, emotion, semantic edges) are keyed on real edges for the first time, and in some runs they entrench habits before the goal is first found. I don't report the arm labels of these four runs and made no comparison.

**P1 FAIL** (851/861 distinct). A2 (ABLATION) and A5 (AGGREGATE-ONLY) produce identical runs in 10 of 41 configurations: their only difference, the E4 aggregate route, never changes a decision. This is pre-existing: 11/41 on the first tree and 4/41 on the Q-KEY tree. Every other pair is distinct everywhere, and P2 and P3 pass.

**Class:** scientific-design issue for the Director. The A5 contrast is weak.

**INFO:** R1-INFO, B-DIAG (the attempt-gated variant gives s > a in 38/41 runs, which is why it stays diagnostic only), and C-INFO (no-commit share 0.19–1.06% per arm).

---

## Historical gate results

All 25 scripts were run in pristine B2, conformance OFF and conformance ON.

| Configuration | Result |
|---|---|
| Pristine | 619 PASS / 1 FAIL (S1b S1.7, a historical failure) |
| Conformance OFF | 619 / 1, identical to pristine in every script (pass counts and failing ids) |
| Conformance ON | 607 PASS / 13 FAIL |

The previous (Q-KEY) round was 600/20.

**Resolved by R1:** e3e4 I.3b and I.3c, e5 5c, stepledger B1–D1, and G15 C3.

**Classification of the 13 failures with conformance ON:**

| Gate | Class | Cause |
|---|---|---|
| e1e2 G1f, AV8b | intentional conformance difference | These assert that an M7-**off** run keeps the historical off-by-one in legacy trust keys (ERR-05 §4). The ON harness preloads the H1R runtime into every process, M7-off runs included. The legacy `recordAttempt` call sits inside the self-learning section, so R1 de-lags it too: 0/34 keys are non-edges. With the runtime absent (OFF), e1e2 passes 32/0. H1-R never combines the runtime with M7 off. |
| G8 G8.4c | obsolete historical expectation | It asserts that B2 has executed selection steps that produce no learning step (> 0). G8 boots the agent with no environment and no goal, so slips are impossible, and the count came from the lagged-guard gap R1 removes. The accounting identities G8.4a, 4b and 4d pass. |
| cap H7 | measurement problem | "Longest episode 151 ≤ 150". The gate equates the gap between boundary indices with episode length. Its telemetry step comes **before** the cap block in `runAgent`, so a cap boundary is observed one call later than a goal boundary. A goal-started episode then measures 151, although the counter enforces exactly 150 ticks: the goal call's increment happens before the reset, so calls g+1 … g+150 are counted and the cap fires at the top of g+151. The traced R1 run has one goal→cap episode, which measures 151; start→cap measures 150. B2's fixture trajectory contained no goal→cap episode, and gate A5 only tests cap→cap. |
| cap B1, B3, B4 | obsolete historical expectation | Section B assumes the goal is reached before 150 ticks on one pinned boot trajectory (goal 8). Under H1R the cap legitimately fires there: 38 boundaries armed vs 8 disarmed. The cap's mechanics (C, D, E, F, G, H1–H6, H8–H12) pass. |
| goal B2, B3 | obsolete historical expectation | Bit-identity pins to the pre-seam B2 trajectory; they pass OFF. |
| stepledger A3 | intentional conformance difference | GOAL makes every reach pay +12, so the ledger has no lever on the outcome. It also failed on both earlier trees. |
| G15 C2 | intentional conformance difference | Eligibility is not read (flat +12). Replaced by G15′. |
| S2 S2.4b | intentional conformance difference | Its fixture is a non-edge 8→16 transition, which N1 masks. |
| S1b S1.7 | historical | Also fails in pristine B2. |

**Correctness blockers found: none.**

---

## Determinism

| Check | Result |
|---|---|
| H1: repeated ON runs identical (fingerprint and cognitive draws) | 21/21 |
| H2: recorder neutral | 21/21 |
| G1′: OFF ≡ B2 | 21/21 |
| Existing `verify_determinism` with ON | 29/0 |
| Existing G10 with ON | 38/0 |
| Re-evaluation of the saved runs | reproduces every verdict and evidence string exactly (51/51) |

---

## Remaining blockers

**None that are correctness blockers.**

Inputs for the Director's freeze decision, not blocking R1:
1. **ERR-05 §3.1** is superseded by R1 and must be recorded as an erratum. *Scientific-design / documentation.*
2. **Design premises.** §10.1 (Q absorbs `p_e` through slips) and §10.2 (slips raise `compositeError`) are not met. They were not met in B2 either. *Scientific-design.*
3. **A5 vs A2** are identical in 10/41 configurations (P1). *Scientific-design.*
4. **Runs with no goal reach:** 4 of 287, from habit entrenchment under realised-edge learning stores. Included per §9.4. *Scientific-design note.*
5. **Goal-entering moves take no environment draw.** This is pre-existing and preserved, because R1 forbids adding draws. *Intentional conformance difference / pre-existing.*

**Evidence hygiene.** The local temp-directory prefix, which contains the machine account name, is redacted to `<tmp>` in `evidence_final/`, `evidence_r2/` and `evidence_r1/`:
- 1,292 exact replacements;
- every JSON file still parses;
- re-evaluation is identical.

The verifier now writes temp-relative paths itself.

---

## H1-R status

**READY FOR RESEARCH-DIRECTOR FREEZE.** H1-R has not been run.

---

## Commit, push and final git state

A commit cannot contain its own hash, so the commit hash, push result and final `git status` are reported in the hand-off message.

**Commit scope:**
- the instrument: `README.md`, `build_tree.mjs`, `conformance_transform.mjs`, `runtime.mjs`, `run_one.mjs`, `verify_hook.mjs`, `verify_conformance.mjs`, `run_existing_gates.mjs`;
- its evidence lineage: `evidence_final/`, `evidence_r2/` (without `diagnostics/`) and `evidence_r1/`.

**Not committed:**
- the stale `evidence/` folder (superseded transform);
- `evidence_r2/diagnostics/`: scratch probes that embed local paths and call Q-KEY runtime functions R1 removed;
- every unrelated untracked research or probe file in the repository.

---

## Self-audit

1. **Did learning actually move after the environment outcome?** Yes. Static order (S1): draw at line 3838, view 3839, guard 3848, section 3861, restore 4847, sync 4848, E1 reuse 4899. Dynamically, 0 learning entries on slip ticks (R1b, R1d).
2. **Did the environment still draw exactly once?** Yes. 756,668 draws = 756,668 edge-attempt decisions; maximum 1 per tick; 0 per-tick mismatches; 0 goal-entry draws (R1e). e1e2 AV7 passes.
3. **Did the RNG stream stay unchanged?** Yes. It is the same `liveRng('environment')` call with the same arguments; e1e2 G2a–c pass; G1′ shows OFF ≡ B2.
4. **Did any slip receive the intended success reward?** No: 0 Q updates on 320,383 slip ticks.
5. **Are return moves now learnable?** Yes: 71,736/71,736, in every arm.
6. **Did any reward semantics change by accident?** No. The reward code is untouched. The rewards learned are exactly the existing values: +2, +0.3, −0.4 and +12.
7. **Did I change the experimental question by accident?** No. H1 is unchanged. Two consequences go to the Director: ERR-05 §3.1 is superseded, and the §10.1/§10.2 premises are not met. The learner's dynamics differ from B2, so B2-era behavioural numbers should not be reused.
8. **Did I introduce hidden arm-specific behaviour?** No. The R1 edits read no arm predicate. Arm effects enter only through the unchanged E3/E4 sites and the A3/A4 edits. P2 and P3 hold.
9. **Did OFF stay identical to pristine?** Yes: G1′ 21/21, and existing gates 25/25 scripts identical.
10. **Are all blocking failures genuinely resolved?** Yes. B-1 is resolved. Each remaining failure was traced to its cause with a probe or with code reading: zero-goal admissibility (76/76), the cap observation lag, and the G8 harness configuration.
11. **Did I avoid H1 outcome analysis?** Yes, with two disclosures:
    - F2 required counting runs without a goal reach; I report only the pooled count (4/287).
    - While diagnosing, I saw the arm labels of those four runs. I don't report them and made no comparison.

    Per-arm figures in this report are mechanism quantities only: return-move coverage, no-commit share and fingerprint distinctness. The smoke test used configuration 900030/1, which resolves inside the historical candidate block.
12. **Did I weaken any gate?** No. F2, G15′ and P1 keep their declared conditions and their FAIL verdicts. F2′, G15′(9.4) and P3 were added beside them, with reasons taken from the frozen text (§9.4) and from the arm definitions. F2's evidence text used to claim "all with eligibility rate exactly 1" for every run; it now reports the actual counts.

---

## Next optimised decision

**The Research Director drafts and freezes the H1-R preregistration on this build.** The freeze document should record:
- R1 as the erratum superseding the ERR-05 §3.1 sentence;
- the §10.1/§10.2 premise status;
- an explicit decision on arm A5, given that A2 ≡ A5 in 10/41 configurations;
- §9.4's inclusion of runs without a goal reach.

No further engineering is needed before that decision.
