# XFER-2 (revised) — independent design review request, single round

**Reviewer role.** Independent adversarial reviewer of an experimental design. You have no repository access and must not
ask for it. Do not write code, run anything, or redesign the study. Attack the causal contrasts, name confounds, and give
the **smallest** modification that would let the design distinguish the competing explanations. This package supersedes
the earlier one; judge only the design below. One round.

**Output (≤ 800 words).** A ranked list: *severity* (BLOCKING = a declared interpretation could be wrong; MAJOR; MINOR),
*the flaw*, *what observation would show it matters*, *minimal change*. Then: any arm to drop, the single control you
would add, and any declared sentence that over-claims. Do not defer to any other model.

---

## 1. System and the finding to explain

A single agent moves on a fixed 20-node graph with hidden per-edge reliabilities and one goal node. Candidate moves are
scored by an additive heuristic that includes a goal-gradient term built from the **true** graph distance to the goal.
Completed goal-reaching paths are stored as *episodes*; a brain (including the episode store) can be persisted and
restored into a later session.

XFER-1 (exploratory, 80 worlds, 1,500-call sessions, paired by world): restoring only the real episode store from a
training session in the same world raises goal reaches from 88.0 (cold) to 186.2, i.e. +98 [78, 119]. Another world's
episodes (same goal) give 163.7. Per-attempt success barely changes (0.722 cold, 0.752, 0.721 for foreign episodes).

## 2. Runtime facts the design uses (read from the code and verified by tests)

* **Decision-time reads** (never consult `quality`): with `tc = min(count(a→b)/5, 1)` from episode adjacency counts,
  a non-goal candidate's goal gradient is multiplied by `0.10 + 0.90·tc`; the goal-**entering** candidate's boost is
  `100·tc`; trajectory integrity adds up to `+40·min(#episodes containing the pair / 5, 1)`.
* **Replay** (probability 0.08 per call): a random *eligible* stored episode (quality ≥ 0.5, simple path, graph edges)
  is replayed through the procedural pipeline (Q, transitions, rewards), whether or not it reached a goal. The replayed
  copy's quality is **recomputed**, so stored quality is purely an eligibility threshold. Each distinct label sequence
  replays once per run. A replay tick draws from the cognitive stream **only if an eligible episode exists**.
* Complete consumer path of `quality` over the whole conformed tree: replay eligibility; persistence; sealing and
  pipeline of *new* episodes; two getters with **no callers**.

## 3. Hypotheses

**H-gate**: the benefit is removal of a cold-start handicap (an empty store attenuates the oracle gradient to 10%,
and the goal-entering move to 0). **H-replay**: replay learning from the delivered episodes. **H-content**: the real
store's placement (edges, direction, goal termination) carries information beyond exposure.

## 4. Arms (each delivers only an episode store; everything else empty at the first call)

| arm | store |
|---|---|
| COLD | none |
| REAL | the world's own training store |
| REAL_NR | same, `quality = 0.49` (replay learning off, every decision-time read unchanged) |
| **GEN_NR** | **matched generic**: same episode count, **same length of every episode, same simple/loop kind of every episode, hence the same total transitions** as REAL; edges chosen by balanced least-used selection, no goal reference, replay off |
| **SAT_NR** | **upper bound**, not a matched control: 182 goal-free world-independent walks, every directed edge used ≥ 5 times, replay off |
| SAT_NOENTRY_NR | SAT without any transition into the goal |
| ENTRY_NR | only two-node episodes [u, goal], 5 per goal neighbour, replay off |
| REV_NR | real paths reversed, replay off |

## 5. Measured residuals before any outcome (80 existing real stores; 51 have ≥ 20 episodes)

GEN_NR − REAL: episode count 0, transitions 0, simple-path fraction 0, mean nodes 0 (exact). Placement differs:
mean |Δtc| 0.68; directed edges covered +52; edges at count ≥ 5 +49; non-goal gate retention (0.10+0.90·tc) +0.55
goalward, +0.63 away; goal-entering tc +0.44; goalward share of transitions −0.12; episodes ending at the goal −0.95.
So the matched generic store **unlocks strictly more** than the real store (it spreads the same budget); a shortfall of
REAL_NR against it cannot be explained by less exposure. REAL itself is sparse: ~8 of 78 directed edges at count ≥ 5,
goal-entering tc 0.33, 1.0 of the goal's entering edges at count ≥ 5. REAL_NR vs REAL: identical reads (|Δtc| 0),
eligibility 0. SAT: all edges ≥ 5, gate 1.0 everywhere, goal-entering tc 1.0, 79% simple paths; SAT_NOENTRY: entering
tc 0, gate 1.0; ENTRY_NR: entering tc 1.0, non-goal gate 0.10 (no unlock).

