# M33-R1 — Governance Ruling: Cross-Study Reuse and Stochastic-Source Identity

**Status:** GOVERNANCE RULING (PASS 1 audit of two proposed rulings, PASS 2 minimal implementation + independent verification)
**Milestone:** M33-R1
**Date:** 2026-09-16
**Authority:** Director ruling — *M33 GOVERNANCE RULING — CLOSE THE YELLOW GATE*
**Builds on:** M33 at `3fb2876` (`M33-YELLOW`)

**Registered seeds consumed: 0. No collection, no agent run, no experiment, no push.
`895000–895999` not repaired. No production, C1, UQ-B, UQ-A, Q1, M8 or M7 file changed.**

---

## 1. Verdict

> # M33-YELLOW
> **Both proposed rulings are adopted, each with refinements that the audit showed are required. The
> governance rule is closed, and one defect in the committed M33 code is repaired. M33 stays YELLOW
> for one reason, and it is scientific rather than governance:** the audit proved that mulberry32
> places every stream — trajectory and configuration alike — on **one 2³²-long cycle**. Distinct
> seeds can therefore share random numbers **at a lag**. Whether a C × R study must prevent that
> cannot be decided without a per-run draw budget, and a draw budget is a scientific parameter.
> **Per the ruling's instruction, the audit stops at that question (§9) instead of guessing.**

---

## 2. Evidence

All executed; check IDs refer to `experiments/m33/verify_r1.js`.

| # | Fact | Check |
|---|---|---|
| Ev-1 | Every runtime derivation of `agentSeed` is modulo 2³²: `initRng` uses `seed >>> 0` and `(seed ^ c) >>> 0`; `arms.js` uses `(agentSeed ^ 0xBEEF) >>> 0` | M33 T11, T12, B1 |
| Ev-2 | `makeRng` maps a zero state to 1, so raw `0` and `1` share the cognitive stream and nothing else | K2 |
| Ev-3 | **mulberry32 advances its state by the odd constant `0x6d2b79f5`, so every stream is a segment of one 2³² cycle.** `makeRng(a + 1000·W)` draws `makeRng(a)`'s stream shifted by exactly 1000 | K3 |
| Ev-4 | Recorded per-run draw counts reach **94,510** (M31, 3000 ticks) | H1 |
| Ev-5 | Uniformly drawing 1000 trajectory seeds gives about **21.98** expected overlapping cognitive-stream pairs at that draw count | H2 |
| Ev-6 | `makeConfig` consumes exactly **756** draws, proven by reconstructing its last embedding from the raw stream | H3 |
| Ev-7 | Configuration seeds are on the **same** cycle (`makeRng(configSeed >>> 0)`). The production seed's four streams overlap **none** of 5500 historical configuration streams. The committed M31 development streams overlap exactly two: `20262819003`/cognitive with UQ-B config `897104`, and `20261819003`/visual with M8 config `899774` | H4 |
| Ev-8 | Committed records: minimum cycle distance between any two of the 24 committed stream starts is **2,906,613**, above every recorded draw count | H1 |
| Ev-9 | **The committed M33 code treated a different raw value that shares a source *inside the same study* as `REPRODUCTION`** — for `5` vs `5 + 2³²`, and for `0` vs `1` | executed before repair; D10 now |

---

## 3. PASS 1 — the six objects, kept apart

| Object | Definition | Governance role |
|---|---|---|
| **raw seed value** | the integer passed as `agentSeed` and written to provenance | identity equality: `(namespace, value)` |
| **normalized seed** | `raw >>> 0`. Every derivation is a function of it | two raw values congruent modulo 2³² are indistinguishable at runtime (K1) |
| **derived stream seed** | per stream, `((raw ^ c) >>> 0) \|\| 1` — the initial mulberry32 state | **the governance identity of a stochastic source (lag 0)** |
| **stochastic stream** | the draw sequence: a segment of the single 2³² cycle starting after the derived seed | **not governable without a draw budget** (§9) |
| **configuration identity** | `(config, configSeed)` → `makeConfig(configSeed >>> 0, index)`, 756 draws on the same cycle | a separate namespace. Separation is administrative: numbers are **not** guaranteed disjoint (Ev-7) |
| **realised trajectory** | an arm-dependent **outcome** of configuration, streams and arm; fingerprinted after the fact | never a governance input (K5) |

