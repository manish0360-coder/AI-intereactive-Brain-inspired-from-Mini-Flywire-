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
| Tests | `npm test` 136/136; legacy gate `experiments/phase1_0/verify_S2.js` 14/14 |
| Push rule | No push without the owner's explicit word |

## Done in this programme

| Date | Work | Result |
|---|---|---|
| 2026-11-13 | **CF-03b** world model v2 (`cognitive/mind/`) | **PASS** on 20 fresh `gate3b` worlds: ECE 0.028 against 0.05 (v1 0.104); DYNAQ − MBVI2 on E3 +171.0 [52.3, 317.5]; no regression. Calibration did not improve task performance. Freeze `1968083`, results `4e310b0` |
| 2026-11-14 | **CF-04** hidden-change task E4 and reliability arbitration (`cognitive/mind/arb/`), 55 fresh worlds | **ARBITRATION NOT SUPPORTED — HARMFUL.** The task is admitted (+160.7 steps without change detection). Planner − ARB = −13.8 [−20.0, −7.2]; ARB is also worse than random switching. Arbitration is not built into the agent. Freeze `2ae0311`; results in the commit after it |
| 2026-11-14 | **CF-03c** world model v3 (`cognitive/mind/v3/`): two v2 defects repaired, then tested on four unseen reliability families | **PARTIAL.** Repairs hold. Criteria held in BIMODAL only; a per-pair Laplace forecaster beats the model on WIDE and ARCSINE, a constant forecaster beats it on HIGH. The calibration claim stays limited to the development generator. Freeze `2821603`, results `ddbe5f3` |
| 2026-11-14 | Evidence ledger verified from primary records; sibling projects audited | 54 of 55 study folders read (`experiments/m7` has no tracked result file). Siblings: keep independent, reuse patterns only. Commit `9e4631b` |
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

**CF-05 preparation, in progress (2026-11-14).** The Gemini review was received, lodged and reconciled
(`research/external/CF03C_CF04_GEMINI_REVIEW_RECONCILIATION.md`, commit `572c0a5`); the hold below is lifted by
the owner's instruction to proceed. Done so far, commit `6bdd9e7`: Dyna-Q+ count-model baseline
(`cognitive/baselines/`), two recovery candidates BONUS and DECAY (`cognitive/mind/v4/`), registry v5, tests
(146/146). **Remaining, in order:** (1) the dev-domain grid on task E4, three settings each for Dyna-Q+, BONUS
and DECAY, both arms (the script used is outside the repository; rerun it if its output is lost); (2) choose one
setting per family by the same rule (lowest total steps over the CHANGE and SHAM arms); (3) write
`experiments/cf05/GATE_SPEC.md` and `run_gate.mjs`; (4) **present the specification to the owner for review before
freezing**; (5) freeze, run once on a new domain (`gate5`), record, independent verification. No candidate enters
any agent path unless the gate shows a measurable improvement.

*Superseded hold, kept for the record:* **HOLD (owner's instruction, 2026-11-14): CF-05 is not to be designed, frozen or run until an independent
Gemini review of CF-03c and CF-04 has been received and considered.** The complete bundle for that review is
`research/external/CF03C_CF04_GEMINI_REVIEW_BUNDLE.md` (cover and questions, statistical power, internal review,
then the frozen specifications, results and source code verbatim with hashes). The owner relays it to Gemini and
brings the reply back. When the reply arrives: record it with responses in
`docs/architecture/ARCHITECTURE_DECISIONS.md`, amend any results record by a dated amendment (never by editing),
and only then decide the next experiment — which may not be CF-05.

**Proposed, pending that review: CF-05 — recovery after a change is reversed.**
CF-04 measured where the planner still loses: after a block is removed it is 40.1 steps behind the reference
[32.5, 48.1] because it re-tests the reopened exit in 0.9 of 15 episodes. Steps:

1. Build the stronger baseline first: Dyna-Q+ with a count model (`cognitive/agents/dynaq_plus.mjs`), so a
   re-testing mechanism is compared with the textbook one.
2. Design on `dev`: a bonus for exits not tried recently, inside the planner's value computation. Task E4 already
   measures it (`return` window; the sham arm measures its cost).
3. Freeze `experiments/cf05/GATE_SPEC.md`; run once on a new domain.

Independent of this and waiting only on the owner: the legacy-agent comparison (needs authorisation to touch
`main.js`).

What the testbed agent is today, by evidence: a learned model with pooled priors and change detection (v3),
planned over by value iteration (MBVI3). Arbitration, working memory, episodic memory and transfer have no
evidence; arbitration has evidence against it at this scale.

Earlier wording of the previous step, kept for reference: build `cognitive/testbed/task_e4.mjs`
(stochastic edges, a distal change the agent must discover, a sham-change control) and its admission gate
`experiments/cf04a/`. Calibrate the horizon on `dev` worlds first; the COG-A study failed its precondition at
1,500 steps. In parallel, **M1 — stronger baselines** (Dyna-Q+ with a count model, posterior sampling).
