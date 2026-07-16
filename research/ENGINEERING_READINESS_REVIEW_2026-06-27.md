# Engineering Readiness Review — MiniFlyWire

**Review type:** Independent Scientific Readiness Audit (Research Director / Review Board)
**Date:** 2026-06-27
**Scope:** MiniFlyWire only. Determines scientific readiness to begin Mini Prometheus. Redesigns nothing.
**Evidence base:** current repository state (research/ doc sizes, `experiments/`, `benchmarks/`, git log), verified at review time.

---

## Findings of fact (what the repository actually contains)

- **Theory/specification layer — mature and frozen.** Ontology, computational theory (14 KB), the full spec chain (specification → runtime → interfaces → responsibility matrix → promotion workflow) are present and frozen; the last three commits are theory-freeze commits.
- **Validation apparatus — built and demonstrably working.** The M1 instrumentation spine (versioned trace schema, telemetry bus, session recorder, seeded RNG) exists and *functioned*: it caught a real causal defect (below).
- **Empirical program — essentially empty.** `02_hypotheses`, `03_metrics`, `04_benchmarks`, `05_experiments`, `07_architecture_principles`, `08_research_log`, `09_decisions` are **all 0 bytes**. One hypothesis (`H001`) exists as an 800-byte draft (observation + question, no experiment). One idea in the backlog.
- **Validated mechanisms — one experiment, a null result.** `exec_influence` (400 seeded trials) produced a *diagnostic/negative* finding: the executive controller has **zero influence** on the 60% scoring path (a field-name wiring defect) and is live on the 40% path. This validated the *method*, not a cognitive mechanism.
- **Open engineering debt in the legacy engine.** The 60% wiring defect (deferred) and the stuck-loop bug remain — but these belong to the legacy substrate, not to the frozen theory.

---

## The ten questions

**1. What was MiniFlyWire originally built to accomplish?**
It began as a brain-inspired cognitive agent + visualization, then was reframed (frozen vision v2 / research_problem v1.0) into its true mission: the **Computational Neuroscience Laboratory** — to *discover, experimentally validate (by ablation/intervention), visualize, and falsify* the cognitive mechanisms causally responsible for engineering-capable cognition, before they are promoted into production. Its mission is **mechanism-centric causal validation**, not production capability.

**2. Has it accomplished that scientific mission?**
**Asymmetrically.** It has accomplished the *theoretical and methodological* half — a frozen formal language and a working, discipline-enforcing validation apparatus. It has **not** accomplished the *empirical* half — no cognitive mechanism has been validated as causally beneficial, and the operational research program is unwritten. A laboratory is defined by its apparatus and method, and those are mature; its experimental output is still near-zero.

**3. Which scientific hypotheses have been validated?**
**None, as a causally-beneficial mechanism.** The single completed experiment validated the *methodology* and returned a *null/diagnostic* result (the executive controller was inert on the dominant path). That is a legitimate falsification finding — the instrument works — but it is not a validated cognitive mechanism.

**4. Which hypotheses remain unvalidated?**
**Essentially all.** H001 (internal-model construction) is drafted, untested. The compositional-construction idea is idea-only. The **central hypothesis** — that individually-measurable mechanisms are causally necessary and collectively sufficient for engineering cognition — is entirely untested. Metrics, benchmarks, and the experiment series are unwritten.

**5. Is there missing research that MUST be completed before Mini Prometheus begins?**
**For Phase 1 (infrastructure/substrate): none.** Per the frozen promotion workflow and the Velith M0/M1 precedent, Phase 1 is the *engine vessel* — it consumes the frozen theory/spec, **not** validated mechanisms. Before Mini Prometheus may *claim validated cognitive capability*, the empirical mechanism program must run — but that is MiniFlyWire's **permanent, parallel** responsibility through the promotion workflow (gates G1/G4), not a one-time precondition. The two open bugs are legacy-engine debt, not Phase-1 blockers.

