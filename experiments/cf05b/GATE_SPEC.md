# CF-05b Gate Specification — targeted recall of exits that stopped working

**Status.** Frozen (revision 2) in the CF-05b freeze commit, before the `gate5b` domain was run. The SHA-256 of this
file is recorded in `GATE_SPEC.sha256`; the driver refuses to run if the two differ, if any file under `cognitive/`,
`experiments/cf05/` or `experiments/cf05b/` is uncommitted or modified, or if the gate has already been run.

- Development evaluation gate, not confirmatory. Commits are local until the owner authorises a push.
- CF-05 (the exploration bonus) is closed without a run as a documented negative finding
  ([closure record](../cf05/CLOSURE.md)). This is now the primary recovery experiment.
- Revision 2 applies the owner's decisions of 2026-11-15 on the outside pre-freeze review
  (`research/external/CF05_CF05B_GEMINI_REVIEW.md`): the diagnostic arms are audited and repaired, expected net
  utility is added as a reported analysis, the 48-node runs record scaling metrics, and the world counts and sizes
  are checked against the code. **The pass/fail criteria R1–R7 are unchanged from revision 1.**

## Where this candidate came from

RECALL was not in the plan the owner first approved. It was added after the development grid showed that the two
blanket mechanisms (an exploration bonus, and belief decay over every pair) recover nothing at their best setting
and cost steps when stronger, and that Dyna-Q+ is worse than the existing planner at every setting. A candidate
invented after seeing the others fail is the kind of result that tends not to replicate, which is why it has its own
gate, a setting chosen on new worlds, a permanent-change arm, and two diagnostic arms.

## The question

When an exit the agent relied on stops working and later works again, can the agent recover it by remembering what
that exit used to do, **without** paying for it when nothing changed or when the change is permanent? And is what
helps really recovery from a reversed change, or a repair of the change detector's false alarms?

## The mechanism under test: RECALL (`cognitive/mind/v4/agent.mjs`, mode `RECALL`)

The existing planner MBVI3, unchanged, plus:

1. When the model's change detector declares that an exit **got worse**, the agent stores the prediction it held
   for that exit just before (where it led and how reliably).
2. For such exits only, the belief used for planning is a mixture: (1 − w) × current belief + w × remembered
   belief, with w = 1 − (1 − hazard)^τ and τ = steps since the exit was last tried. **hazard = 0.01.**
3. The memory is dropped the first time the exit moves again.

The model's counts are never modified. Exits that never worked, and exits in use, are untouched.

**What it is, computationally (recorded now, before the result).** Steps 1–2 are the prediction step of a
two-regime hidden state per exit ("as now" and "as before the change"), with a prior switching rate of `hazard` per
step: after τ steps without looking, the probability that the exit has switched back is 1 − (1 − hazard)^τ. RECALL
omits the Bayesian update of that regime belief from observations; step 3 replaces it with a hard reset. So
"episodic recall" and "a latent environmental-state model" are two descriptions of the same computation here, and no
result of this gate can tell them apart. What the gate *can* tell apart is whether the benefit comes from real
reversals or from false alarms (below).

## How the setting was chosen (tuning lineage)

On a tuning domain used for nothing else, `cf|tune5b|world|0…19` (not `dev`, not any gate domain), with the rule
fixed beforehand: the hazard with the lowest total steps over the CHANGE, SHAM and PERMANENT arms. This gate is
therefore an **out-of-sample validation of a setting selected on an independent grid**, not a discovery; best-of-three
selection biases the tuning effect upward.

| Setting | CHANGE total | SHAM total | PERMANENT total | Sum (rule) | Phase D, against MBVI3 | PERMANENT, against MBVI3 |
|---|---|---|---|---|---|---|
| MBVI3 | 228.9 | 168.8 | 228.9 | 626.7 | — | — |
| RECALL 0.003 | 219.3 | 167.7 | 231.2 | 618.1 | −10.2 [−17.4, −3.3] | +2.3 [1.4, 3.2] |
| **RECALL 0.01** | 214.4 | 163.9 | 237.2 | **615.5** | **−18.6 [−27.1, −10.4]** | **+8.2 [5.7, 10.8]** |
| RECALL 0.03 | 216.1 | 163.7 | 249.1 | 628.8 | −23.2 [−33.4, −13.3] | +20.1 [14.1, 26.6] |
| ORACLE | 192.8 | 163.3 | 222.6 | 578.7 | (MBVI3 − ORACLE on phase D: +30.3 [22.1, 39.0]) | |

