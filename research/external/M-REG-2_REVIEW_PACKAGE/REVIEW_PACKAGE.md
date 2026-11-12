# MiniFlyWire M-REG-2: independent review package

**Registration of the MCF-1 candidate block. PROPOSAL ONLY: nothing has been applied, committed or pushed, and the user has not approved registration.**

Roles: Claude is the repository investigator and implementation engineer (author of this package). Gemini is the independent adversarial reviewer. ChatGPT is the Research Director. The user is the final authority.

All paths are repository-relative. `<REPO>` is a checkout whose HEAD is the commit named below; `<WORK>` is a scratch directory you choose.

---

## 0. What the reviewer is asked to do

Try to **break** this proposal. Do not be deferential. In particular:

1. Check that every number in section 3 can be reproduced from the artifacts and the committed code, not from this package's prose.
2. Check that the three proposed commits do what section 2 says and nothing else (section 5 gives every diff in full).
3. Check that no gate was weakened to make registration pass (section 5.1 and section 12).
4. Rule on the unresolved decisions in section 11. Section 11.2 holds a wording flag that blocks registration until it is settled.
5. Return, per proposed commit (C0, C1, C2): **PASS**, **PASS WITH REQUIRED FIXES (list them)** or **BLOCK (say why)**, and list every claim you could not verify.

Out of scope for this review: the preregistration text, `FROZEN`, the freeze record and pin, any official stage, any experiment execution, `typed.js`, H1-R, M33, Study 2.

---

## 1. Authority and current state (all FACT, re-verified when this package was built)

| item | value |
|---|---|
| repository HEAD | `a42e1d9323903ac7536be3231adca0021e713d94` (`feat(mcf1): authorize the candidate admission scan window (M-SCAN)`) |
| remote alignment | local `main` equals `origin/main` |
| tracked changes in the working tree | 0 |
| `SCAN_AUTHORIZATION` | `{ start: 1500000000, length: 4000 }` (one declaration, commit `a42e1d9`) |
| `FREEZE_RECORD_SHA256` | `null` |
| `FROZEN` (`experiments/mcf1/config.mjs`) | `false`; `officialAuthorisation()` refuses with "the design is not frozen: config FROZEN is false" |
| block data module | `export const TRAJECTORY_BLOCKS = Object.freeze([]);` (0 blocks) |
| production registry | 11 explicit records, 0 held-out ranges, 0 blocks; digest `7a6b280bfbe84c7f905a8be506643d419e79f20c54d7de1963570eb4b82685e7` |
| legacy registry | `experiments/registry/typed.js`, git blob `3958211bb753f5a0a14e4f4fb014edefa804308a`, untouched and byte-protected |
| registration approval | **none granted** |
| scan authorization | granted by the user for exactly the window above, as an admission scan only (commit `a42e1d9`); the scan was executed (admission only) |

---

## 2. What is proposed (three logically distinct commits)

None of these exists in the repository. They exist as patch files and as the diffs in section 5.

| commit | purpose | files | needs |
|---|---|---|---|
| **C0** lodge the evidence | put a byte-exact, tracked copy of the admitted list where the registry record says it is | adds `experiments/mcf1/scan_records/1500000000-4000/{admitted.json, admitted.json.sha256, .gitattributes}` (`.gitattributes` holds `* -text`) | decision D1 |
| **C1** verifier preparation | make the two verifiers that assert "the block module is empty" accept either the empty state or exactly the one registered block. Green at the current empty state; no data change | `experiments/registry/verify_blocks.js`, `experiments/mcf1/verify_scan.mjs` | decision D3 |
| **C2** register the block | the one block record, and the one registry README sentence that becomes false | `experiments/registry/trajectory_blocks.js`, `experiments/registry/README.md` | the user's explicit approval, decisions D2 and D7 |

Not proposed anywhere in this package: `FROZEN`, the freeze record, the pin, the preregistration text, any change to `config.mjs`, `lock.mjs`, `scan.mjs`, `typed.js` or `typed_v2.js`, any scan, any agent execution, any push.

Why C1 must precede C2: with the block registered, the `verify_scan.mjs` worlds copy the real block module and the scan stage correctly refuses a second MCF-1 block, so 8 of its 18 checks fail, and `verify_blocks.js` fails 2 checks and 1 mutant. This was measured (section 8). The same pattern was used for the scan authorization (`64142e7` made the verifiers state-aware before `a42e1d9` authorized the scan).

---

## 3. The evidence: saved scan artifacts

### 3.1 Availability and hashes

All four artifacts exist. They are **git-ignored** (`experiments/mcf1/data/.gitignore` is `*`), so they are not in any clone of HEAD. Nothing was regenerated or replaced; the bytes below are the bytes written by the scan.

| file (under `experiments/mcf1/data/scan/1500000000-4000/`) | bytes | SHA-256 | content |
|---|---|---|---|
| `admitted.json` | 51362 | `5d6b929265366bcb3dc339d96798ab64f2548a456f8de8062c78248a8d3ca1c7` | the admission result: ascending admitted list (3851), rejected seeds with reasons (149), summary with hashes |
| `admitted.json.sha256` | 65 | `8f597e1175c58acf64b5425ae54369574c016134cd118ce58e59abb5dcf7d3c4` | sidecar: the digest of `admitted.json` and a newline |
| `block/block_candidate.json` | 3145 | `24d8d89a6a888805e4c44ac81e148215373ff49cbf12c44418a2610a03075455` | scratch block artifact written by the validated writer (synthetic destination; free text differs from the proposed record) |
| `review/scan_review.json` | 19508 | `96c885cc219e97681221d8bc2b1259d971a53cff8f12be84b8ed2531084cfc98` | sanitized review summary: independent recomputation, block verification, process-spawn and file-read trap results |

Backup copies of the first three exist in the session scratch area and are byte-equal to the working copies. `scan_review.json` has no second copy. None of the four contains a local path, account name or e-mail address (checked by pattern scan).

### 3.2 Verified from bytes (independent script `inspect_artifacts`, not the harness)

| claim | result |
|---|---|
| `admitted.json` equals its `.sha256` sidecar | yes |
| window | `[1500000000, 1500004000)`, 4000 seeds |
| partition | 3851 admitted + 149 rejected = 4000; strictly ascending each; no overlap; all inside the window |
| list hash | SHA-256 of the decimal admitted seeds joined by `,` = `bef9096b87d46aee382f1920baba5a1fa086bdb98d9b1469d503ccbc7bc7a2a6` (recomputed; equals the recorded value and the value in every cross-reference) |
| admission result hash | `eaefcdd9342508b1dd017917e834662bdb106e7ffafc6ce8a0fe6888c2ee8355` (recomputed from the canonical summary) |
| rejection reasons | `R3_ENV_SLOTS` 24 and `H1R_RECORDS_AND_DOMAIN` 125 by first reason; seed 1500002935 carries both; 0 unclassified; 0 registry refusals |
| hull | `lo` 1500000000, `hi` 1500003999 (the window ends are admitted); all 149 rejected seeds are interior |
| scratch block artifact | embedded body hash `6d0eb418698985754e69542776b6ef62ba84f388989114a7fb8466f2871e5eaf` recomputes; file hash as in the table; members rebuilt from hull and exclusions equal the admitted list; `excluded` equals the saved rejected seeds |
| cross-references | admission window, counts, admitted hash, inventory hash and registry snapshot hash agree across the admission result and the block artifact |

### 3.3 How to recompute the list hash with no repository code

`python`, from the `lo`, `hi` and `excluded` values in the C2 diff (section 5.2):

    import hashlib
    lo, hi = 1500000000, 1500003999
    excluded = set([...the 149 integers from the diff...])
    members = [v for v in range(lo, hi + 1) if v not in excluded]
    assert len(members) == 3851
    print(hashlib.sha256(",".join(map(str, members)).encode()).hexdigest())
    # expect bef9096b87d46aee382f1920baba5a1fa086bdb98d9b1469d503ccbc7bc7a2a6

`tools/check_block_module.mjs` (Appendix A.1) does the same for a module file and also compares with `admitted.json` when given.

---

## 4. The proposed record, field by field

The record is built by the committed function `blockFromAdmission` (`experiments/mcf1/lock.mjs`) from the bytes of `admitted.json`, and rendered by the committed function `renderBlocksModule` (`experiments/mcf1/scan.mjs`). `tools/make_c2_module.mjs` (Appendix A.4) shows the exact steps. The module keeps the file's original header; only its STATE paragraph is reworded.

| field | proposed value | derived from | note |
|---|---|---|---|
| `schema` | `trajectory.block/1` | fixed by the registry | |
| `namespace` | `trajectory` | fixed | |
| `study` | `MCF-1` | `STUDY` constant | |
| `status` | `registered` | required by the lock (`block.status === 'registered'`) | |
| `lo`, `hi` | `1500000000`, `1500003999` | first and last admitted seed | equals the window |
| `excluded` | 149 seeds, ascending, all interior | every integer of `[lo, hi]` not admitted | equals the saved rejected seeds |
| `count` | `3851` | length of the admitted list | |
| `listSha256` | `bef9096b87d46aee382f1920baba5a1fa086bdb98d9b1469d503ccbc7bc7a2a6` | `listSha256Of(admitted)` | the lock requires it to equal the freeze record's `admittedSha256` |
| `executed` | `false` | required by the lock | the only field a later commit may flip, per the module header |
| `configuration` | `{ seed: 100000, index: 1, acceptedSeed: 100026 }` | `STUDY_CONFIGURATION` | the lock refuses the official stage if this differs from the approved configuration (`lock.mjs:232`) |
| `authorization` | see D2 | text | **flagged**, section 11.2 |
| `artifact` | see D2 | text | names the result hashes and the lodged path (needs C0) |
| `why` | see D2 | text | |

