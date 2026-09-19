# M40 — FutureScore Temporal-Snapshot Formulation

**Status:** FORMULATION ONLY. No implementation, no seed, no configuration, no collection, no
preregistration, no change to production code, M39, M39-P1 or any historical artifact.
**Base:** M39-P1 RED record `6cbd363`; M39 formulation `dacdccd`.
**Gate:** `research/preregistrations/verify_m40.js`.
**Reviewed input:** Gemini's review of M39-P1, treated as a hypothesis to audit.
**Repair milestone M40-R1:** Gemini's M40 review returned "GREEN WITH SPECIFIC REPAIR". It added the
prefix-equivalence gate (§12a), the lookahead-diagnostic purity gate (§12b) and the oracle
phase-mismatch mutation (§14), with normative predicates in `research/preregistrations/m40_spec.js`.
No locked decision changed.

> # M40-GREEN
> A successor is justified, and it changes the **time** of the snapshot and nothing else that
> matters. The primary snapshot is anchored to an event that does not depend on FutureScore: the end
> of the first reliability regime (tick 1500). That tick is fixed **before** any calibration data
> exist. Calibration is outcome-blind **by construction** and may only answer go/no-go for that
> anchor; it may never choose a tick. "Not measurable by this assay" remains a possible outcome.

---

## 1. Scientific question

> **At a snapshot whose time is fixed independently of FutureScore, and with the declared
> decision-relevant snapshot state under the M40 protocol held fixed, does the production FutureScore term change `bestChoice`? When
> it does, does it move the choice toward or away from the expected-attempts oracle of the
> reliability regime in force at that snapshot?**

This is the M39 question with the time of measurement replaced. It concerns one immediate ranking
decision, not trajectories, learning, planning or cognition.

## 2. Estimand

E2 is unchanged from M39 §8, evaluated at the primary snapshot tick `T_A`:

```
Δ_c(T_A) = mean over attainable σ ∈ c of ( 1[b_ON(σ) ∈ R*(σ)] − 1[b_ZERO(σ) ∈ R*(σ)] ),
reported with n₊(c) and n₋(c) separately.
```

- **Unit:** the configuration c, one snapshot. The 19 decision states inside c share one learned
  state and are **not** independent observations (the M39 ruling, carried over).
- **Population:** every attainable decision state. No state is dropped for being saturated.
  Saturation is reported, never used as a filter, because a filter on the magnitude of the treatment
  would condition E2's denominator on the mechanism itself.

---

## 3. Source facts the temporal design depends on (evidence)

| # | Fact | Source |
|---|---|---|
| T1 | `runOnce` uses `input.ticks` only to set the loop count `ceil(ticks / 5)` and to record it. A run truncated at T is therefore **expected** to replay the first T ticks of any longer run with the same inputs. This is source inference; §12a tests it empirically | `experiments/m7/run.js:115` |
| T2 | the phase is set at the start of each loop, `env.setTick(ticksExecuted)`, and `PHASE = t >= T_SHIFT ? 2 : 1` with `T_SHIFT = 1500` | `run.js:251`, `env.js:43, :470` |
| T3 | so a run of exactly 1500 ticks calls `setTick` at 0, 5, …, 1495: **every tick is phase 1**, and the snapshot is the last phase-1 state | T1 + T2 |
| T4 | `initRng` replaces every stream, `environment` included. A run **continued** after a readout would therefore diverge from the uninterrupted run, so each snapshot tick needs its own truncated run | `instrumentation/rng.js:32–46` |
| T5 | rewards grow in increments and are capped at 8 (`main.js:4505`, `:4658`; `longTermConsolidation.js:112`); they decay only as ×0.9995, and only when `liveRng() < 0.02` (`main.js:3232–3250`) | source |
| T6 | `futureScore` is the maximum over depth-3 paths of `reward·1.5 − penalty·2 + curiosity·0.4 + lookAhead·0.8`, with deeper chains carried as `deeper·0.9`; `futureBonus = min(4·futureScore, 20)` saturates once `futureScore ≥ 5` | `render/planning.js:182, :298–304, :329`; `main.js:1874` |
| T7 | embeddings, which feed `lookAheadScore`, are **trained during the run** from episode pairs (`episodeManager.js:1044`). UQ-B G2 ("no environmental information") describes them at creation, not after learning | source |
| T8 | M39-P1 at tick 3000: all 466 decision-time candidates at `futureBonus = 20`; D = 0; n₊ = n₋ = 0; ORACLE-INJECTED reached R* in 23 of 74 attainable states | `experiments/m39/evidence/`, `experiments/m39/M39_P1_RED_RECORD.md` |
| T9 | under the Phase 1.0 driver, FutureScore changed a decision early in a run (D2: first differing move at decision 4) | `experiments/d2/D2_EVIDENCE_LINEAGE.md` |

