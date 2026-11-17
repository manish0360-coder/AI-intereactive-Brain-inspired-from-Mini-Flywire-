# M11 — results: the adopted belief under controlled route changes on the MiniFlyWire graph

**Reading (by the frozen rule): DEMONSTRATED ON THE MINIFLYWIRE GRAPH.** D1, D2 and D3 all pass. The effects point the
same way as CF-06 on generated worlds but are much smaller. Reopened routes are rarely re-used by either agent, and
most of the recovery difference arises in labels where neither agent re-used one (§4).

**Evidence category:** a development-level demonstration. It is one run, by the designer, on local commits that have
not been pushed. It is not confirmatory and decides nothing about AD-13 or the agent ([SPEC.md](SPEC.md),
"Consequence").

## 1. The run

| Item | Value |
|---|---|
| Specification | [SPEC.md](SPEC.md), frozen in `a3cccd5` on the owner's word "Freeze and run"; SHA-256 `7338aa24274dce86…f2f2b` |
| Launch and end | 2026-11-17 17:08:00Z to 18:13:05Z (3,901 s in the driver), at HEAD `a3cccd5` both times, with 0 changed paths at launch |
| Command | `node experiments/m11_routes/run_demo.mjs --domain m11`, detached, with a per-process wake request ([run/](results/run/)) |
| Exit | 0; stderr empty |
| Environment | Node v24.15.0, win32-x64; peak RSS 273,044 KB |
| Result | [results/m11_result.json](results/m11_result.json), 4,200,974 bytes, SHA-256 `3d86d073551916d781e9784150cd7668d99e55eda65f59af2a66ceac6b4d1c05` |
| App files | `main.js` `c92c5c6b…` (the audited file, untouched), `index.html` `be3ba6ce…`, `connections.json` `550bddd8…`, `neurons.json` `b9847140…` |
| Scale | 135 labels × 3 families × 2 agents = 810 E5 runs, run twice (A traced, B untraced) |
| Exclusions | 0 labels; 0 skipped events; 0 capped episodes |
| Determinism | Run A and run B rows identical (one SHA-256 for both); the stored rows hash to it |
| Standby | None. The System log shows no sleep, resume or standby marker in the window ([run/m11_power_events.txt](results/run/m11_power_events.txt)). It does show a +3.3 s clock correction by time sync at 17:59:42Z, which affects only the wall-clock note and not the rows, and a power-source change at 18:12:37Z |

**Independent check:** [check/verify_m11.mjs](results/check/verify_m11.mjs) was written before the result was seen. It
recomputes provenance, counts, all 21 contrasts with their bootstrap intervals, the reading, and a "no blocked step
moved" check on all 18 traces, using its own code. Only `pairedBootstrap` is shared, so that the interval seeds match.
**All checks pass** ([check/verify_m11.out](results/check/verify_m11.out)). After the result, `npm test` is still
184/184.

## 2. The reading

| Check | Statistic | Result | Passes when | |
|---|---|---|---|---|
| **D1 recovery** | OFTEN `afterReversed`, MBVI3 − BELIEF | **+11.07 [7.16, 15.33]** | mean > 0 and lower bound > 0 | pass |
| **D2 cost** | RARE `cost`, BELIEF − MBVI3 | **+2.87 [0.69, 4.94]** | upper bound < 25 | pass |
| **D3 mechanism** | OFTEN `crossings`, BELIEF − MBVI3 | **+0.64 [0.19, 1.14]** | mean > 0 and lower bound > 0 | pass |

Each row is the mean per label with a 95% paired percentile bootstrap interval (10,000 resamples), n = 135.

## 3. All contrasts

Steps are summed over the change phase of one run. A positive value favours BELIEF in every row except `cost` and
`futileRetests`, where a positive value is BELIEF's extra cost. The last column counts labels with a positive, negative
or zero difference.

