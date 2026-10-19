# GATE-FLOOR-SCOPE — design C′ pre-registration package (NOT FROZEN)

**Status: complete pre-registration package for the final independent review. Not frozen, no confirmatory session, no production
edit.**

[DESIGN.md](DESIGN.md) covers:
* the questions;
* the evidence, kept apart as FACT / INFERENCE / UNKNOWN;
* the C′ protocol: 280 worlds × (2 trainings + 4 test cells) = 1,680 sessions;
* the estimands and decision rules;
* the stale-reasoning diagnostic, defined operationally;
* the guarded-store anomaly, its diagnostics and its development-world resolution;
* the instruments, exclusion and failure rules, power, decision table, claim limits and a decision memo.

The design C proposal it supersedes is commit `2b53a7f`.

| path | role |
|---|---|
| `DESIGN.md` | the pre-registration document |
| `config.mjs` | machine-readable declarations: cells, settings, trainings, worlds, accounting, margin, family, thresholds, label rules, decision table, digests |
| `diag.mjs` | pure classification functions: arrivals, resets, recording audit, store diagnostics, ratio interval |
| `session.mjs` | driver of record. A fork of the frozen interaction driver: guard setting flag pair, guarded training, the read-only diagnostic |
| `orchestrate.mjs` | plan (`--plan-only`, `--plan-json`), training → store controls → test cells, retry and exclusion, manifest. `--selftest` = plumbing on development worlds |
| `analyze.mjs` | the analysis: refusals, instruments, PS1–PS3, sensitivity, goal checks, stale reading, store diagnostics, decision |
| `verify_gatefloorscope.mjs` | the design gate: sections S N K D A P O M |
| `evidence/devcheck_cprime_*` | the C′ cells on development worlds 0–29 with the driver of record: exact reproduction of the earlier calibration, the stale diagnostic, store attribution |
| `evidence/calibration6_*`, `evidence/*_devworlds_*.txt` | earlier development calibration and structural checks (`2b53a7f`) |
| `tools/` | development tooling that produced the evidence (no confirmatory run) |
| `data/` | git-ignored: the accepted-configuration stream cache, logs |

```bash
node experiments/gate-floor-spec/verify_gatefloorscope.mjs                      # the gate (development sessions only)
node experiments/gate-floor-spec/orchestrate.mjs --plan-only --plan-json plan.json   # the exact 1,680-session plan; runs nothing
node experiments/gate-floor-spec/tools/devcheck_cprime.mjs <outdir> 30 8         # development reproduction + diagnostic evidence
```

**Gate:** 93 checks passed, 0 failed; 29 mutants caught, 0 missed (`evidence/gate_verify_cprime.log`; first-run corrections in
DESIGN.md section 13).

**Development reproduction:** 30 worlds × 6 sessions, 0 mismatches against the earlier calibration. Stale reading SUPPORTED
(X1 = X3 = 1.00, XU = 0). Guarded stores: every non-graph pair is SKIP-class (0 EXECUTED, 0 UNRECORDED).

**Do not** run two guard-tree builds at once: the gate, the orchestrator and the tools share one temp tree directory.

**Not authorised here:** freezing the protocol, running `orchestrate.mjs` on block S (worlds 1392–1671), or any production change.