The same setting had been best on `dev` under the earlier two-arm rule (phase D −12.4 [−23.4, −2.5]). These tuning
runs predate the diagnostic repair below; the repair does not change RECALL, only the two diagnostic arms.

## Authoritative values (checked against the code before freezing)

The outside review described "40-node" worlds and a "60-world (40-world)" test. Neither report was assumed correct;
the values below are read from the code that will run.

| Item | Value | Source |
|---|---|---|
| Primary worlds | 40, labels `cf|gate5b|world|0…39` | `run_gate.mjs` `gateWorlds: 40`; `gate_lib.mjs` world label |
| Primary world size | 24 nodes, 30 edges, maximum degree 4 | `cognitive/testbed/worlds.mjs` `generateWorld` defaults |
| Scaling worlds (non-gating) | 20, labels `cf|gate5b|large|0…19`, 48 nodes, 60 edges, maximum degree 4, 1,200 exploration steps | `run_gate.mjs` `large` |
| CF-05 (closed) | had declared 60 worlds on `gate5`; never run | `experiments/cf05/run_gate.mjs` |
| Prior use of `gate5b` labels | none in any tracked file or result | `git grep` before freezing |

The review's "20/40 nodes" matches nothing in the code; its "60-world (40-world)" mixes the two gates' counts.

## Task and arms

Task E4B (`cognitive/testbed/task_e4b.mjs`): hidden reliabilities U[0.5, 1]; 600 exploration steps; 30 training
episodes; then phase C (15 episodes) and phase D (15 episodes), capped at 200 steps. The CHANGE and SHAM arms are
the frozen task E4 exactly (a test asserts identical rows).

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
| RECALL_REALONLY | hazard 0.01, diagnostic `real` | Privileged diagnostic (reported) |
| RECALL_FALSEONLY | hazard 0.01, diagnostic `false` | Privileged diagnostic (reported) |
| DYNAQP, DYNAQP_MATCHED | Dyna-Q+ with a count model, κ 0.001, at 20 and 1,300 planning updates per step | Baseline for R6 |
| ORACLE | Privileged reference | Reported |

## Diagnostic arms: audit, repair, and what they isolate

**Audit (2026-11-15) found two defects in revision 1**, both repaired before this freeze:

1. *They classified by edge, not by event.* REALONLY remembered any declared change on the manipulated edge,
   including false alarms on that edge before the block; FALSEONLY excluded those same false alarms.
2. *Silent fallback.* A diagnostic arm built without the task's ground truth would have run as ordinary RECALL.

**Definition now** (`cognitive/testbed/arms_v5.mjs`, the only place task ground truth can reach an agent):

    realChange(key) = key is a direction of the manipulated edge  AND  that edge is blocked at this moment

- RECALL_REALONLY remembers a declared-worse exit only if `realChange(key)`: recovery from a change that happened.
- RECALL_FALSEONLY remembers it only if not: repair of the change detector's false alarms.
- Every declared change is classified once, by the state of the world at that moment, so the two arms split the
  events RECALL acts on. Their later behaviour still differs, so their effects need not add up; the residual is
  reported.
- A diagnostic arm without the task context throws. Ordinary arms never receive the context.

**Tests that hold this** (`cognitive/tests/test_recovery.mjs`, 155/155 in total): the ground-truth flag matches the
environment at every step in all three task arms; the two diagnostic arms classify the same declared change
oppositely; an ordinary RECALL arm gives identical rows whether it is offered honest, forged or no ground truth; no
agent, model or baseline source references the ground truth in code; every arm in a world shares the environment
seed, agent seed label, layout and reliabilities; a diagnostic predicate that admits everything reproduces RECALL
row for row.

**Mechanism label, fixed now** (on the CHANGE arm's phase-D window; an arm "carries" the benefit when its effect
against MBVI3 has a 95% lower bound above zero):

