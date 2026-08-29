# Decisions

Project decision log. One entry per ruling. Newest first.

Entries record **decisions and their scope**. They are not specifications, do not
supersede any frozen artifact, and carry no executable effect.

---

## D-006 — Q1 collection parameters: ratified and frozen

**Date:** 2026-08-29 · **Authority:** Director ruling of 2026-08-29, following the read-only D-006
collection-parameter design audit · **Status:** in force
**Scope:** the Q1 collection only. This is a governance decision. No instrumentation exists, no
candidate was enumerated, no seed was generated or inspected, no configuration was run, and no Q1
outcome has been observed. M7 frozen at `707cb1e`, M8 evidence at `f9d97b9`, M9 at
`04dda03`/`9044c3b`, Q1 pre-registration at `0ad12fe` — all unchanged.

### 1. Decision

Q1 [§14](preregistrations/Q1_PREREGISTRATION.md) left six collection parameters explicitly open and
required them to be ratified as a numbered Director decision **before the collection milestone
begins**. This entry ratifies all six. They are frozen; a change arrives only as a superseding
numbered decision, never by adjustment during collection.

| | Parameter | Ratified value | Basis |
|---|---|---|---|
| **A** | Configuration-seed range | **899000-899499** inclusive — 500 configuration seeds, four frozen goal indices per seed, **2000 candidate configurations** | admissible space **mechanically constrained**; size **judgment**, informed by documented yield |
| **B** | Agent seed | **20260819000** | **judgment**, with strong evidential support |
| **C** | Arm | **A1** | **judgment**, with strong evidential support |
| **D** | Tick budget | **3000 ticks** per accepted configuration | **mechanically constrained** via phase balance, reinforced by precedent |
| **E** | Minimum evidence | **100** DESYNC events pooled · **20** accepted configurations · **15** accepted configurations per goal-degree stratum | **Director judgment** — see §4 |
| **F** | Stopping rule | Fixed range, full enumeration, **no extension**, no adaptation | **mechanically constrained** by Q1 §14, precedent M8 §13 |

### 2. Exact seed boundaries

| Block | Range | Status |
|---|---|---|
| **Q1 (this decision)** | **899000-899499** | ratified for consumption |
| M8 | 899500-899999 | consumed (D-003 H) |
| M7 pilot | 900000-900029 | consumed (M7 frozen §5.1) |
| M7-ERR-09 gate diagnostic | 900030-900499 | consumed |
| **Held-out** | **>= 900500** | never generated, inspected, or inferred |

The Q1 range is contiguous, lies strictly below 899500, and is **disjoint from every consumed block
and from the held-out floor**. Disjointness is arithmetic on the boundaries above, not an empirical
finding: 899499 < 899500 <= every consumed and held-out seed.

The agent seed `20260819000` is **not** a configuration seed. Configuration seeds are six-digit
values in the blocks above; the agent seed inhabits a separate namespace, and a numeric comparison
across the two is a category error — the error corrected during M8 verification, recorded here so it
is not repeated.

### 3. Basis classification — what is constrained, what is evidence, what is judgment

The audit classified each parameter as exactly one of: **mechanically constrained** by already-frozen
protocol or source; **evidence-supported** by prior committed experimental results; or **Director
judgment**. That distinction is recorded so downstream write-ups do not present a judgment as a
derivation.

**Mechanically constrained.**

- The admissible seed *space* — below 899500, disjoint, contiguous, enumerated — per Q1 §14.
- The **tick budget of 3000**. This is the least obvious item in the audit. `T_SHIFT = 1500` is
  frozen in `env.js`, so at 3000 ticks the phase-1/phase-2 split is balanced. Any other budget
  unbalances the `phase` stratifier. The budget is therefore constrained *through a stratifier*, not
  merely conventional.
- The stopping-rule **form**: Q1 §14 requires an under-yield to be handled by a stopping rule rather
  than by extension.

**Evidence-supported** — from documented figures only; no seed was generated to produce them.

- M8 accepted 41 configurations from 500 seeds, a realised yield of **0.082 accepted configurations
  per seed**, close to the 0.0872 M7 figure used to size M8.
