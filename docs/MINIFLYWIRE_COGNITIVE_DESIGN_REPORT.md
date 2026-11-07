# MiniFlyWire Cognitive: Toward a Reproducible Experimental Architecture for Learning, Memory, World Models and Goal-Directed Behavior

*Design report, 2026-11-07. This report contains no results from experiments that have not run. Section 3 reports measurements from the CF-00 runtime audit, which did run; its scripts and summary are committed in `experiments/cf00_audit/`. CF-01 gate results are reported separately in `experiments/cf01/results/RESULTS.md`, and this report does not anticipate them.*

## Abstract

MiniFlyWire is a browser-based graph agent with an extensive set of modules named after cognitive functions. We audit the running system and find the following:
- It navigates a fixed 20-node graph to a fixed goal at 8.8 times the rate of a random walk.
- It does so through redundant, model-free familiarity learned from its own goal-dependent reward, with privileged access to the true map.
- Most of its named cognitive signals do not change its decisions:
  - motivation, executive control and global affect states: none of them changes the argmax;
  - working memory: never written;
  - imagined future steps: never executed.

We argue that the most fundamental limitation is not a missing module. It is the absence of an environment that hides structure from the agent. Without one, no capability can be distinguished from a privileged shortcut.

We specify a target architecture with the following parts:
- a learned Bayesian world model;
- budgeted model-based planning;
- directed exploration from model uncertainty;
- arbitration between model-based and model-free control;
- calibrated confidence;
- episodic memory introduced only under partial observability.

We also specify a benchmark battery built on the classical cognitive-map signatures (latent learning, detour, revaluation, hidden structural change, transfer) and a first milestone, CF-01, which builds the testbed and tests whether its tasks discriminate model-based from model-free learning.

## 1. Introduction

Systems described as cognitive architectures are often evaluated by inspecting their components rather than their behaviour. A component that is named, imported and displayed is not thereby shown to do anything. We take the opposite stance: a capability exists only if removing it changes behaviour on a task that requires it, relative to a baseline that lacks it.

Our question has two parts:
1. Which capabilities does MiniFlyWire have under that standard?
2. What is the smallest change that makes the standard testable at all?

The project's long-term architecture is MiniFlyWire → Noetica → Velith → Mini Prometheus. MiniFlyWire is the laboratory in which mechanisms are proposed and falsified before any of them is reused upstream.

## 2. Background

Three literatures frame the design (details and citations in `COGNITIVE_RESEARCH_REVIEW.md`).

1. **Cognitive maps.** Behavioural signatures separate internal structural knowledge from stimulus–response habit: latent learning, detours and immediate revaluation (Tolman 1948; Behrens et al. 2018).
2. **Model-based versus model-free reinforcement learning.** It explains when such signatures should appear and how two controllers might be arbitrated (Daw, Niv & Dayan 2005; Daw et al. 2011). Dyna (Sutton 1991) and the successor representation (Dayan 1993; Momennejad et al. 2017) give intermediate cases with distinct predictions.
3. **Complementary learning systems and episodic control.** Episodic memory is necessary mainly when the current observation is insufficient or learning must be one-shot (Kumaran, Hassabis & McClelland 2016; Lengyel & Dayan 2007).

A consistent lesson: begin with the simplest mechanism that makes a falsifiable prediction (a tabular Bayesian world model) and add complexity only where a task demonstrates the need.

## 3. The existing system: demonstrated results

All measurements come from the CF-00 audit: 3,000 steps per session, seeds 101, 202 and 303, goal 16, cold store; repeated runs were byte-identical. The full evidence is in `COGNITIVE_AUDIT.md` §3.

- **Decision structure.** Each decision ranks 4.7 candidates on average by a 36-term additive score.
  - The score is blended 60/40 with an "executive arbitration" score that changed the winning action in 0 of 6,908 decisions.
  - Five global state terms (curiosity, confidence, stress, fatigue, fatigue overload) add the same value to every candidate, so they cannot change an argmax.
  - Three terms are always zero.
  - Fatigue acts only by lowering the exploration rate, from 0.20 to as low as 0.088.
- **Goal reaching is fast and over-determined.**
  - BASE reached the goal 2,347 times in 3 × 3,000 steps; a uniform random walk on the same graph gives about 266.
  - Removing every privileged map channel together with Q-values and reward maps still left 1,877 arrivals.
  - In those runs the decision favoured the distance-minimising neighbour 57.3% of the time against 23.4% for uniform choice. The direction was carried by success-reinforced edge familiarity: trust, local emotion, episode adjacency, attention re-weighting and transition counts.
  - Removing the privileged look-ahead delayed the first arrival from 2–6 to 29–151 moves in two of three seeds. These ablations use three seeds each and are descriptive.