The three text fields as proposed (draft wording):

- `authorization` (451 characters): `MCF-1 candidate block: the admitted list of the candidate admission scan of [1500000000, 1500004000), which commit a42e1d9 authorized as an admission scan only. This record takes effect only through the commit that adds it; the approval for that commit is recorded in that commit and the decision it cites, not asserted by this field. The preregistration freeze, the freeze record, the pin and every official stage remain separate, unauthorized steps.`
- `artifact` (353 characters): `mcf1 admission result sha256 eaefcdd9342508b1dd017917e834662bdb106e7ffafc6ce8a0fe6888c2ee8355 (admitted-list sha256 bef9096b87d46aee382f1920baba5a1fa086bdb98d9b1469d503ccbc7bc7a2a6; reservation inventory sha256 be6a49e83b960acf09c06b88152cd33753aaab66d8264d8115fbfbee0b1da477); lodged evidence experiments/mcf1/scan_records/1500000000-4000/admitted.json`
- `why` (400 characters): `Candidate confirmatory block of study MCF-1: the strictly ascending raw agent seeds admitted by the deterministic pre-outcome admission predicate over the 4000-seed window starting at 1500000000 (3851 admitted; 149 rejected: R3_ENV_SLOTS 24, H1R_RECORDS_AND_DOMAIN 125, one seed carrying both reasons). Registered before Stage Q (registry record scope); no agent run and no outcome has been consumed.`

The **first proposal's** `authorization` (355 characters), kept only as the alternative `ALT` because it asserts an approval that does not exist yet: `User-authorized MCF-1 candidate block: the candidate admission scan of [1500000000, 1500004000) was authorized by commit a42e1d9; registration of its admitted list is authorized by the user and applied by the commit that adds this record. The preregistration freeze, the freeze record, the pin and every official stage remain separate, unauthorized steps.`. The two patches differ in exactly that line and in the resulting blob id on the `index` line.

---

## 5. The diffs in full (verbatim `git diff --full-index` against HEAD `a42e1d9`)

### 5.1 C1: verifier preparation (`patches/C1_verifier_prep.patch`)

What it changes and why:

- `verify_blocks.js`: `parity.production` no longer demands `blocks.length === 0`; it accepts empty or exactly the registered MCF-1 block's identity fields. `data.empty` becomes `data.state` (empty form unchanged; otherwise exactly the one block, count and hash recomputed). The `typed_v2.js` source mutants now load the empty block module, because a mutant that changes member reconstruction (`hull-off-by-one`) makes the production block fail its own count check at import and so "could not be built".
- `verify_scan.mjs`: each synthetic world starts from the empty block module (as it already starts from the null scan authorization), and the real-state check accepts an empty module or exactly one block.

```diff
diff --git a/experiments/mcf1/verify_scan.mjs b/experiments/mcf1/verify_scan.mjs
index 38389ca55584e18f73204999c08bfa0913945a75..5381c7a0168aaf50989c721098377fdf0f5d011a 100644
--- a/experiments/mcf1/verify_scan.mjs
+++ b/experiments/mcf1/verify_scan.mjs
@@ -56,6 +56,8 @@ function makeWorld(o = {}) {
   if (authorization !== null && /1_?500_?000_?000/.test(String(authorization))) throw new Error('verifier defect: the real candidate window must never be authorized, even in a copy');
   const root = path.join(ROOT, `w${++worldN}`);
   for (const rel of COPY_FILES) { const to = path.join(root, rel); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(path.join(REPO, rel), to); }
+  // a world always starts from the EMPTY block module too, whatever the real repository holds (it may hold the registered MCF-1 block)
+  fs.writeFileSync(path.join(root, 'experiments/registry/trajectory_blocks.js'), 'export const TRAJECTORY_BLOCKS = Object.freeze([]);\n');
   // a world always starts from the NULL authorization, whatever the real repository holds (it may be authorized)
   { const p = path.join(root, 'experiments/mcf1/authorization.mjs'); fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/export const SCAN_AUTHORIZATION = [^;]*;/, 'export const SCAN_AUTHORIZATION = null;')); }
   applyEdit(root, ['experiments/mcf1/config.mjs', '  start: 1_500_000_000,\n  scanLength: 4000,', `  start: ${SCAN.start},\n  scanLength: ${SCAN.length},`]);
@@ -502,12 +504,12 @@ const ONLY = process.env.SCAN_ONLY ? new RegExp(process.env.SCAN_ONLY) : null;
   const authorized = decl === approved;
   const state = {
     scanAuthorizationIsNullOrExactlyApproved: decl === 'null' || authorized, pinNull: /export const FREEZE_RECORD_SHA256 = null;/.test(auth), shape: LCK.pinModuleShapeOk(auth),
-    blocksEmpty: /export const TRAJECTORY_BLOCKS = Object.freeze\(\[\]\);/.test(blocksText), scanFilesAreDocumented: scanFiles.every(f => ALLOWED.test(f)),
+    blocksEmptyOrOneRegistered: /export const TRAJECTORY_BLOCKS = Object.freeze\(\[\]\);/.test(blocksText) || (await import(url(path.join(REPO, 'experiments/registry/trajectory_blocks.js')))).TRAJECTORY_BLOCKS.length === 1, scanFilesAreDocumented: scanFiles.every(f => ALLOWED.test(f)),
     noScanFilesBeforeAuthorization: authorized || scanFiles.length === 0,
     gateMatchesState: authorized ? same(LCK.scanAuthorisation(), { start: REAL_CANDIDATE.start, length: REAL_CANDIDATE.length }) : rx(/no scan authorization is set/, await refusal(() => LCK.scanAuthorisation())),
     candidateIsConfig: CFG.BLOCK.start === REAL_CANDIDATE.start && CFG.BLOCK.scanLength === REAL_CANDIDATE.length,
   };
-  check('SCAN-A', `the committed state: scan authorization ${authorized ? 'is exactly the approved candidate window' : 'is null'}, pin null, template intact, block module empty, scan outputs limited to the documented artifacts, candidate window unchanged in config`, Object.values(state).every(Boolean), JSON.stringify(state));
+  check('SCAN-A', `the committed state: scan authorization ${authorized ? 'is exactly the approved candidate window' : 'is null'}, pin null, template intact, block module empty or exactly one block, scan outputs limited to the documented artifacts, candidate window unchanged in config`, Object.values(state).every(Boolean), JSON.stringify(state));
 }
 
 {
diff --git a/experiments/registry/verify_blocks.js b/experiments/registry/verify_blocks.js
index d234ddbf72acfa09b447eba459ea79a040721b75..1327f76d35475acfeab759c7daa02986aab92b83 100644
--- a/experiments/registry/verify_blocks.js
+++ b/experiments/registry/verify_blocks.js
@@ -191,6 +191,9 @@ def('parity.records', 'D4', 'with explicit records only, every construction refu
   cmp('isConsumedByStudy empty study', emptyStudy(o.reg), emptyStudy(c.reg));
   return { ok: mism.length === 0 && cases > 0, cases, mism: mism.slice(0, 4), mismatchCount: mism.length };
 });
+// the committed state of the block data module: empty, or exactly the one registered MCF-1 block of the candidate window
+const REGISTERED_MCF1 = Object.freeze({ study: 'MCF-1', status: 'registered', executed: false, lo: 1500000000, hi: 1500003999, count: 3851, listSha256: 'bef9096b87d46aee382f1920baba5a1fa086bdb98d9b1469d503ccbc7bc7a2a6' });
+const blocksAreCommittedState = (blocks) => blocks.length === 0 || (blocks.length === 1 && Object.entries(REGISTERED_MCF1).every(([k, v]) => blocks[0][k] === v) && blocks[0].excluded.length === 149);
 def('parity.production', 'D4', 'the production registry equals the committed production registry on every value of every committed record, its neighbours and aliases, for every study, category, arm and configuration', (M) => {
   const acc = newAcc(); let cases = 0; const mism = [];
   const values = new Set([20260819000, 5, 0, 1, 900500, 1_700_000_000]);
@@ -204,7 +207,7 @@ def('parity.production', 'D4', 'the production registry equals the committed pro
   }
   const same = JSON.stringify(M.trajectory.records) === JSON.stringify(legacyTrajectory.records) && JSON.stringify(M.trajectory.heldOut) === JSON.stringify(legacyTrajectory.heldOut)
     && JSON.stringify(M.trajectory.authorizations) === JSON.stringify(legacyTrajectory.authorizations);
-  return { ok: mism.length === 0 && cases > 0 && same && M.trajectory.blocks.length === 0, cases, mism: mism.slice(0, 4), mismatchCount: mism.length, valuesProbed: values.size };
+  return { ok: mism.length === 0 && cases > 0 && same && blocksAreCommittedState(M.trajectory.blocks), cases, mism: mism.slice(0, 4), mismatchCount: mism.length, valuesProbed: values.size };
 });
 def('integrity.block', 'D5', 'every malformed, tampered or unsupported block is refused, while the untouched block builds', (M) => {
   const s = spec(120, { lo: LO + 600_000 });
@@ -267,10 +270,11 @@ def('digest', 'D6', 'the registry digest is stable, key-order independent, and c
   const reordered = (({ why, artifact, ...rest }) => ({ artifact, why, ...rest }))(blk(s));
   return d1 === d2 && /^[0-9a-f]{64}$/.test(d1) && mk(reordered).digest() === d1 && mk(blk(s2)).digest() !== d1 && mk(blk(s, { status: 'pilot' })).digest() !== d1 && mk(null).digest() !== d1;
 });
-def('data.empty', 'D7', 'the block data module is empty and holds no seed, hash or study', () => {
+def('data.state', 'D7', 'the block data module is empty (no seed, hash or study) or holds exactly the one registered MCF-1 block and nothing else', () => {
   const text = fs.readFileSync(path.join(HERE, 'trajectory_blocks.js'), 'utf8');
   const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
-  return REAL.TRAJECTORY_BLOCKS.length === 0 && REAL.trajectory.blocks.length === 0 && !/\d{6,}/.test(code) && !/listSha256|schema|configuration|study/.test(code) && /Object\.freeze\(\[\]\)/.test(code);
+  if (REAL.TRAJECTORY_BLOCKS.length === 0) return REAL.trajectory.blocks.length === 0 && !/\d{6,}/.test(code) && !/listSha256|schema|configuration|study/.test(code) && /Object\.freeze\(\[\]\)/.test(code);
+  return blocksAreCommittedState(REAL.TRAJECTORY_BLOCKS) && REAL.trajectory.blocks.length === 1 && REAL.listSha256Of(REAL.memberListOf(REAL.TRAJECTORY_BLOCKS[0])) === REGISTERED_MCF1.listSha256;
 });
 def('typed.identical', 'D7', 'typed.js is byte-identical to the baseline blob', () => {
   const pinned = '3958211bb753f5a0a14e4f4fb014edefa804308a';
@@ -329,7 +333,9 @@ console.log('\n== performance on a synthetic list of 3,852 members ==');
 console.log('\n== source mutants of typed_v2.js ==');
 const MUT_ROOT = fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()), 'reg-v2-mut-'));
 const SRC = fs.readFileSync(path.join(HERE, 'typed_v2.js'), 'utf8');
-const rewrite = (text) => text.replace(/(from\s+)'(\.\/[^']+)'/g, (m, a, spec2) => `${a}'${pathToFileURL(path.join(HERE, spec2)).href}'`);
+const EMPTY_BLOCKS = path.join(MUT_ROOT, 'trajectory_blocks.empty.js');
+fs.writeFileSync(EMPTY_BLOCKS, 'export const TRAJECTORY_BLOCKS = Object.freeze([]);\n');
+const rewrite = (text) => text.replace(/(from\s+)'(\.\/[^']+)'/g, (m, a, spec2) => `${a}'${pathToFileURL(spec2 === './trajectory_blocks.js' ? EMPTY_BLOCKS : path.join(HERE, spec2)).href}'`);
 async function loadMutant(id, edits) {
   let src = SRC;
   for (const [find, rep] of edits) {
```

