# GATE-FLOOR-1 — design review package (self-contained; no repository access needed)

**What I need from you.** One focused scientific review of the design below, *before any outcome exists*. Do not restart a
general audit of the project. Answer the four questions in §7 in the format in §8. Everything you need is in this file.

## 1. Context in one paragraph

MiniFlyWire is a small cognitive-agent runtime tested on a hidden-reliability graph task (20 nodes, 39 undirected edges, each
edge succeeds with a hidden probability; goals 8/12/16/19 cycle by world). Study XFER-1 showed that restoring a *persisted
episode store* from a prior session roughly doubles goal reaches in a new 1,500-call session (+88 reaches over cold, 128
worlds). Study XFER-2 (frozen design, pushed before outcomes, 5/6 predictions held) decomposed that effect: it is **not**
replay learning of the delivered episodes (REAL − REAL_NR = +0.1 [−8.1, 7.9]; with a disclosed RNG-consumption caveat), **not**
the content of real experience (a goal-free store with the same count/lengths/kinds, GEN_NR, gave +89; a saturated goal-free
store gave +138), and is carried by **familiarity of transitions into the goal**: a store of 5 × `[u, goal]` per goal
neighbour (ENTRY_NR) gave **+130 [113, 147]**, non-inferior to the saturated store within margin 25 (shortfall +7.8
[−7.7, 23.3]; INCONCLUSIVE under a post-hoc six-way Bonferroni, upper 28.7). Non-goal familiarity without goal entry
*lowered* reaches below cold (−16 [−33, −1]); reversed paths lowered them further (−39). Per-attempt success did not rise
(REAL .760, SAT .704, ENTRY .714, COLD .725), so this is not reliability learning.

## 2. The code fact the intervention rests on (conformed tree, `main.js`)

```js
if (Number(k) === Number(goalNeuronId)) {
    // candidate IS the goal — the final step. This must dominate even a heavily farmed local loop...
    goalGradientBoost = 100;
} else { /* 30/(dist+0.5)*0.75+5, or −8 if unreachable */ }
...
if (Number(k) !== Number(goalNeuronId)) {            // non-goal candidate
    const tc = trajectoryConfidence(currentKey, k);
    goalGradientBoost *= (0.10 + 0.90 * tc);
} else {                                              // FIX 3: ZERO PULL FOR UNWITNESSED TRANSITIONS
    const tc = trajectoryConfidence(currentKey, k);   // = min(count(u->k)/5, 1), count read from EPISODES only
    goalGradientBoost = 100 * tc;                     // overwrites the 100 above
}
```

`goalGradientBoost` then enters scoring as `× 2.0` (plus a fixed +4 `driveGoalBoost` when > 0). So a cold agent (no stored
episode) scores the goal-entering move 0 until its own episodes accumulate. FIX 3 was written to deny pull to **non-graph**
shortcuts ("forest→eat"); the conformed runtime already admits graph-neighbour candidates only (N1 mask), so there it denies
pull to a *legal* edge merely because no episode has witnessed it. Episode-derived reads of the delivered store that reach
decision scoring, as far as I traced them: adjacency count `tc` (above), `trajectoryIntegrity × 40` on the (u, goal) pair
(5 matching episodes → +40), the schema bonus (≤ +15), and replay (off in ENTRY_NR: quality 0.49 and 2 nodes). A path through
the episodic-context engine was not traced; whatever it supplies is part of the declared residual.

## 3. The intervention (one guarded line; production `main.js` and the pinned H1-R transform untouched)

Applied to a *copy* of the conformed tree's `main.js`, immediately after `goalGradientBoost = 100 * tc;`:

```js
if (globalThis.__GATEFLOOR1__ && globalThis.__GATEFLOOR1__.on) goalGradientBoost = globalThis.__GATEFLOOR1__.entry(currentKey, k, goalNeuronId, tc, structureMap.has(k));
```

