# GATE-FLOOR-SCOPE — design C′ preregistration (FROZEN; confirmatory run NOT AUTHORIZED)

**Status: FROZEN on 2026-10-20 after the independent final review.**
- Verdict: FREEZE-READY WITH EXPLICIT LIMITATIONS, with no blocking defects and no required corrections. The record is
  [`FREEZE.md`](FREEZE.md) / [`FREEZE.json`](FREEZE.json).
- The frozen design is commit `57beb5d`; every code and evidence file is byte-identical to it.
- **The confirmatory run is NOT AUTHORIZED and NOT EXECUTED.** No session has run and no block S world has been consumed. Execution
  needs the owner's separate, explicit authorisation.
- Production `main.js` is unchanged.
- Every session behind the numbers here ran on XFER-1 *development* worlds (0–29, outside every study world) and is labelled as
  development evidence. The earlier proposal (design C, 1,960 sessions) is commit `2b53a7f`; this document supersedes it.

**Mandatory statements (frozen; they bind every report):**
1. The 1,680 total sessions comprise 560 training sessions and 1,120 test sessions (280 worlds x (2 training regimes + 4 test cells)).
2. PS1 estimates the total effect of the specific guarded training regime, including its recorded-store artifacts; it is not the effect
   of a clean store.
3. The recording-artifact explanation of the non-graph pairs in guard-trained stores is supported by development evidence but does not
   establish that they are behaviourally irrelevant.
4. Results apply only within the specified bounds: Phase I (1,500 calls), legacy stale-keyed credit and the 150-tick episode cap (with
   deterministic replay, hook state P, goals {8, 12, 16, 19}).
5. Not established by this study: the independent effect of the execution guard without the mask, the effect of a perfectly clean
   store, and production readiness.

The rest of this document is the design exactly as reviewed. Only this header changed at the freeze. Statements in it such as "not
frozen" describe the review state.

Statements are tagged **FACT** (checked in source, in a gate, or in a recorded development run), **INFERENCE** (follows from facts,
with the basis stated), **RECOMMENDATION**, or **UNKNOWN**.

## 0. Provenance, review history and what changed

| | |
|---|---|
| substrate | audited HEAD `0df804c…`. Guard tree = PRODSEM derived tree + the two pinned guard lines of GATE-FLOOR-INTERACTION, **unchanged**: `main.js` sha256 `a0eb7b377dcdf4b9304f0c04c2dd7c3b84328d605b5bd22bc00b534b671dec67`; ADMIT line `cccaefd2…`; EXEC line `3f63ce0c…` |
| earlier evidence | GATE-FLOOR-INTERACTION freeze `80f83ad`, results `43cfd19` (Block I). Backup record `06efc5b`. Tooling fix `5dda4c5`. Design C proposal `2b53a7f` |
| independent review of `2b53a7f` | **LIMITED CORRECTION**, with three required corrections, implemented below |
| development evidence | `evidence/calibration6_*` (six-cell calibration, 30 worlds, produced by the earlier generated driver). `evidence/devcheck_cprime_*` (the C′ cells and both training regimes on the same 30 worlds with **this package's driver of record**). Structural checks `evidence/*_devworlds_*.txt` |

| required correction | implemented in |
|---|---|
| A. Adopt C′: drop `U_exec` (280 worlds, 70 per goal, paired, independently trained stores) | §3–§4. `config.mjs` declares `U_exec`, `G_off` and `G_mask` absent. The gate asserts that no such cell, and no execution-guard-only setting, is planned (P1, S3, mutant M29) |
| B. Disclose the guarded-store anomaly prominently. `G_both` = total effect of the training regime. Specify the store diagnostics. Keep UNKNOWN where unexplained | **§7**. Store diagnostics are recorded for every world. The anomaly was investigated at source and event level on development worlds, and its origin is identified there (§7.3). Anything not explained stays UNKNOWN |
| C. Pre-specify the stale-reasoning diagnostic operationally, with validated non-invasive instrumentation | **§6** (definitions, counters, handling, reporting, reading rules). Gate sections N1–N2 (neutrality), D1–D5 (correctness), K1 (scope) and M1–M14 (mutants) |

**Session accounting, stated explicitly (FACT).** C′ runs **6 sessions per world: 2 training sessions (U, G) and 4 test cells**.
Over 280 worlds that is **1,680 sessions = 560 training + 1,120 test**. The milestone brief speaks of "five cells" and "six test
sessions per world: 1,680 test sessions". Those wordings do not match the C′ that the review recommended (C minus `U_exec`, as
priced in `2b53a7f`). The 1,680 includes the 560 training sessions. No test cell was added to reach 1,680 *test* sessions.

**Other corrections found while implementing (FACT, disclosed):**

1. The frozen interaction driver's field `executedNonGraphMoves` counts non-graph *decisions*: `lastReasoning` writes, as recorded by
   `run.js`. It does not count executions. This driver names the field `nonGraphDecisions` and measures executions separately, as
   `illegalExecutions` from the diagnostic.
   - Block I's statement "0 non-graph moves under the bundle" is true for decisions.
   - For executions it holds by construction of the EXEC line.
   - I3 now checks executions directly.
