# AC38 Limited Feasibility Study: Protocol

**Status: PREPARATION DRAFT. NOT FROZEN. EXECUTION NOT AUTHORIZED.**

This is a limited feasibility study, not complete method validation and not an AC38 run. AC38 stays non-executable and unpassed. The observation method is not approved, and no result of this study can approve it or make AC38 executable. The four outcome-record mutants (TC:422-425) and AC38 clauses (d) and (e) stay unresolved. All results return to the Research Director for a separate decision.

`TC:n` means line n of `experiments/tc2/TRANSITION_CONTRACT.md`. `DL` means `research/09_decisions.md`.

## 1. Three categories, kept separate

| Category | What it is | Evidence that belongs here | What it can never support |
|---|---|---|---|
| Harness validation | Evidence that the harness mechanisms behave as declared | The synthetic rehearsal, the static checks, and the earlier pinned-tree controls at `2ca9fab` and `3dc0082` | Any statement about the pinned tree's behaviour under this protocol |
| Limited feasibility evidence | Results of the frozen pinned-tree matrix under this protocol, reproduced by the independent reviewer | Only rows whose `countsAsDetection` is true, plus the controls and neutrality rows that qualify them | Approval of the method, an AC38 result, or any claim about a tree other than the pinned one |
| AC38 acceptance | Not part of this study | None. It needs a tree under test, an approved method, clauses (d) and (e), and the outcome-record mutants | — |

Every report labels each result with its category. A result reported without a category is treated as harness validation only.

## 2. Authority

| Record | Effect here |
|---|---|
| D-037 Ruling D (TC:609-632) | In force, unchanged, including the fallback at TC:632: "coverage is not narrowed, and the boundary returns to the Director." This study cannot supply TC:629 in full |
| D-043 | The contract is frozen as a specification baseline. This study changes no contract text |
| D-044 | Preparation only, inside this directory. No freeze commit, push, pinned-tree run or evidence publication until every gate in section 11 is met |
| Execution authorization | Required, separate and written. It is recorded verbatim in `EXECUTION_AUTHORIZATION.md`, which does not exist during preparation |

The rulings drafted in the planning package (R-1 to R-6) are not recorded rulings. The execution authorization must state which rulings, if any, the Director adopts.

## 3. Definitions of terms D-044 uses

- **Three-file tree overlay:** the files `MANIFEST.json`, `main.js` and `render/planning.js` in `pinned_tree/overlay/`. With public commit `0df804c` they rebuild the pinned tree exactly (section 5).
- **Publication-artifact inspection:** the checklist in section 9, recorded in `INSPECTION.md`. It passes only when every artifact to be published is listed there with its scan result and manual read, no item is open, and the Director accepts the record in the execution authorization.
- **Qualified independent reviewer:** a person or system meeting every requirement in section 10.
- **Readiness gate:** the three checks in section 10, reported by the reviewer in writing before the freeze.
- **Stop conditions:** the list in section 8.

## 4. Fixtures, seeds and environment

| Item | Value |
|---|---|
| Primary world | `acq1:study:12`, configuration seed 200979, goal 8, agent `MFW-P`, E1, agent seed 3361643952 |
| Neutrality world | `acq1:study:18`, configuration seed 201469, goal 16, agent seed 2376807940. Chosen as the lowest development index other than 12 and 15 with a natural `tick_cap` at or after call 500 |
| Steps and checkpoint | 3000 steps. Call 2000 on world 12, call 500 on world 18 |
| Reasons | `manual` (direct call at the checkpoint) and `goal_reached` (natural, first at or after the checkpoint). MV-1 uses all five reasons. Neutrality adds `tick_cap`, expected at call 609 |
| Context fixtures | Empty; three-node `[1,2,3]`, the first legal walk that avoids the goal |
| Hooks | Hook State P, legality guard on, map oracles off, virtual clock |
| Runtime | Node v24.15.0. Reference operating system: Windows x64. Identical results on another operating system are unverified |

## 5. Tree identity and the overlay

| Item | Value |
|---|---|
| Name | `learn0-8aa9ee4f39f4` (the directory name matters: site strings and the clock use it) |
| Digest | `7ced1c98041281191eba9bd18a876e90f08af0a1ae5a1ffb8c0355cde46df276`: SHA-256 of the newline-terminated lines `<path>  <sha256>`, sorted by path |
| Files | 148, 5,745,011 bytes. All hashes in `pinned_tree/tree_files.sha256` |
| Base commit | `0df804c497e649affb9e7ebacb10fdc81ab6de8d`, on public `main`. 145 files are byte-identical to it |
| Overlay | `main.js` adds 7 lines (1154, 1279, 1320, 1792, 2128, 3646, 4867), `render/planning.js` adds 1 line (291), and `MANIFEST.json` is not in git. Nothing is removed |
| Contract pins | `main.js` and `render/planning.js` match TC:59-60 |

