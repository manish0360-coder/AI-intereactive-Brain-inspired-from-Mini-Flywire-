# GATE-FLOOR-HEAD results (DEVELOPMENT / EXPLORATORY)

Substrate: the runtime file set of the **audited current HEAD** `0df804c497e649affb9e7ebacb10fdc81ab6de8d` (FutureScore V2.3 live,
`main.js` sha `c92c5c6b…`) plus two guarded call-level lines in a copy (derived `main.js` sha `8cf1dc29…`); production
untouched. Task: one world, a 1,500-call Phase I session after a 1,500-call cold training session in the same world.
**Primary outcome: legal goal reaches.** Design frozen and pushed before any floor-ON study outcome existed: commit `1d5c313`
(remote head verified); decision digest `70c06167ae85fb74d404eb3d318a2a767c99da4142e18a77d8d4e1e9fc36edad`, design digest `ffaebe0aad8feb36c097d67ba0fa1d23bf7a50e158502ebc0f95a8db05d14f2d`. Raw output: `summary_blockH.json` (the frozen
`analyze.mjs`, unchanged), `manifest_blockH.json`; post-hoc: `exploratory_blockH.json`. Raw sessions stay in the git-ignored `data/`.

## Execution

| block | worlds | accepted seeds | sessions | integrity | excluded |
|---|---|---|---|---|---|
| H (the only block) | 552–831 (280; 70 per goal 8/12/16/19) | 228,894 – 242,532 | 280 training + 1,400 test | passed | 0 |

Manifest digest `22dfe2b05f42abc55a1afb72f5dd47f51b07517fef3bce06d2bc0a7a9259bd03`; 35 min 22 s wall time; agent seeds `1,100,101,104 … 1,100,101,663`; no session failed after its
retry; no deviation from the frozen protocol; every training store had ≥ 1 episode.

## Confirmatory outcomes (frozen rules; I2 valid)

Per 1,500-call test session, mean over 280 worlds; benefit = paired difference over COLD [95 % bootstrap interval]:

| arm | legal reaches | every reset | non-graph resets | attempt success | benefit, legal (primary) | benefit, every reset (sensitivity) |
|---|---|---|---|---|---|---|
| COLD | 298.4 | 411.0 | 112.7 (27 %) | 0.683 | — | — |
| **COLD_FLOOR** (no stored episode) | **360.9** | 471.3 | 110.4 (23 %) | 0.678 | **+62.6 [54.6, 70.6]** (higher in 206, lower in 29, equal in 45 of 280) | +60.3 [51.0, 69.8] |
| ENTRY_NR | 359.8 | 469.5 | 109.7 (23 %) | 0.677 | +61.5 [53.5, 69.7] | +58.4 [49.4, 67.8] |
| REAL (descriptive) | 317.7 | 463.9 | 146.2 (32 %) | 0.688 | +19.4 [8.8, 29.8] | +52.8 [41.5, 64.4] |
| REAL_FLOOR (descriptive) | 352.9 | 499.0 | 146.0 (29 %) | 0.684 | +54.6 [44.6, 64.3] | +87.9 [76.6, 99.5] |

| claim | rule (declared) | observed | |
|---|---|---|---|
| I2 | lower bound of benefit(ENTRY_NR) ≥ 30 | 53.5 | valid |
| **C1** capability | lower bound of benefit(COLD_FLOOR) ≥ 30 | **54.6** | **holds** |
| **C3** vs ceiling | shortfall(ENTRY_NR − COLD_FLOOR) NON_INFERIOR / EXCEEDS at 15 | −1.1 [−3.0, 0.8] **NON_INFERIOR** | **holds** |
| **C4** no harm | no goal group wholly < 0; attempt-success lower bound ≥ −0.05 | all four groups > 0; −0.004 [−0.013, 0.004] | **holds** |
| **C5** audit | clean in every floor session | 560 / 560 clean | **holds** |
| C2 (descriptive, gates nothing) | shortfall(REAL − COLD_FLOOR) | −43.2 [−51.9, −34.5] EXCEEDS | reported |

**Replication criterion C1 ∧ C3 ∧ C4 ∧ C5 with I2 valid: PASSED — REPLICATED.** Predictions H1–H4 held.

* **Goal groups** (legal-reach benefit of COLD_FLOOR; n = 70 each; COLD legal in brackets): goal 8 **+101.8** [86.9, 117.4]
  (322.6); goal 12 **+65.1** [51.2, 79.3] (338.8); goal 16 **+29.2** [16.1, 43.6] (270.6); goal 19 **+54.1** [39.0, 70.5] (261.4).
  No group harmed; goal 16 is again the smallest.
