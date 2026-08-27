# M7 Pre-Registration — Erratum 02

**Erratum ID:** M7-ERR-02
**Lineage:** extends [`M7_PREREGISTRATION_ERRATUM_01.md`](M7_PREREGISTRATION_ERRATUM_01.md) (M7-ERR-01a, M7-ERR-01b)
**Date:** 2026-08-19
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-08-19 — "OPTION 1 APPROVED — provenance-preserving supersession."

**Binds to frozen artifact:**

| | |
|---|---|
| Document | [`M7_PREREGISTRATION.md`](M7_PREREGISTRATION.md) v1.0 (frozen 2026-08-19) |
| **SHA-256** | **`2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9`** |
| Sidecar | [`M7_PREREGISTRATION.sha256`](M7_PREREGISTRATION.sha256) |
| Verify | `cd research/cognitive-audit && sha256sum -c M7_PREREGISTRATION.sha256` |

> **THE FROZEN PRE-REGISTRATION IS NOT MODIFIED BY THIS ERRATUM.** Its bytes and digest are unchanged, verified before and after the work this erratum authorises.

---

## 1. Scope — deliberately narrow

M7-ERR-01a superseded the breakdown bit-identity sub-clause **inside frozen gate G16.3**. The identical, equally unsatisfiable assertion exists in a **second, independent location**: gate **S1.7** in [`experiments/phase1_0/verify_S1b.js`](../../experiments/phase1_0/verify_S1b.js), which frozen gate **G16.5** requires to be green.

M7-ERR-01 did not reach S1.7, so G16 remained RED after that erratum was applied.

> **This erratum supersedes ONLY the APPLICATION of S1.7's universal breakdown bit-identity criterion to the approved M7 symmetric trust rectification.**

It does **not** retire S1.7, does not modify it, and does not weaken its original guarantee. S1.7 remains in force for every other purpose, and its historical result is preserved and reported.

---

## 2. The defect, restated for this location

The contradiction is identical to M7-ERR-01 §2 and is not re-derived here.

- Frozen **§13.1** mandates `trustBonus = (bayesianTrust - 0.5) * 8`.
- `confidenceScore` contains `trustBonus * 1.5` by construction ([`render/scoring.js:411`](../../render/scoring.js:411)).
- S1.7 asserts `lastArbitrationBreakdown` bit-identity across contexts drawn with `bayesianTrust ~ U(0,1)`.

Therefore S1.7 **cannot** hold once §13.1 is implemented. It is unsatisfiable for the same structural reason as the G16.3 sub-clause, in a different file.

**S1.7's original purpose** — established in [`M7_GATE_SEMANTICS_AUDIT.md`](M7_GATE_SEMANTICS_AUDIT.md) §1 — was **change-isolation for the M1/D3 five-sign repair**: proving that D3's edit to `finalWeight` did not leak into the `arbitrate()` diagnostic path. That purpose is **preserved in full** by the superseding criterion (§3), and is in fact re-proved by it against S1.7's own reference arm.

---

## 3. The superseding criterion — S1.7′

Implemented in [`experiments/phase1_0/verify_S1prime.js`](../../experiments/phase1_0/verify_S1prime.js). Semantically equivalent to G16.3′ of M7-ERR-01a.

| | Requirement |
|---|---|
| **S1.7′(1)** | The five non-trust breakdown fields — `rewardScore`, `semanticScore`, `curiosityScore`, `costScore`, `schemaScore` — remain **bit-identical**. |
| **S1.7′(2)** | For **`bayesianTrust ≥ 0.5`**, the **complete breakdown** remains **bit-identical**. |
| **S1.7′(3)** | For **`bayesianTrust < 0.5`**, **only `confidenceScore`** may differ. |
| **S1.7′(4)** | The observed delta equals **`12 · min(0, bayesianTrust − 0.5)`** within **1 × 10⁻¹² absolute** (the tolerance already fixed by M7-ERR-01a §3.4). |
| **S1.7′(5)** | **No unrelated field, coefficient, export, or scoring term may change.** Verified as (5a) export surface and (5b) all 27 unrelated scoring-term derivatives bit-identical. |
| **S1.7′(6)** | **Anti-vacuity** demonstrated against the pre-rectification reference arm. |

### 3.1 Independent verification, not duplicated logic

The Director required that reuse-versus-independence be examined rather than assumed. It was, and **independence was chosen on evidence**:

| | `verify_G16.js` (G16.3′) | `verify_S1prime.js` (S1.7′) |
|---|---|---|
| Reference arm | `baseline/scoring_prerect.js` | `baseline/scoring_prefix_D3.js` |
| That arm's vintage | pre-rectification (post-D3, post-M1 term array, post-M4) | **pre-D3, pre-term-array, pre-M4** |
| Isolates | the rectification alone | the rectification **and** re-proves D3 never touched `arbitrate()` |
| Context generator | G16's own | **copied verbatim from S1.7**, so the same distribution the original assertion used |
| Shared code | **none** — each computes the property from its own arm | |

