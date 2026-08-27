# M7 Pre-Registration — Erratum 01

**Erratum ID:** M7-ERR-01
**Date:** 2026-08-19
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-08-19 authorising a separate erratum addendum (option (a) of [`M7_GATE_SEMANTICS_AUDIT.md`](M7_GATE_SEMANTICS_AUDIT.md) §6.3).

**Binds to frozen artifact:**

| | |
|---|---|
| Document | [`M7_PREREGISTRATION.md`](M7_PREREGISTRATION.md) v1.0 (frozen 2026-08-19) |
| **SHA-256** | **`2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9`** |
| Sidecar | [`M7_PREREGISTRATION.sha256`](M7_PREREGISTRATION.sha256) |
| Verify | `cd research/cognitive-audit && sha256sum -c M7_PREREGISTRATION.sha256` |

> **THE FROZEN PRE-REGISTRATION IS NOT MODIFIED BY THIS ERRATUM.** Its bytes and its digest are unchanged. This document supersedes exactly one clause of it, named verbatim in §2, and defines one replacement gate metric in §4. Everything else in the frozen document remains in force exactly as written.

---

## 1. Why an erratum rather than a re-freeze

The frozen pre-registration contains an **internal contradiction**: two of its own clauses are mutually unsatisfiable, so no implementation can make gate G16 green. The defect was present **at freeze**, not introduced by implementation.

Frozen §0.1 states the standing rule: *"If G16 fails, the correct response is to fix the implementation to match this document — never to amend this document to match the implementation."* **That rule cannot be applied here**, because the implementation is correct and matches frozen §13.1 exactly; it is the document that conflicts with itself.

Detecting the contradiction required executing the gate, which by design could only happen **after** the freeze — the ordering the Director mandated. The ordering worked: it surfaced a protocol defect at the earliest moment it was detectable, and before any experimental data existed.

An erratum is used instead of a re-freeze so that:

- the original digest `2f12e309…f6b9` continues to validate, preserving the audit trail;
- every clause other than the one superseded here retains the property of having been fixed **before** the source implementation;
- the correction itself is dated, attributable, and separately reviewable.

**This erratum is issued before any Stage-1 or confirmatory run.** No experimental data exists. Nothing here is informed by outcomes.

---

## 2. The contradiction, stated exactly

Two clauses of the frozen document, quoted verbatim.

**Clause A — frozen §13.1 (the mandated source change):**

> ```js
> // current (rectified — discards all evidence that an edge is BAD)
> const trustBonus = Math.max(0, bayesianTrust - 0.5) * 8;
>
> // approved (symmetric)
> const trustBonus = (bayesianTrust - 0.5) * 8;
> ```
>
> Single line, `render/scoring.js:184`. Magnitude preserved; enters the M1 term array with weight `1.5`, giving an effective slope of **±12 per unit trust**.

**Clause B — frozen §13.4, gate G16.3 (verbatim, all three sub-clauses):**

> | **G16.3** | **No unrelated coefficients change** | Every other term derivative **bit-unchanged** (reuse `verify_S1.js` S1.3a machinery over the full NEG ∪ POS set); `lastArbitrationBreakdown` bit-identical across ≥ 20 000 contexts; module export surface unchanged |

### 2.1 Why they cannot both hold

`lastArbitrationBreakdown` is constructed at [`render/scoring.js:394`](../../render/scoring.js:394) and has six fields. `trustBonus` appears in exactly three places in the module:

| Line | Site | Role |
|---|---|---|
| 183 | `const trustBonus = …` | definition — **the subject of Clause A** |
| 358 | `['trustBonus', trustBonus * 1.5]` | term array → `finalWeight` |
| **411** | `trustBonus * 1.5 +` | **summand of `confidenceScore`** |

Clause A changes `trustBonus` for every `bayesianTrust < 0.5`. `confidenceScore` contains `trustBonus * 1.5` **by construction**. Therefore `lastArbitrationBreakdown` **must** differ on any context set spanning `bayesianTrust < 0.5`.

Clause B's context generator draws `bayesianTrust ~ U(0,1)`, so roughly half its contexts fall in that half-domain.

> **Clause A and Clause B are mutually unsatisfiable. G16 as frozen can never go green.**

### 2.2 Measured confirmation

20 000 randomised contexts, pre- vs post-rectification builds:

| Field | Contains `trustBonus` | # differ | `t < 0.5` (9 997) | `t ≥ 0.5` (10 003) |
|---|---|---|---|---|
| `rewardScore` | no | **0** | 0 | 0 |
| `semanticScore` | no | **0** | 0 | 0 |
| **`confidenceScore`** | **YES** | **9 997** | 9 997 | **0** |
| `curiosityScore` | no | **0** | 0 | 0 |
| `costScore` | no | **0** | 0 | 0 |
| `schemaScore` | no | **0** | 0 | 0 |

