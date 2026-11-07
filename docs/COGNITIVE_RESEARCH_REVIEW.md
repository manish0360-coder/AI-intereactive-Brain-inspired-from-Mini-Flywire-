# Cognitive Research Review

Part of the cognitive research package ([handbook](COGNITIVE_ARCHITECTURE_HANDBOOK.md)).

**Purpose.** To choose mechanisms for MiniFlyWire on evidence, not on names. For every mechanism the review states:
1. The problem it solves.
2. Its computational contribution.
3. The evidence for it.
4. Its limits and the competing views.
5. Whether it fits MiniFlyWire.
6. How it can be tested here.
7. Whether a simpler alternative is preferable.

**Labels.**
- **[EST]** an established finding, replicated or textbook.
- **[HYP]** an active research hypothesis.
- **[INF]** our engineering inference for MiniFlyWire.
- Citation markers: **[V]** means the bibliographic record (authors, venue, DOI or arXiv id) was checked by web search on 2026-11-07. **[K]** means it is cited from the author's knowledge and was not re-checked in this session, so it must be verified before external publication.

Paper conclusions are summarised only to the extent stated in their abstracts or in the textbook literature. No claim is made about details not checked.

---

## 1. Framing: what would count as cognition here

**Marr's levels** separate the computational problem, the algorithm and the implementation (Marr 1982 [K]).

We use them as a discipline:
- Every capability claim in `COGNITIVE_METRICS.md` is stated at the computational level: the task and what must be inferred.
- The claim is then tested behaviourally before any algorithm is credited with it.
- The Phase 0 and CF-00 audits failed MiniFlyWire at the computational level. Its environment poses no inference problem (Phase 0 §2), so no algorithm in it can show one. **[INF]**

The **cognitive-map tradition** (Tolman 1948 [K]; Behrens et al. 2018 [V]) defines the behavioural signatures that separate a structured internal model from stimulus–response habit:
- **latent learning:** unrewarded exposure helps later;
- **detour and shortcut:** novel routes are used when the familiar one fails;
- **revaluation:** behaviour changes immediately when an outcome's value changes, without retraining.

These signatures are **[EST]** in animal behaviour and are the backbone of our benchmark (`COGNITIVE_EXPERIMENT_PROTOCOL.md`).

---

## 2. Cognitive architectures

**ACT-R** (Anderson et al. 2004 [K]), **Soar** (Laird, Newell & Rosenbloom 1987 [K]; Laird 2012 [K]) and the **Common Model of Cognition** (Laird, Lebiere & Rosenbloom 2017 [K]).

1. **Problem:** integrating perception, memory and action in one system with explicit memory types.
2. **Mechanism:** declarative and procedural memories are separate. A limited working memory or buffer mediates them. Production rules select actions. Episodic and semantic stores are added (Soar 9).
3. **Evidence:** decades of cognitive-modelling fits to human data **[EST]**. Kotseruba & Tsotsos (2020 [K]) survey 84 architectures.
4. **Limits:** mostly hand-engineered knowledge. Learning of structure from raw interaction is limited. Critics argue the architectures are underconstrained by data.
5. **Fit:** as a design reference only. Importing one would replace our research question (`research/external/DO_NOT_TRUST.md` §E). **[INF]**
6. **Test:** not applicable. We borrow the contract of separate memory systems with explicit read/write rules (handbook §6).
7. **Simpler alternative:** the separation can be implemented as typed stores with provenance, which MiniFlyWire already half-has (`semanticProvenance.js`).

---

## 3. Model-free versus model-based reinforcement learning

**References:** Sutton & Barto 2018 [K]; Watkins & Dayan 1992 [K]; Schultz, Dayan & Montague 1997 [K]; Daw, Niv & Dayan 2005 [K]; Daw et al. 2011 [K]; Dolan & Dayan 2013 [K]; Adams & Dickinson 1981 [K].

