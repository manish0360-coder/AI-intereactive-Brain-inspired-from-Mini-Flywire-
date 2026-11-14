# Pre-freeze review bundle: draft specifications CF-05 and CF-05b

> Generated from the repository at commit `405417f`. **Neither experiment has been run.** Both specifications are drafts; their drivers refuse to run until the owner marks them frozen. This review is wanted *before* that, so that design flaws can still be fixed.

## How to read this bundle

The cover below was written by the party whose designs are under review. **Treat every statement in it as a claim to check against the appendices**, which are the draft specifications, the source code and the earlier results, verbatim, each with the SHA-256 of its file. An earlier outside review of this project mostly restated the cover it was given and contained factual errors that the appendices would have corrected; please work from the appendices.

**What is wanted.** Find what is wrong with the two designs while they can still be changed: unfair comparisons, criteria that cannot fail or cannot pass, confounds, missing controls, and conclusions the designs could not support whatever the data say. Agreement is not the goal.

**Please answer every numbered question in section 4**, each with: a verdict (sound / sound with caveats / weak / wrong), one to three sentences of reasoning that cite an appendix, and the concrete change you would require before freezing. Then give a ranked list of the five most serious problems, and say plainly whether each gate should be frozen as drafted, frozen after named changes, or not run.

## 1. Background in one page

A small reinforcement-learning testbed in plain JavaScript. Worlds are random connected graphs (24 nodes, 30 edges, maximum degree 4) with hidden per-edge reliabilities. The agent receives only `{node, nActions, goal}` and returns an action index; node labels and action order are hidden permutations. An attempted move succeeds with the edge's hidden probability, otherwise the agent stays. Every agent run on a world shares the same per-edge random streams. The unit of analysis is the world; contrasts are paired within world with 95% percentile-bootstrap intervals (10,000 resamples).

**The existing planner (MBVI3).** A learned tabular model (move probability per state-action pair with a pooled Beta prior across pairs, a mixture component for impassable exits, and per-pair change detection by two CUSUM statistics) planned over by value iteration to convergence at every step, with an optimistic value of 1 for outcomes never seen, and a greedy choice.

**What the previous experiment (CF-04, appendix G) found.** On a task where an edge on the route is blocked without notice and later reopened without notice, the planner adapts to the block within a few steps of the privileged reference (+6.5 steps [4.1, 9.1] over 15 episodes), but after the block is *removed* it stays on the detour: it crosses the reopened exit in 0.9 of 15 episodes and ends 40.1 steps behind the reference [32.5, 48.1] (55 worlds). An "executive" that arbitrated between the planner and Q-learning made things worse and was dropped. The project owner then asked for an investigation of whether an exploration bonus can recover the route, with a proper Dyna-Q+ baseline, with the cost of exploration measured in unchanged environments, and without assuming it would work.

## 2. What the development work found (before either specification was written)

