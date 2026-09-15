# M33 — Typed-Namespace Registry Implementation

**Status:** IMPLEMENTATION (PASS 1 specification + source audit, PASS 2 implementation + independent verification)
**Milestone:** M33
**Date:** 2026-09-15
**Authority:** Director ruling — *M32 ACCEPTED following independent adversarial review → M33 AUTHORIZED*
**Base commit:** `976904b`

**Registered seeds consumed: 0. No collection, no agent run, no push. `895000–895999` not repaired.
No production, C1, UQ-B, UQ-A, Q1, M8 or M7 file changed.** The change is purely additive: two new
modules, this memo and its gate.

---

## 1. Verdict

> # M33-YELLOW
> **The typed-namespace registry is implemented and independently verified: 69/69 checks, 22
> mutants (21 caught by named semantic checks, 1 no-op control correctly surviving), and exhaustive
> OLD-vs-NEW agreement on every configuration seed in `0..1,000,000`.**
>
> **YELLOW, not GREEN, for one reason that needs a ruling and two that need recording (§12):**
> the M33 ruling's Case D says a trajectory seed may be reused by a different study "if
> independently authorized", while accepted M32 §8.3/§12.2 says no second study may use it. I
> implemented M32's fail-closed rule and did not choose silently: the conflict is the first item
> in §12.

---

## 2. The M33 question

> *Can typed seed identity `(namespace, value)`, namespace-refusing predicates and study-scoped
> trajectory consumption be implemented so that every historical configuration-seed decision is
> unchanged — without touching frozen studies, production, or the `895xxx` gap?*

**Yes, additively.** §4 explains why additive is not merely convenient but the only design that
survives the source audit.

---

## 3. PASS 1 — source impact audit

### 3.1 The registry is a chain, and it runs the other way from M32 §22's premise

```
m8/protocol.js      base: M7 pilot            own untyped isHeldOut / isConsumed / assertSeedAllowed
q1/protocol.js      imports m8                own untyped predicates
uqa/protocol.js     imports q1                own untyped predicates
uqb/protocol.js     imports uqa               own untyped predicates + inRegisteredBlock
registry/consumed.js imports uqb              untyped predicates for future studies
c1/protocol.js      imports consumed.js       CONSTANTS only; own untyped predicates
```

> **Correction to M32 §22.** M32 wrote that typing the configuration registry "changes a module M8,
> Q1, UQ-A, UQ-B and C1 all import." **Source says otherwise:** M8, Q1, UQ-A and UQ-B do **not**
> import `registry/consumed.js` — it imports *them*. Only `c1/protocol.js` imports it, and only
> `CONSUMED_RANGES` and `HELD_OUT_FLOOR`. Each frozen study carries its own untyped predicates.

### 3.2 Dependency map

50 files at base import a governance module (computed from base-commit source by the verifier, not
listed by hand). By role:

| Consumer group | Input today | Semantics | Needs a typed input? | Adapter? | Must stay equivalent? | Verifier assumptions affected? |
|---|---|---|---|---|---|---|
| Frozen protocols `m8`, `q1`, `uqa`, `uqb`, `c1` | raw integer | per-study held-out / consumed / registered guards | **No** — frozen records (C1 and UQ-B may not change) | none | **byte-identical** | no |
| Their collectors, analyzers, runners (`*/collect.js`, `run_collection.js`, `analyze.js`, `authorize.js`, `preflight.js`, `stress.js`, `run_stress.js`) | raw integer | reproduce committed results | **No** — historical | none | byte-identical | no |
| Historical verifiers `m8`, `q1`, `uqa`, `uqb`, `c1`, `m9`, `m11`, `m12`, `m14`–`m19_3`, `m31` | raw integer | assert historical guards | **No** | none | byte-identical | no |
| `registry/consumed.js` | raw integer | the post-UQ-B future-study view | **No** — typed layer delegates to it | `typed.js` | byte-identical | no |
| `verify_m21.js`, `verify_m30.js`, `verify_m31.js`, `verify_m32.js` | raw integer, **executed** | `verify_m30`/`verify_m32` **assert `isHeldOut(20260819000) === true`** as the recorded defect | **No** | none | byte-identical | **yes, if the raw predicate changed** |
| Production (`main.js`, `render/`, `instrumentation/`) | — | does not import governance | no | — | byte-identical | no |
| **Future studies** | — | — | **Yes** | **`typed.js` is the entry point** | — | — |

