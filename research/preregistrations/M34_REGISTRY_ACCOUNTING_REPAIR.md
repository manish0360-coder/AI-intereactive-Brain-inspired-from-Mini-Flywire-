# M34 — 895000–895999 Configuration-Registry Accounting Repair

**Status:** ACCOUNTING REPAIR (PASS 1 audit + specification, PASS 2 implementation + independent verification)
**Milestone:** M34
**Date:** 2026-09-16
**Authority:** Director decision — *M34 — REPAIR 895000–895999 CONFIGURATION REGISTRY ACCOUNTING*, issued after Q-LAG was closed and M33-R1 reclassified GREEN on that question
**Builds on:** M33-R1 at `73c12d9`

**Registered experimental seeds consumed: 0. No collection, no agent run, no C × R work, no
successor preregistration, no RNG, graph, `futureScore` or production change. Not pushed.**

---

## 1. Verdict

> # M34-GREEN
> **The accounting defect is repaired where the registry chain lives: a successor link records
> 895000–895999 as consumed by C1, with an evaluation record read back from C1's own committed
> artifacts. The typed layer now resolves through that link, and the M33 gate distinguishes a
> registry chain link from study code. No historical file is rewritten.**
>
> **This memo records M34 in two parts: the accounting repair (§3–§11, unchanged), and the closure
> (§14) that resolved the two structural items the repair had left open.**

---

## 2. M34 objective

> Record the 895000–895999 configuration territory correctly, without claiming seeds were evaluated
> that were not, without altering any historical record, and without consuming any registered seed.

---

## 3. PASS 1 findings

### 3.1 Why the block is currently mis-represented

| Step | Commit | Effect |
|---|---|---|
| `registry/consumed.js` written as the link after UQ-B | `c59d457` | records UQ-B's block and the 896xxx development territory. **C1 had not run**, so its block is correctly absent |
| M18 verifies that link | — | asserts **B1: "the C1 block remains entirely unconsumed and available"** — true at that commit |
| C1 census executes over its registered block | `b23f2c5` | `seedCensus`: 1000 seeds evaluated, 895000–895999; 70 configurations accepted; 140 runs |
| nothing updates the chain | — | **the defect**: the newest link still answers `isConsumed(895500) === false`, so a future study would see 1000 spent seeds as free territory |

**The defect is an omission of a successor link, not a wrong entry.** No existing entry is incorrect;
the chain simply stops one study too early.

### 3.2 Every consumer of the current semantics

| Consumer | Depends on | Effect of editing `consumed.js` in place |
|---|---|---|
| `experiments/m18/verify_registry.js` | B1: C1 block unconsumed | **would fail** — a committed record would be falsified |
| `research/preregistrations/verify_m21.js` | executes `isConsumed(895500) === false` | **would fail** |
| `experiments/m15`, `m16`, `m17` verifiers | C1 range collision-free | **would fail** |
| `experiments/c1/protocol.js` → `collect`, `run_collection`, `verify_collection`, `gate` | `assertSeedAllowed` must admit C1's own block | **would refuse C1's own seeds**, making the committed census irreproducible |
| `experiments/registry/typed.js` (M33/M33-R1) | delegates `config.isConsumed` | would inherit the change — but M34 may not modify it, and it imports the old link by path |
| M8 / Q1 / UQ-A / UQ-B protocols | their own predicates | unaffected either way: the chain flows into `consumed.js`, not out of it |

### 3.3 The four states, kept apart

| State | Meaning | Where it lives |
|---|---|---|
| **consumed** | territory spent; a future study must not draw here | `CONSUMED_RANGES` |
| **evaluated** | how much of a consumed range was actually enumerated — **evidence, not a state** | `TERRITORY.evaluation`, per range |
| **reserved (held out)** | never generated, inspected or inferred | `HELD_OUT_FLOOR = 900500`, unchanged |
| **proposed** | territory earmarked for a future study | `TERRITORY.proposed` — **empty**: M34 allocates nothing |

