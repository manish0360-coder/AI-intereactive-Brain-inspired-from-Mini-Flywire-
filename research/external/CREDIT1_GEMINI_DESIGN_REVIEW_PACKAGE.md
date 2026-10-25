# CREDIT-1 — independent design review package (for Gemini)

**What you are asked to do.** Challenge a design. Find what is wrong, missing, ambiguous or unjustified, and return a verdict
against the explicit criteria in section 7.
- Do not implement or run anything. Per decision D-023, the reviewer does not implement or execute.
- No outcome exists: no session has run, no seed is generated, and the design is not frozen.

**Status.** A design-only package prepared on 2026-10-25 from repository HEAD `dd5b3ec`. The full package is
`experiments/credit1/DESIGN.md`; everything you need is restated below.

---

## 1. Background

- **The runtime.** MiniFlyWire is a browser agent on a fixed 20-node graph. It chooses its next node by a weighted score of learned
  stores (Q-values, rewards, penalties, curiosity, transitions, …) and of "map oracles", functions that read the true graph.
- **LEARN-0** (frozen, executed, recorded) asked whether the agent's own persisted experience raises goal reaches when every map
  oracle is disabled. The primary result, E1 = −24.4 legal goal reaches with 95 % interval [−36.3, −12.3], was labelled
  **INCONCLUSIVE** under its frozen rule (margin δ = 20). That result and its claim limits are **not** under review and must not change.
- **The fact that motivates CREDIT-1.** The runtime's learning step keys its updates to the wrong state:

```text
// main.js (production, unchanged). One call t: the agent is at p_t; agentLast = p_{t-1}; next = the target executed now.
if ( agentLast !== null && next !== null && agentLast !== next && agentLast !== goalNeuronId ) {   // 3961–3971: the credit block guard
  ...
  updateQ({ state: makeStateKey(agentLast, goal), action: next,              // 4167–4175: TD update
            reward: rewardSignal, nextState: makeStateKey(agentCurrent, goal), alpha, gamma: 0.9 });
  ...
  const prev = agentLast; const current = next;                             // 4483–4484
  const key = prev + "->" + current;                                        // 4506: curiosity, goal reward, penalties, confidence
  ...
  recordAutonomousStep(prev, current, neuronMap, goalNeuronId);             // 4960 (writes only if prev–current is a graph edge)
}
agentLast = agentCurrent;      // 4967
...
agentCurrent = next;           // 5063: the move happens AFTER the credit block
// decision-time reads (scoring): getQ(makeStateKey(currentKey, goal), k), rewards.get(currentKey + "->" + k), ...  (1735, 1783, 1924 ...)
```

So each update is written for the pair (p_{t−1} → p_{t+1}), two positions apart, which is not a move. The scorer reads at
(p_t → candidate).

**Measured on LEARN-0's 360 training stores** (legacy credit, map off): 40.5 % of Q keys are pairs the agent never moved between
(per world 0.30–0.55), and only 46.5 % of Q keys are graph edges at all.

**Documented and deliberately left unrepaired:**
- `main.js:4471-4472` ("known temporal misalignment … deliberately preserved");
- an earlier erratum (ERR-05 §4) measured the same defect in the trust store as 48 of 63 keys being non-edges;
- LEARN-0's DESIGN records it as OPEN-8.

---

## 2. The design in one page

**Question.** With the map off, does credit keyed to the executed transition (o_t → x_t) turn experience into goal-directed behaviour?
- o_t = the position the move is executed from.
- x_t = the executed target.

**Census.** A static tool classifies every one of the 46 lines in the block that name `agentLast`, `prev` or `agentCurrent`:

| class | count | what happens to it |
|---|---|---|
| GUARD | 4 | kept |
| DEAD | 1 | kept |
| REKEY | 26 | re-keyed: 28 substitutions (`agentLast` 17, `agentCurrent` 5, `prev` 6) |
| POSITION | 2 | kept |
| LOG | 4 | kept |
| HELD | 6 | kept |
| RESET | 2 | kept |
| COMMENT | 1 | — |

The tool also checks three invariants:
- nothing re-decides or moves the agent between the execution probe and the block;
- inside the block, `agentLast` / `agentCurrent` are assigned only at the goal reset;
- every decision-time read is keyed at the current position.

It catches four mutated copies of `main.js`.

