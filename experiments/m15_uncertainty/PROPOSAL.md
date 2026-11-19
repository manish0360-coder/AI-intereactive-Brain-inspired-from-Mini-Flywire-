# M15 — Calibrated Adaptive Belief Tracking and Change Detection: final proposal (revision 3.1)

**Status.** PROPOSAL, revision 3.1, 2026-11-18, for the owner's approval.
- **Revision 3** was the final, bounded revision, made after the independent falsification review the owner
  accepted.
- **Revision 3.1** adds only the owner's two targeted clarifications: calibration measurement, and the classification
  of the hazard ([§ Changes in revision 3.1](#changes-in-revision-31)).
- **Nothing is implemented, run, committed, frozen, tagged or pushed.** M14 and every earlier record are unchanged.

**What exists so far.** The only computation is a design calculation on the update formulas, with no agent and no
task: [proposal_inputs/m15_design_calc.mjs](proposal_inputs/m15_design_calc.mjs) →
[.out](proposal_inputs/m15_design_calc.out). Revision 3.1 adds section (f), the probe sample size.

**Name.** The folder stays `experiments/m15_uncertainty/`, but the capability under test is renamed, as the owner
required.

**What M15 does not test.** Uncertainty-guided action selection, confidence-aware exploration and metacognition.
Those belong to a later, separate milestone.

## 0. Starting point

**What M14 showed.**
- **Learning:** a schema over observable kinds, learned from the agent's own paths in relabelled worlds, recovered
  an exact relation.
- **Use:** breaking exact planner ties only.
- **Result:** it guided an unseen four-link chain.

**What M14 did not do:**
- **No updating at test:** the schema was frozen, so a reversed relation misled it.
- **No uncertainty:** its score was a posterior mean without uncertainty.
- **No noise or change:** its signposts were exact.
- **No probabilities evaluated:** none were reported or checked.

**What M15 tests.** The **quality of a probabilistic belief** about a learned relationship, and its **adaptation**
when that relationship changes. The agent acts on that belief in a certainty-equivalent way (§ 2.6), and its
behaviour is evaluated separately.

## 1. Research hypotheses

| | Hypothesis | Tested in |
|---|---|---|
| **H-BT, calibrated belief tracking** | When the relationship is unchanged, the agent's probabilities for each kind's next kind are accurate and calibrated against the environment's true distribution. They are lower where the relationship is less reliable or the evidence thinner. They are no more confident than the evidence warrants | Passive replay (§ 4.1): identical observations for every mechanism; independent probes; ground truth |
| **H-CD, change detection** | After an unannounced change of the relationship, the belief switches to the new value within a few observations, far sooner than frequency counting. It rarely switches when nothing has changed, far more rarely than trusting the newest observation. Its post-change probabilities recover | Passive replay (§ 4.1) |
| **H-ACT, active behaviour** (separate) | An agent that breaks ties by this belief (certainty-equivalent) is not harmed by noisy or thin evidence, and recovers after a change sooner than prior-trusting and counting agents | Closed-loop runs (§ 4.2) |

**A question asked, but not claimed in advance.** Is the Bayesian change-point mechanism better than a tuned
non-Bayesian window rule? It is tested (line MECH, § 5). The design calculation (§ 2.7) **predicts no difference**.
So the claim of Bayesian superiority is withdrawn from M15's expected outcomes. It may be made only if MECH passes.

## 2. The exact model

### 2.1 Observation unit, cardinality and independence

| Item | Definition |
|---|---|
| **Categories** | K = 4: a "next kind" y ∈ {0, 1, 2, 3}, which may equal k itself. Observations are kind-to-kind steps on paths. E7 has no blocked edges and no binary open/blocked observation |
| **Unit** | **At most one observation per kind per world.** After a world's single episode, if it reached the goal, the path is loop-erased; the observation for kind k is the next node's kind after the **last** kind-k node before the goal. If the path has no kind-k node, there is none |
| **Why this unit** | Loop erasure removes revisits, and the per-world cap prevents repeated polling: no world contributes more than one observation per kind. Every world, training ("warm-up") or evaluation, runs **one episode**, so no world's route is counted several times (revision 2 used five training episodes per world). Taking the last occurrence keeps the step closest to the goal, the one most likely to lie on the route |
| **The agent's independence assumption** | Given the regime, the observations y_{k,1}, y_{k,2}, … of a kind are i.i.d. draws from θ_k. Worlds are generated independently, and noise positions are independent across worlds and steps |
| **Known violations, and how they are handled** | (1) **Policy dependence in closed loop:** which steps the agent observes depends on its belief, because a misled agent detours. Passive replay removes it, and probes do not depend on the policy. (2) **Cross-kind dependence within one world** (one path supplies every kind's observation): the model treats kinds independently, and pooled metrics use a cluster bootstrap over labels. (3) **Detour steps in closed-loop evidence** are not draws of the route process. They are measured (detour share per arm), and passive replay excludes them |

Under this unit, a 4-hop route contributes about one observation per kind per world. **h is therefore a per-world
hazard.** With h = 0.01, 1/h = 100 worlds, far from the experiment's switch timing (§ 4). The review assumed 3–5
observations per world, which is not the case here.

### 2.2 The environment's true distribution (evaluator only)

For a kind k under the current regime, θ*_k is:

| Condition | θ*_k |
|---|---|
| STABLE, SPARSE | e_{σ(k)} |
| NOISY | (1 − q)·e_{σ(k)} + (q/3)·Σ_{j≠σ(k)} e_j, with q = 0.25 |
| REVERSED | e_{σ(k)} before the switch; e_{σ⁻¹(k)} after |

Each route step independently follows θ*: in NOISY, a corrupted step goes to one of the three other kinds uniformly,
and the chain continues from there.

### 2.3 Dirichlet evidence accumulation (FREQ; also inside UA and WINDOW)

- **Prior:** θ_k ~ Dir(α·1), with **α = ½** (Jeffreys) and A = Kα = 2.
- **Counts:** n = (n_0, …, n_3), with N = Σn.
- **Predictive:** p(y = j | n) = (α + n_j)/(A + N).
- **Posterior moments:** E[θ_kj] = a_j/S and Var[θ_kj] = a_j(S − a_j)/(S²(S + 1)), where a = α + n and S = A + N.

### 2.4 Change layer: BOCPD (UA)

The method is Adams & MacKay (2007), Algorithm 1, with a constant hazard **h = 0.01 per observation**: the
hazard AD-13 already uses for exits (§ 2.5).
- **Predictive under run length r:** π^{(r)} = (α + n^{(r)}_{y_t})/(A + r).
- **Growth:** P(r_t = r+1, y_{1:t}) = P(r_{t−1} = r, y_{1:t−1}) π^{(r)} (1 − h).
- **Change:** P(r_t = 0, y_{1:t}) = Σ_r P(r_{t−1} = r, y_{1:t−1}) π^{(r)} h.
- **Normalise, then update the counts:** run r+1 holds n^{(r)} + e_{y_t}; run 0 holds none. Run lengths with posterior
  below 10⁻¹² are pruned.
- **Belief for the next observation:** p(y_{t+1} = j) = Σ_r P(r_t = r | y_{1:t}) (α + n^{(r)}_j)/(A + r).

**How the three sources of uncertainty separate:**
- **observation noise:** the spread of θ within a run;
- **epistemic uncertainty:** the Dirichlet spread;
- **change uncertainty:** the run-length posterior, reported as P(r_t ≤ 3).

**Noise against change.** Noise yields scattered contradictions at a steady rate. A change yields contradictions that
agree with one another, which a short run explains far better than the long one. Noise consistently biased toward one
wrong kind would mimic a partial change; this design's noise is scattered, and that is a stated limit.

### 2.5 The comparison rules

| Rule | Definition |
|---|---|
| **FREQ** | § 2.3; equivalently, UA with h = 0 |
| **FROZEN** | FREQ, with updating stopped at the end of the warm-up |
| **NEWEST** | p = e_{y_last} (uniform before any observation) |
| **WINDOW w** (non-Bayesian change rule) | Dirichlet(½) counts since the last reset. When the last w observations all equal a value u that is not the current unique most probable value, the counts are reset to those w observations (u with count w). w is chosen from {2, 3, 4} on development labels (§ 6.1). w = 2 is "switch after two agreeing contradictions" |
| **ORACLE** (privileged reference) | p = θ*_k |

**How α and h were chosen.** Both were chosen before any task run, from the formula calculation only, never from
task data.

| Parameter | Classification | Basis |
|---|---|---|
| **α = ½** | Analytic, chosen in revision 2 | Sharper forecasts on near-deterministic relations than α = 1 |
| **h = 0.01** | **Development-selected.** It replaced the originally specified h = 0.05 after the h = 0.05 calibration calculation had been seen | Section (e) predicts h = 0.05 to be systematically underconfident on the deterministic phases, and so to fail BT1: pooled ECE 0.118, mean confidence 0.80 against an expected accuracy of 0.92. h = 0.01 gives 0.076. The value 0.01 is AD-13's hazard for exits (CF-05b's value), not something derived from M15's switch schedule (s ∈ {2, …, 10} evaluation worlds, against 1/h = 100). It was nevertheless chosen **knowing** the predicted BT1 outcome of the alternative |

**What this classification requires:**
- **No confirmation claim.** UA's calibration performance at h = 0.01 is a test of a development-selected
  configuration. A pass may be described only as calibration "with a development-selected hazard (h = 0.01)". It may
  **not** be described as independent confirmation of the original hypothesis, which was specified with h = 0.05.
- **The original specification is tested as specified.** h = 0.05 is kept as the **disclosed sensitivity arm**, and
  its BT results are reported as the test of the originally specified parameter. Its BT1 is predicted to fail.
- **Frozen before any confirmatory label.** Every parameter is fixed in SPEC.md and hashed at the freeze: α = ½;
  h = 0.01; the sensitivity values α = 1 and h ∈ {0.02, 0.05, 0.15}; the probe count P = 64 (§ 4.1); the window grid
  w ∈ {2, 3, 4}; every threshold. No gate label is accessed before then (§ 6.1).
- **The sensitivity arms are reported and never used to choose.** They keep revision 2's analysis (α = 1, h = 0.02,
  h = 0.15) and add h = 0.05.

### 2.6 Decisions: certainty-equivalent (closed loop only)

At a node of kind k:
- **Ties only:** let T be the set of exits whose planner value (AD-13, unchanged) equals the maximum exactly.
- **Ranking:** if |T| > 1, the agent keeps the exits whose kind has the highest p(y = ·); any remaining tie goes to
  AD-13's own routine and random draw.
- **Identity:** with equal p over the kinds in T, the choice is AD-13's, draw for draw.
- **No override:** an exit the planner values lower is never chosen.
- **Certainty-equivalent:** only the ranking of p matters, not its magnitude. M15 therefore makes no claim about
  uncertainty-guided decisions.

### 2.7 What the design calculation predicts

From the calculation's output, α = ½: 12 warm-up observations, then the stream shown.

| | FREQ | NEWEST | WINDOW w=2 | WINDOW w=3 | **UA (BOCPD, h = 0.01)** | UA at h = 0.05 (sensitivity) |
|---|---|---|---|---|---|---|
| Detection delay after a clean reversal, for pre-switch evidence n0 = 8 / 12 / 30 | 9 / 13 / 31 | 1 / 1 / 1 | 2 / 2 / 2 | 3 / 3 / 3 | **3 / 3 / 2** | 2 / 2 / 2 |
| False alarms, at 10% / 25% / 40% noise | 0 / 0 / 0% | 9.3 / 23.8 / 37.5% | 0.7 / 4.7 / 13.4% | 0.0 / 0.7 / 2.6% | **0.1 / 1.0 / 4.6%** | 0.7 / 4.2 / 11.4% |
| Mean P(true value) at 25% noise (true 0.75) | 0.846 | 0.762 | 0.811 | 0.842 | **0.798** | 0.710 |
| Mean P(true value) at 40% noise (true 0.60) | 0.800 | 0.625 | 0.712 | 0.787 | **0.710** | 0.605 |
| Expected Brier against θ*, at 10% / 25% / 40% noise | 0.189 / 0.436 / 0.651 | 0.361 / 0.817 / 1.150 | 0.196 / 0.462 / 0.690 | 0.189 / 0.439 / 0.659 | **0.194 / 0.443 / 0.649** | 0.213 / 0.462 / 0.652 |
| P(true value) after 12 clean observations | 0.893 | 1.000 | 0.893 | 0.893 | **0.884** | 0.850 |
| Expected pooled no-change ECE, section (e) (BT1 requires upper < 0.10) | 0.058 | — | 0.055 | 0.057 | **0.076** | 0.118 |

**Reading.**
- **Against the simple alternatives:** UA separates cleanly from FREQ (detection) and from NEWEST (false alarms,
  Brier, calibration). With the development-selected h = 0.01, it is predicted to meet every absolute BT and CD
  threshold. The originally specified h = 0.05 is predicted to fail BT1. That prediction is part of why 0.01 was
  selected, so it is no evidence for the hypothesis.
- **Against a tuned window rule:** UA does **not** separate. With w = 3 the window rule is as good or better on
  delay, false alarms and calibration; UA is ahead only in expected Brier at 40% noise (0.649 against 0.659), a
  regime M15 does not test.
- **The consequence:** M15 cannot be expected to show Bayesian change-point inference to be superior. § 1 and line
  MECH say so in advance.
- **What remains genuinely uncertain** is whether these predictions hold on real route streams, where a kind can be
  missing from a world, on the detour-laden yoked stream, and in closed-loop behaviour.

## 3. Arms

**Passive replay (inference):** FREQ, FROZEN, NEWEST, WINDOW (tuned w), **UA** (h = 0.01); the sensitivity arms
UA(α = 1), UA(h = 0.02), UA(h = 0.05) and UA(h = 0.15); ORACLE as the reference.

**Closed loop (behaviour):** CONCRETE (AD-13 with no schema; random tie-break), FROZEN, FREQ, NEWEST, WINDOW, **UA**;
ORACLE, privileged.

**Removed from revision 2, as out of scope** (they concern decision and exploration rules, which M15 no longer
claims): EPS (fixed exploration), UA_MATCH (probability matching), DISC. WINDOW now holds the tuned-forgetting role,
as the owner specified.

## 4. Two separate evaluations

**The sequence, for every label and condition:**
- **Warm-up:** 12 worlds (1 in SPARSE) under σ, exact.
- **Evaluation:** 16 worlds under the condition.
- **Episodes:** one per world, cap 200.

**Conditions:**

| Condition | Evaluation worlds |
|---|---|
| STABLE | σ, exact |
| NOISY | σ, with q = 0.25 per route step |
| REVERSED | σ through evaluation world s, then σ⁻¹ |
| SPARSE | σ, after 1 warm-up world |

**The switch point s**, drawn per label from a label-named stream, uniform on {2, …, 10}:
- **Pre-switch evidence:** 14 to 22 observations per kind.
- **At least 6 post-switch worlds.**
- **The timing varies widely relative to h,** and the agent knows nothing of it.

**Within a label, all conditions share** the graphs, routes, phases and noise positions; only the kinds differ.

### 4.1 Inference quality: passive replay

**The reference stream.** For each label and condition, the evaluator builds the route-step stream from the same
worlds: per world and kind, the next kind after the last kind-k node on that world's route, following § 2.1's unit
applied to the route.
- It is a direct draw of the environment's process θ*, with corruptions in NOISY and the switch in REVERSED.
- It does not depend on any agent's behaviour.
- Every inference mechanism receives this **identical** sequence.

**A second, yoked stream** (secondary): CONCRETE's own closed-loop observations. CONCRETE's policy ignores kinds, so
the stream is exogenous to every belief, yet it carries realistic detour noise. Every mechanism receives this
identical stream too.

**Ground truth is the primary comparison.** The evaluator knows the exact transition distribution θ*_k of every kind
under the current regime (§ 2.2). Every belief p_k recorded at a world start is compared with θ*_k directly, with no
sampling:
- the expected Brier and expected log score;
- the expected correctness of the top value;
- the error of P(true value).

Every criterion that can be computed this way is computed this way (§ 5).

**Probes**, which give independent, policy-free realized outcomes:
- **When:** at the start of every evaluation world, before that world's observations are absorbed.
- **What:** every mechanism's belief p_k is recorded for **every** kind k, whether or not the agent ever visits it.
- **Outcomes:** for each kind, **P = 64** probe outcomes are drawn independently from θ*_k (current regime), with the
  evaluator's stream `<label>|<condition>|probe|<world>|<k>`.
- **Identical for every mechanism:** the outcomes are generated once per label, condition, world and kind, and every
  inference mechanism (and, in the closed loop, every arm) is scored against the **same** outcome values.
- **What they are used for:** the realized-outcome metrics, namely the probe Brier and probe log score, the empirical
  reliability table and ECE, and the AUROC of confidence for correctness. The AUROC is the only criterion that needs
  realized outcomes (BT3c).
- **Isolation:** probes are evaluation records only. They never reach any agent or mechanism, no update uses them, and
  a test asserts this.
- **Why there is no selection bias:** probe points are fixed in advance (every kind, every evaluation world), and the
  outcomes come from the environment's process, not from any path.

**Why 64 probes, not 8.** Section (f) of the design calculation sets 165 idealised labels against their exact values
(UA at h = 0.01):

| P | MC SD of a label's probe Brier (UA) | MC SD of a label's probe contrast NEWEST − UA | MC SD of pooled probe ECE | MC SD of probe AUROC |
|---|---|---|---|---|
| 8 | 0.0081 | 0.0063 | 0.0004 | 0.0010 |
| 16 | 0.0055 | 0.0038 | 0.0003 | 0.0008 |
| 32 | 0.0043 | 0.0031 | 0.0003 | 0.0006 |
| **64** | **0.0032** | **0.0021** | **0.0002** | **0.0004** |

**Against the between-label spreads.** In those idealised streams the between-label SDs of the exact quantities are
0.0045 (UA expected Brier) and 0.0216 (NEWEST − UA).
- **Pooled quantities** (ECE, AUROC) are precise even at P = 8. The pooled probe ECE also matches the exact ECE
  (0.076) at every P, so probe sampling adds no bias.
- **Per-label probe scores** at P = 8 carry more Monte Carlo noise than the between-label signal they would
  compare (0.0081 against 0.0045), and the contrast's noise is 29% of its spread.
- **P = 64 brings the contrast's noise below 10% of its between-label spread** (0.0021 against 0.0216). The draws cost
  nothing.
- **Probe sampling decides no criterion except BT3c,** whose Monte Carlo SD (0.0004) is negligible against its margin
  (a predicted AUROC of about 0.71 against 0.5).

### 4.2 Active behaviour: closed loop

**The run.** Each agent acts in the worlds, observes per § 2.1 from its own path, and updates its own belief.

**Measures, and what they are for:**
- **Behavioural outcomes:** steps per world.
- **Diagnostics only:** its beliefs, probed exactly as in § 4.1; and on-policy prequential calibration, each
  world-start belief scored against the arm's own next observations. These describe its belief in its own data stream
  and are never used for comparisons between arms, because each arm's data differ.

## 5. Metrics and pre-declared criteria

**Metrics,** reported separately per mechanism, per condition, and in REVERSED per phase (before the switch;
post-switch observations 1–2; 3–6):

| Metric | Definition |
|---|---|
| **Expected correctness** (primary) | For a belief p with top set T = argmax p: a = (1/\|T\|)·Σ_{j∈T} θ*_j, the exact probability that the top value occurs. **Exact accuracy** = its mean |
| **Brier** | **Primary, exact:** E_θ*[Σ_j (p_j − 1[j = y])²] = Σ_y θ*_y Σ_j (p_j − 1[j = y])². **Probes (reported):** the mean over the 64 identical probe outcomes |
| **Log score** | **Primary, exact:** −Σ_y θ*_y log max(p_y, 10⁻⁶). **Probes (reported):** the mean of −log max(p_outcome, 10⁻⁶) |
| **Probe accuracy** (reported) | 1[argmax p = outcome], with a tie counted 1/\|T\| |
| **Calibration (ECE)** | **Confidence:** c = max_j p_j. **Binning:** 10 equal-width bins on [0, 1], [b/10, (b+1)/10) for b = 0…8 and [0.9, 1.0] for b = 9; empty bins omitted. **Per bin:** n_b, mean confidence, and mean correctness. **ECE** = Σ_b (n_b/N)·\|correctness_b − conf_b\|. **Direction** = the sign of Σ_b (n_b/N)(correctness_b − conf_b); positive means underconfident. **Primary (exact):** correctness is the expected correctness a, and every belief point weighs 1. **Empirical (reported):** correctness is the probe indicator, and every probe outcome weighs 1. **Binning sensitivity (reported):** 10 equal-mass bins, and class-wise ECE over all K probabilities against θ*_j |
| **Confidence against correctness** | The AUROC of c for probe correctness (ties take average ranks), and mean c on correct and on incorrect probes |
| **Reliability tracking** | Mean P(true value), exact, against the true reliability (1.00 in STABLE, 0.75 in NOISY) |
| **Overconfidence** | Mean c − mean expected correctness a (exact) |
| **Detection delay** | In REVERSED, per kind: post-switch observations absorbed before the belief's unique most probable value first equals σ⁻¹(k). Censored at 7 if it does not happen within 6. Also counted in worlds, and regressed on s (secondary) |
| **Detection rate** | Share of kinds detected within 6 post-switch observations |
| **False alarm** | In a no-change phase, a belief whose unique most probable value is not the current true value. Rate = false alarms / beliefs with a unique most probable value |
| **Behaviour** | Steps per world, over these windows: STABLE and NOISY evaluation worlds 1–16; REVERSED post-switch worlds 1–6; SPARSE evaluation worlds 1–3 |

The no-change phases are STABLE, NOISY, SPARSE, and REVERSED before the switch. Each criterion below passes only if
its 95% bound (§ 6.2) satisfies the stated inequality strictly.

**Prerequisite (closed loop):**

| | Criterion | Passes when |
|---|---|---|
| **T** | STABLE steps: CONCRETE − UA | lower > 0 |

**BT — calibrated belief tracking** (passive replay; no-change phases). Exact θ* everywhere except BT3c, which
uses the identical probes:

| | Criterion | Passes when |
|---|---|---|
| **BT1** | Top-1 ECE (exact) | upper < 0.10 |
| **BT2** | NEWEST − UA, in exact expected Brier and in exact ECE | both lower > 0 |
| **BT3** | (a) \|mean P(true value) − 0.75\| in NOISY (exact); (b) mean P(true value), STABLE − NOISY (exact); (c) AUROC (probes) | (a) upper < 0.10; (b) lower > 0; (c) lower > 0.5 |
| **BT4** | The change layer's cost: exact expected Brier, UA − FREQ | upper < 0.05 |
| **BT5** | Thin evidence, SPARSE evaluation worlds 1–3: (a) UA's overconfidence (exact); (b) NEWEST − UA overconfidence (exact) | (a) upper < 0.10; (b) lower > 0 |

**CD — change detection** (passive replay):

| | Criterion | Passes when |
|---|---|---|
| **CD1** | (a) Detection delay, FREQ − UA; (b) UA's detection rate | (a) lower > 0; (b) lower > 0.75 |
| **CD2** | (a) UA's false-alarm rate (no-change phases); (b) NEWEST − UA false-alarm rate (NOISY) | (a) upper < 0.10; (b) lower > 0 |
| **CD3** | Ground-truth expected Brier in post-switch observations 3–6: FREQ − UA and FROZEN − UA | both lower > 0 |

**ACT — active behaviour** (closed loop):

| | Criterion | Passes when |
|---|---|---|
| **ACT1** | NOISY steps: (a) UA − CONCRETE; (b) NEWEST − UA | (a) upper < margin; (b) lower > 0 |
| **ACT2** | Post-switch worlds 1–6 steps: FROZEN − UA and FREQ − UA | both lower > 0 |
| **ACT3** | SPARSE worlds 1–3 steps: UA − CONCRETE | upper < margin |

**MECH — the Bayesian mechanism against the tuned window rule** (passive replay), with all three parts required:

| | Criterion | Passes when |
|---|---|---|
| **MECH-a** | Ground-truth expected Brier over all evaluation observations and conditions: WINDOW − UA | lower > 0 |
| **MECH-b** | Detection delay: UA − WINDOW | upper < 1 observation |
| **MECH-c** | False-alarm rate (no-change phases): WINDOW − UA | lower > 0 |

The behaviour comparison WINDOW − UA (NOISY and post-switch steps) is reported here as well.

**Verdict lines.** Each is printed whatever the others say.

| Line | SHOWN iff |
|---|---|
| Validity | VALID iff all of: determinism (run twice); the suite; V-REV (passive streams and closed-loop runs identical between REVERSED and STABLE through world s, including the beliefs at the start of world s + 1); CONCRETE identical across conditions; no exclusion; frozen beliefs unchanged; probe isolation |
| Transfer (prerequisite) | T. If NOT SHOWN, ACT1–3 read NOT INTERPRETABLE |
| **Calibrated belief tracking** | BT1–BT5 all pass |
| **Change detection** | CD1–CD3 all pass |
| **Active behaviour** | ACT1–ACT3 all pass |
| **Bayesian advantage over a tuned window rule** | MECH-a, b and c all pass. **Predicted NOT SHOWN** (§ 2.7) |

**Wording rule.**
- **Full name:** "Calibrated Adaptive Belief Tracking and Change Detection" may be written only if both the
  belief-tracking and the change-detection lines read SHOWN.
- **Partial results:** otherwise, each line is stated as it reads.
- **Behaviour:** "in closed-loop behaviour" is added only if Active behaviour reads SHOWN.
- **Mechanism:** "Bayesian change-point inference outperforms a simple rule" may be written only if MECH reads SHOWN.
  Otherwise the record says that change detection was "not distinguished from a tuned window rule".
- **Hazard:** every statement about UA's belief tracking must say that it used a development-selected hazard
  (h = 0.01), and must report the originally specified h = 0.05 sensitivity arm's BT results beside it. A BT pass at
  h = 0.01 is not to be described as independent confirmation of the original hypothesis.
- **Never claimed:** uncertainty-aware decision-making, confidence-aware exploration and metacognition, whatever the
  result.

**What falsifies each hypothesis:**
- **H-BT** fails if any BT criterion fails. Examples: systematic over- or underconfidence (BT1, with its direction
  reported); calibration no better than NEWEST's; a reliability estimate off by 0.10 or more; confidence that does not
  fall with reliability or does not separate correct from incorrect probes; a cost of the change layer of 0.05 Brier or
  more; overconfidence on thin evidence.
- **H-CD** fails if detection is no faster than counting, the detection rate is 0.75 or below, the false-alarm rate is
  0.10 or more or no lower than NEWEST's, or the post-switch belief is no better than FREQ's or FROZEN's.
- **H-ACT** fails on harm beyond the margin, on not beating NEWEST under noise, or on no recovery advantage.

## 6. Fairness, statistics and sample size

### 6.1 The development-label procedure

All of this happens before any gate label is exposed.
1. **Fixed before development runs:**
   - every equation above;
   - α = ½ (analytic);
   - h = 0.01, development-selected from the design calculation, as § 2.5 classifies it;
   - the sensitivity values α = 1 and h ∈ {0.02, 0.05, 0.15};
   - q, the distribution of s and the sequence lengths;
   - the probe design (P = 64, identical outcomes);
   - every threshold and the evaluation code;
   - the grid w ∈ {2, 3, 4} and the tuning objective.

   None of these changes after development data are seen.
2. **The development run:** labels `m15unc|dev|0..59`, all arms, passive and closed loop.
3. **Tuning WINDOW for its own benefit:** w* = argmin over w of WINDOW's mean ground-truth expected Brier in passive
   replay, over every evaluation observation of every condition (conditions weighted equally). Ties go to the larger w.
   This is a proper scoring objective that rewards both sensitivity and specificity. The development conditions are
   the gate's, so the tuned control is not overfitted to a different regime.
4. **Admission, from controls and the oracle only (never UA):**

   | | Check | Requirement |
   |---|---|---|
   | A1 | ORACLE − CONCRETE STABLE steps | lower > 0, and at least twice the MDE |
   | A2 | (a) FROZEN − ORACLE post-switch steps; (b) NEWEST − FREQ false-alarm rate in NOISY (passive) | both lower > 0 |
   | A3 | Identity with AD-13, CONCRETE's passivity, V-REV, probe isolation | all hold |
   | A4 | FREQ's closed-loop observations per kind after the warm-up; per post-switch world | ≥ 8; ≥ 0.5 |

   **A1, A2 or A4 failing means NO-GO:** the task is redesigned, not run.
5. **UA on development labels** is used only for the spreads that set n. Nothing of UA is set there. A bug is fixed,
   disclosed, and the development run repeated.
6. **Frozen before the gate:** w*, the margin (ceil(H/4), with H the STABLE oracle headroom) and n are written to
   `admission/admission.json`, which is hashed into `SPEC.sha256` at the freeze. The run accepts only
   `m15unc|gate|<i>` labels, none of which is run before.

### 6.2 Statistics

- **Paired per-label contrasts:** `pairedBootstrap`, 10,000 resamples, seeded `m15unc|stats|m15|<name>`, with labels
  in **numeric** order. The specification states the order, and the driver and the checker use it identically (M14's
  lesson).
- **Pooled quantities** (ECE, AUROC, rates, overconfidence): a cluster bootstrap that resamples labels, 10,000
  resamples. It accounts for the dependence between kinds and worlds within a label.
  - **How:** each resample draws 165 or more labels with replacement, using a stream seeded `m15unc|stats|m15|<name>`
    over the labels in numeric order, and recomputes the pooled quantity from every belief point (and, for probe
    metrics, every probe outcome) of the drawn labels, with the binning above.
  - **The interval:** the 95% interval is the 2.5th and 97.5th percentiles of the resampled values.
  - **Differences between mechanisms** (for example NEWEST − UA in ECE) are recomputed within the same resample,
    because the labels are shared, so the interval is paired.
  - **Bias:** using exact correctness removes the outcome-sampling bias of ECE. The binning sensitivity
    (equal-mass bins) is reported beside it.
- **Rounding:** reported figures are rounded only from stored full-precision values (M14's erratum).
- **Reading the multiple criteria:** each line is an intersection-union test, so a SHOWN line's error rate is at most
  5% without correction. Lines are separate claims and are reported separately. Secondary outcomes are uncorrected.

### 6.3 Sample size

- **The rule:** n gives **98% power for every part** of T, BT, CD and ACT at half the development effect. Paired
  contrasts use a paired-normal approximation; cluster-bootstrap criteria are simulated by resampling development
  labels. n is the largest of these, at least 165 and at most 600.
- **The resulting minimum power per line:**

  | Line | Parts | Power at least |
  |---|---|---|
  | BT | 9 | 82% |
  | CD | 6 | 88% |
  | ACT | 5 | 90% |
  | T | 1 | 98% |

- **MECH is not powered for detection,** because its predicted difference is near zero. A NOT SHOWN there is reported
  with its interval and is not read as proof of equivalence.
- **Compute:** passive replay is negligible; the closed loop is about 1–2 s per label for all arms and conditions.

## 7. Limitations and the exact boundaries of the claims

**If the lines pass, M15 shows:**
- that on signposted worlds, the adopted agent's relational belief, built from its own observations, tracks a learned
  relationship's reliability with calibrated probabilities on independent probes;
- that it detects an unannounced change within a few observations while rarely mistaking scattered noise for one;
- that, acting certainty-equivalently on that belief, the agent is not harmed by noisy or thin evidence and recovers
  after a change.

**It does not show:**
- uncertainty-aware decision-making, confidence-aware exploration or metacognition (decisions use only the ranking of
  the belief);
- that Bayesian change-point inference beats a tuned window rule (predicted not to: MECH);
- learning of the hazard or the noise level;
- robustness to biased noise, repeated changes, gradual drift or other change patterns;
- role discovery (kinds are given);
- generality beyond this task family;
- anything confirmatory: one development-level run, by the designer.

**Known residual issues:**
- **Closed-loop evidence** carries detour steps, which is why inference is judged in passive replay.
- **The analytic choice of α and h** is disclosed, and the sensitivity arms are reported. h = 0.01 was chosen
  knowing that the calculation predicts h = 0.05 to fail BT1.
- **Probe-based metrics are secondary to the exact comparison.** 64 probes per kind per world keep probe Monte Carlo
  error below 10% of the between-label spread of a probe contrast (§ 4.1).
- **The equal-width bins** can be thinly populated at low confidence. Bin counts are published, and the equal-mass
  binning is reported as a sensitivity check.

## 8. GO / NO-GO

**GO for implementation of this reduced scope, conditional on the admission gate, and on the owner accepting two
facts.**

**First, the inference result is largely predicted by the formulas.**
- With the development-selected h = 0.01, UA is expected to pass BT and CD and to fail MECH, and the tuned window
  rule is predicted to be at least as good.
- With the originally specified h = 0.05 (the sensitivity arm), BT1 is predicted to fail.
- A BT pass at h = 0.01 would therefore not independently confirm the original hypothesis. It would show calibration
  for a configuration selected using the design calculation.

**Second, the run is worth doing anyway, for three reasons:**
- **Real data:** it tests those predictions on real streams, with kinds that can be missing, and on the detour-laden
  yoked stream.
- **Behaviour:** it measures closed-loop behaviour, which the formulas cannot predict.
- **A prerequisite for later work:** it builds and verifies the calibrated, change-aware belief that the deferred
  milestone on uncertainty-guided action would need.

If the owner wants new knowledge about mechanisms rather than a verified demonstration of this component, M15 is not
the experiment for that.

The design now:
- **Tests inference on identical data** (passive replay) against independent, policy-free probes and ground truth,
  and keeps behaviour as a separate closed-loop evaluation.
- **Specifies its observation unit,** removing duplicate polling.
- **Separates belief tracking, change detection and behaviour** into their own lines, with stated falsifiers.

**What it does not hide.** The calculation predicts that the tuned window rule equals the Bayesian mechanism here.
M15 therefore does not aim to show a Bayesian advantage, and says so before it runs. If the owner wants that question
answered, it needs a task where the two are predicted to differ: for example, noise levels that vary unpredictably
across labels, where a single tuned window cannot fit every regime. That would be a separate design, and it is not
proposed here.

**Effort:**
- build: about 2 working sessions;
- the development procedure and power: about half a session;
- specification, freeze, run, independent check and write-up: about 1 session;
- compute: under 30 minutes.

## Changes from revision 2

1. **The claim is renamed** "Calibrated Adaptive Belief Tracking and Change Detection". Uncertainty-aware decisions,
   exploration and metacognition are excluded explicitly, and the decision rule is stated to be certainty-equivalent.
2. **Calibration has three separate evaluations:**
   - on-policy prediction (diagnostic only);
   - off-policy probes over every kind, with outcomes drawn from the environment's process and never shown to agents;
   - direct comparison with ground truth θ*.

   Accuracy, Brier, log score and calibration are reported separately.
3. **Change detection:**
   - **The window baseline:** a tuned window rule (WINDOW, w ∈ {2, 3, 4} on development labels) is added. False
     alarms, delay, recovery and behaviour are compared with it.
   - **Timing:** the switch timing is widened to s ∈ {2, …, 10}, with a delay-against-timing analysis.
   - **No superiority claim:** none is made unless MECH passes, and the calculation predicts it will not.
4. **The observation model is specified:**
   - K = 4;
   - one observation per kind per world, taken from the last occurrence on the loop-erased path;
   - one episode per world everywhere (the five-episode training worlds are removed);
   - the independence assumption and its known violations are stated, together with their handling.

   This also corrects two points in the review: there are no blocked edges, and observations are not 3–5 per world.
5. **Passive replay:** every inference mechanism receives the identical route-step stream (primary) or the identical
   CONCRETE-yoked stream (secondary). The closed loop is a separate behavioural evaluation.
6. **Fairness:**
   - a documented development procedure;
   - control parameters tuned on isolated development labels with a proper objective;
   - admission decided from controls and the oracle only;
   - parameters frozen and hashed before gate labels are exposed;
   - the analytic choice of α and h disclosed, and the sensitivity arms kept.
7. **Scope reduced:**
   - EPS, UA_MATCH and DISC are removed, as decision and exploration rules outside the narrowed claim;
   - warm-up and evaluation are unified into one sequence of single-episode worlds;
   - the design calculation is extended to revision 3: the window rule, the timing table, 40% noise, and the pooled
     calibration estimate.
8. **The hazard changes from 0.05 to 0.01** (AD-13's hazard), because the calculation predicts h = 0.05 to be
   systematically underconfident and to fail BT1 (ECE 0.118). This is disclosed in § 2.5, and h = 0.05 joins the
   sensitivity arms.

## Changes in revision 3.1

These are the owner's two targeted clarifications only. Nothing in the scope, the agents, the task or the claim
changes.

1. **Calibration measurement:**
   - **The exact known transition distribution θ\* is the primary ground-truth comparison** (§ 4.1, § 5): exact
     expected Brier, exact expected log score, exact expected correctness, and an exact ECE that uses expected
     correctness, so it has no outcome-sampling noise.
   - **Criteria moved to exact values:** BT1, BT2, BT3a–b, BT4, BT5, CD3 and MECH-a. Only BT3c (AUROC) uses realized
     outcomes.
   - **Probes increased from 8 to 64 per kind per world.** They are drawn once, and every mechanism is scored on
     identical outcomes. The justification is the new section (f) of the design calculation: at 8, a label's probe
     contrast carries Monte Carlo noise of 29% of its between-label spread; at 64, under 10%. Pooled ECE and AUROC are
     precise at either count.
   - **Probe Brier and probe log score are reported** beside the exact values.
   - **The ECE binning method is specified:** 10 equal-width bins with stated edges, exact and empirical weighting, and
     the direction. The binning sensitivity is equal-mass and class-wise ECE.
   - **Its uncertainty is specified:** a cluster bootstrap over labels, paired for differences between mechanisms.
2. **Hazard selection:**
   - **h = 0.01 is classified as development-selected,** chosen after the h = 0.05 calibration calculation had been
     seen (§ 2.5).
   - **What it permits:** its calibration result may not be described as independent confirmation of the original
     hypothesis, and every BT statement must name the selection.
   - **h = 0.05 stays the disclosed sensitivity arm.** Its BT results are reported as the test of the original
     specification.
   - **Frozen before any confirmatory label:** h and every sensitivity value (α = 1; h = 0.02, 0.05, 0.15), together
     with P = 64 and the window grid.
