# M8 Pre-Registration — Decision/Position Desynchronization

**Version:** 1.0 (frozen)
**Date:** 2026-08-28
**Author:** Chief Systems Engineer
**Authority:** Research Director decisions A–H of 2026-08-28, recorded as [D-003](../09_decisions.md)
**Baseline:** git HEAD `b167e7e6e1a466bb737b81791efdb70d22b8039e`
**Predecessor:** M7, frozen and closed at `707cb1e5205a7e9979f81092ee1ebfa0fe28922e`

> **THIS DOCUMENT IS FROZEN BEFORE ANY MEASUREMENT EXISTS.** No instrumentation has been
> implemented, no M8 run has been executed, and no configuration seed has been generated or
> inspected. Its digest is recorded in `M8_PREREGISTRATION.sha256`. Any subsequent change
> arrives as a numbered erratum; the text is quoted, never rewritten.

---

## 1. Scientific question

> **Under what mechanism does the action stored in `lastReasoning` become desynchronized from
> the agent's state at the moment it is executed and evaluated, and what is the relative
> contribution of each mechanism?**

---

## 2. Primary phenomenon

**Decision/position desynchronization.**

```
DESYNC := lastReasoning.from !== agentCurrent
```

evaluated at the authoritative read point, `main.js:3819` (`next = window.lastReasoning.to`).

Non-canonicality is **not** the primary phenomenon. It is a secondary derived label (§9),
because it is a lossy, topology-dependent consequence of desynchronization (§3, fact F3).

---

## 3. Established evidence carried forward

Source-established facts from the completed M8 pre-flight audits. **These are findings, not
design choices.** They are carried forward without reopening.

| # | Established fact | Locus |
|---|---|---|
| F1 | `userData.neighbors` is **exclusively canonical**: one creation (`main.js:594`), one whole-object replacement before the connections load (`main.js:588`), two pushes (`render/connections.js:120/125`) reachable only from `main.js:641` iterating `connections.json`. Zero post-initialization mutations. Zero alias escapes — every consumer iterates, tests, or copies. | audit |
| F2 | **Action-selection closure.** `nextKey` is assigned only at `main.js:2583/2594/2603`, always from `topChoices`/`exploreChoice`, both built solely from `startNeuron.userData.neighbors`. `window.lastReasoning` has exactly one writer (`main.js:2635`), guarded by `step === 0`. `next` has exactly one non-null producer (`main.js:3819`). | audit |
| F3 | **`non-canonical → DESYNC` is proven; the converse is false.** 88 of 190 distinct node pairs (46%) share at least one common neighbour, so a stale action can land on a canonical edge. | audit |
| F4 | The canonical-edge relation is **undirected** (`experiments/m7/env.js:54`, `KEY` sorts its operands). Direction is not a cause. | audit |
| F5 | `connections.json` contains **0 self-loops** across 39 entries, so a self-pair `(x, x)` is never canonical. | audit |
| F6 | Selection is gated by `if (liveRng() < 0.92)` at `main.js:3325` — approximately 8% of ticks perform no fresh selection. | audit |
| F7 | **No asynchronous boundary exists inside `runAgent`** (`main.js:3119`–`4960`). `runAgentLoop` executes 5 ticks synchronously per frame, then `setTimeout`. | audit |
| F8 | `goalNeuronId` has a single module-scope declaration (`main.js:1017`) and **no shadowing**. Live assignments: `795` (guarded), `1114`, `3305` (pre-selection), `4179` (**post-evaluation**), `5211`, `5358`. `main.js:3284` is dead code inside a comment block. | audit |
| F9 | `lastReasoning` is **never cleared** — one writer, zero clears — and stores `{from, to}` only, carrying **no goal context**. | audit |
| F10 | Position reassignment sites `main.js:3163`, `3274`, `4731` all draw from seeded `liveRng()` and exclude the goal node. `3163` and `4731` also set `agentLast`; `3274` does not. | audit |
| F11 | The `undefined` goal route is **refuted** by a double guard at `main.js:794` and `goalNeuronId ?? null` in `saveBrain`. The `null` route is narrow and closed under the `__M7_GOAL__` seam at `main.js:1114`. | audit |
| F12 | Node identifiers are uniformly `number` in `connections.json` and `neurons.json`. `main.js:3922` uses strict `===`; `main.js:4864` uses `Number()` coercion for the same conceptual predicate. | audit |
| F13 | Goal degrees in the frozen topology: goal 8 → 5, goal 12 → 5, goal 16 → 3, goal 19 → 3. | audit |
| F14 | `env.attempt()` returns `true` unconditionally when the pair is not a graph edge — non-canonical transitions consume no `environment` RNG and cannot slip. | `env.js` |

