# Computational Theory of Artificial Cognition

Status: Draft

Version: v0.1

---

## 1. Purpose

The purpose of this document is to establish the computational theory underlying the MiniFlyWire research laboratory.

Where the ontology defines the fundamental computational objects that constitute an artificial cognitive system, the computational theory explains how those objects interact over time to produce adaptive cognition.

The central objective is not to prescribe a specific implementation, learning algorithm, or software architecture. Instead, this theory seeks to identify the fundamental computational processes that transform observations into internal understanding, decisions, and progressively improved world models.

This document develops the hypothesis that artificial cognition is governed by two interacting computational processes operating on distinct computational objects.

The first process continuously updates the **Cognitive State**, producing the agent's current understanding of its environment, active goals, predictions, plans, and reasoning during an ongoing cognitive episode.

The second process continuously updates the **Structured Generative World Model**, transforming accumulated experience into persistent knowledge through learning, abstraction, consolidation, and model refinement.

This distinction is defined by the computational object being modified rather than by execution speed, implementation technology, or learning algorithm. Consequently, the proposed computational theory remains independent of symbolic systems, neural networks, probabilistic models, reinforcement learning, or future computational paradigms.

The remainder of this document formalizes these computational processes, specifies the interactions between computational objects and operators, and provides a theoretical foundation for experimentally evaluating cognitive mechanisms within the MiniFlyWire laboratory.


## 2. Computational Foundations

### 2.1 Three Representational Domains

The computational theory proposed by MiniFlyWire is founded on the principle that all artificial cognition operates by constructing, transforming, and refining internal representations of information.

Rather than viewing cognition as a collection of independent modules, this theory views cognition as a continuous flow of representations between a small number of fundamental computational domains.

This theory proposes that three representational domains are both necessary and sufficient for engineering-capable artificial cognition.

#### Reality

Reality is the external environment with which the cognitive system interacts.

It includes physical objects, observations, sensors, external tools, simulation environments, documents, CAD models, notebooks, and every external artifact that may influence or be modified by the cognitive system.

Reality exists independently of the cognitive system and provides the observations from which cognition begins.

---

#### Cognitive State

The Cognitive State contains the agent's transient internal representations during an active cognitive episode.

It represents the agent's current beliefs, active goals, working memory, hypotheses, predictions, simulations, plans, uncertainties, and other temporary structures required for ongoing reasoning.

The Cognitive State changes continuously as new observations are perceived, inferences are generated, and decisions are evaluated.

Unlike the World Model, the Cognitive State is not intended to permanently store knowledge.

Its purpose is to support immediate cognition.

---

#### Structured Generative World Model

The Structured Generative World Model contains the persistent internal representations that the agent has learned about itself and its environment.

These representations include entities, relations, constraints, transitions, abstractions, causal structure, engineering knowledge, and other generalized knowledge accumulated through experience.

The World Model changes only through learning and serves as the long-term foundation from which future cognition is generated.

Unlike the Cognitive State, the World Model is intended to preserve knowledge across cognitive episodes.

---

These three representational domains establish the complete computational space in which cognition operates.

Reality provides information that is perceived.

The Cognitive State actively constructs and manipulates temporary representations.

The Structured Generative World Model provides persistent knowledge that guides reasoning and is refined through learning.

The remainder of this computational theory defines the transformations that continuously exchange information between these three domains to produce adaptive cognition.


### 2.2 Fundamental Computational Functions

The three representational domains defined in the previous section do not change spontaneously. Every modification of Reality, the Cognitive State, or the Structured Generative World Model occurs through a small set of fundamental computational functions.

MiniFlyWire proposes that five computational functions are both necessary and sufficient to explain adaptive artificial cognition. These functions are defined by their computational role rather than by any specific algorithm or implementation.

---

#### Perception

Perception transforms observations from Reality into internal representations within the Cognitive State.

Its purpose is to construct the agent's current understanding of the external environment by integrating sensory information, external artifacts, and other observable evidence.