### 5.2 C2: registration (`patches/C2_register_block.patch`, draft wording)

```diff
diff --git a/experiments/registry/README.md b/experiments/registry/README.md
index 18746d43865d264459cc26bbce64e1ddb651585e..57bd3dbce9f4d537f588bafc38a307ab820c306e 100644
--- a/experiments/registry/README.md
+++ b/experiments/registry/README.md
@@ -6,7 +6,7 @@ H1-R build identity, so it is never edited. Two things were added beside it.
 | file | role |
 |---|---|
 | `typed_v2.js` | re-exports `typed.js`, replaces `createTrajectoryRegistry` and `trajectory` with an **indexed**, **block-aware** implementation |
-| `trajectory_blocks.js` | block data. **Empty.** Nothing is registered, reserved or consumed |
+| `trajectory_blocks.js` | block data. **One block:** study MCF-1, the candidate window 1,500,000,000 + 4,000 (3,851 members, 149 excluded). Its members are consumed by MCF-1 and refused to every other study |
 | `import_isolation.js` | the static scanner and the gate policy |
 | `legacy_typed_importers.json` | the exact legacy exceptions to that policy (path and content hash) |
 | `verify_blocks.js` | differential battery against `typed.js` as oracle, structural tests, mutants, timing |
diff --git a/experiments/registry/trajectory_blocks.js b/experiments/registry/trajectory_blocks.js
index f24c2fc3c740ac9fed420d73499ed559891186d0..d385a8420d60ac02a1c84d855007c8da674f407e 100644
--- a/experiments/registry/trajectory_blocks.js
+++ b/experiments/registry/trajectory_blocks.js
@@ -9,9 +9,181 @@
 //   * blocks are NOT TRAJECTORY_RECORDS entries: the MCF-1 harness builds its reservation
 //     inventory from TRAJECTORY_RECORDS, so a study's own seeds must not appear there.
 //
-// STATE: EMPTY. No study has a block. Nothing is registered, reserved or consumed by this file.
+// STATE: ONE BLOCK. Study MCF-1 holds the block of the candidate window 1500000000 + 4000
+// (3851 members, 149 excluded seeds, listSha256 bef9096b87d46aee382f1920baba5a1fa086bdb98d9b1469d503ccbc7bc7a2a6).
 // A block is added only by a separately authorised commit that carries the admitted list's
 // SHA-256, the configuration identity and the authorization text, and that commit must keep
 // verify_blocks.js green.
 // ==========================================================
-export const TRAJECTORY_BLOCKS = Object.freeze([]);
+export const TRAJECTORY_BLOCKS = Object.freeze([
+  {
+    "schema": "trajectory.block/1",
+    "namespace": "trajectory",
+    "study": "MCF-1",
+    "status": "registered",
+    "lo": 1500000000,
+    "hi": 1500003999,
+    "excluded": [
+      1500000068,
+      1500000377,
+      1500000606,
+      1500000745,
+      1500000891,
+      1500001072,
+      1500001202,
+      1500001311,
+      1500001341,
+      1500001413,
+      1500001414,
+      1500001415,
+      1500001416,
+      1500001417,
+      1500001418,
+      1500001419,
+      1500001420,
+      1500001421,
+      1500001422,
+      1500001455,
+      1500001513,
+      1500001514,
+      1500001515,
+      1500001516,
+      1500001517,
+      1500001518,
+      1500001519,
+      1500001520,
+      1500001521,
+      1500001522,
+      1500001523,
+      1500001524,
+      1500001525,
+      1500001526,
+      1500001527,
+      1500001528,
+      1500001529,
+      1500001530,
+      1500001531,
+      1500001532,
+      1500001542,
+      1500001575,
+      1500001636,
+      1500002138,
+      1500002151,
+      1500002196,
+      1500002210,
+      1500002211,
+      1500002212,
+      1500002213,
+      1500002214,
+      1500002215,
+      1500002216,
+      1500002217,
+      1500002218,
+      1500002219,
+      1500002310,
+      1500002311,
+      1500002312,
+      1500002313,
+      1500002314,
+      1500002315,
+      1500002316,
+      1500002317,
+      1500002318,
+      1500002319,
+      1500002320,
+      1500002321,
+      1500002322,
+      1500002323,
+      1500002324,
+      1500002325,
+      1500002326,
+      1500002327,
+      1500002328,
+      1500002329,
+      1500002339,
+      1500002368,
+      1500002369,
+      1500002372,
+      1500002373,
+      1500002374,
+      1500002375,
+      1500002376,
+      1500002377,
+      1500002378,
+      1500002379,
+      1500002443,
+      1500002481,
+      1500002731,
+      1500002760,
+      1500002784,
+      1500002785,
+      1500002786,
+      1500002787,
+      1500002788,
+      1500002789,
+      1500002790,
+      1500002791,
+      1500002804,
+      1500002805,
+      1500002806,
+      1500002807,
+      1500002808,
+      1500002809,
+      1500002810,
+      1500002811,
+      1500002812,
+      1500002813,
+      1500002814,
+      1500002815,
+      1500002879,
+      1500002920,
+      1500002921,
+      1500002922,
+      1500002923,
+      1500002924,
+      1500002925,
+      1500002926,
+      1500002927,
+      1500002934,
+      1500002935,
+      1500003045,
+      1500003136,
+      1500003712,
+      1500003713,
+      1500003714,
+      1500003715,
+      1500003716,
+      1500003717,
+      1500003718,
+      1500003719,
+      1500003722,
+      1500003723,
+      1500003724,
+      1500003725,
+      1500003726,
+      1500003727,
+      1500003732,
+      1500003785,
+      1500003830,
+      1500003832,
+      1500003833,
+      1500003834,
+      1500003835,
+      1500003836,
+      1500003837,
+      1500003892,
+      1500003933
+    ],
+    "count": 3851,
+    "listSha256": "bef9096b87d46aee382f1920baba5a1fa086bdb98d9b1469d503ccbc7bc7a2a6",
+    "executed": false,
+    "authorization": "MCF-1 candidate block: the admitted list of the candidate admission scan of [1500000000, 1500004000), which commit a42e1d9 authorized as an admission scan only. This record takes effect only through the commit that adds it; the approval for that commit is recorded in that commit and the decision it cites, not asserted by this field. The preregistration freeze, the freeze record, the pin and every official stage remain separate, unauthorized steps.",
+    "artifact": "mcf1 admission result sha256 eaefcdd9342508b1dd017917e834662bdb106e7ffafc6ce8a0fe6888c2ee8355 (admitted-list sha256 bef9096b87d46aee382f1920baba5a1fa086bdb98d9b1469d503ccbc7bc7a2a6; reservation inventory sha256 be6a49e83b960acf09c06b88152cd33753aaab66d8264d8115fbfbee0b1da477); lodged evidence experiments/mcf1/scan_records/1500000000-4000/admitted.json",
+    "why": "Candidate confirmatory block of study MCF-1: the strictly ascending raw agent seeds admitted by the deterministic pre-outcome admission predicate over the 4000-seed window starting at 1500000000 (3851 admitted; 149 rejected: R3_ENV_SLOTS 24, H1R_RECORDS_AND_DOMAIN 125, one seed carrying both reasons). Registered before Stage Q (registry record scope); no agent run and no outcome has been consumed.",
+    "configuration": {
+      "seed": 100000,
+      "index": 1,
+      "acceptedSeed": 100026
+    }
+  }
+]);
```