1. **Problem:** behaviour that is both fast, from cached values, and flexible, from a model.
2. **Mechanism:** model-free (MF) learning caches action values through temporal-difference (TD) errors. TD error is linked to phasic dopamine (Schultz et al. 1997, **[EST]**). Model-based (MB) learning learns transitions and rewards and evaluates actions by simulation. Daw et al. (2005) propose arbitration by relative uncertainty between the two controllers.
3. **Evidence:**
   - Outcome devaluation dissociates goal-directed from habitual responding (Adams & Dickinson 1981, **[EST]**).
   - Two-step tasks show mixtures of MB and MF control in humans (Daw et al. 2011).
   - The specific uncertainty-arbitration account is **[HYP]**.
4. **Limits:**
   - The MB/MF dichotomy is contested. Successor representations (§5) and "MF on rich state" can mimic MB signatures.
   - Two-step indices have known confounds.
5. **Fit:** central. MiniFlyWire today is MF-only (audit §9). The missing half is MB. **[INF]**
6. **Test:** revaluation and detour tasks. MB predicts an immediate change after the outcome change; MF predicts gradual relearning. Contrast `QL` with `DYNAQ` and with a learned-model planner.
7. **Simpler alternative:** tabular Q-learning is the baseline. Nothing heavier is justified until a task separates MB from MF.

---

## 4. Dyna, experience replay and prioritised sweeping

**References:** Sutton 1991 [K]; Lin 1992 [K]; Moore & Atkeson 1993 [K]; Mattar & Daw 2018 [V].

1. **Problem:** propagating value faster than real experience allows.
2. **Mechanism:** Dyna interleaves real updates with simulated updates drawn from a learned model. Prioritised sweeping orders those updates by expected change. Mattar & Daw model which memories are replayed as a function of their value for future reward. Their abstract argues this one mechanism covers several proposed roles of replay: planning, learning and consolidation.
3. **Evidence:**
   - Dyna and prioritised sweeping are textbook and well characterised **[EST]**.
   - The prioritised-replay account of hippocampal replay is **[HYP]**, with supporting fits in the paper.
4. **Limits:** a wrong model propagates wrong values. Uniform replay is sample-inefficient on large spaces.
5. **Fit:** high, and cheap in tabular form. The COG-A code already has a Dyna-Q baseline (`experiments/coga/agents.mjs`). MiniFlyWire's existing "replay" copies only nodes and labels into Q under the no-goal key (MCF-0) and showed +0.1 [−8.1, 7.9] (`experiments/xfer2/results/RESULTS.md`).
6. **Test:**
   - Dyna-Q minus Q on detour and revaluation is the positive control of the battery (CF-01).
   - Prioritised against uniform replay is a later ablation.
7. **Simpler alternative:** for ≤100 states, exact value iteration on the learned model is simpler than sampled planning. Use it as the reference planner.

---

## 5. Successor representation (SR)

**References:** Dayan 1993 [K]; Stachenfeld, Botvinick & Gershman 2017 [K]; Momennejad et al. 2017 [V]; Russek et al. 2017 [K]; Gershman 2018 [K].

1. **Problem:** flexibility without full simulation at decision time.
2. **Mechanism:** value is the product of a predictive occupancy matrix M(s, s′) and the reward vector. A reward change propagates instantly. A transition change needs M to be relearned.
3. **Evidence:**
   - Momennejad et al. report that human revaluation behaviour is better explained by SR-based or hybrid SR–MB strategies than by pure MB or MF **[HYP, with behavioural support]**.
   - The hippocampus-as-predictive-map account is **[HYP]**.
4. **Limits:**
   - SR is policy-dependent.
   - Its asymmetric prediction (fast reward revaluation, slow transition revaluation) is its signature and also its weakness.
5. **Fit:** good as a **diagnostic baseline**. Its signature separates SR from MB in our battery. **[INF]**
6. **Test:**
   - Reward revaluation versus transition revaluation (detour).
   - SR should adapt immediately to the first and slowly to the second; MB should adapt immediately to both.
7. **Simpler alternative:** none needed. Tabular SR is ~50 lines. It is deferred until the battery shows both revaluation types discriminating (roadmap CF-04).

---

## 6. Predictive processing and active inference

