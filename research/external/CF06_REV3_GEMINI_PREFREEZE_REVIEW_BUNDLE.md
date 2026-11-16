# Pre-freeze review bundle: draft specification CF-06, REVISION 3 (a belief about whether a changed exit will change back)

> Generated from the working tree on top of commit `5f6890f`; revisions 2 and 3 are not committed yet. **The gate has not been run.** The specification is a draft; its driver refuses to run until the owner marks it frozen and its hash is recorded. Revision 1 and its bundle are in `research/external/CF06_GEMINI_PREFREEZE_REVIEW_BUNDLE.md`.

## How to read this bundle

Everything outside the appendices was written by the party whose design is under review. Treat it as a claim to check against the appendices (the draft specification, the source and the earlier results, verbatim, each with its SHA-256). Earlier outside reviews of this project restated the cover and missed defects that were visible in the code; please work from the appendices.

**Please answer every numbered question below** with a verdict (sound / sound with caveats / weak / wrong), one to three sentences citing an appendix, and the concrete change you would require before freezing. Then rank the five most serious problems and say whether the gate should be frozen as drafted, frozen after named changes, or not run.

## Context in one paragraph

A small reinforcement-learning testbed (24-node graphs, hidden edge reliabilities; the agent sees only its node and the number of exits). The current agent is a learned tabular model with change detection, planned over by value iteration. The previous gate (CF-05b, appendix F) showed that remembering what a changed exit used to do (RECALL) recovers a reopened route but costs steps when the change is permanent, with a break-even reversal probability of about 0.35; its willingness to re-test is fixed in advance. CF-06 was first drafted to test whether the agent can learn how often changes reverse (revision 1). Revision 2 added the owner's corrections: a control with the same model and rho fixed at 1/2, evaluation-only false-alarm and futile re-test diagnostics, h sensitivity, a zero-reversal subset, a weighting grid, rho without pooling. Its development run showed that the control did as well as the learner and that even an agent told the true rate gained less than 60 worlds can detect. **Revision 3 (appendix A) therefore tests the belief, not the learning:** the primary arm is model v6 with rho fixed at 1/2 (a two-regime belief per changed exit, updated by Bayes from failed re-tests, appendix B), against the planner and RECALL at three hazards; learning the rate is reported with claim rules. Its development run (the same worlds that chose the primary, so not evidence) reads SUPPORTED; the specification lists twelve limitations. Appendix A2 records each step against the source. The task (appendix C) has six changes per run; each reverses with a probability set by the world family (0.1, 0.5, 0.9).

## Questions

1. **Re-scoping after development data.** The primary arm was chosen after the development worlds showed that learning the rate added nothing. Is making the simpler mechanism the primary a legitimate pre-registration for a fresh-world gate, or a post-hoc rescue? What would you require to make it clean?
2. **The headroom argument** (appendix A, disclosure; A2 §3): the true-rate reference beats rho = 1/2 by +14.5 [−8.2, 42.4] on the mix, below the n = 60 detectable effect. Is it right to conclude that task E5 cannot test learning the rate, and is the proposed headroom rule for a future task sound?
3. **B4, the mechanism check**: (a) recovery after reversed events against the planner in OFTEN, (b) futile re-tests against RECALL at the same h in RARE. Does it establish that the B1 gain comes from the claimed mechanism, or could B1 and B4 pass for another reason? On the development worlds part of the gain came from returning to an exit the change detector wrongly flagged (dev world 3, OFTEN: +272 steps with no real reversal). Is the claim rule gainSource (B3 again on the worlds where the primary confirmed no false alarm) an adequate separation, given that it conditions on the primary's own behaviour and that the planner's false alarms cannot be seen?
4. **Fixed-policy class.** Are the planner and RECALL at 0.003 / 0.01 / 0.03 a fair class of "fixed willingness to re-test"? The planner itself re-tests (its change detector forgets a destination and it is optimistic about the unknown). A rule that re-tests k times and then gives up is not in the class; with rho and h fixed, the belief is itself a fixed schedule. Should such a rule be added before freezing, and with which k (no development tuning is left that is not contaminated)?
4b. **Concentration.** Against the planner the mix gain is +64.1 [11.5, 125.2] with 10 of 20 worlds on each side (median −5); four OFTEN worlds give 90% of the OFTEN gain. Is a mean-based B1 appropriate, and does the claim rule gainShape (wording only) go far enough?
5. Check `diagnoseE5` (appendix C) against its tests (appendix D): real and false archives, real and false confirmations, futile re-tests; any path by which ground truth could reach the agent?
6. Is the regime-belief arithmetic in appendix B correct, including the stated properties (untested archives leave rho at 1/2; early re-tests carry almost no evidence)?
7. h = 0.01 is borrowed from CF-05b; sensitivity at 0.003 and 0.03 is reported, never used to choose. Should a SENSITIVE TO h label change the verdict?
8. Statistical plan: power per criterion (appendix A), within-world dependence of the three families, multiplicity, the equal-mix weighting (B1 on how many of 66 weightings). Anything mishandled?
9. Development contamination: dev worlds 0–19 have been looked at five times, plus a re-run that recomputed the same rows with two added claim rules (appendix A). Is anything in revision 3 adjusted to them beyond the disclosed choice of primary and the two restrictive claim rules? Power at half the development effect is 0.46 for B1's planner part and for B3: should the gate run at n = 60, or is a larger n required?
10. Is anything in the source (appendices B, C, E) not doing what the specification says?
11. Should the gate be frozen as revision 3 stands, frozen after named changes, or not run?

---

# Appendices (verbatim)

## Appendix A. CF-06 DRAFT specification, revision 3

File: `experiments/cf06/GATE_SPEC.md` · SHA-256 `92d9cf987522b987106433a771672a94edab45680a359e04e1cb660cdc56cc40` · 327 lines

````markdown
# CF-06 Gate Specification — a belief about whether a changed exit will change back

