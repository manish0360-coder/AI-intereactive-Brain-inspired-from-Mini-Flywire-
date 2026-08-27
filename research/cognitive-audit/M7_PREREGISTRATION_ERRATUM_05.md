# M7 Pre-Registration — Erratum 05

**Erratum ID:** M7-ERR-05
**Lineage:** extends ERR-01 ([01](M7_PREREGISTRATION_ERRATUM_01.md)), ERR-02 ([02](M7_PREREGISTRATION_ERRATUM_02.md)), ERR-03 ([03](M7_PREREGISTRATION_ERRATUM_03.md)), ERR-04 ([04](M7_PREREGISTRATION_ERRATUM_04.md))
**Date:** 2026-08-20
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-08-20 (E1 scope).

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

This erratum clarifies **one thing**: the *scope* of the E1 gate in frozen §18.3.

It does **not** change traversal semantics, the environment, the slip probability, R1–R5, the arms, or any other frozen parameter. It resolves only how far the `env.attempt` gate extends in `main.js`.

---

## 2. The ambiguity

### 2.1 The frozen text

Frozen §18.3, row E1:

> | E1 | `main.js:4662` | Gate `agentCurrent = next` on `env.attempt(agentLast, next)`; returns `true` unconditionally when M7 is off |

Read literally, this gates **one assignment statement**.

### 2.2 Why the literal reading is incoherent

That assignment is the first statement of a **130-line block** (`main.js` 4691–4820 in the current tree) whose remaining contents are all consequences of a traversal having occurred:

| Site | What it does |
|---|---|
| `agentCurrent = next` | the move itself |
| `recordSemanticActivation(fromLabel, toLabel)` | its own comment: *"Record that the brain **ACTUALLY traversed** agentLast → agentCurrent"* |
| `new THREE.Line(...)`, `group.add(line)`, `spawnTravelDot(fromNeuron.position, toNeuron.position, …)` | draws the movement between the two nodes |
| `thoughtTrail.push(agentCurrent)` | appends the newly-reached node |
| `changeFatigue(-0.4)` (resting-at-home branch) | fires on arriving home |

Under the literal reading, a slip would leave `agentCurrent === agentLast`, and the block would still execute. `recordSemanticActivation` would then record a **self-loop traversal that never happened**, and the animation would draw a movement the agent did not make.

That directly contradicts frozen §3.3, which states the agent **remains at `u`** — i.e. no traversal occurred.

**The two readings differ materially in what the agent learns.** The frozen text does not say which applies, so implementation stopped and the question was referred rather than inferred.

### 2.3 Classification

**Ground 3** of the no-new-errata rule: a clerical/reference imprecision — §18.3 names a single line as shorthand for the coherent traversal block it opens. The ambiguity is a property of the frozen text and the pre-existing `main.js` structure, both fixed at freeze. **No Stage-1, pilot, or confirmatory run has been executed and no experimental data exists.**

---

## 3. The clarification — E1′

Per Director ruling of 2026-08-20:

> **`env.attempt(u, v)` determines whether the traversal `u → v` actually occurs.**
>
> If the attempt **fails**:
>
> - `agentCurrent` remains at `u`
> - no semantic activation for `u → v`
> - no travel/movement animation for `u → v`
> - no `thoughtTrail` advancement to `v`
> - no traversal-dependent fatigue or other side effect that semantically requires the traversal to have occurred
> - the failure costs **only the elapsed tick**
>
> **Unrelated per-tick logic must not be broadly gated.**

### 3.1 Applied scope

The gate covers exactly the block opened by `agentCurrent = next` — the coherent traversal block — and nothing outside it. Everything before it in the tick (decision, scoring, Q-learning, prediction error, reward) and everything after it runs unchanged on both outcomes.

**One environment draw per movement decision.** The attempt is evaluated exactly once at the block entry; no code path may draw again for the same decision.

### 3.2 What this does not license

This erratum does **not** authorise gating any statement outside that block, and does **not** change the cost model: frozen §3.4 already states that unreliability costs the agent *only elapsed ticks*, which the ruling restates.