**References:** Friston 2010 [K]; Friston et al. 2017 [K]; Da Costa et al. 2020 [V]; Parr, Pezzulo & Friston 2022 [K].

1. **Problem:** a single objective for perception, learning and action under uncertainty, including when to explore.
2. **Mechanism:** agents minimise variational and expected free energy. In discrete POMDPs, expected free energy splits into a pragmatic term (preferences) and an epistemic term (expected information gain).
3. **Evidence:**
   - The discrete-state formalism is well specified (Da Costa et al. 2020).
   - The status of active inference as a general theory of the brain is debated: falsifiability and the degrees of freedom in the generative model **[HYP]**.
4. **Limits:** results depend heavily on the hand-specified generative model and preferences. The epistemic term can be reproduced by simpler information-gain bonuses.
5. **Fit:** as a baseline for the partial-observability task (roadmap CF-05), implemented in-repo. The lab stays dependency-free (`research/external/DO_NOT_REBUILD.md`), so pymdp is a reference only. **[INF]**
6. **Test:** a partially observable task where information-seeking actions pay off later. Compare an expected-free-energy agent with a count-based exploration bonus at equal model knowledge.
7. **Simpler alternative:** Bayesian count-based exploration (R-max: Brafman & Tennenholtz 2002 [K]; MBIE: Strehl & Littman 2008 [K]) gives directed exploration with fewer modelling commitments. **Prefer it first.**

---

## 7. Episodic memory and complementary learning systems

**References:** McClelland, McNaughton & O'Reilly 1995 [K]; Kumaran, Hassabis & McClelland 2016 [V]; Lengyel & Dayan 2007 [K]; Blundell et al. 2016 (arXiv:1606.04460) [K]; Pritzel et al. 2017 (arXiv:1703.01988) [K]; Hassabis & Maguire 2007 [K].

1. **Problem:** learning from one or a few experiences without catastrophic interference, then generalising slowly.
2. **Mechanism:** a fast, sparse episodic store (hippocampus) sits alongside slow, distributed structure learning (neocortex), with replay between them. Episodic control acts directly from the best remembered return for similar states.
3. **Evidence:**
   - Complementary learning systems (CLS) is a long-standing framework **[EST]** and was updated for agents by Kumaran et al. 2016.
   - Episodic control speeds early learning in deep RL benchmarks (Blundell 2016; Pritzel 2017), with arXiv results in specific domains **[HYP for generality]**.
4. **Limits:** retrieval needs a similarity space that matters for the task. Without partial observability or delayed contingencies, a tabular value function makes episodic memory redundant.
5. **Fit:**
   - MiniFlyWire's "episodic" store is used as goal-agnostic edge familiarity, not as recall (audit §5; MCF-0; XFER-2).
   - A genuine episodic system is justified **only by a task where the current observation is insufficient**: non-Markov cues, or one-shot learning of a new contingency.
