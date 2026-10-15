# GATE-FLOOR-INTERACTION results (DEVELOPMENT / EXPLORATORY)

**Classification: Production-like transition semantics under M7 bounds.** The intervention is the **combined admission-mask +
execution-guard bundle**; no effect below is attributed to either component.

Design frozen and pushed before any confirmatory outcome existed: commit `80f83ad3dcc3bd008c841ee712318280b5a5db66` (remote head
verified; local and remote blob ids equal for every code file); decision digest
`1b92dcc0d8f5d2e5b2b9db67f32f80b6e46f458b96171b14c2780b8b81ac1ad2`, design digest
`d81dca1ca67b2fba696f23d0ee9bbd0e05e495d7e7b6adc991227b7752c1b244`. Analysis: `analyze.mjs` exactly as frozen. Substrate: the
GATE-FLOOR-PRODSEM derived HEAD tree (audited commit `0df804c497e649affb9e7ebacb10fdc81ab6de8d`) plus the two guard lines
(guard-tree `main.js` sha256 `a0eb7b377dcdf4b9304f0c04c2dd7c3b84328d605b5bd22bc00b534b671dec67`); production untouched. Hook
state P. Outcome: **legal goal reaches** per 1,500-call test session; non-graph and total resets are reported separately.

## Mandatory limits

State P; the 150-tick episode cap, the deterministic replay cooldown and legacy stale-keyed credit assignment through
`agentLast→next` remain; per-attempt success is identically 1.0 and is not evidence of routing capability; the delivered REAL
store was trained **unguarded**, so nothing here concerns a store accumulated under the guard; Phase I, 1,500 calls, goals
{8, 12, 16, 19}. Not production equivalence, production readiness, user-visible quality, safety, routing capability or
cognition. A supported claim can justify a production-design **specification** only.

## Execution

| block | worlds | sessions | integrity | excluded |
|---|---|---|---|---|
| I (the only block) | 1112–1391 (280; 70 per goal 8/12/16/19) | 280 training + 2,240 test = **2,520** | passed | **0** |

Manifest digest `f56ef2cb8625251071c638f92bbda7ae8ca4938cc5994644184af87b5fa5b3ec`; 56 min 36 s (10 workers); no session
failed after its retry. **Per-session evidence (all 2,520 records, recomputed from raw numbers):** 0 violations; recorded
traversals 2,299,267 / 2,299,267 succeeded; environment draws 0; E2 credit keys 0; PE hook calls 0; per-attempt success null in
every test session; the 1,120 guard-ON sessions have **0 non-graph resets and 0 executed non-graph moves**; guard-OFF sessions
show masked 0 and blocked 0. Instruments **I1–I7: all OK**.

## Cell means (legal goal reaches / non-graph resets / total resets, per session, 280 worlds)

| cell (store, floor, guard) | legal | non-graph | total | masked | blocked |
|---|---|---|---|---|---|
| COLD F0 G0 | 365.9 | 89.8 | 455.8 | 0 | 0 |
| COLD F0 G1 | 396.9 | 0 | 396.9 | 2,055 | 26.7 |
| COLD F1 G0 | 436.1 | 90.1 | 526.2 | 0 | 0 |
| COLD F1 G1 | 457.1 | 0 | 457.1 | 1,781 | 30.9 |
| REAL F0 G0 | 376.1 | 121.7 | 497.9 | 0 | 0 |
| REAL F0 G1 | 411.5 | 0 | 411.5 | 1,753 | 28.0 |
| REAL F1 G0 | 416.7 | 121.6 | 538.3 | 0 | 0 |
| REAL F1 G1 | 444.8 | 0 | 444.8 | 1,619 | 30.2 |

## Primary family (frozen; decisive at Bonferroni-3 = 98.33 %, δ = 20 legal reaches)

| claim | estimand | estimate [98.33 % CI] | label |
|---|---|---|---|
| **PC1** — does the guard bundle remove the real-store deficit under the floor? | Δ_SG(F=1) = D₁ − D₀ | **+7.1 [−2.0, 16.1]** (D₁ −12.3 [−20.7, −4.2]; D₀ −19.4 [−28.9, −9.8]) | **NO_RECOVERY** |
| **PC2** — does the bundle improve legal reaches or only the accounting? | τ_G(REAL, F=1) | **+28.1 [21.9, 34.6]** legal; non-graph −121.6 [−130.8, −112.8]; total −93.5 [−101.1, −86.1] | **IMPROVES** |
| **PC3** — does the floor benefit persist with the real store? | τ_F(REAL, G=0) and τ_F(REAL, G=1) | **+40.6 [31.9, 49.8]** and **+33.3 [26.2, 40.9]** | **PERSISTS** |