---

## 4. Related finding — pre-existing trust-credit misalignment (documented, not repaired)

Discovered while mapping E2, and **accepted by the Director**:

The pre-M7 trust channel is **not fully coherent**. The key *string format* is consistent across all three sites (`from + "->" + to`), but at runtime the write-side operands are **temporally misaligned**: `agentLast` at the `recordAttempt` site is the position from the *previous* tick, because `agentLast = agentCurrent` executes several hundred lines later in the same tick.

Measured over a real 60-tick run (seed 20260819000):

```
executed moves:  10->6, 6->7, 7->8, 8->5, 5->2, ...
attempt keys:    10->7, 6->8, 7->5, 8->2, 5->1, ...
pathAttempts: 63 keys | real graph edges: 15 | NON-edges: 48
```

Decision-time reads (`getPathTrust(currentKey + "->" + k)`) query genuine graph edges, so the store is largely written under keys the scorer never reads.

**This erratum does not repair it.** Per Director ruling:

- **M7 OFF** → the original execution path is unchanged, *including this defect*, so G1 default parity remains valid.
- **M7 ON** → credit is keyed from the real edge involved in the actual attempt/traversal, established as explicit provenance at the movement decision rather than reconstructed from mutable state.

Frozen §6.1 already mandates the M7-on behaviour ("`recordAttempt(u→v)` on every traversal attempt of `e`; `recordSuccess(u→v)` iff that attempt succeeded"), so **no frozen clause is changed by honouring it**.

The corresponding inaccurate claim in the non-frozen [`M7_SCIENTIFIC_SPEC_DRAFT.md`](M7_SCIENTIFIC_SPEC_DRAFT.md) is corrected in place by a narrow post-audit note, without rewriting the original audit text.

---

## 5. What this erratum does NOT change

| Category | Status |
|---|---|
| **Frozen document bytes and digest** | **Unchanged** — validated before and after |
| Traversal semantics (§3.3), reward process (§3.4), shift (§3.6), run structure (§3.7) | Unchanged |
| R1–R5; rulings R1–R9; ERR-01…ERR-04 | Unchanged, still in force |
| §6.1 credit re-keying | Unchanged — this erratum implements it, it does not amend it |
| Arms A1–A7; E3/E4/E5 integration | Unchanged |
| Hypotheses, metrics, windows, family = 6, 4200 cap, claim ceiling | Unchanged |
| **D2, F2b, D8/F12, D12 — unrepaired** | Unchanged |
| **The pre-M7 trust-credit misalignment** | **Deliberately preserved when M7 is off** |

**Scope in one sentence:** this erratum states how far one gate extends, and records a pre-existing defect that is preserved rather than repaired.

---

## 6. Erratum register — cumulative

| ID | Supersedes / clarifies | Replacement | Implemented in |
|---|---|---|---|
| **M7-ERR-01a** | Frozen G16.3 breakdown bit-identity | G16.3′(1)–(5) | `phase1_0/verify_G16.js` |
| **M7-ERR-01b** | `verify_S3.js` S3.2 single-seed threshold | S3.2′(a)–(b) | `phase1_0/verify_S3prime.js` |
| **M7-ERR-02** | Application of S1.7 to the rectification | S1.7′(1)–(6) | `phase1_0/verify_S1prime.js` |
| **M7-ERR-03** | Frozen §3.5 R5 objective | finite-horizon Bellman | *superseded by ERR-04* |
| **M7-ERR-04** | ERR-03 §3.1 objective (saturating) | R5″: min expected attempts, `w_e = 1/p_e` | `m7/env.js` |
| **M7-ERR-05** | **Frozen §18.3 E1 gate scope** | **E1′: the coherent traversal block** | `main.js`, `m7/verify_e1e2.js` |

---

## STATUS: ERRATUM ISSUED · FROZEN DOCUMENT UNMODIFIED

`M7_PREREGISTRATION.md` and `M7_PREREGISTRATION.sha256` were not modified; digest `2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9` validates unchanged. No Stage-1, pilot, or confirmatory run. Nothing committed, nothing pushed.
