# CF-06 — adversarial review of the results record, and response

**Date:** 2026-11-17, after the single `gate6` run. **Reviewer:** an agent that wrote none of the design, the code or
the record, working read-only. It made 48 tool calls and ran `npm test` (173/173). It never ran the driver or any
`gate6` world; it re-ran development worlds `cf|dev|world|0…19` for one edge case. **Verdict on the record: SOUND
WITH CORRECTIONS. No finding changes the gate verdict.** The corrections are made by the dated amendment in
[RESULTS.md](RESULTS.md). The original text, the result file and the verdict are unchanged.

## What the reviewer checked and found correct

- **Hashes and provenance.**
  - The specification's SHA-256 `04acec0a…adac8` is the same in four places: the file, `GATE_SPEC.sha256`, the
    result's `specSha256`, and the blob at `7ce1dc6`.
  - The result file's hash `91987509…72ac` matches both the working tree and the committed blob.
  - `rowsSha256` recomputes to `cddb668b…7c2e`.
  - The recorded head is `7ce1dc6` at launch and at the end.
  - `git diff 7ce1dc6..HEAD` touches no code and no specification.
- **Coverage.** 135 worlds; each of the 36 family × arm cells has 135 rows; 0 excluded. The battery has 12 cells ×
  135 rows, none censored.
- **Domain disjointness.**
  - The label `cf|gate6` appears only in the CF-06 drafts, the review bundles (development worlds only), the freeze
    and the results.
  - Every earlier gate used other domain strings, and a world is generated from its label alone.
  - No `Math.random`, `Date` or `process` is read on the cognitive code paths.
- **Verdict logic.** The reviewer recomputed every boolean and label independently, and each matches the frozen
  specification's wording: right arms, signs, windows, strict inequalities, and "an empty contrast never passes". This
  covers B1–B6, gainShape (k = 14), gainSource and gainSourceMix, L1–L4, taskCanTestLearning (≥ 2 × MDE80, with
  MDE80 = 2.8·SD/√n), hRobustness and the 66-point weighting grid. **CF-06 SUPPORTED — CONSISTENT is the label the
  decision table gives.**
- **Numbers.** About 350 numbers checked against the rows. All match except the rounding and listing errors in
  finding 8.
- **Bootstrap.**
  - Paired per-world differences, with the families summed within each world before resampling; 10,000 seeded
    percentile resamples.
  - The driver's intervals are reproduced exactly.
  - Under 400 reseeded runs every verdict decision is far from its threshold: B1's planner-part lower bound stays
    within 53.9–55.8 and B2's upper bound within 21.7–22.1.
- **Leakage: none.**
  - Ordinary arms receive only their random stream and their declared parameters.
  - Ground truth reaches only BELIEF_REALONLY and BELIEF_FALSEONLY, through `archiveIf`.
  - VOL_RHO_TRUE gets its family's declared ρ, and only ORACLE gets the oracle.
  - There is no module-level mutable state, and every run builds a fresh environment and a fresh agent.
- **Attribution.**
  - `splitExact` recomputes true.
  - Total = genuine + false + residual holds exactly per world, and in the mean of every family and the mix.
  - The live classifier and the trace classifier use the same keys and the same step alignment.
  - Over the last five training episodes, BELIEF and the planner are identical in 134 of 135 worlds; the remaining
    world differs by 1 step. So the gain does not predate the change phase.
- **Run history.**
  - The driver writes only after both runs, and attempt 2 would have refused if a result file had existed.
  - The attempt-2 wrapper is a plain `node … --domain gate6` call with redirected output and changes no computation.
  - No outcome of attempt 1 could have been seen.

## Findings and response

Before accepting any finding, the record's author checked it against the rows with separate scripts.