`entry(from, to, goal, tc, inStructure)` returns `100·max(tc, 1)` iff `inStructure` (the product's own neighbour map) **and**
`to == goal` **and** `from != to` **and** the world's edge oracle confirms `from→to`; otherwise `100·tc` (the original value).
It draws no random number, owns no learning state, and can only raise a score. The environment's reliability draw, stored
experience, replay and every other term are untouched.

**Why the value 1 (not tuned):** (i) 100 is the value the same block assigns to "the candidate IS the goal" before FIX 3
overwrites it; (ii) `tc = 1` is exactly the state ENTRY_NR created and XFER-2 measured — the only goal-entry level with
outcome evidence. No smaller floor is tested; one would be a value chosen without evidence. Claims are limited to this value.

## 4. Design (frozen before any outcome; digest `a2d5adc3cc9d451edcbee83b312e8191137b32cdaf9c7247a4bd5081cb27312a`)

* **Worlds:** 160 fresh accepted configurations (stream indices 232–391 from seed 200,000; accepted seeds 213,241–220,428;
  40 per goal), outside XFER-1 (0–79) and XFER-2 (80–231), below the held-out floor 900,500, not registered/consumed.
  Agent seeds `1,100,100,000 + 2w` (train) / `+2w+1` (test), inside the project's declared development domain.
* **Per world:** one 1,500-call cold training session (the world's own store, for REAL), then five 1,500-call test sessions,
  same test seed and configuration (paired by construction).

| arm | start store | floor | role |
|---|---|---|---|
| COLD | none | off | baseline |
| COLD_FLOOR | none | **on** | the intervention |
| REAL | the world's own training store (replay on) | off | the persistence to reproduce |
| ENTRY_NR | 5×`[u,goal]` per goal neighbour, quality 0.49 | off | goal-entry-only mechanism ceiling |
| REAL_FLOOR | own training store | on | compatibility only (descriptive, no claim) |

* **Primary outcome:** goal reaches per test session (E1). Secondary, descriptive: attempt success, slips/call, early reaches.
* **Margins (absolute; derived from XFER-1/XFER-2 only; no ratio, no p-value):** `DELTA = 25` (about a quarter of the XFER-1
  benefit +98); `MIN_BENEFIT = 50` (= 2·DELTA, below XFER-1's lower bound 78); `MAX_ATTEMPT_DROP = 0.05` (the whole spread
  of attempt success among benefiting arms in XFER-2 was 0.056). Classification of a shortfall `reference − arm` by its 95%
  bootstrap (10,000 resamples of worlds) interval: NON_INFERIOR if upper < 25; EXCEEDS if upper ≤ −25; FALLS_SHORT if
  lower ≥ 25; else INCONCLUSIVE. A non-significant difference is never read as equivalence.
* **Claims (all must be declared-rule outcomes):**
  C1 lower bound of benefit(COLD_FLOOR) ≥ 50. C2 COLD_FLOOR NON_INFERIOR/EXCEEDS REAL (needs instrument I1).
  C3 COLD_FLOOR NON_INFERIOR/EXCEEDS ENTRY_NR (needs I2). C4 no goal group harmed (a group's unadjusted 95% interval of
  COLD_FLOOR − COLD entirely below 0 is harm; unadjusted deliberately, so a safety claim is easier to fail) and the lower
  bound of the attempt-success difference ≥ −0.05. C5 the audit passes in every floor session.
* **Instruments:** I1 lower bound of benefit(REAL) ≥ 50; I2 lower bound of benefit(ENTRY_NR) ≥ 50. Below 50 (but > 0) the
  claim that uses that reference is NOT_INTERPRETABLE_LOW_BENEFIT; ≤ 0 DID_NOT_REPRODUCE. Only that claim is voided.
* **Predictions (my expectations, declared now):** F1 C1 holds; F2 C2 holds; F3 C3 holds, with a modest shortfall possible
  from the declared residual (trajectoryIntegrity +40 and schema ≤ +15 on the pair, which the floor does not supply);
  F4 C4 holds; F5 C5 holds.
* **Outcome → conclusion map (declared):** C1 false with I2 OK → evidence *against* sufficiency of the scoring term (the
  residual lies in what episodes also supply, or in dynamics the floor does not create); C1 true, C3 FALLS_SHORT → the
  goal-entry gradient is not all of it (a limitation of the intervention, not a refutation); any harm or audit failure →
  not recommended regardless of mean benefit; C1–C3 true, C4–C5 true → the floor deserves a *production-design proposal*
  (not adoption).
* **Exclusions / stopping:** a whole world is excluded only if a control fails its construct check, a session fails after
  one retry, or a delivered store does not hash to the control; > 10% excluded → block INVALID; no optional stopping; no
  outcome-based exclusion; no revision after outcomes. The block runs once, in full.
* **Sample size:** the largest paired SD among arm pairs in XFER-2 block D (128 worlds, same instrument and task) is 111.1
  reaches (median 97). Classifying a shortfall against 25 with a 95% interval and 80% power needs n ≥ (2.8·SD/25)² = 155
  → 160 worlds (40/goal; the per-goal harm check has half-width ≈ 1.96·111/√40 ≈ 34).
* **Declared sensitivity (reported, never decisive):** C1–C3 re-evaluated at a Bonferroni-3 interval (level 0.9833);
  any claim whose class changes is reported as fragile. (XFER-2's weak point was exactly this.)

## 5. Audit / no-shortcut (C5), computed per session from the measurement sink and the runtime's own counters

Every environment draw is a graph edge; every goal reach follows a *successful goal-entering draw* (goal reaches == successful
goal-entering draws); no move blocked by the N1 guard; the floor was only evaluated on legal goal-entering candidates, never
lowered a score, never raised by more than 100, and its per-edge table contains only `u→goal` edges. The environment's
reliability draw is not touched, so the floor cannot create a goal reach without a legal, probabilistic traversal.

## 6. What has been verified before any outcome (gate: 77 checks, 0 failed; 14/14 mutants caught)

* The derived `main.js` equals the conformed one plus exactly the one line; removing it restores the conformed file byte for
  byte; every other file is byte-identical; production files and the pinned H1-R transform (digest `02ccbf382ad7…`) are unmodified.
* **Off == pristine on the whole runtime:** a session with the global absent equals the existing XFER-1 session on the
  conformed tree (fingerprint, endpoints, goal-reach calls, end-brain hash, RNG draw counts, environment counters); also with
  the global armed-but-off, with a delivered store, and with `tcFloor = 0`; ON is deterministic and *does* change behaviour.
* **Scope on the whole runtime:** in a 300-call probe the first candidate record that differs between OFF and ON is the
  goal-entering candidate of the same decision step, and its score is raised.
* Unit scope of `entry()` (non-goal candidates, non-edges, self moves, outside the structure map: unchanged; never lowers;
  counters exact); analysis rules on exact fixtures (clean, no-benefit, small-benefit, one harmed group, attempt-success drop,
  audit failure, low baseline, short of ceiling, invalid blocks); freshness of seeds/worlds, stream seam, power recomputation.
* Mutants caught: floor ignoring legality / goal / edge oracle, setting instead of raising, lowering, unguarded `.on`,
  insertion before the anchor (inert), floor leaking into a non-goal candidate; and six analysis-rule mutants.
* Orchestrator plumbing was exercised on XFER-1 worlds 0–3 with the floor-OFF arms only (deliveries hash-exact; COLD and REAL
  reproduce XFER-1's goal reaches exactly): **no floor outcome was generated by it.**

**Disclosure.** While wiring the floor session driver I ran COLD, floor-OFF and floor-ON on XFER-1 world 1 (a world used by
the XFER gates, outside all 160 study worlds) and the printed audit incidentally showed 223 (OFF) vs 265 (ON) goal reaches
there. One world, SD ≈ 100: it carries no inferential weight, and every design parameter (value 1, n = 160, margins, claims)
had been fixed before it was seen.

## 7. Questions to challenge

1. **Isolation.** Does the comparison isolate the *goal-entry scoring term* from an episode-storage effect? What confound
   between COLD_FLOOR and ENTRY_NR (beyond the declared trajectoryIntegrity/schema residual) have I missed?
2. **Exploit vs capability.** Is there a way the floor could raise goal reaches without being a real capability gain
   (e.g., an environment-interface artefact, the oracle goal, retry-farming of an unreliable edge)? Is the audit + the
   attempt-success rule enough to tell the difference? What additional *pre-outcome* control would you require?
3. **Margins and size.** Are DELTA = 25, MIN_BENEFIT = 50, MAX_ATTEMPT_DROP = 0.05 and n = 160 defensible, given the evidence
   in §1? Is the per-goal harm rule (unadjusted, upper bound < 0) too lenient or too strict at 40 worlds per goal?
4. **Claim limits.** Is the stated limit sufficient: B2-conformed runtime, Phase I (1,500 calls), hidden-reliability task with
   an oracle goal, floor value 1 only; no claim about current `main.js`, human-like recall, planning, reliability learning,
   general cognition, or manufacturing competence?

## 8. Answer format

`VERDICT: PASS | PASS WITH CLAIM LIMITS | REVISE BEFORE EXECUTION` then, for each of Q1–Q4, a short answer; then a numbered
list of objections, each labelled **MATERIAL** (changes what I run or what I may claim) or **MINOR**, with the specific change
you would require. Please do not propose a different study, a donor/transfer design, or a second intervention value: those
are outside this milestone. If you think a material objection cannot be answered from this package, say exactly which fact
you would need.
