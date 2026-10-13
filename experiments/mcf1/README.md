# MCF-1 Phase 1 harness

Engineering harness for MCF-1 Phase 1 (`M-MCF1-HARNESS`, corrected by `M-MCF1-HARNESS-R1`). It **does not run
the experiment**. No seed is registered or consumed, no confirmatory seed is touched, and **the scientific design
is not frozen**. Every official stage refuses to start (see "Execution lock"). Everything here is read-only with
respect to H1-R and the seed registry.

## The question the harness is built to ask

On the frozen B2-conformed agent, at node 10 with goal 12, does a restored prior episode on one of two matched
two-hop routes steer the **first routing choice**, and what does that do to **first-edge traversal success**?
One decision and one environment attempt per run.

* Endpoint: first-edge traversal success. It is **not** goal arrival (node 12 is not a neighbour of node 10).
* Contents: `C` (no memory), `M9` and `M11` (one episode on route 10→9→12 or 10→11→12, delivered through the
  product's own `loadBrain()`).
* Twins: `T9` / `T11` swap which route has the reliable edge probability (0.95 against 0.35). All three contents
  and both twins run under common random numbers per seed: **six runs per seed**, at Stage V and again at Stage O.
* Sampling: **Option C**, a census of the entire complete-cluster frame. No test, p-value, sampling-based interval,
  practical threshold or significance claim is produced, and nothing is claimed beyond the frame.

## Decision ledger (approved for implementation; not a freeze)

The user approved these values for implementation. In `config.mjs` they carry the status
`APPROVED_FOR_IMPLEMENTATION`. The word `APPROVED` is reserved for a freeze record and appears nowhere in the config.

| decision | value |
|---|---|
| primary outcome | `T_frame` (formula below) |
| candidate seed block | start 1,500,000,000, scan length 4,000; **candidate, not authorised** for any scan or execution |
| budgets | cognitive 4,096, visual 16,384, environment 64 (sigma unused); runtime enforcement V11 unchanged |
| instrument failures | V1, V9, V12 halt the stage; a run error gets one deterministic retry in a fresh isolated process, then halts; the first non-operational seed-scope fault at Stage O halts |
| registry scope | every admitted raw seed must already be recorded (MCF-1, registered) before an official Stage Q; the harness only checks, it creates no entry |
| minimum valid frame | 100 complete valid seeds: a sanity floor, not a power or significance threshold |
| practical threshold | none |
| claim boundary | see "Claim boundary" |
| frame | complete-cluster (below) |
| V6 | diagnostic, never an eligibility condition |
| study configuration | `100000 / 1 / accepted 100026`, **adopted from development and disclosed as such**; identity, provenance, goal, the six frame-edge reliabilities and a digest of the whole environment are bound (see "Execution lock"). No separate configuration chain (M-CFG-1) is built or needed for this milestone |

## Exact formulas

Per seed, the executed first edges are `xC` (COLD), `x9` (M9) and `x11` (M11). They are twin-invariant (V5), so the
twins do not enter any steering score.

**Primary.** `T_frame` is the arithmetic mean over the frame of

`S_s = 1/2 (1{x9=9} - 1{x9=11} + 1{x11=11} - 1{x11=9})`

the content-contrast executed-edge score: what each memory content executed on the route it remembers, minus what
the *other* content executed there. It is COLD-free, takes the values -1, -1/2, 0, 1/2, 1, and is **not**
conditioned on success or restricted to expected patterns. It equals the earlier follow indicator
`1{x9=9 and x11=11}` on every follow and equal pair, and differs only on reversed (-1) and mixed (±1/2) pairs, which
the former V6 exclusion used to hide.

**Secondary, named, on the same frame and denominator:**

| name | definition |
|---|---|
| `followRate` | mean `1{x9=9 and x11=11}` |
| `sigmaBar` | mean `1/2 (1{x9=9} + 1{x11=11})`, the remembered-route execution rate |
| `coldRate` | mean `1/2 (1{xC=9} + 1{xC=11})` |
| `netShift` | `sigmaBar - coldRate` per seed, averaged (GOOD minus COLD, executed edge) |
| `nonSpecific` | `1/2 (1{x9=9}+1{x11=11}+1{x11=9}+1{x9=11}) - (1{xC=9}+1{xC=11})`; algebra: `netShift = (S_s + nonSpecific)/2`, and `nonSpecific = 0` on the identity class |
| route-specific rates | for each of C, M9, M11: share executing node 9, node 11, or a distractor (6 or 13) |
| outcome contrast | `D_s = 1/2 sum_l [Y(M_l,l) - Y(M_l',l)]`, plus GOOD-COLD, BAD-COLD and the six cell success rates |

Every metric object carries its sum, denominator, the frame size and the **frame hash**. `verifyAnalysis` refuses an
analysis whose frame hash is missing or inconsistent, whose metric hashes differ, or whose denominators differ from
the frame.

## Complete-cluster frame

One authoritative frame (`frame.mjs`) feeds every metric. A seed is in it iff:

1. it was admitted and registry-available (V10);
2. it qualified at Stage Q;
3. all six condition/twin runs are present and pass every seed-scope check at Stage V;
4. all six condition/twin runs are present and pass every seed-scope check at Stage O;
5. and no stage-level halt occurred (a halted stage yields no frame at all).

Exclusion is atomic: a failed member excludes the **whole seed** from every metric, so a paired comparison is never
computed from the survivors of a broken cluster. Seed exclusion and stage halt are different consequences:

| consequence | rules |
|---|---|
| seed exclusion (whole seed) | V2, V3, V4, V5, V8, V10, V11 at Stage V; V4b, V11 at Stage O (only if the halt threshold is raised above 1) |
| stage halt | V1, V9, V12, a persistent run error (RUN), and at Stage O the first seed-scope fault |
| diagnostic only | V6, V7 |

Failing run keys are recorded per rule. The analysis reports exclusions by rule x content x twin x stage with the
number of seeds evaluated, and reconciles Stage-V counts, Stage-O counts, complete-cluster counts and the final
frame size explicitly (`valid at V - excluded at O = frame`). A below-minimum frame (fewer than 100 seeds)
withholds the primary value and every permitted claim.

## V6 is a diagnostic

The former V6 rule excluded seeds whose executed pair was neither (9,11) nor `x9 = x11`. It was built to keep the
first-edge contrast binary for an exact test, which the census does not use, and it selected the frame on the
primary outcome's own pattern. It no longer decides membership. The analysis reports pair-class counts (follow,
equal, reversed, mixed), the signed-score distribution, the number with `S_s < 0`, and the effect of the former
restriction on `T_frame` and on the first-edge contrast. V7 (outside the identity class) is likewise diagnostic.

