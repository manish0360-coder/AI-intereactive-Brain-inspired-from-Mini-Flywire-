# CREDIT-1 — independent review brief (for Gemini)

**Read with:** `CREDIT1_GEMINI_DESIGN_REVIEW_PACKAGE.md` (the design and its criteria A–G) and `experiments/credit1/DESIGN.md`.

**Status.** Design only. No session has run, no seed is generated, nothing is frozen or committed. The owner has not authorized
development calibration. LEARN-0 (E1 = −24.4 [−36.3, −12.3], INCONCLUSIVE) is fixed and out of scope.

**This brief adds:**
- the designer's own pre-review of the package against eight questions;
- the source facts behind each finding;
- proposed design changes. These are **pending the owner's approval**: please rule on each, as well as on the original design.

Labels: **FACT** = checked in the source at HEAD `dd5b3ec` (file:line given); **REC** = proposed; **UNVERIFIED** = stated but not checked.
Each issue is classed **BC** (blocker before calibration), **BF** (blocker before freeze) or **DL** (documented limitation, deferrable).

---

## Q1 — Does full-site re-keying test the credit-alignment hypothesis?

- **FACT.** Arm A's 28 substitutions re-key several channels that the scorer reads every decision, not only value credit:

  | channel | source | what re-keying changes |
  |---|---|---|
  | trust | `main.js:2296-2299`, `scoring.js:184` (trust − 0.5) × 8; `trustMemory.js` trust = (successes + 1)/(attempts + 2) | Legacy records attempts at lag-2 keys (`4476`) while successes go to executed path pairs (`4675`). Path edges therefore get few attempts and inflated trust. Re-keying removes that accidental bias. |
  | curiosity | visits term `1872-1873`; repetition penalty in the reward `3998-4015` | the novelty term and the repetition penalty |
  | penalties | `1726`, `1870` | the penalty term |
  | goal-reward keys | reward term `1868`; non-graph admission `1783-1790` | the reward term and shortcut admission |
  | confidence | `1897` | the confidence term |

  Emotion is read at `2029`; whether it moves the score is UNVERIFIED.
- **Assessment.**
  - Arm A is a bundle of at least five live interventions. P2 would estimate the bundle's total effect. It does not identify value-credit alignment, and P3 cannot attribute a direction gain to Q.
  - The package's reason for not making Q-only the primary ("a new mismatch between stores") is weak. The legacy runtime already mixes aligned path writes with lagged keys.
- **I-1 (BC).** REC: make the primary arm **A_Q (value-credit alignment)**. It has five substitutions: TD state `4168`, TD next state `4171`, dampQ `4220`, fallback state `4349`, fallback next state `4352`. Site-wide alignment (A) becomes a deferred follow-up for the production question.
- **I-2 (DL).** The edge-filtered held sites (transitions write `4703-4712`, explore pipeline `4960`) stay lagged in every arm.
- **I-3 (DL).** The guard is kept, so reversals and first-call moves are uncredited in both arms. This is identical across arms.

## Q2 — Are the estimands, comparisons, correction, margins and decision table coherent?

- Bonferroni-3 (98.33 %) is valid under the dependence created by P1 and P2 sharing cells. It is conservative there.
- The margins are consistent in units: δ = 20 legal reaches for P1 and P2, δ_d in share units for P3.
- **I-4 (BF).** The decision table has gaps.
  - P1 ∈ {NO_PRACTICAL_EFFECT, INCONCLUSIVE, HARMS} ∧ P2 RAISES falls to the catch-all R6. That is the most plausible outcome given LEARN-0's legacy store effect of about −24: the alignment removes the harm without producing a benefit.
  - REC: replace the table with an explicit P1 × P2 grid (16 cells) plus a P3 qualifier, with a named next decision for every cell.
- **I-5 (BF).** Sensitivity margins are not declared. REC: δ ∈ {15, 30} and δ_d ∈ {0.02, 0.04}; they decide nothing.
- **I-6 (DL).** P2 (a difference in differences) has the largest variance and drives n. The illustration that assumed uncorrelated store effects overstates its SD.

