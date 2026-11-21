# M16 — Design-stage finding (accepted 2026-11-21)

**What this is:** the record of a design-stage finding, accepted by the owner on 2026-11-21. It is **not** a frozen
experiment:
- no specification was frozen;
- no gate labels were used;
- no independent check was written;
- no confirmatory run was made.

The evidence is three design calculations, prototypes run once on the design labels `m16int|design|0..39` (now barred
from any later run). Their detail is in [`PROPOSAL.md`](PROPOSAL.md); the script and output files are checksummed in
`proposal_inputs/SHA256SUMS`. Figures are design estimates.

**Decision:** the proposed M16 integration gate is **not run**. Its decisive comparison, whether relational knowledge
makes a difference beyond simply stopping exploration, is already matched or beaten by a knowledge-free baseline.

## 1. Conclusion on relational knowledge

On the current task family (E6/E7 signposted worlds), **no advantage for relational knowledge over strong simple rules
is established.**
- **Exploration decisions:** "stop exploring after the first success unless an exit that worked fails" uses no
  knowledge. It equals the safeguarded knowledge-guided rule (KGO_V) where the relation holds (STABLE, both block
  families) and beats it under noise (−235.2 [−267.6, −204.3] steps per label), reversal (−66.0 [−83.3, −49.5]) and
  sparse evidence (−17.9 [−27.2, −9.4]).
- **Change tracking (M15):** a tuned two-observation window matched the Bayesian belief (MECH not shown).
- **Where knowledge does help:** in a world's first episode, through the tie-break (M14, M15). That benefit is real
  but mostly repaid (section 2).

## 2. Architectural finding

**Relational knowledge produces a substantial early benefit, but the planner's exploration policy repays most of it.**
- **The early benefit:** the relation saves 492.2 steps per label in first episodes, about 31 per world.
- **The repayment:** 92% of that is spent again, 73% in the next two episodes and 18% while a route is blocked. Net
  whole-world saving: +41.6 [30.2, 53.0].
- **The cause:** the knowledge only breaks exact ties among untried exits. The planner values every untried exit with
  full optimism (`vOpt = 1`), so it later explores the exits the relation let it skip.
- **The integration that does exist is additive:** the agent is already one agent (AD-13 plus the relational belief).
  The relational belief acts in first episodes; the change belief acts only on exits tried at least 5 times. Their
  interaction is +1.35 [−2.27, 4.95].
- **What keeps them from interfering:** M15's observation unit, one observation per kind per world. Learning from
  every episode collapses the belief (P(true) 0.49 against 0.89).
- **Letting the knowledge reach the planner's values without a safeguard is unsafe:** hundreds of capped episodes when
  a route is blocked.

## 3. Limitation of the current benchmark

**Small deterministic worlds are not discriminative enough.**
- **Why:** in a 24-node world with a 4-hop route and deterministic moves, one exploratory episode reveals most of what
  matters. So stopping after the first success is close to optimal, and a two-observation window tracks clean changes.
- **The consequence:** mechanisms tested there are either settled by construction (M16's composition, M14's ceiling) or
  matched by a simple rule (M15's window, M16's stop rule). More mechanisms on this benchmark would add milestones,
  not evidence.

## 4. Recommended next direction

**Task admission and benchmark discrimination, not another cognitive mechanism.**
- **Before any new agent mechanism:** establish, on development labels and with existing agents and baselines only,
  task families on which strong simple rules demonstrably fail.
- **Candidate levers,** in the order the M16 diagnosis suggests:
  1. **scale:** the roadmap's M8, 100–200 nodes, where one episode reveals little;
  2. **stochastic moves;**
  3. **longer stays;**
  4. **aliased places:** partial observability; CF-05's tasks were never admitted.
- **The output:** admitted tasks with measured capability gaps, or a recorded NOT ADMITTED for each lever.
- **When mechanism work resumes:** only on an admitted task, and only for the capability that task's gap names.

## 5. Minimum criteria before investing in an agent mechanism

A candidate task is admitted only if all three hold on development labels, with the thresholds declared before those
labels are run:

1. **Strong simple baselines demonstrably fail.**
   - **The baselines:** a pre-declared set, each tuned on development labels to be as strong as it can be. At least:
     the adopted agent (AD-13), MBVI3, the stop-after-success rule, and NEWEST plus a tuned window rule wherever
     tracking matters. Add any simple rule that a design calculation suggests could solve the task.
   - **The test:** the gap between the **best** of them (not their average) and the oracle has a 95% lower bound above
     a pre-declared headroom.
2. **An appropriate oracle shows the task is solvable.** A privileged oracle that knows the hidden structure the
   capability would have to infer, and plans with it, reaches the goal within the cap at a pre-declared success rate.
   Its cost is the task's ceiling. Without this, a gap could be impossibility rather than a missing capability.
3. **The task exposes a measurable capability gap.**
   - **Attributable:** a capability-only oracle, privileged in the named capability alone (for example, given the true
     relation but not the map), closes a pre-declared share of the best-baseline gap. The gap is then about that
     capability and not something else.
   - **Measurable:** per-label noise allows a pre-declared fraction of the gap to be detected with power of at least
     0.8 at a feasible number of labels.

**The numbers are not set here.** No headroom, success rate, share, fraction or label count is fixed by this record,
and none may be chosen from any result, including M16's design calculations. They remain to be specified numerically
in the next task-design proposal and declared there before any development label is used.

**How they are applied:**
- A task that fails is recorded as NOT ADMITTED.
- Any redesign is disclosed and runs on fresh development labels.
- Tasks are not shaped toward a mechanism that has not been built.
