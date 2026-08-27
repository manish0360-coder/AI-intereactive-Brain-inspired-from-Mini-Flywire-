# M7 Pre-Registration — Erratum 07

**Erratum ID:** M7-ERR-07
**Lineage:** extends ERR-01 ([01](M7_PREREGISTRATION_ERRATUM_01.md)), ERR-02 ([02](M7_PREREGISTRATION_ERRATUM_02.md)), ERR-03 ([03](M7_PREREGISTRATION_ERRATUM_03.md)), ERR-04 ([04](M7_PREREGISTRATION_ERRATUM_04.md)), ERR-05 ([05](M7_PREREGISTRATION_ERRATUM_05.md)), ERR-06 ([06](M7_PREREGISTRATION_ERRATUM_06.md))
**Date:** 2026-08-22
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-08-22 — *Authorize Phase B for ERR-07, with three binding decisions* — issued in response to the G11 RED of 2026-08-22 and the Phase A read-only audit.

**Binds to frozen artifact:**

| | |
|---|---|
| Document | [`M7_PREREGISTRATION.md`](M7_PREREGISTRATION.md) v1.0 (frozen 2026-08-19) |
| **SHA-256** | **`2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9`** |
| Verify | `cd research/cognitive-audit && sha256sum -c M7_PREREGISTRATION.sha256` |

> **THE FROZEN PRE-REGISTRATION IS NOT MODIFIED BY THIS ERRATUM.** Verified immediately before and immediately after.

---

## 0. Provenance — the finding that produced this erratum

**This erratum does not erase a failure. It records one.**

On **2026-08-22**, the formal gate harness `experiments/m7/verify_M7.js`, running gate **G11** as operationalised by ERR-06 §4.2, returned:

```
===== G11  No observable leakage (5 named observables) =======
  seed 900000 ACCEPTED: cos=-0.0628  dist=0.0388  degOut=0.0793  degIn=-0.0680  edgeIdx= 0.0854
  seed 900001: not accepted (R1-R5), skipped
  seed 900002: not accepted (R1-R5), skipped
  seed 900003: not accepted (R1-R5), skipped
  seed 900004 ACCEPTED: cos= 0.0273  dist=0.0311  degOut=0.0854  degIn=-0.0374  edgeIdx=-0.2089
FAIL  G11a  violations: 900004/canonical-edge-index=-0.2089

G11   RED
```

> ### THE HISTORICAL RED (permanent record)
>
> **Configuration seed `900004`, configIndex `0`, evaluated 2026-08-22:**
>
> | | |
> |---|---|
> | R1 – R5 | **all satisfied — the configuration was ACCEPTED by frozen §3.5** |
> | ERR-06 §4.2 observable 5, canonical edge index | **ρ = −0.2089** |
> | Threshold | `|ρ| < 0.10` |
> | Gate G11 | **RED** |
>
> This RED is **valid scientific information**. It is not superseded, softened, reinterpreted, or retro-flattened by this erratum. It is the evidence on which this erratum rests, and `verify_M7.js` prints it on every run as recorded history.

No parameter was tuned, no observable removed or redefined, no threshold changed, and no favourable configuration was sought in response to it.

---

## 1. The frozen contradiction being corrected

Two frozen clauses cannot both be satisfied by any implementation.

**Frozen §3.5:**

> *"**Rejection sampling.** A configuration is accepted only if **all five** hold:"* — R1, R2, R3, R4, R5.
>
> R3 constrains one observable (endpoint cosine similarity). R4 constrains one observable (directed distance to goal). **Nothing constrains any other observable.**

**Frozen §14, gate G11:**

> `| **G11** | No observable leakage | Every accepted config satisfies R3, R4; predictor of p_e from observables performs at chance |`
>
> operationalised by **ERR-06 §4.2** as: for **every accepted configuration**, each of **five** named observables must satisfy `|Spearman ρ(observable, p_e)| < 0.10`.

**The contradiction:** frozen §3.5 accepts on two observables; frozen §14 G11 requires cleanliness on five. Configuration `900004` is the executed demonstration — accepted by §3.5, rejected by G11.

