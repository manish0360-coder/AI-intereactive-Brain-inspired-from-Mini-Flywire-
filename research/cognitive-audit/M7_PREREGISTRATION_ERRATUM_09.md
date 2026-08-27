# M7 Pre-Registration — Erratum 09

**Erratum ID:** M7-ERR-09

**Date:** 2026-08-26
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-08-26 — *Seed-Diversity Authorization Audit, Path A2 selected*, following the G15 seed-diversity authorization audit and the accepted M7-G15.3 milestone.

**Binds to frozen artifact:**

| | |
|---|---|
| Document | [`M7_PREREGISTRATION.md`](M7_PREREGISTRATION.md) v1.0 (frozen 2026-08-19) |
| **SHA-256** | **`2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9`** |
| Sidecar | [`M7_PREREGISTRATION.sha256`](M7_PREREGISTRATION.sha256) |
| Verify | `cd research/cognitive-audit && sha256sum -c M7_PREREGISTRATION.sha256` |

> **THE FROZEN PRE-REGISTRATION IS NOT MODIFIED BY THIS ERRATUM.** Its bytes and its digest are unchanged, verified immediately before and immediately after. This erratum **adds bounded gate-diagnostic material**; it supersedes no measurement definition, no threshold, and no acceptance criterion. Everything else in the frozen document remains in force exactly as written.

---

## 0. Purpose, stated first

Gate **G15** ("goal-reward eligibility rate shows no systematic dependence on `p_e`", frozen §14, §10.4) is implemented and accepted as **M7-G15.3**. Its measurement definition is correct and is **not at issue here**.

G15.3 returned **INCONCLUSIVE** for one reason only: the configuration-seed material the frozen protocol allocates does not contain enough independent reliability variation to satisfy G15.3's own information-sufficiency requirement. This erratum authorises the **maximum remaining pre-held-out, previously unallocated** configuration-seed material, so that the already-implemented gate can return **PASS or FAIL** rather than INCONCLUSIVE.

**No scientific definition is created, altered, or weakened by this erratum.** It supplies *material*, not *meaning*.

---

## 1. The clause at issue

Frozen §5.1, the pilot-configuration row, quoted verbatim:

> | Pilot configurations | `900000–900004` | 5 configs. Tuning permitted **in Stage 1 only** |

This row allocates configuration seeds for Stage-1 pilot runs. It was written before G15 had an operational definition, so it could not have anticipated a gate whose evaluation requires *independent reliability variation across configurations*.

The clause is **not withdrawn and not superseded.** `900000–900004` remains the pilot-configuration block for every purpose the frozen document assigns to it. This erratum adds a **separate, differently-classified** block for gate diagnostics only.

---

## 2. The demonstrated insufficiency

Read-only measurement, no agent booted, no seed at or above `900500` generated or inspected:

| Material | Authority | Configuration samples | Distinct full-edge `p_e` vectors | Distinct `mean_p_e` exposures |
|---|---|---|---|---|
| Frozen §5.1 pilot block `900000–900004` | frozen §5.1 | 20 | **3** | **3** |
| ERR-06 §4.1 / ERR-07 §3.1 pilot-adjacent block `900000–900029` | ERR-06, ERR-07 | 120 | **4** | **4** |
| **G15.3 requires** | M7-G15.3 §E | ≥ 20 | **≥ 10** | **≥ 5** |

Root cause, measured: acceptance under the complete ERR-07 predicate is rare — **1 of 30** seeds in `900000–900029` is directly accepted — so deterministic sequential rejection sampling collapses many distinct start seeds onto very few accepted configurations. Across the whole span `900000–900160` only **four** accepted configurations exist (`900000`, `900014`, `900074`, `900160`).

Widening the *start* range within already-authorised material by six-fold yields exactly **one** additional exposure. The existing allocation is therefore exhausted, and the deficit is structural rather than incidental.

### 2.1 Why this is not an implementation defect

The situation is the one M7-ERR-01 §2 already recognised in another form: a limitation **present at freeze**, which no correct implementation can remove. G15.3 is correct; the seed architecture cannot supply what the gate lawfully requires. Frozen §0.1's standing rule — *"fix the implementation to match this document"* — has no application, because there is nothing wrong with the implementation.

---

## 3. The ruling

> ### **A bounded, gate-diagnostic, pilot-only configuration-seed candidate range is authorised: `900030–900499` inclusive.**

### 3.1 Classification of the new material

The range is **gate-diagnostic and pilot-only**. It carries exactly the status M7-ERR-01 §4.5 established for non-naïve gate material:

> *"This is acceptable because S3.2′ is a **deterministic verification gate, not a statistical inference**: it asserts a fixed property of a build, contributes to no hypothesis test, and enters no confirmatory family."*

Accordingly, configurations drawn from `900030–900499`:

- enter **no** hypothesis test and **no** confirmatory family;
- are **not** Stage-1 data and do not alter Stage-1 data;
- are **not** pilot configurations in the frozen §5.1 sense and do not extend that block;
- produce **gate verdicts only**.

### 3.2 Binding boundaries

1. Every candidate seed evaluated for this purpose must satisfy `900030 ≤ seed ≤ 900499`.
2. **No seed `≥ 900500` may be generated, inspected, or reached**, by an acceptance walk or by any other means. ERR-07 §2 established that `900500` begins a *forward, unbounded* held-out candidate stream, so the upper bound is a hard boundary and must be asserted mechanically, not assumed.
3. `900005–900009` remains reserved for the **single** F-11 pilot extension (frozen §15.0) and is **not** repurposed. Measurement confirms it would contribute no additional diversity in any case.
4. Existing pilot and diagnostic material (`900000–900029`) remains historical and unchanged.
5. No confirmatory agent seed (`20260819100–20260819119`) may be used.
6. The candidate range is a **bound, not a guarantee**. It does not assert that the required diversity exists inside it.

