# GATE-FLOOR-SCOPE — design C′: final pre-freeze review package (for the independent reviewer)

You are the independent scientific reviewer. You have no repository access, so this package is self-contained. Your previous verdict
on design C was **LIMITED CORRECTION**, with three required corrections:
1. Adopt C′.
2. Disclose the guarded-store anomaly prominently.
3. Pre-specify the stale-reasoning diagnostic.

This package reports how each correction was implemented and verified. It asks for a final verdict before the owner decides whether
to freeze. **Nothing is frozen and no confirmatory session has run.** Every number below comes from *development* worlds (XFER-1
worlds 0–29, outside every study world).

## 1. Background in four lines

* Runtime: the MiniFlyWire agent at audited HEAD under hook state P. That means 150-tick episode cap, deterministic replay, legacy
  credit, 1,500 calls, and goals {8, 12, 16, 19}. A goal-entry *floor* is on at test.
* A *guard bundle* consists of two pinned, default-off lines. The **admission mask** drops non-neighbour candidates. The **execution
  guard** blocks an executed move that is neither a graph edge nor a self no-op. Block I (2,520 sessions) found that the bundle
  improves legal goal reaches by +28.1 [21.9, 34.6] on a legacy store under the floor.
* The open questions:
  - **Q1:** does training the store under the bundle matter?
  - **Q2′:** with the mask present, does the execution guard add legal reaches, and what does omitting it leave?
* The primary outcome is **legal goal reaches** per 1,500-call test session. Non-graph resets and total resets are always reported
  separately.

## 2. Correction A — design C′ (implemented)

| per world (280 fresh worlds, 70 per goal) | seed | floor | guard | store |
|---|---|---|---|---|
| train U | train | off | off | cold |
| train G | train | off | **both** | cold |
| U_off | test | on | off | U |
| U_mask | test | on | mask | U |
| U_both | test | on | both | U |
| G_both | test | on | both | G |

* **Accounting (stated explicitly):** 6 sessions per world, so **1,680 = 560 training + 1,120 test**, with 280 per cell and per regime.
  This was verified against the orchestrator's own `--plan-only` plan. The director's brief said "five cells" and "1,680 *test*
  sessions". C′ as you recommended it (C minus U_exec) has four test cells, and its 1,680 includes the trainings. Nothing was added to
  reach 1,680 test sessions.
* U and G are trained independently, from the same world, configuration and training seed. Each store is shared within its regime. One
  test seed per world.
* **U_exec is not in the design.** It is declared absent, the gate asserts that it is not planned, and the driver refuses an
  execution-guard-only setting. Its development deficit (−94.0 [−114.7, −72.1]; 449 blocked ticks per session) is kept only as a
  labelled pathological comparator. **It is never used as an estimate of the execution guard's value.**

**Estimands.** Y_w(T, M) is the legal reaches of world w, with store regime T and test guard M. Each estimand is a paired mean over the
worlds. Intervals are a 10,000-resample percentile bootstrap over worlds.

| | estimand | status / labels |
|---|---|---|
| PS1 | E[Y(G,both) − Y(U,both)] | **total effect of training under the bundle**. SCOPE_BENEFIT / HARM / NEUTRAL / INCONCLUSIVE |
| PS2 | E[Y(G,both) − Y(U,off)] | package vs legacy + floor. PACKAGE_IMPROVES / HARMS / NEUTRAL / INCONCLUSIVE |
| PS3 | E[Y(U,both) − Y(U,mask)] | **incremental effect of the execution guard with the mask present**. MASK_SUPERIOR / FALLS_SHORT / SUFFICES (non-inferiority) / INCONCLUSIVE |
| M0 | E[Y(U,mask) − Y(U,off)] | secondary: effect of the mask when the execution guard is absent |
| D2 | E[Y(U,both) − Y(U,off)] | Block I replicate. Instrument I6: lower bound > 0, otherwise PS2 is void |

δ = 20 and Bonferroni-3 on the family {PS1, PS2, PS3}; the other quantities use unadjusted 95 %.

**Sizing** (development SDs 57.1 / 74.7 / 28.5, inflated by 25 %): n = 134 / 229 / 34 ≤ 280. MDEs at n = 280 are 11.0 / 14.4 / 5.5.

**Fixed stopping** and no outcome-based exclusion. A world is excluded if any of its six sessions fails after one retry. More than 10 %
of worlds excluded makes the block INVALID.

## 3. Correction C — the stale-reasoning diagnostic (implemented and validated)

**Source facts** (pinned by the gate on the exact runtime source):
- The agent's only decision record is `window.lastReasoning = {from, to}`. It is written at step 0 of `runPrediction` and never
  cleared.
- About 8 % of calls take a replay branch that writes no decision. The previous decision is then *carried* and executed from wherever
  the agent is.