- M9 recorded **7,178 DESYNC events across 41 configurations** — 175.07 per accepted configuration.
- Arithmetic on those two figures gives about 14.36 DESYNC gaps per seed, so 500 seeds **project**
  about 41 accepted configurations and about 7,180 gaps. This is a projection from a different seed
  block, **not a guarantee**; yield is a property of the acceptance predicate and need not reproduce.
  The stopping rule (§5), not the range, absorbs an under-yield.
- M8 §12 established the *form* 100 / 20 / 15 as a workable information-sufficiency rule.

**Director judgment.**

- The seed-range **size** — 500 rather than 250 or 200.
- The **agent seed** and the **arm**, per §6.
- The minimum-evidence **numbers**, per §4.

### 4. Minimum evidence — explicitly Director judgment

**The values 100 / 20 / 15 are a pre-data design choice by the Research Director, informed by M8
precedent. They are NOT mechanically required by source, and must never be represented as such.**

Two facts make that labelling substantive rather than ceremonial.

First, **every falsification statement in Q1 §9 is an existence claim**, refuted by a single
counterexample. Falsification under Q1 therefore requires **no minimum sample and no threshold at
all**. The minimum-evidence rule governs *distributional characterisation* — the precision with
which `GAP_COMPOSITION` proportions are reported — and nothing else. It cannot make a Q1 refutation
more or less valid.

Second, Q1 §10 pre-registers **no test and no precision target**, so there is no mechanical anchor
from which any specific number could be derived. The numbers are inherited in form from M8 §12
(D-003 B) because that form is the established project precedent, not because the evidence
determines them.

**Goal-degree stratum.** Q1's frozen text does not itself define one. The stratification is
inherited unchanged from M8 §12 / D-003 B: **degree 5 = goals 8, 12; degree 3 = goals 16, 19**. This
decision is the instrument that fixes it for Q1, and it is stated here rather than assumed, because
Q1 does not supply it.

Strata are **not balanced by construction.** Goals cycle `GOALS[configIndex % 4]` over candidates,
but acceptance is not uniform: M8 realised 10 / 10 / 9 / 12 by goal, i.e. 20 versus 21 configurations
across the two strata. A per-stratum minimum of 15 therefore binds the seed range more tightly than
the pooled minimum of 20 does.

### 5. Stopping rule — fixed range, no extension, no adaptation

1. Enumerate the **entire** frozen range 899000-899499.
2. Evaluate **every** candidate directly at its own seed. There is no acceptance walk, so no seed
   outside the frozen range is ever reached — the M7-ERR-09 §3.3 discipline, carried forward.
3. Collect **every** accepted configuration in that range.
4. **Do not extend the range for any reason**, including an observed under-yield.
5. **Do not adapt collection after observing any Q1 result.** No parameter in §1 may be revised in
   response to Q1 data.
6. If **any** minimum-evidence condition in §1 E is unmet, the Q1 result is
   **INCONCLUSIVE — INSUFFICIENT MATERIAL**, and the report must name the specific failing
   condition. **No additional sampling is permitted under Q1.**

Because the range is fixed and extension is prohibited, the minimum-evidence rule is a **reporting
threshold, not a collection target**. It decides the disposition of the evidence actually obtained;
it never drives the acquisition of more.

### 6. Comparability, and what reuse does not buy

The agent seed and the arm are reused from M8/M9 so that the **only** changed variable between M9
and Q1 is the configuration range. Changing the agent seed would change two variables at once and
would foreclose reading Q1's composition results against M9's ORIGIN proportions. Arm A1 is recorded
in `arms.js` as **BELIEF**, is in `LOCKED_ARMS`, and the transition sites Q1 observes — `cap`,
`pool`, `goalReset`, `advance` — are arm-independent in source, so no other arm offers an identified
advantage for this question.

**Reuse does not establish seed-robustness.** M7, M8, M9 and Q1 all inherit any idiosyncrasy of this
single agent seed, with no independent check. That is a real limitation of the series, it is not
removed by this decision, and downstream write-ups must state it rather than treat comparability as
if it were replication. Testing robustness across agent seeds would be a **different study**, not a
parameter adjustment to Q1.

