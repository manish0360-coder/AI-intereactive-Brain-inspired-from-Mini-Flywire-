# The Minimal Ontology of a Universal Adaptive Cognitive Agent

**A first-principles derivation of the irreducible computational *objects* of cognition**
**Date:** 2026-06-27
**Mode:** Constructive derivation from computation alone. Prior MiniFlyWire / Velith / Mini-Prometheus documents are used as historical context only; no concept is preserved merely because it exists.
**Scope discipline:** We derive computational **objects**, not operators. An object earns existence only by a *unique computational capability irreducible to another object*. Differences of implementation, organization, timescale, or efficiency never justify a primitive.
**Output type:** Implementation-independent theoretical result.

---

## Abstract

We ask: what is the smallest set of computational objects required for universal adaptive cognition, and (subordinately) which abstraction best scales toward autonomous engineering and manufacturing? Starting from the definition of an embedded adaptive agent, we enumerate eight candidate objects and reduce them. Two internal objects survive every reduction, and one external ground is forced by embeddedness. The survivors are **C**, the *situation state* (the situation-indexed sufficient statistic of history — the running estimate that drives action), and **K**, the *generalizing structure* (the situation-invariant durable parameters supporting inductive transfer to unobserved inputs), over the ground **R**, *Reality*. We prove a tight lower bound: no agent that is simultaneously *embedded* and *adaptive* can have fewer than these (Theorem 4, via the parameters-vs-state / stability–plasticity impossibility and the internal-model principle). We prove that Objective/Value, Constraint, Task Model, Plan, and Episodic Memory each reduce to C, K, or R, or to an operator/mechanism/organizational-principle/artifact — and therefore must **not** be added as primitives (Theorems 5–9). We map Active Inference, Dreamer, MuZero, SOAR, ACT-R, Global Workspace Theory, Blackboard architectures, MBSE, Digital-Twin theory, Control Theory, and Reinforcement Learning onto {R; C, K}, with Control Theory's *separation theorem* + *internal-model principle* and MuZero's model-free-of-observations design serving as independent confirmations. Finally we judge the proposed ontology {Reality, Cognitive State, World Model}: its **cardinality (3) is correct and minimal**, but it contains **two specification errors** — *Reality is mis-typed as an internal object* (it is the ground), and *World Model is over-specified* (the primitive is generalizing structure K; a generative world model is its dominant, not its defining, instance). With those two corrections the ontology is both minimal and complete; nothing is missing.

---

## 1. Setup: what must be true of *any* universal adaptive agent

We take as given only the meaning of the words in the goal.

