# Cognitive Architecture Comparison

**Status:** complete research survey. Research document only: no code, no experiment, no claim about MiniFlyWire's capability.
**Date:** 2026-11-13.
**Extends:** [`COGNITIVE_RESEARCH_REVIEW.md`](../COGNITIVE_RESEARCH_REVIEW.md) §2 (which treats architectures in one paragraph), [`COGNITIVE_ARCHITECTURE_HANDBOOK.md`](../COGNITIVE_ARCHITECTURE_HANDBOOK.md) §7 and §9 (arbitration row), and [`research/external/EXISTING_WORK_AUDIT.md`](../../research/external/EXISTING_WORK_AUDIT.md) §5.

## 0. Evidence rules

**Citation tags.**
- **[V]** the bibliographic record, repository or licence was fetched or search-confirmed in this session (2026-11-12/13). For repositories, [V] means the GitHub REST API record (`api.github.com/repos/<owner>/<repo>`: licence SPDX id, last push, archive flag) or the licence file at HEAD was read on 2026-11-13.
- **[M]** cited from memory and not checked. Verify before any external use.
- [V] covers the record and, at most, the abstract. No full text was read. No repository was cloned, built or run, so every capability statement about third-party software is a report of what its authors claim.

**Claim grades.** 1 established · 2 strong empirical evidence · 3 emerging · 4 plausible engineering inference · 5 unverified hypothesis · 6 speculative. Grades appear as `(g1)` … `(g6)`.

## 1. Comparative matrix

"Impl." gives the main public implementation, its licence and its last push as read on 2026-11-13. "n/v" means not verified.

