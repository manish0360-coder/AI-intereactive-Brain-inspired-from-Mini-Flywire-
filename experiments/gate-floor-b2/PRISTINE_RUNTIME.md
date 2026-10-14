# The pristine B2 runtime — what this study's substrate is, and how it differs where it matters

Labels: **FACT** = read from the committed sources or measured by a script in this directory; **INFERENCE** = follows from
facts but was not directly tested; **UNKNOWN** = not established. Line numbers are in the pristine `main.js` (blob
`113fa471…`, sha256 `537f37a2…`) unless stated. Nothing here is inferred from the conformed runtime's behaviour: the
differences below come from `diff` of the two built trees and from the transform's own guarded edits.

## 1. Build identity

| item | value | status |
|---|---|---|
| source commit | B2 = `707cb1e5205a7e9979f81092ee1ebfa0fe28922e` | FACT |
| pristine tree | `node experiments/h1r/build_tree.mjs --pristine` → `b2-707cb1e`: 146 blobs (everything but `Portfolio_Assets/`), every git blob id re-verified, `transformSha256 = null` | FACT |
| pristine `main.js` | blob `113fa471f87f3c23bdfffa523ffe8d4d564f7172`, sha256 `537f37a20144de07e39e2273ee2e78777e4c0f8ec3259b1e033f8a897d522e2b` | FACT |
| derived tree (this study) | pristine + exactly two guarded lines in `main.js` (below); `main.js` sha256 `ff8c0555fdf748e1e46e5191ed7af1d7c14f80684f6e99531b9caf5b6e649083`; all 145 other files byte-identical | FACT |
| conformed tree (contrast only) | `conformed-707cb1e-02ccbf382ad7`, `main.js` sha256 `10c6ed9c…`; **six** files differ from pristine: `main.js`, `render/qlearning.js`, `render/episodeManager.js`, `instrumentation/rng.js`, `render/scoring.js`, `render/behavior.js` | FACT |
| H1-R runtime | never installed here (`session.mjs` refuses `H1R=on`; no `__H1R__` global) | FACT |

Every conformance edit is guarded by `globalThis.__H1R__ && …on` (behavioural) or `globalThis.__H1R_MEASURE__`
(observational). With H1-R absent the conformed tree is B2 (H1-R gate G1′). This study does not rely on that: it runs
the pristine blobs themselves.

## 2. Differences material to the intervention

| path | pristine B2 | conformed (H1-R on) | status |
|---|---|---|---|
| **Goal-entry gradient** | `goalGradientBoost = 100` for the goal candidate (1933), overwritten by FIX 3 `= 100 * tc` (1993); `tc = min(count(u→k)/5, 1)` from `adjacencyMemory` (939) | same source lines; no edit touches them | FACT |
| **Candidate admission / legal-edge validation** | admits a candidate if `structureMap.has(k)` **or** `transitions(cur→k) > 5` **or** (`rewards > 4` and an episodic witness) (1634–1660): **non-graph candidates are admitted** | N1-MASK returns for non-neighbours (1659, 2461) | FACT |
| **Move execution** | executes `reasoning.to` without an edge check | N1-GUARD refuses a move that is not a graph edge (3510) | FACT |
| **Environment transition at a goal entry** | `_goalResetJustHappened = (next === goal)` (4862): a goal-entering move takes **no environment draw**, no trust credit, and always arrives | R2 draws for it like any edge (edits at 4862, 4888) | FACT |
| **Environment transition elsewhere** | one draw per move at E1 (4887), **after** the self-learning section, which has already learned the *intended* move; `env.attempt` returns true **without a draw** for a pair that is not a graph edge (`env.js:487`) | R1 takes the draw **before** learning and learns the realised transition (edit at 3830) | FACT |
| **RNG streams / order** | cognitive `seed`; visual `seed ^ 0x9e3779b9`; environment `seed ^ 0x5EED` (`rng.js:33–46`); env draw after the learning section | R3 derives the environment seed from the design position; draw before learning | FACT |
| **Training / persistence / episodes** | `render/episodeManager.js` seals every consecutive pair (no N1-SEAL): **episodes may contain non-graph transitions**; `sys.recordSuccess(key)` runs at sealing (no N2); brain persistence (`saveBrain`/`loadBrain`) unchanged | N1-SEAL drops non-edge pairs; N2 suppresses the episode-level success writer | FACT |
| **Goal-reach counting** | goal reset at 4731 in the reward block; no counter; `window.lastReasoning` is **not cleared** at a reset; `+12` goal reward only if `episodeUnique >= 3` (3924) | P4 clears the reasoning and counts resets; flat `+12` | FACT |
| **Session termination** | `runOnce` runs `ticks` calls; 150-tick episode cap armed by `run.js` (`__M7_EPISODE_CAP__`, 1030) | same | FACT |
| **canReachGoal** | the visited-set false-negative form (1128–1160) | CRG backtracking fix | FACT |
| **Learning of 1-hop goal entries** | "minimum causal depth" block penalises a goal entry reached at path depth ≤ 1 (`penalties`, up to 8) and scales reward by depth and `tcFactor` | same block | FACT |

