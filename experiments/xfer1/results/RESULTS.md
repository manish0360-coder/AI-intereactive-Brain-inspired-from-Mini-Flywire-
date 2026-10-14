# XFER-1 results (DEVELOPMENT / EXPLORATORY)

Two disjoint blocks of 40 accepted M7 worlds each, 23 arms per world, 1,500-call sessions, on the M7-conformed B2 tree.
Block A (worlds 0–39) is where the arms were chosen; block B (worlds 40–79) tested the predictions declared in
`README.md` before any block-B session existed (commit `7d923dc`). Records and manifests:
`results/summary_blockA.json` (manifest digest `8ceeac0b…`), `results/summary_blockB.json` (`076a35fc…`). Both runs
passed the design-integrity gate in `analyze.mjs` (exact delivery of every component, provenance of every delivered
brain, pairing of all arms of each world). Block A was run twice (the episode hash view was added in between); every
arm mean and contrast was identical.

Statistics are descriptive. The worlds are a convenience sample of accepted configurations, so the bootstrap interval
only shows sensitivity to which worlds were included; it is not a significance test and no p-value is given.

## Declared predictions versus block B

| id | prediction | block B | held |
|---|---|---|---|
| D1 | episodes alone − cold: mean > 0, CI excludes 0 | +110.2 [83.4, 138.1], 34+/3−/3 zero | yes |
| D2 | rewards alone − cold: mean < 0 | −26.7 [−52.9, −1.4], 15+/25− | yes |
| D3 | leave out rewards − full: > 0; leave out episodes − full: < 0 | +33.4 [15.3, 52.4]; −23.4 [−44.8, −3.1] | yes |
| D4 | donor episodes − cold: > 0 and ≥ 50% of D1 | +86.7 [56.5, 116.5] = 79% of D1 | yes |
| D5 | signals alone, confidence alone: exactly 0 in every world | 0 in 40/40, both | yes |
| D6 | episodes alone − full brain: mean > 0 | +89.5 [68.8, 110.9], 38+/2− | yes |
| D7 | full − cold: no sign predicted | +20.7 [−4.6, 47.1], 26+/14− | (open) |
| D8 | episodes own world − donor world: no sign predicted | +23.5 [−1.3, 49.3], 20+/20− | (open) |

## Pooled over all 80 worlds (E1 = goal reaches per 1,500-call session)

| contrast (treatment − reference) | mean [95% bootstrap CI] | worlds +/−/0 |
|---|---|---|
| episodes alone − cold | **+98.2 [77.7, 118.8]** | 61 / 9 / 10 |
| donor-world episodes − cold | +75.6 [55.4, 95.8] | 55 / 14 / 11 |
| episodes own world − donor world | +22.5 [0.8, 44.5] | 44 / 36 / 0 |
| full brain (product default) − cold | +20.1 [−2.1, 42.6] | 52 / 28 / 0 |
| episodes alone − full brain | +78.1 [62.4, 93.6] | 72 / 8 / 0 |
| rewards alone − cold | −27.0 [−45.6, −8.6] | 30 / 48 / 2 |
| leave out rewards − full brain | +35.3 [23.1, 47.7] | 59 / 19 / 2 |
| leave out episodes − full brain | −30.1 [−46.0, −14.5] | 18 / 49 / 13 |
| transitions alone − cold | +47.8 [25.8, 69.0] | 55 / 23 / 2 |
| signals alone, confidence alone − cold | 0 in 80 / 80 worlds, every endpoint | — |

Arm means: cold 88.0, full brain 108.1, episodes alone 186.2 (×2.12), donor episodes 163.7, rewards alone 61.0,
full brain without rewards 143.4, full brain without episodes 78.0. The product default (everything persisted)
captures about 20% of the benefit that persisting episodes alone gives.

Sign is consistent across the four goals (8, 12, 16, 19; 20 worlds each): episodes alone − cold is +56, +116, +72,
+149 with 11+/4−, 17+/1−, 16+/3−, 17+/1−; rewards alone − cold is −41, −17, −36, −15; the full-brain effect is
the heterogeneous one (+8, +19, +21, +32).

## What the behaviour looks like

| arm | goal reaches in calls 0–499 / 500–999 / 1000–1499 (block B means) | 150-call cap resets per world | immediate reversals (share of moves) |
|---|---|---|---|
| cold | 21.6 / 29.6 / 34.0 | 3.65 | 0.060 |
| full brain | 34.2 / 36.5 / 35.2 | 1.95 | 0.179 |
| episodes alone | 63.8 / 67.5 / 63.8 | 0.40 | 0.097 |
| donor episodes | 55.8 / 58.4 / 57.5 | 0.60 | 0.103 |
| rewards alone | 12.4 / 21.3 / 25.1 | 4.28 | 0.105 |

Cold agents are still improving at call 1,500 (they build their own episodes); agents that start with episodes sit at
their plateau from the first window. The harmful arms (full brain, rewards alone, brain without episodes) show about
1.7–3× the cold rate of immediate A→B→A reversals (both blocks; per-session diagnostics in the raw records).

Per-attempt success barely moves with episodes (0.722 cold, 0.752 episodes alone, **0.721 donor episodes**) while goal
reaches double. The episodic benefit therefore does not come through avoiding unreliable edges.

## FACT / INFERENCE / HYPOTHESIS / UNKNOWN

**FACT** (measured here, on this substrate)
* Restoring only the episode store roughly doubles goal reaches in a new session of the same world, in every one of the
  four goals, and replicated in an independent block.
* Another world's episodes (same goal, same graph) deliver ≈77% of that benefit with **no** gain in per-attempt
  success.
* Restoring only the `rewards` store lowers goal reaches; removing it from the full brain raises them.
* `signals` and `confidence` have no effect on any endpoint in any world.
* Delivery is exact: every kept component hashes identically at the first agent call, every omitted one is empty.

**INFERENCE**
* The persisted knowledge that matters is largely which edges lie on routes to the goal (graph-topological, goal-
  specific, world-generic), not hidden reliability. Only a small, borderline increment (+22.5, CI just above 0) is
  world-specific.
* The product's default persistence is a net mixture of one strongly beneficial and one harmful component, which
  hides both.

**HYPOTHESIS** (not tested here)
* Mechanism for the episodic benefit: episodic adjacency gates the goal gradient (`main.js` scales it by
  `0.10 + 0.90·tc`, and the goal-entering edge by `100·tc`), so an agent without episodes has its goal pull
  attenuated until it has accumulated edge familiarity.
* Mechanism for the harm: persisted per-edge `rewards` produce habit loops (immediate reversals) that the goal
  gradient does not break.

**UNKNOWN**
* Whether the benefit survives longer sessions, a reliability shift (Phase II), or HEAD `main.js` (the substrate is the
  B2-conformed tree, which differs from HEAD by later commits).
* Whether the episodic benefit is goal-specific: donors here share the goal. A cross-goal donor arm is not run.
* Whether the benefit is knowledge or the removal of an artificial handicap (episodes that cover every graph edge,
  not taken from any session, are not tested).