### 7. Dependencies identified by the D-006 audit

Recorded because each coupling can silently invalidate a parameter that looks independently chosen.

1. **Tick budget ⇄ phase stratifier.** `T_SHIFT = 1500` is frozen, so the budget controls a
   stratifier, not just sample size. 3000 looks like a free convention and is not.
2. **Seed range ⇄ tick budget.** Both scale total gaps. With the budget fixed at 3000, the range is
   the only remaining sample-size lever.
3. **Minimum evidence ⇄ stopping rule.** With no extension permitted, the minimum determines the
   probability of a pre-declared INCONCLUSIVE. The two were decided together, not separately.
4. **Per-stratum minimum ⇄ seed range.** Because strata are not balanced by construction (§4), the
   15-per-stratum condition constrains the range more tightly than the pooled 20 at the same nominal
   level.
5. **Agent seed ⇄ comparability with M9.** Changing it alters two variables at once relative to
   M8/M9, per §6.
6. **Seed range ⇄ minimum evidence, through an unverifiable assumption.** The range was sized from
   M8's yield, which may not reproduce on a different block. Dependency 3 absorbs that risk; no
   minimum was chosen on the assumption that the projection holds.

**Recorded from the audit, and deliberately not acted on:** the AGE distribution is governed by the
per-tick probability of the DESYNC conjunction — no fresh selection (the `liveRng() < 0.92` gate at
`main.js:3325`) **and** a realised position change — rather than by the tick budget or the
`EPISODE_CAP = 150` ceiling. Observed successive AGE ratios, 27.0 : 15.1 : 8.5, do not cleanly match
the gate alone, which is consistent with the conjunction being the driver. **The exact functional
form is not established and is not claimed.** Only the negative consequence is used here: the tick
budget is a sample-size lever and does not shape the phenomenon.

### 8. Boundary and governance consequence

D-006 is a **governance decision only**. It adds no instrumentation, enumerates no candidate,
generates or inspects no seed, runs no configuration, produces no data, and observes no Q1 outcome.
It modifies no scientific definition in Q1, and does not touch M7, M8 or M9.

Q1 instrumentation design and implementation is a **separate milestone requiring its own
authorisation**, and collection is a further milestone after that. No Q1 result is authorised to
reinterpret M7, M8 or M9, or to bear on the G15 outcome.

---

## D-005 — Q1: ordered transition composition in DESYNC gaps, pre-registered

**Date:** 2026-08-29 · **Authority:** Director ruling of 2026-08-29, following independent
scientific review of the Q1 formulation (verdict A) · **Status:** in force
**Scope:** a new descriptive follow-up requiring its own collection. M7 frozen at `707cb1e`,
M8 evidence at `f9d97b9`, M9 at `04dda03`/`9044c3b` — all unchanged.

### 1. Decision

[`research/preregistrations/Q1_PREREGISTRATION.md`](preregistrations/Q1_PREREGISTRATION.md) is
frozen before any instrumentation or measurement exists, digest recorded in its `.sha256` sidecar.

Q1 asks what **ordered sequence of position-changing transitions** occurs within a DESYNC gap, and
how that sequence is distributed across gaps M9 would classify TELEPORT versus ADVANCE.

### 2. Why Q1 is not a repeat of M9

M9's observable was a last-only, overwriting teleport counter yielding one boolean: did at least
one teleport fall in the gap. Under it, the histories `write→teleport→read`,
`write→teleport→advance→read`, `write→advance→teleport→read` and
`write→teleport→advance→teleport→read` are **indistinguishable** — all four classify TELEPORT. The
Q1 log separates them. Q1 decomposes an information gap M9 identified and disclosed in its own §4,
and converts M9's ADVANCE from an inference by exclusion into a direct observation.

**Q1 requires a new collection.** The observable was never recorded, so no re-analysis of the M8
evidence can answer it. Q1 has its own denominator; M9's 7,178 is context, not Q1's population.

### 3. Frozen in the pre-registration

