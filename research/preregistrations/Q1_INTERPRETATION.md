# Q1 Interpretation — Ordered Composition of Position-Changing Transitions in DESYNC Gaps

**Version:** 1.0 · **Date:** 2026-09-01
**Author:** Chief Systems Engineer
**Authority:** Research Director ruling of 2026-09-01, following an independent scientific
interpretation review by Gemini (verdict: **READY FOR DIRECTOR INTERPRETATION**)
**Evidence:** the frozen Q1 collection at `d16d568`, analysed at `057ceb0`
**Governed by:** `Q1_PREREGISTRATION.md` (frozen `0ad12fe`), D-006, D-007, D-008, D-009

> This document interprets an already-frozen result. It computes nothing, modifies nothing, and
> introduces no observable, statistic or definition. Every figure below is quoted from
> `experiments/q1/results/q1_claim_results.json` or from the frozen collection manifest.

---

## 1. Executive disposition

> # INCONCLUSIVE — INSUFFICIENT MATERIAL

**The Q1 study result is INCONCLUSIVE — INSUFFICIENT MATERIAL**, because the pre-registered minimum
evidence thresholds for distributional analysis were not met:

| Condition (D-006 §1 E) | Required | Observed | |
|---|---:|---:|---|
| accepted configurations | 20 | **17** | **unmet** |
| configurations in `degree5` | 15 | **9** | **unmet** |
| configurations in `degree3` | 15 | **8** | **unmet** |
| DESYNC events pooled | 100 | 3,166 | met |

The 17 accepted configurations were drawn from **9 distinct configuration seeds**.

**This disposition concerns distributional characterisation.** Under D-007, the five pre-registered
existence claims of Q1 §9 remain evaluable **for refutation only**, and were evaluated on that
basis. **The disposition above governs every result in this document and is inherited by every
table, verdict and statement in it.**

Q1 §9.5 (AGE independence) was **retired** by D-007 §4 as unevaluable as frozen at any sample size,
and was not evaluated.

---

## 2. What Q1 was designed to answer

Q1 §1, frozen before any instrumentation existed:

> Within DESYNC gaps in the frozen M9 sense, what ordered sequence of position-changing transitions
> occurs, and how is that sequence distributed across gaps that M9 would classify TELEPORT versus
> ADVANCE?

The second half of that question — the distribution — is precisely what the INCONCLUSIVE
disposition withholds. **What remains answerable is the first half, and only in the refutation
sense**: whether specific pre-registered universal statements about that ordered sequence survive
contact with the collected evidence.

DESYNC is the frozen §2 predicate `lastReasoning.from !== agentCurrent`, evaluated at
`main.js:3819`, inherited unchanged from M8 §2. A gap opens at the `lastReasoning` write
(`main.js:2635`) and closes at that read, per §3.

---

## 3. Frozen evidence and population

Collected over the complete D-006 range `899000–899499`: 2,000 candidates, 17 accepted, 1,983
rejected, none pending, none failed. Agent seed `20260819000`, arm `A1`, 3,000 ticks per accepted
configuration.

| Quantity | Value |
|---|---:|
| Assignment records collected | 37,659 |
| Window-boundary records collected | 97,810 |
| Reads at `main.js:3819` | 51,085 |
| — DESYNC reads (**the Q1 gap population**) | **3,166** |
| — non-DESYNC reads | 47,919 |
| — reads with no preceding write | 0 |
| ORIGIN `ADVANCE` | 2,086 |
| ORIGIN `TELEPORT` | 1,080 |
| ORIGIN `UNCLASSIFIED` | 0 |

Gaps were classified using the frozen M9 `originOf()` rule. **M9's historical event population was
not reconstructed and is not reconstructible**: M9's event eligibility required an evaluation probe
at `main.js:3922` that Q1's instrumentation does not carry. Q1 has its own denominator, and its
counts are not comparable like-for-like with M9's published figures.

**Transition definition (D-009 Ruling 1).** For claim evaluation, a transition is a record with
`fromPos !== toPos`. This follows Q1 §6 ("executed **position-changing** transition") and §15.6
("Q1 measures **realised position changes only**").

---

## 4. Claim-by-claim results

