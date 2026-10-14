# GATE-FLOOR-1 — does a guarded goal-entry floor reproduce the episode benefit without episodes?

**Status: DEVELOPMENT / EXPLORATORY. Block F (160 worlds) executed under the frozen design (freeze `d5dbac1`); results in [results/RESULTS.md](results/RESULTS.md).** Not preregistered in the repository's formal sense. No registered or held-out seed,
no production file, and no earlier experiment is modified. Substrate: the M7-conformed B2 tree that H1-R, MCF-1, XFER-1 and
XFER-2 use — **not** current `main.js`.

## Question

XFER-2 found that the episode-store benefit (+88 goal reaches per 1,500-call session over cold) is carried by familiarity of
transitions **into the goal**: a store of 5 × `[u, goal]` per goal neighbour (ENTRY_NR) gave +130, while goal-free generic
exposure of the same size matched the real store and replay of delivered episodes contributed nothing detectable. The runtime
scores the goal-entering move `100 · tc` with `tc = min(count(u→goal)/5, 1)` read from episodes only (FIX 3), so a cold agent
gives that move no pull. **Does a guarded, default-off floor on exactly that term, with no stored episode, reproduce the
benefit?**

## The intervention (derived, not tuned)

`transform.mjs` inserts one guarded line after FIX 3's `goalGradientBoost = 100 * tc;` in a *copy* of the conformed
`main.js`:

```js
if (globalThis.__GATEFLOOR1__ && globalThis.__GATEFLOOR1__.on) goalGradientBoost = globalThis.__GATEFLOOR1__.entry(currentKey, k, goalNeuronId, tc, structureMap.has(k)); // GATEFLOOR1
```

`entry()` (floor_runtime.mjs) returns `100 · max(tc, 1)` iff the candidate is the active goal **and** a legal graph edge from the
current node (the product's own `structureMap` **and** the world's edge oracle), else `100 · tc` unchanged. It can only raise a
score, only on the goal-entering candidate, only through the term the original expression computes.

* **Value 1 is not a free parameter.** 100 is the value the same block assigns to "the candidate IS the goal" immediately
  before FIX 3 overwrites it; `tc = 1` is exactly the state ENTRY_NR created and measured in XFER-2 — the only goal-entry level
  with outcome evidence. No smaller floor is tested (it would be a value chosen without evidence).
* **Default off, off == pristine.** With the global absent the line is one read of an undefined global. The gate shows
  byte-for-byte equality of the tree minus the line, and whole-runtime equality of session records (absent, armed-but-off,
  with and without a delivered store, and tcFloor = 0).
* **Not edited:** `main.js` of the repository, the H1-R conformance transform (its digest `02ccbf382ad7…` is a pinned build
  identity), XFER-1/XFER-2, MCF-1.

## Design (frozen in `config.mjs`; digest below)

160 fresh worlds (indices 232–391 of the accepted stream from 200,000; accepted seeds 213,241–220,428; 40 per goal 8/12/16/19),
1,500-call training session then five paired 1,500-call test sessions per world (same test seed, same configuration):

| arm | store | floor | role |
|---|---|---|---|
| COLD | none | off | baseline |
| COLD_FLOOR | none | **on** | the intervention |
| REAL | the world's own training store | off | the persistence to reproduce |
| ENTRY_NR | 5 × `[u, goal]` per goal neighbour, quality 0.49 | off | mechanism ceiling |
| REAL_FLOOR | own training store | on | compatibility (descriptive) |

Primary outcome: goal reaches per session. Absolute margins from XFER-1/XFER-2 only: `DELTA = 25`, `MIN_BENEFIT = 50`,
`MAX_ATTEMPT_DROP = 0.05`; no ratio and no p-value decides anything. Claims C1–C5 and predictions F1–F5 are in `config.mjs`;
instruments I1 (REAL reproduces) and I2 (ENTRY_NR benefits) void the claim that uses them if their lower bound is below 50.
A declared Bonferroni-3 sensitivity is reported, never decisive.

**Declared residual.** ENTRY_NR's episodes are also read by `trajectoryIntegrity × 40` and the schema bonus (≤ 15) on the
`(u → goal)` pair; the floor does not replicate either. A shortfall against ENTRY_NR is therefore "the goal-entry gradient is
not all of it", not a refutation of the gate hypothesis.

## Review and the final-hop correction

An independent review (no repository access) returned **PASS WITH CLAIM LIMITS** and required one correction, now implemented:
a **descriptive final-hop retry diagnostic** (failed attempts per successful goal-entry traversal, by arm and goal group,
paired-by-world interval, zero-success sessions reported). It adds no confirmatory threshold and moves no decision
criterion. Full record, exact definition and claim limits: [DESIGN_REVIEW.md](DESIGN_REVIEW.md).

* decision digest (what the reviewer saw; unchanged): `a2d5adc3cc9d451edcbee83b312e8191137b32cdaf9c7247a4bd5081cb27312a`
* design digest (decision digest + descriptive diagnostics): printed by `orchestrate.mjs` and recorded in every manifest
* the 223-vs-265 single-world wiring observation stays excluded from confirmatory inference

## Run

```bash
node experiments/gate-floor1/verify_gatefloor1.mjs                                  # gate (writes nothing in the repository)
node experiments/gate-floor1/orchestrate.mjs --out experiments/gate-floor1/data/blockF --workers 6
node experiments/gate-floor1/analyze.mjs --in experiments/gate-floor1/data/blockF --out <summary_blockF.json>
node experiments/gate-floor1/orchestrate.mjs --out <tmp> --selftest                 # plumbing only; XFER-1 worlds 0..3, no floor arm
```

## Claim limits

B2-conformed runtime, Phase I, 1,500 calls, the hidden-reliability task with an oracle goal. Nothing here supports
human-like episodic recall, understanding, planning, reliability learning, general cognition, manufacturing competence, or any
property of current `main.js` (whose browser app has no N1 mask; FIX 3 there guards non-graph shortcuts).
