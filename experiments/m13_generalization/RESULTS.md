# M13 — results: the adopted belief on a held-out modular-ring family

**Summary statement (by the frozen rule): NET ADVANTAGE RETAINED ON THE MODULAR FAMILY, WITHIN THE SAFETY MARGIN.**

| Line | Value |
|---|---|
| Validity (G0) | **VALID** |
| Net advantage (G1, primary) | **RETAINED**, +125.4 steps a label [92.0, 160.1] |
| Safety (G2) | **SAFE**, RARE cost +9.8 [3.6, 14.9], upper bound below 25 |
| Recovery (G3, secondary) | **SHOWN**, +65.1 [50.9, 79.9] |
| Behavioural mechanism (G4, secondary) | **SHOWN**, +1.46 [1.25, 1.67] reopened edges met and re-crossed |

gainShape is **CONSISTENT** for both G1 and G3.

Under the frozen wording rules (SPEC.md, "Verdict", rules 2 and 3), the record may say three things:
- **The advantage held:** the belief kept its advantage over MBVI3 on one held-out structural family, in one
  development-level run.
- **Recovery:** it recovers reopened routes faster on this family. Recovery is SHOWN, and the OFTEN attribution is
  GENUINE REVERSALS.
- **Behaviour:** its belief changes what it does after meeting a block. The behavioural mechanism is SHOWN.

The record may not say that the belief generalizes in general.

**Evidence category:** a development-level result. It is one run, by the designer, on local commits that have not been
pushed. It is not confirmatory and decides nothing about AD-13 or the agent ([SPEC.md](SPEC.md), "Consequence").

## 1. The run

| Item | Value |
|---|---|
| Specification | [SPEC.md](SPEC.md) revision 2, frozen in `8619d71` on the owner's word "Freeze and run"; SHA-256 `d4140479e470f2d5…b6c430`. Pins `0ffbbd84…` (44 files), bank `25e02ebb…`, structure record `92bb4a69…`, all equal to [SPEC.sha256](SPEC.sha256) |
| Launch and end | 2026-11-18 06:07:14Z to 08:16:28Z, at HEAD `8619d71` both times, with 0 changed paths at launch. The driver's own clock reads 7,530 s; the rest is the pre-run checks and the test suite |
| Command | `node experiments/m13_generalization/run_m13.mjs --domain m13`, detached, with a per-process wake request ([results/run/](results/run/)) |
| Exit | 0; stderr empty |
| Pre-run checks | Every refusal check passed, and the test suite passed 195/195 before the first agent run |
| Environment | Node v24.15.0, win32-x64; peak RSS 296,484 KB |
| Result | [results/m13_result.json](results/m13_result.json), 11,841,004 bytes, SHA-256 `a0cd87d432d2dd93d4bc20d2f8274858c4ae3fdb3906fbac10f407f6e3390367` |
| App files | `main.js` `c92c5c6b…` (the audited file, untouched), `index.html` `be3ba6ce…`, `connections.json` `550bddd8…`, `neurons.json` `b9847140…` |
| Scale | Run A: 165 labels × 3 families × 4 arms = 1,980 E5 runs, with the recorder on labels 0–2. Run B: the 990 core runs again, untraced |
| Exclusions | 0 of 495 (label, family) pairs, as computed from the bank before the freeze |
| Skipped events | 1 of 2,970 (one RARE label, the same in every arm), as the bank predicted |
| Capped episodes | 0 in BELIEF and MBVI3. One each in BELIEF_REALONLY's RARE and OFTEN runs (a diagnostic arm; no criterion uses it) |
| Determinism | Run A and run B core rows are identical: one SHA-256, `86f0bd3f…a608e02d`, for both |
| Standby | None during the run. The System log ([results/run/m13_power_events.txt](results/run/m13_power_events.txt)) has one standby marker, a Kernel-Power 507 at 11:34:04 local, which is 3 minutes before the launch: the machine leaving standby on keyboard input. Inside the run window there are none, only power-source (charger) changes. The driver's progress lines are never more than 62 s apart |