**Formulation inference from T5–T7, not evidence:**

- A single edge reward of about 3.3 already contributes 5 to FutureScore.
- On a graph of diameter 4, a depth-3 search from almost any candidate reaches such an edge once a few
  exist.
- So saturation plausibly arrives early and nearly simultaneously across candidates.
- Before that, FutureScore is dominated by the lookahead term (T6, T7).

A window in which FutureScore both carries learned reward information **and** stays below the cap may
be narrow, or may not exist. This formulation must leave "not measurable by this assay" as a possible
answer.

**Correction of the reviewed wording (T8):** 23/74 is the downstream controllability of **one
specified injection** (20 on R*, 0 elsewhere) at **one snapshot**. It is not an absolute or
theoretical channel-capacity ceiling. Other injections or snapshots can give different values.

---

## 4. Temporal sampling candidates

| | Design | Causal cleanliness | Reproducibility | Post-hoc selection risk | Interpretability | Repeated-measure problem | Implementation | M39 compatibility |
|---|---|---|---|---|---|---|---|---|
| **A** | fixed pre-registered tick | high: time independent of every arm | high (T1) | none **if** the tick is fixed before any data; high if it is tuned on the same data | "effect at tick T": clear, but T is arbitrary unless anchored | none (one snapshot) | minimal: one truncated run | full |
| **B** | fixed fraction of the run | identical to A when run length is fixed (it is: 3000) | high | as A | as A | none | minimal | full |
| **C** | phase-boundary snapshot (last phase-1 tick) | high: anchored to an environment event independent of FutureScore | high (T1–T3) | none: the anchor exists in the frozen M7 design | clear: the state after the full 1500-tick first regime, scored against that regime | none | minimal | full, except that the oracle regime becomes phase 1 (§8) |
| **D** | learning-event snapshot (e.g. k-th goal reach, schema count) | the history is common to all arms, so no between-arm bias; but event timing is produced by the ARMED run, including FutureScore's own influence | high given determinism | the event definition and threshold are researcher degrees of freedom | moderate: "after k events", with a snapshot time that varies by configuration | none per snapshot | higher: event instrumentation, per-configuration truncation | partial |
| **E** | several pre-specified snapshots | as A at each snapshot | high, with one run per snapshot (T4) | none if the grid is pre-specified; pooling or selecting the best tick afterwards reintroduces it | a longitudinal description | snapshots of one configuration share a trajectory prefix: dependent, not replicates | moderate: grid × fixtures runs | full |
| **F** | adaptive: choose the tick after observing FutureScore | invalid for science: time is conditioned on the treatment's own behaviour | irrelevant | total: circular | none as evidence | n/a | trivial | development diagnostic only |

These are properties, not a ranking.

---

## 5. Post-hoc selection analysis

- **Excluded from scientific use:**
  - any rule that reads **outcomes** (D, n₊, n₋, oracle alignment);
  - any rule that reads the **treatment's own variation** at the scientific configurations to choose
    the tick (F; "earliest non-saturated"; "tick with most rankable states").
