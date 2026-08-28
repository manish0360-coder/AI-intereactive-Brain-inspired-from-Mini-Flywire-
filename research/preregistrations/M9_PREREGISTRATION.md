# M9 Pre-Registration — Temporal Origin of Decision/Position Desynchronization

**Version:** 1.0 (frozen)
**Date:** 2026-08-29
**Author:** Chief Systems Engineer
**Authority:** Research Director ruling of 2026-08-29 (M9 Governance Gate accepted), recorded as [D-004](../09_decisions.md)
**Baseline:** git HEAD `f9d97b9a180fa5a4aed6def06788eb4b38c037f0`
**Evidence:** the frozen M8 collection, unchanged, at the same commit

> **THIS DOCUMENT IS FROZEN BEFORE ANY ANALYSIS IS RUN.** No ORIGIN statistic, mechanism
> frequency, proportion, or correlation has been computed from the 7,178 DESYNC events. Its
> digest is recorded in `M9_PREREGISTRATION.sha256`. Change arrives only as a numbered erratum
> that quotes this text and binds to its digest; the text is never rewritten.

> **M9 IS A SECONDARY ANALYSIS OF AN EXISTING DATASET.** It performs no measurement, consumes no
> seed, and modifies nothing in M8 or M7. §16 discloses, without mitigation, the one respect in
> which it is post-hoc.

---

## 1. Scientific question

> **Of the desynchronization events in the frozen M8 evidence, what proportion arose from a
> teleport-class position reset falling within the write→read gap, versus from ordinary advance
> alone?**

Secondary, pre-registered here and reported alongside: **how is the age of a stale action
distributed, and does that distribution differ by origin?**

Descriptive appendix, pre-registered here and carrying no causal claim: **does origin co-occur
with a non-canonical executed transition, or with a self-pair?**

## 2. Primary phenomenon and denominator

```
DESYNC := lastReasoning.from !== agentCurrent        (M8 §2, unchanged)
```

**The denominator is fixed at 7,178 DESYNC events.** It is the single denominator used
everywhere in this analysis. No second denominator is introduced, no event is excluded, and no
sub-population is substituted. The count is a property of the frozen evidence; if a regenerated
dataset yields any other number, §14 halts the analysis.

## 3. Established facts carried forward

Source-established by the completed M8 audits. **These are findings, not design choices.**

| # | Fact | Locus |
|---|---|---|
| G1 | `DESYNC ⇒ ¬selectionRanThisTick`, proven by control flow: no `agentCurrent` assignment exists in lines 2636–3033 ∪ 3328–3818, there is no indirect mutation, and `runAgent` has no async boundary | `main.js` 2635, 3033, 3327, 3819; assignment set 3068/3163/3274/4731/4917/5209 |
| G2 | In-tick ordering: `3163`, `3274` precede the write at `2635`; `4731` and `4917` follow the evaluation at `3922` | `main.js` |
| G3 | `4731` and `4917` are mutually exclusive within a tick — `4917` is guarded by `!_goalResetJustHappened` | `main.js:4916` |
| G4 | `3274` is guarded by `if (!agentCurrent)`, so at most one pre-write teleport fires per tick | `main.js:3265` |
| G5 | `4917` is additionally guarded by `_m7Traversed`: on an environment slip there is **no** position change | `main.js:4916` |
| G6 | `agentCurrentChangedSinceLastWrite ≡ DESYNC` identically — both operands are `currentKey` captured at the same write | `instrument.js` `onWrite`; 118,179/118,179 |
| G7 | The position-changing sites are exactly `3163`, `3274`, `4731`, `4917`, `5209`; `5209` is a keydown handler, unreachable headless | `main.js` |
| G8 | M8 teleport probes sit at exactly `3163`, `3274`, `4731`. `4917` has no probe | `instrument.js` SITES |
| G9 | Both in-tick goal-write sites are gated on `window.homeNeuronId !== undefined`, which is never defined in the headless harness | `main.js` 3300, 4175, 792, 5387 |
| G10 | `ticksSinceTeleport` and `teleportSource` describe the **most recent** teleport only | `instrument.js` `onTeleport` |

## 4. ORIGIN — frozen definition

**Director decision.** ORIGIN partitions each eligible event on a single well-defined temporal
fact: when the most recent teleport occurred relative to the write.

```
ORIGIN = TELEPORT   if  ticksSinceTeleport <  ticksSinceWrite
                    or (ticksSinceTeleport == ticksSinceWrite
                        AND teleportSource == 'goalReset')

ORIGIN = ADVANCE    if  ticksSinceTeleport >  ticksSinceWrite
                    or (ticksSinceTeleport == ticksSinceWrite
                        AND teleportSource ∈ {'cap', 'pool'})
```