- **Prior committed studies agree.**
  - Restoring only the episode store raised goal reaches (XFER-1), but through familiarity of transitions into the goal, not through replay or episode content (XFER-2).
  - The episodic pathway's effect is goal-agnostic (MCF-0, recorded in project memory; not committed).

The demonstrated capability is therefore narrow procedural learning: habit formation toward one fixed goal on a known graph.

## 4. Existing but unvalidated mechanisms

Prediction error, uncertainty ledgers, schema abstraction, semantic vitality, long-term consolidation and attention amplification are implemented and execute, but each one either:
- changes ≤0.16% of decisions in isolation; or
- acts only through exploration rate and learning gating.

None has a task on which its contribution was tested. They are candidates, not capabilities.

## 5. New architectural proposals

**Separation** (handbook §8):
- An environment owns ground truth and reward.
- An observation channel delivers only `{node, nActions, goal}`, with opaque node labels and permuted action labels.
- Agents receive randomness only from a seeded stream.
- Visualization is a read-only telemetry subscriber.

**Agent core**, built in roadmap order (handbook §9):
1. A Dirichlet transition and reward model with posterior uncertainty and surprise.
2. A value-iteration planner on the posterior-mean model with an explicit budget.
3. A count-based optimism, or information-gain, exploration bonus.
4. Arbitration between model-based and model-free values by reliability.
5. A calibration monitor that sets the planning budget and exploration scale.
6. Under partial observability only: history or belief state, and an episodic store with cue-based retrieval and provenance.
7. Consolidation into reusable structure for transfer.

Each store has one owner and an API-only write path tagged with provenance. This removes the duplicated familiarity stores the audit found.

## 6. Experimental methodology

The battery (`COGNITIVE_EXPERIMENT_PROTOCOL.md`) contains:

| Code | Task |
|---|---|
| E1 | Latent learning |
| E2 | Detour |
| E3 | Reward relocation |
| E4 | Hidden reliability change |
| E5 | Transfer |
| E6 | Partial observability |
| E7–E9 | Memory, motivation and planning ablations |
| E10 | Long horizon |

**Design rules:**
- Worlds are seeded from labelled domains (dev, gate, confirm).
- All agents in a world share environment random numbers.
- The world is the unit of analysis.
- Each task has one pre-declared primary contrast, assessed with a paired percentile-bootstrap interval.

**Baselines:**
- random;
- tabular Q-learning;
- Dyna-Q;
- a privileged oracle as an upper bound;
- later, a learned-model planner, the successor representation, a belief or active-inference agent, and the legacy agent with its privileges declared.

A capability claim must beat the strongest simpler baseline, not only the weakest.

## 7. First milestone: CF-01

CF-01 builds the testbed and asks one scientific question: do E1–E3 discriminate Dyna-Q from Q-learning on 20 fresh worlds?

The gate also requires:
- determinism (two identical runs);
- isolation (schema, globals, imports, forbidden APIs, label permutation, privileged channel), each check paired with a mutant it must catch;
- environment correctness (contract, binomial statistics, blocked edges, common random numbers);
- oracle sanity.

A task that does not discriminate is not admitted to the battery.

The parameters are frozen in a commit before the gate domain is run. CF-01 introduces no new cognitive mechanism. It makes the next one, the learned world model of CF-03, testable.

## 8. Future hypotheses

These are stated now so that later results cannot redefine them.

1. **H-MB.** A Dirichlet world model with value iteration beats Dyna-Q on detour and revaluation once transitions are stochastic (CF-03).
2. **H-EXP.** An information-gain bonus increases the latent-learning benefit and does not capture an irreducibly noisy edge (CF-03).
3. **H-ARB.** Reliability-based arbitration improves recovery after a hidden change over fixed model-based control at equal planning cost (CF-04).
4. **H-EPI.** Episodic retrieval is necessary on aliased-observation tasks and gives no benefit on fully observed ones (CF-05).
5. **H-TR.** Transfer of learned structural priors speeds learning on unseen members of the same world family but not on a mismatched family (CF-06).

## 9. Limitations

- The audit covers one graph, one goal and 3,000-step sessions.
- Its knockouts are open-loop, and its ablations use three seeds.
- CF-01 is a development gate on small graphs, committed locally and not independently reproduced.
- Several citations are marked as not re-checked in this session.
- Nothing here supports a claim of general intelligence.

## 10. Conclusion

MiniFlyWire's existing value lies in its instrumentation, its determinism and its demonstrated habit learning, not in its cognitive vocabulary. The shortest credible path to research-grade cognitive behaviour has four steps:
1. Hide the world from the agent and measure with tasks that require structure (CF-01).
2. Add the single missing mechanism those tasks call for: a learned world model with planning and directed exploration (CF-03).
3. Add arbitration, calibration and episodic memory only when tasks make each necessary.
4. Confirm with independent reproduction before any mechanism moves into Noetica.
