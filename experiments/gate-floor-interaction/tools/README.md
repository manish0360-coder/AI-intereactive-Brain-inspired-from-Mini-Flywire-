# GATE-FLOOR-INTERACTION development tooling (evidence generation only)

Not the experiment: there is no confirmatory orchestrator, session driver of record or analysis script in this directory. These
scripts produced the **development calibration** (XFER-1 worlds 0–39, outside every study world) and the guard feasibility check
that `../DESIGN.md` cites. Everything is built beside the scripts and git-ignored (`trees/`, `out_cal/`, `session_guard.mjs`).

```bash
cd experiments/gate-floor-interaction/tools
node build_guard_tree.mjs                       # PRODSEM derived tree + the two guard lines (main.js sha256 a0eb7b37…)
node gen_session.mjs "$(pwd)/session_guard.mjs" # guard-capable copy of the committed PRODSEM session driver
node guard_feasibility.mjs                      # default-off neutrality and guard-ON structure on dev worlds 1-3
node calib_interaction.mjs "$(pwd)/out_cal" 40 8   # 8 cells x 40 worlds (+ 40 unguarded training sessions)
node summ_cal.mjs out_cal/calibration_interaction_rows.json out_cal/calibration_interaction_summary.json
node extras.mjs out_cal/calibration_interaction_rows.json out_cal/calibration_interaction_summary.json out_cal/extras.json
```

The preserved block-P association analysis is `../evidence_blockP_association.mjs` (`--dir` = the extracted archive or the original
`data/blockP`). Recorded outputs: `../evidence/`.