Consequences (INFERENCE from the facts above, then measured where stated):

* B2 can reach the goal by a move that is **not** a graph edge, and counts it as a goal reset. **Measured** (floor OFF,
  XFER-1 worlds 0–39, calibration): non-edge share of resets 37.8 % (COLD), 44.0 % (REAL), 23.8 % (ENTRY_NR); 32.5 % of
  the transitions in B2's own exported stores are not graph edges.
* B2 has no environment draw on a goal entry, so the **final-hop failure count is 0 by construction** and the GATE-FLOOR-1
  retry diagnostic cannot be reproduced as defined there; it is reported degenerate with a draw log that would show any
  draw into the goal (measured: none).
* **Where the non-edge resets come from:** of 445 non-edge resets in six COLD sessions, 41 % occur on the call immediately
  after another goal reset and 17 % on a replay tick — consistent with re-execution of the stale pre-reset reasoning
  (INFERENCE; P4 is the conformed fix). The remaining 42 % are **UNKNOWN** (candidate: shortcut admission through
  `isEpisodeTrained` / `isHumanTrained`).
* The floor, by construction, cannot raise a non-graph candidate (it requires `structureMap.has(k)` **and** the
  connections.json edge oracle). Whether it changes the *frequency* of B2's own non-edge resets is **UNKNOWN** and is
  reported, not constrained.
* Whether the 1-hop penalty block damps a floor that makes 1-hop entries common is **UNKNOWN**.
* Differences between B2 (`707cb1e`) and the current repository `main.js` are **not** examined here (UNKNOWN); no claim
  about current `main.js` follows from this study.

## 3. The intervention, ported semantically

`transform.mjs` inserts, into a copy of the pristine `main.js`:

1. **FLOOR** — after FIX 3's `goalGradientBoost = 100 * tc;` (verified in context: the `tc` line above, the FIX 3
   header within 30 lines, the branch end below): `goalGradientBoost = entry(currentKey, k, goalNeuronId, tc,
   structureMap.has(k))` when `__GATEFLOORB2__.on`. `entry` returns `100·max(tc,1)` iff `inStructure` **and**
   `to == goal` **and** `from ≠ to` **and** the edge oracle (the tree's own `connections.json`) confirms `from→to`;
   otherwise `100·tc`, unchanged. Same function as GATE-FLOOR-1 (`gate-floor1/floor_runtime.mjs`).
2. **PROBE** — immediately before the goal reset's `agentCurrent = allIds[…]` (4731), when `agentCurrent` still holds the
   position the goal-entering move was decided from: `__GFB2__.goalReset(agentCurrent, current, goalNeuronId)`. Call-only.

## 4. Measurement path and its neutrality

Observational only: B2's own `__M7_TEL__` hook (called at the start of every `runAgent`: call index, replay ticks), a
setter wrapper on `__M7_ENV__` that logs each draw `(call, from, to, ok)` and calls through unchanged, the goal-reset probe,
and the one-shot `localStorage` delivery of the arm's episodes through the product's `loadBrain()`. `instrument: false`
installs none of it. Neutrality is **checked, not assumed** (gate section N): bare pristine = bare derived = measured OFF
= armed-but-off in run fingerprint (writes, environment counters, credit keys, Q, draw counts), outcome and end-state brain
hash, with and without a delivered store.
