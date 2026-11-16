# CF-06 Gate Specification — a belief about whether a changed exit will change back

**Status.** Frozen (revision 3.1) on 2026-11-16 on the owner's word ("Yes, freeze and run"), in the CF-06 freeze
commit, before the `gate6` domain was run. Revision 3.1 is revision 3 with the two mandatory corrections of Gemini's
review, as relayed by the owner. The SHA-256 of this file is recorded in `GATE_SPEC.sha256`; the driver refuses to run
if the two differ, if any file under `cognitive/` or `experiments/cf06/` is uncommitted or modified, or if the gate has
already been run. No `gate6` world had been run at the freeze; the gate is run once and never again.

- Development evaluation gate, not confirmatory. Committed at the freeze; not pushed without the owner's word.
- Earlier gates keep their recorded verdicts; no earlier record or frozen file is edited.
- History: revision 1 (learning the rate, committed `3a3fd55`); revision 2 (the owner's eight corrections); revision 3
  (re-scoped to the belief); revision 3.1 (this one: n = 135 from simulated power, gainShape in the verdict line,
  attribution of the gain by category from privileged diagnostic arms). Why each changed: `PREFREEZE_RECONCILIATION.md`
  (this folder).

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
On the development worlds an agent told the true rate gained only +14.5 steps over ρ = 1/2 (about the smallest effect
135 worlds can detect), and the learner VOL recovered +4.4 of it, so task E5 cannot answer that question; it is reported
here (L1–L4) and needs a task built for it.

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
dev). The belief treats it exactly like a genuine change, and returns the agent to that exit, which is a second route
to a gain that has nothing to do with the world changing back. The mechanism is kept as it is; the evaluation
separates the two with ground truth the agent never receives (the detector false-alarm evaluation plan, below).
Re-tests soon after a change (τ ≪ 1/h) carry almost no evidence.

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

**Context for diagnostic arms only.** `runE5` hands `makeAgent` a fifth argument, `isBlockedPair(key)`: whether the
edge behind an (observation label, action) pair is blocked by the task at this moment. `cognitive/testbed/arms_v6.mjs`
builds every arm and is its only consumer; it drops the context for every ordinary arm (tested).

## Arms (the baseline table)

| Arm | What it is | Information it receives | Role |
|---|---|---|---|
| MBVI3 | The planner on model v3. Keeps no memory of what a changed exit used to do; after a change it forgets the exit's destination and re-tests from optimism about the unknown until the impassable weight dominates | Observations | Fixed policy (B1–B5) |
| RECALL_003 / RECALL_01 / RECALL_03 | CF-05b's RECALL at hazard 0.003 / 0.01 / 0.03: re-tests on a clock | Observations | Fixed policies (B1; RECALL_01 in B4b) |
| **BELIEF** | **Model v6, ρ fixed at 1/2, h = 0.01** | Observations and two constants | **Primary** |
| BELIEF_H003 / BELIEF_H03 | BELIEF with h = 0.003 / 0.03 | Observations | Sensitivity; in no criterion |
| VOL | Model v6 with ρ learned across changes (empirical Bayes, Beta(1, 1)) | Observations | Reported (H-VOL, L1–L4) |
| VOL_RHO_TRUE | Model v6 with ρ fixed at the family's true p | **The family's true p (privileged)** | Reference: the headroom for learning the rate; in no criterion |
| BELIEF_REALONLY | BELIEF that archives a declared-worse exit only if the change is genuine | **Ground truth at the moment of each declaration (privileged)** | Diagnostic: the gain from genuine changes (gainSource); in no criterion |
| BELIEF_FALSEONLY | BELIEF that archives a declared-worse exit only if it is a false alarm | **The same ground truth (privileged)** | Diagnostic: the gain from repairing false alarms (gainSource); in no criterion |
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
| SUPPORTED — CONSISTENT | B1–B6, and gainShape CONSISTENT | Adversarial review, then a proposal to the owner to make model v6 with ρ fixed at 1/2 the agent's model. Nothing changes in the agent before that decision |
| SUPPORTED — TAIL-DRIVEN (parts) | B1–B6, and gainShape TAIL-DRIVEN | As above, but the record and any proposal say "a lower expected cost than every fixed policy, from a minority of worlds", print the per-world differences and the extreme worlds' share, and never call the belief better in general or in a typical world |
| SUPPORTED WITH EXCEPTIONS (…) — gainShape | B1 holds; some of B2–B5 fail (listed) | Not adopted as it stands; the failing criterion names the next design question |
| NOT SUPPORTED | B1 fails | Not adopted. The belief is recorded as not enough at this scale |
| INVALID | B6 fails | None |

