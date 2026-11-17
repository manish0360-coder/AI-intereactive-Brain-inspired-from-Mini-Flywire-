# M11 — the adopted belief under controlled route changes on the MiniFlyWire graph

**Status.** Draft, 2026-11-17, for the owner's approval. Not frozen. The driver refuses to run the demonstration
until this line begins "Frozen" and `SPEC.sha256` matches this file.

**Name.** "M11" is the owner's name for this milestone. Its folder is `experiments/m11_routes/` because
`experiments/m11/` holds the earlier, unrelated M11 record (the `canReachGoal` repair verification, `0f47d7b`), which
other verifiers require to stay unmodified.

## Purpose

To show, on the app's own graph, what the adopted agent (AD-13) does when routes are blocked and reopened, compared
with MBVI3:
- how it handles a blocked route;
- how fast it recovers when the route reopens;
- what it costs when a block is permanent;
- how its belief about a blocked exit changes over time.

It is a demonstration under controlled changes. It is not a confirmatory study, and it decides nothing about AD-13 or
the agent. The browser application and the legacy brain are not used, read or changed.

## What runs

Every component is existing code, used unchanged.

| Part | What it is |
|---|---|
| **World** | The app's graph, `connections.json`: 20 nodes, 39 edges. It is built by `mfwWorld` (`cognitive/testbed/worlds.mjs`) behind the testbed's hidden relabelling, with graph label `mfw|m11|graph` |
| **Environment** | `GraphEnv` (`cognitive/testbed/env.mjs`). Its runner-only `block` / `unblock` make a move along an edge fail and leave the agent where it is. Reward is 1 on arrival at the goal. The random streams are seeded by label, so both agents meet the same conditions |
| **Change schedule** | Task E5 (`cognitive/testbed/task_e5.mjs`), as frozen for CF-06. Six times a run it blocks an edge on the current shortest route, keeping the goal reachable. Each block reopens after 10 episodes with probability 0.1 (RARE), 0.5 (HALF) or 0.9 (OFTEN). The schedule depends only on the label, so both agents face the same one |
| **Agents** | **BELIEF** = `makeAdoptedAgent` (AD-13): model v6, ρ fixed at 1/2, h = 0.01, every other parameter at its default. **MBVI3** = the registry's MBVI3, the baseline |
| **Recorder** | `experiments/m11_routes/trace.mjs`, passive (below) |

**E5 parameters:**
- 600 exploration steps in 50-step episodes, then 30 training episodes;
- six events, each with 10 blocked and 10 after episodes;
- a 200-step episode cap, and a start at least 3 hops from the goal.

Each edge also works only with a probability drawn between 0.5 and 1 for each label, so some moves fail by chance as
well. In the app, every move succeeds.

## Fixed in advance

- **Labels:** `mfw|m11|0` … `mfw|m11|134` (135, as in CF-06), in each of the three families, for both agents: 810 E5
  runs.
- **Pairing:** by label within a family.
- **Exclusions:** a (label, family) whose schedule cannot be laid out is excluded for both agents. This is decided
  from the graph alone, before any agent acts. Skipped events are reported. A check that ran no agent laid out 300
  schedules on other labels and needed no exclusion.
- **Traces:** labels 0, 1 and 2, every family, both agents (18 runs). The choice is fixed here, not after seeing
  outcomes.
- **Statistics:** mean and 95% paired percentile bootstrap, 10,000 resamples, seeded by label (`pairedBootstrap`);
  also the median and the number of labels favouring each side.

## Measures (per run, from the E5 row)

| Measure | Definition | Contrast reported |
|---|---|---|
| `total` | Steps over the change phase | MBVI3 − BELIEF |
| `cost` | The same | BELIEF − MBVI3 |
| `blocked` | Steps in the episodes while a route is blocked | MBVI3 − BELIEF |
| `afterReversed` | Steps in the 10 episodes after a block reopens | MBVI3 − BELIEF |
| `afterPermanent` | Steps in the 10 episodes after a block that stays | MBVI3 − BELIEF |
| `crossings` | Crossings of a reopened edge in its after-window | BELIEF − MBVI3 |
| `futileRetests` | Tries of a permanently blocked edge after its block window has ended | BELIEF − MBVI3 |

**Also reported:**
- each arm's mean per family for every measure, with capped episodes and skipped events;
- for BELIEF, archives opened per run (genuine reversing, genuine permanent, false alarm) and reversals confirmed
  (genuine, false).

## Reading rule

Fixed now, and reported whatever the outcome. Inequalities are strict. An empty contrast never passes.

