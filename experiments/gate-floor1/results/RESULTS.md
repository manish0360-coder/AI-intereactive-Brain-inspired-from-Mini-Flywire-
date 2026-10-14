# GATE-FLOOR-1 results (DEVELOPMENT / EXPLORATORY)

Substrate: the M7-conformed B2 tree (`707cb1e` + H1-R transform `02ccbf38…`) with one extra guarded line in a *copy* of
`main.js` (floor tree, `main.js` sha `7e70e0f1…`), **not** current `main.js`. Task: one world, a 1,500-call Phase I
session; primary outcome goal reaches. Design frozen and pushed before any block outcome existed: commit `d5dbac1`
(remote head verified), decision digest `a2d5adc3cc9d451edcbee83b312e8191137b32cdaf9c7247a4bd5081cb27312a` (what the
independent review saw), design digest `5cc76308d471b4fd95ccbdd15ad666c359c3a28a691f3860b0f98a636443771d`.
Raw analysis output: `summary_blockF.json` (produced by `analyze.mjs` unchanged); per-world export `perworld_blockF.json`;
`manifest_blockF.json`; `exploratory_edgemix.json` (post-hoc, below). Raw sessions stay in the git-ignored `data/`.

## Execution

| block | worlds | accepted seeds | sessions | integrity | excluded |
|---|---|---|---|---|---|
| F (the only block) | 232–391 (160; 40 per goal 8/12/16/19) | 213,241 – 220,428 | 160 training + 800 test | passed | 0 |

Manifest digest `1b2fbf3671ee4a6f93c7b5ed832e482d0ef7da3bfaf79fd9b34b3873c2599e44`. 13 minutes wall time. No session failed
after its retry and no world was excluded; no deviation from the frozen protocol occurred. (The orchestrator records
failures, not per-session retries.) 320 sessions ran the floor (COLD_FLOOR and REAL_FLOOR); 18 worlds had an empty training
store, so REAL ≡ COLD (and REAL_FLOOR ≡ COLD_FLOOR) there by construction — not an exclusion under the frozen rules.

## Confirmatory outcomes (frozen rules; status of both instruments OK)

Goal reaches per 1,500-call test session, mean over 160 worlds, and paired benefit over COLD [95% bootstrap interval]:

| arm | mean | benefit vs COLD | per-attempt success |
|---|---|---|---|
| COLD | 76.9 | — | 0.714 |
| **COLD_FLOOR** (no stored episode) | 229.5 | **+152.7 [137.2, 168.4]** (higher in 152 of 160 worlds) | 0.721 |
| REAL | 181.7 | +104.8 [89.8, 120.6] | 0.747 |
| ENTRY_NR | 222.6 | +145.7 [129.5, 162.0] | 0.718 |
| REAL_FLOOR (descriptive) | 242.8 | +165.9 [150.2, 181.5] | 0.722 |

| claim | rule (declared) | observed | |
|---|---|---|---|
| I1 | lower bound of benefit(REAL) ≥ 50 | 89.8 | OK |
| I2 | lower bound of benefit(ENTRY_NR) ≥ 50 | 129.5 | OK |
| **C1** capability | lower bound of benefit(COLD_FLOOR) ≥ 50 | **137.2** | **holds** |
| **C2** reproduces persistence | shortfall(REAL − COLD_FLOOR) NON_INFERIOR / EXCEEDS | −47.8 [−61.7, −33.5] **EXCEEDS** | **holds** |
| **C3** approaches ceiling | shortfall(ENTRY_NR − COLD_FLOOR) NON_INFERIOR / EXCEEDS | −7.0 [−15.2, 0.9] **NON_INFERIOR** | **holds** |
| **C4** no harm | no goal group interval wholly < 0; attempt-success lower bound ≥ −0.05 | all four groups > 0; +0.007 [−0.011, 0.024] | **holds** |
| **C5** audit | clean in every floor session | 320 / 320 clean | **holds** |

Goal groups (benefit of COLD_FLOOR over COLD; n = 40 each): goal 8 **+167.9** [131.1, 204.6] (COLD 61.0); goal 12
**+148.3** [117.5, 179.5] (COLD 94.7); goal 16 **+100.5** [76.7, 126.1] (COLD 131.5); goal 19 **+193.9** [172.2, 214.2]
(COLD 20.3). No group is harmed; the smallest benefit is where COLD is already strongest.

