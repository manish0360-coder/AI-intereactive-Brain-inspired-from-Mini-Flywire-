# Review package for an independent reviewer: CF-03c and CF-04

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