gainShape is part of the verdict line whenever B1 holds. It is the same rule for every part: **CONSISTENT** if every B1
part and B3 has (i) more worlds in favour than against, (ii) a positive median and (iii) a positive mean once the most
favourable 10% of worlds (⌈0.1 n⌉) are removed; otherwise **TAIL-DRIVEN**, naming each failing part and condition. It
never turns a pass into a fail or the reverse.

**Why these criteria.** B1 is the capability claim: no fixed willingness to re-test is best in every family, so a
belief that adapts to each change should beat each of them over a mix of worlds. B2 and B3 say where it must show.
B4 checks that the claimed mechanism is present where it should act: recovery where changes reverse (against the
planner, which has no memory of the old regime) and giving up where they do not (against RECALL with the same h, which
re-tests on a clock). B4a counts every step after reversed events, so it cannot by itself say that the gain comes from
re-using reopened routes rather than from returning to an exit the change detector wrongly flagged; gainSource answers
that from the diagnostic arms and limits the wording. The 25-step margin is about 2% of the planner's total over a run in RARE.

**Claim rules, fixed now** (reported beside the verdict; they never change it):

| Claim | May be written only if |
|---|---|
| L1 "Learning the rate adds value" | BELIEF − VOL on the mix: mean > 0 and lower bound > 0, and in every family lower bound > −25 |
| L2 "Knowing the rate has measurable value on E5" | BELIEF − VOL_RHO_TRUE on the mix: lower bound > 0. Otherwise the record says that E5 gives knowing the rate no measurable value, and L1 is not evidence either way |
| "This task can test learning the rate" | L2, and the headroom's mean at least twice L1's MDE80 at the gate's n (the registry's headroom rule). Added in revision 3.1: at n = 135 the development headroom (+14.5) is about the size 135 worlds can detect, so L2 alone could pass while learning the rate stays untestable (L1 power about 0.23 at n = 135 even at its development mean) |
| L3 "VOL's learned rate moves in the right direction" | VOL's final ρ, OFTEN − RARE: mean > 0 and lower bound > 0. Never "estimates the rate" |
| L4 "VOL learns to stop re-testing where changes never reverse" | On the RARE worlds whose changes were all permanent (at least 10 of them): VOL's futile re-tests below BELIEF's in total and in events 4–6 (both upper bounds < 0) |
| h-robustness | ROBUST (B1 holds at h = 0.003, 0.01 and 0.03) / DIRECTION ROBUST (every B1 part has mean > 0 at all three) / SENSITIVE TO h (naming where B1 fails). The verdict uses h = 0.01 only |
| Weighting | The verdict uses the equal mix; the record states beside it on how many of 66 weightings (0.1 grid) B1 holds |
| gainSource: "recovers reopened routes" | From the diagnostic arms, OFTEN. GENUINE: MBVI3 − BELIEF_REALONLY has mean > 0 and lower bound > 0 both in total and after reversed events. FALSE: MBVI3 − BELIEF_FALSEONLY has mean > 0 and lower bound > 0. Label GENUINE REVERSALS / GENUINE REVERSALS AND FALSE-ALARM REPAIR / FALSE-ALARM REPAIR / NOT ATTRIBUTED. "Recovers reopened routes" only with GENUINE; with FALSE the record also says the gain includes repairing the detector's false alarms. INVALID if the split is not exact (a diagnostic arm archived an event of the other kind, as classified independently from the trace) |
| gainSourceMix: "beats the planner by recovering reopened routes" | The same rule for B1's gain over the planner on the mix: GENUINE = MBVI3 − BELIEF_REALONLY on the mix has mean > 0 and lower bound > 0; FALSE = MBVI3 − BELIEF_FALSEONLY likewise. With FALSE-ALARM REPAIR alone the record says that B1's advantage over the planner comes from repairing the change detector's false alarms. Added after the revision-3.1 development look, in the restrictive direction (on dev it reads FALSE-ALARM REPAIR) |
| gainShape | Part of the verdict line (above) |