Three families were searched on 20 development worlds with three settings each and one selection rule (lowest total steps over the task's CHANGE and SHAM arms). Figures are steps over the 15 episodes after the block is removed, candidate minus the existing planner; negative is better.

| Family | Best setting's effect | At stronger settings |
|---|---|---|
| Dyna-Q+ with a count model (the baseline) | +0.2 [-9.3, 9.2] | worse than the planner at every setting |
| BONUS: kappa * sqrt(tau) added to the planned value of every tried pair | -1.4 [-8.4, 4.7] | +61.8 steps worse overall, then wanders (1,626 capped episodes) |
| DECAY: belief about every untended pair fades toward the untried-pair belief | -3.0 [-9.8, 3.1] | +86.7 steps worse overall |
| RECALL: only exits the model declared worse are remembered and drift back | -12.4 [-23.4, -2.5] | similar across settings |

RECALL was invented after the first two failed. The owner therefore ruled: two separate gates; RECALL's setting re-selected on new tuning worlds; a task arm where the block is never removed; diagnostic arms to separate real recovery from repair of the change detector's false alarms; a larger-world repetition; and this outside review before any freeze. On the new tuning worlds RECALL at the same setting gave -18.6 [-27.1, -10.4] after the block is removed, and **+8.2 [5.7, 10.8] when the block is permanent**.

## 3. The two drafts

**CF-05 (appendix A)** tests BONUS as the pass/fail mechanism on 60 fresh worlds. Its own development data predict a null, and the specification says so: the expected verdict is NOT SUPPORTED.

**CF-05b (appendix B)** tests RECALL on 40 other fresh worlds. Its tuning data predict a benefit and a cost above the margin when the change is permanent, and the specification says so: the expected verdict is SUPPORTED AT A COST.

Both share one driver (appendix C) and the same seven criteria: benefit after the reversal (R1); no cost while blocked (R2), when the route never changes (R3), when the change is permanent (R4), or on four existing tasks (R5), each with a 10-step margin; better than Dyna-Q+ at two planning budgets (R6); infrastructure (R7).

## 4. Questions

**On CF-05 (the exploration bonus).**

1. Is it defensible to run a 60-world gate whose own development data predict a null? Or does the development grid (three settings, the best at the edge of the grid) mean the bonus was never given a fair chance?
2. Is kappa * sqrt(tau), added to every tried pair inside exact value iteration, a faithful version of the Dyna-Q+ idea? Is there a better-founded form of exploration bonus for this setting (for example a bonus scaled by the value at stake, or restricted to pairs whose reopening would shorten the planned route) that should be the one tested?
3. Is the Dyna-Q+ baseline (appendix F) implemented correctly and tuned fairly? Only kappa was searched; learning rate 0.5, exploration rate 0.1 and the planning budgets were fixed.
4. Is "20 planning updates per step" against "about 1,300 value-iteration backups per decision" a meaningful computational comparison, and is the matched-budget arm (1,300 updates per step) the right way to make it fair?

**On CF-05b (targeted recall).**

5. RECALL was designed after the other candidates failed, and its setting was the best of three on two sets of worlds. Are a separate gate, new tuning worlds and a fresh gate domain enough protection, or is the design still contaminated?
6. Do the two privileged diagnostic arms (RECALL_REALONLY, RECALL_FALSEONLY) actually separate "recovers a real reversal" from "repairs false alarms of the change detector"? Read appendix D (the agent) and appendix H (the model's change detection) before answering.
7. The specification predicts that criterion R4 (no cost when the change is permanent) will fail. Is a fixed 10-step margin the right criterion, or should the gate test a net benefit under a stated mix of permanent and reversed changes? What mix would be defensible?
8. Is RECALL a general mechanism or a solution fitted to this one task (one edge blocked, reversed after exactly 15 episodes)? What is the smallest additional condition that would tell these apart?
9. RECALL adds memory to the agent. The owner's stated objective is capability, not more modules. On the evidence so far, is it justified to test it at all, and what result should be required before it is adopted?

**On both.**

10. Statistical power: 60 and 40 worlds, smallest detectable effects of about 5.5 and 8.8 steps on the benefit, against a gap of 30-40 steps. Adequate? Are the cost criteria (upper bound of a 95% interval below 10 steps) adequately powered, or are they biased toward failing?
11. Episodes are capped at 200 steps and capped episodes count their cap. The specifications report capped-episode counts, medians and per-world win/loss counts beside every mean. Is that sufficient, or is a different primary statistic needed?
12. The percentile bootstrap over worlds is the basis of every pass/fail decision. Acceptable at n = 40 and n = 60?
13. The 10-step margin was inherited from an earlier experiment on a different task and is applied to windows of 15 and 30 episodes alike. Is that defensible?
14. Is the larger-world repetition (48 nodes, 20 worlds, reported only) worth including as drafted, or should it be a criterion, or dropped?
15. Is there a more important next experiment than either of these? The planner is near the reference everywhere except recovery after a reversal; all worlds are small and fully observed.
16. Anything in the source code (appendices C-F, H) that does not do what the specifications say it does?

---

# Appendices (verbatim)

## Appendix A. CF-05 DRAFT specification (exploration bonus)

File: `experiments/cf05/GATE_SPEC.md` · SHA-256 `4bc717d96492a639b951a81adbf2042e4c92d1d778bfab7a4a930bf2054ecb23` · 146 lines

````markdown
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
````

## Appendix B. CF-05b DRAFT specification (targeted recall)

File: `experiments/cf05b/GATE_SPEC.md` · SHA-256 `7e86996effa95f216da7215abbb519d7165adca216cbe9f0f230a816bc62e004` · 161 lines

````markdown
# CF-05b Gate Specification — targeted recall of exits that stopped working

**Status.** DRAFT for outside review and then the owner's approval. Not frozen. The driver refuses to run the
`gate5b` domain until this line reads "Frozen". No `gate5b` world has been run.

- Development evaluation gate, not confirmatory. Commits are local until the owner authorises a push.
- Separate from CF-05 by the owner's decision: CF-05 tests the exploration bonus; this gate tests RECALL, on its
  own new domain, and is to be run after CF-05 is recorded.

## Where this candidate came from

RECALL was not in the plan the owner approved. It was added after the development grid showed that the two blanket
mechanisms (an exploration bonus, and belief decay over every pair) recover nothing at their best setting and cost
steps when stronger, and that Dyna-Q+ is worse than the existing planner at every setting
([CF-05 draft](../cf05/GATE_SPEC.md)). A candidate invented after seeing the others fail is exactly the kind of
result that tends not to replicate, which is why it has its own gate, a setting chosen on new worlds, a
permanent-change arm, and two diagnostic arms.

## The question

When an exit the agent relied on stops working and later works again, can the agent recover it by remembering what
that exit used to do, **without** paying for it when nothing changed or when the change is permanent?

## The mechanism under test: RECALL (`cognitive/mind/v4/agent.mjs`, mode `RECALL`)

The existing planner MBVI3, unchanged, plus:

1. When the model's change detector declares that an exit **got worse**, the agent stores the prediction it held
   for that exit just before (where it led and how reliably).
2. For such exits only, the belief used for planning is a mixture: (1 − w) × current belief + w × remembered
   belief, with w = 1 − (1 − hazard)^τ and τ = steps since the exit was last tried. **hazard = 0.01.**
3. The memory is dropped the first time the exit moves again.

The model's counts are never modified. Exits that never worked, and exits in use, are untouched. This is a memory
of one earlier state of one exit: the smallest form of the "context" idea in the roadmap.

## How the setting was chosen

On a tuning domain used for nothing else, `cf|tune5b|world|0…19` (not `dev`, not any gate domain), with the rule
fixed beforehand: the hazard with the lowest total steps over the CHANGE, SHAM and PERMANENT arms.

| Setting | CHANGE total | SHAM total | PERMANENT total | Sum (rule) | Phase D, against MBVI3 | PERMANENT, against MBVI3 |
|---|---|---|---|---|---|---|
| MBVI3 | 228.9 | 168.8 | 228.9 | 626.7 | — | — |
| RECALL 0.003 | 219.3 | 167.7 | 231.2 | 618.1 | −10.2 [−17.4, −3.3] | +2.3 [1.4, 3.2] |
| **RECALL 0.01** | 214.4 | 163.9 | 237.2 | **615.5** | **−18.6 [−27.1, −10.4]** | **+8.2 [5.7, 10.8]** |
| RECALL 0.03 | 216.1 | 163.7 | 249.1 | 628.8 | −23.2 [−33.4, −13.3] | +20.1 [14.1, 26.6] |
| ORACLE | 192.8 | 163.3 | 222.6 | 578.7 | (MBVI3 − ORACLE on phase D: +30.3 [22.1, 39.0]) | |

The same setting had been best on `dev` under the earlier two-arm rule (phase D −12.4 [−23.4, −2.5]). It is still
a best-of-three choice, now on two sets of worlds; the gate domain is a third.

**The tuning run already shows a trade-off.** A stronger setting recovers more and costs more when the change is
permanent. At the chosen setting the permanent-change cost is +8.2 steps with an upper bound of 10.8, which is
**above** this gate's 10-step margin. On the tuning worlds R4 would fail.

## Task and arms

Task E4B as in CF-05: hidden reliabilities U[0.5, 1]; 600 exploration steps; 30 training episodes; then phase C
(15 episodes) and phase D (15 episodes), capped at 200 steps.

| Task arm | Before phase C | Before phase D | Measures |
|---|---|---|---|
| CHANGE | An edge on a shortest route is blocked | The block is removed | Benefit after reversal; cost while blocked |
| SHAM | An edge on no shortest route is blocked | That block is removed | Cost when the route never changes |
| PERMANENT | An edge on a shortest route is blocked | It stays blocked | Cost when the change is permanent |

| Agent arm | Setting | Role |
|---|---|---|
| MBVI3 | The existing planner | Comparator |
| **RECALL** | hazard 0.01 | **Primary** |
| RECALL_H003, RECALL_H03 | hazard 0.003, 0.03 | Sensitivity (reported) |
| **RECALL_REALONLY** | hazard 0.01; remembers **only** the edge the task manipulated | Diagnostic, privileged (reported) |
| **RECALL_FALSEONLY** | hazard 0.01; remembers everything **except** that edge | Diagnostic, privileged (reported) |
| DYNAQP, DYNAQP_MATCHED | Dyna-Q+ with a count model, κ 0.001, at 20 and 1,300 planning updates per step | Baseline for R6 |
| ORACLE | Privileged reference | Reported |

**The two diagnostic arms.** On `dev`, RECALL needed fewer steps than the planner even in the SHAM arm, where the
route never changes. One explanation: the change detector sometimes declares a change that did not happen and
throws away good counts, and RECALL puts them back. The diagnostic arms are told which edge was really manipulated
(ground truth, handed over by the task; they are not learners and are labelled privileged):

- RECALL_REALONLY isolates recovery from the real change.
- RECALL_FALSEONLY isolates repair of false alarms.

Reading, fixed now: if REALONLY carries the phase-D benefit and FALSEONLY carries none, RECALL recovers a reversed
change. If FALSEONLY carries a benefit, part of RECALL is a repair of the v3 change detector, and the right fix
for that part is in the detector.

## Fairness of the comparison

| Concern | How it is handled |
|---|---|
| Tuning | RECALL and Dyna-Q+ each got three settings; RECALL's on new tuning worlds, Dyna-Q+'s on `dev` |
| Seeds | Every arm shares the environment's per-edge random streams and the same layout in each world |
| Computational fairness | Work is counted for every agent; Dyna-Q+ runs at its usual budget and at a budget matched to the planner's. RECALL's backups per decision are reported beside MBVI3's (1,353 against 1,335 on `dev`) |
| Privileged arms | Only the two diagnostic arms and ORACLE receive ground truth; none of them is in a criterion |

## Statistical plan

| Item | Value |
|---|---|
| Domain / worlds | `gate5b`; `cf|gate5b|world|0…39`, never used before. Larger-world repetition: `cf|gate5b|large|0…19` |
| Sample size | The rule n = max(20, ⌈(2.8·SD/mean)²⌉) on the tuning differences of R1 (mean 18.6, SD 19.8) gives 20. **n = 40 is used**: twice the rule, because the cost criteria (R2–R4) need tighter intervals than the benefit does |
| Smallest detectable effect | R1: 2.8 × 19.8 / √40 ≈ **8.8 steps** (80% power, two-sided 5%); the room available is about 30–40 steps |
| Power of the cost criteria | Stated plainly: with a true permanent-change cost near 8 steps and a 10-step margin, R4 will fail unless the true cost is clearly below 10. That is the point of the criterion, not a flaw in the sample size |
| Unit and intervals | The world; paired differences; percentile bootstrap, 10,000 resamples, 95% |
| Truncation | Capped episodes are counted per agent and arm and reported beside the verdict. MBVI3 and RECALL had none on `dev` or on the tuning worlds |
| Robust summaries | Median and per-world counts beside every mean |
| Multiplicity | Six criteria, all required for SUPPORTED; reported contrasts are uncorrected and cannot change the verdict |

## Criteria

| Criterion | Statistic | Rule |
|---|---|---|
| **R1** benefit | `return`, CHANGE: MBVI3 − RECALL | mean > 0 and lower bound > 0 |
| **R2** no cost while blocked | `postAll`, CHANGE: RECALL − MBVI3 | upper bound < 10 steps |
| **R3** no cost when unchanged | `metric`, SHAM: RECALL − MBVI3 | upper bound < 10 steps |
| **R4** no cost when permanent | `metric`, PERMANENT: RECALL − MBVI3 | upper bound < 10 steps |
| **R5** no regression | RECALL − MBVI3 on E1 EXPLORED, E3, E1S EXPLORED, E2P PRE | every upper bound < 10 steps |
| **R6** beats the textbook baseline | `metric`, CHANGE: Dyna-Q+ − RECALL | lower bound > 0 at both planning budgets |
| **R7** infrastructure | Two in-process runs identical; all 150 tests pass | all |

| Verdict | Condition | Consequence, fixed now |
|---|---|---|
| SUPPORTED | R1–R7 | Independent verification (below), then a proposal to the owner. Nothing enters the agent before that |
| SUPPORTED AT A COST | R1 holds; some of R2–R6 fail (listed) | **Not adopted as it stands.** Benefit and cost are reported together, with the net effect over the three arms. Whether a trade of that size is wanted is the owner's decision, on the numbers |
| NOT SUPPORTED | R1 fails | Not adopted. The dev and tuning effects are recorded as not replicated |
| INVALID | R7 fails | None |

**Reported:** every window for every arm in all three task arms, with mean, median and capped-episode count; the
net effect over the three arms; RECALL − ORACLE on `return`; how often each arm crosses the reopened exit and tries
the manipulated edge; exits remembered and changes declared per run; the two diagnostic arms on every window; the
sensitivity settings; work per step; the larger-world repetition (48 nodes, 60 edges, 1,200 exploration steps, 20
worlds; ORACLE, MBVI3, RECALL; all three arms).

**Pre-declared expectations** (reported, not tested): R1 holds; R4 fails or is marginal, so the most likely verdict
is **SUPPORTED AT A COST**; RECALL closes part of the gap to the reference and not all of it; REALONLY carries
most of the phase-D benefit; on larger worlds the sign of the benefit is the same.

## Independent verification, if R1 holds

1. Reproduce the row hash from a clean clone of the freeze commit.
2. An adversarial review by a reviewer that did not write the design, asked whether RECALL gains from something
   other than recovery.
3. An outside review (Gemini) of the results and source.

## Things a reviewer should doubt

1. **Selection.** The setting is a best-of-three choice on two sets of worlds. The tuning effect is stronger than
   the dev effect, which is not what regression to the mean predicts, and may be luck.
2. **The benefit needs the change to be reversed.** In the PERMANENT arm RECALL is pure cost. How often changes
   reverse in a world decides whether RECALL is worth having, and this task fixes that by design. The three arms
   are reported separately so no single mixture is implied; the "net over three arms" figure assumes equal shares
   and should be read as an illustration.
3. **One reversal after 15 episodes.** A reversal after 100 episodes, or never, or several times, is untested.
4. **It adds memory to the agent.** If it passes, the claim is "recovers a reopened exit on this task at this
   cost", nothing wider.
5. **Possible detector repair.** See the diagnostic arms.
6. **A 10-step margin inherited from CF-03**, applied to windows of different lengths (15 and 30 episodes).
````

## Appendix C. Shared gate driver (criteria as they will be executed)

File: `experiments/cf05/gate_lib.mjs` · SHA-256 `46d769df86b22943cf4ef31aae33795056aff6a1b6097453e9233eb3a1e899b9` · 179 lines

```js
// ==========================================================
// CF-05 / CF-05b — shared gate driver (each gate's run_gate.mjs supplies a configuration; criteria are in its GATE_SPEC.md)
// ==========================================================
// One mechanism (config.primary) is tested against the existing planner MBVI3 on task E4B, in three arms:
//   CHANGE     an edge on the route is blocked, then reopened      -> benefit (R1) and cost while blocked (R2)
//   SHAM       an edge off the route is blocked, then reopened     -> cost when the route never changes (R3)
//   PERMANENT  the edge on the route is blocked and stays blocked  -> cost when the change is permanent (R4)
// plus the existing battery (R5: no regression) and the Dyna-Q+ baseline at two planning budgets (R6).
//   R1  return window, CHANGE:   steps(MBVI3) - steps(primary), mean > 0 and lower bound > 0
//   R2  postAll, CHANGE:         steps(primary) - steps(MBVI3), upper bound < MARGIN
//   R3  metric, SHAM:            steps(primary) - steps(MBVI3), upper bound < MARGIN
//   R4  metric, PERMANENT:       steps(primary) - steps(MBVI3), upper bound < MARGIN
//   R5  battery:                 steps(primary) - steps(MBVI3) upper bound < MARGIN on E1 EXPLORED, E3, E1S EXPLORED, E2P PRE
//   R6  metric, CHANGE:          steps(Dyna-Q+) - steps(primary), lower bound > 0 at both planning budgets
//   R7  infrastructure:          two in-process runs identical, all tests pass
// Verdict: INVALID (R7) / NOT SUPPORTED (R1 fails) / SUPPORTED AT A COST (R1 holds; some of R2-R6 fail, listed) /
//          SUPPORTED (R1-R7).
// Reported, never pass/fail: every other arm against MBVI3 on every window and arm; medians and per-world counts;
// capped episodes; work per step; the larger-world repetition; the net effect over the three arms.
// ==========================================================
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { generateWorld } from '../../cognitive/testbed/worlds.mjs';
import { runE4B, E4B_ARMS } from '../../cognitive/testbed/task_e4b.mjs';
import { E4_PARAMS } from '../../cognitive/testbed/task_e4.mjs';
import { runTaskV1 } from '../../cognitive/testbed/tasks_v1.mjs';
import { runE2P } from '../../cognitive/testbed/task_e2p.mjs';
import { makeAgentForV5 } from '../../cognitive/testbed/registry_v5.mjs';
import { pairedBootstrap } from '../../cognitive/testbed/stats.mjs';
import { runAllTests } from '../../cognitive/tests/run_all.mjs';
import { runTestFiles } from '../../cognitive/tests/run_list.mjs';

export const MARGIN = 10;   // steps
const BATTERY = [['E1', 'EXPLORED'], ['E3', 'STD'], ['E1S', 'EXPLORED'], ['E2P', 'PRE']];
const WINDOWS = ['stable', 'post', 'postAll', 'return', 'returnLast'];
const TEST_FILES = ['test_e2p.mjs', 'test_core.mjs', 'test_invariance.mjs', 'test_v1.mjs', 'test_mind.mjs', 'test_mind_v3.mjs', 'test_arb.mjs', 'test_recovery.mjs'];
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sd = (xs) => { if (xs.length < 2) return null; const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };
const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

/**
 * config: { id, here, gateDomain, gateWorlds, primary, arms: { name: [kind, params, options?] }, r6: [names],
 *           large: { worlds, nodes, edges, exploreSteps, arms: [names] }, cleanPaths: [repo paths] }
 * An arm's options may hold { diagnostic: 'recallOnly' | 'recallExcept' }: such an arm is told the manipulated edge.
 */
export async function runGate(config) {
  const ROOT = path.resolve(config.here, '..', '..');
  const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
  const die = (m) => { console.error(`${config.id} run_gate refused: ${m}`); process.exit(2); };
  const git = (...a) => execFileSync('git', ['-C', ROOT, ...a]).toString().trim();
  const DOMAIN = arg('--domain');
  if (!['dev', config.gateDomain].includes(DOMAIN)) die(`--domain must be dev or ${config.gateDomain}`);
  const isGate = DOMAIN === config.gateDomain;
  const N = isGate ? config.gateWorlds : Number(arg('--worlds', '20'));
  const NL = isGate ? config.large.worlds : Number(arg('--large-worlds', '0'));
  const SPEC = path.join(config.here, 'GATE_SPEC.md');
  const OUT = isGate ? path.join(config.here, 'results', `${config.gateDomain}_result.json`) : path.resolve(arg('--out') ?? '');
  if (!isGate) {
    const rel = path.relative(ROOT, OUT);
    if (!arg('--out') || (!rel.startsWith('..') && !path.isAbsolute(rel))) die('dev runs need --out outside the repository');
  } else {
    if (!fs.existsSync(SPEC)) die('GATE_SPEC.md is missing');
    if (!/^\*\*Status\.\*\* Frozen/m.test(fs.readFileSync(SPEC, 'utf8'))) die('GATE_SPEC.md is not marked Frozen (it is still a draft for review)');
    const dirty = git('status', '--porcelain', '--untracked-files=all', '--', ...config.cleanPaths);
    if (dirty) die(`files are not all committed and clean:\n${dirty}`);
    if (fs.existsSync(OUT)) die(`the ${config.gateDomain} domain has already been run`);
  }
  const ARMS = config.arms;
  const agentFor = (name) => (kind, env, label, params, context) => {
    const [k, p, o] = ARMS[name];
    const extra = o?.diagnostic && context ? { [o.diagnostic]: context.manipulatedPairs } : {};
    return makeAgentForV5(k, env, label, { ...p, ...extra });
  };
  const e4Row = (name, world, worldLabel, arm, exploreSteps) => ({ name, ...runE4B({ world, worldLabel, kind: ARMS[name][0], arm, makeAgent: agentFor(name), ...(exploreSteps ? { exploreSteps } : {}) }) });

  function matrix(domain) {
    const e4 = [], battery = [], large = [];
    for (let i = 0; i < N; i++) {
      const worldLabel = `cf|${domain}|world|${i}`, world = generateWorld(worldLabel);
      for (const arm of E4B_ARMS) for (const name of Object.keys(ARMS)) e4.push(e4Row(name, world, worldLabel, arm));
      for (const name of ['MBVI3', config.primary]) for (const [task, arm] of BATTERY) {
        const r = task === 'E2P' ? runE2P({ world, worldLabel, kind: ARMS[name][0], arm, makeAgent: agentFor(name) }) : runTaskV1({ task, world, worldLabel, kind: ARMS[name][0], arm, makeAgent: agentFor(name) });
        battery.push({ name, cell: `${task}.${arm}`, world: r.world, metric: r.metric, censored: r.censored, excluded: r.excluded ?? false });
      }
    }
    for (let i = 0; i < NL; i++) {
      const worldLabel = `cf|${domain}|large|${i}`, world = generateWorld(worldLabel, { nodes: config.large.nodes, edges: config.large.edges, maxDegree: 4 });
      for (const arm of E4B_ARMS) for (const name of config.large.arms) large.push(e4Row(name, world, worldLabel, arm, config.large.exploreSteps));
    }
    return { e4, battery, large };
  }

  function analyse({ e4, battery, large }, domain) {
    const S = (x) => `cf|stats|${domain}|${config.id}|${x}`;
    const value = (w) => (r) => (w === 'metric' ? r.metric : r.windows[w]);
    const cellOf = (rows) => (arm, name) => new Map(rows.filter((r) => r.arm === arm && r.name === name && !r.excluded).map((r) => [r.world, r]));
    const pairedOf = (rows, tag) => (arm, a, b, w) => {
      const cell = cellOf(rows), A = cell(arm, a), B = cell(arm, b);
      const d = [...A.keys()].filter((x) => B.has(x)).sort().map((x) => value(w)(A.get(x)) - value(w)(B.get(x)));
      return { contrast: `${a} - ${b} (${arm}.${w})`, sd: sd(d), median: median(d), fewer: d.filter((x) => x < 0).length, more: d.filter((x) => x > 0).length, equal: d.filter((x) => x === 0).length, mde80: d.length > 1 ? 2.8 * sd(d) / Math.sqrt(d.length) : null, ...pairedBootstrap(d, S(`${tag}|${arm}|${a}|${b}|${w}`)) };
    };
    const paired = pairedOf(e4, 'e4'), cell = cellOf(e4), X = config.primary;
    const out = { primary: {}, others: {}, battery: {}, large: {}, means: {}, excludedWorlds: [...new Set(e4.filter((r) => r.excluded).map((r) => r.world))] };
    out.primary.R1_benefit = paired('CHANGE', 'MBVI3', X, 'return');
    out.primary.R2_cost_while_blocked = paired('CHANGE', X, 'MBVI3', 'postAll');
    out.primary.R3_cost_when_unchanged = paired('SHAM', X, 'MBVI3', 'metric');
    out.primary.R4_cost_when_permanent = paired('PERMANENT', X, 'MBVI3', 'metric');
    for (const b of config.r6) out.primary[`R6_${b}_minus_primary`] = paired('CHANGE', b, X, 'metric');
    out.primary.remaining_gap_primary_minus_ORACLE = paired('CHANGE', X, 'ORACLE', 'return');
    out.primary.gap_MBVI3_minus_ORACLE = paired('CHANGE', 'MBVI3', 'ORACLE', 'return');
    // net effect of the primary over the three arms, equally weighted, paired by world
    {
      const maps = E4B_ARMS.map((arm) => [cell(arm, X), cell(arm, 'MBVI3')]);
      const worlds = [...maps[0][0].keys()].filter((w) => maps.every(([a, b]) => a.has(w) && b.has(w))).sort();
      const d = worlds.map((w) => maps.reduce((s, [a, b]) => s + a.get(w).metric - b.get(w).metric, 0));
      out.primary.net_three_arms_primary_minus_MBVI3 = { contrast: `${X} - MBVI3, sum of metric over CHANGE + SHAM + PERMANENT`, sd: sd(d), median: median(d), fewer: d.filter((x) => x < 0).length, more: d.filter((x) => x > 0).length, equal: d.filter((x) => x === 0).length, ...pairedBootstrap(d, S('net')) };
    }
    for (const name of Object.keys(ARMS).filter((n) => !['ORACLE', 'MBVI3', X].includes(n))) {
      out.others[name] = { return: paired('CHANGE', name, 'MBVI3', 'return'), postAll: paired('CHANGE', name, 'MBVI3', 'postAll'), changeMetric: paired('CHANGE', name, 'MBVI3', 'metric'), sham: paired('SHAM', name, 'MBVI3', 'metric'), permanent: paired('PERMANENT', name, 'MBVI3', 'metric') };
    }
    for (const [task, arm] of BATTERY) {
      const key = `${task}.${arm}`, pick = (n) => new Map(battery.filter((r) => r.name === n && r.cell === key && !r.excluded).map((r) => [r.world, r])), A = pick(X), B = pick('MBVI3');
      const d = [...A.keys()].filter((x) => B.has(x)).sort().map((x) => A.get(x).metric - B.get(x).metric);
      out.battery[key] = { contrast: `${X} - MBVI3 (${key})`, sd: sd(d), median: median(d), meanPrimary: mean([...A.values()].map((r) => r.metric)), meanMBVI3: mean([...B.values()].map((r) => r.metric)), ...pairedBootstrap(d, S(`bat|${key}`)) };
    }
    if (large.length) {
      const pl = pairedOf(large, 'large'), cl = cellOf(large);
      out.large = { worlds: NL, nodes: config.large.nodes, edges: config.large.edges, exploreSteps: config.large.exploreSteps, benefit_return: pl('CHANGE', 'MBVI3', X, 'return'), cost_while_blocked: pl('CHANGE', X, 'MBVI3', 'postAll'), cost_when_unchanged: pl('SHAM', X, 'MBVI3', 'metric'), cost_when_permanent: pl('PERMANENT', X, 'MBVI3', 'metric'), gap_MBVI3_minus_ORACLE: pl('CHANGE', 'MBVI3', 'ORACLE', 'return'), cappedEpisodes: Object.fromEntries(config.large.arms.map((n) => [n, E4B_ARMS.reduce((s, arm) => s + [...cl(arm, n).values()].reduce((a, r) => a + r.censored, 0), 0)])), excludedWorlds: [...new Set(large.filter((r) => r.excluded).map((r) => r.world))] };
    }
    for (const arm of E4B_ARMS) for (const name of Object.keys(ARMS)) {
      const xs = [...cell(arm, name).values()], work = xs.map((r) => r.secondary.compute).filter(Boolean), rec = xs.map((r) => r.secondary.recovery).filter(Boolean), model = xs.map((r) => r.secondary.model).filter(Boolean);
      out.means[`${arm}.${name}`] = {
        ...Object.fromEntries(WINDOWS.map((w) => [w, mean(xs.map((r) => r.windows[w]))])), metric: mean(xs.map((r) => r.metric)), medianMetric: median(xs.map((r) => r.metric)),
        cappedEpisodes: xs.reduce((s, r) => s + r.censored, 0), worldsWithCappedEpisode: xs.filter((r) => r.censored > 0).length,
        usedReopened: mean(xs.map((r) => r.secondary.usedReopened)), triedManipulated: mean(xs.map((r) => r.secondary.triedManipulated)),
        workPerStep: work.length ? mean(work.map((c) => c.backupsPerDecision ?? c.updatesPerStep ?? 0)) : null, workUnit: work.length ? (work[0].backupsPerDecision !== undefined ? 'value-iteration backups per decision' : 'planning updates per step') : null,
        remembered: rec.length && rec[0].remembered !== undefined ? mean(rec.map((x) => x.remembered)) : null,
        changesDeclaredWorse: model.length && model[0].changesDown !== undefined ? mean(model.map((x) => x.changesDown)) : null,
      };
    }
    return out;
  }

  const t1 = await runAllTests(), t2 = await runTestFiles(TEST_FILES);
  const tests = { passed: t1.passed + t2.passed, total: t1.total + t2.total, failed: [...t1.failed, ...t2.failed].map((f) => `${f.file} :: ${f.name}`) };
  const runA = matrix(DOMAIN), runB = matrix(DOMAIN);
  const hashA = sha(JSON.stringify(runA)), hashB = sha(JSON.stringify(runB));
  const analysis = analyse(runA, DOMAIN);
  const P = analysis.primary;
  const criteria = {
    R1_benefit: P.R1_benefit.n > 0 && P.R1_benefit.mean > 0 && P.R1_benefit.lo > 0,
    R2_no_cost_while_blocked: P.R2_cost_while_blocked.n > 0 && P.R2_cost_while_blocked.hi < MARGIN,
    R3_no_cost_when_unchanged: P.R3_cost_when_unchanged.n > 0 && P.R3_cost_when_unchanged.hi < MARGIN,
    R4_no_cost_when_permanent: P.R4_cost_when_permanent.n > 0 && P.R4_cost_when_permanent.hi < MARGIN,
    R5_no_regression: Object.values(analysis.battery).every((c) => c.n > 0 && c.hi < MARGIN),
    R6_beats_dyna_q_plus: config.r6.every((b) => P[`R6_${b}_minus_primary`].lo > 0),
  };
  const cappedInCriteria = ['MBVI3', config.primary].flatMap((n) => E4B_ARMS.map((a) => analysis.means[`${a}.${n}`].cappedEpisodes)).reduce((a, b) => a + b, 0);
  const infra = { determinism: hashA === hashB, tests: tests.failed.length === 0 && tests.total > 0 };
  const infraOk = Object.values(infra).every(Boolean);
  const others = Object.entries(criteria).filter(([k, v]) => k !== 'R1_benefit' && !v).map(([k]) => k);
  const label = config.id.toUpperCase().replace('CF05', 'CF-05');
  const verdict = !infraOk ? `${label} INVALID` : !criteria.R1_benefit ? `${label} NOT SUPPORTED (R1_benefit)` : others.length ? `${label} SUPPORTED AT A COST (${others.join(', ')})` : `${label} SUPPORTED`;
  const result = {
    evidence: `${label} recovery after a reversed change, primary mechanism ${config.primary} (development, not confirmatory)`, domain: DOMAIN, worlds: N, largeWorlds: NL,
    environment: { node: process.version, platform: `${process.platform}-${process.arch}`, head: git('rev-parse', 'HEAD'), filesClean: isGate },
    specSha256: fs.existsSync(SPEC) ? sha(fs.readFileSync(SPEC)) : null,
    parameters: { task: E4_PARAMS, taskArms: E4B_ARMS, primary: config.primary, arms: ARMS, r6: config.r6, large: config.large, margin: MARGIN, bootstrapResamples: 10000, reliability: 'U[0.5, 1] per edge', world: { nodes: 24, edges: 30, maxDegree: 4 } },
    tests, infra, criteria, cappedEpisodesInCriterionAgents: cappedInCriteria, verdict, analysis, rowsSha256: hashA, rows: runA,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(result, null, 1)}\n`);
  console.log(JSON.stringify({ verdict, infra, tests: `${tests.passed}/${tests.total}`, criteria, cappedEpisodesInCriterionAgents: cappedInCriteria }, null, 1));
  process.exit(infraOk ? 0 : 1);
}
```

## Appendix C2. CF-05 configuration

File: `experiments/cf05/run_gate.mjs` · SHA-256 `6d4a1262adb83a94e0976b400a1346c79b64c35f1bd5694505f372ddcf98a20e` · 35 lines

```js
// ==========================================================
// CF-05 — the exploration bonus (criteria in experiments/cf05/GATE_SPEC.md; driver in gate_lib.mjs)
// ==========================================================
//   node experiments/cf05/run_gate.mjs --domain dev   --out <file outside the repository> [--worlds N] [--large-worlds N]
//   node experiments/cf05/run_gate.mjs --domain gate5
// Primary mechanism: BONUS (kappa * sqrt(tau) added to the planned value of every tried pair).  The targeted RECALL
// candidate is NOT in this gate; it has its own (experiments/cf05b).
// ==========================================================
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runGate } from './gate_lib.mjs';