### 5.3 C0: lodging commands (no patch file; the content is the artifact bytes)

    mkdir -p experiments/mcf1/scan_records/1500000000-4000
    cp <ARTIFACTS>/1500000000-4000/admitted.json experiments/mcf1/scan_records/1500000000-4000/
    cp <ARTIFACTS>/1500000000-4000/admitted.json.sha256 experiments/mcf1/scan_records/1500000000-4000/
    printf '* -text\n' > experiments/mcf1/scan_records/1500000000-4000/.gitattributes

`* -text` stops end-of-line conversion so the committed blob is byte-identical to the scan output on every platform (the same device the repository uses for its frozen artifacts). The sidecar holds the 64-hex digest and a newline (65 bytes).

---

## 6. Affected source files and tests, with their committed blob hashes at HEAD

`git blob` is `git rev-parse HEAD:<path>`; `sha256` is the SHA-256 of the blob bytes. "Touched by" names the proposed commit that changes the file; "unchanged" files are listed because the proposal's correctness depends on them.

| path | git blob (HEAD) | SHA-256 of blob | bytes | role | touched by |
|---|---|---|---|---|---|
| `experiments/registry/trajectory_blocks.js` | `f24c2fc3c740ac9fed420d73499ed559891186d0` | `cf226b025c74e98e20110453abc1d0ad34846e3b58f63188d37bfd6dbd7bba1d` | 1135 | block data module (empty at HEAD) | C2 |
| `experiments/registry/README.md` | `18746d43865d264459cc26bbce64e1ddb651585e` | `5b2c2307604ba3ea482e7e6835de2ef0a4a44d817e9a13396b787c6d1b67c170` | 4787 | registry document; the table row for the block module says "Empty." | C2 |
| `experiments/registry/verify_blocks.js` | `d234ddbf72acfa09b447eba459ea79a040721b75` | `7dd31cbfdadebed83e090201f220d358cb26f1f3f6f6be9952e0ceb38d9f7267` | 39135 | differential battery, structural tests and source mutants for the block-aware registry layer | C1 |
| `experiments/mcf1/verify_scan.mjs` | `38389ca55584e18f73204999c08bfa0913945a75` | `5c2645db029e62b71d4c53b4cb56cd3a02d679c9fb814f38ec6fffe2c7ecdca2` | 56394 | M-SCAN-1 authority, isolation and writer gates with source mutants | C1 |
| `experiments/registry/typed_v2.js` | `0391a297bd8cbaad6ee9384dfefbcfcf30b3f4c9` | `57cd7d153dfe918f3f2a00f16d1f9a3a7b2ea603f9fbde1c86c8cb410776fcc4` | 19820 | block-aware registry layer; its constructor validates every block | unchanged |
| `experiments/registry/typed.js` | `3958211bb753f5a0a14e4f4fb014edefa804308a` | `305812a3fec9200754b4ce0d1af005f91c15da89cd53748318abcf4f5ce7dcb2` | 23714 | legacy registry; byte-protected; bound by the H1-R build identity | unchanged |
| `experiments/registry/import_isolation.js` | `b59a5716bf2737a7565330e0ae4e4773ccb89f5a` | `615258171bb46a0c818c542800ad4eba3b8ceddbb9586ab4e0e451e9fda64370` | 16924 | import-isolation scanner and policy (gate R01) | unchanged |
| `experiments/registry/legacy_typed_importers.json` | `5a8732a2407cb9978acbfaf0ca15fa1a73ff11f4` | `5826e1fdd7d06bf2c3a4501349b6658886a48806b16f787c83fb8e9148773e41` | 6783 | exact legacy exceptions to that policy | unchanged |
| `experiments/registry/verify_import_isolation.js` | `35c11cf5363dd2a503ca3ad83df00fc7bf85b7bd` | `4bb472d0dc4ca976228127106186bad168952485df622bc743c03c27f7b0fc06` | 23366 | scanner tests and the gate over the real repository | unchanged |
| `experiments/registry/verify_registry.js` | `c70de09d77635536e286f88863b3158eb546bf89` | `fbe7926b83dcd3f858ee888ea6dc082eec7db507b1acc1247bddcf902fb3ce4a` | 1529 | runs both registry gates | unchanged |
| `experiments/mcf1/authorization.mjs` | `c5ce87ae220a7a3b799ce43f0000d5f86732656f` | `ff9d835543c1644a0610efb373eb066e7c64a9ff5a1b8f8d34b1159411244a50` | 2009 | the two data-only declarations: pin and scan authorization | unchanged |
| `experiments/mcf1/config.mjs` | `b8b700ab43bf334e4583f7199c628a495ddce322` | `f3a615342f2b2c7140b244087a70d203699cfea68c8caf2b9e0799ffc5daa424` | 13122 | study configuration, FROZEN, candidate window | unchanged |
| `experiments/mcf1/lock.mjs` | `89b136d510bbe8e007bfc2123262f0d6c4e398fb` | `954446aaecf00811e547bb55fc33282b24f6ef8483ea06e940e28dc941f27b9e` | 29240 | official lock; blockFromAdmission; source, verifier and registry digests | unchanged |
| `experiments/mcf1/scan.mjs` | `38eb71a8dd63f37caf0ad68b65fdab3cf2fd36f7` | `d4f9828eb5c936be11ccf1d40be39578c7edee504aca30735282a0cbb8073b5d` | 20927 | non-executing admission stage; renderBlocksModule; candidate-block writer | unchanged |
| `experiments/mcf1/orchestrate.mjs` | `d51f245eebccc75bf5233a895a92906dcd1e53e8` | `bc060f6ce4b67f9a2e4fed2c1645a30f1ebfa9d5916fb0bc259c11f2b49fc2a7` | 32711 | Stage Q registry preflight predicate (evaluateRegistryPreflight) | unchanged |
| `experiments/mcf1/inventory.mjs` | `8603c8b80cdc84070813a1507aed0d5ee81caffd` | `607047b3d0fb5551a7963537fd3e903a09e948526a62941d737ab49e7c018ec8` | 10738 | reservation inventory | unchanged |
| `experiments/mcf1/admission.mjs` | `81c499ff10225f0db2b88b1d93e972c2fa9ec92b` | `94cfb914f5dd93b7c2d4b84d1a5b09ef35b56b866e2187721fe6283fa6356aa5` | 5191 | deterministic admission predicate | unchanged |
| `experiments/mcf1/verify_mcf1.mjs` | `cd7c999c479789a06400245ed08dea60b77ad636` | `84464d3f73e570bc89dfe4957e320d04da21f6a428a1e463f75a08c9de8bb62d` | 82455 | harness gates G1 to G13 (G13: hygiene and scope) | unchanged |
| `experiments/mcf1/verify_r2.mjs` | `e5bbd119772b67d37a930e66e11e8695abf6bda0` | `ba3f45d86b0ad56cd33cc33c5d3131587e21dd2d3798632da13520c1b06f9d0c` | 101989 | lock, receipt chain and adversarial matrix gates | unchanged |
| `experiments/mcf1/README.md` | `77860fca187f6508467bcf0b8226896d640d6b29` | `73449f2e46067d19e32037521abecfe45eddc47ffc0148bb8a528cf074e40e98` | 18446 | harness document (statements that are stale or become false: D6) | unchanged (D6) |
| `experiments/m33/verify_r1.js` | `43384384d6ddcc89314c4f5a2cf7e5e46652fa15` | `2ff31d20a5d247cb923ebf5198829f805f7ee775c5062727a3096236217e94ee` | 30957 | typed-registry governance ruling verifier | unchanged |
| `experiments/h1r/build_identity.mjs` | `f99272df86b31c6554abc5fe81899d21aa465706` | `5926c5f735964c75bfafd013b9d1c9b75d6badbb75f66543861aa2f5634f3022` | 10183 | H1-R build identity derivation | unchanged |
| `experiments/h1r/BUILD_IDENTITY.json` | `e426854a1373f1e35e2f5dafaa20f5968dbcb0bf` | `4236eb886a55dbfcf33a88565ab127f752fa0bacdab48ac0d0ef51a2001a1fac` | 13285 | the committed H1-R build identity record | unchanged |
| `.gitattributes` | `e433367b96f606ddc87d014d5880fe7f69dea52e` | `8c30ffcb0a4773a6b0e6c72357292f7f5d412b3a61abf5767c48c39df7136ab0` | 11806 | root attributes (byte-protection of frozen artifacts) | unchanged |
| `experiments/mcf1/data/.gitignore` | `d6b7ef32c8478a48c3994dcadc86837f4371184d` | `240a3e0d37d2e86b614063f5347eb02d4f99ca6c254de6b82871ff8d95532a7d` | 14 | ignores everything in the data directory (`*`) | unchanged |

---

## 7. Reproduction in scratch clones of the exact HEAD

Nothing here touches `<REPO>`: it is cloned, never written. Use a `<WORK>` that is **outside the OS temporary directory** (a clone inside it makes `verify_scan.mjs` check `w.real_destination` fail: the clone root then counts as an allowed temporary destination) and that does not exist yet. The clone is made with `core.autocrlf=false core.eol=lf`; without that, a Windows checkout rewrites line endings and `typed.js` no longer hashes to its pinned blob.

One command runs everything (stages S0 to S3, all gates after each commit, an independent module check, and, with `NOART_PASS=1`, a final pass without the git-ignored artifacts):

    NOART_PASS=1 bash <PACKAGE>/tools/verify_in_scratch_clone.sh <REPO> <WORK> <PACKAGE> <REPO>/experiments/mcf1/data/scan

