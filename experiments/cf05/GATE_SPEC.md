# CF-05 Gate Specification — recovery after a reversed change

**Status.** DRAFT for the owner's review. Not frozen. The driver refuses to run the `gate5` domain until this line
reads "Frozen", and no `gate5` world has been run.

- Development evaluation gate, not confirmatory. Commits are local until the owner authorises a push.
- CF-03, CF-03b, CF-03c and CF-04 keep their recorded verdicts. No earlier record is edited.

## The question

CF-04 measured where the planner still loses. When a blocked exit is reopened without notice, the planner stays on
the detour: it re-tests the reopened exit in 0.9 of 15 episodes and ends 40.1 steps behind the privileged
reference [32.5, 48.1] (55 worlds). **Can the planner recover a route it has given up on, without paying for it
when nothing has changed?**

## What the development work found, before any choice was made

Three families were built and searched on the `dev` worlds with the **same budget: three settings each**, and the
same selection rule: the lowest total steps over the CHANGE and SHAM arms of task E4.

| Family | What it does | Settings tried | Best by the rule | Effect of the best setting on the 15 episodes after the block is removed (candidate − planner; negative is better) |
|---|---|---|---|---|
| **Dyna-Q+** (baseline) | Textbook: count model, planning bonus κ√τ for actions not tried recently | κ 0.001, 0.003, 0.01 at 20 and at 1,300 planning updates per step | κ 0.001 | +0.2 [−9.3, 9.2] at 20 updates; +5.2 [−4.3, 14.4] at 1,300 |
| **BONUS** | The same bonus inside the planner's value computation, for every tried pair | κ 0.001, 0.003, 0.01 | κ 0.001 | −1.4 [−8.4, 4.7] |
| **DECAY** | Belief about every pair left alone fades toward the belief about an untried pair | hazard 0.0003, 0.001, 0.003 | 0.0003 | −3.0 [−9.8, 3.1] |
| **RECALL** | Only for exits the model declared *worse*: remember the belief held just before, and let the planning belief drift back toward it | hazard 0.003, 0.01, 0.03 | 0.01 | **−12.4 [−23.4, −2.5]** |

**The exploration bonus did not work.** For BONUS and DECAY the best setting is the weakest one tried, and it does
nothing measurable. Stronger settings re-test more (the reopened exit is used in up to 7 of 15 episodes) but cost
more than they gain: BONUS at κ 0.003 is +61.8 steps worse overall [46.6, 76.7], and at κ 0.01 the agent wanders
and 1,626 episodes hit the cap. Dyna-Q+ is worse than the existing planner at every setting (at best +67.0
[49.7, 86.2] overall) and does not recover the route either.

Reading (descriptive): blanket re-testing spends steps on about sixty state–action pairs to recover one. RECALL was
added because of that result. It was **not** in the plan the owner approved, and it is flagged here for that
reason: it is a third candidate, chosen after seeing that the first two failed on `dev`.

## The mechanism under test: RECALL (`cognitive/mind/v4/agent.mjs`, mode `RECALL`)

MBVI3 unchanged (world model v3, value iteration, optimism for the unknown, greedy choice), plus:

1. When the model's change detector declares that an exit **got worse**, the agent stores the prediction it held
   for that exit just before (where it led and how reliably).
2. For such exits only, the belief used for planning is a mixture: (1 − w) × current belief + w × remembered
   belief, with w = 1 − (1 − hazard)^τ and τ = steps since the exit was last tried. hazard = 0.01.
3. The memory is dropped the first time the exit moves again.

The model's counts are never modified. Exits that never worked, and exits in use, are untouched. With mode `NONE`
the agent reproduces MBVI3 row for row (tested on E4, E1S and the detour task).

## Task and arms

Task E4 as in CF-04 (`cognitive/testbed/task_e4.mjs`): hidden reliabilities U[0.5, 1]; 600 exploration steps; 30
training episodes; an edge on the route is blocked without notice for 15 episodes; the block is removed without
notice for 15 episodes. **SHAM** blocks an edge on no shortest route, so the route never changes: this arm measures
the cost of the mechanism when nothing relevant happens. Windows: `postAll` = the 15 blocked episodes; `return` =
the 15 episodes after removal; `metric` = both.

