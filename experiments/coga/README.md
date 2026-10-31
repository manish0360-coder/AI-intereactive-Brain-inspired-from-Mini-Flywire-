# COG-A — running record

COG-A holds two separate studies:
- **Propagation** (this directory): after an unannounced change, does MFW change its choice at decision states whose best action changed
  for downstream reasons? **Paused, not viable as written**: precondition P2 fails at its 1,500-step horizon. Its estimand θ is unchanged and not
  repurposed. Never run; lock null.
- **ACQ-1** (`acq1/`): does MFW acquire hidden edge reliability at all? **Complete: SUPPORTED (row A1)**, Δ 0.131 [0.090, 0.171] against δ 0.10.
  `acq1/RESEARCH_REPORT.md`.

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
| M-COGA-7 development validation and freeze | done | `4d1baff` | dev gates, byte identity 60/60, allocation with 0 collisions, analysis rehearsal |
| M-COGA-8 readiness and lock | done | `4fbba10` | 16/16 gates, repeated by the runner |
| M-COGA-9 confirmatory run | done | no code change; data git-ignored | 620/620 sessions, 0 void, 20/20 repeats identical |
| M-COGA-10 results and report | done | the commit carrying this line | `acq1/RESULTS.md`, `acq1/RESEARCH_REPORT.md`, `acq1/VERIFICATION_REPORT.md` §6–7 |

## Ledger

**Verified facts.** `acq1/VERIFICATION_REPORT.md` and `VERIFICATION_REPORT.md`.

**Failed gates.** P2 (propagation precondition) at 1,500 steps. No ACQ-1 gate failed.

**Open scientific decisions.**
- Director: goal-entering choices skip the environment (`main.js:5018`), a design omission. Row A8 not invoked; `acq1/RESEARCH_REPORT.md` §5.
- Which channel produces MFW's late acquisition (`acq1/MECHANISM_AUDIT.md` §3, §5).

**Next.** Director ruling on the above; push approval (nothing here is pushed); backup of the raw sessions. A channel ablation on development worlds is
the recommended next study and is not authorized.

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
| `acq1/` | the acquisition study: its own design, decision table, power analysis, audit, code, evidence, results and report |
| `data/` | git-ignored raw session records (manifests with sha256 per file) |