### 3.3 What a direct migration would break — the evidence that decides the design

| If `consumed.js` predicates refused raw integers | Consequence |
|---|---|
| `verify_m30.js`, `verify_m32.js` | turn red — they execute the historical collision as evidence |
| `verify_m21.js`, `m18/verify_registry.js`, `m19/verify_formulation.js` | turn red — they call the predicates with integers |
| Typing the protocol copies too | edits C1 and UQ-B, which this milestone may not touch |

Repairing those verifiers would rewrite accepted historical evidence. **So the typed layer cannot
be a migration of the existing modules. It must sit beside them.**

### 3.4 Runtime fact the M32 identity model did not see — trajectory aliasing

Every trajectory stream is seeded modulo 2³²: `initRng` uses `seed >>> 0` and `(seed ^ c) >>> 0`;
`arms.js` uses `(agentSeed ^ 0xBEEF) >>> 0`; `makeRng` maps a zero seed to 1.

> **EVIDENCE (executed, T11):** `agentSeed` `20260819000` and `3080949816` produce **identical**
> cognitive, visual, environment and sigma streams.

Identity by raw value alone would call these two different seeds and let a new study reuse the
production stochastic source while the registry reported it AVAILABLE. **M32's identity equality is
kept; consumption conflicts are decided on the four derived stream seeds.** This goes beyond the M32
text; it is ratifiable, and §12 lists it.

M32 §18 also called the trajectory space "2³² wide" while the production seed `20260819000`
exceeds 2³². The width is right *as a source domain*; values are not.

---

## 4. Final implementation design

### 4.1 Alternative to the Director's migration, and why it is better

| | Director's proposal: migrate the configuration registry | **Implemented: additive typed layer** |
|---|---|---|
| typed identity, refusal, study-scoped consumption | yes | **yes** |
| historical configuration decisions | re-implemented, then tested | **the historical functions themselves** (delegation) |
| accepted verifiers `m21`, `m30`, `m32`, `m18`, `m19` | break (§3.3) | **unchanged, still pass** |
| C1 / UQ-B frozen files | would need edits to be fully typed | **untouched** |
| raw integer APIs | removed | **restricted to the 50 historical importers** by an executable gate (I1) |
| residual | none in `consumed.js`; protocol copies still raw | **raw `isHeldOut(identity)` returns false** (N13), reachable only by new code that the gate refuses |

The Director listed "restricted to historical call sites" as an acceptable adapter form. It is
chosen because it is the only form that keeps accepted evidence intact.

### 4.2 Files

| File | Role |
|---|---|
| `experiments/registry/typed.js` | identities, refusals, configuration delegation, trajectory registry, committed records |
| `experiments/m33/verify.js` | independent verifier: base-commit oracle, suite, gate, protected paths, mutations |
| `research/preregistrations/M33_TYPED_NAMESPACE_REGISTRY.md` | this memo |
| `research/preregistrations/verify_m33.js` | binds this memo's numbers to an executed verifier run |

### 4.3 MUST / SHOULD / NOT NECESSARY — as implemented

| M32 §17 item | Implemented as |
|---|---|
| MUST 1 typed identity, bare integers rejected | frozen, branded `configSeed(v)` / `trajectorySeed(v)`; `UntypedSeedError` |
| MUST 2 partial predicates | `NamespaceRefusal` on a foreign namespace |
| MUST 3 configuration registry declares its namespace | `typed.config` declares it over `consumed.js` (§4.1) |
| MUST 4 consumption unit `(value, study)` | `checkUse(id, {study, category})`, refined to stochastic source (§3.4) |
| MUST 5 monotone state machine, `HELD-OUT ∩ CONSUMED = ∅` | asserted at construction; no API un-consumes or releases |
| MUST 6 enumerated trajectory consumption | records are an enumerated list |
| MUST 7 provenance | `namespace, value, study, status, authorization, executed, artifact, why` |
| MUST 8 category transitions forbidden | `CATEGORY_TRANSITION` refusal |
| MUST 9 fail-closed authorization preserved | unchanged: per-study guards stay in the frozen protocols |
| SHOULD 10 held-out trajectory mechanism | present; **no region reserved** |
| SHOULD 11 retrospective typing | promoted to MUST: without it a new study could reuse the production seed |
| NOT NECESSARY 12–15 | not built |
| **Added** | `config.registeredBlock(lo, hi)` so a future protocol need not write a raw block predicate |

