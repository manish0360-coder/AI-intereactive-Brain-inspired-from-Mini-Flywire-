# FutureScore V2.3 — Study 2 / OQ-1a — Results

**Status:** EXECUTED under the Research Director authorization of 2026-09-26. Results frozen. **Primary OQ-1a status:** **UNRESOLVED**.
**Design:** [`FUTURESCORE_V2_3_STUDY2_OQ1_DESIGN_FINAL.md`](FUTURESCORE_V2_3_STUDY2_OQ1_DESIGN_FINAL.md) (baseline `d1949f9`, readiness `cfadedd9`) — not changed.
**Driver:** `d846fbd`, manifest `727193a8556493b589cbd50bf15377e25ed3667e21efa64e404b89ce10875687` (registered).
**Registration:** [`experiments/study2/STUDY2_REGISTRATION.json`](../../experiments/study2/STUDY2_REGISTRATION.json), sha256 `81f9c035c3abaa4ae30048baf67b294d0d288066c0fc43b9af8090df9a3dbfe4`.
**Evidence:** [`experiments/study2/execution/`](../../experiments/study2/execution/) · **Gate:** [`experiments/study2/verify_study2_execution.js`](../../experiments/study2/verify_study2_execution.js).
**Labels:** FACT (read from the committed evidence) / FROZEN RULE / INFERENCE / NOT PRE-REGISTERED.

This is an information result about OQ-1a only. It does not measure behaviour (OQ-1b), goal-reaching, or a global
treatment effect, and it makes no claim about cognition.

---

## A. Execution integrity

| Check | Result |
|---|---|
| Registration validated before execution (block, run count, agent seed, manifest, halt rule) | PASS |
| Block disjoint from every historical, development and held-out range; every seed fresh in the typed registry | PASS |
| Driver files == registered manifest, committed and unmodified; production tree == `a066d47` | PASS |
| Plan written before the first run | PASS — every run artifact carries the `PLAN.json` hash it was spawned with |
| Seeds requested | 644, strictly ascending 890000 → 890643, all inside the block; 890644–892999 never generated |
| Goal balance | 4 / 4 / 4 / 4 for goals 8 / 12 / 16 / 19 |
| Slots executed | 16 of 16, each exactly once, in slot order; no re-execution |
| Per-event apparatus checks (K(e) A–G, FULL = live, GEO = −d, snapshot, temporal witnesses) | all true on all 44,220 events; 0 integrity failures |
| G-IMPL-2 replay (slot 0, capture off) | identical on all 11 fingerprint fields; verification only |
| Crashes / halts | 0 / 0 |
| Integrity record | `INTEGRITY.sha256` matches all 20 files byte-for-byte |

## B. Runs completed (FACT)

| Slot | Goal | Accepted seed | Rejected before acceptance | R5 | Primary events | `m<2` excluded | Δ_r (primary) | Δ_r sensitivity | Δ_r post-shift |
|---|---|---|---|---|---|---|---|---|---|
| 0 | 8 | 890030 | 30 | 5 | 1383 | 0 | 0.0000 | 0.0000 | -0.1444 |
| 1 | 12 | 890116 | 85 | 12 | 1389 | 0 | 0.0000 | 0.0000 | -0.1044 |
| 2 | 16 | 890166 | 49 | 8 | 1382 | 51 | 0.0309 | 0.0309 | -0.1309 |
| 3 | 19 | 890177 | 10 | 10 | 1374 | 0 | 0.0044 | 0.0087 | -0.0988 |
| 4 | 8 | 890239 | 61 | 7 | 1373 | 0 | -0.0292 | -0.0292 | 0.0822 |
| 5 | 12 | 890258 | 18 | 6 | 1371 | 0 | 0.1835 | 0.1835 | -0.2462 |
| 6 | 16 | 890312 | 53 | 9 | 1397 | 22 | 0.0000 | 0.0000 | -0.1054 |
| 7 | 19 | 890326 | 13 | 5 | 1394 | 0 | 0.0757 | 0.0377 | -0.0475 |
| 8 | 8 | 890435 | 108 | 8 | 1393 | 0 | 0.0000 | 0.0000 | 0.0744 |
| 9 | 12 | 890456 | 20 | 8 | 1377 | 0 | 0.0000 | 0.0000 | -0.1438 |
| 10 | 16 | 890476 | 19 | 6 | 1390 | 24 | 0.0403 | 0.0381 | -0.0845 |
| 11 | 19 | 890519 | 42 | 6 | 1398 | 0 | -0.0222 | -0.0222 | -0.1029 |
| 12 | 8 | 890554 | 34 | 6 | 1384 | 0 | 0.0000 | 0.0000 | -0.0214 |
| 13 | 12 | 890629 | 74 | 9 | 1378 | 0 | 0.0000 | 0.0000 | 0.0000 |
| 14 | 16 | 890640 | 10 | 10 | 1386 | 64 | 0.1835 | 0.1835 | 0.0071 |
| 15 | 19 | 890643 | 2 | 7 | 1372 | 0 | 0.1127 | 0.1127 | -0.1523 |

All 16 runs completed; none crashed; no run was added, replaced, deleted or reordered.

## C. Exclusions and failures (FACT)

- **Run level:** none (16 planned, 16 completed, 0 crashed).
- **Event level, primary window:** 22141 primary events; 161 excluded with `m < 2` (all at goal-16 runs: slots 2, 6, 10, 14); undefined tau-b scored 0 (§P): FULL 144 events, GEO 737 events. Post-shift window: 22079 events, 205 excluded with `m < 2`.
- **Integrity events:** none. **Replay failures:** none. **Halts:** none.