## Q3 — Does the downhill share separate multi-step direction from goal-entry gating?

- **FACT.** D counts only legal moves made at true distance ≥ 2 (`session.mjs`). Goal-entry gating acts only on the goal-entering candidate from distance 1, so it cannot change D directly.
- **Indirect routes remain.**
  - (a) **Composition.** More goal entries mean more resets to random start nodes. The mix of distances and node degrees changes, and so does the chance downhill rate.
  - (b) **Other learned channels.** Path-reward familiarity (aligned even under legacy), and trust and curiosity under arm A.
  - (c) **Fewer shortcuts.** Fewer non-graph shortcuts change which positions are visited.
  - The cold agent is already above chance (0.588 vs 0.458 in LEARN-0 development), for reasons that are unexplained.
- **I-7 (BF).** REC: define P3 on the **chance-adjusted** share, (D − C)(N1Q) − (D − C)(N0Q), where C is the per-move fraction of downhill neighbours (already recorded as `farLegalChance`). δ_d is to be re-justified on that scale; the proposal is 0.03, a judgment.
- **I-8 (DL).** Even when chance-adjusted, D measures multi-step direction by any learned channel, not specifically TD value propagation. With A_Q, attribution to Q comes from the component cell (Q4).

## Q4 — Does the goal-swapped control support its claims?

- **FACT.** Q keys are goal-namespaced (`pos#goal->action`, read as `makeStateKey(currentKey, goal)`, `main.js:1735`). A store trained toward g′ therefore has **no readable Q** under goal g, and its episodes and rewards target g′.
  - N1A − N1A× bundles readable Q with goal-entry familiarity (the XFER-2 gating mechanism). It cannot support a value-specificity claim. The package correctly assigns it no claim.
- **I-9 (BC; this sets the cell set).** REC: replace N1A× with **N1Q_noQ**, the world's own aligned-credit export with Q removed. It uses existing component-mask machinery and needs no cross-world delivery.
  - Contrast N1Q − N1Q_noQ, on reaches and on the adjusted D, to attribute the store effect to persisted, correctly keyed Q.
  - Goal-specificity is deferred. A relabelled-Q control would read values learned toward g′ as if they were toward g: misleading content, not a null.

## Q5 — Is the default-off equivalence argument sufficient?

- **FACT.**
  - Inside the block, `agentLast` and `agentCurrent` are assigned only at the reset (`4861-4862`).
  - `next` is never reassigned inside the block.
  - `goalNeuronId` is assigned only at `4309` (emergency recovery, when compositeError > 0.75). That branch needs `window.homeNeuronId !== undefined`. `loadBrain` sets it only for a non-null stored value (`815-817`), and delivered stores carry `null`. So it is statically unreachable in harness sessions.
  - Nothing re-decides or moves the agent between the execution probe (`3641`) and the block.
- **I-10 (BC).** The static evidence is incomplete. REC, required before calibration:
  - S-1: census re-run on the actual LEARN-0 tree `main.js`, with 47 lines expected (+1 goal-reset probe line).
  - S-2: reverse-substitution identity. Undo the substitutions and remove the inserted lines; the result must be byte-identical (LF-normalised) to the tree's `main.js`.
  - S-3: the substitution set equals the plan.
  - S-4: no other tree file differs.
  - S-5: invariants I1–I3, plus "`next` not reassigned" and "the only goal assignment is the unreachable recovery".
- **I-11 (BF).** Dynamic evidence, required in calibration:
  - D-0: determinism baseline (the same session twice is identical).
  - D-1: off-parity against the LEARN-0 tree, 100 % identical on fingerprint, `writesSha256`, end and component hashes, reach call lists, move counters, guard and oracle counters. The parity set must meet a **coverage criterion**: each of goal entry, reset, fallback-branch credit, carried decision, non-graph execution, dampQ firing, curiosity-signal write, map on/off, stored/cold, training/test occurs at least once.
  - D-2: switch present but `aligned:false`, with telemetry installed, identical to D-1.
  - D-3: aligned-mode instruments pass.
  - D-4: emergency-recovery counter = 0 in every cell.

