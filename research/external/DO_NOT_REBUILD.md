# Do Not Rebuild

Capabilities where a sufficiently mature reusable implementation exists. **This is shortlisting guidance, not an adoption decision.** Every entry still requires the verification listed in its last column before it may be depended on. Metadata API-verified 2026-09-20; licenses marked "(read)" were confirmed by reading the LICENSE blob at HEAD.

---

## 1. Constraint / scheduling solving

- **Capability:** job-shop, flexible job-shop, resource-constrained scheduling; general CP/MIP.
- **Project:** [google/or-tools](https://github.com/google/or-tools) · HEAD@2026-09-20 · **Apache-2.0** · 14075★ · pushed 2026-09-20.
- **Exact reusable component:** CP-SAT via `ortools.sat.python.cp_model`; the vendor's `examples/python/flexible_job_shop_sat.py` is the canonical FJSP formulation.
- **Why reusable:** permissive license, active development, competition-grade solver. Writing our own CP/SAT solver would be a multi-year detour with no research value to our roadmap.
- **Integration boundary:** Mini Prometheus owns the *model* (operations, machines, constraints, objectives); OR-Tools is an interchangeable solver behind that model. No OR-Tools type crosses a layer boundary.
- **Known limitations:** solution quality depends on our formulation, not on the solver; 1.3 GB repository; solver is C++ with Python bindings.
- **Verification required before adoption:** pin a release tag; confirm transitive dependency licenses; benchmark our formulation against the TU/e instance corpus.

## 2. Parametric CAD authoring (B-rep)

- **Capability:** programmatic solid modelling and STEP/B-rep output.
- **Projects:** [CadQuery/cadquery](https://github.com/CadQuery/cadquery) · **Apache-2.0 (read)** · 5801★ · pushed 2026-09-13 · and [gumyr/build123d](https://github.com/gumyr/build123d) · Apache-2.0 · 3163★ · pushed 2026-09-19.
- **Why reusable:** both are permissive, active, and wrap OCCT — the same kernel under FreeCAD. Writing a B-rep kernel is out of the question; writing another Python wrapper is unjustified.
- **Note on evidence:** a widely cited blog states CadQuery is LGPLv3. **The LICENSE file at HEAD says Apache-2.0.** Trust the file.
- **Integration boundary:** Velith owns a geometry interface; OCCT/CadQuery types never leak across it.
- **Known limitations:** the two projects overlap — choose one; **OCCT's own license terms were not verified in this audit**.
- **Verification required:** resolve OCCT licensing; pin versions; decide CadQuery vs build123d on API fit, not popularity.

## 3. Sampling-based motion planning

- **Capability:** collision-free trajectory planning for manipulators and mobile bases.
- **Projects:** [ompl/ompl](https://github.com/ompl/ompl) · **BSD-3 (read)** · 2152★ · pushed 2026-09-14; [moveit/moveit2](https://github.com/moveit/moveit2) · BSD-3 · pushed 2026-09-16; [RobotLocomotion/drake](https://github.com/RobotLocomotion/drake) · **BSD-3 (`LICENSE.TXT` read)** · pushed 2026-09-20.
- **Why reusable:** decades of algorithm work, permissive licenses, active maintenance.
- **Integration boundary:** Mini Prometheus owns execution planning; Velith may supply geometry. OMPL alone has **no collision checking** — that comes from MoveIt or a separate checker.
- **Verification required:** ROS 2 coupling cost for MoveIt; Drake's 415 MB footprint; confirm which collision checker is in play.

## 4. Scheduling benchmark corpus

- **Capability:** standard instances and baselines for JSP/FSP/FJSP/AJSP, including SDST and online-arrival variants.
- **Project:** [ai-for-decision-making-tue/Job_Shop_Scheduling_Benchmark_Environments_and_Instances](https://github.com/ai-for-decision-making-tue/Job_Shop_Scheduling_Benchmark_Environments_and_Instances) · **MIT (read)** · 206★ · pushed 2026-08-15 · arXiv:2308.12794.
- **Why reusable:** building an instance corpus and baseline set from scratch would produce numbers nobody can compare against.
- **Integration boundary:** **evaluation only.** Instances and baseline scores enter our benchmarks; none of its code enters runtime.
- **Verification required:** confirm instance provenance against the published paper; check baseline reproducibility on one instance family.

## 5. Discrete-event simulation

- **Capability:** factory/production DES for digital-twin work.
- **Project:** [CiwPython/Ciw](https://github.com/CiwPython/Ciw) · MIT · 175★ · pushed 2025-12-05. (SimPy is the other standard option; **not API-verified in this pass** because it is not GitHub-primary.)
- **Why reusable:** DES engines are well-understood infrastructure with an explicit reproducibility story in Ciw's case.
- **Integration boundary:** Mini Prometheus owns the factory model; the DES engine is a dependency.
- **Known limitations:** Ciw is queueing-network oriented; manufacturing-specific abstractions are ours to build.
- **Verification required:** confirm seed-level reproducibility claims by running one model twice; compare against SimPy for fit.
- **Explicitly excluded:** `salabim/salabim` — **no LICENSE file at HEAD**, so its license is unresolved despite being a good technical fit.

## 6. Machining feature recognition (adapt, not depend)

- **Capability:** B-rep → machining feature labels, the first stage of CAPP.
- **Project:** [whjdark/AAGNet](https://github.com/whjdark/AAGNet) · MIT · 170★ · pushed 2024-12-16.
- **Why listed:** it is the most complete recent open implementation (gAAG representation, multi-task segmentation, MFCAD/MFCAD++/MFInstSeg evaluation). Re-deriving the representation and dataset pipeline would cost months.
- **Integration boundary:** Velith, as an adapted component (R2), not a dependency — it is research code, not a maintained library.
- **Known limitations:** last push 2024-12-16; **dataset/model-weight licenses UNVERIFIED**; reported accuracy **UNVERIFIED** (no source-level test inspection in this pass).
- **Verification required:** reproduce one reported metric; confirm dataset licenses; assess code quality at source level.

---

## Not on this list, deliberately

- **Agent memory frameworks** (Letta, mem0, Graphiti, cognee) — they are mature, but each bundles a *memory model* with its storage. Noetica may adopt one as a substrate only after MiniFlyWire has validated the mechanism it would serve.
- **Everything AGPL** (carbon, OpenMes, AtomSpace) — technically interesting, license-gated.
- **Anything in MiniFlyWire** — the lab stays dependency-free; a dependency would contaminate the controlled experiments that are its entire purpose.
