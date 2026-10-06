# Decisions

Project decision log. One entry per ruling. Newest first.

Entries record **decisions and their scope**. They are not specifications, do not
supersede any frozen artifact, and carry no executable effect.

---

## D-031 — H1-R Stage 1: controlled-unblinding protocol-deviation note (documentation only)

**Date:** 2026-10-06 · **Authority:** Research Director "Stage-1 final preservation before extension" ruling (2026-10-06), after the Stage-1 lodging commit `e16ef7e` · **Status:** record of a deviation; no executable effect
**Scope:** one factual note. It changes no scientific design, pre-registration, analysis, instrument, registry, seed or stage configuration, and it reproduces no numerical value.

### 1. The deviation (FACT)
- During controlled unblinding, the Stage-1 decision artifact (`experiments/h1r/stage_records/stage1_probe.json`) was opened, and its F-11 point-estimate, standard-error and interval fields were viewed. The Director's instruction permitted inspecting and reporting only the routing fields (`containsZero` and the routing action).
- The executing agent disclosed this in its own report for that step. The numerical values were not reproduced in that report and are not reproduced here. They remain in the lodged artifact, which is unmodified.
- Earlier, while deciding what to lodge, the names of the files in `stage_records/` were listed. That showed the shape of the decision record before the artifact was opened.

### 2. What did not happen (FACT)
- No scientific analysis was performed.
- No execution decision was changed using those values.
- No protocol parameter was changed.
- No additional run was performed.
- The frozen routing action remained `EXTENSION_REQUIRED`. It was written by the frozen command before any read, and the recorded `containsZero` flags of both windows determine it under v1.0 §13.

### 3. Treatment
Nothing was deleted, altered, hidden or rewritten. The lodged artifact and its SHA-256 sidecar are byte-identical to what `e16ef7e` committed. The extension was not executed.

---

## D-030 — H1-R build-identity reconciliation: one record describes the current pre-Stage-1 tree; Stage-1 readiness gate

**Date:** 2026-10-06 · **Authority:** Research Director "H1-R final build-identity reconciliation → Stage-1 readiness" (2026-10-06), after D-029 (`1919b04`) · **Status:** in force; implemented in `experiments/h1r/build_identity.mjs` and `experiments/h1r/BUILD_IDENTITY.json`, gated by `experiments/h1r/verify_readiness.mjs`
**Scope:** build-identity bookkeeping and one readiness gate.
- It changes no scientific design, pre-registration (v1.0 `c52e7337…a836`), analysis (`analyze.js` `dae6012c…`), orchestrator (`orchestrate.mjs` `6162f8c2…`), instrument file, runtime, arm, reward, trust, RNG, environment, registry, seed or stage configuration.
- Milestone B (`6fc5a9e`) is not reopened. No Stage 1 or Stage 2 ran.

### 1. Diagnosis (FACT)
- **The one mismatch:** `build_identity.mjs --check` at `1919b04` reported a difference in exactly one of the 42 listed entries, `experiments/h1r/verify_orchestrator.mjs`.
  - Stored: SHA-256 `fb7045b1…`, blob `ea262f53…`. Current: SHA-256 `49c49807…`, blob `55bfd375…`.
  - The cause is D-029's deliberate change to that verifier.
- **No scientific entry differs.** The `instrumentIdentity` object, the pre-registration hash and every protocol, analysis, orchestrator, instrument and registry entry are identical to the record's.
- **What the record is for:** v1.0 §1.2 records the instrument hashes "before the first Stage-1 run". Its own statement calls it the pre-Stage-1 build identity, and the README says `--check` re-derives it from HEAD. It therefore describes the current pre-Stage-1 tree. Its verifier entries are provenance, not instrument identity.

### 2. Ruling as implemented
- **One record, current tree.** `BUILD_IDENTITY.json` was re-derived mechanically from git blobs (`build_identity.mjs --write`), not edited.
  - Schema `h1r.build-identity/2`; `baseCommit` `1919b04`; `supersedes` names the Milestone-B record (`6fc5a9e`, SHA-256 `9647827a…`).
  - The verifier group gains `verify_o23.mjs` and `verify_readiness.mjs`. The `verify_orchestrator.mjs` and `build_identity.mjs` entries take their current blobs.
  - Everything else is identical. No second record exists, and no earlier commit is rewritten.
- **History stays reproducible.** `derive()` still defaults to the Milestone-B profile, which reproduces the superseded record byte for byte from `6fc5a9e`'s blobs. `--write`, `--check` and `checkAt()` use the current profile.
- **`verify_o23.mjs` re-anchored.** Its repository-fact checks G1, G3 and G4 now read the D-029 commit (`1919b04`), not the working tree, so they keep their meaning after the record is re-bound.
  - G2 still reads the working tree, minus the record.
  - T4 compares the instrument identity with both the current and the Milestone-B record.
  - No check was weakened: `verify_readiness.mjs` F1 gates every change after `1919b04`.

### 3. Verification (on the local candidate whose code this commit contains unchanged)
- `verify_readiness.mjs`: 15/15. It covers the identity check, the binding and supersession, the delta against the Milestone-B record, the scientific-immutability check (27 files byte-identical at `6fc5a9e`, `1919b04`, HEAD and in the working tree), the production registry, and the evidence.
- Anti-vacuity: 5 mutants, all rejected by the comparison `--check` runs, in a throwaway clone. They are the old `verify_orchestrator.mjs` mismatch, the Milestone-B record, one byte in an instrument file, one byte in `analyze.js`, and one changed instrument hash in the record. The unmodified clone passes `--check`.
- `verify_o23.mjs` 12/12 (7/7 mutants), `verify_orchestrator.mjs` 30/30, `verify_freeze.mjs` 11/0, fresh clone under `core.autocrlf=true` 220/220 with identity 16/16.

