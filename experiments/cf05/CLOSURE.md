# CF-05 Closure Record — closed without a gate run, as a documented negative finding

**Date:** 2026-11-15. **Decision:** the owner's Decision 1 of 2026-11-15, after the outside pre-freeze review
(`research/external/CF05_CF05B_GEMINI_REVIEW.md`, question 1). **Effect:** the `gate5` domain is never run. The
gate driver refuses it while this file exists.

## What CF-05 asked

Can an exploration bonus let the planner recover a route after a blocked exit is reopened without notice, without
paying for it when nothing has changed? The measured gap it targeted: after the block is removed the planner is
40.1 steps behind the privileged reference [32.5, 48.1] (CF-04, 55 worlds), because it re-tests the reopened exit in
0.9 of 15 episodes.

## Why it is closed without a run

The development evidence already answered the question at the level a 60-world gate could add to, and the
specification itself predicted NOT SUPPORTED. Spending 60 fresh worlds to confirm a predicted null was judged a poor
use of a fresh domain. **This is a development-level negative finding, not a confirmatory one.** No claim may cite it
as a gate result.

## The evidence (development domain `cf|dev|world|0…19`; reproduced line for line by a second run)

Change in steps over the 15 episodes after the block is removed, mechanism minus the existing planner (negative is
better), and overall cost:

| Mechanism | Best of three settings, after removal | Stronger settings |
|---|---|---|
| Exploration bonus κ√τ inside value iteration (BONUS) | −1.4 [−8.4, 4.7] at κ 0.001 | κ 0.003: +61.8 overall [46.6, 76.7]; κ 0.01: the agent wanders, 1,626 capped episodes |
| Blanket belief decay toward the untried-pair belief (DECAY) | −3.0 [−9.8, 3.1] at hazard 0.0003 | hazard 0.003: +86.7 overall [52.5, 130.4] |
| Dyna-Q+ with a count model (baseline) | +0.2 [−9.3, 9.2] at 20 updates per step; +5.2 [−4.3, 14.4] at 1,300 | worse than the planner overall at every setting, at best +67.0 [49.7, 86.2] |

Full tables: [GATE_SPEC.md](GATE_SPEC.md), development-domain disclosure.

## Finding

**On this testbed, blanket exploration bonuses and blanket belief decay were insufficient** to recover a reopened
route. At the settings where they do nothing measurable they are harmless; at the settings where they re-test more
they cost far more than they recover. The reading recorded in the specification, not tested: blanket re-testing
spends steps on about sixty state–action pairs to recover one.

**Not shown:** that no exploration bonus could work. Only the κ√τ form was tried, on one grid of three values with
the best at the edge of the grid; a bonus scaled by the value at stake, or restricted to exits on or near the route
in use, was not tried (outside review, question 2 of the draft, was not answered on this point).

## What is kept

Nothing is deleted. The specification (revision 2, never frozen), the driver configuration
(`run_gate.mjs`), the shared driver (`gate_lib.mjs`, still used by CF-05b), the candidate implementations
(`cognitive/mind/v4/`, modes BONUS and DECAY) and the Dyna-Q+ baseline (`cognitive/baselines/`) stay as they are and
remain available for later research. The Dyna-Q+ baseline is used by CF-05b.