**All results below are governed by the INCONCLUSIVE — INSUFFICIENT MATERIAL disposition of §1.**

| | Frozen statement (Q1 §9, verbatim) | Verdict | Counterexamples |
|---|---|---|---:|
| **E1** | TELEPORT-classified gaps contain only teleports | **NOT REFUTED** | 0 |
| **E2** | Every gap contains exactly one transition | **REFUTED** | **85** |
| **E3** | The last transition in a TELEPORT-classified gap is always the teleport | **NOT REFUTED** | 0 |
| **E4** | `FIRST_DIVERGING_TRANSITION` always equals `LAST_TRANSITION_BEFORE_EVALUATION` | **REFUTED** | **85** |
| **E5** | ADVANCE-classified gaps are single-transition | **NOT REFUTED** | 0 |

**NOT REFUTED is not confirmation.** For every such claim the permitted statement is exactly:

> no counterexample observed in 17 accepted configurations drawn from 9 distinct configuration seeds

The words *proven*, *true*, *confirmed*, *established* and *holds* are not used of E1, E3 or E5
anywhere in this document, and must not be used of them anywhere downstream.

---

## 5. E1 interpretation

> **NOT REFUTED.** No counterexample was observed in the 17 accepted configurations drawn from 9
> distinct configuration seeds. In this dataset, the `TELEPORT` class of gaps was composed
> exclusively of `goalReset` transitions.

**Scope, stated explicitly.** The word "teleports" in the frozen statement ranges over the §4
taxonomy members `cap`, `pool` and `goalReset`. In the Q1 gap population, only `goalReset`
transitions appeared inside TELEPORT-classified gaps (1,175 records across 1,080 gaps). `cap` and
`pool` records exist in the collected evidence — 5 and 17 respectively across the whole collection —
but **no `cap` or `pool` record fell inside any DESYNC gap window**.

The non-refutation is therefore **empirically valid but narrowly scoped**: it was tested against a
TELEPORT class realised by one mechanism only.

**This does not license** the statement "teleportation always occurs through `goalReset`", nor
"teleport gaps contain only teleports in general". Absence of `cap` and `pool` from this Q1
population is **not** evidence that they cannot occur inside a DESYNC gap in this harness.

---

## 6. E2 interpretation

> **REFUTED.** 85 counterexamples were observed where a DESYNC gap contained two or more
> position-changing transitions.

This is a genuine, unambiguous refutation. A single counterexample suffices to falsify a universal
statement, and 85 were observed. The refutation is valid at any sample size and is not weakened by
the INCONCLUSIVE disposition — D-006 §4 recorded, before any data existed, that the minimum-evidence
rule governs distributional characterisation "and nothing else" and "cannot make a Q1 refutation
more or less valid."

**The integer 85 is existence evidence, not a distributional estimate.** It is not a rate, a
prevalence, a proportion or a frequency, and it must never be divided by the 3,166-gap population or
by anything else. Q1 is INCONCLUSIVE precisely for the class of statement such a ratio would be.

**Representative counterexample**, reproducible from the frozen evidence:

| Field | Value |
|---|---|
| run | `899000:0` |
| write / read sequence | 753 → 758 |
| ticks | 280 → 282 |
| ORIGIN | `TELEPORT` |
| transition count | 2 |
| composition | `[goalReset, goalReset]` |
| first transition | seq 755, `goalReset`, 9 → 19 |
| last transition | seq 757, `goalReset`, 19 → 1 |

Five exemplars are stored per refuted claim; 80 further counterexamples per claim were not stored.
That truncation is disclosed in the artifact; **the totals are exact**.

**What E2's refutation means.** The pre-registered expectation that a DESYNC gap holds exactly one
transition does not survive. Q1 §3 had already established that an age-*k* gap may contain up to 2*k*
transitions; E2's refutation is the observation that this possibility is realised.

---

## 7. E3 interpretation

> **NOT REFUTED.** No counterexample was observed in the 17 accepted configurations drawn from 9
> distinct configuration seeds. (See the E1 scope limitation.)

