# GATE-FLOOR-PRODSEM — production-semantics investigation and design review package (self-contained; no repository access needed)

**What I need from you.** One focused adversarial review, **before any confirmatory floor-ON outcome exists and before anything
is frozen**. You do not implement code and you do not run anything. Decide whether the design in §7 is a valid, smallest test
of "does the goal-entry floor still help when traversals follow production semantics", or what limited correction it needs.
Answer §9 in the format of §10. Do not reopen MCF-1 governance, the H1-R/XFER audits, or any closed milestone.

## 1. Context in one paragraph

Three frozen, executed tests (160 / 160 / 280 fresh worlds, 1,500-call Phase I, M7 hidden-reliability harness) show a guarded,
default-off floor on the goal-entering score term — `100·max(tc, 1)` iff the candidate is the active goal **and** a legal
graph edge, **no stored episode** — raises *legal goal reaches*: conformed runtime +152.7, pristine B2 +190.2, exact audited
HEAD `0df804c` (FutureScore V2.3 live) **+62.6 [54.6, 70.6]** (REPLICATED under the frozen criteria; descriptive: real stored
episodes +19.4 [8.8, 29.8]). The remaining gap to shipped behaviour that I could name is the harness's *environment*: in every
one of those runs a large share of attempted traversals slipped (per-session attempt success 0.52–0.75 in the development
worlds measured here). Production has no such environment. The request is to
test the same intervention with the reliability environment removed so traversal outcomes follow production semantics.
Method rule given: do **not** assume that a flag called "environment OFF" is a faithful production model merely because every
traversal succeeds. So Phase 1 was a read-only investigation of what each harness switch does; §3–§6 report it.

## 2. Identities (FACT)

| | value |
|---|---|
| runtime under test | repository commit `0df804c497e649affb9e7ebacb10fdc81ab6de8d` (runtime files unchanged through current HEAD `68a945b`; `git diff` over `main.js render instrumentation experiments/m7 connections.json neurons.json` is empty) |
| bare HEAD `main.js` | blob `09c36b5c…`, sha256 `c92c5c6b6d2e32aed9114e2a8dc4075134630bfe6e5547b8052b9e8b839a3de3` (5,699 lines) |
| derived tree `main.js` | bare + two guarded call-only lines (floor line; goal-reset probe), sha256 `8cf1dc296189286113ac9daa16a28f98bbab131b18b919ec6aeb1fed4d4abc1e` — **the same pinned tree as GATE-FLOOR-HEAD**; no new runtime edit is proposed |
| tree construction | 147 runtime paths from git blobs of the commit (no checkout, no line-ending conversion), each blob id verified |
| harness | `experiments/m7/run.js` `runOnce` (unchanged), session driver of GATE-FLOOR-HEAD (one OS process per session) |

## 3. What "envMode OFF" is — the complete list of harness hooks the runtime reads (FACT; HEAD line numbers)

`grep` over `main.js`, `render/*`, `instrumentation/*` finds exactly these harness-global consumers. **The runtime never
imports `experiments/m7/env.js`**; the configuration reaches it only through `__M7_GOAL__` (goal id).

