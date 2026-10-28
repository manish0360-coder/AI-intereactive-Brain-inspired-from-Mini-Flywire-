# CREDIT-1 timing diagnostic: preregistered plan (Milestone T)

**Status: NOT AUTHORIZED, NOT RUN.** T-build (owner authorization of 2026-10-28) builds and gate-tests this harness with zero
sessions. Running it (T-run) needs a separate owner authorization recorded as a non-null `TIMING_DIAGNOSTIC_AUTHORIZATION` in
`lock.mjs`, in a commit of its own. That record pins the SHA-256 of this file (`TIMING_DIAGNOSTIC_SCOPE.planDocSha256`), so any
change to this plan after the record exists makes the runner refuse.

Code: `clock.mjs` (clock rules, driver guard), `clock_preload.mjs` (the clock), `diagnostic.mjs` (plan, comparison rules,
localization, verdict, report), `run_timing_diagnostic.mjs` (runner; plan-only by default), `session.mjs` (guard, clock block,
trace). Gate: `verify_credit1.mjs` group G11.

## 1. Question and claim limits

Question: is the cross-run behavioural variation of five swap-cell sessions (N1A×-w2, w6, w25; N1L×-w14, w21; the only sessions
that differed across the three complete development calibrations and the swap-parity run) caused by load-dependent `Date.now()`
values reaching the schema-rebuild throttle (`render/schemaMemory.js:133`, 15 s), and is the loop-advanced virtual clock
(variant C) deterministic under load for the tested sessions?

The diagnostic covers 25 test sessions and 5 training sessions on one machine. It does not establish universal determinism.
Broader reproducibility claims need separate evidence: D-6 (all 364 development sessions run twice under different load, records
and exports byte-identical), a confirmatory reproducibility audit (a pre-registered random sample rerun under different load),
a static census of real-time sources at freeze, and the stated scope (same Node binary, OS and CPU class).

No effect estimate, cell mean, P1/P2 value or other development-world outcome summary is computed or reported from these
sessions, and none is used to choose the clock variant. The report carries identity verdicts, differing field paths and call
positions only.

## 2. Clock (variant C, the owner's provisional design choice; `clock.mjs`)

| mode | `Date.now()` as seen by the runtime |
|---|---|
| VIRTUAL | t0 + (agent loops fired by the harness) × 500 ms. Nothing else advances it. |
| REAL_RECORD | the real clock; every read is recorded with its calling site |
| REPLAY_FULL | the recorded values of a REAL_RECORD trace, in read order; the calling site must match at every read |
| REPLAY_SITE | the recorded values of the schema-throttle site (`render/schemaMemory.js:133`) at that site; VIRTUAL elsewhere |

- The agent loop must be scheduled with exactly 500 ms (`main.js` `let agentSpeed = 500;`); any other delay throws and is
  recorded. The clock advances when the harness fires the loop (`timer.tick()`), never when it is scheduled.
- t0a = 1,767,225,600,000 (2026-01-01T00:00:00Z); t0b = 1,798,761,600,000 (2027-01-01T00:00:00Z). Both bracket the
  timestamps of the imported stores (2026-10-27); both give 13 decimal digits and 8 base-36 characters across a session; both
  exceed 15,000.
- The preload is loaded with `node --import <file URL of clock_preload.mjs>`; its configuration is the session input's `clock`
  field. An invalid configuration makes node exit before the driver runs. The driver refuses unless the node flags are exactly
  `--import <pinned preload URL>`, `NODE_OPTIONS` carries no preload flag, the preload file is the pinned one, the frozen marker
  reports the input's configuration and `Date.now` is the installed clock. Every other session refuses any clock input, any node
  flag, any marker and a non-native `Date.now`.

## 3. Matrix

Every session is the calibration plan's session of the same label (cell, world, configuration seed, agent seed, 1,500 calls, map
off, ledger full), run with procedure `TIMING_DIAGNOSTIC`. Test sessions receive byte copies of the stores of run
`calib-20261027-cb7e015` (15 files, SHA-256 pinned in `diagnostic.mjs` `SOURCE_STORES`).

