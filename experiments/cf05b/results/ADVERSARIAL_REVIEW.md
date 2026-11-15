# CF-05b — adversarial review of the results record, and response

**Date:** 2026-11-15, after the single `gate5b` run. **Reviewer:** an agent that wrote none of the design, code or
record, working read-only (24 tool calls; ran `npm test`, 155/155; never ran the gate). **Verdict on the record:
SOUND WITH CORRECTIONS.** The corrections are made by the dated amendment in [RESULTS.md](RESULTS.md); the original
text, the result file and the verdict are unchanged.

## What the reviewer checked and found correct

- Over 40 numbers in the record against `gate5b_result.json`: all criteria (means, intervals, medians, per-world
  counts), the per-arm table, the decomposition table, the utility table (U, intervals, shares, p\* 0.354, median
  0.357, [0.155, 0.508], 99.6% / 0.4%), the return-only form, the gaps, the net effect, the sensitivity contrasts and
  the 48-node table. All match.
- Hashes (specification, result, rows), peak memory, 0 capped episodes in every arm.
- The verdict: R1–R7 are computed as the specification words them, with the right windows, signs and arms; R4's
  upper bound is 12.05 ≥ 10, so SUPPORTED AT A COST (R4) is correct.
- Leakage: none. Ordinary arms drop both the task context and any caller-supplied params; agents receive only their
  random stream and declared params; there is no mutable module state. Gaps in the tests: the source scan covers four
  files (not `agent_util.mjs`) and the leakage test uses one world.
- Utility: phase C is identical between the CHANGE and PERMANENT arms in 40/40 worlds for every agent, so the shared
  phase-C cost enters B and C consistently; the bootstrap resamples worlds jointly; p is never estimated.
- The 48-node experiment is kept out of the verdict.
- Confounds: `git diff 104dd9b 20630c6` touches only `docs/engineering/PROJECT_STATE.md`; each row gets a fresh
  environment and agent, so arms cannot influence each other.
- The diagnostic attribution of each event: a "real" event fires only while the edge is blocked, and every attempt on
  a blocked edge fails; earlier noise can bring a detection forward in time but cannot create it; a false alarm before
  the block on the edge later blocked is filed under "false", correctly (world 3).

## Findings and response

Each finding was checked against the recorded rows before it was accepted.

| # | Finding | Checked | Response |
|---|---|---|---|
| 1 | **The utility reading is wrong.** The pointwise 95% interval for U excludes zero only for p ≥ 0.55 (U(0.50) [−0.16, 6.84]; U(0.55) [0.83, 8.01]); it is reliably negative only for p ≤ 0.10 (U(0.15) [−8.16, 0.06]) | Confirmed | Amended |
| 2 | **"The two effects add up" is false.** The phase-D residual (+1.1, 44 world-steps) exceeds the false-alarm effect (+0.9); 39 of the 44 come from world 14, where RECALL saves 46 steps, REALONLY 0 and FALSEONLY 7, and RECALL already differs from the planner during training | Confirmed: residual 44 world-steps in worlds 5 (3), 8 (2), 14 (39); RECALL differs from the planner before the change in worlds 14, 33, 39 | Amended |
| 3 | "95%" uses REALONLY / (REALONLY + FALSEONLY); REALONLY is 89% of RECALL's own effect. "Not from repairing the change detector" contradicts the rule's label | Confirmed (0.893) | Amended |
| 4 | FALSEONLY's lower bound 0.025 is an artefact of sparse data: nonzero in 4 worlds, all positive; P(a resample omits all four) = 0.9^40 = 1.5% < 2.5%, so any four positive worlds force lo > 0 | Confirmed (worlds 3, 5, 14, 33) | Amended; the rule was applied correctly and the label stands |
| 5 | "At a 4% computational cost" is wrong: 4% more backups, 54% more wall-clock. The record's explanation is untested and the timings point to per-backup overhead of the planning hook (`agent.mjs`, `predictOf`, building key strings uncached), not to what is remembered | Accepted: FALSEONLY, RECALL and REALONLY take 213.5, 214.4 and 215.6 s with 0.4, 1.4 and 0.9 memories per run | Amended; an implementation note for any successor |
| 6 | 48 nodes: "benefit and cost roughly double, as the routes do" is contradicted: the reference's phase D grows 5% (79.9 → 84.2). What doubles is the planner's gap (28.3 → 43.5). "Same break-even" should be "similar point estimate, wide intervals". "Still held at end" is 0.2 and 1.05 in the JSON, not "—" | Confirmed | Amended |
| 7 | Dyna-Q+ −6.2 [−13.3, 0.3]: "not reliably fewer", not "does not" | Accepted | Amended |
| 8 | The same contrast appears with two intervals (R1 [12.6, 25.1] and [12.8, 25.4]; R4 [2.3, 12.1] and [2.4, 12.0]) from separate bootstrap streams, without a note | Accepted | Amended; R4 fails under either |
| 9 | R1 includes worlds that are not recovery from a reversal: in world 3 a false alarm before the block takes every agent off the route; RECALL differs from the planner before the change in 3 of 40 worlds | Accepted | Amended |
| 10 | "Reopened exit crossed in D (of 15)" counts crossings, not episodes | Accepted | Amended |
| 11 | Provenance is inferred, not recorded: the result records HEAD at the end of the run; launch at `104dd9b` is inferred; the pre-run refusal checks have no lodged log | Accepted | Amended. Driver change for future gates: record HEAD at start and end, and lodge the refusal log |
| 12 | Reporting omitted against the specification: tries of the manipulated edge, changes declared per run, medians for the decomposition and utility tables, per-world counts for R5 (never computed) | Accepted | Amended with the omitted figures available in the JSON; R5 per-world counts recorded as not computed |
| 13 | Selection context: hazard 0.003 passes R4 (+1.3, upper 3.35) with a benefit of 9.8 [5.5, 14.4]; the failure belongs to the selected setting, not to RECALL as such; on `gate5b` the rule would still have picked 0.01 (599.5 vs 601.7 vs 626.6) | Confirmed | Amended |

## Effect on decisions

None of the findings changes the verdict, and none changes the decision not to adopt RECALL. Findings 2, 3 and 4
weaken the mechanism reading from "real reversals, with a small separate false-alarm effect" to **"mostly recovery
from real reversals (about 89%), with an interaction the diagnostics cannot split cleanly"**. Finding 1 narrows the
policy-relevant range: the evidence says RECALL helps where more than about half of changes reverse and hurts where
fewer than about a tenth do. Finding 13 strengthens the case for CF-06: the cost depends on a willingness to re-test
fixed in advance, which a model that learns the reversal rate would set itself.

The living documents that repeated the overstated figures (decision record AD-12, hypothesis registry, milestone
roadmap, project state) are corrected in the same commit.