2. The earlier development stale classifier (`tools/gen_session.mjs`, pass 2) was positional only: it read `lastReasoning.from` at the
   reset. The event-level classifier of §6 adds freshness. It therefore separates *carried* decisions (0.6 per session in `U_off`),
   which the old classifier counted as "decision".
3. The completeness rule for the mask setting no longer requires "masked > 0", which could fail spuriously in a world with nothing to
   mask. "0 decision-origin non-graph resets" is now implied by "0 non-graph decisions" (§6.4).

## 1. Questions

* **Q1 (training scope).** Does the floor + guard bundle stay beneficial when the training store is itself accumulated under the
  bundle?
* **Q2′ (execution-guard omission).** With the admission mask present, does the execution guard add legal goal reaches? And what does
  omitting it leave behind (the stale channel)?

**What C′ does not ask:** whether the *mask* can be omitted. That would need the execution guard without the mask. The development
comparator for it (`U_exec`) was pathological (§3) and is not part of the confirmatory design.

## 2. Evidence, kept apart

### FACT — source (pinned by the gate, section S)

| # | fact | gate |
|---|---|---|
| S1 | The two pinned guard lines are independent. ADMIT calls `__GFGUARD__.admit(...)`, and the driver's object decides. EXEC evaluates `__GFGUARD__.on && !__GFGUARD__.legalMove(agentCurrent, reasoning.to)`. A driver-level flag pair therefore switches the mask and the execution guard separately, with no tree change. | S2, N3, K1, K2 |
| S2 | `window.lastReasoning` is written only at step 0 of `runPrediction`, as an object literal `{from: currentKey, to: nextKey}`. It is never cleared (S5 invariant). | S5, S6 |
| S3 | `runAgent` starts with `__M7_TEL__.step()`. The EXEC line sits between `const reasoning = window.lastReasoning;` and `let nextStep = reasoning.to;`. The move itself is `next = window.lastReasoning.to; … agentCurrent = next;`, after the EXEC site, with no write in between. | S6 |
| S4 | About 8 % of calls take the replay branch (`liveRng() < 0.92` fails), which writes no decision. In such a call, or any call whose `runPrediction` makes no step-0 decision, the previous decision is **carried** into the call and executed from wherever the agent now is. Development: about 120 non-fresh arrivals per 1,500 calls. | source; D-section evidence |
| S5 | After a goal reset the agent is moved to a random non-goal node, but `lastReasoning` still points at the goal. A carried decision is then a **stale** goal entry from the restart position. | source; §6 evidence |
| S6 | The episode path buffer `recentMemory` is the *global* `window.recentMemory`. One push per call appends the destination (`current`) only when it differs from `agentLast`. `agentLast` lags the agent (the declared legacy deviation "stale-keyed credit through agentLast→next"). Stored autonomous-success episodes are this buffer, at most 6 nodes, plus the goal. | S6 |

### FACT — development (design input, not a claim; n as stated)

Driver fidelity: the driver of record reproduces the earlier calibration exactly. That covers 30 worlds × (2 trainings + 4 C′ cells):
legal, non-graph and total resets, guard counters, and U/G store statistics, with **0 mismatches**
(`evidence/devcheck_cprime_summary.json`).

Per-session means, floor ON, real stores (30 worlds):

| cell | legal | non-graph resets = stale + decision + carried + unclassified | illegal executions | blocked | legal reaches from a stale reasoning |
|---|---|---|---|---|---|
| U_off | 420.5 | 125.2 = 32.6 + 92.0 + 0.6 + 0 | 156.3 | 0 | 8.1 |
| U_mask | 469.0 | 30.9 = **30.9** + 0 + 0 + 0 | 30.9 | 0 | 7.0 |
| U_both | 460.9 | 0 | 0 | 31.4 (**all stale arrivals**) | 6.8 |
| G_both | 450.2 | 0 | 0 | 32.1 (**all stale arrivals**) | 6.1 |

| contrast (legal; mean [95 % CI]; paired SD), n = 30 | |
|---|---|
| PS1 scope G_both − U_both | −10.7 [−30.8, 8.9]; 57.1 |
| PS2 package G_both − U_off | +29.7 [2.6, 54.7]; 74.7 |
| PS3 execution-guard increment U_both − U_mask | −8.1 [−17.8, 2.1]; 28.5 |
| D2 retrofit U_both − U_off (Block I replicate) | +40.4 [22.9, 57.8]; 50.3 |
| M0 mask without the execution guard U_mask − U_off | +48.5 [31.1, 66.5]; 50.4 |
| *pathological comparator, not part of C′:* U_exec − U_off | *−94.0 [−114.7, −72.1]; 449 blocked ticks per session* |