**Status.** DRAFT, revision 3 (re-scoped to the belief on the owner's decision of 2026-11-15), for the owner's
review. Not frozen. The driver refuses to run the `gate6` domain until this line reads "Frozen" and the file's
SHA-256 matches `GATE_SPEC.sha256`. No `gate6` world has been run.

- Development evaluation gate, not confirmatory. Nothing is committed or pushed until the owner says so.
- Earlier gates keep their recorded verdicts; no earlier record or frozen file is edited.
- History: revision 1 (learning the rate, committed `3a3fd55`); revision 2 (the owner's eight corrections); revision 3
  (this one). Why each changed: `PREFREEZE_RECONCILIATION.md` (this folder).

## The question

CF-05b showed that remembering what a changed exit used to do (RECALL) recovers a reopened route, but costs steps
when the change is permanent, and that whether it pays depends on how often changes reverse (point break-even 0.35).
RECALL re-tests on a clock: its willingness to try an abandoned exit grows with time and restarts after each failed
try. **Can a belief do better than any fixed rule — a belief about each changed exit that remembers its old regime
and weighs every failed re-test as evidence of whether the change will reverse?** If so, the agent recovers
reopened routes and gives up on permanent changes without being told which kind of world it is in.

This targets the owner's priorities 3 (change detection and adaptation), 4 (recovery and memory) and 5 (uncertainty:
acting on a posterior over hidden regimes).

**What this gate does not test.** Whether the agent can also *learn* how often changes reverse (hypothesis H-VOL).
On the development worlds even an agent told the true rate gained less than 60 worlds can detect, so task E5 cannot
answer that question; it is reported here (L1–L4) and needs a task built for it.

## The mechanism: world model v6 (`cognitive/mind/v6/`), primary arm BELIEF

The frozen value-iteration planner (`cognitive/core/planner.mjs`) on model v6, with ρ fixed at 1/2. v3 is used
unchanged as the "current regime" model. v6 adds, inside the model:

1. **Two regimes per changed exit.** When v3 declares that an exit got worse, v6 keeps the prediction it held just
   before (the old regime). The exit is then either *permanent* or *reversing* (returns at a time T after the change,
   T geometric with hazard h). A priori P(reversing) = ρ = 1/2.
2. **Bayesian evidence from re-tests.** L_perm = q_new^k; L_rev = S(τ_k) q_new^k + Σ_j [S(τ_{j−1}) − S(τ_j)]
   q_new^(j−1) q_old^(k−j+1), S(t) = (1−h)^t; P(reversing | tests) = ρ L_rev / (ρ L_rev + (1−ρ) L_perm);
   P(old regime now) = P(reversing | tests) × (1 − S(τ_now) q_new^k / L_rev). The first move of such an exit confirms
   a reversal.
3. **The planning belief** for a changed exit is the mixture of its regimes weighted by P(old regime now);
   `predict()` returns it, so the planner needs no rule of its own.

**Relation to RECALL.** With ρ = 1 and before any failed re-test, the weight is 1 − (1 − h)^τ, exactly RECALL's
(tested). The difference: a failed re-test long after the change is strong evidence that the change is permanent,
so the belief gives up where RECALL keeps trying.

**Constants fixed before any development data, not tuned:** h = 0.01 (CF-05b's selection for RECALL on its own
tuning worlds; borrowed, so its sensitivity is reported and never used to choose); ρ = 1/2 (the mean of the Beta(1, 1)
prior of revision 1; fixed as the control by the owner's correction before any data on it).

**How the primary was chosen (disclosed).** Revision 1 made VOL (the same model with ρ learned across changes) the
primary. The development worlds then showed that learning the rate added nothing measurable (VOL took 4.4 fewer steps
than BELIEF on the mix, [−12.5, 23.3]) and that the task gives knowing the rate almost no value. Revision 3 makes the
simpler mechanism the primary because it is simpler and because it is what the task can test; its development score
is not better than VOL's. The criteria B1–B5 were written with BELIEF's development numbers already known (it was
revision 2's control).

**Declared limits.** A false alarm of v3's change detector archives an exit that never changed (0.65–0.85 per run on
dev). The belief then also returns the agent to that exit, which is a second route to a gain that has nothing to do
with the world changing back; the claim rule gainSource separates the two. Re-tests soon after a change (τ ≪ 1/h)
carry almost no evidence.

## Task E5 (`cognitive/testbed/task_e5.mjs`)

24-node, 30-edge worlds (the primary environment; no larger world is in this gate). Hidden per-edge reliabilities
U[0.5, 1]. 600 unrewarded exploration steps; 30 training episodes to a cued goal at distance ≥ 3; then **six change
events**. Each blocks, without notice, an edge on a currently shortest route whose removal keeps the goal reachable;
after 10 episodes the block is removed (probability p) or kept for the rest of the run; then 10 more episodes.
Episodes are capped at 200 steps. Families: RARE p = 0.1, HALF p = 0.5, OFTEN p = 0.9. The schedule is drawn in
advance from the true graph only, identical for every agent in a world and family. **Every world is run in all three
families by every arm.**

**Evaluation-only diagnostics** (`diagnoseE5`, after the agent's last step, from one read of the environment trace;
nothing reaches an agent): futile re-tests (attempts on a permanently blocked edge after its block window), per event;
for v6 arms, each archive the model opened and each reversal it confirmed classified as real or false alarm, changes
detected, and ρ at each detection. The model's event log is its own record, checked row by row against the trace.

## Arms (the baseline table)

| Arm | What it is | Information it receives | Role |
|---|---|---|---|
| MBVI3 | The planner on model v3. Keeps no memory of what a changed exit used to do; after a change it forgets the exit's destination and re-tests from optimism about the unknown until the impassable weight dominates | Observations | Fixed policy (B1–B5) |
| RECALL_003 / RECALL_01 / RECALL_03 | CF-05b's RECALL at hazard 0.003 / 0.01 / 0.03: re-tests on a clock | Observations | Fixed policies (B1; RECALL_01 in B4b) |
| **BELIEF** | **Model v6, ρ fixed at 1/2, h = 0.01** | Observations and two constants | **Primary** |
| BELIEF_H003 / BELIEF_H03 | BELIEF with h = 0.003 / 0.03 | Observations | Sensitivity; in no criterion |
| VOL | Model v6 with ρ learned across changes (empirical Bayes, Beta(1, 1)) | Observations | Reported (H-VOL, L1–L4) |
| VOL_RHO_TRUE | Model v6 with ρ fixed at the family's true p | **The family's true p (privileged)** | Reference: the headroom for learning the rate; in no criterion |
| ORACLE | Shortest path on the true current graph | Privileged oracle | Reference; in no criterion |

All learner arms: value-iteration budget 100 per decision, the same worlds, schedules, environment streams and agent
seed labels; work per decision is reported (RECALL uses the v4 planner hook and does more work per decision). BELIEF
and VOL take identical decisions until VOL's ρ first leaves 1/2 (tested).

## Criteria

All on fresh worlds; mean [95% bootstrap interval] over worlds, paired by world. A criterion on an empty contrast
never passes.

| Criterion | Statistic | Rule |
|---|---|---|
| **B1** beats every fixed policy over the equal mix | For each X ∈ {MBVI3, RECALL_003, RECALL_01, RECALL_03}: per-world sum over the three families of steps(X) − steps(BELIEF) | mean > 0 and lower bound > 0, **for all four** |
| **B2** safe where re-testing hurts | RARE: steps(BELIEF) − steps(MBVI3) | upper bound < 25 steps |
| **B3** helps where changes reverse | OFTEN: steps(MBVI3) − steps(BELIEF) | mean > 0 and lower bound > 0 |
| **B4** the mechanism, both parts | (a) OFTEN, steps in the episodes after reversed events, MBVI3 − BELIEF: it recovers reopened routes. (b) RARE, futile re-tests, RECALL_01 − BELIEF (the same h): it gives up on permanent changes from evidence, not on a clock | each: mean > 0 and lower bound > 0 |
| **B5** no regression | BELIEF − MBVI3 on E1 EXPLORED, E3, E1S EXPLORED, E2P PRE | every upper bound < 10 steps |
| **B6** infrastructure | Two in-process runs identical; all tests pass | all |

| Verdict | Condition | Consequence, fixed now |
|---|---|---|
| SUPPORTED | B1–B6 | Adversarial review, then a proposal to the owner to make model v6 with ρ fixed at 1/2 the agent's model. Nothing changes in the agent before that decision |
| SUPPORTED WITH EXCEPTIONS | B1 holds; some of B2–B5 fail (listed) | Not adopted as it stands; the failing criterion names the next design question |
| NOT SUPPORTED | B1 fails | Not adopted. The belief is recorded as not enough at this scale |
| INVALID | B6 fails | None |

**Why these criteria.** B1 is the capability claim: no fixed willingness to re-test is best in every family, so a
belief that adapts to each change should beat each of them over a mix of worlds. B2 and B3 say where it must show.
B4 checks that the claimed mechanism is present where it should act: recovery where changes reverse (against the
planner, which has no memory of the old regime) and giving up where they do not (against RECALL with the same h, which
re-tests on a clock). B4a counts every step after reversed events, so it cannot by itself say that the gain comes from
re-using reopened routes rather than from returning to an exit the change detector wrongly flagged; gainSource reports
that split and limits the wording. The 25-step margin is about 2% of the planner's total over a run in RARE.

**Claim rules, fixed now** (reported beside the verdict; they never change it):

| Claim | May be written only if |
|---|---|
| L1 "Learning the rate adds value" | BELIEF − VOL on the mix: mean > 0 and lower bound > 0, and in every family lower bound > −25 |
| L2 "This task can test learning the rate" | BELIEF − VOL_RHO_TRUE on the mix: lower bound > 0. Otherwise the record says that E5 gives knowing the rate no measurable value, and L1 is not evidence either way |
| L3 "VOL's learned rate moves in the right direction" | VOL's final ρ, OFTEN − RARE: mean > 0 and lower bound > 0. Never "estimates the rate" |
| L4 "VOL learns to stop re-testing where changes never reverse" | On the RARE worlds whose changes were all permanent (at least 10 of them): VOL's futile re-tests below BELIEF's in total and in events 4–6 (both upper bounds < 0) |
| h-robustness | ROBUST (B1 holds at h = 0.003, 0.01 and 0.03) / DIRECTION ROBUST (every B1 part has mean > 0 at all three) / SENSITIVE TO h (naming where B1 fails). The verdict uses h = 0.01 only |
| Weighting | The verdict uses the equal mix; the record states beside it on how many of 66 weightings (0.1 grid) B1 holds |
| gainSource: "recovers reopened routes" | B3 holds again on the OFTEN worlds where BELIEF confirmed no false alarm (evaluation diagnostics; at least 10 such worlds): REOPENED ROUTES. Otherwise NOT SHOWN APART FROM FALSE-ALARM RECOVERY (the record says the gain includes returning to exits the detector wrongly flagged) or NOT ASSESSED |
| gainShape: "consistently better" | Every B1 part and B3 has more worlds in favour than against and a positive median: CONSISTENT. Otherwise TAIL-DRIVEN, naming the parts, and the record says "a lower expected cost, from a minority of worlds" |

gainSource and gainShape were added after the revision-3 development look, in the restrictive direction: they limit
what may be written and never change the verdict. On the development worlds they read REOPENED ROUTES and TAIL-DRIVEN
(B1 against the planner).

## Statistical plan

| Item | Value |
|---|---|
| Domain / worlds | `gate6`; `cf|gate6|world|0…59`, never used before (no file in the repository uses these labels); 24 nodes, 30 edges, maximum degree 4 |
| Sample size | n = 60, the cap of the rule n = max(20, ⌈(2.8·SD/mean)²⌉): the rule gives 34 at the development effects of B1 (planner part) and B3, and about 135 at half of them; see the power table |
| Unit and intervals | The world; percentile bootstrap, 10,000 resamples, 95% |
| Truncation | A capped episode counts its cap in every mean and median; capped episodes are counted per arm and family; the primary's count is printed beside the verdict |
| Robust summaries | Medians and per-world counts beside every mean |
| Families within a world | Not independent (same graph, layout, reliabilities, agent seed); every contrast is formed per world first and the world is resampled |
| Multiplicity | All parts of B1–B6 required for SUPPORTED: conservative as a whole. Reported contrasts (L1–L4, sensitivity, families) are uncorrected and cannot change the verdict |
| Reproducibility | Two in-process runs must give identical row hashes; HEAD recorded at launch and at the end; wall-clock and memory outside the hashed rows; the machine kept awake during the run |

**Power** at n = 60 (two-sided 5%, normal approximation, development means and SDs). The development means were seen
before the primary was chosen, so the column at half the development effect is the one to plan on.

| Criterion part | Dev mean | Dev SD | MDE80 at n = 60 | Power at the dev effect | Power at half of it |
|---|---|---|---|---|---|
| B1, planner | +64.1 | 133.5 | 48.3 | 0.96 | 0.46 |
| B1, RECALL 0.003 | +99.0 | 105.7 | 38.2 | 1.00 | 0.95 |
| B1, RECALL 0.01 | +297.4 | 168.9 | 61.1 | 1.00 | 1.00 |
| B1, RECALL 0.03 | +835.6 | 634.1 | 229.2 | 1.00 | 1.00 |
| B2 (upper bound < 25) | +0.1 | 24.3 | — | 1.00 | 1.00 |
| B3 | +45.6 | 94.6 | 34.2 | 0.96 | 0.46 |
| B4a | +27.7 | 45.8 | 16.6 | 1.00 | 0.65 |
| B4b | +93.2 | 63.5 | 22.9 | 1.00 | 1.00 |
| All of B1–B4 (product, as if independent) | | | | 0.92 | 0.13 |

B1's planner part and B3 share the OFTEN family, so the true joint power is above the product. B5 is exactly zero in
every development world (below). Reported, for scale: L1 MDE80 15.2 (power 0.13 at its dev mean), L2 21.6 (0.47).

## Reported (not pass/fail)

Every arm in every family: total, median, steps while blocked and after reversed / permanent events, capped episodes,
futile re-tests, events per run, work per decision; every arm against BELIEF. **h sensitivity**: B1–B4 statistics at
h = 0.003 and 0.03. **Learning the rate**: L1 per family and on the mix, BELIEF − VOL in events 1–3 and 4–6 per family,
the headroom (L2) per family, VOL − the true-rate reference. **Zero-reversal RARE subset**: futile re-tests per event
for every arm, ρ at each detection, BELIEF against the planner's floor and against RECALL. **False alarms** for every
v6 arm. **VOL's ρ without pooling**: quantiles per family, per-world ordering, by the realised number of reversals,
correlation with the realised share, the ideal-observer bound. **Weighting grid** for B1 and L1. **Where the gain
comes from** (OFTEN and HALF): the planner − BELIEF difference split by whether BELIEF confirmed a false alarm, steps
after reversed events in the worlds without one, and crossings of reopened edges. Wall-clock and memory per arm.

## Test plan

| Test (`cognitive/tests/test_vol.mjs` unless stated) | What it guards |
|---|---|
| v6 isolation and allowed imports (static) | The mind cannot import the task or the testbed |
| Privilege under the v6 registry | Only ORACLE gets the oracle; VOL ignores a caller-supplied ρ |
| Regime-belief closed forms; a failure lowers the belief; time restores it | The arithmetic of the mechanism |
| Learning ρ (never / always reverse); `rhoFixed` honoured | VOL's direction; BELIEF's constant |
| Mixture stays normalised | Valid predictions for the planner |
| E5 schedule; E5 rows and windows; VOL on E5 | The task as specified; determinism |
| **The belief arm: ρ stays 1/2 through real changes; h reaches the model through the registry** | The primary and its sensitivity arms are what they claim |
| Zero evidence → ρ = 1/2 exactly; later failed re-tests lower it; the event log is a copy | The degeneration property; no write-back |
| Fairness: same four constructor arguments, same budget, identical decisions until VOL's ρ leaves 1/2 | BELIEF and VOL compare like with like |
| Diagnostics on a hand-built trace with known answers; shifted-log and confirm-without-open mutants refused | False-alarm and futile-re-test arithmetic |
| Diagnostics are evaluation-only: one trace read after the last episode; totals agree with per-event rows; the planner has no log | Ground-truth isolation |
| Whole suite (`npm test`, 169 tests) and the earlier gates' test files | No regression |
| Behaviour unchanged by the diagnostics | The revised task reproduced all 48 stored development rows of revision 1 field by field |
| Pre-freeze checks (driver) | Refuses: unfrozen spec, hash mismatch, uncommitted files, gate already run |

## Development-domain disclosure (`cf|dev|world|0…19`)

Looked at five times, all disclosed: the admission look (fixed arms); one VOL look (revision 1, a-priori constants);
the 8-world driver validation (dev 0–7); the revision-2 run (ten arms, including BELIEF under the name VOL_FIXED05);
the revision-3 run (adds BELIEF at h = 0.003 and 0.03 and BELIEF on the battery; the other 640 rows are identical to
revision 2's, checked field by field). A re-run after gainSource and gainShape were added recomputes the same rows
with the two splits. No constant was changed after any look. **The development verdict below is not evidence for the
hypothesis: these worlds chose the primary, and the criteria were written knowing its numbers.**

Development result, 20 worlds, as the driver computes it: **SUPPORTED** (B1–B6), tests 169/169, the two runs
identical, no capped episode for the primary. Claim rules: L1 no, L2 no, L3 yes, L4 no (10 zero-reversal worlds),
h DIRECTION ROBUST, B1 on 26 of 66 weightings, gainSource REOPENED ROUTES, gainShape TAIL-DRIVEN (B1, planner part).

**Steps over the change phase of a run** (mean; lower is better)

| Arm | RARE | HALF | OFTEN | Mix |
|---|---|---|---|---|
| ORACLE | 1134.8 | 991.5 | 761.9 | 2888.2 |
| MBVI3 | 1216.0 | 1109.2 | 925.1 | 3250.2 |
| RECALL_003 | 1287.5 | 1124.8 | 872.9 | 3285.1 |
| RECALL_01 | 1430.2 | 1189.8 | 863.6 | 3483.6 |
| RECALL_03 | 1712.8 | 1424.7 | 884.2 | 4021.8 |
| **BELIEF** | **1216.0** | **1090.6** | **879.5** | **3186.1** |
| BELIEF_H003 | 1223.0 | 1093.7 | 883.8 | 3200.4 |
| BELIEF_H03 | 1216.5 | 1097.0 | 895.2 | 3208.7 |
| VOL | 1215.8 | 1088.7 | 877.1 | 3181.7 |
| VOL_RHO_TRUE | 1215.5 | 1090.6 | 865.5 | 3171.6 |

**Criteria** (mean [95%], median, worlds in favour / against)

| Part | Development | Rule |
|---|---|---|
| B1, planner | +64.1 [11.5, 125.2], median −5, 10 / 10 | holds |
| B1, RECALL 0.003 / 0.01 / 0.03 | +99.0 [53.5, 143.0] 17 / 3; +297.4 [224.1, 368.9] 19 / 1; +835.6 [597.1, 1138.8] 20 / 0 | hold |
| B2, RARE, BELIEF − planner | +0.1 [−10.9, 10.0], median +6.5 (BELIEF slower in 12 of 20) | upper bound < 25: holds |
| B3, OFTEN | +45.6 [10.9, 90.8], median +7, 11 / 9 | holds |
| B4a, OFTEN, after reversed events | +27.7 [10.3, 49.1], 14 / 3 | holds |
| B4b, RARE, futile re-tests against RECALL 0.01 | +93.2 [67.6, 122.0], 20 / 0 | holds |
| B5, battery | 0.0 in every world of all four cells | holds |

**Where the gain over the planner comes from** (reported)

| Item | Development |
|---|---|
| OFTEN, by window (planner − BELIEF) | while blocked +16.9 [−2.9, 41.9]; after reversed events +27.7; after permanent events +1.1 |
| OFTEN, the four largest world gains (328, 272, 118, 105 steps) | 823 of the 913 summed steps |
| gainSource, OFTEN worlds where BELIEF confirmed no false alarm (11) | +46.6 [4.6, 111.0], median +10, 7 / 4 |
| … worlds where it confirmed one (9) | +44.4 [−2.9, 110.8], median −2, 4 / 5 |
| Example of the second route: dev world 3, OFTEN | +272 steps with no real reversal confirmed and no reopened edge crossed in its after-window; one false alarm confirmed |
| Crossings of a reopened edge in its after-window, BELIEF − planner, OFTEN | +3.9 [1.9, 6.0], 12 / 1: the planner almost never re-uses a reopened edge |
| RARE, by window | while blocked −3.5; after reversed events +3.5; after permanent events −0.1 |

**The trade-off against RECALL in OFTEN.** RECALL 0.01 − BELIEF: total −15.8 [−44.9, 9.4]; after reversed events
−27.4 [−57.3, −5.5] (RECALL recovers faster); while blocked +11.3 [0.9, 22.4] (BELIEF re-tests less during the block).
After reversed events BELIEF closes about half of the gap between the planner (406.8) and RECALL 0.01 (351.6), at 379.1,
and pays none of RECALL's cost in RARE. The true-rate reference (ρ = 0.9) reaches 353.3.

**h sensitivity.** B1–B4 hold at h = 0.003. At h = 0.03, B1's planner part fails (+41.5 [−5.8, 96.2]); B2–B4 hold.
Label DIRECTION ROBUST.

**Learning the rate** (reported). L1 BELIEF − VOL on the mix +4.4 [−12.5, 23.3]; L2 headroom +14.5 [−8.4, 42.1]
(RARE +0.6, HALF 0.0, OFTEN +13.9), below the MDE of 21.6; L3 VOL's final ρ, OFTEN − RARE, +0.31 [0.24, 0.36]; VOL's
ρ medians 0.34 / 0.50 / 0.70, ordered in 11 of 20 worlds.

**Zero-reversal RARE worlds** (10). BELIEF − planner: steps +8.2 [−7.1, 19.0] (BELIEF slower in 9 of 10); futile
re-tests +2.2 [−2.2, 6.3]. RECALL 0.01 − BELIEF futile re-tests +94.2 [59.5, 130.3]. VOL − BELIEF futile −1.8
[−3.5, 0.2]; events 4–6 −0.5 [−2.1, 1.2] (L4 not shown). VOL's ρ at detection falls from 0.58 to 0.33 over the six
events.

**False alarms of the change detector, BELIEF, per run** (from ground truth, after the run)

| Family | Archives real / false (false before the first change) | Confirmations real / false | Share of confirmations false | Worlds with a false confirmation |
|---|---|---|---|---|
| RARE | 5.35 / 0.85 (0.35) | 0.30 / 0.85 | 0.74 | 14 |
| HALF | 4.65 / 0.80 (0.35) | 1.05 / 0.65 | 0.38 | 10 |
| OFTEN | 2.60 / 0.65 (0.35) | 1.15 / 0.60 | 0.34 | 9 |

**Weighting.** B1 holds on 26 of 66 weightings, with every part's mean positive on 63. It fails against the planner
only where OFTEN carries 0.3 of the weight or less (in RARE BELIEF only matches the planner), and against RECALL 0.003
or 0.01 only where OFTEN carries 0.5 or more and RARE 0.3 or less.

**Run time.** About 3 s per run on the development machine; the gate (60 worlds, three families, ten arms, two runs,
and the battery) takes about 3 hours.

## Remaining scientific limitations

1. **Development contamination.** The primary was chosen after the development worlds, and B1–B5 were written with
   BELIEF's numbers known. Nothing was tuned, but the development effects are an optimistic guide: at half of them,
   B1's planner part and B3 each have power 0.46.
2. **The gain over the planner is concentrated.** Ten of 20 worlds favour the planner on the mix (median −5); in OFTEN,
   four worlds supply 90% of the gain. The belief's value is mostly avoiding rare long failures to return to a good
   route, not a steady saving. gainShape fixes the wording.
3. **Two routes to the gain.** Keeping the old regime returns the agent both to routes that reopened and to exits its
   change detector wrongly flagged. gainSource conditions on BELIEF's own false confirmations, and the planner's false
   alarms cannot be seen (v3 keeps no event log and is not changed), so the split is evidence about the source, not a
   proof of it.
4. **B4a cannot attribute the gain on its own** (it counts every step after reversed events); B4 shows that the
   mechanism is present where it should act, not that it is the whole gain.
5. **RECALL recovers faster where reversals are common** (after reversed events, −27.4 [−57.3, −5.5] on dev). ρ = 1/2
   under-weights reversal where 90% reverse; knowing the rate would close it, but by less than 60 worlds can detect.
6. **h.** Borrowed from CF-05b, where it was chosen for RECALL. B1 fails at h = 0.03 on dev (planner part).
7. **The fixed-policy class** is the planner and RECALL at three hazards. A rule that re-tests k times and then gives
   up is not in it. With ρ and h fixed, BELIEF is itself a fixed schedule (a function of the times of failed re-tests);
   the claim is that a schedule derived from a two-regime model, with no constant tuned on E5, beats fixed-hazard
   re-testing and the planner's reset, not that Bayesian inference beats every hand-made schedule.
8. **A mixture claim.** B1 needs the families together: alone, RARE shows no gain over the planner and OFTEN no gain
   over RECALL. B1 holds on 26 of 66 weightings on dev.
9. **The change detector is v3's, unchanged**: 0.65–0.85 false archives per run; in RARE 74% of confirmed reversals
   are false alarms. The planner's optimism after a reset already re-tests changed exits; the comparison is with the
   planner as it is.
10. **Where nothing reverses, the belief costs a little**: +8.2 steps against the planner on the zero-reversal worlds
    (inside B2's margin).
11. **B5 cannot fail on these tasks as they stand**: BELIEF and the planner take identical steps in every development
    world; it shows that the extension is inert there.
12. **Scope.** One kind of change (an edge blocked on a shortest route), a fixed 10-episode delay, three reversal
    probabilities, six changes per run, 24-node worlds, one environment class. Learning the rate is not tested.

## Future questions (not tested here)

Recorded in `docs/experiments/HYPOTHESIS_REGISTRY.md`: **H-VOL** (learning how often changes reverse; needs a task
where knowing the rate is worth at least twice the detectable effect — the headroom rule), **H-VOL-DRIFT** (a rate
that drifts within a run), **H-VOL-CONT** (reversal delays from a law the model does not assume; E5 reverses after
exactly 10 episodes and h is the only probe here), **H-VOL-XFER** (carrying ρ from one world to the next). Two design
questions from this work: the change detector's false alarms, and the planner's optimism after a reset, which
already does some of the re-testing a belief is meant to decide.
````

## Appendix A2. Reconciliation of the owner corrections against the source

File: `experiments/cf06/PREFREEZE_RECONCILIATION.md` · SHA-256 `5cb6b97a7e23bd4104b394aa1d330a731abc97a2e514d77dbaf40c444f5a349e` · 175 lines

````markdown
# CF-06 pre-freeze reconciliation — the owner's corrections against the source

**Status.** Working record for the owner's review, 2026-11-15. Nothing in it is committed. The specification is
still a draft (`GATE_SPEC.md`, revision 2); the `gate6` domain has not been run; no frozen file was edited (checked:
`git diff` is empty for `experiments/cf03b … cf05b` and `research/`; CF-05b spec SHA-256 `154dd7f7…` and result
`689f84e0…` unchanged).

## 0. Which review was reconciled

The file supplied as Gemini's CF-06 review (`Downloads/gemini_Review-.txt`) is **byte-identical** to the CF-05 /
CF-05b review already lodged (`research/external/CF05_CF05B_GEMINI_REVIEW.md`, SHA-256 `8f9d8635377fa2d4…`). It does
not mention CF-06, task E5, model v6, VOL or ρ, so it is not a review of this draft. What follows reconciles the
**eight corrections in the owner's decision**, taken as the substance of the review, against the code and data.
The actual CF-06 review text is still needed: to lodge it verbatim and to check it for points outside the eight.

## 1. The eight points

| # | Point | Verdict | Evidence in the source | What was done (draft only) |
|---|---|---|---|---|
| 1 | No fixed-ρ = 0.5 control | **Valid, and the most important.** | The draft's arms (`run_gate.mjs`, `ARMS`) had no arm with v6's belief but an unlearned ρ. VOL's gain over the fixed policies could come from the two-regime Bayesian belief (failed re-tests counted as evidence) rather than from learning ρ. My own bundle asked this (question 6) but the draft did not act on it. | Arm `VOL_FIXED05` (same model, belief, seeds, environment, planner budget; ρ fixed at 1/2 = the prior mean). New criterion **V7** and a new verdict **BELIEF, NOT LEARNING** (V1 holds, V7 fails). Test: the two arms take identical decisions until VOL's ρ first leaves 1/2. **Dev: control − VOL +4.4 [−12.0, 23.6]; the control alone beats all four fixed policies. The gain is the belief, not the learning** |
| 2 | False-alarm diagnostics | **Valid.** The draft declared the bias (a false alarm, once it moves again, counts as a confirmed reversal and pushes ρ up) but did not measure it. No leakage existed to fix: VOL receives observations only. | `world_model.mjs` header ("Known limit"); no ground-truth comparison anywhere in the driver. | The v6 model keeps an event log of its own archive openings and confirmations (`eventLog()`, step-stamped; the model never reads it). `diagnoseE5` in the task compares it with the schedule **after the agent's last step**: real vs false archives, real vs false confirmations, changes detected, ρ at each detection. Tests: hand-built trace with known answers; shifted-log and confirm-without-open mutants refused; static check that the trace is read once, after the last episode |
| 3 | h sensitivity | **Valid.** h = 0.01 was CF-05b's selection for a different mechanism (RECALL) on its own tuning worlds; the draft disclosed this but tested nothing else. | `WM6_DEFAULTS.volHazard`; draft "Things to doubt" 4. | Arms `VOL_H003`, `VOL_H03`. Reported only; the verdict uses h = 0.01 (fixed before any data). Pre-declared label **ROBUST / DIRECTION ROBUST / SENSITIVE TO h**. No h is chosen from any result |
| 4 | Zero-reversal degeneration | **Valid, and sharper than stated.** Two properties of v6 make it real (now stated in the model header and tested): (a) an exit never re-tested gives no evidence, so with every open archive untested the fixed point is **ρ = 1/2 whatever the number of changes** — ρ falls only through failed re-tests, which cost steps; (b) with Beta(1, 1) and six permanent changes ρ cannot fall below 1/8 even with perfect evidence. | `regimeBelief` with k = 0 gives L_rev = L_perm = 1; the fixed point of ρ = (1 + nρ)/(2 + n) is 1/2. | RARE worlds whose six changes were all permanent are analysed separately: futile re-tests per event (own edge after its block window; earlier permanent edges), ρ at each detection, final ρ quantiles, VOL against the control and the planner. **Claim rule fixed now:** "VOL learns to stop re-testing where changes never reverse" may be written only if VOL's futile re-tests are below the control's in total and in events 4–6 (both upper bounds < 0) |
| 5 | Audits (power, weighting, overlap, fairness, leakage) | **Partially valid.** Weighting dependence and power were real gaps; overlap was already disclosed; no leakage was found. | See §2 | Weighting grid (66 points); power recomputed for every criterion; leakage list in §2.5 |
| 6 | Can six changes support "learning the rate"? | **Valid, and the evidence goes further.** Six changes support a claim about **direction** only. More decisive: in E5 even perfect knowledge of the rate is worth less than one detectable effect, so the task cannot test whether learning it pays. | §3 | V4 is stated as an ordering test only; quantiles, per-world ordering, ρ by realised number of reversals, correlation with the realised share, and the ideal-observer bound are reported |
| 7 | Keep 24 nodes / 30 edges | **Agreed; no change needed.** The draft never had a 48-node arm. | `parameters.world` in the driver | None |
| 8 | Drifting volatility, unfamiliar reversal distributions | **Agreed: future questions.** Neither can be tested inside CF-06 without a new task family, which would need its own admission evidence. | E5 holds ρ fixed per family and reverses after exactly 10 episodes | Recorded in `docs/experiments/HYPOTHESIS_REGISTRY.md` as H-VOL-DRIFT, H-VOL-CONT, H-VOL-XFER (uncommitted) |

## 2. Audits

### 2.1 Power

Revision 1's figures were right as arithmetic (V1 against the planner: smallest detectable effect 49 at n = 60
against a dev effect of 68.5, so P(pass) ≈ 0.98 if the dev effect is true; it is one 20-world estimate with interval
[13.8, 130.1], and at half that effect the power is about 0.5). What revision 1 could not show is the power of the
question that matters, V7: at the dev effect +4.4 (SD 42.0) P(pass) ≈ 0.12, and 80% would need about 700 worlds. The
full table is in the specification; P(BELIEF, NOT LEARNING) ≈ 0.85. Within-world dependence of the three families is
handled correctly (contrasts are formed per world, the world is resampled).

### 2.2 Family weighting

The equal mix is one point of the weight simplex. It is defensible as the uninformative weighting of three designer-
chosen families, but not privileged: at pure RARE no re-testing policy can beat the planner (V1 against MBVI3 must
fail there), and at pure OFTEN RECALL 0.01 is the strongest fixed policy. The driver now reports every weighting on
a 0.1 grid (66 points) for the four fixed policies and the control. The verdict still uses the equal mix (fixed now);
the grid shows how much of the simplex the conclusion covers.

### 2.3 Development / validation overlap

Correct as disclosed: the 8-world driver validation reused dev worlds 0–7, which were among the 20 dev worlds of the
VOL look, so it is not independent evidence. The gate domain is untouched: no source, script or result in the
repository uses `cf|gate6|` world labels (searched). Revision 2 adds one more look at dev worlds 0–19 (the new arms);
it is disclosed in the specification, and no constant was changed after it.

### 2.4 Baseline fairness

| Item | Status |
|---|---|
| Same worlds, schedules, environment streams and agent seed labels for every arm | Yes (`runE5`: `${world}|E5|env`, `${world}|E5|agent`; schedule from the true graph only) |
| Same planner budget | VI budget 100 for MBVI3, RECALL, VOL and its variants; work per decision is reported |
| Control is the same model with only ρ unlearned | Yes; tested to act identically while the beliefs agree |
| Fixed policies span the re-testing range | The planner and three RECALL hazards; plus the control. RECALL uses the v4 planner hook (more work per decision, reported). **Correction:** the draft called MBVI3 "never re-tests"; it does (22.9 futile re-tests per RARE run on dev), because v3 forgets a changed exit's destination (`world_model.mjs:159`) and the planner is optimistic about the unknown. Label corrected; V2 compares against a planner that already re-tests at a floor |
| Asymmetry disclosed | VOL is compared with five fixed policies chosen by the designer; "best fixed policy per family" is read off post hoc and is optimistic for the fixed side |

### 2.5 Information leakage

| Channel | Finding |
|---|---|
| What an agent is built with | `makeAgent(kind, env, label, params)`; the registry hands the agent only `{ rng, params }` (oracle only to ORACLE, CF-01 rule; tested) |
| Parameters | VOL: none from the task. VOL_FIXED05: the constant 1/2. **VOL_RHO_TRUE: the family's true p — privileged by design**, labelled, in no criterion |
| Schedule | Drawn from the true graph only, before the run; never passed to an agent |
| Diagnostics | Computed in `runE5` after the agent's last step, from one read of the environment trace; the agent source contains no reference to them (static test) |
| v6 event log | Written by the model from its own observations, read only by evaluation code |
| Same agent seed across families | Intended (common random numbers); differences are paired by world |
| `gate6` labels | Unused anywhere before the gate |

### 2.6 Defects found in this pass that the review did not name

1. **A criterion on an empty contrast would have passed.** In the draft driver `C.V2….hi < MARGIN` and the battery
   check compare a `null` bound, and in JavaScript `null < 25` is true. Repaired: `lbPos` / `ubBelow` require n > 0.
2. **Empirical-Bayes self-influence.** ρ includes each archive's own evidence (no leave-one-out), so during the first
   change VOL already differs from the control through that change's own failed re-tests. Not changed (it is the
   specified estimator); disclosed, and the driver reports control − VOL separately for events 1–3 and 4–6, so
   learning **across** changes shows as a gap that grows with the event index.
3. **Failed re-tests soon after a change carry almost no evidence** (S(τ) ≈ 1 for τ ≪ 1/h). ρ moves only on re-tests
   made long after the change. Disclosed.
4. **The zero-reversal claim rule first accepted a single world** (a one-world bootstrap interval is a point). It now
   needs at least 10 such worlds.
5. **The planner's label** (above, §2.4).

## 3. Can six changes per run support the learning claim?

**No — but not mainly for the reason the correction anticipated.** Six changes do let ρ move, in the right
direction: V4 holds in 20 of 20 dev worlds, and in worlds where nothing reverses VOL's ρ at each new change falls
steadily (0.58 → 0.33, lower in 10 of 10). They do not let it be estimated: ρ moves about half as far from 1/2 as an
ideal observer would (0.31 vs 0.13 with no reversal, 0.68 vs 0.88 with six), and the families overlap world by
world (RARE < HALF < OFTEN in 11 of 20). In RARE three of four confirmed reversals are false alarms of the change
detector, so ρ there measures the detector as much as the world.

The decisive problem is different: **in E5, knowing the rate is worth almost nothing.** An agent told the true rate
beats the ρ = 1/2 control by only +14.5 [−8.2, 42.4] steps on the mix (RARE +0.6, HALF 0, OFTEN +13.9), less than the
smallest effect 60 worlds can detect (22). Each changed exit's own failed re-tests settle it within one or two tries,
and in RARE the planner's own optimism already sets the re-testing floor (VOL 15.8, control 17.6, planner 15.4 futile
re-tests in the zero-reversal worlds), so there is nothing for a learned rate to save. More changes per run would
sharpen ρ but would not create value for it. **What E5 does test, with high power, is the belief:** the control alone
beats all four fixed policies on the mix (weakest part +64.1 [11.6, 123.3]).

## 4. Development run of revision 2

Full tables in the specification (development disclosure). Verdict the driver would give on dev: **BELIEF, NOT
LEARNING** (V1–V5 hold; V7 +4.4 [−12.0, 23.6]). h-robustness DIRECTION ROBUST (V1 not certain at h = 0.03). The
zero-reversal claim not shown. Weighting: V1 holds on 32 of 66 grid points. Determinism and 168/168 tests held.

## 5. Recommendation

The corrected draft is sound as a measurement: it would report correctly whatever happens. But the development
evidence predicts its outcome with unusual confidence (P ≈ 0.85 BELIEF, NOT LEARNING), and the learning half of that
outcome would be uninformative, because the task gives the learned quantity no measurable value. Running it as the
H-VOL gate would spend a fresh domain to learn something we already know from dev and could not have learned
otherwise.

**Recommended: do not freeze revision 2 as the test of learning the rate. Re-scope CF-06 to the claim E5 can test,
and move rate-learning to a task built so that the rate matters.**

| Option | What it tests | Expected result | Cost |
|---|---|---|---|
| **A (recommended). CF-06 re-scoped: the belief** | "A two-regime belief per changed exit, updated by failed re-tests, beats every fixed willingness to re-test." Primary arm the simpler mechanism (v6 with ρ fixed at 1/2, no learning); VOL, the true-rate reference and V7 reported, with the headroom stated | V1–V5 likely hold (P ≈ 0.96 for the weakest part); a clean, positive, minimal claim | Rewrite the criteria section (one more draft revision), ~3 h run |
| B. Freeze revision 2 as it stands | The same, framed as a test of learning | BELIEF, NOT LEARNING with P ≈ 0.85; the claim rules keep the record honest | No more design work, ~3 h run |
| C. Redesign for H-VOL first | Learning the rate, in a task where it is worth something | Unknown; needs new admission evidence on fresh development worlds, with a **headroom rule**: the true-rate reference must beat the fixed-ρ control by at least twice the n = 60 detectable effect before a learning gate is specified. Candidate levers: carry ρ across worlds (H-VOL-XFER), make re-tests expensive or slow to reveal, longer and variable delays | Design work; no gate soon |

A and C are complementary: A records the capability that exists; C asks the open question properly. Two further
design questions came out of this pass and belong to C, not to CF-06: the change detector's false alarms (0.85 per
run) bias any learned rate, and the planner's optimism after a reset already does some of the re-testing a belief is
supposed to decide.