## Q6 — Can the census and instruments detect every failure mode?

- **I-12 (BC).** I-CRED compares two reads of the same variable (`agentCurrent` at the probe and at the block). It checks the switch wiring, **not the keys actually written**, so it cannot detect a site left unsubstituted.
- **I-13 (BC).** I-WRITE, as designed, has three gaps:
  - it is ambiguous for Q: the held explore pipeline and a missed TD substitution both write `prev#g->current`;
  - it is uninformative when `agentLast === agentCurrent`;
  - it misses writes outside the window and writes to the inner maps of `transitions`.

  REC: a **stack-attributed write ledger**.
  - Wrap `set` observationally on every exported keyed map: `Q`; `rewards`, `penalties`, `signals`, `curiosityMap`, `confidenceMap` and `transitions` with its inner maps; `pathAttempts` and `pathSuccesses`. All are exported (FACT: `qlearning.js:12`, `memory.js:8-44`, `trustMemory.js:30-33`).
  - Record (call, map, key, caller file:line) for each write.
  - The census gives the expected key class per source line. Any write from an unclassified line fails.
  - Count only informative events (`agentLast !== agentCurrent`).
- **I-14 (BC).** The census covers only the `main.js` block.
  - Outside the block, the keyed writes in `main.js` are: decay loops `3314-3388`; goal-wraparound pruning `1415-1478`; the episode bridge `927`; click handlers `5453`, `5680`. These were classified by location only and none uses the lagged pair.
  - `render/*.js` is not censused.
  - REC: a full static write census before calibration, so the ledger's coverage is defined.
- **I-15 (BF).**
  - Cross-check: on goal-entry calls, the credit origin must equal the goal-reset probe's `from`.
  - Stratify identity by fresh vs carried decisions, and count `reasoning.from ≠ agentCurrent` (the similarity-term residual).
- **I-16 (BF).** An instrument failure is systematic. It must **void the block and stop**, not exclude a world.

## Q7 — Are the seed territory, registry, pairing, exclusions and sample size adequate?

- **I-17 (BF).** Territory.
  - Stream indices ≥ 2032 require extending the cached accepted-configuration stream. That is configuration generation, a freeze-milestone step needing authorization.
  - The typed registry does not record LEARN-0 block L, C′ block S, or the XFER and GATE-FLOOR blocks. The collision check must use every committed plan. The index ranges of the XFER and GATE-FLOOR blocks were UNVERIFIED in this review.
  - REC: record the consumed territory in the registry before freeze (owner decision).
- **I-18 (BF).** The SDs for P1, P2 and P3 must come from calibration, with the difference-in-differences SD estimated directly. Equivalence-label power (the 98.33 % half-width < δ at a true 0) must be stated.
- **I-19 (BC).** The calibration seed domain is not named. REC: the LEARN-0 development worlds, outside every confirmatory block.
- Pairing within a world is sound. Removing the swap (I-9) removes the cross-world pairing and its coupled exclusion rule.

## Q8 — What must be resolved, and when?

| when | issues |
|---|---|
| Before calibration | I-1 (arm), I-9 (cell set), I-10 (static evidence spec), I-12 and I-13 (instrument redesign), I-14 (full write census), I-19 (calibration domain) |
| Before freeze | I-4, I-5, I-7, I-11, I-15, I-16, I-17, I-18, and the claim limits restated for A_Q |
| Deferrable | I-2, I-3, I-6, I-8; Q decay (half-life ≈ 693 calls) capping value propagation; self-target frequency; site-wide alignment (A) and dormant-pipeline activation (A+); goal-specificity |

---

## Please return
- Per-area verdicts **A–G** (criteria in the package, section 7) for the **original** design.
- For **each** proposed change I-1 … I-19: ACCEPT / REJECT / MODIFY, with reasons.
- Any issue the designer missed, classed BC / BF / DL.
- An overall verdict: PASS / PASS WITH CORRECTIONS / FAIL (for proceeding to calibration once the owner authorizes it).
- Anything factually wrong in this brief, quoted.