| | Decision |
|---|---|
| **Question** | The §1 wording, with "proximate" deliberately absent. |
| **Phenomenon** | `DESYNC := lastReasoning.from !== agentCurrent`, inherited unchanged from M8 §2. |
| **Window** | Strictly between `main.js:2635` and `main.js:3819`, with per-tick membership fixed by the audited in-tick ordering. Maximum 2k transitions at age k — two even at age 1. |
| **Taxonomy** | Closed: `cap`, `pool`, `goalReset`, `advance`. The wipe at `main.js:5209` is excluded as unreachable in this harness, with the reason recorded rather than the site omitted. |
| **Completeness gate** | Mandatory source-level verification that every reachable `agentCurrent` assignment maps to exactly one taxonomy member. **An additional reachable assignment HALTS the study** — it is never silently ignored or absorbed. |
| **Raw observable** | Closed schema `{seq, tickIndex, site, fromPos, toPos}`. No field addable after data exists. `fromPos` is formally redundant and retained so a dropped record is detectable rather than silently corrupting the chain. |
| **Derived** | `GAP_COMPOSITION`, `FIRST_DIVERGING_TRANSITION`, `LAST_TRANSITION_BEFORE_EVALUATION`, `TRANSITION_COUNT`. **None may be named a cause; "proximate cause" is prohibited.** |
| **Falsification** | Six statements, each refuted by a counterexample, requiring no threshold. |
| **Statistics** | Descriptive only — counts, proportions, sequence frequencies. No test, interval, model or causal estimate, and none addable post hoc. |
| **Intervention-free** | No RNG, no mutation, no branch substitution, no change to selection/teleport/advance/goal logic, default-off, bit-identical when disabled, run-neutrality verified. |
| **Reproducibility** | Deterministic, digest-pinned, identical across authoring tree, archive and CRLF checkout; no mtime, wall-clock, network or undeclared seed. |

### 4. Why "proximate" was removed

The independent review and the source audit agree: the evidence supports **temporal ordering**,
not causal responsibility. Two source facts make this substantive. DESYNC is a **conjunction** — no
fresh selection **and** a net position change — so no single transition carries responsibility for
it. And with up to 2k transitions per gap the position may oscillate, so the transition that
*established* divergence and the one that *determined the executed position* are different
transitions answering different questions. Both are therefore recorded, and neither is privileged.

### 5. Seed governance — OPEN, deliberately not chosen here

The admissible space is **below 899500**: not overlapping M8's `899500-899999`, not overlapping
M7's `900000-900029` or `900030-900499`, strictly below the held-out floor `900500`.

**The exact bounds are NOT frozen.** Sizing depends on acceptance yield and the number of DESYNC
gaps required, which is a scientific judgement; per the Director's instruction it is recorded as an
open decision rather than silently chosen. The same applies to the agent seed, arm, tick budget,
minimum evidence rule and stopping rule. **All must be ratified as a numbered Director decision
before the collection milestone begins.**

Sizing basis available to that decision, from documented figures only: M8 accepted 41
configurations from 500 seeds (0.082 per seed), close to the 0.0872 M7 figure used to size M8.

### 6. Post-hoc disclosure

Q1 was motivated by an observability limitation **M9 disclosed in its own protocol**, and the
formulation was written after the M9 results existed. Q1's *design* is therefore post-hoc relative
to M9. Its *measurement* is a-priori relative to its own evidence, because it requires a new
collection under a pre-registration frozen beforehand. Downstream write-ups must reproduce that
distinction rather than claiming either extreme.

### 7. Governance consequence

Changes to Q1 arrive only as numbered errata quoting its text and binding to its digest.
Instrumentation, seed ratification, and collection are separate milestones, each requiring its own
authorisation. No Q1 result is authorised to reinterpret M7, M8 or M9, or to bear on the G15
outcome.

---

## D-004 — M9: secondary analysis of the frozen M8 evidence, pre-registered

