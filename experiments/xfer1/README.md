# XFER-1 — experience-transfer causal-ablation harness

**Status: DEVELOPMENT / EXPLORATORY.** Not preregistered, not frozen, not confirmatory. No registered or held-out
seed is touched, no production file is read for behaviour or modified, and no result here supports a claim beyond the
worlds and runtime it measured (see "What this does not establish").

## The question

Does experience that the live runtime itself acquired in an earlier session of the hidden-reliability task, persisted
through the product's own `saveBrain` / `loadBrain` path, change what a **new** session in the **same world** achieves —
and which persisted component carries the effect?

This is the project's central question operationalised at outcome level: *which stored mechanism produces a measurable
capability that disappears when that mechanism is causally removed?* The harness answers it by delivering component-
masked copies of a real training brain to otherwise identical, paired test sessions.

## Substrate

The M7-conformed B2 tree that H1-R and MCF-1 measure (`experiments/h1r/build_tree.mjs`; transform recorded in the tree
manifest). Nothing is added to the runtime: a one-shot read hook delivers the brain through `loadBrain()`'s single
read, a wrapper on the measurement sink observes the stores once at the first agent call, and the stores are read
after the run. `session.mjs` is the only driver; `reference_run.mjs` is the plain pipeline it must equal when cold.

## Design

| element | value |
|---|---|
| worlds | accepted M7 configurations, `generateAcceptedStream(200000, 80)`; goals cycle 8, 12, 16, 19 |
| blocks | **A** worlds 0–39 (exploratory; where the arms were chosen) and **B** worlds 40–79 (replication of the contrasts declared before B was run) |
| sessions per world | one cold **training** session (1,500 calls) → persisted brain; then one **test** session (1,500 calls, a new process and a **new agent seed**) per arm |
| stationarity | both sessions stay inside Phase I (the reliability swap is at call 1,500), so the world a session starts in is the world it ends in |
| pairing | all arms of a world share the test seed: same boot, same cognitive stream, same environment stream |
| persisted components | the eight stores `saveBrain` writes: `transitions`, `rewards`, `penalties`, `signals`, `curiosity`, `Q`, `confidence`, `episodes`. Identity fields (home, goal) are never delivered |
| arms | `COLD`, `FULL`, `SHAM` (another world's brain, same goal, same block), `PROC`, `NOPROC`, `SHAM_PROC`, `SHAM_EPIS`, and for every component `ONLY_<c>` and `NO_<c>` |
| endpoints | E1 `goalReaches` (primary), E2 `attemptSuccess`, E3 `slipsPerCall`, E4 `earlyReaches` (first 500 calls) |
| statistics | paired per-world differences; mean, median, sign counts and a seeded percentile bootstrap interval over worlds. **Descriptive**: the worlds are a convenience sample, no p-value is computed |

What the product does **not** persist, and therefore what a restart loses: the per-path trust evidence
(`pathAttempts` / `pathSuccesses`), schema memory, the short-term path memory and the goal. Findings are about the
product's persistence as built, not about experience in the abstract.

Wall-clock fields: the runtime stamps each episode with `id` and `timestamp` from the clock. They are excluded from the
hash view (`brain.mjs`), and `verify_xfer1.mjs` shows they are the only fields that differ between two identical
training runs and that delivering brains differing only in them yields bit-identical behaviour.

## Block B: predictions declared before block B was run

Written after block A was analysed and before any block-B session existed. Endpoint E1 (`goalReaches`), per-world
paired differences; "CI" is the seeded percentile bootstrap interval over worlds (descriptive).

| id | contrast | declared prediction (block A value for reference) |
|---|---|---|
| D1 | `ONLY_episodes` − `COLD` | mean > 0 and CI excludes 0 (A: +86.2) |
| D2 | `ONLY_rewards` − `COLD` | mean < 0 (A: −27.2) |
| D3 | `NO_rewards` − `FULL` > 0 and `NO_episodes` − `FULL` < 0 | both means have the stated sign (A: +37.3, −36.8) |
| D4 | `SHAM_EPIS` − `COLD` | mean > 0 and at least 50% of D1's mean (A: +64.6, 75%) |
| D5 | `ONLY_signals` − `COLD`, `ONLY_confidence` − `COLD` | exactly 0 in every world (A: 40/40 zero) |
| D6 | `ONLY_episodes` − `FULL` | mean > 0 (A: +66.7) |
| D7 | `FULL` − `COLD` | **no sign predicted** (A: +19.5, CI includes 0, heterogeneous across goals) |
| D8 | `ONLY_episodes` − `SHAM_EPIS` | **no sign predicted** (A: +21.6) |

Contrasts D4, D6 and D8 and the three `post-A` entries in `config.mjs` were added after A was analysed; B is their
first test. A prediction that fails in B is reported as failed.

## Seeds and exposure ledger (this study)

* Agent seeds: `1,100,100,000 + 2 w` (train) and `+ 2 w + 1` (test), w = 0..79 — inside the exploratory development
  domain MCF-1 declares, above the cold census range, disjoint from the candidate confirmatory block. That domain was
  examined only in aggregate for RNG structure (first 800 cognitive draws and the first environment draw), never for
  outcomes.
* Configuration seeds: the accepted stream from 200,000 (below the held-out floor 900,500, outside every registered
  block); the driver refuses held-out or consumed territory.
* The MCF-1 study configuration (100000 / 1 / 100026) and MCF-1's development seeds are **not** reused, so this study
  adds no exposure to MCF-1's ledger.
* World 1 (block A) was examined individually (single-world smoke test) before the arms and diagnostics were fixed.
  Block A is therefore exploratory in the strict sense.

## How to run

```bash
node experiments/mcf1/prepare_tree.mjs                       # once: build or verify the conformed tree
node experiments/xfer1/orchestrate.mjs --block A --out experiments/xfer1/data/blockA --workers 6
node experiments/xfer1/analyze.mjs --in experiments/xfer1/data/blockA --out experiments/xfer1/results/summary_blockA.json
node experiments/xfer1/verify_xfer1.mjs                      # the gate (scratch files are removed)
```

Raw session records and brains stay in the git-ignored `data/`; the lodged result summaries are in `results/`.

## Files

| file | role |
|---|---|
| `config.mjs` | declarations: worlds, seeds, arms, endpoints, contrasts (pure) |
| `brain.mjs` | `saveBrain` mirror, component masking, hash view (pure) |
| `session.mjs` | one-process session driver with all guards |
| `orchestrate.mjs` | plan, process pool, one retry, manifest |
| `analyze.mjs`, `stats.mjs` | integrity-checked loading, paired contrasts, bootstrap |
| `checks.mjs` | pure integrity checks shared by the gate and the analysis |
| `reference_run.mjs` | the plain pipeline for the cold-equivalence check |
| `verify_xfer1.mjs` | the gate |
