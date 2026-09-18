# M39-P1 — RED record: FutureScore saturation at the end-of-run snapshot

**Milestone:** M39-P1 development pilot · **Formulation:** `dacdccd`
(`research/preregistrations/M39_FUTURESCORE_SHADOW_EVALUATION_FORMULATION.md`, unchanged)
**Verifier:** `node experiments/m39/verify.js` (add `--rerun` to regenerate fixture 896066:0 and
require byte identity) · **Director ruling:** the RED result is accepted.

> # M39-P1-RED
> The pilot stopped on X4 and X5. The instrument gates P0–P5 hold; P6 and P7 fail.

---

## 1. Protocol, as run

- **Fixtures:** the four approved development fixtures only: `896066:0`, `896066:1`, `896238:2`,
  `896329:3`.
- **Run:** one ARMED M7-harness run per fixture, with the UQ-B frozen inputs (agent seed
  `20260819000`, arm `A1`, 3000 ticks, `__M7_REPLAY_ONCE__`).
- **Snapshot:** the absolute end of the run. That is tick 3000, in phase 2 (`T_SHIFT` = 1500), with
  `thoughtTrail` and `recentMemory` frozen.
- **Readouts:** step-0 `bestChoice` at all 19 decision states of each fixture, with the UQ-B R2/R3
  freezes. The RNG is reseeded identically for every arm at a state. The arms are:
  - ON;
  - ZERO;
  - PERM₁…₁₉, restricted to the decision-time pool;
  - ORACLE-INJECTED, a diagnostic only;
  - the unguarded production path;
  - PERM under ZERO.
- **Processes:** every fixture was run in two independent processes at the same time.
- **Instrumentation:** the frozen UQ-B and M9 transforms, imported read-only, plus one guarded
  in-memory line that reports the decision-time pool. No production file changed.

## 2. X4 / X5 evidence

| Fixture (goal) | Decision-time candidates | at `futureBonus` = 20 | Rankable states | D | n₊ / n₋ | Attainable | ORACLE-INJECTED reaches R* |
|---|---|---|---|---|---|---|---|
| 896066:0 (8) | 129 | 129 | 0 | 0 | 0 / 0 | 19 / 19 | 6 |
| 896066:1 (12) | 111 | 111 | 0 | 0 | 0 / 0 | 19 / 19 | 6 |
| 896238:2 (16) | 103 | 103 | 0 | 0 | 0 / 0 | 17 / 19 | 7 |
| 896329:3 (19) | 123 | 123 | 0 | 0 | 0 / 0 | 19 / 19 | 4 |
| **total** | **466** | **466** | **0** | **0** | **0 / 0** | **74 / 76** | **23 / 74** |

- **Saturation:** every computed value in every pre-filter pool is exactly the production cap
  (`Math.min(futureScore × 4, 20)`, `main.js:1874`).
- **X4 fires:** n₊ + n₋ = 0.
- **X5 fires:** no pool holds two distinct FutureScore values.
- **X1, X2, X3 and X6 do not fire.**

## 3. P0–P7

| Gate | Result |
|---|---|
| P0 instrumentation | ON equals the unguarded production path (`bestChoice`, pool keys and weights) at all 76 states; the M9 pool size equals the observed pool |
| P1 snapshot reproducibility | the two processes per fixture produced **byte-identical** evidence; fingerprints and snapshot digests match; 3000 ticks, phase 2 |
| P2 pool invariance | the decision-time pool and the pre-filter keys are identical across every arm and both processes |
| P3 intervention semantics | values reproduce across arms and processes; ON delivers them; ZERO delivers 0; ORACLE-INJECTED delivers 20 on R* only; PERM preserves the pool multiset |
| P4 clock invariance | every readout is identical under a 1e8 ms clock shift (readouts do read `Date.now`, 22–38 times each; nothing reaching the readout depends on it) |
| P5 attainability | 74 attainable, 2 unattainable (`896238:2` nodes 1 and 3: R* = {2}, removed by F4, goal reachability), 0 undefined |
| P6 | **fails**: n₊ = n₋ = 0, D = 0 |
| P7 | **fails**: 0 rankable states |

## 4. PERM limitation

PERM wiring was exercised structurally, but its discriminating behavior was not empirically exercised
because the pilot FutureScore values were constant at the production cap. This is a consequence of
the data, not an implementation failure.

## 5. Mutation suite

The mutation suite was not executed: the formulation's STOP rule halted the pilot before mutation
execution. Two of its planned faults (PERM keeping the original assignment, and PERM changing the
multiset) could not have been detected on this data, because every value is equal.

## 6. Scope of the result

The only supported conclusion is that the M39 end-of-run pilot snapshots were saturated and therefore
non-discriminating for the intended E2 readout.

This record does **not** establish any of the following, each of which remains open:

- NOT: FutureScore is universally inert.
- NOT: FutureScore is falsified.
- NOT: planning is falsified.
- NOT: cognition is falsified.
- NOT: FutureScore never affects decisions.

## 7. Accounting

- **Seeds:** each process evaluated exactly its own fixture seed (896066, 896238, 896329), all in the
  consumed development block 896000–896999. Zero new seeds, no registered block, no new scientific
  block.
- **History:** C1, UQ-B, M7–M38, D2 and the M39 formulation are unchanged, and so is all production
  code. The only additions are `experiments/m39/` (hook, child, analysis, verifier, this note and
  the eight evidence files with `INTEGRITY.sha256`).
- **Evidence lineage (historical checks preserved unedited):**
  - `research/preregistrations/verify_m39.js` I2 ("no implementation directory: formulation only") now
    reports the existence of `experiments/m39/`. That is the expected formulation-to-pilot transition;
    its other 41 checks pass.
  - `experiments/d2/verify.js` S2 ("since 727b219 the only production change is render/planning.js")
    already lists the M39 formulation files added at `dacdccd`. That staleness predates this milestone
    and is not caused by it.
  - This record's own verifier is the successor binding for `experiments/m39/`.
- **Next experiment:** requires a new scientific formulation and independent review. None is proposed
  here.

> # M39-P1-RED
> The RED record is preserved. No repair, re-collection or redesign was attempted.