Stale diagnostic at n = 30: X1 (stale share of mask-only non-graph resets) = **1.000** [1.000, 1.000]. X3 (stale share of
bundle-blocked executions) = **1.000**. XU (unclassified share) = **0**. Reading **SUPPORTED** (rules of §6.8). Arrivals per session
are about 1,383 FRESH, 2 CARRIED and 118 STALE, with 0 UNCLASSIFIED. Earlier cold-store check (8 worlds, positional classifier, from
`2b53a7f`): unguarded 25.8 stale + 35.1 decision; mask-only 30.4 stale.

Stores (30 worlds):

| | episodes | consecutive pairs | non-graph pairs | of which EXECUTED / SKIP / UNRECORDED | two-step consistent |
|---|---|---|---|---|---|
| U (unguarded training) | 236.2 | 707.6 | 100.6 | 92.3 / 8.3 / 0 | 99.9 |
| G (bundle training) | 229.9 | 734.8 | **25.8** | **0 / 25.8 / 0** | **25.8** |

### INFERENCE (with basis and limit)

1. **The mask is what removes the decision channel; the execution guard is what removes the stale channel.**
   - Under the mask no non-graph reset is a fresh or carried decision. Every residual one is a stale goal entry after a restart (S4, S5).
   - Under the bundle every blocked execution is a stale arrival.
   - Basis: dev n = 30 plus the event definitions of §6. The two channels are disjoint by definition.
2. **The execution guard's job is completeness against the stale channel, not performance.**
   - Mask-only is not worse than the bundle on legal reaches (PS3 dev −8.1 [−17.8, 2.1]).
   - Mask-only leaves about 31 illegal executions per session. All of them were goal entries from a non-adjacent restart position.
   - Whether to keep the execution guard is therefore an engineering decision (§10).
3. **A stale decision can also produce a *legal* reach,** when the restart position happens to neighbour the goal: about 6–8 per
   session in every cell. The bundle does not block these, because they are legal moves. They are counted as legal reaches, and the
   diagnostic reports them separately.
4. **A source-level fix** (clear `lastReasoning` at the reset sites, the H1-R P4 edit) would close the stale channel without blocking
   ticks. **Untested; outside C′.**

### UNKNOWN

* Whether the development signs (PS3 ≈ 0, PS1 ≈ 0) and the 100 % stale share hold at n = 280 on fresh worlds.
* Any component effect on a component-trained store, floor-in-training, and any behaviour outside the M7 bounds of §11.
* Whether the SKIP-class pairs (§7) change behaviour. They are present in both regimes, and their effect is not isolated.

## 3. Designs compared (why C′)

All designs are paired by world, hook state P, floor ON at test, one test seed per world.

| design | cells | sessions / world | n = 280 | supports | cannot support |
|---|---|---|---|---|---|
| E end-to-end | U_off, G_both | 4 | 1,120 | PS2 only | scope vs runtime guard; any component decision |
| A scope only | U_off, U_both, G_both | 5 | 1,400 | PS1, PS2 | the execution-guard question |
| **C′ (adopted)** | **U_off, U_mask, U_both, G_both** | **6** | **1,680** | PS1, PS2, PS3 with shared cells | mask omission; component × scope interaction |
| C (`2b53a7f`) | C′ + U_exec | 7 | 1,960 | C′ + "the mask cannot be omitted" | — (U_exec pathological) |

**Why U_exec is out (FACT plus INFERENCE).** Execution guard without the mask:
- blocked 449 ticks per session (30 % of calls);
- left 394 non-graph decisions per session that were then refused;
- cost 94 legal reaches.

It measures an agent that keeps re-deciding refused moves. It does not measure the value of the execution guard in any viable
configuration, and **its deficit is never used as such an estimate.** The development number stays in the record only as a labelled
pathological comparator (`config.mjs` CALIBRATION.pathologicalComparator).

`G_off` and `G_mask` are out. A guard-trained store with a weaker test guard is not a production scenario, and both are mechanistic.

## 4. Protocol (C′)

**Worlds.**
- 280 fresh worlds, indices **1392–1671**, which continue the GATE-FLOOR-INTERACTION stream (1112–1391).
- 70 per goal in {8, 12, 16, 19}.
- Same ascending accepted-configuration recurrence from `CONFIG_START`.
- Accepted seeds are below the held-out floor and are neither registered nor consumed.
- Agent seeds `trainSeed(w)` / `testSeed(w)` are fresh, inside the development domain, and disjoint from the MCF-1 blocks.

**Per world** (all hook state P, 1,500 calls, the pinned guard tree, diagnostic ON):

