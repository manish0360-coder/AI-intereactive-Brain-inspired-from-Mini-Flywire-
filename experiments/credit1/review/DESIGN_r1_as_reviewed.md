# CREDIT-1 — credit alignment: design package and preregistration draft

**Status: DESIGN ONLY. Not frozen, not reviewed, no outcome exists.**
- Authorized by the owner on 2026-10-25 as Milestone B of CREDIT-1 (design-only package).
- **Not authorized:** implementation of the switch, development calibration, any session, seed generation, registration, commit or push.
- No production file, frozen artifact, registry file or result was changed.
- Base: HEAD `dd5b3ec`. Production `main.js` is unchanged since `952c9fc`; it is the audited `0df804c` file (sha256 `c92c5c6b…`).
- LEARN-0 stays as frozen: E1 = −24.4 [−36.3, −12.3], **INCONCLUSIVE**, with its frozen claim limits (D-033). Nothing here relabels it.

Labels: **FACT** = verified in this package from source or committed/verified data; **REC** = proposed design (a recommendation, not
yet adopted); **HYP** = hypothesis; **OPEN** = unresolved, for review.

What exists in this directory:

| file | what it is |
|---|---|
| `tools/census_credit_sites.mjs` | read-only static census of the credit site in `main.js`; refuses on any unclassified occurrence or broken invariant |
| `tools/census_learn0_stores.mjs` | read-only census of the 360 LEARN-0 block-L training stores (edge share and lag classes) |
| `evidence/site_census.json` | output of the site census on HEAD `main.js` (PASS) |
| `evidence/store_census_learn0_blockL.json` | output of the store census (input verified first with `verify_archive_blockL.mjs --dir`) |

No switch, transform, driver, analysis or gate code exists. Sections 4–8 specify them.

---

## 0. The question

**Q.** With every map oracle disabled (the LEARN-0 map-off procedure, hook state P), does credit keyed to the transition the agent
actually executes turn the agent's own experience into goal-directed behaviour?

| id | hypothesis (HYP) | discriminator |
|---|---|---|
| H1 | Under aligned credit, the world's own trained store raises legal goal reaches without the map. | P1: N1A − N0A ≥ δ |
| H2 | The credit alignment is what makes the store useful: it raises the store's effect relative to the legacy credit site. | P2: (N1A − N0A) − (N1L − N0L) ≥ δ |
| H3 | The gain comes with more multi-step goal direction, not only one-step goal entry or fewer shortcuts. | P3: downhill share of legal moves at true distance ≥ 2, N1A − N0A ≥ δ_d |

**Why H3 is needed.** XFER-2 and the GATE-FLOOR studies showed that a store can raise goal reaches through one-step goal-entry gating alone. The post-hoc LEARN-0 review pointed the same way. The downhill share at distance ≥ 2 cannot be moved by goal-entry gating, so it separates value propagation from that known mechanism.

---

## 1. Facts this design rests on

