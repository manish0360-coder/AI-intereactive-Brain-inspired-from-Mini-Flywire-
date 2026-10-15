# GATE-FLOOR-INTERACTION — store × floor × legal-edge guard bundle, paired 2 × 2 × 2 factorial

**Status: DEVELOPMENT / EXPLORATORY. Frozen design (see DESIGN.md §9); the confirmatory block I (280 worlds, 2,520 sessions) is run
only after this directory is committed, pushed and verified remotely.** Not preregistered in the repository's formal sense. No
registered or held-out seed, no production file and no earlier experiment is modified.

**Classification: Production-like transition semantics under M7 bounds.** Substrate: the GATE-FLOOR-PRODSEM derived HEAD tree
(commit `0df804c497e649affb9e7ebacb10fdc81ab6de8d`, `main.js` sha256 `8cf1dc29…`) plus two guarded, default-off, call-only lines
(**the guard bundle**: an admission mask and an execution guard, always together; guard-tree `main.js` sha256 `a0eb7b37…`).

| file | role |
|---|---|
| `DESIGN.md` | the reviewed design, evidence, estimands, gates, power, and the freeze addendum |
| `config.mjs` | machine-readable design: factors, cells, margins, decision rules, digests |
| `transform.mjs`, `session.mjs`, `orchestrate.mjs`, `analyze.mjs` | guard tree, one-session driver, orchestrator, frozen analysis |
| `static_checks.mjs` | the S5 static invariant (`window.lastReasoning` is never cleared) |
| `verify_gatefloorinteraction.mjs` | the gate (sections S T N L A P E M) |
| `export_sessions_blockI.mjs` | per-session evidence export |
| `evidence/`, `evidence_blockP_association.mjs`, `tools/` | design-time evidence (development calibration, preserved block-P association) |

```bash
node experiments/gate-floor-interaction/verify_gatefloorinteraction.mjs
node experiments/gate-floor-interaction/orchestrate.mjs --out experiments/gate-floor-interaction/data/blockI --workers 10
node experiments/gate-floor-interaction/analyze.mjs --in experiments/gate-floor-interaction/data/blockI --out <summary_blockI.json>
```

## Claim limits

The guard is the combined bundle: no effect is attributed to the mask or to the execution guard separately. State P; the 150-tick
cap, deterministic replay and legacy stale-keyed credit remain; the delivered store is trained **unguarded**; Phase I, 1,500
calls, goals {8, 12, 16, 19}. A supported result can justify a separate production-design specification; it is not a production
change, production readiness, routing capability or cognition.