**Scope rule (arm A).** Re-key a write only if that changes **where** it lands, never **whether** it happens.
- **Re-keyed:** TD Q (state and next state), dampQ, curiosity, the goal-reward and penalty keys, the confidence penalty, signals, timeMemory, trust attempts, and the session-only uncertainty, semantic and emotion sites.
- **Held at legacy operands:**
  - the guard (when credit happens);
  - the `recentMemory` push;
  - two edge-filtered writes: the transitions count, and the autonomous-explore pipeline. Re-keyed, these would fire on every legal move instead of on rare triangles. That would switch on a habit-like per-move reinforcement (about +6 transition strength, +1.5 reward, and a Q write with reward ≈ 2.4 per move) that the legacy runtime almost never performs. It is offered as an optional arm A+.

**Switch.**
- One guarded, default-off line at the top of the block captures the operands once, before the goal reset can change them:
  `__c1o = aligned ? agentCurrent : agentLast` and `__c1n = aligned ? next : agentCurrent`.
- The 28 substitutions are made on the LEARN-0 experiment tree; production is never edited.
- With the switch absent, every substituted expression has its original value, by the invariants above.
- Default-off parity is proven statically and then dynamically: bit-identical session fingerprints against the LEARN-0 tree.

**Instruments.**
- **I-CRED:** in aligned sessions, 100 % of credit events must equal the execution probe's (origin, target) for the same call. In legacy sessions the identity rate must be < 100 % (a positive control).
- **I-WRITE:** every store key written inside the credit window is classified as executed pair, legacy pair, path or other. In aligned sessions "other" must be 0, and legacy-pair writes are allowed only at the two held sites.

**Cells per world** (map off unless stated; 1,500 calls; hook state P):

| cell | role | credit | store | map |
|---|---|---|---|---|
| T_L | training | legacy | cold | off |
| T_A | training | aligned | cold | off |
| N0L | test | legacy | cold | off |
| N1L | test | legacy | own T_L export | off |
| N0A | test | aligned | cold | off |
| N1A | test | aligned | own T_A export | off |
| N1A× | test | aligned | T_A export of a paired world with a different goal | off |
| O0L | test | legacy | cold | on |
| O0A | test | aligned | cold | on |