* **Sensitivity (every goal reset):** C1 lower bound 51.0, C3 NON_INFERIOR (−1.8 [−4.3, 0.7]): classes agree. **Declared
  Bonferroni-3 sensitivity (level 0.9833):** C1 lower 52.7; C3 NON_INFERIOR [−3.5, 1.2]; REAL descriptive EXCEEDS
  [−53.9, −32.7]; no claim fragile.
* The floor acted in every floor session: 500 raised evaluations per session of 2,530 evaluated, of which 485 per session
  were non-graph goal candidates that the floor evaluated and left unchanged (by construction).

## REAL's descriptive contrast (reported transparently; it gates nothing)

REAL (the world's own training store, replay on) gives **+19.4 [8.8, 29.8]** legal reaches over cold — positive but below
MIN_BENEFIT (its descriptive instrument status is NOT_INTERPRETABLE_LOW_BENEFIT: had it been a gate, C2 and the label would have
been voided). This block's +19.4 lies inside the calibration's interval [−22.7, 27.4] (+2.1). In *every reset* the picture
differs: +52.8 [41.5, 64.4], because REAL **raises non-graph resets by +33.5 [23.1, 44.1]**; REAL's total (463.9) is about the
floor's (471.3; floor − REAL NON_INFERIOR on every reset, −7.4 [−18.8, 4.0]) while its **legal** reaches are 43 below the
floor's. The floor exceeds REAL on legal reaches in every goal group.

## Non-graph resets, separately (declared descriptive diagnostic; no threshold)

Paired change vs COLD, per session [95 %]: COLD_FLOOR **−2.3 [−10.6, 6.0]**, ENTRY_NR −3.0 [−11.2, 5.1], REAL **+33.5
[23.1, 44.1]**, REAL_FLOOR +33.3 [23.1, 43.8]. By goal group the floor's change is not distinguishable from zero in any group
(goal 8 +0.4 [−16.1, 18.1]; goal 12 +5.2 [−10.0, 20.2]; goal 16 −11.0 [−27.3, 4.8]; goal 19 −3.9 [−21.3, 13.6]). The share of
non-graph resets falls under the floor (27 % → 23 %) because legal reaches rose; the floor neither displaces nor creates them
to a detectable degree.

## Final-hop failure diagnostic — degenerate by construction

HEAD takes no environment draw for a goal-entering move: draws into the goal = 0 in all 1,400 test sessions, failed final-hop
attempts = 0 in every arm, successful traversals = legal reaches. It is **uninformative about retry-farming on this
substrate**. Entry edge mix: all four goal edges are used (4.00 distinct per session; COLD 3.99); share through the least
reliable goal edge 0.266 (COLD 0.259).

## Shortcut penalties (declared descriptive; association only)

Mean summed end-state penalty on the goal's edges: COLD 3.41, COLD_FLOOR **5.02** (+1.61 [1.28, 1.95]), ENTRY_NR 4.89, REAL
4.46 (+1.05 [0.66, 1.44]), REAL_FLOOR 5.57. The 1-hop block leaves ≈ 1.5× more penalty on goal edges when entries are common;
the benefit is intact. Whether penalties dampen the effect is **not identified** by this design.

## The uncertainty carried by the 40-world calibration

| quantity | calibration (40 worlds, floor OFF) | this block (280 worlds) |
|---|---|---|
| ENTRY_NR legal benefit | +60.5 [34.2, 87.2] | +61.5 [53.5, 69.7] — inside, as the calibration interval's width implied |
| REAL legal benefit | +2.1 [−22.7, 27.4] | +19.4 [8.8, 29.8] — inside |
| largest legal paired SD | 87.3 | REAL−COLD 90.0, ENTRY−REAL 75.0, ENTRY−COLD 70.0, **COLD_FLOOR−COLD 68.9**, ENTRY_NR−COLD_FLOOR **16.0** |

The point estimate of the SD was a little low for the *descriptive* REAL−COLD pair (90.0; n needed at DELTA 15 would be 283 for
it, against 280), and ample for the pairs that carry the gating claims (68.9 → 165 worlds; 16.0 → 9). The margins sat below the
calibration's lower bound as designed, and MIN_BENEFIT 30 was cleared by a lower bound of 54.6.

## Post-hoc, exploratory (not confirmatory; `exploratory_blockH.mjs`; no claim uses it)

* **The floor changed nothing observable in 45 of 280 worlds** (16 %): every endpoint of COLD_FLOOR equals COLD's (legal
  difference exactly 0, the floor raised a score in all 45): goal 16 — 24 of 70 worlds, goal 19 — 13, goal 12 — 6, goal 8 — 2.
  There the goal-entering candidate already won at every goal-adjacent decision, so raising its score changed no decision. This
  is where FutureScore V2.3 already supplies the pull; it fits goal 16's smaller benefit.