This is a contradiction **internal to the frozen specification**, present at the moment of freezing, and **independent of any experimental result**. It is therefore **ground 1** of the no-new-errata rule. The frozen document defines a gate its own acceptance protocol cannot pass.

---

## 2. RULING A — the acceptance predicate (Director Decision, ERR-07 scope item 1)

> The frozen §3.5 sentence
>
> > *"A configuration is accepted only if **all five** hold"*
>
> is **superseded** by:
>
> > **A configuration is accepted only if R1, R2, R3, R4 and R5 hold, AND the ERR-06 §4.2 independence criterion holds:**
> > **for each of the five ERR-06 §4.2 observables, `|Spearman ρ(observable, p_e)| < 0.10`.**

The five observables remain **exactly** those ruled in ERR-06 §4.2, in that order:

1. endpoint cosine similarity
2. directed distance-to-goal
3. source endpoint degree
4. destination endpoint degree
5. canonical edge index

### 2.1 What is *not* changed

| | |
|---|---|
| The threshold | **`0.10`** — reused verbatim, not redefined |
| The observable set | **five, unchanged** — none added, removed, or redefined |
| The correlation procedure | Spearman rank correlation over the 39 canonical edges |
| R1, R2, R3, R4, R5 | **definitions, thresholds and computed values all unchanged** |
| `rho3`, `rho4`, `r5Differing` | unchanged for every configuration |

### 2.2 The new predicate is a strict superset of R3 ∧ R4

Observables 1 and 2 are numerically identical to R3 and R4. Verified to six decimals on configuration `900000`:

```
rho3   env.js -0.062753    independent verifier -0.062753
rho4   env.js  0.038762    independent verifier  0.038762
```

The predicate therefore adds exactly **three** new acceptance conditions — source endpoint degree, destination endpoint degree, canonical edge index. It **cannot accept any configuration that R3 or R4 rejects.**

---

## 3. RULING B — Phase scope (Director Decision 1)

> **The ERR-07 acceptance predicate is evaluated on `cfg.pPhase1` ONLY** — the pre-shift assignment.

Grounds:

- the G11 RED was measured on `cfg.pPhase1`;
- frozen R3 and R4 already operate on `cfg.pPhase1` (ERR-03 §4: *"`evaluateConstraints()` reads `cfg.pPhase1`; the shift is an intervention"*);
- the correction therefore repairs the demonstrated contradiction **without expanding experimental scope**.

`cfg.pPhase2` is **not** used as an acceptance condition. **No Phase II constraint is added.**

### 3.1 RECORDED LIMITATION — post-shift leakage in window W3

**This limitation is binding, permanent, and must not be hidden, removed, weakened, or reinterpreted.**

Read-only measurement over the authorized pilot block `900000–900029`, configIndex 0 (the same block already inspected under ERR-06 §4.1 — no new range was opened):

| config seed | Phase I max \|ρ\| | Phase II max \|ρ\| | Phase II worst observable |
|---|---|---|---|
| 900000 | 0.0854 (PASS) | **0.3077** | destination endpoint degree |
| 900004 | 0.2089 (FAIL) | **0.1702** | destination endpoint degree |
| 900007 | 0.1134 (FAIL) | **0.1868** | canonical edge index |
| 900010 | 0.2518 (FAIL) | **0.2407** | source endpoint degree |
| 900017 | 0.2890 (FAIL) | **0.1850** | canonical edge index |
| 900021 | 0.3950 (FAIL) | **0.2158** | canonical edge index |
| 900022 | 0.2365 (FAIL) | **0.2174** | endpoint cosine similarity |
| 900023 | 0.5042 (FAIL) | **0.4691** | destination endpoint degree |

**Of the 30 inspected pilot candidates, 8 are accepted by R1–R5; 1 also satisfies the ERR-07 Phase I predicate; ZERO satisfy it on Phase II as well.**