Manual equivalent for one patch:

    git -c core.autocrlf=false -c core.eol=lf clone --no-hardlinks <REPO> <WORK>/clone
    cd <WORK>/clone
    git checkout --detach a42e1d9323903ac7536be3231adca0021e713d94
    git config core.autocrlf false && git config core.eol lf
    git apply --check <PACKAGE>/patches/C1_verifier_prep.patch && git apply <PACKAGE>/patches/C1_verifier_prep.patch
    node experiments/registry/verify_registry.js        # exit 0 expected at the empty state
    git checkout -- . && git apply <PACKAGE>/patches/C2_register_block.patch
    node <PACKAGE>/tools/check_block_module.mjs experiments/registry/trajectory_blocks.js   # exit 0

Gates run after each commit (exit code 0 expected where the table in section 8 says so):

| gate | command |
|---|---|
| registry (R01 import isolation + differential battery + mutants) | `node experiments/registry/verify_registry.js` |
| scan authority, isolation, writer | `node experiments/mcf1/verify_scan.mjs` |
| harness gates (G1 to G13) | `node experiments/mcf1/verify_mcf1.mjs` |
| lock, receipts, adversarial matrix | `node experiments/mcf1/verify_r2.mjs` |
| typed-registry governance ruling (M33) | `node experiments/m33/verify_r1.js` |
| H1-R build identity | `node experiments/h1r/build_identity.mjs --check` |

Do **not** run `experiments/h1r/verify_readiness.mjs`: it rewrites tracked evidence.

---

## 8. Gate results (actual exit codes; run in a scratch clone outside the temp directory)

| gate | S0 exact HEAD | S1 + C0 | S2 + C1 | S3 + C2 | S3b = S3 without the git-ignored artifacts |
|---|---|---|---|---|---|
| `verify_registry.js` (R01 + import isolation + blocks) | exit 0: ALL PASSED; differential battery 16 pass / 0 fail, mutants 22 caught / 0 missed | exit 0: ALL PASSED; differential battery 16 pass / 0 fail, mutants 22 caught / 0 missed | exit 0: ALL PASSED; differential battery 16 pass / 0 fail, mutants 22 caught / 0 missed | exit 0: ALL PASSED; differential battery 16 pass / 0 fail, mutants 22 caught / 0 missed | n/a |
| `verify_scan.mjs` | exit 0: 18 pass / 0 fail; mutants 39 caught / 0 missed | exit 0: 18 pass / 0 fail; mutants 39 caught / 0 missed | exit 0: 18 pass / 0 fail; mutants 39 caught / 0 missed | exit 0: 18 pass / 0 fail; mutants 39 caught / 0 missed | exit 0: 18 pass / 0 fail; mutants 39 caught / 0 missed |
| `verify_mcf1.mjs` | exit 0: 121 pass / 0 fail; mutants 49 caught / 0 missed | exit 0: 121 pass / 0 fail; mutants 49 caught / 0 missed | exit 0: 121 pass / 0 fail; mutants 49 caught / 0 missed | exit 0: 121 pass / 0 fail; mutants 49 caught / 0 missed | exit 0: 121 pass / 0 fail; mutants 49 caught / 0 missed |
| `verify_r2.mjs` | exit 0: 39 pass / 0 fail; mutants 64 caught / 0 missed | exit 0: 39 pass / 0 fail; mutants 64 caught / 0 missed | exit 0: 39 pass / 0 fail; mutants 64 caught / 0 missed | exit 0: 39 pass / 0 fail; mutants 64 caught / 0 missed | n/a |
| `m33/verify_r1.js` | exit 0: 114/114 passed, 0 failed | exit 0: 114/114 passed, 0 failed | exit 0: 114/114 passed, 0 failed | exit 0: 114/114 passed, 0 failed | n/a |
| `build_identity.mjs --check` | exit 0: record equals a derivation from HEAD | exit 0: record equals a derivation from HEAD | exit 0: record equals a derivation from HEAD | exit 0: record equals a derivation from HEAD | n/a |

Reading the table: S0 is the exact HEAD. S1 adds C0. S2 adds C1. S3 adds C2 (draft wording). The stages are cumulative, in the order C0, C1, C2; C0 and C1 are independent of each other (C0 only adds files that no gate reads as input). `n/a` means the gate was not run at that stage. S3b removes only the git-ignored scan artifacts from the S3 clone, to show the registered state does not depend on them.

Independent module check at S3 (`tools/check_block_module.mjs`, which imports no repository code; exit 0 required): ok = true; oneBlock=true, exactFields=true, identity=true, hull=true, excludedAscendingInterior=true, countEqualsRebuilt=true, listHashEqualsRebuilt=true, configuration=true, textFieldsNonEmpty=true, membersEqualAdmittedList=true; members rebuilt 3851; list hash bef9096b87d46aee382f1920baba5a1fa086bdb98d9b1469d503ccbc7bc7a2a6

### 8.1 What breaks if C2 is applied WITHOUT C1 (measured earlier in this investigation, uncommitted state)

| gate | result without C1 |
|---|---|
| `verify_blocks.js` | exit 1: `parity.production` and `data.empty` fail; mutant `hull-off-by-one` "could not be built" (21 of 22 mutants caught) |
| `verify_scan.mjs` | exit 1: 8 failures caused by the registered block: the real-state check (`blocksEmpty`), five world-based checks that refused with "the registry already holds a MCF-1 block (one block per study)" (`b.trap`, `b.deterministic`, `w.valid`, `w.artifact`, `w.candidate_window`), and two writer checks (`w.destination`, `w.interrupt`) that failed in the same registered-block worlds and passed once worlds were emptied. With a clone inside the temp directory a ninth, `w.real_destination`, fails for the unrelated location reason above |
| `verify_mcf1.mjs` | exit 1 while uncommitted: two G13 scope guards that fail on any uncommitted diff outside `experiments/mcf1` (they pass once committed, as S3 shows) |
| `verify_r2.mjs`, `m33/verify_r1.js`, `verify_import_isolation.js`, `build_identity --check` | exit 0 |

---

## 9. Digest dependency table: which identities change, and why

Values are taken from `tools/identities.mjs` at each stage (Appendix A.2). `=` means unchanged from the stage to its left.

| identity | S0 HEAD | S1 + C0 | S2 + C1 | S3 + C2 | why |
|---|---|---|---|---|---|
| registry digest | `7a6b280bfbe84c7f905a8be506643d419e79f20c54d7de1963570eb4b82685e7` | = | = | `024dea2ac485d5fb4edc8160f03519e19e75ce6cb01a7dbfe480810ac9d8c362` | the block record (including its free text and `configuration`) is added at C2 |
| reservation inventory | `be6a49e83b960acf09c06b88152cd33753aaab66d8264d8115fbfbee0b1da477` | = | = | = | unchanged: the admission "others' view" excludes the study's own block |
| reservation registry snapshot | `d9e7572471be26c64e8f999504688f9227cbbcc8a0ed720c27ffd1d66c3979a0` | = | = | = | unchanged: same reason; equals the value recorded by the scan |
| configuration snapshot | `8bc788ccba504ea10a924f3a0a6a1f70ba192df9652f511f838ef41ab26e5645` | = | = | = | unchanged |
| declared source digest (33 files) | `3d17ba6db3dd52e930b07f2564d95e9c76be4b10ee82dcfe3f8336c5ceb846a8` | = | = | = | unchanged: the block module and `authorization.mjs` are excluded by design |
| verifier digest (8 files) | `0700a32d6207c8c0fd0a1326390a6577573fa88ce203b47cd0586372b38b564e` | = | `abb066effed304307498aa9c8c275db352cee1b6a2950d5f5ef2e6df666030c3` | = | moves at C1: `verify_scan.mjs` and `verify_blocks.js` are verifier files |
| study configuration | `35223ac17f9115a27512e8b277168bf6ce157e547e13b37816a5fbea692deac7` | = | = | = | unchanged |
| scan authorization | `{"start":1500000000,"length":4000}` | = | = | = | unchanged |
| `FROZEN` and official authorisation | `frozen=false`; refused: "MCF-1 official stage refused: the design is not frozen: config FROZEN is false" | = | = | = | unchanged: registration grants nothing |
| H1-R build identity | derived == committed at every stage (gate `build_identity --check`) | = | = | = | unchanged: the block module and the layer are not in its file list |
| legacy registry blob | `3958211bb753f5a0a14e4f4fb014edefa804308a` | = | = | = | never touched |

Why the inventory and the reservation snapshot do not move: the admission "others' view" excludes the study's own block (`trajectory_blocks.js` is data the inventory deliberately does not read as records). The admission result therefore has the same inputs before and after registration.

Why `sourcesSha256` does not move: `trajectory_blocks.js` and `authorization.mjs` are excluded from the declared source digest by design (`SOURCE_EXCLUSIONS`); the registry data is bound semantically by `registryDigestSha256`.

Why `verifierSha256` moves at C1 and not at C2: `verify_scan.mjs` and `verify_blocks.js` are in `VERIFIER_FILES`; the registry README and the block module are not.

The registry digest covers each block's free-text fields **and** its `configuration`. Two draft wordings were measured: the draft wording gives `024dea2ac485d5fb4edc8160f03519e19e75ce6cb01a7dbfe480810ac9d8c362`; the first proposal's wording gives `a7521e6a322d1b7abe09a37339f39cf5d6df3f99677f49374580c3c091ddcdb0` (the value reported earlier). The digest does not depend on file layout: the renderer layout used here reproduces the earlier value for the earlier wording.

Dependency order (acyclic): admitted list -> block record -> registry digest -> freeze record bindings (`registryDigestSha256`, `admittedSha256`, `inventorySha256`, `configSha256`, `sourcesSha256`, `verifierSha256`, `preregistrationSha256`, `tree`) -> pin (`FREEZE_RECORD_SHA256`). Nothing in that chain reads the pin or the freeze record, and the block record reads only the list and the study configuration.

