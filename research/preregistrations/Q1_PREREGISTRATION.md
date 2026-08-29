# Q1 Pre-Registration — Ordered Composition of Position-Changing Transitions in DESYNC Gaps

**Version:** 1.0 (frozen)
**Date:** 2026-08-29
**Author:** Chief Systems Engineer
**Authority:** Research Director ruling of 2026-08-29, following independent scientific review of
the Q1 formulation (verdict **A — ready for pre-registration**), recorded as
[D-005](../09_decisions.md)
**Baseline:** git HEAD `9044c3b6f999bd4820dc49b5842adc2629005733`
**Predecessors:** M7 frozen at `707cb1e`; M8 evidence frozen at `f9d97b9`; M9 analysis at
`04dda03`, interpretation at `9044c3b`

> **THIS DOCUMENT IS FROZEN BEFORE ANY MEASUREMENT EXISTS.** No instrumentation is implemented,
> no Q1 collection has been executed, and no Q1 configuration seed has been generated or
> inspected. Its digest is recorded in `Q1_PREREGISTRATION.sha256`. Change arrives only as a
> numbered erratum that quotes this text and binds to its digest; the text is never rewritten.

> **Q1 REQUIRES A NEW COLLECTION.** The observable it depends on was never recorded, so the M8
> evidence cannot be re-analysed to answer it. Q1 therefore has its own evidence and its own
> denominator. The M9 figures quoted here are context, never Q1's population.

---

## 1. Scientific question

> **Within DESYNC gaps in the frozen M9 sense, what ordered sequence of position-changing
> transitions occurs, and how is that sequence distributed across gaps that M9 would classify
> TELEPORT versus ADVANCE?**

The word **proximate** is deliberately absent. §7 prohibits it and records why; §15 records
the scope limit that follows.

## 2. Primary phenomenon

```
DESYNC := lastReasoning.from !== agentCurrent
```

evaluated at `main.js:3819`. **This definition is inherited unchanged from M8 §2 and is not
redefined by Q1.**

## 3. Exact observation window

The window opens **immediately after** `main.js:2635` (the `lastReasoning` write, on tick *W*) and
closes **immediately before** `main.js:3819` (the read, on tick *R*). Because a fresh selection is
never desynchronized (M9 §3, fact G1), an eligible event always has *R* > *W*.

Membership is determined by the fixed in-tick ordering
`3163 / 3274 < 2635 < 3819 < 3922 < 4731 / 4917`:

| Tick | Site | In window? |
|---|---|---|
| *W* | `cap` (3163), `pool` (3274) | **No** — they precede the write, and the write already captured their result |
| *W* | `goalReset` (4731) **XOR** `advance` (4917) | **Yes** — they follow the evaluation |
| *W+1* … *R−1* | `cap` or `pool`, then `goalReset` **XOR** `advance` | **Yes** — the whole tick lies inside |
| *R* | `cap` (3163), `pool` (3274) | **Yes** — they precede the read |
| *R* | `goalReset` (4731), `advance` (4917) | **No** — they follow the read |

**Maximum transitions in a gap of age *k*: 2*k*.** At AGE = 1 that is **two**, not one: tick *W*'s
post-evaluation transition and tick *R*'s pre-read transition.

## 4. Closed transition taxonomy

| Site | Line | Guard | Position in tick |
|---|---|---|---|
| `cap` | `main.js:3163` | inside the M7 episode-cap block | pre-write |
| `pool` | `main.js:3274` | `if (!agentCurrent)` | pre-write |
| `goalReset` | `main.js:4731` | inside the goal-reached block | post-evaluation |
| `advance` | `main.js:4917` | `next !== null && !_goalResetJustHappened && _m7Traversed` | post-evaluation |

**This set is closed.** No site may be added after data exists.

**Excluded, with reason recorded rather than omitted:** the wipe assignment at `main.js:5209`
(`agentCurrent = null`) lies inside a keydown/click handler. The specified headless harness has no
user input, so the site is unreachable there. **It is excluded because it is unreachable in this
harness, not because it does not exist.** Should a future harness make it reachable, §5 halts the
study rather than silently ignoring it.

Two source-verified exclusivity facts constrain any gap:

- `goalReset` and `advance` are **mutually exclusive within a tick**: `_goalResetJustHappened`
  (`main.js:4862-4864`) is exactly the goal-reset condition, and `4917` requires its negation.
- `cap` and `pool` cannot both fire: `3274` is guarded on `!agentCurrent`, which `3163` falsifies.

A third fact governs interpretation: `advance` additionally requires `_m7Traversed`, so **on an
environment slip no position change occurs at all**. Q1 observes realised transitions only.

## 5. Completeness requirement — mandatory halting gate

Before any Q1 measurement is analysed, a **source-level verification gate** must establish that
**every reachable assignment to `agentCurrent` in the specified headless harness is represented by
exactly one of `cap`, `pool`, `goalReset`, `advance`**, at the pinned commit.

The gate must enumerate assignments from source, not from assumption, and must classify each as
instrumented or unreachable-with-cited-reason.

> **If an additional reachable assignment exists, the Q1 study HALTS.** It is not silently
> ignored, not folded into an existing category, and not accommodated by widening the taxonomy
> after the fact. The halt is reported with the site and its reachability argument.

This gate exists because the entire inference in §13 rests on the enumeration being complete: an
uninstrumented transition would leave a silent hole in every affected gap.

## 6. Raw observable — closed schema

One append-only record per executed position-changing transition inside the §3 window:

```
{ seq, tickIndex, site, fromPos, toPos }
```

| Field | Why it is present |
|---|---|
| `seq` | A monotonic counter. It makes ordering an **observation** rather than an inference from the source layout audited in §3, so the analysis remains valid even if that layout is later re-verified differently. |
| `tickIndex` | Locates each transition relative to the write tick and the read tick, which is what makes §3 window membership decidable per record. |
| `site` | Identifies the transition mechanism, drawn from the closed §4 taxonomy. |
| `fromPos`, `toPos` | Permit state reconstruction across the whole gap and make each record **self-validating**: a dropped record is detectable as a discontinuity rather than silently corrupting the chain. `fromPos` is formally redundant given the previous record's `toPos`; it is retained for that integrity property. |

**This schema is closed. No field may be added after data exists** — the M8 §8 discipline,
inherited deliberately.

**Deliberately excluded:** `lastReasoning.from`/`.to` per transition (constant within a gap and
already carried by the M8-style event tuple); explicit before/after-write and
before/after-evaluation flags (derivable from `site` and `tickIndex`); attempted-but-slipped
advances (a different observable answering a different question — see §15).

## 7. Derived observables

Computed offline from the §6 log:

| Name | Definition |
|---|---|
| `GAP_COMPOSITION` | the ordered multiset of `site` values in the gap |
| `FIRST_DIVERGING_TRANSITION` | the earliest transition in the gap — where `from !== agentCurrent` first became true |
| `LAST_TRANSITION_BEFORE_EVALUATION` | the final transition in the gap — determines the position the stale action executes from |
| `TRANSITION_COUNT` | the number of records in the gap |

> **None of these is a cause, and none may be named one.** The term **"proximate cause" is
> prohibited**, as is any causal attribution derived from temporal ordering alone.

Two source facts make this prohibition substantive rather than stylistic. First, DESYNC is a
**conjunction** — no fresh selection **and** a net position change — so no single transition can
carry causal responsibility for it. Second, with up to 2*k* transitions per gap the position may
oscillate, so the transition that *established* divergence and the transition that *determined the
executed position* are different transitions answering different questions. That is precisely why
`FIRST_DIVERGING_TRANSITION` and `LAST_TRANSITION_BEFORE_EVALUATION` are both recorded, and why
neither is privileged as "the" transition.

## 8. Relationship to M9

**Q1 does not reinterpret M9.** M9's results, protocol, analysis and interpretation stand
unchanged.

| | Question answered | Observable |
|---|---|---|
| **M9** | Did *at least one* teleport occur in the gap? | a boolean derived from a last-only, overwriting teleport counter |
| **Q1** | What transitions occurred, in what order? | the complete ordered log of §6 |