export const CONFIG = Object.freeze({
  id: 'cf05', here: path.dirname(fileURLToPath(import.meta.url)), gateDomain: 'gate5',
  gateWorlds: 60,                                      // fixed before the gate5 run; see GATE_SPEC.md
  primary: 'BONUS',
  arms: Object.freeze({                                // settings fixed on the dev domain by the rule in GATE_SPEC.md
    ORACLE: ['ORACLE', {}],
    MBVI3: ['MBVI3', {}],
    BONUS: ['MBVI4_BONUS', { kappa: 0.001 }],
    BONUS_K003: ['MBVI4_BONUS', { kappa: 0.003 }],     // a stronger bonus (reported)
    DECAY: ['MBVI4_DECAY', { hazard: 0.0003 }],        // blanket belief decay (reported)
    DYNAQ: ['DYNAQ', {}],
    DYNAQP: ['DYNAQP', { kappa: 0.001 }],
    DYNAQP_MATCHED: ['DYNAQP_MATCHED', { kappa: 0.001 }],
    MBVI3_CH0005: ['MBVI3', { changeHazard: 0.0005 }], // change-detection prior rate 4x lower (reported)
    MBVI3_CH008: ['MBVI3', { changeHazard: 0.008 }],   // change-detection prior rate 4x higher (reported)
  }),
  r6: Object.freeze(['DYNAQP', 'DYNAQP_MATCHED']),
  large: Object.freeze({ worlds: 20, nodes: 48, edges: 60, exploreSteps: 1200, arms: Object.freeze(['ORACLE', 'MBVI3', 'BONUS']) }),
  cleanPaths: Object.freeze(['cognitive', 'experiments/cf05']),
});

await runGate(CONFIG);
```

## Appendix C3. CF-05b configuration

File: `experiments/cf05b/run_gate.mjs` · SHA-256 `396efe8dbd2a9a37e5eb6d2e554b1101cc473423a1c9d5b4960d3b0c12b1aad2` · 36 lines

```js
// ==========================================================
// CF-05b — targeted recall (criteria in experiments/cf05b/GATE_SPEC.md; driver in ../cf05/gate_lib.mjs)
// ==========================================================
//   node experiments/cf05b/run_gate.mjs --domain dev    --out <file outside the repository> [--worlds N] [--large-worlds N]
//   node experiments/cf05b/run_gate.mjs --domain gate5b
// Primary mechanism: RECALL (remember exits the model declared worse; let the planning belief drift back).
// Two DIAGNOSTIC arms are told which edge the task manipulated (ground truth; privileged; reported only):
//   RECALL_REALONLY   remembers only the manipulated edge        -> recovery from a real change, nothing else
//   RECALL_FALSEONLY  remembers everything except that edge      -> repair of the change detector's false alarms only
// ==========================================================
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runGate } from '../cf05/gate_lib.mjs';

export const CONFIG = Object.freeze({
  id: 'cf05b', here: path.dirname(fileURLToPath(import.meta.url)), gateDomain: 'gate5b',
  gateWorlds: 40,                                      // fixed before the gate5b run; see GATE_SPEC.md
  primary: 'RECALL',
  arms: Object.freeze({                                // hazard selected on the tune5b domain by the rule in GATE_SPEC.md
    ORACLE: ['ORACLE', {}],
    MBVI3: ['MBVI3', {}],
    RECALL: ['MBVI4_RECALL', { hazard: 0.01 }],
    RECALL_H003: ['MBVI4_RECALL', { hazard: 0.003 }],  // sensitivity (reported)
    RECALL_H03: ['MBVI4_RECALL', { hazard: 0.03 }],    // sensitivity (reported)
    RECALL_REALONLY: ['MBVI4_RECALL', { hazard: 0.01 }, { diagnostic: 'recallOnly' }],
    RECALL_FALSEONLY: ['MBVI4_RECALL', { hazard: 0.01 }, { diagnostic: 'recallExcept' }],
    DYNAQP: ['DYNAQP', { kappa: 0.001 }],
    DYNAQP_MATCHED: ['DYNAQP_MATCHED', { kappa: 0.001 }],
  }),
  r6: Object.freeze(['DYNAQP', 'DYNAQP_MATCHED']),
  large: Object.freeze({ worlds: 20, nodes: 48, edges: 60, exploreSteps: 1200, arms: Object.freeze(['ORACLE', 'MBVI3', 'RECALL']) }),
  cleanPaths: Object.freeze(['cognitive', 'experiments/cf05', 'experiments/cf05b']),
});

await runGate(CONFIG);
```

## Appendix D. Candidate agent MBVI4 (modes BONUS, DECAY, RECALL)

File: `cognitive/mind/v4/agent.mjs` · SHA-256 `f28179f6b62206a2d8d1dc4b402c8f2e0d0917c1ea1b626882bcacc2a0323926` · 109 lines

```js
// ==========================================================
// CF-05 candidate — MBVI4: the MBVI3 planner with a way to re-test what it has stopped trying
// ==========================================================
// The measured gap (CF-04): after a block is removed the planner stays on the detour, because it re-tests an exit
// it believes dead in 0.9 of 15 episodes.  Nothing in MBVI3 ever makes an abandoned exit attractive again.
// MBVI4 is MBVI3 (world model v3, value iteration, optimism for the unknown, greedy choice) plus ONE of two
// candidate mechanisms, selected by params.mode.  It is a candidate under test, used by nothing else.
//
// Both use tau(s, a) = real steps since the pair (s, a) was last tried.  Pairs never tried are left to the model's
// existing optimism and are not affected.
//
//   BONUS  an additive bonus in the planned value, the Dyna-Q+ idea moved into value iteration:
//              Q(s, a) += kappa * sqrt(tau)
//
//   DECAY  no bonus; the planner's BELIEF about a pair fades toward what it believes about an untried pair.  If
//          anything in the world can change at rate `hazard` per step, then after tau steps without looking the
//          pair has changed with probability  w = 1 - (1 - hazard)^tau, and the planning distribution is
//              (1 - w) * model's prediction for the pair  +  w * model's prediction for an untried pair
//          A dead exit therefore regains some probability of moving, to an unknown place valued optimistically,
//          and is re-tested when that beats the route in use.  The model's own counts are not modified.
//
//   RECALL targeted, not blanket.  When the model declares that an exit GOT WORSE, the agent keeps the belief it
//          held about that exit just before (where it led, how reliably).  Only for such exits, the planning
//          belief drifts back toward the remembered one:  (1 - w) * current + w * remembered, with the same
//          w = 1 - (1 - hazard)^tau.  Exits that never worked, and exits still in use, are untouched, so the
//          agent re-tests what is worth re-testing instead of everything.  The memory is dropped when the exit
//          moves again.
//
//   NONE   neither (must reproduce MBVI3; asserted by tests).
//
// inspect().recovery reports the mode and the mean tau of the pairs the agent chose (how stale its choices were).
// ==========================================================
import { argmaxRandomTie } from '../../testbed/agent_util.mjs';
import { makeWorldModel3, WM3_DEFAULTS } from '../v3/world_model.mjs';
import { qValues4, valueIteration4 } from './planner.mjs';

export const MBVI4_DEFAULTS = Object.freeze({ gamma: 0.95, budget: 100, theta: 1e-6, vOpt: 1, mode: 'NONE', kappa: 0.003, hazard: 0.001, ...WM3_DEFAULTS });
const UNTRIED = '__untried__';   // a key no observation can produce: the model's prediction for a pair never tried

export function makeMBVI4({ rng, params = {}, kind = 'MBVI4' }) {
  const P = { ...MBVI4_DEFAULTS, ...params };
  if (!['NONE', 'BONUS', 'DECAY', 'RECALL'].includes(P.mode)) throw new Error(`unknown recovery mode ${P.mode}`);
  const model = makeWorldModel3(P);
  const V = new Map();
  const last = new Map();                    // `${s}|${a}` -> clock value when the pair was last tried
  const former = new Map();                  // RECALL: `${s}|${a}` -> the prediction held just before the exit was declared worse
  let cue, clock = 0;
  const compute = { decisions: 0, sweeps: 0, backups: 0, budgetHits: 0 };
  const recovery = { chosen: 0, tauSum: 0, remembered: 0 };
  // DIAGNOSTIC switches, used only by arms that are told which change was real (ground truth, so such arms are
  // privileged and are never learner arms): remember only the listed pairs, or every pair except the listed ones.
  const mayRemember = (key) => (!P.recallOnly || P.recallOnly.includes(key)) && !(P.recallExcept && P.recallExcept.includes(key));
  const tauOf = (s, a) => { const t = last.get(`${s}|${a}`); return t === undefined ? null : clock - t; };
  const bonusOf = P.mode === 'BONUS' ? (s, a) => { const tau = tauOf(s, a); return tau === null ? 0 : P.kappa * Math.sqrt(tau); } : undefined;
  const predictOf = P.mode === 'DECAY' ? (s, a) => {
    const p = model.predict(s, a), tau = tauOf(s, a);
    if (tau === null || tau === 0) return p;
    const w = 1 - (1 - P.hazard) ** tau, q = model.predict(UNTRIED, 0);
    return { self: (1 - w) * p.self + w * q.self, outcomes: p.outcomes.map(([lab, x]) => [lab, (1 - w) * x]), unknown: (1 - w) * p.unknown + w * q.unknown, N: p.N };
  } : P.mode === 'RECALL' ? (s, a) => {
    const p = model.predict(s, a), f = former.get(`${s}|${a}`), tau = tauOf(s, a);
    if (!f || tau === null || tau === 0) return p;
    const w = 1 - (1 - P.hazard) ** tau, merged = new Map(p.outcomes.map(([lab, x]) => [lab, (1 - w) * x]));
    for (const [lab, x] of f.outcomes) merged.set(lab, (merged.get(lab) ?? 0) + w * x);
    return { self: (1 - w) * p.self + w * f.self, outcomes: [...merged], unknown: (1 - w) * p.unknown + w * f.unknown, N: p.N };
  } : undefined;
  const planOpts = () => ({
    gamma: P.gamma, vOpt: P.vOpt, predictOf, bonusOf,
    rewardOf: cue !== null ? (s2) => (s2 === cue ? 1 : 0) : (s2) => model.rewardProb(s2),
    doneOf: cue !== null ? (s2) => (s2 === cue ? 1 : 0) : (s2) => model.doneProb(s2),
  });
  return {
    kind,
    act(obs) {
      model.visit(obs.node, obs.nActions);
      if (obs.goal !== cue) { cue = obs.goal; V.clear(); }
      const opts = planOpts();
      const r = valueIteration4(model, V, { budget: P.budget, theta: P.theta, ...opts });
      compute.decisions++; compute.sweeps += r.sweeps; compute.backups += r.backups; if (!r.converged) compute.budgetHits++;
      const a = argmaxRandomTie(qValues4(model, V, obs.node, opts), rng);
      const tau = tauOf(obs.node, a);
      if (tau !== null) { recovery.chosen++; recovery.tauSum += tau; }
      return a;
    },
    observe(tr) {
      const { obs, action, reward, next, done } = tr;
      model.visit(next.node, next.nActions);
      const key = `${obs.node}|${action}`;
      const recall = P.mode === 'RECALL';
      const held = recall ? model.predict(obs.node, action) : null, worse = recall ? model.stats().changesDown : 0;
      model.update(obs.node, action, next.node, reward, done);
      if (recall) {
        if (next.node !== obs.node) former.delete(key);                         // it works again: nothing to recall
        else if (model.stats().changesDown > worse && held.outcomes.length && mayRemember(key)) { former.set(key, held); recovery.remembered++; }
      }
      clock++;
      last.set(key, clock);
    },
    inspect() {
      return {
        compute: { ...compute, backupsPerDecision: compute.decisions ? compute.backups / compute.decisions : 0, sweepsPerDecision: compute.decisions ? compute.sweeps / compute.decisions : 0, budgetHitShare: compute.decisions ? compute.budgetHits / compute.decisions : 0, budget: P.budget },
        recovery: { mode: P.mode, meanTauOfChosen: recovery.chosen ? recovery.tauSum / recovery.chosen : null, remembered: recovery.remembered, remembering: former.size },
        model: { states: model.states().size, ...model.stats(), ...model.hyper() },
      };
    },
    _model: model, _V: V,                     // test access only
  };
}
```

## Appendix D2. Planner with the bonus and belief hooks

File: `cognitive/mind/v4/planner.mjs` · SHA-256 `944c8f399327e3db0bd3f432d9ca51896ed8dd8409e8b4a622ef0bdd233a0fb2` · 43 lines

```js
// ==========================================================
// CF-05 candidate — value iteration with two optional hooks (cognitive/core/planner.mjs is frozen and unedited)
// ==========================================================
// Identical to the core planner when both hooks are absent (asserted by tests/test_recovery.mjs):
//   Q(s,a) = p(SELF) * gamma * V(s)
//          + sum over known outcomes s'  p(s') * [ R(s') + gamma * (1 - D(s')) * V(s') ]
//          + p(UNKNOWN) * vOpt
//          + bonusOf(s, a)                                    (hook 1: an additive bonus, default 0)
// where the predictive distribution comes from predictOf(s, a) (hook 2: default model.predict), so a caller can
// plan with beliefs that differ from the model's raw posterior.
// ==========================================================

