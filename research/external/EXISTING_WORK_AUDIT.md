# Existing Work Audit

**Kind:** read-only prior-art / reuse audit. **Nothing was implemented, integrated, cloned into the repo, or committed.**
**Author:** Chief Systems Engineer · **Date:** 2026-09-20 · **Repo state at audit:** `4fb5c74` (untouched).
**Evidence basis:** GitHub REST API (`api.github.com/repos/...`) queried 2026-09-20, plus `raw.githubusercontent.com/<repo>/HEAD/<LICENSE>` reads, plus arXiv abstract/HTML reads. Star counts and push dates are as of that date.

> **Evidence discipline.** Every repository row below has API-verified license, language, last push and archive status. Rows marked **METADATA-ONLY** were *not* inspected at source level (no test/CI/benchmark inspection) — their capability claims are **UNVERIFIED** and must not be treated as validated. Where a README or blog claim was contradicted by the repository itself, the contradiction is recorded.

---

## 1. Executive summary

1. **FutureScore is not duplicated, but it is also not novel in its parts.** The literature splits on the failure model: when a failure **resets** the agent, the correct edge weight is `−log p̂` (maximize path reliability); when a failure **leaves the agent in place**, the correct weight is `1/p` (expected attempts). Our frozen V2.3 sits in the second family and rejected `−log p` explicitly. The closest learned-from-experience work (PathUCB/PathTS, arXiv:2607.15440) optimizes the *first* family and **publishes no code**. Verdict: **OUR CURRENT APPROACH APPEARS DISTINCT in combination; EXTERNAL WORK PROVIDES A STRONG REFERENCE for the estimator layer.**
2. **The largest genuine reuse opportunities are outside cognition**: constraint/scheduling solving (`google/or-tools`, Apache-2.0), CAD kernel scripting (`CadQuery/cadquery` and `gumyr/build123d`, both Apache-2.0), motion planning (`ompl/ompl`, BSD-3), and a scheduling benchmark corpus (`ai-for-decision-making-tue/...`, MIT). These are Velith/Mini-Prometheus concerns and do not touch MiniFlyWire.
3. **A license trap was found by inspection, not by reading:** a widely cited blog states CadQuery is LGPLv3; the `LICENSE` file at HEAD is **Apache-2.0**. Conversely, several attractive manufacturing systems (`crbnos/carbon`, `Mes-Open/OpenMes`, `opencog/atomspace`) are **AGPL-3.0**, which is a hard gate for anything we would link into a product.
4. **The manufacturing "CAD → plan → execute" chain is only partially covered** by open source. Feature recognition has credible research code; operation sequencing and machine/tool selection are largely academic and unmaintained; scheduling is strong; MES is either AGPL or immature.
5. **Nothing found replaces MiniFlyWire's actual research question** — an isolated, post-outcome, provenance-controlled evidence boundary feeding a falsifiable planning mechanism. The agent-memory field (Letta, mem0, Graphiti, cognee) solves *retrieval for LLM agents*, not *mechanism falsification*.

## 2. Search methodology

- Multiple terminology families per domain (implementation terms, academic terms, GitHub topics) — e.g. for FutureScore: "learned edge traversal cost", "stochastic shortest path expected attempts", "reliability-aware planning", "learning heuristic graph search".
- Discovery by web search; **verification by API and by reading the LICENSE blob at HEAD**, never by README assertion.
- Papers separated into: paper-only / paper+implementation / implementation+benchmark.
- API budget was limited (unauthenticated, 60 requests/hour), which is the main reason many rows are METADATA-ONLY. This is a stated limitation, not an omission.

## 3. Search coverage