Perception is the primary entry point through which Reality influences cognition.

---

#### Inference

Inference transforms the current Cognitive State by utilizing knowledge stored within the Structured Generative World Model.

Its purpose is to generate predictions, explanations, simulations, plans, hypotheses, retrieved knowledge, and other internally constructed representations required for reasoning and decision-making.

Inference enables the cognitive system to extend beyond immediate observations by constructing representations of possible, hypothetical, or future situations.

---

#### Evaluation

Evaluation assesses the results of cognitive processing relative to observations, goals, constraints, values, or expected outcomes.

Its purpose is to compute evaluative signals indicating the significance, quality, correctness, or usefulness of cognitive results.

Evaluation does not directly modify the Structured Generative World Model. Instead, it generates the information required for adaptive learning and informed decision-making.

Evaluation therefore serves as the computational bridge between cognition and adaptation.

---

#### Learning

Learning transforms the Structured Generative World Model using evaluative signals generated through experience.

Its purpose is to consolidate new knowledge, refine existing knowledge, modify causal structure, improve predictive capability, strengthen or weaken abstractions, and preserve knowledge across future cognitive episodes.

Unlike the Cognitive State, which supports immediate cognition, the World Model changes only through Learning.

---

#### Execution

Execution transforms Reality by applying decisions generated during cognition.

Execution includes both physical actions affecting the external environment and epistemic actions that modify external cognitive artifacts, including writing notes, constructing models, interacting with engineering software, performing simulations, or acquiring additional information.

Execution therefore closes the interaction loop between cognition and Reality while simultaneously generating new experience for future adaptation.

---

Together, these five computational functions define the minimal computational transformations required for adaptive cognition.

Perception introduces information from Reality.

Inference constructs internal cognitive representations.

Evaluation determines the significance of those representations.

Learning transforms persistent knowledge.

Execution applies cognition back to Reality.

More specialized capabilities—including planning, reasoning, simulation, retrieval, attention, curiosity, credit assignment, and precision weighting—are not treated as independent computational functions. Instead, they are interpreted within this theory as mechanisms, strategies, or specialized instantiations of these five fundamental computational functions.


### 2.3 Computational Laws

The computational functions defined in the previous section operate under a small set of invariant principles that constrain the behavior of every cognitive system described by this theory.

Unlike implementation choices, these laws are intended to remain valid regardless of the learning algorithm, software architecture, or computational substrate used to realize the system.

---

#### Law 1 — Representational Locality

Every representation participating in cognition exists within exactly one representational domain: Reality, the Cognitive State, or the Structured Generative World Model.

Computational functions transform, transfer, or refine representations between these domains but do not create additional representational domains.

---

#### Law 2 — Controlled Information Acquisition

New information originating from the external environment enters the cognitive system only through Perception.

All subsequent cognitive processing operates on internal representations constructed from previously perceived information.

---

#### Law 3 — Persistent Knowledge Modification

Persistent knowledge changes only through Learning.

Inference, Evaluation, and Execution may modify the transient Cognitive State or Reality, but they do not directly alter the Structured Generative World Model.

---

#### Law 4 — Reality Interaction

Intentional modification of Reality occurs only through Execution.

Execution includes both physical interaction with the external environment and epistemic interaction with external cognitive artifacts, including simulation environments, engineering software, documents, and other external knowledge resources.

---

#### Law 5 — Adaptation Requires Evaluation

Learning requires evaluative signals generated by Evaluation.

Without an assessment of predictions, goals, constraints, values, observations, or outcomes, no principled adaptation of the Structured Generative World Model can occur.

---

Together, these computational laws define the invariant structure governing adaptive cognition within the MiniFlyWire theory.

Individual algorithms, architectures, and learning procedures may differ substantially, but every valid implementation must satisfy these invariants.




## 3. Computational Operators

## 4. Information Flow

## 5. Adaptation and Learning

## 6. Computational Invariants

## 7. Open Questions