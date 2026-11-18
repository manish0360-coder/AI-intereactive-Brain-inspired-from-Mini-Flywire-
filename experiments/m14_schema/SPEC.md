# M14 — schema abstraction and transfer: a relation learned across worlds, applied to an unseen combination

**Status.** DRAFT, 2026-11-18, for the owner's freeze approval. Built on the owner's word "Approve B in testbed", after
the M14 decision report: the app's "schema memory" (`render/schemaMemory.js`) only stores concrete node IDs, so a new
mechanism is needed, and it is built in the cognitive testbed. Nothing in `main.js`, the app, AD-13, world model v6 or
`env.mjs` changes. The admission gate has run on development labels and admits the task (§ Admission).

The driver refuses to run the study unless this line begins "Frozen" and every line of `SPEC.sha256` matches.

**Name.** "M14" is the owner's name. The folder is `experiments/m14_schema/` because `experiments/m14/` is an earlier,
unrelated record.

## Question

Can the agent extract a relation from experiences that share it but differ in every concrete detail, and use it to
decide better in a new situation that needs a combination of that relation it has never experienced whole?

**Hypothesis.** An agent that learns a relational schema from several worlds decides better in an unseen world than
the same agent relying only on its concrete, per-world memory.

## What runs

Every part except the task E6 wrapper and the schema files is existing code, used unchanged.

| Part | What it is |
|---|---|
| **Worlds** | The development generator (`generateWorld`: 24 nodes, 30 edges, degree at most 4) with its hidden relabelling, unchanged. Every world is new; labels 1..24 recur in every world but name different nodes |
| **Task E6** ([`task_e6.mjs`](../../cognitive/testbed/task_e6.mjs)) | One start-goal pair per world, with a unique shortest route. Every node has a **kind** in 0..3. Along the route, the kinds follow a relation: the next node's kind is `relation[kind]`. At every route node, exactly one exit leads to that kind: the route exit. The agent observes its node's kind and the kinds behind its exits (`obs.kind`, `obs.exitKinds`). All edges have reliability 1. The environment itself is unchanged; `SignpostEnv` wraps it |
| **Relation** | SIGMA: kind k is followed by k + 1 mod 4. It is a relation between kinds, not a preference for one kind: each kind is the right next kind from exactly one kind |
| **Training worlds** | Six per trial, each with a 2-hop route signposted by SIGMA from phase k mod 4. Together they show every link of SIGMA, but no world shows more than two links in a row |
| **Test world** | One per trial, with a 4-hop route. It runs under three kind assignments on the same graph, start and goal: **COMPOSE** (SIGMA from a label-drawn phase: a four-link chain never shown whole; primary), **NULL** (random kinds; negative control) and **REVERSED** (SIGMA inverted; intervention, secondary) |
| **CONCRETE** | The adopted agent (AD-13: model v6, ρ = 1/2, h = 0.01), fresh in the test world. The schema is disabled |
| **SCHEMA** | The schema agent ([`mind/schema/agent.mjs`](../../cognitive/mind/schema/agent.mjs)): the adopted agent's loop, plus one rule. When several exits tie for the highest value and the observation has kinds, it keeps the tied exits whose kind the schema scores highest for its current kind. The schema never changes a value. With no schema, or one that has learned nothing, it is the adopted agent, step for step (tested on E6 and E5) |
| **Schema** ([`kind_schema.mjs`](../../cognitive/mind/schema/kind_schema.mjs)) | Learned from the agent's own successful episodes, never from ground truth. Each episode's path is loop-erased. For each node on it, the schema counts the available exits by (current kind, exit kind) and the chosen exit by (current kind, next kind). The score is the Beta(1, 1) posterior mean. The schema learns through the six training worlds, then it is **frozen** (learning throws) and hashed before and after the test world |
| **SCHEMA_SHUFFLED** | As SCHEMA, but each training world's kinds are renamed by its own random permutation. The experience is the same, and the relation holds within each world, but it is inconsistent across worlds (negative control). Its test world is SCHEMA's |
| **ORACLE_SCHEMA** | Privileged reference: the schema agent with SIGMA as a fixed table. Admission and headroom only; in no criterion |