| global | read at | what it does when defined | defined by `runOnce` when | production |
|---|---|---|---|---|
| `__M7_ENV__` | main.js:5014–5020 | `_m7Traversed = env.attempt(from,to)` (Bernoulli draw from the `environment` stream, only for a legal edge, never for a goal-entering move) else `true` | `input.envMode === 'on'` | undefined → always `true` |
| `__M7_CREDIT__` | main.js:4473 (legacy attempt site), 4675 (legacy episode success), 5040–5044 | **bypasses both legacy credit sites** and credits `u→v` at the traversal site, only for real graph edges (non-edge pairs rejected) | `input.creditMode === 'on'` | undefined → legacy sites live (attempt keyed `agentLast→next`, including the temporally stale key the source documents; success on goal-verified paths) |
| `__M7_PE__` | main.js:4157–4160, 4215–4217 | pins `learningAuthority ≡ 1.0` and **disables `dampQ`** | arm ≠ OFF **and** `input.pin === 'on'` | undefined → raw `predError.learningAuthority`, `dampQ` fires when compositeError > 0.20 |
| `__M7_ARMS__` | main.js:2296, 3550 | `bayesianTrustFor` / `aggregateTrustFor` | always (identity for arm OFF and A1) | undefined → raw (identical) |
| `__M7_EPISODE_CAP__` | main.js:3268 | 150-tick episode cap (`sealCurrentEpisode('tick_cap')` + random restart) | **unconditionally** (frozen §3.7) | undefined → no cap |
| `__M7_REPLAY_ONCE__` | render/episodeManager.js:505 | replay cooldown is presence-based instead of wall-clock 4 s | **unconditionally** (determinism ruling) | undefined → wall-clock cooldown |
| `__M7_GOAL__`, `__M7_TEL__` | main.js:1139, 3255, 3473 | goal transport; telemetry call-only | goal always; TEL = my observational driver | — |
| `__MFW_STEP_LEDGER__` | main.js:4047 | **changes the reward computation** (not observational) | **never defined in any run** | undefined |

Block H (and every earlier milestone) ran `arm A1, envMode on, creditMode on, pin on`. So the harness differs from production
in **three** semantic switches, not one. Four hook states were measured:

| state | arm / envMode / creditMode / pin | meaning |
|---|---|---|
| **H** | A1 / on / on / on | block H as executed |
| **E** | A1 / **off** / on / on | the literal "envMode OFF": only the reliability draw removed; E2 credit and the PE pin remain |
| **P** | **OFF / off / off / off** | every M7 *semantic* hook undefined (cap, replay-once, goal transport retained) |
| **Ppass** | as P + `__M7_ENV__ = {attempt: () => true}` | control: an installed p = 1 environment |

## 4. The five questions, classified

**(a) Does it make every attempted legal traversal succeed?** FACT (code): yes, for E and P — `_m7Traversed` is `true` whenever
`__M7_ENV__` is falsy. FACT (measured): traversal record `a == s` on every edge, max learned cost ĉ = 1.00, env counters 0
(§5). FACT: in H the same holds for goal-entering moves and non-graph pairs (no draw), so those two classes are *unchanged* by
removing the environment.

**(b) Are reliability draws removed without changing unrelated RNG streams?** FACT: the `environment` stream
(`agentSeed ^ 0x5EED`) is drawn only inside `env.attempt` (env.js:489), never called under E/P → 0 draws. FACT: visual draws
are identical across H/E/P (3,020); cognitive draw *counts* differ (44.3k / 40.1k / 40.5k, 6-world COLD mean) because
trajectories differ, not because streams are shared. INFERENCE: pairing across arms inside one state is exact (same seeds; the
floor draws nothing; OFF-neutrality verified below).

**(c) Are candidate generation, scoring, FutureScore V2.3, the legal-edge guard and the intervention preserved?** FACT: same
source; `__M7_ARMS__` is an identity for arm OFF/A1. FutureScore V2.3 is *live* but its learned input is constant:
`ĉ = (a+1)/(s+1) = 1`, `T = −d(v,g)` ⇒ `FS(k|g) = −d(k,g)` ⇒ `futureBonus = 20·4/(4+d)` (20/16/13.3/11.4/10), a pure graph-
distance potential. **INFERENCE (high confidence):** this equals production, where no traversal fails (main.js:5051–5053
states the harness-off record is "the declared V2.2 D23 limitation"). The floor reads only (currentKey, candidate, goal, `tc`,
`structureMap.has(k)`) and the graph oracle → independent of every hook; verified (§6).

**(d) Does it change Q-learning, credit assignment, episode storage or learning order?** FACT: the *environment flag* alone
does not (learning is applied to the intended move before the E1/E2 block; same functions, same order). FACT: **E is not
production** — it keeps E2 credit and the PE pin. Measured E vs P (6 dev worlds, COLD): attempt keys 61 vs 133, credit keys 61
vs 0, learning-authority/dampQ hook calls 1,318/1,173 vs 0, Q sum 833.7 vs 806.8. Episode storage: same code path
(`autonomous_success`, mean quality 0.85 in H/E/P), counts differ with trajectory. UNKNOWN: which of credit vs PE pathway
drives the E–P outcome difference (not identified; descriptive only).