| # | FACT | source |
|---|---|---|
| F1 | The credit (self-learning) block of `runAgent` is `main.js:3961-4963`: one `if` guarded by `agentLast !== null && next !== null && agentLast !== next && agentLast !== goalNeuronId`. It runs **before** the move (`agentCurrent = next`, `main.js:5063`). | source; site census |
| F2 | In a call t at a position p_t: `agentLast` = p_{t−1}, `agentCurrent` = p_t, and `next` = `window.lastReasoning.to` = the target being executed now. `prev = agentLast` and `current = next` (`main.js:4483-4484`). | source (`agentLast = agentCurrent` at `4967`, before the move at `5063`) |
| F3 | The TD Q update is keyed `state = makeStateKey(agentLast, goal)`, `action = next`, `nextState = makeStateKey(agentCurrent, goal)` (`main.js:4167-4175`, fallback `4348-4356`). Scoring reads Q at the **current** position: `getQ(makeStateKey(currentKey, goal), k)` (`main.js:1735`, `1924`). Write and read keys therefore differ by one position. | source |
| F4 | Every decision-time read of a persisted relational store is keyed at the current position: Q, rewards, penalties, curiosity, transitions, trust and transition uncertainty (`main.js:1626, 1726, 1735, 1764, 1783, 1868, 1870, 1872, 1924, 1962, 2260, 2298`). | site census, invariant I3 |
| F5 | Between the execution probe anchor (`let nextStep = reasoning.to;`, `main.js:3641`) and the block, nothing re-decides or moves the agent. `next = window.lastReasoning.to;` appears exactly once. So at the credit site `agentCurrent` equals the probe's recorded origin, and `next` equals its recorded target. | site census, invariant I2 |
| F6 | Inside the block, `agentLast` and `agentCurrent` are assigned only at the goal reset (`main.js:4861-4862`). Every operand the design re-keys either precedes the reset or uses `prev`, which is captured before it. | site census, invariants I1, I1b |
| F7 | In the 360 LEARN-0 block-L training stores (legacy credit, map off): **40.5 %** of Q keys are lag-2-only pairs, i.e. never an executed move (per world 0.30–0.55). Only **46.5 %** of Q keys (62.0 % of Q mass) are graph edges. Signals and curiosity are 49.3 % lag-2-only, confidence 35.9 %. Rewards (6.1 %), transitions (5.9 %), penalties (4.8 %) and episodes (0.6 %) are mostly lag-1. | store census (raw data verified against manifest `5ac256a7…`) |
| F8 | The defect is documented and was deliberately not repaired: `main.js:4471-4472` ("known temporal misalignment, which is deliberately preserved for G1 parity (ERR-05 §4)"); M7 ERR-05 §4 (trust keys: 48 of 63 non-edges); GATE-FLOOR-PRODSEM results ("a known temporal misalignment relative to the intended credit semantics"); LEARN-0 DESIGN OPEN-8; D-033. | committed records |
| F9 | An aligned credit pattern already exists in production for the M7 path: after `agentLast = agentCurrent` (`4967`), `_m7From = agentLast` is the true origin of the attempted move, used by `recordTraversal` and `recordTraversalOutcome` (`main.js:5015-5059`). | source |
| F10 | Q decays by 0.999 per call for every key (`main.js:3385-3389`). The 0.9998 branch never fires: it reads `rewards` with a Q-namespace key (audit D8). The Q half-life is therefore about 693 calls. | source |
| F11 | The persisted brain is eight stores: transitions, rewards, penalties, signals, curiosity, Q, confidence and episodes (`saveBrain`, `main.js:709-740`; `experiments/xfer1/brain.mjs`). | source |
| F12 | Signals alone and confidence alone had **no effect** on any endpoint in any world (XFER-1 D5, B2-conformed tree). Persisted rewards alone lowered goal reaches (XFER-1 D2). | committed XFER-1 results |

---

## 2. Census of the credit site

### 2.1 Operand pairs that coexist in the block (FACT)

| pair | meaning | used by |
|---|---|---|
| (`agentLast`, `next`) / (`prev`, `current`) | p_{t−1} → x_t: **not a move**, except right after a reset or a hold, where `agentLast === agentCurrent` | TD Q, dampQ, curiosity, penalties, goal-reward key, confidence penalty, signals, timeMemory, trust attempts, transition uncertainty, emotion, semantic layer, uncertainty engine |
| (`agentLast`, `agentCurrent`) | p_{t−1} → p_t: the **previous** executed move, credited one call late with this call's outcome | semantic expectation outcome, procedural uncertainty, uncertainty propagation |
| (`agentCurrent`/`reasoning.from`, `next`) | p_t → x_t: **the move executed now** | the reward signal itself (goal test on `next`; similarity from `reasoning.from`, `main.js:3655`), the execution probe, the goal-reset probe of the experiment trees |
| consecutive `recentMemory` entries | executed path, lag 1 | goal-path rewards, confidence and trust success (`main.js:4640-4676`); episodes; the success and replay pipelines |

### 2.2 Classification of every occurrence (FACT; verified by `tools/census_credit_sites.mjs`)

There are 46 lines in the block that name `agentLast`, `prev` or `agentCurrent`.

