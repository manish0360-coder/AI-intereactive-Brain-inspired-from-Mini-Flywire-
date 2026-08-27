# M7 Pre-Registration — Erratum 10

**Erratum ID:** M7-ERR-10

**Date:** 2026-08-28
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-08-28 — *G16.4b disposition, D5 adopted*, following the G16 forensic audit and independent three-model review (technical evidence, independent scientific/governance review, architectural decision).

**Binds to frozen artifact:**

| | |
|---|---|
| Document | [`M7_PREREGISTRATION.md`](M7_PREREGISTRATION.md) v1.0 (frozen 2026-08-19) |
| **SHA-256** | **`2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9`** |
| Sidecar | [`M7_PREREGISTRATION.sha256`](M7_PREREGISTRATION.sha256) |
| Verify | `cd research/cognitive-audit && sha256sum -c M7_PREREGISTRATION.sha256` |

> **THE FROZEN PRE-REGISTRATION IS NOT MODIFIED BY THIS ERRATUM.** Its bytes and its digest are unchanged, verified immediately before and immediately after. This document supersedes one sub-clause by reference; it does not rewrite the frozen text, and the frozen text remains the historical record of what was specified.

---

## 0. Purpose, stated first

Frozen §13.4, gate **G16.4**, clause **(b)** — *"No other `render/` file modified"* — is **retired as an executable, reproducible runtime assertion.**

It is retired because its measurement had no stable repository referent, not because the property it named is uninteresting or unwanted.

**No replacement measurement is created by this erratum.** No content baseline is constructed, no Git commit range is selected, no allowlist assertion is substituted. A future isolation gate, if one is wanted, must be authorised in advance by a separate ruling and must carry its own mutation control.

**No threshold, seed range, statistic, acceptance criterion or study conclusion is altered.** In particular the M7-G15 result is untouched.

---

## 1. The clause at issue

Frozen §13.4, row G16.4, verbatim:

> **G16.4 | Isolated and auditable |** (a) `git diff` touches **exactly one line**, removing exactly the `Math.max(0, …)` wrapper — asserted by diff parsing, not by eye. (b) No other `render/` file modified. (c) A frozen pre-change copy committed under `experiments/m7/baseline/` as a **reference arm only, never a substitute**. (d) The module under test imported **live** from `render/scoring.js`

Only clause **(b)** is at issue. Clauses (a), (c) and (d) are unaffected and remain in force.

---

## 2. The demonstrated defect

`verify_G16.js:299-302` implemented clause (b) as a filesystem-modification-time comparison:

```js
const snapMs = fs.statSync(PRE).mtimeMs;
const touched = fs.readdirSync(render).filter(f => f.endsWith('.js'))
  .filter(f => fs.statSync(path.join(render, f)).mtimeMs > snapMs);
```

Established by audit:

1. **Not reproducible from Git history.** Git stores blobs, trees, commits and authorship timestamps. It does not store or restore `mtime`. Checkout stamps every file with the moment it was written to disk.
2. **Different answers over byte-identical content.** The same mechanism returned `{episodeManager.js, scoring.js}` in the authoring tree, `none` under a `git archive` materialisation, and **all 37 modules** in two independent fresh clones — determined entirely by file write ordering. In the clones, `experiments/` was written ~100 ms before `render/`.
3. **It measured filesystem edit chronology, not a content-derived property.** `render/scoring.js` carries mtime 2026-08-20 02:34:59 while Git records its last content change in commit `c9f71f5` on 2026-08-27.
4. **In the historical authoring tree it passed while seven content-changed `render/` modules lay outside its measurement** — `embeddings.js`, `episodicContextEngine.js`, `neuronVisuals.js`, `predictionError.js`, `qlearning.js`, `semanticProvenance.js`, `stars.js`. Each changed under a separate authority; none was visible to clause (b) as implemented.
5. **No commit range reconstructs the original touched set.** All 54 commits in the repository were checked; zero reproduce `{episodeManager.js, scoring.js}`. The nearest over-report `predictionError.js`, `qlearning.js` and `embeddings.js`; the next under-report to one module.
6. **Only 1 of 37 `render/` modules has an appropriate frozen reference** (`scoring.js`, via the three committed baselines).
7. **The gate's own controls could not detect this.** G16.4c1–c4 exercise the comparison predicate on literal lists and never consume the measured set, so they are invariant under any change to the measurement — including its removal.

### 2.1 The status of the historical PASS

The historical G16.4b PASS (33/0 in the authoring tree) **is not valid evidence for the claimed isolation property**, because its filesystem-mtime measurement was non-reproducible and did not reliably measure the full content-change population.

