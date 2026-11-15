# CF-05b Gate Results — targeted recall of exits that stopped working

**Verdict: CF-05b SUPPORTED AT A COST (R4).** RECALL recovers a reopened route: 18.8 fewer steps after the block is
removed [12.6, 25.1], closing two-thirds of the gap to the privileged reference. It costs 7.7 steps when the change is
permanent [2.3, 12.1]; the upper bound breaks the 10-step margin, so R4 fails. Every other criterion holds.

This was the verdict predicted in the specification before the run. The gate was run once. Nothing was re-run or
tuned after the outcome. **RECALL is not adopted into the agent** (the specification's consequence for this verdict;
also the owner's Decision 7).

| Item | Value |
|---|---|
| Evidence category | Development evaluation gate; out-of-sample validation of a setting selected on independent tuning worlds. Not confirmatory; local commits; no independent reproduction |
| Command | `node experiments/cf05b/run_gate.mjs --domain gate5b` (exit 0) |
| Code and spec | Freeze commit `104dd9b`; `GATE_SPEC.md` SHA-256 `154dd7f7…4c00` (matches `GATE_SPEC.sha256`) |
| Recorded head | `20630c6`. The driver reads HEAD when it finishes; `20630c6` was committed during the run and changes only `docs/engineering/PROJECT_STATE.md` (`git diff --stat 104dd9b 20630c6`). The code under test is the freeze commit's |
| Environment | Node v24.15.0, win32-x64; peak memory 268 MB |
| Result file | `gate5b_result.json`, SHA-256 `689f84e0…f057`; row hash `093d2e91…ec45` |
| Worlds | `cf|gate5b|world|0…39` (24 nodes, 30 edges) and `cf|gate5b|large|0…19` (48 nodes, 60 edges); 0 excluded |
| Reproducibility | Two in-process runs identical; 155/155 tests; 0 capped episodes in the criterion agents |
| Pre-run checks | The driver refused a modified specification, an unfrozen status line, an altered hash file, modified source, and the closed CF-05 gate (verified before launch) |

## Criteria

Differences in steps, 40 worlds, mean [95% interval], median, and how many worlds RECALL needed fewer / more / equal
steps than the comparator.

| Criterion | Statistic | Result | RECALL fewer / more / equal | Held |
|---|---|---|---|---|
| R1 benefit | phase D, CHANGE: MBVI3 − RECALL | **+18.8 [12.6, 25.1]**, median 10.5 | 32 / 3 / 5 | **yes** |
| R2 cost while blocked | phase C, CHANGE: RECALL − MBVI3 | +4.7 [2.9, 6.7], median 3.0 | 2 / 29 / 9 | yes |
| R3 cost when unchanged | SHAM: RECALL − MBVI3 | −6.3 [−15.6, −0.0], median 0.0 | 4 / 0 / 36 | yes |
| **R4 cost when permanent** | PERMANENT: RECALL − MBVI3 | **+7.7 [2.3, 12.1]**, median 6.0 | 2 / 36 / 2 | **no** |
| R5 no regression | RECALL − MBVI3: E1 / E3 / E1S / E2P | 0.0 / 0.0 / −0.2 [−0.8, 0.1] / 0.0 | — | yes |
| R6 beats Dyna-Q+ | CHANGE: Dyna-Q+ − RECALL, at 20 and at 1,300 updates per step | +91.9 [77.3, 108.1]; +161.4 [131.7, 194.3] | 40 / 0 / 0 in both | yes |
| R7 infrastructure | Determinism; tests | identical; 155/155 | — | yes |

## Where it helps and where it costs

Mean steps per arm (phases C = 15 blocked episodes, D = 15 episodes after the block is removed or kept):

| Agent | CHANGE C | CHANGE D | CHANGE C+D (median) | SHAM C+D | PERMANENT C+D (median) | Reopened exit crossed in D (of 15) |
|---|---|---|---|---|---|---|
| ORACLE | 108.5 | 79.8 | 188.4 (186) | 157.5 | 220.3 (219) | 15.0 |
| MBVI3 (the planner) | 115.8 | 108.2 | 223.9 (219) | 161.8 | 226.4 (219) | 0.2 |
| **RECALL** | 120.4 | **89.4** | **209.8** (214) | **155.6** | **234.1** (225) | **7.5** |
| RECALL hazard 0.003 | 116.8 | 98.4 | 215.2 (215) | 158.8 | 227.7 (220) | 3.6 |
| RECALL hazard 0.03 | 129.6 | 89.5 | 219.1 (212) | 154.9 | 252.7 (235) | 8.2 |
| Dyna-Q+ (20 updates) | 199.8 | 102.0 | 301.7 (287) | 196.2 | 373.6 (334) | 10.8 |
| Dyna-Q+ (1,300 updates) | 258.1 | 113.1 | 371.2 (332) | 188.7 | 430.4 (401) | 7.3 |

- **Gap to the reference after removal:** the planner 28.3 steps [22.3, 34.4]; RECALL 9.5 [5.2, 13.9]. RECALL closes
  two-thirds of it.
- **Equal mix of the three arms:** RECALL − MBVI3 = −12.7 steps [−23.4, −3.4] (RECALL better in 23 worlds, worse in 12).
- **Sensitivity:** a weaker setting (0.003) costs almost nothing when the change is permanent (+1.3 [−1.9, 3.4]) and
  recovers half as much (−9.8 [−14.4, −5.5]). A stronger one (0.03) recovers the same as 0.01 and costs +26.3 when
  permanent [15.9, 37.0]. The chosen setting sits at the knee.
- **Dyna-Q+** re-tests more than the planner but pays for it everywhere, and more with more planning; it does not
  recover the route in fewer steps than the planner (−6.2 [−13.3, 0.3] at 20 updates; +4.9 [−0.7, 10.4] at 1,300).
- **Truncation:** no episode hit the 200-step cap in any arm of the primary experiment.

## What RECALL actually does (the two privileged diagnostic arms)

Effect against MBVI3 (positive = fewer steps than the planner):

| Window | RECALL | REALONLY (remembers only real changes) | FALSEONLY (remembers only false alarms) | Residual | Share from real changes |
|---|---|---|---|---|---|
| **CHANGE, phase D** | +18.8 [12.8, 25.4] | **+16.8 [10.7, 23.4]** | +0.9 [0.025, 2.3] | +1.1 [0.0, 3.1] | **0.95** |
| CHANGE, phase C | −4.7 [−6.8, −2.9] | −3.8 [−5.2, −2.5] | −1.0 [−2.9, 0.3] | +0.1 [−0.1, 0.4] | 0.79 |
| CHANGE, C + D | +14.1 [8.7, 20.3] | +13.0 [7.2, 19.4] | −0.1 [−1.6, 1.2] | +1.2 [0.0, 3.4] | — |
| SHAM | +6.3 [0.0, 15.6] | −0.1 [−0.3, 0.0] | **+6.3 [0.0, 15.7]** | +0.1 [0.0, 0.3] | — |
| PERMANENT | −7.7 [−12.0, −2.4] | **−8.6 [−11.6, −5.9]** | +0.8 [−2.3, 5.3] | +0.1 [−0.7, 1.1] | — |

**Mechanism label by the rule fixed in the specification: "combination of both"**, because the false-alarm arm's
lower bound on phase D is 0.025, just above zero. In substance:

- **Recovery from real reversed changes is the mechanism.** It carries 95% of the phase-D benefit and all of the
  permanent-change cost.
- **False-alarm repair is a small, separate effect.** It contributes 0.9 steps on phase D, from 4 of 40 worlds
  (in one of them, world 3, it is the whole of RECALL's benefit). It is the whole of RECALL's apparent advantage in
  the SHAM arm (+6.3, from 4 worlds), where the planner's change detector declared a change that did not happen.
- The residuals are near zero: the two effects add up.

**What this rules out:** that RECALL's benefit is mainly a patch for the change detector (the outside review's
leading concern). **What it does not settle:** whether to call the mechanism "episodic recall" or "a latent
environmental state". As recorded before the run, the two are the same computation here (the prediction step of a
two-regime hidden state per exit); see the architecture decision record.

