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