**Independent check:** [results/check/verify_m13.mjs](results/check/verify_m13.mjs) was written before the result
existed. It uses its own code to recompute:
- provenance;
- the counts and uniqueness of the rows;
- determinism;
- "no blocked step moved", on all 18 traces;
- the behaviour measures against the task's own counts, in every row;
- G1–G4 with their bootstrap intervals;
- the five lines, the summary statement and gainShape;
- attribution A1–A5 with the exactness check;
- the standardized effect;
- the moderator, with its own shortest-path code.

Only `pairedBootstrap`, `planE5` and the world builder are shared, so that the interval seeds and the schedules match.
**All checks pass** ([results/check/verify_m13.out](results/check/verify_m13.out)). The check fixed its illustration
rule in advance (§8). After the result, `node scripts/test.mjs` is still 195/195.

## 2. The criteria

Each row is the per-label paired difference: mean, 95% paired percentile bootstrap interval (10,000 resamples, seeded
by `m13|stats|m13|…`), and n = 165.

| | Criterion | Statistic | Result | SD | Median | + / − / 0 | Passes when | |
|---|---|---|---|---|---|---|---|---|
| **G0** | Validity | determinism, tests, novelty, no exclusion | all four hold | | | | all four | **VALID** |
| **G1** | Net advantage (primary) | Σ families, steps(MBVI3) − steps(BELIEF) | **+125.38 [92.00, 160.09]** | 222.9 | 44 | 102 / 62 / 1 | mean > 0, lower > 0 | **RETAINED** |
| **G2** | Safety | RARE, steps(BELIEF) − steps(MBVI3) | **+9.80 [3.56, 14.90]** | 37.2 | 14 | 133 / 29 / 3 | upper < 25 | **SAFE** |
| **G3** | Recovery (secondary) | OFTEN, after-reopening steps, MBVI3 − BELIEF | **+65.08 [50.92, 79.93]** | 95.8 | 23 | 124 / 22 / 19 | mean > 0, lower > 0 | **SHOWN** |
| **G4** | Behaviour (secondary) | OFTEN, reopened edges met and re-crossed, BELIEF − MBVI3 | **+1.461 [1.255, 1.673]** | 1.364 | 1 | 128 / 4 / 33 | mean > 0, lower > 0 | **SHOWN** |