**(e) Goal resets, termination, counters?** FACT: reset logic reads only `next === goalNeuronId` (not `_m7Traversed`); the
`_goalResetJustHappened` branch skips draw and credit in every state. FACT: the 150-tick cap and the deterministic replay
cooldown are armed in **all four** states (cannot be removed without editing `runOnce`; production has neither) — retained
and carried as claim limits. `legal + non-graph == all resets` audit holds in every session. Counters
`rec.attempts/successes/slips`, `envCounters`, per-attempt success, slips per call: 0 or null under E/P (degenerate).

**UNKNOWN (not resolved, carried):** effect of the missing production cap / wall-clock replay; production goal/start
distribution (the harness goal set is {8,12,16,19}); mechanism by which legacy stale-keyed credit interacts with the floor
(outcome measured, mechanism not claimed); behaviour beyond 1,500 calls.

## 5. Measurements (read-only on the repository; scratch copies of the pinned trees; floor never ON in this table)

**Neutrality** (6 XFER-1 dev worlds × {no store, goal-entry store} = 12 sessions per state; compared: decision sequence
(`lastReasoning` writes), `pathAttempt/pathSuccess` keys, credit keys, env counters, Q entries/sum, cognitive/visual draw
counts, end-brain hash over transitions/rewards/penalties/signals/curiosity/Q/confidence/episodes):
bare HEAD == measured-OFF == armed-OFF (floor present, off) in **12/12 for each of H, E, P, Ppass**; P == Ppass in 12/12.

**Behaviour per state** (COLD, 6 dev worlds, 1,500 calls, floor OFF):

| state | resets | legal | non-graph | env draws | slips | traversal a / s | edges with slips | max ĉ | attempt keys | credit keys | Q sum |
|---|---|---|---|---|---|---|---|---|---|---|---|
| H | 440.5 | 279.3 | 161.2 | 840 | 328 | 840 / 511 | 30.3 | 5.50 | 61 | 61 | 785.4 |
| E | 419.0 | 356.0 | 63.0 | 0 | 0 | 945 / 945 | 0 | 1.00 | 61 | 61 | 833.7 |
| P | 441.0 | 391.5 | 49.5 | 0 | 0 | 942 / 942 | 0 | 1.00 | 133 | 0 | 806.8 |

**Floor-OFF calibration, 40 dev worlds (XFER-1 worlds 0–39, outside every study world; not confirmatory)**, same worlds and
seeds in every state; the H column reproduces the committed block-H calibration exactly (303.8; +60.5 [34.2, 87.2]; SD 87.3):

| | H | E | **P** |
|---|---|---|---|
| COLD legal / non-graph | 303.8 / 128.1 | 350.9 / 101.1 | **369.1 / 82.7** |
| ENTRY_NR legal | 364.4 | 440.4 | **451.2** |
| benefit ENTRY_NR − COLD, legal | +60.5 [34.2, 87.2] | +89.5 [65.3, 114.3] | **+82.0 [58.9, 105.8]** |
| benefit REAL − COLD, legal | +2.1 [−22.7, 27.4] | −7.2 [−38.2, 20.3] | **+2.3 [−27.8, 31.6]** |
| paired SD legal: REAL−COLD / ENTRY−COLD / ENTRY−REAL | 82.0 / 86.0 / 87.3 | 95.1 / 81.6 / 97.1 | **98.4 / 77.6 / 84.4** |
| non-graph share of COLD resets | 29.7 % | 22.4 % | **18.3 %** |

Paired differences (same worlds): P − H COLD legal +65.3 [35.5, 96.0], non-graph −45.4 [−67.6, −24.1]; **P − E** COLD legal
+18.3 [−3.4, 42.5], ENTRY legal +10.8 [−4.5, 27.8], ENTRY non-graph −32.1 [−49.8, −14.7]. Per-goal ENTRY benefit under P
(10 worlds each): goal 8 +89.2, 12 +90.8, **16 +39.2**, 19 +108.9 (cold levels 419 / 404 / 353 / 301). Full per-world numbers:
`GATEFLOORPRODSEM_floor_off_calibration.json`.

