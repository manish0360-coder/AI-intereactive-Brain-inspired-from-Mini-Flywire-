# Complete review bundle for an independent reviewer: CF-03c and CF-04

> Generated from the repository at commit `a84da1a`. Parts 1–4 are the cover and the questions. Part 5 is statistical power, computed from the recorded data. Part 6 is the internal review and the questions it left open. The appendices are the frozen specifications, the results records and the source code, **verbatim**, each with the SHA-256 of the file it was copied from.
>
> Nothing in this bundle has been pushed or published. CF-05 has not been designed, frozen or run; it waits for this review.

**Purpose.** Two experiments were designed, run and interpreted by the same AI model family (Claude), including
the internal "independent" review. This package asks a reviewer from outside that family to check the designs and
the conclusions before the next experiment is frozen. It is self-contained: the reviewer has no access to the
repository.

**What is wanted.** Not agreement. Find what is wrong: unfair tests, confounds, conclusions stronger than the
evidence, and simpler explanations. Both results are negative, so the main risk to check is that a mechanism was
rejected by a test that could not have shown its benefit.

**Rules both experiments followed.** Design on `dev` worlds; freeze the specification and code in a git commit;
run once on worlds never used before; record the result whatever it is; never tune after a gate run.

---

## 1. The setting

A small reinforcement-learning testbed, plain JavaScript, no dependencies.

- **Worlds.** Random connected graphs: 24 nodes, 30 edges, maximum degree 4. Node labels and the order of actions
  at each node are hidden permutations, so the agent cannot read topology from them.
- **Environment.** Owns position, topology, edge reliabilities, blocked edges and reward. The agent receives only
  `{node, nActions, goal}` and returns an action index. An attempted move succeeds with the edge's hidden
  probability; on failure the agent stays. Reward 1 on arrival at the rewarded node.
- **Common random numbers.** Each edge has its own random stream, shared by every agent run on that world.
- **Statistics.** The unit is the world. Every contrast is paired within world; intervals are 95% percentile
  bootstrap with 10,000 resamples. Sample size is fixed before the gate by n = max(20, ⌈(2.8·SD/mean)²⌉), capped
  at 60, from dev differences of the primary contrast.

**Agents.**

| Agent | What it is |
|---|---|
| QL | Tabular one-step Q-learning, α 0.5, γ 0.95, ε 0.1 |
| DYNAQ | Q-learning plus 20 planning updates per step from a last-outcome model |
| MBVI3 ("the planner") | Learned tabular model (below) + value iteration to convergence each step (γ 0.95), optimistic value 1 for never-seen outcomes, greedy |
| ORACLE | Privileged shortest-path reference; not a learner |

**The learned model (v3).** Per (state, action) pair it estimates the probability that an attempt moves at all:

- Pairs are treated as draws from one population Beta(S·μ, S·(1 − μ)). μ is the pooled move rate over the *other*
  pairs (leave-one-out) with a weak hyper-prior (mean 0.5, worth 1 observation). S is chosen from
  {1, 2, 4, 8, 16, 32, 64} by Beta-binomial marginal likelihood, iterated to a fixed point.
  P(move) = (moves + S·μ)/(attempts + S).
- A pair that has never moved is a mixture: "impassable" with prior weight 0.05, or a population member.
- Change detection per pair: two CUSUM statistics ("got worse", "got better") against the alternative that the
  outcome now has probability 0.9; a change is declared when posterior odds exceed 1 under a prior change rate of
  0.002 per attempt (statistic > ln 499); the pair's counts are then replaced by the observations of the run that
  raised the statistic.
- Reward is modelled per arrival state with an optimistic prior and a local reset when contradicted.

---

## 2. CF-03c: is the model's calibration general, or a match to one generator?

**Background.** An earlier gate (CF-03b) reported the model "calibrated" (expected calibration error 0.028 against
a limit of 0.05) on worlds whose edge reliabilities are U[0.5, 1], the distribution it was developed on. An
internal review objected that the Beta with that mean and variance has S = 8, which the model had simply learned.

**Design.** One agent (MBVI3) acts for 600 exploration steps and 5 test episodes. Seven forecasters are fed the
same transitions and each gives P(move) before every attempt, so all are scored on identical events. Scored event:
did the attempt change the node, on **every** attempt including a pair's first. Scores: Brier, log-loss, ECE (10
bins).

Forecasters: the v3 model; **CONST** = running overall move rate, the same number for every pair;
**LAPLACE** = per pair (moves + 1)/(attempts + 2), no sharing; the two earlier model versions; v3 without the
pooled move prior.

Reliability families (u ~ U[0, 1] per edge). Only U5 was run before the freeze; the other four were never run on
any world, including in tests.

| Family | Reliability |
|---|---|
| U5 (development) | 0.5 + 0.5u |
| WIDE | 0.1 + 0.9u |
| BIMODAL | 0.95 or 0.55, equal shares |
| ARCSINE | 0.2 + 0.8·sin²(πu/2) |
| HIGH | 0.9 + 0.1u |

**Frozen criteria, per unseen family.** K1: Brier(CONST) − Brier(V3) lower bound > −0.002 everywhere, and > 0 in
WIDE, BIMODAL, ARCSINE (HIGH exempted in advance: its edges barely differ). K2: V3's ECE upper bound ≤ 0.05.
K3: Brier(LAPLACE) − Brier(V3) lower bound > 0. Verdicts: PASS (all families), PARTIAL (some), FAIL.

**Result: PARTIAL.** 20 fresh worlds per family. Positive differences mean the model is better.

| Family | Brier V3 | Brier CONST | Brier LAPLACE | CONST − V3 | LAPLACE − V3 | V3 ECE [95%] | CONST ECE | Holds |
|---|---|---|---|---|---|---|---|---|
| U5 | 0.1902 | 0.1940 | 0.2051 | +0.0038 [0.0020, 0.0059] | +0.0149 [0.0135, 0.0164] | 0.033 [0.029, 0.037] | 0.025 | (development) |
| WIDE | 0.2158 | 0.2499 | 0.2112 | +0.0341 [0.0302, 0.0380] | −0.0046 [−0.0055, −0.0037] | 0.050 [0.045, 0.055] | 0.049 | no |
| BIMODAL | 0.1769 | 0.1944 | 0.1859 | +0.0175 [0.0156, 0.0194] | +0.0090 [0.0071, 0.0108] | 0.043 [0.040, 0.047] | 0.030 | yes |
| ARCSINE | 0.1959 | 0.2409 | 0.1942 | +0.0450 [0.0390, 0.0513] | −0.0017 [−0.0031, −0.0001] | 0.050 [0.046, 0.055] | 0.042 | no |
| HIGH | 0.0502 | 0.0478 | 0.0935 | −0.0024 [−0.0026, −0.0021] | +0.0433 [0.0427, 0.0441] | 0.014 [0.012, 0.017] | 0.008 | no |

Resolution term of the Brier decomposition (V3 / CONST / LAPLACE): U5 0.0059 / 0.0005 / 0.0063; WIDE 0.0351 /
0.0019 / 0.0399; BIMODAL 0.0203 / 0.0009 / 0.0210; ARCSINE 0.0484 / 0.0041 / 0.0516; HIGH 0.0000 / 0.0000 / 0.0001.
Learned S: U5 mostly 8; WIDE 2–4; BIMODAL 2–4; ARCSINE 1–4; HIGH 16–64. V3's ECE on a pair's first attempt is
0.07–0.12 in every family.

**Conclusions drawn.** (a) The calibration claim does not generalise; it stays limited to the development
generator. (b) A constant forecaster is as well calibrated as the model in every family, so calibration error is
dropped as a headline measure in favour of Brier score against CONST and LAPLACE. (c) Sharing between pairs helps
when pairs are alike and costs when they are spread wide. (d) Two possible fixes (allow S below 1; learn the
impassable weight instead of fixing 0.05) were noted and deliberately not made after the result.

---

## 3. CF-04: does an "executive" that arbitrates between two controllers help?

