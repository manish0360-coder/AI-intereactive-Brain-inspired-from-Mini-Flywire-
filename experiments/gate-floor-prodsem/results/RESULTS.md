# GATE-FLOOR-PRODSEM results (DEVELOPMENT / EXPLORATORY)

**Classification: Production-like transition semantics under M7 bounds.**

Substrate: the runtime file set of the audited HEAD `0df804c497e649affb9e7ebacb10fdc81ab6de8d` (FutureScore V2.3 live, `main.js`
sha `c92c5c6b…`) plus two guarded call-level lines in a copy (derived `main.js` sha `8cf1dc29…`, the same pinned tree as
GATE-FLOOR-HEAD); production untouched. Condition: **hook state P** — arm OFF, envMode off, creditMode off, pin off (every M7
semantic hook undefined; episode cap, deterministic replay and goal transport retained). Task: one world, a 1,500-call Phase I
session after a 1,500-call cold training session in the same world. **Primary outcome: legal goal reaches.** Design frozen and
pushed before any confirmatory outcome existed: commit `cfc1e5c1be1c5f8fc3625701302661e280bbb82e` (remote head verified; local and
remote blob ids equal for every code file); decision digest `99d3ec2cdb46aa5249dc7937ade7dd25bc8c374ec1c2d186fa8a87f5ca04fea4`,
design digest `eead0713c7acd78a551ee7e9f8325c7e2e57a68eb52f333fbed9aa9809792ada`. Analysis: `analyze.mjs` exactly as frozen.

## Mandatory limits (stated first)

Deviations from true production behaviour: **(1)** the 150-tick episode cap; **(2)** the deterministic replay cooldown;
**(3)** legacy stale-keyed credit assignment through `agentLast→next` (the product's own credit site under P — a known temporal
misalignment relative to the intended credit semantics, not isolated here). Condition P installs **no environment draw**, so
traversal-attempt success is **identically 1.0** (1,447,921 / 1,447,921 recorded traversals succeeded) and **cannot establish
real-world routing capability**; it is reported as DEGENERATE, not as evidence of success. FutureScore V2.3 is a pure
graph-distance potential under P. This study does not establish production equivalence, production readiness, user-visible
quality, safety, general routing capability, or anything outside the frozen goals {8, 12, 16, 19}, the graph, the Phase I
1,500-call budget and the harness semantics.

## Execution

| block | worlds | accepted seeds | sessions | integrity | excluded |
|---|---|---|---|---|---|
| P (the only block) | 832–1111 (280; 70 per goal 8/12/16/19) | 242,650 – 256,714 | 280 training + 1,400 test | passed | 0 |

Manifest digest `eb7ac3654b246af62aac7c8c25ec50c22287f50c533b9027b9d34cf0248190e6`; 29 min 52 s wall time (10 workers); train
seeds `1,100,101,664 … 1,100,102,222`, test seeds `1,100,101,665 … 1,100,102,223`; no session failed after its retry; no
deviation from the frozen protocol; every training store had ≥ 1 episode.

**Condition integrity (every one of the 1,680 session records, recomputed from raw numbers):** 0 violations; environment draws 0,
draws logged 0, E2 credit keys 0, PE hook calls 0, harness attempts/slips 0; traversal record `a == s` on every edge, max learned
cost 1.00, edges with a slip 0; episode cap armed and replay cooldown deterministic in every session; per-attempt success null
in every test session. Evidence: `condition_integrity_blockP.json` (one row per session, with the file hash the manifest holds).

## Confirmatory outcomes (frozen rules; I2 valid)

Per 1,500-call test session, mean over 280 worlds; benefit = paired difference over COLD [95 % bootstrap interval]:

| arm | legal reaches | every reset | non-graph resets | benefit, legal (primary) | benefit, every reset (sensitivity) |
|---|---|---|---|---|---|
| COLD | 371.8 | 459.3 | 87.4 (19 %) | — | — |
| **COLD_FLOOR** (no stored episode) | **439.3** | 526.5 | 87.2 (17 %) | **+67.4 [58.9, 76.2]** (higher in 203, lower in 23, equal in 54 of 280) | +67.2 [58.5, 75.9] |
| ENTRY_NR | 439.3 | 526.1 | 86.8 (16 %) | +67.5 [59.0, 76.2] | +66.9 [58.2, 75.5] |
| REAL (descriptive) | 375.9 | 506.3 | 130.4 (26 %) | +4.1 [−6.7, 14.7] | +47.0 [35.8, 58.5] |
| REAL_FLOOR (descriptive) | 412.1 | 548.6 | 136.5 (25 %) | +40.3 [30.5, 50.3] | +89.4 [78.6, 100.2] |