The divergence equals the analytic value of Clause A to within **5.33 × 10⁻¹⁵**. The other two sub-clauses of G16.3 (term derivatives; export surface) **both pass** and are retained unchanged.

---

## 3. ERRATUM 1 — G16.3 breakdown sub-clause superseded

### 3.1 What is superseded

**Only** the middle sub-clause of frozen G16.3:

> ~~`lastArbitrationBreakdown` bit-identical across ≥ 20 000 contexts~~

The other two sub-clauses of G16.3 remain **in force, unchanged**:

- *"Every other term derivative **bit-unchanged** (reuse `verify_S1.js` S1.3a machinery over the full NEG ∪ POS set)"* — **retained** (currently passing, 28 terms)
- *"module export surface unchanged"* — **retained** (currently passing)

### 3.2 The replacement requirement — G16.3′

Across ≥ 20 000 randomised contexts with `bayesianTrust ~ U(0,1)`, comparing the pre-rectification reference arm against the live build, **all five of the following must hold**:

| | Requirement |
|---|---|
| **G16.3′(1)** | `rewardScore`, `semanticScore`, `curiosityScore`, `costScore` and `schemaScore` are **bit-identical** in every context. |
| **G16.3′(2)** | `confidenceScore` may differ **only** by the analytically predicted trust-term delta, defined in §3.3. No other source of difference in this field is permitted. |
| **G16.3′(3)** | For every context with **`bayesianTrust ≥ 0.5`**, the **complete breakdown** — all six fields, `confidenceScore` included — is **bit-identical**. |
| **G16.3′(4)** | For every context with **`bayesianTrust < 0.5`**, the **observed delta equals the expected delta** of §3.3 within the fixed tolerance of §3.4. |
| **G16.3′(5)** | **No other field and no coefficient may change.** Any difference outside the single permitted delta in the single permitted field fails the gate. |

### 3.3 The analytically predicted delta

```
trustBonus_pre  = 8 · max(0, t − 0.5)          where t = bayesianTrust
trustBonus_post = 8 · (t − 0.5)

Δ_expected(t) = 1.5 · (trustBonus_post − trustBonus_pre)
              = 12 · min(0, t − 0.5)
```

Equivalently: `Δ_expected = 0` for `t ≥ 0.5`, and `Δ_expected = 12·(t − 0.5)` for `t < 0.5`. The factor `1.5` is the term-array weight fixed by frozen §13.1; the factor `8` is the in-term coefficient, likewise fixed. **Neither is introduced by this erratum.**

The requirement is:

```
confidenceScore_post − confidenceScore_pre  ==  Δ_expected(bayesianTrust)
```

### 3.4 Fixed numerical tolerance

> **1 × 10⁻¹² absolute**, applied only to G16.3′(4).

Pinned here, before implementation of the check. Chosen as roughly two orders of magnitude above the observed worst-case floating-point deviation (5.33 × 10⁻¹⁵) and far below any coefficient-scale error the gate must catch: the smallest meaningful term coefficient in the module is of order 10⁻¹, so a real coefficient defect would exceed this tolerance by more than ten orders of magnitude. G16.3′(1) and (3) require **exact** equality and admit no tolerance.

### 3.5 Why G16.3′ is stronger than the clause it replaces

The superseded clause asserted only *"nothing changed."* Once the approved repair landed it began failing unconditionally, and could therefore no longer distinguish **"the repair landed exactly where it should"** from **"the repair leaked somewhere it should not"** — it reports both as RED. That is a loss of discriminating power, not a safeguard.

G16.3′ asserts *"exactly the approved quantity changed, in exactly one field, by exactly the analytic amount, and nothing else moved at all."* It detects:

- a leak into any of the other five fields — G16.3′(1), (5)
- a wrong in-term coefficient or term weight — G16.3′(4)
- a wrong hinge point — G16.3′(3), (4)
- any bleed into the `t ≥ 0.5` half-domain, which the repair must leave untouched — G16.3′(3)

None of these were detectable by the superseded clause once it began failing.

### 3.6 Anti-vacuity (frozen §13.6 remains in force)

Frozen §13.6 requires that every assertion claiming to detect the repair be demonstrated to **fail** against the pre-change build. Applied to G16.3′: assertion **(4)** must fail against a build where the rectification was not applied, since there `Δ_observed ≡ 0` while `Δ_expected < 0` for all `t < 0.5`. The gate reports both runs.

---

## 4. ERRATUM 2 — S3.2 replacement metric defined

