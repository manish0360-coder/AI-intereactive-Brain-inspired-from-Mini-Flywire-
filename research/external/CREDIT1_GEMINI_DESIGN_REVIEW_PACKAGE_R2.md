# CREDIT-1 — independent design review, round 2 (for Gemini)

**Your task.** Review revision 2 (r2) of the CREDIT-1 design, adversarially. It responds to your round-1 review. Check:
- whether each round-1 objection was resolved correctly;
- whether any correction to your round-1 facts is itself wrong;
- what is still missing before **development calibration** and before **freeze**.

**Do not** implement or run anything (decision D-023).

**Status.** Design only. No session has run, no seed or configuration is generated, nothing is frozen or committed.
LEARN-0 (E1 = −24.4 [−36.3, −12.3], INCONCLUSIVE) is fixed and out of scope.
- Full design: `experiments/credit1/DESIGN.md` (r2).
- Your round-1 review is recorded verbatim at `experiments/credit1/review/GEMINI_ROUND1_REVIEW.txt` (sha256 `ca0c500a…`, as received).
- The reviewed r1 text is preserved at `experiments/credit1/review/DESIGN_r1_as_reviewed.md`.

**Owner decisions that bound this review** (you may comment on them, but they are not open):
- **9 cells:** core + both goal-swapped controls + the aligned no-Q control.
- **Arm A alone is the primary intervention.** A+ is an optional, separately specified module, not co-primary.
- **Primary family:** P1 and P2 only, Bonferroni-2, the full P1 × P2 grid.
- **Downhill share:** exploratory only.

---

## 1. Corrections to round-1 statements (please check them against the cited source)

| round-1 statement | finding in r2 | source |
|---|---|---|
| "Decision-time scoring reads transitions at the current node via tc(s,k)" | **Incorrect.** `trajectoryConfidence` reads `adjacencyMemory`, which is rebuilt from **episodes**. The transitions store is read elsewhere and **is** influential: it builds the candidate set, adds `1.8·log1p(transitions[current][k])` to the score, and decides non-graph admission. | `main.js:953-967`; `1709-1717`, `1932-1943`, `1764` |
| "Arm A_FULL re-keys ALL 28 credit write sites (including transitions and exploration pipeline)" | **Count error.** The 28 substitutions already **exclude** the four edge-filtered operands. A+ = 28 + 4 = **32** substitutions on 30 lines. | `tools/census_credit_sites.mjs`; lines `4703`, `4710`, `4712`, `4960` |
| Holding the two edge-filtered sites "retains legacy misaligned keys" | **Mostly a frequency change, not a key change.** Both write only when their pair is a graph edge. Only 18 of 246 non-reversing two-step walks (7.3 %) close a triangle on this graph, so under legacy keys they fire on about 7 % of ordinary moves; aligned, on every legal move. The explore pipeline then adds, per move, about +6 transitions, +1.5 reward (cap 10) and a Q update with reward ≈ 2.4. The authors intended per-step firing. | `connections.json` (uniform-walk figure; the real rate is unverified); `render/episodeManager.js:911-1013`; `main.js:1758-1761` |
| The no-Q control "strips Q-values and rewards" | **Mischaracterised.** It removes Q only, using the existing `NO_Q` component mask. | `experiments/xfer1/config.mjs:67` |
| P3 "assumes the agent possesses oracle distance knowledge" (mathematically invalid) | **Rejected as stated.** D is computed by the harness after the session, from `connections.json`; the agent never sees it. **Demotion accepted** on construct-validity grounds (your point D.3): a model-free learner can raise reaches without descending true shortest paths. | `experiments/learn0/session.mjs` (the true distance is computed in the driver) |
| Values-only (A_Q) results are "impossible to attribute" | **Overstated.** A_Q against L changes only the Q keys, so it is a clean single-component contrast. Its limit is generalisation: it says nothing about full alignment. It is not the primary (accepted) and is deferred. | — |
| "Gating for g′ is inactive at g, so N1A× measures specificity" | **Accepted, with a qualifier.** It measures goal-specificity of the benefit through **any** mechanism: goal-keyed Q is unreadable under another goal, and goal-entry familiarity differs. It cannot single out values. | `main.js:1735` (Q read as `makeStateKey(currentKey, goal)`) |