Per-attempt success and slips per call: **DEGENERATE** (no environment draw exists); not averaged, not a clause of C4.

| claim | rule (declared) | observed | |
|---|---|---|---|
| I2 | lower bound of benefit(ENTRY_NR) ≥ 40 | 59.0 | valid |
| **C1** capability | lower bound of benefit(COLD_FLOOR) ≥ 40 | **58.9** | **holds** |
| **C3** vs ceiling | shortfall(ENTRY_NR − COLD_FLOOR) NON_INFERIOR / EXCEEDS at 20 | +0.1 [−1.4, 1.5] **NON_INFERIOR** | **holds** |
| **C4** no harm | no goal group's interval wholly < 0 | all four groups > 0 (lowest lower bound +26.8) | **holds** |
| **C5** audit | floor audit and condition integrity clean in every session | 560 / 560 floor sessions clean; 1,680 / 1,680 integrity | **holds** |
| C2 (descriptive, gates nothing) | shortfall(REAL − COLD_FLOOR) | −63.3 [−73.0, −53.6] (COLD_FLOOR exceeds REAL) | reported |

**Label (C1 ∧ C3 ∧ C4 ∧ C5 with I2 valid): TRANSFERS.** Predictions H1–H4 held. Declared sensitivities, none decisive and none
changing a class: Bonferroni-3 (C1 lower 56.6, C3 NON_INFERIOR); every goal reset (C1 lower 58.5, agrees); the block-H margins
(15, 30) (C1 holds, I2 OK, C3 NON_INFERIOR, agrees).

By goal group (legal-reach benefit of COLD_FLOOR over COLD, unadjusted 95 % interval; COLD legal in parentheses):

| goal | n | COLD | COLD_FLOOR benefit | ENTRY_NR benefit | REAL (descr.) | ENTRY − FLOOR |
|---|---|---|---|---|---|---|
| 8 | 70 | 395.1 | +111.5 [94.5, 128.8] | +108.2 [91.4, 125.7] | +17.0 [−5.0, 39.5] | −3.2 [−6.5, −0.5] |
| 12 | 70 | 421.3 | +65.5 [47.3, 84.0] | +67.5 [49.9, 85.7] | +12.3 [−10.5, 34.6] | +2.0 [−1.0, 5.6] |
| 16 | 70 | 322.3 | **+41.1 [26.8, 56.2]** | +42.3 [28.1, 57.2] | −3.9 [−24.5, 17.1] | +1.1 [−0.7, 3.3] |
| 19 | 70 | 348.5 | +51.7 [37.0, 67.0] | +52.1 [37.0, 68.1] | −8.9 [−29.2, 11.4] | +0.4 [−2.5, 3.5] |

Heterogeneity to read plainly: C4 is a *no-harm* rule, not a per-group benefit rule. Goal 16 is the weakest group; its lower bound
(26.8) is below MIN_BENEFIT (40), which is not a requirement of any declared claim, and the two weakest groups (16, 19) hold
most of the 54 worlds in which the floor changed nothing observable (21 and 25 of 70).

## What the data say about the other declared diagnostics

* **Non-graph resets** are not displaced by the floor (−0.2 [−7.0, 6.2]) and stay 13–21 % of resets across the goal groups (17 % overall) under the
  floor; the floor's gain is entirely in legal reaches (legal share of the every-reset gain 1.00). Goal 19 shows +8.4
  [−4.4, 20.9] non-graph resets under the floor, not distinguishable from zero.