**gainShape (CF-06's rule):**

| | Labels for / against | Median | Top decile's share of the sum | Mean without the top 17 labels | Reading |
|---|---|---|---|---|---|
| G1 | 102 / 62 | +44 | 51.7% | +67.6 | **CONSISTENT** |
| G3 | 124 / 22 | +23 | 44.7% | +40.1 | **CONSISTENT** |

The advantage is not carried by a few labels. Still, the most favourable tenth of the labels supplies about half of
G1's sum.

**G2 in context:** BELIEF does pay in RARE. It uses more steps in 133 of 165 labels, and its median cost is 14 steps.
The mean cost (9.8) is 0.66% of MBVI3's RARE steps, and the whole interval is below the 25-step margin.

**G4's minimum detectable effect** at 80% power (SPEC: 2.80 · SD/√n) is 2.80 × 1.364 / √165 = **0.297**. The
observed +1.461 is about five times that.

## 3. All contrasts

Steps are summed over the change phase of one run. A positive value favours BELIEF in every row except three: `cost`
and `futileRetests` are BELIEF's extra steps or re-tests, and the return rows count BELIEF − MBVI3 events. The
intervals here use their own seeds (`m13|stats|m13|<family>|<name>`). G3's row therefore differs from §2 in the second
decimal.

| Family | Contrast | Mean [95% interval] | Median | + / − / 0 |
|---|---|---|---|---|
| RARE | total (MBVI3 − BELIEF) | −9.80 [−14.96, −3.64] | −14 | 29 / 133 / 3 |
| RARE | cost (BELIEF − MBVI3) | +9.80 [3.56, 14.90] | 14 | 133 / 29 / 3 |
| RARE | blocked | −11.03 [−14.20, −7.55] | −10 | 22 / 141 / 2 |
| RARE | afterReversed | +1.78 [0.71, 3.02] | 0 | 22 / 11 / 132 |
| RARE | afterPermanent | −0.55 [−3.12, 2.35] | −3 | 39 / 119 / 7 |
| RARE | futileRetests (BELIEF − MBVI3) | +3.10 [1.72, 4.34] | 4 | 135 / 25 / 5 |
| RARE | metAndReturned (BELIEF − MBVI3) | +0.09 [0.04, 0.15] | 0 | 14 / 1 / 150 |
| HALF | total | +52.61 [32.58, 74.38] | −1 | 76 / 84 / 5 |
| HALF | cost | −52.61 [−74.22, −32.90] | 1 | 84 / 76 / 5 |
| HALF | blocked | +9.33 [1.13, 18.64] | −5 | 53 / 105 / 7 |
| HALF | afterReversed | +32.76 [23.85, 42.80] | 6 | 107 / 25 / 33 |
| HALF | afterPermanent | +10.51 [5.41, 16.07] | −1 | 58 / 88 / 19 |
| HALF | futileRetests | +2.82 [1.66, 4.05] | 2 | 126 / 23 / 16 |
| HALF | metAndReturned | +0.84 [0.69, 0.98] | 1 | 89 / 0 / 76 |
| OFTEN | total | +82.57 [60.35, 105.90] | 17 | 96 / 57 / 12 |
| OFTEN | cost | −82.57 [−106.22, −60.67] | −17 | 57 / 96 / 12 |
| OFTEN | blocked | +15.45 [5.54, 26.24] | 0 | 72 / 79 / 14 |
| OFTEN | afterReversed | +65.08 [50.92, 80.13] | 23 | 124 / 22 / 19 |
| OFTEN | afterPermanent | +2.04 [0.28, 4.10] | 0 | 25 / 30 / 110 |
| OFTEN | futileRetests | +1.12 [0.13, 2.21] | 0 | 45 / 6 / 114 |
| OFTEN | metAndReturned | +1.46 [1.25, 1.67] | 1 | 128 / 4 / 33 |

In HALF, slightly more labels favour MBVI3 than BELIEF on `total` (84 to 76). The median is −1, yet the mean favours
BELIEF by 52.6 steps. BELIEF's HALF gain therefore comes from fewer, larger differences; G1, which sums the three
families, is CONSISTENT. In OFTEN, the after-reopening difference favours BELIEF in 124 labels and MBVI3 in 22.

**Each arm's mean per run:**

| Family | Arm | total | blocked | afterReversed | afterPermanent | futileRetests |
|---|---|---|---|---|---|---|
| RARE | BELIEF | 1,497.8 | 780.4 | 60.2 | 657.2 | 15.3 |
| RARE | MBVI3 | 1,488.0 | 769.4 | 61.9 | 656.7 | 12.2 |
| HALF | BELIEF | 1,339.8 | 707.6 | 308.6 | 323.6 | 9.0 |
| HALF | MBVI3 | 1,392.4 | 716.9 | 341.3 | 334.1 | 6.2 |
| OFTEN | BELIEF | 1,183.8 | 632.5 | 493.4 | 57.9 | 2.6 |
| OFTEN | MBVI3 | 1,266.4 | 647.9 | 558.5 | 60.0 | 1.5 |

As a share of MBVI3's steps, the differences are:

| Difference | Share of MBVI3's steps |
|---|---|
| The mix (G1) | 3.0% |
| OFTEN, total | 6.5% |
| OFTEN, after a reopening | 11.7% |
| HALF, total | 3.8% |
| RARE, BELIEF's extra cost | 0.66% |

**BELIEF's archives per run** (an archive is the belief's record that an exit changed). Each run has six blocks.
Reopenings per run: 0.52 in RARE, 3.05 in HALF, 5.43 in OFTEN.

| Family | Opened on a genuine change | of which reversing / permanent | Opened falsely | Reversal confirmed genuine / false |
|---|---|---|---|---|
| RARE | 5.08 | 0.40 / 4.68 | 1.21 | 0.16 / 1.10 |
| HALF | 4.48 | 2.11 / 2.38 | 1.23 | 1.19 / 1.05 |
| OFTEN | 3.48 | 3.11 / 0.38 | 1.02 | 1.81 / 0.84 |

BELIEF opens about one false archive a run and confirms about one false reversal a run, in every family.

## 4. From belief to behaviour: returns, measured the same way for both agents