| # | session | seed | floor | guard setting | store | role |
|---|---|---|---|---|---|---|
| 1 | train U | trainSeed(w) | off | off | cold | the legacy store, as Block I |
| 2 | train G | trainSeed(w) | off | **both** | cold | the guarded store |
| 3 | U_off | testSeed(w) | on | off | U | legacy + floor: the package comparator |
| 4 | U_mask | testSeed(w) | on | mask | U | execution-guard omission candidate |
| 5 | U_both | testSeed(w) | on | both | U | retrofit (Block I's REAL_F1_G1) |
| 6 | G_both | testSeed(w) | on | both | G | the whole history guarded |

- **Placement and sharing.** U and G are trained independently, from the same world, configuration and training seed. Each store is
  delivered once through `loadBrain()` (episodes only) and is shared by the test cells that use it: U by three cells, G by one. Stores
  are never shared across regimes.
- **Guard settings.** `off` (mask off, execution guard off), `mask` (mask on, execution guard off), `both` (mask on, execution guard
  on). These are the flag pair of S1. There is no execution-guard-only setting, and the driver refuses one.
- **Accounting.** 1,680 sessions = 560 training + 1,120 test, with 280 per test cell and 280 per training regime. The gate checks this
  against the orchestrator's own `--plan-only` plan (P1).
- **Order.** Phase 1 trains all worlds. Phase 1b runs the store construct check and records the controls. Phase 2 runs the test cells.

## 5. Estimands and decision rules

Y_w(T, M) = legal goal reaches in the 1,500-call test session of world w. Here T ∈ {U, G} is the training regime of the delivered
store, and M ∈ {off, mask, both} is the test guard setting. Every primary contrast is a paired mean over the n = 280 included worlds,
estimated by the sample mean of per-world differences. The interval is a percentile bootstrap over worlds (10,000 resamples, seed
20261014).

| id | estimand | identified from | labels (decisive at Bonferroni-3, 98.33 %; δ = 20) |
|---|---|---|---|
| **PS1** total effect of training the store under the bundle, bundle at test | E_w[Y_w(G,both) − Y_w(U,both)] | G_both, U_both | SCOPE_BENEFIT (lb ≥ δ) · SCOPE_HARM (ub ≤ −δ) · SCOPE_NEUTRAL (−δ < lb, ub < δ) · INCONCLUSIVE |
| **PS2** package vs legacy + floor | E_w[Y_w(G,both) − Y_w(U,off)] | G_both, U_off | PACKAGE_IMPROVES (lb ≥ δ) · PACKAGE_HARMS (ub ≤ −δ) · PACKAGE_NEUTRAL · INCONCLUSIVE |
| **PS3** incremental effect of the execution guard **with the mask present** | σ_M = E_w[Y_w(U,both) − Y_w(U,mask)] | U_both, U_mask | MASK_SUPERIOR (ub ≤ −δ) · MASK_FALLS_SHORT (lb ≥ δ) · MASK_SUFFICES (ub < δ: mask-only non-inferior) · INCONCLUSIVE |

The four quantities the brief asks to keep apart:

| quantity | estimand | status |
|---|---|---|
| the mask's effect when the execution guard is absent | M0 = E_w[Y_w(U,mask) − Y_w(U,off)] | secondary, unadjusted 95 % |
| the execution guard's increment when the mask is present | PS3 | primary |
| the total effect of training under the bundle | PS1 (and, end to end, PS2) | primary |
| the stale-reasoning diagnostic | §6 | descriptive, never decisive |

PS3 is not an estimate of the execution guard's effect without the mask. C′ does not separate the components in every interaction.

- **Secondary** (unadjusted 95 %, with MDE): D2 = U_both − U_off (also instrument I6), M0, and GM = G_both − U_mask. Non-graph resets
  and total resets accompany every contrast and are never merged with legal reaches.
- **Sensitivity:** the unadjusted-95 % classification of PS1–PS3 is reported and is never decisive.
- **Goal-specific checks** (70 worlds per goal, unadjusted 95 %):
  - A goal whose PS2 interval lies wholly below 0 is a **HARM flag** that blocks the specification.
  - A goal whose PS1 interval lies wholly below 0 is reported as a scope caveat.
  - A goal whose PS3 lower bound is ≥ δ is reported as "the execution guard adds ≥ δ here".
- **Candidate-selection flags** (descriptive, as in Block I):
  - blocked share of calls in bundle cells > 5 %;
  - graph-admitted candidate count of U_mask / U_both changed by more than 5 % against U_off.

## 6. The stale-reasoning diagnostic (correction C)

### 6.1 Observation sites (all pre-existing; nothing is added to the tree)

| site | what is read | when |
|---|---|---|
| `__M7_TEL__.step()` (S3) | call index; **the identity of the `window.lastReasoning` object at call start** | top of every `runAgent` call |
| the pinned EXEC line (S1, S3) | `agentCurrent`, `reasoning.to` (the line's own arguments) and the `window.lastReasoning` object | every **arrival**: every evaluation of the EXEC site |
| the goal-reset probe | `(agentCurrent, current, goal)` | every goal reset |
| `window.recentMemory` | the episode path buffer | at every arrival (recording audit, §7) |

**Mechanism (FACT, `session.mjs`).**
- With `diag` on, the driver's `__GFGUARD__.on` is a getter returning `true`. The pinned EXEC line therefore calls
  `legalMove(agentCurrent, reasoning.to)` at every arrival.
- `legalMove` records the arrival. It returns the legality verdict only when the execution component is on, and `true` otherwise.
  With the component off, the line's condition is therefore false exactly as with `on === false`: no block and no counter change.
- The diagnostic only reads. The gate's hygiene check (S7) rejects any write to `lastReasoning` / `recentMemory`, and mutant M2 shows
  that a writing diagnostic is caught.

**Non-invasiveness (FACT, gate N1–N2).** The records below are identical between diagnostic on and off. Compared on development worlds
for all three guard settings and for both training regimes:
- decision stream sha256, run fingerprint, RNG draw counts (`cogDraws`, `visDraws`), Q sum and size, environment counters;
- start and end brain hashes per component;
- every goal reset (calls, positions), guard counters, floor counters, decision classes.

Diagnostic on also equals bare HEAD = derived = guard tree off (N1). The new driver equals the frozen interaction driver for off,
bundle and training (N3).

### 6.2 Events and classes

An **arrival** x = {call, a = agentCurrent, to = reasoning.to, rFrom, rTo = the reasoning object's fields, fresh, legal, blocked}:
- `fresh` = the reasoning object read at the site is not the object present at call start. By S2, every write creates a new object
  literal, so this means it was written during this call.
- `legal` = (a = to) or {a, to} is an edge of `connections.json`.
- `blocked` = the execution component is on and the arrival is not legal.

| class | rule | meaning |
|---|---|---|
| FRESH | rFrom = a and fresh | decided in this call at the agent's position |
| CARRIED | rFrom = a and not fresh | decided in an earlier call at the agent's current position |
| STALE | rFrom ≠ a and not fresh | decided in an earlier call **at another position**: executing it moves the agent along a pair it never decided |
| UNCLASSIFIED | any missing field; rTo ≠ to; or rFrom ≠ a while fresh (a contradiction); or the call has more than one arrival | — |

The classes are mutually exclusive and exhaustive. Ids are compared numerically.

### 6.3 Reset classification and channels

- A goal reset {call, from, to, goal} is **legal** iff {from, goal} is a graph edge and to = goal. This is the probe's own rule,
  identical to Block I.
- A reset takes the class of the **single** arrival of its own call.
- It is **UNCLASSIFIED** if that call has zero or several arrivals, or if the arrival's position or target differs from the probe's
  (a ≠ from, or to ≠ the probe's target).

Non-graph resets map to channels: STALE → **stale channel**; FRESH → **decision channel**; CARRIED → **decision channel (carried)**;
UNCLASSIFIED → unclassified. Legal resets are classified the same way, and "legal reaches from a stale reasoning" are reported.

### 6.4 Handling of special cases

| case | handling |
|---|---|
| overlap | impossible: one class per arrival, one arrival per reset; several arrivals in one call make every one of them UNCLASSIFIED |
| self-transition (a = to) | legal. Never a non-graph reset (a reset needs to = goal ≠ a). A stale self arrival is a no-op, counted in the arrival classes |
| blocked arrival | keeps its class with `blocked = true`. Never executed, never a reset (the EXEC line returns) |
| illegal execution | an arrival with legal = false and blocked = false. Counted per class (`illegalExecuted`); a non-graph reset is the goal-entry subset |
| missing instrumentation | a record without the diagnostic makes the block INVALID. An accounting identity failure (§6.5) fails I9 and voids the stale reading only |
| mask and decision channel | under the mask a FRESH or CARRIED non-graph reset needs a non-graph decision, which I3 already forbids. X2 = 0 is therefore a consequence, not an extra rule |

### 6.5 Counters per session (`rec.diag`)

The record holds:
- arrivals: total, `duplicateCalls`, and per class n, illegal, blocked, illegalExecuted, toGoalReset;
- resets: legal and nonGraph × the four classes;
- `blocked`, `illegalExecuted`;
- channels: stale, decision, decisionCarried, unclassified;
- accounting identities: legal classes sum to the legal reaches; non-graph classes sum to the non-graph resets; blocked arrivals equal
  the pinned line's own `blockedIllegal` counter; arrivals ≤ calls; no duplicate call. The analysis recomputes all of these as I9.

**Per world:** the four test cells' counters and the two training sessions'. `traceDiag` (gate only) adds the raw arrivals and resets.

### 6.6 Reporting (descriptive, unadjusted 95 %, bootstrap over the paired worlds)

| quantity | definition |
|---|---|
| per cell | mean and CI of stale, decision, decisionCarried, unclassified, illegal executions, blocked, legal-from-stale |
| **X1** | Σ_w stale(U_mask) / Σ_w nonGraph(U_mask): ratio of totals, world-resampled CI |
| X2 | (decision + carried) share of U_mask non-graph resets (expected 0, §6.4) |
| **X3** | Σ_w STALE-class blocked / Σ_w blocked, over U_both and G_both |
| **XU** | UNCLASSIFIED share of the non-graph resets of U_off and U_mask |
| residual | illegal executions per session under mask-only: what omitting the execution guard leaves |

### 6.7 Reading rules (pre-specified; `config.mjs` STALE, `classifyStale`)

| reading | rule |
|---|---|
| **VOID** | I9 failed |
| **UNRESOLVED** | mean U_mask non-graph resets < 1 per session (nothing to classify), **or** XU > 0.05, **or** X1 undefined, **or** none of the rules below applies |
| **WEAKENED** | X1 upper bound < 0.90, **or** X3 < 0.95 |
| **SUPPORTED** | X1 lower bound ≥ 0.90 **and** X3 ≥ 0.95 |

What each reading means:
- **SUPPORTED:** what the mask leaves is the stale channel, and the execution guard's blocks are exactly that channel. Retaining the
  execution guard is then a completeness decision about a known, bounded residual.
- **WEAKENED:** a material share of mask-only illegal executions is not stale. The execution guard's rationale must be re-examined
  before any specification.
- **UNRESOLVED:** there is no evidence either way.

### 6.8 Validation (gate; development worlds)

| check | content |
|---|---|
| D1 | identities hold in every diagnostic session (≥ 20), with 0 recording inconsistencies |
| D2 | an **independent** re-implementation in the verifier, written without `diag.mjs`, recomputes every reset class, illegal execution and block from the raw trace. Every arrival's target equals the reasoning read at the site |
| D3 | adversarial cases: missing fields, string ids, rTo ≠ to, fresh-but-misaligned, duplicate arrivals, position or target mismatch, stale self, stale-but-legal reset, no arrival, a synthetic session with a known answer, buffer changes (no change, clear, window shift, first, self, exec vs skip, inconsistent), store attribution, ratio interval |
| D4 | ground truths by construction: under the mask no FRESH or CARRIED non-graph reset; under the bundle every block is a STALE arrival; guarded stores carry 0 EXECUTED pairs, and every SKIP pair spans a two-step path; the store attribution recomputes from the trace |
| D5 | non-vacuity (both channels and both pair kinds occur); 0 UNCLASSIFIED |
| K1 | mask vs bundle on the same input: arrival and decision streams identical up to the first blocked arrival, which is illegal |
| mutants M1–M14 | caught: a blocking `legalMove`, a writing diagnostic, wrong freshness, ignored alignment, wrong pair kinds, ignored duplicates or targets, blocks counted as executions, wrong attribution precedence, no window shift |

## 7. The guarded-store anomaly (correction B) — prominent limitation

**Observation (FACT, dev n = 30).** Guard-trained stores contain **25.8 non-graph consecutive pairs** per store (3.6 % of pairs),
against 100.6 (13.9 %) in unguarded stores. Yet every guarded training session had **0 non-graph resets and 0 illegal executions**.
Zero non-graph resets therefore does **not** imply a store without non-graph pairs.

**What G_both estimates (pre-specified).** PS1 and PS2 estimate the **total effect of the training regime**. Training under the bundle
changes the whole trajectory, so it changes:
- acquired experience;
- episode count (229.9 vs 236.2; ratio 0.98, range 0.69–1.14);
- store size and content;
- the residual non-graph pairs.

**No contrast in C′ isolates a "store sanitisation" effect.** PS1 is not "the effect of a clean store". The G store is not a clean
store.

**Store diagnostics recorded for every world and both regimes** (orchestrator `controls.json`, analysis `stores`):

| diagnostic | source |
|---|---|
| episode count | exported store |
| consecutive non-self pairs | `storeDiagnostics` |
| non-graph pairs and share | `storeDiagnostics` |
| terminal non-graph (goal-entering) pairs | `storeDiagnostics` |
| two-step-consistent non-graph pairs | `storeDiagnostics` |
| attribution of each non-graph pair: EXECUTED / SKIP / UNRECORDED | the training session's recording audit |
| store hash, delivered-store identity in every cell | `componentHashes`, I7 |
| training legal and non-graph reaches, illegal executions, blocks, recording-audit counts | training record |
| G − U differences (episodes, non-graph pairs) and their observational association with per-world PS1 | descriptive; no mediation claim |

**Recording audit (FACT, definition).** At every arrival the driver compares the path buffer with its value at the previous arrival.
When exactly one node x was appended (window of 6), the appended pair (p → x), with p the previously last recorded node, is:
- **EXEC** if p is the position the move to x was executed from;
- **SKIP** otherwise: the recorded predecessor is not the executed origin;
- SELF if p = x.

The goal pair is classified at the reset probe. Any other buffer change is counted as inconsistent. A store's non-graph pair is:
- **EXECUTED** if it was ever appended as an executed move;
- **SKIP** if only ever appended with a mismatched predecessor;
- **UNRECORDED** if never appended in that session.

**Development result (FACT, n = 30).** In **every** guarded store, all non-graph pairs are SKIP: 25.8 / 25.8, with **0 EXECUTED and 0
UNRECORDED**. All 25.8 are two-step consistent: the two endpoints share a graph neighbour. Unguarded stores: 92.3 EXECUTED, 8.3 SKIP,
0 UNRECORDED.

**Mechanism (INFERENCE from source S6, consistent with every development observation):**
- The push into the path buffer is suppressed whenever the destination equals `agentLast`, which lags the agent.
- A return to the previous position (A → B → A), or a lag lengthened by a blocked or self call, is therefore not recorded.
- The next recorded pair then joins two nodes that the agent connected by **two legal moves**.
- These pairs are **recording artifacts of legal movement**, not executed shortcuts. The guard cannot prevent them, because they are
  not executions.
- The same rule produces SKIP pairs in unguarded stores.

**What remains UNKNOWN (preserved):**
- whether the result holds at n = 280: the confirmatory run reports it, and any UNRECORDED pair stays unexplained;
- whether SKIP pairs change behaviour, for example through `transitions`, `rewards` or replay eligibility.

**Instrument rules.** I5 requires 0 EXECUTED-class non-graph pairs in every G store: an executed non-graph pair would be a guard leak in
training, and it voids PS1/PS2. I8 raises a **FLAG** (non-voiding) if the mean non-graph share of G stores exceeds that of U stores.

## 8. Instruments, inclusion / exclusion, failure handling

| id | instrument | on failure |
|---|---|---|
| I1 | condition integrity (state P) in every training and test session, recomputed from raw numbers | block INVALID |
| I2 | floor audit in every test session | voids PS1, PS2, PS3 |
| I3 | completeness per setting. **both:** 0 non-graph resets, 0 non-graph decisions, 0 admitted non-graph candidates, 0 illegal executions. **mask:** 0 non-graph decisions, 0 admitted, 0 blocked. **off:** 0 masked, 0 blocked | voids PS1, PS2, PS3 |
| I4 | default-off, diagnostic neutrality and component scope (gate). Tree, driver and diagnostic hashes pinned in the manifest and checked at load | the analysis refuses the block |
| I5 | training fidelity: U = guard off / floor off; G = bundle / floor off; same training seed and configuration; G complete (I3 both); G store has 0 EXECUTED-class non-graph pairs | voids PS1, PS2 |
| I6 | D2 retrofit replicate, lower bound (95 %) > 0 | voids PS2 |
| I7 | pairing and store identity: one test seed and configuration per world; U store identical across its three cells and equal to its export; G store only in G_both and equal to its export | block INVALID |
| I8 | G non-graph pair share > U share | FLAG only |
| I9 | stale-diagnostic accounting identities | voids the stale reading only |

**Rules:**
- **Exclusion.** A world is excluded if any of its six sessions fails after one deterministic retry. Failure means a crash, an
  incomplete run, or a condition-integrity or completeness violation. A world is also excluded if a store fails its construct check
  or does not match its training record, or if a delivered store does not hash to its control.
- **Validity.** More than 10 % of worlds excluded makes the block **INVALID**.
- **No outcome-based exclusion.** Records of an undeclared cell or regime make the block invalid (for example, a `U_exec` record).
- **Fixed stopping.** All 280 worlds × 6 sessions; no interim analysis, no extension, no optional stopping; one frozen analysis.
  No parameter (δ, n, cells, thresholds) is chosen from the new block.

## 9. Sample size and multiplicity (unchanged from `2b53a7f`; C′ removed only a non-family diagnostic)

n ≥ ((z₁₋α/2 + z₀.₈₀)·SD/δ)², with δ = 20, decisive α = 0.05/3 (z = 2.394 + 0.842), SDs from the 30-world development calibration, and
a 25 % SD inflation.

| contrast | SD (dev) | n | n at SD × 1.25 | MDE at n = 280 (Bonf-3) |
|---|---|---|---|---|
| PS1 | 57.1 | 86 | 134 | 11.0 |
| PS2 | 74.7 | 147 | **229** | 14.4 |
| PS3 | 28.5 | 22 | 34 | 5.5 |

n = 280 ≥ 229 for every primary contrast, and keeps 70 worlds per goal for the harm checks. The gate recomputes this (P3).

Assumptions:
- the SDs are n = 30 point estimates (SE ≈ 13 %);
- worlds are independent;
- normal-approximation sizing of a bootstrap analysis;
- effects of interest are ≥ δ.

**Multiplicity:** family {PS1, PS2, PS3} at Bonferroni-3. Everything else is descriptive and unadjusted.

## 10. Decision table and falsifiers

| outcome (valid block, no voiding instrument) | engineering reading (`config.mjs` `specification`) |
|---|---|
| PS2 = PACKAGE_IMPROVES, no PS2 harm flag | a separate production-design **specification** of floor + guard is justified (not a production change) |
| PS2 ∈ {NEUTRAL, INCONCLUSIVE, HARMS} or a PS2 harm flag | not justified on this evidence |
| PS1 = SCOPE_NEUTRAL | retrofit suffices within δ: the guard need not predate the store |
| PS1 = SCOPE_BENEFIT | specify the guard from the first training run |
| PS1 = SCOPE_HARM | do not train under the bundle (retrofit-only) |
| PS3 = MASK_FALLS_SHORT | keep the execution guard: it adds ≥ δ legal reaches |
| PS3 ∈ {MASK_SUFFICES, MASK_SUPERIOR} | performance does not require the execution guard. Retaining it is a **completeness requirement for the owner**, informed by the stale reading and the residual illegal executions per session |
| stale reading WEAKENED | the execution guard's stale-channel rationale fails; re-examine before specifying |

| hypothesis | falsified by |
|---|---|
| "training under the bundle changes the bundle's yield by ≥ δ" | PS1 = SCOPE_NEUTRAL |
| "the execution guard adds ≥ δ legal reaches beyond the mask" | PS3 ∈ {MASK_SUFFICES, MASK_SUPERIOR} |
| "what the mask leaves is the stale channel" | stale reading WEAKENED (X1 upper bound < 0.90 or X3 < 0.95) |
| "guarded training never executes a non-graph pair" | any EXECUTED-class non-graph pair in a G store (I5) |

## 11. Claim limits

State P; 150-tick cap; deterministic replay; legacy stale-keyed credit; one cold 1,500-call training session per store, floor off in
training; the bundle as the only guarded training regime; mask-only tested on legacy stores only; Phase I, 1,500 calls, the graph and
goals {8, 12, 16, 19}; development-world evidence for every mechanism stated here.

C′ does not establish:
- production equivalence or readiness, routing capability or cognition;
- the execution guard's value without the mask;
- component effects on component-trained stores;
- floor-in-training;
- the behavioural effect of SKIP-class pairs.

**No statistical result decides whether a residual illegal execution is acceptable.**

## 12. Decision memo

**C′ can establish:**
1. Whether a store trained under the bundle changes the bundle's legal-reach yield (PS1).
2. Whether the full guarded package beats legacy + floor (PS2).
3. Whether, with the mask present, the execution guard adds legal reaches (PS3).
4. With pre-specified, validated instrumentation, what mask-only leaves behind (the stale channel, X1/X3/residual).
5. Whether guarded stores ever contain an executed non-graph pair (I5).

**C′ cannot establish:**
- whether the mask can be dropped;
- a pure store-sanitisation effect;
- the cause of any UNRECORDED pair;
- anything about production readiness;
- whether the stale residual is acceptable.

**What would change the engineering recommendation:**
- **PS3 = MASK_FALLS_SHORT** makes the execution guard a performance requirement, not only a completeness one.
- **Stale reading WEAKENED** removes the execution guard's stated rationale.
- **PS1 = SCOPE_HARM** forbids guarded training.
- **PS2 not IMPROVES, or a PS2 harm flag,** stops the specification.
- **An EXECUTED pair in a G store** means the guard leaks in training.

The current development expectation is PS1 ≈ 0, PS2 > 0, PS3 ≈ 0 and SUPPORTED. That outcome would give the recommendation "retrofit
the bundle (training under it is optional), and decide the execution guard on completeness grounds". It is an expectation, not a
result.

## 13. Reproduce the design verification

```bash
node experiments/gate-floor-spec/verify_gatefloorscope.mjs
node experiments/gate-floor-spec/orchestrate.mjs --plan-only --plan-json plan.json
node experiments/gate-floor-spec/tools/devcheck_cprime.mjs <outdir> 30 8
```

- The first command is the gate: about 70 development sessions plus a 12-session orchestrator self-test.
- The second prints the exact 1,680-session plan and runs no session.
- The third is the development reproduction and diagnostic evidence.

**Gate result (recorded after it ran): 93 checks passed, 0 failed; 29 mutants caught, 0 missed.** The transcript is
`evidence/gate_verify_cprime.log`.

Run 1 had 89 passed, 4 failed and 1 missed mutant. All of them were corrected before run 2:

* N4 required the floor to raise a score in every session. With the pre-trained entry-store fixture it never needs to. The check now
  requires raising only in the cold sessions (non-vacuity) and keeps the audit everywhere.
* O1 and O2 failed because a scratch diagnostic run I started concurrently rebuilt the shared guard-tree temp directory while the gate
  was using it. The self-test run alone is clean: 12/12 sessions, 0 exclusions, and the analysis accepts its records with every
  instrument OK.
* Mutant M23 was not discriminating, because its fixture broke the clean worlds too. It now models "G_both received the U store in
  every world".

Do not run two processes that build the guard tree at the same time. `buildGuardTree()` uses one shared temp directory.

**Regression:** the frozen GATE-FLOOR-INTERACTION gate, rerun unchanged on this tree, gives 87 checks passed, 0 failed; 20 mutants caught, 0 missed (results section included).

## 14. Open questions for the final review

1. Are the §6.7 reading thresholds (0.90 / 0.95 / 0.05) appropriate as pre-specified descriptive thresholds, given that the
   development values are 1.00 / 1.00 / 0?
2. Is I5's "0 EXECUTED-class non-graph pairs in G stores" the right training-fidelity condition? Should SKIP pairs be required to be
   two-step consistent as well (development: 100 %)?
3. Is the I6 retrofit replicate voiding PS2 still appropriate? It is carried forward unchanged.
