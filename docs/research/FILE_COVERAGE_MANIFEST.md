# MiniFlyWire — File Coverage Manifest (scientific-record audit)

Tracked-file counts are from `git ls-files <dir> | wc -l` at HEAD `0a5ef40` (2026-11-12), before the three audit files in
`docs/research/` were created. Coverage levels, honestly stated:

- **Read** — the primary result file was opened and read in full (or the stated line range).
- **Skimmed** — file listing inspected and/or part of a file read; numbers taken only from what was read.
- **Not read** — not opened. Any ledger row depending on it is marked "not verified from primary evidence".

## 1. Top-level entries

| Path | Tracked files | Contents | Coverage |
|---|---|---|---|
| `.gitattributes` | 1 | line-ending pins for frozen documents | Not read |
| `.github` | 1 | CI workflow | Not read |
| `.gitignore` | 1 | root ignore rules (source of §4) | Read |
| `.nvmrc` | 1 | Node version pin | Not read |
| `CITATION.cff` | 1 | citation metadata | Not read |
| `LAB_NOTES` | 5 | lab notes | Not read |
| `LICENSE` | 1 | licence | Not read |
| `PROJECT_MEMORY` | 2 | project memory notes | Not read |
| `Portfolio_Assets` | 11 | design documents and media that predate the audit | Not read |
| `README.md` | 1 | project overview and status table | Skimmed (keyword extract of status lines) |
| `benchmarks` | 2 | benchmarks | Not read |
| `cognitive` | 33 | separated testbed: environment, tasks, agents (RANDOM, QL, DYNAQ, ORACLE, MBVI), tests | Not read (results read via `experiments/cf01`, `cf01b`, `cf03`) |
| `connections.json`, `neurons.json` | 1 + 1 | the 20-node / 39-edge graph | Not read |
| `docs` | 10 | `VERIFICATION_STATUS.md` (Read), `COGNITIVE_MILESTONE_ROADMAP.md` (Read), `COGNITIVE_DECISIONS.md` (Read), `COGNITIVE_AUDIT.md` (Skimmed: headings and four module rows), `COGNITIVE_EXPERIMENT_PROTOCOL.md`, `COGNITIVE_METRICS.md`, `COGNITIVE_ARCHITECTURE_HANDBOOK.md`, `COGNITIVE_RESEARCH_REVIEW.md`, `COGNITIVE_RISKS_AND_LIMITATIONS.md`, `MINIFLYWIRE_COGNITIVE_DESIGN_REPORT.md` (all Not read) | Mixed, as listed |
| `experiments` | 1,109 | 55 study / gate / tooling directories | see §2 |
| `index.html`, `main.js`, `package.json` | 1 + 1 + 1 | browser app entry, agent runtime, package metadata | Not read (source code is outside this audit) |
| `instrumentation` | 4 | seeded RNG and telemetry | Not read |
| `render` | 38 | scoring, Q-learning, memory, motivational state, visualisation modules | Not read |
| `research` | 264 | decision log, preregistrations, audits, external review packages | see §3 |
| `scripts` | 1 | script | Not read |
| `showcase` | 1 | showcase asset | Not read |

Git tags (`git tag -n1`): 12 `freeze/…`, 11 `results/…`, 2 `void/…` — listed and used in the ledger. `git log` has 271 commits;
individual commits were not inspected, commit hashes in the ledger are copied from the records.

<!-- TOP-END -->

## 2. `experiments/*`