## 6. The owner's decision and revision 3

**2026-11-15, the owner: "Re-scope to belief" (option A).** Revision 3 of the draft (`GATE_SPEC.md`) makes the
belief the claim and its simplest form the primary arm:

| Item | Revision 2 | Revision 3 |
|---|---|---|
| Claim | VOL learns how often changes reverse | **A two-regime belief per changed exit beats every fixed willingness to re-test** (H-BEL) |
| Primary arm | VOL (ρ learned) | **BELIEF**: model v6 with ρ fixed at 1/2 (no learning across changes), h = 0.01 — the arm that was the control |
| Criteria | V1–V7 | **B1** mix against the four fixed policies; **B2** safe in RARE; **B3** helps in OFTEN; **B4** mechanism: recovers reopened routes better than the planner (OFTEN) *and* gives up on permanent changes from evidence, not on a clock (RARE, futile re-tests against RECALL at the same h); **B5** no regression; **B6** infrastructure |
| Learning the rate | V7 pass/fail, verdict BELIEF, NOT LEARNING | **Reported** as L1–L4 with claim rules (VOL against BELIEF per family and on the mix; headroom; direction of ρ; stopping re-tests) — the eight corrections stay in force, as reports |
| h sensitivity | on VOL | **on the primary** (BELIEF at h = 0.003, 0.03); revision 2's VOL figures stay in the disclosure |
| Arms | 10 | 10: the planner, three RECALL, BELIEF and its two h variants, VOL, the true-rate reference, ORACLE |
| Battery | VOL against the planner | BELIEF against the planner (criterion), VOL reported |

The selection is disclosed: the primary was chosen after the development worlds showed that learning the rate added
nothing measurable. It is the *simpler* mechanism, chosen for its simplicity and for what the task can test, not for
a better development score (BELIEF and VOL differ by 4.4 steps). Only `gate6` can confirm it.

**Revision-3 development run (2026-11-16).** All 640 rows the run shares with revision 2 are identical field by
field; it adds BELIEF at h = 0.003 and 0.03 (120 rows) and BELIEF on the battery (80). The driver's development
verdict is SUPPORTED, which is expected and is not evidence (`GATE_SPEC.md`, development disclosure). Three findings
from it changed the draft:

| Finding | Evidence (dev) | Change made |
|---|---|---|
| Part of the gain over the planner does not come from reopened routes: keeping the old regime also returns the agent to an exit its change detector wrongly flagged | dev world 3, OFTEN: +272 steps with no real reversal confirmed; world 12, HALF: +174, the same | Claim rule **gainSource** (B3 again on the OFTEN worlds without a confirmed false alarm; on dev 11 worlds, +46.6 [4.6, 111.0]: REOPENED ROUTES). B4a's description corrected: it shows the mechanism is present, it cannot attribute the gain |
| The gain is concentrated in a few worlds | B1 planner part 10 / 10 worlds, median −5; four OFTEN worlds give 90% of the OFTEN gain | Claim rule **gainShape** (CONSISTENT / TAIL-DRIVEN); limitation 2 |
| The development effects are an optimistic guide to power | the primary was chosen after these worlds | Power table with a column at half the development effect (B1 planner part and B3: 0.46 each) |

Both claim rules limit the wording and never change the verdict; they were added after the look, in the
restrictive direction, and are disclosed as such. Nothing in B1–B6, the arms, the constants or the sample size
changed.

**An outside review would help before any freeze.** The file supplied as the CF-06 review was the CF-05/CF-05b
review; a review of revision 3 (bundle `research/external/CF06_REV3_GEMINI_PREFREEZE_REVIEW_BUNDLE.md`) should
focus on whether the headroom argument is right, whether the re-scope is a legitimate pre-registration or a post-hoc
rescue, whether B4 with gainSource is an adequate mechanism check, and whether a give-up-after-k rule belongs in the
fixed-policy class.
````

## Appendix B. World model v6 (two-regime belief, learned reversal rate)

File: `cognitive/mind/v6/world_model.mjs` · SHA-256 `bea27cf8136aa30008e30b2870b901b7a241a6a1933712757989004b3fa27ed9` · 135 lines