## Exploration diagnostic (inferred, with limits)

At call 0 the agent draws `liveRng() < epsilon` with epsilon = 0.2 (stress and fatigue are 0 and nothing at call 0
depends on the restored memory) and, if it triggers, a second draw picks a candidate. The measurement sink records
the step-0 argmax (`M-BEST`) and the executed edge (`M-DECISION`), **not** the trigger or the pick. The indicator is
therefore **inferred**: a run is "visible" when its executed edge differs from its argmax. Limits:

* a triggered pick equal to the argmax is invisible in that run;
* when all three contents share one argmax, such a trigger is invisible in every run (`unobservableByConstruction`);
* a COLD-only view misses triggers visible only under a memory content, so the union over the six runs is reported
  alongside it;
* it is a descriptive decomposition only: it does not adjust for confounding, and it never decides frame membership,
  the primary outcome or the outcome mapping.

It adds no runtime behaviour and consumes no random number; the verifier checks that the conformed tree carries the
branch and hooks described here.

## Claim boundary

Permitted, if the numbers support it: memory-guided **first-edge routing** within the single specified simulation
context (start node 10, goal 12, matched two-hop routes, the registered reliability assignment) and the enumerated
frame. Everything else is prohibited, in particular planning, probability understanding or agent evaluation of reliability, goal-conditioned or
episodic recall, generalization beyond the frame or to other decision points, goals or the repository HEAD, general
cognition, a general performance benefit of memory, goal arrival, learning or trajectory effects, and any
significance statement.

## Execution lock (M-MCF1-R2)

Official stages are **locked**, and the lock is a function of committed state only. No parameter, option, environment
variable, CLI flag or input file carries authority; a caller may supply a value to be *checked*, never trusted.

