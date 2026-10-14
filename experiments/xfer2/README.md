# XFER-2 — resolve the mechanism behind the XFER-1 episode benefit

**Status: DEVELOPMENT / EXPLORATORY. Design stage: no XFER-2 outcome exists yet.** No production file is touched; no
registered or held-out seed is used; nothing in MCF-1 (configuration, registry, authorization, freeze) is changed.

## The primary question

XFER-1 found that restoring a world's real episode store roughly doubles goal reaches in a new session (+98 [78, 119]
over 80 worlds). Two code-level mechanisms can produce that, and they are not about *knowledge*:

* **Decision-time reads.** The goal gradient is multiplied by `0.10 + 0.90·tc`, where `tc = min(count/5, 1)` is the
  episodic adjacency count of the move (`main.js`, `trajectoryConfidence`); trajectory integrity adds up to +40 for a
  move seen in ≥5 episodes. A cold agent therefore has its goal pull attenuated to 10% until edges become familiar.
* **Replay learning.** A stored episode with `quality ≥ 0.5`, a simple path and graph edges is replayed, and a replayed
  episode runs the full procedural pipeline (Q, transitions, rewards) whether or not it reached a goal.

So: **is the benefit explained by generic directed-edge exposure (removal of the cold-start attenuation) and/or replay
learning, or does the content and structure of the real, goal-terminated experience add information beyond that?**

Two facts make a clean causal switch possible (both verified by `verify_xfer2.mjs` against the runtime's own code and
module): decision-time reads ignore `quality` (F1), and replay eligibility depends on `quality ≥ 0.5` (F2). Setting
`quality = 0.49` therefore removes replay learning and leaves every decision-time read of the store unchanged.

## Arms (every arm delivers only an episode store; everything else is empty at the first agent call)

| arm | store | role |
|---|---|---|
| `COLD` | none | baseline |
| `REAL` | the world's own training store (XFER-1 `ONLY_episodes`) | reproduction |
| `REAL_NR` | same episodes, `quality = 0.49` | decision-time reads without replay learning |
| `COVER` | goal-free, world-independent walks, every directed edge ≥ 5, replay-eligible | generic exposure, with replay |
| `COVER_NR` | same walks, `quality = 0.49` | generic exposure, reads alone |
| `REV_NR` | real paths reversed, `quality = 0.49` | same exposure and structure, direction of travel inverted |
| `DONOR_SG` | another world's real store, same goal | foreign real experience |
| `DONOR_XG` | another world's real store, different goal | foreign real experience, wrong goal |

`COVER` is deliberately **not** count-matched to a real store: it is the saturated upper bound of generic exposure and
carries no information about the world or the goal by construction (one store, a pure function of the graph). The
matched-structure control is `REV_NR`. The construct-validity report (`results/construct_validity.json`, outcome-free,
built on the 80 existing XFER-1 training stores) discloses every residual difference: episode count (+107.6 on
average), transitions (+448), directed edges at count ≥ 5 (78 of 78 against 8.1 of 78), gate retention by edge class
(real: goalward 0.28, away 0.20; cover: 1.0 everywhere), goal termination (cover 3.7% against real 87.5%),
replay-eligible share (cover 79.1%, real 70.1%).

## Estimand and decision rules (declared)

Primary outcome: goal reaches in the 1,500-call test session, paired by world. `benefit(X) = mean(E1[X] − E1[COLD])`;
`R(X) = benefit(X) / benefit(REAL)`, with a seeded percentile bootstrap interval over worlds. Classification:
`R ≥ 0.80` reproduces, `0.40 ≤ R < 0.80` partial, `R < 0.40` does not; an interval that straddles a boundary is
reported `…_AMBIGUOUS`. If `benefit(REAL)` is not > 0 with the interval excluding 0, the block did not reproduce XFER-1
and **no R is interpreted**. Declared interpretation (see `config.mjs`, `interpret`):

* `R(COVER_NR)` reproduces → the benefit is generic exposure removing the cold-start attenuation; investigate the
  cold-start scoring mechanism before claiming learned knowledge.
* `COVER_NR` does not but `R(REAL_NR)` does → real decision-time content carries information exposure does not.
* neither reproduces → the benefit needs replay learning from real episodes.
* anything else → inconclusive; no stronger sentence is allowed.

Attempt success, route statistics and store diagnostics are secondary mechanism diagnostics, never substitutes.

## Predictions, declared before any XFER-2 outcome

| id | prediction |
|---|---|
| P1 | `benefit(REAL) > 0`, interval excludes 0 (reproduces XFER-1) |
| P2 | `R(REAL_NR) ≥ 0.70` (replay learning is not needed) |
| P3 | `R(COVER_NR) ≥ 0.70` (generic exposure at decision time suffices) |
| P4 | `R(REV_NR) < 0.30` (reversing direction removes the benefit) |
| P5 | `mean(COVER − COVER_NR) < 0` (replaying goal-free walks does not help) |
| P6 | `mean(DONOR_SG − DONOR_XG) > 0` (the goal matters for foreign experience) |

## Blocks, exclusions, stopping

Worlds 80–151 are fresh accepted configurations (accepted seeds 205256–208810; the first 80 of the stream are XFER-1's)
with new agent seeds. Block **C** (worlds 80–103, 24) is the instrument check and exploratory look; block **D**
(worlds 104–151, 48) is the replication. Predictions above are fixed before C and are **not** revised for D. Each block is
run once, in full. A world is excluded (whole world, all arms) only if a control fails its construct check or a session
fails after one retry; no world is excluded for its outcomes; more than 10% excluded invalidates the block. A declared
secondary subset (real store ≥ 20 episodes) is reported but never primary.

## Review status

`research/external/XFER2_GEMINI_DESIGN_REVIEW_PACKAGE.md` is the single, self-contained review request. Outcomes are
generated only after its critique is evaluated.

## Files

`config.mjs` (declarations, classification, interpretation, design digest) · `controls.mjs` (builders, store statistics)
· `arms.mjs` · `checks.mjs` · `construct_report.mjs` · `orchestrate.mjs` · `analyze.mjs` · `verify_xfer2.mjs`.