| class | lines | action in arm A |
|---|---|---|
| GUARD | 3963, 3967, 3969, 4474 | keep: the guard decides **when** credit happens |
| DEAD | 3990 | keep: `agentLast === next` cannot hold inside the guard |
| REKEY, origin (`agentLast` → `__c1o`) | 3999 repeat-penalty read · 4098 emotion · 4168 TD state · 4183 transition uncertainty · 4220 dampQ · 4233 semantic expectation (from) · 4267, 4270 uncertainty (from) · 4321 curiosity write · 4349 fallback TD state · 4364, 4370, 4380, 4387 semantic layer · 4412 uncertainty engine and vitality key · 4415 predicted-Q read · 4476 trust attempt | re-key to the executed origin |
| REKEY, target (`agentCurrent` → `__c1n`) | 4171 and 4352 TD `nextState` · 4234 semantic expectation (to) · 4267, 4270 uncertainty (to) | re-key to the executed target |
| REKEY, origin (`prev` → `__c1o`) | 4506 `key` (curiosity, goal reward, penalty, confidence penalty) · 4719 goal key (shortcut penalty, scaled goal reward) · 4749 final-step trajectory confidence · 4908 bad-path penalty · 4933 signals · 4940 timeMemory | re-key to the executed origin |
| POSITION | 4191, 4451 | keep: single position, no pair |
| HELD | 4483 `prev` definition · 4495 recentMemory push · 4703/4710/4712 transitions write · 4960 `recordAutonomousStep` | keep (§2.4) |
| RESET | 4861, 4862 | keep: position assignment at the goal reset |
| LOG | 4338, 4758, 4867, 4945 | keep: console output only |
| COMMENT | 4699 | — |

The totals are: 26 lines re-keyed, with **28 operand substitutions** (`agentLast` 17, `agentCurrent` 5, `prev` 6), plus one inserted declaration line (§4).

**Tool check.** The tool also refuses four mutated copies of `main.js`:
- a re-keyed TD state;
- a `runPrediction` call between the probe and the block;
- an assignment to `agentLast` inside the block;
- an extra occurrence.

### 2.3 Stores affected (FACT; persistence from F11)

| store | persisted | re-keyed writes in arm A | held or already-aligned writes |
|---|---|---|---|
| Q | yes | TD update (4167, 4348); dampQ (4219) | success/replay pipeline (path pairs, aligned); explore-step pipeline (held) |
| curiosity | yes | 4321 (from prediction error); 4545 (via `key`) | — |
| rewards | yes | goal key 4627 (via `key`); scaled goal reward 4775 (via goal key) | goal-path rewards 4640-4648 (aligned); explore pipeline (held) |
| penalties | yes | 4687, 4755, 4922 | — |
| confidence | yes | penalty decrement 4691 | goal-path +5 (aligned) |
| signals | yes | 4935 | — (behaviourally inert, F12) |
| transitions | yes | — | 4709-4712 (held; edge-filtered); success/replay pipeline (aligned) |
| episodes | yes | — | `recentMemory` paths (aligned) |
| trust attempts, transition uncertainty, emotion, semantic layer, vitality, uncertainty engine, timeMemory | no (session-only) | the sites listed in §2.2 | — |

### 2.4 Repair scope and its reasons (REC)

**Rule for arm A: re-key a write only if re-keying changes where the write lands, never whether it happens.**

**Arm A re-keys** every site whose execution does not depend on its key pair. That is all 26 REKEY lines. They fire on every
credit event (or under conditions unrelated to the key), so arm A changes their keys and leaves the number and timing of writes unchanged.

**Held at legacy operands in arm A:**
- **The transitions write (`main.js:4703-4712`) and `recordAutonomousStep` (`4960`).** Both write only when their pair is a graph edge.
  - Under legacy keys they fire only on triangles (p_{t−1} adjacent to x_t).
  - Re-keyed, they would fire on **every** legal move. That is +1 transition count, and through the autonomous-explore pipeline
    (gain 0.30 × quality) about +6 transition strength, +1.5 reward (cap 10) and a Q write with reward ≈ 2.4 per move (`render/episodeManager.js:911-1013`).
  - This would switch on a goal-agnostic, habit-like reinforcement that the legacy runtime almost never performs. XFER-1 found that persisted rewards are harmful (F12).
  - Re-keying them is therefore a second intervention (dormant-mechanism activation), not a re-keying. It is offered as the optional arm A+ (§6.2).
- **The guard.** It decides when credit happens. Re-keying it would add credit events (reversals A→B→A and the first call), so arm A keeps it. The consequence stays open (O3): reversals and first-call moves remain uncredited in both arms.
- **The `recentMemory` push condition.** It maintains the path buffer, not a credit key.

**Why not re-key Q only?** Q is combined in one score with rewards, penalties and curiosity, and all of them carry the same defect.
- Repairing Q alone would create a new mismatch between stores that the runtime adds together.
- The production decision this study informs concerns the credit site as a whole.
- The Q-only variant is listed as an alternative (A-Q, O1). The mediators (§6.5) and H3 locate the mechanism.

