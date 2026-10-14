# XFER-2 — resolve the mechanism behind the XFER-1 episode benefit

**Status: DEVELOPMENT / EXPLORATORY. Design closed pending one independent review; no XFER-2 outcome exists.** No
production file is touched; no registered or held-out seed is used; nothing in MCF-1 (configuration, registry,
authorization, freeze) is changed.

## The question

XFER-1 found that restoring a world's real episode store roughly doubles goal reaches (+98 [78, 119] over 80 worlds).
Decision-time reads of the store gate the goal gradient (`0.10 + 0.90·tc` for non-goal moves, `100·tc` for the
goal-entering move), and stored episodes are also replayed into procedural learning. Is the benefit **removal of a
cold-start handicap** and/or **replay learning**, or does the **real, goal-terminated experience carry information that
generic exposure of the same size does not**? The answer chooses between improving episodic memory, correcting
cold-start scoring, or looking elsewhere.

## Design closure: the three issues and their resolution

1. **Control validity.** COVER (182 episodes, every edge saturated) is not a matched control, and is no longer called
   one: it is `SAT_NR`, an *upper bound* of generic exposure. The matched control is `GEN_NR`: per world, the **same
   number of episodes, the same length and the same simple/loop kind of every episode, hence the same total
   transitions** as the real store (residuals 0, exact), with edges placed by balanced least-used selection and no
   reference to the goal or to any real path. It changes one declared variable: the *placement* of the exposure budget
   (edge identity, direction and goal termination, bundled). Residuals measured before any outcome
   (`results/construct_validity.json`, 80 real stores): the matched store covers 52 more directed edges, has 49 more at
   count ≥ 5, retains +0.55 more goal gradient on goalward and +0.63 on away edges and +0.44 more goal-entering tc — it
   **unlocks strictly more** than the real store, so a shortfall of the real store against it cannot be explained by
   less exposure. `REV_NR` splits direction from the bundle; `SAT_NOENTRY_NR` / `ENTRY_NR` split the two gate terms.
2. **Estimand stability.** The primary quantity is the per-world paired difference in goal reaches; **no ratio decides
   anything** (the share of the real benefit is reported only descriptively). Classification uses fixed absolute
   margins taken from XFER-1 alone: `DELTA = 25` reaches (about a quarter of +98) and `MIN_REAL_BENEFIT = 50` (2·DELTA,
   below XFER-1's lower bound 78). If the lower bound of benefit(REAL) is < 50 nothing is interpreted:
   `NOT_INTERPRETABLE_LOW_BENEFIT` (lower bound > 0) or `DID_NOT_REPRODUCE` (≤ 0); paired differences are still
   reported. Under status OK, COLD itself is automatically `FALLS_SHORT` of REAL (a built-in negative control).
   **Power:** in XFER-1 the paired SD between two store arms is 72–104 (80th percentile 101); with DELTA = 25 a
   non-inferiority call needs n ≥ (2.8·SD/DELTA)² = 128 worlds. The first draft had 48 and could essentially never
   have called a non-inferior arm non-inferior; block D now has **128** worlds (the gate recomputes this from XFER-1).
3. **Mechanism isolation.** Over the whole conformed tree, `quality` is read only in `render/episodeManager.js`:
   replay eligibility, persistence, sealing/pipeline of *new* episodes, and two getters with **no callers**; a replayed
   copy's quality is *recomputed* by `_sealBuffer`, so the stored value is a binary eligibility switch. Behaviour is
   tested, not inferred: (a) with the runtime's own episode manager an eligible store replays into Q/rewards, a
   quality-0.49 copy never does, loop-containing episodes never do, and 0.5 replays; (b) on the whole runtime, a store
   at its real quality and at 0.49 give **identical first-decision weights and identical executed actions until the
   first replay tick**, and on edges the no-replay run never walks the eligible store writes procedural keys and the
   0.49 copy writes none. **Residual, disclosed:** a replay tick draws from the cognitive stream only when an eligible
   episode exists, so `REAL_NR` shifts that stream by one draw per replay tick before the session's own first episode —
   exchangeable noise, not a systematic effect (and the arms already diverge at the first decision). So
   `REAL − REAL_NR` identifies "replay of the *delivered* episodes (each distinct label sequence once per run)" plus
   that small stream shift; it does not identify replay of the session's own episodes.

## Arms (each delivers only an episode store; everything else is empty at the first agent call)

| arm | store | role |
|---|---|---|
| `COLD` | none | baseline |
| `REAL` | the world's own training store (XFER-1 `ONLY_episodes`) | reproduction |
| `REAL_NR` | same, `quality = 0.49` | decision-time reads without replay learning |
| `GEN_NR` | matched generic (above) | placement of a fixed budget |
| `SAT_NR` | saturated, goal-free, world-independent; every directed edge ≥ 5 | **upper bound** of exposure |
| `SAT_NOENTRY_NR` | SAT without transitions into the goal | non-goal gate only |
| `ENTRY_NR` | two-node episodes [u, goal], 5 per goal neighbour | goal-entering term only |
| `REV_NR` | real paths reversed | direction of travel inverted |

## Declared decision rules and predictions

Declared interpretation (`config.mjs`, `interpret`): `SAT_NR` NON_INFERIOR/EXCEEDS `REAL_NR` → the benefit is removal
of the cold-start goal-gradient attenuation and correcting cold-start scoring dominates improving episodic memory
(`GEN_NR` FALLS_SHORT adds: real placement is a cheaper unlock; `ENTRY_NR` NON_INFERIOR to `SAT_NR` adds: the
goal-entering term carries it); `SAT_NR` FALLS_SHORT → real content carries information exposure does not; `REAL`
exceeding `REAL_NR` by ≥ DELTA → replay contributes; anything else → inconclusive.

| id | prediction |
|---|---|
| P1 | lower bound of benefit(REAL) ≥ 50 reaches |
| P2 | REAL_NR NON_INFERIOR to REAL |
| P3 | SAT_NR NON_INFERIOR or EXCEEDS REAL_NR |
| P4 | GEN_NR FALLS_SHORT of REAL_NR |
| P5 | REV_NR FALLS_SHORT of REAL_NR |
| P6 | ENTRY_NR NON_INFERIOR to SAT_NR |

## Blocks, exclusions, stopping

Worlds are fresh accepted configurations (the stream continues XFER-1's; world 80 onward) with new agent seeds. Block
**C** (worlds 80–103, 24) is the instrument check and exploratory look; block **D** (worlds 104–231, 128) is the
replication and the primary analysis. Predictions and rules are fixed before C and are **not** revised for D; each
block is run once in full. A world is excluded (all arms) only if a control fails its construct check or a session
fails after one retry; never for its outcomes; more than 10% excluded invalidates the block. A secondary subset (real
store ≥ 20 episodes) is reported, never primary.

## Review status

`research/external/XFER2_GEMINI_DESIGN_REVIEW_PACKAGE_R2.md` is the single, self-contained review request for this
revised design. Outcomes are generated only after its critique is evaluated.

## Files

`config.mjs` · `controls.mjs` · `arms.mjs` · `checks.mjs` · `construct_report.mjs` · `probe_session.mjs` (whole-runtime
isolation probe) · `orchestrate.mjs` · `analyze.mjs` · `verify_xfer2.mjs`.