- **Embedded.** The agent exists inside an environment it does not wholly control and cannot fully internalize. Call the environment **R**.
- **Adaptive.** The agent's behavior improves with experience relative to some success criterion; "improve" presupposes a direction (a preference), and "with experience" presupposes retained influence of the past on the future.
- **Universal.** No domain-specific primitive is assumed. The agent must handle *partial observability* (the generic case: the world's relevant variables are not all directly given in any instant) and *novelty* (inputs never previously seen).
- **Agent.** It acts: it emits outputs that change R, selected on the basis of its inputs and internal content.

From these four words alone we must derive the objects. We deliberately *forbid* ourselves the vocabulary of existing systems (Working Memory, Task Model, Workspace, Blackboard, Scratchpad, Buffer); those are re-derived or rejected in §4 and §6.

**Definition 1 (Computational object).** A persistent, addressable carrier of information that an operator can read and/or write, possessing at least one *capability* — a class of computation it makes possible — that no other object possesses. Capability, not content-type, timescale, organization, or efficiency, is the sole criterion of objecthood.

**Definition 2 (Reduction).** Object X *reduces* to object Y if every capability attributed to X is already a capability of Y (possibly with different content). If X reduces to Y, X is not a primitive.

**Definition 3 (Genuine impossibility vs. efficiency).** Removing object X causes a *genuine computational impossibility* if some required input/output behavior of the agent becomes uncomputable by *any* operator over the remaining objects. If the behavior remains computable but slower/costlier, the loss is mere *efficiency* and X is not justified.

---

## 2. Step 1 — Enumerate every candidate object

We generate candidates exhaustively by asking, for the agent loop, "what information must be carried *somewhere*?"

1. **The world itself (R).** The external referent of perception and action.
2. **The current situation (the running estimate).** The integrated, continuously-updated internal account of "what is the case now," needed because of partial observability.
3. **Durable generalizing structure.** Learned regularities that transfer to novel inputs (a model, a policy, a value function — left untyped for now).
4. **Durable specific memory (episodic).** High-fidelity records of particular past experiences.
5. **The objective (goal / value / reward / specification).** The direction of adaptation; what counts as success.
6. **Constraints (feasibility).** What must hold; the partition of the space into possible/impossible, allowed/forbidden.
7. **The plan / intent.** A prospective course of action under construction.
8. **The task structure (decomposition / workspace).** The scaffold on which a problem is solved.

We will reduce 4–8 and one part of 1, leaving the irreducible core.

---

## 3. Step 2 — The two survivors, and why each is irreducible

We first isolate the two internal survivors (candidates 2 and 3) and prove they are distinct and each necessary. We then dispatch the rest in §4.

### 3.1 The parameters-vs-state impossibility (C ≠ K, and neither reduces to the other)

Cognition is, minimally, iterated inference: a function updates an internal account from evidence, the account drives action, and the same account feeds the next update. Write it as a parameterized iteration

> xₜ₊₁ = f_θ(xₜ, eₜ),  aₜ = g_θ(xₜ),

where **e** is evidence from R, **a** is action on R, **x** is the running account, and **θ** the structure of the maps. Two carriers appear and they are categorically different:

- **x** — the *iterate/state*: situation-indexed, overwritten every step, discarded after the episode. Call its carrier **C**.
- **θ** — the *parameters/structure*: situation-invariant, retained across situations, the thing that *generalizes* f and g to inputs never seen. Call its carrier **K**.

**Theorem 1 (Irreducibility of C and K to each other).**
*(a) K cannot absorb C.* Storing the per-situation iterate xₜ into the parameters θ overwrites the generalizer with situation-specific content; after the write, f_θ no longer computes the learned map. Generalization is destroyed. Hence the iterate cannot live in K without loss of the capability that defines K.
*(b) C cannot absorb K.* The iterate carrier holds one situation's estimate and is overwritten each step; structure stored there does not persist across situations and therefore cannot generalize to future, unseen inputs — exactly the capability that defines K.
Therefore C and K have disjoint capabilities and neither reduces to the other. ∎

Crucially, this is **not** a timescale argument (which Definition 1 forbids). It is a *capability* argument: **estimation of the current situation** (C) versus **inductive generalization to unobserved inputs** (K). They remain distinct even if one insisted on equal timescales, because writing a one-off estimate into a generalizer corrupts it regardless of how fast or slow either changes.

The same fact appears in cognitive science as the **stability–plasticity dilemma** and in control theory as the **separation of estimator and model** (§5.10): a single carrier updated by a single rule cannot simultaneously be slow-and-invariant (to preserve transferable structure) and fast-and-situation-tracking (to follow the moment) without one role destroying the other.

### 3.2 Necessity of C

**Theorem 2 (C is necessary).** Under partial observability the optimal (indeed any competent) action depends on the *history* of evidence, not the latest observation alone. The minimal information that makes the future conditionally independent of the past — the *sufficient statistic of history* (the belief state) — is (i) not present in R (it is inferred, internal), (ii) not present in K (it is situation-specific and non-generalizing), and (iii) required to choose the action. Remove C and that statistic is carried nowhere; competent action becomes uncomputable, not merely slower. By Definition 3 this is a genuine impossibility. ∎

(For the degenerate fully-observable, memoryless case, C collapses to a register holding the current observation and intermediate results — still a nonempty carrier distinct from K. C never vanishes.)

### 3.3 Necessity of K

**Theorem 3 (K is necessary).** "Adaptive" requires that experience exert retained, *transferable* influence on future behavior — i.e., behavior must improve on inputs not yet seen. The only carrier of situation-invariant structure is K (Theorem 1b). Without K, each situation is faced with no transferable structure; the agent cannot generalize from past to novel future and is not adaptive in the required sense. The behavior "perform better than chance on a novel input after experience on related inputs" becomes uncomputable. Genuine impossibility. ∎

A subtle point that *prevents over-specification*: Theorem 3 requires only *generalizing structure*, not specifically a generative model of observations. A value function or a policy is also generalizing structure. This is why the surviving primitive is **K = durable generalizing structure**, and the "World Model" of the proposed ontology is a *typed instance* of K, not the primitive (see §6.2, and MuZero in §5.3, which is adaptive with no observation model at all).

### 3.4 Necessity of R, and its categorical status

**Theorem 4 (R is necessary, but is the ground, not an internal object).** "Embedded" and "adaptive" are defined relative to an environment: perception is measurement *of* R, action is change *to* R, success is a criterion *over* R. Delete R and perception, action, and the adaptation gradient are undefined; the system becomes a closed symbol game with no semantics and nothing to adapt to — uncomputable as an *agent*. So R is necessary to the theory. However, R is not a representation the agent holds and can read/write at will; it is the external referent accessed only through the boundary operators (perception, execution). It is therefore the **ground / boundary condition**, categorically distinct from the internal objects C and K. ∎

### 3.5 Lower bound

**Theorem 5 (Tight lower bound = 3).** Any embedded, universal, adaptive agent requires at least: one internal carrier to compute at all (C, Thm 2), a second internal carrier disjoint from C by the parameters-vs-state impossibility (K, Thm 1, 3), and the external ground (R, Thm 4). Hence ≥ 2 internal objects + 1 ground. This bound is achieved: model-based RL / active-inference agents instantiate exactly {R; C, K}. Therefore the minimum is **exactly three**, with internal cardinality **two**. ∎

---

## 4. Step 3–4 — Reducing the remaining candidates (and why adding them is an error)

Each surviving-looking candidate below is shown to reduce, hence must not be a primitive.

**Theorem 6 (Objective / Value / Reward / Specification reduces).** The objective supplies a preference ordering — genuinely necessary (without it "select" and "improve" are undefined) and genuinely *non-derivable from descriptive knowledge* (the is/ought gap: no transition model fixes a preference). But necessity-of-information is not objecthood (Def. 1 demands a unique *capability*, not unique *content*). The preference is carried as: a *signal from R* (externally given reward / a written requirement is an artifact in R, §6.4), a *current goal binding in C*, and a *durable utility/value function in K* (a generalizing function over outcomes). Its capability — "be a function/ordering over states" — is exactly K's capability (generalization) or C's (current binding). No carrier with a new capability is required. *Therefore Objective reduces to {R, C, K}; a primitive "Goal object" is rejected.* (See ACT-R utilities, RL value, Active-Inference preference priors — all value-as-K-content, §5.) ∎

> **Strongest surviving alternative, stated honestly.** One *could* split K along the is/ought line into a descriptive model and a normative value-structure, yielding 3 internal objects. We reject this because Definition 1 keys objecthood to *computational capability*, and both are the same capability (inductive generalization over the input space); descriptive-vs-normative is a *content type*, which Def. 1 excludes. If one instead keyed objecthood to *unique information content*, value would earn objecthood. The proposal's own rule is capability-based, so value folds into K. (For Mini Prometheus, requirements are central enough to deserve first-class *representational/organizational* status inside K — but that is not a new primitive.)

**Theorem 7 (Constraint / feasibility reduces).** A constraint is a predicate partitioning the space into valid/invalid — i.e., a function over the input space, which is K's capability; the externally-binding constraints (physical law, regulation) are properties of R perceived into C/K. In a generative K, infeasible regions are exactly the zero-support / zero-probability regions: *the model's support is the constraint representation.* Hardness-vs-softness and explicit-vs-implicit are representational choices, which Def. 1 forbids as grounds for a primitive. *Therefore Constraint reduces to K (feasibility content / model support) and R (given laws); a primitive "Constraint object" is rejected* — notwithstanding its centrality to manufacturing (§7). ∎

**Theorem 8 (Task Model / Plan / Intent / Workspace reduces).** A plan is a prospective action sequence under construction; an intent is a current goal binding; a task decomposition/workspace is the scaffold of the current problem. All are *situation-indexed content being computed now* — inhabitants of C, possibly *structured* (e.g., a goal-frame stack). Structure over C is an organizational principle (§6), not a capability beyond C's. *Therefore these reduce to C; primitive "Task Model / Plan / Workspace objects" are rejected.* (SOAR's goal stack and blackboards are precisely structured C, §5.4–5.7.) ∎