| Arm | Agent and setting |
|---|---|
| MBVI3 | The existing planner |
| **RECALL** | hazard 0.01 (primary) |
| BONUS, DECAY | κ 0.001; hazard 0.0003 (reported; expected to show no benefit) |
| DYNAQP, DYNAQP_MATCHED | Dyna-Q+ with a count model, κ 0.001, at 20 and at 1,300 planning updates per step |
| DYNAQ, ORACLE | The earlier baseline; the privileged reference |
| RECALL_H003, RECALL_H03 | hazard 0.003 and 0.03 (sensitivity, reported) |
| MBVI3_CH0005, MBVI3_CH008 | The planner with the change-detection prior rate 4× lower and 4× higher (sensitivity asked for by the outside review, reported) |

## Fairness of the comparison

| Concern | How it is handled |
|---|---|
| Tuning | Every family, baseline included, got three settings on the same 20 `dev` worlds and the same selection rule |
| Seeds | Every arm shares the environment's per-edge random streams and the same layout in each world |
| Computational fairness | Work is counted for every agent: value-iteration backups per decision for planners (about 1,340), planning updates per step for Dyna-Q+. Dyna-Q+ is run at its usual budget **and** at a budget matched to the planner's |
| Baseline strength | Dyna-Q+ replaces the last-outcome Dyna-Q of earlier gates as the baseline for R5; the older one is still reported |
| The mechanism costs nothing extra | RECALL's backups per decision are reported beside MBVI3's (1,353 against 1,335 on `dev`) |

## Statistical plan

| Item | Value |
|---|---|
| Domain / worlds | `gate5`; `cf|gate5|world|0…59`. Never used before |
| Sample size | The rule n = max(20, ⌈(2.8·SD/mean)²⌉) on the dev differences of R1 (mean 12.4, SD 23.9) gives 30. **n = 60 (the cap) is used instead**, because the setting was selected on those same dev worlds and its dev effect is therefore optimistic |
| Smallest detectable effect | With SD about 24 and n = 60: 2.8 × 24 / √60 ≈ **8.7 steps** on the `return` window (80% power, two-sided 5%). The room available is about 40 steps |
| Unit and intervals | The world; paired differences; percentile bootstrap, 10,000 resamples, 95% |
| Truncation | Episodes are capped at 200 steps. Capped episodes are counted per agent and arm. The criteria R1–R4 compare MBVI3 and RECALL, which had no capped episode on `dev`; if either has any on `gate5`, the count is reported beside the verdict. Capping can only understate Dyna-Q+'s cost, which makes R5 harder to pass, not easier |
| Robust summaries | Every contrast is reported with its median and with the number of worlds in which each side needs fewer steps |
| Multiplicity | Five criteria, all required: conservative for the gate as a whole. Reported contrasts are many and uncorrected; none of them can change the verdict |

## Criteria

| Criterion | Statistic | Rule |
|---|---|---|
| **R1** benefit | `return`, CHANGE: MBVI3 − RECALL | mean > 0 and lower bound > 0 |
| **R2** no cost while blocked | `postAll`, CHANGE: RECALL − MBVI3 | upper bound < 10 steps |
| **R3** no cost when unchanged | `metric`, SHAM: RECALL − MBVI3 | upper bound < 10 steps |
| **R4** no regression | RECALL − MBVI3 on E1 EXPLORED, E3, E1S EXPLORED, E2P PRE | every upper bound < 10 steps |
| **R5** beats the textbook baseline | `metric`, CHANGE: Dyna-Q+ − RECALL | lower bound > 0 at both planning budgets |
| **R6** infrastructure | Two in-process runs identical; all 147 tests pass | all |

| Verdict | Condition | Consequence, fixed now |
|---|---|---|
| RECOVERY SUPPORTED | R1–R6 | Independent verification of the evidence (below). Only after that may RECALL be proposed for the agent; the proposal is the owner's decision |
| RECOVERY SUPPORTED AT A COST | R1 holds; some of R2–R5 fail (listed) | Not adopted. The cost is reported with the benefit |
| RECOVERY NOT SUPPORTED | R1 fails | Not adopted. The gap stays open and is recorded as such |
| INVALID | R6 fails | None |

**Reported:** every window for every arm with mean, median and capped-episode count; RECALL − ORACLE on `return`
(the gap that remains); how often each arm uses the reopened exit; BONUS and DECAY against MBVI3 on every window;
the two RECALL sensitivity settings; the two change-detection sensitivity settings; work per step for every arm.