## Expected net utility (reported; not a criterion)

U(p) = p × B − (1 − p) × C, steps saved per change, where p is the probability that a change reverses. p is not
estimated: nothing in the testbed measures it. B = 14.1 steps (whole post-change period of a reversed change);
C = 7.7 steps (permanent change). Joint bootstrap over the 40 worlds, 10,000 resamples.

| p | 0 | 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 1 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| U(p) | −7.7 | −5.5 | −3.4 | −1.2 | +1.0 | +3.2 | +5.4 | +7.6 | +9.8 | +11.9 | +14.1 |
| 95% interval | [−12.1, −2.4] | [−9.4, −0.7] | [−6.9, 0.9] | [−4.5, 2.7] | [−2.2, 4.7] | [−0.2, 6.8] | [1.8, 9.3] | [3.6, 11.8] | [5.4, 14.6] | [7.1, 17.3] | [8.7, 20.2] |
| Share of resamples with U > 0 | 0.00 | 0.01 | 0.05 | 0.26 | 0.71 | 0.97 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |

**Break-even: p\* = 0.35** (bootstrap median 0.36, 95% interval [0.16, 0.51]; in 99.6% of resamples U crosses zero
once from below, in 0.4% RECALL helps at every p). RECALL is worth having where more than about a third of changes
reverse, is not where fewer than about a sixth do, and the evidence cannot decide in between.

