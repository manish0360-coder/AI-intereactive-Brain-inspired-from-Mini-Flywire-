# MiniFlyWire — Verification Status

**What this page is:** the single place that says which parts of MiniFlyWire are implemented,
which are tested, which are verified by an executable gate, which are open, and which are
historical. Where this page disagrees with older design documents (including
`Portfolio_Assets/`), this page is the current record.

**Gate results below were re-run on 2026-09-15** against the committed code (Node.js v24.15.0).
Re-running them did not change any tracked file.

---

## 1. Status vocabulary

| Label | Meaning here |
|---|---|
| **IMPLEMENTED** | Code exists and runs in the decision path. Says nothing about correctness. |
| **TESTED** | Exercised by a script with assertions. |
| **VERIFIED** | An executable gate asserts the property and currently passes. |
| **OPEN** | A known defect or unresolved question. Not fixed. |
| **HISTORICAL** | Retained, unmodified, as provenance. Superseded by a later record that is linked. |
| **PLANNED** | Not built. |

---

## 2. Starting point: the Phase 0 audit (2026-08-17)

A read-only audit traced every reachable module from `index.html` and ran falsification probes
against the real code. Its verdict:

> MiniFlyWire is not currently cognitive. It is a heuristic scoring function over a
> fully-observable static graph.

It found that learned value (Q), look-ahead (`futureScore`), prediction error and the executive
controller were measurably disconnected from action selection, and that several subsystems
computed values nothing read. The audit, its probes and the component ledger are in
[`research/cognitive-audit/`](../research/cognitive-audit/) — start with
[`05_VERDICT.md`](../research/cognitive-audit/05_VERDICT.md).

Everything below is the engineering response to that audit. **The verdict has not been
re-audited and is not claimed to be overturned.**

---

## 3. Defect ledger

| ID | Defect (from the audit) | Status | Evidence |
|---|---|---|---|
| **D1** | Q-learning wrote `pos#goal->act` keys; scoring read `pos->act`. Learned values were never read. | **REPAIRED · VERIFIED** | [`verify_S2.js`](../experiments/phase1_0/verify_S2.js) (14/0) |
| **D2** | `futureScore` starts its search from the Three.js object counter (`neuron.id`) instead of the node id (`neuron.userData.id`), so look-ahead evaluates from no node or from the wrong node. | **OPEN — NOT REPAIRED** | [`render/planning.js`](../render/planning.js) line 357 still passes `neuron.id` to `dfs`; no gate covers it; the frozen [M7 preregistration](../research/cognitive-audit/M7_PREREGISTRATION.md) records it as unrepaired. Phase 0 Probe B. |
| **D3** | Sign inversions in `calculateDecisionScore`: danger and boredom penalties *increased* a path's score. | **REPAIRED · VERIFIED** | [`verify_S1.js`](../experiments/phase1_0/verify_S1.js) — repaired agent prefers the taught path over the punished one; [`verify_S1b.js`](../experiments/phase1_0/verify_S1b.js) S1.5b |
| **Q4** | Goal-aware Q lookup (`getQAny`). | **REPAIRED · VERIFIED** | [`verify_S2_Q4.js`](../experiments/phase1_0/verify_S2_Q4.js) (15/0) |
| **Q3** | Unseeded randomness in the cognitive path. | **REPAIRED · VERIFIED** | [`verify_S4.js`](../experiments/phase1_0/verify_S4.js) (12/0) |
| **F2** | The epsilon (exploration) branch returned early and re-executed the previous move. | **REPAIRED · VERIFIED** (by corrected gate) | [`verify_S3prime.js`](../experiments/phase1_0/verify_S3prime.js) (2/0). See §4 for the retained original gate. |
| **D4** | Prediction error is structurally zero in the browser environment. | **NOT A CODE BUG** — see §6 | [`05_VERDICT.md`](../research/cognitive-audit/05_VERDICT.md) §2 |
| **Exec** | **Executive controller has no effect on the 60% learned-score path.** | **OPEN — NOT FIXED** | §5 |

