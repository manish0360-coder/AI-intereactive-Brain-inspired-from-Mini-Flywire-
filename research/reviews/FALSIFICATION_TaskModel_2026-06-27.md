# A Falsification of the Task-Model Hypothesis for Engineering-Capable Cognition

**Adversarial theoretical review — Scientific Review Council mode**
**Date:** 2026-06-27
**Mandate:** Destroy the hypothesis where possible. Keep only concepts whose removal creates a genuine computational impossibility, not merely a loss of efficiency.
**Status of output:** Theoretical result, implementation-independent. Not an implementation proposal.

---

## Abstract

We subject the MiniFlyWire working hypothesis — *that a universal cognitive engine solves engineering tasks by constructing a transient internal **Task Model** while continuously synchronizing with external engineering artifacts* — to adversarial falsification. We prove (Theorem 1) that the Task Model is not a primitive representational object: it is definitionally identical to a goal-scoped frame of the Cognitive State, and its removal as a primitive produces no computational impossibility. We prove (Theorem 2) that a suitably *scoped* Cognitive State is sufficient for the entire internal task representation. We then attack the ontology itself (Theorem 3): we show that engineering artifacts (CAD kernels, digital twins, simulators, Velith-style containerized verifiers) cannot be cleanly typed under the current trichotomy {Reality, Cognitive State, World Model}, but that the apparent need for a *new object* collapses under the project's own minimality rule — artifacts reduce to Reality, including Reality's active/computational processes, and are reachable by Perception and Execution alone. We survey eleven prior frameworks and find that every component of the hypothesis is already instantiated in at least one, and that the external-artifact question is exactly the Distributed-Cognition/Extended-Mind problem. We then reduce the surviving theory to its minimal core: **two representational objects** (Cognitive State, World Model) over **one non-representational ground** (Reality), closed under **four operators** (Perception, Inference, Execution, Learning), with *Evaluation* and *Retrieval* demoted to typed special cases of Inference. We close with the precise verdict: the *universal-cognition* claim survives and is strengthened; the *Task Model* and the *engineering-specific object* both die.

---

## 1. Object of falsification

**Hypothesis H (as stated).** A universal cognitive engine solves engineering tasks by constructing a transient internal Task Model while continuously synchronizing with external engineering artifacts (CAD, digital twins, blueprints, simulations, manufacturing plans).

**Declared ontology.** Representational/ground objects {Reality (R), Cognitive State (C), Structured Generative World Model (W)}; operators {Perception, Inference, Evaluation, Learning, Execution}; the reduction claim *engineering = universal cognition over engineering knowledge* (no engineering-specific operators).

**Declared mechanism.** Intent → Inference interprets/decomposes/retrieves from W → constructs transient Task Model (T) → Inference+Evaluation iteratively modify T → Learning extracts durable knowledge into W. **Open question:** is T wholly inside C, or split between internal cognition and external artifacts?

