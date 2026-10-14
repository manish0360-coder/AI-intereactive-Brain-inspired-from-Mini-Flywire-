# XFER-2 results (DEVELOPMENT / EXPLORATORY)

Substrate: the M7-conformed B2 tree (`707cb1e` + transform `02ccbf38…`), **not** current `main.js`. Task: one world, a
1,500-call Phase I session after a 1,500-call cold training session in the same world; primary outcome goal reaches.
Design frozen and pushed before any block outcome existed: commits `baf837b` and `3501da3` (remote head
`3501da3d9a07351417ff6a45c7c9af0c763a0b86`), design digest
`5df39093d755d6eea4306e09605d61d6322dfdec60707e7c022d675befe4a2fb`. Raw analysis output: `summary_blockC.json`,
`summary_blockD.json` (this directory; produced by `analyze.mjs` unchanged). Raw session records stay in the git-ignored
`data/`.

## Execution

| block | role | worlds | accepted seeds | sessions | integrity | excluded | manifest digest |
|---|---|---|---|---|---|---|---|
| C | instrument check, exploratory | 80–103 (24) | 205256 – 206337 | 24 training + 192 test | passed | 0 | `e6bc742c…` |
| D | replication, **primary** | 104–231 (128) | 206463 – 213177 | 128 training + 1,024 test | passed | 0 | `973b942d…` |

No session failed and no world was excluded. No deviation from the frozen protocol was identified (see "Corrections").

## Block D (primary; status OK: lower bound of benefit(REAL) 71.5 ≥ 50)

Goal reaches per 1,500-call test session, mean over 128 worlds, and paired benefit over COLD [95% bootstrap interval]:

| arm | mean | benefit vs COLD |
|---|---|---|
| COLD | 94.9 | — |
| REAL | 183.2 | +88.3 [71.5, 104.9] |
| REAL_NR | 183.1 | +88.3 [71.4, 105.1] |
| GEN_NR (matched generic) | 184.2 | +89.3 [70.7, 107.8] |
| SAT_NR (upper bound) | 233.0 | +138.1 [119.5, 156.5] |
| SAT_NOENTRY_NR | 78.5 | −16.4 [−32.8, −0.6] |
| ENTRY_NR | 225.2 | +130.3 [113.0, 147.4] |
| REV_NR | 56.0 | −38.9 [−55.1, −23.1] |

Declared classifications (shortfall = reference − arm; margin DELTA = 25):

| comparison | shortfall [95%] | class | prediction |
|---|---|---|---|
| REAL_NR vs REAL | +0.1 [−8.1, 7.9] | NON_INFERIOR | P2 PASS |
| SAT_NR vs REAL_NR | −49.8 [−69.3, −31.2] | EXCEEDS | P3 PASS |
| GEN_NR vs REAL_NR | −1.1 [−15.8, 14.1] | NON_INFERIOR | **P4 FAIL** (predicted FALLS_SHORT) |
| REV_NR vs REAL_NR | +127.1 [110.4, 143.8] | FALLS_SHORT | P5 PASS |
| ENTRY_NR vs SAT_NR | +7.8 [−7.7, 23.3] | NON_INFERIOR | P6 PASS |
| SAT_NOENTRY_NR vs SAT_NR | +154.5 [138.1, 171.1] | FALLS_SHORT | (diagnostic) |

P1 PASS. Five of six predictions held; **P4 was wrong**: at matched budget the real placement is not better than generic
exposure.

### Multiplicity

No correction was declared. The six predictions are individual, separately-declared classifications. The headline
sentence rests on SAT_NR vs REAL_NR, GEN_NR vs REAL_NR and REAL_NR vs REAL, all far from the margin. **Post-hoc, not part
of the frozen rules:** with a Bonferroni interval for six comparisons (level 0.9917), P2 stays NON_INFERIOR
[−10.4, 10.7], P3 becomes NON_INFERIOR [−77.1, −24.6] (still satisfies P3), P4 stays NON_INFERIOR [−21.0, 19.5], P5
stays FALLS_SHORT, and **P6 becomes INCONCLUSIVE [−12.7, 28.7]**. The goal-entry-term claim is therefore the fragile
one; the replay, generic-exposure and direction findings are not.

