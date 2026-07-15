# Canonical Computational Specification of Mini Prometheus

**Status:** Canonical. Derived entirely from the frozen theory; reopens nothing.
**Date:** 2026-06-27
**Scope:** Implementation-independent specification of the nine runtime computational objects. Precise enough that two independent teams build interoperable implementations. Contains no software modules, folders, or APIs — only computational objects, their mathematics, and their contracts.

---

## 0. Shared preliminaries (frozen context, restated for self-containment)

**Ontology (frozen):** Reality `R` (external ground), Situation State `C`, Generalizing Structure `K`.
**Operators (frozen):** Perception `R→C`, Inference `C×K→C`, Evaluation `C→C`, Learning `C×K→K`, Execution `C→R`.
**Organization of K (frozen):** Composition, Structure-Preserving Transformation (SPT), Iteration.
**Substrate (frozen):** Typed Constraint Schemas.
**Architecture (frozen):** one engine; two regimes (inner confluent equilibrium fixpoint, outer directed manufacturing fixpoint); reversibility is the seam.

**Mathematical primitives used throughout (definitions, not new theory):**

- **Typed universe.** A collection of *types*; each type `τ` is a set of admissible values, tagged `continuous` or `discrete`.
- **Semiring.** `S = (S, ⊕, ⊗, 0̄, 1̄)`. Feasibility uses the Boolean semiring; cost/time the tropical `(min,+)`; likelihood the probability semiring. Every factor declares its semiring.
- **Support / admissible set.** For a factor `φ`, `supp(φ) = { x : φ(x) ≠ 0̄ }`.
- **Composition algebra (valuation algebra).** Factors sharing ports combine by `⊗` on overlapping assignments; ports are eliminated by `⊕`-marginalization. These are the frozen Composition operation made explicit.
- **SPT.** A satisfaction-preserving morphism from an abstract factor (schema) to a concrete factor on task ports; it preserves support and semiring value.
- **Reversibility tag.** A factor is `reversible` (relation used bidirectionally; inner confluent regime) or `irreversible` (directed transition; outer regime). Forced by the seam.

**Global invariants (bind every object below):**
- **G1 Single-writer stores.** `K` is written only by Learning; `R` is written only by Execution.
- **G2 Type safety.** Every factor's ports exist and match types; every port domain is a subset of its type.
- **G3 Narrowing monotonicity.** Within an inner fixpoint, port domains only shrink; factors are never deleted mid-fixpoint.
- **G4 Commit monotonicity.** Outer commit is irreversible: `uncommitted → committed`, never the reverse.
- **G5 Seam integrity.** No factor mixes reversible and irreversible relations; no confluent propagation crosses a committed transition.
- **G6 Parameters-vs-state.** Only *Verified* content may cross `C→K` (Learning); unverified transient content never enters `K`.

---

## 1. Situation State (C)

