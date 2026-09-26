# FutureScore V2.3 — Study 2 — Scientific Disposition (FROZEN)

**Status:** FROZEN by the Research Director, 2026-09-26. **The FutureScore research thread is CLOSED.**
**Evidence (immutable):** commit `0c635e16413d04b9f09430b18e939e3e4f247d92` (pushed), results in
[`FUTURESCORE_V2_3_STUDY2_RESULTS.md`](FUTURESCORE_V2_3_STUDY2_RESULTS.md), run evidence in
[`experiments/study2/execution/`](../../experiments/study2/execution/), gate
[`experiments/study2/verify_study2_execution.js`](../../experiments/study2/verify_study2_execution.js).

This record adds nothing to the results and changes none of them. It records the Director's disposition.

## Disposition

**OQ-1a = UNRESOLVED.**

| Primary quantity | Value |
|---|---|
| θ = median over 16 runs of Δ_r | 0 |
| 95% exact bootstrap interval | [0, 0.0403] |

Therefore:
- the positive promotion criterion (design §W) is **not** satisfied;
- the falsification criterion is **not** satisfied;
- there is **no** claim that V2.3 improves oracle agreement;
- there is **no** claim that V2.3 is disproven.

The secondary post-shift result (θ = −0.1008, interval [−0.1309, −0.0214]) remains secondary and exploratory. It is
**not** the primary conclusion and does not change it.

## Status of the mechanism

FutureScore V2.3 is a **research-grade experimental mechanism**. It is **not** a required core production decision
signal. For Mini Prometheus it is an **optional research artifact outside the critical manufacturing execution
path**, and it must not become a mandatory dependency.

This record changes no code. The MiniFlyWire agent still contains the V2.3 consumer exactly as committed at
`952c9fc`; any change to that wiring would be a separate, authorized engineering decision.

## Closed

The following are closed and require a new Director authorization to reopen:
- no rerun of Study 2, and no additional FutureScore seeds;
- no increase of n, no threshold tuning, no change to tau-b or the exact bootstrap, no oracle redesign;
- no further OQ-1a experiment.

The seed-registry and historical-verifier compatibility items found during execution are recorded separately in
[`REGISTRY_MAINTENANCE_NOTE_01.md`](REGISTRY_MAINTENANCE_NOTE_01.md). They are non-blocking and do not reopen the study.