Predictions F1–F5 all held. **Multiplicity:** none corrected in the rules; the declared Bonferroni-3 sensitivity (level 0.9833)
changes no class: C1 lower 133.9; C2 EXCEEDS [−64.9, −29.8]; C3 NON_INFERIOR [−17.3, 2.5]; no claim is fragile. The floor acted
in every floor session (mean 465.6 raised evaluations of 1,637.5 goal-entering evaluations, 31%); per-attempt success is
unchanged, so this is not reliability learning.

**The declared residual was not needed.** The floor did not fall short of ENTRY_NR: the point estimate is slightly *above* it
(+7.0 reaches, interval touching 0.9). The trajectory-integrity / schema terms that ENTRY_NR's episodes also feed are not
required to reproduce its benefit on this runtime.

## Final-hop retry diagnostic (descriptive; no threshold; does not enter C1–C5)

Final-hop attempt = environment draw on a legal graph edge into the active goal; failed = slip (`ok` 0); successful = a goal
reach. Pooled over the 160 sessions of each arm:

| arm | attempts | failed | successful | failed per success | zero-success sessions | max failure run |
|---|---|---|---|---|---|---|
| COLD | 17,210 | 4,908 | 12,302 | 0.399 | **25 / 160** | 23 |
| COLD_FLOOR | 58,223 | 21,496 | 36,727 | 0.585 | 0 / 160 | 24 |
| REAL | 41,418 | 12,343 | 29,075 | 0.425 | 2 / 160 | 21 |
| ENTRY_NR | 56,817 | 21,209 | 35,608 | 0.596 | 0 / 160 | 24 |
| REAL_FLOOR | 60,985 | 22,136 | 38,849 | 0.570 | 0 / 160 | 27 |

Zero-success sessions (all kept in the totals, none excluded): COLD 25 (goal 8: 5, goal 12: 3, goal 16: 1, goal 19: 16),
REAL 2 (goal 19; worlds 279, 367); no floor or ENTRY_NR session. Paired-by-world difference in pooled failed-per-success
[95% interval]; reading = direction of the interval relative to 0:

| comparison | difference | reading | failed attempts per session, difference |
|---|---|---|---|
| COLD_FLOOR − COLD | +0.186 [0.068, 0.297] | **HIGHER** | +103.7 [88.6, 119.2] |
| COLD_FLOOR − REAL | +0.161 [0.075, 0.243] | **HIGHER** | +57.2 [39.9, 74.5] |
| COLD_FLOOR − ENTRY_NR | −0.010 [−0.026, 0.005] | NOT_DISTINGUISHABLE | +1.8 [−1.8, 5.5] |
| ENTRY_NR − COLD | +0.197 [0.077, 0.309] | HIGHER | +101.9 [86.5, 117.4] |
| REAL − COLD | +0.026 [−0.093, 0.143] | NOT_DISTINGUISHABLE | +46.5 [31.6, 62.5] |
| REAL_FLOOR − REAL | +0.145 [0.077, 0.211] | HIGHER | +61.2 [45.9, 76.9] |

Per goal (COLD_FLOOR − COLD): goal 16 HIGHER (+0.193 [0.035, 0.344]); goals 8, 12 and 19 NOT_DISTINGUISHABLE (goal 19
+0.324 [−0.005, 0.500]). Magnitude context: successes per session rose ×3.0 (76.9 → 229.5) while failed attempts rose ×4.4
(30.7 → 134.3); attempts per success 1.40 → 1.59.

**Applying the declared wording rule:** the floor shows a HIGHER failures-per-success than COLD and REAL while it benefits, so
the benefit is **not to be described as demonstrated routing capability.**

## Exploratory, post-hoc (not confirmatory; `exploratory_edgemix.mjs`)