| Check | Statistic | Passes when |
|---|---|---|
| **D1 recovery** | OFTEN, `afterReversed`, MBVI3 − BELIEF | mean > 0 and lower bound > 0 |
| **D2 cost** | RARE, `cost`, BELIEF − MBVI3 | upper bound < 25 (CF-06's B2 margin) |
| **D3 mechanism** | OFTEN, `crossings`, BELIEF − MBVI3 | mean > 0 and lower bound > 0 |

**DEMONSTRATED ON THE MINIFLYWIRE GRAPH** if all three pass. Otherwise **NOT DEMONSTRATED**, naming the failed
checks.

The directions come from CF-06 on generated worlds:
- B4a, recovery after a reopening, +43.5 a run in OFTEN;
- B2, cost in RARE, +17.4;
- OFTEN crossings of reopened edges, +4.9 a run.

They are expected, not assured, on this graph.

## The recorder

`traced(agent, context)` passes `act`, `observe` and `inspect` straight through. At every step, before the agent
updates, it records:
- what the agent tried and whether it moved;
- whether that edge is truly blocked, from the task's ground-truth predicate (evaluation only; never given to the
  agent);
- the agent's predicted probability that the exit works, read from its own model.

From the first attempt on an exit while it is blocked, the recorder follows that exit's prediction and ground truth.
For BELIEF, the trace also carries its own "archive opened" and "reversal confirmed" events.

Reading the model's `predict` is a pure read. Run A is traced and run B is not, and their rows must be identical.

## Integrity

- **Run once,** with `node experiments/m11_routes/run_demo.mjs --domain m11`. The driver refuses if any of these hold:
  - this file is not marked Frozen, or does not match `SPEC.sha256`;
  - the files under `cognitive/` and `experiments/m11_routes` are not committed and clean;
  - a result file already exists.
- **Determinism and passivity.** Run A (traced) and run B (untraced) must give identical rows. Both row hashes are
  recorded.
- **Recorded with the result:**
  - HEAD at launch and at the end;
  - the specification's SHA-256;
  - Node version and platform;
  - SHA-256 of `main.js`, `index.html`, `connections.json` and `neurons.json` (`main.js` is expected to be the
    audited `c92c5c6b…`, untouched).
- **Nothing is tuned after the run.** The result is written up in `experiments/m11_routes/RESULTS.md` whatever it is.
- **Looks before the freeze (disclosed):**
  - the schedule check above (labels `mfw|feasibility|*`, no agent);
  - the regression tests, which run both agents on `mfw|m11test|0`, OFTEN, and compare each arm with itself, never
    with the other;
  - one driver smoke run on `mfw|m11dev|0`, checked for output structure only, with its reading not displayed.

## What it can and cannot show

**Can show:**
- On the app's own graph, under controlled blocking and reopening, whether the adopted belief recovers reopened routes
  faster than MBVI3, and what it costs where blocks stay.
- In the traces, how its predicted chance that a blocked exit works changes: at the block, after each failed re-test,
  with time, and at the re-test that finds it open. MBVI3's predictions sit beside it.

**Cannot show:**
- Anything about the app's legacy brain.
- Anything confirmatory: one run, by the designer, on local commits.
- Other graphs. The 135 labels vary start, goal, schedule and edge reliability, not topology.
- Behaviour under the app's own dynamics, where every move succeeds.

## Consequence

None for AD-13 or the agent. The result is recorded. Any next step, such as a viewer for the traces or integration
into the app, is a separate decision.

## Run

- **Time:** about 65 minutes (1,620 E5 runs at about 2.4 s each, in the smoke run). The machine must stay awake, so
  the run uses the same per-process wake request as the CF-06 gate.
- **Output:** `experiments/m11_routes/results/m11_result.json` (rows, analysis, reading, the 18 traces) and the run logs in
  `experiments/m11_routes/results/run/`.

**To freeze:**
1. Set the status line to "**Status.** Frozen", with the date and the owner's word.
2. Write `SPEC.sha256`.
3. Commit both.
4. Run once.

## Files

| File | Role |
|---|---|
| `experiments/m11_routes/SPEC.md` | This specification |
| `experiments/m11_routes/m11_lib.mjs` | Configuration, the two arms, one run, analysis, reading rule |
| `experiments/m11_routes/trace.mjs` | The passive recorder |
| `experiments/m11_routes/run_demo.mjs` | The driver and its refusal checks |
| `cognitive/tests/test_m11_env.mjs` | Regression tests (in `npm test`) |
