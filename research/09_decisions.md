# Decisions

Project decision log. One entry per ruling. Newest first.

Entries record **decisions and their scope**. They are not specifications, do not
supersede any frozen artifact, and carry no executable effect.

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