---

## 10. Confirmation that the actual repository is unmodified

- HEAD is `a42e1d9323903ac7536be3231adca0021e713d94`; `origin/main` is `a42e1d9323903ac7536be3231adca0021e713d94` (equal).
- `git status --porcelain --untracked-files=no` lists 0 paths; `git diff HEAD --stat` is empty.
- The untracked entries are the 23 that existed before this investigation, unchanged (this package lives inside the already-untracked `research/external/`).
- No proposed change was applied to the repository: C0, C1 and C2 exist only as patch files in this package and as commits in scratch clones that live outside the repository and outside the temporary directory.
- The git-ignored scan artifacts were only read; their hashes in section 3.1 are the values computed when this package was built.
- `experiments/registry/trajectory_blocks.js` at HEAD is still `export const TRAJECTORY_BLOCKS = Object.freeze([]);`.

---

## 11. Unresolved decisions (separate from the evidence; each needs a ruling)

### 11.1 D1. Evidence location and tracking policy

Fact: the only copy of the admitted list is in a git-ignored directory; a clone of the repository does not contain it. The record's `artifact` text names `experiments/mcf1/scan_records/1500000000-4000/admitted.json`, which does not exist until C0.

| option | what is tracked | trade-off |
|---|---|---|
| A (proposed) | `admitted.json` (51,362 bytes), its sidecar, nested `.gitattributes` `* -text` | smallest set that makes the record's pointer true and lets anyone recompute the hash; the repository is public and the file holds only seeds and reason codes |
| B | A plus `block/block_candidate.json` (3,145 bytes) and `review/scan_review.json` (19,508 bytes) | adds the non-execution evidence (process-spawn and file-read traps) and the validated scratch artifact; the artifact's block record carries different free text than the registered one, which can confuse |
| C | nothing; reword `artifact` to name hashes only | the registered record then cites evidence a reviewer cannot obtain from the repository |

Ordering constraint: the record is append-only (module header: "a block is never edited"), so the pointer in `artifact` must be true at C2. C0 therefore precedes C2.

### 11.2 D2. Exact `authorization`, `artifact` and `why` wording, and the approval flag

Constraints: the three fields must be non-empty strings (the only validation); they are inside the registry digest; they cannot be edited after registration. The digest values in section 9 are therefore **provisional until the wording is final**.

**FLAG: the `authorization` wording must not claim an approval that has not been given.** The first proposal's text said registration "is authorized by the user". At the time of this package no registration approval exists. The draft in section 4 states only facts that are true before and after the approval: that commit `a42e1d9` authorized the scan, that the record takes effect only through the commit that adds it, and that the approval is recorded in that commit and the decision it cites. It does not say the user approved registration.

Options for the final text:

| option | text shape | caveat |
|---|---|---|
| W1 (in the patch) | the draft above | true now; weaker as a self-contained authorization record |
| W2 | W1 plus one sentence naming the user's decision, written only **after** the user grants it | the sentence cannot be drafted truthfully today; it must be added in the final commit and the digest recomputed |
| W3 | the first proposal's text | **asserts a not-yet-given approval; do not use unless the user has granted it before C2** |

### 11.3 D3. Verifier checks: pin the exact candidate block or enforce structural invariants?

| option | what the verifier asserts | trade-off |
|---|---|---|
| P1 (implemented in C1) | `verify_blocks.js` pins `study, status, executed, lo, hi, count, listSha256` and `excluded.length`; `verify_scan.mjs` asserts only "empty or exactly one block" | catches silent substitution of a different list with the same shape; duplicates four identity facts; any future re-registration needs a deliberate verifier edit, which moves `verifierSha256` |
| P2 | structure only: at most one MCF-1 block; schema, `registered`, `executed:false`; hull equals the configured window; configuration equals `STUDY_CONFIGURATION`; no literal list hash | no duplication; cannot see substitution of another admitted list (that is then caught only at freeze time by `admittedSha256`) |
| P3 | P1 plus the 149 excluded seeds as a literal | strongest drift detection; large duplicated data; no information beyond the hash |

Note a circularity to examine: a pin written in the same commit that introduces the data is a self-fulfilling check unless the pin is derived from independent evidence (the lodged `admitted.json`, C0).

### 11.4 D4. Commit order and the gates after each commit

Proposed: **C0 -> C1 -> C2**, each as its own commit, the full gate set after each (section 8), no push until the user says so. C1 is green at the empty state and could precede C0; C0 and C1 are independent. C2 is last because it needs both C0 (pointer) and C1 (gates), and the user's approval (D2/W2). Alternatives: C0 and C1 squashed (loses logical separation); C1 only now and C0/C2 together after approval (the lodging then waits on the approval it does not need).

### 11.5 D5. Layout of the module

C2 uses the committed renderer's output (`JSON.stringify(blocks, null, 2)`, one excluded seed per line, +149 lines) with the original header, so the module's data is regenerable by committed code. An earlier hand-wrapped layout (8 seeds per line) evaluates identically but cannot be regenerated by committed code. Both give the same registry digest.

### 11.6 D6. Documentation that becomes false

C2 changes the one registry README sentence that says the block data is empty. `experiments/mcf1/README.md` has statements that are already stale or will become false (line 30 says the candidate block is "not authorised" for any scan; the paragraph at lines 203 to 207 says registration "remains a separate, unauthorized step"). Neither README is in the declared source digest or the verifier digest, so editing them moves no identity. Decide whether to correct them in C2 or in a separate documentation commit.

### 11.7 D7. Timing: register now, or after the study configuration is final?

The record carries `configuration { seed, index, acceptedSeed }`, and the lock refuses the official stage if it differs from the approved study configuration (`lock.mjs:232`). The configuration is currently "adopted from development" and a re-derivation milestone (M-CFG-1) is deferred. Registering also reserves 3,851 seeds against every other study (members decide `CONSUMED_BY_OTHER_STUDY` for them) and the record cannot be withdrawn. If the configuration changes after registration, a new block over a new window would be needed. Registration before the configuration and preregistration text are final is therefore a choice with a cost, not a neutral step.

---

## 12. Specific falsification targets

1. Circularity: can registration change the admission's inputs, so that re-running the scan would give a different list? (Section 9 says no; the scan itself was not re-run.)
2. Weakened gates: does C1 let any registered state pass that should fail? (World normalization to the empty module; `blocksEmptyOrOneRegistered` checks only a count in `verify_scan.mjs`.) The source-mutant counts in section 8 are the evidence offered.
3. Does the one-block-per-study guard in `scan.mjs` (the writer refuses once the registry holds an MCF-1 block) leave any path to produce a second block? Does it also prevent a reviewer from re-creating the candidate artifact after registration (see UNKNOWN)?
4. Is the provenance chain complete: saved bytes -> committed builder -> committed renderer -> module -> hash? Which link is not a committed function?
5. Is `executed:false` plus `status:registered` sufficient to prevent any use of the block by another study or stage before the freeze? (Members decide REPRODUCTION for MCF-1 and `CONSUMED_BY_OTHER_STUDY` for any other study; `officialAuthorisation()` still refuses on `FROZEN`.)
6. Does the append-only rule make the text fields a one-way door that D2 has not priced in?

---

## 13. FACT, INFERENCE, RECOMMENDATION, UNKNOWN

### FACT (each was measured in this investigation)

- HEAD, remote, `FROZEN`, pin, scan authorization, the empty block module and the byte-protected `typed.js` are as in section 1.
- The four saved artifacts exist and verify from bytes as in section 3.
- The proposed module evaluates to exactly the record built by `blockFromAdmission` from `admitted.json`; its members equal the admitted list; its list hash is `bef9096b…`.
- With C2 applied, all 3851 members decide `REPRODUCTION` for MCF-1 and `CONSUMED_BY_OTHER_STUDY` for another study; all 149 excluded seeds and the seeds just outside the window decide `AVAILABLE`; the Stage-Q registry preflight predicate returns ok with the block and not-ok without it; its negative controls (a list with an excluded seed, a shorter list) are refused.
- The identity table in section 9 was measured at each stage; the H1-R build identity derived from the index equals the committed record byte for byte with C2 staged.
- Section 8 holds the actual exit codes.
- The official repository has no tracked change; this package adds only untracked files under `research/external/`.

### INFERENCE

- The admission result would be identical after registration, because both of its inputs (inventory and reservation snapshot) are measured identical. It was not recomputed (rescanning was out of scope).
- The nine failures without C1 share one cause (emptiness assumptions in the verifiers); C1 turns every one green, which supports but does not separately isolate each cell.
- Pinning (P1) is stronger drift detection than structure (P2) and weaker than the freeze-time bindings.

### RECOMMENDATION

1. Treat the proposal as ready for independent review, not for application.
2. Rule D2 before anything else: use W1 or W2; never W3 before the approval exists.
3. Order C0 -> C1 -> C2, each its own commit, full gates after each, no push without the user.
4. Lodge option A (D1) unless the reviewer wants B for the non-execution trace.
5. Keep P1 for `verify_blocks.js`; consider tightening `verify_scan.mjs`'s real-state check to the same identity fields.
6. Decide D7 explicitly before C2, because C2 is irreversible by policy.

### UNKNOWN

- The final wording of the three text fields (D2) and therefore the final registry digest.
- Whether the user approves registration, and when.
- Whether the admission can be recomputed through the committed scan CLI after registration: the candidate-artifact writer refuses by design once an MCF-1 block exists; the pure admission stage was not run in that state.
- Whether the study configuration will change before the freeze (D7).
- Whether option A, B or C is wanted for the evidence (D1).
- Behavior of `git apply` on a Windows checkout with `core.autocrlf=true` in the working tree (not tested; the scratch clones use LF).

