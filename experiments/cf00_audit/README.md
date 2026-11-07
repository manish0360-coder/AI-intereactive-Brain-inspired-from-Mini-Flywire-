# CF-00 — runtime audit of the production agent

Evidence for `docs/COGNITIVE_AUDIT.md`. It answers one question per module: **does its output change what the agent does?**
It does not change any repository file. The production code (`main.js`, `render/*.js`) runs unmodified apart from
in-memory rewrites applied while it loads.

```bash
node experiments/cf00_audit/run_audit.mjs <out-dir-outside-the-repository>
```

The run takes about 5 minutes on the reference machine. It writes `results/audit_summary.json`. The raw session records, about 15 MB each, stay in `<out-dir>`.

## Method

| Part | What it measures | Evidence category |
|---|---|---|
| `preload.mjs` | Rewrites 4 anchors of `main.js` and 1 of `render/scoring.js` at load time. It reports the 36 additive scoring terms of every candidate, the clamped and the arbitrated score, and each `runPrediction` step's ranking, exploration draw and epsilon. It also installs a loop-advanced virtual clock. Optional switches remove one channel at its source. | Instrumentation |
| `session.mjs` | Boots the real `main.js` through `experiments/phase1_0/_driver.js` and fires 600 agent loops (3,000 `runAgent` steps). It logs executed moves through an always-succeeding `__M7_ENV__`, which matches no environment at all, and logs goal arrivals from main.js's own gate-0 line. | Runtime observation |
| `analyze.mjs` | Decision channels, single-term and module-group knockouts, closed-loop behaviour, goal-direction carriers, V8 call counts | Analysis |
| `run_audit.mjs` | 3 seeds × 13 conditions on goal 16, 3 seeds with no goal, 1 determinism repeat, 1 coverage session | Driver |

**Knockouts are open-loop and first-order.** One term, or one group, is removed from every candidate's score at the state where the decision was actually made. The clamp to [−400, 400] is re-applied. Where the arbitration blend was active, the score keeps its 0.6 weight. The test is whether the argmax changes. Correlated terms can therefore hide each other, and module-group knockouts address that.

**Ablations are closed-loop but n = 3 seeds per condition.** Their differences are descriptive and are not tested.

## Limits

- One graph (`connections.json`, 20 nodes, 39 edges), one goal (16), 3,000 steps, cold store, no M7 environment.
- The instrumented run was not compared byte-for-byte with an uninstrumented run. What was checked:
  - The rewrites consume no randomness.
  - With every switch off, the extended preload reproduced the earlier preload's records exactly.
  - Repeated runs are identical.
- "Changes the argmax" is the criterion for decision influence. A module can still matter through learning, through exploration rate (epsilon) or through candidate generation; those channels are reported separately where they were measured.
