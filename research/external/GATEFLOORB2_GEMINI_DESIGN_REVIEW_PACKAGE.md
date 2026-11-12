# GATE-FLOOR-B2 — design review package (self-contained; no repository access needed)

**What I need from you.** One focused adversarial review of a *replication design*, **before any confirmatory outcome
exists**. You do not implement code and you do not run anything. Review four things: (1) validity of the pristine-runtime
substrate for this question, (2) equivalence of the intervention to the one already tested, (3) neutrality of the
measurement path, (4) integrity of the frozen analysis. Do not restart a general audit and do not reopen closed
governance questions. Answer the questions in §9 in the format in §10.

## 1. Where this comes from (GATE-FLOOR-1, closed; reviewed by you as PASS WITH CLAIM LIMITS)

On the *H1-R-conformed* B2 runtime, over 160 fresh worlds (1,500-call Phase I), a guarded, default-off floor on the goal-
entering score term — `100·max(tc, 1)` iff the candidate is the active goal and a legal graph edge, with **no stored
episode** — gave legal goal reaches **+152.7 [137.2, 168.4]** over cold, **exceeded** restoring the real episode store
(−47.8 [−61.7, −33.5]) and was **non-inferior** to the goal-entry-only episode store (−7.0 [−15.2, 0.9]); no goal group was
harmed; per-attempt success +0.007; audit clean; Bonferroni-3 sensitivity changed no class. **Limits that matter here:**
(a) the final hop's failed attempts per success rose (0.585 vs 0.399 COLD, 0.425 REAL, 0.596 ENTRY_NR), explained post-hoc
by *edge mix* — the floor attempts every legal goal edge, including the least reliable — so the benefit is a **commitment
effect, not routing capability**; (b) the conformed runtime is not what ships: it carries an N1 mask/guard, R1/R2
environment-draw reordering and goal-draw edits, a P4 reset fix and a flat goal reward. Hence this milestone.

## 2. The pristine substrate (identity and the differences that matter) — FACT unless labelled

* **Identity.** B2 = commit `707cb1e5205a7e9979f81092ee1ebfa0fe28922e`; the pristine tree is its 146 git blobs, every blob id
  re-verified, no transform; `main.js` blob `113fa471…`, sha256 `537f37a20144de07e39e2273ee2e78777e4c0f8ec3259b1e033f8a897d522e2b`.
  The H1-R conformed tree differs from it in exactly six files; **every** conformance edit in `main.js` is guarded by
  `__H1R__`/`__H1R_MEASURE__` (gate-checked), and the H1-R runtime is **never installed** here.
* **Goal-entry gradient:** the same source block (gate-checked identical): `goalGradientBoost = 100` for the goal candidate,
  overwritten by FIX 3 `= 100 * tc`, `tc = min(count(u→goal)/5, 1)` read from episodes only.
* **No N1 in B2:** a candidate is admitted if `structureMap.has(k)` **or** `transitions(cur→k) > 5` **or** (`rewards > 4`
  and an episodic witness), and the executed move is **not** checked for being a graph edge. A goal reset can therefore
  follow a non-edge move. *Measured, floor OFF (calibration §6):* non-edge share of goal resets **37.8 %** (COLD), 44.0 %
  (REAL), 23.8 % (ENTRY_NR). *Inference (not proven):* much of it is re-execution of the stale pre-reset reasoning (41 % of
  non-edge resets fall on the call right after another reset, 17 % on replay ticks; 42 % unexplained).
* **No environment draw for a goal-entering move:** `_goalResetJustHappened = (next === goal)` skips the draw and the
  credit; `env.attempt` also returns true without a draw for any non-edge pair. So a final-hop *failure* cannot occur.
* **Learning order / RNG:** B2 learns the *intended* move before the single environment draw; the environment stream is
  seeded `agentSeed ^ 0x5EED`; cognitive `seed`; visual `seed ^ 0x9e3779b9`.
* **Episodes:** B2 seals any consecutive pair (32.5 % of the transitions in its own exported stores are non-graph);
  persistence (`saveBrain`/`loadBrain`) is unchanged.
* **UNKNOWN:** whether B2's 1-hop "shortcut blocked" penalties damp a floor that makes 1-hop entries common; how the floor
  changes B2's own non-edge reset frequency; any difference between `707cb1e` and the current repository `main.js`.

## 3. The intervention, ported semantically (two guarded lines in a *copy* of the pristine `main.js`)

```js
// FLOOR: immediately after FIX 3's `goalGradientBoost = 100 * tc;` (anchored in context: tc line above, FIX 3 header, branch end)
if (globalThis.__GATEFLOORB2__ && globalThis.__GATEFLOORB2__.on) goalGradientBoost = globalThis.__GATEFLOORB2__.entry(currentKey, k, goalNeuronId, tc, structureMap.has(k));
// PROBE: immediately before the goal reset's `agentCurrent = allIds[...]` (agentCurrent still = the move's origin)
if (globalThis.__GFB2__) globalThis.__GFB2__.goalReset(agentCurrent, current, goalNeuronId);
```

