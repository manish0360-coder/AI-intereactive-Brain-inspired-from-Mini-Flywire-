# CF-04 Gate Results — hidden change and reliability arbitration

**Verdict: CF-04 ARBITRATION NOT SUPPORTED (A1, A2) — HARMFUL.** The task is a valid instrument (T1 and T2 hold).
On it, arbitration between the planner and a habit learner is **worse** than the planner alone, and worse than
switching between the same two controllers at random.

This was the expected verdict, declared in the specification before the run. The gate was run once. Nothing was
re-run or tuned after the outcome.

| Item | Value |
|---|---|
| Evidence category | Development evaluation gate. Not confirmatory; local commits; no independent reproduction |
| Command | `node experiments/cf04/run_gate.mjs --domain gate4` (exit 0) |
| Code and spec | HEAD `2ae0311`; `GATE_SPEC.md` SHA-256 `ee0a0ffe…4f17`; frozen before the run |
| Environment | Node v24.15.0, win32-x64 |
| Result file | `gate4_result.json`, SHA-256 `069f44bd…0626`; row hash `9e52fe61…e181` (880 rows) |
| Worlds | `cf|gate4|world|0…54`; 0 excluded |
| Tests | 136/136; two in-process runs identical |

## Criteria

All differences are in steps, mean and 95% interval over 55 worlds. `metric` is every step after the change (15
episodes with the block, then 15 after it is removed).

| Criterion | Statistic | Result | Held |
|---|---|---|---|
| T1 the task detects adaptation | Planner without change detection − planner, first 3 episodes after the block | +160.7 [135.2, 188.2] | **yes** |
| T2 the sham is null | The same contrast when a harmless edge is blocked; and the difference of the two | 0.0 [−0.3, 0.3]; +160.7 [135.4, 188.5] | **yes** |
| **A1 arbitration helps** | Planner − ARB on `metric` | **−13.8 [−20.0, −7.2]** | **no** |
| **A2 more than random switching** | RANDSWITCH − ARB on `metric` | **−11.2 [−20.0, −3.6]** | **no** |
| A3 no cost when nothing relevant changes | ARB − planner, sham arm | +0.3 [−2.4, 2.7] | yes |
| A4 the arbiter acts | Worlds in which the habit decided at least once | 55 of 55 | yes |
| Harm | ARB − planner on `metric`, lower bound > 0 | +13.8 [7.1, 20.1] | **harmful** |

## Where the cost falls

| Window | ARB − planner | ARB_T10 − planner (θ = 0.1, reported) |
|---|---|---|
| First 3 episodes after the block | **+7.6 [5.4, 9.9]** | +3.1 [0.9, 5.4] |
| All 15 episodes with the block | **+16.0 [12.4, 19.8]** | +3.8 [1.3, 6.5] |
| 15 episodes after the block is removed | −2.3 [−8.2, 3.0] | −4.6 [−9.8, −0.0] |
| Everything after the change | **+13.8 [7.1, 20.1]** | −0.8 [−6.5, 4.6] |

Arbitration costs steps exactly when it is meant to help: right after the change. That is when the planner is
surprised, the arbiter hands control to the habit learner, and the habit learner is the worse controller.

| Arbiter behaviour | ARB (θ = 0.05) | ARB_T10 (θ = 0.1) |
|---|---|---|
| Share of decisions made by the habit, change arm | 16.6% | 3.7% |
| The same, sham arm | 14.2% | 2.7% |
| Switches per run | 90.1 | 28.4 |
| Decisions where the two controllers disagreed | 40.9% | 40.9% |
| Decisions where the habit acted and disagreed | 75.1 per run | 16.2 per run |

The habit share is almost as high when nothing relevant changes (14.2%) as when it does (16.6%): most switching is
driven by ordinary noise, not by the change.

## Mean steps by agent (change arm)

| Agent | Before the change (last 5 training episodes) | First 3 after the block | 15 with the block | 15 after removal | Reopened edge used (of 15 episodes) |
|---|---|---|---|---|---|
| ORACLE (privileged) | 26.6 | 24.3 | 120.8 | 80.0 | 15.0 |
| **Planner (MBVI3)** | 27.4 | 31.6 | 127.3 | 120.1 | 0.9 |
| Planner without change detection | 27.3 | 192.4 | 293.1 | 117.9 | 1.2 |
| ARB | 27.6 | 39.2 | 143.3 | 117.8 | 2.9 |
| ARB_T10 | 26.7 | 34.8 | 131.0 | 115.5 | 2.0 |
| RANDSWITCH | 27.9 | 34.5 | 136.1 | 113.7 | 2.9 |
| DYNAQ | 39.0 | 50.3 | 198.4 | 164.3 | 4.9 |
| QL (habit alone) | 33.8 | 341.9 | 1,054.5 | 143.9 | 3.2 |

Censored episodes: QL 233, planner without change detection 28, DYNAQ 5, every other agent 0. Censored episodes
count their cap of 200 steps, so QL's true cost is understated.

Other contrasts on `metric`: QL − planner +951.1 [709.0, 1,203.6]; DYNAQ − planner +115.3 [93.5, 138.1];
RANDSWITCH − planner +2.5 [−5.6, 9.9]. Mean route length 3.9 steps, 5.8 with the block.

## What this shows

1. **The task works.** A planner that cannot detect change needs 161 more steps in the first three episodes after
   the block, and a harmless block produces no difference.
2. **Arbitration between these two controllers does not help, and at θ = 0.05 it hurts.** The habit learner is not
   a competent fallback: alone it needs about 950 more steps than the planner. Handing it control when the planner
   is surprised replaces a controller that recovers within a few steps with one that does not.
3. **A more conservative arbiter (θ = 0.1) is close to inert**: no overall difference from the planner
   (−0.8 [−6.5, 4.6]), a small cost with the block (+3.8 [1.3, 6.5]), and a small gain after its removal
   (−4.6 [−9.8, −0.0]) whose interval touches zero. It was not a pass/fail arm and is not a result to build on.
4. **Change detection is the mechanism that matters here.** Removing it costs +160.7 steps; this is the largest
   effect in the experiment.
5. **The room that is left is in recovery, not in adaptation.** After the block the planner is within 6.5 steps
   of the reference [4.1, 9.1]. After the block is *removed* it is 40.1 steps behind [32.5, 48.1], because it
   retries the reopened exit in 0.9 of 15 episodes: once it believes an exit is dead it never tests it again.

## What it does not show

- That arbitration can never help. It shows that arbitration between *this* planner and *this* habit learner does
  not help on 24-node worlds, where planning is cheap and the planner is near the reference. The specification
  fixed the condition for reopening the question: a task on which the planner alone is far from the reference.
  Compute was not counted; an arbiter whose purpose is to save computation was not tested.
- Anything beyond one world size, one reliability distribution and one kind of change.
- Anything about the legacy agent.

## Consequences (fixed in the specification before the run)

1. **Arbitration is not built into the integrated agent.** Decision AD-2 is recorded as not supported by
   evidence at this scale. `cognitive/mind/arb/` stays in the repository as the tested mechanism and is used by
   nothing else.
2. The next mechanism question is the one the data point to: **recovery after a change is reversed**. The planner
   leaves 40 steps on the table because it never re-tests a dead exit. A candidate is noted (a bonus for exits not
   tried recently) and is **not** built here; it needs its own frozen gate, with a count-model Dyna-Q+ baseline.
