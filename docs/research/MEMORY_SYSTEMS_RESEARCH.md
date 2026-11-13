# Memory Systems Research

Research stream: memory systems. Extends `docs/COGNITIVE_RESEARCH_REVIEW.md` (§4, §5, §7–§9), `docs/COGNITIVE_ARCHITECTURE_HANDBOOK.md` (§9) and `docs/COGNITIVE_AUDIT.md` (§4, §5, §8). It does not repeat their conclusions; where it agrees it says so in one line and moves on.

**Status:** research note, 2026-11-13. Literature synthesis only; no experiment was run and no other file was changed.

**Evidence rules used here.**

- **[V]** bibliographic record (authors, venue, identifier) confirmed by web search in this session (2026-11-12/13). Only what the abstract or record states is relied on.
- **[M]** cited from memory, not checked in this session. Verify before any external use.
- Claim grades: **1** established; **2** strong empirical evidence; **3** emerging; **4** plausible engineering inference; **5** unverified hypothesis; **6** speculative.
- Numbers about MiniFlyWire come from the repository documents named beside them. No other number is given unless it is in a verified abstract.

---

## 1. Framing: a memory is a store that changes a later decision

**Definition used.** A memory system is a triple (write rule, state, read rule) such that, for some task, deleting the state changes a later action and lowers return. A store that fails this is a log, not a memory. This is the audit's criterion (audit §4, class ACTIVE) turned into a design rule.

**The sufficiency argument (grade 1 for the mathematics, grade 4 for the consequences).** In a stationary, fully observable, tabular MDP the transition counts N(s, a, s′) and the reward sums R(s, a, s′) are sufficient statistics of all experience for control. Every other store an agent could build from the same experience is a function of them: the Q-table is the Bellman fixed point on the estimated model; an episode buffer is the same transitions in order; replay re-applies them; the successor representation is (I − γP^π)⁻¹ for the estimated P; "trust", "familiarity" and visit counts are marginals of N.

So in the testbed as it stands (`cognitive/`, observable node id, stationary within a phase), MBVI already holds everything the other stores could hold. A second store can only change *compute* (how fast a decision is produced) or *sample efficiency constants* (how experience is weighted), never the information available. This is the formal version of audit §8: six legacy stores encoded one statistic.

**What breaks sufficiency.** Exactly four conditions make an additional memory carry information the count model does not:

1. **Partial observability.** The observation is not the state, so counts over observations are counts over the wrong variable.
2. **Non-stationarity.** Old counts describe a world that no longer exists; order and recency of experience matter.
3. **Sparse data relative to state size.** The model is too poorly estimated to plan on, and single trajectories are the best available evidence.
4. **Multi-task or multi-world transfer.** Statistics from other worlds are relevant only through shared structure.

Every mechanism below is assigned to one or more of these conditions. A mechanism that maps to none is redundant here.

---

## 2. Mechanisms

Each entry gives: the decision problem only this mechanism solves; the algorithm; evidence; failure modes; cost; the operational test. S = states, A = actions, O = observations, T = stored transitions.

### 2.1 Sensory buffer

- **Problem.** The single current observation lacks information that the immediately preceding one or two observations supply (direction of travel, the edge just used).
- **Algorithm.** A fixed FIFO of the last k (observation, action) pairs, overwritten every step, no gating. State key = concatenation.
- **Evidence.** Sperling 1960 [M] for the biological store; frame stacking in DQN (Mnih et al. 2015 [M]) is the engineering form. k-order Markov state is textbook (grade 1).
- **Failure.** Key space grows as (|O||A|)^k; useless once the cue is older than k.
- **Cost.** O(k) memory; learning cost multiplies by the number of distinct keys.
- **Operational test.** Aliased nodes disambiguated by the previous node: k = 1 must beat memoryless Q; it must *fail* when the cue-to-decision delay exceeds k. That failure is what licenses §2.2.

### 2.2 Working memory (gated, capacity-limited)

- **Problem.** A cue seen at time t determines the correct action at t + d for d longer than any affordable fixed window, with distractors in between. A buffer cannot solve this; a *gate* (keep versus overwrite) can.
- **Algorithm (tabular gating).** Add m memory slots and internal actions (Peshkin et al. 1999 [M]; Todd, Niv & Cohen 2008 [V]):

