# Canonical Repository Responsibility Matrix — The AI Manufacturing Platform

**Status:** Canonical systems-engineering architecture. Assigns permanent responsibilities across the four repositories. Derives no new theory, no new computational object; consistent with the frozen Computational Specification and the completed Velith/Noetica traceability audits.
**Date:** 2026-06-27
**Repositories (permanent, never merged):** MiniFlyWire · Noetica · Velith · Mini Prometheus.

---

## 0. The organizing principle — separation of powers

The four repositories form a **separation of powers**, and that is why they must never merge. Each holds exactly one kind of authority, and the platform is sound only if no repository holds two:

- **MiniFlyWire — the Constitution & Laboratory.** Owns the *rules of what is true and what may enter*. Design-time governance.
- **Noetica — the Memory (Knowledge authority, K-face).** Owns *what we durably know and how confident we are*.
- **Velith — the Judiciary (Verification authority, R-face).** Owns *grounding claims in reality, independently and irreversibly*.
- **Mini Prometheus — the Executive (Engine & Orchestrator).** Owns *the runtime that solves and coordinates the others*.

The permanent boundary falls along two seams already frozen: the **semiring seam** (Boolean/feasibility → Velith; probability/confidence → Noetica; aggregation → Mini Prometheus) and the **proposer/verifier separation** (the thing that proposes a solution must never be the thing that verifies it — so Mini Prometheus proposes, Velith verifies, and they stay distinct repositories).

---

## 1. MiniFlyWire — Constitution & Laboratory