```js
// ==========================================================
// CF-06 mind — world model v6: v3 plus a belief about whether each changed exit will change back, with the rate at
// which changes reverse LEARNED from the agent's own experience
// ==========================================================
// v3 (cognitive/mind/v3/world_model.mjs) is used unchanged as the "current regime" model.  v6 adds, inside the
// model, what CF-05b's RECALL did beside it, but as inference rather than a fixed rule:
//
// 1. Two regimes per changed exit.  When v3 declares that an exit got WORSE, v6 archives the prediction it held just
//    before (the "old regime").  From then on the exit is either PERMANENT (the old regime never returns) or
//    REVERSING (it returns at a time T after the change, T ~ Geometric(h)).  P(reversing) a priori = rho.
//
// 2. Evidence from re-tests.  Each failed attempt on an archived exit, at tau_i steps after the change, is evidence.
//    With q_new = P(attempt fails | current regime) and q_old = P(attempt fails | old regime) and S(t) = (1 - h)^t:
//        L_perm = q_new^k
//        L_rev  = S(tau_k) q_new^k + sum_{j=1..k} [S(tau_{j-1}) - S(tau_j)] q_new^(j-1) q_old^(k-j+1)     (tau_0 = 0)
//        P(reversing | tests) = rho L_rev / (rho L_rev + (1 - rho) L_perm)
//        P(old regime now)    = P(reversing | tests) * (1 - S(tau_now) q_new^k / L_rev)
//    The first move of an archived exit confirms a reversal: the archive is closed and counted.
//
// 3. The planning belief for an archived exit is the mixture (1 - w) * current + w * old, w = P(old regime now).
//    predict() returns that mixture, so any planner that asks the model gets it; no agent-side rule is needed.
//
// 4. rho is learned and pooled over the agent's changed exits (empirical Bayes, iterated to a fixed point):
//        rho = (a0 + confirmed reversals + sum over open archives P(reversing | tests)) / (a0 + b0 + confirmed + open)
//
// Relation to RECALL (CF-05b): with rho fixed at 1 and before any failed re-test, w = 1 - (1 - h)^tau, exactly RECALL's
// weight.  RECALL then resets on each failed re-test; v6 instead weighs the failure as evidence.  The difference that
// matters: rho is learned, so a world whose changes never reverse teaches the model to stop re-testing.
//
// Known limit, declared: a false alarm of v3's change detector archives an exit that never changed; when it moves
// again it is counted as a confirmed reversal, which pushes rho up.  eventLog() records every archive opened and
// every reversal confirmed, with the model's step count, so that EVALUATION code (task E5, after the run) can measure
// this against ground truth; the model never reads the log.
//
// Two properties, stated so that results are read correctly (both tested):
//   - An exit that is never re-tested gives no evidence (L_rev = L_perm = 1), so with every open archive untested the
//     fixed point is rho = 1/2 whatever the number of changes: rho falls only through failed re-tests, which cost steps.
//   - rho is a plug-in empirical-Bayes estimate that includes each archive's own evidence (no leave-one-out), so even
//     the first change's own failed re-tests lower its prior; that, not learning across changes, is the only way v6
//     differs from rho fixed at 1/2 during the first change.
// ==========================================================
import { makeWorldModel3, WM3_DEFAULTS } from '../v3/world_model.mjs';

export const WM6_DEFAULTS = Object.freeze({ ...WM3_DEFAULTS, volHazard: 0.01, rhoA0: 1, rhoB0: 1, rhoFixed: null, rhoIterations: 30 });

/** P(reversing | tests) and P(old regime now) for one archive.  Pure; exported for tests. */
export function regimeBelief({ rho, h, qNew, qOld, taus, tauNow }) {
  const S = (t) => (1 - h) ** t, k = taus.length;
  let Lrev = S(k ? taus[k - 1] : 0) * qNew ** k, prev = 0;
  for (let j = 1; j <= k; j++) { Lrev += (S(prev) - S(taus[j - 1])) * qNew ** (j - 1) * qOld ** (k - j + 1); prev = taus[j - 1]; }
  const Lperm = qNew ** k;
  const denom = rho * Lrev + (1 - rho) * Lperm;
  const pRev = denom > 0 ? (rho * Lrev) / denom : 0;
  const pOldNow = Lrev > 0 ? pRev * (1 - (S(tauNow) * qNew ** k) / Lrev) : 0;
  return { pRev, pOldNow: Math.min(1, Math.max(0, pOldNow)) };
}

export function makeWorldModel6(params = {}) {
  const P = { ...WM6_DEFAULTS, ...params };
  const base = makeWorldModel3(P);
  const archives = new Map();               // `${s}|${a}` -> { s, a, held, since, taus: [] }
  const vol = { confirmed: 0, opened: 0, rho: P.rhoFixed ?? P.rhoA0 / (P.rhoA0 + P.rhoB0) };
  // Event log for EVALUATION ONLY: the model's own record of when it archived a changed exit and when it confirmed a
  // reversal, in its own step count.  It holds nothing the model did not compute from its own observations; the task
  // compares it with ground truth after the run (false-alarm diagnostics).  Nothing reads it back into the model.
  const log = [];
  let clock = 0;
  const clamp = (x) => Math.min(1 - 1e-9, Math.max(1e-9, x));

  function beliefOf(arch, rho) {
    const cur = base.predict(arch.s, arch.a);
    return regimeBelief({ rho, h: P.volHazard, qNew: clamp(cur.self), qOld: clamp(arch.held.self), taus: arch.taus, tauNow: clock - arch.since });
  }

  function refreshRho() {
    if (P.rhoFixed !== null) { vol.rho = P.rhoFixed; return; }
    let rho = vol.rho;
    for (let it = 0; it < P.rhoIterations; it++) {
      let open = 0, s = 0;
      for (const arch of archives.values()) { s += beliefOf(arch, rho).pRev; open++; }
      const next = (P.rhoA0 + vol.confirmed + s) / (P.rhoA0 + P.rhoB0 + vol.confirmed + open);
      const done = Math.abs(next - rho) < 1e-10;
      rho = next;
      if (done) break;
    }
    vol.rho = rho;
  }

  function predict(s, a) {
    const p = base.predict(s, a), arch = archives.get(`${s}|${a}`);
    if (!arch) return p;
    const w = beliefOf(arch, vol.rho).pOldNow;
    if (w <= 0) return p;
    const merged = new Map(p.outcomes.map(([lab, x]) => [lab, (1 - w) * x]));
    for (const [lab, x] of arch.held.outcomes) merged.set(lab, (merged.get(lab) ?? 0) + w * x);
    return { self: (1 - w) * p.self + w * arch.held.self, outcomes: [...merged], unknown: (1 - w) * p.unknown + w * arch.held.unknown, N: p.N };
  }

  function probOf(s, a, s2) {
    const p = predict(s, a);
    if (s2 === s) return p.self;
    const hit = p.outcomes.find(([lab]) => lab === s2);
    return hit ? hit[1] : p.unknown;
  }

  function update(s, a, s2, reward, done) {
    const key = `${s}|${a}`, moved = s2 !== s, logged = log.length;
    const arch = archives.get(key);
    if (arch) {
      if (moved) { archives.delete(key); vol.confirmed++; log.push(['confirm', s, a, clock]); }   // the old regime is back
      else arch.taus.push(clock - arch.since);                         // a failed re-test: evidence
    }
    const held = base.predict(s, a), worse = base.stats().changesDown;
    base.update(s, a, s2, reward, done);
    if (!moved && !archives.has(key) && base.stats().changesDown > worse && held.outcomes.length) {
      archives.set(key, { s, a, held, since: clock, taus: [] }); vol.opened++; log.push(['open', s, a, clock]);
    }
    clock++;
    refreshRho();
    if (log.length > logged) log[log.length - 1].push(vol.rho);       // at most one entry per step: [type, s, a, step, rho after]
  }

  return {
    params: P,
    visit: (s, w) => base.visit(s, w), states: () => base.states(), widthOf: (s) => base.widthOf(s),
    predict, probOf, rewardProb: (s2) => base.rewardProb(s2), doneProb: (s2) => base.doneProb(s2), update,
    countOf: (s, a) => base.countOf(s, a),
    hyper: () => base.hyper(),
    stats: () => ({ ...base.stats(), archivesOpened: vol.opened, archivesOpen: archives.size, reversalsConfirmed: vol.confirmed, rho: vol.rho }),
    volatility: () => ({ rho: vol.rho, confirmed: vol.confirmed, opened: vol.opened, open: archives.size }),
    eventLog: () => log.map((e) => [...e]),

  };
}
```

## Appendix B2. Agent VOL

File: `cognitive/mind/v6/agent.mjs` · SHA-256 `fe11cb82cc01b97350e30ad2cf9009400fb083eefc87bb70b8d2776f810a1f6e` · 55 lines

```js
// ==========================================================
// CF-06 mind — VOL: the existing planner on world model v6
// ==========================================================
// The same agent loop as MBVI3 (cognitive/mind/v3/agent.mjs): value iteration with the FROZEN core planner, optimism
// for the unknown, greedy choice, uniform tie-break.  Only the model differs: v6 returns, for an exit that changed,
// a belief that mixes its current and earlier regimes according to how often the agent has seen changes reverse.
// Nothing outside the model knows about regimes; the planner just asks the model.
// ==========================================================
import { argmaxRandomTie } from '../../testbed/agent_util.mjs';
import { qValues, valueIteration } from '../../core/planner.mjs';
import { makeWorldModel6, WM6_DEFAULTS } from './world_model.mjs';

export const VOL_DEFAULTS = Object.freeze({ gamma: 0.95, budget: 100, theta: 1e-6, vOpt: 1, ...WM6_DEFAULTS });

export function makeVOL({ rng, params = {}, kind = 'VOL' }) {
  const P = { ...VOL_DEFAULTS, ...params };
  const model = makeWorldModel6(P);
  const V = new Map();
  let cue;
  const compute = { decisions: 0, sweeps: 0, backups: 0, budgetHits: 0 };
  const trace = [];                                   // rho after each change archived or reversal confirmed
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
      const before = model.volatility();
      model.update(obs.node, action, next.node, reward, done);
      const after = model.volatility();
      if (after.opened !== before.opened || after.confirmed !== before.confirmed) trace.push(Number(after.rho.toFixed(4)));
    },
    inspect() {
      return {
        compute: { ...compute, backupsPerDecision: compute.decisions ? compute.backups / compute.decisions : 0, sweepsPerDecision: compute.decisions ? compute.sweeps / compute.decisions : 0, budgetHitShare: compute.decisions ? compute.budgetHits / compute.decisions : 0, budget: P.budget },
        model: { states: model.states().size, ...model.stats() },
        volatility: { ...model.volatility(), rhoTrace: trace, log: model.eventLog() },   // log: for evaluation code only
      };
    },
    _model: model, _V: V,
  };
}
```

## Appendix B3. Registry v6

File: `cognitive/testbed/registry_v6.mjs` · SHA-256 `0fd399c9545a4eac7d1efdfd1dd676edf4888a193d17b0dd97ae058e751d2f64` · 41 lines

```js
// ==========================================================
// CF-06 testbed — agent registry v6: the v5 agents plus VOL (world model v6, learned reversal rate)
// ==========================================================
// The privileged-channel rule is the CF-01 rule (runner.mjs PRIVILEGED, unchanged): only ORACLE receives the oracle.
// Earlier kinds are built by their unchanged factories.
//   VOL          rho learned from experience (the mechanism under test)
//   VOL_RHO      rho fixed by the caller (params.rhoFixed); with the family's true reversal rate it is the reference
//                for what learning rho could achieve.  That value is task knowledge, so such an arm is labelled
//                privileged by whoever builds it and is never a learner arm.
// ==========================================================
import { makeStream } from './rng.mjs';
import { PRIVILEGED } from './runner.mjs';
import { AGENTS_V5 } from './registry_v5.mjs';
import { makeVOL } from '../mind/v6/agent.mjs';

export const VOL_VARIANTS = Object.freeze({
  VOL: Object.freeze({ rhoFixed: null }),
  VOL_RHO: Object.freeze({}),
});
export const MIND6_FILES = Object.freeze(['agent.mjs', 'world_model.mjs']);
export const MIND6_ALLOWED = Object.freeze(['../../testbed/agent_util.mjs', '../../core/planner.mjs', './world_model.mjs', '../v3/world_model.mjs']);
export const AGENTS_V6 = Object.freeze({
  ...AGENTS_V5,
  VOL: (opts) => makeVOL({ ...opts, params: { ...opts.params, ...VOL_VARIANTS.VOL }, kind: 'VOL' }),
  VOL_RHO: (opts) => { if (typeof opts.params.rhoFixed !== 'number') throw new Error('VOL_RHO needs params.rhoFixed'); return makeVOL({ ...opts, kind: 'VOL_RHO' }); },
});

export function agentOptionsV6(kind, env, rngLabel, params = {}) {
  const opts = { rng: makeStream(rngLabel), params };
  if (PRIVILEGED.includes(kind)) opts.oracle = Object.freeze({ bestAction: () => env.oracleBestAction() });
  return opts;
}

export function makeAgentForV6(kind, env, rngLabel, params = {}) {
  const factory = AGENTS_V6[kind];
  if (!factory) throw new Error(`unknown agent kind ${kind}`);
  const agent = factory(agentOptionsV6(kind, env, rngLabel, params));
  if (agent.privileged && !PRIVILEGED.includes(kind)) throw new Error(`${kind} claims privilege it is not granted`);
  return agent;
}
```

## Appendix C. Task E5

File: `cognitive/testbed/task_e5.mjs` · SHA-256 `5adba39f0937b84c6db565587de812690c11ff41e7064e1d19cec4e8ef150ad7` · 162 lines

