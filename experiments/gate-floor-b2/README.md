# GATE-FLOOR-B2 — does the goal-entry floor survive on the pristine B2 runtime?

**Status: DEVELOPMENT / EXPLORATORY. Block G (160 worlds) executed under the frozen design (freeze `a263fd5`): REPLICATED; results in [results/RESULTS.md](results/RESULTS.md).** Not preregistered in the repository's formal sense. No registered or held-out seed,
no production file, and no earlier experiment is modified. Substrate: the exact B2 (`707cb1e`) blob set built by
`experiments/h1r/build_tree.mjs --pristine` — **no** H1-R conformance edit and **no** H1-R runtime — plus two guarded lines
(below). **Not** current `main.js`.

## Review

Independent review of the frozen design (no repository access): **PASS WITH CLAIM LIMITS, no material objection, ready to
freeze and run unchanged** — record, the reviewer's two UNKNOWNs and the descriptive additions made before the freeze are in
[DESIGN_REVIEW.md](DESIGN_REVIEW.md). Decision digest `fefd942a099fde6f20d4204d684cde1cd545b8734e41f35b65ace851fa4528fc`
(unchanged since the review); the design digest additionally binds the descriptive diagnostics and is recorded in every manifest.

## Question

GATE-FLOOR-1 (conformed runtime, 160 worlds): a guarded, default-off floor on the goal-entering score term, with no stored
episode, raised goal reaches by +153 over cold, exceeded restoring the real episode store and was non-inferior to the
goal-entry-only episode store; the benefit came with a *higher* failed-attempts-per-success on the final hop (an edge-mix
effect), so it was **not** called routing capability. The conformed runtime differs from what ships. **Does the effect survive
on the pristine runtime?** This is the evidence gate before any production-design proposal.

## What is different on the pristine runtime (see [PRISTINE_RUNTIME.md](PRISTINE_RUNTIME.md))

* B2 **admits non-graph candidates and executes non-graph moves** (no N1): a goal reset can follow a move that is not a
  graph edge — 38 % of COLD's resets in the floor-OFF calibration.
* B2 takes **no environment draw for a goal-entering move** (it always arrives): the GATE-FLOOR-1 final-hop retry diagnostic
  is structurally degenerate.
* B2's own stores may contain non-graph transitions (32.5 % in calibration).

## Design (frozen in `config.mjs`; changes from GATE-FLOOR-1 are listed there and each is forced by a measured property)

| item | GATE-FLOOR-1 | GATE-FLOOR-B2 |
|---|---|---|
| substrate | conformed tree (H1-R on) | pristine B2 blobs |
| worlds | 232–391 | **392–551** (fresh; 40 per goal) |
| arms, floor value 1, margins 25 / 50 / 0.05, claims C1–C5, bootstrap | — | **unchanged** (imported) |
| primary outcome | goal reaches (all legal there) | **legal goal reaches**; every goal reset is a declared sensitivity |
| final-hop diagnostic | failed attempts per success | degenerate by B2 semantics; draw log reports any draw into the goal |
| audit | floor never evaluates a non-legal candidate | floor may *evaluate* non-graph candidates but never *raise* one |
| descriptive extras | — | B2's non-edge resets per arm; entry edge mix |

The floor is the **same function** as GATE-FLOOR-1's (`gate-floor1/floor_runtime.mjs`), and the same semantic edit: after
FIX 3's `goalGradientBoost = 100 * tc;`, `100·max(tc, 1)` iff the candidate is the active goal and a legal graph edge
(`structureMap.has(k)` and the edge oracle), else unchanged. A second, call-only line reports each goal reset.

## Run

```bash
node experiments/gate-floor-b2/verify_gatefloorb2.mjs                       # gate (writes nothing in the repository)
node experiments/gate-floor-b2/calibrate.mjs --out <tmp> --worlds 40         # floor-OFF calibration (design input)
node experiments/gate-floor-b2/orchestrate.mjs --out experiments/gate-floor-b2/data/blockG --workers 6
node experiments/gate-floor-b2/analyze.mjs --in experiments/gate-floor-b2/data/blockG --out <summary_blockG.json>
node experiments/gate-floor-b2/orchestrate.mjs --out <tmp> --selftest        # plumbing only; XFER-1 worlds 0..3, no floor arm
```

## Claim limits

Pristine B2 (707cb1e), Phase I, 1,500 calls, the hidden-reliability task with an oracle goal, floor value 1 only. Nothing here
supports human-like episodic recall, understanding, planning, reliability learning, routing capability, general cognition,
manufacturing competence, or any property of current `main.js`. No production code is changed.
