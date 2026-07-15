# Canonical Promotion Workflow — Research → Validation → Promotion → Production

**Status:** Canonical systems-engineering process. Defines the permanent promotion pipeline across the four repositories. Redesigns no repository responsibility, no theory, no architecture; derives only the workflow.
**Date:** 2026-06-27
**Governed by:** the frozen Computational Specification, the Repository Responsibility Matrix, and the freeze rule.

---

## 0. The one governing rule (what a "new cognitive mechanism" may be)

The ontology, operators, K-organization, substrate, and specification are **frozen**. Therefore a *new cognitive mechanism* is, by definition, **never a new object or operator** — it is a new **mechanism** (a parameterization/control of a frozen operator), a new **organizational pattern**, or new **content** (a schema, a factor family, a consolidation rule, a verification predicate) expressed entirely within the frozen objects and operators.

There is exactly one exception, and it is not a promotion — it is a **constitutional amendment**: if a mechanism cannot be expressed without a new object or operator, it is rejected from the pipeline and may enter only by proving a **formal contradiction** in the frozen theory, which is the sole condition that reopens the specification (see §7). Everything else flows one-way through the pipeline below and never touches the frozen core.

---

## 1. Pipeline overview (one-way, gated)

```
   RESEARCH            VALIDATION           PROMOTION              PRODUCTION
  (MiniFlyWire)       (MiniFlyWire)     (MiniFlyWire + PI +      (Mini Prometheus,
                                          target repo)            gated by Velith)
      S0 ──G0──▶ S1 ──G1──▶ S2 ──G2──▶ S3 ──G3──▶ S4 ──G4──▶ S5 ──G5──▶ live
   birth        validate    route      integrate  verify     canary
```

Nothing reaches production without traversing every gate. MiniFlyWire is upstream of all three other repositories; Mini Prometheus is the only integration endpoint; Velith is the independent verifier of the mechanism itself.

---

## 2. Stage by stage

### S0 — Birth of a mechanism (Research · MiniFlyWire)
1. **How it is born.** A candidate mechanism is written as a **hypothesis** in the frozen vocabulary: which frozen *operator* it modulates, which frozen *objects* it reads/writes, and the **causal effect** it predicts. It must name its falsification criterion up front. This is the H001-style hypothesis artifact.
- **Gate G0 — Specification-conformance.** The hypothesis introduces **no new object and no new operator**; it is expressible within the frozen spec and preserves invariants G1–G6 in principle. Fail ⇒ it is not a mechanism (route to §7 amendment or reject).
- **Artifacts:** Hypothesis document · falsification criterion · experimental design (ablation/intervention plan).

### S1 — Scientific validation (Validation · MiniFlyWire)
2. **How it becomes validated.** MiniFlyWire runs the mechanism under its **instrumentation spine** as controlled ablation/intervention on seeded, deterministic runs (the exec_influence pattern): the mechanism ON vs OFF, causal contribution measured, reproducibility confirmed, falsification attempted.
- **Gate G1 — Scientific-validation.** Passes iff: (a) a **measurable causal contribution** is demonstrated by ablation; (b) it is **reproducible** (seeded, telemetried, same result on re-run); (c) it **survived falsification**; (d) it adds **explanatory value beyond task performance** (behavioral improvement alone is insufficient). Fail ⇒ rejected or returned to S0.
- **Artifacts:** Seeded experiment + telemetry trace · results report (report.json-style) · a **benchmark** (held-out) · a **Validated-Mechanism Certificate** entered in MiniFlyWire's registry.

### S2 — Promotion routing (Promotion · MiniFlyWire + Principal Investigator)
3. **How it is promoted.** MiniFlyWire's certificate makes the mechanism *eligible*; the **Principal Investigator** makes the final strategic decision; the **Responsibility Matrix** determines *where it lands* — the mechanism is routed to the repository that **owns the object/operator it modulates** (see §3).
- **Gate G2 — Ownership-routing.** The target repo(s) and any contributing repos are identified per the matrix; a coordinated-change plan is produced if more than one repo must change. Fail ⇒ no valid owner (a sign it needs a new primitive ⇒ §7).
- **Artifacts:** Promotion memo (routing decision + PI approval) · coordinated-change plan.