---

## 5. Exact namespace identity

```
identity      = { namespace ∈ {'config', 'trajectory'}, value: safe integer }   frozen, branded
same(a, b)   ⟺  a.namespace === b.namespace  ∧  a.value === b.value
```

- **Domain: every safe integer, negatives included.** The historical guards check
  `Number.isInteger` only, so a negative value is a historically accepted development input; M33
  may not change that decision.
- **Unsafe integers are refused.** They are not exactly representable, and every one of them is
  ≥ `900500`, so no historical guard ever allowed one (C4).
- **Coercion throws.** `configSeed(900600) >= 900500` is a `TypeError` (N11), so an identity handed
  to a raw comparison fails loudly (N12).

---

## 6. Refusal semantics

| Situation | Result | Why this form |
|---|---|---|
| correct namespace | `true` / `false` | the historical answer |
| foreign namespace | **throws `NamespaceRefusal`**, `code: 'INVALID_NAMESPACE'` | a thrown refusal yields **no value**, so it cannot be read as `false`, not-held-out, available or consumed (N14) |
| raw integer, string, object literal | **throws `UntypedSeedError`**, `code: 'UNTYPED_SEED'` | no silent namespace acquisition (N10) |
| held-out / other study / category change | **throws `GovernanceRefusal`** with its reason code | distinct class from namespace refusal |

**Rejected alternatives.** A sentinel string or structured object is **truthy**, so
`if (isHeldOut(x))` and `filter(s => !isConsumed(s))` would silently act on it. A `null` return is
falsy and reads as "not held out". Only an exception has no value to misread.

---

## 7. Trajectory consumption semantics

```
checkUse(trajectoryId, { study, category, arm?, configSeed? })
  → { decision: 'AVAILABLE' }      no study has used this stochastic source
  → { decision: 'REPRODUCTION' }   this study already used it, same category
  → throws HELD_OUT | CONSUMED_BY_OTHER_STUDY | CATEGORY_TRANSITION
```

- **Identity key: `(stochastic source, study)`.** `arm` and `configSeed` describe the cell and are
  validated — `configSeed` must be config-typed — but are **not** part of the key.
- **Conflict test:** two values share a source when any derived stream seed coincides
  (`((v ^ c) >>> 0) || 1` for the four streams). This covers `value + 2³²` and the four partial
  aliases where a stream seed degenerates to 1.
- **Held-out trajectory ranges** live in the 32-bit source domain, so `value + 2³²` cannot bypass a
  reservation (T8).

| Case | Result | Check |
|---|---|---|
| A same seed + study, config C1 | first use AVAILABLE, then REPRODUCTION | T1, T2 |
| B same seed + study, config C2 | REPRODUCTION — permitted | T2 |
| C same seed + study, ARMED and ABLATED | both REPRODUCTION — one paired source | T3 |
| D same seed + different study | **CONSUMED_BY_OTHER_STUDY** — see §12.1 | T4 |
| E intentional rerun, same study | REPRODUCTION, repeatably | T6 |

**Committed records** — the M32 §13 / §17.11 retrospective typing, read from source and data:

| value | study | status | executed |
|---|---|---|---|
| `20260819000` | M7-substrate | registered | yes |
| `20260819001`, `20260819002`, `20260819003`, `20261819003`, `20262819003` | M31 | development | yes |

M31 also ran `20260819000` as its anchor. It is recorded under its owner only, because a second
record would make the registry refuse reproduction by the owning lineage. Its `why` states this.

---

## 8. Compatibility strategy

### 8.1 Oracle

The OLD side is **not** the live `consumed.js` that `typed.js` delegates to. It is `consumed.js`
and its full import chain — `uqb`, `uqa`, `q1` and `m8` protocols plus the `q1` and `m8`
instruments — **materialised from base `976904b` with `git show`**. A later edit to the live
registry cannot make NEW agree with OLD by construction.