| REALONLY carries it | FALSEONLY carries it | Label | Consequence for the architecture |
|---|---|---|---|
| yes | no | Recovery from real reversed changes | RECALL's benefit is genuine recovery; next step is a model-native version (below) |
| no | yes | Repair of change-detector false alarms | Scrap RECALL as a memory mechanism; fix the change detector instead |
| yes | yes | Combination of both | Both; the shares are reported |
| no | no | Not attributable to either | No mechanism claim |

## Fairness and budgets

| Concern | How it is handled |
|---|---|
| Tuning | RECALL's setting on new tuning worlds; Dyna-Q+'s κ on `dev`; three settings each |
| Seeds | Every arm shares the environment's per-edge random streams, the layout and the reliabilities in each world (tested) |
| Computational budgets | Every MBVI-based arm plans with value iteration, at most 100 sweeps per decision; Dyna-Q+ at 20 and at 1,300 planning updates per step. Work per step, sweeps per decision and the share of decisions that hit the sweep budget are reported for every arm |
| Privileged arms | Only the two diagnostic arms and ORACLE receive ground truth; none is in a criterion |

## Statistical plan

| Item | Value |
|---|---|
| Sample size | The rule n = max(20, ⌈(2.8·SD/mean)²⌉) on the tuning differences of R1 (mean 18.6, SD 19.8) gives 20. **n = 40**: twice the rule, because the cost criteria need tighter intervals than the benefit |
| Smallest detectable effect | R1: 2.8 × 19.8 / √40 ≈ 8.8 steps (80% power, two-sided 5%); the room available is about 30–40 steps |
| Power of the cost criteria | With a true permanent-change cost near 8 steps and a 10-step margin, R4 will fail unless the true cost is clearly below 10 |
| Unit and intervals | The world; paired differences; percentile bootstrap, 10,000 resamples, 95% |
| Truncation | A capped episode counts its cap (200 steps) in every mean and median. Capped episodes are counted per agent and arm, and the count in the criterion agents (MBVI3, RECALL) is printed beside the verdict |
| Robust summaries | Median and per-world counts (fewer / more / equal steps) beside every mean |
| Multiplicity | Six criteria, all required for SUPPORTED; reported contrasts are uncorrected and cannot change the verdict |
| Reproducibility | Two in-process runs must give identical row hashes; wall-clock and process memory are recorded outside the hashed rows |

## Criteria (unchanged from revision 1)

| Criterion | Statistic | Rule |
|---|---|---|
| **R1** benefit | phase D, CHANGE: MBVI3 − RECALL | mean > 0 and lower bound > 0 |
| **R2** no cost while blocked | phase C, CHANGE: RECALL − MBVI3 | upper bound < 10 steps |
| **R3** no cost when unchanged | phases C + D, SHAM: RECALL − MBVI3 | upper bound < 10 steps |
| **R4** no cost when permanent | phases C + D, PERMANENT: RECALL − MBVI3 | upper bound < 10 steps |
| **R5** no regression | RECALL − MBVI3 on E1 EXPLORED, E3, E1S EXPLORED, E2P PRE | every upper bound < 10 steps |
| **R6** beats the textbook baseline | phases C + D, CHANGE: Dyna-Q+ − RECALL | lower bound > 0 at both planning budgets |
| **R7** infrastructure | Two in-process runs identical; all 155 tests pass | all |

| Verdict | Condition | Consequence, fixed now |
|---|---|---|
| SUPPORTED | R1–R7 | Adversarial review, then a proposal to the owner. Nothing enters the agent before that |
| SUPPORTED AT A COST | R1 holds; some of R2–R6 fail (listed) | Not adopted as it stands. Benefit, cost and the utility curve are reported together; whether a trade of that size is wanted is the owner's decision |
| NOT SUPPORTED | R1 fails | Not adopted. The development and tuning effects are recorded as not replicated |
| INVALID | R7 fails | None |

## Expected net utility (reported; not a criterion)

Added by the owner's Decision 3. It does not change R1–R7 and cannot change the verdict.

    U(p) = p × B − (1 − p) × C

- **p**: the probability that a change reverses. It is **not estimated**: nothing in the testbed measures how
  often real changes reverse. U is reported over p = 0, 0.05, …, 1.