**Rebuild:** `pinned_tree/reconstruct.mjs <empty-dir>` assembles the 148 files from `git show 0df804c:<path>` and the overlay, then checks every hash and the digest. It is not the tree builder, and TC:485's rebuild requirement stays open.

**Independent check with standard tools:** in the rebuilt directory, run `sha256sum -c` against `tree_files.sha256` (148 rows) and `tree_sources_44.sha256` (44 rows).

**Failures:** a missing overlay, any hash difference, or an unreachable base commit stops the study before any run. Nothing is regenerated or substituted.

## 6. Instrumentation

| Layer | Files | State |
|---|---|---|
| Base harness | `../observe.mjs`, `../guard.mjs`, `../digest_scope.json`, `../rewrite_table.json` | Unchanged from `3dc0082` |
| Study harness | `harness/preload.mjs`, `window.mjs`, `fixture.mjs`, `runner.mjs`, `evaluate.mjs`, `matrix.mjs`, `safety.mjs`, `run_study.mjs`, `build.mjs`, `static_check.mjs` | New. Derived from the closure harness, whose files stay unchanged |
| Rewrite table | `harness/rewrite_table.json` | The closure table, copied and checked by hash, plus 13 mutant rewrites and 3 helper appends |

**Variants:**
- `bridge_off`, the clean control.
- `site_probes`, used only for neutrality.
- `N-0`, a mutant hook with no action.
- Mutants `MV-2a` to `MV-7b`.

Every variant exists only in memory in a disposable process. No two selected rewrites may touch one line.

**Modes:**

| Mode | Behaviour |
|---|---|
| B | Unmodified source |
| D | Transformed source, no spies |
| J | Journal, stream spy, canaries and log capture in the seal window |
| S | As J, with everything reachable from every covered binding registered, except the closed list |
| T | Freeze tripwire. Terminal |
| R0, R1 | Stream positions at seal entry or seal return. Terminal |

**Redaction at capture:** before a result is kept, the runner replaces the repository, tree, output, temp and home-directory paths with fixed tokens, then scans for anything path-shaped that survived. A survivor is masked and flagged, and a flagged run fails.

## 7. Matrix and pass rules

`expected.json` is authoritative: 53 rows and 154 runs. `MUTANTS.md` is a generated summary.

| Group | Role | Rows | Counts as detection |
|---|---|---|---|
| C-0 | Bridge-off reference: every mechanism silent | 2 | No |
| N-0 | Mutant hook with no action, identical to C-0 | 2 | No |
| MV-1 | Bridge restored, all five reasons, values from the closure evidence | 5 | Yes |
| P-1, P-2 | New positive controls: restored array-index write, restored schema-cache write | 4 | Yes |
| MV-2a to MV-7a | The seven non-outcome mutant groups | 24 | Yes |
| MV-7b | Deferred form of TC:427, characterization only | 2 | **No** |
| NW | Neutrality on world 18 | 3 | No |
| BK | Deliberate breakage, each must refuse | 13 | No |

**Row pass rule:** every non-breakage run completed with canaries firing, and every predicate holds. A breakage row passes only if its run refuses with the declared reason.

**Breakage predicates:** a refusal counts only when the process exits non-zero and a harness refusal, marked `AC38 REFUSED:`, contains the declared reason as a literal substring. A generic crash that quotes the reason does not count. BK-12 also requires that the planted path itself was the residual that got masked.

**What a passing row shows, and what it does not:**
- The prohibited behaviour was detected by its declared detector, and only by the detectors its verdict lists, because verdict predicates require the exact list.
- Each claimed detector has its own evidence: canaries in every window, plus a breakage row that disables it (BK-07 journal, BK-08 stream spy, BK-09 tripwire, BK-13 `let`).
- The closed-list check fails closed, because missing data cannot produce a clean verdict.
- None of this establishes coverage of every AC38(a) write class (TC:613-621). The study exercises only the classes listed in `MUTANTS.md`.

**Verdict:** the sorted list of detectors that fired:
- `journal` (or `superset_journal` in S);
- `let`;
- `stream`, any window delta other than cognitive 1, visual 0 and environment 0;
- `math_random`;
- `closed_list`, a vault change other than one entry, or keys outside CL-B's closed list.

A predicate on a verdict requires that exact list, so detection by an unexpected mechanism fails the row.