Q1 **decomposes an information gap that M9 itself identified and disclosed** (M9 §4: TELEPORT
means at least one teleport fell in the gap, not that it was the proximate cause; ADVANCE is
inferred by exclusion). Under M9's observable, the histories *write→teleport→read*,
*write→teleport→advance→read*, *write→advance→teleport→read* and
*write→teleport→advance→teleport→read* are indistinguishable — all four are classified TELEPORT.
The §6 log separates them.

Q1 also converts M9's ADVANCE from an inference by exclusion into a direct observation, removing
the evidential asymmetry M9 was obliged to disclose.

**For context only, never as Q1's population:** M9 reported TELEPORT 2,281 / 7,178 (31.78%) and
ADVANCE 4,897 / 7,178 (68.22%) on the M8 evidence. Q1 collects its own evidence and has its own
denominator.

## 9. Falsification

Each statement below can go either way on the data under the frozen definitions. None is
predetermined — the failure mode that made M8's own analysis layer degenerate.

| Statement | Falsified by |
|---|---|
| TELEPORT-classified gaps contain only teleports | any such gap containing an `advance` record |
| Every gap contains exactly one transition | any gap with `TRANSITION_COUNT` ≥ 2 |
| The last transition in a TELEPORT-classified gap is always the teleport | any such gap whose `LAST_TRANSITION_BEFORE_EVALUATION` is `advance` |
| `FIRST_DIVERGING_TRANSITION` always equals `LAST_TRANSITION_BEFORE_EVALUATION` | any gap where they differ |
| Gap composition is independent of AGE | composition distributions differing across AGE values |
| ADVANCE-classified gaps are single-transition | any such gap with `TRANSITION_COUNT` ≥ 2 |

**No threshold is introduced.** Each statement is falsified by the existence of a counterexample,
which requires no cut-point to evaluate.

## 10. Statistics

**Descriptive only:** counts, proportions, and transition-sequence frequencies.

**Prohibited, and not addable after data exists:** p-values, confidence intervals, hypothesis
tests, significance claims, predictive models, causal estimates, effect sizes, and any post-hoc
statistical addition. A statistical method may enter only through a numbered erratum frozen before
it is computed, carrying a fully specified null, statistic, threshold and decision rule.

## 11. Intervention-free requirements

Q1 instrumentation must:

- consume **no RNG** on any stream;
- mutate **no** agent, environment, DOM or persistence state — every capture is a pure read;
- introduce **no branch** into agent logic and substitute **no** existing line;
- leave **selection**, **teleport**, **advance** and **goal** logic untouched;
- be **guarded and default-off**, scoped `__MFW_*` and never `__M7_*`;
- be **bit-identical to baseline when disabled**;
- carry explicit **run-neutrality verification**: identical fingerprint and identical per-stream
  draw counts, instrumented versus not. A failed neutrality check **voids the run**.

The M8 instrumentation neutrality pattern is the engineering standard — it was proven run-neutral
at 42 passed / 0 failed with identical fingerprints and draw counts across OFF, hook-only and ON.
**No instrumentation is implemented by this document.**

Anti-vacuity, inherited from M7-ERR-10: every detecting assertion must fail against a mutation,
and **controls must bind the measurement's input, not only its predicate**.

## 12. Reproducibility

Deterministic instrumentation; digest-pinned artifacts; identical verdicts in the authoring tree,
a `git archive` materialization, and a fresh CRLF checkout.

**No dependence on** filesystem metadata, mtime, wall-clock time, network access, undeclared
seeds, or input ordering.

## 13. What the exclusion inference rests on

`ORIGIN = ADVANCE` in M9, and any Q1 statement that no teleport occurred in a gap, is an inference
by exclusion. It is sound **only if** §4's taxonomy is complete and §5's gate passes. This
dependency is recorded here so that a future reader can see the inference is conditional, and so
that §5's halt condition is understood as load-bearing rather than ceremonial.

## 14. Seed governance — NOT YET FROZEN

The Q1 configuration-seed range **must** satisfy every constraint below:

- **not** overlap `899500–899999` (M8, consumed);
- **not** overlap `900000–900029` (M7 pilot) or `900030–900499` (M7-ERR-09), both consumed;
- remain **strictly below** the held-out floor `900500`, which is never generated, inspected, or
  inferred;
- be contiguous, explicitly enumerated, and **frozen before any collection begins**.

