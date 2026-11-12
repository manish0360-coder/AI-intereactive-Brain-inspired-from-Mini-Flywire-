# CREDIT-1: independent review package (implementation audit, instrument and parity falsification, calibration statistics)

**Status:** prepared on 2026-10-26 by Claude, the repository investigator and implementer.
- **Not yet reviewed by Gemini.** This is the package to be reviewed.
- **Read-only.** No freeze, no confirmatory session, no push, no change to the reviewed protocol.
- **Means withheld:** development-world mean effects are not in this package, deliberately (section C).

**Labels used throughout:**
- **FACT:** verified against code, gate output or run records named here.
- **ASSUMPTION:** taken as true but not demonstrated.
- **UNRESOLVED:** an open question or a known gap.

---

## 0. Instructions for the reviewer

**What you can see.** You have no repository access. Everything you need is quoted below: code excerpts, gate checks, run aggregates, the centered per-world calibration values, and hashes so the owner can check that the files are authentic. If you need a source file or a session record that isn't quoted, name it, and the owner will supply it.

**Return, for each item in sections A, B and C:**
1. a verdict: **VERIFIED**, **CONCERN** (non-blocking) or **BLOCKER** (must be resolved before freeze);
2. the reasoning, citing the evidence here;
3. for section B: concrete counterexamples (a code path, state or input under which the invariant fails but the instrument still passes), missing tests, and proposed falsification tests;
4. for section C: your own recomputation, and an assessment of stability and assumptions.

**Rules for your proposals:**
- Do not propose weakening an existing invariant to obtain a pass.
- Do not use development-world effects (which are withheld here) to select hypotheses, arms, margins, estimands or claims.
- Under the reviewed protocol, a calibration may change only n. Any other change you recommend is a design revision. It must be stated as such, and the owner decides it before freeze.

---

## 1. Context and provenance

### 1.1 What was reviewed before
- **Reviewed design:** `experiments/credit1/DESIGN.md`, revision 2. sha256 of the committed bytes: `c41c98ae7d72526b…`. Unchanged.
- **Gemini round 2** (`review/GEMINI_ROUND2_REVIEW.md`, `461f74f5…`): **READY FOR IMPLEMENTATION MILESTONE.**
- **Round 2 reviewed the design only, not code.** Everything in section A was decided after round 2, with the owner's approval but without independent review.

### 1.2 Commits since round 2
- **Pushed** (`origin/main` = `f9f45ac`):
  - `5f6cccd`: implementation milestone (trees, instruments, fixtures, locked driver, gate);
  - `f9f45ac`: line-ending-independent gate reading of `main.js`.
- **Local only**, owner-authorized, not pushed:
  - `9e133bd`: calibration harness (runner, plan, per-step analysis, development procedures, driver scope enforcement);
  - `c66f830`: calibration-only session lock;
  - `8f67a8d`: D-0 export comparison under the XFER-1 hash view; G8.1 scoped to authorized calibration runs;
  - `c144130`: I-LEDGER attribution through deep stacks (64-frame capture). This is HEAD.

### 1.3 Source files at HEAD `c144130`
The first 16 hex digits of the sha256 of each file's committed bytes:

| file | sha256 (16) | role |
|---|---|---|
| `experiments/credit1/DESIGN.md` | `c41c98ae7d72526b` | reviewed design r2 |
| `experiments/credit1/CALIBRATION_PROTOCOL.md` | `407bea4f0ae72f73` | calibration steps and pass rules (unchanged since `5f6cccd`) |
| `experiments/credit1/config.mjs` | `2630150cc118ecaf` | constants: cells, primary family, `nFor`, territory |
| `experiments/credit1/census.mjs` | `a4129f3b4c609b20` | credit-block census, A and A+ substitution plans |
| `experiments/credit1/writecensus.mjs` | `597743c6ea101d01` | census of 89 keyed write sites |
| `experiments/credit1/transform.mjs` | `99a101c6475cbcc3` | builds trees A and A+ from the pinned LEARN-0 tree |
| `experiments/credit1/instruments.mjs` | `ac7a44464ca16a11` | telemetry, I-CRED, I-LEDGER, `captureStack` |
| `experiments/credit1/fixtures.mjs` | `c78bda1d40c8a0c4` | synthetic fixtures (14 event classes × 3 arms) |
| `experiments/credit1/events.mjs` | `502c6bf782b8551d` | event classifier, line roles |
| `experiments/credit1/delivery.mjs` | `14ef646eb42eff40` | goal-swap pairing π, store delivery, `NO_Q` mask |
| `experiments/credit1/lock.mjs` | `be09e11c62ec3417` | calibration-only lock and scope |
| `experiments/credit1/session.mjs` | `ff4d121e8da91a12` | session driver |
| `experiments/credit1/calibration.mjs` | `d0429625ee61c259` | plan, validation, per-step analysis |
| `experiments/credit1/calibrate.mjs` | `a6f3074da5741100` | runner |
| `experiments/credit1/verify_credit1.mjs` | `2dd455143a5110a3` | the gate |
| `experiments/xfer1/brain.mjs` | `f640540fd76503d9` | XFER-1 store hash view (`VOLATILE_EPISODE_FIELDS`) |
| `experiments/learn0/session.mjs` | `1dc2d87711b91e9b` | frozen LEARN-0 driver (the D-0/D-1 comparator) |
| `render/episodeManager.js` | `757d549bec6f317b` | runtime: episode pipeline, replay cooldown |
| `experiments/m7/run.js` | `9f6494b27a07712e` | runtime harness (hook state P) |

