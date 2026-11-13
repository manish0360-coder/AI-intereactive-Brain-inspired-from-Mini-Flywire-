# CF-04 Gate Specification — hidden change and reliability arbitration (frozen)

**Status.** Frozen in the CF-04 implementation commit, before the `gate4` domain was run.

- Development evaluation gate, not confirmatory. Commits are local until the owner authorises a push.
- The result is bound to the commit it ran at.

## The question

Decision AD-2 proposed an "executive" for MiniFlyWire in the only form the literature supports for small agents:
two complete controllers and an arbiter that hands control to whichever is currently more reliable. The
independent review judged that decision weak, because the planner is already near the ceiling. This gate asks:
**when the world changes without warning, does arbitration between the planner and a habit learner do better than
the planner alone?** A "no" is an acceptable and useful answer.

## Task E4 (`cognitive/testbed/task_e4.mjs`)

Hidden per-edge reliabilities U[0.5, 1]. The agent is never told that anything changed.

| Phase | Content |
|---|---|
| A pre-exposure | 600 steps, no reward, no cue |
| B training | Goal cued and rewarded, 30 episodes from the start node (distance ≥ 3) |
| C change | An edge on a shortest route is blocked; 15 episodes |
| D reversal | The block is removed; 15 episodes |

Arms: **CHANGE** (the edge on the route) and **SHAM** (an edge on no shortest route; the route never changes).
Windows, in steps: `post` = first 3 episodes of C; `postAll` = all of C; `return` = all of D; `metric` = C + D.

## Agents

| Kind | Definition |
|---|---|
| MBVI3 | The planner alone (world model v3 + value iteration) |
| MBVI3_NOCHANGE | The planner without change detection (the task-admission contrast) |
| QL, DYNAQ | Habit learner alone; Dyna-Q |
| **ARB** | Planner and Q-learning both learn from every step. The habit acts while (smoothed planner excess error − smoothed habit excess error) > θ = 0.05. Planner error = 1 − p(observed outcome) minus its expectation under the model's own prediction; habit error = \|TD error\| minus its own slow average; smoothing rate 0.1 (`cognitive/mind/arb/agent.mjs`) |
| ARB_T10 | The same with θ = 0.1, at which one maximal surprise is not enough to hand over control |
| **RANDSWITCH** | The same two controllers; the habit acts at random with the share ARB showed in that world and arm. The control for "any switching helps" |
| ORACLE | Privileged shortest-path reference |

## Command

```bash
node experiments/cf04/run_gate.mjs --domain gate4
```

The driver refuses to run if any file under `cognitive/` or `experiments/cf04/` is uncommitted or modified, or if
`results/gate4_result.json` already exists.

## Frozen evaluation values

| Item | Value |
|---|---|
| Domain / worlds | `gate4`; `cf|gate4|world|0…54`. Never used before. Count rule as CF-01b: n = max(20, ⌈(2.8·SD_dev/mean_dev)²⌉), capped at 60, on the dev differences of the primary contrast A1: SD 26.2, mean −9.9 → 54.9 → **n = 55** |
| Unit and intervals | The world; paired differences; percentile bootstrap, 10,000 resamples, 95% |
| Seeds | Environment `…|E4|env`, agent `…|E4|agent`, layout `…|E4|layout`, reliabilities `…|E4|rel`; shared by every agent and arm |
| **T1** the task detects adaptation | CHANGE, `post`: MBVI3_NOCHANGE − MBVI3, mean > 0 and lower bound > 0 |
| **T2** the sham is null | The same contrast in SHAM has upper bound < 10 steps, and CHANGE contrast − SHAM contrast has lower bound > 0 |
| **A1** arbitration helps | CHANGE, `metric`: MBVI3 − ARB, mean > 0 and lower bound > 0 |
| **A2** more than random switching | CHANGE, `metric`: RANDSWITCH − ARB, lower bound > 0 |
| **A3** no cost when nothing relevant changes | SHAM, `metric`: ARB − MBVI3, upper bound < 10 steps |
| **A4** the arbiter acts | The habit decides at least once in at least half the worlds |
| Infrastructure | Determinism (two in-process runs); all 136 tests pass |