| piece | file | role |
|---|---|---|
| the pin | `authorization.mjs` | one declaration, `FREEZE_RECORD_SHA256 = null`. Data only and **not** in any digest (it is the hash of a record that contains the source digest). `lock.mjs` and the verifier refuse it if it is anything but that declaration |
| the decision | `lock.mjs` | `officialAuthorisation()` takes **no parameter**: `config.FROZEN`, the pin, `freeze_record.json` at a constant path (closed schema, parsed once from bytes), the preregistration at a constant path, the declared source digest, the configuration digest, the registry digest and the single registered `MCF-1` block |
| the boundary | `driver.mjs` -> `lock.assertOfficialExecution` | the driver is the only place agent code runs. Its official branch derives authorization, seed membership, configuration, tree and stage ordering from committed state; every field of its input that names authority is only compared |
| ordering evidence | `lock.mjs` receipt chain | `experiments/mcf1/data/official/<pin16>/receipts.json`, one file, replaced atomically |

Current state: `config.FROZEN` is false, the pin is `null`, no freeze record exists and no block is registered. Every
official entry point refuses at its first guard, including a direct driver invocation, a forged context, an injected
executor or registry, and `stageAdmit({policy:'official'})`. **No R2 path can scan the candidate range.**

What the driver checks (official policy, before anything else is loaded)

1. the input has exactly the documented keys; `freezeSha256` equals the pin (an echo, not authority);
2. the record, preregistration, configuration, source and registry digests recomputed now equal the record's, and the
   record's approved values equal the values implemented in `config.mjs`;