### 1.4 The gate at HEAD
- **FACT:** 82/82 checks passed; mutants caught 159/159; agent sessions run by the gate: 0.
- **Groups:**
  - G0: base, production, frozen evidence;
  - G1: credit census;
  - G2: write census;
  - G3: trees, static checks S-1 to S-5;
  - G4: instruments and fixtures;
  - G5: delivery and driver;
  - G6: protocol;
  - G7: analysis constants;
  - G9: calibration harness;
  - G8: session-record rule, and the gate itself runs no session.

### 1.5 Calibration runs
All three are kept in git-ignored `experiments/credit1/data/` and never committed.

| run | commit | sessions | result | manifest sha256 (16) |
|---|---|---|---|---|
| `calib-20261026-c66f830` | `c66f830` | 8 / 364 | stopped at D-0: the export check required byte-equal exports (see A1) | `7cb6ee8061c9ea0a` (12 files) |
| `calib-20261026-8f67a8d` | `8f67a8d` | 364 / 364 | stopped at D-3: unattributed Q writes (see A3) | `0c0aa859be595fdf` (448 files) |
| `calib-20261026-c144130` | `c144130` | 364 / 364 | **every step PASS** | `54d1f1a5b045ef03` (448 files; `summary.json` `3311cf53a019a29a`) |

**FACT:** the D-0 records are byte-identical across all three runs. They were made hours apart, under 6 and 10 concurrent worker processes.

### 1.6 Calibration design (reviewed protocol, implemented)
- **Worlds:** XFER-1 development worlds 0–29, the existing deterministic stream from config seed 200,000. Config seeds run from 200116 (world 0) to 202196 (world 29). Goal = GOALS[w mod 4] = 8, 12, 16, 19, checked by D-5.
- **The 9 cells:** T_L, T_A, N0L, N1L, N0A, N1A, N1A× (`N1AX`), N1L× (`N1LX`), N1A_noQ.
- **Excluded:** A+ (its lock is null).
- **Plan: 364 sessions.**

| group | sessions | what |
|---|---|---|
| D-0 | 8 | LEARN-0 tree, world 0: T, N0, N1, O0, each twice |
| D-1 | 80 | worlds 0–9 × 4 procedures × 2 trees |
| D-2 | 40 | worlds 0–9 × 4 CREDIT-1 procedures with the switch set to `{ aligned: false }` |
| cells | 236 | the remaining design-cell sessions |

- **Step order:** C-0, D-0, D-1, D-1c, D-2, the cell sessions, D-3, D-4, D-5, C-1, C-2. The run stops at the first failure.

---

## A. Implementation audit: decisions made after round 2

Each item lists the files, the exact behaviour, the gate tests and the protocol requirement it implements.

### A1. D-0 export comparison: episode `id` and `timestamp`
- **Protocol:** `CALIBRATION_PROTOCOL.md` D-0 requires "4 LEARN-0-tree sessions run twice: 100 % identical session records". It says nothing about exported stores.
- **What happened (FACT):** the harness added a stricter check, byte-identical training exports. The first run failed it because the two exports differed in 460 values: every episode's `id` and `timestamp`, which the runtime builds from the wall clock (`render/episodeManager.js:789` `id: \`${source}_${Date.now()}_…\``; `:688` `timestamp: Date.now()`).
  - With those two fields removed, the exports were identical.
  - The XFER-1 hash view already excludes exactly these fields. `experiments/xfer1/brain.mjs`: `export const VOLATILE_EPISODE_FIELDS = Object.freeze(['id', 'timestamp']);`. Its comment records that `verify_xfer1.mjs` showed these are the only fields that differ between identical runs, and that delivering stores differing only in them gives bit-identical behaviour.
- **Behaviour now** (FACT; `calibration.mjs:241` `exportProblems`, `:260` `d0`). The two D-0 training exports must satisfy all of:
  - (a) both are canonical JSON (`JSON.stringify(JSON.parse(raw)) === raw`);
  - (b) equal XFER-1 store hash (`brainHash`);
  - (c) equal per-component hashes (`componentHashes`);
  - (d) every differing leaf path matches `^episodes\.\d+\.(id|timestamp)$`; anything else fails.

  The protocol's record rule is unchanged: whole records equal except `label` and `input.brainFile`.
- **Gate (FACT):**
  - G9.9 (store-shaped exports differing only in the volatile fields pass);
  - G9.9b (the volatile fields are exactly `["id","timestamp"]`);
  - mutants D0M1–D0M7: a differing record value, a non-volatile episode field, a store component, an extra episode, a new field inside an episode, non-canonical bytes, a missing export.
- **Run 3 (FACT):** D-0 PASS; 4/4 record pairs identical; exports differ only in 460 volatile values.
- **UNRESOLVED:** that no runtime decision reads episode `id` or `timestamp`. Text search finds episode `id` read only in log lines (`episodeManager.js:340, :1119`) and `timestamp` only copied. The behavioural equivalence rests on XFER-1's earlier demonstration and the D-0/D-1/D-2 identities. Please falsify (B4).

