# The audited HEAD runtime — what this study's substrate is, and how it differs from B2 and the conformed tree

Labels: **FACT** = read from committed sources / `git diff` or measured by a script in this repository; **INFERENCE** = follows
from facts but was not directly tested; **UNKNOWN** = not established. Line numbers are in HEAD `main.js`
(blob `09c36b5caf24ed1bf447a13fe924d8297a11a301`, sha256 `c92c5c6b6d2e32aed9114e2a8dc4075134630bfe6e5547b8052b9e8b839a3de3`,
5,699 lines) of the audited commit `0df804c497e649affb9e7ebacb10fdc81ab6de8d`.

## Identity and build

| item | value | status |
|---|---|---|
| audited commit | `0df804c497e649affb9e7ebacb10fdc81ab6de8d`; tracked worktree clean; no runtime file changed since (gate S1) | FACT |
| build configuration | none: ES modules loaded directly (`index.html` → `<script type="module" src="./main.js">`); no package.json, no bundler | FACT |
| runtime file set | B2's 146 blob paths (without `Portfolio_Assets/`) plus `render/traversalRecord.js` = 147 | FACT |
| versus pristine B2 (`707cb1e`) | exactly `main.js` and `render/planning.js` differ; `render/traversalRecord.js` is new; every other runtime blob is identical (scoring, Q-learning, trust, episodes, memory, search, RNG, M7 env/run/arms, connections, neurons) | FACT |
| versus the H1-R conformed tree | none of the conformance edits (N1 mask/guard, R1/R2 draw reordering, goal draw, P4, flat goal reward) exist at HEAD; HEAD has the `canReachGoal` fix **unconditionally** | FACT |
| hooks | `__M7_ARMS__`, `__M7_CREDIT__`, `__M7_ENV__`, `__M7_EPISODE_CAP__`, `__M7_GOAL__`, `__M7_PE__`, `__M7_TEL__`, `__MFW_STEP_LEDGER__` — identical to B2's | FACT |

## The complete B2 → HEAD difference in `main.js` (five hunks) and `render/planning.js`

1. import of `render/traversalRecord.js` (write-only side record, module-private, **not persisted**).
2. `canReachGoal` backtracks (the "CRG" fix, 9 false negatives → 0).
3. **FutureScore V2.3**: `futureScore(neuron, goal)`; `futureBonus = 20·S/(S − FS)` with `S` = physical-graph diameter,
   replacing `Math.min(FS·4, 20)`. `render/planning.js`: `FS(k|g)` = best over simple paths of ≤ 3 steps of `Σ −ĉ(e) + T(end)`,
   `ĉ = (a+1)/(s+1)` from the traversal record, `T = −d(v, g)` over the physical graph; `FS(goal) = 0`.
4. traversal-record write at the E1/E2 point, `iff next !== null && !_goalResetJustHappened` (never for a goal entry).
5. a UI key handler clears the record.

## The finding that makes HEAD a different experiment

In B2 and in the conformed tree `futureScore` began at `neuron.id` (the THREE `Object3D` counter), not the graph id:
"neurons 5–20 returned exactly 0; neurons 1–4 scored the wrong neuron" (`experiments/d2/D2_EVIDENCE_LINEAGE.md`, repair
`8b9355f`). **FACT:** `futureBonus` was effectively dead in every runtime GATE-FLOOR-1 and GATE-FLOOR-B2 measured. At HEAD it is
live: with a cold record `FS(k) = −d(k, goal)`, so `futureBonus` is 20 (goal), 16 (a goal neighbour), 13.3, 11.4, 10 — an
experience-independent structural gradient, ×1.2 in the learned score and in the arbitration blend. **INFERENCE** (the commits
are confounded, but only this one moves a decision channel at that scale): the floor-OFF calibration shows the cold baseline at
HEAD far above B2's on identical worlds and seeds.

## Floor-OFF calibration at HEAD (design input; `results/calibration_summary.json`; no floor session was run)

XFER-1 worlds 0–39, scratch copy of the HEAD blobs with an observational goal-reset probe only:

| arm | legal reaches | non-graph resets | legal benefit over COLD [95 %] | (B2 calibration) |
|---|---|---|---|---|
| COLD | 303.8 | 29.7 % of resets | — | 142.6 |
| REAL | 305.9 | 31.9 % | **+2.1 [−22.7, 27.4]** | +68.6 |
| ENTRY_NR | 364.4 | 24.2 % | **+60.5 [34.2, 87.2]** | +194.4 |

HEAD − B2 on identical worlds/seeds: COLD legal +161.3 [130.5, 192.1]. Paired SDs on legal reaches 82.0 / 86.0 / 87.3.
**The uncertainty is that of a 40-world calibration:** the goal-entry benefit interval is ±26, the SD is a point estimate;
the declared margins sit below the interval's lower bound and n carries a buffer (266 → 280).

## What the floor can and cannot be at HEAD

* **FACT:** the pure GATE-FLOOR-B2 transform applies to HEAD `main.js`: both anchors match exactly once in context
  (FIX 3 `goalGradientBoost = 100 * tc;` at line 2123; the goal reset at 4861); the goal-gradient block is byte-identical.
* **FACT:** HEAD still takes no environment draw for a goal entry; the final-hop failure diagnostic is degenerate here too.
* **INFERENCE:** in production (no `__M7_ENV__`) every traversal succeeds, `ĉ ≡ 1`, and FutureScore is a pure distance
  potential. This study measures the M7 hidden-reliability harness, not production.
* **UNKNOWN:** the floor's effect on HEAD's own non-graph resets (reported); the role of the 1-hop shortcut penalties
  (reported, not identified); whether the harness fully removes the `Date.now()` throttles D2 describes (neutrality and
  determinism are tested, gate section N).