`entry(from, to, goal, tc, inStructure)` returns `100·max(tc,1)` iff `inStructure` **and** `to == goal` **and** `from ≠ to` **and**
the edge oracle (the tree's own `connections.json`) confirms `from→to`; otherwise `100·tc`, unchanged. It is the *same
module* as GATE-FLOOR-1's floor. It can only raise a score, only on the goal-entering candidate, only through the term the
original expression computes. **B2 admits non-graph goal candidates; the floor evaluates them (counted `notLegal`) and
returns their value unchanged** — it never raises one. The PROBE assigns nothing, draws nothing, branches on nothing.
Both anchors match exactly once; the transform refuses otherwise. Pins: pristine `main.js` sha256 `537f37a2…`, derived
`ff8c0555fdf748e1e46e5191ed7af1d7c14f80684f6e99531b9caf5b6e649083`.

## 4. Measurement path and neutrality evidence (gate: 73 checks, 0 failed; 10/10 mutants caught)

Path: B2's own `__M7_TEL__` hook (call index, replay ticks); a setter wrapper on `__M7_ENV__` that logs each draw and calls
through unchanged; the goal-reset probe; the product's `loadBrain()` single read for delivery. `instrument: false` installs
none of it. **Neutrality, whole 1,500-call sessions, XFER-1 worlds 1–3 × {no store, goal-entry store}:** bare pristine
tree = bare derived tree = measured floor-OFF = armed-but-off, identical in run fingerprint (every decision `from->to`,
environment counters, credit keys, Q entries/sum), ticks, cognitive and visual draw counts, environment counters and
end-state brain hash. Floor ON changes behaviour, raises scores, is deterministic. **Scope on the whole runtime:** the first
decision at which ON differs from OFF is at the same position and enters the goal on a legal edge where OFF did not.
Other gate content: derived = pristine + exactly the two lines (removal restores the file byte for byte); the session driver
refuses the conformed tree, `H1R=on`, floor on the bare/pristine tree, a wrong seed; no production or earlier-study file is
modified; the measured record is self-consistent (reset counts, draw log vs environment counters, no draw into the goal).

## 5. Frozen design (design digest `392e5443bd09d1555b1d78fb6ba8a86ad3cc738e7bbc41ec94efc55548213202`; decision digest `fefd942a…`)

* **Worlds:** 160 fresh accepted configurations, stream indices 392–551 (accepted seeds 220,524–228,880; 40 per goal
  8/12/16/19), beyond XFER-1 (0–79), XFER-2 (80–231), GATE-FLOOR-1 (232–391); agent seeds `1,100,100,000 + 2w` (train) /
  `+2w+1` (test); below the held-out floor, not registered/consumed. Fresh, not the GATE-FLOOR-1 worlds: the program's seed
  governance forbids reuse and a new sample makes this an independent replication (a same-world paired design was
  considered and not chosen).
* **Per world:** one 1,500-call cold training session (the world's own store), then five 1,500-call test sessions with the
  same test seed and configuration. Arms (unchanged): COLD; COLD_FLOOR (no store, floor on); REAL (own training store);
  ENTRY_NR (5×`[u, goal]` per goal neighbour, quality 0.49); REAL_FLOOR (descriptive only).
* **Primary outcome E1 = LEGAL goal reaches** (goal resets whose move, from the agent's actual position at that call to the goal, was a graph edge; a stale pre-reset reasoning re-executed from a random node counts as legal only if that node happens to neighbour the goal). *Declared sensitivity:* every goal
  reset. This is change (1) from GATE-FLOOR-1, forced by the 38 % non-edge share: the conformed estimand counted graph-edge
  traversals only. If the class of C1, C2 or C3 differs between the two accountings the verdict states it and the sentence is
  restricted to legal reaches.
* **Margins/claims (unchanged, imported):** DELTA 25, MIN_BENEFIT 50, MAX_ATTEMPT_DROP 0.05; shortfall classes by the 95 %
  bootstrap interval (NON_INFERIOR if upper < 25, EXCEEDS if ≤ −25, FALLS_SHORT if lower ≥ 25, else INCONCLUSIVE). C1
  floor benefit lower bound ≥ 50; C2 non-inferior/exceeds REAL (needs I1: lower bound of benefit(REAL) ≥ 50); C3 same vs
  ENTRY_NR (needs I2); C4 no goal group's unadjusted 95 % interval wholly below 0 and attempt-success lower bound ≥ −0.05;
  C5 audit. Replication label: REPLICATED iff C1–C5 hold with both instruments OK; PARTIAL if C1, C4, C5 hold but C2 or C3
  does not (or an instrument is not OK); NOT_REPLICATED if C1 fails; HARM / AUDIT_FAILED otherwise. Declared Bonferroni-3
  sensitivity reported, never decisive.
* **C5 audit on B2:** the floor's counters show no lowered score, no raise above 100, no table entry other than a
  `neighbour→goal` edge; the record is self-consistent. B2's own non-edge resets are *reported per arm*, not forbidden.
* **Exclusions / stopping:** a world is excluded only if a control fails its construct check, a session fails after one
  retry, or a delivered store does not hash to its control; > 10 % excluded → INVALID; no optional stopping, no outcome-
  based exclusion, no revision. The REAL store is B2's own export and is checked for **delivery exactness only** (it may
  contain non-graph transitions; ENTRY_NR is constructed and fully checked).
* **Predictions (my expectations, declared now):** B1–B5 = C1–C5 all hold.
* **Sample size:** the largest paired SD among the calibration's arm pairs is 111.6 (legal reaches: 76–87); classifying a
  shortfall against 25 at 95 % / 80 % power needs n ≥ (2.8·111.6/25)² = 156 → 160.

## 6. Calibration (floor-OFF arms only; XFER-1 worlds 0–39 on the pristine derived tree; design input, not a confirmatory outcome)

| arm | resets | legal | non-edge | attempt success |
|---|---|---|---|---|
| COLD | 229.2 | 142.6 | 86.7 (37.8 %) | 0.655 |
| REAL | 377.0 | 211.2 | 165.9 (44.0 %) | 0.675 |
| ENTRY_NR | 441.9 | 336.9 | 105.0 (23.8 %) | 0.649 |

Benefit over COLD, legal reaches: REAL **+68.6 [42.3, 95.2]**, ENTRY_NR **+194.4 [167.8, 221.3]**; every reset: +147.8 /
+212.7. Real stores: mean 143 episodes, none empty, 32.5 % non-graph transitions. No floor session was run. *What it
changed:* the primary outcome (legal), and the observation that the instrument I1 is borderline — REAL's legal benefit +69
sits close to MIN_BENEFIT 50 (expected lower bound ≈ 55 at n = 160); if I1 is not OK only C2 is voided, by rule.

## 7. Final-hop retry reporting and other descriptive diagnostics (no threshold, no claim depends on them)

The GATE-FLOOR-1 diagnostic is **structurally degenerate** on B2 (no draw → failures 0). It is reported as such, with a
draw log whose count of draws *into the goal* would expose any exception (calibration: 0). Declared descriptive extras: B2's
non-edge resets per arm with the paired difference to COLD; which goal edge each legal entry used (distinct edges per
session, share through the least reliable edge). Any post-hoc analysis will be labelled as such.

## 8. What stays unsupported

Learning, understanding, human-like episodic recall, planning, reliability learning, routing capability, general cognition,
manufacturing competence, production safety, or any property of the current repository `main.js` (B2 ≠ HEAD is UNKNOWN).
No production code is changed in this milestone. The 223-vs-265 wiring observation of GATE-FLOOR-1 stays excluded.

## 9. Questions to challenge

1. **Pristine-runtime validity.** Is B2 (with its non-graph moves, no goal-entry draw, stale reasoning) an interpretable
   substrate for this question? Is *legal reaches* the right primary, chosen after a floor-OFF calibration but before any
   confirmatory outcome, and is the every-reset sensitivity with its restriction rule adequate?
2. **Intervention equivalence.** Is the semantic port equivalent to GATE-FLOOR-1's, and is the legal-edge guard sufficient
   given that B2 admits non-graph goal candidates? Could the floor *indirectly* create or suppress non-edge reaches in a way
   that undermines the legal-reach claim, and is reporting (not constraining) that adequate?
3. **Measurement neutrality.** Is the equality evidence in §4 sufficient to call the measured OFF runtime identical to B2?
   What additional pre-outcome check, if any, do you require?
4. **Analysis integrity.** Are margins and n = 160 defensible on this substrate (paired SDs 76–112; REAL's legal benefit
   +69 against MIN_BENEFIT 50)? Is a fresh-world replication the right comparator? Is the replication label sound?
5. **Claim limits.** Is §8 sufficient, in particular the refusal to transfer anything to current `main.js`?

## 10. Answer format

`VERDICT: PASS | PASS WITH CLAIM LIMITS | REVISE BEFORE EXECUTION`, then a short answer to each of Q1–Q5, then a numbered
list of objections each labelled **MATERIAL** (changes what I run or may claim) or **MINOR**, with the specific change you
would require. Please do not propose a different study, a second intervention value, or a donor/transfer design. If a
material objection cannot be answered from this package, say exactly which fact you would need.