**Idea under test.** Run the planner and Q-learning side by side; an arbiter gives control to whichever is
currently more reliable (after Daw, Niv & Dayan 2005; Lee, Shimojo & O'Doherty 2014).

**Task E4.** Edge reliabilities U[0.5, 1]. Phases: 600 unrewarded exploration steps; 30 training episodes to a
cued goal at distance ≥ 3; then an edge on a shortest route is **blocked without notice** for 15 episodes; then
the block is **removed without notice** for 15 episodes. A SHAM arm blocks an edge on no shortest route. Episodes
are capped at 200 steps. `metric` = all steps in the 30 episodes after the change.

**The arbiter (ARB).** Both controllers learn from every transition. After each step:

```
planner excess = (1 − p_model(observed outcome)) − (1 − Σ_i p_i²)     # error minus its expectation under the model's own prediction
habit excess   = min(1, |TD error|) − slow running mean of that quantity (rate 0.01)
both smoothed with rate 0.1
habit acts  iff  smoothed planner excess − smoothed habit excess > θ        θ = 0.05
```

ARB_T10 is the same with θ = 0.1. **RANDSWITCH** uses the same two controllers but lets the habit act at random
with the share ARB showed in that world and arm.

**Disclosed before the run.** θ was set in two steps on dev: 0.1 first (the habit acted in 4% of decisions and
nothing changed; a unit test then showed a single maximal surprise adds exactly 0.1 and could never cross it), then
0.05. On dev, arbitration failed its criteria at both values, and the specification stated that the expected
verdict was "not supported".

**Frozen criteria.** T1: planner-without-change-detection − planner on the first 3 post-block episodes, lower
bound > 0. T2: the same contrast in SHAM has upper bound < 10 and CHANGE − SHAM has lower bound > 0. A1: planner −
ARB on `metric`, lower bound > 0. A2: RANDSWITCH − ARB, lower bound > 0. A3: ARB − planner in SHAM, upper bound
< 10. A4: the habit decides at least once in half the worlds.

**Result: ARBITRATION NOT SUPPORTED — HARMFUL.** 55 fresh worlds. Differences in steps.

| Criterion | Result | Held |
|---|---|---|
| T1 | +160.7 [135.2, 188.2] | yes |
| T2 | sham 0.0 [−0.3, 0.3]; difference +160.7 [135.4, 188.5] | yes |
| A1 planner − ARB | −13.8 [−20.0, −7.2] | no |
| A2 RANDSWITCH − ARB | −11.2 [−20.0, −3.6] | no |
| A3 | +0.3 [−2.4, 2.7] | yes |
| A4 | 55 of 55 worlds | yes |

| Agent | Last 5 training episodes | First 3 after block | 15 with block | 15 after removal | Reopened edge used (of 15) | Censored episodes |
|---|---|---|---|---|---|---|
| ORACLE | 26.6 | 24.3 | 120.8 | 80.0 | 15.0 | 0 |
| Planner | 27.4 | 31.6 | 127.3 | 120.1 | 0.9 | 0 |
| Planner, no change detection | 27.3 | 192.4 | 293.1 | 117.9 | 1.2 | 28 |
| ARB (θ 0.05) | 27.6 | 39.2 | 143.3 | 117.8 | 2.9 | 0 |
| ARB_T10 (θ 0.1) | 26.7 | 34.8 | 131.0 | 115.5 | 2.0 | 0 |
| RANDSWITCH | 27.9 | 34.5 | 136.1 | 113.7 | 2.9 | 0 |
| DYNAQ | 39.0 | 50.3 | 198.4 | 164.3 | 4.9 | 5 |
| QL | 33.8 | 341.9 | 1,054.5 | 143.9 | 3.2 | 233 |

ARB − planner by window: first 3 after block +7.6 [5.4, 9.9]; 15 with block +16.0 [12.4, 19.8]; 15 after removal
−2.3 [−8.2, 3.0]. ARB_T10 − planner: +3.1 [0.9, 5.4]; +3.8 [1.3, 6.5]; −4.6 [−9.8, −0.0]; overall −0.8
[−6.5, 4.6]. Habit share of decisions: ARB 16.6% (change arm), 14.2% (sham arm); ARB_T10 3.7% and 2.7%. The two
controllers proposed different actions in 41% of decisions. Planner − ORACLE: +6.5 [4.1, 9.1] with the block,
+40.1 [32.5, 48.1] after its removal. QL − planner on `metric`: +951.1 [709.0, 1,203.6].

**Conclusions drawn.** (a) The task is a valid instrument. (b) Arbitration between this planner and this habit
learner does not help and at θ = 0.05 hurts, because control passes to a much worse controller exactly when the
planner is surprised. (c) Arbitration is not built into the agent at this scale. (d) The question may reopen on a
task where the planner alone is far from the reference, or where computation is counted. (e) The room left is in
recovery after the block is removed: the planner almost never re-tests an exit it believes dead.

**Proposed next experiment (CF-05).** First add a stronger textbook baseline (Dyna-Q+ with a count model). Then
test a bonus, inside the planner's value computation, for exits not tried recently. Task E4 measures the benefit
(the 15 episodes after removal) and the cost (the sham arm).

---

## 4. Questions for the reviewer

**On CF-04 (the main concern).**

1. Was this a fair test of reliability arbitration, or was the idea rejected by a weak implementation? In
   particular: is tabular Q-learning with ε = 0.1 a reasonable "model-free controller", given that it needs about
   950 more steps than the planner after a change?
2. In the literature the usual case for a model-free controller is that it is *cheaper*, not more accurate.
   Computation was not counted here. Does that make the experiment uninformative about the published idea?
3. Is the reliability signal sound? The planner's excess error has mean zero when its model is right; the habit's
   is measured against its own slow average. The habit share was 14% even when nothing relevant changed.
4. Is RANDSWITCH, matched on the share of habit decisions, the right control? What would be better?
5. Does "harmful" overstate the evidence, given it applies to one threshold and the other threshold is neutral?
6. Is any conclusion stronger than the data support? Is anything important missing from the reported tables?

**On CF-03c.**

7. Are Brier score against a constant and a per-pair Laplace forecaster the right yardsticks for a learned
   transition model? Is dropping calibration error as a headline measure justified, or an over-reaction?
8. The model loses to Laplace on wide distributions by 0.002–0.005 Brier. Is that a meaningful failure or a
   negligible one? The frozen criterion treated it as a failure.
9. Exempting the HIGH family from the strict form of K1 in advance: reasonable, or a loophole?
10. Is the PARTIAL verdict and the retained narrow claim the right reading? Would you read it more harshly?

**On the plan.**

11. Is "recovery after a reversed change" the right next question, or is there a more important one the data
    point to? Is a recency bonus the right family of mechanism to test, and is Dyna-Q+ the right baseline?
12. All of this is on 24-node, fully observed worlds with one kind of change. What is the smallest change to the
    testbed that would most increase what these results can say?

**Format requested.** For each numbered question: a verdict (sound / sound with caveats / weak / wrong), one to
three sentences of reasoning, and the concrete change you would require. Then a ranked list of the five most
serious problems overall. Please say plainly where you disagree with the conclusions drawn.

---

## 5. Statistical power

The last column is the smallest true effect each contrast could detect with 80% power at two-sided 5%: 2.8 · SD / √n (normal approximation), using the standard deviation of the paired differences recorded in the result files. It is a description of what the experiments could have seen, computed after the fact; the sample sizes themselves were fixed before each run by the rule in section 1.

| Experiment | Contrast | n worlds | Mean | SD of paired differences | 95% interval | Smallest effect detectable with 80% power |
|---|---|---|---|---|---|---|
| CF-03c WIDE | Brier(CONST) − Brier(V3) | 20 | 0.0341 | 0.0093 | [0.0302, 0.0380] | 0.0058 |
| CF-03c WIDE | Brier(LAPLACE) − Brier(V3) | 20 | -0.0046 | 0.0021 | [-0.0055, -0.0037] | 0.0013 |
| CF-03c WIDE | Brier(V2) − Brier(V3) | 20 | 0.0000 | 0.0007 | [-0.0003, 0.0003] | 0.0004 |
| CF-03c BIMODAL | Brier(CONST) − Brier(V3) | 20 | 0.0175 | 0.0045 | [0.0156, 0.0194] | 0.0028 |
| CF-03c BIMODAL | Brier(LAPLACE) − Brier(V3) | 20 | 0.0090 | 0.0043 | [0.0071, 0.0108] | 0.0027 |
| CF-03c BIMODAL | Brier(V2) − Brier(V3) | 20 | -0.0002 | 0.0004 | [-0.0004, -0.0000] | 0.0003 |
| CF-03c ARCSINE | Brier(CONST) − Brier(V3) | 20 | 0.0450 | 0.0143 | [0.0390, 0.0513] | 0.0090 |
| CF-03c ARCSINE | Brier(LAPLACE) − Brier(V3) | 20 | -0.0017 | 0.0035 | [-0.0031, -0.0001] | 0.0022 |
| CF-03c ARCSINE | Brier(V2) − Brier(V3) | 20 | -0.0002 | 0.0007 | [-0.0005, 0.0000] | 0.0004 |
| CF-03c HIGH | Brier(CONST) − Brier(V3) | 20 | -0.0024 | 0.0006 | [-0.0026, -0.0021] | 0.0004 |
| CF-03c HIGH | Brier(LAPLACE) − Brier(V3) | 20 | 0.0433 | 0.0016 | [0.0427, 0.0441] | 0.0010 |
| CF-03c HIGH | Brier(V2) − Brier(V3) | 20 | -0.0001 | 0.0005 | [-0.0004, 0.0000] | 0.0003 |
| CF-03c U5 | Brier(CONST) − Brier(V3) | 20 | 0.0038 | 0.0046 | [0.0020, 0.0059] | 0.0029 |
| CF-03c U5 | Brier(LAPLACE) − Brier(V3) | 20 | 0.0149 | 0.0035 | [0.0135, 0.0164] | 0.0022 |
| CF-03c U5 | Brier(V2) − Brier(V3) | 20 | -0.0002 | 0.0006 | [-0.0005, 0.0000] | 0.0004 |
| CF-04 | T1 planner without change detection − planner (post) | 55 | 160.7 | 101.7 | [135.2, 188.2] | 38.4 steps |
| CF-04 | A1 planner − ARB (metric) | 55 | -13.8 | 24.6 | [-20.0, -7.2] | 9.3 steps |
| CF-04 | A2 RANDSWITCH − ARB (metric) | 55 | -11.2 | 31.5 | [-20.0, -3.6] | 11.9 steps |
| CF-04 | A3 ARB − planner, sham (metric) | 55 | 0.3 | 9.9 | [-2.4, 2.7] | 3.7 steps |
| CF-04 | planner − ARB_T10 (metric) | 55 | 0.8 | 21.0 | [-4.5, 6.4] | 7.9 steps |
| CF-04 | planner − ORACLE (return window) | 55 | 40.1 | 29.6 | [32.5, 48.1] | 11.2 steps |
| CF-04 | planner − ORACLE (15 episodes with block) | 55 | 6.5 | 9.4 | [4.1, 9.1] | 3.6 steps |

For scale: in CF-04 the planner needs 247.3 steps on `metric`, so the A1 contrast could detect an arbitration benefit of about 3.7% of that. The room actually available to any mechanism is the planner − ORACLE gap in the table.

**Known weaknesses of the analysis, for the reviewer to weigh.**

- Step counts are heavy-tailed and episodes are capped at 200 steps; a capped episode counts its cap, which biases differences toward zero for the worse agent (QL had 233 capped episodes in CF-04).
- Each gate requires every criterion to hold and applies no multiplicity correction. That is conservative for a PASS, but the reported (non-criterion) contrasts are many and uncorrected.
- All worlds in an experiment come from one generator (24 nodes, 30 edges). "55 worlds" are 55 draws from one family.
- Percentile bootstrap with 20 worlds (CF-03c) has intervals that are somewhat too narrow.
- CF-03c used 20 worlds per family by the minimum of the rule; no pilot was run on the unseen families, by design.

**Additional questions on power and validity.**

13. Was CF-04 adequately powered to detect an arbitration *benefit* of a size that would matter, given the planner − ORACLE gap that bounds any benefit?
14. The planner is within a few steps of the reference with the block in place. Is an experiment in which the incumbent is at ceiling able to say anything about a mechanism other than "not needed here"? What is the correct wording of the conclusion?
15. Is the percentile bootstrap over worlds an acceptable basis for the pass/fail decisions, or should a different interval or a permutation test have been used?
16. Is the freeze-then-run-once discipline, with two disclosed development steps on the `dev` worlds, enough protection against the designer steering toward the expected negative result as well as toward a positive one?

---

## 6. Internal review findings and unresolved questions

The decision under test in CF-04, as originally written:

#### AD-2 — Two complete controllers and reliability arbitration, not an executive over one scorer

- **Context.** The legacy "executive controller" changed 0 of 6,908 decisions. The architectures whose control has
  measurable support give the controller a choice between alternatives with different error profiles
  ([`COGNITIVE_ARCHITECTURE_COMPARISON.md`](../research/COGNITIVE_ARCHITECTURE_COMPARISON.md) §3).
- **Decision.** A model-based planner and a model-free habit learner run side by side. A monitor tracks the
  reliability of each; one selector picks the controller and logs it.
- **Alternatives.** Global-workspace broadcast (no small-agent evidence); production rules (their evidence rests
  on hand-written task knowledge, which here would be an oracle leak); full expected-value-of-control optimisation
  (not distinguishable from a threshold rule at this scale).
- **Grade.** 2 for the arbitration literature in humans and animals; 4 for its benefit in this agent.
  **Falsifier.** H-ARB: arbitration is no better than switching at random at the same rate, or the controller
  never switches.

The internal adversarial review (same model family as the author) and the responses, then the evidence recorded after the two gates:

### Independent falsification review (2026-11-13)

A reviewer that wrote none of the above was asked to find what is wrong with the decisions and with the CF-03b
result. It read the decisions, the architecture, the registry, the CF-03b spec, results, code and tests. It did
not run the tests. Its verdicts and the responses follow. Where the review is accepted, the change is listed; the
original text of AD-1 … AD-10 above is left as written.

| Decision | Verdict | Main objection | Response |
|---|---|---|---|
| AD-1 | Sound with caveats | Its falsifier, H-LEG, is declared descriptive, so it cannot falsify | **Accepted.** H-LEG gets a pre-declared comparison (legacy in map-off mode against Dyna-Q) when its gate is specified |
| AD-2 | **Weak** | The habit learner is worse than random on E3 (522 against 287 steps) and the planner already equals ORACLE on E1, so there is no headroom. Model surprise and reward prediction error are not on one scale, and irreducible edge noise would penalise the planner for ever. The primary metric ignores compute, which is the habit's only advantage | **Accepted.** Arbitration is not built until the hidden-change task is admitted and shows a window where the planner is wrong. Both errors are normalised against their own irreducible floor. A compute-aware metric and a v1-model arm are added to H-ARB. The simpler alternative (planner plus change detection, or discounted counts) is a required baseline |
| AD-3 | **Weak as graded** | A single-generator development gate is not grade 2 evidence | **Accepted.** Regraded to 4: "calibrated on this generator". See the CF-03b findings below |
| AD-4 | Sound with caveats | The sufficiency argument needs stationarity, yet E3 and E2′ are change tasks. Tasks may be designed to justify mechanisms | **Accepted in part.** The claim is restated for stationary phases. Task admission will also require that the mechanism-free planner fails, not only that planner beats habit |
| AD-5 | **Weak** | "Four stores, no other state" contradicts the architecture's own table (Q table, monitor averages, modulator scalars, hyper-prior). The falsifier is unreachable because rejected stores are never built | **Accepted.** Restated as four *memory* stores; controller and monitor state is listed separately. The successor-representation baseline (roadmap M1) is the one rejected store that is built, so the falsifier has a case |
| AD-6 | Sound with caveats | The built agent already adds optimism to values. H-MOD would pass on any change, including harm | **Accepted.** Optimism is declared as a value-level exploration term and an exception. H-MOD needs a direction, not just a difference |
| AD-7 | Sound | — | — |
| AD-8 | **Weak** | The v2 model changes every pair's prediction on every update, so a cached plan is stale by construction. Planning costs milliseconds. The saving threshold is unstated | **Accepted.** H-EVT is deferred to the scale milestone (M8) and needs per-pair prediction versions first |
| AD-9 | Sound with caveats | The aliasing tasks are where latent-state methods are the natural comparison | **Accepted.** A latent-state learner is named as the comparison for the partial-observability milestone |
| AD-10 | Sound with caveats | H1-R Stage 2 is already void; the list double-counts | **Accepted.** Eight studies, not nine, need a closure ruling |
| Whole design | — | Nine subsystems on a world where the planner is at ceiling; most planned gates can show only non-inferiority | **Accepted as the central risk.** Harder tasks and larger worlds come before more mechanism |

#### Findings on CF-03b

| # | Finding | Response |
|---|---|---|
| 1 | "Calibrated" is close to "the model matches the generator": reliabilities are U[0.5, 1], whose moment-matched Beta has S = 8, and the model learned μ = 0.739 and S = 8 in 14 of 20 worlds. `gate3b` shares the generator with `dev`, so it guards against overfitting 20 worlds, not the family | **Accepted.** New gate CF-03c: the frozen model on unseen reliability families and on worlds with several destinations per action |
| 2 | Calibration without resolution: 88% of predictions fall in three bins. A forecaster that always outputs the pooled mean might also pass | **Accepted.** CF-03c adds a constant-μ arm and a per-pair Laplace arm, and reports the Brier decomposition |
| 3 | The statistic scores only the modal outcome of pairs that have already moved; untried pairs and the impassable-exit mixture are never scored. No interval on B1 | **Accepted.** CF-03c scores move against stay for every pair, splits exploration from test, and bootstraps B1 |
| 4 | "Cannot be told apart from a perfectly calibrated forecaster" is contradicted by the result's own reliability table: 0.36 → 0.56 and 0.47 → 0.55 are off by about two standard errors. The Beta prior puts mass below 0.5, where the generator has none | **Accepted.** The sentence is withdrawn in an amendment to the results file |
| 5 | No leak of hidden facts or test data was found. The model does build in assumptions the generator satisfies: a failure is a self-transition; reward depends on the arrival state; pairs are exchangeable; actions have one destination | **Accepted** as declared structural priors; CF-03c tests two of them |
| 6 | NOPOOL removes the pooled move prior and the pooled novelty rule together, so "pooling repairs calibration" does not separate them | **Accepted.** CF-03c splits the ablation |
| 7 | Possible inconsistency: `refresh` accumulates pooled totals with weights under the previous hyper-parameters while `compute` subtracts with weights under the new ones. The transition reset can fire on one legitimate failure of a very reliable edge after about 35 successes | **Accepted as open defects.** Neither is fixed in the frozen code. Both get adversarial tests and a fix before CF-03c is frozen |
| 8 | Some tests are weak: one title claims more than it asserts; one inequality is tautological; invariance probes one edge in one world; nothing tests the ECE code or a non-exchangeable population | **Accepted.** Tests are strengthened with the CF-03c work |
| 9 | "Did not cost task performance" omits E1 NAIVE (+2.3 [0.1, 5.6], outside B6) and 61% more sweeps per decision | **Accepted.** Amended in the results file |

**What the review found correct:** the model uses only labels, action indices, reward and done; predictions are
scored before learning; the ECE arithmetic and the noise-floor simulation match the stated statistic; the numerics
tests are real; the spec discloses both development steps and the results disclose their negative findings.

**Standing of CF-03b after review.** The gate verdict stands as recorded: PASS on its frozen criteria. The claim
it supports is narrower than first written: *the v2 model is calibrated on worlds drawn from the generator it was
developed on*. Whether that survives a different reliability distribution is the question for CF-03c.

### Evidence after the review (2026-11-14)

Two frozen gates were run on the questions the review raised. Both went against the original decisions.

| Decision | Gate | Result | Standing now |
|---|---|---|---|
| **AD-3** calibrated belief | CF-03c: the repaired model on four reliability families it had never seen ([results](../../experiments/cf03c/results/RESULTS.md)) | **PARTIAL.** Criteria held in one family of four. A per-pair Laplace forecaster beats the model on two; a constant forecaster beats it on one. In every family the constant forecaster's calibration error is as low as the model's | The model is not "calibrated" in general. The claim stays: calibrated on the generator it was developed on. Calibration error is dropped as a headline statistic; Brier score with its decomposition, against constant and Laplace baselines, replaces it |
| **AD-2** two controllers and reliability arbitration | CF-04: hidden change, then its reversal, 55 worlds ([results](../../experiments/cf04/results/RESULTS.md)) | **NOT SUPPORTED, and harmful** at the tested threshold: planner − ARB = −13.8 steps [−20.0, −7.2]; ARB is also worse than random switching (−11.2 [−20.0, −3.6]) | **Withdrawn at this scale.** Arbitration is not built into the agent. The architecture diagram's monitor, arbiter and habit controller are removed from the build plan. The question reopens only on a task where the planner alone is far from the reference, or where computation is counted |
| **AD-8** planning on demand | Not run | — | Still deferred to the scale milestone |

**What the evidence does support.** Change detection is the largest measured effect in the testbed: removing it
costs +161 steps after a block [135, 188] (CF-04) and +403 on reward relocation [275, 532] (CF-03c battery). The
agent that exists and is supported by gates is: a learned model with pooled priors and change detection, planned
over by value iteration. Nothing else in the target architecture has evidence yet.

**The gap the evidence points to.** After a block is removed the planner is 40 steps behind the reference
[32.5, 48.1], because it almost never re-tests an exit it believes is dead. That, not an executive, is the next
mechanism question.

**Unresolved at the time of this bundle.**

- Whether arbitration was rejected fairly (questions 1–6, 13–14).
- Whether the model should be changed so that sharing between pairs can be switched off by the data (strength below 1), and whether the impassable-exit weight should be learned. Both were deliberately not done after CF-03c.
- Worlds where an action has several destinations, larger worlds, partial observability, and calibration after a change: untested.
- The original (legacy) MiniFlyWire agent has not been compared with any of these agents on equal information.
- No result here has been reproduced by anyone other than the author.

---

# Appendices (verbatim)

## Appendix A. CF-03c frozen specification

File: `experiments/cf03c/GATE_SPEC.md` · SHA-256 `ca53cce761aff6dc7801da892fb4b1586b4c09d1d67730cf346b23828060d8a9` · 132 lines

````markdown
# CF-03c Gate Specification — calibration robustness of world model v3 (frozen)

**Status.** Frozen in the CF-03c implementation commit, before the `gate3c` domain was run.

- Development evaluation gate, not confirmatory. Commits are local until the owner authorises a push.
- The result is bound to the commit it ran at.
- CF-03 stays FAIL on A4 and CF-03b stays PASS with its amended, narrower claim. Neither record is edited.

## The question

CF-03b showed the v2 model calibrated on worlds from the generator it was developed on (edge reliability
U[0.5, 1]). The independent review asked whether that is calibration or a match to one generator, and whether a
forecaster that always predicts the average would do as well. This gate answers both, on reliability families the
model has never been run on.

## What changed in the model (v3, `cognitive/mind/v3/`)

v2 (`cognitive/mind/world_model.mjs`) is frozen and unedited. v3 repairs two defects the review found. Both are
reproduced against v2 in `cognitive/tests/test_mind_v3.mjs`.

| Defect in v2 | Reproduction | Repair in v3 |
|---|---|---|
| Leave-one-out weights computed under different hyper-parameters than the pooled totals. A pair that never moved could get P(stay) > 1 and a negative probability | Five pairs moved three times each, then 13 failures on one pair: P(stay) = 1.0002, UNKNOWN = −0.0002 | The empirical-Bayes step runs to a fixed point (at most 25 passes); each pair's weight is stored in the pass that builds the totals, and the leave-one-out mean subtracts exactly that weight |
| One ordinary failure reset a reliable pair: after about 35 successes P(stay) < 0.05, so a single failure cleared all counts | 34 or more successes then one failure: counts cleared to 1 | Evidence-accumulating change detection. Two CUSUM statistics per pair ("got worse", "got better") against the alternative that the outcome now has probability 0.9. A change is declared when its posterior odds exceed 1 under a prior change rate of 0.002 per attempt, i.e. when the statistic exceeds ln 499. Counts then become the observations of the run that raised it. Statistics accumulate once a pair has 5 observations |

The change-detection constants (0.9, 0.002, 5) were chosen a priori and not tuned. Everything else is the v2
definition. The agent MBVI3 is MBVI2 with the v3 model; a test asserts the two agent sources are identical after
renaming.

## Design

**Task E1F** (`cognitive/testbed/tasks_v3.mjs`): the E1S task (600 unrewarded exploration steps, then 5 test
episodes to a cued goal) with every edge's hidden reliability drawn from a named family.

| Family | Reliability per edge (u ~ U[0, 1]) | Role |
|---|---|---|
| U5 | 0.5 + 0.5u | The development family. The only one run before this freeze |
| WIDE | 0.1 + 0.9u | **Unseen.** Much wider; many poor edges |
| BIMODAL | 0.95 or 0.55, equal shares | **Unseen.** Two populations: violates the model's single-population assumption |
| ARCSINE | 0.2 + 0.8·sin²(πu/2) | **Unseen.** Mass at both ends |
| HIGH | 0.9 + 0.1u | **Unseen.** Nearly reliable; little to resolve |

**Forecasters scored side by side.** One agent (MBVI3) acts. Every forecaster is fed exactly the transitions it
experiences and is asked for P(move) before each one. All are scored on identical events, so a difference between
forecasters is not a difference in behaviour.

| Forecaster | Definition |
|---|---|
| V3 | World model v3 |
| **CONST** | One number for every pair: the running overall move rate, (moves + 0.5)/(attempts + 1). The average-probability baseline |
| LAPLACE | Per pair, no sharing: (moves + 1)/(attempts + 2) |
| V2, V1 | The CF-03b and CF-03 models |
| V3_NOPOOL_MOVE, V3_NOPOOL_DEST | v3 without the pooled move-success prior; v3 without the pooled destination-novelty rate (the two halves of CF-03b's single NOPOOL ablation) |

**Scored event.** Did the attempt change the node? Scored on **every** attempt, including a pair's first (CF-03b
scored only pairs that had already moved). Scores: Brier, log-loss, and ECE in 10 equal-width bins.

## Command

```bash
node experiments/cf03c/run_gate.mjs --domain gate3c
```

The driver refuses to run if any file under `cognitive/` or `experiments/cf03c/` is uncommitted or modified, or if
`results/gate3c_result.json` already exists.

## Frozen evaluation values

| Item | Value |
|---|---|
| Domain / worlds | `gate3c`; `cf|gate3c|world|0…19`. Never used before. Count rule as CF-01b: n = max(20, ⌈(2.8·SD_dev/mean_dev)²⌉), capped at 60; dev differences Brier(CONST) − Brier(V3): SD 0.0035, mean 0.0040 → 6.0 → **n = 20** |
| Unit and intervals | The world. Paired differences with a percentile bootstrap, 10,000 resamples, 95%. For ECE, the weighted per-run statistic is recomputed on worlds resampled with replacement |
| Seeds | Environment `…|E1F|<family>|env`, agent `…|E1F|<family>|agent`, reliabilities `…|E1F|<family>|rel`; bootstrap `cf|stats|gate3c|cf03c|…` |
| **K1** skill over CONST | Per unseen family, Brier(CONST) − Brier(V3). All four: lower bound > −0.002. WIDE, BIMODAL, ARCSINE: lower bound > 0. HIGH is exempt from the strict form because its edges barely differ, so there is little a forecaster can resolve; this exemption is fixed now |
| **K2** calibration | Per unseen family, V3's weighted per-run ECE on the move event over all attempts: upper 95% bound ≤ 0.05 |
| **K3** skill over LAPLACE | Per unseen family, Brier(LAPLACE) − Brier(V3): lower bound > 0 |
| **K4** the repairs cost nothing | On U5, fresh worlds: Brier(V2) − Brier(V3) lower bound > −0.002; and MBVI3 − MBVI2 steps upper bound < 10 on E1 EXPLORED, E3, E1S EXPLORED and E2P PRE |
| **K5** validity | V3 makes no prediction outside [0, 1] in any family |
| **K6** infrastructure | Determinism (two in-process runs); all 127 tests pass (CF-01 57, E2′ 6, core 16, invariance 6, v1 8, mind 15, mind v3 19) |

**Verdict and what each verdict licenses** (fixed now):

| Verdict | Condition | Claim allowed |
|---|---|---|
| PASS | K1–K6 hold in every unseen family | "v3 is calibrated and more skilful than a constant forecaster across the five tested reliability families", subject to an independent review of the evidence before the claim is used |
| PARTIAL | K4–K6 hold; K1–K3 hold in some unseen families | The claim is made for the families that pass, by name, and the failures are reported with equal prominence |
| FAIL | K4 or K5 fails | v3 is not adopted; the CF-03b claim stays as amended (one generator) |
| INVALID | K6 fails | None |

Twelve family-level conditions must all hold for PASS, with no multiplicity correction; requiring all of them makes
the gate conservative as a whole. Everything else below is reported and is not pass/fail.

**Reported:** every forecaster's Brier, log-loss, ECE with interval, and the ECE noise floor (2,000 simulations);
the Murphy decomposition (reliability, resolution, uncertainty) from pooled bins; ECE split by untried/tried pair
and by exploration/test phase; the CF-03b modal-destination statistic; V2's count of invalid predictions; changes
declared per run; learned μ, S, ν; task steps and censoring per family; the battery contrasts against Dyna-Q and
against MBVI3 without change detection.

**Pre-declared expectations** (reported, not tested):

- V3_NOPOOL_MOVE is worse than V3 on Brier in every family: the pooled move prior is the component that matters.
- V3_NOPOOL_DEST equals V3 on the move event (it differs only in where a move leads), and is worse on the
  modal-destination statistic.
- BIMODAL is the family most likely to fail, because the model assumes one population of edges.

## Development-domain disclosure (`cf|dev|world|0…19`, row hash `cf0e3dda…`; observed before this freeze)

Only U5 and the existing battery were run on dev. **No unseen family has been run on any domain**, including in
tests: the E1F test runs U5 only, and the family samplers are tested as pure functions.

| Measure (U5, dev) | Result |
|---|---|
| Brier: V3 0.1924 · V2 0.1923 · CONST 0.1964 · LAPLACE 0.2067 · V1 0.2143 | |
| Brier(CONST) − Brier(V3) | +0.0040 [0.0025, 0.0055] |
| Brier(LAPLACE) − Brier(V3) | +0.0144 [0.0128, 0.0159] |
| Brier(V2) − Brier(V3) | −0.0001 [−0.0003, −0.0000]: v3 is not better than v2 on this family |
| ECE: V3 0.033 [0.030, 0.036]; noise floor 0.030 | |
| **ECE: CONST 0.028 [0.022, 0.035]** | The constant forecaster is at least as well calibrated as V3 |
| Resolution: V3 0.0049 · LAPLACE 0.0071 · CONST 0.0000 | |
| ECE on a pair's first attempt: V3 0.095 | First attempts are poorly calibrated |
| MBVI3 − MBVI2 steps | E1 0 · E3 0 · E2P 0 · E1S −0.4 [−1.3, 0.3] |
| Changes declared per run on E1S (stationary) | 0.30 worse, 0.10 better |

**What the dev numbers already say, declared before the run.** On the development family the review was right:
calibration alone does not separate the model from a constant, which is as well calibrated. The model's advantage
over the constant is real but small (Brier 2% lower), and comes from resolution. v3 is a repair, not an
improvement, over v2 on this family. K1 therefore tests the property that matters, and K2 alone would be a weak
criterion.

**Not tested by this gate.** Worlds where an action has several destinations (the environment has none);
calibration after a change; worlds larger than 24 nodes.
````

## Appendix B. CF-03c results record

File: `experiments/cf03c/results/RESULTS.md` · SHA-256 `7feb8d2317e743e645fabe1a07a3ec246b88d918c4320bbdc15ec4ea96f868c5` · 153 lines

````markdown
# CF-03c Gate Results — calibration robustness of world model v3

**Verdict: CF-03c PARTIAL. The model's calibration claim does not generalise.** Of four reliability families it
had never been run on, the criteria held in one (BIMODAL) and failed in three (WIDE, ARCSINE, HIGH).

The two repairs themselves hold: no prediction outside [0, 1] anywhere, and no cost on the development family.

The gate was run once. Nothing was re-run or tuned after the outcome.

| Item | Value |
|---|---|
| Evidence category | Development evaluation gate. Not confirmatory; local commits; no independent reproduction |
| Command | `node experiments/cf03c/run_gate.mjs --domain gate3c` (exit 0) |
| Code and spec | HEAD `2821603`; `GATE_SPEC.md` SHA-256 `ca53cce7…d8a9`; frozen before the run |
| Environment | Node v24.15.0, win32-x64 |
| Result file | `gate3c_result.json`, SHA-256 `4792ea41…cf91`; row hash `f2ed201f…5083` |
| Worlds | `cf|gate3c|world|0…19`, five families each; 0 excluded; 0 censored test episodes |
| Tests | 127/127; two in-process runs identical |

## What may be claimed

Under the verdict table frozen in the specification:

- **Claimed:** on BIMODAL worlds, and on fresh worlds of the development family U5, v3 is calibrated within the
  limit and more skilful than both a constant forecaster and a per-pair Laplace forecaster.
- **Not claimed, because it failed:** calibration or skill "across reliability families". On WIDE and ARCSINE a
  per-pair Laplace forecaster with no sharing between pairs is **better** than the model and the model's
  calibration error exceeds the limit. On HIGH the constant forecaster is **better** than the model.
- **The CF-03b claim stays as amended:** calibrated on worlds from the generator the model was developed on.

## Criteria by family

| Family | K1 not worse than CONST | K1 better than CONST | K2 ECE upper bound ≤ 0.05 | K3 better than LAPLACE | Holds |
|---|---|---|---|---|---|
| WIDE (0.1 + 0.9u) | yes | yes | **no** (0.0553) | **no** | **no** |
| BIMODAL (0.95 / 0.55) | yes | yes | yes (0.0468) | yes | **yes** |
| ARCSINE | yes | yes | **no** (0.0548) | **no** | **no** |
| HIGH (0.9 + 0.1u) | **no** | exempt | yes (0.0166) | yes | **no** |

| Other criteria | Result | Held |
|---|---|---|
| K4 Brier(V2) − Brier(V3) on U5 | −0.0002 [−0.0005, 0.0000] (limit: lower bound > −0.002) | yes |
| K4 MBVI3 − MBVI2 steps | E1 0 · E3 0 · E2P 0 · E1S −0.3 [−0.8, 0.0] | yes |
| K5 invalid predictions by V3 | 0 in every family | yes |
| K6 determinism and tests | identical runs; 127/127 | yes |

## The numbers

Brier score on the move event over all attempts (lower is better). **Bold** marks the best in each family.

| Family | V3 | V2 | CONST | LAPLACE | V3 without pooled move prior | V1 |
|---|---|---|---|---|---|---|
| U5 (development) | 0.1902 | **0.1900** | 0.1940 | 0.2051 | 0.2072 | 0.2123 |
| WIDE | 0.2158 | 0.2158 | 0.2499 | **0.2112** | 0.2123 | 0.2207 |
| BIMODAL | 0.1769 | **0.1768** | 0.1944 | 0.1859 | 0.1880 | 0.1895 |
| ARCSINE | 0.1959 | 0.1957 | 0.2409 | **0.1942** | 0.1958 | 0.1999 |
| HIGH | 0.0502 | 0.0500 | **0.0478** | 0.0935 | 0.0960 | 0.0781 |

Paired differences (positive means V3 is better), mean and 95% interval over 20 worlds:

| Family | Brier(CONST) − Brier(V3) | Brier(LAPLACE) − Brier(V3) |
|---|---|---|
| U5 | +0.0038 [0.0020, 0.0059] | +0.0149 [0.0135, 0.0164] |
| WIDE | +0.0341 [0.0302, 0.0380] | **−0.0046 [−0.0055, −0.0037]** |
| BIMODAL | +0.0175 [0.0156, 0.0194] | +0.0090 [0.0071, 0.0108] |
| ARCSINE | +0.0450 [0.0390, 0.0513] | **−0.0017 [−0.0031, −0.0001]** |
| HIGH | **−0.0024 [−0.0026, −0.0021]** | +0.0433 [0.0427, 0.0441] |

Calibration error (weighted per-run ECE, interval by bootstrap over worlds) and its noise floor:

| Family | V3 ECE | Noise floor | CONST ECE | V3 on a pair's first attempt |
|---|---|---|---|---|
| U5 | 0.033 [0.029, 0.037] | 0.030 | 0.025 [0.020, 0.029] | 0.096 |
| WIDE | 0.050 [0.045, 0.055] | 0.039 | 0.049 [0.043, 0.055] | 0.118 |
| BIMODAL | 0.043 [0.040, 0.047] | 0.034 | 0.030 [0.024, 0.036] | 0.119 |
| ARCSINE | 0.050 [0.046, 0.055] | 0.040 | 0.042 [0.034, 0.051] | 0.105 |
| HIGH | 0.014 [0.012, 0.017] | 0.013 | 0.008 [0.006, 0.010] | 0.072 |

**In every family the constant forecaster's calibration error is as low as the model's or lower.** Calibration
error does not measure whether a model knows anything. What separates the model from a constant is resolution:

| Family | Resolution: V3 | CONST | LAPLACE |
|---|---|---|---|
| U5 | 0.0059 | 0.0005 | 0.0063 |
| WIDE | 0.0351 | 0.0019 | 0.0399 |
| BIMODAL | 0.0203 | 0.0009 | 0.0210 |
| ARCSINE | 0.0484 | 0.0041 | 0.0516 |
| HIGH | 0.0000 | 0.0000 | 0.0001 |

Learned hyper-parameters: U5 μ 0.738, S mostly 8; WIDE μ 0.501, S 2–4; BIMODAL μ 0.736, S 2–4; ARCSINE μ 0.584,
S 1–4; HIGH μ 0.950, S 16–64.

## Why it failed where it failed (descriptive; not tested)

- **WIDE and ARCSINE.** Edge reliabilities are spread wide. The model learns a weak pooled prior (S 2–4), close to
  the Laplace prior (S = 2), but shrinks each pair slightly more than Laplace does, which lowers resolution
  (0.0351 against 0.0399 on WIDE). Sharing between pairs helps when pairs are alike and costs when they are not.
- **HIGH.** Every edge is nearly reliable, so there is nothing to resolve and the constant is hard to beat. The
  model is slightly worse than the constant on first attempts (ECE 0.072 against 0.045): the impassable-exit
  component multiplies every untried pair's move probability by 0.95, which under-predicts when no exit is
  impassable.
- **First attempts are poorly calibrated in every family** (0.07–0.12), for the same reason and because the pooled
  mean is still being learned.

## Pre-declared expectations against the outcome

| Expectation | Outcome |
|---|---|
| V3 without the pooled move prior is worse than V3 in every family | **Wrong.** Worse on U5, BIMODAL and HIGH; **better on WIDE** (−0.0035 [−0.0045, −0.0026]); no different on ARCSINE (−0.0001 [−0.0016, 0.0015]) |
| V3 without the pooled novelty rate equals V3 on the move event and is worse on the modal-destination statistic | Right: differences of exactly 0 on the move event; modal ECE 0.064–0.089 against 0.030–0.058 |
| BIMODAL is the family most likely to fail | **Wrong.** It is the only one that passed |

The second row settles a question from the CF-03b review: the pooled **move** prior is what moved CF-03b's
calibration statistic on the development family, and the pooled novelty rate matters only for where a move leads.

## The battery on fresh worlds (reported)

| Task | DYNAQ | MBVI2 | MBVI3 | MBVI3 without change detection |
|---|---|---|---|---|
| E1 EXPLORED | 30.3 | 20.3 | 20.3 | 20.3 |
| E3 | 190.6 | 41.8 | 41.8 | 445.0 |
| E1S EXPLORED | 51.9 | 26.2 | 25.9 | 26.1 |
| E2P PRE | 28.9 | 19.2 | 19.2 | 152.2 |

MBVI3 and MBVI2 are identical on the three deterministic tasks. Removing change detection costs +403 steps on
reward relocation [275, 532] and +133 on the detour [105, 164]. DYNAQ − MBVI3: E3 +148.8 [50.9, 270.2], E1
+10.1 [7.9, 12.5], E1S +26.0 [15.0, 39.9], E2P +9.7 [6.7, 13.2]. Changes declared on stationary families: at most
0.2 per run.

## What this shows, and what it does not

**Shown:**
- Both defects are repaired without cost on the development family.
- The model is more skilful than a constant forecaster wherever edges differ from each other (WIDE, BIMODAL,
  ARCSINE, U5), by 2% to 19% lower Brier score.
- Pooling across pairs is a real gain in three families and a real loss in one.

**Not shown, or shown false:**
- **General calibration.** False as a general claim: fails the limit in two families.
- **That the pooled prior is the right model.** A per-pair Laplace rule beats it on wide distributions.
- **That any of this changes behaviour.** Task steps were not a criterion here; MBVI3 equals MBVI2.
- Worlds with several destinations per action, calibration after a change, larger worlds: untested.

## Consequences

1. The model keeps its repairs (v3 replaces v2 as the model new work builds on).
2. The claim stays narrow. Any text saying the model "is calibrated" must name the family.
3. Calibration error is dropped as a headline statistic. Brier score with its decomposition, against the constant
   and Laplace forecasters, is the measure from now on.
4. Two candidate repairs are recorded and **not** made here, because they would be tuning after the result: let
   the strength grid include values below 1 so the pooled prior can become weaker than Laplace; and learn the
   impassable-exit weight from data instead of fixing it at 0.05. Either needs its own frozen gate on a new domain.
````

## Appendix C. CF-04 frozen specification

File: `experiments/cf04/GATE_SPEC.md` · SHA-256 `ee0a0ffe8f622a0dc1a5bfe79604e1d02d68a2caf5ee19f2683445463c404f17` · 114 lines

````markdown
# CF-04 Gate Specification — hidden change and reliability arbitration (frozen)

**Status.** Frozen in the CF-04 implementation commit, before the `gate4` domain was run.

- Development evaluation gate, not confirmatory. Commits are local until the owner authorises a push.
- The result is bound to the commit it ran at.

## The question

Decision AD-2 proposed an "executive" for MiniFlyWire in the only form the literature supports for small agents:
two complete controllers and an arbiter that hands control to whichever is currently more reliable. The
independent review judged that decision weak, because the planner is already near the ceiling. This gate asks:
**when the world changes without warning, does arbitration between the planner and a habit learner do better than
the planner alone?** A "no" is an acceptable and useful answer.

## Task E4 (`cognitive/testbed/task_e4.mjs`)

Hidden per-edge reliabilities U[0.5, 1]. The agent is never told that anything changed.

| Phase | Content |
|---|---|
| A pre-exposure | 600 steps, no reward, no cue |
| B training | Goal cued and rewarded, 30 episodes from the start node (distance ≥ 3) |
| C change | An edge on a shortest route is blocked; 15 episodes |
| D reversal | The block is removed; 15 episodes |

Arms: **CHANGE** (the edge on the route) and **SHAM** (an edge on no shortest route; the route never changes).
Windows, in steps: `post` = first 3 episodes of C; `postAll` = all of C; `return` = all of D; `metric` = C + D.

## Agents

| Kind | Definition |
|---|---|
| MBVI3 | The planner alone (world model v3 + value iteration) |
| MBVI3_NOCHANGE | The planner without change detection (the task-admission contrast) |
| QL, DYNAQ | Habit learner alone; Dyna-Q |
| **ARB** | Planner and Q-learning both learn from every step. The habit acts while (smoothed planner excess error − smoothed habit excess error) > θ = 0.05. Planner error = 1 − p(observed outcome) minus its expectation under the model's own prediction; habit error = \|TD error\| minus its own slow average; smoothing rate 0.1 (`cognitive/mind/arb/agent.mjs`) |
| ARB_T10 | The same with θ = 0.1, at which one maximal surprise is not enough to hand over control |
| **RANDSWITCH** | The same two controllers; the habit acts at random with the share ARB showed in that world and arm. The control for "any switching helps" |
| ORACLE | Privileged shortest-path reference |

## Command

```bash
node experiments/cf04/run_gate.mjs --domain gate4
```

The driver refuses to run if any file under `cognitive/` or `experiments/cf04/` is uncommitted or modified, or if
`results/gate4_result.json` already exists.

## Frozen evaluation values

| Item | Value |
|---|---|
| Domain / worlds | `gate4`; `cf|gate4|world|0…54`. Never used before. Count rule as CF-01b: n = max(20, ⌈(2.8·SD_dev/mean_dev)²⌉), capped at 60, on the dev differences of the primary contrast A1: SD 26.2, mean −9.9 → 54.9 → **n = 55** |
| Unit and intervals | The world; paired differences; percentile bootstrap, 10,000 resamples, 95% |
| Seeds | Environment `…|E4|env`, agent `…|E4|agent`, layout `…|E4|layout`, reliabilities `…|E4|rel`; shared by every agent and arm |
| **T1** the task detects adaptation | CHANGE, `post`: MBVI3_NOCHANGE − MBVI3, mean > 0 and lower bound > 0 |
| **T2** the sham is null | The same contrast in SHAM has upper bound < 10 steps, and CHANGE contrast − SHAM contrast has lower bound > 0 |
| **A1** arbitration helps | CHANGE, `metric`: MBVI3 − ARB, mean > 0 and lower bound > 0 |
| **A2** more than random switching | CHANGE, `metric`: RANDSWITCH − ARB, lower bound > 0 |
| **A3** no cost when nothing relevant changes | SHAM, `metric`: ARB − MBVI3, upper bound < 10 steps |
| **A4** the arbiter acts | The habit decides at least once in at least half the worlds |
| Infrastructure | Determinism (two in-process runs); all 136 tests pass |

| Verdict | Condition | Consequence, fixed now |
|---|---|---|
| ARBITRATION SUPPORTED | T1, T2, A1–A4 | Independent review of the evidence, then arbitration enters the integrated agent |
| ARBITRATION NOT SUPPORTED | T1, T2 hold; some of A1–A4 fail (listed). "HARMFUL" is added if ARB − MBVI3 on `metric` has lower bound > 0 | Arbitration is **not** built into the agent at this scale. AD-2 is recorded as not supported by evidence. The question may be reopened only on a task where the planner alone is shown to be far from the reference |
| TASK NOT ADMITTED | T1 or T2 fails | No conclusion about arbitration; the task is redesigned |
| INVALID | Infrastructure fails | None |

Stage B is read for ARB (θ = 0.05). ARB_T10 is reported with the same statistics and is not pass/fail.

**Reported:** every window for every agent; MBVI3 − ORACLE on `post` and `return` (the room left for any
mechanism); how often each agent uses the reopened edge; ARB's habit share, switches, disagreement rate and
decisive habit decisions in each arm; QL and DYNAQ against MBVI3.

## Development-domain disclosure (`cf|dev|world|0…19`, row hash `decd2da2…`; observed before this freeze)

The arbiter's threshold was set in two steps on dev, and both are disclosed.

| Step | θ | What was seen |
|---|---|---|
| 1 | 0.1 (the first a-priori value) | The habit acted in 4% of decisions. ARB − MBVI3 on `postAll` +0.4 [−4.5, 4.5]: no difference. A unit test then showed that one maximal surprise adds exactly 0.1 to the signal and so could never cross this threshold |
| 2 | 0.05 (frozen as ARB; step 1 kept as ARB_T10) | The habit acted in 16% of decisions |

Dev results of the frozen design:

| Measure | Dev result |
|---|---|
| T1: MBVI3_NOCHANGE − MBVI3, `post`, CHANGE | +101.7 [67.3, 140.8] (holds) |
| T2: the same in SHAM; CHANGE − SHAM | −1.1 [−3.1, 0.0]; +102.8 [68.8, 143.1] (holds) |
| **A1: MBVI3 − ARB, `metric`** | **−9.9 [−20.6, 1.8] (fails; ARB needs more steps)** |
| **A2: RANDSWITCH − ARB** | **−5.3 [−15.4, 4.6] (fails)** |
| A3: ARB − MBVI3, SHAM | −9.9 [−27.1, 1.3] (holds) |
| A4 | 20 of 20 worlds (holds) |
| ARB − MBVI3 by window | `post` +4.8 [1.9, 8.3] · `postAll` +10.0 [2.7, 17.4] · `return` −0.1 [−6.5, 5.8] |
| ARB_T10: MBVI3 − ARB_T10, `metric` | +4.5 [−5.5, 16.3] |
| Room left: MBVI3 − ORACLE | `post` +7.2 [1.7, 13.4] · `return` +23.0 [13.5, 33.2] |
| Reopened edge used in D (of 15 episodes) | ORACLE 15.0 · MBVI3 0.8 · ARB 1.2 · DYNAQ 5.8 · QL 0.7 |
| Habit learner alone: QL − MBVI3, `metric` | +415.6 [279.2, 561.8] |

**Declared before the run.** On dev, arbitration fails its own criteria at both thresholds: at 0.1 it is nearly
inert, and at 0.05 it is worse than the planner right after the change, because it hands control to a habit
learner that is far worse than the planner (QL needs 416 more steps). The expected verdict is ARBITRATION NOT
SUPPORTED. The gate is run to establish that on fresh worlds with adequate sample size, not to rescue the
mechanism; no parameter was tuned toward a pass.

The only room the planner leaves is in phase D: it almost never retries an exit it has learned is blocked, so it
stays on the detour after the block is removed (+23 steps against the reference). Neither controller addresses
that, and arbitration between them cannot. A mechanism that would (a bonus for exits not tried recently) is noted
and **not** built here.
````

## Appendix D. CF-04 results record

File: `experiments/cf04/results/RESULTS.md` · SHA-256 `941dfa8882100ba0bbd5586915c79498a48e7688332ba52f808baa765229e139` · 110 lines

````markdown
# CF-04 Gate Results — hidden change and reliability arbitration

**Verdict: CF-04 ARBITRATION NOT SUPPORTED (A1, A2) — HARMFUL.** The task is a valid instrument (T1 and T2 hold).
On it, arbitration between the planner and a habit learner is **worse** than the planner alone, and worse than
switching between the same two controllers at random.

This was the expected verdict, declared in the specification before the run. The gate was run once. Nothing was
re-run or tuned after the outcome.

| Item | Value |
|---|---|
| Evidence category | Development evaluation gate. Not confirmatory; local commits; no independent reproduction |
| Command | `node experiments/cf04/run_gate.mjs --domain gate4` (exit 0) |
| Code and spec | HEAD `2ae0311`; `GATE_SPEC.md` SHA-256 `ee0a0ffe…4f17`; frozen before the run |
| Environment | Node v24.15.0, win32-x64 |
| Result file | `gate4_result.json`, SHA-256 `069f44bd…0626`; row hash `9e52fe61…e181` (880 rows) |
| Worlds | `cf|gate4|world|0…54`; 0 excluded |
| Tests | 136/136; two in-process runs identical |

## Criteria

All differences are in steps, mean and 95% interval over 55 worlds. `metric` is every step after the change (15
episodes with the block, then 15 after it is removed).

| Criterion | Statistic | Result | Held |
|---|---|---|---|
| T1 the task detects adaptation | Planner without change detection − planner, first 3 episodes after the block | +160.7 [135.2, 188.2] | **yes** |
| T2 the sham is null | The same contrast when a harmless edge is blocked; and the difference of the two | 0.0 [−0.3, 0.3]; +160.7 [135.4, 188.5] | **yes** |
| **A1 arbitration helps** | Planner − ARB on `metric` | **−13.8 [−20.0, −7.2]** | **no** |
| **A2 more than random switching** | RANDSWITCH − ARB on `metric` | **−11.2 [−20.0, −3.6]** | **no** |
| A3 no cost when nothing relevant changes | ARB − planner, sham arm | +0.3 [−2.4, 2.7] | yes |
| A4 the arbiter acts | Worlds in which the habit decided at least once | 55 of 55 | yes |
| Harm | ARB − planner on `metric`, lower bound > 0 | +13.8 [7.1, 20.1] | **harmful** |

## Where the cost falls

| Window | ARB − planner | ARB_T10 − planner (θ = 0.1, reported) |
|---|---|---|
| First 3 episodes after the block | **+7.6 [5.4, 9.9]** | +3.1 [0.9, 5.4] |
| All 15 episodes with the block | **+16.0 [12.4, 19.8]** | +3.8 [1.3, 6.5] |
| 15 episodes after the block is removed | −2.3 [−8.2, 3.0] | −4.6 [−9.8, −0.0] |
| Everything after the change | **+13.8 [7.1, 20.1]** | −0.8 [−6.5, 4.6] |

Arbitration costs steps exactly when it is meant to help: right after the change. That is when the planner is
surprised, the arbiter hands control to the habit learner, and the habit learner is the worse controller.

| Arbiter behaviour | ARB (θ = 0.05) | ARB_T10 (θ = 0.1) |
|---|---|---|
| Share of decisions made by the habit, change arm | 16.6% | 3.7% |
| The same, sham arm | 14.2% | 2.7% |
| Switches per run | 90.1 | 28.4 |
| Decisions where the two controllers disagreed | 40.9% | 40.9% |
| Decisions where the habit acted and disagreed | 75.1 per run | 16.2 per run |

The habit share is almost as high when nothing relevant changes (14.2%) as when it does (16.6%): most switching is
driven by ordinary noise, not by the change.

## Mean steps by agent (change arm)

| Agent | Before the change (last 5 training episodes) | First 3 after the block | 15 with the block | 15 after removal | Reopened edge used (of 15 episodes) |
|---|---|---|---|---|---|
| ORACLE (privileged) | 26.6 | 24.3 | 120.8 | 80.0 | 15.0 |
| **Planner (MBVI3)** | 27.4 | 31.6 | 127.3 | 120.1 | 0.9 |
| Planner without change detection | 27.3 | 192.4 | 293.1 | 117.9 | 1.2 |
| ARB | 27.6 | 39.2 | 143.3 | 117.8 | 2.9 |
| ARB_T10 | 26.7 | 34.8 | 131.0 | 115.5 | 2.0 |
| RANDSWITCH | 27.9 | 34.5 | 136.1 | 113.7 | 2.9 |
| DYNAQ | 39.0 | 50.3 | 198.4 | 164.3 | 4.9 |
| QL (habit alone) | 33.8 | 341.9 | 1,054.5 | 143.9 | 3.2 |

Censored episodes: QL 233, planner without change detection 28, DYNAQ 5, every other agent 0. Censored episodes
count their cap of 200 steps, so QL's true cost is understated.

Other contrasts on `metric`: QL − planner +951.1 [709.0, 1,203.6]; DYNAQ − planner +115.3 [93.5, 138.1];
RANDSWITCH − planner +2.5 [−5.6, 9.9]. Mean route length 3.9 steps, 5.8 with the block.

## What this shows

1. **The task works.** A planner that cannot detect change needs 161 more steps in the first three episodes after
   the block, and a harmless block produces no difference.
2. **Arbitration between these two controllers does not help, and at θ = 0.05 it hurts.** The habit learner is not
   a competent fallback: alone it needs about 950 more steps than the planner. Handing it control when the planner
   is surprised replaces a controller that recovers within a few steps with one that does not.
3. **A more conservative arbiter (θ = 0.1) is close to inert**: no overall difference from the planner
   (−0.8 [−6.5, 4.6]), a small cost with the block (+3.8 [1.3, 6.5]), and a small gain after its removal
   (−4.6 [−9.8, −0.0]) whose interval touches zero. It was not a pass/fail arm and is not a result to build on.
4. **Change detection is the mechanism that matters here.** Removing it costs +160.7 steps; this is the largest
   effect in the experiment.
5. **The room that is left is in recovery, not in adaptation.** After the block the planner is within 6.5 steps
   of the reference [4.1, 9.1]. After the block is *removed* it is 40.1 steps behind [32.5, 48.1], because it
   retries the reopened exit in 0.9 of 15 episodes: once it believes an exit is dead it never tests it again.

## What it does not show

- That arbitration can never help. It shows that arbitration between *this* planner and *this* habit learner does
  not help on 24-node worlds, where planning is cheap and the planner is near the reference. The specification
  fixed the condition for reopening the question: a task on which the planner alone is far from the reference.
  Compute was not counted; an arbiter whose purpose is to save computation was not tested.
- Anything beyond one world size, one reliability distribution and one kind of change.
- Anything about the legacy agent.

## Consequences (fixed in the specification before the run)

1. **Arbitration is not built into the integrated agent.** Decision AD-2 is recorded as not supported by
   evidence at this scale. `cognitive/mind/arb/` stays in the repository as the tested mechanism and is used by
   nothing else.
2. The next mechanism question is the one the data point to: **recovery after a change is reversed**. The planner
   leaves 40 steps on the table because it never re-tests a dead exit. A candidate is noted (a bonus for exits not
   tried recently) and is **not** built here; it needs its own frozen gate, with a count-model Dyna-Q+ baseline.
````

## Appendix E. CF-03b results record, including the amendment after internal review (the claim CF-03c tested)

File: `experiments/cf03b/results/RESULTS.md` · SHA-256 `8fde803cb345db679cff4422fefa6d087f86335bf4db7699b71b54ce0726a993` · 148 lines

````markdown
# CF-03b Gate Results — world model v2 (calibration repair)

**Verdict: CF-03b PASS.** All seven criteria held on 20 fresh `gate3b` worlds. The gate was run once. Nothing was
re-run or tuned after the outcome.

CF-03 itself stays **FAIL** on its criterion A4. This is a new model tested on new worlds, not a re-scoring.

| Item | Value |
|---|---|
| Evidence category | Development evaluation gate. Not confirmatory; local commits; no independent reproduction |
| Command | `node experiments/cf03b/run_gate.mjs --domain gate3b` (exit 0) |
| Code and spec | HEAD `1968083`; `GATE_SPEC.md` SHA-256 `e75e7e1a…3227`; frozen before the run |
| Environment | Node v24.15.0, win32-x64 |
| Result file | `gate3b_result.json`, SHA-256 `a3f8b116…4d08`; row hash `e328d874…1a72` (900 rows) |
| Worlds | `cf|gate3b|world|0…19`; 0 excluded |
| Tests | 108/108 |

## Acceptance

| Criterion | Statistic | 95% CI | Rule | Held |
|---|---|---|---|---|
| B1 calibration (E1S) | MBVI2 ECE **0.028** | — | ≤ 0.05 | **yes** |
| B2 improvement (E1S) | ECE(MBVI) − ECE(MBVI2) = **+0.076** | [0.068, 0.084] | mean > 0, lower bound > 0 | **yes** |
| B3 E3 reward relocation | DYNAQ − MBVI2 = **+171.0** steps | [52.3, 317.5] | mean > 0, lower bound > 0 | **yes** |
| B4 E1 latent learning | MBVI2 − DYNAQ = **−9.3** | [−12.0, −6.8] | upper bound < 10 | **yes** (MBVI2 better) |
| B5 model log-likelihood (E1S) | MBVI2 − uniform = **+0.735** nats | [0.711, 0.758] | mean > 0, lower bound > 0 | **yes** |
| B6 no regression against MBVI | E1 0.0 [0, 0] · E3 −5.1 [−12.7, 3.3] · E1S −0.5 [−2.7, 1.7] · E2P −0.4 [−0.6, −0.2] | — | every upper bound < 10 | **yes** |
| B7 infrastructure | Determinism; 108/108 tests; ORACLE ≤ every learner on E1, E3, E2P | — | all | **yes** |

## Calibration in detail (E1S, hidden reliability U[0.5, 1] per edge)

| Agent | Weighted per-run ECE | Pooled ECE | Noise floor (mean; 95th percentile) |
|---|---|---|---|
| MBVI (v1) | 0.104 | — | — |
| **MBVI2** | **0.028** | 0.010 | 0.030; 0.034 |
| NOPOOL | 0.134 | 0.133 | 0.040; 0.044 |
| NOBLOCK | 0.026 | 0.011 | 0.029; 0.033 |
| GLOBALRESET | 0.028 | 0.010 | 0.030; 0.034 |

The noise floor is the weighted per-run ECE that a forecaster whose bin probabilities were exactly right would
score on the same bin occupancies (2,000 simulations). **MBVI2's 0.028 is inside that band**, so on this statistic
it cannot be told apart from a perfectly calibrated forecaster. The statistic cannot resolve anything below about
0.03; the pooled figure (0.010) is the sharper measure.

MBVI2's pooled reliability table over 10,865 scored predictions:

| Mean predicted | 0.36 | 0.47 | 0.56 | 0.66 | 0.75 | 0.84 | 0.91 |
|---|---|---|---|---|---|---|---|
| Realised hit rate | 0.56 | 0.55 | 0.60 | 0.67 | 0.76 | 0.84 | 0.88 |
| Predictions | 32 | 170 | 786 | 2,618 | 4,413 | 2,598 | 247 |

The two lowest bins still under-predict (0.36 → 0.56, 0.47 → 0.55). They hold 2% of predictions.

Learned on E1S: pooled move rate μ = 0.739 (the true mean reliability is 0.75); strength S = 8 in 14 worlds, 16 in
four, 32 and 64 in one each; destination-novelty rate ν = 0.0006.

## Reported, with their pre-declared directions

| Measure | Value | Direction confirmed? |
|---|---|---|
| NOPOOL − MBVI2, ECE | +0.106 [0.096, 0.115] | **yes**: pooling is what repairs calibration |
| NOBLOCK − MBVI2, E2P | +4.4 [3.6, 5.2] | **yes**: the impassable-exit component helps the detour |
| GLOBALRESET − MBVI2, E3 | +6.7 [−1.1, 13.3] | **no**, inconclusive: the interval includes 0 |

Reported without a declared direction:

| Measure | Value | Reading |
|---|---|---|
| NOBLOCK − MBVI2, E3 | **−5.7 [−10.9, −1.5]** | The impassable-exit component **costs** steps on reward relocation |
| NOBLOCK − MBVI2, ECE | −0.002 [−0.006, 0.002] | It does not affect calibration |
| NOPOOL − MBVI2, E2P | +2.2 [1.7, 2.8] | Pooling helps the detour slightly |
| NOPOOL − MBVI2, E3 / E1 NAIVE / E1S | +2.1 [−3.1, 6.9] / −0.7 [−2.0, 0.3] / +0.5 [−1.1, 1.9] | No measurable behavioural effect of pooling |
| E1 NAIVE: MBVI2 − MBVI | **+2.3 [0.1, 5.6]** | MBVI2 is slightly **worse** than MBVI without pre-exposure |
| E1 NAIVE: DYNAQ − MBVI2 | +43.0 [10.4, 81.6] | — |
| E1S: DYNAQ − MBVI2 | +62.4 [19.8, 112.0] | — |
| E2P: DYNAQ − MBVI2 | +9.6 [6.9, 12.5] | — |
| Log-likelihood: MBVI2 − MBVI | +0.105 [0.095, 0.117] nats | The v2 model predicts better |

## Mean test-phase steps

| Cell | RANDOM | QL | DYNAQ | ORACLE | MBVI | **MBVI2** | NOPOOL | NOBLOCK | GLOBALRESET |
|---|---|---|---|---|---|---|---|---|---|
| E1 EXPLORED | 352.4 | 189.6 | 28.8 | 19.5 | 19.5 | **19.5** | 19.5 | 19.5 | 19.5 |
| E1 NAIVE | 335.6 | 173.6 | 110.8 | 19.5 | 65.5 | **67.8** | 67.1 | 66.2 | 67.8 |
| E3 | 287.2 | 522.5 | 215.5 | 18.5 | 49.6 | **44.5** | 46.6 | 38.9 | 51.2 |
| E1S EXPLORED | 425.8 | 223.7 | 89.0 | 27.2* | 27.2 | **26.7** | 27.1 | 26.4 | 26.7 |
| E2P PRE | 241.7 | 293.1 | 28.3 | 16.9 | 19.1 | **18.8** | 20.9 | 23.1 | 18.8 |

\* ORACLE ignores reliabilities, so it is not a bound on E1S.

MBVI2 censoring was 0% in every cell. Planning compute on E1S: 28.5 sweeps and 1,671 backups per decision (MBVI in
CF-03: 17.7 and 1,014); the 100-sweep budget was hit in 0.008% of decisions. The v2 model changes its predictions
for every pair after each observation, so value iteration has more to re-converge.

**Reference world `mfw-graph` (reported only):** E3: MBVI2 44, MBVI 65, DYNAQ 636. E1 NAIVE: MBVI2 85, MBVI 94,
DYNAQ 72, so both planners are worse than Dyna-Q there. E1S: MBVI2 28, MBVI 26.

## What this shows, and what it does not

**Shown, on 20 fresh 24-node worlds:**
- A model that pools what it learns across state–action pairs is calibrated to the limit this statistic can
  measure, where the CF-03 model was not, and it predicts transitions better (+0.105 nats).
- This did not cost task performance (B6), and the CF-03 advantages over Dyna-Q were re-established with the new
  model (B3–B5).
- The repair is attributable: removing pooling returns the calibration error to 0.134.

**Not shown:**
- **That calibration improves behaviour.** MBVI2 and MBVI need the same steps within noise on every task, and MBVI2
  is slightly worse on E1 NAIVE. On these worlds a planner does not need calibrated probabilities to act well.
  Calibration is expected to matter once something consumes the probabilities: arbitration between controllers and
  decisions about when to plan (CF-04). That is a prediction, not a result.
- **That the local reward change-point is better.** The direction was the declared one but the interval includes 0.
- **That the impassable-exit component is a net gain.** It helps the detour (+4.4) and costs on reward relocation
  (−5.7).
- **Generality.** Same limits as CF-03: 24-node worlds, full observability, one reliability distribution,
  stationary within a task phase, no independent reproduction. The pooled prior assumes pairs are exchangeable; a
  world with two distinct populations of edges has not been tested.
- **Anything about MiniFlyWire's legacy agent**, which did not take part (CF-02).

## Amendment after independent review (2026-11-13)

The text above is left as first written. An independent review
([`ARCHITECTURE_DECISIONS.md`](../../../docs/architecture/ARCHITECTURE_DECISIONS.md), "Independent falsification
review") found three statements stronger than the evidence. The gate verdict is unchanged; these corrections
govern how it may be cited.

1. **Withdrawn:** "it cannot be told apart from a perfectly calibrated forecaster". The reliability table above
   shows two low bins off by about two standard errors (0.36 → 0.56, n = 32; 0.47 → 0.55, n = 170). The correct
   statement is that the weighted per-run statistic is inside its noise band, and that the model under-predicts
   where it predicts below 0.5.
2. **Narrowed:** "calibrated" means *calibrated on worlds from the generator the model was developed on*.
   Reliabilities are U[0.5, 1]; the Beta with the same mean and variance has strength 8, and the model learned
   μ = 0.739 with S = 8 in 14 of 20 worlds. `gate3b` shares that generator with `dev`. The gate does not show
   calibration under any other reliability distribution, and it has no control showing that a forecaster which
   always outputs the pooled mean would fail.
3. **Corrected:** "This did not cost task performance" holds for the four B6 cells only. On E1 NAIVE, which B6
   does not cover, MBVI2 needed 2.3 more steps than MBVI [0.1, 5.6], and it used about 61% more sweeps per
   decision on E1S than MBVI did in the CF-03 run (28.5 against 17.7; different runs).

Also noted by the review: the NOPOOL ablation removes two pooled components at once, so it does not show which
one repairs calibration; and the statistic scores only pairs that have already moved.

## Open items carried forward

1. The impassable-exit trade-off (E2P gain, E3 cost) needs a task that isolates it before it is kept or dropped.
2. Calibration after a change is unmeasured; E1S is stationary.
3. The two low-probability bins still under-predict.
````

## Appendix F. Source: learned world model v3

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

## Appendix G. Source: planner agent MBVI3

File: `cognitive/mind/v3/agent.mjs` · SHA-256 `27914ab1ff68e4887b7d7768fcdb66108849bb2e6aea2abf934bd8b9d9bef1e4` · 64 lines

```js
// ==========================================================
// CF-03c mind — MBVI3: the CF-03 planning agent on world model v3
// ==========================================================
// Identical to cognitive/mind/mbvi2.mjs except for the model it learns (v3/world_model.mjs).  The planner, the
// optimism value, the greedy choice, the cue semantics and the quality log are the same, so a difference between
// MBVI2 and MBVI3 on the same world and seeds is a difference between the v2 and v3 models.
// ==========================================================
import { argmaxRandomTie } from '../../testbed/agent_util.mjs';
import { qValues, valueIteration } from '../../core/planner.mjs';
import { makeWorldModel3, WM3_DEFAULTS } from './world_model.mjs';

export const MBVI3_DEFAULTS = Object.freeze({ gamma: 0.95, budget: 100, theta: 1e-6, vOpt: 1, ...WM3_DEFAULTS });

export function makeMBVI3({ rng, params = {}, kind = 'MBVI3' }) {
  const P = { ...MBVI3_DEFAULTS, ...params };
  const model = makeWorldModel3(P);
  const V = new Map();
  let cue;                                   // undefined until the first act, so the first cue always (re)plans
  const compute = { decisions: 0, sweeps: 0, backups: 0, budgetHits: 0 };
  const quality = { n: 0, ll: 0, llUniform: 0, bins: Array.from({ length: 10 }, () => ({ n: 0, pred: 0, hit: 0 })) };
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
      if (model.countOf(obs.node, action) >= 1) {
        quality.n++;
        quality.ll += Math.log(model.probOf(obs.node, action, next.node));
        quality.llUniform += Math.log(1 / (obs.nActions + 1));
        const p = model.predict(obs.node, action);
        if (p.outcomes.length) {
          const [modal, pm] = p.outcomes.reduce((b, x) => (x[1] > b[1] ? x : b));
          const bin = quality.bins[Math.min(9, Math.floor(pm * 10))];
          bin.n++; bin.pred += pm; bin.hit += next.node === modal ? 1 : 0;
        }
      }
      model.update(obs.node, action, next.node, reward, done);
    },
    inspect() {
      const total = quality.bins.reduce((s, b) => s + b.n, 0);
      const ece = total ? quality.bins.reduce((s, b) => s + (b.n ? Math.abs(b.hit / b.n - b.pred / b.n) * b.n : 0), 0) / total : null;
      return {
        compute: { ...compute, backupsPerDecision: compute.decisions ? compute.backups / compute.decisions : 0, sweepsPerDecision: compute.decisions ? compute.sweeps / compute.decisions : 0, budgetHitShare: compute.decisions ? compute.budgetHits / compute.decisions : 0, budget: P.budget },
        quality: { n: quality.n, meanLL: quality.n ? quality.ll / quality.n : null, meanLLUniform: quality.n ? quality.llUniform / quality.n : null, ece, calibrated: total, bins: quality.bins.map((b) => ({ ...b })) },
        model: { states: model.states().size, ...model.stats(), ...model.hyper() },
      };
    },
    _model: model, _V: V,                     // test access only (tests never pass these to an environment)
  };
}
```

## Appendix H. Source: value-iteration planner

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

## Appendix I. Source: arbitration agent (ARB, RANDSWITCH)

File: `cognitive/mind/arb/agent.mjs` · SHA-256 `72b0f69fe88990209392388b3b0933c4b5f7f6141bc0baf2fded13dda1858ef8` · 79 lines

```js
// ==========================================================
// CF-04 mind — ARB: reliability arbitration between a planner and a habit learner (the mechanism under test)
// ==========================================================
// Two complete controllers learn from every transition:
//   planner  MBVI3 (world model v3 + value iteration), unchanged
//   habit    tabular one-step Q-learning with the QL baseline's update rule and parameters
// One selector chooses which controller's action is executed, and logs it.
//
// Reliability signals, each measured against that controller's own expected error so that irreducible noise does
// not count against it (the CF-03b review's objection to comparing raw errors):
//   planner  state-prediction error  spe = 1 - p_model(observed outcome), minus its expectation under the model's
//            own predictive distribution, 1 - sum_i p_i^2.  Mean zero when the model is right, positive when the
//            world has stopped behaving as the model says.
//   habit    |TD error| (clipped to 1), minus its own slow running average.
// Each excess is smoothed with rate `rate`.  The habit controller acts while
//       smoothed planner excess - smoothed habit excess > theta
// and the planner acts otherwise.
//
// Modes (params.mode):
//   RELIABILITY  the rule above                                   (kind ARB)
//   RANDOM       the habit acts with probability mfShare per decision, independently of any signal
//                (kind RANDSWITCH: the control for "any switching helps")
// inspect().control reports decisions, habit decisions and share, switches, disagreements (the two controllers
// proposed different actions) and decisive habit decisions (the habit acted AND disagreed with the planner).
// ==========================================================
import { argmaxRandomTie, makeTable } from '../../testbed/agent_util.mjs';
import { makeMBVI3 } from '../v3/agent.mjs';

export const ARB_DEFAULTS = Object.freeze({ alpha: 0.5, gamma: 0.95, epsilon: 0.1, rate: 0.1, slowRate: 0.01, theta: 0.05, mode: 'RELIABILITY', mfShare: 0 });

export function makeARB({ rng, params = {}, kind = 'ARB' }) {
  const P = { ...ARB_DEFAULTS, ...params };
  if (!['RELIABILITY', 'RANDOM'].includes(P.mode)) throw new Error(`unknown arbitration mode ${P.mode}`);
  const planner = makeMBVI3({ rng, params: P.planner ?? {} });
  const model = planner._model;              // the planner's own model, read for its predictive probabilities
  const Q = makeTable();
  const control = { decisions: 0, habitDecisions: 0, switches: 0, disagreements: 0, decisiveHabit: 0 };
  let eMB = 0, eMF = 0, slowMF = 0, last = null;
  return {
    kind,
    act(obs) {
      const aMB = planner.act(obs);
      const row = Q.row(obs.node, obs.goal, obs.nActions);
      const aMF = rng() < P.epsilon ? Math.floor(rng() * obs.nActions) : argmaxRandomTie(row, rng);
      const useHabit = P.mode === 'RANDOM' ? rng() < P.mfShare : eMB - eMF > P.theta;
      control.decisions++;
      if (useHabit) control.habitDecisions++;
      if (aMB !== aMF) { control.disagreements++; if (useHabit) control.decisiveHabit++; }
      if (last !== null && last !== useHabit) control.switches++;
      last = useHabit;
      return useHabit ? aMF : aMB;
    },
    observe(tr) {
      const { obs, action, reward, next, done } = tr;
      // planner signal, from the model as it stood BEFORE this transition
      const p = model.predict(obs.node, action);
      const expected = 1 - (p.self ** 2 + p.unknown ** 2 + p.outcomes.reduce((s, [, x]) => s + x ** 2, 0));
      const excessMB = (1 - model.probOf(obs.node, action, next.node)) - expected;
      // habit signal and update
      const row = Q.row(obs.node, obs.goal, obs.nActions);
      const delta = reward + (done ? 0 : P.gamma * Math.max(...Q.row(next.node, next.goal, next.nActions))) - row[action];
      const abs = Math.min(1, Math.abs(delta));
      const excessMF = abs - slowMF;
      slowMF += P.slowRate * (abs - slowMF);
      eMB += P.rate * (excessMB - eMB);
      eMF += P.rate * (excessMF - eMF);
      row[action] += P.alpha * delta;
      planner.observe(tr);
    },
    inspect() {
      const inner = planner.inspect();
      return {
        control: { ...control, habitShare: control.decisions ? control.habitDecisions / control.decisions : 0, signals: { planner: eMB, habit: eMF } },
        compute: inner.compute, model: inner.model,
      };
    },
  };
}
```

## Appendix J. Source: agent registry v4 (ARB variants)

File: `cognitive/testbed/registry_v4.mjs` · SHA-256 `0f05493f7f33b672239e339e16c95ba78873b85f5d07d5c1f4d6ea8a39c499d4` · 37 lines

```js
// ==========================================================
// CF-04 testbed — agent registry v4: the v3 agents plus the arbitration agent and its random-switch control
// ==========================================================
// The privileged-channel rule is the CF-01 rule (runner.mjs PRIVILEGED, unchanged): only ORACLE receives the oracle.
// Earlier kinds are built by their unchanged factories.
// ==========================================================
import { makeStream } from './rng.mjs';
import { PRIVILEGED } from './runner.mjs';
import { AGENTS_V3 } from './registry_v3.mjs';
import { makeARB } from '../mind/arb/agent.mjs';

export const ARB_VARIANTS = Object.freeze({
  ARB: Object.freeze({ mode: 'RELIABILITY' }),
  ARB_T10: Object.freeze({ mode: 'RELIABILITY', theta: 0.1 }),   // conservative threshold: one maximal surprise is not enough
  RANDSWITCH: Object.freeze({ mode: 'RANDOM' }),   // needs params.mfShare (the matched habit share)
});
export const ARB_FILES = Object.freeze(['agent.mjs']);
export const ARB_ALLOWED = Object.freeze(['../../testbed/agent_util.mjs', '../v3/agent.mjs']);
export const AGENTS_V4 = Object.freeze({
  ...AGENTS_V3,
  ...Object.fromEntries(Object.entries(ARB_VARIANTS).map(([k, v]) => [k, (opts) => makeARB({ ...opts, params: { ...v, ...opts.params }, kind: k })])),
});

export function agentOptionsV4(kind, env, rngLabel, params = {}) {
  const opts = { rng: makeStream(rngLabel), params };
  if (PRIVILEGED.includes(kind)) opts.oracle = Object.freeze({ bestAction: () => env.oracleBestAction() });
  return opts;
}

export function makeAgentForV4(kind, env, rngLabel, params = {}) {
  const factory = AGENTS_V4[kind];
  if (!factory) throw new Error(`unknown agent kind ${kind}`);
  const agent = factory(agentOptionsV4(kind, env, rngLabel, params));
  if (agent.privileged && !PRIVILEGED.includes(kind)) throw new Error(`${kind} claims privilege it is not granted`);
  return agent;
}
```

## Appendix K. Source: task E4 (hidden change and reversal)

File: `cognitive/testbed/task_e4.mjs` · SHA-256 `c7e8b06f3c411272bf6bde76d269b7c9c835e015f4044a502b32a0d082cb1b52` · 91 lines

```js
// ==========================================================
// CF-04 testbed — task E4: hidden change and its reversal, on stochastic worlds
// ==========================================================
// The agent is never told that anything changed.  Edge reliabilities are hidden and drawn U[0.5, 1] per edge (the
// E1S distribution, stream `${world}|E4|rel`).  Layout: start S, goal G, a blocked edge e on a shortest S->G path
// whose removal lengthens the route, and a sham edge on no shortest path (the E2' layout rule, stream
// `${world}|E4|layout`).
//
// Phases:
//   A  pre-exposure   600 steps, no reward, no cue, 50-step episodes from the start stream
//   B  training       goal G cued and rewarded, TRAIN episodes from S
//   C  change         the arm's manipulation, then POST episodes from S         (regime B)
//   D  reversal       the manipulation is undone, then RETURN episodes from S   (regime A again)
// Arms:
//   CHANGE   block e before C, unblock e before D
//   SHAM     block the sham edge before C, unblock it before D (the shortest route never changes)
// Windows (steps summed over the episodes of the window; a truncated episode counts its cap):
//   post      the first POST_WINDOW episodes of C   — how fast the agent adapts to the block
//   postAll   all episodes of C
//   return    all episodes of D                     — whether the agent recovers the short route once it reopens
//   stable    the last STABLE episodes of B         — performance before anything changes
// Seeds: environment `${world}|E4|env`, agent `${world}|E4|agent` (shared by every arm and agent kind: common random
// numbers).  Agents that expose inspect().control have it copied into the row.
// ==========================================================
import { GraphEnv } from './env.mjs';
import { distancesTo, edgeKey } from './worlds.mjs';
import { makeStream, shuffled } from './rng.mjs';
import { runEpisode, runSteps } from './runner.mjs';

export const E4_PARAMS = Object.freeze({ exploreSteps: 600, exploreEpisodeLength: 50, trainEpisodes: 30, postEpisodes: 15, returnEpisodes: 15, postWindow: 3, stableEpisodes: 5, cap: 200, minDistance: 3 });
export const E4_ARMS = Object.freeze(['CHANGE', 'SHAM']);

const onShortest = (dist, s, g, d, [u, v]) => dist[s][u] + 1 + dist[g][v] === d || dist[s][v] + 1 + dist[g][u] === d;

export function layoutE4(world, worldLabel) {
  const rnd = makeStream(`${worldLabel}|E4|layout`);
  const nodes = Array.from({ length: world.n }, (_, i) => i);
  const dist = nodes.map((t) => distancesTo(world, t));
  const pairs = shuffled(nodes.flatMap((s) => nodes.map((g) => [s, g])), rnd);
  for (const [s, g] of pairs) {
    const d = dist[g][s];
    if (d < E4_PARAMS.minDistance) continue;
    const blocked = shuffled(world.edges.filter((e) => onShortest(dist, s, g, d, e)), rnd)
      .find(([u, v]) => { const d2 = distancesTo(world, g, new Set([edgeKey(u, v)]))[s]; return d2 > d; });
    if (!blocked) continue;
    const sham = shuffled(world.edges.filter((e) => !onShortest(dist, s, g, d, e)), rnd)[0];
    if (!sham) continue;
    return { start: s, goal: g, blocked, sham, distance: d, detourDistance: distancesTo(world, g, new Set([edgeKey(...blocked)]))[s] };
  }
  return null;
}

export function reliabilitiesE4(world, worldLabel) {
  const rnd = makeStream(`${worldLabel}|E4|rel`);
  return world.edges.map(([u, v]) => [u, v, 0.5 + 0.5 * rnd()]);
}

const sum = (xs) => xs.reduce((a, b) => a + b, 0);

export function runE4({ world, worldLabel, kind, arm, params = {}, makeAgent }) {
  if (!E4_ARMS.includes(arm)) throw new Error(`E4 has no arm ${arm}`);
  const L = layoutE4(world, worldLabel);
  if (!L) return { task: 'E4', world: worldLabel, kind, arm, excluded: true };
  const P = E4_PARAMS;
  const env = new GraphEnv(world, { seedLabel: `${worldLabel}|E4|env`, maxSteps: P.cap });
  for (const [u, v, p] of reliabilitiesE4(world, worldLabel)) env.setReliability(u, v, p);
  const agent = makeAgent(kind, env, `${worldLabel}|E4|agent`, params[kind] ?? {});
  const edge = arm === 'CHANGE' ? L.blocked : L.sham;
  env.setRewardNode(null); env.setCue(null);
  runSteps(env, agent, { total: P.exploreSteps, episodeLength: P.exploreEpisodeLength });
  env.setRewardNode(L.goal); env.setCue(L.goal);
  const run = (n) => Array.from({ length: n }, () => runEpisode(env, agent, { start: L.start }));
  const train = run(P.trainEpisodes);
  env.block(...edge);
  const post = run(P.postEpisodes);
  const firstReturn = env.inspect().episode + 1;
  env.unblock(...edge);
  const back = run(P.returnEpisodes);
  const [u, v] = edge;
  const usedReopened = env.trace().filter(([ep, , s, a, s2]) => ep >= firstReturn && s !== s2 && ((s === u && world.exitOrder[s][a] === v) || (s === v && world.exitOrder[s][a] === u))).length;
  const steps = (xs) => sum(xs.map((r) => r.steps));
  const info = typeof agent.inspect === 'function' ? agent.inspect() : {};
  return {
    task: 'E4', world: worldLabel, kind, arm, layout: L,
    windows: { stable: steps(train.slice(-P.stableEpisodes)), post: steps(post.slice(0, P.postWindow)), postAll: steps(post), return: steps(back), returnLast: steps(back.slice(-P.stableEpisodes)) },
    metric: steps(post) + steps(back),
    censored: [...train, ...post, ...back].filter((r) => r.truncated).length,
    secondary: { usedReopened, control: info.control ?? null, compute: info.compute ?? null, model: info.model ?? null },
  };
}
```

## Appendix L. Source: task E1F and the forecaster baselines (CONST, LAPLACE)

File: `cognitive/testbed/tasks_v3.mjs` · SHA-256 `0edabf4bc07110cae8204169969faed11cc279a18ededc8cac8c04e05adbce08` · 130 lines

```js
// ==========================================================
// CF-03c testbed — task E1F: latent learning under a named family of hidden edge reliabilities, with forecasters
// scored side by side on the same events
// ==========================================================
// E1F is E1S (the E1 layout and phases, arm EXPLORED) with the reliability of every edge drawn from a named family
// instead of U[0.5, 1].  One agent acts.  Every forecaster in FORECASTERS is fed exactly the transitions that agent
// experiences and, BEFORE each one, is asked for P(move) for the attempted (state, action) pair.  All forecasters
// are therefore scored on identical events, so a difference between two of them is not a difference in behaviour.
//
// Scored event 1, "move": did the attempt change the node?  Scored on EVERY attempt, including the first attempt of
// a pair (CF-03b scored only pairs that had already moved).
// Scored event 2, "modal": did the attempt arrive at the forecaster's most probable known destination?  Scored only
// when the forecaster has a known destination; this is the CF-03b statistic, kept for continuity.
//
// Scores are accumulated per scope: all | explore | test (phase) | untried | tried (the pair's count before the
// attempt).  Each accumulator holds n, the Brier sum, the log-loss sum and 10 equal-width bins (n, sum of
// predictions, hits).  Predictions outside [0, 1] are counted as invalid and clamped for scoring.
//
// Families (u ~ U[0, 1] per edge, in the world's sorted edge order, stream `${world}|E1F|${family}|rel`):
//   U5       0.5 + 0.5 u            the development family (the E1S distribution)
//   WIDE     0.1 + 0.9 u            much wider; many poor edges
//   BIMODAL  0.95 or 0.55           two populations of edges, equal shares (pairs are not exchangeable draws of one Beta)
//   ARCSINE  0.2 + 0.8 sin^2(pi u / 2)   mass piled at both ends
//   HIGH     0.9 + 0.1 u            nearly reliable
// Seeds: environment `${world}|E1F|${family}|env`, agent `${world}|E1F|${family}|agent`; the layout is E1's.
// ==========================================================
import { GraphEnv } from './env.mjs';
import { makeStream } from './rng.mjs';
import { layout, TASK_PARAMS } from './tasks.mjs';
import { runEpisode, runSteps } from './runner.mjs';
import { makeAgentForV3 } from './registry_v3.mjs';
import { makeWorldModel } from '../core/world_model.mjs';
import { makeWorldModel2 } from '../mind/world_model.mjs';
import { makeWorldModel3 } from '../mind/v3/world_model.mjs';

export const FAMILIES = Object.freeze({
  U5: (u) => 0.5 + 0.5 * u,
  WIDE: (u) => 0.1 + 0.9 * u,
  BIMODAL: (u) => (u < 0.5 ? 0.95 : 0.55),
  ARCSINE: (u) => 0.2 + 0.8 * Math.sin(Math.PI * u / 2) ** 2,
  HIGH: (u) => 0.9 + 0.1 * u,
});
export const DEV_FAMILY = 'U5';
export const UNSEEN_FAMILIES = Object.freeze(['WIDE', 'BIMODAL', 'ARCSINE', 'HIGH']);

export function familyReliabilities(world, worldLabel, family) {
  const f = FAMILIES[family];
  if (!f) throw new Error(`unknown family ${family}`);
  const rnd = makeStream(`${worldLabel}|E1F|${family}|rel`);
  return world.edges.map(([u, v]) => [u, v, f(rnd())]);
}

const modelForecaster = (m) => ({
  pMove: (s, a) => 1 - m.predict(s, a).self,
  modal: (s, a) => { const o = m.predict(s, a).outcomes; return o.length ? o.reduce((b, x) => (x[1] > b[1] ? x : b)) : null; },
  update: (s, a, s2, r, d) => m.update(s, a, s2, r, d),
});
function laplaceForecaster() {                 // per pair, no sharing: (moves + 1) / (attempts + 2)
  const c = new Map();
  return {
    pMove: (s, a) => { const q = c.get(`${s}|${a}`); return q ? (q.m + 1) / (q.n + 2) : 0.5; },
    modal: () => null,
    update: (s, a, s2) => { const k = `${s}|${a}`; const q = c.get(k) ?? { n: 0, m: 0 }; q.n++; if (s2 !== s) q.m++; c.set(k, q); },
  };
}
function constantForecaster() {                // one number for every pair: the running overall move rate
  let n = 0, m = 0;
  return { pMove: () => (m + 0.5) / (n + 1), modal: () => null, update: (s, a, s2) => { n++; if (s2 !== s) m++; } };
}
export const FORECASTERS = Object.freeze({
  V3: () => modelForecaster(makeWorldModel3()),
  V3_NOPOOL_MOVE: () => modelForecaster(makeWorldModel3({ poolMove: false })),
  V3_NOPOOL_DEST: () => modelForecaster(makeWorldModel3({ poolDest: false })),
  V2: () => modelForecaster(makeWorldModel2()),
  V1: () => modelForecaster(makeWorldModel()),
  LAPLACE: laplaceForecaster,
  CONST: constantForecaster,
});

export const newAccumulator = () => ({ n: 0, brier: 0, logLoss: 0, bins: Array.from({ length: 10 }, () => ({ n: 0, pred: 0, hit: 0 })) });
export function score(acc, p, y) {
  const q = Math.min(1 - 1e-6, Math.max(1e-6, p));
  acc.n++; acc.brier += (q - y) ** 2; acc.logLoss -= Math.log(y ? q : 1 - q);
  const b = acc.bins[Math.min(9, Math.floor(q * 10))];
  b.n++; b.pred += q; b.hit += y;
}

const sum = (xs) => xs.reduce((a, b) => a + b, 0);

export function runE1F({ world, worldLabel, family, kind = 'MBVI3', params = {}, makeAgent = makeAgentForV3, forecasters = Object.keys(FORECASTERS) }) {
  const L = layout('E1', world, worldLabel);
  if (!L) return { task: 'E1F', family, world: worldLabel, kind, excluded: true };
  const P = TASK_PARAMS.E1;
  const env = new GraphEnv(world, { seedLabel: `${worldLabel}|E1F|${family}|env`, maxSteps: P.cap });
  for (const [u, v, p] of familyReliabilities(world, worldLabel, family)) env.setReliability(u, v, p);
  const inner = makeAgent(kind, env, `${worldLabel}|E1F|${family}|agent`, params[kind] ?? {});
  const F = Object.fromEntries(forecasters.map((name) => [name, { f: FORECASTERS[name](), invalid: 0, scopes: { all: newAccumulator(), explore: newAccumulator(), test: newAccumulator(), untried: newAccumulator(), tried: newAccumulator(), modal: newAccumulator() } }]));
  const tries = new Map();
  let phase = 'explore';
  const agent = {
    act: (obs) => inner.act(obs),
    observe(tr) {
      const s = tr.obs.node, a = tr.action, s2 = tr.next.node, moved = s2 !== s ? 1 : 0, key = `${s}|${a}`;
      const seen = tries.get(key) ?? 0;
      for (const x of Object.values(F)) {
        const p = x.f.pMove(s, a);
        if (!(p >= 0 && p <= 1)) x.invalid++;
        for (const scope of ['all', phase, seen ? 'tried' : 'untried']) score(x.scopes[scope], p, moved);
        const top = x.f.modal(s, a);
        if (top) score(x.scopes.modal, top[1], s2 === top[0] ? 1 : 0);
      }
      for (const x of Object.values(F)) x.f.update(s, a, s2, tr.reward, tr.done);
      tries.set(key, seen + 1);
      inner.observe(tr);
    },
  };
  env.setRewardNode(null); env.setCue(null);
  runSteps(env, agent, { total: P.exploreSteps, episodeLength: P.exploreEpisodeLength });
  phase = 'test';
  env.setRewardNode(L.goal); env.setCue(L.goal);
  const test = [];
  for (let e = 0; e < P.testEpisodes; e++) test.push(runEpisode(env, agent, { start: L.start }));
  const info = typeof inner.inspect === 'function' ? inner.inspect() : {};
  return {
    task: 'E1F', family, world: worldLabel, kind, layout: L, testSteps: test.map((r) => r.steps), metric: sum(test.map((r) => r.steps)), censored: test.filter((r) => r.truncated).length,
    forecasts: Object.fromEntries(Object.entries(F).map(([name, x]) => [name, { invalid: x.invalid, ...x.scopes }])),
    secondary: { model: info.model ?? null, compute: info.compute ?? null },
  };
}
```

## Appendix M. Source: baseline QL

File: `cognitive/agents/ql.mjs` · SHA-256 `9d8825a912c406e78df29a2ba5d5585d9c4292f32e7e0431dc01cbeb0b51d2f0` · 35 lines

```js
// ==========================================================
// QL — goal-conditioned tabular one-step Q-learning (model-free baseline)
// ==========================================================
// State = (node label, cue label or null).  Q starts at 0.  Policy: with probability epsilon a uniform exit, otherwise
// the greedy exit with ties broken uniformly.  Update after every real step:
//   Q(s,g,a) += alpha * (r + gamma * [not done] * max_a' Q(s',g,a') - Q(s,g,a))
// A truncated step bootstraps (truncation is not termination).  Nothing else writes Q.
// ==========================================================
import { argmaxRandomTie, makeTable } from '../testbed/agent_util.mjs';

export const QL_DEFAULTS = Object.freeze({ alpha: 0.5, gamma: 0.95, epsilon: 0.1 });

export function qTarget(table, tr, gamma) {
  const { reward, next, done } = tr;
  return reward + (done ? 0 : gamma * Math.max(...table.row(next.node, next.goal, next.nActions)));
}

export function makeQL({ rng, params = {} }) {
  const { alpha, gamma, epsilon } = { ...QL_DEFAULTS, ...params };
  const Q = makeTable();
  return {
    kind: 'QL',
    act(obs) {
      const r = Q.row(obs.node, obs.goal, obs.nActions);
      if (rng() < epsilon) return Math.floor(rng() * obs.nActions);
      return argmaxRandomTie(r, rng);
    },
    observe(tr) {
      const r = Q.row(tr.obs.node, tr.obs.goal, tr.obs.nActions);
      r[tr.action] += alpha * (qTarget(Q, tr, gamma) - r[tr.action]);
    },
    inspect: () => ({ q: Q.snapshot() }),
  };
}
```

## Appendix N. Source: baseline DYNAQ

File: `cognitive/agents/dynaq.mjs` · SHA-256 `5a953fc7dbabcbb4f8d6150726204d69534067186145627bc42c25455f1ed01f` · 50 lines

```js
// ==========================================================
// DYNAQ — QL plus classic tabular Dyna-Q planning (model-based positive control; Sutton & Barto 2018 §8.2)
// ==========================================================
// Model: for every experienced (node, action) the last observed (next node, its exit count, reward, done).
// After every real update, k planning updates on (node, action) pairs drawn uniformly from the experienced pairs
// (in first-experience order).  Planning targets the CURRENT cue g:
//   with a cue (g !== null)   r = 1[next == g], done = (next == g)     -- the cue's declared meaning (CD-005)
//   without a cue             r, done = the last observed values for the pair
// and updates Q(node, g, action) exactly as QL does.
// ==========================================================
import { argmaxRandomTie, makeTable } from '../testbed/agent_util.mjs';

export const DYNAQ_DEFAULTS = Object.freeze({ alpha: 0.5, gamma: 0.95, epsilon: 0.1, k: 20 });

export function makeDynaQ({ rng, params = {} }) {
  const { alpha, gamma, epsilon, k } = { ...DYNAQ_DEFAULTS, ...params };
  const Q = makeTable();
  const model = new Map();
  const pairs = [];
  const update = (node, goal, width, action, reward, next, nextWidth, done) => {
    const r = Q.row(node, goal, width);
    const target = reward + (done ? 0 : gamma * Math.max(...Q.row(next, goal, nextWidth)));
    r[action] += alpha * (target - r[action]);
  };
  return {
    kind: 'DYNAQ',
    act(obs) {
      const r = Q.row(obs.node, obs.goal, obs.nActions);
      if (rng() < epsilon) return Math.floor(rng() * obs.nActions);
      return argmaxRandomTie(r, rng);
    },
    observe(tr) {
      const { obs, action, reward, next, done } = tr;
      update(obs.node, obs.goal, obs.nActions, action, reward, next.node, next.nActions, done);
      const key = `${obs.node}|${action}`;
      if (!model.has(key)) pairs.push([obs.node, action, obs.nActions]);
      model.set(key, { next: next.node, nextWidth: next.nActions, reward, done });
      const g = obs.goal;
      for (let i = 0; i < k; i++) {
        const [node, a, width] = pairs[Math.floor(rng() * pairs.length)];
        const m = model.get(`${node}|${a}`);
        const r = g !== null ? (m.next === g ? 1 : 0) : m.reward;
        const d = g !== null ? m.next === g : m.done;
        update(node, g, width, a, r, m.next, m.nextWidth, d);
      }
    },
    inspect: () => ({ q: Q.snapshot(), modelPairs: pairs.length }),
  };
}
```

## Appendix O. Source: environment

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

## Appendix P. Source: paired bootstrap

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

## Appendix Q. Source: CF-04 gate driver (criteria as executed)

File: `experiments/cf04/run_gate.mjs` · SHA-256 `8f8f50f203ca3399ccdb5afb19b6243c06b9027e61e921bff9c6ec14897950b1` · 147 lines

```js
// ==========================================================
// CF-04 — hidden change and reliability arbitration (frozen in experiments/cf04/GATE_SPEC.md)
// ==========================================================
//   node experiments/cf04/run_gate.mjs --domain dev   --out <file outside the repository> [--worlds N]
//   node experiments/cf04/run_gate.mjs --domain gate4
// Stage A — is task E4 a usable instrument?
//   T1  CHANGE arm, post window: steps(MBVI3 without change detection) - steps(MBVI3), mean > 0 and lower bound > 0
//   T2  the same contrast in the SHAM arm has upper bound < MARGIN, and CHANGE contrast - SHAM contrast has lower bound > 0
// Stage B — does arbitration help?  (evaluated only if Stage A holds; `metric` = all steps after the change)
//   A1  benefit:           metric(MBVI3) - metric(ARB) in CHANGE, mean > 0 and lower bound > 0
//   A2  not just switching: metric(RANDSWITCH) - metric(ARB) in CHANGE, lower bound > 0   (RANDSWITCH is given ARB's
//                           own habit share in that world and arm)
//   A3  no cost at rest:   metric(ARB) - metric(MBVI3) in SHAM, upper bound < MARGIN
//   A4  it acts:           ARB lets the habit decide at least once in at least half of the worlds
// Verdict: INVALID (infrastructure) / TASK NOT ADMITTED (T1 or T2 fails) / ARBITRATION SUPPORTED (A1-A4) /
//          ARBITRATION NOT SUPPORTED (task admitted; some of A1-A4 fail, listed; "HARMFUL" is added when
//          metric(ARB) - metric(MBVI3) in CHANGE has lower bound > 0).
// Evidence category: development evaluation gate (not confirmatory).
// ==========================================================
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateWorld } from '../../cognitive/testbed/worlds.mjs';
import { runE4, E4_PARAMS, E4_ARMS } from '../../cognitive/testbed/task_e4.mjs';
import { makeAgentForV4 } from '../../cognitive/testbed/registry_v4.mjs';
import { pairedBootstrap } from '../../cognitive/testbed/stats.mjs';
import { ARB_DEFAULTS } from '../../cognitive/mind/arb/agent.mjs';
import { runAllTests } from '../../cognitive/tests/run_all.mjs';
import { runTestFiles } from '../../cognitive/tests/run_list.mjs';

export const GATE4_WORLDS = 55;   // fixed before the gate4 run by the pre-declared rule in GATE_SPEC.md
export const MARGIN = 10;         // steps

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const die = (m) => { console.error(`cf04 run_gate refused: ${m}`); process.exit(2); };
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a]).toString().trim();

const DOMAIN = arg('--domain');
if (!['dev', 'gate4'].includes(DOMAIN)) die('--domain must be dev or gate4');
const N = DOMAIN === 'gate4' ? GATE4_WORLDS : Number(arg('--worlds', '20'));
const SPEC = path.join(HERE, 'GATE_SPEC.md');
const OUT = DOMAIN === 'gate4' ? path.join(HERE, 'results', 'gate4_result.json') : path.resolve(arg('--out') ?? '');
if (DOMAIN === 'dev') {
  const rel = path.relative(ROOT, OUT);
  if (!arg('--out') || (!rel.startsWith('..') && !path.isAbsolute(rel))) die('dev runs need --out outside the repository');
} else {
  if (!fs.existsSync(SPEC)) die('GATE_SPEC.md is missing');
  const dirty = git('status', '--porcelain', '--untracked-files=all', '--', 'cognitive', 'experiments/cf04');
  if (dirty) die(`CF-04 files are not all committed and clean:\n${dirty}`);
  if (fs.existsSync(OUT)) die('the gate4 domain has already been run');
}

const KINDS = ['ORACLE', 'QL', 'DYNAQ', 'MBVI3', 'MBVI3_NOCHANGE', 'ARB', 'ARB_T10', 'RANDSWITCH'];   // RANDSWITCH after ARB
const WINDOWS = ['stable', 'post', 'postAll', 'return', 'returnLast'];
const TEST_FILES = ['test_e2p.mjs', 'test_core.mjs', 'test_invariance.mjs', 'test_v1.mjs', 'test_mind.mjs', 'test_mind_v3.mjs', 'test_arb.mjs'];

function matrix(domain, n) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    const worldLabel = `cf|${domain}|world|${i}`, world = generateWorld(worldLabel);
    for (const arm of E4_ARMS) {
      let share = 0;
      for (const kind of KINDS) {
        const r = runE4({ world, worldLabel, kind, arm, makeAgent: makeAgentForV4, params: { RANDSWITCH: { mfShare: share } } });
        if (kind === 'ARB' && !r.excluded) share = r.secondary.control.habitShare;
        rows.push(r);
      }
    }
  }
  return rows;
}
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sd = (xs) => { if (xs.length < 2) return null; const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };

function analyse(rows, domain) {
  const S = (x) => `cf|stats|${domain}|cf04|${x}`;
  const cell = (arm, kind) => new Map(rows.filter((r) => r.arm === arm && r.kind === kind && !r.excluded).map((r) => [r.world, r]));
  const value = (w) => (r) => (w === 'metric' ? r.metric : r.windows[w]);
  const diffs = (arm, kA, kB, w) => { const A = cell(arm, kA), B = cell(arm, kB); return [...A.keys()].filter((x) => B.has(x)).sort().map((x) => value(w)(A.get(x)) - value(w)(B.get(x))); };
  const paired = (arm, kA, kB, w) => { const d = diffs(arm, kA, kB, w); return { contrast: `${kA} - ${kB} (${arm}.${w})`, sd: sd(d), ...pairedBootstrap(d, S(`${arm}|${kA}|${kB}|${w}`)) }; };
  const out = { stageA: {}, stageB: {}, reported: {}, means: {}, control: {}, excludedWorlds: [...new Set(rows.filter((r) => r.excluded).map((r) => r.world))] };
  out.stageA.T1_change = paired('CHANGE', 'MBVI3_NOCHANGE', 'MBVI3', 'post');
  out.stageA.T2_sham = paired('SHAM', 'MBVI3_NOCHANGE', 'MBVI3', 'post');
  const dc = diffs('CHANGE', 'MBVI3_NOCHANGE', 'MBVI3', 'post'), ds = diffs('SHAM', 'MBVI3_NOCHANGE', 'MBVI3', 'post'), dd = dc.map((x, i) => x - ds[i]);
  out.stageA.T2_change_minus_sham = { contrast: 'CHANGE contrast - SHAM contrast (post)', sd: sd(dd), ...pairedBootstrap(dd, S('T2|dd')) };
  out.stageA.headroom_return = paired('CHANGE', 'MBVI3', 'ORACLE', 'return');
  out.stageA.headroom_post = paired('CHANGE', 'MBVI3', 'ORACLE', 'postAll');
  for (const arb of ['ARB', 'ARB_T10']) {
    const B = { A1_benefit: paired('CHANGE', 'MBVI3', arb, 'metric'), A3_cost_at_rest: paired('SHAM', arb, 'MBVI3', 'metric'), harm: paired('CHANGE', arb, 'MBVI3', 'metric') };
    if (arb === 'ARB') B.A2_vs_random_switch = paired('CHANGE', 'RANDSWITCH', 'ARB', 'metric');
    for (const w of ['post', 'postAll', 'return']) B[`${arb}_minus_MBVI3_${w}`] = paired('CHANGE', arb, 'MBVI3', w);
    const ctl = [...cell('CHANGE', arb).values()].map((r) => r.secondary.control), ctlS = [...cell('SHAM', arb).values()].map((r) => r.secondary.control);
    out.control[arb] = { worlds: ctl.length, worldsWithHabitDecision: ctl.filter((c) => c.habitDecisions > 0).length, habitShare: mean(ctl.map((c) => c.habitShare)), switches: mean(ctl.map((c) => c.switches)), disagreementRate: mean(ctl.map((c) => c.disagreements / c.decisions)), decisiveHabit: mean(ctl.map((c) => c.decisiveHabit)), habitShareSham: mean(ctlS.map((c) => c.habitShare)) };
    out.stageB[arb] = B;
  }
  out.reported.QL_minus_MBVI3 = paired('CHANGE', 'QL', 'MBVI3', 'metric');
  out.reported.DYNAQ_minus_MBVI3 = paired('CHANGE', 'DYNAQ', 'MBVI3', 'metric');
  out.reported.QL_minus_ARB = paired('CHANGE', 'QL', 'ARB', 'metric');
  out.reported.RANDSWITCH_minus_MBVI3 = paired('CHANGE', 'RANDSWITCH', 'MBVI3', 'metric');
  for (const arm of E4_ARMS) for (const k of KINDS) {
    const xs = [...cell(arm, k).values()];
    out.means[`${arm}.${k}`] = { ...Object.fromEntries(WINDOWS.map((w) => [w, mean(xs.map((r) => r.windows[w]))])), metric: mean(xs.map((r) => r.metric)), censored: xs.reduce((s, r) => s + r.censored, 0), usedReopened: mean(xs.map((r) => r.secondary.usedReopened)) };
  }
  const L = [...cell('CHANGE', 'ORACLE').values()].map((r) => r.layout);
  out.layout = { distance: mean(L.map((l) => l.distance)), detourDistance: mean(L.map((l) => l.detourDistance)) };
  return out;
}

const t1 = await runAllTests(), t2 = await runTestFiles(TEST_FILES);
const tests = { passed: t1.passed + t2.passed, total: t1.total + t2.total, failed: [...t1.failed, ...t2.failed].map((f) => `${f.file} :: ${f.name}`) };
const rowsA = matrix(DOMAIN, N), rowsB = matrix(DOMAIN, N);
const hashA = sha(JSON.stringify(rowsA)), hashB = sha(JSON.stringify(rowsB));
const analysis = analyse(rowsA, DOMAIN);
const A = analysis.stageA, B = analysis.stageB.ARB, C = analysis.control.ARB;
const stageA = {
  T1_change_detection_matters: A.T1_change.n > 0 && A.T1_change.mean > 0 && A.T1_change.lo > 0,
  T2_sham_is_null: A.T2_sham.n > 0 && A.T2_sham.hi < MARGIN && A.T2_change_minus_sham.lo > 0,
};
const stageB = {
  A1_benefit: B.A1_benefit.n > 0 && B.A1_benefit.mean > 0 && B.A1_benefit.lo > 0,
  A2_better_than_random_switch: B.A2_vs_random_switch.n > 0 && B.A2_vs_random_switch.lo > 0,
  A3_no_cost_at_rest: B.A3_cost_at_rest.n > 0 && B.A3_cost_at_rest.hi < MARGIN,
  A4_it_acts: C.worldsWithHabitDecision * 2 >= C.worlds,
};
const harmful = B.harm.n > 0 && B.harm.lo > 0;
const infra = { determinism: hashA === hashB, tests: tests.failed.length === 0 && tests.total > 0 };
const infraOk = Object.values(infra).every(Boolean);
const admitted = Object.values(stageA).every(Boolean), failedB = Object.entries(stageB).filter(([, v]) => !v).map(([k]) => k);
const verdict = !infraOk ? 'CF-04 INVALID' : !admitted ? `CF-04 TASK NOT ADMITTED (${Object.entries(stageA).filter(([, v]) => !v).map(([k]) => k).join(', ')})`
  : !failedB.length ? 'CF-04 ARBITRATION SUPPORTED' : `CF-04 ARBITRATION NOT SUPPORTED (${failedB.join(', ')})${harmful ? ' — HARMFUL' : ''}`;
const result = {
  evidence: 'CF-04 hidden change and reliability arbitration (development, not confirmatory)', domain: DOMAIN, worlds: N,
  environment: { node: process.version, platform: `${process.platform}-${process.arch}`, head: git('rev-parse', 'HEAD'), filesClean: DOMAIN === 'gate4' },
  specSha256: fs.existsSync(SPEC) ? sha(fs.readFileSync(SPEC)) : null,
  parameters: { task: E4_PARAMS, ARB: ARB_DEFAULTS, ARB_T10: { theta: 0.1 }, margin: MARGIN, bootstrapResamples: 10000, reliability: 'U[0.5, 1] per edge', world: { nodes: 24, edges: 30, maxDegree: 4 } },
  tests, infra, criteria: { stageA, stageB, harmful }, verdict, analysis, rowsSha256: hashA, rows: rowsA,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(result, null, 1)}\n`);
console.log(JSON.stringify({ verdict, infra, tests: `${tests.passed}/${tests.total}`, criteria: result.criteria }, null, 1));
process.exit(infraOk ? 0 : 1);
```

## Appendix R. Source: CF-03c gate driver (criteria as executed)

File: `experiments/cf03c/run_gate.mjs` · SHA-256 `54c652654b56bf0539c90330940f601fc8c8621cd8f81fe74f04e66d588aeadf` · 196 lines

```js
// ==========================================================
// CF-03c — calibration robustness gate for world model v3 (frozen in experiments/cf03c/GATE_SPEC.md)
// ==========================================================
//   node experiments/cf03c/run_gate.mjs --domain dev    --out <file outside the repository> [--worlds N]
//   node experiments/cf03c/run_gate.mjs --domain gate3c
// The dev domain runs ONLY the development family (U5) and the existing battery; the four unseen families are run
// on the gate3c domain only, once.  Criteria (GATE_SPEC.md):
//   K1  skill over the constant forecaster, per unseen family: Brier(CONST) - Brier(V3)
//         all four families:           lower 95% bound > -NONINF  (not worse)
//         WIDE, BIMODAL, ARCSINE:      lower 95% bound > 0        (strictly better; these families are heterogeneous)
//   K2  calibration, per unseen family: weighted per-run ECE of V3 on the move event over all attempts,
//         upper 95% bound (bootstrap over worlds) <= ECE_LIMIT
//   K3  skill over the per-pair Laplace forecaster, per unseen family: Brier(LAPLACE) - Brier(V3), lower bound > 0
//   K4  the repairs cost nothing on the development family (fresh worlds): Brier(V2) - Brier(V3) lower bound > -NONINF,
//         and metric(MBVI3) - metric(MBVI2) upper bound < MARGIN steps on E1 EXPLORED, E3, E1S EXPLORED, E2P PRE
//   K5  validity: V3 makes no prediction outside [0, 1] in any family
//   K6  infrastructure: determinism (two in-process runs) and all tests pass
// Verdict: PASS (all) / PARTIAL (K4-K6 hold; K1-K3 hold in some families only, listed) / FAIL (K4 or K5 fails) /
//          INVALID (K6 fails).
// Evidence category: development evaluation gate (not confirmatory).
// ==========================================================
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateWorld } from '../../cognitive/testbed/worlds.mjs';
import { runTaskV1 } from '../../cognitive/testbed/tasks_v1.mjs';
import { runE2P } from '../../cognitive/testbed/task_e2p.mjs';
import { makeAgentForV3 } from '../../cognitive/testbed/registry_v3.mjs';
import { runE1F, FORECASTERS, DEV_FAMILY, UNSEEN_FAMILIES } from '../../cognitive/testbed/tasks_v3.mjs';
import { pairedBootstrap } from '../../cognitive/testbed/stats.mjs';
import { makeStream } from '../../cognitive/testbed/rng.mjs';
import { MBVI3_DEFAULTS } from '../../cognitive/mind/v3/agent.mjs';
import { runAllTests } from '../../cognitive/tests/run_all.mjs';
import { runTestFiles } from '../../cognitive/tests/run_list.mjs';

