# Traceability Matrix — Computational Specification → Velith Implementation

**Status:** Systems-engineering mapping. Does not modify the frozen specification or introduce any computational object.
**Date:** 2026-06-27
**Velith baseline analyzed:** `main` at M0–M6 (config declares milestones through M6). Modules read: `core/config.py`, `runner/spike.py`, `agent/proposer.py`, `llm/client.py`, `task.py`, `harness/verifier_sandbox.py`, `episodes/episode.py` (+ store, M3 index, M4 corpus, M5 batch, M6 retrieval from config/imports).

---

## 0. One-paragraph orientation (the shape of the finding)

Velith is **not** a uniform partial implementation of the whole specification. It is a *complete implementation of one face* — the Reality-facing verification/provenance/memory spine — and a *near-zero implementation of the other face* — the internal constraint-network cognition. Concretely: **Verification State** and the **Learning-Record envelope** are strong and faithful; the **append-only content-hashed episode ledger** already enforces Commit-discipline; but **Constraint Network, Port, Factor, Valuation, and Constraint Schema have no internal analog** — the proposer is an opaque LLM standing in for the entire inner engine (`Inference` over `C×K`), and the "problem" is a natural-language prompt rather than a typed constraint network. This is exactly what a *verification-first* build produces first, and it means the smallest path forward reuses the whole verification spine unchanged while introducing the constraint-network substrate *behind* the proposer.

---

## 1. Summary matrix

| Spec object | Coverage | Where in Velith | Verdict |
|---|---|---|---|
| Situation State (C) | **Partial** | `runner/spike.py` (`run_spike` local scope: Task+Proposal+Verdict bundle) | Exists only as an ephemeral straight-line dataflow, not a reified, condition-tagged, mutable network |
| Constraint Network | **Absent** | — | Problem is prompt+repo, not a typed factor network |
| Constraint Schema | **Absent** | `episodes/` + M6 retrieval = K-as-instances only | Durable store exists but holds memorized episodes, not generalizing abstract schemas |
| Port | **Absent** | (nearest: `task.py` typed fields — fixed descriptors, not solve-time ports) | No typed variables with narrowing admissible domains |
| Factor | **Partial (degenerate)** | `harness/verifier_sandbox.py` + `task.py` (hidden/secondary test) | Exactly one class: an externally-evaluated Boolean verification factor; no internal/reversible/composable factors |
| Valuation | **Partial (degenerate)** | `Verdict` (state, secondary, flaky, duration) + cost fields in `Proposal`/`Episode` | Boolean valuation of one factor + tropical-like cost signals; no network-level aggregation/selection |
| Commit State | **Partial (discipline only)** | `episodes/store.py` (append-only JSONL) + `Episode` (frozen, hashed) | Monotone/immutable/permanent ledger discipline present; the staged irreversible precedence-order object absent |
| Verification State | **Strong** | `harness/verifier_sandbox.py` (`Verdict`), `episodes/episode.py` (`VerdictState`) | Faithful: PASSED/FAILED/…, secondary_passed (anti-wireheading), flaky (measurement quality) |
| Learning Record | **Strong-partial** | `episodes/episode.py` (`Episode`), store, M3 index | Provenance-complete, content-hashed record present; the *consolidation act* (C→K schema write) absent |

Coverage of the two spec faces: **Reality/verification/provenance face ≈ implemented; constraint-network cognition face ≈ not implemented.**

---

## 2. Per-object determination

### Situation State (C)
1. **Equivalent exists?** Partially. 2. **Where?** The transient scope of `run_spike` in `runner/spike.py` — the Task + `Proposal` + `Verdict` triple held for one attempt; `spike.py` is already declared "the single owner of operation order," i.e. the runtime driver. 3. **Missing:** a *reified* C: a mutable object carrying a constraint network, a valuation, a regime/stage marker, a verification-state map, and a condition tag (`perturbed…verified`). Today C is anonymous local variables in a straight line, discarded at function exit. 4. **Smallest implementation (if it were absent):** n/a (partial). 5. **Modify:** `runner/spike.py` becomes the runtime-cycle driver hosting a reified Situation State instead of local variables. 6. **New modules unavoidable:** a Situation-State carrier once a Constraint Network exists (it has nothing to hold today).