### S3 — Integration without breaking the spec (Promotion → Production · target repo)
4. **How Mini Prometheus integrates it safely.** The mechanism is added **as content/parameterization within existing interfaces** — a new Evaluation heuristic, a new Inference propagation strategy, a new Factor family — **without changing any operator signature or object field set**. Integration must preserve the **six global invariants**, the **single-writer discipline**, the **runtime cycle**, and **backward compatibility** (every previously verified fixpoint and committed episode remains valid — Velith's immutable ledger forbids invalidating history).
- **Gate G3 — Invariant-preservation & conformance.** The integration passes the **compatibility contract** from the specification (agreement on field sets, semiring interface, SPT support-preservation, G1–G6, the C lifecycle) and a **backward-compatibility proof** (prior results unchanged). Fail ⇒ integration rejected.
- **Artifacts:** Integration change-set · contract tests (green) · backward-compatibility proof.

### S4 — Independent verification of the mechanism (Production · Velith)
5. **The platform verifies its own mechanism.** Before activation, the mechanism is subjected to **Velith's hard, deterministic, held-out verification** — the same authority Velith applies to any candidate. If the mechanism affects any claim about reality (feasibility, cost, correctness), it must produce a **grounded, content-hashed verdict** on the held-out benchmark. This is the platform dogfooding its own separation of powers: the Executive's new mechanism is judged by the independent Judiciary.
- **Gate G4 — Independent hard-verification.** A `PASSED` grounded verdict on the held-out benchmark, logged as an immutable episode. Fail ⇒ mechanism blocked from production regardless of S1 success.
- **Artifacts:** Velith verification episode (immutable, hashed) on the held-out set.

### S5 — Production canary (Production · Mini Prometheus)
- **Activation discipline.** The mechanism runs in **shadow/ablation in production** first; regression benchmarks must stay green before full activation.
- **Gate G5 — Canary & regression.** No regression on the standing benchmark suite; shadow results match validation. Fail ⇒ rollback (trivial, because history is immutable and the mechanism is additive).
- **Artifacts:** Canary/regression report · updated runtime record.

---

## 3. When Noetica or Velith must also change (routing rule)

The mechanism changes a repository **iff it reads or writes an object that repository owns**:

| The mechanism modulates… | Repository that must change | Its local gate |
|---|---|---|
| Constraint Network, Port, Factor, Situation State, Valuation aggregation, either fixpoint | **Mini Prometheus only** | G3 (spec conformance) |
| K representation, the consolidation act, confidence modeling, forgetting | **Noetica** (coordinated with MP) | G3 + Noetica K-contract tests + evidence-gate (G6) preserved |
| Hard verification predicate, Commit-State semantics, cost/feasibility semiring, held-out checks | **Velith** (coordinated with MP) | G3 + Velith determinism/immutability invariants |
| Nothing internal — a pure organizational pattern | **Mini Prometheus** (runtime cycle only) | G3 |

**Coordination rule (preserves "never merge").** When more than one repository changes, each integrates **independently behind its frozen contract** — the compatibility contract guarantees no repo blocks another, and no repository ever reaches into another's internals. Atomicity is required only at the **contract level**, never at the code level.

---

## 4. The verification-gate cascade (canonical)

| Gate | Owner | Criterion | Artifact | On fail |
|---|---|---|---|---|
| **G0** Spec-conformance | MiniFlyWire | No new object/operator; expressible in frozen spec | Hypothesis doc | Reject or → §7 |
| **G1** Scientific validation | MiniFlyWire | Causal + reproducible + falsification-survived + explanatory | Certificate + benchmark | Reject / return S0 |
| **G2** Ownership routing | MiniFlyWire + PI | Valid owner per matrix; change plan | Promotion memo | → §7 if no owner |
| **G3** Invariant preservation | Target repo | Compatibility contract + G1–G6 + backward-compat | Contract tests green | Reject integration |
| **G4** Independent verification | **Velith** | Grounded `PASSED` on held-out, hashed | Immutable episode | Block from production |
| **G5** Canary & regression | Mini Prometheus | No regression; shadow matches | Canary report | Rollback |

Order is strict and non-skippable: **G0 → G1 → G2 → G3 → G4 → G5.**

## 5. Artifact ledger per stage (canonical)

| Stage | Required artifacts |
|---|---|
| S0 Research | Hypothesis document; falsification criterion; experimental design |
| S1 Validation | Seeded experiment + telemetry; results report; held-out benchmark; **Validated-Mechanism Certificate** |
| S2 Promotion | Promotion memo (routing + PI approval); coordinated-change plan |
| S3 Integration | Integration change-set; contract tests; backward-compatibility proof |
| S4 Verification | Velith immutable verification episode on held-out set |
| S5 Production | Canary/regression report; updated runtime record |

Papers (S0–S1), specifications/contracts (S2–S3), tests (S3), and benchmarks (S1, S4–S5) are each required at their stage; a mechanism with a missing artifact cannot advance.

## 6. Direction & orchestration of the pipeline

- **One-way flow:** MiniFlyWire (research + validation) → routing → target repo integration → Velith verification → Mini Prometheus production. Nothing flows upstream except **experimental telemetry** (which MiniFlyWire instrumented) and **contradiction reports** (§7).
- **Who runs the pipeline:** MiniFlyWire owns S0–S2 (research, validation, routing); the target repo owns S3; Velith owns G4; Mini Prometheus owns S5 and, as runtime orchestrator, activates the mechanism. The **Principal Investigator** is the single human approval at G2.

## 7. The only exception — constitutional amendment (contradiction path)

If a mechanism *cannot* be expressed within the frozen objects/operators, it is **not** a promotion candidate. It may enter only by the amendment path:
1. A **formal contradiction** in the frozen theory is demonstrated (a proof, not a preference — the freeze rule).
2. MiniFlyWire reopens the specification, re-derives the minimal change, and re-freezes.
3. The affected objects/operators/spec/matrix are re-versioned; all downstream contracts are re-issued.

This path is rare by design, flows through MiniFlyWire alone, and is the *only* way the frozen core changes. All ordinary mechanisms use §2's pipeline and never touch it.

---

## 8. Canonical summary (one sentence)

*A mechanism is born as a falsifiable hypothesis in MiniFlyWire (G0), proven causally and reproducibly there (G1), routed by the Responsibility Matrix under the Principal Investigator's approval (G2), integrated into its owning repository within the frozen contracts and backward-compatibly (G3), independently hard-verified by Velith on held-out reality (G4), and canaried into Mini Prometheus's runtime (G5) — a strictly one-way Research → Validation → Promotion → Production pipeline in which the frozen core changes only through a proven contradiction, never through preference.*
