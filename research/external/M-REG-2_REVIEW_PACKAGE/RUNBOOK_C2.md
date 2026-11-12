# MCF-1 C2 registration runbook

**STATUS: PREPARED, NOT AUTHORIZED. Following this document before the two authorizations below exist is a breach.**
Nothing in this runbook registers a block, declares the configuration final, freezes the study or runs an experiment.

Prepared at repository HEAD `6d7db9c4eca95319fdc6067560d69bd6ed1d3ac9`, which equals `origin/main`. All paths are
repository-relative; `<REPO>` is a checkout of that commit and `<PKG>` is `research/external/M-REG-2_REVIEW_PACKAGE`
(untracked). This runbook supersedes the C0/C1 details in `REVIEW_PACKAGE.md`, which describes the proposal as it stood
before C0 and C1 were executed (nested rule in the dated directory, pinned P1 verifier); C0 `1b4c909`, C1 `6bd6405` and
C1b `6d7db9c` are the executed forms.

## 1. The gates, and who holds each

| gate | decided by | status |
|---|---|---|
| G-FINAL: configuration `100000 / 1 / accepted 100026` (environment digest `76c141f8d5d4a1cb7a17ed42b5969e21e124dc90e93684aee5fbc24fd6a56257`) is scientifically adequate and final for MCF-1 | Research Director only | **PENDING** |
| G-C2: register the admitted list (3,851 seeds, hull 1500000000-1500003999) with the final wording | user, separately, after G-FINAL | **NOT AUTHORIZED** |
| G-FREEZE: preregistration text, `FROZEN = true`, freeze record, pin commit | user, separately | **NOT AUTHORIZED** |
| G-RUN: official Stage Q, V, O | user, separately | **NOT AUTHORIZED** |

Engineering readiness, green gates and hash consistency establish none of these. A declaration is a sentence of the
Research Director that names the three identity values and the environment digest; it is not supplied by tooling.

## 2. What exists now (all verified at the HEAD above)

- The candidate evidence is lodged byte-exact: `experiments/mcf1/scan_records/1500000000-4000/admitted.json` (sha256
  `5d6b929265366bcb3dc339d96798ab64f2548a456f8de8062c78248a8d3ca1c7`, sidecar equal) under the nested rule
  `experiments/mcf1/scan_records/.gitattributes`.
- Verifiers (C1, C1b): the block module must be data only, one well-formed block per study; an MCF-1 block must be
  registered, unexecuted, bound to the implemented configuration and inside the window (`verify_scan.mjs` `a.blockstate`);
  the lodged evidence must be intact and a registered block must equal it (`a.evidence`). A well-formed block with one
  member dropped passed all six gates at `6bd6405` and is refused from `6d7db9c`.
- `<PKG>/tools/c2_preflight.mjs`: read-only preflight and exact-file emitter (never writes inside the repository).
- `<PKG>/patches/C2_register_block.patch` and `<PKG>/texts_W1.json`: the proposed record with the neutral wording W1.

## 3. Inputs a human must supply (nothing below has a default)

1. **Declaration (G-FINAL).** The four values the Director declares final: seed, index, acceptedSeed, environment digest.
2. **Authorization (G-C2).** An explicit sentence authorizing registration of exactly this list, and a decision
   reference the commit message will cite.
3. **Final texts.** `texts.json` with `authorization`, `artifact`, `why`. W1 (`texts_W1.json`) states only what is true
   before approval and asserts none. If the Director wants the field to carry the approval (W2), the approval sentence
   and its decision reference must be written by the Director's decision, included inside the `authorization` text, and
   the same reference passed as `--decision-ref`; the registry digest changes with every character, so the text must be
   final before step 4.2.
   - Recommended refinement, for the Director to accept or reject: name both hashes in `artifact` so a reader who hashes
     the lodged file is not surprised: the file's SHA-256 is `5d6b9292…` (also in the sidecar) while the quoted
     "admission result sha256" `eaefcdd9…` is the `sha256` field inside it.

## 4. Deterministic procedure (only after G-FINAL and G-C2)

Every step stops on a non-zero exit. No step writes into `<REPO>` until 4.4.

4.1 **State**: `git -C <REPO> status --porcelain --untracked-files=no` is empty; `git fetch` then HEAD equals `origin/main`.

4.2 **Preflight and emission**
```
node <PKG>/tools/c2_preflight.mjs <REPO> --texts <texts.json> \
  --declared-seed <S> --declared-index <I> --declared-accepted <A> --declared-env <DIGEST> \
  [--decision-ref "<ref>"] --emit <EMIT_DIR_OUTSIDE_THE_REPO>
```
Required: exit 0, `P01`…`P08` PASS, `E01` PASS. It prints the registry digest after registration; record it. Exit 3
means an input is missing (never PASS); exit 1 means a check failed. Measured outcomes, with the real repository and
the draft W1 wording: exit 3 without a declaration (`P06`, `P07` pending); exit 0 with matching test arguments, and the
emitted module is byte-identical to the module the patch produces (sha256
`b10912e74adc94b8370e386d071a513b91806c2b0d2396229f94b169adee406f`, registry digest after `024dea2a…c362`).