### Constraint Network
1. **Exists?** No. 2. **Where?** — 3. **Missing:** everything — there is no hypergraph of factors over shared ports; the problem is a prompt string + a git repo. 4. **Smallest implementation:** a typed constraint-network core (ports + factors + stratification by reversibility) that the proposer and verifier operate over; minimally, a single-block network wrapping the one verification factor so the loop has a network to solve. 5. **Modify:** `agent/proposer.py` and `runner/spike.py` to operate over a network rather than a prompt. 6. **New modules unavoidable:** the constraint-network substrate (shared with Port/Factor below) — the single largest gap.

### Constraint Schema
1. **Exists?** No (as schemas). 2. **Where?** The durable store (`episodes/*.jsonl`, M3 `episodes.db`, M6 retrieval) is K — but at the *memorized-instance* end, which the spec classifies as durable content, **not** as abstract generalizing schemas. 3. **Missing:** parametric, satisfaction-preserving relation *templates* (abstract factors with abstract ports and generative arity) that instantiate via SPT. 4. **Smallest implementation:** a schema store holding abstract factors keyed by their abstract ports, instantiable onto task ports; initially seeded, later grown by Learning. 5. **Modify:** M6 retrieval becomes the *read* path for schemas (Composition activation) rather than raw episode recall. 6. **New modules unavoidable:** an abstract-schema store distinct from the episode log.

### Port
1. **Exists?** No. 2. **Where?** Nearest is `task.py`'s typed fields, but those are immutable descriptors, not solve-time variables with narrowing domains. 3. **Missing:** typed variables with admissible domains that shrink under propagation and are shared across factors (the composition wires). 4. **Smallest implementation:** a typed port with `(id, type, dom, kind)` and monotone domain narrowing; part of the constraint-network core. 5. **Modify:** none directly (ports are new substrate). 6. **New modules unavoidable:** port/domain layer (with Factor, the network core).

### Factor
1. **Exists?** Partially, degenerately. 2. **Where?** `harness/verifier_sandbox.py` + `task.py`: the hidden test is a single **irreversible, Boolean-semiring** factor evaluated in Reality; the held-out secondary is a second Boolean factor. 3. **Missing:** internal, composable, semiring-valued factors over ports; **reversible** factors are entirely absent (Velith has only the irreversible verification factor — the inner confluent regime has no representative). 4. **Smallest implementation:** a factor `(ports, rel, semiring, revTag, origin)` with the verifier's Boolean verdict as its first instance, then reversible factors for the design side. 5. **Modify:** `task.py` (declare the verification factor as a Factor), `harness/verifier_sandbox.py` (its evaluation). 6. **New modules unavoidable:** the general Factor type + composition algebra.

### Valuation
1. **Exists?** Partially, degenerately. 2. **Where?** `Verdict` (state/secondary/flaky/duration) is the Boolean valuation of the single verification factor; `Proposal`/`Episode` cost fields (`prompt_tokens`, `completion_tokens`, `latency_seconds`, `verify_seconds`) are tropical-semiring-like cost annotations. 3. **Missing:** semiring aggregation over a *network* (feasibility of a region, cost/likelihood aggregation, selection/optimization). 4. **Smallest implementation:** a valuation function aggregating factor values over the network per declared semiring. 5. **Modify:** `harness/verifier_sandbox.py::Verdict` remains the per-factor value; a network-level aggregate is added alongside. 6. **New modules unavoidable:** the semiring valuation-aggregation layer.

### Commit State
1. **Exists?** Partially — the *discipline*, not the object. 2. **Where?** `episodes/store.py` (append-only JSONL) + `Episode` (`frozen`, `extra="forbid"`, `content_hash`, hash re-verified on read) implement a **monotone, immutable, permanent** ledger — structurally the Commit-State discipline (G4). 3. **Missing:** the *object* — a precedence-ordered chain of committed irreversible transitions with per-transition status `{uncommitted, eligible, committed, realized}`; today episodes commit *attempts*, not staged manufacturing transitions, and the verifier workspace is disposable (reset each run), so it is not a commit. 4. **Smallest implementation:** a monotone status chain over an outer precedence order, reusing the episode ledger's append-only/hash discipline. 5. **Modify:** `episodes/store.py` (its append-only immutability is the template to reuse). 6. **New modules unavoidable:** a staged Commit-State object — but only when manufacturing staging (multi-step irreversible progression) enters; for single-step code repair it stays degenerate.