**Equality-case handling (Director decision).** When the counters are equal the teleport and the
write fell on the same tick, and `teleportSource` resolves the in-tick order by G2: `cap` and
`pool` execute *before* the write, so the write already captured the post-teleport position and
that teleport cannot be the cause — the event is ADVANCE. `goalReset` executes *after* the
evaluation, so it is post-write — the event is TELEPORT.

**Null handling (Director decision).** If `ticksSinceTeleport` is `null` (no teleport had yet
occurred) or `ticksSinceWrite` is `null`, ORIGIN is recorded as **UNCLASSIFIED**, counted and
reported separately, and excluded from every ORIGIN proportion. It is never silently assigned to
either category and never dropped. G7 and the `3274` cold-start guard make this case unreachable
in practice; the rule exists so that a nonzero count is visible rather than absorbed.

**Two limitations, stated as part of the definition and not as a caveat elsewhere.**

1. **TELEPORT means "at least one teleport fell in the gap", not "the teleport was the sole or
   proximate cause."** An ordinary advance may also have occurred inside the same gap.
2. **ADVANCE is never directly observed.** It is inferred by exclusion, and is sound only because
   G7 enumerates the position-changing sites completely and G8 instruments every teleport. It is
   therefore the *stronger* of the two claims: ADVANCE proves no teleport occurred since the
   write, so `4917` is the only possible cause.

The two categories are **not evidentially symmetric**, and no report may present them as though
they were.

## 5. AGE — duration, not mechanism

```
AGE := ticksSinceWrite
```

AGE is reported as a distribution over the eligible population and stratified by ORIGIN. **AGE is
never treated as a causal mechanism.** M8's H3 made exactly that error, and the demotion is
deliberate: duration measures how long a stale action persisted, not what made it stale.

The observed range is bounded above by the frozen 150-tick episode cap, so the upper tail is a
property of the design, not of the agent, and must be reported as such.

## 6. Replay — a constant precondition

`selectionRanThisTick` is **constant `false`** on every eligible event, by G1. It is reported as
that constant, with its count, so a reader sees it is a precondition of the phenomenon rather
than a competing explanation. **It is never used as a mechanism, a flag, or a covariate.**

## 7. H4 — harness-unreachable

`goalIdAtSelection !== goalIdAtEvaluation` is **structurally unreachable** in the M8 headless
harness by G9. M9 reports it as **untestable under this harness**, which is a different statement
from "the mechanism is absent" and must never be shortened to the latter.

## 8. Consequence and signature variables

- **NON_CANONICAL** — `{agentCurrent, next}` is not an unordered pair in `connections.json`.
  A **consequence** of the executed transition. Reported descriptively; never a cause, never used
  to define, select, weight, or classify an event.
- **S_PAIR** — `agentCurrent === next`. An **observable signature**, never an independent
  hypothesis. `connections.json` contains no self-loop, so S_PAIR implies NON_CANONICAL.

## 9. Stratifiers

`phase` (1 or 2, per event) · `goal` (8, 12, 16, 19) · goal-degree stratum (degree-5 = {8, 12};
degree-3 = {16, 19}). Topology is a stratifier, never a hypothesis. Every primary result is
reported pooled **and** per stratum.

## 10. Unobserved-cell policy

**Director decision.** The reporting grid is ORIGIN × AGE × stratum, plus the comparison ×
`teleportSource` cells. **No cell is excluded, merged, or collapsed**, however small.

A cell with zero events is reported as **NOT OBSERVED**. It may be called **UNREACHABLE** only
where a source-level proof is cited. The distinction is mandatory: M8's H4 failure was precisely
the conflation of "did not occur" with "cannot occur."

## 11. Statistical reporting policy

**Director decision.** M9 is **descriptive**. It reports counts and proportions against the fixed
denominator of §2, pooled and stratified.

**No statistical test is pre-registered.** No null hypothesis, test statistic, significance
threshold, confidence interval, effect-size estimate, or model is defined, and **none may be
introduced after the data is seen**. A test may enter only through a numbered erratum frozen
before it is computed, carrying a fully specified null, statistic, threshold and decision rule.

## 12. Multiple-comparison policy

**Director decision.** Because §11 pre-registers no inferential test, no multiplicity correction
applies. The complete reporting grid of §10 is emitted in full **on every run**, so no comparison
is selected after inspection. Selective reporting of a subset of cells is a protocol violation.

## 13. Minimum evidence rule

**Director decision.** The analysis is evaluable if and only if:

- the regenerated dataset reproduces **exactly 7,178** DESYNC events, and
- ORIGIN is classifiable for every eligible event, i.e. `UNCLASSIFIED` = 0, and
- **both** ORIGIN categories are non-empty.