**Adversarial standard (the project's own rule).** A concept is retained only if its removal causes a *computational impossibility*, not merely reduced efficiency. We hold every clause of H to this bar.

---

## 2. Definitions

To argue rigorously we fix the type discipline the hypothesis leaves informal.

**Definition 1 (Stores).** A *store* is a typed, addressable container of representational content. The ontology names three candidate stores: R (the external world; the territory, not a held representation), C (transient internal content), W (durable internal content).

**Definition 2 (Operator).** An *operator* is a total or partial function over stores, typed by which store(s) it reads and which it writes. Operators are the only things that change store contents.

**Definition 3 (Representational object).** A store (or sub-store) qualifies as a distinct representational object only if it possesses at least one of: (i) a distinct *type signature*, (ii) a distinct *invariant/lifecycle* not derivable from another object's, or (iii) a *capability* (a class of operation it supports that no other object supports). Absent all three, it is not an object; it is a *view*, *frame*, or *organizational principle* over an existing object.

**Definition 4 (Capability of W — generativity).** W is *generative of Reality*: it supports a sampling/prediction operation `predict: W × query → expected observation`. This is the capability that distinguishes a *world model* from an arbitrary buffer.

**Definition 5 (Minimality).** A theory T₁ *dominates* T₂ if T₁ has strictly fewer primitives and explains the same phenomena with no loss of computational power (only, at most, loss of efficiency). The minimal theory is the fixed point of dominance.

---

## 3. Task 1 & 2 — The Task Model is not a primitive; Cognitive State suffices

### 3.1 The collapse

The ontology already defines C as *"the active subset of information required for ongoing cognition, including current beliefs, goals, hypotheses, working memory, active plans, and state-specific uncertainty."* The hypothesis defines T as the transient structure holding the decomposed task, retrieved knowledge, and intermediate states, created and mutated during the task. Compare the type signatures: every field of T (goal, decomposition, retrieved knowledge, candidate states, intermediate evaluations, task-local uncertainty) is, term for term, a permitted inhabitant of C.

**Lemma 1 (No distinct type).** T has no field whose type is not already admissible in C. *Proof.* By enumeration of T's contents against C's definition; each is a belief, goal, plan, hypothesis, or uncertainty value — all already typed into C. ∎

**Lemma 2 (No distinct operator).** No operator acts on T that does not already act on C. T is created by Inference, mutated by Inference and Evaluation, and drained by Learning — exactly the operators that act on C. No operator is private to T. ∎

**Lemma 3 (No distinct capability).** T supports no operation C cannot. It is neither generative-of-Reality (that is W's capability, Def. 4) nor does it expose any operation absent from C. ∎

**Theorem 1 (Task Model is not a representational object).** By Def. 3 and Lemmas 1–3, T satisfies none of (i)–(iii). Therefore T is not a primitive representational object. It is a **goal-scoped frame of C** — an organizational principle, not an object. ∎

### 3.2 The one real residue: timescale, not type

The strongest defense of T is *temporal*: a task spans many cognitive moments yet is not durable knowledge, so T appears to occupy a "missing middle" timescale between moment-to-moment C and durable W.

**Lemma 4 (Timescale is a property, not a type).** Retention horizon is a scalar property attachable to content within a store (cf. the ontology's own *temporal validity* property). A three-band retention spectrum {moment, task, durable} is representable as a property over content, or as nested *frames* within C, without introducing a new object type. *Proof.* A frame stack `C = [f₀ ⊃ f₁ ⊃ … ]` where pushing a frame on task-entry and popping it on task-exit yields task-scoped retention using only C's machinery (this is the SOAR goal stack; §6.2). ∎

**Corollary.** What is genuinely *required* is not a Task-Model object but that **C be structured to support nested goal-scoped frames**. That requirement is an organizational constraint on C, satisfied without a new primitive.

### 3.3 Theorem 2 — Cognitive State sufficiency

**Theorem 2.** A scoped Cognitive State C (Lemma 4) is sufficient to carry the entire *internal* task representation; the addition of T adds no computational power. *Proof.* Construct a simulation: let C′ = C augmented with a frame stack. Any computation H performs via T — create(T), modify(T) by Inference/Evaluation, drain(T) by Learning — is reproduced by push-frame(C′), the identical Inference/Evaluation steps over the top frame, and Learning reading the top frame. The mapping T ↦ top-frame(C′) is total and operation-preserving. Hence T is eliminable with no loss of power; by Def. 5, the T-free theory dominates. ∎

**Verdict, Tasks 1–2:** *Task Model — DESTROYED as a primitive.* It survives only as a name for a scoped frame of Cognitive State. Cognitive State alone (scoped) is sufficient internally.

---

## 4. Task 3 — Does engineering force a new object? The external-artifact attack

This is the only place H can still die *or* the ontology can. The open question — is T split between internal cognition and external artifacts — is sharper than it looks: it is a question about whether **CAD models, digital twins, simulators, and verifiers are Reality, or are externalized cognitive stores.**

### 4.1 The mis-typing

Engineering artifacts have a dual nature the current trichotomy cannot express cleanly:

- They are **external** (perceived and modified — so, prima facie, R).
- They are **representational and often generative** (a CAD kernel enforces geometric constraints; a digital twin is a continuously-synchronized generative model of a physical system; a simulator computes dynamics; Velith's containerized verifier is the *authoritative* source of a pass/fail verdict). In capability terms (Def. 4), a simulator and a digital twin are *generative of Reality* — they have W's defining capability, but they live outside the agent.

So the ontology offers two incompatible readings:

- **(α) Sharp boundary.** Artifacts ∈ R. Perception maps artifact→C; Execution maps C→artifact; "synchronization" is just the ordinary perception/action loop. Clean, but it makes the agent's *reliance* on the artifact "mere efficiency."
- **(β) Distributed boundary.** Artifacts are *externalized* C or W — the representational stores have external substrate. This matches engineering reality (the agent provably does **not** internalize the CAD kernel's constraint solver or the simulator's PDE solution) but it punctures the clean internal/external partition.

### 4.2 The decisive test

**Definition 6 (Internalizability).** An artifact A is *internalizable* if the agent can, within its resource bounds, reconstruct A's content and A's computational service inside C/W with no loss of capability.

**Theorem 3 (Dichotomy).** Exactly one of the following holds for each artifact A:
1. **A is internalizable** ⇒ A is an external *cache* of re-derivable content. Its removal costs efficiency, not capability ⇒ by the project's minimality rule A is **not a computationally necessary object**; it is R used as scratch space. No new object.
2. **A is not internalizable** (e.g. a physics simulator, a CAD geometric-constraint kernel, a digital twin holding live state, a Velith verifier executing hidden tests) ⇒ A performs computation the agent cannot replicate. A is then an **active process in the world**, an *oracle*.

*Proof.* Internalizability is decidable in principle relative to the agent's resource bound; the two cases are its complement. ∎

### 4.3 The oracle reduces to Reality — no new object

The natural move in case (2) is to declare a new object: *External Computational Artifact*. We block it.

**Lemma 5 (Oracles are Reality).** Reality already contains active processes that compute their own consequences: release a beam and gravity "computes" its deflection; the agent never internalizes the PDE, it *acts* (loads the beam) and *perceives* (measures deflection). A simulator, a CAD kernel, and a Velith container are processes of exactly this kind — Reality that responds to inputs with observable outputs. *Proof.* An oracle call is `Execution: write query into R` followed by `Perception: read result from R`. Both operators already exist; R is already defined to host processes whose dynamics the agent does not internalize. Hence the oracle is subsumed by (R, Perception, Execution) with **no new operator and no new object.** ∎

**Theorem 4 (Engineering adds no representational object).** Combining Theorem 3 and Lemma 5: internalizable artifacts are R-as-cache (efficiency only); non-internalizable artifacts are R-as-oracle, reachable by Execution+Perception. Neither introduces a representational object beyond {C, W}, and neither introduces an operator beyond the four of §5. ∎

### 4.4 What *does* survive at the boundary

Theorem 4 kills the new *object*. It does **not** kill a genuine *organizational* fact: under reading (β), the stores C and W may be *physically realized in R* (the digital twin **is** an externalized W; the engineering notebook **is** externalized C). This is real and consequential, but it is a statement about *substrate*, not about object inventory. It changes the count of object *types* by zero. It is the Extended-Mind thesis (§6.6), re-derived.

**Resolution of H's open question.** The "is the Task Model split internal/external?" question is **ill-posed at the object level**. Under (α) the task representation is wholly internal (C) and artifacts are R; under (β) it is C with external substrate. In *neither* reading does a Task Model object exist, and in *neither* does an engineering-specific object exist. The question dissolves into a substrate choice (α vs β), which is an organizational principle to be decided empirically, not a new primitive.

---

## 5. Tasks 5 & 7 — The minimal surviving theory

We now derive the fixed point under Def. 5.

### 5.1 Representational objects

- **Reality (R)** — the external ground. *Not* a representation the agent holds; the referent of Perception/Execution. Necessary: without R, Perception and Execution are undefined. **KEEP** (as non-representational ground).
- **World Model (W)** — the only object with the generativity capability (Def. 4): it can predict/sample Reality. Necessary: without it, Inference is reactive, not model-based, and the central program (model construction) is vacuous. **KEEP.**
- **Cognitive State (C)** — the transient working/valuational store, scoped (Lemma 4). Necessary: it is the only store the agent reads/writes directly and the sole interface between R, W, and the operators. **KEEP.**
- **Task Model (T)** — eliminated (Theorem 1).
- **Engineering-specific object** — never introduced (Theorem 4).

**Why W does not also collapse into C (parity check).** One must apply the Task-Model knife consistently: is W merely "long-retention C"? No. W has a *distinct capability* (generativity, Def. 4) that C lacks; T had no distinct capability. The asymmetry is principled: capability, not timescale, is the survival criterion. W survives; T does not.

### 5.2 Operators — the store-transition algebra

Type every operator by (read-set → write-set) over {R, C, W}, given the architectural constraint that the agent touches R only through Perception/Execution and touches W only through C:

| Operator | Signature | Irreducible role |
|---|---|---|
| Perception | R → C | sole inflow of external state |
| Execution | C → R | sole outflow to the world (incl. oracle queries) |
| Inference | (C × W) → C | sole internal transformation; reads W (**Retrieval ⊂ Inference**), writes C; value-typed Inference is **Evaluation ⊂ Inference** |
| Learning | (C × W) → W | sole writer of durable, generalization-constrained knowledge |

**Theorem 5 (Four is minimal, and degeneracy below four).**
*(a) Demotions.* **Evaluation** produces a value/ordering over states; that is an Inference whose codomain is a value type — removing it as a primitive loses no power (fold "evaluate x" into "infer value(x)"). **Retrieval** (W→C read) is the W-read already inside Inference's signature. Both are typed special cases, not primitives. *(Note: the original ontology listed Evaluation as a* mechanism, *not an operator; promoting it to operator in H was a regression we hereby reverse.)*
*(b) Irreducibility of the four.* Perception and Execution cannot merge (opposite directions across the R-boundary). Inference and Learning cannot merge without erasing the C/W codomain distinction — and that distinction carries a different *correctness criterion* (Inference must fit the moment; Learning must *generalize*), so the merge changes the theory's content, not just its packaging.
*(c) No collapse to one.* A single "universal transform" with full read/write over all stores is formally expressible but **degenerate**: it destroys operator isolation, on which the entire MiniFlyWire methodology (ablation, intervention, causal attribution) depends. Minimality is bounded below by *testability*: the smallest theory that remains experimentally falsifiable has four typed operators, not one. ∎

### 5.3 The minimal theory (statement)

> **Σ = ⟨ R ; {C, W} ; {Perception: R→C, Execution: C→R, Inference: C×W→C, Learning: C×W→W} ⟩**, with C scoped by a goal-frame stack, W the unique generative-of-Reality store, Evaluation and Retrieval as typed restrictions of Inference, and engineering artifacts as configurations of R (cache when internalizable, oracle when not) reached by Execution+Perception.

Everything in H that is not in Σ has been shown eliminable without computational impossibility.

---

## 6. Task 4 — Prior art: every component is already instantiated

The hypothesis claims novelty it does not possess. Each framework below already realizes part of Σ or of H; collectively they leave H with no un-precedented computational object.

**6.1 Active Inference (Friston).** C = variational posterior over hidden states; W = generative model; Perception = inference minimizing prediction error; Execution = active inference minimizing expected free energy; Learning = updating generative parameters. Σ's four-operator algebra over a generative W is essentially Active Inference re-notated. The "Task Model" is just the current posterior conditioned on a goal — i.e., scoped C. *Consequence: H's universal-operators-over-a-generative-model claim is not new.*

**6.2 SOAR.** Working memory = C; long-term (procedural+declarative) memory = W; the **problem space / goal stack** is an explicit *substructure of working memory*. SOAR has demonstrated for four decades that a task workspace is a working-memory frame, not a separate store. *Consequence: empirical refutation of Task-Model-as-object (Theorem 1, Lemma 4).*

**6.3 ACT-R.** Buffers + declarative/procedural memory; goal buffer = scoped C. Same refutation as SOAR; additionally shows value/utility (Evaluation) implemented as a *property over productions*, not a separate operator — supporting Evaluation⊂Inference (Theorem 5a).

**6.4 Dreamer / model-based RL.** Learns W, "imagines" rollouts (Inference over W), acts. Latent state = C. *Consequence: the internal model-construction loop is solved prior art.*

**6.5 Blackboard architectures.** A shared workspace where knowledge sources post partial solutions = the "task workspace." Crucially the blackboard is an *organizational principle* (a shared C), and is frequently realized **externally/shared** — pre-figuring the external-artifact question as a workspace pattern, not an object. *Consequence: supports Theorem 1 and frames §4 as old.*

**6.6 Distributed Cognition (Hutchins) / Extended Mind (Clark & Chalmers).** Directly theorizes external artifacts (instruments, charts, notebooks, CAD) as constituents of the cognitive system. This is *exactly* reading (β) of §4. *Consequence: the external-artifact "split" is not novel; it is the Extended-Mind thesis. It also warns that the clean R/C/W boundary is a modeling choice, not a fact.*

**6.7 Digital-Twin theory.** A continuously-synchronized external generative model of a physical system — i.e., an externalized W (Def. 4 capability, external substrate). *Consequence: "synchronizing with external artifacts" = maintaining an external W; an instance of (β), not a new object.*

**6.8 MBSE / INCOSE / NASA Systems Engineering.** Define requirements, V-model verification, and system models as *artifacts and processes*. They specify the structure of R (engineering artifacts and workflows) and say nothing about cognitive operators. *Consequence: evidence about R, zero new cognitive objects; importing them into the cognitive ontology is a category error (§7).*

**6.9 EDA (Electronic Design Automation).** Tool flows where external solvers (placement, routing, timing, DRC) perform non-internalizable computation the designer queries. *Consequence: textbook instance of Lemma 5 (oracle ∈ R via Execution+Perception).*

**6.10 SpaceX / Tesla engineering & manufacturing workflows.** Rapid build-test-iterate and production-line process control. These are *organizational principles* (fast loops over R) and *artifact ecosystems*, not cognitive theories. *Consequence: they exemplify Σ's perceive/act/learn loop applied to engineering R; they add no object or operator.*

**6.11 Cognitive Load Theory.** A theory of capacity limits on C (working-memory bandwidth). *Consequence: it constrains C's size, motivating offloading to R — i.e., it *explains why* (β) is attractive — but introduces no object.*

**Summary of 6:** Active Inference + SOAR/ACT-R + Dreamer cover the internal loop of H; Blackboard + Distributed Cognition + Digital-Twin + EDA cover the external-artifact loop; MBSE/INCOSE/NASA/SpaceX/Tesla supply only R-structure and organizational principles. No surveyed framework requires — and several explicitly dissolve — the Task Model and the engineering-specific object.

---

## 7. Task 6 — The four distinctions (a strict taxonomy)

Confusion among these four is the root cause of the Task-Model error. We fix the taxonomy:

- **Computational operators** — functions that transform stores: *Perception, Inference, Execution, Learning*. (Evaluation, Retrieval = typed restrictions of Inference.) Test: "does removing it make a store-to-store transition impossible?"
- **Representational objects** — stores with a distinct type/invariant/capability: *Cognitive State, World Model* (with *Reality* as the non-representational ground). Test: Def. 3.
- **Organizational principles** — patterns *over* objects/operators that improve structure, scope, or efficiency but add no primitive: *Task Model (goal frame of C), goal stacks, blackboards, the internal/external substrate boundary (α/β), verification-first control (Velith), build-test-iterate loops.* Test: "does removing it cost only efficiency/clarity?" If yes → here, not above.
- **Engineering artifacts** — configurations of Reality, some of which are externalized representations: *CAD models, digital twins, blueprints, simulations, manufacturing plans, test harnesses.* Test: "is it in the world, perceivable and actable-upon?" If yes → R, never a cognitive primitive.

The Task Model was mis-filed as a representational object; it belongs in *organizational principles*. Engineering artifacts were mis-filed as a candidate cognitive object; they belong in R.

---

## 8. Verdict

**On the hypothesis as a whole — PARTIALLY FALSIFIED.**

- *"Transient internal Task Model"* — **FALSIFIED.** Not a primitive object (Theorem 1); reducible to a goal-scoped frame of Cognitive State (Theorem 2); refuted empirically by SOAR/ACT-R.
- *"Synchronizing with external engineering artifacts" as evidence for a split object* — **FALSIFIED.** Artifacts are Reality: cache if internalizable (efficiency only), oracle if not (Execution+Perception, Lemma 5). No new object (Theorem 4). The internal/external "split" is a substrate choice (Extended-Mind), not an object (§4.4).
- *"Engineering = universal cognition over engineering knowledge; no engineering-specific operators"* — **SURVIVES, STRENGTHENED.** Not only are there no engineering-specific operators, there are no engineering-specific representational objects either (Theorem 4).
- *Operator set of five* — **REDUCED to four.** Evaluation is demoted to typed Inference (reversing a regression from the prior ontology, where it was correctly a mechanism); Retrieval is the W-read inside Inference.

**The minimal surviving theory** is Σ (§5.3): one ground R, two objects {C, W}, four operators {Perception, Inference, Execution, Learning}. This is the smallest implementation-independent theory consistent with the evidence and the project's own minimality rule.

**What this means for the program.** The result is *good news constrained*: the universal-cognition thesis that justifies treating MiniFlyWire/Noetica as a single engine over engineering knowledge is intact and now sharper. But the ontology should (i) delete Task Model as an object and re-enter it as an organizational principle (scoped Cognitive State), (ii) demote Evaluation to a mechanism/typed Inference, (iii) name Retrieval explicitly as Inference's W-read, and (iv) make a deliberate, documented α/β decision about whether C and W may have external substrate — because Velith's verification-first design and Digital-Twin synchronization already commit the program to reading (β) in practice, while the current ontology is written as (α). That last inconsistency, not the Task Model, is the live theoretical risk.