### 4. Consequence for Milestone B's gate (classified from its source)
`verify_milestone_b.mjs` is byte-unchanged and stays bound to `6fc5a9e`, where it passed 36/36. At this commit it scores 30/36. The six failing checks each bind to a past state:
- **H-P, S1, S2:** classified in D-029 (the check of O23's old source, and the two since-base scope checks).
- **B1, B3, A3:** new. They bind to the record as `6fc5a9e` added it.
  - B1 compares the current record with a derivation from the adding commit.
  - B3 requires the adding commit's parent to equal the record's `baseCommit`.
  - A3 compares HEAD's blobs with the `6fc5a9e` fresh-clone evidence. Its one inconsistent file is `BUILD_IDENTITY.json` itself.
  - They cannot hold once that record is superseded, which is the point of D-030. The earlier expectation of exactly three failures did not account for this.
- The other 30 checks pass, among them B2 and B4 (the instrument identity and the working-tree hashes equal the record), the registry checks and the §11 evidence checks.
- No check was weakened or deleted, and the gate's own evidence is untouched.

---

## D-029 — H1-R O23 safety hardening: the orchestrator gate's registry check can no longer start Stage 1

**Date:** 2026-10-06 · **Authority:** Research Director "O23 safety hardening — final pre-Stage-1 milestone" (2026-10-06), after Milestone B (`6fc5a9e`) · **Status:** in force; implemented in `experiments/h1r/verify_orchestrator.mjs` (`o23RegistryIntegrity`), gated by `experiments/h1r/verify_o23.mjs`
**Scope:** one verifier check.
- It changes no scientific design, pre-registration (v1.0 `c52e7337…a836`), analysis, runtime, arm, reward, trust, RNG, environment, registry allocation, seed or stage configuration.
- `analyze.js`, `orchestrate.mjs`, the instrument files and the Milestone-B build-identity record are unchanged. Milestone B is not reopened.

### 1. History (classified)
- **At `bf0833f` (Milestone A):** O23 asserted the pre-registration registry (no H1-R record, no stage executable) and PASSED.
  - It also ran `orchestrate.mjs stage1` twice: once with an empty authorisation, and once with `H1R_STAGE_AUTHORISED=stage1`, relying on the registry pre-check to refuse.
- **At `6fc5a9e` (Milestone B):** the registry records H1-R's pilot use, so that authorised probe would have started a real Stage 1.
  - It was unreachable only because O23 threw first. Its in-memory registry duplicated the now-committed 004–008 records.
  - O23 FAILED by design, as classified in Milestone B.

### 2. Ruling as implemented
- **What O23 is now:** `o23RegistryIntegrity(O, typed)`. It is read-only and in process, and starts no process. It reads only `O.PROTOCOL`, `O.productionRegistry`, `O.registryPrecheck` and the typed registry.
- **What it asserts, under the post-registration registry:**
  - Stage 1 and the extension are executable as far as the registry is concerned;
  - Stage 2 is not (confirmatory seeds and block 900500 unrecorded);
  - seeds 000–003 are refused;
  - H1-R records exactly 004–008, pilot and unexecuted;
  - without those records, or without the pilot block, Stage 1 is not executable.
- **Removed:** both CLI probes and `execFileSync`. The CLI's authorisation and registry refusals stay gated by `verify_cli.mjs`, in sandboxes on test doubles (C4, C5).
- **Consequence for Milestone B's gate:** the since-base checks of `verify_milestone_b.mjs` (S1, S2) and its check of O23's old source (H-P) no longer hold at later commits. That gate stays bound to its own commit, `6fc5a9e`, where it passed 36/36.
- **Consequence for the build-identity record:** `build_identity.mjs --check` at later commits reports a difference. The record, bound to `6fc5a9e`, lists that commit's hash of `verify_orchestrator.mjs`. Every other listed file, and the instrument identity the orchestrator stamps, are unchanged (`verify_o23.mjs` G3, T4).

---

## D-028 — H1-R N3: `verify_determinism.js` C1 compared without its fingerprint-count detail (named interpretation of OFF ≡ pristine)

**Date:** 2026-10-06 · **Authority:** Research Director "D-028 / final Milestone-B closure" (2026-10-06), after the read-only C1/N3 semantic investigation · **Status:** in force; implemented in `experiments/h1r/verify_existing_equivalence.mjs`, gated by `experiments/h1r/verify_d028.mjs`
**Scope:** the N3 equivalence check only (D-019 §5 N3, "OFF ≡ pristine").
- This is a named interpretation of the frozen relation "OFF ≡ pristine". H1-R v1.0 is unchanged (SHA-256 `c52e73378ad7759fe4e2829e972d1a97b5297da49b327b3c700c654a218ca836`), as are D-019 … D-027.
- It does not change the hypothesis, pre-registration, arms, environment, reward, seeds, estimand, analysis, validity flags, metrics, Stage 1 or Stage 2.

### 1. Ruling
For N3, and only for the assertion with ID `C1` produced by `experiments/m7/verify_determinism.js`, the relation compares:
1. the assertion ID;
2. the assertion's order/position;
3. its PASS/FAIL verdict;
4. the process exit code.

It does not require exact equality of C1's diagnostic detail giving the number of distinct fingerprints. Only that count is ignored; every other part of the line, every other C1 field, D4, every other assertion and every other gate script remain binding.

### 2. Basis (the read-only investigation)
- C1 runs 8 concurrent repair-suppressed runs (`verify_determinism.js:129`). Their trajectories depend on the wall-clock replay cooldown (`render/episodeManager.js:512`).
- It computes N, the number of distinct fingerprints (`:130`). Its verdict is N > 1.
- N reaches nothing downstream except N3's exact-text comparison:
  - no H1-R analysis input;
  - no run-validity flag;
  - no provenance or registry state;
  - no Stage-authorization code;
  - no final scientific verdict.

---

## D-027 — H1-R Milestone B: registry linkage for the pilot, pre-Stage-1 build identity, line-ending protection, CLI gate

**Date:** 2026-10-05 · **Authority:** Research Director "Milestone B authorization" (2026-10-05), after Milestone A (`bf0833f`) · **Status:** in force; implemented in Milestone B
**Scope:** governance and engineering only, before any Stage-1 data.
- H1-R v1.0 is unchanged (SHA-256 `c52e73378ad7759fe4e2829e972d1a97b5297da49b327b3c700c654a218ca836`), as are D-020 … D-026. No estimand, formula, window, verdict rule, validity rule or pre-registration text changes.
- `analyze.js` (`dae6012c1ac48a96ccd9835b24e7aadce9243d95e147a5d8d2b3f833fb0a414d`) and `orchestrate.mjs` (`6162f8c21dab3b95b826c349a2794a70c51cf5a7f6e285a44d0b52efd398032b`) are unchanged.
- Stage 1 and Stage 2 are not run. No confirmatory or held-out allocation is consumed, and no experimental seed is generated.

### 1. Authorized scope (one milestone)
1. **Registry.** Perform the first two v1.0 §7.6 registry actions:
   - record the H1-R pilot configuration block 886000–889999 (new chain link `consumed_after_h1r.js`);
   - record the (H1-R, pilot) trajectory records for 20260819004–008 (`typed.js`).

   Historical verifier flips caused by this are classified as FACT and named. They are not hidden, and historical evidence is not altered.
2. **Build identity.** A committed, deterministic, byte-stable pre-Stage-1 build-identity record. It covers the pre-registration, `analyze.js`, `orchestrate.mjs`, the instrument files, the relevant verifiers and commit identity, and holds no timestamp or host path.
3. **Line endings.** Minimal `.gitattributes -text` for `orchestrate.mjs` and the H1-R instrument files, then a fresh-clone test with `core.autocrlf=true` over the committed SHA-256 of every protected file.
4. **CLI gate.** A direct gate on the CLI `runCommand` through the actual CLI command path. It covers:
   - valid dispatch, unknown commands and argument validation;
   - determinism;
   - no Stage 1 or Stage 2 execution, and no registry consumption;
   - no filesystem mutation outside the test area;
   - failure propagation.

   The CLI is not redesigned.
5. **Battery.** The full §11 battery once at the end, with F2, G15′ and P1 non-blocking. It also verifies:
   - analysis and orchestrator determinism;
   - schema;
   - protected hashes and registry integrity;
   - that no stage ran and no seed was generated;
   - that the working tree is clean.

### 2. Boundaries kept from the authorization
- `analyze.js` changes only for a genuine Milestone-B compatibility requirement, and then only after stopping and reporting.
- Raw H1-R records remain authoritative and outside Git.
- A missing base record remains a crash: an invalid run, whose (configuration, seed) pair is dropped and never re-run.
- A fork is valid iff all 11 flags are true.
- No trajectory is invented.

---

## D-026 — H1-R orchestrator rulings: no-record policy, fork-crash definition, I-23 option A, storage; Milestone A

**Date:** 2026-10-05 · **Authority:** Research Director "Final orchestrator rulings + Milestone A authorization" (2026-10-05), on the read-only orchestrator/registry design report · **Status:** in force; implemented in `experiments/h1r/orchestrate.mjs` and `experiments/h1r/analyze.js` (Milestone A)
**Scope:** orchestration, storage and one records-level analysis correction, fixed before any Stage-1 data.
- H1-R v1.0 is unchanged (SHA-256 `c52e73378ad7759fe4e2829e972d1a97b5297da49b327b3c700c654a218ca836`). No hypothesis, metric definition, window, exclusion, arm, reward, topology, seed, RNG seed, estimand or verdict rule changes.
- §3 changes `analyze.js`: the SHA-256 `8c5c65bc8a174abfb0d0201d98a8c4a9aab3c5ee13afc3f6f612e722e0c45b3c` (`24e6e5f`) is therefore not the Stage-1-binding SHA. The new SHA is recorded with Milestone A and resealed before Stage 1.
- The registry is not changed; no seed is generated; no stage runs.

### 1. No-record policy
A planned base run that produces no record because its process dies is a crash. Treat it as: completed = false → invalid run → corresponding (configuration, seed) pair is dropped. Do NOT automatically rerun a missing base run. The deterministic retry mechanism remains limited to the preregistered fork procedure.

### 2. Fork-crash definition
A fork measurement is valid iff ALL 11 validity flags are true. If any of the 11 flags is false, the fork is invalid/crashed for fork-analysis purposes. Do not define fork failure merely as process failure or outcome.crashed.

### 3. I-23 — option A
- I-23 is a real contradiction with frozen C-3/G1. The current records-level bootstrap grid cannot be allowed to derive its configuration/seed universe only from configurations/seeds having valid runs.
- The records input must explicitly declare its frozen configuration universe and seed universe.
- The records-level bootstrap must use that declared full universe, including empty configuration rows and empty seed columns.
- Do NOT create an exception for records-level descriptive CIs.
- After implementing I-23: rerun the complete analysis battery, all mutation tests, determinism, schema verification and the relevant G1/IR-34c checks; recompute and record the new analyze.js SHA; reseal the hash before Stage 1.

### 4. Storage policy
- Raw run records are authoritative and remain outside Git, in the project's local experiment-data area `experiments/h1r/data/`. The directory must be Git-ignored.
- Manifest paths must be repository-relative, never machine-specific absolute paths.
- Every authoritative raw record gets SHA-256. The hash identifies the uncompressed authoritative bytes. Lossless compression is allowed as a storage optimization only.
- Derived study inputs, manifests, decision records and analysis outputs remain small and may be committed. Derived data must always be reconstructible from raw records.

### 5. Milestone A (authorized)
One logically complete engineering milestone: the I-23 `analyze.js` correction; the orchestrator (plan → registry pre-check → schedule → execute → record / no-record → structural validation → identity/provenance validation → validity classification → pair construction → study-input construction → frozen `analyze.js`), with no metric re-implemented outside `analyze.js`; a read-only registry pre-check; record collection; the validity/drop state machine; study-input construction; the Stage-1 analysis probe; the fork plan; the lazy records path; deterministic outputs and manifests; gates O1–O26; and the §11 battery rerun (`verify_conformance`, `verify_ms1_unit`, `run_existing_gates`, `verify_existing_equivalence`, `verify_analysis`, `verify_freeze`). No Stage 1 or Stage 2, no registry consumption, no new seeds, no experimental data collection.

---

## D-025 — H1-R final micro-rulings: PR-4, C-1 on HALT, PR-7.3 key set, PR-12 bins and undirected variant, PR-10.1 array, X-1, link ① arms

**Date:** 2026-10-05 · **Authority:** Research Director "Final micro-ruling + implementation authorization" (2026-10-05), after the docs-only freeze `2fb3b60` · **Status:** in force; implemented in `experiments/h1r/analyze.js` together with D-024
**Scope:** interpretations of H1-R v1.0 for cases its text does not settle, fixed before any Stage-1 data.
- H1-R v1.0 is unchanged (SHA-256 `c52e73378ad7759fe4e2829e972d1a97b5297da49b327b3c700c654a218ca836`). D-020, D-023 and D-024 are unchanged; this entry closes what D-024 left open.
- PR-4 is the only item in the mandatory output schema `h1r.d021b.output/1`. Apart from C-1, every ruling here is descriptive only (v1.0 §14).

### 1. PR-4 — mandatory output contract
- **A1:** Use the computable recorded trust-term quantity: x = |recorded trust term| / 12, equivalently |T - 0.5| for the recorded trust value.
- **B1:** Five equal-width bins over [0,0.5], with the frozen edge-inclusive rule: bin = min(4, floor(10*x)).
- **K1:** Use the recorded step-0 candidate entries.
- **E1:** For each run/study, pool: total flips / total decisions by bin, then compute the Spearman rho of bin index versus flip rate.
- **F1:** Use the frozen ordinary Spearman handling; empty/degenerate statistic => null. IR-12 zero-variance => null.
- PR-4 remains descriptive but is mandatory because it is part of the output contract.
- Do not introduce an alternative trust quantity or unrecorded edge-level data.

### 2. C-1 — F-11 fires on HALT
- If the predetermined extension is unavailable: fires = false; outcome = HALT.
- If F-11 is actually evaluated and fires, including after the extension: fires = true; outcome = VOID.
- If F-11 is non-computable after the required extension: fires = true; outcome = VOID.
- No verdict is issued in either terminal case.

### 3. PR-12 calibration bins
Use the same trust-bin convention as PR-7.3: bin = min(9, floor(10*x)) for x in [0,1].

### 4. PR-7.3 trust entropy key set
- Use the >=1 raw-attempt keys as the denominator/key set.
- The >=3 threshold is only the separate coverage statistic.
- Compute entropy over the trust values of keys with >=1 raw attempt in the relevant phase.

### 5. PR-12 undirected variant
- Compute Spearman rho between pooled undirected trust = (s1+s2+1)/(a1+a2+2) and the corresponding configured p_e.
- Qualifying undirected edge: raw1 + raw2 >= 5.
- Compute per run at the defined snapshots.

### 6. PR-10.1 array
- Use the §12 analysed valid-cell array after the prescribed §12 row-removal rule.
- Do not create a separate sensitivity-analysis array.
- The Appendix-B.2 min-F' formula is applied to that analysed array.

### 7. X-1
- Apply descriptive CIs only to already-promised descriptive link statistics and already-defined descriptive contrasts/windows.
- Do not create arbitrary new arm-pair families.

### 8. PR-7.2 / PR-7.3 arms
Apply the link-① descriptive metrics to all seven arms.

### 9. Implementation authorization (recorded)
One `analyze.js` milestone implementing D-024 and this entry: PR-4; PR-5 through PR-12; X-1 within the frozen scope; C-1 exactly; G1 full-grid bootstrap indexing replacing the unauthorized G3 behaviour; IR-03b, IR-12 and IR-34c preserved; every frozen verdict rule, estimand, window, arm, reward, RNG seed and exclusion preserved. The details the implementation had to fix in order to compute are listed in `analyze.js` as INFERENCES I-17 … I-29. They are not rulings.

---

## D-024 — H1-R analysis interpretation rulings (IR-03b, IR-12, IR-34c, PR-1–PR-3, PR-5–PR-12, X-1, C-1–C-3)

**Date:** 2026-10-05 · **Authority:** Research Director rulings of 2026-10-05: the "D-021(b) independent analysis implementation" freeze (IR-03b, IR-12, IR-34c); "PR-1 / PR-2 / PR-3"; and the "Consolidated H1-R ruling freeze" (every item below). Each follows a read-only ambiguity report on `analyze.js` · **Status:** in force; PR-4 ruled in D-025; implemented in `experiments/h1r/analyze.js` together with D-025
**Scope:** interpretations of H1-R v1.0 for cases its text does not settle, fixed before any Stage-1 data.
- H1-R v1.0 is unchanged (SHA-256 `c52e73378ad7759fe4e2829e972d1a97b5297da49b327b3c700c654a218ca836`). No rule that v1.0 states is changed: no hypothesis, metric definition, window, exclusion, arm, reward, topology, seed, RNG seed, estimand, threshold or stated verdict rule.
- Verdict-relevant: PR-1, PR-2, C-1, C-2 and C-3. They settle non-computable cases and the bootstrap cell set for F-1, F-3 and F-11. Every other ruling here is descriptive only (v1.0 §14: "No other rule, window, metric or exclusion may enter the verdict").
- `analyze.js` (uncommitted, SHA-256 `995e2fa6d47399122ca629178d871ff02c48dbdb66a5bfc72f8a4a654b36faa3`) does not yet implement these rulings. Implementing them is a separate milestone.
- **Not ruled here:** PR-4, the link ③ monotonicity diagnostic. It is the only open item in the mandatory output schema `h1r.d021b.output/1`.
- IDs such as 5.1-a name the alternatives in the read-only PR-5–PR-12 alternatives report of 2026-10-05 (not committed). The text of each ruling below stands on its own.

### 1. Earlier frozen interpretations (consolidated wording; first wording in §15)
- **IR-03b:** thr = 0.5 * R_W2 literally. No clamp.
- **IR-12:** If Spearman/rank statistic has zero variance, return null/undefined.
- **IR-34c:** Bootstrap replicates producing an undefined statistic are not silently discarded/rescaled. Record valid/invalid counts. If fewer than 10,000 valid replicates exist, the corresponding CI is null/not computable.

### 2. PR-1, PR-2, PR-3
- **PR-1:** A non-computable criterion is FAILED/FIRED rather than satisfied. F-11 follows C-1 below. A non-computable F-11 after the predetermined extension results in VOID, not HALT.
- **PR-2** (frozen in the ruling "PR-1 / PR-2 / PR-3"; not restated in the consolidated freeze): For F-1 and F-3, if the required statistic exists but its bootstrap CI is null/non-computable under the frozen IR-34c rule, the criterion is treated conservatively as FIRED because the required exclusion of zero cannot be established. Do not replace the null CI with a numeric value.
- **PR-3:** Outside §12 crossed test/bootstrap calculations, use every valid cell. Do not extend the §12 row-removal rule into other metrics.

### 3. PR-5 — permutation null
- **5.1-a:** For each A1 run, compute both τ=1499 and τ=2999. Within each run, process τ=1499 then τ=2999. Use one makeRng(770003) sequentially over runs.
- **5.2-a:** If observed rho is undefined, do not run the 10,000 shuffles. Report permutation p-value as null.
- **5.3-a:** 99th percentile is the 9,900th order statistic of raw rho* values. Do not use abs(rho*) for the percentile.
- **5.4-a:** Report per-run permutation p-value and null 99th percentile only. No additional cross-run summary.

### 4. PR-6 — Brier score
- **6.1-a:** Use attempts with τ in [0,2999].
- **6.2-a:** Use one global prequential base rate across all keys, cumulative through the whole run: (successes so far + 1) / (attempts so far + 2).
- **6.3:** Report: Brier(trust); Brier(global base); Brier(trust) - Brier(global base). Do not introduce a skill-score metric.
- **6.4-a:** Aggregate as mean of per-run scores.
- **6.5-a:** Report whole-run Brier score.

### 5. PR-7 — link ①
- **7.1-b:** n_updates means actual trust-store increments, not merely attempts.
- **7.1-c:** Also report whole-run n_updates.
- Report for all seven arms.
- **7.2:** At τ=1499 and τ=2999: numerator = raw attempts in that phase >=3; denominator = keys with raw attempts >=1 in that phase.
- **7.3:** Trust entropy: same qualifying key set; snapshots at τ=1499 and τ=2999; 10 equal-width bins on [0,1]; bin = min(9, floor(10*x)); Shannon entropy in bits.

### 6. PR-8 — steps-to-goal
Use actual step/tick length, not raw reset-call gap.
- **8.1-a:** tickUnit = step.
- **8.2-b:** Correct reset observation lag so a cap episode is 150 ticks, not 151. First episode begins at τ=0. (Basis: the cap-boundary observation lag recorded in `experiments/h1r/evidence_r1/R1_REPORT.md`, row "cap H7".)
- **8.3-a:** Kaplan–Meier median is the smallest t for which survival <= 0.5.
- **8.4-a:** Whole-run per-run KM median.
- **8.5-a:** Median of run medians uses ordinary two-middle averaging. If either middle value is +infinity, result is +infinity.
- Report descriptively for all seven arms.

### 7. PR-9 — trajectory entropy
- **9-b:** Count all realised directed transitions in W: successful transitions; goal-entering transitions; slip transitions u -> u. Do not count reset teleports. Do not reconstruct/count unrecorded self-choice no-ops.
- Compute per run per window, then mean per arm.
- Use all four windows W1–W4.

### 8. PR-10 — sensitivity analyses and rank-biserial
- **10.1:** Use the committed Appendix-B.2 min-F' / Satterthwaite formulation on the analysed valid-cell array. Degenerate denominator => null. (The formulation is variant `satt` of `research/preregistrations/h1r_v1_checks/min_f_size_simulation.mjs`, committed with v1.0 at `a5965da`.)
- **10.2:** Wilcoxon: Pratt; two-sided; exact conditional sign-flip distribution; use every valid cell under PR-3; direction follows sign(T+ - T-). Do not use Monte Carlo p-values.
- **10.3:** Matched-pairs rank-biserial: r = (T+ - T-) / (T+ + T-), using Pratt ranking: zeros retained in ranking but excluded from T+ and T-. If every difference is zero, r = null.

### 9. PR-11 — A5 ≡ A2 per window
- Use identity of the saved reward-event streams restricted to each window.
- Do NOT weaken this to equality of total reward.
- Do NOT substitute attempt-stream identity.
- Overall fingerprint remains a whole-run diagnostic only.

### 10. PR-12 — calibration curve, partial rank correlation, undirected pooled variant
- **Calibration:** Link-② qualifying keys; τ=1499; 10 equal-width trust bins; per-bin mean trust; per-bin mean configured p_e; pooled across A1 runs.
- **Partial rank correlation:** control variable = raw per-phase attempt count; first-order partial Spearman; τ=1499 and τ=2999; zero variance or undefined denominator => null; fewer than 4 usable observations => null.
- **Undirected pooled variant:** pooled trust = (s1+s2+1)/(a1+a2+2); qualify when raw1 + raw2 >= 5; compute per run and both snapshots.

### 11. X-1 — descriptive CIs
- Extend the existing §12 descriptive CI machinery only to already-promised descriptive link statistics and the already-defined contract contrasts/windows.
- Include W2/W4 descriptive CIs where the protocol says descriptive metrics are reported with CIs.
- Do not invent arbitrary new arm-pair families.

### 12. C-1 — F-11
- Initial non-computable F-11: Do the predetermined 5-configuration × 5-seed extension first.
- If after the extension F-11 is still non-computable: fires = true; outcome = VOID; verdict = VOID; stage2 = null.
- If the predetermined extension itself is unavailable: outcome = HALT.
- No verdict is issued in either terminal case.

### 13. C-2 — bootstrap cell set
- Use R1: The §12 bootstrap recomputes each statistic on every available valid cell used by the corresponding point statistic.
- Do NOT row-reduce the bootstrap to configurations having every seed valid.
- This applies to the F-1/F-3/headline §12 bootstrap quantities.

### 14. C-3 — bootstrap index grid
- Use G1: Retain the complete C × S configuration/seed index universe.
- Do NOT silently drop empty configuration rows. Do NOT silently drop empty seed columns.
- Bootstrap index draws are therefore made against the frozen full grid.
- If a bootstrap replicate produces no computable statistic, apply IR-34c.
- The current G3 behavior (drop empty rows but keep empty columns) is not authorized and must later be removed.

### 15. Wording as first frozen (kept verbatim for traceability)
The consolidated freeze restates the rulings below. For F-11, its C-1 settles "halted/voided": VOID after the extension, HALT only when the extension is unavailable.

From the ruling "D-021(b) independent analysis implementation" (2026-10-05):
> **IR-03b — HALF-LIFE.** Use the frozen formula exactly as written: thr = 0.5 * R_W2. Do NOT clamp the threshold to zero or otherwise reinterpret it when R_W2 <= 0. The mathematically resulting threshold is the recorded value.
>
> **IR-12 — SPEARMAN ZERO VARIANCE.** If fewer than 3 qualifying keys exist, Spearman is undefined as already specified. Additionally, if the qualifying values have zero variance in either required variable, Spearman is undefined. Return null for that statistic and record the undefined condition. Do NOT substitute 0, epsilon, or another numerical value.
>
> **IR-34c — BOOTSTRAP UNDEFINED REPLICATES.** For the mandated 10,000 bootstrap replicates:
> - Never convert an undefined/non-computable replicate into a numeric value.
> - Never silently discard undefined replicates and rescale the percentile positions.
> - Record the number of undefined replicates.
> - If fewer than 10,000 valid replicates remain, the corresponding bootstrap CI is not computable and MUST be represented as null.
> - Do not introduce any discretionary fallback.

From the ruling "PR-1 / PR-2 / PR-3" (2026-10-05):
> **PR-1 — NON-COMPUTABLE VERDICT CRITERIA.** For F-2 and F-4 through F-11: If the statistic/criterion required to evaluate the criterion is non-computable, the criterion is treated as FAILED/FIRED rather than satisfied. For F-11 specifically: if the required F-11 quantity is non-computable, the study is halted/voided and Stage 2 does not proceed. Do not convert non-computable into zero, success, or an arbitrary fallback.
>
> **PR-3 — VALID-CELL SCOPE.** Outside §12's crossed bootstrap/test calculations, use every cell that is valid under the already-frozen validity rules. Do not extend §12's available-cell bootstrap row rule into other metrics unless the frozen metric definition explicitly requires it. For F-2, preserve its frozen definition as pooled over all valid Stage-2 A1 runs. Do not silently drop additional configurations.

---

## D-023 — D-021 §1 amended: no implementation or execution by Gemini (governance only)

**Date:** 2026-10-05 · **Authority:** Research Director ruling "PR-1 / PR-2 / PR-3" (2026-10-05: under the permanent role separation, D-021(b)/(c) require formal amendment) and the "Consolidated H1-R ruling freeze" (2026-10-05, approving this amendment) · **Status:** in force
**Scope:** process only.
- No hypothesis, metric, window, exclusion, arm, reward, topology, RNG, estimand, or verdict rule changes.
- H1-R v1.0 is unchanged (SHA-256 `c52e73378ad7759fe4e2829e972d1a97b5297da49b327b3c700c654a218ca836`). It does not mention D-021 or Gemini.
- D-020, D-022 and the D-021(b) package (`research/preregistrations/h1r_d021b/`, commits `fb6afec` and `7eca015`) are unchanged.

### 1. Decision
D-021 §1 is amended. The text now in force:
- **Lead-in.** D-021 §1's lead-in now reads: Gemini performs checkpoint (a); checkpoints (b) and (c) are performed as amended here.
- **(a)** Unchanged; completed (the H1R-P1(a) red-team, D-022).
- **(b) Verification of `analyze.js` before Stage 1.** `analyze.js` is the sole implementation of §12–§14. Before its SHA-256 is recorded (v1.0 §1.2), it is verified using the pre-registered D-021(b) fixtures, independent-oracle unit checks, determinism reruns, mutation tests, and output schema validation (`h1r.d021b.output/1`).
- **(c) Lodging.** The recorded `analyze.js` computes F-11 and the final verdict once from frozen run records; output and SHA-256 are lodged before reporting.
- Gemini performs no implementation and no execution. Gemini remains responsible for independent scientific falsification/review.
- D-021 §2 is unchanged. It applies to any defect found under (b) or (c).
- The D-021(b) package's fixtures and output schema remain in force for (b). Its instructions to implement, relay, lodge and compare (`GEMINI_INSTRUCTIONS.md` "Your task", §6 and §11; `README.md` "Lodging protocol", steps 2–7) are not in force. No package file is changed.

### 2. Consequence, recorded
The two-implementation agreement check is withdrawn. A second implementation could catch a divergent reading of the text; the battery's oracles cannot, because they encode the same reading. That risk is now carried by explicit Director rulings on the identified ambiguities (D-024; PR-4 is still open).

### 3. Superseded wording (kept for traceability; no longer in force)
> Gemini, the programme's independent adversarial reviewer (relayed by the user), performs three independent-falsification checkpoints:
> - **(b) An independent §12–§14 implementation before Stage 1.** Gemini implements the §12 test, Holm, the 99% CI, the §13 power procedure and the §14 verdict from the H1-R v1.0 text alone, without seeing `analyze.js`. Both implementations run on a pre-registered synthetic fixture set and must agree exactly on every decision and within 10⁻⁹ on every real-valued output.
> - **(c) Blind replication of the F-11 decision and of the final verdict.** Gemini computes each from the frozen run records independently, and both results are lodged before comparison.

---

## D-022 — H1R-S6 repair: D-019 §5 amended (N5′, N6a, N6b, N7 additions)

**Date:** 2026-10-05 · **Authority:** Research Director decision "S6 repair is now accepted" (2026-10-05), following the H1R-P1(a) red-team and its repair audit · **Status:** in force
**Scope:** measurement-validity repair only.
- No hypothesis, metric, window, exclusion, arm, reward, topology, RNG, or verdict rule changes.
- H1-R v1.0 is unchanged (SHA-256 `c52e73378ad7759fe4e2829e972d1a97b5297da49b327b3c700c654a218ca836`).
- D-020 and D-021 are unchanged, and no code is changed.

### 1. Finding
- The H1R-P1(a) red-team (Gemini) found that the frozen N6 check, clamp(recorded F) = returned value, cannot establish pre-clamp fidelity. The clamp is many-to-one: with F = 500, a recorded 9999 also clamps to 400.
- The repair audit found that the value reaching the sink can also be rewritten by how the sink is bound (a getter or Proxy) before any sink code runs.
- Gemini independently red-teamed the repair and returned SUFFICIENT.

### 2. Decision
D-019 §5 is amended. The text now in force is in D-019 §5.
- **N5** is replaced by **N5′ (pinned sink and binding)**.
- **N6** is replaced by **N6a (exact pre-clamp fidelity, `Object.is`)** and **N6b (clamp consistency, secondary)**.
- **N7** gains four cases: a transformed value only when |F| > 400; Proxy or accessor rewriting; arm-conditioned corruption; run-conditioned corruption.
- N1–N4, the template, G16′, the G16.4a2–a6 classification and D-019 §1–§4 and §6 are unchanged.

### 3. Superseded wording (kept for traceability; no longer in force)
> - **N5 Total sink.** `score()` only appends two numbers. It never throws, never mutates anything and never calls agent code (checked statically).
> - **N6 Fidelity.** For every recorded call, clamp(recorded F) equals the value the call returned, and the recorded term equals 12·(T − 0.5), where T is the E3-delivered value captured independently at `__M7_ARMS__`.

---

## D-021 — H1R-P1: independent-falsification checkpoints (Gemini)

**Date:** 2026-10-04 · **Authority:** Director ruling "H1-R S6 / I1 / P1 FREEZE — DOCS ONLY" (2026-10-04), accepting the read-only H1R-S6 decision audit · **Status:** in force; §1 lead-in, §1(b) and §1(c) amended by D-023 (2026-10-05), whose §1 holds the text now in force
**Scope:** a process requirement for H1-R. No hypothesis, metric, window, exclusion, arm, reward, topology, RNG, or verdict rule changes.

### 1. Decision
Gemini, the programme's independent adversarial reviewer (relayed by the user), performs three independent-falsification checkpoints:
- **(a) Red-team of H1R-S6 before the measurement commit.** Gemini receives the H1R-S6 template, the G16′ definition and the N1–N7 outputs (D-019). It attempts to construct a probe that changes behaviour yet passes the gates. Any successful counterexample strengthens the gates before the measurement commit.
- **(b) An independent §12–§14 implementation before Stage 1.** Gemini implements the §12 test, Holm, the 99% CI, the §13 power procedure and the §14 verdict from the H1-R v1.0 text alone, without seeing `analyze.js`. Both implementations run on a pre-registered synthetic fixture set and must agree exactly on every decision and within 10⁻⁹ on every real-valued output.
- **(c) Blind replication of the F-11 decision and of the final verdict.** Gemini computes each from the frozen run records independently, and both results are lodged before comparison.

### 2. Disagreement rule
Any disagreement halts the study until the cause is found and corrected, and is reported. It is never settled by choosing one result.

---

## D-020 — H1R-I1: implementation pins for H1-R v1.0

**Date:** 2026-10-04 · **Authority:** Director ruling "H1-R S6 / I1 / P1 FREEZE — DOCS ONLY" (2026-10-04) · **Status:** in force
**Scope:** implementation interpretations of [H1-R v1.0](preregistrations/H1R_PREREGISTRATION_v1.0.md), fixed before any Stage-1 data.
- No hypothesis, metric, window, exclusion, arm, reward, topology, RNG, or verdict rule changes.
- The v1.0 bytes are unchanged (SHA-256 `c52e73378ad7759fe4e2829e972d1a97b5297da49b327b3c700c654a218ca836`).

Line numbers refer to the tree conformed by transform `cf30e20a71d59a67ba6163c55b94399d5d74f3b4609c6e3ea37e27080d5bfd5a`. The pins bind to the quoted code, not to the line numbers.

### 1. Pins
1. **argmax₁** = `bestChoice`: the first element of `choices.sort((a, b) => b.weight - a.weight)` (`const sorted = …` at main.js:2362; `const bestChoice = sorted[0];` at main.js:2367), at step 0, over the candidate-loop entries only. Graph-neighbour candidates appended afterwards are not part of it. **argmax₀** = the earliest-inserted candidate with the maximal shadow weight (the same stable sort applied to the shadow weights, in the same insertion order).
2. **Trust snapshot.**
   - Taken at the first statement of `runAgentLoop` (main.js:5069), at the entry where the measurement counter shows **1,505 completed `runAgent()` calls** (call indices 0–1504: the 5 calls before tick 0, plus τ 0–1499).
   - At that point `env.setTick(1500)` has already run (it does not touch the trust store) and none of loop 300's pre-work has run (that pre-work includes `decayTrust`).
   - The final snapshot is taken immediately after `runOnce` returns, with 3,005 calls completed.
3. **`measurementClean`** is true iff every measurement record is clean:
   - reward record: multi, orphan and non-finite counts all 0;
   - per-tick records: exactly `calls` entries, flags mutually exclusive;
   - per-attempt records: count equal to `envDraws`, all values finite;
   - reset events: equal to the runtime counters;
   - score/shadow records: one per step-0 candidate, all finite, with recomputed argmax₁ equal to `bestChoice`;
   - both trust snapshots present and finite;
   - floor counter finite and ≥ 0;
   - fork switch, if armed, applied exactly once at its call.

   The flag's scope is the v1.0 §9 measurement layer. This is not a new exclusion.
4. **Box–Muller** (v1.0 §13 power procedure):
   - **pairing:** one deviate per pair, z = √(−2 ln u₁)·cos(2πu₂), consuming u₁ then u₂; the sine partner is discarded;
   - **u₁ = 0:** u₁ is redrawn until it is non-zero, then u₂ is drawn;
   - **reset:** `makeRng(770001)` is re-initialised at the start of each (window, S). Iterations then draw a₁…a₃₀, b₁…b_S, and e row-major (c outer, s inner);
   - **loop order:** W1 then W3, S ascending.
5. **Fisher–Yates**, the B2 convention (`env.js` `shuffledIndices`, `arms.js` `makeSigma`): for i = n−1 down to 1, j = ⌊u·(i+1)⌋, swap a[i] and a[j].
6. **Permutation null** (descriptive):
   - K_τ is ordered by (from, to), ascending numerically;
   - the p-value is two-sided, (1 + #{|ρ*| ≥ |ρ|}) / 10,001.

---

## D-019 — H1R-S6: G16.4a evaluated on the probe-stripped `render/scoring.js` (H1-R conformed tree only)

**Date:** 2026-10-04 · **Authority:** Director ruling "H1-R S6 / I1 / P1 FREEZE — DOCS ONLY" (2026-10-04), accepting the modified H1R-S6 from the read-only decision audit · **Status:** in force; §5 amended by D-022 (2026-10-05)
**Scope:** H1-R only, on the H1-R-materialised tree.
- No hypothesis, metric, window, exclusion, arm, reward, topology, RNG, or verdict rule changes.
- The v1.0 bytes are unchanged.
- The repository's `render/scoring.js` and `verify_G16.js` are not modified, and this decision implements no probe.

### 1. Why
- H1-R v1.0 §9 item 5 requires an observational pre-clamp probe in `render/scoring.js`.
- Frozen G16 is blocking (v1.0 §11). In `verify_G16.js`, G16.4a2 requires the live file to have the same line count as the reference arm `experiments/phase1_0/baseline/scoring_prerect.js`. G16.4a3 requires exactly one differing line, the rectification.
- Any additional line fails G16.4a2 and G16.4a3, and `verify_G16.js` (lines 278–280) then reports G16.4a4–a6 as false.

### 2. The single permitted line
Exactly one line in the H1-R-materialised `render/scoring.js`, tagged `// H1R M-SCORE`, placed immediately before the line `    return Math.max(-400, Math.min(400, finalWeight));`. It reads exactly, with four-space indentation and no trailing whitespace:

```
    if (globalThis.__H1R_MEASURE__) globalThis.__H1R_MEASURE__.score(finalWeight, trustBonus * 1.5); // H1R M-SCORE
```

### 3. G16′ (the H1-R stripped-file conformance gate; blocking)
G16′ passes iff all five hold:
1. The conformed `render/scoring.js` contains exactly one line containing `// H1R M-SCORE`.
2. That line equals the template above, byte for byte.
3. It immediately precedes the line `    return Math.max(-400, Math.min(400, finalWeight));`.
4. With that one line removed, the file is byte-identical to B2's `render/scoring.js`, SHA-256 `4a13316698b52a2132d969c838d79f9d3ccc97a853bc5e3fa947fd43fac566d5`.
5. G16.4a1–a6, evaluated on the stripped text against `experiments/phase1_0/baseline/scoring_prerect.js`, all pass.

### 4. Classification of the historical gate
- In the historical `verify_G16.js` run on the H1-R conformed tree, **G16.4a2–a6 are classified failures under H1R-S6.**
- **All other G16 assertions remain binding.**
- OFF ≡ pristine for the existing gate scripts is assessed with G16.4a2–a6 excepted, and G16′ is required instead.
- On the pristine B2 tree, `verify_G16.js` is unaffected.

### 5. N1–N7 (blocking measurement-neutrality requirements; N5, N6 and N7 as amended by D-022)
- **N1 Text.** Exactly one line in `render/scoring.js` carries the tag `// H1R M-SCORE`. It sits immediately before `return Math.max(-400, Math.min(400, finalWeight));` and equals the pinned template character for character. With that line removed, the file is byte-identical to B2's.
- **N2 Form.** The template reads two locals and calls one sink. It assigns nothing; references no RNG, `Date.now`, I/O, `import` or `export`; and keeps the S4 and G9 checks clean.
- **N3 Inert when absent.** G1′ shows 21/21 runs with the same fingerprint and draw counts. All 25 existing gate scripts give OFF ≡ pristine, except G16.4a2–a6, which are classified under H1R-S6 and replaced by G16′.
- **N4 Neutral when present:**
  - (a) Unit: at least 10,000 random input sets, with identical RNG state, give the same return value, the same `lastArbitrationBreakdown` and the same RNG position afterwards, with and without the sink.
  - (b) Run: fingerprints and cognitive, visual and environment draw counts are identical with and without the measurement layer, across all 7 arms and at least 3 configurations.
- **N5′ Pinned sink and binding.**
  - `globalThis.__H1R_MEASURE__` is an own data property of `globalThis`, non-writable and non-configurable.
  - Its value is a frozen ordinary object for which `util.types.isProxy` is false.
  - Its `score` is an own, non-writable data property whose value is the pinned function, byte-exact `score(f, t) { S.push(f, t); }`, where `S` is an array private to the measurement module and read only by its record function.
  - The module imports only Node built-ins and reads no global.
  - Checked statically (byte-exact source) and at installation (descriptors, `isProxy`, function identity).
- **N6a Exact pre-clamp fidelity.**
  - For every probe execution, the recorded pair is `Object.is`-equal to the values of `finalWeight` and `trustBonus * 1.5` at the probe line. This follows for every call from N1 and N5′.
  - It is verified end to end by a unit oracle: a test-only copy of B2's `render/scoring.js` in which only the return line is replaced by `    return finalWeight;`, hash-recorded and never loaded in runs.
  - On at least 10,000 random input sets, including inputs with |F| > 400 at both bounds, it must give values `Object.is`-equal to the recorded F.
- **N6b Consistency (secondary).** For every recorded call, `Object.is(clamp(recorded F), the value the call returned)`. The recorded term equals 12·(T − 0.5), with T captured independently at `__M7_ARMS__`.
- **N7 Anti-vacuity.** The gates must catch:
  - a probe placed after the clamp (by a unit input that forces |F| > 400);
  - a probe that assigns (N2);
  - a probe that draws a random number (N4);
  - a second tagged line (N1);
  - a sink that records a transformed value only when |F| > 400 (by the N6a oracle);
  - a Proxy or accessor binding that rewrites arguments (by N5′);
  - a sink conditioned on the arm (by N5′'s source pin);
  - a sink conditioned on run identity (by N5′'s source pin).

### 6. Scientific statement
No hypothesis, metric, window, exclusion, arm, reward, topology, RNG, or verdict rule changes. The frozen pre-clamp shadow metric of v1.0 §8 is unchanged. H1R-S6 only permits the one line that lets that metric be observed, and re-scopes G16.4a's textual check to the probe-stripped file.

---

## D-018 — H1-R pre-registration v1.0 frozen

**Date:** 2026-10-04 · **Authority:** Director ruling "FINAL FREEZE AUTHORIZATION — H1-R" (2026-10-04) · **Status:** in force
**Scope:** freezes the H1-R scientific protocol.
- It authorises no run, generates and inspects no seed, configuration or outcome, and changes no code.
- The frozen M7 pre-registration (SHA-256 `2f12e309…f6b9`) and its errata are not modified. H1-R supersessions apply to H1-R only.

### 1. Decision
[`preregistrations/H1R_PREREGISTRATION_v1.0.md`](preregistrations/H1R_PREREGISTRATION_v1.0.md) is frozen, SHA-256 `c52e73378ad7759fe4e2829e972d1a97b5297da49b327b3c700c654a218ca836` ([integrity record](preregistrations/H1R_PREREGISTRATION_v1.0.sha256)). It is bound to instrument commit `e8e904a` on B2 `707cb1e`.

It resolves pre-registration decisions D-2 … D-11:
- **Pilot material:** a stream from 886000 (bound 889999) × seeds 20260819004–008. The single F-11 extension reuses the seeds.
- **Crossed configuration × seed analysis:** min F′ with ν = min(C−1, S−1), Holm across the six primary tests, the matching 99% CI, a row-removal rule and deterministic undefined-statistic rules.
- **Metric definitions** and the tick index τ = i − 5.
- **Measurement-layer requirements.**
- **Validity failures** handled as crashes.
- **The blocking gate battery.**
- **A5** retained.
- **The exploratory PE factorial** waived.
- **Governance records.**
- **A mechanical H1 / H1-STRICT / NOT SUPPORTED verdict function.**

### 2. Consequences
- The obsolete "≈ 1 × 10⁻⁶ per run" configuration-generator figure is withdrawn. `R3_REPORT.md` is corrected, and v1.0 Appendix B.1 gives the exact enumerations and the model-based probabilities, each with its sample space.
- The three M7 governing documents (`M7_SCIENTIFIC_SPEC_DRAFT.md`, `M7_GATE_SEMANTICS_AUDIT.md`, `M7_CHARACTERIZATION_FINDINGS.md`) are committed byte-exact (`-text`) at the SHA-256 values listed in v1.0 §17.
- Next: the measurement-layer milestone (v1.0 §9), verified on diagnostic material with blinded reporting, and only then Stage 1.

---

## D-017 — H1-R R3: configuration-scoped environment stream

**Date:** 2026-10-04 · **Authority:** Director ruling "R3 IMPLEMENTATION — CONFIGURATION-SCOPED ENVIRONMENT RANDOMIZATION" · **Status:** in force
**Scope:** H1-R runtime only. With the H1-R runtime absent, behaviour is identical to B2.

**Decision.** For H1-R runs that carry a design position, the environment stream seed is (0x60800000 + slot·4096·0x6d2b79f5) mod 2³². This removes the shared environment sequence across a seed's configurations (D-3B) while keeping one stream per (configuration, seed) for all arms.
- Erratum: [`preregistrations/H1R_ERRATUM_R3_ENVIRONMENT_SEED.md`](preregistrations/H1R_ERRATUM_R3_ENVIRONMENT_SEED.md), which supersedes the M7 §5.1 environment-stream row for H1-R.
- Implemented and verified in commit `e8e904a` (`experiments/h1r/evidence_r3/`).

---

## D-016 — H1-R R2: goal-entry reliability draw (D-1) and reward measurement (D-5, part 1)

**Date:** 2026-10-04 · **Authority:** Director ruling "Implement only R2: D-1 Goal-Entry Reliability Draw + D-5 Measurement Integrity" · **Status:** in force
**Scope:** H1-R runtime and driver only.

**Decision.**
- Goal-entering attempts draw from the environment stream and are credited like every other edge (M7 §3.3, §6.1).
- Observational probes record the per-tick `rewardSignal`. `run_h1r.mjs` is the one-run-per-process driver.
- Commit `19d0786` (`experiments/h1r/evidence_d1d5/R2_REPORT.md`).

---

## D-015 — H1-R R1: realised-outcome learning order

**Date:** 2026-10-04 · **Authority:** Director ruling "R1 AUTHORIZED" · **Status:** in force
**Scope:** H1-R runtime only.

**Decision.**
- The decision's single environment draw precedes the self-learning section, which then reads the realised transition. A slip is a no-learning tick.
- This supersedes two M7-ERR-05 §3.1 sentences for H1-R (H1R-S1).
- Commit `742f239` (`experiments/h1r/evidence_r1/R1_REPORT.md`).

---

## D-014 — H1-R conformance correction

**Date:** 2026-10-04 · **Authority:** Director ruling on the H1-R conformance correction · **Status:** in force, except the Q-KEY edits, which D-015 superseded
**Scope:** H1-R runtime only.

**Decision.**
- The `0f47d7b` `canReachGoal` backtracking fix is applied, guarded (CRG).
- N2 is clarified as traversal-only trust success (M7 §6.1).
- The Q-KEY stash/apply edits were later removed by R1.
- Record: `experiments/h1r/evidence_r2/CORRECTION_REPORT.md`.

---

## D-013 — H1-R conformance authorisation

**Date:** 2026-10-04 · **Authority:** Director ruling following the 2026-10-04 B2 characterisation · **Status:** in force
**Scope:** H1-R only. No production file is modified.

**Decision.**
- H1-R tests the M7 design **as frozen**, on the B2 build (`707cb1e`) made to conform to it by a guarded source transform under `experiments/h1r/`.
- The conformance edits are: edge-only movement (N1), traversal-only trust credit (N2), RANDOM and FROZEN wiring (A3, A4), the flat goal reward with G15 → G15′ (GOAL), and clearing reasoning at reset (P4).
- Record: `experiments/h1r/evidence_final/`. Committed with R1 in `742f239`.

---

## D-012 — ecosystem architecture: Handbook v1.1 governs repository responsibilities and promotion routing

**Date:** 2026-09-28 · **Authority:** Director ruling of 2026-09-28 (I1 — four-repository architecture
alignment) · **Status:** in force
**Scope:** **GOVERNANCE ONLY.** This decision authorises no experiment, creates no observable, specifies
no protocol, generates or inspects no seed, and modifies no frozen artifact. Every pre-registration,
gate, result, erratum and decision D-001 … D-011 is unchanged and unreopened.

### 1. Decision

**MiniFlyWire adopts the ecosystem constitution — *The Engineering Constitution and Architecture
Handbook* v1.1 (SHA-256 `ad670d24eaab6acb2cca301223dfb58d9216b6ee89e87fd569638af3a00eafd0`) — as the
authority for repository responsibilities and promotion routing.**

The four platform-architecture documents in `research/spec/` (`REPOSITORY_RESPONSIBILITY_MATRIX.md`,
`PROMOTION_WORKFLOW.md`, `TRACEABILITY_spec_to_noetica_AND_boundary.md`,
`TRACEABILITY_spec_to_velith.md`, frozen in `0a19b37`) are **HISTORICAL**. Their responsibility and
routing content is superseded, clause by clause, by the separate erratum
[`spec/PLATFORM_ARCHITECTURE_ERRATUM_01.md`](spec/PLATFORM_ARCHITECTURE_ERRATUM_01.md) (SPEC-ERR-01).
Their bytes are not modified.

### 2. Consequences

- The ecosystem is MiniFlyWire → Noetica → Velith → Mini Prometheus. MiniFlyWire is the research
  laboratory: it discovers, validates (G0, G1) and specifies mechanisms. It imports no repository and is
  imported by none (Handbook Law 4).
- A validated cognitive primitive is promoted into **Noetica** only, by the Handbook §11.3 process
  (certification against the §5.5 gate, Primitive Registry entry, re-implementation by Noetica, decision
  record). It never moves as code.
- **No mechanism is currently routable:** none has passed G1.
- The Computational Specification and `CANDIDATE_ADMISSION_SPEC.md` are unchanged.

---

## D-011 — discriminator completeness, required prospectively of every frozen hypothesis

**Date:** 2026-09-09 · **Authority:** Director ruling of 2026-09-09, following the terminal UQ-A
interpretation gate · **Status:** in force
**Scope:** **PROSPECTIVE ONLY.** This is a governance decision about how future pre-registrations are
written. It authorises no experiment, creates no observable, specifies no protocol, generates or
inspects no seed, and modifies no frozen artifact. M7 at `707cb1e`, M8 at `f9d97b9`, M9 at
`04dda03`/`9044c3b`, Q1 at `d16d568`/`057ceb0`/`21c7238`, U1 at `a0d99f4`/`e4a1d09`, UQ-A at
`63247bb`/`5d04469`/`31aef86` — all unchanged and all unreopened.

### 1. Decision

**Before a pre-registration is frozen, every hypothesis it states must carry a DISCRIMINATOR — the
thing that would decide it. A hypothesis whose discriminator is absent is not ready to be frozen.**

The remedy for an incomplete hypothesis is to complete it or to decline to state it. It is never to
supply the missing piece after the data exist.

### 2. The seven required elements

| | Element | Satisfied when |
|---|---|---|
| **1** | **Discriminator** | the hypothesis names what would tell it apart from its alternatives |
| **2** | **Observables** | the exact quantities that discriminator consumes are named and are already measurable, or are specified to be created |
| **3** | **Comparison or decision rule** | the exact operation on those observables, and the exact criterion applied to the result |
| **4** | **Refutation criteria** | what observation would refute the hypothesis, stated so that it *could* occur |
| **5** | **Identifiability audit** | a demonstration, from committed source, that the discriminator is computable from the data the study will actually register |
| **6** | **Stopping / minimum-evidence rule** | where applicable, pre-declared, with the disposition when it is unmet |
| **7** | **Post-hoc prohibition** | an explicit statement that the discriminator may not be added, altered or relaxed after any result is observed |

**Element 4 is not satisfied by a condition that cannot occur, nor by one that occurs by
construction.** Both are vacuity, and both are independent of sample size.

### 3. Why — three completed studies, three distinct failure modes

| Study | Failure mode | Missing element | Where it was caught |
|---|---|---|---|
| **U1** | **Unidentifiable observable** — every candidate at the executed-behaviour layer is evaluated on the same object whose staleness constitutes the exposure | **2**, and therefore **5** | at formulation, before any data — D-010 |
| **Q1** | **Insufficient material** — 17 accepted configurations against a pre-declared minimum of 20 | **none.** Element 6 was present and it worked | at collection close — the study reported `INCONCLUSIVE — INSUFFICIENT MATERIAL` rather than extending the range |
| **UQ-A** | **Undecidable** — evidence complete, sound, deterministic and sufficient; no frozen rule to decide the directional hypotheses | **3**, and therefore **4** for H1/H3 | at the interpretation gate, after collection |

**Q1 is in this table as the case where the rule already held.** Its stopping rule was pre-declared,
the yield fell short, and the study closed cleanly on its own pre-declared disposition instead of
drifting. Element 6 is required because Q1 demonstrates what it buys, not because Q1 lacked it.

**UQ-A is the case that motivates elements 3 and 4.** Its §4 states plainly, on one line and in the
frozen text's own words:

> **No threshold is pre-registered for "materially indistinguishable"** — see §11.

Its §11 in turn forbids the cross-configuration aggregate that a directional comparison would
require. H1 (*improves*) and H3 (*degrades*) were
therefore undecidable **before any datum existed** — visible in the frozen text itself. H0 and H2
were decidable and were decided, because §14b gave them a threshold-free discriminator. The
difference between the two pairs of hypotheses inside one frozen document is the clearest available
statement of what this rule is for.

**This is a promotion of an existing case ruling, not a new invention.** D-007 §4 already found that
Q1 §9.5 *"admits no non-vacuous decision rule"* and retired it, recording: **"Increasing the sample
cannot repair a missing decision rule."** D-011 raises that finding from one claim inside one study
to a standing requirement on every future pre-registration.

### 4. The rule is already practised — two exemplars to copy

- **M8 §11**, the H5 composite decision rule: two named denominators and an explicit accept
  criterion, frozen as a pre-data design choice.
- **UQ-A §14b**, the liveness criterion: **threshold-free** — *LIVE iff the argmax flip rate is
  strictly greater than zero* — discrete, requiring no threshold, and mechanistically exact because
  only the winning candidate is executed.

**§14b is the preferred shape.** Where a discriminator can be made discrete and threshold-free, it
should be. A discriminator is not required to be a statistical test and usually should not be one.

### 5. What D-011 does NOT require

Stated explicitly, because a rule that grows is a rule that stops being used.

- **No statistical test, p-value, confidence interval or effect size.** D-011 weakens no existing
  prohibition on any of them; a frozen threshold-free criterion satisfies element 3 completely.
- **No new document, artifact class or file.** The seven elements live inside the pre-registration
  that already exists.
- **No separate identifiability report.** A section suffices. U1's identifiability finding was a
  short set of source facts, and it was decisive.
- **No new review step, approval stage or sign-off loop.**
- **No requirement that every hypothesis be decidable.** A question may be recorded as explicitly
  undecidable on the current substrate — that is exactly what D-010 did for U1. What D-011 forbids
  is discovering the undecidability *after* collecting the evidence.
- **No renumbering, reformatting or migration of any existing document.**

### 6. Retroactivity — none

**D-011 has no retroactive effect.** It may not be cited to reinterpret, reopen, retire, extend,
re-collect or add any analysis to U1, Q1, UQ-A or any predecessor study, nor to justify a post-hoc
aggregate for UQ-A.

Stated plainly so it cannot be mistaken later: **UQ-A could not have been frozen in its present form
under D-011.** That is what a prospective rule means. It is not a criticism of UQ-A, whose collection
executed its own frozen protocol completely — the entire registered range, 96 paired configurations,
accounting closed, deterministic across two independent executions, verified on a clean checkout.
UQ-A's conclusions stand exactly as ruled.

### 7. Compatibility with the research constitution

| Constitutional source | Check |
|---|---|
| `00_project_definition.md` §2 — *every mechanism must be supported by a clearly defined hypothesis, measurable evaluation criteria, reproducible experiments, and explicit comparisons* | **Consistent, and operational.** D-011 makes "measurable evaluation criteria" checkable at freeze time instead of at interpretation time. |
| `00_research_axioms.md` — evaluation framework item 7, *Falsifiability* | **Consistent.** Element 4 is falsifiability stated per hypothesis rather than per axiom. |
| `01_core_question.md` — the single guiding question | **No competition.** D-011 states no question and ranks no candidate. |
| Anti-vacuity discipline (M7-ERR-10) — *controls must bind the measurement input* | **Consistent, same principle one level up.** A control must be able to fail; so must a hypothesis. |
| The no-tuning rule — *never tune parameters or thresholds* | **Consistent.** Freezing a criterion before data is the opposite of tuning; element 7 forbids the tuning case explicitly. |
| Descriptive-only statistics policy (M9 §, Q1 §10, UQ-A §11) | **Consistent.** §5 above forbids reading D-011 as a mandate for inferential machinery. |
| One-ruling-per-entry, append-only ledger | **Consistent.** This entry rules on one thing and supersedes nothing. |

**No contradiction found.** D-011 adds a completeness check at a point in the workflow that
previously had none, and removes nothing.

### 8. What is NOT authorised

This decision authorises **nothing** beyond how future pre-registrations are written. In particular
it does **not** authorise: UQ-B; any further uncertainty experiment; any new experiment, mechanism,
observable, instrument, probe or capture site; any implementation; any seed generation or
inspection; any additional sampling of any completed study; or any re-analysis.

No protocol, seed range, tick budget, arm, sample size, instrumentation or analysis is specified
anywhere in this decision, and none may be inferred from it.

### 9. Governance consequence

D-001 through D-010 are preserved byte-for-byte; this entry is append-only and supersedes nothing.
No frozen artifact, raw evidence file or result artifact is modified, and every digest revalidates.
No M7, M8, M9, Q1, U1 or UQ-A result is reinterpreted, and none is authorised to bear on the G15
outcome.

The next milestone, whatever it is, requires its own authorisation.

---

## D-010 — U1 closed as unidentifiable on the current observational substrate

**Date:** 2026-09-03 · **Authority:** Director ruling of 2026-09-03, following the internal
pre-registration-level identifiability audit of `U1_FORMULATION_DRAFT.md` · **Status:** in force
**Scope:** the U1 question only. This is a governance decision. No implementation exists, no
observable was created, no seed was generated or inspected, no data was collected or examined, and
no frozen artifact was modified. M7 frozen at `707cb1e`, M8 evidence at `f9d97b9`, M9 at
`04dda03`/`9044c3b`, Q1 at `d16d568`/`057ceb0`/`21c7238`, U1 formulation draft at `a0d99f4` — all
unchanged.

### 1. Decision

**U1 — *"Does decision/position desynchronization have any measurable consequence for executed
behaviour?"* — is scientifically important and is CURRENTLY UNIDENTIFIABLE with the available
observational substrate. U1 is closed on that substrate.**

U1 was identified by the M7→Q1 synthesis as the strongest remaining unknown, and an independent
review agreed it was the strongest next question and ready for formulation. The formulation
milestone then established, from committed source alone, that no operationalization available on
this architecture can identify it. **That is the correct outcome of a formulation gate, and it cost
no data.**

### 2. Source-grounded reasons — all five candidates rejected

| | Candidate | Reason for rejection |
|---|---|---|
| **A** | environmental realization (slip vs success) | **Structurally degenerate.** `env.attempt` returns `true` unconditionally when `pFor` finds no graph edge — no draw, no slip. `_m7From = agentLast` (`main.js:4885`), and `4837` sets `agentLast = agentCurrent` unconditionally before it. M9 recorded ADVANCE-classified DESYNC events as **100% `sPair`** (4,897 of 4,897), the pair being `(agentCurrent, agentCurrent)`, never a graph edge. On that entire class the outcome is `true` by construction and the environment is bypassed. |
| **B** | StepLedger trajectory support | **Requires an intervention, so it cannot serve an observational U1 design.** `main.js:3917` swaps the eligibility computation on the `__MFW_STEP_LEDGER__` guard, and eligibility gates `rewardSignal`. Arming it modifies the agent under study. The ledger's *fields* remain recordable neutrally; the *aggregate* does not. |
| **C** | intent → executed-action divergence | **Confounded, and not attributable to DESYNC.** `lastDecision` is assigned at `main.js:2397` with no step gate; `window.lastReasoning` is written at `2635` under `if (step === 0)`. Both sit inside `for (let step = 0; step < STEPS; step++)` (`1492`–`2722`). A divergence therefore measures how far the imagination chain wandered after step 0 — the artifact the `2626–2632` comment records the step-0 gate as existing to prevent. Two further divergence paths are independent of DESYNC: the anti-repeat swaps at `2594` and `2603` overwrite `nextKey`, while `lastDecision.best = exploreChoice \|\| bestChoice` takes no such override. |
| **D** | episode termination mode | **Contaminated, and the comparison arm is near-empty.** The goalReset arm is decided at `main.js:3922` by `next === goalNeuronId`, where `next = window.lastReasoning.to` read at `3819`; the exposure is `lastReasoning.from !== agentCurrent` at that same line. Exposure and outcome are two projections of **one object written in one instant** at `2635`. Separately, the cap arm is armed (`experiments/m7/run.js:189`, `M7_EPISODE_TICK_CAP = 150`) yet the whole-collection site census of the committed Q1 transition evidence is `advance 25984, goalReset 11653, pool 17, cap 5` — **five cap terminations against 11,653 goal terminations.** |
| **E** | reward branch at `main.js:3922` | **Inherits D's contamination and adds its own.** The outer test is the same `next === goalNeuronId`. The inner test uses `episodeUnique`, which unarmed reads `recentMemory` — written from realised positions — and is therefore itself partly a function of the exposure. |

**No cleaner existing downstream behavioural observable was identified.** The committed architecture
was searched; the result is a general fact rather than a list of near-misses. `next =
lastReasoning.to` **is** the executed action — that is what the write→read seam carries — and DESYNC
is defined as the staleness of the record carrying it. **Every observable at the executed-behaviour
layer is therefore evaluated on the same object whose staleness constitutes the exposure.** The five
rejections are one structural fact appearing five times, not five independent problems.

**No observable was invented to rescue U1.**

### 3. The failure is STRUCTURAL, not a sample-size failure

**More sampling cannot repair U1 on the current substrate**, and no quantity of additional Q1
evidence would change any rejection in §2. The rejections rest on source mechanics —
`env.attempt`/`pFor` returning early on a non-edge, the `__MFW_STEP_LEDGER__` eligibility swap, the
differing write gates on `lastDecision` and `lastReasoning`, and the shared `lastReasoning` object at
the exposure and the outcome. None of these is a property of a sample.

The single arithmetic point in §2 — the cap arm at *n* = 5 — is likewise not a sampling shortfall: it
is a property of the 150-tick cap against this agent's goal-reach rate, and no sampling decision
available under any protocol changes that ratio.

**This distinction is load-bearing.** D-006 §5 and D-007 §8 already forbid further Q1 sampling; §3
records that even if they did not, sampling would not be the remedy.

### 4. What U1 does NOT establish

**U1 does NOT establish that DESYNC has no behavioural consequence.**

It establishes only that **the current observational architecture cannot identify such a
consequence.** These are different statements and must never be conflated. Absence of an
identifiable measurement is not evidence of absence of an effect, and no downstream write-up may
present this closure as a null result about the phenomenon.

Q1 §7's prohibition on causal language, including the express ban on "proximate cause", carries
forward unchanged.

### 5. Closure without further evidence

**U1 is closed on the current observational substrate, and no additional Q1 evidence was collected
to reach that closure.** The determination was made entirely from committed source and previously
committed results. Q1 remains **INCONCLUSIVE — INSUFFICIENT MATERIAL** and is unaffected by this
decision.

### 6. What is NOT authorised

This decision authorises **nothing**. In particular it does **not** authorise:

- a new behavioural outcome;
- an intervention of any kind, including any design that manipulates DESYNC;
- a new observable, instrument, probe or capture site;
- additional Q1 sampling, extension, substitution or recollection;
- U1 implementation, prototyping, or inspection of data in preparation for it.

No protocol, seed range, tick budget, arm, sample size, instrumentation or analysis is specified
anywhere in this decision, and none may be inferred from it.

### 7. Future candidate research direction — recorded only, NOT authorised

**Observability-design question** — quoted here on one unbroken line so any future charter can
reproduce it verbatim:

> Is there a behavioural observable downstream of the write→read seam that is independent of `lastReasoning` and can be measured without intervention?

**This is ONLY a candidate question.** It is **not authorised**, not chartered, and not scheduled.
No protocol, seed range, instrumentation or implementation is specified for it, and none may be
begun without a separate numbered Director decision. It is recorded here so that the structural
obstacle in §2 is not rediscovered from scratch, and for no other purpose.

### 8. U3 is not selected

**U3** — whether the configuration-acceptance yield is a stable property of the acceptance predicate
— **remains an unauthorised methodological candidate.** This decision does not select it, does not
rank it above any other candidate, and confers no priority on it. Every other candidate recorded in
the M7→Q1 synthesis likewise remains unauthorised.

### 9. Governance consequence

D-001 through D-009 are preserved byte-for-byte; this entry is append-only and supersedes nothing.
No frozen artifact, raw evidence file or result artifact is modified, and every digest revalidates.
No M7, M8, M9 or Q1 result is reinterpreted, and none is authorised to bear on the G15 outcome.

The next milestone, whatever it is, requires its own authorisation.

---

## D-009 — adjudication of two ambiguities in the frozen Q1 protocol

**Date:** 2026-09-01 · **Authority:** Director ruling of 2026-09-01, following the pre-flight
ambiguity report and an independent scientific governance review by Gemini · **Status:** in force
**Scope:** the semantics of "transition" and of E4's "equals", for the purpose of evaluating the
five authorised Q1 existence claims. This is a **clarification of the frozen protocol, not an
amendment**, and a governance decision only. No analysis code exists, no claim was evaluated, no
gap was classified, no proportion, distribution or gap count was computed, and no seed was
generated or evaluated. Q1 pre-registration frozen at `0ad12fe`, D-006 at `612c69c`,
instrumentation at `50be4b4`, collection at `d16d568`, D-007 at `db9305e`, D-008 at `b5be26e` —
all unchanged.

### 1. Ruling 1 — what counts as a transition

**For the purpose of evaluating the five authorised Q1 claims, a "transition" is a record in
`transitions.jsonl` satisfying `fromPos !== toPos`.**

Records where `fromPos === toPos` are **self-loop assignments** and are **NOT counted as
transitions** for the five claims.

**Frozen-text basis.** Two independent provisions of the frozen pre-registration state the
qualifier, and neither is explanatory:

> **Q1 §6:** "One append-only record per executed **position-changing** transition inside the §3
> window."
>
> **Q1 §15.6:** "a slip produces no transition and therefore no record. **Q1 measures realised
> position changes only.**"

**The protocol definition takes precedence over the instrument's over-inclusive recording
behaviour.** The committed instrumentation records every *executed* assignment at the four §4
sites, which is a superset of what §6 describes. The pre-registration was frozen at `0ad12fe`
**before** the instrumentation existed at `50be4b4`; where the two conflict, the frozen protocol
governs. The presence of `fromPos` on every record is what makes the correct reading computable —
Q1 §6 introduced that field expressly for auditability, and this is the audit it enables.

**Handling of excluded records — mandatory.**

- **Do not delete them.** **Do not alter them.** **Do not hide them.**
- They remain part of the frozen raw evidence, unchanged and digest-pinned.
- The analysis and reporting milestone **must count and report them separately**, as a matter of
  transparency. They are an explicit, disclosed exclusion, never a silent filter — the M8 §F
  discipline for exclusions, carried forward.
- **This ruling interprets the protocol; it does not modify the evidence.**

**A structural consequence, recorded so it is not mistaken for a result.** DESYNC means the
position at the read differs from the position at the write. Since position changes only through
the four §4 sites, and the collection gate established the position chain is continuous with zero
breaks, **every DESYNC gap necessarily contains at least one record with `fromPos !== toPos`**. The
narrowed definition therefore cannot empty a gap. This is a deduction from the definitions, not a
computed quantity.

### 2. Ruling 2 — E4 equality semantics

**E4's "equals" means identity of the transition RECORDS.**

```
FIRST_DIVERGING_TRANSITION == LAST_TRANSITION_BEFORE_EVALUATION
```

is true iff the first and last transition in the gap are **literally the same transition record**.

**Consequence: E4 is logically equivalent to E2.** First and last differ iff the gap holds more
than one transition, which is exactly E2's refutation condition.

**Basis.** Q1 §7 defines both names as **transitions** — *"the earliest transition in the gap"* and
*"the final transition in the gap"* — not as sites or types. Its rationale speaks of *"different
transitions answering different questions"*. There is no textual basis for reading "equals" as a
comparison of the `site` property.

**"Equals" must NOT be reinterpreted as site or type equality.** A reviewer cannot repair a
protocol's wording from inferred intent; the redundancy is a finding about the protocol, not an
error to be corrected post hoc by inventing a new meaning.

**Both claims are evaluated as frozen**, and **the eventual report MUST explicitly state that E4 is
redundant with — logically equivalent to — E2 under the frozen semantics.**

### 3. Ruling 3 — `FIRST_DIVERGING_TRANSITION` wording

The **operative** definition is:

> "the earliest transition in the gap"

The trailing clause *"where `from !== agentCurrent` first became true"* is **explanatory, not an
alternative operative selection rule**. It must not be implemented as a dynamic state-crossing
test, which would select a different record whenever the position oscillates back through the
write-time position mid-gap. The operative reading is the more conservative one and removes that
ambiguity.

### 4. Data validity — no recollection

**The existing Q1 dataset remains valid.** No recollection is required, and none is authorised.
`fromPos` and `toPos` were recorded on every transition record, so the correct interpretation is
computable from the frozen evidence exactly as collected. The dataset is not defective; only its
interpretation was ambiguous.

### 5. Q1 disposition — unchanged

**Q1 remains INCONCLUSIVE — INSUFFICIENT MATERIAL.**

D-009 **does not reopen or alter the D-006 minimum-evidence rule.** The minimum-evidence failure
stands exactly as recorded:

| Condition | Required | Observed |
|---|---:|---:|
| accepted configurations | 20 | **17** |
| configurations in `degree5` | 15 | **9** |
| configurations in `degree3` | 15 | **8** |

**These thresholds are not reinterpreted**, and nothing in this decision makes 17 configurations
sufficient for distributional characterisation. **Any future claim verdict must carry the
INCONCLUSIVE disposition**, together with every D-007 §6 non-refutation safeguard.

### 6. Governance status — clarification, not amendment

**D-009 is a CLARIFICATION.** The reasons, recorded so a future reader can test the
characterisation rather than accept it:

1. Q1 was **frozen before** the instrumentation existed.
2. The frozen text **explicitly** says "position-changing" and "realised position changes only".
3. The instrument recorded a **superset** of what the protocol describes.
4. The **required fields already exist** in the frozen data.
5. Applying `fromPos !== toPos` therefore **applies the existing protocol** rather than changing it.

The same characterisation holds for Ruling 2: it applies a plain-text reading of the frozen
definitions and accepts the logical consequence, rather than amending the meaning of "equals" to
create a new, unspecified claim.

### 7. Post-hoc disclosure

**Stated without mitigation.** D-009 is issued **after collection** (`d16d568`) but **before claim
analysis** — no analysis code exists and no claim has been evaluated.

- The choice is based on **frozen wording** (§6, §15.6, §7), not on observed claim outcomes.
- **No claim outcome was known** when this ruling was made, and none was computed to inform it.
- **No new sampling is authorised.** D-006 §5.6 and D-007 §8 stand.
- **No protocol repair is introduced.** Q1 §9.5 remains retired under D-007 §4.

The D-007 §7 disclosure carries forward unchanged: the decision to act on the pre-existing
analytical partition was taken after the INCONCLUSIVE disposition was known, the resulting analysis
has weaker evidential status than a fully a-priori analysis, and it must never be described as
fully a-priori.

### 8. Self-loop records — the structural fact

Established by the read-only pre-flight audit and **reproduced here, not recomputed**:

| | Count | |
|---|---:|---|
| Recorded assignment records in the frozen evidence | 37,659 | |
| **Records with `fromPos === toPos`** | **2,686** | **7.1%** |
| — `advance` | 2,086 | |
| — `goalReset` | 600 | |

`goalReset` selects uniformly from all nodes excluding the goal, so it can land on the node already
occupied; `advance` assigns `next`, which can equal `agentCurrent`. Both produce an executed
assignment with no realised position change.

**These records must remain separately reportable** in the analysis milestone. No new statistic
beyond these already-established audit quantities is computed here.

### 9. Independent review, and the strongest counterargument

**Gemini's conclusion, recorded.** Both ambiguities are real and required a formal ruling before
analysis. On Ruling 1, interpretation `fromPos !== toPos` is the only reading consistent with the
protocol's stated scientific intent, despite the conflicting instrumentation behaviour. On Ruling 2,
record identity is the only reading supported by the plain text, rendering E4 redundant with E2.
The INCONCLUSIVE disposition is unaffected, no recollection is required, and with both rulings
frozen **no interpretive flexibility remains** in the analysis.

**Strongest counterargument, recorded rather than dismissed.** The instrument was built, gated
(86/0) and the data collected on the working assumption that every record was a transition.
Excluding 7.1% of records is a data-processing step that was not explicitly operationalised
anywhere before the data existed, and it has the shape of an after-the-fact change. The review's
rebuttal, adopted here: the protocol was frozen before the instrument, and where they conflict the
protocol governs — the analysis is not changing the rule but applying one that was there all along,
even though the instrument's author overlooked its full implication. **That oversight is recorded
as the Chief Systems Engineer's own**: neither the instrumentation gate nor the collection gate
asserted anything about §6's "position-changing" qualifier.

### 10. Boundary

D-009 does **not** evaluate E1–E5, does not state whether any claim is refuted, and reports no
claim frequency, gap count, transition-count distribution, gap classification, or FIRST/LAST
transition result. **Its sole purpose is to remove the semantic ambiguity before analysis.**

Also in force, unchanged: no new sampling; no protocol repair; no new statistical method — no test,
threshold, interval, effect size or model; no modification of Q1, M8 or M9 evidence, code or frozen
text; no causal language, including the express ban on "proximate cause" in Q1 §7; and Q1 remains
INCONCLUSIVE for distributional characterisation, permanently.

### 11. Next milestone

The next milestone is the **implementation of the authorised five-claim refutation analysis**, as a
**separate milestone requiring its own authorisation**. With D-008 §4's ORIGIN specification and
D-009's two rulings frozen, that analysis is a deterministic, mechanical application of already-
frozen definitions with no remaining interpretive flexibility.

---

## D-008 — Q1 §9 labelling: the frozen M9 rule is APPLIED to Q1's population, not reconstructed

**Date:** 2026-08-30 · **Authority:** Director ruling of 2026-08-30, following the read-only Q1
M9-label reconstruction audit and an independent scientific review by Gemini (verdict: **adopt
β**) · **Status:** in force
**Scope:** the meaning of "TELEPORT-classified" and "ADVANCE-classified" in Q1 §9. This is a
governance decision. No analysis code exists, no Q1 event was read or classified, no ORIGIN count,
proportion or statistic was computed, and no seed was generated or evaluated. Q1 pre-registration
frozen at `0ad12fe`, D-006 at `612c69c`, instrumentation at `50be4b4`, collection at `d16d568`,
D-007 at `db9305e` — all unchanged.

### 1. The question this decision closes

D-007 §5 recorded, and the subsequent audit confirmed, that Q1 §9 says *"TELEPORT-classified"*
without saying **by what**. Two readings were available:

| | Reading | Consequence |
|---|---|---|
| **α** | the label M9 actually assigned — its rule **and** its event population | **not reconstructible**; E1, E3, E5 permanently unevaluable |
| **β** | M9's frozen `originOf()` rule **applied to Q1's own gap population** | reconstructible and deterministic; E1, E3, E5 evaluable |

**β is adopted.**

### 2. The distinction that governs everything below

This decision authorises **RULE APPLICATION**. It does **NOT** authorise **POPULATION
RECONSTRUCTION**. The two are different acts and must never be conflated:

| | **RULE APPLICATION — authorised** | **POPULATION RECONSTRUCTION — NOT authorised, and NOT possible** |
|---|---|---|
| What is taken from M9 | the frozen `originOf()` classification function, verbatim | which events M9 admitted to its analysis |
| What it is applied to | **Q1's own gap population**, collected under Q1's own protocol | — |
| Denominator | **Q1's**, always | M9's 7,178 — never Q1's |
| Feasibility | exact and deterministic | **impossible**: M9's event eligibility required the evaluation probe at `main.js:3922`, which Q1's instrumentation does not carry |

**M9's historical event membership is NOT reconstructed, is not reconstructible, and no Q1 output
may be presented as if it were.** M9's results, protocol, analysis and interpretation stand
entirely unchanged and are not re-derived, re-run, subsetted or reinterpreted.

**Why α is impossible, recorded as a source fact.** M8's recorder emits an event only when
`onEval` fires while a read is pending; a read that never reaches `main.js:3922` is discarded as
unpaired. Q1 has no `eval` capture site. A `goalReset` or `advance` record proves the evaluation
was reached, but its *absence* is ambiguous between "did not reach 3922" and "reached 3922 and
produced no transition" — the latter occurring on every slip and whenever `next` is null. The two
are indistinguishable in Q1's §6 schema. **No amount of additional data repairs this**, because
D-007 §8 forbids new sampling and the missing probe cannot be added retroactively.

### 3. Q1's population is and remains the denominator

Q1 §8 already froze this: *"Q1 collects its own evidence and has its own denominator"*, and M9's
figures are *"for context only, never as Q1's population."* This decision changes nothing about
that. Applying M9's rule to Q1's gaps labels **Q1's** gaps; it does not import M9's population, and
it does not make Q1's labelled counts comparable like-for-like with M9's published proportions.

### 4. The frozen rule, and the specification pinned before analysis

The rule applied is M9 §4, implemented verbatim in `experiments/m9/analyze.js`, **unmodified**:

```
ORIGIN = UNCLASSIFIED  if ticksSinceTeleport or ticksSinceWrite is null/undefined
ORIGIN = TELEPORT      if ticksSinceTeleport <  ticksSinceWrite
ORIGIN = ADVANCE       if ticksSinceTeleport >  ticksSinceWrite
                       (on equality) TELEPORT if teleportSource == 'goalReset'
                                     ADVANCE  if teleportSource == 'cap' or 'pool'
                                     UNCLASSIFIED otherwise
```

Its three inputs must be derived from Q1's log by emulating the M8 recorder's state machine. That
emulation is **pinned here, before any analysis exists**, so the analysis milestone implements a
specification rather than inventing one — the M8 lesson, where the analysis layer and not the
instrumentation was where degeneracy entered:

1. **`ticksSinceWrite`** = `tickIndex(read) − tickIndex(W)`, where `W` is the most recent boundary
   record with `kind === 'write'` and `seq < seq(read)`; **null** if no such record exists.
2. **`ticksSinceTeleport`** = `tickIndex(read) − tickIndex(X)`, where `X` is the most recent
   transition record with `site ∈ {cap, pool, goalReset}` and `seq < seq(read)`; **null** if none.
3. **`teleportSource`** = `site` of that same `X`; **`'none'`** if none.
4. **`advance` is excluded from the teleport set.** M8 instrumented only three teleport anchors;
   `main.js:4917` was never a teleport in M8's ontology.
5. **Last-write-wins is emulated deliberately.** Only the most recent qualifying record is used;
   earlier teleports in the same gap are discarded, exactly as M8's overwriting counter discarded
   them. Q1's log retains them, and that retention is Q1's own contribution — it must not leak into
   the ORIGIN computation.
6. **Ordering is by `seq`, not by tick.** Q1 assigns `seq` inside `onTransitionEnd`, the same
   program position as M8's `onTeleport` probe, and both use the same anchors, so `seq` order is
   M8's program order.
7. **Null handling is M9's.** A null input yields `UNCLASSIFIED`, which is counted and reported
   separately and never silently assigned to either category.

**Equivalence established by the audit:** properties 1–6 above reproduce M8's recorder exactly, on
source-verifiable grounds — Q1 imports M8's anchors rather than restating them, emits exactly one
record per transition at the same program position, and runs single-threaded so `seq` order is call
order. The seventh property, **event eligibility, is the one that does not reproduce**, and §2
records why that does not block β.

### 5. Authorised claims

| | Statement | Status |
|---|---|---|
| **E1** | TELEPORT-classified gaps contain only teleports | **AUTHORISED** under β |
| **E2** | Every gap contains exactly one transition | already authorised (D-007 §5); needs no ORIGIN label |
| **E3** | The last transition in a TELEPORT-classified gap is always the teleport | **AUTHORISED** under β |
| **E4** | `FIRST_DIVERGING_TRANSITION` equals `LAST_TRANSITION_BEFORE_EVALUATION` | already authorised (D-007 §5); needs no ORIGIN label |
| **§9.5** | Gap composition is independent of AGE | **REMAINS RETIRED** under D-007 §4 — unevaluable as frozen, at any sample size |

All five authorised claims remain **refutation-only**, on the **existing frozen Q1 evidence only**.
Every D-007 §6 non-refutation safeguard applies unchanged, including the permitted wording and the
requirement that all five be reported whether refuted or not.

**A naming hazard, recorded so it is not mistaken for a dependency.** E4 references
`LAST_TRANSITION_BEFORE_EVALUATION`, but Q1 §7 defines that observable as *"the final transition in
the gap"*, and §3 closes the gap at the read (`main.js:3819`), not at the evaluation (`3922`). The
name implies an evaluation dependency the definition does not carry. E4 requires no ORIGIN label
and no evaluation probe.

### 6. Required terminology

**Mandatory wording** in every downstream report, verbatim:

> Q1 gaps were classified using the frozen M9 `originOf()` rule.

> Gaps were labelled according to the M9 pre-registered classification logic.

**Prohibited, without exception:**

- "gaps that were classified as TELEPORT in M9"
- "M9's historical TELEPORT population"
- any phrasing implying Q1 reconstructed M9's original eligible event set
- any presentation of Q1 labelled counts as continuous with, poolable with, or directly comparable
  to M9's published ORIGIN proportions

### 7. Independent review, and the strongest counterargument

**Gemini's conclusion, recorded:** β is the strongest reading of Q1 §1 together with §8 and §9. The
Q1 wording is **genuinely ambiguous**, but §1's counterfactual — *"gaps that M9 **would** classify
TELEPORT versus ADVANCE"* — combined with §8's explicit population separation, supports β. This is a
**clarification of a frozen ambiguity, not a new classification rule**. α is not reconstructible
because M9's event eligibility depended on an eval probe absent from Q1. The Q1 dataset remains
valid.

**Strongest counterargument, recorded rather than dismissed.** Q1 §9's own rows say
*"TELEPORT-classified"* with no stated classifier, and §1's "would classify" appears in the
**question statement**, not in an operational definition — no frozen section specifies the
labelling procedure. β therefore fills a gap in the frozen text rather than applying something the
text supplied. Two aggravating facts belong beside it: β labels a **superset** of the gaps M9 would
have admitted, so any resemblance between Q1's labelled counts and M9's proportions is not
like-for-like; and β is the reading under which **more of the Chief Systems Engineer's own work
becomes evaluable**, which is precisely why the question was routed for independent review.

**Post-hoc timing.** The D-007 §7 disclosure carries forward unchanged and is not weakened by this
decision: the decision to act on the pre-existing partition was taken after the INCONCLUSIVE
disposition was known, the resulting analysis has weaker evidential status than a fully a-priori
analysis, and it must never be described as fully a-priori. The independent review found that this
disclosure, together with the stronger textual reading, does not override β — **not** that the
concern is void.

### 8. Boundary

- **No new sampling.** D-006 §5.6 and D-007 §8 stand.
- **No protocol repair.** Q1 §9.5 stays retired; nothing in Q1 is amended.
- **No new statistical method** — no test, threshold, interval, effect size or model. Q1 §10
  governs unchanged.
- **No modification of Q1, M8 or M9 evidence, code or frozen text.** All digests revalidate.
- **No causal language.** Q1 §7's prohibition, including the express ban on "proximate cause",
  survives unchanged.
- **Q1 remains INCONCLUSIVE for distributional characterisation** (D-007 §9), permanently. No
  `GAP_COMPOSITION` characterisation and no proportion as distributional evidence.
- **No analysis in this milestone.** No Q1 event was read or classified and no statistic computed.

### 9. Next milestone

The next milestone is the **implementation of the authorised five-claim refutation analysis**, as a
**separate milestone requiring its own authorisation**. It implements the §4 specification rather
than defining it, must freeze its analysis design before running it, and must carry adversarial
mutation controls and Q1 §12 reproducibility — the same discipline the instrumentation received.

No Q1 result is authorised to reinterpret M7, M8 or M9, or to bear on the G15 outcome.

---

## D-007 — Q1 post-INCONCLUSIVE governance: B′ adopted, §9.5 retired, D-006 §4 corrected

**Date:** 2026-08-30 · **Authority:** Director ruling of 2026-08-30, following the read-only D-007
pre-analysis governance audit and an independent scientific governance review by Gemini
(verdict: *analysis may proceed only for specified claims*) · **Status:** in force
**Scope:** the disposition of the already-collected Q1 evidence. This is a governance decision. No
analysis was executed, no raw Q1 transition record was read, no scientific result was computed, no
seed was generated or inspected. Q1 pre-registration frozen at `0ad12fe`, D-006 at `612c69c`,
instrumentation at `50be4b4`, collection at `d16d568` — all unchanged.

### 1. Decision

Q1 completed over its complete frozen range and returned **INCONCLUSIVE — INSUFFICIENT MATERIAL**:
17 accepted configurations (from 9 distinct configuration seeds) against minima of 20
configurations and 15 per goal-degree stratum. This entry rules on what that disposition permits.

| | Ruling |
|---|---|
| **A** | **Interpretation B′ is adopted.** The INCONCLUSIVE disposition is a verdict on *distributional sufficiency*. The five existence-based refutation claims in Q1 §9 remain independently evaluable **for refutation only**. |
| **B** | **D-006 §4 contains a material governance defect.** Its premise that "every" Q1 §9 falsification statement is an existence claim is false. The same overstatement appears in the frozen Q1 §9. Both are corrected *by this record*; neither historical document is rewritten. |
| **C** | **Q1 §9.5 is unevaluable as frozen and is RETIRED for Q1.** Increasing the sample size cannot repair a missing decision rule. |
| **D** | **Evaluation of the five existence claims is AUTHORISED**, on the existing frozen Q1 evidence only. |
| **E** | **Four non-refutation safeguards are MANDATORY** and apply verbatim to every downstream report. |
| **F** | **The post-hoc timing of the partition decision is disclosed**, without mitigation. |

### 2. A — the B′ interpretation

The INCONCLUSIVE disposition attaches to distributional sufficiency, not to the whole evidential
record. The controlling text is D-006 §4, frozen before any Q1 data existed:

> "The minimum-evidence rule governs *distributional characterisation* — the precision with which
> `GAP_COMPOSITION` proportions are reported — **and nothing else. It cannot make a Q1 refutation
> more or less valid.**"

The operative prohibitions in D-006 §5 bind **sampling, collection, acquisition, extension and
adaptation**. No frozen provision in Q1 or D-006 prohibits analysis of Q1's own evidence; Q1 §17's
prohibitions concern predecessor artifacts, added observables and the held-out block. Q1 §15
independently presupposes evaluation, naming "no falsifiable statement is overturned" as a valid
and complete Q1 outcome.

**The strongest counterargument is recorded rather than dismissed.** D-006 §5.6 predicates the
disposition of "the Q1 **result**", unqualified, and a plain reading assigns it to the whole study.
The independent review resolved this on the interpretive principle that **a specific clause takes
precedence over a general one**, particularly where the specific clause (§4) was written expressly
to define the scope of the general one (§5.6). This decision adopts that resolution and records the
counterargument so a future reader can weigh it.

### 3. B — the exact defect in D-006 §4

**What D-006 §4 says:** "**every** falsification statement in Q1 §9 is an existence claim, refuted
by a single counterexample."

**Why it is false.** Q1 §9's fifth row is *"Gap composition is independent of AGE"*, falsified by
*"composition distributions differing across AGE values"*. Refutation requires comparing
**distributions across a partition**. It is not a property of any single gap and cannot be
witnessed by one counterexample. **Five** of the six statements are existence claims; the sixth is
comparative and distributional.

**The same overstatement exists in the frozen Q1 §9**, whose closing line reads "Each statement is
falsified by the existence of a counterexample, which requires no cut-point to evaluate."

**Materiality.** This is not a harmless drafting error. The false premise is the justification for
scoping the minimum-evidence rule, and its falsity means **§9.5 was never correctly reasoned about
at ratification** — a structurally different kind of claim passed scrutiny under a rule that did
not apply to it. An error in the justifying premise of a governance rule is never harmless.

**Remedy.** The error is corrected **by this record, in both locations**. Per the independent
review, a numbered erratum to the frozen Q1 document is not required because this decision
addresses the error in both places explicitly.
**`D-006` and `Q1_PREREGISTRATION.md` are NOT rewritten.** Their historical text and their digests
stand unchanged; that is the whole point of freezing them. D-006's operative content is otherwise
undisturbed — the conclusion it drew holds for the five existence claims, and only its universal
quantifier and its treatment of §9.5 are corrected here.

**Attribution.** The defective text was drafted by the Chief Systems Engineer and ratified by the
Director on that memo. It is recorded as an error of this project's own making, not an inherited
one.

### 4. C — Q1 §9.5 is retired

Q1 §9.5's refuting condition, *"composition distributions differing across AGE values"*, admits no
non-vacuous decision rule under Q1's own frozen constraints:

- **"Differ" as exact observed inequality** is essentially certain in any finite sample with more
  than one AGE value, so the statement would be refuted by construction. Q1 §9's own header forbids
  exactly that: "None is predetermined — the failure mode that made M8's own analysis layer
  degenerate."
- **"Differ" as a material difference** requires a threshold or a test. Q1 §9 states "No threshold
  is introduced", and Q1 §10 prohibits tests, intervals, effect sizes and any post-hoc statistical
  addition.

**Both failure modes are independent of sample size.** One is vacuous at every *n*; the other lacks
a criterion at every *n*. **Increasing the sample cannot repair a missing decision rule**, and no
successor study may be justified on the basis of §9.5.

**§9.5 is retired for Q1 and will not be evaluated.** No threshold, statistical test, effect size,
interval or other criterion may be introduced to rescue it — doing so would be a post-hoc
alteration of the study's core statistical philosophy. Reporting per-AGE composition descriptively
is *not* an evaluation of §9.5 and is in any case barred by §6 of this decision.

### 5. D — the five authorised claims

Authorised for evaluation **on the existing frozen Q1 evidence only**:

| | Statement (Q1 §9, verbatim) | Refuted by |
|---|---|---|
| **E1** | TELEPORT-classified gaps contain only teleports | any such gap containing an `advance` record |
| **E2** | Every gap contains exactly one transition | any gap with `TRANSITION_COUNT` >= 2 |
| **E3** | The last transition in a TELEPORT-classified gap is always the teleport | any such gap whose `LAST_TRANSITION_BEFORE_EVALUATION` is `advance` |
| **E4** | `FIRST_DIVERGING_TRANSITION` always equals `LAST_TRANSITION_BEFORE_EVALUATION` | any gap where they differ |
| **E5** | ADVANCE-classified gaps are single-transition | any such gap with `TRANSITION_COUNT` >= 2 |

**Refutation only.** A counterexample refutes at any sample size. Non-refutation is governed by §6.

**Prerequisite carried forward from the D-007 audit, and NOT part of the independent review.** E1,
E3 and E5 are quantified over gaps bearing an M9 ORIGIN label. Q1's §6 schema records
`{seq, tickIndex, site, fromPos, toPos}` and the write/read boundaries — **not** M9's
`ticksSinceTeleport`, `ticksSinceWrite` or `teleportSource`. Whether M9's frozen classification is
faithfully reconstructible from Q1's schema is a schema-level question that **has not been
resolved**, and reconstructing "what M9 would have classified" requires deliberately emulating
M9's lossy last-write-wins bookkeeping — a design decision, not a lookup. **E1, E3 and E5 are not
evaluable until that reconstruction rule is established and frozen.** E2 and E4 carry no such
prerequisite. This is an implementation precondition on the next milestone, not a reopening of the
ruling.

### 6. E — mandatory non-refutation safeguards

Refutation is sample-size independent; **non-refutation is not**. The evidential weight of "no
counterexample found" depends entirely on *n*, and Q1's *n* is 17 accepted configurations drawn
from **9 distinct configuration seeds** — configurations sharing a seed share that seed's
edge-reliability draw and embeddings, so the effective independent replication is nearer 9 than 17.

All four safeguards are **mandatory and apply verbatim** to every downstream report:

1. **Permitted wording only** — quoted here on one unbroken line so downstream reports can
   reproduce it verbatim:

   > no counterexample observed in 17 accepted configurations drawn from 9 distinct configuration seeds.

   **Prohibited:** "established", "confirmed", "holds", "always", "the statement is true", and any
   unqualified present tense. **Non-observation is never converted into confirmation.**
2. **All five existence statements are reported, refuted or not.** Reporting only the refuted ones
   would convert a legitimate analysis into selective reporting.
3. **INCONCLUSIVE — INSUFFICIENT MATERIAL travels with every reported statement.**
4. **The 9-distinct-seed clustering is disclosed wherever counts appear.**

### 7. F — post-hoc disclosure, stated without mitigation

| Event | Commit | Status |
|---|---|---|
| Q1 §9 frozen (five existence claims + §9.5) | `0ad12fe` | a-priori — no instrumentation, no seed generated |
| D-006 §4 scoping of the minima | `612c69c` | a-priori — before any Q1 data existed |
| Q1 instrumentation | `50be4b4` | before collection |
| Q1 collection over the complete frozen range | `d16d568` | — |
| INCONCLUSIVE disposition determined | `d16d568` | — |
| **Decision to operationally partition the analysis** | **this decision** | **AFTER the disposition** |

The §9 criteria and the D-006 §4 conceptual distinction both **existed before collection**. The
decision to **act** on that pre-existing partition was taken **after the disposition was known**.

**Consequence, which downstream write-ups must reproduce rather than soften:** the resulting
analysis has **weaker evidential status than a fully a-priori analysis** and must never be
described as fully a-priori. The aggravating factor is recorded too — the scoping in D-006 §4 was
authored by the same party that later invoked it, and no independent party assessed it before
ratification. The independent review judged that the mitigation is transparency, and that voiding
an a-priori rule because its outcome proved adverse would be a more dangerous post-hoc
intervention than applying it as written. This decision adopts that judgement and records the
concern alongside it.

### 8. G — boundary

This decision authorises **no measurement and no computation**. In force until superseded:

- **No new Q1 sampling.** D-006 §5.6 stands: no additional sampling is permitted under Q1.
- **No seed extension**, no substitution, no retry, no new seed generated or inspected.
- **No Q2.** No successor study is designed, sized, sampled or authorised here.
- **No protocol repair.** Q1 §9.5 is retired, not fixed.
- **No statistical additions** — no test, threshold, interval, effect size or model.
- **No modification of frozen text.** `Q1_PREREGISTRATION.md`, D-006's historical text, and all
  M7, M8 and M9 artifacts remain byte-identical; every digest revalidates.
- **No scientific analysis in this milestone.** No raw Q1 transition record was read and no
  result, distribution, proportion or existence verdict was computed.

### 9. Q1 remains INCONCLUSIVE for distributional characterisation

Permanently, and not curable by reinterpretation. The 17 configurations may **not** be treated as
sufficient for distributional claims. No `GAP_COMPOSITION` distributional characterisation may be
performed, and no proportion may be produced as evidence for a distributional conclusion. Q1's
denominator is Q1's; no pooling with any future evidence is permitted.

### 10. H — next milestone

The next milestone is the **implementation of the authorised five-claim analysis**, as a
**separate milestone requiring its own authorisation**. Given the M8 precedent — where the analysis
layer, not the instrumentation, was where degeneracy entered — that milestone should freeze its
analysis design before running it, with adversarial mutation controls and Q1 §12 reproducibility,
and must resolve the E1/E3/E5 ORIGIN-reconstruction prerequisite in §5 first.

No Q1 result is authorised to reinterpret M7, M8 or M9, or to bear on the G15 outcome. Q1 §7's
prohibition on causal language, including the express ban on "proximate cause", survives unchanged.

---

## D-006 — Q1 collection parameters: ratified and frozen

**Date:** 2026-08-29 · **Authority:** Director ruling of 2026-08-29, following the read-only D-006
collection-parameter design audit · **Status:** in force
**Scope:** the Q1 collection only. This is a governance decision. No instrumentation exists, no
candidate was enumerated, no seed was generated or inspected, no configuration was run, and no Q1
outcome has been observed. M7 frozen at `707cb1e`, M8 evidence at `f9d97b9`, M9 at
`04dda03`/`9044c3b`, Q1 pre-registration at `0ad12fe` — all unchanged.

### 1. Decision

Q1 [§14](preregistrations/Q1_PREREGISTRATION.md) left six collection parameters explicitly open and
required them to be ratified as a numbered Director decision **before the collection milestone
begins**. This entry ratifies all six. They are frozen; a change arrives only as a superseding
numbered decision, never by adjustment during collection.

| | Parameter | Ratified value | Basis |
|---|---|---|---|
| **A** | Configuration-seed range | **899000-899499** inclusive — 500 configuration seeds, four frozen goal indices per seed, **2000 candidate configurations** | admissible space **mechanically constrained**; size **judgment**, informed by documented yield |
| **B** | Agent seed | **20260819000** | **judgment**, with strong evidential support |
| **C** | Arm | **A1** | **judgment**, with strong evidential support |
| **D** | Tick budget | **3000 ticks** per accepted configuration | **mechanically constrained** via phase balance, reinforced by precedent |
| **E** | Minimum evidence | **100** DESYNC events pooled · **20** accepted configurations · **15** accepted configurations per goal-degree stratum | **Director judgment** — see §4 |
| **F** | Stopping rule | Fixed range, full enumeration, **no extension**, no adaptation | **mechanically constrained** by Q1 §14, precedent M8 §13 |

### 2. Exact seed boundaries

| Block | Range | Status |
|---|---|---|
| **Q1 (this decision)** | **899000-899499** | ratified for consumption |
| M8 | 899500-899999 | consumed (D-003 H) |
| M7 pilot | 900000-900029 | consumed (M7 frozen §5.1) |
| M7-ERR-09 gate diagnostic | 900030-900499 | consumed |
| **Held-out** | **>= 900500** | never generated, inspected, or inferred |

The Q1 range is contiguous, lies strictly below 899500, and is **disjoint from every consumed block
and from the held-out floor**. Disjointness is arithmetic on the boundaries above, not an empirical
finding: 899499 < 899500 <= every consumed and held-out seed.

The agent seed `20260819000` is **not** a configuration seed. Configuration seeds are six-digit
values in the blocks above; the agent seed inhabits a separate namespace, and a numeric comparison
across the two is a category error — the error corrected during M8 verification, recorded here so it
is not repeated.

### 3. Basis classification — what is constrained, what is evidence, what is judgment

The audit classified each parameter as exactly one of: **mechanically constrained** by already-frozen
protocol or source; **evidence-supported** by prior committed experimental results; or **Director
judgment**. That distinction is recorded so downstream write-ups do not present a judgment as a
derivation.

**Mechanically constrained.**

- The admissible seed *space* — below 899500, disjoint, contiguous, enumerated — per Q1 §14.
- The **tick budget of 3000**. This is the least obvious item in the audit. `T_SHIFT = 1500` is
  frozen in `env.js`, so at 3000 ticks the phase-1/phase-2 split is balanced. Any other budget
  unbalances the `phase` stratifier. The budget is therefore constrained *through a stratifier*, not
  merely conventional.
- The stopping-rule **form**: Q1 §14 requires an under-yield to be handled by a stopping rule rather
  than by extension.

**Evidence-supported** — from documented figures only; no seed was generated to produce them.

- M8 accepted 41 configurations from 500 seeds, a realised yield of **0.082 accepted configurations
  per seed**, close to the 0.0872 M7 figure used to size M8.
- M9 recorded **7,178 DESYNC events across 41 configurations** — 175.07 per accepted configuration.
- Arithmetic on those two figures gives about 14.36 DESYNC gaps per seed, so 500 seeds **project**
  about 41 accepted configurations and about 7,180 gaps. This is a projection from a different seed
  block, **not a guarantee**; yield is a property of the acceptance predicate and need not reproduce.
  The stopping rule (§5), not the range, absorbs an under-yield.
- M8 §12 established the *form* 100 / 20 / 15 as a workable information-sufficiency rule.

**Director judgment.**

- The seed-range **size** — 500 rather than 250 or 200.
- The **agent seed** and the **arm**, per §6.
- The minimum-evidence **numbers**, per §4.

### 4. Minimum evidence — explicitly Director judgment

**The values 100 / 20 / 15 are a pre-data design choice by the Research Director, informed by M8
precedent. They are NOT mechanically required by source, and must never be represented as such.**

Two facts make that labelling substantive rather than ceremonial.

First, **every falsification statement in Q1 §9 is an existence claim**, refuted by a single
counterexample. Falsification under Q1 therefore requires **no minimum sample and no threshold at
all**. The minimum-evidence rule governs *distributional characterisation* — the precision with
which `GAP_COMPOSITION` proportions are reported — and nothing else. It cannot make a Q1 refutation
more or less valid.

Second, Q1 §10 pre-registers **no test and no precision target**, so there is no mechanical anchor
from which any specific number could be derived. The numbers are inherited in form from M8 §12
(D-003 B) because that form is the established project precedent, not because the evidence
determines them.

**Goal-degree stratum.** Q1's frozen text does not itself define one. The stratification is
inherited unchanged from M8 §12 / D-003 B: **degree 5 = goals 8, 12; degree 3 = goals 16, 19**. This
decision is the instrument that fixes it for Q1, and it is stated here rather than assumed, because
Q1 does not supply it.

Strata are **not balanced by construction.** Goals cycle `GOALS[configIndex % 4]` over candidates,
but acceptance is not uniform: M8 realised 10 / 10 / 9 / 12 by goal, i.e. 20 versus 21 configurations
across the two strata. A per-stratum minimum of 15 therefore binds the seed range more tightly than
the pooled minimum of 20 does.

### 5. Stopping rule — fixed range, no extension, no adaptation

1. Enumerate the **entire** frozen range 899000-899499.
2. Evaluate **every** candidate directly at its own seed. There is no acceptance walk, so no seed
   outside the frozen range is ever reached — the M7-ERR-09 §3.3 discipline, carried forward.
3. Collect **every** accepted configuration in that range.
4. **Do not extend the range for any reason**, including an observed under-yield.
5. **Do not adapt collection after observing any Q1 result.** No parameter in §1 may be revised in
   response to Q1 data.
6. If **any** minimum-evidence condition in §1 E is unmet, the Q1 result is
   **INCONCLUSIVE — INSUFFICIENT MATERIAL**, and the report must name the specific failing
   condition. **No additional sampling is permitted under Q1.**

Because the range is fixed and extension is prohibited, the minimum-evidence rule is a **reporting
threshold, not a collection target**. It decides the disposition of the evidence actually obtained;
it never drives the acquisition of more.

### 6. Comparability, and what reuse does not buy

The agent seed and the arm are reused from M8/M9 so that the **only** changed variable between M9
and Q1 is the configuration range. Changing the agent seed would change two variables at once and
would foreclose reading Q1's composition results against M9's ORIGIN proportions. Arm A1 is recorded
in `arms.js` as **BELIEF**, is in `LOCKED_ARMS`, and the transition sites Q1 observes — `cap`,
`pool`, `goalReset`, `advance` — are arm-independent in source, so no other arm offers an identified
advantage for this question.

**Reuse does not establish seed-robustness.** M7, M8, M9 and Q1 all inherit any idiosyncrasy of this
single agent seed, with no independent check. That is a real limitation of the series, it is not
removed by this decision, and downstream write-ups must state it rather than treat comparability as
if it were replication. Testing robustness across agent seeds would be a **different study**, not a
parameter adjustment to Q1.

### 7. Dependencies identified by the D-006 audit

Recorded because each coupling can silently invalidate a parameter that looks independently chosen.

1. **Tick budget ⇄ phase stratifier.** `T_SHIFT = 1500` is frozen, so the budget controls a
   stratifier, not just sample size. 3000 looks like a free convention and is not.
2. **Seed range ⇄ tick budget.** Both scale total gaps. With the budget fixed at 3000, the range is
   the only remaining sample-size lever.
3. **Minimum evidence ⇄ stopping rule.** With no extension permitted, the minimum determines the
   probability of a pre-declared INCONCLUSIVE. The two were decided together, not separately.
4. **Per-stratum minimum ⇄ seed range.** Because strata are not balanced by construction (§4), the
   15-per-stratum condition constrains the range more tightly than the pooled 20 at the same nominal
   level.
5. **Agent seed ⇄ comparability with M9.** Changing it alters two variables at once relative to
   M8/M9, per §6.
6. **Seed range ⇄ minimum evidence, through an unverifiable assumption.** The range was sized from
   M8's yield, which may not reproduce on a different block. Dependency 3 absorbs that risk; no
   minimum was chosen on the assumption that the projection holds.

**Recorded from the audit, and deliberately not acted on:** the AGE distribution is governed by the
per-tick probability of the DESYNC conjunction — no fresh selection (the `liveRng() < 0.92` gate at
`main.js:3325`) **and** a realised position change — rather than by the tick budget or the
`EPISODE_CAP = 150` ceiling. Observed successive AGE ratios, 27.0 : 15.1 : 8.5, do not cleanly match
the gate alone, which is consistent with the conjunction being the driver. **The exact functional
form is not established and is not claimed.** Only the negative consequence is used here: the tick
budget is a sample-size lever and does not shape the phenomenon.

### 8. Boundary and governance consequence

D-006 is a **governance decision only**. It adds no instrumentation, enumerates no candidate,
generates or inspects no seed, runs no configuration, produces no data, and observes no Q1 outcome.
It modifies no scientific definition in Q1, and does not touch M7, M8 or M9.

Q1 instrumentation design and implementation is a **separate milestone requiring its own
authorisation**, and collection is a further milestone after that. No Q1 result is authorised to
reinterpret M7, M8 or M9, or to bear on the G15 outcome.

---

## D-005 — Q1: ordered transition composition in DESYNC gaps, pre-registered

**Date:** 2026-08-29 · **Authority:** Director ruling of 2026-08-29, following independent
scientific review of the Q1 formulation (verdict A) · **Status:** in force
**Scope:** a new descriptive follow-up requiring its own collection. M7 frozen at `707cb1e`,
M8 evidence at `f9d97b9`, M9 at `04dda03`/`9044c3b` — all unchanged.

### 1. Decision

[`research/preregistrations/Q1_PREREGISTRATION.md`](preregistrations/Q1_PREREGISTRATION.md) is
frozen before any instrumentation or measurement exists, digest recorded in its `.sha256` sidecar.

Q1 asks what **ordered sequence of position-changing transitions** occurs within a DESYNC gap, and
how that sequence is distributed across gaps M9 would classify TELEPORT versus ADVANCE.

### 2. Why Q1 is not a repeat of M9

M9's observable was a last-only, overwriting teleport counter yielding one boolean: did at least
one teleport fall in the gap. Under it, the histories `write→teleport→read`,
`write→teleport→advance→read`, `write→advance→teleport→read` and
`write→teleport→advance→teleport→read` are **indistinguishable** — all four classify TELEPORT. The
Q1 log separates them. Q1 decomposes an information gap M9 identified and disclosed in its own §4,
and converts M9's ADVANCE from an inference by exclusion into a direct observation.

**Q1 requires a new collection.** The observable was never recorded, so no re-analysis of the M8
evidence can answer it. Q1 has its own denominator; M9's 7,178 is context, not Q1's population.

### 3. Frozen in the pre-registration

| | Decision |
|---|---|
| **Question** | The §1 wording, with "proximate" deliberately absent. |
| **Phenomenon** | `DESYNC := lastReasoning.from !== agentCurrent`, inherited unchanged from M8 §2. |
| **Window** | Strictly between `main.js:2635` and `main.js:3819`, with per-tick membership fixed by the audited in-tick ordering. Maximum 2k transitions at age k — two even at age 1. |
| **Taxonomy** | Closed: `cap`, `pool`, `goalReset`, `advance`. The wipe at `main.js:5209` is excluded as unreachable in this harness, with the reason recorded rather than the site omitted. |
| **Completeness gate** | Mandatory source-level verification that every reachable `agentCurrent` assignment maps to exactly one taxonomy member. **An additional reachable assignment HALTS the study** — it is never silently ignored or absorbed. |
| **Raw observable** | Closed schema `{seq, tickIndex, site, fromPos, toPos}`. No field addable after data exists. `fromPos` is formally redundant and retained so a dropped record is detectable rather than silently corrupting the chain. |
| **Derived** | `GAP_COMPOSITION`, `FIRST_DIVERGING_TRANSITION`, `LAST_TRANSITION_BEFORE_EVALUATION`, `TRANSITION_COUNT`. **None may be named a cause; "proximate cause" is prohibited.** |
| **Falsification** | Six statements, each refuted by a counterexample, requiring no threshold. |
| **Statistics** | Descriptive only — counts, proportions, sequence frequencies. No test, interval, model or causal estimate, and none addable post hoc. |
| **Intervention-free** | No RNG, no mutation, no branch substitution, no change to selection/teleport/advance/goal logic, default-off, bit-identical when disabled, run-neutrality verified. |
| **Reproducibility** | Deterministic, digest-pinned, identical across authoring tree, archive and CRLF checkout; no mtime, wall-clock, network or undeclared seed. |

### 4. Why "proximate" was removed

The independent review and the source audit agree: the evidence supports **temporal ordering**,
not causal responsibility. Two source facts make this substantive. DESYNC is a **conjunction** — no
fresh selection **and** a net position change — so no single transition carries responsibility for
it. And with up to 2k transitions per gap the position may oscillate, so the transition that
*established* divergence and the one that *determined the executed position* are different
transitions answering different questions. Both are therefore recorded, and neither is privileged.

### 5. Seed governance — OPEN, deliberately not chosen here

The admissible space is **below 899500**: not overlapping M8's `899500-899999`, not overlapping
M7's `900000-900029` or `900030-900499`, strictly below the held-out floor `900500`.

**The exact bounds are NOT frozen.** Sizing depends on acceptance yield and the number of DESYNC
gaps required, which is a scientific judgement; per the Director's instruction it is recorded as an
open decision rather than silently chosen. The same applies to the agent seed, arm, tick budget,
minimum evidence rule and stopping rule. **All must be ratified as a numbered Director decision
before the collection milestone begins.**

Sizing basis available to that decision, from documented figures only: M8 accepted 41
configurations from 500 seeds (0.082 per seed), close to the 0.0872 M7 figure used to size M8.

### 6. Post-hoc disclosure

Q1 was motivated by an observability limitation **M9 disclosed in its own protocol**, and the
formulation was written after the M9 results existed. Q1's *design* is therefore post-hoc relative
to M9. Its *measurement* is a-priori relative to its own evidence, because it requires a new
collection under a pre-registration frozen beforehand. Downstream write-ups must reproduce that
distinction rather than claiming either extreme.

### 7. Governance consequence

Changes to Q1 arrive only as numbered errata quoting its text and binding to its digest.
Instrumentation, seed ratification, and collection are separate milestones, each requiring its own
authorisation. No Q1 result is authorised to reinterpret M7, M8 or M9, or to bear on the G15
outcome.

---

## D-004 — M9: secondary analysis of the frozen M8 evidence, pre-registered

**Date:** 2026-08-29 · **Authority:** Director ruling of 2026-08-29, M9 Governance Gate accepted
· **Status:** in force
**Scope:** analysis only. M8 evidence untouched and byte-identical at
`f9d97b9a180fa5a4aed6def06788eb4b38c037f0`; M7 untouched and frozen at
`707cb1e5205a7e9979f81092ee1ebfa0fe28922e`, digest
`2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9`.

### 1. Decision

[`research/preregistrations/M9_PREREGISTRATION.md`](preregistrations/M9_PREREGISTRATION.md) is
frozen before any analysis is run, digest recorded in its `.sha256` sidecar. M9 is a **secondary
analysis of an existing dataset**: it performs no measurement, consumes no seed, and changes
nothing in M8 or M7.

### 2. Why M9 rather than an M8 erratum

The M8 analysis layer (§10, §11) is degenerate and is **not repaired and not superseded** — it
stands in history as issued and as demonstrated degenerate. An erratum would touch the M8
governance chain to fix an analysis defect; M9 leaves the M8 evidence and its record entirely
intact. M8 §19 permits this because M9 modifies no M8 text, and M8 §13 is not engaged because M9
performs no measurement.

### 3. Frozen Director decisions

| | Decision |
|---|---|
| **Question** | Candidate A — the proportion of DESYNC events arising from a teleport-class reset within the write→read gap versus ordinary advance alone. |
| **Denominator** | Fixed at 7,178 DESYNC events; single denominator throughout; no exclusions. |
| **ORIGIN** | Partition on when the most recent teleport fell relative to the write, per M9 §4. |
| **Equality case** | `teleportSource` resolves in-tick order: `cap`/`pool` precede the write → ADVANCE; `goalReset` follows the evaluation → TELEPORT. |
| **Null case** | UNCLASSIFIED: counted, reported separately, excluded from proportions, never assigned to a category, never dropped. |
| **Unobserved cells** | No cell excluded, merged, or collapsed. Zero-count cells are NOT OBSERVED; UNREACHABLE requires a cited source proof. |
| **Statistical policy** | Descriptive only — counts and proportions. No test, null, threshold, interval or model pre-registered, and none may be added after the data is seen except by numbered erratum frozen beforehand. |
| **Multiple comparisons** | No inferential test, so no correction. The complete grid is emitted on every run; selective reporting is a protocol violation. |
| **Minimum evidence** | Evaluable iff the regenerated dataset yields exactly 7,178 DESYNC events, UNCLASSIFIED = 0, and both ORIGIN categories are non-empty. Otherwise NOT EVALUABLE; no re-collection or substitute denominator. |
| **Falsification** | Six named statements, each falsifiable by a data pattern possible under the frozen definitions (M9 §14). |

### 4. Demotions carried from the source audits

AGE is duration, not a mechanism. Replay is a constant precondition, reported as the constant it
is. H4 is harness-unreachable, not absent. NON_CANONICAL is a consequence; S_PAIR an observable
signature. `agentCurrentChangedSinceLastWrite` is excluded entirely, being identically DESYNC.
The sole-attribution layer and the composite rule are excluded.

### 5. Post-hoc disclosure

The ORIGIN rule was formulated after the M8 collection existed and was retained knowing both its
categories are populated. Its inputs and the in-tick ordering it relies on predate collection, and
it was derived from control flow rather than selected by its answer — but the residue is real and
is disclosed on the face of M9 §16. M9's conclusions therefore carry less evidential weight than a
result from a rule frozen before collection.

### 6. Governance consequence

Changes to M9 arrive only as numbered errata quoting its text and binding to its digest.
Implementation of the analysis is a separate milestone requiring its own authorisation. No M9
result is authorised to reinterpret M7, and no M9 statistic may be compared with, correlated
against, or selected to explain the G15 outcome.

---

## D-003 — M8 successor phase: pre-data design decisions frozen

**Date:** 2026-08-28 · **Authority:** Director decisions A-H of 2026-08-28 · **Status:** in force
**Scope:** the M8 successor investigation only. M7 untouched — frozen and closed at
`707cb1e5205a7e9979f81092ee1ebfa0fe28922e`; `M7_PREREGISTRATION.md` SHA-256
`2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9` unchanged.

### 1. Decision

The M8 pre-registration is frozen before any measurement exists, at
[`research/preregistrations/M8_PREREGISTRATION.md`](preregistrations/M8_PREREGISTRATION.md),
digest recorded in its `.sha256` sidecar. The primary phenomenon is **decision/position
desynchronization**, `DESYNC := lastReasoning.from !== agentCurrent`. Non-canonicality is a
secondary derived label, because the audit established that `non-canonical -> DESYNC` holds
while the converse is false — 88 of 190 node pairs share a common neighbour, so the proxy is
lossy and topology-dependent.

### 2. Frozen pre-data design decisions

These are design choices. **None is claimed to be mechanically derived from source code.**

| | Decision |
|---|---|
| **A** | H5 composite accepted iff no `SOLE_SHARE(k) > 0.70` and at least three `SOLE_SHARE(k) >= 0.10`. Denominator `D` = count of eligible events with exactly one mechanism flag set; `MULTI` and `ZERO` events are excluded from `D` but counted and reported; `D = 0` yields NOT EVALUABLE. |
| **B** | Information sufficiency: 100 total DESYNC events, 20 distinct configurations, 15 per goal-degree stratum (degree 5 = goals 8, 12; degree 3 = goals 16, 19). Unmet strata are reported STRATUM-LIMITED. |
| **C** | 3000 ticks per configuration, for controlled comparability with the M7 scale. |
| **D** | Agent seed 20260819000, arm A1 — intentional reuse for comparability, not reuse of M7 measurement data. |
| **E** | `GOAL_MISMATCH` uses strict identity. `Number()` coercion is not substituted into the primary definition; raw numeric values are preserved so alternatives can be evaluated offline. |
| **F** | Null goal identity at the authoritative evaluation point is an explicit exclusion: counted, reported separately, excluded from eligible events, never reclassified as H1-H5. No new hypothesis is created. |
| **G** | Materiality threshold `MARGINAL(k) >= 0.10` over eligible DESYNC events. M8 is descriptive/mechanistic; no statistical test, null, or adaptive procedure is pre-registered. |
| **H** | Configuration-seed range **899500-899999**, 500 seeds, 2000 candidate configurations. Non-overlapping with 900000-900029 and 900030-900499, strictly below 900500. Sized from M7's documented yield of 0.0872 accepted configurations per seed with a factor-of-two margin; no seed was generated to determine it. |

### 3. Mechanism structure

H1 position-transition desynchronization · H2 replay / selection bypass · H3 multi-tick action
staleness · H4 goal-context mismatch · H5 composite. **H4 merges** the earlier goal-switch
concept and the surviving changed-goal branch of the retired H7; the null-goal framing is not
carried forward. Topology is a **stratifier**, not a hypothesis. **S-PAIR** is an observable
signature of H2 — deliberately not labelled `N1`, which `verify_G15.js` already uses. Mechanism
flags are independent, and the complete joint distribution is reported rather than forcing
exclusive attribution.

### 4. Boundary

M8 does not rescue, reinterpret, recompute, or modify M7, and does not claim that
desynchronization caused the G15 failure. The held-out block `>= 900500` remains untouched. No
M8 result is authorised to retroactively reinterpret M7.

### 5. Governance consequence

Changes to the M8 pre-registration arrive only as numbered errata that quote its text and bind
to its digest. Instrumentation, seed consumption, and execution are future milestones, each
requiring its own authorisation.

---

## D-002 — G16.4b: retired, not repaired

**Date:** 2026-08-28 · **Authority:** Director ruling of 2026-08-28, following independent
three-model review · **Status:** in force
**Scope:** frozen §13.4 G16.4 clause (b) only. Frozen artifact untouched —
`M7_PREREGISTRATION.md`, SHA-256
`2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9`.

### 1. Decision

Clause (b) of G16.4 — *"No other `render/` file modified"* — is **retired as an executable
runtime assertion** under [M7-ERR-10](cognitive-audit/M7_PREREGISTRATION_ERRATUM_10.md).
Disposition D5 was adopted; D1 (create 36 frozen references), D2 (select a Git commit range)
and D3 (reduce to a literal allowlist assertion) were rejected.

### 2. Why retirement rather than repair

The implementation measured filesystem edit chronology, not content divergence. It returned
three different answers over byte-identical content, and in the authoring tree it passed while
seven content-changed `render/` modules lay outside its measurement. Any substitute mechanism
would enlarge the population the gate quantifies over, which is a change to the measured
property rather than a repair of it.

### 3. Status of the historical PASS

The historical G16.4b PASS is **not** valid evidence for the claimed isolation property,
because its measurement was non-reproducible and did not reliably cover the full content-change
population. This is not a finding that unauthorised work occurred, nor that the isolation
property is false.

### 4. Constraint carried forward

No replacement gate is created. Any future isolation gate must be authorised in advance by a
separate ruling and must carry a mutation control in which modifying an unauthorised `render/`
module turns the gate **RED**.

---

## D-001 — M7 goal transport: authorised as a narrow integration bridge

**Date:** 2026-08-23 · **Authority:** Director ruling of 2026-08-23 · **Status:** in force
**Scope:** the M7 experiment only. Frozen artifact untouched — `M7_PREREGISTRATION.md`,
SHA-256 `2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9`.

### 1. Classification

The goal transport is a **narrow integration bridge, not new agent behavior.**
Goal state (`goalNeuronId`), its 54 readers, goal-directed decision behavior
(goal-namespaced Q keys), goal-directed reward behavior, and goal setters all
exist in the committed baseline `HEAD 7c8bdde`, predating M7. The bridge supplies
a value to that pre-existing mechanism and does nothing else.

### 2. Authority for the transported value

The value is `cfg.goal`, i.e. the **already-frozen** schedule `GOALS[configIndex mod 4]`
over `{8, 12, 16, 19}` (frozen §3.7). It is forwarded, never derived, defaulted, or
inferred at any point in the chain.

**No new scientific parameter, threshold, hypothesis, metric, or experimental
condition is introduced.**

### 3. Exact boundary

| Component | Responsibility |
|---|---|
| `experiments/m7/run.js` | forwards `cfg.goal` — sole experiment-level source |
| `experiments/phase1_0/_driver.js` (`boot`) | transports an **explicitly supplied** goal during bootstrap, before `main.js` is imported |
| `main.js` | installs that value into the pre-existing `goalNeuronId`, **after `loadBrain()` and before agent execution** |

### 4. Scope limitation

`globalThis.__M7_GOAL__` is a **one-purpose bootstrap transport for this frozen
experiment only.** It is **not** a general configuration bus, and **not** an
architectural pattern for carrying arbitrary runtime state. Any further use
requires its own ruling.

### 5. Isolation rule

**No goal is installed unless explicitly supplied by the M7 experiment path.**
The vestigial `goal = 16` default in `boot()` is deliberately not transported, so
every existing `boot({ seed })` caller remains behaviorally unchanged.

### 6. Verification basis (as reported, 2026-08-23)

- Boot-only installation consumed **zero RNG**: 641 cognitive / 3020 visual draws
  with no goal, with goal 8, and with goal 19 alike.
- Divergence appears **only after agent execution** — 641 = 641 at boot; 12984 vs
  14680 cognitive draws after 120 ticks, which is pre-existing goal-directed
  behavior being activated.
- **G1 M7-off parity GREEN** after the `main.js` edit: bit-identical across
  10 seeds × 1000 ticks, 0 mismatches, with the anti-vacuity control still firing.
- `verify_goal.js` 26/26; full regression 442 passed, 1 failed — the single
  failure being the pre-existing documented `verify_S3.js` S3.2 result recorded in
  ERR-01a §5, unchanged by this work.
- Independent review (Gemini) classified the seam as a narrow new integration
  bridge, consistent with §1.

### 7. Governance consequence

This decision authorises **the existing seam** as the lawful configuration-to-runtime
bridge for M7 goal installation.

It does **not** authorise any additional production behavior, any further bootstrap
channel, or any extension of `__M7_GOAL__` beyond the boundary in §3. It does not
modify the frozen pre-registration, does not supersede any clause, and is not an
erratum.