The second form (using R1's phase-D benefit, B = 18.8, which ignores the cost paid while the block is in place) gives
p\* = 0.29 [0.13, 0.40]. It overstates the benefit; the whole-period form above is the one to read.

**Evidence and policy are separate.** The curve is evidence. Choosing p, and so whether to adopt RECALL, is a policy
decision; it is not taken here.

## Scaling experiment: 48 nodes (separate; non-gating; cannot change the verdict)

20 worlds of 48 nodes and 60 edges, 1,200 exploration steps, the setting chosen at 24 nodes applied unchanged.

| Measure | 24 nodes (40 worlds) | 48 nodes (20 worlds) |
|---|---|---|
| Benefit, phase D: MBVI3 − RECALL | +18.8 [12.6, 25.1] | **+36.2 [22.1, 52.9]** (RECALL fewer in 17 of 20) |
| Benefit, whole period (B) | +14.1 [8.7, 20.3] | +28.8 [14.3, 45.9] |
| Cost while blocked | +4.7 [2.9, 6.7] | +7.5 [5.0, 10.3] |
| Cost when unchanged | −6.3 [−15.6, −0.0] | +0.1 [0.0, 0.3] |
| Cost when permanent (C) | +7.7 [2.3, 12.1] | **+14.8 [10.3, 19.9]** |
| Planner's gap to the reference after removal | +28.3 | +43.5 [29.9, 59.6] |
| RECALL's remaining gap | +9.5 | +7.3 [4.5, 10.1] |
| Break-even p\* | 0.35 [0.16, 0.51] | 0.34 [0.21, 0.54] |
| Capped episodes | 0 | 0 |

| Resource and convergence (RECALL, CHANGE arm) | 24 nodes | 48 nodes |
|---|---|---|
| Model states | 24 | 48 |
| State–action pairs tried | 60 | 120 |
| Exits remembered per run; still held at the end | 1.40; 0.15 | 1.50; — |
| Value-iteration backups per decision (MBVI3 → RECALL) | 1,334 → 1,391 (+4%) | 2,823 → 2,926 (+4%) |
| Sweeps per decision; decisions hitting the 100-sweep budget | 23.6; 0.05% | 24.9; 0.07% |
| Wall-clock, 3 task arms, run A (MBVI3 → RECALL) | 139 s → 214 s for 40 worlds | 240 s → 372 s for 20 worlds |

**Reading.** Generalisation of the sign: the setting tuned at 24 nodes recovers the route at 48 nodes with the same
break-even, and both benefit and cost roughly double, as the routes do. Computation: work per decision doubles with
world size and RECALL adds 4% to it; wall-clock rises 54–55%, more than the backup count suggests, because the
mixture belief is recomputed in the planner's inner loop (an implementation cost, not an algorithmic one). Planning
convergence is unaffected: about 24 sweeps per decision at both sizes, and the budget is almost never reached.

## What this shows, and what it does not

**Shown, on 40 fresh 24-node worlds, out of sample:**
- Remembering what an exit did before it was declared worse, and letting that belief return with time, recovers a
  reopened route: two-thirds of the gap to the reference closed, at a 4% computational cost.
- The benefit comes from real reversed changes, not from repairing the change detector.
- It costs about 8 steps when the change is permanent, so whether it is worth having depends on how often changes
  reverse; break-even about a third.
- It beats the textbook re-testing baseline (Dyna-Q+) by a wide margin at both planning budgets.

**Not shown:**
- That RECALL should be in the agent. The cost when changes are permanent is real, and the right p is unknown.
- Anything about changes that reverse after a different delay, several times, or on several edges at once.
- A distinction between "episodic recall" and "latent state": the same computation here.
- Anything confirmatory: one development gate, by the designer, no independent reproduction.

## Amendment after adversarial review (2026-11-15)

The text above is left as first written. An adversarial review ([ADVERSARIAL_REVIEW.md](ADVERSARIAL_REVIEW.md))
found every number correct and the verdict correctly derived, and found the following statements stronger than the
evidence. Each was checked against the recorded rows. These corrections govern how the record may be cited.

1. **Utility, corrected reading.** The pointwise 95% interval for U(p) excludes zero only for p ≥ 0.55
   (U(0.50) = 3.2 [−0.2, 6.8]; U(0.55) [0.8, 8.0]) and is entirely negative only for p ≤ 0.10 (U(0.15) [−8.2, 0.1]).
   Correct reading: **RECALL helps, at 95%, where more than about half of changes reverse; it costs where fewer than
   about a tenth do; between, the evidence does not decide. Point break-even 0.35.** The sentence "is worth having
   where more than about a third of changes reverse, is not where fewer than about a sixth do" is withdrawn.
2. **The effects do not add up.** "The residuals are near zero: the two effects add up" is withdrawn. The phase-D
   residual (+1.1; 44 world-steps, of which 39 come from world 14) exceeds the false-alarm effect (+0.9). In world 14
   RECALL saves 46 steps, REALONLY 0 and FALSEONLY 7: RECALL already behaves differently from the planner during
   training there (and in worlds 33 and 39), so its later memory of the real change acts on a different path. The
   real and false-alarm parts interact; "a small, separate effect" is withdrawn.
3. **Share from real changes: about 89%, not 95%.** REALONLY's effect is 89% of RECALL's own (16.8 of 18.8); the 95%
   in the decomposition table is REALONLY / (REALONLY + FALSEONLY). "The benefit comes from real reversed changes, not
   from repairing the change detector" is replaced by: **mostly recovery from real reversals (about 89%), with an
   interaction the diagnostic arms cannot split cleanly; the rule-fixed label "combination of both" stands.**
4. **The false-alarm lower bound of 0.025 reflects sparse data.** FALSEONLY differs from the planner on phase D in
   only 4 of 40 worlds (3, 5, 14, 33), all positive; a bootstrap resample omits all four with probability
   0.9^40 = 1.5%, below 2.5%, so the lower bound is positive whatever their size. The same holds for RECALL's SHAM
   interval. The rule was applied as frozen.
5. **Computational cost.** "At a 4% computational cost" is replaced by: **4% more value-iteration backups and 54%
   more wall-clock** (139 s → 214 s). The explanation given (recomputing the mixture belief) was not tested. The
   timings do not depend on how much is remembered (FALSEONLY 213.5 s with 0.4 memories per run, RECALL 214.4 s with
   1.4, REALONLY 215.6 s with 0.9), which points to a per-backup overhead of the prototype's planning hook rather
   than to the mechanism. Run B's absolute times are about half of run A's; the ratio is stable at about 1.55.
6. **48 nodes.** "Both benefit and cost roughly double, as the routes do" is withdrawn: the reference's phase D grows
   only 5% (79.9 → 84.2 steps) and its SHAM total 7%. What roughly doubles is the planner's gap to the reference
   (28.3 → 43.5). "Same break-even" means similar point estimates (0.35 and 0.34) with wide intervals. The
   "still held at the end" entry for 48 nodes is 0.2 (CHANGE) and 1.05 (PERMANENT), not "—".
7. **Dyna-Q+.** "Does not recover the route in fewer steps than the planner" is replaced by "not reliably fewer"
   (−6.2 [−13.3, 0.3] at 20 updates).
8. **Two intervals for the same contrast.** R1 appears as [12.6, 25.1] (criteria) and [12.8, 25.4] (decomposition);
   R4 as [2.3, 12.1] and [2.4, 12.0]. They come from separate seeded bootstrap streams. The criteria table is the one
   the verdict used; R4 fails under either.
9. **Not every world in R1 is recovery from a reversal.** In world 3 a false alarm before the block takes every agent
   off the route, so CHANGE and SHAM rows coincide there, and RECALL's 21 steps are false-alarm repair. RECALL already
   differs from the planner before the change in 3 of 40 worlds (14, 33, 39).
10. **Units.** "Reopened exit crossed in D (of 15)" counts crossings of the exit, not episodes.
11. **Provenance.** The result file records HEAD at the end of the run only. That the run launched at `104dd9b` is
    inferred from the specification hash, the clean-tree check and the diff to `20630c6`; it was not recorded at
    launch. The pre-run refusal checks were observed in the session and are not lodged as a log.
12. **Omitted from the record, now added from the JSON.** Tries of the manipulated edge in phase D (CHANGE): ORACLE
    20.5, MBVI3 0.3, RECALL 9.5, REALONLY 8.7, FALSEONLY 0.6, Dyna-Q+ 15.0 and 9.3. Changes declared worse per run
    (CHANGE): MBVI3 1.32, RECALL 1.40. Medians were not computed for the decomposition and utility tables, and
    per-world counts were not computed for R5.
13. **Selection context.** At hazard 0.003 RECALL passes R4 (+1.3, upper bound 3.4) with a phase-D benefit of 9.8
    [5.5, 14.4]. R4's failure belongs to the selected setting, not to targeted recall as such. On `gate5b` the
    selection rule would still have chosen 0.01 (sum of the three arms 599.5, against 601.7 and 626.6).

## Next question (recorded; not started)

RECALL fixes its willingness to re-test (hazard 0.01) in advance, so it pays the permanent-change cost whatever the
world is like. The utility curve says the right willingness depends on how often changes reverse. **An agent that
learns that rate from its own experience** would need no policy choice of p: it would re-test in worlds where changes
reverse and stop in worlds where they do not. Testing that needs a task with several changes per run and a
world-family reversal rate. See the architecture decision record and roadmap.