---

## 14. Single highest-value next action

After this review, the user rules on **D7** (register now or after the study configuration and preregistration text are final) and **D2** (final wording, with the approval stated only if and when it exists). They are the only decisions that change the data or the digest. Everything else (C0, C1, order, layout, documentation) follows mechanically and does not alter the record.

---

## Appendix A. Tool sources (all read-only with respect to `<REPO>`)

### A.1 `tools/check_block_module.mjs`

```js
// M-REG-2 review package: independent check of a block data module, with no repository code involved.
// It evaluates the module, rebuilds the member list from the hull and the exclusions, hashes it the way the registry does
// (SHA-256 of the decimal members joined by ",") and compares every claim.  Exit 0 only if all hold.
// usage: node check_block_module.mjs <module.js> [<admitted.json>]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const [MODULE, ADMITTED] = process.argv.slice(2);
const PINNED = { lo: 1500000000, hi: 1500003999, count: 3851, excluded: 149, listSha256: 'bef9096b87d46aee382f1920baba5a1fa086bdb98d9b1469d503ccbc7bc7a2a6', study: 'MCF-1', configuration: { seed: 100000, index: 1, acceptedSeed: 100026 } };
const mod = await import(pathToFileURL(path.resolve(MODULE)).href);
const blocks = mod.TRAJECTORY_BLOCKS;
const b = blocks[0];
const skip = new Set(b.excluded), members = [];
for (let v = b.lo; v <= b.hi; v++) if (!skip.has(v)) members.push(v);
const sha = crypto.createHash('sha256').update(members.join(',')).digest('hex');
const asc = (a) => a.every((v, i) => i === 0 || v > a[i - 1]);
const keys = Object.keys(b).sort().join(',');
const checks = {
  oneBlock: blocks.length === 1,
  exactFields: keys === 'artifact,authorization,configuration,count,excluded,executed,hi,listSha256,lo,namespace,schema,status,study,why',
  identity: b.study === PINNED.study && b.status === 'registered' && b.executed === false && b.schema === 'trajectory.block/1' && b.namespace === 'trajectory',
  hull: b.lo === PINNED.lo && b.hi === PINNED.hi,
  excludedAscendingInterior: asc(b.excluded) && b.excluded.every(v => v > b.lo && v < b.hi) && b.excluded.length === PINNED.excluded,
  countEqualsRebuilt: b.count === members.length && members.length === PINNED.count,
  listHashEqualsRebuilt: sha === b.listSha256 && sha === PINNED.listSha256,
  configuration: JSON.stringify(b.configuration) === JSON.stringify(PINNED.configuration),
  textFieldsNonEmpty: ['authorization', 'artifact', 'why'].every(k => typeof b[k] === 'string' && b[k].trim() !== ''),
};
if (ADMITTED) {
  const a = JSON.parse(fs.readFileSync(ADMITTED, 'utf8')).admitted;
  checks.membersEqualAdmittedList = a.length === members.length && a.every((v, i) => v === members[i]);
}
const ok = Object.values(checks).every(Boolean);
console.log(JSON.stringify({ ok, checks, members: members.length, listSha256: sha }, null, 1));
process.exit(ok ? 0 : 1);
```

### A.2 `tools/identities.mjs`

```js
// M-REG-2 review package: print the identities a registration would move, for the repository checkout at <root>.
// Read-only.  usage: node identities.mjs <root>
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(process.argv[2] || '.');
const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const L = await imp('experiments/mcf1/lock.mjs');
const C = await imp('experiments/mcf1/config.mjs');
const I = await imp('experiments/mcf1/inventory.mjs');
const inv = I.buildInventory();
const live = L.liveBindings();
let official;
try { L.officialAuthorisation(); official = 'AUTHORISED'; } catch (e) { official = String(e.message); }
console.log(JSON.stringify({
  registryDigestSha256: live.registryDigestSha256,
  inventorySha256: inv.sha256,
  reservationRegistrySha256: inv.descriptor.registry.sha256,
  configSha256: C.hashObject(C.configSnapshot()),
  sourcesSha256: L.sourcesDigest().sha256,
  verifierSha256: L.verifierDigest().sha256,
  studyConfigurationSha256: C.hashObject(C.STUDY_CONFIGURATION),
  scanAuthorization: L.scanAuthorisation(),
  frozen: C.FROZEN,
  officialAuthorisation: official,
}, null, 1));
```

### A.3 `tools/verify_in_scratch_clone.sh`

```sh
#!/usr/bin/env bash
# M-REG-2 review package: reproduce the proposed commit sequence in a SCRATCH CLONE of the exact current HEAD and run the
# gates after every commit.  Nothing in <repo> is modified: the clone is made with git clone, and the git-ignored scan
# artifacts are only copied from.
#
# usage: verify_in_scratch_clone.sh <repo> <work> <package> [<scan-artifacts-dir>]
#   <repo>     the checkout whose HEAD is cloned (read only); its HEAD must be the pinned commit below
#   <work>     a path that does not exist yet, OUTSIDE the OS temporary directory and outside <repo>
#              (a clone inside the temporary directory makes verify_scan's w.real_destination check fail)
#   <package>  this package's directory (holds patches/ and the helper scripts)
#   <scan-artifacts-dir>  optional: <repo>/experiments/mcf1/data/scan (copied into the clone's git-ignored data directory;
#              also enables stage S1, the evidence-lodging commit)
# environment: NOART_PASS=1 adds a final pass of verify_scan and verify_mcf1 with the artifacts removed from the clone.
set -u
EXPECT_HEAD=a42e1d9323903ac7536be3231adca0021e713d94
if [ $# -lt 3 ]; then echo "usage: $0 <repo> <work> <package> [<scan-artifacts-dir>]"; exit 2; fi
REPO=$(cd "$1" && pwd); WORK=$2; PKG=$(cd "$3" && pwd); ART=${4:-}
[ -e "$WORK" ] && { echo "refused: $WORK already exists"; exit 2; }
mkdir -p "$WORK" || exit 2
WORK=$(cd "$WORK" && pwd)
node -e "const p=require('path'),o=require('os'),f=require('fs');const w=f.realpathSync(process.argv[1]).toLowerCase(),t=f.realpathSync(o.tmpdir()).toLowerCase();process.exit(w===t||w.startsWith(t+p.sep)?1:0)" "$WORK" \
  || { echo "refused: <work> is inside the OS temporary directory"; exit 2; }
CLONE="$WORK/clone"; LOGS="$WORK/logs"; mkdir -p "$LOGS"

echo "== clone of the exact HEAD =="
git -c core.autocrlf=false -c core.eol=lf clone -q --no-hardlinks "$REPO" "$CLONE" || exit 2
cd "$CLONE" || exit 2
git checkout -q --detach "$EXPECT_HEAD" || { echo "the repository does not contain $EXPECT_HEAD"; exit 2; }
git config core.autocrlf false; git config core.eol lf
git config user.name scratch; git config user.email scratch@example.invalid
[ "$(git rev-parse HEAD)" = "$EXPECT_HEAD" ] || exit 2
BAD=$(git ls-files --eol | awk '$1=="i/lf" && $2=="w/crlf"' | wc -l)
echo "HEAD $(git rev-parse HEAD); tracked files $(git ls-files | wc -l); working-tree line endings differing from the blobs: $BAD"
[ "$BAD" = "0" ] || { echo "refused: the clone is not byte-faithful"; exit 2; }
if [ -n "$ART" ]; then mkdir -p experiments/mcf1/data && cp -r "$ART" experiments/mcf1/data/scan; fi

summarize() {   # <label> <name> <regex>
  printf '%-4s %-14s exit %-2s  %s\n' "$1" "$2" "$(cat "$LOGS/$1_$2.rc")" "$(grep -h -E "$3" "$LOGS/$1_$2.log" | tail -1 | sed 's/^ *//' | cut -c1-150)"
}
run_gates() {   # <label>
  local label=$1
  ( node experiments/registry/verify_registry.js > "$LOGS/${label}_registry.log" 2>&1; echo $? > "$LOGS/${label}_registry.rc" ) &
  ( node experiments/mcf1/verify_scan.mjs        > "$LOGS/${label}_scan.log" 2>&1;     echo $? > "$LOGS/${label}_scan.rc" ) &
  ( node experiments/mcf1/verify_mcf1.mjs        > "$LOGS/${label}_mcf1.log" 2>&1;     echo $? > "$LOGS/${label}_mcf1.rc" ) &
  ( node experiments/mcf1/verify_r2.mjs          > "$LOGS/${label}_r2.log" 2>&1;       echo $? > "$LOGS/${label}_r2.rc" ) &
  ( node experiments/m33/verify_r1.js            > "$LOGS/${label}_m33.log" 2>&1;      echo $? > "$LOGS/${label}_m33.rc" ) &
  ( node experiments/h1r/build_identity.mjs --check > "$LOGS/${label}_buildidentity.log" 2>&1; echo $? > "$LOGS/${label}_buildidentity.rc" ) &
  wait
  node "$PKG/tools/identities.mjs" "$CLONE" > "$LOGS/${label}_identities.json" 2>&1
  summarize "$label" registry 'REGISTRY GATES'
  summarize "$label" scan '^RESULT'
  summarize "$label" mcf1 '^RESULT'
  summarize "$label" r2 '^RESULT'
  summarize "$label" m33 'VERIFY:'
  summarize "$label" buildidentity 'BUILD_IDENTITY'
}
apply_commit() {   # <patch> <message>
  git apply --check "$1" || { echo "the patch does not apply: $1"; exit 2; }
  git apply "$1" && git add -A -- experiments && git commit -q -m "$2" || exit 2
  echo "commit $(git rev-parse --short HEAD): $2"; git show --stat --format= HEAD | tail -4
}

echo; echo "== S0: exact HEAD, nothing applied =="
run_gates S0

if [ -n "$ART" ]; then
  echo; echo "== S1: C0, lodge the evidence (admitted.json and its digest, byte-exact) =="
  D=experiments/mcf1/scan_records/1500000000-4000
  mkdir -p "$D"
  cp "$ART/1500000000-4000/admitted.json" "$ART/1500000000-4000/admitted.json.sha256" "$D/"
  printf '* -text\n' > "$D/.gitattributes"
  [ "$(sha256sum "$D/admitted.json" | cut -d' ' -f1)" = "$(tr -d '\r\n' < "$D/admitted.json.sha256")" ] || { echo "the lodged digest does not match"; exit 2; }
  git add -A -- experiments && git commit -q -m "scratch C0: lodge the candidate admission evidence" || exit 2
  echo "commit $(git rev-parse --short HEAD); lodged: $(git ls-files "$D" | tr '\n' ' ')"
  run_gates S1
fi

echo; echo "== S2: C1, verifier preparation (state-aware assertions; the block module is still empty) =="
apply_commit "$PKG/patches/C1_verifier_prep.patch" "scratch C1: make the block assertions state-aware"
run_gates S2

echo; echo "== S3: C2, register the block (draft wording) =="
apply_commit "$PKG/patches/C2_register_block.patch" "scratch C2: register the MCF-1 candidate block"
run_gates S3
echo; echo "-- independent module check (no repository code involved)"
if [ -n "$ART" ]; then node "$PKG/tools/check_block_module.mjs" experiments/registry/trajectory_blocks.js "$ART/1500000000-4000/admitted.json" | tr -d '\n ' ; echo
else node "$PKG/tools/check_block_module.mjs" experiments/registry/trajectory_blocks.js | tr -d '\n ' ; echo; fi

if [ "${NOART_PASS:-0}" = "1" ] && [ -d experiments/mcf1/data/scan ]; then
  echo; echo "== S3b: the same state with the git-ignored scan artifacts removed =="
  mv experiments/mcf1/data/scan "$WORK/scan_aside"
  ( node experiments/mcf1/verify_scan.mjs > "$LOGS/S3b_scan.log" 2>&1; echo $? > "$LOGS/S3b_scan.rc" ) &
  ( node experiments/mcf1/verify_mcf1.mjs > "$LOGS/S3b_mcf1.log" 2>&1; echo $? > "$LOGS/S3b_mcf1.rc" ) &
  wait
  summarize S3b scan '^RESULT'; summarize S3b mcf1 '^RESULT'
  mv "$WORK/scan_aside" experiments/mcf1/data/scan
fi

echo; echo "== identities per stage =="
for f in "$LOGS"/S*_identities.json; do echo "-- $(basename "$f")"; tr -d '\n ' < "$f"; echo; done
echo; echo "clone: $CLONE   logs: $LOGS"
echo "official repository untouched: $(cd "$REPO" && git status --porcelain --untracked-files=no | wc -l) tracked changes"
```

