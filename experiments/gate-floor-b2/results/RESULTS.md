# GATE-FLOOR-B2 results (DEVELOPMENT / EXPLORATORY)

Substrate: the **pristine B2** blob set (`707cb1e`, `main.js` sha `537f37a2…`; no H1-R conformance edit, no H1-R runtime) plus
two guarded lines (derived `main.js` sha `ff8c0555…`). Task: one world, a 1,500-call Phase I session after a 1,500-call cold
training session in the same world. **Primary outcome: legal goal reaches** (goal resets whose move was a graph edge);
declared sensitivity: every goal reset. Design frozen and pushed before any block outcome existed: commit `a263fd5`
(remote head verified); decision digest `fefd942a099fde6f20d4204d684cde1cd545b8734e41f35b65ace851fa4528fc` (what the
independent review saw), design digest `fe943e8fee689c2878c8a8601bb8ed1a9dc31d74d80ba6f26066d34d6b5da32e`. Raw output:
`summary_blockG.json` (the frozen `analyze.mjs`, unchanged), `manifest_blockG.json`; post-hoc: `exploratory_edgemix_blockG.json`.
Raw sessions stay in the git-ignored `data/`.

## Execution

| block | worlds | accepted seeds | sessions | integrity | excluded |
|---|---|---|---|---|---|
| G (the only block) | 392–551 (160; 40 per goal 8/12/16/19) | 220,524 – 228,880 | 160 training + 800 test | passed | 0 |

Manifest digest `75c10eae1db1cba9a408bce835877661d701d3c969a399d7c02f5f6565dfd70f`; 13 min 44 s wall time; no session
failed after its retry; no deviation from the frozen protocol. Agent seeds `1,100,100,784 … 1,100,101,103`.

## Confirmatory outcomes (frozen rules; both instruments OK)

Per 1,500-call test session, mean over 160 worlds; benefit = paired difference over COLD [95 % bootstrap interval]:

| arm | legal reaches | every reset | non-graph resets | attempt success | benefit, legal (primary) | benefit, every reset (sensitivity) |
|---|---|---|---|---|---|---|
| COLD | 142.1 | 255.2 | 113.1 (44 %) | 0.675 | — | — |
| **COLD_FLOOR** | **332.3** | 434.0 | 101.7 (23 %) | 0.663 | **+190.2 [176.3, 204.2]** (higher in 156/160) | +178.8 [160.5, 197.3] |
| REAL | 227.5 | 363.5 | 136.0 (37 %) | 0.679 | +85.4 [70.0, 100.7] | +108.3 [89.2, 128.0] |
| ENTRY_NR | 332.5 | 434.0 | 101.5 (23 %) | 0.664 | +190.4 [176.6, 204.4] | +178.9 [160.6, 197.5] |
| REAL_FLOOR (descriptive) | 316.1 | 447.5 | 131.3 (29 %) | 0.686 | +174.0 [159.7, 188.0] | +192.3 [173.1, 211.9] |

| claim | rule (declared) | observed | |
|---|---|---|---|
| I1 | lower bound of benefit(REAL) ≥ 50 | 70.0 | OK |
| I2 | lower bound of benefit(ENTRY_NR) ≥ 50 | 176.6 | OK |
| **C1** capability | lower bound of benefit(COLD_FLOOR) ≥ 50 | **176.3** | **holds** |
| **C2** vs persistence | shortfall(REAL − COLD_FLOOR) NON_INFERIOR / EXCEEDS | −104.8 [−117.5, −91.8] **EXCEEDS** | **holds** |
| **C3** vs ceiling | shortfall(ENTRY_NR − COLD_FLOOR) NON_INFERIOR / EXCEEDS | +0.3 [−2.1, 2.8] **NON_INFERIOR** | **holds** |
| **C4** no harm | no goal group wholly < 0; attempt-success lower bound ≥ −0.05 | all four groups > 0; −0.012 [−0.027, 0.004] | **holds** |
| **C5** audit | clean in every floor session | 320 / 320 clean | **holds** |