**Theorem 9 (Episodic / specific memory reduces — the hardest case).** Exact recall of particular past instances looks irreducible: a generalizer compresses and loses instance fidelity, so episodic recall is not a capability of a *generalizing* K, and it is durable so not C. The escape is that "memorize" and "generalize" are the two ends of one axis (the bias–variance / compression spectrum) of a *single* capability: holding durable structure indexed over the input space. A lookup table of instances and a smooth generalizer are the extreme settings of one knob; distinguishing them as separate objects is a *representational* difference, excluded by Def. 1. Operationally, raw-instance stores function as (a) low-generalization content within K, or (b) a *replay buffer* — an *implementation artifact* for training K (§6.6). *Therefore episodic memory reduces to K (as memorized content) or to an implementation artifact; a primitive "Episodic object" is rejected.* (Cf. SOAR/ACT-R declarative+episodic memory as one durable tier, §5.4–5.5.) ∎

**Result of reduction.** Candidates 4–8 and the internal part of 1 all reduce. The fixed point is **{R; C, K}** — and, by Theorems 6–9, *adding* any of Objective, Constraint, Task Model, Plan, or Episodic as a primitive would violate minimality.

---

## 5. Step 7 — Comparison against eleven frameworks

Every framework maps onto {R; C, K}; several independently *prove* parts of the reduction. Notation: R = environment/ground, C = situation state, K = durable generalizing structure.

