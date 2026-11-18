# M13 — Cognitive generalization: does the adopted belief keep its advantage in an unseen kind of world?

**Status.** Proposal, 2026-11-18. **Approved the same day on the owner's word "Approve with diagnostics"**, and built
as [SPEC.md](SPEC.md) (a draft until the owner approves the freeze). The text below is the proposal as approved. One
value differs in the build: over 165 development labels instead of the survey's 60, the development family's
95th-percentile clustering is 0.167, not 0.19. The novelty rule is unchanged.

**The inputs it rests on, both computed without running any agent:**
- **A structure-only survey of graphs.** It reads the graphs and the E5 schedule ([proposal_inputs/structure_survey.mjs](proposal_inputs/structure_survey.mjs),
  [`.out`](proposal_inputs/structure_survey.out)).
- **The per-label spread of the stored CF-06 and M11 rows** ([proposal_inputs/power_inputs.mjs](proposal_inputs/power_inputs.mjs),
  [`.out`](proposal_inputs/power_inputs.out)).

**Name.** "M13" is the owner's name for the milestone. The folder is `experiments/m13_generalization/` because
`experiments/m13/` is a legacy record guarded by its own verifier.

## Recommendation

Run the adopted agent (AD-13) and MBVI3, both unchanged, once, on a **held-out family of modular-ring worlds**.

- **Never used before:** the family appears nowhere in development or in any gate.
- **A new graph for every label:** the topology itself varies across labels.
- **Structurally outside the development family:** measured from the graphs alone, before any agent sees them.

**The run:**
- **Task:** E5, exactly as frozen for CF-06 and M11.
- **Labels:** 165 fresh labels × 3 reversal families (RARE, HALF, OFTEN).
- **Criteria:** four pre-registered criteria, G1–G4 (§6), with the CF-06 margins unchanged.
- **Measurement:** returns to reopened routes are measured for **both** agents in **every** run. M12 could see MBVI3's
  side only in 18 traces; this closes that gap prospectively.
- **Secondary block:** CF-06's two existing privileged diagnostic arms. They turn M12's observational split
  (reopened edges against false alarms) into an intervention on what the belief acts on.
- **Build:** one generator, one measure module, one driver and one test file.
- **Run time:** about 2 hours, once.

## 1. What exists (question 1)

| Part | Where | Use in M13 |
|---|---|---|
| Random worlds: a spanning tree plus random extra edges, maximum degree 4 (24 nodes, 30 edges by default) | `cognitive/testbed/worlds.mjs` `generateWorld` | The **development family**. Every CF stage, the CF-06 gate and every test used it with these defaults. Only labels varied |
| The app graph (20 nodes, 39 edges) | `worlds.mjs` `mfwWorld` | M11's single fixed graph |
| Hidden relabelling of nodes and exits | `worlds.mjs` `finish` (not exported) | Reused exactly: an M13 copy, proven identical by a test (§7). No edit to the testbed |
| Task E5 (six blocks per run, reopening with probability 0.1 / 0.5 / 0.9; the schedule depends only on the label and the true graph) | `cognitive/testbed/task_e5.mjs` | Unchanged; parameters as frozen |
| GraphEnv (`env.trace()` is a runner-only, ground-truth step log) | `cognitive/testbed/env.mjs` | Gives every run's step-level behaviour for both agents. No agent wrapper is needed |
| The adopted agent | `cognitive/testbed/adopted_agent.mjs`, pinned by `test_adopted_agent.mjs` | BELIEF, unchanged |
| MBVI3 | `cognitive/testbed/registry_v6.mjs` | The baseline, unchanged |
| Privileged diagnostic arms `BELIEF_REALONLY` / `BELIEF_FALSEONLY` (the adopted agent, archiving only genuine changes / only false alarms) | `cognitive/testbed/arms_v6.mjs`, as defined in `experiments/cf06/run_gate.mjs` | Secondary, never in a criterion |
| Paired percentile bootstrap, seeded by label | `cognitive/testbed/stats.mjs` | Unchanged |
| Driver pattern (refusals, single run, determinism check, wake hold) and passive recorder | `experiments/m11_routes/` | Copied in pattern; the recorder is reused for 18 pre-declared traces |

