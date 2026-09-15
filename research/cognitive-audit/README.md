# MiniFlyWire — Phase 0 Cognitive Audit

**Date:** 2026-08-17 · **Scope:** read-only archaeology · **Repository state:** unmodified

This directory is the output of Phase 0 of the MiniFlyWire Cognitive Audit. It documents what the running system actually does, traced from `index.html` through every reachable module, with numerical evidence for every load-bearing claim.

No repository file outside this directory was created, modified, renamed, moved, or deleted. No git state was changed. No implementation code was written.

---

## Read in this order

| | Document | What it answers |
|---|---|---|
| 00 | [`00_METHOD_AND_SCOPE.md`](00_METHOD_AND_SCOPE.md) | What counts as evidence here, and what I could not check. |
| 01 | [`01_RUNTIME_MAP.md`](01_RUNTIME_MAP.md) | The actual per-tick execution path and where every computed quantity ends up. |
| 02 | [`02_COMPONENT_LEDGER.md`](02_COMPONENT_LEDGER.md) | All 30 cognitive components, classified with `file:line` evidence. |
| 03 | [`03_LOOP_AUDIT.md`](03_LOOP_AUDIT.md) | The cognitive loop, arrow by arrow: which arrows carry data. |
| 04 | [`04_FALSIFICATION_EVIDENCE.md`](04_FALSIFICATION_EVIDENCE.md) | Six executable probes + twelve trace findings, with verbatim output. |
| 05 | [`05_VERDICT.md`](05_VERDICT.md) | Is MiniFlyWire cognitive, and what is the minimum missing mechanism. |
| — | [`probes/`](probes/) | Probe sources. They import repository modules read-only. |

---

## Headline result

**MiniFlyWire is not cognitive.** It is a heuristic scoring function over a fully-observable static graph — Level 0–1 on the operational ladder. It does not reach Level 2, because both mechanisms that would constitute a model (look-ahead and learned value) are measurably severed from action selection.

**The blocking issue is not a missing module.** It is that the arrow `ACTION → OUTCOME` has no referent. Transitions are deterministic and known, reward is computable at decision time, and observability is total — so prediction error is structurally zero and there is nothing for belief, uncertainty, planning, or counterfactual reasoning to be *about*. The nine NOT-USED components are the fingerprint of that, not nine independent oversights.

**Minimum missing mechanism:** an environment with hidden structure — hidden per-edge transition probabilities and/or hidden reward — on the existing 20-node graph. Roughly 200 lines. Everything else in the specified loop becomes measurable the moment it exists, and nothing in the loop is measurable until it does.

---

## Component classification summary

| Status | Count | Components |
|---|---|---|
| EXISTS + WORKING | 4 | Representation, Embeddings, Action execution, Temporal transitions |
| EXISTS + PARTIAL | 11 | Memory, Retrieval, Decision scoring, Action selection, Q-learning, Learning, Exploration/exploitation, Goals, Curiosity, Confidence, Adaptation |
| CODE EXISTS BUT NOT USED | 9 | Beliefs, Uncertainty, Planning, Prediction, Prediction-error, Focus, Stress, Fatigue, Long-term learning |
| PLANNED/DOCUMENTED ONLY | 2 | Metacognition, Self-monitoring |
| MISSING | 3 | Perception, Counterfactual reasoning, Active information gathering |
| UNCLEAR | 1 | Situation/state representation |

---

## Defects, by consequence

| ID | Severity | Finding | Evidence |
|---|---|---|---|
| **D1** | **Critical** | Q-key namespace split: RL writes `"pos#goal->act"`, scoring reads `"pos->act"`. 500 updates → 0 readable. `dampQ` erodes the teaching-derived values instead. | Probe A |
| **D2** | **Critical** | `futureScore` passes `neuron.id` (THREE Object3D counter) instead of `neuron.userData.id`. `futureBonus` ≡ 0 for all candidates. | Probe B |
| **D3** | **High** | Four sign inversions in `calculateDecisionScore`. `dangerPenalty` and `boredomPenalty` both **+2.0**; a path with `penalty=5` gains **+15** for being dangerous. | Probe C |
| **D4** | **Critical (architectural)** | Prediction error is tautological: 3 of 4 components structurally 0; composite ≡ 0.40 × internal-table disagreement. | Probe D |
| **D5** | High | Epsilon branch `return`s without writing `window.lastReasoning` → the agent re-executes the previous move; exploration is discarded. | F2 |
| **D6** | Medium | Executive controller: 0 influence on the 60% path (repo's own measurement, reproduced); 0.26% argmax flips on the 40% path. | Probe E |
| **D7** | Medium | Seven subsystems receive their only writes from the epsilon branch — i.e. only when the decision system was bypassed. | F3 |
| **D8** | Medium | Working memory never populated: `episodeRecordNode`/`wmAddNode` have zero call sites. | F6 |
| **D9** | Medium | Beliefs computed and deleted: Beta posteriors land in `...rest` of the scorer. | F8 |
| **D10** | Medium | The episodic layer requires a human. Default `goalNeuronId === null` ⇒ the three highest-weighted score terms are all zero. | F10 |
| **D11** | Low | `experiments/exec_influence/scoring.real.js` has drifted from `render/scoring.js`. The harness validates a stale duplicate. | §Probe E |
| **D12** | Low | `episodeRewards` never declared (main.js:4504); latent `ReferenceError` in an un-`try`-wrapped loop. | F11 |

---

## What is genuinely good and should be kept

- `instrumentation/` — seeded RNG, validated telemetry bus, session recorder. Real experimental infrastructure.
- `experiments/exec_influence/` — a correct falsification design with matched arms and a capability control. It found a real defect this audit independently reproduced. This is the template the other 29 components need.
- `render/semanticProvenance.js` — separating write authority by provenance (manual / direct experience / replay) is a good idea most toy cognitive systems lack.
- `render/schemaMemory.js` — the most carefully engineered module in the repository, and one of the few that reads the composite Q keys correctly.