- **The circularity:** conditioning the time of measurement on FutureScore variation would produce a
  window by construction and makes the tick a function of the thing being measured.
- **What calibration may do:** characterise saturation on **development** fixtures only, and answer
  **go/no-go for a tick fixed in advance**. It may not propose, move or choose the scientific tick.
- **What happens on no-go:** the answer is "not measurable at `T_A` by this assay". Any other tick
  would need a **new formulation and a new independent review**, with this calibration disclosed as
  prior information.
- **Rejected alternative:** a pre-declared rule such as "the latest grid tick ≤ `T_SHIFT` at which
  every development fixture has a rankable state". It is outcome-blind and could be frozen now, but it
  still selects the tick **because** FutureScore varies there, which the Director's instruction
  excludes. It is listed as ruling RU40-3, not adopted.

---

## 6. Chosen formulation

**Primary scientific snapshot: design C, `T_A = 1500`**, the last phase-1 state (T3).

- It is fixed now, before any M40 data exist.
- It is anchored to a frozen environment event and independent of FutureScore.
- It is the state after 1500 ticks of exposure to one reliability regime, scored against that
  same regime.

**Descriptive longitudinal grid (design E, development calibration only):**
`G = {250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000}`.

- It is fixed now, with even spacing and no data consulted.
- It includes `T_A` and the M39 tick 3000, which serves as a lineage check.
- In any later scientific study, grid snapshots may only be reported descriptively, per tick. They
  are never pooled, never used for inference, and never used to choose a tick.

---

## 7. State, snapshot and history definitions

- **State:** `σ = (S_T, u, g, ρ)`, exactly M39 §4, with `S_T` the declared decision-relevant
  snapshot state under the M40 protocol (§7a) after exactly `T` ticks of the ARMED M7-harness run.
  - Inputs: agent seed `20260819000`, arm `A1`, `tickUnit` step, `__M7_REPLAY_ONCE__`.
  - The run is truncated at `T` (T1). Each `T` gets its own run and process (T4).
- **Snapshot:** the state immediately after the last executed loop of that truncated run.
- **History:** `thoughtTrail` and `recentMemory` frozen at their tick-`T` values, never neutralised
  (the M39 ruling).
- **Readout state closure:** the UQ-B R2/R3 freezes. Readouts must leave the snapshot digest unchanged
  (an M39-P1 gate, retained).

## 7a. Declared decision-relevant snapshot state (M40-R1)

The state the gates compare is **declared** in `m40_spec.js` `STATE_COMPONENTS`. It is not assumed to
be exhaustive. It covers four classes:

| Class | Components | How compared |
|---|---|---|
| direct | Q; transitions, rewards, penalties, curiosity, confidence, signals; `thoughtTrail`; `recentMemory`; the nine biology states; embeddings and neighbours (via `findNeuronById`); episodes (`episodicStore`); path trust; environment counters; decision trace; persistence (localStorage) | digest of the exported binding |
| exposed | `adjacencyMemory`, `timeMemory`, `chainMemory`, `attentionMap`, `lastDecision`, `agentRunning`, `goalNeuronId` (the **eight** top-level `main.js` bindings `runPrediction` reads, with `neuronMap` covered by embeddings and neighbours), plus `agentCurrent` (the current node) | one guarded in-memory getter; no production change |
| probe | positions of the cognitive, visual and environment RNG streams | draw index. Relevant to **continuation only**, because every readout reseeds all three streams (`initRng`) |
| behavioral | private module state no digest reaches: emotion map, prediction-error maps, schema memory, consolidation, semantic layer, vitality, provenance, executive and motivational state | the **readout closure vector**: ON-arm pool keys, pool weights, FutureScore values and ON `bestChoice` at every decision state |

**Stated limitation:** the behavioural class is covered only insofar as it changes some readout
weight at some decision state. A private difference that changes no readout is, by definition, not
decision-relevant under this protocol. It is also undetected.