> The ruling asked for five concepts. Source forced six: "trajectory identity" splits into the
> *seed that sources it* and the *realised trajectory*, which M31 showed is one-to-many across arms.

---

## 4. Decision

### 4.1 Proposal A — Case D: **ADOPTED, with three refinements**

| Proposal clause | Audit | Result |
|---|---|---|
| different study + same source refused by default | agrees with M32 §8.3 and §12.2 | **kept** |
| explicit, recorded, study-specific authorization before use | defensible: a deliberate replication may need identical randomness | **kept** |
| "identity unambiguous" | an authorization naming `v` must **not** cover `v + 2³²` (same source, different recorded value) | **refined: exact raw value only** (D8) |
| (unstated) scope of an authorization | a grant `H → S` must not let a third study in | **refined: pair-specific** (D7) |
| (unstated) categories | M32 §11 forbids category transitions in every direction | **refined: an authorization cannot bridge categories** (D9) |
| "created before use" | code cannot see commit times, but the registry is committed data consulted by `checkUse` **before** a run | **structural**: no authorization in the registry, no permission. A future collection gate must also check that the authorizing commit precedes the first artifact (§8) |

### 4.2 Proposal B — stochastic-source identity: **ADOPTED at lag 0, and shown INCOMPLETE beyond it**

| Proposal clause | Audit | Result |
|---|---|---|
| identity from derived stochastic sources, not raw integers | correct: Ev-1 | **kept** |
| (unstated) what "same source" means | lag-0 coincidence of any derived seed is decidable before a run | **governance identity** |
| (unstated) overlap at non-zero lag | real (Ev-3), frequent at C × R scale (Ev-5), crosses namespaces (Ev-7) | **not decidable without a draw budget → §9** |

### 4.3 A defect the audit found, repaired

Ev-9: inside one study, a *different* raw value sharing a source was returned as `REPRODUCTION`. A
C × R replicate list containing both `5` and `5 + 2³²` would have counted **one source as two
replicates** — pseudo-replication. It is now `ALIASED_SOURCE` (D10, D11), and a registry cannot even
be constructed with such records (I2).

---

## 5. Exact rule

For a trajectory identity `t` and a use `{study S, category k, arm?, configSeed?}`:

| # | Rule |
|---|---|
| **R0** | `t` must be a typed trajectory identity; `configSeed`, if given, a typed configuration identity. Otherwise **refuse** (`UNTYPED_SEED`, `INVALID_NAMESPACE`) |
| **R1** | if `t`'s source is held out → **refuse** `HELD_OUT` |
| **R2** | *prior uses* = every record whose derived stream seeds coincide with `t`'s in **any** stream |
| **R3** | a prior use by **another study** is permitted only if its raw value equals `t.value` **and** an authorization for exactly that value and that study pair exists. Otherwise **refuse** `CONSUMED_BY_OTHER_STUDY` |
| **R4** | a prior use by **S** with a **different** raw value → **refuse** `ALIASED_SOURCE` |
| **R5** | any prior use in a category other than `k` → **refuse** `CATEGORY_TRANSITION` |
| **R6** | otherwise: prior use by S → `REPRODUCTION`; prior use only by authorized studies → `AUTHORIZED_REUSE`; none → `AVAILABLE` |
| **R7** | arm and configuration are validated but are **not** part of the consumption identity |
| **R8** | a registry cannot be constructed that violates R3–R5 in its own data, nor with an authorization issued by a study that does not hold that exact value |
| **L1** | **overlap of two streams at a non-zero lag is NOT governed by this rule** (K4 pins it) |

Committed authorizations: **none.**

| Case | Decision | Check |
|---|---|---|
| same study, same raw value | REPRODUCTION | D1 |
| same study, ARMED and ABLATED | REPRODUCTION | D2 |
| same source across configurations | 5 AVAILABLE, 25 REPRODUCTION | D3 |
| different study, no authorization | CONSUMED_BY_OTHER_STUDY | D4 |
| different study, authorized, exact value | AUTHORIZED_REUSE | D5 |
| after authorized reuse: holder and authorized study rerun | REPRODUCTION, both | D6 |
| third study | CONSUMED_BY_OTHER_STUDY | D7 |
| alias of the authorized value | CONSUMED_BY_OTHER_STUDY | D8 |
| authorized, different category | CATEGORY_TRANSITION | D9 |
| same study, raw alias (`5+2³²`, `0`/`1`) | ALIASED_SOURCE | D10, D11 |
| production alias `3080949816` → new study, and → its own lineage | CONSUMED_BY_OTHER_STUDY; ALIASED_SOURCE | D12 |

