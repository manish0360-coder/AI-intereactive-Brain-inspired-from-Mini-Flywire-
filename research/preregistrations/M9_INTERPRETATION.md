# M9 Interpretation — Temporal Origin of Decision/Position Desynchronization

**Date:** 2026-08-29
**Author:** Chief Systems Engineer
**Authority:** Research Director ruling of 2026-08-29, following independent scientific review
(verdict **B — valid with specific wording restrictions**; interpretation gate closed)
**Protocol:** [`M9_PREREGISTRATION.md`](M9_PREREGISTRATION.md), frozen at `f40f83c`
**Analysis:** `experiments/m9/` at `04dda030e7615c24a84a6009fd23ba9d5dc14d46`, gate 48/0
**Evidence:** the frozen M8 collection at `f9d97b9`, unchanged

> Every figure in this report is quoted from `experiments/m9/results/m9_results.json` and was
> verified against it before this document was written. No statistic appears here that the
> frozen protocol did not specify, and none was computed for this report.

---

## 1. Executive summary

Under the frozen M9 protocol, the 7,178 decision/position desynchronization events in the M8
evidence divide into two origin categories: **68.22% ADVANCE** (4,897) and **31.78% TELEPORT**
(2,281), with **zero UNCLASSIFIED**. Desynchronization is overwhelmingly transient — **96.17%**
of events have an age of one tick.

The two categories do not carry equal evidential weight. ADVANCE is an inference by exclusion and
is the stronger claim; TELEPORT records the *presence* of a position reset inside the write→read
gap and does not establish that the reset was the proximate cause.

The classification rule was formulated after the M8 dataset existed. This result is therefore a
structured descriptive observation that generates a sharper hypothesis for future testing — not a
confirmatory test of a pre-specified one (§9).

## 2. Scientific question

> Of the desynchronization events in the frozen M8 evidence, what proportion arose from a
> teleport-class position reset falling within the write→read gap, versus from ordinary advance
> alone? (M9 §1)

**Primary phenomenon:** `DESYNC := lastReasoning.from !== agentCurrent` (M9 §2).

## 3. Frozen evidence and denominator

| | |
|---|---|
| Raw events examined | 118,179 |
| Eligible DESYNC events | **7,178** — the single denominator, matching the frozen value |
| Configurations contributing | 41 of 41 |
| M8 evidence digest | `ce45025c1601b6dc590c68ecb0c29a0e7f16802f882406498f88f9e2b2e7bf2f` |

The denominator is fixed and single (M9 §2). No event was excluded, no sub-population substituted.
The §13 minimum-evidence conditions were all satisfied: the denominator reproduced exactly,
UNCLASSIFIED is zero, and both ORIGIN categories are non-empty.

## 4. ORIGIN results

| ORIGIN | n | % of denominator |
|---|---|---|
| ADVANCE | 4,897 | 68.2223 |
| TELEPORT | 2,281 | 31.7777 |
| UNCLASSIFIED | 0 | 0 |

**TELEPORT — the strongest statement the evidence supports:**

> Under the frozen M9 protocol, 31.78% of DESYNC events were classified as TELEPORT. This
> classification indicates that for these events, at least one agent position-reset occurred
> within the gap between the write of `lastReasoning` and its evaluation. **This is an
> associational finding. It does not establish that the position reset was the proximate cause of
> the desynchronization**, because an ordinary advance may also have occurred inside the same gap.

**ADVANCE — the strongest statement the evidence supports:**

> 68.22% of DESYNC events were classified as ADVANCE. This classification is an **inference by
> exclusion**: no instrumented position reset occurred within the write→read gap. Under the
> verified source mechanics, the only remaining position-changing site is `main.js:4917`
> (`agentCurrent = next`). This category has a different and stronger evidential basis than
> TELEPORT.

The asymmetry is intrinsic to the definitions (M9 §4) and is not an artifact of the data.

**Supporting comparison cells**, from the frozen grid:

| cell | n | | cell | n |
|---|---|---|---|---|
| `GT/goalReset` | 4,569 | | `LT/goalReset` | 204 |
| `EQ/goalReset` | 2,077 | | `GT/pool` | 168 |
| `GT/cap` | 159 | | `EQ/cap` | 1 |

## 5. AGE results

| AGE (ticks) | n | % of denominator |
|---|---|---|
| 1 | 6,903 | 96.1688 |
| 2 | 256 | — |
| 3 | 17 | — |
| 4 | 2 | — |
| **≥ 2** | **275** | **3.8312** |

> The age of the stale `lastReasoning` record is overwhelmingly transient: 96.17% of DESYNC events
> have an age of one tick, and events of age two or more are rare (3.83%). Desynchronization is
> typically a single-tick phenomenon in this harness.