The admissible space is therefore **below 899500**.

> **The exact bounds are NOT frozen by this document.** Sizing depends on the acceptance yield and
> on the number of DESYNC gaps required, which is a scientific judgement. Per the Director's
> instruction it is **recorded as an open decision rather than silently chosen**, and must be
> ratified as a numbered Director decision before the collection milestone begins.

**Sizing basis available to that decision, from documented figures only — no seed was generated to
produce it:** M8 accepted 41 configurations from 500 candidate seeds, a realised yield of 0.082
accepted configurations per seed, itself close to the 0.0872 M7 figure used to size M8. Any Q1
range should be sized from these documented yields with an explicit margin, and an under-yield
must be handled by a stopping rule rather than by extension.

**Also requiring the same ratification:** the agent seed, the arm, the tick budget, the minimum
evidence rule, and the stopping rule. None is frozen here.

## 15. Scope boundary — what Q1 cannot establish

1. **Causality.** Q1 records temporal ordering. Ordering is not causal responsibility, and §7
   prohibits the inference.
2. **Any behavioural consequence** of desynchronization — never measured, by design.
3. **Anything about the cause of the M7 G15 outcome.** No Q1 statistic may be compared with,
   correlated against, or selected to explain ρ, the G15 verdict, reward, eligibility, or
   trajectory calibration. M7 remains frozen at `707cb1e`.
4. **Anything about M7's validity.**
5. **Anything about the held-out seed block.**
6. **Attempted-but-slipped advances.** `main.js:4917` is guarded by `_m7Traversed`; a slip produces
   no transition and therefore no record. Q1 measures realised position changes only.
7. **Goal-context mismatch (H4)**, which remains untestable in the headless harness.

**Scientific success is not a positive result.** A finding that gaps are overwhelmingly
single-transition, that composition is uniform, that no falsifiable statement is overturned, or
that the study halts under §5, is a valid and complete Q1 outcome.

## 16. Post-hoc disclosure

**Stated without mitigation.**

Q1 was **motivated by an observability limitation that M9 identified and disclosed in its own
protocol** (M9 §4), and the formulation was written after the M9 results existed. It is not an
a-priori discovery and must not be presented as one.

Two properties limit the damage, and neither erases the disclosure. First, Q1 requires a **new
collection under a new pre-registration frozen before that collection**, so its measurement is
genuinely a-priori with respect to its own evidence — unlike M9, whose ORIGIN rule was formulated
after its data existed. Second, the question follows from a limitation the predecessor protocol
stated in advance, not from an inspection of predecessor results.

**Consequence for interpretation:** Q1's *design* is post-hoc relative to M9; Q1's *measurement*
is a-priori relative to its own evidence. Any downstream write-up must reproduce this distinction
rather than claiming either extreme.

## 17. Prohibitions

Q1 does **not**: modify, regenerate, re-collect, subset or re-derive any M7, M8 or M9 artifact;
modify production or runtime code beyond adding guarded, default-off, run-neutral instrumentation
under its own future authorisation; introduce any observable beyond the closed §6 schema; touch,
generate, inspect or infer anything about the held-out block `>= 900500`; or use the M7 G15
outcome as a target.

## 18. Integrity and freeze

This document follows the convention established for `M7_PREREGISTRATION.md`,
`M8_PREREGISTRATION.md` and `M9_PREREGISTRATION.md`: a SHA-256 sidecar over the exact bytes, a
`.gitattributes` `-text` entry so the digest survives checkout on every platform, and verification
by

```
cd research/preregistrations && sha256sum -c Q1_PREREGISTRATION.sha256
```

A digest mismatch means the pre-registration changed after freeze. That is a **protocol
deviation** and must be reported with its direction and likely effect — never silently reconciled.

---

## STATUS: PRE-REGISTRATION FROZEN · NO INSTRUMENTATION · NO MEASUREMENT

No instrumentation implemented. No collection executed. No configuration seed generated or
inspected. The seed range, agent seed, arm, tick budget, minimum evidence rule and stopping rule
remain **open Director decisions** (§14). The held-out block `>= 900500` is untouched. M7, M8 and
M9 artifacts are unchanged.