## 2. The r2 design in brief

**Arms.**
- **L:** legacy credit.
- **A (primary):** re-keys the existing credit writes. 28 substitutions; every write keeps its firing condition. It is a **bundle** of at least five live channels: Q (TD and dampQ), trust attempts, curiosity, penalties, and goal-reward keys including non-graph admission.
  - Trust: `main.js:2296-2299`, `scoring.js:184`. Under legacy, attempts are keyed at the lag-2 pair while successes go to executed path pairs (`4476-4478` vs `4675`), so trust on path edges is inflated.
- **A+ (optional module, not run unless authorized):** A plus the four edge-filtered operands, i.e. activation of the transitions count and the explore pipeline.
- **Deferred:** A_Q, and guard alignment (CREDIT-2).

**Cells per world** (map off, 1,500 calls, hook state P, LEARN-0 tree):

| cell | role | credit | store |
|---|---|---|---|
| T_L | training | L | cold |
| T_A | training | A | cold |
| N0L | test | L | none |
| N1L | test | L | own T_L export |
| N0A | test | A | none |
| N1A | test | A | own T_A export |
| N1A× | test | A | T_A export of the paired world π(w) |
| N1L× | test | L | T_L export of π(w) |
| N1A_noQ | test | A | own T_A export minus Q |

The pairing is π(w) = 4⌊w/4⌋ + ((w + 1) mod 4). It is a bijection, and the paired world's goal g′ ≠ g. Delivered stores never carry a goal.

**Primary family** (Bonferroni-2, 97.5 % paired percentile bootstrap over worlds, δ = 20 legal reaches; sensitivity δ = 15 and 30):

| claim | estimand | labels |
|---|---|---|
| P1 | N1A − N0A | LEARNS / NO_PRACTICAL_EFFECT / HARMS / INCONCLUSIVE |
| P2 | (N1A − N0A) − (N1L − N0L) | RAISES / NO_PRACTICAL_DIFFERENCE / LOWERS / INCONCLUSIVE |

**Grid (exhaustive):**

| P2 \ P1 | LEARNS | NO_PRACTICAL_EFFECT | INCONCLUSIVE | HARMS |
|---|---|---|---|---|
| RAISES | R1 | R2 | R2 | R3 |
| NO_PRACTICAL_DIFFERENCE | R4 | R5 | R6 | R5 |
| LOWERS | R7 | R7 | R7 | R7 |
| INCONCLUSIVE | R8 | R6 | R6 | R6 |

- **R2** is the harm-removal case: alignment raises the store's effect, but no benefit is demonstrated. "Removes harm" is allowed only if S1 shows a legacy effect ≤ −δ.
- **R5** is scoped: "in this implementation … does not show that model-free credit alignment cannot work".
- INCONCLUSIVE is never read as no effect. The NO_PRACTICAL labels are equivalence within ±δ.
- No row makes a claim about value propagation, a single channel, or impossibility.

**Secondaries** (exploratory, no labels):

| id | comparison | what it measures |
|---|---|---|
| S1 | N1L − N0L | legacy store on a fresh block (does not relabel LEARN-0) |
| S2 | N1A − N1A×; N1A× − N0A | goal-specific vs goal-agnostic parts of the aligned benefit |
| S3 | (N1A − N1A×) − (N1L − N1L×) | whether alignment changes the goal-specific part |
| S4 | N1A − N1A_noQ | the persisted aligned Q's contribution; not whether aligning Q causes P2 |

**Mediators.** M1 is the excess downhill share (D − C), harness-computed and never available to the agent, with explicit limits; no claim requires it. Also: episode outcomes (legal / non-graph / cap; a new field), goal-entry share, shortcut channel, within-session learning, a manipulation check (predicted: T_A Q lag-2-only share < 0.05, against 0.30–0.55 under L), instrument rates.

**Instruments.**
- **I-CRED** is a wiring check, with a cross-check against the goal-reset probe and a split by fresh vs carried decisions. Its stated limit: it compares reads of one variable.
- **I-LEDGER** is the substantive instrument: an observational `set` wrapper on every exported keyed map, including the inner `transitions` maps and the trust maps, with the caller's file:line, so every write is checked against its census class.
- Synthetic fixtures cover every event class for L, A and A+.
- An instrument failure **voids the block**.

