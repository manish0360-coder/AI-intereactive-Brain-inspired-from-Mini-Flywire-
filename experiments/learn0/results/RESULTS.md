# LEARN-0 — results of the frozen confirmatory run on block L

**Status: EXECUTED 2026-10-24 (17:34:59Z–18:01:01Z).**
- The analysis is the frozen `analyze.mjs`, unchanged.
- This record is **proposed for commit**. Committing it needs the owner's authorisation.
- The evidence-preservation checks reported below have been completed: the local archive, the USB copy, and the USB re-check after physical re-insertion.
- Nothing in the frozen package was changed. The post-run freeze verifier passes every frozen-file pin, digest, configuration and line-ending check. Only its pre-run-only checks fail, as expected (§1).
- `verify_results_learn0.mjs` recomputes every number below from the per-session rows in this directory (`sessions_blockL.json`).

**Frozen status texts.** Two frozen texts still carry their design-time status. The execution status of record is this file, together with the run manifest `5ac256a7…`.
- The frozen analysis writes `status: "DESIGN_FOR_REVIEW"` into `summary_blockL.json`. That is `config.STATUS`, a frozen constant.
- The frozen `DESIGN.md` banner still reads "NOT AUTHORIZED and NOT EXECUTED".

Frozen files are not edited.

Every statement is tagged:
- **OBSERVED**: a number produced by the frozen pipeline;
- **RULE**: the frozen decision rule applied mechanically;
- **INTERPRETATION**: what the frozen design allows to be said, and nothing more.

---

## 1. Provenance

| item | value |
|---|---|
| frozen commit | `cc8a42d63db01a98a5ce0a95dc18953a41dfe180`; at execution, HEAD = `origin/main` = remote, and the tree was clean |
| gate 1 | HEAD, remote and working tree consistent with the frozen package |
| gate 2 | `verify_freeze_learn0.mjs --require-committed`: **30 of 30** |
| gate 3 | orchestrator `--plan-only` regeneration equals the frozen `blockL_worlds.json` field by field, **360 of 360**; the stream prefix equals the frozen source; the plan is exactly 2,160 sessions. Stream cache sha256 `8067c4f8…`, plan sha256 `a15a186b…` |
| run | `node orchestrate.mjs --out data/run_blockL --workers 10` |
| manifest digest | `5ac256a7b3d1ae45af30f99e23dbf9b9a3b97e58744798a3b7b00b01e6ef7f69` (copy in this directory: `manifest_blockL.json`) |
| digests | design `f2614ca3…`, decision `9beeef97…`, both the frozen values |
| tree and driver | LEARN-0 tree `main.js` `3d3266fd…`, `planning.js` `34e06c65…`; the driver committed in the freeze `cc8a42d` |
| post-run provenance | **5 of 5**: every one of the 2,160 sessions ran a frozen configuration with its frozen seed on the pinned tree, under that driver, and every file matches the manifest |
| post-run freeze verifier | **27 of 30** (`exec_postrun_verify_freeze.log`; observed after execution, before any results were in git). The 3 failures are its pre-run-only checks (below) |

**The freeze verifier after execution.** `verify_freeze_learn0.mjs` certifies the **pre-run** state, so some of its checks are expected to fail once the block has run. Its pin and configuration checks still pass.

**Pass (27 of 30):**
- F1: the freeze record, its self-digest, and the verifier's own pin.
- F2: every one of the 25 frozen files matches its pin, in the worktree and at HEAD; HEAD's tracked set is unchanged.
- F3: the digests, the preregistration, the approved design and the claim limits.
- F4: the runtime is unchanged, the LEARN-0 tree builds to its pins, and the call-graph audit passes.
- F5: the review record.
- F6: all four block-L configuration checks.
- F7: the "not authorised and not executed" statement. It passed only because the README had not yet been updated.
- F8: the decision-rule boundaries.
- F9: the line-ending checks.

