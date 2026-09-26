# Study 2 (OQ-1a) — readiness harness and final Study-2 driver

**Study 2 was executed once, as registered, on 2026-09-26** (registration `STUDY2_REGISTRATION.json`, evidence
`execution/`, results [`FUTURESCORE_V2_3_STUDY2_RESULTS.md`](../../research/preregistrations/FUTURESCORE_V2_3_STUDY2_RESULTS.md),
gate `verify_study2_execution.js`). The block 890000–892999 is now consumed in the seed registry; the driver will
refuse to run it again.
Design: [`research/preregistrations/FUTURESCORE_V2_3_STUDY2_OQ1_DESIGN_FINAL.md`](../../research/preregistrations/FUTURESCORE_V2_3_STUDY2_OQ1_DESIGN_FINAL.md).

| File | Role |
|---|---|
| `hook_capture.mjs` | loader hook, in-memory only: runAgent step counter, decision-event markers around `runPrediction(agentCurrent)`, chain-step marker, step-0 ranking capture, `setTick` observer, two shadow instances of `render/planning.js` |
| `snapshot_reader.mjs` | shadow evidence reader: FULL = immutable decision-time snapshot, GEO = `{a:0, s:0}` |
| `child.mjs`, `drive_readiness.mjs` | the permitted development replay (`896066:0`), capture ON and OFF |
| `taub.mjs` | project-owned tau-b, primary scoring, Delta, exact bootstrap interval (§P, §Q, §W) |
| `validation/` | SciPy / NetworkX used **only** as independent references |
| `verify_readiness.js` | the readiness gate (cfadedd9, unchanged) |
| **Study-2 driver (M-STUDY2-DRIVER)** | |
| `governance.mjs` | seed block / registration validation (typed registry), the bounded acceptance walk, goal balance — no oracle |
| `drive_study2.mjs` | executes a registered block: plan first, every slot in order, integrity halt, slot-0 replay — never run at this commit |
| `run_child.mjs`, `capture.mjs` | one run per process; the readiness capture logic plus persisted step-0 vectors and full provenance |
| `analyze_study2.mjs` | post-run only: U* = −expectedCostToGoal, Delta, medians, exact bootstrap, R5 moderator, secondary post-shift |
| `manifest.mjs`, `DRIVER_MANIFEST.json` | driver/analysis file hashes; the registration must pin their sha256 |
| `registration.template.json` | the fields the Director fills in |
| `shakedown.mjs`, `shakedown_evidence/` | the run child on development fixture 896066:0, compared with the readiness evidence |
| `verify_driver.js` | the final pre-execution gate D1–D20 (d846fbd; some scope checks flip after execution by design) |
| **Study-2 execution (2026-09-26)** | |
| `STUDY2_REGISTRATION.json` | the Director registration the driver ran from |
| `execution/` | `PLAN.json`, `LEDGER.json`, `REPLAY.json`, 16 run artifacts + 1 replay artifact, `INTEGRITY.sha256`, `ANALYSIS.json` (frozen analysis), `POSTHOC_EVENT_DESCRIPTIVES.json` (not pre-registered) |
| `describe_events.mjs` | post-hoc event descriptives (NOT pre-registered; changes no frozen result) |
| `verify_study2_execution.js` | the execution gate: integrity, analysis reproduction, interpretation bounds, registry, historical flips |
| `historical_gate_sweep.json` | 35 historical gates run before and after this milestone; exactly 5 change verdict, each named in the gate |

**Definitions pinned by this milestone**
- **Decision event:** one `runAgent` invocation whose real `runPrediction(agentCurrent)` produces the executed
  decision at chain step 0.
- **`K(e)`:** the exact step-0 ranking candidate set; imagined successor states (chain steps ≥ 1) are excluded.
- **Event tick:** `τ = (0-based runAgent index) − 5`. `run.js:123` calls `setTick(0)` before boot; pressing Space runs
  one untimed loop of 5 steps; thereafter `setTick(5l)` follows runAgent index `5l + 4`. Phase II ⇔ `τ ≥ 1500`.
  The primary window is `τ ≤ 1500` and contains exactly one phase-II boundary event at `τ = 1500`.

**Monitored, replay-specific:** in the development replay the final (post-augmentation) ranking never contained a
candidate outside `K(e)`, and the executed action was always in `K(e)`. That is an observation, not a structural
guarantee; the per-event fields `nAugmented`, `executedInK` and `executedAugmented` must be recorded in Study 2 as **monitored diagnostics, not validity conditions** — OQ-1a does not show that the executed action is selected by FutureScore.

Run: `node experiments/study2/drive_readiness.mjs`, `node experiments/study2/validation/validate.mjs`,
`node experiments/study2/verify_readiness.js`; driver gate: `node experiments/study2/shakedown.mjs`,
`node experiments/study2/verify_driver.js`. Execution (only after authorization):
`STUDY2_EXECUTION_AUTHORISED=1 node experiments/study2/drive_study2.mjs --execute --registration <file> --out <dir>`,
then `node experiments/study2/analyze_study2.mjs <dir>`.