* **Final-hop diagnostic:** degenerate (0 draws into the goal in every arm, 0 failures); reported as such.
* **Goal-edge shortcut penalty** (end state, summed over the goal's edges): COLD 3.89 → COLD_FLOOR 5.36 (+1.47 [1.13, 1.81]);
  ENTRY_NR 5.37. The benefit is intact under the larger penalty; whether the penalty dampens the floor is not identified.
* **REAL (descriptive):** the world's own training store brings no legal benefit (+4.1 [−6.7, 14.7]) and +42.9 [32.6, 53.1]
  non-graph resets. The floor on top of it adds +36.1 [28.9, 43.4] legal reaches over REAL, but REAL_FLOOR remains **−27.2
  [−34.9, −19.4] below COLD_FLOOR** in legal reaches: the real store's own (partly non-graph) experience diverts resets to
  non-graph goal entries (+49.4 [39.7, 59.1]).

## Post-hoc, exploratory (not part of the frozen analysis; `exploratory_blockP.json`)

* Realized paired SDs (legal): COLD_FLOOR−COLD 74.7, ENTRY_NR−COLD 73.8, REAL−COLD 92.4, ENTRY_NR−COLD_FLOOR 12.3; the largest
  would need n = 168 at DELTA 20 — the frozen n = 280 covered it.
* The floor arm is indistinguishable from COLD on every endpoint in 54 / 280 worlds (goal 8: 4, 12: 4, 16: 21, 19: 25); the floor
  raised a score in all of them (the raised candidate was not chosen or changed nothing observable).
* Unpaired comparison with block H (different worlds, different hook state): floor benefit P − H = +4.9 [−6.9, 17.0]; ENTRY_NR
  benefit +6.0 [−5.9, 18.2]; COLD legal +73.5 [61.3, 85.7]; COLD non-graph resets −25.3 [−34.4, −16.0]. Removing the environment
  and the harness credit/PE hooks raised the cold baseline and lowered its non-graph resets, and **left the floor's benefit
  statistically unchanged**.

## Reading

FACT: under production-like transition semantics (hook state P) the guarded goal-entry floor with no stored episode raised legal
goal reaches by +67.4 [58.9, 76.2], was non-inferior to the goal-entry-episodes ceiling (+0.1 [−1.4, 1.5]), harmed no goal
group, and passed every audit. INFERENCE: the effect is the same goal-entering-term mechanism as on the three earlier
runtimes (it equals the ENTRY_NR store to within 0.1 reaches). UNKNOWN: its size without the 150-tick cap or with wall-clock
replay; its interaction with the legacy credit as a mechanism; behaviour beyond 1,500 calls, with other goals or graphs.
Recommendation under the declared rule: **a separate production-design review** (not an implementation). Per-attempt success
is 1.0 by construction and is not evidence of routing capability.

## Raw output

`experiments/gate-floor-prodsem/data/blockP/` (git-ignored; 91 MB): `sessions/` (1,680 records), `brains/`, `plan.json`
(sha256 `b82ffaaaa2ee896c46cb7da1cbb4f416b8e4edc917f3eba0b7bce316e729e06d`), `controls.json`
(`bddcae3396ff1fab1f81470eb13de4e6b355e036bd576af60e9ec004675fd3ef`), `MANIFEST.json`. Committed here:

| file | sha256 |
|---|---|
| `summary_blockP.json` (frozen analysis, per-world records) | `b996ac3aa21b02b5aceaeea81383ee93fa7fb3ebc4c9aff03e2c89d447ba8da5` |
| `manifest_blockP.json` (= `MANIFEST.json`; binds every session file hash) | `27fe59bf9f3d21decfe03081f73c972308cd330610748080af8539ad69fb2aa8` |
| `condition_integrity_blockP.json` (per-session integrity evidence) | `20deec3a6923092a86a1e5f4e6743db7ead5523755491361f01d6d50b47bbec6` |
| `exploratory_blockP.json` (post-hoc) | `6d0da5cdec7f7e68c3bfa9cd225a6b9dbf303c3d3c19201f45b588033874ffe6` |
| `calibration_summary.json` (floor-OFF, XFER-1 worlds 0–39, non-confirmatory) | committed at the freeze |

Reproduce: `node experiments/gate-floor-prodsem/orchestrate.mjs --out experiments/gate-floor-prodsem/data/blockP --workers 6`;
`node experiments/gate-floor-prodsem/analyze.mjs --in experiments/gate-floor-prodsem/data/blockP --out summary_blockP.json`;
`node experiments/gate-floor-prodsem/export_integrity_blockP.mjs --in … --out condition_integrity_blockP.json`;
`node experiments/gate-floor-prodsem/exploratory_blockP.mjs --in summary_blockP.json --blockH ../gate-floor-head/results/summary_blockH.json`.