- S5: N1AX-w2 (store T_A-w3), N1AX-w6 (T_A-w7), N1AX-w25 (T_A-w26), N1LX-w14 (T_L-w15), N1LX-w21 (T_L-w22).
- P20: N0A, N1A, N0L, N1L on worlds 2, 6, 14, 21, 25 (N1 cells: their own world's store).
- TR5: T_A-w3, T_A-w7, T_A-w26, T_L-w15, T_L-w22 (cold training, export).

| block | sessions | clock | load | runs | compared against | what it can show |
|---|---|---|---|---|---|---|
| R | S5 | REAL_RECORD | LOW ×2, HIGH ×2 | 20 | each other (all pairs) | whether load-dependent variation exists now |
| R_ESC | S5 | REAL_RECORD | HIGH ×4 | 20, conditional | each other and R | only if no R session varies (section 5) |
| P_FULL | S5 | REPLAY_FULL of the source | opposite to the source | 10 | source record | with identical clock values, does load still matter? |
| P_SITE | S5 | REPLAY_SITE of the source, t0a | opposite to the source | 10 | source record | are the throttle's clock values sufficient? |
| V | S5 + P20 | VIRTUAL, t0a | LOW, HIGH | 50 | LOW vs HIGH | the chosen condition does not change with load |
| V_T0B | S5 + P20 | VIRTUAL, t0b | HIGH | 25 | V HIGH | the absolute clock value has no effect |
| TR | TR5 | VIRTUAL, t0a | LOW, HIGH | 10 | LOW vs HIGH (records, traces, exports) | training outputs are byte-identical |

- Replay sources (fixed): each P session replays the trace of `R-LOW-1` (and runs under HIGH) or of `R-HIGH-1` (and runs under LOW)
  of the same session.
- Loads: LOW = 1 worker, nothing else running; HIGH = 12 workers and 12 busy-loop stressor processes. Recorded: workers,
  stressors, per-session wall time, CPU model, cores, memory, platform, Node version and the SHA-256 of the Node binary.
- Order: R, R_ESC (if the rule holds), P_FULL, P_SITE, V, V_T0B, TR; each block and load is one phase.
- Total: 125 sessions, 145 with the escalation.

## 4. Artifacts and comparison rules (fixed before any session; `diagnostic.mjs`)

Each session writes its record (`sessions/<condition>__<label>.json`, label = the calibration label in every condition) and a trace
(`traces/<condition>__<label>.json`): decisions (`arrivals` [call, from, to]), schema events ([k, phase, digest, n]: the schema set
when it was rebuilt, digest without the clock-stamped `lastUpdated`), schema reads ([k, phase, caller]: the `rebuildSchemas`
caller of each throttle read) and, in REAL_RECORD only, every clock read [site, value]. Observation points: [k, 0] at the start of
call k, [k, 1] at its executed move; position = 2k + phase; the decision of call c is at position 2c + 1.

| comparison | raw artifacts compared | exclusion rule |
|---|---|---|
| R vs R (all pairs) | record; trace (decisions, schema events, schema reads) | Record: **none** (raw bytes). Trace: recorded clock values are inputs and never compared. |
| P_FULL vs its source | record; trace | Outside `clock.config`: **none**. Inside `clock.config`: only `mode` and `replaySha256`. |
| P_SITE vs its source | record; trace | Outside `clock.config`: **none**. Inside `clock.config`: only `mode`, `t0` and `replaySha256` (a P_SITE session's virtual base t0 is a configuration value, not an output). |
| V LOW vs V HIGH | record; trace | **none** |
| V_T0B vs V HIGH | record; trace | Record: only `clock.config.t0`. Trace: **none** (traces hold call positions, never absolute times). |
| TR LOW vs TR HIGH | record; trace; export | **none**; exports raw bytes, episode ids and timestamps included |
| every session | stderr | must be empty |

- Records hold no paths and no wall-clock fields: `input.delivery.brainFile` is a file name, store hashes use the XFER-1 view
  (which drops only episode `id` and `timestamp`, never read by decision code), sizes count entries, the fingerprint hashes
  counters. The record's `clock` block: `config` {mode, t0, delayMs, replaySha256}, `preloadSha256`, `observed` {reads,
  readsBySite, schemaReads, loopFires, delays, violations}.
- Runner and stressor logs contain wall times by design and are never compared.
- A difference outside an allowed path is a finding, never a reason to widen a rule.

## 5. Validity, escalation and stops of the run

- A session is invalid if its record is missing, stderr is not empty, the record is not a timing-diagnostic record of the
  planned clock (mode, t0, delayMs), or (outside the P blocks) it crashed, failed condition integrity or the map audit, recorded a
  clock violation, or its loop fires differ from its executed loops or any delay is not 500. A P session that crashed on a
  recorded clock violation is a result, not an invalid session. The runner stops at the first invalid session (no verdict).
- Escalation: if no S5 session varies across its four R runs, the R_ESC block runs (4 more HIGH runs of each); otherwise it does
  not. No other rerun exists.
- The runner completes the preregistered matrix; differences are results, not stops. The verdict decides the program-level stop.

## 6. Interpretation (unchanged from the owner-reviewed design of 2026-10-28)

| category | outcomes | consequence |
|---|---|---|
| **Supports the timing hypothesis** | R varies in at least one session, **and** every P-full and every P-site replay reproduces its source (where a session's two sources differ, each P-site replay reproduces its *own* source), **and** the traces show a throttled rebuild present in only one run at or before the first decision difference, **and** V, V′ and TR are identical | report; go to step 3 below |
| **Against the specific hypothesis** | P-full reproduces but a P-site replay fails; or the decision diverges before any schema difference; or V′ differs beyond the T0 field (absolute time matters) | **STOP**: my list of clock sites is incomplete |
| **Another source of nondeterminism** | any P-full replay fails; any difference in V or TR | **STOP**; no recalibration |
| **Inconclusive** | R shows no variation even after escalation (hypothesis untested; V and TR still stand for these sessions); or every session's two sources are identical (site manipulation untested); or a replay mismatches before any decision differs (recorder defect or read-order nondeterminism) | report; you decide; no ad-hoc reruns |

"Step 3" is step 3 of the owner's approval sequence: DESIGN r3, protocol r2 and the statistical plan, then Gemini review.

How `diagnostic.mjs` applies the table:
- Localization of a differing R pair: the first schema-event difference is at a position at or before the move of the first
  differing call (or no call differs); no schema-read difference comes before it; and at that position one run has a throttled
  `rebuildSchemas` read (caller L `main.js:5265` or K `render/episodeManager.js:1224`; the forced caller F
  `render/episodeManager.js:1149` is clock-free).  A differing R pair that fails localization in any way (a decision difference
  first, a schema-read difference first, or a first schema difference without a throttled read) counts under "against the specific
  hypothesis".
- A replay that recorded a clock violation while its decisions are a prefix of the source's is REPLAY_TOOLING (inconclusive);
  any other replay difference is DIVERGED.
- When more than one row applies, the more severe stop applies: another source of nondeterminism, then against the specific
  hypothesis, then inconclusive; supports only when no other row applies. Every reason is reported.