**Motivating observation, not evidence.** M7's `verify_G15.js` assertion C3 reported
`13663 of 26143` goal-reach events with no canonical edge into the goal. C3 is an *inclusion*
proof — its purpose was to show no exclusion had been applied. That count is the motive to
investigate. **It is not evidence for H1–H5 and is not used as such anywhere in this document.**

---

## 4. Explicit non-goals

M8 does **not**:

- rescue, reinterpret, or recompute the M7 G15 result;
- modify any M7 artifact, instrument, verifier, threshold, seed range, or frozen criterion;
- claim that desynchronization caused the G15 failure;
- test whether the phenomenon should be repaired.

The M7 result stands as recorded at `ae45f20`: `VERIFIER SELF-CHECK: GREEN`,
`INFORMATION SUFFICIENCY: SATISFIED`, `GATE G15: FAIL`. **No M8 result is authorized to
retroactively reinterpret it.**

---

## 5. Hypotheses

| H | Mechanism |
|---|---|
| **H1** | **Position-transition desynchronization.** `agentCurrent` changes after action selection — teleport, reset, pool re-seed, or goal-related state transition — leaving `lastReasoning.from` stale relative to the current position. |
| **H2** | **Replay / selection bypass.** A previously selected action is reused because fresh selection did not run on this tick. |
| **H3** | **Multi-tick action staleness.** `lastReasoning` persists across two or more ticks before execution and evaluation. |
| **H4** | **Goal-context mismatch.** Goal identity at evaluation differs from goal identity at the time the stored action was selected. |
| **H5** | **Composite.** Multiple mechanisms materially contribute, per the decision rule in §11. |

**H4 merges two previously separate concepts.** The earlier goal-switch / cross-episode
staleness concept and the surviving changed-goal branch of the retired H7 are one mechanism
class: they share a single source cause — `goalNeuronId` is reassignable after selection
(F8: `4179` post-evaluation, `5358` between frames) while `lastReasoning` carries no goal
context (F9) — and no observable could separate them.

**"Null goal" is not carried forward as a hypothesis** (F11). It is handled as an exclusion
condition in §14.

---

## 6. Stratification

Topology is a **stratifier**, not a causal hypothesis. Goal degree is a property of the frozen
environment, controlled for rather than tested.

| Stratum | Goals | Degree |
|---|---|---|
| **Degree 5** | 8, 12 | 5 |
| **Degree 3** | 16, 19 | 3 |

Derived from F13. All primary results are reported both pooled and per stratum.

---

## 7. S-PAIR

```
S_PAIR := agentCurrent === next
```

**S-PAIR is an observable signature associated with replay / selection bypass (H2). It is not
a hypothesis, and it is not an independent mechanism.** It is guaranteed non-canonical by F5.

**Naming note:** the label `N1` is deliberately not used. `experiments/m7/verify_G15.js`
already uses `N1`/`N2` for its instrumentation-neutrality assertions, and reuse would be
ambiguous.

---

## 8. Closed observable tuple

Fourteen raw fields. **This set is closed. No field may be added after any data is seen.**

