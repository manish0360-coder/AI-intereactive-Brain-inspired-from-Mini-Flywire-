# Cognitive Risks, Limitations and Non-Goals

Part of the cognitive research package ([handbook](COGNITIVE_ARCHITECTURE_HANDBOOK.md)).

## 1. Scientific risks

| Risk | Consequence | Mitigation |
|---|---|---|
| Tasks discriminate trivially | A "cognitive" result reduces to Dyna versus Q on a toy graph | Claims are made only relative to the strongest simpler baseline: CF-03 must beat DYNAQ, not only QL |
| Tasks fail to discriminate | No instrument | The admission gate (protocol §4); task redesign is its own milestone; the result is reported as PARTIAL |
| Benchmark overfitting | Mechanisms are tuned to the battery | Dev/gate/confirm domains; parameters frozen before gate runs; new worlds per milestone |
| Small graphs inflate effects | No generalisation to larger worlds | Report effect sizes with world size; add a larger-world family before CF-08 |
| Goal-cue semantics give model-based agents an edge | E1 conflates model use with task instructions | CD-005 declares it; E3 is uncued |
| Deterministic tasks hide uncertainty mechanisms | Calibration and change detection go untested | E4 and the stochastic variants in CF-03/04 |
| Horizon too short for propagation effects | A repeat of COG-A P2 | Calibrate on dev worlds first (E4 prerequisite) |
| Confirmation bias in metric choice | Post hoc wins | One primary contrast per task, declared before the run |
| Over-reading CF-00 ablations | n = 3 seeds | They are labelled descriptive; no ablation difference is interpreted |

## 2. Engineering risks

| Risk | Mitigation |
|---|---|
| Leakage through shared modules or globals | Import-isolation and globals tests, each paired with mutants |
| Non-determinism (clock, Map order, floating point) | No clock reads; ordered iteration; two-run hash gate |
| Legacy integration reintroduces oracles | CF-07 static check: no agent read of visual or world objects; MAP-OFF hook audited |
| Two environment codebases (COG-A, testbed) drift | COG-A frozen as historical; new work uses only the testbed |
| Production edits conflict with TC-2/AC38 governance | No production edit before CF-02 MAP-OFF/CF-07, and those need Director authorisation |

## 3. Limitations of this package

- The audit covers HEAD `6b7bac0` (runtime unchanged since `952c9fc`), one graph, one goal and 3,000-step cold sessions.
- Several citations are marked [K] (not re-checked this session) in `COGNITIVE_RESEARCH_REVIEW.md`.
- CF-01's gate is a development gate, not a confirmatory test. Its commits are local, not remote-verified.
- Nothing in this package has been independently reproduced.

## 4. Explicit non-goals

- No claim of AGI, consciousness, human-level intelligence or biological equivalence.
- No anatomical naming of modules as evidence of function.
- No redesign of the four-layer architecture MiniFlyWire → Noetica → Velith → Mini Prometheus.
- No deletion of legacy modules. They remain in the application until a validated replacement exists behind a flag.
- No framework or LLM dependency in the lab.
- No change to AC38, TC-2, their gates, trees or authorisation records.