export function qValue4(model, V, s, a, { gamma, vOpt, rewardOf, doneOf, predictOf, bonusOf }) {
  const p = predictOf ? predictOf(s, a) : model.predict(s, a);
  let q = p.self * gamma * (V.get(s) ?? vOpt) + p.unknown * vOpt;
  for (const [s2, pr] of p.outcomes) q += pr * (rewardOf(s2) + gamma * (1 - doneOf(s2)) * (V.get(s2) ?? vOpt));
  return bonusOf ? q + bonusOf(s, a) : q;
}

export function qValues4(model, V, s, opts) {
  const w = model.widthOf(s);
  return Array.from({ length: w }, (_, a) => qValue4(model, V, s, a, opts));
}

export function valueIteration4(model, V, { budget, theta, ...opts }) {
  let sweeps = 0, backups = 0, delta = Infinity;
  const states = [...model.states()];
  while (sweeps < budget) {
    delta = 0;
    for (const [s, w] of states) {
      let best = -Infinity;
      for (let a = 0; a < w; a++) { const q = qValue4(model, V, s, a, opts); if (q > best) best = q; }
      backups += w;
      const old = V.get(s);
      delta = Math.max(delta, old === undefined ? Infinity : Math.abs(best - old));
      V.set(s, best);
    }
    sweeps++;
    if (delta < theta) break;
  }
  return { sweeps, backups, converged: delta < theta };
}
```

## Appendix E. Task E4B (CHANGE, SHAM, PERMANENT arms)

File: `cognitive/testbed/task_e4b.mjs` · SHA-256 `16fef2fcf0063378726bb6578fcec035fa2097cf8f034b26b9deb4bf631caf24` · 60 lines

```js
// ==========================================================
// CF-05 testbed — task E4B: task E4 with a third arm and a size option (task_e4.mjs is frozen and unedited)
// ==========================================================
// E4B uses E4's layout, reliabilities, phases, windows and seed labels unchanged, so the CHANGE and SHAM arms give
// exactly the rows of E4 (asserted by tests/test_recovery.mjs).  It adds:
//
//   arm PERMANENT   the edge on the route is blocked before phase C and is NEVER reopened.  Phase D then runs with
//                   the block still in place.  Any mechanism that re-tests abandoned exits is pure cost here: this
//                   arm measures what such a mechanism pays when a change is permanent.
//
//   exploreSteps    the length of the unrewarded pre-exposure, so the same task can be run on larger worlds
//                   (the caller generates the world; E4's 600 steps are for 24 nodes).
//
//   context         makeAgent receives a fifth argument { manipulatedPairs }: the (observation label, action index)
//                   pairs of the edge the arm manipulates, in both directions.  This is ground truth.  It exists
//                   only so that DIAGNOSTIC arms can be told which change was real; an agent arm that reads it is
//                   privileged and must be labelled as such.  Learner arms ignore it.
// ==========================================================
import { GraphEnv } from './env.mjs';
import { runEpisode, runSteps } from './runner.mjs';
import { layoutE4, reliabilitiesE4, E4_PARAMS } from './task_e4.mjs';

export const E4B_ARMS = Object.freeze(['CHANGE', 'SHAM', 'PERMANENT']);

const sum = (xs) => xs.reduce((a, b) => a + b, 0);

export function runE4B({ world, worldLabel, kind, arm, params = {}, makeAgent, exploreSteps = E4_PARAMS.exploreSteps }) {
  if (!E4B_ARMS.includes(arm)) throw new Error(`E4B has no arm ${arm}`);
  const L = layoutE4(world, worldLabel);
  if (!L) return { task: 'E4B', world: worldLabel, kind, arm, excluded: true };
  const P = E4_PARAMS;
  const env = new GraphEnv(world, { seedLabel: `${worldLabel}|E4|env`, maxSteps: P.cap });
  for (const [u, v, p] of reliabilitiesE4(world, worldLabel)) env.setReliability(u, v, p);
  const edge = arm === 'SHAM' ? L.sham : L.blocked;
  const [u, v] = edge;
  const manipulatedPairs = [`${world.labelOf[u]}|${world.exitOrder[u].indexOf(v)}`, `${world.labelOf[v]}|${world.exitOrder[v].indexOf(u)}`];
  const agent = makeAgent(kind, env, `${worldLabel}|E4|agent`, params[kind] ?? {}, Object.freeze({ manipulatedPairs }));
  env.setRewardNode(null); env.setCue(null);
  runSteps(env, agent, { total: exploreSteps, episodeLength: P.exploreEpisodeLength });
  env.setRewardNode(L.goal); env.setCue(L.goal);
  const run = (n) => Array.from({ length: n }, () => runEpisode(env, agent, { start: L.start }));
  const train = run(P.trainEpisodes);
  env.block(...edge);
  const post = run(P.postEpisodes);
  const firstReturn = env.inspect().episode + 1;
  if (arm !== 'PERMANENT') env.unblock(...edge);
  const back = run(P.returnEpisodes);
  const usedReopened = env.trace().filter(([ep, , s, a, s2]) => ep >= firstReturn && s !== s2 && ((s === u && world.exitOrder[s][a] === v) || (s === v && world.exitOrder[s][a] === u))).length;
  const triedManipulated = env.trace().filter(([ep, , s, a]) => ep >= firstReturn && ((s === u && world.exitOrder[s][a] === v) || (s === v && world.exitOrder[s][a] === u))).length;
  const steps = (xs) => sum(xs.map((r) => r.steps));
  const info = typeof agent.inspect === 'function' ? agent.inspect() : {};
  return {
    task: 'E4B', world: worldLabel, kind, arm, layout: L,
    windows: { stable: steps(train.slice(-P.stableEpisodes)), post: steps(post.slice(0, P.postWindow)), postAll: steps(post), return: steps(back), returnLast: steps(back.slice(-P.stableEpisodes)) },
    metric: steps(post) + steps(back),
    censored: [...train, ...post, ...back].filter((r) => r.truncated).length,
    secondary: { usedReopened, triedManipulated, control: info.control ?? null, compute: info.compute ?? null, model: info.model ?? null, recovery: info.recovery ?? null },
  };
}
```

## Appendix E2. Task E4 (layout, reliabilities, phases; frozen)

File: `cognitive/testbed/task_e4.mjs` · SHA-256 `c7e8b06f3c411272bf6bde76d269b7c9c835e015f4044a502b32a0d082cb1b52` · 91 lines

```js
// ==========================================================
// CF-04 testbed — task E4: hidden change and its reversal, on stochastic worlds
// ==========================================================
// The agent is never told that anything changed.  Edge reliabilities are hidden and drawn U[0.5, 1] per edge (the
// E1S distribution, stream `${world}|E4|rel`).  Layout: start S, goal G, a blocked edge e on a shortest S->G path
// whose removal lengthens the route, and a sham edge on no shortest path (the E2' layout rule, stream
// `${world}|E4|layout`).
//
// Phases:
//   A  pre-exposure   600 steps, no reward, no cue, 50-step episodes from the start stream
//   B  training       goal G cued and rewarded, TRAIN episodes from S
//   C  change         the arm's manipulation, then POST episodes from S         (regime B)
//   D  reversal       the manipulation is undone, then RETURN episodes from S   (regime A again)
// Arms:
//   CHANGE   block e before C, unblock e before D
//   SHAM     block the sham edge before C, unblock it before D (the shortest route never changes)
// Windows (steps summed over the episodes of the window; a truncated episode counts its cap):
//   post      the first POST_WINDOW episodes of C   — how fast the agent adapts to the block
//   postAll   all episodes of C
//   return    all episodes of D                     — whether the agent recovers the short route once it reopens
//   stable    the last STABLE episodes of B         — performance before anything changes
// Seeds: environment `${world}|E4|env`, agent `${world}|E4|agent` (shared by every arm and agent kind: common random
// numbers).  Agents that expose inspect().control have it copied into the row.
// ==========================================================
import { GraphEnv } from './env.mjs';
import { distancesTo, edgeKey } from './worlds.mjs';
import { makeStream, shuffled } from './rng.mjs';
import { runEpisode, runSteps } from './runner.mjs';

export const E4_PARAMS = Object.freeze({ exploreSteps: 600, exploreEpisodeLength: 50, trainEpisodes: 30, postEpisodes: 15, returnEpisodes: 15, postWindow: 3, stableEpisodes: 5, cap: 200, minDistance: 3 });
export const E4_ARMS = Object.freeze(['CHANGE', 'SHAM']);

const onShortest = (dist, s, g, d, [u, v]) => dist[s][u] + 1 + dist[g][v] === d || dist[s][v] + 1 + dist[g][u] === d;

export function layoutE4(world, worldLabel) {
  const rnd = makeStream(`${worldLabel}|E4|layout`);
  const nodes = Array.from({ length: world.n }, (_, i) => i);
  const dist = nodes.map((t) => distancesTo(world, t));
  const pairs = shuffled(nodes.flatMap((s) => nodes.map((g) => [s, g])), rnd);
  for (const [s, g] of pairs) {
    const d = dist[g][s];
    if (d < E4_PARAMS.minDistance) continue;
    const blocked = shuffled(world.edges.filter((e) => onShortest(dist, s, g, d, e)), rnd)
      .find(([u, v]) => { const d2 = distancesTo(world, g, new Set([edgeKey(u, v)]))[s]; return d2 > d; });
    if (!blocked) continue;
    const sham = shuffled(world.edges.filter((e) => !onShortest(dist, s, g, d, e)), rnd)[0];
    if (!sham) continue;
    return { start: s, goal: g, blocked, sham, distance: d, detourDistance: distancesTo(world, g, new Set([edgeKey(...blocked)]))[s] };
  }
  return null;
}

export function reliabilitiesE4(world, worldLabel) {
  const rnd = makeStream(`${worldLabel}|E4|rel`);
  return world.edges.map(([u, v]) => [u, v, 0.5 + 0.5 * rnd()]);
}

const sum = (xs) => xs.reduce((a, b) => a + b, 0);

export function runE4({ world, worldLabel, kind, arm, params = {}, makeAgent }) {
  if (!E4_ARMS.includes(arm)) throw new Error(`E4 has no arm ${arm}`);
  const L = layoutE4(world, worldLabel);
  if (!L) return { task: 'E4', world: worldLabel, kind, arm, excluded: true };
  const P = E4_PARAMS;
  const env = new GraphEnv(world, { seedLabel: `${worldLabel}|E4|env`, maxSteps: P.cap });
  for (const [u, v, p] of reliabilitiesE4(world, worldLabel)) env.setReliability(u, v, p);
  const agent = makeAgent(kind, env, `${worldLabel}|E4|agent`, params[kind] ?? {});
  const edge = arm === 'CHANGE' ? L.blocked : L.sham;
  env.setRewardNode(null); env.setCue(null);
  runSteps(env, agent, { total: P.exploreSteps, episodeLength: P.exploreEpisodeLength });
  env.setRewardNode(L.goal); env.setCue(L.goal);
  const run = (n) => Array.from({ length: n }, () => runEpisode(env, agent, { start: L.start }));
  const train = run(P.trainEpisodes);
  env.block(...edge);
  const post = run(P.postEpisodes);
  const firstReturn = env.inspect().episode + 1;
  env.unblock(...edge);
  const back = run(P.returnEpisodes);
  const [u, v] = edge;
  const usedReopened = env.trace().filter(([ep, , s, a, s2]) => ep >= firstReturn && s !== s2 && ((s === u && world.exitOrder[s][a] === v) || (s === v && world.exitOrder[s][a] === u))).length;
  const steps = (xs) => sum(xs.map((r) => r.steps));
  const info = typeof agent.inspect === 'function' ? agent.inspect() : {};
  return {
    task: 'E4', world: worldLabel, kind, arm, layout: L,
    windows: { stable: steps(train.slice(-P.stableEpisodes)), post: steps(post.slice(0, P.postWindow)), postAll: steps(post), return: steps(back), returnLast: steps(back.slice(-P.stableEpisodes)) },
    metric: steps(post) + steps(back),
    censored: [...train, ...post, ...back].filter((r) => r.truncated).length,
    secondary: { usedReopened, control: info.control ?? null, compute: info.compute ?? null, model: info.model ?? null },
  };
}
```

## Appendix F. Dyna-Q+ baseline with a count model

File: `cognitive/baselines/dynaq_plus.mjs` · SHA-256 `6f4f3743e5a82b29ca24035518846552f4b0503fbb3586a3573737bf0ab5a5e6` · 84 lines

```js
// ==========================================================
// DYNAQP — Dyna-Q+ with a count model (Sutton & Barto 2018, section 8.3), the textbook baseline for recovery after
// a change
// ==========================================================
// The existing DYNAQ baseline keeps only the LAST outcome of each (node, action) and never re-tests anything.
// Dyna-Q+ adds the two things a fair model-free-with-model baseline needs here:
//
//   1. A count model.  For every experienced (node, action): how often each outcome followed (staying counts as an
//      outcome).  Planning samples the outcome from those counts, so stochastic edges are represented.
//   2. A bonus for actions not tried recently.  A planning update on (s, a) uses the reward
//          r + kappa * sqrt(tau)        tau = real steps since (s, a) was last tried in the real world
//      so an action left alone for long becomes worth re-testing.  As in the book, actions never tried at a visited
//      state may also be drawn in planning: they are modelled as leading back to the same state with reward 0, with
//      tau counted from the state's first visit.
//
// Real updates use the real reward without a bonus.  Reward semantics in planning are DYNAQ's: with a cue g,
// r = 1[next == g] and termination on arrival at g (the cue's declared meaning, CD-005); without a cue, the last
// observed reward and termination for that outcome.  Action choice is epsilon-greedy on Q, as for QL and DYNAQ.
// inspect().compute reports real steps and planning updates, so that work can be compared across agents.
// ==========================================================
import { argmaxRandomTie, makeTable } from '../testbed/agent_util.mjs';

export const DYNAQP_DEFAULTS = Object.freeze({ alpha: 0.5, gamma: 0.95, epsilon: 0.1, k: 20, kappa: 0.003 });

