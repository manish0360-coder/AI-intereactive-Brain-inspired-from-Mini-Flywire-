# GATE-FLOOR-PRODSEM — the goal-entry floor under production-like transition semantics

**Status: DEVELOPMENT / EXPLORATORY. Block P (280 worlds) executed under the frozen design (freeze `cfc1e5c`): TRANSFERS; results in
[results/RESULTS.md](results/RESULTS.md).** Not preregistered in the repository's formal sense. No registered or held-out seed, no
production file and no earlier experiment is modified. Substrate: the **same pinned derived HEAD tree as GATE-FLOOR-HEAD**
(commit `0df804c497e649affb9e7ebacb10fdc81ab6de8d`, two guarded call-only lines in a *copy* of `main.js`, derived main sha256
`8cf1dc296189286113ac9daa16a28f98bbab131b18b919ec6aeb1fed4d4abc1e`). Production `main.js` is untouched.

**Classification: Production-like transition semantics under M7 bounds.**

## Question

GATE-FLOOR-HEAD showed the floor raises legal goal reaches on the exact HEAD runtime (+62.6 [54.6, 70.6]) **inside the M7
hidden-reliability harness**. Phase 1 of this milestone ([PRODSEM_SEMANTICS.md](PRODSEM_SEMANTICS.md)) established that removing
the environment alone (`envMode off`, state E) is a hybrid that keeps E2 credit and the prediction-error pin, so the faithful test
is **hook state P**: arm OFF, envMode off, creditMode off, pin off — every M7 semantic hook undefined. **Does the floor still
raise legal goal reaches over cold under P?**

## Design (frozen in `config.mjs`; the review record is [DESIGN_REVIEW.md](DESIGN_REVIEW.md))

280 fresh worlds, indices 832–1111 (70 per goal 8/12/16/19), a 1,500-call cold training session then five paired 1,500-call test
sessions per world (same test seed, same configuration), all under state P:

| arm | stored episodes | floor | role |
|---|---|---|---|
| COLD | none | off | baseline |
| COLD_FLOOR | none | **on** | the intervention |
| ENTRY_NR | 5 × `[u, goal]` per goal neighbour | off | mechanism ceiling / instrument I2 |
| REAL | the world's own training store | off | descriptive contrast — gates nothing |
| REAL_FLOOR | own training store | on | compatibility, descriptive |

**Primary outcome: legal goal reaches.** Every goal reset and the non-graph resets are reported separately. Margins (absolute,
from the state-P calibration by the programme's rule): `DELTA = 20`, `MIN_BENEFIT = 40`; the block-H margins (15, 30) are a
declared, non-decisive sensitivity. **Label: TRANSFERS iff C1 ∧ C3 ∧ C4 ∧ C5 with I2 valid** (C1 benefit lower bound ≥ 40; C3
non-inferior to ENTRY_NR within 20; C4 no goal group harmed; C5 floor audit **and condition integrity** in every session; I2 lower
bound of benefit(ENTRY_NR) ≥ 40); PARTIAL / NO_MEANINGFUL_BENEFIT / HARM / AUDIT_FAILED otherwise. C1 fails → recommend against a
production change on this evidence; C1 holds → a separate production-design review, never an automatic implementation.

## Run

```bash
node experiments/gate-floor-prodsem/verify_gatefloorprodsem.mjs                           # gate (writes nothing in the repository)
node experiments/gate-floor-prodsem/orchestrate.mjs --out experiments/gate-floor-prodsem/data/blockP --workers 6
node experiments/gate-floor-prodsem/analyze.mjs --in experiments/gate-floor-prodsem/data/blockP --out <summary_blockP.json>
node experiments/gate-floor-prodsem/orchestrate.mjs --out <tmp> --selftest                # plumbing only; XFER-1 worlds 0..3, no floor arm
```

## Claim limits (mandatory)

Deviations from true production behaviour: (1) the 150-tick episode cap; (2) the deterministic replay cooldown; (3) legacy
stale-keyed credit assignment through `agentLast→next`. Condition P installs no environment draw, so traversal-attempt success is
identically 1.0 and **cannot establish real-world routing capability**; it and the other degenerate diagnostics are reported as
DEGENERATE, never as evidence of success. FutureScore V2.3 is a pure graph-distance potential under P. The study does not
establish production equivalence, production readiness, user-visible quality, safety, general routing capability, or anything
outside the frozen goals {8, 12, 16, 19}, the graph, the Phase I 1,500-call budget and the harness semantics.