- **Purpose.** The transient working overlay of one task — from customer intent to realized artifact. It is where all computation happens; the only mutable internal workspace.
- **Mathematical meaning.** The current point/region in the lattice of admissible constraint-network conditions: a partial solution referencing `K`, tagged by a condition in `{perturbed, equilibrium, scored, selected, committed, realized, verified}`.
- **Required fields.** `(N, V, M, Y)` where `N` = one Constraint Network; `V` = current Valuation; `M` = regime/stage marker (active reversible block + outer precedence order with Commit State per transition); `Y` = Verification State map. Exactly one `N` per task.
- **Lifetime.** Created at first Perception of intent; lives for the whole task; released at terminal success (artifact realized + final verification) or abort.
- **Ownership.** The cognitive engine (runtime). Exactly one active `C` per task/session.
- **Invariants.** Contains exactly one Network; `V` is defined only at Inference fixpoints; `M` respects G4/G5; condition transitions follow the frozen runtime cycle only.
- **Creation.** By Perception (event E1), instantiating the seed artifact port + terminal-manufacture factor.
- **Destruction.** On task termination; committed manufacturing history (Commit State, verified factors) is exported to `K`/audit *before* release, never lost.
- **Read/Write.** Write `{Perception, Inference, Evaluation}`; read `{all five operators}` (Execution reads only its committed transition; Learning reads only verified factors). Cannot be written by any `K`-writing act.
- **Relationships.** Contains → Constraint Network, Valuation, Commit State (in `M`), Verification State. References → `K` schemas (via the Network's factors).

## 2. Constraint Schema

- **Purpose.** A reusable, generative unit of durable knowledge in `K`; the template from which task factors are instantiated. The persistent form of the substrate.
- **Mathematical meaning.** An abstract factor: a parametric family of typed, semiring-valued relations over abstract ports — a functor from an instantiation context to a concrete factor, closed under SPT. May be generative (value-dependent arity).
- **Required fields.** `(absPorts, rel, semiring, revTag, arityRule, provenance)`: abstract typed ports; the relation (possibly parametric); declared semiring; reversibility tag; a generative unfolding rule for value-dependent arity; a Learning-Record reference (provenance).
- **Lifetime.** Durable — persists across tasks. Superseded only by monotone tightening (Learning) or, exceptionally, retracted on a proven formal contradiction.
- **Ownership.** `K`.
- **Invariants.** Satisfaction-preserving and consistent with all other schemas (no contradiction); reversibility tag fixed; generative rule terminates on any concrete instantiation.
- **Creation.** By Learning (consolidation of a verified fixpoint) or as seeded prior knowledge in the initial `K`.
- **Destruction.** Never during a task; retraction requires a formal contradiction (per the freeze rule) and produces a Learning Record.
- **Read/Write.** Write `{Learning}` only (G1); read `{Inference}` (for Composition and SPT instantiation).
- **Relationships.** Template-of → Factors (via SPT); lives-in → `K`; recorded-by → Learning Record.

## 3. Constraint Network

- **Purpose.** The instantiated, task-specific web of factors over shared ports inside `C`; the object the two fixpoints operate over.
- **Mathematical meaning.** A hypergraph of factors on shared ports = a valuation-algebra instance = the `⊗`-combination of its factors, a relation over the joint port space valued in the semiring; stratified by reversibility into confluent blocks joined by irreversible transitions.
- **Required fields.** `(P, Φ, strata)`: port set `P`; factor set `Φ`; a stratification `strata` partitioning `Φ` into reversible blocks and the irreversible transitions connecting them.
- **Lifetime.** The task. Transient sub-networks (a stage's reversible block) may be released after their stage is committed and consolidated; committed states persist as history.
- **Ownership.** `C` (its sole Network).
- **Invariants.** Well-typed (G2); stratified per G5 (no mixed confluent solve); at an inner fixpoint it is stable under narrowing (G3); every factor instantiated from a schema preserves that schema's support.
- **Creation.** By Inference: Composition activates schemas sharing exposed ports; SPT instantiates them onto fresh task ports; Iteration unfolds generative arity.
- **Destruction.** With `C`, or per-stratum after commit+consolidation.
- **Read/Write.** Structure write `{Inference}`; evidence factors `{Perception}`; target/selection `{Evaluation}`; read `{all}`.
- **Relationships.** Contains → Ports, Factors. Belongs-to → Situation State. Instantiated-from → Constraint Schemas.

## 4. Port

- **Purpose.** A typed variable of the task; the shared boundary ("wire") along which factors compose. Carries the current admissible values of one quantity (a dimension, a material choice, a process parameter, an artifact-state variable).
- **Mathematical meaning.** A named typed slot with an admissible set: `p` with `type(p)` and `dom(p) ⊆ type(p)`. Shared occurrence of a port across factors *is* Composition.
- **Required fields.** `(id, type, dom, kind)`: identity; type (with continuous/discrete tag); current admissible domain; `kind ∈ {design-state, process-action, decision, observation}`.
- **Lifetime.** Its Network's lifetime. Ports carrying committed artifact-state persist as manufacturing history beyond stage release.
- **Ownership.** The Network (task ports) or a Schema (abstract ports).
- **Invariants.** `dom(p) ⊆ type(p)` always (G2); within an inner fixpoint `dom(p)` only shrinks (G3); `dom(p) = ∅` is legal only when the Network is flagged infeasible (never silently).
- **Creation.** By SPT instantiation (task ports) or schema definition (abstract ports). The seed artifact port is created by the first Perception.
- **Destruction.** With its Network; committed-state ports are archived, not deleted.
- **Read/Write.** Domain write `{Perception (observed), Inference (propagation), Evaluation (selection)}`; identity/type write `{Inference (instantiation), Learning (schema ports)}`; read `{all}`.
- **Relationships.** Belongs-to → Network (or Schema). Scoped-by → Factors that reference it. Shared occurrence → Composition edges.

## 5. Factor

- **Purpose.** The atomic unit of constraint content — one typed, semiring-valued relation. The substrate atom in instantiated form; the thing Inference propagates and Evaluation values.
- **Mathematical meaning.** A map `φ: ∏ dom(pᵢ) → S` over its ports, valued in a declared semiring; `supp(φ)` is its admissible set. A reversible factor is a bidirectional relation; an irreversible factor is a directed transition `Sᵢ → Sᵢ₊₁`.
- **Required fields.** `(ports, rel, semiring, revTag, origin)`: ordered typed ports; the relation/value function; semiring; reversibility tag; `origin ∈ {evidence(Perception), instantiated(Inference/SPT), target(Evaluation), durable(Learning)}`.
- **Lifetime.** Task factors: the Network's lifetime. Durable factors: persist in `K`.
- **Ownership.** The Network (task factors) or `K` (durable/schema factors).
- **Invariants.** `ports ⊆ P` and type-matched (G2); relation immutable after creation (only port *domains* narrow, never the relation); reversibility fixed; a factor never mixes regimes (G5); instantiated factors preserve their schema's support (SPT).
- **Creation.** Evidence factors by Perception; instantiated factors by Inference via SPT/Composition; target factors by Evaluation; durable factors by Learning (into `K`).
- **Destruction.** With the Network (task factors); never for durable factors (only monotone tightening). Never deleted mid-fixpoint (G3).
- **Read/Write.** Create per `origin` rules above; relation is write-once; read `{all}`. Only Learning may promote a factor into `K`.
- **Relationships.** References → Ports (its scope). Declares → Semiring, reversibility. Instantiated-from → Constraint Schema. Valued-into → Valuation. Ordered-by → Commit State (if irreversible).

## 6. Valuation

- **Purpose.** The scalar summary of a network condition — its feasibility, cost, and/or likelihood — that Evaluation reads to test feasibility and select, and that gates seam commits.
- **Mathematical meaning.** The semiring aggregate over the Network: the `⊕`-marginalization / `⊗`-combination of factor values onto query ports; a map `(N, queryPorts) → S`. For Boolean `S` it is feasibility; for tropical `S`, minimal cost; for probability `S`, a marginal.
- **Required fields.** `(perSemiring aggregates, queryScope, fixpointRef)`: one aggregate per active semiring; the ports it summarizes; a reference to the fixpoint it was computed at.
- **Lifetime.** Transient and derived — valid only at the Inference fixpoint that produced it; recomputed whenever the Network changes. Never persisted as source of truth.
- **Ownership.** `C` (derived content of the Network).
- **Invariants.** Defined only at an Inference fixpoint (never mid-propagation); consistent with `supp` of the current factors; monotone with narrowing for monotone semirings.
- **Creation.** By Evaluation (aggregate/selection) and by Inference (factor-local values during propagation).
- **Destruction.** Invalidated on any Network mutation; recomputed at the next fixpoint.
- **Read/Write.** Write `{Evaluation, Inference}`; read `{Evaluation, Inference, Execution (commit-eligibility), Learning}`.
- **Relationships.** Derived-from → Factors over the Network. Consumed-by → Evaluation (selection), Execution (eligibility gate).

## 7. Commit State

- **Purpose.** Records the reached point of the outer directed manufacturing fixpoint — which irreversible transitions have been committed. It is the running manufacturing history and the guard of irreversibility.
- **Mathematical meaning.** A monotone marker over the outer precedence order: the *committed prefix* of the process chain; an element of a well-founded chain `s₀ ≺ s₁ ≺ …` with a status in `{uncommitted, eligible, committed, realized}` per transition.
- **Required fields.** `(order, statusPerTransition, boundaryStateRefs)`: the precedence order; a status per transition; references to the committed artifact-state ports carried forward across the seam (via the bridge SPT).
- **Lifetime.** The manufacturing progression; committed/realized entries persist permanently (irreversibility) and are archived beyond task end.
- **Ownership.** `C`'s regime/stage marker `M`.
- **Invariants.** Monotone (G4): `uncommitted → eligible → committed → realized`, never reversed; a transition becomes `committed` only if all predecessors are `realized` and Evaluation marked it eligible; once `committed`, immutable (no back-flow, G5).
- **Creation.** An entry appears (as `uncommitted`) when the outer fixpoint reaches a transition; advanced by outer Inference (`committed`) and by Perception readback (`realized`).
- **Destruction.** Never during the task; archived as permanent history.
- **Read/Write.** Write `{Inference (outer commit), Perception (realized)}`; read `{Evaluation (eligibility), Execution (frontier), Perception}`. Single logical writer per transition-status transition.
- **Relationships.** Indexes → irreversible transition Factors. Gates → Execution. Carries → boundary artifact-state Ports across stages.

## 8. Verification State

- **Purpose.** Records whether a fixpoint/factor has been confirmed against Reality. It is the gate of the parameters-vs-state boundary: only verified content may become durable.
- **Mathematical meaning.** A predicate over factors/fixpoints: `status ∈ {unverified, verified, refuted}`, set by comparing a predicted equilibrium to an observed realized state (`as-designed` vs `as-built`).
- **Required fields.** `(target, status, evidenceRef)`: the factor or fixpoint verified; the status; a reference to the Perception observation that established it.
- **Lifetime.** Transient — from the Perception readback that sets it until Learning consolidates it (or the task ends). Not durable itself (its consequence, a Learning Record, is).
- **Ownership.** `C` (the `Y` map).
- **Invariants.** `verified` requires a corresponding Reality observation via Perception (G6); `refuted` forbids consolidation and forces replanning/redesign; Learning reads only `verified`.
- **Creation.** By Perception (reality readback) and Evaluation (feasibility confirmation of the as-built equilibrium).
- **Destruction.** Consumed by Learning at consolidation, or discarded at task end.
- **Read/Write.** Write `{Perception, Evaluation}`; read `{Learning (gate), Inference}`.
- **Relationships.** Annotates → Factors/fixpoints. Gates → Learning. Evidenced-by → Perception observations from `R`.

## 9. Learning Record

- **Purpose.** The durable, auditable event of a `K` write — what verified reality justified which change to durable knowledge. It makes `K`'s monotone evolution reproducible and reversible-only-under-contradiction.
- **Mathematical meaning.** A provenance triple `(sourceFixpoint, morphism, targetSchema)`: a verified source condition in `C`, the satisfaction-preserving SPT applied, and the resulting durable schema/factor in `K`; a single monotone update event on `K`.
- **Required fields.** `(sourceRef, verificationRef, morphism, target, timestamp, priorKRef)`: reference to the verified fixpoint; the Verification State that gated it; the SPT applied; the schema written/tightened; time; the prior `K` version it extends.
- **Lifetime.** Durable — permanent audit record; retained even if its target schema is later tightened; retracted only under a proven contradiction.
- **Ownership.** `K`.
- **Invariants.** References a `verified` source (G6); the recorded write is satisfaction-preserving and consistent with prior `K` (backward-compatible: prior valid inferences preserved unless Reality refuted them); one record per `K` write.
- **Creation.** By Learning, at consolidation of a verified fixpoint.
- **Destruction.** Never (audit); a contradiction produces a *new* retraction record, it does not erase history.
- **Read/Write.** Write `{Learning}` only (G1); read `{Inference (provenance/consistency), audit}`.
- **Relationships.** Records → a `C→K` consolidation. Justified-by → Verification State. Produces/tightens → Constraint Schema.

---

## 10. Object relationship map (canonical)

```
Reality (R) ──Perception──▶ Situation State (C)
                              │ contains
                              ├── Constraint Network ──┬── Ports ◀─shared occurrence─┐
                              │                        └── Factors ──references──────┘
                              ├── Valuation  (derived from Factors, at fixpoints)
                              ├── Commit State (orders irreversible Factors; monotone)
                              └── Verification State (annotates Factors/fixpoints)
                                          │ gates (G6)
Generalizing Structure (K) ◀──Learning── Learning Record ──produces──▶ Constraint Schema
        │                                                                    │
        └── Constraint Schema ──SPT instantiation (by Inference)────────────▶ Factor (in C)

Execution: reads a committed transition (Commit State) from C ──writes──▶ Reality (R)
```

**Ownership summary.** `C` owns: Situation State, Constraint Network, Ports (task), Factors (task), Valuation, Commit State, Verification State. `K` owns: Constraint Schema, Factors (durable), Learning Record. `R` is external.

**Writer summary (single-writer discipline).** `K` ← Learning only. `R` ← Execution only. `C` ← Perception, Inference, Evaluation. Commit State advanced only by Inference (commit) and Perception (realized). Verification State set only by Perception and Evaluation.

**Compatibility contract for independent teams.** Two implementations interoperate iff they agree on: (a) the field sets above; (b) the semiring interface (`⊕,⊗,0̄,1̄`) and per-factor semiring declaration; (c) the SPT support-preservation law; (d) the six global invariants G1–G6; (e) the eight-condition lifecycle of `C` and the monotone Commit State chain. No agreement on representation (how ports, domains, or factors are encoded) is required — only on these mathematical contracts.