**Date:** 2026-08-29 · **Authority:** Director ruling of 2026-08-29, M9 Governance Gate accepted
· **Status:** in force
**Scope:** analysis only. M8 evidence untouched and byte-identical at
`f9d97b9a180fa5a4aed6def06788eb4b38c037f0`; M7 untouched and frozen at
`707cb1e5205a7e9979f81092ee1ebfa0fe28922e`, digest
`2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9`.

### 1. Decision

[`research/preregistrations/M9_PREREGISTRATION.md`](preregistrations/M9_PREREGISTRATION.md) is
frozen before any analysis is run, digest recorded in its `.sha256` sidecar. M9 is a **secondary
analysis of an existing dataset**: it performs no measurement, consumes no seed, and changes
nothing in M8 or M7.

### 2. Why M9 rather than an M8 erratum

The M8 analysis layer (§10, §11) is degenerate and is **not repaired and not superseded** — it
stands in history as issued and as demonstrated degenerate. An erratum would touch the M8
governance chain to fix an analysis defect; M9 leaves the M8 evidence and its record entirely
intact. M8 §19 permits this because M9 modifies no M8 text, and M8 §13 is not engaged because M9
performs no measurement.

### 3. Frozen Director decisions

| | Decision |
|---|---|
| **Question** | Candidate A — the proportion of DESYNC events arising from a teleport-class reset within the write→read gap versus ordinary advance alone. |
| **Denominator** | Fixed at 7,178 DESYNC events; single denominator throughout; no exclusions. |
| **ORIGIN** | Partition on when the most recent teleport fell relative to the write, per M9 §4. |
| **Equality case** | `teleportSource` resolves in-tick order: `cap`/`pool` precede the write → ADVANCE; `goalReset` follows the evaluation → TELEPORT. |
| **Null case** | UNCLASSIFIED: counted, reported separately, excluded from proportions, never assigned to a category, never dropped. |
| **Unobserved cells** | No cell excluded, merged, or collapsed. Zero-count cells are NOT OBSERVED; UNREACHABLE requires a cited source proof. |
| **Statistical policy** | Descriptive only — counts and proportions. No test, null, threshold, interval or model pre-registered, and none may be added after the data is seen except by numbered erratum frozen beforehand. |
| **Multiple comparisons** | No inferential test, so no correction. The complete grid is emitted on every run; selective reporting is a protocol violation. |
| **Minimum evidence** | Evaluable iff the regenerated dataset yields exactly 7,178 DESYNC events, UNCLASSIFIED = 0, and both ORIGIN categories are non-empty. Otherwise NOT EVALUABLE; no re-collection or substitute denominator. |
| **Falsification** | Six named statements, each falsifiable by a data pattern possible under the frozen definitions (M9 §14). |

### 4. Demotions carried from the source audits

AGE is duration, not a mechanism. Replay is a constant precondition, reported as the constant it
is. H4 is harness-unreachable, not absent. NON_CANONICAL is a consequence; S_PAIR an observable
signature. `agentCurrentChangedSinceLastWrite` is excluded entirely, being identically DESYNC.
The sole-attribution layer and the composite rule are excluded.

### 5. Post-hoc disclosure

The ORIGIN rule was formulated after the M8 collection existed and was retained knowing both its
categories are populated. Its inputs and the in-tick ordering it relies on predate collection, and
it was derived from control flow rather than selected by its answer — but the residue is real and
is disclosed on the face of M9 §16. M9's conclusions therefore carry less evidential weight than a
result from a rule frozen before collection.

### 6. Governance consequence

Changes to M9 arrive only as numbered errata quoting its text and binding to its digest.
Implementation of the analysis is a separate milestone requiring its own authorisation. No M9
result is authorised to reinterpret M7, and no M9 statistic may be compared with, correlated
against, or selected to explain the G15 outcome.

---

## D-003 — M8 successor phase: pre-data design decisions frozen

**Date:** 2026-08-28 · **Authority:** Director decisions A-H of 2026-08-28 · **Status:** in force
**Scope:** the M8 successor investigation only. M7 untouched — frozen and closed at
`707cb1e5205a7e9979f81092ee1ebfa0fe28922e`; `M7_PREREGISTRATION.md` SHA-256
`2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9` unchanged.

### 1. Decision

