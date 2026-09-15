# Phase 0 — Method and Scope

**Audit date:** 2026-08-17
**Repository:** `[local path redacted for publication]`
**Commit state:** untouched. No repository file was modified, created, renamed, moved, or deleted during this audit, and no git operation was performed. All execution was done against a scratch copy outside the repository.

---

## 1. What this document set is

This is a **read-only archaeology** of MiniFlyWire. It answers one question:

> What does the code that actually runs actually do?

It does not propose implementations. It does not evaluate intent, ambition, or roadmap. Where a comment, a filename, a README claim, or a research note asserts a capability, that assertion is treated as a **hypothesis to be falsified against the execution path**, never as evidence.

## 2. Evidence standard

A capability is only credited when all five of the following hold:

| # | Requirement |
|---|---|
| E1 | The implementing code exists. |
| E2 | It is reachable from the live entry point (`index.html` → `main.js`) along a path with no dead guard. |
| E3 | Its output is consumed by something other than a log line, a HUD string, or a `THREE.Line`. |
| E4 | The consumption changes the value that action selection actually argmaxes over. |
| E5 | The change is non-degenerate — i.e. it varies across candidates, not just as a constant offset. |

E5 matters. Several MiniFlyWire subsystems satisfy E1–E4 and still contribute nothing, because their term is (a) identically zero, (b) constant across candidates, or (c) three orders of magnitude below the dominant term. A signal that cannot change the argmax is not a cognitive signal; it is decoration.

## 3. Classification vocabulary

| Label | Meaning |
|---|---|
| **EXISTS + WORKING** | E1–E5 all hold. The mechanism demonstrably changes behaviour. |
| **EXISTS + PARTIAL** | E1–E4 hold, but the effect is degenerate, mis-scaled, or applies only on a rare branch. |
| **CODE EXISTS BUT NOT ACTUALLY USED** | E1 holds; E2, E3, or E4 fails. Imported and never called, called and discarded, or written and never read. |
| **PLANNED/DOCUMENTED ONLY** | Described in comments, `research/`, `LAB_NOTES/`, or `Portfolio_Assets/`; no implementation on the live path. |
| **MISSING** | No implementation anywhere. |
| **UNCLEAR** | Implementation exists, but its effect cannot be determined without a browser run I could not perform. Flagged explicitly; not counted as working. |

## 4. Procedure actually followed

1. **Inventory.** Enumerated every file. 51 JS files, ~17,500 LOC. No `package.json`, no build step, no test suite, no CI.
2. **Static import graph.** Resolved every `from "..."` to build the module DAG and find orphans.
3. **Entry-point trace.** Read `index.html` → `main.js` end to end (5,250 lines), then every module it reaches, in call order.
4. **Reachability of every export.** Counted call sites of every exported symbol outside its defining file, then manually corrected for the two indirection patterns the repo uses (`sys.X(...)` dependency injection into `episodeManager`, `_sys.X(...)` into `schemaMemory`).
5. **Dataflow of the scoring call.** Enumerated every local computed inside `runPrediction`'s candidate loop and checked whether it reaches `calculateDecisionScore`'s destructured parameters, `...rest`, or nothing.
6. **Executable falsification.** Where a claim could be settled numerically, I imported the *unmodified repository modules* into Node and drove them with the exact call pattern `main.js` uses. Six probes, all reproduced in `04_FALSIFICATION_EVIDENCE.md`.
7. **Replication of the repo's own experiment.** Re-ran `experiments/exec_influence/run.js` from a scratch copy and confirmed its published `report.json` byte-for-byte on the metrics.

## 5. What I could not do, and what that costs

I could not run the application in a browser. `main.js` requires `THREE`, a WebGL context, `document`, `localStorage`, `fetch`, and keyboard input. Consequences:

- I have **no live behavioural trace** — no observed trajectory, no observed Q table, no observed episode store.
- Every claim below is therefore either (a) a structural claim about code, provable by reading, or (b) a numerical claim about a specific module, provable by driving that module directly.
- Two claims are marked **UNCLEAR** rather than resolved because they depend on browser-only ordering (`THREE.Object3D.id` allocation) — and in both cases I state the range of possible outcomes and show that *every* outcome in that range is non-functional.

This limitation cuts one way only: it prevents me from confirming that something works. It does not weaken any of the "does not work" findings, all of which are structural or module-level.

## 6. Prior art inside the repo

The repository already contains a partial self-audit: `experiments/exec_influence/` and `research/reviews/ENGINEERING_AUDIT_2026-06-27.md`. The `exec_influence` experiment is methodologically sound — seeded RNG, matched arms, capability control, telemetry — and its finding is correct and independently reproduced here. I want to note that explicitly, because it establishes that the project is already capable of the kind of falsification this audit is asking for. The problem is not that the team cannot measure; it is that measurement has been applied to one subsystem out of thirty.

One caveat on that harness: `experiments/exec_influence/scoring.real.js` has **drifted from `render/scoring.js`**. The live file gained a `schemaScore` field (render/scoring.js:423) that the experiment copy lacks. The copies are re-synced by hand. A harness that tests a stale duplicate of the module under test will eventually certify behaviour the product does not have.

## 7. Document map

| File | Contents |
|---|---|
| `00_METHOD_AND_SCOPE.md` | This file. |
| `01_RUNTIME_MAP.md` | The actual per-tick execution path and dataflow. |
| `02_COMPONENT_LEDGER.md` | All 30 components classified with file:line evidence. |
| `03_LOOP_AUDIT.md` | The cognitive loop, arrow by arrow. |
| `04_FALSIFICATION_EVIDENCE.md` | Executable probes and their output. |
| `05_VERDICT.md` | The answer to the core research question. |