**AGE is a descriptive duration result, not an independent causal mechanism** (M9 §5). It is
mechanically correlated with the replay/no-fresh-selection condition, which is itself a constant
precondition of the phenomenon rather than a competing explanation (§6 below). The upper bound of
four ticks is a property of the frozen 150-tick episode cap, not of the agent.

By origin: TELEPORT events are age-1 in 91.06% of cases (2,077 of 2,281); ADVANCE events in 98.55%
(4,826 of 4,897).

## 6. Stratified descriptive results

All differences below are **observations in this dataset**. The frozen protocol is
descriptive-only (M9 §11): no statistical test was pre-registered, none was performed, and no
claim of significance, effect, or causation is made or implied.

| Stratum | TELEPORT | ADVANCE | TELEPORT % |
|---|---|---|---|
| degree-5 (goals 8, 12) | 906 | 2,372 | 27.6388 |
| degree-3 (goals 16, 19) | 1,375 | 2,525 | 35.2564 |
| Phase 1 | 951 | 2,800 | 25.3532 |
| Phase 2 | 1,330 | 2,097 | 38.8095 |

| Goal | TELEPORT | ADVANCE |
|---|---|---|
| 8 | 372 | 1,173 |
| 12 | 534 | 1,199 |
| 16 | 734 | 1,003 |
| 19 | 641 | 1,522 |

The proportion of TELEPORT-classified events **was observed to be higher** for lower-degree goals
(35.26% at degree-3 versus 27.64% at degree-5) and **was observed to be higher** in Phase 2
(38.81%) than in Phase 1 (25.35%). No mechanism for either observation is established here, and
neither is offered as an effect.

## 7. NOT OBSERVED cells

Ten of the sixteen comparison cells and 26 of the 48 grid cells contain zero events. They are
recorded as **NOT OBSERVED**.

Not observed in the comparison grid: `LT/cap`, `LT/pool`, `LT/none`, `EQ/pool`, `EQ/none`,
`GT/none`, and all four `NULL/*` cells.

**NOT OBSERVED is not the same as zero, and it is not UNREACHABLE** (M9 §10). The only conclusion
drawn is that these combinations did not occur in the collected evidence. In particular, `LT/cap`
appears reachable in principle — a cap restart on a post-write tick with no fresh selection would
produce it — and its absence here is an observation about this dataset, not a proof of
impossibility.

## 8. ADVANCE / S_PAIR / NON_CANONICAL — entailment and consistency check

**This belongs to verification, not to results. It is not a discovery.**

All 4,897 ADVANCE events are S_PAIR (`agentCurrent === next`) and all 4,897 are NON_CANONICAL —
100% on both, with zero counterexamples.

This is **logically entailed**, not empirically discovered:

1. ADVANCE means no teleport occurred since the write, so the only position change was
   `main.js:4917` (`agentCurrent = next`);
2. that assignment leaves the agent standing on the stale target, so at the next read
   `agentCurrent` *is* `next` — S_PAIR by construction;
3. `connections.json` contains no self-loop, so a self-pair can never be canonical.

The empirical 4,897/4,897 therefore serves as a **consistency check**: it confirms that the
implementation matches the source logic and that the ADVANCE category is correctly defined. It
carries no independent evidential content, and presenting it as a finding would be presenting a
tautology as evidence.

For contrast, TELEPORT events are S_PAIR in 0 of 2,281 cases and NON_CANONICAL in 1,938 (84.96%) —
values that are not entailed and are reported descriptively.

## 9. Post-hoc limitation

**Stated without mitigation.**

The ORIGIN rule was **formulated after the M8 collection existed**, and was **retained knowing
that both categories are populated**. Its inputs (`ticksSinceWrite`, `ticksSinceTeleport`,
`teleportSource`) are frozen M8 §8 observables, and the in-tick ordering it relies on is
source-established and predates collection; the rule was derived from control flow rather than
selected by the answer it produces. The residue is nonetheless real and cannot be un-observed.

**Consequence:** this result carries **weaker evidential weight than a fully a-priori confirmatory
analysis**. It is a valid, structured observation of the M8 dataset, not a confirmatory test of a
pre-specified hypothesis in the strongest sense. It is best understood as **generating a sharper
hypothesis for future testing**. Any downstream write-up must reproduce this limitation.

## 10. Relation to M7 / G15

M7 remains frozen and closed at `707cb1e5205a7e9979f81092ee1ebfa0fe28922e`, with its recorded
result unchanged: `VERIFIER SELF-CHECK: GREEN`, `INFORMATION SUFFICIENCY: SATISFIED`,
`GATE G15: FAIL`.