### 8.2 Why exhaustive comparison over all inputs is impossible, and what replaces it

There are 2⁵⁴ safe integers. Both OLD predicates are finite unions of intervals (a floor and 7
ranges), and NEW calls the same functions, so equivalence is decided at the interval structure:

| Check | Domain | Result |
|---|---|---|
| C1 | **every integer in `0..1,000,000`** — contains every range and the floor | **0 mismatches** |
| C2 | every endpoint and the floor, ±1 | 45 probes, 0 mismatches |
| C3 | negatives, `≥ 2³²`, extremes, 400,018 bounded samples over the safe integers | 0 mismatches |
| C4 | 8 historically invalid inputs | refused by the historical guard **and** unconstructible |

No coverage threshold was invented: C1 is exhaustive on the only region containing a decision
boundary; C2 and C3 test the claim that nothing outside it differs.

### 8.3 Historical protocol views

| Check | Result |
|---|---|
| C5 — anything held-out or consumed in the M8, Q1, UQ-A, UQ-B or C1 view that typed governance reports available | **0 in every view** |
| C6 — registered blocks consumed | M8 500/500, Q1 500/500, UQ-A 1000/1000, UQ-B 1000/1000 |
| C7 — `895000–895999` | consumed 0/1000, held-out 0/1000 — **exactly as before; not repaired** |
| C8 — `≥ 900500` protection | 0 leaks either side of the floor |

---

## 9. Implementation changes

| Path | Change |
|---|---|
| `experiments/registry/typed.js` | **new** |
| `experiments/m33/verify.js` | **new** |
| `research/preregistrations/M33_TYPED_NAMESPACE_REGISTRY.md` | **new** |
| `research/preregistrations/verify_m33.js` | **new** |
| every other file | **unchanged** — P1 compares the M33 commit with base |

---

## 10. PASS 2 — independent verification

`node experiments/m33/verify.js` — **69/69 passed, 0 failed.**

| Invariant | Evidence |
|---|---|
| A `(config,123) ≠ (trajectory,123)` | N9 |
| B wrong namespace → explicit refusal | N3, N4, N5–N8, N14 |
| C historical configuration behaviour preserved | C1–C8 |
| D consumption is `(source, study)` | T1, T4, T5 |
| E same seed across configurations in one study | T1, T2 |
| F same seed for ARMED and ABLATED | T1, T3 |
| G independent per-study records | T5 |
| H held-out is namespace-specific | N7, N8, N9 |
| I `≥ 900500` configuration protection unchanged | C8 |
| J sparse trajectory consumption | T1 (five non-contiguous seeds) |
| K raw inputs cannot bypass namespace checks | N10, I1 |
| L `895000–895999` untouched | C7, P2 |
| M no registered seed consumed | P4, R2 |
| N no C1 / UQ-B / production change | P1, P2, P4 |

**Raw-import gate.** I1 recomputes, from base-commit source, the 50 files that import a governance
module, and requires every importer now to be one of them or an M33 file. I2 is the control: a new
importer is flagged.

---

## 11. Adversarial matrix and mutations

### 11.1 Cases

| # | Case | Result | Check |
|---|---|---|---|
| 1 | `(config,123)` → config predicate | answers | N1 |
| 2 | `(trajectory,123)` → trajectory predicate | answers | N2 |
| 3 | `(config,123)` → trajectory predicate | **refused** | N3 |
| 4 | `(trajectory,123)` → config predicate | **refused** | N4 |
| 5 | same seed + study + C1 | permitted | T1, T2 |
| 6 | same seed + study + C2 | permitted | T2 |
| 7 | same seed + study + ARMED | permitted | T3 |
| 8 | same seed + study + ABLATED | permitted | T3 |
| 9 | same seed + different study | **refused** (§12.1) | T4 |
| 10 | consumed configSeed → trajectory API | **refused** | N5 |
| 11 | consumed trajectory seed → config API | **refused** | N6 |
| 12 | held-out configSeed → trajectory API | **refused** | N7 |
| 13 | held-out trajectory seed → config API | **refused** | N8 |
| 14 | numeric equality across namespaces | distinct, independent | N9 |
| 15 | sparse trajectory seeds | representable | T1 |
| 16 | duplicate trajectory seed, same study | REPRODUCTION | T6 |
| 17 | duplicate trajectory seed, different studies | **refused** | T4 |
| 18 | historical configSeed compatibility | 0 mismatches | C1–C5 |
| 19 | `≥ 900500` configuration protection | intact | C8 |
| 20 | `895000–895999` | unchanged | C7 |