If any condition fails, the outcome is **NOT EVALUABLE**, reported with the failing condition
named. **No re-collection, no range extension, and no substitute denominator is permitted** — M8
§13 governs, and its stopping rule is inherited unchanged.

## 14. Falsification rules

**Director decision.** Every primary statement below is falsifiable by a data pattern that is
possible under the frozen definitions.

| Statement | Falsified by |
|---|---|
| Both origins contribute | either ORIGIN category empty |
| Origin is associated with age | identical AGE distributions across ORIGIN |
| Origin varies by topology | identical ORIGIN split across degree-5 and degree-3 |
| Origin varies by phase | identical ORIGIN split across phase 1 and phase 2 |
| Origin co-occurs with non-canonical execution | no difference in NON_CANONICAL between origins |
| The analysis is evaluable at all | any §13 condition fails |

**Rejected as predetermined, and excluded from M9 by construction:** any use of
`selectionRanThisTick` as a mechanism (constant, G1); any use of
`agentCurrentChangedSinceLastWrite` as a mechanism (identically DESYNC, G6); any sole-attribution
layer; any composite rule; H4 in any testable form (G9).

## 15. Reproducibility

The analysis consumes only: this document, the frozen M8 pre-registration, the committed M8 code
and artifacts, and the regenerated raw event stream.

```
cd experiments/m8
node run_collection.js          # regenerate events.jsonl
node verify_m8_collection.js    # digest match + accounting closure
# then, and only then, the M9 analysis
```

The regenerated `events.jsonl` **must** match the digest in `experiments/m8/data/INTEGRITY.sha256`
before any M9 statistic is computed. No M9 gate may depend on filesystem metadata, wall-clock
time, or any untracked input. Verdicts must be identical in the authoring tree, a `git archive`
materialization, and a fresh CRLF clone.

## 16. Post-hoc disclosure

**Stated without mitigation, because it is the one respect in which M9 is weaker than a genuinely
a-priori analysis.**

The ORIGIN rule of §4 was **formulated after the M8 collection existed**. Its inputs
(`ticksSinceWrite`, `ticksSinceTeleport`, `teleportSource`) are frozen M8 §8 observables, and the
in-tick ordering it relies on (G2) is source-established and predates collection. The rule was
derived from control flow, not selected by which answer it produces.

Nevertheless, **it was retained knowing that both ORIGIN categories are populated.** That fact was
observed during the M8 analysis re-design audit and cannot be un-observed. It is the irreducible
post-hoc residue of this analysis.

**Consequence for interpretation:** M9's conclusions carry less evidential weight than a result
from a rule frozen before collection. Any downstream write-up must reproduce this disclosure. A
genuinely a-priori test of ORIGIN would require a new experiment, which M9 neither performs nor
authorises.

## 17. Prohibitions

M9 does **not**:

- modify, regenerate, re-collect, subset, or re-derive any M8 artifact — the evidence, seeds,
  manifest, integrity record and collection code remain byte-identical (M8 §19);
- modify M7 in any respect;
- introduce any observable beyond the frozen M8 §8 tuple;
- consume, inspect, generate, or infer anything about any configuration seed, and never touches
  the held-out block `>= 900500`;
- use the M7 G15 outcome as a target. **No M9 statistic may be compared with, correlated against,
  or selected to explain ρ, the G15 verdict, reward, eligibility, or trajectory calibration.**
  Whether M8 bears on M7 is not an M9 question and no M9 result is authorised to reinterpret M7,
  which remains frozen at `707cb1e5205a7e9979f81092ee1ebfa0fe28922e`.

**Scientific success is not a positive result.** A finding that one origin dominates, that neither
does, that origin is unrelated to age or topology, or that the analysis is NOT EVALUABLE, is a
valid and complete M9 outcome.

## 18. Integrity and freeze

This document follows the convention established for `M7_PREREGISTRATION.md` and
`M8_PREREGISTRATION.md`: a SHA-256 sidecar over the exact bytes, a `.gitattributes` `-text` entry
so the digest survives checkout on every platform, and verification by

```
cd research/preregistrations && sha256sum -c M9_PREREGISTRATION.sha256
```

A digest mismatch means the pre-registration changed after freeze. That is a **protocol
deviation** and must be reported with its direction and likely effect — never silently reconciled.

---

## STATUS: PRE-REGISTRATION FROZEN · NO ANALYSIS EXECUTED

No ORIGIN statistic, mechanism frequency, proportion, or correlation computed. No analysis code
implemented. No seed generated or inspected. The held-out block `>= 900500` is untouched. M8
evidence and M7 are unchanged.