**MV-4 and MV-5:** their line runs in every seal, including the natural empty seals before the target. Every comparison for them therefore stays inside the same variant, and both fixtures share the mutated history, as an AC38 pair would.

**MV-7b:** its row records only that the window was silent while the downstream fingerprint changed. It never counts as a detected write or as mutant detection.

**Fixed values:** every expected value was fixed before any pinned-tree run of this protocol.

**MV-1's exact counts** (writes, `let` hits, draws, probes and the trip site) are copied from the closure evidence at `3dc0082`, which the same instrumentation family produced. They are a regression anchor:
- They show only that this harness reproduces the closure harness's measurements on the same tree.
- They inherit any systematic error those measurements share.
- They are not independent evidence of bridge behaviour. MV-1's detection rests on its verdict, tripwire and recovery predicates.

## 8. Stop conditions

Each trigger below stops the study at once. The Director decides every one.

| # | Trigger | Evidence that shows it | Record kept |
|---|---|---|---|
| 1 | A row fails, or a run does not complete: non-zero exit, timeout, killed process, machine suspension | `run_study run` exits non-zero; `summary.json` has `allRowsPass: false` or missing records | `summary.json`, every raw record and the console log, kept unchanged |
| 2 | A missed write: a declared detector stays silent | A failed verdict, `journal`, `tripped`, `draws` or `recovered` predicate | As row 1 |
| 3 | A behavioural difference | A failed predicate in a C-0, N-0 or NW row | As row 1. Any explanation by the author is marked unverified |
| 4 | Failed instrumentation: silent canary, refusal outside a breakage row, hash or anchor mismatch, unmet precondition | An `AC38 REFUSED:` message in a non-breakage record, or a gate or tree refusal | As row 1 |
| 5 | Nondeterminism | `run_study compare` exits non-zero | Both summaries and both raw sets |
| 6 | A redaction residual outside BK-12 | A non-empty `residual` in a record | The flagged records stay local and are never published |
| 7 | The reviewer's result differs from ours, or the reviewer cannot reproduce | The reviewer's written report | The report verbatim, unedited |
| 8 | A change to production code, the pinned tree, the contract, the decision log, dependencies, the 43 untracked files or the stash | Before-and-after hashes and `git status`, recorded at each stage | Both records |
| 9 | A need to change an expected value, a detector, the adapter or protocol text after the freeze, or a case these rules do not cover | `run_study` refuses on any frozen-file hash change; the author reports the need before acting | The request and its reason, recorded before any change |
| 10 | The first authorized execution disagrees with a source anchor, an adapter assumption or an expected runtime behaviour | A refusal or a failed row in the first frozen run | As row 1 |

**While any stop is unresolved, nothing proceeds:** no further runs, no edits to frozen files, no publication, no pushes, and no claims about results.

**Resuming:** the study resumes only through a Director decision. After the freeze, that means a new decision, a new freeze commit and a full restart, with the stopped run's records kept and reported.

**Roles:**
- The author records triggers and evidence.
- The author may not mark a stop as resolved, explain away a difference, or describe any result as independently reproduced.
- Only the reviewer's unedited report can establish independent reproduction.

No detector is weakened and no expected outcome is altered to obtain a passing result (D-044).

## 9. Publication route P-2 and artifact inspection

Only the three-file overlay, the hash manifests, inspected harness artifacts and approved evidence may be published. The full pinned-tree archive is never published. `INSPECTION.md` holds the inventory and results.

| Artifact | Required before publication |
|---|---|
| Overlay (3 files) | A manual read of the 8 added lines and of all of `MANIFEST.json`, a pattern scan, and re-confirmed byte identity of the other 145 files with `0df804c` |
| Hash manifests and identity record | Only relative paths and hashes |
| Study code, protocol, expected outcomes, mutant definitions | A pattern scan and a manual read of each new file |
| Raw evidence and summaries | Redaction at capture, a full scan, and a manual read of every breakage run and at least one run per mode. Any residual blocks publication, and evidence is never edited after capture |

A pattern scan finds only known formats. It cannot certify an artifact on its own, so every new text file also gets a manual read.

## 10. Independent reviewer and readiness gate

**Requirements:**
- Runs Node v24.15.0 on Windows x64 in their own environment.
- Can read ES module JavaScript well enough to audit the transform, journal and tripwire, and uses Git and SHA-256 tools.
- Did not author the harness, protocol, expected outcomes or mutants.
- Is not the owner, the Director, the author, or any Claude session.
- Declares any conflict and communicates through the Director.

A reviewer who can only read uploaded files can audit but cannot reproduce, so they do not qualify. This includes Gemini.

