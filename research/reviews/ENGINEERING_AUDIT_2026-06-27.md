# MiniFlyWire — Full Engineering Audit

**Author:** Chief Systems Engineer (Claude)
**Date:** 2026-06-27
**Scope:** Whole-project state → final goal → recommended next atomic milestone → re-analysis of `research/ontology.md`
**Nature:** Engineering audit only. Does not redesign the science.

---

## 1. The final goal (what everything is pointed at)

Two horizons exist in this repo, and they must not be confused.

**Near horizon — MiniFlyWire itself.** Per `00_research_vision_v2_draft.md` (Frozen v1.0) and `research_problem.md` (Frozen v1.0), MiniFlyWire is **not** an agent or a product. It is a *laboratory*. Its North Star:

> Which computational mechanisms are necessary and sufficient for an artificial system to acquire, organize, construct, transfer, and apply knowledge through continuous interaction with its environment, and how can their causal contributions be experimentally demonstrated?

The success criterion is **methodological**: each cognitive mechanism is a falsifiable hypothesis, isolatable by ablation/intervention, measured causally, reproducible. Behavioral performance alone is explicitly rejected as evidence.

**Far horizon — the lineage.** Validated mechanisms feed forward: **Noetica → Velith → Mini Prometheus**, the last being an AI that builds *constraint-preserving internal models* for engineering and manufacturing. This is why `ontology.md` Principle 7 makes Constraint a first-class object — it is the through-line to the entire program.

---

## 2. What the project actually has today

### 2.1 Frozen scientific foundation (strong)
| Document | Status | Assessment |
|---|---|---|
| `00_research_vision_v2_draft.md` | Frozen v1.0 | Clear, mission-level. Solid. |
| `research_problem.md` | Frozen v1.0 | Problem, central hypothesis, falsification criteria all present. Solid. |
| `00_project_definition.md` | Stable | Defines MiniFlyWire + "representation". Solid. |
| `ontology.md` | "Draft v0.1" (treated frozen) | The formal language. Section 3 strong; Section 4 thin — see §5. |

### 2.2 Empty / stub documents (the paper skeleton)
These exist as filenames only and currently carry no content:
`02_hypotheses.md`, `03_metrics.md`, `04_benchmarks.md`, `05_experiments.md`, `08_research_log.md`, `09_decisions.md`, `07_architecture_principles.md`, and `01_cognitive_ontology.md` (a stub superseded by `ontology.md`). `00_research_axioms.md` is mid-decision (Axiom B pending challenge). `H001` and `idea_backlog` exist as early drafts.

**Implication:** the *vision* and the *language* are frozen, but the *operational research plan* (hypotheses → metrics → benchmarks → experiments → log) is not yet written. The lab has a constitution but not yet an experiment program.

### 2.3 Instrumentation spine — M1 (built, working)
`instrumentation/` ships a real, disciplined telemetry layer: `traceSchema.js` (versioned, frozen-shape event envelopes with validators; "no channel may emit without a validator entry"), `telemetryBus.js`, `sessionRecorder.js`, `rng.js` (seeded determinism, `rngDrawCount` cross-check). This is exactly the right foundation for reproducible mechanism experiments.

### 2.4 First experiment — exec_influence (done, produced a real finding)
`experiments/exec_influence/` ran 400 seeded trials and reached a genuine causal verdict: **the executive controller has zero influence on the 60%-weight scoring path** due to a field-name mismatch (`{exploit,explore}` expected vs `{wReward,...}` supplied); the 40% arbitrate path is live. This is the lab methodology working as designed — an ablation/intervention study that found a concrete, reproducible defect. Fix was deferred to "M2 concern."

### 2.5 Legacy engine (large, predates the scientific reframe)
`main.js` (5,250 LOC) + `render/*` (~11,000 LOC across 35 modules): a browser/Three.js 3D sandbox where one agent walks a 20-node graph (`neurons.json` / `connections.json`), scoring neighbors via Q-learning + semantic + episodic + motivation + uncertainty. The README frames intelligence as "cooperation of multiple specialized modules." Known open defect: the **stuck-loop bug** (`CURRENT_BUGS.md`).

---

## 3. The central tension (the most important finding)

The project contains **two architectures with opposite organizing principles**:

- **Legacy engine** organizes cognition *as independent modules* (`memory.js`, `planning.js`, `cognitiveAttention.js`, …) — the README sells this as a feature.
- **The frozen ontology** explicitly *rejects* that framing: Principles 1–2 say cognition is the transformation of computational **objects** by **operators**, "rather than a collection of independent modules (such as memory, reasoning, planning, or attention)."

These are not yet reconciled. The ontology is the declared target language; the 16k-LOC engine is written in the language the ontology moved away from. **No bridge document exists** that maps the engine onto the ontology.

The good news: the mapping is mostly latent and recoverable. Existing modules already correspond to ontology concepts under different names:

| Ontology concept | Existing implementation (latent) |
|---|---|
| Entity / Relation | `neurons.json` / `connections.json` (a literal node-edge graph) |
| Property: Uncertainty / Precision | `uncertaintyEngine.js`, `uncertaintyLedger.js`, `predictionError.js` |
| Property: Provenance | `semanticProvenance.js` |
| Property: Confidence | `connections.json` `confidence` field, `trustMemory.js` |
| SGWM (world model) | `schemaMemory.js`, `knowledge.js`, `semanticMemoryLayer.js`, `longTermConsolidation.js` |
| Cognitive State (transient) | `episodicContextEngine.js`, `momentumMemory.js`, working-memory state in `main.js` |
| Operator: Perception/Inference/Execution/Learning | scoring/decision pipeline, `qlearning.js`, `embeddings.js` |
| Mechanism: Attention/Evaluation/Credit/Precision | `cognitiveAttention.js`, `scoring.js`, `qlearning.js`, `uncertainty*` |
| Strategy: Curiosity/Goal Selection/Exploration | `motivationalState.js`, `executiveController.js`, `behavior.js` |
| **Constraint (first-class)** | **— absent —** |
| **Transition (declarative)** | **— absent; change is implicit in the move pipeline —** |

The two objects with **no representation** in the current code — **Constraint** and **Transition** — are precisely the two that matter most for the far-horizon goal (constraint-preserving engineering cognition). That is the single biggest structural gap.

---

## 4. Gap analysis → recommended next atomic milestone

Project rule: *one atomic milestone at a time; engineering architecture review before implementation; preserve backward compatibility.* Given M1 (spine) and M2 (ontology) are landed, the correct next step is **not** to start refactoring 16k LOC and **not** to write more frozen theory. It is to build the missing bridge.

**Recommended M3 — "Ontology → Architecture Mapping" (specification milestone, no engine rewrite):**

1. **Core object model spec.** Define `Entity`, `Relation`, `Constraint`, `Transition` as data structures with stable IDs, including the two missing objects. Declarative only; no behavior. (Unblocks everything downstream.)
2. **Operator/Mechanism/Strategy signatures.** Give every Section-4 item a type signature (inputs → outputs in terms of the object model) and a one-line tier-discrimination rule. Without this, no interface, no test, no ablation harness.
3. **Legacy mapping table, formalized.** Promote the table in §3 above into `07_architecture_principles.md` so the existing engine is registered as "Instantiation #0" the lab can run experiments against — preserving backward compatibility.
4. **One thin vertical slice.** Pick the already-working telemetry spine and wrap a *single* operator (e.g. Evaluation/scoring) behind the new signature, emitting ontology-typed telemetry. Proves the mapping without touching the other 34 modules.

Parallel low-risk cleanup (independent of M3): close the exec_influence finding (the field-name mismatch) and the stuck-loop bug, since both are now documented and reproducible.

**What I am NOT recommending:** rewriting the engine to be "ontology-native," redesigning the science, or filling the empty research docs speculatively. Those come after M3 defines the interfaces.

---

## 5. Re-analysis of `ontology.md` (in full project context)

My first-pass review stands; full context **sharpens** rather than changes it. Updated points:

**Confirmed by the codebase, not just inferred:**
- **Section 4 underspecification (Impact: High).** Operators/Mechanisms/Strategies are bare bullet lists with no signatures. The exec_influence experiment already shows the cost of unspecified interfaces: a silent field-name mismatch (`{exploit,explore}` vs `{wReward,...}`) made an entire control path inert and it took a 400-trial study to detect. Typed operator signatures in the ontology are the upstream fix for that whole class of defect. → Minimal clarification: add an input→output signature table for the eleven Section-4 items.
- **Constraint & Transition have no implementation anywhere (Impact: High for the far-horizon goal).** This is not an ontology defect — the objects are well-defined in prose — but it confirms they need first-class data structures in M3, and that the ontology should state Constraint identity/scope and the Transition-consuming operator (Execution) explicitly. → Minimal clarification: one line naming Execution as the Transition consumer; one line giving every Fundamental Object a stable ID.

**Unchanged from first review (all additive, none alter the science):**
- Tier-discrimination rule for Operator vs Mechanism vs Strategy is implicit. (Medium)
- Cognitive State ↔ SGWM ownership (reference vs copy) unspecified. (Medium–High)
- Property set open-vs-closed and value shape (scalar vs metadata-bearing) unspecified. (Medium)
- Status header reads "Draft v0.1" while treated as frozen. (Low)

**Fit with existing architecture:** the ontology is a sound *target* language and maps cleanly onto latent structures already in the engine (§3 table). Realizing it is a refactor, gated behind M3, not a blocker on the ontology itself.

---

## 6. Verdict

Project state: **strong frozen vision + working instrumentation spine + one real experimental result**, sitting on top of a **large legacy engine that speaks the pre-ontology "modules" language**, with an **unwritten operational research plan** and **two missing first-class objects (Constraint, Transition)**.

Single most valuable next action: **M3 — Ontology→Architecture mapping spec** (object model with IDs + operator signatures + formalized legacy mapping + one vertical slice). Cheap, reversible, unblocks both the experiment program and the eventual refactor.

Ontology document itself:

**READY WITH MINOR ENGINEERING REFINEMENTS** — Section 3 is implementation-ready; Section 4 needs type signatures and a tier rule before it can be coded or tested. All fixes are additive.