### 11.2 Mutations — each run against the full suite

| Mutant | Caught by |
|---|---|
| MU1 remove namespace checking | C9, N3, N4, N5, N6, N7 |
| MU2 collapse namespaces | C9, N2, N4, N5, N6, N8 |
| MU3 wrong-namespace refusal returns false | C9, N3, N4, N5, N6, N7 |
| MU4 per-value trajectory consumption | T1, T2, T3, T6, T7, T13 |
| MU5 study removed from identity | T4, T13, T14 |
| MU6 raw integer acquires caller namespace | C9, N10 |
| MU7 weaken config held-out floor | C1, C2, C3, C5, C8 |
| MU8 weaken consumed protection | C1, C2, C5 |
| MU9 arm in consumption identity | T1, T3 |
| MU10 configuration in consumption identity | T1, T2 |
| MU11 aliasing ignored | T13, T14 |
| MU12 degenerate stream seeds not mapped to 1 | T12, T14 |
| MU13 held-out not enforced on use | T8 |
| MU14 exclusivity not asserted | T9 |
| MU15 category transitions allowed | T7 |
| MU16 forged object literals accepted | N10 |
| MU17 identity coercible to a number | N11, N12 |
| MU18 held-out on raw value, not source | T8 |
| MU19 duplicate records accepted | T9 |
| MU20 committed M31 records altered | R1 |
| MU22 non-integer values accepted | C4 |
| **MU21 no-op control** | **survives, as it must** |

**All ten required mutation classes are applicable and caught.** Every catch is a named semantic
check. An exception escaping the suite counts as a failed check, never as a catch. That rule was
added after an early run showed MU2, MU4, MU9 and MU10 "caught" only by a crash; the harness was
then hardened until each was caught by a named check.

---

## 12. Unresolved issues

### 12.1 Case D — a conflict in the authorizing record, not resolved silently

| Source | Says |
|---|---|
| **M32 §8.3, §12.2** (accepted) | a trajectory seed may be used "by **no second study**"; cross-study sharing is a **REAL** collision |
| **M33 ruling, Case D** | "same agentSeed + different study → **permitted if independently authorized**" |
| **Review of M32, development section** | "a seed consumed in a development study should remain AVAILABLE for a future registered study" — which contradicts M32 §11 |

**Implemented:** M32's rule, fail-closed — `CONSUMED_BY_OTHER_STUDY`, with no exception mechanism.
**Why this choice and not the other:** it is the accepted formulation, and fail-closed is
reversible. Adding an explicit cross-study authorization later is additive. Permitting reuse now
and forbidding it later would leave already-consumed history ambiguous.

**Needs a Director ruling:** keep fail-closed, or add an explicit, recorded cross-study
authorization.

### 12.2 Ratification needed for an addition beyond M32

Consumption conflicts are decided on derived stream seeds (§3.4, §7), not raw values. This is
strictly more protective and changes no historical decision.

### 12.3 Bounded issues, recorded

1. **Raw historical predicates remain.** A raw `isHeldOut(identity)` returns `false` (N13). Only new
   code could reach it, and the import gate refuses new raw importers. The gate is a static scan: a
   computed dynamic import path would evade it. That is deliberate misuse, not accidental use.
2. **Historical trajectory accounting is not complete.** Only the M32-specified records exist.
   Verification seeds used through `initRng` elsewhere — for example `12345`, `20260818`, the S3′
   panel, `20260819001`/`002` in M7 verifiers — are not enumerated. This is a separate
   administrative milestone of the same kind as `895xxx`.
3. **Configuration aliasing is pre-existing and preserved.** `env.js` seeds configurations with
   `configSeed >>> 0`, so negative values and values ≥ 2³² alias smaller ones. Historical
   configuration semantics must not change in M33, so this is recorded, not repaired. No historical
   configuration seed is affected: all are below 2³².