**5.1 Active Inference (Friston).** C = the variational belief (posterior over hidden states); K = the generative model (parameters), with *preferences encoded as priors in K*. Perception/action/learning minimize free energy. Two internal objects exactly; *preference-as-K-content* directly confirms Theorem 6.

**5.2 Dreamer.** C = the latent recurrent state sₜ (RSSM); K = world-model + actor + critic parameters. The replay buffer is an implementation artifact for training K (confirms Theorem 9). Exact {R; C, K}.

**5.3 MuZero.** C = the hidden state from the representation function (per situation) + the transient search tree; K = representation/dynamics/prediction networks; planning (MCTS) is an *operator*, the tree is structured C. Decisively, MuZero has **no observation model** yet is fully adaptive — empirical proof that K need not be a generative world model (Theorem 3 / §6.2): the primitive is *generalizing structure*, not "World Model."

**5.4 SOAR.** C = working memory, *including the goal stack* (the "Task Model"); K = production memory + semantic + episodic memory. Confirms Theorem 8 (goal stack ⊂ C) and Theorem 9 (episodic ⊂ durable tier). The decision procedure is an operator.

**5.5 ACT-R.** C = buffers (incl. goal buffer); K = declarative chunks + procedural productions, with *utilities/activations as value content in K*. Confirms Theorems 6 and 8.

**5.6 Global Workspace Theory.** The "workspace" is a *broadcast/selection mechanism* over C (which content becomes globally available), not a carrier with a new capability. Reduces to C + an operator/mechanism. No new object.

**5.7 Blackboard architectures.** The blackboard is a shared, structured C (the current problem state); knowledge sources are operators reading K. An organizational principle, not a primitive. No new object.

**5.8 MBSE (Model-Based Systems Engineering).** Requirements, system models, the V-model: *engineering artifacts in R* plus *process organizational principles*. Confirms §6.4 (artifacts ⊂ R) and §7. Contributes no cognitive object.

**5.9 Digital-Twin theory.** A continuously-synchronized external generative model of a physical asset — i.e., **K with external substrate** living in R. Shows K may be physically realized outside the agent (a substrate/organization fact) but adds no new object type.

**5.10 Control Theory.** R = plant; C = the state estimate x̂ (observer/Kalman state); K = the plant model + controller. Two classical theorems are independent proofs of our core split: the **separation principle** (estimator and controller/model are distinct and both required) ⇒ C ≠ K and both necessary; the **internal model principle** (to regulate a class of signals the controller must *contain a model* of their dynamics) ⇒ K is necessary, not optional. Control theory thus pre-proves Theorems 1–3 in the linear case.

**5.11 Reinforcement Learning.** R = MDP/POMDP; C = state/belief (or RNN hidden state); K = value/policy/(optional model) parameters. Reward is a signal from R; value is K-content (Theorem 6). *Model-free* RL — adaptive with no transition model — again shows generative modeling is a *content choice within K*, not a separate necessary object. Replay buffer = artifact (Theorem 9).

**Synthesis.** No framework requires a fourth object. Control Theory and RL prove C and K are each necessary and distinct; MuZero and model-free RL prove "World Model" is too narrow for the primitive; SOAR/ACT-R/Blackboard/GWT prove Task Model/Workspace/Goal are structured-C or operators; MBSE/Digital-Twin prove artifacts are R (possibly hosting external K). The convergence is total.

---

## 6. Step 6 — The strict taxonomy (why most "objects" are not objects)

The pervasive error is mistaking the next five categories for objects.