## D. Primary result (FROZEN RULE §D, §Q)

| Quantity | Value |
|---|---|
| `θ = median over 16 runs of Δ_r` (PRIMARY) | **0** |
| Mean of Δ_r (secondary, descriptive) | 0.0362 |
| Per-run sign pattern (slot order) | `00++-+0+00+-00++` |
| Positive / negative / zero runs | 7 / 2 / 7 |
| Exact two-sided sign test (reported, no α) | p = 0.1797 |

## E. Bootstrap interval (FROZEN RULE §W)

Exact nonparametric bootstrap over all `16^16` resamples, two-sided 95% percentile interval of the median:

**[0, 0.0403]** — the interval **does not exclude zero** (its lower bound is exactly 0, and the rule requires
`lower > 0` or `upper < 0`, strictly).

## F. Secondary results and diagnostics

| Analysis | θ | 95% exact interval | Sign pattern | Note |
|---|---|---|---|---|
| Sensitivity: undefined-tau-b events excluded (§P) | 0 | [0, 0.0377] | `00++-+0+00+-00++` | same classification as primary |
| **Secondary, exploratory: post-shift** (`t > 1500`, `pPhase2`, §L) | **-0.1008** | **[-0.1309, -0.0214]** | `----+---+----0+-` | the interval excludes zero, below; this is the stale-evidence regime, and it does not change the primary conclusion |

- **R5 moderator (§M, descriptive):** R5 ranged 5–12; Spearman(R5, Δ_r) = -0.0296. No threshold, no subgroup test, no exclusion.
- **Monitored diagnostics (§G, not validity conditions):** the executed action was inside `K(e)` at 44220 of 44220 events; post-scoring augmentation never occurred (0 events).
- **Event-level descriptives (NOT pre-registered; computed after the frozen analysis; `POSTHOC_EVENT_DESCRIPTIVES.json`):**

| Window | Scored events | Δ(e) > 0 | Δ(e) < 0 | Δ(e) = 0 | FULL and GEO order the candidates identically | mean Δ(e) |
|---|---|---|---|---|---|---|
| Primary (`t ≤ 1500`, pPhase1) | 21980 | 8961 | 6259 | 6760 (30.8%) | 6642 (30.2%) | 0.0391 |
| Post-shift (`t > 1500`, pPhase2) | 21874 | 6703 | 13812 | 1359 (6.2%) | 1343 (6.1%) | -0.0936 |

  FACT: at about 70% of pre-shift decision events the learned evidence changes the step-0 ranking relative to the
  geometry-only ranking; the direction of the change relative to the oracle is mixed. The within-run median is
  exactly 0 in 7 of 16 runs: in each of those runs neither the positive nor the negative events reach half of the
  run's events, so the median falls among the Δ(e) = 0 events (per-run counts in the descriptives file).
  These descriptives do not change any frozen result or classification.

## G. OQ-1a status under the frozen rules

**FROZEN RULE §W** (positive): requires Δ_r > 0 with a consistent sign majority **and** an interval excluding zero.
The interval does not exclude zero, so the §W statement is **not** supported: this study does **not** show that
learned traversal evidence adds oracle-concordant ranking information beyond geometric goal distance.

**FROZEN RULE §V** (null): Δ_r centred on zero, an interval spanning zero, and no sign majority. θ = 0 and the
interval includes zero, but 7 runs are positive against 2 negative, so the "no sign majority" condition is not
cleanly met either.

**Classification: UNRESOLVED (inconclusive about OQ-1a).** Not supported and not falsified: nothing in the primary
analysis is inconsistent with OQ-1a (no interval below zero), and the null statement's conditions are not all met.
The §V caution applies: this does not establish that learned evidence is useless in general, in other
environments, at other horizons, or behaviourally.

The post-shift result (§L) is secondary and exploratory and is never used to change the primary conclusion.

## H. Evidence for the next architectural decision

**FACT, from this study:**
1. **Pre-shift (current evidence):** no detectable oracle-concordance gain from learned evidence at n = 16
   (θ = 0, interval [0, 0.0403]); the evidence changes the ranking at most decision events, in both directions.
2. **Post-shift (stale evidence, secondary):** learned evidence is associated with **lower** oracle concordance than
   geometry alone (θ = -0.1008, interval excludes zero), consistent with the stale-evidence measurements of
   FS-OQ1-F2-FEAS. V2.3's `c_hat = (a+1)/(s+1)` has no recency mechanism, by contract.
3. **Mechanics:** in all 44,220 events the executed action came from the FutureScore-scored step-0 set and no
   augmentation fired, so the step-0 ranking is where FutureScore's influence enters.

**INFERENCE (not a result):** on the OQ-1a evidence alone, learned evidence in V2.3 gives no demonstrated ranking
benefit over geometry in the current-evidence regime and a measured cost after a reliability shift. Nothing here
requires more OQ-1a runs to make an architecture decision about FutureScore's learned-evidence path.

**What this study cannot supply** (named, not proposed as work): behavioural consequences (OQ-1b); any regime other
than this 20-node topology; any estimator other than frozen V2.3.

**No further experiment is designed here.** Per the authorization, the programme returns to the Mini Prometheus
manufacturing objective; any decision to keep, gate, or remove the learned-evidence path is the Director's.

---

Scientific seeds generated: **644 requested within the authorized block** (890000–890643); no seed outside it.
Study 2 executed: **YES, once**, as registered. No threshold, estimator, window or rule was changed.