- After a goal reset the agent is moved to a random node, but the record still points at the goal.

**Observation, non-invasive.** The diagnostic adds no tree line and uses existing sites only:
- the per-call telemetry hook, which notes which decision object exists at call start;
- the pinned execution line, which with the diagnostic on evaluates `legalMove(agentCurrent, reasoning.to)` at every arrival. That
  function returns "legal" unless the execution component is on, so it blocks nothing otherwise;
- the goal-reset probe.

**Proven neutral (gate).** Diagnostic on and off give identical results for every guard setting and both training regimes, on decision
stream, RNG draw counts, Q, start and end brain hashes, every reset, guard counters and floor counters. The new driver also equals the
previously frozen driver.

**Classes of an arrival** (agent position a; decision {rFrom, rTo}; fresh = the decision object was written in this call):

| class | rule |
|---|---|
| FRESH | rFrom = a and fresh |
| CARRIED | rFrom = a and not fresh |
| STALE | rFrom ≠ a and not fresh: a decision taken elsewhere, executed here |
| UNCLASSIFIED | missing data, rTo ≠ executed target, fresh yet rFrom ≠ a, or several arrivals in one call |

**Classification of resets:**
- A goal reset is legal iff {from, goal} is a graph edge.
- A reset takes the class of the single arrival of its call. It is UNCLASSIFIED if there are no arrivals, several arrivals, or a
  position or target mismatch.
- Non-graph resets map to channels: STALE → stale channel, FRESH → decision channel, CARRIED → decision (carried).
- Legal reaches from a stale decision are reported separately.

**Special cases:**
- Self moves are legal and never resets.
- A blocked arrival keeps its class and is never executed.
- An illegal execution is an arrival that is neither legal nor blocked.
- A missing diagnostic makes the block invalid.
- A failed accounting identity voids only the stale reading. The identities are: the classes sum to the reach counts, blocked arrivals
  equal the pinned line's own counter, and there are no duplicate calls.

**Reported per cell,** with world-bootstrap CIs:
- **X1** = stale share of U_mask non-graph resets;
- X2 = decision share (expected 0);
- **X3** = stale share of bundle-blocked executions;
- **XU** = unclassified share;
- residual illegal executions per session under mask-only.

**Reading rules (pre-specified, descriptive):**

| reading | rule |
|---|---|
| VOID | the accounting identities fail |
| UNRESOLVED | U_mask has < 1 non-graph reset per session, or XU > 0.05 |
| WEAKENED | X1 upper bound < 0.90, or X3 < 0.95 |
| SUPPORTED | X1 lower bound ≥ 0.90 and X3 ≥ 0.95 |