| Architecture | Memory | Learning | Planning / reasoning | Control | Impl. + licence | Evidence | Reusable idea |
|---|---|---|---|---|---|---|---|
| **ACT-R** | Declarative chunks with activation (recency, frequency, spreading); procedural rules; one-chunk buffers | Base-level activation, utility learning (RL on rules), production compilation | No planner; retrieval plus rules; instance-based decisions | Serial: one production per ~50 ms cycle, chosen by noisy utility | CMU Lisp ACT-R 7, LGPL-2.1 [V, via mirror]; `jakdot/pyactr` GPL-3.0, 2026-08 [V] | Decades of human reaction-time, error and fMRI fits (g2); knowledge is hand-written | Activation-based retrieval with decay as a principled eviction and recall rule |
| **Soar** | Working memory graph; procedural rules; semantic and episodic stores | Chunking, RL on operator preferences, episodic and semantic storage | Operator proposal, evaluation, selection; impasse opens a subgoal | Central decision cycle; deliberation is triggered only by an impasse | `SoarGroup/Soar`, BSD (2-clause text at HEAD) [V], 2026-11 | Large agents (robots, games, simulated pilots) (g2 as engineering); few controlled ablations | **Impasse-triggered deliberation**: plan only when the cheap controller cannot decide |
| **Common Model of Cognition** | WM hub; declarative and procedural LTM; perception; motor | RL and associative learning on both LTMs | Not specified beyond the cognitive cycle | Serial cognitive cycle through a WM hub | No implementation (a consensus specification) | Connectome DCM comparison favours CMC wiring over six alternatives (Stocco et al. 2021 [V]) (g3) | A checklist of module interfaces; nothing executable |
| **EPIC** | Production memory; WM partitions; detailed perceptual and motor stores | None in the core architecture | Hand-written task strategies | Parallel rule firing; bottlenecks are peripheral; "executive" is ordinary rules | `dekieras/EPIC`, MIT, last push 2016 [V] | Fits dual-task human data (g2) | Executive control as explicit, testable strategy rules, not a module |
| **CLARION** | Explicit (rules) and implicit (networks) at each of four subsystems | Bottom-up rule extraction from implicit Q-learning; top-down assimilation | Rule chaining plus similarity | Integration of implicit and explicit levels; motivational and metacognitive subsystems set goals and parameters | `cmekik/pyClarion`, MIT, 2026-11 [V] | Fits implicit/explicit learning tasks (g2 within psychology) | Two-level learner whose mixing weight is itself measured |
| **Sigma** | Factor graph holds all memories | Gradient-descent-like learning on graph functions | Message passing (sum/max-product); Soar-style cycle on top | Central cycle over a graphical model | USC ICT release, BSD-2 [V, secondary summary]; `TownesZhou/PySigma` licence n/v, 2024 | Demonstrations; limited external replication (g3) | One inference engine for memory, perception and decision |
| **ICARUS** | Conceptual and skill hierarchies; belief and goal memories | Skill learning from problem-solving traces | Means-ends problem solving over hierarchical skills | Goal-driven, top-down skill selection, reactive execution | No public repository found (n/v) | Demonstrations in games and simulated driving (g3) | Hierarchical skills indexed by the goals they achieve |
| **LIDA / GWT** | Perceptual associative, episodic, declarative, procedural; a "current situational model" | Perceptual, episodic, procedural learning gated by broadcast | Mostly reactive; deliberation as multi-cycle | Attention codelets form coalitions; the winner is **broadcast**; action selection follows | LIDA Framework (Java), registration + **non-commercial** licence [V] | Conceptual model; few quantitative benchmarks (g5) | A single capacity-limited bottleneck that every module must pass through |
| **GNW / shared workspace (ML)** | Limited-capacity slots | Gradient descent | None | Modules compete to write; contents broadcast to all | Paper code only (n/v) | Goyal et al. 2022 [V] report gains on ML tasks (g3); Cogitate 2025 [V] challenges key GNWT neural predictions | Bandwidth limit as a forcing function for specialisation |
| **OpenCog / Hyperon** | Typed hypergraph (AtomSpace) with truth and attention values | PLN, MOSES, pattern mining | Probabilistic logic, pattern matching | Economic attention allocation spreads "importance" | `opencog/atomspace` AGPL-3.0 with a linking exception [V], 2026-02; `trueagi-io/hyperon-experimental` MIT, 2026-02 [V] | No standard-benchmark evidence of integrated capability found (g5) | Attention as a conserved budget spent on memory items |
| **HTM / Thousand Brains / Monty** | Sparse distributed representations; sequence memory; object models in reference frames | Hebbian, online, local | No reward-driven planning; model-based sensorimotor policies for recognition | Voting among learning modules | `thousandbrainsproject/tbp.monty` MIT, 2026-11 [V]; `htm-community/htm.core` AGPL-3.0, 2026-10 [V]; `numenta/nupic-legacy` MIT per API, 2024 [V] | Monty: object and pose recognition on YCB (Leadholm et al. 2025 [V]); authors call it "nascent" (g3) | Consensus by voting across independent estimators |
| **Predictive processing** | Hierarchical generative model | Prediction-error minimisation | Implicit | Precision weighting of errors | No canonical implementation | Broad but hard-to-falsify framework (g3 as theory) | **Precision (reliability) weighting** of competing signals |
| **Active inference** | Generative model (A, B, C, D matrices) | Dirichlet count updates | Policy selection by expected free energy | Single objective; habit prior E | `infer-actively/pymdp` MIT, 2026-11 [V]; `ReactiveBayes/RxInfer.jl` MIT, 2026-11 [V] | Small discrete tasks; comparison with Q-learning and Bayesian RL on FrozenLake (Sajid et al. 2021 [V]) (g3) | Epistemic value as a planned-for quantity; habit prior as a cached policy |
| **Spaun / Nengo / SPA** | Semantic pointers in spiking populations; WM as attractors | Limited online RL in basal-ganglia weights | Fixed routing rules | Basal ganglia–thalamus action selection | `nengo/nengo`, "Nengo license", GPL v2 text at HEAD [V], 2026-08 | 2.5 M neurons, eight tasks (Eliasmith et al. 2012 [V]) (g2 for the demonstration); no new-task learning | Winner-take-all selection with explicit utility inputs |
| **Leabra / PBWM / emergent** | Distributed weights; hippocampal fast store; PFC stripes | Error-driven plus Hebbian; dopamine-gated | None explicit | BG **gating** of what enters and leaves working memory | `emer/leabra` BSD-3, 2026-06 [V]; `emer/axon` BSD-3, 2026-11 [V] | PBWM learns working-memory tasks such as 1-2-AX (O'Reilly & Frank 2006 [V]) (g2) | **Learned gating** of memory writes |
| **DAC** | Reactive reflexes; adaptive (conditioning); contextual (sequence memory) | Classical conditioning, sequence chunking | Contextual layer chains stored sequences to goals | Layered; higher layers take over as their confidence grows | No canonical repository verified (n/v) | Robot foraging demonstrations (g3) | Layered take-over by confidence |
| **NARS / OpenNARS** | Concept network with truth (frequency, confidence) | Revision of beliefs from evidence | Non-axiomatic logic; temporal and procedural inference | Priority-driven attention under fixed resources; ONA is event-driven | `opennars/OpenNARS-for-Applications` MIT, 2025-05 [V]; `opennars/opennars` MIT, 2021 [V] | Developer-reported demonstrations (g5) | Two-number evidence (frequency, confidence) on every belief |
| **MicroPsi / Psi** | Node nets; spreading activation | Reinforcement of links by need satisfaction | Simple plan search | Needs ("urges") modulate arousal, resolution level, selection threshold | `joschabach/micropsi2`, no licence file found (n/v), last push 2022 [V] | Qualitative (g5) | Motivation as **modulators of control parameters**, not score terms |
| **WBA (Japan)** | Per-component | Per-component | Per-component | Brain reference architecture constrains module wiring | `wbap/BriCA1` Apache-2.0, 2026-04 [V] | A methodology (Yamakawa 2021 [V]); no integrated-agent benchmark found (g5) | Interface-first decomposition |
| **BrainCog (China)** | Spiking networks | STDP, surrogate gradients, R-STDP | Component demos | None unified | `BrainCog-X/Brain-Cog` Apache-2.0, 2025-11 [V] | Component benchmarks (Zeng et al. 2023 [V]); needs PyTorch | None at this scale |
| **LLM agents (CoALA, ReAct, Reflexion, Generative Agents, Voyager, MemGPT/Letta)** | Context window as WM; text stores for episodic, semantic, procedural (skills as code) | Writing to stores; no weight updates | LLM proposes and evaluates | An LLM call loop; memory paging by tool calls | `ysymyth/ReAct` MIT 2024; `noahshinn/reflexion` MIT 2025; `joonspk-research/generative_agents` Apache-2.0 2024; `MineDojo/Voyager` MIT 2024; `letta-ai/letta` Apache-2.0 2026-10 (all [V]) | Generative Agents ablation: memory, reflection, planning each raise human-rated believability [V] (g3) | Explicit read/write memory actions that are counted and ablatable |

## 2. Per-architecture notes

### 2.1 ACT-R

- **Philosophy.** A theory of human cognition first, an AI system second (Anderson et al. 2004 [M]; Laird 2022, arXiv:2201.09305 [V]). Every parameter is meant to be constrained by human data.
- **Structure.** Modules (declarative, procedural, goal, imaginal, visual, manual) talk only through one-chunk buffers. A chunk's activation is base-level (log of summed, power-law-decayed past uses) plus spreading activation from the buffers plus noise. Activation sets retrieval probability and latency.
- **Learning.** Base-level learning, utility learning for rules (a delta rule on reward), and production compilation that merges two rules into one.
- **Control and self-monitoring.** One production fires per cycle; conflict resolution is noisy utility. There is no executive module and no dedicated metacognition; retrieval failure and latency are the only built-in self-signals.
- **Evidence.** The largest body of quantitative human-data fits of any architecture (g2). **Limits:** models are hand-written; the architecture does not learn its own task knowledge from raw interaction; critics note many free modelling choices (g2).
- **Reuse.** The activation equation is a ten-line, parameter-light rule for which episodic items are retrievable and which are evicted. It is relevant only at CF-05, when an episodic store exists.

### 2.2 Soar

- **Philosophy.** General intelligent agents from a small set of fixed mechanisms; all deliberate behaviour is operator selection in a problem space (Laird, Newell & Rosenbloom 1987 [M]; Laird 2012 [M]).
- **Learning.** Chunking compiles the result of a subgoal into a rule; RL tunes numeric operator preferences; episodic and semantic learning are storage.
- **Control.** Propose, evaluate, select, apply. When preferences are insufficient or conflicting, an **impasse** creates a substate in which the agent can deliberate, look ahead or query memory. The result is cached by chunking.
- **Self-monitoring.** The impasse is a built-in "I cannot decide" signal, which is the most concrete metacognitive trigger in any classical architecture (g4).
- **Evidence.** Long-lived agents and robots (g2 as engineering demonstration). **Limits:** knowledge engineering; little evidence that the combination of memories beats simpler baselines on controlled tasks (g4).
- **Reuse.** Impasse-triggered planning maps directly onto a tabular agent: plan only when the model-free values at the current state are tied or uncertain. Laird's comparison (arXiv:2201.09305 [V]) finds ACT-R and Soar structurally similar, which supports treating the cycle "retrieve, propose, select, apply, learn" as the stable core.

### 2.3 Common Model of Cognition

A consensus abstraction of ACT-R, Soar and Sigma (Laird, Lebiere & Rosenbloom 2017 [M]): working memory as the hub, two long-term memories, perception and motor modules, a serial cognitive cycle, and learning as a side effect of processing. Its strongest evidence is that its wiring fits human effective connectivity better than six alternative architectures in 200 participants across seven tasks (Stocco et al. 2021, doi:10.1016/j.neuroimage.2021.118035 [V]) (g3: one group, authors include the model's proposers). It specifies no algorithms, so it cannot fail a behavioural test. **Reuse:** a naming and interface check for the handbook's §9 table, nothing more.

### 2.4 EPIC

Kieras and Meyer's architecture for human performance [M]: detailed perceptual and motor processors around a production system in which **all matching rules fire in parallel**. It explains dual-task costs by peripheral bottlenecks and task strategy, not by a central bottleneck (g2 within its domain). No learning. **Reuse:** the position that "executive control" is a set of ordinary, inspectable rules is a useful discipline: a controller that cannot be written as a rule over measured signals is not yet specified.

### 2.5 CLARION

Sun's dual-process architecture [M]: each subsystem (action-centred, non-action-centred, motivational, metacognitive) has an implicit level (networks trained by Q-learning) and an explicit level (rules). Rules are extracted bottom-up when an implicit action succeeds, then refined. The metacognitive subsystem sets goals, learning rates and the level-mixing weights. **Evidence:** fits to implicit-learning tasks (serial reaction time, process control) (g2). **Limits:** many parameters; small user base. **Reuse:** the idea that the mixing weight between two learners is an explicit, logged quantity is the arbitration scheme of §3 under another name.

### 2.6 Sigma

Rosenbloom, Demski & Ustun (2016, doi:10.1515/jagi-2016-0001 [V]) implement every capability as message passing on one factor graph under a Soar-like cycle. Uniform, but inference cost grows with graph structure and adoption is small (g4). **Reuse:** none; a Dirichlet table is the degenerate case.

### 2.7 ICARUS

Langley's architecture for physical agents (Choi & Langley 2018, doi:10.1016/j.cogsys.2017.05.005 [V]): bottom-up concept inference, top-down hierarchical skills, and means-ends problem solving on impasse whose solutions become skills. Logical and weak under noise (g4); no public code found. **Reuse:** skills learned from successful plans, once long-horizon tasks (E10) exist.

### 2.8 LIDA and Global Workspace Theory

- **Philosophy.** LIDA (Franklin and colleagues [M]) implements Baars' Global Workspace Theory: many unconscious specialists, one limited "stage" whose content is broadcast to all.
- **Cycle.** Perception builds a situational model; attention codelets form coalitions; the most active coalition wins the workspace; the broadcast recruits procedural schemes and triggers all learning; action selection (a behaviour network) picks one action. About ten cycles per second are assumed.
- **Evidence.** LIDA is mainly a conceptual model with qualitative agents (g5). For the theory, the preregistered Cogitate adversarial collaboration (256 participants; doi:10.1038/s41586-025-08888-1 [V]) reports results that "substantially challenge" key tenets of both GNWT and IIT; in particular the predicted prefrontal "ignition" at stimulus offset was not found (g2 that the strong neural predictions are not confirmed).
- **In ML.** Goyal et al. (ICLR 2022, arXiv:2103.01197 [V]) replace pairwise attention between modules with a write-competition into a small shared workspace and report benefits (g3). That is a result about neural modules trained by gradient descent, not about small tabular agents.
- **Reuse.** One idea survives: a **single bottleneck** through which every decision-relevant signal must pass makes contribution measurable, because the bottleneck's log shows which module's content won. The broadcast itself adds nothing when there are fewer than ten modules sharing one process (g4).

### 2.9 OpenCog, AtomSpace, Hyperon

Goertzel's "cognitive synergy" programme [M]: many algorithms on one weighted hypergraph, with economic attention allocation; Hyperon rebuilds it around the MeTTa language. No integrated benchmark result was found (g5). **Reuse:** none; a fixed planning budget bounds computation with one parameter.

### 2.10 HTM, Thousand Brains, Monty

HTM models cortical columns as sequence memories over sparse distributed representations with local Hebbian learning; its documented strength was streaming anomaly detection [M]. The Thousand Brains Project (Clay, Leadholm & Hawkins 2024, arXiv:2412.18354 [V]) reorganises this as many "learning modules" that each build object models in a reference frame and **vote**. Monty is evaluated on YCB object and pose recognition (Leadholm et al. 2025, arXiv:2507.04494 [V]); the authors describe it as nascent. There is no reward, goal or planning-for-value component. **Reuse:** voting among independent estimators is an ensemble; a small ensemble of transition models is a cheap uncertainty estimate, but Dirichlet counts already give one in closed form. Fit: low, as the research review concluded.

### 2.11 Predictive processing

A family of theories (Rao & Ballard 1999 [M]; Clark 2013 [M]; Friston 2010 [M]) in which the brain minimises precision-weighted prediction error across a hierarchy. Attention is the optimisation of precision. It is a framework, not an architecture, and is criticised as too flexible to refute (g3). **Reuse:** precision weighting is exactly reliability-weighted arbitration; in a tabular agent, "precision" is the inverse of posterior variance or of a running prediction-error average.

### 2.12 Active inference

- **Mechanism.** Perception, learning and action minimise variational free energy; policies are scored by expected free energy, which splits into pragmatic and epistemic value. A habit prior E can bias policies.
- **Evidence.** Sajid et al. (2021, doi:10.1162/neco_a_01357 [V]) compare active inference with Q-learning and Bayesian model-based RL on a modified FrozenLake. This shows competence on a toy task, not superiority (g3). Policy enumeration is exponential in horizon unless pruned (g1).
- **Reuse.** The epistemic term as a baseline at CF-05, as the review already plans. Nothing new.

### 2.13 Spaun, Nengo, Semantic Pointer Architecture

Eliasmith's group built a 2.5-million-spiking-neuron model that performs eight tasks from visual input to arm output (doi:10.1126/science.1225266 [V]). Symbols are high-dimensional vectors bound by circular convolution; action selection is a basal-ganglia model; routing is through thalamus. **Strength:** one model, many tasks, neural and behavioural data. **Limits:** tasks and routing rules are specified by the modeller; the 2012 model could not learn a new task; simulation was far slower than real time [M]. **Reuse:** none of the neural machinery. The selection principle (each candidate action has an explicit utility; one circuit selects the maximum and gates routing) is what a tabular arbitration already is.

### 2.14 Leabra, PBWM, emergent

O'Reilly's biologically based framework combines error-driven and Hebbian learning with inhibitory competition. PBWM (O'Reilly & Frank 2006, Neural Computation 18:283–328 [V]) adds prefrontal working memory whose **update is gated by the basal ganglia**, and the gating policy is learned by reinforcement. It learns tasks such as 1-2-AX where the correct response depends on a cue seen earlier (g2). **Limits:** slow, sensitive training; successor frameworks (axon) are research code. **Reuse:** the tabular version is direct: augment the state with one memory slot and add two internal actions, "store current observation" and "keep". Q-learning then learns what to remember. This is the simplest working memory that can be shown to matter, and it needs the aliased-node task (E6).

### 2.15 Distributed Adaptive Control (DAC)

Verschure's theory (2012, doi:10.1016/j.bica.2012.04.005 [V]): a somatic layer, a reactive layer of reflexes, an adaptive layer that learns state and associations by conditioning, and a contextual layer that stores and chains sequences toward goals. Control passes upward as the higher layer's prediction confidence exceeds a threshold. Evidence is robot foraging and a robot result in Nature (Verschure, Voegtlin & Douglas 2003 [M]) (g3). **Reuse:** "a higher layer takes control only when its confidence passes a threshold" is a second, independent source for reliability-gated control.

### 2.16 NARS / OpenNARS

Wang's non-axiomatic reasoning system assumes insufficient knowledge and resources: every belief has (frequency, confidence), inference is a term logic, and a priority "bag" decides what is processed under fixed time and memory [M]. OpenNARS for Applications (Hammer & Lofthouse 2020 [V]) is an event-driven C implementation that separates sensorimotor from semantic inference. Evidence is mostly developer demonstrations (g5). **Reuse:** the (frequency, confidence) pair is a Beta posterior in other notation; MiniFlyWire's Dirichlet counts already carry it. The bounded-priority-queue control is prioritised sweeping.

### 2.17 MicroPsi / Psi theory

Dörner's Psi theory, implemented by Bach [M]: physiological, social and cognitive needs generate urges; urges select motives; and **modulators** (arousal, resolution level, selection threshold, securing rate) change how cognition runs, for example how stable the current goal is against competitors. Evidence is qualitative (g5). The public repository has no licence file at the paths checked, so reuse of code is not possible; ideas only. **Reuse:** the handbook found that MiniFlyWire's drives are score terms with zero effect. Psi suggests the alternative: motivation should move a small number of control parameters (exploration bonus scale, planning budget, switch threshold), where an effect is measurable.

### 2.18 LLM-based architectures

- **CoALA** (Sumers, Yao, Narasimhan & Griffiths, arXiv:2309.02427, TMLR per arXiv comment [V]) is a framework: working memory, episodic, semantic and procedural long-term memory, internal actions (reasoning, retrieval, learning) and external actions, and a decision cycle of propose, evaluate, select. It is explicitly modelled on Soar.
- **ReAct** (arXiv:2210.03629 [M]) interleaves reasoning text and tool actions. **Reflexion** (arXiv:2303.11366 [M]) writes a verbal self-critique after failure into episodic memory. **Voyager** (arXiv:2305.16291 [M]) stores verified code skills. **Generative Agents** (arXiv:2304.03442 [V]) score memories by recency, importance and relevance and periodically "reflect"; its ablation shows each component raises human-rated believability. **MemGPT/Letta** (arXiv:2310.08560 [V]) pages a memory hierarchy by self-issued function calls. mem0 and Graphiti (both Apache-2.0, active [V]) are retrieval substrates.
- **Cost and limits.** All need a large language model; none meets the zero-dependency, no-GPU constraint. Evidence is task success or human ratings, rarely matched-baseline ablation, and believability is not capability (g4).
- **Reuse.** Two design points transfer without an LLM: (a) memory reads and writes are explicit actions that can be counted and ablated; (b) Reflexion's pattern, "on failure, write a record keyed by context that is retrieved next time", is a one-shot episodic mechanism matching the handbook's C7 test.

### 2.19 Further systems found (Japan, Korea, India; China and Europe are in the matrix, §2.15, §2.17 and §3)

- **Japan. Whole Brain Architecture Initiative.** Yamakawa (2021, Neural Networks 144:478–495, arXiv:2103.06123 [V]) proposes brain-reference-architecture-driven development: fix the information-flow diagram from anatomy, then develop components. `wbap/BriCA1` (Apache-2.0 [V]) is a module-scheduling framework. It is a methodology; no integrated-agent benchmark was found (g5).
- **Korea.** The strongest work is not an architecture but the arbitration line led by Sang Wan Lee at KAIST: Lee, Shimojo & O'Doherty (2014 [V]) and Kim, Park, O'Doherty & Lee (2019, doi:10.1038/s41467-019-13632-1 [V]). It is used in §3.
- **India.** One search found component-level brain-inspired models (IIT Madras basal-ganglia/hippocampus navigation, reported second-hand) and neuromorphic hardware at IISc, but no maintained open cognitive-architecture implementation. This is a thin search, not evidence of absence.

## 3. The control-architecture question

### 3.1 The six schemes and what supports each in small agents

| Scheme | Exemplars | What it decides | Evidence in small agents | Grade |
|---|---|---|---|---|
| **Centralised executive** | ACT-R and Soar cycles; a supervisory module | One arbiter reads everything and chooses | Human-data fits for the serial cycle. In small agents an executive placed on top of a single scorer has nothing to arbitrate: the repo's own audit measured 0 of 6,908 argmax changes | g2 for humans; g4 that it is inert without competing controllers |
| **Distributed competition** | Basal-ganglia selection (Redgrave, Prescott & Gurney 1999 [V]; Gurney, Prescott & Redgrave 2001 [V]); subsumption (Brooks 1986 [M]); Spaun | Winner-take-all over action or behaviour utilities | Works on robots for clean switching between conflicting behaviours (g2 [M]). With a single value table the "competition" is an argmax and adds nothing | g2 as a selection mechanism; g4 that it is redundant here |
| **Hierarchical control** | Options (Sutton, Precup & Singh 1999 [M]); DAC; ICARUS; PBWM | Higher level sets sub-goals or gates memory | Options speed learning when sub-goals fit the task and can slow it otherwise (g2 [M]). Needs long horizons; the legacy graph has diameter 4 | g2 in general; g4 that it is premature here |
| **Global-workspace broadcast** | LIDA; Goyal et al. 2022 [V] | Which content all modules see | Gains reported for gradient-trained neural modules (g3). No controlled result was found showing broadcast improving a small tabular agent. Key GNWT neural predictions were challenged in Cogitate 2025 [V] | g5 for small agents |
| **Event-driven** | Soar impasses; ONA; prioritised sweeping; surprise-triggered replanning | When to compute, not what to choose | Prioritised sweeping is textbook (g1 [M]). Impasse-driven deliberation is the core of Soar (g2). Cheap, and its effect is directly countable as computation saved | g1–g2 |
| **Hybrid arbitration** | Daw, Niv & Dayan 2005 [V]; Lee, Shimojo & O'Doherty 2014 [V]; Pezzulo, Rigoli & Chersi 2013 [V]; Dromnelle et al. 2022 [V] | Which of two or more complete controllers acts now | See §3.2 | g2–g3 |

The schemes are not rivals at the same level. Event-driven control answers *when to deliberate*; arbitration answers *whose answer to use*; hierarchy answers *at what time scale*; broadcast answers *who is informed*. An executive or a competition has an effect only if at least two complete controllers exist and sometimes disagree (g4). That precondition, not the choice of scheme, is what the legacy agent lacked.

### 3.2 Evidence on model-based / model-free arbitration

1. **Theory.** Daw, Niv & Dayan (2005, doi:10.1038/nn1560 [V]) propose that a model-based (tree-search) and a model-free (cached) controller each carry an uncertainty about their value estimates and that control goes to the more certain one. Model-based values are more accurate early and after change; cached values become reliable with training, and tree search carries its own noise that grows with depth. The paper is a normative account of rodent devaluation data, not a benchmark result (g3).
2. **Human evidence.** Lee, Shimojo & O'Doherty (2014, Neuron 81:687–699, doi:10.1016/j.neuron.2013.11.028 [V]) fit a model in which each system's **reliability** is computed from its own prediction errors (state prediction error for model-based, reward prediction error for model-free) and a dynamic weight follows the reliability difference; inferior lateral prefrontal and frontopolar cortex track those signals. Kim et al. (2019 [V]) add that people move toward model-based control as task complexity rises but fall back to model-free when complexity and uncertainty are both high (g2 for the behavioural pattern; g3 for the specific computation).
3. **Cost–benefit variants.** Keramati et al. (2011 [M]) and Pezzulo et al. (2013, doi:10.3389/fpsyg.2013.00092 [V]) trigger planning only when the value of information exceeds the cost of simulating; the latter demonstrates it in a simulated double T-maze, which is a small-agent result (g3). Kool, Gershman & Cushman (2017, doi:10.1177/0956797617708288 [V]) show people increase model-based control when it pays more. The expected value of control (Shenhav, Botvinick & Cohen 2013, doi:10.1016/j.neuron.2013.07.007 [V]) generalises this to choosing the identity and intensity of control by expected payoff minus cost; it is an integrative theory of anterior cingulate function, and computing it exactly is itself expensive (g3). Callaway et al. (2022, doi:10.1038/s41562-022-01332-8 [V]) find human planning closer to a resource-rational optimum than to any single heuristic (g2).
4. **Engineering evidence.** Dromnelle et al. (2022, Int. J. Social Robotics, doi:10.1007/s12369-022-00942-6; arXiv:2004.14698 [V]) coordinate model-based and model-free learners on a real navigating robot and two simulated interaction tasks with a meta-controller that trades performance against computation. The abstract's claim is that reward is maintained relative to a model-based baseline at lower computational cost, including under non-stationarity (g3; one group, abstract only).
5. **The necessary warning.** Kool, Cushman & Gershman (2016, PLoS Comput. Biol. 12:e1005090 [V]) show that in the standard two-step task model-based control **does not earn more reward** than model-free control, so no arbitration can be shown to "help" there. Akam, Costa & Dayan (2015, doi:10.1371/journal.pcbi.1004648 [V]) show model-free strategies can masquerade as model-based in that task. An arbitration benefit is therefore a property of the task as much as of the agent (g2).

### 3.3 What this implies for a ≤100-state tabular agent

- **Exact planning is cheap here.** With a correct model, value iteration dominates on reward, and arbitration cannot beat "always model-based" on reward (g4). This is the trap Kool et al. describe.
- **Arbitration can change decisions for the better in exactly two regimes.**
  - *The model is wrong or stale.* Early, when the prior dominates, and after a hidden change, a planner acts confidently on a bad model. The programme's own CF-03 record reports this precondition: MBVI held A1–A3 but failed calibration (ECE 0.101 against a bound of 0.05), with early overconfidence as the suspected cause (`experiments/cf03/results/RESULTS.md`). A controller that defers to cached values, or explores, while model reliability is low has something real to gain (g4).
  - *Computation is counted.* If value-iteration backups are a measured cost, a controller that plans only when needed can match reward at a fraction of the backups (g3, Dromnelle; g1 for prioritised sweeping).
- **Simplest scheme with measurable support.** A two-controller agent with:
  1. `rel_MB` = 1 − running mean of absolute state prediction error (did the predicted successor distribution cover what happened);
  2. `rel_MF` = 1 − running mean of normalised absolute reward prediction error;
  3. act on Q_MB if `rel_MB − rel_MF > θ`, otherwise on Q_MF, with a logged controller id;
  4. replan (run value iteration) only on an **event**: a state prediction error above a threshold, a goal-cue change, or a tie in Q_MF at the current state (the Soar impasse).
  
  This is Lee et al.'s reliability comparison with a hard switch, plus Soar's trigger. It has two thresholds and two decay rates, all of which can be frozen before a gate run.
- **What "shown to change decisions for the better" must mean.** (i) The controller id differs from a fixed policy on a non-trivial share of decisions, and the chosen action differs from the fixed-MB action on a logged share (the audit's argmax-change test, which the legacy executive failed at 0). (ii) Against fixed-MB: equal reward within a pre-set margin at fewer backups, or higher reward in the stale-model window after hidden change (E4). (iii) Against fixed-MF: higher first-episode reward after revaluation (E3). (iv) Against a **random-switch control with the same switch rate**: better, which shows the reliability signal carries the benefit and the mixing does not.
- **Ranking for small agents.** Event-driven triggering plus reliability arbitration (supported, cheap, falsifiable) > hierarchical control (supported but needs tasks not yet built) > distributed competition (sound but redundant with one value scale) > centralised executive as a separate module (no added content) > broadcast (no small-agent evidence).

## 4. Implications for MiniFlyWire

All items are proposals for the `cognitive/` testbed only. None touches the legacy app, a governed study or a registered seed. Each needs its own frozen specification before a gate run; the thresholds named below are to be fixed in that specification, not tuned afterwards. "Benefit" is a prediction (g4 unless stated), not a result.

### 4.1 Mechanisms to adopt, ranked

| # | Mechanism (source) | Simplest implementation | Expected measurable benefit | Falsifier |
|---|---|---|---|---|
| 1 | **Reliability arbitration between MBVI and Q** (Daw 2005; Lee 2014) | §3.3 steps 1–3: two running prediction-error averages, one threshold, hard switch, controller id logged per decision | Non-zero controller switching; reward ≥ fixed-MB in the post-change window of E4; reward > fixed-MF on first post-change episode of E3 | Controller id never changes, or the arbitrated agent is no better than a random-switch control with the same switch rate, or it is worse than fixed-MB beyond the pre-set margin on E1–E3 |
| 2 | **Event-triggered planning** (Soar impasse; prioritised sweeping; Pezzulo 2013) | Run value iteration only when state prediction error exceeds a threshold, the goal cue changes, or Q_MF is tied at the current state; count backups | Same reward as plan-every-step within margin, at a pre-stated fraction of backups (Dromnelle-style) | Backups saved < the pre-stated fraction, or reward loss exceeds the margin |
| 3 | **Calibration-aware model reliability** (predictive-processing precision; CF-03 A4 failure) | Use the model's running calibration gap (predicted vs realised traversal success) as `rel_MB`; when it is poor, raise the exploration bonus scale | ECE after hidden change recovers faster; fewer confident failures at blocked edges | ECE and recovery latency unchanged against the same agent with the signal disconnected |
| 4 | **Single decision bottleneck with attribution log** (GWT, reduced to its measurable core) | Every module submits (action preference, source id, reliability) to one selector; the log records whose submission determined the argmax | A per-module "decisive share" metric, so C10 ablations have a predicted target before they run | A module with decisive share > 0 whose removal changes no behaviour (log is wrong), or share = 0 for every module but one (integration claim fails) |
| 5 | **Learned working-memory gating** (PBWM, tabular) | One memory slot; internal actions "store observation" / "keep"; state key = (observation, slot); plain Q-learning | Above-memoryless performance on the aliased-node task (E6); the store action is chosen at the cue node | No gain over memoryless Q, or no more than a k-step history baseline at higher cost |
| 6 | **Motivation as control modulators** (Psi/MicroPsi; CLARION metacognitive subsystem) | An internal variable (e.g. steps since last reward, model uncertainty mass) sets exploration-bonus scale and switch threshold θ; it never enters the action score directly | E1 coverage and E4 recovery improve against fixed parameters; effect vanishes when the modulator is clamped | Clamping the modulator changes nothing (the legacy drives' failure mode) |
| 7 | **Failure-keyed episodic record** (Reflexion pattern; ACT-R activation for retrieval and eviction) | On a surprising failure, store (context key, action, outcome); on context match, veto or down-weight that action once; evict by base-level activation | One-shot avoidance on E7: context-matched recall changes the next choice; mismatch control does not | Mismatch control shows the same change (it is a generic bias), or a tabular learner with the same data matches it |

**The single most important design rule from this survey (g4):** build two complete controllers that can disagree before building anything called an executive. Every architecture whose control has measurable support (Soar's impasse, PBWM's gate, DAC's layers, MB/MF arbitration) gives the controller a real choice between alternatives with different error profiles.

### 4.2 Ideas to reject, and why

- **Importing any architecture as code.** Licences block several (LIDA non-commercial; AtomSpace and htm.core AGPL; Nengo GPL v2; pyactr GPL-3.0; MicroPsi2 no licence found), all violate zero-dependency, and adoption would replace the research question (already ruled in `DO_NOT_TRUST.md` per the research review).
- **A production-rule cycle (ACT-R, Soar, EPIC, ICARUS).** Its evidence comes from hand-written task knowledge. MiniFlyWire's claim is learning hidden structure; rules written by us would be the oracle leak the testbed was built to remove.
- **Global-workspace broadcast, coalitions and codelets as mechanism.** No small-agent evidence (g5), and the theory's strongest neural predictions were challenged in 2025. Keep only the bottleneck-with-log (item 4).
- **Spiking or neural substrates (Spaun, Leabra, BrainCog, HTM).** Compute and dependencies with no testable advantage on ≤100-state graphs.
- **Full expected-value-of-control optimisation.** Computing EVC needs a model of the controllers' own payoffs; at this scale the two-threshold rule approximates it, and the difference is not detectable without far more tasks.
- **Using the two-step task as the arbitration benchmark.** It has no reward trade-off (Kool et al. 2016) and admits model-free mimicry (Akam et al. 2015).
- **Motivation or emotion as additive score terms.** Measured inert in the legacy agent; Psi theory itself places them as modulators.

## 5. What was not verified

- **Full texts.** No paper was read beyond its abstract or a search summary. Effect sizes, task details and the specific equations attributed to Lee et al. 2014, Daw et al. 2005, Pezzulo et al. 2013 and Dromnelle et al. 2022 are from memory of those papers and from abstracts.
- **Licences not confirmed at a primary source.** ACT-R LGPL-2.1 (search result quoting a mirror of the CMU page); Sigma BSD-2 (search summary of the USC ICT page); LIDA non-commercial (search summary of the CCRG licence document). MicroPsi2: no licence file found at `LICENSE` or `LICENSE.txt`, API reports no recognised licence. PySigma: API reports an unrecognised licence; not read. `numenta/nupic-legacy`: the API reports MIT, which differs from my recollection of AGPL for NuPIC; treat as reported, not as checked against history. Nengo: only the opening of `LICENSE.rst` was read (it states GPL v2); any additional terms further down were not read.
- **No repository found or checked** for ICARUS and for a canonical DAC implementation.
- **[M] references** in §2 (ACT-R, Soar and CMC primary papers; EPIC; CLARION; LIDA; OpenCog; HTM; predictive processing; MicroPsi; NARS theory; ReAct, Reflexion, Voyager arXiv ids; Brooks; options; Keramati; Verschure 2003; Spaun's simulation speed; Soar's cycle time).
- **Negative findings** ("no small-agent evidence for broadcast", "no integrated benchmark for OpenCog/WBA") mean none was found in a bounded search, not that none exists.

## References

**Verified in this session [V]** (record or abstract only).

- Akam, T., Costa, R., Dayan, P. (2015) *PLoS Comput. Biol.* 11(12), e1004648. doi:10.1371/journal.pcbi.1004648
- Callaway, F., et al. (2022) *Nat. Hum. Behav.* 6, 1112–1125. doi:10.1038/s41562-022-01332-8
- Choi, D., Langley, P. (2018) *Cogn. Syst. Res.* 48, 25–38. doi:10.1016/j.cogsys.2017.05.005
- Clay, V., Leadholm, N., Hawkins, J. (2024) arXiv:2412.18354
- Cogitate Consortium (2025) *Nature*. doi:10.1038/s41586-025-08888-1
- Daw, N.D., Niv, Y., Dayan, P. (2005) *Nat. Neurosci.* 8, 1704–1711. doi:10.1038/nn1560
- Dromnelle, R., Renaudo, E., Chetouani, M., Maragos, P., Chatila, R., Girard, B., Khamassi, M. (2022) *Int. J. Soc. Robot.* doi:10.1007/s12369-022-00942-6 (arXiv:2004.14698)
- Eliasmith, C., et al. (2012) *Science* 338, 1202–1205. doi:10.1126/science.1225266
- Goyal, A., et al. (2022) ICLR. arXiv:2103.01197
- Gurney, K., Prescott, T.J., Redgrave, P. (2001) *Biol. Cybern.* 84, 401–410. doi:10.1007/PL00007984
- Hammer, P., Lofthouse, T. (2020) AGI 2020, 80–90.
- Heins, C., et al. (2022) *J. Open Source Softw.* 7(73), 4098. doi:10.21105/joss.04098
- Kim, D., Park, G.Y., O'Doherty, J.P., Lee, S.W. (2019) *Nat. Commun.* 10. doi:10.1038/s41467-019-13632-1
- Kool, W., Cushman, F.A., Gershman, S.J. (2016) *PLoS Comput. Biol.* 12(8), e1005090.
- Kool, W., Gershman, S.J., Cushman, F.A. (2017) *Psychol. Sci.* 28(9), 1321–1333. doi:10.1177/0956797617708288
- Kotseruba, I., Tsotsos, J.K. (2020) *Artif. Intell. Rev.* 53, 17–94. doi:10.1007/s10462-018-9646-y (84 architectures surveyed)
- Laird, J.E. (2022) arXiv:2201.09305
- Leadholm, N., Clay, V., Knudstrup, S., Lee, H., Hawkins, J. (2025) arXiv:2507.04494
- Lee, S.W., Shimojo, S., O'Doherty, J.P. (2014) *Neuron* 81(3), 687–699. doi:10.1016/j.neuron.2013.11.028
- O'Reilly, R.C., Frank, M.J. (2006) *Neural Comput.* 18(2), 283–328. (doi:10.1162/089976606775093909 from a secondary source)
- Packer, C., et al. (2023) arXiv:2310.08560
- Park, J.S., et al. (2023) arXiv:2304.03442
- Pezzulo, G., Rigoli, F., Chersi, F. (2013) *Front. Psychol.* 4, 92. doi:10.3389/fpsyg.2013.00092
- Redgrave, P., Prescott, T.J., Gurney, K. (1999) *Neuroscience* 89(4), 1009–1023.
- Rosenbloom, P.S., Demski, A., Ustun, V. (2016) *J. Artif. Gen. Intell.* doi:10.1515/jagi-2016-0001
- Sajid, N., Ball, P.J., Parr, T., Friston, K.J. (2021) *Neural Comput.* doi:10.1162/neco_a_01357
- Shenhav, A., Botvinick, M.M., Cohen, J.D. (2013) *Neuron* 79(2), 217–240. doi:10.1016/j.neuron.2013.07.007
- Stocco, A., et al. (2021) *NeuroImage* 235, 118035. doi:10.1016/j.neuroimage.2021.118035
- Sumers, T.R., Yao, S., Narasimhan, K., Griffiths, T.L. (2024) arXiv:2309.02427
- Verschure, P.F.M.J. (2012) *Biol. Inspired Cogn. Archit.* 1, 55–72. doi:10.1016/j.bica.2012.04.005 (pages [M])
- Yamakawa, H. (2021) *Neural Netw.* 144, 478–495. arXiv:2103.06123
- Zeng, Y., et al. (2023) *Patterns*. doi:10.1016/j.patter.2023.100789 (arXiv:2207.08533)

**Repositories [V]** (GitHub API, 2026-11-13; licence, last push): as listed in the §1 matrix, plus `CarletonCognitiveModelingLab/python_actr` (MIT, 2025-10), `emer/emergent` (BSD-3-Clause, 2026-11), `mem0ai/mem0` (Apache-2.0, 2026-11), `getzep/graphiti` (Apache-2.0, 2026-11).

**From memory [M]** (unchecked): every citation tagged [M] in the text; arXiv ids for ReAct (2210.03629), Reflexion (2303.11366) and Voyager (2305.16291) are also from memory.