The M8 pre-registration is frozen before any measurement exists, at
[`research/preregistrations/M8_PREREGISTRATION.md`](preregistrations/M8_PREREGISTRATION.md),
digest recorded in its `.sha256` sidecar. The primary phenomenon is **decision/position
desynchronization**, `DESYNC := lastReasoning.from !== agentCurrent`. Non-canonicality is a
secondary derived label, because the audit established that `non-canonical -> DESYNC` holds
while the converse is false — 88 of 190 node pairs share a common neighbour, so the proxy is
lossy and topology-dependent.

### 2. Frozen pre-data design decisions

These are design choices. **None is claimed to be mechanically derived from source code.**

| | Decision |
|---|---|
| **A** | H5 composite accepted iff no `SOLE_SHARE(k) > 0.70` and at least three `SOLE_SHARE(k) >= 0.10`. Denominator `D` = count of eligible events with exactly one mechanism flag set; `MULTI` and `ZERO` events are excluded from `D` but counted and reported; `D = 0` yields NOT EVALUABLE. |
| **B** | Information sufficiency: 100 total DESYNC events, 20 distinct configurations, 15 per goal-degree stratum (degree 5 = goals 8, 12; degree 3 = goals 16, 19). Unmet strata are reported STRATUM-LIMITED. |
| **C** | 3000 ticks per configuration, for controlled comparability with the M7 scale. |
| **D** | Agent seed 20260819000, arm A1 — intentional reuse for comparability, not reuse of M7 measurement data. |
| **E** | `GOAL_MISMATCH` uses strict identity. `Number()` coercion is not substituted into the primary definition; raw numeric values are preserved so alternatives can be evaluated offline. |
| **F** | Null goal identity at the authoritative evaluation point is an explicit exclusion: counted, reported separately, excluded from eligible events, never reclassified as H1-H5. No new hypothesis is created. |
| **G** | Materiality threshold `MARGINAL(k) >= 0.10` over eligible DESYNC events. M8 is descriptive/mechanistic; no statistical test, null, or adaptive procedure is pre-registered. |
| **H** | Configuration-seed range **899500-899999**, 500 seeds, 2000 candidate configurations. Non-overlapping with 900000-900029 and 900030-900499, strictly below 900500. Sized from M7's documented yield of 0.0872 accepted configurations per seed with a factor-of-two margin; no seed was generated to determine it. |

### 3. Mechanism structure

H1 position-transition desynchronization · H2 replay / selection bypass · H3 multi-tick action
staleness · H4 goal-context mismatch · H5 composite. **H4 merges** the earlier goal-switch
concept and the surviving changed-goal branch of the retired H7; the null-goal framing is not
carried forward. Topology is a **stratifier**, not a hypothesis. **S-PAIR** is an observable
signature of H2 — deliberately not labelled `N1`, which `verify_G15.js` already uses. Mechanism
flags are independent, and the complete joint distribution is reported rather than forcing
exclusive attribution.

### 4. Boundary

M8 does not rescue, reinterpret, recompute, or modify M7, and does not claim that
desynchronization caused the G15 failure. The held-out block `>= 900500` remains untouched. No
M8 result is authorised to retroactively reinterpret M7.

### 5. Governance consequence

Changes to the M8 pre-registration arrive only as numbered errata that quote its text and bind
to its digest. Instrumentation, seed consumption, and execution are future milestones, each
requiring its own authorisation.

---

## D-002 — G16.4b: retired, not repaired

**Date:** 2026-08-28 · **Authority:** Director ruling of 2026-08-28, following independent
three-model review · **Status:** in force
**Scope:** frozen §13.4 G16.4 clause (b) only. Frozen artifact untouched —
`M7_PREREGISTRATION.md`, SHA-256
`2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9`.

### 1. Decision

Clause (b) of G16.4 — *"No other `render/` file modified"* — is **retired as an executable
runtime assertion** under [M7-ERR-10](cognitive-audit/M7_PREREGISTRATION_ERRATUM_10.md).
Disposition D5 was adopted; D1 (create 36 frozen references), D2 (select a Git commit range)
and D3 (reduce to a literal allowlist assertion) were rejected.