**Default-off evidence.**
- Static, before calibration: census on the built tree (47 lines); reverse-substitution byte identity for A and A+; substitution sets; only `main.js` differs; invariants. FACTs behind them: `next` is never reassigned in the block, and the only goal assignment (`main.js:4309`, emergency recovery) is unreachable in harness sessions (`815-817`).
- Dynamic, before freeze: a determinism baseline, then 100 % off-parity with a coverage list of event classes, telemetry neutrality, and a recovery counter of 0.

**Territory.** Stream indices from 2032, starting ≡ 0 mod 4. LEARN-0's frozen config reserves 0–1391 (earlier studies), 1392–1671 (C′) and 1672–2031 (block L). The collision check covers the registry and every committed plan. A registry record before freeze is an owner decision.

**Sample size.** n per claim = ((2.2414 + 0.8416) · 1.25 · SD / 20)², taking the larger and rounding up to a multiple of 4. P2's SD is estimated directly in calibration. Illustration: P1 ≈ 488; P2 ≈ 488 (store effects correlated at 0.5) to 976 (uncorrelated, SD √2 × 114.5); that is about 4,392–8,784 sessions.

**Blockers.**
- **Before calibration:** BC-1 the A+ census; BC-2 driver requirements; BC-3 a full `main.js` + `render/*.js` write census; BC-4 fixtures; BC-5 the ledger specification; BC-6 static S-1 to S-5 (needs implementation authorization); BC-7 the calibration protocol.
- **Before freeze:** BF-1 to BF-8, including this round of review.

---

## 3. Questions for round 2
1. Are the corrections in section 1 right? Quote the source line if you disagree.
2. Is arm A, as a re-keying bundle with claims limited to the bundle, an adequate test of H1 and H2? Is any remaining confound unacknowledged?
3. Is A+ correctly characterised as an activation-type module? Is it right that it is not needed for H1 and H2?
4. Do S2 + S3 + S4 separate the three questions (goal-specificity; values' contribution; whether alignment improves goal-directed use), within the stated limits? Is the swap pairing π, and its effect on exclusions, sound?
5. Is the P1 × P2 grid exhaustive and correctly worded, especially R2, R5 and R7? Is anything licensed that should not be?
6. Is the mediator M1 now correctly bounded? Are the map-free episode-outcome mediators adequate?
7. Can I-LEDGER, with the fixtures, detect missed writes, mis-keyed updates, reset errors, stale (carried) decisions and unintended changes to held sites? What can it still miss?
8. Are the static and dynamic default-off requirements (S-1 to S-5, D-0 to D-4) sufficient for a freeze?
9. Are the sample-size method, the equivalence power statement, the exclusion rules (primary unaffected by swap-cell failures) and the territory adequate?
10. Is the split between before-calibration blockers, before-freeze blockers and deferred items correct?

## 4. Pass/fail criteria

| area | PASS if | FAIL if |
|---|---|---|
| A. Round-1 resolution | every round-1 issue is resolved or explicitly deferred, with reasons | an issue is dropped, or a correction is factually wrong |
| B. Interventions | arm definitions and the intervention table are exact; claims match the bundle | a write site is missing, or a claim exceeds the intervention |
| C. Controls | each comparison answers its stated question within its stated limits | a comparison is assigned a question it cannot answer |
| D. Statistics | P1 and P2 are distinct; Bonferroni-2, margins and the grid are coherent and exhaustive | a gap, an inconsistency or outcome-dependent wording |
| E. Instruments and parity | they can fail and can pass; the coverage criteria are concrete | any check can pass vacuously |
| F. Integrity | territory, exclusions, failure handling and sizing are defensible | any of them can move after outcomes |
| G. Claim limits | no forbidden claim is reachable; LEARN-0 is untouched | otherwise |

**Return:**
- per-area verdicts A–G;
- numbered mandatory corrections, each classed BC / BF / DL;
- optional suggestions;
- answers to the 10 questions;
- quoted factual errors, if any;
- an overall verdict: **READY FOR IMPLEMENTATION MILESTONE** (clear the BC items, then calibration) / **REVISE AGAIN** / **FAIL**.
