# M12 — from belief to behaviour: where the M11 recovery advantage comes from

**Status.** Mechanism analysis of the existing M11 record, 2026-11-18. The owner accepted it "as a useful explanation
supported by the existing 810-run data". Nothing was run, rerun, replayed or tuned. No agent, parameter or task file
was changed. The only change to the M11 record is the dated amendment at the end of its
[RESULTS.md](../m11_routes/RESULTS.md) (§8 below).

**Evidence category.** Post-hoc, observational and descriptive. It analyses one development-level demonstration (M11)
after its result was known. The explanation below is **strongly supported by observational analysis, but it is not
definitive causal proof**:
- the groups are defined by BELIEF's own behaviour;
- nothing was intervened on;
- MBVI3's side is observed only in 18 traces.

It confirms nothing about the agent.

## The answer

The observational analysis attributes the 61% to a behaviour that M11's crossing measure did not count:

- **BELIEF goes back to exits its change detector had written off; MBVI3 does not.**
- **It usually goes back late.** M11 counted a crossing only inside the reopened edge's own after-window. BELIEF
  usually returns about 200 steps after the block, two to four windows later, when its belief that the exit works
  again has grown.
- **It also goes back to exits the detector wrote off by mistake** (false alarms). This involves no scheduled reopening
  at all.
- **Once back, it stays on the shorter route.** MBVI3 keeps its detour for the rest of the run.

The steps saved show up in the after-reversed windows of later events, which is where D1 measured them.

In the 103 OFTEN labels where neither agent crossed a reopened edge inside its own after-window:

| Labels | Summed difference (MBVI3 − BELIEF), steps in after-reversed windows |
|---|---|
| The 51 where BELIEF made such a return (taken from BELIEF's own archive log) | **+924** |
| The other 52 | **−8** |
| All 103 | +916 (the 61% of the 1,494 total) |

Three further checks:
- **Timing within a label:** the difference is −3 before the first return and +927 from it onwards.
- **Same event index:** labels without a return stay near zero at every event index.
- **Dose:** the gain grows with the number of returns.

**What is seen only in the 18 traces:** that MBVI3 never goes back. Of the reopened edges MBVI3 had run into while
they were blocked, it crossed 0 of 8 again for the rest of the run; BELIEF crossed 3 of its 10. The full rows hold no
MBVI3 event log, so there this link is inferred from the step counts, not observed. That is the one gap. The minimum
evidence that would close it is in §7.

## 1. What was used

- **Data:** [`m11_result.json`](../m11_routes/results/m11_result.json) (SHA-256 `3d86d073…1c05`): the 810 stored E5
  rows and the 18 stored traces.
- **More of the rows than M11 used:**
  - **BELIEF's own event log:** every archive it opened and every reversal it confirmed, with the step (in
    `secondary.volatility.log`).
  - **Both agents' change-detector counts** (`secondary.model.changesDown` / `changesUp`).
  - **Both agents' decision counts.** With the per-event step counts, these place every logged step inside its event
    window.
- **Reconstructed without running any agent:**
  - the graph's hidden relabelling (`mfwWorld`);
  - each label's schedule (`planE5`). This is needed to name a logged (observation label, action) pair as an edge.
- **Reconstruction checks, all passing:**
  - start and goal of all 810 rows;
  - the 18 stored schedules;
  - window ends equal to the stored decision counts;
  - every archive and confirmation classified exactly as M11's ground-truth diagnostics counted them (`opensReal`,
    `opensFalse`, `confirmsReal`, `confirmsFalse`) in all 405 BELIEF rows.

**One fact about the model frames everything.** World model v6 is v3 plus archives
([`v6/world_model.mjs`](../../cognitive/mind/v6/world_model.mjs)). For an exit with no open archive, v6 returns v3's
prediction unchanged. So BELIEF and MBVI3 can act differently only because of an archived exit.

The data agree with this on all 810 rows:
- Every event window that ends before BELIEF's first archive is identical for the two agents.
- The 11 labels in which BELIEF never opened an archive (9 OFTEN, 2 HALF) tie exactly.