## 2. Generalization, not re-seeding (question 2)

| Level | What is new | Instance in this programme |
|---|---|---|
| Re-seed (in-distribution) | Labels only. Same generator, same structure | CF-06: development labels → gate labels |
| One new graph | One topology. Labels vary start, goal and schedule | M11: the app graph |
| **New structural family (M13)** | A generator never used in development. Topology varies per label. Its structure lies outside the development range on pre-declared descriptors | The modular ring |

**The structure survey** (60 labels per row; mean, with 5th–95th percentiles; no agent):

| Descriptor | Development family | App graph (M11) | **Modular ring (proposed)** | Perturbed lattice (rejected) |
|---|---|---|---|---|
| Nodes / edges | 24 / 30 | 20 / 39 | **24 / 36** | 24 / 32 |
| Cyclomatic number (independent cycles) | 7 | 20 | **13** | 9 |
| Clustering | 0.06 [0.00, 0.19] | 0.08 | **0.34 [0.26, 0.45]** | 0.00 |
| Start–goal distance | 3.97 [3, 6] | 3.15 | **4.98 [3, 8]** | 4.67 |
| Labels with a single shortest route | 73% | 18% | **50%** | 37% |
| Blocks that cost no detour | 26% | 70% | **35%** | 56% |
| Blocks costing a detour of 4 or more steps | 2% | 0% | **11%** | 3% |
| Skipped events | 6 of 720 | 0 | **0** | 19 |

The survey also helps read M11. In the app graph, 70% of the scheduled blocks cost no detour at all, which fits
M11's small effects and many ties.

**Why the modular ring:**
- **Same size and action space as development.** Nodes (24) and the maximum degree (4) match the development family,
  so neither drives a difference.
- **Different structure.** Four modules of six nodes, densely connected inside and joined in a ring by single
  bridges. This gives high clustering, bottlenecks, longer routes and a five-fold heavier tail of long detours.
- **Mechanism-relevant.** M12 (observational) found the gain comes from going back to a written-off route. The
  pay-off grows with the detour avoided, and the timing depends on how long episodes are. Both differ here.

**The perturbed lattice is not chosen**, for structural reasons only. Its regime resembles the app graph's (56% of
blocks cost no detour), and it skips 19 scheduled events.

**Fixed generator parameters**, not to be changed after this proposal:
- 4 modules × 6 nodes;
- each module a random spanning tree plus random edges up to 8 edges;
- one bridge between consecutive modules, between random nodes of degree below 4;
- maximum degree 4.

**Novelty check (part of G0).** It is computed on the frozen graph bank before any agent runs, and must hold:
- the bank's 5th-percentile clustering exceeds the development family's 95th percentile (0.19);
- the cyclomatic number is 13 against the development family's 7.

**Can the adopted agent run there unchanged?** Yes. An agent sees only a node label, its number of exits and the goal
label. Nothing in v6, v3 or the planner depends on topology or size.

## 3. Preventing tuning and leakage (question 3)

1. **The agent is pinned.**
   - `ADOPTED_AGENT` and its existing pin test apply.
   - The specification lists the SHA-256 of every file the agents import, plus task E5, the environment, the runner,
     the RNG and the statistics.
   - The driver refuses to run on any mismatch.
2. **The test worlds are fixed before any agent sees them.**
   - The generator writes a graph bank (edge lists for all 165 labels), whose hash is frozen with the specification.
   - Its structural descriptors are computed and frozen with it.
3. **No agent runs on the modular family before the single run.**
   - The driver's smoke run uses development-family labels in a smoke namespace.
   - The regression tests check the generator's structure only.
   - The survey above used prototype labels `m13survey|*`, ran no agent, and those labels are barred from M13.