**Lineage correction (M39-P1, not edited):** M39-P1's "snapshot digest" covered a declared subset
(memory maps, Q, history, biology). Its reproducibility claim was carried additionally by the
byte-identical readouts of both processes, which is a behavioural closure of the same kind as above.

## 8. Oracle regime

The M39 ruling "phase 2" followed from its snapshot lying after `T_SHIFT`. The general rule is **the
regime in force at the snapshot**. At `T_A = 1500` every executed tick is phase 1 (T3), so:

```
R*(σ) = argmin_{v ∈ N(u)} [ 1/p₁(u,v) + C₁(v) ],   p₁ = cfg.pPhase1,  C₁ = expectedCostToGoal(p₁, g)
```

- It is set-valued, with ties kept (M39 §6).
- For calibration grid ticks, the regime in force is phase 1 for `T ≤ 1500` and phase 2 for
  `T > 1500`.
- **This is the one change M39's structure requires**, and it is forced by the source: a phase-2
  oracle applied to a state that has never experienced phase 2 would score a policy against a regime
  it never saw.

## 9. Interventions and controls

Unchanged from M39 §9:

- **ON:** the production path.
- **ZERO:** `futureBonus = 0` at `main.js:1874`, in both paths.
- **PERM:** a non-identity permutation of the `futureBonus` values **within the decision-time
  pool P**, restricted as in M39-P1. It is a control for the candidate assignment of an existing
  signal and is informative only where P holds at least two distinct values.

The readout is `bestChoice` at step 0, with identical per-state reseeding across arms.

## 10. ORACLE-INJECTED

A diagnostic only: 20 on R*, 0 elsewhere. It is interpreted **only** as downstream controllability
under that specified injection at that snapshot. It never enters E2, and it is never a treatment or a
ceiling.

## 11. Repeated snapshots

The primary estimand uses **one** snapshot, so it has no repeated-measure structure within a
configuration.

The calibration grid does have it: the 12 snapshots of one fixture share a trajectory prefix. They
are therefore:

- reported per tick and per fixture;
- never pooled across ticks;
- never counted as replicates;
- never given a mixed-effects or any other inferential model, because no longitudinal estimand is
  defined.

A longitudinal estimand would require its own formulation.

---

## 12. Development calibration protocol (M40-P1, stage 1: outcome-blind)

- **Fixtures:** the four approved development fixtures only (`896066:0`, `896066:1`, `896238:2`,
  `896329:3`), each at every `T ∈ G`: 48 truncated runs, each in two independent processes.
- **Recorded, all of it blind to outcome:**
  - the decision-time pool P;
  - the ON-arm `futureBonus` values over P⁰ and P, and their cap fraction;
  - rankable states (P holding at least two distinct values);
  - a **lookahead-only** diagnostic: `futureScore` evaluated on the same state with empty reward,
    penalty and curiosity maps. It is pure and changes no state (T6, T7), and it shows how much of
    FutureScore comes from learned memory.
- **Not computed, by construction:** the ZERO arm, PERM, the oracle, R*, `bestChoice` comparisons,
  D, n₊ and n₋. The stage-1 code must contain no call that could produce them, and its verifier must
  prove that.
- **Lineage check:** at `T = 3000` the ON values must reproduce `experiments/m39/evidence` exactly.
- **Go/no-go for `T_A`, fixed now:**
  - **GO** if, at `T = 1500`, the saturation half of X5 does not fire on the pooled fixtures: some
    state has at least two distinct `futureBonus` values in P. X5's controllability half (whether
    ORACLE-INJECTED can move `bestChoice`) needs the oracle, so it is evaluated only in stage 2.
  - **NO-GO** otherwise. The E2 line is then "not measurable at `T_A` by this assay", and M40-P1
    stops.
- **Stage 2 (only on GO):** the M39-P1 instrument, unchanged except for `T_A` and the phase-1 oracle,
  on the same four fixtures: P0–P7, X1–X6, and the **mutation suite**, which M39-P1 never executed.

## 12a. Prefix-equivalence gate PE (M40-R1; prerequisite for every truncated snapshot)