> **Stated limitation.** Configurations accepted under ERR-07 are certified leakage-free **only on the pre-shift assignment**. After the §3.6 reliability shift, `p_e` may correlate with fixed graph observables at magnitudes up to `|ρ| ≈ 0.31` (measured, destination endpoint degree, config `900000`).
>
> **Window W3 is the post-shift window and is a primary confirmatory window.** Any W3 result must be reported alongside this limitation. A W3 effect cannot be attributed to belief tracking without acknowledging that a degree-based heuristic is not excluded post-shift by the acceptance protocol.
>
> Extending the criterion to Phase II is **out of ERR-07 scope** and reserved for separate Director ruling. Phase A measurement shows it would reject **every** candidate in the inspected pilot block, so it cannot be adopted without a protocol redesign.

### 3.2 Mechanistic note (explanatory; changes nothing)

Four of the five observables — directed distance-to-goal, source degree, destination degree, canonical edge index — are **fixed vectors** determined by the frozen topology and goal, identical across every configuration. Only endpoint cosine similarity varies per configuration. The criterion therefore asks a random 13-of-39 subset to be simultaneously rank-uncorrelated with four fixed vectors at `|ρ| < 0.10` over 39 points. The low acceptance rate is a **structural property of the frozen graph**, not a defect in the sampler and not a reason to relax anything.

---

## 4. RULING C — Held-out generation semantics (Director Decision 2)

Frozen §5.1 declares *"Held-out configurations `900500–900529` — 30 configs"* and frozen §12.3 pins *"`n_configs = 30` (fixed: the held-out block contains exactly 30)"*. Both read as **one seed = one configuration**.

That reading is **already false under the unmodified frozen R1–R5**: the measured R1–R5 acceptance rate on the pilot block is **8/30 = 26.7%**, so 30 held-out seeds would yield roughly 8 configurations, not 30. This is a **pre-existing** frozen contradiction that the G11 correction exposes rather than creates.

> ### The ruling
>
> **The held-out protocol requires 30 ACCEPTED configurations, produced by deterministic sequential rejection sampling beginning at seed `900500`.**
>
> `900500–900529` defines the deterministic **START of the held-out candidate stream**, not a manually selectable pool.
>
> Procedure, for `acceptedConfigIndex = 0 … 29`:
>
> 1. generate the candidate at the current seed using the **unchanged** candidate-generation mechanism;
> 2. evaluate the **complete** acceptance criteria (R1–R5 **and** the §2 predicate);
> 3. **reject** if any criterion fails; advance to the next seed, strictly ascending, skipping nothing;
> 4. **accept** if all criteria pass;
> 5. continue the stream from the seed following the accepted one, until exactly 30 accepted configurations exist.

### 4.1 Mandatory provenance

Every accepted configuration **must** record:

| Field | Meaning |
|---|---|
| `acceptedConfigIndex` | 0 … 29, in stream order; also fixes the goal via frozen §3.7 `GOALS[i % 4]` |
| `startingSeed` | the candidate seed at which the search for *this* configuration began |
| `acceptedSeed` | the seed of the accepted candidate |
| `numberOfRejectedCandidatesBeforeAcceptance` | count of candidates rejected since `startingSeed` |

This provenance is **mandatory for reproducibility** and must be emitted for every accepted configuration.

### 4.2 Absolutely prohibited

- inspecting any held-out candidate before the authorized held-out stage
- estimating which held-out seeds will pass, or estimating the held-out acceptance rate
- manually skipping seeds
- searching for favourable configurations
- changing seed order
- using experiment outcomes to select configurations

**The held-out stream `900500` onward remains completely uninspected.** As of this erratum, no held-out seed has ever been evaluated: every occurrence of `900500` in the repository is a prohibition statement, and no call site passes a `9005xx` seed to the generator.

---

## 5. RULING D — Removal of the arbitrary retry limit (Director Decision 3)

The parameter `maxTries = 50` in `generateAccepted()` is an **engineer-chosen default with no basis in the frozen document**. Frozen §3.5 specifies redrawing *"from the next config seed in sequence"* with **no** bound. At the ERR-07 acceptance rate the limit would have silently returned "no configuration" for a substantial fraction of requests.

> **The `maxTries` cutoff is removed from the acceptance path and is NOT replaced by another number.**
>
> Acceptance uses **deterministic sequential rejection sampling with no arbitrary retry limit**: the generator advances through candidate seeds in strictly ascending order and returns the **first** qualifying candidate.