**Pre-declared expectations** (reported, not tested): BONUS and DECAY show no benefit on `return`; both Dyna-Q+
arms need more steps than MBVI3 overall; RECALL closes part of the gap and not all of it (on `dev` it remained
+10.6 steps behind the reference [4.9, 16.3]).

## Independent verification, if the verdict is RECOVERY SUPPORTED

1. Reproduce the row hash from a clean clone of the freeze commit.
2. An adversarial review by a reviewer that did not write the design, asked specifically whether RECALL gains from
   something other than recovery.
3. An outside review (Gemini) of the specification, results and source, as for CF-03c and CF-04.

No claim is expanded and nothing enters the agent before these.

## Development-domain disclosure (`cf|dev|world|0…19`; observed before this specification was written)

The numbers below come from development scripts kept outside the repository, on 20 dev worlds. The gate driver was
validated on 3 dev worlds only.

| Arm (setting) | 15 blocked | 15 after removal | CHANGE total | SHAM total | Reopened exit used (of 15) | Capped episodes |
|---|---|---|---|---|---|---|
| ORACLE | 105.6 | 80.4 | 186.0 | 162.9 | 15.0 | 0 |
| MBVI3 | 112.8 | 103.4 | 216.2 | 173.1 | 0.8 | 0 |
| RECALL 0.003 | 111.8 | 96.0 | 207.9 | 161.9 | 2.4 | 0 |
| **RECALL 0.01** | 115.2 | 91.0 | 206.1 | 162.0 | 5.5 | 0 |
| RECALL 0.03 | 118.3 | 93.3 | 211.6 | 161.7 | 4.5 | 0 |
| BONUS 0.001 | 114.7 | 102.0 | 216.7 | 165.8 | 1.0 | 0 |
| BONUS 0.003 | 149.1 | 128.9 | 277.9 | 232.6 | 3.4 | 0 |
| BONUS 0.01 | 2,457.8 | 2,635.3 | 5,093.1 | 5,086.4 | 71.3 | 1,626 |
| DECAY 0.0003 | 114.0 | 100.5 | 214.4 | 161.3 | 1.1 | 0 |
| DECAY 0.001 | 123.8 | 107.3 | 231.1 | 172.7 | 3.5 | 0 |
| DECAY 0.003 | 173.1 | 129.8 | 302.9 | 235.1 | 7.0 | 0 |
| DYNAQP k 20, κ 0.001 | 179.6 | 103.6 | 283.1 | 210.9 | 10.3 | 0 |
| DYNAQP k 1,300, κ 0.001 | 218.4 | 108.6 | 327.0 | 204.3 | 6.6 | 0 |
| DYNAQ | 206.3 | 138.0 | 344.4 | 300.1 | 5.8 | 7 |

RECALL 0.01 against MBVI3 on `dev`: `return` −12.4 [−23.4, −2.5] (fewer steps in 12 worlds, more in 5, equal in
3; median −3.0); `postAll` +2.4 [−3.3, 7.3]; SHAM −11.1 [−29.2, 0.0]; battery E1 0, E3 0, E1S 0, E2P 0.

**Things a reviewer should doubt.**

1. **Winner's curse.** RECALL 0.01 was the best of three on these 20 worlds; its dev effect is biased upward. The
   interval's lower end is 2.5 steps from zero. A null result on `gate5` is a real possibility.
2. **The median effect is 3 steps.** The mean is carried by a minority of worlds.
3. **RECALL looks better than the planner in the SHAM arm (−11.1), where the route never changes.** That was not
   predicted. A possible reason: the change detector occasionally declares a change that did not happen and
   discards good counts, and RECALL restores them. If so, part of RECALL's benefit is repairing a weakness of the
   v3 change detector, not recovering from a real reversal. `gate5` reports the SHAM contrast and the count of
   remembered exits so this can be told apart.
4. **RECALL is a memory of one previous regime.** It is the smallest form of the "context" idea in the roadmap.
   It was tested here because the data pointed to it, and it adds state to the agent. If it passes, the claim is
   "recovers a reopened exit on this task", nothing wider.
5. **One world size, one reliability distribution, one kind of change, one reversal.** A change that is never
   reversed makes RECALL pure cost; the SHAM arm and R2 measure part of that, not all of it.
