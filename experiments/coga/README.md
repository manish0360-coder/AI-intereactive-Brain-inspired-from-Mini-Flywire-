# COG-A — cross-state propagation after an unannounced change (running record)

**Question.** After an unannounced change of the hidden edge reliabilities in the M7 graph world, does MiniFlyWire (map oracles
off) change its choice at decision states whose best action changed for *downstream* reasons, at its first post-change decision
there, more than without the change, and more specifically than general randomisation would? (Primary estimand θ, DESIGN.md §6.)

**Claim limits fixed in advance.** A positive result would show cross-state propagation of experienced change (planning or replay)
in this world class only. It would not show a cognitive map, model-based planning as such, general cognition or general
intelligence. A null result shows only that this procedure detected no propagation.

## Milestones

| milestone | status | commit | verification |
|---|---|---|---|
| M-COGA-1 repository and scientific audit | done | `9432f63` | CREDIT-1 gate 115/115 + 299/299 at `4122186`; distal tests 11/11 |
| census rules pre-declared | done | `8740c06` | committed before the census first ran |
| M-COGA-2 design and static census | done (δ, q_min open) | `29216c9` | census FEASIBLE at γ 0.95, κ 0.10 (1.00 DISTAL/world, 18/30 worlds) |
| M-COGA-3 environment, agents, instrumentation | done | `cba6352` | test_coga 21/21 + 5/5 mutants; distal 11/11 |
| M-COGA-4 verification and development validation | **stopped at a failed scientific gate (P2)** | (this commit) | VERIFICATION_REPORT.md |
| M-COGA-5 … 7 | not started | — | — |

## Stop: decision needed from the Research Director

**Failed gate.** Preregistered precondition P2 (MFW pre-shift competence above the random walk) fails on the development worlds:
MFW − RW agreement with the reliability-optimal set = −0.007 [−0.057, 0.048]. QB-1 passes (+0.342 [0.303, 0.378]).
- MFW chooses *less* reliable edges than a random walk (mean p 0.662 vs 0.744).
- M7's own hidden-dynamics hook state (H: E2 credit on) does not change this (agreement 0.360, mean p 0.676).
- The binding limitation is acquisition of the hidden structure, not its propagation.
- Under the decision table, the confirmatory θ_MFW would most likely be NON-EVALUABLE (R7).

**Everything else that was tested passed:**
- instruments and A6 determinism: 36/36 sessions byte-identical across repeat, t0 and high load;
- the structural null: exact in the fixture, calibrated on 254 simulation worlds;
- the power analysis (feasible: δ 0.10 → n 320, δ 0.15 → n 120, δ 0.20 → n 80).

Decisions:
1. **Direction**:
   - (a) freeze and run as designed (expected R7);
   - (b) make acquisition (P2) the confirmatory primary and θ secondary;
   - (c) halt the MFW confirmatory and move to integrating an acquisition mechanism, re-testing with this pipeline.
2. **δ** (and δ_acq under (b)).
3. **q_min**: on the development worlds q = 1.0 for every agent.
4. **MFW hook configuration**: P as designed, or H.

## Files

| file | role |
|---|---|
| `M1_AUDIT.md` | evidence ledger, QB-1 null proof, RNG, estimand and distal-construction audit |
| `DESIGN.md` / `DECISION_TABLE.md` / `POWER_ANALYSIS.md` | design (δ, q_min open), decision rules, power method and results |
| `VERIFICATION_REPORT.md` | actual command outputs, corrections, findings |
| `distal.mjs`, `test_distal.mjs`, `census.mjs` | distal mathematics, its tests, the static census |
| `config.mjs`, `rngid.mjs`, `worlds.mjs`, `envsim.mjs`, `agents.mjs`, `events.mjs`, `analysis.mjs`, `lock.mjs` | study code (lock null) |
| `session_mfw.mjs`, `run_mfw.mjs`, `run_baselines.mjs`, `analyze_dev.mjs`, `power.mjs`, `test_coga.mjs` | drivers, analysis, tests |
| `evidence/*.json` | census, tuning, baselines, development analysis (blinded), null calibration, P2, power |
| `data/` | git-ignored raw session records (manifests with sha256 per file) |

**Reproduce:**
- `node experiments/coga/test_distal.mjs`
- `node experiments/coga/test_coga.mjs`
- `node experiments/coga/census.mjs`
- `node experiments/coga/run_mfw.mjs --set dev --out <dir>`
- `node experiments/coga/run_baselines.mjs --set dev --alpha 0.5 --epsilon 0.1 --out <f>`
- `node experiments/coga/analyze_dev.mjs ...`
- `node experiments/coga/power.mjs --dev evidence/dev_analysis.json --out <f>`