**Why there is no concrete-carry arm.** It was planned as a memorization control, but it cannot run. World model v3
keys a state by its label and refuses a label whose exit count changes (`v3/world_model.mjs`, `visit`), and labels
recur across worlds with different nodes. Concrete memory therefore cannot even be carried between these worlds.

**Episodes and measures.**
- Training worlds run 5 episodes, start to goal.
- The test world runs 3 episodes under each condition.
- Each episode is capped at 200 steps; an episode that reaches the cap counts as 200.
- **The primary measure is the number of steps in the first test episode**: how quickly the agent finds the goal
  in a world it has never seen.
- Later episodes are reported only. The planner's optimism makes the agent explore untried exits again once it knows
  one route, for both arms.

## Fixed in advance

- **Labels:** `m14schema|gate|0` … `m14schema|gate|164` (165). The driver refuses any other namespace, in particular
  `m14schema|dev|`, `m14schema|test|`, `m14schema|smoke|`, `cf|`, `mfw|` and `m13`.
- **Census and exclusions:**
  - A trial is excluded only if one of its seven worlds has no unique route of the set length. That is a pure
    function of the label, computed before the freeze (`admission/admission.json`): all 165 gate labels can be
    planned.
  - The analysed n is therefore 165.
  - An exclusion at run time would mean the code had changed despite the pins, and makes the run INVALID.
- **Seeds:**
  - Every world, route, kind assignment, permutation and agent stream is drawn from a stream named by its label.
  - All test runs of a trial share one agent stream (`<trial>|agent|test`), across arms and conditions.
- **Statistics:** per-label paired differences; the mean with a 95% paired percentile bootstrap (10,000 resamples,
  seeded `m14schema|stats|m14|<name>`, `pairedBootstrap`); the median and the labels each way. Inequalities are strict,
  and an empty contrast never passes.

## Criteria

| | Role | Statistic (per label, first test episode) | Passes when |
|---|---|---|---|
| **V** | Validity | Run A and run B rows identical; `node scripts/test_all.mjs` passes; no label excluded; CONCRETE's three conditions are identical runs in every label (kinds are passive for it); ORACLE_SCHEMA walks the route in every label | all five |
| **P1** | Primary, part 1: transfer | COMPOSE, steps(CONCRETE) − steps(SCHEMA) | mean > 0 and lower > 0 |
| **P2** | Primary, part 2: relational content | COMPOSE, steps(SCHEMA_SHUFFLED) − steps(SCHEMA) | mean > 0 and lower > 0 |
| **S** | Safety | NULL, steps(SCHEMA) − steps(CONCRETE) | upper < 9 (the margin) |
| R1 | Secondary | REVERSED, steps(SCHEMA) − steps(CONCRETE) | reported: lower > 0 means the schema is misled when the relation is reversed |

**Multiplicity.** P1 and P2 form one primary hypothesis, and it is accepted only if both pass (an intersection-union
test, so no correction applies). S is a separate safety bound. R1 and everything else are reported, not tested.

## Verdict

| Line | Value | Condition |
|---|---|---|
| **Validity** | VALID / INVALID (*failing parts*) | V; if INVALID, no other line is interpreted |
| **Transfer** | SHOWN | P1 and P2 pass |
| | NOT ATTRIBUTABLE TO THE RELATION | P1 passes, P2 does not |
| | REVERSED | P1's upper bound < 0 |
| | NOT SHOWN | otherwise |
| **Relational content** | SHOWN / NOT SHOWN | P2 |
| **Safety** | SAFE / NOT SHOWN SAFE | upper(S) < 9 |
| **Reversal** (secondary) | MISLED WHEN REVERSED / NOT SHOWN | R1's lower bound > 0 |