---

## 4. Verification gates

Thirteen gate scripts. **11 are fully green. 2 each retain one historical failing assertion,
kept deliberately as provenance; both are superseded by a corrected gate that passes.**

| Gate | Asserts | Result (2026-09-15) |
|---|---|---|
| [`parity_termarray.js`](../experiments/phase1_0/parity_termarray.js) | Term-array refactor is arithmetic-identical to the original (200,000 contexts, 0 mismatches) | PASS, exit 0 |
| [`verify_S1.js`](../experiments/phase1_0/verify_S1.js) | D3 sign repairs | 12 passed, 0 failed |
| [`verify_S1b.js`](../experiments/phase1_0/verify_S1b.js) | D3 discriminating case; export surface | 3 passed, **1 failed — S1.7, HISTORICAL** (exits 0) |
| [`verify_S1prime.js`](../experiments/phase1_0/verify_S1prime.js) | Superseding criterion for S1.7 | 7 passed, 0 failed |
| [`verify_S2.js`](../experiments/phase1_0/verify_S2.js) | D1 Q-namespace repair (with Q4) | 14 passed, 0 failed |
| [`verify_S2_Q4.js`](../experiments/phase1_0/verify_S2_Q4.js) | Q4 goal-aware lookup | 15 passed, 0 failed |
| [`verify_S3.js`](../experiments/phase1_0/verify_S3.js) | F2 epsilon repair on the real `main.js`, headless | 8 passed, **1 failed — S3.2, HISTORICAL** (exits 1) |
| [`verify_S3prime.js`](../experiments/phase1_0/verify_S3prime.js) | Superseding criterion for S3.2 | 2 passed, 0 failed |
| [`verify_S4.js`](../experiments/phase1_0/verify_S4.js) | Seeded RNG in the cognitive path | 12 passed, 0 failed |
| [`verify_S6.js`](../experiments/phase1_0/verify_S6.js) | Transition-uncertainty read accessor | 18 passed, 0 failed |
| [`verify_G9.js`](../experiments/phase1_0/verify_G9.js) | No cognitive export surface changed | 11 passed, 0 failed |
| [`verify_G16.js`](../experiments/phase1_0/verify_G16.js) | Trust rectification against its frozen preregistration | 28 passed, 0 failed |
| [`exec_influence/verify.js`](../experiments/exec_influence/verify.js) | Seeded RNG determinism, telemetry neutrality, trace schema | 8 passed, 0 failed |

**Why the two historical failures are kept, not deleted or edited:**

- **S3.2** required ≥70% fewer stale executions on *one* seed. The repair achieved 67 → 26
  (61%). A single seed cannot discriminate the repair, so a corrected criterion was
  preregistered in [erratum M7-ERR-01](../research/cognitive-audit/M7_PREREGISTRATION_ERRATUM_01.md):
  zero stale executions under forced exploration on all six panel seeds, and a median residual
  rate of **1.95%** against a limit of **5.28%**. Both pass. The original gate still runs and
  still fails.
- **S1.7** required the arbitration breakdown to be bit-identical. A later, approved trust
  rectification changes exactly one field (`confidenceScore`). The superseding criterion,
  [erratum M7-ERR-02](../research/cognitive-audit/M7_PREREGISTRATION_ERRATUM_02.md), pins the
  other five fields bit-identical and the changed field to its analytic value.

---

## 5. Open: executive controller (not fixed)

`computeExecutiveWeights()` in [`render/motivationalState.js`](../render/motivationalState.js)
returns `{ wReward, wSemantic, wConfidence, wUncertainty, wCuriosity, wCost }`.
`calculateDecisionScore()` in [`render/scoring.js`](../render/scoring.js) (lines 300–301) reads
`executiveWeights.exploit` and `.explore`, which do not exist, so both default to `1.0`.

The final score is `0.60 × learned score + 0.40 × competitive arbitration`
([`main.js`](../main.js) line 2266). The controller therefore has **no influence on the 60% path**.