| # | Finding | Checked | Response |
|---|---|---|---|
| 1 | **Unit error in the headline.** "84.7 steps a run" is per world, summed over its three runs (one per family); it is about 28 a run. The same paragraph then sets it beside a single-run cost (17.4 in RARE) | Confirmed: MBVI3's family means 1,338.6 + 1,171.5 + 1,019.3 = 3,529.4; 84.7 / 3 = 28.2. The 2.4% is right | Amended |
| 2 | **Concentration.** "Not carried by a few worlds" and "less concentrated than on development" contradict the data on the share measure, and "avoiding long failures" is unsupported | Confirmed. The top 14 worlds carry 7,008 of 11,432 world-steps (0.61), against 0.51 on development. The planner has 0 capped episodes, and its largest 10-episode window is 272 steps. Only 4 of the 4,808 event windows differ by ≥ 100 steps (456 world-steps in total). World 68: false-alarm arm +996, genuine arm −43; world 51: +549 and +94 | Amended. By the other measures (worlds against, median, worlds needed to erase the mean) the gate is less concentrated than development; both are now stated |
| 3 | **h.** "Both hold at h = 0.01 only" is wrong: each of B2 and the CONSISTENT shape holds at two of the three values, and only both together are limited to h = 0.01. The same error is in PROJECT_STATE and the commit message of `22ea769` | Confirmed. B2 at h = 0.03: +15.2 [9.7, 20.5], holds. The shape at h = 0.003 is CONSISTENT in every part (planner 69 / 65, median +1, rest +15.2; B3 77 / 33, median +6, rest +22.1). B2 at h = 0.003 fails only marginally: its upper bound is ≥ 25 in 89% of 200 reseeded bootstraps (range 24.8–25.3) | Amended; PROJECT_STATE corrected. The commit message is not rewritten |
| 4 | **Scope.** "Beats every fixed willingness to re-test" and "beats every fixed policy" overclaim. Frozen limitation 10 (four rules; "re-test k times then give up" not among them; BELIEF with ρ and h fixed is itself a fixed schedule) is never carried into the record, and limitations 6 and 7 are missing from the check table | Confirmed. BELIEF is the cheapest non-privileged arm only in HALF. In OFTEN, RECALL 0.003 − BELIEF is −2.5 [−10.5, 4.9] and VOL is cheaper; in RARE, the planner and VOL are cheaper | Amended |
| 5 | "Twice the cost the planning scenario assumed": the planning case (HALF) left B2 at its development value, +0.1. The +8.2 belongs to the pessimistic HALF_B2 scenario | Confirmed (`power_sim.mjs` lines 19–21; specification lines 187–189) | Amended |
| 6 | "The cost of permanent changes is 2.2 times the development figure" uses the genuine-changes pair (−21.8 / −9.8). Windows of permanent events give 1.6 (−22.7 / −13.8) | Confirmed | Amended |
| 7 | "Fresh-world effects are larger than development" is selective | Confirmed. B1 against RECALL 0.003 is +94.2 against +99.0 on development; the RARE cost is +17.4 against +0.1 | Amended |
| 8 | Rounding and listing errors | Confirmed. B4a is 43.548, so +43.5 not +43.6. Run B took 6,791.1 s, so 6,791 not 6,792. The fifth-worst world is tied at −63 (worlds 1 and 104). The OFTEN contrast has three intervals in the file, differing by up to 0.3, not "in the last digit" | Amended |
| 9 | Exclusions and skipped events. "None can be excluded …, as the specification states" misattributes the statement. The record never reports skipped events | Confirmed. The specification allows exclusions ("fewer than 135 may be analysed"); the "none can occur" statement is in the freeze commit message. 26 events skipped: RARE 14 (worlds 34, 45, 59, 124); HALF 6 and OFTEN 6, all in world 59. World 59 has every event skipped in every family. B1 against the planner on the other 134 worlds is +85.3 | Amended |
| 10 | "It changes nothing on the four unchanged tasks" | Confirmed: E1S EXPLORED differs in one world by +1 step, so 539 of 540 world-cells are identical | Amended |
| 11 | B4b "gives up from evidence" does not isolate evidence, because RECALL 0.01 also differs from BELIEF in ρ (in effect 1 against ½; specification line 48). BELIEF also makes more futile re-tests than the planner | Confirmed. RARE futile re-tests: 21.8 per run against 14.2. Zero-reversal worlds: +7.4 [5.1, 9.6]. The reviewer's per-event figures were not reproduced exactly. With the author's own definition the direction holds: BELIEF's re-tests of earlier permanent exits, per exit, fall from 1.85 at event 2 to 1.09 at event 6 (not monotonically), while RECALL 0.01's rise from 5.24 to 11.21 | Amended, with the author's figures |
| 12 | L1 reading. "Mostly in RARE" is wrong: RARE +6.9 ≈ OFTEN +6.4, HALF −2.0. The point estimate is below L1's MDE80. The "yes" is Monte Carlo-marginal | Confirmed. The lower bound is > 0 in 95% of 200 reseeded bootstraps (range −0.13 to 0.80); 11.3 < 16.1 | Amended |
| 13 | Provenance overstated. `filesClean` is a constant, and run B's row hash is not stored | Confirmed. `run_gate.mjs` line 455 sets `filesClean: isGate`; the clean-tree check runs at launch only, over `cognitive/` and `experiments/cf06` (line 141). Only run A's hash is written, and the identity of the two runs rests on `infra.determinism` | Amended |
| 14 | Run history rests partly on unlodged sources. The specification's line 7 ("run once and never again") is not cited | Confirmed, and the system event log adds more: four short standbys before 16:07; the "wake" at 00:42 was a 2 ms exit; attempt 2 also had two short standbys. The cause given for attempt 1 is an inference | Amended. Lodged now: `run/gate6_power_events.txt` (event-log extract) and `run/gate6_attempt2.stderr` (0 bytes) |
| 15 | Items the specification lists under "Reported" are absent from the record (most are in the JSON); the mix attribution windows and per-arm memory were never computed | Confirmed against `analysis.*` in the result file | Amended: a guide to the JSON with the main figures; uncomputed items marked "not computed" |
| 16 | Attribution edge case. While an archive for an exit is open, the same exit cannot be archived again, so the false-alarm arm can handle a later genuine block of that exit through its "false" archive | Mechanism confirmed (`cognitive/mind/v6/world_model.mjs` line 120, `!archives.has(key)`). It cannot be measured on gate6, because traces are not stored. The reviewer's development-world estimate (1 of 17 false archives, HALF) was not reproduced | Amended (caveat) |
| 17 | The H-BEL row in the hypothesis registry lacks the qualifiers: development gate, the h dependence, and the 30% false-alarm share | Confirmed | Registry corrected |