| Family | Contrast | Mean [95% interval] | Median | + / − / 0 |
|---|---|---|---|---|
| RARE | total (MBVI3 − BELIEF) | −2.87 [−4.94, −0.53] | −4 | 18 / 109 / 8 |
| RARE | cost (BELIEF − MBVI3) | +2.87 [0.69, 4.94] | 4 | 109 / 18 / 8 |
| RARE | blocked | −2.56 [−3.89, −1.21] | −2 | 21 / 94 / 20 |
| RARE | afterReversed | +0.18 [−0.10, 0.52] | 0 | 11 / 13 / 111 |
| RARE | afterPermanent | −0.49 [−1.93, 1.07] | −1 | 28 / 77 / 30 |
| RARE | crossings (BELIEF − MBVI3) | +0.16 [0.02, 0.34] | 0 | 6 / 1 / 128 |
| RARE | futileRetests (BELIEF − MBVI3) | +3.29 [2.64, 3.94] | 3 | 119 / 5 / 11 |
| HALF | total | +11.15 [6.01, 16.82] | 0 | 44 / 66 / 25 |
| HALF | cost | −11.15 [−16.98, −6.05] | 0 | 66 / 44 / 25 |
| HALF | blocked | +3.76 [0.48, 7.44] | 0 | 41 / 65 / 29 |
| HALF | afterReversed | +4.88 [2.79, 7.27] | 0 | 42 / 31 / 62 |
| HALF | afterPermanent | +2.51 [0.98, 4.19] | 0 | 37 / 36 / 62 |
| HALF | crossings | +0.80 [0.44, 1.20] | 0 | 22 / 3 / 110 |
| HALF | futileRetests | +1.73 [0.33, 2.80] | 1 | 87 / 5 / 43 |
| OFTEN | total | +19.45 [12.53, 27.33] | 0 | 51 / 36 / 48 |
| OFTEN | cost | −19.45 [−27.41, −12.44] | 0 | 36 / 51 / 48 |
| OFTEN | blocked | +7.59 [3.87, 11.67] | 0 | 48 / 38 / 49 |
| OFTEN | afterReversed | +11.07 [7.16, 15.33] | 0 | 58 / 15 / 62 |
| OFTEN | afterPermanent | +0.79 [0.27, 1.39] | 0 | 15 / 7 / 113 |
| OFTEN | crossings | +0.64 [0.19, 1.14] | 0 | 23 / 4 / 108 |
| OFTEN | futileRetests | −0.21 [−1.57, 0.60] | 0 | 23 / 2 / 110 |

In HALF, more labels favour MBVI3 than BELIEF on `total` (66 to 44) and on `blocked` (65 to 41), yet the mean favours
BELIEF. In OFTEN, more labels favour BELIEF (51 to 36 on `total`). In both families the medians are 0, and the mean is
carried by fewer, larger differences.

**Each arm's mean per run:**

| Family | Arm | total | blocked | afterReversed | afterPermanent | crossings | futileRetests |
|---|---|---|---|---|---|---|---|
| RARE | BELIEF | 717.1 | 375.2 | 30.2 | 311.7 | 0.25 | 15.1 |
| RARE | MBVI3 | 714.3 | 372.7 | 30.4 | 311.2 | 0.10 | 11.8 |
| HALF | BELIEF | 658.1 | 343.0 | 157.7 | 157.5 | 0.98 | 8.5 |
| HALF | MBVI3 | 669.3 | 346.7 | 162.6 | 160.0 | 0.18 | 6.7 |
| OFTEN | BELIEF | 590.1 | 305.2 | 256.3 | 28.5 | 0.99 | 1.6 |
| OFTEN | MBVI3 | 609.5 | 312.8 | 267.4 | 29.3 | 0.35 | 1.8 |

As a share of MBVI3's steps, the differences are:
- OFTEN, total: 3.2%;
- OFTEN, after a reopening: 4.1%;
- HALF, total: 1.7%;
- RARE, BELIEF's extra cost: 0.4%.

**BELIEF's archives per run** (an archive is the belief's record that an exit changed):

| Family | Opened on a genuine change | of which reversing / permanent | Opened falsely | Reversal confirmed genuine / false |
|---|---|---|---|---|
| RARE | 4.19 | 0.26 / 3.93 | 0.66 | 0.09 / 0.30 |
| HALF | 3.33 | 1.37 / 1.96 | 0.57 | 0.41 / 0.30 |
| OFTEN | 2.08 | 1.77 / 0.31 | 0.56 | 0.63 / 0.26 |

Each run has six blocks. In OFTEN, the belief opened an archive on about two of them, and confirmed a genuine
reopening about 0.6 times a run.

**Against CF-06 on generated worlds** (the directions the spec expected):

| Effect | CF-06 | M11 |
|---|---|---|
| Recovery after a reopening (OFTEN) | +43.5 a run | +11.1 |
| Cost in RARE | +17.4 | +2.9 |
| Crossings of reopened edges (OFTEN) | +4.9 a run | +0.64 |

All three point the same way and all are smaller here.

## 4. Where the recovery difference comes from (descriptive, written after the result)

This section is not part of the reading. [check/crossing_split.mjs](results/check/crossing_split.mjs) groups the labels
by which agent crossed a reopened edge, in that edge's after-window, at least once. Output:
[check/crossing_split.out](results/check/crossing_split.out).

**Re-use of a reopened edge is rare for both agents:**

| Family | Reopenings | BELIEF crossed at least once | MBVI3 crossed at least once |
|---|---|---|---|
| RARE | 72 | 8 (11.1%) | 4 (5.6%) |
| HALF | 407 | 26 (6.4%) | 7 (1.7%) |
| OFTEN | 725 | 33 (4.6%) | 9 (1.2%) |

**The OFTEN recovery difference (`afterReversed`, MBVI3 − BELIEF, 1,494 steps summed over 135 labels), split by who
crossed:**

| Who crossed a reopened edge | Labels | Share of the summed difference |
|---|---|---|
| Neither agent | 103 | +916 (61%) |
| BELIEF only | 23 | +440 (29%) |
| MBVI3 only | 3 | +144 (10%) |
| Both | 6 | −6 |