* The legal share of the floor's every-reset gain is 1.04; the per-world correlation of the legal gain with the change in
  non-graph resets is −0.35 and with the change in goal-edge penalty +0.35 (confounded: more entries bring both).
* **The real store on top of the floor moves resets from legal to non-graph:** REAL_FLOOR − COLD_FLOOR = legal **−8.0
  [−15.3, −0.7]**, non-graph **+35.6 [24.8, 46.2]**, every reset +27.7 [16.8, 38.6] (the same pattern as on B2).

## Across runtimes (descriptive; different worlds, runtimes and definitions — not a paired comparison)

| | conformed (GATE-FLOOR-1) | pristine B2 (GATE-FLOOR-B2) | **HEAD (this study)** |
|---|---|---|---|
| COLD legal reaches | 76.9 | 142.1 | **298.4** |
| floor benefit | +152.7 | +190.2 | **+62.6** |
| REAL benefit | +104.8 | +85.4 | **+19.4** |
| floor − REAL (legal) | exceeds by 47.8 | by 104.8 | **by 43.2** |
| ENTRY_NR − floor | −7.0 | +0.3 | **−1.1** |

The structure replicates in all three (the floor ≈ the goal-entry store, above the real store, no harm); the **size** of the
effect shrinks as the runtime's own goal gradient grows (a dead FutureScore channel → a live one).

## Narrowest defensible conclusion

On the audited HEAD `0df804c`, in a 1,500-call Phase I session of the M7 hidden-reliability harness, over 280 fresh worlds,
for floor value 1 only, **with FutureScore V2.3 live**:

1. A guarded, default-off floor that gives a legal graph edge into the active goal the saturated goal-entry score, with **no
   stored episode**, raised legal goal reaches by **+62.6** over cold (+21 % of COLD's 298), was indistinguishable from
   the goal-entry-only episode store (within ±15 by a wide margin), harmed no goal group, left per-attempt success unchanged, and
   passed the no-shortcut audit in all 560 floor sessions; the every-reset accounting agrees.
2. It is a **smaller** effect than on the conformed (+153) and pristine B2 (+190) runtimes, and it changed nothing observable
   in 16 % of worlds: the live FutureScore channel supplies much of the goal pull the floor used to supply.
3. This supports the goal-entry floor **only within this tested configuration**.

**Not claimed:** general routing capability, learning, understanding, human-like episodic recall, planning, reliability
learning, general cognition, manufacturing competence, production safety, or any property of the shipped behaviour (in
production no traversal fails and FutureScore is a pure distance potential — not what was measured). No production code was
changed.

## Corrections, deviations and disclosures

* The floor-OFF HEAD calibration (neutrality and the margins/n inputs) ran on a scratch copy outside the repository, with
  an observational probe only and no floor session, before the independent review; it is recorded in
  `results/calibration_summary.json`.
* The first run of the HEAD gate failed one check (a decision-level "first divergence is a goal entry" test carried over from
  B2): a raised goal score that is not chosen can legitimately change downstream learning/exploration, so the scope test was
  re-specified at the **candidate-score** level (the first changed candidate is the goal-entering one, raised; all earlier
  candidates identical) before the freeze; no study outcome was involved.
* The review file contained only the HEAD review this time; its verdict LIMITED CORRECTION was adopted in its entirety.
* The post-hoc script was extended after the outcomes (realized SDs, identical-trajectory worlds) and is labelled post-hoc.
* The orchestrator records failures, not per-session retries; none failed after a retry.

## Verification

`verify_gatefloorhead.mjs`: **99 checks, 0 failed; 10/10 mutants caught**, including section E, which recomputes every
benefit (legal and every-reset), class, gating claim, the replication label and REAL's non-gating from the committed per-world
summary. At the freeze (before outcomes): 89 checks; `verify_gatefloor1` (110/0, 20 mutants), `verify_gatefloorb2` (84/0, 10
mutants), registry gates (17/0, 67/0), `verify_xfer1` (86/0, 15 mutants), `verify_xfer2` (99/0, 18 mutants) pass.
