# M7 Pre-Registration — Erratum 06

**Erratum ID:** M7-ERR-06
**Lineage:** extends ERR-01 ([01](M7_PREREGISTRATION_ERRATUM_01.md)), ERR-02 ([02](M7_PREREGISTRATION_ERRATUM_02.md)), ERR-03 ([03](M7_PREREGISTRATION_ERRATUM_03.md)), ERR-04 ([04](M7_PREREGISTRATION_ERRATUM_04.md)), ERR-05 ([05](M7_PREREGISTRATION_ERRATUM_05.md))
**Date:** 2026-08-20
**Author:** Chief Systems Engineer
**Authority:** Director rulings of 2026-08-20 — Ruling 1 (G3), Ruling 2 (G6), Ruling 3 (G11), following the read-only G3/G6/G11 audit dossier.

**Binds to frozen artifact:**

| | |
|---|---|
| Document | [`M7_PREREGISTRATION.md`](M7_PREREGISTRATION.md) v1.0 (frozen 2026-08-19) |
| **SHA-256** | **`2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9`** |
| Verify | `cd research/cognitive-audit && sha256sum -c M7_PREREGISTRATION.sha256` |

> **THE FROZEN PRE-REGISTRATION IS NOT MODIFIED BY THIS ERRATUM.** Verified immediately before and after.

---

## 1. Scope

Three gate-**operationalisation** clarifications: G3, G6, G11. Each resolves an ambiguity or contradiction identified by read-only audit **before** any implementation was written and **before** any experimental data exists.

**No new constant, threshold, metric, predictor, model family, or observable is introduced.** The only numeric value used (`0.10`) is already pinned by frozen §3.5 constraints R3/R4.

### 1.1 Verdict vocabulary

Frozen §14 is headed *"Verification gates — all must be green before data collection"* and defines exactly one verdict concept. A search of the frozen document returns **zero** occurrences of GREEN/RED/NOT_IMPLEMENTED as verdict vocabulary.

Accordingly the categories **"scope-qualified GREEN"**, **"partial"** and **"provisional pass"** are **withdrawn and prohibited**. Gate reporting uses only:

- **GREEN** — the frozen assertion is met and its anti-vacuity mutation fails it
- **RED** — the frozen assertion is not met
- **NOT_IMPLEMENTED** — the substrate the gate depends on does not yet exist

---

## 2. RULING A — G3: E1 evaluated independently of E2

### 2.1 The contradiction

Frozen §14: `| **G3** | Generalisation | With p_e ≡ 1.0, stochastic build ≡ deterministic build |`

G3 names no arm. G4, G5 and G6 each name one (A2, A7, A1), so the frozen author's convention is explicit when arm-scoping is intended; G3's silence means it is a property of the build.

Measured on the complete M7-enabled build at `p_e ≡ 1.0`, arm OFF: **writes 285 → 282. Not equivalent.**

The divergence is caused entirely by frozen **§6.1**, which mandates that credit be re-keyed by traversal outcome. That re-keying is deliberately *not* a no-op, so **no implementation can satisfy both frozen §6.1 and frozen G3** while E1 and E2 are bound to a single switch. This is a contradiction internal to the frozen specification — **ground 1** of the no-new-errata rule — present at freeze and independent of any result.

### 2.2 The ruling

> **G3 evaluates E1 (the environment transition mechanism) independently of E2 (traversal-outcome credit).**
>
> Required condition: `ENV=on`, `CREDIT=off`, `p_e ≡ 1.0`
> Compared against: `ENV=off`, `CREDIT=off`, `p_e ≡ 1.0`
> **Arm remains OFF throughout. No special arm may be selected.**

### 2.3 Independent switchability (required, not optional)

E1 and E2 must be **independently switchable**, with both controls explicit. `CREDIT` must **not** default to, or be implicitly coupled to, `ENV`.

| `ENV` | `CREDIT` | Build |
|---|---|---|
| off | off | baseline / pre-M7 |
| **on** | **off** | **E1 only — the G3 condition** |
| off | on | E2 only |
| on | on | full M7 |

Default invocation is `ENV=off, CREDIT=off`, preserving non-M7 semantics. Any caller wanting a mechanism must name it explicitly; existing verifiers are updated to do so rather than relying on an implicit mapping.

### 2.4 Anti-vacuity

1. `ENV=on, CREDIT=off, p≡1.0` must be **bit-identical** to `ENV=off, CREDIT=off, p≡1.0`.
2. With real `p_e` and E1 only, the environment mechanism must be demonstrably **active** (slips occur).
3. `ENV=on, CREDIT=on` at `p≡1.0` must **diverge**, demonstrating in-gate why E2 is excluded from the G3 equivalence test.

---

## 3. RULING B — G6: common-state snapshot

### 3.1 The ambiguity

Frozen §14: `| **G6** | Shuffle validity | σ bijective, no fixed point; delivered value multiset equals A1's at every tick |`

