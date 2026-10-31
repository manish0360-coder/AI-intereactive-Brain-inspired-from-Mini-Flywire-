# ACQ-1 — verification report

Every row quotes the actual output of the named command on this checkout. Failures and corrections are recorded, not removed.

## 1. Audit of the earlier milestones (2026-10-31)

| check | result |
|---|---|
| five COG-A commits | `9432f63`, `8740c06`, `29216c9`, `cba6352`, `881c0dd`: linear on `4122186`, each touching only `experiments/coga/` |
| working tree | no tracked change at the start of this phase |
| protected paths against `4122186` | `git diff --stat` empty (runtime, instrumentation, M7, LEARN-0, CREDIT-1, registry, XFER-1, phase1_0, GATE-FLOOR trees, harness, connections, neurons, .gitattributes) |
| `test_distal.mjs` | 11/11 |
| `test_coga.mjs` | 21/21 checks, 5/5 mutants |
| `census.mjs` | verdict, κ, grid and worlds identical to the committed `evidence/census_dev.json` |
| P2 | independent re-derivation with no shared code (`audit_p2.mjs`): −0.0069 [−0.0554, 0.0481]; 36 raw files, 0 hash mismatches |

## 2. ACQ-1 gates

| command | result |
|---|---|
| `node experiments/coga/acq1/test_acq1.mjs` | 27/27 checks, 3/3 mutants |
| `node experiments/coga/acq1/test_mutants.mjs` | 11/11 source mutants caught; leak scan: no runtime file (39 scanned) refers to `pPhase1`, `pPhase2` or `trueP` |

**Corrected check (recorded).** Mutant M11 (one agent stream for both environments) was first missed: the check compared targets, and slips
make targets differ even on a shared stream. The check now compares the draws the agent receives; the code under test did not change.

## 3. Development instruments (30 worlds, MFW-P, 12,000 steps; `evidence/dev_gates.json`)

| item | result |
|---|---|
| sessions / void worlds | 60 / 0 |
| environment refusals | 0 |
| repeat run | 60/60 logs byte-identical |
| positive control, ψ(QB-1), window [9000, 12000) | 0.685 [0.641, 0.730] |
| null, ψ(RW) | 0.001 [−0.006, 0.007] |

**Territory.** `territory.mjs --to 4039`: LEARN-0 chain sample re-verified with the real generator (0 bad), 2,008 indices continued from seed
304470. `allocation.mjs --n 100`: indices 3240–3339, seeds 365489–369480, 25 per goal, 0 worlds skipped, 0 collision problems (LEARN-0, CREDIT-1
reservation, simulation stream, registry config seeds, every session stream against the trajectory registry).

## 4. Development diagnostics (not evidence for the study)

`evidence/dev_diag_3000.json`, `dev_diag_12000.json`, `dev_diag_36000.json`; summary in `MECHANISM_AUDIT.md`.

**Analysis rehearsal.** `analyze.mjs --rehearse` ran the whole confirmatory analysis on the development sessions before the freeze (variants P, A,
H; `evidence/rehearsal_dev.json`), so no code path meets real data for the first time on confirmatory outcomes. Its numbers are development
numbers (Δ 0.128 [0.057, 0.198] on 30 worlds) and are not evidence for the study.

## 5. Failures during development

**Tree rebuilt under a live run.** A repeat run called the tree builder while a 36,000-step run was active. The builder deletes and rewrites a
shared directory, so 30 of the 60 sessions failed at their end with ENOENT on `env.js`, and the repeat itself crashed. Sessions already
written were unaffected: they record full logs and their manifests are intact. The tree was rebuilt with no run active and verified (147 files,
all hashes). The failed sessions were re-run with `--skip-existing`, and the repeat was re-run. `run_mfw.mjs` gained `--tree`; the rule is
in `DESIGN.md` §11. All of this was development data.

**Interval.** The percentile bootstrap failed its type I rule in simulation and was replaced before the freeze (`POWER_ANALYSIS.md`).