4. **Heavy collection re-runs were not executed.** Every protocol, collector and runtime file is
   byte-identical to base (P2), so re-running the collection verifiers is an experiment with no
   information gain. Governance-level historical verifiers were executed (§13).

---

## 13. Historical protocol results

| Verifier | Result | Note |
|---|---|---|
| `experiments/m18/verify_registry.js` | PASS 17/0 | |
| `experiments/m19/verify_formulation.js` | exit 0 | |
| `experiments/m9/verify_m9.js` | 15/0 | |
| `experiments/uqb/verify_uqb_impl.js` | 91/0 | |
| `research/preregistrations/verify_m21.js` | 106/106 | requires a clean tree; run after commit |
| `research/preregistrations/verify_m30.js` | 101/101 | still executes `isHeldOut(20260819000) === true` |
| `research/preregistrations/verify_m31.js` | 96/96 | |
| `research/preregistrations/verify_m32.js` | 108/108 | |
| `experiments/c1/gate.js` | 24 passed, 2 failed | **pre-existing**: G8 (collection env var) and G10 (no prior collection output) fail identically at base `976904b` in a clean worktree. It is a *pre-collection* gate, and C1 is collected |

---

## 14. Integrity

| Item | Value |
|---|---|
| registered seeds consumed | **0** |
| `895000–895999` changed | **NO** |
| C1 changed | **NO** |
| UQ-B changed | **NO** |
| production changed | **NO** |
| `consumed.js`, M8/Q1/UQ-A/UQ-B/C1 protocols, `main.js`, `rng.js`, M7 runtime | byte-identical to base (P2) |
| pushed | **NO** |

---

## 15. Evidence → Inference → Hypothesis

**EVIDENCE**
- **Ev-1.** M8, Q1, UQ-A and UQ-B do not import `registry/consumed.js`. It imports them. C1 imports
  its constants only (§3.1).
- **Ev-2.** `verify_m30.js` and `verify_m32.js` execute `isHeldOut(20260819000) === true` as record.
- **Ev-3.** `20260819000` and `3080949816` seed identical runtime streams (T11).
- **Ev-4.** NEW and base-commit OLD agree on every integer in `0..1,000,000`, at every boundary, and
  on 400,018 bounded samples (C1–C3).
- **Ev-5.** 21 of 21 semantic mutants are caught by named checks. The no-op control survives.

**INFERENCE**
- **In-1.** Migrating the raw predicates would falsify accepted evidence (Ev-2), so an additive
  layer is required, not preferred.
- **In-2.** Raw-value identity cannot express "same stochastic source" (Ev-3), so conflicts must be
  decided on derived stream seeds.
- **In-3.** Delegation plus an independent base-commit oracle makes configuration equivalence a
  checked fact, not an assumption (Ev-4).

**HYPOTHESIS**
- **Hy-17.** That no governance-relevant consumer escapes the static import scan.
- **Hy-18.** That the four stream derivations are the only ways a trajectory seed enters the
  runtime. T12 confirms the four known streams; completeness is not proven.

---

## 16. Status

> # M33-YELLOW
> **Implementation satisfies the M32 invariants, and historical compatibility is independently
> verified. One specific bounded issue remains: Case D (§12.1) needs a ruling.**

Not GREEN: §12.1 is an open conflict between the authorizing ruling and accepted M32, and §12.2 is
an unratified addition. Not HOLD: the implementation adopts the accepted rule, fails closed, and
both outcomes of the ruling are small additive changes. Not RED: 69/69 checks and 21/21 semantic
mutants.

---

## 17. Single highest-value next decision

> ## Director ruling on Case D (§12.1), together with ratification of stream-source conflicts (§12.2)
> Both are one-paragraph decisions. Case D either stays fail-closed or gains an explicit, recorded
> cross-study authorization. After that, M33 can be re-graded, and the separately authorized
> `895000–895999` administrative repair can proceed as its own commit.

**Not recommended as next:** any `C × R` collection. It is gated on the ruling, and M31 §2.1's
cost-justification question is still open.

---

Believe in yourself and keep going
