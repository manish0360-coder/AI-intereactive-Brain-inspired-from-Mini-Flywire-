# CF-06 Gate Specification — learning how often changes reverse

**Status.** DRAFT for the owner's review. Not frozen. The driver refuses to run the `gate6` domain until this line
reads "Frozen" and the file's SHA-256 matches `GATE_SPEC.sha256`. No `gate6` world has been run.

- Development evaluation gate, not confirmatory. Commits are local until the owner authorises a push.
- Earlier gates keep their recorded verdicts; no earlier record or frozen file is edited.

## The question

CF-05b showed that remembering what a changed exit used to do (RECALL) recovers a reopened route, but costs steps
when the change is permanent, and that whether it is worth having depends on how often changes reverse (point
break-even 0.35). RECALL's willingness to re-test is fixed in advance. **Can an agent learn from its own experience
how often changes in its world reverse, and so re-test where that pays and stop where it does not?** If so, the
reversal probability stops being a design decision and becomes something the agent works out.

This targets the owner's research priorities 3 (change detection and adaptation), 4 (recovery and memory) and 6
(metacognition: an agent estimating a property of its own world from its own track record).

## The mechanism: world model v6 (`cognitive/mind/v6/`), agent VOL

The existing planner, unchanged (the frozen value-iteration planner, `cognitive/core/planner.mjs`), on a new model
version. v3 is used unchanged as the "current regime" model. v6 adds, inside the model:

1. **Two regimes per changed exit.** When v3 declares that an exit got worse, v6 keeps the prediction it held just
   before (the old regime). The exit is then either *permanent* or *reversing* (returns at a time T after the change,
   T geometric with hazard h = 0.01). A priori P(reversing) = ρ.
2. **Bayesian evidence from re-tests.** Each failed attempt on such an exit is evidence:
   L_perm = q_new^k; L_rev = S(τ_k) q_new^k + Σ_j [S(τ_{j−1}) − S(τ_j)] q_new^(j−1) q_old^(k−j+1), S(t) = (1−h)^t;
   P(reversing | tests) = ρ L_rev / (ρ L_rev + (1−ρ) L_perm); P(old regime now) = P(reversing | tests) ×
   (1 − S(τ_now) q_new^k / L_rev). The first move of such an exit confirms a reversal.
3. **The planning belief** for a changed exit is the mixture of its regimes weighted by P(old regime now).
   `predict()` returns it, so the planner needs no rule of its own.
4. **ρ is learned**, pooled over the agent's own changes by empirical Bayes to a fixed point:
   ρ = (1 + confirmed reversals + Σ P(reversing | tests) over open changes) / (2 + confirmed + open).

**Relation to RECALL.** With ρ fixed at 1 and before any failed re-test, the weight is 1 − (1 − h)^τ, exactly
RECALL's (tested). The difference: ρ is learned, and failed re-tests count as evidence instead of resetting a clock.

**Constants fixed before any development data, not tuned:** h = 0.01 (the setting CF-05b selected for RECALL on its
own tuning worlds); prior Beta(1, 1) on ρ. No setting was changed after a development result.

**Declared limit.** A false alarm of v3's change detector archives an exit that never changed; when it moves again
it counts as a confirmed reversal and pushes ρ up.

## Task E5 (`cognitive/testbed/task_e5.mjs`)

Hidden per-edge reliabilities U[0.5, 1]. 600 unrewarded exploration steps; 30 training episodes to a cued goal at
distance ≥ 3; then **six change events**. Each event blocks, without notice, an edge on a currently shortest route
whose removal keeps the goal reachable; after 10 episodes the block is removed (with probability p) or kept for the
rest of the run; then 10 more episodes. Episodes are capped at 200 steps.

| Family | p (reversal probability) | Reversed / permanent events per run (dev, 20 worlds) |
|---|---|---|
| RARE | 0.1 | 0.65 / 5.15 (0.20 skipped: no admissible edge) |
| HALF | 0.5 | 2.70 / 3.30 |
| OFTEN | 0.9 | 5.45 / 0.55 |

The whole schedule is drawn in advance from the true graph only, so it is identical for every agent in a world and
family. **Every world is run in all three families by every arm.**

