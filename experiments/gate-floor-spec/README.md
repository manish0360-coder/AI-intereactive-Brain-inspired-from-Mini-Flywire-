# GATE-FLOOR-SCOPE — floor + guard production-design specification (design only)

**Status: DESIGN ONLY. Not frozen, no confirmatory outcome, no production edit.** See [DESIGN.md](DESIGN.md) for the questions
(training scope; component separability), the evidence kept apart as FACT / INFERENCE / UNKNOWN, the designs compared, the proposed
five-cell paired design (two independently trained stores per world, 280 worlds, 1,960 sessions), the estimands and decision rules,
the instruments, the sample-size table and the claim limits.

| path | role |
|---|---|
| `DESIGN.md` | the design report |
| `evidence/calibration6_rows.json`, `calibration6_summary.json` | 30-world development calibration (XFER-1 worlds 0–29): six cells, contrasts, paired SDs, store statistics, sample-size table |
| `evidence/components_feasibility_devworlds_1_3.txt`, `stale_reasoning_devworlds_0_7.txt` | structural checks: component separation with the pinned guard lines; stale-reasoning vs decision origin of non-graph resets |
| `tools/` | the scripts that produced the evidence (development tooling only; no confirmatory orchestrator, session driver of record or analysis) |

```bash
cd experiments/gate-floor-spec/tools
node gen_session.mjs "$(pwd)/session_d2.mjs"            # component-separable copy of the committed interaction driver (tree and pins unchanged)
node components.mjs                                     # off / mask / exec / bundle on dev worlds 1-3, floor ON
node stale_check.mjs                                    # stale vs decision origin of non-graph resets (dev worlds 0-7)
node calib6.mjs "$(pwd)/out6" 30 8                      # six cells x 30 dev worlds (+ 60 training sessions)
node summ6.mjs out6/calib6_rows.json out6/calib6_summary.json
```