- **A:** a run with `input.ticks = 1500`, captured after `runOnce` returns.
- **B:** a run with `input.ticks = 3000`, captured by one guarded in-memory line at `run.js`'s
  loop-head anchor `env.setTick(ticksExecuted);` when `ticksExecuted = 1500`. That is the state
  after exactly 1500 ticks, before any tick-1500 loop. The purpose is equivalence **at T_A**, not a
  comparison of final states. B's continuation after the capture (which reseeds the RNG) is not used.
- **Compared** (`prefixEquivalent` in `m40_spec.js`):
  - every direct and exposed digest component;
  - the three RNG stream positions;
  - the readout closure vector at every decision state.
- **Scope:** per approved fixture, in two independent processes.
- **Wording of any pass:** "empirical prefix equivalence under the tested M40 execution conditions".
  It is never "determinism" in general.

## 12b. Lookahead-diagnostic purity gate DP (M40-R1)

At every snapshot where the stage-1 lookahead-only diagnostic runs, in this order:

1. `digestBefore`;
2. readouts;
3. the same readouts again, as an idempotence control;
4. `initRng(sentinel)`;
5. **the diagnostic** (`futureScore` with empty reward, penalty and curiosity maps);
6. one probe draw per RNG stream;
7. `digestAfter`;
8. readouts.

`purityHolds` requires all of the following:

- `digestBefore == digestAfter` on every direct and exposed component;
- every stream's probe equal to the first draw of a generator seeded exactly as `initRng(sentinel)`
  seeds it. That shows no draw was consumed without instrumenting `rng.js`;
- the readouts idempotent;
- the readouts unchanged by the diagnostic.

Production FutureScore is not modified. This is a measurement control only.

## 13. Pilot success and failure criteria

- **Stage 1 passes if:**
  - the runs are reproducible (two processes per (fixture, T));
  - the lineage check holds;
  - the blindness proof holds;
  - **PE passes** for every fixture (§12a);
  - **DP passes** at every snapshot where the diagnostic runs (§12b);
  - all 12 ticks are recorded for all four fixtures.

  Stage 1 is **descriptive** and cannot "fail" on saturation. Saturation only decides go/no-go.
- **Stage 2 is GREEN only if all of these hold:**
  - P0–P7 pass;
  - X1–X6 do not fire;
  - PERM's discriminating behaviour is **empirically exercised** (at least one state with at least two
    distinct values in P);
  - every one of M39's twelve declared mutations is detected, **plus the oracle phase-mismatch
    mutation** (a phase-2 oracle bound to the `T_A` state must be caught).

## 14. Stop conditions

| | Condition | Consequence |
|---|---|---|
| X1–X6 | as M39 §15, evaluated at `T_A` with the phase-1 oracle | stop |
| **XC1** | stage-1 code computes, or could compute, any outcome quantity (ZERO, oracle, D, n±) | stop: calibration invalid |
| **XC2** | the `T = 3000` calibration values differ from the M39-P1 evidence | stop: lineage broken |
| **XC3** | NO-GO at `T_A` | stop: not measurable at `T_A`; no substitute tick without a new formulation and review |
| **XC4** | any attempt to move `T_A`, add a tick to G, or filter states by saturation after data are seen | stop: selection violation |
| **XC5** | PE fails for any fixture | stop: truncated snapshots are not established as the `T_A` prefix; a new formulation is needed |
| **XC6** | DP fails at any snapshot | stop: the diagnostic contaminates the snapshot; the diagnostic is dropped or reformulated, never "fixed" in production |
| **XC7** | the oracle phase-mismatch mutation is not caught | stop: the oracle binding is unverified |

## 15. Seed governance

- Only the four approved development fixtures, re-evaluated at their own seeds. Zero new seeds.
- No registered or scientific block is touched.
- The scientific seed block remains **unassigned** (M39 RU-1 is still open) until a separate
  authorisation after M40-P1.

## 16. Integrity protections

