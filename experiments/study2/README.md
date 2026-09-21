# Study 2 (OQ-1a) — implementation-readiness harness

Readiness only. **No Study-2 run, no scientific seeds, no oracle / tau-b / Delta on study data.**
Design: [`research/preregistrations/FUTURESCORE_V2_3_STUDY2_OQ1_DESIGN_FINAL.md`](../../research/preregistrations/FUTURESCORE_V2_3_STUDY2_OQ1_DESIGN_FINAL.md).

| File | Role |
|---|---|
| `hook_capture.mjs` | loader hook, in-memory only: runAgent step counter, decision-event markers around `runPrediction(agentCurrent)`, chain-step marker, step-0 ranking capture, `setTick` observer, two shadow instances of `render/planning.js` |
| `snapshot_reader.mjs` | shadow evidence reader: FULL = immutable decision-time snapshot, GEO = `{a:0, s:0}` |
| `child.mjs`, `drive_readiness.mjs` | the permitted development replay (`896066:0`), capture ON and OFF |
| `taub.mjs` | project-owned tau-b, primary scoring, Delta, exact bootstrap interval (§P, §Q, §W) |
| `validation/` | SciPy / NetworkX used **only** as independent references |
| `verify_readiness.js` | the readiness gate |

**Definitions pinned by this milestone**
- **Decision event:** one `runAgent` invocation whose real `runPrediction(agentCurrent)` produces the executed
  decision at chain step 0.
- **`K(e)`:** the exact step-0 ranking candidate set; imagined successor states (chain steps ≥ 1) are excluded.
- **Event tick:** `τ = (0-based runAgent index) − 5`. `run.js:123` calls `setTick(0)` before boot; pressing Space runs
  one untimed loop of 5 steps; thereafter `setTick(5l)` follows runAgent index `5l + 4`. Phase II ⇔ `τ ≥ 1500`.
  The primary window is `τ ≤ 1500` and contains exactly one phase-II boundary event at `τ = 1500`.

**Monitored, replay-specific:** in the development replay the final (post-augmentation) ranking never contained a
candidate outside `K(e)`, and the executed action was always in `K(e)`. That is an observation, not a structural
guarantee; the per-event fields `nAugmented`, `executedInK` and `executedAugmented` must be recorded in Study 2.

Run: `node experiments/study2/drive_readiness.mjs`, `node experiments/study2/validation/validate.mjs`,
`node experiments/study2/verify_readiness.js`.
