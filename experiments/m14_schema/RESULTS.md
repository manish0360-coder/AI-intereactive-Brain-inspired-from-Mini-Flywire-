# M14 — results: a relational schema learned across worlds, applied to an unseen combination

> **Erratum, 2026-11-18.** Three figures below were rounded twice and are each 0.01 off: S's upper bound, R1's lower
> bound and E3's mean. The corrected values are in [the erratum at the end](#erratum-2026-11-18). No verdict changes.

**Summary statement (by the frozen rule): LEARNED RELATIONAL SCHEMA TRANSFERS TO UNSEEN COMBINATIONS, WITHIN THE
SAFETY MARGIN.**

| Line | Value |
|---|---|
| Validity | **VALID** |
| Transfer (P1 and P2) | **SHOWN** |
| Relational content (P2) | **SHOWN** |
| Safety (S) | **SAFE** |
| Reversal (R1, secondary) | **MISLED WHEN REVERSED** |

gainShape for P1 is **CONSISTENT**.

**What the record may say** (SPEC.md, "Consequence"): a schema learned over observable kinds in six relabelled worlds
improved the adopted agent's first decisions in an unseen world that needed an unseen combination of the relation, in
one development-level run. It may not say that the agent abstracts in general, discovers roles, or understands causes.

**Evidence category:** development-level. It is one run, by the designer, on local commits that have not been pushed.
It is not confirmatory and decides nothing about AD-13 or the agent.

## 1. The run

| Item | Value |
|---|---|
| Specification | [SPEC.md](SPEC.md), frozen in `01f68da` on the owner's word "Freeze and run" after the pre-freeze audit; SHA-256 `3dc4625b…`. PINS.json `0159cd82…` (40 files) and admission.json `627b330b…`, both equal to [SPEC.sha256](SPEC.sha256). Build `799bca2` |
| Launch and end | 2026-11-18 13:42:40Z to 13:45:07Z, at HEAD `01f68da` both times, with 0 changed paths at launch. Both runs took 45 s; the rest was the refusal checks and the test suite |
| Command | `node experiments/m14_schema/run_m14.mjs --domain m14`, with the per-process wake request ([results/run/](results/run/)) |
| Exit | 0; stderr empty |
| Pre-run checks | Every refusal check passed; `scripts/test_all.mjs` passed 207/207 before the first agent run |
| Environment | Node v24.15.0, win32-x64; peak RSS 272,120 KB |
| Result | [results/m14_result.json](results/m14_result.json), 1,122,161 bytes, SHA-256 `d292412922c209b7d6ce44ba8357102921f61140c97d1550d9f56a07afbf0d3d` |
| App files | `main.js` `c92c5c6b…` (the audited file, untouched) |
| Scale | 165 labels × 4 arms = 660 trials. Each trial is six training worlds × 5 episodes for the two learner arms, then three test conditions × 3 episodes. Run twice |
| Exclusions | 0, as the census predicted; no test episode reached the cap |
| Determinism | Run A and run B rows are identical: one SHA-256, `96860660f3a56ac8b7c7452235aa6a109009d09276ac53319db7cd6a65b8b94f` |
| Standby | None. The System log shows two power-source changes before the launch and no sleep or standby marker ([results/run/m14_power_events.txt](results/run/m14_power_events.txt)) |

**The independent check** ([results/check/verify_m14.mjs](results/check/verify_m14.mjs)) was written before the result
existed. It recomputes, with its own code:
- provenance and counts, and determinism;
- every test episode's integrity: it starts at the route start, every step is a move along an edge of the test world,
  and it ends at the goal or the cap;
- the routes, with its own shortest-path code;
- CONCRETE's passivity, and ORACLE_SCHEMA walking the route;
- each schema's freeze, hash and learned relation;
- every contrast with its bootstrap interval, gainShape, the five lines and the summary.

**Output** ([verify_m14.out](results/check/verify_m14.out)): every check passes except 9 of the 10 "interval matches
the driver" items. In each of those 9, the mean matches and the interval differs in the second or third decimal. The
one that matches, O, has every difference equal to zero. The lines and the summary it recomputes are the driver's.

**Cause, found after the result:**
- The driver builds each contrast over labels in string order (`gate|0`, `gate|1`, `gate|10`, `gate|100`, …;
  `m14_lib.mjs`, `contrast`, `.sort()`).