---

## 6. Implementation changes

| Path | Change |
|---|---|
| `experiments/registry/typed.js` | authorizations in `createTrajectoryRegistry`; rules R3–R6 and R8; `ALIASED_SOURCE` and `AUTHORIZED_REUSE`; `TRAJECTORY_AUTHORIZATIONS = []`; the six-object comment. **Records unchanged** (R2) |
| `experiments/m33/verify.js` | **source-bound** to `typed.js` at `3fb2876`, so it keeps certifying M33 as committed; context and importer scan exported for reuse; lazy temp directory. **No check changed** |
| `experiments/m33/verify_r1.js` | **new** — independent R1 verifier |
| `research/preregistrations/M33_R1_GOVERNANCE_RULING.md` | **new** — this memo |
| `research/preregistrations/verify_m33_r1.js` | **new** — binds this memo to an executed R1 run |

---

## 7. Verification results

`node experiments/m33/verify_r1.js` — **114/114 passed, 0 failed.**

- **The M33 suite is re-run in full against the R1 module:** R1 must not weaken any M33 property.
- **R1 suite:** K1–K5 (the objects), H1–H4 (historical and lag evidence), D1–D12 (the rule), I1–I7
  (construction integrity), N1–N2 (namespace confusion, raw misuse, fail-closed decisions), R1–R2
  (committed state).
- **Integrity:** P1–P5.

### Mutations — every mutant runs against both suites

| Mutant | Outcome |
|---|---|
| MU1 remove namespace checking | caught by C9, N3, N4, N5, N6, N7, N8, N14 |
| MU2 collapse config and trajectory namespaces | caught by M0 |
| MU3 wrong-namespace refusal returns false | caught by C9, N3, N4, N5, N6, N7, N8, N14 |
| MU4 per-value trajectory consumption | caught by T1, T2, T3, T6, T7, T13, D1, D2 |
| MU5 study removed from the consumption identity | caught by T4, T13, T14, D4, D5, D7, D8, D9 |
| MU6 raw integer silently acquires the caller namespace | caught by C9, N10, N1 |
| MU7 weaken the configuration held-out floor | caught by C1, C2, C3, C5, C8 |
| MU8 weaken consumed protection | caught by C1, C2, C5 |
| MU9 arm becomes part of the consumption identity | caught by T1, T3, D2, D3 |
| MU10 configuration becomes part of the consumption identity | caught by T1, T2, D3 |
| MU11 aliasing ignored (raw-value source identity) | caught by T13, T14, D8, D10, D11, D12, I2, I5 |
| MU12 degenerate stream seeds not mapped to 1 | caught by T12, T14, K2, D10, I2 |
| MU13 held-out not enforced on use | caught by T8 |
| MU14 held-out/consumed exclusivity not asserted | caught by T9 |
| MU15 category transitions allowed | re-expressed as RM11, caught by T7, D9 |
| MU16 forged object literals accepted | caught by N10, N1 |
| MU17 identity coercible to a number | caught by N11, N12 |
| MU18 held-out checked on raw value, not source | caught by T8 |
| MU19 duplicate (value, study) records accepted | survives — second guard; RM15 caught by T9, I2 |
| MU20 committed M31 record set altered | caught by R1, R2 |
| MU22 non-integer values accepted as identities | caught by C4 |
| MU21 no-op control (semantics unchanged) | no-op control survives |
| RM1 same-study alias treated as reproduction | caught by D10, D11, D12 |
| RM2 authorization ignored | caught by D5, D6, D9 |
| RM3 authorization not pair-specific | caught by D7 |
| RM4 authorization covers aliases | survives — second guard; RM16 caught by D8 |
| RM5 authorization bridges categories | caught by D9 |
| RM6 construction accepts unauthorized sharing | caught by I1 |
| RM7 construction accepts aliased records in one study | caught by I2 |
| RM8 authorization direction one-way | caught by D6 |
| RM9 authorization issuer need not hold the value | caught by I3 |
| RM10 authorized reuse reported as AVAILABLE | caught by D5 |
| RM11 category rule removed | caught by T7, D9 |
| RM12 duplicate authorizations accepted | caught by I4 |
| RM13 self-authorization accepted | caught by I4 |
| RM14 no-op control (semantics unchanged) | no-op control survives |
| RM15 both duplicate-record guards removed | caught by T9, I2 |
| RM16 both exact-value authorization guards removed | caught by D8 |