6. **Test:** a one-shot task in which a single experienced event must change the next choice when the context recurs, with a context-mismatch control (MCF-1's design-only spec is a template).
7. **Simpler alternative:** for fully observed tabular tasks, Q plus Dyna. Episodic memory is deferred until the partial-observability task exists (roadmap CF-05).

---

## 8. World models and latent-state learning

**References:**
- Ha & Schmidhuber 2018, arXiv:1803.10122 [K].
- Schrittwieser et al. 2020 (MuZero, Nature 588:604–609) [K].
- Hafner et al. 2025 (DreamerV3, Nature, doi:10.1038/s41586-025-08744-2; preprint arXiv:2301.04104) [V].
- Gershman & Niv 2010 [K].
- Whittington et al. 2020 (Tolman–Eichenbaum Machine, Cell 183:1249–1263, doi:10.1016/j.cell.2020.10.024) [V].
- George et al. 2021 (clone-structured cognitive graphs, Nat. Commun. 12:2392, doi:10.1038/s41467-021-22559-5) [V].

1. **Problem:** acting well in environments whose dynamics must be learned, including hidden state.
2. **Mechanism:** learn a predictive model of observations and transitions, then plan or train a policy inside it. TEM and the clone-structured cognitive graph (CSCG) learn reusable structure that separates "where in the structure" from "what is observed". That supports transfer to new environments with the same structure.
3. **Evidence:**
   - Learned-model agents reach state-of-the-art results across many domains at scale (DreamerV3, abstract: over 150 tasks with one configuration) **[EST in ML benchmarks]**.
   - TEM and CSCG reproduce several hippocampal phenomena **[HYP as brain theory]**.
4. **Limits:** deep world models need data and compute irrelevant to a 20–30-node graph. Model errors compound over long imagined rollouts.
5. **Fit:** the **tabular Bayesian transition model** is the right first world model for MiniFlyWire: Dirichlet counts per (s, a) with posterior uncertainty. It is exact, inspectable and testable. CSCG-style latent structure is the step after partial observability (CF-05). **[INF]**
6. **Test:**
   - Prediction accuracy (log-likelihood) of held-out transitions.
   - Calibration of predicted success.
   - Model-based behaviour on detour, latent learning and revaluation.
   - Change detection under hidden reliability change.
7. **Simpler alternative:** the count model *is* the simple alternative. Do not build neural models.

---

## 9. Partial observability and belief states

**Reference:** Kaelbling, Littman & Cassandra 1998 [K].

1. **Problem:** acting when the observation does not identify the state.
2. **Mechanism:** maintain a posterior (belief) over hidden states and plan over beliefs. Approximations include history windows and recurrent state.
3. **Evidence:** POMDP theory **[EST]**.
4. **Limits:** exact belief planning is intractable beyond small problems.
5. **Fit:** MiniFlyWire is fully observed (O = S). Partial observability is the first condition under which memory beyond values becomes *necessary*. **[INF]**
6. **Test:** an aliased-node task. Two nodes emit the same observation, and only history or a cue disambiguates them. History-window agents and belief agents are compared with memoryless Q.
7. **Simpler alternative:** a k-step history state is the baseline before any belief machinery.

---

## 10. Hierarchy, planning and counterfactual simulation

**References:** Sutton, Precup & Singh 1999 (options) [K]; Botvinick et al. 2019 [K]; Pfeiffer & Foster 2013 [K]; Hassabis & Maguire 2007 [K]; Keramati, Dezfouli & Piray 2011 [K].

1. **Problem:** long-horizon tasks; deciding how much to plan.
2. **Mechanism:**
   - Temporally extended options.
   - Planning budgets set by the value of computation (Keramati et al. 2011 propose a speed–accuracy trade-off between habitual and goal-directed processes).
   - Counterfactual simulation of untaken alternatives.
3. **Evidence:** the options framework is **[EST]**. Hippocampal sequences resembling future paths (Pfeiffer & Foster 2013) are **[EST observation, HYP interpretation]**.
4. **Limits:** option discovery is unsolved in general. Metareasoning adds parameters.
5. **Fit:** later. The audit found that 24,912 imagined steps per session are computed and never used (audit §3.1), which is the opposite of adaptive computation. **[INF]**
6. **Test:**
   - Long-horizon tasks with dependent sub-goals.
   - Planning-budget ablations: performance as a function of planning steps.
7. **Simpler alternative:** a fixed-budget value iteration over the learned model. Hierarchy comes only after long-horizon tasks show a deficit.

---

## 11. Transfer and compositional generalisation

**References:** Lake, Ullman, Tenenbaum & Gershman 2017 [K]; Whittington et al. 2020 [V]; Behrens et al. 2018 [V].

1. **Problem:** using knowledge learned in one environment in a related one.
2. **Mechanism:** abstract structure (relational or graph structure, task schemas) is factorised from specific content.
3. **Evidence:**
   - Lake et al. argue that human-like learning needs compositional, causal models **[HYP / position]**.
   - TEM shows structural transfer in simulation **[HYP]**.
4. **Limits:** transfer claims are easy to inflate. The related world must be defined before the result.
5. **Fit:** XFER-1/2 showed cross-session transfer of edge familiarity on the *same* graph (`experiments/xfer1/results/RESULTS.md`). That is not structural transfer. **[INF]**
6. **Test:**
   - Train on world family F, then test on an unseen member generated by the same rule.
   - Compare against a fresh agent and against a mismatched-family control.
7. **Simpler alternative:** transfer of the learned transition prior (Dirichlet hyper-parameters) is the minimal structural transfer and should be tried first.

---

## 12. Intrinsic motivation and information gain

**References:** Schmidhuber 2010 [K]; Oudeyer, Kaplan & Hafner 2007 [K]; Pathak et al. 2017 (arXiv:1705.05363) [K]; Brafman & Tennenholtz 2002 [K]; Strehl & Littman 2008 [K].

1. **Problem:** exploration in the absence of extrinsic reward.
2. **Mechanism:**
   - Bonuses for prediction error, learning progress or information gain.
   - Optimism under uncertainty.
3. **Evidence:** count-based and optimism methods have sample-complexity guarantees in tabular MDPs (R-max, MBIE) **[EST]**. Curiosity bonuses work in deep RL with known failure modes, such as the "noisy TV" **[EST observation]**.
4. **Limits:** intrinsic bonuses can dominate extrinsic goals. Prediction-error curiosity is attracted to unlearnable noise.
5. **Fit:**
   - MiniFlyWire's "curiosity" and "drives" do not change decisions (audit §5).
   - A principled replacement is an information-gain bonus computed from the world model's posterior. It is necessary in the latent-learning task. **[INF]**
6. **Test:** latent-learning benefit and coverage speed, with and without the bonus. A noisy-edge control (an edge with irreducibly random outcome) checks that the bonus is not captured by noise.
7. **Simpler alternative:** count-based optimism (an R-max-style bonus) first.

---

## 13. Metacognition and calibration

**References:** Fleming & Daw 2017 (Psychol. Rev. 124:91–114, doi:10.1037/rev0000045) [V]; Guo et al. 2017 (arXiv:1706.04599) [K]; Daw et al. 2005 [K].

1. **Problem:** knowing when one's own predictions are unreliable, so as to explore, plan more or defer.
2. **Mechanism:** confidence as second-order inference about the probability of being correct. Calibration means stated confidence matches empirical accuracy.
3. **Evidence:** the Bayesian metacognition framework unifies confidence and error detection in simulation (Fleming & Daw 2017 abstract) **[HYP]**. Calibration metrics such as ECE and the Brier score are **[EST]** tools.
4. **Limits:** calibration on in-distribution data says little about distribution shift.
5. **Fit:** the world model's predicted transition probabilities give a directly testable confidence signal.
6. **Test:** expected calibration error of predicted success against realised success, before and after a hidden change.
7. **Simpler alternative:** posterior predictive probabilities from the Dirichlet counts are already calibrated in a stationary environment. Measure before adding a separate monitor.

---

## 14. Neuroscience-inspired agents, and other work

**Neuroscience-inspired AI.**
- Hassabis, Kumaran, Summerfield & Botvinick 2017 [K] argue that neuroscience can inspire and validate AI mechanisms.
- Botvinick et al. 2019 [K] connect episodic and meta-RL "fast and slow" learning.
- **Lesson [INF]:** take mechanisms with a computational rationale, not anatomical labels. This is the opposite of naming a module "hippocampus".

**Jeff Hawkins and Numenta.** Hawkins, Lewis, Klukas, Purdy & Ahmad 2019 (Front. Neural Circuits 12:121, doi:10.3389/fncir.2018.00121) [V] is a *hypothesis and theory* article: grid-cell-like location codes in every cortical column. **Fit for MiniFlyWire's next milestones: low. [INF]** Reference only.

**NVIDIA research (relevance: Velith and Mini Prometheus simulation, not the MiniFlyWire core):**
- Cosmos world foundation models, arXiv:2501.03575 [V].
- Isaac Lab, arXiv:2511.04831 [V], successor of Isaac Gym, arXiv:2108.10470 [K].
- Voyager, arXiv:2305.16291 [K].
- Eureka, arXiv:2310.12931 [K].

These are large-scale simulation, world-model and LLM-agent systems. They inform the environment interface discipline (reset/step, domain randomisation, seeded simulation) that CF-01 adopts at toy scale. They are not dependencies. **[INF]**

**Resource-rational analysis.** Lieder & Griffiths 2020 [K]. It informs adaptive computation (§10).

---

## 15. Synthesis: what MiniFlyWire should build, in order

| Order | Mechanism | Why first | Simpler alternative kept as a baseline |
|---|---|---|---|
| 0 | Environment–agent separation with hidden structure and a discriminating battery (CF-01) | No mechanism can be credited without it (§1; audit §6–7) | — |
| 1 | Tabular Bayesian world model + value-iteration planner (CF-03) | The missing MB half (§3, §8) | Dyna-Q (§4) |
| 2 | Uncertainty-directed exploration from the model posterior (CF-03/CF-04) | Latent learning and hidden change need it (§12) | Count-based optimism |
| 3 | MB/MF arbitration by reliability, and calibration (CF-04) | Flexibility versus speed (§3, §13) | Fixed MB |
| 4 | Partial observability, history/belief state, then genuine episodic retrieval (CF-05) | Makes memory necessary (§7, §9) | k-step history |
| 5 | Structural transfer (CF-06) | Generalisation claims (§11) | Prior transfer |
| 6 | SR and expected-free-energy baselines | Discriminate theories once tasks exist (§5, §6) | — |

---

## References

**Verified [V].** Bibliographic records checked by web search on 2026-11-07.

- Behrens, T.E.J., Muller, T.H., Whittington, J.C.R., Mark, S., Baram, A.B., Stachenfeld, K.L., Kurth-Nelson, Z. (2018). What is a cognitive map? Organizing knowledge for flexible behavior. *Neuron* 100, 490–509. doi:10.1016/j.neuron.2018.10.002 [V]
- Da Costa, L., Parr, T., Sajid, N., Veselic, S., Neacsu, V., Friston, K. (2020). Active inference on discrete state-spaces: a synthesis. *J. Math. Psychol.* 99, 102447. doi:10.1016/j.jmp.2020.102447 [V]
- Fleming, S.M., Daw, N.D. (2017). Self-evaluation of decision-making: a general Bayesian framework for metacognitive computation. *Psychol. Rev.* 124(1), 91–114. doi:10.1037/rev0000045 [V]
- George, D., Rikhye, R.V., Gothoskar, N., Guntupalli, J.S., Dedieu, A., Lázaro-Gredilla, M. (2021). Clone-structured graph representations enable flexible learning and vicarious evaluation of cognitive maps. *Nat. Commun.* 12, 2392. doi:10.1038/s41467-021-22559-5 [V]
- Hafner, D., Pasukonis, J., Ba, J., Lillicrap, T. (2025). Mastering diverse control tasks through world models. *Nature* 640, 647–653. doi:10.1038/s41586-025-08744-2 (preprint arXiv:2301.04104) [V]
- Hawkins, J., Lewis, M., Klukas, M., Purdy, S., Ahmad, S. (2019). A framework for intelligence and cortical function based on grid cells in the neocortex. *Front. Neural Circuits* 12, 121. doi:10.3389/fncir.2018.00121 [V]
- Kumaran, D., Hassabis, D., McClelland, J.L. (2016). What learning systems do intelligent agents need? Complementary learning systems theory updated. *Trends Cogn. Sci.* 20(7), 512–534. doi:10.1016/j.tics.2016.05.004 [V]
- Mattar, M.G., Daw, N.D. (2018). Prioritized memory access explains planning and hippocampal replay. *Nat. Neurosci.* 21, 1609–1617. doi:10.1038/s41593-018-0232-z [V]
- Mittal, M., et al. (NVIDIA) (2025). Isaac Lab: a GPU-accelerated simulation framework for multi-modal robot learning. arXiv:2511.04831 [V]
- Momennejad, I., Russek, E.M., Cheong, J.H., Botvinick, M.M., Daw, N.D., Gershman, S.J. (2017). The successor representation in human reinforcement learning. *Nat. Hum. Behav.* 1, 680–692. doi:10.1038/s41562-017-0180-8 [V]
- NVIDIA (Agarwal, N., et al.) (2025). Cosmos world foundation model platform for physical AI. arXiv:2501.03575 [V]
- Whittington, J.C.R., Muller, T.H., Mark, S., Chen, G., Barry, C., Burgess, N., Behrens, T.E.J. (2020). The Tolman-Eichenbaum Machine. *Cell* 183(5), 1249–1263. doi:10.1016/j.cell.2020.10.024 [V]

**From the author's knowledge [K].** Not re-checked in this session. Verify each before any external publication.

- Adams, C.D., Dickinson, A. (1981). Instrumental responding following reinforcer devaluation. *Q. J. Exp. Psychol. B* 33(2), 109–121.
- Anderson, J.R., Bothell, D., Byrne, M.D., Douglass, S., Lebiere, C., Qin, Y. (2004). An integrated theory of the mind. *Psychol. Rev.* 111(4), 1036–1060.
- Blundell, C., et al. (2016). Model-free episodic control. arXiv:1606.04460.
- Botvinick, M., Ritter, S., Wang, J.X., Kurth-Nelson, Z., Blundell, C., Hassabis, D. (2019). Reinforcement learning, fast and slow. *Trends Cogn. Sci.* 23(5), 408–422.
- Brafman, R.I., Tennenholtz, M. (2002). R-max — a general polynomial time algorithm for near-optimal reinforcement learning. *J. Mach. Learn. Res.* 3, 213–231.
- Daw, N.D., Gershman, S.J., Seymour, B., Dayan, P., Dolan, R.J. (2011). Model-based influences on humans' choices and striatal prediction errors. *Neuron* 69(6), 1204–1215.
- Daw, N.D., Niv, Y., Dayan, P. (2005). Uncertainty-based competition between prefrontal and dorsolateral striatal systems for behavioral control. *Nat. Neurosci.* 8, 1704–1711.
- Dayan, P. (1993). Improving generalization for temporal difference learning: the successor representation. *Neural Comput.* 5(4), 613–624.
- Dolan, R.J., Dayan, P. (2013). Goals and habits in the brain. *Neuron* 80(2), 312–325.
- Friston, K. (2010). The free-energy principle: a unified brain theory? *Nat. Rev. Neurosci.* 11, 127–138.
- Friston, K., FitzGerald, T., Rigoli, F., Schwartenbeck, P., Pezzulo, G. (2017). Active inference: a process theory. *Neural Comput.* 29(1), 1–49.
- Gershman, S.J. (2018). The successor representation: its computational logic and neural substrates. *J. Neurosci.* 38(33), 7193–7200.
- Gershman, S.J., Niv, Y. (2010). Learning latent structure: carving nature at its joints. *Curr. Opin. Neurobiol.* 20(2), 251–256.
- Guo, C., Pleiss, G., Sun, Y., Weinberger, K.Q. (2017). On calibration of modern neural networks. arXiv:1706.04599.
- Ha, D., Schmidhuber, J. (2018). World models. arXiv:1803.10122.
- Hassabis, D., Kumaran, D., Summerfield, C., Botvinick, M. (2017). Neuroscience-inspired artificial intelligence. *Neuron* 95(2), 245–258.
- Hassabis, D., Maguire, E.A. (2007). Deconstructing episodic memory with construction. *Trends Cogn. Sci.* 11(7), 299–306.
- Kaelbling, L.P., Littman, M.L., Cassandra, A.R. (1998). Planning and acting in partially observable stochastic domains. *Artif. Intell.* 101, 99–134.
- Keramati, M., Dezfouli, A., Piray, P. (2011). Speed/accuracy trade-off between the habitual and the goal-directed processes. *PLoS Comput. Biol.* 7(5), e1002055.
- Kotseruba, I., Tsotsos, J.K. (2020). 40 years of cognitive architectures: core cognitive abilities and practical applications. *Artif. Intell. Rev.* 53, 17–94.
- Laird, J.E. (2012). *The Soar Cognitive Architecture*. MIT Press.
- Laird, J.E., Lebiere, C., Rosenbloom, P.S. (2017). A standard model of the mind. *AI Magazine* 38(4), 13–26.
- Laird, J.E., Newell, A., Rosenbloom, P.S. (1987). SOAR: an architecture for general intelligence. *Artif. Intell.* 33(1), 1–64.
- Lake, B.M., Ullman, T.D., Tenenbaum, J.B., Gershman, S.J. (2017). Building machines that learn and think like people. *Behav. Brain Sci.* 40, e253.
- Lengyel, M., Dayan, P. (2007). Hippocampal contributions to control: the third way. *NeurIPS* 20.
- Lieder, F., Griffiths, T.L. (2020). Resource-rational analysis. *Behav. Brain Sci.* 43, e1.
- Lin, L.-J. (1992). Self-improving reactive agents based on reinforcement learning, planning and teaching. *Mach. Learn.* 8, 293–321.
- Makoviychuk, V., et al. (2021). Isaac Gym: high performance GPU-based physics simulation for robot learning. arXiv:2108.10470.
- Marr, D. (1982). *Vision*. W.H. Freeman.
- McClelland, J.L., McNaughton, B.L., O'Reilly, R.C. (1995). Why there are complementary learning systems in the hippocampus and neocortex. *Psychol. Rev.* 102(3), 419–457.
- Moore, A.W., Atkeson, C.G. (1993). Prioritized sweeping. *Mach. Learn.* 13, 103–130.
- Oudeyer, P.-Y., Kaplan, F., Hafner, V.V. (2007). Intrinsic motivation systems for autonomous mental development. *IEEE Trans. Evol. Comput.* 11(2), 265–286.
- Parr, T., Pezzulo, G., Friston, K.J. (2022). *Active Inference*. MIT Press.
- Pathak, D., Agrawal, P., Efros, A.A., Darrell, T. (2017). Curiosity-driven exploration by self-supervised prediction. arXiv:1705.05363.
- Pfeiffer, B.E., Foster, D.J. (2013). Hippocampal place-cell sequences depict future paths to remembered goals. *Nature* 497, 74–79.
- Pritzel, A., et al. (2017). Neural episodic control. arXiv:1703.01988.
- Russek, E.M., Momennejad, I., Botvinick, M.M., Gershman, S.J., Daw, N.D. (2017). Predictive representations can link model-based reinforcement learning to model-free mechanisms. *PLoS Comput. Biol.* 13(9), e1005768.
- Schmidhuber, J. (2010). Formal theory of creativity, fun, and intrinsic motivation (1990–2010). *IEEE Trans. Auton. Ment. Dev.* 2(3), 230–247.
- Schrittwieser, J., et al. (2020). Mastering Atari, Go, chess and shogi by planning with a learned model. *Nature* 588, 604–609.
- Schultz, W., Dayan, P., Montague, P.R. (1997). A neural substrate of prediction and reward. *Science* 275, 1593–1599.
- Stachenfeld, K.L., Botvinick, M.M., Gershman, S.J. (2017). The hippocampus as a predictive map. *Nat. Neurosci.* 20, 1643–1653.
- Strehl, A.L., Littman, M.L. (2008). An analysis of model-based interval estimation for Markov decision processes. *J. Comput. Syst. Sci.* 74(8), 1309–1331.
- Sutton, R.S. (1991). Dyna, an integrated architecture for learning, planning, and reacting. *SIGART Bull.* 2(4), 160–163.
- Sutton, R.S., Barto, A.G. (2018). *Reinforcement Learning: An Introduction* (2nd ed.). MIT Press.
- Sutton, R.S., Precup, D., Singh, S. (1999). Between MDPs and semi-MDPs: a framework for temporal abstraction in reinforcement learning. *Artif. Intell.* 112, 181–211.
- Tolman, E.C. (1948). Cognitive maps in rats and men. *Psychol. Rev.* 55(4), 189–208.
- Watkins, C.J.C.H., Dayan, P. (1992). Q-learning. *Mach. Learn.* 8, 279–292.