export function makeDynaQPlus({ rng, params = {}, kind = 'DYNAQP' }) {
  const { alpha, gamma, epsilon, k, kappa } = { ...DYNAQP_DEFAULTS, ...params };
  const Q = makeTable();
  const widths = new Map();          // node -> number of actions
  const firstSeen = new Map();       // node -> real step at which it was first observed
  const nodes = [];                  // visited nodes in first-visit order
  const model = new Map();           // `${node}|${a}` -> { n, last, out: Map(next -> { c, reward, done }) }
  const compute = { realSteps: 0, planningUpdates: 0 };
  let t = 0;
  const see = (node, width) => { if (!widths.has(node)) { widths.set(node, width); firstSeen.set(node, t); nodes.push(node); } };
  const update = (node, goal, action, reward, next, done) => {
    const r = Q.row(node, goal, widths.get(node));
    const target = reward + (done ? 0 : gamma * Math.max(...Q.row(next, goal, widths.get(next))));
    r[action] += alpha * (target - r[action]);
  };
  function sampleOutcome(m) {
    let u = rng() * m.n;
    for (const [next, o] of m.out) { u -= o.c; if (u < 0) return [next, o]; }
    const last = [...m.out].at(-1);
    return last;
  }
  return {
    kind,
    act(obs) {
      see(obs.node, obs.nActions);
      const r = Q.row(obs.node, obs.goal, obs.nActions);
      if (rng() < epsilon) return Math.floor(rng() * obs.nActions);
      return argmaxRandomTie(r, rng);
    },
    observe(tr) {
      const { obs, action, reward, next, done } = tr;
      see(obs.node, obs.nActions); see(next.node, next.nActions);
      t++; compute.realSteps++;
      update(obs.node, obs.goal, action, reward, next.node, done);
      const key = `${obs.node}|${action}`;
      const m = model.get(key) ?? { n: 0, last: t, out: new Map() };
      m.n++; m.last = t;
      const o = m.out.get(next.node) ?? { c: 0, reward: 0, done: false };
      o.c++; o.reward = reward; o.done = done;
      m.out.set(next.node, o); model.set(key, m);
      const g = obs.goal;
      for (let i = 0; i < k; i++) {
        const node = nodes[Math.floor(rng() * nodes.length)];
        const a = Math.floor(rng() * widths.get(node));
        const pm = model.get(`${node}|${a}`);
        let nx = node, r = 0, d = false, tau = t - firstSeen.get(node);
        if (pm) {
          const [sampled, out] = sampleOutcome(pm);
          nx = sampled; tau = t - pm.last;
          r = g !== null ? (nx === g && nx !== node ? 1 : 0) : out.reward;
          d = g !== null ? nx === g && nx !== node : out.done;
        }
        update(node, g, a, r + kappa * Math.sqrt(tau), nx, d);
        compute.planningUpdates++;
      }
    },
    inspect: () => ({ compute: { ...compute, updatesPerStep: compute.realSteps ? compute.planningUpdates / compute.realSteps : 0 }, modelPairs: model.size }),
  };
}
```

## Appendix F2. Agent registry (arm definitions)

File: `cognitive/testbed/registry_v5.mjs` · SHA-256 `18d984fdd7b9f077af74fd84ab516d9252c15cecb545e3c05300888919f112f7` · 47 lines

```js
// ==========================================================
// CF-05 testbed — agent registry v5: the v4 agents plus the Dyna-Q+ baseline and the MBVI4 recovery candidates
// ==========================================================
// The privileged-channel rule is the CF-01 rule (runner.mjs PRIVILEGED, unchanged): only ORACLE receives the oracle.
// Earlier kinds are built by their unchanged factories.  Tunable parameters (kappa, hazard, k) come from the
// caller's params for the kind; the variants below fix only what defines the kind.
// ==========================================================
import { makeStream } from './rng.mjs';
import { PRIVILEGED } from './runner.mjs';
import { AGENTS_V4 } from './registry_v4.mjs';
import { makeDynaQPlus } from '../baselines/dynaq_plus.mjs';
import { makeMBVI4 } from '../mind/v4/agent.mjs';

export const DYNAQP_VARIANTS = Object.freeze({
  DYNAQP: Object.freeze({ k: 20 }),                // the planning budget of the existing DYNAQ baseline
  DYNAQP_MATCHED: Object.freeze({ k: 1300 }),      // about the planner's backups per decision (1,320 in CF-04)
});
export const MBVI4_VARIANTS = Object.freeze({
  MBVI4_NONE: Object.freeze({ mode: 'NONE' }),     // must reproduce MBVI3
  MBVI4_BONUS: Object.freeze({ mode: 'BONUS' }),
  MBVI4_DECAY: Object.freeze({ mode: 'DECAY' }),
  MBVI4_RECALL: Object.freeze({ mode: 'RECALL' }),   // drift back only for exits that were declared worse
});
export const BASELINE_FILES = Object.freeze(['dynaq_plus.mjs']);
export const BASELINE_ALLOWED = Object.freeze(['../testbed/agent_util.mjs']);
export const MIND4_FILES = Object.freeze(['agent.mjs', 'planner.mjs']);
export const MIND4_ALLOWED = Object.freeze(['../../testbed/agent_util.mjs', '../v3/world_model.mjs', './planner.mjs']);
export const AGENTS_V5 = Object.freeze({
  ...AGENTS_V4,
  ...Object.fromEntries(Object.entries(DYNAQP_VARIANTS).map(([k, v]) => [k, (opts) => makeDynaQPlus({ ...opts, params: { ...v, ...opts.params }, kind: k })])),
  ...Object.fromEntries(Object.entries(MBVI4_VARIANTS).map(([k, v]) => [k, (opts) => makeMBVI4({ ...opts, params: { ...opts.params, ...v }, kind: k })])),
});

export function agentOptionsV5(kind, env, rngLabel, params = {}) {
  const opts = { rng: makeStream(rngLabel), params };
  if (PRIVILEGED.includes(kind)) opts.oracle = Object.freeze({ bestAction: () => env.oracleBestAction() });
  return opts;
}

export function makeAgentForV5(kind, env, rngLabel, params = {}) {
  const factory = AGENTS_V5[kind];
  if (!factory) throw new Error(`unknown agent kind ${kind}`);
  const agent = factory(agentOptionsV5(kind, env, rngLabel, params));
  if (agent.privileged && !PRIVILEGED.includes(kind)) throw new Error(`${kind} claims privilege it is not granted`);
  return agent;
}
```

## Appendix G. CF-04 results record (where the 40-step gap was measured), with its amendment

File: `experiments/cf04/results/RESULTS.md` · SHA-256 `a1dec0112581c04da7b1e4ea32957c195f0a90befacb2d4ab7c01123e94fe222` · 137 lines

````markdown
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

## Amendment after the outside review (2026-11-14)

The text above is left as first written. An outside review (Gemini) and its reconciliation against the record
(`research/external/CF03C_CF04_GEMINI_REVIEW_RECONCILIATION.md`) lead to these corrections. The gate verdict is
unchanged; the corrections govern how it may be cited.

1. **Scope of the conclusion.** The supported statement is: *arbitration between this planner and tabular
   Q-learning, driven by this reliability signal, gave no benefit, and at θ = 0.05 cost 13.8 steps
   [7.1, 20.1].* The habit controller was not a competent fallback, so this is not a test of arbitration in
   general. "Harmful" applies to θ = 0.05 only; at θ = 0.1 the arbiter is neutral overall.
2. **What was not tested.** The usual case for a model-free controller is that it is cheaper. Computation was not
   counted (the planner used about 1,320 backups per decision). Arbitration to save computation is untested.
3. **A stronger habit arm would not obviously change the result.** Dyna-Q ran alone in this gate and needed
   +115.3 steps more than the planner [93.5, 138.1]. Arbitration with a Dyna-based arm was not run.
4. **Not the cause.** The review attributed the failure to noise-driven handoffs. Criterion A3 contradicts that:
   in the sham arm the habit acted in 14.2% of decisions at a cost of +0.3 steps [−2.4, 2.7]. The cost arises
   while the block is in place, when the two controllers' policies differ most.
5. **Truncation.** The planner, ARB, ARB_T10 and RANDSWITCH had no capped episodes in 55 worlds, so criteria A1–A3
   are unaffected by the 200-step cap. Contrasts involving QL (233 capped episodes), the planner without change
   detection (28) and DYNAQ (5) are understated.
6. **Medians and counts**, added from the recorded rows: ARB is worse than the planner in 46 worlds and better in
   9 (median difference +16.0); worse than RANDSWITCH in 35 and better in 20 (median +7.0); ARB_T10 is worse than
   the planner in 34 and better in 18.

By the owner's decision of 2026-11-14, arbitration is removed from the integration roadmap for now. Its
implementation (`cognitive/mind/arb/`) and this evidence are kept.

## Consequences (fixed in the specification before the run)

1. **Arbitration is not built into the integrated agent.** Decision AD-2 is recorded as not supported by
   evidence at this scale. `cognitive/mind/arb/` stays in the repository as the tested mechanism and is used by
   nothing else.
2. The next mechanism question is the one the data point to: **recovery after a change is reversed**. The planner
   leaves 40 steps on the table because it never re-tests a dead exit. A candidate is noted (a bonus for exits not
   tried recently) and is **not** built here; it needs its own frozen gate, with a count-model Dyna-Q+ baseline.
````

## Appendix H. Learned world model v3 (pooled prior, impassable-exit mixture, CUSUM change detection)

File: `cognitive/mind/v3/world_model.mjs` · SHA-256 `4363d24935d437b133a06eee5642f7aa5fae84681aa78c9d38d15e2853a6537b` · 193 lines

```js
// ==========================================================
// CF-03c mind — learned world model v3: v2 with two defects repaired
// ==========================================================
// v2 (cognitive/mind/world_model.mjs) is frozen as the CF-03b model and is not edited.  The independent review of
// CF-03b reported two defects in it; both are reproduced by cognitive/tests/test_mind_v3.mjs against v2 and fixed
// here.  Everything not listed below is the v2 definition: the pooled Beta population over move success, the
// impassable-exit mixture, the pooled destination-novelty rate, the reward model and its local change-point.
//
// Defect 1 — inconsistent leave-one-out weights.
//   v2 accumulated the pooled totals (M, T) with each pair's weight computed under the PREVIOUS hyper-parameters,
//   and subtracted a pair's own contribution with a weight computed under the NEW ones.  For a pair that has never
//   moved the two weights differ, so the leave-one-out mean could leave [0, 1]; a never-moved pair then received
//   P(stay) > 1 and a negative UNKNOWN mass.
//   v3: the empirical-Bayes step is iterated to a fixed point (at most emIterations passes), and each pair's weight
//   is STORED in the same pass that builds the totals.  The leave-one-out mean subtracts exactly the stored weight,
//   so it is a ratio of sums of non-negative terms and stays in [0, 1].
//
// Defect 2 — a single ordinary failure reset a reliable pair.
//   v2 cleared a pair's counts when N >= resetMinN and one observation had predictive probability < resetTau.  A
//   pair with about 35 successes predicts P(stay) < 0.05, so one legitimate failure of a 0.98 edge wiped it.
//   v3: change detection accumulates evidence.  Each pair keeps two CUSUM statistics, for "this exit got worse" and
//   "this exit got better", against the alternative that the outcome now happens with probability changeAlt:
//       g = max(0, g + log( alt(x) / p_model(x) ))        x = the observed outcome, p_model from BEFORE the update
//   A change is declared when its posterior odds exceed 1 under a prior change rate changeHazard per attempt:
//       g > log( (1 - changeHazard) / changeHazard )
//   One surprising outcome cannot reach the threshold unless the model was almost certain (as after many
//   deterministic successes, where a block is then detected on the first failure).  On a declared change the pair's
//   counts become the observations of the run that raised the statistic (the estimated post-change data), instead
//   of being cleared.  Statistics accumulate only once the pair has changeMinN observations.
//
// Ablation switches (all default on): poolMove (the pooled move-success prior), poolDest (the pooled novelty rate),
// piBlock = 0 (no impassable-exit component), resets (no change detection), globalRewardReset.
// ==========================================================
import { lgammaV3 as lgamma } from './numerics.mjs';

export const WM3_DEFAULTS = Object.freeze({
  poolMove: true, poolDest: true, hyperMean0: 0.5, hyperN0: 1, strength0: 2, strengthGrid: Object.freeze([1, 2, 4, 8, 16, 32, 64]),
  emIterations: 25, piBlock: 0.05, kappa: 0.25,
  resets: true, changeHazard: 0.002, changeAlt: 0.9, changeMinN: 5,
  beta0: 0.1, rewardResetMinN: 5, rewardResetTau: 0.05, globalRewardReset: false,
});

/** log marginal likelihood of m moves in n attempts (a given order) under Beta(a, b). */
export function logBetaBinomial(m, n, a, b) {
  return lgamma(m + a) + lgamma(n - m + b) - lgamma(n + a + b) - lgamma(a) - lgamma(b) + lgamma(a + b);
}

const emptyRun = () => ({ g: 0, N: 0, nMove: 0, out: new Map() });

export function makeWorldModel3(params = {}) {
  const P = { ...WM3_DEFAULTS, ...params };
  const width = new Map();              // state label -> number of actions (observed on arrival)
  const pairs = new Map();              // `${s}|${a}` -> { N, nMove, out, keep, down, up }
  const arrive = new Map();             // label -> { n, r1, d1 }
  const cache = new Map();              // `${s}|${a}` -> { version, value }
  const stats = { changesDown: 0, changesUp: 0, rewardResets: 0, globalRewardResets: 0, updates: 0, emPasses: 0 };
  const m0 = P.hyperMean0 * P.hyperN0;
  const threshold = Math.log((1 - P.changeHazard) / P.changeHazard);
  let hyper = { mu: P.hyperMean0, S: P.strength0, M: 0, T: 0, nu: P.kappa };
  let version = 0;

  /** Posterior weight of "impassable" for k failures and no move, under population (mu, S). */
  function blockWeight(nMove, k, mu, S) {
    if (P.piBlock <= 0 || nMove > 0) return 0;
    let pk = 1;
    for (let j = 0; j < k; j++) pk *= (S * (1 - mu) + j) / (S + j);
    return P.piBlock / (P.piBlock + (1 - P.piBlock) * pk);
  }

  /** Empirical Bayes to a fixed point.  Stored q.keep and the totals (M, T) always come from the same pass. */
  function refresh() {
    let E = 0, R = 0;
    for (const q of pairs.values()) if (q.nMove) { E += q.out.size - 1; R += q.nMove - 1; }
    const nu = P.poolDest ? (E + P.kappa) / (R + 1) : P.kappa;
    if (!P.poolMove) {
      for (const q of pairs.values()) q.keep = 1;
      hyper = { mu: P.hyperMean0, S: P.strength0, M: 0, T: 0, nu };
      return;
    }
    const active = [...pairs.values()].filter((q) => q.N > 0);
    let mu = hyper.mu, S = hyper.S, M = 0, T = 0;
    for (let it = 0; it < P.emIterations; it++) {
      stats.emPasses++;
      M = 0; T = 0;
      for (const q of active) { q.keep = 1 - blockWeight(q.nMove, q.N, mu, S); M += q.keep * q.nMove; T += q.keep * q.N; }
      const mu2 = (M + m0) / (T + P.hyperN0);
      let S2 = P.strength0;
      if (active.length) {
        let best = -Infinity;
        for (const g of P.strengthGrid) {
          let ll = 0;
          for (const q of active) ll += q.keep * logBetaBinomial(q.nMove, q.N, g * mu2, g * (1 - mu2));
          if (ll > best + 1e-12) { best = ll; S2 = g; }
        }
      }
      const done = Math.abs(mu2 - mu) < 1e-10 && S2 === S;
      mu = mu2; S = S2;
      if (done) break;
    }
    hyper = { mu, S, M, T, nu };
  }

  function compute(s, a) {
    const q = pairs.get(`${s}|${a}`);
    const N = q ? q.N : 0, nMove = q ? q.nMove : 0, S = hyper.S;
    let mu = hyper.mu;
    if (P.poolMove && q && q.N) mu = (hyper.M - q.keep * nMove + m0) / (hyper.T - q.keep * N + P.hyperN0);   // leave-one-out
    const w = blockWeight(nMove, N, mu, S);
    const pMove = (1 - w) * (nMove + S * mu) / (N + S);
    const u = nMove ? Math.min(hyper.nu, P.kappa / (nMove + P.kappa)) : 1;
    const outcomes = nMove ? [...q.out].map(([lab, c]) => [lab, pMove * (1 - u) * c / nMove]) : [];
    return { self: 1 - pMove, outcomes, unknown: pMove * u, N, blocked: w };
  }

  function predict(s, a) {
    const key = `${s}|${a}`;
    const hit = cache.get(key);
    if (hit && hit.version === version) return hit.value;
    const value = compute(s, a);
    cache.set(key, { version, value });
    return value;
  }

  /** Predictive probability of the category the outcome s2 falls into (SELF, a known outcome, or UNKNOWN). */
  function probOf(s, a, s2) {
    const p = predict(s, a);
    if (s2 === s) return p.self;
    const hit = p.outcomes.find(([lab]) => lab === s2);
    return hit ? hit[1] : p.unknown;
  }

  const rewardProb = (s2) => { const r = arrive.get(s2); return r ? (r.r1 + P.beta0) / (r.n + P.beta0) : 1; };
  const doneProb = (s2) => { const r = arrive.get(s2); return r ? (r.d1 + P.beta0) / (r.n + P.beta0) : 1; };

  /** Advance one CUSUM statistic with this observation; returns true when a change is declared. */
  function cusum(run, llr, moved, s2) {
    const g = run.g + llr;
    if (g <= 0) { run.g = 0; run.N = 0; run.nMove = 0; run.out.clear(); return false; }
    run.g = g; run.N++;
    if (moved) { run.nMove++; run.out.set(s2, (run.out.get(s2) ?? 0) + 1); }
    return g > threshold;
  }

  function update(s, a, s2, reward, done) {
    stats.updates++;
    const key = `${s}|${a}`;
    let q = pairs.get(key);
    if (!q) { q = { N: 0, nMove: 0, out: new Map(), keep: 1, down: emptyRun(), up: emptyRun() }; pairs.set(key, q); }
    const moved = s2 !== s;
    let replaced = false;
    if (P.resets && q.N >= P.changeMinN) {
      const pSelf = Math.min(1 - 1e-12, Math.max(1e-12, predict(s, a).self));
      const alt = P.changeAlt;
      const worse = cusum(q.down, Math.log((moved ? 1 - alt : alt) / (moved ? 1 - pSelf : pSelf)), moved, s2);
      const better = cusum(q.up, Math.log((moved ? alt : 1 - alt) / (moved ? 1 - pSelf : pSelf)), moved, s2);
      if (worse || better) {
        const run = worse ? q.down : q.up;
        if (worse) stats.changesDown++; else stats.changesUp++;
        q.N = run.N; q.nMove = run.nMove; q.out = new Map(run.out);       // the run already includes this observation
        q.down = emptyRun(); q.up = emptyRun();
        replaced = true;
      }
    }
    if (!replaced) { q.N++; if (moved) { q.nMove++; q.out.set(s2, (q.out.get(s2) ?? 0) + 1); } }
    if (moved) {
      const r = reward > 0 ? 1 : 0, d = done ? 1 : 0;
      const prev = arrive.get(s2);
      if (prev && P.resets && prev.n >= P.rewardResetMinN) {
        const pr = r ? rewardProb(s2) : 1 - rewardProb(s2);
        if (pr < P.rewardResetTau) {
          if (P.globalRewardReset) { arrive.clear(); stats.globalRewardResets++; } else { arrive.delete(s2); stats.rewardResets++; }
        }
      }
      const cur = arrive.get(s2) ?? { n: 0, r1: 0, d1: 0 };
      cur.n++; cur.r1 += r; cur.d1 += d;
      arrive.set(s2, cur);
    }
    refresh();
    version++;
  }

  return {
    params: P,
    visit(s, w) { if (!width.has(s)) width.set(s, w); else if (width.get(s) !== w) throw new Error(`state ${s} changed its action count`); },
    states: () => width,
    widthOf: (s) => width.get(s),
    predict, probOf, rewardProb, doneProb, update,
    countOf: (s, a) => pairs.get(`${s}|${a}`)?.N ?? 0,
    hyper: () => ({ mu: hyper.mu, S: hyper.S, nu: hyper.nu }),
    stats: () => ({ ...stats }),
  };
}
```

## Appendix H2. Existing planner agent MBVI3

File: `cognitive/mind/v3/agent.mjs` · SHA-256 `27914ab1ff68e4887b7d7768fcdb66108849bb2e6aea2abf934bd8b9d9bef1e4` · 64 lines

```js
// ==========================================================
// CF-03c mind — MBVI3: the CF-03 planning agent on world model v3
// ==========================================================
// Identical to cognitive/mind/mbvi2.mjs except for the model it learns (v3/world_model.mjs).  The planner, the
// optimism value, the greedy choice, the cue semantics and the quality log are the same, so a difference between
// MBVI2 and MBVI3 on the same world and seeds is a difference between the v2 and v3 models.
// ==========================================================
import { argmaxRandomTie } from '../../testbed/agent_util.mjs';
import { qValues, valueIteration } from '../../core/planner.mjs';
import { makeWorldModel3, WM3_DEFAULTS } from './world_model.mjs';