### A2. G8.1 scoped to authorized calibration evidence; G8.3 unchanged
- **Before:** G8.1 required that no session record exist in `experiments/credit1/data/`. It became unsatisfiable once the owner ordered the stopped run preserved.
- **Behaviour now** (FACT; `calibration.mjs:158` `dataDirProblems`, applied by G8.1 to the real directory). Every file under `data/` other than `.gitignore` must be:
  - `<run>/summary.json`, `<run>/sessions/<label>.json`, `<run>/brains/<label>.json` or `<run>/logs/<file>`.

  And each run must satisfy:
  - its summary has schema `credit1/1.calibration` and an `authorization` exactly equal to the calibration-only scope, with `authorizedBy: 'owner'`;
  - its recorded `head` commit is in HEAD's history, and that commit's `lock.mjs` contains the calibration-only record;
  - every session record is a planned session (label, world, driver schema, cell) and in scope (no A+);
  - every export is a planned export.

  No file under `data/` may be tracked by git except `.gitignore`.
- **G8.3 is unchanged:** this gate starts no agent session.
- **Gate (FACT):** G8.1 (real directory: 3 runs, 736 session records); G8.1b (a synthetic well-formed run passes); G8.1c (commit `c66f830` carries the lock, the base commit does not); mutants DG1–DG11:
  - DG1 a stray file at the top level; DG2 a directory with no summary; DG3 a missing authorization;
  - DG4 a non-calibration scope; DG5 a commit without the lock; DG6 a tracked record;
  - DG7 an unplanned label; DG8 an A+ cell; DG9 an unexpected file;
  - DG10 an unplanned export; DG11 a record not matching its plan entry.
- **ASSUMPTION:** a run directory is trustworthy evidence of an authorized run because its summary is written by the runner after it checks the lock. The summary itself is not signed.

### A3. 64-frame ledger stack capture
- **Before (FACT):** I-LEDGER attributes each store write to the first `main.js` frame in a stack trace. With V8's default `Error.stackTraceLimit` of 10, the episode pipeline's Q writes lost that frame. The chain is: `main.js` → exported episode function → `_runPipeline` → `_learnProcedural` → `Array.forEach` → callback → `updateQ` → `setQ` → ledger wrapper → `record` → caller, which puts `main.js` at frame 11.
  - Run 2 recorded 415,345 unattributed Q writes (0.337 %), and failed I-LEDGER in all 316 CREDIT-1 sessions.
- **Behaviour now** (FACT; `instruments.mjs:91–95`):

```js
export const STACK_CAPTURE_LIMIT = 64;
export function captureStack(limit = STACK_CAPTURE_LIMIT) {
  const prev = Error.stackTraceLimit;
  try { Error.stackTraceLimit = limit; return new Error().stack; } finally { Error.stackTraceLimit = prev; }
}
```

  The driver (`session.mjs:116`) uses `caller: () => parseCaller(captureStack(), TREE_MAIN)`. The I-LEDGER rule is unchanged: an unattributed write still fails.
- **Gate (FACT):**
  - G4.5: a 2-frame stack;
  - G4.5b: a deep stack with 18 frames between `main.js` and the write, one through `Array.forEach`; attributed to `main.js` line 3;
  - G4.5c: the previous limit is restored on the normal path and when `Error.prepareStackTrace` throws;
  - G4.5d: the driver uses only `captureStack`, and `main.js`, `render/` and `experiments/m7/` never read or set `Error.stackTraceLimit` or `Error.prepareStackTrace`;
  - mutants SM1 (the default limit of 10 loses the deep frame), SM2 (the limit is left raised), SM3 (restore only on the normal path).
- **Run 3 (FACT):** 0 unattributed writes among 123,402,684 ledger writes; 0 ledger failures.
- **ASSUMPTION:** no runtime write chain is deeper than 64 frames. Run 3 shows none was, since all writes were attributed.