**Supported by M9:**

- M9 characterizes DESYNC events in the frozen M8 evidence.
- M9 shows that 31.78% of those events were classified as containing a position reset within the
  write→read gap.
- M9 motivates future investigation.

**Not supported, and not claimed:**

- That position resets *caused* those events.
- That M9 explains the G15 FAIL.
- That M9 proves the G15 result was caused by desynchronization.

Three facts may be stated side by side — M9 characterizes DESYNC events; DESYNC events were
present in the M7 runtime; G15 failed — and **no causal arrow may be drawn between them**. M9
used no M7 quantity: ρ, reward, eligibility and calibration appear nowhere in the analysis or its
output, and the analysis gate asserts their absence (F3).

## 11. What the evidence establishes

1. The 7,178 DESYNC events partition completely under the frozen ORIGIN rule, with no
   unclassified residue.
2. Both origin categories are substantially populated: 68.22% ADVANCE, 31.78% TELEPORT.
3. Desynchronization is overwhelmingly a single-tick phenomenon (96.17% at age 1).
4. TELEPORT proportions were observed to differ across goal-degree strata and across phases in
   this dataset.
5. The ADVANCE category behaves exactly as its definition entails, confirming implementation
   correctness.
6. The classification is deterministic and reproducible from the frozen evidence.

## 12. What the evidence does NOT establish

1. **Proximate causation for TELEPORT events.** An advance may also have occurred in the same gap.
2. **Any causal effect of goal degree or phase.** The stratified differences are observations, not
   effects; no test was performed and none may be added.
3. **The number of advances inside a gap of age ≥ 2**, or which teleport was responsible when more
   than one occurred — only the most recent is retained.
4. **That the unobserved cells are unreachable.**
5. **Anything about goal-context mismatch (H4)**, which is structurally untestable in this
   headless harness because both in-tick goal-write sites are gated on `window.homeNeuronId`,
   never defined there. This is *untestable*, which is not *absent*.
6. **Any connection to the M7 G15 outcome.**
7. **That replay is a competing mechanism.** `selectionRanThisTick` is `false` on all 7,178
   eligible events — a constant precondition of the phenomenon, reported as such and never as an
   explanation.

## 13. Future research implications

Recorded as implications, not as recommendations, and none is proposed here as a conclusion or as
an intervention:

- A genuinely a-priori test of the ORIGIN partition would require a new experiment with the rule
  frozen before collection. That would raise the evidential weight §9 constrains.
- The 68.22% ADVANCE share indicates that the ordinary advance at `main.js:4917` is the dominant
  setting in which staleness becomes observable. Whether that is desirable is not an M9 question.
- H4 would require a harness in which `window.homeNeuronId` is defined; whether such a harness
  should exist is a separate design question.
- Distinguishing a teleport from a co-occurring advance inside one gap would require an observable
  M8 did not record. **No new observable is proposed here**; adding one is a decision for a future
  pre-registration.

## 14. Reproducibility and integrity

| | |
|---|---|
| M7 pre-registration digest | validates unchanged |
| M8 pre-registration digest | validates unchanged |
| M8 evidence digest | `ce45025c…bf2f` — byte-for-byte identical to the recorded value |
| M9 pre-registration digest | validates unchanged |
| M9 analysis gate | 48 passed, 0 failed |
| M8 collection gate | 34 passed, 0 failed |

The analysis is deterministic: repeated runs are byte-identical, the stored result reproduces from
a fresh recomputation, and the results digest matches its integrity record. No gate depends on
filesystem metadata, wall-clock time, network access, or input ordering. No M8 or M7 file was
modified, no collection was executed, no configuration seed was generated or inspected, and the
held-out block `>= 900500` remains untouched.

Mutation controls bind the measurement input, not merely the predicate: corrupting a raw record,
an ORIGIN-relevant field, the equality-case source, a required counter, the population, or the
rule itself each produces a detectable change (M1–M10).

## 15. Final scientific conclusion

Under the frozen M9 protocol, decision/position desynchronization in the M8 evidence is a
**short-lived, fully classifiable phenomenon dominated by the ADVANCE category**: 68.22% of the
7,178 events occurred with no instrumented position reset in the write→read gap, 31.78% occurred
with at least one such reset present, none was unclassifiable, and 96.17% persisted for a single
tick.

The result is descriptive and associational. It establishes a clean partition and its proportions;
it does not establish proximate causation for either category, does not establish any effect of
topology or phase, and does not bear on the M7 G15 outcome. Its evidential weight is limited by
the post-hoc formulation of the ORIGIN rule recorded in §9.

**The M9 analysis is complete. M7 and M8 remain frozen and unchanged.**