**Fail by design (3 of 30):**
- F2: the exact frozen file set, because new run files are present.
- F2: the clean directory.
- F7: no block-L session record or run manifest.

**Once this record is committed**, the pre-run-only checks that fail are the two F2 checks on the exact frozen file set and on the committed directory, plus the two F7 checks for no results and the "not executed" statement. The F2 clean-directory check passes again. Every pin, digest and configuration check still passes. `verify_results_learn0.mjs` re-checks every frozen pin independently.

This was observed before the commit, by committing the proposed files in a disposable clone that was never pushed: 25 passed and exactly those 4 failed. The 30th check, F6's comparison with the local stream cache, runs only where that untracked cache exists |

**Transcripts in this directory.** Times are IST (UTC+05:30); the run was 23:04:59–23:31:01 IST.

| file | what it is | ORIGINAL / RE-RUN |
|---|---|---|
| `exec_gate2_verify_freeze.log` | gate 2 (freeze verifier), before the run | **ORIGINAL** |
| `exec_gate3_plan_only.VERBATIM.log` | gate 3 (orchestrator `--plan-only`), before the run | **ORIGINAL, verbatim**: 22 lines, sha256 `cf88f8f2…`. The last line, `exit 0`, comes from the shell wrapper |
| `exec_gate3_plan_only.log` | the same transcript | **FILTERED COPY**: the 18 `stream element N (s)` progress lines are removed. It is kept as first saved |
| `exec_plan_blockL.json` | the plan written by that `--plan-only` run | **ORIGINAL** |
| `exec_gate3_equality.log` | gate 3 (field-by-field equality with `blockL_worlds.json`) | **RE-RUN** at 23:33:05, about 2 min after the run, of the same deterministic check on the same inputs. The pre-run output (5 of 5) went to the console only |
| `exec_run_blockL.log` | the orchestrator's run output | **ORIGINAL**. The last two lines (`exit 0`, the UTC end time) come from the shell wrapper |
| `exec_postrun_provenance.log` | the post-run provenance check | **RE-RUN** at 23:33:11. The first execution (about 23:31, 5 of 5) went to the console only |
| `exec_postrun_verify_freeze.log` | the post-run freeze verifier | **ORIGINAL**: its only execution |
| `summary_blockL.json` | the frozen analysis output | **ORIGINAL** |
| `sessions_blockL.json` | one row per session, bound to the manifest hashes | **DERIVED** after the run by `export_sessions_blockL.mjs` from the raw records |

**Use of block L.** This is the consumption record; the typed registry is unchanged by design (see the governance finding).

| item | value |
|---|---|
| worlds | stream indices **1672–2031** |
| configuration seeds | **285,246–304,469** |
| agent seeds | **1,100,103,344–1,100,104,063** (train 1,100,100,000 + 2w; test + 1) |

These ranges are now used. No future study may draw them.

**Raw data.** `experiments/learn0/data/run_blockL/` (git-ignored, 120 MB) holds 2,160 session records, 360 exported stores, `plan.json`, `controls.json` and `MANIFEST.json`.