4. **Fresh labels.** `m13|modular|0` … `m13|modular|164`. The driver refuses any label in a namespace already used:
   `cf|dev`, `cf|gate*`, `mfw|m11*`, `m13survey`, the test namespaces.
5. **Nothing is chosen from outcomes.**
   - E5's parameters are CF-06's, and the RARE margin is CF-06's 25.
   - The criteria's directions come from CF-06.
   - n comes from recorded variance (§6).
   - M12's findings motivate G4 and one descriptive moderator. They are treated as hypotheses, not as established
     causes.
6. **Run once,** reported whatever the outcome. A result file that already exists blocks the run.

## 4. The comparison (question 4)

| Arm | Definition | Role |
|---|---|---|
| **BELIEF** | `makeAdoptedAgent`: model v6, ρ fixed at 1/2, h = 0.01 | Primary |
| **MBVI3** | The registry's MBVI3 | Baseline |
| BELIEF_REALONLY | BELIEF, archiving only genuine changes (ground truth) | Secondary, privileged, in no criterion |
| BELIEF_FALSEONLY | BELIEF, archiving only false alarms (ground truth) | Secondary, privileged, in no criterion |

The two diagnostic arms are recommended because they are the only way to test M12's split by intervention without
changing an agent. They cost about 40 minutes of extra run time. Dropping them changes nothing in G0–G4.

## 5. Measures (question 5)

All of these come from the E5 rows and from `env.trace()` for every run, computed inside the driver. Nothing is
inferred.

