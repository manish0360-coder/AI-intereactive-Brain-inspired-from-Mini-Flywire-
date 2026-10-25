# CREDIT-1 — credit alignment: design package and preregistration draft (revision 2)

**Status: DESIGN ONLY. Revision 2. Not frozen. No outcome exists.**
- No session has run and no seed has been generated.
- Nothing is implemented, registered or committed.
- **Not authorized:** implementation of either switch, building trees, development calibration, any session, seed or configuration generation, registry changes, commit, push.
- **Base:** HEAD `dd5b3ec`. Production `main.js` is the audited `0df804c` file (sha256 `c92c5c6b…`), unchanged since `952c9fc`.
- **LEARN-0 is untouched:** E1 = −24.4 [−36.3, −12.3], **INCONCLUSIVE**, with its frozen claim limits (D-033).

Labels: **FACT** = checked in source or in committed/verified data (file:line given); **RECORD** = stated in a committed record and
not re-checked here; **REC** = the proposed design; **HYP** = hypothesis; **UNVERIFIED** = stated but not checked.

## Revision history

| rev | date | what | record |
|---|---|---|---|
| r1 | 2026-10-25 | first design package | `review/DESIGN_r1_as_reviewed.md`, sha256 `1eba0e9b196bd96ca73b7194d7d1efd721533d4d3c07177520125e7adabbe68a` (33,913 B) |
| pre-review | 2026-10-25 | the designer's self-review | `research/external/CREDIT1_GEMINI_REVIEW_BRIEF.md` |
| Gemini round 1 | 2026-10-25 | verdict on r1: "unacceptable in present form"; overall: "READY FOR DESIGN REVISION" | `review/GEMINI_ROUND1_REVIEW.txt`, kept verbatim as received (CRLF): raw sha256 `ca0c500aff59d652488b6a2e4f3cc955a4d2d2d4be22a4a0d28d50c13e5b47d5` (9,258 B); LF-normalised `7cc87c4b252f26d83199c32cf39662d48aea6352b010d41b870ee2d63aa721e7` (9,072 B) |
| **r2** | 2026-10-25 | **this file**: the adjudication of round 1 (§10), plus the owner's decisions | owner decisions recorded below |

**Owner decisions applied in r2 (2026-10-25):**
- the 9-cell design: core cells + both goal-swapped controls + the aligned no-Q component control;
- **arm A alone as the primary intervention**, with A+ as an optional, separately specified module, not a co-primary arm;
- the adjudication and change list of the round-1 response;
- primary estimands P1 and P2 under Bonferroni-2, with the full P1 × P2 grid;
- the downhill measure exploratory only;
- all claim limits kept.

---

## 0. Questions