| Directory | Tracked files | Contents | Primary result | Coverage |
|---|---|---|---|---|
| `boundary` | 1 | milestone-scoped boundary gate (`verify.js`) | none (console gate) | Not read (status from FS-BD-01 §8) |
| `c1` | 29 | C1 census: protocol, collector, analysis, 16 figures | `results/c1_results.json` (1.2 MB) | Not read |
| `cf00_audit` | 6 | runtime audit probe of the production agent | `results/audit_summary.json` | Skimmed (README read; summary JSON not read) |
| `cf01` | 4 | testbed gate spec, driver, results | `results/RESULTS.md` | Read (`gate_result.json` not read) |
| `cf01b` | 4 | E2′ gate | `results/RESULTS.md` | Read |
| `cf03` | 4 | MBVI gate | `results/RESULTS.md` | Read (`GATE_SPEC.md` not read) |
| `coga` | 81 | COG-A propagation design + ACQ-1 study (`acq1/`, VOID) | `acq1/RESULTS.md` (historical, void) | Skimmed: top-level README and `acq1/README.md` read; `acq1/RESULTS.md`, `RESEARCH_REPORT.md`, designs, evidence JSON not read. No ACQ-1 estimate is cited |
| `credit1` | 33 | CREDIT-1 design r2, trees, instruments, calibration / swap-parity / timing harnesses, reviews | none (no confirmatory run) | Skimmed: README read; `DESIGN.md`, `TIMING_DIAGNOSTIC_PLAN.md`, reviews not read |
| `d2` | 4 | D2 repair gate and lineage note | `D2_EVIDENCE_LINEAGE.md` | Not read |
| `exec_influence` | 7 | executive-controller influence harness and telemetry | `report.json` | Read |
| `fsbehav` | 33 | FS-BD-01 Study 1: 24 run evidence files | `STUDY1_RESULTS.md` | Skimmed (first ~2,600 bytes) |
| `fsfeas` | 14 | FutureScore feasibility measurement | `FEASIBILITY_RESULTS.md` | Skimmed (first ~2,600 bytes; results tables not read) |
| `futurescore` | 2 | lineage gates | none (console gates) | Not read |
| `gate-floor-b2` | 17 | GATE-FLOOR-B2 | `results/RESULTS.md` | Read (summary JSON not read) |
| `gate-floor-head` | 16 | GATE-FLOOR-HEAD | `results/RESULTS.md` | Read lines 1–70 |
| `gate-floor-interaction` | 30 | GATE-FLOOR-INTERACTION | `results/RESULTS.md` | Read (`DESIGN.md`, sessions JSON not read) |
| `gate-floor-prodsem` | 21 | GATE-FLOOR-PRODSEM | `results/RESULTS.md` | Read lines 1–75 |
| `gate-floor-spec` | 28 | GATE-FLOOR-SCOPE C′ frozen design (unrun) | `FREEZE.md` (no results) | Read `FREEZE.md`, `README.md`; `DESIGN.md` not read |
| `gate-floor1` | 21 | GATE-FLOOR-1 | `results/RESULTS.md` | Read |
| `h1r` | 258 | H1-R harness, 11 evidence directories, stage records | none reportable (VOID) | Not read (status from D-031, D-032). Stage records deliberately not opened |
| `learn0` | 46 | LEARN-0 frozen package, results, transcripts | `results/RESULTS.md` | Read (`DESIGN.md`, `summary_blockL.json`, `sessions_blockL.json` not read) |
| `m10` | 2 | blast-radius audit | `m10_blast_radius.json` | Not read |
| `m11` | 3 | repair verification | `m11_verification.json` | Not read |
| `m12` | 4 | filter audit | `m12_filter_audit.json` | Not read |
| `m13` | 1 | spec verifier | none | Not read |
| `m14` | 4 | attainability de-risk | `m14_attainability.json` | Not read |
| `m15` | 1 | prereg verifier | none | Not read |
| `m16` | 1 | freeze verifier | none | Not read |
| `m17` | 1 | descriptive verifier | none | Not read |
| `m18` | 1 | registry verifier | none | Not read |
| `m18_1` | 1 | binding verifier | none | Not read |
| `m19` | 1 | formulation verifier | none | Not read |
| `m19_1` | 1 | clarification verifier | none | Not read |
| `m19_2` | 1 | stress-spec verifier | none | Not read |
| `m19_3` | 3 | stress execution | `m19_stress.json` | Not read |
| `m31` | 3 | trajectory attainability observations | `data/m31_observations.json` | Not read |
| `m33` | 2 | typed-registry verifiers | none | Not read |
| `m34` | 1 | registry accounting verifier | none | Not read |
| `m35` | 1 | 100-node readiness script | none | Not read |
| `m38` | 2 | P0 development-graph substrate | none | Not read |
| `m39` | 14 | FutureScore shadow pilot, 8 evidence files | `M39_P1_RED_RECORD.md` | Skimmed (first ~2,600 bytes) |
| `m40` | 109 | FutureScore temporal stage 1, 106 evidence files | none identified | Not read |
| `m7` | 21 | M7 runtime, environment, arms, 12 gates incl. `verify_G15.js` | none tracked (console gates) | Not read (G15 from the handoff document) |
| `m8` | 13 | M8 collection | `data/manifest.json`, `candidates.jsonl` | Not read |
| `m9` | 9 | M9 analysis | `results/m9_results.json` | Not read (figures from VERIFICATION_STATUS / SYNTHESIS extract) |
| `mcf1` | 22 | MCF-1 harness, lodged scan record | `scan_records/1500000000-4000/admitted.json` | Skimmed (README lines 1–110) |
| `phase1_0` | 21 | Phase 1.0 repair gates, baselines, driver | none tracked (console gates) | Not read (status from VERIFICATION_STATUS §4) |
| `q1` | 18 | Q1 collection and claim analysis | `results/q1_claim_results.json` | Not read (SYNTHESIS extract only) |
| `registry` | 13 | seed registry, block layer, import isolation | none | Skimmed (README opening) |
| `study2` | 55 | FutureScore V2.3 Study 2 driver, 17 run files, validation | `execution/ANALYSIS.json` | Not read directly; the results record `research/preregistrations/FUTURESCORE_V2_3_STUDY2_RESULTS.md` was Read |
| `tc2` | 53 | transition contract, AC38 harness and feasibility preparation | none (unrun) | Skimmed: feasibility README and PROTOCOL lines 1–90; `TRANSITION_CONTRACT.md` not read |
| `uqa` | 16 | UQ-A liveness and collection | `results/uqa_results.json` | Skimmed: `uqa_liveness.json` read; main results not read |
| `uqb` | 23 | UQ-B collection, stress test | `results/uqb_results.json` | Skimmed: first 1,500 bytes of `uqb_stress.txt`; main results not read |
| `xfer1` | 14 | XFER-1 | `results/RESULTS.md` | Read |
| `xfer2` | 15 | XFER-2 | `results/RESULTS.md` | Read |