These counts come from the environment's own step log, by [measures.mjs](measures.mjs), for every arm. They cover
reversing events, per run. "Met" means the agent tried the edge while it was blocked. "Returned" means it moved across
the edge after the reopening: in the event's own after-window, or only later.

| Family | Arm | Met | Met and returned (G4's count) | Returned in own window | Returned only later | Median steps, reopening to first return |
|---|---|---|---|---|---|---|
| RARE | BELIEF | 0.41 | 0.18 | 0.10 | 0.12 | 65 |
| RARE | MBVI3 | 0.38 | 0.09 | 0.02 | 0.11 | 228 |
| HALF | BELIEF | 2.19 | 1.25 | 0.81 | 0.78 | 73 |
| HALF | MBVI3 | 1.85 | 0.42 | 0.07 | 0.64 | 189 |
| OFTEN | BELIEF | 3.32 | 1.95 | 1.30 | 1.22 | 66 |
| OFTEN | MBVI3 | 2.31 | 0.49 | 0.09 | 0.88 | 215.5 |

In OFTEN, of the reopened edges it had met:
- **BELIEF** went back to 1.95 a run.
- **MBVI3** went back to 0.49 a run. When it did return, it was about three times slower (median 215.5 steps to 66).

Inside the event's own window, MBVI3 almost never returned (0.09 a run, against BELIEF's 1.30).

M12 could see MBVI3's returns only in 18 traces. Here they are measured in all 990 core runs.

## 5. Attribution (diagnostic arms; secondary, never in a line or the summary)

The diagnostic arms are BELIEF with exactly its parameters, archiving only genuine changes (REALONLY) or only false
alarms (FALSEONLY), by ground truth.

| Contrast | Mean [95% interval] | Median | + / − / 0 | Holds |
|---|---|---|---|---|
| A1 genuine, OFTEN, total: MBVI3 − REALONLY | +66.24 [44.55, 88.86] | 6 | 89 / 59 / 17 | yes |
| A2 genuine, OFTEN, after reopenings | +57.36 [43.84, 71.68] | 13 | 116 / 24 / 25 | yes |
| A3 false alarms, OFTEN, total: MBVI3 − FALSEONLY | +6.70 [−1.00, 15.76] | 0 | 29 / 11 / 125 | **no** |
| A4 genuine, mix | +89.28 [56.95, 123.62] | 15 | 92 / 72 / 1 | yes |
| A5 false alarms, mix | +20.05 [9.32, 34.44] | 0 | 56 / 15 / 94 | yes |

**The split is exact:** in every label and family, REALONLY opened no false archive and FALSEONLY no genuine one.

| Scope | Label |
|---|---|
| OFTEN (`gainSource`) | **GENUINE REVERSALS** |
| Mix (`gainSourceMix`) | **GENUINE REVERSALS AND FALSE-ALARM REPAIR** |

In OFTEN, the gain needs the belief about genuine changes; archiving false alarms alone gives no gain that the
interval can separate from zero. Over the mix, false-alarm archiving alone also helps, by about 20 steps a label.
It is spread over the three families: FALSEONLY's mean totals are 5.9 (RARE), 7.4 (HALF) and 6.7 (OFTEN) steps below
MBVI3's.

**Limits, as in the spec:**
- The two diagnostic effects need not add up to BELIEF's.
- The diagnostic arms intervene on what the belief archives. They do not show that returning causes the gain.

## 6. Moderator: after-window difference by the block's detour excess (descriptive, pre-declared)

For each reversing event, the event's after-window steps are compared, MBVI3 − BELIEF. Events are grouped by the block's
detour excess: how many steps longer the shortest start–goal route becomes when that edge is cut, given the
permanent cuts before it.

| Family | Excess 0: events, mean difference | Excess 1–3 | Excess 4+ |
|---|---|---|---|
| RARE | 24, +1.2 | 58, +2.8 | 3, +34.7 |
| HALF | 178, +4.6 | 271, +8.5 | 55, +41.3 |
| OFTEN | 296, +8.5 | 479, +9.4 | 121, +30.9 |

The difference rises with the detour excess in every family. Most of the rise comes in the 4+ group (RARE has only 3
such events). This is the direction the proposal expected if M12's account carries over. It is still a description,
not a test of that account.