export const GATE3C_WORLDS = 20;     // fixed before the gate3c run by the pre-declared rule in GATE_SPEC.md
export const ECE_LIMIT = 0.05;
export const NONINF = 0.002;         // Brier non-inferiority margin
export const MARGIN = 10;            // steps
export const STRICT_FAMILIES = Object.freeze(['WIDE', 'BIMODAL', 'ARCSINE']);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const die = (m) => { console.error(`cf03c run_gate refused: ${m}`); process.exit(2); };
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a]).toString().trim();

const DOMAIN = arg('--domain');
if (!['dev', 'gate3c'].includes(DOMAIN)) die('--domain must be dev or gate3c');
const N = DOMAIN === 'gate3c' ? GATE3C_WORLDS : Number(arg('--worlds', '20'));
const SPEC = path.join(HERE, 'GATE_SPEC.md');
const OUT = DOMAIN === 'gate3c' ? path.join(HERE, 'results', 'gate3c_result.json') : path.resolve(arg('--out') ?? '');
if (DOMAIN === 'dev') {
  const rel = path.relative(ROOT, OUT);
  if (!arg('--out') || (!rel.startsWith('..') && !path.isAbsolute(rel))) die('dev runs need --out outside the repository');
} else {
  if (!fs.existsSync(SPEC)) die('GATE_SPEC.md is missing');
  const dirty = git('status', '--porcelain', '--untracked-files=all', '--', 'cognitive', 'experiments/cf03c');
  if (dirty) die(`CF-03c files are not all committed and clean:\n${dirty}`);
  if (fs.existsSync(OUT)) die('the gate3c domain has already been run');
}