## Effect on decisions

None of the findings changes the verdict or the consequence fixed in the specification (a proposal to the owner).
Several change how the result may be cited, and they bear on that proposal:

- **Size.** The gain over the planner is about 28 steps a run (2.4%), with a median world gain of 0.6%.
- **Concentration.** The gain is CONSISTENT by the rule. But 10% of worlds carry 61% of it, which is more than on
  development by that measure.
- **h.** The full verdict line is reached only at h = 0.01. Run under the same rules, h = 0.003 would read SUPPORTED
  WITH EXCEPTIONS (B2) — CONSISTENT, and h = 0.03 would read SUPPORTED — TAIL-DRIVEN. B5 was run at h = 0.01 only.
  h was not tuned on E5. The frozen h-robustness rule covers B1 alone, and B1 is ROBUST; the full verdict line is
  not robust to h.
- **Scope.** The claim is against the four fixed policies tested, not against every fixed schedule (limitation 10).
  BELIEF is the cheapest non-privileged arm only in HALF, and VOL is cheaper on the mix.

Living documents corrected in the same commit: `docs/engineering/PROJECT_STATE.md` (the h line, and the next step)
and `docs/experiments/HYPOTHESIS_REGISTRY.md` (the H-BEL row). The commit message of `22ea769` keeps its h sentence
and its "+43.6"; this amendment governs.
