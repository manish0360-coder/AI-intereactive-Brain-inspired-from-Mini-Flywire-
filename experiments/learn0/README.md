# LEARN-0 — experience without the map

**Status: EXECUTED under the frozen design (2026-10-24).** E1 = −24.4 [−36.3, −12.3], **INCONCLUSIVE** (δ = 20).
- Block L ran 360 worlds and 2,160 sessions with 0 exclusions. Results are in [results/RESULTS.md](results/RESULTS.md).
- The freeze was `cc8a42d`, pushed and remotely verified before any outcome. Gemini's revision-2 verdict was PASS WITH CLAIM LIMITS, and its one required correction was applied before the freeze.
- The freeze record is [FREEZE.md](FREEZE.md). `verify_freeze_learn0.mjs` certifies the **pre-run** state.
  - After execution, its frozen-pin, digest, configuration and line-ending checks still pass.
  - Its pre-run-only checks fail by design: F2 on the exact file set and the committed directory, and F7 on "no results" and the "not executed" statement.
  - The exact pass/fail breakdown is in [results/RESULTS.md](results/RESULTS.md) §1.
- The post-run check is `verify_results_learn0.mjs`. It re-checks every frozen pin and recomputes every result from the per-session rows in `results/`.
- The raw data is archived and verified: [results/archive_blockL.json](results/archive_blockL.json) and `research/evidence_backup/backup_manifest.json`.
- Production and the typed registry are unchanged.

**Question.** With all four map oracles disabled (`goalDistance`, `canReachGoal`, `graphDiameter`, `futureScore`), does the world's own experience store raise legal goal reaches?

**Primary (sole).** E1 = N1 − N0, paired by world:
- N1: no map, starting from the full store that T built without the map.
- N0: no map, cold start.
- E1 is the **total effect of the whole store**, not the effect of any single component or mechanism.
- The component cells and every other secondary are exploratory, carry no label, and support no claim (28 unadjusted intervals).
- Block: 360 fresh worlds (stream indices 1672–2031), 2,160 sessions.
- Margin δ = 20. Percentile bootstrap, 95 %.

The full design is in [DESIGN.md](DESIGN.md). Section 15 lists the revision-2 changes. The machine-readable preregistration is [preregistration.json](preregistration.json).

## Runtime pin

The runtime is byte-identical at `952c9fcf…` (last runtime change), `0df804c4…` (audit anchor) and `8e699afa…` (HEAD):

| object | value |
|---|---|
| `main.js` blob | `09c36b5c…` |
| `render/` tree | `dd0d2890…` |
| `main.js` sha256 | `c92c5c6b…` |

The experiment tree adds the four guarded oracle lines:
- LEARN-0 `main.js` `3d3266fd…`
- `render/planning.js` `34e06c65…`

## Commands

```bash
node experiments/learn0/verify_learn0.mjs
```

```bash
node experiments/learn0/export_prereg.mjs --check
```

```bash
node experiments/learn0/tools/sizing_learn0.mjs
```

```bash
node experiments/learn0/verify_results_learn0.mjs
```

```bash
node experiments/learn0/verify_archive_blockL.mjs --archive E:/Projects/OpenSourceLab/archives/learn0/blockL_raw_cc8a42d.tar.gz
```

- The first command is the design gate. It uses development worlds only.
- The second checks that the preregistration is current.
- The third re-derives the sizing evidence, including the Monte Carlo check. It takes about 4 minutes and uses no study world.
- The fourth is the post-run results check. It needs no raw data.
- The fifth deep-checks the raw archive.

`orchestrate.mjs --out <dir>` (block L) was executed once, under the owner's authorisation, on 2026-10-24. Block L is used up; **do not run it again.**

## Gate result (development worlds only)

Last run (2026-10-24, revision 2 + the Gemini claim-limit correction): **62 checks passed, 0 failed; 21 of 21 mutants caught.** The log is `evidence/gate_verify_learn0.log`.

Bindings:

| digest | value |
|---|---|
| decision | `9beeef9761d252f34ce67f2a584138ded882c3218d0c40d398dab5328b19c8f0` |
| design | `f2614ca360a4676493c5a36245a4c191a0c2744f5a808fd2abfd6d13bd05e74e` |
| preregistration | `70dcc4bef9f29cfbca7778b4f53d4220f507eb81eb8463126e59d4c48a51c7d3` |

Revision 2 as reviewed by Gemini had decision `2009d7a2…`, design `6ce4fb4a…` and preregistration `b6a8008e…`. The only change since is `RULES.learnsLimit`.
