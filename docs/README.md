# Documentation index

Where each document lives, and which requested documents are not written yet.

**Start here:** [`engineering/PROJECT_STATE.md`](engineering/PROJECT_STATE.md) for where work stands, then
[`architecture/COGNITIVE_ARCHITECTURE.md`](architecture/COGNITIVE_ARCHITECTURE.md) for the design and
[`engineering/IMPLEMENTATION_ROADMAP.md`](engineering/IMPLEMENTATION_ROADMAP.md) for the plan.

Status of results is recorded in [`VERIFICATION_STATUS.md`](VERIFICATION_STATUS.md) (legacy agent) and
[`COGNITIVE_MILESTONE_ROADMAP.md`](COGNITIVE_MILESTONE_ROADMAP.md) (testbed gates).

## Research

| Document | Where | State |
|---|---|---|
| Cognitive architecture comparison | [`research/COGNITIVE_ARCHITECTURE_COMPARISON.md`](research/COGNITIVE_ARCHITECTURE_COMPARISON.md) | Written |
| Learning mechanisms | [`research/LEARNING_MECHANISMS_RESEARCH.md`](research/LEARNING_MECHANISMS_RESEARCH.md) | Written; every citation unverified |
| Memory systems | [`research/MEMORY_SYSTEMS_RESEARCH.md`](research/MEMORY_SYSTEMS_RESEARCH.md) | Written |
| Evidence ledger | [`research/RESEARCH_EVIDENCE_LEDGER.md`](research/RESEARCH_EVIDENCE_LEDGER.md) | Written; 13 of 55 study folders verified from primary files |
| Negative findings | [`research/NEGATIVE_FINDINGS.md`](research/NEGATIVE_FINDINGS.md) | Written |
| File coverage manifest | [`research/FILE_COVERAGE_MANIFEST.md`](research/FILE_COVERAGE_MANIFEST.md) | Written |
| Existing systems audit (legacy runtime) | [`research/EXISTING_SYSTEMS_AUDIT.md`](research/EXISTING_SYSTEMS_AUDIT.md) | Partial |
| Earlier research review and handbook | [`COGNITIVE_RESEARCH_REVIEW.md`](COGNITIVE_RESEARCH_REVIEW.md), [`COGNITIVE_ARCHITECTURE_HANDBOOK.md`](COGNITIVE_ARCHITECTURE_HANDBOOK.md), [`COGNITIVE_AUDIT.md`](COGNITIVE_AUDIT.md) | Written 2026-11-07 |
| Neuroscience computational map | `research/NEUROSCIENCE_COMPUTATIONAL_MAP.md` | **Not written** (stream interrupted) |
| Reasoning, planning and metacognition | `research/REASONING_PLANNING_METACOGNITION_RESEARCH.md` | **Not written** (stream interrupted) |
| Open-source reuse registry | `research/OPEN_SOURCE_REUSE_REGISTRY.md` | **Not written**; the earlier [`research/external/REUSE_CANDIDATE_REGISTRY.md`](../research/external/REUSE_CANDIDATE_REGISTRY.md) covers part |
| Sibling projects (Noetica, Velith, Mini Prometheus) | `research/SIBLING_PROJECTS_AUDIT.md` | **Not written**; those repositories have not been audited |
| Global research map; research gaps | — | **Not written**; they are summaries of the files above and wait for the four missing ones |

## Architecture

| Document | Where | State |
|---|---|---|
| Cognitive architecture, data flow, memory, decision and control, node and graph specification | [`architecture/COGNITIVE_ARCHITECTURE.md`](architecture/COGNITIVE_ARCHITECTURE.md) (§3, §4, §5, §6, §7) | Written as one file |
| Architecture decisions | [`architecture/ARCHITECTURE_DECISIONS.md`](architecture/ARCHITECTURE_DECISIONS.md) | Written; independent review pending |
| Runtime call graph (legacy) | [`architecture/RUNTIME_CALL_GRAPH.md`](architecture/RUNTIME_CALL_GRAPH.md) | Partial |

## Experiments

| Document | Where | State |
|---|---|---|
| Hypothesis registry, experiment plan, benchmark specification, baselines, ablations, statistical plan | [`experiments/HYPOTHESIS_REGISTRY.md`](experiments/HYPOTHESIS_REGISTRY.md) (§1–§5) | Written as one file |
| Protocol and metrics | [`COGNITIVE_EXPERIMENT_PROTOCOL.md`](COGNITIVE_EXPERIMENT_PROTOCOL.md), [`COGNITIVE_METRICS.md`](COGNITIVE_METRICS.md) | Written 2026-11-07 |

## Engineering

| Document | Where | State |
|---|---|---|
| Project state | [`engineering/PROJECT_STATE.md`](engineering/PROJECT_STATE.md) | Current |
| Implementation roadmap, migration | [`engineering/IMPLEMENTATION_ROADMAP.md`](engineering/IMPLEMENTATION_ROADMAP.md); migration in the architecture file §7 | Written |
| Module dependency map (legacy) | [`engineering/MODULE_DEPENDENCY_MAP.md`](engineering/MODULE_DEPENDENCY_MAP.md) | Partial |
| Testing and verification | [`../cognitive/README.md`](../cognitive/README.md), `npm test`, and each `experiments/cf*/GATE_SPEC.md` | No separate file |
| Performance plan | Roadmap milestones M4 and M8 | No separate file |
