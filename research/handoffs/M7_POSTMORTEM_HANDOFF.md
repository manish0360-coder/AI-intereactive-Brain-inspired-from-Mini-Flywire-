# M7 — Postmortem and Research Handoff

**Prepared:** 2026-08-28 · **Author:** Chief Systems Engineer
**Audience:** Director and independent scientific review

> ## STATUS OF THIS DOCUMENT
>
> This is a **historical research handoff and postmortem record**. It is explicitly:
>
> - **non-governing** — it authorises nothing and constrains nothing;
> - **non-executable** — no gate, verifier, or measurement lives here;
> - **not a pre-registration**;
> - **not an erratum** — it supersedes no clause and binds no digest;
> - **not a replacement measurement** for anything retired;
> - **not an interpretation that changes the frozen G15 result.**
>
> Where this document and any frozen artifact, erratum, or verifier disagree, **the frozen artifact governs and this document is wrong.**
>
> Its only purpose is to preserve the transition boundary between frozen M7 and any future research phase.

**M7 closed at commit `707cb1e5205a7e9979f81092ee1ebfa0fe28922e`.**

---

## 1. Canonical state at closure

| | |
|---|---|
| HEAD at closure | `707cb1e5205a7e9979f81092ee1ebfa0fe28922e` |
| Branch | `main`, synchronized with `origin/main` |
| Frozen pre-registration | `M7_PREREGISTRATION.md`, SHA-256 `2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9` |
| Integrity check | `cd research/cognitive-audit && sha256sum -c M7_PREREGISTRATION.sha256` → OK |
| Erratum chain | M7-ERR-01 … M7-ERR-10, cumulative |

`.gitattributes` pins the frozen document and the erratum chain to `-text`, so the digest survives checkout on platforms that would otherwise rewrite line endings.

---

## 2. Milestone chain

Fifteen commits above `7c8bdde`. Each commit boundary establishes one engineering property; it does not merely move related code.

| Commit | Milestone | Property established for the first time |
|---|---|---|
| `062d575` `f06d536` `7e0d3ed` | Seeded RNG (Q3) | Every cognitive and visual draw resolves through named, seeded streams; identical seeds produce identical runs. |
| `433db98` | D3 term ledger | Arbitration terms are recorded rather than inferred from the final score. |
| `c9f71f5` | Trust rectification §13.1 | Negative trust evidence becomes decision-usable; the `Math.max(0, …)` wrapper that discarded it is gone. |
| `04afbf2` | M-α probe | Transition uncertainty can be read without perturbing it — the prior getter decayed and selectively destroyed what it measured. |
| `47038e1` | M-β `getQAny` | A Q read resolves both legacy bare and goal-namespaced composite keys, and the embedding path uses it. |
| `1286fa2` | D1 episodic writes | Every episode source writes Q into the same goal namespace the decision path reads. |
| `eaed7c7` | M7 runtime foundation | An executable, armable, deterministic M7 runtime — E1–E6 seams, episode cap, goal seam, environment, arms, reproducible driver. |
| `4a1404d` | Step ledger | Trajectory support counts executed behavioural commitments, independent of whether the environment realised them. |
| `ae45f20` | G15 evidence | The calibration gate is executable and its verdict is recorded unaltered. |
| `9c8ee9c` | Governance closure | Every governing authority cited by committed code exists in the repository, and the frozen digest survives checkout. |
| `cbb8c0a` | Phase 1.0 closure | Every Phase 1.0 milestone in history can be re-verified from the repository alone. |
| `48b78a2` | M7-ERR-10 | G16.4b retired as an executable assertion, with no replacement measurement. |
| `707cb1e` | G16 reproducibility | `verify_G16.js` returns the same verdict on any checkout; frozen §13.4(c) path populated. |

---

## 3. The G15 scientific conclusion

Recorded at `ae45f20`, reproduced here verbatim and unaltered:

```
VERIFIER SELF-CHECK : GREEN      24 passed, 0 failed, exit 0
INFORMATION SUFFICIENCY : SATISFIED
GATE G15 : FAIL
```

A **decided** negative, not an inconclusive one. Every diversity requirement was met, so the gate had the information it needed and returned FAIL. Under frozen §9.4 a gate failure halts the study.

| Measurement | Value | Requirement |
|---|---|---|
| Spearman ρ — Phase I | `0.007858` | \|ρ\| < 0.10 — within |
| Spearman ρ — Phase II | `0.159945` | \|ρ\| < 0.10 — **exceeds** |
| Accepted configuration samples | 41 | ≥ 20 · met |
| Distinct full `p_e` vectors | 17 | ≥ 10 · met |
| Distinct mean `p_e` values | 17 | ≥ 5 · met |
| Goal-reach events | 26143 | all in exactly one phase denominator |
| Run length · agent seed · arm | 3000 · 20260819000 · A1 | frozen §3.7 |

