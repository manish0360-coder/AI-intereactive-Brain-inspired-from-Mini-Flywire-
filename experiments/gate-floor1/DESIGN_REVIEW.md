# GATE-FLOOR-1 — design review record and the final-hop correction

Recorded **before any outcome of the 160 study worlds existed**. This file is part of the freeze.

## Independent review

A self-contained design package (arms, margins, claims, predictions, audit, gate results, the single-world disclosure) was
reviewed independently by Gemini, which had no repository access. **Verdict: PASS WITH CLAIM LIMITS.** The reviewer
validated: isolation of the goal-entry scoring term, the declared trajectory-integrity / schema residual, the margins and
n = 160 (derived from the largest paired SD, 111.1), the unadjusted per-goal harm rule (a deliberately pro-safety choice), and
the handling of the single-world disclosure. It required **one** correction, classed material:

> report the raw retry rate of the final goal-entering hop, so that the no-shortcut audit (C5) cannot be satisfied by a
> localized retry-farming exploit (an agent camping on the goal edge and re-drawing its reliability).

The audit proves no teleportation or illegal move; it does not by itself show that goal reaches were not bought with
disproportionate retrying of the last hop. Accepted and implemented as a **descriptive diagnostic**.

### Two statements in the review that are not adopted verbatim

* "The intervention **proves** … the goal-entry gradient term is the primary mechanical driver." The permitted claim is
  narrower (below): a result on the B2-conformed runtime, for floor value 1 only, and a *proof* of nothing.
* "The production code … would allow non-graph teleportation if the tc check were bypassed." The inserted line requires the
  product's own `structureMap.has(k)` as well as the edge oracle, so it never applies to a non-graph candidate. Production
  safety is nevertheless **not claimed**: the browser app has no N1 mask and FIX 3 there has a different purpose.

## The final-hop retry diagnostic — exact definition

Source: the measurement sink's draw records, one per environment draw: `[call, from, to, ok, goalEntering, a, s]`, where `ok`
is the draw's own outcome. Nothing is inferred from repeated node visits.

| term | definition |
|---|---|
| final-hop attempt | an environment draw on a legal graph edge `from → goal` into the **active** goal (`to == goal`, `from ≠ to`, edge oracle true) |
| failed attempt | such a draw with `ok = 0` (a slip: the agent stays at `from`) |
| successful traversal | such a draw with `ok = 1`; its call index is exactly a goal reset (verified per session) |
| failures per success | `failures / successes`, **pooled over sessions** (ratio of sums) |
| zero-success session | `successes = 0`: counted and listed by arm and goal; its failures stay in the pooled numerator; never dropped, never causes a world exclusion |
| max failure run | longest run of failed final-hop attempts with no successful one between them |

Reported **by arm** (COLD, COLD_FLOOR, REAL, ENTRY_NR, REAL_FLOOR) and **by goal group**, with a **paired-by-world** percentile
bootstrap (10,000 resamples, seed 20261014, one common resample of worlds applied to both arms of a comparison; replicates
with no success in either arm are counted and skipped) of the difference in pooled failures/success, plus a paired
per-world difference in failed attempts (defined for every world). Declared comparisons: COLD_FLOOR−COLD, COLD_FLOOR−ENTRY_NR,
COLD_FLOOR−REAL, ENTRY_NR−COLD, REAL−COLD, REAL_FLOOR−REAL.

**It introduces no confirmatory threshold.** The interval's direction relative to zero (HIGHER / LOWER / NOT_DISTINGUISHABLE)
is a *reading*; it changes no claim C1–C5, no status, no exclusion. Its only effect is the declared wording rule: if COLD_FLOOR
shows a HIGHER failures-per-success than COLD, ENTRY_NR or REAL while it benefits, the benefit is **not** to be described as
demonstrated routing capability.

**The diagnostic is computed from recorded events, and checked as such**: every session record carries its events; the
analysis recomputes the summary from them, requires `attempts` = audit goal-entering attempts, `successes` = goal reaches and
the successful events' calls = the independently recorded goal-reset calls. A mismatch, a missing block or a tampered
count makes the block INVALID.

## What the correction did not change

The reviewed **decision digest** is unchanged (`a2d5adc3cc9d451edcbee83b312e8191137b32cdaf9c7247a4bd5081cb27312a`, asserted by
the gate): arms, store/floor allocation, worlds 232–391, seeds, goals, tree pins (`main.js` sha `7e70e0f1…`, parent
`10c6ed9c…`), floor value 1, margins (DELTA 25, MIN_BENEFIT 50, MAX_ATTEMPT_DROP 0.05), n = 160, claims C1–C5, instruments
I1/I2, predictions F1–F5, exclusion and stopping rules, bootstrap settings. The scoring behaviour is unchanged: the gate's
off-equivalence, scope and determinism checks pass on the corrected harness. The **design digest** additionally binds the
descriptive diagnostics and therefore differs from the decision digest by construction.

## Claim limits (unchanged)

Permitted only for: the B2-conformed runtime, Phase I, 1,500 calls, the hidden-reliability task with an oracle goal, floor value
1. **Not** claimed: learning, understanding, human-like episodic recall, planning, reliability learning, general cognition,
manufacturing competence, production safety, or any property of current `main.js`. Production code is unchanged.

* The **223 (OFF) vs 265 (ON)** goal reaches seen incidentally on XFER-1 world 1 while wiring the session driver stay
  **excluded from confirmatory inference**: one world outside all 160 study worlds, observed after every design parameter was
  fixed, with SD ≈ 100.
* If the benefit appears alongside disproportionate final-hop retrying it is not to be described as demonstrated routing
  capability; if the floor reproduces only part of ENTRY_NR's benefit, the declared trajectory-integrity / schema residual is
  the retained explanation.