const FAMILY_LIST = DOMAIN === 'gate3c' ? [DEV_FAMILY, ...UNSEEN_FAMILIES] : [DEV_FAMILY];
const BATTERY = [['E1', 'EXPLORED'], ['E3', 'STD'], ['E1S', 'EXPLORED'], ['E2P', 'PRE']];
const BATTERY_KINDS = ['DYNAQ', 'MBVI2', 'MBVI3', 'MBVI3_NOCHANGE'];
const NAMES = Object.keys(FORECASTERS);
const TEST_FILES = ['test_e2p.mjs', 'test_core.mjs', 'test_invariance.mjs', 'test_v1.mjs', 'test_mind.mjs', 'test_mind_v3.mjs'];

function matrix(domain, n) {
  const battery = [], families = [];
  for (let i = 0; i < n; i++) {
    const worldLabel = `cf|${domain}|world|${i}`, world = generateWorld(worldLabel);
    for (const [task, arm] of BATTERY) for (const kind of BATTERY_KINDS) {
      battery.push(task === 'E2P' ? runE2P({ world, worldLabel, kind, arm, makeAgent: makeAgentForV3 }) : runTaskV1({ task, world, worldLabel, kind, arm, makeAgent: makeAgentForV3 }));
    }
    for (const family of FAMILY_LIST) families.push(runE1F({ world, worldLabel, family }));
  }
  return { battery, families };
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sd = (xs) => { if (xs.length < 2) return null; const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };
const eceOf = (acc) => (acc.n ? acc.bins.reduce((s, b) => s + Math.abs(b.hit - b.pred), 0) / acc.n : null);
const addBins = (accs) => { const out = Array.from({ length: 10 }, () => ({ n: 0, pred: 0, hit: 0 })); for (const a of accs) a.bins.forEach((b, i) => { out[i].n += b.n; out[i].pred += b.pred; out[i].hit += b.hit; }); return out; };
/** Weighted per-run ECE with a percentile bootstrap over worlds (the unit of resampling is the world). */
function eceWithInterval(accs, label, B = 10000) {
  const runs = accs.filter((a) => a.n > 0).map((a) => ({ err: eceOf(a) * a.n, n: a.n }));
  if (!runs.length) return { n: 0, value: null, lo: null, hi: null };
  const stat = (rs) => rs.reduce((s, r) => s + r.err, 0) / rs.reduce((s, r) => s + r.n, 0);
  const rnd = makeStream(label), sims = new Float64Array(B);
  for (let b = 0; b < B; b++) { let e = 0, w = 0; for (let i = 0; i < runs.length; i++) { const r = runs[Math.floor(rnd() * runs.length)]; e += r.err; w += r.n; } sims[b] = e / w; }
  sims.sort();
  return { n: runs.length, value: stat(runs), lo: sims[Math.floor(0.025 * B)], hi: sims[Math.ceil(0.975 * B) - 1] };
}
/** Noise floor: the weighted per-run ECE of a forecaster whose bin probabilities were exactly right. */
function noiseFloor(accs, label, sims = 2000) {
  const rnd = makeStream(label), out = [];
  for (let k = 0; k < sims; k++) {
    let e = 0, w = 0;
    for (const a of accs) { if (!a.n) continue; for (const b of a.bins) { if (!b.n) continue; const p = b.pred / b.n; let h = 0; for (let j = 0; j < b.n; j++) if (rnd() < p) h++; e += Math.abs(h - b.pred); } w += a.n; }
    out.push(e / w);
  }
  out.sort((x, y) => x - y);
  return { mean: mean(out), p95: out[Math.floor(0.95 * sims)] };
}
/** Murphy decomposition from pooled bins: Brier ~ reliability - resolution + uncertainty. */
function decomposition(accs) {
  const bins = addBins(accs), n = bins.reduce((s, b) => s + b.n, 0);
  if (!n) return null;
  const base = bins.reduce((s, b) => s + b.hit, 0) / n;
  let rel = 0, res = 0;
  for (const b of bins) { if (!b.n) continue; const p = b.pred / b.n, o = b.hit / b.n; rel += b.n * (p - o) ** 2; res += b.n * (o - base) ** 2; }
  return { reliability: rel / n, resolution: res / n, uncertainty: base * (1 - base), baseRate: base, pooledEce: bins.reduce((s, b) => s + Math.abs(b.hit - b.pred), 0) / n, bins: bins.map((b) => ({ n: b.n, meanPredicted: b.n ? b.pred / b.n : null, hitRate: b.n ? b.hit / b.n : null })) };
}

function analyse({ battery, families }, domain) {
  const S = (x) => `cf|stats|${domain}|cf03c|${x}`;
  const out = { families: {}, battery: {}, excludedWorlds: [...new Set([...battery, ...families].filter((r) => r.excluded).map((r) => `${r.task}:${r.family ?? ''}:${r.world}`))] };
  for (const family of FAMILY_LIST) {
    const rows = families.filter((r) => r.family === family && !r.excluded).sort((a, b) => (a.world < b.world ? -1 : 1));
    const brier = (name, scope = 'all') => rows.map((r) => r.forecasts[name][scope].brier / r.forecasts[name][scope].n);
    const logLoss = (name) => rows.map((r) => r.forecasts[name].all.logLoss / r.forecasts[name].all.n);
    const diff = (a, b, f = brier) => { const A = f(a), Bv = f(b), d = A.map((x, i) => x - Bv[i]); return { contrast: `Brier(${a}) - Brier(${b})`, sd: sd(d), ...pairedBootstrap(d, S(`${family}|${a}|${b}`)) }; };
    const F = { worlds: rows.length, steps: mean(rows.map((r) => r.metric)), censored: rows.reduce((s, r) => s + r.censored, 0), forecasters: {}, contrasts: {}, hyper: { mu: mean(rows.map((r) => r.secondary.model.mu)), nu: mean(rows.map((r) => r.secondary.model.nu)), strengths: rows.map((r) => r.secondary.model.S), changesDown: mean(rows.map((r) => r.secondary.model.changesDown)), changesUp: mean(rows.map((r) => r.secondary.model.changesUp)) } };
    for (const name of NAMES) {
      const accs = (scope) => rows.map((r) => r.forecasts[name][scope]);
      F.forecasters[name] = {
        brier: mean(brier(name)), logLoss: mean(logLoss(name)), invalid: rows.reduce((s, r) => s + r.forecasts[name].invalid, 0),
        ece: eceWithInterval(accs('all'), S(`${family}|ece|${name}`)), noiseFloor: noiseFloor(accs('all'), S(`${family}|floor|${name}`)),
        eceUntried: eceWithInterval(accs('untried'), S(`${family}|eceU|${name}`)).value, eceTried: eceWithInterval(accs('tried'), S(`${family}|eceT|${name}`)).value,
        eceExplore: eceWithInterval(accs('explore'), S(`${family}|eceX|${name}`)).value, eceTest: eceWithInterval(accs('test'), S(`${family}|eceE|${name}`)).value,
        eceModal: eceWithInterval(accs('modal'), S(`${family}|eceM|${name}`)).value,
        decomposition: decomposition(accs('all')),
      };
    }
    for (const other of NAMES.filter((x) => x !== 'V3')) F.contrasts[`${other}_minus_V3`] = diff(other, 'V3');
    F.contrasts.logLoss_CONST_minus_V3 = diff('CONST', 'V3', logLoss);
    out.families[family] = F;
  }
  const cell = (task, arm, kind) => new Map(battery.filter((r) => r.task === task && r.arm === arm && r.kind === kind && !r.excluded).map((r) => [r.world, r]));
  for (const [task, arm] of BATTERY) {
    const key = `${task}.${arm}`;
    const pair = (kA, kB) => { const A = cell(task, arm, kA), Bm = cell(task, arm, kB); const d = [...A.keys()].filter((w) => Bm.has(w)).sort().map((w) => A.get(w).metric - Bm.get(w).metric); return { contrast: `${kA} - ${kB} (${key})`, sd: sd(d), ...pairedBootstrap(d, S(`${key}|${kA}|${kB}`)) }; };
    out.battery[key] = { means: Object.fromEntries(BATTERY_KINDS.map((k) => [k, mean([...cell(task, arm, k).values()].map((r) => r.metric))])), MBVI3_minus_MBVI2: pair('MBVI3', 'MBVI2'), DYNAQ_minus_MBVI3: pair('DYNAQ', 'MBVI3'), NOCHANGE_minus_MBVI3: pair('MBVI3_NOCHANGE', 'MBVI3') };
  }
  return out;
}

const t1 = await runAllTests(), t2 = await runTestFiles(TEST_FILES);
const tests = { passed: t1.passed + t2.passed, total: t1.total + t2.total, failed: [...t1.failed, ...t2.failed].map((f) => `${f.file} :: ${f.name}`) };
const runA = matrix(DOMAIN, N), runB = matrix(DOMAIN, N);
const hashA = sha(JSON.stringify(runA)), hashB = sha(JSON.stringify(runB));
const analysis = analyse(runA, DOMAIN);

const perFamily = {};
for (const family of FAMILY_LIST.filter((f) => f !== DEV_FAMILY)) {
  const F = analysis.families[family], c = F.contrasts.CONST_minus_V3, l = F.contrasts.LAPLACE_minus_V3;
  perFamily[family] = {
    K1_not_worse_than_constant: c.n > 0 && c.lo > -NONINF,
    K1_better_than_constant: STRICT_FAMILIES.includes(family) ? c.n > 0 && c.lo > 0 : null,
    K2_calibrated: F.forecasters.V3.ece.hi !== null && F.forecasters.V3.ece.hi <= ECE_LIMIT,
    K3_better_than_laplace: l.n > 0 && l.lo > 0,
  };
  perFamily[family].holds = Object.values(perFamily[family]).every((v) => v === null || v === true);
}
const dev = analysis.families[DEV_FAMILY];
const K4 = {
  brier_not_worse_than_v2: dev.contrasts.V2_minus_V3.n > 0 && dev.contrasts.V2_minus_V3.lo > -NONINF,
  steps_no_regression: Object.values(analysis.battery).every((b) => b.MBVI3_minus_MBVI2.n > 0 && b.MBVI3_minus_MBVI2.hi < MARGIN),
};
const K5 = Object.values(analysis.families).every((F) => F.forecasters.V3.invalid === 0);
const infra = { determinism: hashA === hashB, tests: tests.failed.length === 0 && tests.total > 0 };
const infraOk = Object.values(infra).every(Boolean), k4ok = Object.values(K4).every(Boolean);
const passing = Object.entries(perFamily).filter(([, v]) => v.holds).map(([k]) => k), failing = Object.entries(perFamily).filter(([, v]) => !v.holds).map(([k]) => k);
let verdict;
if (!infraOk) verdict = 'CF-03c INVALID';
else if (!k4ok || !K5) verdict = `CF-03c FAIL (${[!k4ok && 'K4', !K5 && 'K5'].filter(Boolean).join(', ')})`;
else if (DOMAIN !== 'gate3c') verdict = 'CF-03c dev run (unseen families not run): K4-K6 hold';
else if (!failing.length) verdict = 'CF-03c PASS';
else verdict = `CF-03c PARTIAL (holds in: ${passing.join(', ') || 'none'}; fails in: ${failing.join(', ')})`;

const result = {
  evidence: 'CF-03c calibration robustness gate (development, not confirmatory)', domain: DOMAIN, worlds: N, families: FAMILY_LIST,
  environment: { node: process.version, platform: `${process.platform}-${process.arch}`, head: git('rev-parse', 'HEAD'), filesClean: DOMAIN === 'gate3c' },
  specSha256: fs.existsSync(SPEC) ? sha(fs.readFileSync(SPEC)) : null,
  parameters: { MBVI3: MBVI3_DEFAULTS, eceLimit: ECE_LIMIT, nonInferiority: NONINF, margin: MARGIN, strictFamilies: STRICT_FAMILIES, bootstrapResamples: 10000, world: { nodes: 24, edges: 30, maxDegree: 4 } },
  tests, infra, criteria: { perFamily, K4, K5_no_invalid_predictions: K5 }, verdict, analysis, rowsSha256: hashA, rows: runA,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(result, null, 1)}\n`);
console.log(JSON.stringify({ verdict, infra, tests: `${tests.passed}/${tests.total}`, criteria: result.criteria }, null, 1));
process.exit(infraOk ? 0 : 1);
```

## Appendix S. Regression tests for the two repaired defects and the arbitration agent

File: `cognitive/tests/test_mind_v3.mjs` · SHA-256 `e4ea9040150f9a3ddf63560b7c9c88c1e16b03139951d02ccaff4f811c929bd4` · 230 lines

```js
// CF-03c tests — world model v3: regression tests for the two defects found in v2, change detection, the E1F task
// and its scoring.  The defect tests assert BOTH that v2 still shows the defect (so the test is not vacuous) and
// that v3 does not.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeWorldModel2 } from '../mind/world_model.mjs';
import { makeWorldModel3, WM3_DEFAULTS } from '../mind/v3/world_model.mjs';
import { AGENTS_V3, MBVI3_VARIANTS, MIND3_FILES, MIND3_ALLOWED, agentOptionsV3, makeAgentForV3 } from '../testbed/registry_v3.mjs';
import { AGENTS_V2 } from '../testbed/registry_v2.mjs';
import { PRIVILEGED } from '../testbed/runner.mjs';
import { checkPrivilege } from '../testbed/checks.mjs';
import { checkSourceIsolation, checkInvariance } from '../testbed/checks_v1.mjs';
import { GraphEnv } from '../testbed/env.mjs';
import { generateWorld, edgeKey } from '../testbed/worlds.mjs';
import { runTaskV1 } from '../testbed/tasks_v1.mjs';
import { FAMILIES, FORECASTERS, UNSEEN_FAMILIES, DEV_FAMILY, familyReliabilities, newAccumulator, score, runE1F } from '../testbed/tasks_v3.mjs';
import { makeStream } from '../testbed/rng.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIND3_DIR = path.resolve(HERE, '..', 'mind', 'v3');
const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`);
const total = (p) => p.self + p.unknown + p.outcomes.reduce((s, [, x]) => s + x, 0);
const valid = (p) => [p.self, p.unknown, p.blocked, ...p.outcomes.map(([, y]) => y)].every((v) => v >= 0 && v <= 1);
const W = generateWorld('cf|dev|world|5');