| Purpose | Measure |
|---|---|
| Net effect | Steps over the change phase; per label, the sum over the three reversal families (CF-06 B1's unit) |
| Recovery | OFTEN, steps in the 10 episodes after each reopening |
| Permanent-change safety | RARE extra steps (BELIEF − MBVI3); RARE steps after permanent blocks; futile re-tests of permanent blocks, both arms |
| Belief updating | BELIEF's archives opened (genuine reversing, genuine permanent, false) and reversals confirmed (genuine, false), from its own log; both arms' change-detector counts |
| From belief to behaviour | For each reopened edge, both arms: whether the agent met it while blocked; whether it crossed it again after the reopening, in its own after-window (M11's count) or later (M12's correction); and the steps from reopening to the first return |
| Generalization | The standardized effect (mean / SD) of G1, beside CF-06's 0.44 on development-family worlds and M11's 0.50 on the app graph; gainShape as defined in CF-06 |
| Moderator (descriptive, pre-declared) | Per-event gain against the event's detour excess. If M12's account carries over, the gain should rise with it |
| Belief trajectories | The passive recorder on labels 0–2 (18 traces), as in M11 |

## 6. Labels, sample size and pre-registered criteria (question 6)

**Sample size.** The recorded standardized effects of the net (mix) advantage over MBVI3 are:
- 0.44 in CF-06 (+84.7, SD 190.6);
- 0.50 in M11 (+27.7, SD 55.7).

The recovery effects are 0.63 and 0.45.

- **Smallest effect of interest:** half the smaller net effect, d = 0.22. A paired two-sided 95% interval excluding 0
  with 80% power needs n = (2.80 / 0.22)² = 163, so **n = 165 labels**, giving 97% power at d = 0.30.
- **For G2:** with CF-06's largest RARE spread (SD 27.1), the interval's half-width is about 4.1 steps. G2 therefore
  passes if the true extra cost is below about 21.
- **For G4:** the size of the return measure for MBVI3 has never been measured. Its power is unknown and stated as
  such.

**Exclusions:** a (label, family) whose schedule cannot be laid out, decided from the graph before any agent acts (the
survey needed none).

**Criteria** (per-label paired differences; mean and 95% paired percentile bootstrap, 10,000 resamples, seeded by
label; strict inequalities):

| | Criterion | Statistic | Passes when |
|---|---|---|---|
| **G0** | Validity | Run A = run B rows; all tests pass; novelty check holds; exclusions ≤ 10% | all |
| **G1** | Net advantage retained (primary) | Per label, sum over RARE + HALF + OFTEN of steps(MBVI3) − steps(BELIEF) | mean > 0 and lower bound > 0 |
| **G2** | Permanent-change safety | RARE, steps(BELIEF) − steps(MBVI3) | upper bound < 25 |
| **G3** | Recovery | OFTEN, after-reopening steps, MBVI3 − BELIEF | mean > 0 and lower bound > 0 |
| **G4** | Belief changes behaviour | OFTEN, per label, the number of reopened edges the agent met while blocked and crossed again after the reopening (at any time), BELIEF − MBVI3 | mean > 0 and lower bound > 0 |

**Verdict:**

| Verdict | Condition |
|---|---|
| **GENERALIZES TO THE MODULAR FAMILY** | G0–G4 hold. gainShape (CONSISTENT / TAIL-DRIVEN) is reported on the same line |
| **GENERALIZES IN PART (…)** | G0 and G1 hold; the failing criteria are named |
| **DOES NOT GENERALIZE** (**— HARMFUL** if G1's upper bound < 0) | G0 holds; G1 fails |
| **INVALID** | G0 fails |

**What it can show:** whether the advantage survives a structural shift with nothing tuned, and whether the agent
that met a block comes back to it, for both agents and in every run. With the diagnostic arms, it can also show
whether the gain needs belief about genuine changes, about false alarms, or both.

**What it cannot show:**
- other families, or larger worlds;
- which of the shifted descriptors matters (they move together);
- that returning causes the gain within an agent (the diagnostic arms intervene on what is archived, not on returning);
- anything confirmatory: one run by the designer, on local commits.

## 7. Minimum implementation and verification (question 7)

**New files**, in `experiments/m13_generalization/` unless stated:

| File | Content |
|---|---|
| `worlds_modular.mjs` | The generator (the survey prototype, fixed as above); a world builder that is an exact copy of `finish`; the graph-bank writer |
| `graph_bank.json` + its hash | 165 edge lists, frozen with the specification |
| `structure.mjs` | The descriptors and the novelty check (the survey code) |
| `measures.mjs` | Return measures from `env.trace()` and the schedule, for any arm |
| `m13_lib.mjs` | Configuration, the four arms, one run (keeps the environment's reference to read its trace), analysis, reading rule |
| `run_m13.mjs` | The driver. It refuses unless the specification is frozen and hash-matched, the agent and task file hashes match, the tree is clean, the labels are fresh and no result exists |
| `SPEC.md`, `SPEC.sha256` | The frozen specification |
| `cognitive/tests/test_m13_generalization.mjs` | Added to `npm test`. Tests: generator determinism and bank hash; the builder identical to `generateWorld` / `mfwWorld` on the same edges; return measures on hand-made traces; reading rule on synthetic inputs; namespace refusal; keeping the environment reference leaves rows unchanged |
| `.gitattributes` | `experiments/m13_generalization/** -text` (the legacy `experiments/m13/` is not covered) |

**Nothing else changes:** no agent, model, planner, task, environment, `main.js` or browser file.

**Verification:**
- `npm test` all pass;
- legacy gate 14/14;
- the CF-06, M11 and M12 hashes unchanged;
- an independent check written before the result, which recomputes every criterion from the rows;
- run A (all arms) against run B (core arms) identical;
- the system event log checked for standby;
- `RESULTS.md` written whatever the outcome.

**Steps after your decision:**
1. Build and test, then commit locally.
2. Freeze on your word.
3. Run once: about 2 hours. Run A takes about 1,980 E5 runs at about 2.3 s each; run B repeats the 990 core runs.
4. Verify, record and commit locally. No push without your word.

## Decision needed

Approve M13 as proposed (with or without the two diagnostic arms), or name a change.
