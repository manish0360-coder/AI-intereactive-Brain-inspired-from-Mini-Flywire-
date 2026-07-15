# Traceability Matrix — Computational Specification → Noetica, and the Permanent Noetica/Velith Boundary

**Status:** Systems-engineering mapping + architectural-boundary derivation. Modifies neither the frozen specification nor the frozen Velith mapping; redesigns nothing.
**Date:** 2026-06-27
**Noetica baseline analyzed:** `main`, Phase 2 complete / Phase 3 in progress. Evidence is drawn from the repository's documented implemented components (README: `agent_zero/`, `core/`, `phase2_memory/`, Knowledge-State model, Evaluation pipeline, Forgetting model). This is an architecture-level mapping from stated components, not a line-by-line source read — flagged where it matters.

---

## 0. Orientation — what Noetica *is*, and the organizing insight

Noetica is a **cognitive-primitives laboratory** whose domain content is *learner knowledge modeling* (education), not engineering. That domain is irrelevant to this mapping; what matters is which **computational objects of the frozen spec** Noetica implements as cognitive primitives. Read that way, Noetica is unmistakably a **K-side laboratory**: memory, structured Knowledge-State representation, confidence/uncertainty, evidence-based updates, and forgetting are exactly the *Generalizing Structure* and its dynamics.

The clean organizing insight — derived from the frozen substrate (semiring-valued factors) — is that **the two labs already occupy different semirings**:

- **Velith operates the Boolean-feasibility semiring** (hard pass/fail against executable reality) plus cost.
- **Noetica operates the probability/confidence semiring** (evidence, confidence, uncertainty, forgetting).

That single fact predicts the entire boundary: Velith owns *grounding a claim in reality*; Noetica owns *durable knowledge and confidence in it*; Mini Prometheus owns the *constraint-network engine* that couples them.

---

## 1. Summary matrix (spec object → Noetica)

| Spec object | Coverage in Noetica | Where | Semiring face |
|---|---|---|---|
| Situation State (C) | **Weak-partial** | `agent_zero/` per-interaction agent-loop scope | — |
| Constraint Schema (K) | **Strong-partial** | `phase2_memory/` Knowledge-State model, concept tracking, structured learner profile | probability |
| Constraint Network | **Absent** | — | — |
| Port | **Absent** | (nearest: "concept" nodes — knowledge items, not solve-time ports) | — |
| Factor | **Partial (degenerate, scalar)** | evidence-based concept-mastery updates | probability/confidence |
| Valuation | **Strong-partial** | confidence representation; "reasoning about uncertainty" | probability |
| Commit State | **Absent (and inverted)** | temporal dynamics are *forgetting/decay*, not irreversible commit | — |
| Verification State | **Partial (soft)** | Evaluation pipeline: structured verdicts, contracts; **observation-vs-inference** separation | probability |
| Learning Record | **Strong-partial (the *act*, not the envelope)** | Memory update pipeline: evidence → Knowledge-State change; forgetting | probability |

The two objects Noetica implements best — **Constraint Schema (K)** and **Learning-consolidation / Valuation-confidence** — are precisely the two Velith *lacks*. This complementarity is the boundary.

---

## 2. Per-object determination

### Situation State (C)
1. **Exists?** Weakly. 2. **Where?** The transient working scope of the `agent_zero/` agent loop during one interaction. 3. **Evidence:** README describes an "Agent Loop" over an "LLM Interface" producing per-interaction outputs; Noetica's persistent state is the *learner state* (K-like), so C is only the ephemeral loop context. 4. **Missing:** a reified, condition-tagged, mutable *constraint-network* overlay — Noetica's transient state is conversational, not a network being solved. 5. **Belongs in:** **Mini Prometheus** — the reified runtime C is the engine's, not a sub-lab's.

### Constraint Schema (K) — *Noetica's strongest object*
1. **Exists?** Strong-partial. 2. **Where?** `phase2_memory/` Knowledge-State model: structured concept tracking, structured learner profile, evidence-based updates, state serialization. 3. **Evidence:** README lists "Knowledge State model, Confidence representation, Concept tracking, Evidence-based updates, Structured learner profile" as *completed*; the whole project thesis is representing durable knowledge as structure updated by evidence — this is the Generalizing Structure. 4. **Missing:** it is *content in one domain* (learner-concept mastery) and holds structured **instances**, not yet abstract, generative, satisfaction-preserving **schemas** with typed ports; no SPT instantiation. 5. **Belongs in:** **Noetica** — this is its permanent charter. Noetica owns K representation and evolution.