**Consumed ≠ evaluated.** 895xxx is consumed *and* fully evaluated (1000/1000, from C1's own census).
896xxx is consumed but **declared conservatively** over a partially evaluated block; M34 carries that
weaker claim forward **unchanged** rather than upgrading it.

### 3.4 Successor entry, not an edit — and it is the established convention

`consumed.js` itself states the rule: *"a consumed range must stop a FUTURE study from drawing new
measurements there. It must NOT stop an existing verifier from reproducing an existing result."*
M18 created a new file for exactly this reason; M32 §14 and M33 §4.1 reached the same conclusion.
**M34 follows it: a new link, no historical edit.**

### 3.5 Files that needed changing

Only new files. **No existing file is modified.**

---

## 4. Exact repair

`experiments/registry/consumed_after_c1.js` — the chain link after C1:

- `CONSUMED_RANGES` = the C1 block **prepended** to the inherited list, which is spread unchanged and
  in order.
- `C1_BLOCK` carries provenance and an **evaluation record**: `evaluatedCount 1000`, min 895000,
  max 895999, 70 accepted configurations, 140 runs — each read from
  `experiments/c1/results/c1_results.json`.
- `DEV_FIXTURE_EVALUATION` restates the 896xxx claim as `block-declared-conservatively` with
  `evaluatedCount: null` and the six executed fixtures.
- `TERRITORY` names consumed / reserved / proposed, with evaluation evidence held separately.
- `rangeFor(s)` and `evaluationFor(s)` let a caller cite *why* a seed is spent and *how much* of that
  range was evaluated.
- `isConsumed`, `isHeldOut`, `HELD_OUT_FLOOR`, `spentSummary` keep the old link's shape, so a future
  consumer can switch links without any other change.

---

## 5. Files changed

| Path | Change |
|---|---|
| `experiments/registry/consumed_after_c1.js` | **new** — the successor link |
| `experiments/m34/verify.js` | **new** — independent verifier |
| `research/preregistrations/M34_REGISTRY_ACCOUNTING_REPAIR.md` | **new** — this memo |
| `research/preregistrations/verify_m34.js` | **new** — binds this memo to an executed run |
| everything else | **unchanged** |

---

## 6. Verification results

`node experiments/m34/verify.js` — **75/75 passed, 0 failed** after the closure (§14); 51/51 as first written.

| Group | Result |
|---|---|
| **A** representation | all 1000 seeds consumed; exactly one new range, citing `b23f2c5`; chain grows by one |
| **B** boundaries | 894999 not consumed · 895000 and 895999 consumed by C1 · 896000 consumed by the 896xxx range, **not** by C1 · interior 895001, 895031, 895250, 895500, 895750, 895998 C1-consumed · block is consumed, **not** held out |
| **C** evaluation honesty | every number equals C1's committed `seedCensus`/`accounting`; **recomputed independently**: 4,000 candidate rows carry exactly 1,000 distinct seeds spanning 895000–895999; artifact digests match `INTEGRITY.sha256`; the 896xxx claim stays conservative with no count asserted |
| **D** backward compatibility | **exhaustive 0..1,000,000: the only decisions that change are the 1000 C1 seeds**; held-out decisions identical everywhere; inherited chain spread unchanged and in order; the old link still answers exactly as M18/M21 recorded; registry frozen |
| **E** seed accounting | no seed outside the block becomes consumed; M8, Q1, UQ-A, UQ-B and M7 blocks were already consumed and remain so |
| **F** typed layer | **after the closure**: the installed typed layer refuses 895xxx, and that is a delegation fact about `typed.js` (§14) |
| **P** integrity | only M34 files changed since `73c12d9`; 27 protected files byte-identical; no collection data produced; the M33 gate conflict pinned by asking that gate itself (P6) |

---

## 7. Mutation results

Every anchor must occur **exactly once** in the source. That rule was added after six mutants
"survived" because `replace()` had hit the first match inside a doc comment and produced no
semantic change — a harness defect, now impossible to repeat silently.

| Mutant | Outcome |
|---|---|
| MU1 wrong low boundary | caught by A1, A2, A3, B2, B5, D1, D4 |
| MU2 wrong high boundary | caught by A1, A2, A3, B3, D1 |
| MU3 block widened below | caught by A2, A3, B1, B2, B5, C5, D1, D4 |
| MU4 block widened above | caught by A2, A3, B3, B4 |
| MU5 evaluation count falsified upward | caught by C1, C2 |
| MU6 evaluation count falsified downward | caught by C1, C2 |
| MU7 accepted configurations falsified | caught by C1 |
| MU8 runs executed falsified | caught by C1 |
| MU9 category mislabelled as development | caught by C6 |
| MU10 study mislabelled | caught by C6 |
| MU11 evaluation kind overclaimed for 896xxx | caught by C4 |
| MU12 896xxx evaluation count invented | caught by C4 |
| MU13 inherited chain dropped | caught by A3, B4, D1, D2, E2 |
| MU14 inherited chain reordered | caught by D2 |
| MU15 block marked held out instead of consumed | caught by B6, D1 |
| MU16 held-out floor moved | caught by B6, C6, D1, D4 |
| MU17 provenance stripped | caught by A2 |
| MU18 proposed territory invented | caught by C6 |
| MU19 registry no longer frozen | caught by D5 |
| MU20 rangeFor off by one | caught by B2, B4 |
| MU21 no-op control (semantics unchanged) | no-op control survives |

**20 of 20 accounting mutants caught; the control survives.** Across all three subjects — the
successor link, the typed layer and the gate — the closure run reports **27 of 27 semantic
mutants caught**, with three no-op controls surviving (§14.6).

---

## 8. Historical compatibility

| Verifier | Result |
|---|---|
| `experiments/m18/verify_registry.js` | PASS — including B1, still true of the old link |
| `experiments/m19/verify_formulation.js` | exit 0 |
| `research/preregistrations/verify_m21.js` | 106/106 after the commit |
| `research/preregistrations/verify_m30.js` | 101/101 |
| `research/preregistrations/verify_m31.js` | 96/96 |
| `research/preregistrations/verify_m32.js` | 108/108 |
| `experiments/m15`, `m16`, `m17` | exit 0 · exit 0 · PASS |
| `experiments/m9/verify_m9.js` | 15/0 |
| `experiments/uqb/verify_uqb_impl.js` | 91/0 |
| `experiments/m33/verify.js` | **68/69 — one check fails BECAUSE of M34**, see §8.1 |
| `experiments/m33/verify_r1.js` | **113/114 — the same one check**, see §8.1 |
| `experiments/c1/gate.js` | 24 passed, 2 failed — **pre-existing and unchanged**: G8 (collection env var) and G10 (no prior collection output) fail identically at base `976904b`, because it is a *pre-collection* gate and C1 is collected |

### 8.1 The one check M34 breaks, and why it is a gate-scope limitation

M33's raw-import gate (`I1`, and `P4` in M33-R1) flags **any new file that statically imports a raw
governance module**, so that new *study* code must go through the typed layer. The new chain link
imports the previous link — which the M18 convention requires and which is how the inherited list is
guaranteed not to drift — so the gate reports exactly one offender:
`experiments/registry/consumed_after_c1.js`.

| | |
|---|---|
| Is this a governance violation by M34? | **No.** A registry link is the registry, not a consumer making study decisions through raw predicates |
| Could M34 avoid it? | Only by duplicating the inherited chain (drift risk the convention exists to prevent) or by hiding the import behind a computed path — **evading its own gate**, which this programme forbids |
| Where does the fix belong? | With the milestone that re-points `typed.js` (§13): the gate's allowlist needs a category for registry chain links, and `experiments/m33/verify.js` may not be modified by M34 |

**This was pinned as executed evidence, not prose:** check `P6` asks the M33 gate itself. **It is now
resolved by the closure (§14):** the gate learned the registry-chain category, `P6` requires an empty
offender list, and both M33 verifiers are green again.

**Collections were not re-run.** `c1/verify_collection.js`, and the M8/Q1/UQ-A collection verifiers,
boot agents; every protocol, collector and data file is byte-identical, so a re-run could only
reproduce what the digests already pin.

---

## 9. Seed accounting

| | |
|---|---|
| registered experimental seeds consumed by M34 | **0** |
| new territory allocated | **none** — `TERRITORY.proposed` is empty |
| 895000–895999 | recorded as **consumed** by C1, evaluated **1000/1000** (from C1's artifacts), 70 accepted, 140 runs |
| 896000–896999 | unchanged: consumed, **evaluation count not asserted** |
| held-out floor | unchanged at 900500 |
| lowest consumed seed | now 895000 (was 896000) |

---

## 10. Integrity

| Requirement | Result |
|---|---|
| registered experimental seeds consumed = 0 | **YES** (P4, E1) |
| 895000–895999 accounted, no false evaluation claim | **YES** (A1–A3, C1–C5) |
| UQ-B unchanged | **YES** (P2) |
| C1 unchanged | **YES** (P2 — protocol, collectors, candidates, results, digests) |
| production unchanged | **YES** (P2 — `main.js`, `render/`, `instrumentation/`, M7 runtime) |
| M33 / M33-R1 unchanged | **YES** (P2 — `typed.js` and both verifiers byte-identical) |
| no `futureScore`, graph-size or RNG change | **YES** — no such file is touched |
| no C × R collection | **YES** |
| working tree | clean apart from pre-existing untracked files |
| pushed | **NO** |

**Observation, not repaired (out of scope):** `experiments/c1/data/readouts.jsonl` is deliberately
gitignored by the committed `experiments/c1/data/.gitignore`, so its integrity rests on the committed
`INTEGRITY.sha256` digest rather than on git history. The digest matches (P5).

---

## 11. Evidence → Inference → Hypothesis

**EVIDENCE** *(executed or read from committed artifacts)*
- **Ev-1.** C1's `seedCensus`: `evaluatedCount 1000`, min 895000, max 895999; `accounting`: 70 accepted, 140 runs.
- **Ev-2.** `candidates.jsonl` — 4000 rows carrying exactly 1000 distinct seeds spanning the block; digests match `INTEGRITY.sha256`.
- **Ev-3.** The old link answers `isConsumed(895500) === false`; M18 B1 and `verify_m21` execute that as their record.
- **Ev-4.** Exhaustively over 0..1,000,000, the successor differs from the old link on exactly the 1000 C1 seeds and nowhere else.
- **Ev-5.** `typed.js` imports `./consumed.js` and not the successor.

**INFERENCE**
- **In-1.** The defect is a missing chain link, so the fix is an added link; editing the old link would falsify Ev-3's committed records.
- **In-2.** Because 895xxx was enumerated in full (Ev-1, Ev-2), declaring the whole block consumed claims no more than the artifacts show — unlike 896xxx, whose weaker claim is preserved.
- **In-3.** From Ev-5, the repair does not yet reach the typed layer, which is why M34 is YELLOW.

**HYPOTHESIS**
- **Hy-19.** That no *other* study has spent territory since `c59d457` without recording it. Only C1 ran in that window, but this is not proven exhaustively for every future audit.

---

## 12. Status

> # M34-GREEN
> **The accounting repair and its closure are complete and independently verified. The typed layer
> refuses 895xxx, the gate distinguishes a chain link from study code, and every historical record
> is untouched.**

Not YELLOW: both items the repair left open are closed and checked by execution (§14). Not HOLD:
nothing is unresolved.

---

## 13. Exact next best decision

> ## The successor research substrate is clean; the next scientific decision is the Director's
> With the registry chain, the typed layer and the gate consistent, the governance substrate no
> longer blocks anything. The open scientific items are unchanged and untouched by M34: the D2
> look-ahead defect, the inert executive controller, and the historical trajectory-seed accounting.

**Still gated on a Director ruling, not on the substrate:** any C × R preregistration or collection.

---

## 14. Closure (Director ruling: *M34 FINAL CLOSURE*)

### 14.1 Dependency chain

```
experiments/registry/typed.js            the typed governance layer every future study calls
   └─ consumed_after_c1.js               M34 link: C1's block + the inherited list, spread unchanged
        └─ consumed.js                   the link after UQ-B, byte-identical, still answering as M18/M21 recorded
             └─ uqb → uqa → q1 → m8 protocols
```

This is the chain convention the repository already used at M18 and M34: each link imports its
predecessor, and no historical link is rewritten.

### 14.2 The gate defect, exactly

`gateVerdict(current, allowlist)` knew only file **names**. Its permitted set was the base-commit
importers plus two M33 files, so **any** new importer of a raw governance module was an offender —
including a registry chain link, which the convention *requires* to import its predecessor. The gate
could not express the difference between *the registry* and *a consumer of the registry*.

### 14.3 The minimal fix

One predicate, `isRegistryChainLink(file, hits)`, and an optional import map:

- the file must be a chain link by path **and** name: `experiments/registry/consumed*.js`;
- when the caller supplies the import map, **every** governance module it imports must itself live in
  `experiments/registry/` — a link may import its predecessor and nothing else.

Nothing is whitelisted by name, no file outside that directory is exempt, and a study file is not
exempted by moving into the registry directory under another name (G4). The rule remains: *historical
raw registry predicates are protected from new study consumers, while successor registry links may
import their predecessor.*

### 14.4 Why this did not touch historical evidence

Both M33 verifiers are **source-bound to the typed.js of their own commits** — M33 to `3fb2876`,
M33-R1 to `73c12d9` — so re-pointing `typed.js` changes neither recorded result. Their check counts,
mutant lists and memo bindings are unchanged; only the gate's category is refined, and that refinement
is what makes them green again. **No historical registry file, protocol, dataset or memo was rewritten.**

### 14.5 Closure results

| Requirement | Check | Result |
|---|---|---|
| 1 typed.js resolves through the successor | T1, F2 | PASS |
| 2 895000–895999 refused at the typed layer | T2 (1000/1000) | PASS |
| 3 894999 outside the block | T3 | PASS |
| 4 895000 and 895999 classified | T4 | PASS |
| 5 896000 classified by the inherited record | T5 | PASS |
| 6 other typed decisions unchanged | T6 exhaustive 0..1,000,000, T7, T8 | PASS |
| 7 a new study importing the raw registry is still caught | G2, G6, G7 | PASS |
| 8 the legitimate chain link is accepted | G1, G5, P6 | PASS |
| 9 M33 and M33-R1 green again | 69/69 and 114/114 | PASS |
| 10 M34 verification green | 75/75 | PASS |
| 11 historical verifiers valid | §8 table | PASS |

### 14.6 Closure mutants

| Mutant | Outcome |
|---|---|
| TM1 typed layer still points at the pre-C1 link | caught by T1, T2, T4, T6 |
| TM2 typed layer silently accepts 895xxx | caught by T1, T2, T4, T6 |
| TM3 typed layer falsely rejects unrelated valid seeds | caught by T3, T6, T7 |
| TM4 no-op control (typed semantics unchanged) | no-op control survives |
| GM1 chain-link exemption broadened to any file | caught by G2, G4, G7, G5 |
| GM2 exemption ignores what the link imports | caught by G3 |
| GM3 raw study import no longer detected | caught by G6, G7 |
| GM4 chain-link category removed entirely | caught by G1, G7 |
| GM5 no-op control (gate semantics unchanged) | no-op control survives |

Each is caught by a named behavioural check. Two no-op controls survive. `GM3` initially survived
because the gate checks exercised only the verdict, never the scanner; `G6`/`G7` now exercise
detection itself on a synthetic tree.

**A self-referential trap, recorded because it cost two iterations:** the synthetic fixtures spell an
import of the historical registry, so writing them literally makes the gate read *this verifier* as a
raw importer — and the same is true of a comment quoting one. The fixture sources are therefore built
from parts, exactly as the M33 verifier builds its own mutation tokens.

### 14.7 Closure integrity

| | |
|---|---|
| files changed since `73c12d9` | `typed.js`, `m33/verify.js`, `consumed_after_c1.js`, `m34/verify.js`, this memo, `verify_m34.js` — nothing else (P1) |
| C1 data, results and digests · UQ-B · production · `consumed.js` · `m33/verify_r1.js` | byte-identical to `73c12d9` (P2) |
| `futureScore`, the graph, the RNG | untouched — no such file is in the change set |
| registered experimental seeds consumed | **0** (P4) |
| C1 readouts | still gitignored by design, integrity by committed digest; **not added to git** (P5) |
| 896xxx · 900500 floor | unchanged (C4, B6, T5) |
| pushed | **NO** |

---

Believe in yourself and keep going
