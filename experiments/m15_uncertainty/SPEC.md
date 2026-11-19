# M15 — Calibrated Adaptive Belief Tracking and Change Detection

**Status.** Frozen, 2026-11-19, on the owner's word "Freeze it", given to the freeze package as presented. The build
is commit `b692ed5`; this file, `PINS.json` and the admission record are hashed in `SPEC.sha256`.
- **How it got here:**
  - built on the owner's word "Approve M15 build", exactly as [PROPOSAL.md](PROPOSAL.md) revision 3.1 specifies,
    except for one disclosed correction and six clarifications (§ Deviations);
  - the development procedure has run (§ Development procedure);
  - a pre-freeze review was done on the owner's "Review first" (§ Pre-freeze review);
  - the BT-COND line was added on the owner's "GO: Prepare M15 for freeze" (§ Freeze preparation).
- **What follows:** the independent check is written and committed before the run, and the run happens once.
  Nothing is pushed without the owner's explicit word.
- **Unchanged:** `main.js`, the app, AD-13, world model v6, `env.mjs`, M13 and M14.

The driver refuses to run the study unless this line begins "Frozen" and every line of `SPEC.sha256` matches.

**Name.** "M15" is the owner's name; the capability under test is "Calibrated Adaptive Belief Tracking and Change
Detection". The folder is `experiments/m15_uncertainty/` because `experiments/m15/` is an earlier, unrelated record.

## Deviations from PROPOSAL revision 3.1 (decided before any development or gate label ran)

**D1 — the observation unit takes the FIRST occurrence of a kind, not the last (a correction).**
- **The conflict.** Revision 3.1 defines the observation for kind k as the successor of the **last** kind-k node of
  the loop-erased path (§ 2.1), and states that the route stream "is a direct draw of the environment's process θ*"
  (§ 4.1). Under NOISY both cannot hold.
- **Why.** Whether a step is the last kind-k step depends on the steps after it. A corrupted step that leads back to
  kind k, or to SIGMA^-1(k) (whose correct successor is k), stops being the last one. Corruptions are therefore
  under-sampled. Whether a step is the **first** kind-k step depends only on the steps before it (a stopping time), so
  its successor is an exact draw of θ*_k.
- **The evidence** ([spec_inputs/observation_unit.mjs](spec_inputs/observation_unit.mjs) →
  [.out](spec_inputs/observation_unit.out); exact enumeration, plus E7's own generator on 2,000 structure-only
  sequences `m15unc|unit|*`, with no agent and no development or gate label):

  | q | Last occurrence: P(SIGMA(k)) | First occurrence: P(SIGMA(k)) | θ* |
  |---|---|---|---|
  | 0.10 | 0.9433 | 0.9000 | 0.90 |
  | 0.25 (E7) | 0.8330 (generator: 0.8320) | 0.7500 (generator: 0.7507, SE 0.0013) | 0.75 |
  | 0.40 | 0.6950 | 0.6000 | 0.60 |

- **How it was found.** Six driver smoke labels (`m15unc|smoke|0..5`, a namespace the run refuses) showed UA's mean
  P(true value) under NOISY near 0.84, above the calculation's 0.80. The cause was then derived and confirmed with the
  enumeration above, before any development label ran.
- **What changes.** Only NOISY streams, and closed-loop paths with a repeated kind. Under exact relations every kind
  occurs once on a 4-hop route, so first and last coincide in STABLE, SPARSE and REVERSED. θ*, the probes, every
  threshold and every criterion are unchanged. Keeping "last" would have made BT3a and every NOISY calibration
  quantity measure the unit's selection bias, not the belief.

**Clarifications** (the proposal left these open; each is fixed here, before the development run):

| | Point | As implemented |
|---|---|---|
| C1 | A1's sign | The headroom H = CONCRETE − ORACLE steps (STABLE evaluation worlds 1–16), the sign of T. The proposal's table names the pair as "ORACLE − CONCRETE"; only this sign makes "lower > 0" meaningful |
| C2 | BT3a's interval | The cluster bootstrap of \|pooled mean P(true value) − 0.75\|, recomputed in every resample |
| C3 | The probe stream's "world" | The world's index t in the label's sequence (12..27): `<label>\|<condition>\|probe\|<t>\|<k>` |
| C4 | Detection | Checked before any post-switch observation (m = 0) and after every absorbed post-switch observation of the kind, up to m = 6; otherwise 7. The delay in worlds is checked at each post-switch world start and after the last world |
| C5 | n for cluster parts, and "effect" for upper-bound parts | se60 is the SD of the cluster-bootstrap resamples over the 60 development labels, scaled by sqrt(60/n). The effect of a part is the development estimate's distance from its threshold in the passing direction (so an upper-bound part's effect is threshold − estimate) |
| C6 | The closed-loop agent | A fresh adopted agent in every world (world model v6 cannot be carried: labels 1..24 recur with different nodes), with the belief carried across worlds. The agent stream is `<label>\|agent\|<t>` for every arm and condition (common random numbers), and the environment stream `<label>\|w\|<t>\|env` |

## Pre-freeze review (2026-11-19, on the owner's "Review first")

The review checked the code against this specification, and this specification against PROPOSAL revision 3.1. It
then probed what the pre-declared criteria measure on the development labels, which the development procedure had
already exposed: [spec_inputs/prefreeze_review.mjs](spec_inputs/prefreeze_review.mjs) →
[.out](spec_inputs/prefreeze_review.out), on `m15unc|dev|0..59` with w* = 2. Figures are quoted as that file prints
them. **No criterion, threshold or parameter was changed.**

**R1 — BT1's pooled ECE partly cancels opposite errors.** A pooled ECE can hide over- and underconfidence that share
a bin. UA is underconfident wherever the relation is exact, and overconfident under noise.