| copy | location | identity | status |
|---|---|---|---|
| archive (primary) | `E:/Projects/OpenSourceLab/archives/learn0/blockL_raw_cc8a42d.tar.gz` | 13,295,150 bytes, sha256 `a943ddb25b00ea086e9feece109790da2e17f56fde3e633ce158987d239cbf27` | verified file by file against the 2,524-file inventory. Record: `archive_blockL.json` |
| second copy | removable USB drive, `F:\MiniFlyWire_Evidence_Backup\learn0_blockL_cc8a42d\` | the same archive and an evidence snapshot | verified 2026-10-25, and **re-verified after physical re-insertion** (re-attached 01:13:27 IST; all checks passed). Record: `research/evidence_backup/backup_manifest.json` |

## 2. Sessions, exclusions, integrity (OBSERVED)

| item | value |
|---|---|
| sessions | **2,160 of 2,160**: 360 training + 1,800 test, 360 per cell |
| excluded worlds | **0 of 360** (excluded fraction 0.000; the limit is 0.10) |
| condition integrity (state P) | 2,160 of 2,160 |
| oracle audit (I2) | 2,160 of 2,160. Map-off sessions (1,800): **0** executed oracle calls, every guard reached. Map-on (O0, 360): all four oracles executed |
| store provenance (I7) | 360 of 360 training exports, 0 entries off the trajectory |
| store delivery, pairing, accounting (I3–I5) | the analysis reports 0 problems |
| training coverage (descriptive) | T executed **59–77 of 78** directed edges (development range: 66–76) |
| secondary intervals produced | 28 (28 declared) |

## 3. Primary outcome: E1 = N1 − N0, legal goal reaches

| | value |
|---|---|
| OBSERVED | **E1 = −24.4, 95 % percentile bootstrap interval [−36.3, −12.3]**. Mean legal reaches: N1 229.4, N0 253.7. 360 worlds: 157 positive, 200 negative, 3 zero. SD of the differences 114.5 |
| exact values | E1 = −24.356, N1 = 229.378, N0 = 253.733. Rounding the two means first gives 24.3; that is rounding only. E1 is the mean of the 360 per-world differences, which equals the difference of the unrounded means |
| RULE (δ = 20) | **INCONCLUSIVE.** The upper bound −12.3 > −20, so not EXPERIENCE_HARMS_WITHOUT_MAP. The lower bound −36.3 < 20, so not LEARNS_WITHOUT_MAP. The interval is not inside (−20, 20), so not NO_PRACTICAL_EFFECT |
| sensitivity (decides nothing) | δ = 15: INCONCLUSIVE; δ = 30: INCONCLUSIVE |
| OBSERVED, property of the interval | the interval lies wholly below 0. The frozen rule attaches **no** claim to that; the margin δ is the decision criterion |
| OBSERVED, design check | the observed SD (114.5) lies between the development value (107.5) and the inflated design value (134.4); the interval half-width (about 12) matches the planned 11–14 |

## 4. Secondary results: exploratory, unadjusted, no labels, no claims

The table gives each paired contrast as mean [95 % interval], from 360 worlds.

| id | contrast | OBSERVED |
|---|---|---|
| S1 | non-graph resets, N1 − N0 | +128.9 [113.7, 144.2] |
| S1 | all resets, N1 − N0 | +104.5 [93.7, 115.3] |
| S2 | N0 late − early (legal) | −2.5 [−6.2, 1.2] |
| S2 | N1 late − early (legal) | −5.5 [−8.8, −2.1] |
| S3 | downhill rate of legal far moves, N1 − N0 | −0.036 [−0.052, −0.021] |
| S3 | N0 above uniform chance (descriptive, not a null) | +0.116 [0.107, 0.125] |
| S3 | N1 above uniform chance (descriptive, not a null) | +0.076 [0.063, 0.089] |
| S4 | goal-entry share from goal-adjacent nodes, N1 − N0 | −0.004 [−0.025, 0.017] |
| S5 | O0 − N0, what switching the oracles on does (descriptive) | +116.5 [107.2, 125.8] |
| S6 | N1E − N0 (episodes only) | +33.8 [24.1, 43.3] |
| S6 | N1Q − N0 (Q only) | −40.0 [−49.4, −30.8]. The exact mean is −39.95, a decimal tie, shown as printed by the frozen analysis |
| S6 | N1E − N1 | +58.2 [49.5, 66.8] |

**By goal (90 worlds each).**

| goal | E1 | N1E − N0 | N1Q − N0 | O0 − N0 |
|---|---|---|---|---|
| 8 | −33.4 [−56.1, −10.4] | +37.7 | −68.7 | +107.9 |
| 12 | −11.7 [−36.5, 12.9] | +40.3 | −33.9 | +127.2 |
| 16 | −19.0 [−42.9, 5.4] | +28.3 | −6.5 | +120.7 |
| 19 | −33.4 [−55.6, −11.0] | +29.0 | −50.7 | +110.3 |

**Cell means and S7 diagnostics.**

| cell | legal | non-graph | all | illegal executed | admitted non-graph | goal-keyed Q | downhill / chance | entry / chance |
|---|---|---|---|---|---|---|---|---|
| N0 | 253.7 | 93.2 | 346.9 | 172.4 | 1,783.8 | 150.3 | 0.563 / 0.448 | 0.661 / 0.237 |
| N1 | 229.4 | 222.1 | 451.5 | 357.8 | 3,993.7 | 179.8 | 0.527 / 0.451 | 0.657 / 0.236 |
| N1E | 287.6 | 115.7 | 403.3 | 173.4 | 1,874.4 | 142.0 | 0.570 / 0.447 | 0.750 / 0.237 |
| N1Q | 213.8 | 80.6 | 294.4 | 160.2 | 1,815.5 | 185.1 | 0.549 / 0.443 | 0.562 / 0.236 |
| O0 | 370.3 | 90.8 | 461.1 | 167.0 | 1,695.9 | 139.4 | 0.709 / 0.428 | 0.747 / 0.235 |

There are 28 unadjusted intervals; about 1.4 would exclude the true value by chance alone. None of them carries a label or supports a claim.

## 5. Interpretation (only what the frozen design allows)

- **INTERPRETATION.** E1 is INCONCLUSIVE. Under frozen §11, that licenses **no claim beyond the interval itself**. The confirmatory run did not establish that the persisted store, as a whole, raises, lowers, or leaves practically unchanged the legal goal reaches when the map oracles are disabled. Per the frozen decision table, **the design question goes back to the Director.**
- E1 is the total effect of the whole store, not of any component or mechanism.
- The secondary patterns are exploratory and support no claim. These include:
  - the episodes-only and Q-only contrasts pointing in opposite directions (as in development);
  - the rise in non-graph resets with the store;
  - the lower downhill rate.

  At most they can motivate a new, separately preregistered study, for example a component study (LEARN-1).
- Frozen claim limits apply in full:
  - same world and goal;
  - not transfer, recall, planning or understanding;
  - experience may include a graph reconstruction learned by experience;
  - LEARN-0 does not separate learning a map from other uses of experience;
  - no production change.

## 6. What remains open

- **USB storage.** The USB copy passed its re-check after physical re-insertion on 2026-10-25. Safe ejection and storage away from this computer are still for the owner to confirm.
- **Registry.** The governance milestone that would record the line's territory, now including block L, is still optional and separately authorisable. The registry was not changed.
- **Next question.** The design question goes back to the Director (frozen §11).

## 7. Corrections proposed with this record (no number, label or rule changed)

| # | item | kind | resolution |
|---|---|---|---|
| 1 | E1 −24.4 against rounded means 229.4 − 253.7 = −24.3 | documentation improvement (not a discrepancy) | exact values added (§3) |
| 2 | N1Q − N0 shown as −40.0 | documentation improvement (not a discrepancy) | the exact −39.95 tie is noted (§4) |
| 3 | frozen texts carry design-time status (`summary_blockL.json` `status`, the DESIGN.md banner) | factual discrepancy between frozen labels and the actual state | documented at the top; frozen files not edited |
| 4 | `exec_gate3_plan_only.log` was a filtered copy | factual provenance discrepancy | the verbatim transcript is added; the filtered copy is labelled (§1) |
| 5 | two transcripts were re-runs | factual provenance discrepancy (labelling) | every transcript is labelled ORIGINAL / RE-RUN / FILTERED / DERIVED (§1) |
| 6 | "single local copy; no backup yet" | statement outdated by the later archive and USB milestones | replaced by the verified copies, including the passed re-check after re-insertion (§1, §6) |

The pre-commit version of this record (sha256 `ece96aed…`) is preserved in the evidence snapshot on both copies.