| Layer | Terminology families searched | Coverage |
|---|---|---|
| MiniFlyWire | cognitive architectures, episodic/semantic/procedural memory, intrinsic motivation, learned heuristics, uncertainty-aware planning, reproducible agent experiments | good on architectures and RL exploration; **thin on falsification/preregistration harnesses** (§22) |
| Noetica | agent runtimes, memory frameworks, provenance, deterministic replay, tool routing, graph orchestration | good |
| Velith | parametric CAD, B-rep, feature recognition, CAM/toolpath, simulation, motion planning, text-to-CAD | good on CAD/robotics; **thin on FEA/physics solvers** (§22) |
| Mini Prometheus | CAPP, operation sequencing, job-shop/flexible-job-shop scheduling, OR/CP/MIP, DES, digital twin, MES/MRP | good on scheduling/DES; **thin on industrial CAPP and fixture/tool selection** (§22) |

## 4. High-relevance repositories (API-verified 2026-09-20)

| Repository | License (verified) | Lang | Stars | Last push | Notes |
|---|---|---|---|---|---|
| [google/or-tools](https://github.com/google/or-tools) | Apache-2.0 | C++ | 14075 | 2026-09-20 | CP-SAT; `examples/python/flexible_job_shop_sat.py` is the canonical FJSP model |
| [CadQuery/cadquery](https://github.com/CadQuery/cadquery) | **Apache-2.0 (LICENSE at HEAD)** | Python | 5801 | 2026-09-13 | blog claim of LGPLv3 is **contradicted** by the repo |
| [gumyr/build123d](https://github.com/gumyr/build123d) | Apache-2.0 | Python | 3163 | 2026-09-19 | CadQuery-derived, context-manager API |
| [FreeCAD/FreeCAD](https://github.com/FreeCAD/FreeCAD) | LGPL-2.1 | C++ | 33663 | 2026-09-20 | CAM/Path workbench; 2.7 GB repo |
| [ompl/ompl](https://github.com/ompl/ompl) | BSD-3-Clause | C++ | 2152 | 2026-09-14 | sampling-based motion planning; no collision checking |
| [moveit/moveit2](https://github.com/moveit/moveit2) | BSD-3-Clause | C++ | 2022 | 2026-09-16 | integrates OMPL/CHOMP/STOMP/PILZ |
| [RobotLocomotion/drake](https://github.com/RobotLocomotion/drake) | BSD-3-Clause (`LICENSE.TXT`) | C++ | 4196 | 2026-09-20 | multibody dynamics + optimization |
| [ai-for-decision-making-tue/Job_Shop_Scheduling_Benchmark…](https://github.com/ai-for-decision-making-tue/Job_Shop_Scheduling_Benchmark_Environments_and_Instances) | MIT | Jupyter | 206 | 2026-08-15 | JSP/FSP/FJSP/AJSP instances + solvers (arXiv:2308.12794) |
| [whjdark/AAGNet](https://github.com/whjdark/AAGNet) | MIT | Python | 170 | 2024-12-16 | gAAG B-rep machining-feature recognition; MFInstSeg dataset |
| [omron-sinicx/neural-astar](https://github.com/omron-sinicx/neural-astar) | MIT | Jupyter | 307 | 2025-01-30 | differentiable A*; learned *guidance maps*, not learned edge costs |
| [SoarGroup/Soar](https://github.com/SoarGroup/Soar) | BSD-2-Clause | C++ | 439 | 2026-07-20 | episodic/semantic/procedural memory architecture |
| [letta-ai/letta](https://github.com/letta-ai/letta) | Apache-2.0 | – | 24809 | 2026-09-10 | agent memory server (ex-MemGPT) |
| [getzep/graphiti](https://github.com/getzep/graphiti) | Apache-2.0 | Python | 31032 | 2026-09-19 | temporal knowledge graph with fact provenance |
| [compas-dev/compas_fab](https://github.com/compas-dev/compas_fab) | MIT | Python | 138 | 2026-09-19 | robotic fabrication planning bridge |
| [DLR-RM/stable-baselines3](https://github.com/DLR-RM/stable-baselines3) | MIT | Python | 13823 | 2026-09-09 | RL baselines with tested implementations |
| [CiwPython/Ciw](https://github.com/CiwPython/Ciw) | MIT | Python | 175 | 2025-12-05 | DES library with reproducibility emphasis |
| [crbnos/carbon](https://github.com/crbnos/carbon) | **AGPL-3.0** | TS | 2560 | 2026-09-20 | ERP/MES/QMS — copyleft gate |
| [opencog/atomspace](https://github.com/opencog/atomspace) | **AGPL-3.0** | C++ | 999 | 2026-02-10 | hypergraph knowledge store — copyleft gate |

All rows above are **METADATA-ONLY** unless named in §5–§12 with a specific file or finding.

## 5. MiniFlyWire prior art (cognitive research)

- **Soar** (BSD-2) implements the memory taxonomy we study — episodic memory written at every decision, plus semantic and procedural stores. It is a *substrate*, not a falsification harness; it does not answer whether a mechanism is causally load-bearing. **R1 REFERENCE.**
- **OpenCog AtomSpace** is AGPL-3.0 → **LICENSE-BLOCKED** for linking; hypergraph-store ideas remain readable. `trueagi-io/hyperon-experimental` (MIT, last push 2026-02-11) is the successor line.
- **Intrinsic motivation**: `pathak22/noreward-rl` (MIT, ICM) and `openai/random-network-distillation` (**no LICENSE file, ARCHIVED 2020**) are the canonical implementations. Curiosity is *excluded by our frozen contracts*, so these are reference-only and, in RND's case, legally unusable as code.
- **What is genuinely missing externally:** a reproducibility/falsification harness of the kind MiniFlyWire already has (preregistration + mutation-controlled gates + seed registry + lineage notes). Searches for "preregistration", "ablation harness", "deterministic agent experiment" surfaced papers and awesome-lists, **no maintained harness**. This is a **BUILD-FROM-SCRATCH** area that we have already built.

## 6. Noetica prior art (agent runtime)

- **Memory frameworks** — Letta, mem0, Graphiti, cognee (all Apache-2.0, all actively pushed within 10 days of audit). They solve *LLM context and retrieval*: storing facts, retrieving by relevance, and in Graphiti's case tracking fact validity over time with provenance.
- **Architectural caution:** these are *content* stores for LLM agents. Noetica owns *mechanisms* after MiniFlyWire validation. Adopting one as the memory **substrate** is plausible; adopting one as the memory **model** would import an untested cognitive commitment.
- **LangGraph** (MIT) provides durable execution and checkpointing for agent graphs — the closest match to "deterministic agent trajectories", **UNVERIFIED at source level**.
- Several 2026 arXiv entries (R-LAM, AgentScope Runtime, event-sourced runtimes) describe exactly our provenance/replay concerns; they are **paper-only** for our purposes until a repository is verified.

## 7. Velith prior art (engineering intelligence)

- **CAD scripting:** CadQuery and build123d, both **Apache-2.0**, both on OCCT. build123d is a refactor of CadQuery's ideas with a context-manager API.
- **Kernel:** OCCT underlies both and FreeCAD; OCCT's own licensing (LGPL-2.1 with an exception) was **not verified in this audit** → **UNVERIFIED**, and it is a gating question before any product decision.
- **Feature recognition:** AAGNet (MIT) is the most complete recent line — gAAG B-rep representation, multi-task segmentation, evaluated on MFCAD/MFCAD++/MFInstSeg. FeatureNet is **GPL-3.0** (viral for linked use); CADNet has **no LICENSE file at HEAD** → unusable as code regardless of its content.
- **Text-to-CAD agents** are an active 2026 research area (ToolCAD, CAD-Judge, Zero-to-CAD). The consistent reported failure mode is *invalid/non-compiling parametric output*, which argues for a verification layer we would own rather than a model we would import.

## 8. Mini Prometheus prior art (manufacturing intelligence)

- **Scheduling is the strongest reuse area.** OR-Tools CP-SAT (Apache-2.0) is the de-facto solver; the TU/e benchmark repo (MIT) supplies instances and baselines for JSP/FSP/FJSP/AJSP.
- **DES:** SimPy, salabim, Ciw. Ciw is MIT and reproducibility-focused. **salabim has no LICENSE file at HEAD** → **LICENSE-UNCLEAR** until resolved.
- **MES/MRP:** `crbnos/carbon` (AGPL-3.0) and `Mes-Open/OpenMes` (AGPL-3.0) are copyleft; `factorysemantics/factorysemantics-mes` is Apache-2.0 but has **1 star** and is effectively unproven; `gabejohnsnn/OpenMRP-System` has **no license and 3 stars**. Odoo is LGPL-3.0.
- **CAPP proper** (operation sequencing, machine/tool/fixture selection) has **no maintained open-source implementation** found. This is the clearest gap in the whole chain.

## 9. FutureScore prior art (dedicated)

| Work | What it actually does | Relation to our V2.3 |
|---|---|---|
| **Min-Exp-Cost-Path** (arXiv:1802.00898) | minimizes expected cost until success on a graph; success probabilities are **given a priori**, not learned; NP-hard; MDP framing | Same *objective family* as ours (expected cost until success). **Differs**: probabilities are known, not estimated from traversal outcomes. **PARTIALLY SOLVES** the planning half; solves none of the evidence half. |
| **Stochastic Reset Pathfinding — PathUCB / PathTS** (arXiv:2607.15440) | learns per-edge reliability from observed traversals; `p̂` via UCB (`p̄ + √(ρ ln t / N)`) or Thompson sampling (Beta-Bernoulli); edge weight `w(e) = −log p̂(e)`; Dijkstra maximizes ∏p; **failure resets the agent to the source**; **no public repository** | Closest learned analogue found. **Objective differs because the failure model differs**: reset ⇒ maximize path reliability (`−log p`); our slip keeps the agent in place ⇒ expected attempts (`1/p`). V2.3 rejected `−log p` for exactly this reason, and the literature independently confirms the split. **REFERENCE ONLY** (no code). |
| **Competence-Aware Path Planning** (arXiv:2109.13974) | maintains per-edge traversal success probability, updated during deployments | Same evidence shape (observed traversal outcomes → edge probability). **PARTIALLY SOLVES**; robot-perception framing, not a reusable library. |
| **Neural A\*** (`omron-sinicx/neural-astar`, MIT) | differentiable A*; a CNN learns a *guidance map* over grid cells from expert paths | Learns *where to search*, not *what an edge costs from outcomes*. **REFERENCE.** |
| **PHIL / learned A\* heuristics** (arXiv:2212.03978, 2204.08938) | learn admissible-ish heuristics by imitation | Bears on our terminal term `T`, which V2.3 fixes structurally. **REFERENCE.** |

**Verdict:** no external implementation provides *observed traversal outcomes → learned edge cost → goal-directed planning* under a retry-in-place cost model with an isolated evidence boundary. The estimator mathematics (Beta-Bernoulli, UCB, Laplace-style smoothing) is standard and **we should not claim novelty there**. Our V2.3 additive-smoothing estimator is a defensible member of that standard family; PathTS's Beta-Bernoulli is the nearest published alternative and is **incompatible with our F10 all-success invariant** (any proper Beta prior makes all-success cost depend on n — exactly the property V2.3 §2.3 proves and rejects).

## 10. Manufacturing planning prior art

Chain coverage, honestly assessed:

| Stage | Open-source coverage | Evidence |
|---|---|---|
| CAD authoring | **strong** | CadQuery, build123d, FreeCAD |
| Feature recognition | **research-grade** | AAGNet (MIT), MFTReNet (MIT), FeatureNet (GPL-3.0), CADNet (no license) |
| Process selection | **weak / none found** | no maintained repo located |
| Operation sequencing | **weak / none found** | academic papers only |
| Machine / tool / fixture selection | **weak / none found** | — |
| Toolpath / CAM | **moderate** | FreeCAD CAM (LGPL-2.1), opencamlib (LGPL-2.1, last push 2025-02-12) |
| Scheduling | **strong** | OR-Tools CP-SAT, TU/e benchmark |
| Shop-floor execution | **licence-gated or immature** | carbon/OpenMes AGPL; factorysemantics 1★ |

## 11. CAD / engineering agent prior art

2026 work (ToolCAD, Clarify-Before-You-Draw, CAD-Judge, Zero-to-CAD) converges on: LLM emits a CAD program (CadQuery/OpenSCAD), a tool executes it, a judge verifies morphology. All are **paper+code-in-progress**; none was source-verified here. The reusable insight is the **verification loop**, which matches Velith's ownership.

## 12. Robotics / digital twin prior art

OMPL (BSD-3) for sampling-based planning; MoveIt 2 (BSD-3) for the pipeline; Drake (BSD-3) for dynamics and optimization; compas_fab (MIT) for fabrication-oriented robot planning. DES for factory twins: SimPy, Ciw (MIT), salabim (license unclear). All **METADATA-ONLY**.

## 13. Reuse candidates

`google/or-tools` (R3), `CadQuery/cadquery` (R3), `gumyr/build123d` (R3), `ompl/ompl` (R3), `moveit/moveit2` (R4 for Mini Prometheus execution), `RobotLocomotion/drake` (R3), `ai-for-decision-making-tue/Job_Shop…` (R2 benchmark corpus), `CiwPython/Ciw` (R3), `compas-dev/compas_fab` (R2), `whjdark/AAGNet` (R2, research code).

## 14. Reference-only candidates

Soar, hyperon-experimental, neural-astar, PathUCB/PathTS (no code), Min-Exp-Cost-Path, PHIL, ICM, Letta/mem0/Graphiti/cognee (as designs, not substrates), text-to-CAD 2026 line.

## 15. License-blocked candidates

| Project | License | Consequence |
|---|---|---|
| `crbnos/carbon` | AGPL-3.0 | network copyleft; unusable as a linked component in a closed product |
| `Mes-Open/OpenMes` | AGPL-3.0 | same |
| `opencog/atomspace` | AGPL-3.0 | same |
| `zibozzb/FeatureNet` | GPL-3.0 | viral for linked use; weights/data licensing separately **UNVERIFIED** |
| `AndrewColligan/CADNet` | **no LICENSE file** | no grant of rights → not usable |
| `gabejohnsnn/OpenMRP-System` | **no LICENSE file** | not usable |
| `openai/random-network-distillation` | **no LICENSE file**, archived | not usable |
| `salabim/salabim` | **no LICENSE at HEAD** | LICENSE-UNCLEAR pending resolution |
| FreeCAD, opencamlib, Odoo | LGPL-2.1 / LGPL-3.0 | usable with dynamic-linking and notice obligations; **legal review required** |

## 16. Do-not-rebuild candidates

See [`DO_NOT_REBUILD.md`](DO_NOT_REBUILD.md).

## 17. Do-not-trust candidates

See [`DO_NOT_TRUST.md`](DO_NOT_TRUST.md).

## 18. Genuine build-from-scratch areas

1. **The traversal-evidence boundary and its isolation contract** (already built, `4fb5c74`). No external equivalent found: agent-memory frameworks store *facts*, not provenance-isolated outcome counters.
2. **FutureScore V2.3 as specified** — expected-attempts cost from a post-outcome record, with the all-success invariant. The nearest published estimator (Beta-Bernoulli) violates F10.
3. **The falsification harness**: preregistration, mutation controls, seed governance, lineage notes. Nothing comparable found as maintained software.
4. **CAPP middle of the chain**: process selection, operation sequencing, machine/tool/fixture selection.
5. **The Velith verification layer** for generated CAD (validity, manufacturability, intent conformance).

## 19. Architecture compatibility analysis

| Candidate | Layer | Consumes | Produces | Constitution check |
|---|---|---|---|---|
| OR-Tools CP-SAT | Mini Prometheus (external dep) | model: ops, machines, constraints | schedule | OK — solver, no domain logic imported |
| CadQuery / build123d | Velith (external dep) | parametric program | B-rep/STEP | OK |
| OMPL / MoveIt / Drake | Mini Prometheus execution (Velith may consume geometry) | scene, kinematics | trajectories | OK if geometry stays in Velith and execution in Mini Prometheus |
| AAGNet | Velith | STEP/B-rep | feature labels | OK — but research code, needs re-verification |
| TU/e job-shop benchmark | Mini Prometheus | instances | baselines/metrics | OK — evaluation only |
| Letta / mem0 / Graphiti | Noetica (substrate only) | agent events | retrieval | **Risk of drift**: adopting their memory *model* would import untested cognitive commitments that belong to MiniFlyWire's validation path |
| Soar, OpenCog | none | — | — | reference only |

No candidate may move mechanism ownership across the DAG. In particular, **nothing from this audit should enter MiniFlyWire**: MiniFlyWire is a research lab, not production infrastructure.

## 20. Proposed reuse boundaries

- **Velith ← CAD:** depend on CadQuery/build123d **behind a Velith-owned geometry interface**; never expose OCCT types across the boundary.
- **Mini Prometheus ← solver:** depend on OR-Tools **behind a Mini-Prometheus-owned scheduling model**; the model, not the solver, is ours.
- **Mini Prometheus ← benchmark:** use TU/e instances as an **evaluation corpus only**, never as runtime code.
- **Noetica ← memory substrate:** if adopted at all, wrap as a storage driver behind Noetica's own memory contract.
- **MiniFlyWire:** no external dependency. Its value is the controlled experiment, which a dependency would contaminate.

## 21. Risks

1. **Copyleft contamination** — AGPL MES/ERP systems are the most attractive-looking and the most dangerous.
2. **Research-code decay** — CADNet (2021), FeatureNet (2019), RND (archived 2020) are unmaintained; adopting them imports dead code.
3. **Dependency weight** — Drake (415 MB), FreeCAD (2.7 GB), OR-Tools (1.3 GB) are heavy; vendoring decisions matter.
4. **Supply chain** — **not audited at source level** in this pass: install scripts, telemetry, model-download behaviour and transitive dependencies are all **UNVERIFIED**. No dependency should be adopted on this audit alone.
5. **Architecture drift by convenience** — agent-memory frameworks bundle a cognitive model with their storage; taking both would bypass MiniFlyWire's validation path.

## 22. Missing searches / uncertainty

- **Not searched:** FEA/CFD solvers (FEniCS, SU2, Elmer, CalculiX); GD&T/tolerance analysis; STEP AP242 / QIF / MTConnect standards repos; PLM; metrology; assembly sequence planning specifically; additive-manufacturing slicing.
- **Not verified at source level:** tests, CI, benchmark reproducibility for **every** repository in §4 except where a specific file is named. All capability claims are therefore **UNVERIFIED** in the strict sense of §25.
- **Unresolved licenses:** salabim (no LICENSE at HEAD), OCCT's exact terms, model/dataset licenses for AAGNet/MFInstSeg, FeatureNet datasets.
- **API budget** (60 req/h unauthenticated) capped depth; an authenticated pass would allow per-repo test/CI inspection.

## 23. Final evidence-based recommendations

1. **Do not reopen FutureScore.** The audit strengthens V2.3: the reset-vs-retry distinction is independently confirmed in the literature, and our failure model implies our cost model.
2. **Record the estimator honestly**: Beta-Bernoulli/UCB are the standard learned-reliability estimators; our additive smoothing is a member of that family chosen for the F10 invariant, not an invention.
3. **Before any adoption**, run a focused supply-chain and test-level pass on the three or four candidates that survive (§21.4). This audit is sufficient to *shortlist*, not to *adopt*.
4. **Treat AGPL candidates as blocked** unless the Director accepts network copyleft.
5. **Keep MiniFlyWire dependency-free.**