```js
// ==========================================================
// CF-06 testbed — task E5: a world whose changes sometimes reverse, at a rate set by the world's family
// ==========================================================
// The question behind it (hypothesis H-VOL): can an agent learn from its own experience how often changes in its
// world reverse, and so re-test an abandoned exit only where that pays?  CF-05b showed that a fixed willingness to
// re-test helps when changes reverse and costs when they do not; E5 makes the reversal rate a property of the world
// that an agent can only learn by living in it.
//
// Hidden per-edge reliabilities U[0.5, 1] (stream `${world}|E5|rel`).  Start S and goal G at distance >= 3 (stream
// `${world}|E5|layout`).  Phases:
//   A  pre-exposure   600 steps, no reward, no cue, 50-step episodes from the start stream
//   B  training       goal G cued and rewarded, 30 episodes from S
//   then EVENTS change events, each:
//      block    an edge on a currently shortest S->G route is blocked without notice (its removal keeps G reachable);
//               BLOCK episodes from S
//      verdict  with probability p (the family's reversal rate) the block is removed without notice; otherwise it
//               stays for the rest of the run
//      after    AFTER episodes from S
// The whole schedule (which edge, whether it reverses) is drawn in advance from `${world}|E5|${family}|events`, from
// the true graph only, so it is identical for every agent in a world and family (common random numbers).  An event
// with no admissible edge is skipped and recorded.
//
// Windows (steps summed over episodes; a capped episode counts its cap): blocked (all BLOCK episodes), after (all
// AFTER episodes), afterReversed / afterPermanent (AFTER episodes of reversed / permanent events), total.
//
// Diagnostics (diagnoseE5, EVALUATION ONLY): after the agent's last step, the environment's trace and the schedule
// give futile re-tests of permanent changes (per event and in total) and, for agents whose model keeps an event log
// (v6), how many of its archived changes and confirmed reversals were real and how many were false alarms of the
// change detector.  The agent is built with the same four arguments as before and receives nothing new.
// ==========================================================
import { GraphEnv } from './env.mjs';
import { distancesTo, edgeKey } from './worlds.mjs';
import { makeStream, shuffled } from './rng.mjs';
import { runEpisode, runSteps } from './runner.mjs';

export const E5_PARAMS = Object.freeze({ exploreSteps: 600, exploreEpisodeLength: 50, trainEpisodes: 30, events: 6, blockEpisodes: 10, afterEpisodes: 10, cap: 200, minDistance: 3 });
export const E5_FAMILIES = Object.freeze({ RARE: 0.1, HALF: 0.5, OFTEN: 0.9 });

/** The start, goal and the full change schedule for one world and family, from the true graph only. */
export function planE5(world, worldLabel, family, P = E5_PARAMS) {
  const p = E5_FAMILIES[family];
  if (p === undefined) throw new Error(`unknown E5 family ${family}`);
  const rnd = makeStream(`${worldLabel}|E5|layout`);
  const nodes = Array.from({ length: world.n }, (_, i) => i);
  const pairs = shuffled(nodes.flatMap((s) => nodes.map((g) => [s, g])), rnd);
  const pick = pairs.find(([s, g]) => distancesTo(world, g)[s] >= P.minDistance);
  if (!pick) return null;
  const [start, goal] = pick;
  const ev = makeStream(`${worldLabel}|E5|${family}|events`);
  const permanent = new Set(), events = [];
  for (let k = 0; k < P.events; k++) {
    const dG = distancesTo(world, goal, permanent), dS = distancesTo(world, start, permanent), d = dG[start];
    const onRoute = world.edges.filter(([u, v]) => !permanent.has(edgeKey(u, v)) && (dS[u] + 1 + dG[v] === d || dS[v] + 1 + dG[u] === d));
    const admissible = shuffled(onRoute, ev).filter(([u, v]) => distancesTo(world, goal, new Set([...permanent, edgeKey(u, v)]))[start] >= 0);
    const reverses = ev() < p;                        // drawn whether or not the event is admissible, so draws stay aligned
    if (!admissible.length) { events.push({ skipped: true }); continue; }
    const edge = admissible[0];
    events.push({ edge, reverses });
    if (!reverses) permanent.add(edgeKey(...edge));
  }
  return { start, goal, family, p, events };
}

export function reliabilitiesE5(world, worldLabel) {
  const rnd = makeStream(`${worldLabel}|E5|rel`);
  return world.edges.map(([u, v]) => [u, v, 0.5 + 0.5 * rnd()]);
}

const sum = (xs) => xs.reduce((a, b) => a + b, 0);

/**
 * EVALUATION ONLY: ground-truth diagnostics computed after the run from the environment's trace, the schedule and
 * what the agent reported about itself.  Nothing here is reachable by an agent (it runs after the agent's last step).
 *   spans   one per live event: { key, reverses, blockAt, afterAt, endAt } in trace rows (blocked on [blockAt, afterAt)
 *           if it reverses, on [blockAt, end of run) if not)
 *   log     the v6 model's own event log [type, nodeLabel, action, step, rho], or undefined for agents without one
 * Re-tests: an attempt on a PERMANENT change's edge after its block window has ended is futile (the edge never comes
 * back).  ownAfter = attempts on the event's own edge in its own AFTER window; oldPermanent = attempts, anywhere in
 * the event's window, on the edges of earlier permanent events.
 * False alarms: an archive the model opened on an edge that was not blocked at that step; a reversal it confirmed on
 * an archive that was such a false alarm (the declared bias that pushes rho up).
 */
export function diagnoseE5(world, trace, spans, log) {
  const keyOf = (row) => edgeKey(row[2], world.exitOrder[row[2]][row[3]]);
  const blockedSpan = (key, i) => spans.find((sp) => sp.key === key && sp.blockAt <= i && i < (sp.reverses ? sp.afterAt : Infinity)) ?? null;
  const perEvent = spans.map(() => ({ ownAfter: 0, oldPermanent: 0, crossed: 0 }));
  let futile = 0, w = 0;
  for (let i = 0; i < trace.length; i++) {
    while (w < spans.length && i >= spans[w].endAt) w++;
    const inWindow = w < spans.length && i >= spans[w].blockAt;
    const row = trace[i], key = keyOf(row);
    for (let j = 0; j < spans.length; j++) {
      const sp = spans[j];
      if (sp.key !== key || i < sp.afterAt) continue;
      if (j === w && inWindow) { perEvent[j].ownAfter++; if (sp.reverses && row[2] !== row[4]) perEvent[j].crossed++; }
      if (!sp.reverses) { futile++; if (inWindow && j < w) perEvent[w].oldPermanent++; }
    }
  }
  let alarms = null;
  if (Array.isArray(log)) {
    const openOf = new Map(), rhoAtDetection = spans.map(() => null);
    alarms = { opensReal: 0, opensFalse: 0, opensFalseBeforeFirstChange: 0, confirmsReal: 0, confirmsFalse: 0, changesDetected: 0, rhoAtDetection };
    for (const [type, label, a, i, rho] of log) {
      const row = trace[i], s = world.nodeOfLabel.get(label);
      if (!row || row[2] !== s || row[3] !== a) throw new Error(`event log row ${i} does not match the environment trace`);
      const id = `${label}|${a}`;
      if (type === 'open') {
        const sp = blockedSpan(keyOf(row), i);
        openOf.set(id, sp);
        if (sp) { alarms.opensReal++; const k = spans.indexOf(sp); if (rhoAtDetection[k] === null) { rhoAtDetection[k] = rho; alarms.changesDetected++; } }
        else { alarms.opensFalse++; if (!spans.length || i < spans[0].blockAt) alarms.opensFalseBeforeFirstChange++; }
      } else if (type === 'confirm') {
        if (!openOf.has(id)) throw new Error(`event log confirms an archive it never opened (${id})`);
        if (openOf.get(id)) alarms.confirmsReal++; else alarms.confirmsFalse++;
        openOf.delete(id);
      } else throw new Error(`unknown event log entry ${type}`);
    }
  }
  return { futileRetests: futile, perEvent, alarms };
}

export function runE5({ world, worldLabel, family, kind, params = {}, makeAgent, P = E5_PARAMS }) {
  const plan = planE5(world, worldLabel, family, P);
  if (!plan) return { task: 'E5', world: worldLabel, family, kind, excluded: true };
  const env = new GraphEnv(world, { seedLabel: `${worldLabel}|E5|env`, maxSteps: P.cap });
  for (const [u, v, q] of reliabilitiesE5(world, worldLabel)) env.setReliability(u, v, q);
  const agent = makeAgent(kind, env, `${worldLabel}|E5|agent`, params[kind] ?? {});
  env.setRewardNode(null); env.setCue(null);
  let t = runSteps(env, agent, { total: P.exploreSteps, episodeLength: P.exploreEpisodeLength }).steps;   // trace rows so far
  env.setRewardNode(plan.goal); env.setCue(plan.goal);
  const run = (n) => Array.from({ length: n }, () => { const r = runEpisode(env, agent, { start: plan.start }); t += r.steps; return r; });
  const train = run(P.trainEpisodes);
  const perEvent = [], spans = [];
  for (const e of plan.events) {
    if (e.skipped) { perEvent.push({ skipped: true }); continue; }
    const blockAt = t;
    env.block(...e.edge);
    const blocked = run(P.blockEpisodes);
    const afterAt = t;
    if (e.reverses) env.unblock(...e.edge);
    const after = run(P.afterEpisodes);
    spans.push({ key: edgeKey(...e.edge), reverses: e.reverses, blockAt, afterAt, endAt: t });
    perEvent.push({ reverses: e.reverses, blocked: sum(blocked.map((r) => r.steps)), after: sum(after.map((r) => r.steps)), crossed: 0, capped: [...blocked, ...after].filter((r) => r.truncated).length });
  }
  const info = typeof agent.inspect === 'function' ? agent.inspect() : {};   // the agent has taken its last step
  const trace = env.trace();
  if (trace.length !== t) throw new Error('step count does not match the environment trace');
  const diag = diagnoseE5(world, trace, spans, info.volatility?.log);
  const live = perEvent.filter((e) => !e.skipped);
  live.forEach((e, k) => { if (e.reverses) e.crossed = diag.perEvent[k].crossed; e.ownAfterAttempts = diag.perEvent[k].ownAfter; e.oldPermanentAttempts = diag.perEvent[k].oldPermanent; });
  const pick = (f) => sum(live.filter(f).map((e) => e.after));
  return {
    task: 'E5', world: worldLabel, family, kind, start: plan.start, goal: plan.goal,
    events: perEvent, reversedEvents: live.filter((e) => e.reverses).length, permanentEvents: live.filter((e) => !e.reverses).length, skippedEvents: perEvent.length - live.length,
    windows: { train: sum(train.slice(-5).map((r) => r.steps)), blocked: sum(live.map((e) => e.blocked)), after: sum(live.map((e) => e.after)), afterReversed: pick((e) => e.reverses), afterPermanent: pick((e) => !e.reverses) },
    metric: sum(live.map((e) => e.blocked + e.after)),
    censored: [...train].filter((r) => r.truncated).length + sum(live.map((e) => e.capped)),
    secondary: { compute: info.compute ?? null, model: info.model ?? null, recovery: info.recovery ?? null, volatility: info.volatility ?? null },
    diagnostics: { evaluationOnly: true, futileRetests: diag.futileRetests, alarms: diag.alarms },
  };
}
```

## Appendix D. Tests for the task and the model

File: `cognitive/tests/test_vol.mjs` · SHA-256 `73c01633d0eeed597836b19a76645a53a85070f7636d96f70b0e57c60a7d4c15` · 222 lines

```js
// CF-06 tests — task E5 (schedule, common random numbers, windows) and world model v6 / agent VOL (regime belief
// arithmetic, relation to RECALL, learning of the reversal rate, normalisation, isolation, determinism)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateWorld, distancesTo, edgeKey } from '../testbed/worlds.mjs';
import { GraphEnv } from '../testbed/env.mjs';
import { planE5, runE5, diagnoseE5, E5_FAMILIES, E5_PARAMS } from '../testbed/task_e5.mjs';
import { AGENTS_V6, MIND6_FILES, MIND6_ALLOWED, agentOptionsV6, makeAgentForV6 } from '../testbed/registry_v6.mjs';
import { AGENTS_V5 } from '../testbed/registry_v5.mjs';
import { PRIVILEGED } from '../testbed/runner.mjs';
import { checkPrivilege } from '../testbed/checks.mjs';
import { checkSourceIsolation } from '../testbed/checks_v1.mjs';
import { regimeBelief, makeWorldModel6 } from '../mind/v6/world_model.mjs';
import { makeStream } from '../testbed/rng.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIND6_DIR = path.resolve(HERE, '..', 'mind', 'v6');
const LABEL = 'cf|dev|world|5', W = generateWorld(LABEL);
const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`);
const total = (p) => p.self + p.unknown + p.outcomes.reduce((s, [, x]) => s + x, 0);

/** A model that has learned 12 reliable exits, then sees `n` changes on fresh exits, each reversing or not. */
function livedThrough(reverses, n = 4) {
  const m = makeWorldModel6();
  for (let i = 0; i < 12; i++) for (let j = 0; j < 4; j++) m.update(100 + i, 0, 200 + i, 0, false);
  for (let e = 0; e < n; e++) {
    const s = 300 + e;
    for (let j = 0; j < 30; j++) m.update(s, 0, 400 + e, 0, false);
    let k = 0; while (m.volatility().opened === e && k < 10) { m.update(s, 0, s, 0, false); k++; }
    for (let t = 0; t < 200; t++) m.update(100, 0, 200, 0, false);
    if (reverses) m.update(s, 0, 400 + e, 0, false);
    else for (let r = 0; r < 5; r++) { m.update(s, 0, s, 0, false); for (let t = 0; t < 100; t++) m.update(100, 0, 200, 0, false); }
  }
  return m;
}