| Verdict | Condition | Consequence, fixed now |
|---|---|---|
| ARBITRATION SUPPORTED | T1, T2, A1–A4 | Independent review of the evidence, then arbitration enters the integrated agent |
| ARBITRATION NOT SUPPORTED | T1, T2 hold; some of A1–A4 fail (listed). "HARMFUL" is added if ARB − MBVI3 on `metric` has lower bound > 0 | Arbitration is **not** built into the agent at this scale. AD-2 is recorded as not supported by evidence. The question may be reopened only on a task where the planner alone is shown to be far from the reference |
| TASK NOT ADMITTED | T1 or T2 fails | No conclusion about arbitration; the task is redesigned |
| INVALID | Infrastructure fails | None |

Stage B is read for ARB (θ = 0.05). ARB_T10 is reported with the same statistics and is not pass/fail.

**Reported:** every window for every agent; MBVI3 − ORACLE on `post` and `return` (the room left for any
mechanism); how often each agent uses the reopened edge; ARB's habit share, switches, disagreement rate and
decisive habit decisions in each arm; QL and DYNAQ against MBVI3.

## Development-domain disclosure (`cf|dev|world|0…19`, row hash `decd2da2…`; observed before this freeze)

The arbiter's threshold was set in two steps on dev, and both are disclosed.

| Step | θ | What was seen |
|---|---|---|
| 1 | 0.1 (the first a-priori value) | The habit acted in 4% of decisions. ARB − MBVI3 on `postAll` +0.4 [−4.5, 4.5]: no difference. A unit test then showed that one maximal surprise adds exactly 0.1 to the signal and so could never cross this threshold |
| 2 | 0.05 (frozen as ARB; step 1 kept as ARB_T10) | The habit acted in 16% of decisions |

Dev results of the frozen design:

| Measure | Dev result |
|---|---|
| T1: MBVI3_NOCHANGE − MBVI3, `post`, CHANGE | +101.7 [67.3, 140.8] (holds) |
| T2: the same in SHAM; CHANGE − SHAM | −1.1 [−3.1, 0.0]; +102.8 [68.8, 143.1] (holds) |
| **A1: MBVI3 − ARB, `metric`** | **−9.9 [−20.6, 1.8] (fails; ARB needs more steps)** |
| **A2: RANDSWITCH − ARB** | **−5.3 [−15.4, 4.6] (fails)** |
| A3: ARB − MBVI3, SHAM | −9.9 [−27.1, 1.3] (holds) |
| A4 | 20 of 20 worlds (holds) |
| ARB − MBVI3 by window | `post` +4.8 [1.9, 8.3] · `postAll` +10.0 [2.7, 17.4] · `return` −0.1 [−6.5, 5.8] |
| ARB_T10: MBVI3 − ARB_T10, `metric` | +4.5 [−5.5, 16.3] |
| Room left: MBVI3 − ORACLE | `post` +7.2 [1.7, 13.4] · `return` +23.0 [13.5, 33.2] |
| Reopened edge used in D (of 15 episodes) | ORACLE 15.0 · MBVI3 0.8 · ARB 1.2 · DYNAQ 5.8 · QL 0.7 |
| Habit learner alone: QL − MBVI3, `metric` | +415.6 [279.2, 561.8] |

**Declared before the run.** On dev, arbitration fails its own criteria at both thresholds: at 0.1 it is nearly
inert, and at 0.05 it is worse than the planner right after the change, because it hands control to a habit
learner that is far worse than the planner (QL needs 416 more steps). The expected verdict is ARBITRATION NOT
SUPPORTED. The gate is run to establish that on fresh worlds with adequate sample size, not to rescue the
mechanism; no parameter was tuned toward a pass.

The only room the planner leaves is in phase D: it almost never retries an exit it has learned is blocked, so it
stays on the detour after the block is removed (+23 steps against the reference). Neither controller addresses
that, and arbitration between them cannot. A mechanism that would (a bonus for exits not tried recently) is noted
and **not** built here.