**Readiness gate, reported in writing before the freeze:**
1. `node -v` prints `v24.15.0`.
2. In a fresh clone, `node experiments/tc2/verify_contract.mjs` ends with the line the Director names from the pushed baseline.
3. The SHA-256 of `experiments/tc2/ac38_harness/evidence/closure_control.json` is `57b1812de49167217ba772a73150ea01beb216965b282f6abb6fb59788212c3e`.

The reviewer then confirms in writing that they can reproduce the frozen matrix by section 11.

**Review:**
- Rebuild the tree and verify every hash with standard tools.
- Run the frozen matrix once and compare the summary hash.
- Trace at least P-1, MV-2b, MV-6b, MV-7b and three rows of their choice from raw records to the summary, using their own script.
- Report the environment, commands, hashes and every discrepancy. The report goes to the Director unedited.

**No reviewer is designated. Nothing after preparation can start.**

## 11. Freeze and execution procedure

1. The Director's execution authorization, the reviewer designation, the readiness results and the accepted inspection go into `EXECUTION_AUTHORIZATION.md`.
2. `FROZEN.json` records the SHA-256 of every file `run_study.mjs` lists. One freeze commit holds the protocol, expected outcomes, code, overlay and manifests, and is pushed alone if authorized.
3. The tree is rebuilt from public `0df804c` plus the overlay into a fresh directory, and verified.
4. `node harness/run_study.mjs run <out> --tree <dir>/learn0-8aa9ee4f39f4 --freeze <commit>` runs twice, in the foreground. It refuses unless HEAD is the freeze commit on `origin/main`, tracked files are clean, both records exist, every frozen hash matches, and the tree matches all 148 hashes.
5. `run_study.mjs compare` must report byte-identical summaries.
6. Evidence is inspected under section 9, then committed, and pushed only if authorized.
7. The reviewer reproduces the matrix under section 10, and results return to the Director.

Any change after the freeze is a stop. Resuming needs a Director-approved amendment, a new freeze commit and a full restart, with earlier outputs kept and disclosed.

## 12. Neutrality: what it can and cannot establish

**Can establish:** for these inputs on world 18, the transformed source, armed spies and site probes produced no measured difference in exported state, trajectory, final draw counts or return digests between transformed runs. The no-op mutant hook (N-0) adds the same on world 12.

**Cannot establish:**
- Neutrality in general. Compensating effects are not excluded.
- Transient effects during the run that leave no trace in the compared final state.
- Bare-versus-transformed equality of private state, because bare mode cannot read it.
- Bare comparison of populated fixtures.
- Anything about timing, other worlds, other seeds or any changed tree.

## 13. The four outcome-record mutants

TC:422-425 need the D16 outcome record, which the pinned tree does not have: it is "Not present" (TC:456), with "New path, no pinned site" (TC:1569). No store is built or simulated here, and these mutants are not tested.

| Mutant | Needs before it can be tested | Likely detector once a store exists (inference, not shown) |
|---|---|---|
| TC:422 seal creates, suppresses or alters a record | A store and a test-only reader that respects CL-D and AC33 (TC:333, TC:379) | Store digest at seal entry and return |
| TC:423 seal alters a pre-existing record on a non-terminal reason | The same, with a record already present | The same, plus the journal or tripwire |
| TC:424 record depends on context population | The same, in paired fixtures | Pair comparison of record content |
| TC:425 required D16 record missing in both fixtures | The D16 path and a window spanning the enclosing event | Existence check outside the seal window |

They remain an unresolved evidence requirement under TC:629.

## 14. Limitations

- The study covers the pinned tree, two worlds, two seeds and chosen calls. Three reasons use a direct call.
- The synthetic rehearsal exercises the preload, window, observer, runner, evaluator and matrix on test-owned modules. It cannot exercise the pinned adapter, the pinned helpers or the pinned run loop, because preparation may not load the pinned tree.
- `harness/static_check.mjs` checks by text that the pinned names, accessors, helper lines and anchors exist. It cannot show that the adapter returns the right objects, that the helpers or mutant hooks run, that natural seals happen at the expected calls, or any runtime count.
- The first authorized execution is the first time the pinned adapter runs. Any disagreement there is stop 10 in section 8, never a reason to edit expected values.
- The study does not establish coverage of every AC38(a) write class (TC:613-621).
- The journal cannot see plain field writes. The tripwire reports one write per run. Accessors are not invoked by the digest.
- Matching fingerprints do not prove instrumentation neutrality.
- Identical results across operating systems are unverified.
- The study cannot satisfy TC:629, approve the method, or make AC38 executable.

**Frozen hashes:** recorded only in `FROZEN.json` at the freeze. Not present during preparation.