export const tests = [
  ['v6 modules import only what they are allowed to, and use no forbidden API', () => {
    assert.deepEqual(fs.readdirSync(MIND6_DIR).filter((f) => f.endsWith('.mjs')).sort(), [...MIND6_FILES].sort());
    for (const f of MIND6_FILES) assert.deepEqual(checkSourceIsolation(fs.readFileSync(path.join(MIND6_DIR, f), 'utf8'), MIND6_ALLOWED, f), []);
    assert.ok(checkSourceIsolation("import { planE5 } from '../../testbed/task_e5.mjs';", MIND6_ALLOWED).length > 0, 'mutant must be caught');
  }],
  ['privilege: only ORACLE receives the oracle channel under the v6 registry; earlier kinds are the earlier factories', () => {
    const env = new GraphEnv(W, { seedLabel: 'cf|test|vol|priv' });
    const opts = (k) => agentOptionsV6(k, env, 'cf|test|vol|priv|agent', k === 'VOL_RHO' ? { rhoFixed: 0.5 } : {});
    assert.deepEqual(checkPrivilege(Object.keys(AGENTS_V6), PRIVILEGED, opts), []);
    for (const k of Object.keys(AGENTS_V5)) assert.equal(AGENTS_V6[k], AGENTS_V5[k]);
    assert.throws(() => makeAgentForV6('VOL_RHO', env, 'x', {}), /rhoFixed/);
    assert.equal(makeAgentForV6('VOL', env, 'x', { rhoFixed: 0.9 }).inspect().volatility.rho, 0.5, 'VOL ignores a caller-supplied rho');
  }],

  // ---- regime belief arithmetic ----
  ['REGIME BELIEF: with no re-test it is rho * (1 - (1 - h)^tau); with rho = 1 that is exactly RECALL\'s weight', () => {
    for (const [rho, tau] of [[1, 0], [1, 50], [1, 400], [0.3, 50], [0, 80]]) close(regimeBelief({ rho, h: 0.01, qNew: 0.999, qOld: 0.2, taus: [], tauNow: tau }).pOldNow, rho * (1 - 0.99 ** tau), 1e-12);
    close(regimeBelief({ rho: 0.4, h: 0.01, qNew: 0.9, qOld: 0.2, taus: [], tauNow: 10 }).pRev, 0.4);
  }],
  ['REGIME BELIEF: a failed re-test lowers both P(reversing) and P(old regime now); later time raises the latter again', () => {
    const base = { rho: 0.5, h: 0.01, qNew: 0.999, qOld: 0.2 };
    const none = regimeBelief({ ...base, taus: [], tauNow: 60 }), one = regimeBelief({ ...base, taus: [60], tauNow: 60 }), two = regimeBelief({ ...base, taus: [60, 120], tauNow: 120 });
    assert.ok(one.pRev < none.pRev && two.pRev < one.pRev, 'each failure is evidence against reversal');
    assert.ok(one.pOldNow < none.pOldNow);
    assert.ok(regimeBelief({ ...base, taus: [60], tauNow: 300 }).pOldNow > one.pOldNow, 'time since the last failure lets the belief recover');
    // closed form for k = 1: Lrev = S(t1) qn + (1 - S(t1)) qo
    const S = 0.99 ** 60, Lrev = S * 0.999 + (1 - S) * 0.2, pRev = 0.5 * Lrev / (0.5 * Lrev + 0.5 * 0.999);
    close(one.pRev, pRev, 1e-12); close(one.pOldNow, pRev * (1 - S * 0.999 / Lrev), 1e-12);
    for (const r of [none, one, two]) assert.ok(r.pRev >= 0 && r.pRev <= 1 && r.pOldNow >= 0 && r.pOldNow <= 1);
  }],

  // ---- learning the reversal rate ----
  ['LEARNING RHO: a world whose changes never reverse drives rho down; one whose changes always reverse drives it up', () => {
    const never = livedThrough(false), always = livedThrough(true);
    assert.ok(never.volatility().rho < 0.25, `never: ${never.volatility().rho}`);
    assert.ok(always.volatility().rho > 0.75, `always: ${always.volatility().rho}`);
    assert.equal(always.volatility().confirmed, 4); assert.equal(never.volatility().confirmed, 0);
    const fixed = makeWorldModel6({ rhoFixed: 0.3 });
    for (let j = 0; j < 30; j++) fixed.update(1, 0, 2, 0, false);
    for (let j = 0; j < 5; j++) fixed.update(1, 0, 1, 0, false);
    assert.equal(fixed.volatility().rho, 0.3, 'rhoFixed is honoured');
  }],
  ['MIXTURE: predictions stay normalised, and an archived exit\'s belief moves toward its old regime with time unobserved', () => {
    const m = makeWorldModel6(); const rnd = makeStream('cf|test|vol|norm');
    for (let i = 0; i < 2000; i++) {
      const s = 1 + Math.floor(rnd() * 6), a = Math.floor(rnd() * 2), dead = s === 3 && i > 800;
      m.update(s, a, dead || rnd() < 0.2 ? s : 1 + Math.floor(rnd() * 6), 0, false);
      if (i % 53 === 0) for (let x = 1; x <= 6; x++) for (let b = 0; b < 2; b++) { const p = m.predict(x, b); close(total(p), 1, 1e-9); assert.ok(p.self >= 0 && p.self <= 1); }
    }
    const g = makeWorldModel6({ rhoFixed: 1 });
    for (let i = 0; i < 12; i++) for (let j = 0; j < 4; j++) g.update(100 + i, 0, 200 + i, 0, false);
    for (let j = 0; j < 30; j++) g.update(1, 0, 2, 0, false);
    let k = 0; while (g.volatility().opened === 0 && k < 10) { g.update(1, 0, 1, 0, false); k++; }
    const early = g.predict(1, 0).self;
    for (let t = 0; t < 300; t++) g.update(100, 0, 200, 0, false);
    assert.ok(g.predict(1, 0).self < early - 0.3, `unobserved for 300 steps the exit is believed likely to work again (${early} -> ${g.predict(1, 0).self})`);
    g.update(1, 0, 2, 0, false);
    assert.equal(g.volatility().open, 0); assert.equal(g.volatility().confirmed, 1);
  }],

  // ---- task E5 ----
  ['E5 SCHEDULE: blocked edges lie on a shortest route of the graph as it is then, keep the goal reachable, and are the same for every agent', () => {
    for (let i = 0; i < 6; i++) for (const fam of Object.keys(E5_FAMILIES)) {
      const label = `cf|dev|world|${i}`, w = generateWorld(label), plan = planE5(w, label, fam);
      assert.ok(plan); assert.equal(plan.events.length, E5_PARAMS.events);
      const permanent = new Set();
      for (const e of plan.events) {
        if (e.skipped) continue;
        const dG = distancesTo(w, plan.goal, permanent), dS = distancesTo(w, plan.start, permanent), d = dG[plan.start], [u, v] = e.edge;
        assert.ok(dS[u] + 1 + dG[v] === d || dS[v] + 1 + dG[u] === d, 'on a shortest route now');
        assert.ok(distancesTo(w, plan.goal, new Set([...permanent, edgeKey(u, v)]))[plan.start] >= 0, 'goal stays reachable');
        if (!e.reverses) permanent.add(edgeKey(u, v));
      }
      assert.deepEqual(planE5(w, label, fam), plan, 'deterministic');
    }
    const rev = (fam) => { let r = 0, n = 0; for (let i = 0; i < 40; i++) { const label = `cf|dev|world|${i}`; for (const e of planE5(generateWorld(label), label, fam).events) if (!e.skipped) { n++; r += e.reverses ? 1 : 0; } } return r / n; };
    assert.ok(rev('RARE') < 0.25 && rev('OFTEN') > 0.75 && Math.abs(rev('HALF') - 0.5) < 0.15, 'reversal shares follow the families');
    assert.throws(() => planE5(W, LABEL, 'NOPE'));
  }],
  ['E5 RUN: rows are deterministic; windows add up; the reference uses a reopened edge unless an equally short route exists', () => {
    const run = (kind, fam) => runE5({ world: W, worldLabel: LABEL, family: fam, kind, makeAgent: makeAgentForV6 });
    const a = run('MBVI3', 'HALF'); assert.deepEqual(a, run('MBVI3', 'HALF'));
    assert.equal(a.metric, a.windows.blocked + a.windows.after); assert.equal(a.windows.after, a.windows.afterReversed + a.windows.afterPermanent);
    assert.equal(a.reversedEvents + a.permanentEvents + a.skippedEvents, E5_PARAMS.events);
    let checked = 0, crossedSome = 0;
    for (let i = 0; i < 4; i++) {
      const label = `cf|dev|world|${i}`, w = generateWorld(label), plan = planE5(w, label, 'OFTEN');
      const o = runE5({ world: w, worldLabel: label, family: 'OFTEN', kind: 'ORACLE', makeAgent: makeAgentForV6 });
      const permanent = new Set();
      plan.events.forEach((e, k) => {
        if (e.skipped) return;
        if (e.reverses) {
          checked++; if (o.events[k].crossed > 0) crossedSome++;
          else assert.equal(distancesTo(w, plan.goal, new Set([...permanent, edgeKey(...e.edge)]))[plan.start], distancesTo(w, plan.goal, permanent)[plan.start], 'skipping the reopened edge only when an equally short route exists');
        } else permanent.add(edgeKey(...e.edge));
      });
    }
    assert.ok(checked > 5 && crossedSome > checked / 2, `the reference crossed ${crossedSome} of ${checked} reopened edges`);
  }],
  ['VOL ON E5: deterministic; reports its learned rate; behaves as the planner until the first change is archived', () => {
    const run = (kind, fam, p = {}) => runE5({ world: W, worldLabel: LABEL, family: fam, kind, makeAgent: (k, e, l) => makeAgentForV6(k, e, l, p) });
    const v = run('VOL', 'HALF'); assert.deepEqual(v, run('VOL', 'HALF'));
    assert.ok(v.secondary.volatility.rho > 0 && v.secondary.volatility.rho < 1);
    assert.equal(v.windows.train, run('MBVI3', 'HALF').windows.train, 'identical to the planner before any change');
    const r = run('VOL_RHO', 'RARE', { rhoFixed: 0.1 }); assert.equal(r.secondary.volatility.rho, 0.1);
  }],

  // ---- corrections after the owner's review of the draft (control arm, diagnostics, degeneration) ----
  ['BELIEF ARM (CF-06 primary): rho stays at 1/2 through real changes and h reaches the model, through the registry', () => {
    const env = new GraphEnv(W, { seedLabel: 'cf|test|vol|belief' });
    for (const h of [0.003, 0.01, 0.03]) assert.equal(makeAgentForV6('VOL_RHO', env, 'x', { rhoFixed: 0.5, volHazard: h })._model.params.volHazard, h);
    const r = runE5({ world: W, worldLabel: LABEL, family: 'OFTEN', kind: 'VOL_RHO', makeAgent: (k, e, l) => makeAgentForV6(k, e, l, { rhoFixed: 0.5 }) });
    assert.ok(r.secondary.volatility.opened > 0, 'changes were archived');
    assert.equal(r.secondary.volatility.rho, 0.5);
    assert.ok(r.secondary.volatility.log.every((e) => e[4] === 0.5), 'rho is 1/2 after every archive and confirmation');
  }],
  ['ZERO EVIDENCE: an archived exit never re-tested leaves rho at exactly 1/2; failed re-tests long after the change lower it', () => {
    const m = makeWorldModel6();
    for (let i = 0; i < 12; i++) for (let j = 0; j < 4; j++) m.update(100 + i, 0, 200 + i, 0, false);
    for (let j = 0; j < 30; j++) m.update(1, 0, 2, 0, false);
    let k = 0; while (m.volatility().opened === 0 && k < 10) { m.update(1, 0, 1, 0, false); k++; }
    assert.equal(m.volatility().open, 1);
    for (let t = 0; t < 400; t++) m.update(100, 0, 200, 0, false);
    assert.equal(m.volatility().rho, 0.5, 'no re-test, no evidence: the fixed point is 1/2 whatever the elapsed time');
    m.update(1, 0, 1, 0, false); m.update(1, 0, 1, 0, false);
    assert.ok(m.volatility().rho < 0.5, `failed re-tests 400 steps after the change are evidence (${m.volatility().rho})`);
    const log = m.eventLog();
    assert.equal(log.length, 1); assert.deepEqual(log[0].slice(0, 3), ['open', 1, 0]); assert.equal(log[0][4], 0.5);
    log[0][0] = 'tampered'; assert.equal(m.eventLog()[0][0], 'open', 'the log handed out is a copy');
  }],
  ['CONTROL FAIRNESS: VOL_FIXED05 gets the same environment, seeds and budget as VOL and acts identically until VOL\'s rho first leaves 1/2', () => {
    const record = (kind, p) => {
      const acts = [], rhos = []; let args = null;
      const res = runE5({ world: W, worldLabel: LABEL, family: 'RARE', kind, makeAgent: (...a) => {
        args = a.length;
        const ag = makeAgentForV6(a[0], a[1], a[2], p);
        return { ...ag, act: (o) => { const x = ag.act(o); acts.push(x); return x; }, observe: (tr) => { ag.observe(tr); rhos.push(ag._model.volatility().rho); }, inspect: ag.inspect };
      } });
      return { acts, rhos, args, res };
    };
    const v = record('VOL', {}), f = record('VOL_RHO', { rhoFixed: 0.5 });
    assert.equal(v.args, 4); assert.equal(f.args, 4);
    assert.ok(f.rhos.every((x) => x === 0.5));
    const first = v.rhos.findIndex((x) => x !== 0.5);
    assert.ok(first > E5_PARAMS.exploreSteps, `rho moves only once changes are experienced (step ${first})`);
    assert.deepEqual(v.acts.slice(0, first + 1), f.acts.slice(0, first + 1), 'identical decisions while the two beliefs are identical');
    assert.equal(v.res.secondary.compute.budget, f.res.secondary.compute.budget);
  }],
  ['E5 DIAGNOSTICS on a hand-built trace: real and false archives, real and false confirmations, futile re-tests per event; mutants are caught', () => {
    const [[u, v1], [x, y]] = [W.edges[0], W.edges[1]], e3 = W.edges[2];
    const act = (s, t) => W.exitOrder[s].indexOf(t), L = (s) => W.labelOf[s];
    const k1 = edgeKey(u, v1), k2 = edgeKey(x, y), k3 = edgeKey(...e3);
    const spans = [{ key: k2, reverses: true, blockAt: 2, afterAt: 4, endAt: 6 }, { key: k1, reverses: false, blockAt: 6, afterAt: 8, endAt: 10 }, { key: k3, reverses: false, blockAt: 10, afterAt: 12, endAt: 14 }];
    const row = (s, t, moved) => [0, 0, s, act(s, t), moved ? t : s, 0];
    const trace = [row(x, y, false), row(x, y, true), row(x, y, false), row(u, v1, true), row(x, y, true), row(u, v1, true), row(u, v1, false), row(u, v1, false), row(u, v1, false), row(v1, u, false), row(u, v1, false), row(x, y, true), row(x, y, true), row(x, y, true)];
    const log = [['open', L(x), act(x, y), 0, 0.5], ['confirm', L(x), act(x, y), 1, 0.66], ['open', L(x), act(x, y), 2, 0.6], ['confirm', L(x), act(x, y), 4, 0.7], ['open', L(u), act(u, v1), 6, 0.4]];
    const d = diagnoseE5(W, trace, spans, log);
    assert.equal(d.futileRetests, 3);
    assert.deepEqual(d.perEvent, [{ ownAfter: 1, oldPermanent: 0, crossed: 1 }, { ownAfter: 2, oldPermanent: 0, crossed: 0 }, { ownAfter: 0, oldPermanent: 1, crossed: 0 }]);
    assert.deepEqual(d.alarms, { opensReal: 2, opensFalse: 1, opensFalseBeforeFirstChange: 1, confirmsReal: 1, confirmsFalse: 1, changesDetected: 2, rhoAtDetection: [0.6, 0.4, null] });
    assert.equal(diagnoseE5(W, trace, spans, undefined).alarms, null, 'agents without a model log get no alarm diagnostics');
    assert.throws(() => diagnoseE5(W, trace, spans, log.map((e) => [e[0], e[1], e[2], e[3] + 1, e[4]])), /does not match/, 'a log shifted by one step must be refused');
    assert.throws(() => diagnoseE5(W, trace, spans, [log[1]]), /never opened/);
  }],
  ['E5 DIAGNOSTICS are evaluation-only: one trace read after the last episode; totals agree with the per-event rows; the planner has no alarm log', () => {
    const src = fs.readFileSync(path.resolve(HERE, '..', 'testbed', 'task_e5.mjs'), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const body = src.slice(src.indexOf('export function runE5'));
    assert.equal(body.split('env.trace()').length - 1, 1, 'the trace is read once');
    assert.ok(body.indexOf('env.trace()') > body.lastIndexOf('run(P.afterEpisodes)'), 'and only after the last episode');
    assert.ok(body.indexOf('diagnoseE5(') > body.indexOf('agent.inspect()'), 'diagnostics after the agent has reported');
    assert.ok(!/diagnos|trace/.test(fs.readFileSync(path.join(MIND6_DIR, 'agent.mjs'), 'utf8').replace(/\/\/.*$/gm, '').replace(/const trace = \[\]|trace\.push|rhoTrace: trace/g, '')), 'the agent never sees diagnostics');
    for (const fam of ['RARE', 'OFTEN']) {
      const v = runE5({ world: W, worldLabel: LABEL, family: fam, kind: 'VOL', makeAgent: makeAgentForV6 });
      const live = v.events.filter((e) => !e.skipped);
      assert.equal(live.reduce((s, e) => s + (e.reverses ? 0 : e.ownAfterAttempts) + e.oldPermanentAttempts, 0), v.diagnostics.futileRetests);
      const a = v.diagnostics.alarms;
      assert.equal(a.opensReal + a.opensFalse, v.secondary.volatility.opened); assert.equal(a.confirmsReal + a.confirmsFalse, v.secondary.volatility.confirmed);
      assert.ok(a.changesDetected <= live.length && a.confirmsReal <= v.reversedEvents);
    }
    assert.equal(runE5({ world: W, worldLabel: LABEL, family: 'RARE', kind: 'MBVI3', makeAgent: makeAgentForV6 }).diagnostics.alarms, null);
  }],
];
```

## Appendix E. Gate driver (criteria as they will be executed)

File: `experiments/cf06/run_gate.mjs` · SHA-256 `fd334c7f1060230c7c91d87a1cf6aafc3a62d0d91b13a778d4856df050b2c9f6` · 373 lines

```js
// ==========================================================
// CF-06 — a belief about whether a changed exit will change back (criteria in experiments/cf06/GATE_SPEC.md)
// ==========================================================
//   node experiments/cf06/run_gate.mjs --domain dev   --out <file outside the repository> [--worlds N]
//   node experiments/cf06/run_gate.mjs --domain gate6
// Every world is run in all three families (RARE 0.1, HALF 0.5, OFTEN 0.9) of task E5, by every arm.
// Primary arm BELIEF: world model v6 with rho fixed at 1/2 (the prior mean; nothing is learned across changes), h = 0.01.
//   B1  equal mix: for every fixed policy X (MBVI3; RECALL 0.003, 0.01, 0.03), per-world sum over the three families
//       of steps(X) - steps(BELIEF), mean > 0 and lower bound > 0
//   B2  RARE (re-testing hurts): steps(BELIEF) - steps(MBVI3), upper bound < MARGIN
//   B3  OFTEN (re-testing helps): steps(MBVI3) - steps(BELIEF), mean > 0 and lower bound > 0
//   B4  the mechanism, both parts: (a) OFTEN, steps after reversed events, MBVI3 - BELIEF, mean > 0 and lower bound > 0
//       (it recovers reopened routes); (b) RARE, futile re-tests, RECALL_01 - BELIEF (the same h), mean > 0 and lower
//       bound > 0 (it gives up on permanent changes from evidence, not on a clock)
//   B5  no regression: steps(BELIEF) - steps(MBVI3) upper bound < BATTERY_MARGIN on E1 EXPLORED, E3, E1S EXPLORED, E2P PRE
//   B6  infrastructure: two in-process runs identical; all tests pass
// Verdict: INVALID (B6) / NOT SUPPORTED (B1 fails) / SUPPORTED WITH EXCEPTIONS (B1 holds; some of B2-B5 fail, listed)
//          / SUPPORTED (B1-B6).
// Learning the rate (hypothesis H-VOL) is reported with claim rules fixed now; it never changes the verdict:
//   L1 learnedRateAddsValue  BELIEF - VOL: on the mix mean > 0 and lower bound > 0, and in every family lower bound > -MARGIN
//   L2 headroomDetectable    BELIEF - VOL_RHO_TRUE on the mix, lower bound > 0.  If not, the record says that E5 gives
//                            knowing the rate no measurable value: the learning question is not admitted by this task
//   L3 rateMovesRightWay     VOL's final rho, OFTEN - RARE, mean > 0 and lower bound > 0 (direction, not estimation)
//   L4 stopsRetesting        RARE worlds whose changes were all permanent (at least Z_MIN of them): VOL's futile
//                            re-tests below BELIEF's in total and in events 4-6 (both upper bounds < 0)
//   hRobustness              ROBUST (B1 holds at h = 0.003, 0.01 and 0.03) / DIRECTION ROBUST (every B1 part has mean > 0
//                            at all three) / SENSITIVE TO h.  The verdict uses h = 0.01 only; no h is chosen from data.
//   gainSource               B3 again on the OFTEN worlds where the primary confirmed no false alarm of the change
//                            detector (at least Z_MIN of them): REOPENED ROUTES if it holds there, else NOT SHOWN APART
//                            FROM FALSE-ALARM RECOVERY (keeping the old regime also returns the agent to an exit its
//                            detector wrongly flagged), or NOT ASSESSED.  "Recovers reopened routes" needs REOPENED ROUTES.
//   gainShape                CONSISTENT if every B1 part and B3 has more worlds in favour than against and a positive
//                            median; else TAIL-DRIVEN (naming the parts): "lower expected cost, from a minority of worlds".
// Reported, never pass/fail: every arm in every family (mean, median, per-world counts, capped episodes, futile
// re-tests); B1-B4 at h = 0.003 and 0.03; false alarms of the change detector against ground truth; the zero-reversal
// subset; VOL's learned rho without pooling; every weighting of the three families on a 0.1 grid; work per decision;
// wall-clock and memory (outside the hashed rows).
// Refusals on the gate domain: missing or unfrozen specification, specification not matching GATE_SPEC.sha256,
// uncommitted or modified files, gate already run.  HEAD is recorded at launch and at the end.
// ==========================================================
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateWorld } from '../../cognitive/testbed/worlds.mjs';
import { runE5, E5_FAMILIES, E5_PARAMS } from '../../cognitive/testbed/task_e5.mjs';
import { runTaskV1 } from '../../cognitive/testbed/tasks_v1.mjs';
import { runE2P } from '../../cognitive/testbed/task_e2p.mjs';
import { makeAgentForV6 } from '../../cognitive/testbed/registry_v6.mjs';
import { pairedBootstrap } from '../../cognitive/testbed/stats.mjs';
import { VOL_DEFAULTS } from '../../cognitive/mind/v6/agent.mjs';
import { runAllTests } from '../../cognitive/tests/run_all.mjs';
import { runTestFiles } from '../../cognitive/tests/run_list.mjs';