---

## 3. Corrected credit semantics (REC)

**Definitions, for a call t that reaches the credit block:**
- `o_t := agentCurrent`, read once at the top of the block. This is the position from which this call's move is executed. It equals the probe's `a` by F5.
- `x_t := next`. This is the executed target. It equals the probe's `to` by F5.
- The executed transition is e_t = (o_t → x_t).
- **Aligned credit** keys every re-keyed write to e_t:
  - pair keys become `o_t->x_t`;
  - the Q state becomes `o_t#g`, the action `x_t`, and the next state `x_t#g`;
  - the previous-move sites (P-class) become (o_t, x_t), so each prediction error is credited to the move it was made about.

| case | legacy | aligned (arm A) |
|---|---|---|
| ordinary legal move | key p_{t−1}→x_t (lag 2); nextState p_t | key o_t→x_t (lag 1); nextState x_t |
| first decision after a goal reset | `agentLast` = `agentCurrent` = the new start (`4862`), so the key is o_t→x_t | identical: legacy is already aligned here |
| hold (the move did not happen, so `agentLast = agentCurrent` at `4967`) | next call already aligned | identical |
| first call of a session (`agentLast` null) | guard false; no credit | identical: no credit (guard kept) |
| immediate reversal (x_t = p_{t−1}) | guard false; no credit | identical: no credit (guard kept) |
| self target (x_t = o_t with x_t ≠ p_{t−1}; carried or stale decision) | key p_{t−1}→o_t | self key o_t→o_t; never read for a candidate; transitions and explore writes are edge-filtered and do not fire. Counted by the instrument (§5); frequency OPEN (O4) |
| carried (non-fresh) decision, ~8 % replay calls | key p_{t−1}→stale target | key o_t→stale target: the move actually executed, possibly non-graph |
| executed non-graph move | lag-2 key | non-edge key equal to the executed pair. This is a real experience and is not filtered (provenance class LAG1) |
| goal entry (x_t = goal) | goal reward key p_{t−1}→goal; TD nextState p_t#g | goal reward key o_t→goal, which is an edge whenever the entry is legal; TD nextState goal#g, which has no outgoing Q (the agent is reset), so the bootstrap is 0 (terminal) |
| fallback branch (no expectation) | same lag | same alignment |
| after the goal reset inside the block (`4908`, `4933`, `4940`) | `prev` captured before the reset | `__c1o` captured at the top of the block, before the reset (F6) |

The reward value is unchanged in both arms. It is computed for the decision now (goal test on x_t; similarity from `reasoning.from`).
There is one residual: on carried decisions `reasoning.from` can differ from o_t. This affects the similarity term only and is OPEN (O5).

---

## 4. The switch (REC; not implemented)

**Base.** The pinned LEARN-0 tree (`main.js` sha256 `3d3266fd…`, `render/planning.js` `34e06c65…`), built by `experiments/learn0/transform.mjs` on the guard tree. Production `main.js` is never edited.

**One inserted line** at the top of the block, immediately after `) {` (anchor context: the four guard lines):
```js
const __c1on = !!(globalThis.__CREDIT1__ && globalThis.__CREDIT1__.aligned === true), __c1o = __c1on ? agentCurrent : agentLast, __c1n = __c1on ? next : agentCurrent; // CREDIT-1 credit alignment (guarded, default off)
```

**28 operand substitutions** at the lines in §2.2, each matched exactly once by its full line text in context. The transform refuses on any miss.

**Telemetry hooks (observational).** Two call-only lines, inert when their global is absent:
- after the declaration: `if (globalThis.__CREDIT1_TEL__) globalThis.__CREDIT1_TEL__.begin(__c1o, next, agentLast, agentCurrent, __c1n);`
- before the closing brace of the block: `if (globalThis.__CREDIT1_TEL__) globalThis.__CREDIT1_TEL__.end();`

**Census on the tree.** The tree's `main.js` adds one line inside the block: the GATE-FLOOR-B2 goal-reset probe, `__GFB2__.goalReset(agentCurrent, current, goalNeuronId)`, before `4861`. At implementation the census must be re-run on the tree file, where 47 lines are expected; the extra line is classified INSTRUMENT and kept.