**Summary statement** (the only sentence the record may use about M14's question):

| Validity | Transfer | Safety | Summary |
|---|---|---|---|
| INVALID | any | any | **INVALID — NO CRITERION IS INTERPRETED** |
| VALID | SHOWN | SAFE | **LEARNED RELATIONAL SCHEMA TRANSFERS TO UNSEEN COMBINATIONS, WITHIN THE SAFETY MARGIN** |
| VALID | SHOWN | NOT SHOWN SAFE | **LEARNED RELATIONAL SCHEMA TRANSFERS TO UNSEEN COMBINATIONS; SAFETY NOT SHOWN** |
| VALID | NOT ATTRIBUTABLE | any | **A BENEFIT IS SHOWN, BUT NOT ATTRIBUTABLE TO THE LEARNED RELATION** |
| VALID | NOT SHOWN / REVERSED | any | **TRANSFER NOT SHOWN** / **TRANSFER REVERSED** |

If P1's gainShape (CF-06's rule) is TAIL-DRIVEN, a SHOWN summary ends with " — FROM A MINORITY OF LABELS".

## What each outcome would mean

| Level | What would show it here | Status in this design |
|---|---|---|
| **Memorization** (reusing concrete nodes, labels or routes) | A gain that needs the same nodes or labels | Excluded by construction: no node, route or labelled place recurs between training and test, and concrete memory cannot even be carried (v3 refuses). SCHEMA_SHUFFLED holds the experience fixed and removes only the consistent relation |
| **Generalization** (a learned relation applied to an unseen combination) | P1 and P2 | The primary test |
| **Use of the relation** (decisions depend on the relation, shown by intervening on the world) | No benefit with NULL kinds (S), and harm with REVERSED kinds (R1) | Reported. The test world's graph, start, goal and agent stream are the same in all three conditions; only the kinds change |
| **Causal understanding** in a wider sense (a model of why the relation holds, or reasoning beyond it) | Not testable here | Not claimed |

## Leakage prevention

- **Fresh worlds.** Every world is generated from its own label, and no world is shared between training and test.
  Labels are relabelled per world, so concrete identities carry no meaning across worlds.
- **No learning in the test world.** The schema is frozen before the test world. A frozen schema throws if asked to
  learn, and the test agents are built with `learn = false`. `runArm` hashes the schema before and after the three
  test conditions and throws if the hash changed. The primary measure is the first test episode, before the agent
  has learned anything about the test world.
- **No ground truth to an ordinary arm.**
  - CONCRETE, SCHEMA and SCHEMA_SHUFFLED receive only observations: node label, number of exits, goal cue, and the
    kinds of their node and its exits.
  - The schema learns from the agent's own path, not from the route.
  - Only ORACLE_SCHEMA is given the relation, and it is in no criterion.
  - The schema files import only what the adopted agent imports and use no forbidden API (tested).
- **No suite test pins these files** (unlike M13): the driver checks `PINS.json` before the run, and the independent
  check after it.

## Admission (done, development labels only)

`admission/admission.mjs` → `admission.json` / `.out` ran on `m14schema|dev|0..29` with two arms only, CONCRETE and
ORACLE_SCHEMA. No learner arm ran on a development or gate label.

| Quantity | Value |
|---|---|
| CONCRETE, first COMPOSE episode | mean 36.2 steps (median 34.5, SD 16.8, none capped) |
| ORACLE_SCHEMA | 4 steps on every label: it walks the route |
| Headroom H = CONCRETE − ORACLE | **32.2 [26.3, 38.1]**, labels 29 for / 0 against / 1 tie |
| Minimum detectable effect at n = 165 (80%, two-sided 5%) | 3.66 steps; twice that is 7.32 |
| Admission: A1 H's lower bound > 0; A2 H ≥ 2 × MDE; A3 kinds are passive for CONCRETE | all hold: **ADMITTED** |
| Smallest effect of interest (H / 4) | 8.0 steps; power > 0.999 at n = 165 with the development SD |
| Safety margin (ceil(H / 4)) | **9 steps** |

**Assumption, stated.** P2's spread is unknown, because SCHEMA_SHUFFLED did not run on development labels. Its SD is
taken to be about CONCRETE's, since SCHEMA_SHUFFLED explores much as CONCRETE does when its schema is uninformative.

## Integrity

- **Run once,** with `node experiments/m14_schema/run_m14.mjs --domain m14`. The driver refuses if any of these hold:
  - this file is not Frozen;
  - a line of `SPEC.sha256` (SPEC.md, PINS.json, admission/admission.json) does not match;
  - a file differs from `PINS.json` (40 files: the full import closure, the admission record and the two test
    runners);
  - `cognitive/`, `scripts/` or this folder has an uncommitted change;
  - a label is not fresh;
  - the census excludes a label;
  - the suite (`scripts/test_all.mjs`) fails;
  - a result exists.