### 4.1 Status of S3.2

S3.2 is an **M5 gate assertion** in [`experiments/phase1_0/verify_S3.js`](../../experiments/phase1_0/verify_S3.js), not a clause of the frozen pre-registration. The frozen document references it only descriptively (§1.1 baseline table; the F2b rate in §9.1; gate G8). **This erratum defines a replacement; it does not implement one, and `verify_S3.js` is not modified.**

### 4.2 The defect in the original threshold

```js
const PRE_STALE = 67, PRE_STEPS = 381;      // measured pre-fix, same seed/ticks
ok('S3.2  stale executions cut by >=70% vs the pre-fix baseline',
   lo.stale <= PRE_STALE*0.3, `${PRE_STALE} -> ${lo.stale}`);
```

`lo` is **one** run at **one** seed (20260818, 80 ticks, natural epsilon). Threshold: `stale ≤ 20.1`.

`stale = steps − decisions` — steps on which `runPrediction` did not run. The only mechanism producing it is the replay branch at [`main.js:3170`](../../main.js:3170), i.e. **F2b, which is deliberately unrepaired** (frozen §1.3, Ruling Q3). Replay-branch occupancy is **policy-dependent**, and the approved rectification changes the policy by design.

Measured across a six-seed panel, natural epsilon:

| seed | PRE-RECT | POST-RECT |
|---|---|---|
| 20260818 | 17/380 (4.5%) | **26/386 (6.7%)** |
| 31337 | 17/385 (4.4%) | 4/380 (1.1%) |
| 31338 | 10/388 (2.6%) | 8/388 (2.1%) |
| 777 | 11/379 (2.9%) | 0/367 (0.0%) |
| 4242 | 14/378 (3.7%) | 7/380 (1.8%) |
| 90210 | **29/384 (7.6%)** | 20/385 (5.2%) |
| **mean** | **16.33** | **10.83** |
| **seeds over threshold** | **1 / 6** | **1 / 6** |

> **The original threshold is non-discriminating between the pre- and post-rectification builds.** Both exceed it on exactly one of six seeds — the pre-rectification build on seed 90210, the post-rectification build on seed 20260818. It discriminates between *seeds*, not between *builds*. The rectified build is in fact **better on average** (mean 10.83 vs 16.33, a 34% reduction).

### 4.3 The replacement — S3.2′, a fixed pre-declared seed-panel metric

**Pre-declared seed panel (fixed by this erratum, before any Stage-1 run):**

```
{ 20260818, 31337, 31338, 777, 4242, 90210 }        ticks = 80, natural epsilon
```

**S3.2′(a) — causal F2 invariant, retained.** With epsilon pinned high, **`stale == 0` on every seed in the panel.**

This is the property that F2 actually repaired: the epsilon path writing `lastReasoning` before execution. It is **policy-invariant** — it holds regardless of what the agent's policy does, because forcing exploration forces `runPrediction` on every step.

*Current status: satisfied 6/6 on both builds. The pre-F2-fix build produced 40.9% under this condition, so the invariant discriminates exactly the defect M5 repaired.*

**S3.2′(b) — robust aggregate residual diagnostic.** At natural epsilon, the **median** stale rate across the panel must be **≤ 30% of the pre-fix baseline rate of 17.6%**, i.e. **≤ 5.28%**.

*Current status: PRE-RECT median 4.1%; POST-RECT median 1.95%. Both satisfy it. The pre-F2-fix build at 17.6% does not.*

### 4.4 Why this is the minimum sufficient replacement

- **(a)** tests the causal mechanism directly and cannot be moved by policy change — it is the invariant S3.2 was reaching for.
- **(b)** preserves the original's ≥70%-reduction intent while replacing a single-seed point estimate with a **median over a fixed panel**, so ordinary policy-induced variance in F2b occupancy cannot flip the verdict, while a genuine F2 regression still would (it would raise the median across all seeds simultaneously).
- Together they separate *"F2 broke"* from *"the policy changed"* — the discrimination the original could not make, and got wrong.

### 4.5 Declared limitation of the panel

The six seeds were exercised during the gate-semantics audit, so they are **not naïve**. This is acceptable because S3.2′ is a **deterministic verification gate, not a statistical inference**: it asserts a fixed property of a build, contributes to no hypothesis test, and enters no confirmatory family. It is recorded here rather than left implicit.

---

## 5. What this erratum does NOT change

Explicitly unaffected. Every item below stands exactly as frozen.