| # | Field | Capture point |
|---|---|---|
| 1 | `lastReasoning.from` | `main.js:3819` |
| 2 | `agentCurrent` | `main.js:3819` |
| 3 | `next` | `main.js:3819` |
| 4 | `ticksSinceWrite` | counter maintained from `main.js:2635` |
| 5 | `selectionRanThisTick` | outcome of the `main.js:3325` branch |
| 6 | `ticksSinceTeleport` | counter maintained from `main.js:3163/3274/4731` |
| 7 | `teleportSource` | `{cap, pool, goalReset, none}` |
| 8 | `goalIdAtSelection` | pure read of `goalNeuronId` at `main.js:2635` |
| 9 | `goalIdAtEvaluation` | pure read of `goalNeuronId` at `main.js:3922` |
| 10 | `agentCurrentChangedSinceLastWrite` | boolean; the H1/H2 discriminator |
| 11 | `tickIndex` | run position |
| 12 | `phase` | 1 or 2 |
| 13 | `configSeed` | configuration identity |
| 14 | `goalNode` | configuration goal, for stratification |

Fields 1–3 are recorded **raw**, never pre-reduced, so every classification in §10 is
reconstructible offline without re-running. Fields 4, 6 and 10 require bookkeeping counters;
producing them is a future instrumentation milestone (§15) and is **not implemented by this
document**.

---

## 9. Derived predicates

Computed offline from the raw tuple. None requires a call into any M7 artifact.

```
DESYNC          := lastReasoning.from !== agentCurrent
NO_FRESH_SEL    := selectionRanThisTick === false
STALE_AGE       := ticksSinceWrite
TELEPORT_IN_GAP := ticksSinceTeleport <= ticksSinceWrite
GOAL_MISMATCH   := goalIdAtSelection !== goalIdAtEvaluation      (strict identity)
S_PAIR          := agentCurrent === next
NON_CANONICAL   := { agentCurrent, next } is not an unordered pair in connections.json
```

**`GOAL_MISMATCH` uses strict identity** (Director decision E). `Number()` coercion is **not**
substituted into the primary M8 definition, notwithstanding F12's observation that `main.js`
uses both semantics internally. Raw numeric values are preserved in fields 8 and 9 so any
alternative comparison can be evaluated offline without re-running.

**`NON_CANONICAL` remains a secondary derived label**, computed from `connections.json`
membership only. It is reported as a descriptive statistic and is never used to define,
select, weight, or classify a DESYNC event.

---

## 10. Classification

Each eligible DESYNC event (§14) receives a **mechanism flag vector**. Flags are evaluated
independently and are **not mutually exclusive**.

```
F_H1 := DESYNC and TELEPORT_IN_GAP and agentCurrentChangedSinceLastWrite
F_H2 := NO_FRESH_SEL
F_H3 := STALE_AGE >= 2
F_H4 := GOAL_MISMATCH
```

**Reporting requirement.** The **complete joint distribution over all 16 flag combinations**
is reported. H1 and H2 provably co-occur — a teleport at tick *N* followed by a no-selection
tick at *N+1* sets both — and the design records that state as itself rather than forcing an
attribution.

**Sole attribution, defined precisely.**

```
SOLE(k)  := count of eligible events where F_Hk is true and F_Hj is false for all j != k
MULTI    := count of eligible events where two or more flags are true
ZERO     := count of eligible events where no flag is true
D        := SOLE(H1) + SOLE(H2) + SOLE(H3) + SOLE(H4)
```

`MULTI` and `ZERO` are reported explicitly alongside every share. A large `ZERO` count would
indicate the mechanism space is incomplete and must be reported as such.

---

## 11. H5 composite decision rule

**Frozen Director decision A. This is a pre-data design choice, not a mechanically derived
threshold.**

Two distinct denominators are used, and they are not interchangeable:

```
SOLE_SHARE(k) := SOLE(k) / D                        denominator D = sole-attributed events
MARGINAL(k)   := |{ eligible : F_Hk }| / |eligible|  denominator = all eligible DESYNC events
```

`SOLE_SHARE` sums to exactly 1 across the four mechanisms. `MARGINAL` does not sum to 1,
because an event may set several flags.

> **H5 is ACCEPTED if and only if:**
> **(i)** `SOLE_SHARE(k) <= 0.70` for every k in {H1, H2, H3, H4}, **and**
> **(ii)** `SOLE_SHARE(k) >= 0.10` for at least three distinct k.

**Treatment of events outside the denominator.** Events in `MULTI` and `ZERO` are excluded
from `D` and therefore from the H5 test, but are **counted and reported**. If `D = 0` the rule
is undefined and the outcome is recorded as **H5 NOT EVALUABLE**, never as accepted or
rejected. Whenever `D < |eligible| / 2`, the H5 verdict must be reported together with the
explicit caveat that a majority of events carried overlapping or no attribution.

