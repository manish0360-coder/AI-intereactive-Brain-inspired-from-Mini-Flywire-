# CF-05 Gate Specification — the exploration bonus and recovery after a reversed change

**Status.** DRAFT, revision 2, for outside review and then the owner's approval. Not frozen. The driver refuses to
run the `gate5` domain until this line reads "Frozen". No `gate5` world has been run.

- Development evaluation gate, not confirmatory. Commits are local until the owner authorises a push.
- CF-03, CF-03b, CF-03c and CF-04 keep their recorded verdicts. No earlier record is edited.

**Changes from revision 1 (the owner's decisions of 2026-11-14).** This gate now tests only the mechanism the
owner asked to have investigated, the exploration bonus, with the Dyna-Q+ baseline. The targeted RECALL candidate
is removed from this gate and has its own (`experiments/cf05b/`). A third task arm (the block is never removed)
and a larger-world repetition are added. An outside review of this draft comes before any freeze.

## The question

CF-04 measured where the planner still loses: when a blocked exit is reopened without notice the planner stays on
the detour (it re-tests the reopened exit in 0.9 of 15 episodes) and ends 40.1 steps behind the privileged
reference [32.5, 48.1]. **Does an exploration bonus for exits not tried recently let the planner recover the
route, and what does it cost when nothing has changed or when the change is permanent?**

## The mechanism under test: BONUS (`cognitive/mind/v4/agent.mjs`, mode `BONUS`)

The existing planner MBVI3 (world model v3, value iteration, optimism for the unknown, greedy choice), with one
addition in the planned value of every (state, action) pair that has been tried at least once:

    Q(s, a)  +=  κ · √τ(s, a)        τ = real steps since the pair was last tried,  κ = 0.001

This is the Dyna-Q+ bonus (Sutton & Barto, §8.3) moved from sampled planning updates into exact value iteration.
The frozen planner file is not edited: the bonus lives in a new planner (`cognitive/mind/v4/planner.mjs`) that a
test shows is identical, value for value, to the frozen one when the bonus is absent.

## Task E4B (`cognitive/testbed/task_e4b.mjs`)

Hidden per-edge reliabilities U[0.5, 1]; the agent is never told that anything changed. 600 unrewarded
exploration steps; 30 training episodes to a cued goal at distance ≥ 3; then 15 episodes (phase C); then 15
episodes (phase D). Episodes are capped at 200 steps.

| Arm | Before phase C | Before phase D | What it measures |
|---|---|---|---|
| CHANGE | An edge on a shortest route is blocked | The block is removed | Benefit after the reversal; cost while blocked |
| SHAM | An edge on no shortest route is blocked | That block is removed | Cost when the route never changes |
| **PERMANENT** (new) | An edge on a shortest route is blocked | Nothing: it stays blocked | Cost when a change is permanent, where re-testing can only lose |

Windows, in steps: `postAll` = phase C; `return` = phase D; `metric` = both. The CHANGE and SHAM arms are the
frozen task E4 exactly (a test asserts identical rows).

## Arms

| Arm | Agent and setting | Role |
|---|---|---|
| MBVI3 | The existing planner | Comparator |
| **BONUS** | κ = 0.001 | **Primary** |
| BONUS_K003 | κ = 0.003 | A stronger bonus (reported) |
| DECAY | Blanket belief decay, hazard 0.0003 | The other blanket candidate (reported) |
| DYNAQP | Dyna-Q+ with a count model, κ = 0.001, 20 planning updates per step | Baseline for R6 |
| DYNAQP_MATCHED | The same at 1,300 planning updates per step, about the planner's work per decision | Baseline for R6 |
| DYNAQ | The earlier last-outcome Dyna-Q | Reported |
| ORACLE | Privileged shortest-path reference | Reported |
| MBVI3_CH0005, MBVI3_CH008 | The planner with its change-detection prior rate 4× lower and 4× higher | Sensitivity asked for by the outside review (reported) |

## Fairness of the comparison

| Concern | How it is handled |
|---|---|
| Tuning | BONUS, DECAY and Dyna-Q+ each got three settings on the same 20 `dev` worlds, selected by one rule: lowest total steps over the CHANGE and SHAM arms |
| Seeds | Every arm shares the environment's per-edge random streams and the same layout in each world |
| Computational fairness | Work is counted for every agent: value-iteration backups per decision for planners, planning updates per step for Dyna-Q+. Dyna-Q+ runs at its usual budget and at a budget matched to the planner's |
| Baseline strength | Count-model Dyna-Q+ replaces the last-outcome Dyna-Q as the baseline in R6 |

## Statistical plan

| Item | Value |
|---|---|
| Domain / worlds | `gate5`; `cf|gate5|world|0…59`, never used before. Larger-world repetition: `cf|gate5|large|0…19` |
| Sample size | The rule n = max(20, ⌈(2.8·SD/mean)²⌉), capped at 60, on the dev differences of R1 (mean 1.4, SD 15.2) gives the cap: **n = 60** |
| Smallest detectable effect | With SD about 15 and n = 60: 2.8 × 15.2 / √60 ≈ **5.5 steps** on the `return` window (80% power, two-sided 5%). The room available is about 40 steps |
| Unit and intervals | The world; paired differences; percentile bootstrap, 10,000 resamples, 95% |
| Truncation | Capped episodes are counted per agent and arm. R1–R5 compare MBVI3 and BONUS, which had no capped episode on `dev` at κ = 0.001; any on `gate5` are reported beside the verdict. Capping can only understate Dyna-Q+'s cost, which makes R6 harder to pass |
| Robust summaries | Every contrast is reported with its median and with the number of worlds in which each side needs fewer steps |
| Multiplicity | Six criteria, all required for SUPPORTED: conservative for the gate as a whole. Reported contrasts are many and uncorrected; none can change the verdict |

## Criteria

| Criterion | Statistic | Rule |
|---|---|---|
| **R1** benefit | `return`, CHANGE: MBVI3 − BONUS | mean > 0 and lower bound > 0 |
| **R2** no cost while blocked | `postAll`, CHANGE: BONUS − MBVI3 | upper bound < 10 steps |
| **R3** no cost when unchanged | `metric`, SHAM: BONUS − MBVI3 | upper bound < 10 steps |
| **R4** no cost when permanent | `metric`, PERMANENT: BONUS − MBVI3 | upper bound < 10 steps |
| **R5** no regression | BONUS − MBVI3 on E1 EXPLORED, E3, E1S EXPLORED, E2P PRE | every upper bound < 10 steps |
| **R6** beats the textbook baseline | `metric`, CHANGE: Dyna-Q+ − BONUS | lower bound > 0 at both planning budgets |
| **R7** infrastructure | Two in-process runs identical; all 150 tests pass | all |

| Verdict | Condition | Consequence, fixed now |
|---|---|---|
| SUPPORTED | R1–R7 | Independent verification, then a proposal to the owner. Nothing enters the agent before that |
| SUPPORTED AT A COST | R1 holds; some of R2–R6 fail (listed) | Not adopted. Benefit and cost are reported together |
| NOT SUPPORTED | R1 fails | Not adopted. The exploration bonus is recorded as not supported for recovery on this task |
| INVALID | R7 fails | None |

**Reported:** every window for every arm in all three task arms, with mean, median and capped-episode count; the
net effect of BONUS over the three arms; BONUS − ORACLE on `return`; how often each arm crosses the reopened exit
and how often it tries the manipulated edge; work per step; the larger-world repetition (48 nodes, 60 edges, 1,200
exploration steps, 20 worlds; ORACLE, MBVI3 and BONUS; all three arms); the sensitivity arms.

**Pre-declared expectations** (reported, not tested). On `dev`, BONUS at its best setting did nothing measurable.
**The expected verdict is NOT SUPPORTED.** The stronger bonus (κ = 0.003) is expected to cross the reopened exit
more often and to need more steps overall. Both Dyna-Q+ arms are expected to need more steps than MBVI3 overall.

## Development-domain disclosure (`cf|dev|world|0…19`; observed before this specification was written)

From development scripts kept outside the repository, 20 dev worlds, CHANGE and SHAM arms only (the PERMANENT arm
did not exist then, so nothing about BONUS under a permanent change has been observed). A second run of the grid
reproduced every line.

| Arm (setting) | Phase C | Phase D | CHANGE total | SHAM total | Reopened exit crossed (of 15 episodes) | Capped episodes |
|---|---|---|---|---|---|---|
| ORACLE | 105.6 | 80.4 | 186.0 | 162.9 | 15.0 | 0 |
| MBVI3 | 112.8 | 103.4 | 216.2 | 173.1 | 0.8 | 0 |
| **BONUS 0.001** | 114.7 | 102.0 | 216.7 | 165.8 | 1.0 | 0 |
| BONUS 0.003 | 149.1 | 128.9 | 277.9 | 232.6 | 3.4 | 0 |
| BONUS 0.01 | 2,457.8 | 2,635.3 | 5,093.1 | 5,086.4 | 71.3 | 1,626 |
| DECAY 0.0003 | 114.0 | 100.5 | 214.4 | 161.3 | 1.1 | 0 |
| DECAY 0.001 | 123.8 | 107.3 | 231.1 | 172.7 | 3.5 | 0 |
| DECAY 0.003 | 173.1 | 129.8 | 302.9 | 235.1 | 7.0 | 0 |
| DYNAQP k 20, κ 0.001 | 179.6 | 103.6 | 283.1 | 210.9 | 10.3 | 0 |
| DYNAQP k 20, κ 0.003 | 276.8 | 156.1 | 432.9 | 308.1 | 11.2 | 0 |
| DYNAQP k 1,300, κ 0.001 | 218.4 | 108.6 | 327.0 | 204.3 | 6.6 | 0 |
| DYNAQP k 1,300, κ 0.003 | 330.6 | 149.2 | 479.7 | 291.6 | 7.5 | 5 |
| DYNAQ | 206.3 | 138.0 | 344.4 | 300.1 | 5.8 | 7 |

Against MBVI3 on `dev` (negative means fewer steps): BONUS 0.001 on `return` −1.4 [−8.4, 4.7], on SHAM −7.3
[−24.5, 3.9]; BONUS 0.003 overall +61.8 [46.6, 76.7]; DYNAQP (k 20, κ 0.001) overall +67.0 [49.7, 86.2];
DYNAQP_MATCHED (κ 0.001) overall +110.8 [79.9, 147.1].

## Things a reviewer should doubt

1. **A gate expected to fail.** The best BONUS setting is the weakest tried, at the edge of the grid; a weaker one
   would do even less. Is running 60 worlds to confirm a null worth it, or should the grid have been widened?
2. **The bonus may be mis-scaled, not wrong.** κ√τ with τ in the thousands and rewards of 1 is a blunt
   instrument; a bonus normalised by route length, or applied only near the route in use, was not tried.
3. **Dyna-Q+ is tuned on κ only** (learning rate, exploration rate and planning budget are the earlier baseline's).
   A better-tuned Dyna-Q+ might do better; it would still have to beat a planner that is near the reference.
4. **One world size and one kind of change** in the criteria. The larger-world arm is reported only.
5. **Six criteria with a fixed 10-step margin.** The margin was chosen in CF-03 for a different task.