### A.4 `tools/make_c2_module.mjs` (how the C2 module and the README line are produced)

```js
// M-REG-2 package: write the proposed C2 file contents (scratch).  Reads the saved admission bytes, builds the record with
// the committed builder, renders it with the committed renderer, and writes two module variants and the README edit.
// usage: node make_c2_files.mjs <cloneAtHead> <admitted.json> <outDir>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const [CLONE, ADMITTED, OUT] = process.argv.slice(2);
const U = (rel) => pathToFileURL(path.join(CLONE, rel)).href;
const L = await import(U('experiments/mcf1/lock.mjs'));
const S = await import(U('experiments/mcf1/scan.mjs'));
const adm = JSON.parse(fs.readFileSync(ADMITTED, 'utf8'));
const RESULT = adm.sha256, LIST = adm.summary.admittedSha256, INV = adm.summary.inventorySha256;

const TEXT = {
  // the wording of the first proposal (it asserts an approval that has not been given): kept only as the ALTERNATIVE
  authorizationOriginal: 'User-authorized MCF-1 candidate block: the candidate admission scan of [1500000000, 1500004000) was authorized by commit a42e1d9; registration of its admitted list is authorized by the user and applied by the commit that adds this record. The preregistration freeze, the freeze record, the pin and every official stage remain separate, unauthorized steps.',
  // the draft wording: states only what is true before the approval exists
  authorizationDraft: 'MCF-1 candidate block: the admitted list of the candidate admission scan of [1500000000, 1500004000), which commit a42e1d9 authorized as an admission scan only. This record takes effect only through the commit that adds it; the approval for that commit is recorded in that commit and the decision it cites, not asserted by this field. The preregistration freeze, the freeze record, the pin and every official stage remain separate, unauthorized steps.',
  artifact: `mcf1 admission result sha256 ${RESULT} (admitted-list sha256 ${LIST}; reservation inventory sha256 ${INV}); lodged evidence experiments/mcf1/scan_records/1500000000-4000/admitted.json`,
  why: 'Candidate confirmatory block of study MCF-1: the strictly ascending raw agent seeds admitted by the deterministic pre-outcome admission predicate over the 4000-seed window starting at 1500000000 (3851 admitted; 149 rejected: R3_ENV_SLOTS 24, H1R_RECORDS_AND_DOMAIN 125, one seed carrying both reasons). Registered before Stage Q (registry record scope); no agent run and no outcome has been consumed.',
};

const original = fs.readFileSync(path.join(CLONE, 'experiments/registry/trajectory_blocks.js'), 'utf8');
if (original.includes('\r')) throw new Error('the clone must be LF');
const stateOld = "// STATE: EMPTY. No study has a block. Nothing is registered, reserved or consumed by this file.\n// A block is added only by a separately authorised commit that carries the admitted list's\n// SHA-256, the configuration identity and the authorization text, and that commit must keep\n// verify_blocks.js green.\n";
const stateNew = `// STATE: ONE BLOCK. Study MCF-1 holds the block of the candidate window 1500000000 + 4000\n// (3851 members, 149 excluded seeds, listSha256 ${LIST}).\n// A block is added only by a separately authorised commit that carries the admitted list's\n// SHA-256, the configuration identity and the authorization text, and that commit must keep\n// verify_blocks.js green.\n`;
const exportOld = 'export const TRAJECTORY_BLOCKS = Object.freeze([]);\n';
for (const [a, n] of [[stateOld, 'state paragraph'], [exportOld, 'export line']]) if (original.split(a).length !== 2) throw new Error(`anchor ${n}`);

const build = (authorization) => {
  const block = L.blockFromAdmission({ admitted: adm.admitted, artifact: TEXT.artifact, authorization, why: TEXT.why });
  const text = original.replace(stateOld, stateNew).replace(exportOld, S.renderBlocksModule([block]));
  return { block, text };
};
const draft = build(TEXT.authorizationDraft), alt = build(TEXT.authorizationOriginal);
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'trajectory_blocks.draft.js'), draft.text);
fs.writeFileSync(path.join(OUT, 'trajectory_blocks.alt.js'), alt.text);

// README line 9 of the registry document: the one sentence this change makes false
const readme = fs.readFileSync(path.join(CLONE, 'experiments/registry/README.md'), 'utf8');
const rOld = '| `trajectory_blocks.js` | block data. **Empty.** Nothing is registered, reserved or consumed |';
const rNew = '| `trajectory_blocks.js` | block data. **One block:** study MCF-1, the candidate window 1,500,000,000 + 4,000 (3,851 members, 149 excluded). Its members are consumed by MCF-1 and refused to every other study |';
if (readme.split(rOld).length !== 2) throw new Error('README anchor');
fs.writeFileSync(path.join(OUT, 'README.registry.md'), readme.replace(rOld, rNew));

const H = (s) => crypto.createHash('sha256').update(s).digest('hex');
console.log(JSON.stringify({
  draftFileSha256: H(draft.text), altFileSha256: H(alt.text), draftBytes: Buffer.byteLength(draft.text), altBytes: Buffer.byteLength(alt.text),
  blockCount: draft.block.count, excluded: draft.block.excluded.length, listSha256: draft.block.listSha256,
  authorizationDraftLength: TEXT.authorizationDraft.length, authorizationOriginalLength: TEXT.authorizationOriginal.length, artifactLength: TEXT.artifact.length, whyLength: TEXT.why.length,
}, null, 1));
```

## Appendix B. Package file list and hashes

| file | bytes | SHA-256 |
|---|---|---|
| `patches/ALT_C2_original_wording.patch` | 6734 | `96ad69b94a15d00b735ae3d0d87efc2e06cfabbf74de2f297dfa8f5a0dbcd787` |
| `patches/C1_verifier_prep.patch` | 8259 | `4f7ef6fafc78c9ff55747d529bd98e6b95b47945c2b810b648c2ea1d3b37b8f0` |
| `patches/C2_register_block.patch` | 6830 | `c1a9ce89c37c839d94c15d07d99f5abeee45c6005d427935814148b0faa9cba6` |
| `tools/check_block_module.mjs` | 2522 | `b241046565d070b2d6c8e4ff5fe8e077956b7ef8b9c17b429f6886d70e85dda5` |
| `tools/identities.mjs` | 1184 | `817136e853e41476491ac7d4256e5f9edc6b380aab1b69d4010b2673c6330d64` |
| `tools/make_c2_module.mjs` | 5428 | `41f7c2841f57273fbfe038a791422149f6c4821ed2e07b8e800bc3f393adc292` |
| `tools/verify_in_scratch_clone.sh` | 6603 | `99c9f080d3e9d7c32b93a0d2d559979fc8ac213ee2f019bf9c14583fa03a78e2` |