## 6. Intervention integrity under P (development worlds 1, 2; floor ON twice each; integrity fields only)

Two floor-ON runs are bit-identical (fingerprint, decision-sequence hash, end-brain hash, cognitive/visual draws, floor
counters). `byEdge` contains only goal-neighbour → goal edges (world 1: 11,15,17,7,9→12; world 2: 13,15,18→16); `lowered = 0`;
`maxRaise = 100`; non-legal goal-candidate evaluations (107 / 245) returned the unmodified value; `legal + nonGraph == all`
holds; env draws 0; hook state recorded as arm OFF / envMode off / creditMode off / pin off. (The pinned GATE-FLOOR-HEAD gate
also tests the legal-edge scope at **candidate** level and 10 source mutants; it will be re-run unchanged under P plus the new
checks in §7.)

## 7. Proposed design (the content that would be frozen)

**Question (unchanged):** does the floor with no stored episode raise legal goal reaches over cold? **Substrate:** the pinned
HEAD tree above (no edit). **Condition:** **P** is the single confirmatory state. E is *not* run confirmatorily; it appears
only in the non-confirmatory calibration above, as the decomposition "environment alone vs full production hook state".
Rationale for P over E: E is a hybrid that no code path of the product reaches (E2 credit and the PE pin without an
environment); P is the product's own hook state. The choice is made on semantic grounds before any floor outcome; the P−E
difference in COLD legal is +18.3 [−3.4, 42.5], so it does not depend on the intervention.

- **Retained harness deviations (declared claim limits):** 150-tick cap, deterministic replay cooldown, goal transport,
  Phase I only, 1,500 calls, one agent, cold localStorage, the accepted-configuration stream. **Under P the reliability map is
  inert, so a "world" is (goal, agent seed pair); the per-goal structure and seed governance are kept for pairing and for the
  consumed/held-out checks.**
- **Arms** (unchanged set; delivery by the single `loadBrain()` read): COLD, COLD_FLOOR, ENTRY_NR (5 × `[u, goal]` per goal
  neighbour, quality 0.49) are gating/instrument; REAL (own training store, trained under P) and REAL_FLOOR are
  **descriptive only** and gate nothing — dropping them would change no claim; retained because production agents carry
  their own store and the cost is 560 sessions.
- **Sample:** 280 fresh worlds, indices 832–1111, 70 per goal group (8/12/16/19), 1,500-call cold training session then five
  paired 1,500-call test sessions (same test seed, same configuration). 1,680 sessions.
- **Outcome (primary):** legal goal reaches per session. Reported separately, never merged: every goal reset, non-graph resets.
- **Estimands/analysis:** paired by world, absolute margins, 95 % percentile bootstrap (10,000, seed 20261014), no p-value.
- **Margins (re-derived by the rule used in every earlier milestone, not copied):** `DELTA` = a quarter of the calibrated
  ENTRY_NR legal benefit = 82.0/4 = 20.5 → **20**; `MIN_BENEFIT = 2·DELTA = 40` (below the calibration lower bound 58.9).
  Relative to cold these are 5.4 % / 10.8 %, essentially the same practical fractions as block H (4.9 % / 9.9 %). Declared,
  non-decisive sensitivity: every class recomputed at the block-H margins (15, 30).
- **Sample-size rule** `n ≥ (2.8·SD/DELTA)²`: 118 for the gating contrast ENTRY−COLD (SD 77.6), 190 for the largest legal
  paired SD of the calibration (98.4, the descriptive REAL−COLD); n = 280 covers both, and covers the gating SD inflated by
  25 % (≈183). No change to n or to the per-goal structure.