**Primary family** (Bonferroni-3, 98.33 % paired percentile bootstrap over worlds; LEARN-0's interval label rule):

| claim | estimand | margin |
|---|---|---|
| P1 | N1A − N0A, legal goal reaches | δ = 20 |
| P2 | (N1A − N0A) − (N1L − N0L), the difference in differences | δ = 20 |
| P3 | N1A − N0A in the downhill share of legal moves at true distance ≥ 2 | δ_d = 0.03, a proposed judgment |

**Decision table** (first match):

| row | condition | consequence |
|---|---|---|
| R1 | P1 LEARNS ∧ P2 RAISES ∧ P3 RAISED | replication, then a production-repair design |
| R2 | LEARNS ∧ RAISES, but not P3 RAISED | mechanism study |
| R3 | P2 LOWERS | diagnostic before any production decision |
| R4 | P1 NO_EFFECT or HARMS ∧ P2 NO_DIFFERENCE | retire model-free credit as the source of map-free goal direction; next milestone is a model-based mechanism |
| R5 | LEARNS ∧ not RAISES | Director |
| R6 | anything else | Director |

A separate production flag applies if map-on aligned is worse than map-on legacy by ≥ δ.

**Secondaries** (exploratory, no labels):
- a legacy replication (it does not relabel LEARN-0);
- a specificity contrast N1A − N1A×;
- oracle dependence;
- production safety;
- mediators: goal-entry share, shortcut channel, within-session learning, the manipulation check, instrument rates.

**Sample size.** The programme rule with Bonferroni-3. The SDs come from a development calibration that is **not yet authorized**. An illustration from LEARN-0's SDs gives n ≈ 540 for P1, ≈ 1,090 for P2 and ≈ 410 for P3, so P2 drives n, which is about 9,900 sessions.

---

## 3. Specific challenges (please answer each)

1. **Scope (O1).** Is "re-key the writes that fire anyway, hold the edge-filtered ones" a principled definition of the credit repair? Or should the primary be Q-only (cleaner attribution), or the full intended semantics (A+, production-faithful)?
2. **Held sites (O2).** Is holding the transitions write and the explore pipeline at legacy operands defensible? It leaves those two sites misaligned in arm A. Should A+ be in the primary design?
3. **Guard (O3).** Keeping the guard means reversals and first-call moves are never credited in either arm. Does this threaten any claim?
4. **Default-off proof.** Is the static argument (values captured once at the top of the block, assignments inside the block only at the reset, so every substituted expression keeps its value) complete? Is the dynamic parity test sufficient?
5. **Instruments.** Can I-CRED or I-WRITE pass while credit is still misaligned? Can they fail when it is aligned? Is the legacy positive control strong enough?
6. **Estimands.**
   - Does P2 (a difference in differences) identify the effect of the alignment on the store effect?
   - Is a three-claim family better than a single primary (O8, O9)?
   - Is the decision table exhaustive and free of outcome-dependent paths?
7. **H3 and P3.** Does the downhill share at distance ≥ 2 really separate value propagation from goal-entry gating and from fewer non-graph shortcuts? Is δ_d = 0.03 defensible?
8. **Specificity (O6).** The swapped store's Q is unreadable by construction (goal-keyed), and its episodes end at another goal, so N1A − N1A× is confounded by goal-entry gating. Is the contrast useful, or should it be replaced (e.g. an aligned store with Q removed)?
9. **Alternative explanations.**
   - Q decays with a half-life of about 693 calls; can value propagation work within 1,500 calls?
   - The removal of lag-2 goal-reward keys may cut non-graph shortcut admission.
   - Random-stream shifts.

   Are the mediators enough to tell these apart?
10. **Claim limits.** Are they tight enough? Is anything claimable that should not be? Is LEARN-0's INCONCLUSIVE result fully protected?
11. **Missing.** Anything the design must contain before a freeze and does not.

---

## 4. Risks already identified (do not repeat them unless you disagree)
- R-a: Q decay may cap the effect.
- R-b: the shortcut channel may raise legal reaches without value learning.
- R-c: stream shifts.
- R-d: the registry does not record LEARN-0's or C′'s consumed blocks; collision checks must use the committed plans.
- R-e: the design anchors on the current `main.js` bytes.
- O4: self-target frequency is unknown.
- O5: on carried decisions, the similarity reward is computed from `reasoning.from` while the key uses o_t.

## 5. Alternatives considered

| alternative | why not chosen as the primary |
|---|---|
| A-Q (Q only) | cleaner, but creates a new mismatch between stores combined in one score |
| A+ (re-key the held sites too) | production-faithful, but bundles the activation of a dormant mechanism |
| A single primary P1 | the decision needs P2 and P3 |
| P2 as N1A − N1L | mixes store and within-session effects |
| longer sessions | breaks comparability with LEARN-0 |
| an N1A_noQ cell instead of the swapped store | listed as O6 |

## 6. What is fixed and not open to change in this review
- LEARN-0's frozen result, labels and claim limits.
- The programme margin δ = 20.
- Hook state P and the map-off procedure (the LEARN-0 tree).
- No production edit from this study.

## 7. Pass/fail criteria (return one verdict per area, then an overall verdict)

| area | PASS if | FAIL if |
|---|---|---|
| A. Census | every occurrence is classified with a correct reason, and the invariants are the right ones | a write site that keys on the previous position is missing or misclassified |
| B. Semantics | every case in DESIGN §3 has one unambiguous aligned behaviour | any case is undefined or contradictory |
| C. Switch | default-off equivalence follows from the stated invariants, and the parity test would detect a difference | a path exists where off ≠ LEARN-0 that the tests would miss |
| D. Instruments | I-CRED and I-WRITE can fail and can pass; the positive control is real | either can pass vacuously |
| E. Estimands and decision | P1–P3 identify H1–H3; the table is exhaustive, first-match and fixed before data | an estimand does not identify its hypothesis, or a row depends on post-hoc choices |
| F. Sample size | the method is fixed and the inputs are named; nothing outcome-dependent other than the declared SDs | n or a margin can move after outcomes |
| G. Claim limits | no forbidden claim is reachable from any row; LEARN-0 is untouched | any row licenses planning, transfer, cognition or production readiness, or reopens LEARN-0 |

**Overall verdict:** one of
- PASS (ready for the development-calibration authorization);
- PASS WITH CORRECTIONS (list them; each must be specific and checkable);
- FAIL (state the blocking reason).

**Required response format:**
- per-area verdicts A–G with reasons;
- numbered mandatory corrections;
- numbered optional suggestions;
- answers to the 11 challenges in section 3;
- anything you believe is factually wrong in this package, quoted.