```
key      = (obs, slot_1..slot_m)
action   = (motor a, gate g in {keep, store obs in slot j})
Q[key][(a,g)] learned by TD(lambda)   // eligibility traces carry credit across the delay
```

  PBWM (O'Reilly & Frank 2006 [V]) is the neural version: basal ganglia learn a selective gate over prefrontal maintenance through an actor–critic. Its benchmark is 1-2-AX (nested, distractor-laden maintenance).
- **Evidence.** Todd et al. report that the TD-gating model solves a benchmark working-memory task and shows human-like limitations (abstract) (grade 2 for sufficiency on small tasks). Bakker 2002 [M] introduced the cue T-maze as the long-delay benchmark. Capacity near four chunks in humans: Cowan 2001 [M].
- **Failure.** (i) One-step TD cannot credit a gating action whose payoff comes d steps later; traces or Monte-Carlo returns are required (Loch & Singh 1998 [M]). (ii) Key space is |O|^(m+1), so capacity must be small: the capacity limit is a learning-cost necessity, not an arbitrary biological detail (grade 4). (iii) Superstitious storage of distractors.
- **Cost.** O(|O|^(m+1) · A · (1 + m)) table entries; O(1) per step.
- **Operational test.** Cue T-maze with a delay sweep d ∈ {2, 4, 8, 16} and distractor observations. Memoryless Q and MBVI-on-observations are capped at chance at the junction; k-history succeeds only for d ≤ k; gated WM must hold accuracy across d. n-back and delayed match-to-sample test the same computation without navigation and add nothing here.

### 2.3 Episodic memory and episodic control

- **Problem.** (a) Acting well after one or a few experiences, before any averaged statistic is reliable. (b) Recovering a *whole-episode* latent (which regime, which cue) from a partial cue.
- **Algorithms.**
  - *Index and completion.* Store each event once as a conjunctive key → content record; sparse, decorrelated keys (pattern separation) keep similar events distinct; a partial key retrieves the full record (pattern completion). Hippocampal indexing: Teyler & DiScenna 1986 [M]; separation/completion: Marr 1971 [M], O'Reilly & McClelland 1994 [M].
  - *Temporal context model* (Howard & Kahana 2002 [V]): a drifting context vector c_t = ρ·c_{t−1} + β·in_t is bound to each item; retrieving an item reinstates its context, which cues its temporal neighbours. This produces recency and contiguity, and gives a principled recency-plus-similarity retrieval key.
  - *Event segmentation.* Start a new episode (or latent context) when prediction error spikes (Zacks et al. 2007 [M]; Franklin et al. 2020 [M]; Gershman, Blei & Niv 2010 [M]).
  - *Model-Free Episodic Control* (Blundell et al. 2016 [V]):

```
on episode end, for each (s_t, a_t) with Monte-Carlo return R_t:
    QEC[s_t][a_t] = max(QEC[s_t][a_t], R_t)      // keep the best return ever seen
act: argmax_a QEC[s][a]; for unseen (s,a) average the k nearest stored neighbours
```

  - *Neural Episodic Control* (Pritzel et al. 2017 [V]) replaces the table with a differentiable key–value dictionary and kernel-weighted lookup. *EMDQN* (Lin et al. 2018 [V]) uses the episodic best return as an extra regression target for a parametric Q; its abstract reports reaching many results with one fifth of DQN's interactions.
- **When it wins.** Gershman & Daw 2017 [V] argue episodic control is favoured when data are sparse, states are high-dimensional or continuous, and dependencies are long-range or non-Markov. Lengyel & Dayan 2007 [M] argue it can beat model-based control early because a poorly estimated model compounds error through search. Ritter et al. 2018 [V] show the recurring-task case: reinstating a stored task state when a context recurs.
- **Failure.** The max operator is optimistically biased under stochastic transitions or rewards (grade 1 as mathematics; the testbed's probabilistic traversal triggers it). Retrieval needs a similarity space aligned with the task. Unbounded growth without eviction.
- **Cost.** O(T) memory; O(1) exact lookup with a hash; O(T) or O(log T) for nearest-neighbour.
- **Redundancy.** In a fully observed tabular world, MBVI extracts strictly more from the same transitions than MFEC (it recombines segments of different episodes; MFEC cannot). The legacy result (replay +0.1 [−8.1, 7.9]; real content no better than generic; `experiments/xfer2/results/RESULTS.md`) is what this predicts.
- **Operational test.** *Recurring hidden regime.* Each episode starts with a cue that identifies one of K hidden regimes (goal or blocked-edge configuration); the cue is not visible afterwards. Regimes recur. An agent with cue-keyed episodic retrieval must outperform (i) a single model and (ii) the same agent with *mismatched* cue retrieval, on the first episode of each recurrence. The mismatch control is the falsifier the legacy store never passed.

### 2.4 Semantic memory and complementary learning systems

- **Problem.** Extracting what is common across many experiences without the new overwriting the old.
- **Algorithm.** A fast store learns each item at once; a slow learner is trained on interleaved samples from the fast store (McClelland, McNaughton & O'Reilly 1995 [M]; updated in Kumaran, Hassabis & McClelland 2016 [V]). Sun et al. 2023 [V] (Janelia/UCL) add a selection rule: consolidate only when it aids generalisation, i.e. only the predictable component.
- **Evidence.** Grade 1–2 as an account of interference in distributed networks; the selection rule is grade 3.
- **Tabular consequence (grade 4).** A table has no shared weights, so learning about state s cannot damage state s′. The original CLS rationale (catastrophic interference) therefore does not apply to `cognitive/`. What survives is: (i) two *timescales* of statistics (§2.11), and (ii) cross-world priors. "Semantic memory" at this scale *is* the world model plus its hyper-prior, as the review (§11) already inferred.
- **Cost.** Hyper-prior: O(1) to O(S·A).
- **Operational test.** Family transfer (protocol E5): learning speed on an unseen world of family F with the prior, against a fresh agent and a mismatched-family prior.

### 2.5 Successor representation

- **Problem.** Re-evaluating all states for a new reward function without iterating the model.
- **Algorithm.** M(s, ·) ← M(s, ·) + α[1_s + γ·M(s′, ·) − M(s, ·)]; V = M·r (Dayan 1993 [M]). Closed form M = (I − γP^π)⁻¹.
- **Evidence.** Momennejad et al. 2017 [V]: humans show the predicted asymmetry, flexible after reward changes and less sensitive to transition changes, best fitted by an SR–MB hybrid. Russek et al. 2017 [V]: SR with TD reproduces a subset of model-based behaviour at lower decision-time cost; replay-updated SR variants repair some gaps. Stachenfeld et al. 2017 [V]: place-field phenomena as SR; SR eigenvectors resemble grid fields and expose bottlenecks.
- **Failure.** M is tied to one policy and one transition structure: a blocked edge or a goal that changes the optimal policy leaves M stale (Lehnert et al. 2017 [M]). Its "immediate" revaluation also requires the new reward vector to be known.
- **Cost.** O(S²) memory; O(S) per update; decision O(S·A) against O(S²·A) per value-iteration sweep.
- **Redundancy.** With S ≤ 100 a full value iteration costs microseconds, so SR offers no decision the learned model cannot make and makes worse ones on detour. It is redundant as a store and useful only as (i) a diagnostic baseline (review §5) and (ii) the *need* term in §2.9.
- **Operational test.** SR must match MBVI on reward relocation and fall measurably behind on detour. If it does not fall behind, the detour task is not discriminating.

### 2.6 Procedural memory and habit

- **Problem.** Producing an action when deliberation is too slow or too costly.
- **Algorithm.** Cached Q (model-free TD), or a value-free habit: strengthen the chosen action by repetition, independent of outcome (Miller, Shenhav & Ludvig 2019 [M]). Arbitration by reliability: Daw, Niv & Dayan 2005 [M]; Lee, Shimojo & O'Doherty 2014 [V] (lead author now at KAIST) report prefrontal signals consistent with reliability-based arbitration.
- **Evidence.** Devaluation insensitivity after over-training is grade 1 (Adams & Dickinson 1981 [M]).
- **Failure.** Perseveration after change. The legacy agent is this mechanism copied six times (audit §8).
- **Cost.** O(S·A).
- **Redundancy.** Fully redundant with the planner's cached policy unless a planning budget binds.
- **Operational test.** Under a *pre-declared* cap on backups per decision, a habit-plus-planner agent must beat the planner alone at equal total compute. With no cap, the correct prediction is no benefit.

### 2.7 Associative (content-addressable) memory

- **Problem.** Retrieving a stored pattern from a corrupted or partial cue.
- **Algorithms.** Classical Hopfield (Hopfield 1982 [M]): Hebbian weights, iterate sign(Wx); capacity about 0.138·d patterns (figure as quoted in Ramsauer et al. 2020 [V]). Modern continuous Hopfield (Ramsauer et al. 2020 [V]): ξ ← X·softmax(β·Xᵀξ), one-step retrieval, capacity exponential in d, identical in form to attention. Sparse distributed memory (Kanerva 1988 [M]): write to all hard locations within a Hamming radius of the address, read by majority.
- **Failure.** Spurious attractors and metastable blends of similar patterns; β (or radius) must be set.
- **Cost.** Modern Hopfield: O(N·d) per retrieval for N stored patterns.
- **Redundancy.** With exact integer keys, a hash map is a perfect associative memory at O(1). The softmax-kernel read is also the same operation as the NEC lookup (§2.3) and as soft k-nearest-neighbour. One kernel read function covers all three; a separate "Hopfield module" would be a renamed duplicate (grade 4).
- **Operational test.** Observations delivered as noisy bit-vectors (flip probability swept). Kernel completion must beat exact-match lookup on state identification, and state identification must change return. Not applicable while the node id is delivered exactly.

### 2.8 Prospective memory

- **Problem.** Executing a deferred intention when a future trigger occurs, while another task occupies working memory.
- **Algorithm.** Store (trigger → action, expiry); each step, match the observation against stored triggers; a hit pre-empts the ongoing policy (Einstein & McDaniel 1990 [M]; McDaniel & Einstein 2000 [M]). Cost O(pending intentions).
- **Evidence.** Grade 2 behaviourally in humans; grade 5 for agent benefit at tabular scale.
- **Redundancy.** Equivalent to one working-memory slot or an option with an initiation set, unless the ongoing task overflows working memory.
- **Operational test.** An instruction at episode start pays off only if executed at a later node, with a working-memory-loading filler in between. Relevant only after §2.2 saturates.

### 2.9 Replay

- **Problem.** Limited computation: which stored or simulated transitions to back up, in what order.
- **Algorithms.** Experience replay (Lin 1992 [M]); prioritised experience replay by TD-error magnitude (Schaul et al. 2015 [V]); Dyna (Sutton 1991 [M]); prioritised sweeping (Moore & Atkeson 1993 [M]):

```
after real step (s,a,r,s'): update model; p = |r + g*max Q[s'] - Q[s][a]|
if p > theta: queue.push((s,a), p)
repeat n times: (s,a) = queue.pop_max(); back up Q[s][a] from model
    for each predecessor (s_,a_) of s: compute its p_; if p_ > theta push
```

  Mattar & Daw 2018 [V] make the priority normative: utility of a backup = gain × need, where gain is the policy improvement the backup produces at its target state and need is how often that state is expected to be visited (in their formulation the need term is an SR row; this detail is [M]). The abstract frames it as balancing evaluation of imminent choices against propagating new information backward.
- **Evidence.** Grade 1 for Dyna and prioritised sweeping as algorithms; grade 3 for the normative account of hippocampal replay. van Hasselt, Hessel & Aslanides 2019 [V] argue that replay over stored transitions can match or beat a parametric model that only generates imagined transitions: replay *is* a non-parametric model.
- **Failure.** Replaying transitions from before a change re-installs obsolete values; replay written into the same counters as experience inflates confidence (§2.12).
- **Cost.** Priority queue O(log n) per operation; predecessor index O(S·A).
- **Redundancy.** With full value iteration every decision, replay order is irrelevant: the sweep already performs every backup. Replay is redundant with MBVI unless the backup budget is below one sweep (grade 4, follows from §1).
- **Operational test.** Regret against number of backups, for none / uniform / prioritised sweeping / gain×need, after a local change (detour). The claim is a *compute-efficiency* claim and must be reported as such. Offline ("sleep") replay is the same computation moved to the inter-episode gap; it is testable only if between-episode compute is granted and within-episode compute is capped.

### 2.10 Consolidation and schema formation

- **Problem.** Moving information from a fast, specific store into a slow, general one, and using existing structure to learn new items quickly.
- **Evidence.** An established schema allowed one-trial assimilation of new associations in rats (Tse et al. 2007 [M]) (grade 2). Selective consolidation: Sun et al. 2023 [V].
- **Tabular form.** Consolidation = an explicit, logged transfer at episode end: episodic records → model counts (if not already counted) → hyper-prior statistics; then re-plan. A schema = a prior over world structure shared by a family.
- **Failure.** Consolidating noise (over-generalisation); double counting when the same transition enters the model both online and at consolidation.
- **Cost.** O(T) per consolidation.
- **Operational test.** Same as §2.4 (E5), plus a double-count mutant in the test suite.

### 2.11 Forgetting, interference, catastrophic forgetting

- **Problem.** Under non-stationarity, old evidence is wrong evidence; under stationarity, discarding evidence raises variance. Forgetting is the control of that trade-off.
- **Algorithms.** Discounted counts n ← λ·n + 1 (effective window 1/(1 − λ)); sliding window; change-point detection with reset (Adams & MacKay 2007 [M]); *context splitting*, i.e. on sustained surprise open a new model instead of overwriting, and keep the old one for reinstatement (Gershman, Blei & Niv 2010 [M]). For parametric learners: elastic weight consolidation (Kirkpatrick et al. 2017 [V]), generative replay (Shin et al. 2017 [M]), rehearsal.
- **Evidence.** Catastrophic interference in distributed networks is grade 1 (McCloskey & Cohen 1989 [M]). Forgetting as adaptive: Anderson & Schooler 1991 [M]; Richards & Frankland 2017 [M] (grade 3).
- **Tabular consequence.** EWC, generative replay and rehearsal solve a problem tables do not have (§2.4). The tabular problem is *stale confidence*: accumulated Dirichlet counts make the model slow to move and over-confident after a hidden change. CF-03 failed its calibration criterion (dev ECE 0.101 against a 0.05 threshold; `docs/COGNITIVE_MILESTONE_ROADMAP.md`); whether stale counts are the cause is not established here (grade 5), but principled forgetting is the mechanism class that addresses it.
- **Cost.** O(1) per update for discounting; O(K·S·A) for K retained contexts.
- **Operational test.** Hidden change (E4): adaptation latency and post-change ECE must improve, *and* stationary-phase regret must not worsen beyond a pre-declared margin. Context splitting has a sharper test: A → B → A. On return to A, a splitting agent must re-adapt faster than both a discounting agent and a reset agent.

### 2.12 Retrieval, reconstruction, confidence and source attribution

- **Problem.** Deciding how much to trust a retrieved item, and never mistaking self-generated content for evidence.
- **Evidence.** Memory is reconstructive (Bartlett 1932 [M]; Schacter & Addis 2007 [M]); source monitoring is a separate attribution judgement (Johnson, Hashtroudi & Lindsay 1993 [M]). Retrieved episodes bias value-based choice in humans (Bornstein & Norman 2017 [M]).
- **Tabular form.** Every record carries provenance ∈ {experience, replay, planning, prior}; only *experience* increments evidence counts (handbook §9 already states the rule). Retrieval confidence = kernel mass of the match × evidence count; below a threshold the read returns "no memory" and the agent falls back to the model. Reconstruction = model-generated completion of a sparse record, tagged *planning*.
- **Failure.** Imagination inflation: simulated transitions fed back as counts make the model certain of its own guesses.
- **Cost.** One tag and one count per record.
- **Operational test.** Mutant: let replay writes increment counts; calibration must degrade and a named check must catch it. Behavioural: with low-confidence retrieval gated off, return must not drop on the episodic task, and must rise on its mismatch condition.

### 2.13 Compression and abstraction for aliased worlds

- **Problem.** Building the *state* itself when observations alias, with fewer states than histories.
- **Algorithms.**
  - State abstraction and bisimulation: merge states with identical reward and transition behaviour (Givan, Dean & Greig 2003 [M]; Li, Walsh & Littman 2006 [M]). Utile-distinction history trees split a history only when the split changes predicted return (McCallum 1995 [M]).
  - *Clone-structured cognitive graph* (George et al. 2021 [V]): each observation owns several hidden "clones"; emissions are deterministic; an action-conditioned transition tensor over clones is learned by expectation–maximisation on a long observation–action sequence (the EM detail is [M]). Aliased observations in different contexts settle on different clones. Planning is inference on the clone graph. Structure transfers by keeping transitions and re-binding emissions.
  - *Tolman-Eichenbaum Machine* (Whittington et al. 2020 [V]): a learned structural code updated by actions, bound to sensory content through a fast associative memory; structure is preserved across environments (abstract).
- **Evidence.** Both reproduce hippocampal phenomena (grade 3 as brain theory). CSCG's computational content (a constrained HMM) is grade 1–2.
- **Failure.** EM local optima; the number of clones is a hyper-parameter; long exploratory sequences are needed; TEM needs gradient training of a neural network and is outside the zero-dependency, tabular constraint (grade 4).
- **Cost.** CSCG forward–backward: O(L·C²) for sequence length L and C clones per observation, per EM iteration; feasible in plain JavaScript for tens of observations and C ≤ 10 (grade 4, not measured).
- **Operational test.** Aliased graph (E6): held-out next-observation log-likelihood and steps-to-goal against k-history and gated WM; then transfer to a relabelled world with the same hidden structure against a fresh learner.

### 2.14 External-memory agent designs: what transfers

- **Differentiable neural computer** (Graves et al. 2016 [V]): a temporal link matrix between consecutive writes and a per-slot usage value driving allocation. Here: write-order pointers and a usage-based eviction score in the episodic store.
- **Memory networks** (Weston et al. 2014 [M]): multi-hop retrieval. Here: equivalent to a model rollout; no new store.
- **MemGPT** (Packer et al. 2023 [V]): memory tiers with a bounded working set and agent-chosen page-in and eviction. Here: working-memory slots ↔ episodic store through a gate.
- **Generative Agents** (Park et al. 2023 [V]): a memory stream with retrieval, and periodic reflection that condenses records (abstract); the recency + importance + relevance score is [M]. Here: a retrieval-score baseline and a consolidation trigger.

None of these has controlled evidence at tabular scale; their value here is as named design patterns (grade 5 for benefit).

## 3. Redundancy map

**In the current testbed (small, stationary within phase, node id observed), the learned transition model with value iteration subsumes** (grade 4, from §1): the sensory buffer, working memory, episodic control, replay in any order, SR, habit/Q cache, associative retrieval, consolidation, and every "familiarity" or "trust" count. Building any of them now would reproduce the legacy finding: stores that exist and change nothing.

**What each condition unlocks.**

| Condition | Memory that starts to carry information |
|---|---|
| Partial observability, short delay | sensory buffer (k-history) |
| Partial observability, long delay, explicit cue | gated working memory |
| Partial observability, structural aliasing | latent-state learner (CSCG) |
| Non-stationarity | forgetting / change detection; context splitting if regimes recur |
| Recurring hidden regimes, sparse data per regime | cue-keyed episodic retrieval |
| Binding compute budget | prioritised replay; habit cache; SR |
| Multi-world transfer | hyper-prior (semantic), structural schema |
| Noisy feature observations | kernel associative read |

**Mutual redundancies regardless of condition.** Modern Hopfield read ≡ NEC kernel lookup ≡ soft nearest neighbour. Experience replay ≡ Dyna with a non-parametric model. Prospective memory ≡ one working-memory slot or an option. Consolidation ≡ a batched model update. Offline replay ≡ online replay at a different time.

---

## 4. Summary table

| Memory system | Computational role | Algorithm | Pays off when | Redundant when | Operational test | Cost |
|---|---|---|---|---|---|---|
| Sensory buffer | Short fixed context | FIFO of last k (o, a) | Aliasing resolved within k steps | State observed | k = 1 beats memoryless on previous-node aliasing; fails at delay > k | O(k); keys (\|O\|\|A\|)^k |
| Working memory | Hold a cue across a long delay | Slots + learned gate, TD(λ) | Cue–decision delay > k, distractors | State observed; delay ≤ k | Cue T-maze, delay sweep | \|O\|^(m+1)·A entries |
| Episodic store / control | One-shot use; recover episode-level latent | Keyed records, kernel read; MFEC max-return | Recurring hidden regimes; sparse data | Observed tabular MDP with a model | Recurrence task with mismatched-cue control | O(T) memory; O(1)–O(T) read |
| Semantic / CLS | Shared structure across worlds | Hyper-prior from many worlds; slow interleaved learning | Multi-world transfer | Single world; tables do not interfere | E5 with mismatched-family control | O(S·A) |
| Successor representation | Cheap revaluation for new reward | TD on occupancy; V = M·r | Many reward changes, binding compute | VI is affordable | Matches MBVI on relocation, loses on detour | O(S²) |
| Procedural / habit | Zero-deliberation action | Q cache or repetition strength | Binding decision budget | Planner is cheap | Capped-backup comparison at equal compute | O(S·A) |
| Associative | Completion from a noisy cue | Softmax kernel read; SDM | Noisy vector observations | Exact keys | Bit-flip sweep on observations | O(N·d) per read |
| Prospective | Deferred intention | Trigger → action table | WM overloaded by an ongoing task | WM slot free | Dual task with WM filler | O(pending) |
| Replay | Order backups under a budget | Prioritised sweeping; gain × need | Backups per decision < one sweep | Full VI each decision | Regret vs backups after a local change | O(log n) per backup |
| Consolidation / schema | Fast → slow transfer | Episode-end batched update, logged | Transfer; selective generalisation | Online counting already done | E5 + double-count mutant | O(T) |
| Forgetting | Bias–variance under change | Discounted counts; change-point reset; context split | Non-stationary; recurring regimes | Stationary world | E4 latency and ECE; A→B→A reinstatement | O(1); O(K·S·A) |
| Confidence / source | Trust control | Provenance tag; evidence count; read threshold | Any store written by simulation | No simulated writes | Count-inflation mutant; mismatch condition | O(1) per record |
| Latent-state abstraction | Construct state under aliasing | CSCG (clone HMM, EM); utile history tree | Structural aliasing; structure transfer | State observed | E6 log-likelihood, steps, relabelled transfer | O(L·C²) per EM pass |

---

## 5. Implications for MiniFlyWire

**Precondition (grade 4).** No memory mechanism can show a benefit on the current battery, because §1 holds there. The first deliverable is therefore tasks, not stores: a cue T-maze with delay sweep, an aliased-graph task, a hidden-change task with regime recurrence (A→B→A), each admitted by a pre-declared gate in which memoryless MBVI must *fail*.

### 5.1 Recommended minimal architecture

Four stores, each with one owner. Nothing else holds state.

| Store | Owns | Written by | Read by |
|---|---|---|---|
| **Context-indexed world model** | Transition and reward counts per context; hyper-prior | Experience only | Planner, exploration, calibration |
| **Working memory** (m ≤ 2 slots + k = 1 buffer) | Currently maintained cue(s) | Learned gate | State key |
| **Episodic store** (bounded ring) | Records (context cue, trajectory summary, outcome, provenance, write-order link, usage) | Experience, at event boundaries | Context selection; consolidation |
| **Planner cache** | Values for the active context and goal | Planning | Action selection |

**Lifecycle.** *Encode:* observation enters the buffer; the gate decides whether it occupies a slot. *Segment:* sustained surprise under the active context closes the episode record and triggers context selection. *Retrieve:* the cue in working memory is matched against episodic records; confident match → reinstate that context's model; no match → open a new context from the hyper-prior. *Consolidate:* at episode end, counts go to the active context once (experience provenance only), hyper-prior statistics update, the planner re-plans. *Forget:* within a context, discounted counts; episodic eviction by lowest usage × recency; contexts unused beyond a pre-declared horizon are merged into the prior.

### 5.2 Ranked by expected measurable benefit

1. **Principled forgetting in the world model (discounted counts, then context splitting).** Addresses the one already-observed deficit class (post-change confidence). *Falsifier:* on E4, no improvement in adaptation latency or post-change ECE at the pre-declared stationary-regret margin; for splitting, re-adaptation on return to A no faster than discounting.
2. **Gated working memory.** The cheapest mechanism that is strictly necessary on a defined task. *Falsifier:* accuracy at the junction does not exceed k-history at delays > k, or the gate fails to learn within the budget at which k-history learns short delays.
3. **Cue-keyed episodic retrieval with provenance and a confidence threshold.** *Falsifier:* matched retrieval no better than mismatched retrieval on first-episode-of-recurrence return. This is exactly the test the legacy episode store failed (real = generic content).
4. **Latent-state learner (CSCG-style) for cue-less aliasing and structure transfer.** Highest ceiling, highest risk. *Falsifier:* held-out log-likelihood and steps-to-goal no better than k-history plus working memory; or no transfer gain over a fresh learner on a relabelled world.
5. **Prioritised sweeping as budgeted planning,** reported only as a compute-efficiency result. *Falsifier:* at equal backups, regret after a local change no lower than uniform replay.
6. **Hyper-prior consolidation across worlds** (already in the roadmap as E5). *Falsifier:* matched-family prior no better than mismatched.

Items 2–4 form a deliberate ladder: each is built only if the simpler one fails a task by its own falsifier.

### 5.3 Do not build

- **SR as a store.** At S ≤ 100 it answers no question value iteration cannot, and is wrong after detours. Keep it as a diagnostic baseline only.
- **A Hopfield / SDM module.** Exact keys make it a hash map; the kernel read belongs inside the episodic store.
- **EWC, generative replay, rehearsal.** They cure interference in shared weights; there are none.
- **MFEC's max-return rule as a controller.** Biased under the testbed's stochastic traversal and dominated by MBVI on the same data.
- **Tolman-Eichenbaum Machine, DNC, memory networks.** Gradient-trained networks; outside the constraints. Take the patterns in §2.14 only.
- **A prospective-memory module, n-back and delayed-match tasks.** Covered by a working-memory slot and the cue T-maze.
- **Separate "semantic", "schema", "trust", "emotion", "consolidation score" stores.** Each is a marginal of the model's counts; this is the audit §8 duplication.
- **Offline "sleep" replay as a distinct system.** It is replay under a different compute schedule.
- **Any store without a pre-declared task on which its removal lowers return.**

---

## 6. What was not verified

- All **[M]** references below: cited from memory. Bibliographic details and the specific claims attributed to them need checking.
- Paper-internal details marked [M] in the text although the paper record is [V]: the SR form of the Mattar–Daw need term; EM as the CSCG learning procedure; the Generative Agents three-term retrieval score; the content of Lehnert et al. on SR limits.
- The prioritised-experience-replay Atari win count differs between arXiv versions, so no number is quoted.
- No claim here about CSCG runtime in plain JavaScript was measured.
- Targeted searches for directly relevant tabular-scale memory work from RIKEN, OIST, IBS, CAS and IISc were not completed (search budget); only Janelia (Sun et al. 2023) and KAIST (Lee et al. 2014) are represented. This is a gap, not a negative finding.
- No experiment was run for this document. Every "pays off when" entry is a prediction with a stated falsifier.

---

## References

**[V] Record confirmed by web search this session.**

- Blundell et al. 2016. Model-free episodic control. arXiv:1606.04460.
- George et al. 2021. Clone-structured graph representations enable flexible learning and vicarious evaluation of cognitive maps. *Nat. Commun.* 12:2392. doi:10.1038/s41467-021-22559-5.
- Gershman & Daw 2017. Reinforcement learning and episodic memory in humans and animals: an integrative framework. *Annu. Rev. Psychol.* 68:101–128. doi:10.1146/annurev-psych-122414-033625.
- Graves et al. 2016. Hybrid computing using a neural network with dynamic external memory. *Nature* 538:471–476.
- Howard & Kahana 2002. A distributed representation of temporal context. *J. Math. Psychol.* 46:269–299. doi:10.1006/jmps.2001.1388.
- Kirkpatrick et al. 2017. Overcoming catastrophic forgetting in neural networks. *PNAS* 114:3521–3526. doi:10.1073/pnas.1611835114.
- Kumaran, Hassabis & McClelland 2016. What learning systems do intelligent agents need? *Trends Cogn. Sci.* 20:512–534. doi:10.1016/j.tics.2016.05.004.
- Lee, Shimojo & O'Doherty 2014. Neural computations underlying arbitration between model-based and model-free learning. *Neuron* 81:687–699. doi:10.1016/j.neuron.2013.11.028.
- Lin, Zhao, Yang & Zhang 2018. Episodic memory deep Q-networks. IJCAI 2018, 2433–2439. doi:10.24963/ijcai.2018/337; arXiv:1805.07603.
- Mattar & Daw 2018. Prioritized memory access explains planning and hippocampal replay. *Nat. Neurosci.* 21:1609–1617. https://pmc.ncbi.nlm.nih.gov/articles/PMC6203620
- Momennejad et al. 2017. The successor representation in human reinforcement learning. *Nat. Hum. Behav.* 1:680–692. doi:10.1038/s41562-017-0180-8.
- O'Reilly & Frank 2006. Making working memory work. *Neural Comput.* 18:283–328. doi:10.1162/089976606775093909.
- Packer et al. 2023. MemGPT: towards LLMs as operating systems. arXiv:2310.08560.
- Park et al. 2023. Generative agents: interactive simulacra of human behavior. arXiv:2304.03442.
- Pritzel et al. 2017. Neural episodic control. arXiv:1703.01988.
- Ramsauer et al. 2020. Hopfield networks is all you need. arXiv:2008.02217.
- Ritter et al. 2018. Been there, done that: meta-learning with episodic recall. ICML 2018. arXiv:1805.09692.
- Russek et al. 2017. Predictive representations can link model-based reinforcement learning to model-free mechanisms. *PLoS Comput. Biol.* 13:e1005768. doi:10.1371/journal.pcbi.1005768.
- Schaul, Quan, Antonoglou & Silver 2015. Prioritized experience replay. arXiv:1511.05952.
- Stachenfeld, Botvinick & Gershman 2017. The hippocampus as a predictive map. *Nat. Neurosci.* 20:1643–1653. doi:10.1038/nn.4650.
- Sun, Advani, Spruston, Saxe & Fitzgerald 2023. Organizing memories for generalization in complementary learning systems. *Nat. Neurosci.* 26:1438–1448. doi:10.1038/s41593-023-01382-9.
- Todd, Niv & Cohen 2008. Learning to use working memory in partially observable environments through dopaminergic reinforcement. NIPS 21, 1689–1696. https://proceedings.neurips.cc/paper/2008/hash/98dce83da57b0395e163467c9dae521b-Abstract.html
- van Hasselt, Hessel & Aslanides 2019. When to use parametric models in reinforcement learning? NeurIPS 2019. arXiv:1906.05243.
- Whittington et al. 2020. The Tolman-Eichenbaum Machine. *Cell* 183:1249–1263. doi:10.1016/j.cell.2020.10.024.

**[M] From memory, unchecked.** Adams & Dickinson 1981 (*Q. J. Exp. Psychol. B*); Adams & MacKay 2007 (Bayesian online changepoint detection, arXiv:0710.3742); Anderson & Schooler 1991 (*Psychol. Sci.*); Bakker 2002 (RL with LSTM, NIPS 14); Bartlett 1932 (*Remembering*); Bornstein & Norman 2017 (*Nat. Neurosci.*); Cowan 2001 (*Behav. Brain Sci.*); Daw, Niv & Dayan 2005 (*Nat. Neurosci.*); Dayan 1993 (*Neural Comput.*); Einstein & McDaniel 1990 (*J. Exp. Psychol. LMC*); Franklin, Norman, Ranganath, Zacks & Gershman 2020 (*Psychol. Rev.*); Gershman, Blei & Niv 2010 (*Psychol. Rev.*); Givan, Dean & Greig 2003 (*Artif. Intell.*); Hopfield 1982 (*PNAS*); Johnson, Hashtroudi & Lindsay 1993 (*Psychol. Bull.*); Kanerva 1988 (*Sparse Distributed Memory*, MIT Press); Lehnert, Tellex & Littman 2017 (arXiv:1708.00102); Lengyel & Dayan 2007 (NIPS 20); Li, Walsh & Littman 2006 (ISAIM); Lin 1992 (*Mach. Learn.*); Loch & Singh 1998 (ICML); Marr 1971 (*Phil. Trans. R. Soc. B*); McCallum 1995 (PhD thesis, Rochester); McClelland, McNaughton & O'Reilly 1995 (*Psychol. Rev.*); McCloskey & Cohen 1989 (*Psychol. Learn. Motiv.*); McDaniel & Einstein 2000 (*Appl. Cogn. Psychol.*); Miller, Shenhav & Ludvig 2019 (*Psychol. Rev.*); Mnih et al. 2015 (*Nature*); Moore & Atkeson 1993 (*Mach. Learn.*); O'Reilly & McClelland 1994 (*Hippocampus*); Peshkin, Meuleau & Kaelbling 1999 (ICML); Richards & Frankland 2017 (*Neuron*); Schacter & Addis 2007 (*Phil. Trans. R. Soc. B*); Shin et al. 2017 (arXiv:1705.08690); Sperling 1960 (*Psychol. Monogr.*); Sutton 1991 (*SIGART Bull.*); Teyler & DiScenna 1986 (*Behav. Neurosci.*); Tse et al. 2007 (*Science* 316:76–82); Weston, Chopra & Bordes 2014 (arXiv:1410.3916); Zacks et al. 2007 (*Psychol. Bull.*).