- The check, written beforehand, used numeric order.
- The seeded bootstrap resamples by position, so a different order gives a slightly different interval.

**Reconciliation** ([check/reconcile_order.mjs](results/check/reconcile_order.mjs), written after the result, not part
of the reading; output [reconcile_order.out](results/check/reconcile_order.out)):
- In string order, every one of the ten intervals reproduces the driver exactly.
- The means are equal.
- The criterion lines are the same in string order, in numeric order and in the driver.

The pre-result check and its output are kept as they came out. The intervals reported below are the driver's.

## 2. The criteria

Each row is a per-label paired difference in the first test episode, in steps: the mean and its 95% paired percentile
bootstrap interval (10,000 resamples, seeded `m14schema|stats|m14|<name>`), with n = 165.

| | Criterion | Statistic | Result | SD | Median | + / − / 0 | Passes when | |
|---|---|---|---|---|---|---|---|---|
| **V** | Validity | determinism, tests, exclusions, CONCRETE passive, ORACLE on the route | all five hold | | | | all five | **VALID** |
| **P1** | Transfer | COMPOSE, CONCRETE − SCHEMA | **+30.32 [27.43, 33.27]** | 19.21 | 27 | 161 / 0 / 4 | mean > 0, lower > 0 | pass |
| **P2** | Relational content | COMPOSE, SCHEMA_SHUFFLED − SCHEMA | **+25.73 [22.99, 28.49]** | 18.15 | 22 | 153 / 0 / 12 | mean > 0, lower > 0 | pass |
| **S** | Safety | NULL, SCHEMA − CONCRETE | **−0.11 [−3.98, 3.66]** | 25.09 | 0 | 80 / 82 / 3 | upper < 9 | **SAFE** |
| R1 | Secondary | REVERSED, SCHEMA − CONCRETE | **+8.28 [5.09, 11.49]** | 20.97 | 8 | 107 / 56 / 2 | (reported) lower > 0 | **MISLED WHEN REVERSED** |