So D3 passed as defined: BELIEF crosses reopened edges more often. But that accounts for a minority of D1's recovery
difference. Most of it arises in labels where no reopened edge was ever re-used. This run does not identify the
source. One candidate, not measured here, is how the two models treat chance failures on edges whose reliability is
below 1. On this graph, "recovers faster after a reopening" should therefore not be read as "goes back to the
reopened route sooner". That happened, but rarely.

On `total` in OFTEN, 48 of the 135 labels tie exactly (44 of them in the "neither" group). In those labels the
different belief made no difference to the step count.

## 5. The traces

The spec fixed the traces in advance: labels 0, 1 and 2, every family, both agents.

**The pre-declared illustration** ([check/verify_m11.out](results/check/verify_m11.out)): OFTEN, `mfw|m11|0`, the first
reversing event, on the edge between `trust` and `recall` (neurons 19 and 6).

**It turned out to be a tied label.** Both agents took the same actions for the whole run (574 steps each, every
window equal), and neither ever tried `trust → recall` after it reopened. What the trace does show is the two beliefs
diverging while the behaviour stays the same:

| Moment | BELIEF's predicted chance the exit works | MBVI3's |
|---|---|---|
| First blocked try, t = 723 | 0.86 | 0.86 |
| After the fourth failed try, t = 727 (BELIEF opened an archive at t = 726, ρ = 0.5) | 0.12 | 0.12 |
| At the reopening, t = 772 | 0.26, rising steadily while blocked | 0.13 |
| At the next reopening of the same edge, t = 1157 | 0.44 | 0.09 |

BELIEF's predicted chance that the blocked exit works grows with time, as its hazard says it should. MBVI3's stays
between 0.09 and 0.13. Here BELIEF's prediction never reached a level that changed what it did.

**All 18 traces, described** ([check/trace_summary.mjs](results/check/trace_summary.mjs),
[check/trace_summary.out](results/check/trace_summary.out); written after the result; every trace listed):
- BELIEF crossed a reopened edge in 3 of the 9 label-and-family pairs (label 0 HALF once, label 1 RARE 5 times,
  label 2 OFTEN 7 times). MBVI3 crossed none.
- In 2 pairs (labels 0 and 1, OFTEN) the agents took identical actions for the whole run.
- At the 13 reopenings both agents' traces followed, BELIEF's predicted chance was higher at 9 and lower at 4. Its
  highest value was 0.44; MBVI3's highest was 0.22.
- On `total`, BELIEF used fewer steps in 2 pairs, MBVI3 in 5, and 2 tied. In label 2 HALF, BELIEF tried blocked edges
  45 times to MBVI3's 23 and took 922 steps to 879.

The traced labels therefore show BELIEF's mechanism (a rising belief, more re-tests, occasional re-use) and its cost
(more failed re-tests). They do not show the average advantage, which is small and comes from a minority of labels.

## 6. Disclosures

- **Looks before the freeze,** as listed in the spec:
  - a schedule check on labels `mfw|feasibility|*` that ran no agent;
  - the regression tests on `mfw|m11test|0`, each arm compared only with itself;
  - one dev smoke run on `mfw|m11dev|0`, checked for structure only.
- **Written after the result and not part of the reading:**
  - §4 and the trace descriptions in §5;
  - the CF-06 comparison;
  - the percentages.

  The pre-declared illustration is reported as it came out.
- **Nothing was tuned or rerun.** The `mfw|m11|*` labels are now spent.
- **BELIEF's false alarms:** it opens about 0.6 false archives a run and confirms about 0.3 false reversals a run, in
  every family.

## 7. Limitations

1. **One topology:** the 135 labels vary start, goal, schedule and edge reliability on one 20-node graph.
2. **Not the app's dynamics:** in the app every move succeeds and no exit changes. Here blocks are imposed and edges
   work only with probability 0.5–1.
3. **Small effects:** the effects are small in absolute terms, and the medians are 0 in HALF and OFTEN.
4. **The recovery difference is mostly unexplained** (§4). The crossing check D3 passed, but it does not carry D1.
5. **One run by the designer,** on local commits, with no independent replication and no external review (the owner
   asked for none).

## 8. Consequence

None for AD-13 or the agent. The result is recorded. Any next step, such as a viewer for the traces, a look at the
unexplained part of the recovery difference, or integration into the app, is a separate decision.

## Files

| File | Role |
|---|---|
| `results/m11_result.json` | Rows, analysis, reading, the 18 traces, provenance |
| `results/SHA256SUMS` | Hashes of every file under `results/` |
| `results/run/m11_run.log`, `.stdout`, `.stderr` | The run's own log and output |
| `results/run/run_m11_awake.ps1`, `hold_awake_until.ps1` | The launch wrapper and the display hold |
| `results/run/m11_power_events.txt` | System log extract for the run window |
| `results/check/verify_m11.mjs`, `.out` | Independent check, written before the result |
| `results/check/trace_summary.mjs`, `.out` | Descriptive trace summary, written after |
| `results/check/crossing_split.mjs`, `.out` | Descriptive recovery split, written after |