Measured by [`experiments/exec_influence/`](../experiments/exec_influence/)
(seed 12345, 400 trials, [`report.json`](../experiments/exec_influence/report.json)):

| Metric | Value | Meaning |
|---|---|---|
| Q1 influence on 60% path | **0** | Real weights vs. none: no change |
| Q1 argmax flip rate | **0** | Never changes the chosen action |
| Q2 capability | **8.06** | If given the field names scoring reads, the path *would* move |
| Q3 influence on 40% arbitration path | **0.49** | This path is live |

Reading: the controller is **capable but starved** on the main path. The harness uses its own
copies of the scoring and controller modules (`scoring.real.js`, `executiveController.real.js`);
the audit independently reproduced the zero-influence result against the live module
(`04_FALSIFICATION_EVIDENCE.md`, Probe E).

**No fix has been applied, and no post-fix measurement exists.**

---

## 6. Environments: what is and is not observable

- **The interactive browser app** runs on a static, deterministic, fully observable graph
  (`neurons.json`, `connections.json`). In that environment prediction error is correctly zero:
  there is nothing to predict. This is the audit's central structural finding.
- **A separate, harness-only environment**, [`experiments/m7/env.js`](../experiments/m7/env.js),
  adds hidden per-edge traversal reliability (13 of 39 edges unreliable) that the agent never
  observes. It is not imported by `render/` and is not part of the browser experience. The
  measurement programme from M7 onward runs against it.

---

## 7. Measurement programme (M7 onward)

After the repairs, the work became measurement rather than feature-building. Each study was
written down and frozen (SHA-256 digest) **before** data collection, and each carries an
executable verifier. Protocols, digests, errata and interpretations are in
[`research/preregistrations/`](../research/preregistrations/).

Representative results, reported as frozen — including the ones that did not come out cleanly:

| Study | Result | Record |
|---|---|---|
| M9 | 7,178 decision/position desynchronization events: 68.22% ADVANCE, 31.78% TELEPORT, 0 unclassified. The rule was formulated after the data existed, so this is **descriptive, not confirmatory**. | [`M9_INTERPRETATION.md`](../research/preregistrations/M9_INTERPRETATION.md) |
| Q1 | **INCONCLUSIVE — insufficient material.** Pre-registered minimum of 20 configurations not met (17). | [`Q1_INTERPRETATION.md`](../research/preregistrations/Q1_INTERPRETATION.md) |
| C1 | Descriptive census of one registered seed block, comparing the `futureScore` term delivered vs. forced to 0. **No statistical inference; no generalisation.** It measures the term as built, which includes the open D2 defect. | [`C1_INTERPRETATION.md`](../research/preregistrations/C1_INTERPRETATION.md) |

Errata are appended, never edited in. Where a claim in a later milestone was too strong, a
dated `-R1` correction narrows it and the narrowing is itself checked by a verifier.

---

## 8. Known limitations

- The executive controller defect (§5) is open.
- The `futureScore` look-ahead id defect (D2, §3) is open.
- The browser environment has no hidden structure; claims about belief, uncertainty or prediction
  apply only to the harness environment in §6.
- The Phase 0 verdict has not been re-audited after the repairs.
- Several subsystems the audit classified as computed-but-unused have not been removed or rewired.
- `exec_influence` measures copies of the modules, not the live files (§5).
- Gate scripts in `experiments/phase1_0/` must be run from inside that directory (they read
  `neurons.json` by relative path).
- Results cover the configurations and seeds enumerated in each study; none claims generality.

---

## 9. Reproduce

Requires Node.js (tested on v24.15.0). No dependencies to install.

```bash
cd experiments/phase1_0
```

```bash
node verify_S2.js
```

Substitute any gate name from §4. `verify_S3.js` and `verify_S3prime.js` spawn the real
`main.js` headlessly and take longer.

```bash
node experiments/exec_influence/verify.js
```

`node experiments/exec_influence/run.js` regenerates the §5 measurement; it overwrites
`report.json` and writes a telemetry folder.