**Task admission (development evidence, before this specification).** The task is worth running only if the best
fixed willingness to re-test differs between families. It does, sharply: RECALL 0.01 minus the never-re-testing
planner is **+214 steps [152, 280] in RARE**, +81 [14, 155] in HALF and **−62 [−110, −18] in OFTEN** (20 dev worlds).

## Arms

| Arm | What it is | Role |
|---|---|---|
| MBVI3 | The planner; never re-tests a changed exit | Fixed policy |
| RECALL_003, RECALL_01, RECALL_03 | CF-05b's RECALL at hazard 0.003, 0.01, 0.03 | Fixed policies |
| **VOL** | World model v6, ρ learned | **Primary** |
| VOL_RHO_TRUE | VOL with ρ fixed at the family's true p | Privileged reference (told a property of the world); in no criterion |
| ORACLE | Shortest path on the true current graph | Privileged reference |

## Criteria

All on fresh worlds; mean [95% bootstrap interval] over worlds, paired by world.

| Criterion | Statistic | Rule |
|---|---|---|
| **V1** beats every fixed policy over the equal mix | For each fixed policy X ∈ {MBVI3, RECALL_003, RECALL_01, RECALL_03}: per-world sum over the three families of steps(X) − steps(VOL) | mean > 0 and lower bound > 0, **for all four** |
| **V2** safe where re-testing hurts | RARE: steps(VOL) − steps(MBVI3) | upper bound < 25 steps |
| **V3** helps where changes reverse | OFTEN: steps(MBVI3) − steps(VOL) | mean > 0 and lower bound > 0 |
| **V4** the rate is learned | VOL's final ρ, OFTEN minus RARE, per world | mean > 0 and lower bound > 0 |
| **V5** no regression | VOL − MBVI3 on E1 EXPLORED, E3, E1S EXPLORED, E2P PRE | every upper bound < 10 steps |
| **V6** infrastructure | Two in-process runs identical; all 164 tests pass | all |

| Verdict | Condition | Consequence, fixed now |
|---|---|---|
| SUPPORTED | V1–V6 | Adversarial review, then a proposal to the owner to make v6 the agent's model. Nothing changes in the agent before that decision |
| SUPPORTED WITH EXCEPTIONS | V1 holds; some of V2–V5 fail (listed) | Not adopted as it stands; the failing criterion names the next design question |
| NOT SUPPORTED | V1 fails | Not adopted. Learning the reversal rate within a run is recorded as not enough at this scale |
| INVALID | V6 fails | None |

**Why these criteria.** V1 is the capability claim: no single fixed policy can be best in every family, so an
agent that adapts should beat each of them over a mix of worlds. V2 and V3 say where the adaptation must show:
not paying for re-testing where changes stay, and gaining where they come back. V4 checks the mechanism, so a V1
pass cannot come from something other than learning the rate. The 25-step margin in V2 is about 2% of the
planner's total over a run in RARE (1,216 steps on dev).

## Statistical plan

| Item | Value |
|---|---|
| Domain / worlds | `gate6`; `cf|gate6|world|0…59`, never used before; 24 nodes, 30 edges, maximum degree 4 |
| Sample size | The rule n = max(20, ⌈(2.8·SD/mean)²⌉), capped at 60, on the dev differences of the hardest primary contrast (V1 against MBVI3: mean 68.5, SD 136.5) gives 32; V3 gives 31. **n = 60 (the cap)**, because the V1-against-MBVI3 contrast changes sign between worlds (VOL better in 11 of 20, worse in 9) |
| Smallest detectable effects (80% power, two-sided 5%, n = 60) | V1 against MBVI3: 2.8 × 136.5 / √60 ≈ **49 steps** (dev effect 68.5). V3: ≈ 34 steps (dev 48). V2: ≈ 7 steps |
| Unit and intervals | The world; percentile bootstrap, 10,000 resamples, 95% |
| Truncation | A capped episode counts its cap in every mean and median; capped episodes are counted per arm and family; VOL's count is printed beside the verdict |
| Robust summaries | Medians and per-world counts beside every mean |
| Multiplicity | Five pass/fail conditions plus V1's four parts, all required for SUPPORTED: conservative as a whole. Reported contrasts are uncorrected and cannot change the verdict |
| Reproducibility | Two in-process runs must give identical row hashes; HEAD is recorded at launch and at the end; wall-clock and memory are recorded outside the hashed rows |

## Reported (not pass/fail)