**The supported conclusion, stated exactly:** MiniFlyWire does *not* maintain goal-reward eligibility calibrated to hidden per-edge traversal reliability at the frozen tolerance. Phase II eligibility shows systematic dependence on `p_e` above the pre-registered bound, on 41 configurations with information sufficiency satisfied and both phases required to pass (A9).

No exclusions were applied: 2049 replay-branch goal reaches counted (C2), 13663 of 26143 events with no canonical edge into the goal still counted (C3), unit of analysis the configuration — n = 41, not 26143 events (C6). Held-out protections held: 0 seeds at or above 900500 (S1), all 470 evaluated seeds inside the ERR-09 range 900030–900499 (S1b), maximum forward advance 0 (S1c).

> This result is frozen. It is not to be reopened, reinterpreted, tuned, re-run for improvement, or rescued by threshold modification. A correctly executed negative is a successful scientific outcome.

---

## 4. What G16.4b's retirement does *not* establish

Frozen §13.4 G16.4(b) — *"No other `render/` file modified"* — was retired as an executable runtime assertion by **M7-ERR-10**. The following claims are unsupported and must not appear in any downstream write-up.

| Claim | Status |
|---|---|
| The trust rectification was isolated to the authorised `render/` module set. | **not established** |
| The historical 33/0 G16 PASS evidences that isolation property. | **not established** |
| The delta budget was verified by an executable gate. | **not established** |
| Unauthorised work occurred in `render/` during M7. | **not a finding** |
| The isolation property is false. | **not a finding** |

The precise finding is narrower than either extreme: **the historical PASS is not valid evidence for the claimed isolation property, because its filesystem-mtime measurement was non-reproducible and did not reliably measure the full content-change population.** Seven content-changed modules — `embeddings`, `episodicContextEngine`, `neuronVisuals`, `predictionError`, `qlearning`, `semanticProvenance`, `stars` — lay outside the measurement, and each changed under a separate ruling.

**What replaced it: nothing.** No frozen references were created post-hoc, no commit range selected, no allowlist assertion substituted, no replacement gate. What the property served was in practice enforced per-milestone at commit time through boundary audits recorded in the commit history — that is history, not a substitute measurement.

Still in force and reproducible: G16.1, G16.2, G16.3, G16.5, and clauses (a), (c), (d) of G16.4. Reverting the rectification in an isolated clone turns 11 of these RED, so the surviving gate detects rather than merely passes.

---

## 5. Capabilities that exist independently of the G15 result

Engineering properties of the committed tree. None depends on G15 passing; none is invalidated by its failure.

| Capability | Where | Evidence |
|---|---|---|
| Seeded determinism across named cognitive / visual / environment streams | `instrumentation/rng.js` | identical fingerprints on repeated runs, 3 seeds |
| Executable, armable M7 runtime with E1–E6 seams, episode cap, goal seam | `experiments/m7/`, `main.js` | 443 passed / 0 failed across 12 gates |
| Deterministic replay cooldown under `__M7_REPLAY_ONCE__` | `render/episodeManager.js` | suppressing arming or guard → 4–5 distinct fingerprints from 8 runs |
| Unified goal-namespaced Q: episodic writes readable by the decision path | `episodeManager`, `qlearning`, `main.js` | `verify_S2` 14/0; bare keys eliminated 5→0, 11→0, 5→0 |
| Non-mutating uncertainty probe | `render/predictionError.js` | `verify_S6` 18/0, incl. destructive-getter control |
| Step ledger: support from executed commitments, guarded, default off | `main.js` | 29/0; guard OFF bit-identical to the pre-ledger build |
| Reproducible Phase 1.0 verification closure | `experiments/phase1_0/` | S1 12/0 · S1′ 7/0 · S3′ 2/0 · S4 12/0 · G9 11/0 · G16 28/0 · parity 200000/200000 |
| Governance integrity: frozen digest verifiable from a fresh clone | `research/`, `.gitattributes` | checkout SHA-256 `2f12e309…f6b9`, 55124 bytes, 0 CR |

Two assertions are red **by design** and must stay that way: `verify_S1b` S1.7 and `verify_S3` S3.2 are preserved provenance, superseded by `verify_S1prime` (M7-ERR-02) and `verify_S3prime` (M7-ERR-01b). They are not regressions.

---

## 6. Invariants any successor phase must preserve

### Governance

- `M7_PREREGISTRATION.md` and its sidecar are immutable. Change arrives only as a numbered erratum binding twice to the digest; the frozen text is quoted, never rewritten.
- The erratum chain is cumulative — ERR-*n* restates the full register. M7-ERR-10 is the current tail.
- Held-out seeds at or above 900500 are never generated or inspected. The frozen §15.0 F-11 block 900005–900009 is not repurposed.
- A gate may not be weakened to obtain a green result, and an M1 assertion may not be weakened to accommodate M7 (frozen §13.5).