The difference is also positive where the block forced no detour at all (excess 0). That part cannot come from
regaining a shorter route through that edge.

## 7. Beside CF-06 and M11

| Effect | CF-06 (development family) | M11 (app graph) | M13 (modular family) |
|---|---|---|---|
| Net advantage, standardized (G1 mean / SD) | 0.444 | 0.498 | **0.562** |
| Recovery after a reopening, OFTEN (steps a run) | +43.5 | +11.1 | **+65.1** |
| Cost in RARE (steps a run) | +17.4 | +2.9 | **+9.8** |

All effects point the same way as on the two earlier families. The standardized net effect is the largest of the
three.

Step counts are not on one scale across studies. M13's runs are about twice as long as M11's: OFTEN MBVI3 takes 1,266
steps a run here and 610 there. So the raw recovery and cost figures compare only roughly.

The structural record (SPEC.md) shows how the modular family differs from the development family:
- clustering 0.355 against 0.053;
- cyclomatic number 13 against 7;
- 10% of blocks costing a detour of 4+ steps, against 3%.

The study cannot say which of these matters.

## 8. Where the recovery difference comes from (descriptive, written after the result)

This section is not part of the reading. It repeats M11's §4 split on this run, so that M13 can be read beside M11 and
M12. The script is [results/check/crossing_split.mjs](results/check/crossing_split.mjs), adapted from M11's, with its
output in [results/check/crossing_split.out](results/check/crossing_split.out).

Labels are grouped by which agent crossed a reopened edge at least once.

**In the edge's own after-window (M11's definition):**

| Family | Reopenings | BELIEF crossed | MBVI3 crossed |
|---|---|---|---|
| RARE | 85 | 17 (20.0%) | 4 (4.7%) |
| HALF | 504 | 134 (26.6%) | 12 (2.4%) |
| OFTEN | 896 | 215 (24.0%) | 14 (1.6%) |

**The OFTEN recovery difference** (`afterReversed`, MBVI3 − BELIEF, 10,738 steps summed over 165 labels), split by who
crossed in the own window:

| Who crossed a reopened edge | Labels | Share of the summed difference |
|---|---|---|
| Neither agent | 36 | +150 (1.4%) |
| BELIEF only | 117 | +10,419 (97.0%) |
| MBVI3 only | 1 | −20 (−0.2%) |
| Both | 11 | +189 (1.8%) |

**This is the reverse of M11.** On the app graph, 61% of the OFTEN recovery difference came from labels where neither
agent crossed a reopened edge, and BELIEF crossed on 4.6% of reopenings.

On the modular family:
- BELIEF re-crosses on about a quarter of reopenings in its own window, against MBVI3's 1.6%.
- Almost all of the recovery difference sits in labels where BELIEF re-used a reopened route.

With M11's own definition, "recovers faster after a reopening" here largely is "goes back to the reopened route
sooner". This is observational: it groups labels by what happened and does not show that the crossing causes the
saving.