- **B** (benefit if the change reverses): MBVI3 − RECALL on the **whole** post-change period of the CHANGE arm
  (phases C + D), because an agent facing a reversed change lives through both phases.
- **C** (cost if the change is permanent): RECALL − MBVI3 on phases C + D of the PERMANENT arm.
- **Break-even**: U(0) = −C and U(1) = B. If both are positive RECALL helps at every p; if both are negative it
  never helps; otherwise the break-even is p* = C / (B + C).
- **Uncertainty**: B and C are measured on the same 40 worlds, so 10,000 bootstrap resamples draw worlds jointly
  and keep their correlation. Reported: U(p) with a 95% interval at every p, the share of resamples with U(p) > 0,
  and the distribution of p*.
- **A second form**, using R1's phase-D benefit in place of B, is also reported. It overstates the benefit, because
  it ignores phase C of a reversed change; the whole-period form is the one to read.

**Separation of evidence and policy.** The curve is evidence. Choosing p, and so whether to adopt RECALL, is an
architectural policy decision for the owner, to be recorded separately, never in this gate.

## Scaling experiment (48 nodes; separate, non-gating)

20 worlds of 48 nodes and 60 edges, 1,200 exploration steps, arms ORACLE, MBVI3 and RECALL in all three task arms,
with the setting chosen at 24 nodes. **It cannot change the verdict and cannot rescue a failed primary gate.**
Recorded: performance (every window, mean and median, capped episodes, gap to the reference), the benefit and cost
contrasts and the utility curve; memory (model states and tried pairs per agent, exits remembered and still held
at the end; process peak memory, outside the hashed rows); computational cost (backups per decision, wall-clock per
arm, outside the hashed rows); convergence (sweeps per decision and the share of decisions that hit the 100-sweep
budget; changes declared); generalisation (the 24-node setting applied unchanged to a world twice the size).

## Reported, beyond the criteria

Every window for every arm in all three task arms, with mean, median and capped-episode count; the net effect over
the three arms; RECALL − ORACLE on phase D; how often each arm crosses the reopened exit and tries the manipulated
edge; exits remembered and changes declared per run; the decomposition into the two diagnostic arms on phase D,
phase C, phases C + D, SHAM and PERMANENT, with residuals and the mechanism label; the sensitivity settings; work
per step.

**Pre-declared expectations** (reported, not tested): R1 holds; R4 fails or is marginal, so the most likely verdict
is SUPPORTED AT A COST; RECALL closes part of the gap to the reference and not all of it; REALONLY carries most of
the phase-D benefit; the break-even p lies between 0.2 and 0.5; at 48 nodes the sign of the benefit is the same.

## Responses to the outside pre-freeze review

| Review point | Response |
|---|---|
| Q1: close CF-05 as a negative finding | Done ([closure record](../cf05/CLOSURE.md)) |
| Q2, Q6: the diagnostic split must be run and is "exemplary" | Run, but only after the audit above found and repaired two defects the review did not see |
| Q3: acknowledge the tuning lineage | Done (section above) |
| Q4: SUPPORTED AT A COST if R4 fails | That was already the rule; unchanged |
| Q5: use expected utility over a reversal probability | Added as a reported analysis; the criteria are not changed retroactively |
| Q7: log memory and convergence at 48 nodes | Done (scaling section) |
| Q9: account for truncation in medians | Capped episodes count their cap in medians as in means, and are counted per arm |
| Scale "20/40 nodes" | Not in the code; see authoritative values |
| Final assessment: do not integrate RECALL; consider a multi-hypothesis world model | Agreed and recorded (mechanism section); not built in this gate |

## Independent verification after the run

1. Two in-process runs with identical row hashes (R7).
2. An adversarial review by a reviewer that did not write the design.
3. Another outside review if a material scientific concern remains.

## Things a reviewer should doubt

1. **Selection.** Best of three on two sets of worlds; the tuning effect is stronger than the dev effect.
2. **The benefit needs the change to be reversed.** The utility curve shows the dependence; it does not settle it.
3. **One reversal after 15 episodes.** A reversal after 100 episodes, never, or several times is untested.
4. **It adds memory to the agent.** If it passes, the claim is "recovers a reopened exit on this task at this
   cost", nothing wider.
5. **A 10-step margin inherited from CF-03**, applied to windows of different lengths.