**Q.** With every map oracle disabled (LEARN-0's map-off procedure, hook state P), does keying the runtime's existing credit writes to
the transition the agent actually executes change how much the agent's own stored experience helps it reach the goal?

**Primary hypotheses (HYP):**

| id | hypothesis | estimand |
|---|---|---|
| H1 | Under arm A, the world's own trained store raises legal goal reaches without the map. | P1 = N1A − N0A |
| H2 | Re-keying the existing writes (arm A against legacy credit L) raises the store's effect. | P2 = (N1A − N0A) − (N1L − N0L) |

Both are statements about **arm A as a whole**. Arm A re-keys several channels at once (§2.3), so neither hypothesis is about value
propagation, any single store, or Q.

**Secondary questions** (exploratory, no labels):

| id | question | comparison |
|---|---|---|
| S1 | The legacy store's effect, on a fresh block | N1L − N0L. Descriptive; it does not re-test or relabel LEARN-0. |
| S2 | Is the aligned store's benefit specific to the goal it was trained on? | N1A − N1A× (the goal-specific part); N1A× − N0A (the goal-agnostic part) |
| S3 | Does alignment change the goal-specific part of the benefit? | (N1A − N1A×) − (N1L − N1L×) |
| S4 | Does the persisted aligned Q contribute to the aligned store's benefit? | N1A − N1A_noQ |
| S5 | **A+ module, run only if separately authorized**: does switching on the edge-filtered learners change the store effect? | (N1A+ − N0A+) − (N1A − N0A); N0A+ − N0A |

---

## 1. Facts

| # | FACT | source |
|---|---|---|
| F1 | The credit block of `runAgent` is `main.js:3961-4963`. It is one `if`, guarded by `agentLast !== null && next !== null && agentLast !== next && agentLast !== goalNeuronId`, and it runs **before** the move (`main.js:5063`). | source; `tools/census_credit_sites.mjs` |
| F2 | In call t at position p_t: `agentLast` = p_{t−1}; `agentCurrent` = p_t; `next` = `window.lastReasoning.to` = the target executed now. `prev = agentLast` and `current = next` (`4483-4484`). | source (`4967`, `5063`) |
| F3 | The TD Q update is keyed state = (`agentLast`, goal), action = `next`, next state = (`agentCurrent`, goal) (`4167-4175`, `4348-4356`). Scoring reads Q at (current position, goal) (`1735`, `1924`). | source |
| F4 | Every decision-time read of a keyed store uses the current position (`1626, 1726, 1735, 1764, 1783, 1868, 1870, 1872, 1924, 1962, 2260, 2298`). | site census, invariant I3 |
| F5 | Nothing re-decides or moves the agent between the execution probe anchor (`3641`) and the block. `next` is never reassigned inside the block. | site census, I2; source scan |
| F6 | Inside the block, `agentLast` and `agentCurrent` are assigned only at the goal reset (`4861-4862`). `goalNeuronId` is assigned only at `4309` (the emergency-recovery branch). | site census, I1; source scan |
| F7 | That recovery branch requires `window.homeNeuronId !== undefined`. `loadBrain` sets it only for a non-null stored value (`815-817`), and delivered stores carry `null` (`experiments/xfer1/brain.mjs`). A click sets it (`5537`); the harness makes no clicks. So the branch is unreachable in harness sessions by static reasoning. | source |
| F8 | LEARN-0 block-L training stores (legacy credit): 40.5 % of Q keys are pairs the agent never moved between (lag-2 only; 0.30–0.55 per world); 46.5 % of Q keys are graph edges. Signals and curiosity are 49.3 % lag-2 only; confidence 35.9 %. | `evidence/store_census_learn0_blockL.json` (raw data verified against manifest `5ac256a7…`) |
| F9 | Live decision channels that arm A re-keys: Q; trust, which enters the score as (trust − 0.5)·8 (`2296-2299`, `scoring.js:184`), with trust = (successes + 1)/(attempts + 2) (`trustMemory.js`); curiosity (visits term `1872-1873`, repetition penalty `3998-4015`); penalties (`1726`, `1870`); goal-reward keys (reward terms `1868`, `1962`; non-graph admission `1783-1790`); confidence (`1897`). | source |
| F10 | Under legacy credit, trust attempts are recorded at the lag-2 pair (`4476-4478`), while successes are recorded on executed path pairs (`4675`). | source |
| F11 | The transitions store is read three ways: it builds the candidate set (`1709-1717`), it adds `1.8·log1p(transitions[current][k])` to the score (`1932-1943`), and it decides non-graph admission (`1764`). Trajectory confidence does **not** read it: it reads `adjacencyMemory`, which is rebuilt from episodes (`953-967`). | source |
| F12 | The two edge-filtered credit sites (`4703-4712` transitions; `4960` → `render/episodeManager.js` `recordAutonomousStep` → `_learnProcedural`) write only when their pair is a graph edge. Only **18 of 246** non-reversing two-step walks (7.3 %) on this graph close a triangle. So under legacy keys these sites pass their filter on about 7 % of ordinary moves, plus the first move after a reset or hold; aligned, they pass on every legal move. | source; graph computed from `connections.json` (uniform-walk figure; the agent's real rate is UNVERIFIED) |
| F13 | Per firing, the explore pipeline (gain 0.30 × quality) adds about +6 transition strength, +1.5 reward (cap 10) and a TD Q update with reward ≈ 2.4 (`episodeManager.js:911-1013`). The authors meant it to fire on every adjacent graph step (`main.js:1758-1761`). | source |
| F14 | Q decays by 0.999 per call (`3385-3389`; the 0.9998 branch never fires, audit D8), a half-life of about 693 calls. | source |
| F15 | An existing component mask removes Q from a delivered store (`NO_Q` = all components except Q, `experiments/xfer1/config.mjs:67`). The LEARN-0 driver refuses a store from another world (`experiments/learn0/session.mjs:59`). | source |
| F16 | Per-session counts of episode-cap terminations (`main.js:3269-3294`) are not recorded by the LEARN-0 driver; its only "cap" fields are the armed flag. | source scan |
| F17 | The stream territory is recorded in LEARN-0's frozen config: indices 0–1391 used by the earlier GATE-FLOOR and XFER studies, 1392–1671 reserved by C′ (frozen, not run), 1672–2031 LEARN-0 block L. LEARN-0's development calibration used XFER-1 worlds 0–29. | RECORD (`experiments/learn0/config.mjs:60-69`) |
| F18 | Every keyed store is an exported `Map`: `Q` (`qlearning.js:12`); `transitions`, `rewards`, `penalties`, `confidenceMap`, `signals`, `curiosityMap` (`memory.js:8-44`); `pathSuccesses`, `pathAttempts` (`trustMemory.js:30-33`). | source |

---

## 2. Census and interventions

### 2.1 Classification of the 46 relevant lines (FACT; `tools/census_credit_sites.mjs`, PASS on HEAD `main.js`; 4 of 4 mutants rejected)

| class | lines | arm A | arm A+ |
|---|---|---|---|
| GUARD | 3963, 3967, 3969, 4474 | keep | keep |
| DEAD | 3990 | keep | keep |
| REKEY, origin `agentLast` → `__c1o` | 3999, 4098, 4168, 4183, 4220, 4233, 4267, 4270, 4321, 4349, 4364, 4370, 4380, 4387, 4412, 4415, 4476 | substitute | substitute |
| REKEY, target `agentCurrent` → `__c1n` | 4171, 4234, 4267, 4270, 4352 | substitute | substitute |
| REKEY, `prev` → `__c1o` | 4506, 4719, 4749, 4908, 4933, 4940 | substitute | substitute |
| HELD, edge-filtered | 4703, 4710, 4712 (transitions); 4960 (`recordAutonomousStep`) | keep | **substitute `prev` → `__c1p`** |
| HELD, not credit | 4483 (`prev` definition); 4495 (`recentMemory` push) | keep | keep |
| POSITION | 4191, 4451 | keep | keep |
| RESET | 4861, 4862 | keep | keep |
| LOG | 4338, 4758, 4867, 4945 | keep | keep |
| COMMENT | 4699 | — | — |

**Totals.** Arm A has **28** operand substitutions on 26 lines (`agentLast` 17, `agentCurrent` 5, `prev` 6). Arm A+ has **32** substitutions
on 30 lines (A plus 4).

**Tool coverage.** The census tool covers the A classification. Extending it to the A+ lines is blocker BC-1.

### 2.2 Intervention table

- "p→x" = (p_{t−1} → x_t), which is not a move. "o→x" = (p_t → x_t), the move executed this call.
- **Condition**: whether the write's firing changes.
- **Persisted**: whether the store is among the eight that are saved (F18; `saveBrain`).

| sites | store or channel | legacy key | A | A+ | condition | read by (decision path) | persisted |
|---|---|---|---|---|---|---|---|
| 4167-4175, 4348-4356 | Q, TD update | (p, g)→x; bootstraps from (p_t, g) | (o, g)→x; bootstraps from (x, g) | = A | unchanged | Q in the score (1735, 1924); thought trail (2793, 2810) | yes |
| 4219-4223 | Q, dampQ | (p, g)→x | (o, g)→x | = A | unchanged | Q | yes |
| 4321-4326; 4545 (via `key`) | curiosity | p→x | o→x | = A | unchanged | visits term (1872-1873); repetition penalty in the reward (3998) | yes |
| 4627 (via `key`); 4775 (via goal key, with the 4749 trajectory-confidence read) | rewards, goal key | p→goal | o→goal | = A | unchanged | reward terms (1868, 1962); non-graph admission (1783-1790) | yes |
| 4687, 4755, 4922 | penalties | p→x, p→goal | o→x, o→goal | = A | unchanged | 1726, 1870 | yes |
| 4691 | confidence (decrement) | p→x | o→x | = A | unchanged | 1897 | yes |
| 4935 | signals | p→x | o→x | = A | unchanged | inert at store level (XFER-1 D5) | yes |
| 4478 | trust attempts | p→x | o→x | = A | unchanged | trust term (2298) | no |
| 4096; 4182; 4233-4270; 4364-4441 (fallback branch); 4942 | emotion; transition uncertainty; semantic expectation; procedural uncertainty; semantic layer; uncertainty engine and vitality; timeMemory | p→x, or the previous move | o→x | = A | unchanged | 2029, 2138, 2176, 2260, 2276. Effect on the argmax **UNVERIFIED** | no |
| **4703-4712** | transitions count | p→x, only if an edge | **held** | o→x | **firing: ~7 % of ordinary moves → every legal move** | candidate set; `1.8·log1p` term; admission | yes |
| **4960** | explore pipeline: transitions +6q, Q (reward 2.4q), rewards +1.5q (cap 10), momentum | p→x, only if an edge | **held** | o→x | **firing: ~7 % → every legal move** | as above; momentum is write-only (audit; UNVERIFIED here) | yes |

Already aligned in every arm, and unchanged:
- goal-path rewards, confidence and trust successes, over consecutive `recentMemory` entries (`4640-4676`);
- episodes, and the success and replay pipelines;
- the post-move M7 path (`5015-5059`).

### 2.3 What arm A is, what A+ is (REC)

**Arm A: re-keying of the existing writes.**
- Every substituted write fires under the same conditions as in legacy. Only the key changes.
- It is a **bundle**: at least five live decision channels change together (F9). P2 therefore estimates the total effect of re-keying the existing writes, with no attribution to any channel.
- **Remaining confounds in A vs L:**
  - the bundle itself;
  - trust re-keying also changes within-session behaviour, including in cold cells (F10);
  - the guard and the two edge-filtered learners stay misaligned;
  - Q decay (F14);
  - random-stream shifts (comparisons are procedure-level, paired by seed).

**Arm A+: A, plus the four edge-filtered operands.**
- It is a **distinct intervention**. It changes whether two learners write (F12, F13), switching on goal-agnostic per-move reinforcement that the authors intended but legacy almost never performs.
- It answers a production-repair question: what does the fully re-keyed runtime do? It is not needed for H1 or H2.
- **Module status:** optional; specified here; not part of the authorized cell plan. Running it needs separate authorization: 3 more sessions per world, and its own instrument checks.

**Deferred: a Q-only arm (A_Q).** It would be a clean single-component contrast, but it does not answer the credit-alignment question as a whole.

---

## 3. Corrected semantics (REC)

**Definitions, for a call t that reaches the credit block:**
- `o_t := agentCurrent` and `x_t := next`, each read once at the top of the block (equal to the probe's origin and target by F5).
- The executed transition is e_t = (o_t → x_t).
- **Arm A:** every REKEY write is keyed to e_t. Pair keys become `o_t->x_t`. The Q state becomes (o_t, g), the action x_t, and the next state (x_t, g). The previous-move sites use (o_t, x_t).
- **Arm A+:** additionally, the transitions write and `recordAutonomousStep` receive (o_t, x_t) instead of (p_{t−1}, x_t).

| case | legacy | A (A+ where it differs) |
|---|---|---|
| ordinary legal move | key p_{t−1}→x_t; next state p_t | key o_t→x_t; next state x_t. A+: the transitions write and the explore pipeline also fire |
| first decision after a goal reset | already aligned (`agentLast = agentCurrent`, `4862`) | identical |
| hold (the move did not happen) | next call already aligned | identical |
| first call of a session | guard false; no credit | identical (guard kept) |
| immediate reversal (x_t = p_{t−1}) | guard false; no credit | identical (guard kept) |
| self target (x_t = o_t ≠ p_{t−1}) | key p_{t−1}→o_t | self key o_t→o_t, never read for a candidate. A+: the edge filters reject it |
| carried decision (about 8 % of calls are replay) | key p_{t−1}→stale target | key o_t→stale target, the move actually executed (possibly non-graph) |
| executed non-graph move | lag-2 key | the executed non-edge pair; A+: the edge filters reject it |
| goal entry | goal key p_{t−1}→goal; next state p_t | goal key o_t→goal; next state goal, which has no outgoing Q (bootstrap 0) |
| fallback branch (no expectation) | lag | aligned |
| sites after the goal reset (`4908`, `4933`, `4940`) | `prev` captured before the reset | `__c1o` captured before the reset (F6) |
| emergency recovery (`4309`) | unreachable (F7) | unreachable; dynamic counter required (§5) |

The reward value is identical across arms. One residual (DL-4): on carried decisions the similarity term uses `reasoning.from`, while the key uses o_t.

---

## 4. Switch and default-off evidence (REC; not implemented)

**Base.** The pinned LEARN-0 tree (`main.js` `3d3266fd…`, `render/planning.js` `34e06c65…`, from `experiments/learn0/transform.mjs`). Production is never edited.

**Two inserted declarations** (draft text; the exact bytes are fixed at implementation and checked by S-2):
```js
// (1) immediately after the block's `) {`
const __c1on = !!(globalThis.__CREDIT1__ && globalThis.__CREDIT1__.aligned === true), __c1o = __c1on ? agentCurrent : agentLast, __c1n = __c1on ? next : agentCurrent; // CREDIT-1 credit alignment (guarded, default off)
// (2) immediately after `const prev = agentLast;` (4483)
const __c1p = (__c1on && globalThis.__CREDIT1__.edgeFiltered === true) ? __c1o : prev; // CREDIT-1 A+ edge-filtered operands (guarded, default off)
```
Declaration (2) must follow `const prev`. Referencing `prev` earlier in the block would be a temporal-dead-zone `ReferenceError`.

**Telemetry, two call-only lines:**
- after the declaration: `if (globalThis.__CREDIT1_TEL__) globalThis.__CREDIT1_TEL__.begin(__c1o, next, agentLast, agentCurrent, __c1n);`
- before the closing brace: `if (globalThis.__CREDIT1_TEL__) globalThis.__CREDIT1_TEL__.end();`

**Modes:**
- global absent → legacy;
- `{ aligned: true }` → arm A;
- `{ aligned: true, edgeFiltered: true }` → arm A+.

**Static evidence required before calibration** (needs implementation authorization; no session):

| id | check |
|---|---|
| S-1 | The census is re-run on the built LEARN-0 tree `main.js`. 47 lines are expected: the 46 above plus the GATE-FLOOR-B2 goal-reset probe, classified INSTRUMENT. Any other difference stops the work. |
| S-2 | **Reverse-substitution identity**, for each of A and A+. Map `__c1o`→`agentLast`, `__c1n`→`agentCurrent`, `__c1p`→`prev` on the declared lines and delete the inserted lines. The result must be byte-identical (LF-normalised) to the tree's `main.js`. |
| S-3 | The substituted set equals the plan exactly: A has 28 on 26 lines; A+ has 32 on 30 lines. No GUARD, HELD-not-credit, RESET, POSITION or LOG line is touched. |
| S-4 | The CREDIT-1 tree differs from the LEARN-0 tree only in `main.js`. |
| S-5 | Invariants I1, I1b, I2 and I3 hold on the tree, plus "`next` is not reassigned in the block" and "the only goal assignment in the block is the recovery branch". |

**Default-off argument.** With the global absent, every substituted expression takes the value of the original operand at that point (F5, F6), and the added statements have no side effects. S-2 makes this mechanically checkable.

**Dynamic evidence, required before freeze** (from calibration; not authorized now):

| id | check |
|---|---|
| D-0 | Determinism baseline: the same LEARN-0-tree session run twice is identical. |
| D-1 | Off-parity: the CREDIT-1 tree with the global absent is 100 % identical to the LEARN-0 tree. Compared: fingerprint, `writesSha256`, end-brain and component hashes, reach call lists, move counters, guard and oracle counters, condition integrity. The parity set must meet a **coverage criterion**: each of goal entry, reset, first move after a reset, fallback-branch credit, carried decision, non-graph execution, dampQ firing, curiosity-signal write, map on, map off, a stored cell, a cold cell, training and test occurs at least once. |
| D-2 | `{ aligned: false }` with telemetry installed is identical to D-1. |
| D-3 | Instruments in aligned mode (§5). |
| D-4 | The recovery counter is 0 in every cell. |

Any difference fails.

---

## 5. Instruments (REC)

**I-CRED (wiring check).**
- Per credit event, the telemetry gives (o, x, agentLast, agentCurrent, n), and the execution probe gives (a, to) for the same call.
- **Arm A:** `o === a`, `x === to` and `n === x` in 100 % of events.
- **Legacy (positive control):** the identity rate must be < 100 % in every training session.
- **Cross-check:** on goal-entry calls, o must equal the goal-reset probe's `from`.
- Reported separately for fresh and carried decisions, with the count of `reasoning.from ≠ agentCurrent`.
- **Limit:** I-CRED compares reads of the same variable. It checks the wiring, not the keys actually written.

**I-LEDGER (the substantive instrument).**
- The driver wraps `set` observationally (record, then call) on every map in F18, including the inner maps of `transitions`. Inner maps are wrapped when they are created, through the outer wrapper.
- Each write is recorded as (call index, map, key, value delta, caller file:line from the stack).
- The census gives the expected key class for each source line: EXEC (o→x or (o, g)→x), LEGACY (p→x), PATH (consecutive `recentMemory` entries or pipeline pairs), DECAY (key-preserving).
- **Pass, arm A:**
  - every write from a REKEY line is EXEC;
  - every write from a HELD edge-filtered line is LEGACY and is an edge;
  - no write comes from an unclassified source line.
- **Pass, arm A+:** additionally, every HELD-line write is EXEC.
- **Pass, legacy (positive control):** REKEY-line writes are LEGACY, and non-edge LEGACY writes are > 0 in Q, curiosity and signals.
- **Informative events only:** events with `agentLast !== agentCurrent` (otherwise LEGACY = EXEC).
- **Gaps (documented):** non-Map session stores (emotion, semantic layers, uncertainty ledgers) are not covered.

**Fixtures (deterministic, synthetic).** One fixture per event class: ordinary legal move; goal entry with reset; first move after a reset; hold; reversal (guard skip); first call (guard skip); self target; carried decision; executed non-graph move; fallback branch; dampQ firing; curiosity-signal write; A+ edge filter pass; A+ edge filter fail.
- Expected I-CRED tuples and ledger classes are written by hand, for each of L, A and A+.
- The instruments must reproduce them exactly.
- Mutants must be caught: a missed REKEY site, an extra substituted site, `nextState` left as `agentCurrent`, the origin re-read after the reset, the flag defaulting to true, A+ operands applied in A.

**New session-record fields (observational):**
- the credit telemetry summary;
- per-episode start node and outcome: legal reach, non-graph reset, or cap termination (F16);
- a recovery-branch counter.

**Failure handling.** An I-CRED or I-LEDGER failure is systematic. It **voids the block and stops execution**; it is never handled by excluding a world.

---

## 6. Preregistration draft (REC; values marked * are fixed only at freeze)

### 6.1 Procedure
Inherited from LEARN-0:
- hook state P;
- the floor line present but never armed;
- the guard lines in diagnostic mode;
- every map oracle blocked in map-off cells;
- 1,500 calls per session;
- cold training sessions with the map off;
- one training seed and one test seed per world (as LEARN-0);
- goals {8, 12, 16, 19}, assigned by configuration index modulo 4 and balanced.

### 6.2 Cells: 9 per world (owner decision)

| cell | role | credit | delivered store | map |
|---|---|---|---|---|
| T_L | training | L | — (cold) | off |
| T_A | training | A | — (cold) | off |
| N0L | test | L | none | off |
| N1L | test | L | own T_L export (8 components) | off |
| N0A | test | A | none | off |
| N1A | test | A | own T_A export | off |
| N1A× | test | A | T_A export of π(w) | off |
| N1L× | test | L | T_L export of π(w) | off |
| N1A_noQ | test | A | own T_A export with Q removed (`NO_Q` mask) | off |

**Pairing.** π(w) = 4·⌊w/4⌋ + ((w + 1) mod 4).
- The block starts at an index ≡ 0 mod 4, so each quartet holds the four goals in cycle order, and π(w) trains toward the next goal g′ ≠ g.
- π is a bijection: every export is used once as "own" and once as "swapped".
- The delivered store never carries a goal or a home node: the harness sets the goal (`experiments/xfer1/config.mjs`).
- The driver must accept `brainWorld = π(w)` for the two swap cells only (F15).

**Optional A+ module** (not authorized): T_A+, N0A+, N1A+, with the same procedure.

### 6.3 Primary family (Bonferroni-2)

| claim | estimand (per world, paired) | margin | labels |
|---|---|---|---|
| P1 | Y(N1A) − Y(N0A), with Y = legal goal reaches per 1,500-call session | δ = 20 | LEARNS / NO_PRACTICAL_EFFECT / HARMS / INCONCLUSIVE |
| P2 | [Y(N1A) − Y(N0A)] − [Y(N1L) − Y(N0L)] | δ = 20 | RAISES / NO_PRACTICAL_DIFFERENCE / LOWERS / INCONCLUSIVE |

**Interval.** A two-sided **97.5 %** paired percentile bootstrap over worlds (10,000 resamples; seed fixed at freeze*).

**Label rule:**
- positive label if lower ≥ +δ;
- negative label if upper ≤ −δ;
- no-practical label if the whole interval lies inside (−δ, +δ);
- otherwise INCONCLUSIVE.

**Sensitivity** (decides nothing): δ = 15 and δ = 30.

**Why both claims are needed.** They are distinct. P2 can be RAISES while P1 is not LEARNS: alignment removes harm without a demonstrated benefit. And P1 can be LEARNS while P2 is not RAISES.

### 6.4 Decision grid (exhaustive)

| P2 \ P1 | LEARNS | NO_PRACTICAL_EFFECT | INCONCLUSIVE | HARMS |
|---|---|---|---|---|
| RAISES | R1 | R2 | R2 | R3 |
| NO_PRACTICAL_DIFFERENCE | R4 | R5 | R6 | R5 |
| LOWERS | R7 | R7 | R7 | R7 |
| INCONCLUSIVE | R8 | R6 | R6 | R6 |

| row | strongest allowed sentence | next decision |
|---|---|---|
| R1 | Without the map, under arm A the world's own store raises legal goal reaches by ≥ δ over a cold agent, and re-keying the existing credit writes raises the store's effect by ≥ δ relative to legacy credit. This is about re-keying as a whole. | replication on a fresh block, then a production-repair design (G1 candidate). No production edit from this study. |
| R2 | Re-keying raises the store's effect by ≥ δ. The aligned store is not shown to raise legal reaches by δ: with P1 NO_PRACTICAL_EFFECT its effect lies within ±δ; with P1 INCONCLUSIVE it is undetermined. "Removes harm" is said only if S1's 95 % interval lies wholly at or below −δ. | owner decision (open policy question OQ-1) |
| R3 | Re-keying raises the store's effect by ≥ δ, but the aligned store still lowers legal reaches by ≥ δ. | diagnostic study |
| R4 | Under arm A the store raises legal reaches by ≥ δ, but re-keying makes no practical difference relative to legacy. Alignment is not shown to be the reason. | Director |
| R5 | In this implementation (arm A, hook state P, 1,500 calls), re-keying the existing writes does not make the store useful without the map, and differs from legacy by less than δ. **This does not show that model-free credit alignment cannot work.** The guard, A+, Q decay and longer horizons are untested. | owner decision (OQ-1): deprioritize this repair; CREDIT-2 or MODEL-1 |
| R6 | None beyond the intervals. | Director |
| R7 | Re-keying lowers the store's effect by ≥ δ. | diagnostic before any production step |
| R8 | Under arm A the store raises legal reaches by ≥ δ; the role of alignment is undetermined. | Director |

**Interpretation rules:**
- INCONCLUSIVE is never read as "no effect".
- NO_PRACTICAL_EFFECT and NO_PRACTICAL_DIFFERENCE are equivalence statements within ±δ. They are not statements of exactly zero.
- No row makes a claim about value propagation, any single channel, or impossibility.

### 6.5 Secondary comparisons and mediators (exploratory: unadjusted 95 %, no labels, no claims)

**S1–S4 (§0).**
- S2 measures goal-specificity of the benefit through **any** mechanism. Goal-keyed Q is unreadable under a different goal (Q is goal-specific by construction), and goal-entry familiarity is goal-specific too. S2 does not single out values.
- S4 measures whether the **persisted** aligned Q contributes, holding all other own-store components fixed. It does not test whether aligning Q causes P2; that needs the deferred A_Q arm.
- S2 and S3 are computed on worlds whose swap cells are valid.

**Mediators:**

| id | mediator | definition and limits |
|---|---|---|
| M1 | **Excess downhill share** (D − C) | Over legal executed moves made at true distance d ≥ 2 from node u: the mean of [the move reduces true distance] minus the share of u's graph neighbours that are closer to the goal. Compared between cells (N1A vs N0A, N1A vs N1L). Computed after the fact by the harness from `connections.json`; **never available to the agent**. It measures how much more often than a uniformly random neighbour choice, at the nodes actually visited, the agent's legal moves descend true shortest-path distance. It cannot establish that the agent represents distance or plans, which channel is responsible, or route efficiency, and it is conditioned on which nodes are visited. **No claim requires it.** |
| M2 | Episode outcomes (map-free) | Shares of episodes ending in a legal reach, a non-graph reset or a cap termination; calls per episode (new field, §5). |
| M3 | Goal-entry share | From goal-adjacent nodes (LEARN-0 S4 instrument). |
| M4 | Shortcut channel | Admitted non-graph candidates, non-graph resets, illegal executions. |
| M5 | Within-session learning | Late minus early halves, in N0A and N0L. |
| M6 | Manipulation check | Lag-2-only share and edge share of the T_A vs T_L exports (`census_learn0_stores.mjs` method). Predicted before data: the T_A Q lag-2-only share is < 0.05; it is not exactly 0, because the held explore pipeline still writes triangle pairs. |
| M7 | Instrument rates | Per cell. |

**Multi-step success.** Each legal reach begins at a uniformly random reset node and needs a complete legal path. Legal reaches therefore already measure multi-step success, and no claim requires M1.

### 6.6 Validity, exclusions, stopping
- **Instruments that void a session or world** (LEARN-0's): I1 condition integrity; I2 oracle leakage; I3 store identity, which here also covers the `NO_Q` mask and the π source; I4 pairing; I5 training fidelity; I6 default-off and tree pins; I7 store provenance for both training exports.
- **I-CRED and I-LEDGER** void the block (§5).
- **World exclusion**, for any of these after one retry: a crash, an incomplete run, an integrity violation, oracle leakage, a store-delivery mismatch, or a training export failing provenance.
  - **Primary analysis:** a world is analysable if its six core sessions and its own two exports are valid. Swap-cell failures do not affect P1 or P2.
  - **S2 and S3:** a world also needs its two swap cells; an export that fails removes π⁻¹(w) from S2 and S3.
- **Limit:** at most 10 % of worlds excluded from the primary analysis; otherwise the block is invalid.
- **Stopping:** fixed n, one block, one frozen analysis, no interim look.

### 6.7 Sample size
- **Rule:** n ≥ ((z_{1−0.025/2} + z_{0.80}) × 1.25 × SD / δ)², per claim; take the larger, rounded up to a multiple of 4.
  - z_{1−0.025/2} = 2.2414 and z_{0.80} = 0.8416, so their sum is 3.0830.
- **SDs** come from calibration, for P1 and for P2. **P2's SD (a difference in differences) is estimated directly.**
- **Power to label equivalence** is reported for both claims at a true effect of 0.
- **Illustration only** (not a design value), using LEARN-0 figures:

| claim | SD assumed | n |
|---|---|---|
| P1 | block-L E1 SD 114.5 | ≈ 488 |
| P2 | √2 × 114.5 = 161.9 if the two store effects are uncorrelated | ≈ 976 |
| P2 | 114.5 if correlated at 0.5 | ≈ 488 |

That is 9 × n ≈ 4,392–8,784 sessions.

### 6.8 Territory
- The confirmatory block is stream indices from **2032** (F17), contiguous, starting ≡ 0 mod 4.
- Configurations are generated only at the freeze milestone, which needs separate authorization.
- **Collision check** against: the registry's consumed and held-out ranges; LEARN-0's reserved ranges (0–1391, 1392–1671); block L; and every committed study plan that can be found.
- **Registry record** of consumed territory before freeze: an owner decision (OQ-2).

### 6.9 Claim limits
- Every claim is about **re-keying the existing credit writes (arm A) as a whole**, not about value propagation, Q, or any single channel.
- **Scope:** the world's own store in the same world and goal (S2–S4 aside); hook state P; the map-off procedure; 1,500 calls; the graph and goals {8, 12, 16, 19}.
- **Never licensed:** map-free spatial reasoning, abstract route planning, transfer, recall, understanding, cognition, production equivalence or readiness, impossibility of model-free credit alignment.
- **An R1 outcome** may reflect experience-derived, path-keyed values and graph familiarity.
- **A+** results, if run, are module results and change no primary label.
- **LEARN-0** is untouched.

---

## 7. Gate and mutation plan (REC; code not written)

| check | asserts |
|---|---|
| T1 | each transform anchor matches exactly once, in context |
| T2 | S-2 reverse-substitution identity, for A and A+ |
| T3 | S-3 substitution sets; census re-run on the tree (47 lines) |
| T4 | D-0 to D-2 parity with coverage (needs sessions) |
| T5 | I-CRED fixtures, for L, A and A+ |
| T6 | I-LEDGER fixtures: exact class counts; the legacy positive control is non-zero |
| T7 | HELD lines receive legacy operands in A and aligned operands in A+; the guard is unchanged |
| T8 | analysis: label rules at δ boundaries; level 0.975; the grid is exhaustive (16 cells → R1–R8); interval count |
| T9 | pairing: π is a bijection, g′ ≠ g, goals balanced; swap stores hash-checked against π(w)'s exports; the `NO_Q` mask removes exactly Q |
| T10 | seeds: no collision (§6.8); no confirmatory configuration before freeze |
| T11 | freeze verifier with line-ending-independent pins |

**Mutants:**
- each REKEY site left unsubstituted (26, caught by T3, T6);
- a GUARD, HELD-not-credit or RESET site substituted (T3, T7);
- A+ operands applied in A (T6, T7);
- `nextState` unchanged (T5);
- the origin re-read after the reset (T5);
- the flag defaulting on (T2, T4);
- a telemetry hook with a side effect (T4);
- π equal to the identity (T9);
- the `NO_Q` mask removing more than Q (T9);
- the level set to 0.95 (T8);
- grid rows reordered or missing (T8);
- the identity tolerance relaxed to 99 % (T5);
- a block overlapping 0–2031 (T10).

---

## 8. Development calibration plan (REC; NOT authorized)
- **Domain:** development worlds only, following LEARN-0's precedent of XFER-1 worlds 0–29 (F17). Never inside the confirmatory block.
- **Scale:** about 30–40 worlds × 9 cells, about 270–360 sessions. If the A+ module is authorized, its cells are added.
- **Purposes:**
  - static S-1 to S-5 already passed (this is a prerequisite);
  - D-0 to D-4 with coverage;
  - I-CRED and I-LEDGER at 100 % in A (and A+), discriminating in L;
  - SDs for P1 and P2;
  - the self-target, carried-decision and fallback-branch frequencies;
  - the edge-filtered firing rate under L (checks F12);
  - throughput.
- **Afterwards:** only n changes. Anything else is a disclosed revision before freeze.

---

## 9. Blockers and the evidence that clears each

**Before calibration (BC):**

| id | blocker | evidence |
|---|---|---|
| BC-1 | Operand-level arm definitions | `census_credit_sites.mjs` extended to classify the A+ lines; S-3 sets written |
| BC-2 | Driver requirements for the 9 cells | cross-world delivery for N1A× and N1L× only; the `NO_Q` mask; the new session fields (§5) |
| BC-3 | Complete write-site census of `main.js` and `render/*.js`, including session stores and their readers | tool output with zero unclassified write sites; mutants caught |
| BC-4 | Instrument logic on synthetic fixtures | one fixture per event class (§5), hand-written expectations, mutants caught |
| BC-5 | I-LEDGER specification and implementation plan | map list (F18); inner-map wrapping; source-line attribution; non-Map gaps documented |
| BC-6 | Static S-1 to S-5 on built trees | needs implementation authorization |
| BC-7 | Calibration protocol | named worlds, coverage list, determinism baseline, pass rules |

**Before freeze (BF):**

| id | blocker | evidence |
|---|---|---|
| BF-1 | Primary family, grid, claim limits and sensitivity analyses | §6 at freeze |
| BF-2 | Dynamic parity | D-0 to D-4 from calibration, 100 % with coverage |
| BF-3 | Instruments end to end | I-CRED, I-LEDGER |
| BF-4 | n | from calibration SDs, including P2's directly estimated SD; equivalence power |
| BF-5 | Territory | verified ranges; collision check; registry record (OQ-2) |
| BF-6 | Failure handling | §6.6 |
| BF-7 | Mediator definitions | M1 to M7 |
| BF-8 | Second-round independent review of this revision | — |

**Documented and deferred (DL):**
- DL-1: guard alignment (reversals, first call), for CREDIT-2.
- DL-2: Q decay.
- DL-3: the A_Q arm.
- DL-4: the similarity term on carried decisions.
- DL-5: self-target frequency.
- DL-6: Q's built-in goal-specificity in S2.
- DL-7: M1's construct validity.
- DL-8: non-Map session stores outside the ledger.

---

## 10. Adjudication of Gemini round 1 (summary; full reasoning in the r2 review package)

| issue | round-1 position | resolution in r2 |
|---|---|---|
| Q-only primary (pre-review I-1) | REJECT | **Accepted:** not the primary. Deferred as A_Q (DL-3). The objection "impossible to attribute" is overstated: A_Q against L is a single-component contrast whose limit is generalisation. |
| Two arms A and A+ | required | **Partly accepted:** A is the primary; A+ is an optional module (owner decision). A+ re-keys 32 operands, not 28; it is an activation intervention (F12, F13). |
| Held sites "keyed at the most influential read sites" | flaw | **Corrected:** the transitions store is influential (F11). But trajectory confidence reads episodes, not transitions, and the main effect of re-keying is activation, not a change of key. |
| Goal-swap vs no-Q | keep swap; reject no-Q | **Swap kept (S2), with a legacy swap added (S3).** No-Q is kept as a separate component control (S4). It removes Q only, not rewards. |
| P3 "mathematically invalid" | demote | **Demoted to M1.** The invalidity claim is rejected: D is computed by the harness, never by the agent. Demotion is justified on construct validity. |
| Bonferroni-2, P1 and P2 | required | **Accepted.** |
| R4 "retire model-free credit alignment" | proposed | **Replaced by R5**, scoped to this implementation. |
| 5-step fixtures | required | **Accepted and expanded** to every event class. |
| Registry logging of LEARN-0 and C′ | required before freeze | **Accepted (BF-5)** and broadened to every committed plan. |
| Guard alignment and Q decay deferred | agreed | **Agreed (DL-1, DL-2).** |

## 11. Unverified facts
1. Whether emotion, procedural uncertainty, transition uncertainty and the semantic layers change the argmax.
2. The firing rate of the edge-filtered sites under L in real sessions (F12 is a uniform-walk figure).
3. The 47-line census on the built tree.
4. The `render/*.js` write census.
5. That momentum is write-only.
6. Throughput, determinism and the SD of P2 on the new tree.
7. Exact stream positions of the earlier blocks inside 0–1391 (recorded in aggregate only, F17).

## 12. Open policy questions (owner)
- **OQ-1:** the next decision for R2 (alignment raises the store's effect, no demonstrated benefit) and for R5: a production repair on correctness grounds, CREDIT-2, or MODEL-1.
- **OQ-2:** a registry governance milestone recording consumed territory before freeze.
- **OQ-3:** whether and when to authorize the A+ module.
- **OQ-4:** authorization of the implementation milestone, which clears BC-1 to BC-7 except calibration itself.

## 13. What this package does not do
- It implements nothing and builds no tree.
- It runs no session and generates no seed or configuration.
- It changes no production, frozen, registry or result file.
- It does not re-test or relabel LEARN-0.
- It claims nothing about cognition.