| UA, exact ECE (development) | ECE [95%] | Direction | Mean confidence | Exact accuracy |
|---|---|---|---|---|
| STABLE | 0.0824 (no spread) | underconfident | 0.9176 | 1.0000 |
| NOISY | 0.0937 [0.0895, 0.0979] | overconfident | 0.8097 | 0.7424 |
| SPARSE | 0.1945 (no spread) | underconfident | 0.8055 | 1.0000 |
| REVERSED before the switch | 0.0978 [0.0966, 0.0991] | underconfident | 0.9022 | 1.0000 |
| **Pooled (BT1's quantity)** | **0.0736** | | | |
| Point-weighted mean of the four | 0.1205 | | | |

- **The pooled figure is lower than every condition's own.** SPARSE alone is above 0.10.
- **The other rules:** FREQ's pooled ECE (0.0568) is lower than UA's. The originally specified h = 0.05 gives 0.1151
  pooled, and up to 0.2240 by condition.
- **Decision at the review.** BT1 stays as pre-declared, because the design calculation that set the hazard used the
  same pooled quantity, and a criterion changed after the development output had been seen would not be pre-declared.
  The profile was made a reported result, carried in the statement.
- **Owner's decision (2026-11-19, "GO: Prepare M15 for freeze").** BT1 stays unchanged. The condition-specific line
  BT-COND is added, explicitly labelled as added after development results were observed (§ Criteria, BT-COND). Its
  four results are mandatory, and a SPARSE failure prevents the unqualified full claim (§ Verdict).

**R2 — BT5 can only show "not overconfident".** SPARSE's relation is exact, so after one warm-up world NEWEST is
exactly right: overconfidence 0.0000, confidence 1.0000 at accuracy 1.0000. UA's overconfidence is −0.3958
(confidence 0.6042 at accuracy 1.0000).
- **What follows:** BT5a passes because UA is underconfident, and BT5b equals UA's underconfidence, not NEWEST's
  overconfidence.
- **Decision:** unchanged. The wording rule restricts what a BT5 pass may be called (§ Verdict).

**R3 — an omission, now fixed.** PROPOSAL § 2.4 says change uncertainty is reported as P(r_t ≤ 3); the first build
did not report it. It is now accumulated at every belief point and reported per scope. Development, UA (h = 0.05 in
brackets): STABLE 0.0152 (0.0760), NOISY 0.0524 (0.1781), SPARSE 0.2008 (0.2539), REVERSED before the switch 0.0154
(0.0768), post-switch observations 1–2 0.0688 (0.2498), post-switch observations 3–6 0.3113 (0.4645).

**R4 — the secondary stream is much noisier.** On CONCRETE's yoked stream, UA's mean P(true value) in NOISY is
0.5446, against 0.8080 on the route stream: 41.5% of CONCRETE's observations are detour steps. The closed-loop detour
shares are UA 0.080, NEWEST 0.090, FREQ 0.096, FROZEN 0.126 and ORACLE 0.037. These are reported only.

**R5 — the code review.** No defect was found. The checks covered:
- the conditions, windows, scopes, detection timing and tags;
- the probe streams and the scoring formulas;
- the bootstraps and the label order;
- the validity checks, the driver's refusals, the pins closure and the determinism digest.

The development procedure was re-run with the revised code, and it reproduced `admission.json` in every field except
its run time ([spec_inputs/admission_reproduction.out](spec_inputs/admission_reproduction.out)). The original record
is kept.

**Changes made at the review** (none touches a criterion, a threshold, a parameter or a verdict line):
- P(r_t ≤ 3) is accumulated and reported (R3);
- the calibration profile is reported, with intervals, for UA and UA_h05 (R1);
- the statement carries the profile clause (R1);
- the wording rule for BT5 is added (R2);
- the tests assert both additions;
- the run-time estimate is corrected.

**What the SPARSE result reflects** (stated without choosing between explanations that M15 cannot separate):
- **Ruled out: sampling or probe noise.** The exact ECE uses no samples, the one-hot θ* makes the probes
  deterministic, and every label sees the same exact SPARSE stream (zero width).
- **A minor contributor only: the change layer.** It adds 0.0075 (UA 0.1945 against FREQ and WINDOW 0.1870).
- **Accounts for the whole figure: too little evidence under the fixed prior.** A closed-form calculation (an exact
  formula, no simulation) of mean(1 − confidence) over n = 1..16 clean observations gives exactly FREQ 0.1870 and
  UA 0.1945. SPARSE points with n ≥ 12 score the same as STABLE's points at the same n.
- **Partly a limit of the measure.** The θ*-based ECE scores a belief that includes legitimate uncertainty about what
  it has not yet seen against a deterministic truth. Each condition's ECE therefore mostly reflects the range of n it
  covers: STABLE's own first five worlds score 0.1033.
- **Plausible but untested: a capability limit.** The component cannot learn that relations in this family are exact
  (its prior is fixed). Only α ≤ about 0.2 would bring SPARSE below 0.10.

## Freeze preparation (2026-11-19, on the owner's "GO: Prepare M15 for freeze")

**What was added**, all labelled in the code and here as added after development results were observed:
- **The BT-COND line** (§ Criteria), with its statistical treatment and its development prediction;
- **the statement rules** that keep a pooled pass apart from calibration across conditions (§ Verdict);
- **the validity part `conditionResults`**, so a result without all four condition results is INVALID.

**What was not changed:**
- **BT1 and every other original criterion, threshold and parameter.** No line of the original criteria table
  changed.
- **The admission record.** BT-COND is not part of the power rule (§ Criteria, BT-COND), so w*, the margin and n
  stand. The development procedure was re-run with the final code, and it still reproduces `admission.json`
  (§ Freeze consistency).

## Question

When the relationship between kinds is unchanged, are the agent's probabilities about each kind's next kind accurate
and calibrated against the environment's true distribution? After an unannounced change, does the belief switch
within a few observations without mistaking scattered noise for a change? And does an agent that breaks exact
planner ties by that belief (certainty-equivalently) avoid harm from noisy or thin evidence and recover after a change?

| | Hypothesis | Tested in |
|---|---|---|
| **H-BT** calibrated belief tracking | Under no change, probabilities are accurate and calibrated against θ*, lower where the relation is less reliable or the evidence thinner, and no more confident than the evidence warrants | Passive replay; exact θ*; probes |
| **H-CD** change detection | After a change the belief switches within a few observations, far sooner than counting; it rarely switches under scattered noise, far more rarely than trusting the newest observation; its post-change probabilities recover | Passive replay |
| **H-ACT** active behaviour (separate) | Breaking ties by the belief is not harmed by noisy or thin evidence, and recovers after a change sooner than prior-trusting and counting agents | Closed loop |

Asked but not claimed: is the Bayesian change-point mechanism better than a tuned window rule (MECH)? The design
calculation predicts no difference.

## What runs

Every part except task E7, the relational belief and the M15 evaluation files is existing code, used unchanged.

| Part | What it is |
|---|---|
| **Worlds** | `generateWorld(<label>\|w\|<t>)`, t = 0..27, with its hidden relabelling, unchanged. Each world has one unique shortest start–goal route of 4 hops (`planRoute`, E6, unchanged) |
| **Task E7** (`cognitive/testbed/task_e7.mjs`, new) | 12 warm-up worlds (t = 0..11) and 16 evaluation worlds (t = 12..27; e = 0..15). Phase (the route's first kind) from `<world label>\|phase`. Exact kinds: E6's `signpostKinds` with SIGMA (warm-up and STABLE, SPARSE, NOISY warm-up, REVERSED before the switch) or SIGMA^-1 (REVERSED from e = s). NOISY kinds: each route step draws twice from `<world label>\|noisy\|noise` (corrupt with probability q = 0.25; which of the 3 other kinds), the chain continues from the realised kind; off-route neighbours avoid the realised successor kind; each corrupted step's node gets one off-route decoy neighbour of kind SIGMA(k) where allowed (`\|decoy` stream); other nodes uniform over allowed kinds. s = 2 + randInt(9) from `<label>\|switch` |
| **Conditions** | STABLE; NOISY (evaluation worlds noisy); REVERSED (SIGMA through evaluation world s, SIGMA^-1 from e = s; post-switch index e − s); SPARSE (warm-up = world 11 only). All four share worlds, routes, phases and noise positions; only the kinds differ |
| **θ\*** | STABLE, SPARSE and REVERSED before the switch: one-hot at SIGMA(k). NOISY evaluation: 0.75 at SIGMA(k), 0.25/3 elsewhere. REVERSED from e = s: one-hot at SIGMA^-1(k). Evaluation information only |
| **The agent** | AD-13's adopted agent (VOL_RHO, rhoFixed 0.5, h = 0.01 for exits), through M14's tie-break agent `cognitive/mind/schema/agent.mjs`, unchanged. Only among exits tied exactly at the highest planner value, it keeps those whose kind has the highest p_k(kind), and breaks remaining ties by the same random draw. With no belief, or a uniform one, it is the adopted agent draw for draw (tested) |
| **Relational belief** (`cognitive/mind/relation_belief/belief.mjs`, new, pure) | One belief per kind over the next kind (K = 4): FREQ (Dirichlet α = ½), NEWEST, WINDOW w, BOCPD (Adams & MacKay Algorithm 1, hazard h, Dirichlet α, prune below 1e-12), FIXED (the privileged ORACLE, set to θ* per world). A frozen belief throws if asked to observe. Equations: PROPOSAL § 2.3–2.5, implemented verbatim; the module reproduces the proposal's detection-delay table exactly (tested) |
| **Observation unit** | One episode per world. If it reaches the goal: loop-erase the path; for each kind, the successor of the **first** kind-k node (D1). At most one observation per kind per world |
| **Belief agent** (`cognitive/mind/relation_belief/agent.mjs`, new) | An adapter: M14's agent with score(k, j) = p_k(j), learning through the observation unit after a successful episode when `learn` is true |

**Arms.**

| Evaluation | Arms |
|---|---|
| Passive replay | FREQ, FROZEN (FREQ frozen at the first evaluation world), NEWEST, WINDOW (w*), **UA** (BOCPD h = 0.01, α = ½); sensitivity UA_a1 (α = 1), UA_h02, UA_h05, UA_h15 (h = 0.02, 0.05, 0.15); ORACLE (θ*) |
| Closed loop | CONCRETE (the adopted agent, no belief), FROZEN, FREQ, NEWEST, WINDOW (w*), **UA**; ORACLE (privileged) |

**Two streams for passive replay**, both identical for every mechanism: the **route stream** (the observation unit
applied to each world's route under the condition's kinds; policy-free; primary) and the **yoked stream**
(CONCRETE's own closed-loop observations; secondary, reported only).

**Belief points.** At the start of every evaluation world, before that world's observations are absorbed, every
mechanism's p_k is recorded for every kind k. Each point is scored exactly against θ*_k and against **64 probe
outcomes** drawn once from θ*_k with the stream `<label>|<condition>|probe|<t>|<k>`, identical for every mechanism and
arm, and never passed to any belief (a check re-runs replay with other probe outcomes and requires identical
beliefs).

**Closed loop.** Every arm runs every world of every condition, one episode per world, cap 200 steps; the belief is
carried from world to world. Steps of a capped episode count as 200. The closed-loop beliefs and on-policy
prequential scores are diagnostics only, never compared between arms.

## Fixed in advance

| Parameter | Value |
|---|---|
| α | ½ (analytic) |
| h (UA) | **0.01, development-selected** (PROPOSAL § 2.5): chosen after the design calculation showed h = 0.05 to be underconfident. h = 0.05 is the disclosed sensitivity arm, the test of the original specification |
| Sensitivity arms | α = 1 (h = 0.01); h = 0.02, 0.05, 0.15 (α = ½). Reported, never used to choose |
| Probes | P = 64 per kind per evaluation world |
| Window grid | w ∈ {2, 3, 4}; w* chosen on development labels (§ Development procedure) |
| Task | q = 0.25; s uniform on {2, …, 10}; 12 warm-up worlds (1 in SPARSE), 16 evaluation worlds; 4-hop routes; cap 200 |
| Log score floor | p floored at 1e-6 |
| ECE bins | 10 equal-width bins: bin b holds b/10 ≤ c < (b+1)/10 for b = 0..8, and 0.9 ≤ c ≤ 1 for b = 9; empty bins omitted |
| Detection | delay censored at 7 if not detected within 6 post-switch observations |
| Bootstrap | B = 10,000; percentiles sorted[250] and sorted[9749] |
| Stats tags | `m15unc|stats|m15|<name>` (sensitivity arms: `<name>|<arm>`) |
| Label order | numeric (by the trailing index), in the driver and in any check |
| Labels | `m15unc|gate|0..n−1`; n, w* and the margin from `admission/admission.json` |

## Metrics

Every metric is reported per mechanism, per stream and per scope: STABLE, NOISY, SPARSE, SPARSE worlds 1–3, REVERSED
before the switch, post-switch observations 1–2 (belief points with 0 or 1 post-switch observations of the kind
absorbed), post-switch observations 3–6 (2 to 5 absorbed), and all post-switch. **No-change phases** = STABLE, NOISY,
SPARSE and REVERSED before the switch.

| Metric | Definition (per belief point p, θ = θ*_k) |
|---|---|
| Expected correctness a | the mean of θ over the top set T = argmax p (exact accuracy = its mean) |
| Expected Brier (primary) | Σ_y θ_y Σ_j (p_j − 1[j = y])² |
| Expected log score | −Σ_y θ_y log max(p_y, 1e-6) |
| Probe Brier, log score, accuracy (reported) | the means over the 64 probe outcomes; a tie in the top set counts 1/\|T\| |
| Confidence c | max_j p_j |
| ECE | Σ_b (n_b/N) \|correctness_b − conf_b\|; direction = the sign of Σ_b (n_b/N)(correctness_b − conf_b), positive = underconfident. **Exact (primary):** correctness = a, every point weighs 1. **Empirical:** correctness = the probe indicator, every probe outcome weighs 1. **Sensitivity:** 10 equal-mass groups of points (point estimate), and class-wise ECE over all K probabilities against θ_j |
| AUROC | of c for probe correctness, ties at average ranks (a probe outcome in a tied top set counts 1/\|T\| correct) |
| P(true value) | p at argmax θ (unique) |
| Overconfidence | mean c − mean a |
| Detection delay | REVERSED, per kind: post-switch observations absorbed before the unique most probable value first equals SIGMA^-1(k) (C4); 7 if not within 6. Per label: the mean of the four kinds. Also in worlds, and its slope on s (reported) |
| Detection rate | share of kinds with delay ≤ 6 |
| False alarm | in a no-change phase, a point whose unique most probable value is not argmax θ; rate = false alarms / points with a unique most probable value |
| Behaviour | mean steps per world over: STABLE and NOISY evaluation worlds 1–16; REVERSED post-switch worlds 1–6; SPARSE evaluation worlds 1–3 |
| Change uncertainty (reported) | mean P(r_t ≤ 3) of a BOCPD belief at its belief points, per scope (PROPOSAL § 2.4) |
| Calibration by condition (mandatory; BT-COND) | UA's exact top-1 ECE in each no-change condition (STABLE, NOISY, SPARSE, REVERSED before the switch), with its direction, mean confidence, exact accuracy, 95% cluster-bootstrap interval, family lower bound and classification; the point-weighted mean of the four; BT1's pooled value beside it. The same is reported for UA_h05 |

## Criteria

Each passes only if its 95% bound satisfies the inequality strictly. Paired parts take one value per label (the
contrast of per-label means) through `pairedBootstrap`; cluster parts recompute the pooled quantity in every
resample of labels (paired between mechanisms within a resample). Passive parts use the route stream.

| Part | Line | Quantity | Interval | Passes when |
|---|---|---|---|---|
| T | T | STABLE steps: CONCRETE − UA | paired | lower > 0 |
| BT1 | BT | exact top-1 ECE, no-change phases (UA) | cluster | upper < 0.10 |
| BT2a | BT | exact Brier, no-change phases: NEWEST − UA | paired | lower > 0 |
| BT2b | BT | exact ECE, no-change phases: NEWEST − UA | cluster | lower > 0 |
| BT3a | BT | \|mean P(true value) − 0.75\|, NOISY (C2) | cluster | upper < 0.10 |
| BT3b | BT | mean P(true value): STABLE − NOISY (UA) | paired | lower > 0 |
| BT3c | BT | AUROC, no-change phases (UA) | cluster | lower > 0.5 |
| BT4 | BT | exact Brier, no-change phases: UA − FREQ | paired | upper < 0.05 |
| BT5a | BT | overconfidence, SPARSE worlds 1–3 (UA) | cluster | upper < 0.10 |
| BT5b | BT | overconfidence, SPARSE worlds 1–3: NEWEST − UA | cluster | lower > 0 |
| CD1a | CD | detection delay: FREQ − UA | paired | lower > 0 |
| CD1b | CD | UA detection rate | cluster | lower > 0.75 |
| CD2a | CD | UA false-alarm rate, no-change phases | cluster | upper < 0.10 |
| CD2b | CD | false-alarm rate, NOISY: NEWEST − UA | cluster | lower > 0 |
| CD3a | CD | exact Brier, post-switch observations 3–6: FREQ − UA | paired | lower > 0 |
| CD3b | CD | exact Brier, post-switch observations 3–6: FROZEN − UA | paired | lower > 0 |
| ACT1a | ACT | NOISY steps: UA − CONCRETE | paired | upper < margin |
| ACT1b | ACT | NOISY steps: NEWEST − UA | paired | lower > 0 |
| ACT2a | ACT | post-switch worlds 1–6 steps: FROZEN − UA | paired | lower > 0 |
| ACT2b | ACT | post-switch worlds 1–6 steps: FREQ − UA | paired | lower > 0 |
| ACT3 | ACT | SPARSE worlds 1–3 steps: UA − CONCRETE | paired | upper < margin |
| MECH-a | MECH | exact Brier, every evaluation point, conditions weighted equally: WINDOW − UA | paired | lower > 0 |
| MECH-b | MECH | detection delay: UA − WINDOW | paired | upper < 1 |
| MECH-c | MECH | false-alarm rate, no-change phases: WINDOW − UA | cluster | lower > 0 |

The BT block is also computed, and reported, for each sensitivity arm in place of UA. The behaviour contrasts
WINDOW − UA (NOISY, post-switch) are reported with MECH.

### BT-COND — calibration in each no-change condition

> **Added after development results were observed.** It was added at the pre-freeze review and the freeze preparation
> on 2026-11-19, after UA's development calibration by condition had been seen (§ Pre-freeze review, R1). It is
> **not** part of the original pre-declaration. BT1 above is unchanged. BT-COND is declared here, and hashed at the
> freeze, before any gate label is accessed. Its threshold, 0.10, is BT1's own; it was not chosen from development
> data.

| Part | Quantity (UA, route stream) | Interval | PASS when | MATERIAL FAIL when | Otherwise |
|---|---|---|---|---|---|
| BT-COND STABLE | exact top-1 ECE over STABLE's belief points | cluster bootstrap, tag `m15unc|stats|m15|BTCOND|STABLE` | 95% upper bound (sorted[9749]) < 0.10 | family lower bound (sorted[62], the 0.625th percentile) ≥ 0.10 | INCONCLUSIVE |
| BT-COND NOISY | the same over NOISY's | `…|BTCOND|NOISY` | as above | as above | INCONCLUSIVE |
| BT-COND SPARSE | the same over SPARSE's | `…|BTCOND|SPARSE` | as above | as above | INCONCLUSIVE |
| BT-COND REVERSED before the switch | the same over REVERSED's pre-switch points | `…|BTCOND|REV_PRE` | as above | as above | INCONCLUSIVE |

**The line.** "Calibration across conditions" reads **SHOWN only if all four parts are PASS**; otherwise it reads NOT
SHOWN and names every part that is not PASS. A condition with no belief point is MISSING, and then the run is INVALID
(the validity part `conditionResults`), so all four results are always present.

**The four results are mandatory.** Every statement lists all four (ECE, 95% interval, direction and classification)
beside BT1's pooled value and the point-weighted mean. The result file stores them under `btCond`.

**Statistical treatment.**

| Conclusion | Rule | Error control |
|---|---|---|
| A false PASS in a condition (its ECE is in fact ≥ 0.10) | the one-sided 97.5% upper bound must be below 0.10 | at most 2.5% per condition |
| A false "calibration across conditions SHOWN" | all four PASS (intersection-union test) | at most 2.5% in total, with no multiplicity correction needed |
| A false MATERIAL FAIL in a condition (its ECE is in fact < 0.10) | the lower bound at the 0.625th percentile (one-sided 2.5% / 4, Bonferroni) must be ≥ 0.10 | at most 2.5% familywise over the four conditions |
| INCONCLUSIVE | neither bound clears 0.10 | no claim either way; it still prevents SHOWN |

- **Conditions without spread.** In STABLE and SPARSE every label sees the same exact stream, so the bootstrap has no
  spread. Their values are exact consequences of the update rule, not estimates, and their classification is
  certain.
- **Power.** BT-COND is not in the power rule: a part predicted to fail cannot be powered, and adding it would only
  push n to 600. At n = 165 it is predicted, from development, to read NOT SHOWN with near certainty (§ Development
  procedure). It is a disclosure line, not a test UA is expected to pass.
- **Related, but no criterion.** BT-COND is also computed and reported for UA_h05.

## Verdict

| Line | Reads |
|---|---|
| Validity | VALID iff all of: determinism (run A = run B, every label's full record); the suite (`scripts/test_discover.mjs`); V-REV (route and yoked streams, and closed-loop runs, identical between REVERSED and STABLE through evaluation world s, and every non-privileged belief identical at the start of e = s); CONCRETE identical across conditions; no exclusion; frozen beliefs unchanged; probe isolation; identity (every belief arm equals CONCRETE in the first world of every condition, and every absorbed observation equals the path's); conditionResults (all four BT-COND results present; added at the freeze preparation) |
| Transfer (prerequisite) | SHOWN iff T passes. If not, Active behaviour reads NOT INTERPRETABLE |
| Calibrated belief tracking (pooled; as originally declared) | SHOWN iff BT1–BT5 all pass |
| Calibration across conditions (BT-COND; added after development results were observed) | SHOWN iff all four BT-COND parts are PASS |
| Change detection | SHOWN iff CD1–CD3 all pass |
| Active behaviour | SHOWN iff ACT1–ACT3 all pass |
| Bayesian advantage over a tuned window rule | SHOWN iff MECH-a, b and c all pass. Predicted NOT SHOWN |

**Statement (wording rule).** Written by `readingRule` (`m15_analysis.mjs`); [C] marks text added at the freeze
preparation. "(+ IN CLOSED-LOOP BEHAVIOUR)" is added only if Active behaviour reads SHOWN.

| Belief tracking (pooled, BT) | Change detection (CD) | Calibration across conditions (BT-COND) | The statement opens |
|---|---|---|---|
| SHOWN | SHOWN | SHOWN | "CALIBRATED ADAPTIVE BELIEF TRACKING AND CHANGE DETECTION SHOWN, with a development-selected hazard (h = 0.01)" (+ IN CLOSED-LOOP BEHAVIOUR). The only case allowing the full capability name |
| SHOWN | SHOWN | NOT SHOWN | [C] "POOLED CALIBRATION AND CHANGE DETECTION SHOWN (development-selected h = 0.01)" (+ IN CLOSED-LOOP BEHAVIOUR) "; CALIBRATION ACROSS CONDITIONS NOT SHOWN: …", naming each part that is not PASS: "UA materially underconfident in SPARSE (ECE x)" for a MATERIAL FAIL (with its direction), "NOISY inconclusive (ECE x [lo, hi])" for an INCONCLUSIVE part. **This is the development prediction** |
| any other combination | | | [C] each line as it reads: "POOLED CALIBRATED BELIEF TRACKING (BT, development-selected hazard h = 0.01): SHOWN / NOT SHOWN; CALIBRATION ACROSS CONDITIONS: SHOWN / NOT SHOWN: …; CHANGE DETECTION: …; ACTIVE BEHAVIOUR: …" |

Then, in every valid statement:
- "Bayesian change-point inference outperforms a tuned window rule" only if MECH reads SHOWN; otherwise "change
  detection not distinguished from a tuned window rule".
- The originally specified h = 0.05 arm's BT parts: how many passed, and which failed.
- [C] Always, all four condition results: "BT1 pools the no-change conditions (pooled exact ECE x); UA's exact ECE by
  condition (BT-COND, threshold 0.10): STABLE x [lo, hi] direction, classification; NOISY …; SPARSE …; REVERSED
  before the switch …; point-weighted mean x", rounded to 3 decimals from the stored values.

**What may and may not be written:**
- **A pooled pass is not cross-condition calibration.** A BT1 pass, or a pooled BT line, is described as "pooled
  calibration" ("pooled over the no-change phases"). It is never described as calibration in each condition, or
  across STABLE, NOISY, SPARSE and REVERSED. That needs BT-COND SHOWN.
- **No claim across all tested conditions if any condition materially fails.** "Calibrated belief tracking across
  conditions", the unqualified full name, and any equivalent wording are not written unless BT-COND reads SHOWN.
- **A SPARSE MATERIAL FAIL** is reported with the explanations in § Pre-freeze review ("What the SPARSE result
  reflects"). It is never described as a defect of the change detector, and never explained away as noise.
- A BT5 pass is described only as "not overconfident on thin evidence", never as better calibrated than NEWEST on
  thin evidence (R2).
- **The yoked stream** is reported separately from the route stream, and never pooled with it or used for a BT, CD or
  BT-COND conclusion (R4).
- A BT pass at h = 0.01 is never called independent confirmation of the original hypothesis.
- Never claimed, whatever the result: uncertainty-aware decision-making, confidence-aware exploration, metacognition.
- If INVALID: "INVALID — NO CRITERION IS INTERPRETED".

## Development procedure (done, development labels only)

`admission/admission.mjs` → `admission.json` (SHA-256 `32c1882e…07d4`) and `admission.out` ran on 2026-11-18/19 on
`m15unc|dev|0..59` (none excluded), with every arm and mechanism and the window grid {2, 3, 4}, in 187 s. Every
parameter, threshold and the evaluation code were fixed before it ran, and nothing was changed after its output was
seen.

| Quantity | Value |
|---|---|
| w* (WINDOW's own exact Brier, all evaluation points, conditions weighted equally; ties to the larger w) | **2** (w = 2: 0.1960; w = 3: 0.2121; w = 4: 0.2308) |
| Headroom H = CONCRETE − ORACLE, STABLE evaluation worlds 1–16 | 30.27 [29.01, 31.56] steps, SD 5.07; 60 labels for, 0 against |
| Margin, ceil(H / 4) | **8 steps** |
| n (98% power per part at half the development effect, clamped to [165, 600]) | **165**: the floor; the part needing most is BT3a, with 45 |
| MDE at n = 165 (80% power, two-sided 5%) | 1.11 steps; twice that is 2.21 |
| A1: H's lower bound > 0, and H ≥ 2 × MDE | holds |
| A2: (a) FROZEN − ORACLE post-switch steps; (b) NEWEST − FREQ false-alarm rate in NOISY (passive) | (a) 38.63 [37.10, 40.10]; (b) 0.229 [0.213, 0.245]: holds |
| A3: identity, absorbed = path, CONCRETE passive, V-REV (passive and closed loop), probe isolation, frozen beliefs unchanged | all hold on all 60 labels |
| A4: FREQ's closed-loop observations per kind after the warm-up; per kind per post-switch world | 11.90 (≥ 8); 0.94 (≥ 0.5): holds |
| **Admission** | **ADMITTED** |

**UA's development values** were used only for the spreads that set n, and are disclosed here because they were seen.
Every part of T, BT, CD and ACT is on its passing side, most by a wide margin:

| Part | Development estimate | Part | Development estimate |
|---|---|---|---|
| T | 30.27 steps | CD1a | 4 (no spread: UA 3, FREQ censored at 7, on every label) |
| BT1 | 0.0736 (calculation: 0.076) | CD1b | 1 (no spread) |
| BT2a | 0.0830 | CD2a | 0.0034 |
| BT2b | 0.0448 | CD2b | 0.2172 |
| BT3a | 0.0580 | CD3a | 1.0314 |
| BT3b | 0.1096 | CD3b | 1.4391 |
| BT3c | 0.7008 | ACT1a | −15.53 steps (margin 8) |
| BT4 | 0.0035 | ACT1b | 8.21 steps |
| BT5a | −0.3958 (no spread: UA is underconfident after one warm-up world) | ACT2a | 11.12 steps |
| BT5b | 0.3958 (no spread) | ACT2b | 9.76 steps |
| | | ACT3 | −23.83 steps (margin 8) |

**MECH** (not powered): MECH-a WINDOW − UA exact Brier −0.0053 [−0.0067, −0.0039] (the tuned window is better);
MECH-b UA − WINDOW delay 1 with no spread (UA detects one observation after w = 2 on every label); MECH-c
WINDOW − UA false-alarm rate +0.0072 [0.0048, 0.0099].

**BT-COND at development** (§ Pre-freeze review, R1; 95% intervals from the review probe):

| Condition | ECE [95%] | Direction | Predicted classification |
|---|---|---|---|
| STABLE | 0.0824 (no spread) | underconfident | PASS (certain) |
| NOISY | 0.0937 [0.0895, 0.0979] | overconfident | PASS (the projected upper bound at n = 165 is about 0.096) |
| SPARSE | 0.1945 (no spread) | underconfident | MATERIAL FAIL (certain) |
| REVERSED before the switch | 0.0978 [0.0966, 0.0991] | underconfident | PASS, narrowly (the projected upper bound is about 0.099) |

So "calibration across conditions" is predicted NOT SHOWN. The predicted statement opens "POOLED CALIBRATION AND
CHANGE DETECTION SHOWN (development-selected h = 0.01), IN CLOSED-LOOP BEHAVIOUR; CALIBRATION ACROSS CONDITIONS NOT
SHOWN: UA materially underconfident in SPARSE (ECE 0.195)".

**What this means for the run, stated before the freeze.**
- **The passive lines are close to determined.** At n = 165, every T, BT, CD and ACT part has a predicted power
  above 0.9999 at half its development effect. Several parts have no spread at all on the route stream.
- **The full capability name is predicted not to be writable,** because SPARSE fails BT-COND.
- **MECH is predicted NOT SHOWN.** Parts a and b are on their failing side at development, and b fails on every label.
- **What the run adds is limited** (PROPOSAL § 8): it repeats a largely predicted outcome on fresh labels. Its
  information is mainly in the closed-loop lines, and in any departure of the gate from development.

## Leakage prevention

- **Probes never reach a belief.** They are drawn by the evaluator after the belief point is recorded, from streams
  no agent or belief reads; a per-label check re-runs replay with other outcomes and requires identical beliefs.
- **θ\* reaches only ORACLE**, which is privileged and in no criterion except as the admission reference.
- **Beliefs see only observations** from the observation unit. The belief module imports nothing; the agent adapter
  imports only the belief module and M14's agent; both use no forbidden API (tested).
- **Frozen means frozen.** FROZEN's belief is hashed at the freeze and at the end, in every stream and in the closed
  loop; a frozen belief throws if asked to observe.
- **Namespaces.** The run accepts only `m15unc|gate|<i>`. Development (`dev`), smoke (`smoke`), test (`test`) and the
  structure-only unit check (`unit`) are refused.

## Integrity

- **Run once,** with `node experiments/m15_uncertainty/run_m15.mjs --domain m15`. The driver refuses if: this file is
  not Frozen; a line of `SPEC.sha256` (SPEC.md, PINS.json, admission/admission.json) does not match; a file differs
  from `PINS.json` (the import closure, the admission record and the test runners); `cognitive/`, `scripts/` or this
  folder has an uncommitted change; the admission record does not admit the task or fix w*, the margin and n; a label
  is not fresh; the suite fails; a result exists.
- **Determinism.** Run A and run B run everything; every label's full in-memory record (closed loop, both streams,
  every scope's sums, every point's scores) must hash identically.
- **Recorded with the result:** HEAD at launch and at the end; the hashes of this file, the pins and the admission
  record; Node version and platform; the test result; the hashes of `main.js`, `index.html`, `connections.json` and
  `neurons.json`; every criterion with its per-label values; the reported metrics; the closed-loop steps of every
  label. Passive belief points are not stored (about 40 MB): they are a pure function of the label and are recomputed
  by the independent check.
- **The independent check** (`results/check/verify_m15.mjs`) is written after the freeze and before the run, with its
  own beliefs, scoring and bootstrap code, sharing only the generator, the task, `makeStream` and `pairedBootstrap`
  (as M14's did).
- **Nothing is tuned after the run.** RESULTS.md is written whatever the outcome; figures are rounded only from stored
  full-precision values; corrections are dated amendments.
- **The test suite.** `scripts/test.mjs` (pinned by M13) and `scripts/test_all.mjs` (pinned by M14) are unchanged.
  `scripts/test_discover.mjs` runs every `cognitive/tests/test_*.mjs` by discovery (`cognitive/tests/run_discover.mjs`),
  including `test_m15_belief.mjs` (17 tests); a test checks that discovery covers every file the older runners run.
- **Looks before the freeze (disclosed):**
  - `m15unc|test|0..9`: the regression tests (sequences, beliefs, one full label record on `test|0`).
  - `m15unc|smoke|0..5`: two library smoke runs during the build, which printed every criterion (they revealed D1).
  - `m15unc|unit|0..1999`: structure only (D1's evidence).
  - `m15unc|dev|0..59`: the development procedure, every arm, with UA's values seen (§ Development procedure).
  - A two-label driver smoke run (`m15unc|smoke|0..1`), which printed no measure.
  - The pre-freeze review: development labels `m15unc|dev|0..11` in a scratch probe, then `0..59` in the lodged
    probe; and a re-run of the development procedure, which reproduced `admission.json`.
  - The freeze preparation:
    - the review probe re-run (byte-identical output);
    - a second re-run of the development procedure with the final code;
    - the freeze consistency check, which runs two test-namespace labels (`m15unc|test|0..1`).
  - Nothing was changed after the development output was seen.
  - No agent has run on a gate label, and no gate label has been planned.

## What it can and cannot show

**If the lines pass, it shows:**
- **Pooled tracking (BT):** on signposted worlds, the adopted agent's relational belief, built from observations,
  tracks a learned relation's reliability with probabilities whose **pooled** calibration over the no-change phases
  is within 0.10 of the exact θ*, and which track noise and separate correct from incorrect probe outcomes (with a
  development-selected hazard).
- **Across conditions (BT-COND):** only if BT-COND reads SHOWN are they calibrated within 0.10 in each of STABLE,
  NOISY, SPARSE and REVERSED.
- **Change detection (CD):** it detects an unannounced change within a few observations while rarely mistaking
  scattered noise for one.
- **Behaviour (ACT):** acting certainty-equivalently, the agent is not harmed by noisy or thin evidence and recovers
  after a change.

**It does not show:** uncertainty-aware decision-making, confidence-aware exploration or metacognition; that
Bayesian change-point inference beats a tuned window rule (predicted not to); learning of the hazard or the noise
level; robustness to biased noise, repeated changes, gradual drift or other change patterns; role discovery (kinds are
given); generality beyond this task family; anything confirmatory (one run, by the designer, on local commits).

**Known residual issues.** The inference outcome is largely predicted by the formulas (PROPOSAL § 2.7, § 8).
Closed-loop evidence carries detour steps, which is why inference is judged in passive replay. Equal-width bins can
be thin at low confidence; bin counts and the equal-mass sensitivity are published. Several BT and CD parts are
nearly deterministic on the route stream (for example, under SPARSE every label sees the same exact observations), so
their intervals can be degenerate. UA is underconfident wherever the relation is exact and mildly overconfident
under noise; the pooled BT1 partly cancels the two (R1), which is why BT-COND and its mandatory results exist.

## Consequence

None for AD-13 or the agent. M15 builds and verifies a calibrated, change-aware belief component that a later,
separate milestone on uncertainty-guided action would need.

## Run

**Time:** about 3.5 s per label per run with one window size, so about 20 minutes for runs A and B at n = 165, plus
about 5 minutes for the suite (224 tests).

**Prepared for the freeze** (working tree, uncommitted):
- `.gitattributes` has the line `experiments/m15_uncertainty/** -text`, so the hashed files keep their bytes;
- `PINS.json` is written (45 files) and matches;
- `spec_inputs/freeze_consistency.out` records the consistency check.

**To freeze** (on the owner's confirmation only):
1. Set the status line to "**Status.** Frozen", with the date and the owner's word. The rest of the status block is
   updated to say so; nothing else in this file changes.
2. Re-check `PINS.json` (`pins.mjs --check`).
3. Write `SPEC.sha256` with lines for SPEC.md, PINS.json and admission/admission.json.
4. Re-run the consistency check, which then verifies the Frozen status against `SPEC.sha256`.
5. Commit (no push).
6. Write the independent check; commit it.
7. Run once.

## Files

| File | Role |
|---|---|
| `SPEC.md`, `SPEC.sha256` | This specification and its frozen hashes |
| `PROPOSAL.md`, `proposal_inputs/` | The approved design (revision 3.1) and its calculation |
| `spec_inputs/observation_unit.mjs`, `.out` | D1's evidence |
| `spec_inputs/prefreeze_review.mjs`, `.out` | The pre-freeze review's probe on development labels (R1–R4) |
| `spec_inputs/admission_reproduction.out` | The development procedure re-run with the revised code, and again with the final code: identical except its run time |
| `spec_inputs/freeze_consistency.mjs`, `.out` | The freeze consistency check: specification, code, thresholds, parameters and admission evidence |
| `cognitive/testbed/task_e7.mjs` | Task E7: sequences, noisy kinds, conditions, θ* |
| `cognitive/mind/relation_belief/belief.mjs`, `agent.mjs` | The belief rules, the observation unit, the agent adapter |
| `m15_lib.mjs` | Configuration, probes, scoring, passive replay, closed loop, one label, validity checks |
| `m15_analysis.mjs` | Bootstraps, criteria, BT-COND, reported metrics, reading rule |
| `run_m15.mjs` | The driver and its refusal checks |
| `pins.mjs`, `PINS.json` | The pinned files and their hashes |
| `admission/admission.mjs` → `admission.json`, `.out` | The development procedure |
| `cognitive/tests/test_m15_belief.mjs`, `cognitive/tests/run_discover.mjs`, `scripts/test_discover.mjs` | Regression tests and the discovery runner |