### 2. Why retirement rather than repair

The implementation measured filesystem edit chronology, not content divergence. It returned
three different answers over byte-identical content, and in the authoring tree it passed while
seven content-changed `render/` modules lay outside its measurement. Any substitute mechanism
would enlarge the population the gate quantifies over, which is a change to the measured
property rather than a repair of it.

### 3. Status of the historical PASS

The historical G16.4b PASS is **not** valid evidence for the claimed isolation property,
because its measurement was non-reproducible and did not reliably cover the full content-change
population. This is not a finding that unauthorised work occurred, nor that the isolation
property is false.

### 4. Constraint carried forward

No replacement gate is created. Any future isolation gate must be authorised in advance by a
separate ruling and must carry a mutation control in which modifying an unauthorised `render/`
module turns the gate **RED**.

---

## D-001 — M7 goal transport: authorised as a narrow integration bridge

**Date:** 2026-08-23 · **Authority:** Director ruling of 2026-08-23 · **Status:** in force
**Scope:** the M7 experiment only. Frozen artifact untouched — `M7_PREREGISTRATION.md`,
SHA-256 `2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9`.

### 1. Classification

The goal transport is a **narrow integration bridge, not new agent behavior.**
Goal state (`goalNeuronId`), its 54 readers, goal-directed decision behavior
(goal-namespaced Q keys), goal-directed reward behavior, and goal setters all
exist in the committed baseline `HEAD 7c8bdde`, predating M7. The bridge supplies
a value to that pre-existing mechanism and does nothing else.

### 2. Authority for the transported value

The value is `cfg.goal`, i.e. the **already-frozen** schedule `GOALS[configIndex mod 4]`
over `{8, 12, 16, 19}` (frozen §3.7). It is forwarded, never derived, defaulted, or
inferred at any point in the chain.

**No new scientific parameter, threshold, hypothesis, metric, or experimental
condition is introduced.**

### 3. Exact boundary

| Component | Responsibility |
|---|---|
| `experiments/m7/run.js` | forwards `cfg.goal` — sole experiment-level source |
| `experiments/phase1_0/_driver.js` (`boot`) | transports an **explicitly supplied** goal during bootstrap, before `main.js` is imported |
| `main.js` | installs that value into the pre-existing `goalNeuronId`, **after `loadBrain()` and before agent execution** |

### 4. Scope limitation

`globalThis.__M7_GOAL__` is a **one-purpose bootstrap transport for this frozen
experiment only.** It is **not** a general configuration bus, and **not** an
architectural pattern for carrying arbitrary runtime state. Any further use
requires its own ruling.

### 5. Isolation rule

**No goal is installed unless explicitly supplied by the M7 experiment path.**
The vestigial `goal = 16` default in `boot()` is deliberately not transported, so
every existing `boot({ seed })` caller remains behaviorally unchanged.

### 6. Verification basis (as reported, 2026-08-23)

- Boot-only installation consumed **zero RNG**: 641 cognitive / 3020 visual draws
  with no goal, with goal 8, and with goal 19 alike.
- Divergence appears **only after agent execution** — 641 = 641 at boot; 12984 vs
  14680 cognitive draws after 120 ticks, which is pre-existing goal-directed
  behavior being activated.
- **G1 M7-off parity GREEN** after the `main.js` edit: bit-identical across
  10 seeds × 1000 ticks, 0 mismatches, with the anti-vacuity control still firing.
- `verify_goal.js` 26/26; full regression 442 passed, 1 failed — the single
  failure being the pre-existing documented `verify_S3.js` S3.2 result recorded in
  ERR-01a §5, unchanged by this work.
- Independent review (Gemini) classified the seam as a narrow new integration
  bridge, consistent with §1.

### 7. Governance consequence

This decision authorises **the existing seam** as the lawful configuration-to-runtime
bridge for M7 goal installation.

It does **not** authorise any additional production behavior, any further bootstrap
channel, or any extension of `__M7_GOAL__` beyond the boundary in §3. It does not
modify the frozen pre-registration, does not supersede any clause, and is not an
erratum.