/** The sequence that exposes defect 1: five pairs that moved three times each, then one pair that only fails. */
function defect1Sequence(m, failures) {
  for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) m.update(100 + i, 0, 200 + i, 0, false);
  for (let j = 0; j < failures; j++) m.update(1, 0, 1, 0, false);
}
/** A mixed population like E1S: 40 pairs, reliability U[0.5, 1], 8 attempts each (fixed seed). */
function mixedPopulation(m, label = 'cf|test|v3|mixed') {
  const rnd = makeStream(label);
  for (let i = 0; i < 40; i++) { const p = 0.5 + 0.5 * rnd(); for (let j = 0; j < 8; j++) m.update(100 + i, 0, rnd() < p ? 200 + i : 100 + i, 0, false); }
}
function reliablePopulation(m, pairs = 12, each = 4) {
  for (let i = 0; i < pairs; i++) for (let j = 0; j < each; j++) m.update(100 + i, 0, 200 + i, 0, false);
}

export const tests = [
  ['v3 modules import only agent_util.mjs, the core planner and each other, and use no forbidden API', () => {
    assert.deepEqual(fs.readdirSync(MIND3_DIR).filter((f) => f.endsWith('.mjs')).sort(), [...MIND3_FILES].sort());
    for (const f of MIND3_FILES) assert.deepEqual(checkSourceIsolation(fs.readFileSync(path.join(MIND3_DIR, f), 'utf8'), MIND3_ALLOWED, f), []);
    assert.ok(checkSourceIsolation("import { GraphEnv } from '../../testbed/env.mjs';", MIND3_ALLOWED).length > 0, 'mutant must be caught');
  }],
  ['privilege: only ORACLE receives the oracle channel under the v3 registry; earlier kinds are the earlier factories', () => {
    const env = new GraphEnv(W, { seedLabel: 'cf|test|v3|priv' });
    assert.deepEqual(checkPrivilege(Object.keys(AGENTS_V3), PRIVILEGED, (k) => agentOptionsV3(k, env, 'cf|test|v3|priv|agent')), []);
    for (const k of Object.keys(AGENTS_V2)) assert.equal(AGENTS_V3[k], AGENTS_V2[k]);
    for (const k of Object.keys(MBVI3_VARIANTS)) assert.equal(makeAgentForV3(k, env, 'cf|test|v3|priv|agent').kind, k);
  }],
  ['MBVI3 is MBVI2 with a different model and nothing else (the two agent sources are identical after renaming)', () => {
    const norm = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
      .replace(/makeWorldModel[23]/g, 'MODEL').replace(/WM[23]_DEFAULTS/g, 'WMD').replace(/MBVI[23]_DEFAULTS/g, 'AD').replace(/makeMBVI[23]/g, 'MAKE').replace(/'MBVI[23]'/g, "'K'")
      .replace(/'\.\.\/\.\.\//g, "'../").replace(/\s+/g, ' ').trim();
    const a = norm(fs.readFileSync(path.join(MIND3_DIR, 'agent.mjs'), 'utf8')), b = norm(fs.readFileSync(path.join(MIND3_DIR, '..', 'mbvi2.mjs'), 'utf8'));
    assert.equal(a, b);
  }],

  // ---- defect 1 ----
  ['DEFECT 1 (regression): v2 gives a never-moved pair P(stay) > 1; v3 keeps every probability in [0, 1]', () => {
    const v2 = makeWorldModel2(); defect1Sequence(v2, 13);
    const bad = v2.predict(1, 0);
    assert.ok(bad.self > 1 && bad.unknown < 0, `v2 must still show the defect (self ${bad.self}, unknown ${bad.unknown})`);
    for (let k = 1; k <= 40; k++) {
      const v3 = makeWorldModel3(); defect1Sequence(v3, k);
      const p = v3.predict(1, 0);
      assert.ok(valid(p), `v3 after ${k} failures: ${JSON.stringify(p)}`); close(total(p), 1, 1e-12);
    }
  }],
  ['DEFECT 1 (property): through random sequences with pairs that never move, every v3 prediction is a valid distribution', () => {
    for (const params of [{}, { poolMove: false }, { poolDest: false }, { piBlock: 0 }, { resets: false }]) {
      const m = makeWorldModel3(params); const rnd = makeStream(`cf|test|v3|prop|${JSON.stringify(params)}`);
      for (let i = 0; i < 2500; i++) {
        const s = 1 + Math.floor(rnd() * 8), a = Math.floor(rnd() * 3);
        const dead = (s + a) % 4 === 0;                                   // a quarter of the pairs can never move
        const s2 = dead || rnd() < 0.3 ? s : 1 + Math.floor(rnd() * 8);
        m.update(s, a, s2, rnd() < 0.1 ? 1 : 0, rnd() < 0.1);
        if (i % 37 === 0) for (let x = 1; x <= 8; x++) for (let b = 0; b < 3; b++) { const p = m.predict(x, b); assert.ok(valid(p), JSON.stringify(p)); close(total(p), 1, 1e-12); }
      }
      const h = m.hyper(); assert.ok(h.mu >= 0 && h.mu <= 1 && h.nu >= 0);
    }
  }],
  ['EMPIRICAL BAYES: the same observations give the same model, whatever the order of unrelated pairs', () => {
    const a = makeWorldModel3(), b = makeWorldModel3();
    mixedPopulation(a); mixedPopulation(b);
    for (let i = 0; i < 40; i++) close(a.predict(100 + i, 0).self, b.predict(100 + i, 0).self, 0);
    const c = makeWorldModel3(); reliablePopulation(c);
    assert.ok(c.hyper().mu > 0.95 && c.predict(1, 0).unknown > 0.9, 'pooling still works: an untried pair in a reliable population is expected to move');
  }],

  // ---- defect 2 ----
  ['DEFECT 2 (regression): one failure after 40 successes resets the pair in v2 and not in v3', () => {
    const v2 = makeWorldModel2(); mixedPopulation(v2);
    for (let j = 0; j < 40; j++) v2.update(1, 0, 9, 0, false);
    v2.update(1, 0, 1, 0, false);
    assert.equal(v2.stats().transitionResets, 1, 'v2 must still show the defect'); assert.equal(v2.countOf(1, 0), 1);
    const v3 = makeWorldModel3(); mixedPopulation(v3);
    const before = v3.stats().changesDown;
    for (let j = 0; j < 40; j++) v3.update(1, 0, 9, 0, false);
    v3.update(1, 0, 1, 0, false);
    assert.equal(v3.stats().changesDown, before, 'one ordinary failure is not a change'); assert.equal(v3.countOf(1, 0), 41);
    assert.ok(1 - v3.predict(1, 0).self > 0.85, 'the edge is still believed reliable');
  }],
  ['CHANGE (worse): repeated failures on that pair are declared a change, and the counts become the failing run', () => {
    const m = makeWorldModel3(); mixedPopulation(m);
    for (let j = 0; j < 40; j++) m.update(1, 0, 9, 0, false);
    const before = m.stats().changesDown;
    let k = 0;
    while (m.stats().changesDown === before && k < 20) { m.update(1, 0, 1, 0, false); k++; }
    assert.ok(k >= 2 && k <= 6, `declared after ${k} consecutive failures`);
    assert.equal(m.countOf(1, 0), k, 'the pair now holds exactly the post-change run');
    assert.ok(m.predict(1, 0).self > 0.5);
  }],
  ['CHANGE (worse, deterministic): after 30 certain successes in a reliable world, the first failure is a change', () => {
    const m = makeWorldModel3(); reliablePopulation(m);
    for (let j = 0; j < 30; j++) m.update(1, 0, 9, 0, false);
    m.update(1, 0, 1, 0, false);
    assert.equal(m.stats().changesDown, 1); assert.equal(m.countOf(1, 0), 1);
    m.update(1, 0, 1, 0, false);
    assert.ok(m.predict(1, 0).self > 0.9, 'two failures in a reliable world: the exit is believed impassable');
  }],
  ['CHANGE (better): an exit believed dead that starts working is re-learned within a few moves', () => {
    const m = makeWorldModel3(); mixedPopulation(m);
    for (let j = 0; j < 15; j++) m.update(1, 0, 1, 0, false);
    assert.ok(1 - m.predict(1, 0).self < 0.1);
    let k = 0;
    while (m.stats().changesUp === 0 && k < 20) { m.update(1, 0, 9, 0, false); k++; }
    assert.ok(k >= 1 && k <= 6, `declared after ${k} moves`);
    assert.ok(1 - m.predict(1, 0).self > 0.7);
  }],
  ['CHANGE (false alarms): on 300 stationary pairs with reliability U[0.5, 1] and 60 attempts each, few changes are declared', () => {
    const m = makeWorldModel3(); const rnd = makeStream('cf|test|v3|stationary');
    for (let i = 0; i < 300; i++) { const p = 0.5 + 0.5 * rnd(); for (let j = 0; j < 60; j++) m.update(1000 + i, 0, rnd() < p ? 2000 + i : 1000 + i, 0, false); }
    const s = m.stats(), declared = s.changesDown + s.changesUp;
    assert.ok(declared <= 30, `${declared} changes declared on 300 stationary pairs (18,000 attempts)`);
    const off = makeWorldModel3({ resets: false }); mixedPopulation(off);
    for (let j = 0; j < 40; j++) off.update(1, 0, 9, 0, false);
    for (let j = 0; j < 10; j++) off.update(1, 0, 1, 0, false);
    assert.equal(off.stats().changesDown, 0, 'resets: false disables change detection');
  }],
  ['RESET (reward): reward change-points are local unless asked otherwise', () => {
    for (const [flag, key] of [[false, 'rewardResets'], [true, 'globalRewardResets']]) {
      const r = makeWorldModel3({ globalRewardReset: flag });
      for (let i = 0; i < 8; i++) { r.update(1, 0, 2, 1, true); r.update(3, 0, 4, 0, false); }
      r.update(1, 0, 2, 0, false);
      assert.equal(r.stats()[key], 1);
      assert.equal(r.rewardProb(4) < 0.1, !flag);
    }
  }],
  ['PARAMETERS: the change threshold is the declared posterior-odds rule', () => {
    close(Math.log((1 - WM3_DEFAULTS.changeHazard) / WM3_DEFAULTS.changeHazard), Math.log(499), 1e-12);
    assert.ok(Math.log(WM3_DEFAULTS.changeAlt / 0.05) < Math.log(499), 'one failure at P(stay) = 0.05 is below the threshold');
  }],

  // ---- task E1F and scoring ----
  ['SCORING: the accumulator computes Brier, log-loss and bins exactly', () => {
    const acc = newAccumulator();
    score(acc, 0.8, 1); score(acc, 0.8, 0); score(acc, 0.25, 0);
    assert.equal(acc.n, 3); close(acc.brier, 0.04 + 0.64 + 0.0625); close(acc.logLoss, -Math.log(0.8) - Math.log(0.2) - Math.log(0.75));
    assert.deepEqual(acc.bins[8], { n: 2, pred: 1.6, hit: 1 }); assert.deepEqual(acc.bins[2], { n: 1, pred: 0.25, hit: 0 });
    const edge = newAccumulator(); score(edge, 1.7, 1); score(edge, -0.2, 0);
    assert.equal(edge.bins[9].n, 1); assert.equal(edge.bins[0].n, 1); assert.ok(Number.isFinite(edge.logLoss));
  }],
  ['FAMILIES: each sampler stays in its declared range; the development family is not among the unseen ones', () => {
    const range = { U5: [0.5, 1], WIDE: [0.1, 1], BIMODAL: [0.55, 0.95], ARCSINE: [0.2, 1], HIGH: [0.9, 1] };
    assert.deepEqual(Object.keys(FAMILIES).sort(), Object.keys(range).sort());
    for (const [name, f] of Object.entries(FAMILIES)) for (let i = 0; i <= 1000; i++) { const p = f(i / 1000); assert.ok(p >= range[name][0] - 1e-12 && p <= range[name][1] + 1e-12, `${name}(${i / 1000}) = ${p}`); }
    assert.ok(!UNSEEN_FAMILIES.includes(DEV_FAMILY)); assert.equal(UNSEEN_FAMILIES.length, 4);
    const rel = familyReliabilities(W, 'cf|dev|world|5', 'BIMODAL').map(([, , p]) => p);
    assert.equal(rel.length, W.edges.length); assert.ok(rel.every((p) => p === 0.95 || p === 0.55));
    assert.deepEqual(familyReliabilities(W, 'cf|dev|world|5', 'U5'), familyReliabilities(W, 'cf|dev|world|5', 'U5'));
  }],
  ['E1F (development family only): every forecaster is scored on the same events; rows are deterministic', () => {
    const run = () => runE1F({ world: W, worldLabel: 'cf|dev|world|5', family: DEV_FAMILY });
    const a = run(); assert.deepEqual(a, run());
    const names = Object.keys(FORECASTERS); assert.deepEqual(Object.keys(a.forecasts).sort(), [...names].sort());
    const n = a.forecasts.V3.all.n;
    assert.ok(n >= 600);
    for (const f of names) {
      const x = a.forecasts[f];
      assert.equal(x.all.n, n, `${f} scored on a different number of events`);
      assert.equal(x.explore.n + x.test.n, n); assert.equal(x.untried.n + x.tried.n, n);
      assert.equal(x.all.bins.reduce((s, b) => s + b.hit, 0), a.forecasts.V3.all.bins.reduce((s, b) => s + b.hit, 0), 'same outcomes');
    }
    assert.equal(a.forecasts.V3.invalid, 0); assert.equal(a.forecasts.CONST.modal.n, 0); assert.equal(a.forecasts.LAPLACE.modal.n, 0);
    assert.ok(a.forecasts.V3.untried.n > 0, 'first attempts are scored');
  }],
  ['E1F: the CONST and LAPLACE forecasters follow their closed forms', () => {
    const c = FORECASTERS.CONST(), l = FORECASTERS.LAPLACE();
    close(c.pMove(1, 0), 0.5); close(l.pMove(1, 0), 0.5);
    for (const [s, a, s2] of [[1, 0, 2], [1, 0, 1], [3, 1, 4], [1, 0, 2]]) { c.update(s, a, s2); l.update(s, a, s2); }
    close(c.pMove(9, 9), 3.5 / 5); close(c.pMove(1, 0), 3.5 / 5);
    close(l.pMove(1, 0), 3 / 5); close(l.pMove(3, 1), 2 / 3); close(l.pMove(9, 9), 0.5);
  }],

  // ---- agent ----
  ['DETERMINISM: MBVI3 gives identical rows on repeated runs', () => {
    const run = () => runTaskV1({ task: 'E1S', world: W, worldLabel: 'cf|dev|world|5', kind: 'MBVI3', arm: 'EXPLORED', makeAgent: makeAgentForV3 });
    assert.deepEqual(run(), run()); assert.equal(run().censored, 0);
  }],
  ['INVARIANCE (hidden reliability): MBVI3 behaves identically until the edge is first attempted, on three edges', () => {
    const START = 0, GOAL = 11;
    const runSeq = (e, p) => {
      const env = new GraphEnv(W, { seedLabel: 'cf|test|v3|inv|env', maxSteps: 80 });
      env.setRewardNode(GOAL); env.setCue(GOAL); env.setReliability(e[0], e[1], p);
      const agent = makeAgentForV3('MBVI3', env, 'cf|test|v3|inv|agent');
      let obs = env.reset({ start: START }); const seq = [], edges = [];
      for (let t = 0; t < 600; t++) {
        const s = env.inspect().pos, a = agent.act(obs);
        seq.push([obs.node, a]); edges.push(edgeKey(s, W.exitOrder[s][a]));
        const r = env.step(a);
        agent.observe(Object.freeze({ obs, action: a, reward: r.reward, next: r.obs, done: r.done, truncated: r.truncated }));
        obs = r.done || r.truncated ? env.reset({ start: START }) : r.obs;
      }
      return { seq, edges };
    };
    let probed = 0;
    for (const i of [3, 7, 12, 19, 25]) {
      const e = W.edges[i], A = runSeq(e, 1), B = runSeq(e, 0.05), first = A.edges.indexOf(edgeKey(...e));
      if (first < 0) continue;
      probed++;
      assert.deepEqual(checkInvariance(A.seq, B.seq, first + 1), []);
    }
    assert.ok(probed >= 3, `only ${probed} probed edges were attempted`);
  }],
];
```

## Appendix T. Tests for task E4 and the arbitration agent

File: `cognitive/tests/test_arb.mjs` · SHA-256 `fc06685aaa0f7c2e7c92e8b32594f09aba2bacf30440358cabe2f70718e8f3fb` · 109 lines

```js
// CF-04 tests — task E4 (layout, phases, windows, determinism) and the arbitration agent (isolation, control log,
// signals, the random-switch control)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENTS_V4, ARB_FILES, ARB_ALLOWED, ARB_VARIANTS, agentOptionsV4, makeAgentForV4 } from '../testbed/registry_v4.mjs';
import { AGENTS_V3 } from '../testbed/registry_v3.mjs';
import { PRIVILEGED } from '../testbed/runner.mjs';
import { checkPrivilege } from '../testbed/checks.mjs';
import { checkSourceIsolation } from '../testbed/checks_v1.mjs';
import { GraphEnv } from '../testbed/env.mjs';
import { generateWorld, distancesTo, edgeKey } from '../testbed/worlds.mjs';
import { runE4, layoutE4, reliabilitiesE4, E4_PARAMS, E4_ARMS } from '../testbed/task_e4.mjs';
import { makeARB, ARB_DEFAULTS } from '../mind/arb/agent.mjs';
import { makeStream } from '../testbed/rng.mjs';

const ARB_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'mind', 'arb');
const LABEL = 'cf|dev|world|5', W = generateWorld(LABEL);
const O = (node, nActions, goal = null) => Object.freeze({ node, nActions, goal });
const T = (obs, action, reward, next, done = false) => Object.freeze({ obs, action, reward, next, done, truncated: false });