Declared non-decisive sensitivity (unadjusted 95 %): PC1 NO_RECOVERY (interaction +7.1 [−0.3, 14.5]), PC2 IMPROVES (+28.1
[23.0, 33.4]), PC3 PERSISTS (+40.6 [33.5, 48.1] / +33.3 [27.5, 39.3]) — **agrees**. Instruments: D₀ (95 %) −19.4 [−27.3, −11.6]
(I5 OK); floor | COLD, G0 (95 %) +70.2 [61.8, 78.6] (I6 OK; reproduces GATE-FLOOR-PRODSEM's +67.4). Specification criterion
(DESIGN.md §5): **met** — PC3 = PERSISTS, PC2 ≠ HARMS, no harm flag, instruments hold; package **floor + guard bundle** (PC2 =
IMPROVES).

### How to read PC1 (a structural limit that the data exposed)

The frozen rule labels PC1 `NO_RECOVERY` when the upper bound of the interaction is below δ = 20. **The whole deficit that was to
be recovered was itself 19.4 [−28.9, −9.8] — below δ — so `RECOVERY_FULL`/`RECOVERY_PARTIAL` were unreachable in this block by
construction** (δ = 20 is the programme's practical margin; the design expected a deficit of 27 from block P and 43 from the
development calibration, both larger than δ). The label is
therefore a correct application of the frozen rule, but it carries less than "falsified": the data say the bundle recovered about
**7 of the 19 reaches (37 %), not distinguishable from 0 at 95 % (−0.3 … +14.5)**, that **at most ~16 reaches** are recovered
(Bonferroni upper bound), and that the real store remains **worse than cold under floor + guard** (D₁ −12.3 [−20.7, −4.2]).

## Goal-specific checks (unadjusted 95 %; 70 worlds per group)

| goal | guard \| REAL, F1 | floor \| REAL, G0 | floor \| REAL, G1 | interaction \| F1 | D₀ → D₁ |
|---|---|---|---|---|---|
| 8 | +23.6 [13.8, 33.6] | +68.5 [51.7, 85.9] | +58.7 [44.3, 73.8] | +10.6 [−2.9, 24.7] | −19.0 → −8.4 |
| 12 | +16.3 [7.5, 24.8] | +42.5 [28.3, 58.5] | +37.2 [26.0, 49.3] | +2.1 [−12.8, 16.9] | −19.3 → −17.2 |
| 16 | +35.2 [25.1, 45.6] | +15.8 [7.5, 25.5] | +14.2 [7.3, 22.0] | +12.1 [−4.1, 28.8] | −22.9 → −10.8 |
| 19 | +37.3 [25.3, 49.1] | +35.4 [22.4, 49.6] | +23.1 [13.9, 33.4] | +3.7 [−10.3, 17.3] | −16.6 → −12.9 |

**Harm flags: none** (no group's interval is wholly below 0 for any of the three primary effects). Goal 12's guard effect and
goal 16's floor effects are positive but below δ; nothing is claimed per group.

## Candidate-selection diagnostics (descriptive; two declared flags)

Blocked executions 29.0 per guard-ON session (1.9 % of calls; flag > 5 %: **not raised**); graph-admitted candidate count changed
by 1.9 % (flag > 5 %: **not raised**); 1,604 non-graph candidates reach admission per guard-OFF session, 1,802 masked per
guard-ON session; executed moves per guard-ON session: 1,385 legal, 0 non-graph, 0 none; distinct goal edges used ≈ 4.0 in
every cell; end-state goal-edge shortcut penalty 3.4–5.5 (floor raises it, the guard lowers it).

## Secondary contrasts (descriptive; unadjusted 95 %; nothing gates on them)

| contrast (legal) | estimate [95 % CI] | SD | non-graph | total |
|---|---|---|---|---|
| floor \| COLD, G0 / G1 | +70.2 [61.8, 78.6] / +60.3 [52.7, 67.9] | 73.6 / 64.9 | +0.3 / 0 | +70.5 / +60.3 |
| floor \| REAL, G0 / G1 | +40.6 [33.5, 48.1] / +33.3 [27.5, 39.3] | 62.9 / 50.9 | −0.1 / 0 | +40.4 / +33.3 |
| guard \| COLD, F0 / F1 | +30.9 [22.8, 39.0] / +21.0 [15.1, 26.9] | 69.1 / 50.5 | −89.8 / −90.1 | −58.9 / −69.1 |
| guard \| REAL, F0 / F1 | +35.4 [29.5, 41.4] / +28.1 [23.0, 33.4] | 50.8 / 44.5 | −121.7 / −121.6 | −86.4 / −93.5 |
| store (REAL−COLD) \| F0,G0 / F0,G1 | +10.2 [−1.4, 21.2] / +14.6 [4.9, 24.2] | 98.2 / 82.6 | +31.9 / 0 | +42.1 / +14.6 |
| store (REAL−COLD) \| F1,G0 / F1,G1 | **−19.4 [−27.3, −11.6]** / **−12.3 [−19.0, −5.6]** | 66.5 / 57.7 | +31.5 / 0 | +12.1 / −12.3 |
| store × guard \| F0 / F1 | +4.4 [−4.9, 13.9] / +7.1 [−0.3, 14.5] | 80.1 / 63.1 | −31.9 / −31.5 | −27.4 / −24.4 |
| floor × guard \| COLD / REAL | −9.9 [−18.8, −0.8] / −7.2 [−12.4, −2.2] | 77.5 / 43.9 | −0.3 / +0.1 | −10.2 / −7.1 |
| **store × floor \| G0 / G1** | **−29.6 [−40.1, −19.1] / −27.0 [−36.2, −17.7]** | 90.1 / 78.4 | −0.4 / 0 | −30.0 / −27.0 |
| 3-way store × floor × guard | +2.7 [−7.4, 12.7] | 85.4 | +0.4 | +3.1 |

## FACT, INFERENCE, UNKNOWN

**FACT.** Block I is valid: 280 worlds, 2,520 sessions, 0 exclusions, 0 integrity violations, all seven instruments OK. The
guard bundle removed every non-graph reset and every executed non-graph move in its 1,120 sessions. Under floor-ON, the guard
bundle raised legal reaches for the real-store agent by +28.1 [21.9, 34.6] and the cold-store agent by +21.0 [15.1, 26.9]
(unadjusted 95 %), while total resets fell by 93.5 and 69.1. The floor raised legal reaches in real-store cells by +40.6 / +33.3
(guard off / on), less than in cold cells (+70.2 / +60.3). The real-store deficit under the floor was −19.4 [−27.3, −11.6] and −12.3
[−19.0, −5.6] with the guard bundle; the store × guard interaction at floor ON was +7.1 [−0.3, 14.5]. No goal group was harmed.

**INFERENCE.** (1) The bundle's legal-reach gain is largely store-independent (+21 cold, +28 real; interaction +7, not
distinguishable from 0): it is a general effect of closing the illegal-move channels, not a repair specific to the real store.
(2) The real-store "deficit" under the floor is mostly a **sub-additivity of floor and store** (store × floor −29.6 [−40.1,
−19.1]; the real store alone is not worse than cold, +10.2 at floor off): a real store and the floor both act on the goal-entry
side and overlap — consistent with the XFER-2 mechanism, **not tested here**. (3) The non-graph channel as a *whole* does not
account for most of the deficit (recovery ≈ 7 of 19, upper bound ≈ 16), in line with the flat per-world dose-response observed
in block P (ρ ≈ −0.01); the observational and interventional evidence now point the same way.

**UNKNOWN.** Whether the mask or the execution guard carries the legal-reach gain (the first guard action in the development
sessions was a blocked execution at call 57 — stale pre-reset reasoning is a candidate source, unverified); whether a store
trained *under* the guard behaves differently; whether a partial (≤ 16 reaches) recovery is real; the sign of the effects without
the 150-tick cap, with wall-clock replay, beyond 1,500 calls or on other goals/graphs; any production behaviour.

## Reproduction, records and archive

The frozen `analyze.mjs` does not write its per-world table into `summary_blockI.json`; the per-world records are preserved in
`sessions_blockI.json` (one row per session, bound to the manifest hashes) and in the raw archive, and the results gate recomputes
PC1–PC3, the labels and the harm flags from them. Committed here: `summary_blockI.json` (sha256
`5c1920e2f284c1663e4a1a8c080164b4f10184c76cd37b6e69c4d17bd61dfb5d`, the frozen analysis output with the PC1–PC3 JSON),
`manifest_blockI.json` (`fbb3bfb43b1636dfd0dccdc7fa83a28cc5046c431e02f2be8ce101abd0ef3562`, binds every session hash),
`sessions_blockI.json` (`8ae6717cdb4efcf58fcf810ccb30b0fe87748abd2dc01976f6065d3ce3c4b0e3`), `archive_blockI.json` (archive
record). Raw output (`data/blockI`, git-ignored, 100 MB): archived deterministically as
`E:/Projects/OpenSourceLab/archives/gate-floor-interaction/blockI_raw_80f83ad.tar.gz`, 15,111,758 bytes, sha256
`55efff3683a9059aa2581eafb894f5d1a7b74cd71d5a6869e7f497ac2729bdc9`; `plan.json` `4d26ad60…`, `controls.json` `d1d8a43e…`.
**Backup risk: one local copy** of this archive and of the block-P archive; no off-machine copy exists.

```bash
node experiments/gate-floor-interaction/orchestrate.mjs --out experiments/gate-floor-interaction/data/blockI --workers 10
node experiments/gate-floor-interaction/analyze.mjs --in experiments/gate-floor-interaction/data/blockI --out summary_blockI.json
node experiments/gate-floor-interaction/export_sessions_blockI.mjs --in experiments/gate-floor-interaction/data/blockI --out sessions_blockI.json
node experiments/gate-floor-interaction/verify_archive_blockI.mjs --archive <blockI_raw_80f83ad.tar.gz>
node experiments/gate-floor-interaction/verify_gatefloorinteraction.mjs
```