export const MBVI3_DEFAULTS = Object.freeze({ gamma: 0.95, budget: 100, theta: 1e-6, vOpt: 1, ...WM3_DEFAULTS });

export function makeMBVI3({ rng, params = {}, kind = 'MBVI3' }) {
  const P = { ...MBVI3_DEFAULTS, ...params };
  const model = makeWorldModel3(P);
  const V = new Map();
  let cue;                                   // undefined until the first act, so the first cue always (re)plans
  const compute = { decisions: 0, sweeps: 0, backups: 0, budgetHits: 0 };
  const quality = { n: 0, ll: 0, llUniform: 0, bins: Array.from({ length: 10 }, () => ({ n: 0, pred: 0, hit: 0 })) };
  const planOpts = () => ({
    gamma: P.gamma, vOpt: P.vOpt,
    rewardOf: cue !== null ? (s2) => (s2 === cue ? 1 : 0) : (s2) => model.rewardProb(s2),
    doneOf: cue !== null ? (s2) => (s2 === cue ? 1 : 0) : (s2) => model.doneProb(s2),
  });
  return {
    kind,
    act(obs) {
      model.visit(obs.node, obs.nActions);
      if (obs.goal !== cue) { cue = obs.goal; V.clear(); }
      const opts = planOpts();
      const r = valueIteration(model, V, { budget: P.budget, theta: P.theta, ...opts });
      compute.decisions++; compute.sweeps += r.sweeps; compute.backups += r.backups; if (!r.converged) compute.budgetHits++;
      return argmaxRandomTie(qValues(model, V, obs.node, opts), rng);
    },
    observe(tr) {
      const { obs, action, reward, next, done } = tr;
      model.visit(next.node, next.nActions);
      if (model.countOf(obs.node, action) >= 1) {
        quality.n++;
        quality.ll += Math.log(model.probOf(obs.node, action, next.node));
        quality.llUniform += Math.log(1 / (obs.nActions + 1));
        const p = model.predict(obs.node, action);
        if (p.outcomes.length) {
          const [modal, pm] = p.outcomes.reduce((b, x) => (x[1] > b[1] ? x : b));
          const bin = quality.bins[Math.min(9, Math.floor(pm * 10))];
          bin.n++; bin.pred += pm; bin.hit += next.node === modal ? 1 : 0;
        }
      }
      model.update(obs.node, action, next.node, reward, done);
    },
    inspect() {
      const total = quality.bins.reduce((s, b) => s + b.n, 0);
      const ece = total ? quality.bins.reduce((s, b) => s + (b.n ? Math.abs(b.hit / b.n - b.pred / b.n) * b.n : 0), 0) / total : null;
      return {
        compute: { ...compute, backupsPerDecision: compute.decisions ? compute.backups / compute.decisions : 0, sweepsPerDecision: compute.decisions ? compute.sweeps / compute.decisions : 0, budgetHitShare: compute.decisions ? compute.budgetHits / compute.decisions : 0, budget: P.budget },
        quality: { n: quality.n, meanLL: quality.n ? quality.ll / quality.n : null, meanLLUniform: quality.n ? quality.llUniform / quality.n : null, ece, calibrated: total, bins: quality.bins.map((b) => ({ ...b })) },
        model: { states: model.states().size, ...model.stats(), ...model.hyper() },
      };
    },
    _model: model, _V: V,                     // test access only (tests never pass these to an environment)
  };
}
```

## Appendix H3. Frozen value-iteration planner

File: `cognitive/core/planner.mjs` · SHA-256 `eceb06302e97bf97632a697558f0fc1b3ca9ee3e7d347cef6bdace36c5516835` · 42 lines

```js
// ==========================================================
// CF-03 core — budgeted value iteration over the learned world model
// ==========================================================
// Q(s,a) = p(SELF) * gamma * V(s)
//        + sum over known outcomes s'  p(s') * [ R(s') + gamma * (1 - D(s')) * V(s') ]
//        + p(UNKNOWN) * vOpt                                 (optimism: an unseen outcome is worth vOpt)
// V(s) = max_a Q(s,a), over every visited state.  R and D come from the caller: the learned arrival model, or the
// declared cue semantics R = D = 1[s' = cue] (CD-005).  Gauss–Seidel sweeps, warm-started from the caller's V, until
// the largest change is below theta or `budget` sweeps are used.  A backup is one Q(s,a) evaluation.
// ==========================================================

export function qValue(model, V, s, a, { gamma, vOpt, rewardOf, doneOf }) {
  const p = model.predict(s, a);
  let q = p.self * gamma * (V.get(s) ?? vOpt) + p.unknown * vOpt;   // an unswept state starts optimistic
  for (const [s2, pr] of p.outcomes) q += pr * (rewardOf(s2) + gamma * (1 - doneOf(s2)) * (V.get(s2) ?? vOpt));
  return q;
}

export function qValues(model, V, s, opts) {
  const w = model.widthOf(s);
  return Array.from({ length: w }, (_, a) => qValue(model, V, s, a, opts));
}

export function valueIteration(model, V, { budget, theta, ...opts }) {
  let sweeps = 0, backups = 0, delta = Infinity;
  const states = [...model.states()];
  while (sweeps < budget) {
    delta = 0;
    for (const [s, w] of states) {
      let best = -Infinity;
      for (let a = 0; a < w; a++) { const q = qValue(model, V, s, a, opts); if (q > best) best = q; }
      backups += w;
      const old = V.get(s);
      delta = Math.max(delta, old === undefined ? Infinity : Math.abs(best - old));
      V.set(s, best);
    }
    sweeps++;
    if (delta < theta) break;
  }
  return { sweeps, backups, converged: delta < theta };
}
```

## Appendix I. Environment

File: `cognitive/testbed/env.mjs` · SHA-256 `4cc715d58338dd8c4a5849dd03d046dea9cd88cc2d9d1e7c8bd786c2a982dc5e` · 94 lines

```js
// ==========================================================
// CF-01 testbed — GraphEnv: the authoritative environment (handbook §8)
// ==========================================================
// The environment alone holds ground truth: position, topology, reliabilities, blocked edges, the rewarded node and
// the cue.  Agents see only frozen observations { node, nActions, goal }.  All state is in private fields.
//
//   const env = new GraphEnv(world, { seedLabel, maxSteps })
//   env.reset({ start, maxSteps })  -> observation
//   env.step(action)                -> { obs, reward, done, truncated }
// Runner-only controls (never handed to an agent): setRewardNode, setCue, block, unblock, setReliability, trace,
// oracleBestAction, inspect.
//
// Dynamics: action i at node s targets v = exitOrder[s][i]; the attempt succeeds iff the edge is not blocked and
// u < p(edge), where u is the j-th draw of that edge's own stream for this environment instance (common random
// numbers: same draws for every agent run with the same seedLabel).  A draw is consumed on every attempt, blocked or
// not.  On failure the agent stays.  Reward 1 and done on arrival at the rewarded node; the goal edge obeys the same
// dynamics as every other edge (CD-004).  Truncation at maxSteps is distinct from done.
// ==========================================================
import { distancesTo, edgeKey } from './worlds.mjs';
import { makeStream, randInt } from './rng.mjs';

export const OBS_KEYS = Object.freeze(['node', 'nActions', 'goal']);

export class GraphEnv {
  #w; #seedLabel; #maxSteps; #episodeMax;
  #rel = new Map(); #blocked = new Set(); #reward = null; #cue = null;
  #edgeStreams = new Map(); #startStream;
  #pos = null; #t = 0; #episode = -1; #over = true; #log = [];

  constructor(world, { seedLabel, maxSteps = 200 } = {}) {
    if (!seedLabel) throw new Error('GraphEnv needs a seedLabel');
    this.#w = world; this.#seedLabel = seedLabel; this.#maxSteps = maxSteps; this.#episodeMax = maxSteps;
    this.#startStream = makeStream(`${seedLabel}|start`);
  }