---

## 12. Information sufficiency

**Frozen Director decision B.** Pre-data design choices.

| Requirement | Minimum |
|---|---|
| Total DESYNC events | **100** |
| Distinct configurations | **20** |
| DESYNC events in the degree-5 stratum (goals 8, 12) | **15** |
| DESYNC events in the degree-3 stratum (goals 16, 19) | **15** |

If a per-stratum minimum is unmet at the pre-registered stopping point, every conclusion that
depends on that stratum is reported as **STRATUM-LIMITED**. Pooled conclusions remain valid if
the pooled minima are met.

---

## 13. Stopping rule

Measurement stops at the pre-registered configuration count (§14). **No adaptive extension.**

If information sufficiency (§12) is unmet at that point, the outcome is
**INCONCLUSIVE — INSUFFICIENT MATERIAL**. Additional measurement then requires a future
Director decision or a numbered erratum. **Silent extension is a protocol violation.**

The study also halts immediately on: a run-neutrality failure (§15), a determinism failure, or
any access to the held-out block.

---

## 14. Seed policy, run parameters, and exclusions

### 14.1 Configuration seeds

**Frozen Director decision H.**

```
M8 configuration-seed range : 899500 - 899999 inclusive
Seed count                  : 500
Candidate configurations    : 500 seeds x 4 frozen goals = 2000
```

Constraint satisfaction:

- Does **not** overlap `900000–900029` (M7 pilot, consumed).
- Does **not** overlap `900030–900499` (ERR-09 gate-diagnostic range, consumed).
- Strictly below `900500`, therefore **does not touch, generate, inspect, or permit any
  inference about the held-out block `>= 900500`**.
- Contiguous, and terminates immediately below the lowest consumed seed.

**Sizing basis, from documented M7 figures only — no seed was generated to determine it.**
M7 accepted 41 configurations from 470 candidate seeds, a documented yield of 0.0872 accepted
configurations per seed. Twenty accepted configurations therefore require approximately 229
seeds; a factor-of-two margin against a lower yield gives approximately 460. Five hundred is
the nearest clean boundary above that figure. **Acceptance is not evaluated at
pre-registration time**; if the realised yield falls short of §12, the stopping rule in §13
governs and the outcome is INCONCLUSIVE.

### 14.2 Run parameters

**Frozen Director decisions C and D.**

| Parameter | Value | Basis |
|---|---|---|
| Ticks per configuration | **3000** | controlled comparability with the M7 scale; a design decision, not result-driven |
| Agent seed | **20260819000** | intentional reuse for controlled comparability |
| Arm | **A1** | intentional reuse for controlled comparability |

Reuse of the agent seed and arm is a **parameter choice for comparability**. It does not reuse,
import, or recompute any M7 measurement data.

### 14.3 Invalid / excluded events

**Frozen Director decision F.**

```
INVALID_GOAL := goalIdAtEvaluation is null at main.js:3922
```

An event meeting this condition cannot be meaningfully evaluated, because goal identity is
absent at the authoritative evaluation point. Such events are:

- **counted**,
- **reported separately** as an explicit `INVALID_GOAL` total,
- **excluded** from `eligible` and therefore from §10, §11 and §12,
- **never** reclassified as H1–H5, and **never** silently dropped.

```
eligible := DESYNC events that are not INVALID_GOAL
```

No new hypothesis is created for this condition. F11 establishes that the route is narrow and
closed under the `__M7_GOAL__` seam; the exclusion exists so that a nonzero count is visible
rather than absorbed.

---

## 15. Instrumentation requirements

**Documentation only. No instrumentation is implemented by this milestone.**

Future M8 instrumentation must:

- use **non-invasive capture** — the ESM source-transform loader technique already demonstrated
  by `experiments/m7/verify_G15.js` (in-memory splice after a source anchor, no disk write);