Every arm in every family: total, median, steps while blocked, after reversed and after permanent events, capped
episodes, events per run, work per decision. Every arm against VOL in every family. The HALF family. VOL against the
privileged reference told the true rate (the cost of having to learn the rate). VOL's final ρ per family and the ρ
trajectory over the run for ten worlds per family. Wall-clock per arm.

**Pre-declared expectations** (reported, not tested): V1 holds against the three RECALL rates by a wide margin and
against MBVI3 narrowly; V2 holds; V3 holds; V4 holds; VOL's learned ρ in OFTEN stays well below 0.9 because six
events per run is little evidence, so VOL trails RECALL_01 in OFTEN and trails the true-rate reference.

## Development-domain disclosure (`cf|dev|world|0…19`; observed before this specification was written)

From development scripts kept outside the repository (the admission look and the VOL look), 20 dev worlds, all three
families. VOL was run once on these worlds, with its a-priori constants; nothing was changed afterwards.

| Arm | RARE total | HALF total | OFTEN total | Equal-mix total |
|---|---|---|---|---|
| ORACLE | 1,134.8 | 991.5 | 761.9 | 2,888 |
| MBVI3 (never re-test) | 1,216.0 | 1,109.2 | 925.1 | 3,250 |
| RECALL 0.003 | 1,287.5 | 1,124.8 | 872.9 | 3,285 |
| RECALL 0.01 | 1,430.2 | 1,189.8 | 863.6 | 3,484 |
| RECALL 0.03 | 1,712.8 | 1,424.7 | 884.2 | 4,022 |
| **VOL** | **1,215.8** | **1,088.7** | **877.1** | **3,182** |
| VOL told the true rate | 1,215.5 | 1,090.6 | 865.5 | 3,172 |

| Contrast (dev) | Result |
|---|---|
| V1 parts: X − VOL over the mix | MBVI3 +68.5 (SD 136.5; VOL better in 11, worse in 9); RECALL 0.003 +103.4 (SD 100.9); RECALL 0.01 +301.9 (SD 164.6); RECALL 0.03 +840.0 (SD 625.7) |
| V2: RARE, VOL − MBVI3 | −0.1 [−8.9, 7.8] |
| V3: OFTEN, MBVI3 − VOL | +48.0 [11.1, 92.2] |
| V4: final ρ, OFTEN − RARE | +0.31 (SD 0.14), positive in 20 of 20 worlds. Mean final ρ: RARE 0.34, HALF 0.50, OFTEN 0.65 |
| OFTEN: VOL − RECALL 0.01 | +13.6 [−8.8, 40.0] (VOL slower: ρ learned only to 0.65) |
| Mix: VOL − VOL told the true rate | +10.1 (SD 43.1) |
| V5 battery (driver validation on dev worlds 0–7) | 0.0 on all four tasks: VOL behaves exactly as the planner there |
| Driver validation, dev worlds 0–7 (a subset of the 20 above, so not independent) | All five criteria held; V1 against MBVI3 +108.8 [20.4, 206.6]; V2 +2.1 [−12.4, 13.6]; V3 +98.0 [20.3, 185.8]; V4 +0.32 [0.23, 0.40]; deterministic; 164/164 tests; 0 capped episodes for VOL |
| Expected run time of the gate | About two hours (two in-process runs of 60 worlds × 3 families × 7 arms, plus the battery) |

## Things a reviewer should doubt

1. **V1 against the planner is the weak link.** On dev VOL was better in only 11 of 20 worlds on the mix; the gain
   comes mostly from OFTEN. A null on this part is a real possibility; the other three parts are not close.
2. **Six events per run is little evidence.** The learned rate moves the right way but not far (OFTEN 0.65 for a
   true 0.9). Carrying the learned rate from one world to the next (transfer) is the obvious extension and is not
   tested here.
3. **One kind of change.** Every change is a block on the route, with reversal after exactly 10 episodes. Changes
   of other kinds, other delays, and false alarms of the change detector are not modelled by the task.
4. **h = 0.01 is borrowed from CF-05b's tuning** of a different mechanism on a different task. It sets how soon
   the model expects a reversal; it is not learned.
5. **The families are chosen by the designer.** p = 0.1, 0.5, 0.9 bracket the CF-05b break-even (0.35), but the
   equal mix is one arbitrary weighting; per-family results are reported so other weightings can be read off.