**gainShape of P1 (CF-06's rule):**
- labels: 161 for, 0 against, 4 tied;
- median: +27;
- the top decile carries 21.6% of the sum;
- the mean without the top decile is +26.5.

So P1 is **CONSISTENT**.

**Mean steps per arm, condition and test episode:**

| Arm | COMPOSE 1 / 2 / 3 | NULL 1 / 2 / 3 | REVERSED 1 / 2 / 3 |
|---|---|---|---|
| CONCRETE | 34.32 / 16.32 / 8.05 | the same runs | the same runs |
| SCHEMA | **4.00** / 31.84 / 14.94 | 34.21 / 15.61 / 8.32 | 42.59 / 13.62 / 6.19 |
| SCHEMA_SHUFFLED | 29.73 / 17.67 / 8.90 | 35.51 / 15.74 / 7.04 | 31.54 / 15.22 / 7.99 |
| ORACLE_SCHEMA | **4.00** / 32.94 / 13.59 | 34.67 / 15.85 / 7.58 | 40.98 / 14.11 / 5.81 |

**Reported contrasts** (first episode unless stated):

| Contrast | Result |
|---|---|
| SCHEMA − ORACLE_SCHEMA, COMPOSE (shortfall from the true relation) | **0.00**: equal in all 165 labels |
| CONCRETE − ORACLE_SCHEMA, COMPOSE (headroom) | +30.32 [27.39, 33.31] (development: +32.2) |
| CONCRETE − SCHEMA_SHUFFLED, COMPOSE | +4.59 [0.91, 8.36] |
| CONCRETE − SCHEMA, COMPOSE, second episode | −15.52 [−18.76, −12.24] |
| CONCRETE − SCHEMA, COMPOSE, third episode | −6.89 [−9.17, −4.63] |
| SCHEMA − CONCRETE, REVERSED, third episode | −1.87 [−3.41, −0.40] |

## 3. What the learner learned, and when the schema acted

These figures are descriptive, written after the result ([check/describe.mjs](results/check/describe.mjs), output
[describe.out](results/check/describe.out)).

**What each schema learned:**

| Schema | Learned relation = SIGMA | True link | Self link | Other links |
|---|---|---|---|---|
| SCHEMA | **165 of 165** labels | 0.877 | 0.189 | 0.140 |
| SCHEMA_SHUFFLED | 1 of 165 | 0.432 | 0.205 | 0.412 |

The scores are means over labels and kinds.
- **Training:** both arms reached the goal in every training episode. SCHEMA used 145.0 training steps per label,
  SCHEMA_SHUFFLED 175.1.
- **What the shuffled control still carries.** SCHEMA_SHUFFLED learned one regularity that every renamed relation
  shares: the next kind is never the current kind. It scores self links low (0.205) and cannot separate the three other
  kinds. That fits its small first-episode gain over CONCRETE (+4.59). So the control is not information-free; it keeps
  a weaker relational fact. P2 is measured against it, which makes P2 conservative.

**When the schema acted** (per label, over the three test episodes):

| Arm | Condition | Decisions | Ties | Schema narrowed | Decided alone |
|---|---|---|---|---|---|
| SCHEMA | COMPOSE | 50.8 | 27.9 | 22.4 | 18.8 |
| SCHEMA | NULL | 58.1 | 31.1 | 23.8 | 18.7 |
| SCHEMA | REVERSED | 62.4 | 32.7 | 26.8 | 21.1 |
| SCHEMA_SHUFFLED | COMPOSE | 56.3 | 30.2 | 24.9 | 20.4 |

The schema is active in every condition. In NULL it acts about as often as in COMPOSE, yet it gives no benefit there
(S = −0.11). The pre-freeze audit showed that, on audit labels, the schema agent's path equals CONCRETE's until the
schema's first decision. So the differences above are produced by the schema's decisions.

## 4. What it shows, by level

| Level | Evidence here | Reading |
|---|---|---|
| **Memorization** | No node, route or labelled place recurs between training and test, and concrete memory cannot even be carried between these worlds (v3 refuses) | Excluded by construction |
| **Generalization** | P1 +30.3 and P2 +25.7, both with lower bounds far above 0; SCHEMA matched the true-relation oracle in every label | **Shown, on this task**: the relation learned from six relabelled worlds, each showing two links, guided a four-link route never experienced whole, in a new world |
| **Use of the relation** (intervening on the world: same graph, start, goal and agent stream; only the kinds change) | No benefit and no harm when kinds carry no relation (S −0.11 [−3.98, 3.66]); misled when the relation is reversed (R1 +8.28 [5.09, 11.49]), and recovered by the third episode (R2 −1.87) | The agent's decisions follow the learned relation, not the world |
| **Causal understanding** in a wider sense | Not tested | Not claimed |

## 5. Illustration (pre-declared)

`m14schema|gate|0`, the first COMPOSE episode. The route is 22 > 20 > 10 > 12 > 14.

| Arm | Steps | Path |
|---|---|---|
| CONCRETE | 52 | 22>20>23>20>1>15>10>15>1>20>10>20>22>17>23>11>16>11>9>13>1>8>21>8>1>13>9>11>6>11>23>17>22>17>23>3>19>3>23>3>19>5>15>5>19>18>13>18>19>18>13>0>14 |
| SCHEMA | **4** | 22>20>10>12>14 (learned relation [1, 2, 3, 0] = SIGMA) |
| SCHEMA_SHUFFLED | 24 | 22>20>22>17>22>17>23>3>19>18>19>3>23>20>23>11>16>2>16>11>9>11>6>0>14 (learned [3, 0, –, 2]) |
| ORACLE_SCHEMA | 4 | 22>20>10>12>14 |

CONCRETE passes through route nodes 20 and 10 several times without knowing that they lead on. SCHEMA reads the
signposts it learned to read, in a world it has never seen.

## 6. Disclosures

- **Looks before the freeze,** as listed in SPEC.md:
  - development on test-namespace trials;
  - the admission run (CONCRETE and ORACLE only, development labels);
  - the census;
  - a driver smoke run;
  - the owner-instructed pre-freeze audit probe on `m14schema|audit|0..99`.

  That probe exposed outcomes on those labels (SCHEMA and ORACLE 4 steps, SHUFFLED about 31), and they are matched
  here. No agent ran on a gate label before the run.
- **The pre-result check's interval mismatches** come from label ordering. They are kept as reported and reconciled
  after the result (§1).
- **Written after the result and not part of the reading:** §3, the reconciliation, and the readings in §4.
- **Nothing was tuned or rerun.** The `m14schema|gate|*` labels are now spent.

## 7. Limitations

1. **The effect is near its ceiling by construction.** One consistent relation fully signposts the route, and the
   learner recovered it in every label. What the run shows is extraction from relabelled experience plus composition
   of the links. It does not show that this is a hard problem.
2. **Roles are given** as observable kinds. The agent abstracts a relation over given roles; it does not discover
   them.
3. **Exact signposts, deterministic edges, one world generator, 24-node worlds.** Noisy or partial relations are
   untested.
4. **Later episodes cost more.** In the second and third COMPOSE episodes, SCHEMA uses more steps than CONCRETE (−15.5,
   −6.9): once it knows the route, the optimistic planner goes back to explore the exits SCHEMA skipped. Over the three
   episodes SCHEMA is still ahead by 7.9 steps a label (121 labels for, 42 against, 2 tied). The schema helps first
   encounters; it is not a policy for exploring once a route is known.
5. **The shuffled control keeps a weak relation** (no self steps), so P2 understates the full relation's value.
6. **The checker is independent in code path only.** It was written by the same author. It shares `pairedBootstrap`,
   `generateWorld` and `makeStream` with the driver, and its intervals differed only by label order (§1).
7. **Not confirmatory:** one run, by the designer, on local commits.

## 8. Consequence

None for AD-13 or the agent: the schema agent is a separate, tested component, and AD-13 is unchanged. Whether to use
the schema anywhere else is the owner's decision.

## Files

| File | Role |
|---|---|
| [results/m14_result.json](results/m14_result.json) | Every row of run A, provenance, analysis and reading |
| [results/SHA256SUMS](results/SHA256SUMS) | SHA-256 of every file under `results/` |
| [results/run/](results/run/) | Launch wrapper, run log, stdout, stderr, System log extract |
| [results/check/verify_m14.mjs](results/check/verify_m14.mjs) → `.out` | The independent check, written before the result |
| [results/check/reconcile_order.mjs](results/check/reconcile_order.mjs) → `.out` | The label-order reconciliation, written after the result |
| [results/check/describe.mjs](results/check/describe.mjs) → `.out` | §3, descriptive, written after the result |
| [audit/interval_audit.mjs](audit/interval_audit.mjs) → `.out` | The owner-requested interval audit, written after the result (see the erratum) |

## Erratum (2026-11-18)

This erratum is dated and added after the record above. No sentence above was changed; a three-line pointer to it was
inserted under the title.

**How it was found.** The owner asked for an interval audit before the result is called independently verified. The
audit ([audit/interval_audit.mjs](audit/interval_audit.mjs), output
[audit/interval_audit.out](audit/interval_audit.out)) imports nothing from the repository. It reimplements the seed,
the mulberry32 stream, the paired percentile bootstrap and the driver's string order of labels, and it found two
things.

**1. The intervals are verified.** In the driver's label order, all ten stored intervals (P1, P2, S, R1, R2, O, H,
SH, E2, E3) reproduce exactly: n, mean and both bounds, compared with `===`. The same procedure in numeric order
reproduces the ten intervals that the pre-run checker printed. The checker's nine mismatches (§1) are therefore fully
explained by its label order and are resolved. No decision differs between the two orders.

**2. Three figures in this record are mis-rounded.** They were rounded twice, from three-decimal printouts to two
decimals.

| Figure | Stored value (`results/m14_result.json`) | Written above | Correct to 2 decimals | Where above |
|---|---|---|---|---|
| S, upper bound | 3.654545… | 3.66 | **3.65** | §2 criteria table; §4 |
| R1, lower bound | 5.084848… | 5.09 | **5.08** | §2 criteria table; §4 |
| E3, mean | −6.884848… | −6.89 | **−6.88** | §2 reported contrasts |

**The corrected rows:**
- S: **−0.11 [−3.98, 3.65]**, below the margin of 9: SAFE;
- R1: **+8.28 [5.08, 11.49]**: MISLED WHEN REVERSED;
- E3: **−6.88 [−9.17, −4.63]**.

**What is unaffected:**
- the stored values in the result file;
- `results/SHA256SUMS`;
- every check;
- every verdict line and the summary statement.

None of these three figures is near a threshold. The first two also appear in the message of commit `b8fea5b`. That
message is left as it is, because history is not rewritten.