**Default-off argument (static).** With the global absent:
- `__c1o` is the value of `agentLast` and `__c1n` is the value of `agentCurrent` at the top of the block.
- By F6, these are the values every substituted operand had in the original text.
- The only added work is three side-effect-free reads (`globalThis.__CREDIT1__`, `agentCurrent`, `next`) and two falsy global checks.
- So every expression evaluates to the same value, and no random number, clock or store is touched differently.

**Verification plan for "off preserves LEARN-0 behaviour":**
1. **Static (gate T2).**
   - Constant-folding the flag to false and the telemetry globals to absent must reduce the transformed text to the LEARN-0 tree text plus the three inserted lines.
   - Each substituted expression must be one of the declared forms.
2. **Static (gate T3).** The substituted set must equal the census list exactly: no missing site, no extra site, no held, guard or reset site touched.
3. **Dynamic (gate T4; needs sessions, so not authorized now).** On K development worlds × all nine cells, the CREDIT-1 tree must be bit-identical to the LEARN-0 tree:
   - with the switch absent;
   - and again with `__CREDIT1__ = { aligned: false }` and the telemetry installed.

   Compared quantities: `writesSha256`, end-brain hash, every component hash, reaches, moves, guard counters and oracle counters.

   **Pass:** 100 % identity. A single difference fails.

---

## 5. Instrumentation: does every aligned update equal the executed transition? (REC)

**I-CRED (credit identity), per call with a credit event.**
- The telemetry records (o, x, agentLast, agentCurrent, n).
- The execution probe of the same call (call index from `__M7_TEL__`) records (a, to).

| arm | rule |
|---|---|
| aligned | `o === a && x === to && n === x` in **100 %** of credit events. One failure invalidates the session. |
| legacy (positive control) | `o === agentLast` by construction; the rate of `o === a` is reported. It is expected to equal the share of credit events that directly follow a reset or a hold, and it must be < 100 % in every legacy training session, or the instrument is not discriminating. |