### Constraint Network
1. **Exists?** No. 2. **Where?** — 3. **Evidence:** knowledge is a set of concepts with mastery/confidence, not a hypergraph of factors over shared ports solved to a fixpoint; no constraint solving anywhere. 4. **Missing:** everything. 5. **Belongs in:** **Mini Prometheus** — neither lab builds constraint networks; both use opaque LLMs.

### Port
1. **Exists?** No. 2. **Where?** Nearest is concept nodes in the Knowledge State, but those are knowledge items, not typed solve-time variables with narrowing domains. 3. **Evidence:** README's knowledge model is concept/confidence, not variable/domain. 4. **Missing:** typed ports with admissible domains. 5. **Belongs in:** **Mini Prometheus** (substrate of the network).

### Factor
1. **Exists?** Partially, degenerately (scalar). 2. **Where?** The evidence-based update: an observation adjusts a concept's mastery/confidence. 3. **Evidence:** "Evidence-based updates," "Confidence representation." 4. **Missing:** these are *per-concept scalars valued in a confidence semiring*, not **composable relational** factors over ports; no reversible/irreducible relational factors. 5. **Belongs in:** the general **Factor type → Mini Prometheus**; Noetica permanently *contributes probabilistic/knowledge factor content*, Velith contributes Boolean verification factor content.

### Valuation — *Noetica's second-strongest object*
1. **Exists?** Strong-partial. 2. **Where?** Confidence representation across the Knowledge State and Evaluation pipeline. 3. **Evidence:** README foregrounds "careful reasoning about uncertainty," "How confident should the system be," "Which signals should never be inferred without evidence" — the probability-semiring valuation is a first-class Noetica concern. 4. **Missing:** network-level semiring *aggregation* (Noetica values individual concepts, not a joint network). 5. **Belongs in:** **shared** — Noetica owns the **probability/confidence** face; Velith owns the **Boolean/cost** face; Mini Prometheus owns the network aggregation.

### Commit State
1. **Exists?** No — and structurally *inverted*. 2. **Where?** — 3. **Evidence:** Noetica's temporal dynamic is the **forgetting model** (mastery *decays*), i.e. deliberately *non-monotone / reversible* state — the opposite of an irreversible commit ledger. 4. **Missing:** the monotone, immutable, precedence-ordered commit object. 5. **Belongs in:** **Velith** (which already has the append-only, immutable, hashed ledger discipline); staged manufacturing commit → **Mini Prometheus**. Noetica should *not* own this — decay is its correct dynamic.

### Verification State
1. **Exists?** Partial, *soft*. 2. **Where?** The Evaluation pipeline (structured verdict generation, evaluation contracts, JSON-contract validation) and the architectural principle **"explicit separation between observation and inference."** 3. **Evidence:** README: "separation between observation and inference," "Which observations are trustworthy," "Which signals should never be inferred without evidence" — this is precisely the verified/unverified gate (G6). 4. **Missing:** Noetica's verification is *answer-evaluation* (often LLM-graded, soft), **not** executable, deterministic, adversarial ground truth — it lacks Velith's isolated-sandbox hard verdict. 5. **Belongs in:** **shared, but Velith is the authority** — Velith owns *hard/executable* Verification State (the manufacturing ground truth); Noetica owns the *observation-vs-inference discipline and confidence gating* over knowledge.

### Learning Record — *Noetica owns the act Velith lacks*
1. **Exists?** Strong-partial — the *consolidation act*, not the *provenance envelope*. 2. **Where?** The **Memory update pipeline** (evidence → Knowledge-State change) plus the forgetting model. 3. **Evidence:** README: "Memory update pipeline," "Evidence-based updates," "Continuous memory consolidation" (vision), "versioned experiments," "review history." 4. **Missing:** the provenance-complete, content-hashed, immutable *record envelope* that Velith's `Episode` has; Noetica has the learning *dynamics* but a weaker integrity envelope. 5. **Belongs in:** **shared** — Velith owns the **record envelope** (provenance/integrity/determinism), Noetica owns the **consolidation act** (evidence → K update, forgetting). Mini Prometheus composes both.

**Complementarity, stated once:** Velith has the Learning-Record *envelope* without the consolidation act; Noetica has the consolidation *act* without the provenance envelope. Together they are one complete Learning Record. Neither is redundant.

---

## 3. The four engineering questions

**• What role should Noetica permanently play inside Mini Prometheus?**
Noetica is the **Generalizing-Structure (K) authority and cognition laboratory**. Its permanent charter: how durable knowledge is *represented* (Constraint-Schema content), how it is *updated by evidence* (the Learning-consolidation act), how *confidence/uncertainty* is modeled (the probability-semiring Valuation), and how knowledge *decays* (forgetting). It answers: *"What do we durably know, how is it structured, and how confident are we?"* It is the source of the K that Mini Prometheus's engine composes into constraint networks.