**Replication label: REPLICATED** (C1–C5 hold with both instruments OK). Predictions B1–B5 all held.

* **Goal groups** (legal-reach benefit of COLD_FLOOR; n = 40 each): goal 8 **+218.8** [193.7, 245.6] (COLD 125.1); goal 12
  **+225.8** [199.7, 251.1] (COLD 175.2); goal 16 **+149.8** [124.5, 174.8] (COLD 142.3); goal 19 **+166.2** [138.9, 192.9]
  (COLD 125.8). No group harmed; the smallest benefit is again goal 16.
* **Sensitivity (every goal reset):** C1 lower bound 160.5; C2 EXCEEDS (−70.5); C3 NON_INFERIOR (+0.1): **all classes agree**
  with the primary. **Multiplicity (declared Bonferroni-3, level 0.9833):** C1 lower 173.1; C2 EXCEEDS [−120.4, −89.1];
  C3 NON_INFERIOR [−2.6, 3.5]; no claim fragile.
* **The floor acted** in every floor session: 491 raised evaluations per session, of 2,471 evaluated, of which 523 per
  session were non-graph goal candidates that the floor evaluated and left unchanged (by construction).
* Per-attempt success is flat (−0.012 [−0.027, 0.004]) and, on this substrate, cannot reflect retrying (below).

## Declared descriptive diagnostics (frozen analysis; no threshold; no claim depends on them)

* **Non-graph goal resets (B2 has no N1) — the reviewer's UNKNOWN #1.** Paired change versus COLD, per session
  [95 % interval]: COLD_FLOOR **−11.4 [−26.2, 3.6]**, ENTRY_NR −11.6 [−26.6, 3.6], REAL **+22.9 [6.6, 39.5]**, REAL_FLOOR
  +18.3 [2.1, 34.1]. By goal group the floor's change is not distinguishable from zero in any group (goal 8 −18.5
  [−47.5, 11.3]; goal 12 −24.1 [−51.7, 2.1]; goal 16 −11.9 [−38.1, 13.3]; goal 19 +8.9 [−26.4, 43.7]). The share of non-graph
  resets falls under the floor (44 % → 23 %) because **legal reaches rose**, not because non-graph resets were displaced:
  the legal gain (+190) is not a substitution for them. The real store *raises* them.
* **Final-hop failure diagnostic — degenerate by construction.** B2 takes no environment draw for a goal-entering move:
  draws into the goal = 0 in all 800 test sessions, failed final-hop attempts = 0 in every arm, successful traversals =
  legal reaches. It is **uninformative about retry-farming on this substrate**; the GATE-FLOOR-1 retry finding (failures per
  success higher under the floor, an edge-mix effect) is neither confirmed nor refuted here.
* **Entry edge mix:** the floor uses all four goal edges (4.00 distinct per session; COLD 3.63); share of entries through the
  world's least reliable goal edge 0.299 (COLD 0.304) — no shift (reliability is not drawn on a goal entry in B2).