**I-WRITE (store-write identity), within each begin/end window.**
- The driver wraps `set` on the store maps (Q, curiosity, rewards, penalties, confidence, signals, transitions) with record-then-call wrappers, which change nothing.
- Every key written in the window is classified as:
  - EXEC (o→x, or o#g→x);
  - LEGACY (p_{t−1}→x);
  - PATH (consecutive `recentMemory` entries at the window start, or the success pipeline);
  - OTHER.

**Pass conditions:**

| arm | condition |
|---|---|
| aligned | OTHER = 0. LEGACY writes only into transitions and the explore pipeline (the held sites), and only when (p_{t−1}, x) is a graph edge. |
| legacy (positive control) | LEGACY non-edge writes > 0 for Q, curiosity and signals in every training session. |

**Manipulation check (descriptive, predicted before data).**
- The Q lag-2-only share of T_A exports (store census method) is predicted < 0.05, against 0.30–0.55 under legacy.
- It is not 0, because the held explore pipeline still writes triangle pairs.

**Tests (gate fixtures, §7).**
- A scripted trajectory with known moves, resets, holds, a reversal, a self target and a carried decision.
- The expected credit tuples are written by hand for both arms, and the instrument must reproduce them exactly.
- Mutants must be caught: for example, re-reading `agentCurrent` after the reset, or using `agentCurrent` as `nextState`.

---

## 6. Preregistration draft (REC; values marked * are fixed only at freeze, from development data)

### 6.1 Procedure (inherited from LEARN-0 unless stated)
- **Substrate:** the CREDIT-1 tree (LEARN-0 tree + §4).
- **Conditions:**
  - hook state P;
  - floor line present but never armed;
  - the guard lines in diagnostic mode;
  - every map oracle blocked in map-off cells (I2);
  - 1,500 calls per session;
  - cold training sessions, map off.
- **World:** a configuration from the next unused stretch of the LEARN-0 cached stream, with one training seed and one test seed per world, exactly as LEARN-0.
- **Goals:** {8, 12, 16, 19}, balanced at n/4 per goal.

### 6.2 Cells per world

| cell | role | credit | store delivered | map |
|---|---|---|---|---|
| T_L | training | legacy | — (cold) | off |
| T_A | training | aligned | — (cold) | off |
| N0L | test | legacy | none | off |
| N1L | test | legacy | own T_L export (all 8 components) | off |
| N0A | test | aligned | none | off |
| N1A | test | aligned | own T_A export | off |
| N1A× | test | aligned | T_A export of the paired world π(w), whose goal g′ ≠ g | off |
| O0L | test | legacy | none | on |
| O0A | test | aligned | none | on |

**Pairing π.** Goals cycle 8→12→16→19→8, and the paired world is at the same index within the next goal's group. π is a bijection, and every T_A export is used once as "own" and once as "swapped".

This gives 9 sessions per world.

**Optional arm A+ (O2).** T_A+, N0A+ and N1A+: the aligned credit plus re-keyed held sites (§2.4). This adds 3 sessions per world. It is excluded from the primary family.

### 6.3 Primary family (three claims; Bonferroni-3, each a two-sided 98.33 % paired percentile bootstrap over worlds)

| claim | estimand | margin | labels (lower/upper bound rule as LEARN-0) |
|---|---|---|---|
| P1 | E_w[ Y(N1A) − Y(N0A) ], Y = legal goal reaches | δ = 20 | LEARNS_UNDER_ALIGNED / NO_PRACTICAL_EFFECT / HARMS_UNDER_ALIGNED / INCONCLUSIVE |
| P2 | E_w[ (Y(N1A) − Y(N0A)) − (Y(N1L) − Y(N0L)) ] | δ = 20 | ALIGNMENT_RAISES / NO_PRACTICAL_DIFFERENCE / ALIGNMENT_LOWERS / INCONCLUSIVE |
| P3 | E_w[ D(N1A) − D(N0A) ], D = share of legal executed moves at true distance ≥ 2 that reduce distance (LEARN-0 S3 instrument; a world in which either cell's rate is undefined contributes a difference of 0, LEARN-0's frozen `rateDiff` convention) | δ_d = 0.03* | DIRECTION_RAISED / NO_PRACTICAL_CHANGE / DIRECTION_LOWERED / INCONCLUSIVE |

**Label rule (per claim, with margin m).**
- The positive label if lower ≥ m.
- The negative label if upper ≤ −m.
- No practical effect if −m < lower and upper < m.
- Otherwise INCONCLUSIVE.

**Why these margins.**
- δ = 20 is the programme margin.
- δ_d = 0.03* is proposed as about one fifth of the map's downhill advantage (O0 − N0 ≈ +0.146 per world in LEARN-0 block L, a post-hoc exploratory figure). It is close to the full store's frozen S3 deficit (−0.036). It is a judgment, fixed before data (O7).

### 6.4 Decision table (the first matching row applies; exhaustive)

| row | condition | strongest allowed sentence | next decision |
|---|---|---|---|
| R1 | P1 LEARNS ∧ P2 RAISES ∧ P3 RAISED | Without the map, the world's own store under aligned credit raises legal reaches by ≥ δ over cold under the same credit. The alignment raises that store effect by ≥ δ relative to the legacy site. Legal moves far from the goal go downhill more often by ≥ δ_d. | replication on a fresh block, then a production-repair design (G1 candidate). No production edit from this study. |
| R2 | P1 LEARNS ∧ P2 RAISES ∧ P3 not RAISED | the first two sentences of R1; the gain is not shown to come with multi-step direction | mechanism study (e.g. the shortcut channel); no value-propagation claim |
| R3 | P2 ALIGNMENT_LOWERS | the alignment lowers the store effect by ≥ δ | diagnostic study before any production decision |
| R4 | P1 ∈ {NO_PRACTICAL_EFFECT, HARMS} ∧ P2 ∈ {NO_PRACTICAL_DIFFERENCE} | correctly keyed model-free credit does not make the store useful without the map, in this runtime | retire this credit path as the source of map-free goal direction; next milestone MODEL-1 (design) |
| R5 | P1 LEARNS ∧ P2 not RAISES (and not R3) | the store is useful under aligned credit, but the alignment is not shown to be the reason | the question goes back to the Director |
| R6 | anything else (any remaining INCONCLUSIVE) | none beyond the intervals | the question goes back to the Director |

**Production flag F-PROD (separate from the table).** If O0A − O0L (95 %) lies wholly below −δ, no production proposal follows, whatever the row.

### 6.5 Secondary and mediator estimates (exploratory, unadjusted 95 %, no labels, no claims)
- **S1 (legacy replication, descriptive).** N1L − N0L on a fresh block.
  - This does **not** re-test or relabel LEARN-0, which stays INCONCLUSIVE.
- **S2 (specificity).** N1A − N1A×, on legal reaches and on D.
  - The swapped store's Q is unreadable by construction (goal-keyed namespace `pos#g′`), and its episodes end at g′.
  - So this contrast mixes goal-keyed value content with goal-entry familiarity (the XFER-2 mechanism). Only D is free of the gating confound (O6).
- **S3 (oracle dependence).** O0A − N0A and O0L − N0L.
- **S4 (production safety).** O0A − O0L (also F-PROD).
- **M1 (goal-entry share).** Share of moves from a goal-adjacent node that enter the goal (LEARN-0 S4), N1A vs N0A and vs N1L.
- **M2 (shortcut channel).** Admitted non-graph candidates, non-graph resets and illegal executions, per cell.
- **M3 (within-session learning).** Late − early halves in N0A and N0L.
- **M4 (manipulation).** The Q lag-2-only share and edge-key share of T_A vs T_L exports.
- **M5 (instrument rates).** The I-CRED identity rate per cell (100 % required in aligned cells).

### 6.6 Validity, exclusions, stopping
- **Instruments that void.** I1 condition integrity, I2 oracle leakage, I3 store identity, I4 pairing (including π and g′ ≠ g), I5 training fidelity, I6 default-off neutrality and tree pins, I-CRED, I-WRITE, and I7 store provenance (lag-1/lag-2/self) for both training exports.
- **World exclusion.** As LEARN-0: any of the world's sessions fails after one retry, or a training export fails provenance. In addition, a world is excluded if the training export used by its paired world fails.
- **Limit.** At most 10 % of worlds may be excluded.
- **Stopping.** Fixed n, one block, one frozen analysis. No interim look.

### 6.7 Sample-size method (fixed now; the number is computed from development data at freeze)
- **Rule** (the programme rule with Bonferroni-3): n ≥ ((z_{1−0.05/6} + z_{0.80}) × 1.25 × SD / margin)², taken per claim; the largest is kept, then rounded up to a multiple of 4.
- **Constants:** z_{1−0.05/6} = 2.394 and z_{0.80} = 0.842.
- **Where the SDs come from:** the development calibration (§8), for P1, P2 and P3.
- **Illustration only** (not a design value), using LEARN-0 figures:

| claim | SD assumed | n |
|---|---|---|
| P1 | block-L E1 SD 114.5 | ≈ 536 |
| P2 | ≈ 163 if the two store effects were uncorrelated | ≈ 1,085 |
| P3 | ≈ 0.15, from the width of LEARN-0's S3 interval | ≈ 410 |

At n ≈ 1,100 the study is 9,900 sessions. LEARN-0 ran 2,160 sessions in 26 minutes.

- **Territory.** Stream indices from 2032 onward (after LEARN-0 block L, 1672–2031).
  - Collision check against the registry's consumed and held-out ranges, plus the committed plans of C′ block S (1392–1671) and LEARN-0 block L.
  - Recording LEARN-0's and C′'s territory in the registry before the freeze is recommended. That is an owner decision.
  - **No seed is generated by this package.**

### 6.8 Claim limits
- **"Aligned credit"** means exactly the §4 re-keying (28 substitutions, held sites unchanged). It does not cover the guard, the transitions write or the explore pipeline, unless arm A+ is adopted, and then only for A+.
- **Scope.** The world's own store in the same world and goal (S2 aside); hook state P; the map-off procedure; 1,500 calls; the graph and goals {8, 12, 16, 19}.
- **Never licensed:**
  - map-free spatial reasoning, abstract route planning, transfer, recall, understanding or cognition;
  - production equivalence or production readiness.
- **An R1 outcome** may reflect experience-derived, path-keyed values and graph familiarity. It is not a demonstration of planning.
- **LEARN-0** keeps its frozen result and limits.

---

## 7. Gate and mutation plan (REC; code not written)

| check | asserts |
|---|---|
| T1 | every transform anchor matches exactly once, in context; refuse otherwise |
| T2 | with the flag false, the transformed text reduces to the LEARN-0 tree text plus the declared inserted lines (static reduction) |
| T3 | the substituted set equals the census list: 28 substitutions on the 26 declared lines; no GUARD, HELD, RESET, POSITION or LOG line changed; the census re-run on the tree classifies every line (47 expected) |
| T4 | dynamic default-off parity, bit-identical (§4, item 3); needs sessions |
| T5 | I-CRED on the scripted fixture: exact expected tuples in both arms |
| T6 | I-WRITE on the fixture: EXEC/LEGACY/PATH/OTHER counts exactly as expected; the legacy positive control is non-zero |
| T7 | held sites receive legacy operands in both arms; the guard is unchanged |
| T8 | analysis: label rules at margin boundaries for P1–P3; Bonferroni level 0.9833; the decision table is exhaustive and first-match; the interval count equals the declared count |
| T9 | pairing: π is a bijection, g′ ≠ g, goals balanced; the swapped store is the paired world's T_A export (hash-checked) |
| T10 | seeds: the block is collision-free against the registry and the committed block S / block L plans; no confirmatory seed before freeze |
| T11 | freeze verifier: line-ending-independent pins of every frozen file (LEARN-0 method) |

| mutant | must be caught by |
|---|---|
| a REKEY site left unsubstituted (one mutant per site, 26) | T3 |
| a GUARD / HELD / RESET site substituted | T3, T7 |
| `nextState` left as `agentCurrent` | T5 |
| origin re-read after the goal reset | T5 (goal-entry fixture) |
| flag default true | T2, T4 |
| telemetry hook with a side effect (writes a store) | T4 |
| explore pipeline re-keyed in arm A | T6, T7 |
| π identity (g′ = g) | T9 |
| Bonferroni level 0.95 | T8 |
| the identity tolerance relaxed to 99 % | T5 |
| a decision-table row reordered | T8 |
| a seed overlapping block L | T10 |

---

## 8. Development calibration plan (REC; NOT authorized)

**Scope.** Development worlds only, outside any confirmatory territory (LEARN-0's development domain); about 40 worlds × 9 cells, about 360 sessions.

**Purposes:**
1. T4 parity on about 10 worlds.
2. I-CRED and I-WRITE at 100 % in the aligned cells, and discriminating in the legacy cells.
3. SDs for P1–P3 (§6.7).
4. The frequency of self targets (O4) and of fallback-branch credit.
5. Runtime and crash rate.

**What may change afterwards.** Only n changes on the basis of development outcomes. Any other change is a disclosed revision made before the freeze. Outcomes are never used to choose arms, margins or claims.

---

## 9. Open questions, risks, alternatives

- **O1.** Scope: full credit site (arm A) vs Q-only (A-Q). Arm A matches the production decision; A-Q isolates value learning. Mediators M1–M2 and P3 are the proposed substitute for an A-Q arm.
- **O2.** The held edge-filtered sites (transitions write, explore pipeline). Should A+ be run (+3 sessions per world), or deferred to a follow-up?
- **O3.** Guard semantics are kept, so reversals and first-call moves stay uncredited in both arms. Should a later study align the guard?
- **O4.** Self-target frequency is unknown (development data needed). Self keys are never read for candidates, so the expected impact is nil.
- **O5.** On carried decisions the similarity reward uses `reasoning.from`, while the key uses o_t.
- **O6.** The specificity contrast is confounded by goal-entry gating; D is the clean discriminator. Alternative: an N1A_noQ cell (aligned store with Q removed).
- **O7.** δ_d = 0.03 is a judgment.
- **O8.** The primary family of three vs a single primary (P1) with labelled secondaries. LEARN-0's review removed labelled secondaries; three claims under Bonferroni-3 are proposed instead.
- **O9.** P2 as a difference in differences doubles the variance. The alternative, Y(N1A) − Y(N1L), mixes the store effect with within-session learning.
- **R-a.** Q decay (F10, half-life ≈ 693 calls) may cap value propagation within 1,500 calls. A null could then reflect decay rather than keying. M4 and P3 make this visible; longer sessions are not proposed (comparability with LEARN-0).
- **R-b.** Aligned keys remove the lag-2 goal-reward keys that can admit non-graph shortcuts (`main.js:1783-1790`). That may raise legal reaches without any value learning. P3 and M2 separate the two.
- **R-c.** Random-stream shifts: aligned credit changes decisions, so streams diverge. All contrasts are procedure-level and paired by seed, as in LEARN-0.
- **R-d.** The registry gap for blocks L and S. The collision check must use the committed plans; an owner decision is needed.
- **R-e.** The census and the design anchor on the current HEAD `main.js` (`c92c5c6b…`). Any production change before the freeze invalidates them.

## 10. What this package does not do
- It runs no session and generates no seed.
- It changes no production, frozen, registry or result file.
- It does not re-test, re-analyse or relabel LEARN-0.
- It implements no switch, driver, analysis or gate.
- It claims nothing about cognition.