- **consume no RNG** on any stream;
- **mutate no runtime state** — every capture is a pure read;
- be **guarded and default-off**, scoped `__MFW_*` and never `__M7_*`;
- be **bit-identical when disabled**;
- carry **explicit run-neutrality verification**: identical fingerprint and identical
  per-stream draw counts, instrumented versus not, following the `verify_G15` N1/N2 pattern.
  A failed neutrality check **voids the run**;
- carry **anti-vacuity controls that bind the measurement's input**, not only its predicate.

The last requirement is the explicit lesson of M7-ERR-10: G16.4b's controls exercised only its
comparison predicate on literal lists, so a measurement with no stable referent passed
undetected. **No M8 assertion may rely on controls that cannot fail when the measured input is
wrong.**

---

## 16. Reproducibility requirements

No M8 measurement, gate, or verdict may depend on filesystem metadata, wall-clock time, or any
state git does not carry.

Reproducibility verification must yield an identical verdict in:

- the authoring working tree,
- a `git archive` materialization,
- a fresh clone with CRLF checkout.

---

## 17. Falsification and materiality

**Frozen Director decision G.**

M8 is **descriptive and mechanistic**. No statistical test is pre-registered. No null
hypothesis, test statistic, significance threshold, or adaptive testing procedure is defined,
and none may be introduced after data is seen.

**Materiality threshold.** A mechanism H1–H4 remains a viable dominant explanation only if

```
MARGINAL(k) >= 0.10
```

over eligible DESYNC events. A mechanism below this threshold is **explicitly reported as
below the minimum materiality threshold**.

| Claim | Refuted if |
|---|---|
| **H1 viable** | `MARGINAL(H1) < 0.10` |
| **H2 viable** | `MARGINAL(H2) < 0.10` |
| **H3 viable** | `MARGINAL(H3) < 0.10` |
| **H4 viable** | `MARGINAL(H4) < 0.10` |
| **H5 composite** | either clause of §11 fails |
| **Primary phenomenon** | `DESYNC` is false for every recorded event — the phenomenon does not exist as formulated, and M8 terminates with that finding |

---

## 18. Anti-contamination boundary

M8 is a **new successor investigation motivated by an observed anomaly**, not an explanation of
a failed gate.

- The `13663/26143` count is a by-product of an inclusion proof (§3) and is **not evidence for
  any hypothesis** in this document.
- The M8 question is answerable and falsifiable with **no reference to ρ, eligibility, reward,
  or any G15 quantity**. None appears in the observable tuple (§8).
- **Full epistemic disclosure.** The audits underpinning §3 were performed after the G15 FAIL
  was known. H1–H4 were derived from control-flow tracing — `main.js:3325`, `4179`, `2635`,
  `3163/3274/4731` — not from the outcome. Two audit findings contradicted convenient
  narratives: the proposed equivalence between non-canonicality and desynchronization was
  **falsified** (F3), and an independent reviewer's "corrupted world model" framing was
  **refuted** (F1, F2).
- The shift from non-canonicality to desynchronization is **measurement refinement forced by
  source evidence**, not post-hoc hypothesis fitting.

**Scientific success is not a positive hypothesis result.** A finding that no mechanism is
material, that the composite rule is not satisfied, that the result is stratum-limited, or that
the phenomenon is rare, is a **valid and complete M8 outcome**.

---

## 19. Integrity and freeze

This document follows the integrity convention established for
`research/cognitive-audit/M7_PREREGISTRATION.md`:

- a SHA-256 sidecar, `M8_PREREGISTRATION.sha256`, recording the digest over the exact bytes;
- a `.gitattributes` entry pinning this file and its sidecar to `-text`, so the digest survives
  checkout on every platform;
- verification by `cd research/preregistrations && sha256sum -c M8_PREREGISTRATION.sha256`.

A digest mismatch means the pre-registration changed after freeze. That is a **protocol
deviation** and must be reported with its direction and likely effect — never silently
reconciled.

Changes arrive only as numbered errata that quote this text and bind twice to its digest. This
text is never rewritten.

---

## STATUS: PRE-REGISTRATION FROZEN · NO MEASUREMENT EXISTS

No instrumentation implemented. No experiment executed. No configuration seed generated or
inspected. The held-out block `>= 900500` is untouched. M7 is unmodified.