**• What should remain exclusively inside Velith?**
Velith is the **Reality-grounding / verification authority**. Exclusively its own: *hard, executable, deterministic, isolated, adversarial* Verification State (the manufacturing ground truth); the **Commit-State discipline** (append-only, immutable, content-hashed, irreversible ledger); the **Learning-Record envelope** (provenance integrity, determinism levels, anti-wireheading held-out checks); and the Boolean-feasibility (+cost) semiring. It answers: *"Is this true/feasible against the world, provably and reproducibly?"* Noetica must never own executable ground truth, and Velith must never own soft confidence modeling.

**• Which computational objects belong in both systems?**
Exactly the three **semiring-two-faced** objects: **Valuation** (Noetica = probability/confidence; Velith = Boolean/cost), **Verification State** (Noetica = soft observation-vs-inference; Velith = hard executable), and **Learning Record** (Noetica = consolidation act; Velith = provenance envelope). These are not duplication — each lab owns a different, non-overlapping face, and Mini Prometheus unifies them.

**• Which project should own each frozen computational object?**

| Object | Owner (authority) | Contributing systems |
|---|---|---|
| Situation State (C) | **Mini Prometheus** | — (weak analogs in both labs' loops) |
| Constraint Schema (K) | **Noetica** | MP consumes; Velith's verified episodes feed consolidation |
| Constraint Network | **Mini Prometheus** | — |
| Port | **Mini Prometheus** | — |
| Factor (the type) | **Mini Prometheus** | Noetica → probabilistic factors; Velith → Boolean verification factors |
| Valuation | **Mini Prometheus** (aggregation) | Noetica (probability face); Velith (Boolean/cost face) |
| Commit State | **Velith** | MP for manufacturing staging |
| Verification State | **Velith** (hard authority) | Noetica (soft observation/inference gating) |
| Learning Record | **Velith** (envelope) + **Noetica** (act) | MP composes both |

---

## 4. The permanent architectural boundary

```
        ┌──────────────────────────┐        ┌──────────────────────────┐
        │        NOETICA           │        │         VELITH           │
        │  K-face / cognition lab  │        │  R-face / verification   │
        │                          │        │                          │
        │ • Constraint Schema (K)  │        │ • Verification State (hard)│
        │ • Valuation (confidence, │        │ • Commit State (immutable │
        │   probability semiring)  │        │   append-only ledger)     │
        │ • Learning: consolidation│        │ • Learning Record envelope│
        │   act + forgetting/decay │        │   (provenance, determinism)│
        │ • Observation vs Inference│       │ • Boolean feasibility(+cost)│
        └────────────┬─────────────┘        └─────────────┬────────────┘
                     │  K (knowledge, confidence)          │  verdicts, verified episodes
                     └──────────────┬──────────────────────┘
                                    ▼
                   ┌────────────────────────────────────┐
                   │           MINI PROMETHEUS           │
                   │   Engine / integrator (C + network) │
                   │ • Situation State (reified C)       │
                   │ • Constraint Network, Port, Factor  │
                   │ • Inner confluent + outer directed  │
                   │   fixpoints (the solving engine)    │
                   │ • Valuation aggregation (all semirings)│
                   │ • Composes Noetica's K with Velith's │
                   │   verification into one loop        │
                   └────────────────────────────────────┘
```

**The boundary in one sentence:** *Velith grounds claims in reality (R-face, Boolean, immutable, verified); Noetica represents and updates durable knowledge under uncertainty (K-face, probabilistic, consolidating, forgetting); Mini Prometheus is the only place the constraint-network engine (Situation State, Ports, Factors, the two fixpoints) exists, and it composes Noetica's K with Velith's verification into a single cognitive loop.* The boundary is stable because it falls along the semiring seam of the frozen substrate — Boolean/verification to Velith, probability/confidence to Noetica, aggregation and the network to Mini Prometheus — and no object is owned twice except the three that legitimately carry two semiring faces.

**Methodological note.** The Noetica mapping is grounded in the repository's documented implemented components (Phase 2 complete; Knowledge-State Phase 3 in progress), not a full source read. The two strong claims — Noetica as K/confidence authority and as owner of the Learning-consolidation act — should be reconfirmed against `phase2_memory/` source before this boundary is frozen; the coverage ratings for Constraint Schema and Learning Record are the ones most sensitive to that check.