  // ---- runner-only controls ----
  setRewardNode(node) { this.#reward = node; }
  setCue(node) { this.#cue = node; }
  block(u, v) { this.#blocked.add(edgeKey(u, v)); }
  unblock(u, v) { this.#blocked.delete(edgeKey(u, v)); }
  setReliability(u, v, p) { if (!(p >= 0 && p <= 1)) throw new RangeError('reliability must be in [0, 1]'); this.#rel.set(edgeKey(u, v), p); }
  trace() { return this.#log.map((r) => [...r]); }
  inspect() { return { pos: this.#pos, t: this.#t, episode: this.#episode, reward: this.#reward, cue: this.#cue, blocked: [...this.#blocked].sort() }; }

  /** Privileged shortest-path action toward the rewarded node on the current true graph (blocked and p = 0 edges removed). */
  oracleBestAction() {
    if (this.#reward === null || this.#pos === null) return null;
    const cut = new Set(this.#blocked);
    for (const [k, p] of this.#rel) if (p === 0) cut.add(k);
    const d = distancesTo(this.#w, this.#reward, cut);
    const exits = this.#w.exitOrder[this.#pos];
    let best = null, bestD = Infinity;
    exits.forEach((v, i) => { if (!cut.has(edgeKey(this.#pos, v)) && d[v] >= 0 && d[v] < bestD) { bestD = d[v]; best = i; } });
    return best;
  }

  // ---- agent-facing interface ----
  reset({ start = null, maxSteps = null } = {}) {
    if (start === null) {
      const pool = Array.from({ length: this.#w.n }, (_, i) => i).filter((i) => i !== this.#reward);
      start = pool[randInt(pool.length, this.#startStream)];
    }
    if (start === this.#reward) throw new Error('an episode may not start at the rewarded node');
    this.#pos = start; this.#t = 0; this.#episode++; this.#over = false;
    this.#episodeMax = maxSteps ?? this.#maxSteps;
    return this.#obs();
  }

  step(action) {
    if (this.#over) throw new Error('step() after the episode ended; call reset()');
    const s = this.#pos;
    const exits = this.#w.exitOrder[s];
    if (!Number.isInteger(action) || action < 0 || action >= exits.length) throw new RangeError(`invalid action ${action} at a node with ${exits.length} exits`);
    const v = exits[action];
    const key = edgeKey(s, v);
    let stream = this.#edgeStreams.get(key);
    if (!stream) { stream = makeStream(`${this.#seedLabel}|edge|${key}`); this.#edgeStreams.set(key, stream); }
    const u = stream();
    const ok = !this.#blocked.has(key) && u < (this.#rel.has(key) ? this.#rel.get(key) : 1);
    if (ok) this.#pos = v;
    this.#t++;
    const reward = ok && this.#reward !== null && this.#pos === this.#reward ? 1 : 0;
    const done = reward > 0;
    const truncated = !done && this.#t >= this.#episodeMax;
    if (done || truncated) this.#over = true;
    this.#log.push([this.#episode, this.#t, s, action, this.#pos, reward]);
    return { obs: this.#obs(), reward, done, truncated };
  }

  #obs() {
    return Object.freeze({ node: this.#w.labelOf[this.#pos], nActions: this.#w.exitOrder[this.#pos].length, goal: this.#cue === null ? null : this.#w.labelOf[this.#cue] });
  }
}
```

## Appendix I2. Paired bootstrap

File: `cognitive/testbed/stats.mjs` · SHA-256 `33f34b4887292fc6f5ded9c94b93ecf89fa182952a3ec9d177bca842bafb59bb` · 20 lines

```js
// ==========================================================
// CF-01 testbed — paired world-level contrasts with a seeded percentile bootstrap (metrics §2)
// ==========================================================
import { makeStream } from './rng.mjs';

export function pairedBootstrap(diffs, label, B = 10000) {
  const n = diffs.length;
  if (!n) return { n: 0, mean: null, lo: null, hi: null };
  const mean = diffs.reduce((a, b) => a + b, 0) / n;
  const rnd = makeStream(label);
  const means = new Float64Array(B);
  for (let b = 0; b < B; b++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += diffs[Math.floor(rnd() * n)];
    means[b] = s / n;
  }
  means.sort();
  return { n, mean, lo: means[Math.floor(0.025 * B)], hi: means[Math.ceil(0.975 * B) - 1], B };
}
```

## Appendix J. Tests for the baseline, the candidates, the task arms and the diagnostics

File: `cognitive/tests/test_recovery.mjs` · SHA-256 `1526392d24cafb19b8afd34275b4b0b07a031edfc4bc18470af8a14c6f2c5640` · 207 lines

```js
// CF-05 tests — the Dyna-Q+ count-model baseline and the MBVI4 recovery candidates (isolation, parity with the
// frozen planner, the two mechanisms' definitions, determinism)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENTS_V5, BASELINE_FILES, BASELINE_ALLOWED, MIND4_FILES, MIND4_ALLOWED, DYNAQP_VARIANTS, MBVI4_VARIANTS, agentOptionsV5, makeAgentForV5 } from '../testbed/registry_v5.mjs';
import { AGENTS_V4 } from '../testbed/registry_v4.mjs';
import { PRIVILEGED } from '../testbed/runner.mjs';
import { checkPrivilege } from '../testbed/checks.mjs';
import { checkSourceIsolation } from '../testbed/checks_v1.mjs';
import { GraphEnv } from '../testbed/env.mjs';
import { generateWorld } from '../testbed/worlds.mjs';
import { runE4 } from '../testbed/task_e4.mjs';
import { runE4B, E4B_ARMS } from '../testbed/task_e4b.mjs';
import { runTaskV1 } from '../testbed/tasks_v1.mjs';
import { runE2P } from '../testbed/task_e2p.mjs';
import { makeDynaQPlus, DYNAQP_DEFAULTS } from '../baselines/dynaq_plus.mjs';
import { makeMBVI4, MBVI4_DEFAULTS } from '../mind/v4/agent.mjs';
import { qValue4, valueIteration4 } from '../mind/v4/planner.mjs';
import { qValue, valueIteration } from '../core/planner.mjs';
import { makeWorldModel3 } from '../mind/v3/world_model.mjs';
import { makeStream } from '../testbed/rng.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE_DIR = path.resolve(HERE, '..', 'baselines'), MIND4_DIR = path.resolve(HERE, '..', 'mind', 'v4');
const LABEL = 'cf|dev|world|5', W = generateWorld(LABEL);
const close = (a, b, tol = 1e-12) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`);
const O = (node, nActions, goal = null) => Object.freeze({ node, nActions, goal });
const T = (obs, action, reward, next, done = false) => Object.freeze({ obs, action, reward, next, done, truncated: false });

export const tests = [
  ['the baseline and v4 modules import only what they are allowed to, and use no forbidden API', () => {
    assert.deepEqual(fs.readdirSync(BASE_DIR).filter((f) => f.endsWith('.mjs')).sort(), [...BASELINE_FILES].sort());
    for (const f of BASELINE_FILES) assert.deepEqual(checkSourceIsolation(fs.readFileSync(path.join(BASE_DIR, f), 'utf8'), BASELINE_ALLOWED, f), []);
    assert.deepEqual(fs.readdirSync(MIND4_DIR).filter((f) => f.endsWith('.mjs')).sort(), [...MIND4_FILES].sort());
    for (const f of MIND4_FILES) assert.deepEqual(checkSourceIsolation(fs.readFileSync(path.join(MIND4_DIR, f), 'utf8'), MIND4_ALLOWED, f), []);
    assert.ok(checkSourceIsolation("import { GraphEnv } from '../../testbed/env.mjs';", MIND4_ALLOWED).length > 0, 'mutant must be caught');
    assert.ok(checkSourceIsolation('export const f = () => Math.random();', BASELINE_ALLOWED).length > 0, 'mutant must be caught');
  }],
  ['privilege: only ORACLE receives the oracle channel under the v5 registry; earlier kinds are the earlier factories', () => {
    const env = new GraphEnv(W, { seedLabel: 'cf|test|rec|priv' });
    assert.deepEqual(checkPrivilege(Object.keys(AGENTS_V5), PRIVILEGED, (k) => agentOptionsV5(k, env, 'cf|test|rec|priv|agent')), []);
    for (const k of Object.keys(AGENTS_V4)) assert.equal(AGENTS_V5[k], AGENTS_V4[k]);
    for (const k of [...Object.keys(DYNAQP_VARIANTS), ...Object.keys(MBVI4_VARIANTS)]) assert.equal(makeAgentForV5(k, env, 'cf|test|rec|priv|agent').kind, k);
  }],

  // ---- the v4 planner and the NONE mode reproduce the frozen planner exactly ----
  ['PARITY: the v4 planner without hooks equals the frozen core planner, value for value', () => {
    const m = makeWorldModel3(); const rnd = makeStream('cf|test|rec|parity');
    for (let s = 1; s <= 6; s++) m.visit(s, 3);
    for (let i = 0; i < 400; i++) { const s = 1 + Math.floor(rnd() * 6), a = Math.floor(rnd() * 3); m.update(s, a, rnd() < 0.3 ? s : 1 + Math.floor(rnd() * 6), 0, false); }
    const opts = { gamma: 0.95, vOpt: 1, rewardOf: (x) => (x === 4 ? 1 : 0), doneOf: (x) => (x === 4 ? 1 : 0) };
    const Va = new Map(), Vb = new Map();
    const ra = valueIteration(m, Va, { budget: 100, theta: 1e-6, ...opts }), rb = valueIteration4(m, Vb, { budget: 100, theta: 1e-6, ...opts });
    assert.deepEqual(ra, rb); assert.deepEqual([...Va], [...Vb]);
    for (let s = 1; s <= 6; s++) for (let a = 0; a < 3; a++) assert.equal(qValue(m, Va, s, a, opts), qValue4(m, Vb, s, a, opts));
  }],
  ['PARITY: MBVI4 in mode NONE gives exactly the rows of MBVI3 on E4, E1S and the detour task', () => {
    const strip = (r) => ({ ...r, kind: null, secondary: null });
    for (const arm of ['CHANGE', 'SHAM']) assert.deepEqual(strip(runE4({ world: W, worldLabel: LABEL, kind: 'MBVI4_NONE', arm, makeAgent: makeAgentForV5 })), strip(runE4({ world: W, worldLabel: LABEL, kind: 'MBVI3', arm, makeAgent: makeAgentForV5 })));
    assert.deepEqual(strip(runTaskV1({ task: 'E1S', world: W, worldLabel: LABEL, kind: 'MBVI4_NONE', arm: 'EXPLORED', makeAgent: makeAgentForV5 })), strip(runTaskV1({ task: 'E1S', world: W, worldLabel: LABEL, kind: 'MBVI3', arm: 'EXPLORED', makeAgent: makeAgentForV5 })));
    assert.deepEqual(strip(runE2P({ world: W, worldLabel: LABEL, kind: 'MBVI4_NONE', arm: 'PRE', makeAgent: makeAgentForV5 })), strip(runE2P({ world: W, worldLabel: LABEL, kind: 'MBVI3', arm: 'PRE', makeAgent: makeAgentForV5 })));
  }],

  // ---- the two mechanisms ----
  ['BONUS: the planned value of a tried pair rises by kappa * sqrt(tau); an untried pair gets no bonus', () => {
    const m = makeWorldModel3(); m.visit(1, 2); m.visit(2, 1); m.update(1, 0, 2, 0, false);
    const base = { gamma: 0.95, vOpt: 1, rewardOf: () => 0, doneOf: () => 0 }, V = new Map([[1, 0.3], [2, 0.4]]);
    const q0 = qValue4(m, V, 1, 0, base);
    for (const tau of [1, 25, 400]) close(qValue4(m, V, 1, 0, { ...base, bonusOf: () => 0.003 * Math.sqrt(tau) }), q0 + 0.003 * Math.sqrt(tau));
    const agent = makeMBVI4({ rng: makeStream('cf|test|rec|bonus'), params: { mode: 'BONUS', kappa: 0.01 } });
    const a = O(1, 2), b = O(2, 1);
    agent.act(a); agent.observe(T(a, 0, 0, b));
    for (let i = 0; i < 50; i++) { agent.act(b); agent.observe(T(b, 0, 0, b)); }     // 50 steps elsewhere
    assert.ok(agent.inspect().recovery.mode === 'BONUS');
    assert.throws(() => makeMBVI4({ rng: makeStream('x'), params: { mode: 'NOPE' } }));
  }],
  ['DECAY: belief about a pair left alone moves toward the belief about an untried pair, by 1 - (1 - hazard)^tau', () => {
    const hazard = 0.01;
    const agent = makeMBVI4({ rng: makeStream('cf|test|rec|decay'), params: { mode: 'DECAY', hazard } });
    const a = O(1, 1), b = O(2, 1), c = O(3, 1);
    // learn that the exit from 1 is dead (ten failures), then spend tau steps elsewhere
    for (let i = 0; i < 10; i++) { agent.act(a); agent.observe(T(a, 0, 0, a)); }
    const model = agent._model, dead = model.predict(1, 0), fresh = model.predict('__untried__', 0);
    assert.ok(dead.self > 0.9, 'the model believes the exit is dead');
    for (let i = 0; i < 100; i++) { agent.act(b); agent.observe(T(b, 0, 0, c)); agent.act(c); agent.observe(T(c, 0, 0, b)); }
    // waiting does not soften the model's own belief (pooling with the pairs seen meanwhile makes it firmer) ...
    assert.ok(model.predict(1, 0).self >= dead.self - 1e-9, 'the model itself still believes the exit is dead');
    // ... and the planning belief is the stated mixture (tau = 200 steps)
    const w = 1 - (1 - hazard) ** 200;
    assert.ok(w > 0.85);
    const mixedSelf = (1 - w) * model.predict(1, 0).self + w * model.predict('__untried__', 0).self;
    assert.ok(mixedSelf < dead.self - 0.2, 'after 200 steps the exit is no longer treated as certainly dead');
    close(fresh.self + fresh.unknown, 1, 1e-12);
    // behaviour: the agent returns to node 1 and re-tests the exit, which MBVI3 (mode NONE) values at its dead estimate
    const none = makeMBVI4({ rng: makeStream('cf|test|rec|decay'), params: { mode: 'NONE' } });
    for (let i = 0; i < 10; i++) { none.act(a); none.observe(T(a, 0, 0, a)); }
    assert.ok(none._V.get(1) !== undefined && agent._V.get(1) !== undefined);
    agent.act(a); none.act(a);
    assert.ok(agent._V.get(1) > none._V.get(1), 'decay makes the abandoned state worth more than the frozen belief does');
  }],
  ['RECALL: an exit declared worse is remembered; only such exits drift back; the memory is dropped when it moves again', () => {
    const agent = makeMBVI4({ rng: makeStream('cf|test|rec|recall'), params: { mode: 'RECALL', hazard: 0.02 } });
    const a = O(1, 2), b = O(2, 1), c = O(3, 1);
    // exit 0 from node 1 works 30 times (to node 2); exit 1 from node 1 never works
    for (let i = 0; i < 30; i++) { agent.act(a); agent.observe(T(a, 0, 0, b)); agent.act(b); agent.observe(T(b, 0, 0, a)); }
    for (let i = 0; i < 6; i++) { agent.act(a); agent.observe(T(a, 1, 0, a)); }
    assert.equal(agent.inspect().recovery.remembered, 0, 'an exit that never worked is not remembered');
    // now exit 0 stops working
    let k = 0;
    while (agent.inspect().recovery.remembered === 0 && k < 10) { agent.act(a); agent.observe(T(a, 0, 0, a)); k++; }
    assert.ok(k >= 1 && k <= 4, `declared worse and remembered after ${k} failures`);
    assert.equal(agent.inspect().recovery.remembering, 1);
    const model = agent._model;
    assert.ok(model.predict(1, 0).self > 0.5, 'the model now believes the exit is bad');
    // time passes elsewhere; the planning value of node 1 rises because exit 0 may work again, exit 1 gets nothing
    agent.act(a); const before = agent._V.get(1);
    for (let i = 0; i < 150; i++) { agent.act(b); agent.observe(T(b, 0, 0, c)); agent.act(c); agent.observe(T(c, 0, 0, b)); }
    agent.act(O(1, 2, 2));                                   // goal cue 2: reachable only through exit 0
    const hopeful = agent._V.get(1);
    const none = makeMBVI4({ rng: makeStream('cf|test|rec|recall'), params: { mode: 'NONE' } });
    for (let i = 0; i < 30; i++) { none.act(a); none.observe(T(a, 0, 0, b)); none.act(b); none.observe(T(b, 0, 0, a)); }
    for (let i = 0; i < 6; i++) { none.act(a); none.observe(T(a, 1, 0, a)); }
    for (let i = 0; i < k; i++) { none.act(a); none.observe(T(a, 0, 0, a)); }
    for (let i = 0; i < 150; i++) { none.act(b); none.observe(T(b, 0, 0, c)); none.act(c); none.observe(T(c, 0, 0, b)); }
    none.act(O(1, 2, 2));
    assert.ok(hopeful > none._V.get(1) + 0.2, `recall values the way back to the goal (${hopeful}) above the frozen belief (${none._V.get(1)})`);
    assert.ok(before !== undefined);
    // the exit works again: the memory is dropped
    agent.act(a); agent.observe(T(a, 0, 0, b));
    assert.equal(agent.inspect().recovery.remembering, 0);
  }],
  ['E4B: the CHANGE and SHAM arms give exactly the rows of the frozen E4 task; PERMANENT never reopens the edge', () => {
    const core = (r) => ({ windows: r.windows, metric: r.metric, censored: r.censored, layout: r.layout, usedReopened: r.secondary.usedReopened });
    for (const kind of ['MBVI3', 'QL']) for (const arm of ['CHANGE', 'SHAM']) {
      assert.deepEqual(core(runE4B({ world: W, worldLabel: LABEL, kind, arm, makeAgent: makeAgentForV5 })), core(runE4({ world: W, worldLabel: LABEL, kind, arm, makeAgent: makeAgentForV5 })), `${kind} ${arm}`);
    }
    assert.deepEqual(E4B_ARMS, ['CHANGE', 'SHAM', 'PERMANENT']);
    const run = (kind, arm) => runE4B({ world: W, worldLabel: LABEL, kind, arm, makeAgent: makeAgentForV5 });
    const perm = run('ORACLE', 'PERMANENT'), chg = run('ORACLE', 'CHANGE');
    assert.equal(perm.secondary.usedReopened, 0, 'a permanently blocked edge is never crossed');
    assert.equal(perm.windows.postAll, chg.windows.postAll, 'the arms are the same run until the reversal');
    assert.ok(perm.windows.return >= chg.windows.return, 'the reference pays the detour for ever when the block stays');
    assert.throws(() => run('MBVI3', 'NOPE'));
    const longer = runE4B({ world: W, worldLabel: LABEL, kind: 'MBVI3', arm: 'CHANGE', makeAgent: makeAgentForV5, exploreSteps: 1200 });
    assert.notDeepEqual(longer.windows, run('MBVI3', 'CHANGE').windows, 'exploreSteps is honoured');
  }],
  ['E4B CONTEXT: the manipulated pairs handed to makeAgent are the two directions of the manipulated edge', () => {
    let seen = null;
    const spy = (kind, env, label, params, context) => { seen = context; return makeAgentForV5(kind, env, label, params); };
    const r = runE4B({ world: W, worldLabel: LABEL, kind: 'MBVI3', arm: 'CHANGE', makeAgent: spy });
    assert.ok(Object.isFrozen(seen)); assert.equal(seen.manipulatedPairs.length, 2);
    const [u, v] = r.layout.blocked;
    assert.deepEqual(seen.manipulatedPairs, [`${W.labelOf[u]}|${W.exitOrder[u].indexOf(v)}`, `${W.labelOf[v]}|${W.exitOrder[v].indexOf(u)}`]);
    runE4B({ world: W, worldLabel: LABEL, kind: 'MBVI3', arm: 'SHAM', makeAgent: spy });
    const [a, b] = r.layout.sham;
    assert.deepEqual(seen.manipulatedPairs, [`${W.labelOf[a]}|${W.exitOrder[a].indexOf(b)}`, `${W.labelOf[b]}|${W.exitOrder[b].indexOf(a)}`]);
  }],
  ['RECALL DIAGNOSTICS: recallOnly and recallExcept restrict which declared changes are remembered', () => {
    const drive = (params) => {
      const agent = makeMBVI4({ rng: makeStream('cf|test|rec|diag'), params: { mode: 'RECALL', hazard: 0.02, ...params } });
      const a = O(1, 1), b = O(2, 1);
      for (let i = 0; i < 30; i++) { agent.act(a); agent.observe(T(a, 0, 0, b)); agent.act(b); agent.observe(T(b, 0, 0, a)); }
      for (let i = 0; i < 6; i++) { agent.act(a); agent.observe(T(a, 0, 0, a)); }
      return agent.inspect().recovery.remembered;
    };
    assert.equal(drive({}), 1, 'without a restriction the change is remembered');
    assert.equal(drive({ recallOnly: ['1|0'] }), 1); assert.equal(drive({ recallOnly: ['9|9'] }), 0);
    assert.equal(drive({ recallExcept: ['1|0'] }), 0); assert.equal(drive({ recallExcept: ['9|9'] }), 1);
    assert.equal(drive({ recallOnly: [] }), 0, 'an empty allow-list remembers nothing');
  }],
  ['DEFAULTS: both candidates default to mode NONE, so nothing changes unless a mode is asked for', () => {
    assert.equal(MBVI4_DEFAULTS.mode, 'NONE');
    assert.equal(makeMBVI4({ rng: makeStream('x') }).inspect().recovery.mode, 'NONE');
  }],

  // ---- Dyna-Q+ ----
  ['DYNAQP: the count model samples outcomes in proportion to their counts, and the bonus grows with time untried', () => {
    const agent = makeDynaQPlus({ rng: makeStream('cf|test|rec|dq'), params: { k: 0, kappa: 0.01 } });
    const a = O(1, 2), b = O(2, 1);
    agent.act(a); agent.observe(T(a, 0, 0, b));
    assert.equal(agent.inspect().compute.planningUpdates, 0, 'k = 0 plans nothing');
    assert.equal(agent.inspect().modelPairs, 1);
    const planner = makeDynaQPlus({ rng: makeStream('cf|test|rec|dq2'), params: { k: 50, kappa: 0.01 } });
    for (let i = 0; i < 40; i++) { planner.act(a); planner.observe(T(a, 0, 0, b)); planner.act(b); planner.observe(T(b, 0, 0, a)); }
    const c = planner.inspect().compute;
    assert.equal(c.realSteps, 80); assert.equal(c.planningUpdates, 80 * 50); close(c.updatesPerStep, 50);
    assert.equal(DYNAQP_DEFAULTS.k, 20);
  }],
  ['DYNAQP: with no reward anywhere, an action never tried accumulates value from the bonus alone (it will be re-tested)', () => {
    const agent = makeDynaQPlus({ rng: makeStream('cf|test|rec|dq3'), params: { k: 30, kappa: 0.05, epsilon: 0 } });
    const a = O(1, 2), b = O(2, 1);
    for (let i = 0; i < 60; i++) { agent.act(a); agent.observe(T(a, 0, 0, b)); agent.act(b); agent.observe(T(b, 0, 0, a)); }
    // action 1 at node 1 was never taken in the real world; greedy choice must now prefer it or tie-break to it eventually
    let took = false;
    for (let i = 0; i < 200 && !took; i++) { const x = agent.act(a); if (x === 1) took = true; agent.observe(T(a, x, 0, x === 1 ? a : b)); if (x === 0) { agent.act(b); agent.observe(T(b, 0, 0, a)); } }
    assert.ok(took, 'the untried action is eventually chosen without any epsilon');
  }],
  ['DETERMINISM: the baseline and both candidates give identical rows on repeated runs', () => {
    for (const [kind, p] of [['DYNAQP', { kappa: 0.003 }], ['MBVI4_BONUS', { kappa: 0.003 }], ['MBVI4_DECAY', { hazard: 0.001 }]]) {
      const run = () => runE4({ world: W, worldLabel: LABEL, kind, arm: 'CHANGE', makeAgent: makeAgentForV5, params: { [kind]: p } });
      assert.deepEqual(run(), run(), kind);
    }
  }],
];
```

## Appendix K. Reconciliation of the earlier outside review against the record

File: `research/external/CF03C_CF04_GEMINI_REVIEW_RECONCILIATION.md` · SHA-256 `8385b1d471287f7804bd74314fa3ae5458936946db456da1f76b3536ce44f16e` · 133 lines

````markdown
# Reconciliation of the Gemini review of CF-03c and CF-04

**Date:** 2026-11-14. **Review lodged verbatim at:** `CF03C_CF04_GEMINI_REVIEW.md` (SHA-256 `d3dc492a…`, byte-identical
to the file the owner supplied). **Bundle the reviewer was given:** `CF03C_CF04_GEMINI_REVIEW_BUNDLE.md`.

Each statement in the review is checked here against the frozen specifications, the source code and the recorded
result files (`experiments/cf03c/results/gate3c_result.json`, `experiments/cf04/results/gate4_result.json`). No
frozen record, result file or source file is changed by this document.

## 1. How much independent weight the review carries

The review agrees with both verdicts. Before counting that as confirmation:

- It did not answer the sixteen numbered questions in the requested form. Questions 9 (the HIGH exemption), 15
  (the bootstrap), 16 (steering toward a negative result) and 12 (the smallest useful change to the testbed) are
  not addressed at all.
- Most of its findings restate sentences from the bundle's cover, which the party under review wrote.
- It contains factual errors about the experiments (section 2), which a check against the appendices would have
  caught.
- It contradicts itself on CF-04: the verdict section calls the arbitration hypothesis "definitively falsified at
  this scale", and the baseline section calls the same test "unfair / strawman".

**Standing:** useful second opinion, weak as independent verification. Its one substantive challenge (the habit
controller was not a competent fallback) is correct and is accepted below. Nothing in it changes a gate verdict.

## 2. Claim-by-claim check

| # | Review's statement | Check against the record | Standing |
|---|---|---|---|
| 1 | CF-03c is PARTIAL; the claim holds only for U5 and bimodal worlds | Matches the frozen verdict table and `RESULTS.md` | **Confirmed** |
| 2 | The model "failed calibration thresholds on WIDE (0.055) and ARCSINE (0.055)" | 0.0553 and 0.0548 are the **upper bounds** of the intervals; the estimates are 0.050 and 0.050. The criterion was on the upper bound, so the failure is real but marginal | **Imprecise** |
| 3 | "V3's actual superiority lies in resolution, not calibration error" | **Half right.** Against the constant forecaster, yes: the whole advantage is resolution (table in section 3). Against the per-pair Laplace forecaster it is the opposite: V3 has **lower** resolution than Laplace in every family, and where it wins it wins on reliability. On HIGH there is no resolution to be had and V3 is worse than the constant | **Corrected** |
| 4 | BIMODAL passed because its two modes "align well with the model's shrinkage"; WIDE and ARCSINE fail because dispersion "violates the implicit assumption of unimodal exchangeability" | The explanation is inverted: BIMODAL is the family that is not unimodal. A simpler reading fits all five families: the outcome follows the **spread** of edge reliabilities. Section 3 shows the model beats Laplace where the matched Beta strength is 3.7 or more and loses where it is 2.7 or less, which is where Laplace's own prior (strength 2) is already nearly right. This is a description of five data points, not a tested claim | **Not accepted as stated**; alternative recorded |
| 5 | Sample sizes "were formally derived from pre-registered power equations (80% power)" | Only partly. The rule n = max(20, ⌈(2.8·SD/mean)²⌉) gave 55 for CF-04. For CF-03c it gave 6 on the development family, so the **minimum of 20** applied, and no pilot existed for the unseen families by design. CF-03c's sample size was a floor, not a power calculation | **Overstated** |
| 6 | "Avoiding pseudoreplication": the world is the unit | Correct (`cognitive/testbed/stats.mjs`; every contrast is paired by world) | **Confirmed** |
| 7 | Capping at 200 steps biases differences toward zero; 233 capped QL episodes | Correct for contrasts that involve QL, DYNAQ or the planner without change detection. **The two arbitration criteria are untouched:** the planner, ARB, ARB_T10 and RANDSWITCH had 0 capped episodes in 55 worlds | **Confirmed, with its scope narrowed** |
| 8 | Medians should accompany step counts | Fair. Computed now from the recorded rows (section 3). Medians agree with the means on every arbitration contrast | **Accepted**; adopted for CF-05 |
| 9 | The habit controller "takes 1,000 episodes to adapt" | Wrong unit. Q-learning needs about 950 more **steps** than the planner over 30 episodes (+951.1 [709.0, 1,203.6]), understated by capping | **Wrong** |
| 10 | CF-04's agent pairing is "unfair / strawman"; a fair test needs an accelerated model-free arm such as Dyna-Q+ | **Accepted in substance.** Q-learning is not a competent fallback. Two qualifications from the record: (a) Dyna-Q was run alone in the same gate and needs +115.3 steps more than the planner [93.5, 138.1], so a Dyna-based habit arm would also be the weaker controller; (b) the published case for a model-free controller is that it is **cheaper**, and compute was not counted | **Accepted**; wording of the CF-04 conclusion tightened (section 4) |
| 11 | Arbitration failed "because false-positive handoffs occurred frequently due to noise (14.2% habit share on SHAM runs)" | **Contradicted by criterion A3.** In the sham arm the habit acted in 14.2% of decisions and the cost was +0.3 steps [−2.4, 2.7]: noise-driven handoffs were not costly when nothing had changed. The cost is in the change arm, in the 15 episodes with the block (+16.0 [12.4, 19.8]), when the two controllers' policies differ most | **Not supported** |
| 12 | The hypothesis is "definitively falsified at this scale" | Too strong, and inconsistent with #10. Supported wording: arbitration between this planner and tabular Q-learning, with this reliability signal, gave no benefit and at θ = 0.05 cost 13.8 steps. Arbitration for the purpose of saving computation was not tested | **Overstated** |
| 13 | CUSUM constants "lack sensitivity analyses" | Correct. They were set a priori and never varied | **Accepted**; a sensitivity arm is added to CF-05's reported contrasts |
| 14 | `emIterations = 25` should have convergence logged | Correct that it is not logged. The model counts passes (`stats().emPasses`) but not how often the limit was reached | **Accepted** for the next model version; no change to the frozen v3 |
| 15 | Put the exploration bonus "directly inside `cognitive/core/planner.mjs`" | Not possible without breaking the record: that file is the frozen CF-03 planner, and three recorded gates run through it. A bonus goes in a new planner version beside it | **Declined as written** |
| 16 | "Remove `cognitive/mind/arb/`" | The owner's decision governs: remove it from the integration roadmap; keep the implementation and evidence | **Superseded by the owner** |
| 17 | CF-05 should test recovery with a recency bonus against a count-model Dyna-Q+ | Agrees with the proposal already recorded; the owner has made it the next priority | **Agreed** |

## 3. The data behind items 3, 4 and 8

**Brier decomposition** (pooled bins; Brier ≈ reliability − resolution + uncertainty; the binning residual is
below 0.0012 in every row). Lower reliability is better; higher resolution is better.

| Family | Forecaster | Brier | Reliability | Resolution | Uncertainty |
|---|---|---|---|---|---|
| U5 | V3 | 0.1902 | 0.0028 | 0.0059 | 0.1933 |
| U5 | LAPLACE | 0.2051 | 0.0182 | 0.0063 | 0.1933 |
| U5 | CONST | 0.1940 | 0.0011 | 0.0005 | 0.1933 |
| WIDE | V3 | 0.2158 | 0.0019 | 0.0351 | 0.2500 |
| WIDE | LAPLACE | 0.2112 | 0.0015 | 0.0399 | 0.2500 |
| WIDE | CONST | 0.2499 | 0.0025 | 0.0019 | 0.2500 |
| BIMODAL | V3 | 0.1769 | 0.0036 | 0.0203 | 0.1942 |
| BIMODAL | LAPLACE | 0.1859 | 0.0121 | 0.0210 | 0.1942 |
| BIMODAL | CONST | 0.1944 | 0.0012 | 0.0009 | 0.1942 |
| ARCSINE | V3 | 0.1959 | 0.0019 | 0.0484 | 0.2430 |
| ARCSINE | LAPLACE | 0.1942 | 0.0030 | 0.0516 | 0.2430 |
| ARCSINE | CONST | 0.2409 | 0.0019 | 0.0041 | 0.2430 |
| HIGH | V3 | 0.0502 | 0.0031 | 0.0000 | 0.0469 |
| HIGH | LAPLACE | 0.0935 | 0.0461 | 0.0001 | 0.0469 |
| HIGH | CONST | 0.0478 | 0.0007 | 0.0000 | 0.0469 |

Where V3's Brier advantage comes from (negative = V3 better):

| Family | V3 − LAPLACE: Brier | of which reliability | of which resolution | V3 − CONST: Brier | of which reliability | of which resolution |
|---|---|---|---|---|---|---|
| U5 | −0.0149 | −0.0154 | −0.0004 | −0.0038 | +0.0017 | +0.0054 |
| WIDE | **+0.0046** | +0.0004 | −0.0048 | −0.0341 | −0.0005 | +0.0332 |
| BIMODAL | −0.0090 | −0.0084 | −0.0007 | −0.0175 | +0.0025 | +0.0194 |
| ARCSINE | **+0.0017** | −0.0011 | −0.0033 | −0.0450 | 0.0000 | +0.0443 |
| HIGH | −0.0433 | −0.0430 | −0.0001 | **+0.0024** | +0.0024 | 0.0000 |

**Verified statement.** V3 beats a constant forecaster through resolution, in the four families where edges differ.
V3 never out-resolves Laplace: sharing between pairs trades a little resolution for a large gain in reliability
when pairs are alike (U5, BIMODAL, HIGH), and the trade is a net loss when pairs are spread wide (WIDE, ARCSINE).
Worlds of 20 in which V3 has the lower Brier score: against CONST 15 / 20 / 20 / 20 / 0; against LAPLACE
20 / 0 / 19 / 7 / 20 (U5 / WIDE / BIMODAL / ARCSINE / HIGH).

**Spread of each family** and the Beta strength with the same mean and variance:

| Family | Variance of edge reliability | Matched strength S | S the model learned | Model beats Laplace |
|---|---|---|---|---|
| HIGH | 0.0008 | 56.0 | 16–64 | yes |
| U5 | 0.0208 | 8.0 | mostly 8 | yes |
| BIMODAL | 0.0400 | 3.7 | 2–4 | yes |
| WIDE | 0.0675 | 2.7 | 2–4 | no |
| ARCSINE | 0.0800 | 2.0 | 1–4 | no |

**Truncation and medians in CF-04** (change arm, all steps after the change):

| Agent | Mean | Median | Worlds with a capped episode | Capped episodes |
|---|---|---|---|---|
| ORACLE | 200.8 | 195.0 | 0 | 0 |
| Planner (MBVI3) | 247.3 | 253.0 | 0 | 0 |
| ARB | 261.1 | 255.0 | 0 | 0 |
| ARB_T10 | 246.5 | 232.0 | 0 | 0 |
| RANDSWITCH | 249.9 | 244.0 | 0 | 0 |
| DYNAQ | 362.7 | 346.0 | 4 | 5 |
| Planner without change detection | 411.0 | 407.0 | 23 | 28 |
| QL | 1,198.4 | 953.0 | 37 | 233 |

Paired, world by world: ARB is worse than the planner in 46 worlds and better in 9 (median difference +16.0);
worse than RANDSWITCH in 35 and better in 20 (median +7.0). ARB_T10 is worse than the planner in 34 worlds and
better in 18. The planner is behind ORACLE after the block is removed in 54 of 55 worlds (median 35.0).

## 4. What changes as a result

| Item | Change | Where |
|---|---|---|
| CF-04 conclusion | Narrowed by a dated amendment: "not supported for this controller pair and this purpose"; "harmful" applies to θ = 0.05 only; arbitration to save computation is untested; false-positive handoffs are not the cause | `experiments/cf04/results/RESULTS.md` (amendment; original text kept) |
| CF-03c reading | Amendment recording the corrected resolution statement and the spread explanation as a hypothesis | `experiments/cf03c/results/RESULTS.md` (amendment; original text kept) |
| Owner's decisions 1–5 | Recorded | `docs/architecture/ARCHITECTURE_DECISIONS.md` |
| Truncation | CF-05 reports medians and paired win/loss counts beside every mean, counts capped episodes per agent, and makes its criteria only on agents with no capped episodes or states the bias | CF-05 specification |
| Computational fairness | CF-05 counts work for every agent (planner backups, Dyna planning updates) and includes a Dyna-Q+ arm with a planning budget matched to the planner's | CF-05 specification |
| Baseline selection | Count-model Dyna-Q+, tuned on `dev` with the same search budget as the mechanism under test | CF-05 specification |
| Statistical power | CF-05's sample size comes from the rule applied to the primary contrast on `dev`, and the specification states the smallest detectable effect before the run | CF-05 specification |
| Sensitivity of change-detection constants | A reported arm in CF-05 | CF-05 specification |

## 5. Questions the review left open

They stay open and are carried into the CF-05 specification's "not answered" section: whether exempting HIGH in
advance was a loophole; whether the percentile bootstrap is adequate at 20 worlds; whether the designer steered
toward the expected negative result; and what single change to the testbed would most widen what these results
can say. No independent human has reviewed any of this work.
````