### Measurement

- Every detecting assertion must fail against a mutation or pre-change control. An assertion whose controls exercise only its *predicate* — never its *input* — has no anti-vacuity coverage; that gap is what let G16.4b survive.
- No gate may depend on filesystem metadata, wall-clock time, or anything Git does not carry. Verdicts must be identical in the authoring tree, an archive materialisation, and a fresh CRLF clone.
- Any future isolation gate requires a **pre-specified** authority and a mutation control in which modifying an unauthorised `render/` module turns it RED.

### Runtime

- Experiment hooks stay guarded and default-off; unset, the build is bit-identical. `__M7_*` is experiment scope, `__MFW_*` is architecture scope — the distinction is load-bearing.
- Cognitive, visual and environment RNG streams stay separated; no path may reintroduce `Math.random()` on the agent path.
- The frozen §18.4 replay branch remains unrepaired; E8 `pathDepth` and E9 self-pair writes remain out of scope.

### Repository

- One logically complete engineering property per commit, verified on the committed tree — never on a worktree carrying unstaged dependencies.
- Artifacts enter Git only on a concrete reproducibility, governance, or scientific dependency — never to tidy the working tree.

---

## 7. Untracked artifacts at closure, classified

Recorded for the successor phase. **None is committed, and none should be committed to make the tree clean.** Promotion requires a work item establishing a concrete dependency.

| Artifact | Class | Rationale |
|---|---|---|
| `experiments/m7/diagnose_G11.js` | retain locally | Self-labelled diagnostic; cited by nothing. Explains G11 leakage in accepted configurations. |
| `experiments/phase1_0/_probe_epsilon.js`, `_probe_stale.js`, `_probe_subsystems.js` | retain locally | Investigation probes over the live driver; no committed verifier depends on them. |
| `research/cognitive-audit/00_METHOD_AND_SCOPE`, `01_RUNTIME_MAP`, `02_COMPONENT_LEDGER`, `03_LOOP_AUDIT`, `04_FALSIFICATION_EVIDENCE`, `05_VERDICT` | future evidence | The original cognitive audit that motivated M7. Not cited by committed code, but the substantive prior for any successor hypothesis. |
| `research/cognitive-audit/M7_SCIENTIFIC_SPEC_DRAFT`, `M7_GATE_SEMANTICS_AUDIT`, `M7_CHARACTERIZATION_FINDINGS` | future evidence | Working scientific record behind the frozen pre-registration; the natural drafting basis for a successor pre-registration. |
| `research/cognitive-audit/M6_SPECIFICATION`, `PHASE_1_0_IMPLEMENTATION_PLAN`, `MF-1_REVISED_SPEC`, `README` | future evidence | Design lineage for the committed capabilities in §5. |
| `research/cognitive-audit/MF-1_SUPERSEDED_ORIGINAL_SPEC` | obsolete | Self-declared superseded by the revised spec. |
| `research/cognitive-audit/probes/` (10 `.mjs`) | obsolete | Every one imports from `/tmp/mfw/…` or `/tmp/p1/…`; unrunnable as written. |

---

## 8. The transition boundary

### Side A — frozen M7 historical work

*Closed at `707cb1e`. No further commits.*

- The pre-registration, its digest, and M7-ERR-01 … M7-ERR-10.
- The G15 result and its verifier, exactly as recorded at `ae45f20`.
- The M7 runtime, arms, environment and all twelve gates, as the instrument that produced that result.
- The retirement of G16.4b and the reproducibility repair of `verify_G16`.
- Every commit boundary and its verification evidence.

### Side B — successor research phase

*Requires a new pre-registration, written and frozen before any measurement.*

- Any new hypothesis about reliability calibration — including any explanation of *why* Phase II ρ = 0.159945.
- Any use of the held-out seed block, which remains untouched and available exactly once.
- Any isolation gate replacing what G16.4b attempted, under the §6 conditions.
- Any change to eligibility, reward, or trajectory-support semantics — the step ledger is committed, but its arming is a research decision.
- Any modification to the M7 instrument, which would end its status as the thing that produced the frozen result.

### The boundary rule

M7's instrument and its result are now one artifact. Anything that would **alter** the instrument belongs on side B and needs its own pre-registration written and frozen *before* the measurement it governs. Anything that merely **reads or reproduces** M7 belongs on side A and needs nothing new.

The G15 negative constrains what a successor may claim, not whether one may exist. The architecture that produced the result — seeded determinism, a unified goal namespace, non-perturbing probes, a commitment-based step ledger — stands on its own and is available to it.

---

*End of handoff. This document records; it does not govern.*