**6. Would beginning Mini Prometheus now violate any scientific assumption inside MiniFlyWire?**
**No — provided Phase 1 is scoped as substrate/skeleton, not as embodying unvalidated mechanisms.** The frozen theory is internally consistent and closed (substrate closure proven; ontology declared complete). The *only* way beginning production would violate an assumption is by shipping cognitive-capability claims on unvalidated mechanisms — and the promotion workflow's gates exist precisely to forbid that. The safeguard is already encoded in the governance.

**7. Is MiniFlyWire mature enough to become a permanent upstream research laboratory?**
**Yes.** A permanent laboratory needs two things: a frozen formal language and a working validation apparatus that enforces falsification discipline. MiniFlyWire has both — the second already caught a real defect. Its thin empirical output does not disqualify it; it *defines its permanent forward workload*.

**8. What permanent responsibility should MiniFlyWire retain after Mini Prometheus exists?**
Per the frozen Responsibility Matrix: the **Constitution & Laboratory** role — own the frozen theory/specification, the experimental methodology, the instrumentation/telemetry spine, and the mechanism-validation registry; and **govern, at design-time**, what may enter the platform (promotion gates G0–G2). It is the permanent *source of validated mechanisms* and the *guardian of the frozen core*.

**9. What should never be moved out of MiniFlyWire?**
The **instrumentation/telemetry spine**, the **ablation/intervention methodology**, the **falsification apparatus and mechanism registry**, the **seeded-determinism experimental harness**, and **authorship of the frozen theory/spec**. Moving any of these into production would collapse the separation of powers — the laboratory that validates must remain independent of the engine that ships. The falsification *culture* (mechanisms are hypotheses until proven) must never leave either.

**10. Should the Principal Investigator now begin Phase 1 of Mini Prometheus?**
**Yes.** Phase 1 (the infrastructure/substrate skeleton — the Velith-M0/M1 analog) should begin now: the theory it depends on is frozen and closed; it consumes no unvalidated mechanism; it gives the empirical program a concrete substrate to instrument; and further theory inside MiniFlyWire now yields diminishing returns.

---

## Verdict

# READY

**READY means:** ready to begin Mini Prometheus Phase 1 (infrastructure) and to operate as the permanent upstream laboratory. **READY does not mean** any cognitive mechanism has been empirically validated — none has, and MiniFlyWire's permanent forward job is exactly that validation, conducted in parallel through the promotion workflow. This distinction is the whole of the verdict: Phase 1 is a vessel, not a capability claim, and the vessel's prerequisites (frozen, closed theory + working validation apparatus) are met.

**Why continuing research inside MiniFlyWire first would now produce diminishing scientific returns:**

1. **The theory has reached a fixed point.** The substrate was proven *closed*; the ontology was *declared complete*; the specification, runtime, matrix, and workflow are frozen. Additional derivation now refines an already-frozen map — motion without marginal scientific yield. (The last several efforts each drilled one level deeper in abstraction, the classic over-refinement signature.)
2. **The binding constraint has shifted from theory to substrate.** The central hypothesis is empirical and cannot be tested in the abstract — mechanism ablation needs a concrete engine to run against. MiniFlyWire's own instrument (exec_influence) already showed that its most informative results come from *running mechanisms on real code*, not from more derivation. Phase 1 supplies that substrate.
3. **The methodology, not the map, is MiniFlyWire's product.** It has proven the methodology works. Continuing to expand the theory delays the only activity that can now generate new scientific knowledge: promoting hypotheses through the validation gates against a real engine.

In short: the map is finished; building the territory is now the scientific bottleneck. Beginning Phase 1 is not a departure from MiniFlyWire's mission — it is the precondition for MiniFlyWire to finally *execute* it.

**No blocking issues.** (The empty operational-research docs and the two legacy bugs are MiniFlyWire's permanent forward workload and legacy-engine debt respectively; neither blocks Phase 1, which replaces the legacy substrate rather than depending on it.)