**Fail-closed rules for the harness:**
- A mutant that cannot construct its own committed registry is caught by the named load check **M0**.
  Any other load error is a harness defect and fails the run.
- A single-guard mutant may survive only if R1 gave that property a **second, independent guard**, and
  the combined mutant removing **both** guards is caught. MU19 and RM4 are the only such cases.
- `MU15`'s anchor no longer exists in R1; it is re-expressed as `RM11` and must be caught there.

---

## 8. Historical integrity

| Item | Result |
|---|---|
| registered seeds consumed | **0** |
| `895000–895999` | still unconsumed — **not repaired** (P5) |
| registry, five protocols, `main.js`, `rng.js`, M7 runtime | byte-identical to base `976904b` (P3) |
| C1 changed | **NO** |
| UQ-B changed | **NO** |
| production changed | **NO** |
| committed trajectory records | byte-for-byte those of M33 (R2) |
| M33 verifier, source-bound | 69/69 on `typed.js` at `3fb2876` |
| M8 / Q1 / UQ-A / UQ-B / C1 lineage vs lagged overlap | production seed overlaps **no** historical configuration stream (H4) |
| pushed | **NO** |

**Inference on the two M31 overlaps (Ev-7).** M31 ran only fixtures `896066` and `896238`. So the
overlapping configurations `897104` and `899774` were never built inside any run that used those
trajectory seeds, and the visual stream is render-only. **No recorded result is affected.** This
rests on M31's fixture list, not on a new run.

**Future collection gate requirement (not implemented here — no collection is authorized):** check
that any authorizing commit is an ancestor of the first artifact it permits.

---

## 9. The unresolved question — stated exactly, not guessed

> **Q-LAG.** For a study whose replicate unit is the trajectory seed (C × R), must the consumed stream
> segments of distinct trajectory seeds — and of configuration seeds, which share the same mulberry32
> cycle — be **disjoint**? If yes, what per-run draw budget `N_max` defines a reserved segment?

**Why governance cannot answer it:**
- **The draw count is an outcome.** 94,510 is the largest of 24 recorded runs (12 cells × 2 arms),
  not a bound, and
  different arms consume different counts (71,610 vs 88,299 in one M31 cell).
- **Choosing `N_max` is choosing a threshold,** which this programme reserves for preregistration.
- **Whether lagged reuse matters is a statistical-dependence question.** Draws are consumed
  state-dependently, so shared numbers at a lag need not correlate outcomes. That is plausible, not
  shown.

**What each answer would require:**

| Answer | Consequence |
|---|---|
| lagged overlap is acceptable for the C × R estimand | L1 is recorded as accepted; M33 → GREEN; no code change |
| disjoint segments are required | a preregistered `N_max`, segment-level allocation in `checkUse`, and an executed draw-count check at collection — an M33-R2 governance amendment |
| streams must be independent by construction | an RNG change — **production**, out of scope without separate authorization |

**What Q-LAG does not affect:** the configuration-namespace accounting behind `895000–895999`. That
repair records which configuration values are spent. It does not allocate trajectory segments, and
the production seed overlaps no historical configuration stream (H4).

---

## 10. Status

> # M33-YELLOW
> **Governance rule closed (§5). Same-study aliasing defect repaired. One scientific question open:
> Q-LAG (§9).**

Not GREEN: L1 is a known, quantified limitation whose acceptability needs a scientific ruling. Not
HOLD: no governance semantics are unresolved, every refusal fails closed, and the historical record
is unaffected (H4). Not RED.

---

## 11. Exact next best decision

> ## Independent scientific review of Q-LAG (§9)
> Accept lagged overlap for the C × R estimand (→ GREEN), or require disjoint segments with a
> preregistered `N_max` (→ M33-R2).

**In parallel, recommended:** authorize the `895000–895999` configuration-namespace accounting repair
as its own commit. Q-LAG does not touch it (§9). **Not recommended:** any C × R preregistration or
collection before Q-LAG is ruled.

---

Believe in yourself and keep going