**Development result (n = 30 worlds, real stores, floor ON; this package's driver):**

| cell | legal | non-graph resets = stale + decision + carried + unclassified | illegal executions | blocked (all STALE) |
|---|---|---|---|---|
| U_off | 420.5 | 125.2 = 32.6 + 92.0 + 0.6 + 0 | 156.3 | 0 |
| U_mask | 469.0 | 30.9 = **30.9** + 0 + 0 + 0 | 30.9 | 0 |
| U_both | 460.9 | 0 | 0 | 31.4 |
| G_both | 450.2 | 0 | 0 | 32.1 |

X1 = 1.000 [1.000, 1.000], X3 = 1.000 and XU = 0, giving **SUPPORTED**.

**Validation:**
- An independent re-implementation inside the gate recomputes every class from the raw trace.
- Adversarial synthetic cases are covered.
- Ground truths hold by construction: under the mask no fresh or carried non-graph reset; under the bundle every block is a stale
  arrival.
- 14 diagnostic and driver mutants are caught.

## 4. Correction B — the guarded-store anomaly (disclosed prominently, investigated)

**Disclosure (pre-registered):**
- Guarded training had 0 non-graph resets and 0 illegal executions. Yet G stores hold 25.8 non-graph pairs per store (3.6 %), against
  100.6 (13.9 %) in U stores.
- Zero resets does **not** imply a clean store.
- PS1 and PS2 are the **total effect of the training regime**: experience, episode count (229.9 vs 236.2), size and content. **No
  contrast isolates store sanitisation, and the G store is not a clean store.**

**Store diagnostics recorded for every world and regime:**
- episodes and consecutive pairs;
- non-graph pairs and share, terminal non-graph pairs, two-step-consistent pairs;
- store hash and the identity of the delivered store in every cell;
- training reaches, illegal executions, blocks and recording-audit counts;
- G − U differences, and their observational association with per-world PS1 (no mediation claim).

**Investigation (new, development).** A read-only *recording audit* watches the episode path buffer, which is the global
`window.recentMemory`. For every appended pair (p → x) it notes:
- **EXEC** if p is where the move to x was executed from;
- **SKIP** if not.

A store's non-graph pair is EXECUTED (ever appended as an executed move), SKIP, or UNRECORDED (never appended).

**Result at n = 30:** in every G store, **all** non-graph pairs are SKIP (25.8 / 25.8), with **0 EXECUTED and 0 UNRECORDED**, and all
are two-step consistent (the endpoints share a neighbour). U stores: 92.3 EXECUTED, 8.3 SKIP, 0 UNRECORDED.

**Mechanism (inference from source):**
- The buffer push is suppressed when the destination equals `agentLast`. That variable lags the agent (a declared legacy deviation).
- A return to the previous node is therefore not recorded.
- The next recorded pair joins two nodes connected by two legal moves.
- These pairs are recording artifacts of legal movement. The guard cannot prevent them because they are not executions.

**Kept UNKNOWN:**
- whether this holds at n = 280: the run reports it, and any UNRECORDED pair stays unexplained;
- whether SKIP pairs change behaviour.

**New instrument rules:**
- **I5** requires 0 EXECUTED-class non-graph pairs in every G store; otherwise PS1 and PS2 are void.
- **I8** raises a non-voiding FLAG if the G non-graph share exceeds the U share.

## 5. Other corrections found while implementing (disclosed)

1. The frozen interaction driver's field `executedNonGraphMoves` counted non-graph *decisions*, not executions. The new driver names it
   `nonGraphDecisions` and measures executions directly. I3 now requires 0 illegal executions under the bundle.
2. The earlier development stale classifier was positional only. The new one adds freshness and separates carried decisions (0.6 per
   session in U_off).
3. Mask-setting completeness no longer requires "masked > 0", which could fail spuriously.

## 6. Verification (gate on development worlds; no confirmatory endpoint printed)

`verify_gatefloorscope.mjs` covers:

| section | content |
|---|---|
| S | static and source pins |
| N | neutrality, cross-driver equality, completeness, refusals |
| K | component scope |
| D | diagnostic correctness |
| A | analysis fixtures |
| P | exact plan and power |
| O | orchestrator self-test whose real records pass the analysis' own integrity rules |
| M | mutants |

Result: **93 checks passed, 0 failed; 29 mutants caught, 0 missed.** Run 1 had 4 failures and 1 missed mutant, all corrected before run 2: an over-strict floor assertion; two self-test failures caused by a concurrent tree rebuild I started (the self-test is clean when run alone); and one non-discriminating mutant fixture. The previously frozen interaction gate, rerun on this tree, still gives 87/0 checks and 20/0 mutants.

The driver of record also reproduces the earlier development calibration exactly: 30 worlds × 6 sessions, 0 mismatches.

## 7. Decision memo

**C′ can establish:** PS1, PS2 and PS3 as defined; what mask-only leaves (X1, X3, the residual); and whether guarded stores ever hold an
executed non-graph pair.

**C′ cannot establish:**
- whether the mask can be dropped;
- a pure sanitisation effect;
- the cause of any UNRECORDED pair;
- production readiness;
- **whether the stale residual is acceptable**, which is an owner decision.

**What would change the recommendation:**

| outcome | consequence |
|---|---|
| PS3 = MASK_FALLS_SHORT | the execution guard becomes a performance requirement |
| stale WEAKENED | the guard's rationale fails |
| PS1 = SCOPE_HARM | no guarded training |
| PS2 ≠ IMPROVES, or a goal harmed | no specification |
| any EXECUTED pair in a G store | the guard leaks in training |

The development expectation (not a result) is PS1 ≈ 0, PS2 > 0, PS3 ≈ 0 and SUPPORTED. That would mean "retrofit the bundle; the
execution guard is a completeness choice".

## 8. Questions for your final verdict

1. **Correction A:** is C′ as implemented (accounting, exclusion of U_exec, PS3 as an increment given the mask) acceptable?
2. **Correction B:** is the disclosure adequate? Is the recording-audit investigation sound? Is I5 (0 EXECUTED pairs in G stores) the
   right fidelity condition, or should SKIP pairs also be required to be two-step consistent?
3. **Correction C:** are the event definitions, special-case handling and the reading thresholds (0.90 / 0.95 / 0.05) acceptable as
   pre-specified descriptive rules?
4. Is any primary or instrument rule still missing for a freeze?
5. Is the I6 retrofit replicate, which voids PS2 when it fails, still appropriate?

**Answer format:**
- for each question, AGREE, AGREE WITH CLAIM LIMIT, or OBJECT;
- at most 3 required corrections;
- a verdict: FREEZE-READY, LIMITED CORRECTION, or MAJOR REVISION;
- your FACT / INFERENCE / UNKNOWN.