export const tests = [
  ['the arbitration module imports only agent_util.mjs and the v3 agent, and uses no forbidden API', () => {
    assert.deepEqual(fs.readdirSync(ARB_DIR).filter((f) => f.endsWith('.mjs')).sort(), [...ARB_FILES].sort());
    for (const f of ARB_FILES) assert.deepEqual(checkSourceIsolation(fs.readFileSync(path.join(ARB_DIR, f), 'utf8'), ARB_ALLOWED, f), []);
    assert.ok(checkSourceIsolation("import { GraphEnv } from '../../testbed/env.mjs';", ARB_ALLOWED).length > 0, 'mutant must be caught');
  }],
  ['privilege: only ORACLE receives the oracle channel under the v4 registry; earlier kinds are the earlier factories', () => {
    const env = new GraphEnv(W, { seedLabel: 'cf|test|arb|priv' });
    assert.deepEqual(checkPrivilege(Object.keys(AGENTS_V4), PRIVILEGED, (k) => agentOptionsV4(k, env, 'cf|test|arb|priv|agent')), []);
    for (const k of Object.keys(AGENTS_V3)) assert.equal(AGENTS_V4[k], AGENTS_V3[k]);
    for (const k of Object.keys(ARB_VARIANTS)) assert.equal(makeAgentForV4(k, env, 'cf|test|arb|priv|agent').kind, k);
  }],
  ['E4 LAYOUT: the blocked edge lies on a shortest route and lengthens it; the sham edge lies on none', () => {
    for (let i = 0; i < 12; i++) {
      const label = `cf|dev|world|${i}`, w = generateWorld(label), L = layoutE4(w, label);
      assert.ok(L, `world ${i} has a layout`);
      const d = distancesTo(w, L.goal)[L.start];
      assert.equal(d, L.distance); assert.ok(d >= E4_PARAMS.minDistance);
      const cut = distancesTo(w, L.goal, new Set([edgeKey(...L.blocked)]))[L.start];
      assert.equal(cut, L.detourDistance); assert.ok(cut > d, 'blocking lengthens the route');
      assert.equal(distancesTo(w, L.goal, new Set([edgeKey(...L.sham)]))[L.start], d, 'the sham block leaves the shortest route unchanged');
    }
    const rel = reliabilitiesE4(W, LABEL);
    assert.equal(rel.length, W.edges.length); assert.ok(rel.every(([, , p]) => p >= 0.5 && p <= 1));
    assert.deepEqual(E4_ARMS, ['CHANGE', 'SHAM']);
  }],
  ['E4 RUN: rows are deterministic; windows add up; ORACLE uses the reopened edge and beats every window of a learner', () => {
    const run = (kind, arm) => runE4({ world: W, worldLabel: LABEL, kind, arm, makeAgent: makeAgentForV4 });
    const a = run('MBVI3', 'CHANGE'); assert.deepEqual(a, run('MBVI3', 'CHANGE'));
    for (const k of ['stable', 'post', 'postAll', 'return', 'returnLast']) assert.ok(Number.isInteger(a.windows[k]) && a.windows[k] > 0);
    assert.ok(a.windows.post <= a.windows.postAll); assert.equal(a.metric, a.windows.postAll + a.windows.return);
    const o = run('ORACLE', 'CHANGE');
    assert.ok(o.secondary.usedReopened > 0, 'the oracle returns to the short route');
    assert.ok(o.windows.postAll <= run('QL', 'CHANGE').windows.postAll);
    assert.equal(run('ORACLE', 'SHAM').secondary.usedReopened, 0, 'the sham edge is on no shortest route');
    assert.throws(() => run('MBVI3', 'NOPE'));
  }],
  ['E4 CHANGE against SHAM: before the manipulation the two arms are the same run', () => {
    const c = runE4({ world: W, worldLabel: LABEL, kind: 'MBVI3', arm: 'CHANGE', makeAgent: makeAgentForV4 });
    const s = runE4({ world: W, worldLabel: LABEL, kind: 'MBVI3', arm: 'SHAM', makeAgent: makeAgentForV4 });
    assert.equal(c.windows.stable, s.windows.stable, 'common random numbers: identical until the arms diverge');
  }],
  ['ARB CONTROL LOG: counts are consistent, and the agent is deterministic', () => {
    const run = () => runE4({ world: W, worldLabel: LABEL, kind: 'ARB', arm: 'CHANGE', makeAgent: makeAgentForV4 });
    const a = run(); assert.deepEqual(a, run());
    const c = a.secondary.control;
    assert.ok(c.decisions > 600); assert.ok(c.habitDecisions <= c.decisions); assert.ok(c.decisiveHabit <= c.habitDecisions && c.decisiveHabit <= c.disagreements);
    assert.ok(Math.abs(c.habitShare - c.habitDecisions / c.decisions) < 1e-12); assert.ok(c.switches <= c.decisions);
  }],
  ['ARB SIGNAL: a confidently learned exit that stops working raises the planner signal above the threshold', () => {
    const agent = makeARB({ rng: makeStream('cf|test|arb|signal') });
    const a = O(1, 1), b = O(2, 1);
    for (let i = 0; i < 40; i++) { agent.act(a); agent.observe(T(a, 0, 0, b)); agent.act(b); agent.observe(T(b, 0, 0, a)); }
    const quiet = agent.inspect().control.signals;
    assert.ok(Math.abs(quiet.planner) < 0.02, `a world behaving as predicted gives a planner signal near 0 (${quiet.planner})`);
    agent.act(a); agent.observe(T(a, 0, 0, a));                           // the exit from 1 has stopped working
    const loud = agent.inspect().control.signals;
    assert.ok(loud.planner - loud.habit > ARB_DEFAULTS.theta, `one maximal surprise crosses the threshold (${loud.planner})`);
    assert.ok(ARB_DEFAULTS.rate > ARB_DEFAULTS.theta, 'by construction: a single maximal surprise adds `rate` to the signal');
    const before = agent.inspect().control.habitDecisions;
    agent.act(a);
    assert.equal(agent.inspect().control.habitDecisions, before + 1, 'the habit controller now acts');
  }],
  ['ARB SIGNAL: under stationary noise the habit acts in a minority of decisions, and less with a higher threshold', () => {
    const agent = makeARB({ rng: makeStream('cf|test|arb|noise') }); const rnd = makeStream('cf|test|arb|noise|env');
    const a = O(1, 1), b = O(2, 1);
    let at = a;
    for (let i = 0; i < 3000; i++) { agent.act(at); const moved = rnd() < 0.7; const next = moved ? (at === a ? b : a) : at; agent.observe(T(at, 0, 0, next)); at = next; }
    const c = agent.inspect().control;
    assert.ok(c.habitShare < 0.2, `habit share under stationary noise is ${c.habitShare}`);   // measured about 0.105: noise alone does move the smoothed signal past the threshold some of the time
    const t10 = makeARB({ rng: makeStream('cf|test|arb|noise'), params: { theta: 0.1 } }); const rnd2 = makeStream('cf|test|arb|noise|env'); let at2 = a;
    for (let i = 0; i < 3000; i++) { t10.act(at2); const moved = rnd2() < 0.7; const next = moved ? (at2 === a ? b : a) : at2; t10.observe(T(at2, 0, 0, next)); at2 = next; }
    assert.ok(t10.inspect().control.habitShare < c.habitShare, 'a higher threshold switches less');
  }],
  ['RANDSWITCH: the habit acts at the requested rate, independently of any signal; modes are validated', () => {
    const agent = makeARB({ rng: makeStream('cf|test|arb|rand'), params: { mode: 'RANDOM', mfShare: 0.25 }, kind: 'RANDSWITCH' });
    const a = O(1, 2), b = O(2, 2);
    for (let i = 0; i < 4000; i++) { const x = i % 2 ? a : b, y = i % 2 ? b : a; agent.act(x); agent.observe(T(x, 0, 0, y)); }
    const share = agent.inspect().control.habitShare;
    assert.ok(Math.abs(share - 0.25) < 0.03, `habit share ${share}`);
    const never = makeARB({ rng: makeStream('cf|test|arb|rand0'), params: { mode: 'RANDOM', mfShare: 0 } });
    for (let i = 0; i < 200; i++) { never.act(a); never.observe(T(a, 0, 0, b)); }
    assert.equal(never.inspect().control.habitDecisions, 0);
    assert.throws(() => makeARB({ rng: makeStream('x'), params: { mode: 'NOPE' } }));
  }],
];
```

## Appendix U. Result files not embedded

The per-run result files are too large to embed and are identified by hash:

- `experiments/cf03c/results/gate3c_result.json` · SHA-256 `4792ea415e197d619177fd726643c06d8202037153dafbe19f7d9d707892cf91` · row hash `f2ed201f27ed08e77dea7384d0bd799c6986428816e77fbdaffc69ce9c365083` · 20 worlds × 5 families
- `experiments/cf04/results/gate4_result.json` · SHA-256 `069f44bd1fc24d563f035b8c6f48f1f3c217bda277396efdc9c97c41af020626` · row hash `9e52fe61467dc581b5cd677490dd4ab76f033ae6ebf50b3800556c78da27e181` · 880 rows