export const GATE6_WORLDS = 60;      // fixed before the gate6 run; see GATE_SPEC.md
export const MARGIN = 25;            // steps over a run of task E5 (about 2% of the planner's total in RARE)
export const BATTERY_MARGIN = 10;    // steps (the earlier gates' margin, on the earlier tasks)
const FAMILIES = Object.keys(E5_FAMILIES);
// name -> [registry kind, params, label].  VOL_RHO_TRUE is told the family's true rate: a privileged reference.
const ARMS = Object.freeze({
  ORACLE: ['ORACLE', {}, 'privileged reference'],
  MBVI3: ['MBVI3', {}, 'fixed: keeps no memory of what a changed exit used to do (it still re-tests when its own model resets)'],
  RECALL_003: ['MBVI4_RECALL', { hazard: 0.003 }, 'fixed'],
  RECALL_01: ['MBVI4_RECALL', { hazard: 0.01 }, 'fixed'],
  RECALL_03: ['MBVI4_RECALL', { hazard: 0.03 }, 'fixed'],
  BELIEF: ['VOL_RHO', { rhoFixed: 0.5 }, 'PRIMARY: model v6, two-regime belief per changed exit, rho fixed at 1/2 (the prior mean), h = 0.01'],
  BELIEF_H003: ['VOL_RHO', { rhoFixed: 0.5, volHazard: 0.003 }, 'sensitivity of the primary to h; in no criterion'],
  BELIEF_H03: ['VOL_RHO', { rhoFixed: 0.5, volHazard: 0.03 }, 'sensitivity of the primary to h; in no criterion'],
  VOL: ['VOL', {}, 'reported (H-VOL): the same belief with rho learned across changes'],
  VOL_RHO_TRUE: ['VOL_RHO', null, 'privileged reference: rho told the family rate (the headroom for learning it)'],
});
const PRIMARY = 'BELIEF';
const FIXED = ['MBVI3', 'RECALL_003', 'RECALL_01', 'RECALL_03'];
const SENSITIVITY = Object.freeze({ 'h=0.003': 'BELIEF_H003', 'h=0.01': 'BELIEF', 'h=0.03': 'BELIEF_H03' });
const MODEL_ARMS = ['BELIEF', 'BELIEF_H003', 'BELIEF_H03', 'VOL', 'VOL_RHO_TRUE'];   // arms whose model keeps an event log
const GRID = 10;                     // family weights on the simplex in steps of 1/GRID
const Z_MIN = 10;                    // fewest zero-reversal RARE worlds on which the stopsRetesting claim is assessed
const BATTERY = [['E1', 'EXPLORED'], ['E3', 'STD'], ['E1S', 'EXPLORED'], ['E2P', 'PRE']];
const BATTERY_ARMS = ['MBVI3', 'BELIEF', 'VOL'];
const TEST_FILES = ['test_e2p.mjs', 'test_core.mjs', 'test_invariance.mjs', 'test_v1.mjs', 'test_mind.mjs', 'test_mind_v3.mjs', 'test_arb.mjs', 'test_recovery.mjs', 'test_vol.mjs'];

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const die = (m) => { console.error(`cf06 run_gate refused: ${m}`); process.exit(2); };
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a]).toString().trim();
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sd = (xs) => { if (xs.length < 2) return null; const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };
const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const quantiles = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b), q = (p) => { const x = p * (s.length - 1), i = Math.floor(x), j = Math.ceil(x); return s[i] + (s[j] - s[i]) * (x - i); };
  return { n: s.length, min: s[0], q10: q(0.1), q25: q(0.25), median: q(0.5), q75: q(0.75), q90: q(0.9), max: s[s.length - 1] };
};
const pearson = (xs, ys) => {
  if (xs.length < 3) return null;
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0;
  xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2; });
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null;
};
// A criterion on an empty contrast never passes (a null bound must not compare as 0).
const lbPos = (c) => c.n > 0 && c.mean > 0 && c.lo > 0;
const ubBelow = (c, x) => c.n > 0 && c.hi < x;

const DOMAIN = arg('--domain');
if (!['dev', 'gate6'].includes(DOMAIN)) die('--domain must be dev or gate6');
const isGate = DOMAIN === 'gate6';
const N = isGate ? GATE6_WORLDS : Number(arg('--worlds', '20'));
const SPEC = path.join(HERE, 'GATE_SPEC.md');
const OUT = isGate ? path.join(HERE, 'results', 'gate6_result.json') : path.resolve(arg('--out') ?? '');
const headAtLaunch = git('rev-parse', 'HEAD');
if (!isGate) {
  const rel = path.relative(ROOT, OUT);
  if (!arg('--out') || (!rel.startsWith('..') && !path.isAbsolute(rel))) die('dev runs need --out outside the repository');
} else {
  if (!fs.existsSync(SPEC)) die('GATE_SPEC.md is missing');
  if (!/^\*\*Status\.\*\* Frozen/m.test(fs.readFileSync(SPEC, 'utf8'))) die('GATE_SPEC.md is not marked Frozen (it is still a draft for review)');
  const SHAFILE = path.join(HERE, 'GATE_SPEC.sha256');
  if (!fs.existsSync(SHAFILE)) die('GATE_SPEC.sha256 (the frozen hash of the specification) is missing');
  const frozen = fs.readFileSync(SHAFILE, 'utf8').trim().split(/\s+/)[0];
  if (sha(fs.readFileSync(SPEC)) !== frozen) die(`GATE_SPEC.md does not match its frozen SHA-256 ${frozen}`);
  const dirty = git('status', '--porcelain', '--untracked-files=all', '--', 'cognitive', 'experiments/cf06');
  if (dirty) die(`files are not all committed and clean:\n${dirty}`);
  if (fs.existsSync(OUT)) die('the gate6 domain has already been run');
}

const agentFor = (name, family) => (kind, env, label) => {
  const [k, p] = ARMS[name];
  return makeAgentForV6(k, env, label, p === null ? { rhoFixed: E5_FAMILIES[family] } : { ...p });
};

function matrix(domain, timing) {
  const e5 = [], battery = [];
  for (let i = 0; i < N; i++) {
    const worldLabel = `cf|${domain}|world|${i}`, world = generateWorld(worldLabel);
    for (const family of FAMILIES) for (const name of Object.keys(ARMS)) {
      const t = performance.now();
      const r = runE5({ world, worldLabel, family, kind: ARMS[name][0], makeAgent: agentFor(name, family) });
      timing[name] = (timing[name] ?? 0) + performance.now() - t;
      e5.push({ name, ...r });
    }
    for (const name of BATTERY_ARMS) for (const [task, arm] of BATTERY) {
      const mk = agentFor(name, 'HALF');
      const r = task === 'E2P' ? runE2P({ world, worldLabel, kind: ARMS[name][0], arm, makeAgent: mk }) : runTaskV1({ task, world, worldLabel, kind: ARMS[name][0], arm, makeAgent: mk });
      battery.push({ name, cell: `${task}.${arm}`, world: r.world, metric: r.metric, censored: r.censored, excluded: r.excluded ?? false });
    }
  }
  return { e5, battery };
}