- **Determinism.** Run A and run B run all four arms; their rows must be identical.
- **Recorded with the result:** HEAD at launch and at the end; the hashes of this file, the pins and the admission
  record; the Node version and platform; the test result; the hashes of `main.js`, `index.html`, `connections.json`
  and `neurons.json`.
- **Nothing is tuned after the run.** RESULTS.md is written whatever the outcome, and an independent check is written
  before the result is seen.
- **The test suite:**
  - `scripts/test.mjs` is unchanged, because M13 pinned it and its suite test requires that.
  - `scripts/test_all.mjs` runs that suite plus `test_m14_schema.mjs`, which adds 12 tests.
- **Looks before the freeze (disclosed):**
  - **Development on test-namespace trials:** `m14schema|test|0` and `1`, all arms, plus the regression tests on
    `m14schema|test|0..4`. While building, the designer saw first-episode steps there, for example SCHEMA 4 and
    CONCRETE 26 on `test|0`.
  - **Two changes made after those looks, neither for outcome reasons:**
    - the concrete-carry arm was removed, because it crashes (above);
    - the test-world agent stream became one per trial, so that CONCRETE's conditions are identical runs.
  - **The admission run:** development labels, CONCRETE and ORACLE_SCHEMA only. The margin and the smallest effect
    of interest come from it.
  - **The census:** gate labels, structure only, no agent.
  - **A driver smoke run:** `m14schema|smoke|0..2`, structure, determinism and timing only, with no measure printed.

  No agent has run on a gate label.

## What it can and cannot show

**It can show:**
- whether a relation learned from several worlds that differ in every concrete detail improves the first decisions
  in an unseen world that needs a combination never shown whole;
- whether that benefit needs the relation to be consistent across worlds (P2);
- whether decisions follow the relation when the world's relation is removed or reversed.

**It cannot show:**
- **Role discovery:** the roles are given as observable kinds, so the agent abstracts a relation over given roles and
  does not discover the roles;
- **Noisy or partial relations:** the signposts here are exact;
- **Other world families, stochastic edges, or larger worlds;**
- **Anything confirmatory:** one run, by the designer, on local commits.

The effect may be large by construction, since one consistent relation fully signposts the route. The test is whether
the learner extracts it and the decision rule uses it, under controls that remove the relation but keep everything
else.

## Consequence

None for AD-13 or the agent. If the summary is TRANSFERS, the record may say, in these terms: a schema learned over
observable kinds in six relabelled worlds improved the adopted agent's first decisions in an unseen world that needed
an unseen combination of the relation, in one development-level run. It may not say that the agent abstracts in
general, discovers roles, or understands causes.

## Run

**Time:** under 2 minutes for both runs (smoke: about 0.25 s per trial for all four arms), plus about 4 minutes for
the suite.

**To freeze:**
1. Set the status line to "**Status.** Frozen", with the date and the owner's word.
2. Regenerate `PINS.json`.
3. Write `SPEC.sha256` with lines for SPEC.md, PINS.json and admission/admission.json.
4. Commit.
5. Run once.

## Files

| File | Role |
|---|---|
| `SPEC.md`, `SPEC.sha256` | This specification and its frozen hashes |
| `cognitive/testbed/task_e6.mjs` | Task E6: routes, signposted and random kinds, the observation wrapper, the episode loop |
| `cognitive/mind/schema/kind_schema.mjs`, `agent.mjs` | The schema learner and the schema agent |
| `m14_lib.mjs` | Configuration, arms, one trial, analysis, reading rule |
| `run_m14.mjs` | The driver and its refusal checks |
| `pins.mjs`, `PINS.json` | The pinned files and their hashes |
| `admission/admission.mjs` → `admission.json`, `.out` | Census, admission gate, margin and power |
| `cognitive/tests/test_m14_schema.mjs`, `scripts/test_all.mjs` | Regression tests, and the runner that includes them |