## Block C (24 worlds)

Status `NOT_INTERPRETABLE_LOW_BENEFIT`: benefit(REAL) +82.3 [46.7, 117.5], lower bound 46.7 < 50, so by the frozen rule no
mechanism sentence is allowed and all six predictions are recorded "not satisfied" (that is a status, not a falsification).
Point estimates have the same signs as block D and the same order among the positive arms except GEN (SAT +152,
ENTRY +144, GEN +130, REAL +82); the two negative arms differ in order (REV −17, SAT_NOENTRY −36, against −39 and −16 in
block D) and both intervals in C include or touch zero. Block C played no part in the analysis of block D.

## Narrowest defensible conclusion

On the B2-conformed runtime, in a 1,500-call Phase I session, over 128 worlds:

1. Restoring the real episode store reproduces the XFER-1 gain (+88 goal reaches).
2. That gain is **not** attributable to replay of the delivered episodes (REAL − REAL_NR = +0.1 [−8.1, 7.9]) — with
   the caveat below — **nor** to the real content: a goal-free store with the same number, lengths and kinds of
   episodes (GEN_NR) gives +89, and a saturated goal-free store gives +138, more than the real store.
3. The benefit is carried by familiarity of transitions **into the goal**: a store of 15–25 two-node episodes [u, goal]
   (ENTRY_NR) gives +130, within the margin of the saturated store, while familiarity of non-goal edges *without* goal
   entry lowers goal reaches below cold (SAT_NOENTRY_NR −16) and reversed paths lower them further (REV_NR −39).
   An agent with an empty store has no pull into the goal at all (`100·tc`, `tc = 0`); the real store supplies this
   only incidentally because its episodes end at the goal.
4. So, in this runtime and task, the effect is a **mechanical gating effect**, and correcting cold-start scoring of the
   goal-entering term dominates improving episodic memory. This does **not** show that stored experience is useless in
   general; it shows that the part of it that mattered here is a handful of goal-entering transitions the runtime
   refuses to credit until it has "witnessed" them.

### Caveats that bound the conclusion

* **RNG consumption.** A replay tick draws from the cognitive stream only when an eligible episode exists, so REAL and
  REAL_NR consume the stream differently; their contrast is *replay behaviour plus that perturbation*, and perfect
  isolation of replay learning is not claimed. Decisions were identical until the first replay tick (verified), and the
  interval is tight (±8 reaches), but the shift is not removed.
* **ENTRY_NR is not goal-free**: it uses the goal's identity (the agent already has the oracle gradient), and its
  non-inferiority to SAT_NR (upper bound 23.3 against a margin of 25) does not survive a six-fold Bonferroni adjustment.
* GEN_NR bundles edge identity, direction and goal termination; the design cannot separate "goal-conditioned" from
  "topology-specific" familiarity (the donor arms of the first draft were removed and are not in the frozen design).
* The two gate terms are not additive: ENTRY (+130) plus NOENTRY (−16) is +114 against SAT +138 (descriptive).
* Per-attempt success does not rise with the gain (REAL 0.760, SAT 0.704, ENTRY 0.714, COLD 0.725): nothing here is
  reliability learning.
* Not shown: human-like episodic recall, understanding, planning, goal-conditioned recall, general cognition, or any
  property of current `main.js`, longer sessions, or a reliability shift.

## Corrections and deviations

* The frozen design has **no donor arms and no ratio bins**; the independent review text referred to both (they belong
  to the first draft). The execution followed the frozen files; the review's verdict was accepted within its stated claim
  limits and its mis-descriptions were not adopted.
* `README.md` (frozen commit) says the arms "already diverge at the first decision". That is true of arms with different
  stores, **not** of REAL vs REAL_NR, which were verified identical until the first replay tick.
* Design-integrity sessions ran on XFER-1 world 1 only (delivery exactness and determinism; no endpoint read). No
  XFER-2 block session existed before the freeze (verified from the data directory before the push).
* The orchestrator records failures but not per-session retries; none failed after a retry.