`multiset` and `delivered` each occur **exactly once** in the frozen document — in this clause. Neither "delivered value multiset" nor "at every tick" is defined. A1 and A6 are separate runs with separate histories, so they hold different trust states and occupy different nodes; there is no shared tick-indexed frame in which "A1's multiset at tick t" is defined.

### 3.2 The ruling

> **G6 is evaluated on a common frozen state snapshot, not on two independently evolving runs.**
>
> At a decision state: freeze one identical trust/state snapshot and one candidate edge set; evaluate that same candidate set under A1 and under A6, with A6 using its deterministic derangement σ.

Required assertions:

1. σ is **bijective**
2. σ has **no fixed point**
3. the correspondence between an edge and its original trust value is **destroyed**
4. the **multiset of delivered values** over the **same candidate set** and **same snapshot** equals the A1 multiset for that candidate set

### 3.3 Mutations (all must fail the appropriate assertion)

identity σ · σ with one fixed point · non-bijective σ · corrupted delivered value

---

## 4. RULING C — G11: five named observables at the existing threshold

### 4.1 The ambiguity

Frozen §14: `| **G11** | No observable leakage | Every accepted config satisfies R3, R4; predictor of p_e from observables performs at chance |`

"at chance" occurs twice in the frozen document (§13.10, §14) and **zero** times across ERR-01 → ERR-05. It is never defined: no predictor type, target representation, train/test protocol, scoring metric, chance baseline, or threshold.

Read-only measurement over the **pilot-adjacent** block (seeds 900000–900029; the held-out block was **not** inspected) showed the ambiguity is material — **6 of 30** configurations are accepted by R3/R4 while showing `|ρ|` up to **0.2518** against an observable outside R3/R4's two.

### 4.2 The ruling

> **"Performs at chance" is operationalised using the already-pinned threshold `|ρ| < 0.10`, applied to each of exactly five named observables.**

For every accepted configuration, each must satisfy `|Spearman ρ(observable, p_e)| < 0.10`:

1. endpoint cosine similarity
2. directed distance-to-goal
3. source endpoint degree
4. destination endpoint degree
5. canonical edge index

**No new predictor, ML model, metric, threshold, or observable is introduced.** Observables 1 and 2 restate the existing R3/R4 quantities; 3–5 extend the same test to observables R3/R4 leave unconstrained. The correlation procedure is Spearman rank correlation over the 39 canonical edges, computed independently by the verifier.

### 4.3 Scientific discipline (binding)

The held-out block **900500–900529 must not be inspected**. Validation uses the authorized pilot block only.

> If any accepted configuration violates `|ρ| < 0.10` for any of the five named observables, **G11 is RED and work stops.**
>
> It is forbidden to: tune parameters · remove the failing observable · change an observable definition · search for a favourable configuration · modify the threshold.
>
> **A RED result is valid scientific information.**

---

## 5. What this erratum does NOT change

| Category | Status |
|---|---|
| **Frozen document bytes and digest** | **Unchanged** |
| G3's scientific intent (generalisation at p≡1.0) | Unchanged |
| G6's scientific intent (the C5 correspondence control) | Unchanged |
| G11's scientific intent (no observable leakage) | Unchanged |
| The `0.10` threshold | Unchanged — reused, not redefined |
| R1–R5; frozen §3, §4, §5, §6.1, §10; rulings R1–R9 | Unchanged |
| ERR-01 … ERR-05 | Unchanged, still in force |
| Arms A1–A7; E3/E4/E5 integration | Unchanged |
| Hypotheses, metrics, windows, family = 6, 4200 cap, claim ceiling | Unchanged |
| **D2, F2b, D8/F12, D12 — unrepaired** | Unchanged |
| Non-M7 behaviour, including the preserved trust-credit misalignment | Unchanged |

**Scope in one sentence:** this erratum states how three gates are evaluated. It changes no threshold, adds no constant, and touches no unrelated clause.

---

## 6. Erratum register — cumulative

| ID | Clarifies / supersedes | Implemented in |
|---|---|---|
| **M7-ERR-01a** | Frozen G16.3 breakdown bit-identity | `phase1_0/verify_G16.js` |
| **M7-ERR-01b** | `verify_S3.js` S3.2 single-seed threshold | `phase1_0/verify_S3prime.js` |
| **M7-ERR-02** | Application of S1.7 to the rectification | `phase1_0/verify_S1prime.js` |
| **M7-ERR-03** | Frozen §3.5 R5 objective | *superseded by ERR-04* |
| **M7-ERR-04** | ERR-03 §3.1 objective (saturating) | `m7/env.js` |
| **M7-ERR-05** | Frozen §18.3 E1 gate scope | `main.js`, `m7/verify_e1e2.js` |
| **M7-ERR-06** | **Frozen G3, G6, G11 operationalisation** | `main.js`, `m7/_armrun.js`, `m7/verify_M7.js` |

---

## STATUS: ERRATUM ISSUED · FROZEN DOCUMENT UNMODIFIED

Digest `2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9` validates unchanged. No Stage-1, pilot, or confirmatory run. Held-out block not inspected. Nothing committed, nothing pushed.