This is stated precisely and is **not** a claim that the assertion was vacuous, that unauthorised work occurred, or that the isolation property is false. The seven modules in §2.4 each changed under separate rulings. What the audit establishes is narrower and exact: **the measurement did not cover them, so the PASS cannot carry the weight of the clause.** Whether frozen §13.4(b) was intended to bind `render/` changes authorised outside §13 is a question the frozen text does not settle, and this erratum does not settle it either.

### 2.2 Why this is not an implementation defect

A pure implementation defect would mean the clause was measured correctly and only the mechanism's portability failed; swapping mechanisms would then be a repair requiring no new authority.

That is not the case here. The mtime mechanism measured a different quantity than clause (b) names. Any content-derived or commit-derived substitute would, for the first time, place the seven modules of §2.4 inside the measurement — and would therefore have returned RED in the tree where the original returned GREEN. Substituting a mechanism would **enlarge the population the gate quantifies over**. That is a change to the measured property, not a repair of it, and it is why this disposition is issued as an erratum rather than a patch.

---

## 3. The ruling

### 3.1 Disposition

Frozen §13.4 G16.4 clause **(b)** is **RETIRED as an executable runtime assertion.** `verify_G16.js` is not required to implement it, and no gate is required to carry it.

The delta-budget property that clause (b) served was, in practice, enforced per-milestone at commit time: each milestone in this branch was committed under a boundary audit that enumerated its exact file closure and excluded unrelated hunks. That enforcement is recorded in the commit history and in `research/09_decisions.md`. **It is recorded as history, not offered as a substitute measurement.**

### 3.2 What is explicitly NOT authorised

- **No new content baseline is created post-hoc.** Manufacturing the 36 missing per-module frozen references now would be authoring the reference arm after the tree is known — post-hoc construction of measurement evidence. *(Candidate D1, rejected.)*
- **No Git commit range is selected post-hoc.** No range reproduces the authorised set, so any choice would be fitted to the observed history. *(Candidate D2, rejected.)*
- **No literal-allowlist assertion is substituted.** Asserting that a constant has not been edited measures nothing about the tree. *(Candidate D3, rejected.)*
- **No replacement gate is created to keep G16 green.** Retirement means the assertion stops running, not that a weaker one takes its place.

### 3.3 Conditions on any future isolation gate

A future gate asserting the isolation property may be created **only** under a separate authority that is pre-specified before the measurement is taken, and it **must** include a mutation control in which modifying an unauthorised `render/` module causes the gate to report **RED**. The absence of such a control is what allowed the present defect to survive undetected. No such gate is constructed by this erratum.

### 3.4 Finality

This erratum closes the disposition of G16.4b. It does not reopen G16.1, G16.2, G16.3, G16.5, or clauses (a), (c) and (d) of G16.4, all of which stand as frozen.

---

## 4. What is NOT changed

| Item | Status |
|---|---|
| Frozen `M7_PREREGISTRATION.md` bytes and digest | **Unchanged** — `2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9` |
| Frozen §13.4 text, including clause (b) itself | **Unchanged — historically preserved, not rewritten** |
| G16.4 clauses (a), (c), (d) | **Unchanged, in force** |
| G16.1, G16.2, G16.3, G16.5 | **Unchanged, in force** |
| `verify_G16.js` source | **Not modified by this erratum** |
| Any threshold, seed range, statistic or acceptance criterion | **Unchanged** |
| M7-G15 result — self-check GREEN, sufficiency SATISFIED, gate **FAIL** | **Unchanged** |
| M7-ERR-01 … M7-ERR-09 | **Unchanged** |
| Production source | **Unchanged** |

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
| **M7-ERR-07** | Frozen §3.5 acceptance predicate; §5.1/§12.3 held-out semantics; unfrozen `maxTries` | `m7/env.js`, `m7/verify_env.js`, `m7/verify_acceptance.js` |
| **M7-ERR-08** | Frozen §9.1 "not equal" clause and 4.5% attribution; §14 G8 sub-clauses (ii) and (iii) | `m7/verify_G8.js` |
| **M7-ERR-09** | **ADDS bounded gate-diagnostic configuration-seed candidate range `900030–900499`. Supersedes no clause.** | `m7/verify_G15.js` |
| **M7-ERR-10** | **RETIRES frozen §13.4 G16.4 clause (b) as an executable runtime assertion. Creates no replacement measurement.** | *none — retirement, not implementation* |

---

## STATUS: ERRATUM ISSUED · FROZEN DOCUMENT UNMODIFIED

Digest `2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9` validates unchanged. M7-ERR-01 … M7-ERR-09 are unchanged. One sub-clause is retired; none is rewritten, weakened to obtain a green result, or replaced by a substitute measurement.
