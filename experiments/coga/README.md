# COG-A — running record

COG-A holds two separate studies:
- **Propagation** (this directory): after an unannounced change, does MFW change its choice at decision states whose best action changed
  for downstream reasons? **Paused**: precondition P2 fails at its 1,500-step horizon. Its estimand θ is unchanged and not repurposed.
- **ACQ-1** (`acq1/`): does MFW acquire hidden edge reliability at all? Current work.

**Claim limits fixed in advance.** Neither study can establish a cognitive map, general cognition or general intelligence. A null result
concerns the procedure and budget, not what MFW can never do.

## Milestones

| milestone | status | commit | verification |
|---|---|---|---|
| M-COGA-1 repository and scientific audit | done | `9432f63` | CREDIT-1 gate 115/115 + 299/299 at `4122186`; distal tests 11/11 |
| census rules pre-declared | done | `8740c06` | committed before the census first ran |
| M-COGA-2 design and static census | done | `29216c9` | census FEASIBLE at γ 0.95, κ 0.10 |
| M-COGA-3 environment, agents, instrumentation | done | `cba6352` | test_coga 21/21 + 5/5 mutants |
| M-COGA-4 development validation (propagation) | done; P2 failed | `881c0dd` | `VERIFICATION_REPORT.md` |
| M-COGA-5 acquisition audit and design | done | `cd4841f` | test_acq1, test_mutants, `acq1/VERIFICATION_REPORT.md` |
| M-COGA-6 mechanism change | **not made**: not shown necessary | — | `acq1/MECHANISM_AUDIT.md` |
| M-COGA-7 development validation and freeze | done | (this commit) | dev gates, byte identity 60/60, allocation with 0 collisions, analysis rehearsal |
| M-COGA-8 … 10 | next | — | — |

## Ledger

**Verified facts.** See `acq1/VERIFICATION_REPORT.md` once written; until then `VERIFICATION_REPORT.md`.

**Failed gates.** P2 (propagation precondition) at 1,500 steps.

**Open scientific decisions.** Which channel produces MFW's late acquisition (`acq1/MECHANISM_AUDIT.md` §3).

**Next.** Freeze ACQ-1, then readiness, confirmatory run, final report.

## Files

| file | role |
|---|---|
| `M1_AUDIT.md` | evidence ledger, QB-1 null proof, RNG, estimand and distal-construction audit |
| `DESIGN.md` / `DECISION_TABLE.md` / `POWER_ANALYSIS.md` | propagation design, decision rules, power |
| `VERIFICATION_REPORT.md` | propagation verification, corrections, findings |
| `distal.mjs`, `test_distal.mjs`, `census.mjs` | distal mathematics, its tests, the static census |
| `config.mjs`, `rngid.mjs`, `worlds.mjs`, `envsim.mjs`, `agents.mjs`, `events.mjs`, `analysis.mjs`, `lock.mjs` | study code (lock null) |
| `session_mfw.mjs`, `run_mfw.mjs`, `run_baselines.mjs`, `analyze_dev.mjs`, `power.mjs`, `test_coga.mjs` | drivers, analysis, tests |
| `evidence/*.json` | census, tuning, baselines, development analysis (blinded), null calibration, P2, power |
| `acq1/` | the acquisition study: its own design, decision table, power analysis, audit, code and evidence |
| `data/` | git-ignored raw session records (manifests with sha256 per file) |
