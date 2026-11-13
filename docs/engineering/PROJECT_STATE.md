# Project State

The single resume point for the cognitive programme. Update it at the end of every work session.
Results are recorded in [`docs/VERIFICATION_STATUS.md`](../VERIFICATION_STATUS.md) (legacy agent) and
[`docs/COGNITIVE_MILESTONE_ROADMAP.md`](../COGNITIVE_MILESTONE_ROADMAP.md) (testbed gates); this file records where
work stands. Document index: [`docs/README.md`](../README.md).

**Last updated:** 2026-11-13

## Repository

| Item | State |
|---|---|
| GitHub `main` | `0a5ef40` (pushed 2026-11-12), with 25 annotated tags |
| Local `main` | Ahead of GitHub by the CF-03b commits and the documentation commit. **Not pushed** |
| Tests | `npm test` 108/108; legacy gate `experiments/phase1_0/verify_S2.js` 14/14 |
| Push rule | No push without the owner's explicit word |

## Done in this programme

| Date | Work | Result |
|---|---|---|
| 2026-11-13 | **CF-03b** world model v2 (`cognitive/mind/`) | **PASS** on 20 fresh `gate3b` worlds: ECE 0.028 against 0.05 (v1 0.104); DYNAQ − MBVI2 on E3 +171.0 [52.3, 317.5]; no regression. Calibration did not improve task performance. Freeze `1968083`, results `4e310b0` |
| 2026-11-13 | Target architecture, decisions, hypothesis registry, roadmap | Written; see the index |
| 2026-11-13 | Research: architectures, learning, memory; evidence ledger and negative findings | Written |

## Research and audit streams

| Stream | Deliverable | State |
|---|---|---|
| Cognitive architectures | `research/COGNITIVE_ARCHITECTURE_COMPARISON.md` | Done |
| Learning mechanisms | `research/LEARNING_MECHANISMS_RESEARCH.md` | Done; citations unverified |
| Memory systems | `research/MEMORY_SYSTEMS_RESEARCH.md` | Done |
| Scientific record | `research/RESEARCH_EVIDENCE_LEDGER.md`, `NEGATIVE_FINDINGS.md`, `FILE_COVERAGE_MANIFEST.md` | Done; 13 of 55 study folders verified from primary files |
| Legacy runtime | `architecture/RUNTIME_CALL_GRAPH.md`, `research/EXISTING_SYSTEMS_AUDIT.md`, `engineering/MODULE_DEPENDENCY_MAP.md` | Partial; interrupted by the usage limit |
| Neuroscience | `research/NEUROSCIENCE_COMPUTATIONAL_MAP.md` | Not written |
| Reasoning, planning, metacognition | `research/REASONING_PLANNING_METACOGNITION_RESEARCH.md` | Not written |
| Open-source and benchmarks | `research/OPEN_SOURCE_REUSE_REGISTRY.md` | Not written |
| Sibling projects | `research/SIBLING_PROJECTS_AUDIT.md` | Not written; Noetica, Velith and Mini Prometheus are readable on disk but have not been audited |
| Independent falsification review | Appended to `architecture/ARCHITECTURE_DECISIONS.md` | See that file |

**Lesson on parallelism.** Nine agents at once exhausted the account's 5-hour usage limit within minutes, twice.
Run at most two or three at a time, and have each write its file early and extend it.

## Access inventory

Readable under `E:/Projects/OpenSourceLab/repos/`: `mini-flywire`, `Noetica-agent-lab`, `Velith`,
`Velith-research`, `mini-prometheus`, `mp-rm6-admission`, `mp-verify-ab8cc44`, `sfg_package`. Empty:
`AI MANUFACTURING`, `Dimension`, `research`.

## Decisions in force

See [`architecture/ARCHITECTURE_DECISIONS.md`](../architecture/ARCHITECTURE_DECISIONS.md), AD-1 … AD-10. In short:
build in `cognitive/`; two controllers with reliability arbitration; tasks before memory stores; calibrated belief
first; a node is a place, not a cognitive function.

## Waiting on the owner

1. **Push** of the local commits.
2. **Closure ruling** retiring nine unrun legacy studies (AD-10; a proposed D-045).
3. **Authorisation** for the legacy adapter's map-off hook in `main.js` (roadmap L1) and for app integration (M9).
4. An **erratum** for `experiments/coga/README.md`, which still calls ACQ-1 "SUPPORTED" against D-035.

## Next exact engineering milestone

**M2 — hidden-change tasks** ([roadmap](IMPLEMENTATION_ROADMAP.md)): build `cognitive/testbed/task_e4.mjs`
(stochastic edges, a distal change the agent must discover, a sham-change control) and its admission gate
`experiments/cf04a/`. Calibrate the horizon on `dev` worlds first; the COG-A study failed its precondition at
1,500 steps. In parallel, **M1 — stronger baselines** (Dyna-Q+ with a count model, posterior sampling).
