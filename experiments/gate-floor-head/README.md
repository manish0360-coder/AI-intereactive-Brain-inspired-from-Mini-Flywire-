# GATE-FLOOR-HEAD — the goal-entry floor on the exact audited HEAD runtime

**Status: DEVELOPMENT / EXPLORATORY.** Not preregistered in the repository's formal sense. No registered or held-out seed,
no production file and no earlier experiment is modified. Substrate: the runtime file set of audited commit
`0df804c497e649affb9e7ebacb10fdc81ab6de8d` (FutureScore V2.3 live), materialised from git blobs in a temp directory, plus
two guarded call-level lines in a *copy* of `main.js`. Production `main.js` is untouched.

## Question

GATE-FLOOR-1 (conformed runtime, +152.7) and GATE-FLOOR-B2 (pristine B2, +190.2) show that a guarded, default-off floor on
the goal-entering score term, with no stored episode, raises legal goal reaches. Both runtimes had a **dead** FutureScore
channel; HEAD's is live and goal-directed, and the floor-OFF calibration on HEAD shows the cold baseline roughly doubled, the
persisted-episode benefit gone and the goal-entry benefit about a third of B2's. **Does the floor still raise legal goal
reaches at HEAD, and does it still approach the goal-entry-store ceiling?** See [HEAD_RUNTIME.md](HEAD_RUNTIME.md).

## Design (frozen in `config.mjs`; the review record is [DESIGN_REVIEW.md](DESIGN_REVIEW.md))

280 fresh worlds, indices 552–831 (70 per goal 8/12/16/19), a 1,500-call cold training session then five paired 1,500-call test
sessions per world (same test seed, same configuration):

| arm | stored episodes | floor | role |
|---|---|---|---|
| COLD | none | off | baseline |
| COLD_FLOOR | none | **on** | the intervention |
| ENTRY_NR | 5 × `[u, goal]` per goal neighbour | off | mechanism ceiling / instrument I2 |
| REAL | the world's own training store | off | **descriptive contrast — gates nothing** |
| REAL_FLOOR | own training store | on | compatibility, descriptive |

**Primary outcome: legal goal reaches.** Every goal reset and the non-graph resets are reported separately. Margins
(absolute, from the HEAD calibration by the programme's rule): `DELTA = 15`, `MIN_BENEFIT = 30`, `MAX_ATTEMPT_DROP = 0.05`;
no ratio and no p-value decides anything. **Replication criterion: C1 ∧ C3 ∧ C4 ∧ C5 with I2 valid** (C1 benefit lower bound
≥ 30; C3 non-inferior to ENTRY_NR within 15; C4 no goal group harmed and attempt success not down by > 0.05; C5 audit clean;
I2 lower bound of benefit(ENTRY_NR) ≥ 30). REAL's contrast is reported transparently and does not gate the label. A declared
Bonferroni-3 sensitivity and the every-reset sensitivity are reported, never decisive.

## Run

```bash
node experiments/gate-floor-head/verify_gatefloorhead.mjs                              # gate (writes nothing in the repository)
node experiments/gate-floor-head/orchestrate.mjs --out experiments/gate-floor-head/data/blockH --workers 6
node experiments/gate-floor-head/analyze.mjs --in experiments/gate-floor-head/data/blockH --out <summary_blockH.json>
node experiments/gate-floor-head/orchestrate.mjs --out <tmp> --selftest                # plumbing only; XFER-1 worlds 0..3, no floor arm
```

## Claim limits

Audited HEAD, Phase I, 1,500 calls, the M7 hidden-reliability harness, floor value 1, FutureScore V2.3 live. A pass supports the
goal-entry floor **only within this tested configuration**; it does not establish general routing capability, learning,
understanding, recall, production safety or broader intelligence.