### A4. D-1c map-on coverage through a development-only procedure
- **Protocol:** D-1c requires each event class plus "map on, map off, stored, cold, training and test" in the D-1 set.
- **The gap:** all 9 r2 design cells run with the map off (r2 dropped r1's map-on cells), and the driver enforces the cell's map setting.
- **Behaviour (FACT):** two development-only procedures in `lock.mjs` `PROCEDURES`:
  - `MAP_ON_PARITY`: N0L with the map on. D-1 compares it with LEARN-0's O0 (COLD, map on).
  - `D2_MAP_ON_PARITY`: the same with `{ aligned: false }`, for D-2.

  The driver allows the map on only through these procedures (`session.mjs:57`), and the lock scope refuses them on any other cell.
- **Gate (FACT):** G9.4 (scope); G9.5 (driver); mutants PM10 (a procedure on an A cell) and PM11 (map on without the procedure); G9.11 and CV2 (coverage fails without a map-on session).
- **Run 3 (FACT):** the map-on pairs are identical under D-1 and D-2. Map-audit rule for map-on sessions: every oracle executed, none blocked.
- **UNRESOLVED:** whether this is a faithful reading of the protocol, or should have been a disclosed protocol revision.

### A5. N1L× has no LEARN-0 counterpart in D-1
- **Protocol:** D-1 compares "the L-cell procedures" on ≥ 10 worlds.
- **Behaviour (FACT):** the frozen LEARN-0 driver refuses a store from another world (`experiments/learn0/session.mjs:59`, `brainWorld === world`). So D-1 covers T_L, N0L, N1L and the map-on N0L, but not N1L×.
  - N1L× differs from N1L only in which training export is delivered: T_L of π(w), a different goal in the same quartet.
  - Delivery is checked statically (`validatePlan`; mutants PM5, PM6) and at run time (the driver refuses a store from the wrong world; records carry `brain.deliveredHash` and per-component hashes).
- **UNRESOLVED:** whether a direct parity check of the paired-store delivery path is needed. A candidate would be two runs of N1L× with the same store, compared with an own-store run on a store copied byte for byte.

### A6. Exact fields compared by D-1 and D-2
- **D-1** (FACT; `calibration.mjs:212`): a superset of the protocol's list (fingerprint, `writesSha256`, end-store and component hashes, reach call lists, move counters, guard and oracle counters, condition integrity). Both drivers record these fields under the same names. The CREDIT-1 driver ported the LEARN-0 driver's observational fields to make that possible (A8a).

```
PARITY_FIELDS = role, map, input.world, input.configSeed, input.configIndex, input.goal, input.agentSeed, input.ticks,
  outcome, counters, reaches, endpoints, brain.deliveredHash, brain.deliveredHashes, brain.deliveredSizes, brain.start,
  brain.endHash, brain.endHashes, brain.endSizes, brain.localStorageReads, brain.goalKeyedQ, conditionIntegrity, mapAudit,
  guard, moveClass, moves, diag, audit, diagnostics, artifacts
```

  A field missing from either record fails, and comparison is a deep, exact equality.
- **D-2** (FACT; `calibration.mjs:292`): the whole CREDIT-1 record, except `label`, `procedure` and `input.delivery.brainFile`. That includes the `credit1` block: telemetry summary, I-CRED, I-LEDGER evaluation and event-class counts.
- **D-0:** the whole record except `label` and `input.brainFile`.
- **Gate (FACT):** G9.8, with 13 mutants (one per compared field, plus a missing field); G9.10 with D2M1 and D2M2; G9.9 with D0M1.
- **Run 3 (FACT):** D-1 40/40, D-2 40/40, D-0 4/4 identical.
- **UNRESOLVED:** what is *not* compared. See B2 for stores that aren't Maps; their end state is not part of `brain.*`.

### A7. Event-class definitions and coverage criteria
- **Classifier** (FACT; `events.mjs:52` `classifyEvents`). Per credit event (telemetry `begin`: o, x, last, cur, n, goal), using that call's execution record (a, to, fresh) and the goal-reset probe:

| class | definition |
|---|---|
| `goal_entry_reset` | the call has a goal-reset record |
| `first_move_after_reset` | the first credit event after a call with a goal reset |
| `hold` | last = cur, and not the first move after a reset |
| `self_target` | x = cur |
| `carried_decision` | the execution record has `fresh === false` |
| `nongraph_execution` | executed a→to with a ≠ to and no graph edge |
| `ordinary_legal_move` | not first-after-reset, not a goal entry, fresh, last ≠ cur, x ≠ cur, and a→to is an edge |
| `fallback_branch` / `dampq_firing` / `curiosity_signal_write` | some ledger write at that call attributed to a tree line in the fallback branch / the dampQ call / the curiosity-signal block (the last on the curiosity store only) |
| `first_call_guard_skip` | the session's first execution call has no credit event |
| `reversal_guard_skip` | a later call with no credit event whose executed target equals the previous call's origin, the previous call not being a goal reset |
| `aplus_filter_pass` / `aplus_filter_fail` | whether cur→x is an edge; counted, but excluded from coverage while A+ is unauthorized |

  Other guard skips are counted separately (0 observed).
- **Line roles** (FACT; `events.mjs:27` `lineRolesOf`): located by exact anchor text, each start anchor exactly once in the file, and each end at the first exact closing line after it.
  - production lines: PREDERR 4144–4341, FALLBACK 4342–4456 (`} else {` followed by the `// ── FALLBACK Q-UPDATE` comment), DAMPQ 4219–4223, CUR_SIGNAL 4319–4328;
  - on the trees they are located from the tree text, and map back to the same base lines (G9.6).
- **Coverage, D-1c** (FACT; `calibration.mjs:280`): over the 40 CREDIT-1 sessions of D-1, every class except the two A+ classes must be ≥ 1. Map on and off, stored and cold, training and test must each be present. A class unknown because the ledger was off fails; it is never treated as zero.
- **Gate (FACT):**
  - G9.6 with LR1–LR3 (line roles);
  - G9.7 (a hand-built 13-call trace on the real graph, with hand-written counts for all 14 classes, guard skips, and informative and edge counts);
  - G9.7b (ledger off gives null, never zero);
  - EM1–EM3, G9.11 and CV1–CV3.
- **Run 3, D-1c counts (FACT):**

| class | count |
|---|---|
| ordinary legal move | 20,443 |
| goal entry with reset | 17,170 |
| first move after reset | 17,158 |
| hold | 3,183 |
| reversal guard skip | 2,972 |
| first-call guard skip | 40 |
| self-target | 3,179 |
| carried decision | 4,549 |
| non-graph execution | 9,367 |
| fallback branch | 4,334 |
| dampQ firing | 47,304 |
| curiosity-signal write | 48,113 |
| A+ filter pass / fail | 44,629 / 12,546 (not required) |

  All dimensions are present.
- **UNRESOLVED:**
  - the classifier is heuristic (guard skips are inferred from consecutive execution records);
  - the ledger-based classes depend on source-line attribution;
  - the protocol's threshold is ≥ 1 per class.

  Please falsify (B5).

### A8. Other implementation decisions after round 2
- **a. Driver parity fields (FACT).** The CREDIT-1 driver records the frozen LEARN-0 driver's observational fields under identical names: the environment-draw log, traversal record, `moveClass`, `moves`, the full condition-integrity record, counters, endpoints, audit and diagnostics. These are copied from that driver's code, and G9.5 checks they are present in both drivers.
- **b. Session scope and lock (FACT).**
  - `lock.mjs`: `SESSION_AUTHORIZATION` = the calibration-only record (development worlds 0–29, the 9 cells, the three development procedures, `aPlus: false`); `A_PLUS_MODULE_AUTHORIZATION = null`.
  - The driver checks the scope after reading its input and before loading any runtime module (`session.mjs:49`; G5.5).
  - The runner refuses unless the lock is exactly that record, the output directory is inside `data/`, and the working tree is clean (G9.3, G9.3b).
  - Mutants LM1–LM4 and PM1–PM11.
- **c. I-LEDGER evaluation classes** (FACT; `instruments.mjs:175` `evaluateLedger`). Each write is classified by its attributed line's write-census class:
  - unattributed or unclassified: fail;
  - click-only or user-reset sites in a harness session: fail;
  - `LOAD`: must come before the first agent call;
  - `DECAY` and `KEY_PRESERVING`: must not create a key;
  - **`PIPELINE_BRIDGE` and `PIPELINE_REPLAY` are skipped: attributed, but their keys are not checked** (line 188);
  - `BLOCK_PATH`: the key must be a consecutive pair of the current path buffer;
  - `BLOCK_REKEY`: in arm A the key must be the executed pair (cur→x), in L the legacy pair (last→x);
  - `BLOCK_HELD`: the legacy pair in A and L, and always a graph edge.
- **d. D-3 rule (FACT;** `calibration.mjs:300`**):** no I-CRED or I-LEDGER FAIL in any CREDIT-1 session; A cells PASS/PASS; L training sessions DISCRIMINATING/LEGACY_PATTERN. Gate G9.12 with IM1–IM3.
- **e. C-1 and C-2 (FACT).** C-1 uses the 28 complete-quartet worlds 0–27 and the sample SD (n − 1). C-2 pools the design cells only; the procedure sessions repeat D-1 and are excluded. Gate G9.13 with C1M1, and G9.14.
- **f. Plan choices (FACT).** D-0 on world 0. D-1 and D-2 on worlds 0–9, the protocol minimum of 10. D-2 also runs the map-on procedure. Training sessions finish before test sessions within each step.
- **g. Gate infrastructure (FACT).**
  - S-3 now checks against an independent census plan.
  - G0.3 is split into a raw committed-bytes hash (G0.3a) and an exact working-copy form check (G0.3b), with line-ending handling (G1.4).
  - **Known limitation G0.4:** in a fresh clone under `core.autocrlf=true`, the frozen LEARN-0 manifest checks out with CRLF line ends, so LEARN-0's V5 check fails. This is unrepaired and is a governance item.
- **h. Execution choice (FACT).** Run 3 used 10 worker processes. Each session is its own OS process, the plan doesn't depend on the worker count, and outputs are keyed by unique labels (364 labels, 82 exports). The empirical check: D-0 records byte-identical across the 6- and 10-worker runs.
- **i. Telemetry in the trees (FACT).**
  - Tree A has 11 inserted lines: the switch declaration, credit begin and end, candidate counters, episode probes, goal-redirect probes.
  - G3.9: they are inert with the global absent.
  - In calibration, the telemetry object is installed in every CREDIT-1 session and absent in LEARN-0 sessions; D-1 holds regardless.

---

## B. Adversarial falsification: try to break these

For each item: give concrete counterexamples, missing tests, and proposed falsification tests.

### B1. Could a misaligned arm A pass I-CRED or I-LEDGER?
- **I-CRED (FACT;** `instruments.mjs:49`**).** Per credit event, the telemetry operands (o, x, n), recorded where the block begins, are compared with the execution probe (a, to) of the same call.
  - Arm A requires o = a, x = to and n = x in 100 % of events, with no tolerance.
  - Legacy must have an identity rate below 1.
  - On goal-entry calls, o must equal the goal-reset probe's `from`.
- **Run 3 (FACT):**
  - A: 210,401 events, identity 1.0000 in every session;
  - L: 240,073 events, pooled identity 0.329, per session 0.080–0.521; 18,755 events with `reasoning.from ≠ agentCurrent`.
- **Known limit (FACT):** I-CRED checks the three operand *variables* at the start of the block. It does not check each substituted *use*.
  - Per-site substitution is checked statically: S-2 reverse-substitution identity and S-3 (exactly 28 substitutions on 26 lines, independent census, 63 transform mutants).
  - I-LEDGER checks only writes to wrapped stores.
- **Question:** construct a tree in which I-CRED passes and S-2/S-3 pass, but a re-keyed site writes or reads the legacy pair. For example: a site that reads a store under one key and writes under another; an alias of `agentLast` created before the block; a closure capturing `agentLast`.
- **Known evaluator gap (FACT; A8c):** `PIPELINE_BRIDGE` and `PIPELINE_REPLAY` writes are attributed but their keys aren't checked (run 3: 52,461 such writes in A and 56,796 in L). `DECAY` and `KEY_PRESERVING` writes are checked only for not creating keys.
  - **Question:** could a misaligned pipeline write pass?

### B2. Stores the ledger cannot see
- **Wrapped (FACT):** the exported Maps `Q`, `rewards`, `penalties`, `signals`, `curiosity`, `confidence`, `transitions` (including its inner maps), `pathAttempts` and `pathSuccesses`.
- **Not wrapped** (FACT; DESIGN r2 DL-8; README):
  - the emotion map;
  - the semantic layers;
  - the uncertainty ledgers (transition, procedural, propagation);
  - semantic vitality;
  - `timeMemory` and `adjacencyMemory` (private to `main.js`);
  - the consolidation registry.
- **Re-keyed sites (substituted in arm A) that write those unwrapped stores** (FACT; `census.mjs` CLASSIFICATION site notes):
  - `updateLocalEmotion` (`fromId`);
  - `updateTransitionUncertainty`;
  - the semantic expectation outcome;
  - `updateProceduralUncertainty`;
  - `propagateUncertainty`;
  - the semantic memory layer, `recordSemanticEdge`, `reinforcePath`, `weakenPath` and `stepPathKey` (fallback branch; the last feeds the uncertainty engine and semantic vitality).

  For these, arm A's correctness rests on the static checks S-2/S-3 and on I-CRED's operand wiring only.
- **UNRESOLVED** (DESIGN r2 §11, item 1): whether these stores change the chosen move.
- **Question:** identify a path by which an unwrapped store lets arm A behave differently from the design's "re-keying of the existing credit writes" while every instrument passes. Propose a minimal test, for example a store-hash snapshot of the unwrapped stores per call in a development session.

### B3. Could D-1 or D-2 pass despite leakage of the credit switch?
- **The switch (FACT; inserted declaration):**

```js
const __c1on = !!(globalThis.__CREDIT1__ && globalThis.__CREDIT1__.aligned === true), __c1o = __c1on ? agentCurrent : agentLast, __c1n = __c1on ? next : agentCurrent;
```

  It is read on every entry to the block. G3.8 checks the semantics with the global absent, `false`, `'true'` (a string), `edgeFiltered`-only, A and A+.
- **D-1** compares tree A with the global absent against the LEARN-0 tree. **D-2** compares `{ aligned: false }` against absent. Both are 40/40 identical (A6).
- **Questions:**
  - (a) Can a leak exist that D-1/D-2 cannot see because it affects only fields outside `PARITY_FIELDS`, such as unwrapped stores (B2) or console output?
  - (b) Each session is its own process. Is there any cross-session channel? Known shared resources: the prepared tree directories, which are read-only during sessions, and earlier exports, which are read-only.
  - (c) Is there a test that would show arm A differs from L *only* through the substituted sites? No dynamic test of this exists; it is static only.

### B4. Could the D-0 treatment of `id` and `timestamp` hide timing-dependent behaviour?
- **Wall-clock reads in the runtime** (FACT; `Date.now()` outside visual-only code):
  - `render/candidateAnalysis.js:348` (`Date.now() - lastUsed`);
  - `render/episodeManager.js:512–513` (replay cooldown), `:663`, `:688`, `:789` (episode `timestamp` and `id`);
  - `render/episodicContextEngine.js:56, :118, :135, :285, :347, :358, :403`;
  - `render/longTermConsolidation.js:54`;
  - `render/predictionError.js:101`;
  - `render/schemaMemory.js:133, :623`;
  - `render/semanticMemoryLayer.js:58`;
  - `render/semanticProvenance.js:180, :211` (`Date.now() - 5000`, a 5-second recency window);
  - `render/semanticVitality.js:136`;
  - `main.js:4942, :5680` (`timeMemory`).
- **Replay cooldown (FACT):** under the harness the runtime takes a clock-free branch (`globalThis.__M7_REPLAY_ONCE__`: "presence IS the state; no clock read"). Condition integrity requires `replayCooldownDeterministic === true`, which held in all 364 sessions.
- **Empirical (FACT):**
  - D-0 records are byte-identical across three runs made at different times under different concurrency.
  - D-1 and D-2 pairs, run at different times in different processes, are identical.
- **ASSUMPTION:** none of the sites above influences a recorded decision under hook state P, even at lower speed or under heavier load. A 5-second window over sessions of about 1 minute is the most suspicious site.
- **Question:** find a site where wall-clock time can reach the decision path (scoring, candidate admission, credit), and propose a test, for example the same session under artificially slowed calls.

### B5. Could the event classifier or coverage checks report coverage without the intended event?
- **The risks (A7):**
  - heuristic guard-skip inference;
  - ledger-based classes defined by line ranges (a write attributed to the range but not caused by the intended branch);
  - `first_move_after_reset` defined by order alone;
  - ≥ 1 is a weak threshold.
- **Question:** construct traces that the classifier would count as a class although the event did not occur, and the converse. Propose stronger, still non-weakening criteria for a later review. Under the reviewed protocol the threshold itself is fixed.

### B6. Any other instrument that could pass while its invariant is violated
Candidates:
- **The I-LEDGER key forms:** EXEC is `{cur→x, cur#g→x}` and LEGACY is `{last→x, last#g→x}`; BOTH when last = cur.
- **BLOCK_PATH:** checks membership in consecutive pairs of the path buffer only.
- **LOAD:** checks timing only.
- **The fixtures' symbolic lines**, against the real tree's line map (G3.7: the site map covers all 60 `main.js` write sites).
- **D-4's goal-redirect counters**, whose branches are believed unreachable in the harness.
- **The plan validator and G8.1's evidence rule.**

---

## C. Independent statistical review (C-1 and C-2)

### C1. Estimands and data
- **Outcome:** legal goal reaches per 1,500-call test session with the map off.
- **Per world w:**
  - P1(w) = N1A(w) − N0A(w);
  - P2(w) = [N1A(w) − N0A(w)] − [N1L(w) − N0L(w)], estimated directly per world. It is not derived from SD(P1).
- **Worlds:** the 28 complete-quartet development worlds 0–27, with goals cycling 8, 12, 16, 19, seven of each.
- **Withheld:** development-world mean effects. The values below are **centered**: each world's value minus the 28-world mean. The SD doesn't change under centering, so the table lets you recompute both SDs and examine stability without seeing the means.
  - Side effect: P1 and P2 are integers, so the fractional parts reveal the means' fractional parts (sums mod 28) but nothing about their size or sign.
- **Reproducing the centered table from the raw data** (owner only; uncommitted): in run `calib-20261026-c144130`, read `sessions/{N1A,N0A,N1L,N0L}-w{0..27}.json` and take `reaches.legal`. Then apply `calibration.mjs:324` `c1`. Expected `summary.json` sha256 (16): `3311cf53a019a29a`.

| world | config seed | goal | P1 − mean(P1) | P2 − mean(P2) |
|---:|---:|---:|---:|---:|
| 0 | 200116 | 8 | -185.0714 | -297.0357 |
| 1 | 200183 | 12 | -141.0714 | -0.0357 |
| 2 | 200220 | 16 | 57.9286 | 26.9643 |
| 3 | 200247 | 19 | -182.0714 | -288.0357 |
| 4 | 200316 | 8 | 216.9286 | 427.9643 |
| 5 | 200388 | 12 | 55.9286 | 159.9643 |
| 6 | 200404 | 16 | -88.0714 | -93.0357 |
| 7 | 200489 | 19 | 25.9286 | 145.9643 |
| 8 | 200531 | 8 | -217.0714 | -328.0357 |
| 9 | 200710 | 12 | -118.0714 | -176.0357 |
| 10 | 200751 | 16 | 177.9286 | 43.9643 |
| 11 | 200910 | 19 | -104.0714 | -227.0357 |
| 12 | 200979 | 8 | -154.0714 | -186.0357 |
| 13 | 201055 | 12 | 11.9286 | 77.9643 |
| 14 | 201117 | 16 | 28.9286 | -165.0357 |
| 15 | 201269 | 19 | 138.9286 | 41.9643 |
| 16 | 201280 | 8 | 24.9286 | 5.9643 |
| 17 | 201390 | 12 | 47.9286 | 86.9643 |
| 18 | 201469 | 16 | -9.0714 | 72.9643 |
| 19 | 201495 | 19 | 109.9286 | 263.9643 |
| 20 | 201597 | 8 | 53.9286 | 145.9643 |
| 21 | 201608 | 12 | -1.0714 | 100.9643 |
| 22 | 201775 | 16 | 59.9286 | 182.9643 |
| 23 | 201878 | 19 | -133.0714 | -155.0357 |
| 24 | 201919 | 8 | 196.9286 | 115.9643 |
| 25 | 201920 | 12 | 139.9286 | -12.0357 |
| 26 | 202041 | 16 | 112.9286 | 112.9643 |
| 27 | 202048 | 19 | -128.0714 | -86.0357 |

### C2. The calculation, as implemented (FACT; `config.mjs` `nFor`)
- **Formula:** n = ⌈ ((z_α + z_β) × 1.25 × SD / δ)² / 4 ⌉ × 4.
- **Constants:**
  - z_α = 2.2414: two-sided at level 0.975, which is Bonferroni over the two primary claims P1 and P2 (0.05 / 2 = 0.025 two-sided, so z at 1 − 0.0125);
  - z_β = 0.8416: 80 % power;
  - 1.25: the design's safety factor on the SD;
  - δ = 20: the margin;
  - the result is rounded up to a multiple of 4, because worlds come in goal quartets.

| claim | SD | before rounding | n |
|---|---|---|---|
| P1 | 125.2630 | 582.58 | 584 |
| P2 | 180.3033 | 1,207.02 | **1,208** |

- **The design takes the larger: n = 1,208 worlds.** At 9 sessions per world, that is 10,872 confirmatory sessions, using world territory from 2032 to 3239. The collision check and the registry decision (OQ-2) are freeze tasks.
- **The design's illustration** (DESIGN §6.7, before calibration): P1 114.5 (n 488); P2 161.9 if the store effects are uncorrelated (n 976). The calibrated SDs are about 10 % higher.

### C3. Stability evidence (FACT; computed by Claude from the centered table, for you to verify)
- **Correlation of the two store effects:** E_A = P1 and E_L = P1 − P2. SD(E_L) = 107.81, which is consistent with LEARN-0's block-L E1 SD of 114.5. corr(E_A, E_L) = −0.192. The negative correlation is why SD(P2) = 180.3 is above √2 × SD(P1) = 177.1.
- **Leave-one-world-out SD:** P1 120.1–127.6; P2 162.6–183.7.
- **SD by goal (7 worlds each):**

| goal | SD(P1) | SD(P2) |
|---|---|---|
| 8 | 179.8 | 272.8 |
| 12 | 99.2 | 109.9 |
| 16 | 85.1 | 119.3 |
| 19 | 128.8 | 202.3 |

  Goal 8 is markedly more variable.
- **Bootstrap 95 % percentile interval for the SD** (10,000 resamples of worlds, fixed generator seed): P1 99.1–144.0, giving n 368–772; P2 132.5–219.1, giving n 652–1,784.
- **Without the 1.25 factor**, P2 would give n = 776.

### C4. Assumptions (all ASSUMPTION)
1. The development worlds (XFER-1 stream, worlds 0–27) represent the confirmatory population (stream indices from 2032, the same generator and acceptance rule).
2. The per-world differences are independent across worlds. Each world has its own configuration and seeds, and sessions are separate processes.
3. The normal approximation for a paired mean difference at n ≈ 1,208.
4. An SD estimated from 28 worlds, seven per goal, is adequate. The 1.25 factor is the design's protection against underestimation.
5. Goals are balanced in the confirmatory block (quartets), so the pooled SD is the relevant one even though variance differs by goal.

### C5. Descriptive rates (C-2; FACT; design cells only)

| measure | L (118 sessions) | A (148 sessions) |
|---|---|---|
| credit events | 168,627 | 210,401 |
| carried-decision share | 0.0793 | 0.0804 |
| fallback-branch share | 0.0755 | 0.0760 |
| edge-filter firing (legacy pair is an edge, among events where last ≠ cur) | 0.1707 | 0.1812 |
| self-target candidate evaluations (OPT-2) | 0 of 5,836,708 | 0 of 7,383,505 |

- Throughput: 9.61 sessions per minute with 10 workers; 364 sessions in 37.9 minutes.
- The edge-filter firing rate under L is 17.1 %. DESIGN F12 estimated 7.3 % from a uniform random walk. It matters only for the A+ module, which is not authorized.
- No candidate evaluation is a self-target, yet executed self-targets occur (3,179 in the D-1 set). These are different measures, and the source of executed self-targets lies outside candidate scoring (DESIGN DL-5).

### C6. Questions for the statistical reviewer
1. Recompute SD(P1), SD(P2) and n from the table and formula. Do you agree with n = 1,208?
2. Is SD(P2) stable enough given the goal heterogeneity (goal 8) and the bootstrap range (n 652–1,784)? Is the design's 1.25 factor adequate? Any proposal to change the rule (for example stratifying by goal, using an upper confidence bound, or recalibrating on more worlds) is a design revision for the owner.
3. Does the negative correlation of E_A and E_L, or the goal heterogeneity, threaten the P2 estimand or its interval procedure (percentile bootstrap, level 0.975)?
4. Is an equivalence-power calculation at a true effect of 0 (DESIGN §6.7: "reported for both claims") needed before freeze? It has not been computed yet.
5. Are any of the descriptive rates (C5) evidence that an assumption of the design is violated?

---

## D. Evidence gaps for this review
1. **No repository access.** Code is quoted only in excerpts. Full files are available from the owner, verifiable by the hashes in 1.3.
2. **Raw session records are uncommitted** (git-ignored `data/`), and **raw per-world values are withheld** to keep the means hidden. You can verify the SDs, not the derivation of P1/P2 from raw reach counts; that derivation is quoted code (`c1`) plus the owner's local reproduction (C1).
3. **No dynamic test of unwrapped stores** (B2), of slowed-clock behaviour (B4), or of paired-store delivery parity (A5) exists yet.
4. **Not yet computed:** the equivalence power at a true effect of 0 (C6, question 4).
5. **G0.4** (CRLF line endings in fresh clones) affects reproducibility checks in default Windows clones. It does not affect this calibration, which ran from a verified LF working tree.

## E. Requested output format
- A table of every item A1–A8, B1–B6 and C6 (questions 1–5), each marked VERIFIED, CONCERN or BLOCKER, with one line of reasoning.
- Then, for each CONCERN or BLOCKER:
  - the evidence;
  - a concrete counterexample or a missing test;
  - a proposed falsification test;
  - whether resolving it would require a design revision.
- Finally, an overall verdict: **READY FOR FREEZE MILESTONE** / **READY WITH CONDITIONS** (list them) / **NOT READY** (list the blockers).