## 6. Isolation tests of the replay switch (outcome-free)

(a) With the runtime's own episode manager and a recording stub: eligible store → Q updates; quality 0.49 → none;
loop-containing episodes → none at any quality; quality exactly 0.5 → replays. (b) Whole runtime, short probe: a store at
its real quality and at 0.49 produce **identical first-decision candidate weights and identical executed actions until
the first replay tick**; on edges the no-replay run never walks, the eligible store writes procedural keys and the 0.49
copy writes none. **Residual**: because a replay tick draws only when an eligible episode exists, REAL_NR shifts the
cognitive stream by one draw per replay tick before the session's own first episode exists (exchangeable noise).

## 7. Estimand, margins, decision rules (declared; thresholds from XFER-1 only)

Primary: per-world paired difference in goal reaches. No ratio decides anything. `DELTA = 25` reaches (about a quarter
of XFER-1's +98); `MIN_REAL_BENEFIT = 50` (2·DELTA, below XFER-1's lower bound 78). Arm X vs reference: **NON_INFERIOR**
if the upper bound of the (reference − X) interval < DELTA; **FALLS_SHORT** if the lower bound ≥ DELTA; **EXCEEDS** if
the upper bound ≤ −DELTA; else INCONCLUSIVE. If benefit(REAL)'s lower bound < 50 nothing is interpreted
(NOT_INTERPRETABLE_LOW_BENEFIT, or DID_NOT_REPRODUCE when ≤ 0). Block D has 128 fresh worlds (XFER-1 store-vs-store
paired SD is 72–104, 80th percentile 101 → 128 worlds give 80% power to class a zero shortfall NON_INFERIOR);
block C (24 worlds) is an instrument check.

Declared sentences: SAT_NR NON_INFERIOR/EXCEEDS REAL_NR → "benefit is removal of the cold-start attenuation; correcting
cold-start scoring dominates improving episodic memory"; SAT_NR FALLS_SHORT → "real content carries information
exposure does not"; otherwise "inconclusive". Extra clauses: REAL exceeds REAL_NR by ≥ DELTA → replay contributes;
GEN_NR FALLS_SHORT → real placement is a cheaper unlock; ENTRY_NR NON_INFERIOR to SAT_NR → the goal-entering term
carries the unlock.

Predictions: P1 benefit(REAL) lower ≥ 50; P2 REAL_NR NON_INFERIOR to REAL; P3 SAT_NR NON_INFERIOR/EXCEEDS REAL_NR;
P4 GEN_NR FALLS_SHORT of REAL_NR; P5 REV_NR FALLS_SHORT of REAL_NR; P6 ENTRY_NR NON_INFERIOR to SAT_NR.

## 8. Weaknesses I already see

1. The agent has the oracle gradient from boot, so "information" is hard to define; SAT_NR tests the handicap
   explanation, not a notion of learning.
2. SAT_NR is saturated (integrity +40 uniform; no goal-ward asymmetry); a failure could reflect symmetric exposure.
3. GEN_NR bundles edge identity, direction and goal termination; only REV_NR splits direction.
4. The goal-entering decomposition assumes approximate additivity of the two gate terms.
5. Many worlds have tiny real stores (29 of 80 have < 20 episodes); the primary estimand includes them.

## 9. Questions

1. Is SAT_NR a legitimate upper bound for "generic exposure suffices", and does its outcome license the declared
   sentence about cold-start scoring?
2. Does a REAL_NR shortfall against the strictly-more-unlocking GEN_NR license "content", or only "goalward
   concentration"?
3. Is the replay switch (with the stream-shift residual) clean enough, and what is the smallest repair if not?
4. Are the margin, the precondition and the block size defensible; can heterogeneity in store size game a
   non-inferiority call?
5. Can ENTRY_NR / SAT_NOENTRY_NR support a "one-term repair" statement, or is that an over-claim?
6. Which single control, if any, is missing?