E3 carries **the same narrow empirical scope as E1**: it was tested against TELEPORT-classified gaps
composed exclusively of `goalReset` transitions. No universal truth is implied, and the words
*proven*, *true*, *confirmed*, *established* and *holds* do not apply.

---

## 8. E4 / E2 equivalence

> **REFUTED.** 85 counterexamples were observed. **Under the frozen protocol (D-009), this claim is
> logically equivalent to claim E2.**

D-009 Ruling 2 fixed E4's "equals" as **identity of the transition records**. Two records differ
exactly when a gap contains more than one transition, which is E2's refutation condition verbatim.

The analysis established the equivalence per gap rather than assuming it: E2 and E4 agree on **all
3,166 gaps**, with **0 disagreements**, and the refuting sets are **the same 85 gaps** — set equality
verified in both directions.

**E4 must not be presented as an independent scientific discovery.** Q1 evaluated four logically
distinct propositions, not five. The redundancy is a property of the frozen protocol's wording, and
it is reported rather than repaired.

For completeness: under a *site*-equality reading of "equals", 85 gaps would have disagreed with E2.
The two readings are therefore distinguishable on this evidence, which is why D-009 Ruling 2 was
decisive rather than cosmetic.

---

## 9. E5 structural constraint

> **NOT REFUTED.** No counterexample was observed. This result is structurally constrained: the
> `ORIGIN=ADVANCE` definition mechanically prohibits `goalReset`, `cap` and `pool` transitions from
> appearing in these gaps. The finding is therefore the narrower empirical observation that no
> `ADVANCE` gap contained two or more `advance` transitions.

**This must not be presented as an ordinary empirical discovery.** Two components have to be kept
apart:

1. **Structural consequence of the ORIGIN definition.** `ORIGIN = ADVANCE` holds when the most
   recent teleport *predates the write*. By construction, no `cap`, `pool` or `goalReset` record can
   then lie inside the gap window. That an ADVANCE gap contains only `advance` transitions is
   therefore **entailed by the classification rule**, not observed. The evidence is consistent with
   this: `advance` was the only site appearing inside ADVANCE-classified gaps (2,086 records across
   2,086 gaps).
2. **Empirical observation.** Within that structurally constrained class, no ADVANCE gap contained
   two or more `advance` transitions.

E5 is therefore **partly analytic and partly empirical**, and it is a materially weaker result than
it would be if all four transition types had been able to occur inside ADVANCE gaps. It is **not
proven**, and it must not be read as evidence that all four transition types were empirically tested
inside ADVANCE gaps. They were not; three of them were structurally excluded.

---

## 10. Self-loop treatment

The committed instrumentation recorded every *executed* assignment at the four §4 sites, which is a
superset of what Q1 §6 describes. D-009 Ruling 1 resolved the conflict in favour of the frozen
protocol.

| | |
|---|---:|
| Self-loop assignment records (`fromPos === toPos`) excluded from claim evaluation | **2,686** |
| — `advance` | 2,086 |
| — `goalReset` | 600 |
| Of these, records that fell **inside a gap window** | **222** |
| Gaps whose transition count was changed by the exclusion | **202** |

**The exclusion was material, not cosmetic.** It altered the transition count of 202 gaps, which is
why D-009 was necessary rather than a formality. It also demonstrates that the distinction between
an *executed assignment* and a *realised position change* is non-trivial in this harness.

**The records themselves remain in the raw evidence, unaltered and digest-pinned.** Nothing was
deleted, filtered on disk, or hidden. The ruling changed how the evidence is *read*, never what the
evidence *is*.

---

## 11. ORIGIN sensitivity

`originSensitivity = 0`.

> The two candidate ORIGIN scanning scopes produced identical labels on this Q1 dataset.

The two scopes are: scanning all assignment records at the teleport sites (D-008 §4's exact
emulation of the M8 recorder), versus scanning only position-changing ones. On this dataset the
choice changed no gap's label.

**This is a dataset-specific robustness check.** It closes the question for Q1. It is **not** a claim
that the two procedures are generally equivalent, and it must not be cited as one for any other
dataset.

---

## 12. What Q1 does NOT establish

1. **No distribution.** No proportion, rate, prevalence, frequency or percentage of any kind. The
   INCONCLUSIVE disposition is exactly a statement that the material does not support these.