function analyse({ e5, battery }, domain) {
  const S = (x) => `cf|stats|${domain}|cf06|${x}`;
  const cell = (family, name) => new Map(e5.filter((r) => r.family === family && r.name === name && !r.excluded).map((r) => [r.world, r]));
  const contrast = (d, label, tag) => ({ contrast: label, sd: sd(d), median: median(d), positive: d.filter((x) => x > 0).length, negative: d.filter((x) => x < 0).length, zero: d.filter((x) => x === 0).length, mde80: d.length > 1 ? 2.8 * sd(d) / Math.sqrt(d.length) : null, ...pairedBootstrap(d, S(tag)) });
  const worldsAll = [...cell('RARE', PRIMARY).keys()].filter((w) => FAMILIES.every((f) => Object.keys(ARMS).every((n) => cell(f, n).has(w)))).sort();
  const mixOf = (name) => worldsAll.map((w) => FAMILIES.reduce((s, f) => s + cell(f, name).get(w).metric, 0));
  const pairFam = (family, a, b, f = (r) => r.metric) => { const A = cell(family, a), B = cell(family, b); return worldsAll.map((w) => f(A.get(w)) - f(B.get(w))); };
  const live = (r) => r.events.filter((e) => !e.skipped);
  const stepsIn = (r, a, b) => live(r).slice(a, b).reduce((s, e) => s + e.blocked + e.after, 0);
  const futileIn = (r, a, b) => live(r).slice(a, b).reduce((s, e) => s + (e.reverses ? 0 : e.ownAfterAttempts) + e.oldPermanentAttempts, 0);
  const fut = (r) => r.diagnostics.futileRetests, afterRev = (r) => r.windows.afterReversed, rhoOf = (r) => r.secondary.volatility.rho;
  const out = { criteria: {}, families: {}, mix: {}, battery: {}, batteryVOL: {}, learning: {}, excludedWorlds: [...new Set(e5.filter((r) => r.excluded).map((r) => r.world))], worldsAnalysed: worldsAll.length };
  const P0 = mixOf(PRIMARY);

  // ---- B1-B4 for a belief arm (the primary; the h-sensitivity arms get their own tags) ----
  const beliefCriteria = (name) => {
    const M = mixOf(name), tag = (x) => (name === PRIMARY ? x : `sens|${name}|${x}`), c = {};
    for (const x of FIXED) { const X = mixOf(x); c[`B1_${x}`] = contrast(X.map((v, i) => v - M[i]), `${x} - ${name}, sum over RARE + HALF + OFTEN`, tag(`B1|${x}`)); }
    c.B2_RARE = contrast(pairFam('RARE', name, 'MBVI3'), `${name} - MBVI3 (RARE)`, tag('B2'));
    c.B3_OFTEN = contrast(pairFam('OFTEN', 'MBVI3', name), `MBVI3 - ${name} (OFTEN)`, tag('B3'));
    c.B4a_OFTEN_afterReversed = contrast(pairFam('OFTEN', 'MBVI3', name, afterRev), `steps after reversed events, MBVI3 - ${name} (OFTEN)`, tag('B4a'));
    c.B4b_RARE_futile = contrast(pairFam('RARE', 'RECALL_01', name, fut), `futile re-tests, RECALL_01 - ${name} (RARE)`, tag('B4b'));
    return c;
  };
  out.criteria = beliefCriteria(PRIMARY);
  for (const [task, arm] of BATTERY) {
    const key = `${task}.${arm}`, pick = (n) => new Map(battery.filter((r) => r.name === n && r.cell === key && !r.excluded).map((r) => [r.world, r])), B0 = pick('MBVI3');
    const vs = (n) => { const A = pick(n), d = [...A.keys()].filter((w) => B0.has(w)).sort().map((w) => A.get(w).metric - B0.get(w).metric); return { ...contrast(d, `${n} - MBVI3 (${key})`, `bat|${key}|${n}`), meanArm: mean([...A.values()].map((r) => r.metric)), meanMBVI3: mean([...B0.values()].map((r) => r.metric)) }; };
    out.battery[key] = vs(PRIMARY); out.batteryVOL[key] = vs('VOL');
  }
  for (const name of Object.keys(ARMS)) { const m = mixOf(name); out.mix[name] = { mean: mean(m), median: median(m) }; }
  for (const family of FAMILIES) {
    const F = { p: E5_FAMILIES[family], arms: {}, contrastsVsPrimary: {} };
    for (const name of Object.keys(ARMS)) {
      const xs = [...cell(family, name).values()], vol = xs[0]?.secondary.volatility;
      F.arms[name] = {
        total: mean(xs.map((r) => r.metric)), medianTotal: median(xs.map((r) => r.metric)), blocked: mean(xs.map((r) => r.windows.blocked)), afterReversed: mean(xs.map((r) => r.windows.afterReversed)), afterPermanent: mean(xs.map((r) => r.windows.afterPermanent)),
        cappedEpisodes: xs.reduce((s, r) => s + r.censored, 0), reversedEvents: mean(xs.map((r) => r.reversedEvents)), permanentEvents: mean(xs.map((r) => r.permanentEvents)), skippedEvents: mean(xs.map((r) => r.skippedEvents)),
        workPerDecision: xs[0]?.secondary.compute ? mean(xs.map((r) => r.secondary.compute.backupsPerDecision)) : null,
        rhoEnd: vol ? mean(xs.map(rhoOf)) : null, changesArchived: vol ? mean(xs.map((r) => r.secondary.volatility.opened)) : null, reversalsConfirmed: vol ? mean(xs.map((r) => r.secondary.volatility.confirmed)) : null,
        futileRetests: mean(xs.map(fut)), medianFutileRetests: median(xs.map(fut)),
      };
    }
    for (const name of Object.keys(ARMS).filter((n) => n !== PRIMARY)) F.contrastsVsPrimary[name] = contrast(pairFam(family, name, PRIMARY), `${name} - ${PRIMARY} (${family})`, `fam|${family}|${name}`);
    out.families[family] = F;
  }

  // ---- learning the rate (H-VOL), reported ----
  const V = mixOf('VOL'), T = mixOf('VOL_RHO_TRUE');
  out.learning.L1_mix = contrast(P0.map((v, i) => v - V[i]), `${PRIMARY} - VOL, mix (what learning the rate adds)`, 'L1|mix');
  out.learning.L1_byFamily = Object.fromEntries(FAMILIES.map((f) => [f, contrast(pairFam(f, PRIMARY, 'VOL'), `${PRIMARY} - VOL (${f})`, `L1|${f}`)]));
  out.learning.L2_headroomMix = contrast(P0.map((v, i) => v - T[i]), `${PRIMARY} - VOL_RHO_TRUE, mix (the most any rate learner could add)`, 'L2|mix');
  out.learning.L2_headroomByFamily = Object.fromEntries(FAMILIES.map((f) => [f, contrast(pairFam(f, PRIMARY, 'VOL_RHO_TRUE'), `${PRIMARY} - VOL_RHO_TRUE (${f})`, `L2|${f}`)]));
  out.learning.L3_rho_OFTEN_minus_RARE = contrast(worldsAll.map((w) => rhoOf(cell('OFTEN', 'VOL').get(w)) - rhoOf(cell('RARE', 'VOL').get(w))), 'final rho of VOL, OFTEN - RARE', 'L3');
  out.learning.VOL_minus_VOL_RHO_TRUE_mix = contrast(V.map((v, i) => v - T[i]), 'VOL - VOL_RHO_TRUE, mix (the cost of having to learn the rate)', 'L|ref');
  out.learning.primaryMinusVOLByHalf = Object.fromEntries(FAMILIES.map((f) => {
    const A = cell(f, PRIMARY), B = cell(f, 'VOL');
    return [f, {
      events1to3: contrast(worldsAll.map((w) => stepsIn(A.get(w), 0, 3) - stepsIn(B.get(w), 0, 3)), `${PRIMARY} - VOL, events 1-3 (${f})`, `ev|${f}|early`),
      events4to6: contrast(worldsAll.map((w) => stepsIn(A.get(w), 3, 6) - stepsIn(B.get(w), 3, 6)), `${PRIMARY} - VOL, events 4-6 (${f})`, `ev|${f}|late`),
    }];
  }));
  out.learning.rhoTraces = Object.fromEntries(FAMILIES.map((f) => [f, [...cell(f, 'VOL').values()].slice(0, 10).map((r) => r.secondary.volatility.rhoTrace)]));

  // ---- sensitivity of the primary to the switching hazard h (reported; the verdict uses h = 0.01 only) ----
  out.sensitivity = {};
  for (const [h, name] of Object.entries(SENSITIVITY)) {
    const c = name === PRIMARY ? out.criteria : beliefCriteria(name);
    out.sensitivity[h] = {
      arm: name, contrasts: c, B1holds: FIXED.every((x) => lbPos(c[`B1_${x}`])), B1meansPositive: FIXED.every((x) => c[`B1_${x}`].mean > 0),
      totals: Object.fromEntries(FAMILIES.map((f) => [f, mean([...cell(f, name).values()].map((r) => r.metric))])),
      minusPrimaryMix: name === PRIMARY ? null : contrast(mixOf(name).map((v, i) => v - P0[i]), `${name} - ${PRIMARY}, mix`, `sens|${name}|vsPrimary`),
    };
  }
  { const S3 = Object.values(out.sensitivity); out.hRobustness = S3.every((s) => s.B1holds) ? 'ROBUST' : S3.every((s) => s.B1meansPositive) ? 'DIRECTION ROBUST' : `SENSITIVE TO h (B1 fails at ${Object.entries(out.sensitivity).filter(([, s]) => !s.B1holds).map(([h]) => h).join(', ')})`; }

  // ---- zero-reversal degeneration: RARE worlds whose changes were all permanent ----
  const Z = worldsAll.filter((w) => { const r = cell('RARE', PRIMARY).get(w); return r.reversedEvents === 0 && r.permanentEvents > 0; });
  const zr = (name) => Z.map((w) => cell('RARE', name).get(w));
  const byEvent = (rs, f) => Array.from({ length: E5_PARAMS.events }, (_, k) => { const xs = rs.map((r) => live(r)[k]).filter(Boolean).map(f); return { n: xs.length, mean: mean(xs) }; });
  out.zeroReversal = { worlds: Z.length, shareOfRAREWorlds: worldsAll.length ? Z.length / worldsAll.length : null, arms: {}, contrasts: {} };
  for (const name of ['MBVI3', 'RECALL_003', 'RECALL_01', 'RECALL_03', ...MODEL_ARMS]) {
    const rs = zr(name), isModel = MODEL_ARMS.includes(name);
    out.zeroReversal.arms[name] = {
      steps: mean(rs.map((r) => r.metric)), futileRetests: mean(rs.map(fut)),
      futileEvents1to3: mean(rs.map((r) => futileIn(r, 0, 3))), futileEvents4to6: mean(rs.map((r) => futileIn(r, 3, 6))),
      ownRetestsByEvent: byEvent(rs, (e) => e.ownAfterAttempts), oldRetestsByEvent: byEvent(rs, (e) => e.oldPermanentAttempts),
      rhoAtDetectionByEvent: isModel ? Array.from({ length: E5_PARAMS.events }, (_, k) => { const xs = rs.map((r) => r.diagnostics.alarms.rhoAtDetection[k]).filter((x) => x !== null && x !== undefined); return { n: xs.length, mean: mean(xs) }; }) : null,
      rhoEnd: isModel ? quantiles(rs.map(rhoOf)) : null,
      worldsWithFalseConfirm: isModel ? rs.filter((r) => r.diagnostics.alarms.confirmsFalse > 0).length : null,
    };
  }
  {
    const zd = (a, b, f) => { const A = zr(a), B = zr(b); return A.map((r, i) => f(r) - f(B[i])); };
    const rhoShift = zr('VOL').map((r) => { const d = r.diagnostics.alarms.rhoAtDetection, e = d.slice(0, 3).filter((x) => x !== null), l = d.slice(3).filter((x) => x !== null); return e.length && l.length ? mean(l) - mean(e) : null; }).filter((x) => x !== null);
    out.zeroReversal.contrasts = {
      futile_VOL_minus_BELIEF: contrast(zd('VOL', PRIMARY, fut), `futile re-tests, VOL - ${PRIMARY} (zero-reversal RARE)`, 'Z|fut'),
      futileEvents1to3_VOL_minus_BELIEF: contrast(zd('VOL', PRIMARY, (r) => futileIn(r, 0, 3)), `futile re-tests in events 1-3, VOL - ${PRIMARY}`, 'Z|early'),
      futileEvents4to6_VOL_minus_BELIEF: contrast(zd('VOL', PRIMARY, (r) => futileIn(r, 3, 6)), `futile re-tests in events 4-6, VOL - ${PRIMARY}`, 'Z|late'),
      futile_BELIEF_minus_MBVI3: contrast(zd(PRIMARY, 'MBVI3', fut), `futile re-tests, ${PRIMARY} - MBVI3 (the planner's own floor)`, 'Z|floor'),
      futile_RECALL_01_minus_BELIEF: contrast(zd('RECALL_01', PRIMARY, fut), `futile re-tests, RECALL_01 - ${PRIMARY} (same h)`, 'Z|recall'),
      steps_VOL_minus_BELIEF: contrast(zd('VOL', PRIMARY, (r) => r.metric), `steps, VOL - ${PRIMARY} (zero-reversal RARE)`, 'Z|steps'),
      steps_BELIEF_minus_MBVI3: contrast(zd(PRIMARY, 'MBVI3', (r) => r.metric), `steps, ${PRIMARY} - MBVI3 (zero-reversal RARE)`, 'Z|stepsM'),
      rhoAtDetection_events4to6_minus_1to3_VOL: contrast(rhoShift, 'VOL rho when a change is detected, events 4-6 minus 1-3 (worlds with both)', 'Z|rho'),
    };
  }

  // ---- false alarms of the change detector, against ground truth (evaluation only) ----
  out.alarms = {};
  for (const family of FAMILIES) {
    out.alarms[family] = {};
    for (const name of MODEL_ARMS) {
      const rs = [...cell(family, name).values()], A = rs.map((r) => r.diagnostics.alarms), tot = (k) => A.reduce((s, a) => s + a[k], 0);
      const opens = tot('opensReal') + tot('opensFalse'), confirms = tot('confirmsReal') + tot('confirmsFalse'), changes = rs.reduce((s, r) => s + r.reversedEvents + r.permanentEvents, 0);
      const withFalse = rs.filter((r) => r.diagnostics.alarms.confirmsFalse > 0);
      out.alarms[family][name] = {
        perRun: Object.fromEntries(['opensReal', 'opensFalse', 'opensFalseBeforeFirstChange', 'confirmsReal', 'confirmsFalse', 'changesDetected'].map((k) => [k, rs.length ? tot(k) / rs.length : null])),
        falseOpenShare: opens ? tot('opensFalse') / opens : null, falseConfirmShare: confirms ? tot('confirmsFalse') / confirms : null,
        changesDetectedShare: changes ? tot('changesDetected') / changes : null, worldsWithFalseConfirm: withFalse.length,
        rhoEndWorldsWithFalseConfirm: mean(withFalse.map(rhoOf)), rhoEndWorldsWithout: mean(rs.filter((r) => r.diagnostics.alarms.confirmsFalse === 0).map(rhoOf)),
      };
    }
  }

  // ---- VOL's learned rate, without pooling it away ----
  {
    const share = (r) => r.reversedEvents / Math.max(1, r.reversedEvents + r.permanentEvents), all = FAMILIES.flatMap((f) => [...cell(f, 'VOL').values()]);
    out.rho = {
      byFamily: Object.fromEntries(FAMILIES.map((f) => [f, quantiles([...cell(f, 'VOL').values()].map(rhoOf))])),
      byRealisedReversals: Object.fromEntries(Array.from({ length: E5_PARAMS.events + 1 }, (_, k) => { const xs = all.filter((r) => r.reversedEvents === k).map(rhoOf); return [k, { n: xs.length, mean: mean(xs), sd: sd(xs) }]; })),
      correlationWithRealisedShare: { pooled: pearson(all.map(share), all.map(rhoOf)), ...Object.fromEntries(FAMILIES.map((f) => { const rs = [...cell(f, 'VOL').values()]; return [f, pearson(rs.map(share), rs.map(rhoOf))]; })) },
      perWorldOrdered: worldsAll.filter((w) => rhoOf(cell('RARE', 'VOL').get(w)) < rhoOf(cell('HALF', 'VOL').get(w)) && rhoOf(cell('HALF', 'VOL').get(w)) < rhoOf(cell('OFTEN', 'VOL').get(w))).length,
      // What six changes could teach at best: the Beta(1, 1) posterior if every change's outcome were observed.
      idealObserver: Object.fromEntries(Array.from({ length: E5_PARAMS.events + 1 }, (_, r) => { const a = 1 + r, b = 1 + E5_PARAMS.events - r; return [r, { mean: a / (a + b), sd: Math.sqrt((a * b) / ((a + b) ** 2 * (a + b + 1))) }]; })),
    };
  }

  // ---- every weighting of the three families (step 1/GRID): where do B1 and L1 hold? ----
  {
    const D = Object.fromEntries(FIXED.map((x) => [x, FAMILIES.map((f) => pairFam(f, x, PRIMARY))])), L = FAMILIES.map((f) => pairFam(f, PRIMARY, 'VOL'));
    const points = [];
    for (let a = 0; a <= GRID; a++) for (let b = 0; a + b <= GRID; b++) {
      const w = [a / GRID, b / GRID, (GRID - a - b) / GRID], parts = {}, weigh = (rows) => worldsAll.map((_, i) => w.reduce((s, wf, j) => s + 3 * wf * rows[j][i], 0));
      for (const x of FIXED) { const bt = pairedBootstrap(weigh(D[x]), S(`grid|${a}|${b}|${x}`)); parts[x] = { mean: bt.mean, lo: bt.lo }; }
      const l = pairedBootstrap(weigh(L), S(`grid|${a}|${b}|L1`));
      points.push({ w, B1: FIXED.every((x) => parts[x].mean > 0 && parts[x].lo > 0), B1means: FIXED.every((x) => parts[x].mean > 0), L1: l.mean > 0 && l.lo > 0, weakestFixed: FIXED.reduce((m, x) => (parts[x].lo < parts[m].lo ? x : m), FIXED[0]), parts, L1part: { mean: l.mean, lo: l.lo } });
    }
    out.weighting = { note: 'weights (RARE, HALF, OFTEN) on the simplex; contrasts scaled by 3 so that equal weights match B1; the equal mix itself is B1', points: points.length, B1holds: points.filter((p) => p.B1).length, B1meansPositive: points.filter((p) => p.B1means).length, L1holds: points.filter((p) => p.L1).length, grid: points };
  }

  // ---- where the gain over the planner comes from: reopened routes or the detector's own false alarms ----
  {
    const split = (family) => {
      const P = cell(family, PRIMARY), M = cell(family, 'MBVI3'), fa = (w) => P.get(w).diagnostics.alarms.confirmsFalse;
      const clean = worldsAll.filter((w) => fa(w) === 0), alarmed = worldsAll.filter((w) => fa(w) > 0);
      const g = (ws, f = (r) => r.metric) => ws.map((w) => f(M.get(w)) - f(P.get(w)));
      return {
        worldsWithoutFalseConfirm: clean.length, worldsWithFalseConfirm: alarmed.length,
        worldsWithoutRealConfirm: worldsAll.filter((w) => P.get(w).diagnostics.alarms.confirmsReal === 0).length,
        gainWithoutFalseConfirm: contrast(g(clean), `MBVI3 - ${PRIMARY} (${family}), worlds where ${PRIMARY} confirmed no false alarm`, `src|${family}|clean`),
        gainWithFalseConfirm: contrast(g(alarmed), `MBVI3 - ${PRIMARY} (${family}), worlds where ${PRIMARY} confirmed a false alarm`, `src|${family}|alarmed`),
        afterReversedWithoutFalseConfirm: contrast(g(clean, afterRev), `steps after reversed events, MBVI3 - ${PRIMARY} (${family}), no false confirm`, `src|${family}|cleanAfter`),
        crossingsOfReopenedEdges: contrast(g(worldsAll, (r) => -live(r).reduce((s, e) => s + (e.crossed ?? 0), 0)), `${PRIMARY} - MBVI3 crossings of a reopened edge in its own after-window (${family})`, `src|${family}|cross`),
      };
    };
    out.gainSource = { note: 'evaluation diagnostics only; the split conditions on the primary\'s own false confirmations', OFTEN: split('OFTEN'), HALF: split('HALF') };
  }

  const Zc = out.zeroReversal.contrasts, GS = out.gainSource.OFTEN;
  const shapeParts = [...FIXED.map((x) => [`B1_${x}`, out.criteria[`B1_${x}`]]), ['B3_OFTEN', out.criteria.B3_OFTEN]].filter(([, c]) => !(c.positive > c.negative && c.median > 0)).map(([k]) => k);
  out.claims = {
    gainSource: GS.worldsWithoutFalseConfirm < Z_MIN ? `NOT ASSESSED (${GS.worldsWithoutFalseConfirm} OFTEN worlds without a confirmed false alarm, fewer than ${Z_MIN})`
      : lbPos(GS.gainWithoutFalseConfirm) ? 'REOPENED ROUTES' : 'NOT SHOWN APART FROM FALSE-ALARM RECOVERY',
    gainShape: shapeParts.length ? `TAIL-DRIVEN (${shapeParts.join(', ')})` : 'CONSISTENT',
    learnedRateAddsValue: lbPos(out.learning.L1_mix) && FAMILIES.every((f) => out.learning.L1_byFamily[f].n > 0 && out.learning.L1_byFamily[f].lo > -MARGIN),
    headroomDetectable: lbPos(out.learning.L2_headroomMix),
    rateMovesRightWay: lbPos(out.learning.L3_rho_OFTEN_minus_RARE),
    zeroReversalWorlds: Z.length,
    stopsRetesting: Z.length >= Z_MIN && ubBelow(Zc.futile_VOL_minus_BELIEF, 0) && ubBelow(Zc.futileEvents4to6_VOL_minus_BELIEF, 0),
    hRobustness: out.hRobustness,
    weighting: `B1 holds on ${out.weighting.B1holds} of ${out.weighting.points} weightings of the three families`,
  };
  return out;
}

const t1 = await runAllTests(), t2 = await runTestFiles(TEST_FILES);
const tests = { passed: t1.passed + t2.passed, total: t1.total + t2.total, failed: [...t1.failed, ...t2.failed].map((f) => `${f.file} :: ${f.name}`) };
const timingA = {}, timingB = {};
const runA = matrix(DOMAIN, timingA), runB = matrix(DOMAIN, timingB);
const hashA = sha(JSON.stringify(runA)), hashB = sha(JSON.stringify(runB));
const analysis = analyse(runA, DOMAIN);
const C = analysis.criteria;
const criteria = {
  B1_beats_every_fixed_policy_on_the_mix: FIXED.every((x) => lbPos(C[`B1_${x}`])),
  B2_safe_where_retesting_hurts: ubBelow(C.B2_RARE, MARGIN),
  B3_helps_where_changes_reverse: lbPos(C.B3_OFTEN),
  B4_mechanism: lbPos(C.B4a_OFTEN_afterReversed) && lbPos(C.B4b_RARE_futile),
  B5_no_regression: Object.values(analysis.battery).every((c) => ubBelow(c, BATTERY_MARGIN)),
};
const infra = { determinism: hashA === hashB, tests: tests.failed.length === 0 && tests.total > 0 };
const infraOk = Object.values(infra).every(Boolean);
const exceptions = Object.keys(criteria).filter((k) => k !== 'B1_beats_every_fixed_policy_on_the_mix' && !criteria[k]);
const verdict = !infraOk ? 'CF-06 INVALID'
  : !criteria.B1_beats_every_fixed_policy_on_the_mix ? 'CF-06 NOT SUPPORTED (B1)'
  : exceptions.length ? `CF-06 SUPPORTED WITH EXCEPTIONS (${exceptions.join(', ')})` : 'CF-06 SUPPORTED';
const claims = analysis.claims;
const cappedPrimary = FAMILIES.reduce((s, f) => s + analysis.families[f].arms[PRIMARY].cappedEpisodes, 0);
const result = {
  evidence: 'CF-06 a belief about whether a changed exit will change back (development, not confirmatory)', domain: DOMAIN, worlds: N,
  environment: { node: process.version, platform: `${process.platform}-${process.arch}`, headAtLaunch, headAtEnd: git('rev-parse', 'HEAD'), filesClean: isGate },
  resources: { note: 'Not part of the hashed rows', wallClockMsRunA: timingA, wallClockMsRunB: timingB, maxRssKB: process.resourceUsage().maxRSS },
  specSha256: fs.existsSync(SPEC) ? sha(fs.readFileSync(SPEC)) : null,
  parameters: { task: E5_PARAMS, families: E5_FAMILIES, arms: ARMS, primary: PRIMARY, sensitivity: SENSITIVITY, weightGridStep: 1 / GRID, zeroReversalMinimum: Z_MIN, model: VOL_DEFAULTS, margin: MARGIN, batteryMargin: BATTERY_MARGIN, bootstrapResamples: 10000, world: { nodes: 24, edges: 30, maxDegree: 4 } },
  tests, infra, criteria, claims, cappedEpisodesPrimary: cappedPrimary, verdict, analysis, rowsSha256: hashA, rows: runA,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(result, null, 1)}\n`);
console.log(JSON.stringify({ verdict, claims, infra, tests: `${tests.passed}/${tests.total}`, criteria, headAtLaunch, cappedEpisodesPrimary: cappedPrimary }, null, 1));
process.exit(infraOk ? 0 : 1);
```

## Appendix F. CF-05b results record with its amendment (the previous gate)

File: `experiments/cf05b/results/RESULTS.md` · SHA-256 `45a851aa99535295c0d18e59f64cac253c4455eed9ee50099b30b11361ee131d` · 218 lines

````markdown
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
````

## Appendix G. RECALL agent (the fixed-rate baselines)

File: `cognitive/mind/v4/agent.mjs` · SHA-256 `962f3841186bf2cdf1e07b8c79680ebb2cec99e12e3c6e2c51b848477eecc50d` · 109 lines

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
  // DIAGNOSTIC switch: params.recallIf(key) -> bool, supplied only by cognitive/testbed/arms_v5.mjs to privileged
  // diagnostic arms.  An ordinary agent has no recallIf and remembers every declared-worse exit.
  const mayRemember = (key) => !P.recallIf || P.recallIf(key) === true;
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
        recovery: { mode: P.mode, meanTauOfChosen: recovery.chosen ? recovery.tauSum / recovery.chosen : null, remembered: recovery.remembered, remembering: former.size, triedPairs: last.size },
        model: { states: model.states().size, ...model.stats(), ...model.hyper() },
      };
    },
    _model: model, _V: V,                     // test access only
  };
}
```

## Appendix H. World model v3 (the current-regime model, unchanged)

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

## Appendix H2. Frozen value-iteration planner

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