| `cf03b` | not counted | CF-03b calibration gate, dated 2026-11-13; **created after this inventory** (it was not among the 55 directories at HEAD `0a5ef40`) | `results/RESULTS.md` | Not read (ledger row transcribed from the coordinator's report) |

Total at inventory: 55 directories, 1,109 tracked files. Primary result **Read** for 13 directories (cf01, cf01b, cf03, exec_influence,
gate-floor1, gate-floor-b2, gate-floor-head, gate-floor-prodsem, gate-floor-interaction, gate-floor-spec, learn0, xfer1, xfer2) plus
Study 2 via its results record; **Skimmed** for 11 (cf00_audit, coga, credit1, fsbehav, fsfeas, m39, mcf1, registry, tc2, uqa, uqb);
**Not read** for the remaining 31. No raw session data and no summary JSON was opened except `exec_influence/report.json` and `uqa_liveness.json`.

<!-- EXP-END -->

## 3. `research/*`

| Directory | Tracked files | Contents | Coverage |
|---|---|---|---|
| `research/` (top-level files) | 23 | `09_decisions.md` (D-001…D-044), `SYNTHESIS_M7_M8_M9_Q1.md`, vision / hypotheses / metrics / log files | `09_decisions.md`: **Read** lines 1–475 (D-044 … D-031 in full); D-030 … D-001 headings only. `SYNTHESIS_M7_M8_M9_Q1.md`: Skimmed (keyword extract). `08_research_log.md` is empty (0 bytes). Others Not read |
| `research/cognitive-audit` | 37 | Phase 0 audit (00–05), M6 spec, M7 preregistration + 10 errata, characterization findings, 10 probes | `M7_CHARACTERIZATION_FINDINGS.md` Read; `05_VERDICT.md`, preregistration, errata, probes Not read |
| `research/evidence_backup` | 4 | raw-archive backup status, manifest, verifier | `README.md` Read; `COGA_DATA_BACKUP_2026-11-01.md`, `backup_manifest.json` Not read |
| `research/external` | 35 | external (Gemini) review packages, COG-A redirect proposal, prior-work audits, M-REG-2 package | `COG_A_REDIRECT_PROPOSAL.md` Read; all others Not read |
| `research/h1r_retrospective` | 20 | post-hoc exploratory retrospective of the VOID H1-R study, 8 figures, outputs | `README.md` Read; outputs and figures deliberately Not read (post hoc, not evidence for H1) |
| `research/handoffs` | 1 | `M7_POSTMORTEM_HANDOFF.md` | Read |
| `research/hypotheses` | 1 | `H001_Internal_Model_Construction.md` | Not read |
| `research/preregistrations` | 132 | preregistrations, digests, interpretations, formulations M21–M40, FutureScore contracts, H1-R prereg and fixtures, verifiers | Read: `FUTURESCORE_V2_3_STUDY2_RESULTS.md`, `FUTURESCORE_V2_3_STUDY2_DISPOSITION.md`, `FUTURESCORE_V2_3_BEHAVIORAL_DISPOSITION_01.md`. Not read: `M9_INTERPRETATION.md`, `Q1_INTERPRETATION.md`, `C1_INTERPRETATION.md`, all preregistrations, errata, M21–M40 formulations, `REGISTRY_MAINTENANCE_NOTE_01.md`, H1-R prereg |
| `research/reviews` | 4 | 2026-06-27 engineering audit and derivations | Not read |
| `research/spec` | 7 | platform specifications and traceability | Not read |

Total: 264 tracked files under `research/`.

## 3a. Known gaps of this audit

- D-001 … D-030 were read as headings only; any ruling there that changes a study's status is not reflected beyond its title.
- M8, M9, Q1, C1, UQ-A (main), UQ-B (main), M40 and the M10–M38 chain were not verified from their primary result files.
- `experiments/coga/acq1/RESULTS.md` and `RESEARCH_REPORT.md` were not opened; the void estimate appears in two README files that were read and is not reproduced.
- No gate, verifier or experiment was run; every pass/fail count is a transcription of a document.
- Remote state (what is pushed) was not checked.

<!-- RES-END -->

## 4. Git-ignored local files named by the root `.gitignore` (26)

Listed with `git ls-files --others --ignored --exclude-standard` restricted to the four path rules at the end of the root
`.gitignore`. None was opened for this audit (coverage: **Not read**), except where a tracked copy exists elsewhere.

H1-R local outputs — `/experiments/h1r/evidence/` (6):
1. `experiments/h1r/evidence/conformance_gates.json`
2. `experiments/h1r/evidence/conformance_run.log`
3. `experiments/h1r/evidence/existing_gates.json`
4. `experiments/h1r/evidence/existing_gates.log`
5. `experiments/h1r/evidence/g15_samples.json`
6. `experiments/h1r/evidence/runs.json`

H1-R diagnostics embedding a machine-specific temp path — `/experiments/h1r/evidence_r2/diagnostics/` (15):
7. `bootprobe.mjs` 8. `bootrun.mjs` 9. `cap_on.log` 10. `e3e4_on.log` 11. `epid.mjs` 12. `gapprobe.mjs` 13. `goaltype.mjs`
14. `pingprobe.mjs` 15. `pingrun.mjs` 16. `qattr.mjs` 17. `rewardprobe.mjs` 18. `rewardrun.mjs` 19. `sl_on.log`
20. `slipsuite.mjs` 21. `variants.mjs`

Scratch probes — `/experiments/phase1_0/_probe_*.js` (3):
22. `experiments/phase1_0/_probe_epsilon.js` 23. `experiments/phase1_0/_probe_stale.js` 24. `experiments/phase1_0/_probe_subsystems.js`

Large derived outputs of the H1-R retrospective (hashes pinned in `research/h1r_retrospective/RETRO_MANIFEST.json`) (2):
25. `research/h1r_retrospective/out/run_metrics.json` 26. `research/h1r_retrospective/out/trust_pairs.json`

**Other ignored material (not part of the 26).** Raw run data is excluded per study by `experiments/*/data/.gitignore`
(for example `experiments/learn0/data/run_blockL/`, `experiments/coga/data/acq1*/`, `experiments/h1r/data/raw/`,
`experiments/credit1/data/calib-*`, `experiments/mcf1/data/scan/`, the GATE-FLOOR `data/block*/` directories), plus
`experiments/gate-floor-interaction/tools/{session_guard.mjs,trees/}`, `experiments/gate-floor-spec/tools/session_d2.mjs`
and `.claude/`. None of the raw data was read for this audit; every number in the ledger comes from tracked summary files.
