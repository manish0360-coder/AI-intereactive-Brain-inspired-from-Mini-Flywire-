# Learning Mechanisms Research — MiniFlyWire `cognitive/` testbed

**Status:** research review, design input only. No experiment was run, no code changed, nothing here is a result.
**Date:** 2026-11-13. **Scope:** tabular graph worlds of about 24 nodes, plain JavaScript, zero dependencies, no GPU.

**Grounding read:** `docs/COGNITIVE_RESEARCH_REVIEW.md`, `docs/COGNITIVE_ARCHITECTURE_HANDBOOK.md`, `cognitive/core/world_model.mjs`, `cognitive/core/mbvi.mjs`, `cognitive/core/planner.mjs`, `cognitive/agents/dynaq.mjs`, `experiments/cf03/results/RESULTS.md`, `experiments/cf03/GATE_SPEC.md` (calibration disclosure), `cognitive/testbed/tasks_v1.mjs` (E1S header).

**Evidence tags.**
- **[V]** fetched or search-confirmed in this session. **[M]** cited from memory, not checked in this session.
- **Verification status: every citation in this document is [M].** The web-search tool failed on the first batch of lookups (usage limit) and no bibliographic record was confirmed. Author, year and venue are given as remembered; volume and page numbers are omitted unless I am confident. Check every reference before external use.
- Claim grades: **1** established, **2** strong empirical evidence, **3** emerging, **4** plausible engineering inference, **5** unverified hypothesis, **6** speculative.
- Numbers quoted from the repository are the recorded CF-03 development-gate values. Numbers marked "worked example" are closed-form arithmetic done for this review, not measurements.

---

## 1. What the code does today (the baseline every recommendation is measured against)

Facts read from the source (grade 1 as descriptions of the code):

1. **Transition belief** (`world_model.mjs`, `predict`). Per (s, a): `p(SELF) = (nSelf + α0)/(N + 2α0)`, `p(s′) = n(s′)/(N + 2α0)`, `p(UNKNOWN) = α0/(N + 2α0)`, α0 = 0.25. Observed non-self outcomes get **no** pseudo-count. The total prior strength is 0.5 observations.
2. **Environment structure** (handbook §8.3). Each action has exactly one target; it succeeds with hidden probability p, otherwise the agent stays. So the true outcome space per pair is {target, SELF}: a Bernoulli.
3. **Reward belief.** Per arrival state, `(r1 + β0)/(n + β0)`, β0 = 0.1, equal to 1 before any arrival. Optimism is stored inside the belief.
4. **Optimism** (`planner.mjs`, `qValue`). The UNKNOWN mass is valued at `vOpt = 1`. The exploration bonus is therefore `α0·vOpt/(N + 2α0)`, which decays as **1/N**. That is the BEB shape (§4.4), not the 1/√N of MBIE-EB. α0 sets both the belief and the bonus, so the two cannot be tuned independently.
5. **Change handling.** Hard resets: a pair's counts are cleared when N ≥ 20 and the observed outcome had predictive probability < 0.05; reward beliefs are cleared (globally by default) when n ≥ 5 and the reward had probability < 0.05.
6. **Planning.** Gauss–Seidel value iteration on the posterior-mean model, warm-started, budget 100 sweeps, values cleared when the cue changes. Recorded: 6–18 sweeps per decision, budget never binding, one sweep per decision (B1) almost as good.
7. **Calibration metric** (`mbvi.mjs`, `observe`). Before each update, for pairs with N ≥ 1 and at least one observed non-self outcome, the modal non-self probability `pm` is binned (10 equal-width bins) against whether the modal outcome occurred. ECE is computed per run, then prediction-count-weighted across runs. Bins are not exported by `inspect()`.
8. **Dyna-Q baseline** (`dynaq.mjs`). Last-outcome deterministic model, k = 20 uniform planning updates, ε = 0.1. On stochastic edges a single failure overwrites the pair's model with a self-loop.

Recorded outcomes: MBVI beat Dyna-Q on reward relocation (+220.4 [86.6, 372.8] steps); ablating optimism and resets hurt; ECE 0.101 (dev) and 0.100 (gate) against a limit of 0.05; the local reward reset beat the global one on E3 (−12.6 [−18.2, −7.0]).

---

## 2. Model-free value learning

### 2.1 Q-learning, SARSA, Expected SARSA, Double Q-learning

**Problem.** Learn action values from sampled transitions with no model.

```
Q-learning:      Q[s,a] += α (r + γ max_b Q[s′,b]            − Q[s,a])
SARSA:           Q[s,a] += α (r + γ Q[s′,a′]                 − Q[s,a])     a′ = action actually taken next
Expected SARSA:  Q[s,a] += α (r + γ Σ_b π(b|s′) Q[s′,b]      − Q[s,a])
Double Q:        coin flip; QA[s,a] += α (r + γ QB[s′, argmax_b QA[s′,b]] − QA[s,a])   (or the mirror image)
```

**Guarantees.** Q-learning converges to Q* with probability 1 in finite MDPs under standard step-size and visitation conditions (Watkins & Dayan 1992 [M]) — grade 1. SARSA converges under greedy-in-the-limit exploration (Singh, Jaakkola, Littman & Szepesvári 2000 [M]) — grade 1. Expected SARSA removes the sampling variance of the next action and tolerates larger α (van Seijen, van Hasselt, Whiteson & Wiering 2009 [M]) — grade 2. Double Q removes the maximisation bias of the max operator under noisy returns, at the price of an underestimation tendency (van Hasselt 2010 [M]) — grade 2.

**Cost.** O(A) per step, O(SA) memory.