- **Claims:** C1 `benefitLower(COLD_FLOOR) ≥ 40` [gates]; C2 descriptive (REAL contrast; gates nothing); C3 `ENTRY_NR − COLD_FLOOR`
  shortfall NON_INFERIOR or EXCEEDS at DELTA 20, needs I2 [gates]; **C4 = no goal group's unadjusted 95 % interval of
  (COLD_FLOOR − COLD) wholly below 0** — the attempt-success clause is *retired because it is undefined under P* (no
  environment draw exists; success ≡ 1 by construction), I add no replacement threshold; C5 audit [gates] **extended by a
  condition-integrity check**: hook state is exactly P, env counters 0, draws 0, traversal record `a == s` on every edge,
  `legal + nonGraph == all`, floor never lowers, floor scope = legal goal-neighbour edges. Instrument I2: lower bound of
  benefit(ENTRY_NR) ≥ 40.
- **Label** (renamed because this is a semantics-transfer test, not a replication): `AUDIT_FAILED` / `HARM` /
  `NO_MEANINGFUL_BENEFIT` (C1 fails) / `TRANSFERS` (C1 ∧ C3 ∧ C4 ∧ C5, I2 valid) / `PARTIAL` (C1 holds, C3 or I2 not).
- **Validity/exclusion (unchanged):** a world is excluded only if a control fails its construct check, a session fails after one
  retry (a condition-integrity violation counts as a failure), or a delivered store does not hash to its control; > 10 %
  excluded → INVALID; no optional stopping; no outcome-based exclusion; design bound by decision digest + design digest.
- **Degenerate diagnostics (reported as degenerate, never as results):** per-attempt success, slips per call, final-hop
  retry (no draws in H either), env counters, credit-key counts under P (0 by hook state).
- **Recommendation rule (given by the Director):** C1 fails → recommend *against* a production change on this evidence;
  C1 holds → recommend a *separate production-design review*, never an automatic implementation. No production edit here.

## 8. Limits of translating an M7-harness result to production (my statement; object if wrong)

A pass would show: with the product's own credit, learning-authority and `dampQ` hook state and every traversal succeeding,
the guarded floor raises legal goal reaches over cold by ≥ 40 in a 1,500-call, 150-tick-capped, deterministic-replay, cold-
start, four-goal harness on this exact commit. It would **not** show: behaviour without the 150-tick cap or with wall-clock
replay; other goals, start nodes or graphs; behaviour beyond 1,500 calls or after Phase II; interaction with the legacy
stale-keyed credit as a *mechanism* (only the outcome is measured); user-visible quality; safety; routing capability,
learning, planning or recall. FutureScore under P is a pure graph-distance potential; the floor is therefore evaluated
*against a runtime whose goal gradient is at its cleanest*, which is the production condition, not a worst case.

## 9. Questions

1. **Faithfulness.** Is P (all M7 semantic hooks undefined; cap / replay-once / goal transport retained) an adequate
   production-semantics model, and is declaring the three retained deviations as claim limits sufficient — or must the cap be
   removed (needs a driver-side setter trap, no source edit) for the question to be answered?
2. **Condition choice.** Is selecting P over the literal envMode-OFF state E (and not running E confirmatorily) acceptable, or
   must E be a second confirmatory block?
3. **Margins.** Re-derived `DELTA = 20`, `MIN_BENEFIT = 40` with the (15, 30) sensitivity: acceptable, or retain 15/30?
4. **n.** Is n = 280 retained without change justified by §7?
5. **Claims.** Is retiring the attempt-success clause (undefined under P) without replacement, and extending C5 with the
   condition-integrity check, acceptable? Is any *existing* guard silently vacuous under P that I have not named?
6. **Arms/label.** Are REAL and REAL_FLOOR acceptable as descriptive arms? Is the renamed label set defensible?
7. **Confound.** Under P the legacy credit keys on a temporally stale `agentLast`. Must this be controlled (e.g. an
   additional arm) for C1 to be interpretable, or is describing it (UNKNOWN mechanism) enough?
8. **Anything missing or over-claimed** in §4, §6 or §8?

## 10. Answer format

For each question: `AGREE` / `AGREE WITH CLAIM LIMIT: <text>` / `OBJECT: <specific, minimal correction>`. Then at most three
numbered **required** corrections (each: what, why, how small), then one verdict: `PASS` / `PASS WITH CLAIM LIMITS` /
`LIMITED CORRECTION` / `BLOCK`. Anything you want changed that is not required, label `OPTIONAL`.