* **Goal-edge shortcut-penalty memory (end of session; the reviewer's UNKNOWN #2):** mean summed penalty on the goal's edges:
  COLD 1.55, COLD_FLOOR **4.68** (+3.13 [2.70, 3.58]), ENTRY_NR 4.61, REAL 2.75 (+1.20 [0.85, 1.56]), REAL_FLOOR 4.86. The
  1-hop block does leave about three times more penalty on goal edges when the floor (or the goal-entry store) makes 1-hop
  entries common. The benefit is large in spite of it. **Whether the penalty dampens the effect is not identified by this
  design**; the post-hoc association (below) shows no sign of dampening but cannot establish it.

## Post-hoc, exploratory (not confirmatory; `exploratory_blockG.mjs`, basis `summary_blockG.json`; no claim uses it)

* The legal share of the floor's every-reset gain is 1.06 (legal +190.2 vs every reset +178.8): the floor's gain is entirely
  legal. Per-world correlation of the legal gain with the change in non-graph resets: −0.20; with the change in goal-edge
  penalty: **+0.31** (more entries bring both more gain and more penalty; this is confounded and says nothing about a
  causal damping effect).
* **The real store's own experience moves resets from legal to non-graph:** REAL_FLOOR − COLD_FLOOR = legal **−16.1
  [−27.3, −5.3]**, non-graph **+29.6 [16.3, 43.0]**, every reset +13.5 [−0.8, 27.9]. B2's own exported stores carry about a
  third non-graph transitions (calibration: 32.5 %).
* ENTRY_NR − COLD_FLOOR: legal +0.3 [−2.1, 2.8], non-graph −0.2 [−3.0, 2.3], every reset +0.1 [−2.8, 3.4]: the floor and the
  goal-entry store are indistinguishable on this substrate in every accounting.
* By training-store size: 159 of 160 worlds have ≥ 1 episode (floor +189.9 [176.1, 203.9], REAL +85.9, REAL − floor
  −104.0 [−116.9, −91.1]); one world had an empty store (REAL ≡ COLD there).

## Does the conformed-runtime effect replicate?

**Yes, on every declared claim, on a different runtime and a fresh sample.** Floor benefit +190.2 legal reaches (conformed,
GATE-FLOOR-1: +152.7); exceeds the real store (−104.8 vs −47.8); non-inferior to the goal-entry-only store (+0.3 vs −7.0);
no goal group harmed; attempt success flat. The magnitudes are not directly comparable (different worlds, different runtime,
different reach definition, a goal entry that is always reliable here). The structure is the same: the benefit is carried by
the goal-entry term, not by stored experience.

## Narrowest defensible conclusion

On the pristine B2 runtime, in a 1,500-call Phase I session, over 160 fresh worlds, for floor value 1 only:

1. A guarded, default-off floor that gives a legal graph edge into the active goal the saturated goal-entry score, **with
   no stored episode**, raised legal goal reaches by +190 over cold, exceeded restoring the real episode store by ≈ 105, and
   was indistinguishable from the goal-entry-only episode store; no goal group was harmed; per-attempt success did not
   change; the audit was clean in all 320 floor sessions; every-reset accounting agrees.
2. The gain is **not** a displacement of B2's own non-graph resets (their paired change is not distinguishable from zero) and
   the floor never raised a non-graph candidate by construction.
3. Together with GATE-FLOOR-1 and XFER-2, the episode benefit measured in XFER-1 is, on both the conformed and the pristine
   B2 runtime, reproducible by the goal-entry scoring term alone.

**Not claimed:** learning, understanding, human-like episodic recall, planning, reliability learning, **routing
capability** (B2 cannot even test it: no goal-entry draw), general cognition, manufacturing competence, production safety, or
any property of the current repository `main.js` (B2 ≠ HEAD is UNKNOWN). No production code was changed.

## Corrections, deviations and disclosures

* Two descriptive additions were made between the review and the freeze (non-graph resets per goal group; the end-of-session
  goal-edge penalty memory), both observational and after the run; the decision digest is unchanged (`DESIGN_REVIEW.md`).
* The file that carried the review text also contained the earlier GATE-FLOOR-1 review above the B2 section; only the B2
  section was relied on.
* The orchestrator records failures, not per-session retries; none failed after a retry.
* `exploratory_blockG.mjs` and its output were written after the outcomes and are labelled post-hoc.

## Verification

`verify_gatefloorb2.mjs`: **84 checks, 0 failed; 10/10 mutants caught** (transform, probe placement, floor leakage, analysis
rules), including section E, which recomputes every benefit (legal and every-reset), class, claim and the replication label
from the committed per-world summary. `verify_gatefloor1` (110/0, 20 mutants), registry gates (17/0, 67/0), `verify_xfer1`
(86/0, 15 mutants) and `verify_xfer2` (99/0, 18 mutants) pass.