No renamed constant, no hidden cap, no sampling budget survives in the acceptance path.

**Technical-safety finding:** none required. The Director's clause *"if there is a genuine technical safety requirement preventing an unbounded loop, STOP BEFORE IMPLEMENTATION and report"* was evaluated and **does not apply**:

- acceptance is demonstrably attainable — configuration `900000` satisfies the complete ERR-07 criteria — so the search is not vacuous;
- the loop is pure arithmetic on a fixed 39-edge / 20-node graph, allocates no unbounded state, and performs no I/O;
- seed arithmetic is `uint32`; exhausting the space would require ~4.29 × 10⁹ candidates, far beyond any reachable execution.

An unbounded deterministic rejection sampler is therefore implemented as ruled.

---

## 6. Candidate generation is untouched (Director requirement)

For a fixed `configSeed`, all of the following are **byte-for-byte identical** before and after ERR-07:

```
configSeed  ->  unreliableSet
                pUn
                pRel
                pPhase1
                pPhase2
                embedding
                goal
                RNG draw sequence
```

The acceptance predicate is evaluated **after** all random draws are complete, reads only the finished candidate plus the fixed topology, and consumes **no** randomness from any source. Only **acceptance/rejection** and **sequential candidate consumption** change.

---

## 7. What this erratum does NOT change

| Category | Status |
|---|---|
| **Frozen document bytes and digest** | **Unchanged** |
| The `0.10` threshold | Unchanged — reused, not redefined |
| The five ERR-06 §4.2 observables | Unchanged — none added, removed, or redefined |
| R1, R2, R3, R4, R5 definitions and values | Unchanged |
| Candidate generation and RNG draw sequence | Unchanged |
| `main.js`, `render/`, `render/scoring.js`, `instrumentation/rng.js` | **Untouched** |
| E1–E5 integration; arms A1–A7 | Unchanged |
| Gates G1–G6, G9, G12–G14, G16 | Unchanged, not weakened |
| Hypotheses, metrics, windows, family = 6, 4200-run cap, claim ceiling | Unchanged |
| **D2, F2b, D8/F12, D12 — unrepaired** | Unchanged |
| Non-M7 behaviour, incl. the preserved trust-credit misalignment | Unchanged |
| ERR-01 … ERR-06 | Unchanged, still in force |

**Scope in one sentence:** this erratum makes configuration acceptance enforce the independence property frozen §14 G11 already required, on the pre-shift assignment only, and replaces an unfrozen retry cutoff with the deterministic sequential rejection sampling frozen §3.5 already prescribes.

---

## 8. Erratum register — cumulative

| ID | Clarifies / supersedes | Implemented in |
|---|---|---|
| **M7-ERR-01a** | Frozen G16.3 breakdown bit-identity | `phase1_0/verify_G16.js` |
| **M7-ERR-01b** | `verify_S3.js` S3.2 single-seed threshold | `phase1_0/verify_S3prime.js` |
| **M7-ERR-02** | Application of S1.7 to the rectification | `phase1_0/verify_S1prime.js` |
| **M7-ERR-03** | Frozen §3.5 R5 objective | *superseded by ERR-04* |
| **M7-ERR-04** | ERR-03 §3.1 objective (saturating) | `m7/env.js` |
| **M7-ERR-05** | Frozen §18.3 E1 gate scope | `main.js`, `m7/verify_e1e2.js` |
| **M7-ERR-06** | Frozen G3, G6, G11 operationalisation | `main.js`, `m7/_armrun.js`, `m7/verify_M7.js` |
| **M7-ERR-07** | **Frozen §3.5 acceptance predicate; §5.1/§12.3 held-out semantics; unfrozen `maxTries`** | `m7/env.js`, `m7/verify_env.js`, `m7/verify_M7.js` |

---

## STATUS: ERRATUM ISSUED · FROZEN DOCUMENT UNMODIFIED

Digest `2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9` validates unchanged. The G11 RED of 2026-08-22 is permanently recorded (§0). Post-shift W3 leakage is permanently recorded as an unresolved limitation (§3.1). No Stage-1, pilot, or confirmatory run. Held-out stream uninspected. Nothing committed, nothing pushed.