4.3 **Verify the exact files in a scratch clone** (outside the OS temp directory, LF):
```
git -c core.autocrlf=false -c core.eol=lf clone --no-hardlinks <REPO> <SCRATCH>/clone
cd <SCRATCH>/clone && git config core.autocrlf false && git config core.eol lf
cp <EMIT_DIR>/trajectory_blocks.js experiments/registry/trajectory_blocks.js
cp <EMIT_DIR>/README.md            experiments/registry/README.md
git add experiments/registry && git commit -m scratch
node experiments/registry/verify_registry.js        # exit 0
node experiments/mcf1/verify_scan.mjs               # exit 0 (a.blockstate, a.evidence, SCAN-A committed state)
node experiments/mcf1/verify_mcf1.mjs               # exit 0 (G13 passes only on committed content)
node experiments/mcf1/verify_r2.mjs                 # exit 0
node experiments/m33/verify_r1.js                   # exit 0
node experiments/h1r/build_identity.mjs --check     # exit 0
```
`verify_mcf1` G13 has two guards that fail on any uncommitted change under `experiments/registry/`; this is why the
gates run on committed content in a clone. They are not weakened. Measured: the proposed registration (W1) simulated on
top of the committed `6d7db9c` content in a clean clone gave exit 0 on all six (registry ALL PASSED with blocks 17/0 and
mutants 22/0; scan 20/0 and mutants 39/0; mcf1 121/0 and 49/0; r2 39/0 and 64/0; M33 114/114; build identity equal).

4.4 **Commit in the repository** (the first write): copy the two emitted files; `git add experiments/registry/trajectory_blocks.js
experiments/registry/README.md` and nothing else; require `git diff --cached --name-only` to list exactly those two and
`git rev-parse :<path>` to equal the scratch-verified blobs; commit with a message that cites the decision reference and
states "registration only; configuration finality declared by <ref>; no freeze, no execution". Untracked files in the
working tree stay out.

4.5 **Re-run the six gates on the real HEAD**, then push, then `git ls-remote origin refs/heads/main` equals HEAD.

## 5. Post-registration verification

- `node <PKG>/tools/check_block_module.mjs experiments/registry/trajectory_blocks.js experiments/mcf1/scan_records/1500000000-4000/admitted.json` exit 0
- `node <PKG>/tools/identities.mjs <REPO>`: registry digest = the value printed at 4.2; inventory `be6a49e8…`, reservation
  `d9e75724…`, config `8bc788cc…`, sources `3d17ba6d…`, study configuration `35223ac1…` unchanged; `verifierSha256`
  unchanged by C2; `officialAuthorisation` still refuses with "the design is not frozen".
- `node <PKG>/tools/c2_preflight.mjs <REPO>` now fails `P03` (already registered): it cannot register twice.
- Measured in a scratch clone with the registration committed: `officialAuthorisation()`, `orchestrate inventory --mode
  official`, `makeContext({policy:'official'})`, the driver with a registered member under the official policy and
  `stageAdmit({policy:'official'})` each refuse with the same "design is not frozen" message; the file listing before and
  after is identical; no cache, receipt, manifest or outcome file exists; `scan.mjs admit --policy candidate` recomputes
  `admitted.json` **byte-identical** to the lodged evidence (admission is unaffected by registration).

## 6. Stop conditions (do not commit or push; report)

Any non-zero exit above; a changed identity other than the registry digest; the emitted module differing from the
preflight's report; HEAD differing from `origin/main`; tracked changes; a declaration or text that was not supplied by the
Director; any request to also freeze or run in the same commit.

## 7. Rollback and recovery

| situation | action | verified |
|---|---|---|
| committed locally, not pushed | `git reset --hard <base>` | yes (scratch) |
| pushed, no freeze record or pin exists | `git revert <C2>`: restores the module and README byte-identically; the P2 verifiers accept the empty state; the build identity is unchanged. History keeps C2 and the repository is public, so the seeds were visibly reserved | yes (scratch) |
| after a freeze record binds `registryDigestSha256` | a revert changes that digest, so every official stage refuses (fail closed); recovery is a new freeze milestone | by design (`verify_r2` `r.bindings`) |
| after any official stage ran | nothing is rolled back: a registered, executed block is final; a changed list is a new block | policy (module header) |
| the configuration changes after C2 | `lock.mjs:232` refuses every official stage; restore the registered values, or a new block over a new window with new authorizations (a milestone) | by source reading |

## 8. Remaining freeze path (G-FREEZE), for planning only, not audited beyond `lock.mjs` and the file system

Missing today: `research/preregistrations/MCF1_PREREGISTRATION.md` (no file; `liveBindings().preregistrationSha256`
is null) and `experiments/mcf1/freeze_record.json` (no file). `officialAuthorisation()` additionally needs `FROZEN =
true`, a pin in `authorization.mjs`, a record of schema `mcf1.freeze/2` whose 13 approvals are `APPROVED` with values
equal to the implemented ones (today 11 are `APPROVED_FOR_IMPLEMENTATION` and 2, the seed block and scan length, are
`CANDIDATE_NOT_AUTHORIZED`), bindings for the
preregistration, configuration, sources, verifiers, registry digest, inventory, admitted list and conformed tree, and
exactly one registered, unexecuted MCF-1 block whose configuration equals the approved one.