2. **No causality.** Q1 records temporal ordering. Q1 §7 prohibits naming any derived observable a
   cause, and prohibits the term "proximate cause" outright. Nothing here says that teleportation
   caused DESYNC, that ordinary advance caused DESYNC, or that ORIGIN is a causal variable — ORIGIN
   is a classification label, not a cause.
3. **No confirmation of E1, E3 or E5.** Absence of a counterexample in 17 configurations from 9
   distinct seeds is weak evidence, and the protocol permits only "not refuted".
4. **No general claim about `cap` or `pool`.** They did not occur inside any DESYNC gap in this
   population. That is not impossibility in the harness.
5. **No behavioural consequence of desynchronization.** Never measured, by design (Q1 §15.2).
6. **No statement about M7's validity, the held-out seed block, attempted-but-slipped advances, or
   goal-context mismatch.** All excluded by Q1 §15.
7. **No pooling.** Q1's denominator is Q1's. It may not be combined with M8, M9 or any future
   evidence.

---

## 13. Relationship to M7 / G15

**Permitted, and the only permitted connection:**

> Q1 provides a detailed characterization of the DESYNC phenomenon, which was also present in the M7
> evidence. While these findings do not explain the M7 G15 result, they provide a more precise basis
> for future investigation into the behavioural consequences of desynchronization.

**Explicitly forbidden, and not asserted anywhere in this document:** that Q1 explains G15; that Q1
proves why G15 failed; that DESYNC caused G15; that Q1 identifies the mechanism behind G15. **There
is no causal arrow from Q1 to G15.**

M7 remains frozen at `707cb1e`. No Q1 result is authorised to reinterpret M7, M8 or M9.

---

## 14. Post-hoc limitation

**Stated without mitigation.**

Q1 was **formulated after M9**, and its purpose was motivated by an observability limitation that
M9 disclosed in its own protocol (M9 §4). Q1's *design* is therefore post-hoc relative to M9. Its
*measurement* is a-priori relative to its own evidence, because the pre-registration was frozen at
`0ad12fe` before any instrumentation existed and before any configuration seed was generated.

A second, later post-hoc element compounds this and is disclosed by D-007 §7: **the decision to
evaluate the existence claims separately from the distributional ones was taken after the
INCONCLUSIVE disposition was known.** The criteria were a-priori; the decision to act on that
partition was not. The scoping in D-006 §4 that authorised it was drafted by the same engineer who
later invoked it, and no independent party assessed it before ratification.

**Consequences that must travel with these results:**

- The analysis has **post-hoc, hypothesis-generating character**. It lacks the confirmatory power of
  a fully a-priori experiment and **must never be described as fully a-priori**.
- This does **not** turn the five existence claims into distributional estimates. E2/E4's refutation
  remains valid; E1/E3/E5's non-refutation remains weak.
- The interpretation remains limited by the pre-registered evidence insufficiency recorded in §1.

Two governance defects found along the way are recorded rather than buried: D-006 §4 wrongly stated
that *every* Q1 §9 statement was an existence claim (§9.5 is comparative), corrected by D-007 §3;
and the committed instrumentation recorded a superset of what Q1 §6 describes, resolved by D-009
Ruling 1. Both were the Chief Systems Engineer's own errors.

---

## 15. Evidence limitations

1. **Sample size.** 17 accepted configurations, below the pre-registered 20; both strata below the
   pre-registered 15. The realised acceptance yield was 17 accepted configurations from 500 seeds,
   against the 41-from-500 documented for M8 and used to size the range.
2. **Effective independence is lower than the configuration count suggests.** The 17 configurations
   came from **9 distinct configuration seeds**; configurations sharing a seed share that seed's
   edge-reliability draw and embeddings. Every non-refutation must be read against 9, not 17.
3. **One agent seed, one arm.** All of M7, M8, M9 and Q1 used agent seed `20260819000` and arm `A1`.
   Any idiosyncrasy of that seed is inherited by all four, with no independent check. Reuse buys
   comparability, not robustness.