* **Edge mix, not repeated retrying of one edge.** The draw is memoryless: each attempt succeeds with the edge's own hidden
  probability. In every arm the observed final-hop success share equals the share implied by the edges attempted (COLD
  .715 vs .712; COLD_FLOOR .631 vs .634; REAL .702 vs .700; ENTRY_NR .627 vs .630; REAL_FLOOR .637 vs .639; |z| ≤ 1.9). The
  floor sends the agent through **all** of the goal's neighbour edges (4.00 distinct per session vs 2.38 in COLD), including
  the world's least reliable one (38% of attempts vs 30%); the attempts-weighted mean true p of the edges used falls by
  −0.080 [−0.119, −0.041] (143 worlds with attempts in both arms; ENTRY_NR −0.082). A likely reason (NOT tested here): COLD's few
  entries come through neighbours its own episodes have already witnessed, and an episode only records a traversal that
  *succeeded*, so COLD attempts a more reliable subset. Either way the higher ratio follows from committing to every legal
  final hop; it is not evidence of a better route, and it is not repeated retrying of a single edge. Overall per-attempt
  success is flat.
* **By store size** (REAL ≡ COLD in the 18 empty-store worlds): empty store (18 worlds) floor +128.9 [82.8, 173.1];
  ≥ 1 episode (142 worlds) floor +155.7 [138.8, 171.7], REAL +118.1 [101.7, 133.7], REAL − floor −37.5 [−51.7, −23.4],
  ENTRY_NR − floor −10.2 [−18.7, −2.5]; ≥ 20 episodes (106 worlds) REAL − floor −27.5 [−43.4, −12.0]. The floor exceeds REAL
  also where REAL has a store.
* REAL raises per-attempt success by +0.033 [0.015, 0.051] (as in XFER-2: .760 vs .725); the floor does not (+0.007), and
  REAL_FLOOR (.722) gives that gain back while adding reaches. Not interpreted further here.
* The incidental **223 (OFF) vs 265 (ON)** single-world observation on XFER-1 world 1 stays excluded from confirmatory
  inference (outside all 160 worlds; observed after every design parameter was fixed).

## Narrowest defensible conclusion

On the B2-conformed runtime, in a 1,500-call Phase I session, over 160 fresh worlds, for floor value 1 only:

1. A guarded, default-off floor that gives a legal graph edge into the active goal the saturated goal-entry score
   (`goalGradientBoost = 100`) **with no stored episode** raised goal reaches by +153 over cold, exceeded restoring the
   real episode store by ≈ 48 reaches, and was non-inferior to the goal-entry-only episode store; no goal group was
   harmed, per-attempt success did not change, and the no-shortcut audit was clean in all 320 floor sessions.
2. The benefit was **not** accompanied by better edge choice: failed final-hop attempts per success were higher than COLD and
   REAL (equal to ENTRY_NR), explained by attempting every legal goal edge including less reliable ones. It is a
   **commitment effect on the last hop** — the runtime's rule withholds that move until an episode has witnessed it, and
   the floor removes the withholding for graph edges — not demonstrated routing capability.
3. Together with XFER-2, this is consistent with the episode benefit measured in XFER-1 being, on this runtime, largely a
   scoring-rule effect (cold-start gating of the goal-entering move) that is reproducible without storing or injecting
   episodes.

**Not claimed:** learning, understanding, human-like episodic recall, planning, reliability learning, routing capability,
general cognition, manufacturing competence, production safety, or any property of current `main.js` (no conformance
edits, no N1 mask, a different purpose for FIX 3 in the browser app). No production code was changed.

## Corrections, deviations and disclosures

* The frozen analysis serialises only the four endpoints per world and arm (the in-memory floor counters and final-hop
  summaries are not written to its JSON); `export_perworld.mjs` re-extracts them through the same integrity-checked loader so
  that every reported number is recomputable from committed files (gate section E).
* `exploratory_edgemix.mjs` and its output were written after the outcomes and are labelled post-hoc; no claim uses them.
* The final-hop diagnostic was added before the freeze, at the independent reviewer's requirement; it introduced no threshold.
* Two statements of the review (that the result "proves" a primary driver; that production would "teleport") are not
  adopted; see `DESIGN_REVIEW.md`.

## Verification

`verify_gatefloor1.mjs`: 110 checks, 0 failed; 20/20 mutants caught (floor runtime, transform, analysis rules, retry metric),
including section E, which recomputes the benefits, classes, claims, verdict, predictions and every final-hop figure from the
committed per-world file. Registry gates (17/0, 67/0), `verify_xfer1` (86/0, 15 mutants) and `verify_xfer2` (99/0,
18 mutants) pass.