1. **Primary mission.** The scientific laboratory: validate cognitive/computational mechanisms by controlled experiment (ablation, intervention, instrumentation) and hold the frozen theory + Computational Specification.
2. **Exclusively owns.** The frozen theory and Computational Specification; the experimental methodology; the instrumentation/telemetry spine; the mechanism-validation record (what has been causally proven and may be promoted).
3. **Must never own.** Production runtime state; K content; manufacturing verification or execution. It must never become a production system — entangling science with production would destroy both the experiment's control and the platform's determinism.
4. **Frozen objects it owns.** *None as production instances.* It owns the **specification of all nine objects** and the **instrumentation that observes them** in experiments — not their runtime ownership.
5. **Operators that execute there.** All five, but **only in experimental/ablation mode** (to measure a mechanism's causal contribution), never in production.
6. **Contracts it exposes.** The **Specification contract** (the frozen objects/operators/invariants every other repo must honor) and the **Validated-Mechanism registry** (a mechanism may enter Noetica/Velith/Mini Prometheus only after MiniFlyWire certifies its causal value).
7. **Information flow.** *Design-time, one-way downstream:* MiniFlyWire → {Noetica, Velith, Mini Prometheus}. It never receives runtime data; it receives experimental telemetry it itself instrumented.
8. **Orchestration role.** Governs (design-time); orchestrates nothing at runtime.

## 2. Noetica — Memory / Knowledge Authority (K)

1. **Primary mission.** Represent durable knowledge and update it from evidence under uncertainty — the Generalizing-Structure laboratory.
2. **Exclusively owns.** The **Learning-consolidation act** (evidence → durable K update; audit-confirmed in `phase2_memory`), the **probability/confidence semiring**, and knowledge **decay/forgetting**.
3. **Must never own.** Verification ground truth; the Commit ledger; execution; the constraint-network engine. If Noetica owned verification, its own soft confidence would contaminate ground truth (wireheading) — forbidden.
4. **Frozen objects it owns.** **Constraint Schema (K)**; the **probability face of Valuation**; the **act half of the Learning Record**. *(Audit note: today's K is a durable but extensional mastery store; the generalizing character is its charter to build, not yet implemented.)*
5. **Operators that execute there.** **Learning** (the consolidation *act*); the **confidence face of Evaluation**.
6. **Contracts it exposes.** The **K-contract**: `read(query) → schemas + confidence` and `consolidate(verified fixpoint) → K update`. Input: verified fixpoints. Output: knowledge + confidence.
7. **Information flow.** Noetica → Mini Prometheus (K read, runtime); Mini Prometheus → Noetica (verified fixpoints to consolidate).
8. **Orchestration role.** None; a called authority.

## 3. Velith — Judiciary / Verification & Reality Authority (R)

1. **Primary mission.** Ground claims in reality — hard, executable, deterministic, adversarial verification, with immutable provenance.
2. **Exclusively owns.** The **hard verification harness** (deterministic isolated sandbox); the **immutable, content-hashed, append-only episode ledger**; the **Boolean-feasibility (+cost) semiring**; the anti-wireheading held-out checks.
3. **Must never own.** K representation; confidence/uncertainty modeling; the Learning-consolidation act; the constraint-network engine. If Velith modeled its own confidence it would cease to be an independent judge.
4. **Frozen objects it owns.** **Verification State (hard authority)**; **Commit State** (immutable ledger discipline); the **envelope half of the Learning Record** (provenance/integrity/determinism); the **Boolean/cost face of Valuation**.
5. **Operators that execute there.** **Execution** (the only writer of R) and the **hard face of Perception** (reading verified results from R).
6. **Contracts it exposes.** The **Verification contract**: `verify(candidate) → Verification State + Learning-Record envelope`, `commit(irreversible transition) → Commit State`, `execute(committed transition) → R mutation + observation`. Input: candidates/transitions. Output: grounded verdicts, immutable episodes, commit ledger.
7. **Information flow.** Mini Prometheus → Velith (candidates/transitions); Velith → Mini Prometheus (verdicts, commit state, verified episodes).
8. **Orchestration role.** None; a called authority — deliberately independent of the proposer.

## 4. Mini Prometheus — Executive / Engine & Orchestrator (C + network)

1. **Primary mission.** Run the cognitive runtime that turns a manufacturing intent into a manufactured artifact — the only place the constraint-network engine exists.
2. **Exclusively owns.** The **runtime cycle** (the frozen event loop); the **constraint-network substrate** (network + ports + the general Factor type); the **two fixpoints** (inner confluent, outer directed); **Valuation aggregation** across all semirings.
3. **Must never own.** The hard verification harness (delegated to Velith, to keep verification independent of the solver); K representation/consolidation internals (delegated to Noetica); the theory/methodology (governed by MiniFlyWire).
4. **Frozen objects it owns.** **Situation State (C)**, **Constraint Network**, **Port**, **Factor** (the type), **Valuation** (network aggregation).
5. **Operators that execute there.** **Inference** (both regimes), the **aggregation face of Evaluation**, and **Perception intake** (importing intent + verified results into C). It *invokes* Velith's Execution and Noetica's Learning; it does not implement them.
6. **Contracts it exposes.** The **platform front door**: `intake(manufacturing intent) → artifact` (the runtime cycle). Internally it consumes Noetica's K-contract and Velith's Verification contract.
7. **Information flow.** The hub: receives K from Noetica and verdicts/commits from Velith; sends candidates to Velith and verified fixpoints to Noetica; drives R through Velith's harness.
8. **Orchestration role.** **The runtime orchestrator.** It is the only repository that calls the others.

---

## 5. Master responsibility matrix

| | MiniFlyWire | Noetica | Velith | Mini Prometheus |
|---|---|---|---|---|
| **Mission** | Validate mechanisms; hold the theory/spec | Durable knowledge under uncertainty | Ground claims in reality | Run & orchestrate the manufacturing engine |
| **Authority** | Constitution / Lab | Memory (K) | Judiciary (R) | Executive (engine) |
| **Semiring** | — (governs all) | probability/confidence | Boolean feasibility (+cost) | aggregation (all) |
| **Exclusively owns** | Spec, methodology, instrumentation, mechanism registry | Consolidation act, confidence, forgetting | Hard verifier, immutable ledger | Runtime cycle, network, fixpoints |
| **Must never own** | Production runtime | Verification/ledger/execution | K/confidence/consolidation | The verifier, K internals, the theory |
| **Orchestration** | Governs (design-time) | Called authority | Called authority | **Runtime orchestrator** |

## 6. Frozen-object ownership (canonical)

| Object | Owner | Contributing repos |
|---|---|---|
| Situation State (C) | **Mini Prometheus** | — |
| Constraint Network | **Mini Prometheus** | — |
| Port | **Mini Prometheus** | — |
| Factor (type) | **Mini Prometheus** | Noetica (probabilistic content), Velith (verification content) |
| Valuation | **Mini Prometheus** (aggregation) | Noetica (probability face), Velith (Boolean/cost face) |
| Constraint Schema (K) | **Noetica** | Mini Prometheus consumes |
| Verification State | **Velith** (hard) | Noetica (soft observation/inference gating) |
| Commit State | **Velith** | Mini Prometheus (manufacturing staging) |
| Learning Record | **Velith** (envelope) + **Noetica** (act) | Mini Prometheus composes |
| *Specification of all objects* | **MiniFlyWire** | governs all |

## 7. Operator execution (canonical)

| Operator | Executes in | Sourced from |
|---|---|---|
| Perception (R→C) | Mini Prometheus (intake) | Velith (verified R), external intent |
| Inference (C×K→C) | Mini Prometheus | reads K from Noetica |
| Evaluation (C→C) | Mini Prometheus (aggregation) | Noetica (confidence), Velith (feasibility/cost) |
| Learning (C×K→K) | Noetica (act) | Velith (verified episode, via MP); recorded in Velith envelope |
| Execution (C→R) | Velith (harness) | triggered by MP's committed transition |
| *All, in ablation mode* | MiniFlyWire | experimental only, never production |

## 8. Information flow (canonical)

```
DESIGN-TIME (governance, one-way):
   MiniFlyWire ──spec + validated mechanisms──▶ Noetica, Velith, Mini Prometheus

RUNTIME (data, hub-and-spoke around the Executive):
                         intent
                           │
                           ▼
        ┌──────────── MINI PROMETHEUS ────────────┐
        │            (orchestrator)                │
   read K│                                         │submit candidates
        ▼                                          ▼
     NOETICA ◀── verified fixpoints (consolidate) ── VELITH
        │  (K)                                       │ (verdicts, commit)
        └──────────── K back to MP ◀─────────────────┘
                           │
                     committed transition
                           ▼
                    VELITH harness ──▶ Reality (artifact)
                           │
                     observation ─▶ back to MINI PROMETHEUS (Perception)
```

**The single loop:** intent → Mini Prometheus solves (Inference over a network built from Noetica's K) → submits candidates to Velith (verify) → Velith commits/executes into Reality and returns grounded verdicts → Mini Prometheus routes verified fixpoints to Noetica (consolidate into K) → repeat until the artifact is realized. MiniFlyWire stands outside the loop, governing which mechanisms are allowed inside it.

## 9. Orchestration — the final answer

**Two distinct kinds of control, held by two different repositories, permanently:**

- **Mini Prometheus orchestrates at runtime.** It is the *only* repository that calls the others; the runtime cycle lives there and nowhere else.
- **MiniFlyWire governs at design-time.** It is the *only* repository that decides what mechanisms and objects may exist; nothing enters the platform without its validation.

No other repository orchestrates or governs. Noetica and Velith are called authorities — powerful within their domain, silent outside it.

---

## 10. Canonical summary (one sentence)

*MiniFlyWire proves and holds the rules; Noetica remembers and generalizes under uncertainty; Velith judges reality irreversibly and independently; Mini Prometheus is the engine that, governed by MiniFlyWire's rules, composes Noetica's knowledge with Velith's verdicts into a single runtime loop that turns a manufacturing intent into a manufactured artifact — four permanent authorities, never merged, separated along the semiring seam and the proposer/verifier line.*