### Verification State
1. **Exists?** Yes — Velith's strongest object. 2. **Where?** `harness/verifier_sandbox.py` (`Verdict`) and `episodes/episode.py` (`VerdictState` = {PASSED, FAILED, PATCH_APPLY_FAILED, NO_PATCH, INFRA_ERROR}); established by disposing of a candidate against Reality in a deterministic, network-isolated sandbox; `secondary_passed` is a second, anti-wireheading verification; `flaky` records measurement quality. 3. **Missing:** it is *per-attempt* (whole episode), not *per-factor over a network*, and covers only terminal pass/fail — there is no reversible-equilibrium verification. 4. **Smallest implementation:** n/a (present). 5. **Modify:** `harness/verifier_sandbox.py` to attach a verdict to a *factor/fixpoint* rather than only to a whole episode (generalization, backward-compatible). 6. **New modules unavoidable:** none.

### Learning Record
1. **Exists?** Strong-partial. 2. **Where?** `episodes/episode.py` (`Episode`): a provenance-complete, content-hashed, immutable record with source (task_id, seed, arm, model, model_version), the exact prompt/patch, the verdict, cost/timing, and integrity hash; persisted append-only and indexed (M3). 3. **Missing:** the spec's Learning Record records a **C→K consolidation** (a satisfaction-preserving write that generalizes/tightens a *schema*). Velith logs the *attempt+verdict* but performs **no consolidation into generalizing schemas** — `Learning (C×K→K)` is not implemented; M6 retrieval is instance-recall, not generalization. The `Episode` is the *provenance envelope* of a Learning Record without the *learning act*. 4. **Smallest implementation:** a consolidation step that reads verified episodes and writes/tightens abstract schemas, emitting a record `(sourceRef, verificationRef, morphism, targetSchema, priorKRef)`. 5. **Modify:** `episodes/episode.py` (extend, backward-compatibly, with the consolidation-provenance fields) and M6 (read path becomes schema-aware). 6. **New modules unavoidable:** the Learning consolidation operator (episodes → schemas), which does not exist today.

---

## 3. Operator-level note (why the module gaps fall where they do)

The object gaps track the operator gaps exactly. **Perception** (verifier reading Reality; task intake) and **Execution** (verifier applying a patch and running tests in an oracle workspace) are present. **Evaluation** is minimal (verdict interpretation + M5 arm/cost guard). **Inference** exists only as an *opaque* generator (`ProposerAgent` → LLM), with **no `K` read** (the proposer is explicitly "no memory, no retrieval"; the M6 substrate exists but is not yet wired into it) and no constraint propagation. **Learning** (consolidation into `K`) is absent — episode logging is a memory-write, not a schema update. So the missing objects (Network, Port, Factor, Valuation, Schema) are precisely the state that a real `Inference (C×K→C)` and `Learning (C×K→K)` would read and write — and those two operators are the two that Velith has not yet built.

---

## 4. Smallest coherent step implied by the matrix (not a redesign)

The verification spine (Verification State, Learning-Record envelope, Commit-discipline, R-oracle, deterministic sandbox, provenance/hashing, retrieval memory) is reusable **unchanged**. The single highest-leverage move to converge Velith toward the specification is to introduce the **constraint-network core** (Port + Factor + Constraint Network + semiring Valuation) *behind* the proposer — turning the opaque LLM step into an `Inference` over a reified network that draws Constraint Schemas from a schema store (with M6 as the `K`-read) — and to add the **Learning consolidation** operator that writes verified episodes into schemas. Everything else in the spec (Commit State's staged object, reversible factors) remains degenerate until multi-step manufacturing staging enters, and can stay unbuilt without violating the spec.

**Modify (existing):** `runner/spike.py` (host Situation State + cycle), `agent/proposer.py` (Inference over a network), `episodes/episode.py` (extend to full Learning Record), `harness/verifier_sandbox.py` (per-factor verdicts), `task.py` (emit seed factors), M6 retrieval (schema-aware read).
**New (unavoidable):** constraint-network substrate (Port, Factor, Network, composition algebra), abstract Constraint-Schema store, semiring Valuation aggregation, Learning consolidation operator, and — only when staging arrives — the staged Commit-State object.