An archive opens when v3's detector declares an exit worse: a genuine block, or a run of chance failures on an edge
whose reliability is below 1 (a false alarm). From then on:
- **BELIEF** predicts a mixture of the old and new regimes. The old regime's weight grows with the time since the
  change (h = 0.01 a step, ρ = 1/2). With no failed re-test in between, the weight is about 0.2 after 50 steps and
  about 0.45 after 220.
- **MBVI3** keeps v3's post-change estimate, about 0.1 that the exit works. Without a re-test that estimate never
  changes.

## 2. Q1 — Which behavioural differences explain the recovery advantage?

**BELIEF returns to written-off exits, and keeps using them.** Returns per family over all 135 labels, from BELIEF's
own log:

| Family | Returns to a reopened edge counted by M11 (inside that edge's after-window) | Returns to a reopened edge M11 did not count (later) | Returns to a falsely written-off exit |
|---|---|---|---|
| RARE | 6 | 6 | 40 |
| HALF | 18 | 37 | 40 |
| OFTEN | 22 | 63 | 35 |

In OFTEN, the uncounted returns happen a median of 210 steps after the archive opened:
- 45 of the 63 happen in a later event's blocked window;
- 18 happen in another event's after-window.

M11's crossing measure (D3) saw only the first column.

**The advantage follows the returns.** OFTEN, all 135 labels, MBVI3 − BELIEF:

| BELIEF's returns in the run | Labels | After-reversed, per label [95%] | Total, per label [95%] |
|---|---|---|---|
| Never opened an archive | 9 | 0 (all tie) | 0 |
| Opened archives, never returned | 46 | −0.07 [−0.54, 0.39] | −1.43 [−2.30, −0.74] |
| Returned at least once | 80 | +18.71 [12.53, 25.46] | +33.65 [22.71, 45.95] |

Intervals are paired percentile bootstraps over labels (10,000 resamples). They describe spread; no threshold is
applied.

**Why the returns come late.** A blocked window lasts about 50 steps (10 episodes from the start). When the edge
reopens, BELIEF's weight on the old regime is still about 0.2, so a detour of similar length still looks better and it
does not re-test. By about 200 steps the weight is around 0.45. The planner then re-tests, finds the edge open,
confirms the reversal, and goes back to the shorter route.

The pre-declared M11 illustration shows the first half of this and stops: BELIEF's prediction was 0.26 at the
reopening and 0.44 later, while MBVI3's stayed near 0.1. That label then had no further reopening it could use.

**The same channel explains the RARE cost.** In RARE, 89 labels opened archives and never returned. They lose
−5.46 [−6.94, −4.06] steps a label. That is the re-test cost: BELIEF re-tests permanently blocked exits more often
(2,041 futile re-tests against MBVI3's 1,597).

## 3. Q4 — Which metrics explain the 61% quantitatively? (full rows)

The 61% is 916 of the 1,494 steps summed over the OFTEN after-reversed windows. It comes from the 103 labels where
neither agent crossed a reopened edge inside its own after-window.

**Split by what BELIEF did** (from its own log; no MBVI3 information needed):

| In the 103 labels | Labels | Summed after-reversed difference | Share of 916 | Summed total difference |
|---|---|---|---|---|
| No archive ever | 9 | 0 | 0% | 0 |
| Archives, never returned | 43 | −8 | −1% | −63 |
| Returned to a reopened edge (later) only | 27 | +485 | 53% | +1,167 |
| Returned to a falsely written-off exit only | 15 | +223 | 24% | +375 |
| Both | 9 | +216 | 24% | +425 |
| **Any return (sum of the last three)** | **51** | **+924** | **101%** | **+1,967** |

Per label: −0.19 [−0.65, 0.23] without a return and +18.12 [11.51, 25.31] with one. Labels favouring BELIEF / MBVI3 /
tied are 2 / 4 / 37 without a return and 32 / 8 / 11 with one.

**Three checks that this is the channel and not a coincidence:**

1. **Within a label.** In the 51 labels with a return, the summed after-reversed difference is:
   - −3 in the windows that end before BELIEF's first return;
   - +35 in the window that contains it;
   - +892 in the windows after it.

   (Total steps: −15, +388, +1,594.)
2. **At the same event index.** Later events offer more chances in every group, so time alone could produce a rise.
   It does not.

   | Event | 1 | 2 | 3 | 4 | 5 | 6 |
   |---|---|---|---|---|---|---|
   | Never returned (43 labels) | 0 | −7 | +5 | −2 | 0 | −4 |
   | Returned (51 labels) | −2 | +36 | +134 | +161 | +225 | +370 |

3. **Dose.**

   | Returns in the run | 0 | 1 | 2 | 3+ |
   |---|---|---|---|---|
   | Labels | 43 | 38 | 10 | 3 |
   | Per label | −0.19 | +15.7 | +23.1 | +32.0 |

In these labels, BELIEF's first return was to a reopened edge in 31 cases, a median of 224 steps after the archive
opened. In the other 20 it was to a falsely written-off exit.

The same pattern holds in HALF. Without a return, HALF loses −0.15 [−0.87, 0.65] a label; with one it gains
+7.42 [3.36, 11.96].

## 4. Q2 — Do the agents choose different routes after failed movements? (traces only)

**Not at the failure itself.** After a failed move, both agents update the same v3 model. BELIEF's new archive starts
with weight 0 on the old regime, so both choose the same next step. In the 7 traced pairs that diverge at all (2 never
do), the first difference comes 1 to 190 steps after BELIEF opened an archive.

**When they do diverge, it is BELIEF going for an archived exit.** All 7 first divergences are of this kind:

| Pair | What BELIEF did | BELIEF's p for that exit | MBVI3's p for it |
|---|---|---|---|
| 5 pairs | Re-tested an archived exit that was still blocked | 0.23–0.38 | 0.02–0.14 |
| label 0, RARE | Moved towards an archived exit (17 → 19 → 6, two moves), then failed on it | | |
| label 1, RARE | Moved one step towards a falsely archived exit (8 → 9), then crossed it (9 → 4): a false-alarm repair | | |

**Routes are mostly the same.**
- 1,004 of the 1,080 change-phase episodes (93%) follow identical routes in the two agents.
- Across the 26 reopened blocks in the traces, both agents met 8 while they were blocked; BELIEF met two more.
  - Afterwards BELIEF crossed 3 of its 10 again: twice in the edge's own after-window, once later.
  - **MBVI3 crossed 0 of its 8 again,** for the rest of the run.
  - For blocks an agent never met, its behaviour on that edge did not depend on the belief. In label 1 HALF, event 2,
    both agents crossed the reopened edge 60 times.

**Where the step differences come from in the traces** (MBVI3 − BELIEF, summed over the 9 pairs):

| Windows | Steps | Successful moves | Failed tries on blocked edges | Chance failures |
|---|---|---|---|---|
| All | −38 | +1 | −62 | +23 |
| Blocked | −53 | −7 | −47 | +1 |
| After-reversed | +17 | +9 | +1 | +7 |

In these labels, BELIEF's cost is failed re-tests (62 more). Its gains are slightly shorter routes and fewer chance
failures.

## 5. Q3 — Does belief updating change action selection even when the reopened edge is never used?

**Yes, in three ways, all through an archived exit:**

1. **Re-tests of archived exits that are still blocked.** This is 5 of the 7 first divergences in the traces, and the
   62 extra failed tries.

   In the full rows: in the 43 OFTEN labels where BELIEF opened archives but never returned, 19 still differ from
   MBVI3, at a small net cost (−1.47 [−2.40, −0.72] total steps a label). In RARE, this is where the cost comes from.
2. **Moves towards an archived exit.** The planner's values change upstream, so BELIEF heads towards the exit before it
   tests it. This is 2 of the 7 first divergences.
3. **Returns to exits the detector wrote off by mistake.** No scheduled reopening is involved.
   - In OFTEN this happened 35 times, and it alone carries 24% of the 916.
   - It pays only where MBVI3 had abandoned the exit. In some traced false alarms both agents kept using the edge (for
     example label 0, RARE, `2-3`: 42 crossings each after the alarm).
   - This is the same false-alarm repair that CF-06 found on generated worlds.

**Nothing else changes action selection.** No window before BELIEF's first archive differs, in any of the 810 rows.

## 6. Q5 — What rests on the full data, and what only on the traces

| Conclusion | Evidence |
|---|---|
| Every BELIEF–MBVI3 difference starts at an archive | **Full rows** (810): identical windows before the first archive; zero-archive labels tie |
| The 61% lies in labels where BELIEF returned to a written-off exit outside M11's crossing windows; without a return it is about 0 | **Full rows** (BELIEF's own log plus the step counts) |
| The gain starts at the first return, grows with events only where returns happen, and grows with their number | **Full rows** |
| Returns come late, a median of about 200 steps after the archive, when the belief has grown to about 0.45 | **Full rows** (lags) and the model's formula; the trace values (0.26 → 0.44) illustrate it |
| The split between reopened-edge returns (53% alone) and false-alarm repair (24% alone, 24% mixed) | **Full rows** |
| MBVI3 does not return to an edge after it met that edge blocked | **Traces only** (0 of 8). In the full rows it is inferred from the step gains, not observed |
| Routes are 93% identical; divergence is BELIEF going for an archived exit, never the failure itself | **Traces only** |
| The step make-up: failed re-tests cost, shorter routes and fewer chance failures gain | **Traces only.** The traced labels are not representative: BELIEF used fewer steps in only 2 of the 9 pairs |
| How many steps one return saves (detour minus restored route) | **Not available** in either |

## 7. What the data cannot show, and the minimum evidence that would

The accounting of the 61% is complete in the full rows. Two things are not observed there:

1. **What MBVI3 did on the same edges,** and when, if ever, it went back. The rows give MBVI3 no event log, only
   detector counts. The nearest proxy, v3's "exit got better" detections, is consistent with the traces but is not a
   return count: 7 OFTEN labels for MBVI3 against 17 for BELIEF.
2. **The step make-up of the gain in each label:** how much comes from the restored route's shorter length, and how
   much from fewer chance failures.

**Minimum additional evidence:** step-level traces for both agents in the 51 OFTEN labels that carry the 61%
(102 runs, about 4 minutes).
- M11's runs are deterministic, and its passive recorder is proven not to change behaviour. So an instrumented replay
  of exactly those runs would reproduce them, checkable row by row against the stored rows, and add only the traces.
- It produces no new outcome. It does re-execute spent labels, though, which the current instruction rules out. It
  needs your word.
- **The alternative** is to pre-declare these measures in a future study on fresh labels:
  - returns counted for both agents and over the whole run, not only inside the edge's own after-window;
  - the time since each archive.

## 8. A correction to the M11 record (made by dated amendment, 2026-11-18)

M11's [RESULTS.md](../m11_routes/RESULTS.md) §4 is too strong. It says most of the recovery difference "arises in
labels where no reopened edge was ever re-used", and that recovery should not be read as going back to the reopened
route sooner.

M11 counted re-use only inside the reopened edge's own after-window. In 36 of those 103 labels, BELIEF did go back to
a reopened edge later: 43 returns, not counted. In 24 it went back to a falsely written-off exit.

The accurate reading:
- BELIEF goes back to reopened routes more than MBVI3 does, mostly two to four windows after the reopening rather than
  inside its own after-window.
- It also repairs false alarms.
- D1's after-reversed windows largely measure the benefit of returns to edges that reopened earlier.

D1, D2 and D3 and the reading are unaffected.

**Done, on the owner's instruction:**
- M11's RESULTS.md keeps its original text and has a dated amendment at the end, in the CF-06 pattern. The amendment
  quotes the passages, says why they were too strong, separates the two evidence bases, and gives the corrected
  readings.
- `docs/engineering/PROJECT_STATE.md` is corrected to match.

## Files

| File | Role |
|---|---|
| `analysis/full_rows.mjs` → `full_rows.json`, `full_rows.out` | All 810 rows: reconstruction checks, BELIEF's archive log placed in the event windows, classes, time split, per-event sums, detector counts |
| `analysis/full_rows_controls.mjs` → `full_rows_controls.json`, `.out` | The same-event-index control, dose, within-label timing, per-label bootstrap spreads |
| `analysis/traces.mjs` → `traces.json`, `traces.out` | The 18 traces: episodes and routes, first divergences, re-use of every reopened edge by both agents, step make-up |

To reproduce, from the repository root:
```bash
node experiments/m12_mechanism/analysis/full_rows.mjs experiments/m12_mechanism/analysis/full_rows.json
```
```bash
node experiments/m12_mechanism/analysis/full_rows_controls.mjs
```
```bash
node experiments/m12_mechanism/analysis/traces.mjs
```