The two gates reach the same conclusion from **different baselines by different code paths**. That agreement is genuine cross-validation. Sharing a helper would have made them a single measurement reported twice.

**Additional guarantee obtained for free:** because the pre-D3 arm predates the M1 sign repair, S1.7′(1) passing proves that **D3 still never touched the breakdown** — S1.7's original purpose — which the pre-rectification arm alone cannot establish.

### 3.2 Anti-vacuity construction

`scoring_prefix_D3.js` and `scoring_prerect.js` **both** carry the rectified trust term, so their breakdown delta is identically zero (**measured: max |Δ| = 0.000e+0**). Criterion (4) requires a strictly negative delta for `t < 0.5`, so it must **reject** that pairing. Measured: **2000/2000 contexts correctly rejected.** The criterion is therefore demonstrably not vacuous.

---

## 4. Effect on frozen gate G16.5

Frozen G16.5 reads: *"`verify_S1.js` (12/12) **and** `verify_S1b.js` (4/4) both re-run green against the modified `scoring.js`."*

Under this erratum, G16.5 is satisfied by:

| | Requirement | Status |
|---|---|---|
| **G16.5a** | `verify_S1.js` green **in full** — unchanged, 12/12 | **PASS** |
| **G16.5b** | `verify_S1b.js`: **every assertion other than S1.7** green — 3/3 | **PASS** |
| **G16.5c** | `verify_S1prime.js` green — the superseding criterion, 7/7 | **PASS** |

`verify_S1b.js` is **executed unmodified** on every G16 run. Its S1.7 line is **printed verbatim as a historical-provenance record**, together with the reason for supersession and a pointer to the superseding gate. **The historical failure is reported, never hidden or suppressed.**

---

## 5. What this erratum does NOT change

| Category | Status |
|---|---|
| **Frozen document bytes and digest** | **Unchanged** — validated before and after |
| `verify_S1b.js` — file, S1.7 assertion, historical result | **Preserved unmodified**, still executed, still reported |
| `verify_S3.js` — file, S3.2 assertion, historical result | **Preserved unmodified** (M7-ERR-01b) |
| S1.7's original purpose (D3 change-isolation) | **Preserved — and independently re-proved** by S1.7′(1) |
| Frozen G16.1, G16.2, G16.3a, G16.3c, G16.4 | Unchanged |
| M7-ERR-01a (G16.3′) and M7-ERR-01b (S3.2′) | Unchanged, still in force |
| Hypotheses H1 / H0 / H1-strict; competing hypotheses | Unchanged |
| Seven arms; controls locked | Unchanged |
| Environment, hidden variable, R1–R5, reliability shift | Unchanged |
| Metrics; analysis windows W1–W4 | Unchanged |
| Confirmatory family = 6; Holm; α = 0.01; bootstrap seeds | Unchanged |
| Stage-1 → power → Stage-2 procedure; **4200 cap** | Unchanged |
| Falsification F-1…F-11; §15.0 equivalence | Unchanged |
| **Claim ceiling and forbidden-word list** | Unchanged |
| **D2, F2b, D8/F12, D12 — all unrepaired** | Unchanged |
| `learningAuthority ≡ 1.0`; `dampQ` disabled; G12 anti-vacuity | Unchanged |
| `render/scoring.js` | Still exactly the approved one-line rectification |

**Scope in one sentence:** this erratum supersedes the application of one assertion in one file to one approved change, and adds one independent verification gate. It touches no hypothesis, arm, metric, window, sample-size rule, or claim.

---

## 6. Erratum register — cumulative

| ID | Supersedes | Replacement | Implemented | Result |
|---|---|---|---|---|
| **M7-ERR-01a** | Frozen §13.4 G16.3, breakdown bit-identity sub-clause | **G16.3′(1)–(5)** + anti-vacuity, tol 1e-12 | `verify_G16.js` | **7/7 PASS** |
| **M7-ERR-01b** | `verify_S3.js` S3.2 single-seed residual threshold | **S3.2′(a)–(b)**, fixed six-seed panel | `verify_S3prime.js` | **2/2 PASS** |
| **M7-ERR-02** | Application of `verify_S1b.js` S1.7 to the M7 rectification | **S1.7′(1)–(6)**, independent pre-D3 arm | `verify_S1prime.js` | **7/7 PASS** |

All three originals are **preserved unmodified** and continue to execute and report.

---

## STATUS: ERRATUM ISSUED · FROZEN DOCUMENT UNMODIFIED · SUPERSEDING GATES GREEN

`M7_PREREGISTRATION.md` and `M7_PREREGISTRATION.sha256` were not modified; digest `2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9` validates unchanged. `verify_S1b.js` and `verify_S3.js` were not modified. No `experiments/m7/`. No Stage-1, pilot, or confirmatory run. Nothing committed, nothing pushed.
