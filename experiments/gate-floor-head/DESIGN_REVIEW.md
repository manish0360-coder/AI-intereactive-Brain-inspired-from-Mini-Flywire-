# GATE-FLOOR-HEAD — design review record

Recorded **before any floor-ON outcome of the 280 study worlds existed**. This file is part of the freeze.

## Independent review

A self-contained package (exact source identities, the execution-path trace, the B2 → HEAD differences with FACT /
INFERENCE / UNKNOWN classes, the floor-OFF calibration on HEAD, the argument that the GATE-FLOOR-B2 design cannot be reused
unchanged, the proposed limited correction and six questions) was reviewed independently by Gemini, which had no repository
access and did not run or implement anything.

**Verdict: LIMITED CORRECTION — adopt the proposed corrections in their entirety.** The reviewer's reasoning: activating
FutureScore V2.3 alters the baseline dynamics so that the original thresholds and instrument gates became unsatisfiable;
demoting REAL is "an absolute mathematical necessity" (keeping I1 would void the experiment regardless of the floor);
n = 280 is arithmetically correct; no FutureScore ablation arm is needed ("the experiment correctly brackets the floor's
effect on top of the existing live FutureScore"); the result must be stated conditional on FutureScore V2.3 being live.

### Adopted corrections (and nothing else)

| | GATE-FLOOR-B2 | GATE-FLOOR-HEAD |
|---|---|---|
| substrate | pristine B2 | the exact audited HEAD (FutureScore V2.3 live) |
| REAL | instrument I1 gating C2 and the label | **descriptive contrast** (reported, gates nothing) |
| replication criterion | C1, C2, C3, C4, C5 with I1 and I2 | **C1 ∧ C3 ∧ C4 ∧ C5 with I2 valid** |
| DELTA / MIN_BENEFIT | 25 / 50 | **15 / 30** |
| worlds | 160 (40 per goal), 392–551 | **280 (70 per goal), 552–831** |
| claim scope | pristine B2 | the exact tested HEAD architecture and this intervention only |

Unchanged (not reopened): arms, floor value 1, seed governance, legal-edge guard, the measurement-neutrality requirement,
the attempt-success margin 0.05, the per-goal harm rule, the paired bootstrap, the Bonferroni-3 sensitivity, the exclusion
and stopping rules, legal goal reaches as the primary outcome, every goal reset and the non-graph resets reported
separately, the degenerate final-hop diagnostic.

### Objections the reviewer raised and their resolution

1. *Risk of treating the 40-world calibration as definitive for margins* — MIN_BENEFIT 30 lies below the calibration's lower
   bound 34.2, "a pro-safety design choice"; the margins are proportional to the headroom. Resolved as designed; the
   calibration's uncertainty is carried into the results report.
2. *Missing FutureScore attribution arm* — not necessary; it would widen the scope from the goal-entry floor to
   deconstructing HEAD's navigation stack. Resolved: no additional arm.

The reviewer's one UNKNOWN: the true SD may exceed the point estimate 87.3; the padding to n = 280 (from 266) is the buffer.

## Gate additions made for HEAD (before the freeze)

Source identity and clean production tree against the audited commit; HEAD-vs-B2 difference gate; whole-session
neutrality of the *formal* derived tree (bare HEAD = derived OFF = measured OFF = armed-but-off: decisions, environment
outcomes, RNG draws, Q entries/sum, credit keys, end-state brain hash, with and without a delivered store); intervention
determinism; refusals; digest binding of every revised parameter; the revised replication criterion and REAL's demotion on
exact fixtures.

## Claim limits

A pass supports the goal-entry floor **only within this tested HEAD configuration**: audited commit `0df804c`, Phase I,
1,500 calls, the M7 hidden-reliability harness, floor value 1, FutureScore V2.3 live. Not claimed: general routing
capability, learning, understanding, human-like recall, planning, reliability learning, general cognition, manufacturing
competence, production safety, or any property of the repository `main.js` in production use (where traversals do not fail
and FutureScore is a pure distance potential). Production code is unchanged.