- Production code, M39, M39-P1 evidence, UQ-B, M9, C1, the registries and D2 stay byte-identical,
  with UQ-B and M9 instrumentation imported read-only.
- The M39-P1 verifier must continue to pass unchanged.
- M40-P1 artifacts live only in `experiments/m40/`.

---

## 17. Frozen (unchanged from M39)

- the step-0 `bestChoice` readout;
- the F1–F5 admission boundary and the decision-time pool definition, and its arm invariance;
- the ON, ZERO and PERM definitions (PERM restricted to P);
- the expected-attempts oracle **form**, with set-valued ties;
- the production FutureScore, the ×4 multiplier, the cap of 20 and the 60/40 arbitration blend;
- no production changes;
- ORACLE-INJECTED as a diagnostic only;
- the configuration as the unit;
- the history frozen at snapshot values;
- the UQ-B R2/R3 freezes and the identical per-state reseeding.

## 18. Changes from M39

1. **Snapshot tick:** 3000 → `T_A = 1500`, the last phase-1 state.
2. **Oracle regime:** phase 2 → the regime in force at the snapshot, which at `T_A` is phase 1. This
   is forced by §8.
3. **A new, outcome-blind stage-1 calibration** on a fixed grid, with a go/no-go rule fixed in
   advance.
4. **The mutation suite becomes mandatory** in stage 2, including the PERM faults that M39 data
   could not exercise.
5. **A lineage check** at `T = 3000` against the M39-P1 evidence.
6. **M40-R1:** the prefix-equivalence gate (§12a), the diagnostic purity gate (§12b), the declared
   state (§7a) and the oracle phase-mismatch mutation. The predicates are fixed in `m40_spec.js`
   and proven discriminating by `verify_m40.js` on synthetic records.

## 19. Requires Gemini review before M40-P1 runs

- the choice of design C with `T_A = 1500`;
- the phase-1 oracle regime;
- the blindness construction of stage 1;
- the go/no-go rule;
- the grid G;
- the rejected alternative RU40-3;
- **M40-R1:** the PE and DP gate definitions, the declared state and its behavioural limitation, and
  the phase-mismatch mutation.

Any post-calibration change to a tick needs a new formulation **and** review.

## 20. Evidence, inference, hypothesis, unresolved

- **Evidence:** T1–T9.
- **Inference:**
  - a truncated run reproduces the prefix (T1; tested by stage 1's lineage and reproducibility
    checks);
  - saturation may arrive early (T5, T6);
  - before saturation, FutureScore is lookahead-dominated (T6, T7).
- **Hypothesis:** at `T_A`, some pools hold distinct FutureScore values and E2 is measurable. Its
  competitor is that the assay is non-measurable at `T_A`. Neither is favoured.
- **Unresolved rulings:**
  - **RU40-1** adopt C / `T_A = 1500`;
  - **RU40-2** adopt the grid G;
  - **RU40-3** the rejected latest-feasible-tick rule;
  - **RU40-4** the scientific seed block (deferred);
  - **RU40-5** the inference plan across configurations (future preregistration).
- **No claim** is made about FutureScore's usefulness, planning, learning or cognition.

## 21. Is M40-P1 warranted?

**Yes, as a two-stage development pilot.**

- Stage 1 is cheap: 48 truncated runs per replicate, 4 × 19,500 = 78,000 simulated ticks, the
  equivalent of 26 M39-length runs. Two replicates are needed for reproducibility. It uses no new seed
  and is outcome-blind.
- It resolves the one question M39-P1 left open: whether FutureScore is unsaturated at an
  independently fixed time.
- Stage 2 runs only on GO.
- A NO-GO is itself a result: the mechanism is not measurable by this assay at the anchored time.

---

> # M40-GREEN
> Formulation complete. `T_A = 1500` and the grid G are fixed before any data. Calibration is blind to
> outcome and decides only go/no-go. RU40-1–RU40-5 and independent review precede M40-P1.

Believe in yourself and keep going