**Where each wins.**
- *SARSA / Expected SARSA over Q-learning:* online return under persistent exploration next to costly states (the "cliff" case in Sutton & Barto 2018 [M]). The testbed has no negative rewards, so there is no cliff. Grade 4: no expected difference on E1–E3.
- *Double Q over Q:* stochastic rewards with many actions. Testbed rewards are deterministic (1 on arrival at the goal), so the maximisation bias has little to act on. Grade 4.
- *All of them:* none can pass revaluation or detour quickly, because cached values must be relearned through experience. The recorded QL figures (587.8 steps on E3 against MBVI's 53.5) are that signature.

**Verdict.** Keep one model-free learner as the habit baseline and as the cheap arm of arbitration (§9). Use Expected SARSA for that slot if the slot is ever re-opened, because it dominates SARSA at equal cost; do not add Double Q. The four are competitors for one slot.

---

## 3. Background planning from a model

### 3.1 Dyna-Q and Dyna-Q+

**Problem.** Propagate value faster than real steps allow; Dyna-Q+ additionally re-tests stale parts of the model.

```
after each real step: Q-update; Model[s,a] ← (s′, r); τ[s,a] ← 0; all other τ += 1
repeat k times: draw a seen (s,a); (s′,r) ← Model[s,a]
    Dyna-Q : r_plan = r
    Dyna-Q+: r_plan = r + κ √τ[s,a]          (τ = steps since the pair was last tried)
    Q-update with r_plan
```

Sutton 1990/1991 [M]; Dyna-Q+ and the blocking/shortcut mazes are in Sutton & Barto 2018 §8.3 [M]. No finite-sample guarantee; grade 2 empirical. Cost: k updates per step.

**Where it wins.** Dyna-Q+ beats Dyna-Q when the world *improves* (a shortcut opens), which optimism-on-novelty alone never re-tests. The current MBVI has the same blind spot: a pair's bonus depends on N only, so a pair believed bad with large N is never retried, and a re-opened edge (the reverse of E2′) would go unnoticed. Grade 4.

**Note on the existing baseline.** The repo's Dyna-Q stores the last outcome only. On E1S a single failed move replaces a pair's model with a self-loop until the next success. Part of the E1S gap (+36.1 [11.8, 71.4]) may therefore be a weak-baseline effect rather than a planning effect — grade 5, untested. A count-model Dyna-Q or Dyna-Q+ arm would be a fairer comparison.

### 3.2 Prioritized sweeping

**Problem.** Spend planning updates where values change most.

```
after a real step: p ← |r + γ max Q[s′,·] − Q[s,a]|; if p > θ push (s,a) with priority p
repeat k times: pop (s,a); full backup of Q[s,a] from the model
    for each predecessor (s̄,ā) of s: p̄ ← |its Bellman error|; if p̄ > θ push
```

Moore & Atkeson 1993 [M]; Peng & Williams 1993 [M]. Converges like asynchronous value iteration when every pair keeps being backed up (grade 1); large empirical speed-ups on big sparse problems (grade 2). Cost: a priority queue and a predecessor index.

**Verdict here: not justified now.** The recorded compute table shows full value iteration converging in 6–18 sweeps (about 300–1,000 backups per decision) and one sweep per decision losing almost nothing. There is no compute bottleneck to relieve at 24 nodes. Revisit only if worlds reach thousands of states. Grade 2 (it follows from the recorded ablation B1).

---

## 4. Model-based exploration with uncertainty

Shared setting: counts n(s,a), empirical model P̂, R̂.

### 4.1 R-max

```
if n(s,a) < m:  treat (s,a) as leading to an absorbing state of value Vmax
else:           use P̂, R̂
plan (value iteration) on this optimistic model; act greedily
```
Brafman & Tennenholtz 2002 [M]. PAC-MDP: near-optimal on all but a polynomial number of steps (grade 1). Cost: one re-plan when a pair becomes "known". Weakness: m is a hard threshold; it over-explores stochastic pairs and wastes steps on irrelevant ones.

### 4.2 MBIE-EB

```
Q̃(s,a) = R̂(s,a) + β / √n(s,a) + γ Σ_s′ P̂(s′|s,a) max_b Q̃(s′,b)
```
Strehl & Littman 2008 [M]. PAC-MDP (grade 1). Smooth bonus instead of a threshold; one parameter β.

### 4.3 UCRL2

```
per episode k: build confidence sets  ‖P − P̂(·|s,a)‖₁ ≤ √(c·S·log(·)/n(s,a))  and a reward interval
    extended value iteration → the optimistic MDP in the set and its optimal policy
    follow it until some n(s,a) doubles
```
Jaksch, Ortner & Auer 2010 [M]. Regret Õ(D·S·√(A·T)) for diameter D in the undiscounted average-reward setting (grade 1). The constants make the confidence sets very loose at T of a few hundred steps, so practical performance at this horizon is usually worse than tuned-bonus methods (grade 3; reported in Osband & Van Roy 2017 [M]).

### 4.4 BEB (Bayesian Exploration Bonus)

```
Q̃(s,a) = R̄(s,a) + β / (1 + n(s,a)) + γ Σ_s′ P̄(s′|s,a) max_b Q̃(s′,b)       (P̄, R̄ posterior means)
```
Kolter & Ng 2009 [M]. Near-*Bayes*-optimal in polynomial time (a weaker target than PAC-MDP, which permits the faster 1/n decay). **MiniFlyWire's MBVI is already BEB-shaped:** the term `p(UNKNOWN)·vOpt = α0·vOpt/(N + 2α0)` is a 1/n bonus. This is a useful classification, grade 4: it tells us which theory the recorded NOOPT ablation supports, and which comparison (1/n against 1/√n) is still open.

### 4.5 PSRL (posterior sampling)

```
at each episode start: sample one MDP M̃ ~ posterior (one Dirichlet draw per (s,a), one Beta draw per reward)
    solve M̃ exactly; follow its greedy policy for the whole episode; update the posterior
```
Strens 2000 [M]; Osband, Russo & Van Roy 2013 [M], Bayesian regret Õ(H·S·√(A·T)) (grade 1); Osband & Van Roy 2017 [M] argue and show on small tabular chains that PSRL beats optimism-based methods (grade 2). Cost: one gamma-variate Dirichlet sampler (about 20 lines) and one full planning pass per episode — cheaper than the current re-plan every step.

**Where it wins.** Stochastic worlds, where a deterministic bonus keeps paying for pairs that are merely noisy; and it needs no bonus constant. **Where it loses.** It depends on the prior being right — the same weakness as the calibration failure — and per-episode resampling reacts slowly within an episode, which matters on E3 where the change must be handled mid-episode. Grade 4.

### 4.6 BAMDP / Bayes-adaptive planning

Plan in the augmented state (s, posterior). The exact solution is Bayes-optimal exploration (Duff 2002 [M]) and is intractable in general; BAMCP approximates it by Monte-Carlo tree search with root sampling (Guez, Silver & Dayan 2012 [M]).

```
BAMCP at each decision: repeat n_sim: sample M̃ ~ posterior; run one UCT simulation in M̃ from s,
    with tree statistics shared across samples; act by root visit counts
```
Asymptotically Bayes-optimal (grade 1); cost thousands of simulations per decision. **Not justified here** beyond BEB and PSRL, which are its cheap approximations. It would be justified only for a task where the *order* of information gathering matters (an information-revealing cue, i.e. the CF-05 partial-observability setting). Grade 4.

**Family verdict.** R-max, MBIE-EB, BEB, UCRL2 and PSRL compete for one slot ("directed exploration"). The current design occupies it with a BEB-style bonus. The justified comparisons, in order: (i) decoupled BEB bonus against 1/√n MBIE-EB; (ii) PSRL on stochastic worlds. UCRL2 and BAMCP are rejected at this scale.

---

## 5. Intrinsic motivation and the noisy-TV failure

| Signal | Definition | Tabular form |
|---|---|---|
| Count bonus | novelty of (s,a) | β/√n — identical to §4.2 |
| Prediction error | −log p̂(s′\|s,a) | surprise of the realised outcome |
| Information gain | KL(posterior after ‖ posterior before) | closed form for Dirichlet; about 1/(2n) per observation for large n |
| Learning progress | decrease of prediction error over time | windowed error difference |
| Empowerment | max over action distributions of I(Aₖ; Sₜ₊ₖ) | Blahut–Arimoto on the learned model |
| RND | error of a predictor network against a fixed random network | a learned pseudo-count |

Sources: Schmidhuber 1991/2010 [M]; Oudeyer, Kaplan & Hafner 2007 [M]; Bellemare et al. 2016 (pseudo-counts) [M]; Pathak et al. 2017 [M]; Burda et al. 2018 (RND) [M]; Klyubin, Polani & Nehaniv 2005 (empowerment) [M]; Lopes, Lang, Toussaint & Oudeyer 2012 (learning progress in model-based RL) [M].

**The noisy-TV failure.** A bonus proportional to raw prediction error never decays on an irreducibly random transition, so the agent is drawn to noise indefinitely (described in Burda et al. 2018, large-scale curiosity study [M]; grade 2 as an observed failure). In this testbed the "TV" is an edge with p ≈ 0.5: its surprise stays near ln 2 for ever. **Count-based and information-gain bonuses are immune by construction**, because both shrink with n regardless of outcome entropy (grade 1, it follows from the formulas).

**Verdicts.**
- *Information gain* and *counts* are near-equivalent for Dirichlet models. Keep counts.
- *Prediction-error curiosity:* reject as a drive. Keep surprise as an input to change detection only (§6).
- *Learning progress:* justified only when a noisy-edge control shows the count bonus being wasted, or under non-stationarity where counts are stale.
- *RND:* its purpose is to approximate counts where states cannot be enumerated. Here they can. Reject.
- *Empowerment:* computable on a 24-node model, but it is a preference for controllable states, not a learning mechanism, and no battery task rewards it. Reject for now (grade 4).

---

## 6. Non-stationarity and change detection

### 6.1 Methods

```
CUSUM (Page 1954 [M]):   g ← max(0, g + ℓ_t − k);  alarm if g > h
        ℓ_t = log-likelihood ratio "changed vs unchanged", or surprise minus its expectation
Page–Hinkley:            m_t = Σ (x_i − x̄_i − δ);  alarm if m_t − min_i m_i > λ
Sliding window:          estimate from the last W observations only
Discounted counts:       n ← η·n before each increment      (effective memory 1/(1−η))
BOCPD (Adams & MacKay 2007 [M]), run length r:
        P(r_t = r+1) ∝ P(r_{t−1} = r) · pred_r(x_t) · (1 − H)
        P(r_t = 0)   ∝ Σ_r P(r_{t−1} = r) · pred_r(x_t) · H
        prediction = run-length-weighted mixture of per-run-length posteriors
Latent cause / context (Gershman, Blei & Niv 2010 [M]; Gershman & Niv 2010 [M]; RL-CD, da Silva et al. 2006 [M]):
        keep several models; assign each observation to the model that predicts it best, or open a new one
        under a Chinese-restaurant prior; learn only in the active model
```

**Guarantees and evidence.** CUSUM is minimax-optimal in detection delay for a known pre/post change at a fixed false-alarm rate (Lorden 1971; Moustakides 1986 [M]) — grade 1. BOCPD is exact Bayesian inference under its model, with conjugate updates — grade 1. Discounted and sliding-window UCB have regret bounds for abruptly switching bandits (Garivier & Moulines 2011 [M]) — grade 1 for bandits, not for MDPs. Latent-cause models explain spontaneous recovery and renewal after extinction (grade 2 as a behavioural account).

**Cost.** CUSUM and discounting: O(1) per pair. BOCPD: O(run-length cap) per pair per step; with Beta–Bernoulli statistics and a cap of about 50 this is trivial at 24 nodes. Latent cause: one model per context.

### 6.2 Reading of the current design

- The existing reset is a **one-observation likelihood threshold**: effectively CUSUM with h set so a single surprising outcome fires. It is fast and brittle. Worked example: a pair with 20 straight successes has `p(SELF) = 0.25/20.5 ≈ 0.012 < 0.05`, so its first failure wipes all 20 observations. For an edge with true p = 0.97 that failure is ordinary noise, expected about once in 33 attempts. The recorded runs made 0 transition resets on E1S, so this did not occur there; it is a latent hazard for longer runs or more reliable-but-imperfect edges (grade 4).
- A wipe discards evidence and returns the pair to a prior of strength 0.5, which re-creates the early-sample miscalibration of §11 each time.
- **Why the global reward reset lost** (grade 4, consistent with the recorded LOCALRESET result but not tested as a mechanism): `arrive.clear()` returns *every* state to the optimistic reward prior of 1, so with a null cue the planner must re-visit states it had already established as unrewarded. A reward relocation changes two states (old and new goal); a global reset pays for all of them. A change is local unless evidence says otherwise.

### 6.3 Where each should win

| Change type | Best candidate | Why |
|---|---|---|
| Abrupt, deterministic (blocked edge, E2′) | current reset, or CUSUM with a small h | one or two failures are decisive when the prior belief was near 1 |
| Abrupt, stochastic edges | BOCPD or CUSUM on accumulated evidence | a single failure is not decisive |
| Slow drift | discounted counts | no change point exists to detect |
| Recurring contexts (A→B→A) | latent-cause / context models | reset-based methods relearn A from zero each time |
| Improvement (edge re-opens) | Dyna-Q+ style staleness bonus | no surprise is generated without a retry |

The battery has only the first row. Rows 2–5 need new tasks (the handbook's E4) before any of these mechanisms can be credited.

---

## 7. Hierarchical RL

**Options** (Sutton, Precup & Singh 1999 [M]): an option is (initiation set, policy, termination). SMDP Q-learning:
```
Q[s,o] += α (R_k + γ^k max_o′ Q[s′,o′] − Q[s,o])        (R_k: discounted reward over the option's k steps)
```
Converges to the optimal policy *over the given options* (grade 1); optimal overall only if primitives remain available. **MAXQ** (Dietterich 2000 [M]) decomposes value over a hand-given task graph and converges to a recursively optimal policy. **Feudal RL** (Dayan & Hinton 1993 [M]) has managers set sub-goals for workers.

**Option discovery.** Bottlenecks from successful trajectories (McGovern & Barto 2001 [M]); betweenness centrality on the transition graph (Şimşek & Barto 2008 [M]); eigenoptions from the graph Laplacian's eigenvectors (Machado, Bellemare & Bowling 2017 [M]), which the authors report improve exploration by reducing diffusion time.

**When options help or hurt.** They help exploration and credit assignment when the horizon is long and the sub-goals are reused across tasks. They can *slow* learning when added to primitives without need, because they enlarge the action set and bias exploration toward their end states (Jong, Hester & Stone 2008 [M]) — grade 2.

**Verdict.** With an exact planner on a 24-node model, options have nothing to speed up: recorded MBVI test episodes take 4–13 steps and planning converges in under 20 sweeps. Hierarchy is **not justified** until a long-horizon task (E10) shows flat planning or flat exploration failing. If that happens, betweenness options computed on the learned graph are the first candidate: at this scale exact betweenness is a few milliseconds. Grade 4.

---

## 8. Successor features and transfer

**Successor representation** M(s,s′) = E[Σ γᵗ 1(sₜ = s′)] under a policy (Dayan 1993 [M]); V = M·r. **Successor features** generalise this to ψ^π(s,a) = E[Σ γᵗ φₜ] with r = φ·w, and **generalized policy improvement** acts by
```
a = argmax_a max_i ψ^{π_i}(s,a) · w_new
```
Barreto et al. 2017 [M]. Guarantee: the GPI policy is at least as good as every stored policy on the new task, with a bound that degrades with the distance between reward vectors (grade 1). Limitation: the SR is policy-dependent and does not transfer across *transition* changes (Lehnert, Tellex & Littman 2017 [M]) — grade 2.

**Where it wins.** Many reward functions on fixed dynamics, when re-planning is expensive. **Here** re-planning costs a few hundred backups, and the model-based agent already handles reward relocation. SR/GPI is therefore not a performance component. Its value is as a **theory-discriminating baseline** (fast on reward revaluation, slow on transition revaluation), as the existing review §5 already says. Grade 4.

**Transfer and continual learning in general.** The minimal transferable object at this scale is the *prior* (§11, fix F2): hyper-parameters such as "edges usually succeed with probability around 0.75" carry across worlds of one family. Catastrophic forgetting and its remedies such as EWC (Kirkpatrick et al. 2017 [M]) are function-approximation problems; a table has no interference between entries. The tabular continual-learning problem is *staleness*, which §6 covers. Reject continual-learning machinery (grade 1 for the no-interference fact).

---

## 9. Arbitration between model-based and model-free control

| Account | Rule |
|---|---|
| Uncertainty-based (Daw, Niv & Dayan 2005 [M]) | each controller carries a posterior variance for its value; act on the more certain one |
| Reliability-based (Lee, Shimojo & O'Doherty 2014 [M]) | track each controller's recent prediction-error magnitude (state prediction error for MB, reward prediction error for MF); weight by reliability |
| Cost–benefit (Kool, Gershman & Cushman 2017 [M]; Kool, Cushman & Gershman 2016 [M]) | use MB when its expected reward advantage exceeds its (cognitive) cost |

```
rel_MB ← (1−λ)·rel_MB + λ·1[|SPE| < τ];   rel_MF ← (1−λ)·rel_MF + λ·1[|RPE| < τ]
w = σ(κ·(rel_MB − rel_MF) − cost);          Q = w·Q_MB + (1−w)·Q_MF
```
These are descriptive accounts of human and rodent behaviour (grade 2 as such); none carries an optimality guarantee for the engineering problem.

**Verdict.** Arbitration exists to economise on expensive planning. The recorded compute table shows planning is nearly free here and one sweep per decision suffices. A mixture with a slower, less accurate MF controller can then only add error. **Not justified at this scale as a performance component** (grade 4). The handbook plans arbitration for CF-04; this review recommends it be re-scoped as *adaptive planning budget* (already shown unnecessary by B1) or deferred until a task makes planning costly or the model systematically wrong (partial observability). It remains legitimate as a cognitive-modelling demonstration, labelled as such.

---

## 10. Adaptive learning rates and meta-learning

```
Rescorla–Wagner:  V += α·(r − V)                                       fixed α
Pearce–Hall:      α_t = η·|δ_{t−1}| + (1−η)·α_{t−1};  V += κ·α_t·δ_t   associability follows recent surprise
Volatility (Behrens et al. 2007 [M]): Bayesian observer infers reward rate, volatility v and its rate of change;
                  the effective learning rate rises with v
HGF (Mathys et al. 2011 [M]): hierarchy of Gaussian random walks; each level's step size is set by the level above;
                  closed-form variational updates, precision-weighted prediction errors
```
Rescorla & Wagner 1972 [M]; Pearce & Hall 1980 [M]. Evidence: humans raise learning rates in volatile blocks (grade 2). The fully Bayesian form of the same idea is BOCPD (§6): its run-length posterior *is* an adaptive learning rate, large after a suspected change.

**Verdict.** A count model already has the Bayes-optimal decaying learning rate 1/(N + prior) for a stationary world. The only thing an adaptive rate adds is non-stationarity handling. One mechanism should own that: per-pair BOCPD, or discounted counts. HGF and Pearce–Hall are **competitors** for the same slot with weaker guarantees for discrete outcomes; reject them as redundant. Meta-learning across tasks ("learning to learn" with recurrent networks) needs a task distribution and a network; the tabular counterpart is the learned prior (F2). Grade 4.

---

## 11. Calibration, and the MBVI A4 failure

### 11.1 Tools

- **Brier score** (Brier 1950 [M]): mean (p − y)². Proper. Decomposes into reliability − resolution + uncertainty (Murphy 1973 [M]).
- **ECE** (Naeini, Cooper & Hauskrecht 2015 [M]; popularised by Guo et al. 2017 [M]): Σ_b (n_b/n)·|acc_b − conf_b|. Not a proper score, and the binned plug-in estimator is biased, generally upward at small bin counts (Kumar, Liang & Ma 2019 [M]; Nixon et al. 2019 [M]) — grade 2.
- **Why Bayesian predictions are expected to be calibrated:** a Bayesian forecaster is calibrated *with respect to its own prior* (Dawid 1982 [M]) — grade 1. Therefore sequential miscalibration of a conjugate model means one of: the prior does not match the population of problems, the likelihood is mis-specified, the data are selected, or the world is non-stationary.
- **Adaptive sampling bias:** sample means of adaptively chosen arms are biased (Nie, Tian, Taylor & Zou 2018 [M]); selecting the option with the highest estimate inflates that estimate (the "optimizer's curse", Smith & Winkler 2006 [M]) — grade 2.

### 11.2 Diagnosis from the code

The scored quantity is `pm = k/(N + 0.5)` (k successes in N tries). E1S draws each edge's reliability as 0.5 + 0.5u, i.e. uniform on [0.5, 1]. The correct predictive is the posterior mean under that distribution. Worked examples (closed form, ratio of ∫rᵏ⁺¹(1−r)ᶠ to ∫rᵏ(1−r)ᶠ over [0.5, 1]):

| History (k successes / N) | Model `k/(N+0.5)` | Correct posterior mean | Error |
|---|---|---|---|
| 1 / 1 | 0.667 | 0.778 | −0.111 (under-confident) |
| 2 / 2 | 0.800 | 0.804 | ≈ 0 |
| 3 / 3 | 0.857 | 0.827 | +0.030 |
| 5 / 5 | 0.909 | 0.864 | +0.045 |
| 10 / 10 | 0.952 | 0.917 | +0.035 |
| 1 / 2 | 0.400 | 0.688 | **−0.288** |
| 2 / 3 | 0.571 | 0.709 | **−0.138** |

Findings, in order of estimated importance:

**D1. The prior is too weak and centred in the wrong place (grade 4, primary).** Total strength is 0.5 pseudo-observations, and none of it sits on success. The estimate is close to the raw frequency, which is extreme at small N in both directions. The population it faces has mean 0.75 and variance 1/48, which moment-matches Beta(6, 2): a prior worth about 8 observations.

**D2. The error is two-sided, and the larger part is probably under-confidence after failures (grade 5).** The repository's stated hypothesis is early *over*-confidence after 1–4 successes (0.67–0.89 against a mean reliability of 0.75). The table refines this: the right comparator is the conditional posterior mean, not 0.75. After pure success streaks the over-confidence is modest (≤ 0.05). After any early failure the model under-predicts by 0.14–0.29, because it has no knowledge that edges are usually reliable. Which side dominates the recorded 0.101 depends on how predictions distribute over histories, and that needs the per-bin data. Prediction to check: bins 0.3–0.6 show realised hit rates near 0.7.

**D3. Probability leaks to UNKNOWN (grade 4).** Each action has exactly one target, so once the target has been seen the UNKNOWN category can never occur in the current worlds, yet it retains `α0/(N + 2α0)`: 0.167 at N = 1, 0.045 at N = 5. This pushes every `pm` down and partly offsets streak over-confidence. It exists to carry the optimism bonus — the coupling noted in §1.

**D4. Selection by the policy (grade 5).** The agent plans on its own estimates and so re-uses pairs whose early samples were lucky. Predictions are scored only on chosen pairs. This inflates confidence on what is scored. The recorded NOOPT figure (ECE 0.075 with ε-greedy sampling that revisits pairs more evenly) is consistent with D1 and D4 and does not separate them.

**D5. The estimator and threshold (grade 4).** ECE is computed per run with 10 bins and then averaged. A *perfectly* calibrated forecaster with about 600 predictions spread over 4–6 occupied bins has an expected per-run ECE of roughly 0.02–0.04 from binomial noise alone (E|p̂ − p| ≈ 0.8·√(p(1−p)/n_b), with p ≈ 0.75 and n_b ≈ 100–150). This is a back-of-envelope figure, not a measurement. If it holds, a 0.05 limit leaves little room, and a correct model could fail A4 by chance. `run_gate.mjs` already notes that per-run binning is conservative.

**Ruled out by the record.** Resets (0 transition resets; NORESET has identical ECE) and non-stationarity (E1S is stationary). So forgetting, discounting and change-point fixes do **not** address A4. They matter for calibration *after change*, which A4 does not measure.

### 11.3 Fix candidates, ranked

| Rank | Fix | What it changes | Expected effect | Risk |
|---|---|---|---|---|
| **F1** | **Separate belief from bonus.** Belief: Beta(a, b) on success against SELF for a pair whose target is known; no UNKNOWN mass after the first success. Exploration: an explicit additive bonus β/(1 + N) in the planner | removes D3 and the α0 coupling | prerequisite for every other fix; small ECE gain alone | behaviour changes; A1–A3 must be re-established on fresh worlds |
| **F2** | **Hierarchical (empirical-Bayes) prior.** Estimate a shared Beta(a, b) from all pairs by moments, over a weak fixed hyper-prior, and use it for every pair | fixes D1 and D2 without giving the agent environment knowledge; also the "prior transfer" object for CF-06 | largest expected gain; worked example with Beta(6, 2): errors in the table fall to ≤ 0.03 | early in a run the pooled estimate is itself noisy; needs the hyper-prior |
| **F3** | **Fixed stronger declared prior** (for example Beta(1, 1) or Beta(2, 1) on success) | partial D1 fix, one line | moderate | a declared structural prior chosen after seeing dev results is tuning; it must be frozen and tested on new worlds |
| **F4** | **Repair the measurement** in a new pre-declared criterion: pooled (not per-run) ECE with a debiased estimator or a bootstrap null band, plus Brier and log-loss, plus an off-policy probe set (a fixed uniform sweep of pairs scored without learning) | fixes D5 and isolates D4 | tells us whether the model or the metric failed | must not be applied retroactively to CF-03; A4 stays failed |
| **F5** | **Post-hoc recalibration** (temperature or isotonic mapping fitted on earlier predictions) | masks symptoms | can reach the threshold | treats the output, not the belief the planner uses; reject as a primary fix |
| **F6** | Forgetting / discounted counts / change-point resets | nothing relevant to A4 | none on stationary E1S; slightly worse (fewer effective samples) | reject for A4; keep for §6 |

Order of work: export the bins and run F4's diagnostics first (it decides between D1/D2/D4/D5), then F1 + F2 as one frozen design, with F3 as the simpler baseline arm that F2 must beat.

---

## 12. Decision-time planning and deep world models

**Background versus decision-time planning.** Background planning (Dyna, value iteration) improves a global value table; decision-time planning (MCTS, MPC) searches from the current state only.

```
UCT (Kocsis & Szepesvári 2006 [M]): in the tree choose argmax_a Q(s,a) + c·√(ln N(s)/N(s,a)); expand; roll out; back up
RTDP (Barto, Bradtke & Singh 1995 [M]): repeat trials from s₀: full Bellman backup at the current state, act greedily, move
MPC: plan H steps from the current state, execute the first action, re-plan
```
UCT converges to the optimal action as simulations grow (grade 1). RTDP converges on the relevant states under an admissible heuristic (grade 1). They win when the state space is too large to sweep. At 24 states a full sweep costs about 50 backups, so exhaustive value iteration strictly dominates sampling-based search. **Reject MCTS, trajectory sampling and RTDP at this scale** (grade 1 by cost arithmetic). Note that MBVI already re-plans at every decision, which makes it MPC with an exact global planner.

**Dreamer, MuZero, PlaNet** (Hafner et al. 2019, 2020, 2025; Schrittwieser et al. 2020 [M]). What transfers down:
- learn a model and plan or learn inside it → already done exactly (MBVI);
- MuZero's *value-equivalence* idea, that a model need only predict what planning needs → at tabular scale this is state abstraction or bisimulation, relevant only if worlds grow;
- Dreamer's uncertainty-free latent rollouts → nothing to transfer; the count model is exact and carries uncertainty.

What does not transfer: latent encoders, recurrent state-space models, replay buffers, gradient training. They solve perception and generalisation problems that do not exist when observations are state labels. **Reject** (grade 1).

---

## 13. Bayesian learning, causal RL, reward modelling

**Bayesian learning** is already the substrate: Dirichlet/Beta counts. The open items are the prior (§11) and the non-stationary posterior (§6). Bayesian Q-learning (Dearden, Friedman & Russell 1998 [M]) keeps posteriors over values rather than models; with an exact planner, model posteriors are the cleaner object. Reject.

**Causal RL.** The agent's own actions are interventions, so its count model is an interventional model, and confounding does not arise for online tabular learning (grade 1; Pearl 2009 [M]). Confounding arises with *observational* data from another agent whose choices depended on variables the learner cannot see (Bareinboim, Forney & Pearl 2015 [M]). In MiniFlyWire that situation exists only in the legacy cross-session transfer of stores, not in `cognitive/`. A minimal causal discipline is still worth keeping: never merge counts from another policy's logs with own-experience counts without a provenance tag. The handbook's provenance rule already says this. No causal-discovery algorithm is justified.

**Reward modelling and decomposition.** Reward as a function of the arrival state is the right minimal model for these worlds. Decomposed rewards (Russell & Zimdars 2003 [M]; Juozapaitis et al. 2019 [M]) help explanation when several reward sources coexist; the testbed has one. The one justified change is the one in §6.2: keep the reward *belief* (a Beta posterior mean) separate from the *optimism* (a bonus), and make reward change detection local.

---

## 14. Methods assessed only for justification at this scale

| Method | Problem it solves | Present here? | Verdict |
|---|---|---|---|
| Self-supervised / contrastive representation learning | compress high-dimensional observations | no; the observation is the state id | reject |
| Graph neural networks | generalise across graphs through node features | no node features; the graph is hidden and the labels are random | reject; structural transfer is better served by a learned prior |
| Neuro-symbolic learning | combine perception with rules | no perception problem; the table is already symbolic | reject |
| Evolutionary / population methods | gradient-free search over policy or hyper-parameters (e.g. Salimans et al. 2017 [M]) | no within-lifetime role; using them over hyper-parameters would be tuning on outcomes, which the governance rules forbid outside a frozen dev protocol | reject as a learning mechanism |
| Deep RL generally (DQN, PPO) | function approximation | not needed for about 60 state–action pairs | reject |

All grade 1–2: each conclusion follows from the absence of the problem the method addresses.

---

## 15. Comparison table

| Method | Solves | Cost | Guarantee / evidence | Complementary with | Competes with | Justified here? |
|---|---|---|---|---|---|---|
| Q-learning | model-free control | O(A)/step | converges to Q* (1) | Dyna, arbitration | SARSA family | baseline only |
| SARSA / Expected SARSA | on-policy safe control | O(A)/step | converge (1); lower variance (2) | — | Q-learning | no task needs it |
| Double Q | maximisation bias | 2 tables | removes over-estimation (2) | — | Q-learning | no (deterministic reward) |
| Dyna-Q | value propagation | k updates/step | empirical (2) | any MF learner | value iteration | baseline; count-model variant advised |
| Dyna-Q+ | re-testing stale beliefs | + one counter | empirical (2) | change detection | optimism on counts only | **yes**, as a staleness bonus |
| Prioritized sweeping | planning efficiency | queue + predecessors | async-VI convergence (1) | large models | full sweeps | no (B1 shows no bottleneck) |
| R-max | directed exploration | re-plan on "known" | PAC-MDP (1) | — | MBIE-EB, BEB, PSRL | no; threshold is crude |
| MBIE-EB | directed exploration | bonus term | PAC-MDP (1) | change detection | BEB, PSRL | **yes**, as a comparison arm |
| BEB | directed exploration | bonus term | near-Bayes-optimal (1) | calibrated prior | MBIE-EB, PSRL | **yes** (current design, once decoupled) |
| UCRL2 | regret-optimal exploration | extended VI | Õ(DS√(AT)) (1) | — | PSRL | no (loose at short horizons) |
| PSRL | exploration without a bonus | one plan per episode | Bayesian regret (1); strong tabular results (2) | hierarchical prior | bonus methods | **yes**, on stochastic worlds |
| BAMDP / BAMCP | Bayes-optimal exploration | thousands of simulations | asymptotic (1) | — | BEB, PSRL | no |
| Count / information-gain bonus | novelty | O(1) | = MBIE-EB/BEB | — | curiosity | yes (same slot) |
| Prediction-error curiosity, RND | novelty without counts | network or error trace | noisy-TV failure (2) | — | counts | **no** |
| Learning progress | noise-robust curiosity | error window | empirical (3) | discounted counts | counts | only with a noisy-edge task |
| Empowerment | preference for control | channel capacity | none for reward | — | — | no |
| CUSUM / Page–Hinkley | abrupt change | O(1)/pair | minimax delay (1) | local reset | BOCPD | **yes**, simplest upgrade |
| BOCPD | change with uncertainty | O(R)/pair/step | exact under its model (1) | PSRL, calibration | CUSUM, HGF | yes, if CUSUM is not enough |
| Sliding / discounted counts | drift | O(1) | bandit regret bounds (1) | — | resets | only with a drift task |
| Latent-cause contexts | recurring regimes | one model per context | behavioural (2) | BOCPD | resets | only with an A→B→A task |
| Options / MAXQ / feudal | long horizons | SMDP learning | optimal over options (1); can hurt (2) | betweenness discovery | flat planning | no, until E10 fails |
| Eigenoptions / betweenness | option discovery | eigen-decomposition / BFS | empirical (2–3) | options | — | no, as above |
| SR / successor features + GPI | reward transfer | O(S²) | GPI bound (1) | — | re-planning | diagnostic baseline only |
| Pearce–Hall / volatility / HGF | adaptive learning rate | O(1) | behavioural (2) | — | BOCPD, discounting | no (redundant) |
| MB/MF arbitration | economise planning | 2 controllers | behavioural (2) | — | always-MB | no, as a performance component |
| MCTS / RTDP / MPC search | large state spaces | simulations | convergence (1) | — | value iteration | no |
| Dreamer / MuZero / PlaNet | learned latent dynamics | networks, GPU | benchmark results (2) | — | count model | no |
| Hierarchical prior + proper scoring | calibration | O(pairs) | calibrated under its prior (1) | every model-based method | fixed prior, temperature scaling | **yes**, first priority |
| Causal discovery, GNN, contrastive, neuro-symbolic, evolutionary | (see §14) | high | — | — | — | no |

---

## 16. Implications for MiniFlyWire

### 16.1 Recommended learning stack (ranked; 8 components)

| # | Component | Simplest implementation | Expected measurable benefit | Falsifier |
|---|---|---|---|---|
| 1 | **Calibrated transition belief** (F1 + F2) | Beta(a, b) per pair on success against SELF once a target is known; (a, b) pooled across pairs by moments over a weak hyper-prior; UNKNOWN only for untried pairs | pooled ECE on stochastic worlds below a pre-declared limit; higher held-out log-likelihood than the current model | on fresh worlds, ECE and log-loss are not better than the fixed-prior arm F3, or A1–A3 no longer hold |
| 2 | **Explicit exploration bonus, decoupled from belief** | additive β/(1 + N) in `qValue` (BEB), with β/√N (MBIE-EB) as the comparison arm | same or fewer steps on E1/E3 than current MBVI, with exploration strength now tunable independently of calibration | removing the bonus costs nothing (contradicting the recorded NOOPT result), or neither shape differs from the other on any task |
| 3 | **Exact value-iteration planner on the posterior mean** (existing) | keep; set the budget from the B1 evidence | retains the recorded E3 and E2′ advantages over Dyna-Q | a count-model Dyna-Q+ baseline matches it on E3 and E2′ |
| 4 | **Local, evidence-accumulating change detection** | per-pair and per-state CUSUM on log predictive surprise; on alarm, shrink counts toward the pooled prior instead of clearing them; reward changes local | fewer steps than the one-shot reset on a stochastic-change task; no false resets on reliable-but-imperfect edges; E3 no worse than LOCALRESET | on a new hidden-change task with stochastic edges it does not beat the current threshold reset |
| 5 | **Staleness bonus (Dyna-Q+ idea)** | add κ·√τ(s,a) to the bonus, τ = decisions since the pair was last tried | detects a re-opened edge or a new shortcut that count-only optimism never retries | on a shortcut-opens task the agent with the term is no faster; or it costs steps on stationary tasks beyond a pre-declared margin |
| 6 | **PSRL arm** | per episode, sample each pair from its Beta posterior and each reward belief likewise; solve once; act greedily | fewer wasted steps than bonus-based exploration on stochastic worlds (E1S-like, cold start); about one planning pass per episode | no better than component 2 on E1S NAIVE-style tasks, or worse on E3 because of within-episode rigidity |
| 7 | **Model-free baseline and SR baseline** (diagnostic, not in the control path) | existing QL; tabular SR with TD updates | theory discrimination: SR fast on reward revaluation, slow on detour | SR and MBVI are indistinguishable on both, in which case the battery does not separate them |
| 8 | **Context / latent-cause models** (conditional) | up to K count models; assign by predictive likelihood; BOCPD run-length as the switch signal | savings on the second visit to a recurring regime (A→B→A) | no savings over component 4 on a recurrence task. Do not build before that task exists |

Components 1–3 are one agent. Components 4–6 are each a single added mechanism with its own ablation. Components 7–8 are baselines or conditional.

**Task gaps this stack exposes.** Four of the falsifiers need tasks the battery lacks: stochastic hidden change, improvement (shortcut opens), cold-start exploration on stochastic worlds, and regime recurrence. Without them, components 4, 5, 6 and 8 cannot be credited, and by the programme's own rule should not be claimed.

### 16.2 Calibration fix candidates, ranked

1. **F4 diagnostics first** — export per-bin counts, pooled ECE with a null band, Brier and log-loss, and an off-policy probe set. Cheap, and it decides which of D1, D2, D4, D5 is real.
2. **F1 + F2** — decoupled Beta belief with a pooled empirical-Bayes prior. The principled fix.
3. **F3** — a fixed stronger prior, as the simple baseline F2 must beat.
4. **F5** — post-hoc recalibration: reject as primary; acceptable only as a reported diagnostic.
5. **F6** — forgetting, discounting, change-point resets: irrelevant to A4 (stationary task, zero resets recorded).

Governance note: A4 failed and stays failed for CF-03. Any fix is a new milestone with parameters frozen on dev worlds and evaluated once on fresh worlds. A changed metric (F4) is a new criterion, not a re-scoring of the old gate.

### 16.3 Methods to reject at this scale

- **Deep and representation learning:** Dreamer, MuZero, PlaNet, DQN/PPO, RND, ICM-style curiosity, contrastive and self-supervised representation learning, graph neural networks, neuro-symbolic systems.
- **Search:** MCTS/UCT, trajectory sampling, RTDP, BAMCP — exhaustive value iteration is cheaper and exact at 24 states.
- **Exploration:** UCRL2 (confidence sets too loose at this horizon), R-max (dominated by smooth bonuses), raw prediction-error curiosity (noisy-TV), empowerment (no task).
- **Efficiency devices with no bottleneck to relieve:** prioritized sweeping, MB/MF arbitration as a performance component, adaptive planning budgets.
- **Redundant adaptive-rate models:** Pearce–Hall, volatility learners, HGF — the Bayesian count model with change detection covers the same function.
- **Hierarchy:** options, MAXQ, feudal, eigenoptions — until a long-horizon task shows flat planning failing.
- **Other:** Double Q-learning, SARSA variants (no task distinguishes them), evolutionary and population methods, causal discovery, continual-learning regularisers, temperature scaling as a calibration fix.

### 16.4 What this review could not establish

- No citation was verified in this session; all are [M].
- The diagnosis in §11.2 is derived from the code and closed-form arithmetic. D2, D4 and D5 are hypotheses until the per-bin data are examined. The 0.02–0.04 noise-floor figure is an estimate.
- The explanation of the global-reset result (§6.2) and the weak-baseline concern for Dyna-Q on E1S (§3.1) are untested.
- The expected benefits in §16.1 are predictions, not results.

---

## References (all [M]: from memory, unverified in this session)

Adams & MacKay 2007, Bayesian online changepoint detection, arXiv:0710.3742 · Bareinboim, Forney & Pearl 2015, Bandits with unobserved confounders, NeurIPS · Barreto et al. 2017, Successor features for transfer in reinforcement learning, NeurIPS (arXiv:1606.05312) · Barto, Bradtke & Singh 1995, Learning to act using real-time dynamic programming, Artif. Intell. · Behrens, Woolrich, Walton & Rushworth 2007, Learning the value of information in an uncertain world, Nat. Neurosci. · Bellemare et al. 2016, Unifying count-based exploration and intrinsic motivation, NeurIPS · Brafman & Tennenholtz 2002, R-max, JMLR · Brier 1950, Verification of forecasts expressed in terms of probability, Mon. Weather Rev. · Burda, Edwards, Storkey & Klimov 2018, Exploration by random network distillation, arXiv:1810.12894 · Burda et al. 2018, Large-scale study of curiosity-driven learning, arXiv:1808.04355 · da Silva, Basso, Bazzan & Engel 2006, Dealing with non-stationary environments using context detection, ICML · Daw, Niv & Dayan 2005, Nat. Neurosci. · Dawid 1982, The well-calibrated Bayesian, JASA · Dayan 1993, Neural Comput. · Dayan & Hinton 1993, Feudal reinforcement learning, NeurIPS · Dearden, Friedman & Russell 1998, Bayesian Q-learning, AAAI · Dietterich 2000, Hierarchical reinforcement learning with the MAXQ value function decomposition, JAIR · Duff 2002, Optimal learning (PhD thesis, UMass Amherst) · Garivier & Moulines 2011, On upper-confidence bound policies for switching bandit problems, ALT · Gershman, Blei & Niv 2010, Context, learning, and extinction, Psychol. Rev. · Gershman & Niv 2010, Curr. Opin. Neurobiol. · Guez, Silver & Dayan 2012, Efficient Bayes-adaptive reinforcement learning using sample-based search, NeurIPS · Guo, Pleiss, Sun & Weinberger 2017, On calibration of modern neural networks, ICML · Hafner et al. 2019 (PlaNet), 2020 (Dreamer), 2025 (DreamerV3, Nature) · Jaksch, Ortner & Auer 2010, Near-optimal regret bounds for reinforcement learning, JMLR · Jong, Hester & Stone 2008, The utility of temporal abstraction in reinforcement learning, AAMAS · Juozapaitis et al. 2019, Explainable reinforcement learning via reward decomposition, IJCAI workshop · Kirkpatrick et al. 2017, Overcoming catastrophic forgetting in neural networks, PNAS · Klyubin, Polani & Nehaniv 2005, Empowerment: a universal agent-centric measure of control, IEEE CEC · Kocsis & Szepesvári 2006, Bandit based Monte-Carlo planning, ECML · Kolter & Ng 2009, Near-Bayesian exploration in polynomial time, ICML · Kool, Cushman & Gershman 2016, When does model-based control pay off?, PLoS Comput. Biol. · Kool, Gershman & Cushman 2017, Cost-benefit arbitration between multiple reinforcement-learning systems, Psychol. Sci. · Kumar, Liang & Ma 2019, Verified uncertainty calibration, NeurIPS · Lee, Shimojo & O'Doherty 2014, Neural computations underlying arbitration between model-based and model-free learning, Neuron · Lehnert, Tellex & Littman 2017, Advantages and limitations of using successor features for transfer in reinforcement learning, arXiv:1708.00102 · Lopes, Lang, Toussaint & Oudeyer 2012, Exploration in model-based reinforcement learning by empirically estimating learning progress, NeurIPS · Lorden 1971, Ann. Math. Stat.; Moustakides 1986, Ann. Stat. (CUSUM optimality) · Machado, Bellemare & Bowling 2017, A Laplacian framework for option discovery in reinforcement learning, ICML (arXiv:1703.00956) · Mathys, Daunizeau, Friston & Stephan 2011, A Bayesian foundation for individual learning under uncertainty, Front. Hum. Neurosci. · McGovern & Barto 2001, Automatic discovery of subgoals in reinforcement learning using diverse density, ICML · Moore & Atkeson 1993, Prioritized sweeping, Mach. Learn. · Murphy 1973, A new vector partition of the probability score, J. Appl. Meteorol. · Naeini, Cooper & Hauskrecht 2015, Obtaining well calibrated probabilities using Bayesian binning, AAAI · Nie, Tian, Taylor & Zou 2018, Why adaptively collected data have negative bias and how to correct for it, AISTATS · Nixon et al. 2019, Measuring calibration in deep learning, CVPR workshops · Osband, Russo & Van Roy 2013, (More) efficient reinforcement learning via posterior sampling, NeurIPS · Osband & Van Roy 2017, Why is posterior sampling better than optimism for reinforcement learning?, ICML · Oudeyer, Kaplan & Hafner 2007, IEEE Trans. Evol. Comput. · Page 1954, Continuous inspection schemes, Biometrika · Pathak, Agrawal, Efros & Darrell 2017, arXiv:1705.05363 · Pearce & Hall 1980, Psychol. Rev. · Pearl 2009, Causality (2nd ed.) · Peng & Williams 1993, Efficient learning and planning within the Dyna framework, Adapt. Behav. · Rescorla & Wagner 1972 · Russell & Zimdars 2003, Q-decomposition for reinforcement learning agents, ICML · Salimans et al. 2017, Evolution strategies as a scalable alternative to reinforcement learning, arXiv:1703.03864 · Schmidhuber 1991; 2010 · Schrittwieser et al. 2020, Nature · Şimşek & Barto 2008, Skill characterization based on betweenness, NeurIPS · Singh, Jaakkola, Littman & Szepesvári 2000, Convergence results for single-step on-policy reinforcement-learning algorithms, Mach. Learn. · Smith & Winkler 2006, The optimizer's curse, Manag. Sci. · Strehl & Littman 2008, J. Comput. Syst. Sci. · Strens 2000, A Bayesian framework for reinforcement learning, ICML · Sutton 1990/1991 (Dyna) · Sutton & Barto 2018, Reinforcement Learning: An Introduction (2nd ed.) · Sutton, Precup & Singh 1999, Artif. Intell. · van Hasselt 2010, Double Q-learning, NeurIPS · van Seijen, van Hasselt, Whiteson & Wiering 2009, A theoretical and empirical analysis of Expected Sarsa, IEEE ADPRL · Watkins & Dayan 1992, Mach. Learn.