### 3.3 Enumeration discipline

Because boundary 2 is a hard limit and the canonical acceptance walk is unbounded in the forward direction (ERR-07 §2, which deliberately removed `maxTries`), candidates in this range are evaluated **directly at their own seed** — `makeConfig(seed, configIndex)` followed by the complete, unchanged acceptance predicate `cfg.accepted` — rather than by a forward walk.

This is not a change to the acceptance criterion. `cfg.accepted` is the identical conjunction the walk itself applies (`R1 ∧ R2 ∧ R3 ∧ R4 ∧ R5 ∧ G11`, per frozen §3.5 and ERR-07 §2). Direct evaluation is the same test, applied without the forward advance that would otherwise be able to cross `900500`.

### 3.4 Decision rule

Diversity is **measured, never assumed**, on each execution:

- If the accepted material yields **≥ 10 distinct full-edge `p_e` vectors AND ≥ 5 distinct `mean_p_e` exposures**, G15.3 proceeds to its existing, unchanged PASS/FAIL calculation.
- Otherwise G15 remains **INCONCLUSIVE**, and the verifier must report that the entire pre-held-out unallocated candidate space authorised by this erratum has been **exhausted**.

### 3.5 Finality

`900030–900499` is the **complete** remaining pre-held-out unallocated configuration-seed space. `900000–900029` is already allocated; `900500` onward is held-out. **This erratum therefore represents the final lawful pre-held-out seed-diversity authorisation.** If the diversity requirement is not met inside it, no further seed-range investigation is available and the matter returns to the Director as a structural question.

---

## 4. What is NOT changed

| Item | Status |
|---|---|
| Frozen pre-registration bytes and digest | **Unchanged** — `2f12e309…f6b9` |
| M7-ERR-01 … M7-ERR-08 | **Unchanged** |
| The hypothesis H1 and every confirmatory family | **Unchanged** |
| G15.3 measurement definition (configuration × phase) | **Unchanged** |
| G15 statistic (Spearman) and threshold (`\|ρ\| < 0.10`) | **Unchanged** |
| G15 information-sufficiency minima (10 vectors, 5 exposures) | **Unchanged — not weakened** |
| Phase stratification; stale/replay inclusion; no post-freeze exclusion (frozen §9.5) | **Unchanged** |
| Frozen §5.1 pilot block `900000–900004` | **Unchanged** — not extended, not reclassified |
| Frozen §15.0 F-11 extension `900005–900009` | **Unchanged** — reserved, not repurposed |
| Held-out stream from `900500` (frozen §5.1, ERR-07 §2) | **Unchanged** — never generated, never inspected |
| Confirmatory agent seeds `20260819100–119` | **Unchanged** — unused |
| Stage-1 data and the Stage-1 boundary | **Unchanged** |
| Production code | **Unchanged** — this erratum authorises no production change |

### 4.1 Why this is an authorisation and not a redesign

A redesign would alter what G15 measures or how strictly it is judged. This erratum does neither. The gate, its predictor, its unit of analysis, its statistic, its threshold, and its sufficiency minima are all exactly as accepted in M7-G15.3. Only the **quantity of lawful diagnostic material** available to it changes — and it changes within a bound that stops short of every reserved and held-out boundary in the protocol.

---

## 5. Erratum register — cumulative

| Erratum | Supersedes / adds | Implemented in |
|---|---|---|
| **M7-ERR-01** | Frozen §13.1 vs G16.3 contradiction; S3.2 replacement metric | `phase1_0/verify_G16.js`, `phase1_0/verify_S3prime.js` |
| **M7-ERR-02** | Application of S1.7 to the rectification | `phase1_0/verify_S1prime.js` |
| **M7-ERR-03** | Frozen §3.5 R5 objective | *superseded by ERR-04* |
| **M7-ERR-04** | ERR-03 §3.1 objective (saturating) | `m7/env.js` |
| **M7-ERR-05** | Frozen §18.3 E1 gate scope | `main.js`, `m7/verify_e1e2.js` |
| **M7-ERR-06** | Frozen G3, G6, G11 operationalisation | `main.js`, `m7/_armrun.js`, `m7/verify_M7.js` |
| **M7-ERR-07** | Frozen §3.5 acceptance predicate; §5.1/§12.3 held-out semantics; unfrozen `maxTries` | `m7/env.js`, `m7/verify_env.js`, `m7/verify_M7.js` |
| **M7-ERR-08** | Frozen §9.1 "not equal" clause and 4.5% attribution; §14 G8 sub-clauses (ii) and (iii) | `m7/verify_G8.js` |
| **M7-ERR-09** | **ADDS bounded gate-diagnostic configuration-seed candidate range `900030–900499`. Supersedes no clause.** | `m7/verify_G15.js` |

---

## STATUS: ERRATUM ISSUED · FROZEN DOCUMENT UNMODIFIED

Digest `2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9` validates unchanged. M7-ERR-01 … M7-ERR-08 are unchanged. No clause is superseded. The G15 INCONCLUSIVE verdict of 2026-08-26 is permanently recorded and is not retracted by this erratum; it is the finding that motivated it. No Stage-1, pilot, or confirmatory run. F-11 extension block untouched. Held-out stream from `900500` never generated and never inspected. Nothing committed, nothing pushed.