4. **The TELEPORT class was realised by one mechanism only** (§5).
5. **E5 is partly structural** (§9).
6. **E4 is redundant with E2** (§8) — four distinct propositions were evaluated, not five.
7. **Q1 §9.5 was retired**, so the question of whether gap composition varies with AGE was not
   addressed and cannot be addressed under Q1 at any sample size.
8. **No successor study is authorised.** D-007 §8 and D-009 §10 forbid new sampling under Q1.

---

## 16. Final scientific interpretation

**The Q1 study result is INCONCLUSIVE — INSUFFICIENT MATERIAL** due to failing to meet
pre-registered minimum evidence thresholds for distributional analysis. Five pre-registered
existence claims were evaluated for refutation only.

**What was refuted.** The pre-registered statement that every DESYNC gap contains exactly one
transition (E2) does not survive: 85 counterexamples were observed in which a DESYNC gap contained
two or more position-changing transitions. E4 was refuted by the same 85 gaps and is logically
equivalent to E2 under D-009. This is the substantive finding of Q1, and it is a refutation — an
existence result — not a measurement of how often the phenomenon occurs.

**What was not refuted, and how weakly.** No counterexample was observed to E1, E3 or E5 in the 17
accepted configurations drawn from 9 distinct configuration seeds. E1 and E3 were tested against a
TELEPORT class composed exclusively of `goalReset` transitions. E5 is partly a structural
consequence of the `ORIGIN=ADVANCE` definition, and reduces to the narrower observation that no
ADVANCE gap contained two or more `advance` transitions. None of these three is proven, confirmed or
established.

**What Q1 contributes.** Q1 converted a question M9 could not address — M9's observable collapsed
`write→teleport→read`, `write→teleport→advance→read` and `write→advance→teleport→read` into a single
TELEPORT label — into a directly recorded ordered log, and demonstrated that the write→read gap's
transition sequence is observable losslessly, in order, and without perturbing the run. That
instrumentation result is independent of sample size and survives the INCONCLUSIVE disposition
intact.

**What Q1 does not contribute.** Any distributional characterisation, any causal statement, any
explanation of the M7 G15 outcome, and any confirmation of the three non-refuted claims.

**The single most useful thing a successor could do** is obtain sufficient independently sampled
material to characterise the distribution Q1 could not. That would require a new study under its own
pre-registration and its own Director decision. **None is authorised by this document.**

---

## 17. Reproducibility and integrity record

| | |
|---|---|
| Q1 pre-registration | `0ad12fe2f190645d2126c9e55aef4f270f853009`, digest validates |
| Collection | `d16d568` — 2,000 candidates, 17 collected, 1,983 rejected, accounting closed |
| Analysis | `057ceb0`, analysis version 1.0.0 |
| Governing decisions | D-006, D-007, D-008, D-009 |
| `transitions.jsonl` | `0aae29e8be31950e…` |
| `boundaries.jsonl` | `4cfef46f0719d101…` |
| Result artifact | `q1_claim_results.json`, digest recorded in its sidecar |

The analysis is deterministic: repeated execution reproduces the result **byte-identically**, and
the raw evidence digests revalidate after every run. It depends on no wall clock, no filesystem
metadata, no network, no randomness, no untracked input and no adaptive filtering. The ORIGIN rule
is **imported verbatim** from `experiments/m9/analyze.js` rather than restated.

The analysis gate carries 69 assertions, including sixteen mutation controls that corrupt records,
positions, ordering, boundaries, ORIGIN inputs, gap windows and the denominator. Because three
claims returned NOT REFUTED, a "drop a counterexample" control would have been vacuous; it was
replaced by liveness controls that inject a counterexample into the real evidence, require E1, E3
and E5 to flip to REFUTED, and require removal to flip them back. **A NOT REFUTED verdict therefore
means the detector ran and found nothing, not that the detector is inert.**

Regenerate and verify:

```
cd experiments/q1
node run_collection.js        # ~12 min; only if the raw streams are absent
node run_analysis.js
node verify_q1_analysis.js
```

---

**STATUS: Q1 CLOSED — INCONCLUSIVE — INSUFFICIENT MATERIAL.** No new sampling, no protocol
amendment, no statistical method, and no successor study is authorised by this document.
