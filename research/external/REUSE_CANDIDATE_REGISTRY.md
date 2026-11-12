# Reuse Candidate Registry

Read-only inventory. **Decision codes:** R0 ignore · R1 reference · R2 adapt · R3 direct dependency · R4 integrate · R5 do not use.
All metadata API-verified 2026-09-20. **Commit column:** this pass pinned licenses at `HEAD` (via `raw.githubusercontent.com/<repo>/HEAD/LICENSE`); exact commit SHAs were **not** pinned — recorded as `HEAD@2026-09-20`. Pinning SHAs is a prerequisite of any adoption decision.
**Evidence column** states what was actually checked. `METADATA` = API fields only; capability claims **UNVERIFIED**.

| ID | Capability | Repository | Commit | License | Decision | Layer | Component | Evidence | Risk |
|---|---|---|---|---|---|---|---|---|---|
| C-01 | CP/MIP scheduling solver | google/or-tools | HEAD@2026-09-20 | Apache-2.0 (API) | R3 | Mini Prometheus | CP-SAT via `ortools.sat.python.cp_model`; `examples/python/flexible_job_shop_sat.py` | METADATA + example path from vendor docs | 1.3 GB dep; model quality is ours, not the solver's |
| C-02 | Parametric CAD scripting | CadQuery/cadquery | HEAD@2026-09-20 | **Apache-2.0 (LICENSE read)** | R3 | Velith | Python→OCCT B-rep API | METADATA + LICENSE blob | blog/README claims LGPLv3 — contradicted; OCCT terms UNVERIFIED |
| C-03 | Parametric CAD scripting | gumyr/build123d | HEAD@2026-09-20 | Apache-2.0 (API) | R3 | Velith | context-manager CAD API | METADATA | overlaps C-02; pick one |
| C-04 | CAD app + CAM | FreeCAD/FreeCAD | HEAD@2026-09-20 | LGPL-2.1 (API) | R2 | Velith | CAM/Path workbench, post-processors | METADATA | 2.7 GB; LGPL notice/linking obligations |
| C-05 | Toolpath geometry | aewallin/opencamlib | HEAD@2026-09-20 | LGPL-2.1 (API) | R2 | Mini Prometheus | drop-cutter / waterline kernels | METADATA; last push 2025-02-12 | low activity |
| C-06 | Machining feature recognition | whjdark/AAGNet | HEAD@2026-09-20 | MIT (API) | R2 | Velith | gAAG B-rep encoder + multi-task heads | METADATA; last push 2024-12-16 | research code; dataset licenses UNVERIFIED |
| C-07 | Machining feature recognition | xmy2000/MFTReNet | HEAD@2026-09-20 | MIT (API) | R1 | Velith | instance seg + topological relations | METADATA; 19★ | very small project |
| C-08 | Machining feature recognition | zibozzb/FeatureNet | HEAD@2026-09-20 | **GPL-3.0** | R5 | — | 3D-CNN feature classifier | METADATA; last push 2019 | viral license + abandoned |
| C-09 | Machining feature recognition | AndrewColligan/CADNet | HEAD@2026-09-20 | **NONE** | R5 | — | graph B-rep model | METADATA; no LICENSE at HEAD | no rights granted |
| C-10 | Scheduling benchmark corpus | ai-for-decision-making-tue/Job_Shop_Scheduling_Benchmark_Environments_and_Instances | HEAD@2026-09-20 | MIT (LICENSE read) | R2 | Mini Prometheus | JSP/FSP/FJSP/AJSP instances + baselines | METADATA + LICENSE blob + arXiv:2308.12794 | evaluation corpus only, not runtime |
| C-11 | Sampling-based motion planning | ompl/ompl | HEAD@2026-09-20 | BSD-3 (LICENSE read) | R3 | Mini Prometheus | planner library | METADATA + LICENSE blob | no collision checking included |
| C-12 | Motion planning pipeline | moveit/moveit2 | HEAD@2026-09-20 | BSD-3 (API) | R4 | Mini Prometheus | planning pipeline, scene, IK | METADATA | ROS 2 coupling |
| C-13 | Dynamics / optimization | RobotLocomotion/drake | HEAD@2026-09-20 | BSD-3 (`LICENSE.TXT` read) | R3 | Velith (physics) / MP (execution) | multibody + solvers | METADATA + LICENSE blob | 415 MB; steep API |
| C-14 | Robotic fabrication planning | compas-dev/compas_fab | HEAD@2026-09-20 | MIT (API) | R2 | Mini Prometheus | fabrication planning bridge | METADATA | small community |
| C-15 | Discrete-event simulation | CiwPython/Ciw | HEAD@2026-09-20 | MIT (API) | R3 | Mini Prometheus | DES engine, reproducible seeds | METADATA | queueing-oriented |
| C-16 | Discrete-event simulation | salabim/salabim | HEAD@2026-09-20 | **UNCLEAR (no LICENSE at HEAD)** | R5 pending | Mini Prometheus | DES + animation | METADATA + failed LICENSE lookup | license must be resolved first |
| C-17 | RL baselines | DLR-RM/stable-baselines3 | HEAD@2026-09-20 | MIT (API) | R1 | MiniFlyWire (reference) / MP (scheduling RL) | tested RL algorithms | METADATA | MiniFlyWire must stay dependency-free |
| C-18 | Cognitive architecture | SoarGroup/Soar | HEAD@2026-09-20 | BSD-2 (LICENSE.md read) | R1 | — | episodic/semantic/procedural memory | METADATA + LICENSE blob | architecture, not a harness |
| C-19 | Hypergraph knowledge store | opencog/atomspace | HEAD@2026-09-20 | **AGPL-3.0 (LICENSE read)** | R5 | — | AtomSpace | METADATA + LICENSE blob | network copyleft |
| C-20 | AGI substrate (successor) | trueagi-io/hyperon-experimental | HEAD@2026-09-20 | MIT (API) | R1 | — | MeTTa runtime | METADATA | experimental |
| C-21 | Curiosity / ICM | pathak22/noreward-rl | HEAD@2026-09-20 | MIT (LICENSE read) | R1 | — | ICM implementation | METADATA + LICENSE blob | curiosity excluded by our frozen contracts |
| C-22 | Curiosity / RND | openai/random-network-distillation | HEAD@2026-09-20 | **NONE**, ARCHIVED | R5 | — | RND | METADATA; archived 2020-10-01 | no rights; abandoned |
| C-23 | Agent memory server | letta-ai/letta | HEAD@2026-09-20 | Apache-2.0 (API) | R1 | Noetica (substrate only) | memory service | METADATA | imports a memory *model*, not just storage |
| C-24 | Agent memory | mem0ai/mem0 | HEAD@2026-09-20 | Apache-2.0 (API) | R1 | Noetica (substrate only) | memory layer | METADATA | same |
| C-25 | Temporal graph memory | getzep/graphiti | HEAD@2026-09-20 | Apache-2.0 (API) | R2 | Noetica | temporal KG + fact provenance | METADATA | closest to our provenance needs; unverified |
| C-26 | Memory / KG pipeline | topoteretes/cognee | HEAD@2026-09-20 | Apache-2.0 (API) | R1 | Noetica | ingestion→KG pipeline | METADATA | heavy |
| C-27 | Durable agent graphs | langchain-ai/langgraph | HEAD@2026-09-20 | MIT (API) | R1 | Noetica | checkpointed graph execution | METADATA | framework lock-in risk |
| C-28 | Differentiable A* | omron-sinicx/neural-astar | HEAD@2026-09-20 | MIT (LICENSE read) | R1 | MiniFlyWire (reference) | learned guidance map | METADATA + LICENSE blob | learns search guidance, not edge cost |
| C-29 | ERP/MES/QMS | crbnos/carbon | HEAD@2026-09-20 | **AGPL-3.0 (LICENSE read)** | R5 | — | MES/MRP/scheduling | METADATA + LICENSE blob | network copyleft |
| C-30 | MES | Mes-Open/OpenMes | HEAD@2026-09-20 | **AGPL-3.0 (API)** | R5 | — | production tracking | METADATA | copyleft; PHP stack |
| C-31 | Agent-native MES | factorysemantics/factorysemantics-mes | HEAD@2026-09-20 | Apache-2.0 (API) | R1 | — | OPC UA → OEE, MCP surface | METADATA; **1★** | unproven |
| C-32 | MRP | gabejohnsnn/OpenMRP-System | HEAD@2026-09-20 | **NONE** | R5 | — | MRP web app | METADATA; 3★ | no license |
| C-33 | ERP platform | odoo/odoo | HEAD@2026-09-20 | LGPL-3.0 (LICENSE read) | R1 | — | manufacturing module | METADATA + LICENSE blob | 17 GB; enterprise edition separately licensed |
| P-01 | Expected-cost-until-success planning | arXiv:1802.00898 (paper-only) | n/a | n/a | R1 | MiniFlyWire | Min-Exp-Cost-Path formulation | abstract read | probabilities assumed known, not learned |
| P-02 | Learned edge reliability + path selection | arXiv:2607.15440 (paper-only, **no code**) | n/a | n/a | R1 | MiniFlyWire | PathUCB / PathTS estimators, `w=−log p̂` | HTML read; estimator formulas extracted | reset-on-failure objective ≠ our retry-in-place |
| P-03 | Competence-aware traversal probabilities | arXiv:2109.13974 (paper) | n/a | n/a | R1 | MiniFlyWire | per-edge success probability updated in deployment | abstract read | robot-perception framing |
| P-04 | Learned A* heuristics | arXiv:2212.03978 / 2204.08938 | n/a | n/a | R1 | MiniFlyWire | learned heuristic for terminal estimates | abstract read | our terminal is structurally fixed by V2.3 |