- **Computational objects** (carriers with a unique capability): **C** (situation state), **K** (generalizing structure). With **R** (Reality) as the **non-representational ground**. *These three, no more.*
- **Computational operators** (functions that read/write objects): perception (R→C), inference (C×K→C), learning (C×K→K), execution (C→R). Evaluation, planning, retrieval, prediction are typed/compound operators. *Not objects.*
- **Computational mechanisms** (control/parameterization of operators): attention/selection, precision-weighting, credit assignment, arbitration, global broadcast. *Not objects.*
- **Organizational principles** (patterns over objects/operators): goal-frame stacks, task decomposition, blackboards/workspaces, estimator/controller separation, hierarchy, modularity, the internal-vs-external substrate boundary for K. *Not objects.*
- **Representational structures** (encodings of C and K): graphs, vectors, symbols, probability distributions, tensors, neural weights. *Not objects.*
- **Implementation artifacts** (engineering scaffolding): replay buffers, caches, episode logs, CAD files on disk, containers/verifiers (e.g. Velith's), digital-twin sync services. Some live in R. *Not objects.*

Task Model, Workspace, Blackboard, Scratchpad → organizational principles over **C**. Constraint, Objective, Value, Requirement, Plan → content within **K**/**C** or artifacts/signals in **R**. Episodic store → **K**-content or implementation artifact.

---

## 7. Step 8 — Verdict on the proposed ontology {Reality, Cognitive State, World Model}

**Cardinality: correct.** Three is the proven minimum (Theorem 5). The proposal is not bloated.

**Two specification errors:**

1. **Reality is mis-typed.** Listed alongside Cognitive State and World Model as if a peer internal object, Reality is in fact the *ground/boundary* (Theorem 4). The category error has practical cost: it invites treating engineering artifacts (CAD, twins, plants) — which are *configurations of R* — as if they were cognitive primitives, the precise mistake that breeds spurious "Artifact/Constraint/Twin objects." Keep R in the system theory, but label it the ground, categorically apart from C and K.

2. **World Model is over-specified.** The proven primitive is **K = durable generalizing structure**: a carrier whose capability is inductive generalization to unobserved inputs. A *generative* world model is K's dominant and (for manufacturing) most valuable instance, but value functions, policies, learned constraints, and design knowledge are equally K. Naming the instance "World Model" as the primitive wrongly suggests that value, policy, and constraint need their *own* objects. Generalize the name to **K (Model / Generalizing Structure)**; let the generative world model be its principal content.

**Completeness: complete.** With those corrections, nothing is missing. Every plausible fourth object — Objective, Constraint, Task Model, Plan, Episodic — was shown to reduce (Theorems 6–9). The only intellectually live alternative is the is/ought split of K into descriptive-model and value (4 total); it is rejected under the proposal's *capability*-based definition and would be admissible only under an *information-content*-based one.

**Minimal corrected ontology:**

> **𝛀 = ⟨ R (ground) ; C (situation state) , K (generalizing structure) ⟩**
> C = the situation-indexed sufficient statistic of history (the running estimate that drives action; capability: track the partially-hidden present).
> K = the situation-invariant durable structure (capability: inductive generalization to unobserved inputs; houses generative model, value, policy, and feasibility/constraint as content).
> R = the external referent (boundary condition; hosts engineering artifacts and may host externalized K, e.g. a digital twin).

---

## 8. Scaling toward Mini Prometheus — without manufacturing-specific primitives

The corrected ontology generalizes to autonomous engineering precisely *because* it added nothing engineering-specific:

- A **product requirement / natural-language idea** = an artifact in **R**, internalized as a current specification in **C** and durable design knowledge in **K**. No "Requirement object."
- **Physical, geometric, manufacturability, and safety constraints** = feasibility content in **K** (the support / hard predicates of the generative design model) plus given laws in **R**. No "Constraint object" — yet fully first-class as *content*, satisfying the program's constraint-preservation goal.
- A **CAD model / simulator / digital twin** = a configuration of **R**, frequently an *externalized K* the agent queries as an oracle (act-then-perceive). No new object.
- The **design-in-progress / BOM / process plan** = structured **C** (the current situation state of the engineering task). No "Task Model object."
- **Verification** (Velith's containerized execution) = an operator (execution→perception) whose verdict updates C and consolidates into K; the container is an implementation artifact in R. No new object.

Thus the smallest theory that is universally valid for cognition is *also* the natural substrate for an AI manufacturing brain: requirements, constraints, simulations, and verification map onto R, C, K without a single domain-specific primitive — exactly the implementation-independence the program requires.

---

## 9. Conclusion

The mathematically minimal ontology of a universal adaptive cognitive agent is **three**: the ground **R**, and two internal objects **C** (situation state) and **K** (generalizing structure), distinguished by the irreducible parameters-vs-state / stability–plasticity impossibility and individually forced by partial observability (C), the adaptivity requirement (K), and embeddedness (R). The proposed {Reality, Cognitive State, World Model} is **minimal in number but mis-specified in two places**: Reality should be re-typed as the ground, and World Model should be generalized to K. No object is missing. Objective, Constraint, Task Model, Plan, and Episodic memory are *not* primitives and must not be added — they are content in K/C, signals/artifacts in R, or operators, mechanisms, organizational principles, and implementation artifacts. The result holds implementation-independently and scales to Mini Prometheus with zero manufacturing-specific primitives.