History of these two rules, disclosed: both were added after the revision-3 development look, in the restrictive
direction. Revision 3.1 (Gemini's review) put gainShape into the verdict line and added its condition (iii); it moved
gainSource from a split on BELIEF's own confirmations, which conditions on the agent's behaviour, to the diagnostic arms,
whose classification uses ground truth the agent never receives. The confirmation split is still reported, never as
proof of a genuine reversal.

## Statistical plan

| Item | Value |
|---|---|
| Domain / worlds | `gate6`; `cf|gate6|world|0…134`, never used before: the label `cf|gate6|` appears only in this folder's draft files, and a world is generated from its label alone, so no development world, selection or tuning reaches it; 24 nodes, 30 edges, maximum degree 4 |
| Sample size | **n = 135**: the smallest of the sizes considered (60, 100, 135) at which the simulated probability that the gate's own rule returns SUPPORTED reaches 0.80 when the true effects are half the development effects (below). The earlier rule n = max(20, ⌈(2.8·SD/mean)²⌉) gives the same figure for B1's planner part and B3 at half effect (about 135) |
| Unit and intervals | The world; percentile bootstrap, 10,000 resamples, 95% |
| Exclusions | A world is excluded, in every arm and family, if it has no start–goal pair at distance ≥ 3 (`planE5`); an event is skipped, and recorded, if no edge on a current shortest route can be blocked while keeping the goal reachable. Both are decided from the true graph alone, before any agent acts, identically for every arm. The analysis uses the worlds present in every arm and family; excluded worlds are listed and not replaced, so fewer than 135 may be analysed. The battery cells keep their tasks' own fixed exclusion rules |
| Truncation | A capped episode counts its cap in every mean and median; capped episodes are counted per arm and family; the primary's count is printed beside the verdict |
| Robust summaries | Medians and per-world counts beside every mean |
| Families within a world | Not independent (same graph, layout, reliabilities, agent seed); every contrast is formed per world first and the world is resampled |
| Multiplicity | All parts of B1–B6 required for SUPPORTED: conservative as a whole. Reported contrasts (L1–L4, sensitivity, families) are uncorrected and cannot change the verdict |
| Reproducibility | Two in-process runs must give identical row hashes; HEAD recorded at launch and at the end; wall-clock and memory outside the hashed rows; the machine kept awake during the run (4 to 8 hours: 135 worlds × 3 families × 12 arms × 1.4 to 3 s × 2 runs, plus the battery) |
| Statistical test | Each criterion is a one-sided decision read from a two-sided 95% percentile-bootstrap interval of the world-paired mean difference (B1, B3, B4: lower bound > 0 and mean > 0; B2, B5: upper bound below the margin) |

### Power and sample size (`power_sim.mjs`, this folder)

**Method.** The gate's own decision rule is simulated, not approximated. Each development world gives a vector of the
per-world differences the criteria use (B1's four parts, B2, B3, B4a, B4b). A simulated gate of n worlds draws n such
vectors with replacement, so the dependence between criteria within a world is kept (B1's planner part and B3 share
the OFTEN family), then applies the percentile bootstrap and the rules exactly as the driver does. B5 is exactly zero in
every development world and is taken to pass. 1,000 simulated gates per cell, 1,000 bootstrap resamples inside each
(the gate uses 10,000); Monte Carlo standard error of each probability about 0.016.

**Scenarios.** DEV: the development differences as they are; optimistic, because the development worlds chose the
primary. **HALF: every benefit column shifted down by half its development mean, the spread kept; the planning case.**
HALF_B2: HALF, and B2 shifted so that BELIEF costs +8.2 steps in RARE (its cost on the development worlds where
nothing reversed).

**Effect sizes and variances used** (development, 20 worlds): B1 planner +64.1 (SD 133.5), RECALL 0.003 +99.0 (105.7),
RECALL 0.01 +297.4 (168.9), RECALL 0.03 +835.6 (634.1); B2 +0.1 (24.3); B3 +45.6 (94.6); B4a +27.7 (45.8); B4b +93.2 (63.5).

| n | Scenario | B1 planner | B1 RECALL 0.003 | B2 | B3 | B4a | B4b | **P(B1)** | **P(SUPPORTED)** | P(gainShape CONSISTENT) |
|---|---|---|---|---|---|---|---|---|---|---|
| 60 | DEV | 0.99 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 0.99 | 0.99 | 0.41 |
| 100 | DEV | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 0.42 |
| 135 | DEV | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 0.50 |
| 60 | HALF | 0.51 | 0.95 | 1.00 | 0.54 | 0.78 | 1.00 | 0.49 | **0.41** | 0.00 |
| 100 | HALF | 0.73 | 1.00 | 1.00 | 0.79 | 0.95 | 1.00 | 0.73 | **0.69** | 0.00 |
| **135** | **HALF** | 0.85 | 1.00 | 1.00 | 0.89 | 0.99 | 1.00 | 0.85 | **0.82** | 0.00 |
| 200 | HALF | 0.97 | 1.00 | 1.00 | 0.98 | 1.00 | 1.00 | 0.97 | 0.96 | 0.00 |
| 135 | HALF_B2 | 0.86 | 1.00 | 1.00 | 0.91 | 0.98 | 1.00 | 0.86 | 0.84 | 0.00 |

(B1's RECALL 0.01 and 0.03 parts have power 1.00 in every cell.) The normal approximation agrees for single criteria
(B1 planner part at half effect: 0.46 / 0.67 / 0.80 at n = 60 / 100 / 135), but multiplying criteria as if they were
independent understates the joint power (0.13 at n = 60), because B1's planner part and B3 move together.

**Decision rule, fixed now:** the smallest n among 60, 100 and 135 with P(SUPPORTED) ≥ 0.80 under HALF; that is 135.
n = 200 (0.96) is reported for scale and not chosen: the owner's range was 100–135, and the gate already takes 4 to
8 hours.

**What the simulation says about gainShape, in advance:** at half the development effect the gate almost never reads
CONSISTENT (the median world difference is then below zero), and at the development effect about half the time. A
TAIL-DRIVEN verdict line is therefore the expected outcome, not a surprise.

**Assumptions.** The 20 development worlds stand for the population: the simulation knows only their tails, and a
heavier tail in fresh worlds would lower power. A smaller true effect is modelled as a shift with the spread kept. The
development worlds chose the primary. None of these numbers can change a verdict.

## Reported (not pass/fail)

Every arm in every family: total, median, steps while blocked and after reversed / permanent events, capped episodes,
futile re-tests, events per run, work per decision; every arm against BELIEF. **h sensitivity**: B1–B4 statistics at
h = 0.003 and 0.03. **Learning the rate**: L1 per family and on the mix, BELIEF − VOL in events 1–3 and 4–6 per family,
the headroom (L2) per family, VOL − the true-rate reference. **Zero-reversal RARE subset**: futile re-tests per event
for every arm, ρ at each detection, BELIEF against the planner's floor and against RECALL. **False alarms** for every
v6 arm. **VOL's ρ without pooling**: quantiles per family, per-world ordering, by the realised number of reversals,
correlation with the realised share, the ideal-observer bound. **Weighting grid** for B1 and L1. **Per-world
results** for every criterion: each world's difference, quantiles, worlds in favour and against, the most favourable
10% of worlds with their share of the summed difference and the mean of the rest, and the fewest favourable worlds
whose removal leaves a mean ≤ 0. **The gain by category** (below). **The confirmation split** (OFTEN and HALF): the
planner − BELIEF difference split by whether BELIEF confirmed a false alarm, and crossings of reopened edges; it
conditions on the agent's behaviour and is never proof of a genuine reversal. Wall-clock and memory per arm.

## Detector false-alarm evaluation plan

The belief treats a false alarm of the change detector exactly like a genuine change; the mechanism is not changed.
The evaluation tells them apart with ground truth that no ordinary arm ever receives.

| Category | How it is identified (evaluator ground truth) | What is reported, per family and on the mix |
|---|---|---|
| Genuine reversal | The declared exit's edge is blocked by the task when the change is declared, and that event's block is later removed | Archives opened and reversals confirmed per run; **steps attributable**: MBVI3 − BELIEF_REALONLY over the block and after windows of reversed events, and after reversed events alone |
| Permanent change | Blocked when declared, and that event's block is never removed | Archives opened per run; **steps attributable**: MBVI3 − BELIEF_REALONLY over the windows of permanent events (the belief's cost or gain where nothing comes back); futile re-tests |
| False detector alarm | The edge is not blocked when the change is declared | Archives opened (and those before the first change) and confirmed per run; **steps attributable**: MBVI3 − BELIEF_FALSEONLY over the run |
| Interaction | — | (MBVI3 − BELIEF) − (MBVI3 − BELIEF_REALONLY) − (MBVI3 − BELIEF_FALSEONLY), per world |

- **Two independent classifiers.** The diagnostic arms use the live predicate `isBlockedPair` at the moment of each
  declaration; `diagnoseE5` classifies every archive afterwards from the environment trace and the schedule. The split is
  exact only if the real arm archived no false alarm and the false arm no genuine change by the second classifier;
  otherwise gainSource reads INVALID.
- **Not used as proof:** the agent's own confirmation that an exit works again. A confirmed reversal counts as genuine
  only when the trace places its archive inside a real block.
- **Limits.** Each declaration is classified once, when it is made; the two arms then behave differently, so their
  parts need not add up, and the residual is reported, not assigned. The planner's own false alarms are not observed
  (model v3 keeps no event log and is not changed).

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
| Fairness: same five constructor arguments, same budget, identical decisions until VOL's ρ leaves 1/2 | BELIEF and VOL compare like with like |
| Diagnostics on a hand-built trace with known answers; shifted-log and confirm-without-open mutants refused | False-alarm and futile-re-test arithmetic |
| Diagnostics are evaluation-only: one trace read after the last episode; totals agree with per-event rows; the planner has no log | Ground-truth isolation |
| **Archive diagnostics (model)**: `archiveIf` decides which declared-worse exits are archived; only a literal true admits; always-true reproduces the plain run exactly | The diagnostic switch adds nothing but the filter |
| **E5 ground truth**: `isBlockedPair` agrees with the environment for every exit at every step | The live classifier is right |
| **E5 diagnostic split**: the real arm archives no false alarm and the false arm no genuine change, by the trace; a diagnostic arm without the context, or with an unknown diagnostic, throws | The split is exact and cannot silently become an ordinary arm |
| **Leakage v6**: an ordinary arm offered a forged context or a caller's `archiveIf` behaves identically; the v6 mind never mentions ground truth in code | No ground truth reaches the primary |
| Whole suite (`npm test`, 173 tests) and the earlier gates' test files | No regression |
| Behaviour unchanged by the diagnostics | The revised task reproduced all 48 stored development rows of revision 1 field by field; the revision-3.1 development run reproduced all 840 rows of revision 3 (every field except the two new alarm counters) |
| Pre-freeze checks (driver) | Refuses: unfrozen spec, hash mismatch, uncommitted files, gate already run |

## Development-domain disclosure (`cf|dev|world|0…19`)

Looked at five times, all disclosed: the admission look (fixed arms); one VOL look (revision 1, a-priori constants);
the 8-world driver validation (dev 0–7); the revision-2 run (ten arms, including BELIEF under the name VOL_FIXED05);
the revision-3 run (adds BELIEF at h = 0.003 and 0.03 and BELIEF on the battery; the other 640 rows are identical to
revision 2's, checked field by field). A re-run after gainSource and gainShape were added recomputes the same rows
with the two splits. The revision-3.1 run adds the two diagnostic arms (120 rows) and reproduces the other 840 rows of
revision 3 exactly. No constant was changed after any look. **The development verdict below is not evidence for the
hypothesis: these worlds chose the primary, and the criteria were written knowing its numbers.**

Development result, 20 worlds, as the driver computes it: **SUPPORTED — TAIL-DRIVEN (B1_MBVI3: 10 of 20 worlds in
favour, median −5)**, tests 173/173, the two runs identical, no capped episode for the primary. Claim rules: L1 no, L2
no, the task cannot test learning the rate, L3 yes, L4 no (10 zero-reversal worlds), h DIRECTION ROBUST, B1 on 26 of 66
weightings, gainSource (OFTEN) GENUINE REVERSALS, **gainSourceMix (B1 against the planner) FALSE-ALARM REPAIR**, the
diagnostic split exact.

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

**The gain over the planner by category** (diagnostic arms, ground truth; steps saved against the planner, mean
[95%], worlds in favour / against; the split was exact in every run)

| Category | RARE | HALF | OFTEN | Mix |
|---|---|---|---|---|
| **Total** (MBVI3 − BELIEF) | −0.1 [−9.9, 10.6] 8 / 12 | +18.6 [−6.5, 49.9] 9 / 10 | +45.6 [9.8, 90.2] 11 / 9 | +64.1 [11.5, 125.2] 10 / 10 |
| Genuine changes (MBVI3 − REALONLY) | −9.8 [−15.9, −3.4] 3 / 17 | +7.3 [−11.8, 33.3] | **+31.5 [6.5, 68.8]** 11 / 8 | +28.9 [−6.2, 75.0] 10 / 10 |
| … windows of reversed events | +4.0 [0.1, 8.9] | +2.7 [−4.8, 11.2] | +29.9 [4.5, 67.0] | |
| … after reversed events only | +3.5 [−0.1, 8.1] | +11.3 [5.0, 18.2] | +19.3 [6.0, 39.1] 13 / 3 | |
| … windows of permanent events | **−13.8 [−19.0, −8.8]** 1 / 18 | +4.6 [−12.2, 28.7] | +1.6 [−0.5, 5.4] | |
| False alarms (MBVI3 − FALSEONLY) | **+11.3 [2.4, 22.1]** 5 / 1 | **+19.1 [1.6, 41.6]** 5 / 1 | +17.6 [−0.7, 49.4] 2 / 2 | **+48.0 [11.3, 93.2]** 7 / 2 |
| Interaction residual | −1.5 [−3.4, 0.1] | −7.8 [−20.3, 0.0] | −3.5 [−11.9, 1.9] | −12.8 [−27.6, −1.4] |
| Per run: genuine reversing / permanent / false archives (BELIEF) | 0.55 / 4.80 / 0.85 | 1.85 / 2.80 / 0.80 | 2.45 / 0.15 / 0.65 | |

Read plainly: where reversals are common the belief gains mainly from genuine reversals; where changes are permanent
its handling of genuine changes costs about 10–14 steps a run, and repairing the detector's false alarms pays that
back; **on the mix, the advantage over the planner comes more from repairing false alarms than from genuine changes**.
By the standard Gemini set for RECALL in CF-05b ("if FALSEONLY carries the majority of the benefit, re-categorise the
mechanism as a change-detector patch"), B1's advantage over the planner is, on dev, mostly a change-detector repair.
In OFTEN (B3) it is not.

**Per-world differences** (worlds in favour / against; quartiles; the most favourable 10% of worlds and their share of
the summed difference; the mean of the remaining worlds; the fewest favourable worlds whose removal leaves a mean ≤ 0)

| Part | For / against | q25 / median / q75 | Top 10% (worlds: steps) | Their share | Mean of the rest | Worlds that erase the mean |
|---|---|---|---|---|---|---|
| B1, planner | 10 / 10 | −24.3 / −5.0 / +99.5 | 0: 339, 3: 318 | 0.51 | +34.7 | 5 |
| B1, RECALL 0.003 | 17 / 3 | +29.0 / +118.5 / +183.8 | 18: 305, 16: 198 | 0.25 | +82.1 | 12 |
| B1, RECALL 0.01 | 19 / 1 | +165.0 / +272.5 / +428.3 | 16: 532, 10: 526 | 0.18 | +271.7 | 19 |
| B1, RECALL 0.03 | 20 / 0 | +418.0 / +705.0 / +1018.0 | 10: 2737, 5: 2287 | 0.30 | +649.4 | 20 |
| B3, OFTEN | 11 / 9 | −3.8 / +7.0 / +36.3 | 0: 328, 3: 272 | 0.66 | +17.4 | 7 |
| B4a | 14 / 3 | 0.0 / +9.5 / +37.3 | 0: 175, 3: 110 | 0.51 | +14.9 | 10 |
| B4b | 20 / 0 | +44.8 / +93.0 / +121.0 | 18: 262, 19: 176 | 0.23 | +79.2 | 20 |

(B2 is a cost bound, mean +0.1; its share column has no meaning.) Dev world 3 in OFTEN, one of the two largest gains,
confirmed no genuine reversal and one false alarm.

**The confirmation split** (reported, not proof): OFTEN worlds where BELIEF confirmed no false alarm (11): +46.6 [4.6,
111.0]; worlds where it confirmed one (9): +44.4 [−2.9, 110.8]. Crossings of a reopened edge in its after-window,
BELIEF − planner, OFTEN: +3.9 [1.9, 6.0], 12 / 1 (the planner almost never re-uses a reopened edge). OFTEN by window:
while blocked +16.9 [−2.9, 41.9]; after reversed events +27.7; after permanent events +1.1.

**The trade-off against RECALL in OFTEN.** RECALL 0.01 − BELIEF: total −15.8 [−44.9, 9.4]; after reversed events
−27.4 [−57.3, −5.5] (RECALL recovers faster); while blocked +11.3 [0.9, 22.4] (BELIEF re-tests less during the block).
After reversed events BELIEF closes about half of the gap between the planner (406.8) and RECALL 0.01 (351.6), at 379.1,
and pays none of RECALL's cost in RARE. The true-rate reference (ρ = 0.9) reaches 353.3.

**h sensitivity.** B1–B4 hold at h = 0.003. At h = 0.03, B1's planner part fails (+41.5 [−5.8, 96.2]); B2–B4 hold.
Label DIRECTION ROBUST.

**Learning the rate** (reported). L1 BELIEF − VOL on the mix +4.4 [−12.5, 23.3] (SD 42.0; MDE80 15.2 at n = 60,
10.1 at n = 135); L2 headroom +14.5 [−8.4, 42.1] (RARE +0.6, HALF 0.0, OFTEN +13.9; SD 59.6; MDE80 21.6 at n = 60,
14.4 at n = 135); the headroom rule (L2 mean ≥ 2 × L1's MDE80) is not met (14.5 against 20.2 at n = 135); L3 VOL's final ρ, OFTEN − RARE, +0.31
[0.24, 0.36]; VOL's ρ medians 0.34 / 0.50 / 0.70, ordered in 11 of 20 worlds.

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

**Run time.** 1.4 to 3 s per run on the development machine (1.4 s in the revision-3.1 run, 3 s when the machine was
shared); the gate (135 worlds, three families, twelve arms, two runs, and the battery) takes about 4 to 8 hours.

## Remaining scientific limitations

1. **Development contamination.** The primary was chosen after the development worlds, and B1–B5 were written with
   BELIEF's numbers known; gainSource, gainShape and gainSourceMix were added after looks (all restrictive). Nothing
   was tuned, but the development effects are an optimistic guide; n = 135 is sized for half of them (P(SUPPORTED) 0.82).
2. **The power simulation** treats the 20 development worlds as the population: it knows only their tails, and a
   heavier tail in fresh worlds would lower power. A smaller effect is modelled as a shift.
3. **The gain over the planner is concentrated.** Ten of 20 worlds favour the planner on the mix (median −5); removing
   the five most favourable worlds erases the mean (seven for B3). The belief's value against the planner is mostly
   avoiding rare long failures, not a steady saving. gainShape puts this in the verdict line, and the simulation
   expects TAIL-DRIVEN.
4. **Against the planner, the measured gain is largely a repair of the change detector.** On dev the mix advantage is
   +48.0 [11.3, 93.2] from false alarms and +28.9 [−6.2, 75.0] from genuine changes (residual −12.8); only in OFTEN do
   genuine reversals carry it (+31.5 [6.5, 68.8]). gainSourceMix makes the record say so if the gate repeats it. A
   better change detector might remove much of the planner-relative gain; that is a design question, not tested here.
5. **B2's safety in RARE is a balance.** The belief's handling of genuine changes costs 9.8 [3.4, 15.9] steps a run in
   RARE (windows of permanent events −13.8); repairing false alarms pays it back (+11.3). The cost alone is inside the
   25-step margin.
6. **The attribution has limits.** Each declaration is classified once, when it is made; the two diagnostic arms then
   diverge, so their parts do not add up (the residual is reported, not assigned). The planner's own false alarms are
   not observed (v3 keeps no event log and is not changed).
7. **B4a cannot attribute the gain on its own** (it counts every step after reversed events); B4 shows that the
   mechanism is present where it should act; the diagnostic arms say how much of the gain it carries.
8. **RECALL recovers faster where reversals are common** (after reversed events, −27.4 [−57.3, −5.5] on dev). ρ = 1/2
   under-weights reversal where 90% reverse; knowing the rate gains +14.5 on the mix, about the smallest effect 135
   worlds can detect, and learning it recovered +4.4.
9. **h.** Borrowed from CF-05b, where it was chosen for RECALL. B1 fails at h = 0.03 on dev (planner part).
10. **The fixed-policy class** is the planner and RECALL at three hazards. A rule that re-tests k times and then gives
    up is not in it. With ρ and h fixed, BELIEF is itself a fixed schedule (a function of the times of failed re-tests);
    the claim is that a schedule derived from a two-regime model, with no constant tuned on E5, beats fixed-hazard
    re-testing and the planner's reset, not that Bayesian inference beats every hand-made schedule.
11. **A mixture claim.** B1 needs the families together: alone, RARE shows no gain over the planner and OFTEN no gain
    over RECALL. B1 holds on 26 of 66 weightings on dev.
12. **The change detector is v3's, unchanged**: 0.65–0.85 false archives per run; in RARE 74% of confirmed reversals
    are false alarms. The planner's optimism after a reset already re-tests changed exits; the comparison is with the
    planner as it is.
13. **Where nothing reverses, the belief costs a little**: +8.2 steps against the planner on the zero-reversal worlds
    (inside B2's margin).
14. **B5 cannot fail on these tasks as they stand**: BELIEF and the planner take identical steps in every development
    world; it shows that the extension is inert there.
15. **Scope.** One kind of change (an edge blocked on a shortest route), a fixed 10-episode delay, three reversal
    probabilities, six changes per run, 24-node worlds, one environment class. Learning the rate is not tested.
16. **Run time.** 4 to 8 hours for the gate; the machine must stay awake, and a failed run cannot be resumed (the
    domain is spent once started).

## Future questions (not tested here)

Recorded in `docs/experiments/HYPOTHESIS_REGISTRY.md`: **H-VOL** (learning how often changes reverse; needs a task
where knowing the rate is worth at least twice the detectable effect — the headroom rule), **H-VOL-DRIFT** (a rate
that drifts within a run), **H-VOL-CONT** (reversal delays from a law the model does not assume; E5 reverses after
exactly 10 episodes and h is the only probe here), **H-VOL-XFER** (carrying ρ from one world to the next). Two design
questions from this work: the change detector's false alarms, and the planner's optimism after a reset, which
already does some of the re-testing a belief is meant to decide.