The same split by "returned at any time" is also in the output. It moves labels from "BELIEF only" to "both", because
MBVI3 does return later in many labels (on 17.7% of OFTEN reopenings, against BELIEF's 46.5%). By that grouping, labels where only BELIEF returned carry 60.8% of the difference, and
labels where both returned carry 39.4%.

## 9. The traces

The spec fixed the traces in advance: labels 0, 1 and 2, every family, BELIEF and MBVI3.

**The pre-declared illustration** ([results/check/verify_m13.out](results/check/verify_m13.out)). The rule was the
first reversing event that BELIEF met, in `m13|modular|0` OFTEN. It picked event 1, on the edge between nodes 20
and 23.

**Neither agent returned to that edge, at any time.** What the trace shows is the beliefs diverging at an edge
neither went back to:

| Moment | BELIEF's predicted chance the exit 23 → 20 works | MBVI3's |
|---|---|---|
| First blocked try, t = 790 | 0.85 | 0.85 |
| Just before the reopening | 0.30 | 0.15 |
| At the reopening, t = 855 | 0.30 | 0.15 |

Both agents took the same actions until t = 1,133, so they met the block identically. At the reopening, BELIEF held twice MBVI3's estimate,
but neither tried the exit again. In the same run:
- BELIEF met three reopened edges and returned to one, 654 steps after its reopening;
- MBVI3 met two and returned to none.

**All 18 traces, described** ([results/check/trace_summary.mjs](results/check/trace_summary.mjs),
[results/check/trace_summary.out](results/check/trace_summary.out); written after the result; every trace listed):
- **The traced RARE runs contain no reopening:** all their blocks are permanent.
- **Returns:**
  - BELIEF returned to a reopened edge in all six HALF and OFTEN pairs: 16 reopened edges in all, 9 of them in the
    event's own window.
  - MBVI3 returned to 3, all after the own window: one in label 2 HALF and two in label 2 OFTEN.
- **Reopenings followed in both traces:** BELIEF's predicted chance was higher at 14 and lower at 1. Its highest value
  at a reopening was 0.51, and MBVI3's was 0.22.
- **Label 1 OFTEN, the largest traced difference:** BELIEF took 1,237 steps to MBVI3's 1,734.
  - BELIEF returned on all six reopenings, five of them in the own window.
  - MBVI3 met the first block and never came back. Its actions in label 1 OFTEN and label 1 HALF are identical for the
    whole run (2,457 steps each, every move and every failure the same), although the two schedules differ from the
    second block on. So it never tried an edge at a moment when the two schedules disagreed about it.
- **Cost:** BELIEF tried blocked edges more often than MBVI3 in every traced pair (for example 63 to 9 in label 1
  HALF). In RARE this is its cost: 1,178 to 1,156, 2,187 to 2,125 and 1,672 to 1,660 steps.

## 10. Disclosures

- **Looks before the freeze,** as listed in the spec:
  - the structure survey (no agent);
  - the structural record (no agent);
  - the power calculation (stored CF-06 and M11 rows and the frozen bank; no agent);
  - the regression tests, on development-family worlds;
  - two driver smoke runs on development-family worlds, checked for structure, determinism and timing only.

  No agent ran on a modular world before this run.
- **Written after the result and not part of the reading:**
  - §8 and the trace descriptions in §9, with their two scripts;
  - the comparison with CF-06 and M11 in §7;
  - the percentages.

  The pre-declared illustration is reported as it came out.
- **Nothing was tuned or rerun.** The `m13|modular|*` labels and the graph bank are now spent.
- **Held-out by structure, not by builder:** the agents, the task and the parameters are those developed on the
  development family. Only the worlds are new.

## 11. Limitations

1. **One family:** 165 graphs from one generator (4 modules of 6 nodes, ring bridges, degree at most 4), all with 24
   nodes and 36 edges. Other families, and larger or sparser worlds, are untested.
2. **Descriptors move together:** clustering, cycles, route length and detour length all change between the families.
   The study cannot say which one matters.
3. **Cost is real:** BELIEF loses in RARE in 133 of 165 labels. It is within the margin, but it is not zero.
4. **Observational mechanism:** G4 and §8 show that BELIEF goes back to reopened edges far more often, and that the
   recovery difference sits where it does. Neither shows that going back causes the saving. The diagnostic arms
   change what the belief archives, not whether the agent returns.
5. **Not confirmatory:** one run, by the designer, on local commits, with secondary criteria uncorrected for
   multiplicity.

## 12. Consequence

None for AD-13 or the agent, per the spec. The record may say that the adopted belief kept its advantage over MBVI3 on
one held-out structural family, in one development-level run. It also recovered reopened routes faster there, and
went back to them more often. It may not say that the belief generalizes in general.

## Files

| File | Role |
|---|---|
| [results/m13_result.json](results/m13_result.json) | The result: provenance, every row of run A, the 18 traces, the analysis and the reading |
| [results/SHA256SUMS](results/SHA256SUMS) | SHA-256 of every file under `results/` |
| [results/run/](results/run/) | Launch wrapper, display hold, run log, stdout, stderr, System log extract |
| [results/check/verify_m13.mjs](results/check/verify_m13.mjs) → `.out` | Independent check, written before the result |
| [results/check/crossing_split.mjs](results/check/crossing_split.mjs) → `.out` | §8, descriptive, written after the result |
| [results/check/trace_summary.mjs](results/check/trace_summary.mjs) → `.out` | §9, descriptive, written after the result |