| Category | Status |
|---|---|
| **Frozen document bytes and digest** | **Unchanged.** `2f12e309…f6b9` still validates |
| Hypotheses H1, H0, **H1-strict** | Unchanged |
| Competing hypotheses A–E and their signatures | Unchanged |
| Environment definition, hidden variable, `p_e`, R1–R5, reliability shift | Unchanged |
| **Seven experimental arms** A1–A7, controls locked | Unchanged |
| Paired-seed procedure, seed blocks | Unchanged |
| Primary metric, secondary metrics, all link-①–⑤ definitions | Unchanged |
| **Analysis windows** W1–W4; W1/W3 primary, W2/W4 descriptive | Unchanged |
| Confirmatory family = **6**, Holm correction, α = 0.01 | Unchanged |
| Bootstrap/permutation seeds 770001/770002/770003, BCa, clustering | Unchanged |
| **Stage-1 → power → Stage-2 procedure**, n grid, selection rule | Unchanged |
| **Hard cap of 4200 runs** and the over-cap reporting rule | Unchanged |
| Falsification criteria F-1…F-11, §15.0 equivalence definition | Unchanged |
| Abandonment and escalation criteria | Unchanged |
| **Claim ceiling and forbidden-word list** (§17) | Unchanged |
| **D2 — unrepaired** (Ruling Q4) | Unchanged |
| **F2b — unrepaired** (Ruling Q3) | Unchanged |
| D8/F12, D12 — unrepaired | Unchanged |
| `learningAuthority ≡ 1.0`, `dampQ` disabled, G12 anti-vacuity | Unchanged |
| Gates G1–G6, G8–G15; G16.1, G16.2, G16.4, G16.5 | Unchanged |
| Exclusion rules and dual filtered/unfiltered reporting | Unchanged |

**Scope of this erratum in one sentence:** it supersedes one sub-clause of one gate, and defines a replacement for one M5 gate assertion. It touches no hypothesis, no arm, no metric, no window, no sample-size rule, and no claim.

---

## 6. Factual notes — figures that shift under the rectified build

Recorded so no reader mistakes them for contradictions. **None invalidates any protocol rule.**

| Frozen reference | Note |
|---|---|
| §1.1 baseline table: *M5 `verify_S3.js` **9/9*** | Accurate for the build it describes. Frozen §1 binds explicitly to *"HEAD + M1–M6, **Not present**: … trust rectification."* Against the **rectified** build the same gate reports 8/9 via S3.2, for the reasons in §4.2. The frozen statement remains true of the frozen baseline. |
| §9.1: F2b *"stale-execution rate **4.5%** (17/380)"* | A **pre-rectification** measurement. Under the rectified build the rate differs by seed (0.0%–6.7% across the panel). **The exclusion rule is unaffected**, because frozen §9.2 already defines exclusion **by the emitted `staleExecution` flag**, and frozen §9.1 explicitly states *"the exclusion rule must be defined by the emitted flag rather than by either nominal rate."* The frozen document anticipated this. |
| Gate **G8**: *"stale rate reproduces `verify_S3.js` S3.2 on the same seed"* | **Remains satisfiable and unchanged.** G8 compares two measurement paths **on the same build**, not against a frozen constant. Both would report the same figure for whichever build is under test. |

---

## 7. Implementation status

**NOT IMPLEMENTED.**

- `render/scoring.js` retains the approved §13.1 rectification and nothing else; it differs from the frozen reference arm by exactly one line.
- `verify_G16.js` has **not** been updated to G16.3′.
- `verify_S3.js` has **not** been modified; S3.2 stands as originally written.
- `verify_S1b.js` has **not** been modified; S1.7 stands as originally written.
- No Stage-1 or confirmatory run has been executed. No `experiments/m7/` exists.

Implementing G16.3′ and S3.2′ requires separate Director authorisation. Until then G16 remains RED against its frozen wording, and that RED is now **explained and documented** rather than unexplained.

---

## 8. Erratum register

| ID | Supersedes | Replacement | Status |
|---|---|---|---|
| **M7-ERR-01a** | Frozen §13.4 G16.3, middle sub-clause (`lastArbitrationBreakdown` bit-identity) | **G16.3′(1)–(5)**, §3.2, tolerance 1 × 10⁻¹² | Defined, not implemented |
| **M7-ERR-01b** | `verify_S3.js` gate S3.2 single-seed residual threshold | **S3.2′(a)–(b)**, §4.3, fixed six-seed panel | Defined, not implemented |

---

## STATUS: ERRATUM ISSUED · FROZEN DOCUMENT UNMODIFIED · NOT IMPLEMENTED

The frozen pre-registration `M7_PREREGISTRATION.md` and its sidecar `M7_PREREGISTRATION.sha256` were not modified. Digest `2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9` validates unchanged. No gate file, no unrelated source file, and no experimental parameter was altered. Nothing committed, nothing pushed.