3. the seed is a member of the registered block (registry decision `REPRODUCTION` and inside the block's list);
4. `configSeed`/`configIndex` equal the approved study configuration;
5. the conformed tree is verified with **plain reads only** (`verifyTreeReadOnly`); `IN.tree` must be that directory.
   No official path (orchestrator, driver, lock) can build, repair or delete the tree: a missing or corrupt tree is
   refused, and `prepare_tree.mjs` is the separate, single-process, non-official way to (re)build it;
6. the environment generated from the verified tree equals the approved configuration (`envidentity.mjs`);
7. Stage V needs a valid Q receipt that lists the seed; Stage O needs a valid V receipt that lists the seed and is linked
   to the current Q receipt.

**Receipt lineage.** Each receipt binds the frozen identity (record, preregistration, configuration, sources, registry,
tree, admitted list, study configuration), its own stage and the hash of its upstream receipt. The three receipts live
in one chain file that is replaced atomically (write a temporary file, flush, rename), under an exclusive lock file.
Completing Q clears V and O and completing V clears O in that same replacement, so no state with a downstream receipt of
an older upstream can exist; re-running a stage that reproduces an identical receipt changes nothing. A downstream
stage never relies on file existence: it re-validates hashes, identity and the upstream link. An interrupted update
leaves either the old chain or a lock file; **any lock file, truncated chain or hash mismatch is refused (fail
closed)**, and the lock is removed only by a person after checking that no orchestrator is running.

**Limits, stated.** Receipts are integrity and ordering evidence, not secrets. A determined local editor who changes
`lock.mjs`, the registry data or a receipt can forge a consistent state: that is *detected* (every binding can be
recomputed and is recorded outside the working tree), not prevented. Not claimed: protection against preloaded modules,
a replaced Node binary, rewritten git history, or full control of the machine.

**Environment representation.** The study configuration (`100000 / 1 / accepted 100026`, adopted from development and
disclosed as such) is bound by an explicit canonical representation (`envidentity.mjs`): closed schema, integers as
integers, every other number as its IEEE-754 bytes, the embedding `Map` as an ordered array, constants and graph
included, one digest per section. A generic `JSON.stringify` of the configuration object would silently turn the
embedding `Map` into `{}`; the verifier demonstrates that and proves every parameter changes the digest.

The design is not frozen. A later, separately authorised sequence (scan, block registration, preregistration text,
freeze record, pin commit) is required before anything official can run.

## Scan authority and the candidate block writer (M-SCAN-1)

Admission is arithmetic over stream positions: it never runs an agent and never reads an outcome. It lives in a module
that **cannot** execute anything, and the separation is a property of the import graph, not a flag.

| piece | where | what it does |
|---|---|---|
| `SCAN_AUTHORIZATION` | `authorization.mjs`, second declaration | `null` until the user authorizes; then exactly `{ start, length }` equal to the candidate window in `config.mjs`. Read only by `lock.scanAuthorisation()`, which takes no parameter |
| `stageAdmit` | `scan.mjs` | policies `development` (explicit window inside the exploratory domain), `official` (the window of a pinned record) and `candidate` (the one authorized window; takes no window and no inventory; builds its own inventory from committed state). Unknown arguments are refused by name |
| `writeCandidateBlock` | `scan.mjs` | validates an admission result completely (hashes, counts, ordering, exclusions, accounting, deterministic recomputation by the committed predicate, registry conflicts) and only then writes one artifact atomically to a synthetic or development destination |
| `scan.mjs` CLI | `admit --policy development|candidate`, `write-block` | `candidate` refuses while the authorization is null and refuses any window flag |

Properties the verifier (`verify_scan.mjs`) proves: the scan module's import closure contains no orchestrator, driver,
H1-R runtime, measurement layer, tree builder, episode contents, validity rules, frame or analysis and no process,
thread or network module; running the stage under a `child_process` trap and a filesystem-read recorder spawns
nothing and opens no outcome, cache, manifest or receipt file; the same window gives the same list and hash; every
corrupted input is refused by its own guard and leaves no file; an interrupted write leaves either no block or a whole
block plus a lock that makes a retry refuse; and the destination policy refuses the registry directory, the registry
module, the repository tree and anything outside `experiments/mcf1/data` and the temporary directory.

**Not done here, by design.** Nothing in M-SCAN-1 itself scanned `1,500,000,000 + 4,000`, set the authorization,
registered a block or wrote `trajectory_blocks.js`. The user's separate decision (M-SCAN) set
`SCAN_AUTHORIZATION` to exactly that window and ran the admission scan; its output lives in the git-ignored
`data/scan/1500000000-4000/`. Registration remains a separate, unauthorized step. `renderBlocksModule` produces the text a later, separately
authorized commit would hold in that module; no code path writes it there. The scan itself is a gate for the user.

## Stages and files

| stage | what it does |
|---|---|
| `inventory` | reserved stream-span inventory + hash |
| `admit` | deterministic ascending admission scan + hash |
| `qualify` (Q) | one cold decision-stop run per admitted seed |
| `validate` (V) | six decision-stop runs per qualified seed; validity manifest + hash (no outcome exists) |
| `outcome` (O) | needs an intact V manifest and its independently supplied hash; stops at the first attempt |
| `analyze` | builds the one frame, then the descriptive census; no inference |

| file | role |
|---|---|
| `config.mjs` | constants, ledger, seed policy, study configuration (no authority) |
| `authorization.mjs` | the pin (data only) |
| `lock.mjs` | `officialAuthorisation`, `assertOfficialExecution`, read-only tree verification, receipt chain, source digest |
| `envidentity.mjs` | explicit canonical representation and digest of the study environment |
| `inventory.mjs`, `admission.mjs`, `episodes.mjs`, `driver.mjs` | engine (the driver enforces the lock; pinned by the verifier) |
| `validity.mjs` | rules, pair class, exploration indicator, manifests |
| `frame.mjs` | the complete-cluster frame, reconciliation, exclusion table |
| `analyze.mjs` | scores, metrics, selector, interpretation, `verifyAnalysis` |
| `orchestrate.mjs` | stage assembly, retry policy, preflight, context lock, receipts, CLI (re-exports the admission stage) |
| `scan.mjs` | the non-executing admission stage, the scan authority gate use and the candidate-block writer (M-SCAN-1) |
| `prepare_tree.mjs` | non-official, single-process (re)build of the conformed tree |
| `verify_mcf1.mjs`, `verify_r2.mjs`, `verify_scan.mjs` | harness gates with source mutants; R2 lock gates, adversarial matrix and mutants; M-SCAN-1 authority, isolation and writer gates with mutants |
| `data/` | git-ignored output directory (development runs; official artifacts and receipts under `data/official/`) |


## Running (development seeds only)

```bash
node experiments/mcf1/verify_mcf1.mjs
node experiments/mcf1/verify_r2.mjs
node experiments/mcf1/verify_scan.mjs
node experiments/registry/verify_registry.js
```

Development mode is confined to the exploratory domain (raw seeds 1,100,000,000 to 1,100,199,999). The verifier
uses development seeds and synthetic records only and never scans or executes the candidate block.
